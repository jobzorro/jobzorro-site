// 타로 보드: "카드보다 상담이 본업."
// 연습 노트 → 온라인 텍스트 리딩(재능마켓) → 플리마켓·카페 부스 → 단골과 예약 대기.
// 돈은 문의(큐)를 내가 직접 읽어야 들어온다. 연말·연초에 문의가 몰리고, 리딩마다 멘탈이 깎인다.
// 규약: engine/jobs/README.md
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js"; // 초반 고생 배율(ramp)
import * as UND from "../und.js"; // 11-28 업의 이해도 효과(함수 안에서만 쓴다. 스위치 UND_ON 이 꺼져 있으면 늘 0 · false)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r1 = (x) => Math.round(x * 10) / 10;
const act = (s, k) => !!s.sj?.active?.includes(k);
const company = (s) => !(s.co?.quit || s.co?.fired);

// ───────── 단계(기획 데이터 levels) ─────────
// need = 그 단계에 오르는 조건, open = 그 단계에서 열리는 것
export const LV = [
  { n: "연습 노트의 리더", need: "시작", open: "덱 1개 · 연습 노트 · 지인 무료 리딩" },
  { n: "무료 리딩 이벤트", need: "연습 노트 20건", open: "오늘의 카드 채널 · 선착순 무료 리딩(DM)" },
  { n: "단골 있는 리더", need: "무료 리딩 10건 · 후기 10개", open: "유료 텍스트 리딩(1장 5천·3장 1만) · 플리마켓·카페 부스" },
  { n: "니치 전문 리더", need: "유료 누적 100건 · 재구매율 20%", open: "통화 상담(30분 3만) · 꼬리 질문 · 전문 분야 · 월 구독 · 리딩 키트 · 위탁" },
  { n: "타로 브랜드", need: "한 달 매출 100만 · 전문 분야 확정", open: "예약제 · 상담실 · 워크숍 · 굿즈" },
];
export const NICHES = {
  love: { n: "연애·재회", lead: 1.1, unit: 1.0, d: "문의 많음 · 감정 소모 큼" },
  career: { n: "퇴사·이직", lead: 0.9, unit: 1.25, d: "문의 적고 단가 높음 · 회사 경험이 무기" },
  money: { n: "금전·사업", lead: 0.85, unit: 1.3, d: "단가 최고 · 엇나가면 항의 큼" },
};
export const PRICES = [
  { n: "입문가", m: 0.7, d: "문의 +30%" },
  { n: "표준", m: 1, d: "" },
  { n: "프리미엄", m: 1.5, d: "후기·평판이 받쳐야 함" },
];
// 11-28 업의 이해도 효과(스위치 UND_ON). 전문(600): 손님이 단골로 남을 확률 ×reg · 단골의 재문의 ×rep. 장인(1,000): 가격 넷째 단계 '심층 리딩'이 열린다(평판이 받쳐야 문의가 남는다)
export const TR_UND = { reg: 1.1, rep: 1.05, deep: { n: "심층 리딩", m: 2, d: "평판이 높아야 문의가 남아요", lo: 0.3, hi: 0.7, per: 250 } };
if (typeof process !== "undefined" && process.env?.TRU) Object.assign(TR_UND, JSON.parse(process.env.TRU)); // 봇 시험용
export const undFx = (s) => ({ on: UND.jobs().includes("tarot"), v: UND.score(s, "tarot"), pro: UND.at(s, "tarot", UND.TH.전문), deep: UND.at(s, "tarot", UND.TH.장인) });
export const priceList = (s) => (UND.at(s, "tarot", UND.TH.장인) ? [...PRICES, TR_UND.deep] : PRICES);
export const priceIx = (s) => clamp(s.tarot.price | 0, 0, priceList(s).length - 1); // 장인에서 고른 넷째 단계는 스위치가 꺼지면 프리미엄으로 읽는다
// 달별 문의 배수: 연말·연초 몰림, 2월 정적
export const SEASON = [1.7, 0.65, 0.9, 0.95, 0.95, 0.9, 0.85, 0.9, 1.0, 1.05, 1.2, 1.8];
// 11-21 밸런스(10개 투잡 공통 비교, 기획 tarot.json: 중위 월 40만·p75 80만·p95 300만).
// 원래: 문의 상한 [6, 12, 34, 52, 80], 텍스트 평균 단가 0.8·통화 섞이면 1.4 → 3년 차 중앙 월 69만, 10년 차 201만.
export const TR_BAL = { leadCap: [6, 12, 30, 44, 66], unitText: 0.7, unitCall: 1.25 };
const LEAD_CAP = TR_BAL.leadCap;
// v4.28 특이 요소(f30). 효과 크기는 여기 숫자만 바꾸면 된다
export const TR_F30 = {
  // 매일 찾아오는 단골: 단골 reg명 이상·gap달 간격으로 등장. 계속 받으면 매달 pay건 × 단가, 멘탈 −(drain + drainUp×달수, 상한 drainMax), 가족 항의 확률 famP + famUp×달수
  heavy: { reg: 3, gap: 10, p: 0.35, pay: 16, drain: 2, drainUp: 0.4, drainMax: 8, cutRep: 3, refRep: 4, refMent: 3, famP: 0.04, famUp: 0.01, famRep: 8 },
  // 적중 기록부: 이번 달 읽은 건의 share 만큼 결과가 돌아온다. 맞히면 입소문(buzz, 문의 +%), 빗나가면 평판 −. 말투(style)마다 배수
  style: {
    0: { n: "애매하게", d: "빗나가도 안전 · 재방문 ↓", buzz: 0.4, miss: 0.3, lead: 0.93, churn: 1.4 },
    1: { n: "균형 있게", d: "가능성과 조건으로", buzz: 1, miss: 1, lead: 1, churn: 1 },
    2: { n: "단정적으로", d: "맞히면 입소문 ↑↑ · 빗나가면 악평", buzz: 1.7, miss: 1.8, lead: 1, churn: 0.85 },
  },
  hit: { share: 0.15, base: 0.45, perSense: 1 / 400, perRep: 1 / 500, lo: 0.3, hi: 0.78, buzzPer: 1.2, buzzMax: 25, decay: 0.8, missRep: 0.8, follow: 15 },
  // 수능·신년 운세 대목: 10월에 패키지 준비 결정 → 11·12·1월 문의 ×lead(수능 응원까지 하면 11월 ×suneung), 한 번에 읽는 양 ×cap, 단가 ×unit
  peak: { cost: 15, ap: [1, 2], cap: 1.5, unit: 1.2, lead: 1.15, suneung: 1.3 },
};
const pkOn = (s) => { const T = s.tarot; return !!T?.pk && [11, 12, 1].includes(s.cal) && s.t - T.pk.t <= 4; };
export const peakOn = pkOn;
const STREAMS = { inc: ["타로 상담료", "타로 부스", "타로 구독", "타로 키트·굿즈"], exp: ["타로 수수료", "타로 비용", "타로 상담실"] };

const DEF = () => ({
  v: 1, lv: 1, brand: false, notes: 0, free: 0, reviews: 0, paid: 0, reads: 0, regulars: 0, rep: 30, follow: 0,
  niche: null, price: 1, tail: false, boundary: false, subOn: false, subs: 0, kits: 0, kitProg: 0, kitAge: [],
  room: "none", agent: false, bot: false, empathy: false, series: false, partner: false,
  queue: 0, wait: 0, leads: 0, repeatLeads: 0, rebuy: 0, served: 0, gross: 0, cardN: 0, practN: 0, boothT: -99,
  waitM: 0, goodM: 0, peak: 0, witch: 0, bSeen: 0, seen: [], evT: -99, started: -1, months: 0,
  hist: [], kh: [], rh: [], last: null,
  hv: null, hvT: -99, style: 1, styleSeen: false, hitN: 0, missN: 0, buzzH: 0, pk: null, pkAsk: -99,
});

// ───────── 계산 도우미(화면에서도 씀) ─────────
export const callsOn = (T) => T.lv >= 4;
export function unitPrice(s) {
  const T = s.tarot; if (T.lv < 3) return 0;
  const base = callsOn(T) ? TR_BAL.unitCall : TR_BAL.unitText; // 텍스트 1장 0.5·3장 1.0 → 통화 30분 3만이 섞이면 평균(TR_BAL)
  return r1(base * priceList(s)[priceIx(s)].m * (T.niche ? NICHES[T.niche].unit : 1) * (T.room === "lease" ? 1.3 : T.room === "hourly" ? 1.1 : 1) * (T.brand ? 1.25 : 1) * (pkOn(s) ? TR_F30.peak.unit : 1) * SYN.pi(s));
}
export function capPerRead(s, boost = 1) {
  const T = s.tarot;
  return Math.max(1, Math.round((5 + (s.st.talk || 0) / 25) * boost * (callsOn(T) ? 0.75 : 1) * (s.fullJob === "tarot" ? 1.15 : 1) * (pkOn(s) ? TR_F30.peak.cap : 1)));
}
export function drainPer(s) {
  const T = s.tarot;
  return (callsOn(T) ? 0.5 : 0.32) * (T.boundary ? 0.65 : 1) * (T.tail ? 1.15 : 1) * (T.niche === "love" ? 1.15 : 1) * mod(s, "trDrain", 1);
}
const feeRate = (T) => (T.brand ? 0.1 : 0.18) * (T.room === "lease" ? 0.5 : 1); // 재능마켓 수수료(대면 상담은 수수료 없음)
function priceDemand(s, T) { const p = priceIx(s), X = TR_UND.deep; return p === 0 ? 1.3 : p === 2 ? clamp(0.45 + T.rep / 180, 0.45, 1) : p === 3 ? clamp(X.lo + T.rep / X.per, X.lo, X.hi) : 1; }

