// 무인카페 3탄: 신메뉴 레시피 (도트 캔버스 160x200~260)
// 신메뉴 시음회 날. 주문 카드에 층층이 쌓인 음료 그림이 나온다. 아래 재료 버튼을 꾹 누르고 있는 동안 컵에 붓고,
// 컵 옆 노란 눈금선에서 손을 뗀다(공중에 남은 줄기도 마저 떨어진다). 얼음은 집게 타이밍, 토핑·시럽은 컵 위를 쓱쓱.
// 잔을 완성하면 시음 손님이 한 모금 마시고 반응한다. 끝나면 오늘의 신메뉴 포스터에 '판매 시작' 도장.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, T = 36, TARGET = 3.2, V_FALL = 360;
// 재료: 이름, 색(기본·그늘·윗면), 붓는 속도(px/초), 그릇 기울기·주둥이 자리
const ING = {
  ber: { n: "딸기청", c: "#e0405a", c2: "#c02a44", hi: "#ff8a9a", rate: 15, ang: -1.25, sp: [3, 3] },
  cho: { n: "초코", c: "#5a3220", c2: "#45251a", hi: "#8a5a3a", rate: 17, ang: -2.5, sp: [7, 1] },
  milk: { n: "우유", c: "#f7f0e0", c2: "#e2d5bc", hi: "#ffffff", rate: 25, ang: -1.0, sp: [4, 2] },
  mat: { n: "말차", c: "#7fb04a", c2: "#5f9034", hi: "#b0d880", rate: 21, ang: -1.0, sp: [2, 3] },
  shot: { n: "샷", c: "#4a2814", c2: "#381c0c", hi: "#c8823a", rate: 19, ang: -1.05, sp: [2, 3] },
  crm: { n: "크림", c: "#fbf4e2", c2: "#e8dcc0", hi: "#ffffff", rate: 17, ang: -2.6, sp: [7, 1] },
};
const BTN = ["ice", "ber", "cho", "milk", "mat", "shot", "crm"];
const BN = { ice: "얼음", ber: "딸기청", cho: "초코", milk: "우유", mat: "말차", shot: "샷", crm: "크림" };
// 토핑(뿌리기)·드리즐(시럽 두르기)
const TOP = {
  coc: { n: "코코아", c: ["#6a3a20", "#8a5530", "#4a2814"] },
  matp: { n: "말차 가루", c: ["#6fa040", "#8fc060", "#4f7a2a"] },
  berp: { n: "딸기 가루", c: ["#ff6a8a", "#ffb0c0", "#e23a5a"] },
  chos: { n: "초코 시럽", c: ["#4a2414"], drz: 1 },
  car: { n: "카라멜", c: ["#d08a2a"], drz: 1 },
};
// 잔 크기: 속 높이, 바닥·위 반폭
const SIZE = { S: { h: 48, wb: 12, wt: 15 }, M: { h: 62, wb: 13, wt: 17 }, L: { h: 76, wb: 14, wt: 19 } };
const PRICE = { S: 4500, M: 5500, L: 6500 };
// 레시피: [재료, 두께] · ["ice", 개수] · ["top"/"drz", 토핑]
const RECIPES = {
  S: [
    { n: "딸기 우유", st: [["ice", 2], ["ber", 13], ["milk", 20]] },
    { n: "아이스 라떼", st: [["ice", 2], ["milk", 20], ["shot", 11]] },
    { n: "초코 크림", st: [["cho", 14], ["milk", 14], ["crm", 9]] },
  ],
  M: [
    { n: "말차 크림 라떼", st: [["milk", 20], ["mat", 15], ["crm", 10], ["top", "matp"]] },
    { n: "아인슈페너", st: [["ice", 2], ["shot", 14], ["milk", 14], ["crm", 12], ["top", "coc"]] },
    { n: "딸기 말차", st: [["ice", 2], ["ber", 12], ["milk", 16], ["mat", 14]] },
    { n: "카라멜 라떼", st: [["milk", 22], ["shot", 13], ["crm", 9], ["drz", "car"]] },
  ],
  L: [
    { n: "딸기 크림 라떼", st: [["ice", 3], ["ber", 12], ["milk", 18], ["shot", 12], ["crm", 12], ["top", "berp"]] },
    { n: "더티 초코", st: [["cho", 13], ["milk", 18], ["shot", 13], ["crm", 12], ["drz", "chos"]] },
    { n: "말차 티라미수", st: [["mat", 12], ["milk", 16], ["shot", 12], ["crm", 14], ["top", "coc"]] },
  ],
};
const SEQ = ["S", "M", "L", "L", "M", "L", "L", "L"];
const PRACTICE = { n: "연습 한 잔", st: [["milk", 24], ["ice", 1], ["top", "coc"]] };
const ICE_SLOTS = [[-7, 0], [1, 0], [-3, 5], [3, 6], [-6, 10]];
const STAR = ["...X...", "..XXX..", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", ".X...X."];
const won = (n) => n.toLocaleString("ko-KR");
const hsh = (x, y) => (Math.imul(((x + 1013) * 0x27d4eb2d) ^ ((y + 7919) * 0x165667b1), 0x9e3779b1) >>> 24);

// 도트 한 장(둘레 1픽셀 자리 + 어두운 테두리)
function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); });
  if (ol) uOutline(c); return c;
}
// 재료 그릇 12x14 (테두리 포함 14x16). 주둥이는 ING.sp
const CONT = {
  milk: (P) => { P(2, 3, 8, 11, "#f6f6fa"); P(3, 1, 6, 2, "#e6e6ee"); P(4, 0, 4, 1, "#d4d4e0"); P(2, 7, 8, 3, "#4f8ad9"); P(2, 7, 8, 1, "#7fb0f0"); P(9, 3, 1, 11, "#c8c8d6"); P(3, 4, 2, 2, "#ffffff"); P(4, 12, 4, 1, "#d8d8e4"); },
  shot: (P) => { P(2, 4, 8, 10, "#c4ccd4"); P(2, 3, 8, 2, "#4a2814"); P(3, 3, 4, 1, "#c8823a"); P(1, 2, 3, 2, "#dfe6ec"); P(3, 6, 1, 6, "#ffffff"); P(8, 5, 2, 9, "#9aa2ac"); P(10, 6, 2, 1, "#8a929c"); P(11, 6, 1, 5, "#8a929c"); P(10, 10, 2, 1, "#8a929c"); },
  ber: (P) => { P(2, 3, 9, 11, "#d8384e"); P(2, 3, 9, 1, "#ff7a8a"); P(3, 5, 1, 7, "#ff9aaa"); P(5, 6, 2, 2, "#ff6a7a"); P(7, 10, 2, 2, "#a01e36"); P(4, 10, 1, 1, "#ffe08a"); P(8, 6, 1, 1, "#ffe08a"); P(10, 4, 1, 10, "#a8243a"); P(1, 1, 11, 2, "#f4f4f4"); P(2, 1, 2, 1, "#e23a4a"); P(6, 1, 2, 1, "#e23a4a"); P(10, 1, 2, 1, "#e23a4a"); P(4, 8, 5, 2, "#fff4e0"); },
  cho: (P) => { P(3, 4, 7, 10, "#5a3220"); P(3, 4, 7, 1, "#7a4a30"); P(4, 5, 1, 8, "#7a4a30"); P(9, 5, 1, 9, "#3e2214"); P(4, 2, 5, 2, "#e9c46a"); P(6, 0, 1, 2, "#e9c46a"); P(4, 8, 5, 3, "#f2e6c8"); P(5, 9, 3, 1, "#5a3220"); },
  mat: (P) => { P(2, 4, 8, 10, "#f2f4ee"); P(2, 3, 8, 2, "#7fb04a"); P(1, 2, 3, 2, "#f2f4ee"); P(3, 6, 1, 6, "#ffffff"); P(8, 5, 2, 9, "#c8ccc0"); P(2, 10, 8, 1, "#7fb04a"); P(10, 6, 2, 1, "#c8ccc0"); P(11, 6, 1, 5, "#c8ccc0"); P(10, 10, 2, 1, "#c8ccc0"); },
  crm: (P) => { P(3, 4, 6, 10, "#dfe4ea"); P(3, 4, 6, 1, "#ffffff"); P(4, 5, 1, 8, "#ffffff"); P(8, 5, 1, 9, "#a8b0ba"); P(4, 2, 4, 2, "#6a727c"); P(5, 0, 2, 2, "#8a929c"); P(3, 9, 6, 1, "#e07aa0"); P(3, 11, 6, 1, "#e07aa0"); },
  ice: (P) => { P(1, 6, 10, 8, "#d4dde4"); P(1, 6, 10, 1, "#ffffff"); P(10, 7, 1, 7, "#a8b4bc"); P(2, 13, 8, 1, "#b8c4cc"); P(2, 3, 3, 3, "#e4f6ff"); P(5, 2, 3, 3, "#d8f0ff"); P(8, 3, 3, 3, "#e4f6ff"); P(2, 3, 3, 1, "#ffffff"); P(5, 2, 3, 1, "#ffffff"); P(8, 3, 3, 1, "#ffffff"); P(0, 1, 1, 5, "#8a96a0"); P(11, 1, 1, 5, "#8a96a0"); P(1, 0, 10, 1, "#8a96a0"); },
};
let SPR = null;
const spr = () => { if (!SPR) { SPR = {}; for (const k in CONT) SPR[k] = mkC(12, 14, CONT[k]); } return SPR; };

// 컵 하나 만들기
function mkCup(rec, size, jitter = true, zf = 1, wf = 1) {
  const sz = SIZE[size], steps = []; let acc = 0;
  for (const [t, v] of rec.st) {
    if (t === "ice") steps.push({ t: "ice", n: v, got: 0, tries: 0, q: 0 });
    else if (t === "top" || t === "drz") steps.push({ t, k: v, bins: new Array(8).fill(0), waste: 0, t0: -1, q: 0, fin: 0 });
    else { acc += Math.round(v * zf) + (jitter ? rint(5) - 2 : 0); steps.push({ t: "pour", ing: t, tg: acc, wrong: 0, q: 0 }); }
  }
  return { rec, size, h: Math.round(sz.h * zf), wb: Math.round(sz.wb * wf), wt: Math.round(sz.wt * wf), steps, si: 0, lay: [], level: 0, cubes: [], dots: [], drz: [], drips: [], ovf: false, spill: 0, amp: 0, straw: 0, ox: 0 };
}
const stepName = (s) => (s.t === "ice" ? `얼음 ${s.n}개` : s.t === "pour" ? ING[s.ing].n : TOP[s.k].n);

