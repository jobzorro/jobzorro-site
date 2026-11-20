// After 6PM v4 - procedural pixel-art bust portraits (vanilla ES module, no deps)
// Native grid 48x56. Deterministic: same look + gender + expression -> same pixels.

const W = 48, H = 56;

export const LOOK_ENUMS = {
  skin: ['s1', 's2', 's3', 's4', 's5'],
  hair: {
    F: ['long_straight', 'long_wave', 'bob', 'short_cut', 'ponytail', 'bun', 'layered', 'side_long', 'pixie'],
    M: ['short_crop', 'two_block', 'comma', 'side_part', 'perm', 'slick_back', 'curtain', 'buzz', 'long_tied'],
  },
  hairF: ['long_straight', 'long_wave', 'bob', 'short_cut', 'ponytail', 'bun', 'layered', 'side_long', 'pixie'],
  hairM: ['short_crop', 'two_block', 'comma', 'side_part', 'perm', 'slick_back', 'curtain', 'buzz', 'long_tied'],
  hairColor: ['black', 'darkbrown', 'brown', 'ash', 'blonde', 'redbrown', 'gray'],
  eyes: ['soft', 'sharp', 'round', 'monolid', 'smile'],
  brows: ['straight', 'arched', 'thick'],
  outfit: ['suit', 'shirt', 'knit', 'hoodie', 'blouse', 'jacket', 'tshirt', 'apron', 'coat', 'dress'],
  outfitColor: ['navy', 'black', 'white', 'beige', 'gray', 'sky', 'pink', 'olive', 'wine'],
  acc: ['none', 'glasses', 'round_glasses', 'earrings', 'necklace', 'cap', 'headband', 'mole'],
  expression: ['neutral', 'smile', 'sad', 'angry', 'blush', 'surprised'],
};

// ---------------------------------------------------------------- colors
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const th = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) { const A = hx(a), B = hx(b); return th(A.map((v, i) => v + (B[i] - v) * t)); }

const SKIN = {
  s1: { hl: '#FFF7F1', base: '#FDE8DB', sh: '#F5CBB8', sh2: '#E6AC97', ol: '#B9705F', blush: '#F79AA0' },
  s2: { hl: '#FFF0E3', base: '#FADCC5', sh: '#EEBC9F', sh2: '#DC9F82', ol: '#A8654E', blush: '#F2908A' },
  s3: { hl: '#F9E0C8', base: '#F0C9A7', sh: '#DCA784', sh2: '#C68C69', ol: '#935B42', blush: '#EA8878' },
  s4: { hl: '#EBC7A4', base: '#DBAB84', sh: '#C38C64', sh2: '#A9724E', ol: '#774730', blush: '#DA7D6A' },
  s5: { hl: '#CFA078', base: '#B98159', sh: '#9C6541', sh2: '#825032', ol: '#55321F', blush: '#C86858' },
};
const HAIR = {
  black:     { hl: '#5C6890', base: '#30354B', sh: '#23273B', deep: '#1A1C2C', ol: '#11121D' },
  darkbrown: { hl: '#86614A', base: '#52382B', sh: '#3E2A20', deep: '#2E1F18', ol: '#1D120E' },
  brown:     { hl: '#BD8C5E', base: '#88603F', sh: '#6A472E', deep: '#503420', ol: '#321E12' },
  ash:       { hl: '#B9B1AD', base: '#8A817E', sh: '#6D6563', deep: '#554E4D', ol: '#34302F' },
  blonde:    { hl: '#F8E6B0', base: '#E4C17C', sh: '#C79E5C', deep: '#A88045', ol: '#73552C' },
  redbrown:  { hl: '#C8775C', base: '#924637', sh: '#72332A', deep: '#57251F', ol: '#371512' },
  gray:      { hl: '#E6E6EC', base: '#B6B7BF', sh: '#92939D', deep: '#777883', ol: '#4E4F5A' },
};
const CLOTH = {
  navy:  { hl: '#4D5F8E', base: '#35436D', sh: '#283457', deep: '#1D2643', ol: '#13192B' },
  black: { hl: '#4C4C57', base: '#323238', sh: '#25252A', deep: '#1B1B1F', ol: '#0F0F13' },
  white: { hl: '#FFFFFF', base: '#F2F0EB', sh: '#DAD7D1', deep: '#C3C0BA', ol: '#8D8B87' },
  beige: { hl: '#F3E5CF', base: '#E1CBAA', sh: '#C9B08C', deep: '#B09674', ol: '#7B654B' },
  gray:  { hl: '#C2C4CB', base: '#9EA1AA', sh: '#82858E', deep: '#6A6D76', ol: '#44464D' },
  sky:   { hl: '#D3E7F7', base: '#ABCDEB', sh: '#8AB0D6', deep: '#7096BE', ol: '#48668B' },
  pink:  { hl: '#FDDDE4', base: '#F3B8C6', sh: '#DE97AA', deep: '#C57E92', ol: '#95576B' },
  olive: { hl: '#A6AD7B', base: '#7F8758', sh: '#646B43', deep: '#4D5334', ol: '#343820' },
  wine:  { hl: '#AB4E69', base: '#813048', sh: '#652337', deep: '#4D1A29', ol: '#300E18' },
};
const EYE = { lashF: '#2A1A1F', lashM: '#2C2125', D: '#3A2420', M: '#5F3B2C', B: '#8E5E43', W: '#FBF7F4', H: '#FFFFFF' };
const GOLD = { base: '#EBC66C', sh: '#B98D3A', ol: '#7A5A22' };

// ---------------------------------------------------------------- buffer
// groups (outline is drawn where a pixel meets background or a lower-z pixel of another group)
const G = { HAIR: 1, SHAVE: 2, BODY: 3, CLOTH: 4, INNER: 5, LAPEL: 6, TIE: 7, EAR: 8, FACE: 9, BUN: 10, CAP: 11, BAND: 12, BRIM: 13 };

function newBuf() {
  return { c: new Array(W * H).fill(null), g: new Uint8Array(W * H), z: new Uint8Array(W * H), o: new Array(W * H).fill(null) };
}
function setPx(b, x, y, col, g, z, o) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x; b.c[i] = col; b.g[i] = g; b.z[i] = z; b.o[i] = o;
}
function paint(b, x, y, col) { // decal: recolor existing pixel only
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = y * W + x; if (b.c[i]) b.c[i] = col;
}
function force(b, x, y, col) { // draw regardless (after outline pass)
  if (x < 0 || y < 0 || x >= W || y >= H) return; b.c[y * W + x] = col;
}
function getG(b, x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return 0; const i = y * W + x; return b.c[i] ? b.g[i] : 0; }
function getZ(b, x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return 0; return b.z[y * W + x]; }
function layer(b, mask, colorFn, g, z, o) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask(x, y)) setPx(b, x, y, colorFn(x, y), g, z, o);
}
function outlinePass(b) {
  const out = b.c.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!b.c[i]) continue;
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (ny >= H) continue;                     // canvas bottom: body continues
      if (nx < 0 || nx >= W || ny < 0) { edge = true; break; }
      const j = ny * W + nx;
      if (!b.c[j]) { edge = true; break; }
      if (b.g[j] !== b.g[i] && b.z[j] < b.z[i]) { edge = true; break; }
    }
    if (edge && b.o[i]) out[i] = b.o[i];
  }
  b.c = out;
}

// ---------------------------------------------------------------- geometry helpers
const OUT_SHIFT = 1;
const DX = x => x + 0.5 - 24;
const AD = x => Math.abs(x + 0.5 - 24);
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) % 1000; };
function inEll(x, y, cx, cy, rx, ry) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; return u * u + v * v <= 1; }
function fringeFn(base, clumps) {
  const bf = typeof base === 'function' ? base : () => base;
  return x => { let f = bf(x); for (const [xc, tip, s] of clumps) { const v = tip - s * Math.abs(x + 0.5 - xc); if (v > f) f = v; } return f; };
}
const sym = list => list.flatMap(([xc, t, s]) => (Math.abs(xc - 24) < 0.01 ? [[xc, t, s]] : [[xc, t, s], [48 - xc, t, s]]));
// interpolated row spans: pts = [[y, xa, xb], ...] (left-side coordinates)
function rows(pts) {
  return y => {
    if (y < pts[0][0] || y > pts[pts.length - 1][0]) return null;
    for (let k = 0; k < pts.length - 1; k++) {
      const [y0, a0, b0] = pts[k], [y1, a1, b1] = pts[k + 1];
      if (y >= y0 && y <= y1) { const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0); return [Math.round(a0 + (a1 - a0) * t), Math.round(b0 + (b1 - b0) * t)]; }
    }
    return null;
  };
}
function wavy(fn, amp, per, from) {
  return y => { const r = fn(y); if (!r) return r; if (y < from) return r; const o = Math.round(amp * Math.sin((y - from) / per)); return [r[0] + o, r[1] + o]; };
}

