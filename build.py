"""
세 페이지짜리 정적 사이트를 만든다 (취업조로 스타일, 공용 상단 탭·푸터).

  site/index.html        직무사전   <- data/jobs.json + template.html
  site/news/index.html   취업뉴스   <- news-collector/site/index.html 에 상단 탭만 끼워 넣음
                                    (news-collector/collect_news.py → build_site.py 로 먼저 만든다)
  site/zorro/index.html  취업조로와 함께하기 <- template_zorro.html

사용법:
  python build.py                # 세 페이지 모두
  python build.py --no-news      # 뉴스 수집기 결과물이 없을 때
"""

import argparse
import base64
import seo
import json
import os
import re
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = Path(__file__).parent
ASSETS = BASE / "assets"
NEWS_SRC = BASE / "news-collector" / "site" / "index.html"
# 뉴스 수집기 결과물이 없을 때 배포된 뉴스 페이지를 내려받아 쓰는 비상용 (Actions 워크플로가 첫 실행 때만 사용)
NEWS_URL = os.environ.get("NEWS_URL", "")  # 예: https://jobzorro.github.io/career-briefing/
NEWS_ASSET_NAMES = ["logo.png", "logo-dark.png", "teamzorro.png", "mark.png", "favicon-32.png", "favicon-180.png"]


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

TABS = [("index.html", "직무사전"), ("news/index.html", "취업뉴스"), ("zorro/index.html", "취업조로와 함께하기")]
APPLY = "apply/index.html"   # 무료 상담 신청 폼 (모든 "무료 상담 신청하기" 버튼이 여기로 간다)


def data_uri(path: Path, mime="image/png") -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


