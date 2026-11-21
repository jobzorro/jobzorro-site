// 투잡 등록표: engine/jobs/<key>.js 플러그인을 게임 정의(defs)에 한 번에 붙인다.
// 기존 5개(pr·cs·insta·airbnb·ucafe)는 core.js·ui.js에 그대로 있고, 여기는 새 투잡만 다룬다.
// 규약: engine/jobs/README.md
import * as D from "./defs.js";
import { PLUGINS } from "./jobs/index.js";
import { STORIES } from "./story/index.js";

export const JOBS = []; // 등록된 엔진 플러그인(순서 = index.js 순서)
export const BY_KEY = {};
// 기존 행동 접두사(겹치면 안 됨)
const TAKEN = ["pr_", "cs_", "in_", "ab_", "uc_", "sj_", "hb_", "bg_", "co_", "grad_"];

export const get = (k) => BY_KEY[k] || null;
// 행동 id → 그 행동을 가진 플러그인(없으면 null)
export function byAct(id) { if (typeof id !== "string") return null; for (const P of JOBS) if (id.startsWith(P.prefix)) return P; return null; }
export const isPlugAct = (id) => !!byAct(id);

function warn(P, msg) { try { console.warn(`[투잡 등록표] ${P?.key || "?"}: ${msg}`); } catch (e) {} }

function register(P) {
  const k = P.key;
  if (!k || !D.SIDEJOBS[k]) return warn(P, "key 가 defs.SIDEJOBS 에 없어 건너뜀");
  if (BY_KEY[k]) return warn(P, "같은 key 가 이미 등록됨");
  if (!/^[a-z]{2,4}_$/.test(P.prefix || "")) return warn(P, "prefix 는 'tr_' 처럼 영문 소문자 2~4자 + _");
  if (TAKEN.includes(P.prefix) || JOBS.some((x) => x.prefix === P.prefix)) return warn(P, `prefix ${P.prefix} 가 이미 쓰임`);
  for (const f of ["init", "act", "month"]) if (typeof P[f] !== "function") return warn(P, `${f}() 가 없어 건너뜀`);
  // 1) 투잡 소개: 플레이 가능으로. info 로 소개 글을 덮어쓸 수 있다
  if (P.info) Object.assign(D.SIDEJOBS[k], P.info);
  D.SIDEJOBS[k].play = true;
  // 2) 행동 정의
  for (const [id, a] of Object.entries(P.actions || {})) {
    if (!id.startsWith(P.prefix)) { warn(P, `행동 ${id} 는 접두사 ${P.prefix} 로 시작해야 함`); continue; }
    if (D.ACTIONS[id]) { warn(P, `행동 ${id} 가 이미 있음`); continue; }
    D.ACTIONS[id] = { track: "일", ap: 1, hp: 0, ...a };
  }
  // 3) 전체 메뉴 칸: '다른 투잡' 바로 앞
  const row = D.HUB.find((r) => r.some((x) => x.k === "more")) || D.HUB[D.HUB.length - 1];
  const at = row.findIndex((x) => x.k === "more");
  row.splice(at < 0 ? row.length : at, 0, { k, n: P.hubName || D.SIDEJOBS[k].n });
  // 4) 마일스톤(화보 장면). end: true 면 투잡 엔딩(판 끝 에필로그·엔딩 도감)
  for (const m of P.milestones || []) {
    const x = { key: m.key, title: m.title, test: m.test, lines: m.lines, who: m.who };
    if (m.end) { if (!m.key.startsWith(P.prefix)) warn(P, `엔딩 ${m.key} 는 접두사 ${P.prefix} 로 시작해야 함`); Object.assign(x, { end: true, job: k, kind: m.kind === "bad" ? "bad" : "good", epi: m.epi || "" }); }
    D.MOMENTS.push(x);
  }
  // 5) 특전 카드
  for (const p of P.perks || []) D.PERKS.push({ g: "특전", con: "", hint: [], ...p });
  Object.assign(D.PERK_CINE, P.perkCine || {});
  Object.assign(D.TITLE_CINE, P.titleCine || {});
  // 6) 시너지
  for (const x of P.synergy || []) D.SYNERGY.push(x);
  // 7) 성향 카드 숨은 특성(이 투잡을 시작하면 공개)
  for (const h of P.traits || []) { const t = D.TRAITS.find((x) => x.id === h.trait); if (t) (t.hid = t.hid || []).push({ d: k, t: h.t, m: h.m || {} }); else warn(P, `성향 카드 ${h.trait} 없음`); }
  // 8) 지도 장소에 행동 붙이기
  for (const [sp, ids] of Object.entries(P.spots || {})) { if (D.SPOTS[sp]) D.SPOTS[sp].acts.push(...ids.filter((id) => D.ACTIONS[id] && !D.SPOTS[sp].acts.includes(id))); else warn(P, `장소 ${sp} 없음`); }
  JOBS.push(P); BY_KEY[k] = P;
}
for (const P of PLUGINS) { try { register(P); } catch (e) { warn(P, "등록 중 오류 " + e.message); } }


