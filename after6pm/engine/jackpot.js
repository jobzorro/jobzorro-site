// 한방 전략(v4.27). 투잡을 1년 넘게 한 사람에게 가끔 '큰 판' 제안이 온다. 도전하면 돈·행동력·몇 달이 들고, 끝나는 달에 결과가 온다.
// 대상: cs(취업컨설팅) · tarot(타로) · webnovel(웹소설). 웹소설은 '잘 되는 이벤트'(좋은 일)도 따로 있다.
// core.js endMonth 에서 marketMonth 바로 뒤에 jackpotMonth(s, r, notes, scenes) 를 부른다. onChoose 이름은 "jp_" 로 시작(JP_CHOOSE).
//
// 장면과 선택 규칙(시뮬 봇용):
//   - 제안 장면 onChoose "jp_offer": 0번 = 도전(본판, 판정 있음) · 1번 = 다른 방식 도전(작게/직접/판권만) · 마지막 번 = 거절.
//   - 결과 장면: 고를 게 없으면 kind "story"(계속 하나). 고를 게 있으면 onChoose "jp_ask": 0번 = 받는다/올린다(공격), 1번 = 안 받는다/그대로.
//   - 좋은 일 장면 onChoose "jp_good": 0번 = 올라탄다(효과 120%, 체력 −) · 1번 = 평소대로(100%).
// 결과 갈래: big(대박) · meh(대박인데 생각보다 별로) · mid(중박) · small(소소) · bust(쪽박).
//   확률: 판정 성공 [대박 15, 중박 33, 소소 32, 쪽박 20] · 판정 실패 [8, 22, 37, 33] · 판정 없음 [12, 28, 35, 25]. 대박 중 meh 비율은 전략마다.
// 돈(만원, 물가 SYN.pi 반영)은 장부 "한방 전략"(수입/지출). 효과 세 종류:
//   lump 일시금 · mon {v, m} 매달 고정 수입 m개월 · mult {v, m} 그 투잡 이번 달 이익 profitOf × v 를 m개월(음수면 지출).
// 균형: 전략별 돈 기대값(투자금 대비)은 약 1.2~1.45배(행동력·체력·몇 달을 빼면 '약간 이득'). 대박 본판은 3~5억(30억 목표의 10~17%).
// 상태: s.jp = { since:{job}, offT:{job}, offN:{job}, goodT:{job}, goodN:{job}, evT, runs:[], flows:[], folQ:[], seen:{}, stat:{} }. 난수는 r 만.
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import { addMoney, log, won, giveBrk, gainStat } from "./core.js";
import { profitOf } from "./rival.js";

export const JP_LABEL = "한방 전략";
export const JP_BAL = {
  offChance: 0.032, offGap: 36, offMax: 4, // 투잡당 제안: 한 판(약 23년)에 2~4번
  goodChance: 0.042, goodGap: 40, goodMax: 3, // 좋은 일: 2~3번
  start: 12, // 투잡 시작 후 1년부터
  P: { ok: [0.15, 0.33, 0.32, 0.2], ng: [0.08, 0.22, 0.37, 0.33], none: [0.12, 0.28, 0.35, 0.25] },
};
const JOBS = ["cs", "tarot", "webnovel"];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const M = (s, x) => Math.round(x * SYN.pi(s) / 10) * 10; // 만원, 물가 반영
const isOn = (s, job) => (s.sj?.active || []).includes(job);
const nm = (job) => D.SIDEJOBS[job]?.n || job;
const TIER_N = { big: "대박", meh: "대박…인데", mid: "중박", small: "소소", bust: "쪽박" };

