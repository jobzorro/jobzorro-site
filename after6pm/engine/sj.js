// 투잡 탐색 + 취미. 투잡은 처음부터 정해져 있지 않다. 너튜브·리포트·세미나·회사 소문·취미에서 '발견'하고, 두 개까지 고른다.
import * as D from "./defs.js";
import * as RD from "./round.js";
import { CHAR, addMoney, log, jo, won, gainStat, meetScene, openScene, sceneOk, reveal, ensureRel } from "./core.js";
import { DISC, SCENES } from "../gen/data.js";
import * as REG from "./reg.js"; // 새 투잡 플러그인(투잡 칸 +1·접기 조건)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function init() { return { int: {}, found: {}, active: [], know: {}, open: false, seen: {} }; }
export function hbInit() { return { joined: [], cnt: {}, lastT: {}, since: {} }; }

// ───────── 투잡 ─────────
// 투잡 칸: 기본 2개, 매니저(파티룸 매니저·에어씨앤씨 코호스트·컨설팅 공동 코치)를 두면 3개
export function slots(s) { return slots0(s) + RD.slotMore(s); } // 11-23 3회차 특전: 투잡 칸 +1
function slots0(s) { const coach = Object.entries(s.rel || {}).some(([id, x]) => x.helper && CHAR[id]?.helper?.effect === "cs_coach"); const plug = REG.JOBS.some((P) => P.slot && s[P.key] && P.slot(s)); return D.SJ_SLOTS + (s.pr?.sys?.manager || s.ab?.cohost || s.uc?.agent || coach || plug ? 1 : 0); }
// 버그 6: 투잡 칸 +1 을 주는 것(위탁·매니저·점장·코호스트·조교·하청·공동 코치)을 끄려 할 때, 끈 뒤 칸 수보다 하는 투잡이 많으면 막는다.
// off = 잠깐 꺼 보는 함수(되돌리는 함수를 돌려준다). 막아야 하면 안내 글, 아니면 null
export function slotLock(s, off) { const back = off(); const n = slots(s); back(); return (s.sj?.active?.length || 0) > n ? `투잡 하나를 먼저 접으세요(이걸 끊으면 투잡 칸이 ${n}개로 줄어요)` : null; }
// 버그 2: 시작 달 기록이 없는 옛 저장은 '불러온 달'이 아니라 지난 기록으로 거꾸로 채운다.
// 순서: 다른 쪽 기록(초반 고생 rp.t0 ↔ 부대비용 mk.t0) → 첫 매장 개월 수 → 투잡이 적어 둔 시작 달 → (이미 벌고 있던 투잡이면) 발견한 달 → 지금
const placesOf = (s, job) => (job === "pr" ? s.pr?.rooms : job === "airbnb" ? s.ab?.units : job === "ucafe" ? s.uc?.stores : s[job]?.stores);
const oldestM = (s, job) => { const L = placesOf(s, job); return Array.isArray(L) ? Math.max(0, ...L.map((x) => x?.months || 0)) : 0; };
export function backT0(s, job) {
  const ok = (v) => typeof v === "number" && isFinite(v) && v <= s.t;
  const a = s.sj?.rp?.[job]?.t0, b = s.mk?.t0?.[job];
  if (ok(a)) return a; if (ok(b)) return b;
  const m = oldestM(s, job); if (m > 0) return s.t - m;
  const own = job === "airbnb" ? s.ab?.t0 : (s[job]?.t0 ?? s[job]?.started);
  if (ok(own) && own >= 0) return own;
  if (hadRevenue(s, job)) { const f = s.sj?.found?.[job]; if (ok(f)) return Math.max(0, f); }
  return s.t;
}
// 불러올 때 한 번: 이미 '불러온 달'로 굳어 버린 시작 달을 첫 매장 개월 수에 맞춰 당긴다(매장 있는 투잡만 알 수 있다)
export function fixT0(s) {
  for (const job of s.sj?.active || []) {
    const m = oldestM(s, job); if (m < 2) continue; const t = s.t - m;
    const V = s.mk?.t0; if (V && typeof V[job] === "number" && V[job] - t >= 2) V[job] = t;
    const p = s.sj.rp?.[job]; if (p && typeof p.t0 === "number" && p.t0 - t >= 2) { const old = p.t0; p.t0 = t; for (const k of ["done", "grad", "shock"]) if (p[k] === old) p[k] = t; }
  }
}
export const isActive = (s, job) => !!s.sj?.active.includes(job);
export const isFound = (s, job) => s.sj?.found[job] !== undefined;
export function fit(s, job) { // 궁합 등급(능력치 기반)
  const f = D.SIDEJOBS[job].fit; const v = s.st[f[0]] * 0.5 + s.st[f[1]] * 0.3 + s.st[f[2]] * 0.2;
  return { v: Math.round(v), g: v >= 55 ? "S" : v >= 45 ? "A" : v >= 35 ? "B" : v >= 25 ? "C" : "D" };
}
// 관심도 올리기. 100이 되면 발견. hobby에서 오면 발견 장면으로 넘긴다(장면에서 확정).
export function addInt(s, job, v, holdAt) {
  const sj = s.sj; if (!D.SIDEJOBS[job] || isFound(s, job)) return null;
  if (v > 0) v = Math.max(1, Math.round(v * INFO));
  const before = sj.int[job] || 0; let after = clamp(before + v, 0, 100);
  if (holdAt && after >= holdAt) after = Math.min(after, 99);
  sj.int[job] = after;
  if (after >= 100) { found(s, job); return `${D.SIDEJOBS[job].n} 발견!`; }
  return `${D.SIDEJOBS[job].n} 이해도 +${Math.round(after - before)}%`;
}
export function found(s, job, how) {
  const sj = s.sj; if (isFound(s, job)) return;
  sj.int[job] = 100; sj.found[job] = s.t; sj.open = true;
  log(s, `투잡 발견: ${D.SIDEJOBS[job].n}${how ? ` (${how})` : ""}`, "work");
}
// 첫 3개월은 투잡 탐색만(v4.25): 시작은 4개월 차부터
export const PROBATION = 3;
export const NEED_CANDS = 2; // 투잡 후보(발견한 투잡)가 이만큼 있어야 고를 수 있다
// 초반 퀘스트(11-24): 첫 6개월 동안 ① 투잡 정보 5개 이상 → ② 이해도 100% 두 개 이상 → ③ 궁합 카드를 보고 고른다. 1회차 새 게임(s.flags.quest)에만 건다
export const QUEST = { info: 5, months: 6, hearX: 1.6 };
export const questOn = (s) => !!s.flags?.quest && (s.ng?.n || 1) <= 1 && !s.flags?.noProbation;
export const infoCount = (s) => Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && ((s.sj.int[k] || 0) > 0 || isFound(s, k))).length;
export function questInfo(s) {
  const info = infoCount(s), cands = foundCount(s), picked = (s.sj.active || []).length > 0 || !!s.flags?.questDone;
  const step = info < QUEST.info ? 1 : cands < NEED_CANDS ? 2 : picked ? 4 : 3;
  return { on: questOn(s) && !picked, info, cands, step, left: Math.max(0, QUEST.months - s.t), list: Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && (s.sj.int[k] || 0) > 0).sort((a, b) => (s.sj.int[b] || 0) - (s.sj.int[a] || 0)).map((k) => ({ k, n: D.SIDEJOBS[k].n, v: Math.round(s.sj.int[k] || 0) })) };
}
// 궁합 카드: 내 역량·특성이 그 투잡에 얼마나 맞는지 + 무엇을 키우면 좋은지
export function fitCard(s, job) {
  const j = D.SIDEJOBS[job]; if (!j) return null; const f = fit(s, job), W = [50, 30, 20], N = need(s, job);
  const stats = (j.fit || []).map((k, i) => ({ k, n: D.STATS[k], v: Math.round(s.st[k] || 0), w: W[i] || 0 }));
  const links = []; for (const id of s.me.traits || []) { const tr = D.TRAITS.find((x) => x.id === id); for (const h of tr?.hid || []) if (h.d === job) links.push({ n: tr.n, t: h.t }); }
  const grow = []; const seen = new Set();
  if (N && !N.ok) { grow.push({ n: N.n, cur: N.cur, to: N.need, how: N.how, why: "시작 문턱" }); seen.add(N.st); }
  if (SKILL[job] && N && !seen.has(N.st) && N.cur < SKILL[job]) { grow.push({ n: N.n, cur: N.cur, to: SKILL[job], how: N.how, why: "제값을 받는 수준" }); seen.add(N.st); }
  for (const x of stats) if (!seen.has(x.k) && x.v < 55) { grow.push({ n: x.n, cur: x.v, to: 55, how: STAT_HOW[x.k] || "공부", why: `궁합의 ${x.w}%` }); seen.add(x.k); }
  const line = { S: "타고났어요. 시작만 하면 돼요.", A: "잘 맞아요. 초반 고생이 짧아요.", B: "할 만해요. 아래 역량을 키우면 훨씬 편해요.", C: "쉽지 않아요. 역량부터 올리고 시작하는 걸 권해요.", D: "지금은 안 맞아요. 다른 후보를 먼저 보세요." }[f.g];
  return { job, n: j.n, g: f.g, v: f.v, stats, links, grow: grow.slice(0, 3), need: N, line, inc: j.inc, hours: j.hours, cap: j.cap };
}
export const foundCount = (s) => Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && isFound(s, k)).length;
// 고르는 때(11-24): 입사 6개월까지는 못 고른다 → 6개월을 채운 달에 '고르는 장면'이 꼭 뜬다 → 안 한다고 하면 1년 차에 다시, 그 뒤로는 해마다 묻는다.
// 투잡이 하나뿐이고 행동력이 남으면 "하나 더?"를 묻는다(5년 차 이후 한 번, 그 뒤로는 10년에 한 번). 둘을 하고 있으면 안 묻는다.
export const PICK = { t: 6, again: 12, addFirst: 60, addGap: 120, addAp: 2, max: 3 };
export const pickOpen = (s) => !!s.flags?.noProbation || s.t >= PICK.t || s.sj?.pickT !== undefined || (s.sj?.active || []).length > 0;
export function startLock(s) {
  if (pickOpen(s)) return null;
  const n = foundCount(s), left = PICK.t - s.t;
  return n >= NEED_CANDS
    ? `아직 이르다. 후보는 ${n}개나 알아 뒀으니, 지금은 회사와 취미에 집중하자. 투잡은 입사 ${PICK.t}개월을 채우고 신중하게 고른다(${left}달 남음)`
    : `아직 이르다. 입사 ${PICK.t}개월까지는 회사 적응과 탐색 기간. 그동안 후보를 ${NEED_CANDS}개 이상 알아 두자(지금 ${n}개 · ${left}달 남음)`;
}
function pickCands(s, fillTo) { // 발견한 후보(궁합 높은 순) + 모자라면 이해도 높은 순으로 채운다
  const play = Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && !isActive(s, k));
  const a = play.filter((k) => isFound(s, k)).sort((x, y) => fit(s, y).v - fit(s, x).v).slice(0, PICK.max);
  if (a.length < fillTo) for (const k of play.filter((k) => !isFound(s, k)).sort((x, y) => (s.sj.int[y] || 0) - (s.sj.int[x] || 0))) { if (a.length >= fillTo) break; a.push(k); }
  return a;
}
export function pickScene(s, kind) { // kind: first(6개월) · again(다시 묻기) · add(하나 더)
  const ks = pickCands(s, kind === "add" ? 1 : 2); if (!ks.length) return null;
  const label = (k) => `${D.SIDEJOBS[k].n}${isFound(s, k) ? ` · 궁합 ${fit(s, k).g}` : " · 아직 덜 알아본 후보"}`;
  const T = {
    first: ["투잡을 고를 시간", `입사 ${PICK.t}개월. 회사 일은 손에 익었고, 메모장에는 후보가 적혀 있다. ${ks.map((k) => D.SIDEJOBS[k].n).join(", ")}. 이제 하나를 고르자.`, "아직은 회사에 집중한다 (1년 차에 다시 고민)"],
    again: ["올해는 투잡을 해 볼까", `또 한 해가 지났다. 퇴근 후 시간은 여전히 비어 있다. 메모장의 후보: ${ks.map((k) => D.SIDEJOBS[k].n).join(", ")}.`, "올해도 회사에 집중한다 (1년 뒤에 다시 고민)"],
    add: ["투잡을 하나 더?", `${jo(D.SIDEJOBS[s.sj.active[0]]?.n || "투잡", "은", "는")} 손에 익었다. 이번 달도 행동력이 남았다. 남는 시간에 투잡을 하나 더 얹어 볼까? 둘을 굴리면 버는 길은 넓어지지만 저녁은 더 바빠진다.`, "지금 하는 일에 집중한다"],
  }[kind];
  return { kind: "event", tag: "투잡 탐색", title: T[0], text: T[1], onChoose: "sj_pick", pk: { kind, ks }, choices: [...ks.map((k) => ({ t: label(k), eff: {}, text: "" })), { t: T[2], eff: {}, text: "" }] };
}
export function pickChoose(s, r, i, sc) {
  const P = sc.pk || {}, k = (P.ks || [])[i], sj = s.sj;
  if (!k) {
    if (P.kind === "add") { s._sceneText = "하나를 제대로 키우는 것도 방법이다. 남는 저녁은 쉬거나, 회사나 사람에게 쓰자."; return ["지금 투잡에 집중"]; }
    sj.pickNext = s.t < PICK.again ? PICK.again : s.t + 12;
    s._sceneText = "서두르지 않기로 했다. 그동안 후보를 더 알아보고, 역량을 올려 두자. 마음이 바뀌면 투잡 탐색에서 언제든 시작할 수 있다.";
    return [`${Math.max(1, sj.pickNext - s.t)}달 뒤에 다시 고민한다`];
  }
  if (!isFound(s, k)) found(s, k, "급하게 알아봄");
  const res = start(s, k);
  if (!res.ok) { s._sceneText = res.msg; return []; }
  s._sceneText = `${jo(D.SIDEJOBS[k].n, "으로", "로")} 정했다. 퇴근 후 시간에 이름이 생겼다. 전체 메뉴에 ${D.SIDEJOBS[k].n} 칸이 열렸다.`;
  return [`${D.SIDEJOBS[k].n} 시작`, ...(res.hid || []).map((x) => `숨은 특성: ${x}`)];
}
export function pickMonth(s, r, notes, scenes) { // 달 마감(s.t 가 오르기 전)에 돈다. nt = 다음 달
  if (s.flags?.noProbation || s.over) return;
  const sj = s.sj, nt = s.t + 1, n = (sj.active || []).length;
  if (n === 0) {
    const due = sj.pickT === undefined ? nt >= PICK.t : nt >= (sj.pickNext ?? nt + 1);
    if (!due) return;
    const sc = pickScene(s, sj.pickT === undefined && nt <= PICK.t ? "first" : "again"); if (!sc) return;
    sj.pickT = nt; sj.pickNext = nt + 12; scenes.push(sc); return;
  }
  if (sj.pickT === undefined) sj.pickT = nt; // 이미 투잡을 하고 있으면 고르는 장면은 지나간 것으로 본다
  if (n === 1 && slots(s) >= 2 && s.ap >= PICK.addAp && nt >= PICK.addFirst && nt - (sj.addT ?? -999) >= PICK.addGap) {
    const sc = pickScene(s, "add"); if (!sc) return;
    sj.addT = nt; scenes.push(sc);
  }
}
const INFO = 0.7; // 정보 구하기는 생각보다 어렵다(v4.25): 관심 오르는 양 30% 줄임
export function start(s, job) {
  const j = D.SIDEJOBS[job], sj = s.sj;
  if (!j) return { ok: false, msg: "없는 투잡" };
  if (!isFound(s, job)) return { ok: false, msg: "아직 발견하지 못한 투잡" };
  if (!j.play) return { ok: false, msg: "이 투잡은 준비 중이에요(다음 업데이트)" };
  if (isActive(s, job)) return { ok: false, msg: "이미 하고 있어요" };
  { const why = startLock(s); if (why) return { ok: false, msg: why }; }
  if (sj.pickT === undefined) sj.pickT = s.t;
  if (sj.active.length >= slots(s)) return { ok: false, msg: `투잡은 지금 ${slots(s)}개까지. 매니저를 두면 한 칸 늘어요` };
  sj.active.push(job); s.flags.questDone = s.t; log(s, `${jo(j.n, "을", "를")} 시작하기로 했다.`, "work");
  { const P = REG.get(job); if (P) { if (!s[job]) s[job] = P.init(s); if (P.onStart) P.onStart(s); } }
  const hid = reveal(s, job);
  const N = need(s, job); const warn = N && !N.ok ? ` · ${N.n} ${N.cur}/${N.need}: 초반이 더 힘들 거예요` : "";
  return { ok: true, hid, msg: `${j.n} 시작! 전체 메뉴에 ${j.n} 칸이 열렸어요${warn}${hid.length ? ` · 숨은 특성 ${hid.length}개 공개` : ""}` };
}
export function stop(s, job) {
  if (!isActive(s, job)) return { ok: false, msg: "하고 있지 않아요" };
  if (job === "pr" && s.pr.rooms.length) return { ok: false, msg: "지점을 모두 양도해야 접을 수 있어요" };
  if (job === "cs" && s.cs.queue.length) return { ok: false, msg: "대기 고객을 먼저 끝내야 해요" };
  const P = REG.get(job); if (P?.stopWhy) { const why = P.stopWhy(s); if (why) return { ok: false, msg: why }; }
  s.sj.active = s.sj.active.filter((x) => x !== job);
  if (job === "cs") { s.cs.open = false; s.cs.ads = 0; }
  if (P?.onStop) P.onStop(s);
  log(s, `${jo(D.SIDEJOBS[job].n, "을", "를")} 접었다.`, "work");
  return { ok: true, msg: `${D.SIDEJOBS[job].n} 접음` };
}
function unfound(s) { return Object.keys(D.SIDEJOBS).filter((k) => !isFound(s, k)); }