// ---------------------------------------------------------------- face / body geometry
const FACE_HW = {
  F: { 10: 6, 11: 8, 12: 9, 13: 10, 28: 10, 29: 10, 30: 9, 31: 9, 32: 8, 33: 7, 34: 6, 35: 5, 36: 3 },
  M: { 10: 6, 11: 8, 12: 9, 13: 10, 28: 11, 29: 10, 30: 10, 31: 9, 32: 9, 33: 8, 34: 7, 35: 6, 36: 5, 37: 3 },
};
function faceHW(g, y) { if (y < 10 || y > (g === 'F' ? 36 : 37)) return 0; const t = FACE_HW[g]; return t[y] != null ? t[y] : 11; }
function inFace(g, x, y) { const hw = faceHW(g, y); return hw > 0 && x >= 24 - hw && x <= 23 + hw; }

function bodyGeom(g) {
  const hwMax = g === 'F' ? 19.5 : 21.5, neckD = g === 'F' ? 4 : 5;
  const top = d => {
    if (d <= neckD + 1) return 42;
    let y = 42 + (d - neckD - 1) * 0.3;
    const edge = hwMax - 3.5;
    if (d > edge) y += (d - edge) * (d - edge) * 0.55;
    return y;
  };
  return { hwMax, neckD, top, inBody: (x, y) => AD(x) <= hwMax && y + 0.5 >= top(AD(x)) };
}

// ---------------------------------------------------------------- hair styles
// Each style: cap [cy, rx, ry], fringe(x), optional backCut, backExtra, locks {L, R}, front(x,y), tone, bun, post
function capMask(st) {
  const [cy, rx, ry] = st.cap;
  if (st.bumpy || st.spiky) {
    return (x, y) => {
      const u = (x + 0.5 - 24) / rx, v = (y + 0.5 - cy) / ry, a = Math.atan2(v, u);
      let r = 1;
      if (st.bumpy) r += st.bumpy * Math.sin(a * 11 + 0.6);
      if (st.spiky && v < 0.1) { const t = (a * 15 / Math.PI + 0.5) % 2; r += st.spiky * (t < 1 ? t : 2 - t) - st.spiky * 0.4; }
      return u * u + v * v <= r * r;
    };
  }
  return (x, y) => inEll(x, y, 24, cy, rx, ry);
}

const shavedSides = (yTop, yBot, ad) => ({
  backCut: (x, y) => y > yBot,
  tone: (x, y, info) => {
    if (info.front) return null;
    if (AD(x) > ad && y >= yTop && y <= yBot) return y === yTop ? 'sh' : 'shave';
    return null;
  },
});

