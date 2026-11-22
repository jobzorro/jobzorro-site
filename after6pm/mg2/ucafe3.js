// 무인카페 3탄: 사장님은 연구 중 (장면 좌표 160x200~260, 기기 해상도 벡터 캔버스 · 벽은 실제 그림 · 손님은 캐릭터 그림)
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

// ── 벡터 그리기 도구(장면 좌표 그대로, 캔버스는 기기 해상도) ──
const TAU = Math.PI * 2;
const DPR0 = () => Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
const rgbOf = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const rgba = (s, a) => { const [r, g, b] = rgbOf(s); return `rgba(${r},${g},${b},${a})`; };
const shade = (s, f) => "#" + rgbOf(s).map((v) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join("");
const rrect = (G, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); G.beginPath(); G.moveTo(x + r, y); G.arcTo(x + w, y, x + w, y + h, r); G.arcTo(x + w, y + h, x, y + h, r); G.arcTo(x, y + h, x, y, r); G.arcTo(x, y, x + w, y, r); G.closePath(); };
const ell = (G, x, y, rx, ry, a = 0) => { G.beginPath(); G.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), a, 0, TAU); };
const lgH = (G, x0, x1, st) => { const q = G.createLinearGradient(x0, 0, x1, 0); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const lgV = (G, y0, y1, st) => { const q = G.createLinearGradient(0, y0, 0, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const fillP = (G, pts, col) => { G.beginPath(); pts.forEach(([x, y], i) => (i ? G.lineTo(x, y) : G.moveTo(x, y))); G.closePath(); G.fillStyle = col; G.fill(); };
// 별(가운데 x,y, 반지름 r)
function starV(G, x, y, r, on) {
  G.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; G.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } G.closePath();
  G.fillStyle = on ? lgV(G, y - r, y + r, [[0, "#fff3a8"], [0.5, "#ffc83f"], [1, "#f09a20"]]) : "#e6dccb"; G.fill();
  G.lineWidth = r * 0.16; G.strokeStyle = on ? "#b8701a" : "#c8bba4"; G.stroke();
}
function heartV(G, x, y, s, col) {
  G.beginPath(); G.moveTo(x, y + s * 0.9); G.bezierCurveTo(x - s * 1.3, y, x - s * 0.7, y - s * 0.9, x, y - s * 0.25); G.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.3, y, x, y + s * 0.9); G.fillStyle = col; G.fill();
  ell(G, x - s * 0.38, y - s * 0.3, s * 0.18, s * 0.12, -0.6); G.fillStyle = "rgba(255,255,255,.6)"; G.fill();
}
// 얼음 한 조각(왼쪽 위 x,y, 크기 s)
function cubeV(G, x, y, s, sub, rot = 0) {
  G.save(); G.translate(x + s / 2, y + s / 2); G.rotate(rot);
  rrect(G, -s / 2, -s / 2, s, s, s * 0.22);
  G.fillStyle = sub ? "rgba(255,255,255,.26)" : lgV(G, -s / 2, s / 2, [[0, "rgba(250,254,255,.97)"], [1, "rgba(196,228,245,.9)"]]); G.fill();
  G.lineWidth = 0.35; G.strokeStyle = sub ? "rgba(255,255,255,.55)" : "rgba(110,165,200,.75)"; G.stroke();
  G.fillStyle = sub ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.95)"; rrect(G, -s / 2 + 0.7, -s / 2 + 0.6, s * 0.5, s * 0.16, 0.3); G.fill();
  G.fillStyle = sub ? "rgba(120,180,215,.18)" : "rgba(120,180,215,.35)"; rrect(G, s / 2 - 1.2, -s / 2 + 1, 0.6, s - 2, 0.3); G.fill();
  G.restore();
}

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

