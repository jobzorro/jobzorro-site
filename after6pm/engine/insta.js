// 인별그램 v2(11-22): '매력으로 크는 투잡' → '컨셉을 설계하고 지키는 게임'.
// 성장 = 컨셉 일관성 × 트렌드와 맞음 × 업로드 리듬(약속·연속 기록) × 커뮤니티 온도(팬심·논란) × 숨은 수요·경쟁.
// 매력은 얼굴 공개 컨셉에서만 +10% 안팎. 감각은 '컨셉대로' 게시물의 일관성 상승 폭에만.
// 예전 칸(f, eng, posts, reels, niche, face, deals, gongN …)은 이야기 보강(story/insta.js)·엔딩·특전이 읽으므로 그대로 둔다.
import * as D from "./defs.js";
import { addMoney, log, gainStat, mod, applyEff, won, ensureRel, addAff, openScene, CHAR, jo } from "./core.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import { hashStr, makeRng } from "./rng.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fmt = (n) => Math.round(n).toLocaleString();
const company = (s) => !(s.co?.quit || s.co?.fired);

// ───────── 컨셉 4축 ─────────
// d: 수요(더하기), c: 경쟁(더하기). 주제는 기본값, 나머지 축은 보정. 조합 보정(PAIRS)과 판마다 다른 숨은 값(±0.15)이 더해진다
export const TOPICS = {
  daily: { n: "일상", d: 1.0, c: 0.8, ic: "☀" },
  fit: { n: "운동", d: 1.2, c: 0.75, ic: "💪", hobby: ["run", "climb"] },
  food: { n: "맛집", d: 1.15, c: 0.7, ic: "🍜", hobby: ["cook", "wine"] },
  space: { n: "공간", d: 0.9, c: 0.45, ic: "🛋", job: "pr" },
  career: { n: "커리어", d: 0.78, c: 0.3, ic: "💼", job: "cs" },
  travel: { n: "여행", d: 1.1, c: 0.65, ic: "✈", hobby: ["travel", "camp"] },
  pet: { n: "반려동물", d: 1.05, c: 0.5, ic: "🐾" },
  fashion: { n: "패션", d: 1.25, c: 0.85, ic: "👗", hobby: ["photo"] },
};
// col: 피드 9칸 색(이 톤으로 맞춰진다)
export const TONES = {
  pastel: { n: "파스텔", d: 0.05, c: 0.15, col: ["#f9d5e5", "#e3d5f9", "#d5f0f9", "#fbe7c6"] },
  film: { n: "필름 감성", d: 0.05, c: 0.05, col: ["#c9b79c", "#a68a64", "#d8cbb3", "#8c7a5b"] },
  black: { n: "블랙 미니멀", d: -0.05, c: -0.1, col: ["#1d1d1f", "#3a3a3c", "#e5e5e5", "#6e6e73"] },
  bmov: { n: "B급 유머", d: 0.1, c: -0.15, col: ["#ffe14d", "#ff7a59", "#7ce38b", "#59b8ff"] },
  lux: { n: "고급", d: 0, c: 0.05, col: ["#1f2a44", "#c8a96a", "#f3eee4", "#6b4f2a"] },
};
// ap·hp: 올리기 한 번의 품. g: 한 편의 크기. 릴스·브이로그는 크게 흔들린다(터질 수도)
export const FMTS = {
  photo: { n: "사진 카드", d: -0.05, c: 0, ap: 1, hp: 2, g: 1.0, vol: 0.25 },
  reels: { n: "릴스", d: 0.2, c: 0.15, ap: 2, hp: 5, g: 1.45, vol: 0.65 },
  info: { n: "정보 카드", d: 0, c: -0.1, ap: 1, hp: 3, g: 1.0, vol: 0.2, save: 1 },
  vlog: { n: "브이로그", d: 0.1, c: -0.05, ap: 2, hp: 6, g: 1.35, vol: 0.5, fan: 1 },
};
// g: 성장 배수(얼굴 공개는 매력으로 따로 계산), eye: 회사 눈치
export const FACES = {
  face: { n: "얼굴 공개", d: 0.05, c: 0.05, g: 1, eye: true },
  hand: { n: "손만", d: 0, c: 0, g: 1 },
  voice: { n: "목소리만", d: -0.02, c: -0.05, g: 0.98 },
  char: { n: "캐릭터", d: -0.05, c: -0.1, g: 0.96 },
};
// 잘 맞는 조합·안 맞는 조합 [축 값, 축 값, 수요, 경쟁]
const PAIRS = [
  ["career", "info", 0.18, 0], ["career", "bmov", 0.1, -0.05], ["career", "pastel", -0.1, 0],
  ["fit", "reels", 0.12, 0.15], ["fit", "pastel", 0.05, 0.1], ["fit", "voice", -0.08, 0],
  ["food", "film", 0.12, 0.05], ["food", "info", 0.08, -0.05], ["food", "black", -0.08, 0],
  ["space", "black", 0.12, 0], ["space", "photo", 0.08, 0], ["space", "bmov", -0.1, 0],
  ["pet", "bmov", 0.15, 0], ["pet", "reels", 0.1, 0.1], ["pet", "lux", -0.1, 0],
  ["fashion", "lux", 0.1, 0.1], ["fashion", "face", 0.1, 0.05], ["fashion", "char", -0.15, 0],
  ["travel", "vlog", 0.15, 0], ["travel", "film", 0.06, 0.05], ["travel", "info", 0.06, -0.05],
  ["daily", "vlog", 0.06, 0.05], ["daily", "pastel", 0, 0.1], ["bmov", "char", 0.08, -0.05], ["lux", "char", -0.1, 0],
];
// 업로드 약속: need = 한 달에 채울 '올리기' 수(올리기 한 번 = 한 주치 몰아 올리기), mult = 노출 배수, mental = 매달 멘탈
export const PLANS = {
  2: { n: "주 2회", need: 1, mult: 1.0, mental: 0, tire: 0 },
  3: { n: "주 3회", need: 2, mult: 1.15, mental: -1, tire: 1 },
  5: { n: "주 5회", need: 3, mult: 1.3, mental: -3, tire: 2 },
};
// 게시물 종류
export const POSTS = {
  on: { n: "컨셉대로", d: "일관성 +, 노출 그대로" },
  drift: { n: "살짝 벗어난 글", d: "일관성 −4, 가끔 의외의 반응" },
  off: { n: "완전 딴 얘기", d: "일관성 −12, 노출 ×0.6, 멘탈 +3" },
};
// 컨셉 수명: 컨셉을 정하고(비틀고) 지난 달 수
export const STAGES = [{ at: 0, n: "신선", m: 1.0 }, { at: 4, n: "성장", m: 1.2 }, { at: 16, n: "포화", m: 0.95 }, { at: 32, n: "식상", m: 0.72 }];
export const AXES = { topic: TOPICS, tone: TONES, fmt: FMTS, face: FACES };
const OLD_TOPIC = { daily: "daily", fit: "fit", food: "food", space: "space", career: "career", travel: "travel" };

// ───────── 유명인·핫플(인물은 data/chars_insta.json, 묶음 '인별') ─────────
// minF: 이 팔로워부터 연락이 온다. tp: 잘 맞는 주제(빈 배열 = 아무나)
export const CELEBS = {
  s001: { minF: 20000, tp: ["fashion", "daily", "food"], role: "톱 인플루언서" },
  s002: { minF: 60000, tp: [], role: "배우 겸 예능인" },
  s003: { minF: 6000, tp: ["food", "travel", "daily"], role: "스타 셰프" },
  s004: { minF: 3000, tp: ["fashion", "space", "travel", "daily", "pet"], role: "화보 포토그래퍼" },
  s005: { minF: 15000, tp: ["fit", "daily", "pet", "fashion"], role: "숏폼 크리에이터" },
  s006: { minF: 8000, tp: ["travel", "food", "career", "fit"], role: "여행 크리에이터" },
};
// 핫플: cine = 화보 키(배경은 insta_app.js CINE_BG)
export const HOTS = {
  roof: { n: "성숲길 루프톱 카페", tp: ["food", "daily", "fashion", "space"], cine: "in_hot_roof", cost: 6 },
  river: { n: "한강 노을 스팟", tp: ["daily", "fit", "travel", "pet"], cine: "in_hot_river", cost: 2 },
  popup: { n: "성숲길 팝업 거리", tp: ["fashion", "food", "career", "daily"], cine: "in_hot_popup", cost: 5 },
  gallery: { n: "서촌 골목 갤러리", tp: ["space", "career", "fashion", "travel"], cine: "in_hot_gallery", cost: 4 },
};

// ───────── 인별 특이 요소 3개(11-22, f30): 뒷광고 · 계정 정지와 부계정 · 오프라인 팬 모임 ─────────
// 효과 크기는 여기만 고치면 된다(밸런스 손잡이)
export const F30 = {
  // 뒷광고: 브랜드가 '광고' 표시를 빼 달라고 DM. 빼면 단가↑, 대신 life 달 동안 매달 들킬 수 있다
  ad: { askP: 0.15, askF: 2000, mul: 1.6, softMul: 1.25, softRisk: 0.4, walk: 0.35, catchP: 0.035, fBig: 50000, heat: 0.3, life: 18, fineK: 2.5, fineMin: 50, hideCtrv: 0.5, doubtW: 1.5 },
  // 계정 정지: hackRisk(수상한 링크·로그인 알림 무시)와 논란이 높을수록 잦다. 부계정은 본계정의 share 까지 따라 큰다
  ban: { w: 0.3, hackW: 2, ctrvW: 1, minF: 2000, appealDc: 45, okM: 1, ngM: 3, carry: 0.3, newKeep: 0.1, fanPerM: -3 },
  sub: { minF: 1000, share: 0.15, rate: 0.12, base: 10, mental: -1, tired: 0.5 },
  // 팬 모임: 팬심 minFan 이상·팔로워 minF 이상, gap 달에 한 번. 오는 사람 = √팔로워 × k × (팬심/70)² × (1 + 충성 팬 × loyalK)
  meet: { minFan: 70, minF: 3000, gap: 8, k: 0.22, loyalK: 0.04, faceK: 1.15, promise: 1.6, small: { seats: 20, cost: 10 }, big: { seats: 80, cost: 80, ticket: 2, minF: 8000 }, ok: 0.85, mid: 0.5, loyalEng: 0.0004 },
};

// ───────── 상태 ─────────
export function init() {
  return { v: 2, f: 0, posts: 0, reels: 0, eng: 0.06, niche: null, face: false, lv: 1, deals: 0, monthRev: 0, postT: -1, gongT: -99, hist: [], dealsDone: 0,
    cc: null, cons: 50, plan: 3, streak: 0, bestStreak: 0, angry: 0, miss: 0, ccAge: 0, rbT: -99, fan: 40, ctrv: 5, tired: 0,
    feed: [], inbox: null, pile: 0, inbN: 0, dm: [], dmSeq: 0, offers: [], offSeq: 0, reveal: 0, hints: [], insT: -1,
    trend: null, seed: 0, rh: [], mo: null, ev: { seen: {}, t: -99 }, met: {}, hot: [], eraT: -99, brand: null, algoHit: null, fade: 0, scamClick: 0,
    hidAds: [], adHeat: 0, adPend: 0, ban: null, hackRisk: 0, sub: { f: 0, on: false }, meetT: -99, meetN: 0, loyal: 0 };
}
// 특이 요소 칸(예전 저장에도 채운다)
function ensF30(I) {
  if (!Array.isArray(I.hidAds)) I.hidAds = [];
  if (I.adHeat === undefined) I.adHeat = 0;
  if (I.adPend === undefined) I.adPend = 0;
  if (I.ban === undefined) I.ban = null;
  if (I.hackRisk === undefined) I.hackRisk = 0;
  if (!I.sub) I.sub = { f: 0, on: false };
  if (I.meetT === undefined) I.meetT = -99;
  if (I.meetN === undefined) I.meetN = 0;
  if (I.loyal === undefined) I.loyal = 0;
}
export const banned = (s) => !!(s.ins?.ban && s.ins.ban.left > 0);
// 예전 저장 호환: niche → 주제, 나머지는 기본값. 모든 입구에서 부른다(가볍다)
export function ens(s) {
  const I = s.ins; if (!I) return null;
  if ((I.v || 1) < 2) {
    const d = init();
    for (const k of Object.keys(d)) if (I[k] === undefined) I[k] = d[k];
    if (I.niche && !I.cc) I.cc = { topic: OLD_TOPIC[I.niche] || "daily", tone: "film", fmt: "photo", face: I.face ? "face" : "hand" };
    I.plan = 2; I.cons = I.niche ? 55 : 50; I.ccAge = I.niche ? 8 : 0; I.v = 2;
  }
  if (!I.seed) I.seed = hashStr(String(s.rs?.v ?? 0) + (s.me?.name || "") + "ins") || 7;
  if (!I.ev) I.ev = { seen: {}, t: -99 };
  if (!I.met) I.met = {};
  ensF30(I);
  return I;
}
export function lvOf(f) { let i = 0; D.INSTA_LV.forEach((x, k) => { if (f >= x.f) i = k; }); return i + 1; }

// ───────── 숨은 수요·경쟁 ─────────
const h01 = (seed, str) => (hashStr(seed + ":" + str) % 10000) / 10000;
export const ccKey = (cc) => `${cc.topic}.${cc.tone}.${cc.fmt}.${cc.face}`;
// noise=false: 판마다 다른 숨은 값 없이(봇의 '감'·힌트용)
export function market(s, cc, noise = true) {
  const I = s.ins, T = TOPICS[cc.topic], to = TONES[cc.tone], fm = FMTS[cc.fmt], fa = FACES[cc.face];
  if (!T || !to || !fm || !fa) return { d: 1, c: 0.6 };
  let d = T.d + to.d + fm.d + fa.d, c = T.c + to.c + fm.c + fa.c;
  const set = new Set([cc.topic, cc.tone, cc.fmt, cc.face]);
  for (const [a, b, dd, dc] of PAIRS) if (set.has(a) && set.has(b)) { d += dd; c += dc; }
  if (noise && I) { const k = ccKey(cc); d += (h01(I.seed, k + "d") - 0.5) * 0.3; c += (h01(I.seed, k + "c") - 0.5) * 0.3; }
  if (I?.trend && cc.topic === I.trend.topic) { d += 0.15; c += 0.1; } // 유행 주제는 수요도 경쟁도 크다
  return { d: clamp(d, 0.45, 1.8), c: clamp(c, 0, 1) };
}
// 경쟁 → 크는 속도, 수요 → 천장
export const spF = (m) => clamp((1 - 0.75 * m.c) / 0.55, 0.5, 1.6);
export function grade(m) { const v = spF(m) * Math.sqrt(m.d); return v >= 1.3 ? "블루오션" : v >= 1.0 ? "해볼 만함" : v >= 0.8 ? "붐빔" : "레드오션"; }