const PONY = rows([[6, 31, 34], [8, 32, 37], [11, 34, 40], [14, 35, 41], [19, 36, 42], [26, 37, 42], [33, 37, 41], [39, 37, 40], [44, 38, 39]]);
function styleDef(name, g) {
  const F = g === 'F';
  switch (name) {
    // ------------------------------------------------ female
    case 'long_straight': return {
      cap: [19, 13.8, 14.6],
      backExtra: (x, y) => AD(x) <= 14.5 && y >= 18 && y <= 49 - Math.max(0, AD(x) - 11),
      fringe: fringeFn(12, [[24, 20.6, 1.5], ...sym([[19.6, 19.6, 1.4], [15.2, 20.4, 1.3], [11.6, 23.5, 0.8]])]),
      locks: { L: rows([[17, 10, 13], [24, 10, 14], [33, 10, 14], [39, 9, 15], [45, 8, 16], [50, 8, 16], [53, 9, 14], [55, 11, 13]]) },
      ahoge: true,
    };
    case 'long_wave': return {
      cap: [19, 14.3, 14.8],
      backExtra: (x, y) => AD(x) <= 15.5 && y >= 18 && y <= 50 - Math.max(0, AD(x) - 12),
      fringe: fringeFn(12, [[12.2, 23, 0.8], [16.4, 20.2, 1.3], [20.8, 20.8, 1.5], [26.8, 19.2, 1.4], [31.2, 20, 1.3], [35.8, 23, 0.8]]),
      locks: { L: wavy(rows([[17, 10, 13], [26, 10, 14], [34, 9, 15], [42, 8, 16], [48, 7, 16], [52, 8, 15], [55, 10, 13]]), 1.2, 2.4, 27) },
      wave: true,
    };
    case 'bob': return {
      cap: [19.4, 14.6, 14.9],
      backExtra: (x, y) => AD(x) <= 14.5 && y >= 18 && y <= 35 + (AD(x) < 12 ? 1 : 0),
      fringe: fringeFn(12, [[24, 19.7, 0.35], ...sym([[13.2, 20.4, 0.9], [17.2, 19.6, 0.5], [21, 19.9, 0.6]])]),
      locks: { L: rows([[17, 10, 13], [30, 10, 14], [33, 10, 15], [35, 11, 16], [36, 13, 16]]) },
    };
    case 'short_cut': return {
      cap: [19.2, 14.1, 14.6],
      backExtra: (x, y) => AD(x) <= 14 && y >= 18 && y <= 28,
      fringe: fringeFn(12, [[12.6, 22.2, 0.9], [16.4, 20.4, 1.3], [20.6, 19.2, 1.4], [25.2, 17.8, 1.4], [29.8, 17.4, 1.3], [34.4, 19.6, 1.0]]),
      locks: { L: rows([[17, 10, 13], [25, 10, 14], [28, 11, 14], [30, 12, 13]]), R: rows([[17, 34, 37], [24, 33, 37], [27, 34, 36], [28, 35, 35]]) },
    };
    case 'ponytail': return {
      cap: [19, 13.4, 14.2],
      backCut: (x, y) => y > 27,
      backExtra: (x, y) => { const r = PONY(y); return !!r && x >= r[0] && x <= r[1]; },
      fringe: fringeFn(12, [[24, 19.8, 1.6], ...sym([[19.8, 18.8, 1.4], [15.4, 19.4, 1.2], [12.2, 21.5, 0.9]])]),
      locks: { L: rows([[18, 12, 13], [26, 12, 13], [30, 13, 13]]) },
      tie: [[37, 12], [38, 12], [39, 12], [37, 13], [38, 13], [39, 13], [40, 13]], tieHair: true,
    };
    case 'bun': return {
      cap: [19.4, 13.4, 14],
      backCut: (x, y) => y > 27,
      bun: [24, 4.6, 5.2, 4.2],
      fringe: fringeFn(12, [[13, 21.5, 0.9], [16.4, 19.4, 1.2], [20.2, 18.4, 1.3], [24.4, 17.6, 1.4], [28.6, 18.6, 1.3], [32.6, 19.6, 1.2], [35.4, 21.5, 0.9]]),
      locks: { L: rows([[18, 12, 13], [27, 12, 13], [31, 13, 13]]) },
      tie: [[21, 8], [22, 8], [23, 8], [24, 8], [25, 8], [26, 8]],
    };
    case 'layered': return {
      cap: [19, 14.1, 14.7],
      backExtra: (x, y) => AD(x) <= 15 && y >= 18 && y <= 41 - Math.max(0, AD(x) - 12),
      fringe: fringeFn(x => 12.5 + AD(x) * 0.55, sym([[19.2, 20.2, 1.5], [14.6, 21.6, 1.1], [11.8, 24, 0.8]])),
      locks: { L: x => null, Lf: rows([[16, 10, 14], [24, 9, 14], [30, 9, 14], [35, 9, 15], [39, 8, 15], [42, 6, 14], [44, 4, 11], [45, 3, 7]]) },
      layeredLock: true,
    };
    case 'side_long': return {
      cap: [19, 14.2, 14.7],
      backCut: (x, y) => x >= 24 && y > 27,
      backExtra: (x, y) => x < 24 && AD(x) <= 15 && y >= 18 && y <= 47,
      fringe: fringeFn(x => (x >= 30 ? 13 : 13 + (30 - x) * 0.42), [[12.8, 23.4, 0.9], [16.6, 20.8, 1.2], [20.6, 19.6, 1.3], [24.6, 17.4, 1.3], [28.4, 15.4, 1.2]]),
      locks: { L: wavy(rows([[16, 9, 14], [24, 8, 15], [32, 8, 15], [39, 7, 17], [45, 6, 18], [50, 7, 17], [53, 9, 15], [55, 11, 13]]), 1, 2.6, 30), R: () => null },
      part: { x: 30, y0: 6, y1: 12 },
    };
    case 'pixie': return {
      cap: [19, 14.2, 14.8],
      backCut: (x, y) => y > 26,
      fringe: fringeFn(12, [[12.8, 22.6, 0.8], [16.2, 21.0, 0.9], [19.8, 19.6, 1.0], [23.6, 18.2, 1.1], [27.6, 16.8, 1.1], [31.6, 16.2, 1.0], [35, 17.6, 0.9]]),
      locks: { L: rows([[17, 11, 13], [27, 11, 14], [30, 12, 13], [31, 13, 13]]), R: rows([[17, 34, 36], [25, 34, 36], [27, 35, 35]]) },
      ahoge: true,
    };
    // ------------------------------------------------ male
    case 'short_crop': return {
      cap: [19, 13.3, 14.1], spiky: 0.05,
      backCut: (x, y) => y > 23,
      fringe: fringeFn(12, [[13.4, 18.4, 1.0], [16.8, 16.4, 1.2], [20.4, 17.2, 1.3], [24.2, 16.2, 1.3], [28, 17, 1.3], [31.6, 16.2, 1.2], [34.8, 18, 1.0]]),
      locks: { L: rows([[21, 12, 13], [26, 13, 13]]) },
    };
    case 'two_block': return {
      cap: [18.6, 13.9, 15], spiky: 0.04,
      ...shavedSides(17, 24, 9.5),
      fringe: fringeFn(12, [[15, 18.4, 1.0], [19, 19.1, 1.2], [23.6, 19.6, 1.5], [28.2, 19.1, 1.2], [32.6, 18.4, 1.0]]),
      locks: { L: () => null },
    };
    case 'comma': return {
      cap: [18.6, 13.7, 14.8], spiky: 0.035,
      ...shavedSides(17, 24, 9.5),
      fringe: fringeFn(x => (x >= 22 ? 12.6 : 12), [[13.4, 18, 1.0], [17.4, 19.0, 0.7], [21, 18.2, 1.2], [25.6, 15.8, 1.1], [30, 15.4, 1.1], [33.6, 16.4, 1.0]]),
      front: (x, y) => (y === 18 && x >= 16 && x <= 19) || (x === 20 && y === 17) || (x === 21 && y === 16),
      locks: { L: () => null },
      comma: true,
    };
    case 'side_part': return {
      cap: [19, 13.5, 14.3],
      backCut: (x, y) => y > 23,
      fringe: fringeFn(x => (x < 17 ? 13.4 : 12.4), [[21.4, 15.2, 0.7], [27.6, 15.8, 0.8], [32.6, 17, 1.0], [35, 18, 1.0]]),
      locks: { L: rows([[21, 12, 13], [26, 13, 13]]) },
      part: { x: 17, y0: 7, y1: 13 },
    };
    case 'perm': return {
      cap: [19, 14.8, 15.1], bumpy: 0.045,
      backCut: (x, y) => y > 27,
      fringe: fringeFn(12, [[13.8, 19.6, 1.0], [17.4, 19.2, 1.2], [21, 18.2, 1.2], [24.8, 18.8, 1.2], [28.4, 18.0, 1.2], [32, 19.2, 1.2], [35.2, 19.6, 1.0]]),
      locks: { L: rows([[20, 11, 13], [26, 12, 13]]) },
      curly: true,
    };
    case 'slick_back': return {
      cap: [19.4, 13.3, 14.1],
      backCut: (x, y) => y > 23,
      fringe: fringeFn(x => (AD(x) < 2.5 ? 13 : AD(x) < 7.5 ? 12.2 : 13.6), []),
      front: (x, y) => (x === 21 && y >= 12 && y <= 14) || (x === 22 && y === 15),
      locks: { L: rows([[21, 12, 13], [25, 13, 13]]) },
      slick: true,
    };
    case 'curtain': return {
      cap: [19, 13.7, 14.5],
      backCut: (x, y) => y > 24,
      fringe: fringeFn(x => Math.min(19.2, 12.6 + Math.max(0, AD(x) - 0.5) * 0.95), sym([[15.6, 19.4, 0.9], [19.6, 18.4, 1.0], [12.6, 21, 0.8]])),
      locks: { L: rows([[21, 12, 13], [26, 13, 13]]) },
      part: { x: 23, y0: 6, y1: 12, center: true },
    };
    case 'buzz': return {
      cap: [19.3, 12.9, 13.9],
      backCut: (x, y) => y > 23,
      fringe: fringeFn(x => (AD(x) < 7.5 ? 12.6 : 13.8), []),
      locks: { L: rows([[21, 12, 13], [24, 13, 13]]) },
      buzz: true,
    };
    case 'long_tied': return {
      cap: [19.4, 13.3, 14.1],
      backCut: (x, y) => y > 26,
      bun: [24, 5.2, 3.8, 3.2],
      fringe: fringeFn(x => (AD(x) < 1 ? 12.2 : 13), sym([[17.6, 15, 0.9], [14.2, 18, 0.8]])),
      locks: { L: rows([[16, 12, 13], [22, 11, 13], [28, 12, 13], [30, 13, 13]]) },
      part: { x: 23, y0: 7, y1: 12, center: true },
      tie: [[23, 8], [24, 8]],
    };
  }
  return null;
}

// ---------------------------------------------------------------- eyes
// 6 cols (col0 = outer corner of LEFT eye at x=15), rows start at y=22.
// K lash, k lower lid, D/M/B iris dark/mid/light, H highlight, W white, S crease shade, A aegyo highlight
const EYES = {
  F: {
    soft:    ['..SSS.', '.KKKK.', 'KKKKKK', 'KDHDDK', 'kDDhDW', '.kBBk.'],
    sharp:   ['K..SS.', 'KKKKKK', 'WKKKKK', 'WDHDDK', 'WDDhDk', '.kBBk.'],
    round:   ['..SS..', '.KKKK.', 'KKKKKK', 'KDHDDK', 'WDDDhW', 'WDMMDW', '.kBBk.'],
    monolid: ['......', '......', '.KKKKK', 'KKKKKK', 'WDHDDW', '.kMhk.'],
    smile:   ['..SSS.', '.KKKK.', 'KKKKKK', 'KDHDDK', 'kkDDkk', '..AA..'],
  },
  M: {
    soft:    ['..ccc.', '.KKKK.', 'KDDDDK', 'WDHDDW', 'kDDhDW', '..kk..'],
    sharp:   ['K.....', 'KKKKKK', 'WDDDDK', 'WDHDDk', '.kMhk.'],
    round:   ['..cc..', '.KKKK.', 'KDDDDK', 'WDHDDW', 'WDDhDW', '.kMMk.'],
    monolid: ['......', '......', 'KKKKKK', 'WDHDDW', '.kMhk.'],
    smile:   ['..ccc.', '.KKKK.', 'KDDDDK', 'KDHDDK', 'kkDDkk', '..AA..'],
  },
};
const CLOSED = { F: ['......', '......', '.KKKK.', 'KK..KK', 'K.....', '.AAAA.'], M: ['......', '......', '.KKKK.', 'K....K'] };
const SURPRISED = { F: ['......', '.KKKK.', 'KWWWWK', 'WWHDWW', 'WWDDWW', 'kWDDWk', '.kkkk.'], M: ['......', '.KKKK.', 'KWWWWK', 'WWHDWW', 'kWDDWk', '.kkkk.'] };

