// 타로 보드: "카드보다 상담이 본업."
// 연습 노트 → 온라인 텍스트 리딩(재능마켓) → 플리마켓·카페 부스 → 단골과 예약 대기.
// 돈은 문의(큐)를 내가 직접 읽어야 들어온다. 연말·연초에 문의가 몰리고, 리딩마다 멘탈이 깎인다.
// 규약: engine/jobs/README.md
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js"; // 초반 고생 배율(ramp)

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
// 달별 문의 배수: 연말·연초 몰림, 2월 정적
export const SEASON = [1.7, 0.65, 0.9, 0.95, 0.95, 0.9, 0.85, 0.9, 1.0, 1.05, 1.2, 1.8];
// 11-21 밸런스(10개 투잡 공통 비교, 기획 tarot.json: 중위 월 40만·p75 80만·p95 300만).
// 원래: 문의 상한 [6, 12, 34, 52, 80], 텍스트 평균 단가 0.8·통화 섞이면 1.4 → 3년 차 중앙 월 69만, 10년 차 201만.
export const TR_BAL = { leadCap: [6, 12, 30, 44, 66], unitText: 0.7, unitCall: 1.25 };
const LEAD_CAP = TR_BAL.leadCap;
const STREAMS = { inc: ["타로 상담료", "타로 부스", "타로 구독", "타로 키트·굿즈"], exp: ["타로 수수료", "타로 비용", "타로 상담실"] };

const DEF = () => ({
  v: 1, lv: 1, brand: false, notes: 0, free: 0, reviews: 0, paid: 0, reads: 0, regulars: 0, rep: 30, follow: 0,
  niche: null, price: 1, tail: false, boundary: false, subOn: false, subs: 0, kits: 0, kitProg: 0, kitAge: [],
  room: "none", agent: false, bot: false, empathy: false, series: false, partner: false,
  queue: 0, wait: 0, leads: 0, repeatLeads: 0, rebuy: 0, served: 0, gross: 0, cardN: 0, practN: 0, boothT: -99,
  waitM: 0, goodM: 0, peak: 0, witch: 0, bSeen: 0, seen: [], evT: -99, started: -1, months: 0,
  hist: [], kh: [], rh: [], last: null,
});

// ───────── 계산 도우미(화면에서도 씀) ─────────
export const callsOn = (T) => T.lv >= 4;
export function unitPrice(s) {
  const T = s.tarot; if (T.lv < 3) return 0;
  const base = callsOn(T) ? TR_BAL.unitCall : TR_BAL.unitText; // 텍스트 1장 0.5·3장 1.0 → 통화 30분 3만이 섞이면 평균(TR_BAL)
  return r1(base * PRICES[T.price].m * (T.niche ? NICHES[T.niche].unit : 1) * (T.room === "lease" ? 1.3 : T.room === "hourly" ? 1.1 : 1) * (T.brand ? 1.25 : 1) * SYN.pi(s));
}
export function capPerRead(s, boost = 1) {
  const T = s.tarot;
  return Math.max(1, Math.round((5 + (s.st.talk || 0) / 25) * boost * (callsOn(T) ? 0.75 : 1) * (s.fullJob === "tarot" ? 1.15 : 1)));
}
export function drainPer(s) {
  const T = s.tarot;
  return (callsOn(T) ? 0.5 : 0.32) * (T.boundary ? 0.65 : 1) * (T.tail ? 1.15 : 1) * (T.niche === "love" ? 1.15 : 1) * mod(s, "trDrain", 1);
}
const feeRate = (T) => (T.brand ? 0.1 : 0.18) * (T.room === "lease" ? 0.5 : 1); // 재능마켓 수수료(대면 상담은 수수료 없음)
function priceDemand(T) { return T.price === 0 ? 1.3 : T.price === 2 ? clamp(0.45 + T.rep / 180, 0.45, 1) : 1; }

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

