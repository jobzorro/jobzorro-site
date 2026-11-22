// 다른 방식의 히든 길 화면 조각(v4.30). 엔진은 engine/hidden2.js. 표시는 hidden_ui.js 와 같은 모양(흐린 '??? 히든 길' 줄 → 열리면 금색 🗝 줄).
// box: 투잡 보드(boardHead)에 그 투잡 길 · sjBox: 투잡 탐색 화면 '다른 길'(시대·회사·가족·회차처럼 투잡 하나에 안 묶인 길)
// 시험 해시: -h2test-<key>(문 열림, 끝에 -run 이면 버튼을 끝까지 눌러 #h2test 결과) · -h2line-<key>(낌새 본 상태의 줄, -opened 면 열린 금색 줄) · -h2hint-<key>(낌새 장면)
import * as H2 from "./engine/hidden2.js";
import { openList as hid1List } from "./engine/hidden.js";
import * as SJ from "./engine/sj.js";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const CINE_BG = Object.fromEntries(H2.KEYS.map((k) => ["h2_" + k, H2.P2[k].bg || "street"]));
export const CINE_TAG = Object.fromEntries(H2.KEYS.map((k) => ["h2_" + k, "히든 길"]));
export const names = (S) => H2.names(S);
export const epi = (S) => H2.epi(S);
export const runRec = (S) => H2.runRecord(S, hid1List(S));

const JOB_N = { pr: "파티룸", cs: "취업컨설팅", insta: "인별그램", airbnb: "에어씨앤씨", ucafe: "무인카페", tarot: "타로", webnovel: "웹소설", tutoring: "화상과외", chicken: "치킨", vibe: "바이브코딩" };
let cssDone = false, OPEN_ALL = false; // 시험(-h2line)에서 줄을 펼쳐 둔다
function css() {
  if (cssDone || typeof document === "undefined") return; cssDone = true;
  if (document.getElementById("hidcss")) return; // hidden_ui.js 가 이미 넣었으면 같은 모양을 쓴다
  const s = document.createElement("style"); s.id = "hid2css";
  s.textContent = `.hdbox{padding:7px 10px;margin-bottom:8px;font-size:12px}
.hdbox summary{cursor:pointer;list-style:none;display:flex;gap:6px;align-items:center;color:var(--muted);opacity:.85;min-height:40px;margin:-7px 0}
.hdbox summary::-webkit-details-marker{display:none}
.hdbox .hd-q{font-weight:800;letter-spacing:1px;color:var(--gold);opacity:.7}
.hdbox .hd-k{margin-left:auto;font-size:11px}
.hdbox ul{margin:6px 0 2px;padding:0;list-style:none}
.hdbox li{display:flex;gap:6px;font-size:11.5px;padding:3px 0;border-top:1px solid var(--line)}
.hdbox li b{min-width:14px;text-align:center}.hdbox li.ok{color:var(--green)}.hdbox li span:last-child{margin-left:auto;color:var(--muted);font-size:11px}
.hdbox .hd-t{font-size:11px;color:var(--muted);margin-top:4px;word-break:keep-all}
.hdbox.open{border-color:var(--gold);display:flex;gap:6px;align-items:center;flex-wrap:wrap}.hdbox.open b{color:var(--gold)}`;
  document.head.appendChild(s);
}
const css2 = () => { if (typeof document === "undefined" || document.getElementById("hid2x")) return; const s = document.createElement("style"); s.id = "hid2x"; s.textContent = `.hdbox .hd-c{font-size:11px;padding:0 6px;border-radius:99px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}.hdbox.gone{opacity:.6}.h2etc h3{margin:0 0 6px;font-size:13px}`; document.head.appendChild(s); };

