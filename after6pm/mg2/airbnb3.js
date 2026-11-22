// 미니게임 3탄: 에어씨앤씨 — 인간 내비게이션
// 위에서 본 동네 지도(골목·큰길·지하철역·버스 정류장·편의점·공사장·계단 언덕·일방통행·비 오는 골목)를 기기 해상도 벡터로 그린다.
// 손님은 캐릭터 그림 얼굴 배지(표정: 기다림·재촉·계단·비·도착·택시)로 지도 위를 걷는다. 그림을 못 받으면 작은 도트로 대신.
// 캐리어 끄는 외국인 손님이 역·정류장에서 "Where is it?" 하고 전화하면, 손님을 꾹 눌러 골목을 따라 숙소 핀까지 길을 그린다.
// 손님은 그린 길을 그대로 걷는다. 공사장은 못 지나가고, 계단(느리고 지침)·비 오는 골목·일방통행 역방향·먼 길은 감점.
// 손님 3명이 차례로(겹쳐서도) 온다. 도착하면 현관 번호키 '띠리릭' + Thank you! 하트, 마지막은 손님 후기 말풍선.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uOutline } from "../mg.js";

const W = 160, H = 224, XS = [14, 47, 80, 113, 146], YS = [16, 46, 76, 106, 136, 166, 196], NG = 3, MAIN = 3, WALK = 34;
const hwR = (r) => (r === MAIN ? 6 : 4), HWV = 4;
const sh = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const mkC = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function spr(w, h, fn, outline = false) {
  const c = mkC(w + 2, h + 2), g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); }, g);
  if (outline) uOutline(c); return c;
}
const CALLS = [
  { a: "Where is it?", b: "Hello?? Where is it?!", thx: "Thank you!", lost: "I'll take a taxi…" },
  { a: "¿Dónde está?", b: "¿Hola? ¿¡Dónde está!?", thx: "¡Gracias!", lost: "Tomo un taxi…" },
  { a: "どこですか？", b: "もしもし？どこですか！", thx: "ありがとう!", lost: "タクシーで行きます…" },
  { a: "C'est où ?", b: "Allô ? C'est où ?!", thx: "Merci !", lost: "Je prends un taxi…" },
  { a: "Wo ist es?", b: "Hallo?? Wo ist es?!", thx: "Danke!", lost: "Ich nehme ein Taxi…" },
];

