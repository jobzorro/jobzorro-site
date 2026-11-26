// 방문 펫시팅(11-24): "노는 시간보다 약속을 지키는 시간." 보호자가 집을 비운 동안 그 집에 가서 밥·물·화장실을 보고 본 것만 보고한다.
// - 부업 단계: 가구(단골)마다 신뢰가 따로 쌓인다. 한 달에 "한 주치 방문"을 가구별로 예약받고, 하나에 행동력 1. 벌이는 작다(대표 결정: 부업으로는 파이어가 거의 불가능).
// - 본업화: 단골이 쌓이면 관문 다섯(자격 → 영업장 → 등록 → 보험 → 첫 직원)을 풀어 '돌봄 회사'가 된다. 위탁 돌봄(유치원·호텔)이 열리고 직원이 방문을 대신 간다.
//   사람을 쓸수록 '사람 챙기기'에 행동력이 든다(직원 3명에 1). 안 챙기면 그만두거나 사고가 난다.
// - 이 투잡만의 규칙: 방문은 약속이다. 회사 야근과 부딪치고, 대신 보낼 수 없다. 사전 만남을 건너뛰면 사고가 잦다.
// 돈 단위 만원. 규약: engine/jobs/README.md. 숫자는 PS_BAL 한곳에(봇 시험: 환경변수 PSB).
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, creditRoom, addLoan, CHAR, jo, helperPower, mod, ensureRel } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const PS_BAL = {
  wk: 8, fee: 0.25, travel: 1.8, // 한 주치 방문(5회) 값 · 플랫폼 몫 · 이동비
  peak: [1, 2, 7, 8, 9, 12], peakX: 1.6, // 명절·휴가철
  homes: [5, 7, 9, 10], inq: { base: 0.35, promo: 0.9, rev: 1 / 14, max: 3 },
  trust: { meet: 42, noMeet: 22, visit: 4, report: 6, miss: -22, cap: 100, regular: 70 },
  miss: { refund: 1, star: 0.12 }, clash: 0.2, // 야근과 부딪칠 확률(회사 다니는 동안, 달마다)
  ev: { p: 0.1, noMeetX: 2.2, gap: 4 },
  lv: [1, 3, 6], // 단골 수: 첫 단골 · 믿고 맡기는 시터 · 동네에서 유명한 시터
  gate: { lv: 2, certN: 4, certDc: 55, certCost: 30, dep: 2500, fit: 1800, rent: 260, regMo: 2, ins: [0, 12, 28], hireCost: 150 },
  pro: { wage: 270, per: 12, dayFee: 40, night: 6, nightPer: 30, over: 0, dem: 19, rooms: 60, /* dem: 한 지점이 모을 수 있는 유치원 회원(동네 수요) · rooms: 한 지점의 한 달 호텔 박 수 · over: 관리비(안 씀) */ supplies: 5, careEach: 3, quitP: 0.12, staffCap: [3, 6, 10], branch: [0, 5000, 9000], rentX: [1, 2.1, 3.4], fill0: 0.25, wom: 0.035, promo: 2.5, visitPer: 22, visitNet: 0.55 },
};
if (typeof process !== "undefined" && process.env?.PSB) { const o = JSON.parse(process.env.PSB); for (const k of Object.keys(o)) PS_BAL[k] = typeof o[k] === "object" && !Array.isArray(o[k]) ? { ...PS_BAL[k], ...o[k] } : o[k]; }
export const LV_N = ["첫 방문", "첫 단골", "믿고 맡기는 시터", "동네에서 유명한 시터", "돌봄 회사"];
export const GATES = [["cert", "자격", "돌봄 교육을 이수하고 시험을 본다"], ["place", "영업장", "자리를 구하고 시설 기준을 맞춘다"], ["reg", "등록", "지자체 심사 두 달(그동안 월세만 나감)"], ["ins", "보험", "배상책임 보험. 보장 범위를 고른다"], ["staff", "첫 직원", "시터를 뽑고 가르친다"]];
const pi = (s) => SYN.pi(s);
const HOME_N = ["고양이 두 마리 집", "노령묘 한 마리 집", "겁 많은 고양이 집", "말티즈 한 마리 집", "고양이 세 마리 집", "토끼와 고양이 집", "시바견 한 마리 집", "아기 고양이 집", "푸들 두 마리 집", "코리안숏헤어 남매 집", "먼치킨 한 마리 집", "닥스훈트 한 마리 집"];
const AREA = ["역 앞 오피스텔", "언덕 위 빌라", "신축 아파트 12층", "오래된 주택 2층", "공원 옆 아파트", "복층 원룸", "단지 끝 동 3층"];
export const regulars = (C) => C.homes.filter((h) => h.trust >= PS_BAL.trust.regular).length;
export const isPro = (s) => !!s.petsit?.g?.reg && !!s.petsit?.g?.place;
export const gateStep = (C) => GATES.findIndex(([k]) => !C.g[k]); // 다음에 풀 관문(−1이면 다 품)
export const gateOpen = (C) => C.lv >= PS_BAL.gate.lv || Object.values(C.g).some(Boolean);
export const staffCap = (C) => PS_BAL.pro.staffCap[C.br || 0];
export const careNeed = (C) => Math.ceil((C.staff || 0) / PS_BAL.pro.careEach);
// 11-26 조력자: 옥서진(c127 동물보건사, ps_vet) 병·약 판정이 쉬워짐 · 라윤서(c128 승무원, ps_ref) 동료 소개로 단골 문의 + · 어동훈(c129 고양이 카페 사장, ps_biz) 영업장·등록 비용·기간 −
//   인물 id 로 건다(인물 자료의 helper.effect 는 자리 표시라 무엇이든 된다): 그 인물이 조력 중이면 1, effect 가 이 키면 helperPower 값.
export const PS_HELP = { ps_vet: "c127", ps_ref: "c128", ps_biz: "c129" };
export const psHelp = (s, eff) => Math.min(1.5, helperPower(s, eff) || (s.rel?.[PS_HELP[eff]]?.helper ? 1 : 0));
const helpName = (eff, def) => CHAR[PS_HELP[eff]]?.name || def;
export function placeCost(s) { const G = PS_BAL.gate, cut = 1 - 0.2 * Math.min(1, psHelp(s, "ps_biz")); return { dep: Math.round(G.dep * pi(s)), fit: Math.round(G.fit * pi(s) * cut) }; } // 어동훈: 시설 기준을 아는 사람이 있으면 시설비 −20%
export const regMonths = (s) => Math.max(1, PS_BAL.gate.regMo - (psHelp(s, "ps_biz") >= 0.5 ? 1 : 0));
function newHome(s, r, pre) { const C = s.petsit, T = PS_BAL.trust; const h = { id: "H" + (++C.seq), n: `${r.pick(AREA)} · ${r.pick(HOME_N)}`, trust: (pre ? T.meet : T.noMeet) + mod(s, "psTrust", 0), pre: !!pre, since: s.t, wk: 0, done: 0 }; C.homes.push(h); return h; }
function book(s, r) { // 이번 달 예약: 가구마다 0~2주
  const C = s.petsit, B = PS_BAL, pk = B.peak.includes(s.cal) ? B.peakX : 1;
  for (const h of C.homes) { const p = h.trust >= B.trust.regular ? 0.95 : h.trust >= 40 ? 0.6 : 0.35; let n = r.chance(Math.min(0.98, p * (pk > 1 ? 1.15 : 1))) ? 1 : 0; if (n && (h.trust >= B.trust.regular || pk > 1) && r.chance(0.3 * pk)) n = 2; h.wk = n; h.done = 0; }
  C.clash = !(s.co.quit || s.co.fired) && C.homes.some((h) => h.wk) && r.chance(B.clash + (s.co.crunchM ? 0.25 : 0)) ? 1 : 0;
}
const insCut = (C) => [1, 0.5, 0.15][C.ins || 0]; // 보험이 사고 손실을 덮는 정도
function ev(s, r, home) {
  const C = s.petsit, P = pi(s), hn = home?.n || "단골 집", vet = psHelp(s, "ps_vet"), vd = Math.round(15 * Math.min(1, vet)), vn = helpName("ps_vet", "동물보건사"), L = [
    { id: "door", ok: () => true, t: "문이 안 열린다", x: `${hn}. 공동현관 번호가 바뀌어 있다. 보호자는 지금 비행기 안이다. 안에서 밥그릇 긁는 소리가 들린다.${home && !home.pre ? " 사전 만남에서 출입을 시험해 보지 않았다." : ""}`,
      c: [{ t: "비상 연락처에 건다", check: { stat: "talk", dc: home?.pre ? 35 : 60 }, ok: { text: "보호자의 언니가 번호를 알려 줬다. 20분 늦게 들어갔다. 밥은 제때 줬다.", eff: {} }, ng: { text: "아무도 받지 않는다. 결국 그날 방문은 못 했다.", eff: { mental: -4 } } },
        { t: "경비실에 사정을 설명한다", check: { stat: "charm", dc: 55 }, ok: { text: "경비 아저씨가 보호자와 통화한 뒤 문을 열어 줬다.", eff: {} }, ng: { text: "\"세입자 확인 없이는 안 됩니다.\" 맞는 말이라 더 할 말이 없었다.", eff: { mental: -3 } } },
        { t: "내일 다시 온다", eff: {}, text: "하루 굶긴 셈이 됐다. 보호자가 착륙하자마자 까톡이 왔다." }] },
    { id: "sick", ok: () => true, t: "밥을 안 먹었다", x: `${hn}. 어제 준 사료가 그대로다. 구석에서 나오지 않는다. 화장실 모래도 깨끗하다. 보호자는 사흘 뒤에 온다.`,
      c: [{ t: "본 대로 알리고 지시를 기다린다", eff: {}, text: "사진과 함께 본 것만 적어 보냈다. 한 시간 뒤 답이 왔다. 지정 병원으로 옮기기로 했다." },
        { t: "바로 병원에 데려간다", eff: { cash: -Math.round(18 * P) }, text: "진료비는 내 카드로 긁었다. 보호자는 고맙다고 했지만, 먼저 물어봤어야 한다는 말도 했다." },
        { t: "하루 더 지켜본다", check: { stat: "sense", dc: 60 - vd }, ok: { text: "저녁에 다시 가 보니 반쯤 먹었다. 낯가림이었다.", eff: {} }, ng: { text: "다음 날 상태가 더 나빠졌다. 보호자가 일정을 접고 돌아왔다.", eff: { mental: -6 } } },
        ...(vet ? [{ t: `${vn}에게 전화한다`, eff: {}, text: `"사진 보내 봐요. 밥그릇이랑 화장실이요." ${jo(vn, "이", "가")} 5분 만에 답을 줬다. "오늘 밤까지 물은 마시는지 보고, 안 마시면 바로 병원이에요." 본 것과 들은 것을 그대로 보호자에게 보냈다.` }] : [])] },
    { id: "late", ok: () => !(s.co.quit || s.co.fired), t: "오늘 야근이다", x: `7시에 ${hn} 방문이 잡혀 있다. 5시 50분, 팀장이 회의실로 부른다. \"오늘 좀 늦을 거야.\"`,
      c: [{ t: "사정을 말하고 7시에 나간다", eff: {}, text: "약속은 지켰다. 다음 날 팀장의 눈길이 조금 달랐다." },
        { t: "밤 11시에 간다", eff: { hp: -6 }, text: "네 시간 늦게 밥을 줬다. 보고서에 시간을 그대로 적었다." },
        { t: "친구에게 대신 가 달라고 한다", eff: {}, text: "친구가 문 앞에서 찍은 사진을 보호자가 알아봤다. \"이분은 누구세요?\"" }] },
    { id: "med", ok: () => true, t: "\"약도 먹여 주세요\"", x: `${hn} 보호자의 부탁. 하루 두 번 알약이다. 추가로 ${won(Math.round(2 * P))}을 주겠다고 한다. 나는 약을 먹여 본 적이 없다.`,
      c: [{ t: "범위 밖이라고 거절한다", eff: {}, text: "\"그건 병원에 맡기시는 게 안전해요.\" 보호자는 아쉬워했지만 이해했다." },
        { t: vet ? `받는다(${vn}에게 먹이는 법을 묻고)` : "받는다", check: { stat: "hands", dc: 58 - vd }, ok: { text: "수건으로 감싸고 한 번에 넣었다. 닷새 동안 실수가 없었다.", eff: { cash: Math.round(10 * P) } }, ng: { text: "약을 뱉었는지 삼켰는지 모르겠다. 손등에 긴 상처가 났다.", eff: { hp: -5, mental: -4 } } }] },
    { id: "board", ok: () => !isPro(s), t: "\"선생님 집에 며칠만 맡기면 안 돼요?\"", x: `${hn} 보호자가 2주 출장을 간다. 방문 말고 아예 데려가 달라고 한다. ${won(Math.round(60 * P))}을 주겠다고 한다. 내 집에서 맡는 건 방문 돌봄과 다른 업종이다.`,
      c: [{ t: "거절한다", eff: {}, text: "\"그건 등록된 곳에서만 할 수 있어요.\" 대신 하루 두 번 방문으로 바꿨다." },
        { t: "이번만 받는다", eff: { cash: Math.round(60 * P) }, text: "2주 동안 집에서 잠을 못 잤다. 돈은 컸다." }] },
    { id: "hide", ok: () => true, t: "고양이가 안 보인다", x: `${hn}. 30분째 소파 밑에서 나오지 않는다. 보호자는 사진을 기다린다. 밥은 줄어 있고 화장실도 썼다.`,
      c: [{ t: "확인한 것만 적어 보낸다", eff: {}, text: "\"소파 밑에서 쉬고 있어요. 밥은 절반 먹었고 화장실 흔적이 있어요.\" 사진은 밥그릇과 화장실만 찍었다." },
        { t: "꺼내서 사진을 찍는다", eff: {}, text: "사진은 예쁘게 나왔다. 그날 뒤로 내가 들어가면 침대 밑으로 숨는다." }] },
    { id: "staffErr", ok: () => isPro(s) && C.staff > 0, t: "직원이 문을 열어 두고 나왔다", x: "새로 온 시터가 방문을 마치고 현관을 덜 닫았다. 고양이가 계단에서 발견됐다. 다친 곳은 없다. 보호자는 화가 많이 났다.",
      c: [{ t: "내가 가서 사과하고 한 달 무료로 돌본다", eff: { cash: -Math.round(45 * P), hp: -3 }, text: "과일 바구니를 들고 갔다. 한 시간을 들었다. 계약은 유지됐다." },
        { t: "보험으로 처리한다", eff: {}, text: "접수는 됐다. 보호자는 계약을 끊었다." },
        { t: "그 직원을 내보낸다", eff: {}, text: "남은 직원들이 그 일을 오래 얘기했다." }] },
    { id: "cough", ok: () => isPro(s), t: "기침이 돌았다", x: "유치원에 다니는 아이 둘이 기침을 한다. 옮는 병일 수 있다. 문을 닫으면 이번 달 매출이 크게 빠진다.",
      c: [{ t: "일주일 문을 닫고 소독한다", eff: {}, text: "보호자 전원에게 공지했다. 불평은 있었지만 번지지 않았다." },
        { t: "기침하는 아이만 쉬게 한다", check: { stat: "sense", dc: 62 }, ok: { text: "더 번지지 않았다. 운이 좋았다.", eff: {} }, ng: { text: "열흘 뒤 여섯 마리가 기침을 했다. 병원비 얘기가 나왔다.", eff: { mental: -6 } } }] },
    { id: "noise", ok: () => isPro(s), t: "위층에서 내려왔다", x: "\"낮에 짖는 소리가 너무 심해요.\" 위층 사무실 사람이 관리실과 같이 왔다. 구청에 민원을 넣겠다고 한다.",
      c: [{ t: "방음 공사를 한다", eff: { cash: -Math.round(400 * P) }, text: "벽과 천장에 흡음재를 댔다. 그 뒤로 민원은 없다." },
        { t: "산책 시간을 늘려 낮 소리를 줄인다", eff: { hp: -4 }, text: "직원들이 하루 두 번 더 나간다. 소리는 줄었고 일은 늘었다." },
        { t: "기준 안이라고 버틴다", eff: { mental: -3 }, text: "구청에서 사람이 나왔다. 이번에는 넘어갔다. 다음에는 모르겠다." }] },
  ];
  const e = r.pick(L.filter((y) => y.ok()));
  s._psEv = { id: e.id, h: home?.id };
  return { kind: "event", tag: "펫시팅", title: e.t, text: e.x, onChoose: "ps_ev", choices: e.c };
}