# 모든 페이지가 공유하는 CSS: 색 토큰, 기본 글꼴, 상단 탭(zn-), 푸터(zf-), 하단 상담 버튼(zfab), 배지·버튼
SHARED_CSS = """
/* 취업뉴스(커리어브리핑)와 같은 편집 디자인 톤: 먹색 글자, 종이색 바탕, 황동색 포인트, 라벨·숫자는 모노 글꼴, 다크모드 지원 */
:root { --ink:#111827; --ink-soft:#374151; --muted:#6b7280; --faint:#9ca3af; --brass:#8b6b3f; --brass-tint:rgba(139,107,63,.09); --brass-bar:rgba(139,107,63,.22);
  --paper:#ffffff; --ground:#f9fafb; --mist:#f7f9fc; --hairline:#e5e7eb; --hairline-2:#d5dae2;
  /* 아래는 기존 템플릿이 쓰는 이름 → 위 토큰에 연결 */
  --bg:var(--ground); --surface:var(--paper); --surface-2:var(--mist); --black:var(--ink); --fg-soft:var(--ink-soft); --line:var(--hairline); --line-strong:var(--hairline-2);
  --red:var(--brass); --red-soft:var(--brass-tint); --yellow:var(--brass-bar); --green:#1baf7a; --green-soft:rgba(27,175,122,.12);
  --lvl1:#1baf7a; --lvl2:#eda100; --lvl3:#b4453a;
  /* 먹색으로 채운 큰 카드(히어로 옆 카드·CTA·상담 박스)와 작은 채움 요소(칩·아이콘·버튼) */
  --inkbg:#111827; --inkfg:#ffffff; --inkfg-soft:rgba(255,255,255,.72); --inkline:rgba(255,255,255,.28);
  --fill:#111827; --fillfg:#ffffff; --logo-filter:none;
  --shadow:0 1px 3px rgba(17,24,39,.06); --shadow-lift:0 18px 50px rgba(17,24,39,.18);
  --font:"Inter","Noto Sans KR","Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  --serif:"Playfair Display","Noto Serif KR",Georgia,serif; --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ink:#e9ecf3; --ink-soft:#c3c9d6; --muted:#939bab; --faint:#6c7486; --brass:#c9a063; --brass-tint:rgba(201,160,99,.14); --brass-bar:rgba(201,160,99,.30);
  --paper:#191d26; --ground:#12141a; --mist:#161a22; --hairline:#2b313d; --hairline-2:#3a4150; --green:#199e70; --lvl2:#c98500; --lvl3:#e0796c;
  --inkbg:#232a38; --inkfg:#e9ecf3; --inkfg-soft:rgba(233,236,243,.7); --inkline:rgba(233,236,243,.25); --fill:#e9ecf3; --fillfg:#12141a; --logo-filter:invert(1);
  --shadow:0 1px 3px rgba(0,0,0,.35); --shadow-lift:0 18px 50px rgba(0,0,0,.5); } }
:root[data-theme="dark"] { --ink:#e9ecf3; --ink-soft:#c3c9d6; --muted:#939bab; --faint:#6c7486; --brass:#c9a063; --brass-tint:rgba(201,160,99,.14); --brass-bar:rgba(201,160,99,.30);
  --paper:#191d26; --ground:#12141a; --mist:#161a22; --hairline:#2b313d; --hairline-2:#3a4150; --green:#199e70; --lvl2:#c98500; --lvl3:#e0796c;
  --inkbg:#232a38; --inkfg:#e9ecf3; --inkfg-soft:rgba(233,236,243,.7); --inkline:rgba(233,236,243,.25); --fill:#e9ecf3; --fillfg:#12141a; --logo-filter:invert(1);
  --shadow:0 1px 3px rgba(0,0,0,.35); --shadow-lift:0 18px 50px rgba(0,0,0,.5); }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--font); font-size:15px; line-height:1.6; -webkit-font-smoothing:antialiased; word-break:keep-all; overflow-wrap:break-word; padding-bottom:96px; }
h1,h2,h3 { margin:0; font-weight:800; letter-spacing:-.03em; text-wrap:balance; }
p { margin:0; } ul,ol { margin:0; padding:0; list-style:none; } a { color:inherit; }
button { font:inherit; color:inherit; background:none; border:0; cursor:pointer; }
button:focus-visible,input:focus-visible,[tabindex]:focus-visible,a:focus-visible { outline:2px solid var(--brass); outline-offset:3px; border-radius:3px; }
.wrap { max-width:1120px; margin:0 auto; padding-inline:20px; }
/* 라벨(모노·대문자 느낌)과 숫자 */
.kicker { font-family:var(--font); font-size:12px; font-weight:600; letter-spacing:.01em; color:var(--ink-soft); }
.badge { display:inline-flex; align-items:center; gap:4px; font-family:var(--font); font-size:11.5px; font-weight:700; letter-spacing:0; padding:3px 9px; border-radius:6px; background:var(--brass-tint); color:var(--brass); white-space:nowrap; }
.badge.soft { background:var(--brass-tint); color:var(--brass); } .badge.green { background:var(--green-soft); color:var(--green); } .badge.gray { background:var(--mist); color:var(--muted); border:1px solid var(--hairline); }
.btn { display:inline-flex; align-items:center; gap:6px; padding:10px 16px; border-radius:8px; font-size:14px; font-weight:700; text-decoration:none; }
.btn.primary { background:var(--inkfg); color:var(--inkbg); } .btn.primary:hover { background:var(--brass); color:#fff; }
.btn.ghost { border:1px solid var(--inkline); color:var(--inkfg); }
/* 공용 상단 탭 (취업뉴스 페이지에도 끼워 넣으므로 .zn 규칙은 뉴스 페이지에도 있는 토큰만 쓴다: --paper --ink --muted --hairline --brass) */
.zn { position:sticky; top:env(safe-area-inset-top,0px); z-index:20; background:var(--paper); color:var(--ink); border-bottom:1px solid var(--hairline); font-family:"Inter","Noto Sans KR",sans-serif; }
.zn-in { max-width:1120px; margin:0 auto; padding:0 20px; display:flex; align-items:center; gap:16px; height:54px; }
.zn-logo { display:flex; align-items:center; flex:none; }
.zn-logo img { height:22px; width:auto; filter:var(--logo-filter,none); display:block; }
.zn-tabs { display:flex; gap:2px; height:100%; margin-left:6px; min-width:0; overflow-x:auto; scrollbar-width:none; }
.zn-tabs::-webkit-scrollbar { display:none; }
.zn-tabs a { display:flex; align-items:center; padding:0 12px; font-size:13.5px; font-weight:600; color:var(--muted); text-decoration:none; white-space:nowrap; border-bottom:2px solid transparent; }
.zn-tabs a:hover { color:var(--ink); }
.zn-tabs a.on { color:var(--ink); border-bottom-color:var(--brass); }
.zn-cta { margin-left:auto; flex:none; font-size:12.5px; font-weight:700; color:var(--paper); background:var(--ink); border-radius:8px; padding:8px 13px; text-decoration:none; white-space:nowrap; }
.zn-cta:hover { background:var(--brass); color:#fff; }
@media (max-width:640px) { .zn-cta { display:none; } .zn-in { gap:10px; padding:0 14px; } .zn-logo img { height:19px; } .zn-tabs a { padding:0 9px; font-size:13px; } }
/* 공용 푸터 (뉴스 푸터처럼 먹색 윗선 + 종이색) */
.zf { margin-top:72px; background:var(--paper); color:var(--ink); border-top:1px solid var(--ink); font-family:var(--font); }
.zf-in { max-width:1120px; margin:0 auto; padding:36px 20px 44px; }
.zf-logo img { height:20px; width:auto; filter:var(--logo-filter,none); display:block; }
.zf-links { display:flex; flex-wrap:wrap; gap:16px; font-size:12.5px; margin-top:18px; color:var(--ink-soft); }
.zf-links a { text-decoration:none; } .zf-links a:hover { color:var(--brass); }
.zf-box { margin-top:18px; background:var(--mist); border:1px solid var(--hairline); border-radius:10px; padding:14px 16px; font-size:12px; line-height:1.9; color:var(--muted); }
.zf-box b { color:var(--ink-soft); font-weight:600; }
.zf-note { margin-top:14px; font-size:12px; color:var(--muted); line-height:1.75; max-width:80ch; }
/* 하단 고정 상담 버튼 */
.zfab { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(18px + env(safe-area-inset-bottom,0px)); z-index:25; }
.zfab a { display:inline-flex; align-items:center; gap:6px; background:var(--fill); color:var(--fillfg); border-radius:999px; padding:13px 26px; font-size:14px; font-weight:800; text-decoration:none; box-shadow:var(--shadow-lift); font-family:var(--font); }
.zfab a:hover { background:var(--brass); color:#fff; }
"""


