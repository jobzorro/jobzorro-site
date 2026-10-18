"""
news_data.json + archive/*.json -> 정적 웹페이지(site/index.html) 생성

지면은 세 가지 모드로 본다.
  일간 - 날짜를 골라 그날의 섹션별 지면을 본다 (오늘은 썸네일까지, 과거는 텍스트로)
  주간 - 최근 7일 기사 점수 랭킹 + 이슈 키워드 순위
  월간 - 최근 30일 기준 동일

만드는 파일:
  site/index.html            오늘 지면(JS 데이터 __BRIEF__ 는 오늘 하루치만 박는다) + 아카이브 보기·주간·월간·검색 UI
  site/assets/archive.json   지난 날짜 기사 전체 + 주간·월간 랭킹(키워드·추이) — 페이지 JS 가 과거가 필요한 첫 동작 때 한 번 받는다
  site/assets/thumbs/*.jpg   오늘 지면 기사 썸네일 (news_data.json 의 data URI 를 파일로 뺀 것)
  site/<YYYY-MM-DD>/index.html  날짜별 정적 지면 (검색엔진이 하루를 하나의 URL 로 읽게)
  site/archive/index.html    지난 지면 전체 목록 (월별)
  site/days.json             날짜 목록 — 상위 build.py 가 sitemap 등에 쓴다

사용법:
  python build_site.py
  python build_site.py --data news_data.json --out site/index.html
"""

import argparse
import base64
import hashlib
import io
import shutil
import html
import json
import sys
from pathlib import Path

import rankings

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent

# AI 직무 태그 → 직무사전 직무 페이지 (사이트 루트 기준 상대 경로, "" 는 직무사전 첫 페이지)
# 뉴스 index(site/news/) 는 "../", 날짜별 지면(site/news/<날짜>/) 은 "../../" 를 앞에 붙인다
JOB_TAG_LINKS = {
    "인사": "jobs/hr/", "영업": "jobs/b2b-sales/", "재무": "jobs/finance/", "기획": "jobs/strategy/",
    "PM": "jobs/service-planning/", "MD": "jobs/md/", "구매": "jobs/purchasing/",
    "마케팅": "jobs/brand-marketer/", "개발": "jobs/sw-dev/", "디자인": "jobs/ux-designer/",
    "생산": "jobs/production-mgmt/", "연구": "jobs/product-dev/", "품질": "jobs/quality/",
    "건설": "jobs/construction-mgmt/", "공공": "jobs/public-admin/", "공통": "",
}


def e(text):
    """HTML 이스케이프 (None 안전)"""
    return html.escape(str(text or ""), quote=True)


# ============================================================
# 스타일
# ============================================================

