"""
취업/커리어 뉴스 수집기 v4
  1) 언론사 RSS 14개 + Google News 검색 12개를 병렬 수집
  2) 중복 제거 -> 3개 섹션으로 분류 & 점수화 -> 같은 사건 기사는 하나로 묶음
  3) 섹션별 상위 N건 선별
  4) 기사 본문에서 요약 + 썸네일(og:image) 추출 -> data URI로 임베드
     (Google News 링크는 원문 URL로 복원한 뒤 추출)
  5) Claude로 기사별 한 줄 요약·Zorro의 한마디·직무 태그 + 오늘의 브리핑 3줄 (API 키가 있을 때만)
  6) news_data.json + archive/날짜.json 저장  (build_site.py 가 이걸 읽어 웹페이지를 만든다)

사용법:
  python collect_news.py                # 수집 -> news_data.json
  python collect_news.py --top 10       # 섹션당 10건으로 고정 (기본은 섹션별 배분)
  python collect_news.py --no-ai        # AI 브리핑 생략
  python collect_news.py --notion       # Notion 데이터베이스에도 저장 (기존 동작)

종료 코드: 0 정상 / 2 지면에 올릴 기사가 0건 (자동 실행 시 실패로 감지되도록)
"""

import argparse
import base64
import html
import io
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

import feedparser
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

import ai_brief
import gnews
from classifier import SECTIONS, classify, slots as section_slots, is_season
from sources import all_feeds, source_bonus

# Windows 콘솔에서 한글이 깨지지 않도록
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "news_data.json"
ARCHIVE_DIR = BASE_DIR / "archive"      # 날짜별 지면 보관소 (archive/2026-08-23.json)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
HTTP_HEADERS = {"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"}

MAX_AGE_DAYS = 3          # 수집 풀: 3일 이내 기사 (과거 지면 소급 생성용)
FRESH_HOURS = 48          # 오늘 지면: 48시간 이내 기사만 (아침 지면이니 '어제 소식'까지가 한계)
REPEAT_GUARD_DAYS = 7     # 최근 7일 지면에 이미 실린 기사는 오늘 지면에서 뺀다
SAME_STORY_GUARD_DAYS = 3 # 최근 3일 지면에 오른 사안은 제목이 달라도(다른 언론사) 뺀다
THUMB_SIZE = (420, 280)   # 썸네일 저장 크기
FETCH_WORKERS = 8


# ============================================================
# 1. 수집
# ============================================================

def normalize_title(title):
    """중복 판정용 제목 정규화: 말머리/기호/공백 제거"""
    t = re.sub(r"\[[^\]]{1,20}\]", "", title)     # [단독], [영상] 등 말머리
    t = re.sub(r"[^가-힣a-zA-Z0-9]", "", t)
    return t.lower()