// ── 손님(작은 도트, 9x15) ──
const G_SKIN = ["#f7d9c4", "#f0c8a8", "#e2b48e", "#c48a60", "#9a6440", "#6e4630"];
const G_HAIR = ["#f0d878", "#e0b850", "#c8642a", "#8a4a22", "#5a3a22", "#2a2018", "#1b1b22", "#d8d8d8"];
const G_SHIRT = ["#e04848", "#3a7bd5", "#3fae6a", "#f0b030", "#8a5fc0", "#f4f4f4", "#ff8fb0", "#2fb0c0", "#f07a30", "#2f3d5c"];
const G_PANTS = ["#2c3550", "#3a3a42", "#c8b088", "#1f2a3a", "#6b6f78", "#4a6a8a"];
const G_BAG = ["#ff5a7a", "#3a9bf0", "#ffd23f", "#3fbf7a", "#a070e0", "#f08a30"];
function gSpec(bag) {
  const shirt = pick(G_SHIRT);
  return { skin: pick(G_SKIN), hair: pick(G_HAIR), style: pick(["short", "long", "bob", "bun", "short"]), hat: rnd() < 0.4 ? pick(["cap", "sun"]) : null, hatC: pick(["#e04848", "#2f3d5c", "#f4f4f4", "#3fae6a", "#f0b030"]), shirt, shirt2: sh(shirt, 0.78), pants: pick(G_PANTS), shoe: pick(["#222222", "#f4f4f4", "#8a5a3a", "#3a3a3a"]), bag: bag || pick(G_BAG), glasses: rnd() < 0.2 };
}
// v: f 앞 / b 뒤 / s 옆(오른쪽), f: 걸음 0~3, o.phone: 전화 중
function gPaint(P0, s, v, f, o = {}) {
  const P = (x, y, w, h, c) => P0(x, y + 1, w, h, c), sk = s.skin, hc = s.hair, straw = "#ead08a";
  if (v === "s") {
    const a = f === 1 ? [2, 5] : f === 3 ? [5, 2] : [3, 4];
    P(a[0], 10, 2, 3, sh(s.pants, 0.78)); P(a[0], 13, 3, 1, sh(s.shoe, 0.8));
    P(a[1], 10, 2, 3, s.pants); P(a[1], 13, 3, 1, s.shoe);
    P(3, 6, 4, 4, s.shirt); P(3, 9, 4, 1, s.shirt2); P(2, 7, 1, 2, s.shirt2); P(1, 9, 1, 1, sk);
    P(3, 1, 5, 5, sk); P(8, 3, 1, 1, sk); P(6, 3, 1, 1, "#222");
    if (s.glasses) { P(5, 3, 3, 1, "#333"); P(6, 3, 1, 1, "#9cf"); }
    if (s.style === "long") P(2, 1, 2, 6, hc); else if (s.style === "bob") P(2, 1, 2, 4, hc);
    P(3, 0, 5, 2, hc); P(3, 2, 2, 2, hc); if (s.style === "bun") P(1, 0, 2, 2, hc);
    if (s.hat === "cap") { P(3, 0, 5, 2, s.hatC); P(7, 1, 2, 1, sh(s.hatC, 0.7)); }
    if (s.hat === "sun") { P(1, 1, 8, 1, straw); P(3, -1, 5, 2, straw); P(3, 0, 5, 1, s.hatC); }
    return;
  }
  const back = v === "b", l = f === 1 ? -1 : 0, r = f === 3 ? -1 : 0, sw = f === 1 ? 1 : f === 3 ? -1 : 0;
  P(2, 10, 2, 3 + l, s.pants); P(2, 13 + l, 2, 1, s.shoe); P(5, 10, 2, 3 + r, s.pants); P(5, 13 + r, 2, 1, s.shoe);
  P(2, 6, 5, 4, s.shirt); P(2, 9, 5, 1, s.shirt2);
  P(1, 6, 1, 3 + sw, s.shirt2); P(1, 9 + sw, 1, 1, sk);
  if (!o.phone) { P(7, 6, 1, 3 - sw, s.shirt2); P(7, 9 - sw, 1, 1, sk); }
  if (back) {
    P(2, 1, 5, 5, hc); P(3, 5, 3, 1, sk);
    if (s.style === "long") P(2, 6, 5, 3, hc); if (s.style === "bun") P(3, -1, 3, 2, hc);
  } else {
    P(2, 1, 5, 5, sk); P(2, 0, 5, 2, hc); P(2, 2, 1, 1, hc); P(6, 2, 1, 1, hc);
    if (s.style === "long") { P(1, 1, 1, 6, hc); P(7, 1, 1, 6, hc); } else if (s.style === "bob") { P(1, 1, 1, 4, hc); P(7, 1, 1, 4, hc); } else if (s.style === "bun") P(3, -1, 3, 1, hc);
    P(3, 3, 1, 1, "#222"); P(5, 3, 1, 1, "#222"); P(4, 5, 1, 1, sh(sk, 0.78));
    if (s.glasses) { P(2, 3, 5, 1, "#333"); P(3, 3, 1, 1, "#9cf"); P(5, 3, 1, 1, "#9cf"); }
  }
  if (s.hat === "cap") { P(2, 0, 5, 2, s.hatC); if (!back) P(2, 2, 5, 1, sh(s.hatC, 0.7)); }
  if (s.hat === "sun") { P(0, 1, 9, 1, straw); P(2, -1, 5, 2, straw); P(2, 0, 5, 1, s.hatC); }
  if (o.phone && !back) { P(7, 3, 1, 4, s.shirt2); P(7, 2, 1, 2, "#2a2a34"); P(7, 2, 1, 1, "#9fe0ff"); }
}
const gSprite = (gu, v, f, o = {}, flip = false) => {
  const k = v + f + (o.phone ? "p" : "") + (flip ? "l" : "");
  if (gu.cache[k]) return gu.cache[k];
  const c = mkC(11, 17), g = c.getContext("2d");
  if (flip) { g.translate(11, 0); g.scale(-1, 1); }
  gPaint((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, w, h); }, gu.spec, v, f, o);
  g.setTransform(1, 0, 0, 1, 0, 0); uOutline(c);
  return (gu.cache[k] = c);
};
// 캐리어(바닥 가운데 기준). pulled: 손잡이 대신 손까지 줄
const bagP = (P, x, y, c, handle = true) => {
  P(x - 3, y - 8, 7, 8, "#12131c"); P(x - 2, y - 7, 5, 6, c); P(x - 2, y - 7, 5, 1, sh(c, 1.25)); P(x + 2, y - 6, 1, 5, sh(c, 0.72));
  P(x - 1, y - 5, 3, 1, sh(c, 0.82)); P(x - 1, y - 3, 3, 1, sh(c, 0.82)); P(x - 1, y - 6, 1, 1, "#ffffff");
  P(x - 2, y, 1, 1, "#222"); P(x + 2, y, 1, 1, "#222");
  if (handle) { P(x, y - 10, 1, 2, "#6a6e78"); P(x - 1, y - 11, 3, 1, "#3a3e48"); }
};
const dline = (P, x1, y1, x2, y2, c) => { const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) || 1; for (let i = 0; i <= n; i++) P(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), 1, 1, c); };
// 도트 손가락(할 일 안내). down=true 면 위에서 아래로 가리킨다
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = mkC(13, 13), g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
// ── 벡터 그리기 도구(장면 단위 좌표, 캔버스 쪽에서 기기 해상도로 키운다) ──
const TAU = Math.PI * 2;
const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const fRR = (g, x, y, w, h, r, c) => { rr(g, x, y, w, h, r); g.fillStyle = c; g.fill(); };
const lgr = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const circ = (g, x, y, r, c) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); };
const treeV = (g, x, y, r) => { circ(g, x + r * 0.3, y + r * 0.45, r, "rgba(20,40,10,.28)"); circ(g, x, y, r, "#2f7a3e"); circ(g, x - r * 0.14, y - r * 0.14, r * 0.8, "#469a52"); circ(g, x - r * 0.32, y - r * 0.36, r * 0.42, "#7cc874"); circ(g, x - r * 0.42, y - r * 0.46, r * 0.16, "#b4ea9e"); };
// 하트(위 가운데 x,y · 크기 s)
const heartV = (g, x, y, s, c) => { g.beginPath(); g.moveTo(x, y + s * 0.3); g.bezierCurveTo(x, y - s * 0.1, x - s * 0.55, y - s * 0.12, x - s * 0.55, y + s * 0.28); g.bezierCurveTo(x - s * 0.55, y + s * 0.6, x - s * 0.15, y + s * 0.72, x, y + s); g.bezierCurveTo(x + s * 0.15, y + s * 0.72, x + s * 0.55, y + s * 0.6, x + s * 0.55, y + s * 0.28); g.bezierCurveTo(x + s * 0.55, y - s * 0.12, x, y - s * 0.1, x, y + s * 0.3); g.closePath(); g.fillStyle = c; g.fill(); };
// 지도 핀(끝이 x,y)
const pinV = (g, x, y, s = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(0.6, 0.4, 2.6, 0.9, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-1.6, -3.2, -4.6, -4.6, -4.6, -7.6); g.arc(0, -7.6, 4.6, Math.PI, 0); g.bezierCurveTo(4.6, -4.6, 1.6, -3.2, 0, 0); g.closePath();
  g.fillStyle = lgr(g, -4, -12, 4, 0, [[0, "#ff8fa8"], [0.55, "#ff4a6e"], [1, "#c8244a"]]); g.fill(); g.lineWidth = 0.6; g.strokeStyle = "#7a1430"; g.stroke();
  heartV(g, 0, -9.6, 4.2, "#ffffff");
  g.beginPath(); g.arc(-1.8, -9.6, 1.1, 0, TAU); g.fillStyle = "rgba(255,255,255,.45)"; g.fill();
  g.restore();
};
// 캐리어(바닥 가운데 x,y)
const bagV = (g, x, y, c, handle = true) => {
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(x + 0.4, y + 0.3, 3.2, 0.8, 0, 0, TAU); g.fill();
  if (handle) { g.strokeStyle = "#4a4e58"; g.lineWidth = 0.55; g.beginPath(); g.moveTo(x - 1.2, y - 7.4); g.lineTo(x - 1.2, y - 10.2); g.lineTo(x + 1.2, y - 10.2); g.lineTo(x + 1.2, y - 7.4); g.stroke(); }
  rr(g, x - 3, y - 7.8, 6, 7.2, 1.2); g.fillStyle = lgr(g, x - 3, 0, x + 3, 0, [[0, sh(c, 1.2)], [0.6, c], [1, sh(c, 0.72)]]); g.fill(); g.lineWidth = 0.45; g.strokeStyle = sh(c, 0.5); g.stroke();
  g.strokeStyle = sh(c, 0.78); g.lineWidth = 0.4; for (const dx of [-1.2, 1.2]) { g.beginPath(); g.moveTo(x + dx, y - 7.2); g.lineTo(x + dx, y - 1.2); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(x - 2.4, y - 7.2, 0.6, 3);
  circ(g, x - 2, y - 0.3, 0.6, "#222"); circ(g, x + 2, y - 0.3, 0.6, "#222");
};
const roofDeco = (g, x, y, w, h, col, R) => {
  rr(g, x + 1.6, y + 1.6, w - 3.2, h - 3.2, 1.2); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 0.5; g.stroke();
  if (R(1) < 0.65) { const tx = x + 5 + Math.floor(R(2) * Math.max(1, w - 12)), ty = y + 5.2; circ(g, tx + 0.7, ty + 0.8, 2.8, "rgba(0,0,0,.2)"); circ(g, tx, ty, 2.8, "#2a5aa8"); circ(g, tx, ty, 2.2, "#3f86dd"); circ(g, tx - 0.8, ty - 0.8, 0.8, "#b6dcff"); }
  const n = 1 + Math.floor(R(3) * 2); for (let k = 0; k < n; k++) { const ax = x + w - 7 - k * 5, ay = y + h - 6; if (ax < x + 2) break; fRR(g, ax + 0.4, ay + 0.5, 4, 3.4, 0.6, "rgba(0,0,0,.18)"); fRR(g, ax, ay, 4, 3.4, 0.6, "#eceef2"); circ(g, ax + 2, ay + 1.6, 1.1, "#9aa0aa"); circ(g, ax + 2, ay + 1.6, 0.4, "#555a64"); }
  if (R(4) < 0.5 && w > 15 && h > 12) { const hx = x + 3, hy = y + h - 8; fRR(g, hx, hy, 6, 5, 0.8, sh(col, 0.72)); fRR(g, hx + 0.5, hy + 0.5, 5, 1, 0.4, sh(col, 1.12)); fRR(g, hx + 2, hy + 2.6, 2, 2.4, 0.3, "#5a4030"); }
  if (R(5) < 0.55) for (let k = 0; k < 3; k++) circ(g, x + w - 4.5 - k * 2, y + 3.5 + (k % 2), 0.75, k % 2 ? "#3fae5a" : "#ff7a9a");
  if (R(6) < 0.35 && w > 14) { g.strokeStyle = "#c8c8d0"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x + 3, y + h - 4); g.lineTo(x + w - 9, y + h - 4); g.stroke(); for (let k = 0; k < (w - 12) / 3; k++) fRR(g, x + 3.6 + k * 3, y + h - 4, 1.8, 1.6, 0.3, ["#ff8fb0", "#4fc3f7", "#ffffff", "#ffd23f"][k % 4]); }
};
// ── 건물(한 칸) ──
const ROOF_C = ["#6aa86e", "#6aa86e", "#5f9e8a", "#c8644a", "#9aa0aa", "#d8b47a", "#7a8fb0", "#b8a0b8"];
function paintCellV(g, cl, x, y, w, h) {
  if (w < 3 || h < 3) return;
  const R = (n) => { const v = Math.sin(cl.seed * 91.7 + n * 13.37) * 43758.5453; return v - Math.floor(v); };
  const roof = (col, deco = true) => {
    fRR(g, x + 1.1, y + 1.4, w, h, 2, "rgba(40,30,20,.26)");
    rr(g, x, y, w, h, 2); g.fillStyle = lgr(g, x, y, x + w * 0.35, y + h, [[0, sh(col, 1.16)], [1, sh(col, 0.84)]]); g.fill();
    g.lineWidth = 0.5; g.strokeStyle = sh(col, 0.58); g.stroke();
    if (deco && w >= 11 && h >= 9) roofDeco(g, x, y, w, h, col, R);
  };
  if (cl.type === "roof") return roof(cl.col);
  if (cl.type === "park" || cl.type === "hill") {
    const gC = cl.type === "hill" ? "#8cc06c" : "#7cc068";
    rr(g, x, y, w, h, 2); g.fillStyle = lgr(g, x, y, x, y + h, [[0, sh(gC, 1.08)], [1, sh(gC, 0.92)]]); g.fill();
    g.save(); rr(g, x, y, w, h, 2); g.clip();
    for (let k = 0; k < (w * h) / 40; k++) { g.fillStyle = k % 2 ? "rgba(255,255,255,.12)" : "rgba(30,70,20,.12)"; g.beginPath(); g.ellipse(x + R(10 + k) * w, y + R(60 + k) * h, 1.6, 0.8, 0, 0, TAU); g.fill(); }
    if (cl.type === "hill") { g.strokeStyle = "rgba(60,100,40,.35)"; g.lineWidth = 0.5; for (let yy = y + 2; yy < y + h; yy += 3) { g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + w / 2, yy - 1.6, x + w, yy); g.stroke(); } }
    else if (h > 8) { g.strokeStyle = "#e4d3a4"; g.lineWidth = 1.6; g.lineCap = "round"; g.beginPath(); g.moveTo(x - 1, y + h * 0.6); g.bezierCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.6, y + h * 0.8, x + w + 1, y + h * 0.45); g.stroke(); }
    g.restore();
    const nt = Math.max(1, Math.floor((w * h) / 150));
    for (let k = 0; k < nt; k++) treeV(g, x + 4 + R(20 + k) * Math.max(1, w - 8), y + 4 + R(30 + k) * Math.max(1, h - 8), 3.2);
    if (cl.type === "park" && w > 12) { fRR(g, x + w - 7.5, y + h - 4.4, 5, 1.6, 0.5, "#b07a4a"); fRR(g, x + w - 7, y + h - 2.6, 0.6, 1.2, 0.2, "#6a4a30"); fRR(g, x + w - 3.6, y + h - 2.6, 0.6, 1.2, 0.2, "#6a4a30"); }
    return;
  }
  if (cl.type === "store") {
    fRR(g, x + 1.1, y + 1.4, w, h, 1.6, "rgba(40,30,20,.24)");
    rr(g, x, y, w, h, 1.6); g.fillStyle = lgr(g, x, y, x, y + h, [[0, "#ffffff"], [1, "#dfe3e8"]]); g.fill(); g.lineWidth = 0.5; g.strokeStyle = "#5a6270"; g.stroke();
    fRR(g, x + 1, y + 1.6, w - 2, 2.4, 0.6, "#2fb08a"); circ(g, x + 3.4, y + 2.8, 0.8, "#ffd23f");
    for (let k = 0; k < 3; k++) fRR(g, x + 3 + k * 5, y + 6, 3.4, 2.2, 0.4, "#b8d8ea");
    g.save(); rr(g, x, y, w, h, 1.6); g.clip(); for (let xx = x; xx < x + w; xx += 4) { g.fillStyle = "#2fb08a"; g.fillRect(xx, y + h - 3.4, 2, 3.4); g.fillStyle = "#ffffff"; g.fillRect(xx + 2, y + h - 3.4, 2, 3.4); }
    g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(x, y + h - 3.6, w, 0.4); g.restore();
    return;
  }
  if (cl.type === "cafe") {
    roof("#a8744a", false);
    if (h > 12) for (let k = 0; k < Math.floor((w - 2) / 8); k++) { const ux = x + 4.5 + k * 8, uy = y + h - 4.5, c1 = k % 2 ? "#3a9bf0" : "#e04848"; circ(g, ux + 0.8, uy + 0.9, 3, "rgba(0,0,0,.22)"); for (let s = 0; s < 8; s++) { g.beginPath(); g.moveTo(ux, uy); g.arc(ux, uy, 3, (s * TAU) / 8, ((s + 1) * TAU) / 8); g.closePath(); g.fillStyle = s % 2 ? "#ffffff" : c1; g.fill(); } circ(g, ux, uy, 0.5, "#5a4030"); }
    if (w > 10) { for (let k = 0; k < 2; k++) circ(g, x + 4 + k * 5, y + 4, 1.3, "#f6e8d0"); }
    return;
  }
  if (cl.type === "park2" || cl.type === "parking") {
    rr(g, x, y, w, h, 1.4); g.fillStyle = "#7d808a"; g.fill(); g.strokeStyle = "#9a9da6"; g.lineWidth = 0.5; g.stroke();
    g.strokeStyle = "#eeeeee"; g.lineWidth = 0.4; for (let xx = x + 1.5; xx < x + w - 1; xx += 7) { g.beginPath(); g.moveTo(xx, y + 1); g.lineTo(xx, y + Math.min(9, h - 1)); g.stroke(); }
    for (let k = 0; k < 2; k++) { if (R(40 + k) < 0.35) continue; const cx = x + 3.2 + k * 7; if (cx + 5 > x + w) break; const c = ["#e04848", "#f4f4f4", "#3a7bd5", "#2a2a34"][Math.floor(R(50 + k) * 4)]; carTop(g, cx + 2, y + 6, 0, c, true); }
    return;
  }
  roof(cl.col || "#9aa0aa");
}
// 위에서 본 차(가운데 x,y · 방향 d: 1 오른쪽, -1 왼쪽, 0 세로)
function carTop(g, x, y, d, c, park) {
  g.save(); g.translate(x, y); if (!d) g.rotate(Math.PI / 2); else if (d < 0) g.rotate(Math.PI);
  fRR(g, -4.6, -2.1, 9.6, 4.8, 1.6, "rgba(0,0,0,.28)");
  rr(g, -5, -2.5, 10, 5, 1.7); g.fillStyle = lgr(g, 0, -2.5, 0, 2.5, [[0, sh(c, 1.22)], [0.5, c], [1, sh(c, 0.72)]]); g.fill(); g.lineWidth = 0.4; g.strokeStyle = "#15161e"; g.stroke();
  fRR(g, 0.8, -1.9, 2, 3.8, 0.6, "#9fd0e8"); fRR(g, -3.6, -1.7, 1.5, 3.4, 0.5, "#7fb0c8"); fRR(g, -1.8, -1.9, 2.4, 3.8, 0.5, sh(c, 1.08));
  if (!park) { circ(g, 5, -1.6, 0.55, "#fff6b0"); circ(g, 5, 1.6, 0.55, "#fff6b0"); circ(g, -5, -1.6, 0.45, "#ff4a4a"); circ(g, -5, 1.6, 0.45, "#ff4a4a"); }
  g.restore();
}
// 숙소(하늘색 지붕 + 현관 번호키)
function houseV(g, x, y, w, h, open) {
  rr(g, x, y, w, h, 2); g.fillStyle = lgr(g, x, y, x, y + h, [[0, "#a8dc88"], [1, "#86c46c"]]); g.fill();
  for (let k = 1.5; k < w - 1; k += 3) circ(g, x + k, y + h - 1.6, 0.7, k % 2 > 1 ? "#ff8fb0" : "#ffd23f");
  const rx = x + 1, ry = y, rw = w - 2, rh = h - 7, half = rh / 2;
  fRR(g, rx + 1, ry + 1.2, rw, rh, 1.4, "rgba(0,0,0,.28)");
  rr(g, rx, ry, rw, rh, 1.4); g.fillStyle = lgr(g, 0, ry, 0, ry + rh, [[0, "#9ae6ff"], [0.49, "#6ccaf2"], [0.51, "#3aa8e0"], [1, "#2a88c0"]]); g.fill(); g.lineWidth = 0.6; g.strokeStyle = "#14506e"; g.stroke();
  g.strokeStyle = "rgba(20,80,110,.35)"; g.lineWidth = 0.35; for (let yy = ry + 2; yy < ry + rh - 1; yy += 2) { if (Math.abs(yy - (ry + half)) < 0.8) continue; g.beginPath(); g.moveTo(rx + 1, yy); g.lineTo(rx + rw - 1, yy); g.stroke(); }
  g.strokeStyle = "#e8f8ff"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(rx + 0.6, ry + half); g.lineTo(rx + rw - 0.6, ry + half); g.stroke();
  fRR(g, rx + rw - 6, ry + 1, 3, 4, 0.5, "#c8644a"); fRR(g, rx + rw - 6, ry + 1, 3, 1, 0.4, "#e08a6a");
  const fy = ry + rh, cx = x + w / 2;
  fRR(g, rx, fy, rw, 4.2, 0.6, "#f6eedc"); g.fillStyle = "#c8bca0"; g.fillRect(rx, fy + 3.6, rw, 0.6);
  fRR(g, rx + 2, fy + 1, 3.2, 2, 0.4, "#9fd8f4"); fRR(g, rx + rw - 5.2, fy + 1, 3.2, 2, 0.4, "#9fd8f4");
  if (open) { fRR(g, cx - 2, fy + 0.3, 4, 3.8, 0.4, "#3a2a20"); g.fillStyle = "rgba(255,220,150,.55)"; g.fillRect(cx - 1.6, fy + 0.6, 3.2, 3.2); }
  else { fRR(g, cx - 2, fy + 0.3, 4, 3.8, 0.4, "#8a5a3a"); g.fillStyle = "#a8744a"; g.fillRect(cx - 2, fy + 0.3, 4, 0.7); circ(g, cx + 1.2, fy + 2.3, 0.4, "#ffd23f"); }
  fRR(g, cx + 2.6, fy + 0.4, 1, 2.6, 0.3, "#2a2a34"); circ(g, cx + 3.1, fy + 1.1, 0.25, open ? "#3fe07a" : "#ff5a5a");
}
// 얼굴 배지(캐릭터 그림 3x2 표정 시트)
const GUEST_KEYS = ["c001", "c002", "c008", "c009", "c010", "c012", "c022", "c024", "c034", "c039", "c042", "c047", "c051", "c053", "c054", "c055", "c057", "c060", "c068", "c069", "c072", "c074", "c079", "c084", "c098", "c103", "c105"];
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const FACE = [54, 12, 132];
const faceSrc = (ex) => { const i = EXI[ex] || 0; return [(i % 3) * 240 + FACE[0], (i >= 3 ? 540 : 0) + FACE[1], FACE[2]]; };
const IMGS = {};
const loadImg = (k) => { if (IMGS[k] && !IMGS[k].fail) return IMGS[k]; const r = { ok: false, fail: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.onerror = () => (r.fail = true); r.im.src = "img/body/" + k + ".webp"; return (IMGS[k] = r); };
const faceCss = (k, ex, px) => { const [sx, sy, s] = faceSrc(ex), f = px / s; return `background-image:url('img/body/${k}.webp');background-size:${(720 * f).toFixed(1)}px ${(1080 * f).toFixed(1)}px;background-position:${(-sx * f).toFixed(1)}px ${(-sy * f).toFixed(1)}px;background-repeat:no-repeat;background-color:#e9eef6`; };
// 고해상도 작은 그림(장면 w x h 를 s 배로)
const hiC = (w, h, s, fn) => { const c = mkC(Math.round(w * s), Math.round(h * s)), g = c.getContext("2d"); g.scale(s, s); fn(g); return c; };
const phoneC = () => hiC(14, 14, 4, (g) => {
  rr(g, 3, 1, 8, 12.2, 1.6); g.fillStyle = "#1e2230"; g.fill();
  rr(g, 3.8, 2, 6.4, 9, 0.8); g.fillStyle = lgr(g, 0, 2, 0, 11, [[0, "#8fe0ff"], [1, "#2f9fd8"]]); g.fill();
  heartV(g, 7, 4.6, 3.4, "#ffffff"); heartV(g, 7, 5.2, 2.2, "#ff5a7a");
  fRR(g, 6, 11.5, 2, 0.6, 0.3, "#5a6070");
  g.strokeStyle = "#ffd23f"; g.lineWidth = 0.8; g.lineCap = "round"; for (const [cx, a] of [[2.2, Math.PI], [11.8, 0]]) { g.beginPath(); g.arc(cx, 4, 1.4, a - 0.7, a + 0.7); g.stroke(); g.beginPath(); g.arc(cx, 4, 2.6, a - 0.6, a + 0.6); g.stroke(); }
});
let PHONE_URL = null;
const phoneURL = () => PHONE_URL || (PHONE_URL = phoneC().toDataURL());
const starPath = (g, x, y, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr2 = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); };
const STAR_URL = {};
const starURL = (on) => STAR_URL[on] || (STAR_URL[on] = hiC(9, 8, 5, (g) => { starPath(g, 4.5, 4.4, 4.2); g.fillStyle = on ? lgr(g, 0, 0, 0, 8, [[0, "#fff3b0"], [0.5, "#ffd166"], [1, "#f0a830"]]) : "#5a5f78"; g.fill(); g.lineWidth = 0.5; g.strokeStyle = on ? "#b87818" : "#3a3e52"; g.stroke(); }).toDataURL());

