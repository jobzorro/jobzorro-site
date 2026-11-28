// 취미 모임(11-23): 회원이 회비를 내고 매주 한 번 모이는 모임을 내가 운영한다. "회원이 많을수록 잘되고, 내가 빠지면 흩어진다."
// 여는 조건: 모이는 취미(와인·독서·보드게임·러닝·밴드·사진·여행·축구 관람)를 6번 넘게 다녔을 것 → 그 달에 투잡으로 발견된다(idle).
// 종목은 다녀 본 취미 중에서 고른다. 내 파티룸에서 열면 대관료가 0이고 투잡 칸을 안 쓴다(slot). 파티룸 2차 길 B("내가 채운다")의 감소를 푼다(wave.js prFill).
// 돈 단위 만원. 규약: engine/jobs/README.md
import * as D from "../defs.js";
import { addMoney, log, won, gainStat } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js";
import * as UND from "../und.js"; // 11-28 업의 이해도 효과(함수 안에서만 쓴다. 스위치 UND_ON 이 꺼져 있으면 늘 0 · false)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// fee: 월 회비(1인) · per: 회원 1인당 드는 돈(다과·재료) · cap: 빌린 공간 정원 · keep: 잘 안 나가는 정도(이탈 배수) · venue: 대관이 필요한가 · sea: 붐비는 달(없으면 늘)
export const KINDS = {
  wine: { n: "와인 모임", fee: 10, per: 3.5, cap: 16, keep: 0.8, venue: true, d: "회비가 높고 재료비도 크다. 회원이 잘 안 나간다" },
  book: { n: "독서 모임", fee: 4, per: 0.4, cap: 14, keep: 0.75, venue: true, d: "돈은 적지만 유지가 쉽다" },
  board: { n: "보드게임 모임", fee: 5, per: 0.8, cap: 24, keep: 1, venue: true, d: "인원을 많이 받을 수 있다" },
  run: { n: "러닝 크루", fee: 3, per: 0.3, cap: 40, keep: 1.1, venue: false, d: "장소가 필요 없다. 뒤풀이만 연다" },
  band: { n: "직장인 밴드", fee: 8, per: 1.5, cap: 12, keep: 0.85, venue: true, d: "정원이 작다. 분기마다 발표회" },
  photo: { n: "사진 모임", fee: 5, per: 0.6, cap: 20, keep: 0.95, venue: false, d: "출사는 밖에서, 품평만 모여서" },
  travel: { n: "여행 모임", fee: 6, per: 1, cap: 20, keep: 1, venue: false, d: "분기마다 큰 여행" },
  soccer: { n: "축구 관람 모임", fee: 6, per: 2, cap: 30, keep: 1.15, venue: true, sea: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], d: "시즌에만 붐빈다" },
};
// need: 취미를 몇 번 다녀야 열리나 · weeks: 한 달 모임 횟수 · rentPer: 빌린 공간 1회 대관료 · thin/full: 썰렁한 선·대기 명단이 생기는 선 · seed: 첫 회원(다닌 횟수당)
// wom: 입소문(회원 1명당 새 회원) · promo: 모집 한 번에 오는 사람 · leave: 기본 이탈 · thinLeave: 썰렁할 때 더 나감 · subPay: 부운영진 수고비 · feeStep: 회비 단계
export const CL_BAL = { need: 6, weeks: 4, rentPer: 6, thin: 8, full: 20, seed: 0.5, wom: 0.05, promo: 1.2, leave: 0.045, thinLeave: 0.1, subPay: 25, subAt: 20, fees: [0.8, 1, 1.25, 1.5], after: 6, afterCost: 15, evP: 0.07, evGap: 10, partnerMax: 2, partnerDc: 55 };
if (typeof process !== "undefined" && process.env?.CLB) Object.assign(CL_BAL, JSON.parse(process.env.CLB)); // 봇 시험용
export const LV = [
  { n: "첫 모임", need: "회원 8명" }, { n: "정기 모임", need: "회원 20명" }, { n: "대기 명단이 있는 모임", need: "회원 20명 이상을 12달" }, { n: "동네 커뮤니티", need: "끝까지 왔다" },
];
const pi = (s) => SYN.pi(s);
// 내가 열 수 있는 종목(다녀 본 취미)
export const myKinds = (s) => Object.keys(KINDS).filter((k) => (s.hb?.cnt?.[k] || 0) >= CL_BAL.need);
export const eligible = (s) => myKinds(s).length > 0;
const myRoom = (s) => (SJ.isActive(s, "pr") ? (s.pr?.rooms || []).filter((x) => x.status === "open").sort((a, b) => b.size - a.size)[0] : null);
// 11-28 업의 이해도 효과(스위치 UND_ON). 숙련(300): 다음 달에 나갈 것 같은 회원 수와 까닭이 미리 보인다(outlook) · 정원 ×cap. 봇이 없는 투잡이라 정원 폭을 작게 잡았다
export const CL_UND = { cap: 1.1 };
if (typeof process !== "undefined" && process.env?.CLU) Object.assign(CL_UND, JSON.parse(process.env.CLU)); // 봇 시험용
export const undFx = (s) => ({ on: UND.jobs().includes("club"), v: UND.score(s, "club"), open: UND.at(s, "club", UND.TH.숙련) });
export function capOf(s) { const C = s.club, K = KINDS[C.kind]; if (!K) return 0; const rm = myRoom(s), base = !K.venue ? K.cap : rm ? Math.max(K.cap, Math.round(rm.size * 1.1)) : K.cap; return UND.at(s, "club", UND.TH.숙련) ? Math.round(base * CL_UND.cap) : base; }
// 탈퇴 조짐(숙련부터 화면에 보인다): 이번 달을 지금대로 마치면 나갈 것 같은 회원 수와 까닭. 아래 month() 의 만족도 · 이탈 식을 그대로 따른다(식을 고치면 여기도 같이). 값을 바꾸지 않는다
export function outlook(s) {
  const C = s.club, B = CL_BAL, K = KINDS[C.kind]; if (!K) return null;
  const hosted = Math.min(B.weeks, C.run + (C.sub ? 2 : 0)), q = hosted / B.weeks, cap = capOf(s), nextCal = s.cal, off = !!(K.sea && !K.sea.includes(nextCal));
  const sat = clamp(C.sat - (C.sat - 60) * 0.08 + (q - 0.75) * 16 - (C.fi >= 2 ? (C.fi - 1) * 2 : 0) - (C.members > cap * 0.95 ? 2 : 0), 0, 100), thin = C.members < B.thin;
  const rate = (B.leave + (thin ? B.thinLeave : 0) + Math.max(0, 55 - sat) / 180 + (C.fi >= 2 ? (C.fi - 1) * 0.02 : 0)) * K.keep * (off ? 1.5 : 1);
  const why = [];
  if (hosted < B.weeks) why.push(`진행 ${hosted}/${B.weeks}번`);
  if (sat < 55) why.push(`만족도 ${Math.round(sat)}(55 아래)`);
  if (thin) why.push(`${B.thin}명이 안 돼 썰렁함`);
  if (C.fi >= 2) why.push("회비가 높음");
  if (off) why.push("비시즌");
  if (C.members > cap * 0.95) why.push("자리가 비좁음");
  const base = B.leave * K.keep;
  return { n: Math.round(C.members * rate), rate, sat: Math.round(sat), why, lv: rate >= base * 2 ? 2 : rate > base * 1.2 ? 1 : 0 };
}
export const feeOf = (s) => { const C = s.club, K = KINDS[C.kind]; return K ? Math.round(K.fee * CL_BAL.fees[C.fi ?? 1] * pi(s) * 10) / 10 : 0; };
export const venueOf = (s) => { const K = KINDS[s.club.kind]; return !K || !K.venue ? "none" : myRoom(s) ? "mine" : "rent"; };
// 파티룸 2차 길 B: 유치한 모임 하나마다, 내 모임 회원 10명마다 감소의 4분의 1이 풀린다
export function prFill(s) { const p = s.pr?.partners || 0, m = SJ.isActive(s, "club") && venueOf(s) === "mine" ? Math.floor((s.club?.members || 0) / 10) : 0; return clamp(0.25 * p + 0.25 * m, 0, 1); }

