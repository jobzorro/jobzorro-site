// 파티룸 보드: 상권 → 매물(숨은 정보) → 계약·컨셉·인테리어 → 여러 지점 운영(규모의 경제)
import * as D from "./defs.js";
import { CHAR, addMoney, applyEff, helperPower, helpers, mod, won, log, creditRoom, addLoan, openScene, meetScene, gainStat, giveBrk, addAff, monthlySpend, R } from "./core.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import * as DF from "./decofx.js"; // 방 꾸미기 감성 점수 효과
import { JOBEV } from "../gen/data.js";
import * as RD from "./round.js";
export const PR_R1 = { occ: 1 /* 11-26 대표 결정: 1회차 보정을 없앤다(1.5 → 1). 대신 defs.js PR_YOUNG(새 방 가속)·PR_PKMKT(성수기 시세). 아래는 지난 기록.  11-25: 1.6 → 1.68 → 1.35 → 1.5(비용·마케팅비가 붙어 1회차 C 67%가 돼 대표 승인으로 올림). 대표 기준(24평 비수기 이익 50~150만)보다 1회차가 높아(비수기 가운데 115~158만, 위 25% 220~260만) 낮췄다. 봇 손잡이: 환경변수 PRR1 */ }; if (typeof process !== "undefined" && process.env?.PRR1) PR_R1.occ = +process.env.PRR1;
const PR_KOCC = (typeof process !== "undefined" && +process.env?.PRK) || D.PR_K; // 예약률 상수(봇 손잡이: 환경변수 PRK)
import * as PW from "./prwave.js"; // 11-23 컨셉 위기·컨셉 잠금·관리 이득
import * as RVW from "./review.js"; // v4.28 경쟁사 가격표·가격 전쟁·후기 사건
import * as SP from "./space.js"; // 11-25 건물 장기 임대(월세 그대로)·히든 길 켜짐 여부

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// ───────── 11-27 한자리에 오래 있으면 서서히 불리 · 제때 넘기고 새 자리로 옮기면 이득(대표 요청) ─────────
// 봇 손잡이: 환경변수 PRMK(식상함·경쟁 누적 배율) · PRCARRY(가구·후기를 들고 가는 비율 배율). 기본 1
const envN = (k) => (typeof process !== "undefined" && +process.env?.[k]) || 0;
const MK = envN("PRMK") || 1, CK = envN("PRCARRY") || 1;
export const PR_MV = {
  k: MK, ck: CK,
  rent: { up: [0.04, 0.06], good: [0.03, 0.04] }, // 24달마다 재계약: +4~6%, 건물주가 '환영'이면 +3~4%. 건물 장기 임대(SP.landLock)면 그대로
  stale: { from: 48, yr: 0.02, max: 0.2, furn: 0.5, furnPart: 0.8, concept: 0.5 }, // 식상함: 문 연 지 4년부터 예약 −2%/년(×PRMK), 최대 −20%. 봇 300판으로 고른 값(3.5%/년이면 안 옮기는 봇 파이어 12%·파산 22%). 가구 전부 교체·컨셉 변경이면 절반으로, 부분 교체면 ×0.8
  comp: { from: 36, yr: 0.005, max: 0.03 }, // 동네 경쟁 누적: 내 지점이 그 동네에서 3년을 넘기면 새 파티룸이 생길 확률 +0.5%p/년(×PRMK), 최대 +3%p(기존 경쟁 입점 구조에 더한다)
  key: { lo: 300, hi: 2000, ap: 150, rev: 150, w: [0.5, 0.3, 0.2], young: 0.6, offer: [1.15, 1.4] }, // 권리금 300만~2,000만(물가 반영 전). 1년 평균 이익 월 150만·별점 4.8·후기 150개면 위쪽. 적자면 300만 밑
  carry: { young: envN("PRYK") || 0.7, mo: 12, cost: 0.5, rev: 0.35, buzz: 0.35, furnEarly: 12, block: 12 }, // 넘기고 12달 안에 다른 동네에 열면: 인테리어·가구비 −50%, 후기 35%·별점·입소문 35%를 들고 간다(×PRCARRY). 쓰던 가구라 1년 일찍 낡는다. 꼼수 막기: 넘긴 그 동네에 다시 열면 그 지점 것은 못 들고 간다(block 달 동안. 계약은 된다)
  move: { at: 54, drop: 0.3, minM: 36 }, // 알림: 문 연 지 54달, 또는 1년 평균 이익이 고점보다 30% 넘게 줄었을 때 한 번(고점은 새 방 가속이 끝난 3년 차부터 잰다)
};
export function init() { return { rooms: [], listings: [], sys: { cleanContract: false, smartlock: [], booking: false, manager: false }, known: {}, lv: 1, seq: 0, promo: {}, profitHist: [], evT: -99, bestMonth: 0, know: 0, courseT: -99, teachT: -1, clubT: -1, offerT: -99, sold: 0, soldSum: 0 }; }
export const fill = (s) => { const p = s.pr; p.know = p.know || 0; p.courseT = p.courseT ?? -99; p.offerT = p.offerT ?? -99; p.sold = p.sold || 0; p.soldSum = p.soldSum || 0; for (const rm of p.rooms) { rm.buzz = rm.buzz || 0; rm.decor = rm.decor || { light: 1, seat: 1, wall: 1 }; fillSize(s, rm); fillStats(rm); } for (const L of p.listings || []) fillSize(s, L); };
// 11-26 보드 성적표: 방마다 평생 기록(hist 는 36달만 남아서 따로 센다). cum = 달마다 순익 합, books = 예약 건수 합,
// bestM·worstM = 매출(res.rev)이 가장 높은·낮은 달 {t, v}. 옛 저장은 처음 한 번 hist 로 채운다(36달 넘은 것은 빠짐, 매출 없는 옛 기록은 지난달 매출만)
const hProfit = (h) => (typeof h === "number" ? h : h?.profit || 0);
function fillStats(rm) {
  if (rm.stV) return;
  const h = rm.hist || [];
  rm.cum = rm.cum ?? h.reduce((a, x) => a + hProfit(x), 0);
  rm.books = rm.books ?? h.reduce((a, x) => a + (typeof x === "object" && x ? Math.round((x.occ || 0) * D.PR_SLOTS) : 0), 0);
  if (!rm.bestM) { let b = null, w = null; for (const x of h) if (x && x.rev != null) { if (!b || x.rev > b.v) b = { t: x.t, v: x.rev }; if (!w || x.rev < w.v) w = { t: x.t, v: x.rev }; }
    if (!b && rm.last && rm.last.rev != null) { const t = h.length && typeof h.at(-1) === "object" ? h.at(-1).t : null; if (t != null) b = w = { t, v: rm.last.rev }; }
    rm.bestM = b; rm.worstM = w ? { ...w } : null; }
  rm.stV = 1;
}
// 화면용(저장을 건드리지 않음): 기록이 없으면 hist 에서 셈
export function roomStats(rm) { if (rm.stV) return { cum: rm.cum || 0, books: rm.books || 0, bestM: rm.bestM || null, worstM: rm.worstM || null }; const c = { hist: rm.hist, last: rm.last }; fillStats(c); return { cum: c.cum, books: c.books, bestM: c.bestM, worstM: c.worstM }; }
// 11-25 옛 저장: 평수·층이 없는 방은 월세에서 거꾸로 어림한다(평당 6.5만 기준, 10~60평). 층이 없으면 2층. 인원은 평수에서 다시 센다
function fillSize(s, x) {
  if (!(x.size > 0)) x.size = clamp(Math.round((x.rent || 130) / (6.5 * SYN.pi(s))) || 20, 10, 60);
  if (x.floor === undefined || x.floor === null) x.floor = 2;
  x.cap = capOf(x.size);
  if (x.concept !== undefined && !x.rv) fillOld(s, x);
}
// 11-25 새 규칙 전에 계약한 방(rv 없음)을 한 번만 옮긴다. 예약률 상수를 낮췄으니 옛 월세를 그대로 두면 옛 방만 손해를 본다
// 1) 월세가 지금 기준(그 상권 가운데 값)보다 비싸면 그 값으로 내린다(싸면 그대로)  2) 한 건 값을 새 크기 배율로 바꿔 시세와 같은 비율을 지킨다
function fillOld(s, rm) {
  rm.rv = 1;
  const oldP = (rm.size >= 40 ? 1 + (rm.size - 30) / 60 : rm.size < 18 ? 0.85 : 1) * (rm.concept === "mega" ? 2.0 / D.CONCEPTS.mega.priceF : 1), k = sizeP(rm) / oldP;
  if (rm.price && Math.abs(k - 1) > 0.01) { rm.price = clamp(Math.round(rm.price * k), 5, PRICE_MAX); if (rm.warBase) rm.warBase = Math.round(rm.warBase * k); }
  const fair = D.DISTRICTS[rm.dk] ? rentFor(s, { ...rm, walk: rm.walk ?? 8 }, 0.5) : rm.rent;
  if (rm.rent > fair) { log(s, `${rm.name}: 건물주와 월세를 다시 맞췄다. 월 ${won(rm.rent)} → ${won(fair)}(요즘 시세: 평당 ${Math.round(fair / rm.size * 10) / 10}만)`, "work"); rm.rent = fair; }
}
const PRICE_MAX = 300; // 한 건 가격 상한(만원). 80명 방의 대형 단체 값이 100만을 넘을 수 있어 120 → 300
// 노하우 0~100: 별점 +최대 0.25, 비용 −최대 20%, 관리 행동력 −최대 1.5
const knowStar = (s) => (s.pr.know || 0) / 400, knowCost = (s) => 1 - (s.pr.know || 0) / 500;
// 상권 시장 상태: 경쟁 파티룸 수와 그들의 평균 1건 가격. 잘되는 상권엔 새 가게가 들어오고, 불황엔 문을 닫는다
export function mkt(s, dk) {
  s.pr.mkt = s.pr.mkt || {};
  if (!s.pr.mkt[dk]) { const d = D.DISTRICTS[dk]; s.pr.mkt[dk] = { comp: Math.round((d.comp[0] + d.comp[1]) / 2), price: d.price * SYN.pi(s) * 0.98, hist: [] }; }
  return s.pr.mkt[dk];
}
// 11-27 동네 경쟁 누적: 내 지점이 한 동네에서 오래 잘될수록 따라 여는 가게가 는다(3년부터 해마다 +0.5%p, 최대 +3%p)
const oldIn = (mine) => { const C = PR_MV.comp, m = Math.max(0, ...mine.map((x) => x.months || 0)); return m >= C.from ? Math.min(C.max, C.yr * (Math.floor((m - C.from) / 12) + 1)) * MK : 0; };
function mktMonth(s, r, notes, scenes = []) {
  for (const dk of Object.keys(D.DISTRICTS)) {
    const M = mkt(s, dk), d = D.DISTRICTS[dk];
    const mine = s.pr.rooms.filter((x) => x.dk === dk && x.status === "open" && x.last);
    // v4.28 가격 전쟁: 경쟁이 많을수록 잘 터진다. 끝나면 따라 내린 가격을 원래대로
    const W = D.PRICE_K.war;
    if (M.war && s.t >= M.war.until) { M.war = null; for (const x of s.pr.rooms) if (x.dk === dk && x.warBase) { x.price = x.warBase; x.warBase = null; } if (mine.length) notes.push(`${d.n} 가격 전쟁이 끝났다. 따라 내린 가격은 원래대로`); }
    else if (!M.war && mine.length && s.t - (M.warT ?? -99) >= W.gap && r.chance(W.p * (1 + Math.max(0, M.comp - d.comp[0]) * 0.3) * (isPeak(s.cal) ? 0.5 : 1.3))) {
      const who = r.int(0, 3), cut = r.range(W.cut[0], W.cut[1]); M.war = { until: s.t + r.int(W.len[0], W.len[1]), cut, who }; M.warT = s.t;
      const cl = RVW.compList("pr", dk, refPrice(s, mine[0]), Math.min(5, Math.max(3, M.comp)), s.t, null);
      s._prWar = { dk }; scenes.push(RVW.warScene({ job: "pr", where: d.n, who: cl[who % cl.length].n, cut, list: mine.map((x) => ({ id: x.id, name: x.name, price: x.price })) }));
    }
    const occ = mine.length ? mine.reduce((a, x) => a + x.last.occ, 0) / mine.length : 0.5;
    const H = D.PR_HARD, pIn = 0.035 + H.compIn + (isPeak(s.cal) ? 0.02 : 0) + (occ > 0.7 ? 0.05 : 0) + (mine.some((x) => (x.buzz || 0) > 50) ? 0.02 : 0) + (s.era.bigcomp ? 0.07 : 0) - (s.era.winter ? 0.02 : 0) + oldIn(mine);
    const pOut = 0.02 + (s.era.winter ? 0.05 : 0) + (s.era.pandemic ? 0.08 : 0) + (M.comp > d.comp[1] ? 0.04 : 0);
    if (M.comp < d.comp[1] + H.compMax && r.chance(pIn)) { M.comp++; M.price *= 0.99; if (mine.length) notes.push(d.n + "에 새 파티룸이 생겼다(경쟁 " + M.comp + "곳, 시세 " + Math.round(M.price) + "만)"); }
    else if (M.comp > 0 && r.chance(pOut)) { M.comp--; M.price *= 1.015; if (mine.length) notes.push(d.n + " 경쟁 파티룸 한 곳이 문을 닫았다(경쟁 " + M.comp + "곳)"); }
    if (M.comp > d.comp[1] + 2) M.price *= 0.997; // 경쟁이 심하면 가격 경쟁
    M.price *= 1 + H.priceInfl / 12; // v4.27 시세는 거의 못 올린다(비용은 물가대로)
    M.hist.push(M.comp); if (M.hist.length > 24) M.hist.shift();
  }
}
// ───────── 꾸미기 ─────────
function presetDecor(r) { const o = {}; for (const [k, sl] of Object.entries(D.DECOR)) o[k] = r.int(1, sl.opts.length - 1); return o; }
// 컨셉과 꾸밈의 궁합 0~1
export function decorFit(concept, decor) {
  const want = D.DECOR_WANT[concept] || {}; let got = 0, best = 0;
  for (const [k, sl] of Object.entries(D.DECOR)) {
    const sc = (o) => o.tags.reduce((a, tg) => a + (want[tg] || 0), 0);
    best += Math.max(...sl.opts.map(sc));
    const i = decor?.[k]; if (i !== undefined) got += sc(sl.opts[i]);
  }
  return best ? Math.min(1, got / best) : 0;
}
// 컨셉에 가장 잘 맞는 꾸밈(칸마다 점수 높은 것, 같으면 싼 것)
export function bestDecor(concept) { const want = D.DECOR_WANT[concept] || {}; const o = {}; for (const [k, sl] of Object.entries(D.DECOR)) { let bi = 0, bv = -1; sl.opts.forEach((op, i) => { const v = op.tags.reduce((a, tg) => a + (want[tg] || 0), 0) - op.c / 1000; if (v > bv) { bv = v; bi = i; } }); o[k] = bi; } return o; }
export const decorFilled = (decor) => Object.keys(decor || {}).filter((k) => D.DECOR[k]).length;
export function decorQ(s, rm) { const f = decorFit(rm.concept, rm.decor); const fill = decorFilled(rm.decor) / Object.keys(D.DECOR).length; return clamp(f * (0.6 + s.st.sense / 250) * (0.5 + fill / 2), 0, 1.2); }
export function decorCost(s, rm, picks) {
  let c = 0; for (const [k, i] of Object.entries(picks)) { if (!D.DECOR[k] || rm.decor?.[k] === i) continue; c += D.DECOR[k].opts[i].c; }
  return Math.round(c * rm.size / 22 * SYN.pi(s) * D.scaleF(s.pr.rooms.length) * mod(s, "interiorCost", 1));
}
export const avgProfit = (rm) => { const h = rm.hist.slice(-6); return h.length ? h.reduce((a, x) => a + x.profit, 0) / h.length : 0; };
export const conceptOk = (L, k, s) => { const c = D.CONCEPTS[k]; return (c.req ? c.req(L) : null) || (s ? PW.lockWhy(s, k) : null); }; // s 를 주면 능력치 잠금도 본다(11-23)
export function quote(s, L, o) {
  const it = D.INTERIORS[o.interior ?? 1], scale = L.size / 22, pi = SYN.pi(s), n = s.pr.rooms.length + 1, sf = D.scaleF(n);
  let interior = Math.round(it.cost * scale * pi * sf * (D.PR_COND[L.cond || "empty"]?.cost ?? 1) * mod(s, "interiorCost", 1) * mod(s, "openCost", 1) * (1 - helperPower(s, "pr_interior") * 0.12));
  if (o.self) interior = Math.round(interior * 0.65);
  const ondol = o.ondol && L.hid.ondolOk !== false ? Math.round(250 * scale * pi * sf) : 0;
  let kit = Math.round((D.CONCEPTS[o.concept]?.kit || 0) * pi * sf);
  let furn = Math.round(400 * pi * sf);
  // 11-27 넘긴 지점의 가구·소품을 들고 온다(다른 동네, 12달 안): 인테리어·가구비 할인. 컨셉 장비는 같은 컨셉일 때만
  const cr = carryFor(s, L), cf = cr ? carryCut() : 0; let carry = null;
  if (cr) { const b = interior + furn + kit; interior = Math.round(interior * (1 - cf)); furn = Math.round(furn * (1 - cf)); if (cr.concept === o.concept) kit = Math.round(kit * (1 - cf)); carry = { name: cr.name, save: b - interior - furn - kit, cut: cf, reviews: carryRev(cr), rating: cr.rating }; }
  return { interior, ondol, kit, furn, total: L.dep + L.key + interior + ondol + kit + furn, sf, pi, carry };
}
// 내놓으면 받을 수 있는 돈(보증금 + 권리금): 별점·수익이 좋을수록 비싸게 판다
// 11-27 대표: 파티룸은 권리금이 낮다(300만~2,000만, 물가 반영 전). 전에는 max(산 권리금 × 0.5, 최근 6달 평균 이익 × 10) × 별점 계수라 잘되는 방은 3,000만을 넘었다
export const avg12 = (rm) => { const h = (rm.hist || []).slice(-12); return h.length ? h.reduce((a, x) => a + hProfit(x), 0) / h.length : 0; }; // 여름·겨울 차이가 커서 추세·권리금은 12달 평균으로 본다
// 넘길 때 받는 권리금(만원, 물가 반영). 이익(1년 평균)이 클수록, 별점이 높을수록, 후기가 많을수록 위쪽. 적자면 300만 밑(별점이 낮으면 0)
export function keyQuote(s, rm) {
  const K = PR_MV.key, pi = SYN.pi(s), ap = ((rm.hist || []).length >= 12 ? avg12(rm) : avgProfit(rm)) / pi;
  const rf = clamp((rm.rating - 4.0) / 0.8, 0, 1), vf = clamp((rm.reviews || 0) / K.rev, 0, 1);
  let key = ap <= 0 ? K.lo * 0.5 * rf : K.lo + (K.hi - K.lo) * clamp(ap / K.ap, 0, 1) * (K.w[0] + K.w[1] * rf + K.w[2] * vf);
  key = Math.min(K.hi, key * (rm.months >= 6 ? 1 : K.young) * trendKey(s, rm)); // 히든 길(유행 컨셉)은 2배, 그래도 2,000만까지
  return Math.round(key * pi / 10) * 10;
}
export function resale(s, rm) { return rm.dep + keyQuote(s, rm); }
// 들고 가기: 넘긴 지점 기록(s.pr.carry)에서 이 매물에 쓸 수 있는 것(12달 안 · 다른 동네) 하나. 후기가 많은 것부터
const carryCut = () => Math.min(0.8, PR_MV.carry.cost * CK), carryRev = (c) => Math.round((c.reviews || 0) * Math.min(0.9, PR_MV.carry.rev * CK));
export const carryList = (s) => (s.pr.carry || []).filter((c) => s.t - c.t <= PR_MV.carry.mo);
export function carryFor(s, L) { return carryList(s).filter((c) => c.dk !== L.dk).sort((a, b) => (b.reviews || 0) - (a.reviews || 0))[0] || null; }
export const leftWait = (s, dk) => { const t = s.pr.left?.[dk]; return t == null ? 0 : Math.max(0, PR_MV.carry.block - (s.t - t)); }; // 넘긴 동네에서 '들고 가기'가 다시 될 때까지 남은 달(그동안 그 동네에 새로 열면 그 지점의 가구·후기는 못 쓴다)
// 지점을 넘길 때(양도·권리금 매각) 남기는 기록: 가구·소품·후기. 폐업(원상복구)과 건물주 강제 폐업은 남기지 않는다
function leave(s, rm, key) {
  const p = s.pr; p.left = p.left || {}; p.left[rm.dk] = s.t; p.mvN = (p.mvN || 0) + 1; p.mvKey = (p.mvKey || 0) + Math.max(0, key || 0);
  if (rm.status !== "open") return;
  p.carry = carryList(s); p.carry.push({ t: s.t, dk: rm.dk, name: rm.name, concept: rm.concept, size: rm.size, reviews: rm.reviews || 0, rating: rm.rating, buzz: rm.buzz || 0, decor: { ...(rm.decor || {}) }, deco: rm.deco || null, decoS: rm.decoS ?? null, decoAuto: !!rm.decoAuto, decoHand: rm.decoHand || 0 });
  if (p.carry.length > 4) p.carry = p.carry.slice(-4);
}
// 이 자리 추세: 1년 평균 이익(물가 뺀 값)이 고점보다 얼마나 줄었나(−0.3 = 30% 줄었다). 고점(rm.pk)은 달마다 갱신
export const trend = (s, rm) => (rm.pk > 0 ? avg12(rm) / SYN.pi(s) / rm.pk - 1 : 0);
export const moveDue = (s, rm) => rm.status === "open" && (rm.months >= PR_MV.move.at || (rm.months >= PR_MV.move.minM && trend(s, rm) <= -PR_MV.move.drop));
export const staleOf = (rm) => rm.stale || 0;
// 화면·알림용 한 줄 정보
export function moveInfo(s, rm) {
  const key = keyQuote(s, rm), tr = Math.round(trend(s, rm) * 100), a = avg12(rm), y = Math.floor(rm.months / 12) + 1;
  const txt = rm.months < 12 ? "아직 1년이 안 됐어요" : a < 0 ? "1년 평균 적자" : tr <= -5 ? `1년 평균 이익이 고점보다 ${-tr}% 줄었어요` : "1년 평균 이익은 고점 근처";
  const why0 = transferWhy(s, rm); if (why0) return { y, tr, txt, avg: Math.round(a), dep: rm.dep, key: 0, total: rm.dep, due: moveDue(s, rm), stale: Math.round(staleOf(rm) * 100), bad: true, why: why0 }; // 11-27 QA: 넘길 수 없으면 권리금 없이 보증금만
  return { y, tr, txt, avg: Math.round(a), dep: rm.dep, key, total: rm.dep + key, due: moveDue(s, rm), stale: Math.round(staleOf(rm) * 100), bad: tr <= -PR_MV.move.drop * 100 || (rm.months >= 12 && a < 0), why: transferWhy(s, rm) };
}
// 11-25 히든 길 '시대보다 한발 빠른 컨셉'(hidden.js): 유행이 온 동안(36달) 그 컨셉 방은 예약 +40%(상한도 조금 위로)·권리금 2배. 위기로 멈춘 달엔 없다
export const PR_TREND = { occ: 0.4, cap: 1.12, capMax: 0.95, key: 2 };
export const trendOn = (s, rm) => !!rm && SP.hidOn(s, "pr") && s.hid.j.pr.f?.trend === rm.concept;
const trendKey = (s, rm) => (trendOn(s, rm) ? PR_TREND.key : 1);