export function stageOf(I) { let st = STAGES[0], i = 0; STAGES.forEach((x, k) => { if ((I.ccAge || 0) >= x.at) { st = x; i = k; } }); return { ...st, i }; }
// 주제가 내 취미·다른 투잡과 맞음 → 소재 걱정이 준다(품 −1)
export function topicFit(s) {
  const T = TOPICS[s.ins?.cc?.topic]; if (!T) return false;
  return !!((T.hobby && (s.hb?.joined || []).some((h) => T.hobby.includes(h))) || (T.job && s.sj?.active?.includes(T.job)));
}
export function postAp(s) { const I = s.ins, F = FMTS[I?.cc?.fmt] || FMTS.photo; return Math.max(1, F.ap - (topicFit(s) ? 1 : 0)); }
export function postHp(s) { const I = s.ins, F = FMTS[I?.cc?.fmt] || FMTS.photo; return Math.max(1, F.hp - (topicFit(s) ? 2 : 0)); }

// 노출 배수(올리기 한 번)
export const REACH_K = { v: 0.31 }; // 전체 노출 배율(밸런스 손잡이)
export function reach(s) {
  const I = s.ins, cc = I.cc; if (!cc) return 0.5;
  const m = market(s, cc), st = stageOf(I);
  const consF = 0.5 + I.cons / 100;
  const hotF = (I.trend && cc.topic === I.trend.topic ? 1.2 : 1) * (I.trend && cc.fmt === I.trend.fmt ? 1.1 : 1);
  const rhythm = (PLANS[I.plan] || PLANS[3]).mult * (1 + Math.min(0.45, I.streak * 0.03)) * (I.angry > 0 ? 0.5 : 1) * (I.miss ? 0.85 : 1);
  const temp = clamp(0.8 + I.fan / 250 - I.ctrv / 200, 0.55, 1.25);
  const faceF = cc.face === "face" ? clamp(1 + ((s.st.charm || 0) - 30) / 400, 1, 1.15) : FACES[cc.face].g;
  const algoF = (s.era?.algo ? 0.55 : 1) * (I.algoHit && I.algoHit.fmt === cc.fmt && I.algoHit.until > s.t ? 0.5 : 1);
  const langF = clamp(1 + ((s.st.lang || 0) - 40) / 500, 0.95, 1.2);
  return REACH_K.v * consF * st.m * hotF * rhythm * temp * faceF * (topicFit(s) ? 1.1 : 1) * algoF * spF(m) * langF * mod(s, "instaMult", 1) * (SYN.on(s, "insta_hobby") ? 1.2 : 1) * BIG.fullGrow(s);
}
// 예전 이름 호환(다른 파일이 부를 수 있다)
export function grow(s) { ens(s); return reach(s); }
// 협찬비: 팔로워의 제곱근 × 참여율 × 물가
// 브랜드는 컨셉이 분명한 계정에 더 준다(일관성 0 → ×0.55, 50 → ×1, 90 → ×1.36)
export function dealPay(s) { const I = s.ins; return Math.round(Math.max(5, Math.sqrt(I.f) * 0.2) * Math.sqrt(I.eng / 0.06) * clamp(0.55 + (I.cons ?? 50) * 0.009, 0.55, 1.45) * SYN.pi(s) * (1 + (s.fame || 0) / 250)); }
// 포화 곡선(천장은 계정 체질 kx × 컨셉 수요 d)
export const SAT_K = 30000;
export function sat(f, kx = 1) { const K = SAT_K * (kx || 1); return K / (K + Math.max(0, f)); }
function ensureKx(s, r) { const I = s.ins; if (!I.kx) I.kx = clamp(Math.exp(0.6 * r.normal()), 0.5, 3.5); }
const kxOf = (s) => (s.ins.kx || 1) * (s.ins.cc ? Math.pow(market(s, s.ins.cc).d, 1.5) : 1);
// 이벤트로 느는 팔로워: 비율 × 포화, 상한
function fGain(s, pct, cap, base = 0) { const I = s.ins; return Math.round(Math.min(cap, base + I.f * pct / 100 * sat(I.f, kxOf(s)))); }
function fLoss(s, pct) { const I = s.ins; const d = Math.round(I.f * pct / 100 * (0.4 + 0.6 * sat(I.f, kxOf(s)))); I.f = Math.max(0, I.f - d); return d; }
function addF(s, g) { const I = s.ins; I.f = Math.max(0, I.f + g); I.peak = Math.max(I.peak || 0, I.f); return g; }
// 한 달 업로드 수: 약속한 만큼은 온전히, 넘치면 30%
export function needOf(s) { return (PLANS[s.ins.plan] || PLANS[3]).need; }
export function upsThisMonth(s) { const I = s.ins; return I.upT === s.t ? I.upN || 0 : 0; }
export function upFactor(s) { return upsThisMonth(s) < needOf(s) ? 1 : 0.3; }
function countUp(s) { const I = s.ins; if (I.upT !== s.t) { I.upT = s.t; I.upN = 0; } I.upN++; }
const mo = (s) => { const I = s.ins; if (!I.mo || I.mo.t !== s.t) I.mo = { t: s.t, n: 0, g: 0, sv: 0, sh: 0, best: null }; return I.mo; };

// ───────── 컨셉 정하기·약속 ─────────
export function setConcept(s, cc) {
  const I = ens(s); const nc = { ...(I.cc || { topic: "daily", tone: "film", fmt: "photo", face: "hand" }), ...cc };
  for (const [ax, T] of Object.entries(AXES)) if (!T[nc[ax]]) return { ok: false, msg: "없는 컨셉" };
  if (!I.cc) { I.cc = nc; I.cons = 50; I.ccAge = 0; sync(I); return { ok: true, msg: `컨셉 확정: ${ccName(nc)}` }; }
  const ch = Object.keys(AXES).filter((ax) => I.cc[ax] !== nc[ax]); if (!ch.length) return { ok: true, msg: "그대로예요" };
  if (s.t - I.rbT < 3) return { ok: false, msg: `리브랜딩은 석 달에 한 번(${3 - (s.t - I.rbT)}달 뒤)` };
  const lines = []; I.rbT = s.t;
  if (ch.includes("topic")) { const d = fLoss(s, 25); I.cons = 35; I.ccAge = 0; I.fan = clamp(I.fan - 10, 0, 100); I.streak = Math.floor(I.streak / 2); lines.push(`주제를 바꿨다: 팔로워 −${fmt(d)}, 일관성 35`); }
  else { const d = fLoss(s, 4 * ch.length); I.cons = clamp(I.cons - 12 * ch.length, 20, 100); I.ccAge = Math.min(I.ccAge, 5); lines.push(`리브랜딩(${ch.map((a) => ({ tone: "톤", fmt: "포맷", face: "얼굴" })[a]).join("·")}): 팔로워 −${fmt(d)}, 일관성 ${Math.round(I.cons)}, 컨셉이 다시 '성장'으로`); }
  I.cc = nc; sync(I);
  return { ok: true, msg: lines.join(" · "), lines };
}
function sync(I) { I.niche = I.cc ? I.cc.topic : null; I.face = I.cc?.face === "face"; }
export function ccName(cc) { return cc ? `${TOPICS[cc.topic].n} × ${TONES[cc.tone].n} × ${FMTS[cc.fmt].n} · ${FACES[cc.face].n}` : "컨셉 없음"; }
export function setPlan(s, p) {
  const I = ens(s); p = +p; if (!PLANS[p]) return { ok: false, msg: "없는 약속" };
  if (p === I.plan) return { ok: true, msg: "그대로예요" };
  const down = p < I.plan; I.plan = p; if (down) I.streak = Math.floor(I.streak / 2);
  return { ok: true, msg: `업로드 약속 ${PLANS[p].n}${down ? " · 약속을 낮춰 연속 기록이 절반으로" : ""}` };
}
// 예전 함수(봇·시험이 부른다): 주제만 고르면 나머지 축은 기본값
export function setNiche(s, k) {
  const I = ens(s); const t = OLD_TOPIC[k] || (TOPICS[k] ? k : null); if (!t) return { ok: false };
  if (!I.cc) return setConcept(s, { topic: t, tone: "film", fmt: "photo", face: I.face ? "face" : "hand" });
  I.rbT = -99; return setConcept(s, { topic: t });
}
export function setFace(s, v) { const I = ens(s); if (!I.cc) { I.face = !!v; return { ok: true, msg: "" }; } I.cc.face = v ? "face" : "hand"; sync(I); return { ok: true, msg: v ? "얼굴 공개 컨셉: 매력이 조금 거들지만 회사가 알 수 있어요" : "얼굴 없는 컨셉: 조용히" }; }

// ───────── 인사이트: 볼수록 숨은 수요가 드러난다(한 달에 한 번) ─────────
export function viewInsight(s) {
  const I = ens(s); if (!I.cc) return { ok: false, msg: "컨셉부터" };
  if (I.insT === s.t) return { ok: false, msg: "이번 달 인사이트는 이미 봤어요" };
  I.insT = s.t; I.reveal = Math.min(3, (I.reveal || 0) + 1);
  // 다른 조합 하나 힌트(판·달마다 정해진 것)
  const keys = Object.keys(TOPICS), tones = Object.keys(TONES), fmts = Object.keys(FMTS);
  const h = hashStr(I.seed + ":h" + s.t);
  const cc = { topic: keys[h % keys.length], tone: tones[(h >>> 4) % tones.length], fmt: fmts[(h >>> 8) % fmts.length], face: I.cc.face };
  const m = market(s, cc); I.hints = [{ cc, g: grade(m), d: +m.d.toFixed(2), c: +m.c.toFixed(2), t: s.t }, ...(I.hints || [])].slice(0, 4);
  return { ok: true, msg: `인사이트를 꼼꼼히 봤다 · 내 컨셉 정보 ${I.reveal}/3`, lines: [] };
}

