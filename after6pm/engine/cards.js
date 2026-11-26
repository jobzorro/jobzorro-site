// After 6PM v4.25 · 성장 카드(연말 결산 3장 중 1장 · 이벤트 조각 5개 = 1장 · 카드팩 5장 중 1장)
// - 등급: 일반 60% · 희귀 28% · 영웅 10% · 전설 2%. 그해 성적(파이어 진척·연말 평가)이 좋으면 희귀 이상이 잘 나온다.
// - 같은 카드가 또 나오면 한 단계 강해진다(최대 3단계, 효과 1 → 1.5 → 2배). 바로 쓰는 카드(능력치 +4 등)는 고를 때마다 다시 적용.
// - 카드팩: 게임 속 현금 500만(물가 반영), 한 해 2팩까지. 광고 보기 무료 팩은 하루 1개(실제 날짜는 화면 쪽 localStorage).
//   카드팩 전설 칸에서만 최종 아이템이 나온다(연말·조각 카드에서는 안 나옴).
// - 저장: s.gc = { v, own:{id:단계}, shards, offers:[{src, list:[{k:"c"|"i", id, g}]}], packY:{년:개수}, tmp:[{m, until}], guard, got:{길:개수}, picks }
// - 효과: extraMods(s) 를 core.js mod()/growMult 가 성향·특전 카드 뒤에 이어서 읽는다.
// - 난수는 엔진의 r(makeRng)만 받는다.
import * as D from "./defs.js";
const CORE_statCap = (s) => Math.min(D.STAT_MAX, D.STAT_CAP0 + D.STAT_CAP_NG * Math.max(0, (s?.ng?.n || 1) - 1)); // 능력치 천장(core.statCap 과 같은 식, 지금은 회차와 상관없이 200)
import * as IT from "./items.js";
import { makeRng } from "./rng.js";
// 카드 전용 난수(엔진 makeRng, 저장 s.gc.rs): 카드를 뽑아도 본 판의 난수 흐름이 바뀌지 않게. 받은 r 은 쓰지 않는다
export function rng(s) { const g = ensure(s); if (!g.rs) g.rs = { v: ((s.rs?.v || 1) ^ 0x9e3779b9) >>> 0 }; return makeRng(g.rs); }
export function luckyShard(s, p) { return rng(s).chance(p) ? addShard(s, null, 1) : []; }

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const GRADE = { c: "일반", r: "희귀", h: "영웅", l: "전설" };
export const GRADE_W = { c: 60, r: 28, h: 10, l: 2 };
export const PACK = { cash: 500, perYear: 2, size: 5 };
export const SHARD_N = 5;
const MAXLV = 3;