STYLE = """
:root {
  --ink:        #111827;
  --ink-soft:   #374151;
  --muted:      #6b7280;
  --faint:      #7b8494;
  --brass:      #8b6b3f;
  --brass-tint: rgba(139,107,63,.09);
  --brass-bar:  rgba(139,107,63,.22);
  --paper:      #ffffff;
  --ground:     #f9fafb;
  --mist:       #f7f9fc;
  --hairline:   #e5e7eb;
  --hairline-2: #d5dae2;
  --shadow:     rgba(17,24,39,.06);
  --shadow-lift:rgba(17,24,39,.10);
  --up:         #b4453a;
  --down:       #2f6fb0;
  --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; --s4: #eda100; --s5: #e87ba4;

  --serif: "Playfair Display", Georgia, "Nanum Myeongjo", serif;
  --sans:  "Inter", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --mono:  "Inter", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink:        #e9ecf3;
    --ink-soft:   #c3c9d6;
    --muted:      #939bab;
    --faint:      #8a93a5;
    --brass:      #c9a063;
    --brass-tint: rgba(201,160,99,.14);
    --brass-bar:  rgba(201,160,99,.30);
    --paper:      #191d26;
    --ground:     #12141a;
    --mist:       #161a22;
    --hairline:   #2b313d;
    --hairline-2: #3a4150;
    --shadow:     rgba(0,0,0,.35);
    --shadow-lift:rgba(0,0,0,.5);
    --up:         #e0796c;
    --down:       #6fa8dc;
    --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181;
  }
}

:root[data-theme="dark"] {
  --ink:        #e9ecf3;
  --ink-soft:   #c3c9d6;
  --muted:      #939bab;
  --faint:      #8a93a5;
  --brass:      #c9a063;
  --brass-tint: rgba(201,160,99,.14);
  --brass-bar:  rgba(201,160,99,.30);
  --paper:      #191d26;
  --ground:     #12141a;
  --mist:       #161a22;
  --hairline:   #2b313d;
  --hairline-2: #3a4150;
  --shadow:     rgba(0,0,0,.35);
  --shadow-lift:rgba(0,0,0,.5);
  --up:         #e0796c;
  --down:       #6fa8dc;
  --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  word-break: keep-all;
}

a { color: inherit; text-decoration: none; }

:focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; border-radius: 3px; }

.container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }

/* ---------------- 마스트헤드 ---------------- */

.masthead { background: var(--paper); border-bottom: 1px solid var(--hairline); }
.masthead-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; padding: 16px 32px; max-width: 1280px; margin: 0 auto;
}
.brand { display: flex; align-items: center; gap: 16px; }
/* 취업조로 CI 로고 — 라이트는 검정, 다크는 흰색 버전으로 바꿔 보여준다 */
.brand-logo { display: block; height: 40px; width: auto; flex: none; }
.brand-logo-dark { display: none; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .brand-logo-light { display: none; }
  :root:not([data-theme="light"]) .brand-logo-dark  { display: block; }
}
:root[data-theme="dark"] .brand-logo-light { display: none; }
:root[data-theme="dark"] .brand-logo-dark  { display: block; }
.brand-text { border-left: 1px solid var(--hairline-2); padding-left: 16px; }
.brand-name { font-size: 18px; font-weight: 800; letter-spacing: -.4px; line-height: 1.2; display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 0; }
.brand-en {
  font-family: var(--serif); font-style: italic; font-weight: 700; font-size: 13.5px;
  letter-spacing: .06em; color: var(--brass); text-transform: uppercase; margin-left: 6px; vertical-align: 1px;
}
.stamp {
  font-family: var(--mono); font-size: 12.5px; color: var(--muted);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}

/* ---------------- 컨트롤 바 (기간 탭 + 날짜) ---------------- */

.controls {
  position: sticky; top: 0; z-index: 50;
  background: var(--paper); border-bottom: 1px solid var(--ink);
  box-shadow: 0 1px 0 var(--shadow);
}
.controls-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 20px; max-width: 1280px; margin: 0 auto; padding: 10px 32px;
}

.segmented { display: flex; border: 1px solid var(--hairline-2); border-radius: 8px; overflow: hidden; }
.seg {
  padding: 7px 18px; font-size: 13px; font-weight: 700; color: var(--muted);
  background: transparent; border: none; border-right: 1px solid var(--hairline-2);
  cursor: pointer; font-family: var(--sans); transition: background .18s, color .18s;
  white-space: nowrap;
}
.seg:last-child { border-right: none; }
.seg:hover { color: var(--ink); background: var(--brass-tint); }
.seg[aria-selected="true"] { background: var(--brass); color: #fff; }

.datenav { display: flex; align-items: center; gap: 8px; }
.datenav[hidden] { display: none; }
.datebtn {
  width: 30px; height: 30px; flex: none; display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid var(--hairline-2); border-radius: 7px;
  color: var(--ink); cursor: pointer; font-size: 13px; line-height: 1;
  transition: background .18s, border-color .18s;
}
.datebtn:hover:not(:disabled) { background: var(--brass-tint); border-color: var(--brass); }
.datebtn:disabled { opacity: .32; cursor: default; }
.dateselect {
  font-family: var(--mono); font-size: 13.5px; font-weight: 600; color: var(--ink);
  background: var(--paper); border: 1px solid var(--hairline-2); border-radius: 7px;
  padding: 6px 10px; cursor: pointer; font-variant-numeric: tabular-nums;
}
.range-note {
  font-family: var(--mono); font-size: 12.5px; color: var(--muted);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.range-note[hidden] { display: none; }

/* ---------------- 히어로 ---------------- */

.hero { background: var(--mist); border-bottom: 1px solid var(--hairline); }
.hero-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 64px; max-width: 1280px; margin: 0 auto; padding: 56px 32px 62px;
}
.hero-text { flex: 1 1 0; min-width: 0; }

.eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 7px 15px; margin-bottom: 26px;
  background: var(--paper); border: 1px solid var(--hairline); border-radius: 99px;
  font-family: var(--mono); font-size: 12.5px; font-weight: 500;
  letter-spacing: .06em; color: var(--muted); box-shadow: 0 1px 3px var(--shadow);
}
.pulse {
  width: 6px; height: 6px; border-radius: 50%; background: var(--brass); flex: none;
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }

.hero h1 {
  margin: 0 0 22px; font-size: clamp(30px, 4.2vw, 50px);
  font-weight: 800; letter-spacing: -.045em; line-height: 1.14; text-wrap: balance;
}
.hero h1 em { font-style: normal; color: var(--brass); }
.hero-sub { margin: 0 0 34px; max-width: 46ch; font-size: 16.5px; line-height: 1.65; color: var(--ink-soft); }

.funnel { display: flex; align-items: stretch; flex-wrap: wrap; }
.funnel-step { padding-right: 26px; margin-right: 26px; border-right: 1px solid var(--hairline-2); }
.funnel-step:last-child { border-right: none; margin-right: 0; padding-right: 0; }
.funnel-num {
  font-family: var(--mono); font-size: 25px; font-weight: 600;
  letter-spacing: -.02em; font-variant-numeric: tabular-nums; line-height: 1.1;
}
.funnel-label {
  margin-top: 4px; font-size: 12.5px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--muted); font-weight: 600;
}

.hero-picks { flex: 0 0 430px; max-width: 430px; display: flex; flex-direction: column; gap: 9px; }
.picks-head {
  display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 10px; margin-bottom: 3px; border-bottom: 1px solid var(--hairline-2);
}
.picks-title { font-family: var(--serif); font-size: 15px; font-weight: 700; }
.picks-note { font-family: var(--mono); font-size: 12px; letter-spacing: .1em; color: var(--faint); text-transform: uppercase; }

.pick {
  display: flex; flex-direction: column; gap: 3px; padding: 11px 15px;
  background: var(--paper); border: 1px solid var(--hairline); border-radius: 10px;
  box-shadow: 0 1px 3px var(--shadow);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.pick:hover { transform: translateX(-4px); border-color: var(--hairline-2); box-shadow: 0 5px 14px var(--shadow-lift); }
.pick-sector { font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--brass); }
.pick-title { font-size: 13.5px; font-weight: 700; line-height: 1.35; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-sum { font-size: 13px; line-height: 1.4; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---------------- 일간: 섹션 ---------------- */

.sector { padding: 60px 0 8px; }
.sector-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; padding-bottom: 15px; margin-bottom: 32px; border-bottom: 1px solid var(--ink);
}
.sector-head-left { display: flex; align-items: baseline; gap: 16px; min-width: 0; }
.sector-numeral { font-family: var(--serif); font-size: 34px; font-weight: 700; color: var(--brass); line-height: 1; flex: none; }
.sector-title { margin: 0; font-size: clamp(22px, 3vw, 33px); font-weight: 700; letter-spacing: -.035em; line-height: 1.15; }
.sector-desc { margin: 6px 0 0; font-size: 13px; color: var(--muted); }
.sector-count {
  flex: none; font-family: var(--mono); font-size: 12.5px; letter-spacing: .1em;
  color: var(--muted); text-transform: uppercase; padding-bottom: 3px;
}

.news-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 44px; row-gap: 2px; }

.news-card {
  position: relative;
  display: flex; align-items: flex-start; gap: 18px;
  padding: 18px 16px; margin: 0 -16px;
  border-bottom: 1px solid var(--hairline); border-radius: 8px;
  transition: background .3s ease, transform .3s ease, box-shadow .3s ease;
}
.news-card:hover {
  background: var(--paper); border-bottom-color: transparent;
  transform: translateY(-3px); box-shadow: 0 12px 26px var(--shadow);
}
.news-card:hover .news-thumb img { transform: scale(1.07); }
.news-card:hover .news-title { color: var(--brass); }

.news-thumb {
  flex: none; width: 128px; height: 86px; overflow: hidden;
  border-radius: 6px; background: var(--mist); border: 1px solid var(--hairline);
}
.news-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .55s cubic-bezier(.16,1,.3,1); }
.thumb-blank {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--brass-tint), transparent 70%);
  font-family: var(--serif); font-size: 26px; font-weight: 700; color: var(--brass); opacity: .55;
}

.news-body { flex: 1 1 auto; min-width: 0; }
.news-meta {
  display: flex; align-items: center; gap: 9px; margin-bottom: 7px;
  font-family: var(--mono); font-size: 12px; color: var(--faint); font-variant-numeric: tabular-nums;
}
.news-num { color: var(--brass); background: var(--brass-tint); padding: 2px 7px; border-radius: 3px; font-weight: 700; }
.news-source { color: var(--ink-soft); font-weight: 500; }
.news-dot { opacity: .45; }

.news-title { margin: 0 0 9px; font-size: 17.5px; font-weight: 700; letter-spacing: -.03em; line-height: 1.34; color: var(--ink); transition: color .25s ease; }
.news-lead { margin: 0 0 8px; padding-left: 11px; border-left: 3px solid var(--brass); font-size: 13.5px; font-weight: 500; line-height: 1.55; color: var(--ink-soft); }
.news-sum {
  margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--muted);
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.news-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.job-tags { margin-top: 7px; }
.job-tag { font-family: var(--mono); font-size: 12.5px; font-weight: 600; letter-spacing: 0; padding: 3px 9px; border-radius: 3px; color: var(--ink); background: var(--brass-tint); }
.tag { font-family: var(--mono); font-size: 12.5px; font-weight: 500; padding: 3px 9px; border: 1px solid var(--hairline-2); border-radius: 99px; color: var(--muted); }

.empty { padding: 30px 0; color: var(--muted); font-size: 14px; border-bottom: 1px solid var(--hairline); }
.loading { display: flex; align-items: center; gap: 10px; }
.loading::before { content: ""; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--hairline); border-top-color: var(--brass); animation: cb-spin .8s linear infinite; }
@keyframes cb-spin { to { transform: rotate(360deg); } }
.retry-btn { margin-left: 10px; padding: 6px 12px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--paper); color: var(--ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.retry-btn:hover { border-color: var(--brass); color: var(--brass); }

/* ---------------- 주간·월간: 랭킹 차트 ---------------- */

.rank-head { padding: 56px 0 0; }
.rank-title-row {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; padding-bottom: 15px; border-bottom: 1px solid var(--ink);
}
.rank-title { margin: 0; font-size: clamp(24px, 3.4vw, 36px); font-weight: 800; letter-spacing: -.04em; line-height: 1.12; }
.rank-title em { font-style: normal; color: var(--brass); }
.rank-sub { margin: 7px 0 0; font-size: 13px; color: var(--muted); }
.rank-meta { flex: none; font-family: var(--mono); font-size: 12.5px; letter-spacing: .04em; color: var(--muted); text-transform: uppercase; padding-bottom: 3px; text-align: right; }

.rank-layout { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 48px; align-items: start; padding-top: 30px; }

.chart { display: flex; flex-direction: column; }
.chart-row {
  display: grid; grid-template-columns: 52px minmax(0,1fr) auto;
  align-items: center; gap: 18px;
  padding: 14px 14px; margin: 0 -14px;
  border-bottom: 1px solid var(--hairline); border-radius: 8px;
  transition: background .25s ease, transform .25s ease;
}
.chart-row:hover { background: var(--paper); transform: translateX(4px); box-shadow: 0 8px 20px var(--shadow); }
.chart-row:hover .chart-title { color: var(--brass); }

.chart-rank {
  font-family: var(--mono); font-size: 25px; font-weight: 700; line-height: 1;
  color: var(--faint); font-variant-numeric: tabular-nums; text-align: right;
}
.chart-row.top .chart-rank { color: var(--brass); font-size: 30px; }

.chart-main { min-width: 0; }
.chart-title { margin: 0 0 6px; font-size: 15.5px; font-weight: 700; line-height: 1.38; letter-spacing: -.02em; transition: color .25s ease; }
.chart-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-family: var(--mono); font-size: 12px; color: var(--faint); font-variant-numeric: tabular-nums; }
.sec-badge { font-family: var(--sans); font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: var(--brass-tint); color: var(--brass); letter-spacing: -.01em; }

.chart-score { flex: none; width: 118px; text-align: right; }
.score-num { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.score-unit { font-size: 12px; color: var(--faint); margin-left: 2px; }
.score-track { height: 4px; margin-top: 6px; border-radius: 99px; background: var(--hairline); overflow: hidden; }
.score-fill { height: 100%; background: var(--brass-bar); border-radius: 99px; }
.chart-row.top .score-fill { background: var(--brass); }

/* 키워드 레일 */
.rail { position: sticky; top: 74px; }
.rail-box { background: var(--paper); border: 1px solid var(--hairline); border-radius: 12px; padding: 20px 20px 12px; box-shadow: 0 1px 3px var(--shadow); }
.rail-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding-bottom: 12px; margin-bottom: 6px; border-bottom: 1px solid var(--hairline-2); }
.rail-title { font-family: var(--serif); font-size: 15px; font-weight: 700; }
.rail-note { font-family: var(--mono); font-size: 12px; letter-spacing: .04em; color: var(--faint); text-transform: uppercase; }

.kw { display: grid; grid-template-columns: 20px minmax(0,1fr) auto auto; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--hairline); }
.kw:last-child { border-bottom: none; }
.kw-rank { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--faint); font-variant-numeric: tabular-nums; }
.kw:nth-child(-n+4) .kw-rank { color: var(--brass); }
.kw-name { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kw-count { font-family: var(--mono); font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.kw-move { font-family: var(--mono); font-size: 12px; font-weight: 700; min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
.kw-move.up { color: var(--up); }
.kw-move.down { color: var(--down); }
.kw-move.same { color: var(--faint); }
.kw-move.new { color: var(--brass); font-size: 12px; letter-spacing: .04em; }
.rail-foot { padding: 12px 0 4px; font-size: 12.5px; line-height: 1.6; color: var(--faint); }

/* ---------------- 푸터 ---------------- */

.howto { margin-top: 64px; border-top: 1px solid var(--hairline); }
.howto-inner { max-width: 1280px; margin: 0 auto; padding: 26px 32px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.howto-label { font-size: 13.5px; font-weight: 700; color: var(--ink); margin-bottom: 6px; }
.howto-text { margin: 0; font-size: 13.5px; line-height: 1.7; color: var(--ink-soft); }
.howto-text b { color: var(--brass); }
.foot-note { font-size: 13px; color: var(--muted); line-height: 1.8; }   /* render_health 가 쓰는 보조 문구 */
.howto-more { max-width: 1280px; margin: 0 auto; padding: 18px 32px 0; font-size: 13.5px; font-weight: 600; }
.howto-more a { color: var(--brass); }
.howto-more a:hover { text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 900px) { .howto-inner { grid-template-columns: 1fr; gap: 18px; } }

/* ---------------- 테마 토글 ---------------- */

.mast-right { display: flex; align-items: center; gap: 14px; }
.theme-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px;
  font-family: var(--mono); font-size: 11px; color: var(--muted);
  background: transparent; border: 1px solid var(--hairline-2); border-radius: 99px;
  cursor: pointer; transition: background .18s, color .18s;
}
.theme-btn:hover { color: var(--ink); background: var(--brass-tint); }

/* ---------------- 오늘의 브리핑 (AI) ---------------- */

.brief-box {
  margin: 0 0 30px; padding: 18px 20px 16px; max-width: 62ch;
  background: var(--paper); border: 1px solid var(--hairline); border-left: 3px solid var(--brass);
  border-radius: 10px; box-shadow: 0 1px 3px var(--shadow);
}
.brief-label {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--brass); font-weight: 700;
}
.brief-list { margin: 0; padding: 0; list-style: none; counter-reset: b; }
.brief-list li {
  counter-increment: b; position: relative; padding-left: 26px; margin: 0 0 7px;
  font-size: 14.5px; line-height: 1.6; color: var(--ink-soft);
}
.brief-list li::before {
  content: counter(b); position: absolute; left: 0; top: 1px;
  font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--brass);
}
.ai-tag {
  font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: .06em;
  padding: 1px 6px; border-radius: 3px; border: 1px solid var(--brass-bar); color: var(--brass);
}

/* ---------------- 카드 안의 AI 문장 · 관련 기사 ---------------- */

.news-link { color: inherit; }
.news-link::after { content: ""; position: absolute; inset: 0; border-radius: 8px; }
.news-why {
  margin: 8px 0 0; padding: 8px 11px; border-radius: 6px; background: var(--brass-tint);
  font-size: 12.5px; line-height: 1.55; color: var(--ink-soft);
}
.news-why b { color: var(--brass); font-weight: 700; margin-right: 4px; }
.news-related {
  position: relative; z-index: 1; margin-top: 9px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px;
  font-size: 11.5px; color: var(--faint);
}
.news-related a { color: var(--muted); text-decoration: underline; text-decoration-color: var(--hairline-2); text-underline-offset: 2px; }
.news-related a:hover { color: var(--brass); }
.tag { cursor: pointer; position: relative; z-index: 1; background: transparent; font: inherit; }
.tag:hover { border-color: var(--brass); color: var(--brass); }
.news-tags .tag { font-family: var(--mono); font-size: 9.5px; }
/* 직무 태그 링크: 카드 전체 링크(::after) 위에 올려야 태그 클릭이 원문으로 새지 않는다 */
a.job-tag { position: relative; z-index: 1; text-decoration: none; cursor: pointer; transition: background .15s ease, color .15s ease; }
a.job-tag:hover, a.job-tag:focus-visible { background: #c6ff3d; color: #0b0b0b; }

/* ---------------- 키워드 추이 차트 ---------------- */

.trend { margin-top: 30px; padding: 20px 20px 14px; background: var(--paper); border: 1px solid var(--hairline); border-radius: 12px; }
.trend-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.trend-title { margin: 0; font-family: var(--serif); font-size: 16px; font-weight: 700; }
.trend-note { font-size: 11.5px; color: var(--muted); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 0 4px; font-size: 12px; color: var(--ink-soft); }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.legend-swatch { width: 14px; height: 3px; border-radius: 2px; }
.trend-wrap { position: relative; }
.trend svg { display: block; width: 100%; height: auto; overflow: visible; }
.trend .grid { stroke: var(--hairline); stroke-width: 1; }
.trend .axis-text { fill: var(--faint); font-family: var(--mono); font-size: 10px; }
.trend .end-label { font-family: var(--sans); font-size: 11px; font-weight: 600; fill: var(--ink-soft); }
.trend .cross { stroke: var(--hairline-2); stroke-width: 1; }
.trend .dot { stroke: var(--paper); stroke-width: 2; }
.tip {
  position: absolute; pointer-events: none; z-index: 5; min-width: 140px;
  padding: 9px 11px; background: var(--paper); border: 1px solid var(--hairline-2); border-radius: 8px;
  box-shadow: 0 8px 22px var(--shadow-lift); font-size: 12px; color: var(--ink-soft);
}
.tip[hidden] { display: none; }
.tip-date { font-family: var(--mono); font-size: 10.5px; color: var(--muted); margin-bottom: 5px; }
.tip-row { display: flex; align-items: center; gap: 7px; justify-content: space-between; }
.tip-row span:first-child { display: inline-flex; align-items: center; gap: 6px; }
.tip-row b { font-family: var(--mono); font-weight: 600; color: var(--ink); }
.trend details { margin-top: 8px; font-size: 12px; color: var(--muted); }
.trend summary { cursor: pointer; }
.trend-table-wrap { overflow-x: auto; margin-top: 8px; }
.trend table { border-collapse: collapse; font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }
.trend th, .trend td { padding: 4px 8px; border-bottom: 1px solid var(--hairline); text-align: right; white-space: nowrap; }
.trend th:first-child, .trend td:first-child { text-align: left; font-family: var(--sans); }
.kw:hover .kw-name { color: var(--brass); }

/* ---------------- 검색 ---------------- */

.search-bar { display: flex; align-items: center; gap: 8px; }
.search-bar[hidden] { display: none; }
.search-input {
  width: min(320px, 60vw); padding: 7px 12px; font-size: 13px; font-family: var(--sans);
  color: var(--ink); background: var(--paper); border: 1px solid var(--hairline-2); border-radius: 7px;
}
.search-input:focus { outline: 2px solid var(--brass); outline-offset: 1px; }
.search-head { padding: 44px 0 14px; border-bottom: 1px solid var(--ink); }
.search-title { margin: 0; font-size: clamp(22px, 3vw, 30px); font-weight: 800; letter-spacing: -.04em; }
.search-title em { font-style: normal; color: var(--brass); }
.search-sub { margin: 6px 0 0; font-size: 13px; color: var(--muted); }
.search-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
mark { background: var(--brass-tint); color: inherit; padding: 0 1px; border-radius: 2px; }

/* ---------------- 수집 상태 ---------------- */

.health { margin-top: 14px; font-size: 11.5px; line-height: 1.7; color: var(--faint); }
.health b { color: var(--up); font-weight: 600; }

/* ---------------- 반응형 ---------------- */

@media (max-width: 1140px) {
  .rank-layout { grid-template-columns: 1fr; gap: 34px; }
  .rail { position: static; }
}

@media (max-width: 1080px) {
  .hero-inner { flex-direction: column; align-items: stretch; gap: 44px; padding: 44px 24px 52px; }
  .hero-picks { flex: 1 1 auto; max-width: none; }
  .news-grid { column-gap: 32px; }
}

@media (max-width: 860px) {
  .container { padding: 0 20px; }
  .masthead-inner { flex-wrap: wrap; gap: 12px; padding: 14px 20px; }
  .controls-inner { flex-wrap: wrap; gap: 12px; padding: 10px 20px; }
  .seg { padding: 7px 13px; font-size: 12.5px; }
  .news-grid { grid-template-columns: 1fr; row-gap: 4px; }
  .sector { padding-top: 42px; }
  .sector-head { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 22px; }
  .news-thumb { width: 96px; height: 68px; }
  .news-title { font-size: 15.5px; }
  .news-lead { font-size: 12.5px; }
  .funnel-step { padding-right: 18px; margin-right: 18px; }
  .funnel-num { font-size: 21px; }
  .rank-head { padding-top: 38px; }
  .rank-title-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .rank-meta { text-align: left; }
  .chart-row { grid-template-columns: 36px minmax(0,1fr); gap: 12px; padding: 13px 12px; margin: 0 -12px; }
  .chart-rank { font-size: 20px; }
  .chart-row.top .chart-rank { font-size: 23px; }
  .chart-score { grid-column: 2; width: auto; text-align: left; display: flex; align-items: center; gap: 10px; }
  .score-track { flex: 1 1 auto; margin-top: 0; max-width: 160px; }
  .howto-inner { padding: 22px 20px 0; }
}

@media (max-width: 520px) {
  .container { padding: 0 16px; }
  .masthead-inner, .controls-inner { padding-left: 16px; padding-right: 16px; }
  .hero-inner { padding: 34px 16px 40px; gap: 32px; }
  .stamp { white-space: normal; }
  .segmented { width: 100%; }
  .seg { flex: 1 1 0; padding: 8px 6px; }
  .datenav, .search-bar { width: 100%; }
  .dateselect, .search-input { flex: 1 1 auto; width: auto; min-width: 0; }
  .news-card { flex-direction: column; gap: 12px; }
  .news-thumb { width: 100%; height: 150px; }
  .funnel-step { padding-right: 12px; margin-right: 12px; }
  .funnel-num { font-size: 18px; }
  .brief-box { padding: 14px 14px 12px; }
  .trend { padding: 16px 12px 12px; }
  .howto-inner { padding: 20px 16px 0; }
  .howto-more { padding: 16px 16px 0; }
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  html { scroll-behavior: auto !important; }
}

html { scroll-behavior: smooth; }
"""