// ───────── 댓글함(달마다 30초 판) ─────────
// 답 종류: warm 다정 · fun 유머 · explain 해명/답변 · firm 단호 · pin 고정 · hide 숨김 · block 차단 · dm DM 보기 · skip 무시
export const REPLY = { warm: "다정하게", fun: "유머로", explain: "해명·답변", firm: "단호하게", pin: "고정", hide: "숨김", block: "차단", dm: "DM 보기", skip: "무시" };
// 댓글 종류마다 고를 수 있는 것, 효과 [팬심, 논란, 참여(‱)]
export const CM = {
  praise: { n: "칭찬", opts: ["warm", "fun", "pin", "hide"], e: { warm: [3, 0, 3], fun: [2, 0, 3], pin: [4, 0, 2], hide: [-3, 0, -1], block: [-5, 2, -2], skip: [0, 0, -1], explain: [1, 0, 1], firm: [-2, 0, 0], dm: [1, 0, 0] } },
  ask: { n: "질문", opts: ["warm", "explain", "pin", "skip"], e: { warm: [3, 0, 3], explain: [2, 0, 5], pin: [3, 0, 4], fun: [1, 0, 2], skip: [-1, 0, -2], hide: [-2, 0, -1], block: [-4, 2, -2], firm: [-2, 1, 0], dm: [1, 0, 1] } },
  doubt: { n: "뒷광고 의심", opts: ["explain", "fun", "hide", "block"], e: { explain: [2, -4, 2], fun: [1, -2, 2], warm: [0, -1, 1], firm: [-1, 4, 0], hide: [-1, 3, 0], block: [-2, 5, -1], skip: [0, 2, 0], pin: [-2, 3, 0], dm: [0, 0, 0] }, risky: "fun" },
  hate: { n: "악플", opts: ["fun", "firm", "hide", "block"], e: { hide: [1, -3, 0], block: [0, -2, 0], fun: [2, -2, 2], firm: [-1, 5, 1], explain: [-1, 2, 0], warm: [0, -1, 0], skip: [-1, 3, 0], pin: [-5, 8, 1], dm: [0, 1, 0] }, risky: "fun", bad: { firm: "박제됐다" } },
  spam: { n: "스팸", opts: ["hide", "block", "skip"], e: { block: [1, 0, 1], hide: [1, 0, 0], skip: [-1, 0, -2], warm: [-1, 0, -1], fun: [-1, 0, -1], explain: [-1, 0, -1], firm: [0, 0, 0], pin: [-4, 1, -2], dm: [-1, 0, 0] } },
  deal: { n: "협찬 문의", opts: ["dm", "warm", "skip"], e: { dm: [0, 0, 1], warm: [1, 0, 0], skip: [0, 0, 0], block: [0, 0, 0], hide: [0, 0, 0], fun: [0, 0, 0], explain: [0, 0, 0], firm: [0, 0, 0], pin: [-2, 1, 0] } },
  cross: { n: "선 넘는 댓글", opts: ["firm", "fun", "hide", "block"], e: { block: [2, -3, 0], hide: [1, -2, 0], firm: [2, 1, 1], fun: [0, 2, 1], warm: [-2, 2, 0], explain: [-1, 1, 0], skip: [-2, 4, 0], pin: [-6, 9, 0], dm: [-1, 1, 0] }, risky: "fun" },
};
export const BEST = { praise: ["pin", "warm"], ask: ["explain", "pin", "warm"], doubt: ["explain"], hate: ["hide", "block", "fun"], spam: ["block", "hide"], deal: ["dm"], cross: ["block", "hide", "firm"] };
const HANDLE = ["coffee_lover", "주말엔산책", "dailyjjang", "익명123", "follow4follow", "brand_official", "mint_choco", "새벽감성", "운동하는곰", "집순이1호", "카메라든고양이", "노을사냥꾼", "퇴근길버스", "lunch_box", "오늘도야근", "pixel_cat", "밤산책러", "고구마라떼", "월요병환자", "누군가의팬"];
const CM_TX = {
  praise: ["여기 어디예요?? 저장했어요 😍", "피드 색감 미쳤다… 정주행 중", "이 계정 보고 퇴근길 버팀", "매번 올라오는 날만 기다려요", "볼 때마다 기분 좋아져요!", "와 이번 거 진짜 레전드"],
  ask: ["이거 어디서 사셨어요?", "보정은 어떤 걸로 해요?", "초보도 따라 할 수 있을까요?", "다음엔 뭐 올려 주세요?", "가격대가 어떻게 돼요?", "주말에 가도 사람 많아요?"],
  doubt: ["광고 아님? ㅋㅋ 요즘 다 뒷광고던데", "협찬 받고 좋다고 하는 거죠?", "이거 표기 안 하면 불법 아님?", "솔직히 돈 받았죠?"],
  hate: ["이게 왜 인기 있음?", "얼굴 보고 들어왔다가 실망", "이런 거 누가 봄 ㅋ", "컨셉 너무 억지 아님?", "어디서 본 것 같은데 따라 한 듯", "지루함. 언팔함"],
  spam: ["맞팔해요~ 팔로워 1만 명 늘려 드림", "부업으로 월 300! 프로필 링크 확인", "님 사진 도용 신고됨 → 링크 확인", "무료 이벤트 당첨! DM 주세요"],
  deal: ["협찬 제안 드려요! DM 확인 부탁드립니다", "브랜드 담당자입니다. 협업 문의 DM 드렸어요"],
  cross: ["어디 살아요? 동네 보이던데", "살 좀 찐 듯?", "회사 어디 다녀요? 찾아가 봄", "결혼은 했어요? 나이가?"],
};
function makeInbox(s, r, t) {
  const I = s.ins, f = I.f;
  const w = [["praise", 3], ["ask", 2], ["doubt", (I.dealsDone ? 1.2 : 0.4) + ((I.hidAds || []).length ? F30.ad.doubtW : 0)], ["hate", 0.8 + I.ctrv / 20], ["spam", 0.8 + Math.min(2, f / 15000)], ["deal", f >= 1000 ? 0.6 : 0], ["cross", 0.4 + (I.cc?.face === "face" ? 0.8 : 0)]];
  const n = 6 + (f >= 5000 ? 1 : 0) + (f >= 30000 ? 1 : 0);
  const list = []; const used = new Set();
  for (let i = 0; i < n; i++) {
    const k = r.weighted(w); let tx = r.pick(CM_TX[k]), g = 0; while (used.has(tx) && g++ < 6) tx = r.pick(CM_TX[k]); used.add(tx);
    list.push({ id: i, k, nm: k === "deal" ? "brand_official" : k === "spam" ? r.pick(["follow4follow", "money_up_77", "event_win"]) : r.pick(HANDLE), tx });
  }
  return { t, list, done: false, res: null, total: 6 + r.int(4, 30) + Math.round(Math.sqrt(f) / 6) };
}
// 자동 답(봇·시간 초과·버튼 없이 할 때): 말빨·경험이 높을수록 정답에 가깝다
export function autoPicks(s, r, smart = false) {
  const I = s.ins, L = I.inbox?.list || [], p = smart ? 0.85 : clamp(0.45 + (s.st.talk || 0) / 200 + (I.inbN || 0) * 0.02, 0.45, 0.9), out = {};
  let pinned = false;
  for (const c of L) { let a = r.chance(p) ? BEST[c.k][0] : r.pick(CM[c.k].opts); if (a === "pin") { if (pinned) a = BEST[c.k][1] || "warm"; pinned = true; } out[c.id] = a; }
  return out;
}
function resolveInbox(s, r, picks) {
  const I = s.ins, B = I.inbox; let fan = 0, ctrv = 0, eng = 0, pinned = 0; const res = [], lines = [];
  for (const c of B.list) {
    let a = picks?.[c.id] || "skip"; if (!CM[c.k].e[a]) a = "skip";
    if (a === "pin" && pinned++) a = "warm"; // 고정은 하나만
    let [df, dc, de] = CM[c.k].e[a]; let note = "";
    if (CM[c.k].risky === a) { const ok = r.chance(clamp(0.35 + (s.st.talk || 0) / 150, 0.35, 0.85)); if (!ok) { df = -1; dc = Math.abs(dc) + 3; note = "유머가 안 먹혔다"; } else note = "센스 있는 답글 박수"; }
    if (CM[c.k].bad?.[a] && dc > 0) note = CM[c.k].bad[a];
    if (c.k === "deal" && a === "dm") { addOffer(s, r, true); note = "협찬함에 제안 +1"; }
    if (a === "skip" && (c.k === "hate" || c.k === "cross")) note = "방치했더니 번졌다";
    if (a === "pin" && (c.k === "hate" || c.k === "cross")) note = "악플을 고정해 박제됐다";
    const lie = c.k === "doubt" && a === "explain" && (I.hidAds || []).length > 0; // 숨긴 광고가 있는데 "광고 아니에요" 해명 = 거짓말
    if (lie) { I.adHeat = (I.adHeat || 0) + 1; note = "숨긴 광고가 있는데 해명했다(들킬 위험 +)"; }
    fan += df; ctrv += dc; eng += de;
    const failed = note === "유머가 안 먹혔다", good = failed ? -1 : lie ? 0 : BEST[c.k].includes(a) || (CM[c.k].risky === a && note === "센스 있는 답글 박수") ? 1 : df - dc > 0 ? 0 : -1;
    res.push({ id: c.id, a, good, note });
  }
  fan = Math.round(fan * 0.6); ctrv = Math.round(ctrv * 0.7); // 한 판의 무게(밸런스 11-22)
  I.fan = clamp(I.fan + fan, 0, 100); I.ctrv = clamp(I.ctrv + ctrv, 0, 100); I.eng = clamp(I.eng + eng / 1000, 0.02, 0.16); I.pile = 0; I.inbN = (I.inbN || 0) + 1;
  B.done = true; B.res = res; B.sum = { fan, ctrv, eng };
  const good = res.filter((x) => x.good > 0).length;
  lines.push(`댓글 ${res.length}개 중 잘 고른 것 ${good}개`, `팬심 ${fan >= 0 ? "+" : ""}${fan}`, `논란 ${ctrv >= 0 ? "+" : ""}${ctrv}`);
  if (res.some((x) => x.note === "박제됐다" || x.note === "악플을 고정해 박제됐다")) lines.push("박제 주의!");
  return lines;
}

// ───────── 협찬함 ─────────
const BRANDS = [
  ["비건 스킨케어 브랜드", "fashion"], ["홈트 밴드 스타트업", "fit"], ["동네 로스터리", "food"], ["가구 편집숍", "space"], ["온라인 강의 앱", "career"], ["캠핑 장비 브랜드", "travel"],
  ["펫푸드 브랜드", "pet"], ["디자이너 의류 브랜드", "fashion"], ["밀키트 회사", "food"], ["여행 가방 브랜드", "travel"], ["단백질 음료", "fit"], ["조명 가게", "space"], ["다이어리 문구점", "daily"],
  ["향초 공방", "daily"], ["러닝화 편집숍", "fit"], ["노트북 거치대 회사", "career"], ["고양이 모래 브랜드", "pet"], ["호텔 뷔페", "food"], ["대출 비교 앱", "any_bad"], ["다이어트 보조제", "any_bad"],
];
function addOffer(s, r, fromCm = false) {
  const I = s.ins; if ((I.offers || []).length >= 4) return null;
  const mine = I.cc?.topic, fitP = 0.5 + (I.cons - 50) / 200 + (fromCm ? 0.1 : 0);
  const cands = r.chance(fitP) ? BRANDS.filter((b) => b[1] === mine) : BRANDS.filter((b) => b[1] !== mine);
  const b = r.pick(cands.length ? cands : BRANDS);
  const fit = b[1] === mine, mul = fit ? 1.3 : b[1] === "any_bad" ? 1.1 : 0.75;
  const o = { id: ++I.offSeq, nm: b[0], cat: b[1], fit, mul, t: s.t };
  I.offers.push(o); I.deals = I.offers.length; return o;
}
// 이야기 보강(ins_deal 효과)이 I.deals 숫자만 바꿨을 때 목록을 맞춘다
function syncOffers(s, r) {
  const I = s.ins; I.offers = (I.offers || []).filter((o) => s.t - o.t <= 4);
  while ((I.deals || 0) > I.offers.length && I.offers.length < 4) addOffer(s, r);
  if ((I.deals || 0) < I.offers.length && I.dealsSyncT !== s.t) I.offers = I.offers.slice(0, Math.max(0, I.deals || 0));
  I.deals = I.offers.length;
}
export function offerPay(s, o) { return Math.round(dealPay(s) * (o?.mul || 1) * (s.ins.cc?.tone === "lux" ? 1.1 : 1)); }

// ───────── DM ─────────
// k: fan 팬 고민 · deal 진짜 협찬 · scam 사기 협찬 · revise 무리한 수정 요구 · celeb 유명인 연락
const DM_FAN = ["이직 준비 중인데 매일 피드 보면서 버텨요. 저도 할 수 있을까요?", "요즘 너무 지쳐서요… 꾸준히 하는 비결이 있어요?", "님 계정 보고 저도 시작했어요! 첫 게시물 봐 주실 수 있나요?", "혹시 처음에 팔로워 안 늘 때 어떻게 버티셨어요?"];
const DM_SCAM = [
  ["글로벌 뷰티 브랜드 파트너십", "협찬 확정입니다! 진행을 위해 보증금 30만 원 선입금 부탁드려요. 제품과 함께 돌려드립니다."],
  ["계정 인증 센터", "회원님 계정이 신고되었습니다. 24시간 안에 아래 링크로 로그인해 인증 코드를 입력하세요."],
  ["해외 앰배서더 모집", "앰배서더 선정! 전용 링크에서 카드 정보로 본인 확인만 하시면 됩니다."],
];
const DM_DEAL = ["안녕하세요, 브랜드 마케팅 담당자입니다. 계약서와 광고 표기 가이드 먼저 보내 드릴게요. 단가는 협의 가능합니다.", "피드 톤이 저희 제품이랑 잘 맞아서 연락드렸어요. 제품 제공 + 원고료, 계약서 드립니다."];
function addDm(s, r, k, extra = {}) {
  const I = s.ins; if ((I.dm || []).filter((d) => !d.done).length >= 4) return null;
  const id = ++I.dmSeq; let d;
  if (k === "fan") d = { k, from: r.pick(HANDLE), tx: r.pick(DM_FAN), ch: ["진심으로 길게 답한다", "고맙다고 짧게 답한다", "읽고 넘긴다"] };
  else if (k === "scam") { const [nm, tx] = r.pick(DM_SCAM); d = { k, from: nm, tx, ch: ["링크·입금 요청대로 한다", "공식 채널로 확인하고 신고한다", "무시한다"] }; }
  else if (k === "deal") { const b = r.pick(BRANDS.filter((x) => x[1] !== "any_bad")); d = { k, from: b[0], cat: b[1], tx: r.pick(DM_DEAL), ch: ["조건을 받아 본다(협찬함에 추가)", "정중히 거절한다"] }; }
  else if (k === "revise") d = { k, from: "협찬 브랜드 담당자", tx: "올려 주신 게시물이요, 제품을 더 크게, 문구는 저희 카피로 바꿔 주시고 컨셉 색감은 빼 주세요. 오늘 안에요!", ch: ["요구대로 다 고친다", "계약서 범위를 짚으며 조율한다", "컨셉은 못 바꾼다고 거절한다"] };
  else if (k === "hidead") { const o = (I.offers || []).find((x) => x.id === extra.oid); if (!o) return null; o.asked = 1; d = { k, oid: o.id, from: o.nm, tx: `이번 게시물은 '광고' 표시 없이 자연스럽게 가 주실 수 있을까요? 그러면 단가를 ${Math.round((F30.ad.mul - 1) * 100)}% 더 드릴게요. 다들 그렇게 해요 ㅎㅎ`, ch: [`표시를 뺀다(단가 +${Math.round((F30.ad.mul - 1) * 100)}%)`, "'광고' 표시는 꼭 넣는다고 답한다", `'제품 제공'만 작게 적는다(단가 +${Math.round((F30.ad.softMul - 1) * 100)}%)`] }; }
  else if (k === "celeb") { const c = CHAR[extra.who]; d = { k, who: extra.who, from: c?.name || "유명인", tx: extra.tx, ch: ["좋아요, 같이 찍어요!", "다음 기회에요"] }; }
  if (!d) return null;
  d.id = id; d.t = s.t; d.done = false; I.dm.push(d); return d;
}
const CELEB_TX = {
  s001: "피드 계속 보고 있었어요 :) 다음 달 성숲길에서 같이 촬영할래요? 제 팔로워들도 좋아할 것 같아요.",
  s002: "안녕하세요, 예능 촬영 팀 통해 계정 봤어요. 제 브이로그에 잠깐 출연해 주실래요? 부담 없이요!",
  s003: "셰프입니다. 제 가게 신메뉴를 계정 톤으로 담아 주실 분을 찾고 있었어요. 주방 구경 오실래요?",
  s004: "사진 찍는 사람이에요. 피드 색감이 좋아서요. 화보 테스트 촬영 같이 해 볼래요? 비용은 없어요.",
  s005: "숏폼 챌린지 같이 하실래요?? 제 쪽에서 먼저 올릴게요 ㅎㅎ",
  s006: "여행 채널 하는 사람입니다. 다음 여행 편에 '현지 친구'로 같이 나와 주실래요?",
};
export function dmAnswer(s, r, id, i) {
  const I = ens(s); const d = (I.dm || []).find((x) => x.id === +id && !x.done); if (!d) return { ok: false, msg: "없는 DM" };
  d.done = true; d.pick = i; const lines = []; let msg = "";
  if (d.k === "fan") {
    if (i === 0) { s.hp = clamp(s.hp - 2, 0, s.hpMax); I.fan = clamp(I.fan + 4, 0, 100); I.loyal = (I.loyal || 0) + 1; lines.push("팬심 +4", "충성 팬 +1", "스태미너 −2"); msg = "답장을 길게 썼다. 다음 날 그 사람이 내 글을 저장해 두었다고 했다."; }
    else if (i === 1) { I.fan = clamp(I.fan + 1, 0, 100); lines.push("팬심 +1"); msg = "\"고마워요! 힘내요\" 하트가 돌아왔다."; }
    else { I.fan = clamp(I.fan - 1, 0, 100); lines.push("팬심 −1"); msg = "읽음 표시만 남았다."; }
  } else if (d.k === "scam") {
    if (i === 0) {
      I.scamClick = (I.scamClick || 0) + 1;
      if (/입금/.test(d.tx)) { const c = Math.round(30 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "인별 비용", c); lines.push(`사기: −${won(c)}`); msg = "보증금을 보내자 계정이 사라졌다. 사기였다."; }
      else { const lf = fLoss(s, 6); I.cons = clamp(I.cons - 6, 0, 100); I.hackRisk = (I.hackRisk || 0) + 1; lines.push(`계정 탈취 시도: 팔로워 −${fmt(lf)}`, "일관성 −6"); msg = "로그인하자마자 이상한 광고 글이 내 계정에 올라갔다. 한밤중에 비밀번호를 바꿨다."; }
    } else if (i === 1) { I.fan = clamp(I.fan + 1, 0, 100); lines.push("팬심 +1"); msg = "공식 채널에 물어보니 그런 제안은 없다고 했다. 신고 완료. 스토리에 사기 주의를 올렸더니 고맙다는 DM이 쏟아졌다."; }
    else msg = "조용히 삭제했다.";
  } else if (d.k === "deal") {
    if (i === 0) { const mine = I.cc?.topic; const fit = d.cat === mine; if ((I.offers || []).length < 4) { I.offers.push({ id: ++I.offSeq, nm: d.from, cat: d.cat, fit, mul: fit ? 1.35 : 1.05, t: s.t }); I.deals = I.offers.length; lines.push(`협찬함 +1(${fit ? "컨셉과 맞음" : "컨셉과 안 맞음"})`); } msg = "계약서가 메일로 왔다. 광고 표기 조항도 꼼꼼했다."; }
    else msg = "정중히 거절했다.";
  } else if (d.k === "revise") {
    if (i === 0) { I.cons = clamp(I.cons - 6, 0, 100); const c = Math.round(dealPay(s) * 0.2); s.cash += c; addMoney(s, "inc", "인별 수익", c); I.monthRev += c; lines.push("일관성 −6", `추가 원고료 +${won(c)}`); msg = "제품이 화면 반을 차지했다. 내 피드 같지 않다."; }
    else if (i === 1) { const ok = r.chance(clamp(0.35 + (s.st.talk || 0) / 140, 0.35, 0.9)); if (ok) { I.fan = clamp(I.fan + 1, 0, 100); lines.push("조율 성공", "팬심 +1"); msg = "\"아, 계약서에 그렇게 돼 있었네요.\" 색감은 그대로 두기로 했다."; } else { I.cons = clamp(I.cons - 3, 0, 100); lines.push("조율 실패", "일관성 −3"); msg = "반쯤 고치는 걸로 끝났다."; } }
    else { I.cons = clamp(I.cons + 2, 0, 100); I.offers = (I.offers || []).slice(1); I.deals = I.offers.length; lines.push("일관성 +2", "협찬 하나가 취소됐다"); msg = "\"그럼 이번 건은 없던 걸로 하죠.\" 아깝지만 피드는 지켰다."; }
  } else if (d.k === "hidead") {
    const A = F30.ad, o = (I.offers || []).find((x) => x.id === d.oid);
    if (!o) msg = "그 제안은 이미 사라졌다.";
    else if (i === 0) { o.hid = 1; o.mul = +(o.mul * A.mul).toFixed(3); lines.push(`협찬함: ${o.nm} · 광고 표시 없이(단가 ×${A.mul})`); msg = "\"감사합니다! 그럼 자연스럽게요 :)\" 답장이 1초 만에 왔다. 마음 한쪽이 찜찜하다."; }
    else if (i === 1) { if (r.chance(A.walk)) { I.offers = I.offers.filter((x) => x !== o); I.deals = I.offers.length; I.dealsSyncT = s.t; lines.push("협찬 하나가 취소됐다"); msg = "\"아… 그럼 이번엔 어렵겠네요.\" 읽씹. 그래도 발 뻗고 잔다."; } else { lines.push("협찬은 그대로"); msg = "\"네, 그럼 표시해 주세요.\" 생각보다 쉽게 끝났다."; } }
    else { o.hid = 2; o.mul = +(o.mul * A.softMul).toFixed(3); lines.push(`협찬함: ${o.nm} · '제품 제공'만 작게(단가 ×${A.softMul})`); msg = "캡션 맨 끝, 해시태그 사이에 작게. 이 정도면 괜찮겠지…?"; }
  } else if (d.k === "celeb") {
    const who = d.who; ensureRel(s, who); if (!s.cast.includes(who)) s.cast.push(who); I.met[who] = s.t;
    if (i === 0) { const sc = collabScene(s, r, who); if (s.pending) s.sceneQ.unshift(sc); else openScene(s, sc); return { ok: true, lines, msg: "약속을 잡았다." }; }
    addAff(s, who, 2); lines.push(`${CHAR[who]?.name || ""} 호감 +2`); msg = "\"그럼 다음에 꼭이요!\"";
  }
  return { ok: true, lines, msg };
}

