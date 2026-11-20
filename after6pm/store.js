// After 6PM · 저장소. 게임은 이 파일의 함수만 부른다.
// 사이트에 로그인한 사용자가 있으면 서버(아이디별 3칸), 없으면 이 브라우저(localStorage 3칸).
//
// 사이트가 할 일(둘 중 하나):
//   A) 게임 페이지에 <script>window.AFTER6PM_USER = { id: "회원번호", nick: "닉네임" }; window.AFTER6PM_API = "/api/after6pm";</script>
//   B) window.AFTER6PM_API 만 넣고, 서버의 GET {API}/me 가 { id, nick } 를 돌려준다(로그인 안 됐으면 401).
// 서버 주소 규칙은 docs/SAVE_API.md 참고. 사용자 확인은 서버가 세션 쿠키로 한다(게임이 보내는 id를 믿지 않는다).

export const SLOTS = 3; // 아이디마다 진행 칸 3개. 0번 칸은 연구 기록(지난 판 결과)용.
const LS = "after6pm_v4_slot_"; // 로컬: after6pm_v4_slot_0 ~ _3
let mode = "local", user = null, API = "";
const pend = {}; let timer = null;

export async function init() {
  API = (window.AFTER6PM_API || "").replace(/\/$/, "");
  const u = window.AFTER6PM_USER;
  if (u && u.id) { user = { id: String(u.id), nick: String(u.nick || "") }; mode = API ? "server" : "local"; }
  else if (API) {
    try { const r = await fetch(API + "/me", { credentials: "include" }); if (r.ok) { const j = await r.json(); if (j && j.id) { user = { id: String(j.id), nick: String(j.nick || "") }; mode = "server"; } } } catch (e) {}
  }
  if (typeof window !== "undefined") window.addEventListener("pagehide", () => flush(true));
  return { mode, user };
}
export const who = () => user; // { id, nick } 또는 null
export const isServer = () => mode === "server";

async function call(method, path, body, keepalive) {
  const r = await fetch(API + path, { method, credentials: "include", keepalive: !!keepalive, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`저장 서버 ${r.status}`);
  return r.status === 204 ? {} : r.json();
}
const lsKey = (n) => LS + (user && mode === "local" ? user.id + "_" : "") + n;
function lsGet(n) { try { const t = localStorage.getItem(lsKey(n)); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function lsSet(n, v) { try { if (v === null) localStorage.removeItem(lsKey(n)); else localStorage.setItem(lsKey(n), JSON.stringify(v)); } catch (e) {} }

// 칸 목록: [{ slot: 1, summary: {...}, updatedAt } 또는 { slot: 2, empty: true }]
export async function list() {
  let rows = [];
  if (mode === "server") { try { rows = (await call("GET", "/slots"))?.slots || []; } catch (e) { rows = []; } }
  else for (let n = 1; n <= SLOTS; n++) { const v = lsGet(n); if (v) rows.push({ slot: n, summary: v.summary, updatedAt: v.updatedAt }); }
  return Array.from({ length: SLOTS }, (_, i) => rows.find((x) => +x.slot === i + 1) || { slot: i + 1, empty: true });
}
// 칸 하나 읽기 → 저장 문자열(data) 또는 null
export async function load(n) {
  if (pend[n]) return pend[n].data;
  if (mode === "server") { const j = await call("GET", "/slots/" + n); return j?.data ?? null; }
  return lsGet(n)?.data ?? null;
}
// 저장: 로컬은 바로, 서버는 4초 모아서 한 번(행동마다 보내지 않는다). now=true면 바로 보낸다.
export function save(n, data, summary, now) {
  const v = { data, summary, updatedAt: new Date().toISOString() };
  if (mode !== "server") return lsSet(n, v);
  pend[n] = v; clearTimeout(timer);
  if (now) return flush(); timer = setTimeout(flush, 4000);
}
export async function flush(keepalive) {
  clearTimeout(timer);
  for (const n of Object.keys(pend)) { const v = pend[n]; delete pend[n]; try { await call("PUT", "/slots/" + n, { data: v.data, summary: v.summary }, keepalive); } catch (e) { pend[n] = pend[n] || v; } }
}
export async function remove(n) {
  delete pend[n];
  if (mode === "server") { await call("DELETE", "/slots/" + n); return; }
  lsSet(n, null);
}
// 연구 기록(지난 판 결과) = 0번 칸
export async function getMeta() { try { const t = await load(0); return t ? JSON.parse(t) : {}; } catch (e) { return {}; } }
export function setMeta(m) { save(0, JSON.stringify(m), { kind: "meta" }, true); }

// 명예의 전당: 서버가 있으면 전체 회원 순위(GET/POST {API}/hall), 없으면 null → 게임이 내 기록(0번 칸)만 보여 준다
export async function hallList() {
  if (mode !== "server") return null;
  try { return (await call("GET", "/hall"))?.hall || null; } catch (e) { return null; }
}
export async function hallSubmit(rec) {
  if (mode !== "server") return;
  try { await call("POST", "/hall", rec); } catch (e) {}
}