// 다음 단계 조건 목록
export function nextNeed(s) {
  const T = s.tarot;
  if (T.lv === 1) return [{ n: "연습 노트", cur: T.notes, goal: 20 }];
  if (T.lv === 2) return [{ n: "무료 리딩", cur: T.free, goal: 10 }, { n: "후기", cur: Math.floor(T.reviews), goal: 10 }];
  if (T.lv === 3) return [{ n: "유료 리딩 누적", cur: T.paid, goal: 100 }, { n: "재구매율 %", cur: T.rebuy, goal: 20 }];
  if (T.lv === 4) return [{ n: "한 달 매출(만)", cur: Math.round(T.peak), goal: 100 }, { n: "전문 분야", cur: T.niche ? 1 : 0, goal: 1 }];
  if (!T.brand) return [{ n: "예약 대기 5명 이상 연속(달)", cur: T.waitM, goal: 3 }, { n: "팔로워", cur: Math.round(T.follow), goal: 10000 }];
  return [];
}
function checkLv(s, out) {
  const T = s.tarot; let up = false;
  for (let g = 0; g < 5; g++) {
    const nn = nextNeed(s); if (!nn.length || !nn.every((x) => x.cur >= x.goal)) break;
    if (T.lv < 5) { T.lv++; up = true; out.push(`타로 Lv${T.lv} ${LV[T.lv - 1].n}!`, `열림: ${LV[T.lv - 1].open}`); log(s, `타로 Lv${T.lv} ${LV[T.lv - 1].n}`, "work"); if (T.lv === 4) T.subOn = true; }
    else { T.brand = true; up = true; out.push("타로 브랜드 완성! 예약제·상담실·워크숍·굿즈"); log(s, "타로 브랜드가 됐다. 예약 대기가 일상이다.", "work"); break; }
  }
  return up;
}

