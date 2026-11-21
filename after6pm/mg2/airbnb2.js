// 미니게임 2탄: 에어씨앤씨 숙소 — 인간 돋보기(틀린 그림 찾기)
// 위: 지난번 손님 맞이 때 찍은 "완벽한 방" 사진, 아래: 지금 방. 둘 다 120x90 도트 장면을 코드로 그린다.
// 방 3개(게스트하우스 침실·한옥 방·욕실 겸 원룸, 색·무늬·좌우 무작위), 방마다 다른 곳 5개를 아래 그림에서 톡.
// 맞히면 빨간 동그라미 + 그 자리가 고쳐지고, 틀리면 감점·흔들림. 시간이 흐르면 캐리어 소리·"곧 도착" 알림.
// 시간이 끝나거나 다 찾으면 손님이 들어와 감탄하고 별점. 점수 = 찾은 비율·속도·정확도.
import { frame, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 120, H = 90, ND = 5, NR = 2, ROOM_T = 15;
const ACC = ["#4f7bd9", "#d94f6a", "#3e9e6a", "#e09a30", "#8a5fc0", "#2f9fb0"];
const STAR = ["....X....", "...XXX...", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "..XX.XX..", ".XX...XX."];
const sh = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const mkC = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// 도트 한 장(둘레 1픽셀 자리, outline 이면 어두운 테두리)
function spr(w, h, fn, outline = false) {
  const c = mkC(w + 2, h + 2), g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); }, g);
  if (outline) uOutline(c); return c;
}
// 가까운 픽셀로 돌리기(기울어진 액자)
function rotSpr(c, a) {
  const w = c.width, h = c.height, d = Math.ceil(Math.hypot(w, h)) + 2, o = mkC(d, d), src = c.getContext("2d").getImageData(0, 0, w, h).data, go = o.getContext("2d"), od = go.createImageData(d, d), ca = Math.cos(a), sa = Math.sin(a);
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
    const dx = x - d / 2 + 0.5, dy = y - d / 2 + 0.5, sx = Math.floor(ca * dx + sa * dy + w / 2), sy = Math.floor(-sa * dx + ca * dy + h / 2);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue; const i = (sy * w + sx) * 4, j = (y * d + x) * 4;
    for (let k = 0; k < 4; k++) od.data[j + k] = src[i + k];
  }
  go.putImageData(od, 0, 0); return o;
}
const drawC = (g, c, cx, cy) => g.drawImage(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2));

// ── 작은 소품 ──
const pillowP = (P, x, y, w, h, c) => { P(x + 1, y, w - 2, h, c); P(x, y + 1, w, h - 2, c); P(x + 1, y, w - 2, 1, "#ffffff"); P(x + 1, y + h - 1, w - 2, 1, sh(c, 0.8)); P(x, y + h - 2, w, 1, sh(c, 0.9)); P(x + 3, y + 3, w - 6, 1, sh(c, 0.94)); P(x + w / 2, y + 1, 1, h - 3, sh(c, 0.95)); };
const bottleP = (P, x, y) => { P(x + 1, y, 1, 1, "#2f6fd0"); P(x + 1, y + 1, 1, 1, "#d8f2fb"); P(x, y + 2, 3, 6, "#bfe6f5"); P(x, y + 2, 1, 6, "#eafaff"); P(x + 2, y + 2, 1, 6, "#93c8de"); P(x, y + 4, 3, 2, "#ffffff"); P(x + 1, y + 4, 1, 2, "#4fa0e0"); };
const remoteP = (P, x, y) => { P(x, y + 2, 6, 1, "rgba(0,0,0,.2)"); P(x, y, 6, 2, "#2a2a34"); P(x, y, 6, 1, "#4a4a5a"); P(x + 1, y, 1, 1, "#ff5050"); P(x + 3, y, 1, 1, "#9ab8d8"); P(x + 4, y + 1, 1, 1, "#9ab8d8"); };
const cardP = (P, x, y) => { P(x, y + 7, 11, 1, "rgba(0,0,0,.18)"); P(x, y, 11, 7, "#fffdf4"); P(x, y, 11, 1, "#ffffff"); P(x + 10, y, 1, 7, "#e4dcc8"); const r = "#e8445a"; P(x + 3, y + 2, 2, 1, r); P(x + 6, y + 2, 2, 1, r); P(x + 2, y + 3, 7, 1, r); P(x + 3, y + 4, 5, 1, r); P(x + 4, y + 5, 3, 1, r); P(x + 3, y + 2, 1, 1, "#ff9aaa"); };
const trashP = (P, x, y, k) => {
  P(x - 4, y, 8, 1, "rgba(0,0,0,.2)");
  if (k === 0) { P(x - 3, y - 4, 6, 4, "#f2f2ec"); P(x - 2, y - 5, 4, 1, "#f2f2ec"); P(x - 3, y - 1, 6, 1, "#c4c4ba"); P(x - 1, y - 3, 1, 1, "#c4c4ba"); P(x + 1, y - 4, 1, 2, "#d4d4ca"); P(x - 2, y - 2, 2, 1, "#d4d4ca"); P(x + 1, y - 1, 1, 1, "#a8a89e"); }
  else if (k === 1) { P(x - 4, y - 3, 8, 3, "#e04848"); P(x - 4, y - 3, 8, 1, "#ff7a7a"); P(x - 5, y - 3, 1, 3, "#c8c8d0"); P(x + 4, y - 3, 1, 3, "#c8c8d0"); P(x - 1, y - 2, 3, 1, "#ffd166"); P(x + 2, y - 4, 2, 1, "#c8c8d0"); }
  else { P(x - 4, y - 3, 7, 3, "#f4f4f4"); P(x + 3, y - 3, 1, 3, "#7a5a3a"); P(x - 4, y - 2, 7, 1, "#d8383a"); P(x - 4, y - 3, 1, 3, "#d8d8d8"); P(x - 6, y - 1, 2, 1, "#8a5a3a"); }
};
const glow = (g, x, y, r, a = 0.45) => { g.save(); g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(x, y, 1, x, y, r); rg.addColorStop(0, `rgba(255,214,130,${a})`); rg.addColorStop(1, "rgba(255,214,130,0)"); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); };
const crease = (P, x, y, n, dir, c) => { for (let k = 0; k < n; k++) { P(x + k * dir, y + k, 1, 1, sh(c, 0.76)); P(x + k * dir + dir, y + k, 1, 1, "#ffffff"); } };
// 액자 그림 세 가지
function framePic(art, fc) {
  return spr(16, 12, (P) => {
    P(0, 0, 16, 12, fc); P(0, 0, 16, 1, sh(fc, 1.25)); P(1, 1, 14, 10, sh(fc, 0.7));
    if (art === 0) { P(2, 2, 12, 8, "#9fd6f2"); P(2, 7, 12, 3, "#5a9a66"); P(4, 5, 4, 2, "#7a8a9a"); P(5, 4, 2, 1, "#ffffff"); P(8, 6, 5, 1, "#6a7a8a"); P(11, 3, 2, 2, "#ffd166"); }
    else if (art === 1) { P(2, 2, 12, 8, "#bfe6f5"); P(2, 6, 12, 4, "#3a8fd0"); P(2, 6, 12, 1, "#7fc8f0"); P(7, 3, 1, 3, "#ffffff"); P(8, 4, 2, 2, "#ffffff"); P(6, 6, 5, 1, "#7a4a2a"); P(3, 3, 2, 1, "#ffffff"); }
    else { P(2, 2, 12, 8, "#f4ecd8"); P(6, 7, 4, 3, "#4f7bd9"); P(7, 4, 1, 3, "#3e9e5a"); P(9, 5, 1, 2, "#3e9e5a"); P(6, 3, 3, 2, "#e8445a"); P(9, 4, 2, 2, "#ffd166"); P(4, 5, 2, 2, "#c77dff"); }
  }, true);
}

