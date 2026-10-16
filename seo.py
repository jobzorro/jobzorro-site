"""
SEO · GEO(생성형 엔진 최적화) 보조 모듈 — build.py 가 쓴다.

- seo_head(): <title>·description·canonical·Open Graph·Twitter·robots·JSON-LD 를 한 덩어리로
- render_job_page(): 직무별 정적 페이지 (site/jobs/<id>/index.html) — 검색엔진·AI 가 직무 하나를 하나의 URL 로 읽게
- og_image(): 공유용 이미지 1200x630 (직무 이름이 들어간 버전 포함)
- sitemap / robots / llms.txt
"""
import html
import json
import os
import re
from datetime import date
from pathlib import Path

BASE = Path(__file__).parent
ASSETS = BASE / "assets"
AI_LABEL = {1: "낮음", 2: "보통", 3: "큼"}
VERIFY = {}   # build.py 가 site.json 의 verification 값을 넣는다 (google / naver)


def e(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def fmt(n) -> str:
    return f"{int(n):,}"


def rng(r) -> str:
    return f"{fmt(r[0])}~{fmt(r[1])}"


def abs_url(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


def jsonld(obj) -> str:
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def seo_head(base: str, title: str, desc: str, path: str, image: str, ld=None, noindex=False, extra="") -> str:
    """path 는 사이트 루트 기준 ('' = 첫 페이지, 'jobs/hr/' 등). image 는 절대 URL."""
    url = abs_url(base, path)
    desc = re.sub(r"\s+", " ", desc).strip()[:160]
    parts = [
        f"<title>{e(title)}</title>",
        f'<meta name="description" content="{e(desc)}">',
        f'<link rel="canonical" href="{e(url)}">',
        f'<meta name="robots" content="{"noindex,follow" if noindex else "index,follow,max-image-preview:large,max-snippet:-1"}">',
        '<meta name="author" content="조현빈 (취업조로)">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="취업조로">',
        '<meta property="og:locale" content="ko_KR">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{e(url)}">',
        f'<meta property="og:image" content="{e(image)}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(title)}">',
        f'<meta name="twitter:description" content="{e(desc)}">',
        f'<meta name="twitter:image" content="{e(image)}">',
        f'<link rel="icon" type="image/png" sizes="32x32" href="{e(abs_url(base, "assets/favicon-32.png"))}">',
        f'<link rel="apple-touch-icon" sizes="180x180" href="{e(abs_url(base, "assets/favicon-180.png"))}">',
    ]
    if VERIFY.get("google"):
        parts.append(f'<meta name="google-site-verification" content="{e(VERIFY["google"])}">')
    if VERIFY.get("naver"):
        parts.append(f'<meta name="naver-site-verification" content="{e(VERIFY["naver"])}">')
    for obj in (ld or []):
        parts.append(jsonld(obj))
    if extra:
        parts.append(extra)
    return "\n".join(parts)


# ───────────────────────── 공통 구조화 데이터 ─────────────────────────

def org_ld(base: str, company: dict) -> dict:
    return {
        "@context": "https://schema.org", "@type": "Organization",
        "@id": abs_url(base, "#org"),
        "name": company["name"], "alternateName": ["취업조로", "TEAM ZORRO", "커리어프로젝트"],
        "url": base, "logo": abs_url(base, "assets/og.png"),
        "founder": {"@type": "Person", "name": company["ceo"]},
        "address": {"@type": "PostalAddress", "streetAddress": company["addr"], "addressRegion": "경기도", "addressLocality": "용인시", "addressCountry": "KR"},
        "sameAs": ["https://jobzorro.kr/", "https://www.instagram.com/career_zorro", "https://www.youtube.com/@ZORROCAREER", "https://blog.naver.com/zorr0"],
    }


def person_ld(base: str) -> dict:
    return {
        "@context": "https://schema.org", "@type": "Person",
        "@id": abs_url(base, "zorro/#person"),
        "name": "조현빈", "alternateName": "취업조로",
        "jobTitle": "취업·이직 컨설턴트, 커리어프로젝트 주식회사 대표",
        "url": abs_url(base, "zorro/"),
        "worksFor": {"@id": abs_url(base, "#org")},
        "knowsAbout": ["취업 컨설팅", "이직 컨설팅", "자기소개서", "면접", "직무 분석", "기업분석", "경영기획", "전략기획"],
        "sameAs": ["https://jobzorro.kr/", "https://www.instagram.com/career_zorro", "https://www.youtube.com/@ZORROCAREER", "https://blog.naver.com/zorr0"],
    }


def website_ld(base: str) -> dict:
    return {
        "@context": "https://schema.org", "@type": "WebSite",
        "@id": abs_url(base, "#website"), "name": "취업조로 직무사전", "url": base, "inLanguage": "ko",
        "publisher": {"@id": abs_url(base, "#org")},
        "potentialAction": {"@type": "SearchAction", "target": {"@type": "EntryPoint", "urlTemplate": abs_url(base, "?q={search_term_string}")}, "query-input": "required name=search_term_string"},
    }


def breadcrumb_ld(base: str, items) -> dict:
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(base, p)} for i, (n, p) in enumerate(items)]}