// ── 컵 그리기(본게임·포스터·방법 그림 공용). cx: 가운데, Y0: 속 바닥 줄. 장면 좌표 벡터 ──
function drawCup(G, cup, cx, Y0, tm, live) {
  const h = cup.h, hwOf = (r) => cup.wb + (cup.wt - cup.wb) * clamp(r / h, 0, 1) + (r > h ? 0.6 : 0);
  const lay = cup.lay, top = lay.length - 1, L = clamp(cup.level, 0, h);
  const topIng = top >= 0 ? lay[top].ing : null, foam = topIng === "crm";
  const amp = live ? cup.amp : 0;
  // 윗면 높이(r 단위): 물결 + 크림 거품 봉우리
  const surfR = (x) => { let r = L + amp * 0.9 * Math.sin((x - cx) * 0.9 + tm * 13); if (foam && amp < 0.4) r += 0.9 + 0.55 * Math.sin((x - cx) * 1.3 + 0.7) + 0.35 * Math.sin((x - cx) * 2.9); return clamp(r, L - 2, foam ? h + 1.6 : h - 0.3); };
  G.save();
  // 그림자
  ell(G, cx + 1, Y0 + 5.4, cup.wb + 6, 2.1); G.fillStyle = "rgba(60,30,15,.22)"; G.fill();
  // 빈 유리 속(옅은 하늘빛)
  const inner = () => { G.beginPath(); G.moveTo(cx - cup.wb, Y0 + 0.5); G.lineTo(cx - cup.wt, Y0 - h); G.lineTo(cx + cup.wt, Y0 - h); G.lineTo(cx + cup.wb, Y0 + 0.5); G.closePath(); };
  inner(); G.fillStyle = lgH(G, cx - cup.wt, cx + cup.wt, [[0, "rgba(220,242,252,.42)"], [0.5, "rgba(190,228,246,.24)"], [1, "rgba(150,200,230,.38)"]]); G.fill();
  // 액체 몸통
  if (L > 0.05 && top >= 0) {
    const N = 26, xl = cx - hwOf(L) - 1, xr = cx + hwOf(L) + 1;
    G.save();
    G.beginPath(); G.moveTo(cx - cup.wb, Y0 + 0.5);
    const sp = []; for (let k = 0; k <= N; k++) { const x = xl + (xr - xl) * k / N, r = surfR(x), hw = hwOf(r); sp.push([clamp(x, cx - hw, cx + hw), Y0 - r]); }
    sp.forEach(([x, y]) => G.lineTo(x, y)); G.lineTo(cx + cup.wb, Y0 + 0.5); G.closePath(); G.clip();
    // 층마다 띠(왼쪽 밝게 · 오른쪽 그늘)
    for (let i = 0; i <= top; i++) {
      const ly = lay[i], ig = ING[ly.ing], y1 = i === top ? Y0 - h - 3 : Y0 - ly.h1, y0 = i === 0 ? Y0 + 1 : Y0 - ly.h0;
      const hw = hwOf((ly.h0 + ly.h1) / 2);
      G.fillStyle = lgH(G, cx - hw, cx + hw, [[0, ig.hi], [0.22, ig.c], [0.78, ig.c], [1, ig.c2]]); G.fillRect(cx - cup.wt - 2, y1 - 0.02, 2 * cup.wt + 4, y0 - y1 + 0.04);
      // 결(재료마다 작은 무늬)
      const n = Math.round((y0 - y1) * hw * 0.16);
      for (let t = 0; t < n; t++) {
        const a = hsh(t, i * 31 + 7) / 255, b = hsh(t * 3 + 1, i * 17 + 3) / 255, x = cx - hw + 1 + a * (2 * hw - 2), y = y1 + 0.6 + b * (y0 - y1 - 1.2);
        if (ly.ing === "ber") { if (t % 3 === 0) { ell(G, x, y, 0.32, 0.45); G.fillStyle = "#ffe08a"; G.fill(); } else { ell(G, x, y, 0.9, 0.6); G.fillStyle = "rgba(160,20,45,.35)"; G.fill(); } }
        else if (ly.ing === "mat") { ell(G, x, y, 0.7, 0.4); G.fillStyle = t % 2 ? "rgba(190,230,140,.45)" : "rgba(70,120,40,.3)"; G.fill(); }
        else if (ly.ing === "crm") { ell(G, x, y, 0.45, 0.45); G.fillStyle = "rgba(255,255,255,.8)"; G.fill(); }
        else if (ly.ing === "milk" && t % 2) { ell(G, x, y, 0.9, 0.35); G.fillStyle = "rgba(220,214,200,.35)"; G.fill(); }
        else if (ly.ing === "cho" || ly.ing === "shot") { ell(G, x, y, 0.8, 0.3); G.fillStyle = "rgba(20,8,2,.18)"; G.fill(); }
      }
      if (ly.ing === "shot") { G.fillStyle = lgV(G, Y0 - ly.h1, Y0 - ly.h1 + 2.4, [[0, "rgba(232,168,90,.95)"], [1, "rgba(192,122,54,0)"]]); G.fillRect(cx - cup.wt - 2, Y0 - ly.h1 - (i === top ? 3 : 0), 2 * cup.wt + 4, 2.4 + (i === top ? 3 : 0)); }
      if (ly.murk) for (let t = 0; t < 9; t++) { const a = hsh(t, i * 13 + 99) / 255, b = hsh(t + 9, i * 5 + 1) / 255; ell(G, cx - hw + a * 2 * hw, y1 + 1 + b * Math.max(1, y0 - y1 - 2), 1.6, 0.8); G.fillStyle = rgba(ly.murk, 0.6); G.fill(); }
    }
    // 층 경계: 섞였으면 넓게 번지고, 아니면 부드러운 한 줄
    for (let k = 1; k <= top; k++) {
      const b = Y0 - lay[k].h0, up = ING[lay[k].ing], dn = ING[lay[k - 1].ing], dirty = lay[k].mix || lay[k - 1].mix;
      if (dirty) {
        G.fillStyle = lgV(G, b - 4.5, b + 4.5, [[0, rgba(up.c, 0)], [0.35, rgba(mixC(up.c, dn.c), 0.85)], [0.65, rgba(mixC(up.c, dn.c), 0.85)], [1, rgba(dn.c, 0)]]); G.fillRect(cx - cup.wt - 2, b - 4.5, 2 * cup.wt + 4, 9);
        for (let t = 0; t < 10; t++) { const a = hsh(t, k * 11) / 255, c2 = hsh(t + 5, k * 3) / 255; ell(G, cx - cup.wt + a * 2 * cup.wt, b - 3.5 + c2 * 7, 1.3, 0.6, a * 2); G.fillStyle = rgba(t % 2 ? up.c : dn.c, 0.7); G.fill(); }
      } else { G.fillStyle = lgV(G, b - 0.8, b + 0.8, [[0, rgba(up.c, 0)], [0.5, rgba(mixC(up.c, dn.c), 0.75)], [1, rgba(dn.c, 0)]]); G.fillRect(cx - cup.wt - 2, b - 0.8, 2 * cup.wt + 4, 1.6); }
    }
    // 윗면 광택
    G.beginPath(); sp.forEach(([x, y], i) => (i ? G.lineTo(x, y + 0.45) : G.moveTo(x, y + 0.45))); G.lineWidth = 0.9; G.strokeStyle = foam ? "rgba(255,255,255,.95)" : rgba(ING[topIng].hi, 0.9); G.stroke();
    G.restore();
    // 크림 그늘(봉우리 아래)
    if (foam) { G.save(); inner(); G.clip(); G.fillStyle = "rgba(200,180,140,.18)"; for (let k = 0; k < 5; k++) { ell(G, cx - cup.wt + 3 + k * (2 * cup.wt - 6) / 4, Y0 - L + 1.2, 1.4, 0.5); G.fill(); } G.restore(); }
  }
  // 얼음(유리 속)
  G.save(); inner(); G.clip();
  for (const cb of cup.cubes) { const sub = L > cb.r + 5; cubeV(G, cx + cb.c, Y0 - cb.r - 6, 6, sub, ((hsh(cb.c + 20, cb.r) / 255) - 0.5) * 0.5); }
  G.restore();
  // 토핑 가루
  for (const d of cup.dots) { const x = cx + d.c + 0.5, r = surfR(x); if (L <= 0) continue; ell(G, x, Y0 - r - (d.o ? 0.7 : 0.1), 0.55, 0.45); G.fillStyle = d.col; G.fill(); }
  // 드리즐(시럽 줄)
  if (cup.drz.length && L > 0) {
    G.lineCap = "round"; G.lineJoin = "round"; G.lineWidth = 0.95;
    let prev = null;
    for (const d of cup.drz) {
      const x = cx + d.c + 0.5, y = Y0 - surfR(x) + d.o * 0.8 + 0.3;
      G.strokeStyle = d.col;
      if (prev && Math.abs(prev.c - d.c) < 9) { G.beginPath(); G.moveTo(prev.x, prev.y); G.quadraticCurveTo((prev.x + x) / 2, Math.min(prev.y, y) - 0.6, x, y); G.stroke(); }
      else { ell(G, x, y, 0.5, 0.5); G.fillStyle = d.col; G.fill(); }
      prev = { c: d.c, x, y };
    }
    for (const dp of cup.drips) { const hw = hwOf(Math.max(0, L - 1)), x = dp.side < 0 ? cx - hw + 0.5 : cx + hw - 0.5; G.strokeStyle = dp.col; G.beginPath(); G.moveTo(x, Y0 - L + 1); G.lineTo(x, Y0 - L + dp.len); G.stroke(); ell(G, x, Y0 - L + dp.len + 0.3, 0.6, 0.75); G.fillStyle = dp.col; G.fill(); }
  }
  // 빨대(줄무늬, 잠긴 곳은 비치게)
  if (cup.straw > 0) {
    const sx = cx + 4, ytop = Y0 - h - 12, ybot = ytop + (h + 8) * clamp(cup.straw, 0, 1);
    G.save(); G.translate(sx + 1, ytop); G.rotate(0.06);
    const len = ybot - ytop;
    for (let y = 0; y < len; y += 2) { const inL = ytop + y > Y0 - L; G.globalAlpha = inL ? 0.5 : 1; G.fillStyle = (y >> 1) & 1 ? "#ff5a6a" : "#ffffff"; G.fillRect(-1, y, 2, Math.min(2, len - y)); }
    G.globalAlpha = 1; G.fillStyle = "rgba(255,255,255,.5)"; G.fillRect(-0.8, 0, 0.5, len); G.fillStyle = "rgba(80,20,30,.25)"; G.fillRect(0.5, 0, 0.5, len);
    G.restore();
  }
  // 유리: 두께·테두리·바닥·광택
  const wt = cup.wt, wb = cup.wb;
  G.lineJoin = "round";
  G.beginPath(); G.moveTo(cx - wt - 1, Y0 - h - 0.5); G.lineTo(cx - wb - 1, Y0 + 1); G.moveTo(cx + wt + 1, Y0 - h - 0.5); G.lineTo(cx + wb + 1, Y0 + 1);
  G.lineWidth = 1.5; G.strokeStyle = "rgba(225,244,252,.75)"; G.stroke(); G.lineWidth = 0.45; G.strokeStyle = "rgba(42,60,78,.85)";
  G.beginPath(); G.moveTo(cx - wt - 1.8, Y0 - h - 0.5); G.lineTo(cx - wb - 1.8, Y0 + 1); G.moveTo(cx + wt + 1.8, Y0 - h - 0.5); G.lineTo(cx + wb + 1.8, Y0 + 1); G.stroke();
  // 입구 테(살짝 타원)
  ell(G, cx, Y0 - h - 0.5, wt + 1.8, 1.1); G.lineWidth = 0.5; G.strokeStyle = "rgba(42,60,78,.85)"; G.stroke(); ell(G, cx, Y0 - h - 0.4, wt + 1, 0.7); G.strokeStyle = "rgba(255,255,255,.9)"; G.lineWidth = 0.4; G.stroke();
  // 두꺼운 바닥
  rrect(G, cx - wb - 1.8, Y0 + 0.6, 2 * wb + 3.6, 4.2, 1.2); G.fillStyle = lgV(G, Y0, Y0 + 5, [[0, "rgba(235,250,255,.95)"], [0.5, "rgba(190,225,242,.9)"], [1, "rgba(140,190,215,.95)"]]); G.fill(); G.lineWidth = 0.45; G.strokeStyle = "rgba(42,60,78,.85)"; G.stroke();
  ell(G, cx - wb + 2.5, Y0 + 1.9, 2.2, 0.55); G.fillStyle = "rgba(255,255,255,.9)"; G.fill();
  // 세로 광택
  const hl = (r0, r1, off, w, a) => { G.beginPath(); G.moveTo(cx - hwOf(r0) + off, Y0 - r0); G.lineTo(cx - hwOf(r1) + off, Y0 - r1); G.lineWidth = w; G.strokeStyle = `rgba(255,255,255,${a})`; G.lineCap = "round"; G.stroke(); };
  hl(3, h - 4, 1.2, 1.1, 0.55); hl(h - 22, h - 12, 3.2, 0.6, 0.35);
  G.beginPath(); G.moveTo(cx + hwOf(2) - 1, Y0 - 2); G.lineTo(cx + hwOf(h - 2) - 1, Y0 - h + 2); G.lineWidth = 0.9; G.strokeStyle = "rgba(0,40,70,.12)"; G.stroke();
  // 넘친 줄기(컵 바깥)
  if (cup.spill > 0 && top >= 0) {
    const col = ING[lay[top].ing].c, len = Math.min(h + 4, cup.spill * 70);
    G.lineCap = "round"; G.lineWidth = 1.3; G.strokeStyle = col;
    for (const [s, k, f] of [[-1, 0, 1], [1, 1, 0.8], [-1, 2, 0.45]]) { const l2 = len * f, x0 = cx + s * (wt + 2 - k * 0.8); G.beginPath(); G.moveTo(x0, Y0 - h); G.bezierCurveTo(x0 + s * 0.8, Y0 - h + l2 * 0.4, x0 + s * 0.2, Y0 - h + l2 * 0.7, x0 + s * (0.6 - (wt - wb) * l2 / h * 0.2), Y0 - h + l2); G.stroke(); ell(G, x0 + s * 0.4, Y0 - h + l2 + 0.3, 0.9, 1.1); G.fillStyle = col; G.fill(); }
    if (len > h) { ell(G, cx, Y0 + 5.2, wt + 7, 1.8); G.fillStyle = rgba(col, 0.85); G.fill(); ell(G, cx - 4, Y0 + 4.8, 3, 0.5); G.fillStyle = "rgba(255,255,255,.4)"; G.fill(); }
  }
  G.restore();
}
const mixC = (a, b) => { const p = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round((v + B[i]) / 2).toString(16).padStart(2, "0")).join(""); };

