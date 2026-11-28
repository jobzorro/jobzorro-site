// 무인카페 보드: 기계가 일하고 나는 청소·재고·점검. 렌탈 vs 구매, 원두 등급, 한 잔 가격, 여름 아이스 성수기, 먹튀·고장·10대 아지트.
import * as D from "./defs.js";
import { addMoney, log, won, gainStat, creditRoom, addLoan, helperPower, mod } from "./core.js";
import * as SYN from "./syn.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import * as UND from "./und.js"; // 11-28 업의 이해도 효과(함수 안에서만 쓴다. 스위치 UND_ON 이 꺼져 있으면 늘 false)
import * as SP from "./space.js"; // 11-25 지점 수 파손 배율·히든 길 켜짐 여부

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 11-21 밸런스(기획 unmanned.json: 월매출 330~450만, 순익 중위 140만). 원래: 하루 기본 88잔, 잔당 원가 0.055(스페셜티 0.075), 렌탈 45만
// 11-21 밸런스 2차(10개 투잡 공통 비교): 동네 홍보를 꾸준히 하는 보통 플레이에서 매장당 월 300만 안팎(기획 p95)이 나와 하루 기본 110 → 95잔
export const UC_BAL = { cups: 95, unit: 0.046, unitSp: 0.064, rental: 38 };
// 11-26 챌린지 2차(대표 결정: "팔고 옮겨 다녀야 살 수 있는 느낌. 계속 있으면 안 되는 느낌"). 한자리에 오래 있으면 월세가 복리로 오르고, 옆에 경쟁점이 쌓이고, 기계가 늙는다.
// 세기 배율 K(봇 손잡이: 환경변수 UCK)는 경쟁 입점 확률과 기계 고장 증가에만 곱한다. 월세 인상폭은 화면에 보이는 숫자 그대로다
const UCK_DEF = 1; // 11-26 봇 2회차 300판(옮기는 봇 / 한 번도 안 옮기는 봇): K 1·권리금 8달 → 파이어 21.3% / 4.7%, 파산 1.3% / 12.0%. K 0.8 → 21.7% / 5.0%. 권리금 10달이면 25.0%
const envK = (k) => (typeof process !== "undefined" && +process.env?.[k]) || 0;
const K = envK("UCK") || UCK_DEF, KC = K * (envK("UCKC") || 1), KA = K * (envK("UCKA") || 1); // 따로 재 볼 때만: UCKC 경쟁 · UCKA 고장(기본 1)
export const UC_CH = {
  k: K,
  crowd: { t: 36, p0: 0.012, up: 0.004, pMax: 0.2, max: 4, fresh: 0 }, // 옆에 또 생긴다: 매장마다 달 1.2% + 매장 나이 1년마다 0.4%p(×K), 문 연 뒤 4곳까지. 3년 차(s.t 36)에 예고 장면. fresh: 새로 보는 자리의 경쟁 상한(0 = 끔. 1 로 켜면 옮기는 봇 파이어 47%라 껐다. 새 매장은 '문 연 뒤 생긴 경쟁 0곳'으로 시작하는 것만으로 충분하다)
  age: { from: 48, up: 0.01, upMax: 0.15, swap: 84, rental2: 52, buy: 2200, inst: 150, qDown: 0.03, qMax: 0.3, again: 36 }, // 기계가 늙는다: 4년부터 고장 +1%p/년(×K), 7년에 교체(렌탈 월 38 → 52, 구매 2,200). 버티면 맛 −0.03/년
  lease: { every: 24, up: [0.04, 0.06], hot: [0.06, 0.08], hotAvg: 150, dc: 50 }, // 월세 재계약: 2년마다 +4~6%, 최근 6달 평균 이익 150만(물가 반영) 이상이면 +6~8%. 협상(말빨) 성공하면 절반
  reg: { t: 72, warn: 6, gate: 300, keep: 0.8, fineP: 0.03, fine: [100, 200] }, // 무인 매장 규제: 6년 차(s.t 72). 인증기 매장당 300만, 없으면 밤 영업 금지(잔 수 ×0.8) + 달 3% 과태료 100~200만. 규제 뒤 새 매장은 개업비에 인증기가 들어간다
  sale: { mo: 8, perRival: 1, perAge: 0.5, ageFree: 3, min: 3, young: 0.6, clear: 8, mach: 700, machLife: 7, block: 12 }, // 양도: 권리금 = 최근 6달 평균 이익 × (8달 − 문 연 뒤 생긴 경쟁 1곳마다 1달 − 기계 3년 넘은 해마다 0.5달, 최소 3달). 적자면 철거비(평당 8만). 넘긴 상권은 12달 동안 다시 못 연다
  move: { at: 54, drop: 0.3, minM: 24 }, // 옮길 때 알림: 문 연 지 54달, 또는 1년 평균 이익이 고점보다 30% 넘게 줄었을 때 한 번
};
// 주말 손님 비율(평일=1). 오피스가는 주말에 거의 안 온다
if (envK("UCFR")) UC_CH.crowd.fresh = envK("UCFR"); if (envK("UCMO")) UC_CH.sale.mo = envK("UCMO"); // 봇 손잡이: 새 상가 경쟁 상한 · 권리금 달 수
export const weekendF = (A) => (22 + 8 * (A.weekend ?? 1)) / 30;
export function init() { return { stores: [], listings: [], seq: 0, agent: false, hist: [], beanUp: 0, stock: "mid" }; }

