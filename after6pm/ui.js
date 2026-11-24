// After 6PM v4 · 화면. 엔진(engine/*.js)은 계산만, 여기서는 그리기와 클릭만.
import * as E from "./engine/core.js";
import * as PR from "./engine/pr.js";
import * as CS from "./engine/cs.js";
import * as SJ from "./engine/sj.js";
import * as INS from "./engine/insta.js";
import * as IGA from "./insta_app.js"; // 인별 앱 창(v4.27)
import * as SYN from "./engine/syn.js";
import * as AB from "./engine/abnb.js";
import * as BIG from "./engine/big.js";
import * as UC from "./engine/ucafe.js";
import { portraitDataURL, randomLook } from "./portrait.js";
import * as ST from "./store.js";
import * as APP from "./app.js";
import * as FX from "./fx.js";
import { BGM } from "./bgm.js"; BGM.useStore(FX); // 배경 음악(11-23). useStore: 음악 설정도 효과음 설정과 한곳에 저장
import { ART } from "./gen/art.js";
import { BODY, BG } from "./gen/body.js";
import { CG, CG_NOPPL } from "./gen/cg.js";
const NOPPL = new Set(CG_NOPPL || []); // v4.27 사람이 안 나오는 화보 → 내 캐릭터를 얹는다
import { MG, mgRun, mgKeys, mgPrefetch, mg2Init } from "./mg.js";
import { mgChoose, mgCtx, mgSkillStat } from "./mg_pick.js"; // 내 선택(포지션·컨셉·길)에 맞는 미니게임 고르기(11-24)
import * as REG from "./engine/reg.js";
import * as WV from "./engine/wave.js";
import * as PW from "./engine/prwave.js";
import { MAP as MAPD } from "./map_data.js"; // 도시 맵 그림과 핀 좌표(11-24)
import * as XR from "./engine/extras.js"; // 주변 사람(조연)·대화창(11-24)
import * as LVX from "./engine/love.js"; // 두근두근·연애 행동·까톡(11-24)
import * as BMX from "./bm.js"; // 돈 버는 자리(11-24, 아직 꺼짐)
import * as RD from "./engine/round.js"; // 회차 구조(11-23) // 파티룸 컨셉 위기(11-23) // 판이 바뀐다(11-23)
import { UI_PLUGINS } from "./jobs/index.js";
import * as DK from "./deco_ui.js"; // 방 꾸미기(deco/deco.js 는 열 때 받기)
import { rivalBox, RIVAL_CINE_TAG } from "./rival_ui.js"; // 라이벌 칸(v4.25)
import * as HU from "./hidden_ui.js"; // 히든 길 한 줄·스승 장면 시험(v4.29)
import * as H2U from "./hidden2_ui.js"; // 다른 방식의 히든 길(v4.30)
import * as PD from "./people_dex.js"; // 인물 도감 기록(v4.27). 도감·관계도 화면은 people_ui.js(열 때 받기)
import { rivalDemo as RV_DEMO } from "./engine/rival.js";
import { marketBox, skillLine } from "./market_ui.js"; // 배우는 기간·시장 칸(v4.25b)
import * as CU from "./cards_ui.js"; // 성장 카드·카드팩·가방(v4.25)
import * as TU from "./title_ui.js"; // 시작 화면(B안, 11-23)
import * as GC from "./engine/cards.js";
import * as IT_ from "./engine/items.js";
import * as JP from "./engine/jackpot.js"; // 한방 전략(v4.27) 시험용
import { tycoonScene } from "./tycoon_ui.js"; // 내 매장 장면(타이쿤, v4.27)
import * as SP from "./space_ui.js"; // 파티룸·에어 가격표·후기·명의 패널(v4.28)
const spc = () => ({ S, E, esc, won, meter, actRow, fold: (...a) => fold(...a) }); // v4.28
const D = E.D;
// 새 투잡 화면 플러그인(jobs/<key>_ui.js). 엔진 플러그인이 등록된 것만 쓴다. 채우기는 아래 regUiPlugins()
const UJ = {}, PLUG_PAGES = {};
const $app = document.getElementById("app"), $modal = document.getElementById("modal"), $toast = document.getElementById("toast");
let S = null, SLOT = 1, META_C = {};
const ui = { page: "home", region: null, filter: "all", prFlow: null, wiz: null, chain: [], sjf: "all", dir: 0, fold: {} };
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const won = E.won, jo = E.jo;
const r1 = (x) => Math.round(x * 10) / 10;
// 화면 정리(v4.27): 한 줄 요약 + 자세히 ▾ 접기. body 가 비면 빈 글.
// 화면 정리(v4.31): 한 줄 요약으로 접는 칸. 펼침 상태는 ui.fold 에 남겨 화면을 다시 그려도 유지된다. def = 처음 상태.
const fold = (key, sum, body, def = false, cls = "", side = "") => `<details class="tjx-fold ${cls}" data-fk="${esc(key)}" ${(ui.fold[key] ?? def) ? "open" : ""}><summary><span class="tjx-sum">${sum}</span>${side}<i class="tjx-arr">▾</i></summary>${body}</details>`;
document.addEventListener("click", (e) => { const sm = e.target.closest?.("summary"), d = sm?.parentElement; if (d?.dataset?.fk && !e.target.closest("button,select,a,input")) setTimeout(() => { ui.fold[d.dataset.fk] = d.open; }, 0); });
const more = (sum, body, cls = "") => body ? `<details class="more ${cls}"><summary>${sum} ▾</summary><div class="more-b">${body}</div></details>` : "";

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
const genderOf = (id) => { const g = XR.who(id)?.gender; return g === "same" ? S?.me?.gender || "F" : g || "F"; }; // 조연·단역(engine/extras.js)도 같은 길로 얼굴을 만든다
function lookOf(id) { const c = XR.who(id); if (c?.look?.hair) return c.look; const k = id + genderOf(id); if (!lookCache[k]) lookCache[k] = randomLook(seededRng(id), genderOf(id), { older: (c?.age || 30) >= 40 }); return lookCache[k]; }
// 그림체 초상화: img/ch/<id>.webp 한 장에 표정 6칸(3x2). 불러오기 전에는 도트 얼굴을 보여 주고, 다 불러오면 그 자리에서 바꾼다.
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const ART_CACHE = {}, ART_LOAD = {}, ART_FALL = new Map(), ART_THUMB = {};
// 흐린 사본: 큰 그림이 오기 전 잠깐 보여 준다(img/cs, img/bs). 보이는 그림에 ld 표시를 붙여 흐리게.
// 그림이 있는 사람은 불러오는 동안 도트 대신 흐린 실루엣(같은 비율). 주석에 key 를 넣어 사람마다 src 가 달라지게
function ghost(key, i, mode) {
  const [w, h] = mode === "full" ? [240, 540] : mode === "half" ? [240, 312] : [100, 100];
  const hx = w / 2, hr = mode === "face" ? 26 : 42, hy = mode === "face" ? 42 : 96, sy = mode === "face" ? 74 : 150;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><!--${key}${i}${mode}--><g fill="#9a90b8" fill-opacity=".28"><circle cx="${hx}" cy="${hy}" r="${hr}"/><path d="M${hx - hr * 1.9} ${h}C${hx - hr * 1.9} ${sy + hr * 0.6} ${hx - hr} ${sy} ${hx} ${sy}S${hx + hr * 1.9} ${sy + hr * 0.6} ${hx + hr * 1.9} ${h}Z"/></g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
// 처음 켤 때 흐린 사본(작은 그림)을 미리 받아 둔다 → 바로 흐린 그림, 곧 선명한 그림
function warmThumbs() { let k = 0; for (const id of Object.keys(BODY)) setTimeout(() => bodyThumb(id), 30 * k++); for (const id of ART) if (!BODY[id]) setTimeout(() => artThumb(id), 30 * k++); }
const swapSrc = (el, src, done) => { el.setAttribute("src", src); el.classList.toggle("ld", !done); };
function sheetCut(im, i, cw0) { const cw = Math.floor(im.width / 3), ch = Math.floor(im.height / 2), c = document.createElement("canvas"); c.width = cw; c.height = ch; c.getContext("2d").drawImage(im, (i % 3) * cw, Math.floor(i / 3) * ch, cw, ch, 0, 0, cw, ch); return c.toDataURL("image/webp", 0.8); }
function artThumb(key) {
  if (ART_THUMB[key] || ART_CACHE[key]) return;
  ART_THUMB[key] = "ld";
  const im = new Image();
  im.onload = () => { if (ART_CACHE[key]) return; try { ART_THUMB[key] = [0, 1, 2, 3, 4, 5].map((j) => sheetCut(im, j)); } catch (e) { return; }
    document.querySelectorAll("img.face").forEach((el) => { const hit = ART_FALL.get(el.getAttribute("src")); if (hit && hit[0] === key) { const t = ART_THUMB[key][hit[1]]; ART_FALL.set(t, hit); swapSrc(el, t, false); } }); };
  im.src = "img/cs/" + key + ".webp";
}
function artLoad(key) {
  if (ART_CACHE[key] || ART_LOAD[key] || !ART.has(key)) return;
  ART_LOAD[key] = 1;
  const im = new Image();
  im.onload = () => {
    try {
      const cw = Math.floor(im.width / 3), chh = Math.floor(im.height / 2), c = document.createElement("canvas"); c.width = cw; c.height = chh; const g = c.getContext("2d");
      ART_CACHE[key] = [0, 1, 2, 3, 4, 5].map((j) => { g.clearRect(0, 0, cw, chh); g.drawImage(im, (j % 3) * cw, Math.floor(j / 3) * chh, cw, chh, 0, 0, cw, chh); return c.toDataURL("image/webp", 0.88); });
      if (ui.wiz && !S && ui.wiz.step === 1) renderWiz();
      document.querySelectorAll("img.face").forEach((el) => { const hit = ART_FALL.get(el.getAttribute("src")); if (hit && hit[0] === key) swapSrc(el, ART_CACHE[key][hit[1]], true); });
    } catch (e) {}
  };
  im.src = "img/ch/" + key + ".webp";
}
function artOr(key, expr, fallback) {
  if (!key || !ART.has(key)) return fallback();
  const i = EXI[expr] ?? 0;
  if (ART_CACHE[key]) return ART_CACHE[key][i];
  const t = Array.isArray(ART_THUMB[key]) ? ART_THUMB[key][i] : null;
  const fb = t || ghost(key, i, "face"); if (fb) ART_FALL.set(fb, [key, i]); artThumb(key); artLoad(key); return fb;
}
new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) (n.matches?.("img") ? [n] : n.querySelectorAll("img.face,img.body")).forEach((el) => { const src = el.getAttribute("src"); if (src && (BODY_WAIT.has(src) || ART_FALL.has(src))) el.classList.add("ld"); }); }).observe(document.body, { childList: true, subtree: true });
function artPreload(ids) { let k = 0; for (const id of ids) setTimeout(() => (BODY[id] ? bodyLoad(id) : artLoad(id)), 40 * k++); }
const BODY_IMG = {}, BODY_LD = {}, BODY_CUT = {}, BODY_WAIT = new Map(), BODY_TH = {};
for (const c of Object.values(E.CHAR)) if (c.img && BODY[c.img] && !BODY[c.id]) { BODY[c.id] = BODY[c.img]; PD.IMG_OF[c.id] = c.img; } // 자기 그림이 생기면 별칭은 저절로 안 쓴다(v4.29) // 그림을 빌려 쓰는 인물(인별 유명인: img 칸)
const modeOf = (el) => el.classList.contains("body") ? (el.closest(".sstage.half,.mestage") ? "half" : "full") : "face";
function bodyThumb(key) {
  if (BODY_TH[key] || BODY_IMG[key]) return;
  BODY_TH[key] = "ld";
  const im = new Image();
  im.onload = () => { if (BODY_IMG[key]) return; BODY_TH[key] = im;
    document.querySelectorAll("img.face,img.body").forEach((el) => { const h = BODY_WAIT.get(el.getAttribute("src")); if (h && h[0] === key) { try { const t = bodyCut(key, h[1], modeOf(el), im); BODY_WAIT.set(t, h); swapSrc(el, t, false); } catch (e) {} } }); };
  im.src = "img/bs/" + (PD.IMG_OF[key] || key) + ".webp";
}
function bodyLoad(key) {
  if (BODY_IMG[key] || BODY_LD[key] || !BODY[key]) return;
  BODY_LD[key] = 1;
  const im = new Image();
  im.onload = () => {
    BODY_IMG[key] = im;
    document.querySelectorAll("img.face,img.body").forEach((el) => { const h = BODY_WAIT.get(el.getAttribute("src")); if (h && h[0] === key) { try { swapSrc(el, bodyCut(key, h[1], modeOf(el)), true); } catch (e) {} } });
    if (ui.wiz && !S && ui.wiz.step === 1) renderWiz();
  };
  im.src = "img/body/" + (PD.IMG_OF[key] || key) + ".webp";
}
function bodyCut(key, i, mode, th) {
  const ck = key + i + mode + (th ? "s" : ""); if (BODY_CUT[ck]) return BODY_CUT[ck];
  const im = th || BODY_IMG[key], cw = im.width / 3, ch = im.height / 2, sx = (i % 3) * cw, sy = Math.floor(i / 3) * ch, k = cw / 240;
  let x = 0, y = 0, w = cw, h = ch;
  if (mode === "face") { const b = BODY[key][i]; x = b[0] * k; y = b[1] * k; w = h = b[2] * k; }
  else if (mode === "half") h = Math.round(cw * 1.3);
  const c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(h);
  c.getContext("2d").drawImage(im, sx + x, sy + y, w, h, 0, 0, c.width, c.height);
  return (BODY_CUT[ck] = c.toDataURL("image/webp", th ? 0.7 : 0.9));
}
// 몸 그림이 있으면 그 조각, 없으면 null. 불러오는 동안에는 fallback 을 보여 주고 다 불러오면 그 자리에서 바꾼다.
function bodyOr(key, expr, mode, fallback) {
  if (!key || !BODY[key]) return null;
  const i = EXI[expr] ?? 0;
  if (BODY_IMG[key]) return bodyCut(key, i, mode);
  let fb = null; if (BODY_TH[key] instanceof Image) try { fb = bodyCut(key, i, mode, BODY_TH[key]); } catch (e) {}
  fb = fb || ghost(key, i, mode); if (fb) BODY_WAIT.set(fb, [key, i, mode]); bodyThumb(key); bodyLoad(key); return fb;
}
const pixFace = (id, expr) => () => { try { return portraitDataURL(lookOf(id), genderOf(id), expr, 4); } catch (e) { return ""; } };
const pixMe = (expr) => () => { try { return portraitDataURL(S.me.look, S.me.gender, expr, 5); } catch (e) { return ""; } };
function bodySrc(id, expr, mode) { return id === "me" ? bodyOr(S.me.avatar, expr, mode, pixMe(expr)) : bodyOr(id, expr, mode, pixFace(id, expr)); }
// 장소 배경: 장소(spot) → 배경 그림
const SPOT_BG = { app: "online", chat: "online", market: "online", univ: "gate" };
const PAGE_BG = { pr: "partyroom", cs: "consult", airbnb: "airbnb", ucafe: "ucafe", co: "desk", insta: "home", grad: "library", family: "apt", hobby: "cafe" };
function bgUrl(k) { return k && BG.has(k) ? `img/bg/${k}.webp` : ""; }
function charSpot(id) { for (const [sp, ids] of Object.entries(S.spot || {})) if (ids.includes(id)) return SPOT_BG[sp] || sp; const c = E.CHAR[id]; if (c?.customer) return c.customer.board === "partyroom" ? "partyroom" : "consult"; return null; }
function sceneBg(sc, lead) { // lead: 무대에 선 사람. 조연은 자기 자리(본부장 = 회의실, 엄마 = 부모님 집)가 먼저다(11-24)
  const cands = [sc.kind === "wedding" ? "wedding" : null, sc.bg, !sc.who && lead ? XR.EXTRA[lead]?.bg : null, ui.lastSpot ? SPOT_BG[ui.lastSpot] || ui.lastSpot : null, PAGE_BG[ui.page], sc.who ? charSpot(sc.who) : null, "street", "alley"];
  for (const k of cands) if (k && BG.has(k)) return bgUrl(k);
  return "";
}
// 장소 위에 사람을 세운 무대. 몸 그림이 없으면 예전처럼 얼굴 칸.
// 키(11-24): 인물 프로필의 height(cm)를 그림 높이에 반영한다. 같은 거리에 서 있다고 보고, 기준 키(HREF)일 때 무대 높이를 꽉 채운다
const HREF = 184, ME_H = { M: 176, F: 163 };
const heightOf = (id) => (id === "me" ? S?.me?.height || ME_H[S?.me?.gender] || 170 : XR.who(id)?.height || 0);
const hPct = (id, full = 100) => { const h = heightOf(id); return h ? Math.round(full * Math.max(0.8, Math.min(1.04, h / HREF)) * 10) / 10 : full; };
const bodyImg = (id, src, full) => img(src, "body", "").replace("<img ", `<img style="height:${hPct(id, full)}%" `);
function stageWho(id, expr, mode, bg, cap, noScale) {
  const src = bodySrc(id, expr, mode);
  if (!src) return null;
  return `<div class="sstage ${mode}" style="${bg ? `background-image:url(${bg})` : ""}">${noScale ? img(src, "body", "") : bodyImg(id, src, mode === "half" ? 96 : 100)}${cap ? `<div class="cap">${cap}</div>` : ""}</div>`;
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
function save(now) { if (S) { try { const m = meta(); if (PD.dexSync(S, m, E.CHAR)) setMeta(m); } catch (e) {} ST.save(SLOT, E.save(S), summary(), now); } }
// 인물 도감·관계도(v4.27): people_ui.js 를 열 때 받는다. kind "dex" | "map" | "dex:<id>"
function pplOpen(kind) { import("./people_ui.js").then((M) => M.open(kind, { S, E, D, esc, openWin, closeWin, charWin, meta, setMeta, toast, stage: (id) => stageWho(id, "smile", "half", bgUrl(PAGE_BG[{ pr: "pr", cs: "cs", co: "co" }[PD.groupOf(E.CHAR[id])]] || "cafe") || bgUrl("street")), face: (id) => faceSrc(id, "smile"), pix: (id) => pixFace(id, "neutral")(), meFace: () => meSrc("smile") })).catch((e) => toast([], "도감을 불러오지 못했어요")); }
function meta() { return META_C; }
function setMeta(m) { META_C = m; ST.setMeta(m); }
function gcx() { return { ...dctx(), E, FX }; } // 성장 카드·가방(cards_ui.js)에 넘기는 것
function dctx() { return { S, save, render, toast, openWin, closeWin, meta, setMeta, esc, won }; } // 방 꾸미기(deco_ui.js)에 넘기는 것

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
  if (S.pending) return showScene();
  if (id === "hb_go" && !arg) return hobbyPick();
  if (!arg && !a.pick) arg = defaultArg(id);
  ui.lastSpot = Object.values(D.SPOTS).find((sp) => sp.acts.includes(id))?.id || null;
  if (a.pick && arg === undefined) return pickFor(id);
  if (MGJ[id] && mgDue() && !E.canAct(S, id, arg) && mgKeys(MGJ[id][0]).some((k) => MG[k])) return mgOffer(id, arg); // 미니게임이 아직 없으면(GAME = null) 그냥 행동
  const res = E.act(S, id, arg);
  if (!res.ok) { toast([], res.msg); return; }
  afterRes(res);
}
// ───────── 투잡 미니게임: 1년에 한 번, 그해의 큰 일이 왔을 때(11-24. 전에는 한 달에 한 번) ─────────
// 그해 큰 일이 오는 달은 해마다 다르다(2~10월). 그 달부터 핵심 행동을 누르면 나온다. 23년이면 22번쯤.
// 11-24(대표 결정): 1년에 두 번. 상반기 큰 일(2~5월)과 하반기 큰 일(7~10월)이 한 번씩 온다. 횟수는 MG_PER_YEAR 하나로 바꾼다
const MG_PER_YEAR = 2;
const mgMonths = () => { const k = S.year * 7 + (String(S.seed).length || 3); return [2 + (k % 4), 7 + ((k >> 1) % 4)]; };
const mgCnt = () => (S.mgYr === S.year ? S.mgN ?? 1 : 0); // 올해 한 판 수(옛 저장은 mgYr 만 있다 → 한 번 한 것으로 본다)
const mgDue = () => S.mgForce || (mgCnt() < MG_PER_YEAR && S.cal >= (mgMonths()[mgCnt()] ?? 13));
const MG_EV = { pr: "올해 가장 큰 단체 예약이 들어왔다", cs: "공채 시즌, 의뢰가 한꺼번에 몰렸다", airbnb: "성수기 만실 주간이 시작됐다", ucafe: "1년에 한 번 하는 기계 전체 점검 날", insta: "올해의 콜라보 촬영 제안이 왔다" };
const MGJ = { pr_manage: ["pr", "hands"], cs_work: ["cs", "write"], ab_host: ["airbnb", "lang"], uc_check: ["ucafe", "sense"], in_post: ["insta", "sense"] };
const MG_SKIP_AT = 3;
// 이 투잡에서 다음에 나올 미니게임: 같은 투잡에 게임이 여럿이면 번갈아(1탄 → 2탄 → 1탄 …)
function mgNext(job, plays = (meta().mgPlays || {})[job] || 0, arg) { const keys = mgKeys(job).filter((k) => MG[k]); return mgChoose(S, job, keys, plays, arg); } // 11-24 내 선택에 맞는 게임 중 이번 인생에 가장 덜 한 것(mg_pick.js, S.mgC)
// 투잡 보드를 열면(시작 직후 포함) 그 투잡 다음 미니게임 파일을 조용히 미리 받는다
function mgWarm(page) { try { if (Object.values(MGJ).some(([j]) => j === page)) mgPrefetch(mgNext(page)); } catch (e) {} }
function mgOffer(id, arg) {
  const [job, stat0] = MGJ[id], stat = mgSkillStat(S, job, stat0), m = meta(), plays = (m.mgPlays || {})[job] || 0, skill = Math.round(S.st[stat] || 0);
  // 같은 투잡에 게임이 여럿이면 번갈아 나온다(1탄 → 2탄 → 1탄 …)
  mgDoneMap(); // 옛 저장이면 이번 판을 세기 전에 기록부터 옮겨 둔다
  const gk = mgNext(job, plays, arg), G = gk && MG[gk];
  if (!G) { const res = E.act(S, id, arg); if (!res.ok) return toast([], res.msg); return afterRes(res); } // 미니게임이 없으면(null) 바로 행동
  mgPrefetch(gk); // 설명을 읽는 동안 미니게임 파일을 받아 둔다
  const canSkip = plays >= MG_SKIP_AT, /* 세 번 해 보면 무료 건너뛰기. 그 전에는 건너뛰기권(돈 버는 자리) */ normalB = +(0.9 + Math.min(200, skill) / 200 * 0.25).toFixed(2);
  const finish = (boost, lines) => { S.mgT = S.mgT || {}; S.mgT[job] = S.t; { const n = mgCnt(); S.mgYr = S.year; S.mgN = n + 1; } S.mgBoost = boost; closeWin(); const res = E.act(S, id, arg); if (!res.ok) { S.mgBoost = 0; return toast([], res.msg); } res.lines = [...lines, ...(res.lines || [])]; afterRes(res); };
  openWin(`<h2>${esc(G.n)} <span class="tag gold">${mgCnt() ? "하반기의 큰 일" : "상반기의 큰 일"}</span></h2><div class="small"><b class="gold">${esc(MG_EV[job] || "큰 일이 왔다")}</b></div><div class="small muted">${esc(G.desc || "")}</div><div class="tiny muted" style="margin-top:4px">미니게임은 1년에 두 번, 큰 일이 왔을 때만 나와요. 잘하면 능력치가 오르고, 같이 일하는 사람의 믿음도 올라요.</div>
    <div class="tiny muted" style="margin-top:6px">점수에 따라 이번 달 ${esc(D.ACTIONS[id].n)} 효과가 ×0.7~1.5. ${canSkip ? `건너뛰면 ${D.STATS[stat]} ${skill} 기준 보통 결과예요.` : `${MG_SKIP_AT}번 해 보면 건너뛰기가 생겨요(지금 ${plays}번).`} 하는 법은 시작 화면에서 알려 드려요.</div>
    <div class="row" style="margin-top:12px">${canSkip ? `<button class="btn grow" data-mgskip>건너뛰기 (보통 결과)</button>` : BMX.bmOn() ? `<button class="btn grow" data-mgskip data-bm="mgSkip">${esc(BMX.label("mgSkip"))}</button>` : ""}<button class="btn gold grow" data-mgplay>미니게임 하기</button></div>
    <button class="btn" style="width:100%;margin-top:8px" data-mgcancel data-close>취소 (이번엔 안 함)</button>`, (w) => {
    w.querySelector("[data-mgcancel]").onclick = () => closeWin();
    w.querySelector("[data-mgskip]")?.addEventListener("click", async (e) => { if (e.currentTarget.dataset.bm) { const pr = await BMX.pay("mgSkip"); if (!pr.ok) return toast([], pr.msg); } finish(normalB, [`건너뛰기: 보통 결과(효과 ×${normalB})`]); });
    w.querySelector("[data-mgplay]").onclick = () => {
      openWin(`<div class="mghost"></div><button class="mgquit" data-mgquit>그만하기 (보통 결과)</button>`, async (w2) => {
        // 게임 안에서 오류가 나거나(이벤트 처리 중 오류는 Promise로 안 잡힌다) 그만하기를 누르면 보통 결과로 닫는다
        let bail; const bailP = new Promise((res) => { bail = res; });
        const onErr = (e) => { try { console.warn("미니게임 오류", gk, e?.error || e?.reason || e); } catch (e2) {} bail("err"); };
        window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
        w2.querySelector("[data-mgquit]").onclick = () => bail("quit");
        let r = null, err = false;
        try { r = await Promise.race([mgRun(gk, w2.querySelector(".mghost"), { skill, avatar: S.me.avatar || null, gender: S.me.gender || "F", ctx: mgCtx(S, job, arg) }), bailP]); } catch (e) { r = null; err = true; try { console.warn("미니게임 오류", gk, e); } catch (e2) {} }
        window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onErr);
        if (r === "quit") return finish(normalB, [`미니게임 그만하기: 보통 결과(효과 ×${normalB})`]);
        if (r === "err") { r = null; err = true; }
        if (r && r.loadFail) return finish(normalB, [`미니게임을 불러오지 못했어요: 보통 결과(효과 ×${normalB})`]); // 오프라인 등. 판 수는 안 센다
        const mm = meta(); mm.mgPlays = { ...(mm.mgPlays || {}), [job]: plays + 1 }; setMeta(mm); S.mgC = { ...(S.mgC || {}), [gk]: ((S.mgC || {})[gk] || 0) + 1 }; // S.mgC: 이번 인생에 게임별로 한 판 수
        if (err || !r || !Number.isFinite(+r.score)) return finish(normalB, [`미니게임을 끝까지 못 했어요: 보통 결과(효과 ×${normalB})`]); // 오류가 나도 보통 결과로 닫는다
        mgRecord(gk, r); try { const m3 = meta(); m3.mgAv = { avatar: S.me.avatar || null, gender: S.me.gender || "F" }; setMeta(m3); } catch (e) {} // 시작 화면 '미니게임 다시 하기'용
        let sc = Math.max(0, Math.min(1, +r.score));
        // 돈 버는 자리(꺼져 있으면 안 나온다): 망쳤을 때 광고 보고 다시 하기 · 만점 보장권
        if (BMX.bmOn() && sc < 0.6) { const pick = await new Promise((res) => openWin(`<h2>아쉬운 결과 <span class="tag red">${esc(r.grade || "보통")}</span></h2><div class="small muted">올해의 큰 일은 한 번뿐이에요. 어떻게 할까요?</div><div class="col" style="gap:8px;margin-top:12px"><button class="btn gold" data-bmp="mgRetry">${esc(BMX.label("mgRetry"))}</button><button class="btn" data-bmp="mgBest">${esc(BMX.label("mgBest"))}</button><button class="btn" data-bmp="">이대로 받기</button></div>`, (w3) => w3.querySelectorAll("[data-bmp]").forEach((bt) => bt.onclick = async () => { const k = bt.dataset.bmp; if (k) { const pr = await BMX.pay(k); if (!pr.ok) return toast([], pr.msg); } res(k); }), true, true));
          if (pick === "mgRetry") { closeWin(); S.mgBmRetry = S.year; return mgOffer(id, arg); }
          if (pick === "mgBest") { sc = 1; r.grade = "대성공"; } }
        const b = +(0.7 + sc * 0.8).toFixed(2), trust = sc >= 0.6 ? E.mgTrust(S, job) : [];
        finish(b, [`미니게임 ${r.grade || "보통"} · 효과 ×${b}`, ...trust, ...(r.grade === "대성공" ? GC.mgReward(S, E.R(S), job) : []), ...E.mgStat(S, job, r.grade || (sc >= 0.85 ? "대성공" : sc >= 0.6 ? "성공" : "")), ...(plays + 1 === MG_SKIP_AT ? ["이제 건너뛰기를 쓸 수 있어요"] : [])]);
      }, true, true);
    };
  }, true, true);
}
function afterRes(res) {
  if (res.lines?.length || res.msg) { if (S.pending) ui.preFx = { lines: res.lines || [], msg: res.msg }; else toast(res.lines, res.msg); }
  if (res.open?.startsWith("listings:")) { ui.page = "pr"; ui.prFlow = { step: "list", dk: res.open.split(":")[1] }; }
  save(); render();
  if (S.pending) showScene();
}
// 취미 모임 가기: 가입한 취미가 둘 이상이면 고른다
function hobbyPick() {
  const J = S.hb.joined;
  if (!J.length) { toast([], "가입한 취미가 없어요. 취미 화면에서 먼저 가입해요"); return go("hobby"); }
  if (J.length === 1) return doAct("hb_go", J[0]);
  const left = J.filter((h) => S.hb.lastT[h] !== S.t).length;
  openWin(`<h2>어느 모임에 갈까요? <button class="x" data-close>✕</button></h2><div class="pick">${J.map((h) => { const H = D.HOBBIES[h], done = S.hb.lastT[h] === S.t; return `<button data-hb="${h}" ${done ? "disabled" : ""}><b>${esc(H.n)}</b><span class="tiny muted">${done ? "이번 달 모임은 다녀왔어요" : "⚡1 · 회비 " + won(H.fee || 0)}</span></button>`; }).join("")}</div>${left ? "" : `<div class="small muted" style="margin-top:8px">이번 달 모임은 다 다녀왔어요.</div>`}`, (w) => w.querySelectorAll("[data-hb]").forEach((b) => b.onclick = () => { closeWin(); doAct("hb_go", b.dataset.hb); }));
}
function pickFor(id) {
  const a = D.ACTIONS[id];
  if (a.pick === "stat") {
    openWin(`<h2>${esc(a.n)} <button class="x" data-close>✕</button></h2><p class="muted small">공부형은 100%, 경험형은 30%만 올라요. 매력·체력은 몸과 생활로.</p><div class="pick">${D.STAT_KEYS.filter((k) => D.STAT_KIND_N[D.STAT_KIND[k]].study > 0).map((k) => `<button data-pick="${k}"><b>${D.STATS[k]} <span class="kindtag ${D.STAT_KIND[k]}">${D.STAT_KIND_N[D.STAT_KIND[k]].n}${D.STAT_KIND[k] === "exp" ? " 30%" : ""}</span></b><span class="muted">지금 ${Math.round(S.st[k])} · ${E.statZone(S.st[k]).n}${E.brkOn(S, k) ? " · 돌파 중" : ""}</span><span class="tiny muted">${STAT_USE[k]}</span></button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  } else if (a.pick === "beauty") {
    openWin(`<h2>꾸미기 · 매력 관리 <button class="x" data-close>✕</button></h2><div class="acts" style="padding:0">${D.BEAUTY.map((b) => `<button class="actrow" data-pick="${b.k}"><div class="ic">${ic("spark")}</div><div class="grow"><div class="t">${b.n} <span class="gold small">${won(-b.cash)}</span></div><div class="d">${b.desc}</div><div class="chips"><span class="p">매력 +${b.charm}</span>${b.talk ? `<span class="p">말빨 +${b.talk}</span>` : ""}</div></div><span class="ap">⚡1</span></button>`).join("")}</div><p class="muted small">지금 매력 ${Math.round(S.st.charm)} · 행동력 ${S.ap}/${S.apMax} · 현금 ${won(S.cash)}</p>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
  } else if (a.pick === "district") { ui.page = "pr"; ui.prFlow = { step: "district" }; render(); }
  else if (a.pick === "decor") { const rm = S.pr.rooms[0]; if (!rm) return toast([], "지점이 없어요"); ui.prFlow = { step: "decor", id: rm.id, picks: { ...rm.decor } }; go("pr"); }
  else if (a.pick === "quiz") quizWin(id);
  else if (a.pick === "ucarea") openWin(`<h2>어느 상권을 볼까요? <button class="x" data-close>✕</button></h2><div class="pick">${Object.entries(D.UC_AREAS).map(([k, A]) => `<button data-pick="${k}"><b>${esc(A.n)}</b><span class="tiny muted">유동인구 ${"●".repeat(Math.round(A.traffic * UC.weekendF(A) * 3))} · 월세 ${A.rent[0]}~${A.rent[1]}만(10평) · 경쟁 ${A.comp}곳</span><span class="tiny muted">${esc(A.tip)}</span>${A.risk ? `<span class="tiny bad">⚠ ${esc(A.risk)}</span>` : ""}</button>`).join("")}</div>`, (el) => el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { closeWin(); doAct(id, b.dataset.pick); }));
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

// ───────── 배경 음악 자리(11-23) ─────────
// 게임 밖 title / 실패 엔딩 over / 엔딩 ending / 만남·인물 이야기·결혼·가족 장면 love / 연체 crisis / 투잡 탐색·투잡 보드 board / 나머지 home
const bgmLove = (sc) => !!sc && (((sc.kind === "meet" || sc.kind === "arc") && !!E.CHAR[sc.who] && E.isRomanceable(S, E.CHAR[sc.who])) || sc.kind === "wedding" || sc.tag === "가족" || sc.onChoose === "baby" || sc.onChoose === "fam_oppose" || sc.cine === "lover" || sc.title === "아이가 태어났다");
function bgmSlot() {
  if (!S) return "title";
  if (S.over || S.ended) return S.over || (S.ended === "age" && !S.fireAt) ? "over" : "ending";
  if (bgmLove(S.pending)) return "love";
  if (S.debtLate > 0 || S.pending?.warn) return "crisis"; // 11-23 WARNING 장면도 위기 곡
  if (ui.page === "sj" || D.SIDEJOBS[ui.page] || REG.get(ui.page)) return "board";
  return "home";
}
let bgmQ = false; // 한 흐름에서 여러 번 불려도(장면 사이의 render 등) 마지막 자리로 한 번만 바꾼다
function bgmGo() { if (bgmQ) return; bgmQ = true; queueMicrotask(() => { bgmQ = false; try { BGM.play(bgmSlot()); } catch (e) {} }); }

// ───────── 그리기 ─────────
function render() {
  bgmGo();
  if (!S) return renderTitle();
  if (S.over || S.ended) return renderEnding();
  if (!unlocked(ui.page)) ui.page = "home";
  const dk = (pg, d) => pg + "|" + (d.dataset.fk || d.querySelector("summary")?.textContent || "").replace(/[\d,.]+/g, "#"), oldPg = document.body.dataset.page, openK = new Set([...$app.querySelectorAll("details[open]")].map((d) => dk(oldPg, d))); // 정리(v4.27)
  document.body.dataset.page = ui.page; // 투잡 화면마다 색·분위기가 바뀐다(style.css v4.15)
  S.tileSeen = S.tileSeen || {}; if (!S.tileSeen[ui.page] && PAGE_TIP[ui.page] && S.t < 12) ui.tip = ui.page; else if (ui.tip !== ui.page) ui.tip = null; // 첫 방문 한 줄 안내(v4.31): 그 화면을 떠나면 사라진다
  S.tileSeen[ui.page] = 1;
  const pages = { home: pgHome, map: pgMap, people: pgPeople, me: pgMe, sj: pgSJ, co: pgCo, hobby: pgHobby, family: pgFamily, pr: pgPR, cs: pgCS, insta: pgInsta, grad: pgGrad, airbnb: pgAirbnb, ucafe: pgUcafe, ...PLUG_PAGES };
  $app.innerHTML = top() + pager() + `<div class="page ${ui.dir > 0 ? "inR" : ui.dir < 0 ? "inL" : ""}">${ui.tip === ui.page ? `<div class="coach tjx-tip"><b>${ic("info")}${esc(PAGE_N[ui.page] || "")} 처음이죠?</b><div class="small" style="margin-top:4px;line-height:1.6;padding-right:4px">${PAGE_TIP[ui.page]}</div><button class="x" data-tipx>알겠어요</button></div>` : ""}${pages[ui.page]()}</div>` + nav();
  ui.dir = 0;
  if (openK.size) $app.querySelectorAll("details:not([data-fk])").forEach((d) => { if (openK.has(dk(ui.page, d))) d.open = true; });
  bind();
  mgWarm(ui.page);
  if (S.pending && !$modal.innerHTML) setTimeout(() => { if (S && S.pending && !S.over && !S.ended && !$modal.innerHTML && !document.querySelector(".cine")) showScene(); }, 0);
}
// 화면 첫 방문 한 줄 안내(v4.31): 시작 안내 창에 몰려 있던 설명을 그 화면에서 보여 준다
const PAGE_TIP = {
  map: "동네를 누르면 장소와 그곳 사람들이 보여요. <b>'???'</b>에게 말을 걸면 인연이 돼요.",
  co: "평가는 해마다 12월(연말 결산 때), 대부분 B예요. 연봉은 천천히 오르고, 지방 발령이나 구조조정 같은 일도 생겨요.",
  sj: "정해진 투잡은 없어요. 회사 소문, 너튜브, 취미에서 발견하고 두 개까지 할 수 있어요. 안 해도 괜찮아요.",
  me: "<b>스태미너</b>는 행동을 하면 줄고, 많이 쓰면 다음 달 행동력도 줄어요. 운동과 취미로 체력을 키워 두면 나중에 편해요.",
  hobby: "취미에서 인연을 만나고 투잡 단서를 주워들어요. 회사·취미·투잡 화면은 오른쪽 위 <b>전체 메뉴</b>에 다 있고, 왼쪽 위 <b>뒤로</b>는 방금 본 화면으로 가요.",
};
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
  if (REG.get(k)) return SJ.isActive(S, k);
  return false;
}
const PAGE_N = { ...Object.fromEntries(D.HUB.flat().map((x) => [x.k, x.n])), people: "사람들" }; // 하단 탭 이름과 맞춤(v4.31)
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
  if (REG.get(k)) { try { return UJ[k]?.tile ? String(UJ[k].tile(S)) : "하는 중"; } catch (e) { return ""; } }
  return "준비 중 18";
}
const TILE_NEW = { people: "cafe", map: "alley", home: "home", sj: "popup", me: "home", co: "desk", hobby: "rooftop", family: "apt", pr: "partyroom", insta: "online", airbnb: "airbnb", ucafe: "ucafe", grad: "library", cs: "consult" };
for (const [k, b] of Object.entries(TILE_NEW)) if (TILE[k] && BG.has(b)) TILE[k].bg = `img/bg/${b}.webp`;
function openHub() {
  const lockL = D.HUB.flat().filter(({ k }) => !unlocked(k));
  const rows = D.HUB.map((row) => row.filter(({ k }) => unlocked(k))).filter((row) => row.length).map((row) => `<div class="hrow">${row.map(({ k, n }) => {
    const on = unlocked(k), t = TILE[k], cur = k === ui.page, isNew = on && !S.tileSeen?.[k];
    return `<button class="tile ${on ? "" : "locked"} ${cur ? "cur" : ""}" ${on ? `data-hgo="${k}"` : `data-hlock="${k}"`}>
      <div class="tv" style="${on && t.bg ? `background-image:linear-gradient(180deg,#0e102055,#0e1020dd),url(${t.bg})` : ""}">${on ? `${ic(t.ic)}<span>${esc(tileInfo(k))}</span>` : ""}${isNew ? '<em class="nbadge">NEW</em>' : ""}</div>
      <div class="tl">${on ? "" : ic("lock", "#f5c04e")}${esc(PAGE_N[k] || n)}</div></button>`;
  }).join("")}</div>`).join("");
  $modal.innerHTML = `<div class="hub"><div class="hhead"><b>전체 메뉴</b><span class="muted small">누르면 그 화면으로 가요</span><button class="btn sm" data-hset>설정</button><button class="x" data-hclose>✕</button></div><div class="hgrid">${rows}${lockL.length ? `<div class="tjx-hlock"><div class="tiny muted">아직 잠긴 곳 ${lockL.length}</div>${lockL.map(({ k, n }) => `<button data-hlock="${k}">${ic("lock", "#f5c04e")}<b>${esc(PAGE_N[k] || n)}</b><span>${esc(TILE[k]?.lock || "")}</span></button>`).join("")}</div>` : ""}</div></div>`;
  $modal.querySelector("[data-hset]").onclick = () => settingsWin();
  $modal.querySelector("[data-hclose]").onclick = closeWin;
  $modal.querySelectorAll("[data-hgo]").forEach((b) => b.onclick = () => { closeWin(); go(b.dataset.hgo); });
  $modal.querySelectorAll("[data-hlock]").forEach((b) => b.onclick = () => toast([], `🔒 ${PAGE_N[b.dataset.hlock]}: ${TILE[b.dataset.hlock]?.lock || "아직 잠겨 있어요"}`));
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
    ${(() => { const rw = E.runway(S), used = S.loans.find((l) => l.n === "신용대출")?.amt || 0; if (!(rw.late || rw.months <= 12 || used > 0)) return ""; const red = rw.late || rw.months <= 3; return `<button class="runway ${red ? "bad" : "warn"}" data-money>${rw.late ? `⚠ 카드값 연체 ${rw.late}개월째 · ${3 - rw.late}달 더 밀리면 개인회생` : `${rw.months === Infinity ? "흑자 중" : `버틸 수 있는 달 <b>${rw.months}개월</b>`} · 남은 신용 한도 <b>${won(rw.credit)}</b>${used ? ` · 신용대출 ${won(used)}` : ""}`}</button>`; })()}
    ${ui.page === "home" || ui.page === "family" ? relChips() : ""}<div class="apbar" data-apinfo><span class="lab">${ic("bolt")}이번 달 행동력</span><div class="bar"><i style="width:${apPct}%"></i></div><span class="num">${S.ap}/${S.apMax}</span>${BMX.qaOn() ? `<span class="tag red" style="margin-left:4px">QA</span>` : ""}${BMX.bmOn() ? `<button class="a6ap-plus" data-bmap aria-label="행동력 채우기">+</button>` : ""}<span class="hp">스태미너 <b>${Math.round(S.hp)}</b></span></div></div>`;
}
// 위쪽 왼쪽 관계 얼굴(v4.25): 배우자·연인·아이. 누르면 그 사람 창(아이는 가족 화면)
function relChips() {
  const L = [];
  for (const [id, x] of Object.entries(S.rel)) if ((x.spouse || x.lover || x.affair) && E.CHAR[id]) L.push(`<button class="rchip${x.affair ? " sec" : ""}" data-char="${id}"><span class="rf">${img(faceSrc(id, exprFor(id)))}</span><span class="rt"><b>${esc(E.CHAR[id].name)}</b><i>${x.affair ? `비밀 · 의심 ${Math.round(S.fam.affair?.sus || 0)}` : `${x.spouse ? "배우자" : "연인"} · ♥${Math.round(x.aff)}`}</i></span></button>`);
  if (S.fam.kids.length) L.push(`<button class="rchip kid" data-rkid><span class="rf">👶</span><span class="rt"><b>아이 ${S.fam.kids.length}</b><i>가족 행복 ${Math.round(S.fam.happy)}</i></span></button>`);
  return L.length ? `<div class="rchips">${L.join("")}</div>` : "";
}
// 위쪽 숫자를 누르면 나오는 자세한 돈 상황
function moneyWin() {
  const f = E.fireInfo(S), net = S.lastNet ?? 0, left = Math.max(0, Math.ceil((RD.endAgeOf(S) - S.age) * 12)), goal = S.fam.spouse ? 40 : 30;
  const row = (k, v, cls = "", sub = "") => `<tr><th>${k}</th><td class="${cls}">${v}${sub ? `<div class="tiny muted">${sub}</div>` : ""}</td></tr>`;
  openWin(`<h2>내 돈 상황 <button class="x" data-close>✕</button></h2><table class="mtab">
    ${row("현금", won(S.cash), "", "지금 바로 쓸 수 있는 돈")}
    ${row("지난달 손익", (net >= 0 ? "+" : "") + won(net), net >= 0 ? "good" : "bad", "월급·투잡 수입에서 생활비·이자를 뺀 돈")}
    ${row("투잡 월수익", won(S.hist.at(-1)?.side || 0))}
    ${row("대출", won(E.debt(S)), E.debt(S) ? "bad" : "")}
    ${row("순자산", won(f.nw), "gold", "현금 + 투자 + 집 − 대출")}
    ${row("목표까지", Math.round(f.ratio * 100) + "%", f.ready ? "good" : "", `목표: ${RD.isR1(S) ? `1회차는 34세 결산 등급(${RD.RD.grades.map(([g, v]) => `${v / 10000}억 ${g}`).join("·")}). 본 게임은 ` : ""}${RD.RD.end}세까지 순자산 ${goal}억 (결혼하면 40억)`)}
    ${row("게임 끝까지", left + "개월", "", `${RD.endAgeOf(S)}세에 ${RD.isR1(S) ? "1회차를" : "인생을"} 결산해요`)}
    ${row("인물도감", `${Object.keys(S.rel).length} / ${CHARS_N}명`)}
  </table><button class="btn" style="width:100%;margin-top:10px;padding:11px" data-mgo="me">투자·대출 하러 가기 ›</button>`, (w) => w.querySelector("[data-mgo]").onclick = () => { closeWin(); go("me"); });
}
function apWin() {
  openWin(`<h2>${ic("bolt", "#f5c04e")} 행동력이 뭐예요? <button class="x" data-close>✕</button></h2><div class="intro">
    <p>한 달에 할 수 있는 <b class="gold">행동 횟수</b>예요. 이번 달 <b class="gold">${S.ap}번</b> 남았어요.</p>
    <p>버튼에 붙은 <b class="gold">⚡1</b>, <b class="gold">⚡2</b>는 그 행동에 드는 행동력이에요.</p>
    <p>다 쓰면 <b>다음 달</b>을 눌러요. 남겨도 괜찮지만 다음 달로 넘어가지는 않아요.</p>
    <p><b class="good">스태미너</b>는 행동할수록 줄고, 많이 줄면 다음 달 행동력도 줄어요. 매달 <b>최대 스태미너의 40%</b>가 저절로 차요(지금 약 ${Math.round(S.hpMax * 0.4)}). 운동으로 체력을 키우면 최대치와 회복량이 같이 늘어요. 2~3달에 한 번쯤 '푹 쉬기'.</p></div>`);
}
function nav() {
  const td = E.todos(S).filter((t) => t.lv >= 2).length;
  const it = [["home", "홈", "home"], ["map", "지도", "map"], ["people", "사람들", "users"], [S.sj.open ? "sj" : "co", S.sj.open ? "투잡" : "회사", S.sj.open ? "search" : "brief"], ["me", "나·돈", "user"]];
  return `<div class="nav"><div class="in">${it.map(([k, n, i]) => `<button class="${ui.page === k ? "on" : ""} ${unlocked(k) ? "" : "off"}" data-go="${k}">${ic(i)}${n}${k === "home" && td ? `<span class="badge">${td}</span>` : ""}</button>`).join("")}</div></div>`;
}
function meter(v, max, color) { return `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${color}"></i></div>`; }
function hearts(aff) { const n = Math.round(aff / 20); return `<span class="hearts">${"♥".repeat(n)}${"♡".repeat(5 - n)}</span>`; }

// 홈
// 첫 3개월 탐색 가이드(v4.25): 권하는 말투로 방향만 준다
// 궁합 카드(11-24): 이해도 100%가 된 투잡마다 내 역량·특성과 얼마나 맞는지, 무엇을 키우면 좋은지
function fitCardHtml(k, withStart) {
  const c = SJ.fitCard(S, k); if (!c) return "";
  const col = { S: "var(--gold)", A: "var(--green)", B: "var(--blue)", C: "var(--orange)", D: "var(--red)" }[c.g];
  return `<div class="a6fc" style="--fc:${col}"><div class="a6fc-h"><div class="a6fc-g">${c.g}</div><div class="grow"><b>${esc(c.n)}</b><div class="tiny muted">${esc(c.inc)} · ${esc(c.hours)} · 자본 ${esc(c.cap)}</div><div class="small" style="margin-top:2px">${esc(c.line)}</div></div></div>
    <div class="a6fc-t">내 역량</div>${c.stats.map((x) => `<div class="a6fc-r"><span>${esc(x.n)} <i class="tiny muted">궁합의 ${x.w}%</i></span><b>${x.v}</b>${meter(x.v, 100, "var(--fc)")}</div>`).join("")}
    <div class="a6fc-t">내 특성</div>${c.links.length ? c.links.map((x) => `<div class="tiny">★ <b>${esc(x.n)}</b> · ${esc(x.t)}</div>`).join("") : `<div class="tiny muted">이 투잡과 이어지는 특성 카드는 없어요</div>`}
    <div class="a6fc-t">이 역량을 키우면 좋아요</div>${c.grow.length ? c.grow.map((x) => `<div class="tiny">▲ <b>${esc(x.n)}</b> ${x.cur} → ${x.to} <span class="muted">(${esc(x.why)})</span><br><span class="muted">방법: ${esc(x.how)}</span></div>`).join("") : `<div class="tiny good">지금 역량으로 충분해요</div>`}
    ${withStart ? `<button class="btn gold" style="width:100%;margin-top:10px" ${SJ.startLock(S) ? "data-sjno" : `data-sjstart="${k}"`} ${!SJ.startLock(S) && S.sj.active.length >= SJ.slots(S) ? "disabled" : ""}>${esc(c.n)} 시작하기</button>` : ""}</div>`;
}
function fitCardsWin() {
  const ks = Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play && SJ.isFound(S, k) && !SJ.isActive(S, k)).sort((a, b) => SJ.fit(S, b).v - SJ.fit(S, a).v);
  if (!ks.length) return toast([], "아직 이해도 100%인 투잡이 없어요");
  openWin(`<h2>궁합 카드 <button class="x" data-close>✕</button></h2><div class="small muted">이해도 100%가 된 투잡이에요. 내 역량과 특성에 얼마나 맞는지 보고 골라요. 궁합이 높은 순서예요.</div><div class="a6fcs hscroll">${ks.map((k) => fitCardHtml(k, true)).join("")}</div><div class="tiny muted" style="margin-top:6px">옆으로 밀면 다음 카드 · 더 알아본 뒤에 골라도 돼요</div>`, (w) => { w.querySelectorAll("[data-sjno]").forEach((b) => b.onclick = () => sjNo()); w.querySelectorAll("[data-sjstart]").forEach((b) => b.onclick = () => { const k = b.dataset.sjstart, r = SJ.start(S, k); closeWin(); toast(r.hid || [], r.msg); save(); if (r.ok) go(k); else render(); }); }, true);
}
function guideCard() {
  const Q = SJ.questInfo(S);
  if (Q.on) {
    const it = (ok, cur, go, t, sub) => `<button class="gd ${ok ? "ok" : ""} ${cur ? "cur" : ""}" data-go="${go}"><i>${ok ? "✓" : ""}</i><span><b>${t}</b><small>${sub}</small></span></button>`;
    return `<div class="guide"><div class="gh"><b>${ic("info")}초반 퀘스트 · 내 투잡 찾기</b><span>${Q.left ? `${S.t + 1}/${SJ.QUEST.months}개월` : "천천히 해도 돼요"}</span></div>
      ${it(Q.info >= SJ.QUEST.info, Q.step === 1, "co", `① 투잡 정보를 ${SJ.QUEST.info}개 모으세요`, `${Math.min(Q.info, SJ.QUEST.info)}/${SJ.QUEST.info} · 회사에도 있어요: 탕비실 수다·동료와 점심·회식에서 소문이 들려요`)}
      ${Q.step === 1 ? `<div class="a6q-tip">어디로 가 볼까요? <button data-go="co">회사</button><button data-go="hobby">취미 모임</button><button data-go="map">지도 장소</button><button data-go="people">사람들</button><button data-go="sj">리포트·너튜브</button></div>` : ""}
      ${it(Q.cands >= SJ.NEED_CANDS, Q.step === 2, "sj", `② 그중 둘은 100%까지 파고드세요`, `${Math.min(Q.cands, SJ.NEED_CANDS)}/${SJ.NEED_CANDS} · 리포트 읽기·해 본 사람에게 묻기·선배 찾아가기가 빨라요`)}
      ${it(false, Q.step === 3, "sj", SJ.pickOpen(S) ? `③ 궁합 카드를 보고 고르세요` : `③ 궁합 카드를 보고, ${SJ.PICK.t}개월을 채운 달에 고르세요`, Q.step === 3 ? SJ.pickOpen(S) ? "카드가 준비됐어요. 내 역량·특성과 얼마나 맞는지 보여 드려요" : `카드는 지금 봐도 돼요. 고르는 날까지 ${SJ.PICK.t - S.t}달, 그동안은 회사와 취미에 집중해요` : "100%가 되면 내 역량·특성과 얼마나 맞는지 카드로 보여 드려요")}
      ${Q.step === 3 ? `<button class="btn gold" style="width:100%;margin-top:6px" data-fitcards>궁합 카드 보기</button>` : ""}
      ${Q.list.length ? `<div class="a6q-chips">${Q.list.map((x) => `<span class="${x.v >= 100 ? "full" : ""}">${esc(x.n)} ${x.v}%</span>`).join("")}</div>` : `<div class="tiny muted" style="margin-top:6px">아직 들은 투잡 얘기가 없어요</div>`}</div>`;
  }
  if (S.t >= SJ.PROBATION || S.flags.noProbation) return "";
  const fc = SJ.foundCount(S), know = Object.keys(S.sj.know || {}).length, co = S.flags.coActs || 0, hb = S.hb.joined.length;
  const it = (ok, go, t, sub) => `<button class="gd ${ok ? "ok" : ""}" data-go="${go}"><i>${ok ? "✓" : ""}</i><span><b>${t}</b><small>${sub}</small></span></button>`;
  return `<div class="guide"><div class="gh"><b>${ic("info")}첫 3개월, 이렇게 보내 보세요</b><span>${S.t + 1}/3개월</span></div>
    ${it(co >= 2, "co", "회사에도 관심을 가져 보세요~", `성과 내기·동료와 점심·탕비실 수다 ${Math.min(co, 2)}/2 · 첫인상이 연말 평가로 가요`)}
    ${it(hb >= 1, "hobby", "취미도 가져 보세요~", `취미 모임 ${Math.min(hb, 1)}/1 · 모임에서 투잡 이야기를 주워들어요`)}
    ${it(know >= 2, "map", "발품 팔아 알아보세요~", `깊게 알아본 투잡 ${Math.min(know, 2)}/2 · 지도 장소·리포트·선배 찾아가기`)}
    ${it(fc >= SJ.NEED_CANDS, "sj", "투잡 후보를 모아 보세요~", `후보 ${Math.min(fc, SJ.NEED_CANDS)}/${SJ.NEED_CANDS} · 이해도 100%면 후보, 그때 궁합·특성 연계를 보고 골라요`)}
    <div class="gf">투잡은 4개월 차부터, 후보가 ${SJ.NEED_CANDS}개 이상일 때 고를 수 있어요. 정보는 발품을 팔아야 모여요.</div></div>`;
}
function pgHome() {
  const rk = D.RANKS[S.co.rank].n, job = S.co.quit || S.co.fired ? "전업 사장님" : `${S.co.name} ${rk}`;
  const bgk = S.co.quit || S.co.fired ? (SJ.isActive(S, "cs") && !SJ.isActive(S, "pr") ? "consult" : "partyroom") : S.fam.spouse ? "apt" : [12, 1, 2].includes(S.cal) ? "home" : "desk";
  const bg = bgUrl(bgk) || (S.co.quit || S.co.fired ? "img/bg_partyroom.webp" : S.fam.spouse || [12, 1, 2].includes(S.cal) ? "img/bg_home.webp" : "img/bg_office.webp");
  const heroB = bodySrc("me", myExpr(), "full");
  const ring = [];
  if (S.fam.spouse) ring.push(S.fam.spouse);
  for (const [id, x] of Object.entries(S.rel)) if (x.lover) ring.push(id);
  // 화면 정리(v4.31): 홈 안내는 한 번에 하나. 처음엔 "이렇게 하면 돼요"만, 닫으면 첫 3개월 길잡이, 그동안 할 일은 급한 것만.
  const coachOn = S.t < 3 && !S.coachOff, gd = coachOn ? "" : guideCard();
  const tdAll = coachOn ? [] : E.todos(S).filter((t) => !gd || t.lv >= 2), urgent = tdAll.filter((t) => t.lv >= 2), td = [...urgent, ...tdAll.filter((t) => !(t.lv >= 2))].slice(0, Math.max(7, urgent.length));
  const { quick, locked } = quickActs();
  const JOBP = ["pr", "cs", "insta", "airbnb", "ucafe", ...REG.JOBS.map((P) => P.key)], jobOn = (k) => SJ.isActive(S, k);
  const places = [...JOBP.filter(jobOn), "co", "hobby", "sj", ...JOBP.filter((k) => !jobOn(k)), "grad", "family"].filter(unlocked);
  return `<div class="stage" style="background-image:url(${bg})">
    ${heroB ? img(heroB, "body hero2", "나") : img(meSrc(myExpr()), "face hero", "나")}
    <div class="when"><b>${S.year}년 ${S.cal}월</b><span>${Math.floor(S.age)}세 · ${esc(job)}</span></div>
    <div class="side">${[!S.sj.active.length ? `<span>투잡 없음 · 회사원</span>` : "", SJ.isActive(S, "pr") ? `<span>파티룸 ${S.pr.rooms.length}곳 · Lv${S.pr.lv}</span>` : "", SJ.isActive(S, "cs") ? `<span>컨설팅 Lv${S.cs.lv}${S.cs.open ? "" : " 준비 중"}</span>` : "", ...REG.JOBS.filter((P) => UJ[P.key]?.side && SJ.isActive(S, P.key)).map((P) => { try { return `<span>${esc(UJ[P.key].side(S))}</span>`; } catch (e) { return ""; } }), S.fam.kids.length ? `<span>아이 ${S.fam.kids.length}명</span>` : "", ...S.hb.joined.map((h) => `<span>${esc(D.HOBBIES[h].n)}</span>`)].filter(Boolean).slice(0, 2).join("")}</div>
    <div class="lovers">${ring.map((id) => `<button data-char="${id}">${img(faceSrc(id, "blush"))}</button>`).join("")}</div>
    <button class="a6hx" data-go="me" aria-label="능력치">${hexStats()}</button>
    <div class="news"><div class="src">투잡일보 · ${S.year}.${String(S.cal).padStart(2, "0")}</div><div class="h">${esc(S.news)}</div></div>
  </div>
  <div class="swipe2 hscroll" data-sw2><div class="strip">
    <div><div class="v good">${Math.round(S.hp)}</div><div class="k">스태미너</div>${meter(S.hp, S.hpMax, "var(--green)")}</div>
    <div><div class="v" style="color:var(--blue)">${Math.round(S.mental)}</div><div class="k">멘탈</div>${meter(S.mental, 100, "var(--blue)")}</div>
    <div><div class="v pink">${Math.round(S.st.charm)}</div><div class="k">매력</div>${meter(S.st.charm, 100, "var(--pink)")}</div>
    <div><div class="v" style="color:var(--orange)">${S.co.quit || S.co.fired ? "-" : Math.round(S.co.eye)}</div><div class="k">회사 눈치</div>${meter(S.co.eye, 100, "var(--orange)")}</div>
    <div><div class="v" style="color:var(--purple)">${S.fam.spouse ? Math.round(S.fam.happy) : Object.keys(S.rel).length}</div><div class="k">${S.fam.spouse ? "가족" : "인맥"}</div>${meter(S.fam.spouse ? S.fam.happy : Object.keys(S.rel).length, S.fam.spouse ? 100 : 40, "var(--purple)")}</div>
  </div></div>
  ${coachOn ? `<div class="coach"><b>${ic("info")}이렇게 하면 돼요</b><ol><li><b>바로 하기</b>나 <b>지도</b>에서 행동을 골라요. 행동마다 ${ic("bolt")}행동력이 줄어요.</li><li>그림 속 <b>사람을 누르면</b> 말을 걸어 인연이 돼요.</li><li>행동력을 다 쓰면 맨 아래 <b class="gold">다음 달</b>을 눌러요.</li></ol><button class="x" data-coach>알겠어요</button></div>` : ""}
  ${gd}
  ${td.length ? `<div class="sec">${ic("list")}이번 달 할 일 ${urgent.length ? `<span class="tjx-urg">급한 일 ${urgent.length}</span>` : ""}<span class="muted small">· 누르면 그곳으로 가요</span></div>${(() => { const tb = (t) => `<button class="l${t.lv}" data-todo="${esc(t.go || "")}"><span class="dot"></span><span class="grow">${esc(t.text)}</span>${t.go ? '<span class="arr">›</span>' : ""}</button>`; const n0 = Math.max(3, Math.min(urgent.length, 5)); return `<div class="todo">${td.slice(0, n0).map(tb).join("")}</div>${more(`더 보기 ${td.length - n0}`, td.length > n0 ? `<div class="todo">${td.slice(n0).map(tb).join("")}</div>` : "")}`; })()}` : ""}
  <div class="sec">${ic("pin")}내 장소 <span class="muted small">· 눌러서 들어가요</span></div>
  <div class="places hscroll">${places.map((k) => `<button data-go="${k}" style="background-image:linear-gradient(180deg,#0e102033,#0e1020ee),url(${TILE[k].bg})">${ic(TILE[k].ic)}<b>${esc(PAGE_N[k])}</b><span>${esc(tileInfo(k))}</span>${!S.tileSeen?.[k] ? '<em class="nbadge">NEW</em>' : ""}</button>`).join("")}<button data-hub class="more">${ic("grid")}<b>전체 메뉴</b><span>잠긴 곳 ${D.HUB.flat().filter(({ k }) => !unlocked(k)).length}</span></button></div>
  <div class="sec">${ic("bolt")}바로 하기 <span class="muted small">· ⚡숫자만큼 행동력을 써요</span></div>
  <div class="grid4">${quick.map((id) => { const a = D.ACTIONS[id]; const why = a.pick ? null : E.canAct(S, id, defaultArg(id)); return `<button data-act="${id}" class="${why ? "qno" : ""}" ${why ? `data-why="${esc(why)}"` : ""}>${ic(ACT_IC[id])}${esc(a.n)}${why ? `<span class="tiny why">${esc(why)}</span>` : `<span class="ap">⚡${a.ap}</span>`}</button>`; }).join("")}${locked.map(([id, why]) => `<button class="qlock" data-qlock="${esc(why)}">${ic("lock", "#f5c04e")}${esc(D.ACTIONS[id].n)}<span class="tiny muted">${esc(why)}</span></button>`).join("")}</div>
  <div class="next"><button class="btn" data-go="me">${ic("chart")}<span class="nx"><span>투자·대출</span><span class="gold small">${won(S.invest)}</span></span></button><button class="btn gold ${S.ap <= 0 ? "pulse" : ""}" data-end><span><span class="nt">다음 달 ${ic("next", "#2a1a00")}</span><small>${S.ap > 0 ? `행동력 ${S.ap} 남음` : "이번 달 끝! 넘어가요"}</small></span></button></div>`;
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
    ...REG.JOBS.filter((P) => UJ[P.key]?.quick && SJ.isActive(S, P.key)).map((P) => { let id = null; try { id = UJ[P.key].quick(S); } catch (e) {} return [id && D.ACTIONS[id] ? id : null, () => true, ""]; }),
    ["hb_go", () => S.hb.joined.length > 0, "취미에 가입하면"],
    ["co_lunch", () => !quit && S.t >= 1, "2달째부터"],
    [S.t < 12 ? "sj_youtube" : null, () => S.sj.open && S.sj.active.length < 2, !S.sj.open ? "투잡 탐색이 열리면" : "투잡 2개 진행 중 · 하나를 접으면"],
    [S.fam.spouse || S.fam.kids.length ? "family_time" : "dating_app", () => S.fam.spouse || S.t >= 3 || nRel >= 3, "인연 3명 또는 4달째"],
    ["beauty", () => S.t >= 2, "3달째부터"],
    ["co_project", () => !quit && (S.co.rank >= 1 || S.t >= 6), "7달째부터"],
    ["cafe_work", () => S.sj.active.length > 0, "투잡을 시작하면"],
    ["co_resume", () => !quit && S.t >= 12, "1년이 지나면"],
    ["drink", () => S.t >= 2, "3달째부터"],
  ].filter(([id]) => id);
  const quick = [], locked = [];
  for (const [id, ok, why] of L) { if (ok()) { if (quick.length < 8) quick.push(id); } else if (locked.length < 1 && quick.length + locked.length < 10) locked.push([id, why]); /* 정리(v4.27): 다음에 열리는 것 1개만 */ }
  return { quick, locked };
}
function defaultArg(id) {
  if (id === "hb_go") return S.hb.joined.find((h) => S.hb.lastT[h] !== S.t) || S.hb.joined[0];
  { const P = REG.byAct(id); if (P) return UJ[P.key]?.defaultArg ? UJ[P.key].defaultArg(S, id) : undefined; }
  if (id === "pr_manage" || id === "pr_promo") { const rm = S.pr.rooms.filter((r) => r.status === "open").sort((a, b) => (a.ap - PR.needAp(S, a)) - (b.ap - PR.needAp(S, b)))[0]; return rm?.id; }
  return undefined;
}

// 지도
const REGION_BG0 = { town: "img/bg_home.webp", company: "img/bg_office.webp", univ: "img/keyvisual.webp", hot: "img/bg_insta.webp", officest: "img/bg_office.webp", club: "img/keyvisual.webp", online: "img/bg_insta.webp", newtown: "img/bg_home.webp", parents: "img/bg_home.webp" };
const REGION_NEW = { town: "cafe", company: "desk", univ: "gate", hot: "popup", officest: "alley", club: "pub", online: "online", newtown: "apt", parents: "parents" };
const REGION_BG = new Proxy(REGION_BG0, { get: (o, k) => bgUrl(REGION_NEW[k]) || o[k] });
const REGION_TINT = { town: "#3b2a5a", company: "#22324f", univ: "#4a2b3e", hot: "#5a2a4a", officest: "#24304a", club: "#21413a", online: "#2c2a55", newtown: "#3a3a2a", parents: "#463225" };
function regionPeople(rg) { return rg.spots.flatMap((sp) => S.spot[sp.id] || []); }
// ── 도시 맵(11-24): 계절 그림 위에 장소 핀·얼굴·느낌표. 느낌표는 달마다 8~10개, 하나에 행동력 1이라 다 할 수는 없다
const mapSeason = () => (S.cal === 12 ? "xmas" : S.cal <= 2 ? "winter" : S.cal <= 5 ? "spring" : S.cal <= 8 ? "summer" : "fall");
const SPOT_OF = Object.fromEntries(D.REGIONS.flatMap((rg) => rg.spots.map((sp) => [sp.id, { rg: rg.id, loc: sp.loc, n: sp.n }])));
const bangsAt = (f) => (S.bangs || []).filter((b) => f(SPOT_OF[b.sp] || {}, b));
function bangCards(L) {
  if (!L.length) return "";
  return `<div class="a6bg">${L.map((b) => `<button class="a6bg-c" data-bang="${b.id}"><i>!</i><span><b>${esc(b.title)}</b><small>${esc(b.spN || "")} · 이번 달에만${(S.spot[b.sp] || []).length ? " · 거기 있는 사람과도 인사해요" : ""}</small></span><em>⚡${E.BANG.ap}</em></button>`).join("")}</div>`;
}
function cityMap() {
  const P = MAPD.pins || {}, file = MAPD.files?.[mapSeason()] || MAPD.files?.fall;
  const town = D.REGIONS.find((r) => r.id === "town"), nt = D.REGIONS.find((r) => r.id === "newtown"), ntLock = nt?.unlock && !nt.unlock(S);
  const facesAt = (ids) => ids.flatMap((sid) => S.spot[sid] || []);
  const pin = (key, label, attr, spotIds, bangs, lock) => { const xy = P[key]; if (!xy) return ""; const ppl = lock ? [] : facesAt(spotIds), n = lock ? 0 : bangs.length;
    return `<button class="a6mp-pin ${lock ? "lock" : ""} ${n ? "has" : ""}" style="left:${xy[0]}%;top:${xy[1]}%" ${attr} ${lock ? "disabled" : ""}>${n ? `<i class="bang">!${n > 1 ? `<small>${n}</small>` : ""}</i>` : ""}<span class="fc">${ppl.slice(0, 3).map((id) => S.rel[id] ? img(faceSrc(id, exprFor(id))) : `<u>?</u>`).join("")}</span><b>${esc(label)}</b></button>`; };
  const pins = [
    ...town.spots.map((sp) => pin(sp.loc, sp.n, `data-region="town" data-spot="${sp.id}"`, [sp.id], bangsAt((q, b) => b.sp === sp.id))),
    S.co.quit || S.co.fired ? "" : pin("office", S.co.name || "회사", `data-go="co"`, D.REGIONS.find((r) => r.id === "company").spots.map((x) => x.id), bangsAt((q) => q.rg === "company")),
    ...["officest", "univ", "hot"].map((rid) => { const rg = D.REGIONS.find((r) => r.id === rid); return rg ? pin(rid === "hot" ? "hotplace" : rid, rg.n, `data-region="${rid}"`, rg.spots.map((x) => x.id), bangsAt((q) => q.rg === rid)) : ""; }),
    nt ? pin("newtown", nt.n, `data-region="newtown"`, nt.spots.map((x) => x.id), bangsAt((q) => q.rg === "newtown"), ntLock) : "",
    S.hb?.joined?.length || unlocked("hobby") ? pin("hobby", "취미 모임", `data-go="hobby"`, [], []) : "",
  ].join("");
  const all = (S.bangs || []).length, can = Math.floor(S.ap / E.BANG.ap);
  const off = ["online", "parents"].map((rid) => { const rg = D.REGIONS.find((r) => r.id === rid); if (!rg || (rg.unlock && !rg.unlock(S))) return ""; const n = bangsAt((q) => q.rg === rid).length; return `<button class="btn sm" data-region="${rid}">${esc(rg.n)}${n ? ` <b class="gold">!${n}</b>` : ""}</button>`; }).join("");
  return `<div class="a6mp" style="aspect-ratio:${MAPD.w || 2}/${MAPD.h || 3};background-image:url(${file})">${pins}<div class="a6mp-top"><span>${S.year}년 ${S.cal}월 · ${{ spring: "봄", summer: "여름", fall: "가을", winter: "겨울", xmas: "12월" }[mapSeason()]}</span></div></div>
    <div class="a6mp-bar"><span><b class="gold">느낌표 ${all}개</b> · 지금 행동력으로 ${Math.min(all, can)}개쯤 갈 수 있어요</span>${BMX.bmOn() ? `<button class="btn sm" data-bmap>행동력 채우기</button>` : ""}</div>
    ${off ? `<div class="row wrap" style="margin-top:6px"><span class="tiny muted">지도 밖:</span>${off}</div>` : ""}
    ${more(`이번 달 느낌표 모두 보기 (${all})`, bangCards(S.bangs || []))}
    <div class="tiny muted" style="margin-top:6px">느낌표는 이번 달에만 뜨는 일이에요. 하나에 행동력 ${E.BANG.ap}. 다 할 수는 없으니 골라서 가요. 건물을 누르면 그곳에서 늘 할 수 있는 일도 나와요.</div>`;
}
function pgMap() {
  if (ui.region) return pgRegion(D.REGIONS.find((r) => r.id === ui.region));
  if (MAPD.files && Object.keys(MAPD.pins || {}).length >= 6) return cityMap();
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
  const gm = S.gainMemo?.[id]; // 11-24 지난번에 실제로 오른 숫자
  if (gm) for (const [k, v] of Object.entries(gm)) c.push(`<span class="p">${D.STATS[k]} +${(+v).toFixed(1)}</span>`);
  else if (a.stat) for (const [k, v] of Object.entries(a.stat)) c.push(v > 0 ? `<span class="p">${D.STATS[k]} +${v}</span>` : `<span class="m">${D.STATS[k]} ${v}</span>`);
  else if ((a.ap || 0) >= 1 && !a.gain) c.push(`<span class="p">역량 +</span>`);
  if (a.gain) c.push(`<span class="p">능력치 +${a.gain}</span>`);
  return c.join("");
}
function actRow(id, arg, label) {
  const a = D.ACTIONS[id]; const why = a.pick && arg === undefined ? (a.need && !a.need(S) ? "지금은 할 수 없음" : null) : E.canAct(S, id, arg);
  return `<button class="actrow" data-act="${id}" ${arg !== undefined ? `data-arg="${esc(arg)}"` : ""} ${why ? `data-why="${esc(why)}" style="opacity:.5"` : ""}><div class="ic">${ic(ACT_IC[id])}</div><div class="grow"><div class="t">${esc(label || a.n)}</div><div class="d">${esc(why || a.desc)}</div><div class="chips">${actChips(id)}</div></div><span class="ap">⚡${a.ap}</span></button>`;
}
// 행동력·스태미너·돈 부족 같은 '지금만' 이유는 빼고 본 잠금 이유
function lockWhy(id, arg) { const a = D.ACTIONS[id]; if (!a) return "없음"; if (a.pick && arg === undefined) return a.need && !a.need(S) ? "잠김" : null; try { return E.canAct({ ...S, ap: 999, hp: 9999, cash: 1e15, pending: null }, id, arg); } catch (e) { return null; } }
function actRows(L) { let shown = 0; return L.filter(Boolean).map((x) => { const [id, arg, label] = [].concat(x); if (!lockWhy(id, arg)) return actRow(id, arg, label); return shown++ ? "" : actRow(id, arg, label); }).join(""); }
function visibleAct(id) { { const P = REG.byAct(id); if (P) return SJ.isActive(S, P.key); } if (/^pr_/.test(id)) return SJ.isActive(S, "pr"); if (/^cs_/.test(id)) return SJ.isActive(S, "cs"); if (/^in_/.test(id)) return SJ.isActive(S, "insta"); if (/^ab_/.test(id)) return SJ.isActive(S, "airbnb"); if (/^uc_/.test(id)) return SJ.isActive(S, "ucafe"); if (id === "grad_class") return !!(S.grad && !S.grad.done); if (/^co_|work_hard|overtime|office_chat|company_dinner/.test(id)) return !(S.co.quit || S.co.fired); return true; }
// 장소 무대: 그 장소 그림 위에 오늘 와 있는 사람들이 서 있다. 누르면 인물 창(말 걸기).
function personFig(id, i, n) {
  const c = E.CHAR[id], x = S.rel[id];
  const expr = x ? exprFor(id) : "neutral";
  const src = bodySrc(id, expr, "full");
  const tag = !x ? `<span class="say">말 걸기 ⚡1</span>` : x.spouse ? `<span class="say love">배우자</span>` : x.lover ? `<span class="say love">연인</span>` : `<span class="say h">${"♥".repeat(Math.max(1, Math.round(x.aff / 20)))}</span>`;
  const fig = src ? bodyImg(id, src, 100) : `<span class="pface">${img(faceSrc(id, expr), "face", "")}</span>`;
  return `<button class="pfig ${!x ? "new" : ""} ${src ? "" : "noart"}" data-char="${id}" style="--i:${i};--n:${n}">${fig}<span class="pn">${x ? esc(c.name) : "???"}</span>${tag}</button>`;
}
function placeStage(bgKey, title, ppl, sub, extraCls = "") {
  const bg = bgUrl(SPOT_BG[bgKey] || bgKey);
  // 화면 정리(v4.31): 한 장면에 4명까지. 더 있으면 위쪽 "+N명" 칩을 눌러 다음 사람들을 본다.
  ui.stOff = ui.stOff || {}; const off = ppl.length > 4 ? (ui.stOff[bgKey] || 0) % ppl.length : 0;
  const show = ppl.length > 4 ? Array.from({ length: 4 }, (_, i) => ppl[(off + i) % ppl.length]) : ppl;
  return `<div class="pstage ${extraCls} ${show.length ? "" : "empty"}" style="${bg ? `background-image:url(${bg})` : ""}">
    <div class="ptop"><b>${title}</b><span>${sub ?? (ppl.length ? `${ppl.length}명 있음` : "오늘은 조용함")}</span></div>
    <div class="crowd">${show.map((id, i) => personFig(id, i, show.length)).join("")}</div>
    ${ppl.length > 4 ? `<button class="more tjx-stmore" data-stmore="${esc(bgKey)}">+${ppl.length - 4}명 · 다음 사람 ›</button>` : ""}</div>`;
}
function spotBlock(sp) { const ppl = S.spot[sp.id] || []; return `<div class="spot pl">${placeStage(sp.id, esc(sp.n), ppl)}<div class="acts">${sp.acts.filter(visibleAct).map((id) => actRow(id, defaultArg(id))).join("")}</div></div>`; }
function personCard(id) {
  const c = E.CHAR[id], x = S.rel[id];
  const role = !x ? "새 얼굴" : x.spouse ? "배우자" : x.lover ? "연인" : x.helper ? (c.helper?.role || "조력자") : c.job;
  return `<button class="person ${!x ? "new" : x.lover || x.spouse ? "love" : ""}" data-char="${id}"><div class="pic">${img(faceSrc(id, x ? exprFor(id) : "neutral"))}</div><div class="nm">${x ? esc(c.name) : "???"}</div><div class="rl">${esc(role)}${x?.deja ? " · 전생 인연" : ""}</div>${x ? hearts(x.aff) : `<span class="tag gold">말 걸기 ⚡1</span>`}</button>`;
}
function pgRegion(rg) {
  const curSp = rg.spots.find((x) => x.id === ui.spot) || rg.spots.find((x) => (S.bangs || []).some((b) => b.sp === x.id)) || rg.spots[0];
  const tabs = rg.spots.length > 1 && rg.id !== "town" ? `<div class="a6sp-tabs">${rg.spots.map((x) => { const n = (S.bangs || []).filter((b) => b.sp === x.id).length, pp = (S.spot[x.id] || []).length; return `<button class="${x === curSp ? "on" : ""}" data-region="${rg.id}" data-spot="${x.id}">${esc(x.n)}${n ? ` <b>!${n > 1 ? n : ""}</b>` : ""}${pp ? ` <i>${pp}명</i>` : ""}</button>`; }).join("")}</div>` : "";
  return `<div class="row"><button class="btn sm" data-region="">‹ 지도</button><b style="font-size:17px">${esc(curSp.n)}</b><span class="tiny muted" style="margin-left:6px">${esc(rg.n)}</span></div>${tabs}
  ${[curSp].map((sp) => { const ppl = S.spot[sp.id] || []; return `<div class="spot pl" data-spotbox="${sp.id}">${placeStage(sp.id, esc(sp.n), ppl)}${bangCards(bangsAt((q, b) => b.sp === sp.id))}
    <div class="acts"><div class="tiny muted">${esc(sp.n)}에서 언제든</div>${sp.acts.filter(visibleAct).map((id) => actRow(id, defaultArg(id))).join("") || '<div class="tiny muted">투잡을 시작하면 여기서 할 일이 생겨요</div>'}${sp.id === "home" ? actRow("beauty") : ""}${(S.co.quit || S.co.fired) && sp.id === "cowork" ? actRow("rejob") : ""}</div></div>`; }).join("")}`;
}

// 투잡
const SJ_BG = { pr: "partyroom", cs: "consult", insta: "online", ucafe: "ucafe", airbnb: "airbnb", coffee: "cafe", popup: "popup", shortstay: "airbnb", tutoring: "online", tistory: "home", realtyblog: "realty", chicken: "pub", bouquet: "wedding", goods: "popup", aivideo: "cowork", vibe: "cowork", webnovel: "library", thesis: "library", press: "cowork", tarot: "gallery", saju: "gallery" };
const bool = (b, y, n) => (b ? y : n);
function attrs(L, full, compact) {
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
  const sp = ([t, c]) => `<span class="${c || ""}">${esc(t)}</span>`;
  if (compact) { const hot = parts.filter(([, c]) => c === "bad" || c === "q"), rest = parts.filter(([, c]) => c !== "bad" && c !== "q"); return `${hot.length ? `<div class="attrs">${hot.map(sp).join("")}</div>` : ""}${more(`매물 정보 ${rest.length}개`, `<div class="attrs">${rest.map(sp).join("")}</div>`)}`; } // 정리(v4.27)
  return `<div class="attrs">${parts.map(sp).join("")}</div>`;
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
  return `${tycoonScene(S, "pr")}${boardHead("pr")}<div class="card"><h3>파티룸 <small>Lv${pr.lv} 「${lv.n}」</small></h3>${pr.rooms.length ? `<div class="kv">
    <div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${last >= 0 ? "+" : ""}${won(last)}</div></div>
    <div><div class="k">평균 별점</div><div class="v gold">${avgR ? "★ " + avgR.toFixed(2) : "-"}</div></div>
    <div><div class="k">지점</div><div class="v">${pr.rooms.length}곳</div></div></div>
    ${more(`관리 행동력 ${r1(have)}/${r1(need)} · 노하우 ${Math.round(pr.know || 0)} · 지표 더 보기`, `<div class="kv">
    <div><div class="k">관리 행동력</div><div class="v ${have < need ? "bad" : ""}">${r1(have)}/${r1(need)}</div></div>
    <div><div class="k">운영 노하우</div><div class="v">${Math.round(pr.know || 0)}</div></div>
    <div><div class="k">규모의 경제</div><div class="v">×${D.scaleF(pr.rooms.length || 1)}</div></div>
    <div><div class="k">묶음 효과</div><div class="v ${PR.bundle(S).n >= 2 ? "good" : "muted"}">${PR.bundle(S).n >= 2 ? `예약 +${Math.round(PR.bundle(S).occ * 100)}% · 관리비 −${Math.round(PR.bundle(S).cost * 100)}%` : "2곳부터"}</div></div>
    <div><div class="k">물가</div><div class="v">×${(S.pi || 1).toFixed(2)}</div></div>
    ${pr.sold ? `<div><div class="k">매각 ${pr.sold}곳</div><div class="v good">${won(pr.soldSum)}</div></div>` : ""}</div>`)}` : ""}
    ${pr.listings.length ? `<div style="margin-top:8px"><button class="btn sm" data-prflow="list:${pr.listings[0].dk}">보던 매물 ${pr.listings.length}개 보기</button></div>` : ""}</div>
  ${(() => { const pn = SP.prPanels(spc()); return pr.rooms.length ? fold("pr-ops", `<span class="tjx-s1"><b>운영 설정</b><span class="tiny muted">가격표·후기·규모</span></span><span class="tjx-s2">${SP.prOpsSum(spc())}</span>`, `<div class="tjx-ops">${pn || peakCard()}${scalePanel()}</div>`, false, "tjx-opsbox") : ""; })()}
  ${pr.rooms.map(roomCard).join("")}
  <button class="card" style="border-style:dashed;text-align:center;padding:18px" data-prflow="district"><b class="gold" style="font-size:18px">+ ${pr.rooms.length ? "새 지점 열기" : "첫 파티룸 열기"}</b><div class="muted small">상권 고르기 → 매물 보기(행동 1) → 숨은 정보 확인 → 계약</div></button>
  ${pr.rooms.length ? "" : more("컨셉·입지 안내 자세히", prGuide(), "card")}
  ${knowPanel()}`;
}
function peakCard() {
  const pr = S.pr, p = pr.peak || 1, mx = Math.max(...D.PR_SEASON.map((x) => x.we * 24 + x.wk * 22));
  return `<div class="card"><h3>성수기 가격 <small>12월 극성수기 · 1·2·7·8월 성수기</small></h3>
    <div class="season">${D.PR_SEASON.map((x, i) => `<i class="${i + 1 === S.cal ? "now" : ""} ${PR.isPeak(i + 1) ? "pk" : ""}" style="height:${Math.round((x.we * 24 + x.wk * 22) / mx * 100)}%"></i>`).join("")}</div><div class="season-l">${D.PR_SEASON.map((_, i) => `<span>${i + 1}</span>`).join("")}</div>
    <div class="seg" style="margin-top:8px">${D.PR_PEAK.map((v) => `<button class="${p === v ? "on" : ""}" data-peak="${v}">${v === 1 ? "그대로" : `+${Math.round((v - 1) * 100)}%`}</button>`).join("")}</div>
    ${more("성수기 가격 자세히", `<div class="tiny muted">12월엔 주말이 다 차고 평일도 차요. 비싸도 손님이 오니 이때 가격을 올리는 게 핵심이에요. 너무 올리면 공실이 생겨요. 1·2·7·8월에는 고른 인상폭의 절반이 붙고, 나머지 달은 지점별 기본 가격 그대로예요.${pr.rooms[0] ? ` 예) ${esc(pr.rooms[0].name)} 12월 1건 ${Math.round(pr.rooms[0].price * p)}만` : ""}</div>`)}</div>`;
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
    ${more("노하우·엑시트 자세히", `<div class="tiny muted">노하우가 쌓이면 별점이 오르고(최대 +0.25), 운영비가 줄고(최대 −20%), 관리 행동력도 줄어요. 운영하면서 40까지 저절로 오르고, 그 위는 사장 모임과 교육으로 올려요.</div><div class="tiny muted" style="margin-top:6px">장사가 잘되는 지점(별점 4.4·8개월 이상)에는 <b class="gold">권리금 제안</b>이 와요. 지점 4곳 이상에 매니저를 두면 공간 운영사가 <b class="gold">전부 인수</b>하겠다고 찾아오기도 해요. 그게 파티룸 엑시트예요.</div>`)}
    <div class="acts" style="padding:6px 0 0">${actRows(["pr_meetup", "pr_course", "pr_review", "bg_prcon", "bg_brand", SYN.on(S, "club") ? ["pr_club", undefined, `모임 대관 행사 · ${D.CLUB_HOBBY[S.hb.joined.find((h) => D.CLUB_HOBBY[h])]}`] : null, "pr_teach"])}${S.big.fran ? `<div class="tiny good">가맹점 ${S.big.fran.n}곳 · 로열티 월 ${won(S.big.fran.n * 90 * (S.pi || 1))}</div>` : ""}</div></div>`;
}
function prGuide() { return `<div class="card"><h3>컨셉은 매물 크기·층에 따라</h3><div class="small muted">${Object.values(D.CONCEPTS).map((c) => `<span class="tag">${esc(c.n)}</span>`).join(" ")}<br>홈파티는 30평 이하, 강의·세미나룸은 20평 이상, B2B 교육장은 28평 이상에 주차, 초대형은 40평 이상이에요. 2층 이상에서 엘리베이터가 없으면 키즈·교육장은 못 해요.</div></div><div class="card"><h3>입지가 전부예요</h3><div class="small muted">파티룸이 망하는 이유 1위는 무리한 입지와 비용 구조예요. 매물마다 <b class="gold">방음·24시간 출입·건물주·경쟁·온돌</b>이 숨어 있어요. 임장, 건물주 미팅, 앱 조사로 확인해 보세요. 확인하지 않고 계약하면 운영하다가 민원이나 계약 해지로 드러나요.</div></div>`; }
function roomCard(rm) {
  const c = D.CONCEPTS[rm.concept], d = D.DISTRICTS[rm.dk], need = PR.needAp(S, rm), L = rm.last;
  const st = rm.status === "setup" ? `<span class="tag gold">${rm.self ? `셀프 공사 ${rm.self}번 남음` : "공사 중 · 다음 달 오픈"}</span>` : `<span class="tag green">영업 중 ${rm.months}개월</span>`;
  // 화면 정리(v4.31): 접힌 한 줄 = 파티룸의 핵심(지난달 예약·이번 달 성수기 여부). 지점이 1곳이면 처음부터 펼친다.
  const pk = PR.isPeak(S.cal), lowAp = rm.status === "open" && rm.ap < need, unS = Math.round(rm.unrep || 0);
  const sum = `<span class="tjx-s1"><b>${esc(rm.name)}</b>${rm.status === "setup" ? `<span class="tag gold">${rm.self ? "셀프 공사 중" : "공사 중"}</span>` : `<span class="tag ${pk ? "gold" : ""}">${S.cal === 12 ? "12월 극성수기" : pk ? "성수기" : "비수기"}</span>`}${rm.notice ? `<span class="tag red">계약 해지 ${rm.notice - S.t}개월</span>` : ""}</span><span class="tjx-s2">${L ? `지난달 예약 <b>${L.bookings}건</b> · <span class="gold">★${rm.rating.toFixed(2)}</span> · <b class="${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</b>` : rm.status === "open" ? "첫 달 · 다음 정산부터 예약이 잡혀요" : "오픈 준비 중"}${lowAp ? ` · <b class="bad">관리 ${r1(rm.ap)}/${r1(need)}</b>` : ""}${unS > D.PR_REVIEW.unrep.max ? ` · <b class="bad">밀린 답글 ${unS}</b>` : ""}</span>`;
  return fold("pr-" + rm.id, sum, `<div class="art" style="background-image:linear-gradient(180deg,transparent,#0008),url(img/${rm.concept === "party" || rm.concept === "work" ? "diorama" : "bg_partyroom"}.webp)"><div class="st">${st}${rm.notice ? ` <span class="tag red">계약 해지 ${rm.notice - S.t}개월</span>` : ""}</div></div>
    <div class="body"><div class="row"><div class="grow"><div class="nm">${esc(rm.name)}</div><div class="muted small">${esc(c.n)} · ${D.INTERIORS[rm.interior].n} 인테리어${rm.ondol ? " · 온돌" : ""}</div></div>${rm.status === "open" ? `<div style="text-align:right"><div class="gold" style="font-weight:900">★ ${rm.rating.toFixed(2)}</div><div class="tiny muted">리뷰 ${rm.reviews}</div></div>` : ""}</div>
    ${L ? `<div class="kv"><div><div class="k">가동률</div><div class="v">${Math.round(L.occ * 100)}%</div></div><div><div class="k">예약</div><div class="v">${L.bookings}건</div></div><div><div class="k">지난달 순익</div><div class="v ${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</div></div></div>` : ""}
    ${rm.status === "open" ? `<div class="row small"><span>입소문 ${Math.round(rm.buzz || 0)}</span><span class="grow">${meter(rm.buzz || 0, 100, "var(--pink)")}</span>${L?.ig != null ? `<span class="tiny muted">지난달 인별 ${L.ig} · 블로그 ${L.bl}</span>` : ""}</div>` : ""}
    <div class="tiny muted">주 고객: ${(c.seg || []).map(esc).join(", ")}</div>
    <div class="row small"><span>주변 경쟁 <b>${PR.mkt(S, rm.dk).comp}곳</b> · 시세 1건 ${Math.round(PR.refPrice(S, rm))}만 <span class="muted">(내 가격 ${rm.price}만)</span></span><span class="grow"></span><span>컨셉 궁합 <b class="${PR.decorFit(rm.concept, rm.decor) >= 0.8 ? "good" : PR.decorFit(rm.concept, rm.decor) < 0.5 ? "bad" : "gold"}">${Math.round(PR.decorFit(rm.concept, rm.decor) * 100)}%</b></span><button class="btn sm" data-decor="${rm.id}">컨셉 소품</button></div>
    ${DK.decoRow(dctx(), "pr", rm)}
    ${attrs(rm, false, true)}
    ${rm.status === "open" ? (() => { const RK = D.PR_REVIEW, top = (rm.reviews || 0) >= RK.top.n && rm.rating >= RK.top.star, un = Math.round(rm.unrep || 0); return `<div class="row small"><span>후기 <b>${rm.reviews}</b>/${RK.top.n}${top ? ' <span class="tag gold">상위 노출</span>' : ""} · <span class="${un > RK.unrep.max ? "bad" : "muted"}">답글 ${un}${un > RK.unrep.max ? " · 별점 깎이는 중" : ""}</span></span><span class="grow"></span><button class="btn sm" data-act="pr_reply" data-arg="${rm.id}" ${un >= 1 ? "" : "disabled"}>답글 ⚡1</button></div>`; })() : ""}
    <div class="row wrap"><span class="small">월세 ${won(rm.rent)}</span><span class="grow"></span><span class="small muted">예약 1건</span><div class="stepper"><button data-price="${rm.id}:-1">−</button><b>${rm.price}만</b><button data-price="${rm.id}:1">+</button></div></div>
    ${rm.status === "open" ? `<div class="row"><span class="small">이번 달 관리 <b class="${rm.ap < need ? "bad" : "good"}">${r1(rm.ap)}/${r1(need)}</b></span><span class="grow"></span><button class="btn sm" data-act="pr_manage" data-arg="${rm.id}">관리 ⚡1</button><button class="btn sm" data-act="pr_promo" data-arg="${rm.id}">홍보 사진 ⚡1</button></div>` : rm.self ? `<button class="btn sm" data-act="pr_setup" data-arg="${rm.id}">셀프 공사 ⚡1</button>` : ""}
    ${more("컨셉 변경·양도 · 더 보기", `<div class="row"><select data-concept="${rm.id}" class="btn sm">${Object.entries(D.CONCEPTS).map(([k, v]) => `<option value="${k}" ${k === rm.concept ? "selected" : ""}>${v.n}${k === rm.concept ? "" : " (변경 공사)"}</option>`).join("")}</select><span class="grow"></span><button class="btn sm danger" data-close-room="${rm.id}">양도(${won(PR.resale(S, rm))})</button></div>`)}</div>`, S.pr.rooms.length <= 1, "room", lowAp ? `<button class="btn sm" data-act="pr_manage" data-arg="${rm.id}">관리 ⚡1</button>` : "");
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
    ${more("규모의 경제 자세히", `<div class="tiny muted">단가 배율: 1호점 ×1 → 2호점 ×0.9 → 3호점 ×0.8 → 4호점부터 ×0.72(최대). 대신 물가가 해마다 2.5%씩 올라서 나중에 여는 지점은 월세·공사비가 더 비싸요.</div><div class="tiny muted" style="margin-top:6px">청소 조력자(인연)를 두면 계약보다 30% 싸고 관리 행동력도 준다. 매니저를 두면 파티룸 수익이 '일 안 해도 들어오는 돈'으로 잡혀 파이어 계산에 들어간다.</div>`)}
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${rows}</div></div>`;
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
  if (PR.conceptOk(L, f.concept, S)) f.concept = Object.keys(D.CONCEPTS).filter((k) => !PR.conceptOk(L, k, S)).sort((a, b) => (d.fit[b] || 0) - (d.fit[a] || 0))[0];
  const it = D.INTERIORS[f.interior], scale = L.size / 22;
  const qt = PR.quote(S, L, f), interior = qt.interior, ondol = qt.ondol, total = qt.total;
  const fitKnown = L.seen.app || (S.pr.known[L.dk === "univ" ? "univ" : "x"] || 0) > 0;
  const unseen = ["sound", "access24", "landlord", "comp", "ondolOk"].filter((k) => !L.seen[k]).length;
  return `<div class="row"><button class="btn sm" data-prflow="list:${L.dk}">‹ 매물</button><b>계약 검토</b></div>
  <div class="card"><div class="nm"><b>${esc(d.n)} ${L.size}평 ${L.floor === -1 ? "지하" : L.floor + "층"}</b></div>${attrs(L)}</div>
  <div class="sec">컨셉 <span class="muted small">· 매물과 내 능력치에 따라 열려요</span></div><div class="pick">${Object.entries(D.CONCEPTS).map(([k, c]) => { const no = PR.conceptOk(L, k, S); return `<button class="${f.concept === k ? "on" : ""}" data-cc="${k}" ${no ? "disabled" : ""}><b>${c.n}${PW.sunk(S, k) ? ' <span class="tiny bad">침몰</span>' : ""}</b>${no ? `<span class="tiny bad">${esc(no)}</span>` : `<span class="tiny muted">상권 궁합 ${fitKnown ? "●".repeat(Math.round((d.fit[k] || 0.8) * 3.5)) : "? (앱 조사)"}</span><span class="tiny muted">${esc((c.seg || []).slice(0, 2).join("·"))}${c.kit ? ` · 장비 ${won(Math.round(c.kit * qt.pi * qt.sf))}` : ""}</span><span class="tiny muted">평일 ${"●".repeat(Math.round((c.wk ?? 1) * 3))} 주말 ${"●".repeat(Math.round((c.we ?? 1) * 3))} · 후기 ${"●".repeat(Math.round((c.sns ?? 1) * 3))}</span>`}</button>`; }).join("")}</div>
  <div class="sec">인테리어</div><div class="pick">${D.INTERIORS.map((x, i) => `<button class="${f.interior === i ? "on" : ""}" data-it="${i}"><b>${x.n}</b><span class="tiny muted">${won(Math.round(x.cost * scale))} · 첫 별점 ${x.star}</span></button>`).join("")}</div>
  <div class="pick"><button class="${f.self ? "on" : ""}" data-self><b>셀프 공사 ${f.self ? "O" : "X"}</b><span class="tiny muted">비용 −35%, 대신 공사 행동 3번(감각·손재주가 별점에 영향)</span></button>
  <button class="${f.ondol ? "on" : ""}" data-ondol ${L.seen.ondolOk && !L.hid.ondolOk ? "disabled" : ""}><b>온돌 시공 ${f.ondol ? "O" : "X"}</b><span class="tiny muted">${won(Math.round(250 * scale))} · 겨울 예약 +, 난방비 −${L.seen.ondolOk ? "" : " · 가능 여부 ? (임장)"}</span></button></div>
  <div class="card"><div class="row"><span class="grow">보증금 ${won(L.dep)} + 권리금 ${won(L.key)} + 인테리어 ${won(interior)}${ondol ? ` + 온돌 ${won(ondol)}` : ""}${qt.kit ? ` + 장비 ${won(qt.kit)}` : ""} + 가구·비품 ${won(qt.furn)}</span></div>
  <div class="tiny muted">${qt.sf < 1 ? `${S.pr.rooms.length + 1}호점 규모의 경제로 공사·비품 ×${qt.sf}. ` : ""}물가 ×${qt.pi.toFixed(2)}가 이미 들어가 있어요.</div><div class="row" style="margin-top:6px"><b class="grow" style="font-size:17px">합계 ${won(total)}</b><span class="small muted">현금 ${won(S.cash)}</span></div>
  ${total > S.cash ? `<div class="small bad">모자란 돈은 사업자대출(연 4.8%, 한도 6,000만)로 채운다.</div>` : ""}
  ${unseen ? `<div class="small gold">확인 안 한 정보 ${unseen}개. 그대로 계약하면 운영하다가 드러난다.</div>` : ""}
  ${(() => { const rb = PR.reserveNeed(S, L.rent), left = S.cash - total; return `<div class="small ${left < rb ? "bad" : "muted"}" style="margin-top:4px">${left < rb ? "⚠ " : ""}계약 뒤 남는 현금 ${won(Math.max(0, left))}${left < 0 ? `(대출 ${won(-left)})` : ""}. 비수기(3~6·9월)를 버티려면 월세 ${PR.RESERVE_MONTHS}달 치 + 생활비 2달 치, 약 ${won(rb)}는 남기세요.${left < rb && S.pr.rooms.length ? " 지점을 늘리다 비수기에 신용대출까지 다 쓰면 개인회생이에요." : ""}</div>`; })()}
  <button class="btn gold" style="width:100%;margin-top:8px;padding:12px" data-sign="${L.id}">계약하기</button></div>`;
}

function pgCS() {
  const cs = S.cs, steps = CS.entrySteps(S);
  const nicheCards = `<div class="pick">${Object.entries(D.NICHES).map(([k, n]) => { const on = cs.niches.includes(k); const req = `커리어 ${n.req.career}${n.req.years ? ` · 경력 ${n.req.years}년` : ""}`; return `<button class="${on ? "on" : ""}" data-niche="${k}"><b>${n.n}</b><span class="tiny muted">핵심 능력 ${D.STATS[n.stat]} · 단가 ×${n.priceF}</span><span class="tiny muted">조건 ${req}</span></button>`; }).join("")}</div>`;
  if (!cs.open) {
    return `${boardHead("cs")}<div class="card"><h3>취업컨설팅 개업 준비 <small>진입이 제일 어렵다</small></h3><div class="small muted" style="margin-bottom:8px">회사 경력과 직무 지식이 곧 신뢰예요. 첫 후기는 지인에게서, 첫 손님은 크멍이나 블로그에서 와요.</div>
      <div class="steps">${steps.map((x) => `<div class="${x.done ? "done" : ""}"><span class="ck">${x.done ? "✓" : ""}</span><span class="grow">${esc(x.n)}<div class="tiny muted">${esc(x.hint)}</div></span></div>`).join("")}</div></div>
    <div class="sec">포지션</div>${nicheCards}
    <div class="sec">활동명</div><div class="pick"><button class="${cs.nick === "nick" ? "on" : ""}" data-nick="nick"><b>닉네임</b><span class="tiny muted">회사에 덜 들킴</span></button><button class="${cs.nick === "real" ? "on" : ""}" data-nick="real"><b>실명·회사 공개</b><span class="tiny muted">신뢰 +6%p · 회사 눈치 ×1.4</span></button></div>${nickPick(cs)}
    <div class="acts" style="padding:0">${actRow("study", "career", "커리어 공부 (스터디카페)")}${actRow("cs_friend")}${actRow("cs_kmong", undefined, "크멍 입점")}${actRow("cs_blog")}</div>`;
  }
  const units = cs.queue.reduce((a, q) => a + q.left, 0);
  const cap = (2 + Math.floor(S.st.write / 35) + Math.floor(cs.template));
  const lvc = D.CS_LEVELS[cs.lv] ? D.CS_LEVELS[cs.lv].c : "최고 레벨";
  const niche = D.NICHES[cs.niche];
  const maxS = Math.max(...niche.season);
  return `${boardHead("cs")}<div class="card"><h3>취업컨설팅 <small>Lv${cs.lv} 「${D.CS_LEVELS[cs.lv - 1].n}」</small></h3><div class="tiny muted">다음 레벨: ${esc(lvc)}</div>${cs.nick === "nick" ? more(`활동명 · ${CS.nickName(S) || "닉네임을 골라 주세요"} · 바꾸기`, nickPick(cs)) : `<div class="tiny muted" style="margin-top:4px">활동명 · 실명·회사 공개</div>`}
    <div class="funnel" style="margin-top:8px"><div><div class="v">${r1(cs.leads)}</div><div class="k">이번 달 문의</div></div><div><div class="v">${cs.newThisMonth}</div><div class="k">새 고객</div></div><div><div class="v ${cs.queue.length ? "gold" : ""}">${cs.queue.length}</div><div class="k">대기</div></div><div><div class="v good">${won(cs.monthRev)}</div><div class="k">이번 달 매출</div></div></div>
    ${more(`전환 ${Math.round(cs.conv * 100)}% · 합격 ${cs.passes} · 지표 더 보기`, `<div class="row wrap small">${Object.entries(cs.src).filter(([, v]) => v > 0.05).map(([k, v]) => `<span class="tag">${k} ${r1(v)}</span>`).join("") || `<span class="muted">유입 채널을 키우자</span>`}</div>
    <div class="kv" style="margin-top:8px"><div><div class="k">결제 전환</div><div class="v">${Math.round(cs.conv * 100)}%</div></div><div><div class="k">합격 누적</div><div class="v good">${cs.passes}</div></div><div><div class="k">후기</div><div class="v">${Math.floor(cs.reviews)}개</div></div><div><div class="k">신뢰</div><div class="v">${Math.round((cs.trust || 0) * 100)}</div></div><div><div class="k">처리 용량</div><div class="v">${cap}명/행동</div></div></div>`)}</div>
  ${cs.queue.length ? `<div class="card"><h3>대기 고객 ${cs.queue.length}명 <small>행동 ${Math.ceil(units / cap)}번 필요</small></h3><div style="display:flex;flex-direction:column;gap:4px">${cs.queue.slice(0, 8).map((q) => `<div class="row small" style="background:var(--panel2);border-radius:8px;padding:5px 8px">${q.who ? img(faceSrc(q.who, "smile"), "face mini", "") : ""}<span class="grow">${q.who ? esc(E.CHAR[q.who].name) : "고객 #" + q.id} · ${D.CS_PRODUCTS[q.prod].n} · ${D.NICHES[q.niche].n}</span><span>${q.price}만</span>${q.wait ? `<span class="tag red">취소 임박</span>` : ""}</div>`).join("")}</div><div style="margin-top:8px">${actRow("cs_focus")}${actRow("cs_work")}</div></div>` : ""}
  <div class="card" style="padding:8px 12px">${more(`<b>시즌</b> · 지금 ${S.cal}월 · 성수기 ${niche.season.indexOf(maxS) + 1}월 · ${esc(niche.n)}`, `<div class="season">${niche.season.map((v, i) => `<i class="${i + 1 === S.cal ? "now" : ""}" style="height:${Math.round(v / maxS * 100)}%"></i>`).join("")}</div><div class="season-l">${niche.season.map((_, i) => `<span>${i + 1}</span>`).join("")}</div>`)}</div>
  <div class="sec">마케팅 채널</div>
  <div class="chs">
    <div class="ch"><b>크멍</b><span class="v">${cs.ch.kmong.on ? `상세페이지 ${Math.round(cs.ch.kmong.q)} · 수수료 20%` : "입점 전"}</span><button class="btn sm" data-act="cs_kmong">${cs.ch.kmong.on ? "상세페이지 개선" : "입점"} ⚡1</button></div>
    <div class="ch"><b>네이바 블로그</b><span class="v">글 ${cs.ch.blog.posts}개 · 검색 지수 ${Math.round(cs.ch.blog.idx)}</span><button class="btn sm" data-act="cs_blog">글쓰기 ⚡1</button></div>
    <div class="ch"><b>인별그램</b><span class="v">팔로워 ${cs.ch.insta.f.toLocaleString()}</span><button class="btn sm" data-act="cs_insta">카드뉴스 ⚡1</button></div>
    <div class="ch"><b>너튜브</b><span class="v">구독자 ${cs.ch.youtube.subs.toLocaleString()} · 영상 ${cs.ch.youtube.videos}</span><button class="btn sm" data-act="cs_youtube">영상 ⚡2</button></div>
    <div class="ch"><b>카카우 오픈채팅</b><span class="v">${cs.ch.kakao.m.toLocaleString()}명</span><button class="btn sm" data-act="cs_kakao">방 운영 ⚡1</button></div>
    <div class="ch"><b>숨꼬</b><span class="v">견적 보내면 바로 고객</span><button class="btn sm" data-act="cs_soomgo">견적 ⚡1</button></div>
  </div>
  <div class="card"><h3>판 키우기 <small>명성 ${Math.round(S.fame || 0)}${BIG.isFull(S) ? " · 전업" : ""}</small></h3>${more("판 키우기 자세히", `<div class="tiny muted">아주 잘되면 고액 상품과 AI 플랫폼까지 갈 수 있어요. 플랫폼은 전업(온잡)이어야 하고, 성공하면 크게 벌지만 실패하면 개발비를 날려요.</div>`)}
    <div class="acts" style="padding:0">${actRows(["bg_vip", ["bg_ai", undefined, S.big.plat && S.big.plat.prog < 100 ? `AI 플랫폼 ${S.big.plat.renew ? "리뉴얼" : "개발"} 계속 (${S.big.plat.prog}%)` : S.big.plat?.live && S.big.plat.tier === "small" ? "AI 플랫폼 리뉴얼(1,000만, 대박 재도전)" : undefined]])}</div>
    ${S.big.vip ? '<div class="tiny good">VIP 이직 패키지 판매 중</div>' : ""}${S.big.plat?.live && S.big.plat.last ? `<div class="tiny good">AI 플랫폼(${S.big.plat.tier === "big" ? "대박" : "소소하게 운영 중"}): 사용자 ${S.big.plat.last.users.toLocaleString()} · 유료 ${S.big.plat.last.paid.toLocaleString()} · 월 순익 ${won(S.big.plat.last.rev - S.big.plat.last.cost)}</div>` : ""}</div>
  ${CS.f30Box ? CS.f30Box(S, esc, won) : ""}<div class="card"><h3>실력과 가격 <small>${D.CS_PRICE[cs.price].n}</small></h3><div class="kv"><div><div class="k">내 실력</div><div class="v">${CS.skill(S)}</div></div><div><div class="k">이 가격이 요구하는 실력</div><div class="v ${CS.gap(S) > 0 ? "bad" : "good"}">${CS.priceNeed(S)}</div></div><div><div class="k">이번 달 환불</div><div class="v ${cs.refunds ? "bad" : ""}">${cs.refunds || 0}건</div></div></div>
    ${more("실력과 가격 자세히", `<div class="tiny muted">실력 = 핵심 능력과 커리어의 평균. 가격(레벨이 오르면 저절로 오르는 단가 포함)보다 실력이 낮으면 환불과 혹평이 나와요. 집중 첨삭(미니게임)으로 고치면 환불 위험이 줄어요.</div>`)}</div>
  <div class="card"><h3>광고비 <small>월 ${won(cs.ads)}</small></h3><input type="range" min="0" max="300" step="10" value="${cs.ads}" data-ads style="width:100%"><div class="tiny muted">돈으로 문의를 산다. 효율은 점점 떨어진다.</div></div>
  <div class="sec">상품·규모의 경제</div>
  <div class="card"><div class="row wrap">${Object.entries(D.CS_PRICE).map(([k, p]) => `<button class="btn sm ${cs.price === k ? "gold" : ""}" data-cprice="${k}">${p.n}${p.req ? ` (후기 ${p.req})` : ""}</button>`).join("")}</div>
    <div class="tiny muted" style="margin-top:6px">자소서 첨삭 ${D.CS_PRODUCTS.edit.price}만 · 면접 코칭 ${D.CS_PRODUCTS.coach.price}만 · 패키지 ${D.CS_PRODUCTS.pkg.price}만(후기 15개부터) × 포지션·가격·레벨 배수</div>
    <div class="acts" style="padding:8px 0 0">${actRows([["cs_template", undefined, `첨삭 템플릿 만들기 (${cs.template.toFixed(1)}/3)`], "cs_group", ["cs_vod", undefined, `VOD·전자책 제작 (${Math.round(cs.vod.prog)}%)`], "cs_seminar", cs.offers ? ["cs_lecture", undefined, `대학 강의 (섭외 ${cs.offers}건)`] : null])}</div>
    ${cs.vod.income ? `<div class="small good">VOD·전자책 자동 판매 월 ${won(cs.vod.income)}</div>` : ""}</div>
  <div class="sec">포지션 추가 (Lv3부터)</div>${nicheCards}`;
}
function coEval() {
  const co = S.co, rk = D.RANKS[co.rank], ct = D.COMPANY_TYPES[co.type], nx = D.RANKS[co.rank + 1];
  const yrs = ct.fast ? rk.fast : rk.years, top = co.rank >= ct.top;
  const g = (co.grades || []).slice(-6);
  return `<div class="evalbox"><div class="row"><b class="small">연말 평가</b><span class="grow"></span>${g.length ? g.map((x) => `<span class="gr g${x}">${x}</span>`).join("") : '<span class="tiny muted">첫 평가는 12월</span>'}</div>
    ${co.capC || co.pip || co.remote ? `<div class="tiny">${co.capC ? " <b class='bad'>올해는 C 이하</b>" : ""}${co.pip ? ` <b class="bad">개선 기간 ${co.pip}개월 · 성과 45 넘기기</b>` : ""}${co.remote ? ` <b class="gold">지방 근무 ${co.remote}개월 남음(행동력 −1)</b>` : ""}</div>` : ""}
    ${top ? `<div class="tiny">이 회사에서 오를 수 있는 끝(${rk.n})이에요.${rk.exec ? " 임원은 해마다 계약을 다시 해요. 평가가 나쁘면 퇴임해요." : ""}</div>` : `<div class="tiny">다음 직급 <b>${nx.n}</b>: ${rk.n} ${yrs}년(지금 ${co.yrsRank}년) · 평가 점수 ${co.pts}/${yrs + 1} · 커리어 ${Math.round(S.st.career)}/${Math.round(nx.career * 0.85)}${nx.exec ? " · 임원은 1년 계약" : ""}</div>`}${more("평가 규칙 자세히", `<div class="tiny muted">S·A·B·C·D 중 대부분 B가 나와요. B면 연봉 +2%, S면 +5%. 성과·팀장 호감·직급에 맞는 커리어가 높을수록 위로 나와요.</div>`)}</div>`;
}
function pgCo() {
  const co = S.co, q = E.quitReady(S);
  const spots = D.REGIONS.find((r) => r.id === "company").spots;
  if (co.quit || co.fired) return `<div class="card"><h3>${co.retired ? "퇴임·퇴직" : co.fired ? "해고됨" : "퇴사함"}</h3><div class="small muted">낮 시간이 생겨 행동력이 5 늘었어요. 월급은 없어요. 나이가 많을수록 재취업은 어려워져요.</div><div class="acts" style="padding:8px 0 0">${actRow("rejob")}</div></div>`;
  const t = D.COMPANY_TYPES[co.type];
  return `${MAPD.office?.[co.type] ? `<div class="a6of" style="background-image:url(${MAPD.office[co.type]})"><span>${esc(co.name)} · ${t.n}</span></div>` : ""}${bangCards(bangsAt((q) => q.rg === "company"))}<div class="card"><h3>${esc(co.name)} <small>${t.n} · ${D.RANKS[co.rank].n} · ${Math.floor(co.years)}년 차</small></h3>
    <div class="kv"><div><div class="k">월급(실수령)</div><div class="v">${won(E.salary(S))}</div></div><div><div class="k">성과</div><div class="v">${Math.round(co.perf)}</div></div><div><div class="k">팀장 호감</div><div class="v">${Math.round(co.boss)}</div></div>${co.warns ? `<div><div class="k">겸업 경고</div><div class="v bad">${co.warns}회</div></div>` : ""}</div>
    <div style="margin-top:8px" class="small">회사 눈치 ${Math.round(co.eye)} ${meter(co.eye, 100, "var(--orange)")}</div>
    ${coEval()}
    ${more("눈치 50 넘으면 겸업이 들킬 수 있어요 · 자세히", `<div class="tiny muted">눈치가 50을 넘으면 겸업이 들킬 수 있어요(경고 → 감봉 → 해고). ${t.n}은 ×${t.eye}.</div><div class="tiny muted" style="margin-top:4px">투잡 없이 회사만 다녀도 돼요. 다만 연봉은 천천히 오르고 지방 발령, 구조조정 같은 일도 생겨서 회사만으로 30억은 쉽지 않아요.</div>`)}</div>
  ${spots.map(spotBlock).join("")}
  ${(q.x || 0) >= 0.5 || (S.fame || 0) >= 30 ? `<div class="card"><h3>온잡(전업)으로 가면 <small>명성 ${Math.round(S.fame || 0)}</small></h3><div class="small muted">회사를 나오면 행동력 +5, 컨설팅 처리량 ×1.6·문의 ×1.3, 인별 성장 ×1.3, 파티룸 평일 영업 +15%. 명성이 높으면 파티룸 창업 컨설팅·가맹 사업·VIP 상품·AI 플랫폼이 열려요. 대신 월급이 끊기고 지역 건강보험이 나가요. 잘될 때 가면 크게, 빨리 벌어요.</div></div>` : ""}
  <div class="card"><details class="more qmore" ${q.ok ? "open" : ""}><summary><b>환승 퇴사</b> · 조건 ${(q.yearOk ? 1 : 0) + (q.emer ? 1 : 0)}/2 · 선퇴사 금지 ▾</summary>
    <div class="steps"><div class="${q.yearOk ? "done" : ""}"><span class="ck">${q.yearOk ? "✓" : ""}</span><span class="grow">연말 결산 투잡 이익 ≥ 연봉 (지난 결산 ${(q.x || 0).toFixed(1)}배 · 1.5배면 강력 추천, 2배면 나와라!)</span></div><div class="${q.emer ? "done" : ""}"><span class="ck">${q.emer ? "✓" : ""}</span><span class="grow">비상금 6개월 치(${won(E.monthlySpend(S) * 6)})</span></div></div>
    <button class="btn ${q.ok ? "gold" : "danger"}" style="width:100%;margin-top:8px" data-quit>${q.ok ? "환승 퇴사하기" : "그냥 사직서 내기(위험)"}</button></details></div>`;
}

// 투잡 보드 머리
function boardHead(k) { const j = D.SIDEJOBS[k] || { type: "", inc: "" }; const ri = SJ.rampInfo(S, k), tip = ri && !ri.done && !S.sj.coachOff ? (S.sj.rp[k].tip || "첫 달은 손님이 적어요. 홍보·후기 행동을 해야 올라가요.") : ""; return `<div class="row" style="margin-bottom:6px"><button class="btn sm" data-go="sj">‹ 투잡 탐색</button><span class="tag">${esc(j.type)}</span><span class="grow"></span><span class="tiny muted">${esc(j.inc)}</span></div>${ri && !ri.done ? `<div class="card" style="padding:8px 10px;margin-bottom:8px"><div class="tiny"><b class="gold">초반 고생 중</b> · 손님 기대치의 ${ri.pct}%</div>${meter(ri.pct, 100, "var(--gold)")}${skillLine(S, k, true)}${tip ? `<div class="tiny muted" style="margin-top:4px">코치: ${esc(tip)}</div>` : ""}</div>${marketBox(S, k, true)}` : marketBox(S, k)}${rivalBox(S, k)}${HU.hidBox(S, k)}${H2U.box(S, k)}`; }

// 투잡 탐색
function pgSJ() {
  const sj = S.sj, act = sj.active;
  const card = (k) => {
    const j = D.SIDEJOBS[k], f = SJ.isFound(S, k), on = SJ.isActive(S, k), it = Math.round(sj.int[k] || 0), know = f || sj.know[k];
    const fg = SJ.insight(S, k); // 이해도 100%가 되어야 궁합·특성 연계가 보인다
    const btns = on ? `<button class="btn sm gold" data-go="${k}">보드 열기</button>`
      : f ? (j.play ? `${SJ.startLock(S) ? `<button class="btn sm" data-sjno>시작하기</button>` : `<button class="btn sm gold" data-sjstart="${k}" ${act.length >= SJ.slots(S) ? "disabled" : ""}>시작하기</button>`}` : `<span class="tiny muted">다음 업데이트에서 열림</span>`)
      : `<button class="btn sm" data-act="sj_report" data-arg="${k}">리포트 ⚡1</button>`;
    const ask = !sj.know[k] && (it >= 30 || f) ? `<button class="btn sm" data-act="sj_interview" data-arg="${k}">해 본 사람에게 묻기 ⚡1</button>` : "";
    if (!f && !on) return `<details class="sjc sjline ${j.play ? "" : "soon"}"><summary class="row"><span class="ic">${ic(j.ic)}</span><div class="grow ellip"><b>${esc(j.n)}</b> <span class="tiny muted">이해도 ${it}%${j.play ? "" : " · 준비 중"} ▾</span>${meter(it, 100, "var(--gold)")}</div>${btns}</summary><div class="tiny muted" style="margin-top:4px">단서: ${esc(j.hint)}${it >= 50 ? " · 100%가 되면 궁합·특성 연계가 보여요" : ""}</div>${(() => { const e = sjEntry(k, f, on, it); return e.html + (ask || e.btns ? `<div class="row wrap" style="margin-top:6px">${ask}${e.btns}</div>` : ""); })()}</details>`; // 정리(v4.27): 못 찾은 투잡은 사진 없는 한 줄
    const ent = sjEntry(k, f, on, it);
    const ban = SJ_BG[k] && bgUrl(SJ_BG[k]);
    return `<div class="sjc ${f ? "found" : ""} ${on ? "on" : ""} ${j.play ? "" : "soon"}">${ban ? `<div class="sjban" style="background-image:url(${ban})"></div>` : ""}<div class="row"><span class="ic">${ic(j.ic)}</span><div class="grow"><b>${esc(j.n)}</b> <span class="tag">${esc(j.type)}</span>${j.play ? "" : ' <span class="tag">준비 중</span>'}</div>${fg ? `<span class="fit g${fg.g}">궁합 ${fg.g}</span>` : ""}</div>
      ${f ? `<div class="tiny">${esc(j.inc)} · ${esc(j.hours)} · 자본 ${esc(j.cap)}</div><div class="tiny muted">"${esc(j.line)}"</div>${(() => { const ins = fg ? `<div class="sjins"><span>궁합 ${fg.g} · ${fg.stats.map(esc).join(" · ")}</span>${fg.links.length ? fg.links.map((x) => `<span class="lk">★ ${esc(x)}</span>`).join("") : `<span class="muted">내 특성카드와 연계 없음</span>`}</div>` : ""; return on ? ins : more("궁합·필요 역량 자세히", ins + ent.html + pairHtml(k, act)); })()}` : `<div class="tiny muted">이해도 ${it}% · 단서: ${esc(j.hint)}${it >= 50 ? " · 100%가 되면 궁합·특성 연계가 보여요" : ""}</div>${meter(it, 100, "var(--gold)")}`}${on || !f ? ent.html : ""}<div class="row wrap" style="margin-top:6px">${btns}${ask}${ent.btns}</div>${on ? more("투잡 그만두기 · 더 보기", `<div class="row"><span class="grow tiny muted">쌓은 후기·능력치는 남고, 나중에 다시 시작할 수 있어요.</span><button class="btn sm danger" data-sjstop="${k}">투잡 그만두기</button></div>`) : ""}</div>`;
  };
  const keys = Object.keys(D.SIDEJOBS).sort((a, b) => (SJ.isActive(S, b) - SJ.isActive(S, a)) || ((SJ.isFound(S, b) ? 1 : 0) - (SJ.isFound(S, a) ? 1 : 0)) || ((D.SIDEJOBS[b].play ? 1 : 0) - (D.SIDEJOBS[a].play ? 1 : 0)) || (S.sj.int[b] || 0) - (S.sj.int[a] || 0));
  const F = { all: () => true, found: (k) => SJ.isFound(S, k), play: (k) => D.SIDEJOBS[k].play };
  return `<div class="card"><h3>투잡 탐색 <small>발견 ${Object.keys(sj.found).length}/21 · 하는 중 ${act.length}/${SJ.slots(S)}</small></h3>
    ${more("이해도 100%면 후보가 돼요 · 자세히", `<div class="small muted">투잡은 정해져 있지 않아요. 너튜브·리포트·세미나, 회사 소문, 그리고 <b class="gold">취미</b>에서 발견해요. 이해도가 100%가 되면 후보가 되고, 그때 내 능력치 궁합과 특성카드 연계가 보여요. 정보는 리서치뿐 아니라 회사·사람·취미·이벤트에서도 조금씩 모여요. 두 개까지 할 수 있고, 하나도 안 해도 괜찮아요. 투잡을 시작하면 성향 카드의 숨은 특성이 공개돼요.</div>`)}
    ${act.length ? `<div class="row wrap" style="margin-top:8px">${act.map((k) => `<button class="btn sm gold" data-go="${k}">${ic(D.SIDEJOBS[k].ic)} ${esc(D.SIDEJOBS[k].n)} 보드</button>`).join("")}</div>` : `<div class="tag" style="margin-top:8px">지금은 회사원 · 투잡 없음</div>`}${SJ.foundCount(S) ? `<button class="btn sm" style="margin-top:8px" data-fitcards>궁합 카드 보기 (${SJ.foundCount(S)}장)</button>` : ""}</div>
  ${H2U.sjBox(S)}<div class="acts" style="padding:0">${actRow("sj_youtube")}${actRow("sj_seminar")}</div>
  <div class="filters">${[["all", "전체 21"], ["found", "발견"], ["play", "지금 플레이 가능"]].map(([k, n]) => `<button class="${ui.sjf === k ? "on" : ""}" data-sjf="${k}">${n}</button>`).join("")}</div>
  ${(() => { // 화면 정리(v4.31): 아직 단서가 없거나 준비 중인 투잡은 한 줄로 접는다
    const L = keys.filter(F[ui.sjf] || F.all), unk = (k) => !SJ.isFound(S, k) && !SJ.isActive(S, k) && (!D.SIDEJOBS[k].play || !(sj.int[k] > 0)), A = L.filter((k) => !unk(k)), B = L.filter(unk), soon = B.filter((k) => !D.SIDEJOBS[k].play).length;
    return `${A.length ? `<div class="sjgrid">${A.map(card).join("")}</div>` : ""}${B.length ? fold("sj-unknown", `<span class="tjx-s1"><b>아직 모르는 투잡 ${B.length}개</b></span><span class="tjx-s2">${[B.length - soon ? `단서 없음 ${B.length - soon}개` : "", soon ? `준비 중 ${soon}개(다음 업데이트)` : ""].filter(Boolean).join(" · ")} · 리포트로 미리 알아볼 수 있어요</span>`, `<div class="tjx-ops"><div class="sjgrid">${B.map(card).join("")}</div></div>`, !A.length, "tjx-opsbox") : ""}`; })()}`;
}

// 투잡 카드 아래: 필요 역량(진입 준비)·초반 고생 진행·코치 한마디·준비/선배/메모 버튼(engine/sj.js ENTRY)
function sjEntry(k, f, on, it) {
  const N = SJ.need(S, k); if (!N || !D.SIDEJOBS[k].play || !(f || it >= 30)) return { html: "", btns: "" };
  const P = S.sj.rp?.[k] || { prep: 0, sen: 0 }, M = S.sj.memo?.[k] || [], ri = on ? SJ.rampInfo(S, k) : null, off = S.sj.coachOff;
  let html = `<div class="tiny ${N.ok ? "good" : "bad"}" style="margin-top:4px">필요 역량 ${esc(N.n)} ${N.need} (지금 ${N.cur})${on ? "" : ` · 준비 ${P.prep}/3`} · 선배 ${P.sen}/3</div>`;
  if (!on && !off) html += `<div class="tiny muted">코치: "${N.ok ? (P.prep < 3 ? "역량은 충분해요. 준비를 마치고 들어가면 첫 달이 덜 힘들어요." : "준비 끝. 이제 들어가도 돼요. 그래도 첫 석 달은 홍보가 일이에요.") : `이 투잡은 ${esc(N.n)} ${N.need} 이상은 돼야 덜 고생해요. 지금 ${N.cur}이니 ${esc(N.how)}로 먼저 올려 보세요.`}"</div>`;
  if (ri && !ri.done) html += `<div class="tiny muted">초반 고생 중 · 손님 기대치의 ${ri.pct}%${ri.tip && !off ? ` · 코치: ${esc(ri.tip)}` : ""}</div>`;
  const btns = (f && !on && P.prep < 3 ? `<button class="btn sm" data-act="sj_prep" data-arg="${k}">준비하기 ⚡1</button>` : "") + (P.sen < 3 ? `<button class="btn sm" data-act="sj_senior" data-arg="${k}">선배 찾아가기 ⚡1</button>` : "") + (M.length ? `<button class="btn sm" data-sjmemo="${k}">선배 메모 ${M.length}</button>` : "");
  return { html, btns };
}
function sjMemoWin(k) {
  const M = S.sj.memo?.[k] || [], j = D.SIDEJOBS[k], P = S.sj.rp?.[k], ri = SJ.rampInfo(S, k);
  openWin(`<h2>선배 메모 · ${esc(j.n)} <button class="x" data-close>✕</button></h2><div class="small muted">선배를 만나고 준비하며 받아 적은 것. 숫자는 투잡연구소 조사 기준이에요.</div><div class="intro" style="margin-top:8px">${M.map((x) => `<p>${x.tip ? "★ 꿀팁" : x.prep ? "· 준비" : `· 선배 ${x.st + 1}/3`} ${esc(x.txt)}</p>`).join("") || "<p>아직 없어요</p>"}</div>${ri ? `<div class="tiny muted" style="margin-top:8px">${ri.done ? "초반 고생 끝" : `초반 고생 중 · 손님 기대치의 ${ri.pct}%`}${P?.tip && !ri.done ? ` · 코치: ${esc(P.tip)}` : ""}</div>` : ""}<button class="btn gold" style="width:100%;margin-top:10px" data-close>확인</button>`);
}
// v4.27 투잡 상성: 첫 투잡을 고를 땐 숨기고, 하나를 하고 있을 때 다른 투잡 카드에 '지금 투잡과의 상성'만 한 줄씩
const JOB_PAIR = { cs_room: ["cs", "pr"], insta_pr: ["insta", "pr"], insta_cs: ["insta", "cs"], pr_ab: ["pr", "airbnb"], insta_ab: ["insta", "airbnb"], season: ["pr", "cs"] };
const HOBBY_SYN = ["club", "insta_hobby", "travel_ab", "cook_uc"]; // 취미 × 투잡: 내 취미와 맞으면 첫 투잡 고를 때도 보여 준다
function pairHtml(k, act) {
  const S2 = { ...S, sj: { ...S.sj, active: [...act, k] } }; // 이 투잡을 시작했다고 치고 취미 상성이 켜지는지
  const hob = D.SYNERGY.filter((x) => HOBBY_SYN.includes(x.id) && (() => { try { return !!x.test(S2); } catch (e) { return false; } })());
  const L = [...hob, ...D.SYNERGY.filter((x) => JOB_PAIR[x.id] && JOB_PAIR[x.id].includes(k) && act.some((a) => a !== k && JOB_PAIR[x.id].includes(a)))];
  if (!L.length && !act.length) return "";
  const rows = L.map((x) => `<div class="tiny ${x.kind === "good" ? "good" : "bad"}">${x.kind === "good" ? "＋" : "－"} ${esc(x.n)}: ${esc(x.desc)}</div>`);
  if (act.length === 1 && !act.includes(k)) rows.push(`<div class="tiny muted">－ 투잡 두 개 + 회사: 회사 눈치가 덜 빠져요</div>`);
  return `<div class="pairs" style="margin-top:4px">${rows.join("")}</div>`;
}
function synCard() {
  const L = SYN.list(S);
  return `<div class="card"><h3>투잡 궁합 <small>켜진 것 ${L.filter((x) => x.on).length}개</small></h3><div class="small muted" style="margin-bottom:6px">투잡끼리, 취미와 투잡이 서로 돕기도 하고 발목을 잡기도 해요.</div>
    <div class="syn">${L.map((x) => `<div class="${x.kind} ${x.on ? "on" : ""}"><b>${x.kind === "good" ? "＋" : "－"} ${esc(x.n)}</b>${x.on ? '<span class="tag gold">켜짐</span>' : ""}<div class="tiny muted">${esc(x.need)}</div><div class="tiny">${esc(x.desc)}</div></div>`).join("")}</div></div>`;
}
// 인별그램
function pgInsta() { return IGA.board(igctx()); } // 인별 v4.27: 보드는 insta_app.js, 예전 보드는 아래(안 씀)
function pgInstaOld() {
  const I = S.ins, lv = INS.lvOf(I.f), nx = D.INSTA_LV[lv];
  const h = I.hist.slice(-24); const mx = Math.max(10, ...h);
  return `${boardHead("insta")}<div class="card"><h3>인별그램 <small>${D.INSTA_LV[lv - 1].n} 계정</small></h3>
    <div class="kv"><div><div class="k">팔로워</div><div class="v gold">${I.f.toLocaleString()}</div></div><div><div class="k">참여율</div><div class="v">${(I.eng * 100).toFixed(1)}%</div></div><div><div class="k">협찬 대기</div><div class="v ${I.deals ? "good" : ""}">${I.deals}건</div></div><div><div class="k">협찬 1건</div><div class="v">${won(INS.dealPay(S))}</div></div></div>
    ${nx ? `<div class="tiny muted" style="margin-top:6px">다음 단계 ${nx.n}: 팔로워 ${nx.f.toLocaleString()}명</div>${meter(I.f, nx.f, "var(--pink)")}` : ""}
    ${h.length > 1 ? `<div class="season" style="margin-top:8px">${h.map((v) => `<i style="height:${Math.round(v / mx * 100)}%"></i>`).join("")}</div>` : ""}
    <div class="tiny muted" style="margin-top:6px">한 달이라도 안 올리면 팔로워가 3% 빠져요. 협찬은 팔로워 1천 명부터 들어오고, 공동구매는 1만 명부터 열 수 있어요.</div></div>
  <div class="sec">계정 주제 ${I.niche ? "" : '<span class="bad small">· 먼저 정해 주세요</span>'}</div>
  <div class="pick">${Object.entries(D.INSTA_NICHES).map(([k, n]) => `<button class="${I.niche === k ? "on" : ""}" data-inniche="${k}"><b>${n.n}</b><span class="tiny muted">${n.stat.map((s) => D.STATS[s]).join("·")}이 중요</span>${n.hobby ? `<span class="tiny muted">취미 ${n.hobby.map((x) => D.HOBBIES[x].n).join("·")}면 +20%</span>` : ""}${n.job ? `<span class="tiny muted">${jo(D.SIDEJOBS[n.job].n, "을", "를")} 하면 +25%</span>` : ""}</button>`).join("")}</div>
  <div class="tiny muted">주제를 바꾸면 팔로워 30%가 떠나요.</div>
  <div class="pick" style="margin-top:6px"><button class="${!I.face ? "on" : ""}" data-inface="0"><b>얼굴 없는 계정</b><span class="tiny muted">천천히, 회사 모르게</span></button><button class="${I.face ? "on" : ""}" data-inface="1"><b>얼굴 공개 계정</b><span class="tiny muted">성장 +30% · 팔로워 3천부터 회사 눈치가 쌓여요</span></button></div>
  <div class="acts" style="padding:0;margin-top:8px">${actRow("in_post")}${actRow("in_reel")}${actRow("in_engage")}${actRow("in_deal", undefined, `협찬 콘텐츠 만들기 (${I.deals}건 대기)`)}${actRow("in_gong")}</div>`;
}
// 에어씨앤씨
function pgAirbnb() {
  const A = S.ab, last = A.hist.at(-1) || 0;
  const unit = (u) => { const R = D.AB_REGIONS[u.rk], L = u.last, n = AB.needAp(S, u), lowAp = !A.cohost && u.ap < n, unS = Math.round(u.unrep || 0), sk = AB.seasonKind(u.rk, S.cal);
    const sum = `<span class="tjx-s1"><b>${esc(u.name)}</b>${u.reg === "legal" ? "" : '<span class="tag red">미등록</span>'}${u.banned ? `<span class="tag red">영업정지 ${u.banned}개월</span>` : ""}${sk === "peak" ? '<span class="tag gold">성수기</span>' : ""}</span><span class="tjx-s2">${L ? `예약률 <b>${Math.round(L.occ * 100)}%</b> · <span class="gold">★${u.rating.toFixed(2)}</span> · <b class="${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</b>` : `<span class="gold">★${u.rating.toFixed(2)}</span> · 다음 달부터 손님이 와요`}${lowAp ? ` · <b class="bad">청소 ${Math.round(u.ap * 10) / 10}/${n}</b>` : ""}${unS > D.PR_REVIEW.unrep.max ? ` · <b class="bad">밀린 답글 ${unS}</b>` : ""}</span>`;
    return fold("ab-" + u.id, sum, `<div class="body"><div class="row"><div class="grow"><div class="nm">${esc(u.name)}</div><div class="tiny"><span class="tag ${u.reg === "legal" ? "green" : "red"}">${u.reg === "legal" ? (R.city ? "도시민박업(외국인 위주)" : "농어촌민박 등록") : "미등록(단속 위험)"}</span>${u.banned ? ` <span class="tag red">영업정지 ${u.banned}개월</span>` : ""}</div></div><div style="text-align:right"><div class="gold" style="font-weight:900">★ ${u.rating.toFixed(2)}</div><div class="tiny muted">숙박 ${u.stays}건 · 후기 ${u.reviews || 0}</div></div></div>
    ${L ? `<div class="kv"><div><div class="k">예약률</div><div class="v">${Math.round(L.occ * 100)}%</div></div><div><div class="k">숙박</div><div class="v">${L.nights}박</div></div><div><div class="k">외국인</div><div class="v">${L.foreign}%</div></div><div><div class="k">지난달 순익</div><div class="v ${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</div></div></div>` : '<div class="tiny muted">다음 달부터 손님이 와요</div>'}
    <div class="row wrap small"><span>월세 ${won(u.rent)} · 사진 ${Math.round(u.photo)}</span><span class="grow"></span><span class="muted">1박</span><div class="stepper"><button data-adr="${u.id}:-1">−</button><b>${u.adr}만</b><button data-adr="${u.id}:1">+</button></div></div>
    ${u.regT != null ? `<div class="tiny bad">전입·등록 기다리는 중 · ${Math.max(1, u.regT - S.t)}개월 남음(월세만 나가요)</div>` : AB.booming(u) ? `<div class="row wrap"><span class="tiny bad">후기 ${Math.round(u.reviews || 0)}/${AB.AB_ENTRY.boom.n} · 검색 노출 ${Math.round(AB.boomF(u) * 100)}%</span><span class="grow"></span><button class="btn sm ${u.half ? "gold" : ""}" data-abhalf="${u.id}:${u.half ? 0 : 1}">${u.half ? "반값 행사 중(끄기)" : "반값에 내놓기"}</button><button class="btn sm" data-abfriend="${u.id}" ${AB.friendCands(S).length && u.friendT !== S.t ? "" : "disabled"}>지인에게 묵어 달라고 ⚡1</button></div>` : ""}
    ${DK.decoRow(dctx(), "ab", u)}
    <div class="row"><span class="small">관리 <b class="${A.cohost || u.ap >= n ? "good" : "bad"}">${A.cohost ? "코호스트" : `${Math.round(u.ap * 10) / 10}/${n}`}</b></span><span class="grow"></span>${A.cohost ? "" : `<button class="btn sm" data-act="ab_clean" data-arg="${u.id}">청소 ⚡1</button>`}<button class="btn sm" data-act="ab_host" data-arg="${u.id}">응대 ⚡1</button><button class="btn sm" data-act="ab_photo" data-arg="${u.id}">사진 ⚡1</button></div>
    <div class="row"><span class="tiny ${(u.unrep || 0) > D.PR_REVIEW.unrep.max ? "bad" : "muted"}">밀린 답글 ${Math.round(u.unrep || 0)}${u.last?.newRev != null ? ` · 지난달 후기 +${u.last.newRev}` : ""}</span><span class="grow"></span><button class="btn sm" data-act="ab_reply" data-arg="${u.id}" ${(u.unrep || 0) >= 1 ? "" : "disabled"}>답글 ⚡1</button></div>${more("숙소 정리 · 더 보기", `<div class="row"><span class="grow tiny muted">정리하면 보증금 ${won(u.dep)}을 돌려받아요.</span><button class="btn sm danger" data-abclose="${u.id}">숙소 정리</button></div>`)}</div>`, A.units.length <= 1, "room", lowAp ? `<button class="btn sm" data-act="ab_clean" data-arg="${u.id}">청소 ⚡1</button>` : ""); };
  const ls = A.listings.filter((l) => s0(l));
  return `${tycoonScene(S, "airbnb")}${boardHead("airbnb")}<div class="card"><h3>에어씨앤씨 <small>${A.super ? "★ 슈퍼호스트" : `숙소 ${A.units.length}채`}</small></h3>
    <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${won(last)}</div></div><div><div class="k">외국어</div><div class="v">${Math.round(S.st.lang)}</div></div><div><div class="k">코호스트</div><div class="v">${A.cohost ? "고용 중" : "없음"}</div></div>${A.fx ? `<div><div class="k">환율 급등</div><div class="v good">${A.fx}개월</div></div>` : ""}</div>
    ${more("합법·미등록·슈퍼호스트 자세히", `<div class="tiny muted">파티룸이 '몇 시간'이라면 에어씨앤씨는 '1박'이에요. 서울에서 합법(외국인관광 도시민박업)으로 하면 외국인 위주라 <b class="gold">외국어</b>가 곧 매출이에요(내국인은 공유숙박 특례로 일부만). 합법 숙소는 등록번호가 있어 <b class="gold">노출 +8%</b>, 슈퍼호스트가 되면 5% 더. 미등록은 누구나 받지만 노출이 줄고, 이웃 신고·등록번호 점검으로 단속되면 과태료 400~1,200만과 영업정지. 별점 4.8 이상·숙박 10건이면 슈퍼호스트(노출 +12%, 요금 +8%).</div>`)}</div>
  <div class="acts" style="padding:0">${actRows(["ab_search", ["ab_cohost", undefined, A.cohost ? "코호스트 해지" : "코호스트 고용(매출 20%, 투잡 칸 +1)"], ["study", "lang", "외국어 공부 (스터디카페)"]])}</div>
  ${SP.abLaw(spc())}
  ${(() => { const pn = SP.abPanels(spc()); return pn ? fold("ab-ops", `<span class="tjx-s1"><b>운영 설정</b><span class="tiny muted">가격표·후기·청소·한 달 살기</span></span><span class="tjx-s2">${SP.abOpsSum(spc())}</span>`, `<div class="tjx-ops">${pn}</div>`, false, "tjx-opsbox") : ""; })()}
  ${A.units.map(unit).join("")}
  ${ls.length ? `<div class="sec">보던 매물 <span class="muted small">${ls.length}개</span></div>${((f) => ls.slice(0, 3).map(f).join("") + more(`보던 매물 더 보기 ${ls.length - 3}`, ls.length > 3 ? ls.slice(3).map(f).join("") : ""))((l) => { const R = D.AB_REGIONS[l.rk], T = D.AB_TYPES[l.ty]; return `<div class="room"><div class="body"><div class="nm">${esc(R.n)} ${esc(T.n)}</div><div class="small">보증금 ${won(l.dep)} · 월세 <b>${won(l.rent)}</b> · 세팅비 ${won(l.setup)}</div><div class="tiny muted">${l.house ? "주택(등록 가능)" : l.ty === "officetel" ? "오피스텔(등록 불가)" : "등록 요건이 안 되는 집"}${l.house ? ` · 집주인 동의 ${l.owner === true ? "<b class=\"good\">받음</b>" : "아직"} · 서류 ${l.doc ? (l.trap ? `<b class="bad">${esc(AB.AB_TRAPS[l.trap].n)}</b>` : "<b class=\"good\">이상 없음</b>") : "안 봄"}` : ""}</div>
      ${l.house ? `<div class="tiny muted">합법으로 열려면: ① 집주인 설득 ② 서류 확인 ③ 계약 ④ 전입·등록 한 달</div>` : ""}
      <div class="row wrap" style="margin-top:6px">${l.house && l.owner !== true ? `<button class="btn sm" data-abstep="${l.id}:ask">집주인 설득 ⚡1 (${Math.round(AB.askOwnerP(S, false) * 100)}%)</button><button class="btn sm" data-abstep="${l.id}:askp">월세 10% 올려 주고 설득 ⚡1 (${Math.round(AB.askOwnerP(S, true) * 100)}%)</button>` : ""}${l.house && !l.doc ? `<button class="btn sm" data-abstep="${l.id}:doc">서류 확인 ⚡1</button>` : ""}<button class="btn sm gold" data-abcon="${l.id}:legal" ${l.house && l.owner === true ? "" : "disabled"}>합법 등록으로 계약</button><button class="btn sm danger" data-abcon="${l.id}:illegal">미등록으로 계약</button></div></div></div>`; })}` : ""}`;
}
const s0 = () => true;
// 무인카페
function pgUcafe() {
  const U = S.uc, last = U.hist.at(-1) || 0;
  const store = (st) => { const L = st.last, n = UC.needAp(S, st), lowAp = !U.agent && st.ap < n;
    const sum = `<span class="tjx-s1"><b>${esc(st.name)}</b>${st.broken ? '<span class="tag red">머신 고장</span>' : ""}${st.night === false ? '<span class="tag">밤엔 닫음</span>' : ""}</span><span class="tjx-s2">${L ? `지난달 <b>${L.cups.toLocaleString()}잔</b> · 매출 ${won(L.rev)} · <b class="${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</b>${L.theft > 30 ? ` · <b class="bad">먹튀 ${L.theft}잔</b>` : ""}` : "다음 달부터 기계가 일해요"}${lowAp ? ` · <b class="bad">점검 ${st.ap}/${n}</b>` : ""}</span>`;
    return fold("uc-" + st.id, sum, `<div class="body"><div class="row"><div class="grow"><div class="nm">${esc(st.name)}</div><div class="tiny"><span class="tag">${st.machine === "buy" ? "머신 구매" : "머신 렌탈"}</span><span class="tag">${st.bean ? "스페셜티" : "가성비 원두"}</span>${st.cctv ? '<span class="tag green">CCTV</span>' : ""}${st.broken ? '<span class="tag red">머신 고장</span>' : ""}</div></div><div style="text-align:right"><div class="gold" style="font-weight:900">★ ${st.rating.toFixed(2)}</div><div class="tiny muted">${st.size}평 · 경쟁 ${st.comp}곳</div></div></div>
    ${L ? `<div class="kv"><div><div class="k">한 달 잔</div><div class="v">${L.cups.toLocaleString()}잔</div></div><div><div class="k">먹튀</div><div class="v ${L.theft > 30 ? "bad" : ""}">${L.theft}잔</div></div><div><div class="k">지난달 순익</div><div class="v ${L.rev - L.cost >= 0 ? "good" : "bad"}">${won(L.rev - L.cost)}</div></div></div>` : '<div class="tiny muted">다음 달부터 기계가 일해요</div>'}
    <div class="row wrap small"><span>월세 ${won(st.rent)}</span><span class="grow"></span><span class="muted">아메리카노</span><div class="stepper"><button data-ucprice="${st.id}:-0.01">−</button><b>${Math.round(st.price * 10000).toLocaleString()}원</b><button data-ucprice="${st.id}:0.01">+</button></div></div>
    <div class="row wrap"><span class="small">점검 <b class="${U.agent || st.ap >= n ? "good" : "bad"}">${U.agent ? "대행" : `${st.ap}/${n}`}</b></span><span class="grow"></span>${U.agent ? "" : `<button class="btn sm" data-act="uc_check" data-arg="${st.id}">점검 ⚡1</button>`}<button class="btn sm" data-act="uc_promo" data-arg="${st.id}">홍보 ⚡1</button><button class="btn sm" data-ucbean="${st.id}">${st.bean ? "가성비로" : "스페셜티로"}</button>${st.cctv ? "" : `<button class="btn sm" data-uccctv="${st.id}">CCTV 80만</button>`}</div>
    ${more("매장 양도 · 더 보기", `<div class="row"><span class="grow tiny muted">장사를 접고 매장을 넘겨요.</span><button class="btn sm danger" data-ucclose="${st.id}">양도</button></div>`)}</div>`, U.stores.length <= 1, "room", lowAp ? `<button class="btn sm" data-act="uc_check" data-arg="${st.id}">점검 ⚡1</button>` : ""); };
  return `${tycoonScene(S, "ucafe")}${boardHead("ucafe")}<div class="card"><h3>무인카페 <small>${U.stores.length}곳</small></h3>
    <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${won(last)}</div></div><div><div class="k">관리 대행</div><div class="v">${U.agent ? "계약 중" : "없음"}</div></div>${U.beanUp ? `<div><div class="k">원두값 급등</div><div class="v bad">${U.beanUp}개월</div></div>` : ""}</div>
    ${more("머신·원두·먹튀 자세히", `<div class="tiny muted">기계가 일하고 나는 새벽에 청소·재고를 채워요. 머신을 사면 처음에 비싸지만 매달 렌탈비가 없고 맛이 조금 더 좋아요. 렌탈은 고장 나도 수리가 공짜예요. 여름 아이스가 성수기, 겨울은 비수기. CCTV가 없으면 먹튀가 3배예요. 한 잔 가격을 올리면 잔 수가 줄어요.</div>`)}</div>
  <div class="acts" style="padding:0">${actRows(["uc_search", ["uc_agent", undefined, U.agent ? "관리 대행 해지" : "관리 대행 계약(매장당 월 40만, 투잡 칸 +1)"]])}</div>
  ${(() => { const pn = SP.ucPanels(spc()); return pn ? fold("uc-ops", `<span class="tjx-s1"><b>운영 설정</b><span class="tiny muted">영업 시간·원두 재고</span></span><span class="tjx-s2">${SP.ucOpsSum(spc())}</span>`, `<div class="tjx-ops">${pn}</div>`, false, "tjx-opsbox") : ""; })()}
  ${U.stores.map(store).join("")}
  ${U.listings.length ? `<div class="sec">보던 자리 <span class="muted small">${U.listings.length}개</span></div>${((f) => U.listings.slice(0, 2).map(f).join("") + more(`보던 자리 더 보기 ${U.listings.length - 2}`, U.listings.length > 2 ? U.listings.slice(2).map(f).join("") : ""))((l) => { const A = D.UC_AREAS[l.ak], qr = UC.quote(S, l, { machine: "rent" }), qb = UC.quote(S, l, { machine: "buy" }); return `<div class="room"><div class="body"><div class="nm">${esc(A.n)} ${l.size}평</div>${A.risk ? `<div class="tiny bad">⚠ ${esc(A.risk)}</div>` : ""}<div class="small">보증금 ${won(l.dep)} · 월세 <b>${won(l.rent)}</b> · 권리금 ${won(l.key)} · 유동인구 ${"●".repeat(Math.round(l.traffic * 3))} · 경쟁 ${l.comp}곳</div>
      <div class="row wrap" style="margin-top:6px"><button class="btn sm" data-uccon="${l.id}:rent">머신 렌탈로 열기 (${won(qr.total)})</button><button class="btn sm gold" data-uccon="${l.id}:buy">머신 사서 열기 (${won(qb.total)})</button></div></div></div>`; })}` : ""}`;
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
  ${((pk) => hb.joined.length >= max ? fold("hb-more", `<span class="tjx-s1"><b>다른 취미 ${others.length}개</b></span><span class="tjx-s2">지금은 ${hb.joined.length}/${max}개로 꽉 찼어요. 하나를 탈퇴하면 고를 수 있어요.</span>`, `<div class="tjx-ops">${pk}</div>`, false, "tjx-opsbox") : `<div class="sec">가입할 수 있는 취미</div>${pk}`)(`<div class="pick">${others.map(([k, h]) => `<button data-hbjoin="${k}" ${hb.joined.length >= max ? "disabled" : ""}><b>${esc(h.n)}</b><span class="tiny muted">월 ${h.fee}만 · ${Object.keys(h.stat).map((s) => `${D.STATS[s]}+`).join(" ") || ""}${h.hpMax ? " 체력+" : ""}</span><span class="tiny muted">투잡 단서: ${h.jobs.map((j) => esc(D.SIDEJOBS[j].n)).join(", ")}</span><span class="tiny muted">회원 ${SJ.members(S, k).length}명</span></button>`).join("")}</div>`)}`;
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
  return `<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn grow" data-ppl="map">🕸 관계도</button><button class="btn grow" data-ppl="dex">📖 인물 도감 ${PD.dexCount(meta(), E.CHAR)}/${CHARS_N}</button></div><div class="card"><h3>사람들 <small>아는 사람 ${known.length}명 · 이번 판 등장 ${S.cast.length}명</small></h3>
    ${more("호감 20·45·70에서 이야기가 열려요 · 자세히", `<div class="small muted">지도에서 사람을 만나 말을 걸면 인연이 돼요. 호감 20·45·70에서 이야기가 열리고, 45 이상이면 투잡을 도와 달라고 부탁할 수 있어요(60 이상이면 확실). 연인은 두 달 넘게 데이트를 안 하면 멀어져요.</div>`)}
    ${fam.spouse || fam.kids.length ? `<div class="row wrap" style="margin-top:8px">${fam.spouse ? `<span class="tag pink">배우자 ${esc(E.CHAR[fam.spouse].name)} · ${esc(fam.spouseType)}</span>` : ""}${fam.kids.map((k) => `<span class="tag green">${esc(k.name)} ${Math.floor((S.t - k.born) / 12)}살</span>`).join("")}<span class="tag">가족 행복 ${Math.round(fam.happy)}</span><span class="tag">부모님 건강 ${Math.round(fam.parents)}</span></div>` : ""}</div>
  <div class="filters">${[["all", "전체"], ["love", "연애"], ["friend", "친한 사이"], ["helper", "조력 가능"], ["client", "손님"]].map(([k, n]) => `<button class="${ui.filter === k ? "on" : ""}" data-filter="${k}">${n}</button>`).join("")}</div>
  ${list.length ? (() => { const h0 = (id) => Math.round(S.rel[id].aff / 20) <= 0 && !S.rel[id].lover && !S.rel[id].spouse, L1 = list.filter((id) => !h0(id)), L0 = list.filter(h0); return `${L1.length ? `<div class="pgrid">${L1.map(personCard).join("")}</div>` : ""}${L0.length ? `<details class="more card hi0"><summary>아직 인사만 한 ${L0.length}명 ▾</summary><div class="pgrid" style="margin-top:6px">${L0.map(personCard).join("")}</div></details>` : ""}`; })() : `<div class="card muted">아직 아는 사람이 없어요. 지도에서 '???'에게 말을 걸어 보세요.</div>`}`;
}

// 나
function pgMe() {
  const f = E.fireInfo(S);
  const h = S.hist.slice(-60);
  const spark = (key, color) => { if (h.length < 2) return ""; const vs = h.map((x) => +x[key] || 0); const mn = Math.min(...vs, 0), mx = Math.max(...vs, 1); const pts = vs.map((v, i) => `${(i / (vs.length - 1) * 300).toFixed(1)},${(78 - (v - mn) / (mx - mn) * 74).toFixed(1)}`).join(" "); return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`; };
  const meB = bodySrc("me", myExpr(), "half");
  return `${meB ? `<div class="mestage" style="background-image:url(${bgUrl("home") || ""})">${img(meB, "body", "나")}<div class="cap"><b>${esc(S.me.name)}</b><span>${Math.floor(S.age)}세 · ${esc(S.co.quit || S.co.fired ? "전업 사장님" : `${S.co.name} ${D.RANKS[S.co.rank].n}`)}</span></div></div>` : ""}<div class="card"><h3>파이어 계산 <small>${Math.round(f.ratio * 100)}%</small></h3>${meter(f.ratio, 1, "linear-gradient(90deg,#f5a524,#5fe0a0)")}
    <div class="kv" style="margin-top:8px"><div><div class="k">순자산</div><div class="v gold">${won(f.nw)}</div></div><div><div class="k">목표 순자산${S.fam.spouse ? "(결혼)" : ""}</div><div class="v">${won(f.target)}</div></div><div><div class="k">월 생활비 전체</div><div class="v">${won(f.spend)}</div></div><div><div class="k">기한</div><div class="v">${RD.endAgeOf(S)}세 · ${Math.max(0, Math.ceil(RD.endAgeOf(S) - S.age))}년</div></div></div>
    ${more("파이어 조건 자세히", `<div class="tiny muted">순자산이 목표(혼자 30억, 결혼하면 40억)에 닿으면 파이어를 선언할 수 있어요. 매니저가 굴리는 파티룸이나 VOD처럼 저절로 들어오는 사업 수입이 생활비를 넘으면 목표의 60%만 모아도 돼요.</div>`)}
    ${f.ready ? `<button class="btn gold" style="width:100%;margin-top:8px;padding:12px" data-fire>파이어 선언하기 (${Math.floor(S.age)}세)</button>` : ""}${S.fireAt ? `<div class="tag gold" style="margin-top:8px">${S.fireAt}세 파이어 달성 · ${RD.endAgeOf(S)}세까지 더 달리는 중</div>` : ""}</div>
  ${(() => { const fd = `<div class="tiny muted">별점 높은 파티룸, 컨설팅 Lv4~5, 인별·너튜브 팔로워가 명성을 올려요. 명성이 높을수록 문의·협찬·강의료가 오르고, 큰 판(가맹·VIP·AI 플랫폼)이 열려요. ${BIG.isFull(S) ? "지금 전업(온잡)이라 명성이 30% 빨리 올라요." : "회사를 나와 전업하면 판이 더 커져요."}</div>`; return (S.fame || 0) < 10 ? `<div class="card" style="padding:6px 12px">${more(`<b>명성 ${Math.round(S.fame || 0)}</b> · 올리는 법`, fd)}</div>` : `<div class="card"><h3>명성·온잡 <small>명성 ${Math.round(S.fame || 0)}/100</small></h3>${meter(S.fame || 0, 100, "var(--purple)")}${more("올리는 법 자세히", fd)}</div>`; })()}
  <div class="card"><h3>투자·대출</h3><div class="kv"><div><div class="k">투자(ETF)</div><div class="v">${won(S.invest)}</div></div>${E.debt(S) > 0 ? `<div><div class="k">대출 합계</div><div class="v bad">${won(E.debt(S))}</div></div><div><div class="k">월 이자·상환</div><div class="v">${won(Math.round(E.loanPay(S)))}</div></div>` : ""}</div>
    ${!E.investOpen(S) ? `<div class="tiny muted">잠김 · 투자는 1년 차가 지나고 모은 돈이 ${won(E.INV_OPEN.seed)}을 넘으면 열려요. 지금 ${S.t + 1}개월 차 · 모은 돈 ${won(Math.round(S.cash + S.invest))}</div>` : ""}
    ${!E.investOpen(S) ? "" : more("투자 조절", `<div class="row wrap">${[100, 500, 1000].map((v) => `<button class="btn sm" data-inv="${v}">+${won(v)}</button>`).join("")}${[500, 1000].map((v) => `<button class="btn sm" data-inv="-${v}">−${won(v)}</button>`).join("")}<button class="btn sm" data-inv="all">전부 빼기</button></div>`)}
    <div class="tiny muted" style="margin-top:4px">월 평균 +0.55%, 흔들림 큼.${S.loans.length ? ` 대출: ${S.loans.map((l) => `${l.n} ${won(l.amt)}(${(l.rate * 100).toFixed(1)}%)`).join(", ")}` : ""}</div></div>
  <div class="card"><h3>능력치 <small>최대 200 · ${esc(D.MAJORS[S.me.major]?.n || "")} · ${esc(D.JOBS[S.me.job]?.n || "")}</small></h3><div class="radarbox">${radar([{ v: S.st, c: "#f5c04e" }])}</div>${more("능력치 막대·구간 자세히", D.STAT_KEYS.map((k) => { const zi = D.STAT_CURVE.indexOf(E.statZone(S.st[k])), bk = E.brkOn(S, k); return `<div class="statrow stz"><span>${D.STATS[k]}</span>${meter(S.st[k], D.STAT_MAX, k === "body" ? "var(--green)" : "var(--blue)")}<b>${Math.round(S.st[k])}</b><i class="zb z${zi}${bk ? " bk" : ""}">${D.STAT_CURVE[zi].n}${bk ? "·돌파" : ""}</i></div>`; }).join(""))}<details class="stwhere"><summary>오르는 곳 자세히 ▾</summary>${D.STAT_KEYS.map((k) => `<div><b>${D.STATS[k]}</b> <span class="kindtag ${D.STAT_KIND[k]}">${D.STAT_KIND_N[D.STAT_KIND[k]].n}</span> ${D.STAT_WHERE[k]}${E.brkOn(S, k) ? ` <span class="gold">돌파 중(~${S.brk[k] - S.t + 1}달)</span>` : ""}</div>`).join("")}<div class="muted">100부터 더디고 150부터는 스승·큰 성공·아이템 같은 돌파 계기가 있어야 잘 올라요. 같은 방법만 석 달 하면 덜 올라요.</div></details>
    ${more("스태미너·행동력 계산 자세히", `<div class="tiny muted">스태미너는 매달 쓰는 기력이에요. 최대 스태미너 = 60 + 체력×0.6(지금 ${S.hpMax}). 행동력 = 4 + 스태미너÷13 + 체력÷50${D.RANKS[S.co.rank].ap ? ` ${D.RANKS[S.co.rank].ap}(직급)` : ""}${E.kidsAp(S) ? ` −${E.kidsAp(S)}(육아)` : ""}${E.spouseAp(S) ? ` ${E.spouseAp(S) > 0 ? "+" : "−"}${Math.abs(E.spouseAp(S))}(${E.spouseAp(S) > 0 ? "배우자 도움" : "배우자 반대"})` : ""}${E.kidMotiveAp(S) ? ` +${E.kidMotiveAp(S)}(아이 보며 힘내기)` : ""}${S.co.remote ? " −1(지방 근무)" : ""}. 체력과 감각은 30대 중반부터 조금씩 떨어지니 운동과 구경으로 챙겨 주세요.</div>`)}</div>
  ${CU.bagCard(S, esc)}
  <div class="card"><h3>성향 카드 <small>숨은 특성은 그 일을 시작하면 공개</small></h3><div style="display:flex;flex-direction:column;gap:6px">${S.me.traits.map((id) => traitCard(D.TRAITS.find((t) => t.id === id), true)).join("")}</div></div>
  <div class="card"><h3>특전 카드 <small>큰 일을 해내면 받아요 · 다음 인생에 1장 가져가기</small></h3>${(S.me.perks || []).length ? `<div style="display:flex;flex-direction:column;gap:6px">${S.me.perks.map((id) => traitCard(D.CARD(id), true)).join("")}</div>` : ""}${(() => { const L = D.PERKS.filter((p) => p.test && !(S.me.perks || []).includes(p.id)).map((p) => `<span class="chip">🔒 ${esc(p.got)}</span>`); return `<div class="chips" style="margin-top:6px">${L.slice(0, 3).join("")}</div>${more(`전체 보기 ${L.length - 3}`, L.length > 3 ? `<div class="chips">${L.slice(3).join("")}</div>` : "")}`; })()}</div>
  <div class="card"><h3>삶 <small>${esc(D.HOUSING[S.house.type]?.n || "")}${S.house.value ? " · " + won(S.house.value) : ""}</small></h3>
    <div class="acts" style="padding:0">${actRow("house_search")}${actRow("visit_parents")}</div></div>
  <div class="card"><h3>기록 <small>순자산(금색)·투잡 수익(초록)</small></h3><svg class="spark" viewBox="0 0 300 80" preserveAspectRatio="none">${spark("nw", "#f5c04e")}${spark("side", "#5fe0a0")}</svg>
    ${(() => { const lr = (l) => `<div><span>${l.age}세 ${l.cal}월</span><span class="lt" style="color:var(--fg)" title="${esc(l.text)}">${esc(l.text)}</span></div>`, L = S.log.slice(0, 40); return `<div class="logl">${L.slice(0, 6).map(lr).join("")}</div>${more(`더 보기 ${L.length - 6}`, L.length > 6 ? `<div class="logl">${L.slice(6).map(lr).join("")}</div>` : "")}`; })()}</div>
  <div class="row"><button class="btn sm" data-album>인생 앨범 ${(meta().album || []).length}장</button><button class="btn sm" data-newlife>이 칸에서 새 인생</button><button class="btn sm" data-toslots>저장 칸으로</button><span class="grow"></span><span class="tiny muted">${SLOT}번 칸 · 자동 저장${ST.isServer() ? "(계정)" : "(이 브라우저)"}</span></div>`;
}

// ───────── 인물 창 ─────────
// 인물 정보는 친해진 만큼만 보인다(11-24). 기준은 지금까지의 최고 호감(rel.mx). 성격에 따라 여는 속도가 조금 다르다(시크·과묵은 늦게, 유쾌·털털은 빨리).
// 한 줄 소개 10 · 나이·키·성격 하나 20 · 좋아하는 것 하나 25 · 성격 전부 35 · 좋아하는 것 전부 40 · 싫어하는 것 45 · 투잡에 도움이 되는지·손님인지·연애 가능 50(이것만은 누구나 50)
const SHY_RE = /시크|도도|수줍|무뚝뚝|차분|과묵|냉정|건조|덤덤|소심|예민|깐깐|원칙/, OPEN_RE = /유쾌|털털|낙천|엉뚱|발랄|호탕|솔직|허당|다정/;
function knowLv(id) {
  const x = S.rel[id] || {}, c = E.CHAR[id] || {}; if (S.rel[id]) x.mx = Math.max(x.mx || 0, Math.round(x.aff || 0));
  const v = x.spouse || x.lover ? 100 : Math.max(x.mx || 0, x.bond ? 40 : 0), p = (c.personality || []).join(" "), d = SHY_RE.test(p) ? 8 : OPEN_RE.test(p) ? -6 : 0;
  return { v, at: (n) => v >= n + d };
}
function ageTxt(c, K) { const a = c.age + Math.floor(S.t / 12); return K.at(20) ? `${a}세${c.height ? ` · ${c.height}cm` : ""}` : `${Math.floor(a / 10) * 10}대 ${a % 10 < 4 ? "초반" : a % 10 < 7 ? "중반" : "후반"}쯤`; }
function persTags(c, K) { const P = c.personality || [], n = K.at(35) ? P.length : K.at(20) ? 1 : 0; return P.slice(0, n).map((p) => `<span class="tag">${esc(p)}</span>`).join("") + (n < P.length ? `<span class="tag a6q">성격 ?</span>` : ""); }
function likeTxt(c, K) { const L = c.likes || [], n = K.at(40) ? L.length : K.at(25) ? 1 : 0, dis = K.at(45) && (c.dislikes || []).length ? ` · 싫어함: ${c.dislikes.map(esc).join(", ")}` : ""; return `<div class="tiny muted" style="margin-top:4px">좋아함: ${n ? L.slice(0, n).map(esc).join(", ") + (n < L.length ? " …" : "") : "아직 몰라요"}${dis}</div>`; }
function nickPick(cs) {
  if (cs.nick !== "nick") return ""; const cur = CS.nickOf(S);
  return `<div class="a6nk">${CS.NICKS.map((n) => `<button class="${cur?.k === n.k ? "on" : ""}" data-nickk="${n.k}"><b>${esc(n.n)}</b><span>${esc(n.tag)}</span></button>`).join("")}</div><div class="tiny muted" style="margin-top:4px">${cur ? `지금 활동명 <b class="gold">${esc(cur.n)}</b> · 효과는 같고, 닉네임마다 작은 이야기가 따라와요` : `<b class="bad">닉네임을 하나 골라 주세요</b>`}</div>`;
}
// 조력자에게서 올 수 있는 일(호감 단계별). 그 사람의 분야 투잡을 하고 있을 때만 온다
function helperHint(id) {
  const T = LVX.helperTiers(S, id); if (!T || !T.length) return "";
  const N = { small: "작은 호의", ap: "일손(행동력)", big: "큰 건" }, x = S.rel[id];
  return `<div class="a6hv"><b>친해지면 생기는 일</b> <span class="tiny muted">${esc(LVX.helperGate(E.CHAR[id]))}만</span><div>${T.map((t) => `<span class="${t.done ? "done" : x.aff >= t.aff ? "on" : ""}">호감 ${t.aff} · ${N[t.tier]}${t.done ? " ✓" : ""}</span>`).join("")}</div></div>`;
}
// 두근두근·연인·배우자는 화면 전체로 연다(11-24)
function loveWin(id) {
  const c = E.CHAR[id], x = S.rel[id], st = LVX.stageOf(S, id), love = st === "lover" || st === "spouse", Q = LVX.sinceInfo(S, id), LK = LVX.LV;
  const here = Object.values(S.spot).some((ids) => ids.includes(id)), months = x.lover ? S.t - x.loverSince : 0, hs = c.helper && c.helper.effect !== "none" && (knowLv(id).v >= 50 || !!x.helper);
  const b = (k, label, sub, dis, hot) => `<button class="a6lv-b ${hot ? "hot" : ""}" data-pa="${k}" ${dis ? "disabled" : ""}><b>${label}</b><span>${sub}</span></button>`;
  const done = (k) => x[k] === S.t;
  const acts = [
    here ? b("talk", "말 걸기", "⚡1") : "",
    love ? b("date", "데이트", "⚡1 · 10만", false, true) : b("meetup", "밥 먹기", "⚡1 · 4만", (x.talks?.[S.t] || 0) >= 2, true),
    love ? b("walk", "산책·집 데이트", "⚡1 · 1만") : "",
    b("drink", "술 한잔", `⚡1 · ${LK.drink.cash}만`, done("drinkT")),
    b("giftpick", "선물 고르기", "셋 중 하나", done("gift")),
    b("ping", "연락하기", "⚡0 · 한 달 1번", done("pingT")),
    love && S.sj.active.length ? b("showwork", "내 일 보여 주기", "⚡1 · 투잡 +30%", done("workT")) : "",
    love ? b("trip", "여행", "⚡3 · 80만") : "",
    x.anv && x.anv.t <= S.t ? b("anniv", `${x.anv.n} 챙기기`, `⚡1 · ${x.anv.n === "100일" ? LK.anniv.cash[0] : LK.anniv.cash[1]}만`, false, true) : "",
    st === "crush" && x.aff >= 70 && !S.fam.spouse ? (RD.loveOpen(S) ? b("confess", x.cfBack != null ? "대답 기다리는 중" : "고백하기", "⚡1", x.cfBack != null, true) : `<div class="a6lv-b lock"><b>고백</b><span>2회차부터 열려요</span></div>`) : "",
    x.lover && months >= 8 && x.aff >= 85 ? b("propose", "프러포즈", "⚡2 · 반지 300만", false, true) : "",
    hs ? b("helper", x.helper ? "조력 그만 부탁" : "투잡 도와 달라고", "⚡0") : "",
    x.lover ? b("breakup", "헤어지기", "") : "",
  ].join("");
  const top = love && Q ? Q.label : st === "crush" ? "두근두근" : LVX.STAGE_N[st];
  const anv = x.anv ? `<b class="bad">${x.anv.t <= S.t ? `이번 달이 ${x.anv.n}이에요` : `다음 달이 ${x.anv.n}이에요`}</b>` : love && Q ? `다음 기념일 ${Q.nextN} · ${Q.left}개월 뒤` : st === "crush" ? (x.aff >= 70 ? "마음이 닿은 것 같다" : `호감 70이면 고백할 수 있어요`) : "";
  openWin(`<div class="a6lv"><button class="x a6lv-x" data-close>✕</button>
    <div class="a6lv-st">${stageWho(id, exprFor(id), "full", bgUrl(charSpot(id)) || bgUrl("street") || bgUrl("alley"), undefined, true) || `<div class="sstage full">${img(faceSrc(id, exprFor(id)), "body", "")}</div>`}
      <span class="a6lv-tag ${love ? "love" : ""}">${esc(top)}</span><div class="a6lv-say">${esc(c.lines?.hello || "왔어요?")}</div>
      <div class="a6lv-nm"><b>${esc(c.name)}</b><span>${esc(c.job)} · ${c.age + Math.floor(S.t / 12)}세${c.height ? ` · ${c.height}cm` : ""}</span></div></div>
    <div class="a6lv-in"><div class="row"><span class="pink"><b>♥ ${Math.round(x.aff)}</b></span><div class="grow">${meter(x.aff, 100, "var(--pink)")}</div><span class="tiny muted">${anv}</span></div>
      <div class="row wrap" style="margin-top:6px">${(c.personality || []).map((p) => `<span class="tag">${esc(p)}</span>`).join("")}${x.bond && E.BOND_N[x.bond] ? `<span class="tag">${E.BOND_N[x.bond]}</span>` : ""}${hs ? `<span class="tag green">${esc(c.helper.role)}</span>` : ""}</div>
      <div class="tiny muted" style="margin-top:4px">좋아함: ${(c.likes || []).map(esc).join(", ")}${(c.dislikes || []).length ? ` · 싫어함: ${c.dislikes.map(esc).join(", ")}` : ""}</div>
      ${hs ? helperHint(id) : ""}
      <div class="a6lv-g">${acts}</div>
      ${x.lastChat && x.lastChat.q < 2 && S.t - x.lastChat.t <= 1 ? `<button class="btn sm" style="width:100%;margin-top:8px" data-bmredo="${id}">지난 까톡 다시 답하기 · ${esc(BMX.label("chatRedo"))}</button>` : ""}
      <div class="tiny muted" style="margin-top:6px">까톡은 찾아가지 않아도 와요(행동력 0). ${love ? "두 달 넘게 못 만나면 서운해해요. 바쁜 달엔 연락하기라도." : RD.loveOpen(S) ? "" : "연애는 2회차부터 열려요. 지금은 두근두근까지."}</div></div></div>`,
    (el) => el.querySelectorAll("[data-pa]").forEach((bt) => bt.onclick = () => { const k = bt.dataset.pa; if (S.pending) { closeWin(); return showScene(); } const res = k === "talk" ? E.talkTo(S, id) : E.personAct(S, id, k); if (!res.ok) return toast([], res.msg); closeWin(); afterRes(res); }), false, true);
}
function charWin(id) {
  const c = E.CHAR[id], x = S.rel[id];
  if (!x) { const res = E.talkTo(S, id); if (!res.ok) return toast([], res.msg); return afterRes(res); }
  if (LVX.isBig(S, id) && !x.affair) return loveWin(id);
  const romance = E.isRomanceable(S, c);
  const months = x.lover ? S.t - x.loverSince : 0;
  const here = Object.values(S.spot).some((ids) => ids.includes(id));
  const btn = (k, label, cost, dis) => `<button class="btn" data-pa="${k}" ${dis ? "disabled" : ""}>${label}${cost ? ` <span class="ap">⚡${cost}</span>` : ""}</button>`;
  const K = knowLv(id), hs = c.helper && c.helper.effect !== "none" && (K.v >= 50 || !!x.helper); // 투잡에 도움이 되는지는 호감 50부터 보인다
  const st = c.stats || {};
  openWin(`<h2>${esc(c.name)} <button class="x" data-close>✕</button></h2>
    <div class="scene">${stageWho(id, exprFor(id), "half", bgUrl(charSpot(id)) || bgUrl("street") || bgUrl("alley")) || ""}<div class="who"><div class="pic" ${BODY[id] ? 'style="display:none"' : ""}>${img(faceSrc(id, exprFor(id)))}</div><div class="grow"><div><b>${esc(c.job)}</b> · ${ageTxt(c, K)}</div><div class="tagline">${K.at(10) ? esc(c.tagline || "") : "아직 잘 모르는 사이"}</div>
    <div class="row wrap" style="margin-top:4px">${persTags(c, K)}${x.bond && E.BOND_N[x.bond] ? `<span class="tag">${E.BOND_N[x.bond]}</span>` : ""}${romance && K.v >= 50 ? `<span class="tag pink">연애 가능</span>` : ""}${hs ? `<span class="tag green">${esc(c.helper.role)}</span>` : ""}${c.customer && K.v >= 50 ? `<span class="tag blue">${c.customer.board === "partyroom" ? "파티룸 손님" : "컨설팅 손님"}</span>` : ""}${x.affair ? `<span class="tag red">비밀 관계 · 의심 ${Math.round(S.fam.affair?.sus || 0)}</span>` : x.spouse ? `<span class="tag pink">배우자</span>` : x.lover ? `<span class="tag pink">연인 ${months}개월</span>` : ""}${x.helper ? `<span class="tag gold">조력 중</span>` : ""}</div>
    ${likeTxt(c, K)}</div></div>
    <div class="small">호감도 <b>${Math.round(x.aff)}</b> ${here ? "· 지금 지도에 있음" : ""}</div>${meter(x.aff, 100, "var(--pink)")}
    <div class="tiny muted" style="margin:2px 0 8px">친해질수록 이 사람을 더 알게 돼요 · 20 친해짐 · 45 속이야기 · 50 ${romance && K.v >= 50 ? "두근두근 · 70 고백 가능" : "더 깊은 사이 · 70 평생 친구"}</div>
    ${hs ? helperHint(id) : ""}
    ${hs ? `<div class="tiny muted">조력 효과: ${esc(HELP_DESC[c.helper.effect] || "")} · 수고비 월 ${E.helperPay(S, id)}만 · 능력 ${Math.round(st[E.helperStat(c)] || 50)}</div>` : ""}
    <div class="row wrap" style="margin-top:10px">
      ${here ? btn("talk", "말 걸기", 1) : ""}${x.aff >= 15 ? btn("meetup", "약속 잡기(4만)", 1) : ""}
      ${btn("giftpick", "선물 고르기", 0)}${x.aff >= LVX.LV.drink.min ? btn("drink", `술 한잔(${LVX.LV.drink.cash}만)`, 1) : ""}
      ${x.lover || x.spouse || x.affair ? btn("date", x.affair ? "몰래 만나기(10만)" : "데이트(10만)", 1) + btn("trip", x.affair ? "몰래 여행(80만)" : "여행(80만)", 3) : ""}
      ${romance && !x.lover && !x.spouse && x.aff >= 70 && !S.fam.spouse ? (RD.loveOpen(S) ? btn("confess", x.cfBack != null ? "대답 기다리는 중" : "고백하기", 1) : `<span class="tiny muted" style="align-self:center">고백은 2회차부터 열려요</span>`) : ""}
      ${x.lover && months >= 8 && x.aff >= 85 ? btn("propose", "프러포즈(반지 300만)", 2) : ""}
      ${hs ? btn("helper", x.helper ? "조력 그만 부탁" : "투잡 도와 달라고 부탁", 0) : ""}
      ${x.lover ? btn("breakup", "헤어지기", 0) : ""}
    </div></div>`, (el) => el.querySelectorAll("[data-pa]").forEach((b) => b.onclick = () => {
    const k = b.dataset.pa; let res;
    if (S.pending) { closeWin(); return showScene(); }
    if (k === "talk") res = E.talkTo(S, id);
    else if (/^gift\d+$/.test(k)) res = E.personAct(S, id, "gift", +k.slice(4));
    else res = E.personAct(S, id, k);
    if (!res.ok) return toast([], res.msg);
    closeWin(); afterRes(res);
  }));
}
const HELP_DESC = { pr_clean: "파티룸 청소·관리(청소비 −30%, 관리 행동력 −)", pr_interior: "인테리어(비용 −12%, 별점 +)", pr_photo: "사진 촬영(예약 +6%)", pr_realty: "매물 정보(매물 +1, 숨은 정보 1개 공개)", pr_landlord: "자기 건물 매물(건물주 환영·권리금 0)", pr_repair: "수리(파손 비용 −50%)", cs_coach: "공동 코치(매달 고객 3명 자동 처리, 수익 40% 나눔)", cs_hr: "인사담당자 정보(합격률 +8%p)", cs_headhunter: "경력 이직 고객 소개", cs_design: "썸네일·상세페이지(크멍·인별 +30%)", cs_video: "영상 편집(너튜브 +50%)", cs_lecture: "강의 섭외", cs_writer: "블로그 글 대행(+30%)", tax: "세무(종합소득세 −20%)", invest: "재테크 조언(투자 수익 +)", health: "운동 코치(체력 회복 +3)", mental: "마음 상담(멘탈 회복 +3)" };

// ───────── 장면 창 ─────────
// ───────── 화보 연출: 큰 순간은 그 사람이 있는 곳으로 이동하며 크게 ─────────
const CINE_BG = { lover: "rooftop", propose: "rooftop", wedding: "wedding", baby: "apt", breakup: "street", promo: "desk", fired: "desk", quit: "desk", burnout: "home", pr_open: "partyroom", pr_multi: "partyroom", cs_first: "consult", cs_pen: "consult", cs_name: "consult", ab_first: "airbnb", ab_super: "airbnb", uc_open: "ucafe", uc_multi: "ucafe", in_10k: "home", in_deal: "home", house: "apt", seed: "home", fire: "rooftop", grad: "library", parents_bye: "parents" };
Object.assign(CINE_BG, { full_pr: "partyroom", full_cs: "consult", full_airbnb: "airbnb", full_ucafe: "ucafe", full_insta: "home" });
const CINE_TAG = { full_pr: "본잡 전환", full_cs: "본잡 전환", full_airbnb: "본잡 전환", full_ucafe: "본잡 전환", full_insta: "본잡 전환", lover: "연애", propose: "연애", wedding: "결혼", baby: "가족", breakup: "연애", parents_bye: "가족", promo: "회사", fired: "회사", quit: "회사", burnout: "나", pr_open: "파티룸", pr_multi: "파티룸", cs_first: "컨설팅", cs_pen: "컨설팅", cs_name: "컨설팅", ab_first: "숙소", ab_super: "숙소", uc_open: "무인카페", uc_multi: "무인카페", in_10k: "인별그램", in_deal: "인별그램", house: "인생", seed: "인생", fire: "인생", grad: "인생", arc3: "인연", ...RIVAL_CINE_TAG };
Object.assign(CINE_BG, IGA.CINE_BG); Object.assign(CINE_TAG, IGA.CINE_TAG); Object.assign(CINE_BG, HU.CINE_BG, H2U.CINE_BG); Object.assign(CINE_TAG, HU.CINE_TAG, H2U.CINE_TAG); // 인별 화보(핫플·콜라보·시대의 컨셉·브랜드)
const COUPLE = new Set(["lover", "propose", "wedding", "baby"]);
function cineKey(sc) { return sc.cine || (sc.kind === "wedding" ? "propose" : sc.kind === "arc" && sc.stage === 3 ? "arc3" : D.TITLE_CINE[sc.title]) || null; }
function cineHtml(p) {
  const ppl = (p.people || []).filter(Boolean);
  return `<div class="cine" role="dialog" aria-label="${esc(p.title)}"><div class="cimg ${p.cg ? "cg" : ""}" style="background-image:url(${p.img})"></div>
    ${ppl.length ? `<div class="cppl n${ppl.length}">${ppl.map((src) => `<img class="body" src="${src}" alt="">`).join("")}</div>` : ""}
    <div class="cbar t"></div><div class="cbar b"></div>
    <div class="ctag">화보 · ${esc(p.tag || "인생")}</div>
    <div class="ccap"><span>${esc(p.when)}</span><b>${esc(p.title)}</b>${p.line ? `<p>${esc(p.line)}</p>` : ""}</div>
    <div class="ctap">${p.tapText || "눌러서 계속"}</div></div>`;
}
function cinePlay(sc, key, done) {
  const files = CG[key] || [], cgf = files.length ? files[Math.floor(Math.random() * files.length)] : null;
  const who = sc.who && E.CHAR[sc.who] ? sc.who : null;
  const bgk = key === "arc3" && who ? charSpot(who) : CINE_BG[key];
  const imgU = cgf ? `img/cg/${cgf}` : bgUrl(bgk) || sceneBg(sc) || bgUrl("street");
  const expr = ["breakup", "fired", "burnout", "parents_bye"].includes(key) ? "sad" : COUPLE.has(key) ? "blush" : "smile";
  const meP = bodySrc("me", expr === "blush" ? "smile" : expr, "full");
  const people = cgf ? (NOPPL.has(cgf.replace(/\.webp$/, "")) ? [COUPLE.has(key) && who ? bodySrc(who, expr, "full") : null, meP] : []) : [who ? bodySrc(who, expr, "full") : null, (COUPLE.has(key) || !who || IGA.DUO.has(key)) && key !== "breakup" ? meP : null]; // v4.27 사람 없는 화보에도 내 캐릭터
  const p = { k: key, img: imgU, cg: !!cgf, people, title: sc.title.replace(/^특전 카드 · /, ""), line: sc.kind === "story" ? String(sc.text || "").split("\n")[0] : String(sc.text || "").split(/(?<=[.!?])\s/).slice(0, 2).join(" "), when: `${E.ymLabel(S)} · ${Math.floor(S.age)}세`, tag: CINE_TAG[key] };
  // 인생 앨범에 남기기(다음 인생에도 남는다)
  try { const m = meta(); m.album = [{ k: key, img: imgU, cg: !!cgf, who, ppl: people.filter(Boolean), title: p.title, line: p.line, when: p.when, tag: p.tag, run: S.ng?.n || 1, name: S.me.name }, ...(m.album || [])].slice(0, 300); setMeta(m); } catch (e) {}
  showCine(p, done);
}
function showCine(p, done) {
  document.querySelector(".cine")?.remove();
  const wrap = document.createElement("div"); wrap.innerHTML = cineHtml(p); const el = wrap.firstElementChild; document.body.appendChild(el);
  try { FX.play("win"); } catch (e) {}
  let ready = false; setTimeout(() => { ready = true; el.classList.add("ready"); }, 900);
  el.onclick = () => { if (!ready) return; el.classList.add("out"); setTimeout(() => { el.remove(); done && done(); }, 260); };
  el._skip = () => { if (!el.isConnected) return; el.remove(); done && done(); }; // 시험용: 900ms 기다리지 않고 바로 넘기기
}
// ───────── 미니게임 기록·다시 하기(시작 화면, 11-21) ─────────
// meta.mgDone = { <key>: { n: 판 수, best: 최고 점수(0~100, 모르면 null), grade } }. 해 본 게임만 연습할 수 있다
function mgDoneMap() {
  const m = meta();
  if (!m.mgDone) { // 옛 저장: 투잡별 판 수(mgPlays)와 번갈아 나오는 순서로 이미 한 게임을 채운다(점수는 모름)
    const d = {};
    try { for (const [job, p] of Object.entries(m.mgPlays || {})) { const ks = mgKeys(job).filter((k) => MG[k]); for (let i = 0; i < p && ks.length; i++) { const k = ks[i % ks.length]; d[k] = d[k] || { n: 0, best: null, grade: "" }; d[k].n++; } } } catch (e) {}
    m.mgDone = d; setMeta(m);
  }
  return m.mgDone;
}
// 한 판 끝: 판 수(연습 판은 안 셈)·최고 점수 기록
function mgRecord(key, r, practice = false) {
  if (!key || !r || !Number.isFinite(+r.score)) return;
  try {
    const d = { ...mgDoneMap() }, o = d[key] || { n: 0, best: null, grade: "" }, sc = Math.round(Math.max(0, Math.min(1, +r.score)) * 100), up = o.best == null || sc > o.best;
    d[key] = { n: o.n + (practice ? 0 : 1), best: up ? sc : o.best, grade: up ? r.grade || "" : o.grade };
    const m = meta(); m.mgDone = d; setMeta(m);
  } catch (e) {}
}
// 모든 미니게임(투잡 순서대로)
function mgAll() { mg2Init(); const ks = Object.keys(MG), bs = [...new Set(ks.map((k) => MG[k].base || k))]; return bs.flatMap((b) => ks.filter((k) => (MG[k].base || k) === b)); }
function tjxCss() {
  if (document.getElementById("tjxcss")) return;
  const s = document.createElement("style"); s.id = "tjxcss";
  s.textContent = `.tjx{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.tjx>button{display:flex;flex-direction:column;align-items:stretch;gap:3px;padding:9px;border-radius:14px;background:var(--panel2);border:1px solid var(--line);color:var(--fg);text-align:left;min-width:0;font:inherit;cursor:pointer}
.tjx>button:active{transform:scale(.98)}
.tjx-th{display:flex;gap:4px;height:56px;margin-bottom:3px}
.tjx-th i{flex:1;min-width:0;border-radius:8px;background:#ffffff10 center/cover no-repeat}
.tjx-th i.e{display:flex;align-items:center;justify-content:center;font-style:normal;font-size:26px}
.tjx-ic{height:56px;margin-bottom:3px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:30px;background:linear-gradient(135deg,#ff8fc833,#7c9cff40)}
.tjx b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tjx span{font-size:12px;color:var(--gold);font-weight:700}
.tjr-h{margin:12px 0 6px;font-size:14px}
.tjr{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tjr button{display:flex;flex-direction:column;gap:3px;text-align:left;padding:9px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);color:var(--fg);font:inherit;min-width:0;cursor:pointer}
.tjr button b{font-size:13px}
.tjr button span{font-size:11.5px;color:var(--muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tjr button em{font-style:normal;font-size:11.5px;color:var(--gold);font-weight:700}
.tjr-t{display:flex;align-items:center;gap:6px;min-width:0}
.tjr-ic{flex:none;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px;color:var(--gold);background:linear-gradient(135deg,#ff8fc833,#7c9cff40)}
.tjr-ic svg{width:16px;height:16px}
.tjr-ic.lk{background:#ffffff12;filter:grayscale(1);opacity:.55}
.tjr button.lock{cursor:default;border-style:dashed;background:transparent}
.tjr button.lock b{opacity:.85}
.tjr button.lock span{opacity:.8}
.tjr button.lock em{color:var(--muted);font-weight:600}`;
  document.head.appendChild(s);
}
function mgReplayWin() {
  tjxCss();
  const done = mgDoneMap(), all = mgAll(), n = all.filter((k) => done[k]).length, groups = {};
  for (const k of all) (groups[MG[k].base || k] = groups[MG[k].base || k] || []).push(k);
  const jn = (b) => D.SIDEJOBS[b]?.n || b;
  // 안 해 본 게임도 이름·설명은 보여 주고, 아이콘 자리만 잠금(11-21 v4.24). 누를 수 없음
  const head = (b, g, lk) => `<div class="tjr-t"><i class="tjr-ic${lk ? " lk" : ""}">${lk ? "🔒" : ic(TILE[b]?.ic || "spark")}</i><b>${esc(g.n)}</b></div><span>${esc(g.desc || "")}</span>`;
  openWin(`<h2>미니게임 다시 하기 <span class="tag gold">${n}/${all.length}</span> <button class="x" data-close>✕</button></h2><div class="small muted">해 본 미니게임은 여기서 연습할 수 있어요. 연습 판은 인생에 영향이 없고 최고 점수만 남아요. 잠긴 게임은 게임 속 투잡에서 처음 하면 열려요.</div>
    ${Object.entries(groups).map(([b, ks]) => `<h3 class="tjr-h">${esc(jn(b))}</h3><div class="tjr">${ks.map((k) => { const g = MG[k], d = done[k]; return d ? `<button data-mgp="${k}">${head(b, g)}<em>${d.best != null ? `최고 ${d.best}점 · ${esc(d.grade || "")}` : `${d.n}번 해 봄 · 점수 기록 없음`}</em></button>` : ""; }).join("")}</div>${(() => { const lk = ks.filter((k) => !done[k]); return lk.length ? `<div class="tjx-mglock">🔒 잠김 ${lk.length}개 <span>${lk.map((k) => esc(MG[k].n)).join(" · ")}</span><em>게임에서 ${esc(jn(b))} 투잡을 하면 열려요</em></div>` : ""; })()}`).join("")}`,
  (w) => w.querySelectorAll("[data-mgp]").forEach((b) => b.onclick = () => mgPractice(b.dataset.mgp)));
}
// 연습 판: 게임 상태(S)·효과·판 수는 그대로, 최고 점수만 갱신
function mgPractice(key) {
  const av = meta().mgAv || {};
  openWin(`<div class="mghost"></div><button class="mgquit" data-mgquit>그만하기</button>`, async (w2) => {
    let bail; const bailP = new Promise((res) => { bail = res; });
    const onErr = (e) => { try { console.warn("미니게임 오류", key, e?.error || e?.reason || e); } catch (e2) {} bail("err"); };
    window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
    w2.querySelector("[data-mgquit]").onclick = () => bail("quit");
    let r = null;
    try { r = await Promise.race([mgRun(key, w2.querySelector(".mghost"), { skill: 40, avatar: av.avatar || null, gender: av.gender || "F", practice: true }), bailP]); } catch (e) { r = null; try { console.warn("미니게임 오류", key, e); } catch (e2) {} }
    window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onErr);
    if (r && typeof r === "object" && r.loadFail) toast([], "미니게임을 불러오지 못했어요. 인터넷 연결을 확인해 주세요");
    else if (r && typeof r === "object") mgRecord(key, r, true);
    else if (r === "err") toast([], "미니게임에 문제가 생겨 닫았어요");
    closeWin(); if (!S) renderTitle(); mgReplayWin();
  }, true, true);
}
// 인생 앨범: 지금까지 본 화보. 첫 화면과 나 화면에서 본다
// v4.27 앨범 사람: 남겨 둔 사람 그림(ppl). 예전 기록은 화보가 아니면 같이 나온 사람만 다시 붙인다
function albPpl(a) { if (a.ppl?.length) return a.ppl; if (!a.cg && a.who && E.CHAR[a.who]) { try { return [bodyOr(a.who, "smile", "full", pixFace(a.who, "smile"))]; } catch (e) {} } return []; }
function albumWin() {
  const A = meta().album || [];
  const keys = new Set(A.map((a) => a.k));
  openWin(`<h2>인생 앨범 <span class="tag gold">${A.length}장</span> <button class="x" data-close>✕</button></h2><div class="small muted">큰 순간을 맞을 때마다 한 장씩 쌓여요. 같은 순간도 그림이 여러 장이라 인생마다 달라요. 모은 순간 ${keys.size}/${Object.keys(CINE_TAG).length}가지.</div>
    ${A.length ? `<div class="album">${A.map((a, i) => `<button data-alb="${i}" style="background-image:linear-gradient(180deg,#0000 40%,#000c),url(${a.img})">${albPpl(a).map((src, j) => `<img class="albp p${j}" src="${src}" alt="" loading="lazy">`).join("")}<b>${esc(a.title)}</b><span>${a.run}회차 · ${esc(a.when)}</span></button>`).join("")}</div>` : `<div class="card small muted" style="margin-top:10px">아직 비어 있어요. 연애·결혼·투잡 첫 오픈 같은 큰 순간에 채워져요.</div>`}`, (w) => w.querySelectorAll("[data-alb]").forEach((b) => b.onclick = () => { const a = A[+b.dataset.alb]; showCine({ ...a, people: albPpl(a), tapText: "눌러서 닫기" }); }));
}
// ───────── 연말 결산 화면(v4.24) ─────────
// 매년 12월 마감에 엔진이 kind "year" 장면을 넣는다(engine/yearend.js). 막 내림 → 타이틀 → 숫자 → 광고 자리 → 올해의 장면 → 한 줄 정리 → 본잡 신호/다음 해로
// [광고 자리] 나중에 광고 SDK 를 꽂는 곳. el(빈 상자)에 광고를 그리면 된다. 지금은 '투잡연구소 팁' 카드만 그린다.
//   예) if (window.ADS?.ready) return window.ADS.banner(el, { slot: "year_end" }); — 전면 광고면 yearShow 의 go(2) 들어갈 때 부르기
function yearAdSlot(el, tip) {
  if (!el) return;
  el.innerHTML = `<div class="yr-tip"><span class="yr-k">투잡연구소 팁</span><p>${esc(tip || "")}</p></div>`;
}
function yrCss() {
  if (document.getElementById("yrcss")) return;
  const s = document.createElement("style"); s.id = "yrcss";
  s.textContent = `.yr{position:fixed;inset:0;z-index:60;background:#05060f;color:#eef0ff;display:flex;flex-direction:column;animation:yrIn .5s ease-out;overflow:hidden}
.yr::before,.yr::after{content:"";position:absolute;left:0;right:0;height:50%;background:#000;z-index:3;pointer-events:none}
.yr::before{top:0;animation:yrCt 1.3s ease-in-out forwards}.yr::after{bottom:0;animation:yrCb 1.3s ease-in-out forwards}
@keyframes yrIn{from{opacity:0}to{opacity:1}}@keyframes yrCt{0%{transform:translateY(-100%)}40%{transform:translateY(0)}100%{transform:translateY(-101%)}}@keyframes yrCb{0%{transform:translateY(100%)}40%{transform:translateY(0)}100%{transform:translateY(101%)}}
.yr-top{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 6px;max-width:520px;width:100%;margin:0 auto;box-sizing:border-box}
.yr-dots{display:flex;gap:5px;flex:1}.yr-dots i{height:4px;flex:1;border-radius:3px;background:#ffffff22}.yr-dots i.on{background:var(--gold,#ffd25e)}
.yr-skip{background:none;border:1px solid #ffffff33;color:#cfd3ff;border-radius:999px;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer}
.yr-body{flex:1;position:relative;max-width:520px;width:100%;margin:0 auto;overflow:hidden}
.yr-pg{position:absolute;inset:0;padding:8px 16px 16px;box-sizing:border-box;overflow:auto;opacity:0;transform:translateX(24px);transition:opacity .35s,transform .35s;pointer-events:none;display:flex;flex-direction:column}
.yr-pg.on{opacity:1;transform:none;pointer-events:auto}.yr-pg.past{transform:translateX(-24px)}
.yr-ttl{align-items:center;justify-content:center;text-align:center;gap:6px}
.yr-ttl .yr-sm{font-size:13px;color:#aab0dd;letter-spacing:.2em;opacity:0;animation:yrUp .7s .9s forwards}
.yr-ttl b{font-size:64px;line-height:1;font-weight:900;letter-spacing:.04em;background:linear-gradient(180deg,#fff,#ffd25e);-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0;animation:yrUp .8s 1.1s forwards}
.yr-ttl .yr-k2{font-size:22px;font-weight:800;opacity:0;animation:yrUp .7s 1.3s forwards}.yr-ttl em{font-style:normal;font-size:12px;color:#8d93c4;opacity:0;animation:yrUp .7s 1.5s forwards}
@keyframes yrUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.yr-h{font-size:13px;color:#aab0dd;margin:6px 0 10px;letter-spacing:.06em}.yr-h b{color:#fff;font-size:20px;display:block;letter-spacing:0;margin-top:2px}
.yr-row{display:flex;align-items:baseline;gap:8px;padding:10px 0;border-bottom:1px solid #ffffff14}.yr-row span{font-size:13px;color:#b8bde6;flex:1}.yr-row b{font-size:17px}.yr-row small{font-size:11.5px;color:#8d93c4;display:block;text-align:right}
.yr-in{color:#7fe3a5}.yr-out{color:#ff8a8a}
.yr-meter{position:relative;height:12px;border-radius:7px;background:#ffffff14;margin:6px 0 16px}.yr-meter>i{position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:linear-gradient(90deg,#7c9cff,#ffd25e,#ff6b6b)}
.yr-meter u{position:absolute;top:-3px;bottom:-3px;width:2px;background:#ffffff66;text-decoration:none}.yr-meter u::after{content:attr(data-l);position:absolute;top:16px;left:-10px;font-size:11px;color:#8d93c4;white-space:nowrap}
.yr-tip{margin:auto 0;border:1px dashed #ffffff33;border-radius:16px;padding:18px;background:#ffffff08}.yr-k{font-size:12px;color:var(--gold,#ffd25e);font-weight:800}.yr-tip p{font-size:15px;line-height:1.6;margin:8px 0 0}
.yr-ad{flex:1;display:flex;flex-direction:column;justify-content:center}
.yr-pics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}.yr-pics i{aspect-ratio:3/4;border-radius:10px;background:#ffffff10 center/cover no-repeat}
.yr-hi{display:flex;flex-direction:column;gap:7px}.yr-hi div{background:#ffffff0c;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.45;word-break:keep-all}
.yr-tip p,.yr-sig p,.yr-warn{word-break:keep-all}.yr-past{margin-top:auto;padding-top:14px}.yr-past .yr-k{display:block;margin-bottom:6px}.yr-past div{display:flex;gap:8px;font-size:12.5px;color:#b8bde6;padding:5px 0;border-top:1px solid #ffffff10}.yr-past div b{color:#fff;min-width:38px}.yr-past div span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.yr-q{margin:auto 0;text-align:center;padding:0 4px}.yr-q .yr-k{display:block;margin-bottom:14px}
.yr-q b{display:block;font-size:27px;line-height:1.3;font-weight:900;word-break:keep-all;opacity:0}.yr-pg.on .yr-q b{animation:yrUp .8s .2s forwards}
.yr-q p{font-size:14.5px;line-height:1.65;color:#cfd3ff;margin:14px 0 0;word-break:keep-all;opacity:0}.yr-pg.on .yr-q p{animation:yrUp .8s .7s forwards}
.yr-sig{border-radius:18px;padding:16px;margin:6px 0 12px;background:#ffffff0c;border:1px solid #ffffff22}
.yr-sig .yr-lv{font-size:12px;font-weight:800;letter-spacing:.06em}.yr-sig h3{margin:4px 0 8px;font-size:24px;word-break:keep-all}.yr-sig p{font-size:14px;line-height:1.6;margin:0}
.yr-sig.soft{border-color:#7c9cff88}.yr-sig.soft .yr-lv{color:#9db3ff}
.yr-sig.strong{border-color:#ffb44d;background:#ffb44d14}.yr-sig.strong .yr-lv{color:#ffc46b}.yr-sig.strong h3{color:#ffd28a}
.yr-sig.go{border:2px solid #ff5c5c;background:radial-gradient(circle at 50% 0,#ff5c5c33,#ff5c5c08)}.yr-sig.go .yr-lv{color:#ff8a8a}.yr-sig.go h3{font-size:44px;color:#fff;text-shadow:0 0 18px #ff5c5c;text-align:center;margin:8px 0 10px}
.yr-pg.on .yr-sig.go h3{animation:yrShake .5s .3s 2}@keyframes yrShake{0%,100%{transform:none}25%{transform:translateX(-5px) rotate(-2deg) scale(1.06)}75%{transform:translateX(5px) rotate(2deg) scale(1.06)}}
.yr-warn{font-size:12.5px;color:#ffcf7a;background:#ffb44d14;border-radius:10px;padding:8px 10px;margin-top:10px;line-height:1.5}.yr-ok{font-size:12.5px;color:#9fe8b7;margin-top:10px}
.yr-ch{display:flex;flex-direction:column;gap:8px;margin-top:auto;padding-top:8px}.yr-ch button{font:inherit;font-size:15px;font-weight:800;padding:14px;border-radius:14px;border:1px solid #ffffff33;background:#ffffff10;color:#fff;cursor:pointer}
.yr-ch button.main{background:linear-gradient(180deg,#ffd25e,#f0a92e);color:#2a1a00;border:0}.yr-ch button.red{background:linear-gradient(180deg,#ff6b6b,#d93c3c);color:#fff;border:0}
.yr-nav{max-width:520px;width:100%;margin:0 auto;padding:6px 16px calc(12px + env(safe-area-inset-bottom,0px));box-sizing:border-box;display:flex}
.yr-nav button{flex:1;font:inherit;font-size:15px;font-weight:800;padding:13px;border-radius:14px;border:0;background:#ffffff14;color:#fff;cursor:pointer}`;
  document.head.appendChild(s);
}
function yearShow(sc) {
  yrCss();
  const d = sc.year || {}, f = sc.full, L = sc.line || { head: "한 해 수고 많았어요", sub: "" };
  const pct = (v) => `${Math.round((v || 0) * 100)}%`, sg = (v) => (v >= 0 ? "+" : "") + won(v);
  const run = S.ng?.n || 1, pics = (meta().album || []).filter((a) => a.run === run && String(a.when || "").startsWith(`${d.year}년`)).slice(0, 3);
  const xw = Math.min(1, (d.x || 0) / 2.5) * 100;
  const ev = d.ev, partial = d.months && d.months < 12 ? ` <small style="display:inline;color:#8d93c4;font-size:11.5px">(${d.months}개월)</small>` : "";
  const pages = [
    `<div class="yr-pg yr-ttl"><span class="yr-sm">한 해가 저물었습니다</span><b>${d.year}</b><span class="yr-k2">결산</span><em>${esc(S.me.name)} · ${Math.floor(S.age)}세</em></div>`,
    `<div class="yr-pg"><div class="yr-h">① 올해 숫자${partial}<b>${d.year}년 가계부</b></div>
      ${d.work || d.salSum ? `<div class="yr-row"><span>월급 합${d.bon ? ` · 성과급 ${won(d.bon)}` : ""}</span><b>${won(d.salSum + (d.bon || 0))}</b></div>` : ""}
      <div class="yr-row"><span>${d.work ? "투잡 이익" : "내 일 이익"}</span><b class="${d.side >= 0 ? "yr-in" : "yr-out"}">${d.hasJob ? sg(d.side) : "아직 없음"}</b></div>
      ${d.work && d.hasJob && d.annual ? `<div class="tiny" style="color:#b8bde6;margin-top:8px">연봉(${won(d.annual)}) 대비 <b style="color:#fff">${(d.x || 0).toFixed(1)}배</b></div><div class="yr-meter"><i style="width:${xw}%"></i><u style="left:40%" data-l="1배"></u><u style="left:60%" data-l="1.5배"></u><u style="left:80%" data-l="2배"></u></div>` : ""}
      <div class="yr-row"><span>투자 손익</span><b class="${d.inv >= 0 ? "yr-in" : "yr-out"}">${sg(d.inv || 0)}</b></div>
      <div class="yr-row"><span>순자산</span><div><b>${won(d.nw)}</b><small>${won(d.nw0)}에서 ${sg(d.nw - d.nw0)}</small></div></div>
      <div class="yr-row"><span>파이어 목표(${won(d.target)})까지</span><div><b>${pct(d.fire)}</b><small>작년보다 ${d.fire - d.fire0 >= 0 ? "+" : "−"}${Math.abs(Math.round((d.fire - d.fire0) * 100))}%p</small></div></div>
      ${ev ? `<div class="yr-row"><span>연말 평가</span><div><b>${esc(ev.g)}${ev.promo ? ` · ${esc(ev.promo)} 승진!` : ""}</b><small>연봉 ${ev.raise ? `+${(ev.raise * 100).toFixed(1)}%` : "동결"}${ev.bonus ? ` · 성과급 ${won(ev.bonus)}` : ""}</small></div></div>` : ""}
      ${(d.past || []).length >= 2 || (d.past || []).some((p) => p.q || (+p.x) >= 0.05) ? `<div class="yr-past"><span class="yr-k">지난 결산</span>${d.past.map((p) => `<div><b>${p.y}</b><span>「${esc(p.line)}」</span><em style="font-style:normal">${p.x ? `연봉의 ${(+p.x).toFixed(1)}배` : p.q ? "전업" : "투잡 없음"}</em></div>`).join("")}</div>` : ""}</div>`,
    `<div class="yr-pg"><div class="yr-h">잠깐 쉬어 가기<b>다음 장 넘기기 전에</b></div><div class="yr-ad" data-yrad></div></div>`,
    `<div class="yr-pg"><div class="yr-h">② 올해의 장면<b>${d.year}년을 기억하며</b></div>
      ${pics.length ? `<div class="yr-pics">${pics.map((a) => `<i style="background-image:url('${esc(a.img || "")}')"></i>`).join("")}</div>` : ""}
      <div class="yr-hi">${(d.hi || []).length ? d.hi.map((h) => `<div>${esc(h)}</div>`).join("") : `<div>큰 사건 없이 조용히 지나간 한 해. 이런 해가 쌓여야 큰 해가 와요.</div>`}</div></div>`,
    `<div class="yr-pg"><div class="yr-q"><span class="yr-k">${d.year}년, 한 줄 정리</span><b>「${esc(L.head)}」</b><p>${esc(L.sub)}</p></div></div>`,
    f ? `<div class="yr-pg"><div class="yr-h">③ 본잡 전환 신호<b>${esc(f.jn)} · 연봉의 ${(d.x || 0).toFixed(1)}배</b></div>
      <div class="yr-sig ${f.lv}"><div class="yr-lv">${f.lv === "go" ? "강력 신호" : f.lv === "strong" ? "강하게 권유" : "가능성 신호"} · ${f.step}배 돌파</div><h3>${esc(f.head)}</h3><p>${esc(f.body)}</p>
      ${f.emer ? `<div class="yr-ok">비상금 6개월치(${won(f.need)}) 준비 완료</div>` : `<div class="yr-warn">⚠ 비상금 6개월치(${won(f.need)})가 아직이에요(지금 ${won(Math.max(0, f.have))}). 나가도 되지만, 첫 비수기에 흔들릴 수 있어요.</div>`}</div>
      <div class="yr-ch"><button data-ch="0" class="${f.lv === "go" ? "red" : "main"}">${esc(sc.choices[0].t)}</button><button data-ch="1">${esc(sc.choices[1].t)}</button></div></div>`
      : `<div class="yr-pg"><div class="yr-q"><span class="yr-k">${d.year + 1}년</span><b>새해에도 퇴근 후 3시간</b><p>${d.work && d.hasJob && d.annual ? `투잡 이익이 연봉을 넘으면(지금 ${(d.x || 0).toFixed(1)}배) 연말에 본잡 전환 신호가 와요.` : d.work ? "퇴근 후 시간을 무엇으로 채울지, 새해에 정해 봐요." : "내 일로 맞는 새해. 오늘도 사장님 출근!"}</p></div><div class="yr-ch"><button data-ch="0" class="main">다음 해로</button></div></div>`,
  ];
  const N = pages.length;
  $modal.innerHTML = `<div class="yr" role="dialog" aria-label="${esc(sc.title)}"><div class="yr-top"><div class="yr-dots">${pages.map(() => "<i></i>").join("")}</div><button class="yr-skip" data-yrskip>건너뛰기 ››</button></div><div class="yr-body">${pages.join("")}</div><div class="yr-nav"><button data-yrnext>다음 ›</button></div></div>`;
  const root = $modal.querySelector(".yr"), P = [...root.querySelectorAll(".yr-pg")], dots = [...root.querySelectorAll(".yr-dots i")], nav = root.querySelector(".yr-nav"), skip = root.querySelector("[data-yrskip]");
  let at = -1, adDone = false, tmr = null;
  const go = (i) => {
    i = Math.max(0, Math.min(N - 1, i)); if (i === at) return; clearTimeout(tmr);
    P.forEach((p, k) => { p.classList.toggle("on", k === i); p.classList.toggle("past", k < i); });
    dots.forEach((x, k) => x.classList.toggle("on", k <= i));
    if (i === 2 && !adDone) { adDone = true; yearAdSlot(root.querySelector("[data-yrad]"), sc.tip); }
    nav.style.visibility = i === N - 1 ? "hidden" : ""; skip.style.visibility = i === N - 1 ? "hidden" : "";
    if (i === N - 1 && f) try { FX.play(f.lv === "go" ? "win" : "scene"); } catch (e) {}
    at = i;
    if (i === 0) tmr = setTimeout(() => { if (at === 0 && root.isConnected) go(1); }, 2400);
  };
  root.querySelector("[data-yrnext]").onclick = () => go(at + 1);
  skip.onclick = () => go(N - 1);
  P.forEach((p, k) => p.addEventListener("click", (e) => { if (k < N - 1 && !e.target.closest("button")) go(at + 1); }));
  root.querySelectorAll("[data-ch]").forEach((b) => b.onclick = () => {
    clearTimeout(tmr);
    const i = +b.dataset.ch, res = E.choose(S, i); save(); FX.play("ok");
    if (!f) { closeWin(); return continueChain(); }
    const after = () => openWin(`<div class="scene"><h2>${i === 0 && (S.co.quit || S.co.fired) ? "본잡 전환" : esc(sc.title)}</h2><div class="result"><div class="txt">${esc(res.text || "")}</div>${res.lines.length ? `<div class="effs">${res.lines.map((l) => `<span>${esc(l)}</span>`).join("")}</div>` : ""}</div><button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-ok>확인</button></div>`, (el2) => el2.querySelector("[data-ok]").onclick = () => { closeWin(); continueChain(); }, true, true);
    closeWin();
    if (i === 0 && S.co.quit) cinePlay({ kind: "event", title: f.lv === "go" ? "나왔다!" : "본잡 전환", text: `${d.year}년 겨울, 사직서를 냈다. 내일부터 출근지는 ${jo(f.jn, "이다", "다")}.` }, "full_" + f.job, after);
    else after();
  });
  FX.play("scene");
  const jp = (location.hash.match(/yrp(\d)/) || [])[1]; // 시험용: #auto14-yr2-yrp5 → 6번째 장부터
  go(jp ? +jp : 0);
}
// WARNING 화면(11-23): 판이 바뀌는 큰 사건(engine/wave.js)·경제 뉴스·큰 시장 충격 앞에 뜬다. 누르면 장면으로
function warnPlay(sc, done) {
  const w = sc.warn || {}, el = document.createElement("div"); el.className = "a6w";
  el.innerHTML = `<div class="a6w-st t"></div><div class="a6w-mid"><div class="a6w-w">WARNING</div><div class="a6w-h">${esc(w.head || sc.title)}</div>${w.sub ? `<div class="a6w-s">${esc(w.sub)}</div>` : ""}<div class="a6w-go">눌러서 계속</div></div><div class="a6w-st b"></div>`;
  document.body.appendChild(el); FX.play("bad"); setTimeout(() => { if (el.isConnected) FX.play("bad"); }, 450);
  let ok = false; setTimeout(() => { ok = true; el.classList.add("rdy"); }, 900);
  el.onclick = () => { if (!ok) return; el.remove(); done(); };
}
// BURNING 화면(11-24): WARNING 과 같은 틀에 금색. 좋은 쪽의 큰 사건(engine/extras.js burnScene)
function burnPlay(sc, done) {
  const w = sc.burn || {}, el = document.createElement("div"); el.className = "a6w a6burn";
  el.innerHTML = `<div class="a6w-st t"></div><div class="a6w-mid"><div class="a6w-w">BURNING</div><div class="a6w-h">${esc(w.head || sc.title)}</div>${w.sub ? `<div class="a6w-s">${esc(w.sub)}</div>` : ""}<div class="a6burn-x">수입 ×2</div><div class="a6w-go">눌러서 계속</div></div><div class="a6w-st b"></div>`;
  document.body.appendChild(el); FX.play("win"); setTimeout(() => { if (el.isConnected) FX.play("ok"); }, 450);
  let ok = false; setTimeout(() => { ok = true; el.classList.add("rdy"); }, 900);
  el.onclick = () => { if (!ok) return; el.remove(); done(); };
}
function showScene() {
  const sc = S.pending; if (!sc) return;
  bgmGo();
  if (document.querySelector(".cine, .a6w")) return;
  if (sc.warn && !sc._warned) { sc._warned = 1; return warnPlay(sc, () => { if (S.pending === sc) showScene(); }); } // 11-23 큰 사건은 WARNING 화면부터
  if (sc.burn && !sc._burned) { sc._burned = 1; return burnPlay(sc, () => { if (S.pending === sc) showScene(); }); } // 11-24 버닝 이벤트(1회차 5년 차의 큰 건)는 금색 BURNING 화면부터
  if (sc.kind === "year") return yearShow(sc); // 연말 결산은 전용 화면(v4.24)
  { const ck = cineKey(sc); if (ck && !sc._cined) { sc._cined = 1; return cinePlay(sc, ck, () => { if (S.pending !== sc) return; if (sc.kind === "story") { E.choose(S, 0); save(); closeWin(); continueChain(); } else showScene(); }); } }
  FX.play(sc.kind === "wedding" ? "win" : "scene");
  let segs = null; try { segs = XR.dialog(S, sc, sc.text); } catch (e) { console.warn(e); }
  const talk = !!segs && segs.some((x) => x.k !== "n"); // 누가 말하는 장면이면 대화창으로 그린다(11-24)
  let lead = sc.who; try { lead = XR.leadOf(S, sc, segs) || sc.who; } catch (e) {}
  const who = lead && XR.who(lead);
  const pf = ui.preFx; ui.preFx = null;
  const pre = pf && (pf.msg || pf.lines.length) ? `<div class="prefx">${pf.msg ? `<span>${esc(pf.msg)}</span>` : ""}${pf.lines.filter(Boolean).map((l) => `<b>${esc(l)}</b>`).join("")}</div>` : "";
  const expr = sc.expr || (sc.kind === "meet" ? "neutral" : sc.kind === "wedding" ? "blush" : sc.kind === "arc" ? (sc.stage === 3 ? "blush" : "smile") : "neutral");
  openWin(`<div class="scene">${pre}<h2>${esc(String(sc.title).replace(/^선배 찾아가기 · (.+?) (\d+\/\d+)(?: · (질문 \d+\/\d+))?$/,(m, j, a, b) => `${j} 선배 ${a}${b ? ` · ${b}` : ""}`))}${sc.tag ? ` <span class="tag gold">${esc(sc.tag)}</span>` : ""}</h2>
    ${who ? stageWho(lead, expr, "full", sceneBg(sc, lead), `<b>${esc(who.name)}</b><span>${esc(XR.EXTRA[lead] ? XR.EXTRA[lead].role || who.job : who.job)}</span>`) ?? `<div class="who${sc.mentor ? " big" : ""}"><div class="pic">${img(faceSrc(lead, expr))}</div><div><b>${esc(who.name)}</b><div class="tagline">${esc(who.job)} · ${esc(who.tagline || "")}</div></div></div>` : ""}
    ${talk ? dlgHtml(segs, expr) : `<div class="txt">${esc(XR.plain(sc.text))}</div>`}
    <div class="choices">${((H) => sc.choices.map((c, i) => `<button data-ch="${i}" class="${H[i] ? "a6rec" : ""}"><span>${H[i] ? `<i class="a6rec-t ${/모 아니면 도/.test(H[i]) ? "g" : ""}">${H[i]}</i>` : ""}${esc(c.t)}</span>${c.pct != null ? `<span class="pct">${D.STATS[c.check.stat]} ${c.pct}%</span>` : ""}</button>`).join(""))((() => { try { return E.choiceHints(S, sc); } catch (e) { return []; } })())}</div>${S.t < E.HINT_T && (() => { try { return E.choiceHints(S, sc).some(Boolean); } catch (e) { return false; } })() ? `<div class="tiny muted" style="margin-top:4px;text-align:center">처음 2년 동안은 좋은 선택지에 추천 표시가 붙어요</div>` : ""}</div>`, (el) => el.querySelectorAll("[data-ch]").forEach((b) => b.onclick = () => {
    const res = E.choose(S, +b.dataset.ch); save(); FX.play(res.ok === false ? "bad" : "ok");
    if (sc.kind === "story" && !res.lines.length && !res.text) { closeWin(); return continueChain(); }
    openWin(`<div class="scene"><h2>${esc(sc.title)}</h2>${who ? stageWho(lead, res.ok === false ? "sad" : sc.kind === "wedding" || sc.kind === "arc" ? "blush" : "smile", "half", sceneBg(sc, lead)) ?? `<div class="who"><div class="pic">${img(faceSrc(lead, res.ok === false ? "sad" : "smile"))}</div></div>` : ""}
      <div class="result">${res.check ? `<div class="${res.ok ? "ok" : "ng"}">${esc(res.check)}</div>` : ""}${resTxt(sc, res, segs)}${res.lines.length ? `<div class="effs">${res.lines.map((l) => `<span>${esc(l)}</span>`).join("")}</div>` : ""}</div>
      <button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-ok>확인</button></div>`, (el2) => el2.querySelector("[data-ok]").onclick = () => { closeWin(); continueChain(); }, true, true);
  }), true, true);
}
// 대화창(11-24): 장면 글을 바탕 글·사람이 한 말·화면에 뜬 글로 나눠 그린다. 나누는 일은 engine/extras.js dialog()
const DL_IC = { chat: "💬", msg: "✉", mail: "📧", bell: "🔔" };
function dlgHtml(segs, expr = "neutral") {
  return `<div class="a6dl">${segs.map((x, i) => {
    const d = `style="animation-delay:${(Math.min(i, 7) * 0.13).toFixed(2)}s"`;
    if (x.k === "n") return `<p class="a6dl-n" ${d}>${esc(x.t)}</p>`;
    if (x.k === "p") return `<div class="a6dl-p" ${d}><span class="a6dl-ic">${DL_IC[x.ic] || "💬"}</span><div class="a6dl-b"><b>${esc(x.name)}</b><p>${esc(x.t)}</p></div></div>`;
    const me = x.id === "me", c = me ? null : XR.who(x.id), ex = XR.EXTRA[x.id];
    const sub = me ? "" : ex ? ex.role : c?.bit ? "" : c?.job || "";
    return `<div class="a6dl-s ${me ? "me" : ""}" ${d}><span class="a6dl-f">${img(me ? meSrc("neutral") : faceSrc(x.id, expr))}</span><div class="a6dl-b"><b>${esc(me ? S.me.name : c?.name || "")}${sub ? `<i>${esc(sub)}</i>` : ""}${x.via ? `<em>${esc(x.via)}</em>` : ""}</b><p>${esc(x.t)}</p></div></div>`;
  }).join("")}</div>`;
}
function resTxt(sc, res, segs) {
  let g = null; try { g = XR.dialog(S, sc, res.text || "", XR.lastSpeaker(segs)); } catch (e) {}
  return g && g.some((x) => x.k !== "n") ? dlgHtml(g, res.ok === false ? "sad" : "smile") : `<div class="txt">${esc(XR.plain(res.text))}</div>`;
}
// 아직 고를 때가 아닌데 시작하기를 눌렀을 때: 주인공이 스스로 말린다(11-24)
function sjNo() {
  const why = SJ.startLock(S); if (!why) return render();
  FX.play("bad");
  openWin(`<div class="scene"><h2>아직 이르다 <span class="tag gold">투잡 탐색</span></h2><div class="a6dl"><div class="a6dl-s"><span class="a6dl-f">${img(meSrc("neutral"))}</span><div class="a6dl-b"><b>${esc(S.me.name)}<i>속마음</i></b><p>${esc(why)}</p></div></div></div>
    <div class="row" style="margin-top:12px"><button class="btn grow" data-g="co">회사로</button><button class="btn grow" data-g="hobby">취미로</button><button class="btn gold grow" data-close>알겠어</button></div></div>`, (w) => w.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => { closeWin(); go(b.dataset.g); }), false, true);
}
function continueChain() {
  if (S.over && (S.pending || S.sceneQ?.length)) { S.pending = null; S.sceneQ = []; save(); } // 11-23 개인회생·번아웃으로 끝난 달에 줄 서 있던 장면은 버린다(끝 화면 위에 회사 장면이 뜨던 문제)
  if (S.ended && !S.over) { // 11-23 나이 결산·파이어로 끝난 달: 연말 결산과 큰 순간(이야기·화보)만 보여 주고, 그달의 잔사건은 버린다(끝 화면 위에 사건·카드 고르기가 뜨던 문제)
    const keep = (x) => !!x && (x.kind === "year" || x.kind === "story"); const n0 = (S.pending ? 1 : 0) + (S.sceneQ?.length || 0);
    if (S.pending && !keep(S.pending)) S.pending = null; S.sceneQ = (S.sceneQ || []).filter(keep);
    if (n0 !== (S.pending ? 1 : 0) + S.sceneQ.length) save();
  }
  render();
  if (S.pending) return showScene();
  const nx = E.nextQueuedScene(S); if (nx) return showScene();
  if (S.gc?.offers?.length && !S.over && !S.ended) return CU.pickWin(gcx(), continueChain); // 연말·조각 카드 고르기(v4.25). 끝난 판에서는 고르지 않는다(11-23)
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
    ${(() => { const N = rc.notes.filter((n) => !/회비만 냈다$/.test(n)); return N.length ? `<div class="notes">${N.map((n) => `<div>${esc(n)}</div>`).join("")}</div>` : ""; })()}
    ${!S.over && S.debtLate > 0 ? `<div class="danger-box"><b>⚠ 카드값 연체 ${S.debtLate}개월째</b><div>신용 한도까지 다 써서 잔고가 마이너스예요. <b>3개월 연속</b>이면 개인회생(이번 인생 끝)이에요. 남은 기회 <b>${3 - S.debtLate}번</b>.</div><div class="tiny">살릴 방법: 적자 지점 양도·매각 · 비싼 지출 줄이기 · 야근·성과로 월급 지키기 · 투잡 수입 올리기</div></div>` : (() => { const rw = E.runway(S); return !S.over && rw.months <= 3 ? `<div class="danger-box warn"><b>⚠ ${rw.months ? `이대로면 ${rw.months}달 뒤` : "다음 달이면"} 돈이 바닥나요</b><div>월 ${won(-rw.net)} 적자 · 남은 신용 한도 ${won(rw.credit)}. 한도를 다 쓰고 3달 연속 마이너스면 개인회생이에요.</div></div>` : ""; })()}
    <button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-ok>${S.sceneQ.length ? `다음 (사건 ${S.sceneQ.length})` : "다음 달 시작"}</button>`, (el) => el.querySelector("[data-ok]").onclick = () => { closeWin(); continueChain(); if (!S.over && !S.ended) toast([`행동력 ${S.apMax}`, `스태미너 ${Math.round(S.hp)}`], `${S.year}년 ${S.cal}월`); }, true);
}

// ───────── 설정 ─────────
// 효과음·진동·글자 크기 + 저장 백업 코드(앱을 지우면 기기 저장이 사라지므로) + 버전·개인정보
const B64 = { en: (s) => btoa(unescape(encodeURIComponent(s))), de: (s) => decodeURIComponent(escape(atob(s.replace(/\s+/g, "")))) };
function settingsWin(slots) {
  const g = FX.get(), sw = (k, n, d) => `<button class="setrow" data-tg="${k}"><span class="grow"><b>${n}</b><span class="tiny muted">${d}</span></span><span class="tjx-onoff ${g[k] ? "on" : ""}">${g[k] ? "켬" : "끔"}</span><span class="tgl ${g[k] ? "on" : ""}"><i></i></span></button>`;
  const empty = slots?.find((x) => x.empty);
  openWin(`<h2>설정 <button class="x" data-close>✕</button></h2>
    ${sw("sound", "효과음", "누를 때·돈 들어올 때 짧은 소리")}${sw("music", "배경 음악", "화면에 맞춰 잔잔한 음악. 처음 들을 때 곡을 받아요")}<label class="setrow tjx-vol${g.music ? "" : " off"}"><span class="grow"><b>음악 크기</b></span><input type="range" min="0" max="100" step="5" value="${Math.round(BGM.volume() * 100)}" data-mvol aria-label="음악 크기"><span class="tjx-onoff on" data-mvolv>${Math.round(BGM.volume() * 100)}</span></label>${sw("vib", "진동", "안드로이드 폰에서만 울려요")}${sw("big", "큰 글씨", "화면 전체를 조금 크게")}${S ? `<button class="setrow" data-coach><span class="grow"><b>투잡 코치</b><span class="tiny muted">초반 고생 구간의 코치 한마디·할 일 안내</span></span><span class="tjx-onoff ${S.sj.coachOff ? "" : "on"}">${S.sj.coachOff ? "끔" : "켬"}</span><span class="tgl ${S.sj.coachOff ? "" : "on"}"><i></i></span></button>` : ""}
    ${!S ? `<div class="tiny muted" style="margin-top:8px">인생은 ${ST.allowed()}칸까지 저장돼요(기본 1칸, 저장 칸 추가로 3칸까지). 칸이 다 차면 한 칸을 지우고 시작해요.</div>` : ""}
    <button class="btn" style="width:100%;margin-top:8px" data-bmshop>상점 ${BMX.qaOn() ? "(QA 모드)" : "(준비 중)"}</button>
    <div class="card" style="margin-top:10px"><h3>저장 백업</h3><div class="tiny muted" style="margin-bottom:6px">로그인하지 않으면 이 기기에만 저장돼요. 앱을 지우기 전에 코드를 복사해 두면 다시 불러올 수 있어요.</div>
      ${S ? `<button class="btn sm" data-bkcopy>지금 인생 코드 복사</button>` : ""}
      ${!S && slots ? (empty ? `<textarea data-bkin rows="3" placeholder="백업 코드를 붙여 넣으세요" style="width:100%;margin-top:6px;font-size:11px;background:#0b0d1a;color:#dfe3ff;border:1px solid #2a2e55;border-radius:8px;padding:6px"></textarea><button class="btn sm gold" data-bkload style="margin-top:6px">${empty.slot}번 칸으로 불러오기</button>` : `<div class="tiny muted">불러오려면 빈 칸이 하나 있어야 해요.</div>`) : ""}
      ${!S && !slots ? `<div class="tiny muted">시작 화면의 설정에서 불러올 수 있어요.</div>` : ""}</div>
    <div class="tiny muted" style="margin-top:10px;text-align:center">After 6PM v${FX.VERSION} · <a href="privacy.html" target="_blank" rel="noopener" style="color:inherit">개인정보 처리방침</a></div>`, (el) => {
    const cb = el.querySelector("[data-coach]"); if (cb) cb.onclick = () => { S.sj.coachOff = !S.sj.coachOff; save(); settingsWin(slots); };
    el.querySelectorAll("[data-tg]").forEach((b) => b.onclick = () => { const k = b.dataset.tg; if (k === "music") BGM.setOn(!FX.get().music); else FX.put(k, !FX.get()[k]); if (FX.get()[k]) FX.play("ok"); settingsWin(slots); });
    const mv = el.querySelector("[data-mvol]"); if (mv) mv.oninput = () => { BGM.setVolume(mv.value / 100); el.querySelector("[data-mvolv]").textContent = mv.value; };
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
  const isScene = /class="scene/.test(html);
  $modal.innerHTML = `<div class="bg ${center ? "center" : ""}" ${lock ? "" : "data-bgclose"}><div class="win${isScene ? " scwin" : ""}">${html}</div></div>`;
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
  { const sw = $app.querySelector("[data-sw2]"), hb = $app.querySelector("[data-sw2go]");
    if (sw && hb) { const dots = hb.querySelectorAll("i"), lab = hb.querySelector("span");
      const upd = () => { const p = sw.scrollLeft > sw.clientWidth / 2 ? 1 : 0; dots.forEach((d, i) => d.classList.toggle("on", i === p)); lab.textContent = p ? "옆으로 밀면 상태" : "옆으로 밀면 능력치"; };
      sw.addEventListener("scroll", upd, { passive: true });
      hb.onclick = () => sw.scrollTo({ left: sw.scrollLeft > sw.clientWidth / 2 ? 0 : sw.clientWidth, behavior: "smooth" }); } }
  q("[data-stmore]", (el) => { const k = el.dataset.stmore; ui.stOff = ui.stOff || {}; ui.stOff[k] = (ui.stOff[k] || 0) + 4; render(); });
  q("[data-tipx]", () => { ui.tip = null; render(); });
  q("[data-money]", () => moneyWin());
  q("[data-apinfo]", () => apWin());
  q("[data-rkid]", () => go(unlocked("family") ? "family" : "me"));
  q("[data-coach]", () => { S.coachOff = 1; save(); render(); });
  q("[data-swipe]", (el) => step(+el.dataset.swipe));
  q("[data-fitcards]", () => fitCardsWin());
  q("[data-sjno]", () => sjNo());
  q("[data-sjstart]", (el) => { const k = el.dataset.sjstart, j = D.SIDEJOBS[k]; openWin(`<h2>${esc(j.n)} 시작할까? <button class="x" data-close>✕</button></h2>${fitCardHtml(k, false)}<div class="small" style="line-height:1.8;margin-top:8px">· 수익: ${esc(j.inc)}<br>· 시간: ${esc(j.hours)} · 시작 자본 ${esc(j.cap)}<br>· 궁합: ${SJ.fit(S, k).g} (${j.fit.map((x) => D.STATS[x]).join("·")})${(() => { const N = SJ.need(S, k), P = S.sj.rp?.[k]; return N ? `<br>· 필요 역량: ${esc(N.n)} ${N.need} (지금 <b class="${N.ok ? "good" : "bad"}">${N.cur}</b>) · 준비 ${P?.prep || 0}/3${N.ok ? "" : "<br>· 코치: 역량이 모자라면 첫 몇 달은 손님이 훨씬 적어요. 홍보·후기로 버텨야 해요."}` : ""; })()}<br>· 회사에 들키면 경고 → 감봉 → 해고. ${k === "cs" ? "실명으로 하면 더 잘 들킨다." : "지점이 늘수록 눈치가 쌓인다."}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>조금 더 고민</button><button class="btn gold grow" data-yes>시작하기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = SJ.start(S, k); closeWin(); toast([], r.msg); save(); if (r.ok) { go(k); if (r.hid?.length) openWin(`<h2>숨은 특성 공개 <button class="x" data-close>✕</button></h2><div class="small muted">${esc(jo(j.n, "을", "를"))} 시작하니 내 성향이 이렇게 드러나요.</div><div class="intro" style="margin-top:8px">${r.hid.map((x) => `<p>★ ${esc(x)}</p>`).join("")}</div><button class="btn gold" style="width:100%;margin-top:10px" data-close>확인</button>`, null, false, true); } else render(); }); });
  q("[data-sjstop]", (el) => openWin(`<h2>${esc(D.SIDEJOBS[el.dataset.sjstop].n)} 그만둘까요? <button class="x" data-close>✕</button></h2><div class="small">쌓은 후기·능력치는 남아요. 나중에 다시 시작할 수 있어요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>접기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = SJ.stop(S, el.dataset.sjstop); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-sjf]", (el) => { ui.sjf = el.dataset.sjf; render(); });
  q("[data-hbjoin]", (el) => { const r = SJ.hbJoin(S, el.dataset.hbjoin); toast([], r.msg); save(); render(); });
  q("[data-hbleave]", (el) => { const r = SJ.hbLeave(S, el.dataset.hbleave); toast([], r.msg); save(); render(); });
  q("[data-sjmemo]", (el) => sjMemoWin(el.dataset.sjmemo));
  q("[data-act]", (el) => { if (S.pending) return showScene(); if (el.dataset.why) return toast([], el.dataset.why); doAct(el.dataset.act, el.dataset.arg); });
  q("[data-end]", () => endMonthFlow(false));
  q("[data-region]", (el) => { ui.region = el.dataset.region || null; ui.spot = el.dataset.spot || null; render(); window.scrollTo(0, 0); });
  q("[data-bang]", (el) => { const res = E.doBang(S, el.dataset.bang); if (!res.ok) return toast([], res.msg); afterRes(res); });
  q("[data-char]", (el) => charWin(el.dataset.char));
  q("[data-ppl]", (el) => pplOpen(el.dataset.ppl));
  q("[data-todo]", (el) => { const g = el.dataset.todo; if (g.startsWith("people:")) return charWin(g.slice(7)); if (["pr", "cs", "sj", "hobby", "family", "co", "insta", "grad", "airbnb", "ucafe"].includes(g) || REG.get(g)) { ui.prFlow = null; return go(g); } if (D.SPOTS[g]) { if (D.SPOTS[g].region === "company") return go("co"); ui.page = "map"; ui.region = D.SPOTS[g].region; } else if (g === "parents") { ui.page = "map"; ui.region = "parents"; } render(); window.scrollTo(0, 0); });
  q("[data-prflow]", (el) => { const v = el.dataset.prflow; if (!v) ui.prFlow = null; else if (v === "district") ui.prFlow = { step: "district", dk: ui.prFlow?.dk }; else if (v.startsWith("list:")) ui.prFlow = { step: "list", dk: v.slice(5) }; else if (v.startsWith("contract:")) ui.prFlow = { step: "contract", id: v.slice(9) }; ui.page = "pr"; render(); });
  q("[data-dk]", (el) => { ui.prFlow.dk = el.dataset.dk; render(); });
  q("[data-cc]", (el) => { ui.prFlow.concept = el.dataset.cc; render(); });
  q("[data-it]", (el) => { ui.prFlow.interior = +el.dataset.it; render(); });
  q("[data-self]", () => { ui.prFlow.self = !ui.prFlow.self; render(); });
  q("[data-ondol]", () => { ui.prFlow.ondol = !ui.prFlow.ondol; render(); });
  q("[data-sign]", (el) => { const f = ui.prFlow; const r = PR.contract(S, el.dataset.sign, { concept: f.concept, interior: f.interior, self: !!f.self, ondol: !!f.ondol }); toast([], r.msg); if (r.ok) ui.prFlow = null; save(); render(); if (r.ok && r.room) DK.decoAsk(dctx(), "pr", r.room.id); });
  q("[data-price]", (el) => { const [id, d] = el.dataset.price.split(":"); const rm = S.pr.rooms.find((x) => x.id === id); PR.setPrice(S, id, rm.price + +d); save(); render(); });
  q("[data-sys]", (el) => { const r = PR.buySystem(S, el.dataset.sys); toast([], r.msg); save(); render(); });
  q("[data-close-room]", (el) => openWin(`<h2>지점 양도 <button class="x" data-close>✕</button></h2><div class="small">보증금과 권리금(별점·수익이 좋을수록 비싸요)을 받고 넘겨요. 지금 시세 ${won(PR.resale(S, S.pr.rooms.find((x) => x.id === el.dataset.closeRoom)))}. 제안이 오면 더 받을 수도 있어요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-yes>양도하기</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = PR.closeRoom(S, el.dataset.closeRoom); closeWin(); toast([], r.msg); save(); render(); }));
  $app.querySelectorAll("[data-concept]").forEach((el) => el.addEventListener("change", () => { const r = PR.setConcept(S, el.dataset.concept, el.value); if (r.msg) toast([], r.msg); save(); render(); }));
  q("[data-niche]", (el) => { const r = CS.setNiche(S, el.dataset.niche); toast([], r.msg || ""); save(); render(); });
  q("[data-nick]", (el) => { const r = CS.setNick(S, el.dataset.nick); toast([], r.msg); save(); render(); });
  q("[data-nickk]", (el) => { const r = CS.setNick(S, "nick", el.dataset.nickk); toast([], r.msg); save(); render(); });
  q("[data-cprice]", (el) => { const r = CS.setPrice(S, el.dataset.cprice); toast([], r.msg); save(); render(); });
  q("[data-cspol]", (el) => { const r = CS.setPolicy(S, el.dataset.cspol); if (r.msg) toast([], r.msg); save(); render(); }); // f30 운영 원칙
  $app.querySelectorAll("[data-ads]").forEach((el) => el.addEventListener("change", () => { CS.setAds(S, +el.value); save(); render(); }));
  q("[data-quit]", () => openWin(`<h2>정말 퇴사할까? <button class="x" data-close>✕</button></h2><div class="small">${E.quitReady(S).ok ? "환승 조건을 채웠다. 행동력 +5, 월급은 끊긴다." : "조건을 못 채웠다. 대표님 철학: 선퇴사 금지. 그래도?"}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-yes>사직서 제출</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = E.quitCompany(S); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-filter]", (el) => { ui.filter = el.dataset.filter; render(); });
  q("[data-inv]", (el) => { if (!E.investOpen(S)) return toast([], "투자는 아직 잠겨 있어요"); const v = el.dataset.inv; if (v === "all") { S.cash += S.invest; S.invest = 0; } else { const n = +v; if (n > 0 && S.cash >= n) { S.cash -= n; S.invest += n; } else if (n < 0) { const m = Math.min(S.invest, -n); S.invest -= m; S.cash += m; } else return toast([], "현금이 부족해요"); } save(); render(); });
  q("[data-igopen]", (el) => IGA.openInsta(igctx(), el.dataset.igopen));
  q("[data-inniche]", (el) => { const r = INS.setNiche(S, el.dataset.inniche); toast([], r.msg || ""); save(); render(); });
  q("[data-inface]", (el) => { const r = INS.setFace(S, el.dataset.inface === "1"); toast([], r.msg); save(); render(); });
  q("[data-uccon]", (el) => { const [id, m] = el.dataset.uccon.split(":"); const r = UC.contract(S, id, { machine: m, bean: 0 }); toast([], r.msg); save(); render(); });
  q("[data-ucprice]", (el) => { const [id, d] = el.dataset.ucprice.split(":"); const st = S.uc.stores.find((x) => x.id === id); UC.setPrice(S, id, st.price + +d); save(); render(); });
  q("[data-ucbean]", (el) => { const st = S.uc.stores.find((x) => x.id === el.dataset.ucbean); UC.setBean(S, st.id, !st.bean); toast([], st.bean ? "스페셜티 원두: 맛·별점 +, 원가 +" : "가성비 원두: 원가 −"); save(); render(); });
  q("[data-uccctv]", (el) => { const r = UC.buyCctv(S, el.dataset.uccctv); toast([], r.msg); save(); render(); });
  q("[data-ucclose]", (el) => openWin(`<h2>매장을 넘길까요? <button class="x" data-close>✕</button></h2><div class="small">보증금, 머신 중고값, 최근 수익에 맞는 권리금을 받고 넘겨요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>양도</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = UC.close(S, el.dataset.ucclose); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-abstep]", (el) => { const [id, k] = el.dataset.abstep.split(":"); const r = k === "doc" ? AB.docs(S, E.R(S), id) : AB.persuade(S, E.R(S), id, k === "askp"); toast(r.lines || [], r.msg); save(); render(); });
  q("[data-abhalf]", (el) => { const [id, v] = el.dataset.abhalf.split(":"); const r = AB.setHalf(S, id, v === "1"); toast([], r.msg); save(); render(); });
  q("[data-abfriend]", (el) => { const r = AB.friendStay(S, E.R(S), el.dataset.abfriend); toast(r.lines || [], r.msg); save(); render(); });
  q("[data-abcon]", (el) => { const [id, reg] = el.dataset.abcon.split(":"); const r = AB.contract(S, id, reg); toast([], r.msg); save(); render(); if (r.ok && r.unit) DK.decoAsk(dctx(), "ab", r.unit.id); });
  q("[data-deco]", (el) => { const [k, id] = el.dataset.deco.split(":"); DK.decoOpen(dctx(), k, id); });
  q("[data-abclose]", (el) => openWin(`<h2>숙소를 정리할까요? <button class="x" data-close>✕</button></h2><div class="small">보증금만 돌려받아요. 세팅비는 못 돌려받아요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn danger grow" data-yes>정리</button></div>`, (w) => w.querySelector("[data-yes]").onclick = () => { const r = AB.close(S, el.dataset.abclose); closeWin(); toast([], r.msg); save(); render(); }));
  q("[data-adr]", (el) => { const [id, d] = el.dataset.adr.split(":"); const u = S.ab.units.find((x) => x.id === id); AB.setAdr(S, id, u.adr + +d); save(); render(); });
  q("[data-peak]", (el) => { const r = PR.setPeak(S, +el.dataset.peak); toast([], r.msg); save(); render(); });
  q("[data-revev]", (el) => { const [j, k] = el.dataset.revev.split(":"); const r = (j === "pr" ? PR : AB).setRevEv(S, k); toast([], r.msg); save(); render(); }); // v4.28 후기 이벤트
  q("[data-abpeak]", (el) => { const r = AB.setPeak(S, +el.dataset.abpeak); toast([], r.msg); save(); render(); });
  q("[data-abfee]", (el) => { const r = AB.setFeeAuto(S, el.dataset.abfee === "1"); toast([], r.msg); save(); render(); });
  q("[data-abpay]", (el) => { const r = AB.payFees(S); toast([], r.msg); save(); render(); });
  q("[data-sp]", (el) => { const r = SP.spAct(S, el.dataset.sp); if (r?.msg) toast([], r.msg); save(); render(); }); // v4.29 공간형 특이 요소(운영 규칙·청소·한 달 살기·영업 방식)
  q("[data-decor]", (el) => { const rm = S.pr.rooms.find((x) => x.id === el.dataset.decor); ui.prFlow = { step: "decor", id: rm.id, picks: { ...rm.decor } }; render(); window.scrollTo(0, 0); });
  q("[data-dpick]", (el) => { const [k, i] = el.dataset.dpick.split(":"); ui.prFlow.picks[k] = +i; render(); });
  q("[data-decorgo]", () => { const f = ui.prFlow, rm = S.pr.rooms.find((x) => x.id === f.id); const ch = Object.fromEntries(Object.entries(f.picks).filter(([k, i]) => rm.decor?.[k] !== i)); if (!Object.keys(ch).length) return toast([], "바뀐 게 없어요"); const res = E.act(S, "pr_decor", JSON.stringify({ id: f.id, picks: ch })); if (!res.ok) return toast([], res.msg); ui.prFlow = null; afterRes(res); });
  q("[data-bag]", () => CU.bagWin(gcx())); q("[data-bagpack]", () => CU.bagWin(gcx())); // 가방(v4.25)
  q("[data-item]", (el) => { const r = E.buyItem(S, el.dataset.item); toast(r.lines || [], r.msg); save(); render(); });
  q("[data-qlock]", (el) => toast([], `🔒 ${el.dataset.qlock} 열려요`));
  q("[data-album]", () => albumWin());
  q("[data-toslots]", () => { save(true); S = null; renderTitle(); });
  if (UJ[ui.page]?.bind) UJ[ui.page].bind(jctx(q)); // 새 투잡 보드의 버튼 연결
  q("[data-fire]", () => openWin(`<h2>파이어 달성! <button class="x" data-close>✕</button></h2><div class="small">순자산 ${won(E.fireInfo(S).nw)}. 지금 은퇴할 수도 있고, ${RD.endAgeOf(S)}세까지 더 달려서 명예의 전당을 노릴 수도 있어요. 기록에는 ${Math.floor(S.age)}세 파이어가 남아요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-keep>계속 달린다</button><button class="btn gold grow" data-yes>지금 은퇴</button></div>`, (w) => { w.querySelector("[data-yes]").onclick = () => { closeWin(); E.declareFire(S, false); save(true); render(); }; w.querySelector("[data-keep]").onclick = () => { closeWin(); E.declareFire(S, true); save(true); toast([], `${S.fireAt}세 파이어 기록! 계속 달려요`); render(); }; }));
  q("[data-newlife]", () => openWin(`<h2>이 칸에서 새 인생을 시작할까요? <button class="x" data-close>✕</button></h2><div class="small">지금 ${SLOT}번 칸의 인생은 지워져요. 다른 칸에서 시작하려면 '저장 칸으로' 버튼을 눌러 주세요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-yes>새 인생</button></div>`, (w) => w.querySelector("[data-yes]").onclick = async () => { closeWin(); S = null; await ST.remove(SLOT); ui.wiz = null; startWizard(SLOT); }));
}

// ───────── 능력치 도형(능력치 수만큼 꼭짓점) ─────────
// 홈 그림 왼쪽 아래의 능력치 별(11-24). 아이템으로 오른 만큼은 "56+4"처럼 따로 보여 준다
function hexStats() {
  const K = D.STAT_KEYS, n = K.length, W = 176, cx = W / 2, cy = W / 2, R = 50, it = {};
  for (const id of Object.keys(S.items || {})) for (const [k, v] of Object.entries(D.ITEMS[id]?.stat || {})) it[k] = (it[k] || 0) + v;
  const scale = Math.min(D.STAT_MAX, Math.max(60, Math.ceil(Math.max(...K.map((k) => S.st[k] || 0)) / 20) * 20));
  const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2, rr = R * Math.min(1, v / scale); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  const poly = (f) => K.map((k, i) => pt(i, f(k)).map((x) => x.toFixed(1)).join(",")).join(" ");
  const star = (off) => K.filter((_, i) => i % 2 === off).map((k) => pt(K.indexOf(k), scale).map((x) => x.toFixed(1)).join(",")).join(" ");
  const labels = K.map((k, i) => { const [x, y] = pt(i, scale * 1.42), v = Math.round(S.st[k] || 0), b = Math.min(v, Math.round(it[k] || 0)); return `<text x="${x.toFixed(1)}" y="${(y - 1).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#cfd2ea">${D.STATS[k]}</text><text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#f5c04e">${b ? `${v - b}<tspan fill="#7fe0a2">+${b}</tspan>` : v}</text>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}"><polygon points="${star(0)}" fill="none" stroke="#ffffff30"/><polygon points="${star(1)}" fill="none" stroke="#ffffff30"/><polygon points="${poly(() => scale * 0.5)}" fill="none" stroke="#ffffff18"/><polygon points="${poly((k) => S.st[k] || 0)}" fill="#f5c04e44" stroke="#f5c04e" stroke-width="1.6"/>${labels}</svg>`;
}
function radar(layers, size = 240) {
  const K = D.STAT_KEYS, n = K.length, cx = size / 2, cy = size / 2 + 4, R = size / 2 - 34;
  const top = Math.max(...layers.flatMap((l) => K.map((k) => l.v[k] || 0)), 40);
  const scale = Math.min(D.STAT_MAX, Math.ceil(top / 20) * 20);
  const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2, rr = R * Math.min(1, v / scale); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  const poly = (f) => K.map((k, i) => pt(i, f(k)).map((x) => x.toFixed(1)).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((q) => `<polygon points="${poly(() => scale * q)}" fill="none" stroke="#ffffff22"/>`).join("");
  const axes = K.map((k, i) => { const [x, y] = pt(i, scale); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#ffffff1a"/>`; }).join("");
  const last = layers[layers.length - 1].v;
  const labels = K.map((k, i) => { const [x, y] = pt(i, scale * 1.22); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12.5" fill="#cfd2ea">${D.STATS[k]} <tspan fill="#f5c04e" font-weight="700">${Math.round(last[k] || 0)}</tspan></text>`; }).join("");
  const shapes = layers.map((l) => `<polygon points="${poly((k) => l.v[k] || 0)}" fill="${l.c}${l.fill ?? "33"}" stroke="${l.c}" stroke-width="2"/>`).join("");
  return `<svg class="radar" viewBox="0 0 ${size} ${size + 8}" width="100%" style="max-width:${size + 40}px">${rings}${axes}${shapes}${labels}<text x="${size - 4}" y="${size + 4}" text-anchor="end" font-size="11.5" fill="#8a8fb5">눈금 0~${scale}</text></svg>`;
}
const LAYER = { base: "#8a8fb5", now: "#f5c04e" };
function diffChips(a, b) { return D.STAT_KEYS.filter((k) => Math.round(b[k]) !== Math.round(a[k])).map((k) => { const d = Math.round(b[k] - a[k]); return `<span class="${d > 0 ? "p" : "m"}">${D.STATS[k]} ${d > 0 ? "+" : ""}${d}</span>`; }).join(""); }

// ───────── 시작 화면(B안, 11-23): 사람에 따라 세 모습. 그리기는 title_ui.js, 여기서는 재료와 동작만 잇는다 ─────────
async function renderTitle() {
  bgmGo();
  ST.setAllow(1 + BMX.extraSlots() + (BMX.qaOn() ? 2 : 0)); // 저장 칸: 기본 1 + 산 만큼(QA 모드는 3칸)
  const slots = await ST.list(), u = ST.who(), m = meta(), hall = await ST.hallList();
  const done = mgDoneMap(), all = mgAll();
  const loadSlot = async (n) => {
    let s = null;
    try { const t = await ST.load(n); s = t ? E.load(t) : null; } catch (e) { s = null; }
    if (!s) return toast([], "이 칸을 불러오지 못했어요");
    SLOT = n; S = s; try { const m4 = meta(); m4.mgAv = { avatar: S.me.avatar || null, gender: S.me.gender || "F" }; setMeta(m4); } catch (e) {} artPreload([S.me.avatar, ...Object.keys(S.rel), ...(S.cast || [])].filter(Boolean)); if (u?.nick) S.me.name = u.nick; render();
  };
  // 하던 인생 카드에 쓸 것만 읽는다: 얼굴·주인공 그림·파이어 목표(결혼·어려움 모드면 다름)
  const peek = async (n) => {
    const t = await ST.load(n), s = t ? E.load(t) : null; if (!s?.me) return null;
    const f = E.fireInfo(s), pw = () => { try { return portraitDataURL(s.me.look, s.me.gender, "smile", 5); } catch (e) { return ""; } };
    return { nw: f.nw, target: f.target, avatar: s.me.avatar || null, gender: s.me.gender, face: img(bodyOr(s.me.avatar, "smile", "face", pw) ?? artOr(s.me.avatar, "smile", pw)) };
  };
  const hallWin = () => { const h = hallBox(hall, m, "순위표"); openWin(`<h2>명예의 전당 <button class="x" data-close>✕</button></h2>${h || `<div class="card small muted" style="margin-top:10px">아직 기록이 없어요. 인생을 하나 끝내면 여기에 올라요.</div>`}${m.runs?.length ? `<div class="card" style="margin-top:10px;text-align:center"><div class="small">다음 인생은 <b class="gold">${ngNext(m)}회차</b> · 기억 포인트 <b class="gold">${ngPoints(m)}</b> · 최고 파이어 ${m.best ? m.best + "세" : "아직"}</div>${ngCollection(m)}</div>` : ""}`, (w) => hallTabs(w)); };
  TU.draw($app, { slots, u, m, hall, D, CHAR: E.CHAR, BODY, IMG_OF: PD.IMG_OF, esc, won, openWin, closeWin, toast, app: APP, peek, endings: ENDINGS, collection: ngCollection(m),
    n: { album: (m.album || []).length, mg: all.filter((k) => done[k]).length, mgAll: all.length, dex: PD.dexCount(m, E.CHAR), dexAll: Object.keys(E.CHAR).length, end: (m.endings || []).length, endAll: ENDINGS.length, next: ngNext(m), pts: ngPoints(m) },
    act: { set: () => settingsWin(slots), album: () => albumWin(), mg: () => mgReplayWin(), dex: () => pplOpen("dex"), hall: hallWin, load: loadSlot, remove: async (n) => { await ST.remove(n); renderTitle(); }, wizard: (n) => startWizard(n), quick: (n, o) => quickStart(n, o) } });
  if (!m.dexInit) (async () => { const st = []; for (const sl of slots) if (!sl.empty) try { const t = await ST.load(sl.slot); if (t) st.push(E.load(t)); } catch (e) {} const m2 = meta(); PD.dexFill(m2, st, E.CHAR); setMeta(m2); if (!S) TU.setDex($app, PD.dexCount(m2, E.CHAR)); })(); // 옛 저장 칸으로 도감 처음 채우기(한 번)
}
// 추천 캐릭터로 바로 시작: 직접 만들기의 기본값·무작위를 한 번씩만 쓴다(룰렛 한 번, 선물·가져갈 카드 없음). 고르는 것은 성별·이름뿐
function quickStart(slot, o) {
  const u = ST.who(), g = o?.gender === "F" ? "F" : "M", age = g === "F" ? 25 : 27, one = (a) => a[Math.floor(Math.random() * a.length)];
  const w = { gender: g, age, gifts: {}, hard: false }, avs = AVATARS(g), major = one(Object.keys(D.MAJORS)), company = "big", kind = D.COMPANY_TYPES[company].kind;
  const jobs = Object.keys(D.JOBS).filter((k) => D.JOBS[k].co.includes(kind)), fitJ = jobs.filter((k) => E.jobFit(major, k) > 0), okJ = jobs.filter((k) => E.jobFit(major, k) >= 0);
  SLOT = slot || SLOT || 1; ui.wiz = null;
  S = E.newGame({ quest: true, seed: String(Date.now()), gender: g, name: u?.nick || o?.name || "나", age, look: randomLook(Math.random, g), base: E.rollStats(Math.random, wizYr(w)), major, company, companyName: D.COMPANY_TYPES[company].names[0], job: one(fitJ.length ? fitJ : okJ.length ? okJ : jobs), traits: drawPool([]).slice(0, 2), carry: null, ng: ngGiftsToStart(w) });
  S.me.avatar = avs.length ? one(avs) : null; artPreload([S.me.avatar, ...(S.cast || [])].filter(Boolean));
  ui.page = "home"; save(true); render();
  showIntro(); titleSaveNote();
}
// 저장 안내는 시작 화면에 두지 않고, 첫 인생을 시작할 때 한 번만 알린다(이 브라우저 기준)
function titleSaveNote() {
  try { if (localStorage.getItem("after6pm_savenote")) return; localStorage.setItem("after6pm_savenote", "1"); } catch (e) { return; }
  toast([], ST.who() ? "인생은 달마다 저절로 저장돼요" : "인생은 저절로 저장돼요. 로그인하지 않으면 이 브라우저에만 남아요");
}
// 명예의 전당 탭(v4.25): 순자산 순위 / 파이어 나이 순위(어릴수록 위, 같으면 순자산)
const fireM = (x) => x.fireM ?? x.fireAt * 12;
const fireSort = (a, b) => fireM(a) - fireM(b) || b.nw - a.nw;
const fireTxt = (x) => { const m = fireM(x); return `${Math.floor(m / 12)}세${m % 12 ? ` ${m % 12}개월` : ""}`; };
function hallFireList(server, mine) {
  const seen = new Set(), all = [];
  for (const x of [...(server || []), ...(mine || [])]) { if (!x?.fireAt) continue; const k = `${x.name}|${x.t}|${x.nw}`; if (seen.has(k)) continue; seen.add(k); all.push(x); }
  return all.sort(fireSort).slice(0, 10);
}
const HALL_D = []; // 명예의 전당 상자별 데이터(탭·투잡 고르기)
function hallBox(server, m, title) {
  const byNw = server || m.hall || [], mine = m.hallFire || (m.hall || []).filter((x) => x.fireAt);
  if (!byNw.length && !mine.length) return "";
  const pool = [...byNw, ...mine], jobs = [...new Set(pool.flatMap((x) => String(x.path || "회사원").split("·")))].filter(Boolean).sort((x, y) => (x === "회사원") - (y === "회사원") || x.localeCompare(y));
  const id = HALL_D.push({ byNw, server, mine, tab: "nw", job: "" }) - 1;
  return `<div class="card hallbox" style="margin-top:10px" data-hid="${id}"><h3>${title || "명예의 전당"} <small>${server ? "전체 회원" : "내 기록"}</small></h3>
    <div class="halltabs"><button class="on" data-hallt="nw">순자산 순위</button><button data-hallt="age">파이어 나이 순위</button></div>
    ${jobs.length > 1 ? `<div class="halljobs hscroll"><button class="on" data-hallj="">전체</button>${jobs.map((j) => `<button data-hallj="${esc(j)}">${esc(j)}</button>`).join("")}</div>` : ""}
    <div data-hallp>${hallPanel(HALL_D[id])}</div></div>`;
}
function hallPanel(d) {
  const has = (x) => !d.job || String(x.path || "회사원").split("·").includes(d.job);
  if (d.tab === "nw") { const L = d.byNw.filter(has).sort((a, b) => b.nw - a.nw).slice(0, 10); return L.length ? hallList(L) : '<div class="muted small">이 투잡으로 남긴 기록이 아직 없어요</div>'; }
  const L = hallFireList(d.server?.filter(has), d.mine.filter(has));
  return L.length ? hallList(L) : '<div class="muted small">아직 파이어한 기록이 없어요</div>';
}
function hallTabs(root) {
  root.querySelectorAll(".hallbox").forEach((box) => {
    const d = HALL_D[+box.dataset.hid]; if (!d) return;
    const draw = () => { box.querySelector("[data-hallp]").innerHTML = hallPanel(d); };
    box.querySelectorAll("[data-hallt]").forEach((b) => b.onclick = () => { d.tab = b.dataset.hallt; box.querySelectorAll("[data-hallt]").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    box.querySelectorAll("[data-hallj]").forEach((b) => b.onclick = () => { d.job = b.dataset.hallj; box.querySelectorAll("[data-hallj]").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
  });
}
function hallList(h) { return `<div class="hall">${(h || []).map((x, i) => `<div><b>${i + 1}</b><span class="grow">${esc(x.name)} · ${esc(x.path)}${x.full ? " · 전업" : ""}${x.hid?.length ? " · 🗝 히든 길" : ""}</span><span>${x.fireAt ? `${fireTxt(x)} 파이어` : `${x.age}세`}</span><b class="gold">${won(x.nw)}</b></div>`).join("") || '<div class="muted small">아직 없어요</div>'}</div>`; }
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
  // 투잡 엔딩(engine/reg.js ENDS): 투잡마다 2~3개. 판 중 화보로 받고, 판이 끝나면 도감에 오른다
  ...REG.ENDS.map((e) => [e.key, `${D.SIDEJOBS[e.job].n} · ${e.title}`]),
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
    <div class="card" style="text-align:center"><div class="tiny muted">남은 기억 포인트</div><div class="gold" style="font-size:26px;font-weight:900">${left} / ${pts}</div>${BMX.bmOn() ? `<button class="btn sm" style="margin-top:6px" data-bmpts>기억 포인트 +${BMX.BM.slots.giftSlot.pts} · ${esc(BMX.label("giftSlot"))}</button>` : ""}</div>
    ${GIFTS.map(row).join("")}
    <div class="card gift ${hardOk ? "" : "lock"}"><div class="row"><div class="grow"><b>어려움 모드</b> <span class="tag red">3회차부터</span><div class="small muted">연말 평가가 더 짜고 파이어 목표가 25% 높아요. 대신 끝날 때 기억 포인트가 2배예요.</div></div><button class="btn sm ${w.hard ? "gold" : ""}" data-ghard ${hardOk ? "" : "disabled"}>${w.hard ? "켜짐" : "꺼짐"}</button></div></div>
    ${ngCollection(m)}`;
}
function ngGiftsToStart(w) {
  const g = w.gifts || {}, M0 = meta(), n0 = ngNext(M0), rw = n0 === 2 && M0.r1Grade ? RD.rewardOf(M0.r1Grade) : { cash: 0, statUp: 0 }; // 2회차: 1회차 등급 보상
  const fr = [...(g.friend || [])]; if (n0 >= 3 && !fr.length && (M0.pastFriends || []).length) fr.push(M0.pastFriends[0]); // 3회차 특전: 지난 판 인연 한 명
  return { n: n0, hard: !!w.hard, cash: (g.cash || 0) * 300 + (rw.cash || 0), statUp: (g.stat || 0) * 3 + (rw.statUp || 0), know: g.know || [], friends: fr, past: (meta().hidPast || []).slice(-2), gifts: Object.keys(g).filter((k) => (Array.isArray(g[k]) ? g[k].length : g[k])) };
}
function ngGiftsToStart_old(w) {
  const g = w.gifts || {};
  return { n: ngNext(meta()), hard: !!w.hard, cash: (g.cash || 0) * 300, statUp: (g.stat || 0) * 3, know: g.know || [], friends: g.friend || [], past: (meta().hidPast || []).slice(-2), gifts: Object.keys(g).filter((k) => (Array.isArray(g[k]) ? g[k].length : g[k])) };
}
function ngEndRecord(m, f) {
  // 이번 인생에서 받은 기억 포인트와 도감
  const got = [];
  const add = (p, why) => got.push([p, why]);
  add(1, "인생 하나를 끝까지 살았다");
  if (S.fireAt) add(2, `${S.fireAt}세 파이어`);
  if (f.nw >= 100000) add(1, "순자산 10억");
  if (f.nw >= 400000) add(1, "순자산 40억");
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
  for (const e of REG.endsOf(S)) ends.push(e.key); // 투잡 엔딩
  const newEnds = ends.filter((e) => !(m.endings || []).includes(e));
  // 기억 포인트: 인생 엔딩은 새것마다 +1, 투잡 엔딩은 새것이 몇 개든 +1(투잡 엔딩이 30개라 포인트가 불어나지 않게)
  if (newEnds.length) { const nJob = newEnds.filter((e) => REG.ENDS.some((x) => x.key === e)).length; add(newEnds.length - nJob + (nJob ? 1 : 0), "새 엔딩 " + newEnds.map((e) => ENDINGS.find((x) => x[0] === e)?.[1] || e).join("·")); }
  let pts = got.reduce((a, b) => a + b[0], 0);
  if (S.ng?.hard) { got.push([pts, "어려움 모드 2배"]); pts *= 2; }
  m.ngPts = (m.ngPts || 0) + pts;
  m.endings = [...new Set([...(m.endings || []), ...ends])];
  m.metAll = [...new Set([...(m.metAll || []), ...Object.keys(S.rel)])];
  m.knownJobs = [...new Set([...(m.knownJobs || []), ...Object.keys(S.sj.found).filter((j) => D.SIDEJOBS[j]?.play)])];
  const close = Object.entries(S.rel).filter(([, x]) => x.spouse || x.lover || x.aff >= 50).sort((a, b) => (b[1].spouse ? 999 : b[1].aff) - (a[1].spouse ? 999 : a[1].aff)).map(([id]) => id);
  m.pastFriends = [...new Set([...close, ...(m.pastFriends || [])])].slice(0, 12);
  m.carry = [...new Set([...S.me.traits, ...(S.me.perks || []).filter((p) => !/^yr/.test(p))])];
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
  return E.startStats(base, { major: upto >= 3 ? w.major : null, company: upto >= 4 ? w.company : null, job: upto >= 4 ? w.job : null, traits: upto >= 5 ? [...w.traits, ...(w.carry && isTrait(w.carry) ? [w.carry] : [])] : [] });
}
function traitCard(t, inGame) {
  if (!t) return "";
  if (t.g === "특전") return `<div class="trait perk"><div class="tn">${esc(t.n)} <span class="tag gold">특전</span></div><div class="muted">“${esc(t.line)}”</div><div class="pro">＋ ${esc(t.pro)}</div><div class="hoff">받은 이유: ${esc(t.got)}</div></div>`;
  const domN = (d) => (d === "co" ? "회사" : D.SIDEJOBS[d]?.n || d);
  const hid = inGame
    ? t.hid.map((h) => S.me.revealed?.[h.d] !== undefined ? `<div class="hon">★ ${esc(domN(h.d))} · ${esc(h.t)}</div>` : `<div class="hoff">🔒 ${h.d !== "co" && D.SIDEJOBS[h.d]?.play ? esc(jo(domN(h.d), "을", "를")) : esc(domN(h.d))}${h.d === "co" ? "에서 첫 평가를 받으면" : D.SIDEJOBS[h.d]?.play ? " 시작하면" : " (다음 업데이트)"} 공개</div>`).join("")
    : `<div class="hoff">숨은 특성 4개 · 단서: ${t.hint.map(esc).join(" · ")}</div>`;
  if (inGame) return `<details class="trait tmore"><summary><div class="tn">${esc(t.n)} <span class="tag">${esc(t.g)}</span> <span class="tiny muted">효과 ▾</span></div><div class="muted">“${esc(t.line)}”</div></summary><div class="pro">＋ ${esc(t.pro)}</div><div class="con">－ ${esc(t.con)}</div>${hid}</details>`; // 정리(v4.27)
  return `<div class="trait"><div class="tn">${esc(t.n)} <span class="tag">${esc(t.g)}</span></div><div class="muted">“${esc(t.line)}”</div><div class="pro">＋ ${esc(t.pro)}</div><div class="con">－ ${esc(t.con)}</div>${hid}</div>`;
}
const wizYr = (w) => 1; // 11-23 남녀 모두 27세·같은 능력치
const isTrait = (id) => D.TRAITS.some((t) => t.id === id);
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
      <div class="seg"><button class="${w.gender === "M" ? "on" : ""}" data-g="M">남자 · 27세</button><button class="${w.gender === "F" ? "on" : ""}" data-g="F">여자 · 27세</button></div>
      <div class="card small">${ngNext(meta()) <= 1 ? "<b class=\"gold\">1회차는 34세까지 맛보는 7년이에요.</b> 2회차부터 50세까지 본격적인 삶을 살아요." : `<b class="gold">${ngNext(meta())}회차 · 27세부터 50세까지 23년.</b> 연애와 결혼, 판이 바뀌는 큰 사건이 열려요.`}<div class="tiny muted" style="margin-top:4px">${w.gender === "F" ? "학자금을 27세에 다 갚았어요. 회사는 2년 다녔고, 이제부터 시작이에요." : "군대를 다녀와 올해 입사했어요. 군대 동기와 동아리 친구들이 있어요."}</div></div>
      ${u?.nick ? `<div class="card small">닉네임 <b class="gold">${esc(u.nick)}</b>${((w) => { w = String(w ?? ""); const ch = w.charCodeAt(w.length - 1); if (ch < 0xac00 || ch > 0xd7a3) return "로"; const f = (ch - 0xac00) % 28; return f && f !== 8 ? "으로" : "로"; })(u.nick)} 살아요. 닉네임은 사이트 계정에서 바꿀 수 있어요.</div>` : `<input placeholder="이름 (비우면 '나')" value="${esc(w.name)}" data-name maxlength="8">`}
      <div class="seg agepick" hidden>${(w.gender === "F" ? [25, 26, 27] : [27, 28, 29]).map((a, i) => `<button class="${w.age === a ? "on" : ""}" data-age="${a}"><b>${a}세 · ${i + 1}년 차</b><span class="tiny">${["기본", "능력치↑ · 특전 1장", "능력치↑↑ · 특전 1장"][i]}</span></button>`).join("")}</div>
      <div class="tiny muted" hidden>나이가 많을수록 시작 돈·경력·룰렛 능력치가 더 좋고 특전 카드도 받아요. 대신 파이어까지 남은 시간은 줄어요. 젊을 때만 좋은 점도 있다는 소문이 있어요. (${w.gender === "F" ? 48 : 50}세까지 ${(w.gender === "F" ? 48 : 50) - w.age}년)</div>
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
      <div class="row"><button class="btn grow" data-reroll-tr ${w.reroll ? "" : "disabled"}>다시 뽑기 (${w.reroll}번 남음)</button><button class="btn grow" data-undo-tr ${w.undo && w.prevPool ? "" : "disabled"}>무르기 (${w.undo}번 남음)</button></div>
      ${(meta().carry || []).filter((id) => D.CARD(id)).length ? `<div class="sec">지난 인생에서 가져갈 카드 <span class="muted small">· 1장 고르면 카드 3장으로 시작</span></div><div class="tcards">${meta().carry.filter((id) => D.CARD(id) && !w.traits.includes(id)).map((id) => `<button class="${w.carry === id ? "on" : ""}" data-carry="${id}">${traitCard(D.CARD(id))}</button>`).join("")}</div>` : ""}`;
  }
  $app.innerHTML = `<div class="wiz">${prog}${body}<div class="row tjx-wiznav"><button class="btn" data-back>${w.step === 0 || (w.step === 1 && !((meta().runs?.length || 0) > 0)) ? "처음으로" : "이전"}</button><span class="grow"></span><button class="btn gold" data-nextw ${canNext ? "" : "disabled"}>${w.step === 5 ? "인생 시작" : w.step === 0 ? "이 선물로 시작" : "다음"}</button></div></div>`;
  const q = (sel, fn) => $app.querySelectorAll(sel).forEach((el) => el.onclick = () => fn(el));
  q("[data-g]", (el) => { w.gender = el.dataset.g; w.look = randomLook(Math.random, w.gender); w.age = 27; w.rolls = []; w.pick = -1; renderWiz(); });
  q("[data-age]", (el) => { w.age = +el.dataset.age; w.rolls = []; w.pick = -1; renderWiz(); });
  q("[data-av]", (el) => { w.avatar = el.dataset.av || null; renderWiz(); });
  q("[data-reroll-look]", () => { w.look = randomLook(Math.random, w.gender); renderWiz(); });
  const nm = $app.querySelector("[data-name]"); if (nm) nm.oninput = () => (w.name = nm.value.trim());
  q("[data-roll]", (el) => {
    el.disabled = true; const box = $app.querySelector("[data-radar]"); let f = 0;
    const yr = wizYr(w), final = E.rollStats(Math.random, yr);
    const tick = () => { f++; if (f < 14) { box.innerHTML = radar([{ v: E.rollStats(Math.random, yr), c: LAYER.now }]); setTimeout(tick, 55 + f * 6); } else { w.rolls.push(final); w.pick = w.rolls.length - 1; renderWiz(); } };
    tick();
  });
  q("[data-rpick]", (el) => { w.pick = +el.dataset.rpick; renderWiz(); });
  q("[data-major]", (el) => { w.major = el.dataset.major; renderWiz(); });
  q("[data-co]", (el) => { w.company = el.dataset.co; w.companyName = D.COMPANY_TYPES[w.company].names[0]; renderWiz(); });
  q("[data-job]", (el) => { w.job = el.dataset.job; renderWiz(); });
  const cn = $app.querySelector("[data-coname]"); if (cn) cn.onchange = () => (w.companyName = cn.value);
  q("[data-carry]", (el) => { w.carry = w.carry === el.dataset.carry ? null : el.dataset.carry; renderWiz(); });
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
    S = E.newGame({ quest: true, seed: String(Date.now()), gender: w.gender, name: u?.nick || w.name || "나", age: w.age, look: w.look, base: w.rolls[w.pick], major: w.major, company: w.company, companyName: w.companyName, job: w.job, traits: w.traits, carry: w.traits.includes(w.carry) ? null : w.carry || null, ng: ngGiftsToStart(w) });
    S.me.avatar = w.avatar || null; artPreload([S.me.avatar, ...(S.cast || [])].filter(Boolean));
    { const sp = ngSpent(w); if (sp) { m.ngPts = Math.max(0, (m.ngPts || 0) - sp); setMeta(m); } }
    ui.page = "home"; save(true); render();
    showIntro(); titleSaveNote();
  });
}
function showIntro() {
  const ea = RD.endAgeOf(S), r1 = RD.isR1(S);
  openWin(`<h2>${Math.floor(S.age)}세 ${S.cal}월, 퇴근 후 인생이 시작됩니다 <button class="x" data-close>✕</button></h2><div class="intro">
    <p><b class="gold">행동력</b> 한 달에 할 수 있는 일의 횟수예요. 행동을 고를 때마다 줄어요.</p>
    <p><b>다음 달</b> 행동력을 다 쓰면 맨 아래 <b>다음 달</b>을 눌러요. 월급이 들어오고 한 달이 지나가요.</p>
    <p><b class="gold">목표</b> ${r1 ? `${ea}세 결산에서 순자산 ${RD.RD.grades.map(([g, v]) => `${v / 10000}억이면 ${g}`).join(", ")}. 1회차는 맛보기예요. 2회차부터 50세까지 본격적인 삶을 살아요.` : `${ea}세까지 순자산 30억(결혼하면 40억).`} 파산하거나 번아웃이 세 번 오면 그 인생은 끝나요.</p>
    <p class="tiny muted" style="margin-top:10px">지도·회사·투잡 이야기는 그 화면에 처음 들어갈 때 한 줄씩 알려 드려요.</p></div>
    <button class="btn gold" style="width:100%;margin-top:12px;padding:12px" data-close>시작하기</button>`, null, false, true);
}

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 1회차 결산 등급 카드(11-23): 등급과 2회차에 들고 가는 것. C는 '구원의 손길'로 B 보상
// 행동력 채우기(돈 버는 자리): 광고 +1(한 달 1번) · 에너지 드링크 +2
// 돈 버는 자리 버튼은 어느 화면에 있든 눌리게 문서 전체에서 받는다
document.addEventListener("click", async (e) => { const t = e.target.closest?.("[data-bmap],[data-bmgrade],[data-bmshop],[data-bmpts],[data-bmredo]"); if (!t) return; if (t.hasAttribute("data-bmshop")) { e.stopPropagation(); return bmShopWin(); } if (t.hasAttribute("data-bmpts")) { e.stopPropagation(); const pr = await BMX.pay("giftSlot"); toast([], pr.msg); if (pr.ok) { const m = meta(); m.ngPts = (m.ngPts || 0) + BMX.BM.slots.giftSlot.pts; setMeta(m); render(); } return; } if (!S) return; e.stopPropagation(); if (t.hasAttribute("data-bmredo")) { const pr = await BMX.pay("chatRedo"); if (!pr.ok) return toast([], pr.msg); const sc = LVX.chatRedo(S, t.dataset.bmredo); if (!sc) return toast([], "다시 답할 까톡이 없어요"); closeWin(); E.openScene(S, sc); save(); return showScene(); } if (t.hasAttribute("data-bmap")) return bmApWin(); const pr = await BMX.pay("gradeUp"); if (!pr.ok) return toast([], pr.msg); const m = meta(); m.r1Grade = "S"; m.r1GradeUp = true; setMeta(m); S.gradeUp = true; toast(["2회차 시작 보상이 S등급으로 바뀌었어요"], pr.msg); save(); render();  if ($modal.innerHTML) closeWin(); }, true);
// 상점: 사서 계속 갖는 것(저장 칸·광고 없애기·화보 팩)
function bmShopWin() {
  const L = Object.entries(BMX.BM.slots).filter(([, x]) => x.shop);
  openWin(`<h2>상점 <button class="x" data-close>✕</button></h2><div class="small muted">${BMX.qaOn() ? "QA 모드예요. 누르면 결제 없이 바로 적용돼요." : "결제가 연결되면 열려요. 지금은 무엇을 팔 예정인지만 보여 드려요."}</div>
    <div class="col" style="gap:8px;margin-top:12px">${L.map(([k, x]) => `<button class="btn" style="text-align:left" data-bms="${k}"><b>${esc(x.n)}</b> <span class="gold">${BMX.priceText(k)}</span>${BMX.owned(k) ? ` <span class="tag green">${x.max ? `${BMX.owned(k)}/${x.max}` : "쓰는 중"}</span>` : ""}<br><span class="tiny muted">${esc(x.d)}</span></button>`).join("")}</div>`,
    (w) => w.querySelectorAll("[data-bms]").forEach((b) => b.onclick = async () => { const pr = await BMX.pay(b.dataset.bms); toast([], pr.msg); if (pr.ok) { closeWin(); if (!S) renderTitle(); else bmShopWin(); } }), false, true);
}
function bmApWin() {
  const adUsed = S.bmApT === S.t, itLeft = BMX.trialLeft("apItem");
  openWin(`<h2>행동력 채우기 <button class="x" data-close>✕</button></h2><div class="small muted">이번 달에 할 일이 남았는데 행동력이 모자랄 때 써요. 지금 ${S.ap}/${S.apMax}.</div>
    <div class="col" style="gap:8px;margin-top:12px"><button class="btn gold" data-bma="apAd" ${adUsed ? "disabled" : ""}>광고 보고 행동력 +1 ${adUsed ? "(이번 달에 씀)" : "(한 달 1번)"}</button><button class="btn" data-bma="apItem">${esc(BMX.label("apItem"))} · 행동력 +2</button></div>
    <div class="tiny muted" style="margin-top:8px">${BMX.qaOn() ? "QA 모드라 바로 통과해요." : "광고와 결제가 연결되면 열려요. 지금은 준비 중이에요."}</div>`, (w) => w.querySelectorAll("[data-bma]").forEach((b) => b.onclick = async () => { const k = b.dataset.bma; if (k === "apAd" && S.bmApT === S.t) return; const pr = await BMX.pay(k); if (!pr.ok) return toast([], pr.msg); const n = BMX.BM.slots[k].ap; S.ap += n; if (k === "apAd") S.bmApT = S.t; S.bmApN = (S.bmApN || 0) + n; closeWin(); toast([`행동력 +${n}`], pr.msg); save(); render(); }), false, true);
}
function gradeCard() {
  const g = S.grade, rw = RD.rewardOf(g), nwv = Math.round(E.netWorth(S)), next = RD.RD.grades.slice().reverse().find(([k, v]) => v > nwv);
  const col = { S: "var(--gold)", A: "var(--blue)", B: "var(--green)", C: "var(--muted)" }[g];
  return `<div class="card"><div class="row"><div style="font-size:44px;font-weight:900;line-height:1;color:${col}">${g}</div><div class="grow" style="margin-left:12px"><b>1회차 결산</b><div class="tiny muted">순자산 ${won(nwv)} · ${RD.RD.grades.map(([k, v]) => `${k} ${v / 10000}억`).join(" · ")}${next ? ` · ${next[0]}까지 ${won(next[1] - nwv)}` : ""}</div></div></div>
    <div class="small" style="margin-top:8px">여기까지가 맛보기였어요. <b class="gold">2회차부터 50세까지 본격적인 삶</b>을 살아요. 연애와 결혼, 판이 바뀌는 큰 사건이 열려요.</div>
    <div class="small" style="margin-top:6px">${rw.rescued ? `<b class="gold">구원의 손길</b> · C등급이지만 B등급 보상으로 올려 드려요.<br>` : ""}2회차에 들고 가는 것: 시작 자금 +${won(rw.cash)}${rw.statUp ? ` · 모든 능력치 +${rw.statUp}` : ""}</div>
    ${g !== "S" ? (S.gradeUp ? `<div class="tiny gold" style="margin-top:6px">S등급 보상으로 바꿨어요: 시작 자금 +${won(RD.RD.reward.S.cash)} · 모든 능력치 +${RD.RD.reward.S.statUp}</div>` : BMX.bmOn() ? `<button class="btn" style="width:100%;margin-top:8px" data-bmgrade>S등급 보상으로 받기 (시작 자금 +${won(RD.RD.reward.S.cash)} · 능력치 +${RD.RD.reward.S.statUp}) · ${BMX.priceText("gradeUp")}${BMX.qaOn() ? "" : " · 준비 중"}</button>` : "") : ""}</div>`;
}
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
    if (S.grade) m.r1Grade = S.gradeUp ? "S" : S.grade; // 1회차 결산 등급 → 2회차 시작 보상
    m.hidPast = [...(m.hidPast || []), H2U.runRec(S)].slice(-5); // v4.30 회차의 길: 지난 인생에서 연 히든 길·한 투잡
    const rec = { name: S.me.name, nw: Math.round(f.nw), fireAt: S.fireAt || null, fireM: S.fireAtM || (S.fireAt ? S.fireAt * 12 : null), age, path: S.sj.active.map((k) => D.SIDEJOBS[k].n).join("·") || "회사원", full: BIG.isFull(S), t: Date.now(), kind, hid: [...HU.hidNames(S), ...H2U.names(S)] };
    // 개인회생으로 끝난 판은 명예의 전당에 올리지 않는다
    if (S.over !== "bankrupt") { m.hall = (m.hall || []).concat(rec).sort((a, b) => b.nw - a.nw).slice(0, 10); S.hallRank = m.hall.indexOf(rec) + 1; if (rec.fireAt) { m.hallFire = (m.hallFire || []).concat(rec).sort(fireSort).slice(0, 10); S.hallFireRank = m.hallFire.indexOf(rec) + 1; } ST.hallSubmit(rec); }
    else S.hallRank = 0;
    setMeta(m); S.recorded = true; save();
  }
  const title = kind === "fire" ? `${age}세 파이어` : kind === "age" ? (S.grade ? `${RD.endAgeOf(S)}세 결산 · ${S.grade}등급` : S.fireAt ? `${S.fireAt}세 파이어 · ${RD.endAgeOf(S)}세 결산` : `${RD.endAgeOf(S)}세 결산 · 파이어 실패`) : kind === "over" && S.over === "bankrupt" ? "개인회생" : "번아웃";
  $app.innerHTML = `<div class="ending"><div class="px gold">THE END · ${esc(S.me.name)}의 인생</div><div class="big">${esc(title)}</div>
    <div class="card"><div class="kv tjx-endkv"><div><div class="k">순자산</div><div class="v gold">${won(f.nw)}</div></div>${endJobs().map((j) => `<div><div class="k">${esc(END_JOB[j].n)}</div><div class="v">${esc(END_JOB[j].kv())}</div></div>`).join("") || `<div><div class="k">투잡</div><div class="v">회사만 다님</div></div>`}<div><div class="k">인연</div><div class="v">${Object.keys(S.rel).length}명</div></div></div></div>
    ${S.grade ? gradeCard() : ""}${jobEndCard()}
    <div class="card"><h3>그 뒤의 이야기</h3><div class="small" style="line-height:1.8">${epilogue().map(esc).join("<br>")}</div></div>
    ${S.hallRank ? hallBox(null, m, `명예의 전당 ${S.hallRank}위 등록!${S.hallFireRank ? ` · 파이어 나이 ${S.hallFireRank}위` : ""}`) : ""}
    <div class="card"><h3>기억 포인트 +${S.ngGot?.pts || 0} <small>다음은 ${ngNext(m)}회차 · 모은 포인트 ${ngPoints(m)}</small></h3><div class="small">${(S.ngGot?.got || []).map(([p, why]) => `+${p} ${esc(why)}`).join("<br>")}</div>${S.ngGot?.newEnds?.length ? `<div class="small gold" style="margin-top:6px">새 엔딩을 도감에 올렸어요!</div>` : ""}${ngCollection(m)}<div class="tiny muted" style="margin-top:6px">지금까지 ${(m.runs || []).length}판 · 최고 파이어 ${m.best ? m.best + "세" : "아직 없음"}</div></div>
    <button class="btn gold" style="padding:14px" data-again>이 칸에서 ${ngNext(m)}회차 인생</button><button class="btn" style="padding:12px" data-slots>저장 칸으로</button></div>`;
  hallTabs($app);
  $app.querySelector("[data-again]").onclick = () => { S = null; startWizard(SLOT); };
  $app.querySelector("[data-slots]").onclick = () => { ST.flush(); S = null; renderTitle(); };
}
// 이번 판 투잡 엔딩(받은 순서). 좋은 엔딩은 금색, 쓴 엔딩은 빨간 꼬리표
function jobEndCard() {
  const es = REG.endsOf(S); if (!es.length) return "";
  return `<div class="card"><h3>투잡 엔딩 <small>${es.length}개</small></h3><div class="chips">${es.map((e) => `<span class="chip ${e.kind === "bad" ? "" : "on"}">${esc(D.SIDEJOBS[e.job].n)} · ${esc(e.title)}${e.kind === "bad" ? " (쓴맛)" : ""}</span>`).join("")}</div></div>`;
}
// 이번 판에 한 투잡(11-23): 지금 하는 것 먼저, 그다음 하다가 접은 것. 결산 칸·후일담이 이 목록을 따른다
function endJobs() {
  const a = (S.sj.active || []).filter((k) => END_JOB[k]), rp = S.sj.rp || {};
  for (const j of Object.keys(rp)) if (rp[j].t0 !== undefined && END_JOB[j] && !a.includes(j)) a.push(j);
  if (!a.includes("pr") && (S.pr.rooms.length || S.pr.sold)) a.push("pr"); // 옛 저장(시작 기록이 없던 때)
  if (!a.includes("cs") && S.cs.passes > 0) a.push("cs");
  return a;
}
const endOn = (j) => (S.sj.active || []).includes(j);
// n 짧은 이름 · kv 결산 칸 · epi 후일담 한 줄 · fin 파이어한 판의 마지막 줄
const END_JOB = {
  pr: { n: "파티룸", kv: () => `${S.pr.rooms.length}곳 · Lv${S.pr.lv}`,
    epi: () => (S.pr.rooms.length ? `파티룸 ${S.pr.rooms.length}곳은 ${S.pr.sys.manager ? "매니저가 맡아 지금도 돌아간다" : "하나씩 양도하고 마지막 한 곳만 남겼다"}.` : "파티룸은 모두 정리했다. 지금도 빈 상가를 보면 평수부터 센다."),
    fin: () => (S.pr.rooms.length ? "70세, 손주 돌잔치를 내가 만든 파티룸에서 했다." : "70세, 손주 돌잔치 장소를 고르다가 예약 화면 사진부터 꼼꼼히 봤다.") },
  cs: { n: "컨설팅", kv: () => `Lv${S.cs.lv} · 합격 ${S.cs.passes}`,
    epi: () => (S.moments?.cs_end_mentor !== undefined ? null : S.cs.lv >= 3 ? `취업컨설팅으로 ${S.cs.passes}명이 합격했다. 가끔 "선생님 덕분에" 하는 연락이 온다.` : S.cs.passes > 0 ? `취업컨설팅은 ${S.cs.passes}명을 합격시키고 접었다. 그 사람들 이름은 아직 기억한다.` : "취업컨설팅은 오래 못 갔다. 그래도 자소서 보는 눈은 남았다."),
    fin: () => "70세, 예전 수강생이 임원이 됐다며 밥을 샀다." },
  insta: { n: "인별그램", kv: () => `팔로워 ${Math.round(S.ins?.f || 0).toLocaleString()}`,
    epi: () => (endOn("insta") ? `인별그램 계정은 팔로워 ${Math.round(S.ins?.f || 0).toLocaleString()}명으로 남았다. 요즘은 올리고 싶은 날에만 올린다.` : "인별그램 계정은 비공개로 돌렸다. 가끔 예전 게시물에 '저장' 알림이 뜬다."),
    fin: () => "70세, 손주가 내 옛 계정을 찾아냈다. 한참 넘겨 보더니 팔로우를 눌렀다." },
  airbnb: { n: "에어씨앤씨", kv: () => `숙소 ${(S.ab?.units || []).length}채`,
    epi: () => ((S.ab?.units || []).length ? `숙소 ${S.ab.units.length}채에는 지금도 후기가 달린다. 답글은 여전히 내가 쓴다.` : "숙소는 모두 정리했다. 여행을 가면 아직도 침구 상태부터 본다."),
    fin: () => "70세, 첫 숙소에 묵었던 손님이 가족을 데리고 다시 왔다." },
  ucafe: { n: "무인카페", kv: () => `매장 ${(S.uc?.stores || []).length}곳`,
    epi: () => ((S.uc?.stores || []).length ? `무인카페 ${S.uc.stores.length}곳은 지금도 새벽에 불이 켜져 있다. 원두는 여전히 내가 고른다.` : "무인카페는 넘겼다. 남의 카페에 가도 얼음통부터 들여다본다."),
    fin: () => "70세, 아침마다 내 카페의 첫 손님은 나다." },
  tarot: { n: "타로", kv: () => `Lv${S.tarot?.lv || 0} · 평판 ${Math.round(S.tarot?.rep || 0)}`,
    epi: () => (endOn("tarot") ? "타로 상담은 지금도 한 달에 몇 번 받는다. 카드를 읽는 시간보다 들어 주는 시간이 길어졌다." : "타로 덱은 서랍에 넣었다. 친구들 연말 모임 때만 꺼낸다."),
    fin: () => "70세, 손주가 카드를 뽑아 달라고 했다. 좋은 카드만 나왔다고 말해 줬다." },
  webnovel: { n: "웹소설", kv: () => `완결 ${S.webnovel?.done || 0}편`,
    epi: () => ((S.webnovel?.done || 0) > 0 ? `웹소설은 ${S.webnovel.done}편을 완결했다. 지금도 새벽에 댓글 알림이 온다.` : "웹소설은 완결을 내지 못했다. 그 원고 폴더는 아직 지우지 않았다."),
    fin: () => "70세, 서점에서 내 필명이 적힌 책을 손주가 먼저 찾아냈다." },
  tutoring: { n: "화상과외", kv: () => `Lv${S.tutoring?.lv || 0} · 학생 ${(S.tutoring?.studs || []).length}`,
    epi: () => (endOn("tutoring") ? "화상과외는 한 반만 남겼다. 수능 날 아침이면 옛 학생들 연락이 온다." : "화상과외는 그만뒀다. 수능 날 아침이면 아직도 일찍 눈이 떠진다."),
    fin: () => "70세, 첫 학생이 자기 아이 과외를 부탁해 왔다." },
  chicken: { n: "치킨집", kv: () => `매장 ${(S.chicken?.stores || []).length}곳`,
    epi: () => ((S.chicken?.stores || []).length ? `치킨집 ${S.chicken.stores.length}곳은 지금도 금요일 밤이 제일 바쁘다. 튀김기 앞에는 이제 점장이 선다.` : "치킨집은 넘겼다. 지금도 치킨을 시키면 기름 색부터 본다."),
    fin: () => "70세, 손주 생일상에는 내 가게 치킨이 올라갔다." },
  vibe: { n: "바이브코딩", kv: () => `Lv${S.vibe?.lv || 0} · 납품 ${S.vibe?.delivered || 0}`,
    epi: () => (endOn("vibe") && (S.vibe?.delivered || 0) > 0 ? `바이브코딩으로 만든 앱 ${S.vibe.delivered}개는 지금도 어딘가에서 돌아간다. 가끔 고쳐 달라는 연락이 온다.` : "바이브코딩 외주는 접었다. 그래도 불편한 게 보이면 직접 만들어 쓴다."),
    fin: () => "70세, 손주 숙제 앱을 하루 만에 만들어 줬다." },
};
function epilogue() {
  const L = [], sp = S.fam.spouse && E.CHAR[S.fam.spouse], jobs = endJobs(), ended = new Set(REG.endsOf(S).map((e) => e.job));
  if (S.ended === "fire") L.push(`${Math.floor(S.age)}세 봄, 마지막 출근을 했다. 아니, 처음으로 출근하지 않는 아침이 왔다.`);
  if (S.over === "bankrupt") L.push(`법원 서류를 정리하며 생각했다. ${jobs.some((j) => ["pr", "airbnb", "ucafe", "chicken"].includes(j)) ? "입지가" : "운이"} 아니라 욕심이 문제였다.`);
  if (S.over === "burnout") L.push("몸이 먼저 멈췄다. 다음 인생에서는 쉬는 것도 일정에 넣기로 했다.");
  if (sp) L.push(`${jo(sp.name, "과", "와")}는 ${Math.floor((S.t - S.fam.marriedT) / 12)}년을 함께했다. ${S.fam.happy >= 60 ? "주말 아침 커피는 여전히 둘이 마신다." : "대화가 줄었지만, 아직 같은 집에 산다."}`);
  else L.push("결혼은 하지 않았다. 대신 오래 볼 친구들이 생겼다.");
  for (const k of S.fam.kids) L.push(`${jo(k.name, "은", "는")} ${Math.floor((S.t - k.born) / 12) + 20}살에 독립했다. ${S.cs.passes > 30 ? "자소서는 내가 봐 줬다." : "첫 월급으로 내복을 사 왔다."}`);
  for (const j of jobs) { if (ended.has(j)) continue; const t = END_JOB[j].epi(); if (t) L.push(t); } // 한 투잡마다 한 줄(투잡 엔딩을 받은 것은 아래 엔딩 글로)
  for (const e of REG.endsOf(S)) L.push(e.epi || `${D.SIDEJOBS[e.job].n}: ${e.title}`); // 투잡 엔딩
  L.push(...H2U.epi(S)); // v4.30 히든 길 후일담(물려받기 엔딩 등)
  const held = { pr: () => S.pr.rooms.length, airbnb: () => (S.ab?.units || []).length, ucafe: () => (S.uc?.stores || []).length, chicken: () => (S.chicken?.stores || []).length }; // 가게형은 남은 가게가 있어야 '남았다'
  const now = jobs.filter((j) => endOn(j) && (!held[j] || held[j]() > 0));
  if (now.length >= 2) L.push(`퇴근 후에 시작한 ${jo(D.SIDEJOBS[now[0]].n, "과", "와")} ${D.SIDEJOBS[now[1]].n}. 둘 다 끝까지 내 이름으로 남았다.`);
  L.push(S.ended === "fire" ? (jobs[0] ? END_JOB[jobs[0]].fin() : "70세, 처음으로 평일 낮에 영화를 봤다. 옛 회사 사람들에게는 자랑하지 않았다.") : "60세, 은퇴식에서 후배에게 말했다. \"퇴근 후 두 시간이 인생을 바꿔.\"");
  return L;
}

// ───────── 자동 시험(#auto) ─────────
function autoTest(n) {
  S = E.newGame({ seed: "auto", gender: "F", name: "시험", major: "sw", company: "fin", job: "dfin", traits: ["insider", "cfo"], look: randomLook(Math.random, "F") });
  S.flags.noProbation = true; SJ.hbJoin(S, "wine"); SJ.hbJoin(S, "book"); S.sj.open = true; SJ.found(S, "pr"); SJ.found(S, "cs"); SJ.found(S, "insta"); SJ.start(S, "pr"); if (location.hash.includes("ucf")) { SJ.found(S, "ucafe"); SJ.start(S, "ucafe"); UC.search(S, E.R(S), "apt"); UC.contract(S, S.uc.listings[0].id, { machine: "buy" }); UC.search(S, E.R(S), "academy"); } if (location.hash.includes("abnb")) { SJ.found(S, "airbnb"); SJ.start(S, "airbnb"); S.st.lang = 55; for (const rk of ["hongdae", "jongno"]) { AB.search(S, E.R(S), rk); const L = S.ab.listings.find((l) => l.rk === rk && l.house && l.owner) || S.ab.listings.find((l) => l.rk === rk); AB.contract(S, L.id, L.house && L.owner ? "legal" : "illegal"); } AB.search(S, E.R(S), "jeju"); } if (location.hash.includes("ins")) { SJ.start(S, "insta"); INS.setNiche(S, "space"); INS.setFace(S, true); S.ins.f = 4200; } else SJ.start(S, "cs"); if (location.hash.includes("grad")) { S.grad = { k: "mba", t0: 0, n: 0, done: false }; } S.cash += 20000;
  for (const P of REG.JOBS) if (new RegExp(`[-_]${P.key}(\\b|$)`).test(location.hash)) { if (S.sj.active.length >= SJ.slots(S)) S.sj.active.pop(); SJ.found(S, P.key); SJ.start(S, P.key); if (UJ[P.key]?.auto) UJ[P.key].auto(jctx()); } // #auto18-<key>
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
  const h = location.hash; ui.page = ["map", "people", "sj", "hobby", "co", "pr", "cs", "insta", "airbnb", "ucafe", "grad", "family", "me", ...REG.JOBS.map((P) => P.key)].find((k) => h.includes("-" + k)) || "home";
  if (h.includes("region")) ui.region = "town";
  { const av = h.match(/av=(p[FM][0-9])/); if (av) { S.me.avatar = av[1]; S.me.gender = av[1][1]; } const wh = h.match(/who=(c[0-9]+)/); if (wh) { S.cast.unshift(wh[1]); E.talkTo(S, wh[1]); while (S.pending) E.choose(S, 0); S.rel[wh[1]] = S.rel[wh[1]] || {}; const o = S.rel; S.rel = { [wh[1]]: o[wh[1]], ...o }; } const sp = h.match(/spot=([a-z]+)/); if (sp) ui.lastSpot = sp[1]; }
  if (h.includes("-guide")) { S.flags.noProbation = false; S.sj.active = []; S.flags.coActs = 2; }
  if (h.includes("-wed") || h.includes("-lover")) { const ids = Object.keys(E.CHAR).filter((k) => E.isRomanceable(S, E.CHAR[k])); const id = ids[0]; E.ensureRel(S, id); if (h.includes("-wed")) { Object.assign(S.rel[id], { spouse: true, aff: 72 }); S.fam.spouse = id; S.fam.spouseType = "응원형"; S.fam.marriedT = S.t; if (h.includes("kid")) S.fam.kids.push({ born: S.t - 3, name: "하린" }); } else Object.assign(S.rel[id], { lover: true, loverSince: S.t, aff: 66 }); if (h.includes("-aff")) { E.ensureRel(S, ids[2]); Object.assign(S.rel[ids[2]], { affair: true, aff: 64 }); S.fam.affair = { who: ids[2], t: S.t, sus: 42, crisisT: S.t, used: [], asked: false }; } if (h.includes("two")) { E.ensureRel(S, ids[1]); Object.assign(S.rel[ids[1]], { lover: true, loverSince: S.t, aff: 55 }); } S.apMax = E.calcApMax(S); S.ap = S.apMax; }
  render();
  if (h.includes("hub")) openHub();
  if (h.includes("-talk")) { const id = S.cast[1]; E.ensureRel(S, id); S.rel[id].stage = 99; S.ap = 5; const res = E.talkTo(S, id); if (res.ok && S.pending) showScene(); }
  if (h.includes("ending")) { S.fireAt = 41; S.cash += 280000; S.ended = h.includes("endfire") ? "fire" : "age"; if (h.includes("solo")) { const keep = (k) => h.includes("-" + k + "-") || h.endsWith("-" + k); S.sj.active = S.sj.active.filter(keep); for (const j of Object.keys(S.sj.rp || {})) if (!keep(j)) delete S.sj.rp[j].t0; if (!keep("pr")) { S.pr.rooms = []; S.pr.sold = 0; } if (!keep("cs")) S.cs.passes = 0; } /* -solo: 주소에 적은 투잡만 한 판 */ if (h.includes("jobend")) { S.moments = S.moments || {}; for (const e of REG.ENDS.filter((x, i) => i % 7 === 0)) S.moments[e.key] = S.t; } render(); } // #auto18-ending-jobend: 투잡 엔딩 몇 개 받은 결산 화면
  if (h.includes("decor") && S.pr.rooms[0]) { const rm = S.pr.rooms[0]; ui.page = "pr"; ui.prFlow = { step: "decor", id: rm.id, picks: { ...rm.decor, light: 3, seat: 1, zone: 3 } }; render(); }
  if (/-dk(pr|ab)/.test(h)) DK.decoTest(dctx(), h); // 방 꾸미기 시험: -dkpr|-dkab [-dkauto|-dkask|-dkhand|-dkguide]
  if (h.includes("quiz")) { S.cs.queue.push({ id: 999, prod: "edit", niche: "newgrad", left: 1, units: 1, price: 7, wait: 0 }); S.ap = 5; quizWin("cs_focus"); }
  if (location.hash.includes("scene")) { const id = S.cast[0]; E.openScene(S, E.meetScene(S, id)); showScene(); }
  if (location.hash.includes("char")) { const id = Object.keys(S.rel)[0]; if (id) charWin(id); }
  if (location.hash.includes("hbpick")) { doAct("hb_go"); }
  if (location.hash.includes("stdemo")) { Object.assign(S.st, { write: 162, num: 118, career: 84, talk: 47, lang: 185, mkt: 102, sense: 70, hands: 33, charm: 55, body: 61 }); E.giveBrk(S, "write"); E.giveBrk(S, "lang"); render(); } // v4.28 시험: 구간 배지
  if (location.hash.includes("stpick")) { S.ap = Math.max(S.ap, 3); doAct("course"); } // v4.28 시험: 공부 능력치 고르기
  if (location.hash.includes("cine")) { const id = E.CHARS ? "c002" : "c002"; E.openScene(S, { kind: "story", title: "연인이 됐다", text: "돌아오는 길, 손이 먼저 닿았다. 둘 다 아무 말도 안 했다.", cine: "lover", who: id, choices: [{ t: "계속", eff: {}, text: "" }] }); showScene(); }
  if (location.hash.includes("mgoff")) mgOffer("in_post");
  if (location.hash.includes("broke")) { const lim = E.creditRoom(S); E.addLoan(S, "신용대출", lim, 0.065); S.cash = -300; S.debtLate = 1; S.hist.push({ side: -900 }, { side: -900 }, { side: -900 }); render(); } // 파산 직전 경고 시험(#auto6-broke)
  { const pm = location.hash.match(/pg_([a-z]+)/); if (pm) setTimeout(() => { if (D.SIDEJOBS[pm[1]] && !S.sj.active.includes(pm[1])) S.sj.active.push(pm[1]); ui.page = pm[1]; render(); }, 400); }
  // 연말 결산 시험(v4.24): #autoN-yr0(신호 없음) · -yr1 · -yr15 · -yr2 · -yr3 · -full(=yr1). 올해 투잡 이익을 그 배수로 맞춰 결산 화면을 띄운다
  { const ym = location.hash.match(/-yr(\d+)/), st = ym ? { 0: 0, 1: 1, 15: 1.5, 2: 2, 3: 3 }[ym[1]] ?? 1 : location.hash.includes("full") ? 1 : null;
    if (st !== null) { const ann = E.salary(S) * 12, H = S.hist.slice(-12); S.yr0 = { ...(S.yr0 || {}), t: H[0]?.t ?? S.t, nw: Math.round(E.netWorth(S) * 0.8), fire: Math.max(0, E.fireInfo(S).ratio - 0.05), burn: S.burnouts || 0 }; H.forEach((h) => { h.side = Math.round(ann * (st ? st + 0.2 : 0.4) / H.length); h.inv = 60; }); S.fullAsk = 0; S.cash = Math.max(S.cash, E.monthlySpend(S) * (location.hash.includes("poor") ? 1 : 7)); if (location.hash.includes("poor")) S.invest = 0; E.openScene(S, E.yearScene(S, E.R(S))); showScene(); } }
  // 성장 카드·가방 시험(v4.25): #auto14-gcpick(연말 카드) · -gcpack(카드팩) · -gcbag[_탭](가방, 탭 gear·final·memo·cons·life·cards·sets)
  { const gm = location.hash.match(/gc(pick|pack|bag)(?:_([a-z]+))?/); if (gm) setTimeout(() => { GC.ensure(S); const r = E.R(S); S.cash += 20000; if (gm[1] !== "pick") S.gc.offers = [];
    if (gm[1] === "pick") { GC.yearOffer(S, r, { fire: 0.3, fire0: 0.2, ev: { g: "S" }, nw: 2, nw0: 1 }); CU.pickWin(gcx(), continueChain); }
    else if (gm[1] === "pack") { GC.openPack(S, r, { free: true }); CU.pickWin(gcx(), () => CU.bagWin(gcx())); }
    else { for (const id of ["pr_beam", "pr_karaoke", "cs_tpl", "m_kid", "m_letter", "perfume", "suit"]) IT_.grant(S, id, "ev"); IT_.grant(S, "c_drink", "mg"); IT_.grant(S, "c_drink", "mg"); IT_.grant(S, "c_vac", "gift"); for (const [id, lv] of [["h_shield", 1], ["r_pr", 2], ["c_ap", 1], ["l_fans", 1]]) S.gc.own[id] = lv; S.gc.shards = 3; CU.bagWin(gcx(), gm[2] || "gear"); }
  }, 700); }
  if (location.hash.includes("hire")) { S.co.hired = S.co.hired || []; S.co.hired.push("c107"); const sc = E.meetScene(S, "c107"); sc.title = "새 사람이 왔다 · 봉다온"; E.openScene(S, sc); showScene(); }
  if (location.hash.includes("sw2")) { const sw = $app.querySelector("[data-sw2]"); if (sw) sw.scrollLeft = 9999; }
  if (h.includes("instatest")) setTimeout(() => IGA.selfTest(igctx()), 300); // 인별 시험(#auto6-instatest)
  { const ig = h.match(/igtab_([a-z]+)/); if (ig) setTimeout(() => { S.ap = Math.max(S.ap, 6); if (ig[1] === "inboxplay" || ig[1] === "inboxdone") INS.testInbox(S, E.R(S)); if (h.includes("igdm")) { S.ins.dm = []; for (const k of ["celeb", "fan", "scam", "deal"]) INS.testDm(S, E.R(S), k); } if (h.includes("igedit")) { IGA.openInsta(igctx(), "feed"); document.querySelector("[data-igedit]")?.click(); return; } IGA.openInsta(igctx(), ig[1] === "inboxdone" ? "inboxplay" : ig[1]); if (ig[1] === "inboxdone") { document.querySelectorAll("[data-igpick]").forEach((b, i) => { if (i % 3 === 0) b.click(); }); document.querySelector("[data-igdone]")?.click(); } }, 500); } // 인별 앱 화면 보기(#auto6-ins-igtab_feed|inbox|inboxplay|inboxdone|dm|ins|deal, -igdm, -igedit)
  HU.demo({ S, E, showScene, render, save }, h); // 스승·선배·히든 길 시험(#auto6-mstest-cs-run 등)
  H2U.demo({ S, E, showScene, render, save, go }, h); // 다른 방식 히든 길 시험(#auto6-h2test-fail-run · -h2line-era · -h2hint-hide)
  if (h.includes("lvtest")) { S.ng = { ...(S.ng || {}), n: 2 }; const tp = (h.match(/lvtest-([a-z]+)/) || [])[1] || "shy", id = S.cast.find((x) => E.CHAR[x] && E.isRomanceable(S, E.CHAR[x]) && E.confessType(E.CHAR[x]) === tp); if (id) { const x = E.ensureRel(S, id); x.aff = 95; x.stage = 2; S.st.charm = 190; S.ap = 9; const r = E.personAct(S, id, "confess"); if (r.scene) showScene(); } } /* 고백 과정 시험(#auto18-lvtest-shy|late|tease|yes) */
  if (h.includes("abtrap")) { const sc = AB.trapDemo(S, (h.match(/abtrap-([a-z]+)/) || [])[1]); if (sc) { E.openScene(S, sc); showScene(); } } /* 에어씨앤씨 숨은 함정 시험(#auto18-abnb-abtrap-bld) */
  if (h.includes("gradetest")) openWin(`<h2>결산 등급 시험 <button class="x" data-close>✕</button></h2>${(S.grade = (h.match(/gradetest-([SABC])/) || [])[1] || "C", gradeCard())}`); /* #auto18-gradetest-C */
  if (h.includes("questtest")) { S.flags.quest = true; S.flags.noProbation = false; delete S.sj.pickT; S.ng = { ...(S.ng || {}), n: 1 }; S.sj.active = []; S.t = Math.max(S.t, 4); const st = (h.match(/questtest-(\d)/) || [])[1] || "3"; S.sj.found = {}; S.sj.int = {}; const ks = Object.keys(D.SIDEJOBS).filter((k) => D.SIDEJOBS[k].play); ks.slice(0, st === "1" ? 3 : 6).forEach((k, i) => { S.sj.int[k] = 20 + i * 13; }); if (st !== "1") SJ.found(S, ks[0]); if (st === "3") { SJ.found(S, ks[1]); SJ.found(S, ks[3]); } ui.page = "home"; render(); if (h.includes("cards")) fitCardsWin(); } /* 초반 퀘스트 시험(#auto6-questtest-1|2|3[-cards]) */
  if (h.includes("invopen")) { E.openScene(S, E.investOpenScene(S)); showScene(); } /* 투자 해금 장면 시험 */
  { const nk = (h.match(/-csn-([a-z]+)/) || [])[1]; if (nk && D.NICHES[nk] && S.cs.niche) { S.cs.niche = nk; S.cs.niches = [nk]; if (!S.cs.queue.length) S.cs.queue.push({ id: 999, prod: "coach", niche: nk, left: 1, units: 1, price: 12, wait: 0 }); } } /* 포지션별 미니게임 시험(#auto18-cs-mgdue-csn-interview|career|newgrad|public) */
  if (h.includes("mgdue")) S.mgForce = true; /* 미니게임 '올해의 큰 일' 창 시험(#auto18-abnb-mgdue → 게스트 응대) */
  if (h.includes("chrenew") || h.includes("charea")) import("./engine/jobs/chbrand.js").then((BR) => { const C = S.chicken; if (!C?.stores?.length) return; if (h.includes("charea")) { C.ctT = S.t + 2; BR.survey(S, E.R(S)); ui.page = "chicken"; render(); return; } const sc = h.includes("chrenew2") ? BR.renewScene(S, E.R(S)) : BR.renewWarn(S); E.openScene(S, sc); showScene(); }); /* 치킨 계약 갱신·상권 카드 시험 */
  if (h.includes("lovewin")) { S.ng = { ...(S.ng || {}), n: 2 }; const id = S.cast.find((x) => E.CHAR[x] && E.isRomanceable(S, E.CHAR[x]) && E.CHAR[x].helper?.effect && E.CHAR[x].helper.effect !== "none"); const x = E.ensureRel(S, id); x.aff = 78; if (h.includes("lovewin-lover")) { x.lover = true; x.loverSince = S.t - 11; x.dateT = S.t; x.anv = { t: S.t + 1, n: "1주년" }; } S.ap = 9; charWin(id); } /* 연인 큰 화면 시험(#auto18-lovewin[-lover]) */
  if (h.includes("chattest")) { const sc = LVX.chatDemo(S, h.includes("chattest-lover") ? "lover" : "crush"); if (sc) { E.openScene(S, sc); showScene(); } } /* 까톡 시험 */
  if (h.includes("xdemo")) { const k = (h.match(/xdemo-([a-z0-9]+)/) || [])[1]; if (/^(why|gag|boss)$/.test(k)) { if (!S.cs.niche) CS.setNiche(S, "newgrad"); CS.setNick(S, "nick", (h.match(/-nk-([a-z]+)/) || [])[1]); } const sc = XR.demo(S, k); if (sc) { E.openScene(S, sc); showScene(); } } /* 조연의 다른 얼굴·닉네임 이야기 시험(#auto18-xdemo-x03 · #auto18-cs-xdemo-why-nk-fairy|elder|fail|deliver|mask) */
  if (h.includes("dlgtest")) { const id = (h.match(/dlgtest-([a-z0-9_]+)/) || [])[1]; import("./gen/data.js").then((G) => { const x = G.SCENES.find((q) => q.id === id); if (x) { E.openScene(S, { kind: "event", ...x }); showScene(); } }); } /* 대화창 시험: 자료 장면 id 로 바로 열기(#auto18-dlgtest-co_new_lead) */
  if (h.includes("picktest")) { const sc = SJ.pickScene(S, (h.match(/picktest-([a-z]+)/) || [])[1] || "first"); if (sc) { E.openScene(S, sc); showScene(); } } /* 투잡 고르는 장면 시험(#auto6-questtest-3-picktest-first|again|add) */
  if (h.includes("hevtest")) { const sc = LVX.helperDemo(S, (h.match(/hevtest-([a-z]+)/) || [])[1] || "big"); if (sc) { E.openScene(S, sc); showScene(); } } /* 조력자 사건 시험(#auto18-hevtest-big|small|ap) */
  if (h.includes("pwtest")) { const sc = PW.crisisScene(S); if (sc) { E.openScene(S, sc); showScene(); } } /* 파티룸 컨셉 위기 시험(#auto18-pr-pwtest) */
  if (h.includes("wvtest")) { const j = (h.match(/wvtest-([a-z]+)/) || [])[1] || S.sj.active[0] || "cs"; const sc = WV.waveScene(S, j, h.includes("wvlate"), h.includes("wvtwo") ? 2 : 1, h.includes("hitb") ? "b" : "a", h.includes("patha") ? "a" : h.includes("pathb") ? "b" : null); if (sc) { E.openScene(S, sc); showScene(); } } /* 판이 바뀐다 시험(#auto18-<투잡>-wvtest-<투잡>) */
  if (h.includes("jptest")) setTimeout(jpTest, 300); // 한방 전략 시험(#auto-jptest)
  { const fm = h.match(/-f30([a-z]+)/), jk = ["tutoring", "tarot"].find((k) => h.includes("-" + k)); if (fm && (jk || h.includes("-cs-"))) setTimeout(async () => { const r = E.R(S), sc = jk ? (await import(`./engine/jobs/${jk}.js`)).f30Test?.(S, r, fm[1]) : CS.f30Scene(S, r, fm[1]); if (sc) { E.openScene(S, sc); showScene(); } }, 400); } // 컨설팅·과외·타로 특이 요소 장면 시험(#auto6-cs-f30bid · #auto6-tutoring-f30boost · #auto6-tarot-f30heavy)
  { const pm = h.match(/-ppl(many|few|dex|map)/); if (pm) import("./people_ui.js").then((M) => { if (pm[1] !== "few") M.demo(S, E, pm[1] !== "few", RV_DEMO); save(); render(); pplOpen(pm[1] === "dex" ? "dex" : "map"); }); } // 인물 도감·관계도 시험: -pplfew(관계도 적을 때) -pplmany(많을 때) -ppldex(도감)
}

// ───────── 한방 전략 시험(#auto-jptest): 세 투잡 전략 장면을 강제로 띄워 실제 버튼으로 끝까지 고른다 ─────────
function jpTest() {
  const say = (ok, lines) => { const er = document.getElementById("err"); if (er) { ok = false; lines = [er.textContent, ...lines]; } const d = document.createElement("pre"); d.id = "jptest"; d.style.cssText = "position:fixed;left:0;right:0;bottom:80px;z-index:70;background:#000c;color:#9f9;font-size:10px;max-height:40vh;overflow:auto;margin:0;padding:6px"; d.textContent = [ok ? "JP TEST OK" : "JP TEST FAIL", ...lines].join(String.fromCharCode(10)); document.body.appendChild(d); };
  try {
    // 세 투잡을 켠다(칸이 모자라면 다른 투잡을 뺀다)
    S.sj.active = S.sj.active.filter((k) => ["cs", "tarot", "webnovel"].includes(k));
    for (const k of ["cs", "tarot", "webnovel"]) { SJ.found(S, k); if (!S.sj.active.includes(k)) { const res = SJ.start(S, k); if (!res.ok) S.sj.active.push(k); } }
    S.cash += 60000; S.flags.noProbation = true;
    const tiers = ["big", "meh", "mid", "small", "bust"];
    let opened = 0, picked = 0, results = 0, asks = 0;
    const clickAll = () => { let g = 0; while (g++ < 30) { const b = document.querySelector(".scene [data-ch]"); if (b) { const sc = S.pending; if (sc?.kind !== "event" || sc?.onChoose !== "jp_offer") { if (/^한방 결과/.test(sc?.title || "")) results++; if (sc?.onChoose === "jp_ask") asks++; } b.click(); picked++; continue; } const ok = document.querySelector("[data-ok]"); if (ok) { ok.click(); continue; } break; } };
    const flush = () => { let g = 0; while ((S.pending || S.sceneQ?.length) && g++ < 40) { if (!S.pending) E.nextQueuedScene(S); if (!S.pending) break; if (S.pending.kind === "year") { E.choose(S, 0); continue; } showScene(); clickAll(); if (S.pending && document.querySelector(".cine")) { E.choose(S, 0); closeWin(); } } closeWin(); };
    // 1) 전략 8개 × 결과 5갈래 = 40판(0번 = 도전)
    JP.JP_DEF.forEach((d, di) => tiers.forEach((tr) => { const sc = JP.jpScene(S, d.id, tr); E.openScene(S, sc); opened++; showScene(); clickAll(); if (S.pending) throw new Error(`제안 장면이 안 닫힘: ${d.id}`); }));
    // 2) 다른 선택지: 1번(작게·직접·판권만), 마지막(거절)
    for (const d of JP.JP_DEF) { E.openScene(S, JP.jpScene(S, d.id, "mid")); E.choose(S, 1); E.openScene(S, JP.jpScene(S, d.id)); E.choose(S, d.ch.length); }
    // 3) 웹소설 좋은 일 6개
    for (const g of JP.JP_GOOD) { E.openScene(S, JP.jpGoodScene(S, E.R(S), g.id)); opened++; showScene(); clickAll(); }
    const runs = S.jp.runs.length;
    // 4) 결과·후속까지 달을 넘기며 실제 버튼으로 고른다
    for (let m = 0; m < 16 && !S.over && !S.ended; m++) { JP.jpRush(S); E.endMonth(S); flush(); }
    const V = S.jp, left = V.runs.length + V.folQ.length;
    const ok = !left && results >= 40 && asks >= 1;
    say(ok, [`제안·좋은 일 장면 ${opened}개 · 도전 ${runs}판 · 결과 장면 ${results}개 · 물음 장면 ${asks}개 · 남은 진행 ${left}`, `갈래 ${JSON.stringify(V.stat.tier)}`, `한방 수입 ${E.won(V.stat.inc)} · 지출 ${E.won(V.stat.exp)} · 흐름 ${V.flows.length}개`, `기록: ${S.log.filter((x) => /^\[(한방|좋은 일)\]/.test(x.text)).length}줄 · 클릭 ${picked}번`]);
    render();
  } catch (e) { console.error(e); say(false, [String(e && e.stack || e)]); }
}


// ───────── 클릭 흐름 시험(#flow): 실제 버튼을 눌러 한 판을 진행한다 ─────────
function flowTest(months) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const click = (sel, root) => { const el = $(sel, root); if (el && !el.disabled) { el.click(); return true; } return false; };
  const skipCine = () => { const cn = $(".cine"); if (!cn) return false; if (cn._skip) cn._skip(); else cn.remove(); return true; };
  const clearModal = () => { for (let g = 0; g < 60 && ($modal.innerHTML || $(".cine")); g++) { if (skipCine()) continue; if (click("[data-ch]", $modal) || click("[data-ok]", $modal) || click("[data-force]", $modal) || click("[data-pick]", $modal) || click("[data-pa]", $modal) || click("[data-close]", $modal)) continue; closeWin(); } };
  startWizard(1); click('[data-g="F"]'); click('[data-age="28"]'); click("[data-nextw]");
  { const w = ui.wiz; w.rolls.push(E.rollStats(Math.random), E.rollStats(Math.random)); w.pick = 1; renderWiz(); click('[data-rpick="0"]'); click("[data-nextw]"); }
  click('[data-major="math"]'); click("[data-nextw]"); click('[data-co="fin"]'); click('[data-job="risk"]'); click("[data-nextw]");
  click("[data-reroll-tr]"); click("[data-undo-tr]"); $app.querySelectorAll("[data-tr]")[0].click(); $app.querySelectorAll("[data-tr]")[1].click(); click("[data-nextw]"); clearModal();
  const log = []; let stuck = 0, stuckAt = null;
  go("hobby"); click('[data-hbjoin="mentor"]'); click('[data-hbjoin="wine"]');
  let done = 0; const startT = S.t;
  for (let m = 0; m < months && S && !S.over && !S.ended; m++) {
    const t0 = S.t;
    if (m) { if (S.t === ui._flowT) { stuck++; if (stuck >= 3) { stuckAt = { age: S.age.toFixed(1), modal: ($modal.textContent || "").slice(0, 120), cine: !!$(".cine"), pending: S.pending?.title || null }; break; } } else stuck = 0; }
    ui._flowT = t0;
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
  done = S ? S.t - startT : 0;
  if (!stuckAt && S && !S.over && !S.ended && done < months) stuckAt = { age: S.age.toFixed(1), modal: ($modal.textContent || "").slice(0, 120), cine: !!$(".cine"), pending: S.pending?.title || null };
  ui.page = "home"; render();
  // 나이가 실제로 늘었는지로 판정한다(화보·창이 막으면 FLOW STUCK)
  const head = stuckAt ? `FLOW STUCK ${done}/${months}개월 · ${stuckAt.age}세에서 멈춤 · 창:${stuckAt.modal || "없음"} · 화보:${stuckAt.cine ? "있음" : "없음"} · 장면:${stuckAt.pending || "없음"}` : S.over || S.ended ? `FLOW OK (끝남: ${S.over || S.ended}) ${done}개월` : `FLOW OK ${done}/${months}개월 · ${S.age.toFixed(1)}세`;
  const d = document.createElement("pre"); d.id = "flow"; d.style.cssText = "position:fixed;left:0;right:0;bottom:80px;z-index:70;background:#000c;color:" + (stuckAt ? "#f99" : "#9f9") + ";font-size:10px;max-height:40vh;overflow:auto;margin:0;padding:6px"; d.textContent = [head, ...log.slice(-12)].join(String.fromCharCode(10)); document.body.appendChild(d);
}

// ───────── 투잡 플러그인 클릭 시험(#jobflow12-<key>): 탐색 → 시작 → 보드 → 행동 → 월 넘김 → 장면 → 저장/불러오기 ─────────
function jobFlowTest(key, months) {
  const P = REG.get(key), $ = (sel, root = document) => root.querySelector(sel), log = [];
  const say = (ok, t) => { const er = document.getElementById("err"); if (er) { ok = false; t = [er.textContent, ...t]; } const d = document.createElement("pre"); d.id = "jobflow"; d.style.cssText = "position:fixed;left:0;right:0;bottom:80px;z-index:70;background:#000c;color:#9f9;font-size:10px;max-height:40vh;overflow:auto;margin:0;padding:6px"; d.textContent = [ok ? `JOB FLOW OK ${key}` : `JOB FLOW FAIL ${key}`, ...t].join(String.fromCharCode(10)); document.body.appendChild(d); };
  if (!P) return say(false, ["엔진 플러그인이 등록되지 않음(engine/jobs/" + key + ".js 가 null 이거나 규약 오류, 콘솔 경고 확인)"]);
  const clear = () => { for (let g = 0; g < 80; g++) { const cn = $(".cine"); if (cn) { if (cn._skip) cn._skip(); else { cn.remove(); showScene(); } continue; } if (!$modal.innerHTML) break; const b = $("[data-ch]", $modal) || $("[data-ok]", $modal) || $("[data-force]", $modal) || $("[data-pick]", $modal) || $("[data-pa]", $modal) || $("[data-close]", $modal); if (b && !b.disabled) b.click(); else closeWin(); } };
  try {
    S = E.newGame({ seed: "jobflow-" + key, gender: "F", name: "시험", traits: ["insider", "cfo"], look: randomLook(Math.random, "F") }); S.cash += 30000; S.flags.noProbation = true;
    S.sj.open = true; SJ.found(S, key); ui.page = "sj"; ui.sjf = "all"; render();
    const st = $(`[data-sjstart="${key}"]`); if (!st) throw new Error("투잡 탐색에 시작하기 버튼이 없음");
    st.click(); $("[data-yes]", $modal).click(); clear();
    if (!SJ.isActive(S, key)) throw new Error("시작 안 됨");
    if (ui.page !== key) go(key);
    if (!$app.querySelector(".page")?.innerHTML.trim()) throw new Error("보드가 비어 있음");
    log.push(`시작 OK · 칸 ${S.sj.active.join(",")} · 보드 글자 ${$app.innerText.length}`);
    let acts = 0, scenes = 0;
    for (let m = 0; m < months && !S.over; m++) {
      for (let k = 0; k < 6 && S.ap > 0; k++) {
        if (ui.page !== key) go(key);
        const bs = [...$app.querySelectorAll(`[data-act^="${P.prefix}"]`)].filter((b) => !b.dataset.why);
        if (!bs.length) break;
        const before = S.stat.actions; bs[(m + k) % bs.length].click(); clear(); if (S.stat.actions > before) acts++;
      }
      go("home"); S.ap = 0; const sc0 = S.stat.scenes; $("[data-end]").click(); clear(); clear(); scenes += S.stat.scenes - sc0;
      log.push(`${E.ymLabel(S)} 현금 ${Math.round(S.cash)} 순자산 ${Math.round(E.netWorth(S))} 이 투잡 ${S.hist.at(-1)?.px?.[key] ?? "-"}`);
    }
    const L = E.load(E.save(S)); if (!L || !L[key] || !L.sj.active.includes(key)) throw new Error("저장/불러오기에서 상태가 사라짐");
    S = L; go(key);
    log.unshift(`행동 ${acts}번 · 장면 ${scenes}개 · 저장/불러오기 OK · 할 일 ${E.todos(S).filter((t) => t.go === key).length}개`);
    say(true, log);
  } catch (e) { say(false, [String(e.stack || e), ...log]); }
}

// ───────── 새 투잡 화면 플러그인(jobs/<key>_ui.js) 등록 ─────────
// 플러그인에 넘기는 공용 도구. S 는 새 인생마다 바뀌니 부를 때마다 새로 만든다. q 는 bind 때만 있다.
// 인별 앱 창에 넘기는 것(jctx + 얼굴 그림·앨범)
function igctx() { return { ...jctx(), faceSrc, meSrc, bodySrc, meta }; }
function jctx(q) {
  return { S, D, E, SJ, SYN, REG, ui, esc, won, jo, r1, toast, save, render, go, openWin, closeWin, actRow, boardHead, meter, ic, img, bgUrl, doAct, afterRes, defaultArg, FX, fold,
    q: q || ((sel, fn) => $app.querySelectorAll(sel).forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); fn(el, e); }))) };
}
// 화면 플러그인이 없을 때 쓰는 기본 보드: 행동 목록만
function plugPageBasic(P) {
  const j = D.SIDEJOBS[P.key];
  return `${boardHead(P.key)}<div class="card"><h3>${esc(j.n)}</h3><div class="tiny muted">"${esc(j.line)}"</div></div><div class="acts" style="padding:0">${Object.keys(P.actions || {}).filter((id) => D.ACTIONS[id]).map((id) => actRow(id, defaultArg(id))).join("")}</div>`;
}
function regUiPlugins() {
  for (const U of UI_PLUGINS) { if (U?.key && REG.get(U.key)) UJ[U.key] = U; else console.warn("[투잡 등록표] 화면 플러그인 건너뜀(엔진 플러그인 없음)", U?.key); }
  for (const P of REG.JOBS) {
    const k = P.key, U = UJ[k] || {}, j = D.SIDEJOBS[k], bgk = U.bg || SJ_BG[k] || "alley";
    PLUG_PAGES[k] = () => { try { return U.page ? U.page(jctx()) : plugPageBasic(P); } catch (e) { showErr(e.stack || String(e)); return plugPageBasic(P); } };
    TILE[k] = { ic: U.ic || j.ic || "spark", bg: BG.has(bgk) ? `img/bg/${bgk}.webp` : "img/bg_office.webp", lock: U.lock || `투잡 탐색에서 ${j.n} 시작` };
    PAGE_BG[k] = bgk; SJ_BG[k] = U.sjBg || bgk;
    Object.assign(ACT_IC, U.icons || {});
    for (const [id, stat] of Object.entries(P.mg || {})) if (D.ACTIONS[id]) MGJ[id] = [k, stat]; // 미니게임: mg2/<key>1~3.js
    CINE_BG["full_" + k] = U.fullBg || bgk; CINE_TAG["full_" + k] = "본잡 전환";
    for (const [ck, v] of Object.entries(U.cine || {})) { const [b, t] = Array.isArray(v) ? v : [v, j.n]; CINE_BG[ck] = b; CINE_TAG[ck] = t || j.n; }
  }
  // 투잡 엔딩 화보: 배경이 따로 없으면 그 투잡 배경, 꼬리표는 '○○ 엔딩'
  const OLD_BG = { pr: "partyroom", cs: "consult", insta: "home", airbnb: "airbnb", ucafe: "ucafe" };
  for (const X of REG.STORY) for (const m of X.milestones || []) if (!m.end && !CINE_BG[m.key]) { CINE_BG[m.key] = OLD_BG[X.key] || "alley"; CINE_TAG[m.key] = D.SIDEJOBS[X.key].n; } // 기존 투잡 이야기 마일스톤 화보 배경
  for (const e of REG.ENDS) { if (!CINE_BG[e.key]) CINE_BG[e.key] = OLD_BG[e.job] || PAGE_BG[e.job] || "alley"; CINE_TAG[e.key] = `${D.SIDEJOBS[e.job].n} 엔딩`; }
}
regUiPlugins();

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
  setTimeout(warmThumbs, 300);
  if (location.hash.startsWith("#jobflow")) jobFlowTest((location.hash.match(/-([a-z]+)/) || [])[1], +(location.hash.match(/\d+/) || [12])[0]);
  else if (location.hash.startsWith("#flow")) flowTest(+(location.hash.match(/\d+/) || [24])[0]);
  else if (location.hash.startsWith("#auto")) autoTest(+(location.hash.match(/\d+/) || [18])[0]);
  else if (location.hash.startsWith("#wiz")) { startWizard(1); const w = ui.wiz; const n = +(location.hash.match(/\d/) || [1])[0]; if (n >= 2) { w.step = 2; w.rolls.push(E.rollStats(Math.random)); w.pick = 0; } if (n >= 3) { w.step = 3; w.major = "elec"; } if (n >= 4) { w.step = 4; w.company = "fin"; w.companyName = "신안은행"; w.job = "dfin"; } if (n >= 5) { w.step = 5; w.traits = w.pool.slice(0, 2); } renderWiz(); }
  else if (location.hash.startsWith("#intro")) { autoTest(1); showIntro(); }
  else if (location.hash.startsWith("#dexsample")) { const ids = Object.keys(E.CHAR); META_C = Object.assign({}, META_C, { dexInit: 1, album: [], dex: Object.fromEntries(ids.filter((k, i) => i % 3 === 0).map((k, i) => [k, [1 + (i % 3), (i * 23) % 100, i % 4, [0, 1, 3, 5, 17, 33, 65][i % 7]]])) }); renderTitle(); if (location.hash.includes("open")) setTimeout(() => pplOpen(location.hash.includes("det") ? "dex:" + ids[0] : location.hash.includes("lock") ? "dex:" + ids[1] : "dex"), 300); } // 시작 화면·도감 시험
  else if (location.hash.startsWith("#gift")) { META_C = Object.assign({}, META_C, { runs: [{}, {}], ngPts: 9, knownJobs: ["pr", "cs", "airbnb"], pastFriends: ["c001", "c005", "c064"], endings: ["fire", "agefail"], metAll: ["c001", "c002", "c005"] }); startWizard(1); ui.wiz.gifts = { cash: 1, know: ["pr"], friend: ["c001"] }; renderWiz(); }
  else renderTitle();
});