// ───────── 방 1: 게스트하우스 침실 ─────────
function roomBed() {
  const FL = 52;
  const wall = pick([["#e9dcc6", "#dccdb2"], ["#cfe0e8", "#bccfd9"], ["#f1d9cf", "#e3c5b8"], ["#dde7cf", "#cbd8ba"]]);
  const wood = pick([["#b07a4a", "#93633b", "#c48c58"], ["#c9a77a", "#ad8b5e", "#dabb90"], ["#8a5a3c", "#6e4630", "#9c6a48"]]);
  const acc = pick(ACC), blk = pick(["#f6f4ee", "#e6edf7", "#f4e8d4"]), cur = pick(["#e8b4b8", "#9fc6d8", "#c8d8a8", "#e8d8a8"]);
  const head = pick(["#7a5236", "#5a4a6a", "#3a5a6a", "#a07850"]), rugC = pick(["#c94f6a", "#2f6f8f", "#7a8a3a", "#8a5fc0"]), nC = pick(["#f2ece2", "#c49a6a", "#8a6a4a"]);
  const doorC = pick(["#c9a06a", "#8a6a4a", "#e8e4dc"]), pc = pick(["#ffffff", "#eef2fa"]), towC = pick(["#ffffff", "#f4ecd8", "#e4eef8"]);
  const pat = rint(3), tr = pick([[14, 85], [100, 87], [22, 73]]), trK = rint(3), rmB = pick([[50, 63], [36, 85]]);
  const fr = framePic(rint(3), pick(["#c9a050", "#3a3a46", "#f4f0e8"])), frT = rotSpr(fr, pick([-1, 1]) * (0.14 + rnd() * 0.07));
  const tied = (P, x, right) => {
    for (let y = 5; y < 37; y++) {
      const w = y < 20 ? 8 - Math.floor((y - 5) / 3) : y < 23 ? 3 : Math.min(8, 3 + Math.floor((y - 22) / 2)), xx = right ? x + 8 - w : x;
      P(xx, y, w, 1, cur); P(right ? xx : xx + w - 1, y, 1, 1, sh(cur, 0.8)); if (w > 3) P(xx + Math.floor(w / 2), y, 1, 1, sh(cur, 0.9));
    }
    P(x + (right ? 4 : 1), 20, 4, 2, acc);
  };
  const lamp = (P, g, on) => {
    P(29, 42, 1, 7, "#b89048"); P(26, 48, 7, 2, "#b89048"); P(26, 48, 7, 1, "#d8b060");
    const c = on ? ["#fff8d8", "#ffe28e", "#f0c050"] : ["#d8d2c4", "#bab3a4", "#9a9384"];
    for (let r = 0; r < 7; r++) { const a = Math.floor(r / 2); P(26 - a, 35 + r, 8 + 2 * a, 1, c[1]); P(33 + a, 35 + r, 1, 1, c[2]); }
    P(26, 35, 8, 1, c[0]); P(27, 36, 2, 4, c[0]);
    if (on) { P(23, 42, 14, 1, "#fff2b0"); glow(g, 29, 40, 24, 0.5); }
  };
  const blanket = (P, bad) => {
    P(39, 48, 50, 25, blk); P(39, 48, 50, 4, "#ffffff"); P(39, 52, 50, 1, sh(blk, 0.86)); P(39, 48, 1, 25, sh(blk, 0.9)); P(88, 48, 1, 25, sh(blk, 0.84));
    P(39, 64, 50, 2, acc); P(39, 67, 50, 1, acc); P(39, 72, 50, 1, sh(blk, 0.84));
    if (bad) {
      crease(P, 44, 54, 10, 1, blk); crease(P, 82, 53, 9, -1, blk); crease(P, 66, 60, 6, 1, blk);
      P(57, 56, 12, 3, sh(blk, 0.9)); P(57, 56, 12, 1, "#ffffff"); P(48, 47, 16, 2, "#ffffff"); P(48, 49, 16, 1, sh(blk, 0.84));
      for (let r = 0; r < 8; r++) P(89 - (8 - r), 65 + r, 8 - r, 1, r === 0 ? "#ffffff" : sh(blk, 0.72));
    }
  };
  const slip = (P, x, y) => { P(x, y + 6, 5, 1, "rgba(0,0,0,.2)"); P(x, y, 5, 6, "#fafaf6"); P(x, y + 5, 5, 1, "#d8d4c8"); P(x, y, 5, 2, acc); P(x, y, 5, 1, sh(acc, 1.2)); };
  const base = (P) => {
    P(0, 0, W, FL, wall[0]);
    if (pat === 0) for (let x = 1; x < W; x += 7) P(x, 3, 3, FL - 6, wall[1]);
    else if (pat === 1) for (let y = 6, r = 0; y < FL - 5; y += 6, r++) for (let x = (r % 2) * 3 + 2; x < W; x += 6) P(x, y, 1, 1, wall[1]);
    else { P(0, 32, W, FL - 32, wall[1]); P(0, 31, W, 1, "#ffffff"); P(0, 32, W, 1, sh(wall[1], 0.85)); for (let x = 4; x < W; x += 12) { P(x, 35, 9, FL - 40, sh(wall[1], 0.95)); P(x, 35, 9, 1, sh(wall[1], 0.86)); } }
    P(0, 0, W, 2, sh(wall[0], 0.82)); P(0, 2, W, 1, sh(wall[0], 0.92));
    // 창문: 낮 하늘·언덕·나무
    P(6, 7, 32, 28, "#f6f3ec"); P(8, 9, 28, 24, "#9fd6f2"); P(8, 9, 28, 7, "#86c8ee");
    P(11, 12, 7, 2, "#ffffff"); P(12, 11, 4, 1, "#ffffff"); P(26, 14, 6, 2, "#f4fbff"); P(27, 13, 3, 1, "#f4fbff");
    P(8, 25, 28, 8, "#86c48e"); P(8, 24, 10, 1, "#86c48e"); P(24, 23, 12, 2, "#79b882");
    P(12, 21, 4, 4, "#4f8a5a"); P(11, 22, 6, 2, "#5a9a66"); P(13, 25, 1, 2, "#6b4a2a"); P(29, 19, 4, 5, "#4f8a5a"); P(30, 24, 1, 2, "#6b4a2a");
    P(21, 9, 2, 24, "#f6f3ec"); P(8, 20, 28, 1, "#f6f3ec"); P(4, 34, 36, 2, "#ece6dc"); P(4, 36, 36, 1, "#c8bfb0");
    P(1, 5, 42, 1, "#7a5a3a"); P(0, 4, 2, 3, "#5a3a22"); P(42, 4, 2, 3, "#5a3a22");
    P(63, 4, 1, 1, "#777");
    // 문
    P(103, 11, 16, FL - 11, "#f2ede4"); P(103, 11, 16, 1, "#ffffff"); P(105, 13, 12, FL - 14, doorC); P(105, 13, 12, 1, sh(doorC, 1.12));
    P(107, 16, 8, 12, sh(doorC, 0.88)); P(108, 17, 6, 10, sh(doorC, 0.96)); P(107, 31, 8, FL - 36, sh(doorC, 0.88)); P(108, 32, 6, FL - 38, sh(doorC, 0.96));
    P(105, FL - 1, 12, 1, sh(doorC, 0.5));
    P(0, FL - 3, 103, 3, "#f4f0e8"); P(0, FL - 1, 103, 1, "#d2cabd"); P(119, FL - 3, 1, 3, "#f4f0e8");
    // 마루
    P(0, FL, W, H - FL, wood[0]);
    for (let r = 0, y = FL; y < H; y += 5, r++) { P(0, y, W, 1, wood[1]); for (let x = (r * 13) % 22; x < W; x += 22) P(x, y + 1, 1, 4, wood[1]); for (let x = (r * 7) % 17; x < W; x += 17) P(x + 4, y + 2, 5, 1, wood[2]); }
    P(0, FL, W, 2, "rgba(40,20,10,.18)");
    // 러그
    P(28, 79, 70, 10, sh(rugC, 0.72)); P(29, 80, 68, 8, rugC); P(31, 82, 64, 1, sh(rugC, 1.25)); P(31, 85, 64, 1, sh(rugC, 1.25));
    for (let x = 29; x < 97; x += 2) P(x, 89, 1, 1, "#efe6d0");
    // 협탁 둘
    for (const [x, w] of [[23, 13], [90, 11]]) { P(x, 50, w, 16, nC); P(x - 1, 49, w + 2, 2, sh(nC, 1.08)); P(x - 1, 51, w + 2, 1, sh(nC, 0.84)); P(x + 1, 57, w - 2, 1, sh(nC, 0.8)); P(x + Math.floor(w / 2) - 1, 59, 2, 1, "#d8b050"); P(x + w - 1, 52, 1, 14, sh(nC, 0.84)); P(x + 1, 66, 2, 2, sh(nC, 0.6)); P(x + w - 3, 66, 2, 2, sh(nC, 0.6)); }
    // 침대
    P(37, 21, 3, 31, sh(head, 0.78)); P(88, 21, 3, 31, sh(head, 0.78)); P(37, 21, 3, 1, sh(head, 1.2)); P(88, 21, 3, 1, sh(head, 1.2));
    P(40, 24, 48, 24, head); P(40, 24, 48, 1, sh(head, 1.22)); P(43, 27, 42, 13, sh(head, 1.1)); P(43, 27, 42, 1, sh(head, 0.82));
    for (let x = 47; x < 84; x += 8) { P(x, 31, 1, 1, sh(head, 0.8)); P(x + 4, 35, 1, 1, sh(head, 0.8)); }
    P(40, 40, 48, 10, "#e9e5dd"); pillowP(P, 42, 41, 20, 8, pc);
    P(37, 73, 54, 5, head); P(37, 73, 54, 1, sh(head, 1.22)); P(37, 77, 54, 1, sh(head, 0.7)); P(39, 78, 3, 4, sh(head, 0.6)); P(86, 78, 3, 4, sh(head, 0.6)); P(42, 82, 44, 1, "rgba(0,0,0,.2)");
    P(106, 32, 2, 2, "#e8c060");
  };
  const slots = [
    { id: "curtain", n: "커튼", fix: "커튼 묶었어요", snd: "whoosh", box: [[21, 4, 23, 34]], good: (P) => { tied(P, 0, false); tied(P, 36, true); }, bad: (P) => { tied(P, 0, false); P(22, 5, 21, 32, cur); for (let x = 24; x < 43; x += 3) P(x, 6, 1, 31, sh(cur, 0.84)); P(22, 5, 21, 1, sh(cur, 1.12)); P(22, 36, 21, 1, sh(cur, 0.78)); P(22, 5, 1, 32, sh(cur, 0.78)); } },
    { id: "frame", n: "액자", fix: "액자 바로!", box: [[52, 3, 24, 21]], good: (P, g) => drawC(g, fr, 64, 13), bad: (P, g) => drawC(g, frT, 64, 13) },
    { id: "plant", n: "화분", fix: "싱싱한 화분으로", box: [[2, 53, 17, 26]], good: (P) => { P(9, 55, 2, 13, "#3e9e5a"); P(5, 59, 4, 3, "#4fbe6a"); P(4, 61, 3, 2, "#3e9e5a"); P(12, 57, 4, 3, "#4fbe6a"); P(14, 59, 3, 3, "#3e9e5a"); P(6, 63, 4, 4, "#3e9e5a"); P(11, 62, 5, 4, "#4fbe6a"); P(10, 56, 1, 4, "#8fe09a"); P(13, 58, 1, 1, "#8fe09a"); P(6, 68, 9, 8, "#c0603a"); P(6, 68, 9, 1, "#d8784a"); P(13, 69, 2, 7, "#9a4a2a"); P(5, 76, 11, 1, "rgba(0,0,0,.2)"); }, bad: (P) => { P(9, 62, 2, 6, "#8a7a3a"); P(4, 66, 5, 2, "#b89a40"); P(12, 65, 5, 2, "#a08a3a"); P(8, 60, 3, 2, "#c8a848"); P(6, 64, 3, 2, "#9a7a30"); P(14, 67, 2, 1, "#b89a40"); P(6, 68, 9, 8, "#c0603a"); P(6, 68, 9, 1, "#d8784a"); P(13, 69, 2, 7, "#9a4a2a"); P(5, 76, 11, 1, "rgba(0,0,0,.2)"); P(18, 76, 2, 1, "#b89a40"); P(2, 77, 2, 1, "#a08a3a"); } },
    { id: "lamp", n: "스탠드", fix: "불 켰어요", snd: "click", box: [[21, 33, 17, 17]], good: (P, g) => lamp(P, g, true), bad: (P, g) => lamp(P, g, false) },
    { id: "water", n: "생수", fix: "생수 채움", box: [[88, 39, 9, 11]], good: (P) => { bottleP(P, 90, 41); bottleP(P, 93, 41); }, bad: () => {} },
    { id: "remote", n: "리모컨", fix: "리모컨 제자리", box: [[94, 45, 8, 5], [rmB[0] - 2, rmB[1] - 2, 10, 6]], good: (P) => remoteP(P, 95, 47), bad: (P) => remoteP(P, rmB[0], rmB[1]) },
    { id: "pillow", n: "베개", fix: "베개 채움", box: [[65, 40, 22, 10]], good: (P) => pillowP(P, 66, 41, 20, 8, pc), bad: (P) => P(67, 46, 18, 1, "#d8d4cc") },
    { id: "blanket", n: "이불", fix: "이불 쫙!", snd: "whoosh", box: [[39, 47, 50, 26]], good: (P) => blanket(P, false), bad: (P) => blanket(P, true) },
    { id: "card", n: "환영 카드", fix: "환영 카드 놓음", box: [[55, 52, 15, 11]], good: (P) => cardP(P, 57, 54), bad: () => {} },
    { id: "towel", n: "수건", fix: "수건 채움", box: [[71, 57, 18, 13]], good: (P) => { P(73, 68, 14, 1, "rgba(0,0,0,.15)"); P(73, 63, 14, 5, sh(towC, 0.92)); P(73, 63, 14, 1, "#ffffff"); P(86, 63, 1, 5, sh(towC, 0.8)); P(74, 59, 12, 5, towC); P(74, 59, 12, 1, "#ffffff"); P(74, 61, 12, 1, acc); P(85, 59, 1, 5, sh(towC, 0.85)); }, bad: () => {} },
    { id: "slip", n: "슬리퍼", fix: "슬리퍼 짝 맞춤", box: [[54, 79, 17, 10]], good: (P) => { slip(P, 57, 81); slip(P, 64, 81); }, bad: (P) => slip(P, 57, 81) },
    { id: "trash", n: "쓰레기", fix: "쓰레기 치움", snd: "sweep", box: [[tr[0] - 6, tr[1] - 7, 12, 9]], good: () => {}, bad: (P) => trashP(P, tr[0], tr[1], trK) },
  ];
  return { n: "게스트하우스 침실", FL, base, slots, door: { x: 105, y: 13, w: 12, h: FL - 14, c: doorC, knob: [106, 32] }, spot: [66, 88], acc };
}