// ───────── 이벤트(기획 데이터 16개 + 타로 고유 골치 2개) ─────────
// 효과 숫자는 그때그때 계산. 복잡한 결과는 onChoose "tr_ev" 에서.
function evList(s) {
  const T = s.tarot, pi = SYN.pi(s), u = Math.max(1, unitPrice(s)), boothRev = Math.round(10 * 4 * pi * 0.8);
  return [
    { id: "e01", ph: "early", ok: () => T.months <= 2, t: "첫 덱 개봉", x: "3만 2천 원짜리 덱을 샀다. 78장. 메이저 아르카나 22장 이름만 외우는 데 일주일이 걸렸다. 탑 카드가 자꾸 나온다.",
      c: [{ t: "매일 한 장 뽑아 연습 노트에 기록", eff: { hp: -4, tr_notes: 6, stat: { sense: 1 } }, text: "노트 첫 장에 '탑: 무너져야 다시 짓는다'라고 적었다." },
          { t: "무료 영상 강의를 몰아 본다", eff: { ap: -1, tr_notes: 3, stat: { sense: 0.5 } }, text: "주말이 통째로 사라졌다. 뜻은 외웠는데 손이 안 따라간다." }] },
    { id: "e02", ph: "early", ok: () => T.lv === 2, t: "3명 무료 리딩", x: "인별에 '선착순 3명 무료 리딩'을 올렸다. 10분 만에 DM이 14개 왔다. 전부 \"그 사람 마음이 궁금해요\"다.",
      c: [{ t: "14명 모두 해 준다", eff: { hp: -10, mental: -4, tr_free: 8, tr_rev: 7 }, text: "새벽 2시까지 카드를 펼쳤다. 후기가 우르르 달렸다." },
          { t: "3명만 하고 후기를 꼭 받는다", eff: { tr_free: 3, tr_rev: 3, tr_q: 4 }, text: "나머지 11명에게 '다음 회차 우선 안내'를 보냈다." }] },
    { id: "e03", ph: "early", ok: () => T.lv >= 2 && T.lv <= 3 && !T.series, t: "카드 이미지 한 장", x: "\"이 카드를 뽑은 당신, 오늘은 한 걸음 물러서야 합니다.\" 카드 사진에 문장 하나를 얹어 올렸다. 저장 수 230.",
      c: [{ t: "매일 '오늘의 카드' 시리즈로 만든다", eff: { stat: { sense: 1 }, tr_follow: 180 }, text: "매일 아침 7시 업로드. 오늘의 카드 효과 +25%" },
          { t: "가끔만 올린다", eff: {}, text: "저장 수는 금방 잊혔다." }] },
    { id: "e04", ph: "early", ok: () => T.paid >= 1, t: "첫 유료 5,000원", x: "텍스트 리딩 첫 결제가 들어왔다. 5,000원. 질문은 \"이직할까요?\" 퇴사 고민은… 내 전문이다. " + (s.co?.quit || s.co?.fired ? "매일 하던 고민이니까." : "매일 하는 고민이니까."),
      c: [{ t: "정성 리딩에 카드 이미지 리포트까지", eff: { hp: -3, tr_reg: 1, tr_rep: 3 }, text: "\"이걸 5천 원에 받아도 돼요?\" 단골 1호가 생겼다." },
          { t: "템플릿 문구로 빠르게", eff: { hp: 2, tr_rep: 1 }, text: "10분 만에 끝. 손님은 '감사합니다' 한 줄." }] },
    { id: "e05", ph: "mid", ok: () => T.lv >= 3 && s.cal === 12, t: "12월 31일 밤", x: `연말이다. 신년운세 문의가 하루 40건 쌓였다.${company(s) ? " 본업 종무식 뒤풀이 중에 화장실에서 카드를 뽑고 있다." : ""}`,
      c: [{ t: "신년 특가 패키지로 다 받는다", eff: { tr_cash: Math.round(u * 30), hp: -15, mental: -8, ...(company(s) ? { eye: 4 } : {}) }, text: "통장이 불었다. 새해 첫날은 기절해 있었다." },
          { t: "하루 10건 한정", eff: { tr_cash: Math.round(u * 10), hp: -4 }, text: "'마감' 공지를 올리니 오히려 문의가 더 왔다." }] },
    { id: "e06", ph: "mid", ok: () => T.lv >= 4, t: "꼬리 질문 3,000원", x: "리딩을 보낸 손님이 묻는다. \"그럼 그 사람은 언제 연락 올까요?\" 이번 주에만 꼬리 질문이 50개다.", on: true,
      c: [{ t: "꼬리 질문 3,000원 옵션을 만든다", eff: { tr_rep: -2 }, text: "\"돈 받고 하네…\" 투덜대도 결제는 한다. 리딩당 수입 +" },
          { t: "서비스로 답해 준다", eff: { tr_rep: 3, hp: -6 }, text: "\"선생님 너무 친절해요.\" 손목이 아프다." }] },
    { id: "e07", ph: "mid", ok: () => T.regulars >= 3 && T.lv >= 3, t: "단골 첫 정기권", x: "석 달째 매주 찾아오는 손님이 말했다. \"아예 한 달 단위로 봐 주실 수 있어요?\" 월 구독 리딩의 첫 손님이다.", on: true,
      c: [{ t: "월간 리딩 + 조언 리포트 구독 상품을 낸다", eff: { stat: { write: 1 } }, text: "구독 1명. 매달 리포트를 써야 한다." },
          { t: "건별 결제를 유지한다", eff: {}, text: "편하긴 하다. 대신 매달 처음부터." }] },
    { id: "e08", ph: "mid", ok: () => T.lv >= 3 && T.lv <= 4, t: "1,200명 중 한 명", x: "재능마켓에 '타로'를 검색하니 상담사가 1,200명이다. 모두 '연애운·금전운'을 판다. 내 상품은 3페이지 아래 묻혀 있다.", on: true,
      c: [{ t: "'퇴사·이직 전문 타로'로 자리 잡는다", eff: {}, text: "문의는 조금 줄고 단가는 오른다. 회사 다니는 게 무기가 됐다." },
          { t: "첫 5명 40% 할인으로 순위 올리기", eff: { tr_cost: Math.round(u * 5 * 0.4), tr_rev: 5 }, text: "후기 5개. 검색 순위가 1페이지로 올라왔다." }] },
    { id: "e09", ph: "mid", ok: () => T.lv >= 4, rep: true, t: "감정 쓰레기통", x: "통화 상담 60분 중 카드 얘기는 5분이었다. 나머지는 이별 이야기와 울음이었다. 전화를 끊고 한동안 멍했다.", on: true,
      c: [{ t: "상담 시간·범위 안내문을 만든다", eff: { mental: 6, tr_reg: -1 }, text: "\"30분, 질문 3개까지.\" 떠난 손님도 있다. 대신 내가 산다." },
          { t: "끝까지 들어 준다", check: { stat: "talk", dc: 45 }, ok: { text: "\"살 것 같아요.\" 긴 후기가 달렸다. 나는 녹초다.", eff: { tr_rep: 5, mental: -8 } }, ng: { text: "같이 울었다. 다음 날 출근길이 무거웠다.", eff: { tr_rep: 2, mental: -14 } } }] },
    { id: "e10", ph: "late", ok: () => T.lv >= 4 && !T.partner, t: "북카페 팝업 부스", x: "동네 북카페 사장님이 제안했다. 주말 이틀 '타로의 밤' 부스. 30분 4만 원, 장소 수수료 20%. 사진 찍기 좋은 조명이 있다.", on: true,
      c: [{ t: "1인 예약 시 동행자 무료로 참여한다", eff: { tr_booth: boothRev, tr_reg: 3, tr_follow: 250, hp: -8 }, text: "이틀 동안 20명. 동행자가 다음 손님이 됐다. 이 카페와 단골 협업 시작." },
          { t: "온라인에만 집중한다", eff: {}, text: "주말은 지켰다." }] },
    { id: "e11", ph: "late", ok: () => T.kits >= 1, t: "리딩 키트 출시", x: "자주 받는 질문 30개와 해석법을 정리해 노숀 키트로 만들었다. 19,000원. 자는 동안 7개가 팔렸다.", on: true,
      c: [{ t: "시리즈로 늘린다(이직·연애·관계)", eff: { hp: -4 }, text: "다음 키트 작업 절반이 끝났다." },
          { t: "하나로 끝낸다", eff: { tr_kit: Math.round(1.9 * 7 * pi) }, text: "부수입은 부수입대로 둔다." }] },
    { id: "e12", ph: "late", ok: () => T.lv >= 4 && !T.bot && !T.empathy, t: "AI 타로 앱", x: "\"AI가 3초 만에 카드를 해석해 드려요. 무료.\" 광고가 계속 뜬다. 문의가 눈에 띄게 줄었다. 그런데 단골 하나가 \"그래도 사람이 낫더라고요\" 하고 돌아왔다.", on: true,
      c: [{ t: "공감 상담을 전면에 내세운다", eff: { stat: { talk: 1 } }, text: "'카드보다 대화'. 단가를 지켰다." },
          { t: "AI 챗봇 자동 응답 상품을 만든다", eff: { stat: { num: 1 }, tr_rep: -3 }, text: "월 몇 만 원이 저절로 들어온다. 리뷰에 '기계 같아요'가 섞였다." }] },
    { id: "e13", ph: "crisis", ok: () => T.follow >= 1200, rep: true, t: "\"사기 아니에요?\"", x: "게시물에 댓글이 달렸다. \"이런 걸로 돈 받는 거 사기 아님?\" 좋아요가 80개다. 단골 하나가 언팔했다.",
      c: [{ t: "'심리적 조망 도구'라는 상담 철학을 정리해 공지", check: { stat: "write", dc: 40 }, ok: { text: "차분한 글에 '저장'이 쌓였다. 오히려 신뢰가 올랐다.", eff: { tr_rep: 3, mental: -2 } }, ng: { text: "변명처럼 읽혔다. 댓글이 더 달렸다.", eff: { tr_rep: -1, mental: -5 } } },
          { t: "댓글을 지운다", eff: { tr_rep: -4, tr_reg: -1 }, text: "캡처가 돌았다. '댓글 지우는 타로'." }] },
    { id: "e14", ph: "crisis", ok: () => T.paid >= 30, rep: true, t: "엇나간 리딩", x: "석 달 전 손님이 그때 리딩을 캡처해 보냈다. \"재회할 수 있다면서요. 그 사람 지난주에 결혼했대요.\" 리딩비를 돌려 달라고 한다. 캡처 속 내 문장은 '다시 닿을 가능성이 보여요'였다.",
      c: [{ t: "리딩비를 돌려주고 설명이 모자랐다고 사과한다", eff: { tr_cost: Math.round(u * 2), tr_rep: -1 }, text: "\"카드는 가능성이지 확정이 아니었어요. 제 설명이 부족했습니다.\" 답장은 '네' 한 글자였다." },
          { t: "환불 대신 지금 마음을 다시 읽어 주겠다고 한다", check: { stat: "talk", dc: 45 }, ok: { text: "한 시간 통화. 카드는 세 장만 뽑았다. \"사실 답은 알고 있었어요.\" 손님이 다음 달 예약을 잡았다.", eff: { tr_rep: 2, tr_reg: 1, mental: -3 } }, ng: { text: "\"또 카드로 넘어가시네요.\" 통화가 끊겼다. 타로 카페에 긴 글이 올라왔다.", eff: { tr_rep: -4, mental: -4 } } },
          { t: "카드는 가능성일 뿐이라며 거절한다", eff: { tr_rep: -6, mental: -3 }, text: "맞는 말이다. 맞는 말이 위로가 되는 날은 아니었다." }] },
    { id: "e15", ph: "crisis", ok: () => T.lv >= 3 && s.cal === 1 /* 11-25: 1월 달 마감에 만들어 2월이 시작될 때 뜬다. 전에는 2라서 3월에 떴다 */, t: "2월의 정적", x: "신년 특수가 끝났다. 2월 둘째 주 문의는 하루 1건. 지난달 번 돈으로 산 조명이 방 한구석에서 빛난다.",
      c: [{ t: "비수기용 니치 콘텐츠 시리즈를 올린다", eff: { hp: -4, tr_follow: 200, stat: { write: 0.5 } }, text: "'퇴근길 1장 리딩' 시리즈. 저장이 조금씩 쌓인다." },
          { t: "지인 추천 50% 할인권을 뿌린다", eff: { tr_cost: Math.round(5 * pi), tr_q: 6 }, text: "할인권 들고 친구의 친구가 왔다." }] },
    { id: "e16", ph: "crisis", ok: () => T.lv >= 4 && T.room === "none" && (T.wait >= 3 || T.lv >= 5), t: "상담실 임대 유혹", x: `예약 대기가 생기자 작은 상담실을 얻을까 싶다. 월세 ${won(Math.round(55 * pi))}, 인테리어 ${won(Math.round(300 * pi))}.${company(s) ? " 평일엔 회사에 있어야 한다." : ""}`, on: true,
      c: [{ t: "시간제 공간 대여로 주말만", eff: {}, text: "주말 대면 상담 시작. 단가 +10%, 월 대여비가 나간다." },
          { t: "상담실을 계약한다", eff: {}, text: "보증금·인테리어가 한 번에 나갔다. 대면 단가 +30%, 수수료 절반. 예약이 비면 월세가 아프다." },
          { t: "아직은 온라인으로", eff: {}, text: "고정비 0원의 평화." }] },
    // e17 '탕비실의 손님'(회사 사람에게 들킴)은 뺐다 → 들키는 장면은 engine/caught.js 가 투잡별로 맡는다
    { id: "e18", ph: "crisis", ok: () => T.paid >= 40 && T.follow >= 300, t: "캡처된 점괘", x: "손님이 내 리딩 전문을 캡처해 익명 게시판에 올렸다. 제목은 '이 타로 소름'. 댓글이 300개다. 그런데 리딩 안에 손님 전 애인의 직장과 이니셜이 그대로 있다. 당사자라는 사람이 DM을 보냈다. \"이거 내려 주세요.\"",
      c: [{ t: "손님에게 글을 내려 달라고 하고, 리딩마다 '공유 금지'를 붙인다", eff: { tr_rep: 2, tr_reg: -1 }, text: "글은 내려갔다. 손님은 \"홍보해 준 건데요\" 하고 서운해했다." },
          { t: "그대로 둔다. 문의가 몰려오는 중이다", eff: { tr_follow: 250, tr_q: 5, tr_rep: -4, mental: -3 }, text: "문의 알림이 밤새 울렸다. 그 DM에는 끝내 답하지 못했다." },
          { t: "당사자에게 사과하고 내 계정에 경위를 적는다", check: { stat: "write", dc: 42 }, ok: { text: "\"남의 이야기는 리딩 밖으로 나가지 않게 하겠습니다.\" 그 글이 다시 캡처돼 돌았다. 이번엔 좋은 쪽으로.", eff: { tr_rep: 3, mental: -2 } }, ng: { text: "사과문에 이니셜을 또 적어 버렸다. 급히 고쳤지만 본 사람은 봤다.", eff: { tr_rep: -2, mental: -4 } } }] },
    { id: "e19", ph: "mid", ok: () => T.lv >= 3 && T.paid >= 15, t: "카드로 답하면 안 되는 질문", x: "결제 알림과 함께 질문이 왔다. \"다음 주가 수술이에요. 받아도 될까요? 카드로 봐 주세요.\" 건강, 소송, 빌려준 돈. 이 셋은 카드로 답하지 않는 게 이 바닥 불문율이다.",
      c: [{ t: "\"그건 의사 선생님과 정하실 일이에요.\" 환불하고 응원 카드 한 장만 보낸다", eff: { tr_cost: Math.round(u), tr_rep: 3, mental: -1 }, text: "별 카드 사진에 '잘 다녀오세요'를 적어 보냈다. 한 달 뒤 퇴원했다는 후기가 달렸다." },
          { t: "카드는 뽑되 '결정은 병원에서'를 못 박는다", check: { stat: "talk", dc: 45 }, ok: { text: "\"수술 말고, 수술을 앞둔 마음을 볼게요.\" 손님은 그 말에 오히려 안심했다.", eff: { tr_rep: 2, tr_reg: 1, mental: -2 } }, ng: { text: "손님은 '탑' 카드만 기억했다. \"안 좋다는 거죠?\" 밤새 메시지가 왔다.", eff: { tr_rep: -3, mental: -5 } } },
          { t: "좋은 말만 골라 해 준다", eff: { tr_cash: Math.round(u), mental: -4 }, text: "\"잘 될 거예요.\" 결과가 나쁘면 이 문장은 내 책임이 된다. 일주일 동안 알림이 무서웠다." }] },
  ];
}
function pickEvent(s, r) {
  const T = s.tarot, L = evList(s).filter((e) => { try { return e.ok(); } catch (x) { return false; } });
  const fresh = L.filter((e) => !T.seen.includes(e.id));
  // 꼭 그때 나와야 하는 것: 첫 달 덱, 12월, 2월, 첫 결제
  const must = fresh.find((e) => ["e01", "e02", "e05", "e15", "e04"].includes(e.id));
  let e = must || null;
  if (!e && fresh.length && s.t - T.evT >= 1 && r.chance(0.3)) {
    const ord = { early: 0, mid: 1, crisis: 1, late: 2 }, lo = Math.min(...fresh.map((x) => ord[x.ph]));
    e = r.pick(fresh.filter((x) => ord[x.ph] <= lo + 1)); // 초반 이야기부터, 한 단계 뒤 것까지 섞어서
  }
  if (!e && !fresh.length && r.chance(0.05)) { const rp = L.filter((x) => x.rep); if (rp.length) e = r.pick(rp); }
  if (!e) return null;
  if (!T.seen.includes(e.id)) T.seen.push(e.id);
  T.evT = s.t; s._trEv = { id: e.id };
  return { kind: "event", tag: "타로", title: e.t, text: e.x, ...(e.on ? { onChoose: "tr_ev" } : {}), ...(["e05", "e15"].includes(e.id) ? { now: true } : {}), choices: e.c }; // now: 글에 달이 박힌 장면(12월 31일 밤·2월의 정적)은 다음 달로 미루지 않는다(11-25. 미뤄져서 6월에 '2월의 정적'이 뜨던 것)
}

