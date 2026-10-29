"""
4단계(v2 개편 1단계) 반영: corpus/synth4/*.json → data/jobs.json · interview_jobs.json · job_terms.json

- <id>.json      새 세부 직무(또는 다시 쓴 technical-sales). _major/_iq/_terms 는 떼어 각 파일로 보낸다.
- ind_<id>.json  기존 직무의 산업별 차이 → jobs.json 의 byIndustry
- taxonomy.json 의 name·en·parent·industryOnly 를 모든 직무에 다시 입힌다 (이름 바뀐 hr·accounting 등).
merge_synth.py 는 jobs.json 을 처음부터 다시 만들어 이후 손본 값(major 등)을 날리므로 쓰지 않는다.
"""
import json, shutil, sys
from datetime import date
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = Path(__file__).parent
D = BASE / "data"
S4 = BASE / "corpus" / (sys.argv[1] if len(sys.argv) > 1 else "synth4")   # 2단계부터: python apply_phase4.py synth5


def load(p):
    return json.loads(p.read_text(encoding="utf-8"))


def save(p, obj):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    tax = load(D / "taxonomy.json")
    data = load(D / "jobs.json")
    iq_raw = load(D / "interview_jobs.json")
    iq = iq_raw.get("jobs", iq_raw) if "jobs" in iq_raw else iq_raw
    terms = load(D / "job_terms.json")
    inds = {i["id"] for i in load(D / "industries.json")["industries"]}

    # 처음 한 번만 백업 (다시 돌려도 원본 백업은 그대로)
    bk = BASE / "corpus" / "jobs_before_v2.json"
    if not bk.exists():
        shutil.copy(D / "jobs.json", bk)

    order, tmeta = [], {}
    for g in tax["groups"]:
        for t in g["jobs"]:
            order.append(t["id"])
            tmeta[t["id"]] = (g["id"], t)
    by_id = {j["id"]: j for j in data["jobs"]}
    added, replaced, ind_n = [], [], []

    for p in sorted(S4.glob("*.json")):
        obj = load(p)
        if p.stem.startswith("ind_"):
            jid = p.stem[4:]
            rows = [r for r in obj.get("byIndustry", []) if r.get("ind") in inds and (r.get("basis") or 0) >= 2]
            if jid in by_id and rows:
                by_id[jid]["byIndustry"] = rows
                ind_n.append(f"{jid}({len(rows)})")
            continue
        jid = p.stem
        if jid not in tmeta:
            print(f"건너뜀: {jid} 는 taxonomy 에 없음")
            continue
        major, q, tm = obj.pop("_major", None), obj.pop("_iq", None), obj.pop("_terms", None)
        # 산업별 차이는 근거 인터뷰 2건 이상인 산업만 (공개 자료만으로 쓴 산업 탭은 '인터뷰 0건'으로 보이므로 뺀다)
        if "byIndustry" in obj:
            obj["byIndustry"] = [r for r in obj["byIndustry"] if r.get("ind") in inds and (r.get("basis") or 0) >= 2]
            if not obj["byIndustry"]:
                obj.pop("byIndustry")
        old = by_id.get(jid)
        if old and old.get("news"):
            obj["news"] = old["news"]
        if major:
            obj["major"] = major
        elif old and old.get("major"):
            obj["major"] = old["major"]
        if q:
            iq[jid] = q
        if tm:
            terms[jid] = tm
        (replaced if old else added).append(jid)
        by_id[jid] = obj

    # taxonomy 값(이름·영문·직군·상위·산업 전용)을 모두에게 다시 입히고, 없는 상위 id 는 지운다
    for jid, j in by_id.items():
        if jid not in tmeta:
            continue
        gid, t = tmeta[jid]
        j["id"], j["name"], j["en"], j["group"] = jid, t["name"], t["en"], gid
        for k in ("parent", "industryOnly"):
            if t.get(k):
                j[k] = t[k]
            else:
                j.pop(k, None)
        j["transitions"] = [x for x in j.get("transitions", []) if x in tmeta and x != jid]

    data["jobs"] = [by_id[i] for i in order if i in by_id]
    data["meta"]["updated"] = date.today().isoformat()
    save(D / "jobs.json", data)
    save(D / "interview_jobs.json", iq_raw)
    save(D / "job_terms.json", terms)
    missing = [i for i in order if i not in by_id]
    print(f"직무 {len(data['jobs'])}개 | 새로 추가 {len(added)}: {', '.join(added)}")
    print(f"다시 씀 {len(replaced)}: {', '.join(replaced)} | 산업별 차이 {len(ind_n)}: {', '.join(ind_n)}")
    if missing:
        print("아직 내용 없는 직무:", ", ".join(missing))


if __name__ == "__main__":
    main()