export function can(s, id, arg) {
  if (id === "sj_report" || id === "sj_interview") { if (!arg || !D.SIDEJOBS[arg]) return "투잡을 고르세요"; if (id === "sj_interview" && (s.sj.int[arg] || 0) < 30 && !isFound(s, arg)) return "관심 30 이상이어야 물어볼 사람을 찾는다"; if (id === "sj_interview" && s.sj.know[arg]) return "이미 들었다"; if (id === "sj_report" && isFound(s, arg)) return "이미 발견한 투잡"; }
  if ((id === "sj_youtube" || id === "sj_seminar") && !unfound(s).length) return "더 찾을 투잡이 없다";
  if (id === "sj_prep" || id === "sj_senior") { const E = ENTRY[arg]; if (!E) return "투잡을 고르세요"; if (!isFound(s, arg) && (s.sj.int[arg] || 0) < 30) return "관심 30 이상이어야 해요"; if (id === "sj_prep") { if (isActive(s, arg)) return "이미 시작했어요(준비는 시작 전에)"; if (rp(s, arg).prep >= 3) return "준비는 다 했어요(3/3)"; if (s.cash < E.prep.cost) return "준비비가 모자라요"; } else { const p = rp(s, arg); if (p.sen >= 3) return "선배에게 들을 건 다 들었어요(3/3)"; if (p.sen >= 1 && !isActive(s, arg)) return "다음 만남은 시작한 뒤에(첫 달 막혔을 때)"; if (p.sen >= 2 && (p.t0 === undefined || s.t - p.t0 < 2)) return "세 번째 만남은 영업 두 달 뒤에(다음 단계 앞)"; if (p.senT === s.t) return "이번 달은 이미 만났어요"; } }
  if (id === "hb_go") { if (!s.hb.joined.includes(arg)) return "가입한 취미가 아니에요"; if (s.hb.lastT[arg] === s.t) return "이번 달 모임은 다녀왔다"; }
  return null;
}
export function act(s, r, id, arg) {
  const lines = [];
  if (id === "sj_youtube") {
    const picks = r.shuffle(unfound(s)).slice(0, 2);
    for (const j of picks) { const l = addInt(s, j, r.int(14, 24)); if (l) lines.push(l); }
    return { lines, msg: r.pick(["\"월 천 버는 부업 TOP 5\" 썸네일에 또 낚였다. 그래도 하나는 진짜 같다.", "알고리즘이 나보다 내 관심사를 잘 안다.", "댓글창에 실제 해 본 사람 후기가 더 쓸모 있었다."]) };
  }
  if (id === "sj_report") { const l = addInt(s, arg, 35); return { lines: [l], msg: `투잡연구소 「${D.SIDEJOBS[arg].n}」 리포트. 수익 중위값과 현장 고생이 같이 적혀 있다.` }; }
  if (id === "sj_seminar") {
    const picks = r.shuffle(unfound(s)).slice(0, 3);
    for (const j of picks) { const l = addInt(s, j, r.int(16, 26)); if (l) lines.push(l); }
    const cands = s.cast.filter((cid) => !s.rel[cid] && (CHAR[cid]?.hangouts || []).some((h) => ["seminar", "officest", "online"].includes(h)));
    const res = { lines, msg: "투잡 세미나. 질문 시간에 손이 제일 많이 올라간 건 '회사에 안 들키는 법'." };
    if (cands.length && r.chance(0.6)) res.scene = openScene(s, meetScene(s, r.pick(cands), "세미나 쉬는 시간, 옆자리 사람이 말을 걸었다. "));
    return res;
  }
  if (id === "sj_interview") {
    s.sj.know[arg] = s.t; const l = addInt(s, arg, 50); const j = D.SIDEJOBS[arg]; const f = fit(s, arg);
    return { lines: [l, `궁합 ${f.g}`].filter(Boolean), msg: `해 본 사람에게 커피를 샀다. "${j.line}" 수익은 ${j.inc}, 시간은 ${j.hours}. 시작 자본 ${j.cap}.` };
  }
  if (id === "sj_prep") return prepAct(s, arg);
  if (id === "sj_senior") { rp(s, arg).senT = s.t; addInt(s, arg, 20); return { lines: ["커피값 −3만"], msg: "", scene: seniorScene(s, arg) }; }
  if (id === "hb_go") return hbGo(s, r, arg);
  return { lines };
}