# 날짜별 정적 지면 · 아카이브 목록 페이지에서만 쓰는 규칙 (STYLE 뒤에 덧붙인다)
STATIC_STYLE = """
.day-head { padding: 44px 0 16px; border-bottom: 1px solid var(--ink); }
.day-kicker { font-family: var(--mono); font-size: 12.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--brass); margin-bottom: 10px; }
.day-title { margin: 0; font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -.04em; line-height: 1.15; }
.day-sub { margin: 8px 0 0; font-size: 13.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.daynav { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 12px 0; border-bottom: 1px solid var(--hairline); font-size: 13.5px; font-weight: 600; }
.daynav a { color: var(--ink-soft); white-space: nowrap; }
.daynav a:hover { color: var(--brass); }
.daynav .spacer { flex: 1 1 auto; }
.daynav .disabled { color: var(--faint); opacity: .5; }
.day-brief { padding-top: 32px; }
.day-brief .brief-box { max-width: 72ch; margin-bottom: 0; }
.day-foot { padding: 40px 0 0; }
.archive-month { padding: 44px 0 0; }
.archive-month h2 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -.03em; padding-bottom: 10px; border-bottom: 1px solid var(--ink); }
.archive-list { display: flex; flex-direction: column; }
.archive-row { display: grid; grid-template-columns: 118px 56px minmax(0,1fr); gap: 16px; align-items: baseline; padding: 12px 14px; margin: 0 -14px; border-bottom: 1px solid var(--hairline); border-radius: 8px; transition: background .2s ease, box-shadow .2s ease; }
.archive-row:hover { background: var(--paper); box-shadow: 0 8px 20px var(--shadow); }
.archive-row:hover .archive-date { color: var(--brass); }
.archive-date { font-family: var(--mono); font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; transition: color .2s ease; }
.archive-count { font-family: var(--mono); font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.archive-snip { font-size: 13.5px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 860px) { .archive-row { grid-template-columns: 104px 52px minmax(0,1fr); gap: 12px; padding: 11px 12px; margin: 0 -12px; } }
@media (max-width: 520px) { .archive-row { grid-template-columns: 1fr auto; } .archive-snip { grid-column: 1 / -1; white-space: normal; } }
"""

# 정적 페이지용 최소 스크립트: 테마 토글만 (index 의 SCRIPT 와 같은 localStorage 키를 쓴다)
STATIC_SCRIPT = r"""
(function () {
  var themeBtn = document.getElementById('themebtn');
  if (!themeBtn) return;
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_LABEL = { auto: '자동', light: '라이트', dark: '다크' };
  var theme = 'auto';
  try { theme = localStorage.getItem('cb-theme') || 'auto'; } catch (e) {}
  function applyTheme() {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = '테마 · ' + THEME_LABEL[theme];
  }
  themeBtn.addEventListener('click', function () {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem('cb-theme', theme); } catch (e) {}
    applyTheme();
  });
  applyTheme();
})();
"""


# ============================================================
# 클라이언트 렌더러
# ============================================================

