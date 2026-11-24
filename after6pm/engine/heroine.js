// 히로인·히어로 이야기(11-25). 자료: data/heroine/<id>.json → GEN.HEROINE (꼴은 SCHEMA.md 6-1)
// - 인생 시계: 그 사람의 인생 사건(life)은 새 판을 만들 때 달이 정해지고(씨앗 해시. 엔진 난수 s.rs 를 쓰지 않는다), 내가 알든 모르든 그 달에 일어난다.
//   사이에 따라 장면(같이 겪는다) · 까톡 한 통 · 달 마감 소식 한 줄로 전해진다. 모르는 사이면 아무것도 안 뜬다.
// - 장면(beats)과 갈림길(fork): 조건(need)·표시(who)·뜨는 길(from)을 자료가 정한다. 선택 처리 이름은 hl_ 로 시작한다.
// - 결말(end): together 함께 · far 멀리서 이어 감(지도에서 사라짐) · letgo 보내 줌 · stay 붙잡아 남음 · with 같이 내려감. 연인·배우자가 아니면 그 사람이 혼자 정한다(life.solo).
// - 저장: s.hl[id] = { plan{열쇠:일어날 달}, L{열쇠:일어난 달}, B{장면:고른 번호}, BT{장면:본 달}, BN{장면:본 횟수}, mem{기억:달}, bT, end, endT, away, home, sp, due, loans[], lock{}, saw[], exRe } · s.hlx = { sT }
import * as GEN from "../gen/data.js";
import * as D from "./defs.js";
import * as RD from "./round.js";
import { hashStr } from "./rng.js";
import { CHAR, addAff, addMoney, isRomanceable, heartOpen, ensureRel, log, jo, creditRoom, partLove, weddingScene, START_BOND, BOND_N } from "./core.js";

