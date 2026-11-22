// After 6PM 공간 꾸미기 시안(deco) v0.1
// 쿼터뷰 도트 방에 가구를 끌어 놓고, 감성 점수·별점·가격·월 수익을 본다.
// openDeco(host, opts) → { getLayout, setLayout, getStats, setSpace, guestView, close, dbg }
// opts: { space:'pr'|'ab1'|'ab2', spaces:[...], budget, rent, layout, onChange(stats, layout), onDone(result), sound:true }
// 그림은 전부 코드로 그린 도트(정수배 확대 + pixelated). 이모지 없음.

const U = 8, WH = 40, PWH = 13; // 칸 = 8단위, 벽 높이, 칸막이 높이
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const hsh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

// ───────── 색 ─────────
function hex(c) { const n = c.replace("#", ""); return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), n.length > 6 ? parseInt(n.slice(6, 8), 16) : 255]; }
function rgb(r, g, b, a = 255) { const h = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"); return "#" + h(r) + h(g) + h(b) + (a < 255 ? h(a) : ""); }
function shade(c, f) { const [r, g, b, a] = hex(c); return f <= 1 ? rgb(r * f, g * f, b * f, a) : rgb(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1), a); }
function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); }

// ───────── 스타일·분류 ─────────
export const STYLES = [
  { k: "mo", n: "모던", sw: ["#ececf0", "#3a3d45"], pm: 1 },
  { k: "no", n: "북유럽", sw: ["#e3c79a", "#a9c4a8"], pm: 1.05 },
  { k: "vi", n: "빈티지", sw: ["#7a4a2c", "#3f6b4f"], pm: 1.15 },
  { k: "ha", n: "한옥", sw: ["#8a5632", "#34477a"], pm: 1.25 },
  { k: "in", n: "인더스트리얼", sw: ["#2c2c30", "#a0703e"], pm: 1.1 },
];
const SN = Object.fromEntries(STYLES.map((s) => [s.k, s.n]));
const PAL = {
  mo: { w: "#cfc8be", w2: "#8f8a84", f: "#ececef", f2: "#555c6a", m: "#2e3138", a: "#3f7fd9", l: "#fff4d6", bed: "#f4f4f6", bl: "#c9d3e3", cab: "#eeeeee", top: "#3a3d44" },
  no: { w: "#dcbc8c", w2: "#b8915e", f: "#efe9dd", f2: "#9fbaa0", m: "#e9e5dd", a: "#e8a37a", l: "#fff0c8", bed: "#f7f3ea", bl: "#a9c6d6", cab: "#a9bfa6", top: "#e2c9a0" },
  vi: { w: "#7c4b2c", w2: "#5a3420", f: "#3f6b4f", f2: "#cf9038", m: "#c09a44", a: "#a83c3c", l: "#ffd59a", bed: "#efe2c8", bl: "#a8503c", cab: "#9fcab4", top: "#8a5a36" },
  ha: { w: "#8c5833", w2: "#5e3820", f: "#efe4c6", f2: "#34477a", m: "#2e2622", a: "#b8352f", l: "#ffe2a8", bed: "#f6eed8", bl: "#c0443c", cab: "#94603a", top: "#dccdb0" },
  in: { w: "#94704a", w2: "#6a4c30", f: "#7c4628", f2: "#62625f", m: "#2b2b2e", a: "#c0602a", l: "#ffcf7a", bed: "#dcd8d0", bl: "#4c5866", cab: "#3c3d40", top: "#a9a8a3" },
};
export const CATS = [
  { k: "mat", n: "바닥·벽" }, { k: "bed", n: "침실" }, { k: "liv", n: "거실" }, { k: "kit", n: "주방" }, { k: "app", n: "가전" },
  { k: "bath", n: "욕실" }, { k: "light", n: "조명" }, { k: "deco", n: "소품" }, { k: "party", n: "파티" },
];

// ───────── 공간 ─────────
// zone: h 홀·거실, k 주방, b 화장실, r 침실 / seg: 칸막이(ax 축 at 위치, a~b 칸, door 비운 칸) / ent: 입구 칸 / keep: 비워 둘 칸(문 앞)
export const SPACES = {
  pr: { n: "파티룸", sub: "홀 + 주방 + 화장실", GW: 12, GH: 9, budget: 1500, rent: 190, kind: "pr",
    zone: (i, j) => (i < 4 && j < 3 ? "k" : i >= 9 && j < 3 ? "b" : "h"),
    seg: [{ ax: "y", at: 3, a: 0, b: 4, door: [2, 3] }, { ax: "x", at: 4, a: 0, b: 3, door: [] }, { ax: "x", at: 9, a: 0, b: 3, door: [] }, { ax: "y", at: 3, a: 9, b: 12, door: [10] }],
    ent: [11, 7], keep: [[2, 3], [3, 3], [10, 3], [10, 2], [11, 7]] },
  ab1: { n: "원룸", sub: "숙소 공유 · 원룸", GW: 7, GH: 6, budget: 650, rent: 75, kind: "ab",
    zone: (i, j) => (i >= 5 && j < 2 ? "b" : "h"),
    seg: [{ ax: "x", at: 5, a: 0, b: 2, door: [] }, { ax: "y", at: 2, a: 5, b: 7, door: [5] }],
    ent: [6, 4], keep: [[5, 2], [6, 4]] },
  ab2: { n: "투룸", sub: "숙소 공유 · 투룸", GW: 10, GH: 7, budget: 1000, rent: 110, kind: "ab",
    zone: (i, j) => (i < 3 && j < 2 ? "b" : i >= 6 && j < 4 ? "r" : "h"),
    seg: [{ ax: "x", at: 3, a: 0, b: 2, door: [] }, { ax: "y", at: 2, a: 0, b: 3, door: [1] }, { ax: "x", at: 6, a: 0, b: 4, door: [] }, { ax: "y", at: 4, a: 6, b: 10, door: [7] }],
    ent: [9, 5], keep: [[1, 2], [7, 4], [9, 5]] },
};

// ───────── 바닥·벽 재질 ─────────
const FLOORS = [
  { id: "base", n: "기본 바닥", st: "", rate: 0 },
  { id: "oak", n: "밝은 원목 마루", st: "no", rate: 0.8 },
  { id: "walnut", n: "짙은 원목 마루", st: "mo", rate: 1 },
  { id: "tile", n: "흰 대리석 타일", st: "mo", rate: 0.9 },
  { id: "parquet", n: "파케이 원목", st: "vi", rate: 1.1 },
  { id: "checker", n: "체크 타일", st: "vi", rate: 0.7 },
  { id: "jang", n: "콩댄 장판", st: "ha", rate: 0.9 },
  { id: "conc", n: "콘크리트 폴리싱", st: "in", rate: 0.6 },
];
const WALLS = [
  { id: "base", n: "기본 흰 벽", st: "", rate: 0 },
  { id: "beige", n: "웜 베이지 페인트", st: "no", rate: 1.6 },
  { id: "sage", n: "세이지 웨인스코팅", st: "no", rate: 2.6 },
  { id: "navy", n: "딥 네이비 페인트", st: "mo", rate: 1.6 },
  { id: "gray", n: "무광 그레이", st: "mo", rate: 1.4 },
  { id: "panel", n: "우드 패널", st: "vi", rate: 3 },
  { id: "hanji", n: "한지 벽·나무 기둥", st: "ha", rate: 3.6 },
  { id: "brick", n: "붉은 벽돌", st: "in", rate: 3 },
  { id: "cwall", n: "노출 콘크리트", st: "in", rate: 2.2 },
];
const C3 = (c) => hex(c).slice(0, 3);
const mulc = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
function floorPx(id, x, y) {
  const cx = Math.floor(x / U), cy = Math.floor(y / U);
  switch (id) {
    case "oak": case "walnut": {
      const row = Math.floor(y / 4), off = (row * 13) % 32, pl = Math.floor((x + off) / 32);
      const base = C3(id === "oak" ? "#dcb98a" : "#7d5438");
      if (y % 4 < 1) return mulc(base, 0.8);
      if ((x + off) % 32 < 1) return mulc(base, 0.84);
      const v = 0.93 + 0.1 * hsh(row, pl) + (hsh(Math.floor(x / 3), row) < 0.12 ? -0.04 : 0);
      return mulc(base, v);
    }
    case "parquet": {
      const bx = Math.floor(x / 8), by = Math.floor(y / 8), alt = (bx + by) % 2, lx = x - bx * 8, ly = y - by * 8;
      const s = alt ? Math.floor(ly / 4) : Math.floor(lx / 4), edge = alt ? ly % 4 < 1 : lx % 4 < 1;
      const base = C3("#b9824e");
      if (edge || lx < 0.8 || ly < 0.8) return mulc(base, 0.78);
      return mulc(base, 0.92 + 0.14 * hsh(bx * 3 + s, by));
    }
    case "tile": {
      if (x % 8 < 1 || y % 8 < 1) return C3("#c9c7c2");
      const v = hsh(cx, cy), vein = Math.abs(Math.sin((x + y * 0.6) * 0.35 + v * 9)) < 0.08 && hsh(Math.floor(x), Math.floor(y)) < 0.7;
      return mulc(C3("#eeede9"), (vein ? 0.9 : 1) - v * 0.03);
    }
    case "checker": { const k = (Math.floor(x / 4) + Math.floor(y / 4)) % 2; return k ? C3("#efe6d2") : C3("#3a3532"); }
    case "jang": {
      const base = C3("#dcb35a");
      if (x % 12 < 1 || y % 12 < 1) return mulc(base, 0.86);
      return mulc(base, 0.94 + 0.08 * hsh(Math.floor(x / 12), Math.floor(y / 12)) + (hsh(Math.floor(x), Math.floor(y)) < 0.05 ? -0.05 : 0));
    }
    case "conc": {
      if (x % 24 < 0.8 || y % 24 < 0.8) return C3("#86857f");
      const n = hsh(Math.floor(x), Math.floor(y)), big = hsh(Math.floor(x / 12), Math.floor(y / 12));
      return mulc(C3("#a3a29c"), 0.95 + big * 0.06 + (n < 0.06 ? -0.08 : n > 0.97 ? 0.06 : 0));
    }
    case "bath": { if (x % 4 < 0.9 || y % 4 < 0.9) return C3("#aebcc3"); return mulc(C3("#d6e3e8"), 0.97 + hsh(Math.floor(x / 4), Math.floor(y / 4)) * 0.05); }
    default: { // 기본 바닥: 밝은 회베이지 장판 + 이음매
      if (y % 16 < 0.8) return C3("#aca69b");
      return mulc(C3("#c2bcb0"), 0.97 + 0.04 * hsh(Math.floor(x / 16), Math.floor(y / 16)));
    }
  }
}
function wallPx(id, u, z) {
  const base = (c) => (z < 2.5 ? mulc(C3(c), 0.82) : C3(c));
  switch (id) {
    case "beige": return z < 2.5 ? C3("#a77c52") : C3("#e4d2b4");
    case "sage": return z < 2.5 ? C3("#7c8f76") : z < 13 ? (u % 6 < 0.8 ? C3("#8ea486") : C3("#9eb396")) : z < 14 ? C3("#eef0e6") : C3("#adc0a6");
    case "navy": return base("#334061");
    case "gray": return base("#8c8f95");
    case "panel": {
      if (z > WH - 3) return C3("#5a3620");
      const s = Math.floor(u / 4); if (u % 4 < 0.9) return C3("#5e3a22");
      return mulc(C3("#94643c"), 0.92 + 0.12 * hsh(s, 7) + (z < 2.5 ? -0.15 : 0));
    }
    case "hanji": {
      const wood = C3("#6e4426");
      if (u % 24 < 2 || z < 2.5 || (z > 19 && z < 21.5) || z > WH - 2.5) return mulc(wood, 0.95 + 0.08 * hsh(Math.floor(u / 24), Math.floor(z / 3)));
      return mulc(C3("#f0e3c2"), 0.97 + (hsh(Math.floor(u), Math.floor(z)) < 0.08 ? -0.04 : 0));
    }
    case "brick": {
      const row = Math.floor(z / 3), off = (row % 2) * 4;
      if (z % 3 < 0.9 || (u + off) % 8 < 0.9) return C3("#cfc3b4");
      return mulc(C3("#a5523b"), 0.88 + 0.2 * hsh(Math.floor((u + off) / 8), row));
    }
    case "cwall": {
      if (u % 32 < 0.8 || Math.abs((z % 13) - 0.4) < 0.5) return C3("#8d8c87");
      const hole = Math.abs((u % 16) - 8) < 1 && Math.abs((z % 13) - 6.5) < 0.8;
      if (hole) return C3("#6c6b67");
      return mulc(C3("#aeada8"), 0.95 + 0.06 * hsh(Math.floor(u / 16), Math.floor(z / 13)) + (hsh(Math.floor(u), Math.floor(z)) < 0.05 ? -0.06 : 0));
    }
    default: return base("#ebe9e4");
  }
}
const WALLMID = { base: "#ebe9e4", beige: "#e4d2b4", sage: "#adc0a6", navy: "#334061", gray: "#8c8f95", panel: "#94643c", hanji: "#f0e3c2", brick: "#a5523b", cwall: "#aeada8" };
const WALLCAP = { hanji: "#6e4426", panel: "#5a3620", brick: "#8a8378" };