const UND_NOTE = [[300, "다음 달에 나갈 것 같은 회원 수와 까닭이 미리 보이고, 정원을 10% 더 받을 수 있어요."]];
function ev(s, r) {
  const C = s.club, P = pi(s), L = [
    { id: "villain", t: "분위기를 흐리는 회원", x: "한 회원이 모임마다 자기 얘기만 한다. 뒤풀이에서 다른 회원 둘이 조용히 말했다. \"그분 계속 나오면 저희는 좀…\"",
      c: [{ t: "회비를 돌려주고 내보낸다", eff: { cash: -Math.round(feeOf(s)), mental: -2 }, text: "어색한 통화였다. 단톡방이 한결 조용해졌다." },
        { t: "따로 불러 달랜다 (말빨 판정)", check: { stat: "talk", dc: 50 }, ok: { text: "\"제가 그랬나요?\" 다음 모임부터 말을 줄였다.", eff: {} }, ng: { text: "\"모임장이 사람을 가려요?\" 단톡방에 긴 글이 올라왔다.", eff: { mental: -4 } } },
        { t: "그냥 둔다", eff: {}, text: "한 달 뒤 조용하던 회원 몇이 안 보인다." }] },
    { id: "couple", t: "회원끼리 사귀다 헤어졌다", x: "모임에서 만난 두 사람이 헤어졌다. 둘 다 계속 나오겠다고 한다. 모임 날 방 온도가 2도쯤 내려갔다.",
      c: [{ t: "한 명을 다른 요일 반으로 옮긴다", eff: { hp: -3 }, text: "일정표를 다시 짰다. 둘은 서로 마주치지 않는다." },
        { t: "둘 다 붙잡는다 (매력 판정)", check: { stat: "charm", dc: 55 }, ok: { text: "따로 밥을 한 번씩 샀다. 둘 다 웃으며 나왔다.", eff: {} }, ng: { text: "둘 다 나갔다. 친구들도 따라 나갔다.", eff: { mental: -3 } } },
        { t: "모른 척한다", eff: {}, text: "둘 중 하나가 말없이 단톡방을 나갔다." }] },
    { id: "split", t: "부운영진이 독립하겠다고 한다", x: "일을 제일 많이 돕던 회원이 말했다. \"저도 모임 하나 만들어 보려고요. 몇 분이 같이 가신대요.\"",
      c: [{ t: "수익을 나누고 붙잡는다", eff: {}, text: "매달 회비의 일부를 떼어 주기로 했다. 그 사람이 남았다." },
        { t: "축하하며 보내 준다", eff: { mental: 2 }, text: "송별회를 열었다. 회원 셋 중 하나가 따라갔다." },
        { t: "막는다", eff: { mental: -3 }, text: "\"회원 명단은 두고 가세요.\" 그 말이 다른 모임장들 귀에 들어갔다." }] },
    { id: "freerider", t: "회비는 안 내고 뒤풀이만 온다", x: "정산을 해 보니 회비를 석 달째 안 낸 사람이 다섯이다. 뒤풀이 사진에는 다섯 다 있다.",
      c: [{ t: "선결제로 바꾼다", eff: {}, text: "가입 문의가 조금 줄었다. 통장은 정확해졌다." },
        { t: "눈감는다", eff: {}, text: "사람이 많아 보이는 건 좋다. 남는 돈이 없다." }] },
  ];
  const e = r.pick(L.filter((y) => y.id !== "split" || C.members >= 15));
  s._clEv = { id: e.id };
  return { kind: "event", tag: "취미 모임", title: e.t, text: e.x, onChoose: "cl_ev", choices: e.c };
}

