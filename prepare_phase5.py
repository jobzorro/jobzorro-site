"""
5단계(v2 개편 2단계) 준비: 산업 전용 직무 25개의 인터뷰 원문 후보 배정표(corpus/batches5/<id>.md).
산업 전용 직무는 기존 클러스터에 거의 없으므로 키워드가 강하게 나오는 파일 위주로 찾는다 (prepare_phase4.main 재사용).
부동산 AM·LM·PM·FM 은 취업조로 블로그 부동산 시리즈(corpus/blog_re1~4.txt)도 함께 읽는다.
"""
import sys
from prepare_phase4 import main

NEW = {
    # 부동산 (사용자 요청 2026-10-29: PM·FM·AM 등 구분)
    "re-am":              (["real-estate", "fund-ops", "corporate-finance"], ["AM", "자산운용", "펀드", "리츠", "매각", "Cap rate", "NOI", "IRR", "대체투자", "투자운용"]),
    "re-lm":              (["real-estate"], ["LM", "임대 영업", "임대영업", "리싱", "렌트프리", "임차인 유치", "공실", "핏아웃"]),
    "re-pm":              (["real-estate", "general-affairs"], ["PM", "자산관리", "임차인", "관리비", "빌딩 운영", "임대차", "프로퍼티"]),
    "re-fm":              (["real-estate", "general-affairs", "safety"], ["FM", "시설관리", "시설 관리", "빌딩 관리", "설비 관리", "방재실", "유지보수"]),
    # 금융
    "ib":                 (["corporate-finance", "risk-management", "fund-ops"], ["IB", "ECM", "DCM", "인수금융", "IPO", "기업공개", "회사채", "인수"]),
    "analyst":            (["risk-management", "strategy", "fund-ops"], ["애널리스트", "리서치", "리포트", "기업분석", "산업분석", "커버리지"]),
    "wm-pb":              (["bank", "sales-management"], ["WM", "PB", "자산관리", "VIP", "고객 자산", "포트폴리오", "프라이빗"]),
    "fund-manager":       (["fund-ops", "real-estate", "corporate-finance"], ["운용역", "펀드매니저", "대체투자", "운용사", "딜 소싱", "투자심사", "PE"]),
    "actuary":            (["underwriting", "risk-management"], ["계리", "보험계리", "IFRS17", "책임준비금", "상품개발", "요율"]),
    "claims":             (["underwriting"], ["손해사정", "보상", "보험금", "사고 조사", "지급심사"]),
    "insurance-sales-mgmt": (["sales-management", "underwriting"], ["GA", "설계사", "FC", "보험 영업", "지점장", "리크루팅", "보험설계사"]),
    # 영업·마케팅
    "medical-device-sales": (["pharma-sales", "b2b-sales", "ra"], ["의료기기", "병원", "수술실", "덴탈", "임플란트", "진단기기"]),
    "product-planning":   (["sales-planning", "brand-marketer", "product-dev"], ["상품기획", "제품기획", "라인업", "신제품 기획", "출시", "스펙 정의"]),
    # 물류·유통
    "fulfillment":        (["scm", "forwarding", "md"], ["물류센터", "풀필먼트", "WMS", "입출고", "센터 운영", "3PL"]),
    "shipping":           (["forwarding", "overseas-sales", "trading"], ["해운", "선사", "선박", "용선", "벌크", "컨테이너선", "운항"]),
    "vmd":                (["md", "brand-marketer"], ["VMD", "비주얼 머천다이징", "디스플레이", "매장 연출", "윈도우"]),
    # IT·통신
    "game-planning":      (["service-planning", "qa", "content-marketer"], ["게임 기획", "레벨 디자인", "시스템 기획", "밸런스", "콘텐츠 기획", "게임"]),
    "network-eng":        (["it-planning", "sw-dev", "embedded-sw"], ["네트워크", "기지국", "통신망", "전송", "무선", "5G", "인프라 엔지니어"]),
    # 연구·설계·생산
    "vehicle-test":       (["product-dev", "reliability", "mechanical-design", "production-tech"], ["차량 시험", "시험평가", "주행", "내구", "NVH", "차량 개발", "실차"]),
    "cosmetic-rnd":       (["rnd-chem", "brand-marketer"], ["제형", "처방", "화장품 연구", "기초 제형", "색조", "ODM 연구"]),
    "naval-design":       (["mechanical-design", "plant-epc", "electrical-design"], ["선박 설계", "조선", "선체", "의장", "기본설계", "상세설계", "선급"]),
    "system-eng":         (["mechanical-design", "embedded-sw", "equipment-pm"], ["체계", "방산", "체계종합", "무기체계", "항공기", "요구사항", "ILS"]),
    "power-plant-ops":    (["equipment-eng", "safety", "public-admin"], ["발전소", "발전", "교대근무", "터빈", "보일러", "운전원", "정비"]),
    # 바이오
    "pv":                 (["clinical", "ra", "gmp-qa"], ["약물감시", "PV", "이상사례", "안전성 정보", "부작용 보고"]),
    "pharma-pm":          (["pharma-sales", "brand-marketer"], ["PM", "프로덕트 매니저", "제약 마케팅", "학술", "심포지엄", "KOL"]),
}

if __name__ == "__main__":
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main(NEW, "batches5")