SCRIPT = r"""
(function () {
  var D = window.__BRIEF__;
  var JOB_TAG_LINKS = __JOB_TAG_LINKS__;  // build_site.py 의 JOB_TAG_LINKS (직무 태그 → 직무사전)
  var view = document.getElementById('view');
  var segs = Array.prototype.slice.call(document.querySelectorAll('.seg'));
  var nav = document.getElementById('datenav');
  var sel = document.getElementById('dateselect');
  var prev = document.getElementById('dateprev');
  var next = document.getElementById('datenext');
  var note = document.getElementById('rangenote');
  var searchBar = document.getElementById('searchbar');
  var searchInput = document.getElementById('searchinput');

  var NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  var SERIES = ['--s1', '--s2', '--s3', '--s4', '--s5'];   // 추이 차트 계열색 (고정 순서)
  var dates = D.days.map(function (d) { return d.date; });
  var today = D.today || (dates.length ? dates[dates.length - 1] : null);
  var mode = 'daily';
  var current = today;
  var query = '';

  /* ---------- 지난 지면(archive.json) 지연 로딩 ----------
     페이지에는 오늘 하루치(D.daily[today])만 박혀 있다. 다른 날짜·주간/월간·검색처럼 과거가
     필요한 동작을 처음 할 때 assets/archive.json 을 한 번 받아 D 에 합치고, 그 다음부터는 재요청 없이
     기존 렌더 로직을 그대로 쓴다. */
  var ARCHIVE_URL = D.archive_url || 'assets/archive.json';
  var archiveState = D.periods && Object.keys(D.periods).length ? 'ready' : 'idle';  // idle | loading | ready | error
  var archiveError = '';
  D.daily = D.daily || {};
  D.periods = D.periods || {};

  function mergeArchive(ar) {
    var k;
    for (k in (ar.daily || {})) if (!D.daily[k]) D.daily[k] = ar.daily[k];   // 오늘 지면(썸네일 포함)은 페이지 것이 우선
    for (k in (ar.periods || {})) D.periods[k] = ar.periods[k];
    corpus = null;   // 검색 말뭉치는 다음 검색 때 다시 편다
  }

  function needsArchive() {
    if (archiveState === 'ready') return false;
    if (mode === 'daily') return !D.daily[current];
    return true;   // weekly / monthly / search
  }

  function loadArchive() {
    if (archiveState === 'loading' || archiveState === 'ready') return;
    archiveState = 'loading';
    archiveError = '';
    if (typeof fetch !== 'function') {
      archiveState = 'error'; archiveError = '이 브라우저는 지원하지 않습니다.'; paint(); return;
    }
    fetch(ARCHIVE_URL, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (ar) { mergeArchive(ar); archiveState = 'ready'; paint(); })
      .catch(function (err) {
        if (archiveState === 'ready') throw err;   // 데이터는 받았고 그리기에서 난 오류 — 네트워크 오류로 오인하지 않는다
        archiveState = 'error';
        archiveError = location.protocol === 'file:'
          ? '파일을 직접(file://) 열면 지난 지면을 불러올 수 없습니다. 배포된 주소나 로컬 웹 서버에서 열어 주세요.'
          : '지난 지면을 불러오지 못했습니다. (' + (err && err.message ? err.message : '네트워크 오류') + ')';
        paint();
      });
  }

  /* 불러오는 동안 / 실패했을 때 본문 자리에 보여줄 안내 */
  function archiveNotice() {
    view.innerHTML = '';
    if (archiveState === 'error') {
      var p = el('p', 'empty', archiveError);
      if (location.protocol !== 'file:') {
        var b = el('button', 'retry-btn', '다시 시도');
        b.type = 'button';
        b.addEventListener('click', function () { archiveState = 'idle'; paint(); });
        p.appendChild(b);
      }
      view.appendChild(p);
    } else {
      view.appendChild(el('p', 'empty loading', '지난 지면을 불러오는 중…'));
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svg(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function link(url, cls) {
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (cls) a.className = cls;
    return a;
  }

  /* 검색어를 <mark>로 감싼 텍스트 조각 (innerHTML 없이 만들어 XSS 걱정이 없다) */
  function highlighted(text, terms) {
    var frag = document.createDocumentFragment();
    text = String(text || '');
    if (!terms.length) { frag.appendChild(document.createTextNode(text)); return frag; }
    var lower = text.toLowerCase(), i = 0;
    while (i < text.length) {
      var hit = -1, len = 0;
      terms.forEach(function (t) {
        var j = lower.indexOf(t, i);
        if (j >= 0 && (hit < 0 || j < hit)) { hit = j; len = t.length; }
      });
      if (hit < 0) { frag.appendChild(document.createTextNode(text.slice(i))); break; }
      if (hit > i) frag.appendChild(document.createTextNode(text.slice(i, hit)));
      frag.appendChild(el('mark', null, text.slice(hit, hit + len)));
      i = hit + len;
    }
    return frag;
  }

  function tagButton(keyword) {
    var b = el('button', 'tag', keyword);
    b.type = 'button';
    b.title = '"' + keyword + '" 지난 기사 검색';
    b.addEventListener('click', function () { openSearch(keyword); });
    return b;
  }

  /* ---------- 일간 ---------- */

  function newsCard(article, numeral) {
    var card = el('article', 'news-card');

    var thumb = el('div', 'news-thumb');
    if (article.image) {
      var img = document.createElement('img');
      img.src = article.image;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      thumb.appendChild(img);
    } else {
      thumb.appendChild(el('div', 'thumb-blank', numeral));
    }
    card.appendChild(thumb);

    var body = el('div', 'news-body');
    var meta = el('div', 'news-meta');
    meta.appendChild(el('span', 'news-num', ('0' + article.rank).slice(-2)));
    meta.appendChild(el('span', 'news-source', article.source));
    meta.appendChild(el('span', 'news-dot', '·'));
    meta.appendChild(el('time', null, (article.published || '').slice(5)));
    body.appendChild(meta);

    // 제목 링크의 ::after 가 카드 전체를 덮어서, 카드 어디를 눌러도 원문으로 간다
    var title = el('h3', 'news-title');
    var a = link(article.url, 'news-link');
    a.textContent = article.title;
    title.appendChild(a);
    body.appendChild(title);

    var original = [article.lead, article.summary].filter(Boolean).join(' ');
    if (article.ai_line) {
      var lead = el('p', 'news-lead');
      lead.appendChild(el('span', 'ai-tag', 'AI'));
      lead.appendChild(document.createTextNode(' ' + article.ai_line));
      body.appendChild(lead);
      if (original) body.appendChild(el('p', 'news-sum', original));
    } else {
      if (article.lead) body.appendChild(el('p', 'news-lead', article.lead));
      if (article.summary) body.appendChild(el('p', 'news-sum', article.summary));
    }

    if (article.ai_why) {
      var why = el('p', 'news-why');
      // v2 지면: 조로 말투의 한마디. 지난 지면(v1)은 평서문 시사점이라 라벨을 구분한다
      why.appendChild(el('b', null, article.ai_tags ? 'Zorro의 한마디' : '커리어 시사점'));
      why.appendChild(document.createTextNode(article.ai_why));
      body.appendChild(why);
    }
    if (article.ai_tags && article.ai_tags.length) {
      var jobs = el('div', 'news-tags job-tags');
      article.ai_tags.forEach(function (t) {
        // 매핑된 직무는 직무사전 페이지로 (index 는 site/news/ 라 루트가 ../)
        if (!Object.prototype.hasOwnProperty.call(JOB_TAG_LINKS, t)) { jobs.appendChild(el('span', 'job-tag', '#' + t)); return; }
        var ja = el('a', 'job-tag', '#' + t);
        ja.href = '../' + JOB_TAG_LINKS[t];
        ja.title = '직무사전에서 ' + t + ' 직무 보기';
        ja.addEventListener('click', function (ev) { ev.stopPropagation(); });
        jobs.appendChild(ja);
      });
      body.appendChild(jobs);
    }

    if (article.keywords && article.keywords.length) {
      var tags = el('div', 'news-tags');
      article.keywords.slice(0, 3).forEach(function (k) { tags.appendChild(tagButton(k)); });
      body.appendChild(tags);
    }

    if (article.related && article.related.length) {
      var rel = el('div', 'news-related');
      rel.appendChild(el('span', null, '같은 사건 다른 보도'));
      article.related.forEach(function (r) {
        var ra = link(r.url);
        ra.textContent = r.source;
        ra.title = r.title;
        rel.appendChild(ra);
      });
      body.appendChild(rel);
    }

    card.appendChild(body);
    return card;
  }

  function briefBox(lines, label) {
    var box = el('div', 'brief-box');
    var head = el('div', 'brief-label');
    head.appendChild(el('span', 'ai-tag', 'AI'));
    head.appendChild(document.createTextNode(label));
    box.appendChild(head);
    var ol = el('ol', 'brief-list');
    lines.forEach(function (t) { ol.appendChild(el('li', null, t)); });
    box.appendChild(ol);
    return box;
  }

  function renderDaily(date) {
    var day = D.daily[date];
    view.innerHTML = '';
    if (!day) {
      view.appendChild(el('p', 'empty', '이 날짜의 지면이 없습니다.'));
      return;
    }

    // 오늘 브리핑은 상단 히어로에 있으니, 지난 날짜를 볼 때만 본문 위에 붙인다
    if (day.briefing && day.briefing.length && date !== today) {
      var wrap = el('div', null);
      wrap.style.paddingTop = '40px';
      wrap.appendChild(briefBox(day.briefing, date + ' 브리핑'));
      view.appendChild(wrap);
    }

    day.sections.forEach(function (sec, i) {
      var section = el('section', 'sector');

      var head = el('div', 'sector-head');
      var left = el('div', 'sector-head-left');
      left.appendChild(el('span', 'sector-numeral', String(i + 1)));
      var titles = document.createElement('div');
      titles.appendChild(el('h2', 'sector-title', sec.name));
      titles.appendChild(el('p', 'sector-desc', sec.desc));
      left.appendChild(titles);
      head.appendChild(left);
      head.appendChild(el('span', 'sector-count',
        sec.en + '  /  ' + sec.articles.length + ' 건'));
      section.appendChild(head);

      if (sec.articles.length) {
        var grid = el('div', 'news-grid');
        sec.articles.forEach(function (article, j) {
          grid.appendChild(newsCard(article, NUMERALS[j % NUMERALS.length]));
        });
        section.appendChild(grid);
      } else {
        section.appendChild(el('p', 'empty',
          '이 날은 이 섹션 기준을 넘긴 기사가 없습니다.'));
      }
      view.appendChild(section);
    });
  }

  /* ---------- 키워드 추이 차트 (SVG 꺾은선) ---------- */

  function trendChart(trend, period) {
    var box = el('section', 'trend');
    var head = el('div', 'trend-head');
    head.appendChild(el('h3', 'trend-title', '이슈 키워드 추이'));
    head.appendChild(el('span', 'trend-note', trend.smooth > 1
      ? '그날까지 ' + trend.smooth + '일간 등장 횟수 (이동합계)'
      : '날짜별 등장 횟수'));
    box.appendChild(head);

    // 범례: 계열이 2개 이상이면 항상 둔다 (색만으로 구분하지 않도록 선 끝 라벨도 함께)
    var legend = el('div', 'legend');
    trend.series.forEach(function (s, i) {
      var item = el('span', 'legend-item');
      var sw = el('span', 'legend-swatch');
      sw.style.background = 'var(' + SERIES[i] + ')';
      item.appendChild(sw);
      item.appendChild(document.createTextNode(s.keyword));
      legend.appendChild(item);
    });
    box.appendChild(legend);

    var W = 760, H = 230, L = 30, R = 84, T = 12, B = 26;
    var n = trend.dates.length;
    var max = 1;
    trend.series.forEach(function (s) { s.counts.forEach(function (c) { if (c > max) max = c; }); });
    var step = Math.max(1, Math.ceil(max / 4));
    var top = step * 4;
    function x(i) { return L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)); }
    function y(v) { return T + (H - T - B) * (1 - v / top); }

    var wrap = el('div', 'trend-wrap');
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': period + ' 이슈 키워드 추이 차트' });

    for (var g = 0; g <= 4; g++) {
      var gy = y(step * g);
      root.appendChild(svg('line', { x1: L, x2: W - R, y1: gy, y2: gy, 'class': 'grid' }));
      var gt = svg('text', { x: L - 8, y: gy + 3, 'text-anchor': 'end', 'class': 'axis-text' });
      gt.textContent = step * g;
      root.appendChild(gt);
    }

    // x축 날짜: 7일이면 전부, 30일이면 첫·중간·끝 + 주 단위
    trend.dates.forEach(function (d, i) {
      if (n > 8 && i % 7 !== (n - 1) % 7) return;
      var t = svg('text', { x: x(i), y: H - 6, 'text-anchor': 'middle', 'class': 'axis-text' });
      t.textContent = d.slice(5);
      root.appendChild(t);
    });

    trend.series.forEach(function (s, i) {
      var dpath = s.counts.map(function (c, j) {
        return (j ? 'L' : 'M') + x(j).toFixed(1) + ' ' + y(c).toFixed(1);
      }).join(' ');
      root.appendChild(svg('path', { d: dpath, fill: 'none',
        style: 'stroke:var(' + SERIES[i] + ');stroke-width:2;stroke-linejoin:round;stroke-linecap:round' }));
    });

    // 선 끝 라벨: 값이 비슷하면 겹치므로 최소 간격 13px로 밀어낸다
    var ends = trend.series.map(function (s, i) {
      return { i: i, kw: s.keyword, y: y(s.counts[n - 1]) };
    }).sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < ends.length; k++) {
      if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
    }
    ends.forEach(function (e) {
      var t = svg('text', { x: W - R + 8, y: e.y + 4, 'class': 'end-label' });
      t.textContent = e.kw;
      root.appendChild(t);
    });

    // 호버 레이어: 십자선 + 점 + 툴팁
    var cross = svg('line', { y1: T, y2: H - B, 'class': 'cross', visibility: 'hidden' });
    root.appendChild(cross);
    var dots = trend.series.map(function (s, i) {
      var c = svg('circle', { r: 4.5, 'class': 'dot', visibility: 'hidden',
        style: 'fill:var(' + SERIES[i] + ')' });
      root.appendChild(c);
      return c;
    });
    var hit = svg('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent' });
    root.appendChild(hit);

    var tip = el('div', 'tip');
    tip.hidden = true;

    function show(clientX) {
      var rect = root.getBoundingClientRect();
      var scale = rect.width / W;
      var px = (clientX - rect.left) / scale;
      var idx = Math.round((px - L) / ((W - L - R) / Math.max(1, n - 1)));
      idx = Math.max(0, Math.min(n - 1, idx));
      cross.setAttribute('x1', x(idx)); cross.setAttribute('x2', x(idx));
      cross.setAttribute('visibility', 'visible');
      dots.forEach(function (c, i) {
        c.setAttribute('cx', x(idx));
        c.setAttribute('cy', y(trend.series[i].counts[idx]));
        c.setAttribute('visibility', 'visible');
      });

      tip.innerHTML = '';
      tip.appendChild(el('div', 'tip-date', trend.dates[idx]));
      trend.series.map(function (s, i) { return { s: s, i: i }; })
        .sort(function (a, b) { return b.s.counts[idx] - a.s.counts[idx]; })
        .forEach(function (o) {
          var row = el('div', 'tip-row');
          var name = el('span');
          var sw = el('span', 'legend-swatch');
          sw.style.background = 'var(' + SERIES[o.i] + ')';
          name.appendChild(sw);
          name.appendChild(document.createTextNode(o.s.keyword));
          row.appendChild(name);
          row.appendChild(el('b', null, o.s.counts[idx] + '건'));
          tip.appendChild(row);
        });
      tip.hidden = false;
      var left = x(idx) * scale + 14;
      if (left + tip.offsetWidth > rect.width) left = x(idx) * scale - tip.offsetWidth - 14;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = (T * scale) + 'px';
    }
    function hide() {
      tip.hidden = true;
      cross.setAttribute('visibility', 'hidden');
      dots.forEach(function (c) { c.setAttribute('visibility', 'hidden'); });
    }
    hit.addEventListener('mousemove', function (ev) { show(ev.clientX); });
    hit.addEventListener('mouseleave', hide);
    hit.addEventListener('touchstart', function (ev) { show(ev.touches[0].clientX); }, { passive: true });
    hit.addEventListener('touchmove', function (ev) { show(ev.touches[0].clientX); }, { passive: true });

    wrap.appendChild(root);
    wrap.appendChild(tip);
    box.appendChild(wrap);

    // 표 보기: 색을 구분하기 어려운 경우에도 숫자로 확인할 수 있게
    var details = el('details');
    details.appendChild(el('summary', null, '표로 보기'));
    var tw = el('div', 'trend-table-wrap');
    var table = el('table');
    var hr = el('tr');
    hr.appendChild(el('th', null, '키워드'));
    trend.dates.forEach(function (d) { hr.appendChild(el('th', null, d.slice(5))); });
    table.appendChild(hr);
    trend.series.forEach(function (s) {
      var tr = el('tr');
      tr.appendChild(el('td', null, s.keyword));
      s.counts.forEach(function (c) { tr.appendChild(el('td', null, String(c))); });
      table.appendChild(tr);
    });
    tw.appendChild(table);
    details.appendChild(tw);
    box.appendChild(details);
    return box;
  }

  /* ---------- 주간 · 월간 ---------- */

  var MOVE = { up: '▲', down: '▼', same: '–', 'new': 'NEW' };

  function chartRow(item, max) {
    var a = link(item.url);
    a.className = 'chart-row' + (item.rank <= 3 ? ' top' : '');

    a.appendChild(el('div', 'chart-rank', ('0' + item.rank).slice(-2)));

    var main = el('div', 'chart-main');
    main.appendChild(el('h3', 'chart-title', item.title));
    var meta = el('div', 'chart-meta');
    meta.appendChild(el('span', 'sec-badge', item.section_name));
    meta.appendChild(el('span', null, item.source));
    meta.appendChild(el('span', 'news-dot', '·'));
    meta.appendChild(el('span', null, item.date));
    main.appendChild(meta);
    a.appendChild(main);

    var score = el('div', 'chart-score');
    var num = el('div', null);
    num.appendChild(el('span', 'score-num', String(item.score)));
    num.appendChild(el('span', 'score-unit', '점'));
    score.appendChild(num);
    var track = el('div', 'score-track');
    var fill = el('div', 'score-fill');
    fill.style.width = Math.max(6, Math.round(item.score / max * 100)) + '%';
    track.appendChild(fill);
    score.appendChild(track);
    a.appendChild(score);

    return a;
  }

  function renderRanking(key) {
    var p = D.periods[key];
    view.innerHTML = '';
    if (!p || !p.articles.length) {
      view.appendChild(el('p', 'empty',
        '아직 집계할 지면이 모이지 않았습니다. 매일 수집이 쌓이면 채워집니다.'));
      return;
    }

    var head = el('div', 'rank-head');
    var row = el('div', 'rank-title-row');
    var left = document.createElement('div');
    var h2 = el('h2', 'rank-title');
    h2.appendChild(document.createTextNode(p.label + ' 점수 랭킹 '));
    h2.appendChild(el('em', null, 'TOP ' + p.articles.length));
    left.appendChild(h2);
    left.appendChild(el('p', 'rank-sub',
      '수집 점수(키워드 가중치 + 통계 인용 + 언론사 신뢰도)가 높은 순입니다.'));
    row.appendChild(left);

    var meta = el('div', 'rank-meta');
    meta.appendChild(el('div', null, p.range));
    meta.appendChild(el('div', null, p.covered_days + '일치 집계'));
    row.appendChild(meta);
    head.appendChild(row);
    view.appendChild(head);

    if (p.trend && p.trend.series.length) view.appendChild(trendChart(p.trend, p.label));

    var layout = el('div', 'rank-layout');
    var chart = el('div', 'chart');
    var max = p.articles[0].score || 1;
    p.articles.forEach(function (item) { chart.appendChild(chartRow(item, max)); });
    layout.appendChild(chart);

    var rail = el('aside', 'rail');
    var box = el('div', 'rail-box');
    var rh = el('div', 'rail-head');
    rh.appendChild(el('span', 'rail-title', '이슈 키워드'));
    rh.appendChild(el('span', 'rail-note', p.en));
    box.appendChild(rh);

    p.keywords.forEach(function (k) {
      var line = el('button', 'kw');
      line.type = 'button';
      line.style.cssText = 'width:100%;background:none;border:none;border-bottom:1px solid var(--hairline);font:inherit;color:inherit;text-align:left;cursor:pointer';
      line.title = '"' + k.keyword + '" 지난 기사 검색';
      line.addEventListener('click', function () { openSearch(k.keyword); });
      line.appendChild(el('span', 'kw-rank', String(k.rank)));
      line.appendChild(el('span', 'kw-name', k.keyword));
      line.appendChild(el('span', 'kw-count', k.count + '건'));
      var move = el('span', 'kw-move ' + k.state,
        k.state === 'new' ? MOVE['new']
          : k.state === 'same' ? MOVE.same
          : MOVE[k.state] + k.change);
      line.appendChild(move);
      box.appendChild(line);
    });

    box.appendChild(el('div', 'rail-foot', (p.compared
      ? '화살표는 직전 ' + p.days + '일 구간과 비교한 순위 변동입니다.'
      : '직전 구간 자료가 아직 없어 순위 변동은 다음 집계부터 표시됩니다.')
      + ' 키워드를 누르면 지난 기사를 검색합니다.'));
    rail.appendChild(box);
    layout.appendChild(rail);
    view.appendChild(layout);
  }

  /* ---------- 검색 (아카이브 전체) ---------- */

  // 모든 날짜의 기사를 한 번만 펼쳐 둔다. 같은 기사(제목 기준)가 여러 날 실렸으면 최신 날짜 1건만.
  // (archive.json 을 받은 뒤 첫 검색 때 만들고, 이후 재사용)
  var corpus = null;
  function buildCorpus() {
    var seen = {}, out = [];
    dates.slice().reverse().forEach(function (date) {
      var day = D.daily[date];
      if (!day) return;
      day.sections.forEach(function (sec) {
        sec.articles.forEach(function (a) {
          var key = String(a.title).replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase();
          if (seen[key]) return;
          seen[key] = true;
          out.push({ a: a, date: date, section: sec.name,
            text: [a.title, a.lead, a.summary, a.ai_line, a.ai_why, a.source,
                   (a.keywords || []).join(' ')].join(' ').toLowerCase() });
        });
      });
    });
    return out;
  }

  function searchRow(hit, terms) {
    var a = link(hit.a.url, 'chart-row');
    var d = el('div', 'chart-rank');
    d.style.cssText = 'font-size:11px;text-align:left;font-weight:600';
    d.textContent = hit.date.slice(5);
    a.appendChild(d);
    var main = el('div', 'chart-main');
    var h = el('h3', 'chart-title');
    h.appendChild(highlighted(hit.a.title, terms));
    main.appendChild(h);
    var sub = hit.a.ai_line || hit.a.lead;
    if (sub) {
      var p = el('p', 'news-sum');
      p.style.marginBottom = '6px';
      p.appendChild(highlighted(sub, terms));
      main.appendChild(p);
    }
    var meta = el('div', 'chart-meta');
    meta.appendChild(el('span', 'sec-badge', hit.section));
    meta.appendChild(el('span', null, hit.a.source));
    meta.appendChild(el('span', 'news-dot', '·'));
    meta.appendChild(el('span', null, hit.date));
    main.appendChild(meta);
    a.appendChild(main);
    return a;
  }

  function renderSearch() {
    if (!corpus) corpus = buildCorpus();
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    var hits = terms.length ? corpus.filter(function (h) {
      return terms.every(function (t) { return h.text.indexOf(t) >= 0; });
    }) : [];

    view.innerHTML = '';
    var head = el('div', 'search-head');
    var h2 = el('h2', 'search-title');
    if (terms.length) {
      h2.appendChild(document.createTextNode('"' + query.trim() + '" 검색 결과 '));
      h2.appendChild(el('em', null, hits.length + '건'));
    } else {
      h2.textContent = '지난 기사 검색';
    }
    head.appendChild(h2);
    head.appendChild(el('p', 'search-sub', '아카이브 ' + dates.length + '일치, 기사 '
      + corpus.length + '건에서 제목·요약·키워드를 찾습니다. 띄어쓰기로 여러 단어를 넣으면 모두 포함한 기사만 보여줍니다.'));

    var popular = (D.periods.monthly || D.periods.weekly || { keywords: [] }).keywords;
    if (popular.length) {
      var chips = el('div', 'search-chips');
      popular.forEach(function (k) { chips.appendChild(tagButton(k.keyword)); });
      head.appendChild(chips);
    }
    view.appendChild(head);

    if (!terms.length) return;
    if (!hits.length) {
      view.appendChild(el('p', 'empty', '일치하는 기사가 없습니다.'));
      return;
    }
    var list = el('div', 'chart');
    list.style.paddingTop = '10px';
    hits.slice(0, 150).forEach(function (h) { list.appendChild(searchRow(h, terms)); });
    view.appendChild(list);
    if (hits.length > 150) view.appendChild(el('p', 'empty', '상위 150건만 표시했습니다. 검색어를 더 좁혀 보세요.'));
  }

  function openSearch(keyword) {
    mode = 'search';
    query = keyword;
    searchInput.value = keyword;
    paint();
    window.scrollTo({ top: document.querySelector('.controls').offsetTop, behavior: 'smooth' });
  }

  /* ---------- 모드 전환 ---------- */

  function syncDateNav() {
    var i = dates.indexOf(current);
    prev.disabled = i <= 0;
    next.disabled = i < 0 || i >= dates.length - 1;
  }

  function paint() {
    var isDaily = mode === 'daily';
    var isSearch = mode === 'search';
    nav.hidden = !isDaily;
    searchBar.hidden = !isSearch;
    note.hidden = isDaily || isSearch;

    segs.forEach(function (s) {
      s.setAttribute('aria-selected', String(s.dataset.mode === mode));
    });

    // 검색어는 주소(#q=...)에 남겨서 그대로 공유할 수 있게 한다
    var hash = isSearch && query.trim() ? '#q=' + encodeURIComponent(query.trim()) : '';
    try {
      if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
    } catch (e) { /* 샌드박스(iframe) 안에서는 주소를 못 바꿀 수 있다 */ }

    if (isDaily) syncDateNav();

    // 오늘 지면·테마·탭바는 바로 동작하고, 과거 데이터가 필요한 화면만 archive.json 을 기다린다
    if (needsArchive()) {
      if (!isDaily && !isSearch) note.textContent = archiveState === 'error' ? '' : '불러오는 중…';
      archiveNotice();
      if (archiveState === 'idle') loadArchive();
      return;
    }

    if (isDaily) {
      renderDaily(current);
    } else if (isSearch) {
      renderSearch();
    } else {
      var p = D.periods[mode];
      note.textContent = p ? p.range + '  ·  ' + p.covered_days + '일치' : '';
      renderRanking(mode);
    }
  }

  segs.forEach(function (s) {
    s.addEventListener('click', function () {
      mode = s.dataset.mode;
      paint();
      if (mode === 'search') searchInput.focus();
    });
  });

  sel.addEventListener('change', function () { current = sel.value; paint(); });

  prev.addEventListener('click', function () {
    var i = dates.indexOf(current);
    if (i > 0) { current = dates[i - 1]; sel.value = current; paint(); }
  });

  next.addEventListener('click', function () {
    var i = dates.indexOf(current);
    if (i >= 0 && i < dates.length - 1) { current = dates[i + 1]; sel.value = current; paint(); }
  });

  var timer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { query = searchInput.value; paint(); }, 160);
  });

  /* ---------- 테마 토글 (자동 → 라이트 → 다크) ---------- */

  var themeBtn = document.getElementById('themebtn');
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_LABEL = { auto: '자동', light: '라이트', dark: '다크' };
  var theme = 'auto';
  try { theme = localStorage.getItem('cb-theme') || 'auto'; } catch (e) {}

  function applyTheme() {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = '테마 · ' + THEME_LABEL[theme];
  }
  themeBtn.addEventListener('click', function () {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem('cb-theme', theme); } catch (e) {}
    applyTheme();
  });
  applyTheme();

  if (location.hash.indexOf('#q=') === 0) {
    mode = 'search';
    query = decodeURIComponent(location.hash.slice(3));
    searchInput.value = query;
  }
  paint();
})();
"""
# 직무 태그 링크 표를 JS 상수로 박는다 (한글은 그대로, </script> 깨짐 방지로 < 는 이스케이프)
SCRIPT = SCRIPT.replace("__JOB_TAG_LINKS__", json.dumps(JOB_TAG_LINKS, ensure_ascii=False).replace("<", "\\u003c"))