// 11-25 대표: 첫 부동산은 좋은 물건이 잘 안 나온다. 첫 방을 잡기 전 처음 두 번은 별로인 매물만(역에서 멀고, 엘리베이터 없는 위층, 화장실 밖, 냉난방기만, 소음·깐깐한 건물주).
// 두 번째로 본 다음 달에 "부동산 사장님께 내가 원하는 걸 말해야겠다" 장면 → 고른 조건(want)에 맞는 매물이 나온다. 난수를 더 쓰지 않는다(이미 뽑은 값을 고쳐 쓴다)
export const PR_WANT = {
  walk: { n: "역에서 가까운 곳", d: "역 도보 6분 안" },
  lift: { n: "2~3층, 엘리베이터 있는 곳", d: "손님이 짐 들고 올라오기 편하게" },
  fac: { n: "화장실 안·개별 보일러", d: "후기에서 깎이는 시설 문제부터 막는다" },
  cheap: { n: "월세·권리금 싼 곳", d: "첫 방은 버티는 게 먼저" },
};
function badListing(L) {
  L.bad = 1; L.walk = 11 + (L.walk % 5); L.toilet = "out"; L.heating = "냉난방기만"; L.parking = 0;
  if (L.floor !== -1) { L.floor = L.walk % 2 ? 5 : 4; L.elevator = false; } else L.hid.sound = "보통";
  if (L.floor !== -1) L.hid.sound = "나쁨"; L.hid.landlord = L.walk % 2 ? "싫어함" : "찜찜"; L.hid.ondolOk = false;
}
function wantListing(s, L) {
  const w = s.pr.want; L.want = w;
  if (w === "walk") L.walk = 2 + (L.walk % 5);
  else if (w === "lift") { L.floor = L.walk % 2 ? 2 : 3; L.elevator = true; }
  else if (w === "fac") { L.toilet = "in"; L.heating = "개별보일러"; L.hid.ondolOk = true; }
  else if (w === "cheap" && !s.pr.rooms.length) { const m = Math.max(D.PR_RENT.min * SYN.pi(s), Math.floor(L.rent * 0.88 / 5) * 5); L.rent = Math.min(L.rent, m); L.key = L.key ? Math.max(300, Math.round(L.key * 0.6 / 10) * 10) : 0; }
}
export function wantScene(s) {
  return { kind: "event", tag: "투잡", title: "부동산 사장님께 말해야겠다", onChoose: "pr_want", bg: "realty", best: [],
    text: "두 번이나 부동산을 돌았는데 보여 준 건 다 그저 그랬다. 역에서 멀고, 계단만 있는 5층, 화장실은 복도 끝. 사장님은 \"요즘 다 이래요\"만 되풀이했다. 이번엔 내가 먼저 말해야겠다. 파티룸을 할 거고, 이건 꼭 필요하다고.",
    choices: Object.entries(PR_WANT).map(([k, w]) => ({ t: `${w.n}을 꼭 찾아 달라고 한다`, eff: {}, text: `사장님이 수첩에 적었다. "${w.n}이라. 그런 건 나오면 바로 빠져요. 연락드릴게요." 다음 매물부터는 이 조건부터 맞춘 곳이 나온다. (${w.d})`, want: k })) };
}
export function wantChoose(s, i) { const k = Object.keys(PR_WANT)[i]; if (!k) return []; s.pr.want = k; s.pr.wantT = s.t; return [`부동산에 말한 조건: ${PR_WANT[k].n}`]; }
export function monthStart(s) {
  for (const rm of s.pr.rooms) { rm.ap = 0; rm.promo = 0; }
  if (!s.pr.rooms.length && !s.pr.want && s.pr.wantAskT != null && s.t >= s.pr.wantAskT && !s.pr.wantAsked) { s.pr.wantAsked = s.t; (s.sceneQ = s.sceneQ || []).push(wantScene(s)); } // 11-25 두 번째 부동산 다음 달
  // 매물은 2달 지나면 빠진다
  s.pr.listings = s.pr.listings.filter((l) => s.t - l.t <= 2);
}

// ───────── 매물 만들기 ─────────
function makeListing(s, r, dk, bad) {
  const d = D.DISTRICTS[dk];
  const size = r.chance(0.12) ? r.int(40, 60) : r.int(d.size[0], d.size[1]);
  const basement = r.chance(d.base);
  const floor = basement ? -1 : r.weighted([[2, 0.4], [3, 0.3], [4, 0.18], [5, 0.12]]); // 11-25 파티룸 매물은 2~5층과 지하만(1층은 안 나온다)
  const elevator = floor >= 2 ? r.chance(floor >= 4 ? 0.75 : 0.45) : false;
  const parking = r.weighted([[0, 1 - d.park * 0.6], [1, 0.35], [2, d.park * 0.4]]);
  const toilet = r.chance(basement ? 0.4 : 0.55) ? "in" : "out";
  const heating = r.weighted([["개별보일러", basement ? 0.15 : 0.45], ["중앙난방", 0.2], ["냉난방기만", basement ? 0.65 : 0.35]]);
  const ondolOk = r.chance(heating === "개별보일러" ? 0.7 : heating === "중앙난방" ? 0.4 : basement ? 0.1 : 0.15);
  const sound = basement ? r.weighted([["좋음", 0.5], ["보통", 0.35], ["나쁨", 0.15]]) : r.weighted([["좋음", 0.28], ["보통", 0.45], ["나쁨", 0.27]]);
  const access24 = r.chance(0.68);
  let landlord = r.weighted([["환영", 0.25], ["찜찜", 0.45], ["싫어함", 0.3]]);
  const comp = mkt(s, dk).comp;
  // 11-25 가끔 규칙 밖 비싼 매물이 섞인다: 역 코앞이라며 평당 8만을 넘게 부른다(첫 매물로는 계약이 막힌다. rentRule)
  const pricey = r.chance(D.PR_RENT.badP);
  const walk = pricey ? r.int(1, 4) : r.int(2, 15);
  const eraF = s.era.rentup ? 1.2 : 1, pi = SYN.pi(s) * eraF;
  const down5 = (x) => Math.floor(x / 5 + 1e-9) * 5; // 내림: 반올림 때문에 평당 값이 기준을 살짝 넘지 않게
  const rent = pricey ? down5(r.range(D.PR_RENT.bad[0], D.PR_RENT.bad[1]) * size * pi) : down5(rentFor(s, { dk, size, floor, elevator, toilet, walk }, r.next()) * eraF);
  const dep = Math.round(rent * r.range(8, 12) / 100) * 100; // 보증금은 월세 10배 안팎(월세가 내려가면 같이 내려간다)
  const KY = D.PR_KEY, noKey = r.chance(KY.none[dk] ?? 0.15); // 11-25 권리금은 300만~1,200만(물가 반영), 없는 자리도 있다
  const far = dk === "local" ? 3 : r.int(0, 2); // 집과 거리(관리 행동력 가중)
  const cond = r.weighted([["empty", 0.5], ["half", 0.3], ["turnkey", 0.2]]);
  const pre = cond === "turnkey" ? presetDecor(r) : cond === "half" ? { light: 1, kitchen: 1 } : {};
  const L = { id: "L" + (++s.pr.seq), t: s.t, dk, size, cap: capOf(size), floor, elevator, parking, toilet, heating, walk, rent, dep, key: noKey ? 0 : Math.round(clamp(r.range(d.key[0], d.key[1]) * (walk <= 5 ? 1.2 : 1) * D.PR_COND[cond].key, KY.lo, KY.hi) * pi / 10) * 10, far, cond, pre,
    hid: { sound, access24, landlord, comp, ondolOk }, seen: {} };
  // 조력자: 중개사가 숨은 정보 1개 공개
  if (helpers(s, "pr_realty").length) { const k = r.pick(["sound", "access24", "landlord", "comp", "ondolOk"]); L.seen[k] = true; }
  if (bad) badListing(L); else if (s.pr.want && !s.pr.rooms.length) wantListing(s, L); // 말해 둔 조건은 첫 방을 잡을 때까지만(그 뒤 매물은 보통)
  return L;
}
function landlordListing(s, r) { // 건물주 인연이 주는 매물
  const h = helpers(s, "pr_landlord")[0]; if (!h) return null;
  const dk = r.pick(Object.keys(D.DISTRICTS).filter((k) => k !== "local"));
  const L = makeListing(s, r, dk); L.hid.landlord = "환영"; L.seen.landlord = true; L.key = 0; L.rent = Math.round(L.rent * 0.9); L.by = h.id; return L;
}

