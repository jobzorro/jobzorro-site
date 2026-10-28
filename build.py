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
NEWS_SRC = BASE / "news-collector" / "site" / "index.html"
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
}

# 2026-10-28 사용자: 연봉 연구소 - 연봉 놀이터 - 회사 판단 - 직무사전 - 취업뉴스 - 함께하기 순서
TABS = [("salary/index.html", '연봉<span class="lg"> 연구소</span>'), ("play/index.html", '<span class="lg">연봉&nbsp;놀이터</span><span class="sm">게임</span><span class="new">NEW</span>'), ("company/index.html", '회사<span class="lg">&nbsp;판단</span>'), ("index.html", "직무사전"), ("news/index.html", "취업뉴스"), ("zorro/index.html", '<span class="lg">취업조로와&nbsp;</span>함께하기')]   # 폰(480px 이하)에서는 "함께하기"만 보여 메뉴가 잘리지 않게
APPLY = "apply/index.html"   # 무료 상담 신청 폼 (모든 "무료 상담 신청하기" 버튼이 여기로 간다)


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
        "summary": j["summary"],                                                 # 검색(haystack)용
        "skills": {"hard": j["skills"]["hard"], "soft": j["skills"]["soft"]},   # 카드는 hard 앞 3개, 검색은 전부
        "tools": j["tools"], "certs": j["certs"],                                # 검색용
        "salary": {"junior": j["salary"]["junior"]},                             # 카드 하단 신입 연봉대
        "ai": {"level": j["ai"]["level"]},                                       # 카드 AI 배지 · 'AI 영향 낮은 직무만' 필터
        "nonmajorOk": j["nonmajorOk"], "draftOnly": j["draftOnly"],
        "mj": j["mj"], "mf": (j.get("major") or {}).get("fields", []), "deg": (j.get("major") or {}).get("degree", ""),   # 전공 단계 표시 · 진단 매칭
        "mm": (j.get("major") or {}).get("majors", []),                         # 진단: 꼭 맞는 학과 키 (data/majors.json)
        "sources": {"count": s.get("count", 0), "public": s.get("public", 0), "industries": s.get("industries", [])},  # 근거 배지·필터·업종 검색
        "gc": _gc(j["group"]),                                                   # 웹 카드 그림 색 [액센트, 배경] (공유 이미지는 카톡 전용)
    }