// ── 컵 그리기(본게임·포스터·방법 그림 공용). cx: 가운데, Y0: 속 바닥 줄 ──
function drawCup(G, cup, cx, Y0, tm, live) {
  const P = (x, y, w, h, c) => { G.fillStyle = c; G.fillRect(x, y, w, h); };
  const h = cup.h, hwOf = (r) => Math.round(cup.wb + (cup.wt - cup.wb) * clamp(r / h, 0, 1));
  // 그림자
  G.fillStyle = "rgba(70,40,20,.22)"; G.fillRect(cx - cup.wb - 4, Y0 + 5, 2 * cup.wb + 8, 1); G.fillRect(cx - cup.wb - 2, Y0 + 6, 2 * cup.wb + 4, 1);
  const lay = cup.lay, Lf = Math.min(h, Math.floor(cup.level + 1e-4)), top = lay.length - 1;
  // 빈 유리 속
  for (let r = Lf; r < h; r++) { const hw = hwOf(r); G.fillStyle = "rgba(186,224,246,.34)"; G.fillRect(cx - hw, Y0 - r, 2 * hw, 1); }
  // 윗면 물결(열마다 맨 윗줄)
  const topIng = top >= 0 ? lay[top].ing : null, foam = topIng === "crm";
  const trOf = (c, hw) => {
    if (Lf <= 0) return -1;
    let w = live ? Math.round(cup.amp * Math.sin(c * 0.9 + tm * 13)) : 0;
    if (foam && cup.amp < 0.4) w += (Math.abs(c + 0.5) < hw - 3 ? 1 : 0) + ((hsh(c, 99) & 3) === 0 ? 1 : 0);
    return clamp(Lf - 1 + w, Lf - 2, foam ? h + 1 : h - 1);
  };
  const hwTop = hwOf(Lf), TR = {};
  for (let c = -hwTop - 1; c <= hwTop; c++) TR[c] = trOf(c, hwTop);
  // 층별 칸 색
  const pix = (r, c, i, hw) => {
    const L = lay[i], ig = ING[L.ing], hs = hsh(c, r);
    // 경계: 섞였으면 넓게 얼룩, 아니면 한 줄만 살짝 번짐
    for (const k of [i, i + 1]) {
      if (k < 1 || k > top) continue;
      const b = Math.round(lay[k].h0), d = r - b, dirty = lay[k].mix || lay[k - 1].mix;
      if (dirty && Math.abs(d + 0.5) <= 4) { const p = (d + 4.5) / 9, up = ING[lay[k].ing], dn = ING[lay[k - 1].ing]; if (hs % 5 === 0) return mixC(up.c, dn.c); return hs / 255 < p ? up.c : dn.c; }
      if (!dirty && d === 0 && hs & 1) return ING[lay[k - 1].ing].c;
    }
    if (L.murk && hs < 46) return L.murk;
    if (L.ing === "shot" && r >= Math.round(L.h1) - 2) return hs < 70 ? "#e0a050" : "#c07a36";
    if (L.ing === "crm") { if (hs < 30) return "#ffffff"; if (hs > 236) return "#e2d4b4"; }
    else if (L.ing === "ber") { if (hs < 30) return "#ff8a9a"; if (hs > 247) return "#ffe08a"; if (hs > 228) return "#a81e36"; }
    else if (L.ing === "mat") { if (hs < 22) return "#5f9034"; if (hs > 240) return "#a6d070"; }
    else if (L.ing === "cho") { if (hs < 14) return "#3e2214"; }
    else if (L.ing === "milk") { if (hs < 9) return "#e6e2d6"; }
    else if (L.ing === "shot") { if (hs < 12) return "#5e3418"; }
    if (c >= hw - 2) return ig.c2;
    if (c === -hw) return ig.hi;
    return ig.c;
  };
  let maxR = -1; for (const c in TR) maxR = Math.max(maxR, TR[c]);
  for (let r = 0; r <= maxR; r++) {
    const hw = hwOf(Math.min(r, h - 1)) + (r >= h ? 1 : 0), y = Y0 - r;
    let i = 0; while (i < top && r >= Math.round(lay[i].h1)) i++;
    let run = null, rx = 0, rn = 0;
    const flush = () => { if (run) { G.fillStyle = run; G.fillRect(rx, y, rn, 1); } run = null; rn = 0; };
    for (let c = -hw; c < hw; c++) {
      const tr = TR[clamp(c, -hwTop - 1, hwTop)] ?? Lf - 1;
      let col = null;
      if (r <= tr) col = r === tr ? (foam ? "#ffffff" : ING[lay[i].ing].hi) : pix(r, c, i, hw);
      if (col !== run) { flush(); if (col) { run = col; rx = cx + c; } }
      if (col) rn++;
    }
    flush();
  }
  // 얼음(잠긴 곳은 비치게)
  for (const cb of cup.cubes) {
    const x = cx + cb.c;
    for (let k = 0; k < 6; k++) { const rr = cb.r + k, y = Y0 - rr, sub = rr < Lf; G.fillStyle = sub ? "rgba(255,255,255,.34)" : "rgba(236,249,255,.95)"; G.fillRect(x, y, 6, 1); }
    G.fillStyle = Lf > cb.r + 5 ? "rgba(255,255,255,.75)" : "#ffffff"; G.fillRect(x, Y0 - cb.r - 5, 6, 1); G.fillRect(x, Y0 - cb.r - 5, 1, 6);
    G.fillStyle = "rgba(120,180,215,.75)"; G.fillRect(x + 5, Y0 - cb.r - 4, 1, 5); G.fillRect(x + 1, Y0 - cb.r, 5, 1);
  }
  // 토핑 가루
  for (const d of cup.dots) { const tr = TR[clamp(d.c, -hwTop - 1, hwTop)]; if (tr == null || tr < 0) continue; P(cx + d.c, Y0 - tr - (d.o ? 1 : 0), 1, 1, d.col); }
  // 드리즐(시럽 줄)
  if (cup.drz.length) {
    let prev = null;
    for (const d of cup.drz) {
      const tr = TR[clamp(d.c, -hwTop - 1, hwTop)]; if (tr == null || tr < 0) continue;
      const y = Y0 - tr + d.o;
      if (prev && Math.abs(prev.c - d.c) < 9) { const a = Math.min(prev.c, d.c), b = Math.max(prev.c, d.c); for (let c = a; c <= b; c++) { const t = b === a ? 0 : (c - a) / (b - a), yy = Math.round(prev.y + (y - prev.y) * (prev.c < d.c ? t : 1 - t)); P(cx + c, yy, 1, 1, d.col); } }
      else P(cx + d.c, y, 1, 1, d.col);
      prev = { c: d.c, y };
    }
    for (const dp of cup.drips) { const hw = hwOf(Math.max(0, Lf - 1)), x = dp.side < 0 ? cx - hw : cx + hw - 1; P(x, Y0 - Lf + 1, 1, Math.round(dp.len), dp.col); P(x, Y0 - Lf + Math.round(dp.len), 1, 1, dp.col); }
  }
  // 빨대
  if (cup.straw > 0) {
    const sx = cx + 4, ytop = Y0 - h - 12, ybot = ytop + Math.round((h + 8) * clamp(cup.straw, 0, 1));
    for (let y = ytop; y < ybot; y++) { const inL = y > Y0 - Lf; G.fillStyle = ((y >> 1) & 1 ? "#ff5a6a" : "#ffffff"); G.globalAlpha = inL ? 0.55 : 1; G.fillRect(sx, y, 2, 1); }
    G.globalAlpha = 1; P(sx - 1, ytop, 1, Math.max(0, ybot - ytop), "rgba(40,20,20,.35)");
  }
  // 유리: 벽·테두리·바닥·하이라이트
  for (let r = -1; r < h; r++) {
    const hw = hwOf(Math.max(0, r)), y = Y0 - r;
    P(cx - hw - 2, y, 1, 1, "#2a3644"); P(cx - hw - 1, y, 1, 1, "rgba(222,242,252,.9)");
    P(cx + hw, y, 1, 1, "rgba(190,222,240,.9)"); P(cx + hw + 1, y, 1, 1, "#2a3644");
  }
  const wt = hwOf(h);
  P(cx - wt - 2, Y0 - h - 1, 2 * wt + 4, 1, "#2a3644"); P(cx - wt - 1, Y0 - h, 2 * wt + 2, 1, "#f4fbff");
  P(cx - cup.wb - 2, Y0 + 1, 2 * cup.wb + 4, 4, "#2a3644"); P(cx - cup.wb - 1, Y0 + 1, 2 * cup.wb + 2, 3, "#cfe6f2"); P(cx - cup.wb - 1, Y0 + 1, 2 * cup.wb + 2, 1, "#eef9ff"); P(cx - cup.wb + 1, Y0 + 2, 3, 1, "#ffffff");
  for (let r = 3; r < h - 4; r++) { if (r % 13 > 10) continue; const hw = hwOf(r); G.fillStyle = "rgba(255,255,255,.5)"; G.fillRect(cx - hw + 1, Y0 - r, 1, 1); }
  for (let r = h - 22; r < h - 12; r++) { const hw = hwOf(r); G.fillStyle = "rgba(255,255,255,.32)"; G.fillRect(cx - hw + 3, Y0 - r, 1, 1); }
  for (let r = 2; r < h - 2; r++) { const hw = hwOf(r); G.fillStyle = "rgba(0,40,70,.13)"; G.fillRect(cx + hw - 1, Y0 - r, 1, 1); }
  // 넘친 줄기(컵 바깥)
  if (cup.spill > 0 && top >= 0) {
    const col = ING[lay[top].ing].c, len = Math.min(h + 4, Math.round(cup.spill * 70));
    for (const [x, k] of [[cx - wt - 3, 0], [cx + wt + 2, 1], [cx - wt + 3, 2]]) { const l2 = Math.round(len * (k === 2 ? 0.0 : k ? 0.8 : 1)); if (l2 > 0) { P(x, Y0 - h, 1, l2, col); P(x, Y0 - h + l2, 1, 1, col); } }
    if (len > h) { G.fillStyle = col; G.globalAlpha = 0.85; G.fillRect(cx - wt - 7, Y0 + 4, 2 * wt + 14, 2); G.fillRect(cx - wt - 4, Y0 + 6, 2 * wt + 8, 1); G.globalAlpha = 1; }
  }
}
const mixC = (a, b) => { const p = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round((v + B[i]) / 2).toString(16).padStart(2, "0")).join(""); };