function dropLid(pat, drops) {
  const P = pat.map(r => r.split(''));
  for (let c = 0; c < 6; c++) {
    let n = drops[c]; if (!n) continue;
    for (let r = 0; r < P.length; r++) {
      const ch = P[r][c]; if (ch === '.' || ch === 'S' || ch === 'c' || ch === 'A') continue;
      if (n > 0) { P[r][c] = '.'; n--; continue; }
      P[r][c] = 'K'; break;
    }
  }
  return P.map(r => r.join(''));
}
function eyePattern(style, g, expr) {
  const set = EYES[g] || EYES.F;
  let p = set[style] || set.soft;
  if (expr === 'smile') return CLOSED[g];
  if (expr === 'surprised') return SURPRISED[g];
  if (expr === 'angry') { p = p.map(r => r.replace(/[Sc]/g, '.')); return dropLid(p, [0, 0, 1, 1, 1, 1]); }
  if (expr === 'sad') return dropLid(p, [1, 1, 1, 0, 0, 0]);
  return p;
}
function drawEyes(b, L, g, expr, sk) {
  const pat = eyePattern(L.eyes, g, expr);
  const lash = g === 'F' ? EYE.lashF : EYE.lashM;
  const col = { K: lash, k: mix(lash, sk.base, 0.62), D: EYE.D, M: EYE.M, B: mix(EYE.M, EYE.B, 0.7), H: EYE.H, h: mix(EYE.M, EYE.H, 0.55),
    W: EYE.W, S: sk.sh, c: mix(sk.base, sk.sh, 0.6), A: mix(sk.base, sk.hl, 0.8) };
  const nonMirror = ch => ch === 'H' || ch === 'h';
  pat.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    paint(b, 15 + c, 22 + r, col[ch]);
    paint(b, 32 - c, 22 + r, col[nonMirror(ch) ? 'D' : ch]);
  }));
  pat.forEach((row, r) => [...row].forEach((ch, c) => { if (nonMirror(ch)) paint(b, 27 + c, 22 + r, col[ch]); }));
}

// ---------------------------------------------------------------- brows
const BROWS = {
  straight: { dy: [1, 0, 0, 0, 0, 0, 0], F: [1, 1, 1, 1, 1, 1, 0], M: [1, 1, 2, 2, 2, 2, 1] },
  arched:   { dy: [2, 1, 0, 0, 0, 0, 1], F: [1, 1, 1, 1, 1, 1, 0], M: [1, 1, 2, 2, 2, 1, 1] },
  thick:    { dy: [1, 0, 0, 0, 0, 0, 0], F: [1, 2, 2, 2, 2, 1, 1], M: [1, 2, 2, 2, 2, 2, 2] },
};
const BROW_EXPR = {
  neutral: [0, 0, 0, 0, 0, 0, 0], smile: [0, -1, -1, -1, -1, 0, 0], blush: [0, 0, 0, 0, -1, -1, -1],
  sad: [1, 1, 0, 0, -1, -1, -2], angry: [-1, -1, 0, 0, 1, 1, 2], surprised: [-2, -2, -2, -2, -2, -2, -2],
};
function drawBrows(b, L, g, expr, hp, sk) {
  const def = BROWS[L.brows] || BROWS.straight;
  const thk = def[g] || def.F, ex = BROW_EXPR[expr] || BROW_EXPR.neutral;
  const base = g === 'F' ? 20 : 19;
  const dark = L.hairColor === 'blonde' || L.hairColor === 'gray' ? hp.deep : mix(hp.sh, hp.ol, 0.35);
  const soft = mix(dark, sk.base, 0.4);
  for (let c = 0; c < 7; c++) {
    const t = thk[c]; if (!t) continue;
    const y0 = base + def.dy[c] + ex[c];
    for (let k = 0; k < t; k++) {
      let colr = dark;
      if (c === 0 || (g === 'F' && c === 6)) colr = soft;
      if (t >= 2 && k === t - 1) colr = mix(dark, sk.base, g === 'F' ? 0.45 : 0.22);
      paint(b, 14 + c, y0 + k, colr); paint(b, 33 - c, y0 + k, colr);
    }
  }
}

// ---------------------------------------------------------------- mouth
const MOUTH = {
  neutralF: ['......', '......', '.mLLm.', '..pp..'],
  neutralM: ['......', '......', '.mLLm.', '......'],
  smile:    ['......', 'm....m', '.LRRL.', '..LL..'],
  blush:    ['......', '.m..m.', '..LL..', '......'],
  sad:      ['......', '......', '..LL..', '.m..m.'],
  angry:    ['......', '......', 'mLLLLm', 'L....L'],
  surprised:['......', '..LL..', '.LRRL.', '..LL..'],
};
function drawMouth(b, g, expr, sk) {
  const key = expr === 'neutral' ? (g === 'F' ? 'neutralF' : 'neutralM') : expr;
  const pat = MOUTH[key] || MOUTH.neutralM;
  const line = mix(sk.ol, '#7A2E34', g === 'F' ? 0.45 : 0.25);
  const col = { L: line, m: mix(line, sk.base, 0.5), R: g === 'F' ? '#B04A55' : mix(line, '#5A2426', 0.5), P: '#E8838C', p: mix(sk.base, '#E07A86', 0.38) };
  pat.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') paint(b, 21 + c, 31 + r, col[ch]); }));
}