// ───────── 전략 정의 ─────────
// ch: 도전 방식 [{ t, cost(일시 투자, 만원), mcost(매달 비용), ap(진행 중 매달 행동력 −), hp, mo(걸리는 달), stat, dc, k(결과 크기 배율) }]
// out: 갈래별 { text, lump, mon, mult, fame, eye, mental, eff(플러그인 효과 키), ask(결과 장면에서 고를 것), fol(나중에 올 후속) }
export const JP_DEF = [
  // ───── 취업컨설팅 ─────
  { id: "cs_tv", job: "cs", n: "방송 출연 제안", meh: 0.35,
    cond: (s) => (s.cs?.lv || 0) >= 3 || (s.fame || 0) >= 35,
    text: () => "교양 프로그램 '취업 전쟁' 작가에게서 전화가 왔다. \"현직자 출신 컨설턴트로 패널 출연 가능하실까요?\" 방송 한 번이면 문의가 쏟아진다는데, 받을 그릇이 없으면 다 흘러간다. 판을 키우려면 상담 코치·사무실·광고가 필요하다.",
    ch: [
      { t: "출연하고 판을 키운다(코치 2명·사무실·광고)", cost: 3000, ap: 2, hp: -10, mo: 3, stat: "career", dc: 55, k: 1 },
      { t: "짧은 코너만 나간다", cost: 1000, ap: 1, hp: -4, mo: 2, stat: "career", dc: 48, k: 0.35 },
    ],
    out: {
      big: { text: "방송 다음 날 상담 신청이 300건. 고정 패널 섭외에 기업 강연 요청까지 줄을 섰다.", lump: 20000, mult: { v: 1.2, m: 12 }, fame: 6 },
      meh: { text: "방송은 터졌다. 그런데 회사 단톡방에도 캡처가 돌았다. 문의는 늘었지만 몸을 사려야 한다.", lump: 2000, mult: { v: 0.8, m: 6 }, eye: 18, mental: -4 },
      mid: { text: "방송 효과가 석 달쯤 갔다. 코치들 월급은 충분히 뽑았다.", lump: 1500, mult: { v: 0.6, m: 8 }, fame: 2 },
      small: { text: "내 분량은 4분. 지인들 연락만 많이 왔다.", mult: { v: 0.25, m: 4 } },
      bust: { text: "악마의 편집. '돈만 밝히는 컨설턴트'로 나갔다. 코치 계약금과 광고비만 날렸다.", mult: { v: -0.2, m: 4 }, mental: -8 },
    } },
  { id: "cs_tube", job: "cs", n: "너튜브 영상 떡상", meh: 0.35,
    cond: (s) => (s.cs?.ch?.youtube?.videos || 0) >= 1 || (s.cs?.lv || 0) >= 2,
    text: () => "'면접에서 떨어지는 사람 특징 3가지' 영상이 하룻밤에 조회수 30만을 찍었다. 알고리즘이 나를 보고 있다. 지금 편집자를 붙이고 매주 영상을 올리면 판이 바뀔 수도 있다.",
    ch: [
      { t: "편집자·장비 들이고 반년 동안 매주 올린다", cost: 2800, ap: 2, hp: -8, mo: 6, stat: "write", dc: 52, k: 1 },
      { t: "혼자 찍어 한 달에 두 편만", cost: 750, ap: 1, hp: -4, mo: 4, stat: "write", dc: 46, k: 0.3 },
    ],
    out: {
      big: { text: "구독자 10만. 온라인 강의를 열자마자 완판됐다. '그 영상 보고 왔어요' 문의가 매일 온다.", lump: 24000, mult: { v: 0.8, m: 12 }, fame: 5 },
      meh: { text: "구독자는 확 늘었다. 그런데 다들 무료 영상만 본다. 강의는 안 팔렸다.", lump: 1000, mult: { v: 0.5, m: 6 } },
      mid: { text: "꾸준히 오른 구독자 덕에 강의가 조금씩 팔린다.", lump: 2000, mult: { v: 0.3, m: 6 }, fame: 1 },
      small: { text: "첫 영상이 제일 잘 됐다. 그다음부터는 조회수 두 자리.", lump: 300, mult: { v: 0.2, m: 4 } },
      bust: { text: "떡상은 한 번이었다. 편집자 월급과 장비값만 남았다.", mental: -6 },
    } },
  { id: "cs_book", job: "cs", n: "책 출간 제안", meh: 0.35,
    cond: (s) => (s.cs?.lv || 0) >= 3 && (s.cs?.passes || 0) >= 20,
    text: () => "출판사 편집자가 메일을 보냈다. \"합격 사례로 취업 책을 내 보시죠.\" 조건은 초판 마케팅비 절반 부담, 그리고 반년 동안 매주 한 장씩 원고. 쓰는 동안 상담은 줄어든다.",
    ch: [
      { t: "계약한다(마케팅비 분담·반년 집필)", cost: 2500, ap: 2, hp: -8, mo: 6, stat: "write", dc: 54, k: 1 },
      { t: "전자책으로 작게 낸다", cost: 750, ap: 1, hp: -3, mo: 3, stat: "write", dc: 46, k: 0.3 },
    ],
    out: {
      big: { text: "취업 분야 베스트셀러 1위. 대학·기업 강연 요청이 줄을 서고, 인세가 분기마다 들어온다.", lump: 25000, mult: { v: 0.6, m: 12 }, fame: 6 },
      meh: { text: "베스트셀러 딱지는 붙었다. 그런데 계약서를 다시 보니 인세율이 6%였다.", lump: 3000 },
      mid: { text: "중쇄를 찍었다. 책 보고 왔다는 손님이 꾸준하다.", lump: 2000, mult: { v: 0.3, m: 6 }, fame: 2 },
      small: { text: "초판 2,000부가 겨우 나갔다. 엄마가 열 권 샀다.", lump: 500, mult: { v: 0.15, m: 4 } },
      bust: { text: "반품 재고가 창고에 쌓였다. 마케팅비는 돌아오지 않는다.", mental: -6 },
    } },
  // ───── 타로 ─────
  { id: "tr_app", job: "tarot", n: "AI 타로 앱 만들기", meh: 0.45,
    cond: (s) => (s.tarot?.lv || 0) >= 4,
    text: (s) => `단골이 말했다. "선생님 해석 방식을 앱으로 만들면 대박일 것 같아요." 내 리딩 문장 3천 개를 AI에 가르치면 된다. 외주 개발사 견적은 ${won(M(s, 2000))}. 직접 배워서 만들면 싸지만 반년은 밤을 새야 한다.`,
    ch: [
      { t: "외주 개발사에 맡긴다", cost: 2000, ap: 1, hp: -3, mo: 4, stat: "sense", dc: 50, k: 1 },
      { t: "직접 배워서 작게 만든다", cost: 600, ap: 3, hp: -10, mo: 6, stat: "sense", dc: 60, k: 0.35 },
    ],
    out: {
      big: { text: "앱 순위 운세 분야 1위. 구독 결제 알림이 쉬지 않는다.", mon: { v: 350, m: 12 }, fol: { id: "tr_buy", after: 12 } },
      meh: { text: "다운로드는 1위를 찍었다. 그런데 다들 무료 하루 한 번만 쓰고 결제를 안 한다.", mon: { v: 80, m: 12 } },
      mid: { text: "충성 사용자가 생겼다. 큰돈은 아니어도 앱이 혼자 번다.", mon: { v: 150, m: 18 } },
      small: { text: "리뷰 47개. 서버비 정도는 나온다.", mon: { v: 50, m: 12 } },
      bust: { text: "'AI 타로' 앱이 이미 200개였다. 아무도 내 앱을 찾지 못했다.", mental: -6, eff: { tr_rep: -2 } },
    } },
  { id: "tr_viral", job: "tarot", n: "점괘 화제 바이럴", meh: 0.4,
    cond: (s) => (s.tarot?.lv || 0) >= 3,
    text: () => "\"이 선생님이 석 달 전에 제 이직을 맞혔어요\" 글이 커뮤니티 인기글에 올랐다. 예약 문의가 하루 80건. 지금 상담실을 넓히고 보조 리더를 쓰면 이 파도를 탈 수 있다.",
    ch: [
      { t: "상담실 넓히고 보조 리더를 쓴다", cost: 2000, ap: 2, hp: -8, mo: 4, stat: "talk", dc: 52, k: 1 },
      { t: "혼자 받을 만큼만 예약을 연다", cost: 600, ap: 1, hp: -4, mo: 3, stat: "talk", dc: 46, k: 0.3 },
    ],
    out: {
      big: { text: "전국구 타로 리더가 됐다. 예약은 석 달 치가 찼고, 카드 굿즈와 책 제안까지 왔다.", lump: 12000, mon: { v: 900, m: 18 }, ask: "price" },
      meh: { text: "화제는 2주 만에 식었다. 다음 인기글은 고양이 사진이었다.", mon: { v: 300, m: 3 } },
      mid: { text: "인기글 손님 중 셋에 하나가 단골이 됐다.", mon: { v: 300, m: 8 }, ask: "price" },
      small: { text: "예약이 반짝 늘었다가 제자리로 돌아왔다.", mon: { v: 120, m: 4 } },
      bust: { text: "'하나도 안 맞던데요' 글이 더 크게 퍼졌다. 상담실 보증금만 묶였다.", mult: { v: -0.3, m: 4 }, mental: -6, eff: { tr_rep: -6 } },
    } },
  // ───── 웹소설 ─────
  { id: "wn_factory", job: "webnovel", n: "웹소설 공장", meh: 0.3,
    cond: (s) => (s.webnovel?.lv || 0) >= 3,
    text: (s) => `매니지먼트 대표가 말했다. "작가님 세계관으로 외전·스핀오프를 동시에 돌리면 어때요? 보조 작가를 붙여 드릴게요." 한 명당 월 ${won(M(s, 180))}. 1년 동안 내가 플롯과 감수를 맡는다. 품질이 무너지면 본편 별점까지 같이 무너진다.`,
    ch: [
      { t: "보조 작가 2명으로 시작한다", mcost: 360, ap: 2, hp: -6, mo: 12, stat: "write", dc: 52, k: 1 },
      { t: "보조 작가 4명으로 크게 간다", mcost: 720, ap: 3, hp: -10, mo: 12, stat: "write", dc: 58, k: 1.85 },
    ],
    out: {
      big: { text: "스핀오프 세 편이 동시에 랭킹에 올랐다. '세계관 맛집'이라는 댓글이 달린다.", mon: { v: 1000, m: 30 } },
      meh: { text: "작품은 떴다. 그런데 보조 작가 한 명이 독립해서 거의 같은 작품을 냈다. 독자가 반으로 갈렸다.", mon: { v: 1000, m: 6 } },
      mid: { text: "공장 작품 두 편이 유료 상위권에 자리 잡았다.", mon: { v: 400, m: 18 } },
      small: { text: "외전 몇 편이 무난하게 팔렸다. 인건비 겨우 건졌을까.", mon: { v: 150, m: 12 } },
      bust: { text: "감수가 밀렸다. 설정 오류에 별점 테러가 쏟아지고 본편 독자까지 떠났다.", mult: { v: -0.3, m: 6 }, mental: -8, eff: { wn_fans: -15, wn_ret: -5 } },
    } },
  { id: "wn_drama", job: "webnovel", n: "드라마 판권", meh: 0.45,
    cond: (s) => (s.webnovel?.done || 0) >= 1 && ((s.webnovel?.bestPeak || 0) >= 2000 || (s.webnovel?.done || 0) >= 2),
    text: () => "드라마 제작사가 완결작 판권을 사고 싶다고 한다. 판권료는 흥행 정산형. 공동 제작 지분을 넣고 각색 자문까지 맡으면 흥행 몫이 커진다. 판권만 팔면 계약금으로 끝이다.",
    ch: [
      { t: "지분 투자 + 각색 자문까지 맡는다", cost: 4000, ap: 2, hp: -6, mo: 12, stat: "write", dc: 54, k: 1 },
      { t: "판권만 판다(지분 없이)", safe: true },
    ],
    out: {
      big: { text: "드라마가 대박 났다. OTT 해외 순위에도 올랐다. 판권 잔금·흥행 보너스에, 원작 매출이 두 배로 뛰었다.", lump: [30000, 45000], mult: { v: 1, m: 36 }, fame: 6 },
      meh: { text: "드라마는 첫 회부터 시청률 1%대. 조기 종영했다. 판권료만 손에 남았다.", lump: 10000 },
      mid: { text: "무난한 시청률. 원작을 찾아 읽는 사람이 조금 늘었다.", lump: 4000, mult: { v: 0.3, m: 12 } },
      small: { text: "캐스팅이 엎어지며 제작이 무기한 연기됐다. 계약금만 받았다.", lump: 1200 },
      bust: { text: "제작사가 부도났다. 지분은 휴지가 됐고 계약금도 못 받았다.", mental: -8 },
    } },
  { id: "wn_toon", job: "webnovel", n: "웹툰화 로열티", meh: 0.4,
    cond: (s) => (s.webnovel?.done || 0) >= 1,
    text: () => "웹툰 제작사가 완결작을 웹툰으로 만들자고 한다. 제작비 일부를 함께 대고 콘티 감수까지 맡으면 로열티 비율이 세 배가 된다.",
    ch: [
      { t: "제작비를 대고 콘티 감수까지 맡는다", cost: 2800, ap: 2, hp: -5, mo: 10, stat: "write", dc: 50, k: 1 },
      { t: "원작 사용료만 받고 맡긴다", cost: 650, ap: 0, hp: 0, mo: 8, stat: "write", dc: 44, k: 0.25 },
    ],
    out: {
      big: { text: "웹툰이 해외 플랫폼에서 터졌다. 매달 로열티가 들어오고 해외 판권 계약까지 붙었다.", lump: 6000, mon: { v: 700, m: 36 }, fame: 4 },
      meh: { text: "국내에서는 인기다. 해외에서는 아무도 모른다.", mon: { v: 200, m: 12 } },
      mid: { text: "웹툰이 꾸준히 읽힌다. 원작도 같이 팔린다.", mon: { v: 200, m: 18 } },
      small: { text: "작화가 원작 분위기와 안 맞았다. 그래도 로열티는 조금 들어온다.", mon: { v: 60, m: 12 } },
      bust: { text: "작가가 건강 문제로 중단했다. 3화로 끝난 웹툰이 되었다.", mental: -6 },
    } },
];
const DEF_BY = Object.fromEntries(JP_DEF.map((d) => [d.id, d]));

