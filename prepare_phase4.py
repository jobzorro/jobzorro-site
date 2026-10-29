"""
4단계(v2 개편 1단계) 준비: 새 세부 직무마다 읽을 인터뷰 원문 후보를 키워드로 골라 배정표(corpus/batches4/<id>.md)를 만든다.
기존 직무에서 갈라지는 직무라 원문이 이미 corpus/txt 에 있다. 키워드가 많이 나오는 파일부터 최대 25건.
"""
import json, re, sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = Path(__file__).parent
TXT = BASE / "corpus" / "txt"

# 새 직무: (먼저 볼 기존 직무 클러스터, 키워드). 클러스터 밖 파일도 키워드가 강하면 후보로 넣는다.
NEW = {
    "hrd-culture":        (["hr", "recruiter", "general-affairs"], ["HRD", "교육 담당", "교육 기획", "사내 교육", "연수", "리더십", "조직문화", "온보딩", "교육과정"]),
    "cnb":                (["hr", "general-affairs", "accounting"], ["C&B", "급여", "보상", "연봉 테이블", "4대보험", "퇴직연금", "원천세", "인건비", "성과급"]),
    "labor":              (["hr", "general-affairs", "safety"], ["노무", "노사", "노조", "노동조합", "단체교섭", "근로기준법", "노동위원회", "징계", "임금협상"]),
    "tax":                (["finance", "accounting"], ["세무", "법인세", "부가세", "부가가치세", "원천세", "세무조정", "이전가격", "세무조사"]),
    "cost-accounting":    (["finance", "accounting", "biz-planning", "management-analysis"], ["원가", "표준원가", "관리회계", "제조원가", "원가계산", "재고자산", "손익 분석"]),
    "ir":                 (["finance", "strategy", "biz-planning"], ["IR", "공시", "투자자", "주주", "실적 발표", "애널리스트", "주주총회"]),
    "purchasing-planning":(["purchasing", "scm"], ["구매기획", "간접구매", "간접 구매", "MRO", "용역", "협력사 평가", "전략구매", "단가 계약", "구매 전략"]),
    "bid-sales":          (["b2b-sales", "overseas-sales", "equipment-pm", "construction-mgmt", "plant-epc"], ["수주", "입찰", "제안서", "발주처", "PQ", "견적", "프로젝트 영업", "턴키"]),
    "technical-sales":    (["b2b-sales", "overseas-sales", "saas-sales"], ["기술영업", "FAE", "세일즈 엔지니어", "기술 지원", "스펙", "샘플", "엔지니어와"]),
    "channel-kam":        (["sales-management", "b2b-sales", "ecommerce-sales", "sales-planning"], ["대형마트", "할인점", "편의점 본사", "바이어", "입점", "KAM", "키어카운트", "행사", "매대", "채널 영업"]),
    "store-sv":           (["sales-management", "md"], ["점포", "가맹", "슈퍼바이저", "SV", "점주", "매장 관리", "점장", "가맹점"]),
    "aml":                (["bank", "risk-management", "policy-finance", "corporate-finance", "fund-ops", "legal"], ["AML", "자금세탁", "KYC", "고객확인", "의심거래", "STR", "CDD", "준법감시", "내부통제", "FIU"]),
}


def main(new=NEW, out_name="batches4"):
    clusters = json.loads((BASE / "corpus" / "clusters.json").read_text(encoding="utf-8"))
    idx2job = {x["idx"]: jid for jid, xs in clusters.items() for x in xs}
    files = {p.stem: p for p in TXT.glob("*.txt") if p.stat().st_size > 400}
    texts = {k: p.read_text(encoding="utf-8", errors="ignore") for k, p in files.items()}
    out = BASE / "corpus" / out_name
    out.mkdir(exist_ok=True)
    for jid, (src, kws) in new.items():
        scored = []
        for k, t in texts.items():
            hits = {w: len(re.findall(re.escape(w), t)) for w in kws}
            total = sum(hits.values())
            in_cluster = idx2job.get(k) in src
            # 클러스터 안이면 키워드 2회 이상, 밖이면 6회 이상(그 일을 실제로 길게 말한 경우만)
            if (in_cluster and total >= 2) or total >= 6:
                scored.append((total + (5 if in_cluster else 0), k, idx2job.get(k, "-"), total, {w: n for w, n in hits.items() if n}))
        scored.sort(reverse=True)
        pick = scored[:25]
        lines = [f"# {jid} 배정표", f"원 클러스터: {', '.join(src)} / 키워드: {', '.join(kws)}", f"후보 {len(scored)}건 중 상위 {len(pick)}건", ""]
        for s, k, cj, total, hits in pick:
            lines.append(f"- corpus/txt/{k}.txt  (원래 직무 {cj}, 키워드 {total}회: {', '.join(f'{w} {n}' for w, n in hits.items())})")
        (out / f"{jid}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{jid}: 후보 {len(scored)}건 → {len(pick)}건")


if __name__ == "__main__":
    main()