// ───────── 문의 만들기(달 시작) ─────────
function makeLeads(s, r) {
  const T = s.tarot;
  if (T.lv < 2) { T.queue = 0; T.leads = 0; T.repeatLeads = 0; return; }
  const seas = SEASON[(s.cal || 1) - 1];
  if (T.lv === 2) { // 무료 리딩 신청 DM
    T.leads = Math.round(clamp(3 + T.follow / 120, 3, 12) * (0.85 + 0.3 * r.range(0, 1)));
    T.queue = T.leads; T.repeatLeads = 0; T.wait = 0; return;
  }
  const base = [0, 0, 7, 11, 16][T.lv - 1] + T.follow / 300 + Math.min(14, T.reviews * 0.12);
  const rep = T.regulars * 0.7 * (UND.at(s, "tarot", UND.TH.전문) ? TR_UND.rep : 1); // 11-28 이해도 전문: 단골이 조금 더 자주 다시 찾는다
  const mult = seas * priceDemand(s, T) * (0.7 + T.rep / 100 * 0.6) * (T.niche ? NICHES[T.niche].lead : 1) * (SYN.on(s, "tr_insta") ? 1.12 : 1)
    * mod(s, "trLead", 1) * (T.seen.includes("e12") ? (T.empathy ? 1.03 : T.bot ? 0.95 : 0.92) : 1) * (T.room === "lease" ? 1.15 : 1) * (T.boundary ? 0.92 : 1) * (s.era?.winter ? 0.95 : 1) * SJ.ramp(s, "tarot") * SJ.skillRamp(s, "tarot") * (1 + (T.buzzH || 0) / 100) * (TR_F30.style[T.style ?? 1]?.lead || 1) * (pkOn(s) ? TR_F30.peak.lead * (s.cal === 11 && T.pk.k === 2 ? TR_F30.peak.suneung : 1) : 1); // 유료 첫 달부터 초반 고생 · v4.25b 배우는 기간
  const cap = LEAD_CAP[T.lv - 1] * (T.brand ? 1.4 : 1) * (s.fullJob === "tarot" ? 1.25 : 1);
  const raw = (base + rep) * mult;
  const lead = cap * (1 - Math.exp(-raw / cap)) * (1 + 0.1 * r.normal());
  T.leads = Math.max(0, Math.round(lead));
  T.repeatLeads = Math.min(T.leads, Math.round(rep * mult * (T.leads / Math.max(1, raw))));
  T.rebuy = T.leads ? Math.round(T.repeatLeads / T.leads * 100) : 0;
  T.queue = Math.round(T.wait + T.leads); T.wait = 0;
}

// ───────── 행동 ─────────
function doRead(s, r, boost) {
  const T = s.tarot, pi = SYN.pi(s), cap = capPerRead(s, boost);
  let n, lines = [];
  if (T.lv < 3) { // 무료 리딩(지인·선착순)
    n = T.lv === 1 ? Math.min(3, cap) : Math.min(T.queue, cap);
    if (T.lv >= 2) T.queue -= n;
    T.free += n; T.reads += n; T.reviews += n * (T.lv === 1 ? 0.55 : 0.8) * (boost > 1.1 ? 1.15 : 1);
    T.rep = clamp(T.rep + n * 0.15 * (boost - 0.8), 0, 100);
    lines.push(`무료 리딩 ${n}건`, `후기 ${Math.floor(T.reviews)}개`);
  } else {
    n = Math.min(T.queue, cap); T.queue -= n;
    const unit = unitPrice(s), tail = T.tail ? n * 0.3 * 0.55 * pi : 0; // 꼬리 질문: 절반 넘게 붙는다
    const tip = boost >= 1.25 ? Math.round(n * unit * 0.08) : 0;
    const rev = Math.round(n * unit + tail + tip), fee = Math.round((n * unit + tail) * feeRate(T));
    s.cash += rev - fee; addMoney(s, "inc", "타로 상담료", rev); if (fee) addMoney(s, "exp", "타로 수수료", fee);
    T.paid += n; T.reads += n; T.gross += rev; T.reviews += n * 0.2 * (boost > 1.1 ? 1.2 : 1);
    T.rep = clamp(T.rep + n * 0.1 * (boost - 0.9), 0, 100);
    const p = clamp(0.03 + T.rep / 1500 + Math.max(0, boost - 1) * 0.08, 0.02, 0.15) * (UND.at(s, "tarot", UND.TH.전문) ? TR_UND.reg : 1); // 11-28 이해도 전문: 단골 전환 +10%
    let nr = 0; for (let i = 0; i < n; i++) if (r.chance(p)) nr++; T.regulars += nr;
    lines.push(`리딩 ${n}건 +${won(rev)}`, ...(fee ? [`재능마켓 수수료 −${won(fee)}`] : []), ...(tip ? ["팁·후기 보너스"] : []), ...(nr ? [`단골 +${nr}`] : []));
  }
  const dr = Math.min(4, r1(n * drainPer(s)));
  s.mental = clamp(s.mental - dr, 0, 100); if (dr) lines.push(`멘탈 −${dr}`);
  T.served += n; gainStat(s, "talk", 0.3);
  const msg = T.lv < 3 ? r.pick(["친구가 카드를 보다가 갑자기 울었다. 카드는 핑계였다.", "\"너 이거 진짜 잘 맞는다?\" 연습이 칭찬으로 돌아왔다.", "3장 펼치기. 과거·현재·미래. 손님 표정이 먼저 답을 말했다."])
    : callsOn(T) ? r.pick(["통화 30분. 카드는 세 장, 질문은 열 개.", "\"그 사람 마음이요?\" 카드보다 손님 목소리를 먼저 들었다.", "밤 11시 통화. 끝나고 물 한 잔 마시고 멍하니 앉아 있었다."])
    : r.pick([s.co?.quit || s.co?.fired ? "저녁 지하철에서 텍스트 리딩 세 건. 카드 사진 찍고 답장." : "퇴근 지하철에서 텍스트 리딩 세 건. 카드 사진 찍고 답장.", "같은 '연인' 카드도 사람마다 다르게 읽힌다.", "\"이직할까요?\" 내가 매일 하던 질문이었다."]);
  return { lines, msg, n };
}