// 웹소설 '잘 되는 이벤트'(좋은 일). lump [최소, 최대] · mult 이익 배율 · eff 플러그인 효과
export const JP_GOOD = [
  { id: "g_contest", job: "webnovel", t: "공모전 대상", cond: (s) => (s.webnovel?.lv || 0) >= 2 && !!s.webnovel?.work, x: "출근길 지하철에서 메일 알림. '노블리 공모전 대상 수상을 축하드립니다.' 화면을 세 번 껐다 켰다.", lump: [1500, 3000], mult: { v: 0.4, m: 6 }, eff: { wn_fans: 10, brk: "write", stat: { charm: 2 } } },
  { id: "g_abroad", job: "webnovel", t: "해외 플랫폼 역주행", cond: (s) => (s.webnovel?.done || 0) >= 1, x: "2년 전 번역해 둔 완결작이 해외 플랫폼에서 갑자기 순위를 탔다. 외국어 댓글이 하루 수백 개.", lump: [600, 1200], mult: { v: 0.6, m: 8 } },
  { id: "g_review", job: "webnovel", t: "유명 리뷰어 추천", cond: (s) => (s.webnovel?.lv || 0) >= 2 && !!s.webnovel?.work, x: "구독자 50만 웹소설 리뷰어가 '요즘 숨은 명작'으로 내 작품을 꼽았다. 선호작 알림이 멈추지 않는다.", lump: [0, 0], mult: { v: 0.5, m: 5 }, eff: { wn_fans: 15 } },
  { id: "g_reshine", job: "webnovel", t: "완결 후 재조명", cond: (s) => (s.webnovel?.done || 0) >= 1, x: "\"이거 완결까지 다 봤는데 인생작임\" 글이 퍼지면서 완결작 정주행 결제가 몰렸다.", lump: [1000, 2000], mult: { v: 0.3, m: 6 } },
  { id: "g_audio", job: "webnovel", t: "오디오북 계약", cond: (s) => (s.webnovel?.done || 0) >= 1, x: "오디오북 플랫폼에서 완결작을 성우 낭독으로 내자고 한다. 선인세를 먼저 준단다.", lump: [1200, 2500] },
  { id: "g_fund", job: "webnovel", t: "굿즈 펀딩 대성공", cond: (s) => (s.webnovel?.lv || 0) >= 3, x: "독자들이 먼저 졸랐다. 주인공 일러스트 굿즈 펀딩을 열었더니 목표의 1,200%가 모였다.", lump: [1000, 2000] },
];
const GOOD_BY = Object.fromEntries(JP_GOOD.map((g) => [g.id, g]));

