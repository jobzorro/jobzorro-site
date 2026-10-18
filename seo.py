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
    _m = re.match(r"^(.*?)\s*\(([^()]+)\)\s*$", j["name"])
    _nm = f'{e(_m.group(1))}<span class="paren">{e(_m.group(2))}</span>' if _m else e(j["name"])
    h.append(f'<h1 class="name">{_nm}</h1><p class="en">{e(j.get("en", ""))}</p>')
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
    if j.get("terms"):
        h.append(sec(f"필수 용어 TOP {len(j['terms'])}", '<ol class="terms">' + "".join(
            f'<li><div class="tt"><b>{e(t["t"])}</b>' + (f'<span class="te">{e(t["e"])}</span>' if t.get("e") else "") + f'</div><p>{e(t["s"])}</p></li>' for t in j["terms"]) + '</ol>', "현직자 말에 자주 나오는 단어"))
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
    h.append(sec("면접에서 꼭 묻는 것", li(j["interview"], "mark") + f'<a class="more" href="../../interview/#{e(j["id"])}">이 직무 단골 면접 질문 5개 →</a>'))
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
    if j.get("news"):
        items = "".join(f'<li><a href="{e(n["url"])}" target="_blank" rel="noopener nofollow"><span class="d">{e(n["date"][5:].replace("-", "."))} · {e(n["source"])}</span><b>{e(n["title"])}</b>' + (f'<span class="w">{e(n["why"])}</span>' if n.get("why") else "") + '</a></li>' for n in j["news"])
        h.append(sec("이 직무 관련 최근 뉴스", f'<ul class="newsbox">{items}</ul><a class="more" href="../../news/">커리어브리핑 전체 보기 →</a>', "취업조로 커리어브리핑"))
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
             f'<div class="cta-row"><a class="btn ghost" href="../../#{e(j["id"])}">직무사전에서 다른 직무 보기</a><a class="btn primary" href="../../apply/index.html#{e(j["id"])}">무료 상담 신청하기 ⚡</a></div></div>')
    return "\n".join(h)


