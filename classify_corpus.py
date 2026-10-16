"""
corpus/manifest.csv 의 파일명을 직무 id로 분류 -> corpus/clusters.json

규칙은 (정규식, 직무id) 순서 목록이며 먼저 맞는 것이 이긴다. 파일명에 직무가 없는 몇 건은
본문을 보고 확정한 예외 표(OVERRIDES)로 처리한다.
"""

import csv
import json
import re
from pathlib import Path

BASE = Path(__file__).parent
TAX = json.loads((BASE / "data" / "taxonomy.json").read_text(encoding="utf-8"))
JOB_IDS = {j["id"] for g in TAX["groups"] for j in g["jobs"]}

# 본문 확인 후 확정한 예외 (idx -> job)
OVERRIDES = {
    # 2026-10-16 3단계(새 인터뷰 206건) 수동 배정
    "332": "public-admin",
    "376": "biz-planning",
    "383": "general-affairs",
    "398": "hr",
    "412": "real-estate",
    "416": "biz-planning",
    "427": "data-analyst",
    "442": "production-mgmt",
    "453": "sales-management",
    "462": "b2b-sales",
    "463": "real-estate",
    "491": "service-planning",
    "492": "service-planning",
    "497": "equipment-pm",
    "504": "bio-process",
    "505": "sales-management",
    "506": "policy-finance",
    "508": "sales-management",
    "509": "public-admin",
    "511": "public-admin",
    "513": "trading",
    "516": "bank",
    "517": "bank",
    "520": "b2b-sales",
    "523": "brand-marketer",
    "527": "sales-management",
    "207": "trading",
    "235": "trading",
    "286": "trading",
    "008": "bd",              # YG 디지털플랫폼 해외사업
    "129": "finance",         # 리멤버 자금
    "130": "accounting",      # 미래아이앤지 재무회계(결산·공시)
    "168": "real-estate",     # 시행사
    "177": "fund-ops",        # 자산운용 백오피스
    "262": "circuit-design",  # SK하이닉스 설계
    "264": "process-tech",    # V-NAND 공정 설계(양산기술)
    "301": "scm",             # 현대글로비스 KD사업(부품 수출입)
    "311": "pharma-sales",    # KT AM이지만 내용은 녹십자 제약영업
    "318": "broadcast-pd",    # 현대홈쇼핑 PD
    "319": "equipment-pm",    # SFA 물류PM(설비 프로젝트)
    "321": "online-md",       # 나스미디어 문자커머스 MD
    "324": "online-md",       # 롯데홈쇼핑 MD
    "120": "overseas-sales",  # 현대코퍼레이션(종합상사) 영업
    "323": "overseas-sales",  # 풍산 해외영업(우현석)
}

RULES = [
    (r"언더라이팅", "underwriting"),
    (r"리스크관리", "risk-management"),
    (r"기업금융", "corporate-finance"),
    (r"부동산금융|교보자산신탁", "real-estate"),
    (r"국민은행|농협_은행", "bank"),
    (r"한국자금중개", "corporate-finance"),
    (r"PKG기술|PKG 기술|반도체 PKG", "semiconductor-pkg"),
    (r"PKG영업", "b2b-sales"),
    (r"공정기술", "process-tech"),
    (r"생산기술", "production-tech"),
    (r"생산관리", "production-mgmt"),
    (r"안전", "safety"),
    (r"품질", "quality"),
    (r"메뉴개발", "rnd-food"),
    (r"연구개발", "rnd-chem"),
    (r"건설시공|전기시공", "construction-mgmt"),
    (r"현대로템_PM", "equipment-pm"),
    (r"법무", "legal"),
    (r"ESG", "esg"),
    (r"내부회계|회계", "accounting"),
    (r"재무|재경", "finance"),
    (r"총무", "general-affairs"),
    (r"채용실|채용담당", "recruiter"),
    (r"인사|HR|노무", "hr"),
    (r"구매", "purchasing"),
    (r"포워딩|포워더", "forwarding"),
    (r"scm|SCM|수요관리|물류", "scm"),
    (r"온라인 ?MD|온라인MD", "online-md"),
    (r"MD|md_", "md"),
    (r"데이터분석", "data-analyst"),
    (r"AI리서처", "ai-engineer"),
    (r"_CX_", "cx"),
    (r"_개발_", "sw-dev"),
    (r"IT기획", "it-planning"),
    (r"서비스 ?기획|서비스기획", "service-planning"),
    (r"로레알_PM", "brand-marketer"),
    (r"컨설팅", "consulting"),
    (r"전략기획|전략 정현영|_기획_|기획 및|KAI_기획", "strategy"),
    (r"경영기획|경영관리", "biz-planning"),
    (r"영업기획|판매기획", "sales-planning"),
    (r"미디어플래닝|HS애드", "ad-planner"),
    (r"홍보|PR_", "pr"),
    (r"콘텐츠마케터", "content-marketer"),
    (r"퍼포먼스|그로스|디지털마케팅", "performance-marketer"),
    (r"마케팅", "brand-marketer"),
    (r"제약영업|노보노디스크|종근당", "pharma-sales"),
    (r"Saas|오토데스크|파수_", "saas-sales"),
    (r"이커머스|온라인 ?영업|온라인영업", "ecommerce-sales"),
    (r"해외영업|해영|해외 영업|상사", "overseas-sales"),
    (r"영업관리|영관|리테일영업|B2C영업|식품유통영업|이디야|롯데백화점|GS리테일|국내영업|SV", "sales-management"),
    (r"b2b|B2B|퀄컴|키엔스|키앤스|캐논|후지필름|AJ네트웍스|NHN|삼성전자DS|한화세미텍|현대엘리베이터|가온전선|LG전자_영업|코스맥스_영업|코스맥스_해외영업|GS네오텍|고려용접봉|세아제강|대동모빌리티|삼전_|삼성전자_영업마케팅|신라면세|LG화학_영업마케팅|b2b영업", "b2b-sales"),
    (r"영업", "b2b-sales"),
]


def classify(name: str):
    name = re.sub(r"\.(docx|hwpx|hwp|pdf)$", "", name, flags=re.I)
    for pat, job in RULES:
        if re.search(pat, name, flags=re.I):
            return job
    return None


def main():
    rows = list(csv.DictReader((BASE / "corpus" / "manifest.csv").open(encoding="utf-8-sig")))
    clusters = {}
    unmatched = []
    for r in rows:
        if int(r["chars"]) < 200:
            continue  # 추출 실패
        job = OVERRIDES.get(r["idx"]) or classify(r["file"])
        if job not in JOB_IDS:
            unmatched.append(r)
            continue
        clusters.setdefault(job, []).append({"idx": r["idx"], "file": r["file"], "chars": int(r["chars"])})

    (BASE / "corpus" / "clusters.json").write_text(json.dumps(clusters, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{'직군':10} {'직무':34} {'문서':>4} {'글자수':>9}")
    for g in TAX["groups"]:
        for j in g["jobs"]:
            files = clusters.get(j["id"], [])
            if files:
                print(f"{g['name']:10} {j['name'][:32]:34} {len(files):4} {sum(f['chars'] for f in files):9,}")
    print(f"\n분류 {sum(len(v) for v in clusters.values())} / 미분류 {len(unmatched)}")
    for r in unmatched:
        print("  ??", r["idx"], r["file"])


if __name__ == "__main__":
    main()