// ───────── 가구 ─────────
// 빌더 (B 상자, C 원기둥, L 공, p 팔레트, s 스타일, W·D 너비·깊이(단위)). 앞면은 v = D 쪽.
const legs = (B, x0, y0, x1, y1, h, c, t = 1.5) => { B(x0, y0, 0, x0 + t, y0 + t, h, c); B(x1 - t, y0, 0, x1, y0 + t, h, c); B(x0, y1 - t, 0, x0 + t, y1, h, c); B(x1 - t, y1 - t, 0, x1, y1, h, c); };
function bed(B, C, L, p, s, W, D) {
  const pil = (z) => { const n = W >= 16 ? 2 : 1, pw = (W - 2) / n; for (let k = 0; k < n; k++) B(1.5 + k * pw, 3, z, 1 + (k + 1) * pw - 0.5, 6.5, z + 2.5, s === "ha" ? p.f2 : "#fbfbf8"); };
  if (s === "ha") {
    B(0, 0, 0, W, 1, 21, p.f); for (let u = 0; u <= W - 1; u += 4) B(u, 1, 0, u + 1, 1.8, 21, p.w); B(0, 1, 20, W, 1.8, 21.5, p.w); B(0, 1, 10, W, 1.8, 11, p.w);
    B(0, 2, 0, W, D, 1.2, p.w2); B(1, 3, 1.2, W - 1, D - 1, 4.5, p.bed); B(1, D * 0.45, 4.5, W - 1, D - 1, 5.6, "#fbf6ea"); B(1, D * 0.62, 5.6, W - 1, D * 0.62 + 1.6, 6.1, p.bl); pil(4.5); return;
  }
  if (s === "mo") { B(0.5, 1, 0, W - 0.5, D - 0.5, 4, p.m); B(0, 0, 0, W, 2, 17, p.f2); B(1, 2, 4, W - 1, D - 1, 8.5, p.bed); }
  if (s === "no") { legs(B, 0.5, 1, W - 0.5, D, 4, p.w2); B(0, 1, 3, W, D, 5, p.w); B(0, 0, 0, W, 1.5, 13, p.w); B(1, 2, 5, W - 1, D - 1, 9, p.bed); }
  if (s === "vi") { B(0, 0, 0, 2, 2, 22, p.w2); B(W - 2, 0, 0, W, 2, 22, p.w2); B(2, 0, 4, W - 2, 1.5, 17, p.w); B(2, 0, 16, W - 2, 1.5, 18.5, p.w2); B(0, 2, 2, W, D, 5, p.w); B(0, D - 2, 0, 2, D, 9, p.w2); B(W - 2, D - 2, 0, W, D, 9, p.w2); B(1, 2, 5, W - 1, D - 1, 9, p.bed); }
  if (s === "in") { legs(B, 0, 1, W, D, 4, p.m); B(0, 1, 3, W, D, 4.5, p.m); B(0, 0, 0, 1.5, 1.5, 17, p.m); B(W - 1.5, 0, 0, W, 1.5, 17, p.m); B(1.5, 0, 15, W - 1.5, 1.5, 16.5, p.m); B(1.5, 0, 9, W - 1.5, 1.5, 10.5, p.m); for (let u = 4; u < W - 2; u += 3) B(u, 0.3, 10.5, u + 1, 1.2, 15, p.m); B(1, 2, 4.5, W - 1, D - 1, 8.5, p.bed); }
  const z = s === "mo" ? 8.5 : s === "in" ? 8.5 : 9;
  B(1, D * 0.42, z, W - 1, D - 1, z + 1.2, p.bl); B(1, D * 0.42, z + 1.2, W - 1, D * 0.42 + 2, z + 1.6, shade(p.bl, 1.18)); pil(z);
}
function wardrobe(B, C, L, p, s, W, D) {
  if (s === "ha") { B(0, 1, 0, W, D, 3, p.w2); B(0, 1, 3, W, D, 27, p.w); B(0, 1, 27, W, D, 28.5, p.w2); B(1.5, D, 5, W / 2 - 0.5, D + 0.4, 25, shade(p.w, 1.12)); B(W / 2 + 0.5, D, 5, W - 1.5, D + 0.4, 25, shade(p.w, 1.12));
    for (const u of [W / 2 - 2.5, W / 2 + 0.5]) B(u, D + 0.4, 13, u + 2, D + 0.9, 17, "#c9a245"); B(2, D + 0.4, 6, 4, D + 0.8, 8, p.m); B(W - 4, D + 0.4, 6, W - 2, D + 0.8, 8, p.m); return; }
  const c = { mo: "#f0f0f0", no: p.w, vi: p.w, in: "#4d565c" }[s];
  if (s === "no") legs(B, 1, 1.5, W - 1, D - 0.5, 3, p.w2);
  const z0 = s === "no" ? 3 : 0; B(0, 1, z0, W, D, 30, c);
  if (s === "vi") { B(-0.2, 0.6, 29, W + 0.2, D + 0.4, 31.5, p.w2); B(1.5, D, 3, W / 2 - 1, D + 0.4, 27, shade(c, 1.15)); B(W / 2 + 1, D, 3, W - 1.5, D + 0.4, 27, shade(c, 1.15)); }
  if (s === "in") { for (let z = 22; z < 27; z += 1.6) { B(2, D, z, W / 2 - 2, D + 0.3, z + 0.6, "#2c3236"); B(W / 2 + 2, D, z, W - 2, D + 0.3, z + 0.6, "#2c3236"); } }
  B(W / 2 - 0.4, D, z0 + 1, W / 2 + 0.4, D + 0.3, 29, shade(c, 0.7));
  const hc = s === "mo" ? "#2e3138" : s === "vi" ? "#c09a44" : s === "in" ? "#a9a9a9" : "#8a6a44";
  B(W / 2 - 2, D, 14, W / 2 - 1, D + 0.8, 19, hc); B(W / 2 + 1, D, 14, W / 2 + 2, D + 0.8, 19, hc);
}
function nightstand(B, C, L, p, s, W, D) {
  const c = s === "mo" ? "#f0f0f0" : s === "in" ? p.m : p.w;
  if (s === "no" || s === "in") legs(B, 1, 1, W - 1, D - 1, 3, s === "in" ? p.m : p.w2, 1.2);
  const z0 = s === "no" || s === "in" ? 3 : 0; B(1, 1, z0, W - 1, D - 1, 10, c); B(1, 1, 10, W - 1, D - 1, 11, s === "in" ? "#94704a" : shade(c, 1.1));
  B(2, D - 1, z0 + 3.5, W - 2, D - 0.6, z0 + 4, shade(c, 0.7)); B(W / 2 - 1, D - 1, z0 + 5, W / 2 + 1, D - 0.2, z0 + 6, s === "ha" ? "#c9a245" : "#888");
  if (s === "ha") { B(1, 1, 0, W - 1, D - 1, 1.2, p.w2); }
  C(5.5, 3.5, 1.6, 11, 13, s === "vi" ? "#3f6b4f" : "#e8e4dc"); // 작은 화병
}
function sofa(B, C, L, p, s, W, D) {
  const seg = (z, c) => { const n = Math.max(1, Math.round(W / 8)), w = W / n; for (let k = 0; k < n; k++) B(k * w + (k ? 0.4 : 1.6), 2.6, z, (k + 1) * w - (k < n - 1 ? 0.4 : 1.6), D - 0.6, z + 1.6, c); };
  if (s === "mo") { B(0.5, 0.5, 0, W - 0.5, D - 0.5, 1.5, p.m); B(0, 0, 1.5, W, D, 5, p.f2); B(0, 0, 5, W, 2.6, 12, p.f2); B(0, 0, 5, 1.6, D, 8, shade(p.f2, 0.92)); B(W - 1.6, 0, 5, W, D, 8, shade(p.f2, 0.92)); seg(5, shade(p.f2, 1.15)); B(2.5, 2.6, 6.6, 5.5, 3.4, 10, "#e8e8ec"); }
  if (s === "no") { legs(B, 0.5, 0.5, W - 0.5, D - 0.5, 3, p.w2, 1.2); B(0, 0, 3, W, D, 6, p.f2); B(0, 0, 6, W, 2.4, 13, p.f2); B(0, 0.5, 6, 1, D, 9, p.w); B(W - 1, 0.5, 6, W, D, 9, p.w); seg(6, shade(p.f2, 1.12)); B(W - 5.5, 2.4, 7.6, W - 2.5, 3.2, 11, p.a); }
  if (s === "vi") { B(0.5, 0.5, 0, 1.6, 1.6, 1.5, p.m); B(W - 1.6, D - 1.6, 0, W - 0.5, D - 0.5, 1.5, p.m); B(0, 0, 1.5, W, D, 6, p.f); B(0, 0, 6, W, 3, 13, p.f); B(0, 0, 6, 2, D, 11, shade(p.f, 1.1)); B(W - 2, 0, 6, W, D, 11, shade(p.f, 1.1)); for (let u = 4; u < W - 3; u += 4) B(u, 3, 9, u + 0.8, 3.3, 10, shade(p.f, 0.75)); seg(6, shade(p.f, 1.08)); B(2.6, 3, 7.6, 6, 3.8, 11, p.f2); }
  if (s === "ha") { B(0, 0, 0, W, D, 2.5, p.w); B(0.5, 0.5, 2.5, W - 0.5, D - 0.5, 4.5, p.f2); B(0.5, 0.5, 4.5, W - 0.5, 3, 11, p.f); B(0.5, 0.5, 11, W - 0.5, 3, 12, p.f2); C(2.5, 5.5, 1.8, 4.5, 7.6, p.a); C(W - 2.5, 5.5, 1.8, 4.5, 7.6, p.a); }
  if (s === "in") { B(0.5, 0.5, 0, 2, 2, 2, p.m); B(W - 2, D - 2, 0, W - 0.5, D - 0.5, 2, p.m); B(W - 2, 0.5, 0, W - 0.5, 2, 2, p.m); B(0.5, D - 2, 0, 2, D - 0.5, 2, p.m); B(0, 0, 2, W, D, 6, p.f); B(0, 0, 6, W, 2.8, 13, p.f); B(0, 0, 6, 1.8, D, 9.5, shade(p.f, 0.9)); B(W - 1.8, 0, 6, W, D, 9.5, shade(p.f, 0.9)); seg(6, shade(p.f, 1.12)); }
}
function armchair(B, C, L, p, s, W, D) {
  if (s === "ha") { B(0.5, 0.5, 0, W - 0.5, D - 0.5, 2.5, p.f2); B(1, 1, 2.5, W - 1, 2.5, 9, p.f); B(1, 1, 9, W - 1, 2.5, 10, p.f2); B(2, 4, 2.5, W - 2, D - 1.5, 3.2, p.a); return; }
  const c = { mo: p.f, no: p.f2, vi: p.f2, in: p.f }[s];
  if (s === "no" || s === "mo") legs(B, 1, 1, W - 1, D - 1, 3.5, s === "no" ? p.w2 : p.m, 1.1); else B(1, 1, 0, W - 1, D - 1, 2, s === "vi" ? p.w2 : p.m);
  const z = s === "no" || s === "mo" ? 3.5 : 2; B(0.5, 0.5, z, W - 0.5, D - 0.5, z + 3, c); B(0.5, 0.5, z + 3, W - 0.5, 2.5, z + 11, c);
  B(0.5, 2.5, z + 3, 1.6, D - 0.5, z + 6, shade(c, 0.9)); B(W - 1.6, 2.5, z + 3, W - 0.5, D - 0.5, z + 6, shade(c, 0.9)); B(1.6, 2.5, z + 3, W - 1.6, D - 0.8, z + 4.2, shade(c, 1.12));
}
function ctable(B, C, L, p, s, W, D) {
  if (s === "mo") { B(3, 2, 0, W - 3, D - 2, 5, p.m); B(0, 1, 5, W, D - 1, 6.5, "#f3f3f1"); B(4, 3, 6.5, 7, 5, 7.5, "#3f7fd9"); }
  if (s === "no") { legs(B, 1, 1.5, W - 1, D - 1.5, 5, p.w2, 1.1); B(0, 1, 5, W, D - 1, 6.3, p.w); C(W - 4, 4, 1.6, 6.3, 9, "#efe9dd"); L(W - 4, 4, 10.5, 2, "#7da36f"); }
  if (s === "vi") { B(0.5, 1, 0, 2, 2.5, 5, p.w2); B(W - 2, D - 2.5, 0, W - 0.5, D - 1, 5, p.w2); B(W - 2, 1, 0, W - 0.5, 2.5, 5, p.w2); B(0.5, D - 2.5, 0, 2, D - 1, 5, p.w2); B(0, 0.5, 5, W, D - 0.5, 7, p.w); B(2, D - 0.5, 5.5, W - 2, D - 0.2, 6.5, shade(p.w, 0.7)); B(3, 3, 7, 7, 5.5, 8.5, p.a); }
  if (s === "ha") { B(1, 1.5, 0, 2.5, 3, 3.5, p.w2); B(W - 2.5, D - 3, 0, W - 1, D - 1.5, 3.5, p.w2); B(W - 2.5, 1.5, 0, W - 1, 3, 3.5, p.w2); B(1, D - 3, 0, 2.5, D - 1.5, 3.5, p.w2); B(0, 0.5, 3.5, W, D - 0.5, 5, p.w); C(5, 4, 1.5, 5, 7, "#e9e4d6"); C(8.5, 4, 1.2, 5, 6.5, "#e9e4d6"); }
  if (s === "in") { B(0.5, 1, 0, W - 0.5, 2, 1, p.m); B(0.5, D - 2, 0, W - 0.5, D - 1, 1, p.m); B(0.5, 1, 0, 1.5, D - 1, 5, p.m); B(W - 1.5, 1, 0, W - 0.5, D - 1, 5, p.m); B(0, 0.5, 5, W, D - 0.5, 6.8, p.w); for (let u = 4; u < W; u += 4) B(u, 0.5, 6.8, u + 0.6, D - 0.5, 6.9, shade(p.w, 0.8)); }
}
function rug(B, C, L, p, s, W, D) {
  const z = 0.6, t = (u0, v0, u1, v1, c) => B(u0, v0, z, u1, v1, z + 0.2, c);
  if (s === "mo") { B(1, 1, 0, W - 1, D - 1, z, "#9aa0aa"); t(2, 2, W - 2, 3, "#e8e8ec"); t(2, D - 3, W - 2, D - 2, "#e8e8ec"); }
  if (s === "no") { B(1, 1, 0, W - 1, D - 1, z, "#efe7d8"); for (let k = 3; k < W - 2; k += 4) t(k, 3, k + 1.5, D - 3, "#c9b28a"); }
  if (s === "vi") { B(1, 1, 0, W - 1, D - 1, z, "#8e2f2a"); t(2, 2, W - 2, 3, "#d8b25a"); t(2, D - 3, W - 2, D - 2, "#d8b25a"); t(2, 3, 3, D - 3, "#d8b25a"); t(W - 3, 3, W - 2, D - 3, "#d8b25a"); t(W / 2 - 2, D / 2 - 2, W / 2 + 2, D / 2 + 2, "#2f4a6a"); }
  if (s === "ha") { B(1, 1, 0, W - 1, D - 1, z, "#d6be7a"); for (let v = 3; v < D - 1; v += 2) t(1, v, W - 1, v + 0.5, "#b89c58"); t(1, 1, W - 1, 2, "#3a3a4a"); t(1, D - 2, W - 1, D - 1, "#3a3a4a"); }
  if (s === "in") { B(1, 1, 0, W - 1, D - 1, z, "#4a4a4c"); t(3, 3, W - 3, D - 3, "#5c5c5f"); }
}
function shelf(B, C, L, p, s, W, D) {
  const c = s === "mo" ? "#f0f0f0" : s === "in" ? p.m : p.w, bc = ["#c0443c", "#3f7fd9", "#e8c25a", "#5f9a6a", "#8a5ab0", "#e8e4dc"];
  const side = s === "in" ? 1 : 1.2;
  B(0.5, 1, 0, 0.5 + side, D - 1, 28, c); B(W - 0.5 - side, 1, 0, W - 0.5, D - 1, 28, c); B(0.5, 1, 0, W - 0.5, 1.8, 28, s === "in" ? "#54453a" : shade(c, 0.85));
  for (const z of [0, 9, 18, 27]) B(0.5, 1, z, W - 0.5, D - 1, z + 1, s === "in" ? "#94704a" : c);
  for (const z of [1, 10, 19]) { let u = 0.5 + side + 0.2; let k = (z * 7) % 6; while (u < W - 2.5) { const bw = 1.1 + ((k * 3) % 3) * 0.3, bh = 5 + (k % 3); B(u, 2.2, z, u + bw, D - 1.6, z + bh, bc[k % 6]); u += bw + 0.15; k++; } }
}
function counter(B, C, L, p, s, W, D) {
  if (s === "ha") { B(0, 0, 0, W, D, 11, p.cab); B(0, 0, 11, W, D, 12.5, p.top); for (let u = 1; u < W; u += W / 2) B(u, D, 1, u + W / 2 - 2, D + 0.4, 10, shade(p.cab, 1.15)); B(W / 2 - 3, D + 0.4, 6, W / 2 - 1, D + 0.9, 7, "#c9a245"); B(W - 3, D + 0.4, 6, W - 1, D + 0.9, 7, "#c9a245"); }
  else { B(0, 0, 0, W, D, 11, p.cab); B(0, 0, 11, W, D, 12.5, p.top); B(W / 2 - 0.3, D, 1, W / 2 + 0.3, D + 0.3, 10, shade(p.cab, 0.7)); B(0.8, D, 0, W - 0.8, D + 0.2, 1, shade(p.cab, 0.55)); B(W / 2 - 2.5, D, 8, W / 2 - 1, D + 0.8, 9, s === "vi" ? "#c09a44" : "#9a9a9a"); B(W / 2 + 1, D, 8, W / 2 + 2.5, D + 0.8, 9, s === "vi" ? "#c09a44" : "#9a9a9a"); }
  B(3, 1.6, 12.5, 9, 6, 12.7, "#8f9aa3"); B(3.6, 2.2, 12.7, 8.4, 5.4, 12.8, "#b8c6cf"); B(5.5, 0.4, 12.5, 6.5, 1.4, 17, "#b8bcc2"); B(5.5, 0.4, 16, 6.5, 3, 17, "#b8bcc2");
  C(12.5, 4, 1.6, 12.5, 15, s === "vi" ? "#a83c3c" : "#e8e4dc");
}
function stove(B, C, L, p, s, W, D) {
  B(0, 0, 0, W, D, 11, p.cab); B(0, 0, 11, W, D, 12.3, s === "ha" || s === "vi" ? "#2a2a2c" : "#1c1d22");
  B(1, 1, 12.3, 3.6, 3.6, 12.5, "#5c5f66"); B(4.4, 4.4, 12.3, 7, 7, 12.5, "#5c5f66"); B(4.4, 1, 12.3, 7, 3.6, 12.5, "#7a3a2a");
  B(1, D, 2, W - 1, D + 0.3, 9, s === "mo" ? "#2a2c32" : shade(p.cab, 0.8)); B(2, D + 0.3, 8, W - 2, D + 0.8, 8.8, "#b8bcc2");
  if (s !== "ha") { C(2.3, 5.5, 1.6, 12.5, 15, s === "vi" ? "#cf9038" : "#c0c4ca"); B(1.2, 5.5, 14.6, 1.8, 6, 15, "#333"); }
  else { C(2.3, 5.5, 2, 12.5, 15.5, "#3a3a3a"); }
}
function dtable(B, C, L, p, s, W, D) {
  if (s === "mo") { B(1, 3, 0, 2, 5, 9, p.m); B(W - 2, 3, 0, W - 1, 5, 9, p.m); B(1, 3, 0, W - 1, 5, 1, p.m); B(0, 0.5, 9, W, D - 0.5, 10.2, "#f4f4f2"); }
  if (s === "no") { legs(B, 1, 1, W - 1, D - 1, 9, p.w2, 1.2); B(0, 0.5, 9, W, D - 0.5, 10.2, p.w); C(W / 2, 4, 1.4, 10.2, 12.5, "#e8e4dc"); L(W / 2, 4, 13.6, 1.6, "#e8a37a"); }
  if (s === "vi") { for (const [u, v] of [[1, 1], [W - 2.5, 1], [1, D - 2.5], [W - 2.5, D - 2.5]]) { C(u + 0.75, v + 0.75, 0.9, 0, 9, p.w2); } B(0, 0, 9, W, D, 10.8, p.w); B(1, D - 0.2, 8, W - 1, D, 9, p.w2); B(3, 2, 10.8, W - 3, D - 2, 11, "#efe2c8"); }
  if (s === "ha") { B(0.5, 1, 0, 2, 2.5, 5, p.w2); B(W - 2, D - 2.5, 0, W - 0.5, D - 1, 5, p.w2); B(W - 2, 1, 0, W - 0.5, 2.5, 5, p.w2); B(0.5, D - 2.5, 0, 2, D - 1, 5, p.w2); B(0, 0.5, 5, W, D - 0.5, 6.5, p.w); B(2, 2, 6.5, 5, 4, 7.5, "#e9e4d6"); B(7, 3, 6.5, 9.5, 5.5, 8, "#a8503c"); B(11, 2, 6.5, 14, 4, 7.5, "#e9e4d6"); }
  if (s === "in") { B(1, 1, 0, 2, D - 1, 9, p.m); B(W - 2, 1, 0, W - 1, D - 1, 9, p.m); B(1, 1, 0, 2, D - 1, 1, p.m); B(0, 0, 9, W, D, 10.8, p.w); for (let u = 4; u < W; u += 4) B(u, 0, 10.8, u + 0.6, D, 10.9, shade(p.w, 0.78)); }
}
function chair(B, C, L, p, s, W, D) {
  if (s === "ha") { B(1, 1, 0, W - 1, D - 1, 2, p.f2); B(1.5, 1.5, 2, W - 1.5, D - 1.5, 2.6, p.f); B(3, 3, 2.6, W - 3, D - 3, 3, p.a); return; }
  const c = { mo: "#f2f2f2", no: p.w, vi: p.w2, in: p.m }[s], seat = { mo: "#f2f2f2", no: p.w, vi: p.f, in: p.w }[s];
  legs(B, 1.5, 1.5, W - 1.5, D - 1.5, 6, c, 1.1); B(1.2, 1.2, 6, W - 1.2, D - 1.2, 7.4, seat); B(1.2, 1.2, 7.4, W - 1.2, 2.4, 15, c);
  if (s === "no") { B(1.2, 1.2, 10, W - 1.2, 2.4, 10.4, "#00000000"); }
  if (s === "vi") B(2, 1.4, 9, W - 2, 2.6, 13.5, p.f);
}
function island(B, C, L, p, s, W, D) {
  const c = s === "mo" ? "#eeeeee" : s === "in" ? "#3c3d40" : s === "vi" ? "#9fcab4" : p.w;
  B(0.5, 0, 0, W - 0.5, D - 3, 12, c); B(0, 0, 12, W, D, 13.5, s === "mo" ? "#f4f4f2" : s === "in" ? "#a9a8a3" : s === "ha" ? "#dccdb0" : p.w2);
  for (const u of [2.5, W - 5.5]) { C(u + 1.5, D + 0, 1.6, 0, 9, s === "in" ? p.m : s === "vi" ? "#c09a44" : "#bfbfbf"); C(u + 1.5, D, 2.4, 9, 10.5, s === "vi" ? "#a83c3c" : s === "no" ? p.w : s === "ha" ? p.f2 : s === "in" ? p.f : "#2e3138"); }
  C(W / 2, 3, 1.5, 13.5, 16, "#e9e4d6"); L(W / 2, 3, 17, 1.4, "#d84a4a");
}
function cabinet(B, C, L, p, s, W, D) {
  const c = s === "mo" ? "#f0f0f0" : s === "in" ? p.m : s === "no" ? p.w : p.w;
  if (s === "no") legs(B, 1, 1.5, W - 1, D - 1, 3, p.w2, 1.1);
  const z0 = s === "no" ? 3 : 0; B(0.5, 1, z0, W - 0.5, D - 0.5, 25, c); B(0.5, 1, 25, W - 0.5, D - 0.5, 26.5, shade(c, s === "in" ? 1.6 : 0.85));
  B(1.5, D - 0.5, z0 + 11, W - 1.5, D - 0.3, 24, s === "ha" ? "#efe4c6" : "#bfdde6");
  for (const z of [z0 + 13, z0 + 18.5]) { B(2, D - 2, z, W - 2, D - 0.6, z + 0.5, shade(c, 0.9)); for (let u = 2.3; u < W - 2.5; u += 1.9) B(u, D - 1.8, z + 0.5, u + 1.5, D - 1, z + 3.6, ["#f4f4f2", "#e8c25a", "#9fc0d8"][Math.round(u) % 3]); }
  B(1.5, D - 0.5, z0 + 1, W - 1.5, D - 0.3, z0 + 10, shade(c, 1.12));
}
function fridge(B, C, L, p, s, W, D) {
  const c = { mo: "#c7cbd1", no: "#f3f2ee", vi: "#a9d8c4", ha: "#a87a4e", in: "#8d9196" }[s], hd = s === "vi" ? "#e6e6e6" : s === "ha" ? "#c9a245" : "#5a5d62";
  if (s === "vi") { B(0.8, 1, 0, W - 0.8, D - 0.5, 1.5, "#888"); B(0.5, 1, 1.5, W - 0.5, D - 0.5, 26, c); B(1, 1.4, 26, W - 1, D - 1, 27.2, c); }
  else B(0.5, 1, 0, W - 0.5, D - 0.5, 28, c);
  B(0.5, D - 0.5, 17, W - 0.5, D - 0.2, 17.6, shade(c, 0.72)); B(W - 2.2, D - 0.2, 19, W - 1.4, D + 0.6, 25, hd); B(W - 2.2, D - 0.2, 9, W - 1.4, D + 0.6, 15.5, hd);
  if (s === "ha") { B(1.2, D - 0.2, 2, W - 3, D, 16, shade(c, 1.1)); B(1.2, D - 0.2, 18.5, W - 3, D, 27, shade(c, 1.1)); }
  if (s === "mo") B(1.5, D - 0.2, 21, 3.5, D, 24, "#3b4a66");
}
function tv(B, C, L, p, s, W, D) {
  if (s === "vi") { B(0, 1, 0, W, D - 1, 6, p.w); legs(B, 0.5, 1, W - 0.5, D - 1, 0.1, p.w2); B(3, 1.5, 6, 13, 6.5, 15, p.w2); B(4.2, 6.5, 7.2, 10.5, 6.8, 13.8, "#4d6b5a"); B(4.8, 6.8, 9, 6, 6.9, 12, "#7a9a86"); B(11, 6.5, 9, 12.4, 7, 10.4, "#c09a44"); B(11, 6.5, 11.5, 12.4, 7, 12.9, "#c09a44"); B(6, 3, 15, 6.5, 3.5, 20, "#888"); B(9, 3, 15, 9.5, 3.5, 20, "#888"); return; }
  const cab = { mo: "#f0f0f0", no: p.w, ha: p.w, in: p.m }[s];
  if (s === "no" || s === "in") legs(B, 1, 1, W - 1, D - 1, 2.5, s === "in" ? p.m : p.w2, 1.1);
  const z0 = s === "no" || s === "in" ? 2.5 : 0; B(0, 1, z0, W, D - 1, z0 + 5, cab); B(1, D - 1, z0 + 1, W / 2 - 0.4, D - 0.8, z0 + 4, shade(cab, 1.12)); B(W / 2 + 0.4, D - 1, z0 + 1, W - 1, D - 0.8, z0 + 4, shade(cab, 1.12));
  if (s === "in") B(0, 1, z0 + 5, W, D - 1, z0 + 5.6, "#94704a");
  const zt = z0 + 5.6; B(W / 2 - 1.5, 3, zt, W / 2 + 1.5, 4.5, zt + 1, "#222"); B(W / 2 - 0.5, 3.5, zt, W / 2 + 0.5, 4.2, zt + 3, "#222");
  B(0.5, 3.4, zt + 3, W - 0.5, 4.3, zt + 13, "#17181c"); B(1, 4.3, zt + 3.5, W - 1, 4.4, zt + 12.5, "#25344e"); B(1.5, 4.4, zt + 9, 5, 4.45, zt + 12, "#3b5a86");
}
function washer(B, C, L, p, s, W, D) {
  const c = { mo: "#eeeff1", no: "#f3f2ee", vi: "#e9dcc0", ha: "#f0ece2", in: "#7d8186" }[s];
  B(0.5, 0.5, 0, W - 0.5, D - 0.5, 14, c); B(0.5, 0.5, 14, W - 0.5, D - 0.5, 14.5, shade(c, 0.9)); B(1, D - 0.5, 11.5, W - 1, D - 0.3, 13.5, shade(c, 0.85));
  B(2, D - 0.5, 2.5, W - 2, D - 0.2, 9.5, "#4a4f58"); B(2.6, D - 0.2, 3.2, W - 2.6, D - 0.1, 8.8, "#8fb4d6"); B(3, D - 0.1, 6.5, 4.5, D, 8, "#d5e6f4");
  B(W - 3, D - 0.3, 12, W - 1.8, D + 0.2, 13, "#5a5d62");
  if (s === "ha" || s === "vi") B(0.5, 0.5, 14.5, W - 0.5, D - 0.5, 16, s === "ha" ? p.w : p.w); // 위 원목 상판
}
function aircon(B, C, L, p, s, W, D) {
  const c = { mo: "#f2f2f3", no: "#f0ede6", vi: "#e9dcc0", ha: "#efe4c6", in: "#4a4d52" }[s];
  B(1.5, 1.5, 0, W - 1.5, D - 1.5, 27, c); B(1.5, 1.5, 27, W - 1.5, D - 1.5, 27.5, shade(c, 0.9));
  for (let z = 17; z < 25.5; z += 1.5) B(2.2, D - 1.5, z, W - 2.2, D - 1.3, z + 0.6, shade(c, 0.72));
  B(2.5, D - 1.5, 12, W - 2.5, D - 1.3, 14, "#3c7fd4"); B(3, D - 1.3, 12.6, 4, D - 1.2, 13.4, "#9fe7ff");
  if (s === "ha") { B(1.5, D - 1.4, 2, W - 1.5, D - 1.2, 10, p.w); for (let u = 2; u < W - 1.5; u += 1.6) B(u, D - 1.2, 2, u + 0.5, D - 1.1, 10, p.w2); }
  if (s === "vi") B(1.5, 1.5, 0, W - 1.5, D - 1.5, 2, p.w);
}
function speaker(B, C, L, p, s, W, D) {
  const c = { mo: "#1f2126", no: p.w, vi: p.w, ha: p.w2, in: p.m }[s], g = s === "no" ? "#d6d0c4" : s === "vi" ? "#c9b48a" : "#2a2a2e";
  B(1, 1.5, 0, W - 1, D - 1.5, 20, c); B(1.5, D - 1.5, 1, W - 1.5, D - 1.3, 19, g);
  B(2.6, D - 1.3, 3, W - 2.6, D - 1.1, 9, "#121214"); B(3.4, D - 1.1, 4, W - 3.4, D - 1, 8, "#3a3a40"); B(3.2, D - 1.3, 12, W - 3.2, D - 1.1, 16, "#121214"); B(3.8, D - 1.1, 13, W - 3.8, D - 1, 15, "#4a4a52");
  if (s === "ha") B(1, 1.5, 20, W - 1, D - 1.5, 21, p.w);
}
function toilet(B, C, L, p, s, W, D) {
  const c = s === "vi" ? "#f2ead8" : "#f6f6f4", lid = s === "ha" || s === "vi" ? p.w : s === "in" ? "#3a3a3c" : "#f6f6f4";
  B(1.5, 0.5, 5, W - 1.5, 3.2, 13, c); B(1.2, 0.3, 13, W - 1.2, 3.4, 14, lid); B(W / 2 - 1, 0.3, 12, W / 2 + 1, 0.6, 12.5, "#bbb");
  C(W / 2, 4.6, 2.2, 0, 5, shade(c, 0.95)); C(W / 2, 4.6, 2.8, 5, 6.3, lid);
}
function basin(B, C, L, p, s, W, D) {
  const cab = { mo: "#f0f0f0", no: p.w, vi: "#3f6b4f", ha: p.w, in: p.m }[s];
  if (s === "mo" || s === "in") B(1, 1, 3, W - 1, D - 2, 10, cab); else B(1, 1, 0, W - 1, D - 2, 10, cab);
  if (s === "in") { B(1, 1, 0, 2, 2, 3, p.m); B(W - 2, D - 3, 0, W - 1, D - 2, 3, p.m); }
  B(1, D - 2, 1, W - 1, D - 1.8, 9, shade(cab, 1.12)); B(0.5, 0.5, 10, W - 0.5, D - 1.5, 11, s === "in" ? "#a9a8a3" : s === "ha" ? "#dccdb0" : "#e9e9e6");
  C(W / 2, 4, 2.2, 11, 12.5, "#f8f8f8"); C(W / 2, 4, 1.4, 12.4, 12.6, "#b8d4dd"); B(W / 2 - 0.4, 0.8, 11, W / 2 + 0.4, 1.6, 15, "#b8bcc2"); B(W / 2 - 0.4, 0.8, 14.2, W / 2 + 0.4, 2.8, 15, "#b8bcc2");
}
function tub(B, C, L, p, s, W, D) {
  if (s === "vi") { for (const [u, v] of [[1, 1], [W - 2, 1], [1, D - 2], [W - 2, D - 2]]) B(u, v, 0, u + 1.2, v + 1.2, 2, "#c09a44"); B(0, 0, 2, W, D, 9, "#f2ead8"); B(0, 0, 2, W, D, 4, "#3f6b4f"); }
  else if (s === "ha") { B(0, 0, 0, W, D, 9, "#c9a06a"); for (let u = 2; u < W; u += 2.5) B(u, D, 0.5, u + 0.4, D + 0.15, 8.5, "#a07a48"); B(0, D, 2, W, D + 0.2, 3, "#3a2a20"); B(0, D, 6.5, W, D + 0.2, 7.5, "#3a2a20"); }
  else if (s === "in") B(0, 0, 0, W, D, 9, "#a9a8a3");
  else B(0, 0, 0, W, D, 9, s === "no" ? "#f6f5f0" : "#f8f8f8");
  B(1.2, 1.2, 9, W - 1.2, D - 1.2, 9.2, "#9fd3e6"); B(2, 1.6, 9.2, 6, 2.6, 9.3, "#d6f1fa"); B(W - 3.5, 0.6, 9, W - 2.5, 1.4, 13, "#b8bcc2");
  C(W - 5, 4, 1, 9.2, 10.4, "#ffe08a"); // 고무 오리 대신 노란 입욕제
}
function shower(B, C, L, p, s, W, D) {
  B(0, 0, 0, W, D, 1.5, s === "ha" ? p.w : "#e9eef0"); B(1, 1, 1.5, W - 1, D - 1, 1.7, "#c9d6dc");
  const fr = s === "in" || s === "mo" ? "#2e3138" : s === "vi" ? "#c09a44" : s === "ha" ? p.w2 : "#d8d8d8";
  B(W - 1, 0, 1.5, W, D, 26, "#cfe8f0aa"); B(0, D - 1, 1.5, W - 1, D, 26, "#cfe8f0aa"); B(W - 1, D - 1, 1.5, W, D, 26, fr); B(0, D - 1, 25, W, D, 26, fr); B(W - 1, 0, 25, W, D, 26, fr);
  B(1, 1, 1.5, 1.8, 1.8, 23, "#b8bcc2"); B(1, 1, 22, 4, 1.8, 23, "#b8bcc2"); C(4, 1.8, 1.2, 20.5, 22, "#9aa0a6");
}
function towel(B, C, L, p, s, W, D) {
  const c = { mo: "#f0f0f0", no: p.w, vi: p.w, ha: p.w, in: p.m }[s], tw = s === "ha" ? ["#efe4c6", "#34477a", "#efe4c6"] : s === "vi" ? ["#cf9038", "#efe2c8", "#3f6b4f"] : ["#f8f8f8", "#c9d3e3", "#f8f8f8"];
  B(1.5, 1.5, 0, 2.6, D - 1.5, 22, c); B(W - 2.6, 1.5, 0, W - 1.5, D - 1.5, 22, c);
  [1, 8, 15].forEach((z, k) => { B(1.5, 1.5, z, W - 1.5, D - 1.5, z + 0.9, c); B(2.8, 2, z + 0.9, W - 2.8, D - 2, z + 4.2, tw[k]); B(2.8, 2, z + 2.4, W - 2.8, D - 2, z + 2.8, shade(tw[k], 0.85)); });
  B(1.5, 1.5, 22, W - 1.5, D - 1.5, 23, c); C(W / 2, 4, 1, 23, 25, "#9fc0d8");
}
function flamp(B, C, L, p, s, W, D) {
  const cx = W / 2, cy = D / 2;
  if (s === "mo") { C(cx, cy, 2, 0, 0.8, p.m); B(cx - 0.4, cy - 0.4, 0.8, cx + 0.4, cy + 0.4, 22, p.m); C(cx, cy, 2.6, 21, 25, "#1f2126"); C(cx, cy, 1.6, 20.6, 21, p.l); }
  if (s === "no") { for (const [u, v] of [[cx - 2.5, cy + 1.5], [cx + 1.5, cy + 1.5], [cx - 0.5, cy - 2.5]]) B(u, v, 0, u + 1, v + 1, 14, p.w2); C(cx, cy, 2.8, 14, 17, p.f); C(cx, cy, 3.2, 17, 20, p.f); }
  if (s === "vi") { C(cx, cy, 2, 0, 1, p.m); B(cx - 0.4, cy - 0.4, 1, cx + 0.4, cy + 0.4, 18, p.m); C(cx, cy, 3.2, 18, 21, p.f2); C(cx, cy, 2.6, 21, 23, p.f2); B(cx - 0.3, cy + 2, 18, cx + 0.3, cy + 2.4, 16, p.m); }
  if (s === "ha") { B(cx - 2, cy - 2, 0, cx + 2, cy + 2, 1.5, p.w2); B(cx - 0.5, cy - 0.5, 1.5, cx + 0.5, cy + 0.5, 12, p.w2); B(cx - 2.6, cy - 2.6, 12, cx + 2.6, cy + 2.6, 21, "#fff1cf"); for (const z of [12, 16.4, 20.4]) B(cx - 2.7, cy - 2.7, z, cx + 2.7, cy + 2.7, z + 0.7, p.w2); B(cx - 2.7, cy - 2.7, 12, cx - 2, cy - 2, 21, p.w2); B(cx + 2, cy + 2, 12, cx + 2.7, cy + 2.7, 21, p.w2); B(cx + 2, cy - 2.7, 12, cx + 2.7, cy - 2, 21, p.w2); B(cx - 2.7, cy + 2, 12, cx - 2, cy + 2.7, 21, p.w2); }
  if (s === "in") { for (const [u, v] of [[cx - 3, cy + 2], [cx + 2, cy + 2], [cx - 0.5, cy - 3]]) B(u, v, 0, u + 1, v + 1, 15, p.m); B(cx - 0.5, cy - 0.5, 14, cx + 0.5, cy + 0.5, 18, p.m); C(cx + 1, cy + 1, 2.6, 18, 22, p.m); C(cx + 1, cy + 1, 1.4, 17.4, 18, "#ffd27a"); }
}
function tlamp(B, C, L, p, s, W, D) {
  nightstand(B, () => 0, L, p, s, W, D);
  const cx = 4, cy = 4, sh = { mo: "#ececec", no: p.f, vi: p.f2, ha: "#fff1cf", in: p.m }[s];
  C(cx, cy, 1.3, 11, 12, s === "vi" ? p.m : "#5a5d62"); B(cx - 0.3, cy - 0.3, 12, cx + 0.3, cy + 0.3, 15, s === "vi" ? p.m : "#5a5d62"); C(cx, cy, 2.2, 15, 18.5, sh);
}
function wlamp(B, C, L, p, s, W, D) { // 벽 조명: u 벽 따라, v 벽에서 나옴, z 높이
  const m = s === "vi" ? p.m : s === "no" ? p.w2 : s === "ha" ? p.w2 : p.m;
  B(3, 0, 20, 5, 0.8, 24, m); B(3.6, 0.8, 22, 4.4, 3.2, 22.8, m);
  if (s === "ha") { B(2.2, 2.2, 17, 5.8, 5.2, 23, "#fff1cf"); B(2.1, 2.1, 22.4, 5.9, 5.3, 23.2, p.w2); B(2.1, 2.1, 17, 5.9, 5.3, 17.6, p.w2); }
  else if (s === "in") { C(4, 4, 1.8, 18.5, 22, p.m); C(4, 4, 1.1, 17.8, 18.5, "#ffd27a"); }
  else C(4, 3.5, 2, 19, 22.4, s === "mo" ? "#1f2126" : s === "no" ? p.f : p.f2);
}
function stringl(B, C, L, p, s, W, D) {
  const cols = s === "ha" ? ["#ffe2a8", "#ff9f7a", "#ffe2a8"] : s === "in" ? ["#ffcf7a"] : s === "vi" ? ["#ffd59a", "#ff8a5c", "#9fe0a0"] : ["#fff4d6", "#ffe8b0"];
  for (let u = 0; u < W; u += 1) { const z = 34 - Math.sin((u / W) * Math.PI * 2) * 2.2 - Math.sin((u / W) * Math.PI) * 1.5; B(u, 0.2, z, u + 1, 0.8, z + 0.6, "#3a3a3a"); }
  for (let k = 0; k < 6; k++) { const u = 1 + k * (W - 2) / 5, z = 34 - Math.sin((u / W) * Math.PI * 2) * 2.2 - Math.sin((u / W) * Math.PI) * 1.5; B(u - 0.6, 0.4, z - 2.2, u + 0.6, 1.6, z, cols[k % cols.length]); }
}
function arch(B, C, L, p, s, W, D) {
  const m = s === "no" ? p.w2 : s === "vi" ? p.m : s === "ha" ? p.w2 : p.m;
  B(0.5, 0.5, 0, 4, 4, 2, s === "mo" ? "#f3f3f1" : s === "ha" ? p.w : "#3a3a3c"); B(1.6, 1.6, 2, 2.6, 2.6, 26, m);
  for (let k = 0; k < 6; k++) B(2 + k * 0.9, 2 + k * 0.9, 26 - k * k * 0.2, 3 + k * 0.9, 3 + k * 0.9, 27 - k * k * 0.2, m);
  const cx = 7.5, cy = 7.5; B(cx - 0.3, cy - 0.3, 18, cx + 0.3, cy + 0.3, 20, m);
  if (s === "ha") { B(cx - 2.4, cy - 2.4, 12, cx + 2.4, cy + 2.4, 18, "#fff1cf"); B(cx - 2.5, cy - 2.5, 17.5, cx + 2.5, cy + 2.5, 18.2, p.w2); }
  else { C(cx, cy, 2.8, 14.5, 18, s === "no" ? p.f : s === "vi" ? p.f2 : "#1f2126"); C(cx, cy, 1.6, 14, 14.5, p.l); }
}
function plant(B, C, L, p, s, W, D) {
  const cx = W / 2, cy = D / 2, pot = { mo: "#f2f2f2", no: "#d8b88a", vi: "#b0603a", ha: "#5a4a3a", in: "#6a6a6a" }[s];
  if (s === "no") { B(cx - 2, cy - 2, 0, cx - 1.2, cy - 1.2, 4, p.w2); B(cx + 1.2, cy + 1.2, 0, cx + 2, cy + 2, 4, p.w2); }
  const z0 = s === "no" ? 3.5 : 0;
  if (s === "ha") { C(cx, cy, 3, 0, 4, pot); C(cx, cy, 2.6, 4, 4.4, "#6a4a30"); B(cx - 0.6, cy - 0.6, 4, cx + 0.6, cy + 0.6, 9, "#5a3a22"); B(cx - 0.4, cy, 8, cx + 3, cy + 0.6, 9, "#5a3a22"); L(cx - 1.5, cy, 10.5, 2.6, "#4a7a4a"); L(cx + 2.8, cy + 0.5, 9.6, 2, "#3f6b44"); return; }
  if (s === "in") { C(cx, cy, 2.4, 0, 6, pot); C(cx, cy, 2, 6, 6.4, "#4a3a2a"); C(cx, cy, 1.2, 6, 15, "#5f8a4a"); C(cx - 1.6, cy, 0.7, 9, 13, "#5f8a4a"); B(cx - 2.3, cy - 0.3, 9, cx - 1, cy + 0.3, 9.7, "#5f8a4a"); C(cx + 1.6, cy, 0.7, 10, 14, "#5f8a4a"); return; }
  C(cx, cy, 2.4, z0, z0 + 6, pot); C(cx, cy, 2, z0 + 6, z0 + 6.4, "#4a3a2a");
  const gr = s === "vi" ? "#4f8a4a" : "#5fa05a"; L(cx, cy, z0 + 11, 3.4, gr); L(cx - 1.8, cy + 1, z0 + 9, 2.4, shade(gr, 0.85)); L(cx + 1.6, cy - 0.6, z0 + 13.5, 2.2, shade(gr, 1.12));
}
function frameW(B, C, L, p, s, W, D) {
  const fr = { mo: "#1f2126", no: p.w, vi: "#c09a44", ha: p.w2, in: p.m }[s];
  B(1, 0, 13, W - 1, 0.6, 27, fr); B(2, 0.6, 14, W - 2, 0.7, 26, s === "ha" ? "#f3ead2" : "#f6f3ea");
  const P = (u0, z0, u1, z1, c) => B(u0, 0.7, z0, u1, 0.8, z1, c);
  if (s === "mo") { P(2.5, 15, 4.5, 20, "#3f7fd9"); P(4, 19, 5.5, 25, "#e8c25a"); P(2.5, 22, 3.5, 25, "#1f2126"); }
  if (s === "no") { P(2.5, 15, 5.5, 18, "#9fbaa0"); P(3, 18, 5, 22, "#e8a37a"); }
  if (s === "vi") { P(2, 14, 6, 19, "#5a7a4a"); P(2, 19, 6, 26, "#9fb8c8"); P(3.5, 18, 4.5, 21, "#7c4b2c"); }
  if (s === "ha") { P(3.5, 15, 4.5, 25, "#2a2a2a"); P(2.5, 20, 5.5, 21, "#2a2a2a"); P(4.5, 22, 5.5, 23, "#b8352f"); }
  if (s === "in") { P(2, 14, 6, 26, "#3a3a3c"); P(3, 16, 5, 18, "#c0602a"); P(2.5, 21, 5.5, 22, "#e8e4dc"); }
}
function windowW(B, C, L, p, s, W, D) {
  const fr = { mo: "#2e3138", no: "#f4f2ec", vi: p.w, ha: p.w2, in: p.m }[s];
  B(1, 0, 10, W - 1, 0.5, 32, fr);
  if (s === "ha") { B(2, 0.5, 11, W - 2, 0.6, 31, "#fff4d8"); for (let u = 2; u < W - 1.5; u += 2.4) B(u, 0.6, 11, u + 0.6, 1, 31, p.w2); for (let z = 11; z < 31; z += 3.3) B(2, 0.6, z, W - 2, 1, z + 0.6, p.w2); B(W / 2 - 0.5, 0.5, 10, W / 2 + 0.5, 1.4, 32, p.w2); return; }
  B(2, 0.5, 11, W - 2, 0.6, 31, "#9fd0ea"); B(2, 0.6, 24, W - 2, 0.7, 31, "#c4e6f6"); B(3, 0.6, 12, 6, 0.7, 15, "#ffffff"); B(9.5, 0.6, 26, 12, 0.7, 28, "#ffffff");
  B(W / 2 - 0.6, 0.5, 11, W / 2 + 0.6, 1.2, 31, fr); B(2, 0.5, 20.4, W - 2, 1.2, 21.4, fr); B(0.5, 0, 9, W - 0.5, 2.6, 10.2, fr);
  if (s === "vi") { B(1, 0.6, 30, 3.5, 1.6, 32, "#a83c3c"); B(W - 3.5, 0.6, 30, W - 1, 1.6, 32, "#a83c3c"); B(1, 0.8, 12, 2.5, 1.6, 30, "#a83c3c"); B(W - 2.5, 0.8, 12, W - 1, 1.6, 30, "#a83c3c"); }
  if (s === "no") { L(4, 1.8, 11.6, 1.4, "#5fa05a"); C(4, 1.8, 0.9, 10.2, 11, "#e8a37a"); }
}
function wshelf(B, C, L, p, s, W, D) {
  const c = s === "mo" ? "#f0f0f0" : s === "in" ? "#94704a" : p.w;
  B(0.5, 0, 18, W - 0.5, 4, 19.2, c);
  if (s === "in") { B(2, 0, 15, 2.8, 4, 18, p.m); B(W - 2.8, 0, 15, W - 2, 4, 18, p.m); } else { B(2, 0, 16.5, 2.8, 1, 18, shade(c, 0.8)); B(W - 2.8, 0, 16.5, W - 2, 1, 18, shade(c, 0.8)); }
  C(3.5, 2, 1.2, 19.2, 22, s === "ha" ? "#5a4a3a" : "#e8e4dc"); L(3.5, 2, 23.4, 1.4, "#5fa05a"); B(6, 1, 19.2, 7.2, 3.2, 24, "#c0443c"); B(7.3, 1, 19.2, 8.4, 3.2, 23, "#3f7fd9"); B(8.5, 1, 19.2, 9.5, 3.2, 24.5, "#e8c25a"); C(12.5, 2, 1.3, 19.2, 21.5, s === "vi" ? "#c09a44" : "#9fc0d8");
}
function mirror(B, C, L, p, s, W, D) {
  const fr = { mo: "#2e3138", no: p.w, vi: "#c09a44", ha: p.w2, in: p.m }[s];
  B(1.5, 0, 6, W - 1.5, 0.7, 30, fr); B(2.3, 0.7, 7, W - 2.3, 0.8, 29, "#c9e2ec"); B(2.8, 0.8, 22, 4, 0.9, 27, "#eef8fb");
  if (s === "vi") B(1, 0, 29, W - 1, 1, 31, fr);
}
function ptable(B, C, L, p, s, W, D) {
  const cloth = { mo: "#f4f4f2", no: "#efe7d8", vi: "#a83c3c", ha: "#34477a", in: "#3a3a3c" }[s];
  B(1, 2, 0, 2, 3, 9, "#777"); B(W - 2, D - 3, 0, W - 1, D - 2, 9, "#777"); B(0, 0.5, 9, W, D - 0.5, 10, cloth); B(0, D - 0.5, 5, W, D - 0.3, 10, cloth); B(0, 0.5, 5, 0.2, D - 0.5, 10, cloth);
  C(5, 4, 2.4, 10, 13, "#fff3f6"); C(5, 4, 2.4, 13, 13.6, "#ff8ac8"); B(4.8, 3.8, 13.6, 5.2, 4.2, 15.5, "#7fd1ff"); B(4.8, 3.8, 15.5, 5.2, 4.2, 16, "#ffd166");
  for (const u of [10, 13, 16, 19]) { C(u, 3 + (u % 2), 0.8, 10, 12.4, ["#ff6fa8", "#7fd1ff", "#ffd166", "#5fe0a0"][u % 4]); }
  B(W - 5, 2, 10, W - 2, 5.5, 10.6, "#e8c25a");
}
function karaoke(B, C, L, p, s, W, D) {
  const c = { mo: "#1f2126", no: p.w, vi: p.w, ha: p.w2, in: p.m }[s];
  B(0.5, 1, 0, W - 0.5, D - 1, 12, c); B(0.5, 1, 12, W - 0.5, D - 1, 13, shade(c, 1.3)); B(1.2, D - 1, 7, W - 1.2, D - 0.8, 11, "#141418"); B(1.8, D - 0.8, 7.6, W - 1.8, D - 0.7, 10.4, "#5f3fa8"); B(2.2, D - 0.7, 9, 4, D - 0.6, 10, "#ff8ac8");
  B(1.2, D - 1, 1.5, 3, D - 0.8, 5.5, "#2a2a2e"); B(W - 3, D - 1, 1.5, W - 1.2, D - 0.8, 5.5, "#2a2a2e");
  B(2, 3, 13, 2.8, 3.8, 18, "#2a2a2e"); L(2.4, 3.4, 19, 1.1, "#9a9aa0"); B(5, 3, 13, 5.8, 3.8, 18, "#2a2a2e"); L(5.4, 3.4, 19, 1.1, "#ff6fa8");
}
function balloon(B, C, L, p, s, W, D) {
  const cols = { mo: ["#f4f4f6", "#7fb2ff", "#c9ccd2"], no: ["#f7efe2", "#a9c6d6", "#e8a37a"], vi: ["#cf9038", "#a83c3c", "#efe2c8"], ha: ["#c0443c", "#34477a", "#efe4c6"], in: ["#2b2b2e", "#c0602a", "#9a9a96"] }[s];
  B(0, 3, 0, 2, 5, 1.5, "#888"); B(W - 2, 3, 0, W, 5, 1.5, "#888");
  const n = 13; for (let k = 0; k < n; k++) { const a = (k / (n - 1)) * Math.PI, u = W / 2 - Math.cos(a) * (W / 2 - 1.5), z = 2 + Math.sin(a) * 20; L(u, 4, z, 2.2, cols[k % 3]); }
}
function mball(B, C, L, p, s, W, D) {
  const m = s === "vi" || s === "ha" ? p.w2 : "#3a3a3c";
  for (const [u, v] of [[1, 5.5], [5.5, 5.5], [3.2, 1]]) B(u, v, 0, u + 1, v + 1, 19, m);
  B(3.4, 3.4, 18, 4.6, 4.6, 22, m); L(4, 4, 25.5, 3.6, "#c7ccd6");
}
function neon(B, C, L, p, s, W, D) {
  const c1 = s === "ha" ? "#ffb35a" : s === "vi" ? "#ff8a5c" : s === "in" ? "#ffd166" : "#ff4fd8", c2 = s === "no" || s === "mo" ? "#5ff0ff" : "#ff5f7a";
  B(1, 0, 18, W - 1, 0.5, 30, s === "in" ? "#2a2a2e" : "#1a1a2a88");
  // 하트 + 물결 글자 느낌
  const hz = 22.5; [[3, hz + 4], [4, hz + 5], [5, hz + 4], [6, hz + 5], [7, hz + 4], [2.5, hz + 3], [7.5, hz + 3], [3, hz + 2], [7, hz + 2], [4, hz + 1], [6, hz + 1], [5, hz]].forEach(([u, z]) => B(u, 0.5, z, u + 0.9, 1, z + 0.9, c1));
  for (let u = 9.5; u < W - 2; u += 0.8) { const z = 24 + Math.round(Math.sin(u * 1.4) * 1.3); B(u, 0.5, z, u + 0.8, 1, z + 0.8, c2); }
}
function bench(B, C, L, p, s, W, D) {
  const c = { mo: "#f2f2f2", no: p.w, vi: p.w, ha: p.w, in: p.w }[s], lg = { mo: p.m, no: p.w2, vi: p.w2, ha: p.w2, in: p.m }[s];
  B(1, 1.5, 0, 2.2, D - 1.5, 6, lg); B(W - 2.2, 1.5, 0, W - 1, D - 1.5, 6, lg); B(W / 2 - 0.6, 1.5, 0, W / 2 + 0.6, D - 1.5, 6, lg); B(0, 1, 6, W, D - 1, 7.5, c);
  if (s !== "ha") { const cu = { mo: "#555c6a", no: "#9fbaa0", vi: "#3f6b4f", in: "#7c4628" }[s]; for (let k = 0; k < 3; k++) B(k * W / 3 + 0.6, 1.4, 7.5, (k + 1) * W / 3 - 0.6, D - 1.4, 8.8, cu); }
  else B(1, 1.5, 7.5, W - 1, D - 1.5, 8.2, p.f2);
}