// ───────── 행동 ─────────
export function can(s, id, arg) {
  const pr = s.pr;
  if (id === "pr_search" && arg && !D.DISTRICTS[arg]) return "없는 지역이에요";
  if (id === "pr_search" || id === "pr_meetup" || id === "pr_decor") return null;
  if (id === "pr_course") return s.t - pr.courseT < 6 ? `다음 교육은 ${6 - (s.t - pr.courseT)}달 뒤` : pr.know >= 80 ? "배울 만큼 배웠어요" : null;
  if (id === "pr_teach") return pr.rooms.length < 3 || pr.know < 50 ? `지점 3곳·노하우 50부터(지금 ${pr.rooms.length}곳·${Math.round(pr.know)})` : pr.teachT === s.t ? "이번 달은 강의했어요" : null;
  if (id === "pr_club") return !SYN.on(s, "club") ? "파티룸과 이어진 취미 모임에 다녀야 해요(와인·보드게임·밴드·러닝·사진)" : pr.clubT === s.t ? "이번 달 행사를 열었어요" : null;
  if (id === "pr_reply") return pr.rooms.some((x) => x.status === "open" && (x.unrep || 0) >= 1) ? null : "답글 달 후기가 없어요";
  if (id === "pr_review") return pr.rooms.some((x) => x.status === "open") ? null : "운영 중인 지점이 없어요";
  if (["pr_visit", "pr_landlord", "pr_appcheck"].includes(id)) { const L = pr.listings.find((x) => x.id === arg); if (!L) return "매물을 먼저 고르세요"; const k = { pr_visit: "visit", pr_landlord: "meet", pr_appcheck: "app" }[id]; if (L.seen[k]) return "이미 확인했어요"; return null; }
  if (id === "pr_setup") { const rm = pr.rooms.find((x) => x.id === arg) || pr.rooms.find((x) => x.status === "setup" && x.self > 0); if (!rm || !(rm.self > 0)) return "셀프 공사 중인 지점이 없어요"; return null; }
  if (id === "pr_manage" || id === "pr_promo") { const rm = pr.rooms.find((x) => x.id === arg) || pr.rooms.find((x) => x.status === "open"); if (!rm || rm.status !== "open") return "운영 중인 지점이 없어요"; return null; }
  return null;
}
export function act(s, r, id, arg, boost = 1) {
  const pr = s.pr;
  if (id === "pr_decor") {
    let o; try { o = typeof arg === "string" ? JSON.parse(arg) : arg; } catch (e) { o = null; }
    const rm = o && pr.rooms.find((x) => x.id === o.id); if (!rm) return { lines: ["꾸밀 지점을 고르세요"] };
    const cost = decorCost(s, rm, o.picks); if (s.cash - cost < -creditRoom(s)) return { lines: [`돈이 모자라요(${won(cost)})`] };
    const before = Math.round(decorFit(rm.concept, rm.decor) * 100);
    s.cash -= cost; addMoney(s, "exp", "파티룸 꾸미기", cost); rm.decor = { ...rm.decor, ...o.picks };
    const after = Math.round(decorFit(rm.concept, rm.decor) * 100); gainStat(s, "sense", 0.6); gainStat(s, "hands", 0.3);
    if (rm.status === "open") rm.buzz = Math.min(100, (rm.buzz || 0) + Math.max(0, after - before) / 5);
    return { lines: [`${rm.name} 컨셉 궁합 ${before}% → ${after}%`, `비용 −${won(cost)}`], msg: after >= 80 ? "\"여기 완전 인별 각이다.\" 첫 손님이 사진부터 찍었다." : after >= 50 ? "나쁘지 않다. 한두 군데만 더 손보면 될 것 같다." : "뭔가 어수선하다. 컨셉이 안 보인다." };
  }
  if (id === "pr_meetup") {
    const g = 5 * (1 - pr.know / 100) + 1; pr.know = Math.min(100, pr.know + g); const lines = [`운영 노하우 +${g.toFixed(1)} → ${Math.round(pr.know)}`];
    if (r.chance(0.3)) { const dk = r.pick(Object.keys(D.DISTRICTS).filter((k) => k !== "local")); const L = makeListing(s, r, dk); L.hid.landlord = "환영"; L.seen.landlord = L.seen.meet = true; L.key = Math.round(L.key * 0.5); pr.listings.push(L); lines.push(`${D.DISTRICTS[dk].n} 좋은 매물 정보(권리금 반값)`); }
    const cands = s.cast.filter((id2) => !s.rel[id2] && /사장|대표|자영업|창업|운영/.test(CHAR[id2]?.job || ""));
    if (cands.length && r.chance(0.3)) return { scene: meetScene(s, r.pick(cands), "옆자리 사장님이 명함을 건넸다. "), lines };
    return { lines, msg: r.pick(["\"청소 업체는 여기가 제일 싸요.\" 단톡방에 초대받았다.", "\"파티룸 권리금은 많아야 2천이에요. 넘길 땐 가구랑 후기를 들고 새 자리로 가는 게 남는 장사죠.\"", "\"민원은 첫 통화가 전부예요. 먼저 찾아가세요.\""]) };
  }
  if (id === "pr_course") { pr.courseT = s.t; const g = 14 * (1 - pr.know / 120); pr.know = Math.min(100, pr.know + g); gainStat(s, "num", 1); return { lines: [`운영 노하우 +${g.toFixed(1)} → ${Math.round(pr.know)}`, "숫자 +"], msg: "공간 창업 아카데미 4주 과정. 손익표 템플릿을 받았다." }; }
  if (id === "pr_teach") {
    pr.teachT = s.t; const fee = Math.round((60 + pr.know) * SYN.pi(s) * mod(s, "lectureMult", 1)); s.cash += fee; addMoney(s, "inc", "파티룸 강의료", fee);
    for (const x of pr.rooms) x.buzz = Math.min(100, (x.buzz || 0) + 5); pr.know = Math.min(100, pr.know + 1.5);
    const lines = [`강의료 +${won(fee)}`, "모든 지점 입소문 +5", ...applyEff(s, { eye: 4 }), giveBrk(s, "num", "창업 강의"), `매력 +${gainStat(s, "charm", 0.5).toFixed(1)}`]; if (s.sj.active.includes("cs")) { s.cs.refer += 0.5; lines.push("컨설팅 소개 +"); }
    return { lines, msg: "\"파티룸, 입지보다 운영입니다.\" 수강생 30명이 받아 적었다." };
  }
  if (id === "pr_club") {
    pr.clubT = s.t; const hb = s.hb.joined.find((h) => D.CLUB_HOBBY[h]); const rm = pr.rooms.filter((x) => x.status === "open").sort((a, b) => b.size - a.size)[0];
    const lvb = 1 + (s.hb.cnt[hb] || 0) / 30; const rev = Math.round(r.int(40, 90) * SYN.pi(s) * lvb); s.cash += rev; addMoney(s, "inc", "파티룸 매출", rev);
    rm.buzz = Math.min(100, (rm.buzz || 0) + 12); for (const id2 of s.spot["hb_" + hb] || []) if (s.rel[id2]) addAff(s, id2, 3);
    s.mental = clamp(s.mental + 3, 0, 100);
    return { lines: [`${D.CLUB_HOBBY[hb]} 매출 +${won(rev)}`, `${rm.name} 입소문 +12`, "모임 사람들 호감 +3", "멘탈 +3"], msg: `${D.HOBBIES[hb].n} 사람들이 ${rm.name}에 모였다. 다들 인별에 사진을 올렸다.` };
  }
  if (id === "pr_reply") {
    const rm = pr.rooms.find((x) => x.id === arg && x.status === "open") || pr.rooms.filter((x) => x.status === "open").sort((a, b) => (b.unrep || 0) - (a.unrep || 0))[0];
    const n = Math.min(rm.unrep || 0, Math.round(20 + (s.st.write || 0) / 3)); rm.unrep = Math.max(0, (rm.unrep || 0) - n); rm.replyT = s.t; gainStat(s, "write", 0.4);
    return { lines: [`${rm.name} 답글 ${Math.round(n)}개 · 남은 것 ${Math.round(rm.unrep)}`, "이번 달 별점 +"], msg: r.pick(["\"다음엔 풍선 서비스 드릴게요!\" 답글마다 손님 이름을 넣었다.", "악성 후기에도 차분하게. '확인해 보니…'로 시작했다.", "답글을 다 달고 나니 새 예약 알림이 울렸다."]) };
  }
  if (id === "pr_review") { const open = pr.rooms.filter((x) => x.status === "open"); for (const x of open) { x.buzz = Math.min(100, (x.buzz || 0) + 8 * D.CONCEPTS[x.concept].sns); x.reviews = (x.reviews || 0) + 3; x.unrep = (x.unrep || 0) + 3; } gainStat(s, "mkt", 0.4); return { lines: [`${open.length}곳 입소문 +`], msg: "\"후기 남기면 음료 쿠폰!\" 블로그 체험단 10명을 모았다." }; }
  if (id === "pr_search") {
    const dk = arg || "univ";
    const n = 3 + (helpers(s, "pr_realty").length ? 1 : 0);
    const first = !pr.rooms.length && !pr.want; if (first) pr.srchN = (pr.srchN || 0) + 1; // 11-25 첫 방을 잡기 전 처음 두 번은 별로인 매물만
    const bad = first && pr.srchN <= 2; if (first && pr.srchN === 2 && pr.wantAskT == null) pr.wantAskT = s.t + 1;
    const ls = Array.from({ length: n }, () => makeListing(s, r, dk, bad));
    if (r.chance(0.5) && !bad) { const ll = landlordListing(s, r); if (ll) ls.push(ll); }
    pr.listings = pr.listings.filter((l) => l.dk !== dk).concat(ls);
    gainStat(s, "num", 0.3);
    return { lines: [`${D.DISTRICTS[dk].n} 매물 ${ls.length}개`, ...(bad ? ["사장님이 먼저 보여 준 물건들. 하나같이 아쉽다"] : pr.want && !pr.rooms.length ? [`말해 둔 조건(${PR_WANT[pr.want].n})에 맞춘 물건이 나왔다`] : [])], msg: bad ? "\"요즘 다 이래요. 좋은 건 나오자마자 빠져요.\"" : D.DISTRICTS[dk].tip, open: "listings:" + dk };
  }
  const L = pr.listings.find((x) => x.id === arg);
  if (id === "pr_visit") {
    L.seen.visit = L.seen.sound = L.seen.access24 = L.seen.ondolOk = true; gainStat(s, "hands", 0.2);
    const msg = [`방음 ${L.hid.sound}`, L.hid.access24 ? "24시간 출입 가능" : "밤 12시 이후 출입 불가", L.hid.ondolOk ? "온돌 시공 가능" : "온돌 시공 불가"];
    return { lines: msg, msg: L.hid.sound === "나쁨" ? "벽을 두드리니 옆집 TV 소리가 들린다." : "발로 바닥을 굴러 봤다. 생각보다 조용하다." };
  }
  if (id === "pr_landlord") {
    L.seen.meet = L.seen.landlord = true;
    let msg = `건물주: ${L.hid.landlord}`;
    if (L.hid.landlord !== "환영") {
      const p = clamp(0.5 + (s.st.talk - 45) / 40, 0.05, 0.9) * (L.hid.landlord === "싫어함" ? 0.45 : 1);
      if (r.chance(p)) { L.hid.landlord = L.hid.landlord === "싫어함" ? "찜찜" : "환영"; msg += ` → 설득 성공, ${L.hid.landlord}`; }
      else msg += " (설득 실패)";
    }
    return { lines: [msg], msg: L.hid.landlord === "환영" ? "\"요즘 젊은 사장님들 열심이지. 잘해 봐요.\"" : "\"시끄럽게만 안 하면...\" 눈빛이 날카롭다." };
  }
  if (id === "pr_appcheck") {
    L.seen.app = L.seen.comp = true;
    const extra = mod(s, "appReveal", 1) >= 2 ? (L.seen.sound ? "landlord" : "sound") : null; if (extra) L.seen[extra] = true;
    const d = D.DISTRICTS[L.dk];
    const best = Object.entries(d.fit).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => D.CONCEPTS[k].n).join(", ");
    const M = mkt(s, L.dk);
    return { lines: [`반경 500m 경쟁 파티룸 ${M.comp}곳 · 평균 1건 ${Math.round(M.price)}만`, `예약 많은 컨셉: ${best}`, extra ? `${extra === "sound" ? "방음" : "건물주"} 리뷰로 확인: ${L.hid[extra]}` : ""].filter(Boolean), msg: "우주공간 지도를 30분 동안 뒤졌다." };
  }
  if (id === "pr_setup") {
    const rm = pr.rooms.find((x) => x.id === arg) || pr.rooms.find((x) => x.status === "setup" && x.self > 0);
    rm.self--; const q = (s.st.sense + s.st.hands) / 2;
    rm.selfQ = (rm.selfQ || 0) + (q - 45) / 300 + mod(s, "selfStar", 0) / 3;
    gainStat(s, "hands", 0.6);
    return { lines: [rm.self ? `남은 공사 ${rm.self}번` : "셀프 공사 끝! 다음 달 오픈"], msg: "페인트 냄새와 먼지. 손바닥에 물집이 잡혔다." };
  }
  const rm = pr.rooms.find((x) => x.id === arg) || pr.rooms.find((x) => x.status === "open");
  if (id === "pr_manage") { rm.ap += 1 * boost; rm.unrep = Math.round((rm.unrep || 0) * (1 - D.PR_REVIEW.reply.manageCut)); /* v4.28 관리하면서 답글도 조금 */ gainStat(s, "hands", 0.3, "pr_manage"); return { lines: [`${rm.name} 관리 ${fmt(rm.ap)}/${fmt(needAp(s, rm))}`], msg: "청소기 돌리고 비품 채우고 리뷰에 답글." }; }
  if (id === "pr_promo") { rm.promo = Math.min(2, rm.promo + 1); rm.buzz = Math.min(100, (rm.buzz || 0) + 3); gainStat(s, "sense", 0.4, "pr_promo"); gainStat(s, "mkt", 0.3, "pr_promo"); return { lines: [`${rm.name} 이번 달 예약 +${rm.promo * 12 > 20 ? 20 : rm.promo * 12}%`], msg: "자연광 오후 4시, 인생샷 각도를 찾았다." }; }
  return null;
}
const fmt = (x) => Math.round(x * 10) / 10;