# 취업뉴스 페이지에 끼울 때 덮어쓰는 스타일 (보조 글자 선명하게). 제호는 build_site.py 의 .hero-top 이 그린다
NEWS_MASTHEAD_CSS = """
/* 보조 글자 선명하게: 모노·흐린 회색 라벨을 고딕 12px 진회색으로, 숫자는 Inter 굵게 */
.eyebrow { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12.5px; font-weight:600; letter-spacing:0; color:var(--ink-soft); padding:8px 15px; }
.funnel-num { font-family:"Inter","Noto Sans KR",sans-serif; font-size:28px; font-weight:800; letter-spacing:-.03em; }
.funnel-label { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12px; font-weight:600; letter-spacing:0; text-transform:none; color:var(--ink-soft); margin-top:5px; }
.picks-note, .pick-sector, .foot-label { font-family:"Inter","Noto Sans KR",sans-serif; font-size:11.5px; font-weight:700; letter-spacing:.02em; text-transform:none; }
.picks-note, .foot-label { color:var(--muted); }
.stamp, .foot-note { font-family:"Inter","Noto Sans KR",sans-serif; font-size:12px; font-weight:500; letter-spacing:0; text-transform:none; color:var(--muted); }
"""


def nav_html(active: str, root: str, logo: str) -> str:
    tabs = "".join(
        f'<a href="{root}{href}"{" class=\"on\"" if href == active else ""}>{label}</a>' for href, label in TABS
    )
    theme = "<script>try{var t=localStorage.getItem('cb-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>"
    return (
        theme + f'<header class="zn"><div class="zn-in"><a class="zn-logo" href="{root}index.html"><img src="{logo}" alt="TEAM ZORRO"></a>'
        f'<nav class="zn-tabs" aria-label="사이트 탭">{tabs}</nav>'
        f'<a class="zn-cta" href="{root}{APPLY}">무료 상담 신청하기 ⚡</a></div></header>'
    )


def footer_html(root: str, logo: str, note: str) -> str:
    c = COMPANY
    return (
        f'<footer class="zf"><div class="zf-in"><a class="zf-logo" href="{c["home"]}" target="_blank" rel="noopener"><img src="{logo}" alt="취업조로"></a>'
        f'<div class="zf-links"><a href="{root}index.html">직무사전</a><a href="{root}news/index.html">취업뉴스</a><a href="{root}zorro/index.html">취업조로와 함께하기</a><a href="{root}{APPLY}">무료 상담 신청</a>'
        f'<a href="{c["home"]}" target="_blank" rel="noopener">취업조로 홈</a>'
        f'<a href="{root}privacy/index.html">개인정보처리방침</a></div>'
        f'<div class="zf-box"><b>법인명(상호)</b> {c["name"]} &nbsp;·&nbsp; <b>대표자</b> {c["ceo"]} &nbsp;·&nbsp; <b>개인정보보호책임자</b> {c["privacy"]}<br>'
        f'<b>사업자등록번호</b> {c["reg"]}<br><b>주소</b> {c["addr"]}<br>© Copyright 2026 All rights reserved by CAREERPROJECT inc.</div>'
        f'{f"<p class=\"zf-note\">{note}</p>" if note else ""}</div></footer>'
    )


