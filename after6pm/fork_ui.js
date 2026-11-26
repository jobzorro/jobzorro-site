// 5년 차 갈림길 화면(11-26 대표 결정). 만 5년 결산에서 멈춘 첫 인생이 여기로 온다.
// - 이어 간다: 특성 하나 고르기(4장 · 다시 돌리기 1 · 되돌리기 1 · 투잡별 영향 전부 공개) → 자물쇠 해금 연출 → 같은 인생으로 50세까지
// - 돌아간다: 보상 하나 + 기억 하나 고르기 → 결말 화면 → 2회차(시작할 때 해금 연출)
// 규칙은 engine/round.js · engine/core.js(forkContinue·forkBack·addTrait). 여기는 화면만 그린다. 클래스 이름은 fk- 로 시작(사이트 공통 CSS와 안 겹치게)
let st = null; // { step: "ask" | "trait" | "back", ... }
const CSS = `
.fk{min-height:100vh;min-height:100dvh;background:radial-gradient(120% 80% at 50% 0%,#1b2440 0%,#0a0d18 70%);color:#eef1f8;padding:28px 16px 40px;display:flex;flex-direction:column;gap:14px;animation:fkIn .9s ease both}
@keyframes fkIn{from{opacity:0}to{opacity:1}}
.fk h1{font-size:24px;line-height:1.35;margin:18px 0 2px;text-align:center;font-weight:900;text-wrap:balance}
.fk .fk-sub{text-align:center;color:#aab3c8;font-size:13px;line-height:1.6}
.fk .fk-kv{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.fk .fk-kv>div{background:#ffffff0f;border-radius:12px;padding:10px 12px}
.fk .fk-kv .k{font-size:11.5px;color:#9aa4bb}.fk .fk-kv .v{font-size:17px;font-weight:900;margin-top:2px}
.fk .fk-big{width:100%;text-align:left;border:1px solid #ffffff26;background:#ffffff0d;color:inherit;border-radius:16px;padding:16px;font:inherit;cursor:pointer;transition:transform .15s,background .15s,border-color .15s}
.fk .fk-big:active{transform:scale(.985)}
.fk .fk-big b{display:block;font-size:17px;margin-bottom:4px}.fk .fk-big span{font-size:13px;color:#b9c1d6;line-height:1.55}
.fk .fk-big.gold{border-color:#f2c14e;background:#f2c14e1a}.fk .fk-big.gold b{color:#f6cf6b}
.fk .fk-note{font-size:12px;color:#8f99b0;text-align:center;line-height:1.6}
.fk .fk-note button{font:inherit;color:#f6cf6b;background:none;border:0;text-decoration:underline;cursor:pointer;padding:2px 4px}
.fk h2{font-size:15px;margin:10px 0 0;color:#f6cf6b}
.fk-cards{display:grid;grid-template-columns:1fr;gap:8px}
.fk-c{text-align:left;border:1px solid #ffffff22;background:#ffffff0b;color:inherit;border-radius:14px;padding:12px;font:inherit;cursor:pointer;display:flex;flex-direction:column;gap:3px;font-size:12.5px;line-height:1.5;transition:background .18s,border-color .18s,box-shadow .18s}
.fk-c.on{border-color:#f2c14e;background:#f2c14e1f;box-shadow:0 0 0 3px #f2c14e22}
.fk-c b{font-size:15px}.fk-c i{font-style:normal;color:#aab3c8}
.fk-c .pro{color:#7ddc9a}.fk-c .con{color:#ff9a9a}
.fk-c .jobs{display:flex;flex-direction:column;gap:2px;margin-top:5px;padding-top:6px;border-top:1px dashed #ffffff24;color:#c9d0e2}
.fk-c .jobs .mine{color:#f6cf6b;font-weight:700}.fk-c .jobs .neg{color:#ff9a9a}
.fk-row{display:flex;gap:8px}.fk-row button{flex:1}
.fk-btn{border:1px solid #ffffff30;background:#ffffff12;color:inherit;border-radius:12px;padding:11px;font:inherit;font-size:13.5px;cursor:pointer}
.fk-btn:disabled{opacity:.4}
.fk-btn.gold{background:#f2c14e;border-color:#f2c14e;color:#201a05;font-weight:900;padding:14px;font-size:15px}
.fk-mem{display:flex;gap:10px;align-items:center}.fk-mem img,.fk-mem .ph{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#ffffff1a;flex:none;display:grid;place-items:center;font-weight:900}
.fk-lock{position:fixed;inset:0;z-index:9999;background:radial-gradient(90% 60% at 50% 42%,#141c33 0%,#05070d 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;color:#eef1f8;animation:fkIn .5s ease both;overflow:hidden}
.fk-lock canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.fk-lock .flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:2}
.fk-lock .flash.on{animation:fkFlash .55s ease-out}
.fk-lock .row{display:flex;gap:14px;z-index:1}
.fk-lock.quake .row{animation:fkQuake .34s linear}
.fk-lock .it{width:104px;text-align:center;font-size:12.5px;color:#7f8aa3;transition:color .5s}
.fk-lock .box{position:relative;width:104px;height:104px;margin-bottom:10px}
.fk-lock .box svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.fk-lock .ic{filter:grayscale(1) brightness(.42);transition:filter .5s}
.fk-lock .halo{position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--c);opacity:0;pointer-events:none}
.fk-lock .aura{position:absolute;inset:6px;border-radius:50%;background:radial-gradient(circle,var(--c) 0%,transparent 68%);opacity:0;filter:blur(10px);pointer-events:none}
.fk-lock .crk{opacity:0;stroke-dasharray:60;stroke-dashoffset:60;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 7px var(--c))}
.fk-lock .leak{position:absolute;inset:26px 22px 12px;border-radius:50%;background:radial-gradient(circle,#fff 0%,var(--c) 40%,transparent 70%);opacity:0;filter:blur(8px);pointer-events:none}
.fk-lock .blast{position:absolute;left:50%;top:55%;width:40px;height:40px;margin:-20px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#fff 28%,var(--c) 52%,transparent 72%);opacity:0;pointer-events:none;z-index:2}
.fk-lock .rays{position:absolute;inset:-46px;border-radius:50%;background:repeating-conic-gradient(from 0deg,var(--c) 0deg 5deg,transparent 5deg 22deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 66%);mask:radial-gradient(circle,#000 18%,transparent 66%);opacity:0;pointer-events:none}
.fk-lock .it.shake .bind{animation:fkShake 1.05s ease-in;transform-origin:50% 55%}
.fk-lock .it.crack .crk{opacity:1;animation:fkCrk .5s steps(7) forwards}
.fk-lock .it.crack .bind{animation:fkJolt .12s linear 5}
.fk-lock .it.crack .leak{animation:fkLeak .5s ease-in forwards}
.fk-lock .it.open .bind{display:none}
.fk-lock .it.open{color:#eef1f8}
.fk-lock .it.open .leak{display:none}
.fk-lock .it.open .blast{animation:fkBlast .7s ease-out both}
.fk-lock .it.open .rays{animation:fkRaysIn .8s ease-out .1s both,fkSpin 14s linear infinite}
.fk-lock .it.open .ic{filter:drop-shadow(0 0 7px var(--c)) drop-shadow(0 0 20px var(--c));animation:fkPop .9s cubic-bezier(.2,1.6,.35,1) both,fkGlow 2.4s ease-in-out .9s infinite}
.fk-lock .it.open .halo{animation:fkHalo .9s ease-out both}
.fk-lock .it.open .aura{inset:-10px;animation:fkAura 2.4s ease-in-out .2s infinite}
.fk-lock p{font-size:14px;line-height:1.7;text-align:center;max-width:300px;margin:0;min-height:48px;z-index:1;opacity:0;transition:opacity .6s}
.fk-lock.end p{opacity:1}
.fk-lock button{opacity:0;pointer-events:none;transition:opacity .5s;z-index:4}.fk-lock.end button{opacity:1;pointer-events:auto}
@keyframes fkShake{0%{transform:rotate(0)}8%{transform:rotate(-4deg)}18%{transform:rotate(4deg)}28%{transform:rotate(-6deg)}38%{transform:rotate(6deg)}47%{transform:rotate(-8deg) scale(1.03)}56%{transform:rotate(8deg) scale(1.04)}64%{transform:rotate(-10deg) scale(1.05)}72%{transform:rotate(10deg) scale(1.06)}79%{transform:rotate(-11deg) scale(1.07)}86%{transform:rotate(11deg) scale(1.08)}93%{transform:rotate(-12deg) scale(1.09)}100%{transform:rotate(0) scale(1.1)}}
@keyframes fkCrk{to{stroke-dashoffset:0}}
@keyframes fkLeak{from{opacity:0}to{opacity:.85}}
@keyframes fkBlast{0%{opacity:1;transform:scale(.3)}35%{opacity:1;transform:scale(7)}100%{opacity:0;transform:scale(11)}}
@keyframes fkRaysIn{0%{opacity:0}40%{opacity:.75}100%{opacity:.34}}
@keyframes fkSpin{to{transform:rotate(360deg)}}
@keyframes fkGlow{0%,100%{filter:drop-shadow(0 0 6px var(--c)) drop-shadow(0 0 16px var(--c))}50%{filter:drop-shadow(0 0 11px #fff) drop-shadow(0 0 30px var(--c))}}
@keyframes fkJolt{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}75%{transform:translate(3px,-2px)}}
@keyframes fkPop{0%{transform:scale(.3);filter:brightness(6) drop-shadow(0 0 30px #fff)}30%{transform:scale(1.3);filter:brightness(4) drop-shadow(0 0 30px #fff)}60%{transform:scale(1.12);filter:brightness(1.6) drop-shadow(0 0 22px var(--c))}100%{transform:scale(1);filter:drop-shadow(0 0 7px var(--c)) drop-shadow(0 0 20px var(--c))}}
@keyframes fkHalo{0%{opacity:.95;transform:scale(.55)}100%{opacity:0;transform:scale(2.4)}}
@keyframes fkAura{0%,100%{opacity:.28}50%{opacity:.55}}
@keyframes fkFlash{0%{opacity:.95}18%{opacity:.8}100%{opacity:0}}
@keyframes fkQuake{0%,100%{transform:translate(0,0)}15%{transform:translate(-7px,4px)}30%{transform:translate(6px,-5px)}45%{transform:translate(-5px,-3px)}60%{transform:translate(4px,4px)}80%{transform:translate(-2px,1px)}}
@media (prefers-reduced-motion:reduce){.fk,.fk-lock,.fk-lock .it .bind,.fk-lock .it .ic,.fk-lock .row{animation-duration:.01s!important;animation-delay:0s!important}}
`;
function css() { if (document.getElementById("fk-css")) return; const e = document.createElement("style"); e.id = "fk-css"; e.textContent = CSS; document.head.appendChild(e); }
const domN = (c, d) => (d === "co" ? "회사" : c.D.SIDEJOBS[d]?.n || d);
const isNeg = (t) => /[−-]\s?\d|빠진다|이탈 \+|피해 \+|떨어진다/.test(t);

