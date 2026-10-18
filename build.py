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
import base64
import hashlib
import seo
import json
import os
import re
import sys
from html import unescape as html_unescape   # 아래에서 `html` 이름은 페이지 문자열로 쓴다
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(__file__).parent
ASSETS = BASE / "assets"
NEWS_SRC = BASE / "news-collector" / "site" / "index.html"
# 뉴스 수집기 결과물이 없을 때 배포된 뉴스 페이지를 내려받아 쓰는 비상용 (Actions 워크플로가 첫 실행 때만 사용)
NEWS_URL = os.environ.get("NEWS_URL", "")  # 예: https://jobzorro.github.io/career-briefing/
NEWS_ASSET_NAMES = ["logo.png", "logo-dark.png", "teamzorro.png", "mark.png", "favicon-32.png", "favicon-180.png", "archive.json"]


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
}

TABS = [("index.html", "직무사전"), ("news/index.html", "취업뉴스"), ("zorro/index.html", '<span class="lg">취업조로와&nbsp;</span>함께하기')]   # 폰(480px 이하)에서는 "함께하기"만 보여 메뉴가 잘리지 않게
APPLY = "apply/index.html"   # 무료 상담 신청 폼 (모든 "무료 상담 신청하기" 버튼이 여기로 간다)


def data_uri(path: Path, mime="image/png") -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


LOGO_FILES = ("jobzorro_logo.png", "teamzorro_logo.png")   # assets/ → site/assets/ 로 복사해 모든 페이지가 파일 경로로 참조한다


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
        "summary": j["summary"],                                                 # 검색(haystack)용
        "skills": {"hard": j["skills"]["hard"], "soft": j["skills"]["soft"]},   # 카드는 hard 앞 3개, 검색은 전부
        "tools": j["tools"], "certs": j["certs"],                                # 검색용
        "salary": {"junior": j["salary"]["junior"]},                             # 카드 하단 신입 연봉대
        "ai": {"level": j["ai"]["level"]},                                       # 카드 AI 배지 · 'AI 영향 낮은 직무만' 필터
        "nonmajorOk": j["nonmajorOk"], "draftOnly": j["draftOnly"],
        "sources": {"count": s.get("count", 0), "public": s.get("public", 0), "industries": s.get("industries", [])},  # 근거 배지·필터·업종 검색
        "gc": _gc(j["group"]),                                                   # 웹 카드 그림 색 [액센트, 배경] (공유 이미지는 카톡 전용)
    }


# 뉴스 태그(ai_tags) → 직무 id. 최근 45일 아카이브에서 직무별 최신 3건을 jobs.json 에 news 로 붙인다 (상세 패널·직무 페이지에 표시)
NEWS_TAG_MAP = {
    "인사": ["hr", "recruiter", "general-affairs"],
    "영업": ["b2b-sales", "overseas-sales", "sales-management", "ecommerce-sales", "pharma-sales", "saas-sales", "technical-sales", "trading"],
    "재무": ["finance", "accounting", "corporate-finance", "bank", "risk-management", "policy-finance", "fund-ops"],
    "기획": ["strategy", "biz-planning", "sales-planning", "consulting", "bd"],
    "PM": ["service-planning", "it-planning"],
    "MD": ["md", "online-md"],
    "구매": ["purchasing", "scm", "forwarding"],
    "마케팅": ["brand-marketer", "performance-marketer", "content-marketer", "pr", "ad-planner"],
    "개발": ["sw-dev", "backend", "frontend", "embedded-sw", "ai-engineer", "data-engineer", "data-analyst", "qa"],
    "디자인": ["ux-designer"],
    "생산": ["production-mgmt", "production-tech", "process-tech", "equipment-eng", "semiconductor-pkg"],
    "연구": ["rnd-chem", "battery-dev", "device-rnd", "product-dev", "rnd-food", "rnd-bio", "bio-process"],
    "품질": ["quality", "reliability", "safety", "environment-eng", "gmp-qa"],
    "건설": ["construction-mgmt", "civil-eng", "plant-epc", "equipment-pm", "plant-design"],
    "공공": ["public-admin"],
}


def attach_news(data: dict, days: int = 45) -> None:
    import glob
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
                ids = {jid for t in tags for jid in NEWS_TAG_MAP.get(t, [])}
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
    print(f"관련 뉴스: 직무 {n}개에 최근 {days}일 기사 연결")