// 카드: g 등급, m 영구 효과, now 고를 때 바로(능력치·돈·스태미너·멘탈), tmp 기간 효과 [m, 달], job 그 투잡을 할 때만 나옴, guard 번아웃 막기 횟수
const K = (id, g, n, d, o = {}) => ({ id, g, n, d, ...o });
const ST = (k, v) => ({ stat: { [k]: v } });
export const CARDS = [
  // ── 일반 20 ──
  K("c_talk", "c", "발표 연습", "말빨 +4", { now: ST("talk", 4) }),
  K("c_write", "c", "필사 노트", "글쓰기 +4", { now: ST("write", 4) }),
  K("c_sense", "c", "전시회 나들이", "감각 +4", { now: ST("sense", 4) }),
  K("c_mkt", "c", "광고 분석", "마케팅 +4", { now: ST("mkt", 4) }),
  K("c_hands", "c", "원데이 클래스", "손재주 +4", { now: ST("hands", 4) }),
  K("c_num", "c", "엑셀 단축키", "숫자 +4", { now: ST("num", 4) }),
  K("c_career", "c", "직무 세미나", "커리어 +4", { now: ST("career", 4) }),
  K("c_charm", "c", "인생 헤어숍", "매력 +4", { now: ST("charm", 4) }),
  K("c_body", "c", "주 3회 러닝", "체력 +4", { now: ST("body", 4) }),
  K("c_lang", "c", "회화 스터디", "외국어 +4", { now: ST("lang", 4) }),
  K("c_ap", "c", "새해 다짐", "앞으로 12달 행동력 +1", { tmp: [{ apBonus: 1 }, 12] }),
  K("c_rest", "c", "푹 잔 연휴", "스태미너 가득, 멘탈 +10", { now: { hp: 999, mental: 10 } }),
  K("c_diary", "c", "감사 일기", "앞으로 12달 매달 멘탈 +1", { tmp: [{ monthMental: 1 }, 12] }),
  K("c_refund", "c", "연말정산 환급", "현금 +100만(물가 반영)", { now: { cash: 100 } }),
  K("c_budget", "c", "가계부 앱", "생활비 −1%", { m: { livingMult: 0.99 } }),
  K("c_hello", "c", "안부 문자", "호감 오름 +3%", { m: { affMult: 1.03 } }),
  K("c_stretch", "c", "아침 스트레칭", "앞으로 12달 스태미너 회복 +1", { tmp: [{ hpRec: 1 }, 12] }),
  K("c_leave", "c", "칼퇴의 기술", "회사 눈치 −3%", { m: { eyeMult: 0.97 } }),
  K("c_report", "c", "보고서 틀", "회사 성과 +3%", { m: { perfMult: 1.03 } }),
  K("c_gift", "c", "선물 고수", "선물·데이트 효과 +8%", { m: { giftMult: 1.08 } }),
  // ── 희귀 15 ──
  K("r_pr", "r", "인생샷 조명", "파티룸 별점 +0.015", { job: "pr", m: { star: 0.015 } }),
  K("r_cs", "r", "합격 수기 모음", "합격률 +0.4%p, 소개 +3%", { job: "cs", m: { passBonus: 0.004, referMult: 1.03 } }),
  K("r_insta", "r", "알고리즘 노트", "팔로워 증가 +3%", { job: "insta", m: { instaMult: 1.03 } }),
  K("r_ab", "r", "다국어 안내문", "숙소 별점 +0.015, 외국어 응대 +5%", { job: "airbnb", m: { abStar: 0.015, abLang: 1.05 } }),
  K("r_uc", "r", "단골 스탬프", "무인카페 단골 +2%", { job: "ucafe", m: { ucRepeat: 1.02 } }),
  K("r_tr", "r", "타로 상담 노트", "타로 손님 +3%", { job: "tarot", m: { trMult: 1.03 } }),
  K("r_wn", "r", "연재 루틴", "웹소설 유료 수익 +3%", { job: "webnovel", m: { wnPay: 1.03 } }),
  K("r_tu", "r", "학부모 단톡방", "학부모 신뢰 +3, 소개 +5%", { job: "tutoring", m: { tuPar: 3, tuRefer: 1.05 } }),
  K("r_ps", "r", "사진 세 장 규칙", "펫시팅 새 가구 신뢰 +3, 문의 +5%", { job: "petsit", m: { psTrust: 3, psInq: 1.05 } }),
  K("r_ch", "r", "비밀 염지 레시피", "치킨 별점 +0.015", { job: "chicken", m: { chStar: 0.015 } }),
  K("r_vb", "r", "코드 조각 모음", "개발 단가 +3%", { job: "vibe", m: { vbPrice: 1.03 } }),
  K("r_aff", "r", "호감 체질", "호감 오름 +10%", { m: { affMult: 1.1 } }),
  K("r_study", "r", "공부 습관", "글쓰기·숫자·커리어 성장 +8%", { m: { growMult: { write: 1.08, num: 1.08, career: 1.08 } } }),
  K("r_pace", "r", "체력 안배", "행동 스태미너 소모 −3%", { m: { hpCostMult: 0.97 } }),
  K("r_tax", "r", "절세 노트", "종합소득세 −8%", { m: { taxMult: 0.92 } }),
  K("r_boss", "r", "상사의 신뢰", "승진 확률 +, 연말 평가 +", { m: { promoBonus: 0.02, gradeBonus: 0.1 } }),
  // ── 영웅 10 ──
  K("h_shield", "h", "마음의 방패", "번아웃을 한 번 막아 준다", { guard: 1 }),
  K("h_morning", "h", "아침형 루틴", "앞으로 12달 행동력 +1", { tmp: [{ apBonus: 1 }, 12] }),
  K("h_muscle", "h", "투잡 근육", "앞으로 24달 투잡 행동 스태미너 −1", { tmp: [{ sideHp: -1 }, 24] }),
  K("h_minimal", "h", "미니멀 라이프", "생활비 −2%", { m: { livingMult: 0.98 } }),
  K("h_cloak", "h", "투명 망토", "회사 눈치 −12%", { m: { eyeMult: 0.88 } }),
  K("h_stars", "h", "별점 수호자", "파티룸 별점 하락 −15%, 숙소·치킨 별점 +0.01", { m: { ratingGuard: 0.85, abStar: 0.01, chStar: 0.01 } }),
  K("h_viral", "h", "떡상 예감", "떡상·입소문 확률 +8%", { m: { instaViral: 1.08, viralMult: 1.08, wnBuzz: 1.04 } }),
  K("h_steel", "h", "단단한 멘탈", "매달 멘탈 +0.5", { m: { monthMental: 0.5 } }),
  K("h_break", "h", "벽 깨기", "가장 높은 능력치 6달 돌파 중(높은 구간이 덜 막힘)", { now: { brk: "top" } }),
  K("h_heal", "h", "회복 체질", "앞으로 24달 스태미너 회복 +2", { tmp: [{ hpRec: 2 }, 24] }),
  // ── 전설 5 ──
  K("l_day25", "l", "하루 25시간", "앞으로 36달 행동력 +1", { tmp: [{ apBonus: 1 }, 36] }),
  K("l_star", "l", "행운의 별", "연말 평가·승진 +, 매달 멘탈 +1", { m: { gradeBonus: 0.2, promoBonus: 0.03, monthMental: 1 } }),
  K("l_fans", "l", "팬클럽", "모든 투잡 손님·별점 조금씩 +", { m: { referMult: 1.06, instaMult: 1.03, trLead: 1.04, tuRefer: 1.06, wnBuzz: 1.06, ucRepeat: 1.02, abStar: 0.01, star: 0.01, chStar: 0.01, vbPrice: 1.02 } }),
  K("l_master", "l", "투잡의 신", "행동 스태미너 소모 −5%", { m: { hpCostMult: 0.95 } }),
  K("l_owner", "l", "건물주의 꿈", "파티룸 고정비 −6%, 생활비 −2%", { m: { prCost: 0.94, livingMult: 0.98 } }),
];
export const BY = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const COUNT = CARDS.reduce((a, c) => ((a[c.g] = (a[c.g] || 0) + 1), a), {});