// 후속 장면(결과 뒤 따로 오는 선택)
const FOL = {
  // 타로 앱 대박 1년 뒤: 인수 제안(반은 소문으로 끝)
  tr_buy(s, r, f) {
    if (!r.chance(0.5)) { addFlow(s, "tarot", "mon", 350, 12, f.k || 1, "tr_app"); return { kind: "story", tag: "한방", title: "인수 소문", text: `"큰 회사가 앱을 사려고 한대요." 소문만 무성하다 끝났다. 앱은 계속 내 것이다(앱 수입 월 ${won(M(s, 350 * (f.k || 1)))} · 12개월 더).`, choices: [{ t: "계속", eff: {}, text: "" }] }; }
    const price = M(s, r.range(30000, 60000) * (f.k || 1));
    return { kind: "event", tag: "한방", title: "AI 타로 앱 인수 제안", text: `운세 플랫폼 회사가 앱을 통째로 사겠다고 한다. 인수가 ${won(price)}. 팔면 앱 수입은 끝. 안 팔면 계속 내 것이지만, 비슷한 앱이 매달 쏟아진다.`, onChoose: "jp_ask", jp: { ask: "buy", job: "tarot", price, k: f.k || 1 },
      choices: [{ t: `판다(${won(price)})`, eff: {}, text: "계약서에 도장을 찍었다. 통장 숫자에 0이 하나 더 붙었다." }, { t: "안 판다. 내 앱이다", eff: { mental: 3 }, text: "거절 메일을 보냈다. 앱 아이콘이 오늘따라 예쁘다." }] };
  },
};