def fab_html(root: str) -> str:
    return f'<div class="zfab"><a href="{root}{APPLY}">무료 상담 신청하기 ⚡</a></div>'


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
    logo = data_uri(ASSETS / "jobzorro_logo.png")
    logo_nav = data_uri(ASSETS / "teamzorro_logo.png")   # 맨 위 탭바만 TEAM ZORRO CI, 푸터는 취업조로
    n_jobs = len(data["jobs"])
    n_evidence = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    data["meta"]["evidenceTotal"] = n_evidence
    disclaimer = data["meta"]["disclaimer"]

    # 1) 직무사전
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (BASE / "template.html").read_text(encoding="utf-8")
    # site_cfg 는 아래(zorro 블록 앞)에서 읽지만 첫 페이지 SEO 에도 필요하므로 여기서 먼저 읽는다
    _cfg = json.loads((BASE / "data" / "site.json").read_text(encoding="utf-8"))
    _base = _cfg.get("baseUrl") or "https://jobzorro.github.io/jobzorro-site/"
    seo.VERIFY = _cfg.get("verification", {}) or {}
    _n_jobs = len(data["jobs"]); _n_ev = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    html = html.replace("/*__SEO__*/", seo.seo_head(_base, f"취업조로 직무사전 — 직무 {_n_jobs}개, 현직자 인터뷰·자료 {_n_ev:,}건으로 정리한 직무 설명",
        f"취업·이직 컨설턴트 취업조로가 현직자 인터뷰 {_n_ev:,}건을 바탕으로 정리한 직무사전. 하는 일, 하루 일과, 연봉대, 들어가는 길, 옮겨갈 수 있는 직무, 면접 질문, 현직자의 말까지 직무 {_n_jobs}개를 한 곳에서.",
        "", seo.abs_url(_base, "assets/og.png"), [seo.org_ld(_base, COMPANY), seo.website_ld(_base)]))
    for ph in ("/*__JOBS_JSON__*/", "/*__NAV__*/", "/*__FOOTER__*/", "/*__FAB__*/", "/*__SHARED_CSS__*/"):
        if ph not in html:
            raise SystemExit(f"template.html 에 {ph} 가 없습니다")
    html = (html.replace("/*__SHARED_CSS__*/", SHARED_CSS)
                .replace("/*__NAV__*/", nav_html("index.html", "", logo_nav))
                .replace("/*__FOOTER__*/", footer_html("", logo, disclaimer))
                .replace("/*__FAB__*/", fab_html(""))
                .replace("/*__JOBS_JSON__*/", payload))
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(html, encoding="utf-8")
    print(f"직무사전: 직무 {n_jobs}개 · 직군 {len(data['meta']['groups'])}개 · 근거 {n_evidence}건 -> {out_dir / 'index.html'}")

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
    import shutil as _sh
    for name in ("og.png", "og-news.png", "og-zorro.png", "og-apply.png"):
        if (share / name).exists(): _sh.copy(share / name, out_dir / "assets" / name)
    if (share / "jobs").exists():
        _sh.copytree(share / "jobs", out_dir / "assets" / "og", dirs_exist_ok=True)
    for name in ("favicon-32.png", "favicon-180.png"):
        src = BASE / "news-collector" / "assets" / name
        if src.exists(): (out_dir / "assets" / name).write_bytes(src.read_bytes())
    og_main = seo.abs_url(base_url, "assets/og.png")
    og_news, og_zorro, og_apply = (seo.abs_url(base_url, f"assets/og-{k}.png") for k in ("news", "zorro", "apply"))
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

    # ---- 직무별 정적 페이지 (SEO·GEO) ----
    tpl = (BASE / "template.html").read_text(encoding="utf-8")
    css = tpl[tpl.index("<style>") + 7:tpl.index("</style>")].replace("/*__SHARED_CSS__*/", SHARED_CSS) + seo.JOB_PAGE_CSS
    fonts = tpl[tpl.index('<link rel="preconnect"'):tpl.index("<style>")]
    entries = [("", updated, "daily", "1.0"), ("news/", updated, "daily", "0.9"), ("zorro/", updated, "monthly", "0.8"), ("apply/", updated, "monthly", "0.6")]
    for j in data["jobs"]:
        jid = j["id"]
        if seo.fonts_available():
            seo.og_image(share / "jobs" / f"{jid}.png", j["name"], j["tagline"], f"취업조로 직무사전 · {gname.get(j['group'], '')}", "채용공고엔 안 나오는 진짜 모습")
            _sh.copy(share / "jobs" / f"{jid}.png", out_dir / "assets" / "og" / f"{jid}.png")
        ld = seo.job_ld(base_url, j, by_id, data["meta"], gname.get(j["group"], ""), updated)
        head = seo.seo_head(base_url, f"{j['name']} 직무 — 하는 일·연봉·들어가는 길·현직자의 말 | 취업조로 직무사전",
                            f"{j['name']}: {j['tagline']}. {j['summary']}", f"jobs/{jid}/", seo.abs_url(base_url, f"assets/og/{jid}.png"), ld)
        body = seo.render_job_body(j, by_id, gname.get(j["group"], ""), updated, base_url)
        page = ("<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n"
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
                + head + "\n" + fonts + "<style>" + css + "</style>\n</head>\n<body>\n"
                + nav_html("index.html", "../../", logo_nav)
                + "<main class=\"jobpage\"><div class=\"d-body\">" + body + "</div></main>\n"
                + footer_html("../../", logo, disclaimer) + fab_html("../../") + "\n</body>\n</html>\n")
        d = out_dir / "jobs" / jid
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page, encoding="utf-8")
        entries.append((f"jobs/{jid}/", updated, "weekly", "0.8"))
    seo.write_sitemap(out_dir, base_url, entries)
    seo.write_robots(out_dir, base_url)
    seo.write_llms(out_dir, base_url, data["jobs"], data["meta"]["groups"], updated)
    print(f"직무 페이지 {len(data['jobs'])}개 + sitemap.xml · robots.txt · llms.txt -> {out_dir / 'jobs'}")
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
                                  "body { padding-bottom: 96px; }\n.zfab a { box-shadow: 0 8px 24px var(--shadow-lift); }\n</style>")
        inject = nav_css + nav_html("news/index.html", "../", logo_nav)
        n = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + inject, n, count=1)
        foot = footer_html("../", logo, "뉴스 원문의 저작권은 각 언론사에 있으며, 이 페이지는 제목·요약과 원문 링크만 싣습니다.") + fab_html("../")
        n = n.replace("</body>", foot + "</body>", 1)
        news_ld = [seo.breadcrumb_ld(base_url, [("직무사전", ""), ("취업뉴스 커리어브리핑", "news/")]),
                   {"@context": "https://schema.org", "@type": "WebPage", "@id": seo.abs_url(base_url, "news/"), "name": "취업조로의 커리어브리핑", "inLanguage": "ko",
                    "description": "취업조로가 매일 아침 고르는 채용·이직·기업·고용 뉴스와 한마디", "isPartOf": {"@id": seo.abs_url(base_url, "#website")}, "author": {"@id": seo.abs_url(base_url, "zorro/#person")}}]
        n = re.sub(r'<meta property="og:image" content="assets/favicon-180.png">', '', n, count=1)
        n = n.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&family=Noto+Serif+KR:wght@700&display=swap">'
                      + f'<link rel="canonical" href="{seo.abs_url(base_url, "news/")}"><meta property="og:url" content="{seo.abs_url(base_url, "news/")}"><meta property="og:image" content="{og_news}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="author" content="조현빈 (취업조로)">' + seo.verify_tags()
                      + "".join(seo.jsonld(o) for o in news_ld) + "</head>", 1)
        (out_dir / "news").mkdir(exist_ok=True)
        (out_dir / "news" / "index.html").write_text(n, encoding="utf-8")
        import shutil  # 뉴스 페이지가 참조하는 로고·파비콘도 함께 복사
        src_assets = news_src.parent / "assets"
        if src_assets.exists():
            shutil.copytree(src_assets, out_dir / "news" / "assets", dirs_exist_ok=True)
        if NEWS_URL:
            shutil.rmtree(news_src.parent, ignore_errors=True)
        print(f"취업뉴스: {NEWS_URL or NEWS_SRC} ({(out_dir / 'news' / 'index.html').stat().st_size:,} bytes) + 탭 -> {out_dir / 'news' / 'index.html'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=BASE / "site", type=Path)
    ap.add_argument("--no-news", action="store_true")
    a = ap.parse_args()
    build(a.out, not a.no_news)