// ───────── 방 2: 한옥 방 ─────────
function roomHanok() {
  const FL = 50;
  const wd = pick([["#6b4226", "#8a5a32", "#4a2c18"], ["#7a4e2c", "#9a6a3e", "#55341c"]]), pap = "#f6eedb", pap2 = "#f2e6c8";
  const silk = pick([["#c8384a", "#f4c0c8", "#ffd166"], ["#2f6a9a", "#bcd8f0", "#ffd166"], ["#3e8a5a", "#c8e8c8", "#f4e0a0"], ["#8a3a8a", "#e8c8e8", "#ffd166"]]);
  const cush = pick(["#3a6ea5", "#7a3a8a", "#3e7a5a", "#c86a2a"]), acc = pick(ACC);
  const tr = pick([[36, 88], [60, 88], [112, 85]]), trK = rint(3);
  const scr = spr(12, 30, (P) => {
    P(0, 0, 12, 2, wd[2]); P(1, 2, 10, 26, "#f4ecd4"); P(1, 2, 10, 3, "#3a5a7a"); P(1, 25, 10, 3, "#3a5a7a"); P(1, 5, 1, 20, "#d8ccb0");
    P(5, 9, 1, 7, "#2a2a2a"); P(4, 13, 1, 4, "#2a2a2a"); P(7, 11, 1, 5, "#2a2a2a"); P(3, 16, 2, 1, "#2a2a2a"); P(8, 10, 1, 1, "#2a2a2a");
    P(7, 8, 2, 1, "#e05a7a"); P(4, 7, 1, 1, "#e05a7a"); P(8, 13, 1, 1, "#e05a7a"); P(8, 21, 2, 2, "#c83a3a"); P(0, 28, 12, 2, wd[2]);
  }, true);
  const scrT = rotSpr(scr, pick([-1, 1]) * (0.13 + rnd() * 0.07));
  const korPillow = (P, x, y) => { P(x + 2, y, 12, 7, "#f2e8d4"); P(x + 2, y, 12, 1, "#fff8ec"); P(x + 2, y + 6, 12, 1, "#c8b898"); P(x + 2, y + 3, 12, 1, silk[1]); P(x, y + 1, 2, 5, silk[0]); P(x + 14, y + 1, 2, 5, silk[0]); P(x, y + 3, 2, 1, silk[2]); P(x + 14, y + 3, 2, 1, silk[2]); };
  const lantern = (P, g, on) => {
    P(4, 53, 13, 1, wd[0]); P(5, 54, 11, 20, on ? "#fff4c8" : "#ddd0b2"); P(5, 54, 1, 20, wd[0]); P(15, 54, 1, 20, wd[0]); P(6, 63, 9, 1, wd[1]); P(10, 54, 1, 20, wd[1]);
    if (on) { P(6, 55, 4, 7, "#fffbe8"); glow(g, 10, 63, 24, 0.5); } else P(6, 55, 4, 7, "#e6dabd");
    P(4, 74, 13, 1, wd[0]); P(5, 75, 2, 1, wd[2]); P(14, 75, 2, 1, wd[2]);
  };
  const ihul = (P, bad) => {
    P(20, 60, 60, 21, silk[0]); P(20, 60, 60, 3, "#fff8f0"); P(20, 63, 60, 1, sh(silk[0], 0.8));
    for (let y = 66, r = 0; y < 79; y += 5, r++) for (let x = 24 + (r % 2) * 4; x < 78; x += 8) { P(x, y, 1, 1, silk[2]); P(x - 1, y + 1, 3, 1, silk[1]); P(x, y + 2, 1, 1, silk[2]); }
    P(20, 60, 1, 21, sh(silk[0], 0.84)); P(79, 60, 1, 21, sh(silk[0], 0.78)); P(20, 80, 60, 1, sh(silk[0], 0.7));
    if (bad) { crease(P, 26, 64, 11, 1, silk[0]); crease(P, 72, 64, 10, -1, silk[0]); P(44, 66, 14, 3, sh(silk[0], 0.86)); P(44, 66, 14, 1, sh(silk[0], 1.2)); for (let r = 0; r < 9; r++) P(20, 60 + r, 9 - r, 1, r === 0 ? "#ffffff" : silk[1]); P(29, 60, 1, 1, sh(silk[0], 0.7)); }
  };
  const cushP = (P, x, y) => { P(x, y + 7, 14, 1, "rgba(60,30,10,.25)"); P(x, y, 14, 7, cush); P(x, y, 14, 1, sh(cush, 1.25)); P(x, y + 6, 14, 1, sh(cush, 0.7)); P(x + 3, y + 2, 8, 3, sh(cush, 1.12)); P(x + 6, y + 3, 2, 1, "#ffd166"); for (const [a, b] of [[-1, -1], [14, -1], [-1, 7], [14, 7]]) P(x + a, y + b, 1, 1, "#ffd166"); };
  const cup = (P, x, y) => { P(x, y, 4, 3, "#a8d4bc"); P(x, y, 4, 1, "#6a9a84"); P(x, y + 1, 1, 2, "#c8eadb"); P(x + 1, y + 3, 2, 1, "#8fc0a8"); };
  const base = (P) => {
    P(0, 0, W, FL, pap); for (let i = 0; i < 70; i++) P(((i * 37) % W), 7 + ((i * 53) % (FL - 12)), 1, 1, "#ece2c8");
    P(0, 0, W, 5, wd[0]); P(0, 4, W, 1, wd[2]); P(0, FL - 4, W, 4, wd[0]); P(0, FL - 4, W, 1, wd[1]);
    for (const x of [0, 52, 116]) { P(x, 0, 4, FL, wd[0]); P(x + 1, 0, 1, FL, wd[1]); P(x + 3, 0, 1, FL, wd[2]); }
    P(68, 4, 1, 1, "#444");
    // 미닫이 문(손님 들어오는 곳)
    P(80, 6, 34, FL - 6, wd[0]); P(82, 8, 30, FL - 9, pap2);
    for (let x = 85; x < 112; x += 4) P(x, 8, 1, FL - 9, wd[1]); for (const y of [14, 22, 30, 38]) P(82, y, 30, 1, wd[1]);
    P(96, 8, 2, FL - 9, wd[0]); P(93, 26, 1, 5, wd[2]); P(99, 26, 1, 5, wd[2]);
    // 장판
    P(0, FL, W, H - FL, "#d9a95a");
    for (let y = FL + 10, r = 0; y < H; y += 13, r++) { P(0, y, W, 1, "#c4924a"); for (let x = (r % 2) * 10 + 4; x < W; x += 20) P(x, y - 12 < FL ? FL : y - 12, 1, 12, "#c99a50"); }
    P(8, FL + 4, 40, 1, "#e8c07a"); P(70, FL + 18, 30, 1, "#e8c07a"); P(12, FL + 30, 24, 1, "#e8c07a"); P(0, FL, W, 2, "rgba(60,30,10,.22)");
    // 요·베개
    P(18, 55, 64, 27, "#f6efe4"); P(18, 55, 64, 1, "#ffffff"); P(18, 82, 64, 1, "rgba(60,30,10,.25)"); P(81, 55, 1, 27, "#e0d4c0"); korPillow(P, 24, 52);
    // 좌탁·찻주전자
    P(84, 75, 30, 1, "rgba(60,30,10,.28)"); P(84, 62, 30, 3, wd[1]); P(84, 62, 30, 1, "#b07a48"); P(85, 65, 28, 2, wd[0]); P(86, 67, 2, 8, wd[0]); P(110, 67, 2, 8, wd[0]); P(85, 74, 4, 1, wd[2]); P(109, 74, 4, 1, wd[2]);
    P(88, 57, 7, 5, "#8fc0a8"); P(89, 56, 5, 1, "#a8d4bc"); P(90, 55, 3, 1, "#6a9a84"); P(91, 54, 1, 1, "#4a7a64"); P(95, 58, 2, 1, "#8fc0a8"); P(97, 57, 1, 1, "#8fc0a8"); P(87, 58, 1, 3, "#6a9a84"); P(88, 57, 1, 4, "#b8e0cc"); P(88, 61, 7, 1, "#6a9a84");
  };
  const lattice = (P, x0, x1) => { for (let x = x0 + 3; x < x1; x += 4) P(x, 11, 1, 30, wd[1]); for (let y = 16; y < 41; y += 6) P(x0, y, x1 - x0, 1, wd[1]); };
  const slots = [
    { id: "window", n: "창호 문", fix: "창 닫았어요", snd: "whoosh", box: [[7, 9, 38, 34]], good: (P) => { P(7, 9, 38, 34, wd[0]); P(9, 11, 34, 30, pap2); lattice(P, 9, 43); P(25, 11, 2, 30, wd[0]); }, bad: (P) => { P(7, 9, 38, 34, wd[0]); P(27, 11, 16, 30, "#a8dcf6"); P(27, 24, 16, 6, "#8ab8a0"); P(27, 30, 16, 11, "#6aa874"); P(30, 18, 6, 8, "#3e8a4e"); P(32, 26, 2, 6, "#5a3a22"); P(36, 22, 7, 3, "#4a4a5a"); P(35, 25, 9, 1, "#3a3a48"); P(9, 11, 16, 30, pap2); lattice(P, 9, 25); for (let x = 11; x < 25; x += 4) P(x, 11, 1, 30, sh(wd[1], 1.1)); P(25, 11, 2, 30, wd[0]); P(13, 11, 1, 30, wd[0]); } },
    { id: "scroll", n: "족자", fix: "족자 바로!", box: [[59, 5, 18, 38]], good: (P, g) => drawC(g, scr, 68, 21), bad: (P, g) => drawC(g, scrT, 68, 21) },
    { id: "lamp", n: "한지 등", fix: "등 켰어요", snd: "click", box: [[2, 51, 17, 26]], good: (P, g) => lantern(P, g, true), bad: (P, g) => lantern(P, g, false) },
    { id: "cups", n: "찻잔", fix: "찻잔 채움", box: [[96, 56, 11, 8]], good: (P) => { cup(P, 98, 59); cup(P, 103, 59); }, bad: (P) => cup(P, 98, 59) },
    { id: "snack", n: "다과", fix: "다과 준비", box: [[105, 55, 11, 8]], good: (P) => { P(107, 61, 7, 1, "#ffffff"); P(108, 62, 5, 1, "#d8d8d8"); P(108, 59, 2, 2, "#c8782a"); P(110, 58, 2, 3, "#e0a040"); P(112, 59, 2, 2, "#a85a20"); P(110, 58, 1, 1, "#ffd27a"); }, bad: (P) => { P(107, 61, 7, 1, "#ffffff"); P(108, 62, 5, 1, "#d8d8d8"); } },
    { id: "cushion", n: "방석", fix: "방석 제자리", box: [[88, 75, 18, 10], [2, 78, 19, 10]], good: (P) => cushP(P, 90, 77), bad: (P) => cushP(P, 4, 80) },
    { id: "pillow", n: "베개", fix: "베개 채움", box: [[44, 50, 20, 10]], good: (P) => korPillow(P, 46, 52), bad: () => {} },
    { id: "blanket", n: "이불", fix: "이불 쫙!", snd: "whoosh", box: [[20, 59, 60, 22]], good: (P) => ihul(P, false), bad: (P) => ihul(P, true) },
    { id: "card", n: "환영 카드", fix: "환영 카드 놓음", box: [[36, 64, 15, 11]], good: (P) => cardP(P, 38, 66), bad: () => {} },
    { id: "towel", n: "수건", fix: "수건 채움", box: [[62, 65, 17, 11]], good: (P) => { P(64, 73, 13, 1, "rgba(0,0,0,.18)"); P(64, 67, 13, 6, "#ffffff"); P(64, 69, 13, 1, acc); P(64, 72, 13, 1, "#d8d8d8"); P(76, 67, 1, 6, "#d8d8d8"); P(65, 66, 11, 1, "#ffffff"); }, bad: () => {} },
    { id: "trash", n: "쓰레기", fix: "쓰레기 치움", snd: "sweep", box: [[tr[0] - 6, tr[1] - 7, 12, 9]], good: () => {}, bad: (P) => trashP(P, tr[0], tr[1], trK) },
  ];
  return { n: "한옥 방", FL, base, slots, door: { x: 82, y: 8, w: 14, h: FL - 9, slide: true, c: pap2, wd }, spot: [56, 88], acc };
}