// 재료 그릇 7종(14x16 칸 좌표, 주둥이 = ING.sp + 1)
const CONTV = {
  milk: (G) => {
    G.fillStyle = lgH(G, 3, 11, [[0, "#ffffff"], [0.55, "#eef0f6"], [1, "#c4c8d6"]]); G.fillRect(3, 5, 8, 10.4);
    fillP(G, [[3, 5], [4.6, 2.4], [9.4, 2.4], [11, 5]], "#e2e5ee"); fillP(G, [[3, 5], [4.6, 2.4], [6.6, 2.4], [5.4, 5]], "#f6f7fb");
    rrect(G, 4.4, 1.2, 5.2, 1.4, 0.4); G.fillStyle = "#d4d8e4"; G.fill();
    G.fillStyle = lgH(G, 3, 11, [[0, "#6aa0f0"], [1, "#2f64b8"]]); G.fillRect(3, 8.2, 8, 3.4);
    ell(G, 6.6, 9.9, 1.7, 1.1); G.fillStyle = "#ffffff"; G.fill(); ell(G, 6.6, 9.4, 0.8, 0.5); G.fillStyle = "#ffe08a"; G.fill();
    G.fillStyle = "rgba(255,255,255,.75)"; G.fillRect(3.6, 5.6, 0.9, 9);
    G.lineWidth = 0.4; G.strokeStyle = "rgba(40,50,70,.55)"; G.strokeRect(3, 5, 8, 10.4);
  },
  shot: (G) => {
    fillP(G, [[4, 4.6], [10, 4.6], [11, 15], [3.4, 15]], lgH(G, 3, 11, [[0, "#f2f5f8"], [0.4, "#c8d0d8"], [0.7, "#9aa4ae"], [1, "#dde3e8"]]));
    fillP(G, [[2.2, 4], [4.4, 4.4], [4.4, 5.6], [3, 5.2]], "#d8dee4");
    ell(G, 7, 4.7, 3, 0.9); G.fillStyle = "#4a2814"; G.fill(); ell(G, 6.4, 4.6, 1.6, 0.45); G.fillStyle = "#c8823a"; G.fill();
    G.beginPath(); G.moveTo(10.4, 6.2); G.bezierCurveTo(13.2, 6.4, 13.2, 11, 10.7, 11.2); G.lineWidth = 0.9; G.strokeStyle = "#7c8690"; G.stroke();
    G.fillStyle = "rgba(255,255,255,.8)"; G.fillRect(4.6, 6, 0.7, 7.6);
    G.lineWidth = 0.35; G.strokeStyle = "rgba(40,50,60,.55)"; G.beginPath(); G.moveTo(4, 4.6); G.lineTo(3.4, 15); G.lineTo(11, 15); G.lineTo(10, 4.6); G.stroke();
  },
  ber: (G) => {
    rrect(G, 3, 4.6, 9, 10.6, 1.6); G.fillStyle = lgH(G, 3, 12, [[0, "#ff8a9a"], [0.3, "#e0405a"], [1, "#a01e36"]]); G.fill();
    for (const [x, y] of [[5, 8], [8.5, 7], [6.5, 11.5], [9.5, 12], [5, 13]]) { ell(G, x, y, 1.2, 1); G.fillStyle = "#b8203c"; G.fill(); ell(G, x - 0.3, y - 0.3, 0.25, 0.3); G.fillStyle = "#ffe08a"; G.fill(); }
    rrect(G, 4.4, 8.6, 6.2, 2.8, 0.5); G.fillStyle = "#fff4e0"; G.fill(); G.fillStyle = "#e0405a"; G.fillRect(5.4, 9.7, 4.2, 0.6);
    rrect(G, 2.4, 2.4, 10.2, 2.6, 0.8); G.fillStyle = "#f4f4f4"; G.fill(); G.fillStyle = "#e23a4a"; for (let k = 0; k < 4; k++) G.fillRect(2.8 + k * 2.6, 2.4, 1.3, 2.6);
    G.fillStyle = "rgba(255,255,255,.55)"; G.fillRect(3.8, 5.6, 0.8, 8.4);
    rrect(G, 3, 4.6, 9, 10.6, 1.6); G.lineWidth = 0.35; G.strokeStyle = "rgba(60,10,20,.55)"; G.stroke();
  },
  cho: (G) => {
    rrect(G, 4, 5.2, 7, 10, 2); G.fillStyle = lgH(G, 4, 11, [[0, "#8a5a3a"], [0.35, "#5a3220"], [1, "#2e180c"]]); G.fill();
    rrect(G, 4.8, 8.4, 5.4, 3.4, 0.6); G.fillStyle = "#f2e6c8"; G.fill(); ell(G, 7.5, 10.1, 1.6, 0.9); G.fillStyle = "#5a3220"; G.fill();
    rrect(G, 4.6, 3.4, 5.8, 2.2, 0.7); G.fillStyle = "#e9c46a"; G.fill();
    fillP(G, [[6.8, 3.5], [8.2, 3.5], [7.9, 0.9], [7.1, 0.9]], "#e9c46a");
    G.fillStyle = "rgba(255,255,255,.4)"; G.fillRect(5, 6.4, 0.7, 7.6);
  },
  mat: (G) => {
    fillP(G, [[4, 4.6], [10, 4.6], [10.8, 15], [3.4, 15]], lgH(G, 3, 11, [[0, "#ffffff"], [0.5, "#eef0e8"], [1, "#c4c8bc"]]));
    fillP(G, [[2.2, 4], [4.4, 4.4], [4.4, 5.6], [3, 5.2]], "#eef0e8");
    ell(G, 7, 4.7, 3, 0.9); G.fillStyle = "#7fb04a"; G.fill(); ell(G, 6.3, 4.6, 1.4, 0.4); G.fillStyle = "#b0d880"; G.fill();
    G.fillStyle = "#7fb04a"; G.fillRect(3.6, 10.2, 7.1, 1.1);
    G.beginPath(); G.moveTo(10.3, 6.2); G.bezierCurveTo(13, 6.4, 13, 11, 10.6, 11.2); G.lineWidth = 0.9; G.strokeStyle = "#b8bcb0"; G.stroke();
    G.fillStyle = "rgba(255,255,255,.9)"; G.fillRect(4.6, 6, 0.7, 7.6);
    G.lineWidth = 0.35; G.strokeStyle = "rgba(50,60,40,.5)"; G.beginPath(); G.moveTo(4, 4.6); G.lineTo(3.4, 15); G.lineTo(10.8, 15); G.lineTo(10, 4.6); G.stroke();
  },
  crm: (G) => {
    rrect(G, 4.6, 5.6, 6, 9.6, 1.4); G.fillStyle = lgH(G, 4.6, 10.6, [[0, "#ffffff"], [0.35, "#dfe4ea"], [1, "#8a949e"]]); G.fill();
    G.fillStyle = "#e07aa0"; G.fillRect(4.6, 9.6, 6, 0.8); G.fillRect(4.6, 11.4, 6, 0.8);
    rrect(G, 5, 3.4, 5.2, 2.6, 0.8); G.fillStyle = "#4a525c"; G.fill();
    fillP(G, [[7, 3.5], [8.6, 3.5], [8.3, 1], [7.3, 1]], "#8a929c");
    G.lineWidth = 0.3; G.strokeStyle = "rgba(255,255,255,.7)"; G.beginPath(); G.moveTo(7.6, 1.2); G.lineTo(7.7, 3.3); G.stroke();
    G.fillStyle = "rgba(255,255,255,.9)"; G.fillRect(5.3, 6.4, 0.7, 8);
  },
  ice: (G) => {
    for (const [x, y, r] of [[2.6, 2.8, -0.2], [5.4, 2, 0.15], [8.2, 2.9, 0.3], [4, 4.4, 0.1], [7.2, 4.6, -0.2]]) cubeV(G, x, y, 3.3, false, r);
    fillP(G, [[1.4, 6.6], [12.6, 6.6], [11.6, 15], [2.4, 15]], lgH(G, 1, 13, [[0, "#f0f4f8"], [0.4, "#c4ced6"], [1, "#8a96a0"]]));
    rrect(G, 1, 6, 12, 1.2, 0.5); G.fillStyle = "#e8eef2"; G.fill();
    G.fillStyle = "rgba(255,255,255,.7)"; G.fillRect(2.6, 7.6, 0.8, 6.6); G.fillStyle = "rgba(60,80,95,.35)"; G.fillRect(3, 12.4, 8, 0.4);
  },
};
const drawCont = (G, id) => { G.save(); CONTV[id](G); G.restore(); };

