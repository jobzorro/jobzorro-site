// 주변 사람(11-24): 사건 속에서 말하는 사람에게 얼굴과 이름을 준다.
//   · 조연 14명(본부장·인사팀장·대표·엄마·아빠·집주인…) = data/extras.json 의 chars. 인연 목록(CHAR)에는 안 들어간다.
//   · dialog(): 장면 글을 '바탕 글 / 누가 한 말 / 화면에 뜬 글(문자·단톡방)'로 나눈다. 화면(ui.js)이 대화창으로 그린다.
//   · 겹치는 역할: 조연마다 다른 투잡에서 손님·독자·거래처로 다시 만난다(cross). 한 사람에 한 번.
//   · 컨설팅 닉네임 이야기: 닉네임 다섯 개마다 유래 답·작은 소동 하나씩 + 본부장의 딸.
import { EXTRAS as XD } from "../gen/data.js";
import { CHAR, jo, won } from "./core.js";
import * as CS from "./cs.js";
import * as RD from "./round.js";

const X = XD || {};
export const EXTRA = Object.fromEntries((X.chars || []).map((c) => [c.id, c]));
export const BITS = X.bits || [];
export const who = (id) => CHAR[id] || EXTRA[id] || BIT[id] || null;
const hashN = (str) => { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
// 단역: 그림이 없어 도트 얼굴로 나온다(이름으로 씨앗을 만들어 늘 같은 얼굴)
const BIT = {};
for (const b of BITS) { const id = "b" + (hashN(b.name) % 100000); b.id = id; BIT[id] = { id, name: b.name, gender: b.gender, age: b.older ? 52 : 30, job: "", bit: true }; }

const rx = (k) => new RegExp(k, "g");
const RULES = [ // 앞에 있을수록 먼저(끝나는 자리가 같으면 앞 규칙이 이긴다)
  ...BITS.filter((b) => /새 팀장|고객 어머니|김 대리/.test(b.name)).map((b) => ({ id: b.id, kind: "bit", re: b.keys.map(rx) })),
  ...(X.chars || []).map((c) => ({ id: c.id, kind: "extra", re: c.keys.map(rx), title: (c.titleKeys || []).map(rx) })),
  ...(X.cast || []).map((c) => ({ id: c.id, kind: "char", re: c.keys.map(rx) })),
  ...BITS.filter((b) => !/새 팀장|고객 어머니|김 대리/.test(b.name)).map((b) => ({ id: b.id, kind: "bit", re: b.keys.map(rx) })),
];
const SCREENS = (X.screens || []).map((c) => ({ name: c.name, ic: c.ic, re: c.keys.map(rx) }));
const ME_RE = /(내가|나는|나도)[^.!?…]{0,12}$/;

function lastHit(res, text) { let best = -1; for (const re of res) { re.lastIndex = 0; let m; while ((m = re.exec(text))) { best = Math.max(best, m.index + m[0].length); if (!m[0].length) re.lastIndex++; } } return best; }
function findPerson(text, s, sc, bitsOk) {
  let best = null;
  for (const R of RULES) { if (R.kind === "bit" && !bitsOk) continue; const p = lastHit(R.re, text); if (p >= 0 && (!best || p > best.p)) best = { p, id: R.id, kind: R.kind }; }
  for (const id of castIds(s, sc)) { const c = CHAR[id]; if (!c?.name || c.name.length < 2) continue; const p = lastHit([nameRe(c.name)], text); if (p >= 0 && (!best || p > best.p)) best = { p, id, kind: "char" }; }
  if (best && CHAR[best.id] && best.kind === "char" && !castIds(s, sc).includes(best.id) && best.id !== "c101") return null;
  return best;
}
const NAME_RE = {};
const nameRe = (n) => (NAME_RE[n] = NAME_RE[n] || new RegExp(`(?<![가-힣])(?:${n}|${n.slice(1)})(?=[ 은는이가의도와과에께,.]|씨|님|$)`, "g"));
function castIds(s, sc) { const a = new Set(); if (sc?.who) a.add(sc.who); for (const id of Object.keys(s?.rel || {})) a.add(id); return [...a].filter((id) => CHAR[id]); }
function findScreen(text) { let best = null; for (const R of SCREENS) { const p = lastHit(R.re, text); if (p >= 0 && (!best || p > best.p)) best = { p, name: R.name, ic: R.ic }; } return best; }

// 작은따옴표 글이 '말'인지: 문장부호가 있거나, 말끝 + 뒤에 "하고·라며·한다"가 붙을 때만
const SAY_END = /(요|다|죠|까|네|야|해|지|어|아|래|군|라|니)$/, SAY_AFTER = /^\s*(하고|한다|하신다|하셨다|라고|라며|라는|이라|란다|했다|하며|하는|하니)/;
function isSpeech(q, single, after) { if (!single) return q.length >= 2; if (q.length < 4) return false; if (/[.?!…]/.test(q) && / /.test(q)) return true; return SAY_END.test(q) && SAY_AFTER.test(after); }
const firstClause = (t) => (t.match(/^[^.!?…\n]{0,26}/) || [""])[0];

// 장면 글 → [{k:"n", t} | {k:"s", t, id, kind, via} | {k:"p", t, name, ic}]
//   n = 바탕 글, s = 사람이 한 말(id: 인물·조연·단역·"me"), p = 화면에 뜬 글
export function dialog(s, sc, text, prev = null) {
  text = String(text || ""); const out = []; if (!text) return out;
  // 글에 {나}"…" · {x01}"…" · {고객}"…" 처럼 따옴표 바로 앞에 꼬리표를 달면 그 사람이 한 말로 못 박는다
  const re = /(?:\{([^{}]+)\})?(?:"([^"]+)"|“([^”]+)”|'([^'\n]+)')/g; let m, pos = 0, last = prev; const hasWho = !!(sc?.who && CHAR[sc.who]);
  const push = (t) => { if (!t) return; const l = out[out.length - 1]; if (l && l.k === "n") l.t += t; else out.push({ k: "n", t }); };
  while ((m = re.exec(text))) {
    const tag = m[1], q = m[2] ?? m[3] ?? m[4], single = m[4] !== undefined, before = text.slice(pos, m.index), after = text.slice(m.index + m[0].length);
    if (!tag && !isSpeech(q, single, after)) continue;
    let spk = null;
    if (tag) { const b = BITS.find((x) => x.name === tag); spk = tag === "나" ? { id: "me", kind: "me" } : EXTRA[tag] ? { id: tag, kind: "extra" } : CHAR[tag] ? { id: tag, kind: "char" } : b ? { id: b.id, kind: "bit" } : null; }
    if (!spk && ME_RE.test(before.trimEnd())) spk = { id: "me", kind: "me" };
    const P = !spk && (findPerson(before, s, sc, !hasWho) || findPerson(firstClause(after), s, sc, !hasWho));
    const S = findScreen(before) || findScreen(firstClause(after));
    if (!spk && P) spk = { id: P.id, kind: P.kind, via: S?.name };
    if (!spk && sc?.title) { for (const R of RULES) if (R.title?.length && lastHit(R.title, sc.title) >= 0) { spk = { id: R.id, kind: R.kind, via: S?.name }; break; } }
    if (!spk && S) spk = { screen: S };
    if (!spk && !before.trim() && sc?.title) { const T = findScreen(sc.title); if (T) spk = { screen: T }; }
    if (!spk && last && !/[.!?…]\s*$/.test(before.trim()) && !before.trim()) spk = last; // 따옴표가 바로 이어지면 같은 사람
    if (!spk && hasWho) spk = { id: sc.who, kind: "char" };
    if (!spk && sc?.spk && EXTRA[sc.spk]) spk = { id: sc.spk, kind: "extra" };
    if (!spk) { if (tag) { push(before); push(m[0].slice(tag.length + 2)); pos = m.index + m[0].length; } continue; } // 누가 한 말인지 모르면 바탕 글에 그대로 둔다
    push(before);
    if (spk.screen) out.push({ k: "p", t: q, name: spk.screen.name, ic: spk.screen.ic });
    else out.push({ k: "s", t: q, id: spk.id, kind: spk.kind, via: spk.via });
    last = spk; pos = m.index + m[0].length;
  }
  push(text.slice(pos));
  for (const o of out) if (o.k === "n") o.t = o.t.replace(/^[\s,.]+(?=\S)/, "").trim();
  return out.filter((o) => o.k !== "n" || /[가-힣A-Za-z0-9]/.test(o.t));
}
// 무대에 세울 사람: 장면의 인물 → 말한 조연 → (말이 없어도) 글에 나온 조연
export function leadOf(s, sc, segs) {
  if (sc?.who && CHAR[sc.who]) return sc.who;
  if (sc?.spk && EXTRA[sc.spk]) return sc.spk;
  const sp = (segs || []).find((x) => x.k === "s" && (x.kind === "extra" || x.kind === "char")); if (sp) return sp.id;
  if (sc?.kind === "year" || !sc?.text) return null;
  if ((segs || []).some((x) => x.k === "s")) return null; // 단역(도트 얼굴)이 말하는 장면: 무대는 비우고 말풍선 얼굴만
  const bitSpan = []; for (const R of RULES) if (R.kind === "bit") for (const re of R.re) { re.lastIndex = 0; let m; while ((m = re.exec(sc.text))) { bitSpan.push([m.index, m.index + m[0].length]); if (!m[0].length) re.lastIndex++; } }
  const inBit = (a, b) => bitSpan.some(([x, y]) => a >= x && b <= y); // "고객 어머니" 안의 "어머니"는 엄마가 아니다
  let best = null; for (const R of RULES) { if (R.kind !== "extra") continue; for (const re of R.re) { re.lastIndex = 0; let m; while ((m = re.exec(sc.text))) { if (!inBit(m.index, m.index + m[0].length)) { if (!best || m.index < best.p) best = { p: m.index, id: R.id }; break; } if (!m[0].length) re.lastIndex++; } } }
  return best ? best.id : null;
}
export const plain = (t) => String(t || "").replace(/\{[^{}]+\}(?=["“'])/g, ""); // 꼬리표를 뗀 글(대화창으로 못 그릴 때)
export const lastSpeaker = (segs) => { const a = (segs || []).filter((x) => x.k === "s"); const l = a[a.length - 1]; return l ? { id: l.id, kind: l.kind } : null; };

// ───────── 겹치는 역할 사건 · 닉네임 이야기 ─────────
export const XB = { from: 12, gap: 5, p: 0.07, nickP: 0.35, nickGap: 4 }; // 1년 뒤부터, 사이 5달, 달마다 7% / 닉네임 이야기는 조건이 되면 35%
const st = (s) => (s.xr = s.xr || { done: {}, lastT: -99, nk: {}, nkT: -99 });
const lastPx = (s, job) => (s.hist?.[s.hist.length - 1]?.px?.[job] || 0) > 0;
function jobLive(s, job) {
  if (!s.sj?.active?.includes(job)) return false;
  if (job === "pr") return (s.pr?.rooms || []).some((r) => r.status === "open");
  if (job === "cs") return !!s.cs?.open;
  if (job === "airbnb") return (s.ab?.units || []).length > 0;
  if (job === "ucafe") return (s.uc?.stores || []).length > 0;
  if (job === "insta") return !!s.ins;
  return lastPx(s, job);
}
const fill = (s, t) => String(t || "").replace(/\{자식\}/g, s.me.gender === "F" ? "딸" : "아들").replace(/\{nick\}/g, CS.nickName(s) || "").replace(/\{이에요\}/g, jo(CS.nickName(s) || "가", "이에요", "예요").slice((CS.nickName(s) || "가").length));
const fillCh = (s, ch) => ({ ...ch, t: fill(s, ch.t), text: fill(s, ch.text), ...(ch.ok ? { ok: { ...ch.ok, text: fill(s, ch.ok.text) } } : {}), ...(ch.ng ? { ng: { ...ch.ng, text: fill(s, ch.ng.text) } } : {}), eff: ch.eff || {} });
const JOB_BG = { pr: "partyroom", cs: "consult", airbnb: "airbnb", ucafe: "ucafe", tarot: "tarot", chicken: "pub", webnovel: "home", insta: "home", vibe: "home", tutoring: "home", club: "cafe", petsit: "apt" };
export function crossScene(s, c) { return { kind: "event", tag: "뜻밖의 얼굴", title: c.title, text: fill(s, c.text), spk: c.x, bg: c.bg || JOB_BG[c.job] || "street", expr: c.expr, onChoose: "x_cross", xk: c.x + c.job, choices: c.choices.map((ch) => fillCh(s, ch)) }; }
export function nickScene(s, kind) {
  const N = CS.nickOf(s); if (!N) return null; const E = X.nickEv || {};
  if (kind === "gag") return { kind: "event", tag: "닉네임", title: N.gag.title, text: fill(s, N.gag.text), onChoose: "x_nick", choices: N.gag.choices.map((ch) => fillCh(s, ch)) };
  if (kind === "boss") return { kind: "event", tag: "닉네임", title: E.boss.title, text: fill(s, E.boss.text), spk: "x01", bg: "meeting", expr: E.boss.expr, onChoose: "x_nick", choices: E.boss.choices.map((ch) => fillCh(s, ch)) };
  return { kind: "event", tag: "닉네임", title: E.why.title, text: fill(s, E.why.text), onChoose: "x_nick", choices: E.why.choices.map((ch, i) => fillCh(s, { ...ch, text: ch.text || N.why[i] })) };
}
// ───────── 버닝 이벤트(11-24) ─────────
// 1회차에만, 5년 차쯤(55개월 차부터) 하고 있는 투잡마다 한 번. 평소의 두 배를 버는 큰 건이 들어온다(전부 받으면 1,000만 안팎).
// 1회차는 투잡을 6개월 뒤에 고르게 되면서 석 달이 줄었다. 그만큼을 이 한 번으로 메운다(밸런스 보정). 2회차부터는 없다.
export const BURN = { from: 55, to: 78, gap: 3, cash: 1000, okX: 1.2, ngX: 0.8, halfX: 0.5, dc: 50, hp: -8, ap: -2 };
if (typeof process !== "undefined" && process.env?.BURNC) BURN.cash = +process.env.BURNC; // 봇 시험용
const amt = (x) => Math.round(BURN.cash * x / 10) * 10;
export function burnScene(s, job) {
  const b = (X.burn || []).find((q) => q.job === job); if (!b) return null;
  const A = { ok: amt(BURN.okX), ng: amt(BURN.ngX), half: amt(BURN.halfX) };
  const f = (t) => fill(s, t).replace(/\{ok\}/g, won(A.ok)).replace(/\{ng\}/g, won(A.ng)).replace(/\{half\}/g, won(A.half));
  return { kind: "event", tag: "버닝", title: b.title, text: f(b.text), burn: { head: b.title, sub: b.sub }, bg: JOB_BG[job], onChoose: "x_burn", xk: job, once: "big", choices: [
    { t: b.a, check: { stat: b.stat, dc: BURN.dc }, ok: { text: f(b.ok), eff: { cash: A.ok, cashAs: "버닝 이벤트", hp: BURN.hp, ap: BURN.ap } }, ng: { text: f(b.ng), eff: { cash: A.ng, cashAs: "버닝 이벤트", hp: BURN.hp - 2, mental: -3, ap: BURN.ap } } },
    { t: b.b, eff: { cash: A.half, cashAs: "버닝 이벤트", hp: -3 }, text: f(b.bText) },
    { t: b.c, eff: { mental: 4 }, text: f(b.cText) },
  ] };
}
function burnMonth(s, scenes) {
  if (!RD.isR1(s)) return false; const V = st(s), nt = s.t + 1; V.burn = V.burn || {};
  if (nt < BURN.from || nt > BURN.to || nt - (V.burnT ?? -99) < BURN.gap) return false;
  const job = (s.sj.active || []).find((j) => !V.burn[j] && jobLive(s, j) && (X.burn || []).some((q) => q.job === j)); if (!job) return false;
  const sc = burnScene(s, job); if (!sc) return false;
  V.burn[job] = nt; V.burnT = nt; scenes.push(sc); return true;
}
export function xMonth(s, r, notes, scenes) {
  if (s.over) return; const V = st(s), nt = s.t + 1;
  if (burnMonth(s, scenes)) return;
  // 닉네임 이야기: 유래 질문 → 작은 소동 → 본부장의 딸
  if (s.cs?.open && s.cs.nick === "nick" && CS.nickOf(s) && s.sj.active.includes("cs") && nt - V.nkT >= XB.nickGap) {
    const employed = !(s.co?.quit || s.co?.fired);
    const k = !V.nk.why && (s.cs.clients || 0) >= 3 ? "why" : !V.nk.gag && V.nk.why && (s.cs.reviews || 0) >= 8 ? "gag" : !V.nk.boss && V.nk.gag && employed && (s.cs.lv || 1) >= 2 ? "boss" : null;
    if (k && r.chance(XB.nickP)) { const sc = nickScene(s, k); if (sc) { V.nk[k] = nt; V.nkT = nt; scenes.push(sc); return; } }
  }
  if (nt < XB.from || nt - V.lastT < XB.gap) return;
  const C = (X.cross || []).filter((c) => !V.done[c.x] && jobLive(s, c.job) && !(c.x === "x01" || c.x === "x02" || c.x === "x03" ? s.co?.quit || s.co?.fired : false));
  if (!C.length || !r.chance(Math.min(0.2, XB.p * C.length))) return;
  const c = r.pick(C); V.done[c.x] = nt; V.lastT = nt; scenes.push(crossScene(s, c));
}
// 시험용: 조연 id 또는 닉네임 이야기 종류로 장면을 바로 만든다
export function demo(s, key) { if (/^burn/.test(key)) return burnScene(s, key.slice(4)); const c = (X.cross || []).find((x) => x.x === key); if (c) return crossScene(s, c); return nickScene(s, key); }
export const roster = () => (X.chars || []).map((c) => ({ id: c.id, name: c.name, role: c.role, job: c.job, also: c.also }));