// ───────── f30 특이 요소 장면: 매일 찾아오는 단골 · 적중 기록부(말투) · 수능·신년 운세 대목 ─────────
function heavyScene(s) {
  const T = s.tarot, hv1 = (T.hvT ?? -99) < 0, H = TR_F30.heavy, rv = Math.round(H.pay * Math.max(0.5, unitPrice(s))); T.hvT = s.t; s._trF30 = { k: "ask" };
  return { kind: "event", tag: "타로", title: "매일 찾아오는 손님", onChoose: "tr_heavy", ...(hv1 ? { cine: "tr_heavy" } : {}), // 화보는 처음 한 번만
    text: `석 달째 하루에도 세 번씩 묻는 손님이 있다. 아침엔 "오늘 연락 올까요?", 점심엔 "지금은요?", 밤엔 "내일은요?" 이 손님만으로 한 달 ${won(rv)}. 그런데 답할수록 손님은 더 불안해진다.`,
    choices: [{ t: "하루 한 번, 주 3번까지로 선을 긋는다", eff: {}, text: "\"자주 보면 카드도 흐려져요.\" 손님은 잠시 서운해했다." },
      { t: "원하는 만큼 계속 받는다 (매달 돈 +, 멘탈이 점점 닳는다)", eff: {}, text: "알림이 울릴 때마다 카드를 섞었다." },
      { t: "상담센터를 권하고 리딩을 끊는다", eff: {}, text: "\"카드보다 이야기 들어 줄 사람이 필요해 보여요.\" 긴 침묵 뒤에 고맙다는 답이 왔다." }] };
}
function heavyFamScene(s) {
  const T = s.tarot, back = Math.round((T.hv?.sum || 0) / Math.max(1, T.hv?.m || 1)); s._trF30 = { k: "fam", back };
  return { kind: "event", tag: "타로", title: "손님 언니의 DM", onChoose: "tr_heavy",
    text: `모르는 계정에서 DM이 왔다. "동생이 월급 절반을 타로에 써요. 밤마다 선생님 답만 기다려요. 이게 상담이에요?" ${T.hv?.m || 0}달째 매일 오던 그 손님이다.`,
    choices: [{ t: `이번 달 리딩비를 돌려주고 끊는다 (−${won(back)})`, eff: {}, text: "환불하고 상담센터 번호를 보냈다. 마음 한쪽이 가벼워졌다." },
      { t: "성인이 선택한 일이라며 계속 받는다", eff: {}, text: "답장은 없었다. 대신 며칠 뒤 '의존 장사'라는 글이 돌았다." }] };
}
function styleScene(s) {
  const T = s.tarot; T.styleSeen = true;
  return { kind: "event", tag: "타로", title: "그래서 붙어요, 안 붙어요?", onChoose: "tr_style",
    text: `최종 면접을 본 손님이 카드를 보다 말고 묻는다. "흐름 말고요, 붙어요 안 붙어요?" 맞힌 리딩과 빗나간 리딩이 적중 기록부에 쌓인다. 지금까지 맞힘 ${T.hitN} · 빗나감 ${T.missN}.`,
    choices: [{ t: "가능성과 조건으로 말한다 (균형)", eff: {}, text: "\"면접에서 이 부분이 걸렸다면 확률은 반반이에요.\"" },
      { t: "\"붙습니다.\" 단정적으로 (맞히면 입소문, 빗나가면 악평)", eff: {}, text: "손님 눈이 반짝였다. 이제 결과만 남았다." },
      { t: "\"카드는 흐름만 보여 줘요.\" 애매하게 (안전, 재방문 ↓)", eff: {}, text: "손님은 고개를 끄덕였지만 뭔가 아쉬운 얼굴이었다." }] };
}
function peakScene(s) {
  const T = s.tarot, P = TR_F30.peak, c = Math.round(P.cost * SYN.pi(s)); T.pkAsk = s.t; s._trF30 = { cost: c };
  return { kind: "event", tag: "타로", title: "대목 준비", onChoose: "tr_peak",
    text: `달력을 넘겼다. 11월 수능, 12월·1월 신년운세. ${T.months >= 12 ? "작년엔 문의가 두 배로 몰려 절반을 놓쳤다." : "선배 리더들 말로는 이때 문의가 두 배로 몰려 절반은 놓친다고 한다."} 지금 '신년 운세 패키지'(정해진 스프레드·리포트 양식)를 만들어 두면 한 번에 더 많이, 더 비싸게 읽을 수 있다.`,
    choices: [{ t: "평소대로 그때그때 받는다", eff: {}, text: "준비는 없다. 몸으로 버티기로." },
      { t: `신년 운세 패키지를 만든다 (−${won(c)}, 다음 달 행동력 −${P.ap[0]})`, eff: {}, text: "'2년 치 흐름 12장 리포트' 양식이 완성됐다." },
      { t: `수능 응원 리딩까지 같이 (−${won(c * 2)}, 다음 달 행동력 −${P.ap[1]})`, eff: {}, text: "수험생 부모용 '시험 운 3장 리딩'도 만들었다. 11월이 기다려진다." }] };
}
function f30Event(s, r) {
  const T = s.tarot, H = TR_F30.heavy;
  if (T.hv && r.chance(H.famP + H.famUp * T.hv.m)) return heavyFamScene(s);
  if (T.lv >= 3 && s.cal === 10 && s.t - (T.pkAsk ?? -99) > 6) return peakScene(s);
  if (T.lv >= 3 && !T.styleSeen && T.paid >= 20) return styleScene(s);
  if (T.lv >= 3 && !T.hv && T.regulars >= H.reg && s.t - (T.hvT ?? -99) >= H.gap && r.chance(H.p)) return heavyScene(s);
  return null;
}
const F30_CHOOSE = {
  tr_heavy(s, r, i) {
    const T = s.tarot, H = TR_F30.heavy, o = s._trF30 || {}; s._trF30 = null;
    const rep = (v) => { T.rep = clamp(T.rep + v, 0, 100); return `타로 평판 ${v > 0 ? "+" : ""}${v}`; };
    if (o.k === "fam") {
      if (i === 0) { const b = o.back || 0; s.cash -= b; addMoney(s, "exp", "타로 비용", b); T.hv = null; return [`환불 −${won(b)}`, rep(2), "매일 오던 손님과 끝"]; }
      return [rep(-H.famRep), "계속 받는 중"];
    }
    if (i === 1) { T.hv = { m: 0, sum: 0 }; return ["매일 오는 손님: 매달 수입 +, 멘탈 −(점점 커져요)"]; }
    if (i === 2) { T.regulars = Math.max(0, T.regulars - 1); s.mental = clamp(s.mental + H.refMent, 0, 100); return [rep(H.refRep), `멘탈 +${H.refMent}`, "단골 −1"]; }
    return [rep(H.cutRep)];
  },
  tr_style(s, r, i) { const T = s.tarot; T.style = [1, 2, 0][i] ?? 1; return [`리딩 말투: ${TR_F30.style[T.style].n}`]; },
  tr_peak(s, r, i) {
    const T = s.tarot, P = TR_F30.peak, o = s._trF30 || {}; s._trF30 = null;
    if (!i) { T.pk = null; return []; }
    const c = (o.cost || P.cost) * i; s.cash -= c; addMoney(s, "exp", "타로 비용", c); s.apNext -= P.ap[i - 1]; T.pk = { k: i, t: s.t };
    return [`패키지 제작비 −${won(c)}`, `다음 달 행동력 −${P.ap[i - 1]}`, `11~1월: 한 번에 ×${P.cap} · 단가 ×${P.unit}${i === 2 ? " · 11월 수능 문의 ↑" : ""}`];
  },
};
export function setStyle(s, k) { const T = s.tarot; if (!TR_F30.style[k]) return { ok: false }; T.style = +k; T.styleSeen = true; return { ok: true, msg: `리딩 말투: ${TR_F30.style[k].n}` }; }
export function cutHeavy(s) { const T = s.tarot; if (!T.hv) return { ok: false }; T.hv = null; T.rep = clamp(T.rep + 1, 0, 100); return { ok: true, msg: "매일 오던 손님에게 선을 그었다(평판 +1)" }; }
// 시험(#autoN-tarot-f30heavy|f30fam|f30style|f30peak)
export function f30Test(s, r, what) {
  const T = s.tarot; Object.assign(T, { lv: Math.max(T.lv, 3), regulars: Math.max(T.regulars, 4), paid: Math.max(T.paid, 25), rep: Math.max(T.rep, 45) });
  if (what === "heavy") return heavyScene(s);
  if (what === "fam") { T.hv = { m: 5, sum: 5 * 12 }; return heavyFamScene(s); }
  if (what === "style") return styleScene(s);
  if (what === "peak") return peakScene(s);
  return null;
}