// ───────── 방 3: 욕실 겸 원룸 ─────────
function roomStudio() {
  const FL = 54;
  const tileC = pick(["#7cc8c8", "#e0a0a8", "#9fb8e0", "#e8c870"]), matC = pick(["#5fb0b0", "#e88a8a", "#8aa8e0", "#a8c87a"]), wallR = pick(["#ece4d8", "#d8e4ec", "#efe0e6", "#e4ead8"]);
  const wood = pick([["#c9a77a", "#ad8b5e", "#dabb90"], ["#b07a4a", "#93633b", "#c48c58"]]), acc = pick(ACC), blk = pick(["#f6f4ee", "#e6edf7", "#eef4ea"]);
  const head = pick(["#e8e2d6", "#5a6a7a", "#8a6a4a"]), doorC = pick(["#e8e4dc", "#c9a06a", "#5a6a7a"]), towC = pick(["#ffffff", "#f4ecd8"]), pc = "#ffffff";
  const tr = pick([[90, 87], [62, 86], [40, 86]]), trK = rint(3), rmB = pick([[64, 63], [76, 86]]);
  const blanket = (P, bad) => {
    P(58, 48, 44, 25, blk); P(58, 48, 44, 4, "#ffffff"); P(58, 52, 44, 1, sh(blk, 0.86)); P(58, 48, 1, 25, sh(blk, 0.9)); P(101, 48, 1, 25, sh(blk, 0.84));
    P(58, 62, 44, 1, acc); P(58, 64, 44, 1, acc); P(58, 72, 44, 1, sh(blk, 0.84));
    if (bad) { crease(P, 62, 53, 10, 1, blk); crease(P, 97, 53, 9, -1, blk); P(74, 58, 12, 3, sh(blk, 0.9)); P(74, 58, 12, 1, "#ffffff"); for (let r = 0; r < 8; r++) P(58, 65 + r, 8 - r, 1, r === 0 ? "#ffffff" : sh(blk, 0.72)); }
  };
  const sconce = (P, g, on) => { P(54, 25, 3, 5, "#b8a080"); P(55, 23, 1, 2, "#8a7a60"); P(53, 19, 5, 4, on ? "#fff4c0" : "#d0c8b8"); P(53, 19, 5, 1, on ? "#ffffff" : "#e0d8c8"); P(57, 19, 1, 4, on ? "#f0c860" : "#a8a090"); if (on) { P(53, 23, 5, 1, "#fff2b0"); glow(g, 55, 22, 18, 0.5); } };
  const base = (P) => {
    // 욕실 타일
    P(0, 0, 49, FL, "#f4f8f8"); for (let x = 5; x < 49; x += 6) P(x, 0, 1, FL, "#d8e4e6"); for (let y = 5; y < FL; y += 6) P(0, y, 49, 1, "#d8e4e6");
    P(0, 36, 49, 5, tileC); P(0, 36, 49, 1, sh(tileC, 1.15)); for (let x = 5; x < 49; x += 6) P(x, 36, 1, 5, sh(tileC, 0.85));
    P(0, FL, 49, H - FL, "#b8c8d0"); for (let x = 4; x < 49; x += 5) P(x, FL, 1, H - FL, "#a4b4bc"); for (let y = FL + 4; y < H; y += 5) P(0, y, 49, 1, "#a4b4bc");
    P(49, 0, 3, H, "#c8ccd2"); P(49, 0, 1, H, "#eef0f4"); P(51, 0, 1, H, "#9aa0a8");
    // 방 벽·마루
    P(52, 0, 68, FL, wallR); P(52, 0, 68, 2, sh(wallR, 0.84)); for (let x = 56; x < W; x += 9) P(x, 4, 1, FL - 8, sh(wallR, 0.96));
    P(52, FL, 68, H - FL, wood[0]);
    for (let r = 0, y = FL; y < H; y += 5, r++) { P(52, y, 68, 1, wood[1]); for (let x = 52 + (r * 13) % 22; x < W; x += 22) P(x, y + 1, 1, 4, wood[1]); for (let x = 52 + (r * 7) % 17; x < W - 5; x += 17) P(x + 3, y + 2, 5, 1, wood[2]); }
    P(52, FL, 68, 2, "rgba(40,20,10,.18)");
    // 거울 틀·세면대
    P(11, 5, 20, 20, "#b8c0c8"); P(11, 5, 20, 1, "#e0e6ea"); P(11, 24, 20, 1, "#8a9098");
    P(20, 25, 2, 4, "#a8b0b8"); P(20, 25, 5, 1, "#c8d0d8"); P(24, 26, 1, 1, "#a8b0b8");
    P(8, 29, 26, 3, "#fbfbfb"); P(8, 29, 26, 1, "#ffffff"); P(8, 32, 26, 1, "#c8d0d4"); P(11, 30, 20, 1, "#d8e2e6");
    P(18, 33, 6, 17, "#eef2f4"); P(18, 33, 1, 17, "#ffffff"); P(23, 33, 1, 17, "#c4ccd0"); P(16, 50, 10, 1, "rgba(0,0,0,.15)");
    P(34, 13, 13, 1, "#a8b0b8"); P(34, 12, 1, 3, "#808890"); P(46, 12, 1, 3, "#808890");
    P(36, 38, 8, 1, "#a8b0b8"); P(36, 38, 1, 2, "#808890"); P(43, 38, 1, 2, "#808890");
    // 문
    P(102, 11, 18, FL - 11, "#f2ede4"); P(102, 11, 18, 1, "#ffffff"); P(104, 13, 14, FL - 14, doorC); P(104, 13, 14, 1, sh(doorC, 1.12));
    P(106, 16, 10, 13, sh(doorC, 0.88)); P(107, 17, 8, 11, sh(doorC, 0.96)); P(106, 32, 10, FL - 37, sh(doorC, 0.88)); P(107, 33, 8, FL - 39, sh(doorC, 0.96)); P(104, FL - 1, 14, 1, sh(doorC, 0.5));
    P(52, FL - 3, 50, 3, "#f4f0e8"); P(52, FL - 1, 50, 1, "#d2cabd");
    // 선반
    P(60, 16, 38, 2, "#9a7450"); P(60, 16, 38, 1, "#b88e66"); P(63, 18, 1, 3, "#6a4a30"); P(94, 18, 1, 3, "#6a4a30");
    P(87, 12, 5, 4, "#c0603a"); P(87, 12, 5, 1, "#d8784a"); P(88, 9, 3, 3, "#5fb06a"); P(87, 10, 1, 2, "#4f9a5a"); P(91, 10, 1, 2, "#4f9a5a"); P(89, 8, 1, 1, "#8fe09a");
    // 침대
    P(58, 26, 44, 24, head); P(58, 26, 44, 1, sh(head, 1.15)); P(60, 29, 40, 11, sh(head, 1.08)); P(60, 29, 40, 1, sh(head, 0.82));
    P(58, 40, 44, 10, "#e9e5dd"); pillowP(P, 60, 41, 19, 8, pc);
    P(56, 73, 48, 5, head); P(56, 73, 48, 1, sh(head, 1.15)); P(56, 77, 48, 1, sh(head, 0.7)); P(58, 78, 3, 4, sh(head, 0.6)); P(99, 78, 3, 4, sh(head, 0.6)); P(60, 82, 40, 1, "rgba(0,0,0,.2)");
    P(106, 34, 2, 2, "#e8c060");
  };
  const slots = [
    { id: "mirror", n: "거울", fix: "거울 반짝!", snd: "sweep", box: [[10, 4, 22, 22]], good: (P) => { P(12, 6, 18, 18, "#cfe6ee"); for (let k = 0; k < 7; k++) { P(14 + k, 15 - k, 1, 1, "#f2fbfe"); P(18 + k, 21 - k, 1, 1, "#f2fbfe"); } P(12, 6, 18, 1, "#e4f4f8"); }, bad: (P) => { P(12, 6, 18, 18, "#cfe6ee"); for (let k = 0; k < 7; k++) P(14 + k, 15 - k, 1, 1, "#f2fbfe"); P(15, 9, 4, 3, "#a8b8a4"); P(16, 8, 2, 1, "#a8b8a4"); P(22, 16, 5, 2, "#b0bca8"); P(23, 18, 2, 2, "#b0bca8"); P(25, 9, 2, 2, "#a8b8a4"); P(14, 19, 2, 1, "#b8c4b0"); P(19, 13, 1, 1, "#ffffff"); P(26, 21, 1, 1, "#ffffff"); } },
    { id: "brush", n: "칫솔 세트", fix: "칫솔 세트 놓음", box: [[25, 20, 9, 10]], good: (P) => { P(27, 22, 1, 4, "#f05a7a"); P(29, 23, 1, 3, "#5ab0f0"); P(27, 22, 1, 1, "#ffffff"); P(29, 23, 1, 1, "#ffffff"); P(26, 26, 5, 3, "#9fd0e8"); P(26, 26, 5, 1, "#cfeefa"); }, bad: () => {} },
    { id: "towel", n: "수건", fix: "수건 걸었어요", box: [[33, 12, 15, 20]], good: (P) => { P(35, 14, 11, 16, towC); P(35, 14, 11, 1, "#ffffff"); P(35, 25, 11, 2, acc); P(45, 14, 1, 16, sh(towC, 0.85)); P(35, 29, 11, 1, sh(towC, 0.88)); P(38, 15, 1, 9, sh(towC, 0.94)); }, bad: () => {} },
    { id: "tp", n: "휴지", fix: "휴지 새로", box: [[35, 37, 10, 10]], good: (P) => { P(37, 39, 6, 5, "#fafafa"); P(37, 39, 6, 1, "#ffffff"); P(37, 43, 6, 1, "#d8d8d8"); P(37, 44, 3, 2, "#f4f4f4"); }, bad: (P) => { P(38, 39, 4, 3, "#c8a878"); P(39, 40, 2, 1, "#8a6a48"); } },
    { id: "mat", n: "발매트", fix: "발매트 쫙!", snd: "whoosh", box: [[7, 71, 32, 12]], good: (P) => { P(10, 81, 22, 1, "rgba(0,0,0,.15)"); P(10, 74, 22, 7, matC); P(10, 76, 22, 1, sh(matC, 1.2)); P(10, 78, 22, 1, sh(matC, 1.2)); P(10, 80, 22, 1, sh(matC, 0.75)); }, bad: (P) => { for (let r = 0; r < 7; r++) P(15 + r * 2, 73 + r, 19 - (r % 3) * 2, 1, r === 3 || r === 5 ? sh(matC, 1.2) : matC); P(30, 72, 6, 4, sh(matC, 0.72)); P(31, 72, 4, 1, sh(matC, 1.2)); } },
    { id: "water", n: "생수", fix: "생수 채움", box: [[59, 6, 10, 11]], good: (P) => { bottleP(P, 61, 8); bottleP(P, 65, 8); }, bad: () => {} },
    { id: "remote", n: "리모컨", fix: "리모컨 제자리", box: [[71, 11, 9, 6], [rmB[0] - 2, rmB[1] - 2, 10, 6]], good: (P) => remoteP(P, 73, 13), bad: (P) => remoteP(P, rmB[0], rmB[1]) },
    { id: "lamp", n: "벽 조명", fix: "불 켰어요", snd: "click", box: [[51, 17, 9, 14]], good: (P, g) => sconce(P, g, true), bad: (P, g) => sconce(P, g, false) },
    { id: "pillow", n: "베개", fix: "베개 채움", box: [[79, 40, 22, 10]], good: (P) => pillowP(P, 80, 41, 19, 8, pc), bad: (P) => P(81, 46, 17, 1, "#d8d4cc") },
    { id: "blanket", n: "이불", fix: "이불 쫙!", snd: "whoosh", box: [[58, 47, 44, 26]], good: (P) => blanket(P, false), bad: (P) => blanket(P, true) },
    { id: "card", n: "환영 카드", fix: "환영 카드 놓음", box: [[83, 63, 15, 11]], good: (P) => cardP(P, 85, 65), bad: () => {} },
    { id: "trash", n: "쓰레기", fix: "쓰레기 치움", snd: "sweep", box: [[tr[0] - 6, tr[1] - 7, 12, 9]], good: () => {}, bad: (P) => trashP(P, tr[0], tr[1], trK) },
  ];
  return { n: "욕실 겸 원룸", FL, base, slots, door: { x: 104, y: 13, w: 14, h: FL - 14, c: doorC, knob: [106, 34] }, spot: [80, 88], acc };
}