// 종류 표: fw·fd 칸, pr 기본가(만원), gr 고급, wall 벽걸이, any 화장실에도 둘 수 있음, tags 점수용
const TYPES = [
  { id: "bed1", cat: "bed", n: "싱글 침대", fw: 1, fd: 2, pr: 25, tags: { bed: 1 }, nm: { ha: "요 이불 1인" }, f: bed },
  { id: "bed2", cat: "bed", n: "더블 침대", fw: 2, fd: 3, pr: 48, tags: { bed: 2 }, nm: { ha: "요 이불 2인" }, f: bed },
  { id: "bedK", cat: "bed", n: "호텔 킹 침대", fw: 3, fd: 3, pr: 115, gr: 1, tags: { bed: 2, lux: 1 }, nm: { ha: "병풍 원목 요 세트" }, f: bed },
  { id: "ward", cat: "bed", n: "옷장", fw: 2, fd: 1, pr: 35, tags: {}, nm: { ha: "자개 장롱" }, f: wardrobe },
  { id: "nstand", cat: "bed", n: "협탁", fw: 1, fd: 1, pr: 8, tags: { deco: 1 }, f: nightstand },
  { id: "sofa2", cat: "liv", n: "2인 소파", fw: 2, fd: 1, pr: 45, tags: { seat: 2, sofa: 1 }, nm: { ha: "보료 좌식 소파" }, f: sofa },
  { id: "sofa3", cat: "liv", n: "3인 소파", fw: 3, fd: 1, pr: 110, gr: 1, tags: { seat: 3, sofa: 1, lux: 1 }, nm: { ha: "큰 보료 좌식 소파" }, f: sofa },
  { id: "arm", cat: "liv", n: "1인 의자", fw: 1, fd: 1, pr: 18, tags: { seat: 1 }, nm: { ha: "등받이 방석" }, f: armchair },
  { id: "ctable", cat: "liv", n: "거실 테이블", fw: 2, fd: 1, pr: 15, tags: { table: 1 }, nm: { ha: "소반 상" }, f: ctable },
  { id: "rug", cat: "liv", n: "러그", fw: 2, fd: 2, pr: 12, tags: { deco: 1 }, rug: 1, nm: { ha: "왕골 돗자리" }, f: rug },
  { id: "shelf", cat: "liv", n: "책장", fw: 1, fd: 1, pr: 20, tags: { deco: 1 }, f: shelf },
  { id: "counter", cat: "kit", n: "싱크대", fw: 2, fd: 1, pr: 60, tags: { kitchen: 1 }, f: counter },
  { id: "stove", cat: "kit", n: "인덕션 조리대", fw: 1, fd: 1, pr: 35, tags: { kitchen: 1 }, f: stove },
  { id: "dtable", cat: "kit", n: "식탁", fw: 2, fd: 1, pr: 25, tags: { table: 1 }, nm: { ha: "교자상" }, f: dtable },
  { id: "chair", cat: "kit", n: "식탁 의자", fw: 1, fd: 1, pr: 6, tags: { seat: 1 }, nm: { ha: "방석" }, f: chair },
  { id: "island", cat: "kit", n: "아일랜드 바", fw: 2, fd: 1, pr: 85, gr: 1, tags: { table: 1, seat: 2, kitchen: 1, lux: 1 }, f: island },
  { id: "cabinet", cat: "kit", n: "그릇장", fw: 1, fd: 1, pr: 22, tags: { deco: 1 }, nm: { ha: "찬장" }, f: cabinet },
  { id: "fridge", cat: "app", n: "냉장고", fw: 1, fd: 1, pr: 70, tags: { kitchen: 1 }, f: fridge },
  { id: "tv", cat: "app", n: "TV와 거실장", fw: 2, fd: 1, pr: 55, tags: { fun: 1 }, nm: { vi: "레트로 TV" }, f: tv },
  { id: "washer", cat: "app", n: "세탁기", fw: 1, fd: 1, pr: 45, tags: { wash: 1 }, f: washer },
  { id: "aircon", cat: "app", n: "스탠드 에어컨", fw: 1, fd: 1, pr: 85, gr: 1, tags: { air: 1, lux: 1 }, f: aircon },
  { id: "speaker", cat: "app", n: "스피커", fw: 1, fd: 1, pr: 25, tags: { fun: 1 }, f: speaker },
  { id: "toilet", cat: "bath", n: "변기", fw: 1, fd: 1, pr: 25, tags: { toilet: 1 }, f: toilet },
  { id: "basin", cat: "bath", n: "세면대", fw: 1, fd: 1, pr: 22, tags: { sink: 1 }, f: basin },
  { id: "tub", cat: "bath", n: "욕조", fw: 2, fd: 1, pr: 140, gr: 1, tags: { shower: 1, lux: 1 }, nm: { ha: "편백 욕조", vi: "다리 달린 욕조" }, f: tub },
  { id: "shower", cat: "bath", n: "샤워 부스", fw: 1, fd: 1, pr: 50, tags: { shower: 1 }, f: shower },
  { id: "towel", cat: "bath", n: "수건장", fw: 1, fd: 1, pr: 12, tags: { deco: 1 }, f: towel },
  { id: "flamp", cat: "light", n: "플로어 스탠드", fw: 1, fd: 1, pr: 9, any: 1, tags: { light: 1 }, nm: { ha: "한지 좌등" }, glow: [4, 4, 20], f: flamp },
  { id: "tlamp", cat: "light", n: "협탁 램프", fw: 1, fd: 1, pr: 14, tags: { light: 1, deco: 1 }, glow: [4, 4, 17], f: tlamp },
  { id: "wlamp", cat: "light", n: "벽 조명", fw: 1, fd: 1, pr: 7, any: 1, wall: 1, tags: { light: 1 }, nm: { ha: "한지 벽등" }, glow: [4, 4, 20], f: wlamp },
  { id: "string", cat: "light", n: "줄전구", fw: 2, fd: 1, pr: 4, any: 1, wall: 1, tags: { light: 1, deco: 1 }, glow: [8, 2, 32], f: stringl },
  { id: "arch", cat: "light", n: "아치 스탠드", fw: 1, fd: 1, pr: 45, gr: 1, any: 1, tags: { light: 1, lux: 1 }, glow: [7, 7, 15], f: arch },
  { id: "plant", cat: "deco", n: "화분", fw: 1, fd: 1, pr: 5, any: 1, tags: { deco: 1, green: 1 }, nm: { ha: "분재", in: "선인장" }, f: plant },
  { id: "frame", cat: "deco", n: "그림 액자", fw: 1, fd: 1, pr: 8, any: 1, wall: 1, tags: { deco: 1 }, nm: { ha: "서예 족자" }, f: frameW },
  { id: "window", cat: "deco", n: "창문", fw: 2, fd: 1, pr: 30, any: 1, wall: 1, tags: { win: 1, deco: 1 }, nm: { ha: "창호지 창" }, f: windowW },
  { id: "wshelf", cat: "deco", n: "벽 선반", fw: 2, fd: 1, pr: 6, any: 1, wall: 1, tags: { deco: 1 }, f: wshelf },
  { id: "mirror", cat: "deco", n: "전신 거울", fw: 1, fd: 1, pr: 10, any: 1, wall: 1, tags: { deco: 1 }, f: mirror },
  { id: "ptable", cat: "party", n: "파티 테이블", fw: 3, fd: 1, pr: 30, tags: { table: 1, party: 1 }, f: ptable },
  { id: "karaoke", cat: "party", n: "노래방 기계", fw: 1, fd: 1, pr: 120, gr: 1, tags: { party: 1, fun: 1, lux: 1 }, f: karaoke },
  { id: "balloon", cat: "party", n: "풍선 아치", fw: 2, fd: 1, pr: 8, tags: { party: 1, deco: 1 }, f: balloon },
  { id: "mball", cat: "party", n: "미러볼", fw: 1, fd: 1, pr: 25, tags: { party: 1, light: 1 }, glow: [4, 4, 25], f: mball },
  { id: "neon", cat: "party", n: "네온사인", fw: 2, fd: 1, pr: 15, wall: 1, any: 1, tags: { party: 1, light: 1, deco: 1 }, glow: [8, 1, 24], f: neon },
  { id: "bench", cat: "party", n: "긴 벤치", fw: 3, fd: 1, pr: 18, tags: { seat: 3 }, nm: { ha: "대청 마루 평상" }, f: bench },
];
// 알아서 꾸미기 기본 구성(앞에서부터 예산 되는 만큼)
const AUTO = { // 업체 기본: 필수품 + 조명 하나. 소품·조명·스타일 맞추기는 직접 해야 점수가 오른다
  pr: ["toilet", "basin", "counter", "fridge", "sofa3", "ctable", "ptable", "bench", "bench", "tv", "flamp"],
  ab1: ["toilet", "basin", "shower", "bed2", "sofa2", "ctable", "counter", "flamp"],
  ab2: ["toilet", "basin", "shower", "bed2", "sofa2", "ctable", "counter", "fridge", "dtable", "chair", "chair", "flamp"],
};
export const DEFS = {};
for (const t of TYPES) for (const st of STYLES) {
  const id = t.id + "_" + st.k;
  DEFS[id] = { ...t, id, tid: t.id, st: st.k, n: (t.nm && t.nm[st.k]) || t.n, price: Math.max(2, Math.round(t.pr * st.pm)) };
}

