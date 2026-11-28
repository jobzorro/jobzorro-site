// 출장 세차(11-27, 1단계): "가까운 차 세 대를 맡을 수 있는 건물 한 곳이, 흩어진 문의 열 건보다 낫다." 차를 닦는 게임이 아니라 거점을 따내는 게임.
// - 부업 단계: 건물(거점)을 찾고 → 관리사무소를 설득해 승인을 받고 → 그 건물에서 정기 고객을 모은다. 정기 고객 한 명은 한 달 2회차.
//   세차 돌기 한 번(행동력 1)에 한 거점에서 세 대까지. 내 동선 밖 거점은 두 대까지고 더 지친다. 고객이 흩어지면 행동력이 샌다.
// - 날씨: 달마다 네 주(맑음·비·결빙). 비·결빙 주에는 못 한다. 못 한 회차는 밀리고, 밀리면 해지가 난다. 장마(6~7월)·결빙(12~2월).
// - 체력: 한 달 건수 상한이 체력에 걸린다. 세차 돌기는 스태미너를 많이 쓴다.
// - 사람을 쓰면(주말 알바 2명까지) 거점이 늘지만 달마다 사람 챙기기(한 명에 0.5)가 든다.
// - 본업화: 관문 넷(사업장·폐수 처리 시설 신고 → 법인 차량 관리 계약 입찰 → 직원 2명과 차량 한 대 → 배상 보험 한도)을 풀면 '차량 관리 회사'.
//   법인 계약은 실내 작업이 섞여 날씨를 덜 탄다. 입찰은 낮 미팅이라 회사를 다니는 동안에는 불리하다(나오면 행동력·건수 상한·맑은 주에 도는 횟수도 는다).
// 돈 단위 만원. 규약: engine/jobs/README.md. 숫자는 CW_BAL 한곳에(봇 시험: 환경변수 CWB, 수입 전체 배율 CWK).
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, creditRoom, addLoan, CHAR, jo, helperPower, mod } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js";
import { TAGS, RISK, SLOTS, ITEMS, PAINTS, CLASSES, MODELS, GEN_RULE, CUSTS, TIERS, TIER_BLD, ERAS, WX_NEED, TIER_N, UND, MARKET, SVC } from "./carwash_data.js";
export { TAGS, RISK, SLOTS, ITEMS, PAINTS, CLASSES, MODELS, CUSTS, TIERS, ERAS, WX_NEED, TIER_N, UND, MARKET, SVC };

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const K = (typeof process !== "undefined" && +process.env?.CWK) || 1; // 세기 손잡이: 수입 전체 배율
const UNDBASE = (typeof process !== "undefined" && +process.env?.UNDBASE) || 0; // 봇 시험: 전생에서 가져온 업의 이해도 점수
export const CW_BAL = {
  k: K, price: 4.5, mat: 0.5, trip: 0.6, tripOut: 1.4, // 한 대 값 · 약품 · 이동비(동선 안/밖, 한 번 돌 때)
  per2: 2, perRun: 3, perRunOut: 2, // 정기 고객 한 명의 한 달 회차 · 한 번 돌 때 대수(동선 안/밖)
  cap: { base: 6, body: 0.2, quit: 8, gating: 0.7, age: [34, 0.035, 0.4] }, runs: { emp: 2, quit: 4 }, // 한 달 건수 상한 = base + 체력×body (+ 퇴사 뒤 quit) · 관문을 푸는 동안 ×gating · 34세부터 해마다 3.5%씩 줄어 40%까지(age) · 맑은 주 하나에 돌 수 있는 횟수
  wx: { rain: 0.15, monsoon: 0.55, winterRain: 0.05, ice: 0.38 },
  gear: { use: 2, cost: 6, low: 35 }, photoHp: 1, outHp: 2, nightHp: 2,
  waste: 20, ins: [0, 6, 28], insCut: [1, 0.4, 0.15], dump: { p: 0.08, fine: 150 },
  talk: { base: 0.45, per: 80, help: 0.15, retry: 0.06 }, lead: { max: 3, tries: 3 },
  promo: { max: 2 }, wom: 0.12, churn: { free: 0.25, k: 0.5, wet: 0.5 },
  bases: { solo: 3, max: 8, co: 10 }, lv: [[1, 3], [2, 10], [3, 20]], // 단계 문턱: [거점 수, 정기 고객 수]
  ev: { p: 0.11, gap: 4 },
  crew: { per: 36, pay: 2.2, hire: 60, max: 2, quitP: 0.15 }, careEach: 2, // 주말 알바: 한 달 대수 · 한 대에 주는 돈(건당) · 구하는 비용 · 챙기기 한 번에 두 명(한 명에 0.5)
  gate: { lv: 3, washes: 2000, dep: 1500, fit: 1200, rent: 120, mo: 2, bidDc: 60, van: 2200, hire: 120 },
  // 2단계(아이템·처방): wt 가방 무게 제한 · perRun 고급 거점 한 번에 대수 · load 한 대 기준 시간(분) · sK/bK/cK 등급별 받는 값 · restore 사고 복원비(한 대 값의 배) · wait 처방을 기다려 주는 달 수 · tries 틀려도 다시 맡기는 횟수
  // note: 노트 한 장의 효과(고급 단가 · 입소문 · 사건 위험, max 장까지) · switchP 달마다 신형으로 갈아탈 확률 · oldP 구형이 '10년 묵은 차'로 넘어갈 확률 · corpNo 노트 없는 법인 차량의 작업 효율 · corpLag 신형이 법인 차량으로 바뀌기까지(달) · keeper 전속 관리인 월 수입 · wx 날씨 용품이 있을 때/고급 거점에서 없을 때 값 배율
  rx: { wt: 16, perRun: 4, load: 40, px: 1, sK: 1.05, bK: 0.7, cK: 0.4, restore: 15, wait: 4, tries: 3, gearEach: 0.5, note: { px: 0, wom: 0.003, risk: 0.01, max: 40 }, switchP: 0.035, oldP: 0.05, corpNo: 0.75, corpLag: [6, 18], keeper: 120, wx: [1.05, 0.93], resale: 0.3, noteVal: 10, noteValMax: 60, collP: 0.3 },
  co: { per: 110, wage: 270, price: 3.37, exPrice: 4.6, exShare: [0.04, 0.06, 1200], size: [120, 200], vanMax: 3, vanStaff: 3, vanCorp: 2, empBid: -0.15, term: 24, renew: [0.45, 0.5], vanKeep: 25, lose: 0.3 }, // 직원 한 명의 한 달 대수 · 월급 · 법인 한 대 값 · 계약 한 건의 한 달 대수 · term: 계약 기간(달), 끝나면 재입찰(renew: 기본 확률 + 입찰 실력 몫)
};
if (typeof process !== "undefined" && process.env?.CWB) { const o = JSON.parse(process.env.CWB); for (const k of Object.keys(o)) CW_BAL[k] = typeof o[k] === "object" && !Array.isArray(o[k]) ? { ...CW_BAL[k], ...o[k] } : o[k]; }
export const man1 = (v) => `${Math.round(v * 10) / 10}만`; // 소수 한 자리까지 보이는 금액(won 은 만원 아래를 버린다)
export const lvName = (C) => (C.lv === 0 && C.bases.length ? "고객을 모으는 중" : LV_N[C.lv]); // 거점은 있는데 정기 고객이 아직 3명 미만
export const gateDone = (C) => GATES.filter(([k]) => C.g[k]).length; // 푼 관문 수
export const LV_N = ["거점 없음", "첫 거점", "두 건물을 도는 사람", "동네 세차 선생", "차량 관리 회사"];
export const GATES = [["site", "사업장·신고", "사업장을 구하고 폐수 처리 시설 신고를 넣는다(신고를 마칠 때까지 시간이 걸리고, 그동안 월세만 나감)"], ["bid", "법인 입찰", "법인 차량 관리 계약 입찰. 말빨과 숫자로 판정"], ["crew", "직원·차량", "직원 두 명을 뽑고 작업 차량 한 대를 산다"], ["ins", "보험 한도", "배상 보험 한도를 올린다"]];
export const WX_N = { sun: "맑음", rain: "비", ice: "결빙" };
const pi = (s) => SYN.pi(s);
const out = (s) => !!(s.co?.quit || s.co?.fired); // 회사를 나온 상태(본잡 전환 포함)
const BLD = [["역 앞 오피스텔", 5], ["신축 아파트 단지", 12], ["주상복합", 9], ["오래된 아파트", 8], ["업무용 빌딩", 7], ["빌라 단지", 4], ["지식산업센터", 10], ["대단지 아파트", 12], ["강변 오피스텔", 6]];
const CORP_N = ["제약사 영업 차량", "렌터카 지점", "물류사 임원 차량", "건설사 현장 차량", "보험사 지점 차량", "리스 회사 반납 차량", "병원 의전 차량", "방송국 취재 차량"];