const barV = (g, x, y, w, h) => { fRR(g, x, y, w, h, 0.4, "#1e1e24"); g.save(); rr(g, x + 0.3, y + 0.3, w - 0.6, h - 0.6, 0.3); g.clip(); g.fillStyle = "#ffffff"; g.fillRect(x, y, w, h); g.strokeStyle = "#ff7a1e"; g.lineWidth = 0.9; for (let k = -h - w; k < w + h; k += 2) { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + k + w + h, y + w + h); g.stroke(); } g.restore(); };
const coneV = (g, x, y) => { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(x + 0.4, y + 0.2, 2, 0.6, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x, y - 3.4); g.lineTo(x + 1.5, y - 0.2); g.lineTo(x - 1.5, y - 0.2); g.closePath(); g.fillStyle = "#ff7a1e"; g.fill(); g.fillStyle = "#ffffff"; g.fillRect(x - 0.85, y - 1.9, 1.7, 0.6); fRR(g, x - 2, y - 0.4, 4, 0.8, 0.3, "#c8501a"); };
const workV = (g, x, y, w, h, hor) => {
  fRR(g, x, y, w, h, 0.8, "#7a5a3a");
  for (let k = 0; k < (w * h) / 8; k++) circ(g, x + ((k * 7.3) % w), y + ((k * 5.1) % h), 0.35, k % 3 ? "#5a4028" : "#a07a50");
  if (hor) { barV(g, x + 1.5, y, 2, h); barV(g, x + w - 3.5, y, 2, h); } else { barV(g, x, y + 1.5, w, 2); barV(g, x, y + h - 3.5, w, 2); }
  const cx = x + w / 2, cy = y + h / 2; g.fillStyle = "#3a2a1a"; g.beginPath(); g.ellipse(cx, cy, 2.6, 2, 0, 0, TAU); g.fill(); g.fillStyle = "#1a120a"; g.beginPath(); g.ellipse(cx, cy + 0.3, 1.8, 1.3, 0, 0, TAU); g.fill();
  coneV(g, cx + (hor ? 3.6 : 2.6), cy + (hor ? 2.8 : 3.4));
};
const rainV = (g, x, y, w, h) => { fRR(g, x, y, w, h, 1, "#5b6878"); for (let k = 0; k < 3; k++) { const px = x + 3 + ((k * 0.37 + 0.1) % 1) * (w - 6), py = y + 2 + ((k * 0.29 + 0.2) % 1) * (h - 4); g.fillStyle = "#7e9ab8"; g.beginPath(); g.ellipse(px, py, 2.8, 1.3, 0, 0, TAU); g.fill(); g.fillStyle = "#c4dcf4"; g.beginPath(); g.ellipse(px - 0.8, py - 0.4, 1.1, 0.4, 0, 0, TAU); g.fill(); } };
const arrowV = (g, x, y, s) => { g.fillStyle = "#f4f4f4"; g.beginPath(); g.moveTo(x - 3 * s, y - 0.45); g.lineTo(x + 0.8 * s, y - 0.45); g.lineTo(x + 0.8 * s, y - 1.8); g.lineTo(x + 3.2 * s, y); g.lineTo(x + 0.8 * s, y + 1.8); g.lineTo(x + 0.8 * s, y + 0.45); g.lineTo(x - 3 * s, y + 0.45); g.closePath(); g.fill(); };