const ROOMS = [roomBed, roomHanok, roomStudio];
// 방 한 장 그리기. bad(slot) = 0(완벽) ~ 1(달라진 모습)
function paint(g, R, bad) {
  if (!R.bc) R.bc = (() => { const c = mkC(W, H), bg = c.getContext("2d"); R.base((x, y, w, h, col) => { bg.fillStyle = col; bg.fillRect(x, y, w, h); }, bg); return c; })();
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.drawImage(R.bc, 0, 0);
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  for (const s of R.slots) {
    const b = bad(s);
    if (b <= 0) s.good(P, g); else if (b >= 1) s.bad(P, g);
    else { g.globalAlpha = b; s.bad(P, g); g.globalAlpha = 1 - b; s.good(P, g); g.globalAlpha = 1; }
  }
}
const starImg = (on) => spr(9, 7, (P) => STAR.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "X") P(x, y, 1, 1, on ? (y < 2 ? "#fff3b0" : y < 4 ? "#ffd166" : "#f0a830") : "#5a5f78"); })), true).toDataURL();
const houseIcon = () => spr(11, 10, (P) => { P(5, 0, 1, 1, "#fff"); P(4, 1, 3, 1, "#fff"); P(3, 2, 5, 1, "#fff"); P(2, 3, 7, 1, "#fff"); P(1, 4, 9, 1, "#fff"); P(2, 5, 7, 5, "#fff"); P(4, 7, 3, 3, "#4fc3f7"); P(8, 1, 1, 2, "#fff"); }).toDataURL();
const loupeIcon = () => spr(12, 12, (P) => { P(2, 0, 4, 1, "#e8e8f0"); P(1, 1, 1, 1, "#e8e8f0"); P(6, 1, 1, 1, "#e8e8f0"); P(0, 2, 1, 4, "#e8e8f0"); P(7, 2, 1, 4, "#e8e8f0"); P(1, 6, 1, 1, "#e8e8f0"); P(6, 6, 1, 1, "#e8e8f0"); P(2, 7, 4, 1, "#e8e8f0"); P(1, 2, 6, 4, "#9fd8f4"); P(2, 1, 4, 6, "#9fd8f4"); P(2, 2, 2, 1, "#ffffff"); P(7, 7, 2, 2, "#c9a050"); P(9, 9, 2, 2, "#8a6a3a"); P(10, 10, 2, 2, "#8a6a3a"); }, true).toDataURL();
// 손님 캐리어
const bagP = (P, x, y, c) => { P(x, y - 9, 6, 8, c); P(x, y - 9, 6, 1, sh(c, 1.25)); P(x + 5, y - 8, 1, 7, sh(c, 0.7)); P(x + 2, y - 11, 2, 1, "#333"); P(x + 1, y - 10, 1, 1, "#333"); P(x + 4, y - 10, 1, 1, "#333"); P(x + 1, y - 6, 4, 1, sh(c, 0.8)); P(x, y - 1, 1, 1, "#222"); P(x + 5, y - 1, 1, 1, "#222"); };

