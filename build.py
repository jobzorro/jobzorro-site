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
.kicker { font-family:var(--mono); font-size:10.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.badge { display:inline-flex; align-items:center; gap:4px; font-family:var(--mono); font-size:10.5px; font-weight:600; letter-spacing:.04em; padding:3px 8px; border-radius:6px; background:var(--brass-tint); color:var(--brass); white-space:nowrap; }
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
.zf-note { margin-top:14px; font-family:var(--mono); font-size:10.5px; color:var(--faint); line-height:1.8; max-width:80ch; }
/* 하단 고정 상담 버튼 */
.zfab { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(18px + env(safe-area-inset-bottom,0px)); z-index:25; }
.zfab a { display:inline-flex; align-items:center; gap:6px; background:var(--fill); color:var(--fillfg); border-radius:999px; padding:13px 26px; font-size:14px; font-weight:800; text-decoration:none; box-shadow:var(--shadow-lift); font-family:var(--font); }
.zfab a:hover { background:var(--brass); color:#fff; }
"""


def nav_html(active: str, root: str, logo: str) -> str:
    tabs = "".join(
        f'<a href="{root}{href}"{" class=\"on\"" if href == active else ""}>{label}</a>' for href, label in TABS
    )
    theme = "<script>try{var t=localStorage.getItem('cb-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>"
    return (
        theme + f'<header class="zn"><div class="zn-in"><a class="zn-logo" href="{root}index.html"><img src="{logo}" alt="취업조로"></a>'
        f'<nav class="zn-tabs" aria-label="사이트 탭">{tabs}</nav>'
        f'<a class="zn-cta" href="{root}{APPLY}">무료 상담 신청하기 ⚡</a></div></header>'
    )


def footer_html(root: str, logo: str, note: str) -> str:
    c = COMPANY
    return (
        f'<footer class="zf"><div class="zf-in"><a class="zf-logo" href="{c["home"]}" target="_blank" rel="noopener"><img src="{logo}" alt="취업조로"></a>'
        f'<div class="zf-links"><a href="{root}index.html">직무사전</a><a href="{root}news/index.html">취업뉴스</a><a href="{root}zorro/index.html">취업조로와 함께하기</a><a href="{root}{APPLY}">무료 상담 신청</a>'
        f'<a href="{c["home"]}" target="_blank" rel="noopener">취업조로 홈</a><a href="https://job-zoro.imweb.me/?mode=policy" target="_blank" rel="noopener">이용약관</a>'
        f'<a href="https://job-zoro.imweb.me/?mode=privacy" target="_blank" rel="noopener">개인정보처리방침</a></div>'
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
    n_jobs = len(data["jobs"])
    n_evidence = data["meta"].get("sourceDocs", 0) + sum(j["sources"].get("public", 0) for j in data["jobs"])
    data["meta"]["evidenceTotal"] = n_evidence
    disclaimer = data["meta"]["disclaimer"]

    # 1) 직무사전
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (BASE / "template.html").read_text(encoding="utf-8")
    for ph in ("/*__JOBS_JSON__*/", "/*__NAV__*/", "/*__FOOTER__*/", "/*__FAB__*/", "/*__SHARED_CSS__*/"):
        if ph not in html:
            raise SystemExit(f"template.html 에 {ph} 가 없습니다")
    html = (html.replace("/*__SHARED_CSS__*/", SHARED_CSS)
                .replace("/*__NAV__*/", nav_html("index.html", "", logo))
                .replace("/*__FOOTER__*/", footer_html("", logo, disclaimer))
                .replace("/*__FAB__*/", fab_html(""))
                .replace("/*__JOBS_JSON__*/", payload))
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(html, encoding="utf-8")
    print(f"직무사전: 직무 {n_jobs}개 · 직군 {len(data['meta']['groups'])}개 · 근거 {n_evidence}건 -> {out_dir / 'index.html'}")

    # 2) 취업조로와 함께하기
    site_cfg = json.loads((BASE / "data" / "site.json").read_text(encoding="utf-8"))
    z = (BASE / "template_zorro.html").read_text(encoding="utf-8")
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
          .replace("/*__NAV__*/", nav_html("zorro/index.html", "../", logo))
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
    a = (a.replace("/*__SHARED_CSS__*/", SHARED_CSS)
          .replace("/*__NAV__*/", nav_html(APPLY, "../", logo))
          .replace("/*__FOOTER__*/", footer_html("../", logo, ""))
          .replace("/*__KAKAO_OPEN__*/", cfg_public["kakaoOpen"])
          .replace("/*__CONFIG__*/", json.dumps(cfg_public, ensure_ascii=False).replace("</", "<\\/"))
          .replace("/*__JOB_NAMES__*/", json.dumps(job_names, ensure_ascii=False).replace("</", "<\\/")))
    (out_dir / "apply").mkdir(exist_ok=True)
    (out_dir / "apply" / "index.html").write_text(a, encoding="utf-8")
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
            line + "\n" for line in SHARED_CSS.splitlines() if line.startswith((".zn", "@media (max-width:640px) { .zn"))) + (
            "@media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) { --logo-filter: invert(1); } } :root[data-theme=\"dark\"] { --logo-filter: invert(1); }\n"
        ) + "</style>"
        inject = nav_css + nav_html("news/index.html", "../", logo)
        n = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + inject, n, count=1)
        n = n.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap"></head>', 1)
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