export function ensure(s) {
  const g = (s.gc = s.gc || {});
  g.v = g.v || 0; g.own = g.own || {}; g.shards = g.shards || 0; g.offers = g.offers || []; g.packY = g.packY || {}; g.tmp = g.tmp || []; g.guard = g.guard || 0; g.got = g.got || {}; g.picks = g.picks || 0;
  IT.ensure(s); return g;
}
const scale = (lv) => 1 + 0.25 * (Math.max(1, lv) - 1); // 1 → 1.3 → 1.6배(200판: 파이어 +3%p 안쪽)
function scaleM(m, f) {
  if (f === 1) return m; const o = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === "growMult") { o[k] = Object.fromEntries(Object.entries(v).map(([a, b]) => [a, 1 + (b - 1) * f])); continue; }
    if (typeof v !== "number") { o[k] = v; continue; }
    o[k] = MULT_KEYS.has(k) ? 1 + (v - 1) * f : INT_KEYS.has(k) ? Math.round(v * f) : v * f;
  }
  return o;
}
// 곱하는 키(def 1). 나머지 숫자는 더하는 키(def 0). 행동력·스태미너 칸은 정수로
const INT_KEYS = new Set(["apBonus", "sideHp"]);
const MULT_KEYS = new Set(["livingMult", "affMult", "eyeMult", "perfMult", "giftMult", "referMult", "instaMult", "abLang", "ucRepeat", "trMult", "wnPay", "tuRefer", "vbPrice", "hpCostMult", "taxMult", "ratingGuard", "instaViral", "viralMult", "wnBuzz", "trLead", "prCost"]);

// 효과 모음(아이템 + 세트 + 카드 + 기간 효과). 바뀔 때만 다시 만든다
const CACHE = new WeakMap();
export function extraMods(s) {
  const g = s.gc; if (!g && !s.items) return [];
  const key = `${g?.v || 0}|${s.t}|${Object.keys(s.items || {}).length}`;
  const c = CACHE.get(s); if (c && c.key === key) return c.list;
  const list = IT.itemMods(s);
  if (g) {
    for (const [id, lv] of Object.entries(g.own || {})) { const k = BY[id]; if (k?.m) list.push({ m: scaleM(k.m, scale(lv)) }); }
    for (const x of g.tmp || []) if (x.until > s.t) list.push({ m: x.m });
  }
  CACHE.set(s, { key, list }); return list;
}

