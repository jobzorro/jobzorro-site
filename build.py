"""
세 페이지짜리 정적 사이트를 만든다 (취업조로 스타일, 공용 상단 탭·푸터).

  site/index.html        직무사전   <- data/jobs.json + template.html
  site/news/index.html   취업뉴스   <- news-collector/site/index.html 에 상단 탭만 끼워 넣음
                                    (news-collector/collect_news.py → build_site.py 로 먼저 만든다)
  site/news/<날짜>/      날짜별 지면 <- news-collector/site/<날짜>/index.html (days.json 에 적힌 날짜들)
  site/news/archive/     지난 지면 목록 <- news-collector/site/archive/index.html
  site/zorro/index.html  취업조로와 함께하기 <- template_zorro.html

사용법:
  python build.py                # 세 페이지 모두
  python build.py --no-news      # 뉴스 수집기 결과물이 없을 때
"""

import argparse
PREVIEW = False   # --preview: 연봉·회사·놀이터 폴더 복사 생략 (직무사전 미리보기를 빨리 만들 때)
import base64
import datetime
import hashlib
import pwa
import seo
import html as _html
import json
import os
import re
import shutil
import sys
import urllib.parse
from html import unescape as html_unescape   # 아래에서 `html` 이름은 페이지 문자열로 쓴다
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(__file__).parent
ASSETS = BASE / "assets"
NEWS_SRC = Path(os.environ.get("NEWS_SRC") or BASE / "news-collector" / "site" / "index.html")   # 시험 빌드는 NEWS_SRC=<다른 폴더>/index.html 로 바꿔 쓴다
# 뉴스 수집기 결과물이 없을 때 배포된 뉴스 페이지를 내려받아 쓰는 비상용 (Actions 워크플로가 첫 실행 때만 사용)
NEWS_URL = os.environ.get("NEWS_URL", "")  # 예: https://jobzorro.github.io/career-briefing/
NEWS_ASSET_NAMES = ["logo.png", "logo-dark.png", "teamzorro.png", "mark.png", "mark-dark.png", "favicon-32.png", "favicon-180.png", "archive.json"]


def fetch_news(tmp: Path) -> Path:
    """NEWS_URL 에서 index.html 과 assets/* 를 받아 tmp 에 두고 index.html 경로를 돌려준다."""
    import urllib.request
    base = NEWS_URL.rstrip("/") + "/"
    (tmp / "assets").mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(base + "index.html", timeout=60) as r:
        (tmp / "index.html").write_bytes(r.read())
    for name in NEWS_ASSET_NAMES:
        try:
            with urllib.request.urlopen(base + "assets/" + name, timeout=60) as r:
                (tmp / "assets" / name).write_bytes(r.read())
        except Exception:  # noqa: BLE001 - 없는 파비콘 등은 건너뛴다
            pass
    return tmp / "index.html"

COMPANY = {
    "name": "커리어프로젝트 주식회사",
    "ceo": "조현빈",
    "privacy": "조현빈",
    "reg": "819-88-02851",
    "addr": "경기도 용인시 기흥구 공세로 150-29, 비01-에이86호(공세동, 테라스가든)",
    "home": "https://jobzorro.kr/",
}

# 직군별 색 (공유 이미지·카드 라벨). (액센트 RGB, 배경 RGB)
GROUP_COLORS = {
    "sales":            ((198, 255, 61),  (12, 16, 10)),   # 라임
    "marketing":        ((255, 110, 150), (20, 10, 14)),   # 핑크
    "planning":         ((120, 170, 255), (10, 13, 22)),   # 블루
    "support":          ((255, 196, 80),  (20, 16, 8)),    # 앰버
    "finance-industry": ((90, 220, 190),  (8, 18, 17)),    # 민트
    "logistics":        ((255, 150, 70),  (22, 13, 8)),    # 오렌지
    "it-data":          ((170, 130, 255), (14, 10, 24)),   # 바이올렛
    "rnd":              ((80, 200, 255),  (8, 15, 22)),    # 시안
    "design-eng":       ((230, 230, 110), (18, 18, 8)),    # 옐로
    "manufacturing":    ((255, 120, 90),  (22, 11, 9)),    # 코랄
    "quality-safety":   ((120, 230, 120), (9, 19, 10)),    # 그린
    "bio-pharma":       ((255, 140, 200), (20, 10, 18)),   # 로즈
    "construction":     ((210, 180, 140), (18, 15, 11)),   # 샌드
    "service":          ((255, 215, 120), (20, 17, 9)),    # 골드
}

# 2026-10-29 사용자: 연봉 연구소 - 회사 판단 - 직무사전 - 취업뉴스 - 연봉 놀이터 - 함께하기 순서
# 폰(480px 이하)에서는 sm 두 글자 이름만 (2026-10-28 모바일 개선: 6개가 한 줄에 다 들어가게)
TABS = [("salary/index.html", '<span class="lg">연봉 연구소</span><span class="sm">연봉</span>'),
        ("company/index.html", '<span class="lg">회사&nbsp;판단</span><span class="sm">회사</span>'), ("index.html", '<span class="lg">직무사전</span><span class="sm">직무</span>'),
        ("news/index.html", '<span class="lg">취업뉴스</span><span class="sm">뉴스</span>'), ("play/index.html", '<span class="lg">연봉&nbsp;놀이터</span><span class="sm">게임</span><span class="new">NEW</span>'), ("zorro/index.html", '<span class="lg">취업조로와&nbsp;함께하기</span><span class="sm">상담</span>')]   # 폰(480px 이하)에서는 "함께하기"만 보여 메뉴가 잘리지 않게
# 2026-10-28 모바일: 뉴스 섹션마다 처음 3건만 보이고 '이 섹션 n건 더 보기' (일간·주간·월간이 화면에서 다시 그려져도 다시 접는다)
NEWS_FOLD = ("<style>@media (max-width:640px){.news-grid.fold>.news-card:nth-child(n+4){display:none}}"
             ".nf-more{display:none}@media (max-width:640px){.nf-more{display:flex;align-items:center;justify-content:center;width:100%;min-height:46px;margin:14px 0 0;"
             "font:inherit;font-size:14.5px;font-weight:700;color:var(--ink);background:transparent;border:1px solid var(--line,#d2d2d2);border-radius:12px;cursor:pointer}}</style>"
             "<script>(function(){if(!matchMedia('(max-width:640px)').matches)return;"
             "function fold(){document.querySelectorAll('.news-grid:not([data-nf])').forEach(function(g){g.setAttribute('data-nf','1');var k=g.querySelectorAll(':scope>.news-card').length;if(k<=3)return;"
             "g.classList.add('fold');var b=document.createElement('button');b.type='button';b.className='nf-more';b.textContent='이 섹션 '+(k-3)+'건 더 보기';"
             "b.onclick=function(){g.classList.remove('fold');b.remove()};g.after(b)})}"
             "fold();new MutationObserver(fold).observe(document.body,{childList:true,subtree:true})})();</script>")
APPLY = "apply/index.html"   # 무료 상담 신청 폼 (모든 "무료 상담 신청하기" 버튼이 여기로 간다)

# 2026-11-03: 방문 분석(구글 애널리틱스 4) 측정 ID 자리 — 'G-XXXXXXXXXX' 를 넣으면 빌드 끝에 모든 페이지 <head> 에 태그가 붙는다.
#   빈 값이면 아무것도 넣지 않는다 (지금은 꺼짐: 사장님이 ID 를 아직 안 주심). 관리자 화면(admin/)·이동용 빈 쪽에는 넣지 않는다.
ANALYTICS_ID = ""
# 2026-11-05: GA 대신 쓸 수 있는 쿠키 없는 방문 집계 — Cloudflare Web Analytics 토큰(대시보드 > Web Analytics > 사이트 추가 시 받는 값).
#   빈 값이면 꺼짐(지금). 켜기 전에 개인정보처리방침 '분석 도구를 쓰지 않는다' 문장을 함께 고쳐야 한다.
CF_BEACON_TOKEN = "024bc1b675154de6805d4639132bf745"   # Cloudflare Web Analytics (쿠키 없음, 2026-11-05)
GSTATIC = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'   # 구글 글꼴 파일 서버 미리 연결 (모든 페이지)
STALE_FILES = ("index-v2.html",)   # 예전 시안 — 빌드 때마다 지운다 (2026-11-03)
LASTMOD_STATE = BASE / ".cache" / "lastmod.json"   # 연봉·회사 쪽별 내용 해시 → 마지막으로 바뀐 날 (Actions 캐시로 이어 간다)
_DATE_RE = re.compile(r"\d{4}[.-]\d{1,2}[.-]\d{1,2}|\d{4}년\s*\d{1,2}월(\s*\d{1,2}일)?")