export const GAME = {
  key: "airbnb3", base: "airbnb", n: "인간 내비게이션", desc: "역에서 헤매는 외국인 손님에게 숙소까지 길을 그려 줘요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 캐리어 끄는 손님이 역·정류장에서 <b>\"Where is it?\"</b> 하고 전화해요.",
    "손님을 <b>꾹 누른 채</b> 골목을 따라 <b>숙소 핀</b>까지 손가락으로 길을 그려요. 손님이 그 길 그대로 걸어가요.",
    "<b>공사장</b>은 못 지나가요. <b>계단</b>(캐리어로 지침)·<b>비 오는 골목</b>·<b>일방통행 역방향</b>·<b>먼 길</b>은 감점! 빨리 안내할수록 좋아요.",
  ],
  steps: () => {
    try {
      const k1 = pick(GUEST_KEYS);
      const im = (c, w, h) => `<img src="${c.toDataURL()}" alt="" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;image-rendering:auto">`;
      const face = (k, ex, px, l, t, ring) => `<span style="position:absolute;left:${l}px;top:${t}px;width:${px}px;height:${px}px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3.5px ${ring};${faceCss(k, ex, px)}"></span>`;
      const box = (w, h, inner) => `<span style="position:relative;display:inline-block;width:${w}px;height:${h}px">${inner}</span>`;
      const s1 = hiC(30, 30, 4, (g) => {
        fRR(g, 0, 18, 30, 12, 2, "#6a6d75"); g.fillStyle = "#b6ae9e"; g.fillRect(0, 17.4, 30, 0.8); g.strokeStyle = "#f2c94c"; g.lineWidth = 0.6; g.setLineDash([2.5, 2]); g.beginPath(); g.moveTo(0, 25); g.lineTo(30, 25); g.stroke(); g.setLineDash([]);
        bagV(g, 23.5, 28.5, "#ff5a7a");
        fRR(g, 17, 1, 12, 9, 2.2, "#ffffff"); g.beginPath(); g.moveTo(19, 9.6); g.lineTo(18, 12); g.lineTo(21.5, 9.6); g.fillStyle = "#ffffff"; g.fill();
        g.fillStyle = "#1e2230"; g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillText("?", 23, 8.2);
      });
      const s2 = hiC(34, 30, 4, (g) => {
        fRR(g, 0, 0, 34, 30, 2, "#ddd4c2");
        for (const [x, y, w, h, c] of [[13, 13, 10, 7, "#6aa86e"], [1, 13, 3, 7, "#c8644a"], [31, 13, 3, 7, "#9aa0aa"], [13, 0, 10, 4.5, "#d8b47a"], [13, 26, 10, 4, "#7a8fb0"]]) { rr(g, x, y, w, h, 1.2); g.fillStyle = lgr(g, x, y, x, y + h, [[0, sh(c, 1.15)], [1, sh(c, 0.85)]]); g.fill(); }
        g.fillStyle = "#6a6d75"; for (const [x, y, w, h] of [[4, 0, 6, 30], [24, 0, 6, 30], [0, 6, 34, 6], [0, 21, 34, 5]]) g.fillRect(x, y, w, h);
        g.lineJoin = "round"; g.lineCap = "round"; const ln = () => { g.beginPath(); g.moveTo(7, 26); g.lineTo(7, 23.5); g.lineTo(27, 23.5); g.lineTo(27, 9); };
        ln(); g.strokeStyle = "#14161f"; g.lineWidth = 3.6; g.stroke(); ln(); g.strokeStyle = "#ffd23f"; g.lineWidth = 2.2; g.stroke(); g.setLineDash([0.1, 3.4]); ln(); g.strokeStyle = "#fff"; g.lineWidth = 0.9; g.stroke(); g.setLineDash([]);
        pinV(g, 27, 9, 0.75);
      });
      const s3 = hiC(30, 30, 4, (g) => { houseV(g, 2, 7, 26, 21, true); heartV(g, 9, 0.5, 6, "#ff4a6e"); heartV(g, 21, 2, 4.4, "#ff7aa0"); });
      return [[box(54, 54, im(s1, 54, 54) + face(k1, "neutral", 28, 3, 13, "#ff5a7a")), "손님 전화"], [box(61, 54, im(s2, 61, 54) + face(k1, "angry", 18, 4, 36, "#ff5a7a")), "숙소까지 길 그리기"], [box(54, 54, im(s3, 54, 54) + face(k1, "smile", 22, 30, 30, "#3fbf7a")), "띠리릭, 도착!"]];
    } catch (e) { return [["", "손님 전화"], ["", "길 그리기"], ["", "도착!"]]; }
  },
  css: `
.mg-airbnb3 .mg-ab3st{background:radial-gradient(ellipse at 50% 20%,#24324a,#111622 85%)!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.mg-airbnb3 .ab3-call{position:relative;z-index:5;width:calc(100% - 12px);max-width:330px;display:flex;align-items:center;gap:8px;background:#fffdf6;color:#1e2230;border-radius:12px;padding:5px 10px;box-shadow:0 3px 0 #0007;min-height:42px;box-sizing:border-box;flex:0 0 auto;transition:background .3s}
.mg-airbnb3 .ab3-call>img{width:28px;height:28px;flex:0 0 auto}
.mg-airbnb3 .ab3-call .ab3-fc{display:none;width:32px;height:32px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #2a8ab8,0 2px 5px #0004}
.mg-airbnb3 .ab3-call.face>img{display:none}.mg-airbnb3 .ab3-call.face .ab3-fc{display:block}
.mg-airbnb3 .ab3-call.lof .ab3-fc{box-shadow:0 0 0 2px #fff,0 0 0 3.5px #ff4a5a,0 2px 5px #0004}
.mg-airbnb3 .ab3-call>div{flex:1;min-width:0;line-height:1.25}
.mg-airbnb3 .ab3-call b{display:block;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-airbnb3 .ab3-call span{display:block;font-size:11px;color:#5a6070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-airbnb3 .ab3-call span em{font-style:normal;color:#e0244a;font-weight:800}
.mg-airbnb3 .ab3-call.ring{animation:ab3ring .5s}
.mg-airbnb3 .ab3-call.ring>img,.mg-airbnb3 .ab3-call.ring .ab3-fc{animation:ab3ringi .12s 4 alternate}
.mg-airbnb3 .ab3-call.idle{background:#dfe5ef}
.mg-airbnb3 .ab3-call.idle>img{filter:grayscale(1) opacity(.6)}
.mg-airbnb3 .ab3-call>i{position:absolute;left:10px;right:10px;bottom:3px;height:3px;border-radius:2px;background:#0001;overflow:hidden}
.mg-airbnb3 .ab3-call>i em{display:block;height:100%;background:#3fbf7a;transform-origin:left;transition:background .3s}
.mg-airbnb3 .ab3-call>i.lo em{background:#ff4a5a}
@keyframes ab3ring{20%{transform:rotate(-2deg)}40%{transform:rotate(2deg)}60%{transform:rotate(-1.5deg)}80%{transform:rotate(1deg)}}
@keyframes ab3ringi{to{transform:rotate(14deg)}}
.mg-airbnb3 .ab3-w{position:relative;flex:0 0 auto;border-radius:6px;overflow:hidden;box-shadow:0 0 0 2px #0009,0 10px 24px #000a}
.mg-airbnb3 .ab3-w canvas{width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
.mg-airbnb3 .ab3-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.mg-airbnb3 .ab3-lb{position:absolute;transform:translate(-50%,-50%);font-size:10.5px;font-weight:800;color:#fff;background:#1e2230e0;padding:0 5px;border-radius:5px;white-space:nowrap;line-height:15px;letter-spacing:-.4px;box-shadow:0 1px 2px #0006}
.mg-airbnb3 .ab3-lb.ex{background:#2f8a5a}.mg-airbnb3 .ab3-lb.bus{background:#2a6ab8}.mg-airbnb3 .ab3-lb.home{background:#ff4a6e;font-size:11px}
.mg-airbnb3 .ab3-lb.wk{background:#e0701e}.mg-airbnb3 .ab3-lb.stp{background:#7a6a50}.mg-airbnb3 .ab3-lb.ow{background:#2a5ab0}.mg-airbnb3 .ab3-lb.rn{background:#3a6a9a}.mg-airbnb3 .ab3-lb.sto{background:#1f8a6a}
.mg-airbnb3 .ab3-lb.pop{animation:ab3pop .45s cubic-bezier(.3,1.8,.5,1)}
@keyframes ab3pop{from{transform:translate(-50%,-50%) scale(.2);opacity:0}}
.mg-airbnb3 .ab3-bub{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#1e2230;border-radius:9px;padding:3px 7px 4px;text-align:center;box-shadow:0 2px 0 #0006;white-space:nowrap;z-index:2;transition:opacity .3s;animation:ab3bub .35s cubic-bezier(.3,1.6,.5,1) both}
.mg-airbnb3 .ab3-bub::after{content:"";position:absolute;left:50%;bottom:-4px;margin-left:-4px;border:4px solid transparent;border-bottom:0;border-top-color:#fff}
.mg-airbnb3 .ab3-bub.dn::after{bottom:auto;top:-4px;border:4px solid transparent;border-top:0;border-bottom-color:#fff}
.mg-airbnb3 .ab3-bub b{display:block;font-size:11.5px;font-weight:900}
.mg-airbnb3 .ab3-bub small{display:block;font-size:9px;color:#7a7f8c;font-weight:700}
.mg-airbnb3 .ab3-bub>i{display:block;height:3px;background:#0002;border-radius:2px;margin-top:2px;overflow:hidden}
.mg-airbnb3 .ab3-bub>i em{display:block;height:100%;background:#3fbf7a;transform-origin:left}
.mg-airbnb3 .ab3-bub.lo>i em{background:#ff4a5a}
.mg-airbnb3 .ab3-bub.lo{animation:ab3shake .4s infinite}
.mg-airbnb3 .ab3-bub.sel{box-shadow:0 2px 0 #0006,0 0 0 2px #ffd23f}
.mg-airbnb3 .ab3-bub.thx{background:#ff4a6e;color:#fff}.mg-airbnb3 .ab3-bub.thx::after{border-top-color:#ff4a6e}
.mg-airbnb3 .ab3-bub.sad{background:#e4e8f0;color:#5a6070}.mg-airbnb3 .ab3-bub.sad::after{border-top-color:#e4e8f0}
.mg-airbnb3 .ab3-bub.say{background:#fffbe6}.mg-airbnb3 .ab3-bub.say::after{border-top-color:#fffbe6}
.mg-airbnb3 .ab3-bub.out{opacity:0}
@keyframes ab3bub{from{transform:translate(-50%,-70%) scale(.3);opacity:0}}
@keyframes ab3shake{25%{margin-left:-2px}75%{margin-left:2px}}
.mg-airbnb3 .ab3-go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-airbnb3 .ab3-go.on{display:block}
.mg-airbnb3 .ab3-go i{position:absolute;width:39px;height:39px;left:-14px;top:-37px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-airbnb3 .ab3-go.tap i{animation:ab3tap .7s infinite}
.mg-airbnb3 .ab3-go span{position:absolute;left:0;bottom:44px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-airbnb3 .ab3-go span:empty{display:none}
.mg-airbnb3 .ab3-go span b{color:#d8402a}
@keyframes ab3tap{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
.mg-airbnb3 .ab3-tut{position:absolute;left:8px;right:8px;bottom:8px;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-airbnb3 .ab3-tut.mid{bottom:auto;top:50%;transform:translateY(-50%)}
.mg-airbnb3 .ab3-tut.off{opacity:0;visibility:hidden}
.mg-airbnb3 .ab3-tc{pointer-events:auto;background:#fffdf6;color:#1e2230;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #2a8ab8;max-width:290px;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-airbnb3 .ab3-tut.pop .ab3-tc{animation:ab3tpop .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes ab3tpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-airbnb3 .ab3-tc>em{font-style:normal;display:inline-block;background:#2a8ab8;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-airbnb3 .ab3-tc p{margin:0}.mg-airbnb3 .ab3-tc b{color:#1f6aa8}.mg-airbnb3 .ab3-tc b.rd{color:#d8402a}.mg-airbnb3 .ab3-tc b.pk{color:#e0244a}
.mg-airbnb3 .ab3-leg{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin:6px 0 2px;text-align:left;font-size:11.5px;line-height:1.25}
.mg-airbnb3 .ab3-leg div{display:flex;align-items:center;gap:5px}
.mg-airbnb3 .ab3-leg img{width:32px;height:24px;flex:0 0 auto;border-radius:3px}
.mg-airbnb3 .ab3-leg small{display:block;color:#7a7f8c;font-size:10px;font-weight:700}
.mg-airbnb3 .ab3-tb{margin-top:5px;display:flex;justify-content:center}
.mg-airbnb3 .ab3-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important;cursor:pointer}
.mg-airbnb3 .ab3-go2{background:linear-gradient(#4fc3f7,#2a8ab8)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #1a5a7a!important;animation:ab3pulse .5s infinite alternate;cursor:pointer}
@keyframes ab3pulse{to{transform:scale(1.06)}}
.mg-airbnb3 .ab3-end{position:absolute;inset:0;z-index:12;display:flex;align-items:center;justify-content:center;background:#0b0c16c0;opacity:0;transition:opacity .35s;pointer-events:none}
.mg-airbnb3 .ab3-end.on{opacity:1}
.mg-airbnb3 .ab3-card{width:min(88%,280px);background:#fff;color:#1e2230;border-radius:16px;padding:12px 12px 10px;box-shadow:0 14px 30px #000b;text-align:center;animation:ab3card .5s cubic-bezier(.3,1.5,.5,1) both}
@keyframes ab3card{from{transform:translateY(40px) scale(.8);opacity:0}}
.mg-airbnb3 .ab3-card>small{display:flex;align-items:center;justify-content:center;gap:6px;color:#2a8ab8;font-weight:800;font-size:12px}
.mg-airbnb3 .ab3-card>small img{width:20px;height:20px}
.mg-airbnb3 .ab3-ppl{display:flex;justify-content:center;align-items:flex-end;gap:8px;margin:8px 0 0}
.mg-airbnb3 .ab3-ppl>*{animation:ab3hop .6s ease-in-out infinite alternate}
.mg-airbnb3 .ab3-ppl img{width:33px;height:51px;image-rendering:pixelated}
.mg-airbnb3 .ab3-ppl .ab3-pf{display:block;width:46px;height:46px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #3fbf7a,0 3px 8px #0004}
.mg-airbnb3 .ab3-ppl>:nth-child(2){animation-delay:.2s}.mg-airbnb3 .ab3-ppl>:nth-child(3){animation-delay:.4s}
.mg-airbnb3 .ab3-ppl .no{filter:grayscale(1) opacity(.5);animation:none;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #9aa0aa}
@keyframes ab3hop{to{transform:translateY(-4px)}}
.mg-airbnb3 .ab3-q{position:relative;margin:6px 4px 8px;background:#fff4c2;border-radius:12px;padding:7px 9px;font-size:15px;font-weight:900;line-height:1.3;animation:ab3bub2 .45s .35s cubic-bezier(.3,1.6,.5,1) both}
.mg-airbnb3 .ab3-q::before{content:"";position:absolute;left:50%;top:-6px;margin-left:-6px;border:6px solid transparent;border-top:0;border-bottom-color:#fff4c2}
.mg-airbnb3 .ab3-q small{display:block;font-size:11px;color:#7a6a3a;font-weight:700;margin-top:2px}
@keyframes ab3bub2{from{transform:scale(.3);opacity:0}}
.mg-airbnb3 .ab3-stars{display:flex;justify-content:center;gap:3px;margin-bottom:6px}
.mg-airbnb3 .ab3-stars img{width:22px;height:20px;animation:ab3star .45s cubic-bezier(.3,1.8,.5,1) both}
@keyframes ab3star{from{transform:scale(0) rotate(-120deg);opacity:0}}
.mg-airbnb3 .ab3-card ul{list-style:none;margin:0;padding:6px 0 0;border-top:1px dashed #ddd;display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:#555}
.mg-airbnb3 .ab3-card li{display:flex;justify-content:space-between;gap:6px}
.mg-airbnb3 .ab3-card li b{color:#1e2230}
@media (prefers-reduced-motion:reduce){.mg-airbnb3 .ab3-go i,.mg-airbnb3 .ab3-go2,.mg-airbnb3 .ab3-bub.lo,.mg-airbnb3 .ab3-ppl>*{animation:none}}
`,
  run(host, ez, finish, skill = 0, opts = {}) {
    const F = frame(host, "airbnb3", "인간 내비게이션", "mg-ab3st");
    F.stage.insertAdjacentHTML("beforeend", `<div class="ab3-call idle"><img src="${phoneURL()}" alt=""><span class="ab3-fc"></span><div><b>에어씨앤씨 손님 전화</b><span>잠깐만요…</span></div><i><em></em></i></div>
      <div class="ab3-w"><canvas width="${W}" height="${H}"></canvas><div class="ab3-ov"></div><div class="ab3-go"><span></span><i></i></div>
      <div class="ab3-tut off"><div class="ab3-tc"><em>리허설</em><p></p><div class="ab3-tb"></div></div></div><div class="ab3-end"></div></div>`);
    const $ = (s) => F.stage.querySelector(s);
    const call = $(".ab3-call"), callFc = call.querySelector(".ab3-fc"), callB = call.querySelector("b"), callS = call.querySelector(":scope>div>span"), callBar = call.querySelector("i"), callBarE = callBar.querySelector("em");
    const wrap = $(".ab3-w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), ov = $(".ab3-ov"), goEl = $(".ab3-go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i");
    const tutEl = $(".ab3-tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".ab3-tb"), endEl = $(".ab3-end");
    goI.style.backgroundImage = `url(${fingerURL(true)})`;
    let K = 2, bgReady = false;
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const SCL = () => cv.width / W;
    const fit = () => {
      const sw = F.stage.clientWidth, sh2 = F.stage.clientHeight - 54; if (!sw || sh2 <= 0) return;
      const nk = Math.max(1, Math.min((sw - 8) / W, sh2 / H));
      if (Math.abs(nk - K) < 0.01 && wrap.style.width) return; K = nk; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
      const cw = Math.round(W * K * DPR); if (cv.width !== cw) { cv.width = cw; cv.height = Math.round(H * K * DPR); if (bgReady) buildBG(); }
      layoutLabels();
    };
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const stXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };

    // ───── 지도 만들기 ─────
    const nodes = [], edges = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) nodes.push({ x: XS[c], y: YS[r], c, r, i: nodes.length });
    const gid = (c, r) => r * 5 + c;
    const mkE = (a, b, o = {}) => { const A = nodes[a], B = nodes[b]; const e = { a, b, len: Math.abs(A.x - B.x) + Math.abs(A.y - B.y), hor: A.y === B.y, row: A.y === B.y ? A.r : -1, main: !!o.main, on: true, split: false, hz: null, dir: 0, prot: !!o.prot, i: edges.length }; edges.push(e); return e; };
    const EH = {}, EV = {};
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) EH[c + "," + r] = mkE(gid(c, r), gid(c + 1, r), { main: r === MAIN, prot: r === MAIN });
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) EV[c + "," + r] = mkE(gid(c, r), gid(c, r + 1));
    const hc = rint(4), exA = rint(2), exB = 2 + rint(2), busSide = pick([0, 4]), busR = pick([3, 4]);
    const eHouse = EH[hc + ",1"], eExA = EH[exA + ",6"], eExB = EH[exB + ",6"], eBus = EV[busSide + "," + busR];
    [eHouse, eExA, eExB, eBus].forEach((e) => (e.prot = true));
    let adj = [];
    const rebuildAdj = () => { adj = nodes.map(() => []); for (const e of edges) if (e.on && !e.split) { adj[e.a].push({ e, j: e.b }); adj[e.b].push({ e, j: e.a }); } };
    // 모든 칸이 이어져 있는지(공사 막힘 제외)
    const connected = () => { rebuildAdj(); const seen = new Set([0]), q = [0]; while (q.length) { const n = q.pop(); for (const { e, j } of adj[n]) if (e.hz !== "work" && !seen.has(j)) { seen.add(j); q.push(j); } } return nodes.every((n) => seen.has(n.i) || !adj[n.i].length) && nodes.filter((n) => adj[n.i].length).length === seen.size; };
    // 막다른 담(골목 몇 개 지우기)
    let removed = 0;
    for (const e of shuffle(edges.filter((e) => !e.prot && !(e.hor && (e.row === 0 || e.row === 6))))) { if (removed >= 7) break; e.on = false; rebuildAdj(); if (adj[e.a].length && adj[e.b].length && connected()) removed++; else e.on = true; }
    rebuildAdj();
    // 특별한 곳(숙소 현관·출구·정류장)은 길 가운데에 칸을 하나 더 둔다
    const split = (e, tag) => { const A = nodes[e.a], B = nodes[e.b], m = { x: Math.round((A.x + B.x) / 2), y: Math.round((A.y + B.y) / 2), c: -1, r: -1, i: nodes.length, tag }; nodes.push(m); e.split = true; mkE(e.a, m.i, { main: e.main, prot: true }); mkE(m.i, e.b, { main: e.main, prot: true }); return m.i; };
    const HN = split(eHouse, "home"), NA = split(eExA, "exA"), NB = split(eExB, "exB"), NBUS = split(eBus, "bus");
    rebuildAdj();
    // 위험 요소: 계단 언덕(세로 2칸), 일방통행(가로 2칸), 처음 공사장 1곳
    const free = (e) => e && e.on && !e.split && !e.prot && !e.hz;
    let stairsE = [];
    for (const c of shuffle([1, 2, 3, 0, 4])) { const a = EV[c + ",1"], b = EV[c + ",2"]; if (free(a) && free(b)) { stairsE = [a, b]; break; } if (free(a)) { stairsE = [a]; break; } }
    stairsE.forEach((e) => (e.hz = "stairs"));
    let owE = [];
    for (const r of shuffle([4, 5])) { for (const c of shuffle([0, 1, 2])) { const a = EH[c + "," + r], b = EH[c + 1 + "," + r]; if (free(a) && free(b)) { owE = [a, b]; break; } } if (owE.length) break; }
    const owDir = pick([1, -1]); owE.forEach((e) => { e.hz = "oneway"; e.dir = owDir; });
    const tryWork = (cands) => { for (const e of cands) { if (!free(e)) continue; e.hz = "work"; if (connected()) return e; e.hz = null; } rebuildAdj(); return null; };
    const work0 = tryWork(shuffle(edges.filter((e) => !e.hor && e.row < 0 && nodes[e.a].r >= 3)));
    rebuildAdj();
    // 길 값: 길이 + 감점(계단·비·역방향). 공사는 못 지남
    const eCost = (e, from) => { if (e.hz === "work") return Infinity; let c = e.len / 30; if (e.hz === "stairs") c += 2.6; else if (e.hz === "rain") c += 1.6; else if (e.hz === "oneway" && from !== (e.dir > 0 ? e.a : e.b)) c += 2.4; return c; };
    const lenCost = (e) => (e.hz === "work" ? Infinity : e.len / 30);
    const edgeOf = (i, j) => { const o = adj[i] && adj[i].find((q) => q.j === j); return o ? o.e : null; };
    const dijk = (s, t, cf = eCost) => {
      const N = nodes.length, d = new Array(N).fill(Infinity), pv = new Array(N).fill(-1), dn = new Array(N).fill(false); d[s] = 0;
      for (;;) { let u = -1; for (let i = 0; i < N; i++) if (!dn[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i; if (u < 0 || u === t) break; dn[u] = true; for (const { e, j } of adj[u]) { const c = cf(e, u); if (!isFinite(c)) continue; if (d[u] + c < d[j]) { d[j] = d[u] + c; pv[j] = u; } } }
      if (!isFinite(d[t])) return { cost: Infinity, path: [] };
      const path = []; for (let v = t; v >= 0; v = pv[v]) path.unshift(v); return { cost: d[t], path };
    };
    const pathCost = (p) => { let c = 0; for (let k = 0; k + 1 < p.length; k++) c += eCost(edgeOf(p[k], p[k + 1]), p[k]); return c; };
    const isPen = (e, from) => e && (e.hz === "stairs" || e.hz === "rain" || (e.hz === "oneway" && from !== (e.dir > 0 ? e.a : e.b)));
    // 칸(건물) 종류
    const cells = {};
    const ck = (c, r) => c + "," + r;
    for (let r = -1; r < 6; r++) for (let c = -1; c < 5; c++) cells[ck(c, r)] = { type: "roof", col: pick(ROOF_C), seed: rnd() * 100 };
    cells[ck(hc, 0)].type = "house";
    stairsE.forEach((e) => { const c = nodes[e.a].c, r = nodes[e.a].r; [ck(c - 1, r), ck(c, r)].forEach((k) => { if (cells[k] && cells[k].type !== "house") cells[k].type = "hill"; }); });
    const inner = shuffle([0, 1, 2, 3].flatMap((c) => [0, 1, 2, 3, 4, 5].map((r) => [c, r]))).filter(([c, r]) => cells[ck(c, r)].type === "roof");
    const take = (f) => { const k = inner.findIndex(f); return k >= 0 ? inner.splice(k, 1)[0] : null; };
    const stC = take(([c, r]) => r === 5 && (c === exA || c === exB)) || take(([, r]) => r >= 4);
    if (stC) cells[ck(stC[0], stC[1])].type = "store";
    [["park", () => true], ["park", () => true], ["cafe", () => true], ["parking", ([, r]) => r !== 0]].forEach(([t, f]) => { const p = take(f); if (p) cells[ck(p[0], p[1])].type = t; });
    // 칸 안쪽 사각형
    const cellRect = (c, r) => {
      const x0 = c < 0 ? 0 : XS[c] + HWV + 2, x1 = c >= 4 ? W : XS[c + 1] - HWV - 2;
      const y0 = r < 0 ? 0 : YS[r] + hwR(r) + 2, y1 = YS[r + 1] - hwR(r + 1) - 2;
      return [x0, y0, x1 - x0, y1 - y0];
    };

    // ───── 배경 그리기(위험 요소가 바뀔 때만 다시) ─────
    const BG = mkC(W, H);
    const buildBG = () => {
      bgReady = true;
      if (BG.width !== cv.width || BG.height !== cv.height) { BG.width = cv.width; BG.height = cv.height; }
      const b = BG.getContext("2d"), S0 = SCL(); b.setTransform(S0, 0, 0, S0, 0, 0); b.clearRect(0, 0, W, H);
      const Q = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      Q(0, 0, W, H, "#ddd4c2");
      b.strokeStyle = "rgba(150,135,110,.16)"; b.lineWidth = 0.3; for (let y = 3; y < H; y += 6) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      // 건물
      for (let r = -1; r < 6; r++) for (let c = -1; c < 5; c++) {
        const cl = cells[ck(c, r)], [x, y, w, h] = cellRect(c, r);
        if (cl.type === "house") houseV(b, x, y, w, h, houseOpen > 0); else paintCellV(b, cl, x, y, w, h);
      }
      // 지운 골목: 화단·담
      for (const e of edges) {
        if (e.on || e.split) continue; const A = nodes[e.a], B = nodes[e.b];
        if (e.hor) { const x = A.x + HWV + 1, w = B.x - A.x - 2 * HWV - 2, y = A.y - 4; Q(x, y, w, 8, "#ddd4c2"); fRR(b, x + 1, y + 1.6, w - 2, 4.8, 2.2, "#2f7a3e"); fRR(b, x + 1.4, y + 1.8, w - 2.8, 2.4, 1.4, "#5fae5a"); for (let k = 2.5; k < w - 2; k += 3) circ(b, x + k, y + 3.6 + (k % 2 > 1 ? 0.8 : 0), 0.7, (k | 0) % 4 ? "#ff8fb0" : "#ffd23f"); }
        else { const y = A.y + hwR(A.r) + 1, h = B.y - A.y - hwR(A.r) - hwR(B.r) - 2, x = A.x - 4; Q(x, y, 8, h, "#ddd4c2"); fRR(b, x + 2.6, y + 1.4, 4, h - 2, 0.6, "rgba(0,0,0,.2)"); fRR(b, x + 2, y + 1, 4, h - 2, 0.6, "#b0604e"); b.fillStyle = "#8a4438"; for (let k = y + 2.5; k < y + h - 1; k += 2.5) b.fillRect(x + 2, k, 4, 0.35); fRR(b, x + 2, y + 1, 4, 0.9, 0.4, "#d08a7a"); }
      }
      // 길(턱 → 아스팔트 → 칠)
      const live = edges.filter((e) => e.on && !e.split);
      const ins = (e) => { const r = rect(e, 0); return e.hor ? [r[0] + HWV + 4, r[1], r[2] - 2 * HWV - 8, r[3]] : [r[0], r[1] + 5, r[2], r[3] - 10]; };
      const rect = (e, pad) => { const A = nodes[e.a], B = nodes[e.b], hw = e.hor ? hwR(A.r) : HWV; return e.hor ? [Math.min(A.x, B.x) - HWV - pad, A.y - hw - pad, Math.abs(B.x - A.x) + 2 * HWV + 2 * pad, 2 * hw + 2 * pad] : [A.x - hw - pad, Math.min(A.y, B.y) - pad, 2 * hw + 2 * pad, Math.abs(B.y - A.y) + 2 * pad]; };
      for (const e of live) { const [x, y, w, h] = rect(e, 1.1); fRR(b, x, y, w, h, 1.4, "#b8b0a0"); }
      for (const e of live) { const [x, y, w, h] = rect(e, 0); b.fillStyle = e.main ? "#56595f" : "#696c74"; b.fillRect(x, y, w, h); }
      b.save(); b.beginPath(); for (const e of live) { const [x, y, w, h] = rect(e, 0); b.rect(x, y, w, h); } b.clip();
      for (let k = 0; k < 520; k++) { const x = (k * 37.3) % W, y = (k * 71.7 + 13) % H; b.fillStyle = k % 3 ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.07)"; b.fillRect(x, y, 0.6, 0.6); }
      b.restore();
      for (const e of live) {
        const A = nodes[e.a], B = nodes[e.b];
        if (e.main) { b.strokeStyle = "#f2c94c"; b.lineWidth = 0.7; b.setLineDash([3, 3]); b.beginPath(); b.moveTo(Math.min(A.x, B.x) + 6, A.y); b.lineTo(Math.max(A.x, B.x) - 6, A.y); b.stroke(); b.setLineDash([]); }
      }
      // 큰길 건널목
      for (let c = 0; c < 5; c++) { const n = nodes[gid(c, MAIN)]; if (!adj[n.i].some((o) => !o.e.hor)) continue; for (let y = n.y - 5.2; y <= n.y + 5; y += 2) fRR(b, n.x - 3.5, y, 7, 1.1, 0.3, "#f0f0f0"); }
      // 맨홀
      live.filter((e, k) => k % 5 === 2 && !e.hz).forEach((e) => { const A = nodes[e.a], B = nodes[e.b], x = (A.x + B.x) / 2, y = (A.y + B.y) / 2; circ(b, x, y, 1.6, "#45484f"); b.strokeStyle = "#7a7d84"; b.lineWidth = 0.3; b.beginPath(); b.arc(x, y, 1.1, 0, TAU); b.stroke(); });
      // 계단 언덕
      for (const e of edges.filter((q) => q.hz === "stairs")) {
        const [x, y, w, h] = ins(e); fRR(b, x - 1, y, w + 2, h, 0.8, "#8a8478");
        for (let yy = y, k = 0; yy < y + h - 0.5; yy += 2, k++) { b.fillStyle = lgr(b, 0, yy, 0, yy + 2, [[0, k < h / 8 ? "#eee6d4" : "#dcd4c2"], [1, "#b4ac9a"]]); b.fillRect(x, yy, w, Math.min(2, y + h - yy)); }
        b.strokeStyle = "#5a5e68"; b.lineWidth = 0.55; b.lineCap = "round"; for (const xx of [x + 0.4, x + w - 0.4]) { b.beginPath(); b.moveTo(xx, y + 0.5); b.lineTo(xx, y + h - 0.5); b.stroke(); }
      }
      // 일방통행 화살표
      for (const e of edges.filter((q) => q.hz === "oneway")) {
        const A = nodes[e.a], B = nodes[e.b], s = (e.dir > 0 ? Math.sign(B.x - A.x) : Math.sign(A.x - B.x)), x0 = Math.min(A.x, B.x), x1 = Math.max(A.x, B.x);
        for (let x = x0 + 9; x < x1 - 5; x += 12) arrowV(b, x, A.y, s);
      }
      // 비 오는 골목
      for (const e of edges.filter((q) => q.hz === "rain")) { const [x, y, w, h] = ins(e); rainV(b, x, y, w, h); }
      // 공사장
      for (const e of edges.filter((q) => q.hz === "work")) { const [x, y, w, h] = ins(e); workV(b, x, y, w, h, e.hor); }
      // 지하철역(아래)
      const sy = YS[6] + 5; b.fillStyle = lgr(b, 0, sy, 0, 214, [[0, "#c4c8d0"], [1, "#a8acb6"]]); b.fillRect(0, sy, W, H - sy);
      b.strokeStyle = "rgba(255,255,255,.25)"; b.lineWidth = 0.3; for (let x = 0; x < W; x += 5) { b.beginPath(); b.moveTo(x, sy); b.lineTo(x, 214); b.stroke(); } for (let y = sy + 4; y < 214; y += 4) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      Q(0, 214, W, 10, "#363d4a"); Q(0, 214, W, 0.6, "#5a6270"); fRR(b, 0, 216, W, 1.8, 0.8, "#3fae6a"); b.fillStyle = "rgba(255,255,255,.35)"; b.fillRect(0, 216.2, W, 0.4);
      for (const n of [NA, NB]) { const x = nodes[n].x; fRR(b, x - 8.6, 200.6, 17.2, 15.6, 2, "rgba(0,0,0,.25)"); fRR(b, x - 8, 200, 16, 15, 2, "#1e2230"); rr(b, x - 7, 201, 14, 5.4, 1.4); b.fillStyle = lgr(b, 0, 201, 0, 206.4, [[0, "#e0f6ff"], [1, "#7fc4dc"]]); b.fill(); for (let k = 0; k < 4; k++) fRR(b, x - 6, 207.6 + k * 1.9, 12, 1.2, 0.3, k % 2 ? "#4a5060" : "#6a7080"); circ(b, x + 5.2, 203.6, 1.5, "#3fae6a"); b.fillStyle = "#fff"; b.font = "bold 2.2px sans-serif"; b.textAlign = "center"; b.fillText("M", x + 5.2, 204.4); }
      // 버스 정류장
      { const n = nodes[NBUS], sx = busSide === 4 ? n.x + 6 : n.x - 13; fRR(b, sx + 1, n.y - 5, 7, 12, 1, "rgba(0,0,0,.22)"); fRR(b, sx, n.y - 6, 7, 12, 1.2, "#1e2a44"); rr(b, sx + 0.8, n.y - 5.2, 5.4, 10.4, 0.8); b.fillStyle = lgr(b, sx, 0, sx + 7, 0, [[0, "#9ac0f8"], [1, "#4a7ad0"]]); b.fill(); fRR(b, sx + (busSide === 4 ? 1.2 : 3.8), n.y - 4, 2, 8, 0.5, "#2a3a5a"); circ(b, sx + 3.5, n.y - 7.4, 1.5, "#2a6ab8"); circ(b, sx + 3.5, n.y - 7.4, 0.7, "#ffffff"); }
    };

    // ───── 이름표 ─────
    const labels = [];
    const addLb = (x, y, t, cls, pop) => { const el = document.createElement("b"); el.className = "ab3-lb " + cls + (pop ? " pop" : ""); el.textContent = t; ov.appendChild(el); const o = { el, x, y }; labels.push(o); o.el.style.left = x * K + "px"; o.el.style.top = y * K + "px"; return o; };
    const layoutLabels = () => labels.forEach((o) => { o.el.style.left = o.x * K + "px"; o.el.style.top = o.y * K + "px"; });
    const edgeMid = (e) => { const A = nodes[e.a], B = nodes[e.b]; return [(A.x + B.x) / 2, (A.y + B.y) / 2]; };
    const hzLabel = (e, t, cls, pop) => { const [x, y] = edgeMid(e); return addLb(e.hor ? x : x + (x > W / 2 ? -14 : 14), e.hor ? y - 9 : y, t, cls, pop); };
    const baseLabels = () => {
      const hn = nodes[HN]; addLb(hn.x, 8, "내 숙소", "home");
      addLb(nodes[NA].x, 220, (exA < exB ? 1 : 2) + "번 출구", "ex"); addLb(nodes[NB].x, 220, (exA < exB ? 2 : 1) + "번 출구", "ex");
      { const n = nodes[NBUS]; addLb(busSide === 4 ? n.x + 3 : n.x - 3, n.y + 13, "버스", "bus"); }
      if (stC) { const [x, y, w, h] = cellRect(stC[0], stC[1]); addLb(x + w / 2, y + 5, "편의점", "sto"); }
      if (stairsE.length) { const e = stairsE[0], [x] = edgeMid(e); addLb(x + (x > W / 2 ? -14 : 14), nodes[e.b].y, "계단", "stp"); }
      if (owE.length) { const A = nodes[owE[0].a], B = nodes[owE[1].b]; addLb((A.x + B.x) / 2, A.y - 9, "일방통행", "ow"); }
      edges.filter((e) => e.hz === "work").forEach((e) => (e.lb = hzLabel(e, "공사중", "wk")));
    };
    const SRC = { [NA]: (exA < exB ? 1 : 2) + "번 출구", [NB]: (exA < exB ? 2 : 1) + "번 출구", [NBUS]: "버스 정류장" };

    // ───── 상태 ─────
    let tutWait = 0, tutWaitT = 0, tut = 0, tutT = 0, el = 0, TT = 0, last = 0, over = false, ending = false, raf = 0, tm = null, houseOpen = 0, sel = null, drawG = null, ptr = null, lastPt = null, blockT = -9, penMsg = {}, tmpWork = null, demo = null, finished = false;
    const T = 40 * ez;
    const guests = [], parts = [], cars = [], scoots = [];
    let bus = null, spawnI = 0, spawnAt = [0.4, 99, 99], evDone = [true, false, false], rainE = [];
    const order = [shuffle([NA, NB])[0]]; order.push(NBUS); order.push(order[0] === NA ? NB : NA);
    const bags = shuffle(G_BAG);
    // 손님 그림(리허설 2 + 본게임 3 + 여유): 시작 때 정해 미리 받기
    const gKeys = shuffle(GUEST_KEYS.slice()).slice(0, 6); gKeys.forEach(loadImg); let keyI = 0;
    for (let k = 0; k < 3; k++) cars.push({ x: rnd() * W, lane: k % 2, sp: 22 + rnd() * 16, c: pick(["#e04848", "#f4f4f4", "#3a7bd5", "#2a2a34", "#f0b030", "#3fae6a"]) });

    // ───── 손님 ─────
    const mkGuest = (node, o = {}) => {
      const n = nodes[node], gu = { spec: gSpec(bags[guests.length % bags.length]), cache: {}, node, x: n.x, y: n.y, st: "in", t: 0, pat0: o.pat || 14 * ez, pat: o.pat || 14 * ez, drawn: [], path: [], seg: 0, u: 0, walkT: 0, v: "f", flip: false, tut: !!o.tut, no: o.no || 0, call: o.call || CALLS[0], src: SRC[node] || "길 한가운데", readyT: 0, touched: false, idleT: 0, ev: {}, score: 0, q: 0, spd: 0, res: "", lo: false };
      gu.key = gKeys[keyI++ % gKeys.length]; gu.img = loadImg(gu.key); gu.exT = 0; gu.exO = "neutral";
      gu.bub = document.createElement("div"); gu.bub.className = "ab3-bub"; gu.bub.style.display = "none"; ov.appendChild(gu.bub);
      if (node === NA || node === NB) { gu.y = 210; gu.from = "st"; } else if (node === NBUS) { gu.from = "bus"; bus = { y: n.y + 16, t: 0, st: "in" }; tone(140, 0.4, "sawtooth", 0.05, -40); } else gu.from = "pop";
      guests.push(gu); return gu;
    };
    const say = (gu, html, cls, ms = 1400) => { gu.bub.className = "ab3-bub " + cls; gu.bub.innerHTML = html; gu.bub.style.display = ""; gu.sayT = ms / 1000; };
    const ring = () => { for (let k = 0; k < 4; k++) { tone(1320, 0.05, "square", 0.05, 0, k * 0.11); tone(1660, 0.05, "square", 0.05, 0, k * 0.11 + 0.055); } vib([40, 60, 40]); call.classList.remove("ring"); void call.offsetWidth; call.classList.add("ring"); };
    const ready = (gu) => {
      gu.st = "wait"; gu.t = 0; gu.readyT = TT; gu.v = "f"; gu.drawn = [gu.node]; ring();
      gu.bub.className = "ab3-bub"; gu.bub.innerHTML = `<b>${gu.call.a}</b><small>어디예요? · ${gu.src}</small>${gu.tut ? "" : "<i><em></em></i>"}`; gu.bub.style.display = "";
      if (!sel || sel.st !== "wait") sel = gu;
    };
    const waiting = () => guests.filter((q) => q.st === "wait");
    const pts = (p) => p.map((i) => [nodes[i].x, nodes[i].y]);
    const plen = (ps) => { let L = 0; for (let k = 0; k + 1 < ps.length; k++) L += Math.abs(ps[k + 1][0] - ps[k][0]) + Math.abs(ps[k + 1][1] - ps[k][1]); return L; };
    const ptAt = (ps, d) => { for (let k = 0; k + 1 < ps.length; k++) { const L = Math.abs(ps[k + 1][0] - ps[k][0]) + Math.abs(ps[k + 1][1] - ps[k][1]); if (d <= L) { const f = L ? d / L : 0; return [ps[k][0] + (ps[k + 1][0] - ps[k][0]) * f, ps[k][1] + (ps[k + 1][1] - ps[k][1]) * f, k]; } d -= L; } const l = ps[ps.length - 1]; return [l[0], l[1], ps.length - 2]; };

    // ───── 길 그리기 ─────
    const nearestNode = (x, y, r) => { let best = -1, bd = r * r; for (const n of nodes) { if (!adj[n.i].length) continue; const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d <= bd) { bd = d; best = n.i; } } return best; };
    // 손가락이 모퉁이를 건너뛰면 3칸 안에서 이어 준다
    const bridge = (from, to, D) => {
      let best = null, bc = Infinity;
      const dfs = (n, path, c) => { if (path.length > 3 || c >= bc) return; for (const { e, j } of adj[n]) { if (e.hz === "work" || D.includes(j) || path.includes(j)) continue; const cc = c + eCost(e, n); if (j === to) { if (cc < bc) { bc = cc; best = [...path, j]; } continue; } dfs(j, [...path, j], cc); } };
      dfs(from, [], 0); return best;
    };
    const blocked = (e) => { if (TT - blockT < 0.7) return; blockT = TT; if (drawG) { drawG.exO = "surprised"; drawG.exT = 0.9; } const [x, y] = edgeMid(e); parts.push({ k: "x", x, y, t: 0, l: 0.6 }); tone(210, 0.12, "sawtooth", 0.08, -60); vib(25); F.msg("공사 중! 여기는 못 지나가요"); };
    const pushNode = (gu, m) => {
      const D = gu.drawn, from = D[D.length - 1], e = edgeOf(from, m); D.push(m);
      tone(640 + Math.min(D.length, 20) * 30, 0.03, "square", 0.045);
      if (isPen(e, from)) {
        tone(150, 0.09, "triangle", 0.14);
        const k = e.hz === "oneway" ? "ow" : e.hz; if (!penMsg[gu.no + k]) { penMsg[gu.no + k] = 1; F.msg(k === "stairs" ? "계단! 캐리어로는 힘들어요" : k === "rain" ? "비 오는 골목이에요. 젖어요!" : "일방통행 역방향! 오토바이 조심"); }
      }
    };
    const feed = (x, y) => {
      const gu = drawG; if (!gu || gu.st !== "wait") return;
      const D = gu.drawn, lastN = D[D.length - 1];
      const n = nearestNode(x, y, 9);
      if (n < 0) { for (const { e } of adj[lastN]) if (e.hz === "work") { const [mx, my] = edgeMid(e); if (Math.abs(mx - x) < 7 && Math.abs(my - y) < 7) blocked(e); } return; }
      if (n === lastN) return;
      const k = D.indexOf(n);
      if (k >= 0) { D.length = k + 1; tone(420, 0.03, "square", 0.04); return; }
      const e = edgeOf(lastN, n);
      let add = null;
      if (e) { if (e.hz === "work") { blocked(e); return; } add = [n]; } else add = bridge(lastN, n, D);
      if (!add) { const we = adj[lastN].find((o) => o.e.hz === "work" && Math.hypot(nodes[o.j].x - x, nodes[o.j].y - y) < 12); if (we) blocked(we.e); return; }
      for (const m of add) { pushNode(gu, m); if (m === HN) { commit(gu, D.slice()); return; } }
    };
    const commit = (gu, path) => {
      if (gu.st !== "wait") return;
      gu.path = path; gu.drawn = []; gu.st = "walk"; gu.seg = 0; gu.u = 0; gu.t = 0; gu.walkT = 0;
      if (drawG === gu) { drawG = null; try { if (ptr != null) cv.releasePointerCapture(ptr); } catch (er) {} ptr = null; }
      const opt = dijk(gu.node, HN).cost, pc = pathCost(path);
      gu.q = clamp(opt / pc, 0, 1); const dtD = TT - gu.readyT; gu.spd = clamp(1 - (dtD - 2.2) / (9 * ez), 0, 1);
      gu.score = 0.72 * Math.pow(gu.q, 1.4) + 0.28 * gu.spd; gu.commitEl = el;
      const r = { stairs: 0, rain: 0, ow: 0 }; for (let k = 0; k + 1 < path.length; k++) { const e = edgeOf(path[k], path[k + 1]); if (isPen(e, path[k])) r[e.hz === "oneway" ? "ow" : e.hz]++; }
      gu.res = gu.q >= 0.97 ? "완벽한 길" : r.stairs ? "계단 고생" : r.rain ? "비 맞음" : r.ow ? "역주행 깜짝" : "조금 돌아감";
      const hn = nodes[HN], at = stXY(hn.x, hn.y - 10);
      SFX.snap(); setTimeout(SFX.whoosh, 80);
      if (gu.q >= 0.97) { F.hit(at, 3, "#ffd23f"); F.msg("완벽한 길이에요!"); }
      else if (gu.q >= 0.75) { SFX.ding(0); F.float(at, "좋아요"); F.msg(gu.res === "조금 돌아감" ? "조금 돌아가지만 괜찮아요" : `괜찮은 길 · ${gu.res}`); }
      else { tone(260, 0.18, "triangle", 0.1, -80); F.float(at, "돌아가요…", "bad"); F.msg(`많이 돌아가요 · ${gu.res}`); }
      say(gu, `<b>${pick(["OK!", "Got it!", "On my way!"])}</b>`, "say", 900);
      if (sel === gu) sel = waiting()[0] || null;
      updSc();
    };
    const toL = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault(); if (over || ending || tut === 3) return;
      const [x, y] = toL(e), ws = waiting();
      if (!ws.length) { if (guests.some((q) => q.st === "walk")) F.msg("손님이 걸어가는 중이에요"); return; }
      let gu = null, bd = 16 * 16;
      for (const q of ws) { const d = (q.x - x) ** 2 + (q.y - 6 - y) ** 2; if (d < bd) { bd = d; gu = q; } }
      if (gu) { if (gu !== sel || !gu.drawn.length) gu.drawn = [gu.node]; else { const ln = nodes[gu.drawn[gu.drawn.length - 1]]; if (Math.hypot(ln.x - x, ln.y - y) > 10) gu.drawn = [gu.node]; } sel = gu; }
      else { gu = sel && sel.st === "wait" ? sel : ws[0]; sel = gu; if (!gu.drawn.length) gu.drawn = [gu.node]; }
      drawG = gu; gu.touched = true; gu.idleT = 0; ptr = e.pointerId; lastPt = [x, y]; demo = null;
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      tone(520, 0.04, "sine", 0.06, 300); feed(x, y);
    });
    cv.addEventListener("pointermove", (e) => {
      if (ptr !== e.pointerId || !drawG) return; const [x, y] = toL(e), [lx, ly] = lastPt, n = Math.ceil(Math.hypot(x - lx, y - ly) / 2);
      for (let k = 1; k <= n && drawG; k++) feed(lx + ((x - lx) * k) / n, ly + ((y - ly) * k) / n);
      lastPt = [x, y]; if (drawG) drawG.idleT = 0;
    });
    const up = (e) => { if (ptr !== e.pointerId) return; ptr = null; const gu = drawG; drawG = null; if (gu && gu.st === "wait" && gu.drawn.length > 1) { F.msg("숙소 핀까지 이어 주세요!"); SFX.tok(); } };
    ["pointerup", "pointercancel"].forEach((k) => cv.addEventListener(k, up));

    // ───── 위험 요소 사건 ─────
    const onRemaining = (e) => guests.some((q) => q.st === "walk" && q.path.slice(q.seg).some((n, k, a) => k + 1 < a.length && edgeOf(n, a[k + 1]) === e));
    const workEvent = (src) => {
      const p = dijk(src, HN).path, cands = [];
      for (let k = 1; k + 2 < p.length; k++) cands.push(edgeOf(p[k], p[k + 1]));
      const e = tryWork(shuffle(cands).filter((q) => q && !onRemaining(q))) || tryWork(shuffle(edges.filter((q) => !onRemaining(q))));
      rebuildAdj(); if (!e) return;
      buildBG(); e.lb = hzLabel(e, "공사중", "wk", true);
      const [x, y] = edgeMid(e); for (let k = 0; k < 10; k++) parts.push({ k: "dust", x: x + (rnd() - 0.5) * 10, y: y + (rnd() - 0.5) * 6, vx: (rnd() - 0.5) * 30, vy: -10 - rnd() * 14, t: 0, l: 0.7 });
      noise(0.18, 300, 0.3); tone(90, 0.25, "sine", 0.3, -30); vib(30); F.msg("앗! 골목에 공사가 시작됐어요");
      const sp = stXY(x, y); F.burst(sp, "#ff7a1e", 8);
    };
    const rainEvent = (src) => {
      const p = dijk(src, HN).path; if (p.length < 4) return;
      const mid = p[Math.floor(p.length / 2)], set = new Set();
      for (const { e, j } of adj[mid]) if (free(e) && !onRemaining(e)) { set.add(e); for (const o of adj[j]) if (set.size < 4 && free(o.e) && !onRemaining(o.e)) set.add(o.e); }
      rainE = [...set].slice(0, 4); rainE.forEach((e) => (e.hz = "rain"));
      if (!rainE.length) return;
      buildBG();
      const spots = rainE.flatMap((e) => { const [x, y] = edgeMid(e); return (e.hor ? [[x, y - 8], [x, y + 8]] : [[x - 11, y], [x + 11, y]]).filter((p) => p[0] > 8 && p[0] < W - 8); });
      const far = (p) => Math.min(99, ...labels.map((o) => Math.hypot(o.x - p[0], (o.y - p[1]) * 1.6)));
      spots.sort((a, b) => far(b) - far(a)); addLb(spots[0][0], spots[0][1], "비", "rn", true);
      noise(0.6, 4000, 0.06, 0, 0.5); noise(0.6, 3500, 0.05, 0.4, 0.5); F.msg("비가 와요! 비 오는 골목은 피해서");
    };

    // ───── 걷기 ─────
    const arrive = (gu) => {
      gu.st = "done"; gu.t = 0; houseOpen = 1.6; buildBG();
      [1319, 1568, 1760, 2093].forEach((f, k) => tone(f, 0.05, "square", 0.06, 0, k * 0.075)); tone(1568, 0.16, "triangle", 0.12, 0, 0.34); tone(2093, 0.22, "triangle", 0.1, 0, 0.44);
      setTimeout(() => { if (!cv.isConnected) return; say(gu, `<b>${gu.call.thx}</b>`, "thx", 1500); for (let k = 0; k < 7; k++) parts.push({ k: "heart", x: gu.x + (rnd() - 0.5) * 12, y: gu.y - 14, vx: (rnd() - 0.5) * 10, vy: -16 - rnd() * 10, t: -k * 0.08, l: 1.2 }); F.burst(stXY(gu.x, gu.y - 12), "#ff7aa0", 10); vib(15); }, 380);
      updSc();
    };
    const walk = (gu, dt) => {
      const p = gu.path, a = nodes[p[gu.seg]], b = nodes[p[gu.seg + 1]], e = edgeOf(p[gu.seg], p[gu.seg + 1]);
      if (gu.evSeg !== gu.seg) {
        gu.evSeg = gu.seg;
        if (e && e.hz === "stairs") { if (!gu.ev.st) { gu.ev.st = 1; say(gu, "<b>Phew…</b><small>캐리어가 무거워요</small>", "say", 1300); } }
        else if (e && e.hz === "rain") { if (!gu.ev.rn) { gu.ev.rn = 1; say(gu, "<b>So wet!</b><small>비 맞았어요</small>", "say", 1300); } }
        else if (isPen(e, p[gu.seg])) { if (!gu.ev.ow) { gu.ev.ow = 1; gu.exO = "surprised"; gu.exT = 1.6; scoots.push({ e, f: 0 }); tone(700, 0.12, "square", 0.08); tone(560, 0.16, "square", 0.08, 0, 0.13); setTimeout(() => cv.isConnected && say(gu, "<b>Whoa!</b><small>오토바이 깜짝</small>", "say", 1200), 400); } }
      }
      const sp = WALK * (gu.tut ? 1.8 : 1) * (e && e.hz === "stairs" ? 0.38 : e && e.hz === "rain" ? 0.85 : 1);
      gu.u += (sp * dt) / Math.max(1, e ? e.len : 1); gu.walkT += dt * sp / 6;
      if (e && e.hz === "stairs" && Math.floor(gu.walkT * 2) !== gu.thud) { gu.thud = Math.floor(gu.walkT * 2); tone(110, 0.06, "square", 0.08); }
      if (gu.u >= 1) { gu.u = 0; gu.seg++; if (gu.seg >= p.length - 1) { gu.x = nodes[HN].x; gu.y = nodes[HN].y; arrive(gu); return; } }
      const A = nodes[p[gu.seg]], B = nodes[p[gu.seg + 1]]; gu.x = A.x + (B.x - A.x) * gu.u; gu.y = A.y + (B.y - A.y) * gu.u;
      const dx = B.x - A.x, dy = B.y - A.y; if (Math.abs(dx) > Math.abs(dy)) { gu.v = "s"; gu.flip = dx < 0; } else gu.v = dy < 0 ? "b" : "f";
      void a; void b;
    };
    const stepGuest = (gu, dt) => {
      gu.t += dt; if (gu.exT > 0) gu.exT -= dt; if (gu.sayT > 0) { gu.sayT -= dt; if (gu.sayT <= 0 && gu.st === "wait") ready2(gu); else if (gu.sayT <= 0) gu.bub.classList.add("out"); }
      if (gu.st === "in") {
        if (gu.from === "st") { gu.y = Math.max(nodes[gu.node].y, 210 - gu.t * 28); gu.v = "b"; gu.walkT += dt * 4; if (gu.y <= nodes[gu.node].y) ready(gu); }
        else if (gu.from === "bus") { if (gu.t > 0.75) ready(gu); }
        else if (gu.t > 0.35) ready(gu);
      } else if (gu.st === "wait") {
        if (!gu.tut && !ending) {
          gu.pat -= dt; if (drawG !== gu) gu.idleT += dt;
          if (!gu.lo && gu.pat < gu.pat0 * 0.4) { gu.lo = true; ring(); gu.bub.innerHTML = `<b>${gu.call.b}</b><small>빨리요! · ${gu.src}</small><i><em></em></i>`; gu.bub.classList.add("lo"); }
          if (gu.pat <= 0) lose(gu);
        }
      } else if (gu.st === "walk") walk(gu, dt);
      else if (gu.st === "done") { if (gu.t > 0.5) { gu.v = "b"; gu.y = nodes[HN].y - Math.min(5, (gu.t - 0.5) * 12); } if (gu.t > 1.3) { gu.st = "gone"; } }
      else if (gu.st === "lost") { if (gu.t > 1.8) gu.st = "gone"; }
    };
    const ready2 = (gu) => { gu.bub.className = "ab3-bub" + (gu.lo ? " lo" : ""); gu.bub.innerHTML = `<b>${gu.lo ? gu.call.b : gu.call.a}</b><small>어디예요? · ${gu.src}</small>${gu.tut ? "" : "<i><em></em></i>"}`; };
    const lose = (gu) => {
      gu.st = "lost"; gu.t = 0; gu.score = 0; gu.q = 0; gu.spd = 0; gu.res = "택시 탐";
      if (drawG === gu) { drawG = null; ptr = null; }
      say(gu, `<b>${gu.call.lost}</b><small>택시 타고 갈게요…</small>`, "sad", 1700); F.miss(stXY(gu.x, gu.y - 10)); F.msg("손님이 기다리다 택시를 탔어요…");
      if (sel === gu) sel = waiting()[0] || null; updSc();
    };
    const updSc = () => { const n = guests.filter((q) => !q.tut && (q.st === "done" || q.st === "gone" && q.res !== "택시 탐")).length; F.sc.textContent = tut >= 0 ? "리허설" : `도착 ${n}/${NG}`; };

    // ───── 리허설 ─────
    const SKIP = `<button class="ab3-skip" data-skip>건너뛰기</button>`;
    const hops = (s) => { const d = new Array(nodes.length).fill(99); d[s] = 0; const q = [s]; while (q.length) { const n = q.shift(); for (const { e, j } of adj[n]) if (e.hz !== "work" && d[j] > d[n] + 1) { d[j] = d[n] + 1; q.push(j); } } return d; };
    const legURL = (kind) => hiC(16, 12, 4, (b) => {
      fRR(b, 0, 0, 16, 12, 1.5, "#ddd4c2"); b.fillStyle = "#696c74"; b.fillRect(0, 2, 16, 8);
      if (kind === "work") workV(b, 0, 2, 16, 8, true);
      if (kind === "stairs") { for (let x = 0, k = 0; x < 16; x += 2, k++) { b.fillStyle = lgr(b, x, 0, x + 2, 0, [[0, "#e6decc"], [1, "#b4ac9a"]]); b.fillRect(x, 2, 2, 8); } b.strokeStyle = "#5a5e68"; b.lineWidth = 0.6; for (const y of [2.4, 9.6]) { b.beginPath(); b.moveTo(0, y); b.lineTo(16, y); b.stroke(); } }
      if (kind === "rain") { rainV(b, 0, 2, 16, 8); b.strokeStyle = "rgba(210,230,255,.9)"; b.lineWidth = 0.4; for (let k = 0; k < 6; k++) { const x = 1 + k * 2.8, y = (k * 3.7) % 7; b.beginPath(); b.moveTo(x, y); b.lineTo(x - 0.6, y + 2); b.stroke(); } }
      if (kind === "ow") arrowV(b, 8, 6, 1);
    }).toDataURL();
    let tutG = null;
    const tutNext = (n) => {
      tut = n; tutT = 0; tutEl.classList.remove("off", "pop", "mid"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        const d = hops(HN); let cand = nodes.filter((q) => q.c >= 0 && q.r <= 4 && d[q.i] === 3 && q.y > nodes[HN].y && dijk(q.i, HN).path.every((v, k, a) => k + 1 >= a.length || !edgeOf(v, a[k + 1]).hz));
        if (!cand.length) cand = nodes.filter((q) => q.c >= 0 && q.r <= 4 && d[q.i] >= 2 && d[q.i] <= 4);
        tutG = mkGuest(pick(cand).i, { tut: true, no: 0, call: CALLS[0] });
        tutP.innerHTML = `손님이 길을 잃고 전화했어요!<br>손님을 <b>꾹</b> 누른 채 골목을 따라 <b class="pk">숙소 핀</b>까지 쭉 그려요.`; tutB.innerHTML = SKIP;
      } else if (n === 2) {
        const d = hops(HN); let found = null;
        for (const q of shuffle(nodes.filter((q) => q.c >= 0 && q.r <= 4 && d[q.i] >= 3 && d[q.i] <= 5))) {
          const p = dijk(q.i, HN, lenCost).path, base = dijk(q.i, HN, lenCost).cost;
          for (let k = 0; k + 1 < p.length && !found; k++) { const e = edgeOf(p[k], p[k + 1]); if (!free(e)) continue; e.hz = "work"; const alt = dijk(q.i, HN); if (isFinite(alt.cost) && alt.cost <= base + 4 && connected()) found = [q.i, e]; else e.hz = null; }
          rebuildAdj(); if (found) break;
        }
        if (!found) return tutNext(3);
        tmpWork = found[1]; buildBG(); tmpWork.lb = hzLabel(tmpWork, "공사중", "wk", true); noise(0.18, 300, 0.25); tone(90, 0.25, "sine", 0.25, -30);
        tutG = mkGuest(found[0], { tut: true, no: 0, call: CALLS[1 + rint(CALLS.length - 1)] });
        tutP.innerHTML = `<b class="rd">공사장</b>은 막혀서 못 지나가요!<br>다른 골목으로 <b>돌아서</b> 안내해요.`; tutB.innerHTML = SKIP;
      } else if (n === 3) {
        tutEl.classList.add("mid");
        tutP.innerHTML = `좋아요! 길에는 이런 게 있어요.<div class="ab3-leg"><div><img src="${legURL("work")}" alt=""><span><b class="rd">공사장</b><small>못 지나가요</small></span></div><div><img src="${legURL("stairs")}" alt=""><span><b>계단</b><small>캐리어로 느리고 지침</small></span></div><div><img src="${legURL("rain")}" alt=""><span><b>비 오는 골목</b><small>젖어서 감점</small></span></div><div><img src="${legURL("ow")}" alt=""><span><b>일방통행</b><small>화살표 반대는 위험</small></span></div></div>손님 <b>3명</b>이 전화해요. <b>빨리</b>, <b>짧고 편한 길</b>로!`;
        tutB.innerHTML = `<button class="ab3-go2" data-go>안내 시작!</button>`;
      }
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null); demo = null;
      for (const q of guests) q.bub.remove(); guests.length = 0; parts.length = 0; scoots.length = 0; bus = null; drawG = null; ptr = null; sel = null; penMsg = {};
      if (tmpWork) { tmpWork.hz = null; if (tmpWork.lb) { tmpWork.lb.el.remove(); labels.splice(labels.indexOf(tmpWork.lb), 1); } tmpWork = null; rebuildAdj(); buildBG(); }
      el = 0; spawnI = 0; houseOpen = 0; SFX.go(); tm = timer(T, F.bar, timeUp); updSc();
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

    // ───── 손가락 안내 ─────
    let goKey = "";
    const guide = (o) => {
      if (!o) { if (goKey) { goKey = ""; goEl.className = "ab3-go"; } return; }
      goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px";
      const k = (o.t || "") + (o.tap ? 1 : 0); if (k !== goKey) { goKey = k; goT.innerHTML = o.t || ""; goEl.className = "ab3-go on" + (o.tap ? " tap" : ""); }
      goT.style.transform = o.x < 30 ? "translateX(-20%)" : o.x > 130 ? "translateX(-80%)" : "translateX(-50%)";
    };
    // 손가락이 손님에서 숙소까지 길을 따라 미끄러지는 시범
    const demoFor = (gu) => { if (!demo || demo.gu !== gu || demo.ver !== edges.reduce((a, e) => a + (e.hz ? e.i : 0), 0)) { const p = dijk(gu.node, HN).path; demo = { gu, ps: pts(p), L: plen(pts(p)), t0: TT, ver: edges.reduce((a, e) => a + (e.hz ? e.i : 0), 0) }; } };
    const guideUpd = () => {
      if (ending || over) return guide(null);
      let gu = null;
      if (tut === 1 || tut === 2) gu = tutG && tutG.st === "wait" && !(drawG === tutG) ? tutG : null;
      else if (tut < 0) { const s = sel && sel.st === "wait" ? sel : null; if (s && drawG !== s && ((!s.touched && (s.no === 1 ? TT - s.readyT > 0.6 : TT - s.readyT > 3.5)) || s.idleT > 4.5)) gu = s; }
      if (!gu) { demo = null; return guide(null); }
      demoFor(gu);
      const cyc = demo.L / 60 + 1.1, ph = (TT - demo.t0) % cyc;
      if (ph < 0.5) guide({ x: gu.x, y: gu.y - 6, t: "<b>꾹</b> 누른 채", tap: 1 });
      else { const d = Math.min(demo.L, (ph - 0.5) * 60), [x, y] = ptAt(demo.ps, d); guide({ x, y, t: d >= demo.L ? "숙소까지 <b>쭉!</b>" : "" }); demo.d = d; }
    };

    // ───── 끝 ─────
    const timeUp = () => {
      if (ending) return;
      for (const q of guests) { if (q.st === "wait" || q.st === "in") lose(q); else if (q.st === "walk") { q.st = "done"; q.t = 9; } }
      while (spawnI < NG) { const q = mkGuest(order[spawnI], { no: spawnI + 1, call: CALLS[spawnI] }); q.st = "lost"; q.res = "택시 탐"; spawnI++; }
      endSeq();
    };
    const endSeq = () => {
      if (ending) return; ending = true; if (tm) tm.stop(); guide(null);
      const gs = guests.filter((q) => !q.tut), sc = gs.reduce((a, q) => a + q.score, 0) / NG, qa = gs.reduce((a, q) => a + q.q, 0) / NG, sa = gs.reduce((a, q) => a + q.spd, 0) / NG, arr = gs.filter((q) => q.res !== "택시 탐").length;
      const stars = clamp(Math.round(sc * 5 + 0.15), 1, 5);
      const quote = sc >= 0.85 ? ["Host gave perfect directions!", "길 안내가 완벽했어요!"] : sc >= 0.6 ? ["Easy to find. Thanks, host!", "찾기 쉬웠어요. 고마워요!"] : sc >= 0.3 ? ["Got a bit lost, but we made it.", "조금 헤맸지만 도착했어요."] : ["We couldn't find the place…", "숙소를 못 찾았어요…"];
      setTimeout(() => {
        if (!cv.isConnected) return;
        const portrait = (q) => { const c = gSprite(q, "f", 0, {}), o = mkC(11, 17); o.getContext("2d").drawImage(c, 0, 0); return o.toDataURL(); };
        const pic = (q) => { const no = q.res === "택시 탐"; return q.img && q.img.ok ? `<span class="ab3-pf${no ? " no" : ""}" style="${faceCss(q.key, no ? "sad" : "smile", 46)}"></span>` : `<img class="${no ? "no" : ""}" src="${portrait(q)}" alt="">`; };
        endEl.innerHTML = `<div class="ab3-card"><small><img src="${phoneURL()}" alt="">에어씨앤씨 · 새 후기</small><div class="ab3-ppl">${gs.map(pic).join("")}</div>
          <div class="ab3-q">"${quote[0]}"<small>${quote[1]}</small></div><div class="ab3-stars">${[0, 1, 2, 3, 4].map((k) => `<img src="${starURL(k < stars)}" alt="" style="animation-delay:${0.7 + k * 0.13}s">`).join("")}</div>
          <ul>${gs.map((q) => `<li><span>손님 ${q.no} · ${q.src}</span><b>${q.res}</b></li>`).join("")}</ul></div>`;
        endEl.classList.add("on"); SFX.end(); vib(25);
        for (let k = 0; k < 5; k++) setTimeout(() => { if (!cv.isConnected) return; if (k < stars) SFX.ding(k); else tone(220, 0.06, "square", 0.05); }, 750 + k * 130);
      }, 900);
      setTimeout(() => { if (finished) return; finished = true; over = true; cancelAnimationFrame(raf); finish(sc, `손님 <b>${arr}/${NG}</b>명 도착 · 길 품질 <b>${Math.round(qa * 100)}</b>점 · 후기 <b>★${stars}</b>`, "", [["길 품질", qa], ["안내 속도", sa], ["도착", arr / NG]]); }, 3900);
    };

    // ───── 그리기 ─────
    const exOf = (gu) => {
      if (gu.exT > 0) return gu.exO;
      if (gu.st === "lost") return "sad";
      if (gu.st === "done") return "smile";
      if (gu.st === "wait") return gu.lo ? "angry" : "neutral";
      if (gu.st === "walk") { const e = edgeOf(gu.path[gu.seg], gu.path[gu.seg + 1]); if (e && e.hz === "stairs") return "sad"; if (e && e.hz === "rain") return "surprised"; if (isPen(e, gu.path[gu.seg])) return "surprised"; return "smile"; }
      return "neutral";
    };
    const tracePts = (ps) => { g.beginPath(); ps.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); };
    const drawPath = (p, col, alpha = 1) => {
      if (p.length < 2) return; const ps = pts(p); g.globalAlpha = alpha; g.lineJoin = "round"; g.lineCap = "round";
      tracePts(ps); g.strokeStyle = "rgba(20,22,31,.88)"; g.lineWidth = 4.6; g.stroke();
      tracePts(ps); g.strokeStyle = col; g.lineWidth = 2.9; g.stroke();
      const hot = Math.floor(TT * 6) % 2 ? "#ff5a3a" : "#ff9a3a";
      for (let k = 0; k + 1 < ps.length; k++) if (isPen(edgeOf(p[k], p[k + 1]), p[k])) { g.beginPath(); g.moveTo(ps[k][0], ps[k][1]); g.lineTo(ps[k + 1][0], ps[k + 1][1]); g.strokeStyle = hot; g.lineWidth = 2.9; g.stroke(); }
      g.setLineDash([0.01, 5]); g.lineDashOffset = -((TT * 24) % 5.01); tracePts(ps); g.strokeStyle = "#ffffff"; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      g.globalAlpha = 1;
    };
    const drawGuest = (gu) => {
      if (gu.st === "gone") return;
      let a = 1; if (gu.st === "lost") a = clamp(1 - (gu.t - 1) / 0.8, 0, 1); if (gu.st === "done" && gu.t > 0.9) a = clamp(1 - (gu.t - 0.9) / 0.4, 0, 1);
      if (gu.st === "in" && gu.from !== "st") a = clamp(gu.t / 0.3, 0, 1);
      g.globalAlpha = a;
      g.save(); if (gu.st === "in" && gu.from === "st") { g.beginPath(); g.rect(0, 0, W, 202); g.clip(); }
      const walking = gu.st === "walk" || (gu.st === "in" && gu.from === "st"), wait = gu.st === "wait";
      if (!(gu.img && gu.img.ok)) {
        // 그림을 못 받았을 때만 작은 도트
        const x = Math.round(gu.x), y = Math.round(gu.y), f = walking ? Math.floor(gu.walkT) % 4 : 0, v = wait || gu.st === "lost" ? "f" : gu.v;
        P(x - 4, y, 9, 1, "rgba(0,0,0,.25)"); g.imageSmoothingEnabled = false;
        const sp = gSprite(gu, v, f, { phone: wait }, v === "s" && gu.flip);
        if (v === "s") bagP(P, gu.flip ? x + 8 : x - 8, y, gu.spec.bag, false); else if (v === "f" && walking) bagP(P, x + 3, y - 3, gu.spec.bag, true);
        g.drawImage(sp, x - 5, y - 16);
        if (v === "b") bagP(P, x + 1, y + 6, gu.spec.bag, false); else if (v === "f" && !walking) bagP(P, x + 8, y, gu.spec.bag, true);
        g.imageSmoothingEnabled = true; g.restore(); g.globalAlpha = 1; return;
      }
      const x = gu.x, y = gu.y, bob = walking ? -Math.abs(Math.sin(gu.walkT * Math.PI / 2)) * 1.3 : gu.st === "done" ? -Math.abs(Math.sin(gu.t * 9)) * 1.6 : 0;
      const sel1 = wait && (gu === sel || gu.tut), ringC = sel1 ? (Math.floor(TT * 5) % 2 ? "#ffd23f" : "#fff2a0") : gu.lo && wait ? "#ff4a5a" : gu.spec.bag;
      // 발밑 그림자·고른 손님 고리
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(x, y + 0.4, 4.4, 1.3, 0, 0, TAU); g.fill();
      if (sel1) { g.strokeStyle = ringC; g.lineWidth = 0.9; g.beginPath(); g.ellipse(x, y + 0.4, 6.2 + Math.sin(TT * 8) * 0.5, 2, 0, 0, TAU); g.stroke(); }
      // 캐리어: 걸을 때는 뒤에서 끌고, 서 있으면 옆에
      const bx = walking && gu.v === "s" ? x + (gu.flip ? 6.4 : -6.4) : x + 6.2, by = walking && gu.v === "b" ? y + 3 : y + 0.6;
      if (!(walking && gu.v === "b")) bagV(g, bx, by, gu.spec.bag, true);
      // 핀 꼬리 + 원형 얼굴
      const R0 = 6.4, cy = y - 9.6 + bob;
      g.beginPath(); g.moveTo(x - 2.4, cy + R0 - 0.8); g.lineTo(x, y - 0.4); g.lineTo(x + 2.4, cy + R0 - 0.8); g.closePath(); g.fillStyle = ringC; g.fill();
      circ(g, x + 0.5, cy + 0.8, R0 + 1.2, "rgba(0,0,0,.28)");
      circ(g, x, cy, R0 + 1.2, ringC); circ(g, x, cy, R0 + 0.35, "#ffffff");
      g.save(); g.beginPath(); g.arc(x, cy, R0, 0, TAU); g.clip(); g.fillStyle = "#e6ecf4"; g.fillRect(x - R0, cy - R0, 2 * R0, 2 * R0);
      const [sx, sy, ss] = faceSrc(exOf(gu)); g.drawImage(gu.img.im, sx, sy, ss, ss, x - R0, cy - R0, 2 * R0, 2 * R0); g.restore();
      if (walking && gu.v === "b") bagV(g, x + 1, by, gu.spec.bag, true);
      g.restore(); g.globalAlpha = 1;
      // 전화 울림
      if (wait && Math.floor(TT * 4) % 2) { g.strokeStyle = gu.lo ? "#ff5a5a" : "#ffd23f"; g.lineWidth = 0.8; g.lineCap = "round"; for (const r of [1.6, 3]) { g.beginPath(); g.arc(x + R0 + 0.6, cy - R0 + 1.4, r, -1.25, 0.05); g.stroke(); } }
      // 계단: 땀 / 비: 물방울
      if (gu.st === "walk") { const e = edgeOf(gu.path[gu.seg], gu.path[gu.seg + 1]);
        const drop = (dx, dy) => { g.fillStyle = "#8fd0ff"; g.beginPath(); g.moveTo(dx, dy - 1.4); g.quadraticCurveTo(dx + 0.9, dy, dx, dy + 0.6); g.quadraticCurveTo(dx - 0.9, dy, dx, dy - 1.4); g.fill(); };
        if (e && e.hz === "stairs" && Math.floor(TT * 5) % 2) { drop(x - R0 - 0.8, cy - 2); drop(x + R0 + 1, cy + 1); }
        if (e && e.hz === "rain") { g.strokeStyle = "rgba(190,225,255,.95)"; g.lineWidth = 0.5; for (let k = 0; k < 4; k++) { const ph = (TT * 2 + k * 0.27) % 1, rx = x - 6 + k * 4; g.beginPath(); g.moveTo(rx, cy - 9 + ph * 12); g.lineTo(rx - 0.6, cy - 7 + ph * 12); g.stroke(); } }
      }
    };
    const render = () => {
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(BG, 0, 0); const S0 = SCL(); g.setTransform(S0, 0, 0, S0, 0, 0);
      // 큰길 차
      for (const c of cars) carTop(g, c.x, nodes[gid(0, MAIN)].y + (c.lane ? 3 : -3), c.lane ? 1 : -1, c.c);
      // 버스
      if (bus) { const n = nodes[NBUS], x = n.x - 3.5, y = bus.y - 10, a = bus.st === "in" ? clamp(bus.t / 0.4, 0, 1) : bus.st === "out" ? clamp(1 - bus.t / 0.5, 0, 1) : 1; g.globalAlpha = a;
        fRR(g, x + 0.6, y + 0.8, 8, 21, 2, "rgba(0,0,0,.3)"); rr(g, x, y, 8, 21, 2); g.fillStyle = lgr(g, x, 0, x + 8, 0, [[0, "#7fd89a"], [0.5, "#3fae6a"], [1, "#2a8a52"]]); g.fill(); g.lineWidth = 0.45; g.strokeStyle = "#12131c"; g.stroke();
        fRR(g, x + 1.2, y + 0.9, 5.6, 2.8, 0.8, "#9fd0e8"); for (let k = 0; k < 4; k++) fRR(g, x + 1.6, y + 6 + k * 3.2, 4.8, 1.8, 0.5, "#2f8a52"); fRR(g, x + 2, y + 19.4, 4, 0.8, 0.3, "#ff5a5a"); g.globalAlpha = 1; }
      // 일방통행 오토바이
      for (const s of scoots) { const A = nodes[s.e.a], B = nodes[s.e.b]; const fx = s.e.dir > 0 ? A.x : B.x, tx = s.e.dir > 0 ? B.x : A.x, x = fx + (tx - fx) * s.f, y = A.y + 1, d = Math.sign(tx - fx);
        g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(x + 0.4, y + 1.6, 4, 1, 0, 0, TAU); g.fill(); fRR(g, x - 3.5, y - 1.3, 7, 2.6, 1.2, "#e04848"); circ(g, x - d * 0.6, y, 1.4, "#2a2a34"); circ(g, x - d * 0.9, y - 0.3, 0.5, "#6a6e78"); circ(g, x + d * 3.4, y, 0.6, "#fff6b0"); }
      // 비
      if (rainE.length) for (const e of rainE) { const A = nodes[e.a], B = nodes[e.b], x0 = Math.min(A.x, B.x) - 8, y0 = Math.min(A.y, B.y) - 8, w = Math.abs(B.x - A.x) + 16, h = Math.abs(B.y - A.y) + 16;
        fRR(g, x0, y0, w, h, 4, "rgba(30,50,90,.18)"); g.strokeStyle = "rgba(205,228,255,.85)"; g.lineWidth = 0.4; g.lineCap = "round";
        for (let k = 0; k < 12; k++) { const ph = (TT * 1.6 + k * 0.137 + e.i * 0.31) % 1, rx = x0 + ((k * 0.618 + e.i * 0.27) % 1) * w, ry = y0 + ph * h; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 0.5, ry + 2.2); g.stroke(); } }
      // 공사 경광등
      for (const e of edges) if (e.hz === "work" && e.on) { const [x, y] = edgeMid(e), on = Math.floor(TT * 3 + e.i) % 2; circ(g, x, y - 6.6, 1.1, on ? "#ffb020" : "#a86a10"); if (on) { const rg = g.createRadialGradient(x, y - 6.6, 0.4, x, y - 6.6, 5); rg.addColorStop(0, "rgba(255,190,60,.55)"); rg.addColorStop(1, "rgba(255,190,60,0)"); g.fillStyle = rg; g.fillRect(x - 5, y - 11.6, 10, 10); } }
      // 길: 걷는 중(남은 길) → 그리는 중 → 시범
      for (const q of guests) if (q.st === "walk") drawPath(q.path.slice(q.seg), "#7fe0ff", 0.55);
      for (const q of guests) if (q.st === "wait" && q.drawn.length > 1) drawPath(q.drawn, "#ffd23f", 1);
      if (demo && demo.d > 0) { const ps = [], st = 1.5; for (let d = 0; d <= demo.d; d += st) ps.push(ptAt(demo.ps, d)); g.lineCap = "round"; g.setLineDash([0.01, 3]); tracePts(ps); g.strokeStyle = "rgba(20,22,31,.55)"; g.lineWidth = 2.2; g.stroke(); tracePts(ps); g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1.3; g.stroke(); g.setLineDash([]); }
      // 숙소 핀
      { const n = nodes[HN], by = Math.sin(TT * 5) * 1.5; pinV(g, n.x, 29.5 + by, 0.9); const [hx, hy, hw2, hh2] = cellRect(hc, 0); if (houseOpen > 0 && Math.floor(TT * 12) % 2) { circ(g, hx + hw2 / 2 + 3.1, hy + hh2 - 6, 0.8, "rgba(63,224,122,.55)"); } }
      // 손님(깊이 순서)
      [...guests].sort((a, b) => a.y - b.y).forEach(drawGuest);
      // 조각
      for (const p of parts) {
        if (p.t < 0) continue; const k = p.t / p.l, x = p.x, y = p.y;
        g.globalAlpha = clamp(1 - k, 0, 1);
        if (p.k === "heart") heartV(g, x, y, 4.2, "#ff4a6e");
        else if (p.k === "dust") circ(g, x, y, 1, "#c8a878");
        else if (p.k === "x") { g.strokeStyle = "#ff2244"; g.lineWidth = 1.2; g.lineCap = "round"; g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke(); }
        g.globalAlpha = 1;
      }
    };
    // 말풍선 위치·참을성 막대
    const bubUpd = () => {
      for (const q of guests) {
        if (q.st === "gone") { if (q.bub.style.display !== "none") q.bub.style.display = "none"; continue; }
        const hw = (q.bub.offsetWidth >> 1) + 3; q.bub.style.left = clamp(q.x * K, hw, W * K - hw) + "px"; const bh = q.bub.offsetHeight, dn = (q.y - 19) * K < bh + 2; q.bub.classList.toggle("dn", dn); q.bub.style.top = (dn ? (q.y + 5) * K + bh : (q.y - 19) * K) + "px";
        if (q.st === "wait") { q.bub.classList.toggle("sel", q === sel && waiting().length > 1); const em = q.bub.querySelector("em"); if (em) em.style.transform = `scaleX(${clamp(q.pat / q.pat0, 0, 1)})`; }
      }
    };
    let callKey = "";
    const callUpd = () => {
      const s = sel && sel.st === "wait" ? sel : waiting()[0];
      let b, t, idle = false, bar = -1;
      if (ending) { b = "오늘 안내 끝!"; t = "손님 후기가 도착했어요"; idle = true; }
      else if (s) { b = `손님${s.no ? " " + s.no : ""} 전화 · "${s.lo ? s.call.b : s.call.a}"`; t = `${s.src}에 있어요 → <em>손님을 꾹 눌러</em> 숙소 핀까지 그려요`; if (!s.tut) bar = s.pat / s.pat0; }
      else if (guests.some((q) => q.st === "walk")) { b = "손님이 걸어가는 중…"; t = spawnI < NG && tut < 0 ? "다음 전화를 기다려요" : "숙소 도착을 기다려요"; idle = true; }
      else { b = "에어씨앤씨 손님 전화"; t = tut === 3 ? "리허설 끝! 준비되면 시작" : "곧 전화가 와요…"; idle = true; }
      const fk = s && s.img && s.img.ok ? s.key + (s.lo ? "angry" : "neutral") : "";
      const k = b + t + idle + fk; if (k !== callKey) { callKey = k; callB.textContent = b; callS.innerHTML = t; call.classList.toggle("idle", idle); call.classList.toggle("face", !!fk); call.classList.toggle("lof", !!(s && s.lo)); if (fk) callFc.style.cssText = faceCss(s.key, s.lo ? "angry" : "neutral", 32); }
      callBar.style.visibility = bar >= 0 ? "" : "hidden"; if (bar >= 0) { callBarE.style.transform = `scaleX(${clamp(bar, 0, 1)})`; callBar.classList.toggle("lo", bar < 0.4); }
    };

    // ───── 흐름 ─────
    const loop = (now) => {
      if (over || !cv.isConnected) return;
      if (!last) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now; TT += dt;
      fit();
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else tutNext(1); }
        if ((tut === 1 || tut === 2) && tutG && tutG.st === "gone") { tutWait = tut + 1; tutWaitT = 0.25; tutG.bub.remove(); guests.splice(guests.indexOf(tutG), 1); tutG = null; }
        if (tutWait && (tutWaitT -= dt) <= 0) { const n = tutWait; tutWait = 0; tutNext(n); }
      } else if (!ending) {
        el += dt;
        // 손님 일정: 첫 손님 → (빨리 안내하면 더 빨리) 둘째 → 3초 뒤 셋째(겹침)
        if (spawnI === 1) spawnAt[1] = guests[0] && guests[0].commitEl != null ? clamp(guests[0].commitEl + 1.8, 3.5, 7) : 7;
        if (spawnI === 2) spawnAt[2] = spawnAt[1] + 3.2;
        if (spawnI < NG && !evDone[spawnI] && el >= spawnAt[spawnI] - 1.1) { evDone[spawnI] = true; if (spawnI === 1) workEvent(order[1]); else rainEvent(order[2]); }
        if (spawnI < NG && el >= spawnAt[spawnI]) { mkGuest(order[spawnI], { no: spawnI + 1, call: spawnI === 0 ? CALLS[0] : pick(CALLS.slice(1)), pat: (spawnI === 0 ? 17 : 14) * ez }); spawnI++; }
        if (spawnI >= NG && guests.every((q) => q.st === "gone" || (q.st === "done" && q.t > 1.2) || (q.st === "lost" && q.t > 1.6))) endSeq();
      }
      for (const q of [...guests]) stepGuest(q, dt);
      if (bus) { bus.t += dt; const n = nodes[NBUS]; if (bus.st === "in") { bus.y = n.y + 16 * (1 - clamp(bus.t / 0.55, 0, 1)); if (bus.t > 0.55) { bus.st = "stop"; bus.t = 0; noise(0.2, 2400, 0.06); } } else if (bus.st === "stop" && bus.t > 0.9) { bus.st = "out"; bus.t = 0; } else if (bus.st === "out") { bus.y = n.y - 18 * clamp(bus.t / 0.5, 0, 1); if (bus.t > 0.5) bus = null; } }
      for (const c of cars) { c.x += (c.lane ? 1 : -1) * c.sp * dt; if (c.x > W + 8) c.x = -8; if (c.x < -8) c.x = W + 8; }
      for (let k = scoots.length - 1; k >= 0; k--) { const s = scoots[k]; s.f += dt * 1.6 / Math.max(1, s.e.len / 30); if (s.f >= 1) scoots.splice(k, 1); }
      if (!scoots.length && owE.length && Math.floor(TT) % 6 === 3 && (TT % 1) < dt) scoots.push({ e: owE[0], f: 0 });
      for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.t += dt; if (p.t > 0) { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; } if (p.t > p.l) parts.splice(k, 1); }
      if (houseOpen > 0) { houseOpen -= dt; if (houseOpen <= 0) buildBG(); }
      guideUpd(); render(); bubUpd(); callUpd();
      raf = requestAnimationFrame(loop);
    };

    if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.airbnb3 = {
      st: () => ({ tut, el: +el.toFixed(2), spawnI, ending, guests: guests.map((q) => ({ no: q.no, st: q.st, q: +q.q.toFixed(2), spd: +q.spd.toFixed(2), res: q.res })) }),
      tut: () => (tut >= 0 ? Math.floor(tut) : -1),
      tutDo: () => { if ((tut === 1 || tut === 2) && tutG && tutG.st === "wait") commit(tutG, dijk(tutG.node, HN).path); else if (tut === 3) startGame(); },
      start: startGame,
      auto: () => { for (const q of waiting()) if (!q.tut) commit(q, dijk(q.node, HN).path); },
      sloppy: () => { for (const q of waiting()) if (!q.tut && TT - q.readyT > 4) { for (let t = 0; t < 400; t++) { const p = [q.node]; let n = q.node; while (n !== HN && p.length < 26) { const o = adj[n].filter((o) => o.e.hz !== "work" && !p.includes(o.j)); if (!o.length) break; n = pick(o).j; p.push(n); } if (n === HN && p.length > 9) { commit(q, p); break; } } } },
      bad: () => { for (const q of waiting()) if (!q.tut && TT - q.readyT > 5) commit(q, dijk(q.node, HN, lenCost).path); },
      optPx: () => { const q = (tut === 1 || tut === 2) ? tutG : waiting()[0]; if (!q || q.st !== "wait") return null; const r = cv.getBoundingClientRect(); return dijk(q.node, HN).path.map((i) => [r.left + nodes[i].x / W * r.width, r.top + nodes[i].y / H * r.height]); },
      map: () => ({ HN, NA, NB, NBUS, hc, stairs: stairsE.length, ow: owE.length, work: edges.filter((e) => e.hz === "work").length }),
    };
    fit(); requestAnimationFrame(fit);
    buildBG(); baseLabels(); updSc();
    void work0;
    raf = requestAnimationFrame(loop);
  },
};