// ---------------------------------------------------------------- outfits
function contrastInner(cc) { return ['white', 'beige', 'sky', 'pink'].includes(cc) ? 'navy' : 'white'; }
function drawOutfit(b, L, g, sk) {
  const P = CLOTH[L.outfitColor] || CLOTH.navy;
  const bg = bodyGeom(g);
  const { inBody, top, hwMax } = bg;
  let outfit = L.outfit;
  if (g === 'M' && outfit === 'blouse') outfit = 'shirt';
  const tone = (pal, x, y, opt = {}) => {
    const d = AD(x), dx = DX(x), t = top(d);
    if (!opt.flat && dx > hwMax - 5.5) return pal.sh;
    if (!opt.flat && Math.abs(d - (hwMax - 5)) < 0.6 && y > t + 3) return pal.sh;  // arm crease
    if (!opt.flat && y < t + 1.6 && dx < -5) return pal.hl;
    return pal.base;
  };
  const crew = (r, depth) => (x, y) => AD(x) <= r && y + 0.5 <= 42 + depth * (1 - (AD(x) / r) ** 2);
  const vcut = (w, y0, len) => (x, y) => y >= y0 && y < y0 + len && AD(x) <= w * (1 - (y - y0) / len);
  const body = (cut, pal = P, texture) => layer(b, (x, y) => inBody(x, y) && !(cut && cut(x, y)),
    (x, y) => (texture ? texture(x, y) : null) || tone(pal, x, y), G.CLOTH, 4, pal.ol);
  const ribBelow = (cut, pal, rowsN = 1) => { // shade the rows just under a neckline
    for (let y = 40; y < H; y++) for (let x = 0; x < W; x++) {
      if (!inBody(x, y) || cut(x, y)) continue;
      for (let k = 1; k <= rowsN; k++) if (cut(x, y - k) || (!inBody(x, y - k) && AD(x) < 7)) { paint(b, x, y, k === 1 ? pal.sh : (x % 2 ? pal.sh : pal.base)); break; }
    }
  };
  const part = (mask, pal, grp, z, colorFn) => layer(b, (x, y) => inBody(x, y) && mask(x, y), colorFn || ((x, y) => tone(pal, x, y)), grp, z, pal.ol);
  const tieCol = ['navy', 'black', 'gray', 'sky', 'white'].includes(L.outfitColor) ? CLOTH.wine : CLOTH.navy;

  switch (outfit) {
    case 'tshirt': {
      const cut = crew(5, 2.2);
      body(cut);
      ribBelow(cut, P);
      break;
    }
    case 'knit': {
      const cut = crew(4.6, 2);
      body(cut, P, (x, y) => {
        const d = AD(x); if (DX(x) > hwMax - 5.5) return (x % 3 === 0) ? P.deep : P.sh;
        if (y > top(d) + 1 && (x + 1) % 3 === 0) return P.sh;
        return null;
      });
      ribBelow(cut, P, 2);
      break;
    }
    case 'hoodie': {
      const cut = crew(4.2, 1.6);
      body(cut);
      // hood folded behind the neck
      part((x, y) => { const u = DX(x) / 10.5, v = (y + 0.5 - 43.2) / 3.6; return u * u + v * v <= 1 && !cut(x, y) && y <= 45; }, P, G.LAPEL, 6,
        (x, y) => (y >= 44 && AD(x) < 6 ? P.deep : AD(x) > 8 ? P.sh : P.base));
      // strings
      for (let y = 45; y <= 53; y++) { force(b, 21, y, CLOTH.white.base); force(b, 26, y, CLOTH.white.base); }
      setPx(b, 21, 54, CLOTH.white.ol, G.TIE, 7, CLOTH.white.ol); setPx(b, 26, 54, CLOTH.white.ol, G.TIE, 7, CLOTH.white.ol);
      for (let y = 45; y <= 53; y++) { b.g[y * W + 21] = G.TIE; b.z[y * W + 21] = 7; b.o[y * W + 21] = CLOTH.white.sh; b.g[y * W + 26] = G.TIE; b.z[y * W + 26] = 7; b.o[y * W + 26] = CLOTH.white.sh; }
      break;
    }
    case 'shirt': case 'blouse': {
      const open = g === 'F' || outfit === 'blouse';
      const cut = (x, y) => crew(4.2, 1.2)(x, y) || (open && vcut(2.6, 42, 5)(x, y));
      body(cut);
      // placket + buttons
      for (let y = open ? 47 : 44; y < H; y++) paint(b, 24, y, P.sh);
      for (const y of open ? [49, 53] : [45, 49, 53]) paint(b, 23, y, P.deep);
      if (outfit === 'blouse') {
        // ribbon bow
        const bow = CLOTH[L.outfitColor === 'wine' || L.outfitColor === 'black' ? 'white' : 'wine'];
        const pts = [[21, 43], [22, 43], [21, 44], [22, 44], [23, 44], [24, 44], [25, 44], [26, 44], [25, 43], [26, 43], [22, 45], [25, 45], [23, 45], [24, 45], [22, 46], [25, 46], [22, 47], [25, 47]];
        for (const [x, y] of pts) setPx(b, x, y, (x === 23 || x === 24) ? bow.sh : bow.base, G.TIE, 7, bow.ol);
        // frill collar
        part((x, y) => { const d = AD(x); return d >= 2.5 && d <= 7 && y >= 41 && y <= 43 && !cut(x, y); }, P, G.LAPEL, 6, (x, y) => ((x + y) % 2 ? P.hl : P.base));
      } else {
        // pointed collar flaps
        const flap = rows([[40, 18, 20], [41, 17, 21], [42, 17, 22], [43, 17, 22], [44, 18, 22], [45, 20, 22], [46, 21, 22]]);
        part((x, y) => { const lx = x < 24 ? x : 47 - x; const r = flap(y); return !!r && lx >= r[0] && lx <= r[1] && !(open && cut(x, y)); }, P, G.LAPEL, 6,
          (x, y) => (DX(x) > 0 ? P.sh : P.hl));
      }
      break;
    }
    case 'suit': case 'dress': {
      if (outfit === 'dress' && g === 'F') {
        // square neckline, wide straps, puff shoulders
        const cut = (x, y) => (AD(x) <= 8 && y <= 46) || (AD(x) <= 6 && y <= 47);
        body(cut, P, (x, y) => { const d = AD(x); if (d > 12 && d < 13) return P.sh; if (d >= 13 && y < top(d) + 2.5 && DX(x) < 0) return P.hl; return null; });
        ribBelow(cut, P);
        // collarbones
        for (const x of [18, 19, 20]) { paint(b, x, 44 - (x === 18 ? 1 : 0), sk.sh); paint(b, 47 - x, 44 - (x === 18 ? 1 : 0), sk.sh); }
        break;
      }
      const shirtP = CLOTH.white;
      body(crew(4.4, 1));
      const vW = y => 5.6 * (1 - (y - 42) / 12.5);
      part((x, y) => y >= 42 && AD(x) <= vW(y), shirtP, G.INNER, 5, (x, y) => (DX(x) > 0 ? shirtP.sh : shirtP.base));
      // lapels
      part((x, y) => { const d = AD(x), w = vW(y); return y >= 42 && y <= 52 && d > w && d <= w + 3.2 - (y > 49 ? (y - 49) : 0) && !(y === 46 && d > w + 1.8); }, P, G.LAPEL, 6,
        (x, y) => (DX(x) < 0 ? P.hl : P.base));
      // shirt collar points
      const cp = [[19, 41], [20, 41], [20, 42], [21, 42], [21, 43], [22, 43], [22, 44]];
      for (const [x, y] of cp) { setPx(b, x, y, shirtP.base, G.TIE, 7, shirtP.ol); setPx(b, 47 - x, y, shirtP.sh, G.TIE, 7, shirtP.ol); }
      if (g === 'M') {
        if (outfit === 'dress') { // bow tie
          const bt = CLOTH.black;
          for (const [x, y] of [[21, 43], [22, 43], [21, 44], [22, 44], [23, 44], [24, 44], [25, 43], [26, 43], [25, 44], [26, 44], [21, 45], [26, 45]]) setPx(b, x, y, bt.base, G.TIE, 8, bt.ol);
        } else {
          for (let y = 43; y < H; y++) {
            const w = y <= 44 ? [22, 25] : y < 49 ? [23, 24] : [22, 25];
            for (let x = w[0]; x <= w[1]; x++) setPx(b, x, y, x <= 23 ? tieCol.base : tieCol.sh, G.TIE, 8, tieCol.ol);
          }
          paint(b, 23, 44, tieCol.hl);
        }
      }
      break;
    }
    case 'jacket': {
      const inner = CLOTH[contrastInner(L.outfitColor)];
      body(null);
      const open = (x, y) => y >= 42 && AD(x) <= 4.2;
      part(open, inner, G.INNER, 5, (x, y) => (crew(3.6, 1.6)(x, y) ? sk.base : inner.base));
      // neck skin inside inner tee
      for (let y = 42; y < 45; y++) for (let x = 20; x <= 27; x++) if (crew(3.6, 1.6)(x, y)) setPx(b, x, y, sk.base, G.BODY, 3, sk.ol);
      part((x, y) => { const d = AD(x); return y >= 42 && y <= 50 && d > 4.2 && d <= 7.4 - Math.max(0, y - 46) * 0.7 && !(y === 45 && d > 6); }, P, G.LAPEL, 6,
        (x, y) => (DX(x) < 0 ? P.hl : P.sh));
      break;
    }
    case 'apron': {
      const inner = CLOTH[contrastInner(L.outfitColor)];
      const cut = crew(4.8, 2.4);
      body(cut, inner);
      ribBelow(cut, inner);
      // straps from bib corners to neck
      part((x, y) => { const d = AD(x); if (y < 42 || y > 48) return false; const c = 5 + (y - 42) * 0.38; return d >= c && d <= c + 1.6; }, P, G.LAPEL, 6, () => P.base);
      // bib
      part((x, y) => y >= 48 && AD(x) <= 7.6, P, G.TIE, 7, (x, y) => (y === 52 && AD(x) < 4 ? P.sh : DX(x) > 4.5 ? P.sh : P.base));
      paint(b, 20, 52, P.deep); paint(b, 27, 52, P.deep);
      break;
    }
    case 'coat': {
      const inner = CLOTH[['beige', 'white', 'sky', 'pink'].includes(L.outfitColor) ? 'gray' : ['black', 'navy', 'wine', 'olive'].includes(L.outfitColor) ? 'beige' : 'white'];
      body(null);
      const vW = y => 4.8 * (1 - (y - 41) / 14);
      // turtleneck / inner knit
      part((x, y) => y >= 41 && AD(x) <= vW(y), inner, G.INNER, 5, (x, y) => (y <= 43 && (x % 2) ? inner.sh : DX(x) > 0 ? inner.sh : inner.base));
      const neckR = g === 'F' ? 4.6 : 5.6;
      for (let y = 40; y <= 42; y++) for (let x = 0; x < W; x++) if (AD(x) <= neckR) setPx(b, x, y, (x % 2) ? inner.sh : inner.base, G.INNER, 5, inner.ol);
      // big lapels + collar stand
      part((x, y) => { const d = AD(x), w = vW(y); return y >= 41 && y <= 53 && d > w && d <= w + 5 - Math.max(0, y - 50) * 1.5 && !(y === 47 && d > w + 3); }, P, G.LAPEL, 6,
        (x, y) => (DX(x) < 0 ? P.hl : P.base));
      layer(b, (x, y) => { const d = AD(x); return y >= 40 && y <= 42 && d > neckR && d <= neckR + 3; }, x => (DX(x) < 0 ? P.base : P.sh), G.LAPEL, 6, P.ol);
      for (const y of [50, 54]) { paint(b, 17, y, P.deep); paint(b, 30, y, P.deep); }
      break;
    }
    default: body(crew(5, 3));
  }
}