// 집게(얼음)·뿌리개·시럽병
function drawTongs(P, x, y, open, cube) {
  P(x - 2, y - 15, 5, 3, "#2a2e36"); P(x - 1, y - 14, 3, 1, "#8a929c");
  for (let k = 0; k < 11; k++) { const s = Math.round(k * (2 + open * 3) / 10); P(x - 1 - s, y - 12 + k, 1, 1, "#c4ccd4"); P(x + 1 + s, y - 12 + k, 1, 1, "#9aa2ac"); }
  const o = Math.round(open * 3); P(x - 4 - o, y - 2, 2, 3, "#e07aa0"); P(x + 3 + o, y - 2, 2, 3, "#e07aa0");
  if (cube) { P(x - 2, y - 3, 5, 5, "#e4f6ff"); P(x - 2, y - 3, 5, 1, "#ffffff"); P(x + 2, y - 2, 1, 4, "#9cc8e4"); }
}
function drawShaker(P, x, y, cols, sh) {
  x += sh; P(x - 4, y - 8, 9, 13, "#2a1e18"); P(x - 3, y - 7, 7, 7, "#f2ead8"); P(x - 3, y - 7, 1, 7, "#ffffff"); P(x - 3, y - 4, 7, 2, cols[0]); P(x - 3, y, 7, 4, "#a8b0ba"); P(x - 3, y, 7, 1, "#d0d6dc");
  P(x - 2, y + 3, 1, 1, "#3a3a3a"); P(x, y + 3, 1, 1, "#3a3a3a"); P(x + 2, y + 3, 1, 1, "#3a3a3a");
}
function drawSyrup(P, x, y, col, sh) {
  x += sh; P(x - 4, y - 11, 9, 12, "#2a1e18"); P(x - 3, y - 10, 7, 9, col); P(x - 2, y - 9, 1, 7, "rgba(255,255,255,.35)"); P(x - 2, y - 7, 5, 3, "#f2e6c8");
  P(x - 3, y, 7, 2, "#2a1e18"); P(x - 2, y, 5, 2, "#e9c46a"); P(x - 1, y + 2, 3, 2, "#2a1e18"); P(x, y + 2, 1, 2, "#e9c46a");
}
// 시음 손님 얼굴(24x24)
function drawFace(P, s, x, y, ex, tm) {
  const sk = s.skin, hc = s.hair, dk = "#3a2a20";
  P(x + 5, y + 20, 14, 4, s.shirt); P(x + 3, y + 22, 18, 2, s.shirt); P(x + 10, y + 18, 4, 2, sk); P(x + 9, y + 21, 6, 1, s.shirt2 || s.shirt);
  P(x + 6, y + 5, 12, 13, sk); P(x + 5, y + 7, 14, 9, sk); P(x + 7, y + 18, 10, 1, sk);
  if (s.style !== "long") { P(x + 4, y + 10, 1, 3, sk); P(x + 19, y + 10, 1, 3, sk); }
  if (s.hood) { P(x + 3, y + 2, 18, 4, s.hood); P(x + 3, y + 5, 2, 13, s.hood); P(x + 19, y + 5, 2, 13, s.hood); }
  if (s.style === "buzz") { P(x + 5, y + 4, 14, 2, hc); P(x + 6, y + 3, 12, 1, hc); }
  else {
    P(x + 5, y + 3, 14, 4, hc); P(x + 6, y + 2, 12, 1, hc); P(x + 5, y + 7, 2, 2, hc); P(x + 9, y + 7, 6, 1, hc);
    const side = s.style === "long" ? 13 : s.style === "bob" ? 9 : 4; P(x + 4, y + 5, 2, side, hc); P(x + 18, y + 5, 2, side, hc);
    if (s.style === "bun") P(x + 10, y, 4, 3, hc);
    if (s.style === "spiky") for (let k = 0; k < 6; k++) P(x + 6 + k * 2, y + 1, 1, 1, hc);
  }
  if (s.hat) { P(x + 4, y + 1, 16, 4, s.hat); P(x + 3, y + 5, 18, 1, s.hat); }
  const e1 = x + 8, e2 = x + 13, ey = y + 10;
  if (ex !== "sip" && ex !== "bad") { P(x + 6, y + 13, 2, 1, "#ff9aa0"); P(x + 16, y + 13, 2, 1, "#ff9aa0"); }
  if (ex === "sip") {
    P(e1, ey + 1, 3, 1, dk); P(e2, ey + 1, 3, 1, dk); P(x + 6, y + 13, 3, 2, "#ffb0b0"); P(x + 15, y + 13, 3, 2, "#ffb0b0");
    P(x + 11, y + 15, 2, 2, "#c05050"); for (let k = 0; k < 8; k++) P(x + 12 + k, y + 16 + k, 2, 1, (k >> 1) & 1 ? "#ffffff" : "#ff5a6a");
  } else if (ex === "love") {
    for (const ex0 of [e1, e2]) { P(ex0, ey, 1, 1, "#ff3a6a"); P(ex0 + 2, ey, 1, 1, "#ff3a6a"); P(ex0, ey + 1, 3, 1, "#ff3a6a"); P(ex0 + 1, ey + 2, 1, 1, "#ff3a6a"); }
    P(x + 10, y + 14, 4, 1, "#7a2a2a"); P(x + 10, y + 15, 4, 1, "#7a2a2a"); P(x + 11, y + 16, 2, 1, "#ff8a8a");
  } else if (ex === "good") {
    for (const ex0 of [e1, e2]) { P(ex0, ey + 1, 1, 1, dk); P(ex0 + 1, ey, 1, 1, dk); P(ex0 + 2, ey + 1, 1, 1, dk); }
    P(x + 10, y + 14, 1, 1, dk); P(x + 11, y + 15, 2, 1, dk); P(x + 13, y + 14, 1, 1, dk);
  } else if (ex === "meh") {
    P(e1 + 1, ey, 1, 2, dk); P(e2 + 1, ey, 1, 2, dk); P(x + 10, y + 15, 4, 1, dk);
    const d = Math.floor(tm * 3) % 2; P(x + 19, y + 6 + d, 1, 2, "#7fd0ff"); P(x + 18, y + 8 + d, 2, 1, "#7fd0ff");
  } else {
    P(e1, ey, 1, 1, dk); P(e1 + 1, ey + 1, 1, 1, dk); P(e1, ey + 2, 1, 1, dk); P(e2 + 2, ey, 1, 1, dk); P(e2 + 1, ey + 1, 1, 1, dk); P(e2 + 2, ey + 2, 1, 1, dk);
    for (let k = 0; k < 5; k++) P(x + 9 + k, y + 15 + (k & 1), 1, 1, dk);
    for (let k = 0; k < 4; k++) P(x + 8 + k * 2, y + 5, 1, 3, "rgba(90,110,220,.7)");
  }
  if (s.glasses && ex !== "love") { P(e1 - 1, ey - 1, 5, 1, "#2a2a30"); P(e1 - 1, ey + 3, 5, 1, "#2a2a30"); P(e2 - 1, ey - 1, 5, 1, "#2a2a30"); P(e2 - 1, ey + 3, 5, 1, "#2a2a30"); P(e1 + 4, ey, 1, 1, "#2a2a30"); }
}

// 바탕: 벽·가랜드·선반·조명 / 카운터 앞판 / 재료 선반
function bgCanvas(H, CTOP, PY) {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  P(0, 0, W, CTOP, "#f7e6da"); for (let x = 4; x < W; x += 10) P(x, 2, 1, CTOP, "#f1dccd");
  P(0, 0, W, 2, "#d8b8a4"); P(0, 2, W, 1, "#c8a490");
  // 징두리(민트)
  const wy = CTOP - 28; P(0, wy, W, 28, "#cfe6dc"); P(0, wy - 1, W, 1, "#ffffff"); P(0, wy, W, 1, "#b4d4c6"); for (let x = 2; x < W; x += 8) P(x, wy + 2, 1, 26, "#bfdcd0");
  // 가랜드(삼각 깃발)
  const FC = ["#ff8aa8", "#7fd0b0", "#ffd166", "#8ab8ff"];
  for (let x = 0; x < 104; x++) P(x, 18 + Math.round(4 * Math.sin(Math.PI * x / 104)), 1, 1, "#9a7a6a");
  for (let k = 0; k < 11; k++) { const x = 3 + k * 9, y = 19 + Math.round(4 * Math.sin(Math.PI * (x + 2) / 104)), col = FC[k % 4]; for (let r = 0; r < 6; r++) P(x + Math.floor(r / 2), y + r, 5 - Math.floor(r / 2) * 2, 1, col); P(x, y, 5, 1, "#ffffff"); }
  // 펜던트 조명
  P(92, 0, 1, 8, "#5a4a40"); P(88, 8, 9, 4, "#2f5a4a"); P(89, 8, 7, 1, "#4a806c"); P(90, 12, 5, 1, "#fff2b0");
  for (let r = 1; r < 10; r++) { g.fillStyle = `rgba(255,240,180,${0.13 * (1 - r / 10)})`; g.fillRect(92 - r * 2, 12 + r, r * 4 + 1, 1); }
  // 왼쪽 선반·병들
  const sy = CTOP - 48;
  P(2, sy, 30, 2, "#a87a4a"); P(2, sy, 30, 1, "#c99a64"); P(5, sy + 2, 1, 3, "#8a6440"); P(28, sy + 2, 1, 3, "#8a6440");
  P(4, sy - 9, 7, 9, "#2a1e18"); P(5, sy - 8, 5, 8, "#e0405a"); P(5, sy - 8, 5, 2, "#f4f4f4"); P(6, sy - 5, 1, 4, "#ff8a9a");
  P(13, sy - 7, 6, 7, "#2a1e18"); P(14, sy - 6, 4, 6, "#7fb04a"); P(14, sy - 4, 4, 2, "#f2e6c8");
  P(21, sy - 4, 5, 4, "#2a1e18"); P(22, sy - 3, 3, 3, "#ffffff"); P(21, sy - 8, 5, 4, "#2a1e18"); P(22, sy - 7, 3, 3, "#f4f4f4");
  P(27, sy - 10, 1, 10, "#3e8e4a"); P(25, sy - 9, 2, 3, "#4fae5a"); P(28, sy - 7, 2, 3, "#4fae5a"); P(26, sy - 3, 4, 3, "#c0603a");
  // 메뉴 칠판(작게)
  const my = sy - 30; if (my > 28) { P(4, my, 26, 18, "#3a2a20"); P(5, my + 1, 24, 16, "#2f3a32"); for (let k = 0; k < 4; k++) { P(7, my + 3 + k * 3, 12, 1, "#cfe8d0"); P(21, my + 3 + k * 3, 6, 1, "#ffd166"); } }
  // 바닥 선반(재료 칸 바탕)
  P(0, PY, W, H - PY, "#3b2b20"); P(0, PY, W, 2, "#6b4e36"); P(0, PY + 2, W, 1, "#24180f");
  return c;
}
function counterCanvas(H, CTOP, PY) {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  P(0, CTOP, W, 6, "#f4f1ec"); P(0, CTOP, W, 1, "#ffffff"); for (let x = 3; x < W; x += 17) { P(x, CTOP + 2, 5, 1, "#dcd6cc"); P(x + 5, CTOP + 3, 3, 1, "#e4ded4"); }
  P(0, CTOP + 6, W, 1, "#c9b8a4"); P(0, CTOP + 7, W, PY - CTOP - 7, "#b9805a"); P(0, CTOP + 7, W, 1, "#d09a70");
  for (let x = 0; x < W; x += 20) { P(x + 2, CTOP + 9, 16, PY - CTOP - 11, "#a86e4a"); P(x + 2, CTOP + 9, 16, 1, "#8a5838"); }
  for (let x = 6; x < W; x += 8) P(x, PY - 2, 2, 1, (x / 8) % 2 ? "#ffd1dc" : "#fff2b0");
  return c;
}

// 도트 손가락(할 일 안내). down=true 면 위에서 아래로 가리킨다
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
// 그릇 기울여 그리기(주둥이를 (sx, sy)에 맞춘다)
function drawPitcher(G, id, sx, sy, tilt, alpha) {
  const ig = ING[id], s = spr()[id], ang = ig.ang, u = ig.sp[0] + 1 - 7, v = ig.sp[1] + 1 - 8;
  const px = sx - (u * Math.cos(ang) - v * Math.sin(ang)), py = sy - (u * Math.sin(ang) + v * Math.cos(ang));
  G.save(); G.globalAlpha = alpha; G.translate(Math.round(px), Math.round(py)); G.rotate(ang * tilt); G.drawImage(s, -7, -8); G.restore();
}

