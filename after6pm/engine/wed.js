// 결혼 성향과 "상대가 먼저 꺼내는 결혼 얘기"(11-25 대표 요청). 자료: data/marry.json → GEN.MARRY
// - 성향 넷: eager 적극(사귄 지 12개월쯤 먼저 꺼낸다) · normal 보통(20개월) · slow 신중(30개월. 내 프러포즈는 한 번 미룬다) · never 비혼(먼저 안 꺼낸다. 세 번 얘기하면 마음이 열린다)
// - 먼저 꺼낸 얘기에 내가 고르는 답: 받는다(결혼식 고르기로) · 시간을 달라(12개월 뒤 다시, 세 번째는 최후통첩) · 생각이 없다(6개월 뒤 한 번 더, 또 거절하면 이별)
// - 비혼 네 명: 6개월 사이를 두고 세 번(단호한 거절 → 흔들림 → 수락). 결혼하고 12개월쯤 뒤 "결혼하길 잘했다" 장면이 한 번 뜬다
// - 히로인 열 명(s.hl[id])은 갈림길(end)이 정해지기 전에는 먼저 꺼내지 않는다
// - 상태: s.wed = { p: { 인물id: { since, n, askT, d, no, next, slowT, ring, nv, nvT, glad } } }. 없으면 만들어 쓴다(옛 저장도 그대로 열린다)
// - 엔진 난수를 쓰지 않는다(지문 고르기는 인물 번호와 횟수로). core.js 와는 서로 불러 쓰는 사이라, 맨 위에서는 core.js 것을 쓰지 않는다
import * as GEN from "../gen/data.js";
import * as RD from "./round.js";
import * as HL from "./heroine.js";
import { CHAR, addAff, addMoney, isRomanceable, creditRoom, ensureRel, log, jo, won } from "./core.js";

