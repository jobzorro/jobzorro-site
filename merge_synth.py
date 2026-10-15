"""
corpus/synth/*.json (직무별 합성 결과) + data/taxonomy.json -> data/jobs.json

taxonomy 순서대로 직무를 정렬하고, 이름·영문명·직군 id는 taxonomy 값을 우선한다.
빠진 직무나 스키마 누락은 여기서 잡는다.
"""

import json
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(__file__).parent
REQUIRED = ["tagline", "summary", "dayInLife", "tasks", "skills", "tools", "entry", "path", "salary",
            "transitions", "interview", "fit", "realities", "prep", "voices", "ai", "certs",
            "nonmajorOk", "sources", "draftOnly"]


def main():
    tax = json.loads((BASE / "data" / "taxonomy.json").read_text(encoding="utf-8"))
    synth_dir = BASE / "corpus" / "synth"
    jobs, missing, problems = [], [], []
    ids = {j["id"] for g in tax["groups"] for j in g["jobs"]}

    for g in tax["groups"]:
        for t in g["jobs"]:
            p = synth_dir / f"{t['id']}.json"
            if not p.exists():
                missing.append(t["id"])
                continue
            j = json.loads(p.read_text(encoding="utf-8"))
            j["id"], j["name"], j["en"], j["group"] = t["id"], t["name"], t["en"], g["id"]
            lost = [k for k in REQUIRED if k not in j]
            if lost:
                problems.append(f"{t['id']}: 누락 {lost}")
            j["transitions"] = [x for x in j.get("transitions", []) if x in ids and x != t["id"]]
            jobs.append(j)

    out = {
        "meta": {
            "title": "직무사전",
            "updated": "2026-10-15",
            "disclaimer": "연봉은 2026년 국내 민간 기업 채용공고와 상담 사례를 바탕으로 한 대략적인 범위(만원, 세전 기본급 기준)이며 기업 규모·산업·지역에 따라 크게 달라집니다. 직무 설명은 취업조로가 진행한 현직자 직무 인터뷰 기록과 공개된 현직자 자료를 바탕으로 작성했으며, 개인과 회사가 특정되지 않도록 업종·연차로만 표기했습니다.",
            "tracks": tax.get("tracks", []),
            "groups": [{"id": g["id"], "name": g["name"], "track": g.get("track", "business")} for g in tax["groups"]],
            "sourceDocs": sum(1 for p in (BASE / "corpus" / "txt").glob("*.txt") if p.stat().st_size > 400),
        },
        "jobs": jobs,
    }
    (BASE / "data" / "jobs.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    n_src = sum(j["sources"]["count"] for j in jobs if "sources" in j)
    print(f"직무 {len(jobs)}개 병합, 인터뷰 출처 합계 {n_src}건 -> data/jobs.json")
    if missing:
        print("아직 없는 직무:", ", ".join(missing))
    for p in problems:
        print("문제:", p)


if __name__ == "__main__":
    main()