// 번아웃 막기(core.js bodyMonth 에서 멘탈 5 이하일 때 부른다). 막으면 true
export function burnGuard(s) { const g = s.gc; if (!g || !(g.guard > 0)) return false; g.guard--; g.v++; return true; }

// ── 뽑기 ──
function weights(luck = 0) { const L = clamp(luck, 0, 1); return [["c", GRADE_W.c - 20 * L], ["r", GRADE_W.r + 11 * L], ["h", GRADE_W.h + 7 * L], ["l", GRADE_W.l + 2 * L]]; }
function jobsOf(s) { return new Set([...(s.sj?.active || []), ...Object.keys(s.sj?.found || {})]); }
function poolOf(s, g, taken) {
  const own = s.gc?.own || {}, js = jobsOf(s);
  return CARDS.filter((c) => c.g === g && !taken.has(c.id) && (own[c.id] || 0) < MAXLV && (!c.job || js.has(c.job)));
}
function drawCard(s, r, w, taken) {
  for (let i = 0; i < 6; i++) {
    const g = r.weighted(w); const pool = poolOf(s, g, taken);
    if (pool.length) { const c = pool[Math.floor(r.next() * pool.length)]; taken.add(c.id); return { k: "c", id: c.id, g }; }
  }
  const any = CARDS.filter((c) => !taken.has(c.id) && (!c.job || jobsOf(s).has(c.job))); const c = any[Math.floor(r.next() * any.length)] || CARDS[0]; taken.add(c.id); return { k: "c", id: c.id, g: c.g };
}
// 아이템 칸(카드 대신 아이템): 하고 있는 투잡 장비(없는 것) 또는 소모품
function drawItem(s, r) {
  const act = s.sj?.active || [];
  if (act.length && r.chance(0.55)) { const j = act[Math.floor(r.next() * act.length)]; const id = IT.pickGear(s, r, j); if (id) return { k: "i", id, g: "r" }; }
  const cons = IT.ALL.filter((x) => x.cat === "cons" && x.how.includes("card"));
  return { k: "i", id: cons[Math.floor(r.next() * cons.length)].id, g: "c" };
}
function makeOffer(s, r, src, n, luck, opt = {}) {
  const w = weights(luck), taken = new Set(), list = [];
  for (let i = 0; i < n; i++) {
    if (opt.itemP && r.chance(opt.itemP)) { list.push(drawItem(s, r)); continue; }
    const c = drawCard(s, r, w, taken);
    if (opt.final && c.g === "l" && r.chance(0.45)) { const f = IT.ALL.filter((x) => x.cat === "final" && s.items?.[x.id] === undefined); if (f.length) { list.push({ k: "i", id: f[Math.floor(r.next() * f.length)].id, g: "l" }); continue; } }
    list.push(c);
  }
  return { src, t: s.t, list };
}
function queue(s, o) {
  const g = ensure(s);
  while (g.offers.length >= 4) pick(s, 0, bestIdx(g.offers[0])); // 너무 쌓이면 가장 오래된 것을 자동으로(좋은 것)
  g.offers.push(o); g.v++;
  return o;
}

// 연말 결산: 그해 성적으로 운을 정한다. d = yearend.js yearData 결과
export function yearLuck(d) {
  if (!d) return 0;
  const fireUp = clamp(((d.fire || 0) - (d.fire0 || 0)) / 0.06, 0, 1) * 0.55;
  const g = d.ev?.g || "", gb = /S/.test(g) ? 0.45 : /A/.test(g) ? 0.3 : /B/.test(g) ? 0.1 : 0;
  const nwUp = d.nw > d.nw0 ? 0.1 : 0;
  return clamp(fireUp + gb + nwUp, 0, 1);
}
export function yearOffer(s, r, d) {
  r = rng(s);
  ensure(s); const luck = yearLuck(d); const o = makeOffer(s, r, "year", 3, luck, { itemP: 0.12 }); o.luck = +luck.toFixed(2);
  if (/S/.test(d?.ev?.g || "") && s.items.m_award === undefined) { IT.grant(s, "m_award", "ev"); o.note = "연말 평가 S: 기념품 '사내 표창장'을 받았어요"; } // 기념품(이벤트)
  return queue(s, o);
}