// ---------------------------------------------------------------- accessories
function accCol(L, avoidDark) {
  let c = L.outfitColor;
  if (avoidDark && ['black', 'navy', 'olive'].includes(c)) c = 'pink';
  return CLOTH[c] || CLOTH.navy;
}
function drawGlasses(b, round) {
  const fr = round ? '#8C6A3A' : '#2D2A30';
  const glare = '#FFFFFF';
  const box = (x0, x1) => {
    for (let x = x0; x <= x1; x++) for (let y = 22; y <= 28; y++) {
      const edgeX = x === x0 || x === x1, edgeY = y === 22 || y === 28;
      const corner = (edgeX && edgeY);
      const rc = round && ((x === x0 || x === x1) && (y === 22 || y === 28 || y === 23 || y === 27)) ;
      if (round) {
        if ((x === x0 + 1 || x === x1 - 1) && (y === 22 || y === 28)) { force(b, x, y + (y === 22 ? 1 : -1), fr); continue; }
        if ((x === x0 || x === x1) && (y === 22 || y === 28 || y === 23 || y === 27)) continue;
        if ((edgeX || edgeY) && !rc) force(b, x, y, fr);
      } else if ((edgeX || edgeY) && !corner) force(b, x, y, fr);
    }
  };
  box(14, 21); box(26, 33);
  for (let x = 22; x <= 25; x++) force(b, x, 24, fr);
  force(b, 13, 24, fr); force(b, 34, 24, fr);
  // lens glare (soft)
  const g2 = (x, y) => { const i = y * W + x; if (b.c[i]) b.c[i] = mix(b.c[i], glare, 0.55); };
  g2(20, 23); g2(19, 24); g2(32, 23); g2(31, 24);
}
function drawEarrings(b) {
  for (const x of [11, 36]) { force(b, x, 30, GOLD.sh); force(b, x, 31, GOLD.base); force(b, x, 32, GOLD.ol); }
}
function drawNecklace(b, g) {
  const pts = g === 'F' ? [[19, 41], [20, 42], [21, 43], [22, 44], [23, 44]] : [[18, 41], [19, 42], [20, 43], [21, 44], [22, 44], [23, 45]];
  for (const [x, y] of pts) { force(b, x, y - OUT_SHIFT, GOLD.base); force(b, 47 - x, y - OUT_SHIFT, GOLD.base); }
  const py = (g === 'F' ? 45 : 46) - OUT_SHIFT;
  force(b, 23, py, GOLD.base); force(b, 24, py, GOLD.sh); force(b, 23, py + 1, GOLD.sh); force(b, 24, py + 1, GOLD.ol);
}

// ---------------------------------------------------------------- main renderer
function normalize(look, gender) {
  const g = gender === 'M' ? 'M' : 'F';
  const L = Object.assign({ skin: 's2', hair: g === 'F' ? 'long_straight' : 'short_crop', hairColor: 'darkbrown', eyes: 'soft', brows: 'straight', outfit: 'shirt', outfitColor: 'navy', acc: 'none', older: false }, look || {});
  if (!SKIN[L.skin]) L.skin = 's2';
  if (!HAIR[L.hairColor]) L.hairColor = 'darkbrown';
  if (!styleDef(L.hair, g)) L.hair = g === 'F' ? 'long_straight' : 'short_crop';
  if (!CLOTH[L.outfitColor]) L.outfitColor = 'navy';
  return { L, g };
}