// ───────── 상태 ─────────
function st(s) {
  if (!s.jp) s.jp = { since: {}, offT: {}, offN: {}, goodT: {}, goodN: {}, evT: -99, runs: [], flows: [], folQ: [], seen: {}, stat: { off: 0, go: 0, tier: {}, inc: 0, exp: 0 } };
  return s.jp;
}
function book(s, amt) { // 장부 + 통계
  const V = st(s), a = Math.round(amt); if (!a) return;
  if (a > 0) { s.cash += a; addMoney(s, "inc", JP_LABEL, a); V.stat.inc += a; } else { s.cash += a; addMoney(s, "exp", JP_LABEL, -a); V.stat.exp -= a; }
}
function addFlow(s, job, kind, v, m, k = 1, src = "") { const V = st(s); V.flows.push({ job, kind, src, v: kind === "mon" ? M(s, v * k) : +(v * k).toFixed(3), from: s.t + 1, until: s.t + 1 + m }); }
export const runsOf = (s, job) => (s.jp?.runs || []).filter((x) => x.job === job);

// ───────── 매달 ─────────
export function jackpotMonth(s, r, notes, scenes) {
  const V = st(s);
  // 1) 흐름(고정 수입·이익 배율·진행 중 비용)
  for (const f of V.flows) {
    if (s.t < f.from || s.t >= f.until) continue;
    if (f.kind === "mon") book(s, f.v);
    else if (f.kind === "mult") { if (!isOn(s, f.job)) continue; const p = profitOf(s, f.job); if (p > 0) book(s, p * f.v); }
  }
  V.flows = V.flows.filter((f) => f.until > s.t);
  for (const x of V.runs) {
    if (x.end <= s.t || !isOn(s, x.job)) continue; // 투잡을 접으면 진행 비용·행동력도 멈춘다
    if (x.mcost) book(s, -M(s, x.mcost));
    if (x.ap) s.apNext = (s.apNext || 0) - x.ap;
  }
  // 2) 끝난 도전 → 결과 장면
  for (const x of V.runs.filter((y) => y.end <= s.t)) scenes.push(resolve(s, r, x));
  V.runs = V.runs.filter((y) => y.end > s.t);
  // 3) 후속(인수 제안 등)
  for (const f of V.folQ.filter((y) => y.t <= s.t)) { const sc = FOL[f.id]?.(s, r, f); if (sc) scenes.push(sc); }
  V.folQ = V.folQ.filter((y) => y.t > s.t);
  // 4) 새 제안·좋은 일(한 달 최대 하나, 다른 사건과 안 겹치게)
  for (const job of JOBS) if (isOn(s, job)) V.since[job] ??= s.t;
  if (scenes.some((x) => x.kind === "event")) return;
  const offers = [], goods = [];
  for (const job of JOBS) {
    if (!isOn(s, job) || s.t - V.since[job] < JP_BAL.start) continue;
    if (!runsOf(s, job).length && (V.offN[job] || 0) < JP_BAL.offMax && s.t - (V.offT[job] ?? -99) >= JP_BAL.offGap) {
      const L = JP_DEF.filter((d) => d.job === job && d.cond(s) && (V.seen[d.id] === undefined || s.t - V.seen[d.id] >= 60));
      if (L.length) offers.push({ job, L });
    }
    if ((V.goodN[job] || 0) < JP_BAL.goodMax && s.t - (V.goodT[job] ?? -99) >= JP_BAL.goodGap) {
      const L = JP_GOOD.filter((g) => g.job === job && g.cond(s) && V.seen[g.id] === undefined);
      if (L.length) goods.push({ job, L });
    }
  }
  if (offers.length && r.chance(JP_BAL.offChance * offers.length)) {
    const o = r.pick(offers), d = r.pick(o.L);
    V.offT[o.job] = s.t; V.offN[o.job] = (V.offN[o.job] || 0) + 1; V.seen[d.id] = s.t; V.stat.off++;
    scenes.push(offerScene(s, d)); return;
  }
  if (goods.length && r.chance(JP_BAL.goodChance * goods.length)) {
    const o = r.pick(goods), g = r.pick(o.L);
    V.goodT[o.job] = s.t; V.goodN[o.job] = (V.goodN[o.job] || 0) + 1; V.seen[g.id] = s.t;
    scenes.push(goodScene(s, r, g));
  }
}