// 조각: 이벤트 eff.shard · 소모품 행운 부적. 5개가 모이면 카드 1장(3장 중 1장)
export function addShard(s, r, n = 1) {
  r = rng(s);
  const g = ensure(s); g.shards += n; g.v++; (g.got.shard = (g.got.shard || 0) + n);
  const out = [`카드 조각 +${n} (${Math.min(g.shards, SHARD_N)}/${SHARD_N})`];
  while (g.shards >= SHARD_N) { g.shards -= SHARD_N; queue(s, makeOffer(s, r, "shard", 3, 0.15)); out.push("조각 5개! 카드 1장 고르기"); }
  return out;
}

// 카드팩
export function packPrice(s) { return Math.round(PACK.cash * Math.max(1, s.pi || 1) / 10) * 10; }
export function packLeft(s) { const g = ensure(s); return Math.max(0, PACK.perYear - (g.packY[s.year] || 0)); }
export function openPack(s, r, opt = {}, H = {}) {
  r = rng(s);
  const g = ensure(s);
  if (g.offers.some((o) => o.src === "pack" || o.src === "ad")) return { ok: false, msg: "먼저 열어 둔 팩에서 카드를 고르세요" };
  if (!opt.free) {
    if (packLeft(s) <= 0) return { ok: false, msg: `카드팩은 한 해 ${PACK.perYear}팩까지예요` };
    const p = packPrice(s); if (s.cash - p < -(H.creditRoom || 0)) return { ok: false, msg: "돈이 모자라요" };
    s.cash -= p; H.addMoney?.(s, "exp", "카드팩", p); g.packY[s.year] = (g.packY[s.year] || 0) + 1;
  }
  g.got.packs = (g.got.packs || 0) + 1;
  const o = queue(s, makeOffer(s, r, opt.free ? "ad" : "pack", PACK.size, 0, { final: true, itemP: 0.1 }));
  return { ok: true, offer: o, msg: opt.free ? "무료 카드팩" : `카드팩 · ${packPrice(s)}만` };
}

// 고르기: offers[oi] 의 i 번째. 돌려주는 값 { ok, lines, card|item, lv }
export function pick(s, oi, i) {
  const g = ensure(s), o = g.offers[oi]; if (!o) return { ok: false, lines: [] };
  const e = o.list[Math.max(0, Math.min(o.list.length - 1, i | 0))];
  g.offers.splice(oi, 1); g.v++; g.picks++;
  if (e.k === "i") { const res = IT.grant(s, e.id, o.src === "pack" || o.src === "ad" ? "pack" : "card"); const lines = [res.line]; if (res.dup) lines.push(...shardOnly(s, 2)); return { ok: true, lines, item: IT.BY[e.id], src: o.src }; }
  const c = BY[e.id]; const lv = Math.min(MAXLV, (g.own[c.id] || 0) + 1); g.own[c.id] = lv;
  const f = scale(lv), lines = [`${GRADE[c.g]} · ${c.n}${lv > 1 ? ` ${lv}단계` : ""}`];
  if (c.now) lines.push(...applyNow(s, c.now, f));
  if (c.tmp) { g.tmp = g.tmp.filter((x) => x.until > s.t && x.id !== c.id); g.tmp.push({ id: c.id, m: scaleM(c.tmp[0], f), until: s.t + c.tmp[1] }); lines.push(c.d); }
  if (c.guard) { g.guard += c.guard; lines.push(`번아웃 막기 ${g.guard}번 남음`); }
  if (c.m) lines.push(lv > 1 ? `효과 ${f}배: ${c.d}` : c.d);
  return { ok: true, lines, card: c, lv, src: o.src };
}
function shardOnly(s, n) { const g = ensure(s); g.shards += n; return [`카드 조각 +${n}`]; }
function applyNow(s, now, f) {
  const out = [];
  if (now.stat) for (const [k, v] of Object.entries(now.stat)) { if (s.st?.[k] === undefined) continue; const hz = s.st[k] >= 180 ? 0.25 : s.st[k] >= 150 ? 0.5 : 1; /* v4.28c 카드 +N 은 높은 구간에서 줄어든다(전설 200은 귀하게) */ const a = Math.round(v * f * hz * 10) / 10; s.st[k] = clamp(s.st[k] + a, 0, CORE_statCap(s)); out.push(`${D.STATS[k]} +${a}`); }
  if (now.brk) { const k = now.brk === "top" ? Object.keys(D.STATS).sort((a, b) => (s.st?.[b] || 0) - (s.st?.[a] || 0))[0] : now.brk; s.brk = s.brk || {}; s.brk[k] = Math.max(s.brk[k] ?? -1, s.t + D.STAT_BRK.months); out.push(`${D.STATS[k]} 돌파 중 ${D.STAT_BRK.months}달`); } // v4.28
  if (now.hp) { s.hp = clamp((s.hp || 0) + now.hp, 0, s.hpMax || 100); out.push(now.hp >= 999 ? "스태미너 가득" : `스태미너 +${now.hp}`); }
  if (now.mental) { const a = Math.round(now.mental * f); s.mental = clamp((s.mental || 0) + a, 0, 100); out.push(`멘탈 +${a}`); }
  if (now.cash) { const a = Math.round(now.cash * f * Math.max(1, s.pi || 1)); s.cash += a; out.push(`현금 +${a}만`); }
  return out;
}
// 봇·자동 고르기용: 등급 높은 것 → 영구 효과 → 첫 칸
const GR = { l: 4, h: 3, r: 2, c: 1 };
export function bestIdx(o) { let b = 0, bv = -1; (o?.list || []).forEach((e, i) => { const v = GR[e.g] * 10 + (e.k === "i" && IT.BY[e.id]?.cat === "final" ? 5 : 0) + (BY[e.id]?.m ? 2 : 0); if (v > bv) { bv = v; b = i; } }); return b; }