export function portraitPixels(look, gender, expression = 'neutral') {
  const { L, g } = normalize(look, gender);
  const expr = LOOK_ENUMS.expression.includes(expression) ? expression : 'neutral';
  const sk = SKIN[L.skin];
  let hp = Object.assign({}, HAIR[L.hairColor]);
  const st = styleDef(L.hair, g);
  if (st.buzz) {
    hp = { hl: mix(hp.hl, sk.base, 0.45), base: mix(hp.base, sk.base, 0.38), sh: mix(hp.sh, sk.sh, 0.3), deep: mix(hp.deep, sk.sh, 0.3), ol: mix(hp.ol, sk.ol, 0.45) };
  }
  const shaveC = mix(hp.sh, sk.sh, 0.3), shaveD = mix(hp.base, sk.sh, 0.12);
  const b = newBuf();
  const cap = capMask(st);
  const [cy, rx, ry] = st.cap;
  const cut = st.backCut || (() => false);
  const fr = st.fringe;
  const lockL = st.locks.Lf || st.locks.L || (() => null);
  const lockR = st.locks.R || (y => { const r = lockL(y); return r ? [47 - r[1], 47 - r[0]] : null; });
  const inLock = (x, y) => {
    if (x < 24) { const r = lockL(y); if (r && x >= r[0] && x <= r[1]) return { side: -1, a: r[0], b: r[1] }; }
    else { const r = lockR(y); if (r && x >= r[0] && x <= r[1]) return { side: 1, a: r[0], b: r[1] }; }
    return null;
  };
  const lockTop = side => { for (let y = 0; y < H; y++) { const r = side < 0 ? lockL(y) : lockR(y); if (r) return y; } return 0; };
  const lockBot = side => { for (let y = H - 1; y >= 0; y--) { const r = side < 0 ? lockL(y) : lockR(y); if (r) return y; } return 0; };
  const LT = { '-1': lockTop(-1), '1': lockTop(1) }, LB = { '-1': lockBot(-1), '1': lockBot(1) };
  const backMask = (x, y) => (cap(x, y) && !cut(x, y)) || (st.backExtra && st.backExtra(x, y));
  const bangMask = (x, y) => cap(x, y) && !cut(x, y) && y + 0.5 < fr(x);
  const frontMask = (x, y) => bangMask(x, y) || !!inLock(x, y) || (st.front && st.front(x, y));
  const grayStrand = (x, y) => L.older && L.hairColor !== 'gray' && y >= 8 && y <= 21 && AD(x) >= 8.5 && AD(x) <= 13.5 && (x % 4 === 1) && hash(x, y >> 1, 8) % 3 !== 0 && !inLock(x, y);

  const hairTone = (x, y, front) => {
    const info = { front };
    if (st.tone) { const t = st.tone(x, y, info); if (t) return t; }
    const dx = DX(x), u = dx / rx;
    const lk = front ? inLock(x, y) : null;
    if (lk) {
      const lx = lk.side < 0 ? x : 47 - x, a = lk.side < 0 ? lk.a : 47 - lk.b, bb = lk.side < 0 ? lk.b : 47 - lk.a;
      const top = LT[lk.side], bot = LB[lk.side];
      if (lx === bb) return 'sh';
      if (y >= bot - 1) return 'sh';
      if (st.wave && Math.sin((y - top) / 2.4) > 0.7 && lx === a + 1) return 'hl';
      if (!st.wave && lx === a + 1 && y >= top + 3 && y <= top + 9) return y <= top + 6 ? 'hl' : 'hl2';
      if (bb - a >= 4 && lx === Math.round((a + bb) / 2) && y >= top + 9) return 'sh';
      if (st.layeredLock && (y - top) % 6 === 5 && lx < bb - 1) return 'sh';
      return lk.side > 0 ? 'sh2' : 'base';
    }
    if (!front && !(cap(x, y) && y < 22)) {
      if (y >= 24 && AD(x) <= 13) return 'deep';
      if (dx > 0) return 'sh';
      return y >= 24 ? 'sh' : 'base';
    }
    if (st.buzz) return hash(x, y, 3) % 5 === 0 ? 'sh' : (y < 9 && dx < 0 && hash(x, y, 5) % 3 === 0 ? 'hl' : 'base');
    // part line
    if (st.part && Math.abs(x - st.part.x) <= (st.part.center ? 0 : 0) && y >= st.part.y0 && y <= st.part.y1) return 'deep';
    if (st.part && st.part.center && x === 24 && y >= st.part.y0 && y <= st.part.y1 - 2) return 'sh';
    // curls
    if (st.curly) {
      const k = (x + ((y >> 1) % 2) * 2) % 4;
      if (y % 2 === 0 && k === 0 && y < fr(x) - 1) return 'hl';
      if (y % 2 === 1 && k === 1) return 'sh';
    }
    // slick streaks
    if (st.slick && AD(x) < 10.5) {
      const s = y - AD(x) * AD(x) * 0.035;
      if (Math.abs(s - 8.2) < 0.5 || Math.abs(s - 11.2) < 0.5) return dx < 3 ? 'hl' : 'base';
      if (Math.abs(s - 9.7) < 0.5) return 'sh';
    }
    // angel ring
    const ringY = cy - ry * 0.6 + u * u * ry * 0.34;
    const ry0 = Math.round(ringY);
    if (Math.abs(u) < 0.8 && (y === ry0 || (y === ry0 + 1 && Math.abs(u) < 0.5)) && (x + y) % 5 !== 0 && !st.slick) return (dx > rx * 0.45) ? 'base' : 'hl';
    if (Math.abs(u) < 0.8 && y === ry0 - 1 && Math.abs(u) < 0.35 && !st.slick) return 'hl2';
    if (u > 0.62) return 'sh';
    // bang valleys -> strand separation
    if (front && bangMask(x, y)) {
      const f0 = fr(x), fl = fr(x - 1), frr = fr(x + 1);
      const bottom = Math.ceil(f0 - 0.5) - 1;
      if (f0 <= fl + 0.01 && f0 <= frr + 0.01 && (f0 < fl - 0.6 || f0 < frr - 0.6) && y >= bottom - 2) return 'sh';
      if (y === bottom - 1 && dx > 2) return 'sh2';
    }
    return 'base';
  };
  const hairCol = (key, x, y) => {
    let c;
    switch (key) {
      case 'hl': c = hp.hl; break; case 'hl2': c = mix(hp.base, hp.hl, 0.5); break;
      case 'sh': c = hp.sh; break; case 'sh2': c = mix(hp.base, hp.sh, 0.5); break;
      case 'deep': c = hp.deep; break; case 'ol': c = hp.ol; break;
      case 'shave': c = (hash(x, y, 9) % 3 === 0) ? shaveD : shaveC; break;
      default: c = hp.base;
    }
    if (key !== 'shave' && key !== 'deep' && grayStrand(x, y)) c = mix(c, HAIR.gray.hl, 0.42);
    return c;
  };

  // 1. back hair
  layer(b, backMask, (x, y) => hairCol(hairTone(x, y, false), x, y), G.HAIR, 1, hp.ol);
  if (st.tone) { // shaved pixels get their own group so the overhang gets an outline
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!backMask(x, y)) continue;
      if (st.tone(x, y, { front: false }) === 'shave') { const i = y * W + x; b.g[i] = G.SHAVE; b.o[i] = mix(hp.ol, sk.ol, 0.5); }
    }
  }
  if (st.bun) {
    const [bx, by, brx, bry] = st.bun;
    layer(b, (x, y) => inEll(x, y, bx, by, brx, bry), (x, y) => {
      const u = DX(x) / brx, v = (y + 0.5 - by) / bry;
      if (u < -0.1 && v < -0.1 && u * u + v * v > 0.25 && u * u + v * v < 0.7) return hp.hl;
      if (u > 0.4 || v > 0.55) return hp.sh;
      if (Math.abs(u + v * 0.6) < 0.12) return hp.sh;
      return hp.base;
    }, G.BUN, 2, hp.ol);
  }
  // 2. neck / torso skin
  const bgm = bodyGeom(g);
  const neckD = bgm.neckD;
  const neckCol = (x, y) => (y <= 37 || DX(x) > neckD - 1.2 ? sk.sh : y === 38 ? mix(sk.sh, sk.base, 0.5) : sk.base);
  layer(b, (x, y) => AD(x) <= neckD && y >= 30 && y <= 46, neckCol, G.BODY, 3, sk.ol);
  // 3. outfit (authored on a 42px shoulder line, composited 1px higher for a shorter neck)
  const tb = newBuf();
  layer(tb, (x, y) => (AD(x) <= neckD && y >= 38 && y <= 47) || (bgm.inBody(x, y) && AD(x) <= 11), (x, y) => neckCol(x, y - OUT_SHIFT), G.BODY, 3, sk.ol);
  drawOutfit(tb, L, g, sk);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!tb.c[i]) continue;
    for (const ty of (y === H - 1 ? [y - OUT_SHIFT, y] : [y - OUT_SHIFT])) { const j = ty * W + x; b.c[j] = tb.c[i]; b.g[j] = tb.g[i]; b.z[j] = tb.z[i]; b.o[j] = tb.o[i]; }
  }
  // 4. ears
  const ear = (x, y) => { const lx = x < 24 ? x : 47 - x; return (y === 24 && lx >= 11 && lx <= 12) || (y >= 25 && y <= 28 && lx >= 10 && lx <= 12) || (y === 29 && lx >= 11 && lx <= 12); };
  layer(b, ear, (x, y) => { const lx = x < 24 ? x : 47 - x; return (lx === 11 && (y === 26 || y === 27)) ? sk.sh2 : (x > 24 ? sk.sh : sk.base); }, G.EAR, 8, sk.ol);
  // 5. face
  layer(b, (x, y) => inFace(g, x, y), (x, y) => {
    const hw = faceHW(g, y), right = 23 + hw;
    if (x === right - 1 && y >= 16 && y <= 33) return sk.sh;
    if (y >= 34 && x >= right - 2) return sk.sh;
    return sk.base;
  }, G.FACE, 9, sk.ol);
  // 6. face decals
  const blushC = mix(sk.base, sk.blush, 0.5), blushD = mix(sk.base, sk.blush, 0.85);
  if (expr === 'blush') {
    for (const [x, y, c] of [[16, 30, blushC], [17, 30, blushD], [18, 30, blushC], [19, 30, blushD], [15, 31, blushC], [16, 31, blushD], [17, 31, blushC], [18, 31, blushD]]) { paint(b, x, y, c); paint(b, 47 - x, y, c); }
  } else if (g === 'F') {
    for (const [x, y, t] of [[16, 30, 0.22], [17, 30, 0.32], [18, 30, 0.22]]) { paint(b, x, y, mix(sk.base, sk.blush, t)); paint(b, 47 - x, y, mix(sk.base, sk.blush, t)); }
  }
  if (L.older) {
    const bag = mix(sk.base, sk.sh, 0.45);
    const r0 = 22 + eyePattern(L.eyes, g, expr).length;
    for (const x of [16, 17]) { paint(b, x, r0, bag); paint(b, 47 - x, r0, bag); }
    for (const [x, y] of [[20, 31]]) { paint(b, x, y, mix(sk.base, sk.sh, 0.4)); paint(b, 47 - x, y, mix(sk.base, sk.sh, 0.4)); }
  }
  drawEyes(b, L, g, expr, sk);
  drawBrows(b, L, g, expr, HAIR[L.hairColor], sk);
  // nose
  paint(b, 24, 29, mix(sk.base, sk.sh, 0.6));
  paint(b, 24, 30, g === 'F' ? sk.sh : sk.sh2);
  if (g === 'M') paint(b, 23, 30, mix(sk.base, sk.sh, 0.5));
  drawMouth(b, g, expr, sk);
  if (L.acc === 'mole') paint(b, 30, 30, mix(sk.ol, '#2A1814', 0.35));
  // 7. front hair
  layer(b, frontMask, (x, y) => hairCol(hairTone(x, y, true), x, y), G.HAIR, 13, hp.ol);
  if (st.ahoge) { setPx(b, 23, 4, hp.base, G.HAIR, 13, hp.ol); setPx(b, 24, 3, hp.base, G.HAIR, 13, hp.ol); setPx(b, 25, 2, hp.base, G.HAIR, 13, hp.ol); }
  if (st.comma) { paint(b, 18, 16, hp.hl); paint(b, 19, 16, hp.hl); paint(b, 20, 15, hp.hl); }
  if (st.tie) { const tc = accCol(L, true); for (const [x, y] of st.tie) if (!st.tieHair || getG(b, x, y) === G.HAIR) setPx(b, x, y, y === st.tie[0][1] ? tc.base : tc.sh, st.tieHair ? G.HAIR : G.BAND, 14, tc.ol); }
  // 8. soft shadow on skin right under the hair
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = (y - 1) * W + x;
    if (b.g[i] === G.FACE && b.c[i] === sk.base && b.g[a] === G.HAIR && b.z[a] === 13) b.c[i] = sk.sh;
  }
  // 9. headwear
  if (L.acc === 'headband') {
    const hc = accCol(L, true);
    const hb = x => Math.round(8.6 + (DX(x) / 12.5) ** 2 * 6.2);
    for (let x = 0; x < W; x++) {
      if (AD(x) > rx - 0.6) continue;
      const y0 = hb(x);
      for (let k = 0; k < 2; k++) if (getG(b, x, y0 + k) === G.HAIR) setPx(b, x, y0 + k, k === 0 ? hc.base : hc.sh, G.HAIR, 14, hc.ol);
    }
  }
  if (L.acc === 'cap') {
    const cc = CLOTH[L.outfitColor] || CLOTH.navy;
    const yb = x => 13.6 + 1.6 * (1 - (DX(x) / 13.5) ** 2);          // crown base (front, curved)
    const ybb = x => yb(x) + 2.2 + 2.0 * (1 - (DX(x) / 12.5) ** 2);    // brim lower edge
    const crown = (x, y) => inEll(x, y, 24, 15.6, 14.0, 11.2) && y + 0.5 <= yb(x) + 0.5;
    const brim = (x, y) => AD(x) <= 13.8 && y + 0.5 > yb(x) - 0.4 && y + 0.5 <= ybb(x) && y >= 12;
    layer(b, crown, (x, y) => (DX(x) > 7.5 ? cc.sh : (DX(x) < -3 && DX(x) > -10 && y > 6 && y < 10) ? cc.hl : (x === 24 && y < yb(x) - 1) ? cc.sh : cc.base), G.CAP, 15, cc.ol);
    layer(b, brim, (x, y) => (y + 0.5 <= yb(x) + 1 ? cc.hl : y + 1.5 > ybb(x) ? cc.sh : cc.base), G.BRIM, 16, cc.ol);
    setPx(b, 23, 4, cc.sh, G.CAP, 15, cc.ol); setPx(b, 24, 4, cc.sh, G.CAP, 15, cc.ol);
    for (let x = 0; x < W; x++) for (let y = 14; y < 24; y++) if (getG(b, x, y) === G.FACE && getG(b, x, y - 1) === G.BRIM) { paint(b, x, y, sk.sh); paint(b, x, y + 1, mix(sk.sh, sk.base, 0.5)); }
  }
  // 10. outline
  outlinePass(b);
  // soften outline where hair meets face (selective outline)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (b.g[i] === G.FACE && b.c[i] === sk.ol) {
      // jaw / cheek contour against background stays dark; against hair use a warmer mid tone
      const nb = [[1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => getG(b, x + dx, y + dy) === G.HAIR);
      if (nb) b.c[i] = mix(sk.ol, sk.sh2, 0.45);
    }
  }
  // 11. post accessories
  if (L.acc === 'glasses') drawGlasses(b, false);
  if (L.acc === 'round_glasses') drawGlasses(b, true);
  if (L.acc === 'earrings') drawEarrings(b);
  if (L.acc === 'necklace') drawNecklace(b, g);
  return b.c;
}