export function search(s, r, ak) {
  const A = D.UC_AREAS[ak], pi = SYN.pi(s), fresh = UC_CH.crowd.fresh > 0 && (s.t >= UC_CH.crowd.t || (s.uc.moves || 0) > 0); // 11-26 3년 차부터(또는 한 번 옮긴 뒤) 새로 보는 자리는 막 올라간 새 상가라 경쟁이 적다
  const ls = Array.from({ length: 3 }, () => {
    const size = r.int(6, 15), traffic = +(A.traffic * r.range(0.75, 1.25)).toFixed(2);
    const rent = Math.round(r.range(A.rent[0], A.rent[1]) * (size / 10) * (0.7 + traffic * 0.3) * pi * (s.era.rentup ? 1.15 : 1) / 5) * 5;
    return { id: "C" + (++s.uc.seq), t: s.t, ak, size, traffic, rent, dep: Math.round(rent * r.range(10, 15) / 100) * 100, key: Math.round(r.range(0, 1500) * pi / 50) * 50, comp: fresh ? Math.min(UC_CH.crowd.fresh, Math.max(0, A.comp + r.int(-1, 2))) : Math.max(0, A.comp + r.int(-1, 2)), ...(fresh ? { fresh: 1 } : {}) };
  });
  s.uc.listings = s.uc.listings.filter((l) => l.ak !== ak).concat(ls);
  return ls;
}
// machine: "rent"(월 렌탈) | "buy"(구매) · bean: 0 가성비 | 1 스페셜티
export function quote(s, L, o) { const pi = SYN.pi(s), sf = D.scaleF(s.uc.stores.length + 1); const fit = Math.round((900 + L.size * 60) * pi * sf); const mach = o.machine === "buy" ? Math.round(2200 * pi) : Math.round(150 * pi); const gate = s.uc?.ch?.regT != null ? gateCost(s) : 0; /* 11-26 규제 뒤 새 매장은 출입 인증기가 개업비에 들어간다 */ return { fit, mach, gate, total: L.dep + L.key + fit + mach + gate }; }
export function contract(s, id, o) {
  const U = s.uc, L = U.listings.find((x) => x.id === id); if (!L) return { ok: false, msg: "매물이 없어요" };
  { const w = leftWait(s, L.ak); if (w) return { ok: false, msg: `${D.UC_AREAS[L.ak].n}: 방금 넘긴 상권이에요. ${w}달 뒤에 다시 열 수 있어요` }; }
  const q = quote(s, L, o), lack = q.total - s.cash;
  if (lack > 0) { if (lack > creditRoom(s) * 0.6 + 4000) return { ok: false, msg: `돈이 ${won(lack)} 모자라요` }; addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; }
  s.cash -= q.total; addMoney(s, "exp", "무인카페 오픈", q.total);
  const n = U.stores.length + 1, A = D.UC_AREAS[L.ak];
  const st = { ...L, id: "S" + (++U.seq), name: `${n}호 ${A.n}`, machine: o.machine, bean: o.bean || 0, price: 0.2, rating: 4.3, clean: 0, months: 0, ap: 0, last: null, hist: [], invested: q.total, cctv: false, broken: 0, mAge: 0, rivalN: 0, gate: q.gate > 0 };
  U.stores.push(st); U.listings = U.listings.filter((x) => x !== L);
  log(s, `${st.name} 무인카페 오픈 (${o.machine === "buy" ? "기계 구매" : "기계 렌탈"}). ${won(q.total)}`, "work");
  return { ok: true, msg: `${st.name} 오픈! 다음 달부터 기계가 일해요`, store: st };
}
export function close(s, id) {
  const U = s.uc, st = U.stores.find((x) => x.id === id); if (!st) return { ok: false };
  const q = saleQuote(s, st), back = q.total;
  s.cash += back; addMoney(s, "inc", "무인카페 양도", back); U.stores = U.stores.filter((x) => x !== st);
  if (avg(st) > 0) U.soldN = (U.soldN || 0) + 1;
  U.moves = (U.moves || 0) + 1; U.keySum = (U.keySum || 0) + q.key; (U.left = U.left || {})[st.ak] = s.t; // 11-26 넘긴 상권은 한동안 다시 못 연다
  log(s, `${st.name} 양도 ${won(back)} (보증금 ${won(q.dep)}${q.mach ? ` · 머신 ${won(q.mach)}` : ""} · ${q.key >= 0 ? `권리금 ${won(q.key)}` : `철거비 ${won(-q.key)}`}) · ${Math.floor(st.months / 12)}년 ${st.months % 12}달 운영`, "work");
  return { ok: true, msg: `${st.name} 양도: 보증금 ${won(q.dep)}${q.mach ? ` + 머신 ${won(q.mach)}` : ""} ${q.key >= 0 ? `+ 권리금 ${won(q.key)}` : `− 철거비 ${won(-q.key)}`} = ${won(back)}`, q };
}
const avg = (st) => { const h = st.hist.slice(-6); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; };
export function setPrice(s, id, v) { const st = s.uc.stores.find((x) => x.id === id); if (st) st.price = clamp(Math.round(v * 100) / 100, 0.1, 0.45); }
export function setBean(s, id, v) { const st = s.uc.stores.find((x) => x.id === id); if (st) st.bean = v ? 1 : 0; }
export function buyCctv(s, id) { const st = s.uc.stores.find((x) => x.id === id); if (!st || st.cctv) return { ok: false, msg: "이미 있어요" }; const c = Math.round(80 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "무인카페 CCTV·결제 경보", c); st.cctv = true; return { ok: true, msg: `${st.name} CCTV·미결제 경보 설치(${won(c)})` }; }
export const needAp = (s, st) => (s.uc.agent ? 0.25 : Math.max(0.5, Math.round((1 + (st.last?.cups ?? 1800) / 2500 + stockOf(s).ap) * 2) / 2)); // v4.29 원두 재고 방식

export function can(s, id, arg) { if (id === "uc_search") { const w = arg && D.UC_AREAS[arg] ? leftWait(s, arg) : 0; return arg && !D.UC_AREAS[arg] ? "없는 지역이에요" : w ? `방금 넘긴 상권이에요(${w}달 뒤)` : null; } if (!s.uc.stores.length) return "매장이 없어요"; if (id === "uc_agent" && s.uc.agent) { const U = s.uc; const why = SJ.slotLock(s, () => { U.agent = false; return () => { U.agent = true; }; }); if (why) return why; } if (id === "uc_agent" && s.uc.stores.length < 2) return "매장 2곳부터"; return null; }
export function act(s, r, id, arg, boost = 1) {
  const U = s.uc;
  if (id === "uc_search") { const ls = search(s, r, arg || "apt"); return { lines: [`${D.UC_AREAS[arg || "apt"].n} 매물 ${ls.length}개`], msg: D.UC_AREAS[arg || "apt"].tip }; }
  if (id === "uc_agent") { U.agent = !U.agent; return { lines: [U.agent ? "관리 대행 계약: 매장당 월 40만, 청소·재고를 맡겨요" : "관리 대행 해지"], msg: U.agent ? "\"매일 아침 7시에 들러서 원두 채울게요.\"" : "다시 내가 새벽에 간다." }; }
  const st = U.stores.find((x) => x.id === arg) || U.stores[0];
  if (id === "uc_check") { const hf = clamp(0.85 + (s.st.hands || 0) / 300, 0.85, 1.25); st.ap += boost * hf; st.clean = Math.min(100, st.clean + Math.round(30 * boost * hf)); if (st.broken) { st.broken = 0; } gainStat(s, "hands", 0.3); return { lines: [`${st.name} 점검 ${Math.round(st.ap * 10) / 10}/${needAp(s, st)}`, "청결 +"], msg: r.pick(["새벽 6시, 원두 채우고 얼음통 비우고 테이블 닦기.", "컵 뚜껑이 다 떨어져 있었다. 편의점으로 뛰었다.", "그라인더 청소. 커피 가루가 손톱에 꼈다."]) }; }
  if (id === "uc_promo") { st.buzz = Math.min(100, (st.buzz || 0) + 12 + s.st.mkt / 10); gainStat(s, "mkt", 0.4); return { lines: [`${st.name} 동네 입소문 +`], msg: "아파트 단톡방에 \"첫 잔 1,000원\" 쿠폰을 뿌렸다." }; }
  return null;
}

