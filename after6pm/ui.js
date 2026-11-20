// After 6PM v4 · 화면. 엔진(engine/*.js)은 계산만, 여기서는 그리기와 클릭만.
import * as E from "./engine/core.js";
import * as PR from "./engine/pr.js";
import * as CS from "./engine/cs.js";
import * as SJ from "./engine/sj.js";
import * as INS from "./engine/insta.js";
import * as SYN from "./engine/syn.js";
import * as AB from "./engine/abnb.js";
import * as BIG from "./engine/big.js";
import * as UC from "./engine/ucafe.js";
import { portraitDataURL, randomLook } from "./portrait.js";
import * as ST from "./store.js";
import * as APP from "./app.js";
import * as FX from "./fx.js";
import { ART } from "./gen/art.js";
import { BODY, BG } from "./gen/body.js";
const D = E.D;
const $app = document.getElementById("app"), $modal = document.getElementById("modal"), $toast = document.getElementById("toast");
let S = null, SLOT = 1, META_C = {};
const ui = { page: "home", region: null, filter: "all", prFlow: null, wiz: null, chain: [], sjf: "all", dir: 0 };
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const won = E.won, jo = E.jo;
const r1 = (x) => Math.round(x * 10) / 10;

window.addEventListener("error", (e) => showErr(e.message + "\n" + (e.error?.stack || "")));
window.addEventListener("unhandledrejection", (e) => showErr(String(e.reason?.stack || e.reason)));
function showErr(t) { let d = document.getElementById("err"); if (!d) { d = document.createElement("div"); d.id = "err"; document.body.appendChild(d); d.onclick = () => d.remove(); } d.textContent = "오류가 났어요. 이 화면을 캡처해서 알려 주세요.\n" + t; }