# ───────────────────────── 직무 페이지 ─────────────────────────

def job_faq(j: dict, by_id: dict):
    """페이지에 그대로 보이는 Q&A (FAQ 구조화 데이터와 같은 내용) — AI 검색이 답을 바로 집어가도록 질문-답 형태로."""
    name = j["name"]
    trans = [by_id[t]["name"] for t in j.get("transitions", []) if t in by_id]
    qa = [
        (f"{name}는 어떤 일을 하나요?", f"{j['tagline']}. {j['summary']}"),
        (f"{name} 신입 연봉은 어느 정도인가요?", f"신입 {rng(j['salary']['junior'])}만원, 미들(3~7년) {rng(j['salary']['mid'])}만원, 시니어 {rng(j['salary']['senior'])}만원 수준으로 추정합니다(세전 기본급, 산업·기업 규모·인센티브에 따라 달라집니다)."),
        (f"비전공자도 {name}로 갈 수 있나요?", ("가능합니다. " if j.get("nonmajorOk") else "쉽지는 않습니다. ") + j["entry"]["nonmajor"]),
        (f"{name}에서 옮겨갈 수 있는 직무는 무엇인가요?", (", ".join(trans) + " 쪽으로 이동하는 경우가 많습니다. " if trans else "") + j["entry"]["switch"]),
        (f"AI가 {name}에 미치는 영향은?", f"영향 {AI_LABEL.get(j['ai']['level'], '보통')}. {j['ai']['note']}"),
    ]
    return qa