// cur: 지금 보고 있는 보드(투잡 탐색이면 없음). 열린 길이 어느 보드에 쓰이는지 알려 준다(v4.31)
function line(S, k, cur) {
  const h = H2.h2Info(S, k); if (!h) return "";
  const wh = (h.where || []).filter((j) => SJ.isActive(S, j)), jn = (j) => { try { return SJ.D?.SIDEJOBS?.[j]?.n || JOB_N[j] || j; } catch (e) { return JOB_N[j] || j; } };
  const use = !h.on ? "" : wh.length && !wh.includes(cur) ? `<div class="row" style="flex-basis:100%;margin-top:4px;gap:6px"><span class="hd-t grow" style="margin:0">효과는 저절로 적용돼요.</span>${wh.slice(0, 2).map((j) => `<button class="btn sm" data-go="${j}">${esc(jn(j))} 보드에서 보기 ›</button>`).join("")}</div>` : `<div class="hd-t" style="flex-basis:100%">따로 누를 것은 없어요. ${wh.includes(cur) ? "이 보드에" : "효과는"} 저절로 적용돼요.</div>`;
  if (h.gone) return `<div class="card hdbox open gone">🗝 <b>${esc(h.n)}</b><span class="hd-c">${esc(h.cat)}</span><div class="hd-t" style="flex-basis:100%">닫힘 · ${esc(h.why || "이번 인생에선 끝난 길")}</div></div>`;
  if (h.open) return `<div class="card hdbox open">🗝 <b>히든 길 · ${esc(h.n)}</b><span class="hd-c">${esc(h.cat)}</span><span class="tiny muted">${h.on ? "열림" + (h.until != null ? ` · ${h.until}달 남음` : "") : h.pause ? `위기 · ${h.pause}달 쉼` : "효과 멈춤"}</span><div class="hd-t" style="flex-basis:100%">${esc(h.rew)}</div>${use}</div>`;
  const rows = h.conds.map((c) => `<li class="${c.ok ? "ok" : ""}"><b>${c.ok ? "✓" : "·"}</b><span>${esc(c.t)}</span><span>${esc(c.prog)}</span></li>`).join("");
  return `<details class="card hdbox"${OPEN_ALL ? " open" : ""}><summary><span class="hd-q">???</span><span>히든 길 · 낌새를 느꼈어요</span><span class="hd-c">${esc(h.cat)}</span><span class="hd-k">조건 ${h.k2}/${h.m} ▾</span></summary><ul>${rows}</ul>${h.note ? `<div class="hd-t">${esc(h.note)}</div>` : ""}<div class="hd-t">??? 조건은 채우면 보여요 · 다 채우면 문이 열려요</div></details>`;
}
export function box(S, job) { const ks = H2.boardKeys(S, job); if (!ks.length) return ""; css(); css2(); return ks.map((k) => line(S, k, job)).join(""); }
export function sjBox(S) { const ks = H2.etcKeys(S); if (!ks.length) return ""; css(); css2(); return `<div class="h2etc" style="margin-top:8px"><h3 class="tiny muted">다른 길</h3>${ks.map((k) => line(S, k)).join("")}</div>`; }