// ───────── 도트 렌더러 ─────────
function fillPoly(g, pts, col) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  g.fillStyle = col;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const yc = y + 0.5; let xl = Infinity, xr = -Infinity;
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) { const x = a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]); if (x < xl) xl = x; if (x > xr) xr = x; }
    }
    if (xl < xr) { const L = Math.round(xl), R = Math.round(xr); if (R > L) g.fillRect(L, y, R - L, 1); }
  }
}
function behind(a, b) {
  const e = 1e-6;
  if (a.x1 <= b.x0 + e) return true; if (b.x1 <= a.x0 + e) return false;
  if (a.y1 <= b.y0 + e) return true; if (b.y1 <= a.y0 + e) return false;
  if (a.z1 <= b.z0 + e) return true; if (b.z1 <= a.z0 + e) return false;
  return a.x0 + a.y0 + a.z0 < b.x0 + b.y0 + b.z0;
}
function topo(list) {
  const arr = list.slice().sort((a, b) => a.x0 + a.x1 + a.y0 + a.y1 - (b.x0 + b.x1 + b.y0 + b.y1));
  const n = arr.length, st = new Uint8Array(n), out = [];
  const visit = (i) => { st[i] = 1; for (let j = 0; j < n; j++) if (!st[j] && behind(arr[j], arr[i])) visit(j); out.push(arr[i]); };
  for (let i = 0; i < n; i++) if (!st[i]) visit(i);
  return out;
}
// 프리미티브 → 바운드
function pbound(q) {
  if (q.t === "b") return q;
  if (q.t === "c") return { x0: q.cx - q.r, x1: q.cx + q.r, y0: q.cy - q.r, y1: q.cy + q.r, z0: q.z0, z1: q.z1 };
  return { x0: q.cx - q.r, x1: q.cx + q.r, y0: q.cy - q.r, y1: q.cy + q.r, z0: q.z - q.r, z1: q.z + q.r };
}
function drawPrim(g, q, ax, ay) {
  const P = (x, y, z) => [ax + x - y, ay + (x + y) / 2 - z];
  if (q.t === "b") {
    const { x0, y0, z0, x1, y1, z1, c } = q;
    if (z1 - z0 > 0.05) {
      fillPoly(g, [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(c, 0.84));
      fillPoly(g, [P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], shade(c, 0.68));
    }
    fillPoly(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], c);
    return;
  }
  if (q.t === "c") {
    const [sx, sb] = P(q.cx, q.cy, q.z0), st = sb - (q.z1 - q.z0), a = q.r * 1.414, hb = a / 2;
    for (let px = Math.floor(sx - a); px < Math.ceil(sx + a); px++) {
      const dx = (px + 0.5 - sx) / a; if (Math.abs(dx) >= 1) continue;
      const h = hb * Math.sqrt(1 - dx * dx);
      g.fillStyle = shade(q.c, dx < -0.35 ? 0.9 : dx > 0.35 ? 0.66 : 0.78);
      const yA = Math.round(st), yB = Math.round(sb + h); if (yB > yA) g.fillRect(px, yA, 1, yB - yA);
      g.fillStyle = q.c; const t0 = Math.round(st - h), t1 = Math.round(st + h); if (t1 > t0) g.fillRect(px, t0, 1, t1 - t0);
    }
    return;
  }
  // 공
  const [sx, sy] = P(q.cx, q.cy, q.z), a = q.r * 1.3, b = q.r * 1.15;
  for (let py = Math.floor(sy - b); py < Math.ceil(sy + b); py++) for (let px = Math.floor(sx - a); px < Math.ceil(sx + a); px++) {
    const dx = (px + 0.5 - sx) / a, dy = (py + 0.5 - sy) / b, d = dx * dx + dy * dy; if (d >= 1) continue;
    const l = -dx * 0.6 - dy * 0.8; g.fillStyle = shade(q.c, l > 0.45 ? 1.2 : l > -0.1 ? 1 : l > -0.55 ? 0.82 : 0.68);
    if (q.disco) g.fillStyle = (Math.floor(px / 2) + Math.floor(py / 2)) % 2 ? shade(q.c, l > 0 ? 1.25 : 0.85) : shade(q.c, l > 0 ? 0.95 : 0.6);
    g.fillRect(px, py, 1, 1);
  }
}
function outline(cv, col) {
  const g = cv.getContext("2d"), { width: w, height: h } = cv, id = g.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d), [r, gg, b] = hex(col);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (o[i + 3] > 20) { mask[y * w + x] = 1; continue; }
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && o[(yy * w + xx) * 4 + 3] > 20;
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 235; mask[y * w + x] = 1; }
  }
  g.putImageData(id, 0, 0);
  return mask;
}
function renderPrims(prims, oc = "#1a1524") {
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const q of prims) { const b = pbound(q); for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) { const sx = x - y, sy = (x + y) / 2 - z; if (sx < mnx) mnx = sx; if (sx > mxx) mxx = sx; if (sy < mny) mny = sy; if (sy > mxy) mxy = sy; } }
  const pad = 2, ax = pad - Math.floor(mnx), ay = pad - Math.floor(mny);
  const w = Math.ceil(mxx) - Math.floor(mnx) + pad * 2, h = Math.ceil(mxy) - Math.floor(mny) + pad * 2;
  const cv = document.createElement("canvas"); cv.width = Math.max(1, w); cv.height = Math.max(1, h);
  const g = cv.getContext("2d");
  const list = prims.map((q) => Object.assign({}, pbound(q), { q }));
  for (const it of topo(list)) drawPrim(g, it.q, ax, ay);
  const mask = outline(cv, oc);
  return { cv, ax, ay, w: cv.width, h: cv.height, mask };
}
// 가구 정의 + 방향 → 월드(아이템 원점 기준) 프리미티브
function buildPrims(def, r) {
  const W = def.fw * U, D = def.fd * U, out = [];
  let tx;
  if (def.wall) tx = r % 2 === 0 ? (u, v) => [u, v] : (u, v) => [v, W - u];
  else tx = [(u, v) => [u, v], (u, v) => [D - v, u], (u, v) => [W - u, D - v], (u, v) => [v, W - u]][r & 3];
  const box = (u0, v0, z0, u1, v1, z1, c) => { const a = tx(u0, v0), b = tx(u1, v1); out.push({ t: "b", x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]), z0, z1, c }); };
  const cyl = (cu, cv, rr, z0, z1, c) => { const a = tx(cu, cv); out.push({ t: "c", cx: a[0], cy: a[1], r: rr, z0, z1, c }); };
  const ball = (cu, cv, z, rr, c) => { const a = tx(cu, cv); out.push({ t: "l", cx: a[0], cy: a[1], z, r: rr, c, disco: def.tid === "mball" }); };
  def.f(box, cyl, ball, PAL[def.st], def.st, W, D);
  return out;
}
const SPR = new Map();
function sprite(def, r, mode = "") {
  const k = def.id + "|" + r + "|" + mode; let s = SPR.get(k); if (s) return s;
  if (mode === "red" || mode === "sel") {
    const b = sprite(def, r), c = document.createElement("canvas"); c.width = b.w; c.height = b.h; const g = c.getContext("2d");
    g.drawImage(b.cv, 0, 0);
    if (mode === "red") { g.globalCompositeOperation = "source-atop"; g.fillStyle = "#ff3d5a88"; g.fillRect(0, 0, b.w, b.h); }
    else { // 금색 테두리
      const id = g.getImageData(0, 0, b.w, b.h), d = id.data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 235) { d[i] = 255; d[i + 1] = 214; d[i + 2] = 92; d[i + 3] = 255; }
      g.putImageData(id, 0, 0);
    }
    s = { ...b, cv: c }; SPR.set(k, s); return s;
  }
  s = renderPrims(buildPrims(def, r)); SPR.set(k, s); return s;
}
function bounds(prims) { let b = { x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9 }; for (const q of prims) { const p = pbound(q); for (const k of ["x0", "y0", "z0"]) b[k] = Math.min(b[k], p[k]); for (const k of ["x1", "y1", "z1"]) b[k] = Math.max(b[k], p[k]); } return b; }

