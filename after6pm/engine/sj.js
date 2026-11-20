// 투잡 탐색 + 취미. 투잡은 처음부터 정해져 있지 않다. 너튜브·리포트·세미나·회사 소문·취미에서 '발견'하고, 두 개까지 고른다.
import * as D from "./defs.js";
import { CHAR, addMoney, log, jo, won, gainStat, meetScene, openScene, sceneOk, reveal } from "./core.js";
import { DISC, SCENES } from "../gen/data.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function init() { return { int: {}, found: {}, active: [], know: {}, open: false, seen: {} }; }
export function hbInit() { return { joined: [], cnt: {}, lastT: {}, since: {} }; }

// ───────── 투잡 ─────────
// 투잡 칸: 기본 2개, 매니저(파티룸 매니저·에어씨앤씨 코호스트·컨설팅 공동 코치)를 두면 3개
export function slots(s) { const coach = Object.entries(s.rel || {}).some(([id, x]) => x.helper && CHAR[id]?.helper?.effect === "cs_coach"); return D.SJ_SLOTS + (s.pr?.sys?.manager || s.ab?.cohost || s.uc?.agent || coach ? 1 : 0); }
export const isActive = (s, job) => !!s.sj?.active.includes(job);
export const isFound = (s, job) => s.sj?.found[job] !== undefined;
export function fit(s, job) { // 궁합 등급(능력치 기반)
  const f = D.SIDEJOBS[job].fit; const v = s.st[f[0]] * 0.5 + s.st[f[1]] * 0.3 + s.st[f[2]] * 0.2;
  return { v: Math.round(v), g: v >= 55 ? "S" : v >= 45 ? "A" : v >= 35 ? "B" : v >= 25 ? "C" : "D" };
}
// 관심도 올리기. 100이 되면 발견. hobby에서 오면 발견 장면으로 넘긴다(장면에서 확정).
export function addInt(s, job, v, holdAt) {
  const sj = s.sj; if (!D.SIDEJOBS[job] || isFound(s, job)) return null;
  const before = sj.int[job] || 0; let after = clamp(before + v, 0, 100);
  if (holdAt && after >= holdAt) after = Math.min(after, 99);
  sj.int[job] = after;
  if (after >= 100) { found(s, job); return `${D.SIDEJOBS[job].n} 발견!`; }
  return `${D.SIDEJOBS[job].n} 관심 +${Math.round(after - before)}`;
}
export function found(s, job, how) {
  const sj = s.sj; if (isFound(s, job)) return;
  sj.int[job] = 100; sj.found[job] = s.t; sj.open = true;
  log(s, `투잡 발견: ${D.SIDEJOBS[job].n}${how ? ` (${how})` : ""}`, "work");
}
export function start(s, job) {
  const j = D.SIDEJOBS[job], sj = s.sj;
  if (!j) return { ok: false, msg: "없는 투잡" };
  if (!isFound(s, job)) return { ok: false, msg: "아직 발견하지 못한 투잡" };
  if (!j.play) return { ok: false, msg: "이 투잡은 준비 중입니다(다음 업데이트)" };
  if (isActive(s, job)) return { ok: false, msg: "이미 하고 있습니다" };
  if (sj.active.length >= slots(s)) return { ok: false, msg: `투잡은 지금 ${slots(s)}개까지. 매니저를 두면 한 칸 늘어요` };
  sj.active.push(job); log(s, `${jo(j.n, "을", "를")} 시작하기로 했다.`, "work");
  const hid = reveal(s, job);
  return { ok: true, hid, msg: `${j.n} 시작! 전체 메뉴에 ${j.n} 칸이 열렸어요${hid.length ? ` · 숨은 특성 ${hid.length}개 공개` : ""}` };
}
export function stop(s, job) {
  if (!isActive(s, job)) return { ok: false, msg: "하고 있지 않습니다" };
  if (job === "pr" && s.pr.rooms.length) return { ok: false, msg: "지점을 모두 양도해야 접을 수 있습니다" };
  if (job === "cs" && s.cs.queue.length) return { ok: false, msg: "대기 고객을 먼저 끝내야 합니다" };
  s.sj.active = s.sj.active.filter((x) => x !== job);
  if (job === "cs") { s.cs.open = false; s.cs.ads = 0; }
  log(s, `${jo(D.SIDEJOBS[job].n, "을", "를")} 접었다.`, "work");
  return { ok: true, msg: `${D.SIDEJOBS[job].n} 접음` };
}
function unfound(s) { return Object.keys(D.SIDEJOBS).filter((k) => !isFound(s, k)); }