// ───────── 장면 ─────────
function costLine(s, c) {
  const a = [];
  if (c.cost) a.push(won(M(s, c.cost)));
  if (c.mcost) a.push(`월 ${won(M(s, c.mcost))}`);
  if (c.ap) a.push(`행동력 −${c.ap}/월`);
  a.push(`${c.mo}개월`);
  return a.join(" · ");
}
function offerScene(s, d) {
  return { kind: "event", tag: "한방", title: `한방 전략 · ${d.n}`, text: `${d.text(s)}
(${nm(d.job)} 큰 판. 결과는 대박·중박·소소·쪽박으로 갈려요. 판정이 잘되면 대박 확률이 올라가요)`, onChoose: "jp_offer", jp: { id: d.id }, choices: buildChoices(s, d) };
}
function buildChoices(s, d) {
  const out = d.ch.map((c) => {
    if (c.safe) return { t: c.t, eff: {}, text: "도장을 찍었다. 큰 꿈은 접고, 계약금은 챙긴다." };
    return { t: `${c.t} (${costLine(s, c)})`, check: { stat: c.stat, dc: c.dc }, ok: { text: "준비가 단단하다. 좋은 판이 될 것 같다.", eff: { hp: c.hp || 0 } }, ng: { text: "시작부터 삐걱댄다. 그래도 일단 간다.", eff: { hp: c.hp || 0, mental: -2 } } };
  });
  out.push({ t: "거절한다", eff: { mental: 1 }, text: "큰 판은 다음 기회에. 지금 하던 걸 잘하는 게 먼저다." });
  return out;
}
function goodScene(s, r, g) {
  const lump = g.lump && g.lump[1] ? M(s, r.range(g.lump[0], g.lump[1])) : 0;
  const bits = [];
  if (lump) bits.push(`일시금 약 ${won(lump)}`);
  if (g.mult) bits.push(`${nm(g.job)} 이익 +${Math.round(g.mult.v * 100)}% · ${g.mult.m}개월`);
  return { kind: "event", tag: "웹소설", title: `좋은 일 · ${g.t}`, text: `${g.x}\n(${bits.join(" · ")})`, onChoose: "jp_good", jp: { id: g.id, lump },
    choices: [{ t: "이 기세에 올라탄다(주말 반납)", eff: { hp: -5 }, text: "외전을 연달아 풀고 독자 이벤트를 열었다. 기세가 더 커졌다." }, { t: "평소대로 간다", eff: { mental: 2 }, text: "들뜨지 않고 하던 대로 썼다. 좋은 일은 좋은 일대로." }] };
}