// ── 날씨: 판의 씨앗과 달로 정해진다(난수를 쓰지 않아 어느 화면에서 봐도 같다) ──
const h32 = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const u01 = (s, t, w) => { let x = (h32(String(s.seed ?? "a6")) ^ Math.imul(t * 4 + w + 1, 2654435761)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
export function wxOf(s, dt = 0) { // 이번 달(dt=0) 네 주의 날씨
  const W = CW_BAL.wx, t = s.t + dt, m = ((s.cal - 1 + dt) % 12 + 12) % 12 + 1, win = [12, 1, 2].includes(m), pIce = win ? W.ice : 0, pRain = [6, 7].includes(m) ? W.monsoon : win ? W.winterRain : W.rain;
  return [0, 1, 2, 3].map((w) => { const x = u01(s, t, w); return x < pIce ? "ice" : x < pIce + pRain ? "rain" : "sun"; });
}
export const dryWeeks = (s) => wxOf(s).filter((x) => x === "sun").length;
export const season = (s) => ([6, 7].includes(s.cal) ? "장마철" : [12, 1, 2].includes(s.cal) ? "결빙철" : "");

// ── 보조 ──
export const isCo = (s) => { const g = s.carwash?.g; return !!(g && g.site && g.bid && g.crew && g.ins); };
export const gateStep = (C) => GATES.findIndex(([k]) => !C.g[k]);
export const gateOpen = (C) => (C.lv >= CW_BAL.gate.lv && (C.washes || 0) >= CW_BAL.gate.washes) || !!C.place || Object.values(C.g).some(Boolean); // 법인 입찰은 실적이 있어야 한다: 거점 세 곳·정기 스무 명·누적 2,000대
export const custAll = (C) => C.bases.reduce((a, b) => a + b.cust, 0);
export const owedAll = (C) => C.bases.reduce((a, b) => a + (b.hold ? 0 : b.owed), 0);
export const backAll = (C) => C.bases.reduce((a, b) => a + (b.back || 0), 0);
export const careNeed = (C) => Math.ceil((C.staff || 0) / CW_BAL.careEach);
export const staffCap = (s) => (isCo(s) ? (s.carwash.vans || 1) * CW_BAL.co.vanStaff : CW_BAL.crew.max);
export const baseMax = (s) => { const C = s.carwash, B = CW_BAL.bases; return Math.min(isCo(s) ? B.co : B.max, B.solo + (C.staff || 0)); };
export const corpMax = (s) => (s.carwash.vans || 1) * CW_BAL.co.vanCorp; // 차량 한 대(직원 세 명)에 법인 계약 두 건
export const gating = (s) => !!s.carwash?.place && !isCo(s);
export const ageK = (s) => { const [a0, k, lo] = CW_BAL.cap.age; return clamp(1 - Math.max(0, (s.age || 0) - a0) * k, lo, 1); }; // 몸으로 하는 일: 나이가 들수록 혼자 닦을 수 있는 대수가 준다(사람이 도는 몫은 그대로)
export const carCap = (s) => { const c = CW_BAL.cap; return Math.max(3, Math.round((c.base + (s.st?.body || 0) * c.body + (out(s) ? c.quit : 0)) * (gating(s) ? c.gating : 1) * ageK(s))); };
export const runCap = (s) => dryWeeks(s) * (out(s) ? CW_BAL.runs.quit : CW_BAL.runs.emp);
export const perRun = (b) => (b.zone ? CW_BAL.perRunOut : CW_BAL.perRun);
export const needWaste = (C) => C.bases.some((b) => !b.drain && b.cust > 0);
export const insCut = (C) => CW_BAL.insCut[C.ins || 0];
// 건물주·관리 쪽 사람과의 호감이 승인 확률을 올린다: 조력자 효과 cw_bld(2단계 새 인물) · 파티룸의 pr_landlord(건물주) · 아는 사이인 건물주·관리 쪽 인물의 호감
export function bldHelp(s) {
  let v = (helperPower(s, "cw_bld") || 0) + 0.7 * (helperPower(s, "pr_landlord") || 0);
  for (const [id, x] of Object.entries(s.rel || {})) { const c = CHAR[id]; if (c && /건물주|관리사무|관리소|빌딩 관리/.test(c.job || "") && (x.aff || 0) >= 40) v = Math.max(v, Math.min(0.6, x.aff / 150)); }
  return Math.min(1.5, v);
}
export const talkP = (s, L) => { const T = CW_BAL.talk; return clamp(T.base + ((s.st.talk || 0) - L.dc) / T.per + T.help * bldHelp(s) + T.retry * (L.tries || 0), 0.1, 0.95); };
export const bidP = (s) => clamp(0.4 + (out(s) ? 0 : CW_BAL.co.empBid) + (((s.st.talk || 0) + (s.st.num || 0)) / 2 - CW_BAL.gate.bidDc) / 80 + 0.08 * (s.carwash.bidN || 0), 0.12, 0.9);
export const renewP = (s) => clamp(CW_BAL.co.renew[0] + CW_BAL.co.renew[1] * bidP(s), 0.4, 0.92);
export function siteCost(s) { const G = CW_BAL.gate, cut = 1 - 0.2 * Math.min(1, helperPower(s, "cw_waste") || 0); return { dep: Math.round(G.dep * pi(s)), fit: Math.round(G.fit * pi(s) * cut) }; } // 처리업체 쪽 조력자(2단계): 시설비 −20%
const qual = (s) => (0.85 + Math.min(120, s.st.hands || 0) / 400) * mod(s, "cwMult", 1);
// ── 2단계: 가방 · 차 도감 · 처방 · 노트(자료는 carwash_data.js) ──
export const ITEM = Object.fromEntries(ITEMS.map((x) => [x.id, x])), MODEL = Object.fromEntries(MODELS.map((x) => [x.id, x]));
const SOFT_BAN = ["t60", "pricey", "drip", "scent"]; // 사고까지는 아니고 고객을 잃는 금기
const BAN_MSG = { gloss: "광택 성분이 올라갔다. 번들거리는 얼룩이 남았다. 고객이 사진을 보냈다.", strong: "센 약품이 닿은 자리가 뿌옇게 일어났다. 물이 더는 맺히지 않는다.", one: "통 하나로 닦은 자국이 조명 아래에서 거미줄처럼 보였다.", press: "고압 물줄기가 닿은 자리가 들떴다. 손톱이 들어간다.", abr: "문지른 자리만 결이 달라졌다. 되돌릴 수 없는 종류다.", wet: "물을 너무 썼다. 문틈 고무 아래로 물이 들어갔다.", t60: "고객이 시계를 두 번 봤다. 끝났을 때는 이미 다른 차를 불러 놓았다.", pricey: "재료비를 적어 내자 고객이 웃었다. \"팔 차에 그렇게까지는요.\"", drip: "마르고 나니 물자국이 보였다. 사진에는 더 잘 보였다.", scent: "문을 열자 향이 먼저 나왔다. 아이가 기침을 했다." };
const uniq = (a) => [...new Set(a)];
export const tagN = (t) => TAGS[t] || t;
export const genOf = (C, m) => C?.gen?.[m]?.g || 0;
export const genInfo = (m, g) => (g <= 0 ? { add: [], fine: [], memo: "" } : MODEL[m]?.gens?.[g - 1] || GEN_RULE[(h32(m) + g) % GEN_RULE.length]); // 자료에 없는 세대는 규칙으로 만든다
export const carName = (m, g) => { const M = MODEL[m]; return M ? (g > 0 ? `${M.n} ${g + 1}세대` : M.n) : "?"; };
export const vipName = (v) => `${v.p !== "std" && PAINTS[v.p] ? PAINTS[v.p].n + " · " : ""}${carName(v.m, v.g)}`;
export const svcI = (v) => (v?.s == null ? 1 : Math.max(0, SVC.findIndex((x) => x.id === v.s))); // 상품 번호(0 기본 · 1 꼼꼼 · 2 프리미엄). 적혀 있지 않으면 꼼꼼(예전 저장·법인 차량)
export const svcOf = (v) => SVC[svcI(v)];
export const svcOpen = (s, i) => understanding(s).v >= SVC[i].und;
export const noteKey = (v) => `${v.m}.${v.g}|${v.p}|${v.c}${svcI(v) === 1 ? "" : "|" + svcOf(v).id}`; // 꼼꼼 세차는 꼬리가 없다(예전 노트와 같은 꼴)
export const noteN = (C) => Object.keys(C?.notes || {}).length;
const noteK = (C) => Math.min(CW_BAL.rx.note.max, noteN(C));
export const tierOpen = (s, t) => { const N = TIERS[t]?.need, C = s.carwash; return !!N && understanding(s).v >= N.und && (s.st?.hands || 0) >= N.hands && (C.washes || 0) >= N.washes; }; // 해금: 능력치(손재주) + 업의 이해도 + 누적 대수
// ── 업의 이해도(세 투잡 공통 꼴): 따로 올리는 행동이 없다. 맞춘 처방(노트)이 주, 일한 기간이 보조. 상한 없이 쌓이고 등급과 가상 순위로 보여 준다 ──
export function notePts(key, N) { const [mg, p, c, sv] = key.split("|"), [m, g] = mg.split("."); if (!MODEL[m] || !CUSTS[c]) return 0; const S = specOf({ m, g: +g, p, c, s: sv }); return 10 + 6 * S.need.length + 4 * S.ban.length + 4 * S.fine.length + (N.gr === "S" ? 8 + 3 * S.want.length : 0) + Math.round(CLASSES[MODEL[m].cls].price * 1.5) + (sv === "prem" ? 6 : sv === "basic" ? -4 : 0); } // 어려운 조합일수록 크다
export function understanding(s) { // { v 점수(상한 없음), base 전생에서 가져온 몫, stage 1 초반·2 중반·3 후반, sub, name, rank: { n 등급, i 번호, next 다음 등급까지, top 업계 상위 % } }
  const C = s.carwash || {}, base = Math.round(C.undBase || 0), L = Object.entries(C.notes || {}).sort((a, b) => a[1].t - b[1].t), R = UND.ranks; let sum = 0;
  L.forEach(([k, N], i) => { const [m, g] = k.split("|")[0].split("."); sum += notePts(k, N) * (+g < genOf(C, m) ? UND.stale : 1) / (1 + i / UND.slow); }); // 신형이 나오면 구형 노트는 몫이 준다
  const v = Math.round(base + (sum + Math.min(UND.monthMax, C.months || 0) * UND.month) * (UND.scale || 1)); let i = 0; while (i + 1 < R.length && v >= R[i + 1][1]) i++;
  let n = R[i][0], next = i + 1 < R.length ? R[i + 1][1] - v : null, ri = i;
  if (i === R.length - 1) { const d = Math.floor((v - R[i][1]) / UND.dan); ri = i + d; if (d > 0) n = `${R[i][0]} ${d + 1}단`; next = R[i][1] + (d + 1) * UND.dan - v; } // 끝이 열린 사다리
  return { v, base, stage: v >= UND.stage[1] ? 3 : v >= UND.stage[0] ? 2 : 1, sub: `처방 노트 ${L.length}장`, name: "업의 이해도", rank: { n, i: ri, next, top: Math.max(0.1, Math.round(1000 * Math.exp(-v / UND.top)) / 10) } };
}
export const STAGE_N = ["", "초반: 일 자체가 어려운 때", "중반: 차마다 다른 답을 찾는 때", "후반: 사람을 다루는 때"];
export const tierTop = (s) => [3, 2, 1].find((t) => tierOpen(s, t)) || 0;
const SPEC_ONLY = new Set(Object.keys(TAGS).filter((t) => { const L = ITEMS.filter((x) => x.tags.includes(t)); return L.length && L.every((x) => x.slot === "spec"); })); // 특수 칸 용품으로만 채울 수 있는 꼬리표
export function specOf(v) { // 이 차·상태·고객의 숙제(need) · 세부 숙제(fine, S에 필요) · 금기(ban) · 고객 요구(want)·고객 금기(cban)
  const M = MODEL[v.m], K = CLASSES[M.cls], P = PAINTS[v.p] || PAINTS.std, U = CUSTS[v.c], G = genInfo(v.m, v.g);
  const si = svcI(v), full = uniq([...K.need, ...(M.need || []), ...P.need, ...G.add]), d1 = uniq([...full, ...G.fine.slice(0, 1)]), deep = d1.filter((t) => SPEC_ONLY.has(t)).length <= 2 ? d1 : full; // 상품이 높을수록 숙제가 깊다. 프리미엄은 세부 숙제 하나가 숙제로 올라온다(특수 칸 둘에 다 들어갈 때만)
  return { need: si === 0 ? uniq([...P.need, ...K.need.slice(0, 1)]) : si === 2 ? deep : full, ban: uniq([...K.ban, ...(M.ban || []), ...P.ban]), fine: si === 1 ? G.fine.slice() : si === 2 ? G.fine.filter((t) => !deep.includes(t)) : [], svc: SVC[si], want: U ? U.want.slice() : [], cban: U?.ban || null, hw: M.hw || K.hw, gmemo: G.memo };
}
function hiddenOf(v) { const M = MODEL[v.m], K = CLASSES[M.cls], G = genInfo(v.m, v.g), nb = [...K.need, ...(M.need || [])], bb = [...K.ban, ...(M.ban || [])]; return uniq([...nb.slice(nb.length > 1 ? Math.ceil(nb.length / 2) : 0), ...bb.slice(1), ...G.add, ...G.fine]); }
export function viewOf(C, v) { // 지금 내가 아는 만큼: hid = 아직 "???" 인 꼬리표
  const S = specOf(v), P = PAINTS[v.p] || PAINTS.std, k = new Set(C.dex?.[`${v.m}.${v.g}`]?.k || []), hid = new Set(hiddenOf(v).filter((t) => !k.has(t) && !P.need.includes(t) && !P.ban.includes(t)).slice(Math.floor((C.undBase || 0) / UND.hid))), cbanHid = !!S.cban && !C.cdex?.[v.c] && (C.undBase || 0) < UND.hid * 2; // 전생의 감: 가져온 점수가 클수록 덜 가려진다
  return { ...S, hid, cbanHid, nHid: uniq([...S.need, ...S.fine, ...S.ban]).filter((t) => hid.has(t)).length + (cbanHid ? 1 : 0) };
}
export function rxEval(rx) { // 처방 전체의 꼬리표·시간·재료비
  const tags = new Set(); let min = 0, mat = 0; for (const id of rx || []) { const it = ITEM[id]; if (!it) continue; min += it.min; mat += it.mat; for (const t of it.tags) tags.add(t); }
  mat = Math.round(mat * 100) / 100; if (min <= 45) tags.add("t40"); if (min > 65) tags.add("t60"); if (mat <= 1) tags.add("cheap"); if (mat > 2) tags.add("pricey"); return { tags, min, mat };
}
export function judge(v, rx) { // 금기 → F(사고) · 숙제 둘 이상 빠짐 C · 하나 빠짐 B · 숙제를 다 채움 A · 고객 요구와 세부 숙제까지 S
  const S = specOf(v), E = rxEval(rx), has = (t) => E.tags.has(t), hit = uniq([...S.ban, ...(S.cban ? [S.cban] : [])]).filter(has), miss = S.need.filter((t) => !has(t)), missS = uniq([...S.want, ...S.fine]).filter((t) => !has(t));
  return { grade: hit.length ? "F" : miss.length >= 2 ? "C" : miss.length ? "B" : missS.length ? "A" : "S", hit, hard: hit.filter((t) => !SOFT_BAN.includes(t)), miss, missS, min: E.min, mat: E.mat };
}
const baseOf = (C, v) => C.bases.find((b) => b.id === v.b);
export const vipsAt = (C, b, st) => (C.vips || []).filter((v) => v.b === b.id && (!st || v.st === st));
export const waits = (C) => (C.vips || []).filter((v) => v.st === "wait");
export const roomOf = (C, b) => b.cap - (b.tier ? vipsAt(C, b).length : b.cust);
export const loadOf = (v, min) => Math.round(CLASSES[MODEL[v.m].cls].area * clamp(min / CW_BAL.rx.load, 0.8, 2.2) * 10) / 10; // 한 대가 먹는 체력(일반차 = 1)
export function vipPx(C, v, gr) { if (v.k) return v.x ? CW_BAL.co.exPrice : CW_BAL.co.price; const R = CW_BAL.rx; return Math.round(CLASSES[MODEL[v.m].cls].price * svcOf(v).k * (v.q || 1) * (gr === "S" ? R.sK : 1) * R.px * 10) / 10; } // 차 기준가 × 상품 × 부른 값(내 가격 수준은 받을 때 곱한다). 거점 등급은 값을 올리지 않는다
export const corpOk = (C, k) => !k.m || Object.keys(C.notes || {}).some((key) => key.startsWith(`${k.m}.${k.g || 0}|`)); // 법인 차량: 그 차·그 세대의 노트가 있어야 직원이 제 속도로 돈다
// 가방
export const bagWt = (C) => Math.round((C.bag || []).reduce((a, id) => a + (ITEM[id]?.wt || 0), 0) * 10) / 10;
export const bagFree = (s) => (s.carwash?.vans || 0) > 0; // 작업 차량이 있으면 전부 실린다
export const inBag = (s, id) => !!s.carwash.own?.[id] && (bagFree(s) || (s.carwash.bag || []).includes(id));
export const kit = (s, own) => ITEMS.filter((x) => (own ? s.carwash.own?.[x.id] : inBag(s, x.id)));
export const hasTag = (s, tag) => kit(s).some((x) => x.tags.includes(tag));
export const maxGen = (C) => Object.values(C?.gen || {}).reduce((a, x) => Math.max(a, x.g || 0), 0);
export const itemOpen = (s, it) => (it.from == null || s.t >= it.from) && (it.gen == null || maxGen(s.carwash) >= it.gen);
export const itemCost = (s, it) => Math.round(it.cost * pi(s));
export const wxNeed = (s) => { const w = wxOf(s), o = []; if (w.includes("rain") && w.includes("sun")) o.push("spot"); if (w.includes("ice")) o.push("salt"); return o; }; // 비 온 뒤 물자국 · 겨울 염화칼슘
const wxK = (s, b) => wxNeed(s).reduce((a, w) => a * (hasTag(s, WX_NEED[w].tag) ? CW_BAL.rx.wx[0] : b?.tier ? CW_BAL.rx.wx[1] : 1), 1);
export function suggest(s, v, o = {}) { // 지금 아는 만큼으로 짠 처방(봇·가방 싸기용. 화면에는 안 쓴다). o.own: 가진 것 전부에서 · o.all: 가려진 숙제까지 · o.pool: 용품 목록 지정
  const C = s.carwash, V = viewOf(C, v), vis = (t) => o.all || !V.hid.has(t), need = V.need.filter(vis), ban = new Set([...V.ban.filter(vis), ...(V.cban && (o.all || !V.cbanHid) ? [V.cban] : [])]), want = uniq([...V.want, ...V.fine.filter(vis)]);
  const pool = o.pool || kit(s, o.own), got = new Set(), rx = [];
  for (const sl of SLOTS) {
    let best = null, bs = sl.need ? -1e9 : 0.01;
    for (const it of pool) { if (it.slot !== (sl.of || sl.id) || rx.includes(it.id)) continue; const bad = it.tags.some((t) => ban.has(t)); if (bad && !sl.need) continue;
      const sc = (bad ? -100 : 0) + 3 * it.tags.filter((t) => need.includes(t) && !got.has(t)).length + it.tags.filter((t) => want.includes(t) && !got.has(t)).length - 0.05 * it.mat - 0.004 * it.min; if (sc > bs) { bs = sc; best = it; } }
    rx.push(best ? best.id : ""); if (best) for (const t of best.tags) got.add(t);
  }
  return rx;
}
export function shopFor(s, v, maxTier = 3) { // 보이는 숙제·요구 가운데 가진 용품으로 못 채우는 것 → 살 만한 용품(가장 싼 것). must: 숙제(1)인지 요구(0)인지
  const C = s.carwash, V = viewOf(C, v), vis = (t) => !V.hid.has(t), ban = new Set([...V.ban.filter(vis), ...(V.cban && !V.cbanHid ? [V.cban] : [])]), okIt = (x) => !x.tags.some((y) => ban.has(y)), have = new Set(kit(s, true).filter(okIt).flatMap((x) => x.tags)), out = [];
  for (const [t, must] of [...V.need.filter(vis).map((t) => [t, 1]), ...uniq([...V.want, ...V.fine.filter(vis)]).map((t) => [t, 0])]) { if (have.has(t)) continue;
    const it = ITEMS.filter((x) => x.tags.includes(t) && x.tier <= maxTier && itemOpen(s, x) && !C.own[x.id] && okIt(x)).sort((a, b) => a.cost - b.cost)[0]; if (it && !out.some((y) => y.id === it.id)) out.push({ id: it.id, must, tag: t }); }
  for (const sl of SLOTS) if (sl.need && !kit(s, true).some((x) => x.slot === sl.id && okIt(x))) { const it = ITEMS.filter((x) => x.slot === sl.id && x.tier <= maxTier && itemOpen(s, x) && !C.own[x.id] && okIt(x)).sort((a, b) => a.cost - b.cost)[0]; if (it && !out.some((y) => y.id === it.id)) out.push({ id: it.id, must: 1, tag: sl.id }); } // 그 칸에 금기를 안 건드리는 용품이 하나도 없으면
  return out;
}
export function rxPreview(s, v, rx, qi = 1) { // 처방 카드의 예상(아는 만큼만): 시간 · 재료비 · 받는 값 · 위험
  const C = s.carwash, V = viewOf(C, v), E = rxEval(rx), has = (t) => E.tags.has(t), vis = (t) => !V.hid.has(t);
  const hit = uniq([...V.ban.filter(vis), ...(V.cban && !V.cbanHid ? [V.cban] : [])]).filter(has), miss = V.need.filter((t) => vis(t) && !has(t)), missS = uniq([...V.want, ...V.fine.filter(vis)]).filter((t) => !has(t)), empty = SLOTS.filter((sl, i) => sl.need && !rx[i]).length;
  return { hit, miss, missS, empty, min: E.min + svcOf(v).min, mat: Math.round((E.mat + svcOf(v).mat) * 100) / 100, tags: E.tags, unknown: V.nHid, px: vipPx(C, { ...v, q: v.k ? 1 : MARKET.quote[qi] || 1 }, !miss.length && !missS.length ? "S" : "A", baseOf(C, v)) * (v.k ? 1 : rateOf(C, svcI(v))), mood: v.k ? "" : ((xq) => (xq <= 0.95 ? "기꺼이 낼 듯" : xq <= MARKET.churn.from ? "받아들일 듯" : xq <= 1.3 ? "망설일 듯" : "돌아설 듯"))(priceX(s, svcI(v), baseOf(C, v), CUSTS[v.c]?.px || 1, MARKET.quote[qi] || 1)), risk: hit.length ? "높음" : V.nHid ? "모름" : miss.length ? "보통" : "낮음", load: loadOf(v, E.min + svcOf(v).min) };
}
export function refNote(C, v) { // 참고할 노트: 같은 조합 → 같은 차·상태 → 같은 차 → 구형
  const N = C.notes || {}, ks = Object.keys(N), a = `${v.m}.${v.g}|`, f = (p) => ks.find(p);
  let k = N[noteKey(v)] ? noteKey(v) : null; if (k) return { ...N[k], kind: "exact" };
  k = f((x) => x.startsWith(a + v.p + "|")) || f((x) => x.startsWith(a)); if (k) return { ...N[k], kind: "near" };
  for (let g = v.g - 1; g >= 0; g--) { k = f((x) => x.startsWith(`${v.m}.${g}|`)); if (k) return { ...N[k], kind: "old" }; }
  return null;
}
function syncBase(C, b) { if (!b?.tier) return; const A = vipsAt(C, b, "auto"); b.cust = A.length; if (A.length) { b.px = A.reduce((a, v) => a + (v.px || 0), 0) / A.length; b.mat = A.reduce((a, v) => a + (v.mat || 0), 0) / A.length; b.load = A.reduce((a, v) => a + (v.ld || 1), 0) / A.length; } }
function recon(C) { // 고급 거점: 정기 고객 수(b.cust)와 차 목록을 맞춘다(해지는 잘 안 끊는 고객을 뒤로). 없어진 거점·계약의 차는 지운다
  for (const b of C.bases) if (b.tier) { const A = vipsAt(C, b, "auto"), over = A.length - b.cust; if (over > 0) { const drop = A.slice().sort((x, y) => (x.stay || 0) - (y.stay || 0) || y.since - x.since).slice(0, over).map((v) => v.id); C.vips = C.vips.filter((v) => !drop.includes(v.id)); } syncBase(C, b); }
  const ids = new Set(C.bases.map((b) => b.id)), ks = new Set(C.corps.map((k) => k.id)); C.vips = C.vips.filter((v) => (v.k ? ks.has(v.k) : ids.has(v.b)));
}
function toAuto(C, v, N) { const b = baseOf(C, v), E = rxEval(N.rx); v.st = "auto"; v.gr = N.gr; v.px = vipPx(C, v, N.gr); v.mat = E.mat + svcOf(v).mat; v.ld = loadOf(v, E.min + svcOf(v).min); v.tries = 0; syncBase(C, b); }
export function adopt(C, v, rx, gr = "A") { ensure2(C); C.notes[noteKey(v)] = { rx, gr, t: 0 }; seen(C, v); toAuto(C, v, C.notes[noteKey(v)]); } // 시험 화면용: 노트 한 장과 정기 차 한 대를 바로 만든다
function applyNotes(C) { let n = 0; for (const v of [...C.vips]) if (v.st === "wait") { if (v.k) { const k = C.corps.find((x) => x.id === v.k); if (!k || (v.x ? exOk(C, k) : corpOk(C, k))) C.vips = C.vips.filter((x) => x !== v); continue; } const N = C.notes[noteKey(v)]; if (N) { toAuto(C, v, N); n++; } } return n; }
function learn(C, v, tags) { const key = `${v.m}.${v.g}`, d = (C.dex[key] = C.dex[key] || { k: [], n: 0 }); for (const t of tags) if (!d.k.includes(t)) d.k.push(t); }
function seen(C, v) { const key = `${v.m}.${v.g}`; if (C.dex[key]) return false; C.dex[key] = { k: [], n: 0 }; return true; }
export const eraOf = (s) => { const y = s.t / 12; let e = ERAS[0]; for (const x of ERAS) if (y >= x.y) e = x; return e; };
function wpick(r, arr, w) { const ws = arr.map(w), tot = ws.reduce((a, b) => a + b, 0); if (!(tot > 0)) return null; let x = r.range(0, tot); for (let i = 0; i < arr.length; i++) { x -= ws[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; }
function newVip(s, r, b) { // 고급 거점에 새 차가 온다: 갈래(시대별 비중) → 모델·세대 → 도장 상태 → 고객 유형. 노트에 있는 조합이면 바로 정기로 돈다
  const C = s.carwash, T = TIERS[b.tier], E = eraOf(s), live = (cls) => MODELS.filter((m) => m.cls === cls && (m.from || 0) <= s.t); let c = null, cls = null;
  if (T.cust.includes("collector") && r.chance(CW_BAL.rx.collP)) { c = "collector"; cls = r.chance(E.collect) ? r.pick(["gperf", "rear", "super", "conv"]) : "classic"; } // 해가 갈수록 내연 고성능차가 수집가 쪽으로 넘어온다
  else cls = wpick(r, T.pool.filter((k) => k !== "classic" && live(k).length), (k) => E[CLASSES[k].pw] ?? 1);
  if (!cls) return null;
  const M = r.pick(live(cls)), K = CLASSES[cls], cur = genOf(C, M.id), g = cur > 0 && r.chance(0.35) ? cur - 1 : cur; let p = r.pick(K.paints); if (g < cur && p === "new") p = "std";
  if (!c) { const ok = T.cust.filter((k) => k !== "collector" && (!CUSTS[k].paints || CUSTS[k].paints.includes(p)) && (!CUSTS[k].cls || CUSTS[k].cls.includes(cls))); c = r.pick(ok.length ? ok : ["mania"]); }
  let si = Math.min(wpick(r, [0, 1, 2], (i) => T.svc[i]) ?? 1, CUSTS[c].svcMax ?? 2); while (si > 0 && !svcOpen(s, si)) si--; // 찾는 상품: 고급 거점일수록 높은 상품. 내 이해도가 모자라면 한 단계 낮춰 맡긴다
  const v = { id: "V" + (++C.seq), b: b.id, m: M.id, g, p, c, s: SVC[si].id, st: "wait", since: s.t, tries: 0 }; C.vips.push(v);
  const first = seen(C, v), N = C.notes[noteKey(v)]; if (N) toAuto(C, v, N);
  return { v, first };
}
function corpVip(s, k) { const C = s.carwash, v = { id: "V" + (++C.seq), k: k.id, m: k.m, g: k.g || 0, p: "std", c: "fleet", st: "wait", since: s.t, tries: 0 }; C.vips = C.vips.filter((x) => x.k !== k.id || x.x); C.vips.push(v); seen(C, v); return v; }
// 임원 지정석: 거점이 아니다. 오피스 빌딩 법인 계약 안에서, 같은 주차장의 좋은 자리에 서 있는 임원 차량. 계약이 크고 이해도가 높을수록 대수가 는다. 창구는 수행 기사나 총무 담당
export const exOk = (C, k) => !!k.xm && Object.keys(C.notes || {}).some((key) => key.startsWith(`${k.xm}.${k.xg || 0}|`) && key.split("|")[2] === "boss");
function exSet(s, k, C = s.carwash) { const E = CW_BAL.co.exShare, pool = MODELS.filter((m) => ["exec", "gblack"].includes(m.cls) && (m.from || 0) <= s.t); if (!k.xm) { k.xm = pool[h32(String(k.id) + "x") % pool.length].id; k.xg = genOf(C, k.xm); }
  k.ex = Math.max(k.ex || 0, Math.round(k.cars * (E[0] + E[1] * Math.min(1, (C === s.carwash ? understanding(s).v : 0) / E[2])))); if (!exOk(C, k) && !C.vips.some((v) => v.k === k.id && v.x)) { const v = { id: "V" + (++C.seq), k: k.id, x: 1, m: k.xm, g: k.xg || 0, p: "coat", c: "boss", st: "wait", since: s.t, tries: 0 }; C.vips.push(v); seen(C, v); } }
function genStep(s, r) { // 완전 변경: 모델마다 3~5년에 한 번(자료의 cyc). 처음에는 엇갈리게 깐다
  const C = s.carwash, out = []; C.gen = C.gen || {};
  for (const M of MODELS) { if (!M.cyc?.[1]) continue; const st = M.from || 0, G = C.gen[M.id]; if (!G) { C.gen[M.id] = { g: 0, next: Math.max(s.t, st) + r.int(st > s.t ? M.cyc[0] : 8, M.cyc[1]) }; continue; }
    if (s.t >= G.next && st <= s.t) { G.g++; G.next = s.t + r.int(M.cyc[0], M.cyc[1]); G.t = s.t; out.push(M.id); } }
  return out;
}
export function autoPack(s) { // 노트대로 가방 싸기: 칸마다 하나 → 정기 고객 노트에 많이 쓰는 것 → 기다리는 차에 쓸 것 → 이번 달 날씨 용품
  const C = s.carwash, R = CW_BAL.rx, own = kit(s, true), bag = [], wt = () => bag.reduce((a, id) => a + ITEM[id].wt, 0), add = (id) => { if (id && !bag.includes(id) && C.own[id] && wt() + ITEM[id].wt <= R.wt) bag.push(id); }, cnt = {};
  for (const v of C.vips) if (v.st === "auto") for (const id of C.notes[noteKey(v)]?.rx || []) if (id) cnt[id] = (cnt[id] || 0) + (v.px || 1);
  for (const sl of SLOTS) if (sl.need) add(own.filter((x) => x.slot === sl.id).sort((a, b) => (cnt[b.id] || 0) - (cnt[a.id] || 0) || a.wt - b.wt)[0]?.id);
  for (const id of Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])) add(id);
  for (const v of waits(C)) for (const id of suggest(s, v, { own: true })) add(id);
  for (const w of wxNeed(s)) add(own.find((x) => x.tags.includes(WX_NEED[w].tag))?.id);
  C.bag = bag; return bag;
}
const eligible = (s, b) => vipsAt(s.carwash, b, "auto").filter((v) => bagFree(s) || (s.carwash.notes[noteKey(v)]?.rx || []).every((id) => !id || s.carwash.bag.includes(id))); // 가방에 그 차의 처방 용품이 다 있어야 내가 닦는다
export const washable = (s, b) => (b.hold ? 0 : !b.tier ? b.owed : Math.max(0, Math.min(b.owed, eligible(s, b).length * (CW_BAL.per2 + 1) - (b.done || 0))));
export const perRunX = (b) => (b.tier ? CW_BAL.rx.perRun : perRun(b));
export const classicN = (C) => (C.vips || []).filter((v) => v.st === "auto" && MODEL[v.m]?.cls === "classic").length;
export const keeperOn = (C) => !!C?.keeper && !C.classicBad && classicN(C) >= 1; // 히든 길: 전속 관리인
const STARTERS = ITEMS.filter((x) => x.start).map((x) => x.id);
export const gearCost = (C) => CW_BAL.gear.cost + CW_BAL.rx.gearEach * Math.max(0, Object.keys(C.own || {}).length - STARTERS.length); // 용품이 늘수록 타월·소모품 정비가 비싸진다
const buyPick = (s) => { for (const v of waits(s.carwash)) { const it = shopFor(s, v).map((x) => ITEM[x.id]).find((x) => itemCost(s, x) <= s.cash); if (it) return it.id; } return null; };
// ── 시세와 내 단가(자료: MARKET · SVC) ── 단가 = 차 기준가 × 서비스 상품 × 내 가격 수준. 내 가격 수준은 상품마다(기본·꼼꼼·프리미엄) 따로다. 오토(기본)는 시세를 늦게·낮게 따라가고, 직접 정하면 실력만큼 더 부를 수 있다. 법인 계약은 입찰가라 여기에 안 걸린다
export const rateOf = (C, p) => (C?.rate?.[p || 0] ?? 100) / 100; // 내 가격 수준(기준가 대비 배율). p: 상품 번호
export const priceAuto = (C, p) => C?.pauto?.[p || 0] !== 0;
export const refPrice = (p) => (p ? CLASSES[MARKET.ref].price : CW_BAL.price) * SVC[p].k * CW_BAL.rx.px; // 화면에 보여 줄 기준 값(만원, 물가 전): 일반차·국산 준대형 기준
export const basePx = (C, b) => { const A = vipsAt(C, b, "auto"); return A.length ? A.reduce((a, v) => a + (v.px || 0) * rateOf(C, svcI(v)), 0) / A.length : 6; }; // 고급 거점의 한 대 평균 값(차마다 다르다)
export function marketOf(s, p = 0, dt = 0) { // 그 상품의 요즘 시세(기준가 대비 배율)와 까닭. 판의 씨앗과 달로 정해져 어느 화면에서 봐도 같다
  const M = MARKET, t = s.t + dt, m = (((s.cal || 1) - 1 + dt) % 12 + 12) % 12 + 1, [dk, dEnd] = M.drift[p], y = Math.max(0, t) / 12, drift = dk < 0 ? Math.max(dEnd, 1 + dk * y) : Math.min(dEnd, 1 + dk * y);
  const e = Math.floor(t / M.rivalLen), f = t / M.rivalLen - e, nz = (i) => u01(s, 9000 + i * 7 + p, 3) * 2 - 1, rv = (nz(e) * (1 - f) + nz(e + 1) * f) * M.rival[p], sea = M.season[m] || 0, wet = dt === 0 ? (4 - dryWeeks(s)) * M.wet : 0, why = [];
  if (drift < 0.97) why.push("예약 앱 업체가 늘어 값이 내려왔어요"); if (drift > 1.03) why.push("손이 가는 관리를 맡길 곳이 귀해졌어요");
  if (rv < -0.025) why.push("근처에 싸게 도는 업체가 들어왔어요"); if (rv > 0.025) why.push("근처 업체가 빠져 손이 모자라요");
  if (sea > 0) why.push("먼지가 많은 철이라 찾는 사람이 늘었어요"); if (sea < 0) why.push([6, 7].includes(m) ? "장마철이라 찾는 사람이 줄었어요" : "한겨울이라 찾는 사람이 줄었어요"); if (wet < -0.015) why.push("비·결빙 주가 많아요");
  return { k: Math.round(drift * (1 + rv) * (1 + sea + wet) * 100) / 100, why };
}
export function priceTol(s, b, p = 0) { // 실력 웃돈: 업의 이해도 · 거점 평판 · S 노트 비율이 높을수록 같은 값에서 문의가 덜 준다
  const T = MARKET.tol, C = s.carwash, N = Object.values(C.notes || {}), L = b ? [b] : C.bases.filter((y) => (p ? y.tier : !y.tier)), sat = L.length ? L.reduce((a, y) => a + y.sat, 0) / L.length : 50;
  return Math.min(T.undMax, understanding(s).v / T.und) + clamp((sat - 50) / T.sat, T.satLo, T.satHi) + (N.length ? T.s * N.filter((n) => n.gr === "S").length / N.length : 0);
}
export const priceX = (s, p, b, wtp = 1, q = 1, pct) => (pct ?? s.carwash.rate[p]) / 100 * q / marketOf(s, p).k / (1 + priceTol(s, b, p)) / wtp; // 체감 가격(1 = 딱 시세)
export const demandK = (x) => (x <= 1 ? Math.min(MARKET.cheapMax, 1 + MARKET.cheap * (1 - x)) : Math.max(0, 1 - MARKET.dear * (x - 1))); // 문의 배율
const mixOf = (b) => TIERS[b?.tier || 0].svc;
export const baseX = (s, b) => mixOf(b).reduce((a, w, i) => a + (w ? w * priceX(s, i, b) : 0), 0); // 그 거점에서 팔리는 상품 비중으로 본 체감 가격
export const baseDemand = (s, b) => mixOf(b).reduce((a, w, i) => a + (w ? w * demandK(priceX(s, i, b)) : 0), 0);
export const askN = (d) => MARKET.ask.find(([v]) => d >= v)[1];
export const autoTarget = (s, p) => 100 * marketOf(s, p, -MARKET.auto.lag).k * (MARKET.auto.k + MARKET.auto.tol * priceTol(s, null, p)); // 오토가 향하는 값: 시세보다 조금 낮게, 웃돈은 조금만, 두 달 늦게
export function raiseLoss(s, p, pct, b) { const R = MARKET.raise, d = pct / s.carwash.rate[p] - 1; return d <= 0 ? 0 : clamp((d * R.k + Math.max(0, d - R.big) * R.bigK) * (priceX(s, p, b, 1, 1, pct) <= 1 ? R.under : 1), 0, 0.7); } // 값을 올리면 떠나는 정기 고객의 몫
export const priceSvcs = (s) => [0, 1, 2].filter((i) => !i || (s.carwash.bases.some((b) => b.tier) && (svcOpen(s, i) || s.carwash.vips.some((v) => !v.k && svcI(v) === i)))); // 값을 정할 수 있는 상품: 기본 + 고급 거점이 있고 팔 수 있는 상품
export function priceView(s, p, pct) { // 화면용: 시세 · 내 단가 · 시세 대비 % · 문의 감(정확한 숫자는 숨긴다)
  const C = s.carwash, mk = marketOf(s, p), v = pct ?? C.rate[p], base = refPrice(p), loss = raiseLoss(s, p, v, null), au = autoTarget(s, p), tol = priceTol(s, null, p);
  return { svc: p, auto: priceAuto(C, p), mk: mk.k, why: mk.why, pct: v, cur: C.rate[p], ratio: Math.round(v / mk.k), won: base * v / 100, mkWon: base * mk.k, autoWon: base * au / 100, autoRatio: Math.round(au / mk.k), ask: askN(demandK(priceX(s, p, null, 1, 1, v))),
    leave: loss <= 0 ? "" : loss < 0.04 ? "거의 없음" : loss < 0.15 ? "몇 명" : "여럿", skill: tol >= 0.3 ? "많이" : tol >= 0.15 ? "꽤" : tol >= 0.05 ? "조금" : "거의 없음", canSet: C.rateT[p] !== s.t };
}
function ensure2(C) { // 2단계 저장 항목(없으면 기본값): 입문 가방부터
  if (!C.own) { C.own = {}; for (const id of STARTERS) C.own[id] = 1; } if (!C.bag) C.bag = STARTERS.slice();
  C.vips = C.vips || []; C.notes = C.notes || {}; C.warn = C.warn || {}; C.dex = C.dex || {}; C.cdex = C.cdex || {}; C.gen = C.gen || {};
  for (const k of ["acc", "rxN", "rxS", "buzz", "studyN", "undBase"]) C[k] = C[k] || 0; C.undAt = C.undAt || {}; C.undSt = C.undSt || 1; if (C.packT == null) C.packT = -1; C.rate = (C.rate || [100, 100, 100]).slice(0, 3); C.rateT = (C.rateT || [-1, -1, -1]).slice(0, 3); C.pauto = (C.pauto || [1, 1, 1]).slice(0, 3); /* 가격 수준: 상품별(기본·꼼꼼·프리미엄). 예전 저장은 기준가 100%에 오토로 시작 */ if (C.genSceneT == null) C.genSceneT = -99;
}

function newLead(s, r, first, tier = 0) {
  const C = s.carwash, [n, cap] = first ? ["내가 사는 오피스텔", 5] : r.pick(BLD), zone = first ? 0 : r.chance(0.6) ? 0 : 1;
  if (tier) { const T = TIERS[tier], zn = r.chance(0.5) ? 0 : 1, L2 = { id: "L" + (++C.seq), n: r.pick(TIER_BLD[tier]), tier, zone: zn, cap: r.int(T.cap[0], T.cap[1]), drain: r.chance(0.6), dc: r.int(T.dc[0], T.dc[1]), tries: 0, x: zn ? r.pick([r.int(6, 20), r.int(80, 92)]) : r.int(30, 68), y: r.int(14, 78) }; C.leads.push(L2); return L2; }
  const L = { id: "L" + (++C.seq), n: `${n} 지하 주차장`, zone, cap: first ? cap : clamp(cap + r.int(-1, 2), 3, 14), drain: first ? true : r.chance(0.4), dc: first ? 25 : r.int(35, 75), tries: 0, x: zone ? r.pick([r.int(6, 20), r.int(80, 92)]) : r.int(30, 68), y: r.int(14, 78) };
  C.leads.push(L); return L;
}
function newCorp(s, r) { const C = s.carwash, z = CW_BAL.co.size; const c = { id: "K" + (++C.seq), n: r.pick(CORP_N), cars: r.int(z[0], z[1]), since: s.t, end: s.t + CW_BAL.co.term }; C.corps.push(c);
  const pool = MODELS.filter((m) => (m.cls === "exec" || (m.cls === "evsedan" && eraOf(s).ev >= 1.5)) && (m.from || 0) <= s.t); c.m = r.pick(pool).id; c.g = genOf(C, c.m); if (!corpOk(C, c)) corpVip(s, c); // 법인 차량은 한 차종으로 통일돼 있다. 그 차의 노트가 없으면 처방부터
  exSet(s, c); return c; }
function dropBase(C, b, forced) { C.bases = C.bases.filter((x) => x !== b); if (forced) C.lost = (C.lost || 0) + 1; else C.closed = (C.closed || 0) + 1; }
function setOwed(C) { for (const b of C.bases) { b.owed = b.cust * CW_BAL.per2 + (b.back || 0); b.done = 0; } }
function pay(s, C, v, o, withIns = true) { const c = Math.round(v * pi(s) * (withIns ? insCut(C) : 1)); s.cash -= c; addMoney(s, "exp", "세차 비용", c); C.mCost = (C.mCost || 0) + c; o.push(`돈 −${won(c)}${withIns && C.ins ? " (보험 적용)" : ""}`); return c; }
function earn(s, C, v) { s.cash += v; addMoney(s, "inc", "세차 수입", v); }

// ── 사건 다섯(업계 골칫거리) ──
function ev(s, r, id, b) {
  const C = s.carwash, P = pi(s), bn = b?.n || "거점", help = bldHelp(s), keys = []; let t, x, c;
  if (id === "complain") {
    t = "주민 민원"; x = `${bn}. 엘리베이터에 쪽지가 붙었다. "주차장에서 장사해도 되나요?" 관리사무소에서 전화가 왔다. 승인을 다시 보겠다고 한다. 이 건물 정기 고객은 ${b?.cust ?? 0}명이다.`;
    c = [{ t: help ? "주민 대표를 만난다(관리 쪽 아는 사람이 다리를 놓아 준다)" : "주민 대표를 만난다", check: { stat: "talk", dc: Math.round(52 - 15 * Math.min(1, help)) }, ok: { text: "작업 자리와 시간, 물 처리 방법을 종이 한 장에 적어 갔다. 대표가 게시판에 붙여 줬다. 민원은 거기서 멈췄다.", eff: {} }, ng: { text: "\"우리는 외부 영업 자체가 싫어요.\" 말이 안 통했다. 관리사무소가 당분간 작업을 멈춰 달라고 했다.", eff: { mental: -4 } } },
      { t: "작업 시간을 평일 밤으로 옮긴다", eff: {}, text: "차가 다 들어온 밤 10시 이후에만 하기로 했다. 민원은 줄었다. 내 잠도 줄었다." },
      { t: "이 거점을 접는다", eff: { mental: -2 }, text: "고객들에게 한 명씩 전화했다. 장비를 싣고 나오는데 경비 아저씨가 미안해했다." }];
    keys.push("meet", "move", "drop");
  } else if (id === "water") {
    const fee = Math.round(CW_BAL.waste * P);
    t = "회수한 물을 어디에"; x = `${bn}에는 물을 버릴 곳이 없다. 닦고 남은 물은 통에 담아 들고 나와야 한다. 처리업체에 물었더니 월 최소 요금이 ${won(fee)}이라고 한다. 지금 내 건수로는 큰돈이다.`;
    c = [{ t: `계약한다(월 ${won(fee)})`, eff: {}, text: "수거 통 두 개와 계약서를 받았다. 달마다 돈이 나간다. 대신 누가 물어도 내놓을 종이가 생겼다." },
      { t: "계약하고, 건수를 늘려 메운다", eff: { hp: -4 }, text: "계약서에 서명한 날 저녁에 전단을 다시 뽑았다. 최소 요금을 넘기려면 차가 더 있어야 한다." },
      { t: "집에서 버린다", eff: {}, text: "통을 화장실까지 들고 올라갔다. 이번 달은 돈이 남았다. 욕실 바닥에 검은 물때가 남았다." }];
    keys.push("contract", "more", "dump");
  } else if (id === "scratch") {
    t = "도장에 흠집"; x = `${bn}의 검은 세단. 고객이 사진을 보냈다. 문짝에 가는 줄이 여러 개다. 타월에 모래가 남은 줄 모르고 닦은 것 같기도 하고, 원래 있던 것 같기도 하다.${C.photo ? " 작업 전에 찍어 둔 사진이 휴대폰에 있다." : " 작업 전 사진은 찍어 두지 않았다."}`;
    c = [];
    if (C.photo) { c.push({ t: "작업 전 사진을 같이 본다", eff: {}, text: "고객과 주차장에서 사진을 나란히 놓고 봤다." }); keys.push("photo"); }
    if (hasTag(s, "grit")) { c.push({ t: "거름판과 미트를 꺼내 공정을 보여 준다", eff: {}, text: "통 바닥의 거름판과 색깔별 미트를 주차장 바닥에 늘어놓았다. 어느 미트로 어디를 닦았는지 순서대로 짚었다." }); keys.push("grit"); }
    if (C.ins) { c.push({ t: "보험으로 접수한다", eff: {}, text: "사고 접수 번호를 고객에게 보냈다. 자기부담금은 내가 냈다." }); keys.push("ins"); }
    c.push({ t: "내 돈으로 수리해 준다", eff: {}, text: "아는 광택집에 맡겼다. 사흘 뒤 고객이 차를 한 바퀴 돌아보고 고개를 끄덕였다." }); keys.push("self");
    if (!C.photo) { c.push({ t: "원래 있던 흠집이라고 한다", check: { stat: "talk", dc: 66 }, ok: { text: "고객은 한참 사진을 보다가 알겠다고 했다. 증거는 나에게도 없었다.", eff: { mental: -2 } }, ng: { text: "\"지난주엔 없었어요.\" 고객은 정기 관리를 끊었다. 그 건물 단체 대화방에 사진이 올라갔다.", eff: { mental: -6 } } }); keys.push("deny"); }
  } else if (id === "tar") {
    const add = Math.round(15 * P);
    t = "와 보니 타르 범벅"; x = `${bn}. 새로 온 고객의 흰색 SUV다. 보내 준 사진과 다르다. 하체와 문짝 아래가 타르와 철분으로 덮여 있다. 고객은 "온 김에 해 주세요"라고 한다. 추가 요금 ${won(add)}을 말해 볼 수는 있다. 내 약품으로 될지는 모르겠다.`;
    c = [{ t: "오늘은 못 한다고 한다", eff: {}, text: "\"이건 출장으로 할 작업이 아니에요.\" 전문 업체 두 곳을 적어 주고 장비를 다시 실었다. 이동비만 썼다." },
      { t: `추가 요금을 받고 한다`, check: { stat: "hands", dc: 62 }, ok: { text: "타르 제거제를 조금씩 올리고 기다렸다. 두 시간 반이 걸렸다. 흰색이 돌아왔다.", eff: { hp: -3 } }, ng: { text: "급한 마음에 문질렀다. 타르는 지워졌고 도장이 같이 뿌옇게 일어났다.", eff: { hp: -5, mental: -5 } } }];
    keys.push("refuse", "do");
    if (hasTag(s, "tar")) { c.splice(1, 0, { t: "가방의 타르 제거제로 불려서 닦는다(추가 요금)", eff: { hp: -2 }, text: "제거제를 뿌리고 기다렸다. 타르가 갈색 물로 흘러내렸다. 문지르지 않았다. 흰색이 돌아왔다." }); keys.splice(1, 0, "tarkit"); }
  } else {
    const back = backAll(C), n = C.bases.filter((y) => y.back > 0).reduce((a, y) => a + Math.min(y.cust, y.back), 0), refund = Math.round(back * CW_BAL.price * rateOf(C, 0) * P);
    t = "3주 연속 비"; x = `${season(s) || "이번 달"}. 세 주를 내리 못 나갔다. 정기 고객 ${n}명의 ${back}회차가 밀렸다. "이번 달은 언제 오세요?" 문자가 쌓인다.`;
    c = [{ t: "평일 밤에 몰아서 한다", eff: { hp: -10, ...(out(s) ? {} : { eye: 6 }) }, text: "퇴근하고 지하 주차장으로 갔다. 사흘 밤을 새벽 1시까지 닦았다. 다음 날 회의에서 졸았다." },
      { t: `밀린 회차를 환불한다(−${won(refund)})`, eff: {}, text: "밀린 회차 값만큼 돌려주고 사과 문자를 보냈다. 답장은 대부분 짧았다. \"괜찮아요. 다음 달에 봬요.\"" },
      { t: "다음 달로 넘긴다", eff: {}, text: "\"날씨 때문에 다음 달에 몰아서 해 드릴게요.\" 답이 없는 고객이 몇 있다." }];
    keys.push("night", "refund", "push");
  }
  s._cwEv = { id, b: b?.id, keys };
  return { kind: "event", tag: "출장 세차", title: t, text: x, onChoose: "cw_ev", choices: c };
}

export default {
  key: "carwash", prefix: "cw_", hubName: "출장 세차",
  init: (s) => { const C0 = { v: 3, undBase: Math.max(0, Math.round(UNDBASE || s?.ng?.und?.carwash || 0)), bases: [], leads: [], corps: [], seq: 0, gear: 100, photo: false, waste: 0, ins: 0, dump: 0, fines: 0, lost: 0, closed: 0, lv: 0, runs: 0, cars: 0, promoN: 0, promoX: 1, care: 0, staff: 0, vans: 0, washes: 0, months: 0, cum: 0, hist: [], last: null, evT: -99, rainT: -99, mRev: 0, mCost: 0, mT: -1,
    g: { site: false, bid: false, crew: false, ins: false }, place: false, siteT: null, dep: 0, invest: 0, bidN: 0, bidT: -1, proT: null, strike: 0 }; ensure2(C0); return C0; },
  money: { inc: ["세차 수입"], exp: ["세차 비용"] },
  actions: {
    cw_scout: { n: "거점 찾기", ap: 1, hp: 2, desc: "내 동선 안팎의 건물을 돌아봐요. 주차 규모·배수·관리사무소 분위기가 보여요", stat: { sense: 0.3 } },
    cw_talk: { n: "관리사무소 설득", ap: 1, hp: 2, desc: "승인을 받아야 그 건물에서 일할 수 있어요(말빨 판정). 관리 쪽에 아는 사람이 있으면 쉬워져요", stat: { talk: 0.4 } },
    cw_wash: { n: "세차 돌기", ap: 1, hp: 5, desc: "한 거점에서 세 대까지(동선 밖은 두 대). 맑은 주에만, 체력이 되는 만큼만", stat: { hands: 0.4, body: 0.2 } },
    cw_gear: { n: "약품·타월 정비", ap: 1, hp: 1, desc: "타월을 삶고 약품을 채워요. 미루면 흠집 사고가 나요" },
    cw_promo: { n: "정기 고객 모으기", ap: 1, hp: 2, desc: "거점 건물 안에서만 모아요. 같은 건물에 세 대가 모이면 한 번에 돌 수 있어요", stat: { talk: 0.2, mkt: 0.2 } },
    cw_photo: { n: "작업 전 사진 찍기 켜기/끄기", ap: 0, hp: 0, desc: "차마다 네 면을 찍어 둬요. 조금 더 지치지만 흠집 시비에서 갈려요" },
    cw_deal: { n: "보험·처리업체 계약/해지", ap: 1, hp: 1, desc: "배상 보험과 폐수 처리업체. 달마다 돈이 나가요" },
    cw_hire: { n: "사람 구하기/내보내기", ap: 1, hp: 2, desc: "구하면 내가 못 돈 회차를 대신 돌고 거점을 한 곳 더 맡아요(한 명마다 챙길 일이 늘어요). 내보내면 맡을 수 있는 거점이 줄고, 회사 직원이면 마지막 월급이 나가요. 접으려면 먼저 내보내야 해요" },
    cw_care: { n: "사람 챙기기", ap: 1, hp: 2, mental: -1, desc: "같이 돌며 가르치고, 사고를 되짚어요. 두 명에 한 번. 안 하면 그만두거나 사고가 나요", stat: { talk: 0.3 } },
    cw_gate: { n: "본업화 관문 풀기", ap: 1, hp: 3, desc: "사업장·신고 → 법인 입찰 → 직원·차량 → 보험 한도. 거점 세 곳·정기 스무 명·누적 2,000대부터 열려요" },
    cw_bid: { n: "법인 계약 입찰", ap: 1, hp: 3, desc: "법인 차량 관리 계약을 하나 더 따요(말빨·숫자 판정). 낮 미팅이라 회사를 다니는 동안은 불리해요", stat: { num: 0.3, talk: 0.2 } },
    cw_van: { n: "작업 차량 늘리기", ap: 1, hp: 2, desc: "차량 한 대에 직원 세 명, 법인 계약 두 건을 더 맡을 수 있어요" },
    cw_buy: { n: "용품 사기", ap: 0, hp: 0, desc: "가방에 넣을 용품을 사요. 용품마다 값·한 대 재료비·걸리는 시간·무게가 달라요" },
    cw_pack: { n: "가방 싸기", ap: 0, hp: 0, desc: "이번 달 도는 거점에 맞춰 싸요. 무게 제한이 있어요. 한 번 메고 나가면 그달은 못 바꿔요" },
    cw_rx: { n: "처방 짜서 닦기", ap: 1, hp: 6, desc: "처음 보는 차·새 고객은 공정마다 용품을 골라요. 맞추면 노트에 남고 다음부터 자동으로 돌아요", stat: { hands: 0.5, sense: 0.2 } },
    cw_price: { n: "단가 정하기", ap: 0, hp: 0, desc: "서비스 상품마다 내 값을 정해요. 오토에 맡기거나 직접 정해요. 직접 정하면 한 달에 한 번 바꿀 수 있어요" },
    cw_study: { n: "차 조사하기", ap: 1, hp: 1, desc: "가려진 숙제(???)를 미리 알아봐요. 그냥 닦으며 몸으로 배워도 돼요", stat: { sense: 0.3 } },
  },
  can(s, id, arg) {
    const C = s.carwash, B = CW_BAL, G = B.gate;
    if (id === "cw_scout" && arg === "hi" && !tierTop(s)) return `고급 거점은 누적 ${TIERS[1].need.washes}대를 닦은 뒤에 보여요(지금 ${C.washes}대)`;
    if (id === "cw_scout") return C.leads.length >= B.lead.max ? "봐 둔 건물이 세 곳이에요. 먼저 관리사무소에 가 봐요" : C.bases.length >= baseMax(s) ? `지금은 거점 ${baseMax(s)}곳까지예요(사람을 쓰면 늘어요)` : null;
    if (id === "cw_talk") { if (!C.leads.length) return "봐 둔 건물이 없어요. 거점 찾기부터"; if (C.bases.length >= baseMax(s)) return `지금은 거점 ${baseMax(s)}곳까지예요(사람을 쓰면 늘어요)`; const L = arg ? C.leads.find((x) => x.id === arg) : C.leads.find((x) => x.talkT !== s.t); return !L || L.talkT === s.t ? "이번 달은 이미 찾아갔어요. 다음 달에 다시 가요" : null; }
    if (id === "cw_wash") {
      const L = C.bases.filter((b) => washable(s, b) > 0 && (!arg || b.id === arg)); if (!L.length) { const hb = arg && C.bases.find((b) => b.id === arg && b.hold); return hb ? "이 거점은 작업이 멈춰 있어요" : C.bases.some((b) => !b.hold && b.owed > 0 && (!arg || b.id === arg)) ? "가방에 그 거점 차의 처방 용품이 없어요. 다음 달에 가방을 다시 싸요" : "이번 달 남은 회차가 없어요. 정기 고객을 모아요"; }
      if (C.runs >= runCap(s)) return dryWeeks(s) ? "이번 달 맑은 날은 다 썼어요" : "이번 달은 맑은 주가 없어요";
      return C.cars >= carCap(s) ? `이번 달 체력 상한(${carCap(s)}대)을 채웠어요` : null;
    }
    if (id === "cw_gear") return C.gear >= 90 ? "아직 쓸 만해요" : null;
    if (id === "cw_promo") { if (!C.bases.some((b) => !b.hold && roomOf(C, b) > 0 && (!arg || b.id === arg))) return C.bases.length ? "고객을 더 받을 자리가 없어요" : "승인받은 거점이 있어야 해요"; return C.promoN >= B.promo.max ? "이번 달은 충분히 돌렸어요" : null; }
    if (id === "cw_deal") return arg === "ins" && C.ins === 2 ? "회사 보험은 해지할 수 없어요" : arg === "waste" && C.g.site && C.waste ? "신고한 사업장은 처리업체 계약을 끊을 수 없어요" : null;
    if (id === "cw_hire" && arg === "out") return C.staff ? null : "내보낼 사람이 없어요";
    if (id === "cw_hire") return C.lv < 2 ? `거점 ${B.lv[1][0]}곳·정기 ${B.lv[1][1]}명부터 사람을 쓸 수 있어요` : C.staff >= staffCap(s) ? (isCo(s) ? `차량 ${C.vans}대로는 ${staffCap(s)}명까지예요` : `회사가 되기 전에는 ${B.crew.max}명까지예요`) : null;
    if (id === "cw_care") return !C.staff ? "같이 일하는 사람이 없어요" : C.care >= careNeed(C) ? "이번 달은 다 챙겼어요" : null;
    if (id === "cw_gate") {
      if (!gateOpen(C)) return `거점 ${B.lv[2][0]}곳·정기 ${B.lv[2][1]}명·누적 ${G.washes}대가 되면 열려요(지금 ${C.bases.length}곳·${custAll(C)}명·${C.washes}대)`;
      const k = GATES[gateStep(C)]?.[0]; if (!k) return "관문을 모두 풀었어요";
      if (k === "site") { if (C.siteT != null) return "신고 결과를 기다리는 중이에요"; const pc = siteCost(s), need = pc.dep + pc.fit; if (s.cash + creditRoom(s) * 0.6 + 1500 < need) return `사업장에 ${won(need)}이 들어요(보증금 + 폐수 처리 시설)`; }
      if (k === "bid" && understanding(s).v < UND.bid) return `법인 입찰은 업의 이해도 ${UND.bid}점부터예요(지금 ${understanding(s).v}점. 처방을 맞추거나 더 오래 하면 올라요)`;
      if (k === "bid" && C.bidT === s.t) return "이번 달 입찰은 끝났어요. 다음 달에 다시";
      if (k === "crew") { const need = Math.round((G.van + G.hire * Math.max(0, 2 - C.staff)) * pi(s)); if (s.cash + creditRoom(s) * 0.6 + 1500 < need) return `차량과 채용에 ${won(need)}이 들어요`; }
      return null;
    }
    if (id === "cw_bid") return !isCo(s) ? "차량 관리 회사가 된 뒤에 열려요" : C.bidT === s.t ? "이번 달 입찰은 끝났어요" : C.corps.length >= corpMax(s) ? `차량 ${C.vans}대로는 계약 ${corpMax(s)}건까지예요` : null;
    if (id === "cw_van") { if (!isCo(s)) return "차량 관리 회사가 된 뒤에 열려요"; if (C.vans >= B.co.vanMax) return "더 늘릴 수 없어요"; if (C.staff < staffCap(s)) return `지금 차량 팀을 먼저 채워요(직원 ${C.staff}/${staffCap(s)})`; const need = Math.round(G.van * pi(s)); return s.cash + creditRoom(s) * 0.6 + 1500 < need ? `차량 한 대에 ${won(need)}이 들어요` : null; }
    if (id === "cw_buy") { const it = ITEM[arg] || ITEM[buyPick(s)]; if (!it) return arg ? "없는 용품이에요" : "지금 꼭 살 용품은 없어요. 보드의 용품 가게에서 골라요"; if (C.own?.[it.id]) return "이미 있어요"; if (!itemOpen(s, it)) return "아직 가게에 없어요"; return s.cash < itemCost(s, it) ? `${it.n}에 ${won(itemCost(s, it))}이 들어요` : null; }
    if (id === "cw_pack") { if (bagFree(s)) return "작업 차량에 전부 실려 있어요"; if (C.packT === s.t) return "이번 달은 이미 가방을 메고 나갔어요. 다음 달에 다시 싸요"; if (!arg || arg === "auto") return null; const it = ITEM[arg]; if (!it || !C.own?.[arg]) return "없는 용품이에요"; return !C.bag.includes(arg) && bagWt(C) + it.wt > B.rx.wt ? `가방이 넘쳐요(무게 ${bagWt(C)}/${B.rx.wt})` : null; }
    if (id === "cw_price") { const [ts, vs] = String(arg || "").split(":"), t = +ts, M = MARKET; if (!arg || !(t >= 0 && t < SVC.length) || !C.rate) return "보드의 단가표에서 정해요"; if (vs === "auto") return priceAuto(C, t) ? "이미 오토예요" : null; if (vs === "manual") return priceAuto(C, t) ? null : "이미 직접 정하고 있어요";
      const p = +vs; if (!(p >= M.min && p <= M.max) || p % M.step) return `단가는 기준가의 ${M.min}~${M.max}% 사이에서 ${M.step}%씩 정해요`; if (C.rateT[t] === s.t) return "이번 달은 이미 값을 바꿨어요. 다음 달에 다시"; return p === C.rate[t] && !priceAuto(C, t) ? "지금 값이에요" : null; }
    if (id === "cw_study") { const v = arg ? (C.vips || []).find((x) => x.id === arg) : waits(C).find((x) => viewOf(C, x).nHid > 0); return v && viewOf(C, v).nHid > 0 ? null : "가려진 숙제가 있는 차가 없어요"; }
    if (id === "cw_rx") {
      const [vid, rs] = String(arg || "").split(":"), v = (C.vips || []).find((x) => x.id === vid && x.st === "wait") || (!arg ? waits(C)[0] : null); if (!v) return "처방을 기다리는 차가 없어요";
      const b = v.k ? null : C.bases.find((x) => x.id === v.b); if (b?.hold) return "이 거점은 작업이 멈춰 있어요"; if (!v.k && !dryWeeks(s)) return "이번 달은 맑은 주가 없어요"; if (C.cars >= carCap(s)) return `이번 달 체력 상한(${carCap(s)}대)을 채웠어요`;
      const rx = rs != null ? rs.split(",") : suggest(s, v); for (let i = 0; i < SLOTS.length; i++) { const it = ITEM[rx[i]]; if (!it) { if (SLOTS[i].need) return `${SLOTS[i].n} 칸이 비었어요`; continue; } if (it.slot !== (SLOTS[i].of || SLOTS[i].id) || !inBag(s, it.id) || rx.indexOf(rx[i]) !== i) return `가방에 없어요: ${it.n}`; }
      return null;
    }
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const C = s.carwash, B = CW_BAL, P = pi(s), G = B.gate; ensure2(C); if (C.mT !== s.t) { C.mT = s.t; C.mRev = 0; C.mCost = 0; C.runs = 0; C.cars = 0; C.promoN = 0; C.care = 0; setOwed(C); }
    const cost = (v) => { const c = Math.round(v); s.cash -= c; addMoney(s, "exp", "세차 비용", c); C.mCost += c; return c; };
    const borrow = (need) => { const lack = need - s.cash; if (lack > 0) { addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; } s.cash -= need; addMoney(s, "exp", "세차 비용", need); };
    if (id === "cw_scout" && arg === "hi") { const top = tierTop(s), hi = r.chance(0.65) ? top : r.int(1, top), L = newLead(s, r, false, hi); return { lines: [`봐 둔 곳: ${L.n}`, `${TIERS[hi].short || TIERS[hi].n} · 자리 ${L.cap}대 · ${L.zone ? "동선 밖" : "동선 안"}`, "여기 차는 처방을 짜야 해요. 꼼꼼 세차·프리미엄 케어를 찾는 사람이 많아요"], msg: hi >= 3 ? "차고 문이 열리자 덮개를 쓴 차가 세 대 보였다. 관리인이 내 손부터 봤다." : hi === 2 ? "일요일 아침, 주차장에 같은 색 차가 한 대도 없었다. 다들 자기 타월을 들고 있었다." : "지하 3층까지 내려갔다. 기둥마다 번호가 아니라 이름표가 붙어 있었다." }; }
    if (id === "cw_scout") { const L = newLead(s, r); return { lines: [`봐 둔 건물: ${L.n}`, `${L.zone ? "동선 밖(한 번에 2대)" : "동선 안(한 번에 3대)"} · 주차 ${L.cap}대 규모`, L.drain ? "배수 시설을 쓸 수 있어요" : "물 버릴 곳이 없어요(회수해서 처리)"], msg: L.zone ? "퇴근길에서 삼십 분을 더 가야 한다. 차는 많다." : "집과 회사 사이에 있다. 주차장 구석에 수도와 배수구를 확인했다." }; }
    if (id === "cw_talk") {
      const L = (arg && C.leads.find((x) => x.id === arg)) || C.leads.find((x) => x.talkT !== s.t), p = talkP(s, L); L.talkT = s.t;
      if (r.chance(p)) { C.leads = C.leads.filter((x) => x !== L); const b = { id: "B" + (++C.seq), n: L.n, tier: L.tier || 0, zone: L.zone, cap: L.cap, drain: L.drain, x: L.x, y: L.y, cust: 0, owed: 0, back: 0, done: 0, sat: 50, since: s.t, hold: 0, night: 0 }; C.bases.push(b); log(s, `${L.n}에서 출장 세차 승인을 받았다.`, "work");
        return { lines: [`승인: ${b.n}`, "이제 이 건물에서 정기 고객을 모을 수 있어요"], msg: bldHelp(s) ? "아는 분이 미리 말을 넣어 줬다. 소장님이 작업 자리를 직접 짚어 줬다. \"B2 기둥 뒤, 주말 오전만요.\"" : "작업 자리, 시간, 물 처리 방법을 한 장에 적어 갔다. 소장님이 도장을 찍었다. \"민원 들어오면 바로 그만입니다.\"" }; }
      L.tries++; if (L.tries >= B.lead.tries) { C.leads = C.leads.filter((x) => x !== L); return { lines: ["거절당했어요", "이 건물은 더 찾아가기 어려워요"], msg: "\"외부 영업은 안 받습니다.\" 세 번째에는 문도 열어 주지 않았다." }; }
      return { lines: ["이번에는 승인을 못 받았어요", `다음 달에 다시 갈 수 있어요(${L.tries}/${B.lead.tries})`], msg: "\"입주민 회의에 올려 볼게요.\" 명함만 두고 나왔다." };
    }
    if (id === "cw_wash") {
      const val = (y) => Math.min(washable(s, y), perRunX(y)) * (y.tier ? basePx(C, y) : B.price * rateOf(C, 0)), L = C.bases.filter((b) => washable(s, b) > 0 && (!arg || b.id === arg)).sort((a, b) => val(b) - val(a) || a.zone - b.zone), b = L[0];
      const ld = b.tier ? b.load || 1.2 : 1, wk = wxK(s, b), n = Math.max(1, Math.min(perRunX(b), washable(s, b), Math.floor((carCap(s) - C.cars) / ld))), rev = Math.round(n * (b.tier ? basePx(C, b) * (1 + noteK(C) * B.rx.note.px) : B.price * rateOf(C, 0)) * P * qual(s) * K * wk), c = cost((n * (b.tier ? b.mat || 1 : B.mat) + (b.zone ? B.tripOut : B.trip)) * P); C.packT = s.t; if (wk < 1) b.sat = clamp(b.sat - 1, 0, 100);
      b.owed -= n; b.done += n; b.back = Math.max(0, (b.back || 0) - n); C.runs++; C.cars = Math.round((C.cars + n * ld) * 10) / 10; C.washes += n; C.gear = Math.max(0, C.gear - n * B.gear.use); earn(s, C, rev); C.mRev += rev;
      b.sat = clamp(b.sat + 1.5 * n * boost * (C.gear < B.gear.low ? 0.3 : 1), 0, 100);
      const xh = (C.photo ? B.photoHp : 0) + (b.zone ? B.outHp : 0) + (b.night > 0 ? B.nightHp : 0); if (xh) s.hp = Math.max(1, s.hp - xh);
      return { lines: [`${b.n} ${n}대`, `수입 +${won(rev - c)}`, n < perRunX(b) ? "차가 모자라 한 번 돈 값이 덜 나왔어요" : `이번 달 ${C.cars}/${carCap(s)}대`, ...(wk > 1 ? ["날씨에 맞는 용품을 챙겨 값을 더 받았어요"] : wk < 1 ? [`${wxNeed(s).map((w) => WX_NEED[w].n).join(" · ")}: 맞는 용품이 없어 값을 덜 받았어요`] : [])], msg: r.pick(n >= 3 ? ["기둥 하나를 사이에 두고 세 대를 연달아 닦았다. 장비를 한 번만 펼쳤다.", "물통을 한 번만 채웠다. 세 대가 같은 층에 있었다."] : b.zone ? ["가는 데 사십 분, 오는 데 사십 분. 닦은 시간보다 길었다.", "장비를 싣고 내리는 데 힘을 다 썼다."] : ["한 대를 닦으려고 장비를 다 펼쳤다. 접는 데도 같은 시간이 들었다.", "위에서 아래로, 휠은 마지막에. 순서를 지켰다."]) };
    }
    if (id === "cw_gear") { const c = cost(gearCost(C) * P); C.gear = 100; return { lines: ["장비 상태 100", `비용 −${won(c)}`], msg: "타월을 색깔별로 삶았다. 휠 닦는 타월은 따로 둔다." }; }
    if (id === "cw_promo") {
      const b = C.bases.filter((y) => !y.hold && roomOf(C, y) > 0 && (!arg || y.id === arg)).sort((a, y) => (a.cust >= 3) - (y.cust >= 3) || a.zone - y.zone)[0];
      const dK = baseDemand(s, b), gain = clamp(Math.round((1 + ((s.st.talk || 0) + (s.st.mkt || 0)) / 140 + (b.sat - 50) / 80 + 0.4 * r.normal()) * boost * C.promoX * SJ.ramp(s, "carwash") * mod(s, "cwCust", 1) * dK), 0, 3), n = Math.min(gain, roomOf(C, b));
      if (b.tier) { const got = []; for (let i = 0; i < Math.min(n, 2); i++) { const x = newVip(s, r, b); if (x) got.push(x); } C.promoN++; C.promoX = 1; const au = got.filter((x) => x.v.st === "auto").length; if (au) b.owed += au; // 고급 거점: 사람이 아니라 차가 온다
        return { lines: got.length ? [`${b.n} 문의 +${got.length}대`, ...got.map((x) => `${vipName(x.v)} · ${CUSTS[x.v.c].n}${x.v.st === "auto" ? " · 노트에 있어 바로 정기로" : " · 처방 대기"}`)] : [dK < 0.6 ? "값을 듣고 돌아선 사람이 있었어요. 시세보다 비싸요" : "이번에는 연락이 없었어요"], msg: got.length ? (got.some((x) => x.first) ? "처음 보는 차다. 한 바퀴 돌며 도장부터 살폈다." : "명함을 받은 사람이 차 키를 들고 내려왔다.") : "여기 사람들은 이미 맡기는 곳이 있다고 했다." }; }
      C.promoN++; C.promoX = 1; b.cust += n; if (n) { b.owed += n; }
      return { lines: n ? [`${b.n} 정기 고객 +${n}명`, `이 건물 ${b.cust}/${b.cap}명`] : [dK < 0.6 ? "값을 듣고 돌아선 사람이 있었어요. 시세보다 비싸요" : "이번에는 연락이 없었어요"], msg: n ? r.pick(["엘리베이터 게시판에 한 장 붙였다. 같은 층 두 집이 같이 신청했다.", "닦고 있는 차 옆에 선 사람이 물었다. \"우리 차도 돼요?\""]) : "전단은 붙였다. 사흘 뒤에 가 보니 다른 전단에 덮여 있었다." };
    }
    if (id === "cw_photo") { C.photo = !C.photo; return { lines: [C.photo ? "작업 전 사진을 찍어요" : "작업 전 사진을 안 찍어요"], msg: C.photo ? "앞, 뒤, 양옆. 흠집이 있으면 가까이서 한 장 더." : "오늘부터는 바로 물부터 뿌린다." }; }
    if (id === "cw_deal") {
      const k = arg === "ins" || arg === "waste" ? arg : needWaste(C) && !C.waste ? "waste" : !C.ins ? "ins" : C.waste && !needWaste(C) && !C.g.site ? "waste" : "ins";
      if (k === "waste") { C.waste = C.waste ? 0 : 1; if (C.waste) C.dump = 0; return { lines: [C.waste ? "처리업체 계약" : "처리업체 계약 해지", C.waste ? `월 ${won(Math.round(B.waste * P))}` : "회수한 물은 내가 알아서 해야 해요"], msg: C.waste ? "수거 통 두 개가 트렁크에 실렸다." : "통을 돌려보냈다." }; }
      if (C.ins === 2) return { lines: ["회사 보험은 그대로 둬요"], msg: "" };
      C.ins = C.ins ? 0 : 1; return { lines: [C.ins ? "배상 보험 가입" : "배상 보험 해지", C.ins ? `월 ${won(Math.round(B.ins[1] * P))} · 사고가 나면 내 부담이 줄어요` : "사고는 전부 내 돈이에요"], msg: C.ins ? "약관에서 '보장하지 않는 손해'부터 읽었다." : "이번 달부터 보험료가 안 나간다." };
    }
    if (id === "cw_hire" && arg === "out") { const co = isCo(s), c = co ? cost(B.co.wage * P) : 0; C.staff--; C.care = Math.min(C.care, careNeed(C)); const over = C.bases.length - baseMax(s); return { lines: [`${co ? "직원" : "주말 알바"} 한 명을 내보냈어요(남은 ${C.staff}명)`, ...(c ? [`마지막 월급 −${won(c)}`] : []), ...(over > 0 ? [`맡을 수 있는 거점이 ${baseMax(s)}곳으로 줄어요. 지금 거점은 그대로지만 새로 늘릴 수 없어요`] : []), ...(co && C.corps.length ? ["법인 대수를 못 채우면 계약이 끊길 수 있어요"] : [])], msg: "마지막 날 장비를 같이 닦았다. 타월은 가져가라고 했다." }; }
    if (id === "cw_hire") { const co = isCo(s), c = cost((co ? G.hire : B.crew.hire) * P); C.staff++; return { lines: [co ? `직원 ${C.staff}/${staffCap(s)}명` : `주말 알바 ${C.staff}/${staffCap(s)}명`, `${co ? `월급 ${won(Math.round(B.co.wage * P))}` : `한 대에 ${man1(B.crew.pay * P)}씩`} · 사람 챙기기 ${careNeed(C)}번 필요`, `비용 −${won(c)}`], msg: "첫 주는 같이 돌았다. 타월 접는 법부터 가르쳤다." }; }
    if (id === "cw_care") { C.care++; return { lines: [`사람 챙기기 ${C.care}/${careNeed(C)}`], msg: r.pick(["한 대를 같이 닦았다. 손이 빨라졌다. 순서는 아직 틀린다.", "지난달 흠집 건을 같이 되짚었다. 탓하는 자리가 아니라고 먼저 말했다.", "밥을 샀다. 어느 건물이 제일 힘든지 들었다."]) }; }
    if (id === "cw_gate") {
      const k = GATES[gateStep(C)][0];
      if (k === "site") { const { dep, fit } = siteCost(s), tot = dep + fit; borrow(tot); C.place = true; C.dep = dep; C.invest = (C.invest || 0) + tot; C.siteT = s.t + G.mo; C.waste = 1; C.dump = 0; log(s, `세차 사업장을 구했다. ${won(tot)}`, "work");
        return { lines: ["사업장을 구하고 폐수 처리 시설 신고를 넣었어요", `보증금 ${won(dep)} · 시설 ${won(fit)}`, `신고를 마칠 때까지 시간이 걸려요 · 월세 ${won(Math.round(G.rent * P))}이 나가기 시작해요`, "서류와 입찰 준비로 내 세차 건수가 줄어요"], msg: "바닥에 물이 모이는 자리를 내고 처리 설비를 들였다. 서류 봉투를 들고 담당 창구에서 번호표를 뽑았다." }; }
      if (k === "bid") { C.bidT = s.t; if (r.chance(bidP(s))) { const c = newCorp(s, r); C.g.bid = true; log(s, `법인 차량 관리 계약을 땄다. ${c.n}`, "work"); return { lines: ["관문 2/4 통과 · 법인 입찰", `${c.n} 월 ${c.cars}대`, "직원과 차량을 갖추면 계약이 시작돼요"], msg: "단가표와 작업 일정표, 사고 났을 때의 처리 순서를 한 묶음으로 냈다. 담당자가 마지막 장을 오래 봤다." }; }
        C.bidN++; return { lines: ["입찰에서 떨어졌어요", "다음 달에 다시 넣을 수 있어요(경험이 쌓여요)"], msg: "단가는 우리가 낮았다. \"직원 수가 적어서요.\" 떨어진 이유를 받아 적었다." }; }
      if (k === "crew") { const add = Math.max(0, 2 - C.staff), tot = Math.round((G.van + G.hire * add) * P); borrow(tot); C.staff = Math.max(2, C.staff); C.vans = 1; C.care = careNeed(C); C.invest = (C.invest || 0) + Math.round(G.van * P); C.g.crew = true; return { lines: ["관문 3/4 통과 · 직원 두 명과 작업 차량", `비용 −${won(tot)}`, `월급 1인 ${won(Math.round(B.co.wage * P))}`], msg: "물탱크와 발전기를 실은 차가 왔다. 옆면에 상호를 붙였다." }; }
      if (k === "ins") { C.ins = 2; C.g.ins = true; C.proT = s.t; C.lv = 4; C.care = Math.max(C.care, careNeed(C)); log(s, "배상 보험 한도를 올렸다. 이제 차량 관리 회사다.", "work"); return { lines: ["관문 4/4 통과 · 보험 한도", "차량 관리 회사가 됐어요", "법인 계약이 시작돼요 · 입찰과 차량 늘리기가 열려요"], msg: "법인 담당자가 보험 증권 사본을 받고서야 차 키 상자를 넘겨줬다." }; }
    }
    if (id === "cw_bid") { C.bidT = s.t; if (r.chance(bidP(s) * boost)) { const c = newCorp(s, r); C.bidN = Math.max(0, C.bidN - 1); return { lines: [`법인 계약 +1: ${c.n}`, `월 ${c.cars}대 · 계약 ${C.corps.length}/${corpMax(s)}건`], msg: "지난 계약의 작업 기록을 그대로 들고 갔다. 숫자가 말을 대신했다." }; } C.bidN++; return { lines: ["입찰에서 떨어졌어요"], msg: "큰 업체가 단가를 더 낮췄다. 다음 공고를 적어 뒀다." }; }
    if (id === "cw_van") { const need = Math.round(G.van * P); borrow(need); C.vans++; C.invest = (C.invest || 0) + need; log(s, `작업 차량 ${C.vans}호를 들였다. ${won(need)}`, "work"); return { lines: [`작업 차량 ${C.vans}대`, `직원 ${staffCap(s)}명 · 법인 계약 ${corpMax(s)}건까지`], msg: "두 번째 차는 다른 구로 보낸다. 이제 내가 못 가는 곳에서도 일이 돈다." }; }
    if (id === "cw_buy") { const it = ITEM[arg] || ITEM[buyPick(s)], c = cost(itemCost(s, it)); C.own[it.id] = 1; const fit = bagFree(s) || bagWt(C) + it.wt <= B.rx.wt; if (fit && !C.bag.includes(it.id)) C.bag.push(it.id);
      return { lines: [`${it.n} (${SLOTS.find((x) => x.id === it.slot).n} · ${TIER_N[it.tier]})`, `값 −${won(c)}`, fit ? "가방에 넣었어요" : "가방이 꽉 찼어요. 다음에 쌀 때 넣어요"], msg: it.memo || "포장을 뜯고 뒷면의 쓰는 법부터 읽었다." }; }
    if (id === "cw_pack") {
      if (!arg || arg === "auto") { autoPack(s); return { lines: [`가방 무게 ${bagWt(C)}/${B.rx.wt}`, `용품 ${C.bag.length}개`], msg: "노트를 펴 놓고 이번 달 차들을 떠올리며 쌌다." }; }
      const it = ITEM[arg], on = C.bag.includes(arg); C.bag = on ? C.bag.filter((x) => x !== arg) : [...C.bag, arg]; return { lines: [`${it.n} ${on ? "뺐어요" : "넣었어요"}`, `가방 무게 ${bagWt(C)}/${B.rx.wt}`], msg: "" };
    }
    if (id === "cw_price") { const [ts, vs] = String(arg).split(":"), t = +ts, nm = SVC[t].n, M = MARKET, w = (pc) => man1(refPrice(t) * pc / 100 * P);
      if (vs === "auto") { C.pauto[t] = 1; return { lines: [`${nm}: 오토`, "시세를 보고 알아서 맞춰요. 조금 낮게, 조금 늦게 따라가요"], msg: "값은 장부에 맡기고 손은 차에 둔다." }; }
      if (vs === "manual") { C.pauto[t] = 0; C.rate[t] = clamp(Math.round(C.rate[t] / M.step) * M.step, M.min, M.max); return { lines: [`${nm}: 직접 정하기`, `지금 값 ${w(C.rate[t])}에서 시작해요`, "한 달에 한 번 바꿀 수 있어요"], msg: "단가표를 새로 뽑았다. 숫자는 내가 적는다." }; }
      const p = +vs, old = C.rate[t], lines = []; let lost = 0;
      for (const b of C.bases) { if (!b.tier && t) continue; const f = raiseLoss(s, t, p, b); if (f <= 0) continue; // 값을 올리면 기존 정기 고객 일부가 떠난다(지불 의사가 높은 고객은 덜)
        if (!b.tier) { let q = 0; for (let j = b.cust; j > 0; j--) if (r.chance(f)) q++; b.cust -= q; lost += q; } else for (const v of vipsAt(C, b, "auto")) if (svcI(v) === t && r.chance(clamp(f / (CUSTS[v.c]?.px || 1) * (v.stay ? 0.5 : 1), 0, 0.9))) { C.vips = C.vips.filter((y) => y !== v); lost++; } }
      C.pauto[t] = 0; C.rate[t] = p; C.rateT[t] = s.t; recon(C); for (const b of C.bases) { b.owed = Math.min(b.owed, b.cust * B.per2 + (b.back || 0)); b.back = Math.min(b.back || 0, b.owed); }
      const V = priceView(s, t); lines.push(`${nm} 단가 ${w(old)} → ${w(p)}`, `시세의 ${V.ratio}% · 문의 ${V.ask}`); if (lost) lines.push(`값을 올리자 정기 고객 ${lost}명이 끊었어요`);
      return { lines, msg: p > old ? "단가표의 숫자를 고쳐 적었다. 보내기 전에 한 번 더 봤다." : "값을 내렸다. 내린 만큼 더 닦아야 한다." }; }
    if (id === "cw_study") { const v = (arg && C.vips.find((x) => x.id === arg)) || waits(C).find((x) => viewOf(C, x).nHid > 0), S0 = specOf(v); learn(C, v, [...S0.need, ...S0.fine, ...S0.ban]); C.cdex[v.c] = 1; C.studyN++;
      return { lines: [`${carName(v.m, v.g)}의 숙제를 알아냈어요`, ...(S0.need.length ? [`숙제: ${S0.need.map(tagN).join(" · ")}`] : []), ...(S0.fine.length ? [`세부: ${S0.fine.map(tagN).join(" · ")}`] : []), ...(S0.ban.length ? [`금기: ${S0.ban.map(tagN).join(" · ")}`] : []), `${CUSTS[v.c].n}이 싫어하는 것: ${CUSTS[v.c].hate}`], msg: r.pick(["동호회 게시판의 세차 글을 끝까지 읽었다. 댓글에 답이 있었다.", "같은 차를 타는 사람에게 커피를 샀다. 닦다가 망한 이야기를 세 개 들었다.", "취급 설명서의 '외장 관리' 장을 찾아 읽었다. 하지 말라는 것부터 적었다."]) }; }
    if (id === "cw_rx") {
      const [vid, rs, qs] = String(arg || "").split(":"), v = C.vips.find((x) => x.id === vid && x.st === "wait") || waits(C)[0], rx = rs != null ? rs.split(",") : suggest(s, v), b = baseOf(C, v), R = B.rx, J = judge(v, rx), KL = CLASSES[MODEL[v.m].cls], U = CUSTS[v.c], nm = vipName(v), key = `${v.m}.${v.g}`, lines = [];
      v.q = v.k ? 1 : MARKET.quote[qs == null || qs === "" ? 1 : +qs] || 1; const tr = svcI(v), xq = v.k ? 0 : priceX(s, tr, b, U.px || 1, v.q), ld = loadOf(v, J.min + svcOf(v).min), full = vipPx(C, v, J.grade === "S" ? "S" : "A") * P * qual(s) * K * boost * (v.k ? 1 : rateOf(C, tr) * (1 + noteK(C) * R.note.px) * wxK(s, b)), gone = () => { C.vips = C.vips.filter((x) => x !== v); syncBase(C, b); };
      cost((J.mat + svcOf(v).mat + (b?.zone ? B.tripOut : B.trip)) * P); C.cars = Math.round((C.cars + ld) * 10) / 10; C.washes++; C.gear = Math.max(0, C.gear - B.gear.use); C.packT = s.t; C.rxN++; C.cdex[v.c] = 1; v.tries = (v.tries || 0) + 1; v.wT = s.t; (C.dex[key] = C.dex[key] || { k: [], n: 0 }).n++;
      learn(C, v, [...J.hit, ...J.miss]);
      if (J.grade === "F") { // 금기를 건드렸다
        const t0 = J.hard[0] || J.hit[0], W = (C.warn[key] = C.warn[key] || []); for (const t of J.hit) if (!W.includes(t)) W.push(t);
        if (J.hard.length) { C.acc++; if (KL === CLASSES.classic || v.c === "collector") C.classicBad = 1; lines.push(`사고: ${J.hard.map(tagN).join(" · ")}`); pay(s, C, KL.price * R.restore, lines); if (b) b.sat = clamp(b.sat - 12, 0, 100); log(s, `${nm}에 사고를 냈다. ${tagN(t0)}.`, "work"); }
        else { lines.push(`고객이 돌아섰어요: ${J.hit.map(tagN).join(" · ")}`); if (b) b.sat = clamp(b.sat - 6, 0, 100); }
        if (!v.k) { gone(); lines.push("이 고객은 다시 오지 않아요"); } lines.push("틀린 이유를 노트에 경고로 적었어요");
        return { lines, msg: BAN_MSG[t0] || "닦고 난 자리가 닦기 전보다 나빴다." };
      }
      if (J.grade === "B" || J.grade === "C") { // 숙제를 못 채웠다
        const rev = Math.round(full * (J.grade === "B" ? R.bK : R.cK)); earn(s, C, rev); C.mRev += rev; lines.push(`만족 ${J.grade} · 못 채운 숙제: ${J.miss.map(tagN).join(" · ")}`, `수입 +${won(rev)}`);
        if (!v.k && v.tries >= R.tries) { gone(); if (b) b.sat = clamp(b.sat - 4, 0, 100); lines.push("세 번을 못 맞췄어요. 고객이 다른 곳을 찾았어요"); } else lines.push("숙제가 드러났어요. 다음에 다시 짜요");
        return { lines, msg: "닦고 나서 같이 한 바퀴 돌았다. 고객의 눈이 한 군데에 오래 머물렀다. 거기가 숙제였다." };
      }
      const hag = !v.k && xq > MARKET.churn.from && r.chance(clamp((xq - MARKET.churn.from) * 2, 0, 0.9)), rev = Math.round(hag ? full / v.q : full), S0 = specOf(v), /* 부른 값이 지불 의사를 넘으면: 기본 값만 받고 정기로는 안 맡긴다 */ nk = noteKey(v), old = C.notes[nk]; earn(s, C, rev); C.mRev += rev; learn(C, v, [...S0.need, ...S0.fine, ...S0.ban]);
      if (!old || (old.gr !== "S" && J.grade === "S")) C.notes[nk] = { rx: rx.slice(0, SLOTS.length), gr: J.grade, t: s.t }; if (J.grade === "S") C.rxS++;
      lines.push(`만족 ${J.grade} · 처방 노트에 저장(${noteN(C)}장)`, `수입 +${won(rev)}`); if (J.grade === "A" && J.missS.length) lines.push(`S까지 남은 것: ${J.missS.map(tagN).join(" · ")}`);
      if (hag && b) { const d = Math.min(MARKET.overSat[1], Math.max(1, Math.round((xq - MARKET.churn.from) * MARKET.overSat[0]))); b.sat = clamp(b.sat - d, 0, 100); lines.push(`부른 값이 과했어요. 기본 값만 받았어요(그 건물 평판 −${d})`); } // 넘은 폭이 클수록 평판이 더 깎인다
      if (v.x) { const k = C.corps.find((x) => x.id === v.k); gone(); lines.push("임원 지정석 차량을 이제 노트대로 맡아요(이 자리 차는 한 대 값이 높아요)"); if (k && J.grade === "S" && !k.exMore) { k.exMore = 1; k.ex = (k.ex || 0) + 2; lines.push("기사님이 다른 임원 차도 맡겼어요: 임원 지정석 +2대"); } }
      else if (v.k) { const k = C.corps.find((x) => x.id === v.k); gone(); lines.push("이제 직원들이 이 차를 노트대로 닦아요"); if (k && J.grade === "S" && !k.more) { k.more = 1; k.cars += 10; lines.push(`${U.winN}: 월 +10대`); } }
      else if (U.win === "once") { gone(); lines.push("한 번 맡기고 간 손님이에요. 노트는 남아요"); }
      else if (hag) { gone(); lines.push("값을 듣고 망설였어요. 한 번만 맡기고 갔어요. 노트는 남아요"); }
      else { toAuto(C, v, C.notes[nk]); if (v.q < 1) { v.stay = 1; lines.push("깎아 준 값을 고마워해요(잘 안 끊어요)"); } if (b) { b.owed += 1; b.sat = clamp(b.sat + (J.grade === "S" ? 5 : 3), 0, 100); } lines.push("이 고객은 다음 달부터 노트대로 자동으로 돌아요");
        if (J.grade === "S") { if (U.win === "club") C.buzz += 2; else if (U.win === "insta") C.buzz += 1; else if (U.win === "corp") C.bidN++; else if (U.win === "stay") v.stay = 1; else if (U.win === "refer" && b && roomOf(C, b) > 0 && r.chance(0.6)) newVip(s, r, b); lines.push(`${U.n}: ${U.winN}`); } }
      const more = applyNotes(C); if (more) lines.push(`같은 조합으로 기다리던 차 ${more}대도 정기로`);
      if (!C.keeper && !C.classicBad && classicN(C) >= 3) { C.keeper = s.t; lines.push("수집가가 차고 열쇠를 맡겼어요: 전속 관리인"); log(s, "수집가의 차고 열쇠를 받았다. 전속 관리인.", "work"); }
      return { lines, msg: J.grade === "S" ? r.pick(["\"얼룩 하나 없네요. 다음 달도 부탁드려요.\" 고객이 차 문을 두 번 열었다 닫았다.", "고객이 휴대폰 불빛을 도장에 비췄다. 한참 보다가 고개를 끄덕였다.", "끝나고 공정을 순서대로 말해 줬다. 고객이 받아 적었다."]) : r.pick(["숙제는 다 했다. 고객이 바라던 한 가지는 다음에 맞추기로 했다.", "차는 깨끗해졌다. 고객은 고맙다고만 했다. 다음 달 날짜를 잡았다."]) };
    }
    return { lines: [], msg: "" };
  },
  choose: {
    cw_ev(s, r, i, ok) {
      const C = s.carwash, B = CW_BAL, E = s._cwEv || {}, k = E.keys?.[i], b = C.bases.find((x) => x.id === E.b), o = [], P = pi(s);
      const sat = (v) => { if (b) { b.sat = clamp(b.sat + v, 0, 100); o.push(`그 건물 평판 ${v > 0 ? "+" : ""}${v}`); } }, lose = (n) => { if (b && n > 0) { const m = Math.min(b.cust, n); b.cust -= m; b.owed = Math.max(0, b.owed - m * B.per2); b.back = Math.min(b.back || 0, b.cust * B.per2); if (m) o.push(`정기 고객 −${m}명`); } };
      if (E.id === "complain") {
        if (k === "meet") { if (ok) { sat(10); if (b && b.cust < b.cap) { b.cust++; o.push("주민 대표가 자기 차도 맡겼어요(정기 +1)"); } } else if (b) { if (r.chance(0.35)) { dropBase(C, b, true); o.push("승인이 취소됐어요. 거점을 잃었어요"); } else { b.hold = 2; o.push("이 거점은 두 달 동안 작업을 못 해요"); } } }
        else if (k === "move") { if (b) { b.night = 12; o.push("이 거점은 한 해 동안 밤에만 작업해요(더 지쳐요)"); } sat(3); }
        else if (b) { dropBase(C, b, false); o.push("거점을 접었어요"); }
      } else if (E.id === "water") {
        if (k === "dump") { C.dump = 1; o.push("처리 비용 0", "단속에 걸릴 수 있어요"); } else { C.waste = 1; C.dump = 0; o.push(`처리업체 계약 · 월 ${won(Math.round(B.waste * P))}`); if (k === "more") { C.promoX = 2; o.push("다음 '정기 고객 모으기' 효과 2배"); } }
      } else if (E.id === "scratch") {
        if (k === "grit") { if (r.chance(0.8)) { sat(8); o.push("공정을 본 고객이 수긍했어요. 내 미트가 낸 줄이 아니에요"); } else { o.push("그래도 줄은 줄이라고 해요"); pay(s, C, 60, o); sat(3); } }
        else if (k === "photo") { if (r.chance(0.65)) { sat(8); o.push("사진에 같은 줄이 있었어요. 원래 있던 흠집이에요"); } else { o.push("사진에는 없던 줄이에요. 내가 낸 흠집이 맞아요"); pay(s, C, 60, o); sat(4); } }
        else if (k === "ins") { pay(s, C, 60, o); sat(2); }
        else if (k === "self") { pay(s, C, 60, o, false); sat(6); }
        else if (ok) { C.deny = (C.deny || 0) + 1; } else { lose(2); sat(-15); }
      } else if (E.id === "tar") {
        if (k === "refuse") { sat(2); C.refuse = (C.refuse || 0) + 1; o.push("거절도 일이에요"); } else if (ok || k === "tarkit") { const a = Math.round(15 * P); earn(s, C, a); C.mRev = (C.mRev || 0) + a; o.push(`추가 요금 +${won(a)}`); sat(4); } else { pay(s, C, 90, o); sat(-8); lose(1); }
      } else if (E.id === "rain3") {
        if (k === "night") { let n = 0; for (const y of C.bases) { const d = Math.round((y.back || 0) * 0.7); y.back -= d; y.owed = Math.max(0, (y.owed || 0) - d); n += d; } const rev = Math.round(n * B.price * rateOf(C, 0) * P * qual(s) * K); earn(s, C, rev); C.mRev = (C.mRev || 0) + rev; C.washes += n; o.push(`밀린 ${n}회차를 끝냈어요`, `수입 +${won(rev)}`); }
        else if (k === "refund") { let n = 0; for (const y of C.bases) { if (y.back) y.sat = clamp(y.sat + 4, 0, 100); n += y.back || 0; y.owed = Math.max(0, (y.owed || 0) - (y.back || 0)); y.back = 0; } const c = Math.round(n * B.price * rateOf(C, 0) * P); s.cash -= c; addMoney(s, "exp", "세차 비용", c); C.mCost = (C.mCost || 0) + c; o.push(`환불 −${won(c)}`, "밀린 회차 0"); }
        else { let n = 0; for (const y of C.bases) if (y.back) { y.sat = clamp(y.sat - 10, 0, 100); for (let j = y.cust; j > 0; j--) if (r.chance(0.12)) { y.cust--; n++; } y.back = Math.min(y.back, y.cust * B.per2); } o.push(n ? `기다리다 지친 정기 고객 −${n}명` : "이번에는 다들 기다려 줬어요"); }
      }
      recon(C);
      return o;
    },
  },
  eff(s, e, out2) { // 장면 전용 효과 키(2단계 인물·지도 장면에서 쓸 것): cw_cust 정기 고객 + · cw_sat 거점 평판 ± · cw_gear 장비 상태 +
    const C = s.carwash; if (!C) return;
    if (e.cw_cust) { const b = C.bases.filter((x) => x.cust < x.cap).sort((a, y) => y.cust - a.cust)[0]; if (b) { const n = Math.min(e.cw_cust, b.cap - b.cust); b.cust += n; out2.push(`세차 정기 고객 +${n}명`); } }
    if (e.cw_sat) { for (const b of C.bases) b.sat = clamp(b.sat + e.cw_sat, 0, 100); if (C.bases.length) out2.push(`거점 평판 ${e.cw_sat > 0 ? "+" : ""}${e.cw_sat}`); }
    if (e.cw_gear) { C.gear = clamp(C.gear + e.cw_gear, 0, 100); out2.push(`세차 장비 상태 +${e.cw_gear}`); }
  },
  monthStart(s) { const C = s.carwash; C.mT = s.t; C.mRev = 0; C.mCost = 0; C.runs = 0; C.cars = 0; C.promoN = 0; C.care = 0; setOwed(C); },
  month(s, r, notes, scenes) {
    const C = s.carwash, B = CW_BAL, P = pi(s), co = isCo(s), wx = wxOf(s), dry = wx.filter((x) => x === "sun").length, wet = 4 - dry; if (C.mT !== s.t) { C.mT = s.t; C.mRev = 0; C.mCost = 0; C.runs = 0; C.cars = 0; C.promoN = 0; C.care = 0; setOwed(C); }
    ensure2(C); const R = B.rx; let profit = (C.mRev || 0) - (C.mCost || 0), rev = 0, cost = 0; const mine = C.cars;
    // 사람: 못 챙기면 그만두거나 일이 거칠어진다
    const need = careNeed(C), lack = Math.max(0, need - C.care); let acc = false;
    if (C.staff && lack > 0) { let q = 0; for (let i = 0; i < Math.min(C.staff, lack * B.careEach); i++) if (r.chance(B.crew.quitP)) q++; if (q) { C.staff = Math.max(0, C.staff - q); C.strike = (C.strike || 0) + q; notes.push(`출장 세차: 못 챙긴 사이 ${q}명이 그만뒀어요.`); } else if (r.chance(0.25)) { acc = true; const c = Math.round(50 * P * insCut(C)); cost += c; notes.push(`출장 세차: 혼자 보낸 사람이 휠에 흠집을 냈어요. 수리비 ${won(c)}${C.ins ? "(보험 적용)" : ""}.`); } else notes.push("출장 세차: 이번 달 사람 챙기기가 모자랐어요. 그만둘 사람이 생길 수 있어요."); }
    // 직원이 도는 몫: 법인 계약(회사만, 실내 작업이 섞여 날씨를 절반만 탄다) → 남는 손으로 거점의 남은 회차
    let capS = Math.round(C.staff * (co ? B.co.per : B.crew.per) * (lack ? 0.85 : 1)), corpDem = 0, corpDone = 0, resDone = 0;
    if (co && C.corps.length) { corpDem = C.corps.reduce((a, c) => a + c.cars, 0); const effC = C.corps.reduce((a, c) => a + c.cars * (corpOk(C, c) ? 1 : R.corpNo), 0) / Math.max(1, corpDem), wf = (0.5 + 0.5 * dry / 4) * effC; // 노트에 없는 차(신형 포함)를 맡은 계약은 직원 손이 느리다
      corpDone = Math.min(corpDem, Math.round(capS * wf)); capS = Math.max(0, capS - Math.round(corpDone / wf)); rev += Math.round(corpDone * B.co.price * P * qual(s) * K);
      { const exN = C.corps.reduce((a, c) => a + (exOk(C, c) ? c.ex || 0 : 0), 0) * Math.min(1, corpDone / Math.max(1, corpDem)); rev += Math.round(exN * (B.co.exPrice - B.co.price) * P * qual(s) * K); } // 임원 지정석: 노트가 있어야 그 자리 값을 받는다(없으면 다른 법인 차와 같은 값)
      if (corpDone < corpDem * 0.75 && wet < 3 && r.chance(B.co.lose)) { const c = C.corps.pop(); notes.push(`출장 세차: ${c.n} 계약이 끊겼어요. 약속한 대수를 못 채웠어요. 직원을 늘리거나 계약을 줄여요.`); } }
    if (co) for (const c of [...C.corps]) if (c.end != null && s.t >= c.end) { // 계약 기간이 끝나면 재입찰: 그동안 대수를 채웠으면 유리하다
      if (r.chance(clamp(renewP(s) + (corpDone >= corpDem * 0.9 ? 0.05 : -0.2), 0.2, 0.95))) { c.end = s.t + B.co.term; exSet(s, c); notes.push(`출장 세차: ${c.n} 계약을 2년 더 이어 가요.`); } else { C.corps = C.corps.filter((y) => y !== c); notes.push(`출장 세차: ${c.n} 재입찰에서 졌어요. 계약이 끝났어요. 새 입찰을 넣어요.`); } }
    let resCap = Math.round(capS * dry / 4);
    let resRev = 0, resMat = 0; // 고급 거점의 정기 차는 모두 노트에 있는 차다. 사람들은 노트대로 닦는다(처방 대기 차는 못 맡는다)
    for (const b of C.bases.slice().sort((a, y) => y.owed - a.owed)) { if (b.hold || resCap <= 0) continue; const ld = b.tier ? b.load || 1.2 : 1, n = Math.min(b.owed, Math.floor(resCap / ld)); if (n <= 0) continue; b.owed -= n; b.done += n; b.back = Math.max(0, (b.back || 0) - n); resCap -= n * ld; resDone += n; resRev += n * (b.tier ? basePx(C, b) * (1 + noteK(C) * R.note.px) : B.price * rateOf(C, 0)); resMat += n * (b.tier ? b.mat || 1 : B.mat); b.sat = clamp(b.sat + n * (lack ? 0.3 : 0.8), 0, 100); }
    rev += Math.round(resRev * P * qual(s) * 0.95 * K); C.washes += corpDone + resDone;
    if (C.staff) cost += co ? Math.round(C.staff * B.co.wage * P) : Math.round(resDone * B.crew.pay * P); cost += Math.round((corpDone * B.mat + resMat) * P + (C.vans || 0) * B.co.vanKeep * P);
    // 밀린 회차와 해지: 못 돈 회차는 다음 달로 넘어간다. 반 달치 넘게 밀리면 해지가 난다(날씨 탓이면 절반만)
    let gone = 0, refundN = 0, goneP = 0; const came = [];
    for (const b of C.bases) {
      if (b.hold) { b.owed = 0; continue; }
      const pxB = baseX(s, b), full = b.cust * B.per2, left = b.owed; b.back = Math.min(left, full); if (left > full) refundN += left - full;
      if (left > 0 && b.cust > 0) { const over = left / full, p = clamp((over - B.churn.free) * B.churn.k * (wet >= 2 ? B.churn.wet : 1) * clamp(pxB, 0.6, 1.4), 0, 0.6); let q = 0; for (let j = b.cust; j > 0; j--) if (r.chance(p)) q++; if (q) { b.cust -= q; gone += q; b.back = Math.min(b.back, b.cust * B.per2); } b.sat = clamp(b.sat - over * 12, 0, 100); }
      else if (b.cust > 0 && roomOf(C, b) > 0 && r.chance((B.wom + b.sat / 400 + noteK(C) * R.note.wom + (b.tier && C.buzz > 0 ? 0.15 : 0)) * SJ.ramp(s, "carwash") * mod(s, "cwCust", 1) * baseDemand(s, b))) { if (b.tier) { const x = newVip(s, r, b); if (x) { came.push(x); if (C.buzz > 0) C.buzz--; } } else b.cust++; } // 입소문: 밀린 회차가 없는 건물에서만(고급 거점은 차가 온다)
      { const MC = MARKET.churn; // 값 때문에 끊는 고객: 시세보다 많이 비쌀 때만. 고급 거점은 고객마다 지불 의사가 다르다
        if (!b.tier) { const pc = clamp((pxB - MC.from) * MC.k, 0, MC.max); let q = 0; if (pc > 0) for (let j = b.cust; j > 0; j--) if (r.chance(pc)) q++; if (q) { b.cust -= q; goneP += q; b.back = Math.min(b.back || 0, b.cust * B.per2); } }
        else for (const v of vipsAt(C, b, "auto")) { const pc = clamp((priceX(s, svcI(v), b, CUSTS[v.c]?.px || 1, v.q || 1) - MC.from) * MC.k, 0, MC.max) * (v.stay ? 0.5 : 1); if (pc > 0 && r.chance(pc)) { C.vips = C.vips.filter((y) => y !== v); goneP++; } } }
      if (b.night > 0) b.night--;
    }
    for (const b of C.bases) if (b.hold > 0) { b.hold--; if (!b.hold) notes.push(`출장 세차: ${b.n} 작업이 다시 풀렸어요.`); }
    const back = backAll(C); if (back || gone) notes.push(`출장 세차: 못 돈 회차 ${back}건이 다음 달로 밀렸어요${wet >= 2 ? `(비·결빙 ${wet}주)` : ""}.${gone ? ` 기다리다 지친 정기 고객 ${gone}명이 끊었어요.` : ""}`);
    if (goneP) notes.push(`출장 세차: 값이 부담스럽다며 정기 고객 ${goneP}명이 끊었어요. 지금 값이 시세보다 많이 높아요.`);
    recon(C);
    if (came.length) notes.push(`출장 세차: 소문을 듣고 새 차 ${came.length}대가 왔어요(${came.map((x) => vipName(x.v)).join(", ")}).${came.some((x) => x.v.st === "wait") ? " 처방을 짜야 해요." : " 노트에 있는 차라 바로 돌아요."}`);
    // 세대 교체: 신형이 나오면 타던 고객이 차례로 갈아탄다. 예전 노트는 구형에만 통한다
    const newG = genStep(s, r), mineM = new Set([...C.vips.map((v) => v.m), ...C.corps.map((k) => k.m)]);
    for (const m of newG) { for (const k of C.corps) if (k.m === m && k.swapT == null) k.swapT = s.t + r.int(R.corpLag[0], R.corpLag[1]); if (!mineM.has(m)) continue; const g1 = genOf(C, m), nm = carName(m, g1), memo = genInfo(m, g1).memo;
      notes.push(`출장 세차: 신형이 나왔어요. ${nm}(${memo}). 타던 고객이 차례로 갈아타요. 예전 노트는 구형에만 통해요.`);
      if (s.t - C.genSceneT >= 6 && !scenes.some((x) => x.tag === "출장 세차")) { C.genSceneT = s.t; scenes.push({ kind: "story", tag: "출장 세차", title: `신형 ${MODEL[m].n}`, text: `지하 주차장에 못 보던 차가 들어왔다. ${nm}. ${memo}. 내 노트에는 구형만 있다. 닦는 순서의 절반은 그대로 쓸 수 있을 것 같다. 나머지 절반은 닦아 봐야 안다.`, choices: [{ t: "계속", eff: {}, text: "" }] }); } }
    let swN = 0, goneW = 0;
    for (const v of [...C.vips]) { if (v.k) continue; const cur = genOf(C, v.m), KL = CLASSES[MODEL[v.m].cls], b = C.bases.find((x) => x.id === v.b); let ch = "";
      if (v.st === "auto" && v.g < cur && r.chance(R.switchP)) { v.g = cur; v.p = KL.paints.includes("new") ? "new" : "std"; ch = "차를 신형으로 바꿨어요"; }
      else if (v.st === "auto" && cur - v.g >= 2 && v.p !== "old" && KL.paints.includes("old") && r.chance(R.oldP)) { v.p = "old"; ch = "차가 오래돼 상태가 달라졌어요"; }
      else if (v.st === "wait" && s.t - (v.wT ?? v.since) >= R.wait) { C.vips = C.vips.filter((x) => x !== v); goneW++; if (b) b.sat = clamp(b.sat - 3, 0, 100); continue; }
      if (ch) { seen(C, v); const N = C.notes[noteKey(v)]; if (N) toAuto(C, v, N); else { v.st = "wait"; v.tries = 0; v.wT = s.t; swN++; syncBase(C, b); } if (swN <= 2 || N) notes.push(`출장 세차: ${b?.n || "거점"}의 ${CUSTS[v.c].n} 고객이 ${ch}(${vipName(v)}).${N ? " 노트에 있어 그대로 돌아요." : " 처방을 다시 짜야 해요."}`); } }
    if (goneW) notes.push(`출장 세차: 처방을 기다리던 차 ${goneW}대가 다른 곳으로 갔어요.`);
    for (const k of C.corps) if (k.swapT != null && s.t >= k.swapT) { k.swapT = null; k.g = genOf(C, k.m); if (!corpOk(C, k)) { corpVip(s, k); notes.push(`출장 세차: ${k.n}이 신형으로 바뀌었어요(${carName(k.m, k.g)}). 노트가 없어 직원들 손이 느려져요. 처방을 풀어 줘요.`); } }
    if (keeperOn(C)) { const kv = Math.round(R.keeper * P * K); rev += kv; C.keepCum = (C.keepCum || 0) + kv; } // 히든 길: 전속 관리인의 월 관리비
    // 달마다 나가는 돈: 처리업체 · 보험 · 사업장 월세
    let fix = 0; if (C.waste) fix += Math.round(B.waste * P); if (C.ins) fix += Math.round(B.ins[C.ins] * P); if (C.place) fix += Math.round(B.gate.rent * P);
    // 집에서 버리면 단속
    if (C.dump && needWaste(C) && !C.waste && r.chance(B.dump.p)) { const f = Math.round(B.dump.fine * P); cost += f; C.fines = (C.fines || 0) + 1; const b = C.bases.find((y) => !y.drain); let lostN = ""; if (b && r.chance(0.5)) { dropBase(C, b, true); lostN = ` ${b.n} 관리사무소가 승인을 거뒀어요.`; } notes.push(`출장 세차: 회수한 물을 집 하수구에 버리다 단속에 걸렸어요. 과태료를 냈어요(−${won(f)}).${lostN}`); log(s, "세차 폐수를 집에서 버리다 단속에 걸렸다.", "work"); }
    // 신고 처리
    if (C.siteT != null && s.t >= C.siteT) { C.siteT = null; C.g.site = true; notes.push("출장 세차: 폐수 처리 시설 신고를 마쳤어요. 관문 1/4 통과. 이제 법인 입찰에 나갈 수 있어요."); log(s, "세차 사업장 신고를 마쳤다.", "work"); }
    if (rev) earn(s, C, rev); const out1 = cost + fix; if (out1) { s.cash -= out1; addMoney(s, "exp", "세차 비용", out1); } profit += rev - out1;
    // 사건
    const live = C.bases.filter((b) => b.cust > 0 && !b.hold), busy = () => scenes.some((x) => x.kind === "event");
    if (live.length && !busy()) {
      if (needWaste(C) && !C.waste && !C.dump && C.wasteAsk == null) { C.wasteAsk = s.t; C.evT = s.t; scenes.push(ev(s, r, "water", C.bases.find((b) => !b.drain && b.cust > 0))); }
      else if (wet >= 3 && back >= 4 && s.t - C.rainT >= 12) { C.rainT = s.t; C.evT = s.t; scenes.push(ev(s, r, "rain3", null)); }
      else if (s.t - C.evT >= B.ev.gap && r.chance(B.ev.p * (C.gear < B.gear.low ? 2 : 1) * (lack ? 1.5 : 1) * mod(s, "cwRisk", 1) * (1 - noteK(C) * R.note.risk))) { C.evT = s.t; const pool = ["complain", ...(mine + resDone > 0 ? ["tar", "scratch", ...(C.gear < B.gear.low ? ["scratch", "scratch"] : [])] : []), ...(needWaste(C) && C.dump ? ["water"] : [])]; const id = r.pick(pool); scenes.push(ev(s, r, id, id === "water" ? C.bases.find((b) => !b.drain && b.cust > 0) : r.pick(live))); }
    }
    // 단계
    if (!co) { const n = C.bases.length, cu = C.bases.reduce((a, b) => a + b.cust * (b.tier ? 2 : 1), 0), L = B.lv; /* 고급 고객 한 명은 일반 두 명 몫으로 센다 */ C.lv = n >= L[2][0] && cu >= L[2][1] ? 3 : n >= L[1][0] && cu >= L[1][1] ? 2 : n >= L[0][0] && cu >= L[0][1] ? 1 : 0; } else C.lv = 4;
    { const A = MARKET.auto; for (let t = 0; t < SVC.length; t++) if (priceAuto(C, t)) C.rate[t] = Math.round(clamp(autoTarget(s, t), C.rate[t] - A.step, C.rate[t] + A.step) * 10) / 10; } // 오토: 조금씩만 움직여 고객이 떠나지 않는다
    C.months++; C.cum += profit; recon(C);
    { const U0 = understanding(s); if ([12, 36, 60, 120, 240].includes(C.months)) C.undAt[C.months / 12] = U0.v; // 이해도 곡선(1·3·5·10·20년 차)
      if (U0.stage > C.undSt) { C.undSt = U0.stage; notes.push(U0.stage === 2 ? `출장 세차: 업의 이해도 ${U0.v}점(${U0.rank.n}). 이제 닦는 일은 손에 익었어요. 차마다 다른 답을 찾는 때가 왔어요.` : `출장 세차: 업의 이해도 ${U0.v}점(${U0.rank.n}). 아는 조합은 노트대로 풀려요. 이제 어려운 건 사람이에요. 까다로운 고객, 같이 일하는 사람, 민원, 재입찰.`); } } C.last = { profit, mine, staffCars: corpDone + resDone, corpDem, corpDone, back, gone, fix, wet, cust: custAll(C), waits: waits(C).length, notes: noteN(C) };
    C.hist.push(profit); if (C.hist.length > 24) C.hist.shift();
    return profit;
  },
  value(s) { const C = s.carwash; if (!C) return 0; const R = CW_BAL.rx, kitV = Math.round(ITEMS.reduce((a, x) => a + (C.own?.[x.id] ? x.cost : 0), 0) * pi(s) * R.resale), noteV = isCo(s) ? Math.round(Math.min(R.noteValMax, noteN(C)) * R.noteVal * pi(s)) : 0; // 용품은 중고값(30%), 노트는 회사의 매뉴얼(한 장 10만, 60장까지. 회사일 때만)
    if (!C.place) return s.sj?.active?.includes("carwash") ? kitV : 0; const h = C.hist.slice(-6); return kitV + noteV + Math.round((C.dep || 0) + ((C.invest || 0) - (C.dep || 0)) * 0.35 + (isCo(s) && h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length * 18) : 0)); },
  passive(s) { const C = s.carwash; if (!C || !isCo(s) || !C.staff) return 0; const h = C.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) * 0.6 : 0; },
  todos(s) {
    const C = s.carwash, t = [], owed = owedAll(C), left = Math.min(owed, Math.max(0, carCap(s) - C.cars), Math.max(0, runCap(s) - C.runs) * CW_BAL.perRun);
    if (C.mT === s.t && left > 0) t.push({ lv: 2, text: `출장 세차: 이번 달 남은 회차 ${owed}건(맑은 주 ${dryWeeks(s)}주 · 안 돌면 밀려요)` });
    const W = waits(C), wc = W.filter((v) => v.k).length; if (W.length - wc > 0) t.push({ lv: 2, text: `출장 세차: 처방을 기다리는 차 ${W.length - wc}대(안 맡으면 다른 곳으로 가요)` });
    if (wc) t.push({ lv: 2, text: `출장 세차: 법인 차량 ${wc}건의 처방이 없어요(직원 손이 느려져요)` });
    if (C.gear < CW_BAL.gear.low) t.push({ lv: 1, text: "출장 세차: 타월과 약품을 정비해요(흠집 사고가 잦아져요)" });
    if (C.staff && C.care < careNeed(C)) t.push({ lv: 2, text: `출장 세차: 사람 챙기기 ${C.care}/${careNeed(C)}` });
    if (C.leads.some((L) => L.talkT !== s.t) && C.bases.length < baseMax(s)) t.push({ lv: 1, text: "출장 세차: 봐 둔 건물의 관리사무소에 가 봐요" });
    if (needWaste(C) && !C.waste) t.push({ lv: 1, text: "출장 세차: 회수한 물을 맡길 처리업체가 없어요" });
    if (gateOpen(C) && gateStep(C) >= 0 && C.siteT == null) t.push({ lv: 0, text: `출장 세차: 본업화 관문 ${gateDone(C)}/4 통과 · 다음은 ${GATES[gateStep(C)][1]}` });
    return t;
  },
  onStart(s) { const C = s.carwash; if (C) ensure2(C); if (C && !C.undBase && !C.months) C.undBase = Math.max(0, Math.round(UNDBASE || s?.ng?.und?.carwash || 0)); /* 11-28 init 때는 s.ng 가 아직 없어 시작할 때 전생 점수를 읽는다 */ if (C && !C.bases.length && !C.leads.length) { C.leads.push({ id: "L" + (++C.seq), n: "내가 사는 오피스텔 지하 주차장", zone: 0, cap: 5, drain: true, dc: 25, tries: 0, x: 48, y: 46 }); C.mT = s.t; } }, // 시작하면 내가 사는 건물이 첫 후보
  stopWhy: (s) => (s.carwash?.staff ? "같이 일하는 사람이 있어요. 보드에서 먼저 내보내야 접을 수 있어요" : null),
  onStop(s) { const C = s.carwash; if (C) { if (C.place && C.dep) { s.cash += C.dep; addMoney(s, "inc", "보증금 회수", C.dep); } Object.assign(C, { bases: [], leads: [], corps: [], vips: [], keeper: 0, staff: 0, vans: 0, waste: 0, ins: 0, dump: 0, place: false, siteT: null, dep: 0, invest: 0, lv: 0, g: { site: false, bid: false, crew: false, ins: false } }); } },
  migrate(s, T) { if (!T.v) T.v = 1; T.hist = T.hist || []; T.bases = T.bases || []; T.leads = T.leads || []; T.corps = T.corps || []; T.g = T.g || { site: false, bid: false, crew: false, ins: false }; for (const c of T.corps) if (c.end == null) c.end = s.t + CW_BAL.co.term;
    ensure2(T); for (const b of T.bases) if (b.tier == null) b.tier = 0; // 2단계 이전 저장: 입문 가방을 준다. 거점은 모두 일반 등급
    const ex = MODELS.filter((m) => m.cls === "exec"); for (const c of T.corps) if (!c.m) { c.m = ex[h32(String(c.id)) % ex.length].id; c.g = genOf(T, c.m); const k = `${c.m}.${c.g}|std|fleet`; if (!T.notes[k]) T.notes[k] = { rx: ["p_spray", "w_one", "h_left", "d_towel", "f_wax", "", "", ""], gr: "A", t: s.t, old: 1 }; } // 이미 돌던 법인 차량: 그동안 해 온 방식이 노트 한 장으로 남는다
    T.vips = T.vips.filter((v) => MODEL[v.m] && CUSTS[v.c]);
    if (T.v < 3) { const NB = TIER_BLD[3]; for (const b of [...T.bases, ...T.leads]) if (b.tier === 3 && /임원|회장|수집가의 개인/.test(b.n || "")) b.n = NB[h32(String(b.id)) % NB.length]; // 3단계 이전 저장: '임원 차고' 거점은 하이엔드 단지로 옮긴다. 값은 차 기준가 × 상품으로 다시 매긴다(적혀 있지 않은 상품은 꼼꼼 세차)
      for (const v of T.vips) if (v.st === "auto" && !v.k) { const N = T.notes[noteKey(v)]; if (N) toAuto(T, v, N); } for (const c of T.corps) exSet(s, c, T); T.v = 3; } },
  milestones: [
    { key: "cw_first", title: "첫 거점", test: (s) => (s.carwash?.bases || []).some((b) => b.cust >= 3), lines: ["같은 층에 세 대가 모였다.", "장비를 한 번 펼쳐 세 대를 닦았다. 이게 되는 장사라는 걸 그날 알았다."] },
    { key: "cw_three", title: "동네 세차 선생", test: (s) => (s.carwash?.lv || 0) >= 3, lines: ["건물 세 곳의 경비실이 내 차 번호를 안다.", "토요일 아침 여섯 시 반, 첫 건물의 차단기가 먼저 올라간다."] },
    { key: "cw_company", title: "차량 관리 회사", test: (s) => isCo(s), lines: ["작업 차량 옆면에 상호가 붙었다.", "법인 담당자가 차 키 상자를 넘겨줬다. 서른 대가 넘는다."] },
    { key: "cw_note10", title: "처방 노트 열 장", test: (s) => noteN(s.carwash) >= 10, lines: ["노트가 열 장이 됐다. 같은 차는 한 장도 없다.", "차가 들어오면 이름보다 도장을 먼저 본다. 가방에서 꺼낼 순서가 떠오른다."] },
    { key: "cw_keeper", title: "전속 관리인", test: (s) => !!s.carwash?.keeper, lines: ["수집가의 클래식카 석 대를 사고 없이 맡았다.", "차고 열쇠를 받았다. 달마다 관리비가 들어온다. 물은 여전히 한 통만 쓴다."] },
    { key: "cw_end_co", end: true, kind: "good", epi: "차량 관리 회사는 지금도 새벽에 문을 연다. 새 직원에게는 타월 접는 법부터 가르친다.", title: "차보다 장소를 먼저 본 사람", test: (s) => isCo(s) && (s.carwash?.staff || 0) >= 2 && (s.carwash?.corps || []).length >= 1 && (s.carwash?.months || 0) >= 120, lines: ["법인 계약을 맡은 지 여러 해가 지났다.", "직원들이 오늘도 남의 회사 지하 주차장에서 차단기를 통과한다."] },
    { key: "cw_end_solo", end: true, kind: "good", epi: "회사로 키우지는 않았다. 대신 십 년을 닦은 차가 있다. 그 차 주인은 차를 바꿀 때도 나에게 먼저 물었다.", title: "십 년 된 토요일", test: (s) => { const C = s.carwash; return !!C && !C.place && C.bases.length >= 2 && custAll(C) >= 10 && (C.months || 0) >= 120 && (C.lost || 0) <= 2 && !(C.fines > 0); }, lines: ["혼자서 두 건물을 십 년 넘게 돌았다.", "돈은 크지 않았다. 민원으로 쫓겨난 적은 거의 없다."] },
    { key: "cw_end_lost", end: true, kind: "bad", epi: "승인은 받기는 어렵고 잃기는 쉬웠다. 마지막 건물에서 나온 날, 트렁크의 물통이 유난히 무거웠다.", title: "차단기가 안 올라간다", test: (s) => { const C = s.carwash; return !!C && !isCo(s) && (C.months || 0) >= 12 && custAll(C) < 3 && (C.lost || 0) + (C.fines || 0) >= 2; }, lines: ["승인을 잃거나 단속에 걸린 일이 두 번을 넘었다.", "정기 고객이 남지 않았다. 관리사무소 전화번호만 휴대폰에 남았다."] },
  ],
  synergy: [
    { id: "cw_body", kind: "bad", n: "주말 세차 × 회사", need: "출장 세차 + 회사 다니는 중", desc: "맑은 주 하나에 두 번만 나갈 수 있어요. 회사를 나오면 네 번", test: (s) => !!s.sj?.active?.includes("carwash") && !(s.co.quit || s.co.fired) },
    { id: "cw_pr", kind: "good", n: "건물주 인맥 × 세차", need: "출장 세차 + 건물주·관리 쪽 인물과 친함", desc: "관리사무소 승인이 쉬워져요", test: (s) => !!s.sj?.active?.includes("carwash") && bldHelp(s) > 0 },
  ],
  perks: [
    { id: "p_cw_spot", n: "자리를 보는 눈", line: "차보다 기둥과 배수구를 먼저 본다", pro: "세차 한 대 값 +6%, 정기 고객 모으기 +10%", m: { cwMult: 1.06, cwCust: 1.1 }, got: "세차 600대", test: (s) => (s.carwash?.washes || 0) >= 600 },
  ],
  perkCine: { p_cw_spot: "cw_first" },
  traits: [
    { trait: "earlybird", t: "새벽 주차장이 한산하다: 세차 사고 −15%", m: { cwRisk: 0.85 } },
  ],
  info: { inc: "부업으로는 월 60~120만. 사람을 쓰고 법인 계약을 따면 달라져요", hours: "주말 오전·평일 밤" },
};