// ───────── 행동 ─────────
export function can(s, id) {
  const I = ens(s);
  if (!I.cc) return "인별 앱에서 컨셉부터 정하세요";
  if (banned(s)) return `계정 정지 중이에요(${I.ban.left}달 남음)`;
  if (id === "in_deal" && !(I.offers || []).length && !(I.deals > 0)) return "협찬함이 비어 있어요";
  if (id === "in_engage") { if (!I.inbox || I.inbox.t !== s.t) return "아직 쌓인 댓글이 없어요(다음 달부터)"; if (I.inbox.done) return "이번 달 댓글함은 정리했어요"; }
  if (id === "in_gong" && I.f < 10000) return "팔로워 1만부터";
  if (id === "in_gong" && s.t - I.gongT < 3) return "공동구매는 3달에 한 번";
  return null;
}
function feedPush(s, k, g, hit, fmtK) {
  const I = s.ins, cc = I.cc, pal = TONES[cc.tone].col;
  const col = k === "on" ? pal[I.posts % pal.length] : k === "drift" ? pal[(I.posts + 1) % pal.length] + "aa" : k === "ad" ? "#ffd166" : "#4a90e2";
  I.feed.unshift({ k, col, ic: k === "ad" ? "AD" : TOPICS[cc.topic].ic, fmt: fmtK || cc.fmt, g, hit: !!hit, t: s.t }); I.feed = I.feed.slice(0, 12);
}
export function act(s, r, id, arg, boost = 1) {
  const I = ens(s), lines = [];
  if (id === "in_post" || id === "in_reel") {
    ensureKx(s, r);
    const kind = id === "in_reel" ? "drift" : POSTS[arg] ? arg : "on";
    const fk = id === "in_reel" ? "reels" : I.cc.fmt, F = FMTS[fk];
    const uf = upFactor(s); countUp(s); I.postT = s.t;
    if (fk === "reels" || fk === "vlog") I.reels++; else I.posts++;
    const kindM = kind === "off" ? 0.6 : 1;
    let g = (25 + I.f * 0.012 * sat(I.f, kxOf(s))) * reach(s) * boost * F.g * kindM * uf * Math.exp(F.vol * r.normal() - F.vol * F.vol / 2);
    let hit = false;
    if (kind === "drift" && r.chance(0.18)) { g *= 1.8; hit = true; lines.push("살짝 벗어난 글에 의외의 반응!"); }
    const vp = 0.025 * mod(s, "instaViral", 1) * (1 + (s.st.sense || 0) / 150) * (fk === "reels" || fk === "vlog" ? 1.6 : 1) * (I.cons >= 70 ? 1.3 : 1) * uf;
    if (r.chance(vp)) { g += 1500 + I.f * 0.12 * sat(I.f, kxOf(s)); I.kx = Math.min(3.5, I.kx * 1.02); hit = true; lines.push("터졌다! 탐색 탭에 떴다"); }
    g = Math.round(g); addF(s, g);
    // 일관성: 감각은 '컨셉대로'의 완성도에만
    const c0 = I.cons;
    if (kind === "on") I.cons = clamp(I.cons + (2.5 + (s.st.sense || 0) / 40) * (1 - I.cons / 130), 0, 100);
    else if (kind === "drift") { I.cons = clamp(I.cons - 4, 0, 100); s.mental = clamp(s.mental + 1, 0, 100); }
    else { I.cons = clamp(I.cons - 12, 0, 100); s.mental = clamp(s.mental + 3, 0, 100); }
    if (id === "in_reel" && I.cc.fmt !== "reels") I.cons = clamp(I.cons - 2, 0, 100);
    lines.unshift(`팔로워 +${fmt(g)} → ${fmt(I.f)}`, `일관성 ${Math.round(I.cons)}(${I.cons >= c0 ? "+" : "−"}${Math.abs(Math.round(I.cons - c0))})`);
    if (uf < 1) lines.push(`약속보다 더 올림: 효과 ${Math.round(uf * 100)}%`);
    else { const n = upsThisMonth(s), need = needOf(s); lines.push(n >= need ? `이번 달 약속 채움(${n}/${need})` : `이번 달 약속 ${n}/${need}`); }
    const M = mo(s); M.n++; M.g += g; M.sv += Math.round(g * (F.save ? 0.5 : 0.25) * (I.cons / 60)); M.sh += Math.round(g * (fk === "reels" ? 0.3 : 0.12)); if (!M.best || g > M.best.g) M.best = { g, kind, fk };
    if (F.save) I.eng = clamp(I.eng + 0.002, 0.02, 0.16);
    if (F.fan) I.fan = clamp(I.fan + 1, 0, 100);
    feedPush(s, kind, g, hit, fk);
    if (FACES[I.cc.face].eye && company(s)) lines.push(...applyEff(s, { eye: fk === "reels" || fk === "vlog" ? 1.5 : 0.7 }));
    if (SYN.on(s, "insta_pr")) { for (const rm of s.pr.rooms) if (rm.status === "open") rm.buzz = Math.min(100, (rm.buzz || 0) + 2 + I.f / 4000); lines.push("파티룸 입소문 +"); }
    gainStat(s, fk === "reels" || fk === "vlog" ? "mkt" : "sense", 0.3);
    const msg = kind === "off" ? r.pick(["오늘은 그냥 먹은 라면을 올렸다. 마음은 편하다.", "컨셉이고 뭐고, 오늘은 내 얘기."]) : kind === "drift" ? r.pick(["평소랑 살짝 다른 걸 올려 봤다.", "늘 하던 것에서 반 발짝 옆으로."]) : r.pick(["필터 고르는 데 20분, 캡션 쓰는 데 40분.", "자연광 오후 4시. 오늘 사진은 건졌다.", "피드 9칸이 한 장처럼 이어졌다.", "\"저장각\" 한 장을 만들었다."]);
    return { lines, msg };
  }
  if (id === "in_engage") {
    if (!I.inbox || I.inbox.t !== s.t || I.inbox.done) return { lines: ["정리할 댓글이 없어요"], msg: "" };
    const picks = arg && typeof arg === "object" ? arg : autoPicks(s, r);
    lines.push(...resolveInbox(s, r, picks)); gainStat(s, "talk", 0.3);
    const g = Math.round(I.f * 0.004 * sat(I.f, kxOf(s))) + 3; addF(s, g); lines.push(`팔로워 +${g}`);
    return { lines, msg: "댓글 하나하나에 답을 골랐다. 손가락이 아프다." };
  }
  if (id === "in_deal") {
    syncOffers(s, r);
    const [oid, how] = String(arg ?? "").split(":");
    const o = I.offers.find((x) => String(x.id) === oid) || I.offers.find((x) => x.fit) || I.offers[0]; if (!o) return { lines: ["협찬함이 비어 있어요"], msg: "" };
    I.offers = I.offers.filter((x) => x !== o); I.deals = I.offers.length; I.dealsSyncT = s.t; I.dealsDone++;
    // 뒷광고 약속을 했어도 올릴 때 '표시하고 올리기'(how=lab)를 고르면 원래 단가로 돌아간다
    let hid = o.hid || 0, mul = o.mul;
    if (hid && how === "lab") { mul = o.mul / (hid === 1 ? F30.ad.mul : F30.ad.softMul); hid = 0; lines.push("결국 '광고' 표시를 넣었다(원래 단가)"); }
    const pay = Math.round(offerPay(s, { ...o, mul }) * SJ.ramp(s, "insta") * SJ.skillRamp(s, "insta"));
    s.cash += pay; addMoney(s, "inc", "인별 수익", pay); I.monthRev += pay; lines.push(`협찬비 +${won(pay)}`);
    if (o.fit) { I.cons = clamp(I.cons - 1, 0, 100); I.eng = clamp(I.eng - 0.002, 0.02, 0.16); lines.push("컨셉과 맞는 협찬: 일관성 거의 그대로"); }
    else { const k = hid ? F30.ad.hideCtrv : 1; I.cons = clamp(I.cons - 12, 0, 100); I.fan = clamp(I.fan - Math.round(3 * k), 0, 100); I.ctrv = clamp(I.ctrv + Math.round((o.cat === "any_bad" ? 8 : 3) * k), 0, 100); I.eng = clamp(I.eng - 0.005, 0.02, 0.16); lines.push(`컨셉과 안 맞는 협찬: 일관성 −12, 팬심 −${Math.round(3 * k)}`, hid ? "광고 표시가 없어 '광고충' 소리는 덜 들었다" : "\"광고충 됐네\" 댓글"); }
    if (hid) { I.hidAds.push({ t: s.t, p: F30.ad.catchP * (hid === 2 ? F30.ad.softRisk : 1), pay, nm: o.nm }); lines.push(`숨긴 광고 ${I.hidAds.length}건 · ${F30.ad.life}달 동안 들킬 수 있어요`); }
    countUp(s); I.postT = s.t; feedPush(s, hid ? "on" : "ad", 0, false); if (hid) I.feed[0].hid = 1; // 광고도 업로드 1회. 숨긴 광고는 피드에서 일반 글처럼 보인다
    if (hid) return { lines, msg: r.pick(["'#광고'가 없는 광고. 댓글에 \"어디 거예요?\"가 달릴 때마다 뜨끔하다.", "피드엔 평소 글처럼 섞였다. 통장엔 평소보다 두둑한 단가가 찍혔다."]) };
    return { lines, msg: o.fit ? r.pick(["내 피드 톤 그대로 담았다. 광고인데 저장이 많다.", "\"#광고\" 표시는 꼭 붙였다."]) : r.pick(["피드에 어울리지 않는 제품. 돈은 좋다.", "브랜드 담당자와 수정만 세 번."]) };
  }
  if (id === "in_gong") {
    I.gongT = s.t; I.gongN = (I.gongN || 0) + 1;
    const rev = Math.round(Math.sqrt(I.f) * 1.2 * (I.eng / 0.06) * clamp(0.7 + I.fan / 150, 0.7, 1.4) * clamp(0.55 + I.cons * 0.009, 0.55, 1.45) * r.range(0.6, 1.4) * (s.era.winter ? 0.6 : 1));
    s.cash += rev; addMoney(s, "inc", "인별 수익", rev); I.monthRev += rev; I.eng = clamp(I.eng - 0.01, 0.02, 0.16); I.cons = clamp(I.cons - 3, 0, 100);
    return { lines: [`공구 수익 +${won(rev)}`, "참여율 −1%p", "일관성 −3", "멘탈 −3"], msg: "배송 문의 DM 400개. 택배사 전화번호를 외웠다." };
  }
  return null;
}