# 뉴스 태그(ai_tags) → 직무 id. 최근 45일 아카이브에서 직무별 최신 3건을 jobs.json 에 news 로 붙인다 (상세 패널·직무 페이지에 표시)
NEWS_TAG_MAP = {
    "인사": ["hr", "recruiter", "general-affairs"],
    "영업": ["b2b-sales", "overseas-sales", "sales-management", "ecommerce-sales", "pharma-sales", "saas-sales", "technical-sales", "trading"],
    "재무": ["finance", "accounting", "corporate-finance", "bank", "risk-management", "policy-finance", "fund-ops"],
    "기획": ["strategy", "biz-planning", "sales-planning", "consulting", "bd", "esg"],
    "PM": ["service-planning", "it-planning", "cx"],
    "MD": ["md", "online-md"],
    "구매": ["purchasing", "scm", "forwarding"],
    "마케팅": ["brand-marketer", "performance-marketer", "content-marketer", "pr", "ad-planner"],
    "개발": ["sw-dev", "backend", "frontend", "embedded-sw", "ai-engineer", "data-engineer", "data-analyst", "qa", "erp-sap"],
    "디자인": ["ux-designer"],
    "생산": ["production-mgmt", "production-tech", "process-tech", "equipment-eng", "semiconductor-pkg"],
    "연구": ["rnd-chem", "battery-dev", "device-rnd", "product-dev", "rnd-food", "rnd-bio", "bio-process", "circuit-design"],
    "품질": ["quality", "reliability", "safety", "environment-eng", "gmp-qa"],
    "건설": ["construction-mgmt", "civil-eng", "plant-epc", "equipment-pm", "plant-design"],
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
    print(f"관련 뉴스: 직무 {n}개에 최근 {days}일 기사 연결")


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
.masthead .brand-name { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); display:flex; align-items:center; flex-wrap:wrap; gap:4px 12px; }
.masthead .brand-name::before { content:""; width:8px; height:8px; border-radius:50%; background:#c6ff3d; display:inline-block; }
.masthead .brand-en { font-family:"Archivo",sans-serif; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; background:none; color:var(--muted); padding:0; margin-left:0; }
/* 영어 → 한글 순서: "Career Briefing · 한 줄 설명" */
.masthead .brand-ko { margin-left:-6px; }
.masthead .brand-ko::before { content:"· "; }
/* 좁은 화면: 한글 설명을 다음 줄로 내리고 점 대신 글자 시작선에 맞춤 */
@media (max-width:560px) { .masthead .brand-ko { flex-basis:100%; margin-left:20px; } .masthead .brand-ko::before { content:none; } }
.stamp { font-family:"Archivo","Noto Sans KR",sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.theme-btn { font-family:"Archivo",sans-serif; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; }
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
        f'<div class="zf-links"><a href="{root}salary/index.html">연봉 연구소</a><a href="{root}play/index.html">연봉 놀이터</a><a href="{root}company/index.html">회사 판단 연구소</a><a href="{root}index.html">직무사전</a><a href="{root}news/index.html">취업뉴스</a><a href="{root}zorro/index.html">취업조로와 함께하기</a><a href="{root}{APPLY}">무료 상담 신청</a>'
        f'<a href="{c["home"]}" target="_blank" rel="noopener">취업조로 홈</a>'
        f'<a href="{root}privacy/index.html">개인정보처리방침</a></div>'
        f'<div class="zf-box"><b>법인명(상호)</b> {c["name"]} &nbsp;·&nbsp; <b>대표자</b> {c["ceo"]} &nbsp;·&nbsp; <b>개인정보보호책임자</b> {c["privacy"]}<br>'
        f'<b>사업자등록번호</b> {c["reg"]}<br><b>주소</b> {c["addr"]}<br>© Copyright 2026 All rights reserved by CAREERPROJECT inc.</div>'
        f'{f"<p class=\"zf-note\">{note}</p>" if note else ""}</div></footer>'
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
            if m["level"] == "prep" and not m.get("prep"):
                warn.append(f"{jid}: 준비 필요 직무인데 '준비할 것' 문구 없음")
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
    # 로고는 data URI 로 페이지마다 박지 않고 site/assets/ 의 파일을 참조한다 (nav_html/footer_html 이 root 를 붙여 깊이별 상대경로로 만든다)
    logo = "assets/jobzorro_logo.png"            # 푸터: 취업조로
    logo_nav = "assets/teamzorro_logo_halo.png"  # 맨 위 탭바만 TEAM ZORRO CI — 흰 테두리를 그림에 넣은 판 (폰 '웹사이트 어둡게'는 그림만 안 바꿔 검은 로고가 묻힘, 2026-10-22)
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
                # 상단 띠 숫자: 직무·인터뷰가 늘면 자동으로 바뀐다
                .replace("/*__N_DOCS__*/", f'{data["meta"].get("sourceDocs", 0):,}')
                .replace("/*__N_PUBLIC__*/", f'{sum(j["sources"].get("public", 0) for j in data["jobs"]):,}')
                .replace("/*__N_JOBS__*/", str(len(data["jobs"])))
                .replace("/*__N_GROUPS__*/", str(len(data["meta"]["groups"])))
                .replace("/*__TICKER__*/", ticker_spans(TICK["home"]))
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
        # 2026-10-27 사용자: 카톡 미리보기를 섹션마다 다른 그림·이야기로 (오른쪽 그림 art)
        n_sal = _salary_count()
        seo.og_image(share / "og-news.png", "취업조로의\n커리어브리핑", "채용·이직·기업·고용 뉴스를 매일 아침 고르고\nZorro의 한마디를 붙입니다", "취업뉴스", "매일 아침 고른", art="news")
        seo.og_image(share / "og-zorro.png", "취업조로와\n함께하기", "신입·중고신입·경력이직·선퇴사자\n1:1 맞춤 컨설팅 · 무료 상담", "TEAM ZORRO", "뽑고 싶은 인재의 비밀", art="zorro")
        seo.og_image(share / "og-salary.png", "내 연차면\n얼마 받을까", f"회사 {n_sal} 곳의 사원~부장 추정 연봉\n업계 순위 · 연봉 계산기", "연봉 연구소", "그 회사,", art="salary")
        seo.og_image(share / "og-company.png", "이직할까 말까\n내 상황으로", "연차·연봉을 넣으면 평점·연봉·재무를 보고\n갈지 말지 Zorro가 정해 드려요", "회사 판단 연구소", "합격한 그 회사, 나라면?", art="company")
        seo.og_image(share / "og-play.png", "오늘의 도전\n연봉 놀이터", "어디가 더 많이 줄까 · 오늘의 회사 · 연봉 스나이퍼\n매일 순위와 명예의 전당", "연봉 놀이터", "회사 연봉으로 하는 게임", art="play")
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
    og_salary, og_company, og_play = share_url("og-salary.png"), share_url("og-company.png"), share_url("og-play.png")
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

    # 직무 비교 / 직무 진단
    for tpl_name, sub, title, desc in (
        ("template_compare.html", "compare", "직무 비교 — 두 직무를 나란히 | 취업조로 직무사전", "연봉대·필요 역량·들어가는 길·커리어 패스를 한 화면에서 비교합니다."),
        ("template_fit.html", "fit", "1분 직무 진단 — 내 전공·학력으로 갈 수 있는 직무 | 취업조로 직무사전", f"학력·전공 학과(복수전공·부전공)·성향·원하는 것으로 직무 {len(data['jobs'])}개 중 바로 지원할 직무와 준비하면 열리는 직무를 골라 드립니다."),
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
    ix = seo.seo_head(base_url, f"면접 질문 모음 — 공통 빈출 TOP 20 + {len(data['jobs'])}개 직무 단골 질문 | 취업조로 직무사전",
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
    # 관리 화면은 이메일 로그인 어드민으로 옮김 (2026-10-21). 원본 template_admin.html 은
    # company-check/admin/build_jobs_page.py 가 읽어 어드민 안 /jobs 로 만든다. 여기엔 옮긴 곳 안내만.
    (out_dir / "admin").mkdir(exist_ok=True)
    (out_dir / "admin" / "index.html").write_text(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">'
        '<meta http-equiv="refresh" content="0;url=https://company-admin.jobzorro.workers.dev/jobs"><title>관리 화면</title></head>'
        '<body><p>관리 화면이 옮겨졌어요. <a href="https://company-admin.jobzorro.workers.dev/jobs">여기로 이동</a></p></body></html>\n',
        encoding="utf-8")
    seo.write_robots(out_dir, base_url)
    seo.write_llms(out_dir, base_url, data["jobs"], data["meta"]["groups"], updated, data["meta"].get("sourceDocs", 0))
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
        n = n.replace('<div class="controls">', '<div class="v2-ticker" aria-hidden="true"><div class="v2-ticker-track">' + ticker_spans(TICK["news"]) + '</div></div><div class="controls">', 1)   # 히어로 → 검은 띠 → 탭 (연봉 연구소와 같은 순서)
        foot = FIT_JS + OUTRO_HTML + footer_html("../", logo, "뉴스 원문의 저작권은 각 언론사에 있으며, 이 페이지는 제목·요약과 원문 링크만 싣습니다.") + fab_html("../")
        n = n.replace("</body>", foot + "</body>", 1)
        news_ld = [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/")]),
                   {"@context": "https://schema.org", "@type": "WebPage", "@id": seo.abs_url(base_url, "news/"), "name": "취업조로의 커리어브리핑", "inLanguage": "ko",
                    "description": "취업조로가 매일 아침 고르는 채용·이직·기업·고용 뉴스와 한마디", "isPartOf": {"@id": seo.abs_url(base_url, "#website")}, "author": {"@id": seo.abs_url(base_url, "zorro/#person")}}]
        n = re.sub(r'<meta property="og:image" content="assets/favicon-180.png">', '', n, count=1)
        # 카톡 미리보기 설명 (2026-10-27 사용자: 섹션마다 각자의 이야기)
        news_desc = "채용·이직·기업·고용 뉴스 중 내 커리어에 영향을 주는 것만 매일 아침 골라, 취업조로의 한마디와 함께 정리해 드려요. 주간·월간 랭킹도 한눈에."
        n = re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*(")', lambda m: m.group(1) + news_desc + m.group(2), n)
        n = n.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&family=Archivo:wght@700;900&display=swap">'
                      + f'<link rel="canonical" href="{seo.abs_url(base_url, "news/")}"><meta property="og:url" content="{seo.abs_url(base_url, "news/")}"><meta property="og:type" content="website"><meta property="og:site_name" content="취업조로"><meta property="og:locale" content="ko_KR"><meta property="og:image" content="{og_news}"><meta name="twitter:image" content="{og_news}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="author" content="조현빈 (취업조로)">' + seo.verify_tags()
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

    # ---- 연봉 연구소 (/salary/): salary-lab/publish_to_site.py 가 만든 salary/ 를 복사하고 상단 메뉴를 붙인다
    sal = BASE / "salary"
    if sal.exists():
        dst = out_dir / "salary"; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(sal, dst)
        zn_css = "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith((".zn", "@media (max-width:480px) { .zn", "@media (max-width:640px) { .zn")))
        zn_css = ".zn{--paper:var(--bg);--hairline:var(--line);--acc-ink:#0b0b0b}\n" + zn_css
        # 다크모드에서 검은 TEAM ZORRO 로고가 안 보이지 않게 흰색으로 (뉴스 페이지와 같은 규칙)
        zn_css += "\n@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }"
        # '숫자로 보는 회사들' 01·02 같은 테두리 숫자: 폰에서 1.5px 선이 다크·'웹사이트 어둡게'에서 흐려 보여 굵게 (2026-10-22 사용자)
        zn_css += "\n.sec-head .num:not(.sym) { -webkit-text-stroke-width:2px; }"
        def add_nav(path, root):
            h = path.read_text(encoding="utf-8")
            if 'class="zn"' in h:
                return
            h = h.replace("</style>", zn_css + "\n</style>", 1)
            h = h.replace("<body>", "<body>\n" + nav_html("salary/index.html", root, logo_nav), 1) if "<body>" in h else nav_html("salary/index.html", root, logo_nav) + h
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
        for d in cos:
            add_nav(d / "index.html", "../../../")
            p = d / "index.html"; h = p.read_text(encoding="utf-8")
            if 'property="og:image"' not in h:
                p.write_text(h.replace("</head>", og_tags + "</head>", 1), encoding="utf-8")
        entries.append(("salary/", updated, "monthly", "0.8"))
        entries += [(f"salary/co/{urllib.parse.quote(d.name)}/", updated, "monthly", "0.5") for d in cos]
        print(f"연봉 연구소: /salary/ + 회사 페이지 {len(cos):,}개")
    # 2026-10-21 사용자: 법적·평판 리스크 대비 안내 (판정은 공개 자료 기반 참고용 의견, 출처·기준일 표기, 정정 창구)
    COMPANY_NOTE = ("회사 판단 연구소의 판정과 'Zorro의 한마디'는 금융감독원 전자공시(DART), 국민연금 가입 사업장 내역, 잡플래닛·블라인드·캐치 공개 평점, 언론 보도 등 "
                    "공개된 자료를 모아 취업조로 기준으로 정리한 참고용 의견입니다. 회사의 공식 입장이나 사실 확정이 아니며, 항목마다 출처와 기준일을 함께 표기합니다. "
                    "평점·후기 원문은 각 사이트에서 확인할 수 있습니다. 사실과 다른 내용은 회사 화면 아래 '정정 요청하기'로 알려 주시면 확인 후 고치거나 내립니다.")
    # ---- 회사 판단 연구소 (/company/): company-check/publish_to_site.py 가 만든 company/ 를 복사하고 상단 메뉴를 붙인다
    comp = BASE / "company"
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
            # 시안용 푸터 → 사이트 공용 푸터 (다크모드 로고 흰색 등 다른 페이지와 같게)
            h = re.sub(r"<!--FOOT-->.*?<!--/FOOT-->", lambda m: footer_html("../", logo, COMPANY_NOTE), h, count=1, flags=re.S)
            (dst / "index.html").write_text(h, encoding="utf-8")
        entries.append(("company/", updated, "daily", "0.8"))
        with open(out_dir / "llms.txt", "a", encoding="utf-8") as f:
            f.write(f"\n## 회사 판단 연구소\n- [회사 판단 연구소]({base_url}company/): 합격한 회사가 갈 만한지 잡플래닛·블라인드·캐치 평점, 직급별 연봉, DART 5개년 재무(별도), 최근 뉴스, AI 영향을 보고 상·중·하와 'Zorro의 한마디'로 판단\n")
        co_dir = dst / "data" / "co"  # API 모드면 조각 파일이 없음 (회사 상세는 Cloudflare Worker가 줌)
        print(f"회사 판단 연구소: /company/ (" + (f"데이터 조각 {len(list(co_dir.iterdir()))}개" if co_dir.exists() else "회사 상세는 API") + ")")
    # ---- 연봉 놀이터 (/play/): salary-lab/play/publish_to_site.py 가 만든 play/ 를 복사하고 상단 메뉴를 붙인다 (순위표는 play-api Worker)
    play = BASE / "play"
    if (play / "index.html").exists():
        dst = out_dir / "play"; shutil.rmtree(dst, ignore_errors=True); shutil.copytree(play, dst)
        zn_css = "\n".join(l for l in SHARED_CSS.splitlines() if l.startswith((".zn", "@media (max-width:480px) { .zn", "@media (max-width:640px) { .zn")))
        zn_css = ".zn{--paper:var(--bg);--hairline:var(--line)}\n" + zn_css
        zn_css += "\n@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }"
        h = (dst / "index.html").read_text(encoding="utf-8")
        h = re.sub(r'<title>[^<]*</title>|<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>|<link rel="canonical"[^>]*>', "", h)
        h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + seo.seo_head(base_url, "연봉 놀이터 — 회사 연봉으로 하는 오늘의 게임 | 취업조로",
            "어디가 더 많이 줄까, 오늘의 회사, 연봉 스나이퍼, 이직 로드 10년, 드림 컴퍼니 월드컵. 매일 같은 문제로 겨루는 오늘의 도전 순위와 명예의 전당.",
            "play/", og_play), 1)
        if 'class="zn"' not in h:
            h = h.replace("</style>", zn_css + "\n</style>", 1)
            h = h.replace("<body>", "<body>\n" + nav_html("play/index.html", "../", logo_nav), 1)
        (dst / "index.html").write_text(h, encoding="utf-8")
        entries.append(("play/", updated, "daily", "0.7"))
        with open(out_dir / "llms.txt", "a", encoding="utf-8") as f:
            f.write(f"\n## 연봉 놀이터\n- [연봉 놀이터]({base_url}play/): 연봉 연구소 자료로 하는 매일 게임 5종(어디가 더 많이 줄까·오늘의 회사·연봉 스나이퍼·이직 로드 10년·드림 컴퍼니 월드컵), 오늘의 도전 순위와 명예의 전당\n")
        print("연봉 놀이터: /play/")
    seo.write_sitemap(out_dir, base_url, entries)
    audit_links(data, BASE / "assets" / "share")
    print(f"인앱 브라우저 → 기본 브라우저 전환: {add_inapp(out_dir)}개 페이지")
    print(f"다크모드 지원 표시(color-scheme): {add_color_scheme(out_dir)}개 페이지")
    print(f"앱(PWA) 설치 연결: {pwa.add_pwa(out_dir, base_url)}개 페이지 (manifest·sw.js)")
    print(f"sitemap.xml: URL {len(entries)}개 -> {out_dir / 'sitemap.xml'}")


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


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=BASE / "site", type=Path)
    ap.add_argument("--no-news", action="store_true")
    a = ap.parse_args()
    build(a.out, not a.no_news)