// 집게(얼음)·뿌리개·시럽병
function drawTongs(G, x, y, open, cube) {
  G.save(); G.lineCap = "round";
  rrect(G, x - 2.6, y - 15.4, 5.2, 3, 1); G.fillStyle = lgV(G, y - 15.4, y - 12.4, [[0, "#6a727c"], [1, "#2a2e36"]]); G.fill();
  const s = 2 + open * 3;
  for (const [d, c] of [[-1, "#d4dce4"], [1, "#9aa2ac"]]) { G.beginPath(); G.moveTo(x + d * 1, y - 12.4); G.quadraticCurveTo(x + d * (1 + s * 0.3), y - 6, x + d * (1.3 + s), y - 1.4); G.lineWidth = 0.9; G.strokeStyle = c; G.stroke(); }
  const o = open * 3; for (const d of [-1, 1]) { rrect(G, x + d * (2.6 + o) - 1.1, y - 2.4, 2.2, 3.2, 0.8); G.fillStyle = "#e07aa0"; G.fill(); }
  if (cube) cubeV(G, x - 2.5, y - 3.2, 5, false, 0.1);
  G.restore();
}
function drawShaker(G, x, y, cols, sh) {
  x += sh; G.save();
  rrect(G, x - 4, y - 8, 8, 8.4, 1.6); G.fillStyle = lgH(G, x - 4, x + 4, [[0, "#ffffff"], [0.5, "#f2ead8"], [1, "#cfc4ac"]]); G.fill();
  G.fillStyle = cols[0]; G.fillRect(x - 4, y - 5, 8, 2.2); G.fillStyle = "rgba(255,255,255,.7)"; G.fillRect(x - 3.2, y - 7.2, 0.8, 6.4);
  fillP(G, [[x - 4.2, y], [x + 4.2, y], [x + 3.4, y + 4.2], [x - 3.4, y + 4.2]], lgH(G, x - 4, x + 4, [[0, "#e4e8ec"], [1, "#8a929c"]]));
  G.fillStyle = "#3a3a3a"; for (const dx of [-1.8, 0, 1.8]) { ell(G, x + dx, y + 3.2, 0.42, 0.42); G.fill(); }
  G.restore();
}
function drawSyrup(G, x, y, col, sh) {
  x += sh; G.save();
  rrect(G, x - 4, y - 11, 8, 11.4, 2); G.fillStyle = lgH(G, x - 4, x + 4, [[0, shade(col, 1.35)], [0.35, col], [1, shade(col, 0.6)]]); G.fill();
  rrect(G, x - 2.8, y - 7.6, 5.6, 3.2, 0.6); G.fillStyle = "#f2e6c8"; G.fill(); G.fillStyle = col; G.fillRect(x - 1.6, y - 6.3, 3.2, 0.7);
  G.fillStyle = "rgba(255,255,255,.4)"; G.fillRect(x - 3, y - 10, 0.7, 9);
  rrect(G, x - 3.2, y - 0.2, 6.4, 2.2, 0.6); G.fillStyle = "#e9c46a"; G.fill();
  fillP(G, [[x - 1.2, y + 2], [x + 1.2, y + 2], [x + 0.5, y + 4.4], [x - 0.5, y + 4.4]], "#e9c46a");
  G.restore();
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

// 바탕: 벽은 실제 무인카페 그림(흐리고 어둡게) + 가랜드·조명 벡터 / 카운터 앞판 / 재료 선반
const BGI = { ok: false, im: null };
function bgCanvas(H, CTOP, PY, KS) {
  const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(H * KS); const g = c.getContext("2d");
  g.setTransform(KS, 0, 0, KS, 0, 0);
  if (BGI.ok) {
    const im = BGI.im, iw = im.naturalWidth, ih = im.naturalHeight, a = W / CTOP;
    let sh = ih * 0.8, sw = sh * a; if (sw > iw) { sw = iw; sh = sw / a; }
    const sx = clamp(iw * 0.47 - sw / 2, 0, iw - sw);
    g.save(); g.filter = `blur(${(0.5 * KS).toFixed(1)}px) brightness(.8) saturate(1.08)`; g.drawImage(im, sx, 0, sw, sh, -1, -1, W + 2, CTOP + 2); g.restore();
    g.fillStyle = lgV(g, 0, CTOP, [[0, "rgba(40,20,10,.25)"], [0.55, "rgba(40,20,10,.05)"], [1, "rgba(30,15,8,.4)"]]); g.fillRect(0, 0, W, CTOP);
  } else {
    g.fillStyle = lgV(g, 0, CTOP, [[0, "#f7e6da"], [1, "#e8d2c2"]]); g.fillRect(0, 0, W, CTOP);
    g.fillStyle = "rgba(200,170,150,.25)"; for (let x = 4; x < W; x += 10) g.fillRect(x, 2, 0.6, CTOP);
  }
  // 가랜드(삼각 깃발)
  const FC = ["#ff8aa8", "#7fd0b0", "#ffd166", "#8ab8ff"], gy = (x) => 18 + 4 * Math.sin(Math.PI * x / 104);
  g.beginPath(); for (let x = 0; x <= 104; x += 2) (x ? g.lineTo(x, gy(x)) : g.moveTo(x, gy(x))); g.lineWidth = 0.5; g.strokeStyle = "#7a5a4a"; g.stroke();
  for (let k = 0; k < 11; k++) { const x = 3 + k * 9, y = gy(x + 2.5), col = FC[k % 4]; fillP(g, [[x, y], [x + 5.4, y + 0.2], [x + 2.6, y + 6.4]], col); fillP(g, [[x, y], [x + 5.4, y + 0.2], [x + 4.6, y + 1.4], [x + 0.6, y + 1.2]], "rgba(255,255,255,.45)"); fillP(g, [[x + 2.7, y + 0.2], [x + 5.4, y + 0.2], [x + 2.6, y + 6.4]], "rgba(0,0,0,.08)"); }
  // 펜던트 조명
  g.fillStyle = "#3a2e26"; g.fillRect(92.3, 0, 0.5, 8.4);
  const lg = g.createRadialGradient(92.5, 13, 0.5, 92.5, 20, 24); lg.addColorStop(0, "rgba(255,236,170,.5)"); lg.addColorStop(1, "rgba(255,236,170,0)"); g.fillStyle = lg; g.fillRect(66, 8, 54, 40);
  g.beginPath(); g.moveTo(88, 12.6); g.quadraticCurveTo(88.6, 7.4, 92.5, 7.6); g.quadraticCurveTo(96.4, 7.4, 97, 12.6); g.closePath(); g.fillStyle = lgH(g, 88, 97, [[0, "#4a806c"], [0.5, "#2f5a4a"], [1, "#1c3a2e"]]); g.fill();
  ell(g, 92.5, 12.6, 4.5, 0.9); g.fillStyle = "#fff2b0"; g.fill();
  // 바닥 선반(재료 칸 바탕)
  g.fillStyle = lgV(g, PY, H, [[0, "#4a3426"], [1, "#22170f"]]); g.fillRect(0, PY, W, H - PY);
  g.fillStyle = lgV(g, PY, PY + 2.4, [[0, "#8a6646"], [1, "#4e3826"]]); g.fillRect(0, PY, W, 2.4); g.fillStyle = "rgba(255,230,190,.35)"; g.fillRect(0, PY, W, 0.4);
  return c;
}
function counterCanvas(H, CTOP, PY, KS) {
  const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(H * KS); const g = c.getContext("2d");
  g.setTransform(KS, 0, 0, KS, 0, 0);
  // 앞판 나무 살
  g.fillStyle = lgV(g, CTOP + 6, PY, [[0, "#c88c62"], [1, "#8a5534"]]); g.fillRect(0, CTOP + 6, W, PY - CTOP - 6);
  for (let x = 0; x < W; x += 5) { g.fillStyle = lgH(g, x, x + 5, [[0, "rgba(255,220,180,.16)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(60,25,10,.22)"]]); g.fillRect(x, CTOP + 7, 5, PY - CTOP - 7); }
  g.fillStyle = "rgba(60,30,15,.35)"; g.fillRect(0, CTOP + 6, W, 1.4);
  // 대리석 상판
  g.fillStyle = lgV(g, CTOP, CTOP + 6, [[0, "#ffffff"], [0.6, "#f0ece6"], [1, "#cfc6ba"]]); g.fillRect(0, CTOP, W, 6);
  g.lineWidth = 0.3; for (let k = 0; k < 9; k++) { const x = (k * 37) % W; g.beginPath(); g.moveTo(x, CTOP + 0.6); g.bezierCurveTo(x + 6, CTOP + 2.5, x + 9, CTOP + 1.2, x + 16, CTOP + 4.6); g.strokeStyle = k % 2 ? "rgba(150,140,130,.35)" : "rgba(180,170,160,.25)"; g.stroke(); }
  g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(0, CTOP, W, 0.45); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, CTOP + 4.6, W, 0.4);
  // 아래 조명 줄
  for (let x = 6; x < W; x += 8) { const q = g.createRadialGradient(x + 1, PY - 1.6, 0.2, x + 1, PY - 1.6, 3); q.addColorStop(0, (x / 8) % 2 ? "rgba(255,209,220,.9)" : "rgba(255,242,176,.9)"); q.addColorStop(1, "rgba(255,230,200,0)"); g.fillStyle = q; g.fillRect(x - 2, PY - 4.6, 6, 6); }
  return c;
}