// ───────── 장면(onChoose "ig_ev": 선택지의 ig 효과를 여기서 적용) ─────────
// ig 효과 키: cons fan ctrv(더하기) · fp(팔로워 %, 늘 때 포화) · fcap · fadd · eng(%p) · cash(인별 수익) · cost · plan · face · twist · switch · keep · algo · tired · brand · meet(인물 id) · aff · cine(뒤에 화보 장면) · offer · era
function applyIg(s, r, ig, sc, out) {
  const I = s.ins; if (!ig) return;
  { const b = {}; for (const k of ["eye", "hp", "mental", "ap"]) if (ig[k]) b[k] = ig[k]; if (Object.keys(b).length) out.push(...applyEff(s, b)); }
  if (ig.cons) { I.cons = clamp(I.cons + ig.cons, 0, 100); out.push(`일관성 ${ig.cons > 0 ? "+" : "−"}${Math.abs(ig.cons)}`); }
  if (ig.fan) { I.fan = clamp(I.fan + ig.fan, 0, 100); out.push(`팬심 ${ig.fan > 0 ? "+" : "−"}${Math.abs(ig.fan)}`); }
  if (ig.ctrv) { I.ctrv = clamp(I.ctrv + ig.ctrv, 0, 100); out.push(`논란 ${ig.ctrv > 0 ? "+" : "−"}${Math.abs(ig.ctrv)}`); }
  if (ig.fp > 0) { const g = addF(s, fGain(s, ig.fp, ig.fcap || 4000, ig.fadd || 0)); out.push(`팔로워 +${fmt(g)} → ${fmt(I.f)}`); }
  if (ig.fp < 0) { const d = fLoss(s, -ig.fp); out.push(`팔로워 −${fmt(d)} → ${fmt(I.f)}`); }
  if (ig.eng) { I.eng = clamp(I.eng + ig.eng / 100, 0.02, 0.16); out.push(`참여율 ${ig.eng > 0 ? "+" : "−"}${Math.abs(ig.eng)}%p`); }
  if (ig.cash) { const v = Math.round(ig.cash); s.cash += v; addMoney(s, "inc", "인별 수익", v); I.monthRev += v; out.push(`인별 수익 +${won(v)}`); }
  if (ig.cost) { const v = Math.round(ig.cost); s.cash -= v; addMoney(s, "exp", "인별 비용", v); out.push(`비용 −${won(v)}`); }
  if (ig.plan) { const p = ig.plan; if (p !== I.plan) { I.plan = p; out.push(`업로드 약속 ${PLANS[p].n}`); } }
  if (ig.streak0) { I.streak = 0; out.push("연속 기록이 끊겼다"); }
  if (ig.streakHalf) { I.streak = Math.floor(I.streak / 2); out.push(`연속 기록 ${I.streak}달로`); }
  if (ig.tired !== undefined) I.tired = Math.max(0, ig.tired < 0 ? I.tired + ig.tired : ig.tired);
  if (ig.face) { I.cc.face = ig.face; sync(I); out.push(`얼굴: ${FACES[ig.face].n}`); }
  if (ig.twist) { const T = I.trend; if (T && I.cc.fmt !== T.fmt) { I.cc.fmt = T.fmt; out.push(`포맷을 ${jo(FMTS[T.fmt].n, "으로")}`); } else { const ks = Object.keys(TONES); I.cc.tone = ks[(ks.indexOf(I.cc.tone) + 1) % ks.length]; out.push(`톤을 ${jo(TONES[I.cc.tone].n, "으로")}`); } I.ccAge = Math.min(I.ccAge, 5); out.push("컨셉 수명이 다시 '성장'으로"); }
  if (ig.switch && I.trend) { I.cc.topic = I.trend.topic; I.ccAge = 0; I.cons = 40; sync(I); out.push(`주제를 ${jo(TOPICS[I.trend.topic].n, "으로")} 갈아탔다`, "일관성 40"); }
  if (ig.fmtTo) { I.cc.fmt = ig.fmtTo; I.ccAge = Math.min(I.ccAge, 5); out.push(`포맷을 ${jo(FMTS[ig.fmtTo].n, "으로")}`); }
  if (ig.algo) { I.algoHit = { fmt: I.cc.fmt, until: s.t + 7 }; out.push(`${FMTS[I.cc.fmt].n} 노출 반토막(반년)`); }
  if (ig.age !== undefined) I.ccAge = ig.age;
  if (ig.offer) for (let k = 0; k < ig.offer; k++) { const o = addOffer(s, r); if (o) out.push(`협찬함 +1(${o.nm})`); }
  if (ig.brand) { I.brand = { t0: s.t, lv: 1 }; out.push("내 브랜드 런칭!"); log(s, `인별 브랜드를 런칭했다(팔로워 ${fmt(I.f)})`, "work"); }
  if (ig.meet) { const w = ig.meet; ensureRel(s, w); if (!s.cast.includes(w)) s.cast.push(w); I.met[w] = s.t; const g = addAff(s, w, ig.aff || 6); out.push(`${CHAR[w]?.name || ""} 호감 +${g}`); }
  if (ig.cine) s.sceneQ.unshift(cineStory(s, ig.cine, ig.cineTitle || sc.title, ig.cineText || "", ig.meet || sc.who));
  if (ig.fade) I.fade = ig.fade;
  if (ig.hackRisk) I.hackRisk = (I.hackRisk || 0) + ig.hackRisk;
  // 뒷광고 적발: 과징금(모든 선택 공통) + 환불
  if (ig.adFine) { const v = Math.round(ig.adFine); s.cash -= v; addMoney(s, "exp", "인별 비용", v); out.push(`과징금 −${won(v)}`); I.hidAds = []; I.adHeat = 0; I.adPend = 0; I.adCaught = (I.adCaught || 0) + 1; }
  // 계정 정지
  if (ig.ban) { I.ban = { left: ig.ban, t: s.t }; I.streak = 0; out.push(`계정 정지 ${ig.ban}달`); }
  if (ig.banSub) { const B = F30.ban, from = I.f, nf = Math.round((I.sub?.f || 0) + from * (I.fan / 100) * B.carry); I.f = nf; I.cons = clamp(I.cons - 10, 0, 100); I.sub = { f: 0, on: false }; I.ban = null; I.hackRisk = 0; I.streak = 0; out.push(`부계정으로 이사: 팔로워 ${fmt(from)} → ${fmt(nf)}`, "일관성 −10"); }
  if (ig.banNew) { const from = I.f; I.f = Math.round(from * F30.ban.newKeep); I.cons = 35; I.ccAge = 0; I.streak = 0; I.ban = null; I.hackRisk = 0; out.push(`새 계정: 팔로워 ${fmt(from)} → ${fmt(I.f)}`, "일관성 35"); }
  if (ig.meetup) out.push(...fanMeet(s, r, ig.meetup, sc));
}
// 팬 모임: 오는 사람(기대값). '갈게요'는 promise 배 부풀려 보인다
export function meetExpect(s) {
  const I = s.ins, M = F30.meet;
  return Math.sqrt(Math.max(0, I.f)) * M.k * Math.pow((I.fan || 0) / 70, 2) * (1 + (I.loyal || 0) * M.loyalK) * (I.cc?.face === "face" ? M.faceK : 1);
}
export function canMeet(s) {
  const I = s.ins, M = F30.meet; if (!I?.cc) return "컨셉부터";
  if (banned(s)) return "계정 정지 중";
  if (I.fan < M.minFan) return `팬심 ${M.minFan}부터(지금 ${Math.round(I.fan)})`;
  if (I.f < M.minF) return `팔로워 ${fmt(M.minF)}부터`;
  if (s.t - (I.meetT ?? -99) < M.gap) return `팬 모임은 ${M.gap}달에 한 번(${M.gap - (s.t - I.meetT)}달 뒤)`;
  return null;
}
function fanMeet(s, r, size, sc) {
  const I = s.ins, M = F30.meet, Z = M[size] || M.small, pi = SYN.pi(s), out = [];
  I.meetT = s.t; I.meetN = (I.meetN || 0) + 1;
  const cost = Math.round(Z.cost * pi); s.cash -= cost; addMoney(s, "exp", "인별 비용", cost); out.push(`대관비 −${won(cost)}`);
  const att = Math.max(0, Math.round(meetExpect(s) * r.range(0.55, 1.45))), seats = Z.seats, ratio = att / seats;
  I.lastMeet = { t: s.t, size, att: Math.min(att, seats), seats, ratio };
  const big = size === "big";
  if (big) { const tk = Math.round(Math.min(att, seats) * Z.ticket * pi); if (tk) { s.cash += tk; addMoney(s, "inc", "인별 수익", tk); I.monthRev += tk; out.push(`티켓 +${won(tk)}`); } }
  out.push(`온 사람 ${Math.min(att, seats)}/${seats}명`);
  if (ratio >= M.ok) {
    const lo = big ? 8 : 3; I.loyal += lo; I.fan = clamp(I.fan + (big ? 15 : 12), 0, 100); I.ctrv = clamp(I.ctrv - 5, 0, 100);
    const g = addF(s, fGain(s, big ? 6 : 3, big ? 8000 : 2500, big ? 200 : 50));
    out.push(`충성 팬 +${lo}`, `팬심 +${big ? 15 : 12}`, `팔로워 +${fmt(g)}`);
    s.sceneQ.unshift(cineStory(s, "in_fanmeet", big ? "꽉 찬 홀" : "첫 팬 모임", big ? `${seats}석이 다 찼다. 맨 앞줄 사람이 내 첫 게시물을 출력해 왔다.` : `작은 카페에 ${Math.min(att, seats)}명. 화면 속 아이디들이 얼굴이 됐다.`));
    sc && (sc._res = "ok");
  } else if (ratio >= M.mid) {
    I.loyal += 1; I.fan = clamp(I.fan + 5, 0, 100); out.push("충성 팬 +1", "팬심 +5");
    s.sceneQ.unshift(cineStory(s, null, "팬 모임 그날", `${seats}석에 ${Math.min(att, seats)}명. 빈자리가 조금 보였지만, 온 사람들은 끝까지 남아 사진을 찍고 갔다.`));
    sc && (sc._res = "mid");
  } else {
    I.fan = clamp(I.fan - 6, 0, 100); I.ctrv = clamp(I.ctrv + (big ? 20 : 12), 0, 100); s.mental = clamp(s.mental - 8, 0, 100);
    const d = fLoss(s, big ? 6 : 3); out.push("팬심 −6", `논란 +${big ? 20 : 12}`, "멘탈 −8", `팔로워 −${fmt(d)}`, "빈 의자 사진이 박제됐다");
    s.sceneQ.unshift(cineStory(s, null, "팬 모임 그날", `${seats}석에 ${Math.min(att, seats)}명. '갈게요!'라던 DM은 다 어디 갔을까. 누군가 찍은 빈 의자 사진이 "팬 모임 레전드"로 돌기 시작했다.`));
    sc && (sc._res = "ng");
  }
  return out;
}
function cineStory(s, key, title, text, who) { return { kind: "story", tag: "인별그램", ...(key ? { cine: key } : {}), title, text, ...(who ? { who } : {}), choices: [{ t: "계속", eff: {}, text: "" }] }; }
export const CHOOSE = {
  ig_ev(s, r, i, ok, sc) {
    const I = ens(s), out = [], ch = sc.choices[i] || {};
    const ig = ch.check ? (ok ? ch.ok?.ig : ch.ng?.ig) : ch.ig;
    applyIg(s, r, ig, sc, out);
    if (sc.ev === "era" && i === 0 && sc.big) { const k = s.sceneQ.findIndex((x) => x.cine === "in_era"); s.sceneQ.splice(k + 1, 0, brandScene(s)); }
    I.ev.t = s.t;
    return out;
  },
};
// 봇·시험용: 이 장면에서 무난한 선택(장면을 만들 때 rec 를 적어 둔다)
export function pickFor(s, sc) { if (typeof sc?.rec === "number") return sc.rec; return 0; }
const EV = (ev, title, text, choices, extra = {}) => ({ kind: "event", tag: "인별그램", ev, title, text, onChoose: "ig_ev", choices, ...extra });
const C = (t, ig, text = "") => ({ t, eff: {}, ig, text });
const CK = (t, stat, dc, ok, ng) => ({ t, check: { stat, dc }, ok: { text: ok[0], eff: {}, ig: ok[1] }, ng: { text: ng[0], eff: {}, ig: ng[1] } });

