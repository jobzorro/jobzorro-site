"""
6단계(v2 개편 3단계) 준비: 일반 신규 직무 12개 + 서비스·콘텐츠 직군 5개의 인터뷰 원문 후보 배정표(corpus/batches6/<id>.md).
prepare_phase4.main 재사용.
"""
import sys
from prepare_phase4 import main

NEW = {
    # 마케팅·기획·경영지원
    "fmcg-bm":         (["brand-marketer", "sales-management", "md"], ["BM", "브랜드 매니저", "브랜드매니저", "P&L", "신제품", "소비재", "제품 출시", "판촉"]),
    "crm-marketing":   (["performance-marketer", "content-marketer", "cx"], ["CRM", "리텐션", "재구매", "푸시", "앱푸시", "카카오 알림톡", "세그먼트", "LMS", "고객 데이터"]),
    "ma-invest":       (["strategy", "corporate-finance", "bd", "consulting"], ["M&A", "인수", "투자", "실사", "밸류에이션", "PMI", "지분", "신사업 투자"]),
    "compliance":      (["legal", "risk-management", "bank", "accounting"], ["준법감시", "준법", "내부감사", "감사팀", "내부통제", "컴플라이언스", "윤리경영", "감사"]),
    "trade-admin":     (["forwarding", "overseas-sales", "trading", "scm"], ["무역사무", "수출입", "통관", "선적", "B/L", "L/C", "인보이스", "무역"]),
    # IT
    "mobile-dev":      (["frontend", "sw-dev", "backend"], ["안드로이드", "iOS", "모바일", "앱 개발", "Swift", "Kotlin", "Flutter", "React Native"]),
    "devops":          (["backend", "data-engineer", "sw-dev", "it-planning"], ["DevOps", "클라우드", "AWS", "쿠버네티스", "인프라", "CI/CD", "SRE", "서버 운영"]),
    "security":        (["it-planning", "sw-dev", "backend"], ["보안", "정보보호", "ISMS", "취약점", "관제", "침해", "모의해킹", "개인정보"]),
    # R&D·품질·건설
    "analysis-eng":    (["rnd-chem", "device-rnd", "quality", "battery-dev"], ["분석", "성분 분석", "물성", "SEM", "TEM", "XRD", "GC", "HPLC", "분석팀"]),
    "sq":              (["quality", "purchasing", "reliability"], ["SQ", "협력사 품질", "CQ", "고객 품질", "클레임", "8D", "PPAP", "협력사 감사", "입고 검사"]),
    "mep":             (["construction-mgmt", "plant-epc", "equipment-pm", "electrical-design"], ["전기", "설비", "기계설비", "MEP", "소방", "공조", "배관", "전기공사"]),
    "cost-estimating": (["construction-mgmt", "civil-eng", "plant-epc", "bid-sales"], ["공무", "견적", "기성", "설계변경", "실행예산", "내역", "원가", "도급"]),
    # 서비스·콘텐츠 (신설 직군)
    "cabin-crew":      (["cx", "general-affairs"], ["승무원", "객실", "기내", "비행", "서비스 교육", "LCC", "항공사"]),
    "ground-staff":    (["cx", "forwarding"], ["지상직", "운항관리", "공항", "카운터", "탑승", "운항", "항공사", "게이트"]),
    "hotel-ops":       (["cx", "general-affairs", "md"], ["호텔", "리조트", "프론트", "객실", "F&B", "레비뉴", "OTA", "컨시어지"]),
    "ent-manager":     (["content-marketer", "pr", "broadcast-pd"], ["엔터", "매니저", "아티스트", "A&R", "음반", "기획사", "캐스팅", "앨범"]),
    "content-pd":      (["content-marketer", "broadcast-pd", "pr"], ["웹툰", "출판", "편집자", "에디터", "PD", "작가", "연재", "원고"]),
}

if __name__ == "__main__":
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main(NEW, "batches6")