export default {
  key: "tarot", prefix: "tr_", hubName: "타로",
  init: () => DEF(),
  actions: {
    tr_read: { n: "리딩 상담", ap: 1, hp: 3, desc: "문의를 읽어 준다. 돈·후기·단골 +, 멘탈 −" },
    tr_practice: { n: "연습 노트", ap: 1, hp: 2, desc: "한 장 뽑고 해석 기록. 해석력·평판 +", stat: { sense: 0.4 } },
    tr_card: { n: "오늘의 카드 올리기", ap: 1, hp: 2, desc: "카드 이미지 + 문장 한 줄. 팔로워 +(같은 달 반복은 덜 오름)", stat: { sense: 0.3, write: 0.2 } },
    tr_booth: { n: "플리마켓·카페 부스", ap: 2, hp: 7, mental: -3, desc: "주말 대면 30분 4만. 장소 수수료 20%. 단골·팔로워 +", stat: { charm: 0.4 } },
    tr_kit: { n: "리딩 키트 만들기", ap: 1, hp: 3, desc: "질문·해석법을 묶어 디지털 키트로. 다 만들면 자는 동안 팔린다", stat: { write: 0.4 } },
    tr_agent: { n: "후배 리더에게 위탁/해지", ap: 0, hp: 0, desc: "문의 70%를 대신 읽고 수익 40%를 가져가요(투잡 칸 +1)" },
  },
  mg: { tr_read: "talk" },
  money: STREAMS,
  can(s, id) {
    const T = s.tarot;
    if (id === "tr_read") { if (T.agent) return "위탁 중엔 후배가 읽어요"; if (T.lv === 1 && T.notes < 5) return "연습 노트 5건부터"; if (T.lv >= 2 && T.queue <= 0) return "대기 문의가 없어요(오늘의 카드로 모아요)"; return null; }
    if (id === "tr_card") return T.lv < 2 ? "Lv2부터(연습 노트 20건)" : null;
    if (id === "tr_booth") { if (T.lv < 3) return "Lv3부터(유료 리딩을 시작해야)"; if (T.boothT === s.t) return "이번 달 부스는 이미 했어요"; return null; }
    if (id === "tr_kit") { if (T.lv < 4) return "Lv4부터"; if (T.kits >= (T.brand ? 5 : 3)) return `키트는 ${T.brand ? 5 : 3}개까지`; return null; }
    if (id === "tr_agent") { if (T.agent) return SJ.slotLock(s, () => { T.agent = false; return () => { T.agent = true; }; }); return T.lv < 4 ? "Lv4부터(믿을 만한 후배가 생겨야)" : null; }
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const T = s.tarot, pi = SYN.pi(s), up = [];
    if (id === "tr_read") { const o = doRead(s, r, boost); checkLv(s, up); return { lines: [...o.lines, ...up], msg: o.msg }; }
    if (id === "tr_practice") {
      const g = Math.max(1, Math.round((4 + (s.st.sense || 0) / 20) * (SYN.on(s, "tr_class") ? 1.5 : 1) / (1 + T.practN * 0.4))); T.practN++;
      T.notes += g; if (T.lv >= 3) T.rep = clamp(T.rep + 0.8 / T.practN, 0, 100); gainStat(s, "talk", 0.2);
      checkLv(s, up);
      return { lines: [`연습 노트 +${g}건 (${T.notes}건)`, ...(T.lv >= 3 ? ["해석 깊이 +"] : []), ...up], msg: r.pick(["오늘의 한 장: 은둔자. '혼자 있는 시간이 답을 준다.'", "역방향 컵 3. 친구들과의 약속이 깨지는 날? 실제로 깨졌다.", "카드 일기 한 페이지. 같은 카드가 어제와 다르게 보였다.", "펜타클 에이스. 월급날이었다. 우연이겠지."]) };
    }
    if (id === "tr_card") {
      const g = Math.round((90 + (s.st.sense || 0) * 2.5 + (s.st.write || 0)) * (T.series ? 1.25 : 1) * (SYN.on(s, "tr_insta") ? 1.3 : 1) * Math.max(0.05, 1 - T.follow / 16000) / (1 + T.cardN * 0.6) * boost * (0.8 + 0.4 * r.range(0, 1)));
      T.cardN++; T.follow = Math.max(0, T.follow + g);
      checkLv(s, up);
      return { lines: [`팔로워 +${g} (${Math.round(T.follow).toLocaleString()})`, ...up], msg: r.pick(["\"이 카드를 뽑은 당신, 오늘은 한 걸음 물러서야 합니다.\"", "출근 전 7시 업로드. 별 조명 아래 카드 한 장.", "'월요일 아침의 소드 8' 저장 수가 유독 높다. 다들 갇혀 있구나."]) };
    }
    if (id === "tr_booth") {
      T.boothT = s.t;
      const seas = Math.sqrt(SEASON[(s.cal || 1) - 1]), slots = clamp(Math.round((5 + (s.st.charm || 0) / 15 + T.rep / 20) * seas * (T.brand ? 1.3 : 1) * (SYN.on(s, "tr_pr") ? 1.2 : 1)) + r.int(-1, 1), 3, 20);
      const price = (T.brand ? 5 : 4) * pi, gross = Math.round(slots * price);
      const feeR = SYN.on(s, "tr_pr") || T.room === "lease" ? 0 : T.partner ? 0.15 : 0.2, fee = Math.round(gross * feeR), cost = fee + Math.round(3 * pi);
      s.cash += gross - cost; addMoney(s, "inc", "타로 부스", gross); addMoney(s, "exp", "타로 비용", cost);
      const nr = Math.round(slots * 0.12 + (r.chance(0.5) ? 1 : 0)); T.regulars += nr; T.follow += slots * 12; T.reviews += slots * 0.3; T.reads += slots; T.gross += gross;
      T.rep = clamp(T.rep + 1, 0, 100);
      checkLv(s, up);
      const nm = T.brand ? "'타로의 밤' 워크숍" : SYN.on(s, "tr_pr") ? "내 파티룸 '타로의 밤'" : T.partner ? "북카페 부스" : "플리마켓 부스";
      return { lines: [`${nm} ${slots}명 +${won(gross)}`, fee ? `장소 수수료 −${won(fee)}` : "장소 수수료 0", `단골 +${nr}`, ...up], msg: r.pick(["줄이 생겼다. 동행자가 \"저도 볼래요\" 하고 앉았다.", "보라색 천, 촛불 조명, 카드 78장. 사진 찍는 사람이 더 많았다.", "8시간 앉아 있었더니 허리가 끊어질 것 같다. 그래도 얼굴 보고 하는 상담은 다르다."]) };
    }
    if (id === "tr_kit") {
      const g = Math.round((28 + (s.st.write || 0) / 3) * boost); T.kitProg += g;
      if (T.kitProg >= 100) { T.kitProg = 0; T.kits++; T.kitAge.push(0); checkLv(s, up); return { lines: [`리딩 키트 ${T.kits}호 출시!`, `${T.brand ? "굿즈 포함 " : ""}1개 ${T.brand ? "2.5" : "1.9"}만, 다음 달부터 팔려요`, ...up], msg: r.pick(["'이직 앞둔 당신을 위한 3장 스프레드' 노숀 키트 완성.", "PDF 32쪽. 내 연습 노트가 상품이 됐다."]) }; }
      return { lines: [`키트 작업 ${T.kitProg}%`], msg: "자주 받는 질문 30개를 정리 중. 답이 늘 비슷하다는 게 신기하다." };
    }
    if (id === "tr_agent") {
      T.agent = !T.agent;
      return { lines: [T.agent ? "위탁 계약: 문의 70%를 후배 리더가, 수익 40%를 가져가요" : "위탁 해지"], msg: T.agent ? "\"선생님 스타일대로 읽을게요. 어려운 손님은 넘길게요.\"" : "다시 내 목소리로 읽는다." };
    }
    return null;
  },
  monthStart(s, r) { const T = s.tarot; T.cardN = 0; T.practN = 0; T.served = 0; T.gross = 0; makeLeads(s, r); },
  onStart(s) {
    const T = s.tarot; if (T.started < 0) { T.started = s.t; const c = Math.round(3 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "타로 비용", c); }
    T.bSeen = s.burnouts || 0; T.queue = Math.max(T.queue, T.lv >= 2 ? 3 : 0);
  },
  onStop(s) {
    const T = s.tarot; T.agent = false;
    if (T.room === "lease") { const b = Math.round(500 * SYN.pi(s)); s.cash += b; addMoney(s, "inc", "타로 상담실 보증금", b); T.room = "none"; }
  },
  stopWhy: (s) => (s.tarot.agent ? "위탁을 먼저 해지하세요" : null),
  month(s, r, notes, scenes) {
    const T = s.tarot, pi = SYN.pi(s), M = s.month;
    T.months++;
    // 위탁: 후배가 남은 문의의 70%를 읽는다
    if (T.agent && T.lv >= 3 && T.queue > 0) {
      const n = Math.round(T.queue * 0.7), rev = Math.round(n * unitPrice(s) * 0.85), cut = Math.round(rev * 0.4), fee = Math.round(rev * feeRate(T));
      s.cash += rev - cut - fee; addMoney(s, "inc", "타로 상담료", rev); addMoney(s, "exp", "타로 수수료", cut + fee);
      T.queue -= n; T.paid += n; T.served += n; T.gross += rev;
      notes.push(`타로 위탁: 후배가 ${n}건 읽음(수익 40%${cut + fee >= 0.5 ? `·수수료 −${won(cut + fee)}` : ""})`);
    }
    // 남은 문의: 일부는 예약 대기로, 나머지는 떠난다
    if (T.lv >= 3) {
      const left = Math.max(0, T.queue), wait = Math.min(Math.round(left * 0.4), 6 + Math.round(T.regulars * 0.3)), lost = left - wait;
      T.wait = wait; T.queue = 0;
      // 평판은 '얼마나 제때·잘 읽어 줬나'를 향해 천천히 움직인다
      const ratio = T.served / Math.max(1, T.served + lost);
      const target = 30 + Math.min(25, (s.st.talk || 0) / 4) + ratio * 30 + (T.boundary ? 3 : 0) - (T.tail ? 5 : 0) + (T.empathy ? 5 : 0) - (T.bot ? 3 : 0) - (T.agent ? 6 : 0);
      T.rep = clamp(T.rep + (target - T.rep) * 0.2, 0, 100);
      if (lost >= 5) notes.push(`타로 문의 ${lost}건이 기다리다 떠났다(평판 −)`);
      T.waitM = T.wait >= 5 && T.rep >= 50 ? T.waitM + 1 : 0;
    } else { T.queue = 0; T.wait = 0; }
    // 단골 이탈
    T.regulars = Math.max(0, T.regulars - (T.regulars > 0 && r.chance(Math.min(1, T.regulars * 0.08 * (TR_F30.style[T.style ?? 1]?.churn || 1))) ? Math.max(1, Math.round(T.regulars * 0.08)) : 0));
    // 구독
    if (T.subOn && T.lv >= 3) {
      const capS = 1 + T.lv + (T.brand ? 10 : 0);
      if (T.regulars > 0) T.subs += (r.chance(clamp(T.regulars * 0.04 + (T.niche ? 0.1 : 0), 0, 0.9)) ? 1 : 0) + (T.regulars >= 12 && r.chance(0.4) ? 1 : 0);
      T.subs = Math.min(capS, T.subs); if (T.subs > 0 && r.chance(0.25)) T.subs--;
      if (T.subs > 0) { const rv = Math.round(T.subs * 3.5 * pi); s.cash += rv; addMoney(s, "inc", "타로 구독", rv); s.mental = clamp(s.mental - Math.min(4, T.subs * 0.25), 0, 100); T.gross += rv; }
    }
    // f30 매일 찾아오는 단골
    if (T.hv) {
      const H = TR_F30.heavy, rv = Math.round(H.pay * Math.max(0.5, unitPrice(s))), dm = Math.min(H.drainMax, Math.round((H.drain + H.drainUp * T.hv.m) * 10) / 10);
      s.cash += rv; addMoney(s, "inc", "타로 상담료", rv); T.gross += rv; s.mental = clamp(s.mental - dm, 0, 100); T.hv.m++; T.hv.sum = (T.hv.sum || 0) + rv;
      notes.push(`타로: 매일 오는 손님 ${T.hv.m}달째 +${won(rv)} · 멘탈 −${dm}`);
    }
    // f30 적중 기록부
    if (T.lv >= 3 && T.served > 0) {
      const Hc = TR_F30.hit, St = TR_F30.style[T.style ?? 1], n = Math.round(T.served * Hc.share);
      const p = clamp(Hc.base + (s.st.sense || 0) * Hc.perSense + (T.rep - 50) * Hc.perRep, Hc.lo, Hc.hi);
      let h = 0, m = 0; for (let i = 0; i < n; i++) if (r.chance(p)) h++; else m++;
      T.hitN += h; T.missN += m;
      T.buzzH = clamp((T.buzzH || 0) * Hc.decay + h * Hc.buzzPer * St.buzz, 0, Hc.buzzMax); T.follow += Math.round(h * Hc.follow * St.buzz);
      if (m) T.rep = clamp(T.rep - m * Hc.missRep * St.miss, 0, 100);
      if (h + m) notes.push(`타로 적중 기록: 맞힘 ${h} · 빗나감 ${m}${T.style === 2 && h >= 2 ? " · '그날 연락 온다' 캡처가 돌았다" : T.style === 2 && m >= 2 ? " · 빗나간 리딩 악평" : ""}`);
    } else T.buzzH = (T.buzzH || 0) * TR_F30.hit.decay;
    // 키트·굿즈(자동 판매)
    let kitRev = 0;
    if (T.kits) {
      const each = T.kitAge.map((a) => Math.min(25, (2.5 + T.follow / 2000) * Math.max(0.45, 1 - a * 0.03) * (0.85 + 0.3 * r.range(0, 1))));
      const sold = Math.round(each.reduce((a, b) => a + b, 0)); kitRev = Math.round(sold * (T.brand ? 2.5 : 1.9) * pi);
      T.kitAge = T.kitAge.map((a) => a + 1);
    }
    if (T.bot) kitRev += Math.round(6 * pi);
    if (kitRev) { const f = Math.round(kitRev * 0.1); s.cash += kitRev - f; addMoney(s, "inc", "타로 키트·굿즈", kitRev); addMoney(s, "exp", "타로 수수료", f); T.gross += kitRev; }
    // 고정비
    const fix = Math.round(1 * pi) + (T.room === "hourly" ? Math.round(12 * pi) : 0);
    s.cash -= fix; addMoney(s, "exp", "타로 비용", fix);
    if (T.room === "lease") { const rent = Math.round(55 * pi); s.cash -= rent; addMoney(s, "exp", "타로 상담실", rent); if (T.served < 20) notes.push(`상담실 예약률 미달(${T.served}건): 월세만 ${won(rent)} 나갔다`); }
    if (SYN.on(s, "tr_late")) s.hp = clamp(s.hp - 3, 0, s.hpMax);
    // 집계
    const sum = (o, ks) => ks.reduce((a, k) => a + (o[k] || 0), 0);
    const inc = sum(M.inc, STREAMS.inc), exp = sum(M.exp, STREAMS.exp), profit = inc - exp;
    const readRev = (M.inc["타로 상담료"] || 0) + (M.inc["타로 부스"] || 0) + (M.inc["타로 구독"] || 0);
    T.peak = Math.max(T.peak * 0.97, inc); // 최근 최고 매출(서서히 잊힌다)
    T.last = { leads: T.leads, served: T.served, inc, exp, profit, kit: kitRev, subs: T.subs, wait: T.wait };
    T.hist.push(Math.round(profit)); if (T.hist.length > 24) T.hist.shift();
    T.kh.push(kitRev); T.rh.push(readRev); if (T.kh.length > 12) T.kh.shift(); if (T.rh.length > 12) T.rh.shift();
    T.goodM = inc >= 200 * pi && T.rebuy >= 30 ? T.goodM + 1 : 0;
    // 번아웃(멘탈 0) 기록: 타로 하는 동안 생긴 것만
    const b = s.burnouts || 0; if (b > T.bSeen) { T.witch += b - T.bSeen; T.bSeen = b; }
    checkLv(s, notes);
    UND.fxNote(s, "tarot", T, notes, UND_NOTE); // 11-28 이해도 문턱을 넘은 달에 한 줄(스위치가 꺼져 있으면 아무 일도 안 한다)
    // 시즌 안내
    if (s.cal === 11 && T.lv >= 3) notes.push("타로: 다음 달부터 신년운세 시즌. 문의가 두 배 가까이 몰려요");
    const ev = f30Event(s, r) || (T.lv >= 1 ? pickEvent(s, r) : null); if (ev) scenes.push(ev);
    return profit;
  },
  value: (s) => (s.tarot?.room === "lease" ? Math.round(500 * SYN.pi(s)) : 0) + 3,
  passive(s) {
    const T = s.tarot; if (!T?.last) return 0;
    const auto = T.last.kit || 0;
    if (!T.agent) return Math.max(0, auto);
    const h = T.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0;
  },
  slot: (s) => !!s.tarot?.agent,
  todos(s) {
    const T = s.tarot, t = [];
    if (T.lv === 1 && T.notes < 20) t.push({ lv: 0, text: `타로 연습 노트 ${T.notes}/20` });
    if (!T.agent && T.lv >= 2 && T.queue > 0) t.push({ lv: T.queue >= 10 ? 2 : 1, text: `타로 문의 대기 ${T.queue}건(이번 달 안 읽으면 떠나요)` });
    if (T.hv && s.mental < 45) t.push({ lv: 1, text: `매일 오는 손님 ${T.hv.m}달째: 선을 그을 때?` });
    if (pkOn(s)) t.push({ lv: 0, text: "신년 운세 패키지 판매 중(한 번에 더 많이 읽어요)" });
    if (s.mental < 30 && T.lv >= 3) t.push({ lv: 2, text: `멘탈 ${Math.round(s.mental)}: 리딩을 줄이고 쉬어요(감정 소진)` });
    if (T.kitProg > 0) t.push({ lv: 0, text: `리딩 키트 작업 ${T.kitProg}%` });
    return t;
  },
  eff(s, e, out) {
    const T = s.tarot, pi = SYN.pi(s);
    const money = (k, nm, v) => { if (!v) return; s.cash += v; addMoney(s, v > 0 ? "inc" : "exp", nm, Math.abs(v)); out.push(`${k} ${v > 0 ? "+" : "−"}${won(Math.abs(v))}`); if (v > 0) T.gross += v; };
    if (e.tr_cash) money("타로 수입", "타로 상담료", e.tr_cash);
    if (e.tr_booth) money("부스 수입", "타로 부스", e.tr_booth);
    if (e.tr_kit) money("키트 수입", "타로 키트·굿즈", e.tr_kit);
    if (e.tr_cost) { s.cash -= e.tr_cost; addMoney(s, "exp", "타로 비용", e.tr_cost); out.push(`타로 비용 −${won(e.tr_cost)}`); }
    if (e.tr_rep) { T.rep = clamp(T.rep + e.tr_rep, 0, 100); out.push(`타로 평판 ${e.tr_rep > 0 ? "+" : ""}${e.tr_rep}`); }
    if (e.tr_rev) { T.reviews += e.tr_rev; out.push(`타로 후기 +${e.tr_rev}`); }
    if (e.tr_free) { T.free += e.tr_free; T.reads += e.tr_free; out.push(`무료 리딩 +${e.tr_free}`); }
    if (e.tr_notes) { T.notes += e.tr_notes; out.push(`연습 노트 +${e.tr_notes}`); }
    if (e.tr_follow) { T.follow = Math.max(0, T.follow + e.tr_follow); out.push(`팔로워 ${e.tr_follow > 0 ? "+" : ""}${e.tr_follow}`); }
    if (e.tr_reg) { T.regulars = Math.max(0, T.regulars + e.tr_reg); out.push(`단골 ${e.tr_reg > 0 ? "+" : ""}${e.tr_reg}`); }
    if (e.tr_q) { if (T.lv >= 3) T.wait += e.tr_q; else T.queue += e.tr_q; out.push(`대기 문의 +${e.tr_q}`); }
  },
  choose: {
    ...F30_CHOOSE,
    tr_ev(s, r, i, ok) {
      const T = s.tarot, ev = s._trEv?.id, pi = SYN.pi(s); s._trEv = null;
      if (ev === "e03" && i === 0) T.series = true;
      if (ev === "e06" && i === 0) { T.tail = true; return ["꼬리 질문 옵션 켜짐(리딩당 수입 +)"]; }
      if (ev === "e07" && i === 0) { T.subOn = true; T.subs = Math.max(1, T.subs); return [`월 구독 리딩 시작(1명 월 ${Math.round(3.5 * pi * 10) / 10}만)`]; }
      if (ev === "e08" && i === 0) { T.niche = "career"; return ["전문 분야: 퇴사·이직(단가 +25%, 문의 −10%)"]; }
      if (ev === "e09" && i === 0) { T.boundary = true; return ["상담 범위 안내문(멘탈 소모 −35%)"]; }
      if (ev === "e10" && i === 0) { T.partner = true; T.boothT = s.t; return ["북카페 협업: 부스 수수료 15%"]; }
      if (ev === "e11" && i === 0) { T.kitProg = Math.max(T.kitProg, 50); return ["다음 키트 50%"]; }
      if (ev === "e12") { if (i === 0) T.empathy = true; else T.bot = true; return [i === 0 ? "공감 상담: AI 앱 영향 없음" : "챗봇 상품: 월 6만 자동, 문의 −5%"]; }
      if (ev === "e16") {
        if (i === 0) { T.room = "hourly"; return ["시간제 공간 대여(월 12만, 단가 +10%)"]; }
        if (i === 1) { s.cash -= Math.round(800 * pi); addMoney(s, "exp", "타로 상담실", Math.round(300 * pi)); T.room = "lease"; return [`상담실 계약: 인테리어 ${won(Math.round(300 * pi))} + 보증금 ${won(Math.round(500 * pi))}`, `월세 ${won(Math.round(55 * pi))}`]; }
      }
      return [];
    },
  },
  migrate(s, T) { const d = DEF(); for (const k of Object.keys(d)) if (T[k] === undefined) T[k] = d[k]; if (!T.v) T.v = 1; },
  milestones: [
    { key: "tr_lv2", title: "노트 스무 장", test: (s) => s.tarot?.lv >= 2, lines: ["연습 노트 스무 장. 탑 카드 옆에 '다시 짓는다'고 적었다.", "이제 남의 카드를 펼칠 차례다. \"선착순 3명 무료 리딩.\""] },
    { key: "tr_lv3", title: "첫 손님의 후기", test: (s) => s.tarot?.lv >= 3, lines: ["\"처음 본 사람한테 이렇게 털어놓은 건 처음이에요.\"", "후기 열 개. 재능마켓에 '3장 리딩 1만 원'을 올렸다. 덱이 조금 무거워졌다."] },
    { key: "tr_paid", title: "5,000원의 무게", test: (s) => s.tarot?.paid >= 1, lines: ["알림: 결제 5,000원.", "커피 한 잔 값인데 손이 떨렸다. 누군가 내 말을 돈 내고 듣는다."] },
    { key: "tr_lv4", title: "단골이 생겼다", test: (s) => s.tarot?.lv >= 4, lines: ["매주 같은 시간에 같은 이름이 들어온다.", "\"선생님, 이번 주도요.\" 카드보다 그 사람 근황이 먼저 궁금하다."] },
    { key: "tr_lv5", title: "내 분야", test: (s) => s.tarot?.lv >= 5, lines: ["한 달 매출 100만. 프로필 첫 줄을 바꿨다.", "1,200명 중 한 명이 아니라, 이 고민엔 이 사람."] },
    { key: "tr_brand", title: "예약 대기", test: (s) => !!s.tarot?.brand, lines: ["예약 페이지에 '다음 가능일: 3주 뒤'가 떴다.", "팔로워 1만. 이제 카드가 아니라 내 이름을 보고 온다."] },
    { key: "tr_end_wait", end: true, kind: "good", epi: "타로 예약은 지금도 3주 뒤까지 차 있다. 카드보다 사람 얘기를 더 오래 듣는다.", title: "예약 대기 3주의 리더", test: (s) => { const T = s.tarot; if (!T) return false; if ((T.goodM || 0) >= 12) return true; const h = T.rh || []; return h.length >= 12 && h.reduce((a, b) => a + b, 0) / h.length >= 200 * (s.pi || 1) && (T.rebuy || 0) >= 30; }, /* 11-21: 연속 12달은 계절 탓에 거의 불가능 → 최근 12달 평균으로도 인정 */ lines: ["재구매율 30%, 월 매출 200만을 1년 동안 지켰다.", "카드를 뽑기 전에 다들 먼저 안부부터 묻는다."] },
    { key: "tr_end_goods", end: true, kind: "good", epi: "내가 그린 카드 덱이 팔린다. 리딩보다 택배 송장 뽑는 시간이 더 길다.", title: "카드 굿즈 브랜드", test: (s) => { const T = s.tarot; if (!T?.kh || T.kh.length < 12) return false; const k = T.kh.reduce((a, b) => a + b, 0), rd = T.rh.reduce((a, b) => a + b, 0); return k >= 150 && k > rd; }, lines: ["키트·굿즈 매출이 상담 매출을 넘었다.", "이제는 내가 만든 카드로 남들이 운을 점친다."] },
    { key: "tr_end_witch", end: true, kind: "bad", epi: "타로는 결국 내려놓았다. 남의 고민을 들어 주다 내 멘탈이 두 번 바닥났다.", title: "탈진한 마녀", test: (s) => (s.tarot?.witch || 0) >= 2, lines: ["멘탈 0. 두 번째다.", "남의 미래는 잘 보였는데, 내 내일은 보이지 않았다."] },
  ],
  perks: [
    { id: "p_tr_eye", n: "사람을 읽는 눈", line: "카드보다 표정이 먼저 보인다", pro: "타로 문의 +15%", m: { trLead: 1.15 }, got: "유료 리딩 1,000건 + 단골 60명", test: (s) => (s.tarot?.paid || 0) >= 1000 && (s.tarot?.regulars || 0) >= 60 },
    { id: "p_tr_calm", n: "선을 긋는 상담사", line: "들어 주되, 떠안지 않는다", pro: "리딩 멘탈 소모 −25%", m: { trDrain: 0.75 }, got: "리딩 1,500건 + 상담 범위 안내문 + 평판 79.5", test: (s) => (s.tarot?.reads || 0) >= 1500 && !!s.tarot?.boundary && (s.tarot?.rep || 0) >= 79.5 },
  ],
  perkCine: { p_tr_eye: "tr_lv4", p_tr_calm: "tr_brand" },
  synergy: [
    { id: "tr_insta", kind: "good", n: "인별 × 타로", need: "인별그램 + 타로", desc: "'오늘의 카드'가 최고의 유입 채널: 팔로워 증가 +30%, 타로 문의 +12%", test: (s) => act(s, "tarot") && act(s, "insta") },
    { id: "tr_pr", kind: "good", n: "파티룸 × 타로", need: "운영 중인 파티룸 + 타로", desc: "'타로의 밤'을 내 파티룸에서: 부스 장소 수수료 0, 손님 +20%", test: (s) => act(s, "tarot") && act(s, "pr") && (s.pr?.rooms || []).some((x) => x.status === "open") },
    { id: "tr_class", kind: "good", n: "타로 클래스 × 타로", need: "취미 타로 원데이 클래스 + 타로", desc: "같이 배우는 사람들과 해석 연습: 연습 노트 +50%", test: (s) => act(s, "tarot") && (s.hb?.joined || []).includes("tarot") },
    { id: "tr_late", kind: "bad", n: "자정의 통화 상담 × 회사", need: "타로 Lv4 이상 + 회사 다니는 중", desc: "밤 11시 통화가 자정을 넘긴다: 매달 스태미너 −3", test: (s) => act(s, "tarot") && (s.tarot?.lv || 0) >= 4 && company(s) },
  ],
  traits: [
    { trait: "insider", t: "타로 손님이 친구를 데려온다(문의 +8%)", m: { trLead: 1.08 } },
    { trait: "homebody", t: "혼자 하는 텍스트 리딩이 편하다(멘탈 소모 −15%)", m: { trDrain: 0.85 } },
  ],
  spots: { cafe: ["tr_practice"], market: ["tr_read"] },
};
// 화면에서 쓰는 조작
export function setPrice(s, v) { s.tarot.price = clamp(+v | 0, 0, priceList(s).length - 1); }
const UND_NOTE = [[600, "손님이 단골로 더 잘 남고, 단골이 더 자주 다시 찾아요."], [1000, "가격에 '심층 리딩'이 열렸어요(가격과 운영에서 골라요)."]];
export function setNiche(s, k) { const T = s.tarot; if (T.lv < 4) return { ok: false, msg: "전문 분야는 Lv4부터" }; if (!NICHES[k]) return { ok: false }; T.niche = k; return { ok: true, msg: `전문 분야: ${NICHES[k].n}` }; }
export function toggle(s, k) { const T = s.tarot; if (k === "tail") { if (T.lv < 4) return { ok: false, msg: "꼬리 질문은 Lv4부터" }; T.tail = !T.tail; return { ok: true, msg: T.tail ? "꼬리 질문 3,000원 켬" : "꼬리 질문 끔" }; } if (k === "boundary") { T.boundary = !T.boundary; return { ok: true, msg: T.boundary ? "상담 범위 안내문: 멘탈 소모 −35%, 문의 −8%" : "안내문 내림" }; } if (k === "sub") { if (T.lv < 4 && !T.subOn) return { ok: false, msg: "월 구독은 Lv4부터" }; T.subOn = !T.subOn; if (!T.subOn) T.subs = 0; return { ok: true, msg: T.subOn ? "월 구독 리딩 모집" : "구독 종료" }; } return { ok: false }; }
export function setRoom(s, k) {
  const T = s.tarot, pi = SYN.pi(s); if (!T.brand && T.lv < 5 && k !== "none") return { ok: false, msg: "상담실은 Lv5부터" };
  if (k === T.room) return { ok: false, msg: "이미 그렇게 하고 있어요" };
  const c = Math.round(800 * pi);
  if (k === "lease" && s.cash < c) return { ok: false, msg: `돈이 모자라요(${won(c)})` };
  if (T.room === "lease") { const b = Math.round(500 * pi); s.cash += b; addMoney(s, "inc", "타로 상담실 보증금", b); }
  if (k === "lease") { s.cash -= c; addMoney(s, "exp", "타로 상담실", Math.round(300 * pi)); }
  T.room = k; return { ok: true, msg: { none: "온라인만", hourly: "주말 시간제 공간 대여", lease: "상담실 계약(보증금 500 포함)" }[k] };
}