JOB_PAGE_CSS = """
/* 직무 개별 페이지: 상세 패널 CSS 를 그대로 쓰고 문서 흐름으로만 바꾼다 */
.jobpage { max-width: 860px; margin: 0 auto; padding: 28px 20px 10px; }
.jobpage .crumbs { font-size: 13px; color: var(--muted); margin-bottom: 18px; }
.jobpage .crumbs a { text-decoration: none; } .jobpage .crumbs a:hover { color: var(--brass); }
.jobpage h1.name { font-family: var(--display); font-size: clamp(34px, 5vw, 56px); line-height: 1.05; letter-spacing: -.05em; color: var(--black); }
.jobpage .en { font-size: 13.5px; margin-top: 4px; color: var(--muted); }
.jobpage .tagline { font-size: 17px; color: var(--black); margin-top: 14px; font-weight: 700; line-height: 1.5; }
.jobpage .summary { margin-top: 10px; color: var(--fg-soft); max-width: 70ch; }
.jobpage .sec-h h2 { font-family: var(--display); font-size: 20px; font-weight: 900; letter-spacing: -.03em; }
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
.jobpage .terms { counter-reset: tm; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.jobpage .terms li { counter-increment: tm; position: relative; padding: 14px 16px 14px 46px; border: 1px solid var(--line); border-radius: 12px; }
.jobpage .terms li::before { content: counter(tm, decimal-leading-zero); position: absolute; left: 14px; top: 14px; font-family: var(--display); font-weight: 900; font-size: 14px; color: var(--ink); }
.jobpage .terms .tt b { font-family: var(--display); font-size: 16px; font-weight: 900; color: var(--ink); background: linear-gradient(transparent 62%, var(--mark) 62%); }
.jobpage .terms .te { display: block; font-size: 11.5px; color: var(--muted); margin-top: 2px; }
.jobpage .terms p { margin: 6px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--fg-soft); }
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


def og_image(out: Path, title: str, subtitle: str = "", kicker: str = "취업조로 직무사전", light: str = "채용공고엔 안 나오는", accent=None, bg=None) -> bool:
    """1200x630 공유 이미지. 먹색 바탕, 황동 라벨, 얇은 머리글 + 굵은 헤드라인, 오른쪽에 조로 마스크 워터마크.
    글꼴(Gmarket Sans·나눔바른고딕)이 없는 환경(GitHub Actions)에서는 만들지 않고 False 를 돌려준다."""
    from PIL import Image, ImageDraw
    if not fonts_available():
        return False
    W, H = 1200, 630
    INK, PAPER, BRASS, SOFT, MUTED = (bg or (11, 11, 11)), (255, 255, 255), (accent or (198, 255, 61)), (205, 205, 205), (150, 150, 150)
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
    ghost_a = ImageChops.multiply(lum, al).point(lambda v: int(v * 0.22))
    ghost = Image.merge("RGBA", tuple(Image.new("L", mark.size, c) for c in BRASS) + (ghost_a,))
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
    txt = "# 취업조로 직무사전 — 검색엔진과 AI 검색(생성형 엔진) 모두 허용\nUser-agent: *\nAllow: /\nDisallow: /admin/\n\n" + "".join(f"User-agent: {b}\nAllow: /\n\n" for b in bots)
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
    lines += ["", "## 도구", f"- [직무 비교]({abs_url(base, 'compare/')}): 두 직무의 연봉·역량·경로를 나란히", f"- [3문항 직무 진단]({abs_url(base, 'fit/')}): 전공·성향·원하는 것으로 직무 5개 추천", f"- [직무별 면접 질문]({abs_url(base, 'interview/')})",
              "", "## 기타", f"- [개인정보처리방침]({abs_url(base, 'privacy/')})", f"- [sitemap]({abs_url(base, 'sitemap.xml')})"]
    (out_dir / "llms.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def verify_tags() -> str:
    """뉴스 페이지처럼 seo_head 를 안 쓰는 페이지용 소유 확인 태그."""
    out = []
    if VERIFY.get("google"):
        out.append(f'<meta name="google-site-verification" content="{e(VERIFY["google"])}">')
    if VERIFY.get("naver"):
        out.append(f'<meta name="naver-site-verification" content="{e(VERIFY["naver"])}">')
    return "".join(out)


def render_interview_body(j: dict, by_id: dict, group_name: str, updated: str) -> str:
    """직무별 면접 질문·준비법 페이지 본문 (/interview/<id>/)"""
    def li(arr, cls=""):
        return f'<ol class="iq {cls}">' + "".join(f"<li>{e(s)}</li>" for s in arr) + "</ol>"
    h = []
    h.append(f'<nav class="crumbs" aria-label="경로"><a href="../../">직무사전</a> › <a href="../">면접 질문</a> › <span>{e(j["name"])}</span></nav>')
    h.append(f'<div class="kick">Interview · {e(group_name)}</div>')
    h.append(f'<h1 class="name">{e(j["name"])} 면접 질문과 준비법</h1>')
    h.append(f'<p class="summary"><b>{e(j["name"])}</b> 면접에서 현직자와 컨설턴트가 꼽은 단골 질문·평가 포인트와 준비 방법입니다. {e(j["tagline"])}을(를) 뽑는 자리라는 걸 기억하세요.</p>')
    h.append(f'<section class="sec"><div class="sec-h"><h2>면접에서 꼭 묻는 것</h2><span class="hint">{len(j["interview"])}개</span></div>{li(j["interview"], "mark")}</section>')
    if j.get("prep"):
        h.append(f'<section class="sec"><div class="sec-h"><h2>현직자가 권하는 준비</h2></div>{li(j["prep"])}</section>')
    if j.get("realities"):
        h.append(f'<section class="sec"><div class="sec-h"><h2>답변에 녹이면 좋은 현실 이해</h2><span class="hint">면접관은 이걸 아는지 봅니다</span></div>{li(j["realities"][:4])}</section>')
    h.append(f'<section class="sec"><div class="sec-h"><h2>이런 사람을 뽑습니다</h2></div>{li(j["fit"])}</section>')
    sk = j["skills"]
    h.append('<section class="sec"><div class="sec-h"><h2>답변에 쓸 역량 키워드</h2></div><ul class="tags big">' + "".join(f"<li>{e(x)}</li>" for x in sk["hard"] + sk["soft"]) + '</ul></section>')
    trans = [t for t in j.get("transitions", []) if t in by_id]
    if trans:
        h.append('<section class="sec"><div class="sec-h"><h2>같이 보면 좋은 직무 면접</h2></div><div class="trans">' + "".join(f'<a class="btn-link" href="../{t}/">{e(by_id[t]["name"])} 면접 →</a>' for t in trans) + '</div></section>')
    h.append(f'<p class="src">작성 취업조로(조현빈) · 근거 현직자 인터뷰 {j["sources"].get("count", 0)}건 + 공개 자료 {j["sources"].get("public", 0)}건 · 최종 수정 {e(updated)} · <a href="../../jobs/{e(j["id"])}/">{e(j["name"])} 직무 설명 전체 보기 →</a></p>')
    h.append(f'<div class="cta"><h2>면접 스크립트, 혼자 만들기 어렵다면</h2><p>지원 회사에 맞춘 면접 스크립트를 취업조로 컨설턴트가 1:1로 같이 만듭니다.</p><div class="cta-row"><a class="btn ghost" href="../../jobs/{e(j["id"])}/">직무 설명 보기</a><a class="btn primary" href="../../apply/index.html#{e(j["id"])}">무료 상담 신청하기 ⚡</a></div></div>')
    return "\n".join(h)


def render_interview_index(jobs, groups) -> str:
    gname = {g["id"]: g["name"] for g in groups}
    by_g = {}
    for j in jobs:
        by_g.setdefault(j["group"], []).append(j)
    h = ['<nav class="crumbs" aria-label="경로"><a href="../">직무사전</a> › <span>면접 질문</span></nav>',
         '<div class="kick">Interview · 직무별 면접 질문</div>',
         f'<h1 class="name">직무별 면접 질문 {len(jobs)}개 직무</h1>',
         '<p class="summary">현직자 인터뷰에서 나온 직무별 단골 면접 질문, 평가 포인트, 준비 방법을 모았습니다. 지원할 직무를 골라 보세요.</p>']
    for g in groups:
        js = by_g.get(g["id"])
        if not js:
            continue
        h.append(f'<section class="sec"><div class="sec-h"><h2>{e(g["name"])}</h2><span class="hint">{len(js)}개</span></div><div class="trans">' +
                 "".join(f'<a class="btn-link" href="{e(j["id"])}/">{e(j["name"])} <small>{len(j["interview"])}문항</small></a>' for j in js) + '</div></section>')
    return "\n".join(h)


INTERVIEW_CSS = """
.jobpage .kick { font-family: var(--display); font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.jobpage ol.iq { counter-reset: q; display: grid; gap: 0; border-top: 1px solid var(--ink); }
.jobpage ol.iq li { counter-increment: q; position: relative; padding: 14px 0 14px 44px; border-bottom: 1px solid var(--line); color: var(--fg-soft); line-height: 1.65; font-size: 15px; }
.jobpage ol.iq li::before { content: counter(q, decimal-leading-zero); position: absolute; left: 0; top: 14px; font-family: var(--display); font-weight: 900; font-size: 15px; color: var(--ink); }
.jobpage ol.iq.mark li::before { color: var(--ink); background: linear-gradient(transparent 60%, var(--mark) 60%); }
.jobpage .trans small { color: var(--muted); margin-left: 4px; font-size: 12px; }
.jobpage .src a { color: var(--ink); }
"""


GLOSS_CSS = """
.gl { border-bottom: 1px dotted var(--muted); cursor: help; position: relative; }
.gl:hover, .gl:focus { border-bottom-color: var(--ink); outline: none; }
.gl-tip { position: fixed; z-index: 60; max-width: 300px; padding: 10px 12px; border-radius: 10px; background: var(--inkbg); color: var(--inkfg); font-size: 13px; line-height: 1.55; box-shadow: 0 10px 30px rgba(0,0,0,.25); pointer-events: none; }
.gl-tip b { display: block; font-size: 12px; letter-spacing: .02em; margin-bottom: 3px; color: var(--acc); }
.gl-tip a { pointer-events: auto; }
"""

# 본문 텍스트에서 용어를 찾아 점선 밑줄 + 툴팁. 한 묶음(섹션) 안에서는 같은 용어를 처음 한 번만 표시
GLOSS_JS = r"""<script>
(function () {
  var el = document.getElementById('gloss-data'); if (!el) return;
  var G = JSON.parse(el.textContent), LIST = [];
  G.forEach(function (t) { [t.t].concat(t.a || []).forEach(function (w) { LIST.push({ w: w, t: t }); }); });
  LIST.sort(function (a, b) { return b.w.length - a.w.length; });
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var RE = new RegExp(LIST.map(function (x) { return esc(x.w); }).join('|'), 'g');
  var BY = {}; LIST.forEach(function (x) { BY[x.w] = x.t; });
  function ascii(w) { return /^[A-Za-z0-9&\/+. -]+$/.test(w); }
  function okBoundary(text, i, w) {
    if (!ascii(w)) return true;
    var a = text.charAt(i - 1), b = text.charAt(i + w.length);
    return !/[A-Za-z0-9]/.test(a) && !/[A-Za-z0-9]/.test(b);
  }
  var SKIP = /^(A|BUTTON|SCRIPT|STYLE|ABBR|H1|H2|H3|INPUT|TEXTAREA|SELECT)$/;
  function wrap(root) {
    var sections = root.querySelectorAll('.sec, .summary, .day, .tagline, .quick');
    (sections.length ? sections : [root]).forEach(function (sec) {
      var seen = {}, walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, null), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        for (var p = n.parentNode; p && p !== sec; p = p.parentNode) if (SKIP.test(p.nodeName) || (p.classList && p.classList.contains('gl'))) return;
        var text = n.nodeValue, m, last = 0, frag = null; RE.lastIndex = 0;
        while ((m = RE.exec(text))) {
          var t = BY[m[0]]; if (!t || seen[t.t] || !okBoundary(text, m.index, m[0])) continue;
          seen[t.t] = 1; frag = frag || document.createDocumentFragment();
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          var ab = document.createElement('abbr'); ab.className = 'gl'; ab.tabIndex = 0; ab.textContent = m[0];
          ab.setAttribute('data-t', t.t); ab.setAttribute('data-s', t.s); if (t.e) ab.setAttribute('data-e', t.e);
          frag.appendChild(ab); last = m.index + m[0].length;
        }
        if (frag) { frag.appendChild(document.createTextNode(text.slice(last))); n.parentNode.replaceChild(frag, n); }
      });
    });
  }
  var tip = null;
  function show(ab) {
    hide(); tip = document.createElement('div'); tip.className = 'gl-tip';
    var b = document.createElement('b'); b.textContent = ab.getAttribute('data-t') + (ab.getAttribute('data-e') ? ' · ' + ab.getAttribute('data-e') : '');
    tip.appendChild(b); tip.appendChild(document.createTextNode(ab.getAttribute('data-s'))); document.body.appendChild(tip);
    var r = ab.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var x = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), y = r.bottom + 8; if (y + h > window.innerHeight - 8) y = r.top - h - 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hide() { if (tip) { tip.remove(); tip = null; } }
  document.addEventListener('mouseover', function (e) { var a = e.target.closest && e.target.closest('.gl'); if (a) show(a); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('.gl')) hide(); });
  document.addEventListener('focusin', function (e) { if (e.target.classList && e.target.classList.contains('gl')) show(e.target); });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('.gl'); if (a) { e.stopPropagation(); show(a); } else hide(); }, true);
  window.addEventListener('scroll', hide, { passive: true });
  window.glossify = wrap;
  var d = document.querySelector('.jobpage .d-body'); if (d) wrap(d);
  var db = document.getElementById('dBody');
  if (db) new MutationObserver(function () { if (db.querySelector('.sec') && !db.getAttribute('data-gl')) { db.setAttribute('data-gl', '1'); wrap(db); } }).observe(db, { childList: true });
})();
</script>"""


def gloss_compact(gl: dict, job_id: str = None) -> list:
    out = []
    for t in gl["terms"]:
        if job_id and job_id not in t.get("jobs", []):
            continue
        out.append({"t": t["term"], "a": t.get("aliases", []), "s": t["short"], "e": t.get("en", "")})
    return out


def render_glossary(gl: dict, by_id: dict, gname: dict) -> str:
    import unicodedata
    def key(t):
        w = t["term"]; c = w[0]
        if "가" <= c <= "힣":
            cho = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"[(ord(c) - 0xAC00) // 588]
            cho = {"ㄲ": "ㄱ", "ㄸ": "ㄷ", "ㅃ": "ㅂ", "ㅆ": "ㅅ", "ㅉ": "ㅈ"}.get(cho, cho)
            return (0, cho, w)
        return (1, c.upper() if c.isalpha() else "#", w.upper())
    terms = sorted(gl["terms"], key=key)
    heads = []
    for t in terms:
        k = key(t)[1]
        if not heads or heads[-1][0] != k:
            heads.append((k, []))
        heads[-1][1].append(t)
    h = ['<nav class="crumbs" aria-label="경로"><a href="../">직무사전</a> › <span>용어 사전</span></nav>',
         '<div class="kick">Glossary · 직무 용어 사전</div>',
         f'<h1 class="name">직무 용어 사전 {len(terms)}개</h1>',
         '<p class="summary">직무 설명과 현직자 인터뷰에 나오는 약어·업계 용어·채용 용어를 한 줄로 풀었습니다. 직무 설명 본문에서도 점선 밑줄이 그어진 단어에 마우스를 올리면 같은 풀이가 뜹니다.</p>',
         '<div class="gl-jump">' + "".join(f'<a href="#g-{e(k)}">{e(k)}</a>' for k, _ in heads) + '</div>']
    for k, ts in heads:
        h.append(f'<section class="sec gl-sec" id="g-{e(k)}"><div class="sec-h"><h2>{e(k)}</h2><span class="hint">{len(ts)}</span></div><dl class="gl-list">')
        for t in ts:
            jobs = [j for j in t.get("jobs", []) if j in by_id][:4]
            h.append(f'<div id="t-{e(t["term"])}"><dt>{e(t["term"])}' + (f' <span class="en">{e(t["en"])}</span>' if t.get("en") else "") +
                     (f' <span class="al">= {e(", ".join(t["aliases"]))}</span>' if t.get("aliases") else "") + f'</dt><dd>{e(t["short"])}' +
                     ('<span class="jl">' + "".join(f'<a href="../jobs/{e(j)}/">{e(by_id[j]["name"])}</a>' for j in jobs) + '</span>' if jobs else "") + '</dd></div>')
        h.append('</dl></section>')
    return "\n".join(h)


GLOSSARY_CSS = """
.gl-jump { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 20px; position: sticky; top: calc(54px + env(safe-area-inset-top,0px)); background: var(--paper); padding: 10px 0; z-index: 5; border-bottom: 1px solid var(--line); }
.gl-jump a { font-family: var(--display); font-weight: 700; font-size: 13px; min-width: 34px; text-align: center; padding: 6px 10px; border: 1px solid var(--line-strong); border-radius: 999px; text-decoration: none; color: var(--ink); }
.gl-jump a:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.gl-sec { scroll-margin-top: 120px; }
.gl-list { margin: 0; display: grid; border-top: 1px solid var(--ink); }
.gl-list > div { display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 8px 20px; padding: 14px 0; border-bottom: 1px solid var(--line); scroll-margin-top: 120px; }
.gl-list dt { font-family: var(--display); font-weight: 900; font-size: 17px; letter-spacing: -.02em; color: var(--ink); }
.gl-list dt .en { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .04em; color: var(--muted); margin-top: 2px; }
.gl-list dt .al { display: block; font-family: var(--font); font-size: 12px; font-weight: 500; color: var(--muted); }
.gl-list dd { margin: 0; color: var(--fg-soft); line-height: 1.65; font-size: 14.5px; }
.gl-list .jl { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.gl-list .jl a { font-size: 12px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--line-strong); text-decoration: none; color: var(--ink-soft); }
.gl-list .jl a:hover { background: var(--ink); color: var(--paper); }
@media (max-width: 640px) { .gl-list > div { grid-template-columns: 1fr; } }
"""


def render_interview_all(common: dict, iq: dict, jobs, groups) -> str:
    """면접 질문 한 페이지: 공통 TOP 10(큰 카드) → 11~20(한 줄씩) → 직군별·직무별 단골 질문 5개. 질문마다 의도 칩."""
    def chips(arr):
        return '<ul class="intent">' + "".join(f"<li>{e(x)}</li>" for x in arr) + "</ul>"
    def stars(n):
        return f'<span class="freq" title="빈출도 {n}/5">' + "●" * n + '<i>' + "●" * (5 - n) + '</i></span>' if n else ""
    top = common["top"]
    by_g = {}
    for j in jobs:
        if iq.get(j["id"]):
            by_g.setdefault(j["group"], []).append(j)
    n_job_q = sum(len(iq.get(j["id"], [])) for j in jobs)
    h = []
    h.append('<section class="iq-hero"><div class="kick"><i></i>Interview · 면접 질문</div>'
             f'<h1>면접에서 진짜 묻는 질문, <span class="mark">한 화면에.</span></h1>'
             f'<p>공통 빈출 TOP 20과 직무별 단골 질문 {n_job_q}개입니다. 질문 아래 동그란 칩은 면접관이 그 질문으로 확인하려는 것, 곧 답변에 꼭 담아야 할 것입니다. 위에서 직무를 고르면 그 직무 질문으로 바로 이동합니다.</p></section>')
    # 직무 선택 바
    opts = "".join(f'<optgroup label="{e(g["name"])}">' + "".join(f'<option value="j-{e(j["id"])}">{e(j["name"])}</option>' for j in by_g[g["id"]]) + '</optgroup>' for g in groups if by_g.get(g["id"]))
    gchips = "".join(f'<a href="#g-{e(g["id"])}">{e(g["name"])}</a>' for g in groups if by_g.get(g["id"]))
    h.append('<nav class="iq-bar" aria-label="질문 이동"><div class="iq-bar-in">'
             '<a class="top" href="#common">공통 TOP 20</a>'
             f'<select id="iqJob" aria-label="직무 선택"><option value="">직무를 고르면 바로 이동</option>{opts}</select>'
             f'<div class="iq-g">{gchips}</div></div></nav>')
    # 공통 TOP 10
    h.append('<section class="iq-sec" id="common"><div class="iq-head"><span class="num">01</span><h2>공통 빈출 <b>TOP 10</b></h2><p>직무와 상관없이 거의 모든 면접에서 나옵니다. 빈출도는 취업조로 면접 질문 모음집 기준입니다.</p></div><ol class="iq-top">')
    for k, t in enumerate(top[:10], 1):
        h.append(f'<li><div class="no">{k:02d}</div><div class="body"><div class="meta"><span class="tp">{e(t["topic"])}</span>{stars(t.get("f", 0))}</div><p class="q">{e(t["q"])}</p>{chips(t["i"])}</div></li>')
    h.append('</ol>')
    h.append('<div class="iq-head sub"><h3>11 — 20</h3></div><ol class="iq-list" start="11">')
    for k, t in enumerate(top[10:20], 11):
        h.append(f'<li><span class="no">{k}</span><div class="body"><p class="q">{e(t["q"])}</p>{chips(t["i"])}</div><span class="tp">{e(t["topic"])}</span></li>')
    h.append('</ol></section>')
    # 직무별
    h.append('<section class="iq-sec" id="jobs"><div class="iq-head"><span class="num">02</span><h2>직무별 <b>단골 질문 5</b></h2><p>현직자 인터뷰와 컨설팅 사례에서 그 직무라서 나오는 질문만 골랐습니다.</p></div>')
    for g in groups:
        js = by_g.get(g["id"])
        if not js:
            continue
        h.append(f'<div class="iq-group" id="g-{e(g["id"])}"><h3>{e(g["name"])}</h3>')
        for j in js:
            h.append(f'<article class="iq-job" id="j-{e(j["id"])}"><header><h4>{e(j["name"])}</h4><span class="en">{e(j.get("en", ""))}</span>'
                     f'<a class="go" href="../jobs/{e(j["id"])}/">직무 설명 →</a></header><ol class="iq-list">')
            for k, q in enumerate(iq[j["id"]][:5], 1):
                h.append(f'<li><span class="no">{k}</span><div class="body"><p class="q">{e(q["q"])}</p>{chips(q.get("i", []))}</div></li>')
            h.append('</ol></article>')
        h.append('</div>')
    h.append('</section>')
    h.append('<div class="cta"><h2>답변 스크립트, 혼자 만들기 어렵다면</h2><p>지원 회사와 직무에 맞춘 면접 스크립트를 취업조로 컨설턴트가 1:1로 같이 만듭니다.</p><div class="cta-row"><a class="btn primary" href="../apply/index.html">무료 상담 신청하기 ⚡</a></div></div>')
    return "\n".join(h)


INTERVIEW_ALL_CSS = """
.iqpage { max-width: 1120px; margin: 0 auto; padding: 0 20px 20px; }
.iq-hero { padding: clamp(20px, 2.6vw, 36px) 0 26px; border-bottom: 1px solid var(--line); }
.iq-hero .kick { font-family: var(--display); font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); display: flex; gap: 12px; align-items: center; }
.iq-hero .kick i { width: 8px; height: 8px; border-radius: 50%; background: var(--acc); display: inline-block; }
.iq-hero h1 { margin-top: 12px; font-family: var(--display); font-weight: 900; font-size: clamp(32px, 5vw, 64px); line-height: 1.02; letter-spacing: -.05em; }
.iq-hero h1 .mark { background: linear-gradient(transparent 68%, var(--mark) 68%); }
.iq-hero p { margin-top: 16px; max-width: 66ch; color: var(--ink-soft); font-size: 15.5px; line-height: 1.7; }
.iq-bar { position: sticky; top: calc(54px + env(safe-area-inset-top,0px)); z-index: 15; background: var(--paper); border-bottom: 1px solid var(--line); margin: 0 -20px; padding: 0 20px; }
.iq-bar-in { display: flex; align-items: center; gap: 10px; padding: 10px 0; min-width: 0; }
.iq-bar .top { flex: none; font-family: var(--display); font-weight: 700; font-size: 13px; padding: 9px 14px; border-radius: 999px; background: var(--ink); color: var(--paper); text-decoration: none; }
.iq-bar select { flex: none; font: inherit; font-size: 14px; font-weight: 700; padding: 9px 14px; border-radius: 999px; border: 1.5px solid var(--ink); background: var(--acc); color: var(--acc-ink); max-width: 46vw; }
.iq-g { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; min-width: 0; flex: 1 1 auto; }
.iq-g::-webkit-scrollbar { display: none; }
.iq-g a { flex: none; font-size: 13px; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line-strong); color: var(--ink-soft); text-decoration: none; white-space: nowrap; }
.iq-g a:hover { border-color: var(--ink); color: var(--ink); }
.iq-sec, .iq-group, .iq-job { scroll-margin-top: 130px; }
.iq-sec { padding-top: 56px; }
.iq-head { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 6px 20px; align-items: end; border-bottom: 1px solid var(--ink); padding-bottom: 14px; margin-bottom: 8px; }
.iq-head .num { grid-row: span 2; font-family: var(--display); font-weight: 900; font-size: clamp(40px, 5vw, 72px); line-height: .9; color: transparent; -webkit-text-stroke: 1.5px var(--ink); }
.iq-head h2 { font-family: var(--display); font-weight: 900; font-size: clamp(26px, 3.4vw, 44px); letter-spacing: -.045em; line-height: 1; }
.iq-head h2 b { background: linear-gradient(transparent 68%, var(--mark) 68%); }
.iq-head p { font-size: 14px; color: var(--muted); }
.iq-head.sub { grid-template-columns: 1fr; border-bottom: 0; margin: 34px 0 0; padding: 0; }
.iq-head.sub h3 { font-family: var(--display); font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--muted); }
.intent { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.intent li { display: inline-flex; align-items: center; width: auto; height: auto; line-height: 1.3; white-space: nowrap; font-size: 12.5px; font-weight: 600; padding: 5px 11px; border-radius: 999px; background: var(--mist); border: 1px solid var(--line); color: var(--ink-soft); }
.iq-top { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 0 28px; }
.iq-top > li { display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 14px; padding: 22px 0; border-bottom: 1px solid var(--line); }
.iq-top .no { font-family: var(--display); font-weight: 900; font-size: 44px; line-height: .9; letter-spacing: -.05em; color: var(--ink); }
.iq-top .q { margin-top: 6px; font-family: var(--display); font-size: 19px; font-weight: 900; letter-spacing: -.03em; line-height: 1.35; color: var(--ink); }
.iq-top .meta { display: flex; gap: 10px; align-items: center; }
.tp { font-family: var(--display); font-size: 11.5px; font-weight: 700; letter-spacing: .08em; color: var(--muted); }
.freq { font-size: 9px; letter-spacing: 2px; color: var(--ink); } .freq i { font-style: normal; color: var(--line-strong); }
.iq-list > li { display: grid; grid-template-columns: 40px minmax(0,1fr) auto; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--line); align-items: start; }
.iq-list .no { font-family: var(--display); font-weight: 900; font-size: 18px; color: var(--ink); padding-top: 1px; }
.iq-list .q { font-size: 16px; font-weight: 700; line-height: 1.5; color: var(--ink); }
.iq-list .tp { padding-top: 4px; white-space: nowrap; }
.iq-group { padding-top: 34px; }
.iq-group > h3 { font-family: var(--display); font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); padding-bottom: 6px; }
.iq-job { margin-top: 14px; padding: 6px 0 4px; border-top: 1px solid var(--ink); transition: background .6s; }
.iq-job.flash { background: var(--mist); }
.iq-job header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding: 14px 0 4px; }
.iq-job h4 { font-family: var(--display); font-size: 24px; font-weight: 900; letter-spacing: -.04em; }
.iq-job .en { font-family: var(--display); font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.iq-job .go { margin-left: auto; font-family: var(--display); font-size: 12px; font-weight: 700; letter-spacing: .04em; color: var(--ink); text-decoration: none; border-bottom: 2px solid var(--ink); }
.iqpage .cta { margin-top: 48px; }
@media (max-width: 760px) {
  .iq-top { grid-template-columns: 1fr; }
  .iq-top > li { grid-template-columns: 48px minmax(0,1fr); }
  .iq-top .no { font-size: 34px; }
  .iq-list > li { grid-template-columns: 30px minmax(0,1fr); }
  .iq-list .tp { display: none; }
  .iq-bar-in { gap: 8px; padding: 8px 0; }
  .iq-bar .top { font-size: 12px; padding: 9px 12px; }
  .iq-bar select { max-width: none; flex: 1 1 auto; min-width: 0; font-size: 13.5px; padding: 9px 12px; }
  .iq-g { display: none; }   /* 폰은 직군 칩 없이 한 줄: 직무 선택만으로 이동 */
  .iq-sec, .iq-group, .iq-job { scroll-margin-top: 120px; }
}
"""

INTERVIEW_ALL_JS = """<script>
(function () {
  function go(id, smooth) {
    var el = document.getElementById(id); if (!el) return;
    var bar = document.querySelector('.iq-bar'), off = 54 + (bar ? bar.offsetHeight : 0) + 12;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - off, behavior: smooth ? 'smooth' : 'auto' });
    if (el.classList.contains('iq-job')) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1400); }
  }
  var sel = document.getElementById('iqJob');
  sel.addEventListener('change', function () { if (!this.value) return; history.replaceState(null, '', '#' + this.value.slice(2)); go(this.value, true); });
  // 직무사전에서 #직무id 로 들어오면 그 직무로
  var h = location.hash.slice(1);
  if (h) { var id = document.getElementById('j-' + h) ? 'j-' + h : h; setTimeout(function () { go(id, false); if (id.indexOf('j-') === 0) sel.value = id; }, 60); }
})();
</script>"""