export default {
  key: "club", prefix: "cl_", hubName: "취미 모임",
  init: () => ({ v: 1, kind: null, members: 0, sat: 60, run: 0, promo: 0, after: 0, fi: 1, lv: 0, sub: false, share: false, prepay: false, wait: 0, months: 0, fullRun: 0, peak: 0, cum: 0, evT: -99, hist: [], last: null }),
  money: { inc: ["모임 회비"], exp: ["모임 비용"] },
  actions: {
    cl_open: { n: "모임 만들기", ap: 1, hp: 3, desc: "다녀 본 취미 중에서 종목을 골라요. 같이 다니던 사람들이 첫 회원이 돼요" },
    cl_host: { n: "이번 주 모임 진행", ap: 1, hp: 4, mental: 1, desc: "한 달에 네 번. 빠지면 만족도가 내려가요. 말빨·매력 +", stat: { talk: 0.3, charm: 0.3 } },
    cl_promo: { n: "회원 모집", ap: 1, hp: 2, desc: "모임 소개 글과 지인 초대. 마케팅이 높을수록 많이 와요", stat: { mkt: 0.4 } },
    cl_after: { n: "뒤풀이 열기", ap: 1, hp: 5, mental: 3, desc: "만족도가 크게 올라요. 내 돈이 조금 들어요", stat: { charm: 0.4 } },
    cl_fee: { n: "회비 조정", ap: 0, hp: 0, desc: "올리면 남는 돈이 늘고 나가는 사람도 늘어요" },
    cl_sub: { n: "부운영진 세우기/해제", ap: 0, hp: 0, desc: "회원 20명부터. 모임 절반을 대신 진행해요(수고비)" },
    cl_partner: { n: "모임방장 만나기", ap: 1, hp: 3, desc: "다른 모임을 내 파티룸에 유치해요(매력 판정). 지점당 2개까지", stat: { charm: 0.3 } },
    cl_close: { n: "모임 접기", ap: 0, hp: 0, desc: "회원들에게 마지막 인사를 해요" },
  },
  can(s, id, arg) {
    const C = s.club, B = CL_BAL;
    if (id === "cl_open") return C.kind ? "이미 모임이 있어요" : !eligible(s) ? `모이는 취미를 ${B.need}번 넘게 다녀야 해요` : null;
    if (id === "cl_partner") { const n = (s.pr?.rooms || []).filter((x) => x.status === "open").length; return !SJ.isActive(s, "pr") || !n ? "파티룸 지점이 있어야 해요" : (s.pr.partners || 0) >= n * B.partnerMax ? "지점마다 2개까지예요" : null; }
    if (!C.kind) return "먼저 모임을 만들어요";
    if (id === "cl_host") return C.run >= B.weeks ? "이번 달 모임은 다 진행했어요" : null;
    if (id === "cl_sub") return !C.sub && C.members < B.subAt ? `회원 ${B.subAt}명부터예요` : null;
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const C = s.club, B = CL_BAL, P = pi(s);
    if (id === "cl_open") {
      const ks = myKinds(s), k = ks.includes(arg) ? arg : ks.sort((a, b) => (s.hb.cnt[b] || 0) - (s.hb.cnt[a] || 0))[0], K = KINDS[k];
      C.kind = k; C.members = clamp(Math.round((s.hb.cnt[k] || 0) * B.seed) + 2, 3, 10); C.sat = 65; C.months = 0;
      log(s, `${K.n}을 만들었다. 첫 회원 ${C.members}명.`, "work");
      return { lines: [`${K.n} 시작 · 첫 회원 ${C.members}명`, `월 회비 ${won(feeOf(s))} · ${venueOf(s) === "mine" ? "내 파티룸에서" : K.venue ? "공간을 빌려서" : "장소 없이"}`], msg: "같이 다니던 사람들에게 먼저 말했다. \"제가 하나 만들어 보려고요.\"" };
    }
    if (id === "cl_host") { C.run++; C.sat = clamp(C.sat + 1 * boost, 0, 100); return { lines: [`이번 달 진행 ${C.run}/${B.weeks}`, "만족도 +"], msg: C.run === B.weeks ? "이번 달 모임을 한 번도 안 빠졌다." : "단톡방에 오늘 사진이 올라왔다." }; }
    if (id === "cl_promo") { C.promo += boost; return { lines: ["다음 달 새 회원 +"], msg: "모임 소개 글에 사진 세 장을 붙였다." }; }
    if (id === "cl_after") { const c = Math.round(B.afterCost * P); s.cash -= c; addMoney(s, "exp", "모임 비용", c); C.after++; C.sat = clamp(C.sat + B.after * boost, 0, 100); return { lines: [`돈 −${won(c)}`, "만족도 +"], msg: "2차까지 갔다. 다음 모임 참석 투표가 벌써 찼다." }; }
    if (id === "cl_fee") { C.fi = arg === "down" ? Math.max(0, (C.fi ?? 1) - 1) : arg === "up" ? Math.min(B.fees.length - 1, (C.fi ?? 1) + 1) : ((C.fi ?? 1) + 1) % B.fees.length; return { lines: [`월 회비 ${won(feeOf(s))}`], msg: C.fi >= 2 ? "공지를 올리고 한참 단톡방을 못 봤다." : "회비를 다시 정했다." }; }
    if (id === "cl_sub") { C.sub = !C.sub; return { lines: [C.sub ? `부운영진: 모임 절반을 대신 진행(월 ${won(Math.round(B.subPay * P))})` : "부운영진 해제"], msg: C.sub ? "제일 성실한 회원에게 열쇠를 맡겼다." : "다시 내가 다 한다." }; }
    if (id === "cl_partner") {
      const ok = r.chance(clamp(0.5 + ((s.st.charm || 0) - B.partnerDc) / 100, 0.15, 0.92) * Math.min(1.2, boost));
      if (ok) { s.pr.partners = (s.pr.partners || 0) + 1; log(s, "다른 모임을 내 파티룸에 유치했다.", "work"); return { lines: [`정기 모임 유치 ${s.pr.partners}개`, "그 지점의 평일 밤이 찼어요"], msg: "\"매주 화요일 저녁, 여기로 할게요.\" 모임방장이 일정표에 내 지점을 적었다." }; }
      return { lines: ["이번엔 못 잡았어요"], msg: "\"지금 쓰는 곳이 있어서요.\" 명함만 주고받았다." };
    }
    if (id === "cl_close") { const n = C.members; Object.assign(C, { kind: null, members: 0, run: 0, promo: 0, sub: false, wait: 0 }); return { lines: ["모임을 접었어요"], msg: `회원 ${n}명에게 마지막 공지를 올렸다.` }; }
    return { lines: [], msg: "" };
  },
  choose: {
    cl_ev(s, r, i, ok) {
      const C = s.club, id = s._clEv?.id, out = [], lose = (f) => { const n = Math.min(C.members, Math.max(1, Math.round(C.members * f))); C.members -= n; out.push(`회원 −${n}명`); }, sat = (v) => { C.sat = clamp(C.sat + v, 0, 100); out.push(`만족도 ${v > 0 ? "+" : ""}${v}`); };
      if (id === "villain") { if (i === 0) { C.members = Math.max(0, C.members - 1); sat(6); } else if (i === 1) { if (ok) sat(5); else { sat(-8); lose(0.1); } } else { sat(-6); lose(0.12); } }
      else if (id === "couple") { if (i === 0) sat(2); else if (i === 1) { if (ok) sat(4); else lose(0.15); } else { lose(0.06); sat(-3); } }
      else if (id === "split") { if (i === 0) { C.share = true; out.push("회비의 15%를 나눠 줘요"); } else if (i === 1) { lose(0.33); sat(4); } else { sat(-10); lose(0.1); } }
      else if (id === "freerider") { if (i === 0) { C.prepay = true; out.push("선결제: 새 회원 −15%, 회비가 다 걷혀요"); } else { C.leak = 6; out.push("6달 동안 회비의 15%가 안 걷혀요"); } }
      return out;
    },
  },
  slot: (s) => !!(s.club?.kind && SJ.isActive(s, "club") && myRoom(s)), // 내 파티룸에서 열면 투잡 칸을 안 쓴다
  idle(s, r, notes) { if (eligible(s) && !SJ.isFound(s, "club")) { SJ.found(s, "club", "취미에서"); notes.push("취미 모임을 오래 다니다 보니, 내가 하나 만들어도 되겠다는 생각이 들었다. (투잡 발견: 취미 모임)"); } },
  month(s, r, notes, scenes) {
    const C = s.club, B = CL_BAL, P = pi(s), K = KINDS[C.kind];
    if (!K) { C.hist.push(0); if (C.hist.length > 24) C.hist.shift(); return 0; }
    const hosted = Math.min(B.weeks, C.run + (C.sub ? 2 : 0)), q = hosted / B.weeks, cap = capOf(s), fee = feeOf(s), season = K.sea && !K.sea.includes(s.cal) ? 0.4 : 1;
    // 만족도: 진행을 채우면 오르고 빠지면 내려간다. 비싼 회비는 깎는다
    C.sat = clamp(C.sat - (C.sat - 60) * 0.08 + (q - 0.75) * 16 - (C.fi >= 2 ? (C.fi - 1) * 2 : 0) - (C.members > cap * 0.95 ? 2 : 0), 0, 100);
    // 새 회원: 모집 + 입소문(썰렁하면 입소문이 안 난다)
    const thin = C.members < B.thin, wom = thin ? 0 : C.members * B.wom * (C.sat / 70);
    let join = (0.5 + C.promo * B.promo * (1 + (s.st.mkt || 0) / 200) + wom) * season * (1 + (s.st.charm || 0) / 400) * (C.prepay ? 0.85 : 1) * (1 + 0.15 * r.normal());
    const leaveR = (B.leave + (thin ? B.thinLeave : 0) + Math.max(0, 55 - C.sat) / 180 + (C.fi >= 2 ? (C.fi - 1) * 0.02 : 0)) * K.keep * (season < 1 ? 1.5 : 1);
    const leave = C.members * leaveR;
    const next = Math.round(C.members + Math.max(0, join) - leave);
    C.wait = next > cap ? Math.min(30, (C.wait || 0) + (next - cap)) : Math.max(0, (C.wait || 0) - 1);
    C.members = clamp(next, 0, cap); C.peak = Math.max(C.peak, C.members);
    // 돈
    const paid = C.members * (C.leak > 0 ? 0.85 : 1); if (C.leak > 0) C.leak--;
    const rev = Math.round(paid * fee), v = venueOf(s);
    const rent = v === "rent" ? Math.round(B.rentPer * hosted * P) : 0;
    const cost = Math.round(rent + C.members * K.per * P + (C.sub ? B.subPay * P : 0) + (C.share ? rev * 0.15 : 0));
    s.cash += rev - cost; addMoney(s, "inc", "모임 회비", rev); addMoney(s, "exp", "모임 비용", cost);
    const profit = rev - cost; C.cum += profit; C.months++; C.fullRun = C.members >= B.full ? C.fullRun + 1 : 0;
    C.last = { members: C.members, joined: Math.round(Math.max(0, join)), left: Math.round(leave), rev, cost, profit, hosted, rent, sat: Math.round(C.sat), cap };
    C.lv = C.fullRun >= 12 ? 3 : C.members >= B.full ? 2 : C.members >= B.thin ? 1 : 0;
    if (C.run < B.weeks - (C.sub ? 2 : 0)) notes.push(`취미 모임: 이번 달 모임을 ${B.weeks - hosted}번 못 열었어요. 만족도가 내려가요.`);
    if (thin && C.months >= 3) notes.push(`취미 모임: 회원이 ${B.thin}명이 안 돼 썰렁해요. 나가는 사람이 많아요.`);
    if (C.wait > 0 && C.members >= cap) notes.push(`취미 모임: 정원이 찼어요. 대기 ${C.wait}명. 회비를 올리거나 더 큰 공간이 필요해요.`);
    if (C.members === 0 && C.months >= 4) { notes.push("취미 모임: 회원이 아무도 안 남았어요. 모임이 멈췄어요."); C.kind = null; }
    else if (C.members >= B.thin && s.t - C.evT >= B.evGap && r.chance(B.evP) && !scenes.some((x) => x.kind === "event")) { C.evT = s.t; scenes.push(ev(s, r)); }
    C.run = 0; C.promo = 0; C.after = 0;
    C.hist.push(profit); if (C.hist.length > 24) C.hist.shift();
    UND.fxNote(s, "club", C, notes, UND_NOTE); // 11-28 이해도 문턱을 넘은 달에 한 줄(스위치가 꺼져 있으면 아무 일도 안 한다)
    return profit;
  },
  todos(s) { const C = s.club, B = CL_BAL, t = []; if (!C.kind) t.push({ lv: 1, text: "취미 모임: 종목을 골라 모임 만들기" }); else if (C.run < B.weeks - (C.sub ? 2 : 0)) t.push({ lv: C.run === 0 ? 2 : 1, text: `취미 모임: 이번 달 진행 ${C.run}/${B.weeks}` }); return t; },
  stopWhy: () => null,
  onStop(s) { const C = s.club; if (C) Object.assign(C, { kind: null, members: 0, run: 0, promo: 0, sub: false, wait: 0 }); },
  migrate(s, T) { if (!T.v) T.v = 1; T.hist = T.hist || []; },
  milestones: [
    { key: "cl_first", title: "여덟 번째 회원", test: (s) => (s.club?.members || 0) >= 8, lines: ["의자가 모자라 옆방에서 빌려 왔다.", "이제 한두 명이 빠져도 모임이 열린다."] },
    { key: "cl_full", title: "정기 모임", test: (s) => (s.club?.members || 0) >= 20, lines: ["단톡방 인원이 스물을 넘었다.", "처음 보는 사람이 \"소개받고 왔어요\"라고 했다."] },
    { key: "cl_end_wait", end: true, kind: "good", epi: "내가 만든 모임은 지금도 매주 열린다. 대기 명단이 있다.", title: "대기 명단이 있는 모임", test: (s) => (s.club?.fullRun || 0) >= 12, lines: ["회원 스무 명 넘는 달이 열두 달 이어졌다.", "들어오려면 누가 나가길 기다려야 한다."] },
    { key: "cl_end_empty", end: true, kind: "bad", epi: "모임 단톡방에는 이제 나 혼자 남았다.", title: "빈 방의 모임장", test: (s) => (s.club?.peak || 0) >= 8 && !s.club?.kind && (s.club?.months || 0) >= 6 && (s.club?.members || 0) === 0, lines: ["한때 여덟 명이 넘던 모임이 멈췄다.", "마지막 공지에 읽음 표시가 하나도 안 붙었다."] },
  ],
  synergy: [
    { id: "cl_pr", kind: "good", n: "취미 모임 × 파티룸", need: "취미 모임 + 파티룸 지점", desc: "내 지점에서 열면 대관료 0, 투잡 칸을 안 써요", test: (s) => !!s.sj?.active?.includes("club") && !!s.sj?.active?.includes("pr") && (s.pr?.rooms || []).some((x) => x.status === "open") },
    { id: "cl_late", kind: "bad", n: "주 1회 모임 × 회사", need: "취미 모임 + 회사 다니는 중", desc: "매주 저녁을 비워야 해요: 한 달 행동력 4", test: (s) => !!s.sj?.active?.includes("club") && !(s.co.quit || s.co.fired) },
  ],
  info: { inc: "회원 20명이면 월 60~120만", hours: "주 1회 저녁" },
};