# ============================================================
# 썸네일: data URI -> 파일 (site/assets/thumbs/)
# ============================================================

THUMB_MAX_W = 480     # 카드 썸네일은 128px(모바일 전폭 ~480px)로 보여주므로 이보다 큰 원본은 줄인다
THUMB_QUALITY = 72
THUMB_DIR = "assets/thumbs"


def _shrink_jpeg(raw):
    """가로 THUMB_MAX_W 이하로 줄이고 JPEG(quality 72)로 다시 인코딩. Pillow 가 없거나 못 여는 파일이면 원본 그대로."""
    try:
        from PIL import Image
    except ImportError:
        return raw
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception:  # noqa: BLE001 - 깨진 이미지는 그대로 둔다 (브라우저가 알아서 처리)
        return raw
    resized = False
    if im.width > THUMB_MAX_W:
        im = im.resize((THUMB_MAX_W, max(1, round(im.height * THUMB_MAX_W / im.width))), Image.LANCZOS)
        resized = True
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=THUMB_QUALITY, optimize=True, progressive=True)
    out = buf.getvalue()
    # 이미 작은 JPEG 원본을 다시 인코딩해서 오히려 커지면 원본을 쓴다 (JPEG 가 아니거나 줄였으면 새 파일)
    if im.format == "JPEG" and not resized and len(out) >= len(raw):
        return raw
    return out