function collabScene(s, r, who) {
  const c = CHAR[who], I = s.ins, u = Math.round(dealPay(s) * 0.4);
  const big = (CELEBS[who]?.minF || 0) >= 20000;
  return EV("collab", `콜라보 · ${c?.name || "유명인"}`, `${c?.job || ""} ${c ? jo(c.name, "과", "와") : "유명인과"} 촬영 날. 카메라가 돌기 전에 그가 내 피드를 넘겨 보며 말했다. "이 계정은 색이 분명해서 좋아요. 그거 지켜요."`, [
    C("내 컨셉 톤으로 같이 찍자고 제안한다", { meet: who, aff: 10, fp: big ? 14 : 10, fcap: big ? 12000 : 7000, fadd: 300, cons: 3, cine: "in_collab", cineTitle: `${c ? jo(c.name, "과", "와") : "유명인과"} 한 컷`, cineText: "같은 프레임에 선 순간, 알림이 멈추지 않았다." }, "둘 다 만족한 컷이 나왔다."),
    C("상대 스타일에 맞춰 찍는다", { meet: who, aff: 12, fp: big ? 16 : 12, fcap: big ? 14000 : 8000, fadd: 300, cons: -8, cine: "in_collab", cineTitle: `${c ? jo(c.name, "과", "와") : "유명인과"} 한 컷`, cineText: "그의 팬들이 내 계정으로 몰려왔다. 다만 피드가 조금 낯설다." }, "조회수는 컸다. 내 피드 같지는 않다."),
    C("사진 한 장만 남기고 사적인 대화를 나눈다", { meet: who, aff: 16, fp: 3, fcap: 2000, cash: 0 }, `"다음엔 일 얘기 말고 밥 먹어요." 연락처가 생겼다.`),
  ], { who, rec: 0 });
}
function brandScene(s) {
  const pi = SYN.pi(s), cost = Math.round(1500 * pi), one = Math.round(dealPay(s) * 6);
  return EV("brand", "내 브랜드 제안", `대박 이후 메일함이 터졌다. 한 회사는 '콜라보 한정판'을, 다른 회사는 '아예 내 이름의 브랜드'를 제안했다. 브랜드는 초기 비용 ${won(cost)}이 들지만 매달 팔린다.`, [
    C(`내 브랜드를 런칭한다(−${won(cost)})`, { cost, brand: 1, cine: "in_brand", cineTitle: "내 이름의 브랜드", cineText: "팝업 첫날, 줄 끝에 낯익은 아이디들이 서 있었다." }, "로고를 정하는 데만 한 달이 걸렸다."),
    C(`한정판 콜라보만 한다(+${won(one)})`, { cash: one, cons: -3 }, "48시간 만에 품절. 통장은 웃었다."),
    C("둘 다 사양하고 컨셉에 집중한다", { cons: 6, fan: 6 }, "\"돈보다 피드\" 스토리에 하트가 쏟아졌다."),
  ], { rec: s.cash > cost * 2 ? 0 : 1 });
}
// ───────── 특이 요소 장면 ─────────
// 오프라인 팬 모임(팬심 게이지 70+). 피드의 '팬 모임 열기' 버튼이나 이벤트로 열린다. onChoose ig_ev
export function fanMeetScene(s) {
  const I = s.ins, M = F30.meet, pi = SYN.pi(s), E = meetExpect(s), say = Math.max(3, Math.round(E * M.promise));
  const bigOk = I.f >= M.big.minF;
  const ch = [
    C(`작은 카페를 빌린다(${M.small.seats}석, −${won(Math.round(M.small.cost * pi))}, 스태미너 −6)`, { hp: -6, meetup: "small" }, "그날이 왔다."),
    ...(bigOk ? [C(`대관 홀을 잡는다(${M.big.seats}석, −${won(Math.round(M.big.cost * pi))}, 티켓 ${won(Math.round(M.big.ticket * pi))}, 스태미너 −10)`, { hp: -10, meetup: "big" }, "그날이 왔다.")] : []),
    C("온라인 Q&A로 대신한다", { fan: 5, eng: 0.4 }, "질문이 300개 달렸다. 박제될 일은 없다."),
  ];
  // 무난한 선택: 기대 인원이 좌석을 넉넉히 채우면 그 크기, 아니면 온라인
  const rec = bigOk && E >= M.big.seats * 1.05 ? 1 : E >= M.small.seats * 1.05 ? 0 : ch.length - 1;
  return EV("fanmeet", "팬 모임 열까", `"한 번 만나요!" DM이 쌓였다. '갈게요!'라고 한 사람이 대략 ${say}명. 말만 하고 안 오는 사람도 있다는데… 팬심 ${Math.round(I.fan)} · 충성 팬 ${I.loyal || 0}명.`, ch, { rec, f30: "meet" });
}
// 계정 정지·해킹. 부계정이 있으면 이사 갈 수 있다
export function banScene(s) {
  const I = s.ins, B = F30.ban, hack = (I.hackRisk || 0) > 0, sf = I.sub?.f || 0, carry = Math.round(sf + I.f * (I.fan / 100) * B.carry);
  const ch = [
    CK(`이의 신청서를 쓴다(통과하면 ${B.okM}달, 안 되면 ${B.ngM}달 정지)`, "write", B.appealDc, [`"검토 결과 정지를 해제합니다." 한 달만 버티면 된다.`, { ban: B.okM }], [`자동 답장만 돌아왔다. "결정은 번복되지 않습니다."`, { ban: B.ngM }]),
    sf >= 100 ? C(`부계정으로 이사 간다(팔로워 ${fmt(I.f)} → 약 ${fmt(carry)})`, { banSub: 1 }, `부계정 프로필에 "본계정이 막혀서 이쪽으로 왔어요"를 올렸다. 아는 아이디들이 하나둘 따라왔다.`) : C(`새 계정을 판다(팔로워 ${fmt(I.f)} → ${fmt(Math.round(I.f * B.newKeep))})`, { banNew: 1 }, "0부터 다시. 그래도 컨셉은 머릿속에 있다."),
  ];
  const rec = sf >= I.f * 0.08 ? 1 : 0;
  return EV("ban", hack ? "계정을 뺏겼다" : "계정이 정지됐다", hack ? `아침에 일어나니 비밀번호가 바뀌어 있다. 내 계정엔 코인 광고가 줄줄이 올라왔고, 신고가 쌓여 결국 정지됐다. 팔로워 ${fmt(I.f)}명이 한순간에 멈췄다.` : `"커뮤니티 가이드 위반으로 계정이 정지되었습니다." 무엇을 어겼는지는 안 알려 준다. 신고가 몰린 탓인 듯하다. 팔로워 ${fmt(I.f)}명이 한순간에 멈췄다.${sf ? ` 키워 둔 부계정 팔로워는 ${fmt(sf)}명.` : " 부계정은 없다."}`, ch, { rec, f30: "ban" });
}
// 뒷광고 적발: 과징금은 어느 선택이든 낸다
export function adCaughtScene(s) {
  const I = s.ins, A = F30.ad, pi = SYN.pi(s), L = I.hidAds || [], sum = L.reduce((a, x) => a + (x.pay || 0), 0);
  const fine = Math.round(Math.max(A.fineMin * pi, sum * A.fineK));
  return EV("adcaught", "뒷광고 적발", `"광고 표시 없는 협찬" 제보가 들어갔다. 숨긴 광고 ${L.length}건이 한꺼번에 드러나 과징금 ${won(fine)}이 나왔다. 댓글창엔 예전 "광고 아니에요" 답글 캡처가 돈다.`, [
    C(`사과문 + 협찬비 ${won(sum)} 기부`, { adFine: fine, cost: sum, ctrv: 10, fan: -4, cons: -3 }, `변명 없이 사과했다. "그래도 인정은 하네" 댓글이 하나둘 달렸다.`),
    CK(`"표시 규정을 몰랐다"고 해명한다`, "talk", 55 + Math.round((I.adHeat || 0) * 5), ["어설프지만 받아들여졌다. 다음부턴 꼭 표시하기로.", { adFine: fine, ctrv: 15, fan: -6 }], [`"몰랐다는 사람이 '광고 아님'이라고 답했어요?" 2차 캡처가 돌았다.`, { adFine: fine, ctrv: 35, fan: -12, fp: -10 }]),
    C("잠수 탄다(한 달 쉼)", { adFine: fine, ctrv: 20, fp: -6, streak0: 1, mental: 4 }, "알림을 껐다. 돌아왔을 땐 다들 조금 잊은 듯했다. 다만 '그 사람'으로 기억된다."),
  ], { rec: 0, f30: "ad" });
}

// 트렌드가 바뀔 때(6~12달마다)
function trendScene(s) {
  const I = s.ins, T = I.trend, st = stageOf(I), mine = I.cc.topic === T.topic;
  const hot = `${TOPICS[T.topic].n} × ${FMTS[T.fmt].n}`;
  const rec = mine ? 0 : st.i >= 3 ? 2 : st.i >= 2 ? 1 : 0;
  return EV("trend", "새 물결", `요즘 탐색 탭이 온통 '${hot}'이다. 내 컨셉(${ccName(I.cc)})은 지금 '${st.n}' 단계. ${mine ? "물이 들어온다. 노를 저을 때다." : "지킬까, 비틀까, 갈아탈까."}`, mine ? [
    C("내 컨셉 그대로, 더 진하게 간다", { cons: 6, fan: 3 }, "피드가 한층 단단해졌다."),
    C(`포맷만 ${jo(FMTS[T.fmt].n, "으로")} 맞춘다`, { twist: 1, cons: -4 }, "같은 주제, 새 그릇."),
  ] : [
    C("지킨다: 내 색은 내가 정한다", { cons: 5, fan: 3 }, "뚝심 있는 계정이라는 댓글이 달렸다."),
    C(`살짝 비튼다: ${I.cc.fmt !== T.fmt ? `포맷을 ${jo(FMTS[T.fmt].n, "으로")}` : "톤을 바꿔"}`, { twist: 1, cons: -8, fp: -3 }, "익숙한데 새롭다는 반응."),
    C(`갈아탄다: 주제를 ${jo(TOPICS[T.topic].n, "으로")}`, { switch: 1, fp: -18, fan: -8 }, "팔로워 일부가 떠났다. 대신 새 물결 위에 섰다."),
  ], { rec });
}