// ───────── 소리 ─────────
let AC = null;
function ac() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch { return null; } }
function tone(f, d = 0.08, type = "square", v = 0.1, slide = 0, at = 0) {
  const a = AC; if (!a) return; const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d = 0.08, f = 1200, v = 0.12, at = 0) {
  const a = AC; if (!a) return; const t = a.currentTime + at, n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); fl.type = "lowpass"; fl.frequency.value = f; g.gain.value = v; s.buffer = buf; s.connect(fl).connect(g).connect(a.destination); s.start(t);
}
const SND = {
  thunk: () => { tone(150, 0.14, "sine", 0.22, -80); noise(0.09, 700, 0.18); tone(520, 0.05, "triangle", 0.05, 0, 0.05); },
  pick: () => tone(660, 0.05, "triangle", 0.07, 220),
  rot: () => { tone(500, 0.04, "square", 0.05); tone(750, 0.05, "square", 0.05, 0, 0.05); },
  sell: () => { tone(1320, 0.06, "square", 0.06); tone(990, 0.08, "square", 0.06, 0, 0.07); tone(1760, 0.1, "triangle", 0.05, 0, 0.14); },
  bad: () => { tone(180, 0.12, "sawtooth", 0.07, -40); },
  tab: () => tone(880, 0.03, "triangle", 0.04),
  paint: () => { noise(0.25, 2400, 0.08); tone(700, 0.08, "sine", 0.05, 300, 0.05); },
  up: () => { tone(880, 0.06, "triangle", 0.06); tone(1175, 0.06, "triangle", 0.06, 0, 0.06); tone(1568, 0.1, "triangle", 0.06, 0, 0.12); },
  door: () => { tone(1568, 0.12, "sine", 0.07); tone(1318, 0.18, "sine", 0.07, 0, 0.12); },
  pop: () => tone(1046, 0.05, "sine", 0.06, 400),
};

// ───────── 점수 ─────────
function essList(kind) {
  return kind === "pr"
    ? [
      { k: "seat", n: "앉을 자리 4석", miss: "앉을 데가 부족해요" },
      { k: "table", n: "테이블", miss: "음식 둘 테이블이 없어요" },
      { k: "light2", n: "조명 2개", miss: "좀 어두워요" },
      { k: "toilet", n: "변기", miss: "화장실에 변기가 없어요?!" },
      { k: "sink", n: "세면대", miss: "손 씻을 데가 없어요" },
      { k: "kitchenK", n: "주방 설비", miss: "주방이 텅 비었어요" },
      { k: "party", n: "파티 아이템", miss: "파티 분위기가 안 나요" },
    ]
    : [
      { k: "bed", n: "침대", miss: "잘 데가 없어요…" },
      { k: "seat1", n: "소파·의자", miss: "앉을 데가 없어요" },
      { k: "table", n: "테이블", miss: "테이블이 없어요" },
      { k: "light1", n: "조명", miss: "밤에 깜깜해요" },
      { k: "toilet", n: "변기", miss: "화장실에 변기가 없어요?!" },
      { k: "sink", n: "세면대", miss: "세면대가 없어요" },
      { k: "shower", n: "샤워", miss: "씻을 데가 없어요" },
      { k: "kitchen", n: "주방 설비", miss: "라면 하나 못 끓여요" },
    ];
}
export function scoreLayout(sp, items, floor, wall) {
  const S = SPACES[sp], kind = S.kind, zone = S.zone;
  let area = 0; for (let i = 0; i < S.GW; i++) for (let j = 0; j < S.GH; j++) if (zone(i, j) !== "b") area++;
  area -= S.keep.filter(([i, j]) => zone(i, j) !== "b").length;
  const tg = { seat: 0, bed: 0, table: 0, light: 0, toilet: 0, sink: 0, shower: 0, kitchen: 0, kitchenK: 0, party: 0, deco: 0, win: 0, lux: 0, fun: 0 };
  let occ = 0; const stc = {}; let nSt = 0, sofaN = 0;
  for (const it of items) {
    const d = DEFS[it.t]; if (!d) continue;
    const z = d.wall ? "w" : zone(it.i, it.j);
    for (const [k, v] of Object.entries(d.tags)) if (k in tg) tg[k] += v;
    if (d.tags.kitchen && z === "k") tg.kitchenK++;
    if (d.tags.sofa) sofaN++;
    if (!d.wall && !d.rug && z !== "b") occ += d.fw * d.fd;
    stc[d.st] = (stc[d.st] || 0) + (d.rug || d.wall ? 0.6 : 1); nSt += d.rug || d.wall ? 0.6 : 1;
  }
  const F = FLOORS.find((f) => f.id === floor), Wl = WALLS.find((w) => w.id === wall);
  // 1) 스타일 통일도 (바닥·벽도 1표씩)
  for (const m of [F, Wl]) if (m && m.st) { stc[m.st] = (stc[m.st] || 0) + 1.5; nSt += 1.5; } else if (m) nSt += 0.75;
  const domE = Object.entries(stc).sort((a, b) => b[1] - a[1])[0], dom = domE ? domE[0] : "", domN = domE ? domE[1] : 0;
  const nItems = items.filter((x) => DEFS[x.t]).length;
  const unify = nItems ? (domN / Math.max(1, nSt)) * Math.min(1, nItems / 8) : 0;
  // 2) 밀도
  const dens = occ / Math.max(1, area);
  const lo = kind === "pr" ? 0.2 : 0.24, hi = kind === "pr" ? 0.4 : 0.48;
  const densS = dens < lo ? dens / lo : dens > hi ? Math.max(0, 1 - (dens - hi) / 0.22) : 1;
  // 3) 조명
  const lights = tg.light + tg.win * 0.5, lightT = Math.max(2, Math.round(area / (kind === "pr" ? 22 : 14)));
  const lightS = Math.min(1, lights / lightT);
  // 4) 필수품
  const ess = essList(kind), have = {
    seat: tg.seat >= 4, table: tg.table >= 1, light2: tg.light >= 2, light1: tg.light >= 1, toilet: tg.toilet >= 1, sink: tg.sink >= 1, kitchenK: tg.kitchenK >= 1,
    party: tg.party >= 1, bed: tg.bed >= 1, seat1: tg.seat >= 1, shower: tg.shower >= 1, kitchen: tg.kitchen >= 1,
  };
  const essOk = ess.filter((e) => have[e.k]), essMiss = ess.filter((e) => !have[e.k]);
  const essS = essOk.length / ess.length;
  // 5) 소품
  const decoS = Math.min(1, tg.deco / (kind === "pr" ? 7 : 5));
  const lux = Math.min(5, tg.lux * 1.5);
  const score = clamp(Math.round(30 * unify + 20 * densS + 15 * lightS + 25 * essS + 10 * decoS + lux), 0, 100);
  // 결과 숫자
  const star = clamp(Math.round((3.0 + (score / 100) * 1.95) * 10) / 10, 3, 4.9);
  let cap;
  if (kind === "pr") cap = Math.min(tg.seat + tg.table * 2, Math.floor(area / 3));
  else cap = Math.min(tg.bed + Math.min(1, sofaN), S.GW * S.GH > 50 ? 6 : 3);
  cap = Math.max(0, cap);
  let wd, we, rev, cost;
  if (kind === "pr") {
    wd = Math.round((5 + cap * 0.9) * (0.5 + score / 100 * 0.9)); we = Math.round(wd * 1.5);
    const oW = clamp(0.12 + (star - 3.5) * 0.32, 0.04, 0.7), oE = clamp(0.3 + (star - 3.5) * 0.42, 0.08, 0.96);
    rev = cap ? Math.round(wd * 22 * oW + we * 8 * 2 * oE) : 0; cost = S.rent + 45;
  } else {
    wd = Math.round((2.5 + cap * 1.7) * (0.55 + score / 100 * 0.8)); we = Math.round(wd * 1.35);
    const oW = clamp(0.28 + (star - 3.5) * 0.36, 0.08, 0.9), oE = clamp(0.48 + (star - 3.5) * 0.36, 0.12, 0.98);
    rev = cap ? Math.round(wd * 22 * oW + we * 8 * oE) : 0; cost = S.rent + 20 + Math.round(rev * 0.08);
  }
  return { score, star, cap, wd, we, rev, month: rev - cost, cost, parts: { unify, dens, densS, lightS, lights, lightT, essS, decoS, lux }, dom, essOk, essMiss, ess, tg, area, occ };
}

// ───────── CSS ─────────
const CSS = `
.dc{--b:#12142a;--p:#1b1f3b;--p2:#252a4d;--l:#323862;--f:#f2f1fb;--m:#9ea3c0;--g:#f5c04e;--gr:#4fe39a;--r:#ff6b7f;position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--b);color:var(--f);user-select:none;-webkit-user-select:none;overflow:hidden;font-size:14px;line-height:1.3}
.dc *{box-sizing:border-box}
.dc button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;touch-action:manipulation;padding:0}
.dc-top{flex:0 0 auto;padding:8px 10px 6px;display:flex;flex-direction:column;gap:7px;background:linear-gradient(#171a34,#12142a)}
.dc-r1{display:flex;align-items:center;gap:6px}
.dc-back{width:32px;height:32px;border-radius:50%;background:var(--p2)!important;font-size:20px!important;line-height:30px;flex:0 0 auto}
.dc-ttl{display:flex;flex-direction:column;min-width:0;flex:1}
.dc-ttl b{font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-ttl small{font-size:11px;color:var(--m);white-space:nowrap}
.dc-cash{flex:0 0 auto;border:1.5px solid #8a6a2a;border-radius:99px;padding:4px 10px;font-weight:900;color:var(--g);font-size:13.5px;background:#2a2312;white-space:nowrap}
.dc-cash small{font-size:11px;color:#d8c08a;font-weight:700;margin-right:3px}
.dc-auto{flex:0 0 auto;height:28px;padding:0 10px;border-radius:99px;background:#2a2f5a!important;border:1px solid #4a5290!important;font-size:12px!important;font-weight:800;color:#dfe2ff!important;white-space:nowrap}
.dc-cash.neg{color:var(--r);border-color:var(--r)}
.dc-seg{display:flex;gap:4px}
.dc-seg button{padding:5px 10px;border-radius:99px;background:var(--p)!important;border:1px solid var(--l)!important;font-size:12.5px;font-weight:700;color:var(--m)!important}
.dc-seg button.on{background:var(--g)!important;color:#2a1a00!important;border-color:var(--g)!important}
.dc-r2{display:flex;gap:7px;align-items:stretch}
.dc-card{flex:1;min-width:0;background:var(--p);border:1px solid var(--l);border-radius:14px;padding:7px 10px;display:flex;flex-direction:column;gap:2px}
.dc-l1{display:flex;align-items:center;gap:6px;font-weight:900;font-size:21px;line-height:1.1}
.dc-l1 .st{color:var(--g);font-size:19px}
.dc-cap{background:var(--g);color:#2a1a00;font-size:12px;border-radius:99px;padding:2px 7px;font-weight:900}
.dc-l2{font-size:12px;color:#cfd2e6;white-space:normal;line-height:1.3;overflow-wrap:anywhere}
.dc-l3{font-size:15px;font-weight:900;color:var(--gr);white-space:nowrap}
.dc-l3.neg{color:var(--r)}
.dc-sc{flex:0 0 74px;border-radius:14px;background:var(--p);border:1px solid var(--l);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative}
.dc-ring{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--c,#ff8ac8) calc(var(--v,0)*1%),#2b3058 0)}
.dc-ring b{width:40px;height:40px;border-radius:50%;background:var(--p);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900}
.dc-sc small{font-size:11px;color:var(--m);font-weight:700}
.dc-side{flex:0 0 46px;display:flex;flex-direction:column;gap:6px}
.dc-play{width:46px;height:46px;border-radius:50%;background:#2fcf73!important;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 0 #1d8a4b}
.dc-play i{width:0;height:0;border-left:15px solid #0b2a17;border-top:10px solid transparent;border-bottom:10px solid transparent;margin-left:4px}
.dc-play.on{background:#ff8a5c!important;box-shadow:0 3px 0 #b5502c}
.dc-play.on i{border:0;width:13px;height:13px;background:#3a1408;margin:0;border-radius:2px}
.dc-mini{height:26px;border-radius:99px;background:var(--p2)!important;font-size:11.5px!important;font-weight:800;color:#cfd2e6!important}
.dc-parts{display:flex;gap:5px}
.dc-pt{flex:1;min-width:0;background:var(--p);border-radius:9px;padding:4px 6px 5px;font-size:11px;color:var(--m);font-weight:700;white-space:nowrap}
.dc-pt b{float:right;color:var(--f)}
.dc-pt i{display:block;height:4px;border-radius:9px;background:#2b3058;margin-top:3px;overflow:hidden}
.dc-pt i u{display:block;height:100%;background:var(--c,#7fd1ff);transition:width .35s cubic-bezier(.3,1.5,.5,1)}
.dc-need{font-size:11.5px;color:#ffb27a;min-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-need.ok{color:var(--gr)}
.dc-bump{animation:dcbump .38s cubic-bezier(.3,1.8,.5,1)}
@keyframes dcbump{0%{transform:scale(1)}35%{transform:scale(1.22)}100%{transform:scale(1)}}
.dc-stage{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;touch-action:none;background:radial-gradient(120% 80% at 50% 45%,#262b52,#0f1124 70%)}
.dc-wrap{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.dc-wrap canvas{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.dc-lay{position:absolute;inset:0;pointer-events:none}
.dc-bub{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#222;font-size:5.6px;font-weight:800;padding:1.6px 3.2px;border-radius:3.5px;white-space:nowrap;box-shadow:0 1px 0 #0003;animation:dcbin .3s cubic-bezier(.3,1.7,.5,1)}
.dc-bub:after{content:"";position:absolute;left:50%;bottom:-1.8px;margin-left:-1.8px;border:1.8px solid transparent;border-top-color:#fff;border-bottom:0}
.dc-bub em{font-style:normal;color:#e09a00}
@keyframes dcbin{from{transform:translate(-50%,-60%) scale(.3);opacity:0}}
.dc-fl{position:absolute;transform:translate(-50%,-100%);font-size:7px;font-weight:900;color:#ffe08a;text-shadow:0 .6px 0 #000,0 0 2px #000;white-space:nowrap;animation:dcfl 1s ease-out forwards}
.dc-fl.plus{color:#7dffb5}
@keyframes dcfl{0%{opacity:0;transform:translate(-50%,-60%) scale(.6)}15%{opacity:1;transform:translate(-50%,-100%) scale(1.15)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-260%)}}
.dc-msg{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:9;background:#000c;color:#fff;font-size:12.5px;padding:5px 12px;border-radius:99px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s}
.dc-msg.on{opacity:1}
.dc-zoom{position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;gap:5px;z-index:5}
.dc-zoom button{width:30px;height:30px;border-radius:9px;background:#0009!important;border:1px solid #fff2!important;font-size:17px!important;font-weight:900;line-height:28px}
.dc-menu{position:absolute;z-index:8;display:flex;gap:4px;padding:4px;border-radius:12px;background:#0d0f22f0;border:1px solid #f5c04e88;box-shadow:0 6px 18px #000a;transform:translate(-50%,-100%);animation:dcmenu .22s cubic-bezier(.3,1.6,.5,1)}
.dc-menu b{position:absolute;left:0;right:0;top:-17px;text-align:center;font-size:11px;color:#ffe9b8;white-space:nowrap;text-shadow:0 1px 2px #000}
.dc-menu button{min-width:54px;white-space:nowrap;padding:6px 7px;border-radius:8px;background:var(--p2)!important;font-size:12.5px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:1px}
.dc-menu button small{font-size:11px;color:var(--m);font-weight:700}
.dc-menu button.sell{background:#4a1f2a!important;color:#ffc2cc!important}
@keyframes dcmenu{from{transform:translate(-50%,-80%) scale(.6);opacity:0}}
.dc-bot{flex:0 0 auto;background:var(--p);border-radius:16px 16px 0 0;padding:6px 0 9px;display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--l)}
.dc-tabs,.dc-chips,.dc-cards{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 10px}
.dc-tabs::-webkit-scrollbar,.dc-chips::-webkit-scrollbar,.dc-cards::-webkit-scrollbar{display:none}
.dc-tabs button{flex:0 0 auto;padding:6px 11px;border-radius:10px;font-size:13.5px;font-weight:800;color:var(--m)!important}
.dc-tabs button.on{background:var(--p2)!important;color:var(--f)!important}
.dc-chips button{flex:0 0 auto;display:flex;align-items:center;gap:5px;padding:4px 10px 4px 5px;border-radius:99px;border:1.5px solid var(--l)!important;font-size:12.5px;font-weight:800;color:#cfd2e6!important}
.dc-chips button i{width:18px;height:18px;border-radius:50%;border:1.5px solid #0006;flex:0 0 auto}
.dc-chips button.on{border-color:var(--g)!important;color:var(--g)!important;background:#2a2312!important}
.dc-cards{touch-action:pan-x;padding-bottom:2px}
.dc-cd{position:relative;flex:0 0 92px;height:112px;border-radius:12px;background:var(--p2)!important;border:1px solid var(--l)!important;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:4px 3px 6px!important;touch-action:pan-x}
.dc-cd .im{flex:1;display:flex;align-items:center;justify-content:center;min-height:0;width:100%;pointer-events:none}
.dc-cd .im img{image-rendering:pixelated;max-width:84px;max-height:62px;object-fit:contain}
.dc-cd b{font-size:11.5px;font-weight:800;white-space:nowrap;max-width:86px;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
.dc-cd em{font-style:normal;font-size:12.5px;font-weight:900;color:var(--g);pointer-events:none}
.dc-cd .gr{position:absolute;left:5px;top:5px;background:linear-gradient(#ffe08a,#e8a920);color:#3a2400;font-size:11px;font-weight:900;padding:1px 6px;border-radius:99px;pointer-events:none}
.dc-cd .on{position:absolute;right:5px;top:5px;background:var(--gr);color:#06301a;font-size:11px;font-weight:900;padding:1px 6px;border-radius:99px}
.dc-cd.poor{opacity:.45}
.dc-cd.cur{border-color:var(--gr)!important}
.dc-fly{position:fixed;z-index:50;pointer-events:none;transform:translate(-50%,-85%) scale(1.1);image-rendering:pixelated;filter:drop-shadow(0 6px 6px #0008)}
.dc-rev{position:absolute;left:12px;right:12px;bottom:12px;z-index:9;background:#fffdf6;color:#2a2620;border-radius:14px;padding:10px 12px 12px;box-shadow:0 10px 30px #000b;animation:dcrev .4s cubic-bezier(.3,1.5,.5,1)}
.dc-rev h4{margin:0 0 5px;font-size:15px;display:flex;align-items:center;gap:6px}
.dc-rev h4 em{font-style:normal;color:#e09a00;font-size:18px}
.dc-rev p{margin:3px 0;font-size:12.5px;line-height:1.45}
.dc-rev p small{color:#8a8070}
.dc-rev .z{margin-top:6px;padding-top:6px;border-top:1px dashed #d8cfbd;font-size:12px;color:#5a4a2a}
.dc-rev button{position:absolute;right:8px;top:8px;width:26px;height:26px;border-radius:50%;background:#eee6d6!important;font-weight:900;color:#5a4a2a!important}
@keyframes dcrev{from{transform:translateY(40px);opacity:0}}
.dc-hint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#f5c04e;color:#2a1a00;font-weight:900;font-size:12px;padding:5px 11px;border-radius:99px;white-space:nowrap;pointer-events:none;animation:dchint 1.4s ease-in-out infinite}
@keyframes dchint{50%{transform:translate(-50%,-4px)}}
@media (max-height:700px){.dc-cd{height:100px}.dc-cd .im img{max-height:52px}.dc-l1{font-size:19px}.dc-parts{display:none}}
`;
function inject() { if (document.getElementById("decocss")) return; const s = document.createElement("style"); s.id = "decocss"; s.textContent = CSS; document.head.appendChild(s); }