// ───────── 발견 장면 ─────────
export function discScene(s, hobby, job) {
  const d = DISC.find((x) => x.hobby === hobby && x.job === job);
  const j = D.SIDEJOBS[job], h = D.HOBBIES[hobby];
  const text = d?.text || `${h.n} 뒤풀이에서 ${j.n} 이야기가 나왔다. "${j.line}" 생각보다 가까운 사람이 하고 있었다.`;
  return { kind: "disc", job, hobby, title: d?.title || `취미에서 찾은 투잡 · ${j.n}`, tag: "투잡 발견", text: text + (j.play ? "" : " (이 투잡은 다음 업데이트에서 열린다)"), onChoose: "sj_disc", choices: [
    { t: d?.yes || "자세히 물어본다", eff: { mental: 2 }, text: d?.yesText || "연락처를 받았다. 집에 가는 길에 검색만 한 시간." },
    { t: d?.no || "그냥 흘려듣는다", eff: {}, text: d?.noText || "재밌는 얘기였다. 나랑은 상관없겠지." },
  ] };
}
export function discChoose(s, sc, i) {
  if (sc?.coach) return coachChoose(s, sc, i);
  if (i === 0) { found(s, sc.job, `${D.HOBBIES[sc.hobby]?.n || "취미"}에서`); return [`투잡 발견: ${D.SIDEJOBS[sc.job].n}`, D.SIDEJOBS[sc.job].play ? "투잡 탐색에서 시작할 수 있다" : "준비 중인 투잡"]; }
  s.sj.int[sc.job] = 70; return ["이해도 70%에서 멈춤"];
}
export function introScene() {
  return { kind: "event", title: "옆 팀 김 대리의 비밀", tag: "투잡 탐색 열림", text: "탕비실에서 들은 이야기. 옆 팀 김 대리가 퇴근 후 파티룸 두 곳을 돌린단다. 회계팀 누구는 밤마다 웹소설을 연재하고, 신입 하나는 주말에 타로를 본다고. 월급만으로는 집 한 채가 멀다. 나도... 뭘 해 볼까? (첫 3개월은 회사 적응 기간. 투잡은 알아보기만 할 수 있어요)", onChoose: "sj_intro", choices: [
    { t: "오늘부터 투잡을 알아본다", eff: { mental: 2 }, text: "퇴근길 지하철에서 '직장인 부업'을 검색했다. 투잡 탐색이 열렸다. 시작은 4개월 차부터." },
    { t: "일단 회사에 집중한다", eff: { stat: { career: 1 } }, text: "그래도 궁금하긴 하다. 투잡 탐색은 언제든 열어 볼 수 있다." },
  ] };
}
export function introChoose(s, i) {
  s.sj.open = true; const k = i === 0 ? 1 : 0.5;
  // 파티룸·웹소설·타로는 이야기에 나왔으니 조금씩, 나머지는 판마다 하나 골라 조금
  let h = 0; for (const c of String(s.seed ?? s.me?.name ?? "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = ["cs", "insta", "airbnb", "ucafe", "tutoring", "vibe", "chicken"];
  addInt(s, "pr", 14 * k); addInt(s, "webnovel", 10 * k); addInt(s, "tarot", 10 * k); addInt(s, pool[h % pool.length], 10 * k);
  return ["전체 메뉴: 투잡 탐색 열림", `투잡 시작은 ${PROBATION + 1}개월 차부터`];
}

// ───────── 취미 ─────────
export function hbLv(s, id) { const c = s.hb.cnt[id] || 0; let lv = 0; D.HOBBY_LV.forEach((x, i) => { if (c >= x.need) lv = i; }); return lv; }
export function hbMax(s) { return D.HOBBY_MAX + (Object.keys(D.HOBBIES).some((k) => s.hb.joined.includes(k) && hbLv(s, k) >= 4) ? 1 : 0); }
export function hbJoin(s, id) {
  const h = D.HOBBIES[id]; if (!h) return { ok: false, msg: "없는 취미" };
  if (s.hb.joined.includes(id)) return { ok: false, msg: "이미 다니는 중" };
  if (s.hb.joined.length >= hbMax(s)) return { ok: false, msg: `취미는 ${hbMax(s)}개까지(하나를 그만두세요)` };
  s.hb.joined.push(id); s.hb.since[id] = s.t; log(s, `${h.n}에 가입했다.`, "life");
  return { ok: true, msg: `${h.n} 가입 · 회비 월 ${h.fee}만` };
}
export function hbLeave(s, id) { s.hb.joined = s.hb.joined.filter((x) => x !== id); return { ok: true, msg: `${D.HOBBIES[id].n} 탈퇴` }; }
export function members(s, id) {
  const h = D.HOBBIES[id]; const keys = Object.keys(D.HOBBIES);
  return s.cast.filter((cid) => { const c = CHAR[cid]; if (!c) return false; if ((c.likes || []).some((l) => h.like.includes(l))) return true; if ((c.hangouts || []).includes("club")) return keys[hashN(cid) % keys.length] === id; return false; });
}
function hashN(str) { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
const CO_RE = /(대리|과장|사원|팀장|기획|마케터|개발자|인사|회계|영업|MD|PM|디자이너|연구원|재무|컨설턴트|애널리스트|회사원|직장인|행원)/;
// 11-24 우리 회사 사람만: 예전에는 직업 글에 '사원·인사·팀장' 같은 낱말이 있거나 오피스 거리(officest)에 다니기만 해도 회사에 나와서, 호텔 매니저·대학 취업지원센터 팀장이 우리 사무실에 앉아 있었다. 다른 회사 사람은 자기 장소(오피스 거리 등)에만 나온다
export function coworkers(s) { return s.cast.filter((id) => { const c = CHAR[id]; return c && (c.co || (c.hangouts || []).includes("office")) && !(c.hire && !(s.co.hired || []).includes(id)); }); } // 11-25 입사 전 신입·경력직·인턴은 회사 장소에 서지 않는다
export function refresh(s, r) { // 이번 달 회사·모임에 나오는 사람들
  for (const job of s.sj?.active || []) { const p = s.sj.rp?.[job]; if (ENTRY[job] && p && p.t0 !== undefined && p.t0 < s.t && p.shock === undefined && p.done === undefined) { p.shock = s.t; (s.sceneQ = s.sceneQ || []).push(shockScene(s, job)); } } // 첫 영업 달 정산 뒤 '생각보다 안 되네'
  if (!(s.co.quit || s.co.fired)) {
    const pool = r.shuffle(coworkers(s).filter((id) => !s.rel[id]?.spouse)).slice(0, r.int(3, 5));
    for (const sp of Object.values(s.spot)) for (const id of pool) { const i = sp.indexOf(id); if (i >= 0) sp.splice(i, 1); }
    // 11-25 회사 종류에 맞는 장소(defs CO_SPOTS)에 고르게 선다: 난수는 전처럼 한 사람에 한 번, 뽑힌 곳에 이미 누가 있으면 그다음 빈 곳으로 옮긴다. 잠긴 곳(대기업 임원층)은 뺀다
    const L = D.coSpots(s.co.type).filter((sp) => !(sp.lockRank !== undefined && (s.co.rank || 0) < sp.lockRank)).map((sp) => sp.id), full = (k) => (s.spot[k] || []).length > 0;
    for (const id of pool) { let k = r.pick(L); if (full(k)) { const i = L.indexOf(k); for (let d = 1; d < L.length; d++) { const x = L[(i + d) % L.length]; if (!full(x)) { k = x; break; } } } (s.spot[k] = s.spot[k] || []).push(id); }
  }
  for (const id of s.hb.joined) {
    const m = members(s, id).filter((cid) => !s.rel[cid]?.spouse);
    const n = Math.min(m.length, r.int(2, 4));
    s.spot["hb_" + id] = r.shuffle(m).slice(0, n);
  }
}
function hbGo(s, r, id) {
  const h = D.HOBBIES[id], lv0 = hbLv(s, id), lines = [];
  s.hb.cnt[id] = (s.hb.cnt[id] || 0) + 1; s.hb.lastT[id] = s.t;
  s.mental = clamp(s.mental + h.mental, 0, 100); lines.push(`멘탈 +${h.mental}`);
  for (const [k, v] of Object.entries(h.stat)) lines.push(`${D.STATS[k]} +${gainStat(s, k, v * (1 + lv0 * 0.1), "hb_" + id).toFixed(1)}`);
  if (h.hpMax) lines.push(`체력 +${gainStat(s, "body", h.hpMax * 3, "hb_" + id).toFixed(1)}`);
  const lv = hbLv(s, id); if (lv > lv0) { lines.push(`${h.n} ${D.HOBBY_LV[lv].n}!`); log(s, `${h.n} ${D.HOBBY_LV[lv].n}이 됐다.`, "life"); }
  // 투잡 발견: 취미에 딸린 투잡 관심이 오른다. 80을 넘으면 발견 장면
  let scene = null;
  for (const j of h.jobs) {
    if (isFound(s, j)) continue;
    const l = addInt(s, j, r.int(7, 13) * (1 + lv0 * 0.15), 100); if (l) lines.push(l);
    if (!scene && (s.sj.int[j] || 0) >= 80 && !s.sj.seen[`${id}_${j}`]) { s.sj.seen[`${id}_${j}`] = s.t; scene = openScene(s, discScene(s, id, j)); }
  }
  if (!scene && r.chance(0.25)) { s.hb.sceneT = s.hb.sceneT || {}; const c = SCENES.filter((x) => x.where === "hobby_" + id && sceneOk(s, x) && !((s.hb.sceneT[x.id] ?? -99) > s.t - 10)); if (c.length) { const x = r.pick(c); s.hb.sceneT[x.id] = s.t; scene = openScene(s, { ...x }); } }
  return { lines, msg: h.desc, scene };
}
export function month(s, r, notes) {
  coachMonth(s, notes);
  let fee = 0; for (const id of s.hb.joined) fee += D.HOBBIES[id].fee;
  if (fee) { s.cash -= fee; addMoney(s, "exp", "취미 회비", fee); }
  for (const id of s.hb.joined) if (s.hb.lastT[id] !== s.t && (s.hb.since[id] ?? 0) < s.t) { notes.push(`${D.HOBBIES[id].n}: 이번 달 결석. 회비만 냈다`); }
  // 모임장 보너스: 내가 이끄는 모임이 내 파티룸을 빌린다
  const lead = s.hb.joined.filter((id) => hbLv(s, id) >= 4 && D.HOBBIES[id].jobs.includes("pr"));
  const open = s.pr.rooms.filter((rm) => rm.status === "open");
  if (lead.length && open.length && isActive(s, "pr")) { const v = Math.round(open[0].price * 2 * lead.length); s.cash += v; addMoney(s, "inc", "파티룸 매출", v); notes.push(`내 모임이 파티룸을 빌렸다 +${won(v)}`); }
  // 멘토링 봉사 고인물: 컨설팅 소개 손님
  if (s.hb.joined.includes("mentor") && hbLv(s, "mentor") >= 2 && isActive(s, "cs") && s.cs.open) s.cs.refer += 0.3;
}
export function todos(s) {
  const t = [];
  if (!s.sj.open) return t;
  const ready = Object.keys(s.sj.found).filter((k) => D.SIDEJOBS[k].play && !isActive(s, k));
  if (ready.length && s.sj.active.length < D.SJ_SLOTS) t.push(pickOpen(s) ? { lv: 1, text: `발견한 투잡: ${ready.map((k) => D.SIDEJOBS[k].n).join(", ")} · 시작할 수 있어요`, go: "sj" } : { lv: 0, text: `투잡 후보: ${ready.map((k) => D.SIDEJOBS[k].n).join(", ")} · 고르는 건 ${PICK.t}개월을 채운 뒤(${PICK.t - s.t}달 남음)`, go: "sj" });
  if (!s.sj.active.length && !ready.length && s.t >= 2) t.push({ lv: 0, text: "투잡 탐색: 너튜브·리포트·취미에서 찾아보기", go: "sj" });
  for (const id of s.hb.joined) if (s.hb.lastT[id] !== s.t) t.push({ lv: 0, text: `${D.HOBBIES[id].n} 이번 달 모임 아직(회비 ${D.HOBBIES[id].fee}만)`, go: "hobby" });
  if (!s.hb.joined.length && s.t >= 1) t.push({ lv: 0, text: "취미가 없다. 인연도 투잡도 취미에서 온다", go: "hobby" });
  if (!s.sj.coachOff) {
    for (const job of s.sj.active) { const p = s.sj.rp?.[job]; if (p?.tip && p.done === undefined) t.push({ lv: 1, text: `코치 · ${D.SIDEJOBS[job].n}: ${p.tip}`, go: job }); }
    const gap = ready.find((k) => ENTRY[k] && (!need(s, k).ok || rp(s, k).prep < 3)); if (gap && s.sj.active.length < slots(s)) { const N = need(s, gap); t.push({ lv: 0, text: `${D.SIDEJOBS[gap].n} 시작 전: ${N.n} ${N.cur}/${N.need} · 준비 ${rp(s, gap).prep}/3 · 선배 찾아가기`, go: "sj" }); }
  }
  return t;
}

// ───────── 진입 준비 · 초반 고생 · 선배 코치 (11-21) ─────────
// 투잡마다 핵심 역량(st)·기준(need)을 둔다. 모자라도 시작은 되지만 초반 수요가 더 낮게, 더 천천히 오른다.
// 초반 수요 배율 ramp(): 첫 영업 달(t0)부터 f0에서 1까지. 시간만으로도 rm달이면 다 오르지만(가만히 있으면 느림),
// 마케팅·후기·품질 행동(acts)을 하면 pt점에서 다 오른다(한 달 최대 4점, 영업 시작 뒤부터). rm = 2R, pt = 8R(R = 기획 데이터 ramp 참고):
// 꾸준히 하면 R달, 가만히 있으면 2R달, 역량이 모자라면 더 늦게. 다 오르면 그 뒤로는 1(중후반 곡선은 그대로).
// 기획 데이터: 투잡연구소 09_게임 기획/data/<투잡>.json 의 income.ramp_months_to_median·start·codex_facts·fixed_costs
const RP_CAP = 4; // 한 달에 쌓이는 노력 점수 상한
export const ENTRY = {
  pr: { st: "num", need: 35, f0: 0.92, rm: 6, pt: 24, disc: 10, who: "c094", whoN: "파티룸 3곳 운영 4년 차 사장님",
    prep: { cost: 5, list: ["상권 앱으로 주변 파티룸 30곳 예약표 훑기", "공간대여 창업 강의 듣기", "청소·민원 체크리스트 만들기"] },
    acts: { pr_promo: "mkt", pr_review: "rev", pr_club: "mkt", pr_decor: "qual", pr_meetup: "qual", pr_course: "qual", pr_appcheck: "mkt" },
    shock: "첫 정산서. 토요일 저녁 몇 타임 빼고 예약표가 텅 비었다. 사진은 휴대폰으로 대충 찍었고, 후기는 0개, 가격은 옆 공간과 똑같다. 손님 입장에선 여기를 고를 이유가 없다.",
    tips: [{ a: "pr_promo", k: "mkt", t: "사진부터 다시 찍어요. 예약은 사진에서 갈려요. '홍보 사진 찍기' 한 번이면 예약표가 달라져요." }, { a: "pr_review", k: "rev", t: "후기 0개면 아무도 안 골라요. 음료 쿠폰 걸고 '리뷰 이벤트'로 첫 후기부터 모아요." }, { a: "pr_decor", k: "qual", t: "휑한 공간은 사진에서 걸러져요. '파티룸 꾸미기'로 포토존 하나만 채워도 달라요." }, { a: "pr_club", k: "mkt", t: "첫 손님은 아는 사람에게서 와요. 내 모임을 불러 '모임 대관 행사'를 열어 봐요." }, { a: "pr_meetup", k: "qual", t: "'파티룸 사장 모임'에 한 번 나가 봐요. 남의 가격표를 보면 내 실수가 보여요." }],
    sen: [
      { t: "\"20평 하나 차리는 데 보증금까지 4,000만 원쯤 들어. 월세는 매출의 30~50% 안으로 잡아야 남고. 첫 달 0~50만, 둘째 달 100만, 셋째 달 150만이 보통이야. 건물주가 파티룸을 싫어하면 시작도 못 해. 계약 전에 꼭 물어봐.\"", m: "보증금 포함 약 4,000만 · 월세는 매출의 30~50% 안 · 1달차 0~50만 → 3달차 150만 · 건물주 동의 먼저" },
      { t: "\"예약 많은 곳은 거의 다 즉시결제야. 토요일 저녁 7시가 제일 잘 팔리고, 평일은 비는 게 정상이야. 평일 할인보다 생일·브라이덜샤워 같은 컨셉 사진을 먼저 올려.\"", m: "즉시결제 켜기 · 토요일 저녁 7시가 피크 · 평일 공실은 정상 · 컨셉 사진 먼저" },
      { t: "\"솔직히 하나만 하면 안 돼. 방 하나면 공실·월세·청소비가 전부 그 한 곳에 걸려. 보일러 한 번 고장 나면 그달은 끝이야. 나는 세 곳이라 겹친 예약은 옆 방으로 넘기고, 청소 업체·예약 프로그램은 같이 써서 방당 비용이 확 줄었어. 대신 2호점은 1호점이 6개월 넘게 흑자일 때만. 6개월 내내 적자면 그 방은 전략을 바꾸거나 접을 때고. 새로 연 곳 상당수가 1년 안에 문 닫아.\"", m: "하나만 하면 위험이 한 곳에 몰림 · 2~3곳이면 예약 넘기기·청소·예약 프로그램 나눠 쓰기 · 2호점은 1호점 6개월 흑자 뒤 · 6개월 적자면 전략 수정이나 정리" }],
    ask: "\"대리석 테이블은 들이지 마. 한 번 깨지면 수십만 원이야. 소모품은 대용량으로 사고.\"", help: ["hands", "주말에 선배 파티룸 청소를 같이 했다. 소파 틈에 케이크 크림이 끼어 있었다. 이게 현실이다."],
    next: "예약이 자리 잡았어요. 이제 별점 4.6을 지키면서 가격을 조금씩 올려 봐요. 방 하나로 끝내진 마요. 1호점이 6개월 흑자면 2호점, 2~3곳은 돼야 위험이 나뉘어요." },
  cs: { st: "career", need: 40, f0: 0.55, rm: 18, pt: 72, disc: 5, who: "c030", whoN: "인사팀 출신 커리어 너튜버",
    prep: { cost: 5, list: ["합격 자소서 20개 구조 분석", "무료 첨삭 3명으로 포트폴리오 만들기", "컨설팅 입문 강의 듣기"] },
    acts: { cs_friend: "rev", cs_kmong: "mkt", cs_blog: "mkt", cs_insta: "mkt", cs_kakao: "mkt", cs_flyer: "mkt", cs_youtube: "mkt", cs_seminar: "mkt", cs_focus: "qual", cs_template: "qual", cs_soomgo: "mkt" },
    shock: "첫 달 문의 0~1건. 블로그는 검색에 안 잡히고, 재능장터엔 후기 수백 개짜리 선배들이 줄 서 있다. 내 첨삭 실력과 상관없이, 아직 아무도 나를 모른다.",
    tips: [{ a: "cs_friend", k: "rev", t: "첫 후기는 지인에게서 와요. '지인 무료 첨삭'으로 후기 3개부터 만들어요." }, { a: "cs_kmong", k: "mkt", t: "재능장터 상세페이지를 다듬어요. 후기 많은 사람과 같은 가격이면 안 골라요." }, { a: "cs_blog", k: "mkt", t: "블로그 글은 석 달 뒤에 효과가 나요. 지금 쓰는 글이 석 달 뒤 문의예요." }, { a: "cs_kakao", k: "mkt", t: "오픈채팅방을 하나 열어 봐요. 사람이 모이면 문의가 따라와요." }, { a: "cs_focus", k: "qual", t: "첨삭 품질이 후기를 만들어요. '집중 첨삭'으로 실력을 다져요." }],
    sen: [
      { t: "\"자소서 첨삭은 건당 5~10만 원이에요. 첫 1년은 한 달에 몇 명 안 와요. 자리 잡는 데 1~2년, 마케팅까지 안정되려면 3년 걸려요. 다니는 회사 이름이 곧 신뢰예요. 대신 얼굴 내놓는 일이라 겸업 규정부터 봐요.\"", m: "건당 5~10만 · 자리 잡는 데 1~2년 · 회사 경력이 신뢰 · 겸업 규정 확인" },
      { t: "\"3월, 9월이 대란이에요. 그 전에 후기를 쌓아 둬야 해요. 재능장터는 수수료를 20%쯤 떼니까, 블로그·오픈채팅으로 직접 오는 손님을 만들어요.\"", m: "3·9월 성수기 전에 후기 · 재능장터 수수료 약 20% · 직접 유입 채널" },
      { t: "\"1:1은 한 달 2~8명이 한계예요. 밀리면 템플릿을 만들고 그룹으로 가요. 불합격 환불 요구도 와요. 환불 기준은 꼭 계약서에 적고, 세금 신고도 미리 챙겨요.\"", m: "1:1 한 달 2~8명 한계 · 템플릿·그룹 확장 · 환불 기준 계약서에 · 세금 신고" }],
    ask: "\"첫 상담 30분은 무료로 해요. 거기서 약점 하나만 정확히 짚으면 계약해요.\"", help: ["write", "주말에 선배 영상 대본 정리를 도왔다. 자소서 한 문장 고치는 장면을 세 번 다시 찍었다."],
    next: "문의가 꾸준해졌어요. 이제 성수기(3·9월) 전에 무료 특강을 열고, 템플릿으로 한 명당 시간을 줄여 봐요." },
  insta: { st: "sense", need: 40, f0: 0.7, rm: 18, pt: 72, disc: 0, who: "c071", whoN: "구독자 8만 크리에이터",
    prep: { cost: 3, list: ["같은 주제 계정 30개 저장 많은 글 분석", "사진·릴스 편집 강의 듣기", "피드 9칸 미리 찍어 두기"] },
    acts: { in_post: "mkt", in_reel: "mkt", in_engage: "rev" },
    shock: "조회수 37. 친구 몇 명이 누른 좋아요가 전부다. 주제는 매일 바뀌고 올리는 시간도 들쭉날쭉. 알고리즘은 아직 내가 누군지 모른다.",
    tips: [{ a: "in_post", k: "mkt", t: "주제 하나로 매주 올려요. 1천 명 이하 계정은 주제가 한결같으면 참여율이 3배예요." }, { a: "in_engage", k: "rev", t: "댓글·DM 답장이 곧 노출이에요. '댓글·DM 소통'을 빼먹지 마요." }, { a: "in_reel", k: "mkt", t: "한 달에 한 번은 릴스를 찍어요. 피드보다 새 사람에게 닿아요." }],
    sen: [
      { t: "\"주 9시간 하면 첫 1년은 월 5~10만 원이에요. 협찬은 팔로워 1천 넘어야 오고 건당 1만~13만 원. 촬영·소품비가 매달 25~45만 원 드니까 처음엔 마이너스예요. 장비 욕심부터 내면 망해요.\"", m: "첫해 월 5~10만 · 협찬은 팔로워 1천부터 건당 1~13만 · 촬영비 월 25~45만 · 장비병 주의" },
      { t: "\"팔로워는 절대 사지 마요. 참여율이 망가지면 회복이 안 돼요. 저장이 많이 되는 정보형 글이 돈이 돼요.\"", m: "팔로워 구매 금지 · 저장되는 정보형 글" },
      { t: "\"1만 명 넘으면 협찬이 건당 13만~65만 원이에요. 광고 표기는 꼭 하고, 회사 사람이 팔로우할 수 있다는 것도 각오해요.\"", m: "1만 넘으면 건당 13~65만 · 광고 표기 필수 · 회사 노출 각오" }],
    ask: "\"올리는 요일과 시간을 정해요. 저는 화·목·토 저녁 9시예요.\"", help: ["sense", "선배 촬영을 하루 도왔다. 30초 영상에 4시간. 조명 하나 옮기는 데만 20분."],
    next: "계정이 자리 잡았어요. 이제 협찬 단가를 올리고, 한 달에 한 번은 정보형 릴스로 새 사람을 데려와요." },
  airbnb: { st: "lang", need: 40, /* 11-24 진입을 늦춘다 */ f0: 0.55, rm: 8, pt: 32, disc: 8, who: "c049", whoN: "숙소 3채 운영 4년 차 호스트",
    prep: { cost: 3, list: ["입주민 동의·영업신고 절차 알아보기", "외국인 게스트 응대 문장 연습", "사진 잘 나온 숙소 30곳 분석"] },
    acts: { ab_photo: "qual", ab_host: "rev" },
    shock: "첫 달 예약률이 바닥이다. 후기 0개 숙소는 검색 뒤로 밀리고, 사진은 어둡다. 게스트 질문에 답이 늦어서 예약이 옆 숙소로 넘어갔다.",
    tips: [{ a: "ab_photo", k: "qual", t: "사진이 예약률이에요. '사진·소개 다듬기'로 밝은 낮 사진부터 다시 찍어요." }, { a: "ab_host", k: "rev", t: "답장 속도가 곧 별점이에요. '게스트 응대'로 첫 후기 5개를 만들어요." }],
    sen: [
      { t: "\"하루 20만 원에 예약률 50%면 매출 300만, 순수익은 90만 남짓이야. 청소비가 건당 5만이라 15번이면 75만이 나가. 사업자 등록·영업신고 없으면 앱에서 내려가. 제일 어려운 건 입주민 동의야.\"", m: "1박 20만·예약률 50% → 순수익 약 90만 · 청소 건당 5만 · 영업신고 필수 · 입주민 동의" },
      { t: "\"첫 후기 다섯 개까지는 가격을 조금 내려서라도 받아. 답장은 1시간 안에. 체크인 안내를 사진으로 만들어 두면 질문이 반으로 줄어.\"", m: "첫 후기 5개까진 가격 양보 · 답장 1시간 안 · 사진 체크인 안내" },
      { t: "\"연 매출 4,800만 넘으면 세금 유형이 바뀌어. 두 번째 숙소는 첫 숙소가 6개월 안정된 뒤에. 청소 이모님 휴가 때 대타도 미리 구해 둬.\"", m: "연 매출 4,800만 넘으면 세금 유형 변경 · 2호는 6개월 안정 뒤 · 청소 대타" }],
    ask: "\"머그컵은 같은 걸로 넉넉히. 깨지면 증거 사진부터 찍어.\"", help: ["lang", "주말에 선배 숙소 외국인 체크인을 대신 맡았다. 와이파이 비밀번호를 세 번 설명했다."],
    next: "후기가 쌓였어요. 이제 별점 4.8을 지키면서 성수기 가격을 올려 봐요. 두 번째 숙소는 6개월 안정 뒤에요." },
  ucafe: { st: "num", need: 35, f0: 0.62, rm: 8, pt: 32, disc: 10, who: "c081", whoN: "무인카페 2곳 3년 차 사장님",
    prep: { cost: 5, list: ["반경 500m 저가커피 지도 그리기", "머신 관리·위생교육 듣기", "원가표 만들기(재료비 20~30%)"] },
    acts: { uc_promo: "mkt", uc_check: "qual" },
    shock: "하루 매출 4만 원. 동네 사람들은 여기가 생긴 줄도 모른다. 간판은 작고, 쿠폰도 없고, 건너편 1,900원 카페에만 줄이 선다.",
    tips: [{ a: "uc_promo", k: "mkt", t: "첫 손님 대부분은 반경 몇백 미터 동네 사람이에요. '동네 홍보'로 아파트 단톡방부터 가요." }, { a: "uc_check", k: "qual", t: "기계와 청소가 곧 리뷰예요. '점검·재고·청소'를 거르면 별점부터 떨어져요." }],
    sen: [
      { t: "\"10평 차리는 데 4,000~6,000만, 머신 신품만 2,200~2,800만이에요. 월매출 308만이 손익분기, 450만이면 순익 156만. '월 200 보장' 말 믿고 7천 넣었다가 50만 버는 사람도 봤어요.\"", m: "창업 4,000~6,000만 · 머신 2,200~2,800만 · 손익분기 월매출 약 308만 · '수익 보장' 의심" },
      { t: "\"개점 3개월이면 판가름 나요. 쿠폰 걸고 지도 앱 리뷰 30개부터 모아요. 결제 오류, 얼음컵 같은 사소한 게 별점 1점이 돼요.\"", m: "개점 3개월에 판가름 · 리뷰 30개 작전 · 결제 오류·얼음컵 관리" },
      { t: "\"투자금 회수까지 35개월쯤 봐요. 2호점은 1호점이 6개월 흑자로 버틴 뒤에. 머신 할부 70만 같은 고정비가 제일 무서워요.\"", m: "회수 약 35개월 · 2호점은 6개월 흑자 뒤 · 할부 고정비 주의" }],
    ask: "\"머신 청소는 매일 10분. 곰팡이 한 번 나면 그 동네에서 끝이에요.\"", help: ["hands", "주말에 선배 매장 마감을 도왔다. 원두 채우고, 얼음통 닦고, 쓰레기 세 봉지."],
    next: "동네 단골이 생겼어요. 이제 별점을 지키면서 객단가 높은 메뉴를 하나 더 넣어 봐요." },
  chicken: { st: "num", need: 40, f0: 0.88, rm: 10, pt: 40, disc: 30, who: "c120", whoN: "치킨집 6년 차 점주",
    prep: { cost: 10, list: ["정보공개서 읽는 법 상담받기", "치킨집 주말 알바 체험", "원가표 만들기(재료비 47%·수수료 15%)"] },
    acts: { ch_market: "mkt", ch_shift: "qual", ch_crew: "qual" },
    shock: "오픈발 주문이 끝나자 배달앱 순위가 쭉 밀렸다. 리뷰 수는 옆 가게의 10분의 1. 매출은 본사가 말한 '초보 평균'에 한참 못 미치는데, 월세와 인건비는 그대로 나간다.",
    tips: [{ a: "ch_market", k: "mkt", t: "배달앱 리뷰 답글이 순위예요. '배달퉁·플레이스 관리'를 매주 해요." }, { a: "ch_shift", k: "qual", t: "피크 타임엔 사장이 튀겨요. '매장 근무'로 맛과 속도를 잡아요." }, { a: "ch_crew", k: "qual", t: "알바가 그만두면 내가 튀겨야 해요. '알바 관리'로 빈자리부터 채워요." }],
    sen: [
      { t: "\"공시 창업비가 5,000만이라고 써 있어도 권리금·보증금·닥트 공사 붙으면 1.5억이에요. 재료비 47%, 배달수수료 15%, 인건비 17%, 월세 10% 빼면 남는 게 11%예요. 정보공개서는 계약 14일 전에 받아서 꼭 읽어요.\"", m: "실제 창업비 약 1.5억 · 영업이익 약 11% · 정보공개서 계약 14일 전 수령" },
      { t: "\"오픈발 끝나면 순위가 떨어져요. 리뷰 답글은 하루도 빼먹지 마요. 금요일 7시에 알바가 잠수 타면 내가 튀겨야 하니까, 사장이 튀길 줄 알아야 해요.\"", m: "오픈발 뒤 순위 하락 · 리뷰 답글 매일 · 사장이 튀길 줄 알기" },
      { t: "\"치킨집 폐점률이 한 해 12%예요. 슈퍼바이저가 2호점을 권하면 1호점 장부부터 봐요. 오토 운영은 직원이 매출 올릴 이유가 없어서 꼭 떨어져요.\"", m: "폐점률 연 약 12% · 2호점 권유엔 장부부터 · 오토 운영은 매출 하락" }],
    ask: "\"영업지역 조항을 꼭 확인해요. 850m 옆에 같은 간판 들어오는 걸 막아야 해요.\"", help: ["hands", "토요일 저녁 선배 가게 튀김기 앞에 섰다. 기름 냄새가 이틀 동안 안 빠졌다."],
    next: "매장이 자리 잡았어요. 이제 장부를 매달 보고 재료비 47%를 지켜요. 2호점은 손익분기를 넘긴 뒤에요." },
  tarot: { st: "talk", need: 40, f0: 0.45, rm: 6, pt: 24, disc: 3, who: "c121", whoN: "타로 상담 4년 차 리더",
    prep: { cost: 3, list: ["78장 카드 뜻 정리 노트", "친구 3명 무료 리딩 연습", "타로 원데이 클래스 듣기"] },
    acts: { tr_card: "mkt", tr_booth: "mkt", tr_practice: "qual", tr_read: "rev", tr_kit: "qual" },
    shock: "유료로 바꾸자 문의가 뚝 끊겼다. 재능장터에 타로 상담사만 1,200명. 후기 0개인 내 프로필은 스크롤 맨 아래다.",
    tips: [{ a: "tr_card", k: "mkt", t: "'오늘의 카드'를 꾸준히 올려요. 카드 이미지 한 장이 첫 손님을 데려와요." }, { a: "tr_read", k: "rev", t: "첫 손님에게 정성을 다해요. 후기 하나가 다음 문의 셋이에요." }, { a: "tr_practice", k: "qual", t: "연습 노트로 해석력을 다져요. 리딩이 좋아야 다시 찾아와요." }, { a: "tr_booth", k: "mkt", t: "주말 플리마켓 부스로 얼굴을 알려요. 대면 손님은 단골이 돼요." }],
    sen: [
      { t: "\"덱 하나 2~5만 원이면 시작해요. 텍스트 리딩은 건당 5천~1만 5천 원, 통화는 30분 3만 원. 준비 한 달, 그다음 두세 달은 월 10~50만이 보통이에요. 카드 뜻보다 상담이 본업이에요.\"", m: "덱 2~5만 · 텍스트 5천~1.5만, 통화 30분 3만 · 두세 달은 월 10~50만 · 상담이 본업" },
      { t: "\"처음 몇 명은 무료로 읽어 주고 후기를 받아요. 꼬리 질문 3,000원 같은 작은 상품을 붙이면 단골이 돼요. 2월은 원래 조용해요.\"", m: "무료 리딩으로 첫 후기 · 꼬리 질문 소액 상품 · 2월 비수기" },
      { t: "\"재구매율 20~30%를 넘기면 본업도 생각해 볼 만해요. 감정 쓰레기통이 되지 않게 상담 시간을 정해요. 상담실 임대는 단골이 생긴 뒤에요.\"", m: "재구매율 20~30%가 기준 · 상담 시간 경계 · 상담실은 단골 뒤" }],
    ask: "\"리딩 끝에 '다음 달에 다시 봐요' 하고 날짜를 잡아 줘요. 그게 재구매예요.\"", help: ["talk", "선배 플리마켓 부스를 하루 지켰다. 손님 열 명 중 일곱이 연애운이었다."],
    next: "단골이 생기기 시작했어요. 이제 재구매율 20%를 목표로, 연말·연초 성수기를 준비해요." },
  webnovel: { st: "write", need: 45, f0: 0.6, rm: 16, pt: 64, disc: 0, who: "c122", whoN: "웹소설 완결 3편 작가",
    prep: { cost: 5, list: ["인기작 1~20화 구조 분석", "작법 강의 듣기", "비축분 10화 먼저 쓰기"] },
    acts: { wn_reader: "mkt", wn_plot: "qual", wn_contest: "mkt" },
    shock: "1화 조회수 7, 선호작 3. 제목은 평범하고 1화에 사건이 없다. 독자는 세 줄 안에 뒤로 가기를 누른다.",
    tips: [{ a: "wn_reader", k: "mkt", t: "첫 댓글엔 꼭 답해요. '독자 소통·홍보'가 초반 유입의 전부예요." }, { a: "wn_plot", k: "qual", t: "1~5화 몰입이 생명이에요. '플롯 다듬기'로 1화에 사건을 넣어요." }, { a: "wn_contest", k: "mkt", t: "공모전 시즌(5·6·10·11월)엔 참가해요. 노출이 확 늘어요." }],
    sen: [
      { t: "\"10화도 못 채우고 그만두는 사람이 60~70%예요. 독자가 100원 내면 플랫폼이 30~45%를 떼고, 남은 걸 매니지먼트랑 7:3으로 나눠요. 전체 중위 수입은 월 25만 원쯤이에요. 로맨스는 3~6달, 판타지는 6~12달 지나야 돈이 돼요.\"", m: "10화 전 포기 60~70% · 100원에 작가 30~50원 · 중위 월 약 25만 · 수익까지 3~12달" },
      { t: "\"비축분 없이 연재하면 야근 한 번에 펑크 나요. 최소 10화는 쌓고 시작해요. 첫 20화쯤은 무료로 풀고 그 뒤에 유료예요.\"", m: "비축분 10화 · 첫 20화 안팎 무료" },
      { t: "\"50화쯤 중반의 늪이 와요. 연독률이 떨어질 때 플롯을 다시 짜요. 완결만 해도 인세가 길게 들어와요.\"", m: "50화 전후 중반의 늪 · 완결하면 인세가 길게" }],
    ask: "\"제목에 주인공이 뭘 하는지 넣어요. 회사 얘기가 제일 좋은 소재예요.\"", help: ["write", "선배 원고 교정을 도왔다. 5,000자에 오타 40개. 마감은 늘 전날 밤이다."],
    next: "독자가 붙기 시작했어요. 이제 비축분을 지키며 완결까지 가는 게 목표예요." },
  tutoring: { st: "talk", need: 40, f0: 0.4, rm: 16, pt: 64, disc: 5, who: "c123", whoN: "화상과외 5년 차 선생님",
    prep: { cost: 3, list: ["담당 과목 기출 풀어 보기", "판서 프로그램·화상 장비 연습", "시범수업 대본 만들기"] },
    acts: { tu_find: "mkt", tu_make: "mkt", tu_report: "rev" },
    shock: "제안 메시지 40통, 답장 0통. 후기 없는 선생님은 학부모 목록 맨 아래다. 시범수업 한 번 잡기가 이렇게 어렵다.",
    tips: [{ a: "tu_find", k: "mkt", t: "메시지는 많이 보내야 해요. 200통에 1건이 현실이에요. '학생 모집'을 꾸준히요." }, { a: "tu_report", k: "rev", t: "학부모 리포트가 곧 후기예요. 돈 내는 사람은 학부모예요." }, { a: "tu_make", k: "mkt", t: "출제경향 숏폼을 올려요. 학부모가 먼저 찾아오게 돼요." }],
    sen: [
      { t: "\"고등 수학 시간당 5만 원, 학생 5명이면 월 100만이에요. 매칭앱은 메시지 200통에 1건 성사돼요. 수수료가 20~40%까지 떼여요. 콘텐츠로 학부모가 먼저 찾아오기까지 6개월~1년 걸려요.\"", m: "시간당 약 5만 · 5명이면 월 100만 · 메시지 200통에 1건 · 수수료 20~40%" },
      { t: "\"시범수업은 학생보다 학부모를 봐요. 끝나고 30분 안에 피드백 문자를 보내요. 그게 등록률이에요.\"", m: "시범수업 뒤 30분 안 피드백 문자 · 학부모가 고객" },
      { t: "\"1:1만 하면 연 5천만 원이 한계예요. 소그룹을 열면 시간당 수입이 확 늘어요. 목 관리도 해요. 목 나가면 한 달 쉬어요.\"", m: "1:1 한계 연 5천만 · 소그룹으로 확장 · 목 관리" }],
    ask: "\"성적이 떨어진 달엔 내가 먼저 연락해요. 숨기면 그만둬요.\"", help: ["career", "선배 수업 자료 만들기를 도왔다. 문제 하나 해설에 30분."],
    next: "정규 학생이 자리 잡았어요. 이제 소개 학생을 받고, 소그룹반으로 시간당 수입을 올려요." },
  vibe: { st: "num", need: 40, f0: 0.45, rm: 12, pt: 48, disc: 5, who: "c064", whoN: "1인 외주 2년 차 바이브코더",
    prep: { cost: 5, list: ["AI 코딩 도구로 내 홈페이지 만들어 보기", "DB·로그인 기초 강의 듣기", "포트폴리오 3개 만들기"] },
    acts: { vb_sell: "mkt", vb_study: "qual", vb_fix: "rev" },
    shock: "견적을 다섯 군데 보냈는데 답장은 한 곳. 레퍼런스가 없으니 '해외 팀 반값'에 밀린다. 첫 의뢰는 아는 가게 무료 홈페이지였다.",
    tips: [{ a: "vb_sell", k: "mkt", t: "견적은 꾸준히 보내요. 아는 가게 한 곳이 첫 레퍼런스예요." }, { a: "vb_study", k: "qual", t: "DB·로그인·보안을 알아야 사고가 안 나요. '공부'로 기술 이해를 올려요." }, { a: "vb_fix", k: "rev", t: "유지보수 문의는 바로 처리해요. 그게 다음 의뢰를 데려와요." }],
    sen: [
      { t: "\"첫 의뢰는 30~50만 원짜리 단발이에요. 첫 수익까지 4~8주 걸리고, 착수금 30%는 꼭 받아요. 도구 구독료가 월 5~10만 원 나가요. 무상 AS 범위를 계약서에 안 적으면 끝없이 고쳐 줘요.\"", m: "첫 의뢰 30~50만 · 첫 수익 4~8주 · 착수금 30% · 무상 AS 범위 계약서에" },
      { t: "\"레퍼런스가 3개 생기면 단가를 20~30% 올려요. 한 업종만 파면 패키지가 돼요.\"", m: "레퍼런스 3개 뒤 단가 20~30% 인상 · 한 업종 패키지" },
      { t: "\"유지보수 계약 2~3건이 생기면 매달 바닥이 깔려요. AI가 DB를 날리는 일도 있어요. 백업은 매일 해요.\"", m: "유지보수 계약 2~3건 · 백업 매일" }],
    ask: "\"견적서에 '수정 2회까지'라고 써요. 그게 내 시간이에요.\"", help: ["num", "선배 납품 검수를 하루 도왔다. 로그인 버튼 하나에 버그가 셋."],
    next: "의뢰가 이어지고 있어요. 이제 유지보수 계약을 만들고 한 업종 패키지를 준비해요." },
};
// 행동 정의(defs.js 는 건드리지 않고 여기서 붙인다)
D.ACTIONS.sj_prep = D.ACTIONS.sj_prep || { n: "투잡 준비하기", track: "일", ap: 1, hp: 2, desc: "시작 전 강의·시장조사·연습(3번까지). 초반 고생이 줄고 핵심 역량 +" };
D.ACTIONS.sj_senior = D.ACTIONS.sj_senior || { n: "선배 찾아가기", track: "일", ap: 1, hp: 2, cash: -3, desc: "그 투잡을 하는 선배에게 커피를 산다. 현실 숫자·함정·첫 3달 할 일" };
const ACT_JOB = {}; for (const [k, E] of Object.entries(ENTRY)) for (const id of Object.keys(E.acts)) ACT_JOB[id] = k;
const STAT_HOW = { num: "보드게임·코딩 모임이나 숫자 공부", talk: "타로 클래스·멘토링 봉사나 말하기 연습", write: "글쓰기·독서 모임", career: "회사 일 열심히·멘토링 봉사", sense: "사진 동호회·플라워 클래스", lang: "외국어 공부·여행 모임", hands: "홈카페·쿠킹 클래스·캠핑", mkt: "여행 모임·마케팅 공부", charm: "와인 모임·운동", body: "운동" };
export function rp(s, job) { const sj = s.sj; sj.rp = sj.rp || {}; return (sj.rp[job] = sj.rp[job] || { pts: 0, prep: 0, sen: 0, didA: {}, said: {} }); }
export function need(s, job) { const E = ENTRY[job]; if (!E) return null; const cur = Math.round(s.st[E.st] || 0); return { st: E.st, n: D.STATS[E.st], need: E.need, cur, ok: cur >= E.need, how: STAT_HOW[E.st] || "공부" }; }
// 초반 수요 배율(0.15~1). 엔진이 수요를 계산할 때 곱한다. 처음 부르는 달이 '첫 영업 달'
export function ramp(s, job) {
  const E = ENTRY[job]; if (!E || !s.sj) return 1;
  const p = rp(s, job); if (p.done !== undefined) return 1;
  if (p.t0 === undefined) { if (hadRevenue(s, job)) { p.t0 = backT0(s, job); p.done = p.t0; p.grad = p.t0; p.shock = p.t0; return 1; } p.t0 = s.t; } // 예전 저장: 이미 벌고 있던 투잡은 초반 고생 없음(시작 달은 지난 기록으로 거꾸로 채운다)
  const sk = clamp((s.st[E.st] || 0) / E.need, 0.4, 1.4);
  const f0 = clamp(E.f0 * (sk < 1 ? 0.6 + 0.4 * sk : 1) + Math.min(3, p.prep) * 0.03 + Math.min(3, p.sen) * 0.03, 0.15, 0.95); // 준비·선배 한 번에 +3%p
  const spd = sk < 1 ? 0.55 + 0.45 * sk : Math.min(1.2, 1 + (sk - 1) * 0.5);
  const prog = clamp(((s.t - p.t0) / E.rm + p.pts / E.pt) * spd, 0, 1);
  let f = f0 + (1 - f0) * prog;
  if (p.discT !== undefined && p.discT >= s.t) f = Math.min(1, f + 0.12);
  p.f = Math.round(f * 100) / 100; p.prog = Math.round(prog * 100) / 100;
  if (prog >= 1) p.done = s.t;
  return f;
}
function hadRevenue(s, job) { // 이익 난 달이 3달 이상이면 이미 자리 잡은 투잡
  const H = s.hist || [], n = (a) => a.filter((v) => v > 0).length >= 3;
  if (job === "pr") return n(H.map((h) => h.pr)); if (job === "cs") return n(H.map((h) => h.cs));
  if (job === "airbnb") return n(s.ab?.hist || []); if (job === "ucafe") return n(s.uc?.hist || []);
  if (job === "insta") return (s.ins?.dealsDone || 0) > 3;
  return n(H.map((h) => h.px?.[job] || 0));
}
export const rampInfo = (s, job) => { const p = s.sj?.rp?.[job]; if (!p || p.t0 === undefined || !ENTRY[job]) return null; return { pct: p.done !== undefined ? 100 : Math.round((p.f ?? ENTRY[job].f0) * 100), done: p.done !== undefined, tip: p.tip || "", t0: p.t0 }; };
// ───────── 역량형 투잡 '배우는 기간'(v4.25b) ─────────
// 월세·권리금 없이 역량으로만 하는 투잡(cs·insta·tarot·webnovel·tutoring·vibe)은 바로 잘할 수 없다. 투자형(pr·airbnb·ucafe·chicken)은 해당 없음.
// 역량 N = 핵심 능력치(ENTRY[job].st) + 경험(첫 영업 달 t0부터 한 달 +2.5, 최대 +30). 필요 M = SKILL[job].
// 수입 배율은 N/M 계단(SKILL_STEP): 50% 미만 30% · 65% 미만 45% · 80% 미만 60% · 90% 미만 75% · 100% 미만 88% · 그 이상 100%.
// 능력치 30 안팎으로 시작하면 보통 6~12달이 배우는 기간. 각 모듈이 수요(손님·의뢰·노출)를 계산할 때 SJ.ramp 와 함께 곱한다.
export const SKILL = { cs: 72, insta: 70, tarot: 68, webnovel: 75, tutoring: 70, vibe: 76 };
export const SKILL_STEP = [[0.5, 0.3], [0.65, 0.45], [0.8, 0.6], [0.9, 0.75], [1, 0.88]];
export const SKILL_EXP = { per: 2.5, max: 30 };
export function skillInfo(s, job) {
  const M = SKILL[job], E = ENTRY[job]; if (!M || !E || !s?.sj) return null;
  const p = s.sj.rp?.[job], t0 = p?.t0;
  if (p && t0 !== undefined && p.done === t0 && p.grad === t0) return null; // 예전 저장: 이미 벌고 있던 투잡
  const exp = t0 === undefined ? 0 : Math.min(SKILL_EXP.max, Math.max(0, s.t - t0) * SKILL_EXP.per);
  const stat = s.st[E.st] || 0, N = Math.round(stat + exp), q = N / M;
  const step = SKILL_STEP.find(([lim]) => q < lim), mult = step ? step[1] : 1;
  return { N, M, mult, learning: mult < 1, stat: Math.round(stat), statN: D.STATS[E.st], exp: Math.round(exp), next: step ? Math.ceil(step[0] * M) : null };
}
export const skillRamp = (s, job) => skillInfo(s, job)?.mult ?? 1;
// 행동 하나 끝날 때(core.act 에서 부름): 그 투잡의 마케팅·후기·품질 행동이면 노력 점수
export function onAct(s, id) {
  const job = ACT_JOB[id]; if (!job || !isActive(s, job)) return;
  const p = rp(s, job), k = ENTRY[job].acts[id];
  p.didA[id] = (p.didA[id] || 0) + 1;
  if (p.done !== undefined || p.t0 === undefined) return; // 영업 시작 전 행동은 점수 없음(준비는 sj_prep)
  if (p.mt !== s.t) { p.mt = s.t; p.mp = 0; }
  const w = k === "qual" ? 0.8 : 1; if (p.mp >= RP_CAP) return;
  p.pts += Math.min(w, RP_CAP - p.mp); p.mp += w;
}
// 이번 달 코치 한마디: 아직 안 한 행동 → 방향(dir) 우선, 같은 말 반복 안 함. 다 했으면 진행도로 다독이기
function coachTip(s, job) {
  const E = ENTRY[job], p = rp(s, job), N = need(s, job);
  if (!N.ok && (p.skT === undefined || s.t - p.skT >= 4)) { p.skT = s.t; return `${jo(N.n, "이", "가")} 아직 ${N.cur}이에요(기준 ${E.need}). ${N.how}로 올리면 손님이 더 빨리 붙어요.`; }
  const pref = (x) => (p.dir === "mkt" ? (x.k === "mkt" ? 0 : 1) : p.dir === "qual" ? (x.k === "mkt" ? 1 : 0) : 0);
  const todo = E.tips.map((x, i) => ({ x, i })).filter(({ x, i }) => !p.didA[x.a] && (p.said[i] || 0) < 2).sort((a, b) => pref(a.x) - pref(b.x) || (p.said[a.i] || 0) - (p.said[b.i] || 0));
  const pick = todo.find(({ i }) => !p.said[i]) || todo.find(({ i }) => i !== p.lastI);
  if (pick) { p.said[pick.i] = (p.said[pick.i] || 0) + 1; p.lastI = pick.i; return pick.x.t; }
  const pct = Math.round((p.f ?? E.f0) * 100), low = E.tips.filter((x) => x.a !== "cs_focus").sort((a, b) => (p.didA[a.a] || 0) - (p.didA[b.a] || 0))[0]; // 11-24 집중 첨삭은 반기에 한 번이라 '매달 하라'는 말에서 뺀다
  const nm = D.ACTIONS[low.a]?.n || "홍보";
  const L = [`잘하고 있어요. 손님이 기대치의 ${pct}%까지 왔어요. 이번 달은 '${nm}'를 한 번 더 챙겨요.`, `한 번 하고 끝내면 안 돼요. '${nm}'는 매달 해야 쌓여요. 지금 ${pct}%예요.`, `초반엔 다들 이래요. 꾸준히 하는 사람이 남아요. 지금 ${pct}%, '${nm}' 한 번 더요.`];
  p.gi = ((p.gi ?? -1) + 1) % L.length; return L[p.gi];
}
function coachMonth(s, notes) { // SJ.month 에서: 영업 중인 투잡마다 코치 한마디·칭찬·할인 비용
  for (const job of s.sj.active) {
    const E = ENTRY[job]; if (!E) continue; const p = s.sj.rp?.[job]; if (!p || p.t0 === undefined) continue;
    ramp(s, job); // 엔진이 이번 달 안 불렀어도 진행도·졸업을 갱신
    const nm = D.SIDEJOBS[job].n;
    if (p.discT !== undefined && p.discT >= s.t && E.disc) { const c = Math.round(E.disc); s.cash -= c; addMoney(s, "exp", "첫 손님 할인", c); }
    if (p.done !== undefined) { if (p.grad === undefined) { p.grad = s.t; p.tip = ""; log(s, `${nm}: 초반 고생 끝. 손님이 제자리를 찾았다`, "work"); if (!s.sj.coachOff) notes.push(`코치 한마디 · ${nm}: 초반 고생 끝! 수고했어요. ${E.next}`); } continue; }
    if ((p.prog ?? 0) >= 0.5 && p.half === undefined) { p.half = s.t; if (!s.sj.coachOff) notes.push(`코치 한마디 · ${nm}: 반은 왔어요! 손님이 기대치의 ${Math.round(p.f * 100)}%까지 붙었어요. 지금 하던 걸 멈추지만 마요.`); continue; }
    if (s.t - p.t0 < 1) continue; // 첫 달은 '생각보다 안 되네' 장면이 대신한다
    p.tip = coachTip(s, job);
    if (!s.sj.coachOff) notes.push(`코치 한마디 · ${nm}: ${p.tip}`);
  }
}
// 첫 달 '생각보다 안 되네' 장면(다음 달 시작 때 큐에 넣는다)
function shockScene(s, job) {
  const E = ENTRY[job], j = D.SIDEJOBS[job], N = need(s, job);
  const why = N.ok ? "" : ` 솔직히 ${N.n}도 아직 ${N.cur}이라 기준(${E.need})에 못 미친다.`;
  const mk = E.tips.find((x) => x.k === "mkt") || E.tips[0], ql = E.tips.find((x) => x.k !== "mkt") || E.tips[0];
  return { kind: "event", tag: "코치", title: `${j.n}, 생각보다 안 되네`, text: `${E.shock}${why}\n\n투잡연구소 코치: "처음엔 다 이래요. 손님은 아직 나를 몰라요. 노출, 후기, 가격 중 하나부터 잡아요. 셋 다 하려면 아무것도 안 돼요."`, onChoose: "sj_disc", coach: { job, type: "shock" }, choices: [
    { t: "노출부터: 마케팅·홍보를 늘린다", eff: { mental: 1 }, text: `코치: "좋아요. ${mk.t}"` },
    { t: "후기·품질부터 다진다", eff: { mental: 1 }, text: `코치: "좋아요. ${ql.t}"` },
    ...(E.disc ? [{ t: `첫 손님 할인(3달, 월 ${E.disc}만)`, eff: {}, text: "코치: \"할인은 첫 후기를 빨리 모으는 도구예요. 3달 뒤엔 꼭 원래 가격으로 돌아가요. 싸게 오래 하면 싼 가게가 돼요.\"" }] : []),
  ] };
}
// 선배 찾아가기 장면: 진입 전 / 첫 달 막혔을 때 / 다음 단계 앞, 최대 3번
function seniorScene(s, job) {
  const E = ENTRY[job], j = D.SIDEJOBS[job], p = rp(s, job), st = Math.min(2, p.sen);
  const who = E.who && s.cast?.includes(E.who) ? E.who : null;
  if (who) ensureRel(s, who);
  const nm = who ? `${CHAR[who].name}(${E.whoN})` : E.whoN;
  const intro = [`${jo(nm, "을", "를")} 찾아가 커피를 샀다. 한참 내 얘기를 듣더니 입을 열었다.`, `${nm}에게 다시 연락했다. "막혔죠? 다들 그때 연락해요." 밥값은 내가 냈다.`, `${nm}에게 세 번째로 찾아갔다. "이제 다음 단계 얘기할 때네요."`][st];
  const stH = E.help[0];
  return { kind: "event", tag: "선배", title: `선배 찾아가기 · ${j.n} ${st + 1}/3`, ...(who ? { who } : {}), text: `${intro}\n\n${E.sen[st].t}`, onChoose: "sj_disc", coach: { job, type: "senior", st }, choices: [
    { t: "꼼꼼히 받아 적는다", eff: { mental: 1, ...(who ? { aff: 3 } : {}) }, text: "수첩 한 페이지가 꽉 찼다. 투잡 탐색의 '선배 메모'에 남겼다." },
    { t: "날카롭게 되묻는다(말빨)", check: { stat: "talk", dc: 40 }, ok: { text: `선배가 웃었다. "그걸 묻는 사람은 잘돼요." ${E.ask}`, eff: { flag: "sj_ok", ...(who ? { aff: 5 } : {}) } }, ng: { text: "질문이 너무 뭉뚱그려졌다. 선배는 \"해 보면 알아요\"라고만 했다.", eff: who ? { aff: 1 } : {} } },
    { t: "주말에 일을 거들어 본다(스태미너 −10)", eff: { hp: -10, mental: -2, stat: { [stH]: 1.5 }, ...(who ? { aff: 6 } : {}) }, text: E.help[1] },
  ] };
}
export function coachChoose(s, sc, i) {
  const c = sc.coach, E = ENTRY[c.job], p = rp(s, c.job), out = [];
  if (c.type === "shock") {
    if (i === 0) { p.dir = "mkt"; p.pts += E.pt * 0.06; gainStat(s, "mkt", 0.5); out.push("방향: 노출·마케팅 · 초반 진행 +"); }
    else if (i === 1) { p.dir = "qual"; p.pts += E.pt * 0.06; gainStat(s, E.st, 0.5); out.push(`방향: 후기·품질 · ${D.STATS[E.st]} +`); }
    else { p.dir = "price"; p.discT = s.t + 2; out.push(`첫 손님 할인 3달(월 ${E.disc}만) · 손님 +`); }
    return out;
  }
  const ok = s.flags?.sj_ok === s.t; if (s.flags) delete s.flags.sj_ok;
  const memo = (s.sj.memo = s.sj.memo || {}); const M = (memo[c.job] = memo[c.job] || []);
  if (!M.some((x) => x.st === c.st && !x.tip)) M.push({ t: s.t, st: c.st, txt: E.sen[c.st].m });
  if (ok && !M.some((x) => x.tip)) M.push({ t: s.t, st: c.st, tip: 1, txt: E.ask.replace(/["“”]/g, "") });
  p.sen = Math.min(3, p.sen + 1); p.pts += E.pt * (ok ? 0.1 : i === 2 ? 0.08 : 0.05);
  if (i === 0) gainStat(s, E.st, 0.6);
  out.push(`선배 메모 +1${ok ? " · 덤으로 꿀팁" : ""} · 초반 고생 −`);
  return out;
}
// 준비하기(시작 전, 3번까지)
function prepAct(s, job) {
  const E = ENTRY[job], p = rp(s, job), c = E.prep.cost; const item = E.prep.list[Math.min(2, p.prep)];
  s.cash -= c; addMoney(s, "exp", "투잡 준비비", c); p.prep++;
  const g = gainStat(s, E.st, 1.2);
  const memo = (s.sj.memo = s.sj.memo || {}); (memo[job] = memo[job] || []).push({ t: s.t, prep: 1, txt: `준비 ${p.prep}/3: ${item}` });
  const N = need(s, job);
  return { lines: [`${D.STATS[E.st]} +${g.toFixed(1)}`, `준비 ${p.prep}/3 · 초반 고생 −`, `준비비 −${won(c)}`], msg: `${D.SIDEJOBS[job].n} 준비: ${item}.${p.prep >= 3 ? " 이제 시작해도 덜 고생할 것 같다." : N.ok ? "" : ` 아직 ${N.n} ${N.cur}/${E.need}.`}` };
}

// ── 탐색의 3개월(v4.25): 첫 달 끝에 약속, 4개월 차에 결산 ──
const PLAYABLE = () => Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play);
export function grindScene() {
  return { kind: "event", title: "나와의 약속: 탐색의 3개월", tag: "투잡 탐색", text: "달력에 빨간 동그라미를 쳤다. 앞으로 3개월. 회사 적응도 해야 하지만, 퇴근 후 시간을 어디에 쓸지는 내가 정한다. 남들 드라마 정주행할 때 나는 뭘 할까?", onChoose: "sj_grind", choices: [
    { t: "평일 밤 2시간 + 주말 하루, 갈아넣는다", eff: { mental: -2 }, text: "OTT 구독을 해지했다. 3개월 동안 매달 행동력 −2, 멘탈 −3. 대신 투잡 관심이 쑥쑥 오른다." },
    { t: "주말 오전만 쓴다", eff: {}, text: "토요일 오전 9시, 카페 구석 자리를 찜했다. 3개월 동안 매달 행동력 −1." },
    { t: "취미 모임부터 나가 본다", eff: { mental: 3 }, text: "사람 많은 곳에 돈 버는 이야기도 많다. 취미 하나에 가입했다." },
    { t: "일단 회사 적응부터", eff: { stat: { career: 1 } }, text: "투잡은 천천히. 탐색 메뉴는 언제든 열 수 있다." },
  ] };
}
export function grindChoose(s, r, i) {
  if (i === 3) { s.sj.grind = null; return ["탐색은 내 속도대로"]; }
  if (i === 2) {
    s.sj.grind = null;
    const opts = Object.keys(D.HOBBIES).filter((k) => !s.hb.joined.includes(k) && !D.HOBBIES[k].lock);
    const k = opts.length ? opts[Math.floor(r.range(0, opts.length))] : null;
    const res = k ? hbJoin(s, k) : null;
    return [res?.ok ? `${D.HOBBIES[k].n} 가입 · 취미 모임에서 투잡 이야기를 들을 수 있다` : "취미는 지도에서 골라 가입할 수 있다"];
  }
  const g = (s.sj.grind = { lv: i === 0 ? 2 : 1, until: PROBATION - 1, log: [] });
  s.ap = Math.max(0, s.ap - g.lv); // 이번 달부터 시간을 쓴다
  return [i === 0 ? "3개월 동안 매달 행동력 −2 · 멘탈 −3" : "3개월 동안 매달 행동력 −1", ...grindStep(s, r, g)];
}
function grindStep(s, r, g) {
  if (g.lv >= 2) s.mental = Math.max(0, s.mental - 3);
  const jobs = PLAYABLE().filter((k) => !isFound(s, k)).map((k) => [k, r.range(0, 1)]).sort((x, y) => x[1] - y[1]).map((x) => x[0]);
  const lines = [];
  for (const k of jobs.slice(0, g.lv + 1)) { const l = addInt(s, k, g.lv >= 2 ? r.int(14, 22) : r.int(8, 14)); if (l) lines.push(l); }
  const deep = jobs[0]; if (deep && !s.sj.know[deep]) { s.sj.know[deep] = s.t; lines.push(`${D.SIDEJOBS[deep].n} 수익 구조를 알게 됐다`); }
  g.log.push(...lines); return lines;
}
export function grindMonth(s, r, notes, scenes) {
  const g = s.sj?.grind; if (!g) return;
  if (s.t < g.until) s.apNext -= g.lv; // 다음 달 몫
  if (s.t <= g.until) { const lines = grindStep(s, r, g); if (lines.length) notes.push(`퇴근 후 탐색: ${lines.join(", ")}`); }
  if (s.t === g.until) {
    s.sj.grind = null; log(s, "탐색의 3개월을 마쳤다.", "work");
  }
}

// 후보가 모였다(v4.25): 3개월이 지나고 후보가 2개 이상이 되면 한 번 알려 준다
export function candMonth(s, notes, scenes) {
  if (s.sj.candT !== undefined || s.flags?.noProbation || s.t < PROBATION - 1) return;
  const n = foundCount(s);
  if (n < NEED_CANDS) { if (s.t === PROBATION - 1) notes.push(`투잡 후보 ${n}/${NEED_CANDS}: 후보가 ${NEED_CANDS}개는 모여야 고를 수 있어요`); return; }
  s.sj.candT = s.t;
  const c = Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && isFound(s, k)).map((k) => D.SIDEJOBS[k].n);
  const early = !pickOpen(s) && s.t + 1 < PICK.t;
  scenes.push({ kind: "story", title: "후보가 모였다", tag: "투잡 탐색", text: early ? `메모장에 적어 둔 후보: ${c.join(", ")}. 발품 팔아 모은 정보라 아직 다 믿을 수는 없다. 윤곽은 잡혔다. 고르는 건 입사 ${PICK.t}개월을 채운 뒤. 그때까지는 회사와 취미에 집중하면서 조금 더 알아보자.` : `메모장에 적어 둔 후보: ${c.join(", ")}. 발품 팔아 모은 정보라 아직 다 믿을 수는 없다. 그래도 이제 고를 수 있다. 투잡 탐색에서 하나를 골라 시작하자.`, choices: [{ t: early ? "좋아, 서두르지 말자" : "좋아, 골라 보자", eff: { mental: 4 }, text: "" }] });
}

// 곳곳에서 조금씩 듣는 투잡 정보(v4.25): 회사·사람·이벤트에서 이해도가 조금씩 오른다
const WHO_JOB = [[/디자이너|인테리어|포토|사진|스타일/, ["insta", "pr", "airbnb"]], [/개발|엔지니어|데이터|프로그래/, ["vibe"]], [/작가|에디터|기자|웹툰|PD|편집/, ["webnovel", "insta"]], [/교사|강사|선생|과외|대학원|연구/, ["tutoring", "cs"]], [/사장|카페|바리스타|요리|셰프|자영업|가게/, ["ucafe", "chicken", "pr"]], [/부동산|중개|건축|공인/, ["airbnb", "pr"]], [/인사|HR|채용|컨설/, ["cs"]], [/타로|명리|상담|심리/, ["tarot"]], [/마케|MD|브랜드|광고/, ["insta", "vibe"]]];
export function hearInfo(s, r, src, who) {
  const QN = questOn(s) && s.t < QUEST.months && !(s.sj.active || []).length; // 초반 퀘스트 동안은 소문이 더 잘 들리고, 처음 듣는 투잡부터 들린다
  const P = ({ co: 0.3, people: 0.35, event: 0.18 }[src] || 0.2) * (QN ? QUEST.hearX : 1);
  if (!s.sj?.open || !r.chance(P)) return null;
  let pool = null;
  if (who && CHAR[who]) { const m = WHO_JOB.find(([re]) => re.test(CHAR[who].job || "")); if (m) pool = m[1]; }
  let cands = (pool || Object.keys(D.SIDEJOBS)).filter((k) => D.SIDEJOBS[k]?.play && !isFound(s, k));
  if (!cands.length) cands = Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && !isFound(s, k));
  if (!cands.length) return null;
  if (QN && infoCount(s) < QUEST.info) { const fresh = cands.filter((k) => !(s.sj.int[k] > 0)); if (fresh.length) cands = fresh; }
  const l = addInt(s, r.pick(cands), r.int(4, 8) + (QN ? 4 : 0)); if (!l) return null;
  const pre = { co: "회사에서 주워들은 얘기", people: who && CHAR[who] ? `${CHAR[who].name}에게 들은 얘기` : "사람들에게 들은 얘기", event: "흘려들은 얘기" }[src];
  return `${pre} · ${l}`;
}
// 이해도 100%(후보)가 되면 보이는 것: 능력치 궁합과 내 특성카드 연계
export function insight(s, job) {
  if (!isFound(s, job)) return null;
  const j = D.SIDEJOBS[job], f = fit(s, job);
  const stats = (j.fit || []).map((k) => `${D.STATS[k]} ${Math.round(s.st[k] || 0)}`);
  const links = [];
  for (const id of s.me.traits || []) { const tr = D.TRAITS.find((x) => x.id === id); for (const h of tr?.hid || []) if (h.d === job) links.push(`${tr.n}: ${h.t}`); }
  return { g: f.g, v: f.v, stats, links };
}