// 도트 손가락(할 일 안내). down=true 면 위에서 아래로 가리킨다
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
// 그릇 기울여 그리기(주둥이를 (sx, sy)에 맞춘다) — 벡터 회전
function drawPitcher(G, id, sx, sy, tilt, alpha) {
  const ig = ING[id], ang = ig.ang, u = ig.sp[0] + 1 - 7, v = ig.sp[1] + 1 - 8;
  const px = sx - (u * Math.cos(ang) - v * Math.sin(ang)), py = sy - (u * Math.sin(ang) + v * Math.cos(ang));
  G.save(); G.globalAlpha *= alpha; G.translate(px, py); G.rotate(ang * tilt); G.translate(-7, -8); drawCont(G, id); G.restore();
}

export const GAME = {
  key: "ucafe3", base: "ucafe", n: "사장님은 연구 중", desc: "시음회 날! 층층이 예쁜 신메뉴를 정확히 쌓아요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 주문 카드에 층층이 쌓인 음료 그림과 <b>순서</b>가 나와요.",
    "아래 재료 버튼을 <b>꾹 누르고 있는 동안</b> 컵에 부어져요. 컵 옆 <b>노란 눈금선</b>에서 손을 떼요. 공중에 남은 줄기도 마저 떨어지니 <b>살짝 일찍</b>! 넘치거나 순서가 틀리면 층이 섞여요.",
    "<b>얼음</b>은 집게가 컵 위에 올 때 톡, <b>토핑·시럽</b>은 컵 위를 손가락으로 쓱쓱. 잔이 커질수록 층이 많아지고, 다 만들면 손님이 마셔 보고 반응해요.",
  ],
  steps: () => {
    try {
      const SC = 4, mk = (fn) => { const c = document.createElement("canvas"); c.width = 36 * SC; c.height = 60 * SC; const g = c.getContext("2d"); g.setTransform(SC, 0, 0, SC, 0, 0); fn(g); return `<img src="${c.toDataURL()}" alt="" style="height:60px;width:auto">`; };
      const base = { h: 38, wb: 9, wt: 11, lay: [], level: 0, cubes: [], dots: [], drz: [], drips: [], amp: 0, spill: 0, straw: 0 };
      // ① 꾹 누르고 눈금에서
      const s1 = mk((g) => {
        drawCup(g, { ...base, lay: [{ ing: "ber", h0: 0, h1: 10 }, { ing: "milk", h0: 10, h1: 22 }], level: 22 }, 14, 52, 0, false);
        g.setLineDash([1.2, 1]); g.strokeStyle = "#ffd23f"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(4, 25.5); g.lineTo(26, 25.5); g.stroke(); g.setLineDash([]);
        fillP(g, [[26.5, 25.5], [29.5, 22.8], [29.5, 28.2]], "#ffd23f"); g.fillStyle = "#ffd23f"; g.fillRect(29.4, 24.4, 3, 2.2);
        g.fillStyle = lgH(g, 15, 17, [[0, "#ffffff"], [1, "#e6dfd0"]]); rrect(g, 15, 7, 1.8, 25, 0.9); g.fill();
        drawPitcher(g, "milk", 15.6, 6.5, 1, 1);
      });
      // ② 집게가 컵 위일 때 톡
      const s2 = mk((g) => {
        drawCup(g, { ...base, lay: [{ ing: "milk", h0: 0, h1: 18 }], level: 18, cubes: [{ c: -7, r: 0 }, { c: 1, r: 0 }] }, 14, 52, 0, false);
        drawTongs(g, 14, 13, 0, 1);
        g.strokeStyle = "#3fe07a"; g.lineWidth = 0.9; g.lineCap = "round"; g.beginPath(); g.moveTo(12.6, 17.6); g.lineTo(14.2, 19.4); g.lineTo(16, 17.6); g.stroke();
        g.strokeStyle = "#9aa2ac"; g.lineWidth = 0.6; for (const [x, d] of [[3, -1], [26, 1]]) { g.beginPath(); g.arc(x + d * 1.2, 6.5, 2.2, d < 0 ? 0.6 : Math.PI + 0.6, d < 0 ? Math.PI - 0.6 : TAU - 0.6, true); g.stroke(); }
      });
      // ③ 컵 위를 쓱쓱
      const s3 = mk((g) => {
        const dots = []; for (let k = 0; k < 30; k++) dots.push({ c: rint(20) - 10, o: rint(2), col: pick(TOP.coc.c) });
        drawCup(g, { ...base, lay: [{ ing: "milk", h0: 0, h1: 14 }, { ing: "shot", h0: 14, h1: 24 }, { ing: "crm", h0: 24, h1: 32 }], level: 32, dots }, 14, 52, 0, false);
        drawShaker(g, 19, 9, TOP.coc.c, 0);
        for (const [x, y] of [[17, 15], [20, 17.5], [18, 19.5], [21.4, 14.6]]) { ell(g, x, y, 0.5, 0.5); g.fillStyle = "#6a3a20"; g.fill(); }
        g.strokeStyle = "#ffd23f"; g.lineWidth = 0.7; g.lineCap = "round"; for (const [x, d] of [[6, -1], [30, 1]]) { g.beginPath(); g.moveTo(x, 4.5); g.quadraticCurveTo(x + d * 2, 4.2, x + d * 3.4, 6); g.stroke(); }
      });
      return [[s1, "꾹~ 눈금에서 떼기"], [s2, "컵 위일 때 얼음"], [s3, "쓱쓱 토핑"]];
    } catch (e) { return [["", "꾹~ 눈금에서 떼기"], ["", "컵 위일 때 얼음"], ["", "쓱쓱 토핑"]]; }
  },
  css: `
.mg-ucafe3 .mg-u3st{background:#1e1612!important;display:flex;align-items:center;justify-content:center}
.mg-ucafe3 .mg-logo b{font-size:26px}
.mg-ucafe3 .u3w{position:relative;flex:0 0 auto}
.mg-ucafe3 .u3w canvas{width:100%;height:100%;display:block;touch-action:none;cursor:pointer}
.mg-ucafe3 .u3sign{position:absolute;pointer-events:none;background:linear-gradient(#3a6e5a,#2a5040);color:#fff6e0;font-weight:900;font-size:11px;letter-spacing:.5px;border:2px solid #1c3a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;white-space:nowrap;box-shadow:0 2px 0 #0004}
.mg-ucafe3 .u3sign i{font-style:normal;color:#ffd166;margin-right:4px;font-size:11px}
.mg-ucafe3 .u3card{position:absolute;pointer-events:none;z-index:3}
.mg-ucafe3 .u3card .t{position:absolute;left:0;right:0;text-align:center;font-weight:900;font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;letter-spacing:-.4px;text-shadow:0 1px 0 #0003}
.mg-ucafe3 .u3card ol{list-style:none;margin:0;padding:0;position:absolute}
.mg-ucafe3 .u3card li{font-size:11px;font-weight:700;color:#6a5646;white-space:nowrap;display:flex;align-items:center;gap:2px;letter-spacing:-.5px;overflow:hidden}
.mg-ucafe3 .u3card li i{font-style:normal;display:inline-block;width:14px;height:14px;border-radius:50%;background:#cdbca4;color:#fff;font-size:11px;line-height:14px;text-align:center;flex:0 0 auto;font-weight:900}
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
.mg-ucafe3 .u3tc em{font-style:normal;display:inline-block;background:#e8476a;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
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
.mg-ucafe3 .u3post .pic img{height:146px;width:auto;filter:drop-shadow(0 4px 4px #0003)}
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
  const F = frame(host, "ucafe3", "사장님은 연구 중", "mg-u3st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="u3w"><canvas width="${W}" height="200"></canvas><div class="u3sign"><i>NEW</i>신메뉴 시음회</div><div class="u3card"><b class="t"></b><ol></ol></div><div class="u3rv"></div><div class="mg-bubs"></div><div class="u3lb"></div><div class="u3go"><span></span><i></i></div><div class="u3tut"><div class="u3tc"><em>리허설</em><p></p><div class="u3tb"></div></div></div><div class="u3dim"></div></div>`);
  const wrap = F.stage.querySelector(".u3w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d");
  const signEl = wrap.querySelector(".u3sign"), cardEl = wrap.querySelector(".u3card"), cardT = cardEl.querySelector(".t"), cardL = cardEl.querySelector("ol"), rvEl = wrap.querySelector(".u3rv");
  const lbEl = wrap.querySelector(".u3lb"), goEl = wrap.querySelector(".u3go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".u3tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".u3tb"), dim = wrap.querySelector(".u3dim");
  const comboEl = F.root.querySelector(".mg-combo");
  let K = 2, KS = 2, H = 200, PY = 150, CTOP = 132, Y0 = 134, cardY = 4, ZF = 1, WF = 1;
  const DPR = DPR0();
  const CX = 58;
  const fit = () => {
    const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 200);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 260);
    PY = H - 50; CTOP = PY - 18; Y0 = CTOP + 2; cardY = Math.max(4, CTOP - 134); const kk = clamp((H - 200) / 60, 0, 1); ZF = 1 + 0.24 * kk; WF = 1 + 0.16 * kk;
    KS = K * DPR; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  let BG = bgCanvas(H, CTOP, PY, KS);
  const CNT = counterCanvas(H, CTOP, PY, KS);
  // 벽 그림(무인카페) — 받으면 바탕을 다시 만든다
  if (!BGI.im) { BGI.im = new Image(); BGI.im.onload = () => { BGI.ok = true; if (cv.isConnected) BG = bgCanvas(H, CTOP, PY, KS); }; BGI.im.src = "img/bg/ucafe.webp"; }
  else if (!BGI.ok) BGI.im.addEventListener("load", () => { if (cv.isConnected) BG = bgCanvas(H, CTOP, PY, KS); });
  // 손님 그림(표정 시트 3x2): 줄 선 손님 반신 + 시음 반응 얼굴
  const ART = {};
  const artOf = (k) => { if (!ART[k]) { const q = { ok: false, im: new Image() }; q.im.onload = () => (q.ok = true); q.im.src = "img/body/" + k + ".webp"; ART[k] = q; } return ART[k]; };
  const CPOOL = shuffle(["c001", "c002", "c008", "c009", "c010", "c012", "c022", "c024", "c034", "c039", "c042", "c047", "c051", "c053", "c054", "c055", "c057", "c060", "c068", "c069", "c072", "c074", "c079", "c084", "c098", "c103", "c105"]);
  CPOOL.slice(0, 7).forEach(artOf);
  let cpi = 0;
  const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  const scr = document.createElement("canvas"), sg = scr.getContext("2d");
  // 사람 그림 한 장(아래는 흐리게 사라짐). 바닥 가운데 (cx, by), 높이 hh
  const body = (a, ex, cx, by, hh, o = {}) => {
    if (!a || !a.ok) return false;
    const ww = hh * 240 / 312, dw = Math.max(2, Math.ceil(ww * KS)), dh = Math.max(2, Math.ceil(hh * KS)), e = EXI[ex] || 0;
    if (scr.width < dw || scr.height < dh) { scr.width = Math.max(scr.width, dw); scr.height = Math.max(scr.height, dh); }
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, dw + 2, dh + 2);
    sg.drawImage(a.im, (e % 3) * 240, e >= 3 ? 540 : 0, 240, 312, 0, 0, dw, dh);
    sg.globalCompositeOperation = "destination-out"; const q = sg.createLinearGradient(0, dh * 0.72, 0, dh); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,1)"); sg.fillStyle = q; sg.fillRect(0, dh * 0.72 - 1, dw + 2, dh * 0.28 + 2); sg.globalCompositeOperation = "source-over";
    g.save(); if (o.a != null) g.globalAlpha *= o.a;
    g.translate(cx, by); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
    g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 2 * KS; g.shadowOffsetY = 0.6 * KS;
    g.drawImage(scr, 0, 0, dw, dh, -ww / 2, -hh, ww, hh); g.restore();
    return true;
  };
  // 얼굴만 네모 칸에(시음 반응 패널)
  const face = (a, ex, x, y, s) => {
    if (!a || !a.ok) return false; const e = EXI[ex] || 0;
    g.save(); rrect(g, x, y, s, s, 2.4); g.clip(); g.drawImage(a.im, (e % 3) * 240 + 42, (e >= 3 ? 540 : 0) + 6, 156, 156, x, y, s, s); g.restore(); return true;
  };
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const PX = (v) => v * K + "px";
  // 글자 자리
  Object.assign(signEl.style, { left: PX(3), top: PX(4), width: PX(58), height: PX(11) });
  Object.assign(cardEl.style, { left: PX(103), top: PX(cardY), width: PX(55), height: PX(62) });
  Object.assign(cardT.style, { top: PX(2), height: PX(9), lineHeight: PX(9) });
  Object.assign(cardL.style, { left: PX(17), top: PX(13), width: PX(37) });
  const panX = 98, panY = () => cardY + 8;
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
  const mkPerson = (x) => { const key = CPOOL[cpi++ % CPOOL.length]; artOf(key); artOf(CPOOL[(cpi + 2) % CPOOL.length]); return { spec: uSpec(pick(["student", "worker", "plain", "teen", "elder", "student", "worker"])), cache: {}, key, x, tx: x, walkT: 0, look: 0, lookT: rnd() * 3 }; };
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

  // ── 그리기(장면 좌표 벡터, 기기 해상도) ──
  const REX = { love: "smile", good: "smile", meh: "sad", bad: "angry" };
  const drawMini = (x, y) => {
    // 주문 카드 속 작은 컵(층 비율 그대로)
    const mh = 40, mw = 10, sc = mh / cup.h, by = y + mh;
    rrect(g, x - 1, y - 1, mw + 2, mh + 3, 1.6); g.fillStyle = "rgba(42,54,68,.85)"; g.fill();
    rrect(g, x - 0.35, y - 0.35, mw + 0.7, mh + 1.7, 1.1); g.fillStyle = "#eef8fc"; g.fill();
    g.save(); rrect(g, x, y, mw, mh + 1, 0.9); g.clip();
    let prev = 0, mark = null;
    cup.steps.forEach((s, i) => {
      if (s.t === "pour") {
        const y1 = by - s.tg * sc, y0 = by - prev * sc, ig = ING[s.ing];
        g.fillStyle = lgH(g, x, x + mw, [[0, ig.hi], [0.25, ig.c], [0.8, ig.c], [1, ig.c2]]); g.fillRect(x, y1, mw, y0 - y1 + 0.05);
        g.fillStyle = rgba(ig.hi, 0.9); g.fillRect(x, y1, mw, 0.5);
        if (s.ing === "crm") { g.fillStyle = "#fbf4e2"; for (let k = 0; k < 5; k++) { ell(g, x + 1 + k * 2, y1, 1.1, 0.8); g.fill(); } }
        if (i === cup.si) mark = y1;
        prev = s.tg;
      }
    });
    cup.steps.forEach((s) => { if (s.t === "ice") for (let k = 0; k < s.n; k++) cubeV(g, x + 1 + (k % 2) * 4.4, by - 4.4 - Math.floor(k / 2) * 4, 3.4, false, (k % 3 - 1) * 0.2); });
    const tp = cup.steps.find((s) => s.t === "top" || s.t === "drz");
    if (tp) {
      const ty = by - prev * sc - 0.5, cs = TOP[tp.k].c;
      if (tp.t === "drz") { g.beginPath(); for (let k = 0; k <= mw; k += 1) g.lineTo(x + k, ty + (k % 2 ? 0.7 : -0.2)); g.lineWidth = 0.7; g.strokeStyle = cs[0]; g.stroke(); }
      else for (let k = 0; k < 14; k++) { ell(g, x + 0.6 + (hsh(k, 5) / 255) * (mw - 1.2), ty + (hsh(k, 9) & 1) * 0.5, 0.45, 0.4); g.fillStyle = cs[k % cs.length]; g.fill(); }
    }
    g.restore();
    g.fillStyle = "rgba(255,255,255,.65)"; g.fillRect(x + 1, y + 2, 0.7, mh - 4);
    for (let yy = y - 6; yy < y + 1; yy += 1.4) { g.fillStyle = Math.round((yy - y) / 1.4) % 2 ? "#ffffff" : "#ff5a6a"; g.fillRect(x + 6, yy, 1, 1.4); }
    if (mark != null && Math.floor(clk * 4) % 2) { fillP(g, [[x - 1, mark], [x - 3.4, mark - 1.4], [x - 3.4, mark + 1.4]], "#e8473a"); fillP(g, [[x + mw + 1, mark], [x + mw + 3.4, mark - 1.4], [x + mw + 3.4, mark + 1.4]], "#e8473a"); }
  };
  const drawCard = () => {
    const x = 103 + cardOX, y = cardY;
    if (srv && phT >= 0.3) return;
    g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 3 * KS; g.shadowOffsetY = 1 * KS; rrect(g, x, y, 55, 62, 3); g.fillStyle = "#fffaf0"; g.fill(); g.restore();
    const hc = cup && cup.size === "L" ? "#e8476a" : cup && cup.size === "M" ? "#e8904a" : "#4aa07a";
    g.save(); rrect(g, x, y, 55, 62, 3); g.clip(); g.fillStyle = lgV(g, y, y + 11, [[0, shade(hc, 1.15)], [1, shade(hc, 0.88)]]); g.fillRect(x, y, 55, 11); g.restore();
    g.setLineDash([1.6, 1.2]); g.strokeStyle = "#e0d0b8"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x + 2, y + 11.8); g.lineTo(x + 53, y + 11.8); g.stroke(); g.setLineDash([]);
    rrect(g, x, y, 55, 62, 3); g.lineWidth = 0.5; g.strokeStyle = "rgba(42,30,24,.55)"; g.stroke();
    ell(g, x + 27.5, y + 0.4, 1.9, 1.9); g.fillStyle = lgV(g, y - 1.5, y + 2.3, [[0, "#ff7a7a"], [1, "#b81a2a"]]); g.fill(); ell(g, x + 27, y - 0.2, 0.6, 0.5); g.fillStyle = "#ffd0d0"; g.fill();
    if (cup) drawMini(x + 4, y + 16);
    cardEl.style.transform = cardOX ? `translateX(${PX(cardOX)})` : "";
  };
  const drawQueue = (tm) => {
    for (let i = queue.length - 1; i >= 0; i--) {
      const p = queue[i], moving = Math.abs(p.tx - p.x) > 0.5, front = i === 0 && !p.leave && !moving;
      let ex = p.look > 0 && !moving ? "smile" : "neutral";
      if (front && phase === "fail") ex = "surprised";
      else if (front && srv && phase === "serve") ex = phT < 0.8 ? "blush" : cup && cup.ovf ? "surprised" : REX[srv.ex] || "neutral";
      const bob = moving ? -Math.abs(Math.sin(p.walkT * Math.PI / 2)) * 1.3 : Math.sin(tm * 1.6 + i * 1.7) * 0.3;
      const lean = front && srv && phase === "serve" && phT < 0.8 ? -0.05 : 0;
      if (body(ART[p.key], ex, p.x, CTOP + 11 + bob, front ? 50 : 45, { rot: lean })) continue;
      // 그림을 못 받았을 때만 도트
      let key, o, flip = false;
      if (moving) { const f = Math.floor(p.walkT) % 4; key = "w" + f; o = { v: "s", f }; flip = p.tx < p.x; }
      else if (i === 0 && !p.leave) { const sip = srv && phase === "serve" && phT > 0.35; key = "t" + (sip ? 1 : 0); o = { v: "s", f: 0, carry: sip ? 1 : 0 }; flip = true; }
      else { key = "i" + p.look; o = { v: "f", f: 0, look: p.look }; }
      const c = uSprite(p, key + (flip ? "l" : ""), o, flip);
      g.drawImage(c, Math.round(p.x - 8), CTOP - 22 + (i === 0 && !moving ? 0 : 1));
    }
  };
  const drawTicks = (tm) => {
    const cx = cxNow();
    cup.steps.forEach((s, i) => {
      if (s.t !== "pour") return;
      const r = s.tg, y = Y0 - r, hw = hwAt(r), x = cx + hw + 3;
      if (i < cup.si) { rrect(g, x, y - 0.4, 2.4, 0.8, 0.4); g.fillStyle = "rgba(80,60,40,.45)"; g.fill(); return; }
      if (i > cup.si) { rrect(g, x, y - 0.5, 3.2, 1, 0.5); g.fillStyle = "#ffffff"; g.fill(); g.lineWidth = 0.25; g.strokeStyle = "rgba(0,0,0,.3)"; g.stroke(); return; }
      const b = Math.floor(tm * 5) % 2;
      g.setLineDash([1, 1]); g.lineDashOffset = b ? 1 : 0; g.beginPath(); g.moveTo(cx - hw, y); g.lineTo(cx + hw, y); g.lineWidth = 0.6; g.strokeStyle = "rgba(255,214,40,.95)"; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      rrect(g, x - 1, y - 0.65, 5, 1.3, 0.6); g.fillStyle = "#ffd23f"; g.fill(); g.lineWidth = 0.3; g.strokeStyle = "#8a6a10"; g.stroke();
      const ax = x + 5 + (b ? 0 : 1);
      g.beginPath(); g.moveTo(ax, y); g.lineTo(ax + 3, y - 2.6); g.lineTo(ax + 3, y - 1.1); g.lineTo(ax + 6, y - 1.1); g.lineTo(ax + 6, y + 1.1); g.lineTo(ax + 3, y + 1.1); g.lineTo(ax + 3, y + 2.6); g.closePath();
      g.fillStyle = lgV(g, y - 2.6, y + 2.6, [[0, "#fff09a"], [1, "#f0b820"]]); g.fill(); g.lineWidth = 0.35; g.strokeStyle = "#8a6a10"; g.stroke();
    });
  };
  const drawPanel = (tm) => {
    const show = srv && phT >= 0.3, vis = show ? "hidden" : "";
    if (cardEl.style.visibility !== vis) cardEl.style.visibility = vis;
    if (!show) return;
    const t = Math.min(1, (phT - 0.3) / 0.18), px = panX + (1 - t) * 70, py = panY();
    g.save(); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 3 * KS; g.shadowOffsetY = 1 * KS; rrect(g, px, py, 60, 44, 4); g.fillStyle = "#fffdf6"; g.fill(); g.restore();
    rrect(g, px, py, 60, 44, 4); g.lineWidth = 0.6; g.strokeStyle = "#3a2418"; g.stroke();
    const bad = srv.ex === "bad" && phT > 0.8;
    rrect(g, px + 3, py + 3, 26, 26, 2.4); g.fillStyle = lgV(g, py + 3, py + 29, bad ? [[0, "#eef1f8"], [1, "#cfd6ea"]] : [[0, "#fff0f4"], [1, "#ffcfdd"]]); g.fill();
    const ex = phT < 0.8 ? "blush" : cup && cup.ovf ? "surprised" : REX[srv.ex] || "neutral";
    if (!face(ART[queue[0].key], ex, px + 3, py + 3, 26)) drawFace(P, queue[0].spec, px + 4, py + 4, phT < 0.8 ? "sip" : srv.ex, tm);
    rrect(g, px + 3, py + 3, 26, 26, 2.4); g.lineWidth = 0.4; g.strokeStyle = "rgba(58,36,24,.5)"; g.stroke();
    for (let k = 0; k < 3; k++) { const on = phT > 0.85 + k * 0.1 && k < srv.stars, pop = on ? 1 + Math.max(0, 0.35 - (phT - 0.85 - k * 0.1)) : 1; starV(g, px + 35.5 + k * 8.4, py + 9.5, 3.3 * pop, on); }
    if (phT > 0.8 && srv.ex === "love") for (let k = 0; k < 3; k++) { const ph = (tm * 0.9 + k / 3) % 1; g.globalAlpha = 1 - ph; heartV(g, px + 36 + k * 7, py + 27 - ph * 10, 1.6, "#ff4a7a"); g.globalAlpha = 1; }
    if (phT < 0.8) for (let k = 0; k < 3; k++) { ell(g, px + 37 + k * 6, py + 21, 0.9, 0.9); g.fillStyle = Math.floor(tm * 6) % 3 === k ? "#8a7a68" : "#d8ccb8"; g.fill(); }
  };
  const drawSlots = (tm) => {
    const st = phase === "make" ? curStep() : null;
    BTN.forEach((id, i) => {
      const x0 = 3 + i * 22, on = pressed === i, need = st && ((st.t === "pour" && st.ing === id) || (st.t === "ice" && id === "ice"));
      const hint = need && (tut >= 0 || (done === 0 && cupN <= 1));
      rrect(g, x0 + 0.3, PY + 4, 20.4, 31, 2.6); g.fillStyle = lgV(g, PY + 4, PY + 35, on ? [[0, "#1e140d"], [1, "#3a2a1e"]] : [[0, "#6e5440"], [1, "#3c2b1e"]]); g.fill();
      if (!on) { rrect(g, x0 + 1, PY + 4.6, 19, 1, 0.5); g.fillStyle = "rgba(255,230,190,.22)"; g.fill(); }
      if (hint && Math.floor(tm * 4) % 2) { g.save(); g.shadowColor = "#ffd23f"; g.shadowBlur = 3 * KS; rrect(g, x0 + 0.6, PY + 4.3, 19.8, 30.4, 2.4); g.lineWidth = 0.9; g.strokeStyle = "#ffd23f"; g.stroke(); g.restore(); }
      const lift = on ? 1 : 0;
      ell(g, x0 + 10.5, PY + 29.6, 6.6, 1.3); g.fillStyle = "rgba(0,0,0,.4)"; g.fill();
      g.save(); g.translate(x0 + 10.5, PY + 20 + lift); g.scale(1.22, 1.22); g.translate(-7, -8); drawCont(g, id); g.restore();
      const cls = on ? "on" : hint ? "nx" : ""; if (lbs[i].className !== cls) lbs[i].className = cls;
    });
  };
  const render = (tm) => {
    g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = true; g.clearRect(0, 0, W, H);
    g.drawImage(BG, 0, 0, W, H);
    // 조명 아래 먼지
    for (let k = 0; k < 3; k++) { const ph = (tm * 0.25 + k / 3) % 1; ell(g, 84.5 + k * 5 + Math.sin(tm + k) * 2, 14.5 + ph * 20, 0.45, 0.45); g.fillStyle = `rgba(255,250,210,${0.6 * Math.sin(ph * Math.PI)})`; g.fill(); }
    drawQueue(tm);
    g.drawImage(CNT, 0, 0, W, H);
    for (const c of crumbs) { ell(g, c.x + 0.5, c.y + 0.5, 0.55, 0.45); g.fillStyle = c.c; g.fill(); }
    if (cup) {
      const cx = cxNow();
      drawCup(g, cup, cx, Y0, tm, true);
      if (phase === "make" || phase === "in") drawTicks(tm);
      const st = curStep();
      // 집게
      if (phase === "make" && st && st.t === "ice") {
        const tx = cx + (cup.wt + 8) * Math.sin(tong.ph), ok = Math.abs(tx - cx) <= cup.wt - 4;
        if (ok && tong.cd <= 0) { g.beginPath(); g.moveTo(cx - 1.6, rimY() - 6.4); g.lineTo(cx, rimY() - 4.6); g.lineTo(cx + 1.6, rimY() - 6.4); g.lineWidth = 0.9; g.lineCap = "round"; g.strokeStyle = "#3fe07a"; g.stroke(); }
        rrect(g, cx - cup.wt - 8, rimY() - 41.4, 2 * cup.wt + 17, 0.8, 0.4); g.fillStyle = "rgba(60,40,30,.32)"; g.fill();
        g.fillStyle = "#5a4a40"; g.fillRect(tx - 0.35, rimY() - 44, 0.7, 3.4);
        drawTongs(g, tx, rimY() - 26, tong.open > 0 ? 1 : 0, tong.cd <= 0.15);
      }
      for (const f of falls) cubeV(g, f.x - 2.5, f.y - 2.5, 5, false, (f.vx || 0) * 0.01 + 0.15);
      // 그릇·줄기
      if (pour) {
        const [sx, sy] = spout(), ig = ING[pour.ing];
        if (pour.top != null && pour.bot != null && pour.bot > pour.top) {
          const y0 = pour.top, y1 = pour.bot, wob = Math.sin(tm * 40) * 0.25, x = sx + 1;
          g.beginPath(); g.moveTo(x - 0.95, y0); g.quadraticCurveTo(x - 0.75 + wob, (y0 + y1) / 2, x - 0.8 + wob, y1); g.lineTo(x + 0.8 + wob, y1); g.quadraticCurveTo(x + 0.85 + wob, (y0 + y1) / 2, x + 0.95, y0); g.closePath();
          g.fillStyle = lgH(g, x - 1, x + 1, [[0, ig.hi], [0.45, ig.c], [1, ig.c2]]); g.fill();
          if (y1 >= Y0 - cup.level - 1 && Math.floor(tm * 20) % 2) { ell(g, sx - 1.5, y1 - 0.8, 0.6, 0.6); g.fillStyle = ig.hi; g.fill(); ell(g, sx + 3.4, y1 - 1.6, 0.5, 0.5); g.fill(); }
        }
        if (pour.vis > 0) drawPitcher(g, pour.ing, sx, sy, pour.tilt, pour.vis);
      }
      if (phase === "make" && st && (st.t === "top" || st.t === "drz")) {
        const sx = shaker.on ? shaker.x : cx + Math.sin(tm * 3) * 6, sy = rimY() - 16, tp = TOP[st.k], sh = shaker.on ? (Math.floor(tm * 24) % 2 ? 0.8 : -0.8) : 0;
        if (st.t === "drz") drawSyrup(g, sx, sy, tp.c[0], sh); else drawShaker(g, sx, sy, tp.c, sh);
      }
    }
    for (const p of parts) { g.globalAlpha = clamp(p.t * 3, 0, 1); const r = (p.s || 1) * 0.6; ell(g, p.x + 0.5, p.y + 0.5, r, r); g.fillStyle = p.c; g.fill(); }
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
    const PS = 4; pc.width = (2 * bc.wt + 14) * PS; pc.height = (bc.h + 26) * PS; const pg = pc.getContext("2d"); pg.setTransform(PS, 0, 0, PS, 0, 0);
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