// 결과 갈래 뽑기
function rollTier(r, ok, meh) {
  const P = ok === true ? JP_BAL.P.ok : ok === false ? JP_BAL.P.ng : JP_BAL.P.none;
  let v = r.next(), i = 0; for (; i < 3; i++) { v -= P[i]; if (v <= 0) break; }
  const t = ["big", "mid", "small", "bust"][i];
  return t === "big" && r.chance(meh) ? "meh" : t;
}
// 갈래 효과 적용 → 결과 줄
function applyOut(s, r, job, o, k, src) {
  const L = [];
  if (o.lump) { const base = Array.isArray(o.lump) ? r.range(o.lump[0], o.lump[1]) : o.lump; const a = M(s, base * k); if (a) { book(s, a); L.push(`일시금 +${won(a)}`); } }
  if (o.mon) { addFlow(s, job, "mon", o.mon.v, o.mon.m, k, src); L.push(`월 +${won(M(s, o.mon.v * k))} · ${o.mon.m}개월`); }
  if (o.mult) { addFlow(s, job, "mult", o.mult.v, o.mult.m, k, src); L.push(`${nm(job)} 이익 ${o.mult.v > 0 ? "+" : "−"}${Math.round(Math.abs(o.mult.v * k) * 100)}% · ${o.mult.m}개월`); }
  if (o.fame) { s.fame = clamp((s.fame || 0) + o.fame * Math.min(1, k + 0.3), 0, 100); L.push(`명성 +${Math.round(o.fame * Math.min(1, k + 0.3))}`); }
  if (o.eye && !(s.co?.quit || s.co?.fired)) { s.co.eye = clamp((s.co.eye || 0) + o.eye, 0, 100); L.push(`회사 눈치 +${o.eye}`); }
  if (o.mental) { s.mental = clamp(s.mental + o.mental, 0, 100); L.push(`멘탈 ${o.mental}`); }
  return L;
}
function resolve(s, r, x) {
  const V = st(s), d = DEF_BY[x.id]; if (!d) return { kind: "story", tag: "한방", title: "한방 전략", text: "…", choices: [{ t: "계속", eff: {}, text: "" }] };
  const tier = x.force || rollTier(r, x.ok, d.meh), o = d.out[tier];
  V.stat.tier[tier] = (V.stat.tier[tier] || 0) + 1;
  (V.hist = V.hist || []).push({ id: d.id, t: s.t, tier, k: x.k }); if (V.hist.length > 40) V.hist.shift();
  const L = applyOut(s, r, d.job, o, x.k, d.id); if ((d.id === "wn_drama" || d.id === "wn_toon") && tier !== "bust" && s.webnovel) s.webnovel.ipDrama = (s.webnovel.ipDrama || 0) + 1; // 히든 길 '2차 판권 1번'(엎어진 계약은 안 센다)
  if (tier === "big") { const bk = D.STAT_BRK.jp[d.job]; if (bk) L.push(giveBrk(s, bk, "대박")); L.push(`매력 +${gainStat(s, "charm", 2, "jp").toFixed(1)}`); } // v4.28 큰 성공의 자신감·돌파 계기
  if (o.fol) V.folQ.push({ id: o.fol.id, t: s.t + o.fol.after, k: x.k });
  log(s, `[한방] ${d.n} · ${TIER_N[tier]}`, "work");
  const title = `한방 결과 · ${d.n} · ${TIER_N[tier]}`;
  const text = `${o.text}\n(${L.join(" · ") || "남은 건 경험뿐"})`;
  if (o.ask === "price") {
    const add = M(s, o.mon.v * x.k * 0.5);
    return { kind: "event", tag: "한방", title, text: `${text}\n예약이 밀려 있다. 상담료를 올릴까?`, onChoose: "jp_ask", jp: { ask: "price", job: d.job, add, m: Math.round(o.mon.m * 0.6) },
      choices: [{ t: "상담료를 50% 올린다", eff: { hp: 3, ...(o.eff || {}) }, text: "비싸져도 올 사람은 온다. 대신 손님이 빨리 빠질 수도 있다." }, { t: "가격은 그대로 둔다", eff: { mental: 2, ...(o.eff || {}) }, text: "초심을 지켰다. 단골들이 그 마음을 안다." }] };
  }
  return { kind: "story", tag: "한방", title, text, choices: [{ t: "계속", eff: o.eff || {}, text: "" }] };
}