def load_lastmod() -> dict:
    try:
        return json.loads(LASTMOD_STATE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_lastmod(state: dict, seen: set) -> None:
    LASTMOD_STATE.parent.mkdir(parents=True, exist_ok=True)
    LASTMOD_STATE.write_text(json.dumps({k: v for k, v in state.items() if k in seen}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


_TAG_RE = re.compile(r"<(script|style)\b.*?</\1>|<[^>]+>", re.S | re.I)


def page_lastmod(state: dict, key: str, text: str, today: str, first: str, moved: str = "keep") -> str:
    """sitemap lastmod: 쪽에 '보이는 글'(날짜 글자는 빼고)의 해시가 지난 빌드와 같으면 그때 날짜 그대로, 바뀌었으면 오늘.
    처음 보는 쪽(또는 캐시가 없을 때)은 자료 자체의 기준일(first)을 쓴다 — 매일 모든 쪽이 '오늘'로 바뀌지 않게 (2026-11-03)
    2026-11-11: 전엔 HTML 전체를 해시해서, 스크립트 한 줄만 바꿔도 연봉 6,339쪽이 모두 '오늘'이 됐다 → 태그·스크립트·스타일을 뺀 글만 본다 (기록 3번째 칸 "t").
      옛 방식 기록(칸 2개)을 처음 만나면 날짜를 '오늘'로 올리지 않고, moved="keep" 이면 그 날짜 그대로, "first" 면 자료 기준일로 되돌린다."""
    h = hashlib.md5(re.sub(r"\s+", " ", _DATE_RE.sub("", _TAG_RE.sub(" ", text))).encode("utf-8")).hexdigest()[:12]
    old = state.get(key)
    if old and len(old) < 3:   # 옛 방식(HTML 전체 해시) 기록 → 새 해시로 바꿔 적기만 한다
        d = min(old[1], first) if moved == "first" else old[1]
        state[key] = [h, d, "t"]
        return d
    if old and old[0] == h:
        return old[1]
    d = today if old else first
    state[key] = [h, d, "t"]
    return d


def load_noindex() -> dict:
    """다른 묶음이 정한 '검색에서 뺄 회사' 목록 → sitemap 에서 뺀다. 파일이 없으면 빈 목록.
    연봉: salary/data/noindex.json 또는 salary-lab/site/data/noindex.json / 회사 판단: company/data/noindex.json (환경 변수 NOINDEX_SALARY·NOINDEX_COMPANY 로 다른 파일 지정 가능).
    모양은 ["삼성전자", …] 또는 {"slugs": […]} 둘 다 받는다."""
    def read(*cands):
        for c in cands:
            if not c or not Path(c).exists():
                continue
            try:
                d = json.loads(Path(c).read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if isinstance(d, dict):
                d = d.get("slugs") or d.get("noindex") or d.get("co") or list(d.keys())
            return {urllib.parse.unquote(str(x)).strip("/") for x in d}
        return set()
    return {"salary": read(os.environ.get("NOINDEX_SALARY"), BASE / "salary" / "data" / "noindex.json", BASE.parent / "salary-lab" / "site" / "data" / "noindex.json"),
            "company": read(os.environ.get("NOINDEX_COMPANY"), BASE / "company" / "data" / "noindex.json", BASE / "company" / "noindex.json")}


def head_common(rel_parts: tuple, h: str) -> str:
    """모든 페이지 <head> 공통: 글꼴 서버 preconnect + (ID 가 있으면) 분석 태그"""
    if "fonts.googleapis.com/css" in h and 'href="https://fonts.gstatic.com" crossorigin' not in h:
        h = h.replace("</head>", GSTATIC + "</head>", 1) if "<head>" not in h else h.replace("<head>", "<head>" + GSTATIC, 1)
    if ANALYTICS_ID and "data-analytics" not in h and (not rel_parts or rel_parts[0] != "admin"):
        tag = (f'<script async src="https://www.googletagmanager.com/gtag/js?id={ANALYTICS_ID}" data-analytics></script>'
               f"<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','{ANALYTICS_ID}');</script>")
        h = h.replace("</head>", tag + "</head>", 1)
    if CF_BEACON_TOKEN and "data-cf-beacon" not in h and (not rel_parts or rel_parts[0] != "admin"):
        h = h.replace("</head>", f'<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{{"token": "{CF_BEACON_TOKEN}"}}\'></script></head>', 1)
    return h


def add_head_common(out_dir: Path) -> int:
    n = 0
    for f in out_dir.rglob("*.html"):
        h = f.read_text(encoding="utf-8")
        if "</head>" not in h:
            continue
        h2 = head_common(f.relative_to(out_dir).parts, h)
        if h2 != h:
            f.write_text(h2, encoding="utf-8"); n += 1
    return n


def all_jobs_html(data: dict, root: str = "") -> str:
    """홈 카드 그리드는 JS 로 그리므로, 검색 엔진·JS 꺼진 화면용 직군별 전체 직무 링크 (접힌 목록, 2026-11-03)"""
    esc = _html.escape
    out = []
    for g in data["meta"]["groups"]:
        js = [j for j in data["jobs"] if j["group"] == g["id"]]
        if js:
            out.append(f'<h3>{esc(g["name"])} <small>{len(js)}</small></h3><ul>'
                       + "".join(f'<li><a href="{root}jobs/{esc(j["id"])}/">{esc(j["name"])}</a></li>' for j in js) + "</ul>")
    return f'<details class="alljobs"><summary>직군별 전체 직무 {len(data["jobs"])}개 목록</summary>' + "".join(out) + "</details>"


def _hashed(dir_: Path, stem: str, ext: str, body: bytes) -> str:
    """dir_/stem.<해시8>.ext 로 쓰고 같은 stem 의 옛 파일은 지운다. 파일 이름을 돌려준다 (캐시 오래 둬도 되는 이름)"""
    dir_.mkdir(parents=True, exist_ok=True)
    name = f"{stem}.{hashlib.md5(body).hexdigest()[:8]}{ext}"
    for old in dir_.glob(f"{stem}.*{ext}"):
        if old.name != name and re.fullmatch(re.escape(stem) + r"\.[0-9a-f]{8}" + re.escape(ext), old.name):
            old.unlink()
    (dir_ / name).write_bytes(body)
    return name


HOME_LOADER = """
(function () {
  var s = document.currentScript, u = s && s.getAttribute('data-sum');
  fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(jzHome, function () {
    var c = document.getElementById('count');
    if (c) c.innerHTML = '<b>직무 목록을 불러오지 못했어요.</b> 인터넷 연결을 확인하고 <a href="">새로고침</a>해 주세요.';
  });
})();
"""


def data_uri(path: Path, mime="image/png") -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


LOGO_FILES = ("jobzorro_logo.png", "teamzorro_logo.png", "teamzorro_logo_halo.png")   # assets/ → site/assets/ 로 복사해 모든 페이지가 파일 경로로 참조한다


def _salary_count() -> str:
    """연봉 연구소 회사 수를 '5만 2천여' 처럼 (공유 이미지·설명용)"""
    try:
        n = json.loads((BASE / "salary" / "data" / "meta.json").read_text(encoding="utf-8"))["count"]
    except Exception:
        return "5만여"
    man, cheon = n // 10000, (n % 10000) // 1000
    return f"{man}만 {cheon}천여" if cheon else f"{man}만여"


def logo_src(logo: str, root: str) -> str:
    """로고 인자가 data URI·절대 URL 이면 그대로, 'assets/x.png' 같은 상대경로면 페이지 깊이(root)를 앞에 붙인다."""
    if logo.startswith(("data:", "http://", "https://", "/")):
        return logo
    return root + logo


def slim_job(j: dict) -> dict:
    """첫 페이지(index.html)에 박는 슬림 직무. template.html 의 JS 가 카드(card)·필터(filtered)·검색(haystack)·통계에서
    읽는 필드만 남긴다. 상세 패널(detail)이 쓰는 나머지는 site/data/jobs.json 을 첫 클릭 때 받아 온다."""
    s = j.get("sources") or {}
    return {
        "id": j["id"], "name": j["name"], "en": j["en"], "group": j["group"], "tagline": j["tagline"],
        "summary": j["summary"][:100],                                           # 검색(haystack)용. 직무 133개(v2 3단계)부터 앞 100자만 — 상세는 전체 JSON
        "skills": {"hard": j["skills"]["hard"], "soft": []},                    # 카드는 hard 앞 3개. soft(소통·꼼꼼함 등)는 모든 직무에 비슷해 검색에서 빼고 상세에서만 보인다
        "tools": j["tools"], "certs": j["certs"],                                # 검색용
        "salary": {"junior": j["salary"]["junior"]},                             # 카드 하단 신입 연봉대
        "ai": {"level": j["ai"]["level"]},                                       # 카드 AI 배지 · 'AI 영향 낮은 직무만' 필터
        "nonmajorOk": j["nonmajorOk"], "draftOnly": j["draftOnly"],
        "mj": j["mj"], "mf": (j.get("major") or {}).get("fields", []), "deg": (j.get("major") or {}).get("degree", ""),   # 전공 단계 표시 · 진단 매칭
        "mm": (j.get("major") or {}).get("majors", []),                         # 진단: 꼭 맞는 학과 키 (data/majors.json)
        "fw": j.get("fitW"),                                                     # 진단: 직무별 성향 가중치 (있으면 직군 값 위에 덮어씀)
        "sources": {"count": s.get("count", 0), "public": s.get("public", 0), "industries": s.get("industries", [])},  # 근거 배지·필터·업종 검색
        "parent": j.get("parent"), "io": j.get("industryOnly"), "ind": j.get("ind", []),   # v2: 상위 직무 · 산업 전용 · 산업 필터
        "gc": _gc(j["group"]),                                                   # 웹 카드 그림 색 [액센트, 배경] (공유 이미지는 카톡 전용)
    }


# 뉴스 태그(ai_tags) → 직무 id. 최근 45일 아카이브에서 직무별 최신 3건을 jobs.json 에 news 로 붙인다 (상세 패널·직무 페이지에 표시)
NEWS_TAG_MAP = {
    "인사": ["hr", "hrd-culture", "cnb", "labor", "recruiter", "general-affairs"],
    "영업": ["b2b-sales", "overseas-sales", "sales-management", "ecommerce-sales", "pharma-sales", "saas-sales", "technical-sales", "trading", "bid-sales", "channel-kam", "store-sv"],
    "재무": ["finance", "ir", "accounting", "tax", "cost-accounting", "aml", "corporate-finance", "bank", "risk-management", "policy-finance", "fund-ops", "compliance"],
    "기획": ["strategy", "biz-planning", "sales-planning", "consulting", "bd", "esg", "ma-invest"],
    "PM": ["service-planning", "it-planning", "cx"],
    "MD": ["md", "online-md"],
    "구매": ["purchasing", "purchasing-planning", "scm", "forwarding", "trade-admin"],
    "마케팅": ["brand-marketer", "performance-marketer", "content-marketer", "pr", "ad-planner", "crm-marketing", "fmcg-bm", "ent-manager", "content-pd"],
    "개발": ["sw-dev", "backend", "frontend", "embedded-sw", "ai-engineer", "data-engineer", "data-analyst", "qa", "erp-sap", "mobile-dev", "devops", "security"],
    "디자인": ["ux-designer"],
    "생산": ["production-mgmt", "production-tech", "process-tech", "equipment-eng", "semiconductor-pkg"],
    "연구": ["rnd-chem", "battery-dev", "device-rnd", "product-dev", "rnd-food", "rnd-bio", "bio-process", "circuit-design", "analysis-eng"],
    "품질": ["quality", "reliability", "safety", "environment-eng", "gmp-qa", "sq"],
    "건설": ["construction-mgmt", "civil-eng", "plant-epc", "equipment-pm", "plant-design", "mep", "cost-estimating"],
    "공공": ["public-admin"],
}


def news_tag_map(data: dict) -> dict:
    """NEWS_TAG_MAP + 자동 보충: 어느 태그에도 없는 직무(새로 추가된 직무)는 자기 직군의 newsTag 로 붙인다."""
    m = {t: list(ids) for t, ids in NEWS_TAG_MAP.items()}
    listed = {jid for ids in m.values() for jid in ids}
    gtag = {g["id"]: g.get("newsTag") for g in data["meta"]["groups"]}
    for j in data["jobs"]:
        t = gtag.get(j["group"])
        if j["id"] not in listed and t:
            m.setdefault(t, []).append(j["id"])
    return m


def attach_news(data: dict, days: int = 45) -> None:
    import glob
    tag_map = news_tag_map(data)
    arch = sorted(glob.glob(str(BASE / "news-collector" / "archive" / "*.json")))[-days:]
    by_job = {}
    for p in arch:
        try:
            d = json.loads(Path(p).read_text(encoding="utf-8"))
        except Exception:
            continue
        date = d.get("date", Path(p).stem)
        for sec in d.get("sections", []):
            for a in sec.get("articles", []):
                tags = a.get("ai_tags") or []
                ids = {jid for t in tags for jid in tag_map.get(t, [])}
                if not ids:
                    continue
                item = {"date": date, "title": a.get("title", ""), "url": a.get("url", ""), "source": a.get("source", ""),
                        "why": (a.get("ai_why") or a.get("ai_line") or "")[:140], "score": a.get("score", 0)}
                for jid in ids:
                    by_job.setdefault(jid, []).append(item)
    n = 0
    for j in data["jobs"]:
        items = by_job.get(j["id"], [])
        items.sort(key=lambda x: (x["date"], x["score"]), reverse=True)
        seen, out = set(), []
        for it in items:
            if it["url"] in seen:
                continue
            seen.add(it["url"]); out.append({k: v for k, v in it.items() if k != "score"})
            if len(out) == 3:
                break
        if out:
            j["news"] = out; n += 1
    # 2026-11-03: 태그가 맞는 기사가 없는 직무는 같은 직군 다른 직무들의 최근 기사로 채우고 '○○ 직군 최근 뉴스'로 보여 준다
    by_group = {}
    for j in data["jobs"]:
        by_group.setdefault(j["group"], []).extend(by_job.get(j["id"], []))
    ng = 0
    for j in data["jobs"]:
        if j.get("news"):
            continue
        items = sorted(by_group.get(j["group"], []), key=lambda x: (x["date"], x["score"]), reverse=True)
        seen, out = set(), []
        for it in items:
            if it["url"] in seen:
                continue
            seen.add(it["url"]); out.append({k: v for k, v in it.items() if k != "score"})
            if len(out) == 3:
                break
        if out:
            j["news"] = out; j["newsGroup"] = True; ng += 1
    left = sum(1 for j in data["jobs"] if not j.get("news"))
    print(f"관련 뉴스: 직무 {n}개에 최근 {days}일 기사 연결 + 직군 뉴스로 보충 {ng}개 (뉴스 없음 {left}개)")


def attach_client_salary(data: dict) -> None:
    p = BASE / "data" / "client_salary.json"
    if not p.exists():
        return
    cs = json.loads(p.read_text(encoding="utf-8")); gname = {g["id"]: g["name"] for g in data["meta"]["groups"]}
    n = 0
    for j in data["jobs"]:
        g = cs["groups"].get(j["group"])
        if g:
            j["clientSal"] = dict(g, groupName=gname.get(j["group"], "")); n += 1
    print(f"취업조로 이직자 연봉: 직무 {n}개에 직군 집계 연결")


def attach_terms(data: dict, gl: dict, top: int = 5, picked: dict | None = None) -> None:
    """직무마다 필수 용어 TOP 5 를 j["terms"] 로 붙인다 (상세 패널·직무 페이지 '필수 용어').
    data/job_terms.json(picked)에 직무가 있으면 그 5개(그 직무 5년 차가 실무에서 쓰는 업계 용어)를 그대로 쓰고,
    없는 직무만 용어집(glossary.json)에서 본문 빈도순으로 고른다."""
    picked = picked or {}
    SKIP_KEYS = {"id", "en", "group", "sources", "webSources", "news", "terms", "og"}
    def text_of(o):
        if isinstance(o, dict): return " ".join(text_of(v) for k, v in o.items() if k not in SKIP_KEYS)
        if isinstance(o, list): return " ".join(text_of(v) for v in o)
        return o if isinstance(o, str) else ""
    def count(txt, w):
        if re.fullmatch(r"[A-Za-z0-9&/+. -]+", w):
            return len(re.findall(r"(?<![A-Za-z0-9])" + re.escape(w) + r"(?![A-Za-z0-9])", txt))
        return txt.count(w)
    n = 0
    for j in data["jobs"]:
        if picked.get(j["id"]):
            j["terms"] = [{"t": t["t"], "e": t.get("e", ""), "s": t["s"]} for t in picked[j["id"]][:top]]
            n += 1
            continue
        txt = text_of(j); scored = []
        for t in gl.get("terms", []):
            c = sum(count(txt, w) for w in [t["term"]] + t.get("aliases", []))
            if c:
                scored.append((c + (2 if j["id"] in t.get("jobs", []) else 0), t))
        scored.sort(key=lambda x: -x[0])
        j["terms"] = [{"t": t["term"], "e": t.get("en", ""), "s": t["short"]} for _, t in scored[:top]]
        n += bool(j["terms"])
    print(f"필수 용어: 직무 {n}개에 TOP {top} 연결")


def _gc(group: str) -> list:
    """직군 색을 CSS hex 두 개로. 웹 카드는 글자 없는 색 그림을 쓰고, 글자 들어간 1200x630 이미지는 공유 미리보기에만 쓴다."""
    ac, bg = GROUP_COLORS.get(group, ((198, 255, 61), (11, 11, 11)))
    return ["#%02x%02x%02x" % ac, "#%02x%02x%02x" % bg]


def _og_path(jid: str) -> str:
    import hashlib
    p = BASE / "assets" / "share" / "jobs" / f"{jid}.png"
    if not p.exists():
        return ""
    return f"assets/og/{jid}.{hashlib.md5(p.read_bytes()).hexdigest()[:8]}.png"


# 모든 페이지가 공유하는 CSS: 색 토큰, 기본 글꼴, 상단 탭(zn-), 푸터(zf-), 하단 상담 버튼(zfab), 배지·버튼
GLOSS = {"terms": []}

SHARED_CSS = """
/* 취업뉴스(커리어브리핑)와 같은 편집 디자인 톤: 먹색 글자, 종이색 바탕, 황동색 포인트, 라벨·숫자는 모노 글꼴, 다크모드 지원 */
:root { --ink:#0b0b0b; --ink-soft:#3a3a3a; --muted:#666666; --faint:#a3a3a3; --brass:#0b0b0b; --brass-tint:#f4f4f4; --brass-bar:#c6ff3d; --acc:#c6ff3d; --acc-ink:#0b0b0b; --mark:#c6ff3d;
  --paper:#ffffff; --ground:#ffffff; --mist:#f4f4f4; --hairline:#e9e9e9; --hairline-2:#d2d2d2;
  /* 아래는 기존 템플릿이 쓰는 이름 → 위 토큰에 연결 */
  --bg:var(--ground); --surface:var(--paper); --surface-2:var(--mist); --black:var(--ink); --fg-soft:var(--ink-soft); --line:var(--hairline); --line-strong:var(--hairline-2);
  --red:var(--ink); --red-soft:var(--mist); --yellow:var(--acc); --green:#15754f; --green-soft:rgba(27,143,99,.12);
  --lvl1:#1b8f63; --lvl2:#c98500; --lvl3:#b4453a;
  /* 2026-11-11 흐린 글씨 고침: 글자로 쓸 때는 흰 바탕·회색 칸에서도 읽히게 조금 어두운 색 (막대 그림은 위 색 그대로) */
  --lvl1-t:#15754f; --lvl2-t:#8f5e00; --lvl3-t:#a83d33;
  /* 먹색으로 채운 큰 카드(히어로 옆 카드·CTA·상담 박스)와 작은 채움 요소(칩·아이콘·버튼) */
  --inkbg:#0b0b0b; --inkfg:#ffffff; --inkfg-soft:rgba(255,255,255,.72); --inkline:rgba(255,255,255,.28);
  --fill:#0b0b0b; --fillfg:#ffffff; --logo-filter:none;
  --shadow:none; --shadow-lift:0 18px 50px rgba(0,0,0,.18);
  /* 2026-11-11 글꼴: 폰·맥은 기기 글꼴(내려받는 글꼴 용량 줄이기), 윈도우 PC 만 웹 글꼴(맑은 고딕 대신) — <head> 의 한 줄 스크립트가 윈도우면 html 에 class "wf" 를 붙인다.
     주의: 아래 기본 묶음에는 "Noto Sans KR" 을 넣지 않는다 (뒤쪽에라도 있으면 안드로이드가 한글을 웹 글꼴로 받아 버린다). 영문·숫자만 Archivo */
  --font:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif;
  --display:"Archivo",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif; --serif:var(--display); --mono:var(--display); color-scheme: light dark; }
html.wf { --font:"Noto Sans KR","Archivo","JZ Fallback",-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  --display:"Archivo","Noto Sans KR","JZ Fallback D",sans-serif; --serif:var(--display); --mono:var(--display); }
/* 큰 제목(h1·h2·직무 이름·검은 띠)은 모든 기기에서 웹 글꼴 그대로 — 이 요소들 안에서만 글꼴 토큰을 웹 글꼴로 바꿔 준다 */
h1, h2, .name, .v2-ticker, .z-ticker, .big { --font:"Noto Sans KR","Archivo","JZ Fallback",sans-serif; --display:"Archivo","Noto Sans KR","JZ Fallback D",sans-serif;
  --serif:var(--display); --mono:var(--display); --v-display:var(--display); --v-font:var(--font); }
h1, h2 { font-family:var(--font); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ink:#f3f3f3; --ink-soft:#cfcfcf; --muted:#8f8f8f; --faint:#6a6a6a; --brass:#f3f3f3; --brass-tint:#161616; --brass-bar:rgba(198,255,61,.32); --mark:rgba(198,255,61,.32);
  --paper:#0b0b0b; --ground:#0b0b0b; --mist:#161616; --hairline:#242424; --hairline-2:#3a3a3a; --green:#3fbf8a; --lvl2:#d9a441; --lvl3:#e0796c; --lvl1-t:#3fbf8a; --lvl2-t:#d9a441; --lvl3-t:#e0796c;
  --inkbg:#f3f3f3; --inkfg:#0b0b0b; --inkfg-soft:rgba(11,11,11,.7); --inkline:rgba(11,11,11,.25); --fill:#f3f3f3; --fillfg:#0b0b0b; --logo-filter:invert(1);
  --shadow:none; --shadow-lift:0 18px 50px rgba(0,0,0,.5); } }
:root[data-theme="dark"] { --ink:#f3f3f3; --ink-soft:#cfcfcf; --muted:#8f8f8f; --faint:#6a6a6a; --brass:#f3f3f3; --brass-tint:#161616; --brass-bar:rgba(198,255,61,.32); --mark:rgba(198,255,61,.32);
  --paper:#0b0b0b; --ground:#0b0b0b; --mist:#161616; --hairline:#242424; --hairline-2:#3a3a3a; --green:#3fbf8a; --lvl2:#d9a441; --lvl3:#e0796c; --lvl1-t:#3fbf8a; --lvl2-t:#d9a441; --lvl3-t:#e0796c;
  --inkbg:#f3f3f3; --inkfg:#0b0b0b; --inkfg-soft:rgba(11,11,11,.7); --inkline:rgba(11,11,11,.25); --fill:#f3f3f3; --fillfg:#0b0b0b; --logo-filter:invert(1);
  --shadow:none; --shadow-lift:0 18px 50px rgba(0,0,0,.5); }
/* 2026-11-11 화면 밀림(CLS): 웹 글꼴이 오기 전에 잠깐 쓰는 맑은 고딕은 한글 폭이 약 9% 넓어 줄 수가 달라졌다 → 같은 폭이 되게 92% 로 줄여 쓴다.
   (맑은 고딕이 없는 폰·맥에서는 이 규칙이 그냥 건너뛰어진다. 내려받는 글꼴·굵기는 그대로) */
@font-face { font-family:"JZ Fallback"; src:local("Malgun Gothic"); size-adjust:92%; }
@font-face { font-family:"JZ Fallback"; src:local("Malgun Gothic Bold"), local("Malgun Gothic"); font-weight:700 900; size-adjust:92%; }
/* 제목 글꼴 묶음(Archivo + Noto)은 숫자·영문·띄어쓰기가 더 좁아 89% */
@font-face { font-family:"JZ Fallback D"; src:local("Malgun Gothic"); size-adjust:89%; }
@font-face { font-family:"JZ Fallback D"; src:local("Malgun Gothic Bold"), local("Malgun Gothic"); font-weight:700 900; size-adjust:89%; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--font); font-size:15px; line-height:1.6; -webkit-font-smoothing:antialiased; word-break:keep-all; overflow-wrap:break-word; padding-bottom:24px; }
h1,h2,h3 { margin:0; font-weight:900; letter-spacing:-.04em; text-wrap:balance; }
p { margin:0; } ul,ol { margin:0; padding:0; list-style:none; } a { color:inherit; }
button { font:inherit; color:inherit; background:none; border:0; cursor:pointer; }
button:focus-visible,input:focus-visible,[tabindex]:focus-visible,a:focus-visible { outline:2px solid var(--brass); outline-offset:3px; border-radius:3px; }
.wrap { max-width:1120px; margin:0 auto; padding-inline:20px; }
/* 라벨(모노·대문자 느낌)과 숫자 */
.kicker { font-family:var(--font); font-size:12px; font-weight:600; letter-spacing:.01em; color:var(--ink-soft); }
.badge { display:inline-flex; align-items:center; gap:4px; font-family:var(--display); font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:4px 9px; border-radius:999px; background:var(--ink); color:var(--paper); white-space:nowrap; }
.badge.soft { background:var(--ink); color:var(--paper); } .badge.green { background:var(--green-soft); color:var(--green); } .badge.gray { background:var(--mist); color:var(--muted); border:1px solid var(--hairline); }
.btn { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; border-radius:8px; font-size:14px; font-weight:700; text-decoration:none; }
.btn { border-radius:999px; font-family:var(--display); letter-spacing:.02em; }
.btn.primary { background:var(--inkfg); color:var(--inkbg); } .btn.primary:hover { background:var(--acc); color:var(--acc-ink); }
.btn.ghost { border:1px solid var(--inkline); color:var(--inkfg); }
/* 공용 상단 탭 (취업뉴스 페이지에도 끼워 넣으므로 .zn 규칙은 뉴스 페이지에도 있는 토큰만 쓴다: --paper --ink --muted --hairline --brass) */
.zn { position:sticky; top:env(safe-area-inset-top,0px); z-index:20; background:var(--paper); color:var(--ink); border-bottom:1px solid var(--hairline); font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif; }
.zn:is(html.wf *) { font-family:"Noto Sans KR","Archivo",sans-serif; }   /* 윈도우 PC 만 웹 글꼴 */
.zn-tabs a:is(html:not(.wf) *) { font-family:"Archivo",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif; }
.zn-in { max-width:1120px; margin:0 auto; padding:0 20px; display:flex; align-items:center; gap:16px; height:54px; }
.zn-logo { display:flex; align-items:center; flex:none; align-self:stretch; }
.zn-logo img { height:22px; width:auto; filter:var(--logo-filter,none); display:block; }
.zn-logo img[src$="_halo.png"] { height:25.3px; margin:-1.65px; }   /* 테두리 여백(위아래 6px/80px)만큼 키우고 당겨 글자 크기는 그대로 */
.zn-tabs { display:flex; gap:2px; height:100%; margin-left:6px; min-width:0; overflow-x:auto; scrollbar-width:none; }
.zn-tabs::-webkit-scrollbar { display:none; }
.zn-tabs a { display:flex; align-items:center; padding:0 12px; font-family:var(--display); font-size:13px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--muted); text-decoration:none; white-space:nowrap; border-bottom:2px solid transparent; }
.zn-tabs a:hover { color:var(--ink); }
.zn-tabs a.on { color:var(--ink); border-bottom-color:var(--ink); }
.zn-tabs .sm { display:none; }
@media (max-width:480px) { .zn-tabs .lg { display:none; } .zn-tabs .sm { display:inline; } }   /* 폰: '연봉 놀이터' 대신 '게임' (2026-10-27 사용자) */
.zn-tabs .new { margin-left:5px; font-size:9.5px; font-weight:800; letter-spacing:.04em; background:#c6ff3d; color:#0b0b0b; border-radius:99px; padding:1px 6px; line-height:1.5; }
@media (max-width:480px) { .zn-tabs .new { font-size:0; width:7px; height:7px; padding:0; margin:0 0 10px 2px; display:inline-block; } }   /* 폰: NEW 글자 대신 라임 점 */
.zn-cta { margin-left:auto; flex:none; font-family:var(--display); font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--paper); background:var(--ink); border-radius:999px; padding:9px 15px; text-decoration:none; white-space:nowrap; }
.zn-cta:hover { background:var(--acc); color:var(--acc-ink); }
@media (max-width:640px) { .zn-cta { display:none; } .zn-in { gap:10px; padding:0 14px; } .zn-logo img { height:19px; } .zn-logo img[src$="_halo.png"] { height:21.85px; margin:-1.43px; } .zn-tabs a { padding:0 9px; font-size:13px; } }
@media (max-width:480px) { .zn-in { gap:6px; padding:0 10px; } .zn-tabs { margin-left:0; } .zn-tabs a { padding:0 6px; font-size:13.5px; } .zn-tabs.more { -webkit-mask-image:linear-gradient(90deg,#000 85%,transparent); mask-image:linear-gradient(90deg,#000 85%,transparent); } }   /* 2026-10-28: 두 글자 메뉴, 그래도 넘치면 오른쪽을 흐리게 */
/* 공용 푸터 (뉴스 푸터처럼 먹색 윗선 + 종이색) */
.zf { margin-top:72px; background:var(--paper); color:var(--ink); border-top:1px solid var(--ink); font-family:var(--font); }
.zf-in { max-width:1120px; margin:0 auto; padding:36px 20px 44px; }
.zf-logo img { height:20px; width:auto; filter:var(--logo-filter,none); display:block; }
.zf-logo { display:block; padding:10px 0; margin:-10px 0; }   /* 2026-11-11 누르는 곳 40px (모양은 그대로) */
.zf-row { display:flex; flex-wrap:wrap; align-items:center; gap:22px 22px; }   /* 로고와 링크 한 줄 */
.zf-links { display:flex; flex-wrap:wrap; gap:22px 16px; font-size:12.5px; color:var(--ink-soft); }
.zf-links a { color:inherit; text-decoration:none; font-family:var(--display); font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; display:inline-block; padding:11px 0; margin:-11px 0; } .zf-links a:hover { color:var(--muted); }
.zf-box { margin-top:18px; background:var(--mist); border:1px solid var(--hairline); border-radius:10px; padding:14px 16px; font-size:12px; line-height:1.9; color:var(--muted); }
.zf-box b { color:var(--ink-soft); font-weight:600; }
.zf-note { margin-top:14px; font-size:12px; color:var(--muted); line-height:1.75; max-width:80ch; }
.zf-note summary { cursor:pointer; font-weight:600; color:var(--ink-soft); padding:10px 0; margin:-10px 0; } .zf-note p { margin-top:6px; }
.zf-outro { padding-bottom:30px; margin-bottom:30px; border-bottom:1px solid var(--hairline); }
.zf-big { display:block; width:100%; height:auto; overflow:visible; }
.zf-big text { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; font-size:150px; letter-spacing:-.04em; }
.zf-big .o { fill:none; stroke:var(--ink); stroke-width:2; } .zf-big .s { fill:var(--ink); }
.zf-slogan { margin:20px 0 0; font-size:15px; color:var(--ink-soft); line-height:1.7; }
.zf { border-top-color:var(--hairline); }
/* 하단 고정 상담 버튼 */
.zfab { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(18px + env(safe-area-inset-bottom,0px)); z-index:25; }
.zfab a { display:inline-flex; align-items:center; gap:6px; background:var(--fill); color:var(--fillfg); border-radius:999px; padding:13px 26px; font-size:14px; font-weight:800; text-decoration:none; box-shadow:var(--shadow-lift); font-family:var(--font); }
.zfab a:hover { background:var(--acc); color:var(--acc-ink); }
.zfab a { font-family:var(--display); letter-spacing:.04em; }
"""
# 2026-10-29 모바일 아래 탭바 CSS (뉴스 페이지에도 그대로 붙이려고 따로 둔다)
TABBAR_CSS = """.zb { display:none; }
@media (max-width:640px) {   /* 2026-10-29 모바일: 아래 탭바 — 위 메뉴는 숨기고 로고만 */
  :root { --tabbar-h:58px; }
  .zn-tabs { display:none !important; }
  body { padding-bottom:calc(var(--tabbar-h) + env(safe-area-inset-bottom,0px)); }
  .zb { display:grid; grid-template-columns:repeat(6,1fr); position:fixed; left:0; right:0; bottom:0; z-index:40; background:var(--paper, var(--bg, #fff)); border-top:1px solid var(--hairline, var(--line, #e5e5e5));
    padding:6px max(4px, env(safe-area-inset-left,0px)) calc(6px + env(safe-area-inset-bottom,0px)) max(4px, env(safe-area-inset-right,0px)); transition:transform .25s ease; }
  html { scroll-behavior:auto !important; }   /* 2026-10-28: 폰에선 부드러운 스크롤 끔 (삼성 인터넷이 뉴스에서 아래 바를 도구 막대 뒤로 숨김) */
  .zb a { position:relative; display:grid; justify-items:center; gap:2px; padding:2px 0; color:var(--muted, #777); text-decoration:none; font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif; font-size:12px; font-weight:700; -webkit-tap-highlight-color:transparent; }
  .zb a svg { width:23px; height:23px; box-sizing:content-box; padding:3px 14px; border-radius:999px; transition:background .15s ease; }
  .zb a.on { color:var(--ink, #0b0b0b); }
  /* 2026-11-05 사용자: 아래 탭 글자 크기·굵기가 직무사전/연봉 연구소/회사 판단마다 달라 보임 → 페이지 글꼴·글자 간격·폰 글자 자동 확대에 흔들리지 않게 고정. 굵기는 모든 탭·모든 상태 700 하나로 */
  .zb, .zb a { -webkit-text-size-adjust:100% !important; text-size-adjust:100% !important; }
  html.wf .zb a, html.wf .zb a.on { font-family:system-ui,"Noto Sans KR","Malgun Gothic",sans-serif !important; }   /* 윈도우에서 창을 좁혔을 때만 */
  .zb a, .zb a.on { font-family:system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif; font-size:12px !important; font-weight:700 !important;
    line-height:1.2 !important; letter-spacing:-0.02em !important; white-space:nowrap !important; font-style:normal !important; text-transform:none !important; }   /* 2026-10-29 사용자: 눌린 탭이 확실히 보이게 — 밝은·어두운 모드 모두 형광 알약 + 검은 아이콘 */
  .zb a.on svg { background:#c6ff3d; color:#0b0b0b; stroke-width:2.3; }
  .zb .dot { position:absolute; top:3px; right:calc(50% - 20px); width:7px; height:7px; border-radius:50%; background:#c6ff3d; border:1px solid var(--ink, #0b0b0b); }
}
@media (prefers-reduced-motion: reduce) { .zb { transition:none; } }
"""
SHARED_CSS += TABBAR_CSS


# 취업뉴스 페이지에 끼울 때 덮어쓰는 스타일 (보조 글자 선명하게). 제호는 build_site.py 의 .hero-top 이 그린다
FIT_JS = "<script>(function(){function fit(el){el.style.fontSize='';var s=parseFloat(getComputedStyle(el).fontSize),m=22,g=40;var av=Math.min(el.clientWidth,el.parentElement?el.parentElement.clientWidth:el.clientWidth,document.documentElement.clientWidth-32);while(el.scrollWidth>av+1&&s>m&&g-->0){s-=2;el.style.fontSize=s+'px';}}function all(){document.querySelectorAll('.hero h1').forEach(fit);}all();window.addEventListener('resize',all);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(all);})();</script>"
def ticker_items(data: dict) -> dict:
    """검은 띠 문구를 사이트 각 탭의 지금 숫자로 만든다 — 빌드할 때마다 새로 계산하므로 직무·연봉·회사 판단·뉴스가 바뀌면 띠도 같이 바뀐다
    (2026-10-20 사용자 요청). 페이지마다 자기 탭 내용을 앞에 두고 나머지 탭을 이어 붙인다."""
    nf = lambda v: f"{v:,}"
    jobs = [f"직무 {len(data['jobs'])}개 · 직군 {len(data['meta']['groups'])}개",
            f"현직자 인터뷰 {nf(data['meta'].get('sourceDocs', 0))}건 · 공개 현직자 자료 {nf(sum(j['sources'].get('public', 0) for j in data['jobs']))}건"]
    sal, comp, news = [], [], []
    p = BASE / "salary" / "data" / "meta.json"
    if p.exists():
        m = json.loads(p.read_text(encoding="utf-8"))
        sal = [f"연봉 연구소 · 회사 {nf(m.get('count', 0))}곳 직급별 연봉", f"사업보고서·공공기관 공시 {nf(m.get('dartCount', 0))}곳"]
        v = m.get("validation") or {}
        if v.get("nPeople") or v.get("nMatched"):
            sal.append(f"이직자·현직자 실제 연봉 {nf(v.get('nPeople') or v['nMatched'])}명으로 검증")   # 매주 보정(제보 반영) 때 늘어난다
    p = BASE / "company" / "data" / "index.json"
    if p.exists():
        n = sum(1 for r in json.loads(p.read_text(encoding="utf-8"))["r"] if r[1])
        comp = [f"회사 판단 · {nf(n)}곳 S~F 판정", "두 회사 VS 비교 · 지금 회사 vs 옮길 회사"]
    days = len([d for d in (BASE / "news-collector" / "site").glob("20*") if d.is_dir()]) if (BASE / "news-collector" / "site").exists() else 0
    news = ["취업뉴스 · 매일 아침 커리어브리핑", "오늘의 브리핑 3줄 · Zorro의 한마디"] + ([f"지난 지면 {nf(days)}일치"] if days else [])
    tail = ["신입 · 중고신입 · 경력 이직 · 선퇴사자", "Team Zorro"]
    return {
        "home": jobs + ["회사명·실명 없이 업종과 연차로만"] + sal[:1] + comp + news[:1] + tail,
        "news": news + ["주간 · 월간 랭킹"] + jobs[:1] + sal[:1] + comp[:1] + tail,
        "zorro": ["함께한 합격자 1,100+", "재무제표로 뜯어보는 기업분석", "생생 면접 스크립트", "1:1 첨삭 · 질의응답 · 관리", "상담은 무료"]
                 + jobs[:1] + sal[:1] + comp[:1] + news[:1] + tail[:1],
    }


html_escape = _html.escape


def ticker_spans(items: list) -> str:
    row = "".join(f"<span>{html_escape(t)}</span>" for t in items)
    return row + row   # 두 번 이어 붙여 끊김 없이 흐르게


NEWS_MASTHEAD_CSS = """
/* v2 톤: 황동 포인트 → 검정, 명조 → Archivo, 라임은 배경 강조에만 */
/* 2026-11-11 글꼴: 폰·맥은 기기 글꼴, 윈도우 PC(html.wf)만 웹 글꼴. 큰 제목(h1·h2·검은 띠)은 어디서나 웹 글꼴 */
html.wf { --serif:"Archivo","Noto Sans KR","JZ Fallback D",sans-serif; --sans:"Noto Sans KR","Archivo","JZ Fallback",-apple-system,sans-serif; --mono:var(--sans); }
h1, h2, .v2-ticker { --serif:"Archivo","Noto Sans KR","JZ Fallback D",sans-serif; --sans:"Noto Sans KR","Archivo","JZ Fallback",sans-serif; --mono:var(--sans); --font:var(--sans); }
h1, h2 { font-family:var(--sans); }
:root { --mark:#c6ff3d; --brass:#0b0b0b; --brass-tint:#f4f4f4; --brass-bar:#c6ff3d; --serif:"Archivo",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif; --sans:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif; --mono:var(--sans); --ink:#0b0b0b; --ink-soft:#3a3a3a; --muted:#666666; --paper:#ffffff; --ground:#ffffff; --mist:#f4f4f4; --hairline:#e9e9e9; --hairline-2:#d2d2d2; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --mark:rgba(198,255,61,.32); --brass-bar:rgba(198,255,61,.32); --brass:#f3f3f3; --brass-tint:#161616; --ink:#f3f3f3; --ink-soft:#cfcfcf; --muted:#8f8f8f; --paper:#0b0b0b; --ground:#0b0b0b; --mist:#161616; --hairline:#242424; --hairline-2:#3a3a3a; } }
:root[data-theme="dark"] { --mark:rgba(198,255,61,.32); --brass-bar:rgba(198,255,61,.32); --brass:#f3f3f3; --brass-tint:#161616; --ink:#f3f3f3; --ink-soft:#cfcfcf; --muted:#8f8f8f; --paper:#0b0b0b; --ground:#0b0b0b; --mist:#161616; --hairline:#242424; --hairline-2:#3a3a3a; }
.masthead .brand-name { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; letter-spacing:-.04em; font-size:22px; }
.masthead .brand-en { font-family:"Archivo",sans-serif; font-style:normal; font-weight:700; font-size:11.5px; letter-spacing:.12em; color:var(--muted); background:var(--brass-bar); color:#0b0b0b; padding:3px 8px; border-radius:999px; margin-left:10px; }
.hero h1 { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; letter-spacing:-.055em; }
.hero h1 em { color:inherit; background:linear-gradient(transparent 68%, var(--brass-bar) 68%); }
.eyebrow { border-radius:999px; }
.rank-title, .picks-title, .sector-numeral, .howto-label { font-family:"Archivo","Noto Sans KR",sans-serif; }
.seg[aria-selected="true"], .segmented .seg.on { background:var(--ink); color:var(--paper); }
.job-tag { background:var(--ink); color:var(--paper); border-radius:999px; }
.tag { border-radius:999px; }
/* 보조 글자 선명하게 */
.eyebrow { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12.5px; font-weight:600; letter-spacing:0; color:var(--ink-soft); padding:8px 15px; }
.funnel-num { font-family:"Inter","Noto Sans KR",sans-serif; font-size:28px; font-weight:800; letter-spacing:-.03em; }
.funnel-label { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12px; font-weight:600; letter-spacing:0; text-transform:none; color:var(--ink-soft); margin-top:5px; }
.picks-note, .pick-sector, .foot-label { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.02em; text-transform:none; }
.picks-note, .foot-label { color:var(--muted); }
.stamp, .foot-note { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12px; font-weight:500; letter-spacing:0; text-transform:none; color:var(--muted); }

/* ───── v2 구조: 직무사전과 같은 문법 ───── */
.masthead { border-bottom:0; }
.masthead-inner { padding:28px 20px 0; max-width:1320px; }
.masthead .brand-logo { display:none !important; }
.masthead .brand { gap:0; } .masthead .brand-text { border-left:0; padding-left:0; }
.masthead .brand-name { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); display:flex; align-items:center; flex-wrap:wrap; gap:4px 12px; }
.masthead .brand-name::before { content:""; width:8px; height:8px; border-radius:50%; background:#c6ff3d; display:inline-block; }
.masthead .brand-en { font-family:"Archivo",sans-serif; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; background:none; color:var(--muted); padding:0; margin-left:0; }
/* 영어 → 한글 순서: "Career Briefing · 한 줄 설명" */
.masthead .brand-ko { margin-left:-6px; }
.masthead .brand-ko::before { content:"· "; }
/* 좁은 화면: 한글 설명을 다음 줄로 내리고 점 대신 글자 시작선에 맞춤 */
/* 2026-10-28 사용자: 폰에서도 'Career Briefing · 조로의 News Pick' 한 줄 (글자 간격을 줄여 360px 폰에서도 들어감), 머리 부분 간격 줄여 일간/주간을 위로 */
@media (max-width:560px) {
  .masthead .brand-name, .masthead .brand-en { font-size:11.5px; letter-spacing:.08em; }
  .masthead .brand-name { flex-wrap:nowrap; white-space:nowrap; }
  .masthead .brand-ko { margin-left:-4px; }
}
.stamp { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.theme-btn { font-family:"Archivo",sans-serif; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; }
.hero { background:var(--paper); border-bottom:1px solid var(--hairline); }
.hero-inner { max-width:1320px; padding:18px 20px 40px; gap:48px; align-items:end; }
.eyebrow { display:none; }
.hero h1 { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; font-size:clamp(38px, 6vw, 88px); line-height:.98; letter-spacing:-.05em; margin:12px 0 26px; white-space:nowrap; }
.hero h1 em { color:inherit; background:linear-gradient(transparent 68%, var(--mark, #c6ff3d) 68%); }
/* 다른 탭과 같은 2단 제목: 작은 회색 윗줄 + 거대한 핵심어 */
.hero h1 .thin { display:block; font-weight:500; font-size:.46em; letter-spacing:-.03em; color:var(--ink-soft); margin-bottom:12px; line-height:1.15; }
.hero h1 .line { display:block; }
.hero-sub { font-size:16px; color:var(--ink-soft); max-width:58ch; }
.brief-box { border:0; border-top:1px solid var(--ink); border-radius:0; background:transparent; padding:18px 0 0; margin-top:0; }
.brief-label { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.hero-sub { margin:0; }
/* 숫자판: 연봉 연구소처럼 오른쪽 세로 목록 */
.hero-stats { flex:0 0 300px; max-width:300px; }
.funnel { flex-direction:column; flex-wrap:nowrap; border-top:1px solid var(--ink); margin:0; padding:0; gap:0; }
.funnel-step { display:flex; justify-content:space-between; align-items:baseline; flex-direction:row-reverse; padding:12px 0; margin:0; border-right:0; border-bottom:1px solid var(--hairline); }
.funnel-num { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:28px; font-weight:900; letter-spacing:-.04em; }
.funnel-label { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin:0; }
/* 오늘의 브리핑: 섹션 번호 자리에 취업조로 마크 */
.brief-sec .sector-head-left { align-items:center; }
.sector-mark img { width:clamp(44px, 4.6vw, 60px); height:clamp(44px, 4.6vw, 60px); border-radius:12px; }
.brief-sec .brief-list { max-width:88ch; }
.brief-sec .brief-list li { font-size:clamp(16px, 1.5vw, 18px); line-height:1.7; font-weight:500; color:var(--ink); padding:12px 0 12px 44px; margin:0; border-bottom:1px solid var(--hairline); }
.brief-sec .brief-list li:last-child { border-bottom:0; }
.brief-sec .brief-list li::before { top:15px; font-family:"Archivo",sans-serif; font-size:14px; font-weight:900; color:var(--ink); background:linear-gradient(transparent 55%, var(--mark, #c6ff3d) 55%); padding:0 2px; }
/* 마키 */
.v2-ticker { overflow:hidden; background:var(--ink); color:var(--paper); }
.v2-ticker-track { display:flex; width:max-content; animation:v2marquee 40s linear infinite; }
.v2-ticker span { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:700; font-size:13px; letter-spacing:.12em; text-transform:uppercase; padding:12px 28px; white-space:nowrap; }
.v2-ticker span::after { content:"✦"; margin-left:28px; color:#c6ff3d; }
@keyframes v2marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .v2-ticker-track { animation:none; } }
@media (max-width:640px) { .v2-ticker span { padding:7px 18px; font-size:12px; } .v2-ticker span::after { margin-left:18px; } }   /* 2026-10-28 모바일: 검은 띠 높이 절반 */
/* 고정 컨트롤 바 = 직무사전 필터 바 */
.controls { top:calc(54px + env(safe-area-inset-top,0px)); border-bottom:1px solid var(--hairline); box-shadow:none; }
.controls-inner { max-width:1320px; padding:10px 20px; gap:12px; overflow-x:auto; scrollbar-width:none; }
.controls-inner::-webkit-scrollbar { display:none; }
.segmented { border:0; border-radius:0; gap:4px; overflow:visible; }
.seg { border:1px solid transparent; border-radius:999px; min-height:40px; padding:9px 14px; font-family:"Archivo","Noto Sans KR",sans-serif; font-size:13px; font-weight:700; color:var(--muted); background:transparent; }
.seg:hover { color:var(--ink); border-color:var(--hairline-2); }
.seg[aria-selected="true"], .seg.on { background:var(--ink) !important; color:var(--paper) !important; border-color:var(--ink) !important; }
.datenav { gap:6px; }
.datebtn, .dateselect { border-radius:999px; border:1px solid var(--hairline-2); min-width:40px; min-height:40px; font-family:"Archivo","Noto Sans KR",sans-serif; font-size:13px; font-weight:700; padding:8px 12px; background:transparent; color:var(--ink); }
.datebtn:hover { background:var(--ink); color:var(--paper); border-color:var(--ink); }
/* 섹션: 번호 아웃라인 + 큰 제목 */
.container { max-width:1320px; padding:0 20px; }
.sector { padding-top:64px; }
.sector-head { align-items:end; border-bottom:1px solid var(--ink); padding-bottom:18px; margin-bottom:24px; }
.sector-numeral { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:clamp(36px, 4.6vw, 64px); font-weight:900; line-height:.9; letter-spacing:-.05em; color:transparent; -webkit-text-stroke:1.5px var(--ink); }
.sector-title { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:clamp(22px, 2.8vw, 36px); font-weight:900; letter-spacing:-.05em; line-height:1; }
.sector-desc { font-size:14px; color:var(--muted); }
.sector-count { font-family:"Archivo",sans-serif; font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.news-card { border:0; border-top:1px solid var(--hairline); border-radius:0; padding:18px 0; box-shadow:none; background:transparent; }
.news-card:hover { box-shadow:none; transform:none; background:transparent; }
.news-card { margin:0; }
/* 썸네일: 있으면 오른쪽 작은 그림, 없으면 글만 (회색 빈 상자 없음) */
.news-thumb { order:2; width:120px; height:84px; border:0; border-radius:10px; overflow:hidden; }
.news-thumb:has(.thumb-blank) { display:none; }
@media (max-width:520px) { .news-card { flex-direction:row; gap:14px; } .news-thumb { width:88px; height:66px; } }
.news-thumb img { transition:transform .5s cubic-bezier(.2,.7,.2,1); }
.news-card:hover .news-thumb img { transform:scale(1.04); }
.news-num { font-family:"Archivo",sans-serif; font-weight:900; color:var(--ink); }
.news-title { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; letter-spacing:-.035em; font-size:20px; line-height:1.25; }
.news-source, .news-meta { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.news-why { border-left:2px solid #c6ff3d; padding-left:12px; }
.news-why b { color:var(--ink); }
.job-tag { background:var(--ink); color:var(--paper); border-radius:999px; font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.04em; }
.tag { border-radius:999px; font-family:"Archivo","Noto Sans KR",sans-serif; }
.sec-badge { background:#c6ff3d; color:#0b0b0b; border-radius:999px; font-family:"Archivo","Noto Sans KR",sans-serif; }
/* 랭킹·키워드 */
.rank-head { border-top:1px solid var(--ink); padding-top:40px; }
.rank-title { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:clamp(28px, 4vw, 56px); font-weight:900; letter-spacing:-.05em; }
.rank-title em { background:linear-gradient(transparent 68%, var(--mark, #c6ff3d) 68%); color:inherit; font-style:normal; }
.rank-meta { font-family:"Archivo",sans-serif; }
.rail-title, .rail-head { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; letter-spacing:-.03em; }
.kw-name { font-weight:700; }
.score-fill { background:var(--ink); }
.chart-rank, .kw-rank { font-family:"Archivo",sans-serif; font-weight:900; }
/* 읽는 법 */
.howto { border-top:1px solid var(--ink); margin-top:72px; }
.howto-label { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.howto-more a { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:700; letter-spacing:.04em; text-transform:uppercase; border-bottom:2px solid var(--ink); text-decoration:none; }
/* 거대 워드마크 */
.v2-outro { max-width:1320px; margin:72px auto 0; padding:56px 20px 20px; border-top:1px solid var(--ink); }
.v2-outro .big { display:block; width:100%; height:auto; overflow:visible; }
.v2-outro .big text { font-family:"Archivo",sans-serif; font-weight:900; font-size:150px; letter-spacing:-.04em; }
.v2-outro .big .o { fill:none; stroke:var(--ink); stroke-width:2; }
.v2-outro .big .s { fill:var(--ink); }
.v2-outro .row { display:flex; flex-wrap:wrap; gap:16px 40px; align-items:center; justify-content:flex-start; margin-top:22px; }
.v2-outro p { max-width:none; font-size:15px; color:var(--ink-soft); line-height:1.7; margin:0; white-space:nowrap; }
@media (max-width:640px) { .v2-outro p { white-space:normal; } }
.v2-outro a.go { display:inline-flex; align-items:center; gap:10px; font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:700; font-size:13px; letter-spacing:.06em; text-transform:uppercase; padding:16px 26px; border-radius:999px; background:var(--ink); color:var(--paper); text-decoration:none; }
.v2-outro a.go:hover { background:#c6ff3d; color:#0b0b0b; }
.zf { margin-top:0 !important; }
/* 창이 좁아지면(1080px 이하) 원래 뉴스 CSS가 히어로를 세로로 쌓는다 → 왼쪽 정렬 + 숫자판은 연봉 연구소처럼 가로로 펼침 */
@media (max-width: 1080px) {
  .hero-inner { align-items:stretch; }
  .hero-text, .hero-stats { min-width:0; width:100%; max-width:none; flex:1 1 auto; }
  .funnel { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); column-gap:20px; }
}
/* 860px 이하: 섹션 머리(01·02·오늘의 브리핑)도 세로로 쌓이므로 왼쪽 정렬 */
@media (max-width: 860px) {
  .sector-head { align-items:flex-start; }
}
@media (max-width: 900px) {
  .hero h1 { white-space:normal; font-size:clamp(36px, 10vw, 52px); line-height:1.02; }
  .hero h1 .thin { font-size:.5em; }
  .funnel-step { padding:10px 0; }
  .funnel-num { font-size:24px; }
  .brief-sec .brief-list li { padding-left:36px; font-size:15.5px; }
  .masthead-inner { flex-wrap:wrap; gap:8px; }
  .v2-outro { padding:40px 16px 16px; }
}
/* 2026-10-28 사용자: 폰에서 머리 부분 간격 줄여 일간/주간을 위로 (위의 .hero-inner·.hero h1 보다 뒤에 있어야 이김) */
@media (max-width:560px) {
  .hero-inner { padding-top:8px; padding-bottom:24px; gap:22px; }
  .hero h1 { margin-top:6px; margin-bottom:18px; }
}
/* 2026-10-28 사용자: 'Career Briefing' 줄과 제목 사이를 다른 탭(회사 판단 등 12px)과 같게.
   숫자판은 3개라 좁은 화면에선 3칸 한 줄(이름 위·숫자 아래) */
.hero-inner { padding-top:0; }
.hero h1 { margin-top:5px; }
@media (max-width: 1080px) {
  .funnel { grid-template-columns:repeat(3, minmax(0,1fr)); }
  .funnel-step { flex-direction:column-reverse; align-items:flex-start; gap:4px; }
}
/* 폰: 기준 시각은 날짜 선택 칸에도 있으니 숨기고, 테마 버튼을 'Career Briefing' 줄 오른쪽에 붙임 */
@media (max-width:560px) {
  .masthead-inner { flex-wrap:nowrap; align-items:center; justify-content:space-between; }
  .masthead .stamp { display:none; }
  /* 360px 폰에서도 한 줄에 들어가게 테마 버튼은 글자 대신 ◐ 아이콘만 (글자는 화면 읽기용으로 남김) */
  .theme-btn { position:relative; flex:0 0 auto; width:32px; height:32px; padding:0; font-size:0; display:inline-flex; align-items:center; justify-content:center; }
  .theme-btn::after { content:""; position:absolute; left:50%; top:50%; width:44px; height:44px; transform:translate(-50%,-50%); }   /* 2026-11-11 누르는 곳만 44px (모양은 32px 그대로) */
  .theme-btn::before { content:"◐"; font-size:15px; line-height:1; }
  .hero-inner { padding-top:0; }
  .hero h1 { margin-top:5px; }
}
"""


# 2026-11-11 화면 밀림: 뉴스에도 같은 대체 글꼴(맑은 고딕을 본 글꼴 폭에 맞춘 것)을 쓴다 + 폰에서 큰 제목 줄은 줄바꿈 대신 글자를 줄인다(FIT_JS)
NEWS_MASTHEAD_CSS = ('@font-face { font-family:"JZ Fallback"; src:local("Malgun Gothic"); size-adjust:92%; }\n'
                     '@font-face { font-family:"JZ Fallback"; src:local("Malgun Gothic Bold"), local("Malgun Gothic"); font-weight:700 900; size-adjust:92%; }\n'
                     '@font-face { font-family:"JZ Fallback D"; src:local("Malgun Gothic"); size-adjust:89%; }\n'
                     '@font-face { font-family:"JZ Fallback D"; src:local("Malgun Gothic Bold"), local("Malgun Gothic"); font-weight:700 900; size-adjust:89%; }\n'
                     + NEWS_MASTHEAD_CSS.replace('"Archivo","Noto Sans KR",sans-serif', 'var(--serif)').replace('"Inter","Noto Sans KR",sans-serif', 'var(--sans)')
                     + '@media (max-width: 900px) { .hero h1 .line { white-space:nowrap; } }\n')


# 2026-10-29 모바일: 폰(640px 이하)에선 위 메뉴 대신 화면 아래 탭바 (메뉴 순서는 TABS 그대로). 아이콘은 선 하나짜리 SVG
TAB_ICON = {
    "salary/index.html": '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    "play/index.html": '<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M18 13.5h.01"/>',
    "company/index.html": '<path d="M4 21V5l8-2v18M12 9l8 2v10M2 21h20M7.5 8h1M7.5 12h1M7.5 16h1M15.5 14h1M15.5 18h1"/>',
    "index.html": '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
    "news/index.html": '<path d="M4 5h13v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3"/>',
    "zorro/index.html": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 12h.01M13 12h.01M17 12h.01"/>',
}
TAB_SHORT = {"salary/index.html": "연봉", "play/index.html": "게임", "company/index.html": "회사", "index.html": "직무", "news/index.html": "뉴스", "zorro/index.html": "상담"}


def _clean(root: str, href: str) -> str:
    """2026-11-05: 메뉴 링크를 '…/index.html' 대신 깔끔한 폴더 주소로 (공유 주소가 지저분해지지 않게). 같은 폴더면 './'"""
    return (root + href.replace("index.html", "")) or "./"


_WH = {}


def img_wh(logo: str) -> str:
    """로고 그림의 실제 크기를 width/height 속성으로 (화면 크기는 CSS 가 정하고, 이 값은 그림이 오기 전에 자리 비율을 잡는 데만 쓰인다)"""
    name = logo.rsplit("/", 1)[-1]
    if name not in _WH:
        try:
            from PIL import Image
            with Image.open(ASSETS / name) as im:
                _WH[name] = f' width="{im.width}" height="{im.height}"'
        except Exception:
            _WH[name] = ""
    return _WH[name]


def nav_html(active: str, root: str, logo: str) -> str:
    tabs = "".join(
        f'<a href="{_clean(root, href)}"{" class=\"on\"" if href == active else ""}>{label}</a>' for href, label in TABS
    )
    theme = "<script>try{var t=localStorage.getItem('cb-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>"
    return (
        theme + f'<header class="zn"><div class="zn-in"><a class="zn-logo" href="{_clean(root, "index.html")}"><img src="{logo_src(logo, root)}" alt="TEAM ZORRO"{img_wh(logo)}></a>'
        f'<nav class="zn-tabs" aria-label="사이트 탭">{tabs}</nav>'
        f'</div></header>'
        # 2026-10-28 모바일: 지금 탭이 화면 밖이면 보이게 옮기고, 메뉴가 넘치면 오른쪽 끝을 흐리게 (.more)
        "<script>(function(){var n=document.currentScript.previousElementSibling.querySelector('.zn-tabs');if(!n)return;"
        "var a=n.querySelector('a.on');if(a&&a.offsetLeft+a.offsetWidth>n.clientWidth)n.scrollLeft=a.offsetLeft-12;"
        "var f=function(){n.classList.toggle('more',n.scrollWidth-n.scrollLeft-n.clientWidth>4)};f();n.addEventListener('scroll',f,{passive:true});addEventListener('resize',f)})();</script>"
        + '<nav class="zb" aria-label="사이트 탭">' + "".join(
            f'<a href="{_clean(root, href)}"{" class=\"on\" aria-current=\"page\"" if href == active else ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{TAB_ICON[href]}</svg>'
            f'<span>{TAB_SHORT[href]}</span>{"<i class=\"dot\"></i>" if href == "play/index.html" else ""}</a>' for href, _ in TABS) + '</nav>'
        # 2026-10-28: 스크롤하면 탭바를 숨기던 기능은 뺌 (사용자: 뉴스에서 아래 바가 사라지는 버그로 보임) — 탭바는 항상 보인다
        # 2026-10-28 삼성 인터넷: 긴 페이지(뉴스)에서 브라우저 아래 도구 막대가 화면 위에 겹쳐 탭바를 가린다 →
        # 실제로 보이는 화면(visualViewport) 아래 끝에 맞춰 탭바를 그만큼 올린다 (가리는 게 없으면 0이라 다른 브라우저는 그대로)
        "<script>(function(){var b=document.currentScript.previousElementSibling,v=window.visualViewport;if(!v||!b)return;"
        "var f=function(){var g=Math.round(innerHeight-v.height-v.offsetTop);b.style.bottom=(g>0&&g<200&&Math.abs(v.scale-1)<.01?g:0)+'px'};"
        "v.addEventListener('resize',f);v.addEventListener('scroll',f);addEventListener('scroll',f,{passive:true});f()})();</script>"
    )


def footer_html(root: str, logo: str, note: str) -> str:
    """모든 페이지 공용 푸터: 큰 TEAM ZORRO 글씨·슬로건 → 로고 옆 링크 2개 → 사업자 정보 상자 → (있으면) 접힌 '자료 안내'
    2026-10-29 단순화 때 큰 글씨·상자를 뺐다가, 사용자 요청('너무 밋밋해졌다')으로 다시 넣고 모든 페이지에 똑같이 붙인다. 링크는 2개(10-31)"""
    c = COMPANY
    return (
        f'<footer class="zf"><div class="zf-in">'
        f'<div class="zf-outro"><svg class="zf-big" viewBox="0 0 1000 150" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false"><text x="0" y="128" textLength="1000" lengthAdjust="spacingAndGlyphs"><tspan class="o">TEAM</tspan><tspan class="s">ZORRO</tspan></text></svg>'
        f'<p class="zf-slogan">TEAM ZORRO는 여러분을 좀 더 나은 회사, 옳은 커리어로 인도하겠습니다.</p></div>'
        # 2026-10-31 사용자: '취업조로 홈' 링크 삭제, 로고(CI) 바로 옆에 링크 2개(무료 상담 신청·개인정보처리방침)를 한 줄로
        f'<div class="zf-row"><a class="zf-logo" href="{c["home"]}" target="_blank" rel="noopener"><img src="{logo_src(logo, root)}" alt="취업조로"{img_wh(logo)} loading="lazy"></a>'
        f'<div class="zf-links"><a href="{root}{APPLY}">무료 상담 신청</a>'
        f'<a href="{root}privacy/index.html">개인정보처리방침</a>'
        # 2026-11-11: 회사 목록 쪽이 있을 때만 (연봉 묶음이 salary/list/, 회사 판단 묶음이 company/list/ 를 만든다)
        + (f'<a href="{root}salary/list/">연봉 회사 목록</a>' if seo.HAS_LIST["salary"] else "")
        + (f'<a href="{root}company/list/">회사 판단 목록</a>' if seo.HAS_LIST["company"] else "")
        + '</div></div>'
        f'<div class="zf-box"><b>법인명(상호)</b> {c["name"]} &nbsp;·&nbsp; <b>대표자</b> {c["ceo"]} &nbsp;·&nbsp; <b>개인정보보호책임자</b> {c["privacy"]}<br>'
        f'<b>사업자등록번호</b> {c["reg"]}<br><b>주소</b> {c["addr"]}<br>© Copyright 2026 All rights reserved by CAREERPROJECT inc.</div>'
        f'{f"<details class=\"zf-note\"><summary>자료 안내</summary><p>{note}</p></details>" if note else ""}'
        f'</div></footer>'
    )


def fab_html(root: str) -> str:
    return ''   # 하단 고정 상담 버튼은 2026-10-18 사용자 요청으로 제거


DEG_LABEL = {"ms": "석사 기본", "msp": "석사 우대"}


def attach_major(data: dict) -> None:
    """jobs.json 의 major(level·fields·degree·prep)를 화면용 문구 mj 로 만든다. nonmajorOk 는 level 에서 파생(전공 무관 = True).
    level: open 전공 무관 / prep 관련 전공 우대(비전공은 준비 필요) / req 관련 전공 필수"""
    mf = data["meta"].get("majorFields", {})
    # 진단 페이지의 학과 목록 (학과 → 계열). 화면은 meta.majors 로 읽는다
    mp = BASE / "data" / "majors.json"
    data["meta"]["majors"] = json.loads(mp.read_text(encoding="utf-8"))["majors"] if mp.exists() else {}
    for j in data["jobs"]:
        m = j.get("major") or {"level": "open" if j.get("nonmajorOk") else "req", "fields": []}
        lv, fl = m["level"], m.get("fields", [])
        if lv not in ("open", "prep", "req"):
            raise SystemExit(f"[{j['id']}] major.level 은 open / prep / req 중 하나여야 합니다: {lv!r}")
        short = "·".join(mf[f]["short"] for f in fl[:2] if f in mf) + (" 등" if len(fl) > 2 else "")
        names = ", ".join(mf[f]["name"] for f in fl if f in mf)
        card = {"open": "전공 무관", "prep": f"{short} 우대" if short else "선행 공부 필요", "req": f"{short} 전공"}[lv]
        box = {"open": "무관", "prep": "우대" if short else "준비 필요", "req": "필수"}[lv]
        deg = DEG_LABEL.get(m.get("degree", ""), "")
        j["mj"] = {"lv": lv, "card": card, "box": box, "names": names, "deg": deg, "prep": m.get("prep", "")}
        j["nonmajorOk"] = lv == "open"


def _won(avg) -> str:
    """평균 연봉을 '1억 2,800만' 처럼. 단위는 만원(1,000,000 이상이면 원으로 보고 바꾼다)"""
    try:
        v = float(avg)
    except (TypeError, ValueError):
        return ""
    if v >= 1_000_000:
        v /= 10000
    v = int(round(v, -2)) if v >= 1000 else int(v)
    if v <= 0:
        return ""
    eok, man = divmod(v, 10000)
    return ((f"{eok}억 " if eok else "") + (f"{man:,}만" if man else "")).strip()


def attach_co_links(data: dict) -> int:
    """직무 → 잘 알려진 회사(연봉 페이지) 연결. 연봉 묶음이 만드는 job_links.json({직무 id: [{name, slug, avg}]})을 읽는다.
    찾는 순서: 환경 변수 JOB_LINKS → 배포 폴더 salary/data/job_links.json → salary-lab/site/data/job_links.json. 없으면 아무것도 안 한다.
    회사 쪽(salary/co/<slug>/index.html)이 실제로 없거나 다른 이름으로 옮겨진 쪽이면 뺀다 (죽은 링크 방지). 직무마다 최대 5곳."""
    seo.HAS_LIST["salary"] = (BASE / "salary" / "list" / "index.html").exists()
    seo.HAS_LIST["company"] = (BASE / "company" / "list" / "index.html").exists()
    cands = [os.environ.get("JOB_LINKS"), BASE / "salary" / "data" / "job_links.json", BASE.parent / "salary-lab" / "site" / "data" / "job_links.json"]
    src = next((Path(c) for c in cands if c and Path(c).exists()), None)
    if not src:
        return 0
    try:
        raw = json.loads(src.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return 0
    raw = raw.get("jobs", raw) if isinstance(raw, dict) else {}
    co_dir, links, n = BASE / "salary" / "co", {}, 0
    for j in data["jobs"]:
        out = []
        for c in raw.get(j["id"]) or []:
            slug = str((c or {}).get("slug") or "").strip("/")
            pg = co_dir / slug / "index.html"
            if not slug or not c.get("name") or not pg.exists():
                continue
            with open(pg, encoding="utf-8") as f:
                if 'http-equiv="refresh"' in f.read(1500):   # 옮겨진 회사의 이동용 빈 쪽
                    continue
            out.append({"n": c["name"], "u": f"salary/co/{urllib.parse.quote(slug)}/", "a": _won(c.get("avg"))})
            if len(out) == 5:
                break
        if out:
            links[j["id"]] = out
            j["coLinks"] = out   # 홈 상세 창(template.html detail)이 읽는다 — 전체 자료(data/jobs.json)에만 들어가고 첫 화면 요약에는 안 들어간다
            n += 1
    seo.CO_LINKS = links
    print(f"직무 → 회사 연결: 직무 {n}개 ({src})")
    return n


def attach_industries(data: dict) -> None:
    """v2 산업 축 (data/industries.json). 직무마다 j["ind"] = 산업 id 목록을 붙인다 (목록 필터·산업 허브용).
    근거 업종 문구(sources.industries)에 산업 키워드가 들어 있거나, 산업별 차이(byIndustry)·산업 전용(industryOnly)에 있으면 그 산업.
    상위 직무에는 j["children"] = 세부 직무 id 목록을 붙인다."""
    p = BASE / "data" / "industries.json"
    if not p.exists():
        return
    inds = json.loads(p.read_text(encoding="utf-8"))["industries"]
    data["meta"]["industries"] = [{"id": i["id"], "name": i["name"], "desc": i["desc"]} for i in inds]
    seo.IND_NAMES = {i["id"]: i["name"] for i in inds}
    for j in data["jobs"]:
        txt = " ".join((j.get("sources") or {}).get("industries", []))
        got = {i["id"] for i in inds if any(k in txt for k in i["kw"])}
        got |= {r["ind"] for r in j.get("byIndustry", [])}
        got |= {i["id"] for i in inds if j["id"] in i.get("jobs", [])}   # 근거 문구엔 안 나오지만 그 산업에도 있는 공통 직무 (2026-10-31 사용자: 호텔·여행·레저 2개뿐)
        if j.get("industryOnly"):
            got = {j["industryOnly"]}
        j["ind"] = [i["id"] for i in inds if i["id"] in got]
    kids = {}
    for j in data["jobs"]:
        if j.get("parent"):
            kids.setdefault(j["parent"], []).append(j["id"])
    for j in data["jobs"]:
        if j["id"] in kids:
            j["children"] = kids[j["id"]]


def audit_links(data: dict, share_dir: Path) -> None:
    """직무가 늘어날 때 빠지기 쉬운 연결을 빌드마다 점검해 경고로 보여 준다 (빌드는 멈추지 않음).
    - 직무 진단: major(level·fields·prep), 직군의 fit 가중치
    - 뉴스: 명시 태그 목록(NEWS_TAG_MAP) 또는 직군 newsTag
    - 면접 질문(data/interview_jobs.json) · 필수 용어 · 카톡 공유 이미지(assets/share/jobs)"""
    warn = []
    mf = set(data["meta"].get("majorFields", {}))
    for g in data["meta"]["groups"]:
        if not (g.get("fit") or {}).get("o") or not (g.get("fit") or {}).get("w"):
            warn.append(f"직군 {g['id']}: 진단 가중치(meta.groups[].fit) 없음 → 진단에서 성향 점수 0")
        if not g.get("newsTag"):
            warn.append(f"직군 {g['id']}: 기본 뉴스 태그(newsTag) 없음")
    listed = {jid for ids in NEWS_TAG_MAP.values() for jid in ids}
    iqp = BASE / "data" / "interview_jobs.json"
    iq = json.loads(iqp.read_text(encoding="utf-8")) if iqp.exists() else {}
    iq = iq.get("jobs", iq) if isinstance(iq, dict) else {}
    auto_news, many = [], []
    for j in data["jobs"]:
        jid, m = j["id"], j.get("major")
        if not m:
            warn.append(f"{jid}: major 없음 → 진단에서 전공 판정 불가 (관리자 페이지 '전공 단계')")
        else:
            bad = [f for f in m.get("fields", []) if f not in mf]
            if bad:
                warn.append(f"{jid}: 모르는 전공 계열 코드 {bad}")
            unknown = [k for k in m.get("majors", []) if k not in data["meta"].get("majors", {})]
            if unknown:
                warn.append(f"{jid}: 모르는 학과 코드 {unknown} (data/majors.json)")
            if m["level"] != "open" and m.get("fields") and not m.get("majors"):
                warn.append(f"{jid}: 관련 계열은 있는데 꼭 맞는 학과(major.majors)가 없음 → 진단에서 계열 단위로만 판정")
            if m["level"] == "req" and not m.get("fields"):
                warn.append(f"{jid}: 전공 필수인데 관련 전공 계열이 비어 있음")
            fw = j.get("fitW") or {}
            if any(k not in ("people", "number", "thing", "content") for k in fw.get("o", {})) or any(k not in ("stable", "growth", "pay", "balance") for k in fw.get("w", {})):
                warn.append(f"{jid}: fitW 키 오류 (o: people·number·thing·content, w: stable·growth·pay·balance)")
            if m["level"] == "prep" and not m.get("prep"):
                warn.append(f"{jid}: 준비 필요 직무인데 '준비할 것' 문구 없음")
        if j.get("parent") and j["parent"] not in {x["id"] for x in data["jobs"]}:
            warn.append(f"{jid}: 상위 직무 {j['parent']} 가 없음")
        ind_ids = {i["id"] for i in data["meta"].get("industries", [])}
        bad_ind = [r.get("ind") for r in j.get("byIndustry", []) if r.get("ind") not in ind_ids]
        if bad_ind:
            warn.append(f"{jid}: 모르는 산업 id {bad_ind} (data/industries.json)")
        if jid not in listed:
            auto_news.append(jid)
        if any(not isinstance(v, dict) or "quote" not in v for v in j.get("voices", [])):
            warn.append(f"{jid}: voices 형식 오류 (quote·who·source 객체여야 함)")
        if len(j.get("voices", [])) > 8:
            many.append(f"{jid} {len(j['voices'])}")
        if iq and jid not in iq:
            warn.append(f"{jid}: 면접 질문(data/interview_jobs.json) 없음")
        if not j.get("terms"):
            warn.append(f"{jid}: 필수 용어 TOP5 없음 (data/job_terms.json)")
        if not (share_dir / "jobs" / f"{jid}.png").exists():
            warn.append(f"{jid}: 카톡 공유 이미지 없음 → 한글 글꼴이 있는 PC에서 python build.py 한 번 실행")
    if many:
        print(f"참고: 현직자의 말이 8개를 넘는 직무(정리 후보): {', '.join(many)}")
    if auto_news:
        print(f"뉴스 자동 연결(직군 기본 태그): {', '.join(auto_news)} — 더 맞는 태그가 있으면 build.py NEWS_TAG_MAP 에 추가")
    print(f"직무 연결 점검: 경고 {len(warn)}건" + ("" if not warn else "\n  - " + "\n  - ".join(warn)))


def check_jobs(data: dict) -> None:
    required = ["id", "name", "en", "group", "tagline", "summary", "dayInLife", "tasks", "skills", "tools",
                "entry", "path", "salary", "transitions", "interview", "fit", "realities", "prep", "voices",
                "ai", "certs", "nonmajorOk", "sources", "draftOnly"]
    group_ids = {g["id"] for g in data["meta"]["groups"]}
    ids = set()
    for job in data["jobs"]:
        missing = [k for k in required if k not in job]
        if missing:
            raise SystemExit(f"[{job.get('id', '?')}] 누락 필드: {missing}")
        if job["id"] in ids:
            raise SystemExit(f"중복 id: {job['id']}")
        ids.add(job["id"])
        if job["group"] not in group_ids:
            raise SystemExit(f"[{job['id']}] meta.groups에 없는 직군: {job['group']}")
    for job in data["jobs"]:
        bad = [t for t in job["transitions"] if t not in ids]
        if bad:
            raise SystemExit(f"[{job['id']}] 존재하지 않는 전환 직무 id: {bad}")


def build(out_dir: Path, with_news: bool) -> None:
    data = json.loads((BASE / "data" / "jobs.json").read_text(encoding="utf-8"))
    global TICK
    TICK = ticker_items(data)   # 검은 띠 (홈·뉴스·함께하기 공용, 매 빌드 새로 계산)
    check_jobs(data)
    attach_major(data)
    global GLOSS
    GLOSS = json.loads((BASE / "data" / "glossary.json").read_text(encoding="utf-8")) if (BASE / "data" / "glossary.json").exists() else {"terms": []}
    jt = BASE / "data" / "job_terms.json"
    attach_terms(data, GLOSS, picked=json.loads(jt.read_text(encoding="utf-8")) if jt.exists() else None)
    attach_client_salary(data)   # 취업조로 이직자 연봉(직군별 집계, 5명 이상만) — salary-lab/job_link_stats.py 가 만든다
    attach_news(data)
    attach_industries(data)
    attach_co_links(data)   # 2026-11-11: 직무 → 회사 연봉 페이지 (자료가 없으면 건너뜀)
    try:   # 직무별 처음 올린 날 (구조화 데이터 datePublished)
        seo.JOB_DATES = json.loads((BASE / "data" / "job_dates.json").read_text(encoding="utf-8")).get("dates", {})
    except (OSError, ValueError):
        seo.JOB_DATES = {}
    # 2026-11-03: 원문 주소에 공백 등이 그대로 있던 것(comento) → % 인코딩 (직무 페이지·홈 상세 모두)
    for j in data["jobs"]:
        for w in j.get("webSources") or []:
            w["url"] = seo.safe_url(w["url"])
    # 2026-11-03: 연봉 막대 오른쪽 끝을 자료의 최댓값(1,000만원 단위 올림)으로 — 18,000 고정이면 20,000짜리 막대가 넘친다
    _smax = max(r[1] for j in data["jobs"] for r in (j["salary"]["junior"], j["salary"]["mid"], j["salary"]["senior"]))
    seo.SAL_MAX = max(18000, -(-int(_smax) // 1000) * 1000)
    # 로고는 data URI 로 페이지마다 박지 않고 site/assets/ 의 파일을 참조한다 (nav_html/footer_html 이 root 를 붙여 깊이별 상대경로로 만든다)
    logo = "assets/jobzorro_logo.png"            # 푸터: 취업조로
    logo_nav = "assets/teamzorro_logo_halo.png"  # 맨 위 탭바만 TEAM ZORRO CI — 흰 테두리를 그림에 넣은 판 (폰 '웹사이트 어둡게'는 그림만 안 바꿔 검은 로고가 묻힘, 2026-10-22)
    (out_dir / "assets").mkdir(parents=True, exist_ok=True)
    for name in LOGO_FILES:
        (out_dir / "assets" / name).write_bytes((ASSETS / name).read_bytes())
    n_jobs = len(data["jobs"])
    n_evidence = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    data["meta"]["evidenceTotal"] = n_evidence
    disclaimer = data["meta"]["disclaimer"]   # 2026-10-29 사용자: 직무사전 푸터 안내 문단은 뺌 (값은 jobs.json 에 그대로)

    # 1) 직무사전
    #    전체 JSON(1.1MB)은 site/data/jobs.json 으로 따로 두고 상세 패널이 첫 클릭 때 한 번 받아 간다.
    #    페이지에는 카드·필터·검색에 쓰는 슬림 버전(slim_job)만 박아 첫 로딩 HTML 을 250KB 아래로 유지한다.
    full_payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    data["meta"]["dataVersion"] = hashlib.md5(full_payload.encode("utf-8")).hexdigest()[:8]   # JS 가 ?v= 로 붙여 CDN 캐시를 무효화
    (out_dir / "data").mkdir(parents=True, exist_ok=True)
    (out_dir / "data" / "jobs.json").write_text(full_payload, encoding="utf-8")
    slim = {"meta": data["meta"], "jobs": [slim_job(j) for j in data["jobs"]]}
    payload = json.dumps(slim, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    # 2026-11-03: 홈·진단이 각자 박던 요약 자료(160KB)를 파일 하나로 (이름에 해시 → 오래 캐시) — 비교는 이 요약 + 직무별 파일
    summary_rel = "data/" + _hashed(out_dir / "data", "summary", ".json", json.dumps(slim, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    shutil.rmtree(out_dir / "data" / "job", ignore_errors=True); (out_dir / "data" / "job").mkdir(parents=True)
    for j in data["jobs"]:
        (out_dir / "data" / "job" / f"{j['id']}.json").write_text(json.dumps(j, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    preload = lambda root: f'<link rel="preload" href="{root}{summary_rel}" as="fetch" crossorigin>'
    html = (BASE / "template.html").read_text(encoding="utf-8")
    # site_cfg 는 아래(zorro 블록 앞)에서 읽지만 첫 페이지 SEO 에도 필요하므로 여기서 먼저 읽는다
    _cfg = json.loads((BASE / "data" / "site.json").read_text(encoding="utf-8"))
    _base = _cfg.get("baseUrl") or "https://jobzorro.github.io/jobzorro-site/"
    seo.VERIFY = _cfg.get("verification", {}) or {}
    _n_jobs = len(data["jobs"]); _n_ev = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    html = html.replace("/*__SEO__*/", seo.seo_head(_base, f"취업조로 직무사전 — 직무 {_n_jobs}개, 현직자 인터뷰·자료 {_n_ev:,}건으로 정리한 직무 설명",
        f"취업·이직 컨설턴트 취업조로가 현직자 인터뷰 {_n_ev:,}건을 바탕으로 정리한 직무사전. 하는 일, 하루 일과, 연봉대, 들어가는 길, 옮겨갈 수 있는 직무, 면접 질문, 현직자의 말까지 직무 {_n_jobs}개를 한 곳에서.",
        "", seo.abs_url(_base, "assets/og." + __import__("hashlib").md5((BASE / "assets" / "share" / "og.png").read_bytes()).hexdigest()[:8] + ".png") if (BASE / "assets" / "share" / "og.png").exists() else seo.abs_url(_base, "assets/og.png"), [seo.org_ld(_base, COMPANY), seo.website_ld(_base)]))
    for ph in ("/*__ALL_JOBS__*/", "/*__NAV__*/", "/*__FOOTER__*/", "/*__FAB__*/", "/*__SHARED_CSS__*/", "<!--HOME_JS-->"):
        if ph not in html:
            raise SystemExit(f"template.html 에 {ph} 가 없습니다")
    html = (html.replace("/*__SHARED_CSS__*/", SHARED_CSS)
                .replace("/*__NAV__*/", nav_html("index.html", "", logo_nav))
                .replace("/*__FOOTER__*/", footer_html("", logo, ""))
                .replace("/*__FAB__*/", fab_html(""))
                .replace("/*__ALL_JOBS__*/", all_jobs_html(data))
                # 상단 띠 숫자: 직무·인터뷰가 늘면 자동으로 바뀐다
                .replace("/*__N_DOCS__*/", f'{data["meta"].get("sourceDocs", 0):,}')
                .replace("/*__N_PUBLIC__*/", f'{sum(j["sources"].get("public", 0) for j in data["jobs"]):,}')
                .replace("/*__N_JOBS__*/", str(len(data["jobs"])))
                .replace("/*__N_GROUPS__*/", str(len(data["meta"]["groups"])))
                .replace("/*__TICKER__*/", ticker_spans(TICK["home"]))
)
    # 2026-10-31 사용자: 검색 엔진·JS 꺼진 화면에도 '직무 0 · 자료 0건' 대신 실제 숫자가 보이게 빌드 때 미리 채운다 (JS 가 다시 덮어써도 같은 값)
    for id_, v_ in (("mJobs", _n_jobs), ("mSrc", f"{_n_ev:,}"), ("ledeSources", f"{_n_ev:,}"), ("factJobs", _n_jobs),
                    ("factGroups", len(data["meta"]["groups"])), ("factSources", f"{_n_ev:,}")):
        html = re.sub(rf'(id="{id_}">)0(<)', lambda mm: mm.group(1) + str(v_) + mm.group(2), html)
    # 2026-11-03: 홈 스크립트(약 60KB)를 assets/home.<해시>.js 로 떼고, 요약 자료는 받아서 jzHome(DATA) 로 시작
    _m = re.search(r"<!--HOME_JS--><script>\n(.*?)</script><!--/HOME_JS-->", html, re.S)
    if not _m:
        raise SystemExit("template.html 의 <!--HOME_JS--> 블록을 찾지 못했습니다")
    home_js = _hashed(out_dir / "assets", "home", ".js", (_m.group(1) + HOME_LOADER).encode("utf-8"))
    html = html[:_m.start()] + f'<script src="assets/{home_js}" data-sum="{summary_rel}" defer></script>' + html[_m.end():]
    html = html.replace("</head>", preload("") + "\n</head>", 1)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(html, encoding="utf-8")
    print(f"직무사전: 직무 {n_jobs}개 · 직군 {len(data['meta']['groups'])}개 · 근거 {n_evidence}건 -> {out_dir / 'index.html'} "
          f"({(out_dir / 'index.html').stat().st_size:,} bytes, 요약 JSON {summary_rel} {len(payload.encode('utf-8')):,} · 스크립트 assets/{home_js}) · 전체 데이터 -> data/jobs.json ({len(full_payload.encode('utf-8')):,} bytes) + data/job/<id>.json")

    # 2) 취업조로와 함께하기
    site_cfg = json.loads((BASE / "data" / "site.json").read_text(encoding="utf-8"))
    base_url = site_cfg.get("baseUrl") or "https://jobzorro.github.io/jobzorro-site/"
    updated = data["meta"].get("updated", "2026-10-16")
    # 2026-10-28 사용자: sitemap 수정 날짜가 거의 전부 직무사전 자료 날짜(10-19)로 멈춰 있던 것 → 매일 바뀌는 곳은 빌드한 날(한국 시간),
    #   연봉 연구소는 연봉 자료를 만든 날(meta.ver), 직무사전·면접·비교·진단은 직무 자료 날짜 그대로
    today = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).date().isoformat()
    try:
        _v = str(json.loads((BASE / "salary" / "data" / "meta.json").read_text(encoding="utf-8")).get("ver") or "")
        sal_updated = f"{_v[:4]}-{_v[4:6]}-{_v[6:8]}" if len(_v) >= 8 else updated
    except (OSError, ValueError):
        sal_updated = updated
    by_id = {j["id"]: j for j in data["jobs"]}
    gname = {g["id"]: g["name"] for g in data["meta"]["groups"]}
    # 공유 이미지: 글꼴이 있는 PC 에서 assets/share/ 에 만들어 git 에 넣고, 빌드 때 site/assets/ 로 복사 (Actions 엔 한글 글꼴이 없다)
    share = BASE / "assets" / "share"; share.mkdir(exist_ok=True)
    (out_dir / "assets").mkdir(exist_ok=True)
    if seo.fonts_available():
        seo.og_image(share / "og.png", "그 직무의 진짜 모습", f"현직자 인터뷰·자료 {data['meta'].get('sourceDocs', 0) + sum(j['sources'].get('public', 0) for j in data['jobs']):,}건으로 정리한 직무 {len(data['jobs'])}개 · 취업뉴스 · 무료 상담", "취업조로 직무사전", "채용공고엔 안 나오는")
        # 2026-10-27 사용자: 카톡 미리보기를 섹션마다 다른 그림·이야기로 (오른쪽 그림 art)
        n_sal = _salary_count()
        seo.og_image(share / "og-news.png", "취업조로의\n커리어브리핑", "채용·이직·기업·고용 뉴스를 매일 아침 고르고\nZorro의 한마디를 붙입니다", "취업뉴스", "매일 아침 고른", art="news")
        seo.og_image(share / "og-zorro.png", "취업조로와\n함께하기", "신입·중고신입·경력이직·선퇴사자\n1:1 맞춤 컨설팅 · 무료 상담", "TEAM ZORRO", "뽑고 싶은 인재의 비밀", art="zorro")
        seo.og_image(share / "og-salary.png", "내 연차면\n얼마 받을까", f"회사 {n_sal} 곳의 사원~부장 추정 연봉\n업계 순위 · 연봉 계산기", "연봉 연구소", "그 회사,", art="salary")
        seo.og_image(share / "og-company.png", "이직할까 말까\n내 상황으로", "연차·연봉을 넣으면 평점·연봉·재무를 보고\n갈지 말지 Zorro가 정해 드려요", "회사 판단 연구소", "합격한 그 회사, 나라면?", art="company")
        seo.og_image(share / "og-play.png", "오늘의 도전\n연봉 놀이터", "연봉 줄서기 · 스무고개 퀴즈 · 연봉 스나이퍼\n매일 순위와 명예의 전당", "연봉 놀이터", "회사 연봉으로 하는 게임", art="play")
        # 2026-10-28 사용자: 비교·진단·면접·개인정보도 전용 그림 (전엔 직무사전 기본 그림 공유)
        seo.og_image(share / "og-compare.png", "두 직무를\n나란히 비교", "연봉대·필요 역량·들어가는 길·커리어 패스를\n한 화면에서", "직무 비교", "고민되는 두 직무,", art="compare")
        seo.og_image(share / "og-fit.png", "1분 직무 진단", f"학력·전공·성향으로 직무 {len(data['jobs'])}개 중\n지금 갈 수 있는 직무 3개", "직무 진단", "내 전공으로 갈 수 있는", art="fit")
        seo.og_image(share / "og-interview.png", "면접 질문\n모음", f"공통 빈출 TOP 20 + 직무 {len(data['jobs'])}개 단골 질문\n면접관이 확인하려는 의도까지", "면접 질문", "이 질문, 꼭 나와요", art="interview")
        seo.og_image(share / "og-privacy.png", "개인정보\n처리방침", "수집 항목 · 목적 · 보유 기간 · 위탁\n커리어프로젝트 주식회사(취업조로)", "취업조로", "투명하게 알려 드려요", art="privacy")
        seo.og_image(share / "og-apply.png", "무료 상담 신청", "취업조로 컨설턴트가 내 상황에 맞는 길을 1:1로 정리해 드립니다", "무료 상담", "취업·이직 고민, 혼자 하지 마세요")
    else:
        print("  (한글 글꼴이 없어 공유 이미지는 다시 만들지 않고 assets/share 의 기존 파일을 씁니다)")
    import shutil as _sh, hashlib as _hl
    og_made = set()   # 이번 빌드에서 쓴 공유 이미지 (나머지 옛 해시 파일은 빌드 끝에 지운다)
    def share_url(rel: str) -> str:
        """assets/share/<rel> 을 site/assets/ 로 복사하되 파일명에 내용 해시를 붙인다 (카카오 등이 옛 이미지를 캐시하지 않도록)."""
        src = share / rel
        if not src.exists():
            return seo.abs_url(base_url, "assets/og.png")
        h = _hl.md5(src.read_bytes()).hexdigest()[:8]
        stem, ext = src.stem, src.suffix
        dst_rel = f"assets/og/{stem}.{h}{ext}" if rel.startswith("jobs/") else f"assets/{stem}.{h}{ext}"
        dst = out_dir / dst_rel; dst.parent.mkdir(parents=True, exist_ok=True)
        _sh.copy(src, dst); og_made.add(dst_rel)
        if rel == "og.png":   # 구조화 데이터의 로고(assets/og.png)가 계속 가리킬 수 있게 원래 이름으로도 둔다
            _sh.copy(src, out_dir / "assets" / "og.png")
        return seo.abs_url(base_url, dst_rel)
    og_main = share_url("og.png")
    og_news, og_zorro, og_apply = share_url("og-news.png"), share_url("og-zorro.png"), share_url("og-apply.png")
    og_salary, og_company, og_play = share_url("og-salary.png"), share_url("og-company.png"), share_url("og-play.png")
    og_page = {k: share_url(f"og-{k}.png") for k in ("compare", "fit", "interview", "privacy")}
    for name in ("favicon-32.png", "favicon-180.png"):
        src = BASE / "news-collector" / "assets" / name
        if src.exists(): (out_dir / "assets" / name).write_bytes(src.read_bytes())
    z = (BASE / "template_zorro.html").read_text(encoding="utf-8")
    z = z.replace("/*__TICKER__*/", ticker_spans(TICK["zorro"]))
    z = z.replace("/*__SEO__*/", seo.seo_head(base_url, "취업조로와 함께하기 — 신입·중고신입·경력이직·선퇴사자 취업 컨설팅",
        "누가 봐도 뽑고 싶은 인재의 비밀, 취업조로. 컨설팅 15년 차·합격자 1,100명 이상. 신입·중고신입·경력 이직·선퇴사자 맞춤 컨설팅과 무료 상담 신청 방법.",
        "zorro/", og_zorro, [seo.person_ld(base_url), seo.org_ld(base_url, COMPANY), seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업조로와 함께하기", "zorro/")])]))
    avatar = ASSETS / "profile.jpg"
    if not avatar.exists() and (ASSETS / "profile_web.jpg").exists():
        avatar = ASSETS / "profile_web.jpg"  # 원본(5MB)은 저장소에 안 올리고 줄인 파일만 올린다
    if avatar.exists():
        # 원본은 수 MB 세로 사진이라 웹용(정사각 640px)으로 줄여 박는다. EXIF 회전도 반영.
        from io import BytesIO
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(avatar)).convert("RGB")
        im = ImageOps.fit(im, (640, 640), centering=(0.5, 0.3))  # 얼굴이 위쪽에 있는 세로 사진 기준
        buf = BytesIO(); im.save(buf, "JPEG", quality=84, optimize=True)
        # 2026-11-03: base64 로 박지 않고 파일로 (assets/zorro/profile.<해시>.jpg)
        _av = _hashed(out_dir / "assets" / "zorro", "profile", ".jpg", buf.getvalue())
        avatar_html = f'<img src="../assets/zorro/{_av}" alt="취업조로 조현빈" width="640" height="640" loading="lazy" decoding="async">'
        if not (ASSETS / "profile_web.jpg").exists() or (ASSETS / "profile_web.jpg").read_bytes() != buf.getvalue():
            (ASSETS / "profile_web.jpg").write_bytes(buf.getvalue())
    else:
        avatar_html = '<div class="ph"><b>😎</b>프로필 사진 자리<br>(assets/profile.jpg 를 넣으면 표시됩니다)</div>'
    z = (z.replace("/*__SHARED_CSS__*/", SHARED_CSS)
          .replace("/*__NAV__*/", nav_html("zorro/index.html", "../", logo_nav))
          .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
          .replace("/*__FAB__*/", fab_html("../"))
          .replace("/*__APPLY__*/", "../" + APPLY)
          .replace("/*__KAKAO_OPEN__*/", site_cfg.get("kakaoOpen", "https://open.kakao.com/me/zorro"))
          .replace("/*__EVIDENCE__*/", f"{n_evidence:,}")
          .replace("/*__JOBS__*/", str(n_jobs))
          .replace("/*__AVATAR__*/", avatar_html))
    # 2026-11-03: 상황별 그림 4장도 base64(약 210KB) 대신 webp 파일 + loading="lazy"
    from io import BytesIO as _BIO
    from PIL import Image as _Img
    for key in ("new", "old", "change", "quit"):
        _im = _Img.open(ASSETS / f"ill_{key}.png"); _b = _BIO(); _im.save(_b, "WEBP", quality=82, method=6)
        _fn = _hashed(out_dir / "assets" / "zorro", f"ill_{key}", ".webp", _b.getvalue())
        z = (z.replace(f"/*__ILL_{key.upper()}__*/", f"../assets/zorro/{_fn}")
              .replace(f"/*__ILL_{key.upper()}_WH__*/", f' width="{_im.width}" height="{_im.height}"'))
    (out_dir / "zorro").mkdir(exist_ok=True)
    (out_dir / "zorro" / "index.html").write_text(z, encoding="utf-8")
    print(f"취업조로와 함께하기 -> {out_dir / 'zorro' / 'index.html'}")

    # 2-1) 무료 상담 신청 폼: data/site.json 의 formEndpoint(Apps Script 웹앱)로 전송
    cfg_public = {"formEndpoint": site_cfg.get("formEndpoint", ""), "kakaoOpen": site_cfg.get("kakaoOpen", "https://open.kakao.com/me/zorro")}
    job_names = {j["id"]: j["name"] for j in data["jobs"]}
    a = (BASE / "template_apply.html").read_text(encoding="utf-8")
    a = a.replace("/*__SEO__*/", seo.seo_head(base_url, "무료 상담 신청 — 취업조로", "취업·이직 고민, 취업조로 컨설턴트와 무료로 먼저 이야기해 보세요. 신입·중고신입·경력 이직·선퇴사자 모두 가능.", "apply/", og_apply, [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("무료 상담 신청", "apply/")])]))
    a = (a.replace("/*__SHARED_CSS__*/", SHARED_CSS)
          .replace("/*__NAV__*/", nav_html(APPLY, "../", logo_nav))
          .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
          .replace("/*__KAKAO_OPEN__*/", cfg_public["kakaoOpen"])
          .replace("/*__CONFIG__*/", json.dumps(cfg_public, ensure_ascii=False).replace("</", "<\\/"))
          .replace("/*__JOB_NAMES__*/", json.dumps(job_names, ensure_ascii=False).replace("</", "<\\/")))
    (out_dir / "apply").mkdir(exist_ok=True)
    (out_dir / "apply" / "index.html").write_text(a, encoding="utf-8")
    # 개인정보처리방침
    pv = (BASE / "template_privacy.html").read_text(encoding="utf-8")
    pv = pv.replace("/*__SEO__*/", seo.seo_head(base_url, "개인정보처리방침 — 취업조로 · 커리어프로젝트 주식회사", "커리어프로젝트 주식회사(취업조로)의 개인정보처리방침. 상담 신청 시 수집 항목, 목적, 보유 기간, 위탁, 정보주체의 권리.", "privacy/", og_page["privacy"], [], noindex=True))
    pv = (pv.replace("/*__SHARED_CSS__*/", SHARED_CSS)
            .replace("/*__NAV__*/", nav_html("privacy/index.html", "../", logo_nav))
            .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
            .replace("/*__FAB__*/", fab_html("../"))
            .replace("/*__KAKAO_OPEN__*/", cfg_public["kakaoOpen"])
            .replace("/*__ADDR__*/", COMPANY["addr"]))
    (out_dir / "privacy").mkdir(exist_ok=True)
    (out_dir / "privacy" / "index.html").write_text(pv, encoding="utf-8")
    print(f"개인정보처리방침 -> {out_dir / 'privacy' / 'index.html'}")
    # 404 (2026-11-04): GitHub Pages 기본 영어 404 대신. 어느 깊이 주소에서든 열리므로 링크는 모두 사이트 루트 기준(/)
    nf = (BASE / "template_404.html").read_text(encoding="utf-8")
    nf = (nf.replace("/*__SHARED_CSS__*/", SHARED_CSS)
            .replace("/*__NAV__*/", nav_html("", "/", logo_nav))
            .replace("/*__FOOTER__*/", footer_html("/", logo, ""))
            .replace("/*__FAB__*/", fab_html("/")))
    (out_dir / "404.html").write_text(nf, encoding="utf-8")

    # 직무 비교 / 직무 진단
    for tpl_name, sub, title, desc in (
        ("template_compare.html", "compare", "직무 비교 — 두 직무를 나란히 | 취업조로 직무사전", f"고민되는 두 직무를 골라 연봉대·전공·필요 역량·들어가는 길·커리어 패스·AI 영향을 한 화면에 나란히 비교합니다. 현직자 인터뷰로 정리한 직무 {len(data['jobs'])}개 중에서 고를 수 있어요."),
        ("template_fit.html", "fit", "1분 직무 진단 — 내 전공·학력으로 갈 수 있는 직무 | 취업조로 직무사전", f"학력·전공 학과(복수전공·부전공)·성향·원하는 것으로 직무 {len(data['jobs'])}개 중 바로 지원할 직무와 준비하면 열리는 직무를 골라 드립니다."),
    ):
        tp = BASE / tpl_name
        if not tp.exists():
            continue
        pg = (tp.read_text(encoding="utf-8")
                .replace("/*__SEO__*/", seo.seo_head(base_url, title, desc, f"{sub}/", og_page.get(sub, og_main), [seo.breadcrumb_ld(base_url, [("직무사전", ""), (title.split(" — ")[0], f"{sub}/")])]))
                .replace("/*__SHARED_CSS__*/", SHARED_CSS)
                .replace("/*__NAV__*/", nav_html("index.html", "../", logo_nav))
                .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
                .replace("/*__FAB__*/", fab_html("../"))
                .replace("/*__JOBS_JSON__*/", payload)
                .replace("/*__SUMMARY_URL__*/", "../" + summary_rel)
                .replace("/*__SAL_MAX__*/18000", str(seo.SAL_MAX))
                .replace("</head>", preload("../") + "\n</head>", 1))
        (out_dir / sub).mkdir(exist_ok=True)
        (out_dir / sub / "index.html").write_text(pg, encoding="utf-8")
        print(f"{sub}/ -> {out_dir / sub / 'index.html'}")

    # ---- 직무별 정적 페이지 (SEO·GEO) ----
    tpl = (BASE / "template.html").read_text(encoding="utf-8")
    css = tpl[tpl.index("<style>") + 7:tpl.index("</style>")].replace("/*__SHARED_CSS__*/", SHARED_CSS) + seo.JOB_PAGE_CSS
    fonts = tpl[tpl.index('<link rel="preconnect"'):tpl.index("<style>")]
    # 2026-11-03: 직무 133쪽·산업 19쪽·면접 쪽마다 박던 같은 CSS(약 62KB)를 assets/site.<해시>.css 하나로
    site_css = _hashed(out_dir / "assets", "site", ".css", css.encode("utf-8"))
    css_link = lambda root: f'<link rel="stylesheet" href="{root}assets/{site_css}">'
    entries = [("", today, "daily", "1.0"), ("news/", today, "daily", "0.9"), ("zorro/", updated, "monthly", "0.8"), ("apply/", updated, "monthly", "0.6"), ("compare/", updated, "monthly", "0.6"), ("fit/", updated, "monthly", "0.7")]
    for j in data["jobs"]:
        jid = j["id"]
        if seo.fonts_available():
            _ac, _bg = GROUP_COLORS.get(j["group"], ((198, 255, 61), (11, 11, 11)))
            seo.og_image(share / "jobs" / f"{jid}.png", j["name"], j["tagline"], f"취업조로 직무사전 · {gname.get(j['group'], '')}", "채용공고엔 안 나오는 진짜 모습", accent=_ac, bg=_bg)
        og_job = share_url(f"jobs/{jid}.png")
        ld = seo.job_ld(base_url, j, by_id, data["meta"], gname.get(j["group"], ""), updated, og_job)
        head = seo.seo_head(base_url, f"{j['name']} 직무 — 하는 일·연봉·들어가는 길·현직자의 말 | 취업조로 직무사전",
                            f"{j['name']}: {j['tagline']}. {j['summary']}", f"jobs/{jid}/", og_job, ld)
        body = seo.render_job_body(j, by_id, gname.get(j["group"], ""), updated, base_url)
        page = ("<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n"
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
                + head + "\n" + fonts + css_link("../../") + "\n</head>\n<body>\n"
                + nav_html("index.html", "../../", logo_nav)
                + "<main class=\"jobpage\"><div class=\"d-body\">" + body + "</div></main>\n"
                + footer_html("../../", logo, "") + fab_html("../../")
                + "\n</body>\n</html>\n")
        d = out_dir / "jobs" / jid
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page, encoding="utf-8")
        entries.append((f"jobs/{jid}/", updated, "weekly", "0.8"))
    # 2026-11-03: /jobs/ 주소가 404 였던 것 → 홈으로 보내는 빈 쪽 (검색 제외, 대표 주소는 홈)
    (out_dir / "jobs" / "index.html").write_text(
        f'<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow">'
        f'<link rel="canonical" href="{seo.abs_url(base_url, "")}"><meta http-equiv="refresh" content="0;url=../">'
        f'<title>직무사전으로 이동</title></head><body><p><a href="../">직무사전 전체 보기</a></p></body></html>\n', encoding="utf-8")
    # sitemap.xml 은 뉴스 블록이 날짜별 지면 URL 을 entries 에 더한 뒤, 맨 끝에서 쓴다
    ic = json.loads((BASE / "data" / "interview_common.json").read_text(encoding="utf-8"))
    iqp = BASE / "data" / "interview_jobs.json"
    iqj = json.loads(iqp.read_text(encoding="utf-8")) if iqp.exists() else {}
    ix = seo.seo_head(base_url, f"면접 질문 모음 — 공통 빈출 TOP 20 + {len(data['jobs'])}개 직무 단골 질문 | 취업조로 직무사전",
                      "자기소개·지원동기부터 직무별 단골 질문까지. 질문마다 면접관이 확인하려는 의도를 함께 정리했습니다. 직무를 고르면 그 직무 질문으로 바로 이동합니다.",
                      "interview/", og_page["interview"], [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("면접 질문", "interview/")]),
                      {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": t["q"], "acceptedAnswer": {"@type": "Answer", "text": "면접관이 확인하려는 것: " + ", ".join(t["i"])}} for t in ic["top"]]}])
    (out_dir / "interview").mkdir(exist_ok=True)
    import shutil as _sh2
    for d in (out_dir / "interview").iterdir():
        if d.is_dir(): _sh2.rmtree(d)
    (out_dir / "interview" / "index.html").write_text(
        "<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        + ix + "\n" + fonts + css_link("../") + "<style>" + seo.INTERVIEW_ALL_CSS + "</style>\n</head>\n<body>\n" + nav_html("index.html", "../", logo_nav)
        + "<main class=\"iqpage jobpage\">" + seo.render_interview_all(ic, iqj, data["jobs"], data["meta"]["groups"]) + "</main>\n"
        + footer_html("../", logo, "") + seo.INTERVIEW_ALL_JS + "\n</body>\n</html>\n", encoding="utf-8")
    print(f"면접 질문 페이지: 공통 {len(ic['top'])}개 + 직무 {len(iqj)}개 -> {out_dir / 'interview' / 'index.html'}")
    entries.append(("interview/", updated, "weekly", "0.8"))
    # 산업 허브 (v2 2단계): /industry/ 목록 + /industry/<id>/ 산업별 직무 지도
    inds = data["meta"].get("industries", [])
    if inds:
        def ind_page(root, path, title, desc, crumbs, body):
            head = seo.seo_head(base_url, title, desc, path, og_main, [seo.breadcrumb_ld(base_url, crumbs)])
            return ("<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
                    + head + "\n" + fonts + css_link(root) + "\n</head>\n<body>\n" + nav_html("index.html", root, logo_nav)
                    + "<main class=\"jobpage\"><div class=\"d-body\">" + body + "</div></main>\n" + footer_html(root, logo, "") + fab_html(root) + "\n</body>\n</html>\n")
        (out_dir / "industry").mkdir(exist_ok=True)
        (out_dir / "industry" / "index.html").write_text(ind_page("../", "industry/", f"산업별 직무 지도 — 산업 {len(inds)}개, 어떤 직무가 있고 무엇이 다른가 | 취업조로 직무사전",
            "반도체·금융·부동산·식품 등 산업마다 어떤 직무가 있고, 같은 직무가 산업에 따라 어떻게 다른지 현직자 인터뷰로 정리했습니다.",
            [("직무사전", ""), ("산업별 직무", "industry/")], seo.render_industry_index(inds, data["jobs"])), encoding="utf-8")
        entries.append(("industry/", updated, "weekly", "0.7"))
        for i in inds:
            d = out_dir / "industry" / i["id"]
            d.mkdir(parents=True, exist_ok=True)
            n = sum(1 for j in data["jobs"] if i["id"] in j.get("ind", []))
            d.joinpath("index.html").write_text(ind_page("../../", f"industry/{i['id']}/", f"{i['name']} 산업 직무 {n}개 — 하는 일·전용 직무·산업별 차이 | 취업조로 직무사전",
                f"{i['name']}({i['desc']}) 산업에서 뽑는 직무 {n}개. 이 산업에만 있는 직무와, 같은 직무가 이 산업에서 어떻게 다른지 현직자 인터뷰로 정리했습니다.",
                [("직무사전", ""), ("산업별 직무", "industry/"), (i["name"], f"industry/{i['id']}/")],
                seo.render_industry_page(i, data["jobs"], gname, data["meta"]["groups"])), encoding="utf-8")
            entries.append((f"industry/{i['id']}/", updated, "weekly", "0.7"))
        print(f"산업 허브: {len(inds)}개 -> {out_dir / 'industry'}")
    # 관리 화면은 이메일 로그인 어드민으로 옮김 (2026-10-21). 원본 template_admin.html 은
    # company-check/admin/build_jobs_page.py 가 읽어 어드민 안 /jobs 로 만든다. 여기엔 옮긴 곳 안내만.
    (out_dir / "admin").mkdir(exist_ok=True)
    (out_dir / "admin" / "index.html").write_text(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">'
        '<meta http-equiv="refresh" content="0;url=https://company-admin.jobzorro.workers.dev/jobs"><title>관리 화면</title></head>'
        '<body><p>관리 화면이 옮겨졌어요. <a href="https://company-admin.jobzorro.workers.dev/jobs">여기로 이동</a></p></body></html>\n',
        encoding="utf-8")
    seo.write_robots(out_dir, base_url)
    seo.write_llms(out_dir, base_url, data["jobs"], data["meta"]["groups"], updated, data["meta"].get("sourceDocs", 0),
                   inds=data["meta"].get("industries", []), stamp=today)
    print(f"직무 페이지 {len(data['jobs'])}개 + robots.txt · llms.txt -> {out_dir / 'jobs'}")
    print(f"무료 상담 신청 폼 -> {out_dir / 'apply' / 'index.html'} (전송: {cfg_public['formEndpoint'] or '미연결'})")

    # 3) 취업뉴스: 뉴스 수집기 결과물에 공용 탭·글꼴만 끼워 넣는다 (뉴스 페이지 자체 스타일은 건드리지 않음)
    if with_news:
        news_src = NEWS_SRC
        if NEWS_URL:
            news_src = fetch_news(BASE / "site" / "_news_tmp")
        elif not NEWS_SRC.exists():
            raise SystemExit(f"뉴스 결과물이 없습니다: {NEWS_SRC} (news-collector/build_site.py 를 먼저 실행하거나 NEWS_URL 설정, 또는 --no-news)")
        n = news_src.read_text(encoding="utf-8")
        nav_css = "<style>" + "".join(
            line + "\n" for line in SHARED_CSS.splitlines() if line.startswith((".zn", ".zf", "@media (max-width:640px) { .zn", "@media (max-width:480px) { .zn"))) + TABBAR_CSS + (
            "@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }\n"
        ) + NEWS_MASTHEAD_CSS + "</style>"
        # 공용 푸터·하단 버튼이 쓰는 토큰 중 뉴스 페이지에 없는 것들을 뉴스 토큰에 연결
        nav_css = nav_css.replace("</style>", ":root { --font: var(--sans); --fill: var(--ink); --fillfg: var(--paper); --ink-soft: var(--ink-soft); }\n"
                                  "body { padding-bottom: max(24px, calc(var(--tabbar-h, 0px) + env(safe-area-inset-bottom, 0px))); }\n</style>")
        inject = nav_css + nav_html("news/index.html", "../", logo_nav)
        n = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + inject, n, count=1)
        n = n.replace('<div class="controls">', '<div class="v2-ticker" aria-hidden="true"><div class="v2-ticker-track">' + ticker_spans(TICK["news"]) + '</div></div><div class="controls">', 1)   # 히어로 → 검은 띠 → 탭 (연봉 연구소와 같은 순서)
        foot = FIT_JS + footer_html("../", logo, "뉴스 원문의 저작권은 각 언론사에 있으며, 이 페이지는 제목·요약과 원문 링크만 싣습니다.") + fab_html("../")
        n = n.replace("</body>", foot + NEWS_FOLD + "</body>", 1)
        news_ld = [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/")]),
                   {"@context": "https://schema.org", "@type": "WebPage", "@id": seo.abs_url(base_url, "news/"), "name": "취업조로의 커리어브리핑", "inLanguage": "ko",
                    "description": "취업조로가 매일 아침 고르는 채용·이직·기업·고용 뉴스와 한마디", "isPartOf": {"@id": seo.abs_url(base_url, "#website")}, "author": {"@id": seo.abs_url(base_url, "zorro/#person")}}]
        n = re.sub(r'<meta property="og:image" content="assets/favicon-180.png">', '', n, count=1)
        # 카톡 미리보기 설명 (2026-10-27 사용자: 섹션마다 각자의 이야기)
        news_desc = "채용·이직·기업·고용 뉴스 중 내 커리어에 영향을 주는 것만 매일 아침 골라, 취업조로의 한마디와 함께 정리해 드려요. 주간·월간 랭킹도 한눈에."
        n = re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*(")', lambda m: m.group(1) + news_desc + m.group(2), n)
        # 2026-11-05: 메뉴 이름(취업뉴스)과 페이지 제목을 맞춘다
        n = re.sub(r"<title>[^<]*</title>", "<title>취업뉴스 · 취업조로의 커리어브리핑</title>", n, count=1)
        n = re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*(")', lambda m: m.group(1) + "취업뉴스 · 취업조로의 커리어브리핑" + m.group(2), n)
        if "family=Archivo" not in n:   # 비상용(NEWS_URL) 옛 페이지에만 Archivo 를 더한다 (2026-11-03: 뉴스 글꼴 요청은 news-collector 한 줄로)
            n = n.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&display=swap"></head>', 1)
        n = n.replace("</head>", f'<link rel="canonical" href="{seo.abs_url(base_url, "news/")}"><meta property="og:url" content="{seo.abs_url(base_url, "news/")}"><meta property="og:type" content="website"><meta property="og:site_name" content="취업조로"><meta property="og:locale" content="ko_KR"><meta property="og:image" content="{og_news}"><meta name="twitter:image" content="{og_news}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="author" content="조현빈 (취업조로)">' + seo.verify_tags()
                      + "".join(seo.jsonld(o) for o in news_ld) + "</head>", 1)
        (out_dir / "news").mkdir(exist_ok=True)
        (out_dir / "news" / "index.html").write_text(n, encoding="utf-8")
        # (shutil 은 맨 위에서 import — 여기서 다시 import 하면 --no-news 빌드가 깨짐) 뉴스 페이지가 참조하는 로고·파비콘·기사 썸네일(assets/thumbs)도 함께 복사
        src_assets = news_src.parent / "assets"
        if src_assets.exists():
            # 썸네일은 날마다 바뀌므로 지난 파일이 쌓이지 않게 비우고 다시 복사한다
            shutil.rmtree(out_dir / "news" / "assets" / "thumbs", ignore_errors=True)
            shutil.copytree(src_assets, out_dir / "news" / "assets", dirs_exist_ok=True)
        print(f"취업뉴스: {NEWS_URL or NEWS_SRC} ({(out_dir / 'news' / 'index.html').stat().st_size:,} bytes) + 탭 -> {out_dir / 'news' / 'index.html'}")

        # 3-1) 날짜별 정적 지면 + 지난 지면 목록: build_site.py 가 만든 site/<날짜>/index.html, site/archive/index.html 에
        #      같은 탭바·푸터·버튼과 SEO head 를 끼워 site/news/<날짜>/, site/news/archive/ 로 내보낸다.
        #      (NEWS_URL 비상 모드는 index.html 만 내려받으므로 days.json 이 없고, 이 블록은 건너뛴다)
        news_note = "뉴스 원문의 저작권은 각 언론사에 있으며, 이 페이지는 제목·요약과 원문 링크만 싣습니다."

        def wrap_news_page(src: Path, rel: str, title: str, lastmod: str, ld: list, changefreq: str, priority: str, noindex: bool = False) -> bool:
            """news/<rel>index.html 로 쓴다. 페이지 자체 <title>/description 은 떼고 seo_head 것으로 바꾼다. 성공하면 sitemap entries 에 더한다."""
            if not src.exists():
                return False
            page = src.read_text(encoding="utf-8")
            m = re.search(r'<meta name="description" content="([^"]*)">', page)
            desc = html_unescape(m.group(1)) if m else title
            page = re.sub(r"<title>.*?</title>\s*", "", page, count=1, flags=re.S)
            page = re.sub(r'<meta name="description" content="[^"]*">\s*', "", page, count=1)
            page = re.sub(r'<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*', "", page)   # seo_head 가 절대 경로로 다시 넣는다
            page = re.sub(r'<meta name="robots"[^>]*>\s*', "", page)
            page = page.replace("</head>", seo.seo_head(base_url, title, desc, f"news/{rel}", og_news, ld, noindex=noindex) + seo.verify_tags() + "\n</head>", 1)
            page = re.sub(r"(<body[^>]*>)", lambda mm: mm.group(1) + nav_css + nav_html("news/index.html", "../../", logo_nav), page, count=1)
            page = page.replace("</body>", footer_html("../../", logo, news_note) + fab_html("../../") + "</body>", 1)
            dst = out_dir / "news" / rel / "index.html"
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(page, encoding="utf-8")
            if not noindex:
                entries.append((f"news/{rel}", lastmod, changefreq, priority))
            return True

        days_file = news_src.parent / "days.json"
        news_days = []
        if days_file.exists():
            try:
                news_days = [d for d in json.loads(days_file.read_text(encoding="utf-8")) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(d))]
            except (json.JSONDecodeError, OSError):
                news_days = []
        try:   # 앞 지면을 되풀이한 날 (news-collector/build_site.py repeat_days) → noindex · sitemap 제외
            rep_days = set(json.loads((news_src.parent / "repeat_days.json").read_text(encoding="utf-8")))
        except (OSError, ValueError):
            rep_days = set()
        n_day_pages = 0
        for d in news_days:
            y, mo, dd = (int(x) for x in d.split("-"))
            kdate = f"{y}년 {mo}월 {dd}일"
            ld = [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/"), (f"{kdate} 지면", f"news/{d}/")]),
                  {"@context": "https://schema.org", "@type": "WebPage", "@id": seo.abs_url(base_url, f"news/{d}/"), "name": f"{kdate} 커리어브리핑",
                   "inLanguage": "ko", "datePublished": d, "isPartOf": {"@id": seo.abs_url(base_url, "#website")}, "author": {"@id": seo.abs_url(base_url, "zorro/#person")}}]
            if wrap_news_page(news_src.parent / d / "index.html", f"{d}/", f"{kdate} 취업뉴스 — 취업조로의 커리어브리핑", d, ld, "monthly", "0.5", noindex=d in rep_days):
                n_day_pages += 1
        has_archive = wrap_news_page(news_src.parent / "archive" / "index.html", "archive/", "지난 지면 전체 보기 — 취업조로의 커리어브리핑", updated,
                                     [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/"), ("지난 지면 전체", "news/archive/")])], "weekly", "0.6")
        if n_day_pages or has_archive:
            print(f"  날짜별 지면 {n_day_pages}쪽 -> {out_dir / 'news' / '<날짜>'}" + (f" + 지난 지면 목록 -> {out_dir / 'news' / 'archive' / 'index.html'}" if has_archive else ""))
        else:
            print("  (days.json 이 없어 날짜별 지면은 만들지 않았습니다)")
        # 2026-11-03: 뉴스가 어제보다 오래됐으면 알린다. 배포는 Actions 가 뉴스부터 다시 만들므로(site/ 는 git 에 안 올라감)
        #   로컬 빌드가 그대로 배포되지는 않는다. NEWS_STRICT=1 이면 빌드를 멈춘다.
        if news_days:
            _yday = (datetime.datetime.utcnow() + datetime.timedelta(hours=9) - datetime.timedelta(days=1)).date().isoformat()
            if max(news_days) < _yday:
                _msg = f"취업뉴스 최신 지면이 {max(news_days)} 입니다 (어제 {_yday} 보다 오래됨). news-collector 를 git pull 후 build_site.py 로 다시 만드세요."
                print(("::warning::" if os.environ.get("GITHUB_ACTIONS") else "경고: ") + _msg)
                if os.environ.get("NEWS_STRICT") == "1":
                    raise SystemExit(_msg)
        if NEWS_URL:
            shutil.rmtree(news_src.parent, ignore_errors=True)

    lm_state, lm_seen = load_lastmod(), set()   # sitemap lastmod: 쪽 내용이 바뀐 날 (연봉·회사 쪽)
    no_idx = load_noindex()                      # 2026-11-11: 다른 묶음이 정한 검색 제외 회사 → sitemap 에서 뺀다
    n_noidx = {"salary": 0, "company": 0}
    # ---- 연봉 연구소 (/salary/): salary-lab/publish_to_site.py 가 만든 salary/ 를 복사하고 상단 메뉴를 붙인다
    sal = BASE / ("_skip" if PREVIEW else "salary")
    if sal.exists():
        dst = out_dir / "salary"; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(sal, dst)
        zn_css = "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith((".zn", "@media (max-width:480px) { .zn", "@media (max-width:640px) { .zn")))
        zn_css = ".zn{--paper:var(--bg);--hairline:var(--line);--acc-ink:#0b0b0b}\n" + zn_css
        # 다크모드에서 검은 TEAM ZORRO 로고가 안 보이지 않게 흰색으로 (뉴스 페이지와 같은 규칙)
        zn_css += "\n@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }"
        # '숫자로 보는 회사들' 01·02 같은 테두리 숫자: 폰에서 1.5px 선이 다크·'웹사이트 어둡게'에서 흐려 보여 굵게 (2026-10-22 사용자)
        zn_css += "\n.sec-head .num:not(.sym) { -webkit-text-stroke-width:2px; }"
        # 2026-10-29 공용 푸터(큰 TEAM ZORRO·사업자 상자)도 붙인다 — 연봉 연구소 토큰 이름(--bg·--soft·--fill)을 푸터 토큰에 연결
        zn_css += ("\n.zf{--paper:var(--bg);--hairline:var(--line);--mist:var(--fill);--ink-soft:var(--soft);--font:-apple-system,BlinkMacSystemFont,\"Apple SD Gothic Neo\",system-ui,sans-serif;--display:\"Archivo\",-apple-system,BlinkMacSystemFont,\"Apple SD Gothic Neo\",system-ui,sans-serif}\n"
                   ".zf:is(html.wf *){--font:\"Noto Sans KR\",system-ui,sans-serif;--display:\"Archivo\",\"Noto Sans KR\",sans-serif}\n"
                   + "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith(".zf")))
        def add_nav(path, root):
            h = path.read_text(encoding="utf-8")
            if 'class="zn"' in h:
                return
            h = h.replace("</style>", zn_css + "\n</style>", 1)
            h = h.replace("</body>", footer_html(root, logo, "") + "</body>", 1)
            h = h.replace("<body>", "<body>\n" + nav_html("salary/index.html", root, logo_nav), 1) if "<body>" in h else nav_html("salary/index.html", root, logo_nav) + h
            h = h.replace("</style>", TABBAR_CSS + "</style>", 1)   # 2026-10-29 아래 탭바
            path.write_text(h, encoding="utf-8")
        add_nav(dst / "index.html", "../")
        # 공유(카톡) 미리보기: 첫 화면은 제목·설명·이미지를 새로, 회사 페이지는 이미지만 붙인다
        si = dst / "index.html"; h = si.read_text(encoding="utf-8")
        h = re.sub(r'<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\s*', "", h)
        h = h.replace("<title>연봉 연구소</title>", seo.seo_head(base_url, "연봉 연구소 — 그 회사, 내 연차면 얼마 받을까 | 취업조로",
            f"회사 {_salary_count()} 곳의 사원·대리·과장·차장·부장 추정 연봉을 국민연금·사업보고서로 정리했어요. 업계 순위, 이직 연봉 계산기, 실제 이직자 연봉까지 한 번에 보고 협상 기준을 잡으세요.",
            "salary/", og_salary), 1)
        si.write_text(h, encoding="utf-8")
        og_tags = (f'<meta property="og:type" content="website"><meta property="og:site_name" content="취업조로"><meta property="og:image" content="{og_salary}">'
                   f'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{og_salary}">')
        cos = sorted((dst / "co").iterdir())
        sal_live, n_redirect = [], 0
        for d in cos:
            p = d / "index.html"; h = p.read_text(encoding="utf-8")
            if 'http-equiv="refresh"' in h:
                # 2026-11-03: 다른 이름으로 옮겨진 회사의 이동용 빈 쪽 — 메뉴를 <!doctype> 앞에 붙이면 호환 모드가 되므로 건드리지 않고,
                #   canonical 만 절대 주소로, sitemap 에서도 뺀다 (noindex 쪽)
                _u = seo.abs_url(base_url, f"salary/co/{urllib.parse.quote(d.name)}/")
                h = re.sub(r'(<link rel="canonical" href=")([^"]+)(")', lambda m: m.group(1) + urllib.parse.urljoin(_u, m.group(2)) + m.group(3), h)
                if 'property="og:image"' not in h and "</head>" in h:   # 카톡 미리보기 그림은 붙인다 (빈 쪽도 head/body 가 생김, 2026-11-03)
                    h = h.replace("</head>", og_tags + "</head>", 1)
                p.write_text(h, encoding="utf-8")
                n_redirect += 1
                continue
            add_nav(d / "index.html", "../../../")
            h = p.read_text(encoding="utf-8")
            if 'property="og:image"' not in h:
                p.write_text(h.replace("</head>", og_tags + "</head>", 1), encoding="utf-8")
            sal_live.append(d)
        entries.append(("salary/", sal_updated, "monthly", "0.8"))
        # 2026-11-11 회사 목록 쪽(업종별·가나다별): 메뉴·푸터를 붙이고 sitemap 에 넣는다
        n_list = 0
        if (dst / "list" / "index.html").exists():
            for p in [dst / "list" / "index.html"] + sorted((dst / "list").glob("*/index.html")):
                sub = p.parent.name if p.parent.name != "list" else ""
                add_nav(p, "../../" + ("../" if sub else ""))
                h = p.read_text(encoding="utf-8")
                if 'property="og:image"' not in h:
                    p.write_text(h.replace("</head>", og_tags + "</head>", 1), encoding="utf-8")
                _k = "salary/list/" + (sub + "/" if sub else "")
                entries.append((_k, page_lastmod(lm_state, _k, h, today, sal_updated, moved="first"), "monthly", "0.4"))
                lm_seen.add(_k); n_list += 1
            print(f"연봉 연구소: 회사 목록 쪽 {n_list}개 (메뉴·sitemap 포함)")
        for d in sal_live:
            _k = f"salary/co/{urllib.parse.quote(d.name)}/"
            _src = sal / "co" / d.name / "index.html"
            _t = _src.read_text(encoding="utf-8")
            if d.name in no_idx["salary"] or re.search(r'<meta name="robots" content="noindex', _t[:3000]):   # 검색 제외 쪽은 sitemap 에 넣지 않는다
                n_noidx["salary"] += 1
                continue
            entries.append((_k, page_lastmod(lm_state, _k, _t, today, sal_updated, moved="first"), "monthly", "0.5"))
            lm_seen.add(_k)
        print(f"연봉 연구소: /salary/ + 회사 페이지 {len(sal_live):,}개 (이동용 빈 쪽 {n_redirect}개는 메뉴·sitemap 제외, 검색 제외 {n_noidx['salary']}개는 sitemap 제외)")
    # 2026-10-21 사용자: 법적·평판 리스크 대비 안내 (판정은 공개 자료 기반 참고용 의견, 출처·기준일 표기, 정정 창구)
    COMPANY_NOTE = ("해당사항은 회사의 공식 입장과 사실확정은 아니며, 항목마다 출처와 기준일을 표기합니다. "   # 2026-10-29 사용자 문구로 줄임
                    "사실과 다른 내용은 회사 화면 아래 '정정 요청하기'로 알려주시면 확인 후 고치거나 내려드리겠습니다.")
    # ---- 회사 판단 연구소 (/company/): company-check/publish_to_site.py 가 만든 company/ 를 복사하고 상단 메뉴를 붙인다
    comp = BASE / ("_skip" if PREVIEW else "company")
    if comp.exists():
        dst = out_dir / "company"; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(comp, dst)
        # 이 페이지는 자체 토큰(--paper·--hairline·--logo-filter)을 이미 갖고 있어 공용 .zn(메뉴)·.zf(푸터) 규칙만 더한다
        zn_css = "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith((".zn", ".zf", "@media (max-width:480px) { .zn", "@media (max-width:640px) { .zn")))
        h = (dst / "index.html").read_text(encoding="utf-8")
        h = re.sub(r'<title>[^<]*</title>|<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>|<link rel="canonical"[^>]*>', "", h)
        h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + seo.seo_head(base_url, "회사 판단 연구소 — 이직할까 말까, 내 상황으로 판단 | 취업조로",
            "합격한 그 회사, 나라면 가야 할까? 내 연차·연봉·근무지를 넣으면 잡플래닛·블라인드·캐치 평점, 직급별 연봉, 5개년 재무를 보고 이직할지 말지 Zorro가 내 기준으로 판정해 드려요.",
            "company/", og_company), 1)
        if 'class="zn"' not in h:
            h = h.replace("</style>", zn_css + "\n</style>", 1)
            h = h.replace("<body>", "<body>\n" + nav_html("company/index.html", "../", logo_nav), 1)
            h = h.replace("</style>", TABBAR_CSS + "</style>", 1)   # 2026-10-29 아래 탭바
            # 시안용 푸터 → 사이트 공용 푸터 (다크모드 로고 흰색 등 다른 페이지와 같게)
            h = re.sub(r"<!--FOOT-->.*?<!--/FOOT-->", lambda m: footer_html("../", logo, COMPANY_NOTE), h, count=1, flags=re.S)
            (dst / "index.html").write_text(h, encoding="utf-8")
        entries.append(("company/", today, "daily", "0.8"))
        # 회사별 정적 요약 페이지 (company-check build.py static_pages, 2026-10-28): 공용 메뉴·푸터·탭바 + 공유 이미지 주소 + sitemap
        cpages = sorted(p for p in (dst / "c").glob("*/index.html")) if (dst / "c").exists() else []
        # 2026-11-05 옛 주소 이동 쪽('(주)' 뺀 새 주소로 보내는 noindex 쪽)은 메뉴를 붙이지 않고 sitemap 에서도 뺀다
        cpages = [p for p in cpages if 'content="noindex"' not in p.read_text(encoding="utf-8")[:400]]
        _sc = zn_css + "\n" + TABBAR_CSS + "\n"
        _scv = __import__("hashlib").md5(_sc.encode()).hexdigest()[:8]   # 배포 뒤 옛 저장본이 섞이지 않게 내용 해시를 주소에 붙인다
        if cpages:   # 메뉴·탭바 스타일도 쪽마다 넣지 않고 파일 하나로
            (dst / "c" / "site.css").write_text(_sc, encoding="utf-8")
        for p in cpages:
            h = p.read_text(encoding="utf-8")
            if 'class="zn"' not in h:
                h = h.replace("</head>", f'<link rel="stylesheet" href="../site.css?v={_scv}">\n</head>', 1)
                h = h.replace("<body>", "<body>\n" + nav_html("company/index.html", "../../../", logo_nav), 1)
                h = re.sub(r"<!--FOOT-->.*?<!--/FOOT-->", lambda m: footer_html("../../../", logo, COMPANY_NOTE), h, count=1, flags=re.S)
                h = h.replace("https://job.jobzorro.kr/assets/og-company.png", og_company)
                p.write_text(h, encoding="utf-8")
        for p in cpages:
            _k = f"company/c/{urllib.parse.quote(p.parent.name)}/"
            _t = (comp / "c" / p.parent.name / "index.html").read_text(encoding="utf-8")
            if p.parent.name in no_idx["company"] or re.search(r'<meta name="robots" content="noindex', _t[:3000]):   # 검색 제외 쪽은 sitemap 에 넣지 않는다
                n_noidx["company"] += 1
                continue
            _b = re.search(r"기준일\s*(\d{4})\.(\d{2})\.(\d{2})", _t)   # 처음 보는 쪽은 그 쪽의 자료 기준일
            entries.append((_k, page_lastmod(lm_state, _k, _t, today, "-".join(_b.groups()) if _b else today), "weekly", "0.6"))
            lm_seen.add(_k)
        with open(out_dir / "llms.txt", "a", encoding="utf-8") as f:
            f.write(f"\n## 회사 판단 연구소\n- [회사 판단 연구소]({base_url}company/): 합격한 회사가 갈 만한지 잡플래닛·블라인드·캐치 평점, 직급별 연봉, DART 5개년 재무(별도), 최근 뉴스, AI 영향을 보고 상·중·하와 'Zorro의 한마디'로 판단\n")
        co_dir = dst / "data" / "co"  # API 모드면 조각 파일이 없음 (회사 상세는 Cloudflare Worker가 줌)
        print(f"회사 판단 연구소: /company/ (" + (f"데이터 조각 {len(list(co_dir.iterdir()))}개" if co_dir.exists() else "회사 상세는 API") + ")")
    # ---- 연봉 놀이터 (/play/): salary-lab/play/publish_to_site.py 가 만든 play/ 를 복사하고 상단 메뉴를 붙인다 (순위표는 play-api Worker)
    play = BASE / ("_skip" if PREVIEW else "play")
    if (play / "index.html").exists():
        dst = out_dir / "play"; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(play, dst)
        zn_css = "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith((".zn", "@media (max-width:480px) { .zn", "@media (max-width:640px) { .zn")))
        zn_css = ".zn{--paper:var(--bg);--hairline:var(--line)}\n" + zn_css
        zn_css += "\n@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }"
        h = (dst / "index.html").read_text(encoding="utf-8")
        h = re.sub(r'<title>[^<]*</title>|<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>|<link rel="canonical"[^>]*>', "", h)
        h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + seo.seo_head(base_url, "연봉 놀이터 — 회사 연봉으로 하는 오늘의 게임 | 취업조로",
            "회사 연봉으로 하는 매일 게임 6개. 연봉 줄서기, 스무고개 퀴즈, 연봉 스나이퍼, 커리어 로드 20년, 조로 출근길, 드림 컴퍼니 월드컵. 오늘의 도전 순위와 명예의 전당.",   # 2026-11-03 salary-lab/play/make.py 문구와 같게
            "play/", og_play), 1)
        if 'class="zn"' not in h:
            h = h.replace("</style>", zn_css + "\n</style>", 1)
            h = h.replace("<body>", "<body>\n" + nav_html("play/index.html", "../", logo_nav), 1)
            h = h.replace("</style>", TABBAR_CSS + "</style>", 1)   # 2026-10-29 아래 탭바
        if 'class="zf"' not in h:   # 2026-11-05 홍보 전 점검: 놀이터에도 공용 푸터(사업자 정보·개인정보처리방침). 게임 화면에선 숨기고 로비에서만
            zf_css = "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith((".zf", "@media (max-width:480px) { .zf", "@media (max-width:640px) { .zf")))
            zf_css = ".zf{--paper:var(--bg);--hairline:var(--line);--ink-soft:var(--muted);--mist:var(--card);--fillfg:var(--bg);--shadow-lift:none}\n" + zf_css
            zf_css += ("\nbody > .zf { margin-left:calc(-1 * max(16px, env(safe-area-inset-left,0px))); margin-right:calc(-1 * max(16px, env(safe-area-inset-right,0px))); }"
                       "\n:root[data-view=\"game\"] body > .zf, :root[data-view=\"menu\"] body > .zf { display:none; }")
            h = h.replace("</style>", zf_css + "\n</style>", 1)
            h = h.replace("</body>", footer_html("../", logo, "") + "\n</body>", 1)
        (dst / "index.html").write_text(h, encoding="utf-8")
        entries.append(("play/", today, "daily", "0.7"))
        with open(out_dir / "llms.txt", "a", encoding="utf-8") as f:
            f.write(f"\n## 연봉 놀이터\n- [연봉 놀이터]({base_url}play/): 연봉 연구소 자료로 하는 매일 게임 6종(연봉 줄서기·스무고개 퀴즈·연봉 스나이퍼·커리어 로드 20년·조로 출근길·드림 컴퍼니 월드컵), 오늘의 도전 순위와 명예의 전당\n")
        print("연봉 놀이터: /play/")
    if lm_seen:
        save_lastmod(lm_state, lm_seen)
    sm_idx = seo.write_sitemap(out_dir, base_url, entries)
    # 26) 이번 빌드에서 안 쓴 옛 해시 공유 이미지 지우기 (assets/og/*, assets/og-*.<해시>.png)
    n_og = 0
    for f in list((out_dir / "assets" / "og").glob("*.png")) + list((out_dir / "assets").glob("og*.png")):
        rel = f.relative_to(out_dir).as_posix()
        if re.search(r"\.[0-9a-f]{8}\.png$", f.name) and rel not in og_made:
            f.unlink(); n_og += 1
    # 16) 예전 시안 파일 지우기
    for name in STALE_FILES:
        (out_dir / name).unlink(missing_ok=True)
    audit_links(data, BASE / "assets" / "share")
    print(f"인앱 브라우저 → 기본 브라우저 전환: {add_inapp(out_dir)}개 페이지")
    print(f"다크모드 지원 표시(color-scheme): {add_color_scheme(out_dir)}개 페이지")
    print(f"윈도우 PC 만 웹 글꼴(wf 표시): {add_wf(out_dir)}개 페이지")
    print(f"화면 끝까지(viewport-fit=cover) 맞춤: {add_viewport_fit(out_dir)}개 페이지")
    print(f"단순화(영어 꼬리표 숨김): {add_simple(out_dir)}개 페이지")
    print(f"앱(PWA) 설치 연결: {pwa.add_pwa(out_dir, base_url)}개 페이지 (manifest·sw.js)")
    print(f"공통 head(글꼴 preconnect{' · 분석 ' + ANALYTICS_ID if ANALYTICS_ID else ''}): {add_head_common(out_dir)}개 페이지")
    print(f"옛 공유 이미지 정리: {n_og}개 삭제")
    print(f"sitemap.xml(색인): URL {sum(n for _, _, n in sm_idx)}개 -> " + ", ".join(f"{fn} {n}" for fn, _, n in sm_idx))


# 카카오톡·라인 인앱 브라우저로 열리면 휴대폰 기본 브라우저로 다시 연다 (모든 페이지 <head> 맨 앞)
# 카카오톡: kakaotalk://web/openExternal (안드로이드·iOS 모두), 라인: ?openExternalBrowser=1
# 인스타그램·네이버 앱 등은 iOS에서 강제로 바꿀 방법이 없어 건드리지 않는다
INAPP_JS = ("<script data-inapp>(function(){try{var a=navigator.userAgent||'',u=location.href;"
            "if(/KAKAOTALK/i.test(a)){location.href='kakaotalk://web/openExternal?url='+encodeURIComponent(u);}"
            "else if(/ Line\\//i.test(a)&&u.indexOf('openExternalBrowser=1')<0){var h=location.hash;"
            "location.replace(u.split('#')[0]+(location.search?'&':'?')+'openExternalBrowser=1'+h);}}catch(e){}})();</script>")


def add_inapp(out_dir: Path) -> int:
    n = 0
    for f in out_dir.rglob("*.html"):
        h = f.read_text(encoding="utf-8")
        if "data-inapp" in h or "<head>" not in h:
            continue
        f.write_text(h.replace("<head>", "<head>\n" + INAPP_JS, 1), encoding="utf-8")
        n += 1
    return n


# 2026-11-11 글꼴: 윈도우 PC 면 html 에 class "wf" → 본문도 웹 글꼴 (폰·맥은 기기 글꼴). 글꼴 link 보다 앞, <head> 맨 앞에 넣는다
WF_JS = "<script data-wf>(function(){try{if(/Windows/i.test(navigator.userAgent))document.documentElement.classList.add('wf')}catch(e){}})();</script>"


def add_wf(out_dir: Path) -> int:
    n = 0
    for f in out_dir.rglob("*.html"):
        h = f.read_text(encoding="utf-8")
        if "classList.add('wf')" in h or "<head>" not in h:   # 다른 묶음(연봉·회사·놀이터)이 이미 넣은 쪽은 건너뛴다
            continue
        f.write_text(h.replace("<head>", "<head>" + WF_JS, 1), encoding="utf-8")
        n += 1
    return n


def add_color_scheme(out_dir: Path) -> int:
    """모든 페이지에 '다크모드 직접 지원' 표시 — 없으면 삼성 인터넷·크롬 '자동 어둡게'가 화면을 강제로 뒤집어
    검은 TEAM ZORRO 로고·테두리 숫자(연봉 연구소 01·02)가 어두운 바탕에 묻힌다 (2026-10-22 사용자 폰 제보)"""
    n = 0
    for f in out_dir.rglob("*.html"):
        h = f.read_text(encoding="utf-8")
        if 'name="color-scheme"' in h or "<head>" not in h:
            continue
        h = re.sub(r'(class="zn-logo"[^>]*><img src="[^"]*)teamzorro_logo\.png"', r'\1teamzorro_logo_halo.png"', h)   # 회사 판단처럼 자체 탭바를 가진 페이지도 같은 로고로
        f.write_text(h.replace("<head>", '<head><meta name="color-scheme" content="light dark">', 1), encoding="utf-8")
        n += 1
    return n



# 2026-10-29 Simple is Best: 제목 위 영어 꼬리표(Salary Lab · …)를 모든 페이지에서 숨긴다 (검은 띠는 사용자 요청으로 유지)
# (페이지마다 만드는 곳이 달라 — 연봉·회사·뉴스·함께하기 — 마지막에 한 번에 처리)
SIMPLE_CSS = ('<style data-simple>.kick,.kicker,.masthead .brand-name{display:none!important}</style>')


def add_simple(out_dir: Path) -> int:
    n = 0
    for f in out_dir.rglob("*.html"):
        h = f.read_text(encoding="utf-8")
        if "data-simple" in h or "</head>" not in h:
            continue
        f.write_text(h.replace("</head>", SIMPLE_CSS + "</head>", 1), encoding="utf-8")
        n += 1
    return n


def add_viewport_fit(out_dir: Path) -> int:
    """아래 탭바가 있는 페이지는 모두 viewport-fit=cover 로 (2026-10-28 사용자 폰 제보: 뉴스에서만 아래 바가 한 칸 밑으로 밀림)
    뉴스(news-collector)·회사 판단 템플릿은 이 값 없이 만들어져, 폰 아래 시스템 영역(safe-area) 계산이 다른 페이지와 달랐다"""
    n = 0
    for f in out_dir.rglob("*.html"):
        h = f.read_text(encoding="utf-8")
        if 'class="zb"' not in h:
            continue
        h2 = re.sub(r'<meta name="viewport" content="(?![^"]*viewport-fit)([^"]*)">', lambda m: f'<meta name="viewport" content="{m.group(1)}, viewport-fit=cover">', h, count=1)
        if h2 != h:
            f.write_text(h2, encoding="utf-8"); n += 1
    return n

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=BASE / "site", type=Path)
    ap.add_argument("--no-news", action="store_true")
    ap.add_argument("--preview", action="store_true", help="미리보기용: 연봉·회사·놀이터 폴더 복사를 건너뛴다 (배포 빌드에는 쓰지 않음)")
    a = ap.parse_args()
    PREVIEW = a.preview
    build(a.out, not a.no_news)