export const GAME = {
  key: "ucafe3", base: "ucafe", n: "신메뉴 레시피", desc: "시음회 날! 층층이 예쁜 신메뉴를 정확히 쌓아요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 주문 카드에 층층이 쌓인 음료 그림과 <b>순서</b>가 나와요.",
    "아래 재료 버튼을 <b>꾹 누르고 있는 동안</b> 컵에 부어져요. 컵 옆 <b>노란 눈금선</b>에서 손을 떼요. 공중에 남은 줄기도 마저 떨어지니 <b>살짝 일찍</b>! 넘치거나 순서가 틀리면 층이 섞여요.",
    "<b>얼음</b>은 집게가 컵 위에 올 때 톡, <b>토핑·시럽</b>은 컵 위를 손가락으로 쓱쓱. 잔이 커질수록 층이 많아지고, 다 만들면 손님이 마셔 보고 반응해요.",
  ],
  steps: () => {
    try {
      const im = (c, h) => `<img src="${c.toDataURL()}" alt="" style="height:${h}px;width:auto">`;
      const base = { h: 38, wb: 9, wt: 11, lay: [], level: 0, cubes: [], dots: [], drz: [], drips: [], amp: 0, spill: 0, straw: 0 };
      // ① 꾹 누르고 눈금에서
      const s1 = document.createElement("canvas"); s1.width = 36; s1.height = 60; { const g = s1.getContext("2d"); g.imageSmoothingEnabled = false; const cp = { ...base, lay: [{ ing: "ber", h0: 0, h1: 10 }, { ing: "milk", h0: 10, h1: 22 }], level: 22 }; drawCup(g, cp, 14, 52, 0, false); g.fillStyle = "#ffd23f"; for (let x = 4; x < 26; x += 2) g.fillRect(x, 52 - 27, 1, 1); g.fillRect(27, 24, 1, 3); g.fillRect(28, 23, 1, 5); g.fillRect(29, 22, 1, 7); g.fillStyle = "#f4f1e8"; g.fillRect(15, 7, 2, 24); g.fillStyle = "#ffffff"; g.fillRect(15, 7, 1, 24); drawPitcher(g, "milk", 15, 6, 1, 1); }
      // ② 집게가 컵 위일 때 톡
      const s2 = document.createElement("canvas"); s2.width = 36; s2.height = 60; { const g = s2.getContext("2d"); const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; const cp = { ...base, lay: [{ ing: "milk", h0: 0, h1: 18 }], level: 18, cubes: [{ c: -7, r: 0 }, { c: 1, r: 0 }] }; drawCup(g, cp, 14, 52, 0, false); drawTongs(P, 14, 13, 0, 1); P(13, 18, 3, 1, "#3fe07a"); P(14, 19, 1, 1, "#3fe07a"); P(2, 6, 3, 1, "#9aa2ac"); P(26, 6, 3, 1, "#9aa2ac"); P(1, 5, 1, 3, "#9aa2ac"); P(29, 5, 1, 3, "#9aa2ac"); }
      // ③ 컵 위를 쓱쓱
      const s3 = document.createElement("canvas"); s3.width = 36; s3.height = 60; { const g = s3.getContext("2d"); const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; const dots = []; for (let k = 0; k < 26; k++) dots.push({ c: rint(20) - 10, o: rint(2), col: pick(TOP.coc.c) }); const cp = { ...base, lay: [{ ing: "milk", h0: 0, h1: 14 }, { ing: "shot", h0: 14, h1: 24 }, { ing: "crm", h0: 24, h1: 32 }], level: 32, dots }; drawCup(g, cp, 14, 52, 0, false); drawShaker(P, 19, 9, TOP.coc.c, 0); for (const [x, y] of [[17, 15], [20, 17], [18, 19], [21, 14]]) P(x, y, 1, 1, "#6a3a20"); P(4, 4, 6, 1, "#ffd23f"); P(3, 5, 1, 1, "#ffd23f"); P(28, 4, 5, 1, "#ffd23f"); P(33, 5, 1, 1, "#ffd23f"); }
      return [[im(s1, 60), "꾹~ 눈금에서 떼기"], [im(s2, 60), "컵 위일 때 얼음"], [im(s3, 60), "쓱쓱 토핑"]];
    } catch (e) { return [["", "꾹~ 눈금에서 떼기"], ["", "컵 위일 때 얼음"], ["", "쓱쓱 토핑"]]; }
  },
  css: `
.mg-ucafe3 .mg-u3st{background:#1e1612!important;display:flex;align-items:center;justify-content:center}
.mg-ucafe3 .mg-steps img{image-rendering:pixelated}
.mg-ucafe3 .mg-logo b{font-size:26px}
.mg-ucafe3 .u3w{position:relative;flex:0 0 auto}
.mg-ucafe3 .u3w canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:pointer}
.mg-ucafe3 .u3sign{position:absolute;pointer-events:none;background:#2f5a4a;color:#fff6e0;font-weight:900;font-size:11px;letter-spacing:.5px;border:2px solid #1c3a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;white-space:nowrap;box-shadow:0 2px 0 #0004}
.mg-ucafe3 .u3sign i{font-style:normal;color:#ffd166;margin-right:4px;font-size:9.5px}
.mg-ucafe3 .u3card{position:absolute;pointer-events:none;z-index:3}
.mg-ucafe3 .u3card .t{position:absolute;left:0;right:0;text-align:center;font-weight:900;font-size:10.5px;color:#fff;white-space:nowrap;overflow:hidden;letter-spacing:-.4px}
.mg-ucafe3 .u3card ol{list-style:none;margin:0;padding:0;position:absolute}
.mg-ucafe3 .u3card li{font-size:10px;font-weight:700;color:#6a5646;white-space:nowrap;display:flex;align-items:center;gap:2px;letter-spacing:-.5px;overflow:hidden}
.mg-ucafe3 .u3card li i{font-style:normal;display:inline-block;width:11px;height:11px;border-radius:50%;background:#cdbca4;color:#fff;font-size:8px;line-height:11px;text-align:center;flex:0 0 auto;font-weight:900}
.mg-ucafe3 .u3card li.cur{color:#c0392b;font-weight:900}
.mg-ucafe3 .u3card li.cur i{background:#e8473a;animation:u3pulse .5s infinite alternate}
.mg-ucafe3 .u3card li.ok{color:#b0a290}
.mg-ucafe3 .u3card li.ok i{background:#5fae7a}
.mg-ucafe3 .u3rv{position:absolute;pointer-events:none;z-index:4;text-align:center;font-weight:900;font-size:11px;color:#3a2418;white-space:nowrap;overflow:hidden;letter-spacing:-.4px;opacity:0;transition:opacity .15s}
.mg-ucafe3 .u3rv.on{opacity:1;animation:u3pop .3s cubic-bezier(.3,1.8,.5,1)}
.mg-ucafe3 .u3rv.bad{color:#c0392b}
.mg-ucafe3 .u3lb b{position:absolute;display:block;text-align:center;font-size:11px;font-weight:800;color:#e8d8bc;background:#2a1d14;border-radius:4px;white-space:nowrap;overflow:hidden;pointer-events:none;letter-spacing:-.5px}
.mg-ucafe3 .u3lb b.nx{background:#ffd23f;color:#3a2400;animation:u3blink .5s steps(2) infinite}
.mg-ucafe3 .u3lb b.on{background:#3fa07a;color:#fff}
@keyframes u3blink{50%{filter:brightness(1.3)}}
@keyframes u3pulse{to{transform:scale(1.2)}}
.mg-ucafe3 .u3go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-ucafe3 .u3go.on{display:block}
.mg-ucafe3 .u3go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-ucafe3 .u3go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-ucafe3 .u3go span b{color:#d8402a}
.mg-ucafe3 .u3go.dn i{top:-37px;animation:u3tapd .7s infinite}
.mg-ucafe3 .u3go.dn span{bottom:44px}
.mg-ucafe3 .u3go.hold i{animation:u3hold 1.2s infinite}
.mg-ucafe3 .u3go.sw i{top:-37px;animation:u3sw .8s infinite}
.mg-ucafe3 .u3go.sw span{bottom:44px}
@keyframes u3tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes u3hold{0%{transform:translateY(-9px)}20%,80%{transform:translateY(0) scale(.88)}100%{transform:translateY(-9px)}}
@keyframes u3sw{0%,100%{transform:translateX(-16px)}50%{transform:translateX(16px)}}
.mg-ucafe3 .u3tut{position:absolute;left:8px;right:8px;top:6px;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-ucafe3 .u3tut.off{opacity:0;visibility:hidden}
.mg-ucafe3 .u3tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #e8476a;max-width:290px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-ucafe3 .u3tut.pop .u3tc{animation:u3pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-ucafe3 .u3tc em{font-style:normal;display:inline-block;background:#e8476a;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-ucafe3 .u3tc p{margin:0}.mg-ucafe3 .u3tc b{color:#c03a5a}.mg-ucafe3 .u3tc b.rd{color:#c0392b}.mg-ucafe3 .u3tc b.bl{color:#1f6aa8}
.mg-ucafe3 .u3tb{margin-top:6px;display:flex;justify-content:center}
.mg-ucafe3 .u3skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-ucafe3 .u3go2{background:linear-gradient(#ff7a9a,#d8406a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a2040!important;animation:u3pul .5s infinite alternate}
@keyframes u3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes u3pul{to{transform:scale(1.06)}}
.mg-ucafe3 .u3dim{position:absolute;inset:0;background:#0000;transition:background .5s;pointer-events:none;z-index:11}
.mg-ucafe3 .u3dim.on{background:#000b}
.mg-ucafe3 .u3post{position:absolute;left:50%;top:50%;width:min(78%,232px);transform:translate(-50%,-50%);z-index:12;background:#fff7ea;border:3px solid #3a2418;border-radius:6px;box-shadow:0 8px 0 #0007;padding:10px 10px 12px;text-align:center;color:#3a2418;animation:u3drop .6s cubic-bezier(.3,1.4,.5,1) both}
.mg-ucafe3 .u3post::before,.mg-ucafe3 .u3post::after{content:"";position:absolute;top:-7px;width:26px;height:12px;background:#ffe8a0cc;transform:rotate(-8deg)}
.mg-ucafe3 .u3post::before{left:10px}.mg-ucafe3 .u3post::after{right:10px;transform:rotate(8deg)}
.mg-ucafe3 .u3post .rb{display:inline-block;background:#e8476a;color:#fff;font-weight:900;font-size:12px;padding:3px 12px;border-radius:3px;letter-spacing:1px}
.mg-ucafe3 .u3post .pic{margin:8px auto 2px;height:150px;display:flex;align-items:flex-end;justify-content:center;background:radial-gradient(circle at 50% 58%,#ffd6e2 0 34%,#fff0d8 35% 50%,transparent 51%)}
.mg-ucafe3 .u3post .pic img{height:146px;width:auto;image-rendering:pixelated}
.mg-ucafe3 .u3post h4{margin:4px 0 0;font-size:19px;font-weight:900;letter-spacing:-.6px}
.mg-ucafe3 .u3post .st{color:#f0a020;font-size:15px;letter-spacing:2px;line-height:1.2}
.mg-ucafe3 .u3post .st s{color:#d8ccb8;text-decoration:none}
.mg-ucafe3 .u3post .pr{font-weight:900;font-size:14px}
.mg-ucafe3 .u3post small{display:block;color:#8a7a68;font-size:11px;margin-top:2px}
.mg-ucafe3 .u3post .stamp{position:absolute;right:-8px;top:118px;border:3px solid #d8283a;color:#d8283a;border-radius:8px;padding:3px 8px;font-weight:900;font-size:19px;transform:rotate(-14deg);opacity:0;background:#fff7eacc;letter-spacing:1px;white-space:nowrap}
.mg-ucafe3 .u3post .stamp.on{animation:u3stamp .35s cubic-bezier(.2,1.6,.4,1) forwards}
.mg-ucafe3 .u3post .stamp.no{border-color:#6a6a7a;color:#6a6a7a}
@keyframes u3stamp{0%{opacity:0;transform:rotate(-14deg) scale(3)}100%{opacity:1;transform:rotate(-14deg) scale(1)}}
@keyframes u3drop{0%{transform:translate(-50%,-170%) rotate(-6deg)}100%{transform:translate(-50%,-50%)}}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "ucafe3", "신메뉴 레시피", "mg-u3st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="u3w"><canvas width="${W}" height="200"></canvas><div class="u3sign"><i>NEW</i>신메뉴 시음회</div><div class="u3card"><b class="t"></b><ol></ol></div><div class="u3rv"></div><div class="mg-bubs"></div><div class="u3lb"></div><div class="u3go"><span></span><i></i></div><div class="u3tut"><div class="u3tc"><em>리허설</em><p></p><div class="u3tb"></div></div></div><div class="u3dim"></div></div>`);
  const wrap = F.stage.querySelector(".u3w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d");
  const signEl = wrap.querySelector(".u3sign"), cardEl = wrap.querySelector(".u3card"), cardT = cardEl.querySelector(".t"), cardL = cardEl.querySelector("ol"), rvEl = wrap.querySelector(".u3rv");
  const lbEl = wrap.querySelector(".u3lb"), goEl = wrap.querySelector(".u3go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".u3tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".u3tb"), dim = wrap.querySelector(".u3dim");
  const comboEl = F.root.querySelector(".mg-combo");
  let K = 2, H = 200, PY = 150, CTOP = 132, Y0 = 134, cardY = 4, ZF = 1, WF = 1;
  const CX = 58;
  const fit = () => {
    const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 200);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 260);
    PY = H - 50; CTOP = PY - 18; Y0 = CTOP + 2; cardY = Math.max(4, CTOP - 134); const kk = clamp((H - 200) / 60, 0, 1); ZF = 1 + 0.24 * kk; WF = 1 + 0.16 * kk;
    cv.height = H; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  g.imageSmoothingEnabled = false;
  const BG = bgCanvas(H, CTOP, PY), CNT = counterCanvas(H, CTOP, PY), SP = spr();
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const PX = (v) => v * K + "px";
  // 글자 자리
  Object.assign(signEl.style, { left: PX(3), top: PX(4), width: PX(58), height: PX(11) });
  Object.assign(cardEl.style, { left: PX(103), top: PX(cardY), width: PX(55), height: PX(62) });
  Object.assign(cardT.style, { top: PX(2), height: PX(9), lineHeight: PX(9) });
  Object.assign(cardL.style, { left: PX(17), top: PX(13), width: PX(37) });
  const panX = 98, panY = () => CTOP - 66;
  Object.assign(rvEl.style, { left: PX(panX + 2), top: PX(panY() + 31), width: PX(56), height: PX(11), lineHeight: PX(11) });
  lbEl.innerHTML = BTN.map((id) => `<b>${BN[id]}</b>`).join("");
  const lbs = [...lbEl.children];
  lbs.forEach((b, i) => Object.assign(b.style, { left: PX(3 + i * 22), top: PX(PY + 36), width: PX(21), height: PX(11), lineHeight: PX(11) }));

  // 소리
  const S = {
    pour: (fr) => { noise(0.07, 320 + fr * 1500, 0.05, 0, 4); tone(180 + fr * 520, 0.05, "sine", 0.025, 60); },
    clink: () => { tone(2600, 0.05, "triangle", 0.06); tone(3200, 0.06, "triangle", 0.05, 0, 0.05); },
    plop: () => { tone(520, 0.09, "sine", 0.1, -280); noise(0.08, 1200, 0.06); },
    rim: () => { tone(1900, 0.04, "square", 0.05); tone(950, 0.08, "triangle", 0.06, 0, 0.04); },
    tong: () => tone(1400, 0.03, "square", 0.04),
    shake: () => noise(0.04, 5200 + rnd() * 1500, 0.05, 0, 3),
    squeeze: () => tone(260 + rnd() * 60, 0.06, "sine", 0.035, 90),
    slide: () => noise(0.18, 900, 0.06, 0, 0.8),
    card: () => { noise(0.12, 2600, 0.05, 0, 1.2); tone(1200, 0.05, "triangle", 0.04, 0, 0.08); },
    sip: () => { tone(330, 0.14, "sine", 0.08, 260); tone(420, 0.14, "sine", 0.08, 300, 0.18); },
    love: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, 0, i * 0.07)),
    good: () => { tone(880, 0.1, "triangle", 0.08); tone(1175, 0.14, "triangle", 0.08, 0, 0.09); },
    meh: () => tone(520, 0.18, "triangle", 0.07, -60),
    bad: () => { tone(330, 0.32, "triangle", 0.09, -170); noise(0.1, 700, 0.06, 0.05); },
    over: () => { noise(0.4, 700, 0.15, 0, 0.8); tone(240, 0.3, "sine", 0.1, -120); },
    done: () => { tone(1046, 0.08, "square", 0.05); tone(1318, 0.08, "square", 0.05, 0, 0.07); tone(1568, 0.16, "square", 0.05, 0, 0.14); },
  };

  // 상태
  let tut = 0, tutT = 0, tutRedo = false, over = false, raf = 0, last = 0, clk = 0;
  let phase = "wait", phT = 0, cup = null, cupN = 0, done = 0, perfect = 0, streak = 0, best = null, usedN = [];
  const qs = [], pours = [];
  let pour = null, pressed = -1, idleT = 0, wrongT = 0, underHint = false;
  const tong = { ph: rnd() * 6, open: 0, cd: 0 }, falls = [], parts = [], crumbs = [];
  const shaker = { on: false, x: CX, lx: CX, emit: 0, sh: 0 };
  let srv = null, cardOX = 0, gTimer = null;
  const QX = [114, 130, 146];
  const mkPerson = (x) => ({ spec: uSpec(pick(["student", "worker", "plain", "teen", "elder", "student", "worker"])), cache: {}, x, tx: x, walkT: 0, look: 0, lookT: rnd() * 3 });
  let queue = QX.map((x) => mkPerson(x));

  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const updSc = () => (F.sc.textContent = `완성 ${done}잔 · 완벽 ${perfect}`);
  const curStep = () => (cup && cup.si < cup.steps.length ? cup.steps[cup.si] : null);
  const rimY = () => Y0 - cup.h;
  const hwAt = (r) => Math.round(cup.wb + (cup.wt - cup.wb) * clamp(r / cup.h, 0, 1));
  const cxNow = () => CX + Math.round(cup ? cup.ox : 0);
  const spout = () => [cxNow() + 1, rimY() - 12];
  const showCombo = () => { if (!comboEl || streak < 2) return; comboEl.textContent = `연속 완벽 x${streak}`; comboEl.classList.remove("on"); void comboEl.offsetWidth; comboEl.classList.add("on"); };

  // ── 주문 카드 ──
  const updCard = () => {
    if (!cup) { cardT.textContent = ""; cardL.innerHTML = ""; return; }
    cardT.textContent = cup.rec.n;
    cardL.innerHTML = cup.steps.map((s, i) => `<li class="${i < cup.si ? "ok" : i === cup.si ? "cur" : ""}" style="height:${PX(8)}"><i>${i < cup.si ? "✓" : i + 1}</i>${stepName(s)}</li>`).join("");
  };
  const newCup = (rec, size, jit) => {
    cup = mkCup(rec, size, jit, ZF, WF); cup.ox = -110; phase = "in"; phT = 0; cardOX = 64;
    pour = null; falls.length = 0; shaker.on = false; underHint = false; idleT = 0; updCard(); S.slide(); S.card();
  };
  const nextCup = () => {
    const size = SEQ[Math.min(cupN, SEQ.length - 1)];
    const pool = RECIPES[size].filter((r) => !usedN.includes(r.n)); const rec = pick(pool.length ? pool : RECIPES[size]);
    usedN.push(rec.n); if (usedN.length > 5) usedN.shift();
    cupN++; newCup(rec, size, true);
  };

  // ── 붓기 ──
  const addLiquid = (ing, add) => {
    const top = cup.lay[cup.lay.length - 1];
    let L = top; if (!top || top.ing !== ing || top.si !== cup.si) { L = { ing, h0: cup.level, h1: cup.level, si: cup.si, mix: false, murk: null }; cup.lay.push(L); }
    cup.level += add; L.h1 = cup.level;
    if (cup.level > cup.h + 0.5) overflow();
  };
  const overflow = () => {
    if (cup.ovf) return; cup.ovf = true; cup.level = cup.h; const L = cup.lay[cup.lay.length - 1]; if (L) { L.h1 = cup.h; L.mix = true; }
    if (pour) { pour.hold = false; pour.top = null; pour.bot = null; }
    S.over(); vib([40, 30, 60]); F.miss(stageXY(cxNow(), rimY())); F.msg("넘쳤어요! 컵이 끈적끈적…");
    for (let k = 0; k < 14; k++) parts.push({ x: cxNow() + (rnd() < 0.5 ? -1 : 1) * (cup.wt + 1), y: rimY(), vx: (rnd() - 0.5) * 50, vy: -30 - rnd() * 40, t: 0.6, c: ING[L ? L.ing : "milk"].c });
    cup.steps.forEach((s, i) => { if (i >= cup.si) s.q = 0; });
    streak = 0; phase = "fail"; phT = 0;
  };
  const startPour = (id) => {
    if (pour && pour.ing === id) { pour.hold = true; pour.minT = 0.17; return; }
    if (pour && pour.top != null) return;
    pour = { ing: id, hold: true, tilt: 0, vis: 0, top: null, bot: null, endT: 0, sndT: 0, minT: 0.17 };
    tone(700, 0.04, "square", 0.03);
  };
  const commitPour = () => {
    const st = curStep(); if (!st || st.t !== "pour") return;
    const err = cup.level - st.tg, a = Math.abs(err);
    if (tut === 1 && a > 4 && !tutRedo) {
      tutRedo = true; F.msg(err > 0 ? "눈금을 넘었어요! 공중의 우유도 떨어지니 살짝 일찍 떼요" : "조금 모자라요! 한 번 더 해 봐요");
      setTimeout(() => { if (tut === 1 && cup) { cup.lay = []; cup.level = 0; pour = null; } }, 900); pour = pour && pour.top != null ? pour : null; return;
    }
    let q = a <= 1.2 ? 1 : a <= 3 ? 0.85 : a <= 6 ? 0.45 : 0.1;
    q = clamp(q - 0.2 * st.wrong, 0, 1); st.q = q;
    const L = cup.lay.find((l) => l.si === cup.si); if (L && err > 3.2) L.mix = true;
    const p = stageXY(cxNow() + cup.wt + 10, Y0 - st.tg);
    if (a <= 1.2) { perfect += tut < 0 ? 1 : 0; streak++; F.float(p, "완벽!"); F.burst(p, "#ffe066", 10); SFX.ding(Math.min(streak, 10)); vib(12); showCombo(); }
    else if (a <= 3) { streak = 0; F.float(p, "좋아요"); F.burst(p, "#9fe0ff", 5); SFX.ding(0); vib(8); }
    else if (a <= 6) { streak = 0; F.float(p, err > 0 ? "넘칠 뻔" : "모자라요", "bad"); SFX.tok(); }
    else { streak = 0; F.float(p, err > 0 ? "섞였어요!" : "너무 적어요", "bad"); F.miss(null); }
    if (tut < 0) pours.push(q);
    pour = pour && pour.top != null ? pour : null; if (pour) pour.hold = false;
    advance();
  };
  // ── 얼음 ──
  const dropIce = (force) => {
    const st = curStep(); if (!st || st.t !== "ice" || tong.cd > 0) return;
    const cx = cxNow(), tx = cx + (cup.wt + 8) * Math.sin(tong.ph), ok = force || Math.abs(tx - cx) <= cup.wt - 4;
    falls.push({ x: force ? cx : tx, y: rimY() - 26, vx: 0, vy: 30, ok, bounced: false, slot: cup.cubes.length + falls.filter((f) => f.ok).length });
    tong.cd = 0.45; tong.open = 0.3; st.tries++; S.tong(); idleT = 0;
  };
  // ── 토핑·드리즐 ──
  const finishTop = () => {
    const st = curStep(); if (!st || (st.t !== "top" && st.t !== "drz") || st.fin) return;
    st.fin = 1; const need = st.t === "drz" ? 2 : 3, cov = st.bins.filter((b) => b >= need).length;
    st.q = clamp(cov / 8 - Math.min(0.3, st.waste / 40), 0, 1);
    const p = stageXY(cxNow(), rimY() - 8);
    if (st.q >= 0.85) { F.float(p, "골고루!"); F.burst(p, "#ffe066", 8); SFX.ding(2); } else { F.float(p, "듬성듬성", "bad"); SFX.tok(); }
    shaker.on = false; setTimeout(() => { if (cup && curStep() === st) advance(); }, 250);
  };
  // ── 단계 넘기기 ──
  const advance = () => {
    cup.si++; idleT = 0; underHint = false; updCard();
    if (cup.si >= cup.steps.length) { phase = "serve"; phT = 0; startServe(); return; }
    if (tut >= 1 && tut <= 3) { const n = cup.si + 1; setTimeout(() => { if (tut >= 1 && tut < n) tutNext(n); }, 650); }
  };
  // ── 시음 ──
  const startServe = () => {
    const sq = cup.steps.map((s) => s.q), avg = sq.reduce((a, b) => a + b, 0) / Math.max(1, sq.length);
    const q = cup.ovf ? avg * 0.3 : avg;
    const ex = q >= 0.86 ? "love" : q >= 0.68 ? "good" : q >= 0.42 ? "meh" : "bad";
    const stars = q >= 0.86 ? 3 : q >= 0.68 ? 2 : q >= 0.42 ? 1 : 0;
    const lines = cup.ovf ? ["넘쳤잖아요ㅋㅋ", "손이 끈적끈적…"] : { love: ["층이 예술이에요!", "이거 바로 팔아요!", "사진부터 찍을게요"], good: ["맛있어요! 예뻐요", "꽤 괜찮은데요?", "또 마실래요"], meh: ["맛은 있는데… 섞였네", "음, 무난해요", "층이 좀 아쉬워요"], bad: ["이건 좀…ㅋㅋ", "다 섞였어요!", "다시 해 주세요"] }[ex];
    srv = { q, ex, stars, line: pick(lines), shown: false, sipped: 0 };
    S.done(); F.burst(stageXY(cxNow(), rimY() - 4), "#fff6b0", 10);
    if (tut < 0) {
      qs.push(q); done++; updSc();
      if (!best || q > best.q) best = snap(q);
    }
  };
  const snap = (q) => ({ q, name: cup.rec.n, size: cup.size, cup: { h: cup.h, wb: cup.wb, wt: cup.wt, lay: cup.lay.map((l) => ({ ...l })), level: cup.level, cubes: cup.cubes.slice(), dots: cup.dots.slice(), drz: cup.drz.slice(), drips: cup.drips.map((d) => ({ ...d })), amp: 0, spill: cup.spill, straw: 1, ovf: cup.ovf } });
  const queueNext = () => { queue[0].leave = true; queue[0].tx = 178; for (let i = 1; i < queue.length; i++) queue[i].tx = QX[i - 1]; const np = mkPerson(178); np.tx = QX[2]; queue.push(np); };

  // ── 리허설 ──
  const SKIP = `<button class="u3skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) { tutP.innerHTML = `주문 카드 순서대로 재료를 부어요.<br><b>우유</b> 버튼을 <b>꾹 누르고 있다가</b><br>노란 <b>눈금선</b>에 닿기 직전에 떼요!`; tutB.innerHTML = SKIP; }
    else if (n === 2) { tutP.innerHTML = `<b class="bl">얼음</b>은 타이밍! 집게가 <b>컵 위</b>에 올 때<br><b>얼음</b> 버튼을 톡!`; tutB.innerHTML = SKIP; }
    else if (n === 3) { tutP.innerHTML = `마지막은 토핑! 컵 위를<br><b>손가락으로 쓱쓱</b> 문질러 골고루 뿌려요.`; tutB.innerHTML = SKIP; }
    else if (n === 4) { tutP.innerHTML = `다 만들면 손님이 마셔 보고 반응해요.<br><b class="rd">넘치거나 순서가 틀리면</b> 층이 섞여요!<br>잔이 커질수록 층이 많아져요.`; tutB.innerHTML = `<button class="u3go2" data-go>시음회 시작!</button>`; }
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    done = 0; perfect = 0; streak = 0; best = null; cupN = 0; qs.length = 0; pours.length = 0; parts.length = 0; falls.length = 0; crumbs.length = 0; srv = null; pour = null; pressed = -1;
    rvEl.classList.remove("on"); updSc(); SFX.go?.();
    nextCup();
    gTimer = timer(T, F.bar, end);
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 손가락 안내 ──
  const FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.m || ""}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "u3go"; return; }
    goI.style.backgroundImage = `url(${FDN})`;
    goEl.style.left = PX(o.x); goEl.style.top = PX(o.y); goT.innerHTML = o.t;
    goT.style.transform = o.x < 30 ? "translateX(-22%)" : o.x > 130 ? "translateX(-80%)" : "";
    goEl.className = "u3go on " + (o.m === "sw" ? "sw" : "dn" + (o.m === "hold" ? " hold" : ""));
  };
  const btnXY = (id) => [3 + BTN.indexOf(id) * 22 + 10, PY + 8];
  const taskNow = () => {
    if (phase !== "make" || !cup) return null;
    const st = curStep(); if (!st) return null;
    const need = tut >= 0 || done === 0 && cupN <= 1 || idleT > 2.6 || wrongT > 0;
    if (!need) return null;
    if (st.t === "pour") { if (pour && (pour.hold || pour.top != null)) return null; const [x, y] = btnXY(st.ing); return { x, y, t: underHint ? `<b>살짝</b> 더` : `${BN[st.ing]} <b>꾹~</b>`, m: "hold" }; }
    if (st.t === "ice") { const cx = cxNow(), tx = cx + (cup.wt + 8) * Math.sin(tong.ph), okNow = Math.abs(tx - cx) <= cup.wt - 4; const [x, y] = btnXY("ice"); return { x, y, t: okNow ? `<b>지금 톡!</b>` : `집게 기다려요`, m: okNow ? "" : "hold" }; }
    if (!shaker.on || st.t0 < 0) return { x: cxNow(), y: rimY() - 2, t: `컵 위를 <b>쓱쓱</b>`, m: "sw" };
    return null;
  };

  // ── 입력 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const press = (id) => {
    if (over || phase !== "make" || !cup) return;
    const st = curStep(); if (!st) return;
    idleT = 0;
    if (tut === 2 && id !== "ice") { F.msg("얼음 버튼을 톡!"); SFX.tok(); return; }
    if (tut === 3) { F.msg("컵 위를 손가락으로 쓱쓱!"); SFX.tok(); return; }
    if (id === "ice") { if (st.t === "ice") dropIce(false); else { F.msg(st.t === "pour" ? `지금은 ${BN[st.ing]} 차례예요` : "컵 위를 손가락으로 쓱쓱!"); SFX.tok(); } return; }
    if (st.t === "ice") { F.msg("얼음 먼저! 집게가 컵 위일 때 얼음 톡"); SFX.tok(); return; }
    if (st.t !== "pour") { F.msg("컵 위를 손가락으로 쓱쓱!"); SFX.tok(); return; }
    if (id === st.ing) return startPour(id);
    const nx = cup.steps[cup.si + 1], mine = cup.lay.find((l) => l.si === cup.si);
    if (mine && nx && nx.t === "pour" && nx.ing === id && !(pour && pour.top != null)) { commitPour(); return startPour(id); }
    // 순서 틀림: 엉뚱한 재료가 한 방울 섞인다
    if (tut === 1) { F.msg("우유 버튼을 꾹!"); SFX.tok(); return; }
    st.wrong++; wrongT = 2.5; streak = 0;
    const top = cup.lay[cup.lay.length - 1]; if (top) top.murk = ING[id].c;
    const [bx, by] = btnXY(id); F.miss(stageXY(bx, by)); F.msg(`순서가 달라요! 지금은 ${BN[st.ing]} 차례`);
    for (let k = 0; k < 6; k++) parts.push({ x: cxNow() + rnd() * 10 - 5, y: Y0 - cup.level, vx: (rnd() - 0.5) * 40, vy: -30 - rnd() * 30, t: 0.4, c: ING[id].c });
  };
  const release = () => { if (pour && pour.hold) { pour.hold = false; } };
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault(); if (over) return; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    const [x, y] = toL(e);
    if (y >= PY + 2) { const i = Math.floor((x - 3) / 22); if (i >= 0 && i < BTN.length) { pressed = i; press(BTN[i]); } return; }
    if (over || phase !== "make" || !cup) return;
    const st = curStep(); if (!st) return;
    if (st.t === "ice" && tut !== 3) { idleT = 0; if (tut === 2 || tut < 0) dropIce(false); return; }
    if (st.t === "top" || st.t === "drz") { shaker.on = true; shaker.x = shaker.lx = clamp(x, 12, 148); idleT = 0; return; }
    if (st.t === "pour") { F.msg(`아래 ${BN[st.ing]} 버튼을 꾹 눌러요`); SFX.tok(); }
  });
  cv.addEventListener("pointermove", (e) => { if (!shaker.on) return; const [x] = toL(e); shaker.x = clamp(x, 12, 148); });
  const up = () => { pressed = -1; release(); shaker.on = false; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  // ── 그리기 ──
  const drawStar = (x, y, on, s = 1) => STAR.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "X") P(x + c, y + r, 1, 1, on ? (r < 2 ? "#ffe680" : "#ffc83f") : "#e2d8c6"); }));
  const drawMini = (x, y) => {
    // 주문 카드 속 작은 컵(층 비율 그대로)
    const mh = 40, mw = 10, sc = mh / cup.h, by = y + mh;
    P(x - 1, y - 1, mw + 2, mh + 3, "#2a3644"); P(x, y, mw, mh + 1, "#eef8fc");
    let prev = 0;
    cup.steps.forEach((s, i) => {
      if (s.t === "pour") {
        const y1 = Math.round(by - s.tg * sc), y0 = Math.round(by - prev * sc), ig = ING[s.ing];
        P(x, y1, mw, y0 - y1, ig.c); P(x + mw - 2, y1, 2, y0 - y1, ig.c2); P(x, y1, mw, 1, ig.hi);
        if (s.ing === "crm") for (let k = 0; k < mw; k += 2) P(x + k, y1 - 1, 1, 1, "#fbf4e2");
        if (i === cup.si && Math.floor(clk * 4) % 2) { P(x - 3, y1, 2, 1, "#e8473a"); P(x + mw + 1, y1, 2, 1, "#e8473a"); }
        prev = s.tg;
      } else if (s.t === "ice") { for (let k = 0; k < s.n; k++) { P(x + 1 + (k % 2) * 4, by - 4 - Math.floor(k / 2) * 4, 3, 3, "#ffffff"); P(x + 3 + (k % 2) * 4, by - 3 - Math.floor(k / 2) * 4, 1, 2, "#9cc8e4"); } }
    });
    const tp = cup.steps.find((s) => s.t === "top" || s.t === "drz");
    if (tp) { const ty = Math.round(by - prev * sc) - 1, cs = TOP[tp.k].c; for (let k = 0; k < mw; k++) if (tp.t === "drz" ? (k % 3 !== 1) : hsh(k, 5) & 1) P(x + k, ty + (tp.t === "drz" ? k % 2 : 0), 1, 1, cs[k % cs.length]); }
    P(x + 6, y - 6, 1, 7, "#ff5a6a"); P(x + 6, y - 6, 1, 1, "#ffffff"); P(x + 6, y - 3, 1, 1, "#ffffff");
  };
  const drawCard = () => {
    const x = 103 + Math.round(cardOX), y = cardY;
    P(x, y, 55, 62, "#2a1e18"); P(x + 1, y + 1, 53, 60, "#fffaf0"); P(x + 1, y + 1, 53, 10, cup && cup.size === "L" ? "#e8476a" : cup && cup.size === "M" ? "#e8904a" : "#4aa07a");
    for (let k = 0; k < 53; k += 4) P(x + 1 + k, y + 11, 2, 1, "#e6d8c4");
    P(x + 26, y - 2, 3, 3, "#d8283a"); P(x + 26, y - 2, 1, 1, "#ff8a8a");
    if (cup) drawMini(x + 4, y + 16);
    cardEl.style.transform = cardOX ? `translateX(${PX(cardOX)})` : "";
  };
  const drawQueue = (tm) => {
    queue.forEach((p, i) => {
      const moving = Math.abs(p.tx - p.x) > 0.5;
      let key, o, flip = false;
      if (moving) { const f = Math.floor(p.walkT) % 4; key = "w" + f; o = { v: "s", f }; flip = p.tx < p.x; }
      else if (i === 0 && !p.leave) { const sip = srv && phase === "serve" && phT > 0.35; key = "t" + (sip ? 1 : 0); o = { v: "s", f: 0, carry: sip ? 1 : 0 }; flip = true; }
      else { key = "i" + p.look; o = { v: "f", f: 0, look: p.look }; }
      const c = uSprite(p, key + (flip ? "l" : ""), o, flip);
      g.drawImage(c, Math.round(p.x - 8), CTOP - 22 + (i === 0 && !moving ? 0 : 1));
    });
  };
  const drawTicks = (tm) => {
    const cx = cxNow(), st = curStep();
    cup.steps.forEach((s, i) => {
      if (s.t !== "pour") return;
      const r = s.tg, y = Y0 - Math.round(r) + 1, hw = hwAt(r), x = cx + hw + 3;
      if (i < cup.si) { P(x, y, 2, 1, "rgba(80,60,40,.45)"); return; }
      if (i > cup.si) { P(x, y, 3, 1, "#ffffff"); P(x, y + 1, 3, 1, "rgba(0,0,0,.18)"); return; }
      const b = Math.floor(tm * 5) % 2;
      for (let c = -hw; c < hw; c += 2) P(cx + c + (b ? 1 : 0), y, 1, 1, "rgba(255,214,40,.9)");
      P(x - 1, y, 5, 1, "#ffd23f"); P(x - 1, y + 1, 5, 1, "#b88a10");
      const ax = x + 5 + (b ? 0 : 1); P(ax, y, 1, 1, "#ffd23f"); P(ax + 1, y - 1, 1, 3, "#ffd23f"); P(ax + 2, y - 2, 1, 5, "#ffd23f"); P(ax + 3, y - 1, 3, 3, "#ffd23f"); P(ax + 1, y + 2, 5, 1, "#8a6a10");
    });
  };
  const drawPanel = (tm) => {
    if (!srv || phT < 0.3) return;
    const t = Math.min(1, (phT - 0.3) / 0.18), px = panX + Math.round((1 - t) * 70), py = panY();
    P(px, py, 60, 44, "#2a1e18"); P(px + 1, py + 1, 58, 42, "#fffdf6"); P(px + 3, py + 3, 26, 26, srv.ex === "bad" && phT > 0.8 ? "#dfe4f2" : "#ffe4ec");
    const ex = phT < 0.8 ? "sip" : srv.ex;
    drawFace(P, queue[0].spec, px + 4, py + 4, ex, tm);
    for (let k = 0; k < 3; k++) { const on = phT > 0.85 + k * 0.1 && k < srv.stars; drawStar(px + 32 + k * 8, py + 6, on); }
    if (phT > 0.8 && srv.ex === "love") for (let k = 0; k < 3; k++) { const ph = (tm * 0.9 + k / 3) % 1, hx = px + 34 + k * 7, hy = py + 26 - Math.round(ph * 10); g.globalAlpha = 1 - ph; P(hx, hy, 1, 1, "#ff4a7a"); P(hx + 2, hy, 1, 1, "#ff4a7a"); P(hx, hy + 1, 3, 1, "#ff4a7a"); P(hx + 1, hy + 2, 1, 1, "#ff4a7a"); g.globalAlpha = 1; }
    if (phT < 0.8) for (let k = 0; k < 3; k++) P(px + 36 + k * 6, py + 20, 2, 2, Math.floor(tm * 6) % 3 === k ? "#8a7a68" : "#d8ccb8");
  };
  const drawSlots = (tm) => {
    const st = phase === "make" ? curStep() : null;
    BTN.forEach((id, i) => {
      const x0 = 3 + i * 22, on = pressed === i, need = st && ((st.t === "pour" && st.ing === id) || (st.t === "ice" && id === "ice"));
      const hint = need && (tut >= 0 || (done === 0 && cupN <= 1));
      P(x0, PY + 4, 21, 31, on ? "#2e2018" : "#4e3a2b"); P(x0, PY + 4, 21, 1, on ? "#1e140d" : "#6a503c"); P(x0 + 20, PY + 5, 1, 30, "#2a1d14");
      if (hint && Math.floor(tm * 4) % 2) { P(x0, PY + 4, 21, 1, "#ffd23f"); P(x0, PY + 34, 21, 1, "#ffd23f"); P(x0, PY + 4, 1, 31, "#ffd23f"); P(x0 + 20, PY + 4, 1, 31, "#ffd23f"); }
      const lift = on ? 1 : 0;
      P(x0 + 4, PY + 28, 13, 2, "rgba(0,0,0,.35)");
      g.drawImage(SP[id], x0 + 3 + 0, PY + 12 + lift);
      const cls = on ? "on" : hint ? "nx" : ""; if (lbs[i].className !== cls) lbs[i].className = cls;
    });
  };
  const render = (tm) => {
    g.drawImage(BG, 0, 0);
    // 조명 깜빡임 먼지
    for (let k = 0; k < 3; k++) { const ph = (tm * 0.25 + k / 3) % 1; g.fillStyle = `rgba(255,250,210,${0.6 * Math.sin(ph * Math.PI)})`; g.fillRect(84 + k * 5 + Math.round(Math.sin(tm + k) * 2), 14 + Math.round(ph * 20), 1, 1); }
    drawQueue(tm);
    g.drawImage(CNT, 0, 0);
    for (const c of crumbs) P(c.x, c.y, 1, 1, c.c);
    if (cup) {
      const cx = cxNow();
      drawCup(g, cup, cx, Y0, tm, true);
      if (phase === "make" || phase === "in") drawTicks(tm);
      const st = curStep();
      // 집게
      if (phase === "make" && st && st.t === "ice") {
        const tx = Math.round(cx + (cup.wt + 8) * Math.sin(tong.ph)), ok = Math.abs(tx - cx) <= cup.wt - 4;
        if (ok && tong.cd <= 0) { P(cx - 1, rimY() - 6, 3, 1, "#3fe07a"); P(cx, rimY() - 5, 1, 1, "#3fe07a"); }
        P(cx - cup.wt - 8, rimY() - 41, 2 * cup.wt + 17, 1, "rgba(60,40,30,.25)");
        P(tx, rimY() - 44, 1, 3, "#5a4a40");
        drawTongs(P, tx, rimY() - 26, tong.open > 0 ? 1 : 0, tong.cd <= 0.15);
      }
      for (const f of falls) { const x = Math.round(f.x) - 2, y = Math.round(f.y) - 2; P(x - 1, y - 1, 7, 7, "#2a3644"); P(x, y, 5, 5, "#e4f6ff"); P(x, y, 5, 1, "#ffffff"); P(x + 4, y + 1, 1, 4, "#9cc8e4"); }
      // 그릇·줄기
      if (pour) {
        const [sx, sy] = spout(), ig = ING[pour.ing];
        if (pour.top != null && pour.bot != null && pour.bot > pour.top) {
          const y0 = Math.round(pour.top), y1 = Math.round(pour.bot), wob = Math.round(Math.sin(tm * 40) * 0.5);
          P(sx + wob, y0, 2, y1 - y0, ig.c); P(sx + wob, y0, 1, y1 - y0, ig.hi);
          if (y1 >= Y0 - cup.level - 1 && Math.floor(tm * 20) % 2) { P(sx - 2, y1 - 1, 1, 1, ig.hi); P(sx + 3, y1 - 2, 1, 1, ig.hi); }
        }
        if (pour.vis > 0) drawPitcher(g, pour.ing, sx, sy, pour.tilt, pour.vis);
      }
      if (phase === "make" && st && (st.t === "top" || st.t === "drz")) {
        const sx = Math.round(shaker.on ? shaker.x : cx + Math.sin(tm * 3) * 6), sy = rimY() - 16, tp = TOP[st.k], sh = shaker.on ? (Math.floor(tm * 24) % 2 ? 1 : -1) : 0;
        if (st.t === "drz") drawSyrup(P, sx, sy, tp.c[0], sh); else drawShaker(P, sx, sy, tp.c, sh);
      }
    }
    for (const p of parts) { g.globalAlpha = clamp(p.t * 3, 0, 1); P(Math.round(p.x), Math.round(p.y), p.s || 1, p.s || 1, p.c); }
    g.globalAlpha = 1;
    drawCard();
    drawPanel(tm);
    drawSlots(tm);
  };

  // ── 매 프레임 ──
  const surfY = () => Y0 - cup.level;
  const update = (dt) => {
    phT += dt; if (wrongT > 0) wrongT -= dt;
    if (cardOX > 0) cardOX = Math.max(0, cardOX - dt * 300);
    // 줄 선 손님
    for (const p of queue) { const d = p.tx - p.x; if (Math.abs(d) > 0.5) { p.x += Math.sign(d) * Math.min(Math.abs(d), 42 * dt); p.walkT += dt * 5; } p.lookT -= dt; if (p.lookT <= 0) { p.look = pick([-1, 0, 0, 1]); p.lookT = 1 + rnd() * 2.5; } }
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].leave && queue[i].x > 172) queue.splice(i, 1);
    // 파티클
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; if (p.t <= 0) parts.splice(i, 1); }
    if (!cup) return;
    cup.amp = Math.max(0, cup.amp - dt * 2.2);
    if (phase === "in") { const k = clamp(phT / 0.32, 0, 1); cup.ox = -110 * Math.pow(1 - k, 3); if (k >= 1) { cup.ox = 0; phase = "make"; phT = 0; } return; }
    if (phase === "fail") { cup.spill = Math.min(1.6, cup.spill + dt * 1.6); if (phT > 0.9) { phase = "serve"; phT = 0; startServe(); } return; }
    if (phase === "serve") {
      if (phT > 0.2) cup.straw = Math.min(1, (phT - 0.2) / 0.15);
      if (phT > 0.35 && phT < 0.8) { if (!srv.sipped) { srv.sipped = 1; S.sip(); } const L = cup.lay[cup.lay.length - 1]; if (L && cup.level > 2) { cup.level -= dt * 7; L.h1 = cup.level; } }
      if (phT > 0.8 && !srv.shown) {
        srv.shown = true; rvEl.textContent = srv.line; rvEl.className = "u3rv on" + (srv.ex === "bad" || srv.ex === "meh" ? " bad" : "");
        S[srv.ex](); const p = stageXY(panX + 16, panY() + 10);
        if (srv.ex === "love") { F.burst(p, "#ff8ab0", 12); vib(15); } else if (srv.ex === "bad") vib([30, 30, 30]);
        for (let k = 0; k < srv.stars; k++) setTimeout(() => tone(1200 + k * 200, 0.06, "triangle", 0.06), k * 100);
      }
      if (phT > 1.35) cup.ox += dt * 320;
      if (phT > 1.6) {
        rvEl.className = "u3rv"; srv = null; queueNext();
        if (tut >= 0) { cup = null; phase = "wait"; updCard(); tutNext(4); } else if (!over) nextCup();
      }
      return;
    }
    if (phase !== "make") return;
    const st = curStep(); if (!st) return;
    idleT += dt;
    // 붓기
    if (pour) {
      // 톡 짧게 눌러도 조금은 붓는다(살짝 더 채우기)
      if (pour.minT > 0) pour.minT -= dt;
      const hd = pour.hold || pour.minT > 0;
      pour.vis = hd || pour.top != null || pour.tilt > 0 ? Math.min(1, pour.vis + dt * 12) : Math.max(0, pour.vis - dt * 6);
      pour.tilt = hd ? Math.min(1, pour.tilt + dt / 0.12) : Math.max(0, pour.tilt - dt / 0.2);
      const [, sy] = spout(), sY = surfY(), rate = ING[pour.ing].rate / Math.sqrt(ez);
      if (hd && pour.tilt >= 1) { if (pour.top == null) { pour.top = sy; pour.bot = sy; } else pour.top = sy; pour.endT = 0; }
      else if (pour.top != null) pour.top += V_FALL * dt;
      if (pour.bot != null) pour.bot = Math.min(sY, pour.bot + V_FALL * dt);
      if (pour.top != null && pour.bot >= sY - 0.5 && pour.top < sY) {
        addLiquid(pour.ing, rate * dt); cup.amp = Math.min(1.4, cup.amp + dt * 8); idleT = 0;
        pour.sndT -= dt; if (pour.sndT <= 0) { pour.sndT = 0.065; S.pour(cup.level / cup.h); }
        if (rnd() < 0.5) parts.push({ x: spout()[0] + (rnd() - 0.3) * 4, y: sY - 1, vx: (rnd() - 0.5) * 30, vy: -20 - rnd() * 25, t: 0.25, c: ING[pour.ing].hi });
        if (phase !== "make") return;
      }
      if (pour && pour.top != null && pour.top >= surfY()) { pour.top = null; pour.bot = null; }
      if (pour && !pour.hold && pour.minT <= 0 && pour.top == null) {
        pour.endT += dt;
        const s2 = curStep();
        if (pour.endT > 0.16 && s2 && s2.t === "pour" && s2.ing === pour.ing && !pour.judged) {
          pour.judged = true;
          if (cup.level >= s2.tg - 1.5) { commitPour(); }
          else if (cup.lay.some((l) => l.si === cup.si)) { underHint = true; if (tut !== 1) F.float(stageXY(cxNow() + cup.wt + 10, Y0 - s2.tg), "조금 더!"); else F.msg("조금 모자라요! 한 번 더 살짝 꾹~"); }
        }
        if (pour && pour.tilt <= 0 && pour.vis <= 0) pour = null;
      }
      if (pour && pour.hold) pour.judged = false;
    }
    // 얼음 집게
    if (st.t === "ice") {
      tong.ph += dt * 2.6 / Math.sqrt(ez); tong.cd = Math.max(0, tong.cd - dt); tong.open = Math.max(0, tong.open - dt);
    }
    for (let i = falls.length - 1; i >= 0; i--) {
      const f = falls[i], cx = cxNow(); f.vy += 520 * dt; f.y += f.vy * dt; f.x += f.vx * dt;
      if (!f.ok && !f.bounced && f.y >= rimY() - 3) { f.bounced = true; f.vx = Math.sign(f.x - cx || 1) * 45; f.vy = -70; S.rim(); F.float(stageXY(f.x, rimY() - 6), "앗!", "bad"); streak = 0; }
      if (f.bounced && f.y > CTOP + 3) { falls.splice(i, 1); for (let k = 0; k < 3; k++) parts.push({ x: f.x, y: CTOP + 3, vx: (rnd() - 0.5) * 30, vy: -20, t: 0.3, c: "#e4f6ff" }); continue; }
      if (f.ok) {
        const sl = ICE_SLOTS[Math.min(f.slot, ICE_SLOTS.length - 1)], tgx = cx + sl[0] + 3, restY = Y0 - sl[1] - 3;
        if (f.y > rimY()) f.x += (tgx - f.x) * Math.min(1, dt * 10);
        if (f.y >= restY) {
          falls.splice(i, 1); cup.cubes.push({ c: sl[0], r: sl[1] }); S.clink(); if (cup.level > sl[1]) { S.plop(); cup.amp = 1.4; for (let k = 0; k < 6; k++) parts.push({ x: tgx + rnd() * 6 - 3, y: surfY() - 1, vx: (rnd() - 0.5) * 50, vy: -40 - rnd() * 30, t: 0.35, c: "#e8f8ff" }); }
          const s2 = curStep(); if (s2 && s2.t === "ice") { s2.got++; F.float(stageXY(tgx, rimY() - 4), s2.got >= s2.n ? "딱!" : "+1"); vib(8); if (s2.got >= s2.n) { s2.q = clamp(s2.n / Math.max(s2.n, s2.tries), 0, 1); if (s2.q >= 1) { SFX.ding(1); } setTimeout(() => { if (cup && curStep() === s2) advance(); }, 300); } }
        }
      }
    }
    // 토핑·드리즐
    if ((st.t === "top" || st.t === "drz") && !st.fin) {
      const tp = TOP[st.k], cx = cxNow(), sy = rimY() - 16;
      if (shaker.on) {
        if (st.t0 < 0) st.t0 = clk;
        const mv = Math.abs(shaker.x - shaker.lx) > 0.2; shaker.lx = shaker.x;
        shaker.emit += dt * (st.t === "drz" ? (mv ? 34 : 8) : (mv ? 42 : 10));
        while (shaker.emit >= 1) { shaker.emit--; parts.push({ x: shaker.x + (rnd() - 0.5) * (st.t === "drz" ? 1 : 4), y: sy + 4, vx: 0, vy: st.t === "drz" ? 90 : 30, t: 2, c: pick(tp.c), kind: st.t, s: 1 }); }
        if (rnd() < dt * 12) st.t === "drz" ? S.squeeze() : S.shake();
      }
      // 떨어진 가루 판정
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; if (!p.kind) continue;
        const r = Math.floor(cup.level) - 1, hw = hwAt(Math.max(0, r)), c = Math.round(p.x - cx);
        const inside = c >= -hw && c < hw;
        if (inside && p.y >= Y0 - r - 1) {
          parts.splice(i, 1);
          const bin = clamp(Math.floor((c + hw) / (2 * hw) * 8), 0, 7); st.bins[bin]++;
          if (p.kind === "drz") { cup.drz.push({ c, o: (cup.drz.length >> 2) % 3, col: p.c }); if (Math.abs(c) >= hw - 2 && cup.drips.length < 6 && rnd() < 0.5) cup.drips.push({ side: c < 0 ? -1 : 1, len: 0, max: 5 + rint(8), col: p.c }); }
          else cup.dots.push({ c, o: rint(2), col: p.c });
        } else if (!inside && p.y >= CTOP + 2) { parts.splice(i, 1); st.waste++; crumbs.push({ x: Math.round(p.x), y: CTOP + 1 + rint(4), c: p.c }); if (crumbs.length > 200) crumbs.shift(); }
      }
      const need = st.t === "drz" ? 2 : 3, cov = st.bins.filter((b) => b >= need).length;
      if (cov >= 8 || (cov >= 7 && !shaker.on) || (st.t0 >= 0 && clk - st.t0 > 5.5)) finishTop();
    }
    for (const dp of cup.drips) if (dp.len < dp.max) dp.len += dt * 10;
  };

  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clk += dt;
    if (tut === 0) { tutT += dt; if (opts.retry || tutT > 0.4) { if (opts.retry) startGame(); else { newCup(PRACTICE, "S", false); tutNext(1); } } }
    if (!over) update(dt);
    if (!over) {
      if (tut === 3 && phase === "make") guide({ x: cxNow(), y: rimY() - 2, t: "컵 위를 <b>쓱쓱</b>", m: "sw" });
      else if (tut === 4 || tut === 0) guide(null);
      else guide(taskNow());
    }
    render(clk);
    raf = requestAnimationFrame(loop);
  };

  // ── 끝: 오늘의 신메뉴 포스터 ──
  const end = () => {
    if (over) return; over = true; guide(null); pressed = -1; if (pour) pour.hold = false;
    let pf = 0, pq = 0;
    if (cup && (phase === "make" || phase === "in") && cup.si > 0) { pf = cup.si / cup.steps.length; pq = cup.steps.slice(0, cup.si).reduce((a, s) => a + s.q, 0) / cup.si; }
    if (!best && cup && cup.level > 0) best = snap(pq);
    const sumQ = qs.reduce((a, b) => a + b, 0), totN = done + pf, avgQ = totN ? (sumQ + pq * pf) / totN : 0;
    const comp = Math.min(1, totN / TARGET), score = clamp(Math.pow(avgQ, 1.2) * comp, 0, 1);
    const acc = pours.length ? pours.reduce((a, b) => a + b, 0) / pours.length : 0;
    dim.classList.add("on");
    // 포스터 그림: 가장 잘 만든 잔
    const pc = document.createElement("canvas");
    const bc = best ? best.cup : { h: 48, wb: 12, wt: 15, lay: [], level: 0, cubes: [], dots: [], drz: [], drips: [], amp: 0, spill: 0, straw: 0 };
    pc.width = 2 * bc.wt + 14; pc.height = bc.h + 26; const pg = pc.getContext("2d");
    drawCup(pg, bc, bc.wt + 7, bc.h + 16, 0, false);
    const stars = Math.round(clamp(avgQ, 0, 1) * 5), ok = score >= 0.35;
    const name = best ? best.name : "준비 중", price = best ? won(PRICE[best.size]) + "원" : "-";
    const box = document.createElement("div"); box.className = "u3post";
    box.innerHTML = `<div class="rb">오늘의 신메뉴</div><div class="pic"><img src="${pc.toDataURL()}" alt=""></div><h4>${name}</h4><div class="st">${"★".repeat(stars)}<s>${"★".repeat(5 - stars)}</s></div><div class="pr">${price}</div><small>시음 ${done}명 · 완벽한 층 ${perfect}개</small><div class="stamp${ok ? "" : " no"}">${ok ? "판매 시작" : "다시 연구"}</div>`;
    wrap.appendChild(box); S.card(); SFX.whoosh();
    const D = RM() ? 200 : 900;
    setTimeout(() => { const s = box.querySelector(".stamp"); s.classList.add("on"); setTimeout(() => { SFX.stamp(); vib(30); if (ok) F.burst(s, "#ff6a8a", 14); }, 200); }, D);
    setTimeout(() => finish(score, `${done}잔 완성 · 완벽한 층 <b>${perfect}개</b>${best ? ` · 대표 메뉴 <b>${name}</b>` : ""}`, "", [["층 정확도", acc], ["잔 완성도", avgQ], ["만든 잔 수", comp]]), D + 1500);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.ucafe3 = {
    st: () => ({ tut, phase, cupN, done, perfect, qs: qs.slice(), si: cup && cup.si, step: cup && curStep() && curStep().t, level: cup && +cup.level.toFixed(1), tg: cup && curStep() && curStep().tg, ing: cup && curStep() && curStep().ing, pouring: !!(pour && (pour.hold || pour.minT > 0 || pour.top != null)), over }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (phase !== "make" || !cup) { if (tut === 4) startGame(); return; }
      const st = curStep(); if (!st) return;
      if (st.t === "pour") { addLiquid(st.ing, st.tg - cup.level); commitPour(); }
      else if (st.t === "ice") { tong.cd = 0; dropIce(true); }
      else { st.bins = st.bins.map(() => 3); for (let k = 0; k < 24; k++) cup.dots.push({ c: rint(2 * cup.wt) - cup.wt, o: rint(2), col: pick(TOP[st.k].c) }); finishTop(); }
    },
    auto: (bad) => {
      if (over || phase !== "make" || !cup) return;
      const st = curStep(); if (!st || pour) return;
      if (st.t === "pour") { const tg = st.tg + (bad ? pick([-6, 7, 9, 5]) : 0); addLiquid(st.ing, Math.max(0.1, tg - cup.level)); if (phase === "make") commitPour(); }
      else if (st.t === "ice") { if (tong.cd <= 0 && !falls.length) { tong.cd = 0; dropIce(!bad || rnd() < 0.35); } }
      else if (!st.fin) { const need = st.t === "drz" ? 2 : 3; st.bins = st.bins.map((b, i) => (bad && i % 2 ? 0 : need)); for (let k = 0; k < 30; k++) { const c = rint(2 * cup.wt) - cup.wt; if (st.t === "drz") cup.drz.push({ c, o: k % 3, col: TOP[st.k].c[0] }); else cup.dots.push({ c, o: rint(2), col: pick(TOP[st.k].c) }); } finishTop(); }
    },
  };
  updSc(); render(0); raf = requestAnimationFrame(loop);
}
