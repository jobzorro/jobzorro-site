// 히든 길·스승 화면 조각(v4.29). 엔진은 engine/hidden.js · engine/mentor.js
// hidBox: 투잡 보드(boardHead)에 한 줄. 낌새 전엔 안 보임 → 흐린 '??? 히든 길 · 조건 n/m'(눌러 펼치기) → 열리면 금색 한 줄.
// 시험 해시: -mstest-<job>(스승 장면) · -sntest-<job>(선배 장면) · -hdtest-<job>(히든 길 문 열림) · 끝에 -run 을 붙이면 버튼을 끝까지 눌러 #mstest 에 결과
import { hidInfo, openList, HID, forceOpen, hidDemo } from "./engine/hidden.js";
import { mentorDemo, seniorDemo, metOf } from "./engine/mentor.js";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const CINE_BG = { hid_cs: "consult", hid_pr: "partyroom", hid_airbnb: "airbnb", hid_ucafe: "ucafe", hid_insta: "popup", hid_tarot: "center", hid_webnovel: "library", hid_tutoring: "studyst", hid_chicken: "pub", hid_vibe: "cowork" };
export const CINE_TAG = Object.fromEntries(Object.keys(CINE_BG).map((k) => [k, "히든 길"]));
export const hidNames = (S) => openList(S).map((k) => HID[k]?.n).filter(Boolean);

let cssDone = false;
function css() {
  if (cssDone || typeof document === "undefined") return; cssDone = true;
  const s = document.createElement("style"); s.id = "hidcss";
  s.textContent = `.hdbox{padding:7px 10px;margin-bottom:8px;font-size:12px}
.hdbox summary{cursor:pointer;list-style:none;display:flex;gap:6px;align-items:center;color:var(--muted);opacity:.85;min-height:40px;margin:-7px 0}
.hdbox summary::-webkit-details-marker{display:none}
.hdbox .hd-q{font-weight:800;letter-spacing:1px;color:var(--gold);opacity:.7}
.hdbox .hd-k{margin-left:auto;font-size:11px}
.hdbox ul{margin:6px 0 2px;padding:0;list-style:none}
.hdbox li{display:flex;gap:6px;font-size:11.5px;padding:3px 0;border-top:1px solid var(--line)}
.hdbox li b{min-width:14px;text-align:center}.hdbox li.ok{color:var(--green)}.hdbox li span:last-child{margin-left:auto;color:var(--muted);font-size:11px}
.hdbox .hd-t{font-size:11px;color:var(--muted);margin-top:4px;word-break:keep-all}
.hdbox.open{border-color:var(--gold);display:flex;gap:6px;align-items:center;flex-wrap:wrap}.hdbox.open b{color:var(--gold)}
.who.big{flex-direction:column;align-items:center;text-align:center}.who.big .pic{width:150px;height:150px}.who.big .pic img{width:100%;height:100%}`;
  document.head.appendChild(s);
}
export function hidBox(S, k) {
  const h = hidInfo(S, k); if (!h) return ""; css();
  if (h.open) return `<div class="card hdbox open">🗝 <b>히든 길 · ${esc(h.n)}</b><span class="tiny muted">${h.on ? "열림" + (h.until != null ? ` · ${h.until}달 남음` : "") : h.pause ? `위기 · ${h.pause}달 쉼` : "효과 끝"}</span><div class="hd-t" style="flex-basis:100%">${esc(h.rew)}</div>${h.on ? `<div class="hd-t" style="flex-basis:100%">따로 누를 것은 없어요. 이 보드에 저절로 적용돼요.</div>` : ""}</div>`;
  const rows = h.conds.map((c) => `<li class="${c.ok ? "ok" : ""}"><b>${c.ok ? "✓" : "·"}</b><span>${esc(c.t)}</span><span>${esc(c.prog)}</span></li>`).join("");
  const tip = h.rev < h.m ? "??? 조건은 스승을 만나면 하나씩 보여요" : "조건을 다 채우면 문이 열려요";
  const tr = h.trend ? `<div class="hd-t">다음 유행 짐작: ${esc(h.trend)}${h.left != null ? ` · 약 ${h.left}달 뒤` : ""} (30%는 헛다리)</div>` : "";
  return `<details class="card hdbox"><summary><span class="hd-q">???</span><span>히든 길 · 낌새를 느꼈어요</span><span class="hd-k">조건 ${h.k}/${h.m} ▾</span></summary><ul>${rows}</ul>${tr}<div class="hd-t">${tip}</div></details>`;
}

// ───────── 시험 ─────────
// ctx = { S, E, showScene, render, save }
export function demo(ctx, h) {
  const m = h.match(/-(ms|sn|hd|hl)test-([a-z]+)/); if (!m) return false; // hl: 보드 한 줄만(낌새 본 상태)
  const { S, E } = ctx, kind = m[1], job = m[2], r = E.R(S);
  if (!HID[job]) return false;
  S.sj.open = true; S.ap = Math.max(S.ap, 6);
  if (kind === "hl") { hidDemo(S, job); ctx.save(); ctx.render(); if (h.includes("-open")) setTimeout(() => document.querySelector(".hdbox")?.setAttribute("open", ""), 900); return true; }
  if (kind === "ms") E.openScene(S, mentorDemo(S, r, job));
  else if (kind === "sn") E.openScene(S, seniorDemo(S, r, job));
  else { hidDemo(S, job); const L = []; forceOpen(S, r, job, L); S.sceneQ.unshift(...L); E.nextQueuedScene(S); }
  ctx.save(); ctx.render(); ctx.showScene();
  if (h.includes("-run")) setTimeout(() => autoRun(ctx, kind, job), 400);
  return true;
}
function autoRun(ctx, kind, job) {
  const { S } = ctx, seen = []; let g = 0;
  const step = () => {
    if (g++ > 80) return done(false, "멈춤");
    const cine = document.querySelector(".cine"); if (cine) { seen.push("화보"); cine._skip?.(); return setTimeout(step, 150); }
    const ok = document.querySelector("[data-ok]"); if (ok) { ok.click(); return setTimeout(step, 150); }
    const ch = document.querySelectorAll("[data-ch]"); if (ch.length) { const t = document.querySelector(".scene h2")?.textContent || ""; seen.push(t.trim()); ch[0].click(); return setTimeout(step, 150); }
    if (S.pending || S.sceneQ.length) return setTimeout(step, 150);
    done(true);
  };
  const done = (ok, why) => {
    const er = document.getElementById("err"); if (er && er.textContent.trim()) { ok = false; why = er.textContent; }
    const res = kind === "ms" ? `등급 ${metOf(S, job)?.g || "?"} · 제자 ${S.rel[Object.keys(S.rel).find((id) => S.rel[id].master)]?.master ? "예" : "아니오"}` : kind === "sn" ? `선배 만남 ${S.sj.rp?.[job]?.sen || 0}/3` : `히든 길 ${hidInfo(S, job)?.open ? "열림" : "닫힘"}`;
    const d = document.createElement("pre"); d.id = "mstest"; d.style.cssText = "position:fixed;left:0;right:0;bottom:70px;z-index:80;background:#000d;color:#9f9;font-size:11px;white-space:pre-wrap;padding:6px;max-height:40vh;overflow:auto";
    d.textContent = `MSTEST ${ok ? "OK" : "FAIL"} ${kind} ${job} · ${res}${why ? " · " + why : ""}\n${seen.join("\n")}`; document.body.appendChild(d);
  };
  step();
}