// 재질 썸네일
function matThumb(kind, id) {
  const c = document.createElement("canvas"); c.width = 44; c.height = 34; const g = c.getContext("2d"), im = g.createImageData(44, 34), d = im.data;
  const ox = 22, oy = kind === "floor" ? 9 : 22;
  for (let py = 0; py < 34; py++) for (let px = 0; px < 44; px++) {
    let col = null; const sx = px + 0.5 - ox, sy = py + 0.5 - oy;
    if (kind === "floor") { const x = sy + sx / 2 + 4, y = sy - sx / 2 + 4; if (x >= 0 && y >= 0 && x < 20 && y < 20) col = floorPx(id, x * 1.2, y * 1.2); }
    else {
      if (sx >= 0 && sx < 20) { const z = sx / 2 - sy; if (z >= 0 && z < 22) col = mulc(wallPx(id, sx * 1.4, z * 1.4 + 2), 0.95); }
      if (sx < 0 && sx > -20) { const y = -sx, z = y / 2 - sy; if (z >= 0 && z < 22) col = mulc(wallPx(id, y * 1.4, z * 1.4 + 2), 0.8); }
      if (!col) { const x = sy + sx / 2, y = sy - sx / 2; if (x >= 0 && y >= 0 && x < 20 && y < 20 && sy > -1) col = [190, 184, 172]; }
    }
    if (col) { const i = (py * 44 + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
  }
  g.putImageData(im, 0, 0); outline(c, "#1a1524");
  return c.toDataURL();
}

// ───────── 본체 ─────────
export function openDeco(host, opts = {}) {
  inject();
  const spaces = opts.spaces || [opts.space || "pr"];
  let sp = opts.space || spaces[0];
  const mem = {}; // 공간별 저장
  host.innerHTML = "";
  const root = document.createElement("div"); root.className = "dc"; host.appendChild(root);
  root.innerHTML = `
  <div class="dc-top">
    <div class="dc-r1"><button class="dc-back" aria-label="뒤로">‹</button><div class="dc-ttl"><b></b><small></small></div>${opts.onAuto ? `<button class="dc-auto">알아서</button>` : ""}<div class="dc-cash"><small>남은 예산</small><span>0만</span></div></div>
    ${spaces.length > 1 ? `<div class="dc-seg">${spaces.map((k) => `<button data-sp="${k}">${SPACES[k].n}</button>`).join("")}</div>` : ""}
    <div class="dc-r2">
      <div class="dc-card"><div class="dc-l1"><span class="st">★</span><span class="v-star">0.0</span><span class="dc-cap v-cap">0인</span></div><div class="dc-l2 v-price"></div><div class="dc-l3 v-month"></div></div>
      <div class="dc-sc"><div class="dc-ring"><b class="v-score">0</b></div><small>감성 점수</small></div>
      <div class="dc-side"><button class="dc-play" aria-label="손님 시점으로 보기"><i></i></button><button class="dc-mini dc-save">저장</button></div>
    </div>
    <div class="dc-parts"></div>
    <div class="dc-need"></div>
  </div>
  <div class="dc-stage"><div class="dc-wrap"><canvas></canvas><div class="dc-lay"></div></div><div class="dc-msg"></div><div class="dc-zoom"><button data-z="1">+</button><button data-z="-1">−</button></div></div>
  <div class="dc-bot"><div class="dc-tabs">${CATS.map((c) => `<button data-cat="${c.k}">${c.n}</button>`).join("")}</div><div class="dc-chips">${STYLES.map((s) => `<button data-st="${s.k}"><i style="background:linear-gradient(135deg,${s.sw[0]} 50%,${s.sw[1]} 50%)"></i>${s.n}</button>`).join("")}</div><div class="dc-cards"></div></div>`;
  const $ = (s) => root.querySelector(s);
  const stage = $(".dc-stage"), wrap = $(".dc-wrap"), cv = wrap.querySelector("canvas"), lay = $(".dc-lay"), g = cv.getContext("2d"), msgEl = $(".dc-msg"), cards = $(".dc-cards");
  let K = 2, CW = 180, CH = 220, OX = 0, OY = 0, zoom = 1, tx = 0, ty = 0;
  let S = SPACES[sp], items = [], floor = "base", wall = "base", cash = 0, budget = 0, cat = "liv", style = "mo", sel = null, moveMode = null;
  let bg = null, grid = null, parts = [], stats = null, shown = null;
  const pts = [], guests = []; let guestOn = false, revEl = null, tt = 0, raf = 0, alive = true, drag = null, hintEl = null;
  let seq = 0;

  // ── 공간 ──
  function partPieces() {
    parts = [];
    const col = WALLMID[wall] || "#ebe9e4", cap = WALLCAP[wall] || "#f3f1ec";
    for (const sg of S.seg) for (let c = sg.a; c < sg.b; c++) {
      if (sg.door.includes(c)) continue;
      const pr = sg.ax === "x" ? { x0: sg.at * U - 1, x1: sg.at * U + 1, y0: c * U, y1: (c + 1) * U } : { x0: c * U, x1: (c + 1) * U, y0: sg.at * U - 1, y1: sg.at * U + 1 };
      const sp2 = renderPrims([{ t: "b", ...pr, z0: 0, z1: PWH, c: col }, { t: "b", ...pr, z0: PWH, z1: PWH + 1, c: cap }], "#2a2430");
      parts.push({ kind: "part", spr: sp2, ...pr, z0: 0, z1: PWH + 1, wx: 0, wy: 0 });
    }
  }
  const zoneOf = (i, j) => S.zone(i, j);
  const isKeep = (i, j) => S.keep.some(([a, b]) => a === i && b === j);
  function blockedEdge(i, j, ni, nj) { // 칸막이로 막힌 이동?
    for (const sg of S.seg) {
      if (sg.ax === "x" && j === nj && Math.max(i, ni) === sg.at && Math.min(i, ni) === sg.at - 1 && j >= sg.a && j < sg.b && !sg.door.includes(j)) return true;
      if (sg.ax === "y" && i === ni && Math.max(j, nj) === sg.at && Math.min(j, nj) === sg.at - 1 && i >= sg.a && i < sg.b && !sg.door.includes(i)) return true;
    }
    return false;
  }
  const fp = (it) => { const d = DEFS[it.t]; return it.r % 2 ? [d.fd, d.fw] : [d.fw, d.fd]; };
  function canPlace(def, i, j, r, ignore) {
    if (def.wall) {
      const len = r % 2 ? S.GH : S.GW, k = r % 2 ? j : i;
      if (k < 0 || k + def.fw > len) return "벽 밖이에요";
      for (const o of items) { if (o === ignore) continue; const od = DEFS[o.t]; if (!od.wall || (o.r % 2) !== (r % 2)) continue; const ok = r % 2 ? o.j : o.i; if (k < ok + od.fw && ok < k + def.fw) return "벽에 이미 걸려 있어요"; }
      return null;
    }
    const [w, d] = r % 2 ? [def.fd, def.fw] : [def.fw, def.fd];
    if (i < 0 || j < 0 || i + w > S.GW || j + d > S.GH) return "방 밖이에요";
    const z0 = zoneOf(i, j);
    for (let a = i; a < i + w; a++) for (let b = j; b < j + d; b++) {
      if (zoneOf(a, b) !== z0) return "칸막이에 걸려요";
      if (!def.rug && isKeep(a, b)) return "문 앞 통로는 비워 둬요";
    }
    if (def.cat === "bath" && z0 !== "b") return "욕실 칸에만 놓아요";
    if (def.cat !== "bath" && !def.any && !def.rug && z0 === "b") return "화장실엔 못 들어가요";
    if (def.rug && z0 === "b") return "화장실엔 못 깔아요";
    for (const o of items) {
      if (o === ignore) continue; const od = DEFS[o.t]; if (od.wall || !!od.rug !== !!def.rug) continue;
      const [ow, odd] = fp(o); if (i < o.i + ow && o.i < i + w && j < o.j + odd && o.j < j + d) return "다른 가구랑 겹쳐요";
    }
    return null;
  }

  // ── 화면 크기 ──
  function fit() {
    const sw = stage.clientWidth, sh = stage.clientHeight; if (!sw || !sh) return;
    K = clamp(Math.floor(Math.min(sw / ((S.GW + S.GH) * 8 + 16), sh / ((S.GW + S.GH) * 4 + WH + 40))), 2, 4); CW = Math.ceil(sw / K); CH = Math.ceil(sh / K);
    cv.width = CW; cv.height = CH; wrap.style.width = CW * K + "px"; wrap.style.height = CH * K + "px"; g.imageSmoothingEnabled = false;
    lay.style.fontSize = K + "px"; lay.style.setProperty("--k", K);
    const rw = (S.GW + S.GH) * 8, rh = (S.GW + S.GH) * 4 + WH;
    OX = Math.round(CW / 2 - (S.GW * 8 - S.GH * 8) / 2); OY = Math.round(CH / 2 - rh / 2 + WH + 2);
    if (rw > CW - 6) OX = Math.round(CW / 2 - (S.GW * 8 - S.GH * 8) / 2);
    buildBg(); applyZ();
  }
  function applyZ() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    tx = clamp(tx, sw - sw * zoom - 40 * zoom, 40 * zoom); ty = clamp(ty, sh - sh * zoom - 40 * zoom, 40 * zoom);
    if (zoom <= 1.001) { tx = 0; ty = 0; }
    wrap.style.transform = `translate(${tx}px,${ty}px) scale(${zoom})`;
    if (sel) showMenu();
  }
  // 바닥·벽 미리 그리기
  function buildBg() {
    bg = document.createElement("canvas"); bg.width = CW; bg.height = CH; const b = bg.getContext("2d"), im = b.createImageData(CW, CH), d = im.data;
    const GWu = S.GW * U, GHu = S.GH * U;
    for (let py = 0; py < CH; py++) for (let px = 0; px < CW; px++) {
      const sx = px + 0.5 - OX, sy = py + 0.5 - OY; let col = null;
      const x = sy + sx / 2, y = sy - sx / 2;
      if (x >= 0 && y >= 0 && x < GWu && y < GHu) {
        const z = zoneOf(Math.floor(x / U), Math.floor(y / U));
        col = floorPx(z === "b" ? "bath" : floor, x, y);
        const ao = Math.min(x, y); if (ao < 3) col = mulc(col, 0.8 + ao * 0.065);
      } else {
        if (sx >= -0.5 && sx <= GWu) { const z = sx / 2 - sy; if (z >= 0 && z < WH) { col = mulc(wallPx(wall, sx, z), 0.97); if (sx < 3) col = mulc(col, 0.86 + sx * 0.04); } }
        if (!col && sx < 0 && sx >= -GHu) { const yy = -sx, z = yy / 2 - sy; if (z >= 0 && z < WH) { col = mulc(wallPx(wall, GHu - yy, z), 0.83); } }
      }
      if (col) { const i = (py * CW + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    }
    b.putImageData(im, 0, 0);
    const P = (x, y, z) => [OX + x - y, OY + (x + y) / 2 - z];
    const cap = WALLCAP[wall] || "#f3f1ec", side = shade(cap, 0.8);
    // 벽 위 두께
    fillPoly(b, [P(-2, -2, WH), P(GWu, -2, WH), P(GWu, 0, WH), P(-2, 0, WH)], cap); fillPoly(b, [P(-2, -2, WH), P(0, -2, WH), P(0, GHu, WH), P(-2, GHu, WH)], cap);
    fillPoly(b, [P(GWu, -2, WH), P(GWu, 0, WH), P(GWu, 0, 0), P(GWu, -2, 0)], shade(WALLMID[wall] || "#ebe9e4", 0.7));
    fillPoly(b, [P(-2, GHu, WH), P(0, GHu, WH), P(0, GHu, 0), P(-2, GHu, 0)], shade(WALLMID[wall] || "#ebe9e4", 0.85));
    // 바닥 두께(앞)
    fillPoly(b, [P(-2, GHu, 0), P(GWu, GHu, 0), P(GWu, GHu, -5), P(-2, GHu, -5)], "#d8d2c6");
    fillPoly(b, [P(GWu, -2, 0), P(GWu, GHu, 0), P(GWu, GHu, -5), P(GWu, -2, -5)], "#a8a196");
    fillPoly(b, [P(-2, GHu, -4), P(GWu, GHu, -4), P(GWu, GHu, -5), P(-2, GHu, -5)], "#8f897e");
    fillPoly(b, [P(GWu, -2, -4), P(GWu, GHu, -4), P(GWu, GHu, -5), P(GWu, -2, -5)], "#6f695f");
    // 입구 매트 + 표시
    const [ei, ej] = S.ent; fillPoly(b, [P(ei * U + 1.5, ej * U + 1.5, 0), P(ei * U + 7, ej * U + 1.5, 0), P(ei * U + 7, ej * U + 6.5, 0), P(ei * U + 1.5, ej * U + 6.5, 0)], "#6a4a3a");
    fillPoly(b, [P(ei * U + 2.5, ej * U + 2.5, 0), P(ei * U + 6, ej * U + 2.5, 0), P(ei * U + 6, ej * U + 5.5, 0), P(ei * U + 2.5, ej * U + 5.5, 0)], "#8a6a4a");
    // 문 앞 칸 은은한 표시
    for (const [a, c] of S.keep) { if (a === ei && c === ej) continue; for (let k = 0; k < 3; k++) { const [x1, y1] = P(a * U + 2 + k * 2, c * U + 4, 0); b.fillStyle = "#0000001c"; b.fillRect(Math.round(x1), Math.round(y1), 1, 1); } }
    // 격자(드래그할 때만)
    grid = document.createElement("canvas"); grid.width = CW; grid.height = CH; const gg = grid.getContext("2d");
    gg.fillStyle = "#ffffff30";
    for (let i = 0; i <= S.GW; i++) for (let t = 0; t <= GHu; t += 1) { const [x1, y1] = P(i * U, t, 0); if (t % 2 === 0) gg.fillRect(Math.round(x1), Math.round(y1), 1, 1); }
    for (let j = 0; j <= S.GH; j++) for (let t = 0; t <= GWu; t += 1) { const [x1, y1] = P(t, j * U, 0); if (t % 2 === 0) gg.fillRect(Math.round(x1), Math.round(y1), 1, 1); }
    partPieces();
  }

  // ── 좌표 ──
  const toL = (cx, cy) => { const r = cv.getBoundingClientRect(); return [((cx - r.left) / r.width) * CW, ((cy - r.top) / r.height) * CH]; };
  const toClient = (lx, ly) => { const r = cv.getBoundingClientRect(), s = stage.getBoundingClientRect(); return [r.left - s.left + (lx / CW) * r.width, r.top - s.top + (ly / CH) * r.height]; };
  const W2S = (x, y, z = 0) => [OX + x - y, OY + (x + y) / 2 - z];
  const S2F = (lx, ly) => { const sx = lx - OX, sy = ly - OY; return [sy + sx / 2, sy - sx / 2]; };
  function candAt(def, lx, ly, r) {
    if (def.wall) {
      const sx = lx - OX;
      const side = sx >= 0 ? 0 : 1, rr = (r % 2 === side ? r : side);
      if (side === 0) { const i = Math.round(sx / U - def.fw / 2); return { i: clamp(i, 0, S.GW - def.fw), j: 0, r: rr }; }
      const j = Math.round(-sx / U - def.fw / 2); return { i: 0, j: clamp(j, 0, S.GH - def.fw), r: rr };
    }
    const [x, y] = S2F(lx, ly), [w, d] = r % 2 ? [def.fd, def.fw] : [def.fw, def.fd];
    return { i: Math.round(x / U - w / 2), j: Math.round(y / U - d / 2), r };
  }
  // 아이템 월드 원점/바운드
  function itemBox(it) {
    const d = DEFS[it.t];
    if (d.wall) { const b = bounds(buildPrims(d, it.r)); const ox = it.r % 2 ? 0 : it.i * U, oy = it.r % 2 ? it.j * U : 0; return { x0: ox + b.x0, x1: ox + b.x1, y0: oy + b.y0, y1: oy + b.y1, z0: b.z0, z1: b.z1, ox, oy }; }
    const [w, dd] = fp(it); return { x0: it.i * U, y0: it.j * U, x1: (it.i + w) * U, y1: (it.j + dd) * U, z0: 0, z1: 30, ox: it.i * U, oy: it.j * U };
  }

  // ── 그리기 ──
  function drawSpr(s, ox, oy, lift = 0, sq = 1, alpha = 1) {
    const [sx, sy] = W2S(ox, oy, lift); const x = Math.round(sx - s.ax), y = Math.round(sy - s.ay);
    if (alpha < 1) g.globalAlpha = alpha;
    if (sq !== 1) { const w = Math.round(s.w * (1 + (1 - sq) * 0.7)), h = Math.round(s.h * sq); g.drawImage(s.cv, Math.round(sx - s.ax * (w / s.w)), y + (s.h - h), w, h); }
    else g.drawImage(s.cv, x, y);
    g.globalAlpha = 1;
  }
  function footprint(i, j, w, d, col) { fillPoly(g, [W2S(i * U, j * U), W2S((i + w) * U, j * U), W2S((i + w) * U, (j + d) * U), W2S(i * U, (j + d) * U)], col); }
  function animOf(it) {
    if (!it.at) return [0, 1];
    const p = (tt - it.at) / 0.42; if (p >= 1) { it.at = 0; return [0, 1]; }
    if (p < 0.38) { const q = p / 0.38; return [18 * (1 - q * q), 1]; }
    const q = (p - 0.38) / 0.62; return [Math.max(0, Math.sin(q * Math.PI) * 3 * (1 - q)), 1 - Math.sin(Math.min(1, q * 2.2) * Math.PI) * 0.16 * (1 - q)];
  }
  function draw() {
    g.clearRect(0, 0, CW, CH);
    g.drawImage(bg, 0, 0);
    const dragging = drag && (drag.kind === "new" || drag.kind === "move");
    if (dragging && drag.cand && !DEFS[drag.def.id].wall) g.drawImage(grid, 0, 0);
    // 창문 빛
    for (const it of items) { const d = DEFS[it.t]; if (d.tid !== "window") continue; const b = itemBox(it); g.globalAlpha = 0.16; g.fillStyle = "#fff6d8"; if (it.r % 2 === 0) fillPoly(g, [W2S(b.x0 + 2, 0), W2S(b.x1 - 2, 0), W2S(b.x1 + 6, 22), W2S(b.x0 + 10, 22)], "#fff6d8"); else fillPoly(g, [W2S(0, b.y0 + 2), W2S(0, b.y1 - 2), W2S(22, b.y1 + 6), W2S(22, b.y0 + 10)], "#fff6d8"); g.globalAlpha = 1; }
    // 벽걸이
    for (const it of items) { const d = DEFS[it.t]; if (!d.wall || (drag && drag.item === it)) continue; const b = itemBox(it), [lift, sq] = animOf(it); drawSpr(sprite(d, it.r, sel === it ? "sel" : ""), b.ox, b.oy, lift * 0.3, sq); }
    // 러그
    for (const it of items) { const d = DEFS[it.t]; if (!d.rug || (drag && drag.item === it)) continue; const [lift, sq] = animOf(it); drawSpr(sprite(d, it.r, sel === it ? "sel" : ""), it.i * U, it.j * U, lift, sq); }
    // 고른 가구 바닥 표시
    if (sel && !DEFS[sel.t].wall && !(drag && drag.item === sel)) { const [w, d] = fp(sel); g.globalAlpha = 0.35 + 0.15 * Math.sin(tt * 6); footprint(sel.i, sel.j, w, d, "#ffd65c"); g.globalAlpha = 1; }
    // 드래그 자리
    let ghost = null;
    if (dragging && drag.cand) {
      const c = drag.cand, def = drag.def, bad = drag.bad;
      if (def.wall) {
        const b = bounds(buildPrims(def, c.r)), ox = c.r % 2 ? 0 : c.i * U, oy = c.r % 2 ? c.j * U : 0;
        g.globalAlpha = 0.45; const col = bad ? "#ff3d5a" : "#4fe39a";
        if (c.r % 2 === 0) fillPoly(g, [W2S(ox, 0, 2), W2S(ox + def.fw * U, 0, 2), W2S(ox + def.fw * U, 0, WH - 2), W2S(ox, 0, WH - 2)], col);
        else fillPoly(g, [W2S(0, oy, 2), W2S(0, oy + def.fw * U, 2), W2S(0, oy + def.fw * U, WH - 2), W2S(0, oy, WH - 2)], col);
        g.globalAlpha = 1; drawSpr(sprite(def, c.r, bad ? "red" : ""), ox, oy, 0, 1, 0.92); void b;
      } else {
        const [w, d] = c.r % 2 ? [def.fd, def.fw] : [def.fw, def.fd];
        g.globalAlpha = 0.5 + 0.1 * Math.sin(tt * 10); footprint(c.i, c.j, w, d, bad ? "#ff3d5a" : "#4fe39a"); g.globalAlpha = 1;
        ghost = { kind: "ghost", def, c, x0: c.i * U, y0: c.j * U, x1: (c.i + w) * U, y1: (c.j + d) * U, z0: 0, z1: 30, bad };
      }
    }
    // 바닥 가구 + 칸막이 + 손님 정렬
    const list = [];
    for (const it of items) { const d = DEFS[it.t]; if (d.wall || d.rug || (drag && drag.item === it)) continue; const [w, dd] = fp(it); list.push({ kind: "it", it, x0: it.i * U, y0: it.j * U, x1: (it.i + w) * U, y1: (it.j + dd) * U, z0: 0, z1: 30 }); }
    for (const p of parts) list.push(p);
    for (const gu of guests) list.push({ kind: "gu", gu, x0: gu.x - 1.5, x1: gu.x + 1.5, y0: gu.y - 1.5, y1: gu.y + 1.5, z0: 0, z1: 12 });
    if (ghost && !ghost.def.rug) list.push(ghost);
    if (ghost && ghost.def.rug) drawSpr(sprite(ghost.def, ghost.c.r, ghost.bad ? "red" : ""), ghost.x0, ghost.y0, 2, 1, 0.9);
    for (const o of topo(list)) {
      if (o.kind === "it") { const [lift, sq] = animOf(o.it); drawSpr(sprite(DEFS[o.it.t], o.it.r, sel === o.it ? "sel" : ""), o.x0, o.y0, lift, sq); }
      else if (o.kind === "part") g.drawImage(o.spr.cv, Math.round(OX - o.spr.ax), Math.round(OY - o.spr.ay));
      else if (o.kind === "gu") drawGuest(o.gu);
      else if (o.kind === "ghost") drawSpr(sprite(o.def, o.c.r, o.bad ? "red" : ""), o.x0, o.y0, 3 + Math.sin(tt * 8) * 1, 1, 0.92);
    }
    // 조명 빛
    g.globalCompositeOperation = "lighter";
    for (const it of items) {
      const d = DEFS[it.t]; if (!d.glow) continue;
      const W = d.fw * U, D = d.fd * U, [u, v, z] = d.glow; let lx, ly;
      if (d.wall) { [lx, ly] = it.r % 2 ? [v, W - u] : [u, v]; } else { [lx, ly] = [(a, b) => [a, b], (a, b) => [D - b, a], (a, b) => [W - a, D - b], (a, b) => [b, W - a]][it.r & 3](u, v); }
      const b = itemBox(it), [sx, sy] = W2S(b.ox + lx, b.oy + ly, z), fl = 0.85 + 0.15 * Math.sin(tt * 3 + it.i * 1.7);
      const rg = g.createRadialGradient(sx, sy, 0, sx, sy, 22); rg.addColorStop(0, `rgba(255,214,140,${0.32 * fl})`); rg.addColorStop(1, "rgba(255,214,140,0)");
      g.fillStyle = rg; g.fillRect(sx - 22, sy - 22, 44, 44);
    }
    g.globalCompositeOperation = "source-over";
    // 입자
    for (let k = pts.length - 1; k >= 0; k--) {
      const p = pts[k]; p.l -= 1 / 60; if (p.l <= 0) { pts.splice(k, 1); continue; }
      p.x += p.vx / 60; p.y += p.vy / 60; p.vy += (p.gv ?? 40) / 60; p.vx *= 0.97;
      g.globalAlpha = Math.min(1, p.l / p.m * 1.6); g.fillStyle = p.c;
      if (p.star) { const s = Math.max(1, Math.round((p.l / p.m) * 2)); g.fillRect(Math.round(p.x) - s, Math.round(p.y), s * 2 + 1, 1); g.fillRect(Math.round(p.x), Math.round(p.y) - s, 1, s * 2 + 1); }
      else g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    g.globalAlpha = 1;
  }
  function dust(it) {
    const b = itemBox(it), cs = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [(b.x0 + b.x1) / 2, b.y1], [b.x1, (b.y0 + b.y1) / 2]];
    for (const [x, y] of cs) for (let k = 0; k < 4; k++) { const [sx, sy] = W2S(x, y, DEFS[it.t].wall ? 14 : 0), l = 0.4 + rnd() * 0.35; pts.push({ x: sx + (rnd() - 0.5) * 4, y: sy - rnd() * 2, vx: (rnd() - 0.5) * 40, vy: -8 - rnd() * 18, l, m: l, c: pick(["#e8dcc8", "#cbbfa8", "#f4ecdc", "#ffffff"]), s: rnd() < 0.3 ? 2 : 1, gv: 30 }); }
  }
  function sparkle(lx, ly, n = 10, sp = 20) { for (let k = 0; k < n; k++) { const l = 0.5 + rnd() * 0.4; pts.push({ x: lx + (rnd() - 0.5) * sp * 2, y: ly + (rnd() - 0.5) * sp, vx: 0, vy: -6, gv: 0, l, m: l, c: pick(["#fff3a0", "#ffffff", "#ffd166"]), star: 1 }); } }
  function floatText(lx, ly, txt, plus) { const e = document.createElement("div"); e.className = "dc-fl" + (plus ? " plus" : ""); e.textContent = txt; e.style.left = (lx / CW) * 100 + "%"; e.style.top = (ly / CH) * 100 + "%"; lay.appendChild(e); setTimeout(() => e.remove(), 1000); }

  // ── 손님 ──
  const HAIR = ["#2a1e1a", "#5a3a22", "#1a1a22", "#8a5a2a", "#d8b060", "#6a2a3a"], TOP = ["#ff6fa8", "#5fb8ff", "#5fe0a0", "#ffd166", "#c77dff", "#ff8a5c", "#f2f2f2"];
  function drawGuest(gu) {
    const [sx, sy] = W2S(gu.x, gu.y, 0), x = Math.round(sx), y = Math.round(sy), f = gu.dir < 0, st = Math.floor(gu.walk * 6) % 2, P = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(f ? x - a - w + 1 : x + a, y + b, w, h); };
    g.globalAlpha = 0.3; g.fillStyle = "#000"; g.fillRect(x - 3, y - 1, 7, 2); g.globalAlpha = 1;
    const bob = gu.moving ? (st ? -1 : 0) : 0;
    P(-2, -4, 2, 4 - (gu.moving && st ? 1 : 0), "#2b2f45"); P(1, -4, 2, 4 - (gu.moving && !st ? 1 : 0), "#2b2f45");
    P(-3, -10 + bob, 7, 6, gu.top); P(-3, -10 + bob, 7, 1, shade(gu.top, 1.2)); P(-4, -9 + bob, 1, 4, gu.top); P(4, -9 + bob, 1, 4, shade(gu.top, 0.8));
    P(-3, -16 + bob, 7, 6, "#f3c9a0"); P(-3, -17 + bob, 7, 3, gu.hair); P(-4, -16 + bob, 1, 4, gu.hair); if (gu.long) P(4, -16 + bob, 1, 6, gu.hair);
    P(1, -13 + bob, 1, 1, "#222"); P(3, -13 + bob, 1, 1, "#222"); P(2, -11 + bob, 1, 1, "#e88a8a");
    g.fillStyle = "#1a1524"; // 외곽 살짝
    if (gu.emo && tt - gu.emo.t < 1.1) { const e = gu.emo.k, ey = y - 22 - Math.min(3, (tt - gu.emo.t) * 10); const Q = (a, b, c) => { g.fillStyle = c; g.fillRect(x + a, ey + b, 1, 1); };
      if (e === "heart") { [[-2, 0], [-1, 0], [1, 0], [2, 0], [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [-1, 3], [0, 3], [1, 3], [0, 4]].forEach(([a, b]) => Q(a, b, "#ff5f8a")); Q(-2, 1, "#ffc2d4"); }
      else if (e === "star") { [[0, 0], [0, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [-1, 3], [0, 3], [1, 3], [-1, 4], [1, 4]].forEach(([a, b]) => Q(a, b, "#ffd166")); }
      else { [[-2, 2], [0, 2], [2, 2]].forEach(([a, b]) => Q(a, b, "#ffffff")); } }
  }
  function freeGrid() {
    const occ = Array.from({ length: S.GW }, () => Array(S.GH).fill(0));
    for (const it of items) { const d = DEFS[it.t]; if (d.wall || d.rug) continue; const [w, dd] = fp(it); for (let a = it.i; a < it.i + w; a++) for (let b = it.j; b < it.j + dd; b++) occ[a][b] = it; }
    return occ;
  }
  function bfs(occ, from, to) {
    const key = (i, j) => i * 100 + j, prev = new Map([[key(...from), null]]), q = [from];
    while (q.length) { const [i, j] = q.shift(); if (i === to[0] && j === to[1]) break;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= S.GW || nj >= S.GH || occ[ni][nj] || prev.has(key(ni, nj)) || blockedEdge(i, j, ni, nj)) continue; prev.set(key(ni, nj), [i, j]); q.push([ni, nj]); } }
    if (!prev.has(key(...to))) return null; const path = []; let c = to; while (c) { path.unshift(c); c = prev.get(key(...c)); } return path;
  }
  function comments(st) {
    const out = [], p = st.parts;
    if (st.essMiss.length) out.push(st.essMiss[0].miss);
    if (p.dens < (S.kind === "pr" ? 0.12 : 0.15)) out.push(pick(["좀 휑해요… 메아리 들려요 ㅋㅋ", "넓긴 넓은데 텅 빈 느낌"]));
    else if (p.densS < 0.6 && p.dens > 0.3) out.push(pick(["너무 꽉 껴서 답답해요", "가구 사이로 게걸음 했어요 ㅋㅋ"]));
    if (p.unify > 0.72 && st.tg && items.length >= 5) out.push(pick([`${SN[st.dom]} 컨셉 확실! 사진 맛집`, "감성 미쳤다 ㅎㅎ 인생샷 건짐", "분위기 하나는 끝내줘요"]));
    else if (p.unify < 0.45 && items.length >= 5) out.push(pick(["가구가 서로 따로 노는 느낌", "컨셉이 뭔지 모르겠어요"]));
    if (p.lightS < 0.6) out.push("조명이 좀 어두워요");
    else if (p.lightS >= 1) out.push(pick(["조명 분위기 최고예요", "밤 사진이 예쁘게 나와요"]));
    if (p.decoS >= 0.8) out.push("소품 하나하나 귀여워요");
    if (st.tg.fun || (S.kind === "pr" && st.tg.party >= 2)) out.push(S.kind === "pr" ? "노래하고 놀다 보니 막차 놓침 ㅋㅋ" : "냇플릭스 보다 잠들었어요");
    if (!out.length) out.push(pick(["깔끔하고 좋았어요", "무난무난, 또 올게요"]));
    return out;
  }
  function guestView() {
    if (guestOn) { endGuests(); return; }
    ac(); const st = stats; guestOn = true; $(".dc-play").classList.add("on"); deselect();
    const occ = freeGrid(), n = clamp(S.kind === "pr" ? Math.round(st.cap / 3) || 1 : st.cap || 1, 1, 4), [ei, ej] = S.ent;
    const fav = []; for (const it of items) { const d = DEFS[it.t]; if (d.wall || d.rug) continue; if (d.tags.seat || d.tags.bed || d.tags.light || d.tags.deco || d.tags.party || d.tags.fun) { const [w, dd] = fp(it); for (const [a, b] of [[it.i - 1, it.j], [it.i + w, it.j], [it.i, it.j + dd], [it.i, it.j - 1]]) if (a >= 0 && b >= 0 && a < S.GW && b < S.GH && !occ[a][b]) fav.push({ c: [a, b], it }); } }
    const free = []; for (let a = 0; a < S.GW; a++) for (let b = 0; b < S.GH; b++) if (!occ[a][b]) free.push([a, b]);
    const cm = comments(st);
    SND.door(); toast("손님이 들어와요");
    for (let k = 0; k < n; k++) {
      const rate = Math.round(clamp(st.star + (rnd() - 0.5) * 0.3, 1, 5) * 10) / 10;
      guests.push({ x: (S.GW + 0.6) * U, y: (ej + 0.5) * U, tgt: null, path: [[ei, ej]], wait: k * 0.7, plan: k ? 2 : 3, cell: [ei, ej], dir: -1, walk: 0, moving: false, hair: pick(HAIR), top: pick(TOP), long: rnd() < 0.5, rate, line: cm[k % cm.length], fav, free, occ, done: false, emo: null });
    }
  }
  function stepGuests(dt) {
    if (!guestOn) return;
    let allDone = guests.length > 0;
    for (const gu of guests) {
      if (gu.done) continue; allDone = false;
      if (gu.wait > 0) { gu.wait -= dt; gu.moving = false; continue; }
      if (gu.path.length) {
        const [ci, cj] = gu.path[0], txp = (ci + 0.5) * U, typ = (cj + 0.5) * U, dx = txp - gu.x, dy = typ - gu.y, dist = Math.hypot(dx, dy), sp = 24 * dt;
        gu.moving = true; gu.walk += dt;
        if (Math.abs(dx - dy) > 0.1) gu.dir = dx - dy > 0 ? 1 : -1;
        if (dist <= sp) { gu.x = txp; gu.y = typ; gu.cell = gu.path.shift(); } else { gu.x += (dx / dist) * sp; gu.y += (dy / dist) * sp; }
        continue;
      }
      gu.moving = false;
      if (gu.tgt) { gu.tgt = null; gu.wait = 0.6 + rnd() * 0.6; gu.emo = { k: stats.score >= 70 ? pick(["heart", "star"]) : stats.score >= 45 ? pick(["star", "dots"]) : "dots", t: tt }; if (gu.emo.k !== "dots") SND.pop(); gu.plan--; continue; }
      if (gu.plan <= 0) { gu.done = true; bubble(gu); continue; }
      const pool = gu.fav.length && rnd() < 0.7 ? gu.fav.map((f) => f.c) : gu.free;
      let path = null; for (let t = 0; t < 8 && !path; t++) { const c = pick(pool.length ? pool : [gu.cell]); path = bfs(gu.occ, gu.cell, c); }
      if (!path) { gu.plan = 0; continue; }
      path.shift(); gu.path = path; gu.tgt = path[path.length - 1] || gu.cell; if (!path.length) gu.wait = 0.4;
    }
    if (allDone && !revEl) setTimeout(review, 900);
  }
  function bubble(gu) {
    const [sx, sy] = W2S(gu.x, gu.y, 0), e = document.createElement("div"); e.className = "dc-bub";
    e.innerHTML = `<em>★${gu.rate.toFixed(1)}</em> ${gu.line}`; e.style.left = (sx / CW) * 100 + "%"; e.style.top = ((sy - 19) / CH) * 100 + "%"; lay.appendChild(e); gu.bub = e;
    SND.pop();
  }
  function review() {
    if (!guestOn || revEl) return;
    const avg = guests.reduce((a, gq) => a + gq.rate, 0) / Math.max(1, guests.length), st = stats;
    revEl = document.createElement("div"); revEl.className = "dc-rev";
    const tip = st.essMiss.length ? `${st.essMiss.map((e) => e.n).join("·")}부터 채워요.` : st.parts.unify < 0.6 ? "스타일을 하나로 모으면 별점이 확 올라요." : st.parts.lightS < 1 ? "조명을 하나 더 두면 밤 사진이 살아요." : st.parts.densS < 1 ? (st.parts.dens < 0.25 ? "조금 더 채워도 돼요." : "조금 비우면 숨통이 트여요.") : "이 정도면 예약 오픈해도 돼요!";
    revEl.innerHTML = `<button aria-label="닫기">×</button><h4><em>★${avg.toFixed(1)}</em> 손님 ${guests.length}명 후기</h4>${guests.map((gq) => `<p>"${gq.line}" <small>★${gq.rate.toFixed(1)}</small></p>`).join("")}<div class="z"><b>사장님 메모</b> · ${tip}</div>`;
    stage.appendChild(revEl); revEl.querySelector("button").onclick = endGuests; SND.up();
  }
  function endGuests() { guestOn = false; guests.length = 0; lay.querySelectorAll(".dc-bub").forEach((e) => e.remove()); if (revEl) { revEl.remove(); revEl = null; } $(".dc-play").classList.remove("on"); }

  // ── 메시지·메뉴 ──
  let msgT = 0; function toast(t) { msgEl.textContent = t; msgEl.classList.add("on"); clearTimeout(msgT); msgT = setTimeout(() => msgEl.classList.remove("on"), 1500); }
  let menuEl = null;
  function deselect() { sel = null; moveMode = null; if (menuEl) { menuEl.remove(); menuEl = null; } }
  function showMenu() {
    if (!sel) return; const d = DEFS[sel.t], b = itemBox(sel);
    const top = d.wall ? b.z1 : Math.min(30, bounds(buildPrims(d, sel.r)).z1);
    const [lx, ly] = W2S((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, top + 4), [cx, cy] = toClient(lx, ly);
    if (!menuEl) {
      menuEl = document.createElement("div"); menuEl.className = "dc-menu"; stage.appendChild(menuEl);
      menuEl.addEventListener("pointerdown", (e) => e.stopPropagation());
      menuEl.addEventListener("click", (e) => { const a = e.target.closest("button")?.dataset.a; if (a === "move") { moveMode = sel; toast("가구를 끌어서 옮겨요"); } if (a === "rot") rotate(sel); if (a === "sell") sell(sel); });
    }
    menuEl.innerHTML = `<b>${SN[d.st]} ${d.n}</b><button data-a="move">옮기기</button><button data-a="rot">돌리기<small>${d.wall ? "벽 바꾸기" : "90°"}</small></button><button data-a="sell" class="sell">팔기<small>+${Math.round(d.price * 0.7)}만</small></button>`;
    const sw = stage.clientWidth; menuEl.style.left = clamp(cx, 90, sw - 90) + "px"; menuEl.style.top = clamp(cy, 66, stage.clientHeight - 10) + "px";
  }
  function rotate(it) {
    const d = DEFS[it.t]; ac();
    if (d.wall) {
      const nr = it.r % 2 ? 0 : 1, len = nr ? S.GH : S.GW;
      for (const k of [...Array(len).keys()].sort((a, b) => Math.abs(a - (len / 2 - 1)) - Math.abs(b - (len / 2 - 1)))) { const c = nr ? { i: 0, j: k } : { i: k, j: 0 }; if (!canPlace(d, c.i, c.j, nr, it)) { it.i = c.i; it.j = c.j; it.r = nr; it.at = tt; SND.rot(); changed(); showMenu(); return; } }
      SND.bad(); toast("반대쪽 벽에 자리가 없어요"); return;
    }
    const nr = (it.r + 1) % 4;
    for (const [di, dj] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1], [-2, 0], [0, -2]]) if (!canPlace(d, it.i + di, it.j + dj, nr, it)) { it.i += di; it.j += dj; it.r = nr; it.at = tt; SND.rot(); changed(); showMenu(); return; }
    SND.bad(); toast("돌릴 자리가 없어요"); menuEl && menuEl.classList.add("dc-bump");
  }
  function sell(it) {
    const d = DEFS[it.t], back = Math.round(d.price * 0.7), b = itemBox(it); ac();
    items = items.filter((x) => x !== it); cash += back; SND.sell(); dust(it);
    const [lx, ly] = W2S((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 12); floatText(lx, ly, `+${back}만`, true);
    deselect(); changed();
  }
  function place(def, c, quiet) {
    if (cash < def.price) { if (!quiet) { SND.bad(); toast(`예산이 ${def.price - cash}만 모자라요`); } return null; }
    const it = { t: def.id, i: c.i, j: c.j, r: c.r, at: tt, id: ++seq };
    items.push(it); cash -= def.price;
    if (!quiet) { SND.thunk(); vib(12); }
    dust(it); const b = itemBox(it), [lx, ly] = W2S((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 14); floatText(lx, ly, `-${def.price}만`);
    changed(); return it;
  }
  function vib(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }
  function quickPlace(def, quiet) {
    if (cash < def.price) { if (!quiet) { SND.bad(); toast(`예산이 ${def.price - cash}만 모자라요`); } return null; }
    const cands = [];
    if (def.wall) { for (const r of [0, 1]) { const len = r ? S.GH : S.GW; for (let k = 0; k <= len - def.fw; k++) cands.push({ i: r ? 0 : k, j: r ? k : 0, r, d: Math.abs(k - (len - def.fw) / 2) + r * 0.5 }); } }
    else for (const r of [0, 3]) for (let i = 0; i < S.GW; i++) for (let j = 0; j < S.GH; j++) { const [w, dd] = r % 2 ? [def.fd, def.fw] : [def.fw, def.fd]; const ci = i + w / 2 - S.GW / 2, cj = j + dd / 2 - S.GH / 2; cands.push({ i, j, r, d: Math.hypot(ci, cj) + (r ? 0.3 : 0) + (def.tags.kitchen && S.kind === "pr" && zoneOf(i, j) !== "k" ? 50 : 0) }); } // 파티룸 주방 설비는 주방 칸 먼저
    cands.sort((a, b) => a.d - b.d);
    for (const c of cands) if (!canPlace(def, c.i, c.j, c.r)) return place(def, c, quiet);
    if (!quiet) { SND.bad(); toast(def.cat === "bath" ? "화장실에 자리가 없어요" : "놓을 자리가 없어요"); } return null;
  }
  // 알아서 꾸미기: 업체 기본 구성(필수품 먼저)을 예산 안에서 빈자리에 자동 배치.
  // 업체 물건이라 스타일이 섞이고 바닥·벽은 기본 → 보통 수준(55~65). 스타일을 모으고 소품·조명을 손보면 직접 점수가 오른다
  function autoFill(st) {
    st = STYLES.some((x) => x.k === st) ? st : "mo"; deselect(); endGuests(); hideHint();
    items = []; cash = budget; floor = "base"; wall = "base";
    const MIX = [st, "mo", st, "no", "in", st, "vi"];
    (AUTO[sp] || []).forEach((id, n) => { const d = DEFS[id + "_" + MIX[n % MIX.length]]; if (d && cash >= d.price) quickPlace(d, true); });
    buildBg(); changed(); renderCards(); return result();
  }

  // ── 숫자 ──
  function tween(el, from, to, fmt, k) {
    if (from === to) { el._tw = (el._tw || 0) + 1; el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 420, my = (el._tw = (el._tw || 0) + 1); el.classList.remove("dc-bump"); void el.offsetWidth; el.classList.add("dc-bump");
    const step = () => { if (el._tw !== my) return; const p = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e; el.textContent = fmt(k ? Math.round(v * k) / k : Math.round(v)); if (p < 1 && alive) requestAnimationFrame(step); };
    step();
  }
  const fmtW = (v) => (Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + "억" : v.toLocaleString("ko-KR") + "만");
  function changed() {
    const prev = stats; stats = scoreLayout(sp, items, floor, wall);
    const st = stats, o = shown || { star: 0, cap: 0, wd: 0, we: 0, month: 0, score: 0, cash: cash };
    tween($(".v-star"), o.star, st.star, (v) => v.toFixed(1), 10);
    tween($(".v-cap"), o.cap, st.cap, (v) => v + "인");
    const pe = $(".v-price"); pe.textContent = S.kind === "pr" ? `평일 ${st.wd}만 · 주말 ${st.we}만 (4시간)` : `평일 ${st.wd}만 · 주말 ${st.we}만 (1박)`; if (o.wd !== st.wd) { pe.classList.remove("dc-bump"); void pe.offsetWidth; pe.classList.add("dc-bump"); }
    const me = $(".v-month"); const OL = opts.lines ? (() => { try { return opts.lines(result()); } catch { return null; } })() : null;
    if (OL) { pe.textContent = OL[0]; me.textContent = OL[1]; me._tw = (me._tw || 0) + 1; me.classList.toggle("neg", !!OL[2]); } // 게임: 실제 효과 문구
    else { me.classList.toggle("neg", st.month < 0); tween(me, o.month, st.month, (v) => `월 ${v >= 0 ? "+" : "−"}${fmtW(Math.abs(v))}`); }
    const ring = $(".dc-ring"), sc = $(".v-score"); ring.style.setProperty("--v", st.score); ring.style.setProperty("--c", st.score >= 75 ? "#4fe39a" : st.score >= 50 ? "#f5c04e" : "#ff8ac8"); tween(sc, o.score, st.score, (v) => String(v));
    const ce = $(".dc-cash span"); tween(ce, o.cash, cash, fmtW); $(".dc-cash").classList.toggle("neg", cash < 0);
    const p = st.parts, bars = [["통일", p.unify, "#c77dff", Math.round(p.unify * 100)], ["밀도", p.densS, "#7fd1ff", p.dens < 0.01 ? "텅" : p.densS >= 1 ? "딱" : p.dens > 0.3 ? "꽉" : "휑"], ["조명", p.lightS, "#ffd166", `${Math.floor(p.lights)}/${p.lightT}`], ["필수", p.essS, "#5fe0a0", `${st.essOk.length}/${st.ess.length}`]];
    $(".dc-parts").innerHTML = bars.map(([n, v, c, t]) => `<div class="dc-pt">${n}<b>${t}</b><i style="--c:${c}"><u style="width:${Math.round(clamp(v, 0, 1) * 100)}%"></u></i></div>`).join("");
    const ne = $(".dc-need"); ne.classList.toggle("ok", !st.essMiss.length);
    ne.textContent = st.essMiss.length ? `필요해요: ${st.essMiss.map((e) => e.n).join(" · ")}` : p.unify < 0.6 ? `필수품 완료! 스타일을 하나로 모으면 점수가 올라요` : `필수품 완료! ${SN[st.dom] || ""} 감성 OK`;
    if (prev && st.score >= prev.score + 5) SND.up();
    shown = { star: st.star, cap: st.cap, wd: st.wd, we: st.we, month: st.month, score: st.score, cash };
    if (items.length) hideHint();
    refreshCards();
    if (opts.onChange) try { opts.onChange(result(), getLayout()); } catch {}
  }
  function result() { const s = stats; return { space: sp, score: s.score, star: s.star, cap: s.cap, wd: s.wd, we: s.we, rev: s.rev, month: s.month, spent: budget - cash, cash, budget, style: s.dom, parts: s.parts, missing: s.essMiss.map((e) => e.n) }; }

  // ── 카탈로그 ──
  const IMG = new Map();
  function cardImg(def) { let u = IMG.get(def.id); if (!u) { const s = sprite(def, def.wall ? 0 : 0); u = { src: s.cv.toDataURL(), w: s.w, h: s.h }; IMG.set(def.id, u); } return u; }
  function renderCards() {
    root.querySelectorAll(".dc-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.cat === cat));
    root.querySelectorAll(".dc-chips button").forEach((b) => b.classList.toggle("on", b.dataset.st === style));
    let html = "";
    if (cat === "mat") {
      const fl = [...FLOORS].sort((a, b) => (b.st === style) - (a.st === style)), wl = [...WALLS].sort((a, b) => (b.st === style) - (a.st === style));
      const cell = (k, m) => { const pr = matPrice(k, m); return `<button class="dc-cd${(k === "floor" ? floor : wall) === m.id ? " cur" : ""}" data-mat="${k}:${m.id}">${m.st === style ? `<i class="gr" style="background:#c9b8ff;color:#251a4a">${SN[m.st]}</i>` : ""}${(k === "floor" ? floor : wall) === m.id ? `<i class="on">사용 중</i>` : ""}<span class="im"><img src="${matImg(k, m.id)}" style="width:${44 * 2}px;height:${34 * 2}px" alt=""></span><b>${k === "floor" ? "바닥" : "벽"} · ${m.n}</b><em>${pr ? pr + "만" : "무료"}</em></button>`; };
      html = fl.map((m) => cell("floor", m)).join("") + wl.map((m) => cell("wall", m)).join("");
    } else {
      const defs = Object.values(DEFS).filter((d) => d.cat === cat && d.st === style);
      html = defs.map((d) => { const im = cardImg(d), sc = Math.max(1, Math.floor(Math.min(3, 84 / im.w, 62 / im.h) * 2) / 2); return `<button class="dc-cd" data-id="${d.id}">${d.gr ? `<i class="gr">고급</i>` : ""}<span class="im"><img src="${im.src}" style="width:${im.w * sc}px;height:${im.h * sc}px" alt=""></span><b>${d.n}</b><em>${d.price}만</em></button>`; }).join("");
    }
    cards.innerHTML = html; cards.scrollLeft = 0; refreshCards();
  }
  const MIMG = new Map(); function matImg(k, id) { const key = k + id; if (!MIMG.has(key)) MIMG.set(key, matThumb(k, id)); return MIMG.get(key); }
  function matPrice(k, m) { return Math.round(m.rate * (k === "floor" ? S.GW * S.GH * 0.75 : (S.GW + S.GH) * 1.4)); }
  function refreshCards() { cards.querySelectorAll(".dc-cd[data-id]").forEach((b) => b.classList.toggle("poor", DEFS[b.dataset.id].price > cash)); }
  function applyMat(k, id) {
    const m = (k === "floor" ? FLOORS : WALLS).find((x) => x.id === id); if (!m) return;
    if ((k === "floor" ? floor : wall) === id) return;
    const pr = matPrice(k, m); if (pr > cash) { SND.bad(); toast(`예산이 ${pr - cash}만 모자라요`); return; }
    cash -= pr; if (k === "floor") floor = id; else wall = id; SND.paint(); buildBg();
    const [lx, ly] = W2S(S.GW * U / 2, S.GH * U / 2, k === "floor" ? 0 : 24); sparkle(lx, ly, 18, 40); if (pr) floatText(lx, ly - 6, `-${pr}만`);
    changed(); renderCards();
  }

  // ── 입력 ──
  const ptrs = new Map(); let pinch = null, press = null, pan = null;
  const hitItem = (lx, ly) => {
    // 앞에서부터: 바닥 가구(정렬 역순) → 러그 → 벽걸이
    const fl = topo(items.filter((it) => !DEFS[it.t].wall && !DEFS[it.t].rug).map((it) => { const [w, d] = fp(it); return { it, x0: it.i * U, y0: it.j * U, x1: (it.i + w) * U, y1: (it.j + d) * U, z0: 0, z1: 30 }; })).reverse().map((o) => o.it);
    const order = [...fl, ...items.filter((it) => DEFS[it.t].rug), ...items.filter((it) => DEFS[it.t].wall)];
    for (const it of order) {
      const s = sprite(DEFS[it.t], it.r), b = itemBox(it), [sx, sy] = W2S(b.ox, b.oy, 0), x = Math.floor(lx - (Math.round(sx - s.ax))), y = Math.floor(ly - (Math.round(sy - s.ay)));
      if (x >= 0 && y >= 0 && x < s.w && y < s.h && s.mask[y * s.w + x]) return it;
    }
    return null;
  };
  function lift(e) { return e.pointerType === "touch" ? 12 / zoom / K * 2 : 0; }
  function updDrag(e) {
    const r = stage.getBoundingClientRect(), inStage = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (drag.fly) { drag.fly.style.left = e.clientX + "px"; drag.fly.style.top = e.clientY + "px"; drag.fly.style.display = inStage ? "none" : "block"; }
    if (!inStage) { drag.cand = null; return; }
    const [lx, ly] = toL(e.clientX, e.clientY - (e.pointerType === "touch" ? 26 : 0)), c = candAt(drag.def, lx, ly, drag.r);
    if (!drag.cand || c.i !== drag.cand.i || c.j !== drag.cand.j || c.r !== drag.cand.r) { if (drag.cand) tone(1200 + c.i * 20, 0.015, "triangle", 0.025); }
    drag.cand = c; drag.r = c.r; drag.bad = canPlace(drag.def, c.i, c.j, c.r, drag.item) || (drag.kind === "new" && cash < drag.def.price ? "예산이 모자라요" : null);
  }
  function endDrag(e) {
    const d = drag; drag = null; if (d.fly) d.fly.remove();
    if (d.kind === "new") {
      if (!d.cand) return;
      if (d.bad) { SND.bad(); toast(d.bad); return; }
      place(d.def, d.cand);
    } else if (d.kind === "move") {
      const it = d.item;
      if (d.cand && !d.bad) { it.i = d.cand.i; it.j = d.cand.j; it.r = d.cand.r; it.at = tt; SND.thunk(); dust(it); changed(); }
      else { SND.bad(); toast(d.bad || "원래 자리로"); it.at = tt; }
      moveMode = null; sel = it; showMenu();
    }
  }
  stage.addEventListener("pointerdown", (e) => {
    ac(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch {}
    if (ptrs.size === 2) {
      if (drag && drag.kind === "move") { drag.item.at = tt; drag = null; }
      press = null; pan = null; const [a, b] = [...ptrs.values()];
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx0: tx, ty0: ty }; return;
    }
    if (ptrs.size > 2 || drag) return;
    const [lx, ly] = toL(e.clientX, e.clientY), hit = hitItem(lx, ly);
    if (moveMode && (!hit || hit === moveMode)) { const it = moveMode; drag = { kind: "move", item: it, def: DEFS[it.t], r: it.r, cand: null, bad: null }; SND.pick(); if (menuEl) { menuEl.remove(); menuEl = null; } updDrag(e); return; }
    press = { x0: e.clientX, y0: e.clientY, it: hit }; pan = { x0: e.clientX, y0: e.clientY, tx0: tx, ty0: ty, moved: false };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), s = stage.getBoundingClientRect();
      const nz = clamp(pinch.z0 * d / Math.max(20, pinch.d0), 1, 3.2), mx = (a.x + b.x) / 2 - s.left, my = (a.y + b.y) / 2 - s.top;
      const cx = (pinch.mx - s.left - pinch.tx0) / pinch.z0, cy = (pinch.my - s.top - pinch.ty0) / pinch.z0;
      zoom = nz; tx = mx - cx * nz; ty = my - cy * nz; applyZ(); return;
    }
    if (drag) { updDrag(e); return; }
    if (press && press.it && Math.hypot(e.clientX - press.x0, e.clientY - press.y0) > 7) {
      const it = press.it; press = null; pan = null; deselect(); sel = it;
      drag = { kind: "move", item: it, def: DEFS[it.t], r: it.r, cand: null, bad: null }; SND.pick(); updDrag(e); return;
    }
    if (pan && !(press && press.it)) {
      const dx = e.clientX - pan.x0, dy = e.clientY - pan.y0; if (Math.hypot(dx, dy) > 6) pan.moved = true;
      if (pan.moved && zoom > 1.01) { tx = pan.tx0 + dx; ty = pan.ty0 + dy; applyZ(); }
    }
  });
  const up = (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (pinch) { if (ptrs.size < 2) pinch = null; return; }
    if (drag) { endDrag(e); return; }
    if (press) {
      const it = press.it; press = null;
      if (it) { if (sel === it) { deselect(); } else { deselect(); sel = it; tone(980, 0.04, "triangle", 0.05); showMenu(); } }
      else if (!pan || !pan.moved) deselect();
    }
    pan = null;
  };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  stage.addEventListener("wheel", (e) => { e.preventDefault(); const s = stage.getBoundingClientRect(), mx = e.clientX - s.left, my = e.clientY - s.top, cx = (mx - tx) / zoom, cy = (my - ty) / zoom; zoom = clamp(zoom * (e.deltaY < 0 ? 1.15 : 0.87), 1, 3.2); tx = mx - cx * zoom; ty = my - cy * zoom; applyZ(); }, { passive: false });
  root.querySelector(".dc-zoom").addEventListener("pointerdown", (e) => e.stopPropagation());
  root.querySelector(".dc-zoom").addEventListener("click", (e) => { const z = +e.target.dataset.z; if (!z) return; const sw = stage.clientWidth / 2, sh = stage.clientHeight / 2, cx = (sw - tx) / zoom, cy = (sh - ty) / zoom; zoom = clamp(z > 0 ? zoom * 1.5 : zoom / 1.5, 1, 3.2); tx = sw - cx * zoom; ty = sh - cy * zoom; applyZ(); SND.tab(); });
  // 카드 끌기
  let cpress = null;
  cards.addEventListener("pointerdown", (e) => { const b = e.target.closest(".dc-cd"); if (!b) return; ac(); cpress = { b, id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), pt: e.pointerType }; });
  cards.addEventListener("pointermove", (e) => {
    if (drag && drag.kind === "new") { updDrag(e); return; }
    if (!cpress || cpress.id !== e.pointerId) return;
    const dx = e.clientX - cpress.x0, dy = e.clientY - cpress.y0;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) { cpress = null; return; }
    if (dy < -10 && Math.abs(dy) > Math.abs(dx)) {
      const b = cpress.b; cpress = null; if (!b.dataset.id) return; const def = DEFS[b.dataset.id];
      try { b.setPointerCapture(e.pointerId); } catch {}
      const im = cardImg(def), fly = document.createElement("img"); fly.className = "dc-fly"; fly.src = im.src; fly.style.width = im.w * K * zoom + "px"; fly.style.height = im.h * K * zoom + "px"; document.body.appendChild(fly);
      deselect(); drag = { kind: "new", def, r: def.wall ? 0 : 0, cand: null, bad: null, fly }; SND.pick(); hideHint(); updDrag(e);
    }
  });
  const cup = (e) => {
    if (drag && drag.kind === "new") { endDrag(e); return; }
    if (!cpress || cpress.id !== e.pointerId) return; const b = cpress.b; cpress = null;
    if (b.dataset.mat) { const [k, id] = b.dataset.mat.split(":"); applyMat(k, id); return; }
    if (b.dataset.id) { deselect(); hideHint(); const it = quickPlace(DEFS[b.dataset.id]); if (it) { sel = null; } }
  };
  cards.addEventListener("pointerup", cup); cards.addEventListener("pointercancel", (e) => { if (drag && drag.kind === "new") { if (drag.fly) drag.fly.remove(); drag = null; } cpress = null; });
  root.querySelector(".dc-tabs").addEventListener("click", (e) => { const k = e.target.closest("button")?.dataset.cat; if (!k) return; cat = k; SND.tab(); renderCards(); });
  root.querySelector(".dc-chips").addEventListener("click", (e) => { const k = e.target.closest("button")?.dataset.st; if (!k) return; style = k; SND.tab(); renderCards(); });
  $(".dc-play").addEventListener("click", () => guestView());
  if (opts.onAuto) $(".dc-auto").addEventListener("click", () => { ac(); opts.onAuto(() => { const r = autoFill(opts.autoStyle); SND.up(); return { layout: getLayout(), result: r }; }); });
  $(".dc-save").addEventListener("click", () => { ac(); SND.up(); toast("저장했어요"); if (opts.onSave) try { opts.onSave(getLayout(), result()); } catch {} });
  $(".dc-back").addEventListener("click", () => { if (opts.onDone) opts.onDone(result(), getLayout()); });
  root.querySelectorAll(".dc-seg button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.sp !== sp) { setSpace(b.dataset.sp); SND.tab(); } }));
  function hideHint() { if (hintEl) { hintEl.remove(); hintEl = null; } }

  // ── 저장 ──
  function getLayout() { return { v: 1, space: sp, floor, wall, cash, budget, items: items.map((it) => ({ t: it.t, i: it.i, j: it.j, r: it.r })) }; }
  function setLayout(o) {
    if (!o || !SPACES[o.space]) return false;
    if (o.space !== sp) { mem[sp] = getLayout(); sp = o.space; S = SPACES[sp]; }
    floor = FLOORS.some((f) => f.id === o.floor) ? o.floor : "base"; wall = WALLS.some((w) => w.id === o.wall) ? o.wall : "base";
    budget = o.budget || opts.budget || S.budget; items = []; deselect(); endGuests();
    let spent = matPrice("floor", FLOORS.find((f) => f.id === floor)) + matPrice("wall", WALLS.find((w) => w.id === wall));
    for (const x of o.items || []) { const d = DEFS[x.t]; if (!d) continue; if (canPlace(d, x.i, x.j, x.r || 0)) continue; items.push({ t: x.t, i: x.i, j: x.j, r: x.r || 0, at: 0, id: ++seq }); spent += d.price; }
    cash = typeof o.cash === "number" ? o.cash : budget - spent;
    syncTitle(); fit(); changed(); renderCards(); return true;
  }
  function setSpace(k) {
    if (!SPACES[k]) return; mem[sp] = getLayout(); sp = k; S = SPACES[k];
    if (mem[k]) { setLayout(mem[k]); return; }
    items = []; floor = "base"; wall = "base"; budget = (opts.budgets && opts.budgets[k]) || (opts.budget && spaces.length === 1 ? opts.budget : S.budget); cash = budget; deselect(); endGuests(); shown = null;
    syncTitle(); fit(); changed(); renderCards();
  }
  function syncTitle() {
    $(".dc-ttl b").textContent = opts.title || `${S.n} 꾸미기`; $(".dc-ttl small").textContent = `${S.sub} · ${S.GW}×${S.GH}칸`;
    root.querySelectorAll(".dc-seg button").forEach((b) => b.classList.toggle("on", b.dataset.sp === sp));
    if (S.kind === "ab" && cat === "party") cat = "bed"; if (S.kind === "pr" && cat === "bed") cat = "liv";
  }

  // ── 루프 ──
  let last = performance.now();
  function loop(now) {
    if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; tt += dt;
    stepGuests(dt); draw(); raf = requestAnimationFrame(loop);
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => fit()) : null; if (ro) ro.observe(stage);

  // 시작
  S = SPACES[sp]; budget = opts.budget || S.budget; cash = budget;
  syncTitle(); fit(); cat = S.kind === "pr" ? "liv" : "bed";
  if (opts.layout) setLayout(opts.layout); else { changed(); renderCards(); }
  if (!items.length) { hintEl = document.createElement("div"); hintEl.className = "dc-hint"; hintEl.textContent = "카드를 위로 끌어 방에 놓아요 (톡 하면 바로 놓기)"; stage.appendChild(hintEl); }
  raf = requestAnimationFrame(loop);

  const dbg = {
    place: (id, i, j, r = 0) => { const d = DEFS[id]; if (!d) return "없는 가구 " + id; const why = canPlace(d, i, j, r); if (why) return why; return place(d, { i, j, r }, true) ? "ok" : "예산"; },
    quick: (id) => !!quickPlace(DEFS[id]),
    mat: (k, id) => applyMat(k, id),
    tab: (c, s) => { if (c) cat = c; if (s) style = s; renderCards(); },
    select: (n) => { const it = items[n]; if (it) { sel = it; showMenu(); } },
    clear: () => { items = []; cash = budget; floor = "base"; wall = "base"; buildBg(); changed(); },
    zoom: (z, x = 0, y = 0) => { zoom = z; tx = x; ty = y; applyZ(); },
    defs: () => Object.keys(DEFS), stats: () => stats, items: () => items,
  };
  return {
    getLayout, setLayout, setSpace, guestView, dbg, autoFill: (st) => { const r = autoFill(st); return { layout: getLayout(), result: r }; },
    getStats: () => result(),
    close: () => { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); deselect(); host.innerHTML = ""; return result(); },
  };
}