// 계약 (UI에서 직접 부름, 행동력 0)
// 11-25 권리금 흥정(대표 요청: "깎는 것도 기술이니 깎는 시도를 무조건 하게"). 매물마다 한 번. 고른 방법의 능력치가 높을수록 잘 깎인다.
// 권리금이 없는 자리는 월세를 조금 깎아 본다. 화면은 계약 검토에서 흥정을 끝내야 '계약하기'가 열린다. 화면을 거치지 않는 계약(봇 등)은 가장 센 방법으로 저절로 한 번 한다
export function negoBest(s) { return (s.st.num || 0) >= (s.st.talk || 0) ? "data" : "talk"; }
export function nego(s, r, listingId, way) {
  const L = s.pr.listings.find((x) => x.id === listingId); if (!L) return { ok: false, msg: "매물이 없어요" };
  if (L.nego) return { ok: false, msg: "이 매물은 이미 흥정했어요" };
  const N = D.PR_NEGO, W = N.ways[way] || N.ways.talk; way = N.ways[way] ? way : "talk";
  const st = s.st[W.st] || 0, p = clamp((st - 20) / 140, 0, 1) + Math.min(0.15, (s.pr.know || 0) / 400);
  let cut = way === "bluff" ? (r.chance(N.bluff.hit[0] + N.bluff.hit[1] * p) ? r.range(N.bluff.cut[0], N.bluff.cut[1]) : 0)
    : r.chance(N.hit[0] + N.hit[1] * p) ? r.range(N.base[0], N.base[1]) + N.up * Math.min(1, p) : 0; // 안 통하면 그대로(찔끔 깎인 것처럼 보이지 않게)
  const onKey = L.key > 0;
  if (!onKey) cut = Math.min(cut * 0.25, N.rentMax);
  const before = onKey ? L.key : L.rent;
  const after = onKey ? Math.round(before * (1 - cut) / 10) * 10 : Math.max(5, Math.floor(before * (1 - cut) / 5) * 5);
  if (onKey) L.key = after; else { L.dep = Math.round(L.dep * after / before / 100) * 100; L.rent = after; }
  const saved = before - after;
  L.nego = { way, on: onKey ? "key" : "rent", before, after, saved };
  gainStat(s, W.st, 0.4, "nego");
  const what = onKey ? "권리금" : "월세";
  const msg = saved > 0 ? `${W.n}: ${what} ${won(before)} → ${won(after)} (${won(saved)} 깎음)` : `${W.n}: ${way === "bluff" ? "\"그럼 그 매물 하세요.\" 안 통했다" : "꿈쩍도 안 한다"}. ${what} ${won(before)} 그대로`;
  log(s, `${D.DISTRICTS[L.dk].n} ${L.size}평 흥정 · ${msg}`, "work");
  return { ok: true, msg, saved, on: L.nego.on };
}
export function contract(s, listingId, o) {
  const pr = s.pr; const L = pr.listings.find((x) => x.id === listingId); if (!L) return { ok: false, msg: "매물이 없어요" };
  const it = D.INTERIORS[o.interior ?? 1];
  const why = conceptOk(L, o.concept, s); if (why) return { ok: false, msg: `${D.CONCEPTS[o.concept].n}: ${why}` };
  if (o.ondol && !L.hid.ondolOk && L.seen.ondolOk) return { ok: false, msg: "이 매물은 온돌 시공이 안 돼요" };
  // 11-25 첫 매물 지키기: 가진 방이 0개일 때 규칙 밖 매물은 주인공이 말린다. 둘째 방부터는 경고만
  if (!L.nego) nego(s, R(s), listingId, negoBest(s)); // 11-25 흥정은 꼭 한 번(화면은 계약 검토에서 먼저 한다)
  const rule = rentRule(s, L);
  if (rule && !pr.rooms.length) return { ok: false, rule: rule.k, msg: `"내가 찾아본 규칙에 어긋난다." ${rule.why} 첫 매물은 규칙 안에서 잡자.` };
  const qt = quote(s, L, { ...o, ondol: o.ondol && L.hid.ondolOk }); const total = qt.total;
  const lack = total - s.cash;
  if (lack > 0) { const lim = 6000 - (s.loans.find((l) => l.n === "사업자대출")?.amt || 0); if (lack > lim + creditRoom(s) * 0.5) return { ok: false, msg: `돈이 ${won(lack)} 모자랍니다(사업자대출 한도 ${won(Math.max(0, lim))})` }; addLoan(s, "사업자대출", Math.min(lack + 100, Math.max(0, lim)), 0.048); s.cash += Math.min(lack + 100, Math.max(0, lim)); }
  s.cash -= total; addMoney(s, "exp", "파티룸 개업 투자", total);
  // 몰래 계약한 숨은 위험은 그대로 따라온다(확인 안 한 정보는 나중에 드러남)
  const n = pr.rooms.length + 1;
  const ondolInstalled = !!(o.ondol && L.hid.ondolOk);
  const rm = { id: "R" + (++pr.seq), name: `${n}호점 ${D.DISTRICTS[L.dk].n}`, ...L, concept: o.concept, interior: o.interior ?? 1, ondol: ondolInstalled, price: Math.round(mkt(s, L.dk).price * D.CONCEPTS[o.concept].priceF * it.priceF * sizeP(L)),
    status: "setup", rv: 1, buzz: 0, decor: { ...(L.pre || {}) }, self: o.self ? 3 : 0, selfQ: 0, openT: null, rating: 0, reviews: 0, complaints: 0, months: 0, ap: 0, promo: 0, invested: total, notice: null, last: null, hist: [] };
  pr.rooms.push(rm);
  // 11-27 넘긴 지점에서 들고 오는 것: 컨셉 소품(그대로), 가구 배치(평면이 같을 때), 후기 일부, 별점·입소문(문 여는 달에 반영)
  if (qt.carry) { const cr = carryFor(s, L), H = D.PR_HARD;
    rm.decor = { ...rm.decor, ...(cr.decor || {}) };
    if (cr.deco && DF.prSpace(cr.size) === DF.prSpace(rm.size)) { rm.deco = cr.deco; rm.decoS = cr.decoS; rm.decoAuto = cr.decoAuto; rm.decoHand = cr.decoHand; rm.decoBeds = DF.bedCount(rm); }
    rm.reviews = qt.carry.reviews; rm.cy = { name: cr.name, star: cr.rating, buzz: Math.round((cr.buzz || 0) * Math.min(0.9, PR_MV.carry.buzz * CK)), save: qt.carry.save, reviews: qt.carry.reviews };
    rm.furnAt = s.t + R(s).int(H.furn[0], H.furn[1]) - PR_MV.carry.furnEarly;
    pr.carry = (pr.carry || []).filter((c) => c !== cr); pr.cyN = (pr.cyN || 0) + 1;
    log(s, `${rm.name}: ${cr.name}에서 쓰던 가구와 소품을 옮겼다(인테리어·가구비 −${won(qt.carry.save)}). 후기 ${qt.carry.reviews}개를 이어받았다`, "work"); }
  pr.listings = pr.listings.filter((x) => x.id !== listingId);
  if (o.ondol && !L.hid.ondolOk) rm.ondolFail = true;
  log(s, `${rm.name} 계약 (${D.CONCEPTS[o.concept].n} · ${it.n}${ondolInstalled ? " · 온돌" : ""}). 투자금 ${won(total)}${qt.sf < 1 ? ` · 규모의 경제 ×${qt.sf}` : ""}`, "work");
  if (rule) log(s, `${rm.name}: 내가 찾아본 규칙 밖 매물. ${rule.why}`, "work");
  return { ok: true, msg: `${rm.name} 계약! ${o.self ? "셀프 공사 3번 필요" : "업체 공사 중, 다음 달 오픈"}${rm.cy ? ` · ${rm.cy.name}의 가구·후기를 옮겼어요(−${won(rm.cy.save)})` : ""}${rule ? ` (규칙 밖 매물: ${rule.why})` : ""}`, room: rm, warn: rule ? rule.why : null };
}
export function setPrice(s, roomId, price) { const rm = s.pr.rooms.find((x) => x.id === roomId); if (rm) rm.price = clamp(Math.round(price), 5, PRICE_MAX); }
export function setConcept(s, roomId, concept) { const rm = s.pr.rooms.find((x) => x.id === roomId); if (!rm || rm.concept === concept) return { ok: false }; const why = conceptOk(rm, concept, s); if (why) return { ok: false, msg: why }; const c = Math.round((300 * rm.size / 22 + (D.CONCEPTS[concept].kit || 0)) * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "컨셉 변경 공사", c); rm.concept = concept; rm.rating = Math.max(3.8, rm.rating - 0.1); if (rm.stale) rm.stale *= PR_MV.stale.concept; /* 11-27 컨셉을 바꾸면 식상함이 절반으로 */ return { ok: true, msg: `컨셉 변경 (${won(c)})` }; }
export function buySystem(s, key, roomId) {
  const sys = s.pr.sys, def = D.SCALE.systems[key];
  const nOpen = s.pr.rooms.length;
  if (nOpen < def.need) return { ok: false, msg: `지점 ${def.need}곳부터` };
  if (key === "smartlock") { const rm = s.pr.rooms.find((x) => x.id === roomId && !sys.smartlock.includes(x.id)) || s.pr.rooms.find((x) => !sys.smartlock.includes(x.id)); if (!rm) return { ok: false, msg: "모든 지점에 설치됨" }; s.cash -= def.cost; addMoney(s, "exp", "운영 시스템", def.cost); sys.smartlock.push(rm.id); return { ok: true, msg: `${rm.name} 스마트락 설치` }; }
  if (key === "bulk") return { ok: false, msg: "3곳부터 자동 적용" };
  if (key === "manager" && sys.manager) { const why = SJ.slotLock(s, () => { sys.manager = false; return () => { sys.manager = true; }; }); if (why) return { ok: false, msg: why }; } // 버그 6
  sys[key] = !sys[key];
  if (sys[key] && def.cost) { s.cash -= def.cost; addMoney(s, "exp", "운영 시스템", def.cost); }
  return { ok: true, msg: `${def.n} ${sys[key] ? "시작" : "중단"}` };
}
export function sellRoom(s, roomId, price, why) {
  const pr = s.pr; const rm = pr.rooms.find((x) => x.id === roomId); if (!rm) return [];
  s.cash += price; addMoney(s, "inc", "권리금 매각", price); pr.sold++; pr.soldSum += price - rm.dep; leave(s, rm, price - rm.dep);
  pr.rooms = pr.rooms.filter((x) => x !== rm); pr.sys.smartlock = pr.sys.smartlock.filter((x) => x !== rm.id);
  log(s, `${rm.name} ${why || "매각"}. ${won(price)} (투자 ${won(rm.invested)})`, "work");
  return [`${rm.name} 매각 +${won(price)}`, `투자금 대비 ${price - rm.invested >= 0 ? "+" : ""}${won(price - rm.invested)}`];
}
export function sellAll(s, price) {
  const pr = s.pr, n = pr.rooms.length, inv = pr.rooms.reduce((a, x) => a + x.invested, 0);
  s.cash += price; addMoney(s, "inc", "파티룸 엑시트", price); pr.sold += n; pr.soldSum += price; pr.exit = { t: s.t, price, n };
  pr.rooms = []; pr.sys = { cleanContract: false, smartlock: [], booking: false, manager: false };
  log(s, `파티룸 ${n}곳을 운영사에 넘겼다. 엑시트 ${won(price)}`, "work");
  return [`엑시트 +${won(price)}`, `총 투자금 ${won(inv)}`];
}
// ───────── 정리: 양도(권리금 받고 넘기기) · 폐업(원상복구 후 보증금만) (11-21) ─────────
// 원상복구: 인테리어 철거·폐기물·벽 원래대로. 상가 철거 시세 평당 10~20만 원 → 평당 12만 × 물가
export const RESTORE_PY = 12;
export const restoreCost = (s, rm) => Math.round(RESTORE_PY * rm.size * SYN.pi(s) / 10) * 10;
export const closeValue = (s, rm) => Math.max(0, rm.dep - restoreCost(s, rm)); // 폐업하면 손에 남는 돈
// 양도가 안 되는 이유(없으면 null). 다음 사장님이 들어오려면 건물주 동의와 '살 만한 가게'여야 한다
export function transferWhy(s, rm) {
  if (rm.status !== "open") return "아직 문을 안 연 곳이에요";
  if (rm.notice) return "계약 해지 통보를 받은 곳은 넘길 수 없어요";
  if (rm.hid?.landlord === "싫어함") return "건물주가 새 임차인(양도)을 안 받아 줘요";
  if (s.era?.pandemic) return "모임 금지령 중엔 인수자가 없어요";
  if (rm.rating < 3.9) return `별점 ${rm.rating.toFixed(1)}로는 인수자가 안 나와요`;
  return null;
}
export const TRANSFER_WAIT = 2; // 양도까지 걸리는 달(그동안 월세는 내가 낸다)
export function transferValue(s, rm) { const keyPart = Math.max(0, resale(s, rm) - rm.dep) * (avgProfit(rm) < 0 ? 0.5 : 1); return Math.max(0, Math.round(rm.dep + keyPart - rm.rent * TRANSFER_WAIT)); }
export function transferRoom(s, roomId, why) {
  const pr = s.pr; const rm = pr.rooms.find((x) => x.id === roomId); if (!rm) return [];
  const back = transferValue(s, rm), key = back - rm.dep + rm.rent * TRANSFER_WAIT;
  s.cash += back; addMoney(s, "inc", "지점 양도·보증금", back); pr.sold++; pr.soldSum += back - rm.dep; leave(s, rm, key);
  pr.rooms = pr.rooms.filter((x) => x !== rm); pr.sys.smartlock = pr.sys.smartlock.filter((x) => x !== rm.id);
  log(s, `${rm.name} ${why || "양도"}. 보증금 ${won(rm.dep)} + 권리금 ${won(key)} − 양도까지 월세 ${TRANSFER_WAIT}달 ${won(rm.rent * TRANSFER_WAIT)} = ${won(back)}`, "work");
  return [`${rm.name} 양도`, `보증금 ${won(rm.dep)} + 권리금 ${won(key)} − 월세 ${TRANSFER_WAIT}달 = +${won(back)}`, `처음 넣은 돈 ${won(rm.invested)}`];
}
export function shutRoom(s, roomId, why) {
  const pr = s.pr; const rm = pr.rooms.find((x) => x.id === roomId); if (!rm) return [];
  const rc = restoreCost(s, rm), back = closeValue(s, rm);
  s.cash += back; addMoney(s, "inc", "지점 양도·보증금", back); pr.sold++; pr.soldSum += back - rm.dep; pr.shut = (pr.shut || 0) + 1;
  pr.rooms = pr.rooms.filter((x) => x !== rm); pr.sys.smartlock = pr.sys.smartlock.filter((x) => x !== rm.id);
  log(s, `${rm.name} ${why || "폐업"}. 보증금 ${won(rm.dep)} − 원상복구 ${won(rc)} = ${won(back)} 회수 (투자 ${won(rm.invested)})`, "work");
  return [`${rm.name} 폐업`, `보증금 ${won(rm.dep)} − 원상복구 ${won(rc)} = +${won(back)}`, `처음 넣은 돈 ${won(rm.invested)}`];
}
// 첫 방이 '안정': 6달 넘게 운영, 최근 6달 중 5달 이상 흑자이고 평균도 흑자
export function stable(rm) { if (!rm || rm.status !== "open" || rm.months < 6) return false; const h = (rm.hist || []).slice(-6); return h.length >= 6 && h.filter((x) => x.profit > 0).length >= 5 && avgProfit(rm) > 0; }
// 묶음 효과: 2곳부터 겹친 예약을 옆 방으로 넘겨 공실이 줄고(예약 +), 청소 대기·소모품 창고·보험·세무 같은 공용 고정비를 나눠 쓴다(관리비 −)
export function bundle(s) {
  const n = s.pr.rooms.filter((x) => x.status === "open").length;
  if (n < 2) return { n, occ: 0, cost: 0 };
  return { n, occ: Math.min(0.08, 0.04 * (n - 1)) + (s.pr.sys.booking ? 0.02 : 0), cost: n >= 3 ? 0.12 : 0.07 };
}
// 이야기 장면에서 실제 매물 만들기: small(같은 동네 8~12평 소형) · quiet(같은 상권 조용한 자리)
export function storyListing(s, kind, near) {
  const r = R(s), dk = near?.dk && D.DISTRICTS[near.dk] ? near.dk : "univ";
  const L = makeListing(s, r, dk);
  if (kind === "small") { L.size = r.int(8, 12); L.cap = capOf(L.size); L.rent = rentFor(s, L, r.next()); L.dep = Math.round(L.rent * 10 / 100) * 100; L.key = Math.round(L.key * 0.4 / 10) * 10; L.walk = Math.min(L.walk, near?.walk || L.walk); L.tagN = `소형 ${(s.pr.rooms || []).length + 1}호점 후보`; }
  if (kind === "quiet") { L.hid.sound = "좋음"; L.hid.landlord = "환영"; L.seen.sound = L.seen.landlord = L.seen.meet = true; L.tagN = "옮길 자리(조용한 건물)"; }
  s.pr.listings.push(L);
  return L;
}
// 손절 코치 진단: 석 달 연속 적자인 방을 정리할지 버틸지. 진짜 숫자(보증금·권리금 시세·원상복구비)로 비교
export function cutAdvice(s, rm) {
  const d = D.DISTRICTS[rm.dk], M = mkt(s, rm.dk), h = rm.hist.slice(-3), loss = Math.round(h.reduce((a, x) => a + x.profit, 0) / Math.max(1, h.length));
  const ref = Math.round(refPrice(s, rm)), q = rm.last?.q ?? 1, fixes = [], walls = [];
  if (rm.price > ref * 1.08) fixes.push({ w: `가격이 시세보다 비싸요(지금 ${rm.price}만, 시세 ${ref}만)`, a: "가격을 시세로" });
  if (q < 0.85) fixes.push({ w: `관리가 ${Math.round(q * 100)}%만 채워졌어요`, a: s.pr.sys.cleanContract ? "관리 행동력 채우기" : "청소 업체 계약부터" });
  if (decorFilled(rm.decor) < 3) fixes.push({ w: "휑한 공간은 사진에서 걸러져요", a: "꾸미기로 빈 칸 채우기" });
  if (rm.rating < 4.3) fixes.push({ w: `별점 ${rm.rating.toFixed(2)}`, a: "청소·꾸미기로 별점 4.5 회복" });
  if ((rm.buzz || 0) < 15) fixes.push({ w: "입소문이 거의 없어요", a: "리뷰 이벤트·홍보 사진" });
  const best = Object.entries(d.fit).filter(([k]) => !conceptOk(rm, k, s) && !PW.sunk(s, k)).sort((a, b) => b[1] - a[1])[0];
  if (best && (d.fit[rm.concept] ?? 0.8) < best[1] - 0.25) fixes.push({ w: `이 상권엔 '${D.CONCEPTS[best[0]].n}' 컨셉이 더 맞아요`, a: "컨셉 변경" });
  if (rm.walk > 10) walls.push(`역에서 ${rm.walk}분. 위치는 못 고쳐요`);
  if (rm.hid?.landlord === "싫어함" || rm.notice) walls.push("건물주가 파티룸을 싫어해요");
  if (rm.hid?.sound === "나쁨" && D.CONCEPTS[rm.concept].noisy >= 0.5) walls.push("방음이 나빠 민원이 계속 와요");
  if (M.comp > d.comp[1] + 2) walls.push(`반경 500m 경쟁 ${M.comp}곳. 가격 싸움이에요`);
  if (rm.rent > (rm.last?.rev || 0) * 0.7 && rm.months >= 6) walls.push(`월세가 매출의 70%를 넘어요(월 ${won(rm.rent)}, 남는 가게는 30~50%)`);
  const peakSoon = [1, 2].some((k) => isPeak((s.cal + k - 1) % 12 + 1)) && !isPeak(s.cal);
  const tWhy = transferWhy(s, rm), tv = transferValue(s, rm), cv = closeValue(s, rm), rc = restoreCost(s, rm);
  const red = rm.red || 0, young = rm.months < 6;
  const y12 = rm.hist.slice(-12), year = y12.length >= 10 ? Math.round(y12.reduce((a, x) => a + x.profit, 0) / y12.length) : null; // 1년으로 보면(비수기 적자는 정상)
  let rec = "hold";
  if (rm.notice) rec = "hold";
  else if (year !== null && year > 0 && red < 6) rec = "hold"; // 어차피 통보 기간이 끝나면 보증금이 돌아온다(원상복구 없이)
  else if (red >= 6 && rm.months >= 6) rec = "cut"; // 선배: 6개월 내내 적자면 접을 때
  else if (!young && walls.length && red >= 4 && fixes.length <= 1 && !peakSoon) rec = "cut"; // 못 고치는 문제 + 고칠 것도 거의 없음
  else if (s.cash < rm.rent * 2 && creditRoom(s) < rm.rent * 3 && rm.months >= 4) rec = "cut"; // 통장이 버틸 힘이 없다
  const kind = rec === "cut" ? (tWhy ? "close" : "transfer") : "hold";
  return { rec: kind, loss, ref, fixes, walls, peakSoon, tWhy, tv, cv, rc, red, young, year, seasonal: year !== null && year > 0 && red < 6 };
}
export function closeRoom(s, roomId) {
  const pr = s.pr; const rm = pr.rooms.find((x) => x.id === roomId); if (!rm) return { ok: false };
  const open = rm.status === "open", why = open ? transferWhy(s, rm) : null; // 11-27 QA: 넘길 수 없는 방은 폐업(보증금만). 전에는 카드의 [양도]로 권리금까지 다 받았다
  const back = why ? rm.dep : resale(s, rm), key = back - rm.dep;
  s.cash += back; addMoney(s, "inc", "지점 양도·보증금", back); pr.sold++; pr.soldSum += back - rm.dep; leave(s, rm, key);
  if (why) { pr.rooms = pr.rooms.filter((x) => x !== rm); pr.sys.smartlock = pr.sys.smartlock.filter((x) => x !== rm.id); log(s, `${rm.name} 폐업. 보증금 ${won(rm.dep)} 회수(권리금 없음: ${why})`, "work"); return { ok: true, key: 0, back, closed: true, msg: `폐업했어요. 보증금 ${won(rm.dep)}만 돌려받았어요(${why})` }; }
  pr.rooms = pr.rooms.filter((x) => x !== rm); pr.sys.smartlock = pr.sys.smartlock.filter((x) => x !== rm.id);
  log(s, `${rm.name} 양도. 보증금 ${won(rm.dep)} + 권리금 ${won(key)} = ${won(back)} 회수`, "work");
  return { ok: true, key, back, msg: `양도 완료, ${won(back)} 회수(보증금 ${won(rm.dep)} + 권리금 ${won(key)})${open ? ` · ${PR_MV.carry.mo}달 안에 다른 동네에 새 지점을 열면 가구·소품과 후기 일부를 들고 가요` : ""}` };
}

// ───────── 관리 행동력 ─────────
export function needAp(s, rm) {
  if (rm.status !== "open") return 0;
  const sys = s.pr.sys;
  if (sys.manager) return 0.25;
  let n = 2 + rm.far * 0.5;
  if (!sys.cleanContract && !helpers(s, "pr_clean").length) n += (rm.last?.bookings ?? 20) / 12;
  if (sys.smartlock.includes(rm.id)) n -= 0.5;
  if (sys.booking) n -= 0.5;
  n -= helperPower(s, "pr_clean") * 0.4;
  n -= Math.min(1.5, (s.pr.know || 0) / 60);
  if ([3, 4, 9, 10].includes(s.cal) && SYN.on(s, "season")) n += 0.5;
  n *= PW.apMult(s, rm); // 11-23 같은 컨셉 지점이 여럿이면 관리가 덜 든다
  return Math.max(0.5, Math.round(n * 2) / 2);
}
export function totalNeed(s) { return s.pr.rooms.reduce((a, rm) => a + needAp(s, rm), 0); }