// ───────── 기존 투잡 이야기 보강(engine/story/<key>.js, 규약 engine/story/README.md) ─────────
// 상태는 s.sx[key]. 월 이벤트·전용 효과·선택 처리·마일스톤·특전·시너지만 붙인다(돈·행동은 기존 엔진 그대로).
export const STORY = [];
export const STORY_BY = {};
const OLD = ["pr", "cs", "insta", "airbnb", "ucafe"];
const STORY_PFX = { pr: "prs_", cs: "css_", insta: "ins_", airbnb: "abs_", ucafe: "ucs_" };
function registerStory(X) {
  const k = X.key;
  if (!OLD.includes(k)) return warn(X, "key 는 pr·cs·insta·airbnb·ucafe 중 하나");
  if (STORY_BY[k]) return warn(X, "같은 key 이야기가 이미 등록됨");
  if (X.prefix !== STORY_PFX[k]) return warn(X, `prefix 는 ${STORY_PFX[k]} 이어야 함`);
  if (typeof X.init !== "function" || typeof X.month !== "function") return warn(X, "init()·month() 가 없어 건너뜀");
  for (const m of X.milestones || []) {
    if (!m.key.startsWith(X.prefix)) { warn(X, `마일스톤 ${m.key} 는 ${X.prefix} 로 시작해야 함`); continue; }
    const x = { key: m.key, title: m.title, test: m.test, lines: m.lines, who: m.who };
    if (m.end) Object.assign(x, { end: true, job: k, kind: m.kind === "bad" ? "bad" : "good", epi: m.epi || "" });
    D.MOMENTS.push(x);
  }
  for (const p of X.perks || []) D.PERKS.push({ g: "특전", con: "", hint: [], ...p });
  Object.assign(D.PERK_CINE, X.perkCine || {});
  for (const x of X.synergy || []) D.SYNERGY.push(x);
  STORY.push(X); STORY_BY[k] = X;
}
for (const X of STORIES) { try { registerStory(X); } catch (e) { warn(X, "이야기 등록 중 오류 " + e.message); } }

// 투잡 엔딩 목록: 기존 5개(defs.MOMENTS 의 ME(...)) + 플러그인 milestones 의 end: true. 투잡 순서(SIDEJOBS)대로
// { key, title, job, kind: "good"|"bad", epi } — ui.js 가 엔딩 도감·판 끝 에필로그·결산 화면에 쓴다
const endTitle = (t) => String(t || "").replace(/^엔딩\s*[:：]\s*/, "");
const JOB_ORDER = Object.keys(D.SIDEJOBS);
export const ENDS = D.MOMENTS.filter((m) => m.end && D.SIDEJOBS[m.job]).map((m) => ({ key: m.key, title: endTitle(m.title), job: m.job, kind: m.kind || "good", epi: m.epi || "" }))
  .sort((a, b) => JOB_ORDER.indexOf(a.job) - JOB_ORDER.indexOf(b.job));
// 이번 판에서 받은 투잡 엔딩(받은 순서)
export function endsOf(s) { const mo = s?.moments || {}; return ENDS.filter((e) => mo[e.key] !== undefined).sort((a, b) => mo[a.key] - mo[b.key]); }

// 한 달 투잡 이익: money 이름표가 있으면 장부(s.month)에서, 없으면 month()가 돌려준 값
export function sideOf(P, M, ret) {
  if (!P.money) return ret || 0;
  const sum = (o, ks) => (ks || []).reduce((a, n) => a + (o[n] || 0), 0);
  return sum(M.inc, P.money.inc) - sum(M.exp, P.money.exp);
}