// ───────── 이벤트(기획 데이터 16개 + 겸직 1개) ─────────
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
    { id: "e04", ph: "early", ok: () => T.paid >= 1, t: "첫 유료 5,000원", x: "텍스트 리딩 첫 결제가 들어왔다. 5,000원. 질문은 \"이직할까요?\" 퇴사 고민은… 내 전문이다. 매일 하는 고민이니까.",
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
    { id: "e11", ph: "late", ok: () => T.kits >= 1, t: "리딩 키트 출시", x: "자주 받는 질문 30개와 해석법을 정리해 노션 키트로 만들었다. 19,000원. 자는 동안 7개가 팔렸다.", on: true,
      c: [{ t: "시리즈로 늘린다(이직·연애·관계)", eff: { hp: -4 }, text: "다음 키트 작업 절반이 끝났다." },
          { t: "하나로 끝낸다", eff: { tr_kit: Math.round(1.9 * 7 * pi) }, text: "부수입은 부수입대로 둔다." }] },
    { id: "e12", ph: "late", ok: () => T.lv >= 4 && !T.bot && !T.empathy, t: "AI 타로 앱", x: "\"AI가 3초 만에 카드를 해석해 드려요. 무료.\" 광고가 계속 뜬다. 문의가 눈에 띄게 줄었다. 그런데 단골 하나가 \"그래도 사람이 낫더라고요\" 하고 돌아왔다.", on: true,
      c: [{ t: "공감 상담을 전면에 내세운다", eff: { stat: { talk: 1 } }, text: "'카드보다 대화'. 단가를 지켰다." },
          { t: "AI 챗봇 자동 응답 상품을 만든다", eff: { stat: { num: 1 }, tr_rep: -3 }, text: "월 몇 만 원이 저절로 들어온다. 리뷰에 '기계 같아요'가 섞였다." }] },
    { id: "e13", ph: "crisis", ok: () => T.follow >= 1200, rep: true, t: "\"사기 아니에요?\"", x: "게시물에 댓글이 달렸다. \"이런 걸로 돈 받는 거 사기 아님?\" 좋아요가 80개다. 단골 하나가 언팔했다.",
      c: [{ t: "'심리적 조망 도구'라는 상담 철학을 정리해 공지", check: { stat: "write", dc: 40 }, ok: { text: "차분한 글에 '저장'이 쌓였다. 오히려 신뢰가 올랐다.", eff: { tr_rep: 3, mental: -2 } }, ng: { text: "변명처럼 읽혔다. 댓글이 더 달렸다.", eff: { tr_rep: -1, mental: -5 } } },
          { t: "댓글을 지운다", eff: { tr_rep: -4, tr_reg: -1 }, text: "캡처가 돌았다. '댓글 지우는 타로'." }] },
    { id: "e14", ph: "crisis", ok: () => T.paid >= 30, rep: true, t: "엇나간 리딩", x: "\"재회할 수 있다면서요. 그 사람 결혼했대요.\" 별점 1개와 환불 요구가 함께 왔다. 후기 탭 맨 위에 박혔다.",
      c: [{ t: "환불하고 정중히 사과한다", eff: { tr_cost: Math.round(u * 2), tr_rep: -1 }, text: "\"카드는 가능성이지 확정이 아니었어요. 제 설명이 부족했습니다.\" 별점이 3으로 바뀌었다." },
          { t: "카드는 가능성일 뿐이라며 거절한다", eff: { tr_rep: -6, mental: -3 }, text: "맞는 말인데, 후기 탭은 맞는 말을 안 봐준다." }] },
    { id: "e15", ph: "crisis", ok: () => T.lv >= 3 && s.cal === 2, t: "2월의 정적", x: "신년 특수가 끝났다. 2월 둘째 주 문의는 하루 1건. 지난달 번 돈으로 산 조명이 방 한구석에서 빛난다.",
      c: [{ t: "비수기용 니치 콘텐츠 시리즈를 올린다", eff: { hp: -4, tr_follow: 200, stat: { write: 0.5 } }, text: "'퇴근길 1장 리딩' 시리즈. 저장이 조금씩 쌓인다." },
          { t: "지인 추천 50% 할인권을 뿌린다", eff: { tr_cost: Math.round(5 * pi), tr_q: 6 }, text: "할인권 들고 친구의 친구가 왔다." }] },
    { id: "e16", ph: "crisis", ok: () => T.lv >= 4 && T.room === "none" && (T.wait >= 3 || T.lv >= 5), t: "상담실 임대 유혹", x: `예약 대기가 생기자 작은 상담실을 얻을까 싶다. 월세 ${won(Math.round(55 * pi))}, 인테리어 ${won(Math.round(300 * pi))}.${company(s) ? " 평일엔 회사에 있어야 한다." : ""}`, on: true,
      c: [{ t: "시간제 공간 대여로 주말만", eff: {}, text: "주말 대면 상담 시작. 단가 +10%, 월 대여비가 나간다." },
          { t: "상담실을 계약한다", eff: {}, text: "보증금·인테리어가 한 번에 나갔다. 대면 단가 +30%, 수수료 절반. 예약이 비면 월세가 아프다." },
          { t: "아직은 온라인으로", eff: {}, text: "고정비 0원의 평화." }] },
    { id: "e17", ph: "mid", ok: () => T.lv >= 3 && company(s), rep: true, t: "탕비실의 손님", x: "DM이 왔다. \"혹시… 3층 기획팀 아니세요? 저 옆 팀이에요. 저도 봐 주실 수 있어요?\" 회사 사람에게 들켰다.",
      c: [{ t: "웃으며 무료로 봐 주고 비밀을 부탁한다", check: { stat: "talk", dc: 42 }, ok: { text: "\"대박, 저 이직 얘기 아무한테도 안 했는데.\" 비밀 동맹이 생겼다.", eff: { eye: 1, tr_reg: 1 } }, ng: { text: "다음 날 팀 단톡방에 '우리 회사 타로 선생님' 이야기가 돌았다.", eff: { eye: 8 } } },
          { t: "정중히 거절하고 계정 노출을 줄인다", eff: { tr_follow: -Math.round(T.follow * 0.05), eye: -2 }, text: "얼굴 나온 사진을 다 내렸다." }] },
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
  return { kind: "event", tag: "타로", title: e.t, text: e.x, ...(e.on ? { onChoose: "tr_ev" } : {}), choices: e.c };
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
  const rep = T.regulars * 0.7;
  const mult = seas * priceDemand(T) * (0.7 + T.rep / 100 * 0.6) * (T.niche ? NICHES[T.niche].lead : 1) * (SYN.on(s, "tr_insta") ? 1.12 : 1)
    * mod(s, "trLead", 1) * (T.seen.includes("e12") ? (T.empathy ? 1.03 : T.bot ? 0.95 : 0.92) : 1) * (T.room === "lease" ? 1.15 : 1) * (T.boundary ? 0.92 : 1) * (s.era?.winter ? 0.95 : 1) * SJ.ramp(s, "tarot") * SJ.skillRamp(s, "tarot"); // 유료 첫 달부터 초반 고생 · v4.25b 배우는 기간
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
    const p = clamp(0.03 + T.rep / 1500 + Math.max(0, boost - 1) * 0.08, 0.02, 0.15);
    let nr = 0; for (let i = 0; i < n; i++) if (r.chance(p)) nr++; T.regulars += nr;
    lines.push(`리딩 ${n}건 +${won(rev)}`, ...(fee ? [`재능마켓 수수료 −${won(fee)}`] : []), ...(tip ? ["팁·후기 보너스"] : []), ...(nr ? [`단골 +${nr}`] : []));
  }
  const dr = Math.min(4, r1(n * drainPer(s)));
  s.mental = clamp(s.mental - dr, 0, 100); if (dr) lines.push(`멘탈 −${dr}`);
  T.served += n; gainStat(s, "talk", 0.3);
  const msg = T.lv < 3 ? r.pick(["친구가 카드를 보다가 갑자기 울었다. 카드는 핑계였다.", "\"너 이거 진짜 잘 맞는다?\" 연습이 칭찬으로 돌아왔다.", "3장 펼치기. 과거·현재·미래. 손님 표정이 먼저 답을 말했다."])
    : callsOn(T) ? r.pick(["통화 30분. 카드는 세 장, 질문은 열 개.", "\"그 사람 마음이요?\" 카드보다 손님 목소리를 먼저 들었다.", "밤 11시 통화. 끝나고 물 한 잔 마시고 멍하니 앉아 있었다."])
    : r.pick(["퇴근 지하철에서 텍스트 리딩 세 건. 카드 사진 찍고 답장.", "같은 '연인' 카드도 사람마다 다르게 읽힌다.", "\"이직할까요?\" 내가 매일 하는 질문이었다."]);
  return { lines, msg, n };
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
    if (id === "tr_agent") return T.lv < 4 && !T.agent ? "Lv4부터(믿을 만한 후배가 생겨야)" : null;
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
      if (T.kitProg >= 100) { T.kitProg = 0; T.kits++; T.kitAge.push(0); checkLv(s, up); return { lines: [`리딩 키트 ${T.kits}호 출시!`, `${T.brand ? "굿즈 포함 " : ""}1개 ${T.brand ? "2.5" : "1.9"}만, 다음 달부터 팔려요`, ...up], msg: r.pick(["'이직 앞둔 당신을 위한 3장 스프레드' 노션 키트 완성.", "PDF 32쪽. 내 연습 노트가 상품이 됐다."]) }; }
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
      notes.push(`타로 위탁: 후배가 ${n}건 읽음(수익 40%·수수료 −${won(cut + fee)})`);
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
    T.regulars = Math.max(0, T.regulars - (T.regulars > 0 && r.chance(Math.min(1, T.regulars * 0.08)) ? Math.max(1, Math.round(T.regulars * 0.08)) : 0));
    // 구독
    if (T.subOn && T.lv >= 3) {
      const capS = 1 + T.lv + (T.brand ? 10 : 0);
      if (T.regulars > 0) T.subs += (r.chance(clamp(T.regulars * 0.04 + (T.niche ? 0.1 : 0), 0, 0.9)) ? 1 : 0) + (T.regulars >= 12 && r.chance(0.4) ? 1 : 0);
      T.subs = Math.min(capS, T.subs); if (T.subs > 0 && r.chance(0.25)) T.subs--;
      if (T.subs > 0) { const rv = Math.round(T.subs * 3.5 * pi); s.cash += rv; addMoney(s, "inc", "타로 구독", rv); s.mental = clamp(s.mental - Math.min(4, T.subs * 0.25), 0, 100); T.gross += rv; }
    }
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
    if (T.room === "lease") { const rent = Math.round(55 * pi); s.cash -= rent; addMoney(s, "exp", "타로 상담실", rent); if (T.served < 20) notes.push(`상담실 예약률 미달(${T.served}건): 월세 ${won(rent)}만 나갔다`); }
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
    // 시즌 안내
    if (s.cal === 11 && T.lv >= 3) notes.push("타로: 다음 달부터 신년운세 시즌. 문의가 두 배 가까이 몰려요");
    const ev = T.lv >= 1 ? pickEvent(s, r) : null; if (ev) scenes.push(ev);
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
    tr_ev(s, r, i, ok) {
      const T = s.tarot, ev = s._trEv?.id, pi = SYN.pi(s); s._trEv = null;
      if (ev === "e03" && i === 0) T.series = true;
      if (ev === "e06" && i === 0) { T.tail = true; return ["꼬리 질문 옵션 켜짐(리딩당 수입 +)"]; }
      if (ev === "e07" && i === 0) { T.subOn = true; T.subs = Math.max(1, T.subs); return ["월 구독 리딩 시작(1명 월 4만)"]; }
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
export function setPrice(s, v) { s.tarot.price = clamp(+v | 0, 0, 2); }
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