export const GAME = {
  key: "airbnb2", base: "airbnb", n: "인간 돋보기", desc: "손님 오기 전, 지난번 완벽했던 방 사진과 지금 방을 비교해 다른 곳을 찾아요.",
  how: ["위는 <b>지난번 손님 맞이 사진</b>, 아래는 <b>지금 방</b>이에요", "아래 그림에서 <b>다른 곳 5개</b>를 톡! 틀리면 감점과 시간 -1초", "<b>돋보기</b>를 누르고 사진을 꾹 누르면 크게 보여요. 손님이 문 앞까지 와요!"],
  steps: () => {
    const R = roomBed(), a = mkC(W, H), b = mkC(W, H), ga = a.getContext("2d"), gb = b.getContext("2d");
    paint(ga, R, () => 0); paint(gb, R, (s) => (s.id === "pillow" || s.id === "card" ? 1 : 0));
    const mk = (w, h, fn) => { const c = mkC(w, h), g = c.getContext("2d"); g.imageSmoothingEnabled = false; fn(g, (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return `<img src="${c.toDataURL()}" alt="" style="width:${w * 1.5}px;height:${h * 1.5}px">`; };
    const s1 = mk(40, 36, (g, P) => { P(0, 0, 40, 17, "#fbfaf5"); g.drawImage(a, 46, 33, 38, 15, 1, 1, 38, 15); P(0, 18, 40, 1, "#1b1d2a"); P(0, 19, 40, 17, "#3a3f58"); g.drawImage(b, 46, 33, 38, 15, 1, 20, 38, 15); });
    const s2 = mk(40, 30, (g, P) => { g.drawImage(b, 46, 34, 40, 30, 0, 0, 40, 30); for (let i = 0; i < 64; i++) { const t = (i / 64) * 6.6 - 1.6; P(Math.round(30 + Math.cos(t) * 12), Math.round(11 + Math.sin(t) * 7), 1, 1, "#ff3355"); } const s = "#f5d0b0"; P(30, 17, 3, 8, s); P(29, 22, 7, 7, s); P(30, 17, 3, 1, "#ffffff"); P(29, 29, 7, 1, "#3a2a20"); });
    const s3 = mk(36, 40, (g, P) => { const p = { spec: uSpec("student"), cache: {} }; g.drawImage(uSprite(p, "f0", { v: "f", f: 0 }, false), 8, 9); bagP(P, 24, 39, "#4f7bd9"); for (let k = 0; k < 3; k++) STAR.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "X") P(1 + k * 12 + x, 1 + y, 1, 1, y < 3 ? "#ffe066" : "#f0a830"); })); });
    return [[s1, "위·아래 비교"], [s2, "다른 곳 톡"], [s3, "손님 별점"]];
  },
  css: `
.mg-ab2st{background:radial-gradient(ellipse at 50% 30%,#2a2d44,#14151f 80%)!important;display:flex;align-items:center;justify-content:center}
.mg-airbnb2 .ab2-w{display:flex;flex-direction:column;align-items:center;gap:10px}
.mg-airbnb2 canvas.ab2-c{display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.mg-airbnb2 .ab2-ph{position:relative;background:#fbfaf5;padding:5px 5px 0;border-radius:3px;box-shadow:0 8px 18px #000b;transform:rotate(-1.2deg)}
.mg-airbnb2 .ab2-ph.drop{animation:ab2drop .5s cubic-bezier(.3,1.5,.5,1)}
@keyframes ab2drop{from{transform:translateY(-60%) rotate(8deg);opacity:0}}
.mg-airbnb2 .ab2-ph>b{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#4a4450;padding:3px 2px 4px;font-weight:800;gap:6px}
.mg-airbnb2 .ab2-ph>b em{font-style:normal;color:#e07a2a;font-family:ui-monospace,monospace;font-size:10.5px}
.mg-airbnb2 .ab2-tape{position:absolute;left:50%;top:-7px;width:50px;height:14px;transform:translateX(-50%) rotate(3deg);background:#fff3bdb8;box-shadow:0 1px 2px #0003}
.mg-airbnb2 .ab2-now{position:relative;border-radius:3px;box-shadow:0 0 0 2px #4fc3f7aa,0 8px 18px #000b}
.mg-airbnb2 .ab2-now.fadein canvas{animation:ab2fade .5s ease-out}
@keyframes ab2fade{from{filter:brightness(0)}}
.mg-airbnb2 .ab2-now.lp canvas{cursor:zoom-in}
.mg-airbnb2 .ab2-tag{position:absolute;left:4px;top:4px;background:#000b;color:#fff;font-size:11px;font-weight:800;padding:2px 7px;border-radius:99px;pointer-events:none}
.mg-airbnb2 .ab2-dots{position:absolute;right:4px;top:4px;display:flex;gap:3px;background:#000b;padding:4px 6px;border-radius:99px;pointer-events:none}
.mg-airbnb2 .ab2-dots i{width:8px;height:8px;border-radius:50%;background:#ffffff30;border:1px solid #ffffff90}
.mg-airbnb2 .ab2-dots i.on{background:#ff3355;border-color:#fff;animation:ab2dot .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes ab2dot{from{transform:scale(2.2)}}
.mg-airbnb2 .ab2-now.arr .ab2-tag,.mg-airbnb2 .ab2-now.arr .ab2-dots{opacity:0;transition:opacity .2s}
.mg-airbnb2 .ab2-ov{position:absolute;inset:0;pointer-events:none;overflow:visible}
.mg-airbnb2 .ab2-bub{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#222;font-weight:900;font-size:12.5px;padding:4px 9px;border-radius:9px;white-space:nowrap;box-shadow:0 2px 0 #0005;animation:ab2bub .35s cubic-bezier(.3,1.6,.5,1) both;z-index:3}
.mg-airbnb2 .ab2-bub::after{content:"";position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:#fff}
.mg-airbnb2 .ab2-bub.sad{background:#ffe2e2;color:#b0002a}.mg-airbnb2 .ab2-bub.sad::after{border-top-color:#ffe2e2}
@keyframes ab2bub{from{transform:translate(-50%,-60%) scale(.3);opacity:0}}
.mg-airbnb2 .ab2-stars{position:absolute;left:50%;top:5px;transform:translateX(-50%);display:flex;gap:3px;background:#000c;padding:4px 9px;border-radius:99px;z-index:3}
.mg-airbnb2 .ab2-stars img{width:24px;height:20px;image-rendering:pixelated;animation:ab2star .45s cubic-bezier(.3,1.8,.5,1) both}
@keyframes ab2star{from{transform:scale(0) rotate(-120deg);opacity:0}}
.mg-airbnb2 .ab2-noti{position:absolute;left:8px;right:8px;top:8px;z-index:25;background:#fffffff4;color:#222;border-radius:14px;padding:7px 10px;display:flex;gap:9px;align-items:center;box-shadow:0 6px 18px #0009;transform:translateY(-140%);transition:transform .35s cubic-bezier(.3,1.4,.5,1);pointer-events:none}
.mg-airbnb2 .ab2-noti.on{transform:none}
.mg-airbnb2 .ab2-noti img{width:28px;height:28px;padding:4px;image-rendering:pixelated;border-radius:8px;background:#4fc3f7;flex:0 0 auto}
.mg-airbnb2 .ab2-noti div{flex:1;min-width:0;font-size:12.5px;line-height:1.3;font-weight:700}
.mg-airbnb2 .ab2-noti div b{display:block;font-size:10.5px;color:#2a8ab8;font-weight:800}
.mg-airbnb2 .ab2-noti em{font-style:normal;font-size:10.5px;color:#999;align-self:flex-start}
.mg-airbnb2 .ab2-noti.red div b{color:#e0244a}
.mg-airbnb2 .ab2-title{position:absolute;inset:0;z-index:24;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0b0c16d0;opacity:0;pointer-events:none;transition:opacity .25s}
.mg-airbnb2 .ab2-title.on{opacity:1}
.mg-airbnb2 .ab2-title small{color:#4fc3f7;font-weight:800;font-size:13px;letter-spacing:2px}
.mg-airbnb2 .ab2-title b{font-size:27px;font-weight:900;color:#fff;margin:4px 0 8px;text-shadow:0 3px 0 #0008}
.mg-airbnb2 .ab2-title.on b{animation:mgcd .55s cubic-bezier(.2,1.6,.4,1)}
.mg-airbnb2 .ab2-title span{font-size:13px;color:#ffd166;font-weight:700}
.mg-airbnb2 .ab2-lp{position:absolute;z-index:26;width:104px;height:104px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #222,0 8px 18px #000a;display:none;pointer-events:none;transform:translate(-50%,-50%);image-rendering:pixelated;background:#000}
.mg-airbnb2 .ab2-lp.on{display:block}
.mg-airbnb2 .ab2-hurry::after{content:"";position:absolute;inset:0;z-index:20;pointer-events:none;box-shadow:inset 0 0 46px #ff3b4f90;animation:ab2hurry .8s ease-in-out infinite}
@keyframes ab2hurry{50%{opacity:.25}}
.mg-airbnb2 .ab2-rev{position:absolute;inset:0;z-index:27;display:flex;align-items:center;justify-content:center;background:#0b0c16c8;opacity:0;transition:opacity .3s;pointer-events:none}
.mg-airbnb2 .ab2-rev.on{opacity:1}
.mg-airbnb2 .ab2-card{width:min(86%,290px);background:#fff;color:#222;border-radius:16px;padding:14px 14px 12px;box-shadow:0 14px 30px #000b;text-align:center;animation:ab2card .5s cubic-bezier(.3,1.5,.5,1) both}
@keyframes ab2card{from{transform:translateY(40px) scale(.8);opacity:0}}
.mg-airbnb2 .ab2-card small{display:flex;align-items:center;justify-content:center;gap:6px;color:#2a8ab8;font-weight:800;font-size:12px}
.mg-airbnb2 .ab2-card small img{width:20px;height:20px;padding:3px;border-radius:6px;background:#4fc3f7;image-rendering:pixelated}
.mg-airbnb2 .ab2-card .big{font-size:34px;font-weight:900;margin:4px 0 0;color:#f0a830;line-height:1.1}
.mg-airbnb2 .ab2-card .big span{font-size:14px;color:#999;margin-left:3px}
.mg-airbnb2 .ab2-card q{display:block;font-size:14px;font-weight:700;margin:8px 0 10px;line-height:1.45}
.mg-airbnb2 .ab2-card ul{list-style:none;margin:0;padding:8px 0 0;border-top:1px dashed #ddd;display:flex;flex-direction:column;gap:3px;font-size:12px;color:#555}
.mg-airbnb2 .ab2-card li{display:flex;justify-content:space-between;align-items:center}
.mg-airbnb2 .ab2-card li span img{width:12px;height:10px;image-rendering:pixelated}
.mg-airbnb2 .mg-foot .mg-btn{display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;padding:9px 6px}
.mg-airbnb2 .mg-foot .mg-btn img{width:22px;height:22px;image-rendering:pixelated}
.mg-airbnb2 .mg-foot .mg-btn span{color:var(--mgg)}
.mg-airbnb2 .mg-foot .mg-btn.arm{background:#4fc3f7!important;color:#05202c!important;border-color:#4fc3f7!important;animation:ab2arm .7s ease-in-out infinite}
.mg-airbnb2 .mg-foot .mg-btn.arm span{color:#05202c}
@keyframes ab2arm{50%{box-shadow:0 0 0 4px #4fc3f755}}
.mg-airbnb2 .mg-foot .mg-btn:disabled{opacity:.4}
.mg-airbnb2 .ab2-info{flex:1.3;display:flex;flex-direction:column;justify-content:center;font-size:12px;color:var(--mgm);line-height:1.35}
.mg-airbnb2 .ab2-info b{color:var(--mgf);font-size:13.5px}
@media (prefers-reduced-motion:reduce){.mg-airbnb2 .ab2-hurry::after,.mg-airbnb2 .mg-btn.arm{animation:none}}
`,
  run(host, ez, finish, skill = 0) {
    const T = ROOM_T * ez;
    let lpLeft = 1 + (skill >= 60 ? 1 : 0);
    const F = frame(host, "airbnb2", "인간 돋보기", "mg-ab2st", "", `<button class="mg-btn" data-lp><img src="${loupeIcon()}" alt="">돋보기 <span>${lpLeft}</span></button><div class="ab2-info"><span>지금 방에서</span><b>다른 곳 5개 찾기</b></div>`);
    const dateS = `'${String(24 + rint(2))}.${String(1 + rint(12)).padStart(2, "0")}.${String(1 + rint(28)).padStart(2, "0")}`;
    F.stage.insertAdjacentHTML("beforeend", `<div class="ab2-w"><div class="ab2-ph"><i class="ab2-tape"></i><canvas class="ab2-c ab2-t" width="${W}" height="${H}"></canvas><b><span>지난번 손님 맞이 사진 · 완벽!</span><em>${dateS}</em></b></div>
      <div class="ab2-now"><canvas class="ab2-c ab2-b" width="${W}" height="${H}"></canvas><span class="ab2-tag">지금 방</span><span class="ab2-dots">${"<i></i>".repeat(ND)}</span><div class="ab2-ov"></div></div></div>
      <div class="ab2-noti"><img src="${houseIcon()}" alt=""><div><b>에어씨앤씨</b><span></span></div><em>지금</em></div><div class="ab2-title"></div>
      <canvas class="ab2-lp" width="26" height="26"></canvas><canvas class="ab2-lp" width="26" height="26"></canvas><div class="ab2-rev"></div>`);
    const $ = (s) => F.stage.querySelector(s);
    const cvT = $(".ab2-t"), cvB = $(".ab2-b"), gT = cvT.getContext("2d"), gB = cvB.getContext("2d"), ph = $(".ab2-ph"), now = $(".ab2-now"), ov = $(".ab2-ov"), dots = [...F.stage.querySelectorAll(".ab2-dots i")];
    const noti = $(".ab2-noti"), notiT = noti.querySelector("span"), title = $(".ab2-title"), rev = $(".ab2-rev"), [lpT, lpB] = F.stage.querySelectorAll(".ab2-lp"), lpBtn = F.foot.querySelector("[data-lp]"), info = F.foot.querySelector(".ab2-info");
    [gT, gB].forEach((g) => (g.imageSmoothingEnabled = false));
    lpT.getContext("2d").imageSmoothingEnabled = false; lpB.getContext("2d").imageSmoothingEnabled = false;
    // 크기: 두 장이 무대에 들어가게, 기기 픽셀에 맞춰 확대
    const fit = () => {
      const sw = F.stage.clientWidth, sh2 = F.stage.clientHeight; if (!sw || !sh2) return;
      const dpr = window.devicePixelRatio || 1; let K = Math.min((sw - 24) / W, (sh2 - 54) / (2 * H)); K = Math.max(1, Math.floor(K * dpr) / dpr);
      for (const c of [cvT, cvB]) { c.style.width = W * K + "px"; c.style.height = H * K + "px"; }
    };
    fit(); requestAnimationFrame(fit);
    const sT = mkC(W, H), sB = mkC(W, H), gs = sB.getContext("2d"), gts = sT.getContext("2d");
    const order = shuffle(ROOMS).slice(0, NR);
    let ri = -1, R = null, flip = false, phase = "intro", ph0 = 0, tt = 0, done = false, raf = 0, penalty = 0, misses = 0, lastMiss = -9, ev = 0, lpOn = false, lpArm = false, lpT0 = 0, lpP = null, guest = null;
    const res = [];
    const fxs = [], xs = [], hearts = [];
    const P = (x, y, w, h, c) => { gs.fillStyle = c; gs.fillRect(x, y, w, h); };
    const left = () => (phase === "play" ? Math.max(0, T - (tt - ph0) - penalty) : phase === "intro" ? T : 0);
    const found = () => (R ? R.slots.filter((s) => s.ch && s.fx).length : 0);
    const upd = () => { const f = found(); F.sc.textContent = `방 ${ri + 1}/${NR} · ${f}/${ND}`; dots.forEach((d, i) => d.classList.toggle("on", i < f)); };
    const notify = (t, red) => { notiT.textContent = t; noti.classList.toggle("red", !!red); noti.classList.add("on"); tone(1318, 0.07, "sine", 0.1); tone(1760, 0.12, "sine", 0.1, 0, 0.09); vib(20); clearTimeout(notify.t); notify.t = setTimeout(() => noti.classList.remove("on"), 2100); };
    // 좌표: 화면 → 장면(좌우 뒤집힘 반영), 장면 → 무대
    const toScene = (e, cv) => { const r = cv.getBoundingClientRect(); let x = ((e.clientX - r.left) / r.width) * W; const y = ((e.clientY - r.top) / r.height) * H; if (flip) x = W - x; return [x, y]; };
    const stXY = (cv, sx, sy) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(), dx = flip ? W - sx : sx; return [r.left - s.left + (dx / W) * r.width, r.top - s.top + (sy / H) * r.height]; };
    const ovXY = (sx, sy) => [((flip ? W - sx : sx) / W) * 100, (sy / H) * 100];
    const cen = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];
    const stars = (x, y, n, sp = 10) => { for (let i = 0; i < n; i++) fxs.push({ x: x + (rnd() - 0.5) * sp * 2, y: y + (rnd() - 0.5) * sp, t0: tt + rnd() * 0.2, l: 0.45 + rnd() * 0.3 }); };
    const star = (g, x, y, p) => { const k = Math.max(1, Math.round((p < 0.5 ? p : 1 - p) * 6)); x = Math.round(x); y = Math.round(y); g.globalAlpha = 1 - p * 0.4; g.fillStyle = "#fff3a0"; g.fillRect(x - k, y, 2 * k + 1, 1); g.fillRect(x, y - k, 1, 2 * k + 1); g.fillStyle = "#ffffff"; g.fillRect(x, y, 1, 1); g.globalAlpha = 1; };
    // 손으로 그린 듯한 동그라미(살짝 넘치게)
    const ring = (g, b, prog, col, seed) => {
      const [cx, cy] = cen(b), rx = b[2] / 2 + 2, ry = b[3] / 2 + 2, n = Math.ceil((rx + ry) * 3.2);
      for (let i = 0; i <= n * prog * 1.08; i++) { const a = -2.2 + (i / n) * 6.283, wob = 1 + 0.07 * Math.sin(a * 3 + seed), x = Math.round(cx + Math.cos(a) * rx * wob), y = Math.round(cy + Math.sin(a) * ry * wob); g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(x + 1, y + 1, 1, 1); g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    };
    const blit = (g, src) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); if (flip) g.setTransform(-1, 0, 0, 1, W, 0); g.drawImage(src, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); };
    // ── 방 시작: 제목 카드 → 사진이 툭 → 지금 방
    const startRoom = () => {
      ri++; R = order[ri](); flip = rnd() < 0.5; penalty = 0; ev = 0; guest = null; fxs.length = 0; xs.length = 0; hearts.length = 0; ov.innerHTML = ""; now.classList.remove("arr");
      F.stage.classList.remove("ab2-hurry"); F.bar.parentElement.classList.remove("warn");
      const pool = shuffle(R.slots); pool.slice(0, ND).forEach((s) => { s.ch = true; s.fx = false; s.seed = rnd() * 6; });
      R.top = mkC(W, H); paint(R.top.getContext("2d"), R, () => 0);
      title.innerHTML = `<small>방 ${ri + 1} / ${NR}</small><b>${R.n}</b><span>체크인까지 ${Math.round(T)}초</span>`; title.classList.add("on");
      info.innerHTML = `<span>방 ${ri + 1}/${NR} · ${R.n}</span><b>다른 곳 5개 찾기</b>`;
      phase = "intro"; ph0 = tt; upd(); F.bar.style.transform = "scaleX(1)";
      SFX.whoosh();
      setTimeout(() => { if (!cvB.isConnected) return; title.classList.remove("on"); ph.classList.remove("drop"); void ph.offsetWidth; ph.classList.add("drop"); noise(0.05, 3200, 0.1); tone(1400, 0.04, "square", 0.05, 0, 0.05); now.classList.remove("fadein"); void now.offsetWidth; now.classList.add("fadein"); }, 900);
      setTimeout(() => { if (!cvB.isConnected || done) return; phase = "play"; ph0 = tt; F.msg("사진과 다른 곳을 아래에서 톡!"); }, 1350);
    };
    // ── 톡
    const tapAt = (sx, sy) => {
      if (phase !== "play") return;
      let best = null, ba = 1e9, done1 = null;
      for (const s of R.slots) { if (!s.ch) continue; for (const b of s.box) { if (sx >= b[0] - 3 && sx <= b[0] + b[2] + 3 && sy >= b[1] - 3 && sy <= b[1] + b[3] + 3) { const a = b[2] * b[3]; if (s.fx) { done1 = s; continue; } if (a < ba) { ba = a; best = [s, b]; } } } }
      if (best) {
        const [s] = best; s.fx = true; s.fxT = tt; s.at = best[1];
        const c = cen(best[1]); F.hit(stXY(cvB, c[0], c[1]), 1, "#ff6680"); F.msg(s.fix);
        tone(1200, 0.05, "square", 0.04); setTimeout(() => { if (!cvB.isConnected) return; const k = s.snd; if (k === "whoosh") SFX.whoosh(); else if (k === "sweep") SFX.sweep(); else if (k === "click") { tone(1800, 0.03, "square", 0.08); tone(900, 0.05, "square", 0.06, 0, 0.04); } else SFX.pop(); stars(c[0], c[1], 6, Math.max(6, best[1][2] / 2)); }, 200);
        upd();
        if (found() >= ND) { res.push({ f: ND, left: left() }); phase = "clear"; ph0 = tt; }
        return;
      }
      if (done1) { F.msg(`${done1.n}${done1.n.match(/[가-힣]$/) && (done1.n.charCodeAt(done1.n.length - 1) - 0xac00) % 28 ? "은" : "는"} 이미 찾았어요`); SFX.tok(); return; }
      if (tt - lastMiss < 0.3) return; lastMiss = tt;
      misses++; penalty += 1; xs.push({ x: sx, y: sy, t0: tt }); F.miss(stXY(cvB, sx, sy)); F.float(stXY(cvB, sx, sy - 6), "-1초", "bad");
    };
    // ── 돋보기: 버튼 → 사진을 꾹 누르고 움직이면 두 사진의 같은 곳이 크게
    const lpShow = (sx, sy) => {
      for (const [lp, cv, src] of [[lpT, cvT, sT], [lpB, cvB, sB]]) {
        const g = lp.getContext("2d"), dx = flip ? W - sx : sx; g.imageSmoothingEnabled = false; g.fillStyle = "#000"; g.fillRect(0, 0, 26, 26);
        g.drawImage(cv, Math.round(dx - 13), Math.round(sy - 13), 26, 26, 0, 0, 26, 26); void src;
        const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect();
        let lx = r.left - s.left + (dx / W) * r.width, ly = r.top - s.top + (sy / H) * r.height;
        if (cv === cvB) ly -= 64; lp.style.left = clamp(lx, 54, s.width - 54) + "px"; lp.style.top = clamp(ly, 54, s.height - 54) + "px"; lp.classList.add("on");
      }
    };
    const lpEnd = () => { if (!lpOn) return; lpOn = false; lpP = null; lpT.classList.remove("on"); lpB.classList.remove("on"); now.classList.remove("lp"); };
    lpBtn.onclick = () => {
      if (phase !== "play" || lpOn) return;
      if (lpLeft <= 0) { F.msg("돋보기는 다 썼어요"); return; }
      lpArm = !lpArm; lpBtn.classList.toggle("arm", lpArm); now.classList.toggle("lp", lpArm); SFX.tok();
      if (lpArm) F.msg("사진을 꾹 누른 채 움직여 보세요");
    };
    const down = (e, cv) => {
      e.preventDefault(); if (done) return;
      const [sx, sy] = toScene(e, cv);
      if (lpArm && phase === "play") {
        lpArm = false; lpOn = true; lpT0 = tt; lpLeft--; lpBtn.classList.remove("arm"); lpBtn.querySelector("span").textContent = lpLeft; if (!lpLeft) lpBtn.disabled = true;
        lpP = { id: e.pointerId, cv, x: sx, y: sy }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} tone(700, 0.08, "sine", 0.08, 500); vib(10); return;
      }
      if (cv === cvT) { if (phase === "play") { F.msg("위는 사진이에요. 아래 지금 방에서 톡!"); SFX.tok(); } return; }
      tapAt(sx, sy);
    };
    for (const cv of [cvT, cvB]) {
      cv.addEventListener("pointerdown", (e) => down(e, cv));
      cv.addEventListener("pointermove", (e) => { if (lpOn && lpP && e.pointerId === lpP.id) { const [sx, sy] = toScene(e, lpP.cv); lpP.x = clamp(sx, 0, W); lpP.y = clamp(sy, 0, H); } });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((k) => cv.addEventListener(k, (e) => { if (lpOn && lpP && e.pointerId === lpP.id) lpEnd(); }));
    }
    // ── 손님 등장
    const arrive = () => {
      phase = "arrive"; ph0 = tt; now.classList.add("arr"); lpEnd(); lpArm = false; lpBtn.classList.remove("arm"); now.classList.remove("lp"); F.stage.classList.remove("ab2-hurry"); F.bar.parentElement.classList.remove("warn");
      const r = res[res.length - 1], st = clamp(r.f, 1, 5);
      r.st = st;
      const p = { spec: uSpec(pick(["student", "worker", "plain", "teen", "elder"])), cache: {} }, d = R.door, sx = d.x + d.w / 2, sy = R.FL + 1;
      guest = { p, sx, sy, mx: sx, my: 86, tx: R.spot[0], ty: R.spot[1], st, bag: pick(["#4f7bd9", "#e0a030", "#c94f6a", "#3e9e6a", "#8a5fc0"]) };
      tone(988, 0.3, "sine", 0.16); tone(784, 0.45, "sine", 0.16, 0, 0.3); vib([20, 60, 20]);
      setTimeout(() => { if (cvB.isConnected) for (let k = 0; k < 8; k++) noise(0.035, 260 + rnd() * 160, 0.1, k * 0.07, 3); }, 500);
      setTimeout(() => {
        if (!cvB.isConnected) return;
        const lines = { 5: ["와아~ 사진이랑 똑같아요!", "완벽해요! 호텔인 줄", "우와, 반짝반짝!"], 4: ["우와 깔끔해요~", "좋은데요? 마음에 들어요"], 3: ["음… 괜찮네요", "나쁘지 않아요"], 2: ["어… 이건 뭐죠?", "사진이랑 좀 다른데요?"], 1: ["청소… 하신 거 맞죠?", "사진이랑 너무 달라요!"] };
        const [bx, by] = ovXY(guest.tx, guest.ty - 33);
        ov.insertAdjacentHTML("beforeend", `<div class="ab2-bub ${st <= 2 ? "sad" : ""}" style="left:${clamp(bx, 18, 82)}%;top:${by}%">${pick(lines[st])}</div><div class="ab2-stars">${[0, 1, 2, 3, 4].map((i) => `<img src="${starImg(i < st)}" alt="" style="animation-delay:${0.25 + i * 0.13}s">`).join("")}</div>`);
        if (st >= 4) { for (let k = 0; k < 6; k++) hearts.push({ x: guest.tx + (rnd() - 0.5) * 14, y: guest.ty - 30, t0: tt + k * 0.12 }); }
        else if (st <= 2) SFX.fail();
        for (let i = 0; i < 5; i++) setTimeout(() => { if (!cvB.isConnected) return; if (i < st) SFX.ding(i); else tone(220, 0.06, "square", 0.05); }, 250 + i * 130);
      }, 1700);
      setTimeout(() => { if (!cvB.isConnected || done) return; if (ri + 1 < NR) startRoom(); else review(); }, 3700);
    };
    // ── 마지막: 손님 리뷰 카드 → 결과
    const review = () => {
      phase = "end"; const tf = res.reduce((a, r) => a + r.f, 0), avg = res.reduce((a, r) => a + r.st, 0) / res.length;
      const q = avg >= 4.6 ? "사진이랑 똑같아요. 사장님 손이 보이는 숙소!" : avg >= 3.6 ? "깔끔하고 편했어요. 또 올게요~" : avg >= 2.6 ? "괜찮았는데 군데군데 아쉬웠어요." : "사진이랑 너무 달라서 당황했어요…";
      const on = starImg(true), off = starImg(false);
      rev.innerHTML = `<div class="ab2-card"><small><img src="${houseIcon()}" alt="">에어씨앤씨 · 새 리뷰</small><div class="big">★ ${avg.toFixed(1)}<span>/ 5</span></div><q>${q}</q><ul>${res.map((r, i) => `<li><b>${r.n}</b><span>${[0, 1, 2, 3, 4].map((k) => `<img src="${k < r.st ? on : off}" alt="">`).join("")}</span></li>`).join("")}</ul></div>`;
      rev.classList.add("on"); SFX.end(); vib(25);
      const spd = res.reduce((a, r) => a + (r.f >= ND ? clamp(r.left / T / 0.45, 0, 1) : 0), 0) / res.length, fr = tf / (ND * NR), acc = tf ? clamp(1 - misses * 0.07, 0, 1) : 0;
      const s = fr * 0.65 + spd * 0.2 + acc * 0.15;
      setTimeout(() => { done = true; cancelAnimationFrame(raf); finish(s, `찾은 곳 <b>${tf}/${ND * NR}</b> · 평균 별점 <b>★${avg.toFixed(1)}</b>${misses ? ` · 헛손질 ${misses}번` : ""}`, "", [["찾은 곳", fr], ["속도", spd], ["정확도", acc]]); }, 2600);
    };
    // ── 그리기
    const drawDoor = () => {
      const d = R.door;
      if (phase === "arrive") {
        const o = clamp((tt - ph0 - 0.35) / 0.35, 0, 1); if (o <= 0) return;
        if (d.slide) { P(d.x, d.y, Math.round(d.w * o), d.h, "#3a2e26"); P(d.x, d.y + d.h - 6, Math.round(d.w * o), 6, "#8a6a48"); const x = d.x + Math.round(d.w * o * 0.95); P(x, d.y, d.w, d.h, d.c); for (let k = x + 3; k < x + d.w; k += 4) P(k, d.y, 1, d.h, d.wd[1]); for (const y of [14, 22, 30, 38]) P(x, y, d.w, 1, d.wd[1]); P(x, d.y, 1, d.h, d.wd[0]); }
        else { P(d.x, d.y, d.w, d.h + 1, "#2a2230"); P(d.x + 1, d.y + 1, d.w - 2, d.h - 1, "#4a3f52"); P(d.x + 1, d.y + d.h - 4, d.w - 2, 4, "#8a7a6a"); const pw = Math.max(2, Math.round(d.w * (1 - 0.8 * o))); P(d.x + d.w - pw, d.y, pw, d.h, sh(d.c, 0.78)); P(d.x + d.w - pw, d.y, 1, d.h, sh(d.c, 0.6)); }
        return;
      }
      if (phase !== "play") return;
      const f = left() / T;
      if (f < 0.32) { P(d.x, d.y + d.h - (d.slide ? 0 : 0), d.w, 1, "#ffe9a8"); P(d.x + 3, d.y + d.h, 3, 1, "#2a2020"); P(d.x + d.w - 6, d.y + d.h, 3, 1, "#2a2020"); }
      if (f < 0.18 && d.knob && Math.floor(tt * 14) % 2) { P(d.knob[0], d.knob[1], 2, 2, d.c); P(d.knob[0] + 1, d.knob[1] + 1, 2, 2, "#e8c060"); }
      if (f < 0.18 && d.slide && Math.floor(tt * 14) % 2) P(d.x + 11, d.y + 18, 1, 5, d.wd[2]);
    };
    const drawGuest = () => {
      if (!guest) return; const t = tt - ph0 - 0.6; if (t < 0) return;
      const G = guest, t1 = 0.55, t2 = 1.05; let x, y, v, fl = false, fr = Math.floor(t * 9) % 4;
      if (t < t1) { const p = t / t1; x = G.sx; y = G.sy + (G.my - G.sy) * p; v = "f"; }
      else if (t < t1 + t2) { const p = (t - t1) / t2; x = G.sx + (G.tx - G.sx) * p; y = G.my + (G.ty - G.my) * p; v = "s"; fl = G.tx < G.sx; }
      else { x = G.tx; y = G.ty; v = "f"; fr = 0; }
      x = Math.round(x); y = Math.round(y);
      const sp = uSprite(G.p, v + fr + (fl ? "l" : ""), { v, f: fr }, fl);
      P(x - 6, y, 12, 1, "rgba(0,0,0,.25)");
      if (v === "s") bagP(P, fl ? x + 6 : x - 12, y + 1, G.bag); else if (t < t1) bagP(P, x + 7, y + 1, G.bag);
      gs.drawImage(sp, x - 8, y - 31);
      if (t >= t1 + t2) bagP(P, x + 7, y + 1, G.bag);
    };
    const render = () => {
      // 위: 완벽했던 사진 + 찾은 곳 동그라미
      gts.drawImage(R.top, 0, 0);
      gts.fillStyle = "rgba(255,236,200,.07)"; gts.fillRect(0, 0, W, H);
      for (const s of R.slots) if (s.ch && s.fx) ring(gts, s.at, clamp((tt - s.fxT) / 0.22, 0, 1), "#ff3355", s.seed);
      // 아래: 지금 방
      paint(gs, R, (s) => (s.ch ? (s.fx ? clamp(1 - (tt - s.fxT - 0.2) / 0.3, 0, 1) : 1) : 0));
      drawDoor(); drawGuest();
      for (const s of R.slots) {
        if (!s.ch) continue;
        if (s.fx) ring(gs, s.at, clamp((tt - s.fxT) / 0.22, 0, 1), "#ff3355", s.seed);
        else if (phase === "reveal" && Math.floor((tt - ph0) * 6) % 2 === 0) { ring(gs, s.box[s.box.length - 1], 1, "#ffd23f", s.seed); ring(gts, s.box[s.box.length - 1], 1, "#ffd23f", s.seed); }
      }
      for (const m of xs) { const p = (tt - m.t0) / 0.7; if (p > 1) continue; gs.globalAlpha = 1 - p; const x = Math.round(m.x), y = Math.round(m.y); for (let k = -2; k <= 2; k++) { P(x + k, y + k, 1, 1, "#ff2244"); P(x + k, y - k, 1, 1, "#ff2244"); } gs.globalAlpha = 1; }
      for (const s of fxs) { const p = (tt - s.t0) / s.l; if (p >= 0 && p <= 1) star(gs, s.x, s.y, p); }
      for (const h of hearts) { const p = (tt - h.t0) / 1.1; if (p < 0 || p > 1) continue; gs.globalAlpha = 1 - p; const x = Math.round(h.x + Math.sin(p * 9) * 2), y = Math.round(h.y - p * 16); P(x, y, 2, 1, "#ff5a7a"); P(x + 3, y, 2, 1, "#ff5a7a"); P(x, y + 1, 5, 1, "#ff5a7a"); P(x + 1, y + 2, 3, 1, "#ff5a7a"); P(x + 2, y + 3, 1, 1, "#ff5a7a"); gs.globalAlpha = 1; }
      // 다 찾으면 빛줄기
      if (phase === "clear") { const p = (tt - ph0) / 0.8, x0 = -40 + p * 200; gs.save(); gs.globalCompositeOperation = "lighter"; gs.fillStyle = "rgba(255,255,235,.32)"; gs.beginPath(); gs.moveTo(x0, 0); gs.lineTo(x0 + 18, 0); gs.lineTo(x0 - 22, H); gs.lineTo(x0 - 40, H); gs.closePath(); gs.fill(); gs.restore(); }
      if (phase === "intro") { gs.fillStyle = "rgba(10,10,20,.55)"; gs.fillRect(0, 0, W, H); }
      blit(gT, sT); blit(gB, sB);
      if (lpOn && lpP) lpShow(lpP.x, lpP.y);
    };
    let lastS = -1;
    const loop = (nowT) => {
      if (done || !cvB.isConnected) return;
      const nt = (nowT - t0) / 1000; tt = nt;
      for (let i = fxs.length - 1; i >= 0; i--) if (tt - fxs[i].t0 > fxs[i].l) fxs.splice(i, 1);
      if (phase === "play") {
        const l = left(), f = l / T;
        F.bar.style.transform = `scaleX(${clamp(f, 0, 1)})`;
        if (ev === 0 && f < 0.6) { ev = 1; for (let k = 0; k < 12; k++) noise(0.04, 240 + rnd() * 180, 0.13, k * 0.085, 3); notify("손님이 숙소 근처에 도착했어요 (5분 전)"); F.msg("복도에서 캐리어 소리… 드르륵"); }
        if (ev === 1 && f < 0.32) { ev = 2; [0, 0.16, 0.32].forEach((a) => noise(0.06, 180, 0.35, a, 2)); notify("손님: 문 앞이에요~ 들어가도 되죠?", true); vib([30, 50, 30]); F.stage.classList.add("ab2-hurry"); F.bar.parentElement.classList.add("warn"); }
        const s = Math.ceil(l); if (l < 5 && s !== lastS) { lastS = s; SFX.tick(); }
        if (lpOn && tt - lpT0 > 3) lpEnd();
        if (l <= 0) { const f2 = found(); res.push({ f: f2, left: 0 }); phase = "reveal"; ph0 = tt; lpEnd(); F.msg(`놓친 곳 ${ND - f2}곳… 손님 도착!`); SFX.fail(); }
      } else if (phase === "clear" && tt - ph0 > 0.85) arrive();
      else if (phase === "reveal" && tt - ph0 > 1.3) arrive();
      if (phase === "clear" && !R.clr) { R.clr = 1; F.msg("검수 끝! 완벽해요"); SFX.end(); stars(W / 2, H / 2, 14, 50); for (let k = 0; k < 4; k++) setTimeout(() => F.burst([F.stage.clientWidth * (0.2 + rnd() * 0.6), F.stage.clientHeight * (0.5 + rnd() * 0.4)], "#fff7c2", 10), k * 140); }
      if (res.length && !res[res.length - 1].n) res[res.length - 1].n = R.n;
      render();
      raf = requestAnimationFrame(loop);
    };
    if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.airbnb2 = {
      st: () => ({ phase, room: ri, found: found(), misses, left: left() }),
      tgt: () => { const s = R && R.slots.find((q) => q.ch && !q.fx); if (!s) return null; const c = cen(s.box[s.box.length - 1]), r = cvB.getBoundingClientRect(); return [r.left + ((flip ? W - c[0] : c[0]) / W) * r.width, r.top + (c[1] / H) * r.height, cvB]; },
      hit: () => { if (!R) return false; const s = R.slots.find((q) => q.ch && !q.fx); if (!s) return false; const c = cen(s.box[s.box.length - 1]); tapAt(c[0], c[1]); return true; },
      miss: () => { for (let k = 0; k < 200; k++) { const x = 2 + rnd() * (W - 4), y = 2 + rnd() * (H - 4); if (R.slots.every((s) => s.box.every((b) => x < b[0] - 5 || x > b[0] + b[2] + 5 || y < b[1] - 5 || y > b[1] + b[3] + 5))) { tapAt(x, y); return true; } } return false; },
      loupe: (x = 60, y = 50) => { lpArm = true; lpOn = true; lpT0 = tt; lpP = { id: -1, cv: cvB, x, y }; },
    };
    const t0 = performance.now();
    startRoom();
    raf = requestAnimationFrame(loop);
  },
};