export function month(s, r, notes, scenes) {
  const U = s.uc, pi = SYN.pi(s); let total = 0; const n0 = scenes.length, NK = UC_F30.night, 스크 = stockOf(s), dX = SP.dmgX(U.stores.length); // 11-25 지점 수 파손 배율
  U.hidOn = SP.hidOn(s, "ucafe"); // 11-25 히든 길 '내 원두 브랜드': 저가 체인 영향 거의 없음(chainRef)
  if (U.beanUp > 0) U.beanUp--;
  UND.fxNote(s, "ucafe", U, notes, [[UND.TH.숙련, "이제 자리를 보면 유동인구와 예상 잔 수가 숫자로 잡혀요(보던 자리에 표시)"], [UND.TH.장인, `매장을 넘길 때 권리금을 ${Math.round(UC_UND.key * 100)}% 더 받아 내요`]]);
  const CH = U.ch = U.ch || {}, ban = regOn(s); // 11-26 챌린지 상태(옛 저장엔 없다)
  for (const st of U.stores) {
    const A = D.UC_AREAS[st.ak], seas = D.UC_SEASON[s.cal - 1], q = U.agent ? 1 : clamp(st.ap / needAp(s, st), 0, 1);
    st.clean = clamp(st.clean * 0.4 + q * 60, 0, 100);
    const quality = 0.85 + st.bean * 0.15 + (st.machine === "buy" ? 0.08 : 0) + (SYN.on(s, "cook_uc") ? 0.08 : 0) + 스크.q - oldQ(st); // 11-26 낡은 기계를 안 바꾸면 맛이 떨어진다
    let cups = UC_BAL.cups * weekendF(A) * st.traffic * seas * quality * Math.pow(0.2 * pi * chainRef(st, U) / st.price, 1.4) * (1 - 0.06 * st.comp) * (1 + (st.rating - 4.3) * 0.7) * (1 + (st.buzz || 0) / 300) * (st.months === 0 ? 0.6 : st.months < 3 ? 0.85 : 1);
    if (st.broken) cups *= 0.5;
    if (st.night === false) cups *= NK.keep; // v4.29 밤에 닫으면 새벽 손님만큼 빠진다
    else if (ban && !st.gate) cups *= UC_CH.reg.keep; // 11-26 규제: 출입 인증기가 없으면 밤 영업 금지
    cups *= SJ.ramp(s, "ucafe"); // 첫 매장 초반 고생(sj.js ENTRY)
    cups *= mod(s, "ucRepeat", 1);
    if (s.era.winter) cups *= 0.9;
    cups = Math.max(0, Math.round(cups * 30 * (1 + 0.07 * r.normal())));
    const numF = clamp(1.03 - (s.st.num || 0) / 2000, 0.95, 1.03); // 숫자: 재고·원가·정산을 꼼꼼히 본다(숫자 60이면 1)
    const theft = Math.round(cups * (st.cctv ? 0.01 : 0.035) * (st.night === false ? NK.theft : 1) * mod(s, "ucTheft", 1) * numF), rev = Math.round((cups - theft) * st.price);
    const unit = (st.bean ? UC_BAL.unitSp : UC_BAL.unit) * pi * (U.beanUp ? 1.35 : 1) * 스크.unit * (0.85 + 0.15 * D.scaleF(U.stores.length)) * numF;
    const util = (22 + ([7, 8].includes(s.cal) ? 20 : s.cal === 6 ? 12 : [12, 1].includes(s.cal) ? 20 : s.cal === 2 ? 14 : [5, 9, 11].includes(s.cal) ? 5 : 0)) * pi /* 11-25 대표: 추울 때·더울 때 전기비가 오른다(겨울 난방도 여름 냉방만큼) */ * (st.night === false ? NK.util : 1);
    let cost = Math.round(st.rent + cups * unit + util + (st.machine === "rent" ? rentalOf(st) * pi : 0) + rev * 0.025 + (U.agent ? 40 * pi : 0) + 8 * pi);
    // 별점: 청결·맛·고장
    const target = 4.1 + st.clean / 300 + st.bean * 0.15 - (st.broken ? 0.2 : 0) + 스크.star;
    st.rating = clamp(st.rating + (target - st.rating) * 0.3 + 0.03 * r.normal(), 3.2, 4.95);
    st.buzz = Math.max(0, (st.buzz || 0) * 0.85);
    st.mAge = machAge(st) + 1; st.months++; st.ap = 0; // 11-26 기계 나이(달). 옛 저장은 매장 나이로 본다
    // 사건
    const breakP = breakOf(s, st, q, dX); // 11-25 지점 하나 늘 때마다 고장 +30% · 11-26 기계 나이
    if (r.chance(breakP)) { const fix = st.machine === "rent" ? 0 : Math.round(r.int(30, 120) * pi); cost += fix; st.broken = 1; notes.push(`${st.name}: 커피 머신 고장${fix ? `, 수리비 ${won(fix)}` : "(렌탈이라 수리는 무료, 대신 며칠 멈춤)"}`); }
    else if (st.night !== false && st.months >= 3 && scenes.length === n0 && r.chance(NK.p24)) scenes.push(nightScene(s, r, st)); // v4.29 24시간 매장의 새벽 사고
    else if (r.chance(0.06)) scenes.push(ucEvent(s, r, st, rev));
    if (스크 === UC_F30.stock.bulk && [6, 7, 8].includes(s.cal) && r.chance(스크.damp)) { st.rating = clamp(st.rating - 0.03, 3.2, 4.95); notes.push(`${st.name}: 쟁여 둔 원두가 습기를 먹었다. "오늘 커피 왜 이래요" 별점 −0.03`); }
    // 11-26 챌린지: 과태료 · 기계 교체 · 월세 재계약
    if (ban && !st.gate && r.chance(UC_CH.reg.fineP)) { const f = Math.round(r.int(UC_CH.reg.fine[0], UC_CH.reg.fine[1]) * pi); cost += f; notes.push(`${st.name}: 무인 매장 점검에서 걸렸다. 출입 인증기가 없어 과태료 ${won(f)}`); }
    if (st.mAge >= UC_CH.age.swap && (st.swapAsk == null || s.t - st.swapAsk >= UC_CH.age.again)) { st.swapAsk = s.t; scenes.push(swapScene(s, st)); }
    if (st.rentAsk) leaseApply(s, st, st.rentAsk.up); // 지난달 장면을 못 본 채 넘어왔으면 부른 대로
    if (st.months % UC_CH.lease.every === 0) { const LS = UC_CH.lease, hot = avg(st) >= LS.hotAvg * pi, rg = hot ? LS.hot : LS.up, up = Math.round(r.range(rg[0], rg[1]) * 1000) / 1000; st.rentAsk = { up, t: s.t }; scenes.push(leaseScene(s, st, up, hot)); }
    st.last = { cups, theft, rev, cost, q };
    st.hist.push(rev - cost); if (st.hist.length > 24) st.hist.shift();
    if (st.months >= 12) st.peak = Math.max(st.peak || 0, avg12(st)); // 11-26 1년 평균 이익의 고점(여름·겨울 차이를 지우려고 1년으로 본다)
    if (!st.moveAsk && moveDue(st) && scenes.length - n0 < 2) { st.moveAsk = s.t; scenes.push(moveScene(s, st)); }
    s.cash += rev - cost; addMoney(s, "inc", "무인카페 매출", rev); addMoney(s, "exp", "무인카페 비용", cost); total += rev - cost;
  }
  // 근처 저가 프랜차이즈
  // v4.29 옆에 저가 커피 체인 입점 · 11-26 3년 차부터는 더 자주(달 5%), 매장마다 4곳까지. 처음 2곳은 저가 체인(장면), 그다음은 무인카페
  const CR = UC_CH.crowd, late = s.t >= CR.t;
  for (const st of U.stores) {
    if (rivalN(st) >= CR.max || !r.chance(crowdP(st))) continue;
    st.rivalN = rivalN(st) + 1; st.comp++;
    if ((st.chain || 0) < UC_F30.chain.max) { st.chain = (st.chain || 0) + 1; scenes.push(chainScene(s, st)); } else notes.push(`${st.name} 옆 건물에 무인카페가 또 문을 열었다(주변 경쟁 ${st.comp}곳). 손님이 나뉜다`);
  }
  if (U.stores.length && late && CH.crowdT == null) { CH.crowdT = s.t; scenes.push(crowdScene(s, U.stores[0])); }
  const RG = UC_CH.reg;
  if (U.stores.length && CH.regT == null && CH.warnT == null && s.t >= RG.t - RG.warn && s.t < RG.t) { CH.warnT = s.t; notes.push(`뉴스: 무인 매장 관리 기준이 ${RG.t - s.t}달 뒤부터 바뀐다. 밤에 청소년이 드나드는 것을 막는 출입 인증기와 위생 점검이 의무가 된다`); }
  if (U.stores.length && CH.regT == null && s.t >= RG.t) { CH.regT = s.t; scenes.push(regScene(s)); }
  hoursAsk(s, scenes, n0);
  if (U.stores.length && !U.beanUp && r.chance(0.015)) { U.beanUp = 6; notes.push("국제 원두값 급등! 6개월 동안 원두·우유 원가 +35%"); }
  U.hist.push(Math.round(total)); if (U.hist.length > 24) U.hist.shift();
  return total;
}
function ucEvent(s, r, st, rev) {
  s._ucEv = { id: st.id };
  const L0 = [
    { t: "먹튀 영상", x: `${st.name} CCTV에 결제 안 하고 음료만 들고 가는 학생 셋이 찍혔다. 이번 달만 다섯 번째.`, c: [{ t: "가게에 경고문과 영상 캡처를 붙인다", eff: { mental: -2 }, text: "먹튀가 줄었다. 대신 동네 맘카페에 '무서운 카페' 글이 올라왔다." }, { t: "경찰에 신고한다", eff: { mental: -4 }, text: "부모님이 찾아와 사과하고 음료값을 냈다." }] },
    { t: "10대 아지트", x: `밤마다 ${st.name}에 중학생들이 모여 컵라면을 먹고 간다. 쓰레기와 소음 민원.`, c: [{ t: "밤 10시 이후 출입 제한(키오스크 설정)", eff: { cash: -Math.round(rev * 0.08) }, text: "조용해졌다. 야간 매출도 같이 줄었다." }, { t: "직접 가서 웃으며 정리 부탁", check: { stat: "talk", dc: 45 }, ok: { text: "\"네 사장님!\" 단골이 됐다.", eff: { mental: 2 } }, ng: { text: "무시당했다. 다음 날 더 많이 왔다.", eff: { mental: -6 } } }] },
    { t: "얼음 기계 멈춤", x: `35도 폭염 토요일, ${st.name} 제빙기가 멈췄다. 아이스 주문이 다 실패하고 있다.`, c: [{ t: "편의점 얼음을 사서 달려간다", eff: { hp: -10, cash: -3 }, text: "얼음 20봉지. 손이 얼었다. 매출은 지켰다." }, { t: "그냥 둔다", eff: { cash: -Math.round(rev * 0.1) }, text: "\"아이스 안 돼요\" 리뷰가 달렸다." }] },
    { t: "동네 맘카페 후기", x: `동네 맘카페에 "${st.name} 원두 바꿨나요? 요즘 맛있어요" 글이 올라왔다.`, c: [{ t: "감사 댓글과 쿠폰을 단다", eff: { mental: 3 }, text: "다음 주 매출이 확 뛰었다." }] },
  ];
  const L = L0.filter((e) => !(st.night === false && e.t === "10대 아지트")); // 밤에 닫은 매장엔 아지트가 없다
  const e = r.pick(L);
  return { kind: "event", tag: "무인카페", title: e.t, text: e.x, choices: e.c };
}
// 11-27 대표 결정: 순자산에는 "지금 넘기면 받는 돈"(보증금 + 권리금 + 머신 중고값, 적자면 철거비를 뺌)을 넣는다. 전에는 보증금과 머신 700만만 넣어, 흑자 매장을 넘기는 순간 순자산이 뛰었다
export function value(s) { return s.uc.stores.reduce((a, st) => a + saleQuote(s, st).total, 0); }
export function passive(s) { if (!s.uc.agent) return 0; const h = s.uc.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0; }
export function todos(s) { const t = []; for (const st of s.uc.stores) { const n = needAp(s, st); if (!s.uc.agent && st.ap < n) t.push({ lv: st.ap < n * 0.5 ? 2 : 1, text: `${st.name} 점검·재고 ${st.ap}/${n}`, go: "ucafe" }); if (st.broken) t.push({ lv: 2, text: `${st.name} 머신 고장: 점검하면 고쳐요`, go: "ucafe" }); if (st.mHold && machAge(st) >= UC_CH.age.swap) t.push({ lv: 1, text: `${st.name} 기계가 낡았어요(${Math.floor(machAge(st) / 12)}년): 보드에서 교체`, go: "ucafe" }); if (st.moveAsk && moveDue(st)) t.push({ lv: 1, text: `${st.name}: 옮길 때가 됐어요(${saleQuote(s, st).key > 0 ? `지금 팔면 권리금 약 ${won(saleQuote(s, st).key)}` : "적자라 권리금 없음"})`, go: "ucafe" }); } return t; }