// ───────── 한 달 정산 ─────────
const PR_BED_P = { bed1: 25, bed2: 48, bedK: 115 }; // 11-26 꾸미기의 진짜 침대(산 값, 만원 · deco.js 가격과 같게). 바닥 침구·매트·매트장은 해당 없음
const PR_BED = new Proxy({}, { get: (_, k) => PR_BED_P[String(k).split("_")[0]] }); // 저장 항목은 "bed1_mo"(가구_스타일) 꼴
// 침대를 모두 내보낸다(처분비만 낸다. 산 값은 날림). 구청 전화에서 "지금 버린다" 또는 단속 때 강제 철거
export function bedDump(s, rm) {
  const it = rm.deco?.it || [], beds = it.filter((o) => PR_BED[o[0]]), pi0 = SYN.pi(s);
  const lost = Math.round(beds.reduce((a, o) => a + PR_BED[o[0]], 0) * pi0), haul = Math.round(15 * beds.length * pi0);
  if (rm.deco) rm.deco.it = it.filter((o) => !PR_BED[o[0]]); rm.decoBeds = 0; if (rm.decoS != null) rm.decoS = Math.max(0, rm.decoS - 2 * beds.length);
  s.cash -= haul; addMoney(s, "exp", "파티룸 비용", haul);
  return { n: beds.length, lost, haul };
}
export function bedCallChoose(s, i) { // 구청 전화 선택: 0 = 지금 버린다
  const o = s._prBedCall; s._prBedCall = null; const rm = o && s.pr.rooms.find((x) => x.id === o.id); if (!rm || i !== 0) return [];
  const d = bedDump(s, rm); rm.bedCall = null; s._prBedRedo = rm.id; // 화면이 "다른 가구를 넣을까요?"를 묻는다
  return [`침대 ${d.n}개 처분 −${won(d.haul)}`, `산 값 ${won(d.lost)}은 날렸다`];
}
export function month(s, r, notes, scenes) {
  const pr = s.pr; let total = 0; fill(s); mktMonth(s, r, notes, scenes);
  const open = pr.rooms.filter((x) => x.status === "open");
  pr.know = Math.min(40, pr.know + open.length * 0.15) > pr.know ? Math.min(40, pr.know + open.length * 0.15) : pr.know; // 운영하면서 조금씩 는다(40까지)
  const nAll = pr.rooms.length;
  const halo = pr.rooms.some((x) => x.status === "open" && x.rating >= 4.6 && x.months >= 4);
  const B = bundle(s); // 묶음 효과(2곳부터)
  for (const rm of pr.rooms) {
    if (rm.status === "setup") {
      if (rm.self > 0) { notes.push(`${rm.name}: 셀프 공사 ${rm.self}번 남음 (월세는 나감)`); s.cash -= rm.rent; addMoney(s, "exp", "파티룸 비용", rm.rent); total -= rm.rent; continue; }
      rm.status = "open"; rm.openT = rm.openT ?? s.t + 1 /* 11-26 처음 연 달을 남긴다(성적표 개점) */; const it = D.INTERIORS[rm.interior];
      rm.rating = clamp(it.star + (rm.selfQ || 0) + mod(s, "star", 0) + helperPower(s, "pr_interior") * 0.12 - (rm.toilet === "out" ? 0.1 : 0) + (decorQ(s, rm) - 0.45) * 0.45 + DF.lift(s, rm) * DF.DECO.star, 3.4, 4.95);
      if (rm.cy) { rm.rating = clamp(Math.max(rm.rating, rm.cy.star || 0), 3.4, 4.95); rm.buzz = Math.max(rm.buzz || 0, rm.cy.buzz || 0); notes.push(`${rm.name}: ${rm.cy.name} 단골들이 새 자리 소식을 듣고 찾아왔다(후기 ${rm.cy.reviews}개·별점을 이어받았다)`); } // 11-27 넘긴 지점의 후기·단골
      notes.push(`${rm.name} 오픈! 첫 별점 ${rm.rating.toFixed(2)}`);
      if (rm.ondolFail) notes.push(`${rm.name}: 온돌 시공을 하려다 바닥 구조 때문에 못 했다(확인 안 한 정보)`);
      s.cash -= rm.rent; addMoney(s, "exp", "파티룸 비용", rm.rent); total -= rm.rent;
      continue;
    }
    if (rm.banned > 0) { rm.banned--; s.cash -= rm.rent; addMoney(s, "exp", "파티룸 비용", rm.rent); total -= rm.rent; rm.months++; rm.hist.push({ t: s.t, occ: 0, profit: -rm.rent, rating: rm.rating, rev: 0 }); rm.cum = (rm.cum || 0) - rm.rent; if (rm.hist.length > 36) rm.hist.shift(); notes.push(`${rm.name}: 영업정지 중(월세는 나감)${rm.banned ? ` · ${rm.banned}달 남음` : " · 다음 달 다시 연다"}`); continue; } // v4.29 미성년자 출입 적발
    const res = settle(s, r, rm, { nAll, halo, open, B });
    rm.last = res; rm.months++;
    s.cash += res.rev; addMoney(s, "inc", "파티룸 매출", res.rev);
    s.cash -= res.cost; addMoney(s, "exp", "파티룸 비용", res.cost - res.util - res.pay - (res.ad || 0)); addMoney(s, "exp", "전기·난방비", res.util); if (res.ad) addMoney(s, "exp", "마케팅비", res.ad); if (res.pay) addMoney(s, "exp", "후기 페이백", res.pay); // v4.28 영수증에 따로
    total += res.rev - res.cost;
    rm.hist.push({ t: s.t, occ: res.occ, profit: res.rev - res.cost, rating: rm.rating, rev: res.rev });
    rm.cum = (rm.cum || 0) + res.rev - res.cost; rm.books = (rm.books || 0) + (res.bookings || 0); // 11-26 성적표 평생 기록
    if (!rm.bestM || res.rev > rm.bestM.v) rm.bestM = { t: s.t, v: res.rev }; if (!rm.worstM || res.rev < rm.worstM.v) rm.worstM = { t: s.t, v: res.rev };
    rm.red = res.rev - res.cost < 0 ? (rm.red || 0) + 1 : 0; // 연속 적자 달 수(손절 코치)
    if (rm.hist.length > 36) rm.hist.shift();
    for (const n of res.notes) notes.push(`${rm.name}: ${n}`);
    for (const sc of res.scenes) scenes.push(sc);
    // 11-27 식상함(4년부터 해마다) · 1년 평균 이익 고점 · "이 자리도 오래됐다" 알림(지점마다 한 번)
    if (pr.rooms.includes(rm)) { const SL = PR_MV.stale;
      if (rm.months >= SL.from) { const was = rm.stale || 0; rm.stale = Math.min(SL.max * Math.max(1, MK), was + SL.yr * MK / 12); if (!was && rm.stale) notes.push(`${rm.name}: 문 연 지 ${Math.floor(rm.months / 12)}년. 단골이 "새로운 데 없나" 하기 시작했다(식상함: 예약이 해마다 조금씩 빠진다)`); }
      if (rm.months >= D.PR_YOUNG.mo + 12) rm.pk = Math.max(rm.pk || 0, avg12(rm) / SYN.pi(s)); // 고점은 새 방 가속(24달)이 끝난 뒤의 1년 평균부터 잰다(가속이 빠진 것을 '줄었다'로 보지 않게)
      if (!rm.mvAsk && !rm.notice && moveDue(s, rm) && !scenes.length) { rm.mvAsk = s.t; scenes.push(moveScene(s, rm)); } }
  }
  // v4.27 규모가 커지면 생기는 일: 새벽 전화(매니저 없으면)
  if (open.length >= 2 && !pr.sys.manager && r.chance(D.PR_HARD.nightCall * (open.length - 1))) {
    const rm = r.pick(open), L = ["새벽 2시, 손님 전화. \"비밀번호가 안 열려요.\"", "새벽 3시, \"보일러가 안 돌아요\" 문자.", "새벽 1시, 옆 가게 사장님 전화. \"거기 문 열려 있던데요?\"", "새벽 4시, \"화장실이 막혔어요\" 사진 세 장.", "새벽 2시, \"와이파이가 안 돼요. 환불해 주세요.\""];
    s.hp = Math.max(0, s.hp - 3); s.mental = Math.max(0, s.mental - 3); notes.push(`${rm.name}: ${r.pick(L)} 잠을 설쳤다 (스태미너·멘탈 −3)`);
  }
  // 11-26 침대 단속(대표 요청·수정): 파티룸은 숙박업 등록이 없다. 꾸미기에서 진짜 침대를 두면 30~42달 뒤 구청에서 전화가 온다(예고).
  // ① 전화: "다음 달까지 침대를 치우세요." 지금 버리면 처분비만 내고(산 값은 날림) 다른 가구를 넣을지 묻는다. 미루면 아무 일 없음.
  // ② 다음 달에도 침대가 있으면 구청이 와서 강제 철거: 처분비 + 벌금 300만(두 번째 방문부터 두 배). 침대를 다시 들이면 12~20달 뒤 또 전화.
  if (!scenes.some((x) => x.prBed)) for (const rm of open) {
    const it = rm.deco?.it || [], beds = it.filter((o) => PR_BED[o[0]]);
    if (!beds.length) { rm.bedT = null; rm.bedCall = null; continue; }
    if (rm.bedCall != null) { // ② 예고한 다음 달: 아직 침대가 있으면 방문
      if (s.t <= rm.bedCall) continue;
      const pi0 = SYN.pi(s), fine = Math.round(300 * (rm.bedFine ? 2 : 1) * pi0 / 10) * 10, d = bedDump(s, rm);
      rm.bedFine = (rm.bedFine || 0) + 1; rm.bedCall = null; rm.rating = clamp(rm.rating - 0.05, 3.2, 5);
      s.cash -= fine; addMoney(s, "exp", "벌금·과태료", fine); total -= fine + d.haul;
      notes.push(`${rm.name}: 구청 단속. 침대 ${d.n}개 강제 철거(산 값 ${won(d.lost)} 날림), 처분비 ${won(d.haul)}, 벌금 ${won(fine)}`);
      scenes.push({ kind: "story", prBed: 1, tag: "파티룸", title: "구청에서 나왔습니다", text: `지난달 전화한 그 구청이다. 위생과 공무원 두 명이 ${rm.name}에 현장 확인을 나왔다. 방 안의 침대를 보더니 말한다. "침대가 있네요." 사진을 찍고 서류를 내민다. 침대 ${d.n}개는 강제 철거, 처분비 ${won(d.haul)}에 벌금 ${won(fine)}.${rm.bedFine > 1 ? " 두 번째라 벌금이 두 배다." : ""} 미루지 말 걸 그랬다.`, choices: [{ t: "벌금을 낸다", eff: { mental: -5 }, text: "트럭에 침대를 싣는 걸 보며 생각했다. 파티룸은 자는 곳이 아니다." }] });
      break;
    }
    if (rm.bedT == null) { rm.bedT = s.t + (rm.bedN ? r.int(12, 20) : r.int(30, 42)); continue; }
    if (s.t < rm.bedT) continue;
    // ① 전화(예고)
    const pi0 = SYN.pi(s), haul = Math.round(15 * beds.length * pi0), fine = Math.round(300 * (rm.bedFine ? 2 : 1) * pi0 / 10) * 10;
    rm.bedCall = s.t; rm.bedT = null; rm.bedN = (rm.bedN || 0) + 1; s._prBedCall = { id: rm.id };
    notes.push(`${rm.name}: 구청에서 전화. 다음 달까지 침대 ${beds.length}개를 치워야 한다`);
    scenes.push({ kind: "event", prBed: 1, tag: "파티룸", title: "구청에서 온 전화", onChoose: "pr_bedcall", text: `모르는 번호다. "구청 위생과입니다. ${rm.name}에서 숙박 영업을 한다는 신고가 들어와서요. 혹시 거기 침대가 있나요?" 파티룸은 숙박업 등록이 없어서 침대를 두면 안 된다. 다음 달에 현장 확인을 나온다고 한다. 지금 침대는 ${beds.length}개. 버리려면 처분비 ${won(haul)}이 들고, 확인 때 걸리면 벌금 ${won(fine)}이다.`,
      choices: [{ t: `"있어요. 바로 치울게요" (처분비 ${won(haul)})`, eff: {}, text: "\"치우시면 문제없어요.\" 업체를 불러 침대를 내보냈다. 산 값은 아깝지만 벌금보다는 낫다." }, { t: "\"아… 없어요\"라고 넘긴다", eff: {}, text: "전화를 끊고 방 안의 침대를 바라봤다. 다음 달 확인 전에 어떻게든 해야 한다." }] });
    break;
  }
  // 공통 고정비
  const pi = SYN.pi(s);
  if (pr.sys.booking && nAll) { const c = Math.round(6 * pi); s.cash -= c; addMoney(s, "exp", "파티룸 비용", c); total -= c; }
  if (pr.sys.manager && nAll) { const c = Math.round(180 * pi); s.cash -= c; addMoney(s, "exp", "파티룸 비용", c); total -= c; }
  // 권리금 제안: 장사가 잘되는 지점에 사겠다는 사람이 온다
  if (s.t - pr.offerT >= 4) {
    const good = open.filter((x) => x.months >= 8 && x.rating >= 4.4 && avgProfit(x) > 30);
    if (open.length >= 4 && pr.sys.manager && r.chance(0.012 + pr.know / 6000)) {
      const sumP = open.reduce((a, x) => a + Math.max(0, avgProfit(x)), 0); const price = Math.round((sumP * r.range(20, 30) + pr.rooms.reduce((a, x) => a + x.dep, 0)) / 100) * 100;
      s._prExit = { price }; pr.offerT = s.t;
      scenes.push({ kind: "event", title: "공간 운영사의 인수 제안", tag: "파티룸", text: `공간 플랫폼 운영사에서 연락이 왔다. "${pr.rooms.length}개 지점을 한꺼번에 인수하고 싶습니다." 제시가는 보증금 포함 ${won(price)}. 지난 6개월 월평균 순이익은 ${won(sumP)}.`, onChoose: "pr_exit", choices: [{ t: `전부 넘긴다 (${won(price)})`, eff: {}, text: "도장을 찍었다. 통장 숫자를 세 번 다시 봤다." }, { t: "더 키워서 나중에 판다", eff: {}, text: "아직은 내 공간들이다." }, { t: "조건을 더 올려 본다", check: { stat: "num", dc: 55 }, ok: { text: "\"좋습니다, 15% 더 드리죠.\"", eff: {} }, ng: { text: "\"그럼 이번엔 없던 걸로 하죠.\" 상대가 일어섰다.", eff: {} } }] });
    } else if (good.length && r.chance(0.05 + pr.know / 2000)) {
      const rm = r.pick(good); const price = Math.round((rm.dep + Math.min(PR_MV.key.hi * SYN.pi(s), keyQuote(s, rm) * r.range(PR_MV.key.offer[0], PR_MV.key.offer[1]))) / 10) * 10; // 11-27 제안은 양도 시세보다 15~40% 더(권리금 2,000만 안)
      s._prOffer = { id: rm.id, price }; pr.offerT = s.t;
      scenes.push({ kind: "event", title: "권리금 제안", tag: "파티룸", text: `${rm.name} 단골이었다는 사람이 찾아왔다. "여기 그대로 인수하고 싶어요." 보증금 포함 ${won(price)}. 처음 넣은 돈은 ${won(rm.invested)}였다.`, onChoose: "pr_offer", choices: [{ t: `판다 (${won(price)})`, eff: {}, text: "열쇠를 건넸다. 권리금 장사, 이런 거구나." }, { t: "안 판다", eff: {}, text: "아직 이 공간으로 더 벌 수 있다." }, { t: "더 불러 본다", check: { stat: "talk", dc: 50 }, ok: { text: "\"...알겠어요, 20% 더 드릴게요.\"", eff: {} }, ng: { text: "\"생각해 볼게요.\" 그 뒤로 연락이 없다.", eff: {} } }] });
    }
  }
  // v4.29 9월: 12월 예약 오픈. 취소 규정을 정한다(해마다)
  if (s.cal === PR_F30.dec.open && open.length && pr.decY !== s.year) { pr.decY = s.year; scenes.push(decScene(s)); }
  // v4.28 후기 사건(10종)
  if (open.length && !scenes.length && r.chance(D.PR_REVIEW.evP)) { const rm = r.pick(open); if (pr.rooms.includes(rm)) { const sc = RVW.reviewEvent(s, r, "pr", rm, pr); if (sc) scenes.push(sc); } }
  // 사건 카드(문서 기반 16장)
  if (open.length && s.t - pr.evT >= 3 && r.chance(0.3)) { const ev = jobEvent(s, r, "partyroom"); if (ev) { pr.evT = s.t; scenes.push(ev); } }
  pr.profitHist.push(Math.round(total)); if (pr.profitHist.length > 24) pr.profitHist.shift();
  // 레벨
  const avg3 = pr.profitHist.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const lv = !nAll ? 1 : open.length >= 4 && avg3 >= 600 ? 5 : open.length >= 2 ? 4 : avg3 >= 150 ? 3 : open.some((x) => x.reviews >= 10 && x.rating >= 4.5) ? 2 : 1;
  if (lv > pr.lv) { notes.push(`파티룸 Lv${lv} 「${D.PR_LEVELS[lv - 1].n}」`); log(s, `파티룸 Lv${lv} 「${D.PR_LEVELS[lv - 1].n}」`, "work"); }
  pr.lv = Math.max(pr.lv, lv);
  return total;
}