// ───────── 선택 처리(core.js SCENE_FN 에 등록) ─────────
export const JP_CHOOSE = {
  jp_offer(s, r, i, okv, sc) {
    const d = DEF_BY[sc?.jp?.id]; if (!d) return [];
    const c = d.ch[i]; if (!c) return []; // 거절
    const V = st(s);
    if (c.safe) { // 판권만 판다: 계약금만 확정
      const a = M(s, r.range(1500, 2500)); book(s, a); log(s, `[한방] ${d.n} · 판권만 팔았다`, "work"); if (d.job === "webnovel" && s.webnovel) s.webnovel.ipDrama = (s.webnovel.ipDrama || 0) + 1; // 히든 길 '2차 판권 1번'
      return [`계약금 +${won(a)}`];
    }
    if (c.cost) book(s, -M(s, c.cost));
    V.stat.go++;
    V.runs.push({ id: d.id, job: d.job, k: c.k || 1, ok: okv, t0: s.t, end: s.t + 1 + c.mo, mcost: c.mcost || 0, ap: c.ap || 0, force: sc.jp.force });
    log(s, `[한방] ${d.n} 도전`, "work");
    const out = [];
    if (c.cost) out.push(`투자 −${won(M(s, c.cost))}`);
    if (c.mcost) out.push(`매달 −${won(M(s, c.mcost))}`);
    out.push(`${c.mo}개월 뒤 결과${c.ap ? ` · 그동안 행동력 −${c.ap}/월` : ""}`);
    return out;
  },
  jp_ask(s, r, i, okv, sc) {
    const q = sc?.jp; if (!q) return [];
    if (q.ask === "buy") {
      if (i === 0) { st(s).flows = st(s).flows.filter((f) => f.src !== "tr_app"); book(s, q.price); log(s, `[한방] AI 타로 앱을 팔았다`, "money"); return [`인수가 +${won(q.price)}`, "앱 수입 끝"]; }
      // 안 판다: 앱 수입 24개월 더. 넷에 하나는 경쟁 앱에 밀려 6개월 만에 끝
      const m = r.chance(0.25) ? 6 : 24; addFlow(s, q.job, "mon", 350, m, q.k || 1, "tr_app");
      return [`앱 수입 월 ${won(M(s, 350 * (q.k || 1)))} · ${m}개월 더${m === 6 ? "(경쟁 앱이 쏟아졌다)" : ""}`];
    }
    if (q.ask === "price") {
      if (i !== 0) return [];
      if (r.chance(0.25)) { addFlow(s, q.job, "mult", -0.15, 3); return ["\"비싸졌네요\" 손님이 빠졌다", `${nm(q.job)} 이익 −15% · 3개월`]; }
      addFlow(s, q.job, "mon", q.add, q.m); return [`인상분 월 +${won(q.add)} · ${q.m}개월`];
    }
    return [];
  },
  jp_good(s, r, i, okv, sc) {
    const g = GOOD_BY[sc?.jp?.id]; if (!g) return [];
    const f = i === 0 ? 1.2 : 1, out = [];
    const lump = Math.round((sc.jp.lump || 0) * f / 10) * 10; if (lump) { book(s, lump); out.push(`일시금 +${won(lump)}`); }
    if (g.mult) { addFlow(s, g.job, "mult", g.mult.v * f, g.mult.m); out.push(`${nm(g.job)} 이익 +${Math.round(g.mult.v * f * 100)}% · ${g.mult.m}개월`); }
    log(s, `[좋은 일] ${g.t}`, "work");
    return out;
  },
};

// ───────── 시험용 ─────────
// 제안 장면을 바로 만든다(조건 무시). force 를 주면 결과 갈래를 고정
export function jpScene(s, id, force) { const d = DEF_BY[id]; if (!d) return null; st(s); const sc = offerScene(s, d); if (force) sc.jp.force = force; return sc; }
export function jpGoodScene(s, r, id) { const g = GOOD_BY[id]; return g ? goodScene(s, r, g) : null; }
// 진행 중 도전·후속을 바로 다음 달에 끝나게 당긴다
export function jpRush(s) { const V = st(s); for (const x of V.runs) x.end = Math.min(x.end, s.t); for (const f of V.folQ) f.t = Math.min(f.t, s.t); }
// 보드 칸용
export function jpInfo(s, job) { const V = s.jp; if (!V) return null; const R = V.runs.filter((x) => x.job === job); if (!R.length) return null; return R.map((x) => ({ n: DEF_BY[x.id]?.n, left: x.end - s.t })); }