def externalize_thumbs(today, site_dir):
    """
    오늘 지면 기사의 image(data URI)를 site/assets/thumbs/<md5 앞 12자>.jpg 로 저장하고
    기사 image 값을 상대경로("assets/thumbs/xxx.jpg")로 바꾼다. 같은 내용은 한 번만 저장.
    페이지(HTML/JSON)에 base64 가 박히지 않게 하는 것이 목적이다. 반환: (새로 저장한 수, 쓰는 파일 수, 파일 합계 바이트)
    """
    thumbs_dir = site_dir / THUMB_DIR
    thumbs_dir.mkdir(parents=True, exist_ok=True)
    keep, saved = set(), 0
    for sec in today.get("sections", []):
        for a in sec.get("articles", []):
            img = a.get("image")
            if not img:
                a["image"] = None
                continue
            if not str(img).startswith("data:"):
                continue                      # 이미 경로면 손대지 않는다
            try:
                raw = base64.b64decode(str(img).split(",", 1)[1], validate=False)
            except (ValueError, IndexError):
                a["image"] = None
                continue
            name = hashlib.md5(raw).hexdigest()[:12] + ".jpg"
            path = thumbs_dir / name
            if name not in keep and not path.exists():
                path.write_bytes(_shrink_jpeg(raw))
                saved += 1
            keep.add(name)
            a["image"] = f"{THUMB_DIR}/{name}"
    # 오늘 지면이 쓰지 않는 옛 썸네일은 지운다 (로컬에서 매일 돌리면 쌓이기만 하므로)
    for old in thumbs_dir.glob("*.jpg"):
        if old.name not in keep:
            old.unlink()
    total = sum((thumbs_dir / n).stat().st_size for n in keep)
    return saved, len(keep), total


# ============================================================
# 날짜별 정적 지면 · 아카이브 목록 (검색엔진용, JS 없이 읽힌다)
# ============================================================

def korean_date(d):
    """'2026-10-16' -> '2026년 10월 16일'"""
    y, m, dd = d.split("-")
    return f"{int(y)}년 {int(m)}월 {int(dd)}일"


def day_articles(day):
    return [a for s in day.get("sections", []) for a in s.get("articles", [])]


def day_description(day):
    """<meta description>: 그날 브리핑 첫 문장, 없으면 점수 상위 기사 제목 3개"""
    lines = [t for t in (day.get("briefing") or []) if t]
    if lines:
        return lines[0]
    arts = sorted(day_articles(day), key=lambda a: -int(a.get("score") or 0))
    return " / ".join(a["title"] for a in arts[:3])


def static_head(title, desc, root="../"):
    """정적 페이지 공통 <head> + 마스트헤드. 자산 경로는 root 기준(../assets/...)."""
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="icon" type="image/png" sizes="32x32" href="{root}assets/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="{root}assets/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<style>{STYLE}{STATIC_STYLE}</style>
<script>
  try {{ var t = localStorage.getItem('cb-theme');
        if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); }} catch (e) {{}}
</script>
</head>
<body>

<header class="masthead">
  <div class="masthead-inner">
    <a class="brand" href="{root}" aria-label="취업조로의 커리어브리핑 홈">
      <img class="brand-logo brand-logo-light" src="{root}assets/logo.png" alt="취업조로" width="150" height="40" loading="lazy" decoding="async">
      <img class="brand-logo brand-logo-dark" src="{root}assets/logo-dark.png" alt="" aria-hidden="true" width="150" height="40" loading="lazy" decoding="async">
      <div class="brand-text">
        <div class="brand-name">커리어브리핑 <em class="brand-en">Career Briefing</em></div>
      </div>
    </a>
    <div class="mast-right">
      <button class="theme-btn" id="themebtn" type="button" aria-label="화면 테마 바꾸기">테마 · 자동</button>
    </div>
  </div>
</header>
"""


def static_tail():
    return f"""