// 위기 6종 + 대박 + 인별 전용 이벤트
function evList(s, r) {
  const I = s.ins, f = I.f, pi = SYN.pi(s), u = Math.round(dealPay(s));
  const st = stageOf(I), cc = I.cc, hotK = Object.keys(HOTS).find((k) => HOTS[k].tp.includes(cc.topic)) || "roof";
  const celeb = Object.keys(CELEBS).find((id) => CHAR[id] && f >= CELEBS[id].minF && (!CELEBS[id].tp.length || CELEBS[id].tp.includes(cc.topic)) && s.t - (I.met[id] ?? -99) >= 10 && !(I.dm || []).some((d) => d.who === id && !d.done));
  const L = [
    // ── 위기 ──
    { id: "cv_old", w: 0.4 + I.ctrv / 25, ok: () => f >= 1500 && I.ctrv >= 15, mk: () => EV("cv_old", "박제된 옛 게시물", `3년 전 올린 글 캡처가 돌기 시작했다. 지금 컨셉과 정반대인 말. 논란 게이지 ${Math.round(I.ctrv)}. 댓글창이 빠르게 차오른다.`, [
      CK("사과문을 직접 쓴다", "write", 40 + Math.round(I.ctrv / 4), ["담백한 사과가 통했다. \"사람이 변할 수도 있지.\"", { ctrv: -20, fan: -2 }], ["변명처럼 읽혔다. 2차 캡처가 돌았다.", { ctrv: -6, fan: -6, fp: -4 }]),
      C("침묵하고 업로드를 이어 간다", { ctrv: -6, fp: -3, cons: 2 }, "한 달 지나자 조용해졌다. 몇몇은 떠났다."),
      CK("조목조목 반박한다", "talk", 55, ["논리에 팬들이 고개를 끄덕였다.", { ctrv: -10, fan: 6 }], ["싸움이 커졌다. 반박문까지 박제됐다.", { ctrv: 20, fp: -8, fan: -4 }]),
    ], { rec: (s.st.write || 0) >= 40 ? 0 : 1 }) },
    { id: "cv_copy", w: 0.8, ok: () => f >= 3000 && I.cons >= 60, mk: () => EV("cv_copy", "카피 계정", `내 피드를 그대로 베낀 계정이 나타났다. 톤, 구도, 캡션 말투까지. 그런데 그쪽이 더 빨리 큰다.`, [
      C("한 단계 더 진한 내 컨셉으로 차별화한다", { cons: 8, fan: 3, ap: -2 }, "따라 할 수 없는 디테일을 더했다. 다음 달 행동력이 조금 빠듯하다."),
      CK("콜라보를 제안해 끌어안는다", "talk", 45, ["\"원조 등판\" 콜라보가 화제가 됐다.", { fp: 8, fcap: 5000, fan: 3 }], ["읽씹당했다. 그쪽 팬들이 나를 '시샘한다'고 했다.", { ctrv: 6, fp: -2 }]),
      C("신고하고 기다린다", { ctrv: 2, fan: 1 }, "몇 주 뒤 계정이 비공개로 바뀌었다."),
    ], { rec: 0 }) },
    { id: "cv_algo", w: 0.6, ok: () => f >= 800 && !(I.algoHit && I.algoHit.until > s.t), mk: () => EV("cv_algo", "알고리즘 개편", `플랫폼이 '${FMTS[cc.fmt].n}' 노출을 줄인다고 발표했다. 반년쯤 내 게시물 도달이 반토막 날 수 있다.`, [
      C(`포맷을 ${jo(FMTS[cc.fmt === "reels" ? "photo" : "reels"].n, "으로")} 바꾼다`, { fmtTo: cc.fmt === "reels" ? "photo" : "reels", cons: -10 }, "새 포맷이 낯설다. 그래도 도달은 지켰다."),
      C("버틴다: 내 팬은 포맷이 아니라 나를 본다", { algo: 1, fan: 4 }, "도달은 줄었지만 남은 사람들은 더 끈끈해졌다."),
    ], { rec: I.fan >= 60 ? 1 : 0 }) },
    { id: "cv_tired", w: 5, force: () => I.tired >= 16, ok: () => I.tired >= 16, mk: () => EV("cv_tired", "나는 누구인가", `${(PLANS[I.plan] || PLANS[3]).n} 약속을 ${I.streak}달째 지키는 중. 새벽 2시, 캡션을 쓰다 멈췄다. 컨셉 속 나와 진짜 나 사이가 너무 멀다.`, [
      C("한 달 쉰다(연속 기록은 끊긴다)", { plan: 2, streak0: 1, tired: 0, fan: -2, mental: 15 }, "휴대폰을 서랍에 넣었다. 잠을 잤다."),
      C("약속을 한 단계 낮춘다", { plan: I.plan === 5 ? 3 : 2, streakHalf: 1, tired: -10, mental: 6 }, "주 2~3회면 숨이 쉬어진다."),
      C("버틴다", { tired: -4, mental: -8 }, "또 캡션을 썼다. 거울 속 얼굴이 낯설다."),
    ], { rec: s.mental < 45 ? 0 : 1 }) },
    { id: "cv_boss", w: 2, ok: () => cc.face === "face" && company(s) && f >= 3000 && (s.co.eye || 0) >= 25, mk: () => EV("cv_boss", "팀장이 내 릴스를 봤다", `점심시간, 팀장이 휴대폰을 내밀었다. "이거 ○○씨 맞죠?" 화면 속에서 내가 웃고 있다.`, [
      CK("솔직하게 말하고 업무엔 지장 없다고 한다", "talk", 45, ["\"재밌네. 대신 업무 시간엔 안 돼요.\" 의외로 쿨했다.", { fan: 2 }], ["분위기가 싸해졌다. 다음 평가가 걱정이다.", { eye: 10 }]),
      C("얼굴 공개를 접는다(손만 나오는 컨셉으로)", { face: "hand", cons: -15, fp: -6 }, "얼굴이 사라진 피드에 '무슨 일 있어요?' 댓글이 달렸다."),
      C("모른 척 웃어넘긴다", { ctrv: 2, eye: 6 }, "팀장은 더 묻지 않았다. 대신 시선이 자주 느껴진다."),
    ], { rec: (s.st.talk || 0) >= 45 ? 0 : 1 }) },
    // ── 인별 전용 ──
    { id: "hot", w: 1.4, ok: () => f >= 300, mk: () => { const k = r.pick(Object.keys(HOTS).filter((x) => HOTS[x].tp.includes(cc.topic)).concat([hotK])); const H = HOTS[k], fitH = H.tp.includes(cc.topic), cost = Math.round(H.cost * pi); const meet = celeb && r.chance(0.35) ? celeb : null;
      return EV("hot", `핫플 오픈 · ${H.n}`, `${jo(H.n, "이", "가")} 요즘 난리다. 오픈 시간 전부터 줄이 섰다고 한다. ${fitH ? "내 컨셉이랑 딱 맞는 곳." : "내 컨셉이랑은 조금 결이 다르다."}`, [
        C(`촬영하러 간다(−${won(cost)}, 스태미너 −4)`, { cost, hp: -4, fp: fitH ? 6 : 3, fcap: 3500, fadd: 80, cons: fitH ? 3 : -3, cine: H.cine, cineTitle: H.n, cineText: fitH ? "줄 서서 찍은 한 장이 오늘의 저장 1위가 됐다." : "예쁜 곳이었다. 내 피드에선 조금 튀었다.", ...(meet ? { meet, aff: 8 } : {}) }, meet ? `줄 앞쪽에 ${jo(CHAR[meet].name, "이", "가")} 있었다. 눈이 마주쳐 인사를 나눴다.` : "사람에 치였지만 사진은 건졌다."),
        C("사람 빠지면 평일에 간다", { cons: 1 }, "한 주 늦게 갔다. 조용해서 좋았다."),
      ], { rec: 0, hot: k }); } },
    { id: "celeb", w: 1.2, ok: () => !!celeb, mk: () => { addDm(s, r, "celeb", { who: celeb, tx: CELEB_TX[celeb] }); return null; } },
    { id: "shoot", w: 0.7, ok: () => f >= 3000 && CHAR.s004 && s.t - (I.met.s004 ?? -99) >= 12 && ["fashion", "space", "travel", "daily", "pet", "food"].includes(cc.topic), mk: () => EV("shoot", "화보 촬영 제안", `화보 사진가 ${CHAR.s004.name}에게서 연락이 왔다. "피드 톤 그대로, 한 컷만 같이 만들어 봐요."`, [
      C("스튜디오에 간다(스태미너 −5)", { hp: -5, meet: "s004", aff: 10, fp: 7, fcap: 5000, fadd: 150, cons: 5, cine: "in_shoot", cineTitle: "화보 한 컷", cineText: "셔터 소리 사이로 내 컨셉이 처음으로 '작품'이 됐다." }, "조명 아래 세 시간. 한 컷이 나왔다."),
      C("일정이 안 맞아 사양한다", { meet: "s004", aff: 2 }, "\"다음에 꼭 해요.\""),
    ], { who: "s004", rec: 0 }) },
    { id: "give", w: 0.8, ok: () => f >= 2000, mk: () => { const cost = Math.round(15 * pi); return EV("give", "팔로워 이벤트를 열까", `"팔로우 + 댓글 + 친구 태그" 선물 이벤트. 숫자는 확 늘겠지만, 선물만 받고 떠나는 사람도 많다.`, [
      C(`연다(−${won(cost)})`, { cost, fp: 6, fcap: 4000, fadd: 100, eng: -0.8, cons: -2 }, "팔로워는 늘었다. 참여율은 조금 묽어졌다."),
      C("기존 팬에게 손편지 추첨으로 대신한다", { cost: Math.round(cost / 3), fan: 6, eng: 0.5 }, "\"이 계정은 진짜 사람이 하는구나.\""),
      C("안 한다", {}, "평소처럼 올렸다."),
    ], { rec: 1 }); } },
    { id: "chal", w: 1, ok: () => f >= 500, mk: () => EV("chal", "챌린지 유행", `요즘 다들 같은 음악에 같은 동작을 올린다. 참여하면 노출은 좋겠지만 내 컨셉과는 상관없다.`, [
      C("그대로 따라 한다", { fp: 3, fcap: 2500, cons: -6 }, "평범하게 묻혔다."),
      CK("내 컨셉으로 비틀어 올린다", "sense", 45, ["\"이걸 이렇게 바꾸네\" 탐색 탭에 걸렸다.", { fp: 8, fcap: 6000, fadd: 120, cons: 3 }], ["어정쩡했다. 둘 다 아닌 게시물.", { cons: -3 }]),
      C("패스한다", { cons: 2 }, "유행은 2주 만에 지나갔다."),
    ], { rec: (s.st.sense || 0) >= 40 ? 1 : 2 }) },
    { id: "bigad", w: 0.7, ok: () => f >= 5000, mk: () => { const pay = Math.round(u * 3.5); return EV("bigad", "큰 협찬, 그런데", `단가가 평소의 세 배가 넘는 협찬(${won(pay)}). 문제는 제품이 내 컨셉과 정반대라는 것.`, [
      C(`받는다(+${won(pay)})`, { cash: pay, cons: -20, ctrv: 8, fan: -5 }, "돈은 들어왔다. '광고충' 댓글이 고정 1위가 됐다."),
      C("거절하고 이유를 스토리에 쓴다", { fan: 6, cons: 4 }, "\"이래서 믿고 본다\"는 DM이 왔다."),
    ], { rec: I.cons >= 70 ? 1 : 0 }); } },
    { id: "fanmeet", w: 0.8, ok: () => !canMeet(s), mk: () => fanMeetScene(s) },
    { id: "ban", w: F30.ban.w + (I.hackRisk || 0) * F30.ban.hackW + (I.ctrv >= 50 ? F30.ban.ctrvW : 0), ok: () => f >= F30.ban.minF && !I.ban, mk: () => banScene(s) },
    { id: "hack", w: 2, ok: () => (I.scamClick || 0) > 0, mk: () => { I.scamClick = 0; return EV("hack", "로그인 알림", "모르는 기기에서 로그인했다는 알림. 예전에 눌렀던 그 링크 때문인 것 같다.", [
      C("2단계 인증을 켜고 비밀번호를 다 바꾼다", { cons: -1 }, "한 시간 걸렸다. 마음이 놓였다."),
      C("귀찮아서 넘긴다", { fp: -10, ctrv: 5, hackRisk: 1 }, "다음 날 내 계정에 코인 광고가 올라갔다. 그 기기는 아직 로그인돼 있다."),
    ], { rec: 0 }); } },
    { id: "aicap", w: 0.6, ok: () => f >= 1500, mk: () => EV("aicap", "\"AI가 쓴 캡션 같아요\"", "요즘 캡션을 도구로 빨리 뽑았더니 댓글이 달렸다. \"말투가 사람 같지 않음.\"", [
      C("다시 직접 쓴다(스태미너 −3)", { hp: -3, cons: 3, fan: 2 }, "느리지만 내 말투가 돌아왔다."),
      C("도구는 쓰되 마지막 문장은 내가 쓴다", { cons: 1 }, "티가 덜 났다."),
      C("신경 안 쓴다", { ctrv: 4, eng: -0.4 }, "\"이 계정 영혼 없음\" 캡처가 돌았다."),
    ], { rec: 1 }) },
    { id: "dry", w: 0.8, ok: () => I.posts + I.reels >= 12 && st.i >= 1, mk: () => EV("dry", "소재가 바닥났다", "올릴 게 없다. 같은 구도, 같은 메뉴, 같은 하늘. 메모장의 아이디어 목록이 비었다.", [
      CK("취미·다른 투잡에서 소재를 찾는다", "sense", 40 - (topicFit(s) ? 15 : 0), ["새 시리즈를 찾았다. '이 사람은 소재가 끝이 없네.'", { cons: 4, fan: 2 }], ["억지로 짜낸 티가 났다.", { cons: -3 }]),
      C("살짝 벗어난 글로 숨을 돌린다", { cons: -5 }, "가볍게 올렸다. 마음도 가벼워졌다."),
    ], { rec: 0 }) },
    { id: "mutual", w: 0.8, ok: () => f >= 1000 && f < 50000, mk: () => EV("mutual", "비슷한 계정의 콜라보 제안", "결이 비슷한 계정에서 '서로 소개하기' 콜라보를 제안했다.", [
      C("같이 한다", { fp: 5, fcap: 2500, fadd: 60, cons: -1 }, "서로의 팬이 조금씩 섞였다."),
      C("컨셉이 흐려질까 봐 거절한다", { cons: 2 }, "혼자 가는 길."),
    ], { rec: 0 }) },
  ];
  return L;
}
// 대박: 시대의 컨셉(드물다). 일관성 80+ · 주제가 트렌드 · '성장' 단계
const eraBrk = (big, ev) => { if (big && ev.choices?.[0]) ev.choices[0].eff = { ...(ev.choices[0].eff || {}), brk: ["mkt", "sense"], stat: { charm: 2 } }; return ev; }; // v4.28 시대의 컨셉 = 돌파 계기
function eraJackpot(s, r) {
  const I = s.ins, T = I.trend; if (!T || !I.cc) return null;
  if (!(I.cons >= 80 && I.cc.topic === T.topic && stageOf(I).i === 1 && I.f >= 2000 && s.t - I.eraT >= 36)) return null;
  if (!r.chance(0.08 * (I.cc.fmt === T.fmt ? 1.5 : 1))) return null;
  I.eraT = s.t; const big = r.chance(0.65);
  const g = big ? Math.round(Math.min(45000, 3000 + I.f * 0.6 * sat(I.f, kxOf(s)))) : Math.round(Math.min(9000, 800 + I.f * 0.25 * sat(I.f, kxOf(s))));
  const celeb = big ? "s001" : null;
  return eraBrk(big, EV("era", big ? "시대의 컨셉" : "반짝 유행", big ? `알고리즘과 시대가 동시에 내 피드를 가리켰다. '${ccName(I.cc)}'. 하루 만에 팔로워가 ${fmt(g)}명 늘었다. 톱 인플루언서 ${jo(CHAR[celeb]?.name || "누군가", "이", "가")} 내 게시물을 공유했다.` : `내 게시물이 한 주 동안 여기저기 퍼졌다. 팔로워 +${fmt(g)}. 그런데 다들 '그 게시물'만 기억한다.`, [
    C(big ? "이 순간을 즐긴다" : "흐름을 타 본다", { fadd: g, fp: 0.01, fcap: g, fan: big ? 8 : 2, cine: "in_era", cineTitle: big ? "시대의 컨셉" : "반짝 유행", cineText: big ? "알림 숫자가 멈추지 않았다. 내가 만든 컨셉이 시대의 언어가 됐다." : "모두가 그 한 장을 이야기했다. 나는 다음 장이 걱정됐다.", ...(celeb ? { meet: celeb, aff: 8 } : {}), ...(big ? {} : { fade: 3 }) }, big ? "협찬 메일 제목에 '브랜드 런칭'이라는 말이 처음 등장했다." : "한 달 뒤, 숫자는 조금씩 빠지기 시작했다."),
  ], { rec: 0, big, cine0: 1 }));
}
function pickEvent(s, r, scenes) {
  const I = s.ins; if (!I.cc) return null;
  if (scenes.some((sc) => sc && sc.kind === "event")) return null;
  const L = evList(s, r).filter((e) => { try { return e.ok(); } catch (x) { return false; } });
  const forced = L.find((e) => e.force && e.force());
  if (!forced && (s.t - I.ev.t < 2 || !r.chance(0.3))) return null;
  const fresh = L.filter((e) => s.t - (I.ev.seen[e.id] ?? -99) >= 10);
  const e = forced || (fresh.length ? r.weighted(fresh.map((x) => [x, x.w])) : null); if (!e) return null;
  I.ev.seen[e.id] = s.t; I.ev.t = s.t;
  const sc = e.mk(); return sc;
}