def attach_terms(data: dict, gl: dict, top: int = 5) -> None:
    """직무마다 본문에 가장 많이 나오는 용어 TOP 5 를 j["terms"] 로 붙인다 (상세 패널·직무 페이지 '필수 용어')."""
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
:root { --ink:#0b0b0b; --ink-soft:#3a3a3a; --muted:#7a7a7a; --faint:#a3a3a3; --brass:#0b0b0b; --brass-tint:#f4f4f4; --brass-bar:#c6ff3d; --acc:#c6ff3d; --acc-ink:#0b0b0b; --mark:#c6ff3d;
  --paper:#ffffff; --ground:#ffffff; --mist:#f4f4f4; --hairline:#e9e9e9; --hairline-2:#d2d2d2;
  /* 아래는 기존 템플릿이 쓰는 이름 → 위 토큰에 연결 */
  --bg:var(--ground); --surface:var(--paper); --surface-2:var(--mist); --black:var(--ink); --fg-soft:var(--ink-soft); --line:var(--hairline); --line-strong:var(--hairline-2);
  --red:var(--ink); --red-soft:var(--mist); --yellow:var(--acc); --green:#1b8f63; --green-soft:rgba(27,143,99,.12);
  --lvl1:#1b8f63; --lvl2:#c98500; --lvl3:#b4453a;
  /* 먹색으로 채운 큰 카드(히어로 옆 카드·CTA·상담 박스)와 작은 채움 요소(칩·아이콘·버튼) */
  --inkbg:#0b0b0b; --inkfg:#ffffff; --inkfg-soft:rgba(255,255,255,.72); --inkline:rgba(255,255,255,.28);
  --fill:#0b0b0b; --fillfg:#ffffff; --logo-filter:none;
  --shadow:none; --shadow-lift:0 18px 50px rgba(0,0,0,.18);
  --font:"Noto Sans KR","Archivo",-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  --display:"Archivo","Noto Sans KR",sans-serif; --serif:var(--display); --mono:var(--display); color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ink:#f3f3f3; --ink-soft:#cfcfcf; --muted:#8f8f8f; --faint:#6a6a6a; --brass:#f3f3f3; --brass-tint:#161616; --brass-bar:rgba(198,255,61,.32); --mark:rgba(198,255,61,.32);
  --paper:#0b0b0b; --ground:#0b0b0b; --mist:#161616; --hairline:#242424; --hairline-2:#3a3a3a; --green:#3fbf8a; --lvl2:#d9a441; --lvl3:#e0796c;
  --inkbg:#f3f3f3; --inkfg:#0b0b0b; --inkfg-soft:rgba(11,11,11,.7); --inkline:rgba(11,11,11,.25); --fill:#f3f3f3; --fillfg:#0b0b0b; --logo-filter:invert(1);
  --shadow:none; --shadow-lift:0 18px 50px rgba(0,0,0,.5); } }