// ---------------------------------------------------------------- canvas API
function pixelsToCanvas(px) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const col = px[i]; if (!col) continue; const [r, g, bb] = hx(col);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = bb; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}

export function drawPortrait(canvas, look, gender, expression = 'neutral', opts = {}) {
  const src = pixelsToCanvas(portraitPixels(look, gender, expression));
  let s = opts.scale;
  if (s) { canvas.width = W * s; canvas.height = H * s; }
  else s = Math.max(1, Math.floor(Math.min(canvas.width / W, canvas.height / H)));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const ox = Math.floor((canvas.width - W * s) / 2), oy = Math.floor((canvas.height - H * s) / 2);
  if (!opts.keep) ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(src, 0, 0, W, H, ox, oy, W * s, H * s);
  return canvas;
}

const _cache = new Map();
export function portraitDataURL(look, gender, expression = 'neutral', scale = 4) {
  const key = JSON.stringify([look, gender, expression, scale]);
  if (_cache.has(key)) return _cache.get(key);
  const c = document.createElement('canvas');
  drawPortrait(c, look, gender, expression, { scale });
  const url = c.toDataURL('image/png');
  if (_cache.size > 600) _cache.delete(_cache.keys().next().value);
  _cache.set(key, url);
  return url;
}

// ---------------------------------------------------------------- random looks
function pickW(rng, items) { // items: [[value, weight], ...]
  const tot = items.reduce((s, [, w]) => s + w, 0); let r = rng() * tot;
  for (const [v, w] of items) { r -= w; if (r < 0) return v; }
  return items[items.length - 1][0];
}
export function randomLook(rng = Math.random, gender = 'F', opts = {}) {
  const g = gender === 'M' ? 'M' : 'F';
  const older = opts.older != null ? !!opts.older : rng() < 0.12;
  const one = a => a[Math.floor(rng() * a.length) % a.length];
  const look = {
    skin: pickW(rng, [['s1', 22], ['s2', 36], ['s3', 28], ['s4', 10], ['s5', 4]]),
    hair: one(LOOK_ENUMS.hair[g]),
    hairColor: pickW(rng, older
      ? [['black', 30], ['darkbrown', 28], ['brown', 10], ['ash', 6], ['gray', 26]]
      : [['black', 30], ['darkbrown', 30], ['brown', 17], ['ash', 8], ['blonde', 4], ['redbrown', 10], ['gray', 1]]),
    eyes: one(LOOK_ENUMS.eyes),
    brows: g === 'M' ? pickW(rng, [['straight', 40], ['arched', 20], ['thick', 40]]) : pickW(rng, [['straight', 40], ['arched', 45], ['thick', 15]]),
    outfit: g === 'M'
      ? pickW(rng, [['suit', 14], ['shirt', 16], ['knit', 12], ['hoodie', 12], ['jacket', 14], ['tshirt', 14], ['apron', 6], ['coat', 10], ['dress', 2]])
      : pickW(rng, [['suit', 8], ['shirt', 10], ['knit', 13], ['hoodie', 8], ['blouse', 16], ['jacket', 10], ['tshirt', 10], ['apron', 5], ['coat', 9], ['dress', 11]]),
    outfitColor: one(LOOK_ENUMS.outfitColor),
    acc: g === 'M'
      ? pickW(rng, [['none', 48], ['glasses', 16], ['round_glasses', 8], ['earrings', 3], ['necklace', 6], ['cap', 9], ['headband', 1], ['mole', 9]])
      : pickW(rng, [['none', 36], ['glasses', 8], ['round_glasses', 7], ['earrings', 17], ['necklace', 13], ['cap', 4], ['headband', 6], ['mole', 9]]),
    older,
  };
  if (look.acc === 'cap' && ['bun', 'long_tied'].includes(look.hair)) look.acc = 'none';
  if (opts.hair) look.hair = opts.hair;
  return look;
}