// ───────── v4.29 무인카페 특이 요소: 24시간 vs 밤에 닫기 · 원두 신선도와 재고 회전 · 옆에 저가 커피 체인 입점 ─────────
// 효과 크기는 여기 모아 둔다
export const UC_F30 = {
  night: { keep: 0.8, util: 0.72, theft: 0.45, brk: 0.7, lock: 30, p24: 0.05 }, // 밤에 닫으면: 잔 수 80%, 전기 72%, 먹튀 45%, 고장 70%. 처음 닫을 때 자동문 30만. 24시간이면 달마다 새벽 사고 5%
  stock: { // 원두 재고: unit 원가 배율 · ap 점검 행동력 · star 별점 · q 맛(잔 수)
    small: { n: "조금씩 자주", unit: 1.07, ap: 0.5, star: 0.05, q: 0.02, desc: "늘 신선해 별점이 오르지만 자주 가야 해요(점검 +0.5)" },
    mid: { n: "보통", unit: 1, ap: 0, star: 0, q: 0, desc: "2주에 한 번 채워요" },
    bulk: { n: "한 번에 많이", unit: 0.88, ap: -0.5, star: -0.12, q: -0.05, damp: 0.25, desc: "원가가 싸고 덜 가도 되지만 맛이 떨어져요(여름엔 습기)" },
  },
  chain: { p: 0.02, max: 2, ref: 0.08, spHalf: 0.5, cut: 0.03, buzz: 15, hid: 0.1 }, // hid: 히든 길 '내 원두 브랜드'가 켜진 동안 체인 영향 배율(거의 없음) // 체인 1곳마다 손님 머릿속 '한 잔 값'이 14% 내려간다(스페셜티면 절반)
};
export const stockOf = (s) => UC_F30.stock[s.uc?.stock || "mid"] || UC_F30.stock.mid;
export const chainRef = (st, U) => 1 - UC_F30.chain.ref * (st.chain || 0) * (st.bean ? UC_F30.chain.spHalf : 1) * (U?.hidOn ? UC_F30.chain.hid : 1);
export function setStock(s, k) { if (!UC_F30.stock[k]) return { ok: false }; s.uc.stock = k; return { ok: true, msg: `원두 재고: ${UC_F30.stock[k].n}` }; }
export function setNight(s, id, open24) {
  const st = s.uc.stores.find((x) => x.id === id); if (!st) return { ok: false };
  if (!open24 && !st.lock) { const c = Math.round(UC_F30.night.lock * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "무인카페 비용", c); st.lock = true; st.night = false; return { ok: true, msg: `${st.name}: 밤 12시~아침 7시 닫기 · 자동문 잠금 설치 ${won(c)}` }; }
  st.night = open24 ? true : false; return { ok: true, msg: `${st.name}: ${open24 ? "24시간 영업" : "밤엔 닫기"}` };
}
function hoursAsk(s, scenes, n0) {
  const U = s.uc; if (U.hoursAsk || scenes.length > n0) return;
  const st = U.stores.find((x) => x.months >= 2 && x.night === undefined); if (!st) return;
  U.hoursAsk = s.t; scenes.push(hoursScene(s, st));
}
function hoursScene(s, st) {
  const K = UC_F30.night;
  return { kind: "event", tag: "무인카페", title: "밤에도 열어 둘까", onChoose: "uc_hours", f30: { id: st.id },
    text: `새벽 2시, ${st.name} CCTV 알림. 손님 한 명이 아메리카노를 뽑아 간다. 밤 손님은 매출의 ${Math.round((1 - K.keep) * 100)}%쯤. 대신 전기세, 10대 아지트, 새벽 사고도 같이 온다.`,
    choices: [
      { t: "24시간 연다 (매출 그대로, 새벽 사고 위험)", eff: {}, text: "불 켜진 무인카페는 동네의 등대다. 가끔은 해적도 온다." },
      { t: `밤 12시~아침 7시는 닫는다 (매출 −${Math.round((1 - K.keep) * 100)}%, 전기·먹튀·고장 ↓, 자동문 ${won(Math.round(K.lock * SYN.pi(s)))})`, eff: {}, text: "자동문 잠금을 달았다. 새벽 알림이 조용해졌다." },
    ] };
}
function nightScene(s, r, st) {
  const k = r.int(0, 2), c = Math.round(5 * SYN.pi(s));
  const x = [`새벽 3시, ${st.name} CCTV. 취객이 테이블에 엎드려 잠들었다. 바닥엔 쏟은 커피.`, `새벽 2시, ${st.name}에 10대 여섯 명. 컵라면 국물이 키오스크 앞까지 흘렀다.`, `새벽 4시, ${st.name} 문자 알림. "키오스크 화면 깨짐 감지."`][k];
  return { kind: "event", tag: "무인카페", title: "새벽의 무인카페", onChoose: "uc_night", f30: { id: st.id, c: k === 2 ? Math.round(c * 4) : c },
    text: `${x} 24시간 매장의 밤은 내 몫이다.`,
    choices: [
      { t: `경찰·보안 업체에 맡기고 아침에 치운다 (${won(k === 2 ? c * 4 : c)})`, eff: {}, text: "출근 전 6시에 들러 바닥을 닦았다." },
      { t: "지금 바로 달려간다 (스태미너 −10, 별점 +)", eff: {}, text: "새벽 택시. 매장을 정리하고 해 뜨는 걸 보며 출근했다." },
      { t: "이참에 밤엔 닫는다", eff: {}, text: "자동문 잠금 견적을 받았다." },
    ] };
}
function chainScene(s, st) {
  const K = UC_F30.chain, p = Math.round(st.price * 10000), np = Math.round(Math.max(0.1, st.price - K.cut) * 10000);
  return { kind: "event", tag: "무인카페", title: "옆에 저가 커피 체인이 생겼다", onChoose: "uc_chain", f30: { id: st.id },
    text: `${st.name} 건너편에 저가 커피 체인이 문을 열었다. 아메리카노 1,500원, 알바가 웃으며 내려 준다. 동네 사람들 머릿속 '한 잔 값'이 무너진다. 내 매장은 ${p.toLocaleString()}원.${st.bean ? " 그래도 스페셜티 원두라 덜 흔들린다." : ""}`,
    choices: [
      { t: `가격을 내린다 (${p.toLocaleString()}원 → ${np.toLocaleString()}원)`, eff: {}, text: "가격표를 새로 뽑았다. 마진이 얇아졌다." },
      { t: `품질로 버틴다 (스페셜티 원두 + 맛 홍보, 입소문 +${K.buzz})`, eff: {}, text: "\"여기 원두가 더 고소해요.\" 맘카페 댓글이 하나 달렸다." },
      { t: "다른 동네로 옮긴다 (양도하고 새 자리 찾기)", eff: {}, text: "이 골목은 체인 차지다. 짐을 쌌다." },
    ] };
}
export function f30Scene(s, r, what) { // 시험용
  const st = s.uc.stores[0]; if (!st) return null;
  return what === "hours" ? hoursScene(s, st) : what === "night" ? nightScene(s, r, st) : (st.chain = (st.chain || 0) + 1, chainScene(s, st));
}
const ucStore = (s, sc) => s.uc.stores.find((x) => x.id === sc?.f30?.id);
// 장면 선택(core.js 가 SCENE_FN 에 붙인다). 봇 기본 선택: 모두 0번
export const UC_CHOOSE = {
  uc_hours(s, r, i, ok, sc) { const st = ucStore(s, sc); if (!st) return []; if (i === 1) return [setNight(s, st.id, false).msg, "보드 '영업 방식'에서 매장마다 바꿀 수 있어요"]; st.night = true; return [`${st.name}: 24시간 영업`]; },
  uc_night(s, r, i, ok, sc) {
    const st = ucStore(s, sc), o = sc?.f30; if (!st || !o) return [];
    if (i === 0) { s.cash -= o.c; addMoney(s, "exp", "무인카페 비용", o.c); return [`정리·수리 −${won(o.c)}`, ...applyEffLite(s, { mental: -3 })]; }
    if (i === 1) { st.rating = clamp(st.rating + 0.03, 3.2, 4.95); return [...applyEffLite(s, { hp: -10 }), `${st.name} 별점 +0.03`]; }
    return [setNight(s, st.id, false).msg];
  },
  uc_chain(s, r, i, ok, sc) {
    const st = ucStore(s, sc), K = UC_F30.chain; if (!st) return [];
    if (i === 0) { st.price = clamp(Math.round((st.price - K.cut) * 100) / 100, 0.1, 0.45); return [`${st.name} 한 잔 ${Math.round(st.price * 10000).toLocaleString()}원`]; }
    if (i === 1) { const was = st.bean; st.bean = 1; st.buzz = Math.min(100, (st.buzz || 0) + K.buzz); return [was ? "이미 스페셜티: 맛 홍보만" : "스페셜티 원두로 바꿈(원가 ↑, 체인 영향 절반)", `입소문 +${K.buzz}`]; }
    const ak = st.ak, res = close(s, st.id), next = Object.keys(D.UC_AREAS).filter((k) => k !== ak); const nk = next[(s.t + st.size) % next.length]; search(s, r, nk);
    return [res.msg || "양도", `${D.UC_AREAS[nk].n} 매물 3곳을 받아 뒀어요(보드 '보던 자리')`];
  },
};
Object.assign(UC_CHOOSE, {
  uc_lease(s, r, i, ok, sc) { const st = ucStore(s, sc); if (!st || !st.rentAsk) return []; const half = i === 1 && ok; return [leaseApply(s, st, half ? sc.f30.up / 2 : sc.f30.up), half ? "협상 성공: 인상 폭 절반" : i === 1 ? "협상 실패: 부른 대로" : "다음 재계약은 2년 뒤"]; },
  uc_swap(s, r, i, ok, sc) { const st = ucStore(s, sc); if (!st) return []; if (i === 0) return [swapMachine(s, st.id).msg]; if (i === 2 && st.machine === "buy") return [swapMachine(s, st.id, "rent").msg]; st.mHold = true; return [`${st.name}: 기계를 그대로 쓴다. 해마다 고장이 늘고 맛이 떨어져요`, "보드 매장 카드에서 언제든 바꿀 수 있어요"]; },
  uc_move(s, r, i, ok, sc) { const st = ucStore(s, sc); if (!st) return []; if (i === 1) return [close(s, st.id).msg, `${D.UC_AREAS[st.ak].n}에는 ${UC_CH.sale.block}달 동안 다시 못 열어요. 다른 상권에서 자리를 찾아보세요`]; return ["보드 매장 카드에서 '지금 팔면 받는 돈'을 달마다 볼 수 있어요"]; },
  uc_reg(s, r, i) { if (i === 0) return s.uc.stores.map((st) => buyGate(s, st.id).msg); for (const st of s.uc.stores) st.gate = false; return ["출입 인증기 없이 간다: 다음 달부터 밤 영업 금지(잔 수 −20%)", "보드 매장 카드에서 언제든 설치할 수 있어요"]; },
});
// ───────── 11-26 챌린지: 옆에 또 생긴다 · 기계가 늙는다 · 월세가 오른다 · 무인 매장 규제 ─────────
const pc1 = (x) => Math.round(x * 1000) / 10;
export const leaseTxt = () => `보통 +${pc1(UC_CH.lease.up[0])}~${pc1(UC_CH.lease.up[1])}%, 장사가 잘되면 +${pc1(UC_CH.lease.hot[0])}~${pc1(UC_CH.lease.hot[1])}%`;
export const avg6 = (st) => avg(st);
export const avg12 = (st) => { const h = st.hist.slice(-12); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; };
export const trend = (st) => (st.peak > 0 && st.months >= 12 ? avg12(st) / st.peak - 1 : 0); // 1년 평균 이익이 고점보다 얼마나 줄었나(−0.3 = 30% 줄었다)
export const moveDue = (st) => st.months >= UC_CH.move.at || (st.months >= UC_CH.move.minM && trend(st) <= -UC_CH.move.drop);
export const leftWait = (s, ak) => { const t = s.uc?.left?.[ak]; return t == null ? 0 : Math.max(0, UC_CH.sale.block - (s.t - t)); }; // 넘긴 상권에 다시 열 수 있을 때까지 남은 달
// 지금 넘기면 받는 돈. key 가 권리금(적자면 철거비라 음수), mo 는 권리금이 이익 몇 달 치인지
// 11-28 업의 이해도 효과(스위치 UND_ON). 숙련(300)부터: 보던 자리의 유동인구가 점(●) 대신 지수 숫자로, 경쟁을 넣은 예상 잔 수까지 보인다(화면만). 장인(1,000)부터: 넘길 때 권리금 +key(협상)
export const UC_UND = { key: 0.04 };
export const undSee = (s) => UND.at(s, "ucafe", UND.TH.숙련);
// 보던 자리(l)의 입지 조사: { traffic 유동 지수, vs 그 상권 평균 대비 %, cups 자리를 잡은 뒤 한 달 예상 잔 수(기본 가격 · 가성비 원두 · 렌탈 기계 · 평균 계절) }. 숙련이 안 됐으면 null
export function undSurvey(s, l) {
  if (!l || !undSee(s)) return null;
  const A = D.UC_AREAS[l.ak]; if (!A) return null;
  const cups = UC_BAL.cups * weekendF(A) * l.traffic * 0.85 * (1 - 0.06 * l.comp) * 30; // month() 의 잔 수 식에서 자리 몫만(하루 잔 × 30)
  return { traffic: l.traffic, vs: Math.round((l.traffic / A.traffic - 1) * 100), cups: Math.round(cups / 10) * 10 };
}
export function saleQuote(s, st) {
  const S = UC_CH.sale, a = avg(st), yrs = machAge(st) / 12;
  const mo = Math.max(S.min, S.mo - S.perRival * rivalN(st) - S.perAge * Math.max(0, Math.floor(yrs) - S.ageFree)) * (st.months >= 6 ? 1 : S.young);
  const key0 = a > 0 ? Math.round(a * mo) : -Math.round(S.clear * st.size * SYN.pi(s)), und = key0 > 0 && UND.at(s, "ucafe", UND.TH.장인) ? Math.round(key0 * UC_UND.key) : 0, key = key0 + und; // und: 업의 이해도 장인부터 권리금 협상 몫
  const mach = st.machine === "buy" ? Math.round(S.mach * Math.max(0.2, 1 - yrs / S.machLife)) : 0;
  return { dep: st.dep, mach, key, mo: Math.round(mo * 10) / 10, avg: Math.round(a), total: Math.max(0, st.dep + mach + key), ...(und ? { und } : {}) };
}
export const crowdP = (st) => Math.min(UC_CH.crowd.pMax, (UC_CH.crowd.p0 + UC_CH.crowd.up * Math.floor((st?.months || 0) / 12)) * KC); // 그 매장 옆에 이번 달 새로 생길 확률(오래될수록 오른다)
function moveScene(s, st) {
  const q = saleQuote(s, st), y = Math.floor(st.months / 12) + 1, tr = Math.round(trend(st) * 100);
  return { kind: "event", tag: "무인카페", title: "이 자리는 단물이 빠졌다", onChoose: "uc_move", f30: { id: st.id }, best: [],
    text: `${st.name}, ${y}년 차. 처음엔 이 골목에 무인카페가 여기뿐이었다. 지금은 주변 경쟁이 ${st.comp}곳이고, 월세는 재계약 때마다 올랐고, 기계 소리도 예전 같지 않다.${tr < 0 ? ` 1년 평균 이익은 제일 좋던 때보다 ${-tr}% 줄었다.` : ""} 옆 동네에는 새 상가가 올라가고 있다. ${q.key > 0 ? `장사가 되는 지금 넘기면 권리금을 받는다(지금 약 ${won(q.key)}). 늦을수록 헐값이 된다.` : "이미 적자라 권리금은 못 받는다. 더 끌면 손해만 쌓인다."}`,
    choices: [
      { t: "조금 더 지켜본다", eff: {}, text: "장부를 덮었다. 권리금은 장사가 될 때 받는 돈이라는 말이 머리에 남았다." },
      { t: `지금 넘긴다 (보증금 ${won(q.dep)}${q.mach ? ` + 머신 ${won(q.mach)}` : ""} ${q.key >= 0 ? `+ 권리금 ${won(q.key)}` : `− 철거비 ${won(-q.key)}`})`, eff: {}, text: "인수자가 기계 앞에서 사진을 찍었다. 열쇠를 넘기고 옆 동네 부동산에 전화를 걸었다." },
    ] };
}
export const rivalN = (st) => st.rivalN ?? st.chain ?? 0; // 문을 연 뒤 옆에 새로 생긴 곳 수
export const machAge = (st) => st.mAge ?? st.months ?? 0; // 기계 나이(달)
export const rentalOf = (st) => st.rentalFee ?? UC_BAL.rental; // 월 렌탈비(물가 반영 전)
export const regOn = (s) => s.uc?.ch?.regT != null && s.t > s.uc.ch.regT; // 규제 시행 중(장면을 본 다음 달부터)
const ageUp = (st) => { const A = UC_CH.age, a = machAge(st); return a >= A.from ? Math.min(A.upMax, (Math.floor((a - A.from) / 12) + 1) * A.up * KA) : 0; }; // 고장 확률 더하기
const oldQ = (st) => { const A = UC_CH.age, a = machAge(st); return a >= A.swap ? Math.min(A.qMax, (Math.floor((a - A.swap) / 12) + 1) * A.qDown) : 0; }; // 교체 시기를 넘긴 기계의 맛 깎임
export function breakOf(s, st, q = 1, dX = SP.dmgX(s.uc.stores.length)) { return ((st.machine === "buy" ? 0.04 : 0.025) + ([7, 8].includes(s.cal) ? 0.03 : 0) - q * 0.02 + ageUp(st)) * (st.night === false ? UC_F30.night.brk : 1) * dX; }
function leaseApply(s, st, up) { const was = st.rent; st.rent = Math.round(st.rent * (1 + up)); st.rentAsk = null; st.leaseT = s.t; log(s, `${st.name} 월세 재계약 ${won(was)} → ${won(st.rent)}`, "work"); return `${st.name} 월세 ${won(was)} → ${won(st.rent)} (+${Math.round(up * 1000) / 10}%)`; }
export const gateCost = (s) => { const q = s.uc?.ch?.gq; return q && s.t - q.t <= 1 ? q.c : Math.round(UC_CH.reg.gate * SYN.pi(s)); }; // 11-27 QA: 장면에서 부른 값을 한 달 동안 그대로 받는다(선택지 348만 · 결과 349만으로 어긋났다)
export function buyGate(s, id) { const st = s.uc.stores.find((x) => x.id === id); if (!st || st.gate) return { ok: false, msg: "이미 있어요" }; const c = gateCost(s); s.cash -= c; addMoney(s, "exp", "무인카페 출입 인증기", c); st.gate = true; return { ok: true, msg: `${st.name} 출입 인증기 설치(${won(c)}): 밤에도 열 수 있어요` }; }
export const swapCost = (s, st, to) => { const buy = (to || st.machine) === "buy", q = st.sq && s.t - st.sq.t <= 1 ? st.sq : null; return buy ? (q ? q.buy : Math.round(UC_CH.age.buy * SYN.pi(s))) : st.machine === "buy" ? (q ? q.inst : Math.round(UC_CH.age.inst * SYN.pi(s))) : 0; }; // 11-27 QA: 장면에서 부른 값을 한 달 동안 그대로
// 기계 교체. to 를 주면 방식도 바꾼다("rent": 구매 기계를 렌탈로). 렌탈 재계약은 목돈 없이 월 렌탈비만 오른다
export function swapMachine(s, id, to) {
  const st = s.uc.stores.find((x) => x.id === id), A = UC_CH.age; if (!st) return { ok: false, msg: "매장이 없어요" };
  if (machAge(st) < A.swap) return { ok: false, msg: "아직 바꿀 때가 아니에요" };
  const kind = to || st.machine, c = swapCost(s, st, to);
  if (c > 0 && s.cash < c) { st.mHold = true; return { ok: false, msg: `${st.name}: 기계값 ${won(c)}이 모자라 이번엔 그대로 쓴다` }; }
  if (c > 0) { s.cash -= c; addMoney(s, "exp", "무인카페 기계 교체", c); }
  st.machine = kind; if (kind === "rent") st.rentalFee = A.rental2; st.mAge = 0; st.mHold = false; st.swapAsk = null; st.broken = 0;
  log(s, `${st.name} 커피 머신 교체(${kind === "buy" ? `구매 ${won(c)}` : `렌탈 월 ${won(Math.round(A.rental2 * SYN.pi(s)))}`})`, "work");
  return { ok: true, msg: kind === "buy" ? `${st.name} 새 기계 구매(${won(c)}): 고장률이 처음으로 돌아갔어요` : `${st.name} 새 기계로 렌탈 재계약(월 ${won(Math.round(A.rental2 * SYN.pi(s)))}): 고장률이 처음으로 돌아갔어요` };
}
// 화면용: 매장 카드에 한 줄씩. { k 이름, v 값, bad 빨강, btn: [data 속성 이름, 버튼 글] }
export function chRows(s, st) {
  const A = UC_CH.age, LS = UC_CH.lease, RG = UC_CH.reg, a = machAge(st), pi = SYN.pi(s), out = [];
  { const y = Math.floor(st.months / 12), tr = Math.round(trend(st) * 100), q = saleQuote(s, st);
    out.push({ k: "이 자리", v: `${y + 1}년 차 · 이익 추세 ${st.months < 12 ? "아직 1년이 안 됐어요" : avg12(st) < 0 ? "1년 평균 적자" : tr <= -5 ? `고점보다 ${-tr}% 줄었어요` : "고점 근처"}${st.moveAsk && moveDue(st) ? " · 옮길 때가 됐어요" : ""}`, bad: tr <= -UC_CH.move.drop * 100 || (st.months >= 12 && avg12(st) < 0) });
    out.push({ k: "지금 팔면", v: q.key >= 0 ? `권리금 약 ${won(q.key)}(이익 ${q.mo}달 치${q.und ? ` + 협상 ${won(q.und)} · 업의 이해도 덕분` : ""}) + 보증금 ${won(q.dep)}${q.mach ? ` + 머신 ${won(q.mach)}` : ""}` : `권리금 없음 · 보증금 ${won(q.dep)}${q.mach ? ` + 머신 ${won(q.mach)}` : ""} − 철거비 ${won(-q.key)}`, bad: q.key < 0, btn: ["ucclose", "양도"] }); }
  out.push({ k: "주변 경쟁", v: `${st.comp}곳${rivalN(st) ? ` (문 연 뒤 +${rivalN(st)})` : ""} · 1곳마다 잔 수 −6% · 이번 달 또 생길 확률 ${rivalN(st) >= UC_CH.crowd.max ? 0 : Math.round(crowdP(st) * 1000) / 10}%`, bad: st.comp >= 4 });
  const bp = Math.max(0, Math.round(breakOf(s, st, 1) * 1000) / 10), old = a >= A.swap;
  out.push({ k: "기계", v: `${Math.floor(a / 12)}년 ${a % 12}달 · 고장 달 ${bp}%${old ? ` · 낡아서 맛 −${Math.round(oldQ(st) * 100)}%` : a >= A.from ? " · 해마다 고장 +" : ""}${st.machine === "rent" ? ` · 렌탈 월 ${won(Math.round(rentalOf(st) * pi))}` : ""}`, bad: old,
    btn: old ? ["ucswap", st.machine === "buy" ? `새 기계 ${won(swapCost(s, st))}` : `재계약 월 ${won(Math.round(A.rental2 * pi))}`] : null });
  out.push({ k: "월세", v: `${won(st.rent)} · 다음 재계약까지 ${LS.every - (st.months % LS.every)}달(${leaseTxt()})` });
  const left = RG.t - s.t;
  if (s.uc?.ch?.regT != null) out.push({ k: "출입 인증기", v: st.gate ? "설치함 · 밤 영업 가능" : `없음 · 밤 영업 금지(잔 수 −${Math.round((1 - RG.keep) * 100)}%), 달 ${Math.round(RG.fineP * 100)}% 과태료`, bad: !st.gate, btn: st.gate ? null : ["ucgate", `설치 ${won(gateCost(s))}`] });
  else if (left <= RG.warn && left > 0) out.push({ k: "규제 예고", v: `${left}달 뒤 출입 인증기·위생 점검 의무(매장당 ${won(gateCost(s))})` });
  return out;
}
function crowdScene(s, st) {
  return { kind: "event", tag: "무인카페", title: "옆 건물의 공사 가림막", text: `${st.name} 옆 건물 1층에 공사 가림막이 섰다. 종이 한 장이 붙어 있다. '무인카페 오픈 예정'. 기계만 들이면 되는 장사라 누구나 따라 연다. 한자리에 오래 있을수록 옆에 비슷한 가게가 더 자주 생긴다(매장마다 ${UC_CH.crowd.max}곳까지, 1곳마다 잔 수 −6%). 새로 여는 자리는 그 숫자가 0에서 다시 시작한다.`,
    choices: [{ t: "가림막 사진을 찍어 둔다", eff: {}, text: "단골을 붙잡을 방법을 적어 봤다. 청결, 원두, 가격. 셋 중 둘은 지켜야 한다." }] };
}
function leaseScene(s, st, up, hot) {
  const nr = Math.round(st.rent * (1 + up)), hr = Math.round(st.rent * (1 + up / 2)), pc = Math.round(up * 1000) / 10;
  return { kind: "event", tag: "무인카페", title: "월세 재계약", onChoose: "uc_lease", f30: { id: st.id, up }, best: [],
    text: `${st.name} 계약이 ${Math.round(st.months / 12)}년을 채웠다. 건물주가 전화했다. "${hot ? "요즘 손님 많던데요. " : ""}이번엔 ${pc}% 올려야겠어요." 월세 ${won(st.rent)} → ${won(nr)}.${hot ? " 장사가 잘되는 걸 건물주도 봤다." : ""}`,
    choices: [
      { t: `받아들인다 (월세 ${won(nr)})`, eff: {}, text: "도장을 찍었다. 고정비가 한 칸 올랐다." },
      { t: `깎아 달라고 한다 (통하면 ${won(hr)})`, check: { stat: "talk", dc: UC_CH.lease.dc }, ok: { text: "\"2년 동안 월세 한 번 안 밀렸잖아요.\" 건물주가 한숨을 쉬고 절반만 올렸다.", eff: {} }, ng: { text: "\"싫으면 빼세요. 들어올 사람 많아요.\" 부른 대로 찍었다.", eff: { mental: -3 } } },
    ] };
}
function swapScene(s, st) {
  st.sq = { t: s.t, buy: Math.round(UC_CH.age.buy * SYN.pi(s)), inst: Math.round(UC_CH.age.inst * SYN.pi(s)) }; // 부른 값을 적어 둔다
  const A = UC_CH.age, pi = SYN.pi(s), y = Math.floor(machAge(st) / 12), rent = st.machine === "rent", c = swapCost(s, st), again = !!st.mHold;
  const ch = rent ? [
    { t: `새 기계로 재계약한다 (월 렌탈 ${won(Math.round(rentalOf(st) * pi))} → ${won(Math.round(A.rental2 * pi))})`, eff: {}, text: "새 기계가 들어왔다. 추출 소리부터 다르다." },
    { t: "그대로 쓴다 (렌탈비 그대로, 고장 ↑ 맛 ↓)", eff: {}, text: "기사님이 고개를 저었다. \"부품이 이제 안 나와요.\"" },
  ] : [
    { t: `새 기계를 산다 (${won(c)})`, eff: {}, text: "새 기계가 들어왔다. 추출 소리부터 다르다." },
    { t: "그대로 쓴다 (돈은 안 들지만 고장 ↑ 맛 ↓)", eff: {}, text: "기사님이 고개를 저었다. \"부품이 이제 안 나와요.\"" },
    { t: `렌탈로 바꾼다 (설치 ${won(swapCost(s, st, "rent"))}, 월 ${won(Math.round(A.rental2 * pi))})`, eff: {}, text: "목돈 대신 매달 내기로 했다. 수리는 이제 렌탈 회사 몫이다." },
  ];
  return { kind: "event", tag: "무인카페", title: again ? "기계가 더 낡았다" : "기계를 바꿀 때", onChoose: "uc_swap", f30: { id: st.id }, best: [],
    text: `${st.name} 커피 머신이 ${y}년 됐다. 추출이 느려지고 스팀 소리가 거칠다. 점검 기사가 말했다. "이제 바꾸실 때예요." 안 바꾸면 고장은 해마다 늘고, 커피 맛은 해마다 ${Math.round(A.qDown * 100)}%씩 떨어진다.`, choices: ch };
}
function regScene(s) {
  const RG = UC_CH.reg, n = s.uc.stores.length, c = Math.round(UC_CH.reg.gate * SYN.pi(s)); if (s.uc.ch) s.uc.ch.gq = { t: s.t, c }; // 부른 값을 적어 둔다
  return { kind: "event", tag: "무인카페", title: "무인 매장 규제가 시작됐다", onChoose: "uc_reg", best: [],
    text: `구청에서 공문이 왔다. 무인 매장은 밤에 청소년 출입을 관리하고 위생 점검을 받아야 한다. 출입 인증기를 달면 지금처럼 24시간 열 수 있다. 안 달면 밤 영업을 못 하고(잔 수 −${Math.round((1 - RG.keep) * 100)}%), 단속에 걸리면 과태료 ${RG.fine[0]}~${RG.fine[1]}만 원이다.`,
    choices: [
      { t: `매장마다 출입 인증기를 단다 (${n}곳 × ${won(c)} = ${won(c * n)})`, eff: {}, text: "문 옆에 인증기가 붙었다. 밤 손님은 카드를 한 번 대고 들어온다." },
      { t: "안 단다 (밤 영업 금지, 가끔 과태료)", eff: {}, text: "밤 12시에 불을 끄기로 했다. 새벽 매출이 빠진다." },
    ] };
}
// 스태미너·멘탈만 바꾸는 가벼운 효과(core applyEff 를 부르지 않아 순환 import 를 늘리지 않는다)
function applyEffLite(s, e) { const out = []; if (e.hp) { s.hp = clamp(s.hp + e.hp, 0, s.hpMax || 100); out.push(`스태미너 ${e.hp}`); } if (e.mental) { s.mental = clamp(s.mental + e.mental, 0, 100); out.push(`멘탈 ${e.mental}`); } return out; }