def job_ld(base: str, j: dict, by_id: dict, meta: dict, group_name: str, updated: str, image: str = "") -> list:
    path = f"jobs/{j['id']}/"
    url = abs_url(base, path)
    evidence = (j["sources"].get("count", 0) or 0) + (j["sources"].get("public", 0) or 0)
    desc = f"{j['tagline']}. {j['summary']}"
    occupation = {
        "@context": "https://schema.org", "@type": "Occupation",
        "name": j["name"], "alternateName": j.get("en", ""),
        "description": desc,
        "occupationLocation": [{"@type": "Country", "name": "KR"}],
        "estimatedSalary": [{
            "@type": "MonetaryAmountDistribution", "name": "base", "currency": "KRW", "duration": "P1Y",
            "minValue": int(j["salary"]["junior"][0]) * 10000, "maxValue": int(j["salary"]["senior"][1]) * 10000,
            "median": int((j["salary"]["mid"][0] + j["salary"]["mid"][1]) / 2) * 10000,
        }],
        "skills": ", ".join(j["skills"]["hard"] + j["skills"]["soft"]),
        "responsibilities": " / ".join(j["tasks"]),
        "qualifications": j["entry"]["major"],
        "educationRequirements": j["entry"]["major"],
        "mainEntityOfPage": {"@type": "WebPage", "@id": url, "lastReviewed": updated},
    }
    article = {
        "@context": "https://schema.org", "@type": "Article",
        "@id": url + "#article", "headline": f"{j['name']} 직무 설명 — 하는 일·연봉·들어가는 길·현직자의 말",
        "description": desc, "inLanguage": "ko", "url": url,
        "image": image or abs_url(base, f"assets/og/{j['id']}.png"),
        "author": {"@type": "Person", "name": "조현빈", "url": abs_url(base, "zorro/")},
        "publisher": {"@type": "Organization", "name": "커리어프로젝트 주식회사", "logo": {"@type": "ImageObject", "url": abs_url(base, "assets/og.png")}},
        "datePublished": "2026-10-15", "dateModified": updated,
        "about": {"@type": "Occupation", "name": j["name"]},
        "isBasedOn": f"취업조로 현직자 직무 인터뷰 {j['sources'].get('count', 0)}건 및 공개 현직자 자료 {j['sources'].get('public', 0)}건" if evidence else "일반 직무 정보(초안)",
        "mainEntityOfPage": url,
    }
    faq = {"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in job_faq(j, by_id)]}
    crumbs = breadcrumb_ld(base, [("직무사전", ""), (group_name, f"?group={j['group']}"), (j["name"], path)])
    return [occupation, article, faq, crumbs]


def render_job_body(j: dict, by_id: dict, group_name: str, updated: str, base: str) -> str:
    """상세 패널(template.html 의 detail())과 같은 구성을 서버에서 그린다. 클래스는 template.html CSS 를 그대로 쓴다."""
    def li(arr, cls=""):
        return f'<ul class="list {cls}">' + "".join(f"<li>{e(s)}</li>" for s in arr) + "</ul>"

    def tags(arr, cls=""):
        return f'<ul class="tags {cls}">' + "".join(f"<li>{e(s)}</li>" for s in arr) + "</ul>"

    def sec(title, body, hint=""):
        return f'<section class="sec"><div class="sec-h"><span class="ic"></span><h2>{e(title)}</h2>' + (f'<span class="hint">{e(hint)}</span>' if hint else "") + f"</div>{body}</section>"

    SAL_MIN, SAL_MAX = 2500, 18000

    def pct(v):
        return f"{(v - SAL_MIN) / (SAL_MAX - SAL_MIN) * 100:.1f}"

    def bar(r):
        return f'<div class="bar"><i style="left:{pct(r[0])}%;width:{(r[1] - r[0]) / (SAL_MAX - SAL_MIN) * 100:.1f}%"></i></div>'

    src_n = j["sources"].get("count", 0) or 0
    pub_n = j["sources"].get("public", 0) or 0
    ev = src_n + pub_n
    h = []
    h.append(f'<nav class="crumbs" aria-label="경로"><a href="../../">직무사전</a> › <a href="../../?group={e(j["group"])}">{e(group_name)}</a> › <span>{e(j["name"])}</span></nav>')
    h.append(f'<h1 class="name">{e(j["name"])}</h1><p class="en">{e(j.get("en", ""))}</p>')
    h.append(f'<p class="tagline">{e(j["tagline"])}</p>')
    # GEO: 첫 문단은 "정의" 문장으로 시작해 AI 요약이 바로 집어가게
    h.append(f'<p class="summary"><b>{e(j["name"])}</b>는 {e(j["tagline"])}입니다. {e(j["summary"])}</p>')
    h.append('<dl class="quick">'
             f'<div><dt>신입 연봉대</dt><dd class="num">{rng(j["salary"]["junior"])}만원</dd></div>'
             f'<div><dt>비전공 입문</dt><dd>{"가능" if j.get("nonmajorOk") else "어려운 편"}</dd></div>'
             f'<div><dt>AI 영향</dt><dd>{AI_LABEL.get(j["ai"]["level"], "보통")}</dd></div>'
             f'<div><dt>근거 자료</dt><dd>{str(ev) + "건" if ev else "초안"}</dd></div></dl>')
    if j.get("dayInLife"):
        h.append(f'<div class="day"><b>하루는 이렇게 흘러갑니다</b>{e(j["dayInLife"])}</div>')
    h.append(sec("하는 일", li(j["tasks"])))
    if j.get("realities"):
        h.append(sec("현직자가 말하는 현실", li(j["realities"], "mark")))
    if j.get("voices"):
        vs = "".join(
            f'<blockquote>{e(v["quote"])}<cite>{e(v.get("who") or "현직자")}'
            + ('<span class="badge gray">공개 인터뷰</span>' if v.get("source") == "public" else '<span class="badge soft">취업조로 인터뷰</span>')
            + "</cite></blockquote>" for v in j["voices"])
        h.append(sec("현직자의 말", f'<div class="voices">{vs}</div>'))
    h.append(sec("필요한 역량",
                 f'<div class="skill-row"><span class="k">하드 스킬</span>{tags(j["skills"]["hard"], "big accent")}</div>'
                 f'<div class="skill-row"><span class="k">소프트 스킬</span>{tags(j["skills"]["soft"], "big")}</div>'
                 f'<div class="skill-row"><span class="k">자주 쓰는 도구</span>{tags(j["tools"], "big")}</div>'))
    h.append(sec("들어가는 길", '<div class="entry">'
                 f'<div><span class="k">관련 전공·신입</span><span class="v">{e(j["entry"]["major"])}</span></div>'
                 f'<div><span class="k">비전공{"<span class=\"ok\">가능</span>" if j.get("nonmajorOk") else ""}</span><span class="v">{e(j["entry"]["nonmajor"])}</span></div>'
                 f'<div><span class="k">경력 전환</span><span class="v">{e(j["entry"]["switch"])}</span></div></div>'))
    h.append(sec("커리어 패스", '<ol class="path">' + "".join(f'<li><div class="stage">{e(p["stage"])}</div><div class="desc">{e(p["desc"])}</div></li>' for p in j["path"]) + "</ol>"))
    s = j["salary"]
    h.append(sec("연봉대", '<div class="sal">'
                 f'<div class="sal-row"><span class="k">신입</span>{bar(s["junior"])}<span class="v">{rng(s["junior"])}</span></div>'
                 f'<div class="sal-row"><span class="k">미들</span>{bar(s["mid"])}<span class="v">{rng(s["mid"])}</span></div>'
                 f'<div class="sal-row"><span class="k">시니어</span>{bar(s["senior"])}<span class="v">{rng(s["senior"])}</span></div>'
                 f'<div class="sal-axis"><span></span><div><span style="left:{pct(5000)}%">5,000</span><span style="left:{pct(10000)}%">10,000</span><span style="left:{pct(15000)}%">15,000</span></div><span></span></div>'
                 '</div><p class="note">단위 만원, 세전 기본급 기준 추정치. 산업·기업 규모·인센티브에 따라 범위를 벗어나는 경우가 흔합니다.</p>', "만원 · 추정"))
    trans = [t for t in j.get("transitions", []) if t in by_id]
    if trans:
        h.append(sec("옮겨갈 수 있는 직무", '<div class="trans">' + "".join(f'<a class="btn-link" href="../{t}/">{e(by_id[t]["name"])} →</a>' for t in trans) + "</div>"))
    h.append(sec("면접에서 꼭 묻는 것", li(j["interview"], "mark")))
    if j.get("prep"):
        h.append(sec("현직자가 권하는 준비", li(j["prep"])))
    h.append(sec("이런 분에게 맞습니다", li(j["fit"])))
    h.append(sec("AI가 이 직무를 바꾸는 방식", f'<div class="ai-box"><span class="lvl l{j["ai"]["level"]}">{AI_LABEL.get(j["ai"]["level"], "보통")}</span><p>{e(j["ai"]["note"])}</p></div>'))
    h.append(sec("도움이 되는 자격·학습", tags(j["certs"], "big")))
    # 자주 묻는 질문 (FAQ 구조화 데이터와 동일 내용)
    faq = "".join(f'<details class="faq"><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in job_faq(j, by_id))
    h.append(sec("자주 묻는 질문", f'<div class="faqs">{faq}</div>'))
    inds = (j["sources"].get("industries") or [])[:12]
    ws = j.get("webSources") or []
    src = '<div class="src"><b>근거 자료</b> '
    if src_n:
        src += f'취업조로 현직자 직무 인터뷰 {src_n}건 ({e(j["sources"].get("years", "2020~2026"))})'
    if src_n and pub_n:
        src += " + "
    if pub_n:
        src += f"공개 현직자 인터뷰·직무 자료 {pub_n}건"
    if not ev:
        src += "현직자 자료 수집 전 초안입니다. 검수 후 보강 예정."
    if inds:
        src += f'<br><b>인터뷰 현직자 업종</b> {e(", ".join(inds))}'
    if ws:
        src += "<ul>" + "".join(f'<li><a href="{e(w["url"])}" target="_blank" rel="noopener nofollow">{e(w["title"])}</a></li>' for w in ws[:8]) + "</ul>"
    src += f'<br><span class="upd">작성 취업조로(조현빈) · 최종 수정 {e(updated)}</span></div>'
    h.append(src)
    h.append('<div class="cta"><h2>이 직무로 취업·이직을 고민 중이라면</h2><p>지금 경력에서 이 직무로 가는 가장 빠른 경로를 취업조로 컨설턴트가 1:1로 정리해 드립니다.</p>'
             f'<div class="cta-row"><a class="btn primary" href="../../apply/index.html#{e(j["id"])}">무료 상담 신청하기 ⚡</a><a class="btn ghost" href="../../#{e(j["id"])}">직무사전에서 다른 직무 보기</a></div></div>')
    return "\n".join(h)


JOB_PAGE_CSS = """
/* 직무 개별 페이지: 상세 패널 CSS 를 그대로 쓰고 문서 흐름으로만 바꾼다 */
.jobpage { max-width: 860px; margin: 0 auto; padding: 28px 20px 10px; }
.jobpage .crumbs { font-size: 13px; color: var(--muted); margin-bottom: 18px; }
.jobpage .crumbs a { text-decoration: none; } .jobpage .crumbs a:hover { color: var(--brass); }
.jobpage h1.name { font-size: clamp(28px, 4vw, 38px); line-height: 1.2; letter-spacing: -.04em; color: var(--black); }
.jobpage .en { font-size: 13.5px; margin-top: 4px; color: var(--muted); }
.jobpage .tagline { font-size: 17px; color: var(--black); margin-top: 14px; font-weight: 700; line-height: 1.5; }
.jobpage .summary { margin-top: 10px; color: var(--fg-soft); max-width: 70ch; }
.jobpage .sec-h h2 { font-family: var(--serif); font-size: 18px; font-weight: 700; }
.jobpage .sec-h .ic { display: none; }
.jobpage .trans .btn-link { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1px solid var(--line-strong); border-radius: 999px; font-size: 13.5px; color: var(--black); background: var(--surface); text-decoration: none; }
.jobpage .trans .btn-link:hover { border-color: var(--fill); background: var(--fill); color: var(--fillfg); }
.jobpage .faqs { display: grid; gap: 8px; }
.jobpage .faq { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 0 14px; }
.jobpage .faq summary { cursor: pointer; padding: 12px 0; font-weight: 700; color: var(--black); font-size: 14.5px; list-style: none; }
.jobpage .faq summary::-webkit-details-marker { display: none; }
.jobpage .faq summary::before { content: "Q. "; color: var(--brass); }
.jobpage .faq p { padding: 0 0 14px; color: var(--fg-soft); font-size: 14px; line-height: 1.7; }
.jobpage .src .upd { color: var(--muted); }
.jobpage .cta h2 { font-size: 19px; color: inherit; font-family: var(--font); }
"""


# ───────────────────────── 공유 이미지 ─────────────────────────

FONT_DIRS = [Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Windows" / "Fonts", Path("C:/Windows/Fonts")]


def _font(name: str, size: int):
    from PIL import ImageFont
    for d in FONT_DIRS:
        p = d / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return None


def fonts_available() -> bool:
    return all(_font(n, 10) for n in ("GmarketSansBold.otf", "GmarketSansMedium.otf", "GmarketSansLight.otf", "NanumBarunGothic.ttf"))


def og_image(out: Path, title: str, subtitle: str = "", kicker: str = "취업조로 직무사전", light: str = "채용공고엔 안 나오는") -> bool:
    """1200x630 공유 이미지. 먹색 바탕, 황동 라벨, 얇은 머리글 + 굵은 헤드라인, 오른쪽에 조로 마스크 워터마크.
    글꼴(Gmarket Sans·나눔바른고딕)이 없는 환경(GitHub Actions)에서는 만들지 않고 False 를 돌려준다."""
    from PIL import Image, ImageDraw
    if not fonts_available():
        return False
    W, H = 1200, 630
    INK, PAPER, BRASS, SOFT, MUTED = (17, 24, 39), (255, 255, 255), (201, 160, 99), (195, 201, 214), (147, 155, 171)
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    # 워터마크: 조로 마스크 마크를 크게, 아주 옅게
    logo = Image.open(ASSETS / "jobzorro_logo.png").convert("RGBA")
    mark = logo.crop((15, 9, 78, 72)).resize((520, 520), Image.LANCZOS)
    # 마크는 검정 사각 + 흰 마스크. 먹색 바탕 위에 그대로 아주 옅게 올리면 사각은 사라지고 마스크 윤곽만 남는다
    # 흰 마스크 획만 남기고(밝은 픽셀만) 옅게 올린다 → 사각 배경 없이 마스크 윤곽만
    lum = mark.convert("L").point(lambda v: 255 if v > 140 else 0)
    al = mark.split()[3]
    from PIL import ImageChops
    ghost_a = ImageChops.multiply(lum, al).point(lambda v: int(v * 0.12))
    ghost = Image.merge("RGBA", (Image.new("L", mark.size, 255),) * 3 + (ghost_a,))
    im.paste(ghost, (W - 560, H - 540), ghost)
    # 위 황동 바
    d.rectangle([0, 0, W, 10], fill=BRASS)
    # 라벨
    f_k = _font("GmarketSansMedium.otf", 26)
    d.text((80, 72), kicker.upper() if kicker.isascii() else kicker, font=f_k, fill=BRASS)
    kw = d.textlength(kicker, font=f_k)
    d.rectangle([80 + kw + 16, 85, 80 + kw + 76, 87], fill=BRASS)
    # 얇은 머리글
    y = 130
    if light:
        f_l = _font("GmarketSansLight.otf", 48)
        d.text((78, y), light, font=f_l, fill=SOFT)
        y += 70
    # 굵은 헤드라인 (너비에 맞춰 축소, 2줄까지)
    size = 92
    while size > 40:
        f_b = _font("GmarketSansBold.otf", size)
        if d.textlength(title, font=f_b) <= 1040:
            break
        size -= 4
    lines = [title]
    if d.textlength(title, font=f_b) > 1040:   # 그래도 넘치면 2줄로
        cut = max(title.rfind(" ", 0, len(title) // 2 + 4), len(title) // 2)
        lines = [title[:cut].strip(), title[cut:].strip()]
    for ln in lines:
        d.text((78, y), ln, font=f_b, fill=PAPER)
        y += size + 16
    # 보조 설명
    if subtitle:
        f_s = _font("NanumBarunGothic.ttf", 28)
        sub = subtitle if d.textlength(subtitle, font=f_s) <= 1000 else subtitle[:int(len(subtitle) * 1000 / d.textlength(subtitle, font=f_s)) - 1] + "…"
        d.text((80, y + 14), sub, font=f_s, fill=MUTED)
    # 아래: TEAMZORRO 워드마크(흰색) + 주소
    tz = Image.open(ASSETS / "teamzorro_logo.png").convert("RGBA")
    tz = tz.resize((int(tz.width * 48 / tz.height), 48), Image.LANCZOS)
    r, g, bl, al = tz.split()
    tzw = Image.merge("RGBA", (r.point(lambda v: 255 - v), g.point(lambda v: 255 - v), bl.point(lambda v: 255 - v), al))
    im.paste(tzw, (80, H - 60 - 48), tzw)
    f_u = _font("GmarketSansMedium.otf", 26)
    d.text((W - 80 - d.textlength("job.jobzorro.kr", font=f_u), H - 60 - 34), "job.jobzorro.kr", font=f_u, fill=BRASS)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, optimize=True)
    return True


# ───────────────────────── sitemap / robots / llms.txt ─────────────────────────

def write_sitemap(out_dir: Path, base: str, entries) -> None:
    """entries: [(path, lastmod, changefreq, priority)]"""
    body = "".join(
        f"<url><loc>{e(abs_url(base, p))}</loc><lastmod>{lm}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority></url>\n"
        for p, lm, cf, pr in entries)
    (out_dir / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n", encoding="utf-8")


def write_robots(out_dir: Path, base: str) -> None:
    bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Google-Extended", "Googlebot", "Bingbot", "Yeti", "Daum", "NaverBot"]
    txt = "# 취업조로 직무사전 — 검색엔진과 AI 검색(생성형 엔진) 모두 허용\nUser-agent: *\nAllow: /\n\n" + "".join(f"User-agent: {b}\nAllow: /\n\n" for b in bots)
    txt += f"Sitemap: {abs_url(base, 'sitemap.xml')}\n"
    (out_dir / "robots.txt").write_text(txt, encoding="utf-8")


def write_llms(out_dir: Path, base: str, jobs, groups, updated: str) -> None:
    gname = {g["id"]: g["name"] for g in groups}
    lines = [
        "# 취업조로 직무사전 (jobzorro)",
        "",
        "> 취업·이직 컨설턴트 취업조로(조현빈, 커리어프로젝트 주식회사 대표, 컨설팅 15년 차, 합격자 1,100명 이상)가 현직자 직무 인터뷰 529건과 공개 현직자 자료 293건을 바탕으로 정리한 한국 직무 설명 사이트. "
        "직무마다 하는 일·하루 일과·필요 역량·들어가는 길(전공/비전공/경력 전환)·커리어 패스·연봉대(추정)·옮겨갈 수 있는 직무·면접 질문·현직자의 말·AI 영향을 다룬다. 회사명과 개인은 특정하지 않는다.",
        "",
        f"최종 수정: {updated}. 언어: 한국어. 연봉은 만원 단위 세전 기본급 추정치.",
        "",
        "## 주요 페이지",
        f"- [직무사전 전체]({abs_url(base, '')}): 직군·트랙별로 직무를 고르고 상세를 본다",
        f"- [취업뉴스 커리어브리핑]({abs_url(base, 'news/')}): 매일 아침 고용·채용·이직·기업 뉴스를 선별하고 취업조로 관점의 한마디를 붙인다",
        f"- [취업조로와 함께하기]({abs_url(base, 'zorro/')}): 컨설턴트 소개, 상황별(신입·중고신입·경력이직·선퇴사자) 상담 안내",
        f"- [무료 상담 신청]({abs_url(base, 'apply/')})",
        "",
        "## 직무 페이지",
    ]
    for j in jobs:
        lines.append(f"- [{j['name']}]({abs_url(base, f'jobs/{j['id']}/')}): {gname.get(j['group'], '')} · {j['tagline']} · 신입 {rng(j['salary']['junior'])}만원")
    lines += ["", "## 기타", f"- [개인정보처리방침]({abs_url(base, 'privacy/')})", f"- [sitemap]({abs_url(base, 'sitemap.xml')})"]
    (out_dir / "llms.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def verify_tags() -> str:
    """뉴스 페이지처럼 seo_head 를 안 쓰는 페이지용 소유 확인 태그."""
    out = []
    if VERIFY.get("google"):
        out.append(f'<meta name="google-site-verification" content="{e(VERIFY["google"])}">')
    if VERIFY.get("naver"):
        out.append(f'<meta name="naver-site-verification" content="{e(VERIFY["naver"])}">')
    return "".join(out)