function settle(s, r, rm, ctx) {
  const d = D.DISTRICTS[rm.dk], c = D.CONCEPTS[rm.concept];
  const notes = [], scenes = [];
  const winter = [12, 1, 2].includes(s.cal);
  const SEA = D.PR_SEASON[s.cal - 1];
  const sa = c.seas ?? 1, sw = 1 + (SEA.we - 1) * sa, sk = 1 + (SEA.wk - 1) * sa; // 교육장처럼 계절을 덜 타는 컨셉
  let base = (d.we * (c.we ?? 1) * sw * 24 + d.wk * (c.wk ?? 1) * sk * 22 * BIG.fullWk(s)) / 46 * PR_KOCC * (d.fit[rm.concept] ?? 0.8);
  base *= s.cal === 12 ? (c.dec ?? 1) : isPeak(s.cal) ? 1 : (c.off ?? 1);
  let m = 1;
  m *= PW.occMult(s, rm); // 11-23 침몰한 컨셉은 예약이 해마다 준다
  m *= 1 - staleOf(rm); // 11-27 식상함: 같은 자리 4년부터
  if (RD.isR1(s)) m *= PR_R1.occ; // 11-24 1회차(7년 맛보기)는 동네 첫 파티룸 효과로 예약이 더 든다. 2회차부터는 원래대로
  m *= { 좋음: 1.05, 보통: 1, 나쁨: 0.9 }[rm.hid.sound];
  m *= rm.walk <= 5 ? 1.08 : rm.walk <= 10 ? 0.95 : 0.78; // 역에서 멀면 크게 손해
  if (rm.floor === -1 && rm.concept === "bridal") m *= 0.82;
  if (rm.floor === 1) m *= 1.04;
  if (rm.floor >= 3 && !rm.elevator) m *= 1 - c.elev * (rm.floor - 1) / 2;
  if (rm.parking === 0) m *= 1 - c.park * 0.22 * (0.5 + d.park / 2); else if (rm.parking === 2) m *= 1 + c.park * 0.05;
  if (rm.toilet === "out") m *= 1 - c.toilet;
  m *= rm.hid.access24 ? 1 : 1 - 0.25 * c.need24;
  if (winter) { if (rm.ondol) m *= 1.06 + c.ondol; else if (rm.heating === "냉난방기만") m *= 0.86; }
  if (s.cal === 3 && rm.dk === "univ") m *= 1.1;
  if (s.cal === 5 && rm.concept === "kids") m *= 1.15;
  if ([4, 5, 9, 10].includes(s.cal) && rm.concept === "bridal") m *= 1.1;
  const M = mkt(s, rm.dk); m *= Math.max(0.45, 1 - 0.045 * M.comp);
  m *= 1 + (rm.rating - 4.5) * 0.6;
  const rampStart = ctx.halo ? (mod(s, "haloMult", 1) > 1 ? 0.85 : 0.7) : 0.45;
  m *= rm.months === 0 ? rampStart : rm.months === 1 ? Math.max(0.7, rampStart) : rm.months === 2 ? 0.9 : 1;
  if (rm.months < D.PR_YOUNG.mo) m *= 1 + (D.PR_YOUNG.f - 1) * (rm.cy ? PR_MV.carry.young : 1) * (1 - rm.months / D.PR_YOUNG.mo); // 11-26 새 방 가속 · 11-27 옮겨 연 방은 오픈 효과가 덜하다(같은 브랜드의 새 지점)
  m *= SJ.ramp(s, "pr"); // 첫 투잡 초반 고생: 노출·후기가 쌓일수록 1로(sj.js ENTRY)
  m *= 1 + Math.min(0.2, rm.promo * 0.12);
  const adLv = s.pr.ad ?? 2, AD = D.PR_AD[adLv] || D.PR_AD[2]; m *= adLv === 0 && rm.promo > 0 ? D.PR_AD_SELF : AD.occ; // 11-25 마케팅비: 안 쓰면 손님이 준다(그달 홍보를 했으면 덜)
  const sib = ctx.open.filter((x) => x !== rm && x.dk === rm.dk).length; m *= 1 + Math.min(0.15, sib * 0.06);
  m *= 1 + helperPower(s, "pr_photo") * 0.06;
  if (ctx.B?.occ) m *= 1 + ctx.B.occ; // 묶음 효과: 겹친 예약을 옆 지점으로 넘긴다
  m *= 1 + Math.min(0.4, (rm.buzz || 0) / 250); // 손님 인별·블로그 후기 = 입소문
  m *= RVW.reviewMult("pr", rm) * (1 + (D.PR_REVIEW.ev[s.pr.revEv || "none"]?.rebook || 0)); // v4.28 후기 수·상위 노출·재방문 할인 단골
  if (decorFilled(rm.decor) < 3) m *= 0.85; // 휑한 공간: 사진에서 걸러진다
  const dl = DF.lift(s, rm); m *= 1 + dl * DF.DECO.occ; // 방 꾸미기 감성 점수(안 꾸미면 '알아서' 수준 = 거의 0)
  if (["edu", "lecture"].includes(rm.concept)) { if (SYN.on(s, "edu_career")) m *= 1.12; if (SYN.on(s, "grad_net")) m *= 1.08; }
  if (s.era.winter) m *= 0.8; if (s.era.bigcomp) m *= 0.94;
  if (s.era.pandemic) m *= 0.4; if (s.era.slump) m *= 0.9; if (s.era.rate) m *= 0.95; if (s.era.recovery) m *= 1.06;
  const ref = refNow(s, rm) * (1 + dl * DF.DECO.price), pEff = rm.price * peakMult(s, s.cal); // 잘 꾸민 방은 시세보다 받아도 덜 빠진다
  m *= Math.pow(ref / pEff, SEA.el);
  // v4.29 특이 요소: 12월 예약 규정 · 파손 보증금 · 신분증 확인(단체 손님이 조금 불편해한다)
  const F = PR_F30, DP = s.cal === 12 ? F.dec.pol[s.pr.decPol || "half"] : null;
  if (DP) m *= DP.occ;
  if (s.pr.depo) m *= F.depo.occ;
  if (s.pr.idCheck && F.minor.conc.includes(rm.concept)) m *= F.minor.idOcc;
  // 11-25 방 크기: 큰 방은 평달 예약이 덜 잡히고(대형 단체가 드문드문) 12월에 몰린다. 작은 방(20평까지)은 그대로
  const Z = sizeMix(rm, s.cal);
  m *= Z.occ;
  // 관리 행동력 충족도
  const need = needAp(s, rm); const q = need ? clamp(rm.ap / need, 0, 1) : 1;
  m *= D.PR_HARD.effort[0] + D.PR_HARD.effort[1] * q; // v4.27 노력 승부: 관리를 꽉 채우면 +, 돈만 넣고 손 놓으면 크게 −
  const TRD = trendOn(s, rm); if (TRD) m *= 1 + PR_TREND.occ; // 11-25 히든 길: 유행 컨셉 방
  const occ = clamp(base * m * (1 + 0.07 * r.normal()), 0.03, Math.min(TRD ? PR_TREND.capMax : 1, (s.cal === 12 ? D.PR_HARD.decCap : isPeak(s.cal) ? D.PR_HARD.peakCap : D.PR_HARD.offCap) * (TRD ? PR_TREND.cap : 1))); // v4.27 비수기는 아무리 잘해도 상한 · 11-25 성수기·12월도 꽉 차지 않는다(대표 지적: "거의 꽉꽉 차는 구조")
  const bookings = Math.round(occ * D.PR_SLOTS);
  // 11-25 예약 구성: 대형 단체는 방 가격(pEff)을 내고, 작은 모임은 그보다 싼값을 낸다. pAvg = 이번 달 한 건 평균 값
  const bigN = Z.split ? clamp(Math.round(bookings * Z.big * (1 + 0.2 * r.normal())), 0, bookings) : bookings;
  const pAvg = bookings ? (bigN * pEff + (bookings - bigN) * pEff * Z.smallF) / bookings : pEff;
  const RM = RVW.reviewMonth("pr", s.pr, bookings, bookings * pAvg, rm); // v4.28 후기 이벤트(페이백·할인)
  const noshow = DP ? Math.round(bookings * DP.noshow) : 0, nsLoss = DP ? Math.round(noshow * pAvg * (1 - DP.keep)) : 0; // 12월 노쇼·당일 취소
  const rev = Math.round(bookings * pAvg) - RM.disc - nsLoss;
  if (Z.split && s.cal === 12 && bigN) notes.push(`12월 대형 단체 ${bigN}건(송년회·크리스마스, 최대 ${Z.cap}명) · 작은 모임 ${bookings - bigN}건`);
  if (noshow) notes.push(`12월 노쇼·취소 ${noshow}건 (${DP.n}${nsLoss ? ` · 날린 매출 ${won(nsLoss)}` : " · 위약금으로 메움"})`);
  // 비용
  const nAll = ctx.nAll;
  const cluster = ctx.open.filter((x) => x.dk === rm.dk).length;
  const cleanH = helpers(s, "pr_clean").length;
  const pi = SYN.pi(s), sf = D.scaleF(nAll);
  const cleanUnit = (s.pr.sys.cleanContract ? D.SCALE.cleanCost(nAll, cluster) : cleanH ? D.SCALE.cleanCost(nAll, cluster) * 0.7 : D.PR_COST.selfClean) * pi; // 11-25 직접 청소해도 예약마다 소모품·쓰레기 처리비
  const UK = D.UTIL_K.pr; // v4.28 쓰는 만큼: 기본 + 예약당 전기·수도 + 겨울 온돌(예약당 크게)·여름 에어컨
  const util = Math.round((UK.base + (D.UTIL_K.season[s.cal] || 0) /* 11-25 여름·겨울 한철 냉난방 */ + bookings * (UK.per + (winter ? (rm.ondol ? UK.ondol : rm.heating === "냉난방기만" ? UK.air : UK.boiler) : [7, 8].includes(s.cal) ? UK.ac : 0))) * (rm.size / 22) * pi * (0.6 + 0.4 * sf));
  const mgmt = (rm.rent * 0.1 + util + bookings * (cleanUnit + D.SCALE.supply(nAll) * pi)) * knowCost(s) * (1 - (ctx.B?.cost || 0)) * PW.costMult(s, rm); // 묶음 효과: 공용 고정비 나눠 쓰기 · 11-23 같은 컨셉 지점끼리 비품·청소 묶음
  const adFee = Math.round(AD.fee * pi); // 11-25 마케팅비(지점마다)
  let cost = rm.rent + mgmt + adFee + rev * (D.PR_FEE + (s.era.fee ? 0.02 * mod(s, "feeShock", 1) : 0));
  cost *= mod(s, "prCost", 1) * clamp(1.02 - (s.st.num || 0) / 3000, 0.96, 1.02);
  const utilB = Math.round(util * knowCost(s) * (1 - (ctx.B?.cost || 0)) * mod(s, "prCost", 1)); // 장부 '전기·난방비'
  cost = Math.round(cost + RM.pay);
  // 별점
  const it = D.INTERIORS[rm.interior];
  const dq = decorQ(s, rm);
  let target = it.star + (rm.selfQ || 0) + mod(s, "star", 0) + knowStar(s) + (dq - 0.45) * 0.45 + { 좋음: 0.05, 보통: 0, 나쁨: -0.08 }[rm.hid.sound] - (rm.toilet === "out" ? 0.12 : 0) - (winter && !rm.ondol && rm.heating === "냉난방기만" ? 0.15 : 0) + helperPower(s, "pr_interior") * 0.05 + dl * DF.DECO.star;
  target -= (1 - q) * 0.6;
  if ((rm.unrep || 0) > D.PR_REVIEW.unrep.max) target -= D.PR_REVIEW.unrep.star; // v4.28 답글 밀림
  if (rm.replyT === s.t) target += D.PR_REVIEW.reply.star;
  if ([12, 1].includes(s.cal)) target += F.dec.pol[s.pr.decPol || "half"].star; // 환불 불가는 "돈만 받는다" 불만, 전액 환불은 너그럽다는 후기
  // v4.27 가구·소품 노후: 3~4년마다 갈아야 한다. 미루면 별점이 내려가고 6달마다 다시 묻는다
  const H = D.PR_HARD; if (rm.furnAt === undefined) rm.furnAt = s.t + r.int(H.furn[0], H.furn[1]);
  if (s.t >= rm.furnAt) { target -= H.furnStar; if (s.t >= (rm.furnAsk ?? -1) && !scenes.length) { rm.furnAsk = s.t + 6; scenes.push(furnScene(s, rm)); } }
  const drift = (target - rm.rating) * 0.2 * (target < rm.rating ? mod(s, "ratingGuard", 1) : 1);
  rm.rating = clamp(rm.rating + drift + 0.03 * r.normal(), 2.5, 4.98);
  rm.reviews += RM.add; rm.unrep = (rm.unrep || 0) + RM.add; // v4.28 후기 이벤트에 따라
  // 손님 후기: 인별·블로그. 별점이 좋고 사진 찍기 좋은 컨셉일수록 많이 올린다
  const happy = clamp((rm.rating - 3.8) / 1.0, 0, 1.2);
  const ig = Math.round(bookings * c.sns * happy * 0.25 * (0.8 + s.st.sense / 200) * (0.5 + dq)), bl = Math.round(bookings * c.sns * happy * 0.08);
  rm.buzz = clamp((rm.buzz || 0) * 0.9 + ig * 0.35 + bl * 0.8 + RM.photoBuzz * 0.3, 0, 100);
  if (rm.rating < 4.1 && r.chance(0.25)) { rm.buzz = Math.max(0, rm.buzz - 10); notes.push("\"사진이랑 달라요\" 블로그 혹평, 입소문 −10"); }
  else if (ig + bl >= 8 && r.chance(0.2)) notes.push(`손님 후기 인별 ${ig}건·블로그 ${bl}건`);
  if (q < 0.6) notes.push(`관리 부족(${Math.round(q * 100)}%): 머리카락 리뷰, 별점 하락`);
  if (winter && !rm.ondol && rm.heating === "냉난방기만" && r.chance(0.4)) notes.push("\"바닥이 너무 차가워요\" 리뷰");
  if (rm.toilet === "out" && r.chance(0.15)) notes.push("\"화장실이 밖에 있어서 불편\" 리뷰");
  if (rm.parking === 0 && c.park >= 0.8 && r.chance(0.25)) notes.push("\"주차할 곳이 없어요\" 문의 취소");
  // 민원
  const cp = c.noisy * (1 - d.noise) * { 좋음: 0.5, 보통: 1, 나쁨: 1.8 }[rm.hid.sound] * 0.35 * (rm.hid.access24 ? 1.1 : 0.9);
  if (r.chance(cp)) {
    rm.complaints++; rm.rating = clamp(rm.rating - 0.05, 2.5, 5);
    const ll = rm.hid.landlord;
    notes.push(`소음 민원 ${rm.complaints}회${rm.seen?.landlord ? "" : " · 건물주 성향이 드러났다: " + ll}`); rm.seen = rm.seen || {}; rm.seen.landlord = true;
    const evict = ll === "싫어함" ? 0.35 : ll === "찜찜" ? 0.1 : 0;
    if (!rm.notice && rm.complaints >= 2 && r.chance(evict)) { rm.notice = s.t + 3; scenes.push(storyS("건물주의 내용증명", `${rm.name}에 내용증명이 왔다. "계약 만료 후 갱신 불가. 3개월 안에 비워 주세요." 숨은 정보를 확인 안 한 대가.`)); }
  }
  if (rm.notice && s.t >= rm.notice) { notes.push("계약 해지로 문을 닫았다"); rm.status = "closed"; s.pr.rooms = s.pr.rooms.filter((x) => x !== rm); const back = rm.dep; s.cash += back; addMoney(s, "inc", "보증금 회수", back); log(s, `${rm.name} 강제 폐업(건물주). 권리금은 날렸다.`, "work"); }
  // 파손
  if (r.chance((0.04 + (rm.concept === "party" ? 0.03 : 0)) * (1 + D.PR_HARD.scaleDmg * Math.max(0, nAll - 1)))) { /* v4.27 지점이 많을수록 손이 안 닿는다 */ const dmg = Math.round(r.int(20, 90) * mod(s, "damageMult", 1) * (1 - Math.min(0.6, helperPower(s, "pr_repair") * 0.5)) * (s.pr.depo ? F.depo.dmg : 1)); cost += dmg; notes.push(`파손 수리 ${won(dmg)}${s.pr.depo ? " (보증금으로 일부 메움)" : ""}`);
    if (!s.pr.depoAsk && !scenes.length) { s.pr.depoAsk = s.t; scenes.push(depoAskScene(s, rm, dmg)); } }
  // v4.29 보증금 분쟁 · 미성년자 출입
  if (s.pr.depo && bookings >= 5 && !scenes.length && r.chance(F.depo.disputeP)) scenes.push(depoScene(s, rm));
  if (F.minor.conc.includes(rm.concept) && bookings >= 4 && !scenes.length && r.chance(([2, 3].includes(s.cal) ? F.minor.pSpring : F.minor.p) * (rm.dk === "univ" ? 1.5 : 1))) {
    if (s.pr.idCheck) { const l = Math.round(pAvg * 0.5); cost += l; notes.push(`입실 때 신분증 확인: 고등학생이 섞인 단체를 돌려보냈다(환불 ${won(l)})`); }
    else scenes.push(minorScene(s, rm, pAvg));
  }
  // 2년마다 월세 인상
  // 2년마다 재계약. 상가임대차보호법상 인상은 5%까지(11-21: 원래 1.03·1.08 × 임대료 상승기 1.12 × 물가, 상한 없음 → 월세가 매출보다 빨리 올라 말년 적자)
  if (rm.months > 0 && rm.months % 24 === 0) { const g = rm.hid.landlord === "환영" ? PR_MV.rent.good : PR_MV.rent.up, pct = Math.round(r.range(g[0], g[1]) * 1000) / 10, up = SP.landLock(s) ? 1 : 1 + pct / 100; /* 11-27 재계약마다 +4~6%(환영 +3~4%). 전에는 5%·3% 고정 · 11-25 건물 장기 임대(hidden2 bd_land)면 그대로 */ rm.rent = Math.round(rm.rent * up); notes.push(up > 1 ? `재계약, 월세 ${won(rm.rent)}(+${pct}%${rm.hid.landlord === "환영" ? " · 건물주가 조금만 올렸다" : ""}). 새 자리로 옮기면 그때 시세로 새 계약이다` : `재계약, 월세 ${won(rm.rent)} 그대로(건물 장기 임대)`); }
  if (isPeak(s.cal) && rev > 150 && !scenes.length && r.chance((s.cal === 12 ? 0.16 : 0.09) * (1 - (s.pr.know || 0) / 250) * (helpers(s, "pr_repair").length ? 0.6 : 1))) { const sc = crisis(s, r, rm, rev); if (sc) scenes.push(sc); }
  if (RVW.topOn(rm) && !rm.topOn) notes.push(`플랫폼 상위 노출! 후기 ${rm.reviews}개·별점 ${rm.rating.toFixed(2)} (예약 +${Math.round(D.PR_REVIEW.top.occ * 100)}%)`); else if (!RVW.topOn(rm) && rm.topOn) notes.push("상위 노출에서 밀려났다(후기 50개·별점 4.8)"); rm.topOn = RVW.topOn(rm);
  return { occ, bookings, rev, cost, notes, scenes, need, q, ig, bl, util: Math.min(utilB, cost), ad: adFee, pay: RM.pay, disc: RM.disc, newRev: RM.add, big: Z.split ? bigN : 0, split: Z.split, pAvg: Math.round(pAvg * 10) / 10 };
}
// 11-25 월세 = 평당 값(상권 폭 × 층 × 역 거리 × 화장실, 5만~8만으로 자름) × 평수 × 물가. 32평까지는 160만을 안 넘고 15평부터는 80만 아래가 없다(defs PR_RENT)
// 예전: 2층 기준 평당 10~19만 × 1층 2배 · 역 5분 안 서울 매물 최소 100만
export function rentFor(s, L, q = 0.5) {
  const d = D.DISTRICTS[L.dk], K = D.PR_RENT;
  const per = clamp((d.rate[0] + (d.rate[1] - d.rate[0]) * q) * D.PR_FLOOR_RENT(L) * (L.toilet === "in" ? 1.03 : 1) * (L.walk <= 5 ? 1.06 : L.walk > 10 ? 0.92 : 1), Math.min(K.per[0], d.rate[0]), K.per[1]);
  let rent = per * L.size;
  if (L.size <= K.capSize) rent = Math.min(rent, K.cap);
  if (L.size >= K.minSize) rent = Math.max(rent, K.min);
  return Math.floor(rent * SYN.pi(s) / 5 + 1e-9) * 5;
}
// 받을 수 있는 인원(평수에서 센다): 15~20평 11~15명 · 30평 40명 · 50~60평 80명
export const capOf = (size) => D.PR_SIZE.cap(size || 20);
// 지금 '보통' 월세 기준: 평당 lo~hi만, 32평까지 월세 min~cap만. 물가와 임대료 급등기만큼 같이 오른다
export function rentNorm(s) { const K = D.PR_RENT, f = SYN.pi(s) * (s.era?.rentup ? 1.2 : 1); return { lo: K.per[0] * f, hi: K.per[1] * f, min: K.min * f, cap: K.cap * f, capSize: K.capSize }; }
// 내가 찾아본 규칙: 평당 8만 초과, 또는 32평 이하인데 월세 160만 초과면 어긋난다. 어긋나면 { k, per, why }, 맞으면 null
export function rentRule(s, L) {
  if (!L || !(L.size > 0)) return null;
  const N = rentNorm(s), per = L.rent / L.size, f1 = (x) => Math.round(x * 10) / 10;
  if (per > N.hi + 0.01) return { k: "per", per, why: `평당 ${f1(per)}만 원이다. 보통은 평당 ${f1(N.lo)}만~${f1(N.hi)}만 원.` };
  if (L.size <= N.capSize && L.rent > N.cap + 0.01) return { k: "cap", per, why: `${L.size}평에 월세 ${won(L.rent)}이다. ${N.capSize}평까지는 보통 월세 ${won(Math.round(N.min))}~${won(Math.round(N.cap))}.` };
  return null;
}
// 한 건 값 배율: 방을 꽉 채우는 대형 단체 기준(15명 방 = 1). 작은 방은 조금 싸다
export const sizeP = (L) => D.PR_SIZE.pf(capOf(L.size));
// 방 크기에 따른 예약 구성(11-25). 20평(15명)까지는 전부 같은 손님. 그보다 크면 '작은 모임'과 '대형 단체'로 나뉜다
// b: 크기 0~1(15명 0 → 80명 1) · big: 예약 가운데 대형 단체 비율 · occ: 예약 건수 배율 · smallF: 작은 모임이 내는 값 ÷ 대형 단체 값
export function sizeMix(rm, cal) {
  const Z = D.PR_SIZE, cap = capOf(rm.size), b = clamp((cap - 15) / 65, 0, 1);
  if (b <= 0) return { cap, b: 0, big: 1, occ: 1, smallF: 1, split: false };
  const i = cal === 12 ? 2 : isPeak(cal) ? 1 : 0, c = D.CONCEPTS[rm.concept] || {};
  const occ = c.dec || c.off ? 1 : 1 + (Z.occ[i] - 1) * b; // 초대형 컨셉은 자기 계절 배율(dec·off)이 이미 있다(겹쳐 곱하지 않는다)
  return { cap, b, big: Math.min(0.95, Z.big[i] + (c.big || 0)), occ, smallF: Math.min(1, (1 + (Z.small - 1) * b) / Z.pf(cap)), split: true };
}
// 큰 방에 온 작은 모임 한 건 값(만원). 20평까지는 방 가격 그대로
export const smallPrice = (s, rm) => rm.price * sizeMix(rm, s.cal).smallF;
// 화면에 쓰는 방·매물 요약: 인원, 평당 월세, 규칙에 맞는지
export function roomInfo(s, x) { const cap = capOf(x.size); return { cap, per: Math.round(x.rent / (x.size || 20) * 10) / 10, rule: rentRule(s, x), big: cap >= 40, split: cap > 15 }; }
// 성수기 가격 배율: 12월은 고른 배율 그대로, 1·7·8·11월은 그 절반쯤
// 11-25 대표 기준(24평형 이익): 비수기 50~150만 · 7·8·11·1월 200~400만 · 12월 400~700만. 그래서 2월은 비수기, 11월(송년 모임 시작)은 성수기다(전에는 12·1·2·7·8월)
export const isPeak = (cal) => [12, 1, 7, 8, 11].includes(cal);
export const peakSel = (s) => s.pr.peak ?? D.PR_DEC.def; // 11-25 안 고르면 12월 1.5배(다들 올린다)
export const pkMkt = (cal) => cal === 2 ? D.PR_PKMKT.feb : cal !== 12 && isPeak(cal) ? D.PR_PKMKT.peak : 1; // 11-26 성수기·2월 동네 시세
export function peakMult(s, cal) { const p = s.pr.peak; return cal === 12 ? peakSel(s) : p && isPeak(cal) ? 1 + (p - 1) * 0.5 : pkMkt(cal); } // 안 고르면 동네 시세를 따라간다
export function setPeak(s, v) { s.pr.peak = v; return { ok: true, msg: v === 1 ? "12월에도 평소 가격(동네는 1.5배 넘게 받아요)" : `성수기 가격 +${Math.round((v - 1) * 100)}% (1·7·8·11월은 +${Math.round((v - 1) * 50)}%)` }; }
// 비교 기준 = 그 상권 경쟁사 평균 1건 가격 × 컨셉·인테리어·크기
// v4.28 이번 달 실제 비교 시세: 경쟁사 성수기 인상·비수기 할인 + 가격 전쟁
export function refNow(s, rm) { return refPrice(s, rm) * RVW.compF(s.cal, isPeak(s.cal)) * (s.cal === 12 ? D.PR_DEC.mkt : pkMkt(s.cal)) /* 11-25 12월은 동네가 다 1.5~2배 · 11-26 1·7·8·11월 1.2배, 2월 1.1배 */ * RVW.warF(mkt(s, rm.dk).war, s.t); }
export function compTable(s, rm) { const M = mkt(s, rm.dk); return RVW.compList("pr", rm.dk, refNow(s, rm) / (RVW.warF(M.war, s.t) || 1), Math.min(4, Math.max(3, M.comp)), s.t, M.war); }
export function setRevEv(s, k) { if (!D.PR_REVIEW.ev[k]) return { ok: false }; s.pr.revEv = k; return { ok: true, msg: `후기 이벤트: ${D.PR_REVIEW.ev[k].n}` }; }
export function refPrice(s, rm) { const c = D.CONCEPTS[rm.concept], it = D.INTERIORS[rm.interior]; return mkt(s, rm.dk).price * c.priceF * it.priceF * sizeP(rm); }
// ───────── 성수기 사고: 제일 벌 때 터진다 ─────────
const CRISIS = [
  { id: "boiler", n: "보일러 고장", ok: (s, rm) => [12, 1, 2].includes(s.cal) && !rm.ondol, stat: "hands", text: (rm) => `토요일 밤 9시, ${rm.name} 손님 전화. "사장님, 바닥이 얼음장이에요!" 보일러가 멈췄다. 이번 주말 예약이 줄줄이 걸려 있다.` },
  { id: "ondol", n: "온돌 배관 터짐", ok: (s, rm) => [12, 1, 2].includes(s.cal) && rm.ondol, stat: "hands", text: (rm) => `${rm.name} 바닥에서 물이 스며 나온다. 온돌 배관이 얼어 터졌다. 크리스마스 예약이 코앞이다.` },
  { id: "aircon", n: "에어컨 고장", ok: (s) => [7, 8].includes(s.cal), stat: "hands", text: (rm) => `35도 폭염, ${rm.name} 에어컨에서 미지근한 바람만 나온다. 후기에 "사우나인 줄"이 달리기 직전이다.` },
  { id: "double", n: "이중 예약", ok: (s) => !s.pr.sys.booking, stat: "talk", text: (rm) => `${rm.name} 문 앞에 두 팀이 서 있다. 우주공간과 네이바 예약이 같은 시간에 잡혔다. 둘 다 생일 케이크를 들고 있다.` },
  { id: "leak", n: "윗집 누수", ok: () => true, stat: "talk", text: (rm) => `${rm.name} 천장에서 물이 떨어진다. 윗집 배관이 샜다. 이번 주 예약 손님들이 걱정스러운 까톡을 보낸다.` },
  { id: "party", n: "단체 손님 파손", ok: (s, rm) => ["party", "mega", "game"].includes(rm.concept), stat: "talk", text: (rm) => `${rm.name} 스무 명 단체가 빠져나간 자리. 소파 찢김, 빔프로젝터 박살, 벽에 케이크. 다음 예약은 3시간 뒤.` },
  { id: "cleaner", n: "청소 업체 펑크", ok: (s) => s.cal === 12 && s.pr.sys.cleanContract, stat: "hands", text: (rm) => `12월 연속 예약 한가운데, 청소 업체가 "인력이 없어요" 문자 한 통. ${rm.name} 다음 손님 입실까지 2시간.` },
  { id: "police", n: "소음 신고·경찰 출동", ok: (s, rm) => s.cal === 12 && rm.hid.sound !== "좋음", stat: "talk", text: (rm) => `새벽 1시, ${rm.name} 앞에 경찰차가 섰다. 옆 건물에서 소음 신고. 건물주에게서도 전화가 온다.` },
];
function crisis(s, r, rm, rev) {
  const L = CRISIS.filter((c) => c.ok(s, rm)); if (!L.length) return null; const c = r.pick(L);
  const pi = SYN.pi(s), fixF = (1 - Math.min(0.6, helperPower(s, "pr_repair") * 0.5)) * mod(s, "damageMult", 1);
  const sib = s.pr.rooms.some((x) => x !== rm && x.status === "open");
  const loss = Math.round(rev * r.range(0.25, 0.4) * (sib ? 0.6 : 1)), fix = Math.round(r.int(80, 250) * pi * fixF);
  s._prCrisis = { id: rm.id, loss, fix, n: c.n };
  return { kind: "event", title: `성수기 사고 · ${c.n}`, tag: "파티룸", text: `${c.text(rm)} (그대로 두면 예약 환불 약 ${won(loss)}${sib ? ", 다른 지점으로 옮겨 드려서 이만큼으로 줄었다" : ""})`, onChoose: "pr_crisis", choices: [
    { t: `긴급 출장 수리·대응 (${won(Math.round(fix * 1.6))})`, eff: {}, text: "새벽에 기사님이 왔다. 손님들은 거의 몰랐다." },
    { t: `환불하고 다음 주에 고친다 (−${won(loss + fix)}, 별점 −)`, eff: {}, text: "사과 문자 12통. 별점 1개짜리 후기가 달렸다." },
    { t: `내가 직접 달려간다 (${D.STATS[c.stat]} 판정, 다음 달 행동력 −2)`, check: { stat: c.stat, dc: 55 }, ok: { text: "밤새 붙어서 해결했다. 손님이 \"사장님 멋있어요\" 후기를 남겼다.", eff: {} }, ng: { text: "더 망가뜨렸다. 결국 업체를 불렀고 환불까지 했다.", eff: {} } },
  ] };
}
export function crisisChoose(s, i, ok) {
  const o = s._prCrisis; if (!o) return []; const rm = s.pr.rooms.find((x) => x.id === o.id); if (!rm) return [];
  const pay = (v, k) => { s.cash -= v; addMoney(s, "exp", k, v); };
  if (i === 0) { const c = Math.round(o.fix * 1.6); pay(c, "파티룸 사고 수리"); return [`긴급 수리 −${won(c)}`]; }
  if (i === 1) { pay(o.loss, "파티룸 환불"); pay(o.fix, "파티룸 사고 수리"); rm.rating = clamp(rm.rating - 0.12, 2.5, 5); rm.buzz = Math.max(0, (rm.buzz || 0) - 8); return [`환불 −${won(o.loss)}`, `수리 −${won(o.fix)}`, `${rm.name} 별점 −0.12`, "입소문 −8"]; }
  s.apNext -= 2;
  if (ok) { const c = Math.round(o.fix * 0.3); pay(c, "파티룸 사고 수리"); rm.buzz = Math.min(100, (rm.buzz || 0) + 4); return [`부품값 −${won(c)}`, "입소문 +4", "다음 달 행동력 −2"]; }
  pay(o.loss, "파티룸 환불"); pay(Math.round(o.fix * 1.3), "파티룸 사고 수리"); rm.rating = clamp(rm.rating - 0.15, 2.5, 5);
  return [`환불 −${won(o.loss)}`, `수리 −${won(Math.round(o.fix * 1.3))}`, `${rm.name} 별점 −0.15`, "다음 달 행동력 −2"];
}
// v4.27 가구 교체
function furnScene(s, rm) {
  const c = Math.round(D.INTERIORS[rm.interior].cost * D.PR_HARD.furnCost * (rm.size / 22) * SYN.pi(s) / 10) * 10;
  s._prFurn = { id: rm.id, c };
  return { kind: "event", title: "소파가 꺼지고 벽지가 들떴다", tag: "파티룸", text: `${rm.name}을 연 지 ${Math.floor(rm.months / 12)}년. 소파는 꺼지고, 조명은 깜빡이고, 벽지 모서리가 들떴다. 후기에 "사진이랑 좀 달라요"가 늘었다. 전부 바꾸면 ${won(c)}.`, onChoose: "pr_furn", choices: [
    { t: `전부 새로 바꾼다 (${won(c)})`, eff: {}, text: "새집 냄새가 난다. 별점이 다시 오를 것 같다." },
    { t: `소파와 조명만 바꾼다 (${won(Math.round(c * 0.45))})`, eff: {}, text: "급한 불은 껐다. 1년 반쯤은 버틸 것 같다." },
    { t: "아직은 버틴다", eff: {}, text: "돈은 아꼈다. 별점은 조금씩 내려간다." },
  ] };
}
export function furnChoose(s, i) {
  const o = s._prFurn; if (!o) return []; const rm = s.pr.rooms.find((x) => x.id === o.id); if (!rm) return [];
  const H = D.PR_HARD, R0 = R(s), pay = (v) => { s.cash -= v; addMoney(s, "exp", "가구·소품 교체", v); };
  const st0 = rm.stale || 0;
  if (i === 0) { pay(o.c); rm.furnAt = s.t + R0.int(H.furn[0], H.furn[1]); rm.rating = clamp(rm.rating + 0.1, 2.5, 4.98); rm.stale = st0 * PR_MV.stale.furn; return [`가구 교체 −${won(o.c)}`, `${rm.name} 별점 +0.1`, ...(st0 >= 0.01 ? [`식상함 −${Math.round(st0 * 100)}% → −${Math.round(rm.stale * 100)}%`] : [])]; }
  if (i === 1) { const c = Math.round(o.c * 0.45); pay(c); rm.furnAt = s.t + 18; rm.stale = st0 * PR_MV.stale.furnPart; return [`부분 교체 −${won(c)}`]; }
  return [`${rm.name} 별점이 조금씩 내려간다`];
}
// 11-27 "이 자리도 오래됐다": 지점마다 한 번(문 연 지 54달, 또는 1년 평균 이익이 고점보다 30% 넘게 줄었을 때)
function moveScene(s, rm) {
  const I = moveInfo(s, rm), M = mkt(s, rm.dk), C = PR_MV.carry;
  return { kind: "event", tag: "파티룸", title: "이 자리도 오래됐다", onChoose: "pr_move", f30: { id: rm.id }, best: [],
    text: `${rm.name}, ${I.y}년 차. 손님들이 새 공간을 찾는다. 월세는 재계약 때마다 올랐고, 동네 파티룸은 ${M.comp}곳이 됐다.${I.tr < 0 ? ` 1년 평균 이익은 제일 좋던 때보다 ${-I.tr}% 줄었다.` : ""} 파티룸은 권리금이 낮다. 지금 넘기면 보증금 ${won(I.dep)}에 권리금 ${won(I.key)}쯤이다. 대신 가구와 소품, 후기 일부는 새 자리로 들고 갈 수 있다(${C.mo}달 안, 다른 동네). 새 자리는 그때 시세로 새 계약을 쓴다.${I.why ? ` 다만 지금은 넘길 수 없다. ${I.why}.` : ""}`,
    choices: [
      { t: "지켜본다", eff: {}, text: "장부를 덮었다. 가구를 바꾸거나 컨셉을 바꾸면 조금은 버틸 수 있다." },
      ...(I.why ? [] : [{ t: `양도를 알아본다 (보증금 ${won(I.dep)} + 권리금 ${won(I.key)})`, eff: {}, text: "인수자가 방을 둘러보고 고개를 끄덕였다. 소파와 조명은 트럭에 실었다. 다음 동네를 보러 간다." }]),
    ] };
}
function storyS(title, text) { return { kind: "story", title, text, choices: [{ t: "계속", eff: {}, text: "" }] }; }