// ───────── 아이콘 ─────────
const P = {
  home: '<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  bed: '<path d="M3 18V8M3 14h18v4M21 18v-5a3 3 0 0 0-3-3h-7v4"/><circle cx="7" cy="11" r="2"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  gym: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  heart: '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/>',
  chart: '<path d="M3 20h18M6 16v-5M11 16V8M16 16v-8M21 16V5"/>',
  door: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18"/><circle cx="15" cy="12" r="1"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
  msg: '<path d="M4 5h16v11H8l-4 4z"/>',
  cam: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 7l2-3h4l2 3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9c0-1-1.3-1.8-3-1.8S9 8 9 9.3s1.3 1.8 3 2.2 3 1 3 2.3-1.3 2-3 2-3-.9-3-2"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  mega: '<path d="M3 11v2l13 5V6zM16 9a3 3 0 0 1 0 6M7 14l1 5h3l-1-4"/>',
  bld: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  glass: '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0zM12 14v7M8 21h8"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M6 20l4-6 3 2 2 5M9 10l3-3 3 3 3 1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9z"/>',
  next: '<path d="M6 4l12 8-12 8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  baby: '<circle cx="12" cy="7" r="4"/><path d="M6 21c0-4 3-7 6-7s6 3 6 7"/><path d="M10 7h.01M14 7h.01"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
};
const ic = (k, c = "currentColor") => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[k] || P.spark}</svg>`;
const ACT_IC = { rest: "bed", study_home: "book", study: "book", course: "book", workout: "gym", pt: "gym", run_crew: "run", beauty: "spark", family_time: "heart", kids_play: "heart", visit_parents: "home", drink: "glass", drink_fancy: "glass", exhibit: "spark", trend_walk: "search", book_club: "book", dating_app: "heart", network_lunch: "users", cowork: "brief", cafe_work: "brief", univ_walk: "search", house_tour: "bld", house_search: "bld", work_hard: "brief", overtime: "brief", office_chat: "msg", company_dinner: "glass", pr_search: "search", pr_visit: "search", pr_landlord: "msg", pr_appcheck: "search", pr_setup: "wrench", pr_manage: "door", pr_promo: "cam", cs_friend: "pen", cs_work: "pen", cs_blog: "pen", cs_insta: "cam", cs_youtube: "video", cs_kakao: "msg", cs_kmong: "coin", cs_soomgo: "coin", cs_flyer: "mega", cs_seminar: "mega", cs_lecture: "mega", cs_template: "pen", cs_group: "users", cs_vod: "video", rejob: "brief", sj_youtube: "video", sj_report: "book", sj_seminar: "mega", sj_interview: "msg", hb_go: "music", co_lunch: "users", co_project: "chart", co_resume: "pen", pr_meetup: "users", pr_course: "book", pr_teach: "mega", pr_club: "glass", pr_review: "cam", in_post: "cam", in_reel: "video", in_engage: "msg", in_deal: "coin", in_gong: "coin", grad_apply: "book", grad_class: "book", pr_decor: "spark", cs_focus: "pen", ab_search: "search", ab_clean: "bed", ab_photo: "cam", ab_host: "msg", ab_cohost: "users", uc_search: "search", uc_check: "wrench", uc_promo: "mega", uc_agent: "users", bg_prcon: "chart", bg_brand: "bld", bg_vip: "coin", bg_ai: "wrench" };

// ───────── 초상 ─────────
function seededRng(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } let a = h >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lookCache = {};
function lookOf(id) { const c = E.CHAR[id]; if (c?.look?.hair) return c.look; if (!lookCache[id]) lookCache[id] = randomLook(seededRng(id), c?.gender || "F", { older: (c?.age || 30) >= 40 }); return lookCache[id]; }
// 그림체 초상화: img/ch/<id>.webp 한 장에 표정 6칸(3x2). 불러오기 전에는 도트 얼굴을 보여 주고, 다 불러오면 그 자리에서 바꾼다.
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const ART_CACHE = {}, ART_LOAD = {}, ART_FALL = new Map();
function artLoad(key) {
  if (ART_CACHE[key] || ART_LOAD[key] || !ART.has(key)) return;
  ART_LOAD[key] = 1;
  const im = new Image();
  im.onload = () => {
    try {
      const cw = Math.floor(im.width / 3), chh = Math.floor(im.height / 2), c = document.createElement("canvas"); c.width = cw; c.height = chh; const g = c.getContext("2d");
      ART_CACHE[key] = [0, 1, 2, 3, 4, 5].map((j) => { g.clearRect(0, 0, cw, chh); g.drawImage(im, (j % 3) * cw, Math.floor(j / 3) * chh, cw, chh, 0, 0, cw, chh); return c.toDataURL("image/webp", 0.88); });
      if (ui.wiz && !S && ui.wiz.step === 1) renderWiz();
      document.querySelectorAll("img.face").forEach((el) => { const hit = ART_FALL.get(el.getAttribute("src")); if (hit && hit[0] === key) el.setAttribute("src", ART_CACHE[key][hit[1]]); });
    } catch (e) {}
  };
  im.src = "img/ch/" + key + ".webp";
}
function artOr(key, expr, fallback) {
  if (!key || !ART.has(key)) return fallback();
  const i = EXI[expr] ?? 0;
  if (ART_CACHE[key]) return ART_CACHE[key][i];
  const fb = fallback(); if (fb) ART_FALL.set(fb, [key, i]); artLoad(key); return fb;
}
function artPreload(ids) { let k = 0; for (const id of ids) setTimeout(() => (BODY[id] ? bodyLoad(id) : artLoad(id)), 40 * k++); }
const BODY_IMG = {}, BODY_LD = {}, BODY_CUT = {}, BODY_WAIT = new Map();
function bodyLoad(key) {
  if (BODY_IMG[key] || BODY_LD[key] || !BODY[key]) return;
  BODY_LD[key] = 1;
  const im = new Image();
  im.onload = () => {
    BODY_IMG[key] = im;
    document.querySelectorAll("img.face,img.body").forEach((el) => { const h = BODY_WAIT.get(el.getAttribute("src")); if (h && h[0] === key) { const mode = el.classList.contains("body") ? (el.closest(".sstage.half,.mestage") ? "half" : "full") : "face"; try { el.setAttribute("src", bodyCut(key, h[1], mode)); } catch (e) {} } });
    if (ui.wiz && !S && ui.wiz.step === 1) renderWiz();
  };
  im.src = "img/body/" + key + ".webp";
}
function bodyCut(key, i, mode) {
  const ck = key + i + mode; if (BODY_CUT[ck]) return BODY_CUT[ck];
  const im = BODY_IMG[key], cw = im.width / 3, ch = im.height / 2, sx = (i % 3) * cw, sy = Math.floor(i / 3) * ch, k = cw / 240;
  let x = 0, y = 0, w = cw, h = ch;
  if (mode === "face") { const b = BODY[key][i]; x = b[0] * k; y = b[1] * k; w = h = b[2] * k; }
  else if (mode === "half") h = Math.round(cw * 1.3);
  const c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(h);
  c.getContext("2d").drawImage(im, sx + x, sy + y, w, h, 0, 0, c.width, c.height);
  return (BODY_CUT[ck] = c.toDataURL("image/webp", 0.9));
}
// 몸 그림이 있으면 그 조각, 없으면 null. 불러오는 동안에는 fallback 을 보여 주고 다 불러오면 그 자리에서 바꾼다.
function bodyOr(key, expr, mode, fallback) {
  if (!key || !BODY[key]) return null;
  const i = EXI[expr] ?? 0;
  if (BODY_IMG[key]) return bodyCut(key, i, mode);
  bodyLoad(key); const fb = fallback(); if (fb) BODY_WAIT.set(fb, [key, i, mode]); return fb;
}
const pixFace = (id, expr) => () => { try { return portraitDataURL(lookOf(id), E.CHAR[id]?.gender || "F", expr, 4); } catch (e) { return ""; } };
const pixMe = (expr) => () => { try { return portraitDataURL(S.me.look, S.me.gender, expr, 5); } catch (e) { return ""; } };
function bodySrc(id, expr, mode) { return id === "me" ? bodyOr(S.me.avatar, expr, mode, pixMe(expr)) : bodyOr(id, expr, mode, pixFace(id, expr)); }
// 장소 배경: 장소(spot) → 배경 그림
const SPOT_BG = { app: "online", chat: "online", market: "online", univ: "gate" };
const PAGE_BG = { pr: "partyroom", cs: "consult", airbnb: "airbnb", ucafe: "ucafe", co: "desk", insta: "home", grad: "library", family: "apt", hobby: "cafe" };
function bgUrl(k) { return k && BG.has(k) ? `img/bg/${k}.webp` : ""; }
function charSpot(id) { for (const [sp, ids] of Object.entries(S.spot || {})) if (ids.includes(id)) return SPOT_BG[sp] || sp; const c = E.CHAR[id]; if (c?.customer) return c.customer.board === "partyroom" ? "partyroom" : "consult"; return null; }
function sceneBg(sc) {
  const cands = [sc.kind === "wedding" ? "wedding" : null, ui.lastSpot ? SPOT_BG[ui.lastSpot] || ui.lastSpot : null, PAGE_BG[ui.page], sc.who ? charSpot(sc.who) : null, "street", "alley"];
  for (const k of cands) if (k && BG.has(k)) return bgUrl(k);
  return "";
}
// 장소 위에 사람을 세운 무대. 몸 그림이 없으면 예전처럼 얼굴 칸.
function stageWho(id, expr, mode, bg, cap) {
  const src = bodySrc(id, expr, mode);
  if (!src) return null;
  return `<div class="sstage ${mode}" style="${bg ? `background-image:url(${bg})` : ""}">${img(src, "body", "")}${cap ? `<div class="cap">${cap}</div>` : ""}</div>`;
}
function faceSrc(id, expr = "neutral") { return bodyOr(id, expr, "face", pixFace(id, expr)) ?? artOr(id, expr, pixFace(id, expr)); }
function meSrc(expr) { return bodyOr(S.me.avatar, expr, "face", pixMe(expr)) ?? artOr(S.me.avatar, expr, pixMe(expr)); }
const AVATARS = (g) => [...new Set([...Object.keys(BODY), ...ART])].filter((k) => k.startsWith("p" + g)).sort();
const img = (src, cls = "face", alt = "") => src ? `<img class="${cls}" src="${src}" alt="${esc(alt)}">` : "";
function exprFor(id) { const x = S.rel[id]; if (!x) return "neutral"; if (x.lover || x.spouse) return "blush"; return x.aff >= 45 ? "smile" : "neutral"; }
function myExpr() { if (S.hp < 30 || S.mental < 25) return "sad"; if (S.mental >= 70) return "smile"; return "neutral"; }

// ───────── 저장 ─────────
// 저장은 store.js가 맡는다(로그인하면 서버 3칸, 아니면 브라우저 3칸)
function summary() { return { name: S.me.name, gender: S.me.gender, age: Math.floor(S.age), ym: E.ymLabel(S), nw: Math.round(E.netWorth(S)), job: S.co.quit || S.co.fired ? "전업" : `${S.co.name} ${D.RANKS[S.co.rank].n}`, side: S.sj.active.map((k) => D.SIDEJOBS[k].n).join("·"), end: S.over || S.ended || null }; }
function save(now) { if (S) ST.save(SLOT, E.save(S), summary(), now); }
function meta() { return META_C; }
function setMeta(m) { META_C = m; ST.setMeta(m); }

// ───────── 알림 ─────────
function toast(lines, msg) {
  const d = document.createElement("div");
  d.innerHTML = (msg ? `<div>${esc(msg)}</div>` : "") + (lines?.length ? `<b>${lines.filter(Boolean).map(esc).join(" · ")}</b>` : "");
  if (!d.innerHTML) return;
  $toast.appendChild(d); setTimeout(() => d.remove(), 2600);
  while ($toast.children.length > 3) $toast.firstChild.remove();
}

// ───────── 행동 실행 ─────────
function doAct(id, arg) {
  const a = D.ACTIONS[id];
  ui.lastSpot = Object.values(D.SPOTS).find((sp) => sp.acts.includes(id))?.id || null;
  if (a.pick && arg === undefined) return pickFor(id);
  const res = E.act(S, id, arg);
  if (!res.ok) { toast([], res.msg); return; }
  afterRes(res);
}
function afterRes(res) {
  if (res.lines?.length || res.msg) toast(res.lines, res.msg);
  if (res.open?.startsWith("listings:")) { ui.page = "pr"; ui.prFlow = { step: "list", dk: res.open.split(":")[1] }; }
  save(); render();
  if (S.pending) showScene();
}
function pickFor(id) {
  const a = D.ACTIONS[id];
  if (a.pick === "stat") {
    openWin(`<h2>${esc(a.n)} <button class="x" data-close>✕</button></h2><p class="muted small">어떤 능력치를 올릴까요? 높을수록 덜 올라요. 체력은 운동·취미로 올려요.</p><div class="pick">${D.STAT_KEYS.filter((k) => k !== "body").map((k) => `<button data-pick="${k}"><b>${D.STATS[k]}</b><span class="muted">지금 ${Math.round(S.st[k])}</span><span class="tiny muted">${STAT_USE[k]}</span></button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  } else if (a.pick === "beauty") {
    openWin(`<h2>꾸미기 · 매력 관리 <button class="x" data-close>✕</button></h2><div class="acts" style="padding:0">${D.BEAUTY.map((b) => `<button class="actrow" data-pick="${b.k}"><div class="ic">${ic("spark")}</div><div class="grow"><div class="t">${b.n} <span class="gold small">${won(-b.cash)}</span></div><div class="d">${b.desc}</div><div class="chips"><span class="p">매력 +${b.charm}</span>${b.talk ? `<span class="p">말빨 +${b.talk}</span>` : ""}</div></div><span class="ap">⚡1</span></button>`).join("")}</div><p class="muted small">지금 매력 ${Math.round(S.st.charm)} · 행동력 ${S.ap}/${S.apMax} · 현금 ${won(S.cash)}</p>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  } else if (a.pick === "district") { ui.page = "pr"; ui.prFlow = { step: "district" }; render(); }
  else if (a.pick === "decor") { const rm = S.pr.rooms[0]; if (!rm) return toast([], "지점이 없어요"); ui.prFlow = { step: "decor", id: rm.id, picks: { ...rm.decor } }; go("pr"); }
  else if (a.pick === "quiz") quizWin(id);
  else if (a.pick === "ucarea") openWin(`<h2>어느 상권을 볼까요? <button class="x" data-close>✕</button></h2><div class="pick">${Object.entries(D.UC_AREAS).map(([k, A]) => `<button data-pick="${k}"><b>${esc(A.n)}</b><span class="tiny muted">유동인구 ${"●".repeat(Math.round(A.traffic * 3))} · 월세 ${A.rent[0]}~${A.rent[1]}만(10평) · 경쟁 ${A.comp}곳</span><span class="tiny muted">${esc(A.tip)}</span></button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  else if (a.pick === "abregion") openWin(`<h2>어느 지역을 볼까요? <button class="x" data-close>✕</button></h2><div class="pick">${Object.entries(D.AB_REGIONS).map(([k, R]) => `<button data-pick="${k}"><b>${esc(R.n)}</b><span class="tiny muted">외국인 ${Math.round(R.foreign * 100)}% · 1박 약 ${R.adr}만 · 월세 ${R.rent[0]}~${R.rent[1]}만</span><span class="tiny muted">${esc(R.tip)}</span><span class="tiny ${R.city ? "bad" : "good"}">${R.city ? "합법 등록이면 외국인만 받아요" : "합법 등록해도 누구나 받아요"}</span></button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  else if (a.pick === "grad") {
    openWin(`<h2>대학원 고르기 <button class="x" data-close>✕</button></h2><p class="muted small">다니는 동안 매달 등록금이 나가고 행동력이 1 줄어요. 30개월 안에 수업 20번을 채우면 졸업해요.</p><div class="pick">${Object.entries(D.GRADS).map(([k, g]) => `<button data-pick="${k}"><b>${esc(g.n)}</b><span class="tiny muted">입학금 ${won(g.cash)} · 월 ${won(g.fee)}</span><span class="tiny muted">${esc(g.desc)}</span><span class="tiny good">졸업: ${Object.entries(g.done).map(([s, v]) => `${D.STATS[s]} +${v}`).join(", ")}</span></button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  }
  else if (a.pick === "sj") {
    const list = Object.entries(D.SIDEJOBS).filter(([k]) => id === "sj_report" ? !SJ.isFound(S, k) : !S.sj.know[k] && ((S.sj.int[k] || 0) >= 30 || SJ.isFound(S, k)));
    openWin(`<h2>${esc(a.n)} <button class="x" data-close>✕</button></h2><p class="muted small">${esc(a.desc)}</p><div class="pick">${list.map(([k, j]) => `<button data-pick="${k}"><b>${esc(j.n)}</b><span class="tiny muted">관심 ${Math.round(S.sj.int[k] || 0)}${j.play ? "" : " · 준비 중"}</span></button>`).join("") || '<div class="muted small">고를 투잡이 없다</div>'}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  }
}
// ───────── 컨설팅 미니게임: 첨삭 퀴즈 3문제 ─────────
function quizWin(id) {
  const why = E.canAct(S, id, 0); if (why) return toast([], why);
  const qs = shuffle(D.CS_QUIZ).slice(0, 3); let i = 0, score = 0;
  const show = (fb) => {
    if (i >= qs.length) return openWin(`<h2>집중 첨삭 끝 <button class="x" data-close>✕</button></h2><div class="quizres"><b class="gold">${score} / 3</b><div class="small muted">${score === 3 ? "완벽해요. 고객이 감동했어요." : score === 2 ? "꽤 잘 봤어요." : score === 1 ? "아쉬운 데가 많았어요." : "고객이 고개를 갸웃했어요."}</div></div><button class="btn gold" style="width:100%;margin-top:10px;padding:12px" data-qdone>결과 반영 (행동력 1)</button>`, (w) => w.querySelector("[data-qdone]").onclick = () => { closeWin(); doAct(id, score); }, true);
    const q = qs[i];
    openWin(`<h2>집중 첨삭 ${i + 1}/3 <span class="tag gold">${score}점</span></h2>${fb || ""}<div class="quizq">${esc(q.q)}</div><div class="choices">${q.opts.map((o, k) => `<button data-qa="${k}"><span>${esc(o)}</span></button>`).join("")}</div>`, (w) => w.querySelectorAll("[data-qa]").forEach((b) => b.onclick = () => { const ok = +b.dataset.qa === q.a; if (ok) score++; i++; show(`<div class="quizfb ${ok ? "ok" : "ng"}">${ok ? "맞아요!" : "아쉬워요."} ${esc(q.why)}</div>`); }), true);
  };
  show();
}
const STAT_USE = { talk: "상담·면접 코칭·설득", write: "자소서 첨삭·블로그", sense: "인테리어·사진·디자인 (나이 들면 떨어짐)", mkt: "유입·광고·SNS", hands: "수리·청소·셀프 공사", num: "입지·재무·협상", career: "직무 지식·승진(회사 다니면 저절로 조금씩)", charm: "첫인상·연애", body: "최대 스태미너·행동력", lang: "에어씨앤씨 외국인 응대·해외영업·구매" };

// ───────── 그리기 ─────────
function render() {
  if (!S) return renderTitle();
  if (S.over || S.ended) return renderEnding();
  if (!unlocked(ui.page)) ui.page = "home";
  S.tileSeen = S.tileSeen || {}; S.tileSeen[ui.page] = 1;
  const pages = { home: pgHome, map: pgMap, people: pgPeople, me: pgMe, sj: pgSJ, co: pgCo, hobby: pgHobby, family: pgFamily, pr: pgPR, cs: pgCS, insta: pgInsta, grad: pgGrad, airbnb: pgAirbnb, ucafe: pgUcafe };
  $app.innerHTML = top() + pager() + `<div class="page ${ui.dir > 0 ? "inR" : ui.dir < 0 ? "inL" : ""}">${pages[ui.page]()}</div>` + nav();
  ui.dir = 0;
  bind();
}
// ───────── 화면 지도(허브)·넘기기 ─────────
const TILE = {
  people: { ic: "users", bg: "img/keyvisual.webp", lock: "첫 인연을 만나면" },
  map: { ic: "map", bg: "img/bg_insta.webp", lock: "" },
  home: { ic: "home", bg: "img/bg_office.webp", lock: "" },
  sj: { ic: "search", bg: "img/diorama.webp", lock: "첫 달이 지나면" },
  me: { ic: "user", bg: "img/bg_home.webp", lock: "" },
  co: { ic: "brief", bg: "img/bg_office.webp", lock: "" },
  hobby: { ic: "music", bg: "img/keyvisual.webp", lock: "" },
  family: { ic: "baby", bg: "img/bg_home.webp", lock: "결혼하면" },
  pr: { ic: "door", bg: "img/bg_partyroom.webp", lock: "투잡 탐색에서 파티룸 시작" },
  insta: { ic: "cam", bg: "img/bg_insta.webp", lock: "투잡 탐색에서 인별그램 시작" },
  airbnb: { ic: "bld", bg: "img/bg_home.webp", lock: "투잡 탐색에서 에어씨앤씨 시작" },
  ucafe: { ic: "glass", bg: "img/bg_office.webp", lock: "투잡 탐색에서 무인카페 시작" },
  grad: { ic: "book", bg: "img/bg_office.webp", lock: "스터디카페에서 대학원에 들어가면" },
  cs: { ic: "pen", bg: "img/bg_insta.webp", lock: "투잡 탐색에서 컨설팅 시작" },
  more: { ic: "lock", bg: "", lock: "다음 업데이트" },
};
function unlocked(k) {
  if (["home", "map", "me", "co", "hobby"].includes(k)) return true;
  if (k === "people") return Object.keys(S.rel).length > 0;
  if (k === "sj") return S.sj.open;
  if (k === "family") return !!(S.fam.spouse || S.fam.kids.length);
  if (k === "pr" || k === "cs" || k === "insta" || k === "airbnb" || k === "ucafe") return SJ.isActive(S, k);
  if (k === "grad") return !!S.grad;
  return false;
}
const PAGE_N = Object.fromEntries(D.HUB.flat().map((x) => [x.k, x.n]));
function order() { return D.HUB.flat().map((x) => x.k).filter(unlocked); }
function go(k, dir = 0) { if (!unlocked(k)) return; if (k !== ui.page) { ui.hist = (ui.hist || []).filter((x) => x !== k); if (ui.page) ui.hist.push(ui.page); ui.hist = ui.hist.slice(-12); } ui.page = k; ui.dir = dir; if (k === "map") ui.region = null; if (k === "pr" && dir) ui.prFlow = null; render(); window.scrollTo(0, 0); }
function step(d) { const o = order(); const i = o.indexOf(ui.page); const k = o[(i + d + o.length) % o.length]; go(k, d); }
// 위쪽 머리줄: 왼쪽 뒤로, 가운데 지금 화면 이름, 오른쪽 전체 메뉴. 홈에서는 뒤로 대신 날짜.
function pager() {
  const home = ui.page === "home", anyNew = D.HUB.flat().some(({ k }) => unlocked(k) && !S.tileSeen?.[k]);
  const left = home ? `<span class="pdate"></span>` : `<button class="pback" data-back>${ic("back")}뒤로</button>`;
  return `<div class="pager">${left}<div class="cur">${ic(TILE[ui.page]?.ic || "home")}${esc(PAGE_N[ui.page] || "홈")}</div><button class="pmenu" data-hub>${ic("grid")}전체 메뉴${anyNew ? '<span class="badge">N</span>' : ""}</button></div>`;
}
function goBack() {
  const h = ui.hist || [];
  while (h.length) { const k = h.pop(); if (k !== ui.page && unlocked(k)) { ui.page = k; ui.dir = -1; if (k === "map") ui.region = null; render(); window.scrollTo(0, 0); return; } }
  ui.page = "home"; ui.dir = -1; render(); window.scrollTo(0, 0);
}
function tileInfo(k) {
  if (k === "home") return `${S.year}.${S.cal}`;
  if (k === "people") return `${Object.keys(S.rel).length}명`;
  if (k === "map") return `${Object.values(S.spot).flat().filter((id) => !S.rel[id]).length} 새 얼굴`;
  if (k === "sj") return `발견 ${Object.keys(S.sj.found).length}/21`;
  if (k === "me") return `파이어 ${Math.round(E.fireInfo(S).ratio * 100)}%`;
  if (k === "co") return S.co.quit || S.co.fired ? "퇴사" : D.RANKS[S.co.rank].n;
  if (k === "hobby") return S.hb.joined.length ? S.hb.joined.map((h) => D.HOBBIES[h].n.replace(/ (모임|클래스|동호회|스터디|크루)$/, "").split(" ").pop()).join("·") : "미가입";
  if (k === "family") return S.fam.kids.length ? `아이 ${S.fam.kids.length}` : "신혼";
  if (k === "pr") return `${S.pr.rooms.length}곳`;
  if (k === "cs") return S.cs.open ? `Lv${S.cs.lv}` : "준비 중";
  if (k === "insta") return `${(S.ins.f || 0).toLocaleString()}명`;
  if (k === "ucafe") return `${S.uc.stores.length}곳`;
  if (k === "airbnb") return `${S.ab.units.length}채${S.ab.super ? " ★" : ""}`;
  if (k === "grad") return S.grad?.done ? "졸업" : `수업 ${S.grad?.n || 0}`;
  return "준비 중 18";
}
const TILE_NEW = { people: "cafe", map: "alley", home: "home", sj: "popup", me: "home", co: "desk", hobby: "rooftop", family: "apt", pr: "partyroom", insta: "online", airbnb: "airbnb", ucafe: "ucafe", grad: "library", cs: "consult" };
for (const [k, b] of Object.entries(TILE_NEW)) if (TILE[k] && BG.has(b)) TILE[k].bg = `img/bg/${b}.webp`;
function openHub() {
  const rows = D.HUB.map((row) => `<div class="hrow">${row.map(({ k, n }) => {
    const on = unlocked(k), t = TILE[k], cur = k === ui.page, isNew = on && !S.tileSeen?.[k];
    return `<button class="tile ${on ? "" : "locked"} ${cur ? "cur" : ""}" ${on ? `data-hgo="${k}"` : `data-hlock="${k}"`}>
      <div class="tv" style="${on && t.bg ? `background-image:linear-gradient(180deg,#0e102055,#0e1020dd),url(${t.bg})` : ""}">${on ? `${ic(t.ic)}<span>${esc(tileInfo(k))}</span>` : ""}${isNew ? '<em class="nbadge">NEW</em>' : ""}</div>
      <div class="tl">${on ? "" : ic("lock", "#f5c04e")}${esc(n)}</div></button>`;
  }).join("")}</div>`).join("");
  $modal.innerHTML = `<div class="hub"><div class="hhead"><b>전체 메뉴</b><span class="muted small">누르면 그 화면으로 가요 · 자물쇠는 인생이 진행되면 열려요</span><button class="btn sm" data-hset>설정</button><button class="x" data-hclose>✕</button></div><div class="hgrid">${rows}</div></div>`;
  $modal.querySelector("[data-hset]").onclick = () => settingsWin();
  $modal.querySelector("[data-hclose]").onclick = closeWin;
  $modal.querySelectorAll("[data-hgo]").forEach((b) => b.onclick = () => { closeWin(); go(b.dataset.hgo); });
  $modal.querySelectorAll("[data-hlock]").forEach((b) => b.onclick = () => toast([], `🔒 ${PAGE_N[b.dataset.hlock]}: ${TILE[b.dataset.hlock].lock}`));
}
let touch = null;
document.addEventListener("touchstart", (e) => { if (!S || $modal.innerHTML || e.target.closest("input,select,.hscroll")) { touch = null; return; } const p = e.touches[0]; touch = { x: p.clientX, y: p.clientY, t: Date.now() }; }, { passive: true });
document.addEventListener("touchend", (e) => { if (!touch || !S || S.over || S.ended) return; const p = e.changedTouches[0]; const dx = p.clientX - touch.x, dy = p.clientY - touch.y; touch = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 50) step(dx < 0 ? 1 : -1); }, { passive: true });
function top() {
  const f = E.fireInfo(S), net = S.lastNet ?? 0, met = Object.keys(S.rel).length;
  const apPct = Math.round(S.ap / Math.max(1, S.apMax) * 100);
  return `<div class="top"><button class="assets" data-money>
    <div><div class="k">현금</div><div class="v">${won(S.cash)}</div></div>
    <div><div class="k">지난달</div><div class="v ${net >= 0 ? "good" : "bad"}">${net >= 0 ? "+" : ""}${won(net)}</div></div>
    <div><div class="k">순자산</div><div class="v gold">${won(f.nw)}</div></div>
    <div><div class="k">목표까지</div><div class="v ${f.ready ? "good" : ""}">${Math.round(f.ratio * 100)}%</div></div><span class="more">${ic("info")}</span></button>
    <div class="apbar" data-apinfo><span class="lab">${ic("bolt")}이번 달 행동력</span><div class="bar"><i style="width:${apPct}%"></i></div><span class="num">${S.ap}/${S.apMax}</span><span class="hp">스태미너 <b>${Math.round(S.hp)}</b></span></div></div>`;
}
// 위쪽 숫자를 누르면 나오는 자세한 돈 상황
function moneyWin() {
  const f = E.fireInfo(S), net = S.lastNet ?? 0, left = Math.max(0, Math.ceil((D.endAge(S.me.gender) - S.age) * 12)), goal = S.fam.spouse ? 30 : 20;
  const row = (k, v, cls = "", sub = "") => `<tr><th>${k}</th><td class="${cls}">${v}${sub ? `<div class="tiny muted">${sub}</div>` : ""}</td></tr>`;
  openWin(`<h2>내 돈 상황 <button class="x" data-close>✕</button></h2><table class="mtab">
    ${row("현금", won(S.cash), "", "지금 바로 쓸 수 있는 돈")}
    ${row("지난달 손익", (net >= 0 ? "+" : "") + won(net), net >= 0 ? "good" : "bad", "월급·투잡 수입에서 생활비·이자를 뺀 돈")}
    ${row("투잡 월수익", won(S.hist.at(-1)?.side || 0))}
    ${row("대출", won(E.debt(S)), E.debt(S) ? "bad" : "")}
    ${row("순자산", won(f.nw), "gold", "현금 + 투자 + 집 − 대출")}
    ${row("목표까지", Math.round(f.ratio * 100) + "%", f.ready ? "good" : "", `목표: ${D.endAge(S.me.gender)}세까지 순자산 ${goal}억 (결혼하면 30억)`)}
    ${row("게임 끝까지", left + "개월", "", `${D.endAge(S.me.gender)}세에 인생을 결산해요`)}
    ${row("인물도감", `${Object.keys(S.rel).length} / ${CHARS_N}명`)}
  </table><button class="btn" style="width:100%;margin-top:10px;padding:11px" data-mgo="me">투자·대출 하러 가기 ›</button>`, (w) => w.querySelector("[data-mgo]").onclick = () => { closeWin(); go("me"); });
}
function apWin() {
  openWin(`<h2>${ic("bolt", "#f5c04e")} 행동력이 뭐예요? <button class="x" data-close>✕</button></h2><div class="intro">
    <p>한 달에 할 수 있는 <b class="gold">행동 횟수</b>예요. 이번 달 <b class="gold">${S.ap}번</b> 남았어요.</p>
    <p>버튼에 붙은 <b class="gold">⚡1</b>, <b class="gold">⚡2</b>는 그 행동에 드는 행동력이에요.</p>
    <p>다 쓰면 <b>다음 달</b>을 눌러요. 남겨도 괜찮지만 다음 달로 넘어가지는 않아요.</p>
    <p><b class="good">스태미너</b>는 체력이에요. 행동할수록 줄고, 많이 줄면 다음 달 행동력도 줄어요. 지치면 '푹 쉬기'.</p></div>`);
}
function nav() {
  const td = E.todos(S).filter((t) => t.lv >= 2).length;
  const it = [["home", "홈", "home"], ["map", "지도", "map"], ["people", "사람들", "users"], [S.sj.open ? "sj" : "co", S.sj.open ? "투잡" : "회사", S.sj.open ? "search" : "brief"], ["me", "나·돈", "user"]];
  return `<div class="nav"><div class="in">${it.map(([k, n, i]) => `<button class="${ui.page === k ? "on" : ""} ${unlocked(k) ? "" : "off"}" data-go="${k}">${ic(i)}${n}${k === "home" && td ? `<span class="badge">${td}</span>` : ""}</button>`).join("")}</div></div>`;
}
function meter(v, max, color) { return `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${color}"></i></div>`; }
function hearts(aff) { const n = Math.round(aff / 20); return `<span class="hearts">${"♥".repeat(n)}${"♡".repeat(5 - n)}</span>`; }

// 홈
function pgHome() {
  const rk = D.RANKS[S.co.rank].n, job = S.co.quit || S.co.fired ? "전업 사장님" : `${S.co.name} ${rk}`;
  const bgk = S.co.quit || S.co.fired ? (SJ.isActive(S, "cs") && !SJ.isActive(S, "pr") ? "consult" : "partyroom") : S.fam.spouse ? "apt" : [12, 1, 2].includes(S.cal) ? "home" : "desk";
  const bg = bgUrl(bgk) || (S.co.quit || S.co.fired ? "img/bg_partyroom.webp" : S.fam.spouse || [12, 1, 2].includes(S.cal) ? "img/bg_home.webp" : "img/bg_office.webp");
  const heroB = bodySrc("me", myExpr(), "full");
  const ring = [];
  if (S.fam.spouse) ring.push(S.fam.spouse);
  for (const [id, x] of Object.entries(S.rel)) if (x.lover) ring.push(id);
  const td = E.todos(S).slice(0, 7);
  const { quick, locked } = quickActs();
  const places = ["co", "hobby", "sj", "pr", "cs", "insta", "airbnb", "ucafe", "grad", "family"].filter(unlocked);
  return `<div class="stage" style="background-image:url(${bg})">
    ${heroB ? img(heroB, "body hero2", "나") : img(meSrc(myExpr()), "face hero", "나")}
    <div class="when"><b>${S.year}년 ${S.cal}월</b><span>${Math.floor(S.age)}세 · ${esc(job)}</span></div>
    <div class="side">${!S.sj.active.length ? `<span>투잡 없음 · 회사원${S.sj.open ? "" : ""}</span>` : ""}${SJ.isActive(S, "pr") ? `<span>파티룸 ${S.pr.rooms.length}곳 · Lv${S.pr.lv}</span>` : ""}${SJ.isActive(S, "cs") ? `<span>컨설팅 Lv${S.cs.lv}${S.cs.open ? "" : " 준비 중"}</span>` : ""}${S.hb.joined.map((h) => `<span>${esc(D.HOBBIES[h].n)}</span>`).join("")}<span>${D.HOUSING[S.house.type]?.n || ""}</span>${S.fam.kids.length ? `<span>아이 ${S.fam.kids.length}명</span>` : ""}</div>
    <div class="lovers">${ring.map((id) => `<button data-char="${id}">${img(faceSrc(id, "blush"))}</button>`).join("")}</div>
    <div class="news"><div class="src">투잡일보 · ${S.year}.${String(S.cal).padStart(2, "0")}</div><div class="h">${esc(S.news)}</div></div>
  </div>
  <div class="strip">
    <div><div class="v good">${Math.round(S.hp)}</div><div class="k">스태미너</div>${meter(S.hp, S.hpMax, "var(--green)")}</div>
    <div><div class="v" style="color:var(--blue)">${Math.round(S.mental)}</div><div class="k">멘탈</div>${meter(S.mental, 100, "var(--blue)")}</div>
    <div><div class="v pink">${Math.round(S.st.charm)}</div><div class="k">매력</div>${meter(S.st.charm, 100, "var(--pink)")}</div>
    <div><div class="v" style="color:var(--orange)">${S.co.quit || S.co.fired ? "-" : Math.round(S.co.eye)}</div><div class="k">회사 눈치</div>${meter(S.co.eye, 100, "var(--orange)")}</div>
    <div><div class="v" style="color:var(--purple)">${S.fam.spouse ? Math.round(S.fam.happy) : Object.keys(S.rel).length}</div><div class="k">${S.fam.spouse ? "가족" : "인맥"}</div>${meter(S.fam.spouse ? S.fam.happy : Object.keys(S.rel).length, S.fam.spouse ? 100 : 40, "var(--purple)")}</div>
  </div>
  ${S.t < 4 && !S.coachOff ? `<div class="coach"><b>${ic("info")}이렇게 하면 돼요</b><ol><li><b>바로 하기</b>나 <b>지도</b>에서 행동을 골라요. 행동마다 ${ic("bolt")}행동력이 줄어요.</li><li>그림 속 <b>사람을 누르면</b> 말을 걸어 인연이 돼요.</li><li>행동력을 다 쓰면 맨 아래 <b class="gold">다음 달</b>을 눌러요.</li></ol><button class="x" data-coach>알겠어요</button></div>` : ""}
  ${td.length ? `<div class="sec">${ic("list")}이번 달 할 일 <span class="muted small">· 누르면 그곳으로 가요</span></div><div class="todo">${td.map((t) => `<button class="l${t.lv}" data-todo="${esc(t.go || "")}"><span class="dot"></span><span class="grow">${esc(t.text)}</span>${t.go ? '<span class="arr">›</span>' : ""}</button>`).join("")}</div>` : ""}
  <div class="sec">${ic("pin")}내 장소 <span class="muted small">· 눌러서 들어가요</span></div>
  <div class="places hscroll">${places.map((k) => `<button data-go="${k}" style="background-image:linear-gradient(180deg,#0e102033,#0e1020ee),url(${TILE[k].bg})">${ic(TILE[k].ic)}<b>${esc(PAGE_N[k])}</b><span>${esc(tileInfo(k))}</span>${!S.tileSeen?.[k] ? '<em class="nbadge">NEW</em>' : ""}</button>`).join("")}<button data-hub class="more">${ic("grid")}<b>전체 메뉴</b><span>잠긴 곳 ${D.HUB.flat().filter(({ k }) => !unlocked(k)).length}</span></button></div>
  <div class="sec">${ic("bolt")}바로 하기 <span class="muted small">· ⚡숫자만큼 행동력을 써요</span></div>
  <div class="grid4">${quick.map((id) => { const a = D.ACTIONS[id]; const why = a.pick ? null : E.canAct(S, id, defaultArg(id)); return `<button data-act="${id}" class="${why ? "qno" : ""}" ${why ? `data-why="${esc(why)}"` : ""}>${ic(ACT_IC[id])}${esc(a.n)}${why ? `<span class="tiny why">${esc(why)}</span>` : `<span class="ap">⚡${a.ap}</span>`}</button>`; }).join("")}${locked.map(([id, why]) => `<button class="qlock" data-qlock="${esc(why)}">${ic("lock", "#f5c04e")}${esc(D.ACTIONS[id].n)}<span class="tiny muted">${esc(why)}</span></button>`).join("")}</div>
  <div class="next"><button class="btn" data-go="me">${ic("chart")} 투자·대출<br><span class="gold small">${won(S.invest)}</span></button><button class="btn gold ${S.ap <= 0 ? "pulse" : ""}" data-end><span><span class="nt">다음 달 ${ic("next", "#2a1a00")}</span><small>${S.ap > 0 ? `행동력 ${S.ap} 남음` : "이번 달 끝! 넘어가요"}</small></span></button></div>`;
}
// 바로 하기 칸은 인생이 진행될수록 늘어난다
function quickActs() {
  const quit = S.co.quit || S.co.fired, nRel = Object.keys(S.rel).length;
  const L = [
    [quit ? "rejob" : "work_hard", () => true, ""], ["rest", () => true, ""], ["study", () => true, ""],
    ["workout", () => S.t >= 1, "2달째부터"],
    [SJ.isActive(S, "pr") ? (S.pr.rooms.some((r) => r.status === "open") ? "pr_manage" : "pr_search") : null, () => true, ""],
    [SJ.isActive(S, "cs") ? (S.cs.queue.length ? "cs_work" : S.cs.open ? "cs_blog" : "cs_friend") : null, () => true, ""],
    [SJ.isActive(S, "insta") ? (S.ins.deals ? "in_deal" : "in_post") : null, () => true, ""],
    [S.grad && !S.grad.done ? "grad_class" : null, () => true, ""],
    [SJ.isActive(S, "airbnb") && S.ab.units.length && !S.ab.cohost ? "ab_clean" : null, () => true, ""],
    [SJ.isActive(S, "ucafe") && S.uc.stores.length && !S.uc.agent ? "uc_check" : null, () => true, ""],
    ["hb_go", () => S.hb.joined.length > 0, "취미에 가입하면"],
    ["co_lunch", () => !quit && S.t >= 1, "2달째부터"],
    ["sj_youtube", () => S.sj.open && S.sj.active.length < 2, "투잡 탐색이 열리면"],
    [S.fam.spouse || S.fam.kids.length ? "family_time" : "dating_app", () => S.fam.spouse || S.t >= 3 || nRel >= 3, "인연 3명 또는 4달째"],
    ["beauty", () => S.t >= 2, "3달째부터"],
    ["co_project", () => !quit && (S.co.rank >= 1 || S.t >= 6), "7달째부터"],
    ["cafe_work", () => S.sj.active.length > 0, "투잡을 시작하면"],
    ["co_resume", () => !quit && S.t >= 12, "1년이 지나면"],
    ["drink", () => S.t >= 2, "3달째부터"],
  ].filter(([id]) => id);
  const quick = [], locked = [];
  for (const [id, ok, why] of L) { if (ok()) { if (quick.length < 8) quick.push(id); } else if (locked.length < 2 && quick.length + locked.length < 10) locked.push([id, why]); }
  return { quick, locked };
}
function defaultArg(id) {
  if (id === "hb_go") return S.hb.joined.find((h) => S.hb.lastT[h] !== S.t) || S.hb.joined[0];
  if (id === "pr_manage" || id === "pr_promo") { const rm = S.pr.rooms.filter((r) => r.status === "open").sort((a, b) => (a.ap - PR.needAp(S, a)) - (b.ap - PR.needAp(S, b)))[0]; return rm?.id; }
  return undefined;
}

// 지도
const REGION_BG0 = { town: "img/bg_home.webp", company: "img/bg_office.webp", univ: "img/keyvisual.webp", hot: "img/bg_insta.webp", officest: "img/bg_office.webp", club: "img/keyvisual.webp", online: "img/bg_insta.webp", newtown: "img/bg_home.webp", parents: "img/bg_home.webp" };
const REGION_NEW = { town: "cafe", company: "desk", univ: "gate", hot: "popup", officest: "alley", club: "pub", online: "online", newtown: "apt", parents: "parents" };
const REGION_BG = new Proxy(REGION_BG0, { get: (o, k) => bgUrl(REGION_NEW[k]) || o[k] });
const REGION_TINT = { town: "#3b2a5a", company: "#22324f", univ: "#4a2b3e", hot: "#5a2a4a", officest: "#24304a", club: "#21413a", online: "#2c2a55", newtown: "#3a3a2a", parents: "#463225" };
function regionPeople(rg) { return rg.spots.flatMap((sp) => S.spot[sp.id] || []); }
function pgMap() {
  if (ui.region) return pgRegion(D.REGIONS.find((r) => r.id === ui.region));
  return `<div class="sec">${ic("map")}어디로 갈까요? <span class="muted small">· 동네를 누르면 장소와 사람이 나와요</span></div><div class="regions">${D.REGIONS.filter((rg) => !rg.hub).map((rg) => {
    const lock = rg.unlock && !rg.unlock(S); const ppl = regionPeople(rg);
    return `<button class="region ${lock ? "lock" : ""}" data-region="${rg.id}" ${lock ? "disabled" : ""} style="background:linear-gradient(180deg,${REGION_TINT[rg.id]}55,#0b0c1ae6 78%),url(${REGION_BG[rg.id]}) center/cover">
      <div class="faces">${ppl.slice(0, 4).map((id) => S.rel[id] ? img(faceSrc(id, exprFor(id))) : `<i>?</i>`).join("")}</div>
      <div class="rn">${esc(rg.n)}</div><div class="rd">${lock ? "31세 또는 결혼 후 열림" : esc(rg.desc)}</div>
      <div class="rd">${ppl.length ? `인연 ${ppl.length}명${ppl.some((id) => !S.rel[id]) ? " · 새 얼굴" : ""}` : "&nbsp;"}</div></button>`;
  }).join("")}</div>`;
}
function actChips(id) {
  const a = D.ACTIONS[id], c = [];
  const hp = E.hpCost(S, id); if (hp > 0) c.push(`<span class="m">스태미너 −${hp}</span>`); else if (hp < 0) c.push(`<span class="p">스태미너 +${-hp + (id === "rest" ? 10 : 0)}</span>`);
  if (a.mental) c.push(`<span class="${a.mental > 0 ? "p" : "m"}">멘탈 ${a.mental > 0 ? "+" : ""}${a.mental}</span>`);
  if (a.cash) c.push(`<span class="m">돈 ${won(a.cash)}</span>`);
  if (a.stat) for (const [k, v] of Object.entries(a.stat)) c.push(`<span class="p">${D.STATS[k]} +${v}</span>`);
  if (a.gain) c.push(`<span class="p">능력치 +${a.gain}</span>`);
  return c.join("");
}
function actRow(id, arg, label) {
  const a = D.ACTIONS[id]; const why = a.pick && arg === undefined ? (a.need && !a.need(S) ? "지금은 할 수 없음" : null) : E.canAct(S, id, arg);
  return `<button class="actrow" data-act="${id}" ${arg !== undefined ? `data-arg="${esc(arg)}"` : ""} ${why ? `data-why="${esc(why)}" style="opacity:.5"` : ""}><div class="ic">${ic(ACT_IC[id])}</div><div class="grow"><div class="t">${esc(label || a.n)}</div><div class="d">${esc(why || a.desc)}</div><div class="chips">${actChips(id)}</div></div><span class="ap">⚡${a.ap}</span></button>`;
}
function visibleAct(id) { if (/^pr_/.test(id)) return SJ.isActive(S, "pr"); if (/^cs_/.test(id)) return SJ.isActive(S, "cs"); if (/^in_/.test(id)) return SJ.isActive(S, "insta"); if (/^ab_/.test(id)) return SJ.isActive(S, "airbnb"); if (/^uc_/.test(id)) return SJ.isActive(S, "ucafe"); if (id === "grad_class") return !!(S.grad && !S.grad.done); if (/^co_|work_hard|overtime|office_chat|company_dinner/.test(id)) return !(S.co.quit || S.co.fired); return true; }
// 장소 무대: 그 장소 그림 위에 오늘 와 있는 사람들이 서 있다. 누르면 인물 창(말 걸기).
function personFig(id, i, n) {
  const c = E.CHAR[id], x = S.rel[id];
  const expr = x ? exprFor(id) : "neutral";
  const src = bodySrc(id, expr, "full");
  const tag = !x ? `<span class="say">말 걸기 ⚡1</span>` : x.spouse ? `<span class="say love">배우자</span>` : x.lover ? `<span class="say love">연인</span>` : `<span class="say h">${"♥".repeat(Math.max(1, Math.round(x.aff / 20)))}</span>`;
  const fig = src ? img(src, "body", "") : `<span class="pface">${img(faceSrc(id, expr), "face", "")}</span>`;
  return `<button class="pfig ${!x ? "new" : ""} ${src ? "" : "noart"}" data-char="${id}" style="--i:${i};--n:${n}">${fig}<span class="pn">${x ? esc(c.name) : "???"}</span>${tag}</button>`;
}
function placeStage(bgKey, title, ppl, sub, extraCls = "") {
  const bg = bgUrl(SPOT_BG[bgKey] || bgKey);
  const show = ppl.slice(0, 5);
  return `<div class="pstage ${extraCls} ${show.length ? "" : "empty"}" style="${bg ? `background-image:url(${bg})` : ""}">
    <div class="ptop"><b>${title}</b><span>${sub ?? (ppl.length ? `${ppl.length}명 있음` : "오늘은 조용함")}</span></div>
    <div class="crowd">${show.map((id, i) => personFig(id, i, show.length)).join("")}</div>
    ${ppl.length > 5 ? `<div class="more">+${ppl.length - 5}명</div>` : ""}</div>`;
}
function spotBlock(sp) { const ppl = S.spot[sp.id] || []; return `<div class="spot pl">${placeStage(sp.id, esc(sp.n), ppl)}<div class="acts">${sp.acts.filter(visibleAct).map((id) => actRow(id, defaultArg(id))).join("")}</div></div>`; }
function personCard(id) {
  const c = E.CHAR[id], x = S.rel[id];
  const role = !x ? "새 얼굴" : x.spouse ? "배우자" : x.lover ? "연인" : x.helper ? (c.helper?.role || "조력자") : c.job;
  return `<button class="person ${!x ? "new" : x.lover || x.spouse ? "love" : ""}" data-char="${id}"><div class="pic">${img(faceSrc(id, x ? exprFor(id) : "neutral"))}</div><div class="nm">${x ? esc(c.name) : "???"}</div><div class="rl">${esc(role)}${x?.deja ? " · 전생 인연" : ""}</div>${x ? hearts(x.aff) : `<span class="tag gold">말 걸기 ⚡1</span>`}</button>`;
}
function pgRegion(rg) {
  return `<div class="row"><button class="btn sm" data-region="">‹ 지도</button><b style="font-size:17px">${esc(rg.n)}</b></div><div class="muted small">${esc(rg.desc)}</div>
  ${rg.spots.map((sp) => { const ppl = S.spot[sp.id] || []; return `<div class="spot pl">${placeStage(sp.id, esc(sp.n), ppl)}
    <div class="acts"><div class="tiny muted">${esc(sp.n)}에서 언제든</div>${sp.acts.filter(visibleAct).map((id) => actRow(id, defaultArg(id))).join("") || '<div class="tiny muted">투잡을 시작하면 여기서 할 일이 생겨요</div>'}${sp.id === "home" ? actRow("beauty") : ""}${(S.co.quit || S.co.fired) && sp.id === "cowork" ? actRow("rejob") : ""}</div></div>`; }).join("")}`;
}

// 투잡
const SJ_BG = { pr: "partyroom", cs: "consult", insta: "online", ucafe: "ucafe", airbnb: "airbnb", coffee: "cafe", popup: "popup", shortstay: "airbnb", tutoring: "online", tistory: "home", realtyblog: "realty", chicken: "pub", bouquet: "wedding", goods: "popup", aivideo: "cowork", vibe: "cowork", webnovel: "library", thesis: "library", press: "cowork", tarot: "gallery", saju: "gallery" };
const bool = (b, y, n) => (b ? y : n);
function attrs(L, full) {
  const sh = (k) => L.seen?.[k] || full;
  const parts = [
    [`${L.size}평`], [L.floor === -1 ? "지하" : `${L.floor}층`], [L.floor >= 2 ? bool(L.elevator, "엘리베이터 O", "엘리베이터 X") : "엘리베이터 -", L.floor >= 3 && !L.elevator ? "bad" : ""],
    [["주차 불가", "주차 1대", "주차 넉넉"][L.parking], L.parking === 0 ? "bad" : L.parking === 2 ? "good" : ""], [L.toilet === "in" ? "화장실 내부" : "화장실 외부(공용)", L.toilet === "out" ? "bad" : "good"], [L.heating, L.heating === "냉난방기만" ? "bad" : ""], [`역 도보 ${L.walk}분`, L.walk <= 5 ? "good" : L.walk > 10 ? "bad" : ""],
    sh("sound") ? [`방음 ${L.hid.sound}`, L.hid.sound === "나쁨" ? "bad" : L.hid.sound === "좋음" ? "good" : ""] : ["방음 ?", "q"],
    sh("access24") ? [L.hid.access24 ? "24시간 출입" : "심야 출입 불가", L.hid.access24 ? "good" : "bad"] : ["24시간 출입 ?", "q"],
    sh("ondolOk") ? [L.hid.ondolOk ? "온돌 시공 가능" : "온돌 불가", L.hid.ondolOk ? "good" : ""] : ["온돌 가능 ?", "q"],
    sh("landlord") ? [`건물주 ${L.hid.landlord}`, L.hid.landlord === "싫어함" ? "bad" : L.hid.landlord === "환영" ? "good" : ""] : ["건물주 ?", "q"],
    sh("comp") ? [`경쟁 ${L.hid.comp}곳`, L.hid.comp >= 6 ? "bad" : L.hid.comp <= 2 ? "good" : ""] : ["경쟁 ?", "q"],
  ];
  return `<div class="attrs">${parts.map(([t, c]) => `<span class="${c || ""}">${esc(t)}</span>`).join("")}</div>`;
}
function pgPR() {
  const pr = S.pr, f = ui.prFlow;
  if (f?.step === "district") return prDistrict();
  if (f?.step === "list") return prList(f.dk);
  if (f?.step === "contract") return prContract(f);
  if (f?.step === "decor") return prDecor(f);
  const open = pr.rooms.filter((r) => r.status === "open");
  const last = pr.profitHist.at(-1) || 0;
  const avgR = open.length ? open.reduce((a, r) => a + r.rating, 0) / open.length : 0;
  const need = PR.totalNeed(S), have = pr.rooms.reduce((a, r) => a + (r.status === "open" ? Math.min(r.ap, PR.needAp(S, r)) : 0), 0);
  const lv = D.PR_LEVELS[pr.lv - 1];
  return `${boardHead("pr")}<div class="card"><h3>파티룸 <small>Lv${pr.lv} 「${lv.n}」</small></h3><div class="kv">
    <div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${last >= 0 ? "+" : ""}${won(last)}</div></div>
    <div><div class="k">평균 별점</div><div class="v gold">${avgR ? "★ " + avgR.toFixed(2) : "-"}</div></div>
    <div><div class="k">지점</div><div class="v">${pr.rooms.length}곳</div></div>
    <div><div class="k">관리 행동력</div><div class="v ${have < need ? "bad" : ""}">${r1(have)}/${r1(need)}</div></div>
    <div><div class="k">운영 노하우</div><div class="v">${Math.round(pr.know || 0)}</div></div>
    <div><div class="k">규모의 경제</div><div class="v">×${D.scaleF(pr.rooms.length || 1)}</div></div>
    <div><div class="k">물가</div><div class="v">×${(S.pi || 1).toFixed(2)}</div></div>
    ${pr.sold ? `<div><div class="k">매각 ${pr.sold}곳</div><div class="v good">${won(pr.soldSum)}</div></div>` : ""}</div>
    ${pr.listings.length ? `<div style="margin-top:8px"><button class="btn sm" data-prflow="list:${pr.listings[0].dk}">보던 매물 ${pr.listings.length}개 보기</button></div>` : ""}</div>
  ${peakCard()}
  ${pr.rooms.map(roomCard).join("")}
  <button class="card" style="border-style:dashed;text-align:center;padding:18px" data-prflow="district"><b class="gold" style="font-size:18px">+ ${pr.rooms.length ? "새 지점 열기" : "첫 파티룸 열기"}</b><div class="muted small">상권 고르기 → 매물 보기(행동 1) → 숨은 정보 확인 → 계약</div></button>
  ${pr.rooms.length ? scalePanel() : prGuide()}
  ${knowPanel()}`;
}
function peakCard() {
  const pr = S.pr, p = pr.peak || 1, mx = Math.max(...D.PR_SEASON.map((x) => x.we * 24 + x.wk * 22));
  return `<div class="card"><h3>성수기 가격 <small>12월 극성수기 · 1·2·7·8월 성수기</small></h3>
    <div class="season">${D.PR_SEASON.map((x, i) => `<i class="${i + 1 === S.cal ? "now" : ""} ${PR.isPeak(i + 1) ? "pk" : ""}" style="height:${Math.round((x.we * 24 + x.wk * 22) / mx * 100)}%"></i>`).join("")}</div><div class="season-l">${D.PR_SEASON.map((_, i) => `<span>${i + 1}</span>`).join("")}</div>
    <div class="seg" style="margin-top:8px">${D.PR_PEAK.map((v) => `<button class="${p === v ? "on" : ""}" data-peak="${v}">${v === 1 ? "그대로" : `+${Math.round((v - 1) * 100)}%`}</button>`).join("")}</div>
    <div class="tiny muted" style="margin-top:6px">12월엔 주말이 다 차고 평일도 차요. 비싸도 손님이 오니 이때 가격을 올리는 게 핵심이에요. 너무 올리면 공실이 생겨요. 1·2·7·8월에는 고른 인상폭의 절반이 붙고, 나머지 달은 지점별 기본 가격 그대로예요.${pr.rooms[0] ? ` 예) ${esc(pr.rooms[0].name)} 12월 1건 ${Math.round(pr.rooms[0].price * p)}만` : ""}</div></div>`;
}
function prDecor(f) {
  const rm = S.pr.rooms.find((x) => x.id === f.id); if (!rm) { ui.prFlow = null; return pgPR(); }
  const want = D.DECOR_WANT[rm.concept] || {}, TAG = { photo: "사진발", cozy: "아늑", party: "파티", game: "게임", work: "업무·강의", kids: "아이" };
  const fit = Math.round(PR.decorFit(rm.concept, f.picks) * 100), cost = PR.decorCost(S, rm, f.picks), sc = rm.size / 22 * (S.pi || 1) * D.scaleF(S.pr.rooms.length);
  const others = S.pr.rooms.filter((x) => x !== rm);
  return `<div class="row"><button class="btn sm" data-prflow="">‹ 파티룸</button><b>꾸미기 · ${esc(rm.name)}</b></div>
  ${others.length ? `<div class="row wrap">${others.map((x) => `<button class="btn sm" data-decor="${x.id}">${esc(x.name)}</button>`).join("")}</div>` : ""}
  <div class="card"><div class="small">컨셉 <b class="gold">${esc(D.CONCEPTS[rm.concept].n)}</b> · 손님이 원하는 것: ${Object.entries(want).sort((a, b) => b[1] - a[1]).map(([k]) => `<span class="tag">${TAG[k]}</span>`).join("")}</div>
    <div class="droom">${Object.entries(D.DECOR).map(([k, sl]) => { const i = f.picks[k]; const o = i !== undefined ? sl.opts[i] : null; const hit = o && o.tags.some((tg) => want[tg]); return `<div class="${!o ? "empty" : hit ? "hit" : "miss"}"><span class="e">${sl.ic}</span><span>${o ? esc(o.n) : `${sl.n} 비어 있음`}</span></div>`; }).join("")}</div>
    <div class="row small"><span>컨셉 궁합 <b class="${fit >= 80 ? "good" : fit < 50 ? "bad" : "gold"}">${fit}%</b></span><span class="grow">${meter(fit, 100, fit >= 80 ? "var(--green)" : "var(--gold)")}</span><span>비용 <b>${won(cost)}</b></span></div>
    <div class="tiny muted">궁합이 높을수록 별점이 오르고 손님이 인별에 더 올려요. 감각이 높으면 같은 물건도 더 예쁘게 놓아요. 세 칸 넘게 비어 있으면 사진에서 걸러져 예약이 줄어요.</div></div>
  ${Object.entries(D.DECOR).map(([k, sl]) => `<div class="sec">${sl.ic} ${sl.n}</div><div class="pick">${sl.opts.map((o, i) => { const hit = o.tags.filter((tg) => want[tg]); return `<button class="${f.picks[k] === i ? "on" : ""}" data-dpick="${k}:${i}"><b>${esc(o.n)}</b><span class="tiny muted">${won(Math.round(o.c * sc))}${rm.decor?.[k] === i ? " · 지금 것" : ""}</span><span class="tiny ${hit.length ? "good" : "muted"}">${o.tags.map((tg) => TAG[tg]).join("·") || "-"}</span></button>`; }).join("")}</div>`).join("")}
  <button class="btn gold" style="width:100%;margin-top:10px;padding:12px" data-decorgo>이대로 꾸미기 · ${won(cost)} · ⚡1</button>`;
}
function knowPanel() {
  const pr = S.pr;
  return `<div class="card"><h3>노하우·교육·엑시트 <small>노하우 ${Math.round(pr.know || 0)}/100</small></h3>${meter(pr.know || 0, 100, "var(--gold)")}
    <div class="tiny muted" style="margin:6px 0">노하우가 쌓이면 별점이 오르고(최대 +0.25), 운영비가 줄고(최대 −20%), 관리 행동력도 줄어요. 운영하면서 40까지 저절로 오르고, 그 위는 사장 모임과 교육으로 올려요.</div>
    <div class="acts" style="padding:0">${actRow("pr_meetup")}${actRow("pr_course")}${actRow("pr_review")}${actRow("bg_prcon")}${actRow("bg_brand")}${S.big.fran ? `<div class="tiny good">가맹점 ${S.big.fran.n}곳 · 로열티 월 ${won(S.big.fran.n * 90 * (S.pi || 1))}</div>` : ""}${SYN.on(S, "club") ? actRow("pr_club", undefined, `모임 대관 행사 · ${D.CLUB_HOBBY[S.hb.joined.find((h) => D.CLUB_HOBBY[h])]}`) : ""}${actRow("pr_teach")}</div>
    <div class="tiny muted" style="margin-top:6px">장사가 잘되는 지점(별점 4.4·8개월 이상)에는 <b class="gold">권리금 제안</b>이 와요. 지점 4곳 이상에 매니저를 두면 공간 운영사가 <b class="gold">전부 인수</b>하겠다고 찾아오기도 해요. 그게 파티룸 엑시트예요.</div></div>`;
}
function prGuide() { return `<div class="card"><h3>컨셉은 매물 크기·층에 따라</h3><div class="small muted">${Object.values(D.CONCEPTS).map((c) => `<span class="tag">${esc(c.n)}</span>`).join(" ")}<br>홈파티는 30평 이하, 강의·세미나룸은 20평 이상, B2B 교육장은 28평 이상에 주차, 초대형은 40평 이상이에요. 2층 이상에서 엘리베이터가 없으면 키즈·교육장은 못 해요.</div></div><div class="card"><h3>입지가 전부예요</h3><div class="small muted">파티룸이 망하는 이유 1위는 무리한 입지와 비용 구조예요. 매물마다 <b class="gold">방음·24시간 출입·건물주·경쟁·온돌</b>이 숨어 있어요. 임장, 건물주 미팅, 앱 조사로 확인해 보세요. 확인하지 않고 계약하면 운영하다가 민원이나 계약 해지로 드러나요.</div></div>`; }
function roomCard(rm) {
  const c = D.CONCEPTS[rm.concept], d = D.DISTRICTS[rm.dk], need = PR.needAp(S, rm), L = rm.last;
  const st = rm.status === "setup" ? `<span class="tag gold">${rm.self ? `셀프 공사 ${rm.self}번 남음` : "공사 중 · 다음 달 오픈"}</span>` : `<span class="tag green">영업 중 ${rm.months}개월</span>`;
  return `<div class="room"><div class="art" style="background-image:linear-gradient(180deg,transparent,#0008),url(img/${rm.concept === "party" || rm.concept === "work" ? "diorama" : "bg_partyroom"}.webp)"><div class="st">${st}${rm.notice ? ` <span class="tag red">계약 해지 ${rm.notice - S.t}개월</span>` : ""}</div></div>
    <div class="body"><div class="row"><div class="grow"><div class="nm">${esc(rm.name)}</div><div class="muted small">${esc(c.n)} · ${D.INTERIORS[rm.interior].n} 인테리어${rm.ondol ? " · 온돌" : ""}</div></div>${rm.status === "open" ? `<div style="text-align:right"><div class="gold" style="font-weight:900">★ ${rm.rating.toFixed(2)}</div><div class="tiny muted">리뷰 ${rm.reviews}</div></div>` : ""}</div>
    ${L ? `<div class="kv"><div><div class="k">가동률</div><div class="v">${Math.round(L.occ * 100)}%</div></div><div><div class="k">예약</div><div class="v">${L.bookings}건</div></div><div><div class="k">지난달 순익</div><div class="v ${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</div></div></div>` : ""}
    ${rm.status === "open" ? `<div class="row small"><span>입소문 ${Math.round(rm.buzz || 0)}</span><span class="grow">${meter(rm.buzz || 0, 100, "var(--pink)")}</span>${L?.ig != null ? `<span class="tiny muted">지난달 인별 ${L.ig} · 블로그 ${L.bl}</span>` : ""}</div>` : ""}
    <div class="tiny muted">주 고객: ${(c.seg || []).map(esc).join(", ")}</div>
    <div class="row small"><span>주변 경쟁 <b>${PR.mkt(S, rm.dk).comp}곳</b> · 시세 1건 ${Math.round(PR.refPrice(S, rm))}만 <span class="muted">(내 가격 ${rm.price}만)</span></span><span class="grow"></span><span>꾸밈 궁합 <b class="${PR.decorFit(rm.concept, rm.decor) >= 0.8 ? "good" : PR.decorFit(rm.concept, rm.decor) < 0.5 ? "bad" : "gold"}">${Math.round(PR.decorFit(rm.concept, rm.decor) * 100)}%</b></span><button class="btn sm" data-decor="${rm.id}">꾸미기</button></div>
    ${attrs(rm, false)}
    <div class="row wrap"><span class="small">월세 ${won(rm.rent)}</span><span class="grow"></span><span class="small muted">예약 1건</span><div class="stepper"><button data-price="${rm.id}:-1">−</button><b>${rm.price}만</b><button data-price="${rm.id}:1">+</button></div></div>
    ${rm.status === "open" ? `<div class="row"><span class="small">이번 달 관리 <b class="${rm.ap < need ? "bad" : "good"}">${r1(rm.ap)}/${r1(need)}</b></span><span class="grow"></span><button class="btn sm" data-act="pr_manage" data-arg="${rm.id}">관리 ⚡1</button><button class="btn sm" data-act="pr_promo" data-arg="${rm.id}">홍보 사진 ⚡1</button></div>` : rm.self ? `<button class="btn sm" data-act="pr_setup" data-arg="${rm.id}">셀프 공사 ⚡1</button>` : ""}
    <div class="row"><select data-concept="${rm.id}" class="btn sm">${Object.entries(D.CONCEPTS).map(([k, v]) => `<option value="${k}" ${k === rm.concept ? "selected" : ""}>${v.n}${k === rm.concept ? "" : " (변경 공사)"}</option>`).join("")}</select><span class="grow"></span><button class="btn sm danger" data-close-room="${rm.id}">양도(${won(PR.resale(S, rm))})</button></div></div></div>`;
}
function scalePanel() {
  const pr = S.pr, n = pr.rooms.length, sys = pr.sys;
  const cl = D.SCALE.cleanCost(n, 1), cln = D.SCALE.cleanCost(n + 1, 1);
  const rows = Object.entries(D.SCALE.systems).map(([k, v]) => {
    const on = k === "smartlock" ? `${sys.smartlock.length}/${n}곳` : k === "bulk" ? (n >= 3 ? "적용 중" : "") : sys[k] ? "사용 중" : "";
    const can = n >= v.need;
    return `<div class="row" style="background:var(--panel2);border-radius:10px;padding:8px 10px"><div class="grow"><b class="small">${v.n}</b> ${on ? `<span class="tag green">${on}</span>` : ""}<div class="tiny muted">${esc(v.desc)}</div></div>${k === "bulk" ? "" : `<button class="btn sm" data-sys="${k}" ${can ? "" : "disabled"}>${!can ? `${v.need}곳부터` : k === "smartlock" ? "설치" : sys[k] ? "중단" : "시작"}</button>`}</div>`;
  }).join("");
  return `<div class="card"><h3>규모의 경제 <small>지점이 늘수록 단가가 내려간다</small></h3>
    <div class="kv" style="margin-bottom:8px"><div><div class="k">청소 회당(계약 시)</div><div class="v">${r1(cl * (S.pi || 1))}만 → ${r1(cln * (S.pi || 1))}만</div></div><div><div class="k">비품 회당</div><div class="v">${r1(D.SCALE.supply(n) * (S.pi || 1))}만</div></div><div><div class="k">같은 상권 지점</div><div class="v">예약 넘침 +6%/곳</div></div></div>
    <div class="tiny muted" style="margin-bottom:6px">단가 배율: 1호점 ×1 → 2호점 ×0.9 → 3호점 ×0.8 → 4호점부터 ×0.72(최대). 대신 물가가 해마다 2.5%씩 올라서 나중에 여는 지점은 월세·공사비가 더 비싸요.</div>
    <div style="display:flex;flex-direction:column;gap:6px">${rows}</div>
    <div class="tiny muted" style="margin-top:6px">청소 조력자(인연)를 두면 계약보다 30% 싸고 관리 행동력도 준다. 매니저를 두면 파티룸 수익이 '일 안 해도 들어오는 돈'으로 잡혀 파이어 계산에 들어간다.</div></div>`;
}
function prDistrict() {
  const sel = ui.prFlow.dk;
  return `<div class="row"><button class="btn sm" data-prflow="">‹ 파티룸</button><b>상권 고르기</b></div>
  <div class="dist">${Object.entries(D.DISTRICTS).map(([k, d]) => `<button class="${sel === k ? "on" : ""}" data-dk="${k}"><b>${d.n}</b><span>${esc(d.tip)}</span><span>평당 월세 ${d.rate[0]}~${d.rate[1]}만(2층 기준, 1층 2배·지하 0.65배) · 권리금 ${d.key[0]}~${d.key[1]}만</span><span>경쟁 ${PR.mkt(S, k).comp}곳 · 시세 1건 ${Math.round(PR.mkt(S, k).price)}만</span><span>평일 ${"●".repeat(Math.round(d.wk * 5))} 주말 ${"●".repeat(Math.round(d.we * 5))}</span></button>`).join("")}</div>
  ${actRow("pr_search", sel || "univ", sel ? `${D.DISTRICTS[sel].n} 매물 보기 (부동산)` : "상권을 먼저 고르세요")}`;
}
function prList(dk) {
  const ls = S.pr.listings.filter((l) => l.dk === dk);
  const other = [...new Set(S.pr.listings.map((l) => l.dk))].filter((k) => k !== dk);
  return `<div class="row"><button class="btn sm" data-prflow="">‹ 파티룸</button><b>${D.DISTRICTS[dk].n} 매물 ${ls.length}개</b><span class="grow"></span><button class="btn sm" data-prflow="district">상권 바꾸기</button></div>
  ${other.length ? `<div class="row wrap">${other.map((k) => `<button class="btn sm" data-prflow="list:${k}">${D.DISTRICTS[k].n} 매물</button>`).join("")}</div>` : ""}
  ${ls.length ? "" : `<div class="card muted">매물이 없다. 부동산에서 다시 보자.</div>${actRow("pr_search", dk)}`}
  ${ls.map((L) => `<div class="room"><div class="body"><div class="row"><div class="grow"><div class="nm">${esc(D.DISTRICTS[L.dk].n)} ${L.size}평 ${L.floor === -1 ? "지하" : L.floor + "층"}${L.by ? ` <span class="tag green">${esc(E.CHAR[L.by].name)} 건물</span>` : ""}</div><div class="small">보증금 ${won(L.dep)} · 월세 <b>${won(L.rent)}</b>(평당 ${r1(L.rent / L.size)}만) · 권리금 ${won(L.key)}</div>${L.cond ? `<div class="tiny"><span class="tag ${L.cond === "turnkey" ? "gold" : ""}">${D.PR_COND[L.cond].n}</span> <span class="muted">${esc(D.PR_COND[L.cond].desc)}</span></div>` : ""}${L.far ? `<div class="tiny muted">집에서 멀어 관리 행동력 +${L.far * 0.5}</div>` : ""}</div></div>
    ${attrs(L)}
    <div class="row wrap">${L.seen.visit ? "" : `<button class="btn sm" data-act="pr_visit" data-arg="${L.id}">임장 ⚡1</button>`}${L.seen.meet ? "" : `<button class="btn sm" data-act="pr_landlord" data-arg="${L.id}">건물주 미팅 ⚡1</button>`}${L.seen.app ? "" : `<button class="btn sm" data-act="pr_appcheck" data-arg="${L.id}">앱으로 상권 조사 ⚡1</button>`}<span class="grow"></span><button class="btn sm gold" data-prflow="contract:${L.id}">계약 검토</button></div></div></div>`).join("")}`;
}
function prContract(f) {
  const L = S.pr.listings.find((x) => x.id === f.id); if (!L) { ui.prFlow = null; return pgPR(); }
  const d = D.DISTRICTS[L.dk];
  f.concept = f.concept || Object.entries(d.fit).sort((a, b) => b[1] - a[1])[0][0]; f.interior = f.interior ?? 1;
  if (PR.conceptOk(L, f.concept)) f.concept = Object.keys(D.CONCEPTS).filter((k) => !PR.conceptOk(L, k)).sort((a, b) => (d.fit[b] || 0) - (d.fit[a] || 0))[0];
  const it = D.INTERIORS[f.interior], scale = L.size / 22;
  const qt = PR.quote(S, L, f), interior = qt.interior, ondol = qt.ondol, total = qt.total;
  const fitKnown = L.seen.app || (S.pr.known[L.dk === "univ" ? "univ" : "x"] || 0) > 0;
  const unseen = ["sound", "access24", "landlord", "comp", "ondolOk"].filter((k) => !L.seen[k]).length;
  return `<div class="row"><button class="btn sm" data-prflow="list:${L.dk}">‹ 매물</button><b>계약 검토</b></div>
  <div class="card"><div class="nm"><b>${esc(d.n)} ${L.size}평 ${L.floor === -1 ? "지하" : L.floor + "층"}</b></div>${attrs(L)}</div>
  <div class="sec">컨셉 <span class="muted small">· 매물 크기·층에 따라 열려요</span></div><div class="pick">${Object.entries(D.CONCEPTS).map(([k, c]) => { const no = PR.conceptOk(L, k); return `<button class="${f.concept === k ? "on" : ""}" data-cc="${k}" ${no ? "disabled" : ""}><b>${c.n}</b>${no ? `<span class="tiny bad">${esc(no)}</span>` : `<span class="tiny muted">상권 궁합 ${fitKnown ? "●".repeat(Math.round((d.fit[k] || 0.8) * 3.5)) : "? (앱 조사)"}</span><span class="tiny muted">${esc((c.seg || []).slice(0, 2).join("·"))}${c.kit ? ` · 장비 ${won(Math.round(c.kit * qt.pi * qt.sf))}` : ""}</span><span class="tiny muted">평일 ${"●".repeat(Math.round((c.wk ?? 1) * 3))} 주말 ${"●".repeat(Math.round((c.we ?? 1) * 3))} · 후기 ${"●".repeat(Math.round((c.sns ?? 1) * 3))}</span>`}</button>`; }).join("")}</div>
  <div class="sec">인테리어</div><div class="pick">${D.INTERIORS.map((x, i) => `<button class="${f.interior === i ? "on" : ""}" data-it="${i}"><b>${x.n}</b><span class="tiny muted">${won(Math.round(x.cost * scale))} · 첫 별점 ${x.star}</span></button>`).join("")}</div>
  <div class="pick"><button class="${f.self ? "on" : ""}" data-self><b>셀프 공사 ${f.self ? "O" : "X"}</b><span class="tiny muted">비용 −35%, 대신 공사 행동 3번(감각·손재주가 별점에 영향)</span></button>
  <button class="${f.ondol ? "on" : ""}" data-ondol ${L.seen.ondolOk && !L.hid.ondolOk ? "disabled" : ""}><b>온돌 시공 ${f.ondol ? "O" : "X"}</b><span class="tiny muted">${won(Math.round(250 * scale))} · 겨울 예약 +, 난방비 −${L.seen.ondolOk ? "" : " · 가능 여부 ? (임장)"}</span></button></div>
  <div class="card"><div class="row"><span class="grow">보증금 ${won(L.dep)} + 권리금 ${won(L.key)} + 인테리어 ${won(interior)}${ondol ? ` + 온돌 ${won(ondol)}` : ""}${qt.kit ? ` + 장비 ${won(qt.kit)}` : ""} + 가구·비품 ${won(qt.furn)}</span></div>
  <div class="tiny muted">${qt.sf < 1 ? `${S.pr.rooms.length + 1}호점 규모의 경제로 공사·비품 ×${qt.sf}. ` : ""}물가 ×${qt.pi.toFixed(2)}가 이미 들어가 있어요.</div><div class="row" style="margin-top:6px"><b class="grow" style="font-size:17px">합계 ${won(total)}</b><span class="small muted">현금 ${won(S.cash)}</span></div>
  ${total > S.cash ? `<div class="small bad">모자란 돈은 사업자대출(연 4.8%, 한도 6,000만)로 채운다.</div>` : ""}
  ${unseen ? `<div class="small gold">확인 안 한 정보 ${unseen}개. 그대로 계약하면 운영하다가 드러난다.</div>` : ""}
  <button class="btn gold" style="width:100%;margin-top:8px;padding:12px" data-sign="${L.id}">계약하기</button></div>`;
}

function pgCS() {
  const cs = S.cs, steps = CS.entrySteps(S);
  const nicheCards = `<div class="pick">${Object.entries(D.NICHES).map(([k, n]) => { const on = cs.niches.includes(k); const req = `커리어 ${n.req.career}${n.req.years ? ` · 경력 ${n.req.years}년` : ""}`; return `<button class="${on ? "on" : ""}" data-niche="${k}"><b>${n.n}</b><span class="tiny muted">핵심 능력 ${D.STATS[n.stat]} · 단가 ×${n.priceF}</span><span class="tiny muted">조건 ${req}</span></button>`; }).join("")}</div>`;
  if (!cs.open) {
    return `${boardHead("cs")}<div class="card"><h3>취업컨설팅 개업 준비 <small>진입이 제일 어렵다</small></h3><div class="small muted" style="margin-bottom:8px">회사 경력과 직무 지식이 곧 신뢰예요. 첫 후기는 지인에게서, 첫 손님은 크멍이나 블로그에서 와요.</div>
      <div class="steps">${steps.map((x) => `<div class="${x.done ? "done" : ""}"><span class="ck">${x.done ? "✓" : ""}</span><span class="grow">${esc(x.n)}<div class="tiny muted">${esc(x.hint)}</div></span></div>`).join("")}</div></div>
    <div class="sec">포지션</div>${nicheCards}
    <div class="sec">활동명</div><div class="pick"><button class="${cs.nick === "nick" ? "on" : ""}" data-nick="nick"><b>닉네임</b><span class="tiny muted">회사에 덜 들킴</span></button><button class="${cs.nick === "real" ? "on" : ""}" data-nick="real"><b>실명·회사 공개</b><span class="tiny muted">신뢰 +6%p · 회사 눈치 ×1.4</span></button></div>
    <div class="acts" style="padding:0">${actRow("study", "career", "커리어 공부 (스터디카페)")}${actRow("cs_friend")}${actRow("cs_kmong", undefined, "크멍 입점")}${actRow("cs_blog")}</div>`;
  }
  const units = cs.queue.reduce((a, q) => a + q.left, 0);
  const cap = (2 + Math.floor(S.st.write / 35) + Math.floor(cs.template));
  const lvc = D.CS_LEVELS[cs.lv] ? D.CS_LEVELS[cs.lv].c : "최고 레벨";
  const niche = D.NICHES[cs.niche];
  const maxS = Math.max(...niche.season);
  return `${boardHead("cs")}<div class="card"><h3>취업컨설팅 <small>Lv${cs.lv} 「${D.CS_LEVELS[cs.lv - 1].n}」</small></h3><div class="tiny muted">다음 레벨: ${esc(lvc)}</div>
    <div class="funnel" style="margin-top:8px"><div><div class="v">${r1(cs.leads)}</div><div class="k">이번 달 문의</div></div><div><div class="v">${Math.round(cs.conv * 100)}%</div><div class="k">결제 전환</div></div><div><div class="v">${cs.newThisMonth}</div><div class="k">새 고객</div></div><div><div class="v ${cs.queue.length ? "gold" : ""}">${cs.queue.length}</div><div class="k">대기</div></div><div><div class="v good">${cs.passes}</div><div class="k">합격 누적</div></div></div>
    <div class="row wrap small" style="margin-top:6px">${Object.entries(cs.src).filter(([, v]) => v > 0.05).map(([k, v]) => `<span class="tag">${k} ${r1(v)}</span>`).join("") || `<span class="muted">유입 채널을 키우자</span>`}</div>
    <div class="kv" style="margin-top:8px"><div><div class="k">후기</div><div class="v">${Math.floor(cs.reviews)}개</div></div><div><div class="k">신뢰</div><div class="v">${Math.round((cs.trust || 0) * 100)}</div></div><div><div class="k">이번 달 매출</div><div class="v good">${won(cs.monthRev)}</div></div><div><div class="k">처리 용량</div><div class="v">${cap}명/행동</div></div></div></div>
  ${cs.queue.length ? `<div class="card"><h3>대기 고객 ${cs.queue.length}명 <small>행동 ${Math.ceil(units / cap)}번 필요</small></h3><div style="display:flex;flex-direction:column;gap:4px">${cs.queue.slice(0, 8).map((q) => `<div class="row small" style="background:var(--panel2);border-radius:8px;padding:5px 8px">${q.who ? img(faceSrc(q.who, "smile"), "face mini", "") : ""}<span class="grow">${q.who ? esc(E.CHAR[q.who].name) : "고객 #" + q.id} · ${D.CS_PRODUCTS[q.prod].n} · ${D.NICHES[q.niche].n}</span><span>${q.price}만</span>${q.wait ? `<span class="tag red">취소 임박</span>` : ""}</div>`).join("")}</div><div style="margin-top:8px">${actRow("cs_focus")}${actRow("cs_work")}</div></div>` : ""}
  <div class="card"><h3>시즌 <small>${niche.n} · 지금 ${S.cal}월</small></h3><div class="season">${niche.season.map((v, i) => `<i class="${i + 1 === S.cal ? "now" : ""}" style="height:${Math.round(v / maxS * 100)}%"></i>`).join("")}</div><div class="season-l">${niche.season.map((_, i) => `<span>${i + 1}</span>`).join("")}</div></div>
  <div class="sec">마케팅 채널</div>
  <div class="chs">
    <div class="ch"><b>크멍</b><span class="v">${cs.ch.kmong.on ? `상세페이지 ${Math.round(cs.ch.kmong.q)} · 수수료 20%` : "입점 전"}</span><button class="btn sm" data-act="cs_kmong">${cs.ch.kmong.on ? "상세페이지 개선" : "입점"} ⚡1</button></div>
    <div class="ch"><b>네이바 블로그</b><span class="v">글 ${cs.ch.blog.posts}개 · 검색 지수 ${Math.round(cs.ch.blog.idx)}</span><button class="btn sm" data-act="cs_blog">글쓰기 ⚡1</button></div>
    <div class="ch"><b>인별그램</b><span class="v">팔로워 ${cs.ch.insta.f.toLocaleString()}</span><button class="btn sm" data-act="cs_insta">카드뉴스 ⚡1</button></div>
    <div class="ch"><b>너튜브</b><span class="v">구독자 ${cs.ch.youtube.subs.toLocaleString()} · 영상 ${cs.ch.youtube.videos}</span><button class="btn sm" data-act="cs_youtube">영상 ⚡2</button></div>
    <div class="ch"><b>카카우 오픈채팅</b><span class="v">${cs.ch.kakao.m.toLocaleString()}명</span><button class="btn sm" data-act="cs_kakao">방 운영 ⚡1</button></div>
    <div class="ch"><b>숨꼬</b><span class="v">견적 보내면 바로 고객</span><button class="btn sm" data-act="cs_soomgo">견적 ⚡1</button></div>
  </div>
  <div class="card"><h3>판 키우기 <small>명성 ${Math.round(S.fame || 0)}${BIG.isFull(S) ? " · 전업" : ""}</small></h3><div class="tiny muted" style="margin-bottom:6px">아주 잘되면 고액 상품과 AI 플랫폼까지 갈 수 있어요. 플랫폼은 전업(온잡)이어야 하고, 성공하면 크게 벌지만 실패하면 개발비를 날려요.</div>
    <div class="acts" style="padding:0">${actRow("bg_vip")}${actRow("bg_ai", undefined, S.big.plat && S.big.plat.prog < 100 ? `AI 플랫폼 ${S.big.plat.renew ? "리뉴얼" : "개발"} 계속 (${S.big.plat.prog}%)` : S.big.plat?.live && S.big.plat.tier === "small" ? "AI 플랫폼 리뉴얼(1,000만, 대박 재도전)" : undefined)}</div>
    ${S.big.vip ? '<div class="tiny good">VIP 이직 패키지 판매 중</div>' : ""}${S.big.plat?.live && S.big.plat.last ? `<div class="tiny good">AI 플랫폼(${S.big.plat.tier === "big" ? "대박" : "소소하게 운영 중"}): 사용자 ${S.big.plat.last.users.toLocaleString()} · 유료 ${S.big.plat.last.paid.toLocaleString()} · 월 순익 ${won(S.big.plat.last.rev - S.big.plat.last.cost)}</div>` : ""}</div>
  <div class="card"><h3>실력과 가격 <small>${D.CS_PRICE[cs.price].n}</small></h3><div class="kv"><div><div class="k">내 실력</div><div class="v">${CS.skill(S)}</div></div><div><div class="k">이 가격이 요구하는 실력</div><div class="v ${CS.gap(S) > 0 ? "bad" : "good"}">${CS.priceNeed(S)}</div></div><div><div class="k">이번 달 환불</div><div class="v ${cs.refunds ? "bad" : ""}">${cs.refunds || 0}건</div></div></div>
    <div class="tiny muted" style="margin-top:6px">실력 = 핵심 능력과 커리어의 평균. 가격(레벨이 오르면 저절로 오르는 단가 포함)보다 실력이 낮으면 환불과 혹평이 나와요. 집중 첨삭(미니게임)으로 고치면 환불 위험이 줄어요.</div></div>
  <div class="card"><h3>광고비 <small>월 ${won(cs.ads)}</small></h3><input type="range" min="0" max="300" step="10" value="${cs.ads}" data-ads style="width:100%"><div class="tiny muted">돈으로 문의를 산다. 효율은 점점 떨어진다.</div></div>
  <div class="sec">상품·규모의 경제</div>
  <div class="card"><div class="row wrap">${Object.entries(D.CS_PRICE).map(([k, p]) => `<button class="btn sm ${cs.price === k ? "gold" : ""}" data-cprice="${k}">${p.n}${p.req ? ` (후기 ${p.req})` : ""}</button>`).join("")}</div>
    <div class="tiny muted" style="margin-top:6px">자소서 첨삭 ${D.CS_PRODUCTS.edit.price}만 · 면접 코칭 ${D.CS_PRODUCTS.coach.price}만 · 패키지 ${D.CS_PRODUCTS.pkg.price}만(후기 15개부터) × 포지션·가격·레벨 배수</div>
    <div class="acts" style="padding:8px 0 0">${actRow("cs_template", undefined, `첨삭 템플릿 만들기 (${cs.template.toFixed(1)}/3)`)}${actRow("cs_group")}${actRow("cs_vod", undefined, `VOD·전자책 제작 (${Math.round(cs.vod.prog)}%)`)}${actRow("cs_seminar")}${cs.offers ? actRow("cs_lecture", undefined, `대학 강의 (섭외 ${cs.offers}건)`) : ""}</div>
    ${cs.vod.income ? `<div class="small good">VOD·전자책 자동 판매 월 ${won(cs.vod.income)}</div>` : ""}</div>
  <div class="sec">포지션 추가 (Lv3부터)</div>${nicheCards}`;
}
function coEval() {
  const co = S.co, rk = D.RANKS[co.rank], ct = D.COMPANY_TYPES[co.type], nx = D.RANKS[co.rank + 1];
  const yrs = ct.fast ? rk.fast : rk.years, top = co.rank >= ct.top;
  const g = (co.grades || []).slice(-6);
  return `<div class="evalbox"><div class="row"><b class="small">연말 평가</b><span class="grow"></span>${g.length ? g.map((x) => `<span class="gr g${x}">${x}</span>`).join("") : '<span class="tiny muted">첫 평가는 1월</span>'}</div>
    <div class="tiny muted">S·A·B·C·D 중 대부분 B가 나와요. B면 연봉 +2%, S면 +5%. 성과·팀장 호감·직급에 맞는 커리어가 높을수록 위로 나와요.${co.capC ? " <b class='bad'>올해는 C 이하</b>" : ""}${co.pip ? ` <b class="bad">개선 기간 ${co.pip}개월 · 성과 45 넘기기</b>` : ""}${co.remote ? ` <b class="gold">지방 근무 ${co.remote}개월 남음(행동력 −1)</b>` : ""}</div>
    ${top ? `<div class="tiny">이 회사에서 오를 수 있는 끝(${rk.n})이에요.${rk.exec ? " 임원은 해마다 계약을 다시 해요. 평가가 나쁘면 퇴임합니다." : ""}</div>` : `<div class="tiny">다음 직급 <b>${nx.n}</b>: ${rk.n} ${yrs}년(지금 ${co.yrsRank}년) · 평가 점수 ${co.pts}/${yrs + 1} · 커리어 ${Math.round(S.st.career)}/${Math.round(nx.career * 0.85)}${nx.exec ? " · 임원은 1년 계약" : ""}</div>`}</div>`;
}
function pgCo() {
  const co = S.co, q = E.quitReady(S);
  const spots = D.REGIONS.find((r) => r.id === "company").spots;
  if (co.quit || co.fired) return `<div class="card"><h3>${co.retired ? "퇴임·퇴직" : co.fired ? "해고됨" : "퇴사함"}</h3><div class="small muted">낮 시간이 생겨 행동력이 5 늘었어요. 월급은 없어요. 나이가 많을수록 재취업은 어려워져요.</div><div class="acts" style="padding:8px 0 0">${actRow("rejob")}</div></div>`;
  const t = D.COMPANY_TYPES[co.type];
  return `<div class="card"><h3>${esc(co.name)} <small>${t.n} · ${D.RANKS[co.rank].n} · ${Math.floor(co.years)}년 차</small></h3>
    <div class="kv"><div><div class="k">월급(실수령)</div><div class="v">${won(E.salary(S))}</div></div><div><div class="k">성과</div><div class="v">${Math.round(co.perf)}</div></div><div><div class="k">팀장 호감</div><div class="v">${Math.round(co.boss)}</div></div><div><div class="k">겸업 경고</div><div class="v ${co.warns ? "bad" : ""}">${co.warns}회</div></div></div>
    <div style="margin-top:8px" class="small">회사 눈치 ${Math.round(co.eye)} ${meter(co.eye, 100, "var(--orange)")}</div>
    ${coEval()}
    <div class="tiny muted" style="margin-top:4px">눈치가 50을 넘으면 겸업이 들킬 수 있어요(경고 → 감봉 → 해고). ${t.n}은 ×${t.eye}.</div></div>
  <div class="tiny muted" style="margin:2px 2px 6px">투잡 없이 회사만 다녀도 돼요. 다만 연봉은 천천히 오르고 지방 발령, 구조조정 같은 일도 생겨서 회사만으로 20억은 쉽지 않아요.</div>
  ${spots.map(spotBlock).join("")}
  <div class="card"><h3>온잡(전업)으로 가면 <small>명성 ${Math.round(S.fame || 0)}</small></h3><div class="small muted">회사를 나오면 행동력 +5, 컨설팅 처리량 ×1.6·문의 ×1.3, 인별 성장 ×1.3, 파티룸 평일 영업 +15%. 명성이 높으면 파티룸 창업 컨설팅·가맹 사업·VIP 상품·AI 플랫폼이 열려요. 대신 월급이 끊기고 지역 건강보험이 나가요. 잘될 때 가면 크게, 빨리 벌어요.</div></div>
  <div class="card"><h3>환승 퇴사 <small>선퇴사 금지</small></h3>
    <div class="steps"><div class="${q.streak >= 12 ? "done" : ""}"><span class="ck">${q.streak >= 12 ? "✓" : ""}</span><span class="grow">12개월 연속 투잡 수입 ≥ 월급 (지금 ${q.streak}개월)</span></div><div class="${q.emer ? "done" : ""}"><span class="ck">${q.emer ? "✓" : ""}</span><span class="grow">비상금 6개월 치(${won(E.monthlySpend(S) * 6)})</span></div></div>
    <button class="btn ${q.ok ? "gold" : "danger"}" style="width:100%;margin-top:8px" data-quit>${q.ok ? "환승 퇴사하기" : "그냥 사직서 내기(위험)"}</button></div>`;
}

// 투잡 보드 머리
function boardHead(k) { const j = D.SIDEJOBS[k] || { type: "", inc: "" }; return `<div class="row" style="margin-bottom:6px"><button class="btn sm" data-go="sj">‹ 투잡 탐색</button><span class="tag">${esc(j.type)}</span><span class="grow"></span><span class="tiny muted">${esc(j.inc)}</span></div>`; }

// 투잡 탐색
function pgSJ() {
  const sj = S.sj, act = sj.active;
  const card = (k) => {
    const j = D.SIDEJOBS[k], f = SJ.isFound(S, k), on = SJ.isActive(S, k), it = Math.round(sj.int[k] || 0), know = f || sj.know[k];
    const fg = know ? SJ.fit(S, k) : null;
    const btns = on ? `<button class="btn sm gold" data-go="${k}">보드 열기</button><button class="btn sm danger" data-sjstop="${k}">접기</button>`
      : f ? (j.play ? `<button class="btn sm gold" data-sjstart="${k}" ${act.length >= SJ.slots(S) ? "disabled" : ""}>시작하기</button>` : `<span class="tiny muted">다음 업데이트에서 열림</span>`)
      : `<button class="btn sm" data-act="sj_report" data-arg="${k}">리포트 ⚡1</button>`;
    const ask = !sj.know[k] && (it >= 30 || f) ? `<button class="btn sm" data-act="sj_interview" data-arg="${k}">해 본 사람에게 묻기 ⚡1</button>` : "";
    const ban = SJ_BG[k] && bgUrl(SJ_BG[k]);
    return `<div class="sjc ${f ? "found" : ""} ${on ? "on" : ""} ${j.play ? "" : "soon"}">${ban ? `<div class="sjban" style="background-image:url(${ban})"></div>` : ""}<div class="row"><span class="ic">${ic(j.ic)}</span><div class="grow"><b>${esc(j.n)}</b> <span class="tag">${esc(j.type)}</span>${j.play ? "" : ' <span class="tag">준비 중</span>'}</div>${fg ? `<span class="fit g${fg.g}">궁합 ${fg.g}</span>` : ""}</div>
      ${f ? `<div class="tiny">${esc(j.inc)} · ${esc(j.hours)} · 자본 ${esc(j.cap)}</div><div class="tiny muted">"${esc(j.line)}"</div>` : `<div class="tiny muted">관심 ${it}/100 · 단서: ${esc(j.hint)}</div>${meter(it, 100, "var(--gold)")}`}
      <div class="row wrap" style="margin-top:6px">${btns}${ask}</div></div>`;
  };
  const keys = Object.keys(D.SIDEJOBS).sort((a, b) => (SJ.isActive(S, b) - SJ.isActive(S, a)) || ((SJ.isFound(S, b) ? 1 : 0) - (SJ.isFound(S, a) ? 1 : 0)) || ((D.SIDEJOBS[b].play ? 1 : 0) - (D.SIDEJOBS[a].play ? 1 : 0)) || (S.sj.int[b] || 0) - (S.sj.int[a] || 0));
  const F = { all: () => true, found: (k) => SJ.isFound(S, k), play: (k) => D.SIDEJOBS[k].play };
  return `<div class="card"><h3>투잡 탐색 <small>발견 ${Object.keys(sj.found).length}/21 · 하는 중 ${act.length}/${SJ.slots(S)}</small></h3>
    <div class="small muted">투잡은 정해져 있지 않아요. 너튜브·리포트·세미나, 회사 소문, 그리고 <b class="gold">취미</b>에서 발견해요. 관심이 100이 되면 발견! 두 개까지 할 수 있고, 하나도 안 해도 괜찮아요. 투잡을 시작하면 성향 카드의 숨은 특성이 공개돼요.</div>
    ${act.length ? `<div class="row wrap" style="margin-top:8px">${act.map((k) => `<button class="btn sm gold" data-go="${k}">${ic(D.SIDEJOBS[k].ic)} ${esc(D.SIDEJOBS[k].n)} 보드</button>`).join("")}</div>` : `<div class="tag" style="margin-top:8px">지금은 회사원 · 투잡 없음</div>`}</div>
  ${synCard()}
  <div class="acts" style="padding:0">${actRow("sj_youtube")}${actRow("sj_seminar")}</div>
  <div class="filters">${[["all", "전체 21"], ["found", "발견"], ["play", "지금 플레이 가능"]].map(([k, n]) => `<button class="${ui.sjf === k ? "on" : ""}" data-sjf="${k}">${n}</button>`).join("")}</div>
  <div class="sjgrid">${keys.filter(F[ui.sjf] || F.all).map(card).join("")}</div>`;
}

function synCard() {
  const L = SYN.list(S);
  return `<div class="card"><h3>투잡 궁합 <small>켜진 것 ${L.filter((x) => x.on).length}개</small></h3><div class="small muted" style="margin-bottom:6px">투잡끼리, 취미와 투잡이 서로 돕기도 하고 발목을 잡기도 해요.</div>
    <div class="syn">${L.map((x) => `<div class="${x.kind} ${x.on ? "on" : ""}"><b>${x.kind === "good" ? "＋" : "－"} ${esc(x.n)}</b>${x.on ? '<span class="tag gold">켜짐</span>' : ""}<div class="tiny muted">${esc(x.need)}</div><div class="tiny">${esc(x.desc)}</div></div>`).join("")}</div></div>`;
}
// 인별그램
function pgInsta() {
  const I = S.ins, lv = INS.lvOf(I.f), nx = D.INSTA_LV[lv];
  const h = I.hist.slice(-24); const mx = Math.max(10, ...h);
  return `${boardHead("insta")}<div class="card"><h3>인별그램 <small>${D.INSTA_LV[lv - 1].n} 계정</small></h3>
    <div class="kv"><div><div class="k">팔로워</div><div class="v gold">${I.f.toLocaleString()}</div></div><div><div class="k">참여율</div><div class="v">${(I.eng * 100).toFixed(1)}%</div></div><div><div class="k">협찬 대기</div><div class="v ${I.deals ? "good" : ""}">${I.deals}건</div></div><div><div class="k">협찬 1건</div><div class="v">${won(INS.dealPay(S))}</div></div></div>
    ${nx ? `<div class="tiny muted" style="margin-top:6px">다음 단계 ${nx.n}: 팔로워 ${nx.f.toLocaleString()}명</div>${meter(I.f, nx.f, "var(--pink)")}` : ""}
    ${h.length > 1 ? `<div class="season" style="margin-top:8px">${h.map((v) => `<i style="height:${Math.round(v / mx * 100)}%"></i>`).join("")}</div>` : ""}
    <div class="tiny muted" style="margin-top:6px">한 달이라도 안 올리면 팔로워가 3% 빠져요. 협찬은 팔로워 1천 명부터 들어오고, 공동구매는 1만 명부터 열 수 있어요.</div></div>
  <div class="sec">계정 주제 ${I.niche ? "" : '<span class="bad small">· 먼저 정해 주세요</span>'}</div>
  <div class="pick">${Object.entries(D.INSTA_NICHES).map(([k, n]) => `<button class="${I.niche === k ? "on" : ""}" data-inniche="${k}"><b>${n.n}</b><span class="tiny muted">${n.stat.map((s) => D.STATS[s]).join("·")}이 중요</span>${n.hobby ? `<span class="tiny muted">취미 ${n.hobby.map((x) => D.HOBBIES[x].n).join("·")}면 +20%</span>` : ""}${n.job ? `<span class="tiny muted">${D.SIDEJOBS[n.job].n}을(를) 하면 +25%</span>` : ""}</button>`).join("")}</div>
  <div class="tiny muted">주제를 바꾸면 팔로워 30%가 떠나요.</div>
  <div class="pick" style="margin-top:6px"><button class="${!I.face ? "on" : ""}" data-inface="0"><b>얼굴 없는 계정</b><span class="tiny muted">천천히, 회사 모르게</span></button><button class="${I.face ? "on" : ""}" data-inface="1"><b>얼굴 공개 계정</b><span class="tiny muted">성장 +30% · 팔로워 3천부터 회사 눈치가 쌓여요</span></button></div>
  <div class="acts" style="padding:0;margin-top:8px">${actRow("in_post")}${actRow("in_reel")}${actRow("in_engage")}${actRow("in_deal", undefined, `협찬 콘텐츠 만들기 (${I.deals}건 대기)`)}${actRow("in_gong")}</div>`;
}
// 에어씨앤씨
function pgAirbnb() {
  const A = S.ab, last = A.hist.at(-1) || 0;
  const unit = (u) => { const R = D.AB_REGIONS[u.rk], L = u.last, n = AB.needAp(S, u); return `<div class="room"><div class="body"><div class="row"><div class="grow"><div class="nm">${esc(u.name)}</div><div class="tiny"><span class="tag ${u.reg === "legal" ? "green" : "red"}">${u.reg === "legal" ? (R.city ? "도시민박업(외국인만)" : "농어촌민박 등록") : "미등록(단속 위험)"}</span>${u.banned ? ` <span class="tag red">영업정지 ${u.banned}개월</span>` : ""}</div></div><div style="text-align:right"><div class="gold" style="font-weight:900">★ ${u.rating.toFixed(2)}</div><div class="tiny muted">숙박 ${u.stays}건</div></div></div>
    ${L ? `<div class="kv"><div><div class="k">예약률</div><div class="v">${Math.round(L.occ * 100)}%</div></div><div><div class="k">숙박</div><div class="v">${L.nights}박</div></div><div><div class="k">외국인</div><div class="v">${L.foreign}%</div></div><div><div class="k">지난달 순익</div><div class="v ${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</div></div></div>` : '<div class="tiny muted">다음 달부터 손님이 와요</div>'}
    <div class="row wrap small"><span>월세 ${won(u.rent)} · 사진 ${Math.round(u.photo)}</span><span class="grow"></span><span class="muted">1박</span><div class="stepper"><button data-adr="${u.id}:-1">−</button><b>${u.adr}만</b><button data-adr="${u.id}:1">+</button></div></div>
    <div class="row"><span class="small">관리 <b class="${A.cohost || u.ap >= n ? "good" : "bad"}">${A.cohost ? "코호스트" : `${Math.round(u.ap * 10) / 10}/${n}`}</b></span><span class="grow"></span>${A.cohost ? "" : `<button class="btn sm" data-act="ab_clean" data-arg="${u.id}">청소 ⚡1</button>`}<button class="btn sm" data-act="ab_host" data-arg="${u.id}">응대 ⚡1</button><button class="btn sm" data-act="ab_photo" data-arg="${u.id}">사진 ⚡1</button></div>
    <div class="row"><span class="grow"></span><button class="btn sm danger" data-abclose="${u.id}">정리(보증금 ${won(u.dep)})</button></div></div></div>`; };
  const ls = A.listings.filter((l) => s0(l));
  return `${boardHead("airbnb")}<div class="card"><h3>에어씨앤씨 <small>${A.super ? "★ 슈퍼호스트" : `숙소 ${A.units.length}채`}</small></h3>
    <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${won(last)}</div></div><div><div class="k">외국어</div><div class="v">${Math.round(S.st.lang)}</div></div><div><div class="k">코호스트</div><div class="v">${A.cohost ? "고용 중" : "없음"}</div></div>${A.fx ? `<div><div class="k">환율 급등</div><div class="v good">${A.fx}개월</div></div>` : ""}</div>
    <div class="tiny muted" style="margin-top:6px">파티룸이 '몇 시간'이라면 에어씨앤씨는 '1박'이에요. 서울에서 합법(외국인관광 도시민박업)으로 하면 외국인만 받을 수 있어서 <b class="gold">외국어</b>가 곧 매출이에요. 미등록은 누구나 받지만 이웃 신고로 단속되면 과태료와 영업정지. 별점 4.8 이상·숙박 10건이면 슈퍼호스트(노출 +12%, 요금 +8%).</div></div>
  <div class="acts" style="padding:0">${actRow("ab_search")}${actRow("ab_cohost", undefined, A.cohost ? "코호스트 해지" : "코호스트 고용(매출 20%, 투잡 칸 +1)")}${actRow("study", "lang", "외국어 공부 (스터디카페)")}</div>
  ${A.units.map(unit).join("")}
  ${ls.length ? `<div class="sec">보던 매물</div>${ls.map((l) => { const R = D.AB_REGIONS[l.rk], T = D.AB_TYPES[l.ty]; return `<div class="room"><div class="body"><div class="nm">${esc(R.n)} ${esc(T.n)}</div><div class="small">보증금 ${won(l.dep)} · 월세 <b>${won(l.rent)}</b> · 세팅비 ${won(l.setup)}</div><div class="tiny muted">${l.house ? "주택(등록 가능)" : "오피스텔(등록 불가)"} · 집주인 숙박업 동의 ${l.owner ? "O" : "X"}</div>
      <div class="row wrap" style="margin-top:6px"><button class="btn sm gold" data-abcon="${l.id}:legal" ${l.house && l.owner ? "" : "disabled"}>합법 등록으로 계약</button><button class="btn sm danger" data-abcon="${l.id}:illegal">미등록으로 계약</button></div></div></div>`; }).join("")}` : ""}`;
}
const s0 = () => true;
// 무인카페
function pgUcafe() {
  const U = S.uc, last = U.hist.at(-1) || 0;
  const store = (st) => { const L = st.last, n = UC.needAp(S, st); return `<div class="room"><div class="body"><div class="row"><div class="grow"><div class="nm">${esc(st.name)}</div><div class="tiny"><span class="tag">${st.machine === "buy" ? "머신 구매" : "머신 렌탈"}</span><span class="tag">${st.bean ? "스페셜티" : "가성비 원두"}</span>${st.cctv ? '<span class="tag green">CCTV</span>' : ""}${st.broken ? '<span class="tag red">머신 고장</span>' : ""}</div></div><div style="text-align:right"><div class="gold" style="font-weight:900">★ ${st.rating.toFixed(2)}</div><div class="tiny muted">${st.size}평 · 경쟁 ${st.comp}곳</div></div></div>
    ${L ? `<div class="kv"><div><div class="k">한 달 잔</div><div class="v">${L.cups.toLocaleString()}잔</div></div><div><div class="k">먹튀</div><div class="v ${L.theft > 30 ? "bad" : ""}">${L.theft}잔</div></div><div><div class="k">지난달 순익</div><div class="v ${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</div></div></div>` : '<div class="tiny muted">다음 달부터 기계가 일해요</div>'}
    <div class="row wrap small"><span>월세 ${won(st.rent)}</span><span class="grow"></span><span class="muted">아메리카노</span><div class="stepper"><button data-ucprice="${st.id}:-0.01">−</button><b>${Math.round(st.price * 10000).toLocaleString()}원</b><button data-ucprice="${st.id}:0.01">+</button></div></div>
    <div class="row wrap"><span class="small">점검 <b class="${U.agent || st.ap >= n ? "good" : "bad"}">${U.agent ? "대행" : `${st.ap}/${n}`}</b></span><span class="grow"></span>${U.agent ? "" : `<button class="btn sm" data-act="uc_check" data-arg="${st.id}">점검 ⚡1</button>`}<button class="btn sm" data-act="uc_promo" data-arg="${st.id}">홍보 ⚡1</button><button class="btn sm" data-ucbean="${st.id}">${st.bean ? "가성비로" : "스페셜티로"}</button>${st.cctv ? "" : `<button class="btn sm" data-uccctv="${st.id}">CCTV 80만</button>`}</div>
    <div class="row"><span class="grow"></span><button class="btn sm danger" data-ucclose="${st.id}">양도</button></div></div></div>`; };
  return `${boardHead("ucafe")}<div class="card"><h3>무인카페 <small>${U.stores.length}곳</small></h3>
    <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${won(last)}</div></div><div><div class="k">관리 대행</div><div class="v">${U.agent ? "계약 중" : "없음"}</div></div>${U.beanUp ? `<div><div class="k">원두값 급등</div><div class="v bad">${U.beanUp}개월</div></div>` : ""}</div>
    <div class="tiny muted" style="margin-top:6px">기계가 일하고 나는 새벽에 청소·재고를 채워요. 머신을 사면 처음에 비싸지만 매달 렌탈비가 없고 맛이 조금 더 좋아요. 렌탈은 고장 나도 수리가 공짜예요. 여름 아이스가 성수기, 겨울은 비수기. CCTV가 없으면 먹튀가 3배예요. 한 잔 가격을 올리면 잔 수가 줄어요.</div></div>
  <div class="acts" style="padding:0">${actRow("uc_search")}${actRow("uc_agent", undefined, U.agent ? "관리 대행 해지" : "관리 대행 계약(매장당 월 40만, 투잡 칸 +1)")}</div>
  ${U.stores.map(store).join("")}
  ${U.listings.length ? `<div class="sec">보던 자리</div>${U.listings.map((l) => { const A = D.UC_AREAS[l.ak], qr = UC.quote(S, l, { machine: "rent" }), qb = UC.quote(S, l, { machine: "buy" }); return `<div class="room"><div class="body"><div class="nm">${esc(A.n)} ${l.size}평</div><div class="small">보증금 ${won(l.dep)} · 월세 <b>${won(l.rent)}</b> · 권리금 ${won(l.key)} · 유동인구 ${"●".repeat(Math.round(l.traffic * 3))} · 경쟁 ${l.comp}곳</div>
      <div class="row wrap" style="margin-top:6px"><button class="btn sm" data-uccon="${l.id}:rent">머신 렌탈로 열기 (${won(qr.total)})</button><button class="btn sm gold" data-uccon="${l.id}:buy">머신 사서 열기 (${won(qb.total)})</button></div></div></div>`; }).join("")}` : ""}`;
}
// 대학원
function pgGrad() {
  const G = S.grad; if (!G) return '<div class="card muted">대학원에 다니지 않아요.</div>';
  const g = D.GRADS[G.k], left = Math.max(0, g.months - (S.t - G.t0));
  return `<div class="card"><h3>${esc(g.n)} <small>${G.done ? "졸업" : `${left}개월 남음`}</small></h3><div class="small muted">${esc(g.desc)}</div>
    <div class="kv" style="margin-top:8px"><div><div class="k">수업</div><div class="v">${G.n}/${g.need}</div></div><div><div class="k">등록금</div><div class="v">월 ${won(g.fee)}</div></div><div><div class="k">행동력</div><div class="v">${G.done ? "0" : "−1"}</div></div></div>
    ${meter(G.n, g.need, "var(--blue)")}
    <div class="tiny muted" style="margin-top:6px">${G.done ? "졸업했어요. 학위 효과가 계속 남아요." : `30개월 안에 수업 ${g.need}번을 채우면 졸업이에요. 졸업하면 ${Object.entries(g.done).map(([k, v]) => `${D.STATS[k]} +${v}`).join(", ")}. 모자라면 한 학기씩 늘어나요.`}</div></div>
  ${G.done ? "" : `<div class="acts" style="padding:0">${actRow("grad_class")}</div>`}`;
}
// 취미
const HOBBY_BG = { run: "apt", climb: "gym", book: "library", mentor: "center", photo: "popup", wine: "rooftop", board: "cafe", cook: "home", camp: "apt", band: "pub", travel: "airbnb", tarot: "gallery", flower: "gallery", code: "cowork", write: "cafe" };
function pgHobby() {
  const hb = S.hb, max = SJ.hbMax(S);
  const mine = hb.joined.map((id) => {
    const h = D.HOBBIES[id], lv = SJ.hbLv(S, id), nx = D.HOBBY_LV[lv + 1], ppl = S.spot["hb_" + id] || [], went = hb.lastT[id] === S.t;
    const jobs = h.jobs.map((j) => SJ.isFound(S, j) ? `<b class="good">${esc(D.SIDEJOBS[j].n)}✓</b>` : `${esc(D.SIDEJOBS[j].n)} ${Math.round(S.sj.int[j] || 0)}%`).join(", ");
    return `<div class="spot pl">${placeStage(HOBBY_BG[id] || "cafe", `${esc(h.n)} <span class="tag gold">${D.HOBBY_LV[lv].n}</span>`, ppl, `출석 ${hb.cnt[id] || 0}${nx ? `/${nx.need}` : ""}${ppl.length ? ` · ${ppl.length}명 나옴` : ""}`, "short")}
      <div class="tiny muted">${esc(h.desc)} · 회비 월 ${h.fee}만</div><div class="tiny">발견할 수 있는 투잡: ${jobs}</div>

      <div class="acts">${went ? '<div class="tiny good">이번 달 모임 다녀옴</div>' : actRow("hb_go", id, /모임$/.test(h.n) ? `${h.n} 가기` : `${h.n} 모임 가기`)}<div class="row"><span class="grow tiny muted">출석이 쌓이면 단골 → 고인물 → 운영진 → 모임장. 모임장이 되면 취미를 하나 더 할 수 있어요.${h.jobs.includes("pr") ? " 모임장이 되면 모임이 내 파티룸을 빌려요." : ""}</span><button class="btn sm danger" data-hbleave="${id}">탈퇴</button></div></div></div>`;
  }).join("");
  const others = Object.entries(D.HOBBIES).filter(([k]) => !hb.joined.includes(k));
  return `<div class="card"><h3>취미 <small>${hb.joined.length}/${max}개</small></h3><div class="small muted">취미에서 인연을 만나고, <b class="gold">투잡을 발견</b>하기도 해요. 갈 때마다 멘탈과 능력치가 오르고, 운동 계열은 체력이 붙어요. 회비는 안 가도 나가요.</div></div>
  ${mine || '<div class="card muted small">아직 다니는 취미가 없어요. 아래에서 골라 보세요.</div>'}
  <div class="sec">가입할 수 있는 취미</div>
  <div class="pick">${others.map(([k, h]) => `<button data-hbjoin="${k}" ${hb.joined.length >= max ? "disabled" : ""}><b>${esc(h.n)}</b><span class="tiny muted">월 ${h.fee}만 · ${Object.keys(h.stat).map((s) => `${D.STATS[s]}+`).join(" ") || ""}${h.hpMax ? " 체력+" : ""}</span><span class="tiny muted">투잡 단서: ${h.jobs.map((j) => esc(D.SIDEJOBS[j].n)).join(", ")}</span><span class="tiny muted">회원 ${SJ.members(S, k).length}명</span></button>`).join("")}</div>`;
}

// 가족
function pgFamily() {
  const fam = S.fam, sp = fam.spouse && E.CHAR[fam.spouse];
  return `<div class="card"><h3>가족 <small>행복 ${Math.round(fam.happy)}</small></h3>${meter(fam.happy, 100, "var(--purple)")}
    ${sp ? `<div class="row" style="margin-top:8px"><button data-char="${fam.spouse}" class="fpic">${img(faceSrc(fam.spouse, "blush"))}</button><div class="grow"><b>${esc(sp.name)}</b> <span class="tag pink">${esc(fam.spouseType)}</span><div class="tiny muted">결혼 ${Math.floor((S.t - fam.marriedT) / 12)}년 차 · 배우자 수입 월 ${won(E.spouseIncome(S))}</div></div></div>` : ""}
    <div class="row wrap" style="margin-top:8px">${fam.kids.map((k) => `<span class="tag green">${esc(k.name)} ${Math.floor((S.t - k.born) / 12)}살</span>`).join("")}${fam.pregnant !== null ? `<span class="tag pink">출산 ${fam.pregnant - S.t}개월 뒤</span>` : ""}<span class="tag">부모님 건강 ${Math.round(fam.parents)}</span><span class="tag">${esc(D.HOUSING[S.house.type]?.n || "")}</span></div>
    <div class="tiny muted" style="margin-top:6px">아이는 행동력을 가져간다(0~1세 −3, ~6세 −2, ~12세 −1). 가족 행복이 20 아래로 8개월 가면 이혼.</div></div>
  <div class="acts" style="padding:0">${actRow("family_time")}${fam.kids.length ? actRow("kids_play") : ""}${actRow("visit_parents")}${actRow("house_search")}</div>`;
}

// 사람
function pgPeople() {
  const known = Object.keys(S.rel).filter((id) => E.CHAR[id]);
  const F = { all: () => true, love: (id) => S.rel[id].lover || S.rel[id].spouse || (E.isRomanceable(S, E.CHAR[id]) && S.rel[id].aff >= 45), friend: (id) => S.rel[id].aff >= 45, helper: (id) => E.CHAR[id].helper && E.CHAR[id].helper.effect !== "none", client: (id) => S.rel[id].client || E.CHAR[id].customer };
  const list = known.filter(F[ui.filter] || F.all).sort((a, b) => (S.rel[b].spouse - S.rel[a].spouse) || (S.rel[b].lover - S.rel[a].lover) || S.rel[b].aff - S.rel[a].aff);
  const fam = S.fam;
  return `<div class="card"><h3>관계도 <small>인물도감 ${known.length} / ${CHARS_N} · 이번 판 등장 ${S.cast.length}명</small></h3>
    <div class="small muted">지도에서 사람을 만나 말을 걸면 인연이 돼요. 호감 20·45·70에서 이야기가 열리고, 45 이상이면 투잡을 도와 달라고 부탁할 수 있어요(60 이상이면 확실). 연인은 두 달 넘게 데이트를 안 하면 멀어져요.</div>
    ${fam.spouse || fam.kids.length ? `<div class="row wrap" style="margin-top:8px">${fam.spouse ? `<span class="tag pink">배우자 ${esc(E.CHAR[fam.spouse].name)} · ${esc(fam.spouseType)}</span>` : ""}${fam.kids.map((k) => `<span class="tag green">${esc(k.name)} ${Math.floor((S.t - k.born) / 12)}살</span>`).join("")}<span class="tag">가족 행복 ${Math.round(fam.happy)}</span><span class="tag">부모님 건강 ${Math.round(fam.parents)}</span></div>` : ""}</div>
  <div class="filters">${[["all", "전체"], ["love", "연애"], ["friend", "친한 사이"], ["helper", "조력 가능"], ["client", "손님"]].map(([k, n]) => `<button class="${ui.filter === k ? "on" : ""}" data-filter="${k}">${n}</button>`).join("")}</div>
  ${list.length ? `<div class="pgrid">${list.map(personCard).join("")}</div>` : `<div class="card muted">아직 아는 사람이 없어요. 지도에서 '???'에게 말을 걸어 보세요.</div>`}`;
}

// 나
function pgMe() {
  const f = E.fireInfo(S);
  const h = S.hist.slice(-60);
  const spark = (key, color) => { if (h.length < 2) return ""; const vs = h.map((x) => x[key]); const mn = Math.min(...vs, 0), mx = Math.max(...vs, 1); const pts = vs.map((v, i) => `${(i / (vs.length - 1) * 300).toFixed(1)},${(78 - (v - mn) / (mx - mn) * 74).toFixed(1)}`).join(" "); return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`; };
  const meB = bodySrc("me", myExpr(), "half");
  return `${meB ? `<div class="mestage" style="background-image:url(${bgUrl("home") || ""})">${img(meB, "body", "나")}<div class="cap"><b>${esc(S.me.name)}</b><span>${Math.floor(S.age)}세 · ${esc(S.co.quit || S.co.fired ? "전업 사장님" : `${S.co.name} ${D.RANKS[S.co.rank].n}`)}</span></div></div>` : ""}<div class="card"><h3>파이어 계산 <small>${Math.round(f.ratio * 100)}%</small></h3>${meter(f.ratio, 1, "linear-gradient(90deg,#f5a524,#5fe0a0)")}
    <div class="kv" style="margin-top:8px"><div><div class="k">순자산</div><div class="v gold">${won(f.nw)}</div></div><div><div class="k">목표 순자산${S.fam.spouse ? "(결혼)" : ""}</div><div class="v">${won(f.target)}</div></div><div><div class="k">월 생활비 전체</div><div class="v">${won(f.spend)}</div></div><div><div class="k">기한</div><div class="v">${D.endAge(S.me.gender)}세 · ${Math.max(0, Math.ceil(D.endAge(S.me.gender) - S.age))}년</div></div></div>
    <div class="tiny muted" style="margin-top:6px">순자산이 목표(혼자 20억, 결혼하면 30억)에 닿으면 파이어를 선언할 수 있어요. 매니저가 굴리는 파티룸이나 VOD처럼 저절로 들어오는 사업 수입이 생활비를 넘으면 목표의 60%만 모아도 돼요.</div>
    ${f.ready ? `<button class="btn gold" style="width:100%;margin-top:8px;padding:12px" data-fire>파이어 선언하기 (${Math.floor(S.age)}세)</button>` : ""}${S.fireAt ? `<div class="tag gold" style="margin-top:8px">${S.fireAt}세 파이어 달성 · ${D.endAge(S.me.gender)}세까지 더 달리는 중</div>` : ""}</div>
  <div class="card"><h3>명성·온잡 <small>명성 ${Math.round(S.fame || 0)}/100</small></h3>${meter(S.fame || 0, 100, "var(--purple)")}<div class="tiny muted" style="margin-top:6px">별점 높은 파티룸, 컨설팅 Lv4~5, 인별·너튜브 팔로워가 명성을 올려요. 명성이 높을수록 문의·협찬·강의료가 오르고, 큰 판(가맹·VIP·AI 플랫폼)이 열려요. ${BIG.isFull(S) ? "지금 전업(온잡)이라 명성이 30% 빨리 올라요." : "회사를 나와 전업하면 판이 더 커져요."}</div></div>
  <div class="card"><h3>투자·대출</h3><div class="kv"><div><div class="k">투자(ETF)</div><div class="v">${won(S.invest)}</div></div><div><div class="k">대출 합계</div><div class="v bad">${won(E.debt(S))}</div></div><div><div class="k">월 이자·상환</div><div class="v">${won(Math.round(E.loanPay(S)))}</div></div></div>
    <div class="row wrap" style="margin-top:8px">${[100, 500, 1000].map((v) => `<button class="btn sm" data-inv="${v}">+${won(v)}</button>`).join("")}${[500, 1000].map((v) => `<button class="btn sm" data-inv="-${v}">−${won(v)}</button>`).join("")}<button class="btn sm" data-inv="all">전부 빼기</button></div>
    <div class="tiny muted" style="margin-top:4px">월 평균 +0.55%, 흔들림 큼. 대출: ${S.loans.map((l) => `${l.n} ${won(l.amt)}(${(l.rate * 100).toFixed(1)}%)`).join(", ") || "없음"}</div></div>
  <div class="card"><h3>능력치 <small>최대 200 · ${esc(D.MAJORS[S.me.major]?.n || "")} · ${esc(D.JOBS[S.me.job]?.n || "")}</small></h3><div class="radarbox">${radar([{ v: S.st, c: "#f5c04e" }])}</div>${D.STAT_KEYS.map((k) => `<div class="statrow"><span>${D.STATS[k]}</span>${meter(S.st[k], D.STAT_MAX, k === "body" ? "var(--green)" : "var(--blue)")}<b>${Math.round(S.st[k])}</b></div>`).join("")}
    <div class="tiny muted" style="margin-top:6px">스태미너는 매달 쓰는 기력이에요. 최대 스태미너 = 60 + 체력×0.6(지금 ${S.hpMax}). 행동력 = 4 + 스태미너÷13 + 체력÷50${D.RANKS[S.co.rank].ap ? ` ${D.RANKS[S.co.rank].ap}(직급)` : ""}${E.kidsAp(S) ? ` −${E.kidsAp(S)}(육아)` : ""}${S.co.remote ? " −1(지방 근무)" : ""}. 체력과 감각은 30대 중반부터 조금씩 떨어지니 운동과 구경으로 챙겨 주세요.</div></div>
  <div class="card"><h3>아이템 <small>사면 능력치가 바로 올라요</small></h3><div class="pick">${Object.entries(D.ITEMS).map(([k, it]) => { const own = S.items?.[k] !== undefined; return `<button data-item="${k}" ${own ? "disabled" : ""}><b>${esc(it.n)}</b><span class="tiny muted">${won(it.cash)} · ${Object.entries(it.stat).map(([s, v]) => `${D.STATS[s]} +${v}`).join(", ")}</span>${own ? '<span class="tiny good">갖고 있어요</span>' : ""}</button>`; }).join("")}</div></div>
  <div class="card"><h3>성향 카드 <small>숨은 특성은 그 일을 시작하면 공개</small></h3><div style="display:flex;flex-direction:column;gap:6px">${S.me.traits.map((id) => traitCard(D.TRAITS.find((t) => t.id === id), true)).join("")}</div></div>
  <div class="card"><h3>삶 <small>${esc(D.HOUSING[S.house.type]?.n || "")}${S.house.value ? " · " + won(S.house.value) : ""}</small></h3>
    <div class="acts" style="padding:0">${actRow("house_search")}${actRow("visit_parents")}</div></div>
  <div class="card"><h3>기록 <small>순자산(금색)·투잡 수익(초록)</small></h3><svg class="spark" viewBox="0 0 300 80" preserveAspectRatio="none">${spark("nw", "#f5c04e")}${spark("side", "#5fe0a0")}</svg>
    <div class="logl">${S.log.slice(0, 40).map((l) => `<div><span>${l.age}세 ${l.cal}월</span><span style="color:var(--fg)">${esc(l.text)}</span></div>`).join("")}</div></div>
  <div class="row"><button class="btn sm" data-newlife>이 칸에서 새 인생</button><button class="btn sm" data-toslots>저장 칸으로</button><span class="grow"></span><span class="tiny muted">${SLOT}번 칸 · 자동 저장${ST.isServer() ? "(계정)" : "(이 브라우저)"}</span></div>`;
}

// ───────── 인물 창 ─────────
function charWin(id) {
  const c = E.CHAR[id], x = S.rel[id];
  if (!x) { const res = E.talkTo(S, id); if (!res.ok) return toast([], res.msg); return afterRes(res); }
  const romance = E.isRomanceable(S, c);
  const months = x.lover ? S.t - x.loverSince : 0;
  const here = Object.values(S.spot).some((ids) => ids.includes(id));
  const btn = (k, label, cost, dis) => `<button class="btn" data-pa="${k}" ${dis ? "disabled" : ""}>${label}${cost ? ` <span class="ap">⚡${cost}</span>` : ""}</button>`;
  const hs = c.helper && c.helper.effect !== "none";
  const st = c.stats || {};
  openWin(`<h2>${esc(c.name)} <button class="x" data-close>✕</button></h2>
    <div class="scene">${stageWho(id, exprFor(id), "half", bgUrl(charSpot(id)) || bgUrl("street") || bgUrl("alley")) || ""}<div class="who"><div class="pic" ${BODY[id] ? 'style="display:none"' : ""}>${img(faceSrc(id, exprFor(id)))}</div><div class="grow"><div><b>${esc(c.job)}</b> · ${c.age + Math.floor(S.t / 12)}세</div><div class="tagline">${esc(c.tagline || "")}</div>
    <div class="row wrap" style="margin-top:4px">${(c.personality || []).map((p) => `<span class="tag">${esc(p)}</span>`).join("")}${romance ? `<span class="tag pink">연애 가능</span>` : ""}${hs ? `<span class="tag green">${esc(c.helper.role)}</span>` : ""}${c.customer ? `<span class="tag blue">${c.customer.board === "partyroom" ? "파티룸 손님" : "컨설팅 손님"}</span>` : ""}${x.spouse ? `<span class="tag pink">배우자</span>` : x.lover ? `<span class="tag pink">연인 ${months}개월</span>` : ""}${x.helper ? `<span class="tag gold">조력 중</span>` : ""}</div>
    <div class="tiny muted" style="margin-top:4px">좋아함: ${(c.likes || []).map(esc).join(", ")}</div></div></div>
    <div class="small">호감도 <b>${Math.round(x.aff)}</b> ${here ? "· 지금 지도에 있음" : ""}</div>${meter(x.aff, 100, "var(--pink)")}
    <div class="tiny muted" style="margin:2px 0 8px">20 친해짐 · 45 속이야기·조력 · 70 ${romance ? "고백 가능" : "평생 친구"} · 85 프러포즈(연인 8개월)</div>
    ${hs ? `<div class="tiny muted">조력 효과: ${esc(HELP_DESC[c.helper.effect] || "")} · 수고비 월 ${E.helperPay(S, id)}만 · 능력 ${Math.round(st[E.helperStat(c)] || 50)}</div>` : ""}
    <div class="row wrap" style="margin-top:10px">
      ${here ? btn("talk", "말 걸기", 1) : ""}${x.aff >= 15 ? btn("meetup", "약속 잡기(4만)", 1) : ""}
      ${btn("gift10", "선물 10만", 0)}${btn("gift30", "선물 30만", 0)}
      ${x.lover || x.spouse ? btn("date", "데이트(10만)", 1) + btn("trip", "여행(80만)", 3) : ""}
      ${romance && !x.lover && !x.spouse && x.aff >= 70 && !S.fam.spouse ? btn("confess", "고백하기", 1) : ""}
      ${x.lover && months >= 8 && x.aff >= 85 ? btn("propose", "프러포즈(반지 300만)", 2) : ""}
      ${hs ? btn("helper", x.helper ? "조력 그만 부탁" : "투잡 도와 달라고 부탁", 0) : ""}
      ${x.lover ? btn("breakup", "헤어지기", 0) : ""}
    </div></div>`, (el) => el.querySelectorAll("[data-pa]").forEach((b) => b.onclick = () => {
    const k = b.dataset.pa; let res;
    if (k === "talk") res = E.talkTo(S, id);
    else if (k.startsWith("gift")) res = E.personAct(S, id, "gift", +k.slice(4));
    else res = E.personAct(S, id, k);
    if (!res.ok) return toast([], res.msg);
    closeWin(); afterRes(res);
  }));
}
const HELP_DESC = { pr_clean: "파티룸 청소·관리(청소비 −30%, 관리 행동력 −)", pr_interior: "인테리어(비용 −12%, 별점 +)", pr_photo: "사진 촬영(예약 +6%)", pr_realty: "매물 정보(매물 +1, 숨은 정보 1개 공개)", pr_landlord: "자기 건물 매물(건물주 환영·권리금 0)", pr_repair: "수리(파손 비용 −50%)", cs_coach: "공동 코치(매달 고객 3명 자동 처리, 수익 40% 나눔)", cs_hr: "인사담당자 정보(합격률 +8%p)", cs_headhunter: "경력 이직 고객 소개", cs_design: "썸네일·상세페이지(크멍·인별 +30%)", cs_video: "영상 편집(너튜브 +50%)", cs_lecture: "강의 섭외", cs_writer: "블로그 글 대행(+30%)", tax: "세무(종합소득세 −20%)", invest: "재테크 조언(투자 수익 +)", health: "운동 코치(체력 회복 +3)", mental: "마음 상담(멘탈 회복 +3)" };

// ───────── 장면 창 ─────────
function showScene() {
  const sc = S.pending; if (!sc) return;
  FX.play(sc.kind === "wedding" ? "win" : "scene");
  const who = sc.who && E.CHAR[sc.who];
  const expr = sc.kind === "meet" ? "neutral" : sc.kind === "wedding" ? "blush" : sc.kind === "arc" ? (sc.stage === 3 ? "blush" : "smile") : "neutral";
  openWin(`<div class="scene"><h2>${esc(sc.title)}${sc.tag ? ` <span class="tag gold">${esc(sc.tag)}</span>` : ""}</h2>
    ${who ? stageWho(sc.who, expr, "full", sceneBg(sc), `<b>${esc(who.name)}</b><span>${esc(who.job)}</span>`) ?? `<div class="who"><div class="pic">${img(faceSrc(sc.who, expr))}</div><div><b>${esc(who.name)}</b><div class="tagline">${esc(who.job)} · ${esc(who.tagline || "")}</div></div></div>` : ""}
    <div class="txt">${esc(sc.text)}</div>
    <div class="choices">${sc.choices.map((c, i) => `<button data-ch="${i}"><span>${esc(c.t)}</span>${c.pct != null ? `<span class="pct">${D.STATS[c.check.stat]} ${c.pct}%</span>` : ""}</button>`).join("")}</div></div>`, (el) => el.querySelectorAll("[data-ch]").forEach((b) => b.onclick = () => {
    const res = E.choose(S, +b.dataset.ch); save(); FX.play(res.ok === false ? "bad" : "ok");
    if (sc.kind === "story" && !res.lines.length && !res.text) { closeWin(); return continueChain(); }
    openWin(`<div class="scene"><h2>${esc(sc.title)}</h2>${who ? stageWho(sc.who, res.ok === false ? "sad" : sc.kind === "wedding" || sc.kind === "arc" ? "blush" : "smile", "half", sceneBg(sc)) ?? `<div class="who"><div class="pic">${img(faceSrc(sc.who, res.ok === false ? "sad" : "smile"))}</div></div>` : ""}
      <div class="result">${res.check ? `<div class="${res.ok ? "ok" : "ng"}">${esc(res.check)}</div>` : ""}<div class="txt">${esc(res.text || "")}</div>${res.lines.length ? `<div class="effs">${res.lines.map((l) => `<span>${esc(l)}</span>`).join("")}</div>` : ""}</div>
      <button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-ok>확인</button></div>`, (el2) => el2.querySelector("[data-ok]").onclick = () => { closeWin(); continueChain(); });
  }), true);
}
function continueChain() {
  render();
  if (S.pending) return showScene();
  const nx = E.nextQueuedScene(S); if (nx) return showScene();
  if (S.over || S.ended) render();
}

// ───────── 다음 달 ─────────
function endMonthFlow(force) {
  if (S.pending) return showScene();
  if (!force && S.ap > 0) return openWin(`<h2>행동력이 ${S.ap} 남았어요 <button class="x" data-close>✕</button></h2><div class="small muted">남은 행동력은 다음 달로 넘어가지 않아요. 쉬기라도 하면 스태미너가 차요.</div><div class="todo" style="margin-top:10px">${E.todos(S).slice(0, 4).map((t) => `<button class="l${t.lv}" disabled><span class="dot"></span><span class="grow">${esc(t.text)}</span></button>`).join("")}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>더 하기</button><button class="btn gold grow" data-force>그래도 넘기기</button></div>`, (el) => el.querySelector("[data-force]").onclick = () => { closeWin(); endMonthFlow(true); });
  const prevYM = E.ymLabel(S);
  const rc = E.endMonth(S); if (!rc) return;
  const inc = Object.entries(rc.inc).filter(([, v]) => Math.round(v)), exp = Object.entries(rc.exp).filter(([, v]) => Math.round(v));
  const ti = inc.reduce((a, [, v]) => a + v, 0), te = exp.reduce((a, [, v]) => a + v, 0);
  S.lastNet = Math.round(ti - te); save(true); FX.play(ti - te >= 0 ? "coin" : "month");
  openWin(`<div class="receipt"><h4>${esc(prevYM)} 영수증</h4><div class="tiny" style="text-align:center;margin-bottom:6px">${esc(S.me.name)} · ${esc(S.co.quit || S.co.fired ? "전업" : S.co.name)}</div>
    ${inc.map(([k, v]) => `<div class="dl"><span>${esc(k)}</span><span class="in">+${won(v)}</span></div>`).join("")}
    ${exp.map(([k, v]) => `<div class="dl"><span>${esc(k)}</span><span class="out">−${won(v)}</span></div>`).join("")}
    <div class="tot"><span>이번 달</span><span class="${ti - te >= 0 ? "in" : "out"}">${ti - te >= 0 ? "+" : "−"}${won(Math.abs(ti - te))}</span></div>
    <div class="dl"><span>투잡 순수익</span><span>${won(rc.side)}</span></div><div class="dl"><span>잔고</span><span>${won(rc.cash)}</span></div></div>
    ${rc.notes.length ? `<div class="notes">${rc.notes.map((n) => `<div>${esc(n)}</div>`).join("")}</div>` : ""}
    <button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-ok>${S.sceneQ.length ? `다음 (사건 ${S.sceneQ.length})` : "다음 달 시작"}</button>`, (el) => el.querySelector("[data-ok]").onclick = () => { closeWin(); continueChain(); toast([`행동력 ${S.apMax}`, `스태미너 ${Math.round(S.hp)}`], `${S.year}년 ${S.cal}월`); }, true);
}

// ───────── 설정 ─────────
// 효과음·진동·글자 크기 + 저장 백업 코드(앱을 지우면 기기 저장이 사라지므로) + 버전·개인정보
const B64 = { en: (s) => btoa(unescape(encodeURIComponent(s))), de: (s) => decodeURIComponent(escape(atob(s.replace(/\s+/g, "")))) };
function settingsWin(slots) {
  const g = FX.get(), sw = (k, n, d) => `<button class="setrow" data-tg="${k}"><span class="grow"><b>${n}</b><span class="tiny muted">${d}</span></span><span class="tgl ${g[k] ? "on" : ""}"><i></i></span></button>`;
  const empty = slots?.find((x) => x.empty);
  openWin(`<h2>설정 <button class="x" data-close>✕</button></h2>
    ${sw("sound", "효과음", "누를 때·돈 들어올 때 짧은 소리")}${sw("vib", "진동", "안드로이드 폰에서만 울려요")}${sw("big", "큰 글씨", "화면 전체를 조금 크게")}
    <div class="card" style="margin-top:10px"><h3>저장 백업</h3><div class="tiny muted" style="margin-bottom:6px">로그인하지 않으면 이 기기에만 저장돼요. 앱을 지우기 전에 코드를 복사해 두면 다시 불러올 수 있어요.</div>
      ${S ? `<button class="btn sm" data-bkcopy>지금 인생 코드 복사</button>` : ""}
      ${!S && slots ? (empty ? `<textarea data-bkin rows="3" placeholder="백업 코드를 붙여 넣으세요" style="width:100%;margin-top:6px;font-size:11px;background:#0b0d1a;color:#dfe3ff;border:1px solid #2a2e55;border-radius:8px;padding:6px"></textarea><button class="btn sm gold" data-bkload style="margin-top:6px">${empty.slot}번 칸으로 불러오기</button>` : `<div class="tiny muted">불러오려면 빈 칸이 하나 있어야 해요.</div>`) : ""}
      ${!S && !slots ? `<div class="tiny muted">시작 화면의 설정에서 불러올 수 있어요.</div>` : ""}</div>
    <div class="tiny muted" style="margin-top:10px;text-align:center">After 6PM v${FX.VERSION} · <a href="privacy.html" target="_blank" rel="noopener" style="color:inherit">개인정보 처리방침</a></div>`, (el) => {
    el.querySelectorAll("[data-tg]").forEach((b) => b.onclick = () => { const k = b.dataset.tg; FX.put(k, !FX.get()[k]); if (FX.get()[k]) FX.play("ok"); settingsWin(slots); });
    const cp = el.querySelector("[data-bkcopy]"); if (cp) cp.onclick = async () => { const code = B64.en(E.save(S)); try { await navigator.clipboard.writeText(code); toast([], "백업 코드를 복사했어요. 메모장 같은 곳에 붙여 두세요"); } catch (e) { const ta = document.createElement("textarea"); ta.value = code; ta.rows = 3; ta.style.width = "100%"; cp.after(ta); ta.select(); toast([], "길게 눌러 복사해 주세요"); } };
    const ld = el.querySelector("[data-bkload]"); if (ld) ld.onclick = async () => {
      let s = null; try { s = E.load(B64.de(el.querySelector("[data-bkin]").value.trim())); } catch (e) { s = null; }
      if (!s || !s.me) return toast([], "코드가 맞지 않아요. 처음부터 끝까지 다 붙여 넣었는지 확인해 주세요");
      SLOT = empty.slot; S = s; closeWin(); save(true); artPreload([S.me.avatar, ...Object.keys(S.rel), ...(S.cast || [])].filter(Boolean)); toast([], `${empty.slot}번 칸으로 불러왔어요`); render();
    };
  });
}

// ───────── 창 공통 ─────────
function openWin(html, onBind, lock, center) {
  $modal.innerHTML = `<div class="bg ${center ? "center" : ""}" ${lock ? "" : "data-bgclose"}><div class="win">${html}</div></div>`;
  const bg = $modal.querySelector(".bg");
  bg.addEventListener("click", (e) => { if (e.target === bg && !lock) closeWin(); });
  $modal.querySelectorAll("[data-close]").forEach((b) => b.onclick = closeWin);
  onBind && onBind($modal);
}
function closeWin() { $modal.innerHTML = ""; }

// ───────── 클릭 연결 ─────────
function bind() {
  const q = (sel, fn) => $app.querySelectorAll(sel).forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); fn(el, e); }));
  q("[data-go]", (el) => { const k = el.dataset.go; if (!unlocked(k)) return toast([], `🔒 ${PAGE_N[k]}: ${TILE[k]?.lock || "아직 잠겨 있어요"}`); go(k); });
  q("[data-hub]", () => openHub());
  q("[data-back]", () => goBack());
  q("[data-money]", () => moneyWin());
  q("[data-apinfo]", () => apWin());
  q("[data-coach]", () => { S.coachOff = 1; save(); render(); });
  q("[data-swipe]", (el) => step(+el.dataset.swipe));
  q("[data-sjstart]", (el) => { const k = el.dataset.sjstart, j = D.SIDEJOBS[k]; openWin(`<h2>${esc(j.n)} 시작할까? <button class="x" data-close>✕</button></h2><div class="small" style="line-height:1.8">· 수익: ${esc(j.inc)}<br>· 시간: ${esc(j.hours)} · 시작 자본 ${esc(j.cap)}<br>· 궁합: ${SJ.fit(S, k).g} (${j.fit.map((x) => D.STATS[x]).join("·")})<br>· 회사에 들키면 경고 → 감봉 → 해고. ${k === "cs" ? "실명으로 하면 더 잘 들킨다." : "지점이 늘수록 눈치가 쌓인다."}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>조금 더 고민</button><button class="btn gold grow" data-yes>시작하기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = SJ.start(S, k); closeWin(); toast([], r.msg); save(); if (r.ok) { go(k); if (r.hid?.length) openWin(`<h2>숨은 특성 공개 <button class="x" data-close>✕</button></h2><div class="small muted">${esc(j.n)}을(를) 시작하니 내 성향이 이렇게 드러나요.</div><div class="intro" style="margin-top:8px">${r.hid.map((x) => `<p>★ ${esc(x)}</p>`).join("")}</div><button class="btn gold" style="width:100%;margin-top:10px" data-close>확인</button>`, null, false, true); } else render(); }); });
  q("[data-sjstop]", (el) => openWin(`<h2>${esc(D.SIDEJOBS[el.dataset.sjstop].n)} 접을까? <button class="x" data-close>✕</button></h2><div class="small">쌓은 후기·능력치는 남는다. 다시 시작할 수 있다.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>접기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = SJ.stop(S, el.dataset.sjstop); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-sjf]", (el) => { ui.sjf = el.dataset.sjf; render(); });
  q("[data-hbjoin]", (el) => { const r = SJ.hbJoin(S, el.dataset.hbjoin); toast([], r.msg); save(); render(); });
  q("[data-hbleave]", (el) => { const r = SJ.hbLeave(S, el.dataset.hbleave); toast([], r.msg); save(); render(); });
  q("[data-act]", (el) => { if (el.dataset.why) return toast([], el.dataset.why); doAct(el.dataset.act, el.dataset.arg); });
  q("[data-end]", () => endMonthFlow(false));
  q("[data-region]", (el) => { ui.region = el.dataset.region || null; render(); window.scrollTo(0, 0); });
  q("[data-char]", (el) => charWin(el.dataset.char));
  q("[data-todo]", (el) => { const g = el.dataset.todo; if (g.startsWith("people:")) return charWin(g.slice(7)); if (["pr", "cs", "sj", "hobby", "family", "co", "insta", "grad", "airbnb", "ucafe"].includes(g)) { ui.prFlow = null; return go(g); } if (D.SPOTS[g]) { if (D.SPOTS[g].region === "company") return go("co"); ui.page = "map"; ui.region = D.SPOTS[g].region; } else if (g === "parents") { ui.page = "map"; ui.region = "parents"; } render(); window.scrollTo(0, 0); });
  q("[data-prflow]", (el) => { const v = el.dataset.prflow; if (!v) ui.prFlow = null; else if (v === "district") ui.prFlow = { step: "district", dk: ui.prFlow?.dk }; else if (v.startsWith("list:")) ui.prFlow = { step: "list", dk: v.slice(5) }; else if (v.startsWith("contract:")) ui.prFlow = { step: "contract", id: v.slice(9) }; ui.page = "pr"; render(); });
  q("[data-dk]", (el) => { ui.prFlow.dk = el.dataset.dk; render(); });
  q("[data-cc]", (el) => { ui.prFlow.concept = el.dataset.cc; render(); });
  q("[data-it]", (el) => { ui.prFlow.interior = +el.dataset.it; render(); });
  q("[data-self]", () => { ui.prFlow.self = !ui.prFlow.self; render(); });
  q("[data-ondol]", () => { ui.prFlow.ondol = !ui.prFlow.ondol; render(); });
  q("[data-sign]", (el) => { const f = ui.prFlow; const r = PR.contract(S, el.dataset.sign, { concept: f.concept, interior: f.interior, self: !!f.self, ondol: !!f.ondol }); toast([], r.msg); if (r.ok) ui.prFlow = null; save(); render(); });
  q("[data-price]", (el) => { const [id, d] = el.dataset.price.split(":"); const rm = S.pr.rooms.find((x) => x.id === id); PR.setPrice(S, id, rm.price + +d); save(); render(); });
  q("[data-sys]", (el) => { const r = PR.buySystem(S, el.dataset.sys); toast([], r.msg); save(); render(); });
  q("[data-close-room]", (el) => openWin(`<h2>지점 양도 <button class="x" data-close>✕</button></h2><div class="small">보증금과 권리금(별점·수익이 좋을수록 비싸요)을 받고 넘겨요. 지금 시세 ${won(PR.resale(S, S.pr.rooms.find((x) => x.id === el.dataset.closeRoom)))}. 제안이 오면 더 받을 수도 있어요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-yes>양도하기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = PR.closeRoom(S, el.dataset.closeRoom); closeWin(); toast([], r.msg); save(); render(); }));
  $app.querySelectorAll("[data-concept]").forEach((el) => el.addEventListener("change", () => { const r = PR.setConcept(S, el.dataset.concept, el.value); if (r.ok) toast([], r.msg); save(); render(); }));
  q("[data-niche]", (el) => { const r = CS.setNiche(S, el.dataset.niche); toast([], r.msg || ""); save(); render(); });
  q("[data-nick]", (el) => { const r = CS.setNick(S, el.dataset.nick); toast([], r.msg); save(); render(); });
  q("[data-cprice]", (el) => { const r = CS.setPrice(S, el.dataset.cprice); toast([], r.msg); save(); render(); });
  $app.querySelectorAll("[data-ads]").forEach((el) => el.addEventListener("change", () => { CS.setAds(S, +el.value); save(); render(); }));
  q("[data-quit]", () => openWin(`<h2>정말 퇴사할까? <button class="x" data-close>✕</button></h2><div class="small">${E.quitReady(S).ok ? "환승 조건을 채웠다. 행동력 +5, 월급은 끊긴다." : "조건을 못 채웠다. 대표님 철학: 선퇴사 금지. 그래도?"}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-yes>사직서 제출</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = E.quitCompany(S); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-filter]", (el) => { ui.filter = el.dataset.filter; render(); });
  q("[data-inv]", (el) => { const v = el.dataset.inv; if (v === "all") { S.cash += S.invest; S.invest = 0; } else { const n = +v; if (n > 0 && S.cash >= n) { S.cash -= n; S.invest += n; } else if (n < 0) { const m = Math.min(S.invest, -n); S.invest -= m; S.cash += m; } else return toast([], "현금이 부족합니다"); } save(); render(); });
  q("[data-inniche]", (el) => { const r = INS.setNiche(S, el.dataset.inniche); toast([], r.msg || ""); save(); render(); });
  q("[data-inface]", (el) => { const r = INS.setFace(S, el.dataset.inface === "1"); toast([], r.msg); save(); render(); });
  q("[data-uccon]", (el) => { const [id, m] = el.dataset.uccon.split(":"); const r = UC.contract(S, id, { machine: m, bean: 0 }); toast([], r.msg); save(); render(); });
  q("[data-ucprice]", (el) => { const [id, d] = el.dataset.ucprice.split(":"); const st = S.uc.stores.find((x) => x.id === id); UC.setPrice(S, id, st.price + +d); save(); render(); });
  q("[data-ucbean]", (el) => { const st = S.uc.stores.find((x) => x.id === el.dataset.ucbean); UC.setBean(S, st.id, !st.bean); toast([], st.bean ? "스페셜티 원두: 맛·별점 +, 원가 +" : "가성비 원두: 원가 −"); save(); render(); });
  q("[data-uccctv]", (el) => { const r = UC.buyCctv(S, el.dataset.uccctv); toast([], r.msg); save(); render(); });
  q("[data-ucclose]", (el) => openWin(`<h2>매장을 넘길까요? <button class="x" data-close>✕</button></h2><div class="small">보증금, 머신 중고값, 최근 수익에 맞는 권리금을 받고 넘겨요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>양도</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = UC.close(S, el.dataset.ucclose); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-abcon]", (el) => { const [id, reg] = el.dataset.abcon.split(":"); const r = AB.contract(S, id, reg); toast([], r.msg); save(); render(); });
  q("[data-abclose]", (el) => openWin(`<h2>숙소를 정리할까요? <button class="x" data-close>✕</button></h2><div class="small">보증금만 돌려받아요. 세팅비는 못 돌려받아요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>정리</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = AB.close(S, el.dataset.abclose); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-adr]", (el) => { const [id, d] = el.dataset.adr.split(":"); const u = S.ab.units.find((x) => x.id === id); AB.setAdr(S, id, u.adr + +d); save(); render(); });
  q("[data-peak]", (el) => { const r = PR.setPeak(S, +el.dataset.peak); toast([], r.msg); save(); render(); });
  q("[data-decor]", (el) => { const rm = S.pr.rooms.find((x) => x.id === el.dataset.decor); ui.prFlow = { step: "decor", id: rm.id, picks: { ...rm.decor } }; render(); window.scrollTo(0, 0); });
  q("[data-dpick]", (el) => { const [k, i] = el.dataset.dpick.split(":"); ui.prFlow.picks[k] = +i; render(); });
  q("[data-decorgo]", () => { const f = ui.prFlow, rm = S.pr.rooms.find((x) => x.id === f.id); const ch = Object.fromEntries(Object.entries(f.picks).filter(([k, i]) => rm.decor?.[k] !== i)); if (!Object.keys(ch).length) return toast([], "바뀐 게 없어요"); const res = E.act(S, "pr_decor", JSON.stringify({ id: f.id, picks: ch })); if (!res.ok) return toast([], res.msg); ui.prFlow = null; afterRes(res); });
  q("[data-item]", (el) => { const r = E.buyItem(S, el.dataset.item); toast(r.lines || [], r.msg); save(); render(); });
  q("[data-qlock]", (el) => toast([], `🔒 ${el.dataset.qlock} 열려요`));
  q("[data-toslots]", () => { save(true); S = null; renderTitle(); });
  q("[data-fire]", () => openWin(`<h2>파이어 달성! <button class="x" data-close>✕</button></h2><div class="small">순자산 ${won(E.fireInfo(S).nw)}. 지금 은퇴할 수도 있고, ${D.endAge(S.me.gender)}세까지 더 달려서 명예의 전당을 노릴 수도 있어요. 기록에는 ${Math.floor(S.age)}세 파이어가 남아요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-keep>계속 달린다</button><button class="btn gold grow" data-yes>지금 은퇴</button></div>`, (w) => { w.querySelector("[data-yes]").onclick = () => { closeWin(); E.declareFire(S, false); save(true); render(); }; w.querySelector("[data-keep]").onclick = () => { closeWin(); E.declareFire(S, true); save(true); toast([], `${S.fireAt}세 파이어 기록! 계속 달려요`); render(); }; }));
  q("[data-newlife]", () => openWin(`<h2>이 칸에서 새 인생을 시작할까요? <button class="x" data-close>✕</button></h2><div class="small">지금 ${SLOT}번 칸의 인생은 지워져요. 다른 칸에서 시작하려면 '저장 칸으로' 버튼을 눌러 주세요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-yes>새 인생</button></div>`, (w) => w.querySelector("[data-yes]").onclick = async () => { closeWin(); S = null; await ST.remove(SLOT); ui.wiz = null; startWizard(SLOT); }));
}

// ───────── 능력치 도형(능력치 수만큼 꼭짓점) ─────────
function radar(layers, size = 240) {
  const K = D.STAT_KEYS, n = K.length, cx = size / 2, cy = size / 2 + 4, R = size / 2 - 34;
  const top = Math.max(...layers.flatMap((l) => K.map((k) => l.v[k] || 0)), 40);
  const scale = Math.min(D.STAT_MAX, Math.ceil(top / 20) * 20);
  const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2, rr = R * Math.min(1, v / scale); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  const poly = (f) => K.map((k, i) => pt(i, f(k)).map((x) => x.toFixed(1)).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((q) => `<polygon points="${poly(() => scale * q)}" fill="none" stroke="#ffffff22"/>`).join("");
  const axes = K.map((k, i) => { const [x, y] = pt(i, scale); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#ffffff1a"/>`; }).join("");
  const last = layers[layers.length - 1].v;
  const labels = K.map((k, i) => { const [x, y] = pt(i, scale * 1.22); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#cfd2ea">${D.STATS[k]} <tspan fill="#f5c04e" font-weight="700">${Math.round(last[k] || 0)}</tspan></text>`; }).join("");
  const shapes = layers.map((l) => `<polygon points="${poly((k) => l.v[k] || 0)}" fill="${l.c}${l.fill ?? "33"}" stroke="${l.c}" stroke-width="2"/>`).join("");
  return `<svg class="radar" viewBox="0 0 ${size} ${size + 8}" width="100%" style="max-width:${size + 40}px">${rings}${axes}${shapes}${labels}<text x="${size - 4}" y="${size + 4}" text-anchor="end" font-size="9" fill="#8a8fb5">눈금 0~${scale}</text></svg>`;
}
const LAYER = { base: "#8a8fb5", now: "#f5c04e" };
function diffChips(a, b) { return D.STAT_KEYS.filter((k) => Math.round(b[k]) !== Math.round(a[k])).map((k) => { const d = Math.round(b[k] - a[k]); return `<span class="${d > 0 ? "p" : "m"}">${D.STATS[k]} ${d > 0 ? "+" : ""}${d}</span>`; }).join(""); }

// ───────── 시작 화면: 아이디별 저장 칸 3개 ─────────
async function renderTitle() {
  const slots = await ST.list(), u = ST.who(), m = meta(), hall = await ST.hallList();
  const empty = slots.find((x) => x.empty);
  $app.innerHTML = `<div class="title"><div class="px small gold">TJLAB GAME · v4 시험판</div><h1>After <span>6</span>PM</h1><div class="sub">파이어족을 꿈꾸는 퇴근 후 사장님</div>
    <div class="desc">우리는 막 취업했거나 어느 정도 자리를 잡은 1~3년 차 직장인의 삶을 살게 됩니다. 회사를 열심히 다닐 수도, 투잡을 할 수도, 취미를 즐길 수도, 연애와 결혼을 할 수도 있습니다. 우리의 목표는 순자산 20억으로 파이어. 남자는 27세에 시작해 50세까지, 여자는 25세에 시작해 48세까지 똑같이 23년이에요. 한번 재미지게 살아 보십시다!</div>
    <div class="small ${u ? "gold" : "muted"}" style="margin-bottom:6px">${u ? `${esc(u.nick || u.id)}님의 저장 칸` : "로그인하지 않으면 이 브라우저에 저장돼요"}</div>
    <div class="slots">${slots.map((sl) => sl.empty
      ? `<button class="slot empty" data-snew="${sl.slot}"><b>${sl.slot}번 칸</b><span>비어 있어요 · 여기서 새 인생 시작</span></button>`
      : `<div class="slot"><button class="grow" data-sload="${sl.slot}"><b>${sl.slot}번 칸 · ${esc(sl.summary?.name || "")}</b><span>${sl.summary?.end ? "끝난 인생 · " : ""}${sl.summary?.age ?? "?"}세 · ${esc(sl.summary?.ym || "")} · 순자산 ${won(sl.summary?.nw || 0)}</span><span class="tiny muted">${esc(sl.summary?.job || "")}${sl.summary?.side ? " · 투잡 " + esc(sl.summary.side) : ""}</span></button><button class="btn sm danger" data-sdel="${sl.slot}">지우기</button></div>`).join("")}</div>
    <div class="btns" style="margin-top:8px"><button class="btn gold" data-new>새 인생 시작</button><button class="btn" data-install ${APP.canInstall() ? "" : "hidden"}>앱으로 설치</button><button class="btn" data-set>설정</button></div>
    ${APP.isIOS() ? `<div class="tiny muted" style="margin-top:4px">아이폰: 공유 버튼 → '홈 화면에 추가'로 앱처럼 쓸 수 있어요.</div>` : ""}
    <div class="tiny muted" style="margin-top:6px">한 아이디에 인생 3개까지 저장돼요. 세 칸이 다 차면 한 칸을 지우고 시작합니다.</div>
    ${m.runs?.length ? `<div class="card" style="margin-top:10px;text-align:center"><div class="small">다음 인생은 <b class="gold">${ngNext(m)}회차</b> · 기억 포인트 <b class="gold">${ngPoints(m)}</b> · 최고 파이어 ${m.best ? m.best + "세" : "아직"}</div>${ngCollection(m)}</div>` : ""}
    ${(hall || m.hall || []).length ? `<div class="card" style="margin-top:10px"><h3>명예의 전당 <small>${hall ? "전체 회원" : "내 기록"}</small></h3>${hallList(hall || m.hall)}</div>` : ""}</div>`;
  const pick = (n) => startWizard(n);
  $app.querySelector("[data-set]").onclick = () => settingsWin(slots);
  const ib = $app.querySelector("[data-install]"); if (ib) ib.onclick = async () => { if (await APP.install()) toast([], "설치했어요! 홈 화면에서 열어 보세요"); ib.hidden = true; };
  $app.querySelector("[data-new]").onclick = () => empty ? pick(empty.slot) : openWin(`<h2>칸이 다 찼어요 <button class="x" data-close>✕</button></h2><div class="small muted">지울 인생을 하나 골라 주세요. 지운 인생은 되돌릴 수 없어요.</div><div class="pick" style="margin-top:10px">${slots.map((sl) => `<button data-swipeout="${sl.slot}"><b>${sl.slot}번 · ${esc(sl.summary?.name || "")}</b><span class="tiny muted">${sl.summary?.age ?? "?"}세 · 순자산 ${won(sl.summary?.nw || 0)}</span></button>`).join("")}</div>`, (w) => w.querySelectorAll("[data-swipeout]").forEach((b) => b.onclick = async () => { const n = +b.dataset.swipeout; closeWin(); await ST.remove(n); pick(n); }));
  $app.querySelectorAll("[data-snew]").forEach((b) => b.onclick = () => pick(+b.dataset.snew));
  $app.querySelectorAll("[data-sload]").forEach((b) => b.onclick = async () => {
    const n = +b.dataset.sload; let s = null;
    try { const t = await ST.load(n); s = t ? E.load(t) : null; } catch (e) { s = null; }
    if (!s) return toast([], "이 칸을 불러오지 못했어요");
    SLOT = n; S = s; artPreload([S.me.avatar, ...Object.keys(S.rel), ...(S.cast || [])].filter(Boolean)); if (u?.nick) S.me.name = u.nick; render();
  });
  $app.querySelectorAll("[data-sdel]").forEach((b) => b.onclick = () => { const n = +b.dataset.sdel; openWin(`<h2>${n}번 칸을 지울까요? <button class="x" data-close>✕</button></h2><div class="small muted">지운 인생은 되돌릴 수 없어요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>지우기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = async () => { closeWin(); await ST.remove(n); renderTitle(); }); });
}

function hallList(h) { return `<div class="hall">${(h || []).map((x, i) => `<div><b>${i + 1}</b><span class="grow">${esc(x.name)} · ${esc(x.path)}${x.full ? " · 전업" : ""}</span><span>${x.fireAt ? `${x.fireAt}세 파이어` : `${x.age}세`}</span><b class="gold">${won(x.nw)}</b></div>`).join("") || '<div class="muted small">아직 없어요</div>'}</div>`; }
// ───────── 새 인생 만들기: 나 → 능력치 룰렛 → 전공 → 회사·직무 → 성향 카드 ─────────
const WSTEPS = ["나", "능력치", "전공", "회사·직무", "성향"];
// ───────── N회차(회귀) ─────────
// 인생을 끝낼 때마다 '기억 포인트'를 받고, 다음 인생을 시작할 때 선물로 바꾼다. 안 쓴 포인트는 남는다.
const GIFTS = [
  { id: "cash", n: "비상금", d: "시작 자금 +300만", cost: 1, max: 3 },
  { id: "roll", n: "전생의 감", d: "능력치 룰렛 +1번", cost: 2, max: 2 },
  { id: "tr", n: "카드 감각", d: "성향 카드 다시 뽑기 +2번", cost: 1, max: 2 },
  { id: "stat", n: "몸이 기억해", d: "모든 능력치 +3", cost: 3, max: 2 },
  { id: "know", n: "해 본 투잡", d: "지난 인생에서 발견한 투잡을 발견한 채로 시작", cost: 2, max: 2, need: (m) => (m.knownJobs || []).length > 0 },
  { id: "friend", n: "다시 만난 인연", d: "지난 인생에서 가까웠던 사람과 아는 사이로 시작(호감 30)", cost: 2, max: 2, need: (m) => (m.pastFriends || []).length > 0 },
];
const ENDINGS = [
  ["fire40", "40세 전 파이어"], ["fire", "파이어"], ["keepgo", "파이어 뒤에도 달린 인생"], ["full", "전업으로 끝까지"],
  ["family", "결혼하고 파이어"], ["agefail", "결산까지 버틴 인생"], ["bankrupt", "개인회생"], ["burnout", "번아웃"], ["hard", "어려움 모드 파이어"],
];
const ngNext = (m) => (m.runs?.length || 0) + 1;
function ngPoints(m) { return m.ngPts || 0; }
function ngSpent(w) { return Object.entries(w.gifts || {}).reduce((a, [k, v]) => a + (GIFTS.find((g) => g.id === k)?.cost || 0) * (Array.isArray(v) ? v.length : v), 0); }
function ngCollection(m) {
  const playable = Object.values(D.SIDEJOBS).filter((j) => j.play).length;
  return `<div class="chips" style="justify-content:center;margin-top:6px"><span class="chip">엔딩 도감 ${(m.endings || []).length}/${ENDINGS.length}</span><span class="chip">만난 인연 ${(m.metAll || []).length}/${Object.keys(E.CHAR).length}</span><span class="chip">발견한 투잡 ${(m.knownJobs || []).length}/${playable}</span></div>`;
}
function renderGift() {
  const w = ui.wiz, m = meta(), pts = ngPoints(m), left = pts - ngSpent(w), n = ngNext(m);
  const g = w.gifts;
  const cnt = (id) => Array.isArray(g[id]) ? g[id].length : (g[id] || 0);
  const row = (x) => {
    const ok = !x.need || x.need(m), c = cnt(x.id), canAdd = ok && c < x.max && left >= x.cost;
    let extra = "";
    if (x.id === "know" && ok) extra = `<div class="chips">${m.knownJobs.filter((j) => D.SIDEJOBS[j]).map((j) => `<button class="chip ${(g.know || []).includes(j) ? "on" : ""}" data-gknow="${j}">${esc(D.SIDEJOBS[j].n)}</button>`).join("")}</div>`;
    if (x.id === "friend" && ok) extra = `<div class="chips">${m.pastFriends.filter((id) => E.CHAR[id]).slice(0, 10).map((id) => `<button class="chip ${(g.friend || []).includes(id) ? "on" : ""}" data-gfr="${id}">${esc(E.CHAR[id].name)} · ${esc(E.CHAR[id].job.split("(")[0])}</button>`).join("")}</div>`;
    const btns = x.id === "know" || x.id === "friend" ? "" : `<div class="row"><button class="btn sm" data-gm="${x.id}" ${c ? "" : "disabled"}>－</button><b style="min-width:2em;text-align:center">${c}</b><button class="btn sm gold" data-gp="${x.id}" ${canAdd ? "" : "disabled"}>＋</button></div>`;
    return `<div class="card gift ${ok ? "" : "lock"}"><div class="row"><div class="grow"><b>${esc(x.n)}</b> <span class="tag gold">${x.cost}점</span><div class="small muted">${esc(x.d)} · 최대 ${x.max}번${ok ? "" : " · 지난 인생 기록이 있어야 열려요"}</div></div>${btns}</div>${extra}</div>`;
  };
  const hardOk = (m.runs?.length || 0) >= 2;
  return `<h2>${n}회차 인생</h2><div class="small muted">지난 인생에서 얻은 <b class="gold">기억 포인트</b>로 선물을 골라요. 안 쓴 포인트는 다음 회차로 넘어가요.</div>
    <div class="card" style="text-align:center"><div class="tiny muted">남은 기억 포인트</div><div class="gold" style="font-size:26px;font-weight:900">${left} / ${pts}</div></div>
    ${GIFTS.map(row).join("")}
    <div class="card gift ${hardOk ? "" : "lock"}"><div class="row"><div class="grow"><b>어려움 모드</b> <span class="tag red">3회차부터</span><div class="small muted">연말 평가가 더 짜고 파이어 목표가 25% 높아요. 대신 끝날 때 기억 포인트가 2배예요.</div></div><button class="btn sm ${w.hard ? "gold" : ""}" data-ghard ${hardOk ? "" : "disabled"}>${w.hard ? "켜짐" : "꺼짐"}</button></div></div>
    ${ngCollection(m)}`;
}
function ngGiftsToStart(w) {
  const g = w.gifts || {};
  return { n: ngNext(meta()), hard: !!w.hard, cash: (g.cash || 0) * 300, statUp: (g.stat || 0) * 3, know: g.know || [], friends: g.friend || [], gifts: Object.keys(g).filter((k) => (Array.isArray(g[k]) ? g[k].length : g[k])) };
}
function ngEndRecord(m, f) {
  // 이번 인생에서 받은 기억 포인트와 도감
  const got = [];
  const add = (p, why) => got.push([p, why]);
  add(1, "인생 하나를 끝까지 살았다");
  if (S.fireAt) add(2, `${S.fireAt}세 파이어`);
  if (f.nw >= 100000) add(1, "순자산 10억");
  if (f.nw >= 300000) add(1, "순자산 30억");
  if (S.fam.spouse) add(1, "결혼");
  if (Object.keys(S.rel).length >= 25) add(1, "인연 25명");
  const ends = [];
  if (S.fireAt && S.fireAt < 40) ends.push("fire40");
  if (S.fireAt) ends.push("fire");
  if (S.fireAt && S.ended === "age") ends.push("keepgo");
  if (BIG.isFull(S) && !S.over) ends.push("full");
  if (S.fireAt && S.fam.spouse) ends.push("family");
  if (!S.fireAt && S.ended === "age") ends.push("agefail");
  if (S.over === "bankrupt") ends.push("bankrupt");
  if (S.over === "burnout") ends.push("burnout");
  if (S.fireAt && S.ng?.hard) ends.push("hard");
  const newEnds = ends.filter((e) => !(m.endings || []).includes(e));
  if (newEnds.length) add(newEnds.length, "새 엔딩 " + newEnds.map((e) => ENDINGS.find((x) => x[0] === e)[1]).join("·"));
  let pts = got.reduce((a, b) => a + b[0], 0);
  if (S.ng?.hard) { got.push([pts, "어려움 모드 2배"]); pts *= 2; }
  m.ngPts = (m.ngPts || 0) + pts;
  m.endings = [...new Set([...(m.endings || []), ...ends])];
  m.metAll = [...new Set([...(m.metAll || []), ...Object.keys(S.rel)])];
  m.knownJobs = [...new Set([...(m.knownJobs || []), ...Object.keys(S.sj.found).filter((j) => D.SIDEJOBS[j]?.play)])];
  const close = Object.entries(S.rel).filter(([, x]) => x.spouse || x.lover || x.aff >= 50).sort((a, b) => (b[1].spouse ? 999 : b[1].aff) - (a[1].spouse ? 999 : a[1].aff)).map(([id]) => id);
  m.pastFriends = [...new Set([...close, ...(m.pastFriends || [])])].slice(0, 12);
  S.ngGot = { pts, got, newEnds };
}
function startWizard(slot) {
  SLOT = slot || SLOT || 1; S = null;
  const u = ST.who();
  ui.wiz = { step: 1, gender: "M", name: u?.nick || "", age: 27, look: randomLook(Math.random, "M"), rolls: [], pick: -1, major: null, company: "big", companyName: D.COMPANY_TYPES.big.names[0], job: null, pool: drawPool([]), traits: [], reroll: 2, undo: 1, prevPool: null, gifts: {}, hard: false };
  if ((meta().runs?.length || 0) > 0) ui.wiz.step = 0;
  renderWiz();
}
function drawPool(not) { return shuffle(D.TRAITS.map((t) => t.id).filter((x) => !not.includes(x))).slice(0, 4); }
function wizStats(w, upto) {
  const base = w.rolls[w.pick] || {};
  return E.startStats(base, { major: upto >= 3 ? w.major : null, company: upto >= 4 ? w.company : null, job: upto >= 4 ? w.job : null, traits: upto >= 5 ? w.traits : [] });
}
function traitCard(t, inGame) {
  if (!t) return "";
  const domN = (d) => (d === "co" ? "회사" : D.SIDEJOBS[d]?.n || d);
  const hid = inGame
    ? t.hid.map((h) => S.me.revealed?.[h.d] !== undefined ? `<div class="hon">★ ${esc(domN(h.d))} · ${esc(h.t)}</div>` : `<div class="hoff">🔒 ${esc(domN(h.d))}${h.d === "co" ? "에서 첫 평가를 받으면" : D.SIDEJOBS[h.d]?.play ? "을(를) 시작하면" : " (다음 업데이트)"} 공개</div>`).join("")
    : `<div class="hoff">숨은 특성 4개 · 단서: ${t.hint.map(esc).join(" · ")}</div>`;
  return `<div class="trait"><div class="tn">${esc(t.n)} <span class="tag">${esc(t.g)}</span></div><div class="muted">“${esc(t.line)}”</div><div class="pro">＋ ${esc(t.pro)}</div><div class="con">－ ${esc(t.con)}</div>${hid}</div>`;
}
function renderWiz() {
  const w = ui.wiz, u = ST.who();
  const prog = w.step === 0 ? "" : `<div class="wsteps">${WSTEPS.map((n, i) => `<span class="${i + 1 === w.step ? "on" : i + 1 < w.step ? "done" : ""}">${i + 1}. ${n}</span>`).join("")}</div>`;
  let body = "", canNext = true;
  const rollMax = 2 + ((w.gifts || {}).roll || 0);
  if (w.step === 0) {
    body = renderGift();
  } else if (w.step === 1) {
    const avs = AVATARS(w.gender); if (w.avatar === undefined && avs.length) w.avatar = avs[0]; if (w.avatar && !w.avatar.startsWith("p" + w.gender)) w.avatar = avs[0] || null;
    const pw = () => { try { return portraitDataURL(w.look, w.gender, "smile", 5); } catch (e) { return ""; } };
    let src = bodyOr(w.avatar, "smile", "half", pw) ?? artOr(w.avatar, "smile", pw);
    body = `<h2>나는 누구일까요</h2><div class="small muted">성별과 나이, 얼굴을 정해 주세요. 능력치는 다음 단계에서 룰렛으로 정해요.</div>
      <div class="seg"><button class="${w.gender === "M" ? "on" : ""}" data-g="M">남자 · 50세까지</button><button class="${w.gender === "F" ? "on" : ""}" data-g="F">여자 · 48세까지</button></div>
      ${u?.nick ? `<div class="card small">닉네임 <b class="gold">${esc(u.nick)}</b>(으)로 살아요. 닉네임은 사이트 계정에서 바꿀 수 있어요.</div>` : `<input placeholder="이름 (비우면 '나')" value="${esc(w.name)}" data-name maxlength="8">`}
      <div class="seg">${(w.gender === "F" ? [25, 26, 27] : [27, 28, 29]).map((a, i) => `<button class="${w.age === a ? "on" : ""}" data-age="${a}">${a}세 · ${i + 1}년 차</button>`).join("")}</div>
      <div class="tiny muted">나이가 많을수록 돈과 경력은 조금 더 있지만, 파이어까지 남은 시간은 줄어요. (${w.gender === "F" ? 48 : 50}세까지 ${(w.gender === "F" ? 48 : 50) - w.age}년)</div>
      <div class="avatar"><div class="pic">${img(src)}</div><div class="grow">${avs.length ? `<div class="small muted">마음에 드는 얼굴을 골라요.</div><div class="avpick">${avs.map((k) => `<button class="${w.avatar === k ? "on" : ""}" data-av="${k}">${img(bodyOr(k, "neutral", "face", () => artOr(k, "neutral", () => "")) ?? artOr(k, "neutral", () => ""))}</button>`).join("")}<button class="${!w.avatar ? "on" : ""}" data-av="">도트</button></div>` : `<div class="small muted">얼굴은 판마다 달라져요.</div>`}${!w.avatar ? `<button class="btn" data-reroll-look style="margin-top:8px">다른 도트 얼굴</button>` : ""}</div></div>`;
  } else if (w.step === 2) {
    const cur = w.rolls[w.pick];
    canNext = !!cur;
    body = `<h2>타고난 능력치 룰렛</h2><div class="small muted">룰렛은 ${rollMax === 2 ? "두 번" : rollMax + "번"}까지 돌릴 수 있어요${rollMax > 2 ? " (전생의 감)" : ""}. 마지막 결과가 마음에 안 들면 무르기로 앞 결과로 돌아갈 수 있어요. 능력치는 최대 200까지 키울 수 있고, 처음에는 다들 낮게 시작해요.</div>
      <div class="radarbox" data-radar>${radar([{ v: cur || Object.fromEntries(D.STAT_KEYS.map((k) => [k, 0])), c: LAYER.now }])}</div>
      <div class="row">${w.rolls.length < rollMax ? `<button class="btn gold grow" data-roll>${!w.rolls.length ? "룰렛 돌리기" : w.rolls.length === rollMax - 1 ? "한 번 더 돌리기 (마지막)" : `한 번 더 돌리기 (${rollMax - w.rolls.length}번 남음)`}</button>` : ""}</div>
      ${w.rolls.length >= 2 && w.rolls.length >= rollMax ? `<div class="row" style="flex-wrap:wrap">${w.rolls.map((r0, i) => i === w.pick ? "" : `<button class="btn grow" data-rpick="${i}">${i < w.pick ? "무르기: " : "다시 "}${i + 1}번째 결과로 (합 ${Object.values(r0).reduce((a, b) => a + b, 0)})</button>`).join("")}</div><div class="tiny muted">지금 쓰는 결과: ${w.pick + 1}번째 · 합 ${Object.values(w.rolls[w.pick]).reduce((a, b) => a + b, 0)}</div>` : ""}`;
  } else if (w.step === 3) {
    const prev = wizStats(w, 2), now = wizStats(w, 3);
    canNext = !!w.major;
    const grp = (g) => `<div class="sec">${g}</div><div class="pick">${Object.entries(D.MAJORS).filter(([, m]) => m.g === g).map(([k, m]) => `<button class="${w.major === k ? "on" : ""}" data-major="${k}"><b>${m.n}</b><span class="tiny muted">${Object.entries(m.stat).map(([s, v]) => `${D.STATS[s]} +${v}`).join(", ")}</span></button>`).join("")}</div>`;
    body = `<h2>전공</h2><div class="small muted">전공에 따라 능력치가 조금 바뀌고, 나중에 고를 직무와 궁합이 생겨요. 겉으로 안 보이는 영향도 조금 있어요.</div>
      <div class="radarbox">${radar([{ v: prev, c: LAYER.base, fill: "22" }, { v: now, c: LAYER.now }])}</div><div class="chips" style="justify-content:center">${diffChips(prev, now)}</div>
      ${grp("문과")}${grp("이공")}${grp("예체")}`;
  } else if (w.step === 4) {
    const kind = D.COMPANY_TYPES[w.company].kind;
    if (w.job && !D.JOBS[w.job].co.includes(kind)) w.job = null;
    const prev = wizStats(w, 3), now = wizStats(w, 4);
    canNext = !!w.job;
    body = `<h2>첫 회사와 직무</h2><div class="small muted">회사는 능력치를 아주 조금 바꾸고, 직무는 그보다 조금 더 바꿔요. 전공과 잘 맞는 직무를 고르면 가점, 너무 먼 직무면 감점이 있어요.</div>
      <div class="radarbox">${radar([{ v: prev, c: LAYER.base, fill: "22" }, { v: now, c: LAYER.now }])}</div><div class="chips" style="justify-content:center">${diffChips(prev, now)}</div>
      <div class="sec">회사</div><div class="pick">${Object.entries(D.COMPANY_TYPES).map(([k, c]) => `<button class="${w.company === k ? "on" : ""}" data-co="${k}"><b>${c.n}</b><span class="tiny muted">월급 ${c.pay}만 · 겸업 눈치 ×${c.eye}</span><span class="tiny muted">최고 ${D.RANKS[c.top].n}까지 · 구조조정 ${c.layoff >= 1.5 ? "잦음" : c.layoff <= 0.2 ? "거의 없음" : "보통"}</span></button>`).join("")}</div>
      <select class="btn" data-coname style="width:100%">${D.COMPANY_TYPES[w.company].names.map((n) => `<option ${w.companyName === n ? "selected" : ""}>${n}</option>`).join("")}</select>
      <div class="sec">직무 ${kind === "fin" ? "· 금융권" : kind === "pub" ? "· 공기업" : ""}</div><div class="pick">${Object.entries(D.JOBS).filter(([, j]) => j.co.includes(kind)).map(([k, j]) => { const f = E.jobFit(w.major, k); return `<button class="${w.job === k ? "on" : ""}" data-job="${k}"><b>${j.n}</b><span class="tiny muted">${Object.entries(j.stat).map(([s, v]) => `${D.STATS[s]} +${v}`).join(", ")}</span>${f > 0 ? '<span class="tiny good">전공과 잘 맞아요 · 능력치 1.5배</span>' : f < 0 ? '<span class="tiny bad">전공과 거리가 멀어요 · 능력치 절반, 커리어 −3</span>' : ""}</button>`; }).join("")}</div>`;
  } else {
    const prev = wizStats(w, 4), now = wizStats(w, 5);
    canNext = w.traits.length === 2;
    body = `<h2>성향 카드</h2><div class="small">총 30장의 성향 카드 중 4장이 무작위로 나오고, 이 중 2장을 고를 수 있어요. 다시 뽑기는 2번, 무르기(바로 전 4장으로 돌아가기)는 1번 할 수 있어요.</div>
      <div class="small muted">카드 앞면에는 역량만 보여요. 카드마다 회사·투잡에서 드러나는 <b class="gold">숨은 특성이 4개</b>씩 있고, 그 일을 시작하면 하나씩 공개돼요. 단서 단어로 짐작해 보세요.</div>
      <div class="radarbox">${radar([{ v: prev, c: LAYER.base, fill: "22" }, { v: now, c: LAYER.now }])}</div>
      <div class="tcards">${w.pool.map((id) => `<button class="${w.traits.includes(id) ? "on" : ""}" data-tr="${id}">${traitCard(D.TRAITS.find((t) => t.id === id))}</button>`).join("")}</div>
      <div class="row"><button class="btn grow" data-reroll-tr ${w.reroll ? "" : "disabled"}>다시 뽑기 (${w.reroll}번 남음)</button><button class="btn grow" data-undo-tr ${w.undo && w.prevPool ? "" : "disabled"}>무르기 (${w.undo}번 남음)</button></div>`;
  }
  $app.innerHTML = `<div class="wiz">${prog}${body}<div class="row"><button class="btn" data-back>${w.step === 0 || (w.step === 1 && !((meta().runs?.length || 0) > 0)) ? "처음으로" : "이전"}</button><span class="grow"></span><button class="btn gold" data-nextw ${canNext ? "" : "disabled"}>${w.step === 5 ? "인생 시작" : w.step === 0 ? "이 선물로 시작" : "다음"}</button></div></div>`;
  const q = (sel, fn) => $app.querySelectorAll(sel).forEach((el) => el.onclick = () => fn(el));
  q("[data-g]", (el) => { w.gender = el.dataset.g; w.look = randomLook(Math.random, w.gender); w.age = w.gender === "F" ? 25 : 27; renderWiz(); });
  q("[data-age]", (el) => { w.age = +el.dataset.age; renderWiz(); });
  q("[data-av]", (el) => { w.avatar = el.dataset.av || null; renderWiz(); });
  q("[data-reroll-look]", () => { w.look = randomLook(Math.random, w.gender); renderWiz(); });
  const nm = $app.querySelector("[data-name]"); if (nm) nm.oninput = () => (w.name = nm.value.trim());
  q("[data-roll]", (el) => {
    el.disabled = true; const box = $app.querySelector("[data-radar]"); let f = 0;
    const final = E.rollStats(Math.random);
    const tick = () => { f++; if (f < 14) { box.innerHTML = radar([{ v: E.rollStats(Math.random), c: LAYER.now }]); setTimeout(tick, 55 + f * 6); } else { w.rolls.push(final); w.pick = w.rolls.length - 1; renderWiz(); } };
    tick();
  });
  q("[data-rpick]", (el) => { w.pick = +el.dataset.rpick; renderWiz(); });
  q("[data-major]", (el) => { w.major = el.dataset.major; renderWiz(); });
  q("[data-co]", (el) => { w.company = el.dataset.co; w.companyName = D.COMPANY_TYPES[w.company].names[0]; renderWiz(); });
  q("[data-job]", (el) => { w.job = el.dataset.job; renderWiz(); });
  const cn = $app.querySelector("[data-coname]"); if (cn) cn.onchange = () => (w.companyName = cn.value);
  q("[data-tr]", (el) => { const id = el.dataset.tr; if (w.traits.includes(id)) w.traits = w.traits.filter((x) => x !== id); else if (w.traits.length < 2) w.traits.push(id); renderWiz(); });
  q("[data-reroll-tr]", () => { if (!w.reroll) return; w.reroll--; w.prevPool = w.pool; w.pool = drawPool(w.pool); w.traits = []; renderWiz(); });
  q("[data-undo-tr]", () => { if (!w.undo || !w.prevPool) return; w.undo--; w.pool = w.prevPool; w.prevPool = null; w.traits = []; renderWiz(); });
  q("[data-gp]", (el) => { const x = GIFTS.find((g) => g.id === el.dataset.gp); w.gifts[x.id] = (w.gifts[x.id] || 0) + 1; renderWiz(); });
  q("[data-gm]", (el) => { const id = el.dataset.gm; w.gifts[id] = Math.max(0, (w.gifts[id] || 0) - 1); renderWiz(); });
  const togg = (key, v, cost, max) => { const a = w.gifts[key] || []; if (a.includes(v)) w.gifts[key] = a.filter((x) => x !== v); else if (a.length < max && ngPoints(meta()) - ngSpent(w) >= cost) w.gifts[key] = a.concat(v); else toast([], "포인트가 모자라거나 최대 개수예요"); renderWiz(); };
  q("[data-gknow]", (el) => togg("know", el.dataset.gknow, 2, 2));
  q("[data-gfr]", (el) => togg("friend", el.dataset.gfr, 2, 2));
  q("[data-ghard]", () => { w.hard = !w.hard; renderWiz(); });
  q("[data-back]", () => { if (w.step === 0 || (w.step === 1 && !((meta().runs?.length || 0) > 0))) { ui.wiz = null; renderTitle(); } else { w.step--; renderWiz(); } });
  q("[data-nextw]", () => {
    if (w.step === 0) { w.reroll = 2 + (w.gifts.tr || 0) * 2; }
    if (w.step < 5) { w.step++; window.scrollTo(0, 0); return renderWiz(); }
    const m = meta();
    S = E.newGame({ seed: String(Date.now()), gender: w.gender, name: u?.nick || w.name || "나", age: w.age, look: w.look, base: w.rolls[w.pick], major: w.major, company: w.company, companyName: w.companyName, job: w.job, traits: w.traits, ng: ngGiftsToStart(w) });
    S.me.avatar = w.avatar || null; artPreload([S.me.avatar, ...(S.cast || [])].filter(Boolean));
    { const sp = ngSpent(w); if (sp) { m.ngPts = Math.max(0, (m.ngPts || 0) - sp); setMeta(m); } }
    ui.page = "home"; save(true); render();
    showIntro();
  });
}
function showIntro() {
  const ea = D.endAge(S.me.gender);
  openWin(`<h2>${Math.floor(S.age)}세 ${S.cal}월, 퇴근 후 인생이 시작됩니다 <button class="x" data-close>✕</button></h2><div class="intro">
    <p><b class="gold">행동력</b> 매달 행동력이 생겨요. 행동력은 스태미너에서 나오고, 스태미너는 <b>체력</b>이 높을수록 커져요. 운동과 취미로 체력을 키워 두면 나중에 편합니다.</p>
    <p><b>스태미너</b> 행동을 하면 줄고, 많이 쓰면 다음 달 행동력도 줄어요. 지치면 쉬어 가세요.</p>
    <p><b>지도</b> 장소를 고르면 할 수 있는 일과 그곳 사람들이 보여요. '???'에게 말을 걸면 인연이 됩니다.</p>
    <p><b>길 찾기</b> 아래 탭(홈·지도·사람들·투잡·나)으로 다니고, 회사·취미·투잡 화면은 오른쪽 위 <b>전체 메뉴</b>에 다 있어요. 왼쪽 위 <b>뒤로</b>는 방금 본 화면으로 가요.</p>
    <p><b>회사</b> 평가는 해마다 1월, 대부분 B예요. 연봉은 천천히 오르고, 지방 발령이나 구조조정 같은 일도 생겨요. 임원까지 갈 수도 있지만 쉽지 않아요.</p>
    <p><b>투잡</b> 정해진 투잡은 없어요. 회사 소문, 너튜브, 취미에서 발견하고 두 개까지 할 수 있어요. 안 해도 괜찮아요. 투잡을 시작하면 성향 카드의 숨은 특성이 공개돼요.</p>
    <p><b class="gold">목표</b> ${ea}세까지 순자산 20억. 결혼하면 30억으로 올라가요. 파산하거나 번아웃이 세 번 오면 그 인생은 끝나요.</p></div>
    <button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-close>시작하기</button>`, null, false, true);
}

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ───────── 엔딩 ─────────
function renderEnding() {
  const f = E.fireInfo(S), m = meta();
  const age = Math.floor(S.age);
  const kind = S.over ? "over" : S.ended;
  if (!S.recorded) {
    FX.play(S.over ? "bad" : "win");
    m.runs = m.runs || []; m.runs.push({ age, kind, nw: Math.round(f.nw), t: Date.now(), fireAt: S.fireAt || null });
    if (S.fireAt && (!m.best || S.fireAt < m.best)) m.best = S.fireAt;
    ngEndRecord(m, f);
    const rec = { name: S.me.name, nw: Math.round(f.nw), fireAt: S.fireAt || null, age, path: S.sj.active.map((k) => D.SIDEJOBS[k].n).join("·") || "회사원", full: BIG.isFull(S), t: Date.now() };
    m.hall = (m.hall || []).concat(rec).sort((a, b) => b.nw - a.nw).slice(0, 10); S.hallRank = m.hall.indexOf(rec) + 1;
    ST.hallSubmit(rec);
    setMeta(m); S.recorded = true; save();
  }
  const title = kind === "fire" ? `${age}세 파이어` : kind === "age" ? (S.fireAt ? `${S.fireAt}세 파이어 · ${D.endAge(S.me.gender)}세 결산` : `${D.endAge(S.me.gender)}세 결산 · 파이어 실패`) : kind === "over" && S.over === "bankrupt" ? "개인회생" : "번아웃";
  $app.innerHTML = `<div class="ending"><div class="px gold">THE END · ${esc(S.me.name)}의 인생</div><div class="big">${esc(title)}</div>
    <div class="card"><div class="kv"><div><div class="k">순자산</div><div class="v gold">${won(f.nw)}</div></div><div><div class="k">파티룸</div><div class="v">${S.pr.rooms.length}곳 · Lv${S.pr.lv}</div></div><div><div class="k">컨설팅</div><div class="v">Lv${S.cs.lv} · 합격 ${S.cs.passes}</div></div><div><div class="k">인연</div><div class="v">${Object.keys(S.rel).length}명</div></div></div></div>
    <div class="card"><h3>그 뒤의 이야기</h3><div class="small" style="line-height:1.8">${epilogue().map(esc).join("<br>")}</div></div>
    ${S.hallRank ? `<div class="card"><h3>명예의 전당 ${S.hallRank}위 등록!</h3>${hallList(m.hall)}</div>` : ""}
    <div class="card"><h3>기억 포인트 +${S.ngGot?.pts || 0} <small>다음은 ${ngNext(m)}회차 · 모은 포인트 ${ngPoints(m)}</small></h3><div class="small">${(S.ngGot?.got || []).map(([p, why]) => `+${p} ${esc(why)}`).join("<br>")}</div>${S.ngGot?.newEnds?.length ? `<div class="small gold" style="margin-top:6px">새 엔딩을 도감에 올렸어요!</div>` : ""}${ngCollection(m)}<div class="tiny muted" style="margin-top:6px">지금까지 ${m.runs.length}판 · 최고 파이어 ${m.best ? m.best + "세" : "아직 없음"}</div></div>
    <button class="btn gold" style="padding:14px" data-again>이 칸에서 ${ngNext(m)}회차 인생</button><button class="btn" style="padding:12px" data-slots>저장 칸으로</button></div>`;
  $app.querySelector("[data-again]").onclick = () => { S = null; startWizard(SLOT); };
  $app.querySelector("[data-slots]").onclick = () => { ST.flush(); S = null; renderTitle(); };
}
function epilogue() {
  const L = [], sp = S.fam.spouse && E.CHAR[S.fam.spouse];
  if (S.ended === "fire") L.push(`${Math.floor(S.age)}세 봄, 마지막 출근을 했다. 아니, 처음으로 출근하지 않는 아침이 왔다.`);
  if (S.over === "bankrupt") L.push("법원 서류를 정리하며 생각했다. 입지가 아니라 욕심이 문제였다.");
  if (S.over === "burnout") L.push("몸이 먼저 멈췄다. 다음 인생에서는 쉬는 것도 일정에 넣기로 했다.");
  if (sp) L.push(`${jo(sp.name, "과", "와")}는 ${Math.floor((S.t - S.fam.marriedT) / 12)}년을 함께했다. ${S.fam.happy >= 60 ? "주말 아침 커피는 여전히 둘이 마신다." : "대화가 줄었지만, 아직 같은 집에 산다."}`);
  else L.push("결혼은 하지 않았다. 대신 오래 볼 친구들이 생겼다.");
  for (const k of S.fam.kids) L.push(`${jo(k.name, "은", "는")} ${Math.floor((S.t - k.born) / 12) + 20}살에 독립했다. ${S.cs.passes > 30 ? "자소서는 내가 봐 줬다." : "첫 월급으로 내복을 사 왔다."}`);
  if (S.pr.rooms.length) L.push(`파티룸 ${S.pr.rooms.length}곳은 ${S.pr.sys.manager ? "매니저가 맡아 지금도 돌아간다" : "하나씩 양도하고 마지막 한 곳만 남겼다"}.`);
  if (S.cs.lv >= 3) L.push(`취업컨설팅으로 ${S.cs.passes}명이 합격했다. 가끔 "선생님 덕분에" 하는 연락이 온다.`);
  L.push(S.ended === "fire" ? "70세, 손주 돌잔치를 내가 만든 파티룸에서 했다." : "60세, 은퇴식에서 후배에게 말했다. \"퇴근 후 두 시간이 인생을 바꿔.\"");
  return L;
}

// ───────── 자동 시험(#auto) ─────────
function autoTest(n) {
  S = E.newGame({ seed: "auto", gender: "F", name: "시험", major: "sw", company: "fin", job: "dfin", traits: ["insider", "cfo"], look: randomLook(Math.random, "F") });
  SJ.hbJoin(S, "wine"); SJ.hbJoin(S, "book"); S.sj.open = true; SJ.found(S, "pr"); SJ.found(S, "cs"); SJ.found(S, "insta"); SJ.start(S, "pr"); if (location.hash.includes("ucf")) { SJ.found(S, "ucafe"); SJ.start(S, "ucafe"); UC.search(S, E.R(S), "apt"); UC.contract(S, S.uc.listings[0].id, { machine: "buy" }); UC.search(S, E.R(S), "academy"); } if (location.hash.includes("abnb")) { SJ.found(S, "airbnb"); SJ.start(S, "airbnb"); S.st.lang = 55; for (const rk of ["hongdae", "jongno"]) { AB.search(S, E.R(S), rk); const L = S.ab.listings.find((l) => l.rk === rk && l.house && l.owner) || S.ab.listings.find((l) => l.rk === rk); AB.contract(S, L.id, L.house && L.owner ? "legal" : "illegal"); } AB.search(S, E.R(S), "jeju"); } if (location.hash.includes("ins")) { SJ.start(S, "insta"); INS.setNiche(S, "space"); INS.setFace(S, true); S.ins.f = 4200; } else SJ.start(S, "cs"); if (location.hash.includes("grad")) { S.grad = { k: "mba", t0: 0, n: 0, done: false }; } S.cash += 20000;
  if (location.hash.includes("rooms")) for (const dk of ["univ", "under", "office", "hot"]) { S.ap = 99; S.hp = S.hpMax; E.act(S, "pr_search", dk); while (S.pending) E.choose(S, 0); const L = S.pr.listings.find((l) => l.dk === dk); if (L) { const c = Object.keys(D.CONCEPTS).filter((k) => !PR.conceptOk(L, k)).sort((x, y) => (D.DISTRICTS[dk].fit[y] || 0) - (D.DISTRICTS[dk].fit[x] || 0))[0]; PR.contract(S, L.id, { concept: c, interior: 1 }); } S.pr.sys.cleanContract = true; }
  for (let m = 0; m < n && !S.over && !S.ended; m++) {
    let g = 0;
    while (S.ap > 0 && g++ < 30) {
      const ids = Object.keys(D.ACTIONS).filter((id) => !D.ACTIONS[id].pick && !E.canAct(S, id, defaultArg(id)));
      if (!ids.length) break;
      const id = ids[(m * 7 + g * 3) % ids.length]; const r = E.act(S, id, defaultArg(id)); while (S.pending) E.choose(S, 0);
      const sp = Object.values(S.spot).flat()[g % 5]; if (sp) { E.talkTo(S, sp); while (S.pending) E.choose(S, 0); }
      if (!S.cs.niche) { CS.setNiche(S, "newgrad"); CS.setNick(S, "nick"); }
    }
    E.endMonth(S); while (S.pending || S.sceneQ.length) { if (!S.pending) E.nextQueuedScene(S); if (S.pending) E.choose(S, 0); }
  }
  const h = location.hash; ui.page = ["map", "people", "sj", "hobby", "co", "pr", "cs", "insta", "airbnb", "ucafe", "grad", "family", "me"].find((k) => h.includes("-" + k)) || "home";
  if (h.includes("region")) ui.region = "town";
  { const av = h.match(/av=(p[FM][0-9])/); if (av) { S.me.avatar = av[1]; S.me.gender = av[1][1]; } const wh = h.match(/who=(c[0-9]+)/); if (wh) { S.cast.unshift(wh[1]); E.talkTo(S, wh[1]); while (S.pending) E.choose(S, 0); S.rel[wh[1]] = S.rel[wh[1]] || {}; const o = S.rel; S.rel = { [wh[1]]: o[wh[1]], ...o }; } const sp = h.match(/spot=([a-z]+)/); if (sp) ui.lastSpot = sp[1]; }
  render();
  if (h.includes("hub")) openHub();
  if (h.includes("ending")) { S.fireAt = 41; S.cash += 280000; S.ended = "age"; render(); }
  if (h.includes("decor") && S.pr.rooms[0]) { const rm = S.pr.rooms[0]; ui.page = "pr"; ui.prFlow = { step: "decor", id: rm.id, picks: { ...rm.decor, light: 3, seat: 1, zone: 3 } }; render(); }
  if (h.includes("quiz")) { S.cs.queue.push({ id: 999, prod: "edit", niche: "newgrad", left: 1, units: 1, price: 7, wait: 0 }); S.ap = 5; quizWin("cs_focus"); }
  if (location.hash.includes("scene")) { const id = S.cast[0]; E.openScene(S, E.meetScene(S, id)); showScene(); }
  if (location.hash.includes("char")) { const id = Object.keys(S.rel)[0]; if (id) charWin(id); }
}


// ───────── 클릭 흐름 시험(#flow): 실제 버튼을 눌러 한 판을 진행한다 ─────────
function flowTest(months) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const click = (sel, root) => { const el = $(sel, root); if (el && !el.disabled) { el.click(); return true; } return false; };
  const clearModal = () => { for (let g = 0; g < 60 && $modal.innerHTML; g++) { if (click("[data-ch]", $modal) || click("[data-ok]", $modal) || click("[data-force]", $modal) || click("[data-pick]", $modal) || click("[data-pa]", $modal) || click("[data-close]", $modal)) continue; closeWin(); } };
  startWizard(1); click('[data-g="F"]'); click('[data-age="28"]'); click("[data-nextw]");
  { const w = ui.wiz; w.rolls.push(E.rollStats(Math.random), E.rollStats(Math.random)); w.pick = 1; renderWiz(); click('[data-rpick="0"]'); click("[data-nextw]"); }
  click('[data-major="math"]'); click("[data-nextw]"); click('[data-co="fin"]'); click('[data-job="risk"]'); click("[data-nextw]");
  click("[data-reroll-tr]"); click("[data-undo-tr]"); $app.querySelectorAll("[data-tr]")[0].click(); $app.querySelectorAll("[data-tr]")[1].click(); click("[data-nextw]"); clearModal();
  const log = [];
  go("hobby"); click('[data-hbjoin="mentor"]'); click('[data-hbjoin="wine"]');
  for (let m = 0; m < months && S && !S.over && !S.ended; m++) {
    // 화면 지도 열고 닫기, 넘기기
    go("home"); click("[data-hub]"); click("[data-hgo]", $modal); go("map"); click("[data-back]"); click("[data-money]"); clearModal();
    // 취미 모임
    go("hobby"); click('[data-act="hb_go"]'); clearModal();
    // 투잡 탐색: 리포트 → 시작
    if (S.sj.open) { go("sj"); if (click('[data-sjstart]')) click("[data-yes]", $modal); else click('[data-act="sj_report"]'); clearModal(); }
    go("hobby"); { const pc = $app.querySelector(".spot [data-char]"); if (pc) { pc.click(); clearModal(); } }
    go("co"); { const pc = $app.querySelector(".spot [data-char]"); if (pc) { pc.click(); clearModal(); } }
    if (!SJ.isActive(S, "cs")) { go("co"); click('[data-act="co_lunch"]'); clearModal(); go("home"); click("[data-end]"); clearModal(); clearModal(); log.push(`${S.age.toFixed(1)}세 탐색 중 발견 ${Object.keys(S.sj.found).join(",")}`); continue; }
    // 컨설팅 준비
    go("cs"); click('[data-niche="newgrad"]'); click('[data-nick="nick"]'); clearModal();
    for (let k = 0; k < 2; k++) { go("cs"); click('[data-act="cs_friend"]') || click('[data-act="cs_work"]') || click('[data-act="cs_kmong"]') || click('[data-act="cs_blog"]'); clearModal(); }
    // 파티룸: 4달째부터 매물 보기 → 조사 → 계약
    if (m >= 3 && S.pr.rooms.length < 2 && SJ.isActive(S, "pr")) {
      ui.prFlow = null; go("pr");
      if (!S.pr.listings.length) { click('[data-prflow="district"]'); click('[data-dk="univ"]'); click('[data-act="pr_search"]'); clearModal(); }
      else { if (!click('[data-act="pr_visit"]') && !click('[data-act="pr_landlord"]') && !click('[data-act="pr_appcheck"]')) { const c = $app.querySelector('[data-prflow^="contract:"]'); if (c) { c.click(); click("[data-self]"); click("[data-sign]"); } } clearModal(); }
    }
    // 파티룸 관리
    if (SJ.isActive(S, "pr")) for (let k = 0; k < 4; k++) { ui.prFlow = null; go("pr"); click('[data-act="pr_manage"]'); clearModal(); }
    // 지도: 사람 만나기
    ui.page = "map"; ui.region = D.REGIONS.filter((r) => !r.hub)[m % 6].id; render(); const pc = $app.querySelector("[data-char]"); if (pc) { pc.click(); clearModal(); }
    ui.page = "people"; render(); const p2 = $app.querySelector("[data-char]"); if (p2) { p2.click(); clearModal(); }
    // 홈 바로 하기
    ui.page = "home"; render(); for (const b of [...$app.querySelectorAll(".grid4 [data-act]")].slice(0, 4)) { b.click(); clearModal(); ui.page = "home"; render(); }
    // 나 페이지 투자
    ui.page = "me"; render(); click('[data-inv="100"]');
    ui.page = "home"; render(); click("[data-end]"); clearModal(); clearModal();
    log.push(`${S.age.toFixed(1)}세 현금 ${Math.round(S.cash)} 투잡 ${S.sj.active.join("+")} 지점 ${S.pr.rooms.length} 컨설팅 ${S.cs.open ? "O" : "X"} 인연 ${Object.keys(S.rel).length} 취미 ${S.hb.joined.map((h) => S.hb.cnt[h]).join("/")}`);
  }
  ui.page = "home"; render();
  const d = document.createElement("pre"); d.style.cssText = "position:fixed;left:0;right:0;bottom:80px;z-index:70;background:#000c;color:#9f9;font-size:10px;max-height:40vh;overflow:auto;margin:0;padding:6px"; d.textContent = ["FLOW OK", ...log.slice(-12)].join(String.fromCharCode(10)); document.body.appendChild(d);
}

const CHARS_N = Object.keys(E.CHAR).length;
APP.initApp({ onBack: () => {
  const bg = $modal.querySelector(".bg");
  if (bg) { if (bg.hasAttribute("data-bgclose")) closeWin(); return true; }
  if (S && ui.page && ui.page !== "home") { go("home"); return true; }
  if (!S && ui.wiz) { ui.wiz = null; renderTitle(); return true; }
  return false;
} });
document.addEventListener("a6-installable", () => { const b = document.querySelector("[data-install]"); if (b) b.hidden = false; });
ST.init().then(async () => {
  META_C = await ST.getMeta();
  if (location.hash.startsWith("#flow")) flowTest(+(location.hash.match(/\d+/) || [24])[0]);
  else if (location.hash.startsWith("#auto")) autoTest(+(location.hash.match(/\d+/) || [18])[0]);
  else if (location.hash.startsWith("#wiz")) { startWizard(1); const w = ui.wiz; const n = +(location.hash.match(/\d/) || [1])[0]; if (n >= 2) { w.step = 2; w.rolls.push(E.rollStats(Math.random)); w.pick = 0; } if (n >= 3) { w.step = 3; w.major = "elec"; } if (n >= 4) { w.step = 4; w.company = "fin"; w.companyName = "신안은행"; w.job = "dfin"; } if (n >= 5) { w.step = 5; w.traits = w.pool.slice(0, 2); } renderWiz(); }
  else if (location.hash.startsWith("#intro")) { autoTest(1); showIntro(); }
  else if (location.hash.startsWith("#gift")) { META_C = Object.assign({}, META_C, { runs: [{}, {}], ngPts: 9, knownJobs: ["pr", "cs", "airbnb"], pastFriends: ["c001", "c005", "c064"], endings: ["fire", "agefail"], metAll: ["c001", "c002", "c005"] }); startWizard(1); ui.wiz.gifts = { cash: 1, know: ["pr"], friend: ["c001"] }; renderWiz(); }
  else renderTitle();
});