// ───────── 한 달 ─────────
export function month(s, r, notes, scenes = []) {
  const I = ens(s); if (!I.cc) return 0;
  ensureKx(s, r); const before = I.f;
  // 0) 계정 정지 중: 올리기·댓글·협찬이 멈춘다. 팔로워는 얼어 있고 팬심만 식는다(부계정을 키웠으면 거기서 근황을 올려 덜 식는다)
  if (banned(s)) return banMonth(s, r, notes);
  if (I.ban && !(I.ban.left > 0)) { I.ban = null; notes.push("인별: 계정이 복구됐다! 다시 올릴 수 있어요"); }
  if (I.angry > 0) I.angry--;
  // 1) 업로드 약속
  const n = upsThisMonth(s), need = needOf(s), P = PLANS[I.plan] || PLANS[3];
  if (n >= need) { I.streak++; I.bestStreak = Math.max(I.bestStreak || 0, I.streak); I.miss = 0; if (P.mental) s.mental = clamp(s.mental + P.mental, 0, 100); I.tired += P.tire; }
  else if (n === 0) { if (I.f > 200 || I.streak >= 2) notes.push("인별: 한 달을 쉬었다. 알고리즘의 신이 노하셨다(두 달간 노출 반토막)"); I.angry = 2; I.streak = 0; I.miss = 0; I.tired = Math.max(0, I.tired - 4); I.cons = clamp(I.cons - 3, 0, 100); }
  else { notes.push(`인별: 약속(${P.n}) 못 지킴 ${n}/${need} · 연속 기록 끊김`); I.streak = 0; I.miss = 1; I.tired = Math.max(0, I.tired - 1); }
  // 2) 팔로워 자연 변화(큰 계정일수록 이탈도 크다)
  const posted = I.postT === s.t;
  I.f = Math.round(I.f * (posted ? 0.995 - 0.01 * I.f / (I.f + 60000) : 0.97));
  if (I.fade > 0) { I.fade--; fLoss(s, 4); }
  if (!posted && before > 300) notes.push(`인별: 이번 달 게시물이 없어 팔로워 −${fmt(before - I.f)}`);
  // 3) 컨셉 수명·팬심·논란
  I.ccAge++;
  I.fan = clamp(I.fan + (I.cons >= 70 ? 1 : I.cons < 35 ? -2 : 0) + (posted ? 0 : -2) + (50 - I.fan) * 0.1, 0, 100); // 팬심은 50 쪽으로 돌아온다
  I.ctrv = clamp(I.ctrv * 0.85 - 1, 0, 100);
  // 4) 댓글함: 안 열면 쌓인다
  if (I.inbox && I.inbox.t === s.t && !I.inbox.done) { I.pile = Math.min(4, (I.pile || 0) + 1); I.fan = clamp(I.fan - 2, 0, 100); notes.push(`인별: 댓글 ${I.inbox.total}개가 답 없이 쌓였다(참여율 −)`); }
  I.inbox = I.f >= 30 ? makeInbox(s, r, s.t + 1) : null;
  // 5) 참여율: 팬심이 높을수록, 쌓인 댓글이 많을수록
  const engBase = 0.035 + I.fan * 0.0006 - (I.pile || 0) * 0.004 + Math.min(0.006, (I.loyal || 0) * F30.meet.loyalEng); // 충성 팬(팬 모임)은 참여율을 받친다
  I.eng = clamp(I.eng + (engBase - I.eng) * 0.12, 0.02, 0.16);
  // 6) 협찬 제안·DM
  syncOffers(s, r);
  if (I.f >= 1000) { const lam = Math.min(2.5, I.f / 7000 * (I.eng / 0.06) * clamp(0.3 + I.cons / 80, 0.4, 1.3) * (s.era.winter ? 0.6 : 1)); /* 컨셉이 흐린 계정엔 브랜드가 덜 온다 */ const k = r.poisson(lam); let a = 0; for (let i = 0; i < k; i++) if (addOffer(s, r)) a++; if (a) notes.push(`인별 협찬 제안 ${a}건(협찬함 ${I.offers.length})`); }
  I.dm = (I.dm || []).filter((d) => !d.done ? s.t - d.t <= 3 : s.t - d.t <= 1);
  if (I.f >= 300 && r.chance(0.35)) addDm(s, r, "fan");
  if (I.f >= 1500 && r.chance(0.22)) addDm(s, r, "scam");
  if (I.f >= 800 && r.chance(0.18)) addDm(s, r, "deal");
  if (I.dealsDone >= 1 && I.offers.length && r.chance(0.12)) addDm(s, r, "revise");
  // 뒷광고 제안: 협찬함에 있는(아직 안 물어본) 건 하나에 대해 '광고 표시 빼 주세요'
  if (I.f >= F30.ad.askF && r.chance(F30.ad.askP)) { const o = (I.offers || []).find((x) => !x.hid && !x.asked && x.cat !== "any_bad"); if (o) addDm(s, r, "hidead", { oid: o.id }); }
  // 부계정: 켜 두면 본계정의 share 까지 천천히 따라 큰다. 대신 매달 멘탈·피로
  subMonth(s, notes);
  // 숨긴 광고: 들킬까?
  const caught = adCheck(s, r);
  // 7) 내 브랜드: 매달 팔린다(팬심·참여율)
  if (I.brand) { const rev = Math.round(Math.sqrt(I.f) * 0.55 * (I.eng / 0.06) * clamp(I.fan / 60, 0.5, 1.5) * SYN.pi(s) * r.range(0.7, 1.3)); s.cash += rev; addMoney(s, "inc", "인별 수익", rev); I.monthRev += rev; }
  // 8) 트렌드: 6~12달마다 바뀐다
  let mine = caught ? adCaughtScene(s) : null; if (mine) { I.ev.t = s.t; I.adPend = 2; }
  if (!I.trend) I.trend = { topic: r.pick(Object.keys(TOPICS)), fmt: r.pick(Object.keys(FMTS)), next: s.t + r.int(6, 12), n: 0 };
  else if (!mine && s.t >= I.trend.next && !scenes.some((x) => x?.kind === "event")) {
    const T = I.trend; let tp = r.pick(Object.keys(TOPICS).filter((k) => k !== T.topic)); if (r.chance(0.25)) tp = I.cc.topic; // 가끔 내 주제에 물이 들어온다
    I.trend = { topic: tp, fmt: r.pick(Object.keys(FMTS).filter((k) => k !== T.fmt)), next: s.t + r.int(6, 12), n: (T.n || 0) + 1 };
    mine = trendScene(s); I.ev.t = s.t;
  }
  // 9) 대박·위기·이벤트(한 달에 장면 하나)
  if (!mine) mine = eraJackpot(s, r);
  if (!mine) mine = pickEvent(s, r, scenes);
  if (mine) scenes.push(mine);
  // 10) 기록
  if (SYN.on(s, "face")) applyEff(s, { eye: 1.5 });
  const lv = lvOf(I.f); if (lv > I.lv) { notes.push(`인별 ${D.INSTA_LV[lv - 1].n} 계정 달성!`); log(s, `인별 팔로워 ${fmt(I.f)}명, ${D.INSTA_LV[lv - 1].n} 계정`, "work"); }
  I.lv = Math.max(I.lv, lv); I.peak = Math.max(I.peak || 0, I.f);
  I.hist.push(I.f); if (I.hist.length > 36) I.hist.shift();
  const M = I.mo && I.mo.t === s.t ? I.mo : { n: 0, g: 0, sv: 0, sh: 0, best: null };
  I.rh.push({ t: s.t, f: I.f, n: M.n, g: M.g, sv: M.sv, sh: M.sh, best: M.best, cons: Math.round(I.cons) }); if (I.rh.length > 24) I.rh.shift();
  const rev = I.monthRev; I.monthRev = 0; return rev;
}
function subMonth(s, notes) {
  const I = s.ins, U = F30.sub; if (!I.sub?.on) return;
  const target = I.f * U.share; I.sub.f = Math.round(I.sub.f + Math.max(U.base, (target - I.sub.f) * U.rate));
  s.mental = clamp(s.mental + U.mental, 0, 100); I.tired += U.tired;
}
// 들키면 true. 한 번 들키면 숨긴 광고가 한꺼번에 드러난다(장면은 다른 장면과 겹쳐도 다음 달로 미뤄 꼭 띄운다)
function adCheck(s, r) {
  const I = s.ins, A = F30.ad;
  I.hidAds = (I.hidAds || []).filter((x) => s.t - x.t <= A.life);
  if (!I.hidAds.length) { I.adHeat = 0; I.adPend = 0; return false; }
  if (I.adPend === 1) return true;
  if (I.adPend === 2) return false; // 장면이 이미 나갔다(고르면 비워진다)
  let q = 1; for (const x of I.hidAds) q *= 1 - Math.min(0.9, x.p * (1 + I.f / A.fBig) * (1 + (I.adHeat || 0) * A.heat));
  if (r.chance(1 - q)) { I.adPend = 1; return true; }
  return false;
}
function banMonth(s, r, notes) {
  const I = s.ins, B = F30.ban; I.ban.left--;
  const subOn = I.sub?.on && I.sub.f > 0;
  I.fan = clamp(I.fan + (subOn ? Math.round(B.fanPerM / 3) : B.fanPerM), 0, 100); I.streak = 0; I.inbox = null; I.angry = 0; I.miss = 0;
  if (I.sub?.on) subMonth(s, notes);
  notes.push(I.ban.left > 0 ? `인별: 계정 정지 중(${I.ban.left}달 남음)${subOn ? " · 부계정에서 근황을 올려 팬심이 덜 식었다" : " · 팬심이 식는다"}` : "인별: 계정이 복구됐다! 이번 달부터 다시 올릴 수 있어요");
  if (I.ban.left <= 0) I.ban = null;
  if (I.brand) { const rev = Math.round(Math.sqrt(I.f) * 0.55 * (I.eng / 0.06) * clamp(I.fan / 60, 0.5, 1.5) * SYN.pi(s) * r.range(0.5, 1.0)); s.cash += rev; addMoney(s, "inc", "인별 수익", rev); I.monthRev += rev; }
  I.hist.push(I.f); if (I.hist.length > 36) I.hist.shift();
  I.rh.push({ t: s.t, f: I.f, n: 0, g: 0, sv: 0, sh: 0, best: null, cons: Math.round(I.cons) }); if (I.rh.length > 24) I.rh.shift();
  const rev = I.monthRev; I.monthRev = 0; return rev;
}
// 부계정 켜기·끄기(앱 피드의 '부계정' 버튼)
export function setSub(s, on) {
  const I = ens(s); if (I.f < F30.sub.minF && on) return { ok: false, msg: `팔로워 ${fmt(F30.sub.minF)}부터 부계정을 키울 수 있어요` };
  I.sub.on = !!on; return { ok: true, msg: on ? `부계정 키우기 시작: 매달 멘탈 ${F30.sub.mental}, 본계정의 ${Math.round(F30.sub.share * 100)}%까지 천천히 따라 커요` : "부계정은 그대로 두고 더 키우지 않아요" };
}
export function todos(s) {
  const I = ens(s), t = [];
  if (!I.cc) t.push({ lv: 1, text: "인별 컨셉 정하기(앱 열기)", go: "insta" });
  else {
    const n = upsThisMonth(s), need = needOf(s);
    if (banned(s)) { t.push({ lv: 0, text: `인별 계정 정지 중(${I.ban.left}달)`, go: "insta" }); return t; }
    if (n < need) t.push({ lv: n === 0 && I.f > 300 ? 2 : 1, text: `인별 약속 ${n}/${need}(${PLANS[I.plan].n})`, go: "insta" });
    if (I.inbox && I.inbox.t === s.t && !I.inbox.done) t.push({ lv: 1, text: `인별 댓글함 ${I.inbox.total}개`, go: "insta" });
    if ((I.dm || []).some((d) => !d.done)) t.push({ lv: 0, text: `인별 DM ${(I.dm || []).filter((d) => !d.done).length}개`, go: "insta" });
    if (I.offers?.length) t.push({ lv: 0, text: `인별 협찬함 ${I.offers.length}건`, go: "insta" });
  }
  return t;
}

// ───────── 시뮬 봇용 자동 처리 ─────────
// 쓰는 법: 봇의 인별 차례마다 const a = INS.autoPlay(s, r, { smart: true }); if (a && tryA(s, a.id, a.arg)) return true;
//   - 처음 부를 때 컨셉·약속을 정하고, DM(공짜)은 그 자리에서 답한다. 할 행동 하나({ id, arg })를 돌려준다. 할 게 없으면 null.
//   - smart:false 는 컨셉을 막 고르고(숨은 수요 무시) 약속을 덜 지키는 봇.
//   - 장면 선택: sc.onChoose === "ig_ev" 이면 INS.pickFor(s, sc) 번호를 고른다.
export function autoPlay(s, r, opt = {}) {
  const I = ens(s), smart = opt.smart !== false;
  const rr = r || makeRng({ v: hashStr(s.t + ":" + I.posts + ":" + I.reels + ":" + I.seed) });
  if (!I.cc) {
    if (smart) setConcept(s, bestConcept(s));
    else setConcept(s, { topic: rr.pick(Object.keys(TOPICS)), tone: rr.pick(Object.keys(TONES)), fmt: rr.pick(Object.keys(FMTS)), face: rr.pick(Object.keys(FACES)) });
    setPlan(s, smart ? 3 : rr.pick([2, 3, 5]));
  }
  if (smart) { // 멘탈에 맞춰 약속 조절
    if (s.mental < 35 && I.plan > 2) setPlan(s, I.plan === 5 ? 3 : 2);
    else if (s.mental > 75 && I.plan === 2 && I.tired < 6) setPlan(s, 3);
    if (I.insT !== s.t) viewInsight(s);
  }
  for (const d of (I.dm || []).filter((x) => !x.done)) { // DM: 공짜로 그 자리에서
    const i = d.k === "fan" ? (s.hp > 30 ? 0 : 1) : d.k === "scam" ? (smart ? 1 : rr.chance(0.3) ? 0 : 1) : d.k === "deal" ? 0 : d.k === "revise" ? (smart ? 1 : 0) : d.k === "hidead" ? (smart ? 1 : rr.chance(0.5) ? 0 : 1) : d.k === "celeb" ? 0 : 0;
    dmAnswer(s, rr, d.id, i);
    if (s.pending) return null; // 콜라보 장면이 열렸다: 봇이 장면부터 처리
  }
  if (smart) { // 부계정: 계정이 커지고 멘탈 여유가 있으면 키운다
    if (!I.sub.on && I.f >= 10000 && s.mental >= 50) setSub(s, true);
    else if (I.sub.on && s.mental < 35) setSub(s, false);
  }
  if (banned(s)) return null;
  if (!can(s, "in_engage")) return { id: "in_engage", arg: smart ? autoPicks(s, rr, true) : undefined };
  if (upsThisMonth(s) < needOf(s) && !(smart === false && rr.chance(0.25))) return { id: "in_post", arg: smart || I.cons > 40 ? "on" : rr.pick(["on", "drift", "off"]) };
  const fitO = (I.offers || []).find((o) => o.fit);
  if (fitO) return { id: "in_deal", arg: fitO.id };
  if ((I.offers || []).length && (!smart || I.cons >= 78)) return { id: "in_deal", arg: I.offers[0].id };
  if (!can(s, "in_gong")) return { id: "in_gong" };
  return null;
}
// 봇용: 피드의 '팬 모임 열기'를 대신 누를 때(조건이 되면 장면을 돌려준다. 봇은 열지 않아도 이벤트로 가끔 온다)
export function autoMeet(s) { return canMeet(s) ? null : fanMeetScene(s); }
// 숨은 값 없이 '감'으로 고르는 좋은 컨셉(내 취미·투잡·매력·회사 사정 반영)
export function bestConcept(s) {
  let best = null, bv = -1;
  for (const topic of Object.keys(TOPICS)) for (const tone of Object.keys(TONES)) for (const fm of Object.keys(FMTS)) for (const face of Object.keys(FACES)) {
    const cc = { topic, tone, fmt: fm, face }, m = market(s, cc, false); let v = spF(m) * Math.sqrt(m.d);
    const T = TOPICS[topic]; if ((T.hobby && (s.hb?.joined || []).some((h) => T.hobby.includes(h))) || (T.job && s.sj?.active?.includes(T.job))) v *= 1.1;
    if (face === "face") v *= company(s) ? 0.9 : 1 + Math.max(0, (s.st.charm || 0) - 40) / 400;
    if (FMTS[fm].ap > 1) v *= 0.85; // 품이 크면 약속 지키기 어렵다
    if (v > bv) { bv = v; best = cc; }
  }
  return best;
}

// ───────── 시험용(#auto6-instatest) ─────────
export function testInbox(s, r) { const I = ens(s); I.inbox = makeInbox(s, r, s.t); return I.inbox; }
export function testDm(s, r, k, oid) { const I = ens(s); if (k === "hidead") { if (!I.offers.length) addOffer(s, r); return addDm(s, r, k, { oid: oid ?? I.offers[0].id }); } if (k === "celeb") { const who = Object.keys(CELEBS).find((id) => CHAR[id]) || "s001"; return addDm(s, r, "celeb", { who, tx: CELEB_TX[who] }); } if (k === "revise" && !I.offers.length) addOffer(s, r); return addDm(s, r, k); }
// 특이 요소 시험: 장면 3종(팬 모임·정지·적발)을 강제로 만든다
export function testF30(s, r, k) {
  const I = ens(s);
  if (k === "meet") { I.f = Math.max(I.f, 12000); I.fan = Math.max(I.fan, 85); I.meetT = -99; return fanMeetScene(s); }
  if (k === "ban") { I.f = Math.max(I.f, 9000); return banScene(s); }
  if (k === "ad") { if (!I.hidAds.length) I.hidAds.push({ t: s.t, p: 1, pay: Math.round(dealPay(s) * F30.ad.mul), nm: "시험 브랜드" }); return adCaughtScene(s); }
  return null;
}
export function testScenes(s, r) {
  const I = ens(s); const keep = JSON.stringify({ ev: I.ev, scamClick: I.scamClick, tired: I.tired });
  I.tired = 20; I.scamClick = 1; if (!I.trend) I.trend = { topic: I.cc.topic, fmt: I.cc.fmt, next: s.t + 6, n: 0 };
  const out = evList(s, r).map((e) => { try { return e.mk(); } catch (x) { console.warn("[인별 시험]", e.id, x); return null; } }).filter(Boolean);
  out.push(trendScene(s), collabScene(s, r, "s003"), brandScene(s), adCaughtScene(s));
  const sv = { cons: I.cons, cc: { ...I.cc }, eraT: I.eraT }; I.cons = 90; I.cc.topic = I.trend.topic; I.ccAge = 6; I.eraT = -99; I.f = Math.max(I.f, 5000);
  let era = null; for (let g = 0; g < 200 && !era; g++) era = eraJackpot(s, r);
  Object.assign(I, { cons: sv.cons, cc: sv.cc }); sync(I); if (era) out.push(era);
  Object.assign(I, JSON.parse(keep));
  return out;
}