// ───────── 시험 ─────────
// ctx = { S, E, D, showScene, render, save, go }
function setup(ctx, k) {
  const { S } = ctx, d = H2.P2[k]; S.sj.open = true; S.ap = Math.max(S.ap, 6);
  const need = d.pair || (["long", "hide", "fam_heir", "ng_regress", "bd_rival", "fail"].includes(k) ? [S.sj.active[0] || "pr"] : k === "bd_mentee" ? ["cs"] : []);
  for (const j of need) if (!SJ.isActive(S, j)) { if (S.sj.active.length >= SJ.slots(S)) S.sj.active = S.sj.active.filter((x) => need.includes(x)).slice(0, Math.max(0, SJ.slots(S) - 1)); SJ.found(S, j); SJ.start(S, j); }
  if (k === "fam_biz" && !S.fam.spouse) { const id = Object.keys(ctx.E.CHAR).find((c) => ctx.E.isRomanceable(S, ctx.E.CHAR[c])); if (id) { ctx.E.ensureRel(S, id); Object.assign(S.rel[id], { spouse: true, aff: 72 }); S.fam.spouse = id; S.fam.spouseType = "동업형"; S.fam.marriedT = S.t - 60; } }
  if (k === "fam_heir") S.fam.kids = S.fam.kids.length ? S.fam.kids : [{ born: S.t - 240, name: "하린" }];
  if (k === "ng_regress" || k === "ng_deja") S.ng = { ...(S.ng || {}), n: k === "ng_regress" ? 3 : 2, past: [{ keys: ["pr"], jobs: ["pr"], over: true }, { keys: ["cb_pr_insta"], jobs: ["insta"], fire: true }] };
}
const pageOf = (S, k) => { const h = H2.h2Info(S, k); return h?.where?.[0] || "sj"; };
export function demo(ctx, h) {
  const m = h.match(/-h2(test|line|hint)-([a-z_]+)/); if (!m) return false;
  const { S, E } = ctx, kind = m[1], k = m[2], r = E.R(S);
  if (!H2.P2[k]) return false;
  setup(ctx, k);
  if (kind === "line") { OPEN_ALL = true; H2.h2Demo(S, k); if (h.includes("-opened")) H2.forceOpen(S, r, k, []); ctx.save(); ctx.go(pageOf(S, k)); setTimeout(() => { document.querySelectorAll(".hdbox").forEach((d) => d.tagName === "DETAILS" && d.setAttribute("open", "")); document.querySelector(".hdbox")?.scrollIntoView({ block: "center" }); }, 600); return true; }
  if (kind === "hint") { const sc = H2.hintDemo(S, r, k); if (sc) E.openScene(S, sc); }
  else { const L = []; H2.forceOpen(S, r, k, L); S.sceneQ.unshift(...L); E.nextQueuedScene(S); }
  ctx.save(); ctx.render(); ctx.showScene();
  if (h.includes("-run")) setTimeout(() => autoRun(ctx, kind, k), 400);
  return true;
}
function autoRun(ctx, kind, k) {
  const { S } = ctx, seen = []; let g = 0;
  const step = () => {
    if (g++ > 80) return done(false, "멈춤");
    const cine = document.querySelector(".cine"); if (cine) { seen.push("화보"); cine._skip?.(); return setTimeout(step, 150); }
    const ok = document.querySelector("[data-ok]"); if (ok) { ok.click(); return setTimeout(step, 150); }
    const ch = document.querySelectorAll("[data-ch]"); if (ch.length) { const t = document.querySelector(".scene h2")?.textContent || ""; seen.push(t.trim()); ch[0].click(); return setTimeout(step, 150); }
    if (S.pending || S.sceneQ.length) return setTimeout(step, 150);
    ctx.go(pageOf(S, k)); setTimeout(() => done(true), 300);
  };
  const done = (ok, why) => {
    const er = document.getElementById("err"); if (er && er.textContent.trim()) { ok = false; why = er.textContent; }
    const i = H2.h2Info(S, k), boxN = document.querySelectorAll(".hdbox").length;
    if (kind === "test" && !i?.open) { ok = false; why = (why || "") + " 안 열림"; }
    const d = document.createElement("pre"); d.id = "h2test"; d.style.cssText = "position:fixed;left:0;right:0;bottom:70px;z-index:80;background:#000d;color:#9f9;font-size:11px;white-space:pre-wrap;padding:6px;max-height:40vh;overflow:auto";
    d.textContent = `H2TEST ${ok ? "OK" : "FAIL"} ${kind} ${k} · ${i ? (i.open ? "열림" : i.gone ? "닫힘" : `낌새 ${i.k2}/${i.m}`) : "안 보임"} · 화면 줄 ${boxN} · 화보 키 ${S.moments?.["h2_" + k] !== undefined ? "있음" : "없음"}${why ? " · " + why : ""}\n${seen.join("\n")}`; document.body.appendChild(d);
  };
  step();
}