// 미니게임 대성공 보상: 35% 소모품, 그중 일부는 그 투잡 장비. 돌려주는 값: 줄 목록
export function mgReward(s, r, job) {
  r = rng(s);
  ensure(s); if (!r.chance(0.35)) return [];
  const gear = r.chance(0.3) ? IT.pickGear(s, r, job) : null;
  const id = gear || (() => { const c = IT.ALL.filter((x) => x.cat === "cons" && x.how.includes("mg")); return c[Math.floor(r.next() * c.length)].id; })();
  return [`미니게임 대성공 보상 · ${IT.grant(s, id, "mg").line.replace(/^🎁 /, "")}`];
}
// 라이벌 승부 보상(engine/rival.js 승리·폐업 지점에서 부른다): 그 투잡 장비, 다 있으면 조각 2
export function rivalReward(s, r, job) {
  r = rng(s);
  ensure(s); const id = IT.pickGear(s, r, job);
  if (id) return [`라이벌을 이긴 전리품 · ${IT.grant(s, id, "rival").line.replace(/^🎁 /, "")}`];
  return addShard(s, r, 2);
}
// 인연 선물: 호감 80+ 인연이 생일(사람마다 정해진 달)·명절(2월 설, 9월 추석)에 가끔 선물. core.js endMonth 에서 매달
const BDAY = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 1 + (h % 12); };
export function giftMonth(s, r, notes, nameOf) {
  r = rng(s);
  ensure(s); if (s.over) return;
  const holiday = s.cal === 2 || s.cal === 9;
  const cands = Object.entries(s.rel || {}).filter(([id, x]) => (x.aff || 0) >= 80 && (holiday || BDAY(id) === s.cal));
  if (!cands.length || (s.gc.giftT ?? -99) >= s.t - 3) return; // 석 달에 한 번까지
  if (!r.chance(Math.min(0.3, 0.1 + cands.length * 0.04))) return;
  const [id] = cands[Math.floor(r.next() * cands.length)];
  const pool = IT.ALL.filter((x) => x.cat === "cons" && x.how.includes("gift"));
  let it = pool[Math.floor(r.next() * pool.length)].id;
  if (s.items?.m_letter === undefined && r.chance(0.08)) it = "m_letter";
  const res = IT.grant(s, it, "gift"); s.gc.giftT = s.t;
  notes.push(`${nameOf?.(id) || "인연"}의 ${holiday ? "명절" : "생일 답례"} 선물: ${IT.BY[it].n}${res.dup ? " (조각으로)" : ""}`);
  if (res.dup) shardOnly(s, 1);
}

// 화면용: 내 카드 목록
export function myCards(s) { const g = ensure(s); return Object.entries(g.own).map(([id, lv]) => ({ ...BY[id], lv })).filter((c) => c.id).sort((a, b) => GR[b.g] - GR[a.g] || b.lv - a.lv); }
export function itemOf(id) { return IT.BY[id]; }