export default {
  key: "petsit", prefix: "ps_", hubName: "펫시팅",
  init: () => ({ v: 1, homes: [], seq: 0, inq: 0, promo: 0, rep: 0, edu: 0, rating: 4.6, reviews: 0, lv: 0, clash: 0, missed: 0, evT: -99, months: 0, cum: 0, hist: [], last: null,
    g: { cert: false, place: false, reg: false, ins: false, staff: false }, certN: 0, regT: null, ins: 0, staff: 0, care: 0, br: 0, mem: 0, mpromo: 0, proT: null, strike: 0 }),
  money: { inc: ["펫시팅 수입"], exp: ["펫시팅 비용"] },
  mg: { ps_visit: "sense" }, // 미니게임 petsit1 '명절 대작전'(mg2/petsit1.js): 점수가 방문의 boost(×0.7~1.5). 건너뛰기 결과는 감각 기준
  actions: {
    ps_meet: { n: "사전 만남", ap: 1, hp: 2, desc: "문의 온 집에 가서 출입·습관·병원·연락처를 확인해요. 건너뛰면 사고가 잦아요", stat: { sense: 0.3, talk: 0.2 } },
    ps_accept: { n: "만남 없이 예약 받기", ap: 0, hp: 0, desc: "바로 단골 후보가 되지만 신뢰가 낮게 시작하고 사고가 잦아요" },
    ps_visit: { n: "방문 돌봄(한 주치)", ap: 1, hp: 4, desc: "약속한 집에 가서 밥·물·화장실을 보고, 본 것만 보고해요", stat: { sense: 0.3 } },
    ps_report: { n: "돌봄 보고서 다듬기", ap: 1, hp: 2, desc: "사진과 시간, 먹은 양을 정리해 보내요. 신뢰와 후기가 올라요", stat: { write: 0.4 } },
    ps_promo: { n: "동네 소개 글", ap: 1, hp: 2, desc: "다음 달 문의가 늘어요", stat: { mkt: 0.4 } },
    ps_edu: { n: "돌봄 교육 듣기", ap: 1, hp: 2, cash: -8, desc: "사고가 줄어요. 본업화의 자격 관문에도 쌓여요", stat: { sense: 0.5 } },
    ps_gate: { n: "본업화 관문 풀기", ap: 1, hp: 3, desc: "자격 → 영업장 → 등록 → 보험 → 첫 직원. 단골이 쌓이면 열려요" },
    ps_hire: { n: "시터 채용", ap: 1, hp: 2, desc: "직원이 방문과 유치원을 맡아요. 사람이 늘수록 챙길 일도 늘어요" },
    ps_care: { n: "사람 챙기기", ap: 1, hp: 2, mental: -1, desc: "면담·교육·사고 수습. 직원 3명에 한 번. 안 하면 그만두거나 사고가 나요", stat: { talk: 0.3 } },
    ps_mpromo: { n: "유치원 회원 모집", ap: 1, hp: 2, desc: "다음 달 유치원 회원이 늘어요", stat: { mkt: 0.4 } },
    ps_branch: { n: "지점 늘리기", ap: 1, hp: 3, desc: "영업장을 하나 더 내요. 쓸 수 있는 직원 수가 늘어요" },
  },
  can(s, id, arg) {
    const C = s.petsit, B = PS_BAL, G = B.gate;
    if (id === "ps_meet" || id === "ps_accept") return C.inq < 1 ? "지금은 문의가 없어요. 소개 글을 쓰거나 후기를 쌓아요" : C.homes.length >= B.homes[Math.min(3, C.lv)] ? `지금은 ${B.homes[Math.min(3, C.lv)]}가구까지 맡을 수 있어요` : null;
    if (id === "ps_visit") { const h = C.homes.find((x) => (arg ? x.id === arg : true) && x.done < x.wk); return h ? null : "이번 달 남은 방문 약속이 없어요"; }
    if (id === "ps_report") return C.homes.some((h) => h.done > 0) ? (C.rep >= 2 ? "이번 달 보고서는 충분해요" : null) : "이번 달에 다녀온 집이 있어야 해요";
    if (id === "ps_gate") {
      if (!gateOpen(C)) return `단골 ${B.lv[G.lv - 1]}가구가 되면 열려요(지금 ${regulars(C)}가구)`;
      const k = GATES[gateStep(C)]?.[0]; if (!k) return "관문을 모두 풀었어요";
      if (k === "reg" && C.regT != null) return `심사 중이에요(${Math.max(1, C.regT - s.t)}개월 남음)`;
      if (k === "place") { const pc = placeCost(s), need = pc.dep + pc.fit; if (s.cash + creditRoom(s) * 0.6 + 2000 < need) return `영업장에 ${won(need)}이 들어요(보증금 + 시설)`; }
      return null;
    }
    if (id === "ps_hire") return !isPro(s) ? "영업장과 등록이 끝나야 해요" : !C.g.ins ? "보험부터 들어야 해요(관문)" : C.staff >= staffCap(C) ? `지금 영업장으로는 ${staffCap(C)}명까지예요` : null;
    if (id === "ps_care") return !C.staff ? "직원이 없어요" : C.care >= careNeed(C) ? "이번 달은 다 챙겼어요" : null;
    if (id === "ps_mpromo") return isPro(s) ? null : "돌봄 회사가 된 뒤에 열려요";
    if (id === "ps_branch") { if (!isPro(s)) return "돌봄 회사가 된 뒤에 열려요"; if ((C.br || 0) >= 2) return "더 늘릴 수 없어요"; if (C.staff < staffCap(C)) return `지금 영업장을 먼저 채워요(직원 ${C.staff}/${staffCap(C)})`; const need = Math.round(B.pro.branch[C.br + 1] * pi(s)); return s.cash + creditRoom(s) * 0.6 + 2000 < need ? `지점 하나에 ${won(need)}이 들어요` : null; }
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const C = s.petsit, B = PS_BAL, P = pi(s), G = B.gate;
    if (id === "ps_meet" || id === "ps_accept") { C.inq = Math.max(0, C.inq - 1); const h = newHome(s, r, id === "ps_meet");
      if (!C.c128 && CHAR.c128 && C.homes.length <= 3 && r.chance(0.5)) { // 라윤서(c128, customer.board petsit): 첫 단골 가구 중 하나로 들어온다
        C.c128 = s.t + 1; h.n = "국제선 승무원 집 · 고양이 '대리' 한 마리"; h.who = "c128"; if (!s.cast.includes("c128")) s.cast.push("c128"); ensureRel(s, "c128");
        return { lines: [`새 가구: ${h.n}`, `신뢰 ${h.trust}`, `${CHAR.c128.name}${jo(CHAR.c128.name, "과", "와").slice(CHAR.c128.name.length)} 알게 됐어요`], msg: `${CHAR.c128.name}: "한 달에 열흘은 하늘에 있어요. 비행기 문 닫히기 전에 사진 한 장만요. 그거 보고 이륙해요."` }; } return { lines: [`새 가구: ${h.n}`, `신뢰 ${h.trust}${h.pre ? " · 출입·병원·연락처 확인" : " · 확인 없이 시작"}`], msg: h.pre ? "보호자가 있을 때 문을 직접 열어 봤다. 밥 양, 숨는 자리, 지정 병원을 받아 적었다." : "까톡으로 비밀번호만 받았다. 가 보면 알겠지." }; }
    if (id === "ps_visit") {
      const h = C.homes.find((x) => (arg ? x.id === arg : true) && x.done < x.wk); h.done++;
      const rev = Math.round(B.wk * P * (B.peak.includes(s.cal) ? 1.15 : 1)), cost = Math.round(rev * B.fee + B.travel * P); s.cash += rev - cost; addMoney(s, "inc", "펫시팅 수입", rev); addMoney(s, "exp", "펫시팅 비용", cost); C.mRev = (C.mRev || 0) + rev; C.mCost = (C.mCost || 0) + cost;
      h.trust = clamp(h.trust + B.trust.visit * boost, 0, 100); if (r.chance(Math.min(0.95, (0.35 + h.trust / 300) * boost))) C.reviews++; // 미니게임(명절 대작전) 점수 boost 가 신뢰·후기에 곱해진다
      return { lines: [`${h.n} 한 주 방문 완료`, `수입 +${won(rev - cost)}`, `신뢰 ${Math.round(h.trust)}`], msg: r.pick(["밥그릇을 씻고, 물을 갈고, 화장실을 치웠다. 본 것만 적어 보냈다.", "현관 앞에서 발소리를 죽였다. 문틈으로 먼저 안을 봤다.", "오늘은 먼저 다가와 다리에 머리를 비볐다. 보고서에 그대로 적었다."]) };
    }
    if (id === "ps_report") { C.rep++; for (const h of C.homes) if (h.done > 0) h.trust = clamp(h.trust + B.trust.report * boost / Math.max(1, C.homes.filter((x) => x.done > 0).length) * 2, 0, 100); C.reviews += 1; C.rating = clamp(C.rating + 0.02, 3.5, 5); return { lines: ["다녀온 집의 신뢰 +", "후기 +1"], msg: "\"제공량 40g, 저녁에 확인했을 때 절반 남음.\" 먹었는지 모르는 건 모른다고 적었다." }; }
    if (id === "ps_promo") { C.promo += boost; return { lines: ["다음 달 문의 +"], msg: "동네 게시판에 소개 글을 올렸다. 할 수 있는 것과 안 하는 것을 같이 적었다." }; }
    if (id === "ps_edu") { C.edu++; return { lines: [`돌봄 교육 ${C.edu}회`, "사고가 줄어요"], msg: "고양이가 불안할 때 보이는 신호 열두 가지를 배웠다." }; }
    if (id === "ps_gate") {
      const k = GATES[gateStep(C)][0];
      if (k === "cert") { C.certN++; if (C.certN < G.certN) { const c = Math.round(G.certCost * P / G.certN); s.cash -= c; addMoney(s, "exp", "펫시팅 비용", c); return { lines: [`자격 공부 ${C.certN}/${G.certN}`], msg: "퇴근하고 두 시간씩 강의를 들었다." }; }
        const ok = r.chance(clamp(0.5 + ((s.st.sense || 0) + C.edu * 3 - G.certDc) / 60, 0.2, 0.95)); if (!ok) { C.certN = G.certN - 2; return { lines: ["시험에 떨어졌어요", "두 번 더 공부해야 해요"], msg: "실기에서 발톱을 못 잘랐다. 다시 준비한다." }; }
        C.g.cert = true; log(s, "돌봄 자격을 땄다.", "work"); return { lines: ["관문 1/5 · 자격 통과"], msg: "합격 문자가 왔다. 프로필 맨 위에 올렸다." }; }
      if (k === "place") { const { dep, fit } = placeCost(s), tot = dep + fit, lack = tot - s.cash; if (lack > 0) { addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; } s.cash -= tot; addMoney(s, "exp", "펫시팅 비용", tot); C.g.place = true; C.dep = dep; C.invest = tot; log(s, `돌봄 영업장을 구했다. ${won(tot)}`, "work"); return { lines: ["관문 2/5 · 영업장", `보증금 ${won(dep)} · 시설 ${won(fit)}`, `월세 ${won(Math.round(G.rent * P))}이 나가기 시작해요`], msg: psHelp(s, "ps_biz") ? `${jo(helpName("ps_biz", "고양이 카페 사장님"), "이", "가")} 같이 와서 봐 줬다. "CCTV, 이중문, 휴식실. 구청은 이 세 개부터 봐요." 시설비가 줄었다.` : "1층, 바닥 배수, 환기창 둘. 이중문·잠금장치, CCTV, 개별 휴식실. 시설 기준표를 들고 세 군데를 돌았다." }; }
      if (k === "reg") { const mo = regMonths(s); C.regT = s.t + mo; return { lines: ["동물위탁관리업 등록 신청을 넣었어요", `심사 ${mo}개월 · 그동안 월세만 나가요`], msg: mo < G.regMo ? "서류는 미리 한 번 봐 준 대로 갖췄다. 보완 요청 없이 접수됐다." : "서류 봉투가 두꺼웠다. 구청 창구에서 번호표를 뽑았다." }; }
      if (k === "ins") { const lv = arg === "full" ? 2 : arg === "basic" ? 1 : 2; C.ins = lv; C.g.ins = true; return { lines: ["관문 4/5 · 보험", `${lv === 2 ? "넓은 보장" : "기본 보장"} · 월 ${won(Math.round(G.ins[lv] * P))}`], msg: "약관에서 '보장하지 않는 손해'부터 읽었다." }; }
      if (k === "staff") { const c = Math.round(G.hireCost * P); s.cash -= c; addMoney(s, "exp", "펫시팅 비용", c); C.staff = 1; C.care = 1; C.g.staff = true; C.proT = s.t; C.lv = 4; log(s, "첫 직원을 뽑았다. 이제 돌봄 회사다.", "work"); return { lines: ["관문 5/5 · 첫 직원", "돌봄 회사가 됐어요", "유치원 회원 모집·시터 채용·사람 챙기기가 열려요"], msg: "면접에서 \"고양이가 안 나오면 어떻게 하실 거예요?\"라고 물었다. \"기다릴게요\"라고 답한 사람을 뽑았다." }; }
    }
    if (id === "ps_hire") { const c = Math.round(G.hireCost * P); s.cash -= c; addMoney(s, "exp", "펫시팅 비용", c); C.staff++; return { lines: [`직원 ${C.staff}/${staffCap(C)}명`, `월급 ${won(Math.round(B.pro.wage * P))} · 사람 챙기기 ${careNeed(C)}번 필요`], msg: "첫 주는 내가 같이 다녔다. 문 여는 법부터 가르쳤다." }; }
    if (id === "ps_care") { C.care++; return { lines: [`사람 챙기기 ${C.care}/${careNeed(C)}`], msg: r.pick(["한 명씩 불러 밥을 먹었다. 힘든 집이 어디인지 들었다.", "지난달 사고를 같이 되짚었다. 탓하는 자리가 아니라고 먼저 말했다.", "새 직원의 첫 방문을 뒤에서 지켜봤다."]) }; }
    if (id === "ps_mpromo") { C.mpromo += boost; return { lines: ["다음 달 유치원 회원 +"], msg: "산책길에 전단을 붙였다. 체험 하루를 무료로 걸었다." }; }
    if (id === "ps_branch") { const need = Math.round(B.pro.branch[C.br + 1] * P), lack = need - s.cash; if (lack > 0) { addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; } s.cash -= need; addMoney(s, "exp", "펫시팅 비용", need); C.br++; C.invest = (C.invest || 0) + need; log(s, `돌봄 ${C.br + 1}호점을 냈다. ${won(need)}`, "work"); return { lines: [`${C.br + 1}호점`, `직원 ${staffCap(C)}명까지`], msg: "두 번째 문을 열었다. 이제 내가 없어도 도는 곳이 생겼다." }; }
    return { lines: [], msg: "" };
  },
  choose: {
    ps_ev(s, r, i, ok) {
      const C = s.petsit, B = PS_BAL, id = s._psEv?.id, h = C.homes.find((x) => x.id === s._psEv?.h), out = [], P = pi(s);
      const tr = (v) => { if (h) { h.trust = clamp(h.trust + v, 0, 100); out.push(`그 집 신뢰 ${v > 0 ? "+" : ""}${v}`); } }, star = (v) => { C.rating = clamp(C.rating + v, 3.2, 5); out.push(`별점 ${v > 0 ? "+" : ""}${v.toFixed(2)}`); }, lose = () => { if (h) { C.homes = C.homes.filter((x) => x !== h); out.push("그 가구가 떠났어요"); } }, pay = (v) => { const c = Math.round(v * P * insCut(C)); s.cash -= c; addMoney(s, "exp", "펫시팅 비용", c); out.push(`돈 −${won(c)}${C.ins ? " (보험 적용)" : ""}`); };
      if (id === "door") { if (i === 2 || ok === false) { tr(-15); star(-0.08); C.missed++; } else tr(4); }
      else if (id === "sick") { if (i === 0) tr(8); else if (i === 1) tr(3); else if (i === 3) { tr(10); star(0.03); } else if (ok) tr(5); else { tr(-25); star(-0.15); pay(40); } }
      else if (id === "late") { if (i === 0) { s.co.eye = clamp((s.co.eye || 0) + 8, 0, 100); out.push("회사 눈치 +8"); tr(5); } else if (i === 1) tr(-4); else { if (r.chance(0.6)) { lose(); star(-0.2); } else tr(-6); } }
      else if (id === "med") { if (i === 0) tr(2); else if (ok) tr(8); else { tr(-12); pay(25); } }
      else if (id === "board") { if (i === 0) tr(3); else if (r.chance(0.3)) { const f = Math.round(120 * P); s.cash -= f; addMoney(s, "exp", "펫시팅 비용", f); out.push(`미등록 위탁 신고 · 과태료 −${won(f)}`); star(-0.15); } else tr(6); }
      else if (id === "hide") { if (i === 0) tr(7); else { tr(-9); C.reviews++; out.push("후기 사진 +1"); } }
      else if (id === "staffErr") { if (i === 0) star(0.02); else if (i === 1) { pay(30); star(-0.1); C.mem = Math.max(0, C.mem - 2); } else { C.staff = Math.max(0, C.staff - 1); C.strike = (C.strike || 0) + 1; out.push("직원 −1명", "남은 직원들이 불안해해요"); } }
      else if (id === "cough") { if (i === 0) { C.closed = 1; out.push("이번 달 유치원 매출 −25%"); } else if (!ok) { pay(180); star(-0.2); C.mem = Math.round(C.mem * 0.8); out.push("회원 −20%"); } }
      else if (id === "noise") { if (i === 2 && r.chance(0.4)) { C.closed = 2; star(-0.1); out.push("구청 시정 명령 · 이번 달 매출 −50%"); } }
      return out;
    },
  },
  eff(s, e, out) { // 장면 전용 효과 키: ps_tr 맡은 집 신뢰 ± · ps_star 별점 ± · ps_rev 후기 + · ps_inq 문의 +
    const C = s.petsit; if (!C) return;
    if (e.ps_tr && C.homes.length) { for (const h of C.homes) h.trust = clamp(h.trust + e.ps_tr, 0, 100); out.push(`맡은 집 신뢰 ${e.ps_tr > 0 ? "+" : ""}${e.ps_tr}`); }
    if (e.ps_star) { C.rating = clamp(C.rating + e.ps_star, 3.2, 5); out.push(`펫시팅 별점 ${e.ps_star > 0 ? "+" : ""}${e.ps_star.toFixed(2)}`); }
    if (e.ps_rev) { C.reviews = Math.max(0, C.reviews + e.ps_rev); out.push(`후기 ${e.ps_rev > 0 ? "+" : ""}${e.ps_rev}`); }
    if (e.ps_inq) { C.inq = clamp(C.inq + e.ps_inq, 0, PS_BAL.inq.max + 1); out.push(`새 문의 +${e.ps_inq}`); }
  },
  monthStart(s, r) { const C = s.petsit; if (C.homes.length) book(s, r); else C.clash = 0; C.rep = 0; C.care = 0; C.mRev = 0; C.mCost = 0; },
  month(s, r, notes, scenes) {
    const C = s.petsit, B = PS_BAL, P = pi(s), T = B.trust; let profit = (C.mRev || 0) - (C.mCost || 0);
    // 약속을 안 간 집: 환불·신뢰·별점
    for (const h of [...C.homes]) { const miss = Math.max(0, h.wk - h.done); if (miss) { C.missed += miss; h.trust = clamp(h.trust + T.miss * miss, 0, 100); C.rating = clamp(C.rating - B.miss.star * miss, 3.2, 5); notes.push(`펫시팅: ${h.n} 방문 약속 ${miss}주를 못 지켰어요. 신뢰와 별점이 내려갔어요.`); if (h.trust <= 5) { C.homes = C.homes.filter((x) => x !== h); notes.push(`펫시팅: ${h.n}이 다른 시터를 구했어요.`); } } }
    // 문의
    const I = B.inq, ref = psHelp(s, "ps_ref"), rmp = SJ.ramp(s, "petsit"); // 초반 고생(sj.js ENTRY.petsit): 처음엔 나를 아는 사람이 없다
    C.inq = clamp(C.inq * 0.5 + (I.base + C.promo * I.promo * (1 + (s.st.mkt || 0) / 200) + Math.max(0, C.reviews * I.rev * (C.rating - 3.6))) * rmp * mod(s, "psInq", 1) + Math.min(0, C.reviews * I.rev * (C.rating - 3.6)) + 0.3 * ref + 0.2 * r.normal(), 0, I.max + (ref ? 1 : 0)); C.promo = 0;
    if (ref && C.inq >= 1 && r.chance(0.15)) notes.push(`펫시팅: ${helpName("ps_ref", "승무원 보호자")}의 동료에게서 문의가 왔어요. "비행 가는 동안 우리 애도 부탁해요."`);
    C.rating = clamp(C.rating + (4.7 + mod(s, "psStar", 0) - C.rating) * 0.04, 3.2, 5);
    // 사건: 사전 만남을 건너뛴 집이 있으면 잦다
    const risk = C.homes.filter((h) => h.wk > 0), bad = risk.filter((h) => !h.pre);
    if (C.clash && risk.length && !(s.co.quit || s.co.fired) && !scenes.some((x) => x.kind === "event")) { const sv = s._psForce; s._psForce = "late"; scenes.push(evOf(s, r, r.pick(risk), "late")); s._psForce = sv; C.evT = s.t; }
    else if (risk.length && s.t - C.evT >= B.ev.gap && r.chance(B.ev.p * (bad.length ? B.ev.noMeetX : 1) * Math.max(0.4, 1 - C.edu * 0.08) * mod(s, "psRisk", 1)) && !scenes.some((x) => x.kind === "event")) { C.evT = s.t; scenes.push(ev(s, r, bad.length ? r.pick(bad) : r.pick(risk))); }
    // 선배(온다정 c125)를 두 번 넘게 찾아갔으면 자기 단골 한 집을 넘겨준다(한 판에 한 번)
    if (!C.gift && (s.sj?.rp?.petsit?.sen || 0) >= 2 && C.homes.length < B.homes[Math.min(3, C.lv)]) { C.gift = s.t + 1; const h = { id: "H" + (++C.seq), n: "선배가 넘겨준 집 · 노령묘 한 마리 집", trust: 60, pre: true, since: s.t, wk: 0, done: 0 }; C.homes.push(h); const nm = CHAR.c125?.name || "선배"; notes.push(`펫시팅: ${nm} 선배가 자기 단골 한 집을 넘겨줬어요. "사진은 세 장이에요. 밥그릇, 화장실, 그리고 아이."`); log(s, `${nm} 선배에게 단골 한 집을 넘겨받았다.`, "work"); }
    // 등록 심사
    if (C.regT != null && s.t >= C.regT) { C.regT = null; C.g.reg = true; notes.push("펫시팅: 등록증이 나왔어요. 관문 3/5. 이제 위탁 돌봄을 할 수 있어요."); log(s, "돌봄 영업 등록을 마쳤다.", "work"); }
    // 영업장 월세·보험(관문을 푼 순간부터)
    let fix = 0; if (C.g.place) fix += Math.round(B.gate.rent * B.pro.rentX[C.br || 0] * P); if (C.g.ins) fix += Math.round(B.gate.ins[C.ins || 0] * P);
    // 돌봄 회사: 유치원 회원·호텔·직원 방문
    let pro = null;
    if (isPro(s) && C.g.staff) {
      const K = B.pro, need = careNeed(C), lack = Math.max(0, need - C.care);
      if (lack > 0) { let q = 0; for (let i = 0; i < Math.min(C.staff, lack * K.careEach); i++) if (r.chance(K.quitP)) q++; if (q) { C.staff = Math.max(0, C.staff - q); notes.push(`펫시팅: 못 챙긴 사이 직원 ${q}명이 그만뒀어요.`); } else notes.push("펫시팅: 이번 달 사람 챙기기가 모자랐어요. 그만둘 사람이 생길 수 있어요."); C.rating = clamp(C.rating - 0.03 * lack, 3.2, 5); }
      const brN = (C.br || 0) + 1, cap = Math.min(C.staff * K.per, K.dem * brN), season = B.peak.includes(s.cal) ? 1.12 : 1;
      const join = (0.6 + C.mpromo * K.promo * (1 + (s.st.mkt || 0) / 200) + C.mem * K.wom * (C.rating - 3.6) * 1.2 + C.reviews / 60) * (1 + 0.15 * r.normal()), leave = C.mem * (0.03 + Math.max(0, 4.5 - C.rating) * 0.08 + (lack ? 0.03 : 0));
      C.mem = clamp(Math.round(C.mem + Math.max(0, join) - leave), 0, cap); C.mpromo = 0;
      const shut = C.closed === 2 ? 0.5 : C.closed === 1 ? 0.75 : 1; C.closed = 0;
      const dayRev = Math.round(C.mem * K.dayFee * P * shut), nights = Math.round(Math.min(C.staff * K.nightPer, K.rooms * brN) * clamp(0.3 + C.reviews / 150 + (C.rating - 4.3) * 0.5, 0.15, 0.95) * season * shut), nightRev = Math.round(nights * K.night * P);
      const visRev = Math.round(C.staff * K.visitPer * B.wk / 5 * P * clamp(regulars(C) / 6 + 0.4, 0.4, 1.2)), wage = Math.round((C.staff * K.wage + K.over * Math.max(0, C.staff - 2) ** 2) * P), sup = Math.round((C.mem * K.supplies + nights * 0.5) * P);
      const rev = dayRev + nightRev + visRev, cost = wage + sup + Math.round(visRev * (1 - K.visitNet));
      s.cash += rev - cost; addMoney(s, "inc", "펫시팅 수입", rev); addMoney(s, "exp", "펫시팅 비용", cost); profit += rev - cost; C.reviews += Math.round(C.mem / 12 + nights / 60);
      pro = { mem: C.mem, cap, nights, dayRev, nightRev, visRev, wage, need, care: C.care, staff: C.staff };
      if (C.staff > 0 && s.t - C.evT >= B.ev.gap && r.chance(B.ev.p * (lack ? 2 : 1)) && !scenes.some((x) => x.kind === "event")) { C.evT = s.t; scenes.push(ev(s, r, null)); }
    }
    if (fix) { s.cash -= fix; addMoney(s, "exp", "펫시팅 비용", fix); profit -= fix; }
    const reg = regulars(C); if (C.lv < 4) C.lv = reg >= B.lv[2] ? 3 : reg >= B.lv[1] ? 2 : reg >= B.lv[0] ? 1 : 0;
    C.months++; C.cum += profit; C.last = { profit, homes: C.homes.length, reg, inq: Math.round(C.inq * 10) / 10, fix, pro, rating: C.rating };
    C.hist.push(profit); if (C.hist.length > 24) C.hist.shift();
    return profit;
  },
  value(s) { const C = s.petsit; return C?.g?.place ? Math.round((C.dep || 0) + ((C.invest || 0) - (C.dep || 0)) * 0.35 + (isPro(s) ? Math.max(0, (C.hist.slice(-6).reduce((a, b) => a + b, 0) / 6) * 18) : 0)) : 0; },
  passive(s) { const C = s.petsit; if (!isPro(s) || !C.staff) return 0; const h = C.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) * 0.6 : 0; },
  todos(s) {
    const C = s.petsit, t = [], left = C.homes.reduce((a, h) => a + Math.max(0, h.wk - h.done), 0);
    if (left) t.push({ lv: 2, text: `펫시팅: 이번 달 방문 약속 ${left}주 남음(안 가면 신뢰가 크게 깎여요)` });
    if (C.inq >= 1 && C.homes.length < PS_BAL.homes[Math.min(3, C.lv)]) t.push({ lv: 1, text: "펫시팅: 새 문의가 왔어요. 사전 만남을 잡아요" });
    if (C.staff && C.care < careNeed(C)) t.push({ lv: 2, text: `펫시팅: 사람 챙기기 ${C.care}/${careNeed(C)}` });
    if (gateOpen(C) && gateStep(C) >= 0 && C.regT == null) t.push({ lv: 0, text: `펫시팅: 본업화 관문 ${gateStep(C) + 1}/5 · ${GATES[gateStep(C)][1]}` });
    return t;
  },
  onStart(s) { const C = s.petsit; if (C && !C.homes.length && C.inq < 1) C.inq = 2; }, // 시작하면 지인 소개로 첫 문의 둘
  stopWhy: (s) => (s.petsit?.staff ? "직원이 있어요. 지금은 접을 수 없어요(직원을 먼저 정리해야 해요)" : null),
  onStop(s) { const C = s.petsit; if (C) { if (C.g.place && C.dep) { s.cash += C.dep; addMoney(s, "inc", "보증금 회수", C.dep); } Object.assign(C, { homes: [], inq: 0, staff: 0, mem: 0, g: { cert: C.g.cert, place: false, reg: false, ins: false, staff: false }, dep: 0, regT: null }); } },
  migrate(s, T) { if (!T.v) T.v = 1; T.hist = T.hist || []; T.g = T.g || { cert: false, place: false, reg: false, ins: false, staff: false }; T.homes = T.homes || []; },
  milestones: [
    { key: "ps_first", title: "첫 단골", test: (s) => regulars(s.petsit || { homes: [] }) >= 1, lines: ["\"다음 달에도 선생님으로 부탁드려요.\"", "현관 비밀번호가 내 휴대폰에 하나 저장됐다."] },
    { key: "ps_trust", title: "믿고 맡기는 시터", test: (s) => regulars(s.petsit || { homes: [] }) >= 3, lines: ["명절 예약이 석 달 전에 찼다.", "소개로 온 집이 처음부터 열쇠를 줬다."] },
    { key: "ps_company", title: "돌봄 회사", test: (s) => !!s.petsit?.g?.staff, lines: ["간판을 달았다. 등록 번호가 문 옆에 붙었다.", "이제 내가 없는 시간에도 누군가 약속을 지킨다."] },
    { key: "ps_end_co", end: true, kind: "good", epi: "내 이름을 건 돌봄 회사는 동네에 자리를 잡았다. 지금도 새 직원 면접에서는 같은 질문을 한다. \"고양이가 안 나오면 어떻게 하실 거예요?\"", title: "약속을 지키는 회사", test: (s) => isPro(s) && (s.petsit?.staff || 0) >= 2 && (s.petsit?.months || 0) >= 120, lines: ["간판을 단 지 여러 해가 지났다.", "직원들이 오늘도 남의 집 문을 조용히 연다."] },
    { key: "ps_end_solo", end: true, kind: "good", epi: "회사로 키우지는 않았다. 대신 열두 해를 본 고양이가 있다. 그 집 보호자는 지금도 명절마다 나를 부른다.", title: "열두 해의 단골", test: (s) => !s.petsit?.g?.place && regulars(s.petsit || { homes: [] }) >= 5 && (s.petsit?.months || 0) >= 120 && (s.petsit?.missed || 0) <= (s.petsit?.months || 0) / 4, lines: ["혼자서 다섯 집을 십 년 넘게 돌봤다.", "돈은 크지 않았다. 약속은 거의 어기지 않았다."] },
    { key: "ps_end_lost", end: true, kind: "bad", epi: "약속을 세 번 어긴 시터에게 다시 열쇠를 주는 집은 없었다.", title: "돌려받은 열쇠", test: (s) => !isPro(s) && (s.petsit?.missed || 0) >= 12 && (s.petsit?.homes || []).length === 0 && (s.petsit?.months || 0) >= 12, lines: ["못 간 방문이 열두 번을 넘었다.", "마지막 단골이 다른 시터를 구했다."] },
  ],
  synergy: [
    { id: "ps_clash", kind: "bad", n: "방문 약속 × 회사", need: "펫시팅 + 회사 다니는 중", desc: "야근이 방문 약속과 부딪쳐요. 대신 보낼 수 없어요", test: (s) => !!s.sj?.active?.includes("petsit") && !(s.co.quit || s.co.fired) },
    { id: "ps_insta", kind: "good", n: "펫시팅 × 인별", need: "펫시팅 + 인별", desc: "돌봄 사진이 문의를 불러요(문의 +)", test: (s) => !!s.sj?.active?.includes("petsit") && !!s.sj?.active?.includes("insta") },
  ],
  perks: [
    { id: "p_ps_eye", n: "본 것만 쓰는 사람", line: "귀엽다는 말은 보호자가 한다", pro: "펫시팅 문의 +10%, 새 가구 신뢰 +3", m: { psInq: 1.1, psTrust: 3 }, got: "펫시팅 후기 60개", test: (s) => (s.petsit?.reviews || 0) >= 60 },
  ],
  perkCine: { p_ps_eye: "ps_trust" },
  traits: [
    { trait: "writer", t: "보고서가 읽힌다: 펫시팅 새 가구 신뢰 +3", m: { psTrust: 3 } },
  ],
  info: { inc: "부업으로는 월 30~60만. 돌봄 회사가 되면 달라져요", hours: "약속한 날 저녁" },
};
function evOf(s, r, home, id) { // 지정한 사건(야근)을 연다
  const save = r.pick; r.pick = (L) => (Array.isArray(L) && L[0]?.id ? L.find((x) => x.id === id) || save.call(r, L) : save.call(r, L)); const sc = ev(s, r, home); r.pick = save; return sc;
}
