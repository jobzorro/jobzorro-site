"""
3단계 준비: 신규 직무 4개를 taxonomy 에 추가, 미분류 26건 + 상사 3건을 OVERRIDES 로 배정, 재분류,
직무별 배정표(corpus/batches3/*.md) 생성.
"""
import csv, json, re, subprocess, sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = Path(__file__).parent

# 1) taxonomy 신규 직무
tax_p = BASE / "data" / "taxonomy.json"
tax = json.loads(tax_p.read_text(encoding="utf-8"))
NEW_JOBS = {
    "sales": {"id": "trading", "name": "종합상사 트레이딩", "en": "Trading (General Trading Company)"},
    "planning": {"id": "management-analysis", "name": "경영관리·경영분석", "en": "Management Analysis / Controlling"},
    "support": {"id": "public-admin", "name": "공공기관·공기업 행정", "en": "Public Sector Administration"},
    "finance-industry": {"id": "policy-finance", "name": "정책금융기관 심사", "en": "Policy Finance Institution"},
}
for g in tax["groups"]:
    if g["id"] in NEW_JOBS and not any(j["id"] == NEW_JOBS[g["id"]]["id"] for j in g["jobs"]):
        g["jobs"].append(NEW_JOBS[g["id"]])
tax_p.write_text(json.dumps(tax, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# 2) OVERRIDES 추가
OV = {
    "332": "public-admin", "376": "biz-planning", "383": "general-affairs", "398": "hr", "412": "real-estate",
    "416": "management-analysis", "427": "data-analyst", "442": "production-mgmt", "453": "sales-management",
    "462": "b2b-sales", "463": "real-estate", "491": "service-planning", "492": "service-planning",
    "497": "equipment-pm", "504": "bio-process", "505": "sales-management", "506": "policy-finance",
    "508": "sales-management", "509": "public-admin", "511": "public-admin", "513": "trading",
    "516": "bank", "517": "bank", "520": "b2b-sales", "523": "brand-marketer", "527": "sales-management",
    # 종합상사 해외영업 3건을 신규 직무로 이동
    "207": "trading", "235": "trading", "286": "trading",
}
cp = BASE / "classify_corpus.py"
c = cp.read_text(encoding="utf-8")
if '"332": "public-admin"' not in c:
    add = "".join(f'    "{k}": "{v}",\n' for k, v in OV.items())
    c = c.replace("OVERRIDES = {\n", "OVERRIDES = {\n    # 2026-10-16 3단계(새 인터뷰 206건) 수동 배정\n" + add, 1)
    cp.write_text(c, encoding="utf-8")

# 3) 재분류
print(subprocess.run([sys.executable, "classify_corpus.py"], cwd=BASE, capture_output=True, text=True, encoding="utf-8").stdout[-300:])

# 4) 배정표
new = set((BASE / "corpus" / "new_idx.txt").read_text(encoding="utf-8").split())
clusters = json.loads((BASE / "corpus" / "clusters.json").read_text(encoding="utf-8"))
before = json.loads((BASE / "corpus" / "clusters_before.json").read_text(encoding="utf-8"))
rows = {r["idx"]: r for r in csv.DictReader((BASE / "corpus" / "manifest.csv").open(encoding="utf-8-sig"))}
synth_dir = BASE / "corpus" / "synth"
BATCHES = {
    "A1": ["b2b-sales"],
    "A2": ["hr", "general-affairs", "public-admin"],
    "A3": ["finance", "accounting", "bank", "policy-finance", "risk-management", "real-estate"],
    "A4": ["overseas-sales", "trading", "forwarding", "scm"],
    "A5": ["sales-management", "ecommerce-sales", "pharma-sales", "md", "online-md"],
    "A6": ["purchasing", "strategy", "biz-planning", "management-analysis", "consulting", "production-mgmt"],
    "A7": ["brand-marketer", "performance-marketer", "pr", "service-planning", "data-analyst"],
    "A8": ["quality", "rnd-chem", "production-tech", "equipment-pm", "bio-process"],
}
out_dir = BASE / "corpus" / "batches3"; out_dir.mkdir(exist_ok=True)
covered = set()
summary = []
for b, jobs in BATCHES.items():
    lines = [f"# 배치 {b}", "", "규칙: corpus/GUIDE_PHASE3.md (+ SYNTH_GUIDE.md, GUIDE_PHASE2.md)", ""]
    for jid in jobs:
        files = clusters.get(jid, [])
        new_files = [f for f in files if f["idx"] in new or (jid == "trading")]
        old_n = len(before.get(jid, [])) if jid != "trading" else 0
        target = len(files)
        exists = (synth_dir / f"{jid}.json").exists()
        lines.append(f"## {jid}  ({'기존 synth 보강' if exists else '신규 직무 — 전체 새로 작성'})")
        lines.append(f"- 기존 synth: corpus/synth/{jid}.json {'있음' if exists else '없음'} / 기존 인터뷰 {old_n}건 → 목표 sources.count = **{target}**")
        lines.append(f"- 새로 읽을 파일 {len(new_files)}건 (글자 수 많은 순):")
        for f in sorted(new_files, key=lambda x: -x["chars"]):
            lines.append(f"  - corpus/txt/{f['idx']}.txt  ({f['chars']:,}자)  ← {f['file']}")
        lines.append("")
        covered.update(f["idx"] for f in new_files)
        summary.append((b, jid, old_n, len(new_files), target, exists))
    (out_dir / f"{b}.md").write_text("\n".join(lines), encoding="utf-8")
missing = sorted(new - covered)
print("배치 미포함 신규 파일:", missing, [clusters_job for clusters_job, fs in clusters.items() if any(f["idx"] in missing for f in fs)])
for s in summary:
    print(f"{s[0]} {s[1]:22s} 기존 {s[2]:3d} + 새 {s[3]:3d} = {s[4]:3d}  {'' if s[5] else 'NEW'}")