export function can(s, id, arg) {
  if (id === "sj_report" || id === "sj_interview") { if (!arg || !D.SIDEJOBS[arg]) return "투잡을 고르세요"; if (id === "sj_interview" && (s.sj.int[arg] || 0) < 30 && !isFound(s, arg)) return "관심 30 이상이어야 물어볼 사람을 찾는다"; if (id === "sj_interview" && s.sj.know[arg]) return "이미 들었다"; if (id === "sj_report" && isFound(s, arg)) return "이미 발견한 투잡"; }
  if ((id === "sj_youtube" || id === "sj_seminar") && !unfound(s).length) return "더 찾을 투잡이 없다";
  if (id === "hb_go") { if (!s.hb.joined.includes(arg)) return "가입한 취미가 아닙니다"; if (s.hb.lastT[arg] === s.t) return "이번 달 모임은 다녀왔다"; }
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
  if (i === 0) { found(s, sc.job, `${D.HOBBIES[sc.hobby]?.n || "취미"}에서`); return [`투잡 발견: ${D.SIDEJOBS[sc.job].n}`, D.SIDEJOBS[sc.job].play ? "투잡 탐색에서 시작할 수 있다" : "준비 중인 투잡"]; }
  s.sj.int[sc.job] = 70; return ["관심 70에서 멈춤"];
}
export function introScene() {
  return { kind: "event", title: "옆 팀 김 대리의 비밀", tag: "투잡 탐색 열림", text: "탕비실에서 들은 이야기. 옆 팀 김 대리가 퇴근 후 파티룸 두 곳을 돌린단다. 다른 동기는 주말마다 자소서 첨삭으로 용돈을 번다고. 월급만으로는 집 한 채가 멀다. 나도... 뭘 해 볼까?", onChoose: "sj_intro", choices: [
    { t: "오늘부터 투잡을 알아본다", eff: { mental: 2 }, text: "퇴근길 지하철에서 '직장인 부업'을 검색했다. 투잡 탐색이 열렸다." },
    { t: "일단 회사에 집중한다", eff: { stat: { career: 1 } }, text: "그래도 궁금하긴 하다. 투잡 탐색은 언제든 열어 볼 수 있다." },
  ] };
}
export function introChoose(s, i) { s.sj.open = true; addInt(s, "pr", i === 0 ? 30 : 15); addInt(s, "cs", i === 0 ? 30 : 15); return ["전체 메뉴: 투잡 탐색 열림"]; }

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
export function coworkers(s) { return s.cast.filter((id) => { const c = CHAR[id]; return c && (CO_RE.test(c.job) || (c.hangouts || []).some((h) => h === "office" || h === "officest")); }); }
export function refresh(s, r) { // 이번 달 회사·모임에 나오는 사람들
  if (!(s.co.quit || s.co.fired)) {
    const pool = r.shuffle(coworkers(s).filter((id) => !s.rel[id]?.spouse)).slice(0, r.int(3, 5));
    for (const sp of Object.values(s.spot)) for (const id of pool) { const i = sp.indexOf(id); if (i >= 0) sp.splice(i, 1); }
    for (const id of pool) { const k = r.pick(["desk", "pantry", "pantry", "meeting", "dinner"]); (s.spot[k] = s.spot[k] || []).push(id); }
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
  for (const [k, v] of Object.entries(h.stat)) lines.push(`${D.STATS[k]} +${gainStat(s, k, v * (1 + lv0 * 0.1)).toFixed(1)}`);
  if (h.hpMax) lines.push(`체력 +${gainStat(s, "body", h.hpMax * 3).toFixed(1)}`);
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
  if (ready.length && s.sj.active.length < D.SJ_SLOTS) t.push({ lv: 1, text: `발견한 투잡: ${ready.map((k) => D.SIDEJOBS[k].n).join(", ")} · 시작할 수 있어요`, go: "sj" });
  if (!s.sj.active.length && !ready.length && s.t >= 2) t.push({ lv: 0, text: "투잡 탐색: 너튜브·리포트·취미에서 찾아보기", go: "sj" });
  for (const id of s.hb.joined) if (s.hb.lastT[id] !== s.t) t.push({ lv: 0, text: `${D.HOBBIES[id].n} 이번 달 모임 아직(회비 ${D.HOBBIES[id].fee}만)`, go: "hobby" });
  if (!s.hb.joined.length && s.t >= 1) t.push({ lv: 0, text: "취미가 없다. 인연도 투잡도 취미에서 온다", go: "hobby" });
  return t;
}