<script>{STATIC_SCRIPT}</script>
</body>
</html>
"""


def job_tag_html(tag, root):
    """직무 태그 한 개. 매핑된 직무면 직무사전 페이지 링크, 아니면 글자만 (root: 사이트 루트까지의 상대 경로)"""
    if tag in JOB_TAG_LINKS:
        return (f'<a class="job-tag" href="{e(root + JOB_TAG_LINKS[tag])}" '
                f'title="직무사전에서 {e(tag)} 직무 보기">#{e(tag)}</a>')
    return f'<span class="job-tag">#{e(tag)}</span>'


def render_static_article(a, numeral):
    """날짜별 정적 지면의 기사 카드. 클라이언트 newsCard() 와 같은 구조·같은 class 를 쓴다 (썸네일 자리는 로마숫자)."""
    parts = [f'    <article class="news-card">',
             f'      <div class="news-thumb"><div class="thumb-blank">{numeral}</div></div>',
             f'      <div class="news-body">',
             f'        <div class="news-meta"><span class="news-num">{int(a.get("rank") or 0):02d}</span>'
             f'<span class="news-source">{e(a.get("source"))}</span><span class="news-dot">·</span>'
             f'<time>{e(str(a.get("published") or "")[5:])}</time></div>',
             f'        <h3 class="news-title"><a class="news-link" href="{e(a.get("url"))}" target="_blank" rel="noopener noreferrer">{e(a.get("title"))}</a></h3>']
    original = " ".join(t for t in (a.get("lead"), a.get("summary")) if t)
    if a.get("ai_line"):
        parts.append(f'        <p class="news-lead"><span class="ai-tag">AI</span> {e(a["ai_line"])}</p>')
        if original:
            parts.append(f'        <p class="news-sum">{e(original)}</p>')
    else:
        if a.get("lead"):
            parts.append(f'        <p class="news-lead">{e(a["lead"])}</p>')
        if a.get("summary"):
            parts.append(f'        <p class="news-sum">{e(a["summary"])}</p>')
    if a.get("ai_why"):
        label = "Zorro의 한마디" if a.get("ai_tags") else "커리어 시사점"
        parts.append(f'        <p class="news-why"><b>{label}</b>{e(a["ai_why"])}</p>')
    if a.get("ai_tags"):
        parts.append('        <div class="news-tags job-tags">'
                     + "".join(job_tag_html(t, "../../") for t in a["ai_tags"]) + '</div>')
    if a.get("keywords"):
        # 키워드는 오늘 지면의 검색(#q=)으로 보낸다
        parts.append('        <div class="news-tags">'
                     + "".join(f'<a class="tag" href="../#q={e(k)}">{e(k)}</a>' for k in a["keywords"][:3]) + '</div>')
    if a.get("related"):
        parts.append('        <div class="news-related"><span>같은 사건 다른 보도</span>'
                     + "".join(f'<a href="{e(r.get("url"))}" target="_blank" rel="noopener noreferrer" title="{e(r.get("title"))}">{e(r.get("source"))}</a>'
                               for r in a["related"]) + '</div>')
    parts.append('      </div>\n    </article>')
    return "\n".join(parts)


def render_daynav(prev_date, next_date):
    prev_html = (f'<a href="../{e(prev_date)}/" rel="prev">&larr; {e(korean_date(prev_date))}</a>' if prev_date
                 else '<span class="disabled">&larr; 이전 지면 없음</span>')
    next_html = (f'<a href="../{e(next_date)}/" rel="next">{e(korean_date(next_date))} &rarr;</a>' if next_date
                 else '<span class="disabled">다음 지면 없음 &rarr;</span>')
    return (f'  <nav class="daynav" aria-label="날짜 이동">{prev_html}<span class="spacer"></span>'
            f'<a href="../archive/">지난 지면 전체</a><a href="../">오늘 지면으로</a><span class="spacer"></span>{next_html}</nav>')


def render_day_page(day, prev_date, next_date):
    """site/<YYYY-MM-DD>/index.html — 독립 HTML (공용 탭바·푸터는 상위 build.py 가 끼운다)"""
    date = day["date"]
    kdate = korean_date(date)
    numerals = ["I", "II", "III", "IV", "V", "VI"]
    total = len(day_articles(day))
    title = f"{kdate} 커리어브리핑 — 취업조로"
    desc = day_description(day)

    out = [static_head(title, desc), '<main class="container">',
           f'  <div class="day-head"><div class="day-kicker">Career Briefing · Daily</div>'
           f'<h1 class="day-title">{e(kdate)} 커리어브리핑</h1>'
           f'<p class="day-sub">{e(date)} 지면 · 기사 {total}건 · 취업조로가 고른 채용·이직·기업·고용·커리어 뉴스</p></div>',
           render_daynav(prev_date, next_date)]

    lines = [t for t in (day.get("briefing") or []) if t]
    if lines:
        items = "".join(f"<li>{e(t)}</li>" for t in lines)
        out.append(f'  <div class="day-brief"><div class="brief-box"><div class="brief-label"><span class="ai-tag">AI</span>'
                   f'{e(kdate)} 브리핑</div><ol class="brief-list">{items}</ol></div></div>')

    for i, sec in enumerate(day.get("sections", []), 1):
        arts = sec.get("articles", [])
        out.append(f'  <section class="sector">\n    <div class="sector-head"><div class="sector-head-left">'
                   f'<span class="sector-numeral">{i}</span><div><h2 class="sector-title">{e(sec.get("name"))}</h2>'
                   f'<p class="sector-desc">{e(sec.get("desc"))}</p></div></div>'
                   f'<span class="sector-count">{e(sec.get("en"))}  /  {len(arts)} 건</span></div>')
        if arts:
            out.append('    <div class="news-grid">')
            out.extend(render_static_article(a, numerals[j % len(numerals)]) for j, a in enumerate(arts))
            out.append('    </div>')
        else:
            out.append('    <p class="empty">이 날은 이 섹션 기준을 넘긴 기사가 없습니다.</p>')
        out.append('  </section>')

    out.append('  <div class="day-foot">' + render_daynav(prev_date, next_date) + '</div>')
    out.append('</main>')
    out.append(static_tail())
    return "\n".join(out)


def render_archive_page(days):
    """site/archive/index.html — 모든 날짜를 월별로 묶은 링크 목록"""
    dates = [d["date"] for d in days]
    title = "지난 지면 전체 보기 — 취업조로의 커리어브리핑"
    desc = (f"{korean_date(dates[0])}부터 {korean_date(dates[-1])}까지 {len(dates)}일치 커리어브리핑 지면 목록. "
            f"날짜를 고르면 그날 취업조로가 고른 채용·이직·기업·고용 뉴스와 한마디를 볼 수 있습니다.") if dates else "커리어브리핑 지난 지면 목록"

    by_month = {}
    for d in days:
        by_month.setdefault(d["date"][:7], []).append(d)

    out = [static_head(title, desc), '<main class="container">',
           f'  <div class="day-head"><div class="day-kicker">Career Briefing · Archive</div>'
           f'<h1 class="day-title">지난 지면 전체 보기</h1>'
           f'<p class="day-sub">{len(dates)}일치 · 날짜를 고르면 그날 지면으로 갑니다</p></div>',
           '  <nav class="daynav" aria-label="바로가기"><a href="../">오늘 지면으로</a></nav>']
    for month in sorted(by_month, reverse=True):
        y, m = month.split("-")
        out.append(f'  <section class="archive-month"><h2>{int(y)}년 {int(m)}월</h2><div class="archive-list">')
        for d in sorted(by_month[month], key=lambda x: x["date"], reverse=True):
            count = len(day_articles(d))
            snip = day_description(d)
            if len(snip) > 90:
                snip = snip[:88].rstrip() + "…"
            out.append(f'    <a class="archive-row" href="../{e(d["date"])}/"><span class="archive-date">{e(d["date"])}</span>'
                       f'<span class="archive-count">{count}건</span><span class="archive-snip">{e(snip)}</span></a>')
        out.append('  </div></section>')
    out.append('</main>')
    out.append(static_tail())
    return "\n".join(out)


# ============================================================
# 서버 렌더링 (마스트헤드 · 히어로 · 푸터)
# ============================================================

def strip_images(day):
    """과거 지면은 텍스트로만 보여준다 — 썸네일을 빼서 페이지 용량을 지킨다"""
    return {
        **day,
        "sections": [
            {**sec, "articles": [{**a, "image": None} for a in sec.get("articles", [])]}
            for sec in day.get("sections", [])
        ],
    }


def render_picks(sections):
    """섹션마다 1위 기사만 뽑아 히어로 우측 카드로"""
    rows = []
    for sec in sections:
        arts = sec.get("articles", [])
        if not arts:
            continue
        a = arts[0]
        rows.append(f"""      <a class="pick" href="{e(a['url'])}" target="_blank" rel="noopener noreferrer">
        <span class="pick-sector">{e(sec['en'])}</span>
        <span class="pick-title">{e(a['title'])}</span>
        <span class="pick-sum">{e(a.get('lead') or a.get('summary') or a['source'])}</span>
      </a>""")
    return "\n".join(rows)


def render_brief(today):
    """AI 브리핑 3줄. 없으면(API 키 미설정 등) 기존 설명문을 보여준다."""
    lines = today.get("briefing") or []
    if not lines:
        stats = today.get("stats", {})
        return (f'      <p class="hero-sub">\n'
                f'        국내 언론사와 검색 피드 {stats.get("feeds", 0)}개에서 '
                f'{stats.get("collected", 0):,}건을 읽어들여\n'
                f'        중복을 걷어내고, 취업조로의 눈으로 점수를 매겨 다섯 갈래로 나눠 담았습니다.\n'
                f'      </p>')
    items = "".join(f"<li>{e(t)}</li>" for t in lines)
    return (f'      <div class="brief-box"><div class="brief-label"><span class="ai-tag">AI</span>'
            f'오늘의 브리핑 3줄</div><ol class="brief-list">{items}</ol></div>')


def render_health(stats):
    """기사를 못 가져온 피드가 있으면 푸터에 적어 둔다 (조용히 죽는 피드를 눈에 띄게)"""
    dead = stats.get("dead_feeds") or []
    if not dead:
        return ""
    return (f'    <div class="health"><b>수집 점검 필요</b> &middot; 오늘 기사를 하나도 못 가져온 피드 '
            f'{len(dead)}개: {e(" / ".join(dead))}</div>')


ARCHIVE_JSON = "assets/archive.json"   # index.html 기준 상대 경로 (JS 의 fetch 경로와 같아야 한다)


def split_payload(today, archive):
    """클라이언트 데이터를 둘로 나눈다.
    page   - index.html 에 박는 __BRIEF__: 오늘 지면(썸네일 포함) + 날짜 목록. 첫 화면은 이것만으로 그린다
    extra  - assets/archive.json: 지난 날짜 기사 전체(텍스트만) + 주간·월간 랭킹(키워드 순위·추이 포함).
             다른 날짜 선택·주간/월간 탭·검색을 처음 할 때 JS 가 한 번 받는다"""
    page = {
        "today": today["date"],
        "days": archive["days"],
        "daily": {today["date"]: today},
        "archive_url": ARCHIVE_JSON,
    }
    extra = {
        "daily": {d["date"]: strip_images(d) for d in archive["full_days"] if d["date"] != today["date"]},
        "periods": archive["periods"],
    }
    return page, extra


def render(today, archive):
    stats = today.get("stats", {})
    sections = today.get("sections", [])
    published = stats.get("published", sum(len(s.get("articles", [])) for s in sections))

    funnel = [
        (stats.get("collected", 0), "수집"),
        (stats.get("deduped", 0), "중복 제거"),
        (stats.get("relevant", 0), "커리어 관련"),
        (published, "지면 게재"),
    ]
    funnel_html = "".join(
        f'<div class="funnel-step"><div class="funnel-num">{n:,}</div>'
        f'<div class="funnel-label">{label}</div></div>'
        for n, label in funnel)

    # 날짜 선택 목록 — 최신이 위로
    options = "".join(
        f'<option value="{e(d["date"])}"'
        f'{" selected" if d["date"] == today["date"] else ""}>'
        f'{e(d["date"])} ({d["count"]}건)</option>'
        for d in reversed(archive["days"]))

    period_segs = "".join(
        f'<button class="seg" type="button" role="tab" data-mode="{e(k)}" '
        f'aria-selected="false">{e(archive["periods"][k]["label"])}</button>'
        for k in ("weekly", "monthly") if k in archive["periods"])

    # 클라이언트가 쓸 데이터: 페이지에는 오늘 지면(썸네일 포함)과 날짜 목록만 박고,
    # 지난 날짜 기사·주간/월간 랭킹은 assets/archive.json 으로 뺀다 (첫 로딩 용량을 지키기 위해)
    payload, _ = split_payload(today, archive)
    # '<' 를 이스케이프해 기사 제목에 </script> 가 섞여도 스크립트 블록이 깨지지 않게 한다
    data_json = (json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
                 .replace("<", "\\u003c"))

    if "data:image" in data_json:
        # externalize_thumbs() 가 먼저 돌았다면 나올 수 없다. 남아 있으면 페이지가 다시 MB 단위로 불어나므로 바로 알린다
        print("경고: 페이지 JSON 에 data URI 이미지가 남아 있습니다 (externalize_thumbs 확인)", file=sys.stderr)

    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>취업조로의 커리어브리핑</title>
<meta name="description" content="커리어를 읽는 남자, 취업조로(TEAM ZORRO)가 매일 아침 고르는 채용·이직·기업·고용·커리어 변화 뉴스 — 일간 지면과 주간·월간 랭킹">
<meta property="og:title" content="취업조로의 커리어브리핑">
<meta property="og:description" content="오늘 커리어에 영향을 주는 뉴스를 매일 아침 압축해 드립니다.">
<meta property="og:image" content="assets/favicon-180.png">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/favicon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<style>{STYLE}</style>
<script>
  // 저장된 테마를 그리기 전에 적용 (깜빡임 방지)
  try {{ var t = localStorage.getItem('cb-theme');
        if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); }} catch (e) {{}}
</script>
</head>
<body>

<header class="masthead">
  <div class="masthead-inner">
    <a class="brand" href="./" aria-label="취업조로의 커리어브리핑 홈">
      <img class="brand-logo brand-logo-light" src="assets/logo.png" alt="취업조로" width="150" height="40" loading="lazy" decoding="async">
      <img class="brand-logo brand-logo-dark" src="assets/logo-dark.png" alt="" aria-hidden="true" width="150" height="40" loading="lazy" decoding="async">
      <div class="brand-text">
        <div class="brand-name">커리어브리핑 <em class="brand-en">Career Briefing</em></div>
      </div>
    </a>
    <div class="mast-right">
      <div class="stamp">{e(today.get('generated_at', ''))} 기준 &middot; 아카이브 {archive['available']}일치</div>
      <button class="theme-btn" id="themebtn" type="button" aria-label="화면 테마 바꾸기">테마 · 자동</button>
    </div>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-text">
      <div class="eyebrow"><span class="pulse"></span>커리어를 읽는 남자, 취업조로가 매일 아침 고른 뉴스 &middot; {e(today.get('date', ''))}</div>
      <h1>오늘 커리어에 영향을 주는 뉴스,<br><em>{published}건</em>으로 압축했습니다</h1>
{render_brief(today)}
      <div class="funnel">{funnel_html}</div>
    </div>

    <div class="hero-picks">
      <div class="picks-head">
        <span class="picks-title">오늘의 헤드라인</span>
        <span class="picks-note">Top of each section</span>
      </div>
{render_picks(sections)}
    </div>
  </div>
</section>

<div class="controls">
  <div class="controls-inner">
    <div class="segmented" role="tablist" aria-label="집계 기간">
      <button class="seg" type="button" role="tab" data-mode="daily" aria-selected="true">일간</button>
      {period_segs}
      <button class="seg" type="button" role="tab" data-mode="search" aria-selected="false">검색</button>
    </div>
    <div class="datenav" id="datenav">
      <button class="datebtn" id="dateprev" type="button" aria-label="이전 날짜">&#9664;</button>
      <select class="dateselect" id="dateselect" aria-label="날짜 선택">{options}</select>
      <button class="datebtn" id="datenext" type="button" aria-label="다음 날짜">&#9654;</button>
    </div>
    <div class="search-bar" id="searchbar" hidden>
      <input class="search-input" id="searchinput" type="search" placeholder="예: 삼성 성과급, 정년연장" aria-label="지난 기사 검색" autocomplete="off">
    </div>
    <div class="range-note" id="rangenote" hidden></div>
  </div>
</div>

<main class="container" id="view"></main>

<section class="howto" aria-label="이 지면 읽는 법">
  <div class="howto-inner">
    <div class="howto-block">
      <div class="howto-label">읽는 법</div>
      <p class="howto-text">카드를 누르면 원문으로 갑니다. <b>AI</b> 표시 문장과 "Zorro의 한마디"는 취업조로의 관점을 학습한 Claude가 제목·요약만 보고 쓴 것이라 원문과 다를 수 있고, 회색 글은 원문 요약입니다. #태그는 관련 직무, 키워드를 누르면 지난 기사를 검색합니다.</p>
    </div>
    <div class="howto-block">
      <div class="howto-label">수집 방식</div>
      <p class="howto-text">언론사 RSS와 Google News 피드를 매일 아침 읽어 고용·커리어 키워드로 점수를 매기고, 홍보성 보도자료와 유사 중복 기사를 걸러 섹션별 상위 기사만 남깁니다.</p>
    </div>
    <div class="howto-block">
      <div class="howto-label">점수와 랭킹</div>
      <p class="howto-text">점수는 키워드 가중치, 통계 수치 인용, 언론사 신뢰도를 더한 값입니다. 주간·월간 랭킹은 그 기간 지면 기사를 점수순으로 세운 것이고, 키워드 화살표는 직전 같은 길이 구간 대비 변동입니다.</p>
    </div>
  </div>
  <div class="howto-more"><a href="archive/">지난 지면 전체 보기 &rarr;</a> <span style="font-weight:500;color:var(--muted)">날짜별 지면을 각각의 주소로 볼 수 있습니다.</span></div>
{render_health(stats)}
</section>

<script id="brief-data" type="application/json">{data_json}</script>
<script>window.__BRIEF__ = JSON.parse(document.getElementById('brief-data').textContent);</script>
<script>{SCRIPT}</script>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(BASE_DIR / "news_data.json"))
    ap.add_argument("--out", default=str(BASE_DIR / "site" / "index.html"))
    args = ap.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        sys.exit(f"{data_path} 가 없습니다. 먼저 'python collect_news.py' 를 실행하세요.")

    today = json.loads(data_path.read_text(encoding="utf-8"))

    days = rankings.load_archive()
    archive = rankings.build(days)
    archive["full_days"] = days
    if not archive["days"]:
        # 아카이브가 아직 없으면 오늘 하루만이라도 날짜 목록에 넣는다
        total = sum(len(s.get("articles", [])) for s in today.get("sections", []))
        archive = {"days": [{"date": today["date"], "count": total}],
                   "available": 1, "periods": {}, "full_days": [today]}

    out_path = Path(args.out)
    site_dir = out_path.parent
    site_dir.mkdir(parents=True, exist_ok=True)

    # 썸네일을 파일로 빼낸다 (렌더링 전에 해야 HTML/JSON 에 base64 가 안 박힌다)
    new_thumbs, n_thumbs, thumb_bytes = externalize_thumbs(today, site_dir)

    out_path.write_text(render(today, archive), encoding="utf-8")

    # CI 로고·파비콘: assets/ 를 site/assets/ 로 복사 (site/ 는 배포 때마다 새로 만들어진다)
    shutil.copytree(BASE_DIR / "assets", site_dir / "assets", dirs_exist_ok=True)

    # 지난 지면 데이터(archive.json): assets/ 복사 뒤에 써야 덮어쓰이지 않는다
    _, extra = split_payload(today, archive)
    archive_json = json.dumps(extra, ensure_ascii=False, separators=(",", ":"))
    if "data:image" in archive_json:
        print("경고: archive.json 에 data URI 이미지가 남아 있습니다 (strip_images 확인)", file=sys.stderr)
    archive_path = site_dir / ARCHIVE_JSON
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    archive_path.write_text(archive_json, encoding="utf-8")

    # 날짜별 정적 지면 + 아카이브 목록 + 날짜 목록(days.json)
    full_days = archive["full_days"]
    dates = [d["date"] for d in full_days]
    for i, day in enumerate(full_days):
        page_dir = site_dir / day["date"]
        page_dir.mkdir(parents=True, exist_ok=True)
        (page_dir / "index.html").write_text(
            render_day_page(day, dates[i - 1] if i > 0 else None, dates[i + 1] if i + 1 < len(dates) else None),
            encoding="utf-8")
    (site_dir / "archive").mkdir(exist_ok=True)
    (site_dir / "archive" / "index.html").write_text(render_archive_page(full_days), encoding="utf-8")
    (site_dir / "days.json").write_text(json.dumps(dates), encoding="utf-8")

    periods = ", ".join(
        f"{p['label']} {len(p['articles'])}건" for p in archive["periods"].values())
    print(f"생성 완료: {out_path}  ({out_path.stat().st_size / 1024:.0f} KB)")
    print(f"  지난 지면 데이터 -> {archive_path}  ({archive_path.stat().st_size / 1024:.0f} KB, "
          f"{len(extra['daily'])}일치 + 랭킹 {len(extra['periods'])}종)")
    print(f"  일간 아카이브 {archive['available']}일치" + (f" | {periods}" if periods else ""))
    print(f"  썸네일 {n_thumbs}장 -> {site_dir / THUMB_DIR}  (새로 저장 {new_thumbs}장, {thumb_bytes / 1024:.0f} KB)")
    print(f"  날짜별 지면 {len(dates)}쪽 + archive/index.html + days.json")


if __name__ == "__main__":
    main()
