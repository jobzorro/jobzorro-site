"""
corpus_new/txt (새 폴더에서 뽑은 인터뷰) 중 기존 corpus/txt 와 겹치지 않는 것만 골라
corpus/txt 뒤 번호(325~)로 편입하고 corpus/manifest.csv 에 추가한다.

겹침 판정: 본문을 정규화(공백·기호 제거)한 뒤
  1) 앞 1,500자 해시가 같으면 완전 중복
  2) 아니면 3-gram 자카드 유사도 0.6 이상이면 중복(같은 인터뷰의 다른 버전)
새 폴더 안에서 서로 겹치는 것도 하나만 남긴다.

사용법: python dedupe_corpus.py            # 보고만
       python dedupe_corpus.py --apply    # 편입
"""
import csv, hashlib, re, shutil, sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(__file__).parent
OLD, NEW = BASE / "corpus", BASE / "corpus_new"
MIN_CHARS = 400


def norm(t: str) -> str:
    return re.sub(r"[\s\W_]+", "", t)


def grams(t: str, n=3, limit=6000):
    t = t[:limit]
    return {t[i:i + n] for i in range(len(t) - n + 1)}


def load(d: Path):
    rows = list(csv.DictReader((d / "manifest.csv").open(encoding="utf-8-sig")))
    out = []
    for r in rows:
        p = d / "txt" / f"{r['idx']}.txt"
        if not p.exists() or int(r["chars"] or 0) < MIN_CHARS:
            continue
        t = norm(p.read_text(encoding="utf-8", errors="ignore"))
        out.append({"idx": r["idx"], "file": r["file"], "ext": r["ext"], "chars": r["chars"],
                    "h": hashlib.md5(t[:1500].encode()).hexdigest(), "g": grams(t), "path": p})
    return out


def jacc(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def main():
    apply = "--apply" in sys.argv
    old, new = load(OLD), load(NEW)
    old_h = {o["h"] for o in old}
    kept, dup_old, dup_new = [], [], []
    for n in new:
        if n["h"] in old_h:
            dup_old.append((n, "hash")); continue
        best = max(((jacc(n["g"], o["g"]), i, o) for i, o in enumerate(old)), key=lambda x: x[0]) if old else (0, 0, None)
        if best[0] >= 0.6:
            dup_old.append((n, f"sim {best[0]:.2f} ~ {best[2]['idx']}")); continue
        bk = max(((jacc(n["g"], k["g"]), i, k) for i, k in enumerate(kept)), key=lambda x: x[0], default=(0, 0, None))
        if n["h"] in {k["h"] for k in kept} or bk[0] >= 0.6:
            dup_new.append((n, f"new-dup ~ {bk[2]['idx'] if bk[2] else '?'}")); continue
        kept.append(n)
    print(f"새 폴더 {len(new)}건(400자 이상) → 기존과 중복 {len(dup_old)} / 새 폴더 내 중복 {len(dup_new)} / 신규 {len(kept)}")
    for n in kept:
        print(f"  NEW {n['idx']} {n['file']}")
    if not apply:
        return
    rows = list(csv.DictReader((OLD / "manifest.csv").open(encoding="utf-8-sig")))
    start = max(int(r["idx"]) for r in rows) + 1
    with (OLD / "manifest.csv").open("a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for i, n in enumerate(kept):
            idx = f"{start + i:03d}"
            shutil.copy(n["path"], OLD / "txt" / f"{idx}.txt")
            w.writerow([idx, n["file"], n["ext"], n["chars"], ""])
    (OLD / "new_idx.txt").write_text("\n".join(f"{start + i:03d}" for i in range(len(kept))), encoding="utf-8")
    print(f"편입 완료: {start:03d}~{start + len(kept) - 1:03d} (목록 corpus/new_idx.txt)")


if __name__ == "__main__":
    main()