:root[data-theme="dark"] { --ink:#f3f3f3; --ink-soft:#cfcfcf; --muted:#8f8f8f; --faint:#6a6a6a; --brass:#f3f3f3; --brass-tint:#161616; --brass-bar:rgba(198,255,61,.32); --mark:rgba(198,255,61,.32);
  --paper:#0b0b0b; --ground:#0b0b0b; --mist:#161616; --hairline:#242424; --hairline-2:#3a3a3a; --green:#3fbf8a; --lvl2:#d9a441; --lvl3:#e0796c;
  --inkbg:#f3f3f3; --inkfg:#0b0b0b; --inkfg-soft:rgba(11,11,11,.7); --inkline:rgba(11,11,11,.25); --fill:#f3f3f3; --fillfg:#0b0b0b; --logo-filter:invert(1);
  --shadow:none; --shadow-lift:0 18px 50px rgba(0,0,0,.5); }
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
.badge { display:inline-flex; align-items:center; gap:4px; font-family:var(--display); font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:4px 9px; border-radius:999px; background:var(--ink); color:var(--paper); white-space:nowrap; }
.badge.soft { background:var(--ink); color:var(--paper); } .badge.green { background:var(--green-soft); color:var(--green); } .badge.gray { background:var(--mist); color:var(--muted); border:1px solid var(--hairline); }
.btn { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; border-radius:8px; font-size:14px; font-weight:700; text-decoration:none; }
.btn { border-radius:999px; font-family:var(--display); letter-spacing:.02em; }
.btn.primary { background:var(--inkfg); color:var(--inkbg); } .btn.primary:hover { background:var(--acc); color:var(--acc-ink); }
.btn.ghost { border:1px solid var(--inkline); color:var(--inkfg); }
/* 공용 상단 탭 (취업뉴스 페이지에도 끼워 넣으므로 .zn 규칙은 뉴스 페이지에도 있는 토큰만 쓴다: --paper --ink --muted --hairline --brass) */
.zn { position:sticky; top:env(safe-area-inset-top,0px); z-index:20; background:var(--paper); color:var(--ink); border-bottom:1px solid var(--hairline); font-family:"Inter","Noto Sans KR",sans-serif; }
.zn-in { max-width:1120px; margin:0 auto; padding:0 20px; display:flex; align-items:center; gap:16px; height:54px; }
.zn-logo { display:flex; align-items:center; flex:none; }
.zn-logo img { height:22px; width:auto; filter:var(--logo-filter,none); display:block; }
.zn-tabs { display:flex; gap:2px; height:100%; margin-left:6px; min-width:0; overflow-x:auto; scrollbar-width:none; }
.zn-tabs::-webkit-scrollbar { display:none; }
.zn-tabs a { display:flex; align-items:center; padding:0 12px; font-family:var(--display); font-size:13px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--muted); text-decoration:none; white-space:nowrap; border-bottom:2px solid transparent; }
.zn-tabs a:hover { color:var(--ink); }
.zn-tabs a.on { color:var(--ink); border-bottom-color:var(--ink); }
@media (max-width:480px) { .zn-tabs .lg { display:none; } }
.zn-cta { margin-left:auto; flex:none; font-family:var(--display); font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--paper); background:var(--ink); border-radius:999px; padding:9px 15px; text-decoration:none; white-space:nowrap; }
.zn-cta:hover { background:var(--acc); color:var(--acc-ink); }
@media (max-width:640px) { .zn-cta { display:none; } .zn-in { gap:10px; padding:0 14px; } .zn-logo img { height:19px; } .zn-tabs a { padding:0 9px; font-size:13px; } }
/* 공용 푸터 (뉴스 푸터처럼 먹색 윗선 + 종이색) */
.zf { margin-top:72px; background:var(--paper); color:var(--ink); border-top:1px solid var(--ink); font-family:var(--font); }
.zf-in { max-width:1120px; margin:0 auto; padding:36px 20px 44px; }
.zf-logo img { height:20px; width:auto; filter:var(--logo-filter,none); display:block; }
.zf-links { display:flex; flex-wrap:wrap; gap:16px; font-size:12.5px; margin-top:18px; color:var(--ink-soft); }
.zf-links a { text-decoration:none; font-family:var(--display); font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; } .zf-links a:hover { color:var(--muted); }
.zf-box { margin-top:18px; background:var(--mist); border:1px solid var(--hairline); border-radius:10px; padding:14px 16px; font-size:12px; line-height:1.9; color:var(--muted); }
.zf-box b { color:var(--ink-soft); font-weight:600; }
.zf-note { margin-top:14px; font-size:12px; color:var(--muted); line-height:1.75; max-width:80ch; }
.zf { border-top-color:var(--hairline); }
/* 하단 고정 상담 버튼 */
.zfab { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(18px + env(safe-area-inset-bottom,0px)); z-index:25; }
.zfab a { display:inline-flex; align-items:center; gap:6px; background:var(--fill); color:var(--fillfg); border-radius:999px; padding:13px 26px; font-size:14px; font-weight:800; text-decoration:none; box-shadow:var(--shadow-lift); font-family:var(--font); }
.zfab a:hover { background:var(--acc); color:var(--acc-ink); }
.zfab a { font-family:var(--display); letter-spacing:.04em; }
"""


# 취업뉴스 페이지에 끼울 때 덮어쓰는 스타일 (보조 글자 선명하게). 제호는 build_site.py 의 .hero-top 이 그린다
FIT_JS = "<script>(function(){function fit(el){el.style.fontSize='';var s=parseFloat(getComputedStyle(el).fontSize),m=22,g=40;var av=Math.min(el.clientWidth,el.parentElement?el.parentElement.clientWidth:el.clientWidth,document.documentElement.clientWidth-32);while(el.scrollWidth>av+1&&s>m&&g-->0){s-=2;el.style.fontSize=s+'px';}}function all(){document.querySelectorAll('.hero h1').forEach(fit);}all();window.addEventListener('resize',all);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(all);})();</script>"
TICKER_HTML = '<div class="v2-ticker" aria-hidden="true"><div class="v2-ticker-track"><span>Career Briefing</span><span>매일 아침 고른 채용 · 이직 · 기업 · 고용 뉴스</span><span>Zorro의 한마디</span><span>주간 · 월간 랭킹</span><span>지난 지면 아카이브</span><span>Team Zorro</span><span>Career Briefing</span><span>매일 아침 고른 채용 · 이직 · 기업 · 고용 뉴스</span><span>Zorro의 한마디</span><span>주간 · 월간 랭킹</span><span>지난 지면 아카이브</span><span>Team Zorro</span></div></div>'
OUTRO_HTML = '<section class="v2-outro"><svg class="big" viewBox="0 0 1000 150" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false"><text x="0" y="128" textLength="1000" lengthAdjust="spacingAndGlyphs"><tspan class="o">TEAM</tspan><tspan class="s">ZORRO</tspan></text></svg><div class="row"><p>TEAM ZORRO는 여러분을 좀 더 나은 회사, 옳은 커리어로 인도하겠습니다.</p></div></section>'

NEWS_MASTHEAD_CSS = """
/* v2 톤: 황동 포인트 → 검정, 명조 → Archivo, 라임은 배경 강조에만 */
:root { --mark:#c6ff3d; --brass:#0b0b0b; --brass-tint:#f4f4f4; --brass-bar:#c6ff3d; --serif:"Archivo","Noto Sans KR",sans-serif; --sans:"Noto Sans KR","Archivo",-apple-system,sans-serif; --ink:#0b0b0b; --ink-soft:#3a3a3a; --muted:#7a7a7a; --paper:#ffffff; --ground:#ffffff; --mist:#f4f4f4; --hairline:#e9e9e9; --hairline-2:#d2d2d2; }
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
.picks-note, .pick-sector, .foot-label { font-family:"Inter","Noto Sans KR",sans-serif; font-size:11.5px; font-weight:700; letter-spacing:.02em; text-transform:none; }
.picks-note, .foot-label { color:var(--muted); }
.stamp, .foot-note { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12px; font-weight:500; letter-spacing:0; text-transform:none; color:var(--muted); }

/* ───── v2 구조: 직무사전과 같은 문법 ───── */
.masthead { border-bottom:0; }
.masthead-inner { padding:28px 20px 0; max-width:1320px; }
.masthead .brand-logo { display:none !important; }
.masthead .brand { gap:0; } .masthead .brand-text { border-left:0; padding-left:0; }
.masthead .brand-name { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); display:flex; align-items:center; gap:12px; }
.masthead .brand-name::before { content:""; width:8px; height:8px; border-radius:50%; background:#c6ff3d; display:inline-block; }
.masthead .brand-en { font-family:"Archivo",sans-serif; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; background:none; color:var(--muted); padding:0; margin-left:0; }
.masthead .brand-en::before { content:"· "; }
.stamp { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.theme-btn { font-family:"Archivo",sans-serif; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; }
.hero { background:var(--paper); border-bottom:1px solid var(--hairline); }
.hero-inner { max-width:1320px; padding:18px 20px 40px; gap:48px; align-items:end; }
.eyebrow { display:none; }
.hero h1 { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; font-size:clamp(34px, 5.4vw, 76px); line-height:1.02; letter-spacing:-.05em; margin:0 0 22px; white-space:nowrap; }
.hero h1 em { color:inherit; background:linear-gradient(transparent 68%, var(--mark, #c6ff3d) 68%); }
.hero-sub { font-size:16px; color:var(--ink-soft); max-width:58ch; }
.brief-box { border:0; border-top:1px solid var(--ink); border-radius:0; background:transparent; padding:18px 0 0; margin-top:0; }
.brief-label { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.funnel { border-top:1px solid var(--ink); margin-top:26px; padding-top:0; gap:0; }
.funnel-step { padding:14px 28px 14px 0; margin-right:28px; border-right:1px solid var(--hairline); border-bottom:1px solid var(--hairline); }
.funnel-num { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:34px; font-weight:900; letter-spacing:-.04em; }
.funnel-label { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.hero-picks { flex:0 0 380px; max-width:380px; gap:0; border-top:1px solid var(--ink); }
.picks-head { padding:12px 0; border-bottom:1px solid var(--hairline); }
.picks-title { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
.picks-note { font-family:"Archivo",sans-serif; }
.pick { border:0; border-bottom:1px solid var(--hairline); border-radius:0; padding:12px 0; background:transparent; box-shadow:none; }
.pick:hover { background:transparent; }
.pick-sector { font-family:"Archivo","Noto Sans KR",sans-serif; color:var(--muted); }
.pick-title { font-weight:800; letter-spacing:-.02em; }
/* 마키 */
.v2-ticker { overflow:hidden; background:var(--ink); color:var(--paper); }
.v2-ticker-track { display:flex; width:max-content; animation:v2marquee 40s linear infinite; }
.v2-ticker span { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:700; font-size:13px; letter-spacing:.12em; text-transform:uppercase; padding:12px 28px; white-space:nowrap; }
.v2-ticker span::after { content:"✦"; margin-left:28px; color:#c6ff3d; }
@keyframes v2marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .v2-ticker-track { animation:none; } }
/* 고정 컨트롤 바 = 직무사전 필터 바 */
.controls { top:calc(54px + env(safe-area-inset-top,0px)); border-bottom:1px solid var(--hairline); box-shadow:none; }
.controls-inner { max-width:1320px; padding:10px 20px; gap:12px; overflow-x:auto; scrollbar-width:none; }
.controls-inner::-webkit-scrollbar { display:none; }
.segmented { border:0; border-radius:0; gap:4px; overflow:visible; }
.seg { border:1px solid transparent; border-radius:999px; padding:9px 14px; font-family:"Archivo","Noto Sans KR",sans-serif; font-size:13px; font-weight:700; color:var(--muted); background:transparent; }
.seg:hover { color:var(--ink); border-color:var(--hairline-2); }
.seg[aria-selected="true"], .seg.on { background:var(--ink) !important; color:var(--paper) !important; border-color:var(--ink) !important; }
.datenav { gap:6px; }
.datebtn, .dateselect { border-radius:999px; border:1px solid var(--hairline-2); font-family:"Archivo","Noto Sans KR",sans-serif; font-size:13px; font-weight:700; padding:8px 12px; background:transparent; color:var(--ink); }
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
.news-thumb { border-radius:10px; overflow:hidden; }
.news-thumb img { transition:transform .5s cubic-bezier(.2,.7,.2,1); }
.news-card:hover .news-thumb img { transform:scale(1.04); }
.news-num { font-family:"Archivo",sans-serif; font-weight:900; color:var(--ink); }
.news-title { font-family:"Archivo","Noto Sans KR",sans-serif; font-weight:900; letter-spacing:-.035em; font-size:20px; line-height:1.25; }
.news-source, .news-meta { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.news-why { border-left:2px solid #c6ff3d; padding-left:12px; }
.news-why b { color:var(--ink); }
.job-tag { background:var(--ink); color:var(--paper); border-radius:999px; font-family:"Archivo","Noto Sans KR",sans-serif; font-size:11.5px; font-weight:700; letter-spacing:.04em; }
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
@media (max-width: 900px) {
  .hero-inner { align-items:stretch; }
  .hero-text, .hero-picks { min-width:0; width:100%; max-width:none; flex:1 1 auto; }
  .hero h1 { white-space:normal; font-size:clamp(30px, 8.6vw, 44px); line-height:1.08; }
  .funnel { flex-wrap:wrap; }
  .funnel-step { flex:1 1 45%; padding:12px 12px 12px 0; margin-right:0; border-right:0; }
  .funnel-num { font-size:28px; }
  .masthead-inner { flex-wrap:wrap; gap:8px; }
  .v2-outro { padding:40px 16px 16px; }
}
"""


def nav_html(active: str, root: str, logo: str) -> str:
    tabs = "".join(
        f'<a href="{root}{href}"{" class=\"on\"" if href == active else ""}>{label}</a>' for href, label in TABS
    )
    theme = "<script>try{var t=localStorage.getItem('cb-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>"
    return (
        theme + f'<header class="zn"><div class="zn-in"><a class="zn-logo" href="{root}index.html"><img src="{logo_src(logo, root)}" alt="TEAM ZORRO"></a>'
        f'<nav class="zn-tabs" aria-label="사이트 탭">{tabs}</nav>'
        f'</div></header>'
    )


def footer_html(root: str, logo: str, note: str) -> str:
    c = COMPANY
    return (
        f'<footer class="zf"><div class="zf-in"><a class="zf-logo" href="{c["home"]}" target="_blank" rel="noopener"><img src="{logo_src(logo, root)}" alt="취업조로"></a>'
        f'<div class="zf-links"><a href="{root}index.html">직무사전</a><a href="{root}news/index.html">취업뉴스</a><a href="{root}zorro/index.html">취업조로와 함께하기</a><a href="{root}{APPLY}">무료 상담 신청</a>'
        f'<a href="{c["home"]}" target="_blank" rel="noopener">취업조로 홈</a>'
        f'<a href="{root}privacy/index.html">개인정보처리방침</a></div>'
        f'<div class="zf-box"><b>법인명(상호)</b> {c["name"]} &nbsp;·&nbsp; <b>대표자</b> {c["ceo"]} &nbsp;·&nbsp; <b>개인정보보호책임자</b> {c["privacy"]}<br>'
        f'<b>사업자등록번호</b> {c["reg"]}<br><b>주소</b> {c["addr"]}<br>© Copyright 2026 All rights reserved by CAREERPROJECT inc.</div>'
        f'{f"<p class=\"zf-note\">{note}</p>" if note else ""}</div></footer>'
    )


def fab_html(root: str) -> str:
    return ''   # 하단 고정 상담 버튼은 2026-10-18 사용자 요청으로 제거


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
    check_jobs(data)
    global GLOSS
    GLOSS = json.loads((BASE / "data" / "glossary.json").read_text(encoding="utf-8")) if (BASE / "data" / "glossary.json").exists() else {"terms": []}
    attach_terms(data, GLOSS)
    attach_news(data)
    # 로고는 data URI 로 페이지마다 박지 않고 site/assets/ 의 파일을 참조한다 (nav_html/footer_html 이 root 를 붙여 깊이별 상대경로로 만든다)
    logo = "assets/jobzorro_logo.png"            # 푸터: 취업조로
    logo_nav = "assets/teamzorro_logo.png"       # 맨 위 탭바만 TEAM ZORRO CI
    (out_dir / "assets").mkdir(parents=True, exist_ok=True)
    for name in LOGO_FILES:
        (out_dir / "assets" / name).write_bytes((ASSETS / name).read_bytes())
    n_jobs = len(data["jobs"])
    n_evidence = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    data["meta"]["evidenceTotal"] = n_evidence
    disclaimer = data["meta"]["disclaimer"]

    # 1) 직무사전
    #    전체 JSON(1.1MB)은 site/data/jobs.json 으로 따로 두고 상세 패널이 첫 클릭 때 한 번 받아 간다.
    #    페이지에는 카드·필터·검색에 쓰는 슬림 버전(slim_job)만 박아 첫 로딩 HTML 을 250KB 아래로 유지한다.
    full_payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    data["meta"]["dataVersion"] = hashlib.md5(full_payload.encode("utf-8")).hexdigest()[:8]   # JS 가 ?v= 로 붙여 CDN 캐시를 무효화
    (out_dir / "data").mkdir(parents=True, exist_ok=True)
    (out_dir / "data" / "jobs.json").write_text(full_payload, encoding="utf-8")
    slim = {"meta": data["meta"], "jobs": [slim_job(j) for j in data["jobs"]]}
    payload = json.dumps(slim, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (BASE / "template.html").read_text(encoding="utf-8")
    # site_cfg 는 아래(zorro 블록 앞)에서 읽지만 첫 페이지 SEO 에도 필요하므로 여기서 먼저 읽는다
    _cfg = json.loads((BASE / "data" / "site.json").read_text(encoding="utf-8"))
    _base = _cfg.get("baseUrl") or "https://jobzorro.github.io/jobzorro-site/"
    seo.VERIFY = _cfg.get("verification", {}) or {}
    _n_jobs = len(data["jobs"]); _n_ev = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    html = html.replace("/*__SEO__*/", seo.seo_head(_base, f"취업조로 직무사전 — 직무 {_n_jobs}개, 현직자 인터뷰·자료 {_n_ev:,}건으로 정리한 직무 설명",
        f"취업·이직 컨설턴트 취업조로가 현직자 인터뷰 {_n_ev:,}건을 바탕으로 정리한 직무사전. 하는 일, 하루 일과, 연봉대, 들어가는 길, 옮겨갈 수 있는 직무, 면접 질문, 현직자의 말까지 직무 {_n_jobs}개를 한 곳에서.",
        "", seo.abs_url(_base, "assets/og." + __import__("hashlib").md5((BASE / "assets" / "share" / "og.png").read_bytes()).hexdigest()[:8] + ".png") if (BASE / "assets" / "share" / "og.png").exists() else seo.abs_url(_base, "assets/og.png"), [seo.org_ld(_base, COMPANY), seo.website_ld(_base)]))
    for ph in ("/*__JOBS_JSON__*/", "/*__NAV__*/", "/*__FOOTER__*/", "/*__FAB__*/", "/*__SHARED_CSS__*/"):
        if ph not in html:
            raise SystemExit(f"template.html 에 {ph} 가 없습니다")
    html = (html.replace("/*__SHARED_CSS__*/", SHARED_CSS)
                .replace("/*__NAV__*/", nav_html("index.html", "", logo_nav))
                .replace("/*__FOOTER__*/", footer_html("", logo, disclaimer))
                .replace("/*__FAB__*/", fab_html(""))
                .replace("/*__JOBS_JSON__*/", payload)
)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(html, encoding="utf-8")
    print(f"직무사전: 직무 {n_jobs}개 · 직군 {len(data['meta']['groups'])}개 · 근거 {n_evidence}건 -> {out_dir / 'index.html'} "
          f"({(out_dir / 'index.html').stat().st_size:,} bytes, 슬림 JSON {len(payload.encode('utf-8')):,}) · 전체 데이터 -> data/jobs.json ({len(full_payload.encode('utf-8')):,} bytes)")

    # 2) 취업조로와 함께하기
    site_cfg = json.loads((BASE / "data" / "site.json").read_text(encoding="utf-8"))
    base_url = site_cfg.get("baseUrl") or "https://jobzorro.github.io/jobzorro-site/"
    updated = data["meta"].get("updated", "2026-10-16")
    by_id = {j["id"]: j for j in data["jobs"]}
    gname = {g["id"]: g["name"] for g in data["meta"]["groups"]}
    # 공유 이미지: 글꼴이 있는 PC 에서 assets/share/ 에 만들어 git 에 넣고, 빌드 때 site/assets/ 로 복사 (Actions 엔 한글 글꼴이 없다)
    share = BASE / "assets" / "share"; share.mkdir(exist_ok=True)
    (out_dir / "assets").mkdir(exist_ok=True)
    if seo.fonts_available():
        seo.og_image(share / "og.png", "그 직무의 진짜 모습", f"현직자 인터뷰·자료 {data['meta'].get('sourceDocs', 0) + sum(j['sources'].get('public', 0) for j in data['jobs']):,}건으로 정리한 직무 {len(data['jobs'])}개 · 취업뉴스 · 무료 상담", "취업조로 직무사전", "채용공고엔 안 나오는")
        seo.og_image(share / "og-news.png", "취업조로의 커리어브리핑", "채용·이직·기업·고용 뉴스를 매일 아침 고르고, Zorro의 한마디를 붙입니다", "취업뉴스", "커리어를 읽는 남자가 매일 아침 고른")
        seo.og_image(share / "og-zorro.png", "취업조로와 함께하기", "신입·중고신입·경력이직·선퇴사자 맞춤 컨설팅 · 함께한 합격자 1,100+", "TEAM ZORRO", "누가 봐도 뽑고 싶은 인재의 비밀")
        seo.og_image(share / "og-apply.png", "무료 상담 신청", "취업조로 컨설턴트가 내 상황에 맞는 길을 1:1로 정리해 드립니다", "무료 상담", "취업·이직 고민, 혼자 하지 마세요")
    else:
        print("  (한글 글꼴이 없어 공유 이미지는 다시 만들지 않고 assets/share 의 기존 파일을 씁니다)")
    import shutil as _sh, hashlib as _hl
    def share_url(rel: str) -> str:
        """assets/share/<rel> 을 site/assets/ 로 복사하되 파일명에 내용 해시를 붙인다 (카카오 등이 옛 이미지를 캐시하지 않도록)."""
        src = share / rel
        if not src.exists():
            return seo.abs_url(base_url, "assets/og.png")
        h = _hl.md5(src.read_bytes()).hexdigest()[:8]
        stem, ext = src.stem, src.suffix
        dst_rel = f"assets/og/{stem}.{h}{ext}" if rel.startswith("jobs/") else f"assets/{stem}.{h}{ext}"
        dst = out_dir / dst_rel; dst.parent.mkdir(parents=True, exist_ok=True)
        _sh.copy(src, dst)
        if rel == "og.png":   # 구조화 데이터의 로고(assets/og.png)가 계속 가리킬 수 있게 원래 이름으로도 둔다
            _sh.copy(src, out_dir / "assets" / "og.png")
        return seo.abs_url(base_url, dst_rel)
    og_main = share_url("og.png")
    og_news, og_zorro, og_apply = share_url("og-news.png"), share_url("og-zorro.png"), share_url("og-apply.png")
    for name in ("favicon-32.png", "favicon-180.png"):
        src = BASE / "news-collector" / "assets" / name
        if src.exists(): (out_dir / "assets" / name).write_bytes(src.read_bytes())
    z = (BASE / "template_zorro.html").read_text(encoding="utf-8")
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
        avatar_html = f'<img src="data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}" alt="취업조로 조현빈">'
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
    for key in ("new", "old", "change", "quit"):
        z = z.replace(f"/*__ILL_{key.upper()}__*/", data_uri(ASSETS / f"ill_{key}.png"))
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
    pv = pv.replace("/*__SEO__*/", seo.seo_head(base_url, "개인정보처리방침 — 취업조로 · 커리어프로젝트 주식회사", "커리어프로젝트 주식회사(취업조로)의 개인정보처리방침. 상담 신청 시 수집 항목, 목적, 보유 기간, 위탁, 정보주체의 권리.", "privacy/", og_main, [], noindex=True))
    pv = (pv.replace("/*__SHARED_CSS__*/", SHARED_CSS)
            .replace("/*__NAV__*/", nav_html("privacy/index.html", "../", logo_nav))
            .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
            .replace("/*__FAB__*/", fab_html("../"))
            .replace("/*__KAKAO_OPEN__*/", cfg_public["kakaoOpen"])
            .replace("/*__ADDR__*/", COMPANY["addr"]))
    (out_dir / "privacy").mkdir(exist_ok=True)
    (out_dir / "privacy" / "index.html").write_text(pv, encoding="utf-8")
    print(f"개인정보처리방침 -> {out_dir / 'privacy' / 'index.html'}")

    # 직무 비교 / 3문항 진단
    for tpl_name, sub, title, desc in (
        ("template_compare.html", "compare", "직무 비교 — 두 직무를 나란히 | 취업조로 직무사전", "연봉대·필요 역량·들어가는 길·커리어 패스를 한 화면에서 비교합니다."),
        ("template_fit.html", "fit", "3문항 직무 진단 — 나에게 맞는 직무 5개 | 취업조로 직무사전", "전공 계열·성향·원하는 것 세 가지 답으로 직무 79개 중 지금 상황에 맞는 직무를 골라 드립니다."),
    ):
        tp = BASE / tpl_name
        if not tp.exists():
            continue
        pg = (tp.read_text(encoding="utf-8")
                .replace("/*__SEO__*/", seo.seo_head(base_url, title, desc, f"{sub}/", og_main, [seo.breadcrumb_ld(base_url, [("직무사전", ""), (title.split(" — ")[0], f"{sub}/")])]))
                .replace("/*__SHARED_CSS__*/", SHARED_CSS)
                .replace("/*__NAV__*/", nav_html("index.html", "../", logo_nav))
                .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
                .replace("/*__FAB__*/", fab_html("../"))
                .replace("/*__JOBS_JSON__*/", payload))
        (out_dir / sub).mkdir(exist_ok=True)
        (out_dir / sub / "index.html").write_text(pg, encoding="utf-8")
        print(f"{sub}/ -> {out_dir / sub / 'index.html'}")

    # ---- 직무별 정적 페이지 (SEO·GEO) ----
    tpl = (BASE / "template.html").read_text(encoding="utf-8")
    css = tpl[tpl.index("<style>") + 7:tpl.index("</style>")].replace("/*__SHARED_CSS__*/", SHARED_CSS) + seo.JOB_PAGE_CSS
    fonts = tpl[tpl.index('<link rel="preconnect"'):tpl.index("<style>")]
    entries = [("", updated, "daily", "1.0"), ("news/", updated, "daily", "0.9"), ("zorro/", updated, "monthly", "0.8"), ("apply/", updated, "monthly", "0.6"), ("compare/", updated, "monthly", "0.6"), ("fit/", updated, "monthly", "0.7")]
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
                + head + "\n" + fonts + "<style>" + css + "</style>\n</head>\n<body>\n"
                + nav_html("index.html", "../../", logo_nav)
                + "<main class=\"jobpage\"><div class=\"d-body\">" + body + "</div></main>\n"
                + footer_html("../../", logo, disclaimer) + fab_html("../../")
                + "\n</body>\n</html>\n")
        d = out_dir / "jobs" / jid
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page, encoding="utf-8")
        entries.append((f"jobs/{jid}/", updated, "weekly", "0.8"))
    # sitemap.xml 은 뉴스 블록이 날짜별 지면 URL 을 entries 에 더한 뒤, 맨 끝에서 쓴다
    ic = json.loads((BASE / "data" / "interview_common.json").read_text(encoding="utf-8"))
    iqp = BASE / "data" / "interview_jobs.json"
    iqj = json.loads(iqp.read_text(encoding="utf-8")) if iqp.exists() else {}
    ix = seo.seo_head(base_url, "면접 질문 모음 — 공통 빈출 TOP 20 + 79개 직무 단골 질문 | 취업조로 직무사전",
                      "자기소개·지원동기부터 직무별 단골 질문까지. 질문마다 면접관이 확인하려는 의도를 함께 정리했습니다. 직무를 고르면 그 직무 질문으로 바로 이동합니다.",
                      "interview/", og_main, [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("면접 질문", "interview/")]),
                      {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": t["q"], "acceptedAnswer": {"@type": "Answer", "text": "면접관이 확인하려는 것: " + ", ".join(t["i"])}} for t in ic["top"]]}])
    (out_dir / "interview").mkdir(exist_ok=True)
    import shutil as _sh2
    for d in (out_dir / "interview").iterdir():
        if d.is_dir(): _sh2.rmtree(d)
    (out_dir / "interview" / "index.html").write_text(
        "<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        + ix + "\n" + fonts + "<style>" + css + seo.INTERVIEW_ALL_CSS + "</style>\n</head>\n<body>\n" + nav_html("index.html", "../", logo_nav)
        + "<main class=\"iqpage jobpage\">" + seo.render_interview_all(ic, iqj, data["jobs"], data["meta"]["groups"]) + "</main>\n"
        + footer_html("../", logo, "") + seo.INTERVIEW_ALL_JS + "\n</body>\n</html>\n", encoding="utf-8")
    print(f"면접 질문 페이지: 공통 {len(ic['top'])}개 + 직무 {len(iqj)}개 -> {out_dir / 'interview' / 'index.html'}")
    entries.append(("interview/", updated, "weekly", "0.8"))
    # 관리 화면 (검색 제외)
    ap = BASE / "template_admin.html"
    if ap.exists():
        adm = (ap.read_text(encoding="utf-8")
               .replace("/*__SEO__*/", seo.seo_head(base_url, "직무사전 관리 — 취업조로", "운영자 전용", "admin/", og_main, [], noindex=True))
               .replace("/*__SHARED_CSS__*/", SHARED_CSS)
               .replace("/*__NAV__*/", nav_html("index.html", "../", logo_nav))
               .replace("/*__FOOTER__*/", footer_html("../", logo, "")))
        (out_dir / "admin").mkdir(exist_ok=True)
        (out_dir / "admin" / "index.html").write_text(adm, encoding="utf-8")
    seo.write_robots(out_dir, base_url)
    seo.write_llms(out_dir, base_url, data["jobs"], data["meta"]["groups"], updated)
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
            line + "\n" for line in SHARED_CSS.splitlines() if line.startswith((".zn", ".zf", "@media (max-width:640px) { .zn"))) + (
            "@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }\n"
        ) + NEWS_MASTHEAD_CSS + "</style>"
        # 공용 푸터·하단 버튼이 쓰는 토큰 중 뉴스 페이지에 없는 것들을 뉴스 토큰에 연결
        nav_css = nav_css.replace("</style>", ":root { --font: var(--sans); --fill: var(--ink); --fillfg: var(--paper); --ink-soft: var(--ink-soft); }\n"
                                  "body { padding-bottom: 24px; }\n</style>")
        inject = nav_css + nav_html("news/index.html", "../", logo_nav)
        n = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + inject, n, count=1)
        n = n.replace('<section class="hero">', TICKER_HTML + '<section class="hero">', 1)
        foot = FIT_JS + OUTRO_HTML + footer_html("../", logo, "뉴스 원문의 저작권은 각 언론사에 있으며, 이 페이지는 제목·요약과 원문 링크만 싣습니다.") + fab_html("../")
        n = n.replace("</body>", foot + "</body>", 1)
        news_ld = [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/")]),
                   {"@context": "https://schema.org", "@type": "WebPage", "@id": seo.abs_url(base_url, "news/"), "name": "취업조로의 커리어브리핑", "inLanguage": "ko",
                    "description": "취업조로가 매일 아침 고르는 채용·이직·기업·고용 뉴스와 한마디", "isPartOf": {"@id": seo.abs_url(base_url, "#website")}, "author": {"@id": seo.abs_url(base_url, "zorro/#person")}}]
        n = re.sub(r'<meta property="og:image" content="assets/favicon-180.png">', '', n, count=1)
        n = n.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&family=Archivo:wght@700;900&display=swap">'
                      + f'<link rel="canonical" href="{seo.abs_url(base_url, "news/")}"><meta property="og:url" content="{seo.abs_url(base_url, "news/")}"><meta property="og:image" content="{og_news}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="author" content="조현빈 (취업조로)">' + seo.verify_tags()
                      + "".join(seo.jsonld(o) for o in news_ld) + "</head>", 1)
        (out_dir / "news").mkdir(exist_ok=True)
        (out_dir / "news" / "index.html").write_text(n, encoding="utf-8")
        import shutil  # 뉴스 페이지가 참조하는 로고·파비콘·기사 썸네일(assets/thumbs)도 함께 복사
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

        def wrap_news_page(src: Path, rel: str, title: str, lastmod: str, ld: list, changefreq: str, priority: str) -> bool:
            """news/<rel>index.html 로 쓴다. 페이지 자체 <title>/description 은 떼고 seo_head 것으로 바꾼다. 성공하면 sitemap entries 에 더한다."""
            if not src.exists():
                return False
            page = src.read_text(encoding="utf-8")
            m = re.search(r'<meta name="description" content="([^"]*)">', page)
            desc = html_unescape(m.group(1)) if m else title
            page = re.sub(r"<title>.*?</title>\s*", "", page, count=1, flags=re.S)
            page = re.sub(r'<meta name="description" content="[^"]*">\s*', "", page, count=1)
            page = re.sub(r'<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*', "", page)   # seo_head 가 절대 경로로 다시 넣는다
            page = page.replace("</head>", seo.seo_head(base_url, title, desc, f"news/{rel}", og_news, ld) + seo.verify_tags() + "\n</head>", 1)
            page = re.sub(r"(<body[^>]*>)", lambda mm: mm.group(1) + nav_css + nav_html("news/index.html", "../../", logo_nav), page, count=1)
            page = page.replace("</body>", footer_html("../../", logo, news_note) + fab_html("../../") + "</body>", 1)
            dst = out_dir / "news" / rel / "index.html"
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(page, encoding="utf-8")
            entries.append((f"news/{rel}", lastmod, changefreq, priority))
            return True

        days_file = news_src.parent / "days.json"
        news_days = []
        if days_file.exists():
            try:
                news_days = [d for d in json.loads(days_file.read_text(encoding="utf-8")) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(d))]
            except (json.JSONDecodeError, OSError):
                news_days = []
        n_day_pages = 0
        for d in news_days:
            y, mo, dd = (int(x) for x in d.split("-"))
            kdate = f"{y}년 {mo}월 {dd}일"
            ld = [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/"), (f"{kdate} 지면", f"news/{d}/")]),
                  {"@context": "https://schema.org", "@type": "WebPage", "@id": seo.abs_url(base_url, f"news/{d}/"), "name": f"{kdate} 커리어브리핑",
                   "inLanguage": "ko", "datePublished": d, "isPartOf": {"@id": seo.abs_url(base_url, "#website")}, "author": {"@id": seo.abs_url(base_url, "zorro/#person")}}]
            if wrap_news_page(news_src.parent / d / "index.html", f"{d}/", f"{kdate} 커리어브리핑 — 취업조로", d, ld, "monthly", "0.5"):
                n_day_pages += 1
        has_archive = wrap_news_page(news_src.parent / "archive" / "index.html", "archive/", "지난 지면 전체 보기 — 취업조로의 커리어브리핑", updated,
                                     [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/"), ("지난 지면 전체", "news/archive/")])], "weekly", "0.6")
        if n_day_pages or has_archive:
            print(f"  날짜별 지면 {n_day_pages}쪽 -> {out_dir / 'news' / '<날짜>'}" + (f" + 지난 지면 목록 -> {out_dir / 'news' / 'archive' / 'index.html'}" if has_archive else ""))
        else:
            print("  (days.json 이 없어 날짜별 지면은 만들지 않았습니다)")
        if NEWS_URL:
            shutil.rmtree(news_src.parent, ignore_errors=True)

    seo.write_sitemap(out_dir, base_url, entries)
    print(f"sitemap.xml: URL {len(entries)}개 -> {out_dir / 'sitemap.xml'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=BASE / "site", type=Path)
    ap.add_argument("--no-news", action="store_true")
    a = ap.parse_args()
    build(a.out, not a.no_news)