// 문서 기반 사건(16장)을 장면으로
const SIZE = { 소: 1, 중: 2, 대: 3 };
export function textToEff(text, job) {
  const eff = {}; if (!text) return eff;
  for (const part of text.split(/[,，]/).map((x) => x.trim())) {
    if (!part || /변화 없음/.test(part)) continue;
    const mag = SIZE[(part.match(/[소중대]/) || ["소"])[0]] || 1;
    const neg = /-|−|감소|하락|손실|줄|악화/.test(part) && !/위험 대 감소|위험 감소/.test(part);
    const sign = neg ? -1 : 1;
    if (/돈|비용|수입|매출|순수익|광고비/.test(part)) eff.cash = (eff.cash || 0) + sign * (job === "partyroom" ? [0, 30, 90, 250] : [0, 10, 40, 120])[mag];
    else if (/체력|스태미너/.test(part)) eff.hp = sign * [0, 5, 10, 18][mag];
    else if (/멘탈|스트레스/.test(part)) eff.mental = sign * [0, 4, 8, 15][mag];
    else if (/회사\s?눈치|발각/.test(part)) eff.eye = sign * [0, 5, 10, 20][mag];
    else if (/가족|배우자/.test(part)) eff.family = sign * [0, 4, 8, 15][mag];
    else if (/평판|후기|리뷰|별점|신뢰|단골|문의|예약/.test(part)) { if (job === "partyroom") eff.pr_rating = sign * [0, 0.05, 0.1, 0.2][mag]; else eff.cs_rep = sign * [0, 1, 3, 6][mag]; }
    else { const map = { 글쓰기: "write", 말빨: "talk", 디자인: "sense", 손재주: "hands", 숫자: "num", 영업: "mkt", 촬영: "sense", 코딩: "num" }; for (const [k, v] of Object.entries(map)) if (part.includes(k)) { eff.stat = eff.stat || {}; eff.stat[v] = (eff.stat[v] || 0) + sign * mag; } }
  }
  return eff;
}
export function jobEvent(s, r, job) {
  const evs = (JOBEV[job] || []).filter((e) => !s.seen["job_" + e.id]);
  if (!evs.length) return null;
  const phase = job === "partyroom" ? (s.pr.rooms.length >= 2 || s.pr.lv >= 4 ? "late" : s.pr.lv >= 2 ? "mid" : "early") : (s.cs.lv >= 4 ? "late" : s.cs.lv >= 2 ? "mid" : "early");
  const pool = evs.filter((e) => e.phase === phase || (phase === "late" && e.phase === "mid")).concat(evs.filter((e) => e.phase === "early" && phase !== "early").slice(0, 1));
  const e = r.pick(pool.length ? pool : evs);
  s.seen["job_" + e.id] = s.t;
  return { kind: "event", title: e.title, text: e.scene, tag: job === "partyroom" ? "파티룸" : "컨설팅", choices: e.choices.map((c) => ({ t: c.t, eff: textToEff(c.effect, job), text: "" })) };
}