def strip_html(raw):
    """RSS 설명문에서 태그를 걷어내고 순수 텍스트만"""
    if not raw:
        return ""
    text = BeautifulSoup(raw, "html.parser").get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def parse_published(entry):
    """RSS 발행시각 -> datetime (없으면 현재시각)"""
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        return datetime(*parsed[:6], tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def fetch_feed(feed_info):
    """RSS 피드 하나를 파싱해 기사 dict 리스트로"""
    try:
        parsed = feedparser.parse(feed_info["url"])
    except Exception as e:
        print(f"  [실패] {feed_info['name']}: {type(e).__name__}")
        return []

    articles = []
    for entry in parsed.entries:
        title = strip_html(entry.get("title", "")).strip()
        link = entry.get("link", "")
        if not title or not link.startswith("http"):
            continue

        # Google News는 <source>에 실제 언론사명이 들어있고,
        # 제목 끝에 " - 언론사"를 붙여준다 → 언론사명을 떼어내 제목을 깨끗하게 만든다
        source = feed_info["name"]
        if source == "Google News":
            src = entry.get("source")
            if src and src.get("title"):
                source = src["title"]
                suffix = f" - {source}"
                if title.endswith(suffix):
                    title = title[: -len(suffix)].strip()
            title = re.sub(r"\s+-\s+[^\-]{2,20}$", "", title).strip()

        articles.append({
            "title": title,
            "link": link,
            "source": source,
            "feed": feed_info["name"],
            "rss_summary": strip_html(entry.get("summary", ""))[:500],
            "published": parse_published(entry),
        })
    return articles


def collect_all():
    """
    모든 피드를 병렬 수집.
    기사를 하나도 못 가져온 피드는 dead 목록에 담아 돌려준다 (지면 하단·로그에 표시)
    """
    feeds = all_feeds()
    print(f"RSS 피드 {len(feeds)}개 병렬 수집 중...")

    collected, dead = [], []
    with ThreadPoolExecutor(max_workers=12) as pool:
        for feed, articles in zip(feeds, pool.map(fetch_feed, feeds)):
            collected.extend(articles)
            if not articles:
                dead.append(feed.get("query") or f"{feed['name']} {feed['url']}")

    print(f"  원본 {len(collected)}건 수집")
    if dead:
        print(f"  [경고] 기사 0건 피드 {len(dead)}개: " + " / ".join(dead))
    return collected, dead


# ============================================================
# 2. 정제 & 분류
# ============================================================

def dedupe(articles):
    """정규화 제목 + URL 기준 중복 제거 (먼저 온 것을 유지)"""
    seen_title, seen_url, out = set(), set(), []
    for a in articles:
        nt = normalize_title(a["title"])
        if len(nt) < 6 or nt in seen_title or a["link"] in seen_url:
            continue
        seen_title.add(nt)
        seen_url.add(a["link"])
        out.append(a)
    return out


def filter_recent(articles):
    """MAX_AGE_DAYS 이내 기사만"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    return [a for a in articles if a["published"] >= cutoff]


def filter_fresh(articles, hours=FRESH_HOURS):
    """오늘 지면용: FRESH_HOURS 이내 기사만 (3일 창은 풀 보관용이라 지면에는 너무 낡은 기사가 섞인다)"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    return [a for a in articles if a["published"] >= cutoff]


def already_published(days=REPEAT_GUARD_DAYS, raw=False):
    """
    최근 지면(archive/*.json)에 실린 기사의 정규화 제목·URL 집합.
    같은 기사가 며칠 연속 지면에 오르는 걸 막는다 (관련 기사 묶음까지 포함).
    """
    titles, urls = set(), set()
    today = datetime.now().date()
    for i in range(1, days + 1):
        path = ARCHIVE_DIR / f"{today - timedelta(days=i):%Y-%m-%d}.json"
        if not path.exists():
            continue
        try:
            day = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for sec in day.get("sections", []):
            for a in sec.get("articles", []):
                titles.add(a.get("title", "") if raw else normalize_title(a.get("title", "")))
                urls.add(a.get("url"))
                for r in a.get("related", []):
                    titles.add(r.get("title", "") if raw else normalize_title(r.get("title", "")))
                    urls.add(r.get("url"))
    titles.discard("")
    urls.discard(None)
    return titles, urls


def drop_already_published(articles):
    """
    최근 지면에 실린 기사를 뺀다.
      - 7일: 제목·URL이 똑같은 기사 (같은 기사 재게재)
      - 3일: 제목이 달라도 같은 사안인 기사 (다른 언론사가 쓴 같은 뉴스가 하루 뒤 다시 1면에 오르는 것)
    """
    titles, urls = already_published()
    recent_titles, _ = already_published(days=SAME_STORY_GUARD_DAYS, raw=True)   # 원래 제목(띄어쓰기 그대로)이어야 핵심어 비교가 된다
    recent_sigs = [_story_sig(t) for t in recent_titles]
    out = []
    for a in articles:
        if normalize_title(a["title"]) in titles or a["link"] in urls:
            continue
        sig = _story_sig(a["title"])
        if any(_same_story(sig, ps) for ps in recent_sigs):
            continue
        out.append(a)
    return out


def _jaccard(a, b):
    union = len(a | b)
    return len(a & b) / union if union else 0.0


def _signature(title):
    """
    유사도 비교용 지문 두 종류.
      - 문자 3-gram: 표현만 조금 다른 같은 제목을 잡는다
      - 단어 집합:   문장 구조가 달라도 같은 사안이면 고유명사가 겹친다
    """
    norm = normalize_title(title)
    grams = {norm[i:i + 3] for i in range(len(norm) - 2)}
    words = {w for w in re.split(r"[^가-힣a-zA-Z0-9.]+", title) if len(w) >= 2}
    return grams, words


# 문자 지문은 표현이 비슷할 때, 단어 지문은 같은 사안을 다르게 쓴 기사일 때 걸린다
GRAM_THRESHOLD = 0.42
WORD_THRESHOLD = 0.26
# 제목 맨 앞 주어(예: "한화오션,")가 같으면 단어가 조금만 겹쳐도 같은 사안으로 본다
SAME_SUBJECT_WORD_THRESHOLD = 0.12
MAX_RELATED = 3


def _subject(title):
    """'한화오션, 핵잠 …' 처럼 쉼표로 끝나는 맨 앞 주어. 없으면 None."""
    t = re.sub(r"^\s*\[[^\]]{1,20}\]\s*", "", title)
    m = re.match(r"([가-힣A-Za-z0-9&]{2,12})\s*,", t)
    return m.group(1) if m else None


# 2026-10-31 사용자: 같은 사건 기사는 꼭 하나로 묶는다 (10-31 '홈플러스 희망퇴직 철회' 5건, 10-28 'MS 희망퇴직' 5건이 따로 실림)
#   → 조사·'천억' 표기를 맞춘 핵심어가 2개 이상 겹치면 같은 사건 (흔한 말은 STORY_STOP 으로 뺀다)
STORY_JOSA = re.compile(r"(으로|에서|에게|까지|부터|마저|조차|에도|으론|은|는|이|가|을|를|에|의|도|와|과|로|만)$")
STORY_STOP = {"채용", "신입", "경력", "연봉", "기업", "청년", "일자리", "실적", "영업이익", "영업익", "매출", "분기", "1분기", "2분기", "3분기", "4분기",
              "직원", "인력", "전년", "역대", "최대", "AI", "올해", "내년", "지난해", "이번", "사업", "시장", "확대", "강화", "추진", "발표", "공개", "선정",
              "개최", "지원", "정부", "국내", "글로벌", "종합", "단독", "속보", "인상", "노사", "금융", "청년채용", "실시", "하반기", "상반기", "등록", "활용",
              "고용", "취업", "구직", "직장인", "노동", "임금", "기준", "제도", "도입", "출시", "모집", "공채", "명", "억", "만"}
STORY_MIN_SHARED = 2
# 사건을 가리키지 못하는 흔한 주제어: 겹치는 핵심어가 이것뿐이면 같은 사건으로 보지 않는다 ('인재 확보'·'구조조정 희망퇴직'이 다른 회사 기사끼리 묶이던 문제)
STORY_GENERIC = {"인재", "확보", "양성", "전문인력", "구조조정", "희망퇴직", "감원", "해고", "고용률", "실업률", "취업자", "감소", "증가", "상승", "하락", "지역",
                 "원인", "많은", "조기", "노조", "파업", "임금", "기본급", "임협", "임단협", "타결", "합의", "실업급여", "반도체", "수출", "성과급", "퇴직금",
                 "공무원", "공공기관", "공기업", "은행", "대기업", "중소기업", "스타트업", "미래", "혁신", "협력", "체결", "MOU", "업무협약", "교육", "대학",
                 "역량", "평가", "면접", "서류", "합격", "경쟁률", "인턴", "모집", "경력직", "신입사원", "청년층", "중장년", "여성", "노인", "고령자", "외국", "최고", "최저", "대졸", "고졸", "대한민국", "으뜸기업",
                 "노동부", "고용노동부", "고용부", "기재부", "이상", "이하", "지급", "지급액", "논란", "사과", "전국", "서울", "부산", "인천", "경기"}
STORY_GENERIC_RE = re.compile(r"^(\d+(월|년|일|분기|%|명|만|억|조|배))$")


def _story_tokens(title):
    t = re.sub(r"\[[^\]]{1,20}\]", "", title)
    t = re.sub(r"(\d+)\s*천\s*(억|만)", lambda m: str(int(m.group(1)) * 1000) + m.group(2), t)   # 1천억원 = 1000억원
    out = set()
    for w in re.split(r"[^가-힣a-zA-Z0-9]+", t):
        if len(w) > 2:
            w = STORY_JOSA.sub("", w)
        w = re.sub(r"(억|만)원$", r"\1", w)
        if len(w) >= 2 and w not in STORY_STOP and not re.fullmatch(r"\d+", w):
            out.add(w)
    return out


def _same_story(sig_a, sig_b):
    (grams_a, words_a, subj_a, toks_a), (grams_b, words_b, subj_b, toks_b) = sig_a, sig_b
    if _jaccard(grams_a, grams_b) >= GRAM_THRESHOLD:
        return True
    shared = toks_a & toks_b
    if len(shared) >= STORY_MIN_SHARED and any(w not in STORY_GENERIC and not STORY_GENERIC_RE.match(w) for w in shared):
        return True
    words = _jaccard(words_a, words_b)
    if words >= WORD_THRESHOLD:
        return True
    return bool(subj_a) and subj_a == subj_b and words >= SAME_SUBJECT_WORD_THRESHOLD


def _story_sig(title):
    """_same_story 비교용 지문 (문자 3-gram, 단어 집합, 맨 앞 주어)"""
    grams, words = _signature(title)
    return grams, words, _subject(title), _story_tokens(title)


def cluster_near_duplicates(articles):
    """
    같은 사안을 다른 제목으로 쓴 기사를 하나로 묶는다.
    (예: "한화오션, 핵잠 추진 발맞춰 경력직 채용" ↔ "한화오션, 핵추진잠수함 전문인력 … 경력직 채용")
    점수 높은 순으로 훑으며, 앞서 채택한 기사와 같은 사안이면 그 기사의 related 목록에 넣는다.
    지면에는 대표 기사만 오르고, 묶인 기사는 "관련 기사"로 함께 표시된다.
    """
    kept, sigs = [], []
    for a in articles:
        grams, words = _signature(a["title"])
        if not grams:
            continue
        sig = (grams, words, _subject(a["title"]), _story_tokens(a["title"]))
        leader = next((k for k, s in zip(kept, sigs) if _same_story(sig, s)), None)
        if leader is not None:
            related = leader["related"]
            if len(related) < MAX_RELATED and a["source"] != leader["source"]:
                related.append({"title": a["title"], "source": a["source"], "url": a["link"]})
            continue
        a["related"] = []
        kept.append(a)
        sigs.append(sig)
    return kept


def merge_same_story(payload):
    """이미 만든 지면(payload)에서 같은 사건 기사를 하나로 묶는다 — 뒤에 나온 기사는 앞 기사의 '관련 기사'로.
    수집 때 묶기에서 빠진 지면(예전 지면·캐시된 오늘 지면)도 화면에 낼 때 다시 걸러 준다 (2026-10-31 사용자). 묶은 건수를 돌려준다."""
    sigs, leaders, removed = [], [], 0
    for sec in payload.get("sections", []):
        keep = []
        for a in sec.get("articles", []):
            sg = _story_sig(a.get("title", ""))
            lead = next((l for l, s_ in zip(leaders, sigs) if _same_story(sg, s_)), None)
            if lead is not None:
                rel = lead.setdefault("related", [])
                if len(rel) < MAX_RELATED and all(r.get("url") != a.get("url") for r in rel):
                    rel.append({"title": a.get("title"), "source": a.get("source"), "url": a.get("url")})
                removed += 1
                continue
            leaders.append(a); sigs.append(sg); keep.append(a)
        for i, a in enumerate(keep, 1):
            if "rank" in a:
                a["rank"] = i
        sec["articles"] = keep
    return removed


def bucketize(articles):
    """
    이미 분류된 기사들을 점수순 정렬 -> 같은 사건 묶기 -> 섹션별로 나눈다.
    묶기를 섹션 분배보다 먼저 해야, 같은 사건이 서로 다른 섹션에 두 번 실리지 않는다.
    """
    ranked = sorted((a for a in articles if a.get("section")),
                    key=lambda x: (x["score"], x["published"]), reverse=True)
    # 상위권만 비교하면 충분하다 (어차피 그 아래는 지면에 안 나간다)
    ranked = cluster_near_duplicates(ranked[:180]) + ranked[180:]

    buckets = {s["key"]: [] for s in SECTIONS}
    for a in ranked:
        buckets[a["section"]].append(a)
    return buckets


def classify_all(articles):
    """섹션 배정 + 점수화. 섹션별 리스트(점수 내림차순)로 묶어 반환"""
    for a in articles:
        key, score, matched = classify(
            a["title"], a["rss_summary"], source_bonus(a["source"]))
        a["section"] = key
        a["score"] = score
        a["keywords"] = matched
    return bucketize([a for a in articles if a.get("section")])


# ============================================================
# 3. 본문 요약 + 썸네일
# ============================================================

def make_thumbnail(image_url, client):
    """이미지를 내려받아 축소 후 data URI로. 실패하면 None."""
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        resp = client.get(image_url, timeout=12)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")

        # 가운데를 THUMB_SIZE 비율로 잘라낸 뒤 축소 (CSS object-fit:cover 와 같은 효과)
        tw, th = THUMB_SIZE
        target_ratio = tw / th
        w, h = img.size
        if w / h > target_ratio:
            new_w = int(h * target_ratio)
            img = img.crop(((w - new_w) // 2, 0, (w + new_w) // 2, h))
        else:
            new_h = int(w / target_ratio)
            img = img.crop((0, (h - new_h) // 2, w, (h + new_h) // 2))
        img = img.resize(THUMB_SIZE, Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=72, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


def extract_summary(soup, fallback):
    """og:description -> 본문 첫 문장들 순으로 요약 확보"""
    for prop in ("og:description", "description"):
        tag = (soup.find("meta", attrs={"property": prop})
               or soup.find("meta", attrs={"name": prop}))
        if tag and tag.get("content") and len(tag["content"].strip()) > 40:
            return re.sub(r"\s+", " ", tag["content"]).strip()

    # 메타가 부실하면 본문 태그에서 직접
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "figure"]):
        tag.decompose()
    body = soup.find("article") or soup.find(
        "div", class_=re.compile("article|content|body|story|text", re.I))
    text = re.sub(r"\s+", " ", (body or soup).get_text(separator=" ", strip=True))

    sentences = [s.strip() for s in re.split(r"(?<=[.!?다])\s+", text) if len(s.strip()) > 25]
    joined = " ".join(sentences[:3])
    return joined[:400] if joined else fallback


def enrich(article):
    """기사 페이지를 열어 요약과 썸네일을 채운다"""
    article["image"] = None
    article["summary"] = clean_rss_summary(article)

    try:
        with httpx.Client(headers=HTTP_HEADERS, follow_redirects=True, timeout=15) as client:
            # Google News 링크는 원문 URL로 복원한다. 실패하면 RSS 설명문으로 대체.
            if gnews.is_google_link(article["link"]):
                original = gnews.decode(article["link"], client)
                if not original:
                    return article
                article["link"] = original

            resp = client.get(article["link"])
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # 일부 언론사는 메타 설명을 이중 이스케이프해서 '&hellip;' 같은 엔티티가 남는다
            article["summary"] = html.unescape(extract_summary(soup, article["summary"]))[:400]

            og = soup.find("meta", attrs={"property": "og:image"})
            if og and og.get("content", "").startswith("http"):
                article["image"] = make_thumbnail(og["content"], client)
    except Exception:
        pass
    return article


def clean_rss_summary(article):
    """
    RSS 설명문 정리. Google News 설명문은 '제목 + 언론사명'만 반복하는 경우가 많아
    제목과 거의 같으면 버린다 (지면에 제목이 두 번 찍히는 걸 막는다).
    """
    text = article["rss_summary"][:300]
    if normalize_title(article["title"]) in normalize_title(text) and len(text) < len(article["title"]) + 30:
        return ""
    return text


def split_lead(summary):
    """요약의 첫 문장을 리드(강조줄)로, 나머지를 본문 요약으로 분리"""
    parts = re.split(r"(?<=[.!?다])\s+", summary.strip(), maxsplit=1)
    lead = parts[0].strip()
    rest = parts[1].strip() if len(parts) > 1 else ""
    # 첫 문장이 지나치게 짧거나 길면 굳이 쪼개지 않는다
    if len(lead) < 15 or len(lead) > 120:
        return summary.strip(), ""
    return lead, rest


# ============================================================
# 4. 출력
# ============================================================

HIRING_TITLE = re.compile(r"채용|공채|인턴|신입사원|원서 접수|서류 접수|(직원|사원|인재|경력직|신입) ?모집")
HIRING_NOT = re.compile(r"가짜 채용|채용 비리|채용비리|부정채용|사기|해킹|피싱|불법|참여 모집|참가자|교육생|수강생|지원사업|입주")
HIRING_MIN = 3   # 2026-10-31 사용자: '채용 시즌·공고' 칸은 최소 3건 (10-31 지면은 1건뿐이었음)


def fill_hiring(buckets, recent, fresh):
    """48시간 안의 채용 기사가 3건이 안 되면, 최근 며칠 안 기사 중 지면에 안 실린 채용 기사로 채운다 (같은 사건은 빼고)"""
    have = buckets.get("hiring", [])
    if len(have) >= HIRING_MIN:
        return
    fresh_ids = {id(a) for a in fresh}
    older = drop_already_published([a for a in recent if id(a) not in fresh_ids])
    extra = classify_all(older).get("hiring", [])
    sigs = [_story_sig(a["title"]) for a in have]
    for a in extra:
        if len(have) >= HIRING_MIN:
            break
        sig = _story_sig(a["title"])
        if any(_same_story(sig, x) for x in sigs):
            continue
        a.setdefault("related", [])
        have.append(a); sigs.append(sig)
    if len(have) < HIRING_MIN:   # 그래도 모자라면: 제목에 채용·공채·모집이 들어간 기사(다른 칸 하위권·미분류 포함)로 채운다
        used = {id(a) for v in buckets.values() for a in v}
        cand = [a for a in drop_already_published(recent) if id(a) not in used and HIRING_TITLE.search(a["title"]) and not HIRING_NOT.search(a["title"])]
        for a in sorted(cand, key=lambda x: x["published"], reverse=True):
            if len(have) >= HIRING_MIN:
                break
            sig = _story_sig(a["title"])
            if any(_same_story(sig, x) for x in sigs):
                continue
            for v in buckets.values():   # 다른 칸에 있던 기사면 옮긴다
                if a in v: v.remove(a)
            a.update(section="hiring", score=a.get("score") or 0, keywords=a.get("keywords") or [])
            a.setdefault("related", [])
            have.append(a); sigs.append(sig)
    buckets["hiring"] = have
    print(f"  채용 칸 보충: {len(have)}건 (최근 {MAX_AGE_DAYS}일 기사에서)")


def allocate(buckets, top_n=None):
    """
    섹션별 지면 수를 정한다. top_n 이 주어지면 모든 섹션에 같은 수, 아니면 classifier.slots()
    (평시 5·5·4·3·3, 시즌엔 채용 7·지표 2). 기사가 모자라는 섹션의 빈자리는
    채용 -> 이직 -> 커리어변화 -> 기업 -> 지표 순으로 남는 기사가 있는 섹션에 넘긴다.
    """
    if top_n:
        return {s["key"]: top_n for s in SECTIONS}
    want = section_slots()
    give = {k: min(len(buckets.get(k, [])), n) for k, n in want.items()}
    spare = sum(want[k] - give[k] for k in want)
    for k in ["hiring", "moves", "future", "company", "macro"]:
        if spare <= 0:
            break
        extra = min(spare, len(buckets.get(k, [])) - give[k])
        if extra > 0:
            give[k] += extra
            spare -= extra
    return give


def build_payload(buckets, top_n, stats, date_str=None, generated_at=None):
    now = datetime.now()
    date_str = date_str or now.strftime("%Y-%m-%d")
    generated_at = generated_at or now.strftime("%Y-%m-%d %H:%M")
    give = top_n if isinstance(top_n, dict) else allocate(buckets, top_n)
    sections = []
    for sec in SECTIONS:
        items = []
        for rank, a in enumerate(buckets[sec["key"]][:give[sec["key"]]], 1):
            lead, rest = split_lead(a["summary"])
            items.append({
                "rank": rank,
                "title": a["title"],
                "lead": lead,
                "summary": rest,
                "url": a["link"],
                "source": a["source"],
                "published": a["published"].astimezone().strftime("%Y-%m-%d %H:%M"),
                "score": a["score"],
                "keywords": a["keywords"],
                "image": a["image"],
                "related": a.get("related", []),
            })
        sections.append({
            "key": sec["key"],
            "name": sec["name"],
            "en": sec["en"],
            "desc": sec["desc"],
            "articles": items,
        })

    return {
        "title": "CAREER BRIEFING",
        "date": date_str,
        "generated_at": generated_at,
        "stats": stats,
        "sections": sections,
    }


def strip_images(payload):
    """썸네일(data URI)을 뺀 사본. 과거 지면은 텍스트로만 보여주므로 보관할 필요가 없다."""
    return {
        **payload,
        "sections": [
            {**sec, "articles": [{**a, "image": None} for a in sec["articles"]]}
            for sec in payload["sections"]
        ],
    }


def save_archive(payload):
    """
    그날의 지면을 archive/YYYY-MM-DD.json 으로 보관 (주간·월간 랭킹·검색의 원천).
    썸네일을 빼고 저장해서 하루 20KB 안팎으로 유지한다 (GitHub 저장소가 불어나지 않게).
    """
    ARCHIVE_DIR.mkdir(exist_ok=True)
    path = ARCHIVE_DIR / f"{payload['date']}.json"
    path.write_text(json.dumps(strip_images(payload), ensure_ascii=False, indent=2),
                    encoding="utf-8")
    return path


def backfill_archive(articles, top_n):
    """
    아카이브가 비어 있을 때, 수집 풀에 들어있는 지난 며칠치 기사로 과거 지면을 채운다.
    본문/썸네일 보강은 생략한다 — 과거 지면은 텍스트로만 보여주므로 RSS 요약이면 충분하고,
    수백 건을 다시 크롤링할 이유가 없다.
    """
    ARCHIVE_DIR.mkdir(exist_ok=True)
    today = datetime.now().date()

    by_date = {}
    for a in articles:
        d = a["published"].astimezone().date()
        if d < today:
            by_date.setdefault(d, []).append(a)

    created = []
    for d in sorted(by_date):
        path = ARCHIVE_DIR / f"{d:%Y-%m-%d}.json"
        if path.exists():
            continue

        day_articles = by_date[d]
        for a in day_articles:
            a.setdefault("image", None)
            a.setdefault("summary", clean_rss_summary(a))

        buckets = bucketize(day_articles)
        payload = build_payload(
            buckets, top_n,
            stats={"collected": len(day_articles), "deduped": len(day_articles),
                   "recent": len(day_articles),
                   "relevant": sum(len(v) for v in buckets.values()),
                   "published": sum(allocate(buckets, top_n).values()),
                   "feeds": len(all_feeds())},
            date_str=f"{d:%Y-%m-%d}",
            generated_at=f"{d:%Y-%m-%d} (소급 생성)",
        )
        save_archive(payload)
        created.append(payload["date"])
    return created


# ============================================================
# 5. Notion 저장 (선택)
# ============================================================

def save_to_notion(payload):
    token, page_id = os.getenv("NOTION_TOKEN"), os.getenv("NOTION_PAGE_ID")
    if not token or not page_id:
        print("  NOTION_TOKEN / NOTION_PAGE_ID 없음 -> Notion 저장 건너뜀")
        return

    headers = {"Authorization": f"Bearer {token}",
               "Notion-Version": "2022-06-28",
               "Content-Type": "application/json"}

    def req(method, path, data=None):
        r = httpx.request(method, f"https://api.notion.com/v1/{path}",
                          headers=headers, json=data, timeout=30)
        r.raise_for_status()
        return r.json()

    db = req("POST", "databases", {
        "parent": {"type": "page_id", "page_id": page_id},
        "title": [{"type": "text", "text": {"content": f"취업조로의 커리어브리핑 - {payload['date']}"}}],
        "properties": {
            "순위": {"number": {}}, "섹션": {"select": {}}, "제목": {"title": {}},
            "요약": {"rich_text": {}}, "URL": {"url": {}},
            "출처": {"select": {}}, "점수": {"number": {}},
        },
    })
    db_id = db["id"]

    saved = 0
    for sec in payload["sections"]:
        for a in sec["articles"]:
            body = (a["lead"] + " " + a["summary"]).strip()
            try:
                req("POST", "pages", {
                    "parent": {"database_id": db_id},
                    "properties": {
                        "순위": {"number": a["rank"]},
                        "섹션": {"select": {"name": sec["name"]}},
                        "제목": {"title": [{"text": {"content": a["title"][:100]}}]},
                        "요약": {"rich_text": [{"text": {"content": body[:2000]}}]},
                        "URL": {"url": a["url"]},
                        "출처": {"select": {"name": a["source"][:50]}},
                        "점수": {"number": a["score"]},
                    },
                })
                saved += 1
            except Exception as e:
                print(f"  Notion 저장 실패: {e}")
    print(f"  Notion 저장 완료: {saved}건")


# ============================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=None,
                    help="섹션당 기사 수를 고정 (기본: 섹션별 배분 5·5·4·3·3, 시즌엔 채용 7·지표 2)")
    ap.add_argument("--notion", action="store_true", help="Notion에도 저장")
    ap.add_argument("--no-backfill", action="store_true",
                    help="지난 며칠치 지면 소급 생성을 건너뜀")
    ap.add_argument("--no-ai", action="store_true", help="Claude AI 브리핑 생략")
    args = ap.parse_args()

    print("=" * 60)
    print(f"취업조로의 커리어브리핑 수집  |  {datetime.now():%Y-%m-%d %H:%M}")
    print("=" * 60)

    raw, dead_feeds = collect_all()
    deduped = dedupe(raw)
    recent = filter_recent(deduped)
    print(f"  중복 제거 후 {len(deduped)}건 -> 최근 {MAX_AGE_DAYS}일 {len(recent)}건")

    # 오늘 지면 후보: 48시간 이내 + 최근 지면에 안 실린 것 (recent 는 과거 지면 소급 생성용으로 그대로 둔다)
    fresh = filter_fresh(recent)
    today_pool = drop_already_published(fresh)
    print(f"  오늘 지면 후보: {FRESH_HOURS}시간 이내 {len(fresh)}건"
          f" -> 최근 {REPEAT_GUARD_DAYS}일 지면 중복 제외 {len(today_pool)}건")

    buckets = classify_all(today_pool)
    fill_hiring(buckets, recent, fresh)
    relevant = sum(len(v) for v in buckets.values())
    print(f"  커리어 관련 {relevant}건 선별")
    for sec in SECTIONS:
        print(f"    - {sec['name']}: {len(buckets[sec['key']])}건")

    # 선별된 상위 기사만 본문/썸네일 보강
    give = allocate(buckets, args.top)
    season = " (채용 시즌 배분)" if is_season() and not args.top else ""
    print("  지면 배분" + season + ": " + ", ".join(f"{s['name']} {give[s['key']]}" for s in SECTIONS))
    targets = [a for sec in SECTIONS for a in buckets[sec["key"]][:give[sec["key"]]]]
    print(f"\n상위 {len(targets)}건 본문 요약 + 썸네일 추출 중...")
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        list(pool.map(enrich, targets))
    with_img = sum(1 for a in targets if a["image"])
    print(f"  완료 (썸네일 {with_img}/{len(targets)}건)")

    stats = {
        "collected": len(raw), "deduped": len(deduped),
        "recent": len(recent), "fresh": len(today_pool), "relevant": relevant,
        "published": len(targets), "feeds": len(all_feeds()),
        "dead_feeds": dead_feeds,
    }
    payload = build_payload(buckets, give, stats)

    if targets and not args.no_ai:
        print("\nAI 브리핑 생성 중...")
        ai_brief.annotate(payload)

    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    save_archive(payload)
    print(f"\n저장 완료: {DATA_FILE.name} ({DATA_FILE.stat().st_size / 1024:.0f} KB)"
          f" + archive/{payload['date']}.json")

    # 지난 며칠치 지면이 비어 있으면 수집 풀에서 소급 생성 (주간·월간 랭킹용)
    if not args.no_backfill:
        filled = backfill_archive(recent, args.top)
        if filled:
            print(f"  과거 지면 소급 생성: {', '.join(filled)}")

    for sec in payload["sections"]:
        print(f"\n[{sec['name']}]")
        for a in sec["articles"]:
            mark = "[img]" if a["image"] else "     "
            print(f"  {mark} {a['rank']}. ({a['score']:>2}점) {a['title'][:50]}  - {a['source']}")

    if args.notion:
        print("\nNotion 저장 중...")
        save_to_notion(payload)

    print("\n다음 단계:  python build_site.py")

    if not targets:
        print("\n[실패] 지면에 올릴 기사가 0건입니다. 피드 상태를 확인하세요.")
        sys.exit(2)


if __name__ == "__main__":
    main()