export const DEF = GEN.HEROINE || {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const HLV = { gap: 2, within: 3, chatAff: 20, exGap: 18, keep: 55, visit: { ap: 2, cash: 15, aff: 8, mental: 4 }, farMiss: 3, farTrip: { cash: 200, gap: 12 } };
const arr = (v) => (v == null ? [] : [].concat(v));
const box = (s) => (s.hlx = s.hlx || { sT: -9 });
const pickAt = (seed, key, lo, hi) => lo + (hashStr(String(seed) + ":hl:" + key) % Math.max(1, hi - lo + 1));
const fillMe = (s, t) => String(t || "").replace(/\{me\}/g, s.me?.name || "나");
const txt = (s, id, v) => { if (Array.isArray(v)) { for (const e of v) if (needOk(s, id, e.need)) return fillMe(s, e.text); return ""; } return fillMe(s, v); }; // 글 한 줄 또는 [{ need, text }] 가운데 조건이 맞는 첫 줄
const myLove = (s, except) => Object.entries(s.rel || {}).some(([q, x]) => q !== except && (x.lover || x.spouse));
const BCACHE = {};
export function beatsOf(id) { // 재회 장면(past.scene) → 장면들 → 갈림길 순서로 한 줄에 세운다
  if (BCACHE[id]) return BCACHE[id]; const d = DEF[id]; if (!d) return [];
  const L = [];
  if (d.past?.scene) L.push({ k: "RE", who: "any", tag: "재회", from: ["talk", "meetup"], nogap: true, ...d.past.scene, need: { ...(d.past.scene.need || {}), bond: true } });
  for (const b of d.beats || []) L.push(b);
  if (d.fork) L.push({ k: "F", fork: true, who: "lover", from: ["month"], ...d.fork });
  return (BCACHE[id] = L);
}
export const _flush = () => { for (const k of Object.keys(BCACHE)) delete BCACHE[k]; }; // 시험용: 자료를 바꿔 끼운 뒤 장면 줄을 다시 세운다
export const st = (s, id) => s.hl?.[id] || null;
export const isAway = (s, id) => { const H = s.hl?.[id]; if (!H || H.away == null) return false; return H.away === -1 || typeof H.away === "string" || H.away > s.t; };
export const isHidden = (s, id) => isAway(s, id) || !!s.hl?.[id]?.home; // 지도에 세우지 않는다
/* 3단계 인사말(lines.hello3·busy3)을 써도 되는가: 자료에 h3(사건 열쇠)가 있으면 그 사건 뒤에만. 없으면 예전대로(null) */
export const h3ok = (s, id) => { const k = DEF[id]?.h3; if (!k || !s?.hl?.[id]) return null; return s.hl[id].L?.[k] != null; };
export const noBond = (id) => !!DEF[id]?.nobond; // 시작 인맥으로 뽑지 않는 사람(온 지 얼마 안 된 외국인 등)

// ── 새 판: 꼭 나오는 사람을 등장 인물에 넣는다(무작위로 뽑힌 사람 중 맨 뒤부터 자리를 바꾼다. 엔진 난수를 더 쓰지 않는다)
export function castIn(s, ok) {
  const must = Object.keys(DEF).filter((id) => DEF[id].must && CHAR[id] && ok(CHAR[id]) && !s.cast.includes(id));
  let j = s.cast.length - 1;
  for (const id of must) { while (j >= 0 && DEF[s.cast[j]]) j--; if (j < 0) s.cast.push(id); else s.cast[j--] = id; }
}
// 재회형을 시작 인맥에 먼저 배정한다. 돌려주는 값: { club: 1 } 처럼 쓴 자리 수
export function bondIn(s, used) {
  const out = {};
  for (const [id, d] of Object.entries(DEF)) {
    const P = d.past; if (!P || P.for !== s.me.gender || !CHAR[id] || !s.cast.includes(id) || used.has(id)) continue;
    used.add(id); const x = ensureRel(s, id); x.aff = Math.max(x.aff, P.aff ?? START_BOND[P.bond] ?? 30); x.bond = P.bond; out[P.bond] = (out[P.bond] || 0) + 1;
  }
  return out;
}
export const bondLabel = (s, id) => { const x = s.rel?.[id], P = DEF[id]?.past; if (!x?.bond) return ""; return P && P.for === s.me.gender && P.bond === x.bond && P.label ? P.label : BOND_N[x.bond] || ""; };

// ── 인생 시계 만들기·옛 저장 채우기. 자료에 사건이 새로 생기면 그 사건만 달을 정한다(이미 지난 구간이면 소식 없이 지난 것으로 적는다)
export function ensure(s) {
  s.hl = s.hl || {}; box(s);
  for (const [id, d] of Object.entries(DEF)) {
    if (!CHAR[id] || !(s.cast || []).includes(id)) continue;
    const H = (s.hl[id] = s.hl[id] || {}); H.plan = H.plan || {}; H.L = H.L || {}; H.B = H.B || {}; H.mem = H.mem || {};
    for (const ev of d.life || []) {
      if (H.plan[ev.k] != null || !Array.isArray(ev.at)) continue;
      H.plan[ev.k] = ev.sync ? ev.at[1] : pickAt(s.seed, id + ":" + ev.k, ev.at[0], ev.at[1]); // sync: 구간 끝에 잡아 두고 그 일이 생긴 달로 당긴다(month)
      if (H.plan[ev.k] < s.t) fire(s, id, ev, null, null, true);
    }
  }
}
function setAway(H, v, t0) { if (v == null) return; if (v === 0 || v === false) { delete H.away; return; } H.away = typeof v === "number" && v > 0 ? t0 + v : v; } // 달 수 · −1(기한 없음) · "L3"(그 사건이 날 때까지)
function fire(s, id, ev, notes, scenes, silent) {
  const d = DEF[id], H = s.hl[id], c = CHAR[id], x = s.rel?.[id];
  const t0 = (H.L[ev.k] = silent ? H.plan[ev.k] : s.t);
  if (H.away === ev.k || ev.back) delete H.away;
  if (ev.away != null) setAway(H, ev.away, t0);
  if (silent && typeof H.away === "number" && H.away > 0 && H.away <= s.t) delete H.away; // 옛 저장: 이미 돌아와 있다
  if (ev.solo && H.end == null) H.sp = ev.k; // 혼자 정할 일이 생겼다(연인·배우자면 갈림길이 묻는다)
  if (silent) { if (H.sp) soloApply(s, id, null, true); return; }
  if (!x) return;
  (H.saw = H.saw || []).push(ev.k);
  if (beatsOf(id).some((b) => (b.need?.at === ev.k || b.needBy?.month?.at === ev.k) && H.B[b.k] === undefined && ok(s, id, b, "month"))) { H.due = { k: ev.k, until: s.t + HLV.within }; return; } // 같이 겪는 장면이 있다: 장면 고르기가 맡는다(석 달 안에 못 뜨면 까톡·소식으로 낮춘다)
  tell(s, id, ev, notes, scenes);
}
function tell(s, id, ev, notes, scenes) { // 까톡 한 통(호감 20부터) 또는 소식 한 줄
  const x = s.rel?.[id], c = CHAR[id]; if (!x || !c) return;
  if (ev.chat?.msg?.length && ev.chat.opts?.length && x.aff >= HLV.chatAff && scenes && !scenes.some((q) => q.chat)) { scenes.push(chatScene(s, id, ev)); return; }
  const nw = txt(s, id, ev.news); if (nw) { if (notes) notes.push(nw); log(s, nw, "love"); }
}
function chatScene(s, id, ev) {
  const c = CHAR[id], ch = ev.chat, Q = { 2: 2, 1: 1, 0: -1 };
  return { kind: "event", who: id, expr: "neutral", tag: "까톡", chat: true, chatF: true, title: `${c.name} · ${ch.time || "밤 9:40"}`, onChoose: "hl_chat", hlK: ev.k, text: (ch.msg || []).join("\n"), best: [],
    choices: [...(ch.opts || []).map((o) => ({ t: o.t, eff: { aff: Q[o.q] ?? 0 }, text: o.re })), { t: "답하지 않는다", eff: { aff: -1 }, text: ch.ignore || "읽고 답하지 않았다." }] };
}
function soloApply(s, id, notes, silent) { // 곁에 연인·배우자가 없으면 그 사람이 혼자 정한다
  const d = DEF[id], H = s.hl[id], ev = (d.life || []).find((e) => e.k === H.sp), So = ev?.solo; if (!So) { delete H.sp; return; }
  const x = s.rel?.[id]; if (x?.lover || x?.spouse) return; // 연인·배우자면 갈림길이 묻는다(옛 저장도 같다)
  if (!silent && s.t - (H.L[ev.k] ?? s.t) < (So.wait || 0)) return; // 사건이 나고 몇 달 뒤에 정한다
  H.end = So.end || "far"; H.endT = silent ? H.L[ev.k] : s.t; H.solo = 1; delete H.sp;
  if (So.shift) for (const [k, v] of Object.entries(So.shift)) if (H.plan?.[k] != null && H.L?.[k] == null) H.plan[k] = Math.max(s.t + 1, H.plan[k] + v);
  if (So.away != null) setAway(H, So.away, H.endT); else if (H.end === "far") H.away = -1;
  if (silent && typeof H.away === "number" && H.away > 0 && H.away <= s.t) delete H.away;
  const nw = !silent && x ? txt(s, id, So.news) : ""; if (nw) { if (notes) notes.push(nw); log(s, nw, "love"); }
}

// ── 지금 모습: 인생 단계와 결말 가운데 가장 나중 것의 글(job 직업 줄 · hello 인사말 · busy 바쁜 말 · now 요즘 한 줄)
export function cur(s, id, f) {
  const d = DEF[id], H = s.hl?.[id]; if (!d || !H) return "";
  let v = "", t = -1e9;
  for (const ev of d.life || []) if (H.L?.[ev.k] != null && ev[f] && H.L[ev.k] >= t && pick1(s, id, ev[f])) { v = ev[f]; t = H.L[ev.k]; }
  const en = endOf(s, id), E = en ? d.ends?.[en] : null, ef = E && (H.solo && E.solo?.[f] !== undefined ? E.solo[f] : E[f]);
  if (ef && (H.endT ?? H.wedT ?? 0) >= t) v = ef;
  return pick1(s, id, v);
}
/* 글 칸(job·now·hello·busy)은 한 줄이거나 [{ need, text }](조건이 맞는 첫 줄)일 수 있다. 사건 칸에 맞는 줄이 없으면 그 앞 사건 것을 쓴다 */
function pick1(s, id, v) { if (Array.isArray(v) && v.length && typeof v[0] === "object" && v[0] && "text" in v[0]) { for (const e of v) if (needOk(s, id, e.need)) return e.text; return ""; } return v; }
export const endOf = (s, id) => s.hl?.[id]?.end || (s.rel?.[id]?.spouse ? "together" : "");
export const jobOf = (s, id) => cur(s, id, "job") || CHAR[id]?.job || "";
export const hangs = (s, id) => { const v = cur(s, id, "hang"); return Array.isArray(v) && v.length ? v : null; };
export const nowOf = (s, id) => { const v = cur(s, id, "now"); return v || (isAway(s, id) ? "지금은 멀리 있다." : ""); };
export function meetPre(s, id) { const d = DEF[id], H = s.hl?.[id]; if (!d || !H) return ""; let v = ""; for (const ev of d.life || []) if (H.L?.[ev.k] != null && ev.meet) v = ev.meet; return v ? v + " " : ""; }
// 지금 자료의 글을 바꿔 쓸 한 벌(late.<열쇠>: { need, … } 또는 그 배열. 조건이 맞는 첫 줄)
export function late(s, id, key) { const L = DEF[id]?.late?.[key]; if (!L || !s.hl?.[id]) return null; for (const e of arr(L)) if (needOk(s, id, e.need)) return e; return null; }
export const arcText = (s, id, stage) => late(s, id, "arc" + stage)?.text || "";
export function confessFix(s, id, sc) { // 고백 장면: 무대를 옮긴 한 벌(late.confess)과 덧붙는 추억 줄(late.confessAdd)
  const L = late(s, id, "confess"); if (L) { if (L.title) sc.title = `${CHAR[id].name} · ${L.title}`; if (L.text) sc.text = L.text; }
  for (const e of arr(DEF[id]?.late?.confessAdd)) if (s.hl?.[id] && needOk(s, id, e.need)) sc.text += " " + e.text;
  return sc;
}
export const proposeText = (s, id) => late(s, id, "propose")?.text || "";
export function wedOpts(s, id) { // 결혼 장면에 더 붙는 선택지(자료 wed: [{ need, t, cost, family, mental, text }])
  if (!s.hl?.[id]) return [];
  return arr(DEF[id]?.wed).filter((w) => needOk(s, id, w.need)).map((w) => ({ t: w.t, eff: { cash: -(w.cost || 0), family: w.family || 0, ...(w.mental ? { mental: w.mental } : {}) }, text: w.text, wed: true }));
}
export const lockMsg = (s, id, k) => { const H = s.hl?.[id]; return H?.lock?.[k] > s.t ? DEF[id]?.lockMsg?.[k] || "지금은 기다리기로 한 일이에요" : ""; };
export const chatOk = (s, id, ch) => { const N = ch.hl || DEF[id]?.chatHl?.[ch.k]; return !N || (s.hl?.[id] && s.rel?.[id] ? needOk(s, id, N) : false); }; // 까톡의 인생 조건: 히로인 자료의 chats[].hl(새 까톡) · chatHl{까톡 열쇠: 조건}(chats.json 에 이미 있는 까톡)

// ── 조건
const JOB_AL = { consult: "cs", partyroom: "pr" };
function jobOn(s, k) { const A = s.sj?.active || []; return arr(k).some((q) => (q === "any" ? A.length > 0 : q === "space" ? A.some((j) => (D.SJ_SPACE || []).includes(j)) : A.includes(JOB_AL[q] || q))); }
const redMonth = (s) => { const h = s.hist || [], a = h[h.length - 1], b = h[h.length - 2]; return !!(a && b && a.nw < b.nw); }; // 지난달 순자산이 줄었다
export function needOk(s, id, N) {
  if (!N) return true;
  const H = s.hl?.[id], x = s.rel?.[id]; if (!H || !x) return false;
  const L = H.L || {}, since = (k) => (L[k] == null ? null : s.t - L[k]);
  if (N.or && !arr(N.or).some((q) => needOk(s, id, q))) return false;
  if (N.aff != null && x.aff < N.aff) return false;
  if (N.affMax != null && x.aff > N.affMax) return false;
  if (N.stage != null && (x.stage || 0) < N.stage) return false;
  if (N.t != null && s.t < N.t) return false;
  if (N.at) { const d = since(N.at); if (d == null || d > (N.within ?? HLV.within)) return false; }
  if (N.after) { const d = since(N.after); if (d == null || d < (N.afterM || 0) || (N.within != null && !N.at && d > N.within)) return false; }
  if (N.before) for (const k of arr(N.before)) if (L[k] != null) return false;
  if (N.pre) { const p = H.plan?.[N.pre]; if (p == null || L[N.pre] != null || p - s.t < 1 || p - s.t > (N.preM || 2)) return false; }
  if (N.lover != null) { const m = x.lover ? s.t - (x.loverSince ?? s.t) : x.spouse ? 999 : -1; if (m < N.lover) return false; }
  if (N.spouse != null && !!x.spouse !== !!N.spouse) return false;
  if (N.single && myLove(s, null)) return false;
  if (N.married != null && !!s.fam?.spouse !== !!N.married) return false;
  if (N.bond && !(x.bond && DEF[id]?.past && DEF[id].past.bond === x.bond && DEF[id].past.for === s.me.gender)) return false;
  if (N.job && !jobOn(s, N.job)) return false;
  if (N.nojob && jobOn(s, N.nojob)) return false;
  if (N.work != null && (!s.co.quit && !s.co.fired) !== !!N.work) return false;
  if (N.hpMax != null && s.hp > N.hpMax) return false;
  if (N.cash != null && s.cash < N.cash) return false;
  if (N.red && !redMonth(s)) return false;
  if (N.chat) { const t = x.chatSeen?.[N.chat]; if (t == null || s.t <= t) return false; }
  if (N.anniv && !x.anv) return false;
  if (N.cal && !arr(N.cal).includes(s.cal)) return false;
  if (N.round != null && RD.roundOf(s) < N.round) return false;
  if (N.gender && s.me.gender !== N.gender) return false;
  for (const k of arr(N.beat)) if (H.B?.[k] === undefined) return false;
  for (const k of arr(N.nobeat)) if (H.B?.[k] !== undefined) return false;
  if (N.pick) for (const [k, v] of Object.entries(N.pick)) if (!arr(v).includes(H.B?.[k])) return false;
  if (N.times) for (const [k, v] of Object.entries(N.times)) if ((H.BN?.[k] || 0) < v) return false;
  if (N.arc) for (const [k, v] of Object.entries(N.arc)) if (!arr(v).includes(x.mem?.[k])) return false;
  for (const m of arr(N.mem)) { if (H.mem?.[m] == null) return false; if (N.memM != null && s.t - H.mem[m] < N.memM) return false; }
  for (const m of arr(N.nomem)) if (H.mem?.[m] != null) return false;
  if (N.not && arr(N.not).some((q) => needOk(s, id, q))) return false;
  if (N.end != null) { if (!arr(N.end).includes(H.end) && !(H.end == null && x.spouse && arr(N.end).includes("together"))) return false; if (N.endM != null && s.t - (H.endT ?? s.t) < N.endM) return false; }
  if (N.noend && H.end != null && !(H.end === "together" && x.spouse)) return false; /* 결혼으로 함께가 된 판(옛 저장 포함)은 아직 갈림길을 안 고른 것으로 본다 */
  if (N.solo != null && !!H.solo !== !!N.solo) return false;
  if (N.away != null && isAway(s, id) !== !!N.away) return false;
  if (N.ex != null && (x.exT != null && !x.lover && !x.spouse) !== !!N.ex) return false;
  if (N.exKind && !arr(N.exKind).includes(x.exKind)) return false;
  if (N.cfMiss && x.cfMiss == null) return false;
  if (N.propose && !(x.lover && s.t - (x.loverSince ?? s.t) >= 8 && x.aff >= 85)) return false;
  if (N.seen) { const P = s.ng?.hl?.[id]?.seen || []; for (const k of arr(N.seen)) if (!P.includes(k)) return false; }
  return true;
}
function whoOk(s, id, who, b) {
  const c = CHAR[id], x = s.rel?.[id]; if (!c || !x) return false;
  if (who === "open") return RD.loveOpen(s) && isRomanceable(s, c) && heartOpen(s, id) && !x.spouse && (x.lover || !myLove(s, id));
  if (who === "lover") return RD.loveOpen(s) && (!!x.lover || (!!x.spouse && b?.sp !== false));
  if (who === "ex") return x.exT != null && !x.lover && !x.spouse;
  return true; // any: 친구도
}
function ok(s, id, b, from) {
  if (!(b.from || ["talk", "meetup"]).includes(from)) return false;
  if (!whoOk(s, id, b.who || "any", b)) return false;
  if (isAway(s, id) && (from === "talk" || from === "meetup")) return false;
  return needOk(s, id, b.need) && needOk(s, id, b.needBy?.[from]);
}
const friendView = (s, id) => { const c = CHAR[id], x = s.rel?.[id]; return !isRomanceable(s, c) || !heartOpen(s, id) || (!x?.lover && !x?.spouse && myLove(s, id)); };

// ── 장면 고르기. from: talk · meetup · month · visit · wedding · propose · act:<행동id>
export function beat(s, id, from) {
  const d = DEF[id], H = s.hl?.[id], x = s.rel?.[id]; if (!d || !H || !x || !CHAR[id]) return null;
  if (from === "talk" || from === "meetup") { const e = exScene(s, id); if (e) return e; }
  for (const b of beatsOf(id)) {
    if (H.B[b.k] !== undefined && !(b.again && s.t - (H.BT?.[b.k] ?? -99) >= b.again)) continue;
    if (!b.nogap && !b.fork && from !== "wedding" && from !== "propose" && H.bT != null && s.t - H.bT < (b.gap ?? HLV.gap)) continue;
    if (!ok(s, id, b, from)) continue;
    const sc = scene(s, id, b); if (sc) return sc; // 글이나 선택지가 아직 없는 장면(쓰는 중인 자료)은 건너뛴다
  }
  return null;
}
function scene(s, id, b) {
  const c = CHAR[id], x = s.rel[id], fr = b.fsame ? !isRomanceable(s, c) : friendView(s, id), sp = !!x.spouse; // fsame: 친구 판 글(ftext)을 동성일 때만 쓴다
  const chs = (b.choices || []).map((ch, i) => ({ ch, i })).filter(({ ch }) => needOk(s, id, ch.need) && !(sp && ch.sp === false) && !(!sp && ch.sp === "only"));
  let text = sp && b.sptext ? b.sptext : fr && b.ftext ? b.ftext : b.text;
  if (!text || !b.title || !chs.length || chs.some(({ ch }) => !ch || !ch.t)) return null;
  for (const a of arr(b.adds)) if (needOk(s, id, a.need)) text += " " + a.text;
  text += deja(s, id);
  const f = (t) => fillMe(s, t);
  return { kind: "event", who: id, expr: b.expr || (b.fork ? "neutral" : "smile"), tag: b.tag || (b.fork ? "갈림길" : "인연"), title: `${c.name} · ${b.title}`, text: f(text), onChoose: "hl_beat", hlK: b.k, hlT: s.t, hlI: chs.map((q) => q.i), best: [], ...(b.bg ? { bg: b.bg } : {}),
    choices: chs.map(({ ch }) => (ch.check ? { t: f(ch.t), check: ch.check, ok: { text: f(ch.ok?.text), eff: { ...(ch.ok?.eff || {}) } }, ng: { text: f(ch.ng?.text), eff: { ...(ch.ng?.eff || {}) } } } : { t: f(ch.t), eff: effOf(s, id, ch), text: f(fr && ch.ftext ? ch.ftext : ch.text) })) };
}
/* 선택지 효과 + 조건이 맞을 때만 더해지는 효과(effIf: [{ need, eff }]. 숫자는 더하고 나머지는 덮는다) */
function effOf(s, id, ch) { const o = { ...(ch.eff || {}) }; for (const q of arr(ch.effIf)) if (needOk(s, id, q.need)) for (const [k, v] of Object.entries(q.eff || {})) o[k] = typeof v === "number" && typeof o[k] === "number" ? o[k] + v : v; return o; }
// 헤어진 뒤 다시 마주쳤을 때(한 번). 첫마디는 자료 ex.soft · ex.cold
const EX_RE = [
  ["안부를 묻는다", [10, 4], "묻고 답하는 사이에 커피가 식었다. 헤어질 때는 둘 다 다음에 보자고 했다. 이번에는 빈말이 아닌 것 같았다.", "짧은 대답이 돌아왔다. 그래도 끝까지 대답은 해 줬다."],
  ["그때 얘기를 꺼낸다", [8, 2], "그때 못 한 말을 이제야 했다. 다 듣고 나서 한참 말이 없었다. 고개는 끄덕였다.", "그 얘기는 아직 이른 것 같았다. 말끝이 흐려졌고 대화는 거기서 끝났다."],
  ["인사만 하고 지나간다", [3, 1], "고개만 숙이고 지나쳤다. 몇 걸음 가다 돌아봤을 때 그쪽도 돌아보고 있었다.", "고개만 숙이고 지나쳤다. 돌아보지는 않았다."],
];
function exScene(s, id) {
  const d = DEF[id], H = s.hl?.[id], x = s.rel?.[id], c = CHAR[id]; if (!d?.ex || !H || !x || x.exT == null || x.lover || x.spouse || H.exRe != null || s.t - x.exT < HLV.exGap || isAway(s, id)) return null;
  const cold = x.exKind === "left", say = cold ? d.ex.cold : d.ex.soft; if (!say) return null;
  return { kind: "event", who: id, expr: "neutral", tag: "재회", title: `${c.name} · 다시 마주친 날`, onChoose: "hl_ex", best: [], text: `${d.ex.place || "오랜만에 마주쳤다."} {${id}}${/^"/.test(say) ? say : `"${say}"`}`,
    choices: EX_RE.map(([t, a, soft, hard]) => ({ t, eff: { aff: a[cold ? 1 : 0], ...(t.startsWith("그때") && cold ? { mental: -2 } : {}) }, text: cold ? hard : soft })) };
}

// ── 결말과 덧붙는 처리(선택지의 mem · loan · end · away · lock · shift · wed)
function setEnd(s, id, end, e, out) {
  const d = DEF[id], H = s.hl[id], x = s.rel[id], c = CHAR[id], came = H.end === "back" || H.mem?.back != null;
  H.end = end; H.endT = s.t; delete H.sp; delete H.solo; delete H.home;
  if (end === "far") { if (e?.away != null && e.away !== 0) setAway(H, e.away, s.t); else { const So = (d.life || []).map((ev) => ev.solo).find((q) => q && (q.end || "far") === "far"); H.away = -1; if (So && So.away != null) setAway(H, So.away, s.t); if (H.away == null) H.away = -1; } /* 기한이 없으면 혼자 떠날 때의 떠남 값(예: "L4")을 따른다 */ if (x) x.dateT = s.t; out.push(`${jo(c.name, "이", "가")} 멀리 떠났다 · 지도에서 사라져요`); log(s, `${jo(c.name, "이", "가")} 멀리 떠났다. 연락과 찾아가기로 이어 간다.`, "love"); }
  else if (end === "with") { H.home = 1; delete H.away; }
  else if (end === "letgo") { if (came && e?.away == null) delete H.away; else letgoAway(s, id, e); /* 다녀와서 헤어진 사람은 이미 돌아와 있다 */ if (x?.lover) { partLove(s, id, d.ends?.letgo?.why || "보내 주기로 했다.", "letgo", e?.keep ?? d.ends?.letgo?.keep ?? HLV.keep); out.push(`${jo(c.name, "과", "와")} 이별`, "멘탈 −6"); } }
  else delete H.away; // together · stay · back
}
/* 보내 준 뒤 그 사람이 어디 있는가: 선택지에 away 가 있으면 그 값(0 = 남는다), 없으면 그 사람이 혼자 정했을 때 떠나는 이야기(life[].solo.end = far)의 떠남 값을 따른다 */
function letgoAway(s, id, e) {
  const H = s.hl[id];
  if (e && e.away != null) { setAway(H, e.away, s.t); return; }
  const So = (DEF[id].life || []).map((ev) => ev.solo).find((q) => q && (q.end || "far") === "far");
  if (So) setAway(H, So.away ?? -1, s.t); else delete H.away;
}
function extra(s, id, e, out) {
  if (!e) return; const H = s.hl[id], c = CHAR[id];
  for (const m of arr(e.mem)) H.mem[m] = s.t;
  for (const m of arr(e.unmem)) delete H.mem[m];
  if (e.loan) { const a = e.loan.amt || 0; s.cash -= a; addMoney(s, "exp", "빌려준 돈", a); (H.loans = H.loans || []).push({ amt: a, due: s.t + (e.loan.months || 12) }); out.push(`빌려준 돈 −${a}만 · ${e.loan.months || 12}개월 뒤 돌려받아요`); }
  if (e.hev) H.hev = Math.max(H.hev || 0, e.hev); // 조력자 사건이 호감 n만큼 일찍 열린다
  if (e.lock) { H.lock = H.lock || {}; for (const [k, v] of Object.entries(e.lock)) H.lock[k] = s.t + v; }
  if (e.shift) for (const [k, v] of Object.entries(e.shift)) if (H.plan?.[k] != null && H.L?.[k] == null) H.plan[k] = Math.max(s.t + 1, H.plan[k] + v);
  if (e.end) setEnd(s, id, e.end, e, out); else if (e.away != null) setAway(H, e.away, s.t);
  if (e.wed) s.sceneQ.unshift(weddingScene(s, id, true)); // 그쪽이 먼저 청혼했다: 반지 값 없이 결혼 장면으로
}
export const HL_CHOOSE = {
  hl_beat(s, r, i, okv, sc) {
    const id = sc.who, H = s.hl?.[id], b = beatsOf(id).find((q) => q.k === sc.hlK); if (!H || !b) return [];
    const ci = sc.hlI?.[i] ?? i, ch = b.choices?.[ci], out = [];
    const t0 = sc.hlT ?? s.t; H.B[b.k] = ci; H.bT = s.t; (H.BT = H.BT || {})[b.k] = t0; /* BT(다시 뜨는 간격의 기준)는 장면이 만들어진 달, bT(같은 사람 장면 사이 간격)는 고른 달 */ (H.BN = H.BN || {})[b.k] = (H.BN[b.k] || 0) + 1; if (H.due && (b.need?.at === H.due.k || b.needBy?.month?.at === H.due.k)) delete H.due;
    if (s.rel[id]) s.rel[id].last = s.t;
    if (ch) { extra(s, id, ch, out); if (ch.check) extra(s, id, okv ? ch.onOk : ch.onNg, out); }
    return out;
  },
  hl_chat() { return []; },
  hl_ex(s, r, i, okv, sc) { const H = s.hl?.[sc.who]; if (H) { H.exRe = s.t; H.bT = s.t; } return []; },
};

// ── 달 마감: 돌아옴 · 빌려준 돈 · 인생 사건 · 혼자 정하기 · 밀린 전달 · 이번 달 장면 하나
export function month(s, notes, scenes) {
  if (!s.hl) return; const X = box(s);
  for (const [id, H] of Object.entries(s.hl)) { try {
    const d = DEF[id], c = CHAR[id]; if (!d || !c) continue; const x = s.rel?.[id];
    for (const ev of d.life || []) if (ev.sync && H.L[ev.k] == null && H.plan?.[ev.k] > s.t && s.t >= ev.at[0] && syncOn(s, ev.sync)) H.plan[ev.k] = s.t; // 그 일이 생긴 달로 당긴다
    if (x?.helper && isHidden(s, id)) { x.helper = null; notes.push(`${jo(c.name, "이", "가")} 멀리 떠나 투잡을 도와주지 못하게 됐다`); }
    if (typeof H.away === "number" && H.away > 0 && H.away <= s.t) { delete H.away; H.mem.back = s.t; if (H.end === "far") { H.end = "back"; H.endT = s.t; } if (x) notes.push(`${jo(c.name, "이", "가")} 돌아왔다`); }
    if (H.loans?.length) { for (const l of H.loans.filter((q) => q.due <= s.t)) { s.cash += l.amt; addMoney(s, "inc", "돌려받은 돈", l.amt); notes.push(`${jo(c.name, "이", "가")} 빌려 간 ${l.amt}만을 갚았다`); } H.loans = H.loans.filter((q) => q.due > s.t); }
    for (const ev of d.life || []) if (H.L[ev.k] == null && H.plan?.[ev.k] != null && H.plan[ev.k] <= s.t) fire(s, id, ev, notes, scenes, false);
    if (H.sp && H.end == null) soloApply(s, id, notes, false);
    if (H.due && H.due.until < s.t) { const ev = (d.life || []).find((e) => e.k === H.due.k); delete H.due; if (ev) tell(s, id, ev, notes, scenes); }
  } catch (e) { console.warn("[히로인]", id, e); } }
  if (X.sT === s.t) return;
  const ids = Object.keys(s.hl).filter((id) => s.rel?.[id] && DEF[id]).sort((a, b) => { const p = s.rel[a], q = s.rel[b]; return ((q.lover || q.spouse) ? 1 : 0) - ((p.lover || p.spouse) ? 1 : 0) || q.aff - p.aff; });
  for (const id of ids) { let sc = null; try { sc = beat(s, id, "month"); } catch (e) { console.warn("[히로인]", id, e); } if (sc) { scenes.push(sc); X.sT = s.t; break; } }
}
const syncOn = (s, k) => (k === "bear" ? s.invPh?.p === "b" : false); // bear: 투자 하락 국면

// ── 2단계(11-25): 회차 잇기 · 기시감 · 엔딩 한 줄 · 여행 · 시차 · 연말 한 줄 · 빈자리
// 갈림길이 끝났는가(결혼 성향 wed.js 가 "먼저 결혼 얘기"를 꺼내도 되는지 볼 때 쓴다). 갈림길이 없는 사람·히로인이 아닌 사람은 늘 true
export const reask = (s, id) => { const H = s.hl?.[id]; return !!H && H.end === "stay" && beatsOf(id).some((b) => H.B?.[b.k] === undefined && arr(b.need?.end).includes("stay")); };
export const forkDone = (s, id) => { const H = s.hl?.[id]; if (!H) return true; if (H.end != null) return !reask(s, id); return !beatsOf(id).some((b) => b.fork); };
export const hevCut = (s, id) => s.hl?.[id]?.hev || 0;
// 회차를 끝낼 때 메타에 남긴다: hlPast{id:{end,love}} 지난 판 결말 · hlSeen{id:[사건]} 지금까지 전해 들은 사건(판을 거듭하며 쌓인다)
export function metaOut(s, m) {
  if (!s.hl || !m) return; m.hlPast = m.hlPast || {}; m.hlSeen = m.hlSeen || {};
  for (const [id, H] of Object.entries(s.hl)) { const x = s.rel?.[id]; if (!x || !DEF[id]) continue;
    m.hlPast[id] = { end: H.end || "", love: x.spouse ? "spouse" : x.lover ? "lover" : x.exT != null ? "ex" : "" };
    m.hlSeen[id] = [...new Set([...(m.hlSeen[id] || []), ...(H.saw || [])])]; }
}
export function ngIn(m) { const out = {}; for (const id of new Set([...Object.keys(m?.hlPast || {}), ...Object.keys(m?.hlSeen || {})])) out[id] = { ...(m.hlPast?.[id] || {}), seen: m.hlSeen?.[id] || [] }; return out; } // 새 판에 넘기는 꼴(newGame 의 ng.hl)
const DEJA = {
  spouse: "처음 보는 얼굴인데 손이 먼저 알아본다. 어느 생에선가 이 사람과 같은 집 열쇠를 가졌던 것 같다.",
  lover: "처음 보는 얼굴인데 걸음이 먼저 느려진다. 어느 생에선가 이 사람 옆을 오래 걸었던 것 같다.",
  far: "처음 보는 얼굴인데 터미널 냄새가 난다. 어느 생에선가 이 사람을 오래 기다렸던 것 같다.",
  ex: "처음 보는 얼굴인데 뒷모습이 먼저 떠오른다. 어느 생에선가 이 사람을 부르지 못했던 것 같다.",
  any: "처음 보는데 낯이 익다. 이 사람에게 앞으로 무슨 일이 생길지 조금 아는 것 같은 기분이 든다.",
};
export function deja(s, id) { // 지난 회차에 알던 사람을 이번 판에 처음 볼 때 한 번(지문 한 줄)
  const P = s.ng?.hl?.[id], H = s.hl?.[id], d = DEF[id]; if (!P || !H || !d || H.deja != null) return "";
  H.deja = s.t; const k = P.end === "far" ? "far" : P.love || "any";
  return " " + (d.deja?.[k] || d.deja?.any || DEJA[k] || DEJA.any);
}
// 엔딩 글 한 줄(자료 ends.<결말>.epi: 글 또는 [{ need, fire, text }]. fire: 파이어를 이룬 엔딩에서만)
export function epis(s) {
  const out = []; if (!s.hl) return out; const fire = !!s.fireAt;
  for (const [id, H] of Object.entries(s.hl)) { const d = DEF[id]; if (!d || !s.rel?.[id]) continue;
    for (const e of arr(endOf(s, id) ? d.ends?.[endOf(s, id)]?.epi : null).concat(arr(d.epi))) { const o = typeof e === "string" ? { text: e } : e; if (o.fire && !fire) continue; if (!needOk(s, id, o.need)) continue; out.push(fillMe(s, o.text)); break; } }
  return out;
}
// 여행: 멀리 있는 연인은 1년에 한 번·200만(ends.<결말>.trip: { cash, gap, lines[] }), 곁에 있을 때 글만 바꾸려면 late.trip: { need, lines[], cash }
export function tripInfo(s, id) {
  const H = s.hl?.[id], d = DEF[id], x = s.rel?.[id]; if (!H || !d || !x) return null;
  const far = isAway(s, id), T0 = far ? cur(s, id, "trip") : null, T = far ? (T0 ? { ...HLV.farTrip, ...T0 } : null) : late(s, id, "trip"); if (!T) return null; // 멀리 있어도 자료에 trip 이 없으면(나라 안) 보통 여행 그대로
  const gap = T.gap || 0, left = gap && x.tripT != null ? gap - (s.t - x.tripT) : 0;
  return { cash: T.cash ?? 80, lines: T.lines || [], gap, wait: Math.max(0, left), far };
}
// 시차: 멀리(나라 밖) 있는 동안 까톡 시각 옆에 그쪽 시각을 붙인다(자료의 tz = 한국보다 몇 시간 늦은가. life·ends 어디에나)
const T12 = (h) => (h < 6 ? "새벽" : h < 9 ? "아침" : h < 12 ? "오전" : h === 12 ? "낮" : h < 18 ? "오후" : h < 21 ? "저녁" : "밤");
export function chatTime(s, id, time) {
  const tz = isAway(s, id) ? +cur(s, id, "tz") || 0 : 0, m = /(새벽|아침|오전|낮|오후|저녁|밤)\s*(\d{1,2}):(\d{2})/.exec(time || ""); if (!tz || !m) return time;
  let h = +m[2] % 12; if (m[1] === "오후" || m[1] === "저녁" || (m[1] === "낮" && +m[2] !== 12) || (m[1] === "밤" && +m[2] >= 6 && +m[2] < 12)) h += 12; if (m[1] === "낮" && +m[2] === 12) h = 12;
  const g = (((h - tz) % 24) + 24) % 24;
  return `${time} · 그쪽은 ${T12(g)} ${g % 12 || 12}:${m[3]}`;
}
// 연말 결산 한 줄: 올해 인생 사건이나 결말이 있었던 사람 가운데 가장 가까운 한 명(자료 life[].year · ends.<결말>.year, 없으면 소식 글)
export function yearLine(s, t0) {
  let best = null, bv = -1; if (!s.hl) return "";
  for (const [id, H] of Object.entries(s.hl)) { const d = DEF[id], x = s.rel?.[id]; if (!d || !x) continue; let line = "", lt = -1;
    for (const ev of d.life || []) { const t = H.L?.[ev.k]; if (t != null && t >= t0 && t <= s.t && t > lt) { const v = ev.year || txt(s, id, ev.news); if (v) { line = v; lt = t; } } }
    if (H.end && H.endT != null && H.endT >= t0 && H.endT > lt && d.ends?.[H.end]?.year) { line = d.ends[H.end].year; lt = H.endT; }
    const v = (x.spouse || x.lover ? 200 : 0) + x.aff; if (line && v > bv) { bv = v; best = fillMe(s, line); } }
  return best || "";
}
// 빈자리: 떠난 사람이 다니던 곳에서 행동하면 한 번 뜨는 한 줄(자료 life[].gone · ends.<결말>.gone: { loc: ["cafe"], act: ["rest"], text })
export function goneLine(s, actId) {
  if (!s.hl) return ""; const loc = Object.values(D.SPOTS || {}).find((sp) => (sp.acts || []).includes(actId))?.loc;
  for (const [id, H] of Object.entries(s.hl)) { const d = DEF[id], x = s.rel?.[id]; if (!d || !x || !isHidden(s, id) || H.goneT != null) continue;
    let G = H.end ? d.ends?.[H.end]?.gone : null; if (!G) for (const ev of d.life || []) if (H.L?.[ev.k] != null && ev.gone) G = ev.gone;
    if (!G || !(arr(G.act).includes(actId) || (loc && arr(G.loc).includes(loc)))) continue;
    H.goneT = s.t; return fillMe(s, G.text); }
  return "";
}
// 행동 뒤에 뜨는 장면(from: "act:rest" 처럼)
export function actBeat(s, actId) { if (!s.hl) return null; for (const id of Object.keys(s.hl)) { if (!s.rel?.[id] || !DEF[id]) continue; const sc = beat(s, id, "act:" + actId); if (sc) return sc; } return null; }
// 내가 누군가와 결혼식을 올린 달: 다른 사람들의 장면(from: "wedding")
export function onWed(s, who) { if (!s.hl) return; const H0 = s.hl[who]; if (H0) { H0.wedT = s.t; if (H0.end === "far" && H0.away === -1) { H0.end = "together"; H0.endT = s.t; delete H0.away; } } /* 기한 없이 떠난 사람은 결혼하면 함께 산다. 기한이 있으면 결혼해도 그때까지 떠나 있다(주말부부) */ for (const id of Object.keys(s.hl)) { if (id === who || !s.rel?.[id]) continue; const sc = beat(s, id, "wedding"); if (sc) s.sceneQ.push(sc); } }

// ── 멀리 있는 사람: 막히는 행동과 '찾아가기'
const FAR_NO = { meetup: 1, date: 1, walk: 1, drink: 1, showwork: 1, giftpick: 1, gift: 1, helper: 1 };
export function blockAct(s, id, kind) { if (!isAway(s, id) || !FAR_NO[kind]) return ""; return `${jo(CHAR[id].name, "은", "는")} 지금 멀리 있어요. 연락하기와 찾아가기만 할 수 있어요`; }
export function visitInfo(s, id) { const x = s.rel?.[id], H = s.hl?.[id]; if (!x || !H || !isAway(s, id) || !(x.lover || x.spouse)) return null; const V = { ...HLV.visit, ...(cur(s, id, "visit") || {}) }; return { ...V, n: V.n || "찾아가기", done: x.visitT === s.t }; /* visit 은 결말(ends)에도 인생 사건(life)에도 둘 수 있다 */ }
export function visit(s, id) {
  const c = CHAR[id], x = s.rel?.[id], V = visitInfo(s, id); if (!c || !x || !V) return { ok: false, msg: "지금은 찾아갈 수 없어요" };
  if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" };
  if (V.done) return { ok: false, msg: "이번 달엔 이미 다녀왔어요" };
  if (s.ap < V.ap) return { ok: false, msg: "행동력이 부족해요" };
  if (s.cash - V.cash < -creditRoom(s)) return { ok: false, msg: "돈이 모자라요" };
  s.ap -= V.ap; s.cash -= V.cash; addMoney(s, "exp", "약속·데이트", V.cash); x.dateT = s.t; x.last = s.t; x.visitT = s.t; x.visitN = (x.visitN || 0) + 1;
  const g = addAff(s, id, V.aff); s.mental = clamp(s.mental + V.mental, 0, 100); if (x.spouse) s.fam.happy = clamp(s.fam.happy + 6, 0, 100);
  const sc = beat(s, id, "visit"), L = V.lines || [];
  return { ok: true, lines: [`호감 +${g}`, `멘탈 +${V.mental}`], msg: L.length ? fillMe(s, L[(x.visitN - 1) % L.length]) : `${c.name}에게 다녀왔다. 돌아오는 길이 갈 때보다 짧았다.`, scene: sc || undefined };
}

// ── 화면 시험용(ui.js #…-hltest-<id>-<열쇠>). 열쇠: 장면 열쇠(B1…·RE·F) · FS(부부 판 갈림길) · EX·EXC(헤어진 뒤 재회) · L1…(인생 사건 전달) · LC1…(그 사건의 까톡) · visit
export function demo(s, id, key) {
  const d = DEF[id], c = CHAR[id]; if (!d || !c) return null;
  s.pending = null; s.ap = Math.max(s.ap, 6); s.ng = { ...(s.ng || {}), n: Math.max(2, s.ng?.n || 1) };
  if (c.gender === s.me.gender) s.me.gender = c.gender === "F" ? "M" : "F"; // 연애 장면을 보려고 주인공 성별을 맞춘다
  if (!s.cast.includes(id)) s.cast.push(id); ensure(s);
  const H = s.hl[id], x = ensureRel(s, id); x.aff = Math.max(x.aff, 80); x.stage = Math.max(x.stage || 0, 2); H.bT = null; x.last = s.t;
  const need = (N) => { if (!N) return;
    for (const k of [].concat(N.at || [], N.after || [])) { for (const ev of d.life || []) { if (H.L[ev.k] == null && (ev.k === k || (d.life.findIndex((q) => q.k === ev.k) < d.life.findIndex((q) => q.k === k)))) H.L[ev.k] = s.t - 30; } H.L[k] = s.t - (N.at ? 0 : Math.max(N.afterM || 0, 0)); }
    if (N.pre) H.plan[N.pre] = s.t + 1;
    if (N.lover != null) { x.lover = true; x.loverSince = s.t - Math.max(N.lover, 14); x.dateT = s.t; x.heart = x.heart ?? s.t; }
    if (N.bond && d.past) { x.bond = d.past.bond; s.me.gender = d.past.for; }
    for (const m of arr(N.mem)) H.mem[m] = s.t - (N.memM || 0);
    if (N.end != null) { H.end = arr(N.end)[0]; H.endT = s.t - (N.endM || 0); }
    for (const k of arr(N.beat)) if (H.B[k] === undefined) H.B[k] = 0;
    if (N.job && !(s.sj.active || []).length) s.sj.active.push("cs");
    if (N.anniv) x.anv = { t: s.t, n: "1주년" };
    if (N.chat) (x.chatSeen = x.chatSeen || {})[N.chat] = s.t - 1;
    if (N.or) need(arr(N.or)[0]);
  };
  if (key === "EX" || key === "EXC") { x.lover = false; x.spouse = false; x.loverSince = s.t - 40; x.exT = s.t - 20; x.exKind = key === "EXC" ? "left" : "letgo"; x.aff = 30; delete H.exRe; delete H.away; return exScene(s, id); }
  if (key === "visit") { x.lover = true; x.loverSince = s.t - 20; x.dateT = s.t; H.end = "far"; H.endT = s.t - 3; H.away = -1; delete x.visitT; return { visit: true }; }
  const ev = (d.life || []).find((e) => e.k === key || "LC" + e.k.slice(1) === key);
  if (ev) { if (key.startsWith("LC") && ev.chat) return chatScene(s, id, ev); x.aff = 10; const notes = []; H.L[ev.k] = s.t; tell(s, id, ev, notes, null); return { note: notes[0] || ev.news || "" }; }
  const fs = key === "FS", b = beatsOf(id).find((q) => q.k === (fs ? "F" : key)); if (!b) return null;
  delete H.B[b.k]; if (b.who === "lover" || fs) need({ lover: 14 }); need(b.need); need(b.needBy?.[(b.from || ["talk"])[0]]);
  if (fs) { x.lover = false; x.spouse = true; s.fam.spouse = id; s.fam.marriedT = s.t - 6; }
  if (b.who === "lover" || b.who === "open") for (const [q, y] of Object.entries(s.rel)) if (q !== id) { y.lover = false; }
  return scene(s, id, b);
}