// ───────── 가치·패시브·할 일 ─────────
// 11-26 대표: 장사 잘되는 가게는 되팔 값의 0.8이 아니라 1 이상으로 쳐 준다. 적자면 0.8, 월 이익 50만(물가 반영)에서 1, 200만에서 1.3까지
export function valueF(s, rm) { const ap = avgProfit(rm) / SYN.pi(s); return ap <= 0 ? 0.8 : ap < 50 ? 0.8 + 0.2 * ap / 50 : Math.min(1.3, 1 + (ap - 50) / 150 * 0.3); }
// 11-27 권리금 범위(2,000만까지)를 따른다: 잘되는 가게는 보증금 + min(권리금 × 1~1.3, 2,000만 × 물가), 적자 가게는 (보증금 + 권리금) × 0.8~1
export function roomValue(s, rm) { if (rm.status !== "open") return rm.dep + Math.min(rm.key * 0.5, PR_MV.key.hi * SYN.pi(s)); const f = valueF(s, rm), k = keyQuote(s, rm); return Math.round(f < 1 ? (rm.dep + k) * f : rm.dep + Math.min(PR_MV.key.hi * SYN.pi(s), k * f)); }
export function value(s) { return s.pr.rooms.reduce((a, rm) => a + roomValue(s, rm), 0); }
// 비수기 대비 현금: 지점 월세(새 지점 포함) N달 치 + 생활비 2달 치
export const RESERVE_MONTHS = 4;
export function reserveNeed(s, addRent = 0) { const rents = s.pr.rooms.reduce((a, rm) => a + rm.rent, 0) + addRent; return Math.round((rents * RESERVE_MONTHS + monthlySpend(s) * 2) / 10) * 10; }
export function passive(s) { if (!s.pr.sys.manager) return 0; return Math.max(0, s.pr.profitHist.slice(-3).reduce((a, b) => a + b, 0) / 3); }
export function todos(s) {
  const t = [];
  for (const rm of s.pr.rooms) {
    if (rm.status === "setup" && rm.self > 0) t.push({ lv: 2, text: `${rm.name} 셀프 공사 ${rm.self}번 남음(월세 나가는 중)`, go: "pr" });
    if (rm.status === "open") { const n = needAp(s, rm); if (rm.ap < n) t.push({ lv: rm.ap < n * 0.6 ? 2 : 1, text: `${rm.name} 관리 ${fmt(rm.ap)}/${fmt(n)}`, go: "pr" }); if (rm.notice) t.push({ lv: 2, text: `${rm.name} 계약 해지 통보: ${rm.notice - s.t}개월 남음`, go: "pr" }); }
  }
  for (const rm of s.pr.rooms) if (rm.mvAsk && moveDue(s, rm) && !rm.notice) { const I = moveInfo(s, rm); t.push({ lv: 1, text: `${rm.name}: 이 자리 ${I.y}년 차. 옮길 때가 됐어요(지금 넘기면 약 ${won(I.total)})`, go: "pr" }); } // 11-27
  const cyL = carryList(s); if (cyL.length) { const c0 = cyL[0]; t.push({ lv: 0, text: `${c0.name}의 가구·후기를 들고 갈 수 있어요: ${PR_MV.carry.mo - (s.t - c0.t)}달 안에 다른 동네에 새 지점 열기`, go: "pr" }); }
  // 손절·확장 코치(설정에서 투잡 코치를 끄면 안 보임)
  if (!s.sj?.coachOff) {
    for (const rm of s.pr.rooms) if (rm.status === "open" && (rm.red || 0) >= 3) { const A = cutAdvice(s, rm); if (A.seasonal) { t.push({ lv: 0, text: `코치 · ${rm.name} 비수기 적자 ${rm.red}달째(1년으로 보면 흑자): 비수기 대비금만 챙기기`, go: "pr" }); continue; } t.push({ lv: 2, text: `코치 · ${rm.name} ${rm.red}달 연속 적자: ${A.rec === "hold" ? `버티려면 ${A.fixes[0] ? A.fixes[0].a : "성수기까지 비용 줄이기"}` : A.rec === "transfer" ? `양도 시세 ${won(A.tv)} · 정리를 생각할 때` : `폐업하면 보증금−원상복구 ${won(A.cv)} · 정리를 생각할 때`}`, go: "pr" }); }
    const open = s.pr.rooms.filter((x) => x.status === "open");
    if (s.pr.rooms.length === 1 && stable(open[0])) t.push({ lv: 1, text: `코치 · 1호점이 6달 흑자. 2호점을 볼 때예요(방 하나면 공실·월세 위험이 한 곳에 몰려요)`, go: "pr" });
    else if (s.pr.rooms.length === 2 && open.length === 2 && open.every(stable)) t.push({ lv: 0, text: "코치 · 두 곳 다 안정. 3호점까지 가면 매니저를 쓸 수 있어요", go: "pr" });
    else if (s.pr.rooms.length >= 3 && !s.pr.sys.manager) t.push({ lv: 0, text: "코치 · 지점 3곳: 운영 매니저(월 180만)를 켜면 관리 행동력이 지점당 0.25", go: "pr" });
  }
  const pend = s.pr.listings.filter((l) => !(l.seen.visit && l.seen.meet && l.seen.app));
  if (pend.length) t.push({ lv: 0, text: `확인 안 한 매물 정보 ${pend.length}곳`, go: "pr" });
  // 비수기(3~6월, 9~11월) 앞두고 현금 점검
  if ([2, 8].includes(s.cal) && s.pr.rooms.some((x) => x.status === "open")) { const need = reserveNeed(s); const low = s.cash < need; t.push({ lv: low ? 2 : 0, text: `${s.cal === 2 ? "3~6월" : "9~11월"} 비수기가 와요: 월세 ${RESERVE_MONTHS}달 치+생활비 2달 치 ${won(need)} ${low ? `필요(현금 ${won(Math.max(0, s.cash))})` : "준비됨"}`, go: "pr" }); }
  if ([11, 6].includes(s.cal) && s.pr.rooms.length) t.push({ lv: peakSel(s) === 1 ? 2 : 0, text: s.cal === 11 ? `다음 달 12월 극성수기! 12월 가격 ${peakSel(s) === 1 ? "아직 그대로(동네는 1.5배 넘게 받아요)" : `+${Math.round((peakSel(s) - 1) * 100)}%`}${s.pr.rooms.some((x) => capOf(x.size) >= 40) ? " · 큰 방은 대형 단체가 몰려요" : ""}` : "7·8월 성수기가 온다: 성수기 가격·에어컨 점검", go: "pr" });
  return t;
}

// ───────── v4.29 파티룸 특이 요소: 12월 예약 오픈 전쟁 · 파손 보증금 · 미성년자 출입 ─────────
// 효과 크기는 여기 모아 둔다(밸런스는 이 숫자만 고치면 된다)
export const PR_F30 = {
  dec: { open: 8 /* 11-25: 8월 달 마감에 만들어 9월이 시작될 때 뜬다(글이 "9월 1일 0시"). 전에는 9라서 10월에 떴다 */, pol: { // 12월 취소 규정: 예약 배율 occ · 노쇼 비율 noshow · 노쇼 때 받는 위약금 keep · 12·1월 별점 star
    half: { n: "7일 전 50% 환불", occ: 1, noshow: 0.06, keep: 0.5, star: 0, desc: "무난해요. 노쇼 손해 절반은 위약금으로 메워요" },
    full: { n: "전액 환불", occ: 1.1, noshow: 0.14, keep: 0, star: 0.02, desc: "예약이 몰리지만 노쇼·막판 취소가 많아요" },
    none: { n: "선결제·환불 불가", occ: 0.86, noshow: 0.02, keep: 1, star: -0.05, desc: "노쇼 걱정은 없지만 예약이 줄고 '돈만 받는다' 후기" } } },
  depo: { amt: 10, occ: 0.95, dmg: 0.35, disputeP: 0.07, fix: 14 }, // 보증금 10만: 예약 −5%, 파손 손해 ×0.35, 달마다 분쟁 7%
  minor: { p: 0.025, pSpring: 0.08, conc: ["party", "mega", "game", "home"], fine: [100, 300], ban: 1, catchP: 0.35, idOcc: 0.98 }, // 2·3월 새내기 철에 잦다
};
export function setDecPol(s, k) { if (!PR_F30.dec.pol[k]) return { ok: false }; s.pr.decPol = k; return { ok: true, msg: `12월 취소 규정: ${PR_F30.dec.pol[k].n}` }; }
export function setDepo(s, v) { s.pr.depo = !!v; s.pr.depoAsk = s.pr.depoAsk ?? s.t; return { ok: true, msg: v ? `파손 보증금 ${PR_F30.depo.amt}만 받기: 예약 −${Math.round((1 - PR_F30.depo.occ) * 100)}%, 파손 손해 −${Math.round((1 - PR_F30.depo.dmg) * 100)}%` : "보증금 안 받기" }; }
export function setIdCheck(s, v) { s.pr.idCheck = !!v; return { ok: true, msg: v ? "입실 때 신분증 확인: 단체 예약 조금 줄어요" : "신분증 확인 안 함: 걸리면 영업정지" }; }
const pcF = (x) => `${x >= 1 ? "+" : "−"}${Math.abs(Math.round((x - 1) * 100))}%`;
function decScene(s) {
  const P = PR_F30.dec.pol, cur = s.pr.decPol || "half";
  const bigRm = s.pr.rooms.filter((x) => x.status === "open" && capOf(x.size) >= 40).sort((a, b) => b.size - a.size)[0]; // 11-25 큰 방: 12월에 대형 단체가 몰린다
  const bigLine = bigRm ? ` ${bigRm.name}(${bigRm.size}평·최대 ${capOf(bigRm.size)}명)에는 송년회 단체 문의가 줄을 섰다. 평소엔 드문드문하던 대형 단체가 12월엔 예약 열 건에 ${Math.round(sizeMix(bigRm, 12).big * 10)}건꼴이다. 대형 단체는 한 건이 커서 노쇼 한 번이 더 아프다.` : "";
  return { kind: "event", tag: "파티룸", title: "12월 예약 오픈 전쟁", onChoose: "pr_dec",
    text: `9월 1일 0시, 12월 예약 문을 연다. 송년회·크리스마스 단체들이 새로고침을 누르고 있다. 연말 한 달이 1년 장사를 좌우한다.${bigLine} 취소 규정을 정해야 한다. (지금: ${P[cur].n})`,
    choices: [
      { t: `7일 전까지 취소하면 50% 환불 (무난)`, eff: {}, text: "공지를 올렸다. 3분 만에 크리스마스이브가 찼다." },
      { t: `전액 환불 가능 (예약 ${pcF(P.full.occ)}, 노쇼 많음)`, eff: {}, text: "\"부담 없이 잡으세요!\" 예약이 쏟아졌다. 몇 팀이나 진짜 올까." },
      { t: `선결제·환불 불가 (예약 ${pcF(P.none.occ)}, 노쇼 거의 없음)`, eff: {}, text: "\"환불 불가요?\" 문의가 몇 개 빠졌다. 대신 들어온 예약은 확실하다." },
    ] };
}
function depoAskScene(s, rm, dmg) {
  const K = PR_F30.depo;
  return { kind: "event", tag: "파티룸", title: "보증금을 받을까", onChoose: "pr_depoask",
    text: `${rm.name} 손님이 빔프로젝터 렌즈를 깨고 연락이 끊겼다. 수리비 ${won(dmg)}는 내 몫이다. 옆 가게 사장님은 보증금 ${K.amt}만 원을 받는다고 한다.`,
    choices: [
      { t: "지금처럼 안 받는다", eff: {}, text: "보증금 있는 곳은 예약이 덜 잡힌다. 이런 날도 있는 거다." },
      { t: `보증금 ${K.amt}만 원을 받는다 (파손 손해 −${Math.round((1 - K.dmg) * 100)}%, 예약 −${Math.round((1 - K.occ) * 100)}%, 돌려줄 때 분쟁)`, eff: {}, text: "예약 안내문에 한 줄을 더했다. '보증금은 퇴실 확인 후 돌려드립니다.'" },
    ] };
}
function depoScene(s, rm) {
  const K = PR_F30.depo, fix = Math.round(K.fix * SYN.pi(s)), dep = Math.round(K.amt * SYN.pi(s));
  return { kind: "event", tag: "파티룸", title: "\"이 얼룩 원래 있었어요\"", onChoose: "pr_depo", f30: { id: rm.id, fix, dep },
    text: `${rm.name} 퇴실한 손님에게 보증금을 돌려주려는데 소파에 와인 얼룩이 있다. "그거 원래 있던 거예요." 체크인 사진엔 애매하게 찍혀 있다. 세탁비 ${won(fix)}.`,
    choices: [
      { t: `반만 빼고 돌려준다 (${won(Math.round(dep / 2))} 공제)`, eff: {}, text: "\"…네, 그럼 반만요.\" 둘 다 찜찜하게 끝났다." },
      { t: "전액 돌려주고 세탁은 내가 한다", eff: {}, text: "\"사장님 쿨하시네요.\" 다음 예약에 그 손님 친구가 왔다." },
      { t: "입실 사진을 보여 주고 전액 공제한다 (말빨 판정)", check: { stat: "talk", dc: 52 }, ok: { text: "사진 세 장을 나란히 보냈다. \"…죄송합니다.\"", eff: {} }, ng: { text: "\"사진에 안 보이잖아요!\" 결국 돌려줬고, 별점 1점이 달렸다.", eff: { mental: -3 } } },
    ] };
}
function minorScene(s, rm, pEff) {
  const K = PR_F30.minor, fine = Math.round((K.fine[0] + K.fine[1]) / 2 * SYN.pi(s)); s.pr.minorT = s.t;
  return { kind: "event", tag: "파티룸", title: "MT 단체에 고등학생이?", onChoose: "pr_minor", f30: { id: rm.id, p: Math.round(pEff), fine },
    text: `${rm.name}에 대학 새내기 MT 단체 12명이 왔다. 그런데 두어 명이 아무리 봐도 고등학생이다. 현관엔 술 박스. 미성년자에게 술자리를 내줬다 걸리면 영업정지 ${K.ban}달에 과징금 ${won(fine)} 안팎이다.`,
    choices: [
      { t: "신분증을 확인해 미성년자는 돌려보낸다 (앞으로도 확인)", eff: {}, text: "\"아 사장님, 얘 진짜 스무 살인데…\" 신분증은 없었다. 두 명이 돌아갔다." },
      { t: "술은 빼는 조건으로 받는다 (말빨 판정)", check: { stat: "talk", dc: 50 }, ok: { text: "\"넵! 콜라만 마실게요!\" 술 박스는 차 트렁크로 돌아갔다.", eff: {} }, ng: { text: "새벽 1시, CCTV에 소주병이 보인다.", eff: {} } },
      { t: "모른 척 받는다", eff: {}, text: "예약은 예약이다. 마음 한쪽이 불편하다." },
    ] };
}
const prRoom = (s, sc) => s.pr.rooms.find((x) => x.id === sc?.f30?.id);
const prPay = (s, v, k) => { s.cash -= v; addMoney(s, "exp", k, v); };
function minorCaught(s, r, sc, p) {
  const rm = prRoom(s, sc); if (!rm || !r.chance(p)) return ["이번엔 넘어갔다(위험은 남아요)"];
  const o = sc.f30; prPay(s, o.fine, "파티룸 과징금"); rm.banned = PR_F30.minor.ban; rm.rating = clamp(rm.rating - 0.1, 2.5, 4.98);
  log(s, `${rm.name} 미성년자 출입 적발. 영업정지 ${PR_F30.minor.ban}달.`, "work");
  return ["옆방 신고로 경찰이 왔다", `과징금 −${won(o.fine)}`, `${rm.name} 영업정지 ${PR_F30.minor.ban}달`, "별점 −0.1"];
}
export function f30Scene(s, r, what) { // 시험용: 장면을 바로 만든다
  const rm = s.pr.rooms.find((x) => x.status === "open") || s.pr.rooms[0]; if (!rm) return null;
  return what === "dec" ? decScene(s) : what === "depoask" ? depoAskScene(s, rm, 60) : what === "depo" ? depoScene(s, rm) : minorScene(s, rm, rm.price || 20);
}
const F30_CHOOSE = {
  pr_move(s, r, i, ok, sc) { const rm = prRoom(s, sc); if (!rm) return []; if (i !== 1 || transferWhy(s, rm)) return ["보드 지점 카드에서 '지금 넘기면 받는 돈'을 달마다 볼 수 있어요"]; const dn = D.DISTRICTS[rm.dk].n; return [closeRoom(s, rm.id).msg, `${dn}에 다시 열면 들고 가기 혜택이 없어요(다른 동네에서만)`]; }, // 11-27
  pr_dec(s, r, i) { const k = ["half", "full", "none"][i] || "half"; s.pr.decPol = k; const P = PR_F30.dec.pol[k]; return [`12월 취소 규정: ${P.n}`, P.desc]; },
  pr_depoask(s, r, i) { if (i !== 1) return []; return [setDepo(s, true).msg, "보드 '운영 규칙'에서 바꿀 수 있어요"]; },
  pr_depo(s, r, i, ok, sc) {
    const rm = prRoom(s, sc), o = sc?.f30; if (!rm || !o) return [];
    if (i === 0) { prPay(s, Math.max(0, o.fix - Math.round(o.dep / 2)), "파티룸 비용"); rm.rating = clamp(rm.rating - 0.02, 2.5, 4.98); return [`세탁비 ${won(o.fix)} − 공제 ${won(Math.round(o.dep / 2))}`, `${rm.name} 별점 −0.02`]; }
    if (i === 1) { prPay(s, o.fix, "파티룸 비용"); rm.buzz = Math.min(100, (rm.buzz || 0) + 3); return [`세탁비 −${won(o.fix)}`, "입소문 +3"]; }
    if (ok) { prPay(s, Math.max(0, o.fix - o.dep), "파티룸 비용"); return [`보증금 ${won(o.dep)} 공제로 세탁비를 메웠다`]; }
    prPay(s, o.fix, "파티룸 비용"); rm.rating = clamp(rm.rating - 0.08, 2.5, 4.98); return [`세탁비 −${won(o.fix)}`, `${rm.name} 별점 −0.08`];
  },
  pr_minor(s, r, i, ok, sc) {
    const rm = prRoom(s, sc), o = sc?.f30; if (!rm || !o) return [];
    if (i === 0) { const l = Math.round(o.p * 0.5); prPay(s, l, "파티룸 환불"); rm.rating = clamp(rm.rating - 0.02, 2.5, 4.98); s.pr.idCheck = true; return [`일부 환불 −${won(l)}`, "앞으로 입실 때 신분증 확인(단체 예약 조금 −)", "보드 '운영 규칙'에서 끌 수 있어요"]; }
    if (i === 1) return ok ? ["무사히 넘어갔다"] : minorCaught(s, r, sc, PR_F30.minor.catchP);
    return minorCaught(s, r, sc, PR_F30.minor.catchP * 1.4);
  },
};

// v4.28 장면 선택: 후기 사건(pr_rv) · 가격 전쟁(pr_war). core.js 가 SCENE_FN 에 붙인다
export const PR_CHOOSE = {
  ...F30_CHOOSE,
  pr_rv(s, r, i, ok) { return RVW.reviewChoose(s, r, i, ok, s.pr.rooms); },
  pr_war(s, r, i) {
    const o = s._prWar; s._prWar = null; if (!o) return []; const L = s.pr.rooms.filter((x) => x.dk === o.dk && x.status === "open");
    if (i === 0) { for (const x of L) { x.warBase = x.warBase || x.price; x.price = Math.max(5, Math.round(x.price * (1 - D.PRICE_K.war.follow))); } return [`${L.length}곳 가격 −${Math.round(D.PRICE_K.war.follow * 100)}% (전쟁 끝나면 원래대로)`]; }
    if (i === 2) { for (const x of L) x.price = Math.round(x.price * (1 + D.PRICE_K.war.premium)); return [`${L.length}곳 가격 +${Math.round(D.PRICE_K.war.premium * 100)}% (별점·꾸미기가 받쳐 줘야 해요)`]; }
    return ["가격 그대로: 전쟁 동안 시세가 내려가 예약이 조금 준다"];
  },
};