const M = GEN.MARRY || {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 숫자는 여기 한곳에
export const WD = {
  ask: { eager: 12, normal: 20, slow: 30 }, // 사귄 지 몇 달째에 먼저 꺼내는가(비혼은 없다)
  askAff: 75, // 처음 꺼낼 때 필요한 호감
  reAff: 50, // 다시 꺼낼 때 필요한 호감(미룬 뒤·거절한 뒤)
  delay: { gap: 12, aff: [-3, -6] }, // "시간을 달라": 다시 꺼내는 사이, 첫 번째·두 번째 호감. 세 번째는 최후통첩
  no: { gap: 6, aff: -10 }, // "생각이 없다": 한 번 더 묻는 사이, 호감. 또 거절하면 이별
  yes: { aff: 5, mental: 6 },
  slow: { gap: 6, aff: [2, -2] }, // 신중한 사람: 내 프러포즈를 한 번 미룬 뒤 다시 받아 주는 사이 · 그 자리 선택지 호감
  never: { gap: 6, aff: [[2, -3], [3, -1]], mental: [-4, 0] }, // 비혼: 얘기 사이 · 1·2단계 선택지별 호감 · 단계별 멘탈
  glad: { after: 12, family: 12, mental: 8, aff: 5 }, // "결혼하길 잘했다": 결혼 뒤 몇 달 · 가족 행복 · 멘탈
  propose: { months: 8, aff: 85 }, // core.js 의 프러포즈 조건과 같은 값(안내 글용)
  ring: 300, ap: 2, know: 60, // 반지 값 · 행동력 · 인물 창에 성향이 보이는 호감
  skipCal: [12], // 연말 결산 달에는 먼저 꺼내지 않는다(한 달에 큰 장면 하나)
};

// 배우자가 모은 돈(대표 결정 11-25): 결혼하는 날 그 사람이 모아 온 돈이 내 현금에 합쳐진다. 0.5억~3억, 인물마다 다르다(data/marry.json save: [금액(만원), 한마디]).
// 부자로 설정된 사람이 많이 들고 오는 게 아니라 착실하게 모으는 사람이 많이 들고 온다. 전체 크기는 x 하나로 조정한다(봇으로 견줄 때는 환경변수 SAVEX, 0 이면 끔). 물가가 오른 만큼(최대 1.5배) 같이 는다.
export const SAVE = { x: 1, base: 8000, piCap: 1.5 };
export function saveOf(s, id) { const env = typeof process !== "undefined" ? process.env?.SAVEX : undefined, x = env !== undefined && env !== "" ? +env : SAVE.x; const b = M.save?.[id]?.[0] ?? SAVE.base; return Math.round(b * x * Math.min(SAVE.piCap, Math.max(1, s.pi || 1)) / 100) * 100; }
export function saveScene(s, id, amt) {
  const c = CHAR[id], line = M.save?.[id]?.[1];
  return { kind: "event", who: id, tag: "결혼", expr: "smile", title: `${c.name} · 통장을 합친 날`, text: `신혼집 식탁에 통장 두 개를 나란히 놓았다. ${c.name}의 통장에는 ${won(amt)}이 들어 있었다.${line ? ` "${line}"` : ""}`, choices: [{ t: "같이 불려 보자고 한다", eff: {}, text: "" }] };
}

export const typeOf = (id) => M.types?.[id] || (CHAR[id]?.roles?.includes("romance") ? "normal" : null);
const box = (s) => { s.wed = s.wed || {}; s.wed.p = s.wed.p || {}; return s.wed; };
// 인물별 기록. 헤어졌다가 다시 사귀면(사귄 달이 바뀌면) 처음부터 다시 센다
function rec(s, id) {
  const B = box(s), x = s.rel?.[id], since = x?.loverSince ?? null; let P = B.p[id];
  if (!P || (x?.lover && P.since != null && since != null && P.since !== since)) P = B.p[id] = { glad: P?.glad };
  if (x?.lover && since != null) P.since = since;
  return P;
}
// 읽기만 하는 기록(화면용). 지난 연애의 기록은 보지 않는다
function peek(s, id) { const P = s.wed?.p?.[id], x = s.rel?.[id]; if (!P || !x?.lover) return { glad: P?.glad }; return P.since != null && x.loverSince != null && P.since !== x.loverSince ? { glad: P.glad } : P; }
const num = (id) => Number(String(id).replace(/\D/g, "")) || 0;
const JO = { 이: ["이", "가"], 은: ["은", "는"], 과: ["과", "와"], 을: ["을", "를"] };
function fill(t, id, o = {}) {
  const n = CHAR[id]?.name || "";
  return String(t || "").replace(/\{n(이|은|과|을|의|에게)?\}/g, (_, k) => (!k ? n : JO[k] ? jo(n, JO[k][0], JO[k][1]) : n + k)).replace(/\{say\}/g, o.say || "").replace(/\{m\}/g, o.m || "");
}
const mLabel = (m) => (m >= 12 ? `${Math.floor(m / 12)}년${m % 12 ? ` ${m % 12}개월` : ""}` : `${Math.max(1, m)}개월`);
const sgn = (v) => (v > 0 ? "+" : "") + Math.round(v * 10) / 10;
const pickV = (L, id, k = 0) => (Array.isArray(L) && L.length ? L[(num(id) + k) % L.length] : null);
const scene = (id, o) => ({ kind: "event", who: id, tag: "결혼", once: "big", best: [], expr: o.expr || "blush", wd: o.wd, title: `${CHAR[id].name} · ${o.title}`, text: o.text, onChoose: o.fn, wdK: o.keys, choices: o.choices });
const opt = (t, text) => ({ t, eff: {}, text: text || "" });

// ── 장면 만들기
// 처음 꺼내는 장면: 성향별 지문 + 그 사람의 한마디
function askScene(s, id) {
  const tp = typeOf(id), x = s.rel[id], P = rec(s, id), T = pickV(M.ask?.[tp] || M.ask?.normal, id, P.n || 0), say = M.say?.[id] || "우리, 결혼할까요.";
  const O = M.askOpt || ["받는다", "조금만 시간을 달라고 한다", "결혼은 생각이 없다고 한다"];
  return scene(id, { wd: "ask", fn: "wd_ask", title: T?.title || "먼저 꺼낸 말", keys: ["yes", "delay", "no"],
    text: fill(T?.text || "{n이} 먼저 결혼 얘기를 꺼냈다. \"{say}\"", id, { say, m: mLabel(s.t - (x.loverSince ?? s.t)) }),
    choices: [opt(O[0], fill(pickV(M.yes, id), id)), opt(O[1], fill(M.delay?.[0], id)), opt(O[2], fill(M.no, id))] });
}
// 시간을 달라고 한 뒤 다시 꺼내는 장면(한 번 미룬 뒤)
function reScene(s, id) {
  const T = pickV(M.re, id), O = M.reOpt || M.askOpt || [];
  return scene(id, { wd: "re", fn: "wd_ask", expr: "neutral", title: T?.title || "다시 꺼낸 얘기", keys: ["yes", "delay", "no"], text: fill(T?.text, id),
    choices: [opt(O[0], fill(pickV(M.yes, id, 1), id)), opt(O[1], fill(M.delay?.[1], id)), opt(O[2], fill(M.no, id))] });
}
// 두 번 미룬 뒤: 최후통첩(받는다 / 헤어진다)
function lastScene(s, id) {
  const T = pickV(M.last, id), O = M.lastOpt || [];
  return scene(id, { wd: "last", fn: "wd_ask", expr: "sad", title: T?.title || "여기까지", keys: ["yes", "bye"], text: fill(T?.text, id),
    choices: [opt(O[0], fill(M.lastYes, id)), opt(O[1], fill(pickV(M.bye, id), id))] });
}
// 결혼 생각이 없다고 한 뒤 한 번 더 묻는 장면(또 거절하면 이별)
function no2Scene(s, id) {
  const T = pickV(M.no2, id), O = M.no2Opt || [];
  return scene(id, { wd: "no2", fn: "wd_ask", expr: "neutral", title: T?.title || "한 번만 더", keys: ["yes", "delay", "bye"], text: fill(T?.text, id),
    choices: [opt(O[0], fill(pickV(M.yes, id, 1), id)), opt(O[1], fill(M.delay?.[0], id)), opt(O[2], fill(pickV(M.bye, id, 1), id))] });
}
// 신중한 사람이 내 프러포즈를 한 번 미룬다
function waitScene(s, id) {
  const T = pickV(M.waitText, id), say = M.wait?.[id] || "조금만 더 시간을 줘요. 싫은 게 아니에요.";
  return scene(id, { wd: "wait", fn: "wd_wait", expr: "neutral", title: T?.title || "조금만 더", text: fill(T?.text || "\"{say}\"", id, { say }),
    choices: (M.waitOpt || [{ t: "기다리겠다고 한다", text: "" }]).map((o) => opt(o.t, fill(o.text, id))) });
}
// 비혼 3단계(n: 1 단호한 거절 · 2 흔들림 · 3 수락)와 "결혼하길 잘했다"
function nvScene(s, id, n) {
  const T = M.never?.[id]?.["n" + n]; if (!T) return null;
  return scene(id, { wd: "nv" + n, fn: "wd_nv", expr: n === 3 ? "blush" : n === 2 ? "smile" : "neutral", title: T.title, text: T.text, choices: T.choices.map((o) => opt(o.t, o.text)) });
}
function gladScene(s, id) {
  const T = M.never?.[id]?.glad; if (!T) return null;
  return scene(id, { wd: "glad", fn: "wd_glad", expr: "smile", title: T.title, text: T.text, choices: T.choices.map((o) => opt(o.t, o.text)) });
}
// 결혼식 고르기(core.js weddingScene)로 넘긴다. 반지를 내미는 원래 글 대신 lead 를 쓴다
function wedScene(s, id, H, lead) {
  const sc = H?.weddingScene?.(s, id); if (!sc) return null;
  if (lead) { const mark = " 결혼식은 어떻게 할까?", k = sc.text.indexOf(mark); sc.text = k >= 0 ? lead + sc.text.slice(k) : `${lead} ${sc.text}`; sc.title = `결혼 · ${CHAR[id].name}`; }
  return sc;
}

// ── 달 마감: 상대가 먼저 꺼내는 결혼 얘기 + "결혼하길 잘했다"
const isBig = (q) => !!q && (q.kind === "year" || q.kind === "wedding" || q.kind === "perk" || !!q.cine || q.once === "big" || !!q.hev || !!q.wd);
export function wedMonth(s, r, notes, scenes) {
  if (!s?.rel || !s.fam) return; const B = box(s);
  const busy = scenes.some(isBig) || WD.skipCal.includes(s.cal); // 한 달에 큰 장면 하나: 이미 있으면 다음 달로 미룬다
  // 비혼이던 배우자의 "결혼하길 잘했다"(세 번 얘기해서 결혼한 사람만, 한 번)
  const sp = s.fam.spouse;
  if (sp && CHAR[sp] && typeOf(sp) === "never" && s.rel[sp]?.spouse) {
    const P = B.p[sp];
    if (P && (P.nv || 0) >= 3 && P.glad == null && s.t - (s.fam.marriedT ?? s.t) >= WD.glad.after && !busy) { const sc = gladScene(s, sp); if (sc) { P.glad = s.t; scenes.push(sc); } }
    return;
  }
  if (sp || !RD.loveOpen(s) || busy) return; // 배우자가 있거나, 연애가 잠긴 1회차거나, 이번 달에 큰 장면이 있으면 넘어간다
  for (const [id, x] of Object.entries(s.rel)) {
    const c = CHAR[id]; if (!c || !x.lover || x.spouse || x.affair || !isRomanceable(s, c)) continue;
    const tp = typeOf(id); if (!WD.ask[tp]) continue; // 비혼은 먼저 꺼내지 않는다
    const H = s.hl?.[id]; if (H && (!HL.forkDone(s, id) || H.away != null || (H.lock?.propose ?? -1) > s.t)) continue; // 11-25 갈림길이 없는 사람(자료가 덜 찬 사람 포함)은 건너뛰지 않게 forkDone 으로 본다 · 히로인 열 명: 갈림길이 끝나기 전·멀리 있는 동안·기다리기로 한 동안은 건너뛴다
    const P = rec(s, id), months = s.t - (x.loverSince ?? s.t);
    let sc = null;
    if (P.next != null) { // 미뤘거나 거절한 뒤
      if (s.t < P.next || x.aff < WD.reAff) continue;
      sc = P.no ? no2Scene(s, id) : (P.d || 0) >= 2 ? lastScene(s, id) : reScene(s, id);
    } else {
      if (P.askT != null || months < WD.ask[tp] || x.aff < WD.askAff) continue; // 한 번 꺼내고 답을 들은 사람은 다시 꺼내지 않는다
      sc = askScene(s, id);
    }
    if (!sc) continue;
    P.n = (P.n || 0) + 1; if (P.askT == null) P.askT = s.t; P.qT = s.t; delete P.next; // next 는 선택 처리(wd_ask)가 다시 잡는다
    scenes.push(sc); log(s, `${jo(c.name, "이", "가")} 먼저 결혼 얘기를 꺼냈다.`, "love");
    break; // 한 달에 하나
  }
}

// ── 내 프러포즈에 대한 답(신중·비혼, 그리고 먼저 결혼 얘기를 꺼냈던 사람). 돌려주는 값이 없으면 core.js 의 원래 프러포즈로 넘어간다
// core.js personAct 가 장면 대기·행동력(2)·연인·기간·호감을 먼저 본 뒤에 부른다. H = { weddingScene }
export function act(s, r, id, kind, H) {
  if (kind !== "propose") return null;
  const c = CHAR[id], x = s.rel?.[id]; if (!c || !x || !x.lover || x.spouse) return null;
  const tp = typeOf(id), P = rec(s, id), months = s.t - (x.loverSince ?? s.t);
  if (months < WD.propose.months || x.aff < WD.propose.aff || s.ap < WD.ap) return null;
  const poor = (v) => s.cash - v < -creditRoom(s);
  const pay = (ring) => { s.ap -= WD.ap; if (ring) { s.cash -= WD.ring; addMoney(s, "exp", "프러포즈 반지", WD.ring); P.ring = s.t; } x.last = s.t; x.dateT = s.t; };
  const noRing = { ok: false, msg: `반지 살 돈이 모자라요(${WD.ring}만)` };
  const wed = (lead) => { const sc = wedScene(s, id, H, lead); return sc ? { ok: true, scene: sc, lines: [] } : null; };
  if (tp === "never") {
    const n = P.nv || 0;
    if (n < 3 && P.nvT != null && s.t - P.nvT < WD.never.gap) return { ok: false, msg: `지난번 얘기를 꺼낸 지 얼마 안 됐어요(${WD.never.gap - (s.t - P.nvT)}개월 뒤에 다시)` };
    if (n >= 3) { pay(false); return wed(""); } // 이미 받아 준 사람(결혼식을 못 고른 채 넘어간 때)
    if (n === 2 && !P.ring && poor(WD.ring)) return noRing;
    const sc = nvScene(s, id, n + 1); if (!sc) return null;
    pay(n === 2 && !P.ring); P.nv = n + 1; P.nvT = s.t;
    return { ok: true, scene: sc, lines: [] };
  }
  if (P.askT != null) { // 먼저 결혼 얘기를 꺼냈던 사람: 내가 말하면 바로 받는다
    if (!P.ring && poor(WD.ring)) return noRing;
    pay(!P.ring); delete P.next; P.yesT = s.t; return wed("");
  }
  if (tp === "slow") {
    if (P.slowT == null) { if (poor(WD.ring)) return noRing; pay(true); P.slowT = s.t; return { ok: true, scene: waitScene(s, id), lines: [] }; }
    if (s.t - P.slowT < WD.slow.gap) return { ok: false, msg: `조금만 더 기다려 달라고 했어요(${WD.slow.gap - (s.t - P.slowT)}개월 뒤에 다시)` };
    if (!P.ring && poor(WD.ring)) return noRing;
    pay(!P.ring); P.yesT = s.t; return wed("");
  }
  return null;
}
// 인물 창의 프러포즈 버튼(신중·비혼만 글이 달라진다). null = 원래 버튼 그대로
export function propInfo(s, id) {
  const x = s.rel?.[id]; if (!x?.lover || !CHAR[id]) return null;
  const tp = typeOf(id), P = peek(s, id);
  if (tp === "never") {
    const n = P.nv || 0, left = P.nvT != null ? WD.never.gap - (s.t - P.nvT) : 0;
    if (n < 3 && left > 0) return { label: n >= 2 ? "프러포즈" : "결혼 이야기 꺼내기", sub: `${left}개월 뒤에 다시`, dis: true };
    if (n >= 2) return { label: "프러포즈", sub: `⚡${WD.ap}${P.ring ? " · 반지는 준비됐다" : ` · 반지 ${WD.ring}만`}` };
    return { label: n ? "결혼 이야기 다시 꺼내기" : "결혼 이야기 꺼내기", sub: `⚡${WD.ap}` };
  }
  if (tp === "slow" && P.slowT != null && P.askT == null) { const left = WD.slow.gap - (s.t - P.slowT); return left > 0 ? { label: "프러포즈", sub: `조금만 더 · ${left}개월 뒤에`, dis: true } : { label: "프러포즈", sub: `⚡${WD.ap} · 반지는 준비됐다` }; }
  if (P.ring) return { label: "프러포즈", sub: `⚡${WD.ap} · 반지는 준비됐다` };
  return null;
}
// 인물 창 한 줄("결혼 생각: …"). 호감 60부터 보인다(화면이 ui.js knowLv 로 가린다). 배우자·연애가 안 되는 사람은 빈 글
export function viewLine(s, id) {
  const c = CHAR[id], x = s.rel?.[id]; if (!c || !x || x.spouse || !isRomanceable(s, c)) return "";
  const tp = typeOf(id), L = M.label?.[tp]; if (!L) return "";
  const P = peek(s, id);
  if (tp === "never" && P.nv === 2) return `${L}고 했다. 그런데 요즘은 흔들린다`;
  if (tp === "never" && P.nv >= 3) return "마음을 바꿨다";
  if (tp === "slow" && P.slowT != null && P.askT == null && x.lover) return `${L} · 조금만 더 기다려 달라고 했다`;
  if (x.lover && P.next != null) return `${L} · ${P.no ? "내 대답을 다시 기다린다" : "내 대답을 기다린다"}`;
  return L;
}

// ── 선택 처리(core.js SCENE_FN 에 wd_ 이름으로 걸린다). H = { weddingScene, endLove }
function sayYes(s, id, P, H, out) {
  const g = addAff(s, id, WD.yes.aff); s.mental = clamp(s.mental + WD.yes.mental, 0, 100); delete P.next; P.yesT = s.t;
  out.push(`${CHAR[id].name} 호감 ${sgn(g)}`, `멘탈 +${WD.yes.mental}`);
  const sc = wedScene(s, id, H, fill((P.ring && M.wedLeadRing) || M.wedLead || "{n과} 결혼하기로 했다.", id)); if (sc) s.sceneQ.unshift(sc); // 이어서 결혼식 고르기(반지를 이미 건넨 사람은 글이 다르다)
}
export const WD_CHOOSE = {
  wd_ask(s, r, i, okv, sc, H) { // 먼저 꺼낸 얘기·다시 꺼낸 얘기·최후통첩·한 번 더 묻기
    const id = sc.who, x = s.rel?.[id], k = sc.wdK?.[i]; if (!x || !CHAR[id]) return [];
    const P = rec(s, id), out = [], nm = CHAR[id].name, t0 = P.qT ?? s.t; // 장면은 달 마감에 쌓이고 답은 다음 달 첫머리에 고른다. 사이는 꺼낸 달(qT)부터 센다
    if (k === "yes") sayYes(s, id, P, H, out);
    else if (k === "delay") {
      const n = (P.d = (P.d || 0) + 1), v = WD.delay.aff[Math.min(n, WD.delay.aff.length) - 1], g = addAff(s, id, v);
      delete P.no; P.next = t0 + WD.delay.gap; if (n >= 2) s._sceneText = fill(M.delay?.[1], id); // 두 번째부터는 서운한 글
      out.push(`${nm} 호감 ${sgn(g)}`, n >= 2 ? "다음에는 마지막으로 물을 것 같다" : `${WD.delay.gap}개월쯤 뒤에 다시 물어볼 거예요`);
    } else if (k === "no") {
      const g = addAff(s, id, WD.no.aff); P.no = (P.no || 0) + 1; P.next = t0 + WD.no.gap;
      out.push(`${nm} 호감 ${sgn(g)}`, `${WD.no.gap}개월쯤 뒤에 한 번 더 물어볼 거예요`);
    } else if (k === "bye") {
      delete P.next; P.end = s.t;
      if (H?.endLove) H.endLove(s, id, "결혼 얘기 끝에 헤어졌다."); else { x.lover = false; x.aff = Math.min(x.aff, 30); s.mental = clamp(s.mental - 12, 0, 100); }
      out.push(`${jo(nm, "과", "와")} 헤어졌다`, "멘탈 −12");
    }
    return out;
  },
  wd_wait(s, r, i, okv, sc) { // 신중한 사람의 "조금만 더"
    const id = sc.who; if (!s.rel?.[id]) return [];
    const v = WD.slow.aff[Math.min(i, WD.slow.aff.length - 1)] || 0, g = v ? addAff(s, id, v) : 0;
    return [v ? `${CHAR[id].name} 호감 ${sgn(g)}` : "", `${WD.slow.gap}개월 뒤에 다시 프러포즈할 수 있어요(반지는 그대로)`].filter(Boolean);
  },
  wd_nv(s, r, i, okv, sc, H) { // 비혼 3단계
    const id = sc.who, x = s.rel?.[id], n = Number(String(sc.wd || "").slice(2)) || 1; if (!x || !CHAR[id]) return [];
    const P = rec(s, id), out = [], nm = CHAR[id].name;
    if (n >= 3) { sayYes(s, id, P, H, out); return out; }
    const v = WD.never.aff[n - 1]?.[Math.min(i, 1)] || 0, m = WD.never.mental[n - 1] || 0;
    if (v) out.push(`${nm} 호감 ${sgn(addAff(s, id, v))}`);
    if (m) { s.mental = clamp(s.mental + m, 0, 100); out.push(`멘탈 ${sgn(m)}`); }
    out.push(n === 1 ? `헤어지지는 않았다 · ${WD.never.gap}개월 뒤에 다시 얘기해 볼 수 있어요` : `마음이 흔들린다 · ${WD.never.gap}개월 뒤에 한 번 더(호감 ${WD.propose.aff} 이상)`);
    return out;
  },
  wd_glad(s) { // "결혼하길 잘했다"
    const G = WD.glad, id = s.fam?.spouse, out = [];
    s.fam.happy = clamp((s.fam.happy || 0) + G.family, 0, 100); s.mental = clamp(s.mental + G.mental, 0, 100);
    if (id && s.rel?.[id]) addAff(s, id, G.aff);
    out.push(`가족 행복 +${G.family}`, `멘탈 +${G.mental}`);
    return out;
  },
};
export const WD_KEYS = Object.keys(WD_CHOOSE);

// ── 화면 시험용(ui.js #auto18-wdtest-<id>-<ask|delay|last|no|wait|never1|never2|never3|glad>). 조건을 맞춰 놓고 장면을 돌려준다(여는 것은 부른 쪽)
export function demo(s, id, kind) {
  const need = /^never|^glad/.test(kind) ? "never" : kind === "wait" ? "slow" : null;
  const fit = (q) => !!CHAR[q] && (need ? typeOf(q) === need : !!WD.ask[typeOf(q)]);
  if (!fit(id)) id = Object.keys(M.types || {}).find(fit); if (!id) return null;
  const c = CHAR[id]; s.pending = null; s.ng = { ...(s.ng || {}), n: Math.max(2, s.ng?.n || 1) }; s.ap = Math.max(s.ap, 5); s.cash = Math.max(s.cash, 1000);
  if (c.gender === s.me.gender) s.me.gender = c.gender === "F" ? "M" : "F"; // 시험판: 상대에 맞춰 주인공 성별을 바꿔 본다
  if (!s.cast.includes(id)) s.cast.push(id);
  for (const [oid, o] of Object.entries(s.rel)) if (oid !== id) { o.lover = false; if (o.spouse) { o.spouse = false; s.fam.spouse = null; } }
  const x = ensureRel(s, id); Object.assign(x, { lover: true, spouse: false, aff: 90, loverSince: s.t - (WD.ask[typeOf(id)] || 14), dateT: s.t, last: s.t, stage: Math.max(x.stage || 0, 3) }); if (x.heart == null) x.heart = s.t;
  s.fam.spouse = null;
  const P = (box(s).p[id] = { since: x.loverSince });
  if (kind === "ask") { P.n = 1; P.askT = s.t; return askScene(s, id); }
  if (kind === "delay") { P.n = 2; P.askT = s.t - 12; P.d = 1; return reScene(s, id); }
  if (kind === "last") { P.n = 3; P.askT = s.t - 24; P.d = 2; return lastScene(s, id); }
  if (kind === "no") { P.n = 2; P.askT = s.t - 6; P.no = 1; return no2Scene(s, id); }
  if (kind === "wait") { P.slowT = s.t; P.ring = s.t; return waitScene(s, id); }
  const nv = /^never([123])$/.exec(kind);
  if (nv) { P.nv = +nv[1]; P.nvT = s.t; if (P.nv === 3) P.ring = s.t; return nvScene(s, id, P.nv); }
  if (kind === "glad") { Object.assign(x, { lover: false, spouse: true }); s.fam.spouse = id; s.fam.spouseType = c.romance?.spouseType || "응원형"; s.fam.marriedT = s.t - WD.glad.after; P.nv = 3; P.glad = s.t; return gladScene(s, id); }
  return null;
}