// ── 자물쇠 해금 연출(이어 가기 직후 · 2회차 첫 화면). done(): 닫힌 뒤 ──
// 11-26 대표: 아이콘을 새로 그리고, 아이콘이 사슬과 자물쇠에 묶여 있다가 자물쇠가 산산이 부서지며 파편이 사방으로 날아간다.
// 아이콘·사슬·자물쇠는 전부 코드 그림(SVG), 파편은 화면 전체 캔버스에 그린다.
const ICON = {
  // 하트: 유리처럼 빛나는 붉은 하트
  heart: (u) => `<defs><radialGradient id="${u}a" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#ffb3c6"/><stop offset=".38" stop-color="#ff4d7a"/><stop offset="1" stop-color="#a80f3d"/></radialGradient><linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <path d="M52 90C22 68 10 52 10 36 10 23 20 14 32 14c8 0 15 4 20 12 5-8 12-12 20-12 12 0 22 9 22 22 0 16-12 32-42 54z" fill="#5a0822" transform="translate(0 3)" opacity=".55"/>
    <path d="M52 88C22 66 10 50 10 34 10 21 20 12 32 12c8 0 15 4 20 12 5-8 12-12 20-12 12 0 22 9 22 22 0 16-12 32-42 54z" fill="url(#${u}a)" stroke="#ffd0dc" stroke-width="1.5"/>
    <path d="M20 32c0-9 7-15 14-15 6 0 10 3 13 8-9-2-19 3-23 14-3-2-4-4-4-7z" fill="url(#${u}b)"/>
    <circle cx="74" cy="26" r="3.2" fill="#fff" opacity=".8"/>`,
  // 반지: 금 밴드와 깎인 보석
  ring: (u) => `<defs><linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b8"/><stop offset=".35" stop-color="#f2c14e"/><stop offset=".7" stop-color="#b9801a"/><stop offset="1" stop-color="#ffe08a"/></linearGradient><linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9fbff"/><stop offset=".5" stop-color="#7fd6ff"/><stop offset="1" stop-color="#2a7fd0"/></linearGradient></defs>
    <ellipse cx="52" cy="64" rx="27" ry="25" fill="none" stroke="#5c3d06" stroke-width="11" opacity=".5" transform="translate(0 3)"/>
    <ellipse cx="52" cy="64" rx="27" ry="25" fill="none" stroke="url(#${u}a)" stroke-width="10"/>
    <ellipse cx="52" cy="64" rx="27" ry="25" fill="none" stroke="#fff8d6" stroke-width="1.6" opacity=".7" stroke-dasharray="34 130" stroke-dashoffset="-104"/>
    <path d="M40 34h24l4-9H36z" fill="#c9951f"/>
    <path d="M34 22l8-12h20l8 12-18 20z" fill="url(#${u}b)" stroke="#f3fdff" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M34 22h36M42 10l4 12 6 20 6-20 4-12M46 22l6-12 6 12" fill="none" stroke="#fff" stroke-width="1" opacity=".75" stroke-linejoin="round"/>
    <path d="M78 8l1.6 4.4L84 14l-4.4 1.6L78 20l-1.6-4.4L72 14l4.4-1.6z" fill="#fff"/>`,
  // 번개: 속이 흰 금빛 번개
  bolt: (u) => `<defs><linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".45" stop-color="#ffc928"/><stop offset="1" stop-color="#ff7a18"/></linearGradient></defs>
    <path d="M60 6L22 56h22l-8 42 46-58H58z" fill="#7a3200" opacity=".55" transform="translate(2 3)"/>
    <path d="M60 6L22 56h22l-8 42 46-58H58z" fill="url(#${u}a)" stroke="#fff2a8" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M56 18L32 50h18l-6 28 26-34H52z" fill="#fffbe0" opacity=".8"/>
    <path d="M86 20l5-3M90 30h6M14 70l-6 2M18 82l-4 5" stroke="#ffe46b" stroke-width="2.4" stroke-linecap="round"/>`,
};
// 사슬 두 줄(X자)과 가운데 자물쇠. 금 간 선(crk)은 부서지기 직전에 보인다
const bindSvg = (u) => `<svg class="bind" viewBox="0 0 104 104"><defs><linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3f6fb"/><stop offset=".45" stop-color="#9aa6ba"/><stop offset="1" stop-color="#4d576b"/></linearGradient><linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".5" stop-color="#e2a52a"/><stop offset="1" stop-color="#8a5a0c"/></linearGradient></defs>
  ${[["M4 14L100 92", 0], ["M100 14L4 92", 1]].map(([d]) => `<path d="${d}" stroke="#0b0e16" stroke-width="13" stroke-linecap="round" opacity=".55"/><path d="${d}" stroke="url(#${u}s)" stroke-width="10" stroke-linecap="round" stroke-dasharray="11 6"/><path d="${d}" stroke="#1a2030" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="5 12" stroke-dashoffset="-3"/>`).join("")}
  <path d="M40 50v-9a12 12 0 0 1 24 0v9" fill="none" stroke="#0b0e16" stroke-width="9" opacity=".5"/>
  <path d="M40 50v-9a12 12 0 0 1 24 0v9" fill="none" stroke="url(#${u}s)" stroke-width="6.5" stroke-linecap="round"/>
  <rect x="31" y="48" width="42" height="34" rx="7" fill="#3a2503" transform="translate(0 2.5)" opacity=".6"/>
  <rect x="31" y="48" width="42" height="34" rx="7" fill="url(#${u}g)" stroke="#fff1c2" stroke-width="1.4"/>
  <rect x="35" y="51" width="34" height="6" rx="3" fill="#fff" opacity=".35"/>
  <circle cx="52" cy="62" r="4.6" fill="#2a1a02"/><path d="M49.6 63h4.8l1.6 11h-8z" fill="#2a1a02"/>
  <path class="crk" d="M52 48l-4 9 7 5-6 8 5 5-3 7M48 57l-11 4M55 62l13-3M49 70l-12 6M54 75l12 4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

// 파편: 자물쇠 조각(금·강철 삼각형), 사슬 고리, 불꽃. 화면 끝까지 날아가며 돌고 떨어진다
function burst(P, x, y, col, big) {
  const R = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < (big ? 46 : 34); i++) { const a = R(0, Math.PI * 2), v = R(260, 1050); P.push({ k: "tri", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 220, g: 1500, r: R(0, 6.3), vr: R(-14, 14), s: R(5, 17), c: ["#ffe9a3", "#e2a52a", "#b9801a", "#f3f6fb", "#9aa6ba", "#6b768a"][i % 6], life: R(0.9, 1.7), t: 0, sh: [R(-1, -0.3), R(0.3, 1), R(-0.2, 0.8)] }); }
  for (let i = 0; i < 14; i++) { const a = R(0, Math.PI * 2), v = R(300, 900); P.push({ k: "link", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 260, g: 1700, r: R(0, 6.3), vr: R(-18, 18), s: R(7, 11), c: "#c3ccdb", life: R(1.1, 1.9), t: 0 }); }
  for (let i = 0; i < 40; i++) { const a = R(0, Math.PI * 2), v = R(400, 1500); P.push({ k: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 500, s: R(1.2, 2.8), c: i % 3 ? "#fff6c9" : col, life: R(0.35, 0.8), t: 0 }); }
  P.push({ k: "ring", x, y, c: col, life: 0.55, t: 0 });
}
function drawP(g, p) {
  const k = p.t / p.life, al = p.k === "spark" ? 1 - k : Math.min(1, (1 - k) * 2.2);
  g.globalAlpha = Math.max(0, al);
  if (p.k === "ring") { g.strokeStyle = p.c; g.lineWidth = 5 * (1 - k) + 0.5; g.beginPath(); g.arc(p.x, p.y, 18 + k * 190, 0, 6.3); g.stroke(); return; }
  if (p.k === "spark") { g.strokeStyle = p.c; g.lineWidth = p.s; g.lineCap = "round"; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); g.stroke(); return; }
  g.save(); g.translate(p.x, p.y); g.rotate(p.r);
  if (p.k === "tri") { g.fillStyle = p.c; g.beginPath(); g.moveTo(p.sh[0] * p.s, -p.s * 0.6); g.lineTo(p.sh[1] * p.s, p.sh[2] * p.s); g.lineTo(-p.s * 0.2, p.s * 0.8); g.closePath(); g.fill(); g.strokeStyle = "#ffffff66"; g.lineWidth = 0.8; g.stroke(); }
  else { g.strokeStyle = p.c; g.lineWidth = 3.2; g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.58, 0, 0, 6.3); g.stroke(); }
  g.restore();
}
export function unlock(c, o = {}) {
  css();
  const L = [["heart", "연애·고백", "#ff5c86"], ["ring", "결혼·가족", "#f2c14e"], ["bolt", "판이 바뀌는 큰 사건", "#ffb02e"]];
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const el = document.createElement("div"); el.className = "fk-lock";
  el.innerHTML = `<div class="flash"></div><div class="row">${L.map(([k, n, col], i) => `<div class="it" style="--c:${col}"><div class="box"><div class="rays"></div><div class="aura"></div><svg class="ic" viewBox="0 0 104 104">${ICON[k]("fk" + i)}</svg><div class="leak"></div>${bindSvg("fb" + i)}<div class="blast"></div><div class="halo"></div></div>${c.esc(n)}</div>`).join("")}</div><p>${o.line || "잠겨 있던 것들이 열렸습니다."}</p><button class="fk-btn gold" style="min-width:200px">${c.esc(o.btn || "계속")}</button><canvas></canvas>`;
  document.body.appendChild(el);
  const its = [...el.querySelectorAll(".it")], cv = el.querySelector("canvas"), g = cv.getContext("2d"), flash = el.querySelector(".flash"), T = [], P = [];
  const dpr = Math.min(2, window.devicePixelRatio || 1); const fit = () => { cv.width = el.clientWidth * dpr; cv.height = el.clientHeight * dpr; }; fit();
  let last = 0, raf = 0, alive = true;
  const loop = (now) => { if (!alive) return; const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016); last = now; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += dt; if (p.t >= p.life) { P.splice(i, 1); continue; } if (p.k !== "ring") { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.r += p.vr * dt; } drawP(g, p); }
    g.globalAlpha = 1; raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const smash = (it, i, quiet) => { if (it.classList.contains("open")) return; const b = it.querySelector(".box").getBoundingClientRect(), o0 = el.getBoundingClientRect();
    it.classList.remove("shake", "crack"); it.classList.add("open");
    if (!calm) burst(P, b.left - o0.left + b.width / 2, b.top - o0.top + b.height * 0.6, L[i][2], i === L.length - 1);
    if (!quiet) { c.FX.play("shatter"); flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on"); el.classList.remove("quake"); void el.offsetWidth; el.classList.add("quake"); } };
  const fin = () => { T.forEach(clearTimeout); T.length = 0; el.classList.add("end"); };
  const STEP = 2350; // 흔들흔들(쉬이잉) 1.05초 → 금이 번짐(바사삭) 0.5초 → 깨지며 빛(파앙)
  its.forEach((it, i) => { const t0 = 600 + i * STEP;
    T.push(setTimeout(() => { it.classList.add("shake"); c.FX.play("whoosh"); }, t0));
    T.push(setTimeout(() => { it.classList.remove("shake"); it.classList.add("crack"); c.FX.play("crack"); }, t0 + 1050));
    T.push(setTimeout(() => smash(it, i), t0 + 1600)); });
  T.push(setTimeout(() => { c.FX.play("bell3"); fin(); }, 600 + its.length * STEP + 250));
  el.onclick = (e) => {
    if (e.target.closest("button") && el.classList.contains("end")) { alive = false; cancelAnimationFrame(raf); el.remove(); return o.done?.(); }
    if (!el.classList.contains("end") && !el.dataset.fast) { // 화면을 누르면 빨리 넘어가되, 남은 자물쇠는 하나씩 차례로 부서진다(대표: 한 방에 깨지지 않게)
      el.dataset.fast = "1"; T.forEach(clearTimeout); T.length = 0;
      const left = its.map((it, i) => [it, i]).filter(([it]) => !it.classList.contains("open"));
      left.forEach(([it, i], k) => T.push(setTimeout(() => { it.classList.remove("shake"); it.classList.add("crack"); c.FX.play("crack"); }, k * 620), setTimeout(() => smash(it, i), k * 620 + 300)));
      T.push(setTimeout(() => { c.FX.play("bell3"); fin(); }, left.length * 620 + 250));
    }
  };
}

// ── 특성 하나 고르기 ── ok(id)
function traitPick(c, o) {
  const S = c.S(), own = S.me.traits || [], all = c.D.TRAITS.map((t) => t.id).filter((x) => !own.includes(x));
  const T = st.tp = st.tp || { hand: c.shuffle(all).slice(0, 4), prev: null, re: 1, un: 1, sel: null };
  const mine = (d) => d === "co" || S.sj.active.includes(d);
  const card = (id) => { const t = c.D.TRAITS.find((x) => x.id === id); return `<button class="fk-c ${T.sel === id ? "on" : ""}" data-t="${id}"><b>${c.esc(t.n)}</b><i>“${c.esc(t.line)}”</i><span class="pro">＋ ${c.esc(t.pro)}</span>${t.con ? `<span class="con">− ${c.esc(t.con)}</span>` : ""}<span class="jobs">${(t.hid || []).slice().sort((a, b) => mine(b.d) - mine(a.d)).map((h) => `<span class="${mine(h.d) ? "mine" : ""} ${isNeg(h.t) ? "neg" : ""}">${mine(h.d) ? "★ " : ""}${c.esc(domN(c, h.d))} · ${c.esc(h.t)}</span>`).join("")}</span></button>`; };
  const jobs = S.sj.active.map((k) => c.D.SIDEJOBS[k]?.n).filter(Boolean).join(" · ") || "아직 없음";
  c.$app.innerHTML = `<div class="fk"><h1>${c.esc(o.title)}</h1><div class="fk-sub">${c.esc(o.sub)}<br>지금 하는 투잡: <b style="color:#f6cf6b">${c.esc(jobs)}</b> · 내 일에 닿는 영향은 ★로 표시해요</div>
    <div class="fk-cards">${T.hand.map(card).join("")}</div>
    <div class="fk-row"><button class="fk-btn" data-re ${T.re ? "" : "disabled"}>다시 돌리기 (${T.re}번 남음)</button><button class="fk-btn" data-un ${T.un && T.prev ? "" : "disabled"}>되돌리기 (${T.un}번 남음)</button></div>
    <button class="fk-btn gold" data-ok ${T.sel ? "" : "disabled"}>${c.esc(o.ok)}</button>
    <div class="fk-note">${T.sel ? `“${c.esc(c.D.TRAITS.find((x) => x.id === T.sel).n)}”를 골랐어요. 확정하면 못 바꿔요` : "카드를 눌러 고르세요. 숨겨 두던 투잡별 영향까지 전부 보여 드려요"}${o.back ? ` <button data-bk>뒤로</button>` : ""}</div></div>`;
  window.scrollTo(0, 0);
  const re = () => traitPick(c, o), $ = (q) => c.$app.querySelector(q);
  c.$app.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => { const y = window.scrollY; T.sel = b.dataset.t; re(); window.scrollTo(0, y); });
  $("[data-re]").onclick = () => { if (!T.re) return; T.re--; T.prev = T.hand; const rest = all.filter((x) => !T.hand.includes(x)); T.hand = c.shuffle(rest.length >= 4 ? rest : all).slice(0, 4); T.sel = null; re(); };
  $("[data-un]").onclick = () => { if (!T.un || !T.prev) return; T.un--; T.hand = T.prev; T.prev = null; T.sel = null; re(); };
  $("[data-ok]").onclick = () => { if (T.sel) o.done(T.sel); };
  const bk = $("[data-bk]"); if (bk) bk.onclick = () => o.back();
}

// ── 돌아갈 때: 보상 하나, 기억 하나 ──
function backPick(c) {
  const S = c.S(), g = S.gradeUp ? "S" : S.grade, pk = c.RD.pickOf(g), B = st.bp = st.bp || { r: null, m: null, trait: null };
  const top3 = Object.entries(S.st).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const RW = [["cash", "종잣돈", `현금 ${c.won(pk.cash)}`, "시작하자마자 첫 매물을 볼 수 있어요"], ["stat", "몸에 밴 것", `${top3.map((k) => c.D.STATS[k]).join(" · ")} +${pk.stat3}`, "이번 5년에 가장 많이 쓴 능력치 셋"], ["trait", "특성 하나", B.trait ? `“${c.D.TRAITS.find((x) => x.id === B.trait).n}”` : "특성 카드 4장 중 1장", "투잡별 영향을 보고 골라요"]];
  const ppl = Object.entries(S.rel || {}).filter(([id, x]) => c.E.CHAR[id] && x.aff >= 30).sort((a, b) => b[1].aff - a[1].aff).slice(0, 3);
  const jobs = S.sj.active.slice(0, Math.max(1, 4 - ppl.length));
  const MM = [...ppl.map(([id, x]) => ({ k: "p:" + id, n: c.E.CHAR[id].name, a: `호감 ${Math.round(x.aff)}`, d: "2회차 첫해에 다시 만나요. 호감이 조금 쌓인 채로 시작해요", face: c.face(id) })), ...jobs.map((k) => ({ k: "j:" + k, n: `${c.D.SIDEJOBS[k].n}의 감`, a: "5년 해 본 투잡", d: "처음부터 알고 시작해요(이해도 +10)", face: null }))];
  c.$app.innerHTML = `<div class="fk"><h1>스물일곱으로 돌아갑니다</h1><div class="fk-sub">5년의 성적 <b style="color:#f6cf6b">${g}등급</b> · 순자산 ${c.won(Math.round(c.E.netWorth(S)))}${pk.rescued ? "<br>C등급이지만 B등급 보상으로 올려 드려요(구원의 손길)" : ""}</div>
    <h2>보상 하나</h2><div class="fk-cards">${RW.map(([k, n, v, d]) => `<button class="fk-c ${B.r === k ? "on" : ""}" data-r="${k}"><b>${n}</b><span class="pro">${c.esc(v)}</span><i>${d}</i></button>`).join("")}</div>
    <h2>기억 하나</h2><div class="fk-cards">${MM.length ? MM.map((x) => `<button class="fk-c ${B.m === x.k ? "on" : ""}" data-m="${x.k}"><span class="fk-mem">${x.face ? `<img src="${x.face}" alt="">` : `<span class="ph">감</span>`}<span><b>${c.esc(x.n)}</b><br><i>${c.esc(x.a)}</i><br><span class="pro">${x.d}</span></span></span></button>`).join("") : `<div class="fk-note">들고 갈 기억이 아직 없어요. 보상만 들고 갑니다.</div>`}</div>
    <button class="fk-btn gold" data-ok ${B.r && (B.m || !MM.length) && (B.r !== "trait" || B.trait) ? "" : "disabled"}>이것만 들고 다시 시작한다</button>
    <div class="fk-note">${!B.r ? "보상과 기억을 하나씩 고르세요" : B.r === "trait" && !B.trait ? "특성 카드를 고르러 갑니다" : ""} <button data-bk>갈림길로 돌아가기</button></div></div>`;
  window.scrollTo(0, st.y || 0);
  const keep = (f) => () => { st.y = window.scrollY; f(); };
  c.$app.querySelectorAll("[data-r]").forEach((b) => b.onclick = keep(() => { B.r = b.dataset.r; if (B.r === "trait" && !B.trait) { st.tp = null; return traitPick(c, { title: "들고 갈 특성 하나", sub: "2회차를 시작할 때 이 특성을 하나 더 갖고 시작해요.", ok: "이 특성을 들고 간다", done: (id) => { B.trait = id; backPick(c); }, back: () => { B.r = null; backPick(c); } }); } backPick(c); }));
  c.$app.querySelectorAll("[data-m]").forEach((b) => b.onclick = keep(() => { B.m = b.dataset.m; backPick(c); }));
  c.$app.querySelector("[data-bk]").onclick = () => { st = { step: "ask" }; render(c); };
  c.$app.querySelector("[data-ok]").onclick = () => {
    const pick = { grade: g, reward: B.r, statKeys: B.r === "stat" ? top3 : null, trait: B.r === "trait" ? B.trait : null, memP: B.m?.startsWith("p:") ? B.m.slice(2) : null, memJ: B.m?.startsWith("j:") ? B.m.slice(2) : null };
    if (!c.E.forkBack(S, pick)) return; st = null; c.save(true); c.render();
  };
}

// ── 갈림길 ──
export function render(c) {
  css(); const S = c.S(); st = st || { step: "ask" };
  if (st.step === "back") return backPick(c);
  if (st.step === "trait") return traitPick(c, { title: "5년을 버틴 사람에게", sub: "특성 하나를 얻습니다.", ok: "이 특성으로 이어 간다", back: () => { st = { step: "ask" }; render(c); }, done: (id) => {
    if (!c.E.forkContinue(S)) return; c.E.addTrait(S, id); const cr = c.E.forkCrush(S); st = null; c.save(true);
    unlock(c, { btn: "이 인생을 이어 간다", line: `잠겨 있던 것들이 열렸습니다.${cr ? `<br><b style="color:#f6cf6b">${c.esc(c.E.CHAR[cr].name)}</b>에게 하지 못한 말이 있다.` : ""}`, done: () => c.render() });
    c.$app.innerHTML = `<div class="fk"></div>`;
  } });
  const nw = Math.round(c.E.netWorth(S)), g = S.gradeUp ? "S" : S.grade;
  c.$app.innerHTML = `<div class="fk"><div class="fk-sub" style="margin-top:8px;letter-spacing:.12em">${c.E.ageNow(S)}세 · 만 5년</div><h1>이제, 게임을 익히셨나요?</h1>
    <div class="fk-sub">현재까지의 5년을 들고 고릅니다.<br>어느 쪽을 골라도 잠겨 있던 연애·결혼·큰 사건이 열립니다.</div>
    <div class="fk-kv"><div><div class="k">순자산</div><div class="v" style="color:#f6cf6b">${c.won(nw)}</div></div><div><div class="k">5년 등급</div><div class="v">${g}</div></div><div><div class="k">투잡</div><div class="v">${S.sj.active.length}개</div></div><div><div class="k">인연</div><div class="v">${Object.keys(S.rel || {}).length}명</div></div></div>
    <div class="fk-sub" style="font-size:11.5px">등급 기준: ${c.RD.RD.grades.map(([k, v]) => `${k} ${v / 10000}억`).join(" · ")}</div>
    <button class="fk-big gold" data-go="cont"><b>이 인생을 이어 간다</b><span>지금 가진 것 그대로 50세까지. 5년을 버틴 보상으로 특성 하나를 골라 얻습니다.</span></button>
    <button class="fk-big" data-go="back"><b>특전을 받고 다시 시작한다</b><span>보상 하나와 기억 하나를 들고 27세로. 2회차는 처음부터 전부 열려 있습니다.</span></button>
    <div class="fk-note" data-slot>고르기 전의 이 시점을 다른 저장 칸에 남기는 중…</div></div>`;
  window.scrollTo(0, 0);
  c.$app.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { st = { step: b.dataset.go === "cont" ? "trait" : "back" }; render(c); });
  slotNote(c);
}
// 고르기 직전 상태를 다른 칸에 남긴다(대표 결정: 남김. 빈 칸이 없으면 묻는다)
async function slotNote(c) {
  const S = c.S(), box = () => c.$app.querySelector("[data-slot]"), put = (h) => { const b = box(); if (b) b.innerHTML = h; };
  if (S.forkSlot) return put(`고르기 전의 이 시점을 <b>저장 칸 ${S.forkSlot}</b>에 남겨 뒀어요. 나중에 다른 길도 해 볼 수 있어요.`);
  let L = []; try { L = await c.ST.list(); } catch (e) {}
  const cur = c.SLOT(), free = L.find((x) => x.empty && +x.slot !== cur), others = L.filter((x) => !x.empty && +x.slot !== cur);
  const copy = (n) => { c.ST.save(n, c.E.save(S), c.summary(), true); S.forkSlot = n; c.save(true); slotNote(c); };
  if (free) return copy(+free.slot);
  if (!others.length) return put("남는 저장 칸이 없어 이 시점은 따로 남지 않아요.");
  put(`빈 저장 칸이 없어요. 이 시점을 남기려면 덮어쓸 칸을 고르세요: ${others.map((x) => `<button data-ow="${x.slot}">칸 ${x.slot}${x.summary?.name ? ` (${c.esc(x.summary.name)} ${c.esc(String(x.summary.age ?? ""))}세)` : ""}</button>`).join(" ")}<br>안 남겨도 고를 수 있어요.`);
  box()?.querySelectorAll("[data-ow]").forEach((b) => b.onclick = () => { if (b.dataset.sure) return copy(+b.dataset.ow); b.dataset.sure = "1"; b.textContent = `칸 ${b.dataset.ow}을 덮어쓸까요? 한 번 더 누르면 덮어써요`; });
}
