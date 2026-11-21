// 미니게임 3탄(insta3) "릴스 편집": 퇴근 후 찍어 둔 영상(여행·음식·운동·내 얼굴)을 음악 박자에 맞춰 자르는 리듬 편집기.
// 위는 세로 미리보기, 아래는 타임라인. 가위 표시가 빨간 선에 닿을 때 톡 = 컷. 보라 화살표 = 그 방향으로 쓱(전환 효과).
// 노란 자막 막대 = 꾹 눌렀다가 끝에서 떼기. 정박이면 Perfect, 어긋나면 화면이 튄다. 끝나면 내가 편집한 릴스가 박자대로 재생되고 조회수가 터진다.
// 음악은 tone·noise 로 직접 짠 드럼+베이스 루프(BPM 96). 소리와 화면은 같은 시계(performance.now)로 맞춘다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const BPM = 96, SPB = 60 / BPM, T = 30;
// 차트: [박, 종류(c 컷 / s 전환 / h 자막), 방향 또는 끝 박]
const CHART = [
  [4, "c"], [6, "c"], [8, "c"], [10, "c"], [12, "c"], [13, "c"], [14, "c"],
  [16, "s", "r"], [18, "s", "l"], [20, "s", "u"], [22, "s", "r"], [24, "s", "d"], [26, "s", "l"],
  [28, "h", 30], [31, "c"], [32, "h", 34], [35, "c"],
  [36, "c"], [37, "c"], [38, "c"], [39, "c"], [40, "c"], [40.5, "c"], [41, "c"], [42, "c"], [43, "c"], [44, "c"], [44.5, "c"], [45, "c"], [46, "s", "r"], [47, "c"],
];
const SECS = [
  { b: 0, k: "c", n: "컷 편집!", s: "가위가 빨간 선에 닿을 때 톡" },
  { b: 15, k: "s", n: "전환 효과!", s: "화살표 방향으로 쓱 밀기" },
  { b: 27, k: "h", n: "자막 타이밍!", s: "꾹 눌렀다가 막대 끝에서 떼기" },
  { b: 35, k: "c", n: "클라이맥스!", s: "몰아치는 컷, 박자만 믿어요" },
];
const PLAY = ["beach", "ramen", "run", "me", "plane", "cake", "gym", "me", "city", "ramen", "beach", "cake", "run", "me", "city", "gym", "plane", "me"];
const SCOL = { beach: "#4fb8f0", plane: "#8fc0ff", ramen: "#f0a050", cake: "#ff9ec8", run: "#ff7a4a", gym: "#8a90c8", city: "#7a6ae0", me: "#ff5f9e" };
const SUBS = ["퇴근 후 6시, 2막 시작", "오늘의 한 끼는 이거", "본업 끝! 이제 내 시간", "이 맛에 투잡하지", "땀 흘린 만큼 개운", "내일도 출근ㅋㅋ"];
const GOODC = ["박자 미쳤다 ㄷㄷ", "편집 장인 등장", "이거 몇 번째 보는지ㅋㅋ", "컷 전환 소름", "노래 제목 뭐예요?", "퇴근하고 이걸 만든다고요?", "저장했어요!!"];
const MIDC = ["오 괜찮은데요?", "음악 좋다~", "다음 편도 올려 주세요", "라멘 맛집 어디예요?"];
const BADC = ["뭔가 엇박…ㅋㅋ", "음악 따로 영상 따로", "편집 연습 중이신가요?", "화면 왜 튀어요ㅋㅋ"];
const ARW = { r: "→", l: "←", u: "↑", d: "↓" };
const DV = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
const NEON = ["..XX...XX..", ".X..X.X..X.", "X....X....X", "X.........X", ".X.......X.", "..X.....X..", "...X...X...", "....X.X....", ".....X....."];
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
const HCOL = ["#ff4f8b", "#ff7eb6", "#ff3b5c", "#ffd166", "#c77dff"];

const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
const tint = (c, f) => "#" + hex(c).map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join("");
const fmtV = (n) => (n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "만" : Math.round(n).toLocaleString());
function outline(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 200;
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) add.push((y * W + x) * 4);
  for (const i of add) { a[i] = 26; a[i + 1] = 16; a[i + 2] = 34; a[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}
function fingerURL() {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, 12 - y, 1, 1); }));
  return c.toDataURL();
}

// ── 영상 장면(도트). P: 칠하기, t: 시간(초), bp: 박 안의 위치 0~1, W·H: 미리보기 크기 ──
function vgrad(P, x, y, w, h, c1, c2) { for (let i = 0; i < h; i++) P(x, y + i, w, 1, mix(c1, c2, h > 1 ? i / (h - 1) : 0)); }
function disc(P, cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y) + 0.35); P(cx - w, cy + y, w * 2 + 1, 1, c); } }
function cloud(P, x, y, c = "#fff", s = "#e4eef8") { x = Math.round(x); P(x + 3, y, 7, 2, c); P(x + 1, y + 2, 13, 3, c); P(x, y + 4, 16, 2, c); P(x + 9, y - 1, 4, 2, c); P(x + 1, y + 5, 15, 1, s); }
const SC = {
  beach(g, P, t, bp, W, H) {
    const hz = Math.round(H * 0.48), sy1 = hz + Math.round(H * 0.22);
    vgrad(P, 0, 0, W, hz, "#3f9cf2", "#ffd7a3");
    g.globalAlpha = 0.22; disc(P, 44, hz - 22, 10, "#fff2b0"); g.globalAlpha = 1; disc(P, 44, hz - 22, 6, "#ffe36a"); disc(P, 43, hz - 23, 3, "#fff6c8");
    cloud(P, ((t * 4) % (W + 24)) - 18, 10); cloud(P, ((t * 2.5 + 40) % (W + 24)) - 18, 22, "#fff8f0", "#f0d8c8");
    for (let k = 0; k < 2; k++) { const gx = Math.round(((t * 9 + k * 30) % (W + 10)) - 5), gy = 30 + k * 8 + Math.round(Math.sin(t * 3 + k) * 2), f = Math.floor(t * 6 + k) % 2; P(gx, gy + f, 1, 1, "#2a2a3a"); P(gx + 1, gy + 1 - f, 1, 1, "#2a2a3a"); P(gx + 2, gy + f, 1, 1, "#2a2a3a"); }
    vgrad(P, 0, hz, W, sy1 - hz, "#2a8ad0", "#5cc8ea");
    for (let y = hz + 2; y < sy1; y += 3) for (let k = 0; k < 4; k++) { const x = Math.round((k * 17 + y * 5 + t * (6 + (y - hz) * 0.5)) % (W + 6)) - 3; P(x, y, 2 + ((y - hz) >> 3), 1, "#bfeaff"); }
    for (let y = hz + 1; y < sy1 - 2; y += 2) if ((y + Math.floor(t * 7)) % 3) P(42 + ((y * 7) % 5) - 2, y, 3, 1, "#fff3b0");
    const fy = sy1 + Math.round(Math.sin(t * 2.2) * 1.5);
    P(0, sy1, W, H - sy1, "#f0cf94"); P(0, sy1, W, Math.max(0, fy - sy1 + 3), "#d9b77c"); P(0, fy, W, 2, "#ffffff"); for (let x = (Math.floor(t * 3) % 4); x < W; x += 5) P(x, fy + 2, 2, 1, "#ffffffaa");
    for (let i = 0; i < 26; i++) P((i * 23) % W, sy1 + 6 + ((i * 13) % (H - sy1 - 7)), 1, 1, "#d8b070");
    // 야자수
    const sway = Math.sin(t * 1.4) * 1.2; let tx = 0, ty = 0;
    for (let i = 0; i < 44; i++) { const y = H - 4 - i, x = 6 + Math.round(Math.sin((i / 44) * 1.7) * 8 + (i / 44) * sway); P(x, y, 3, 1, i % 4 === 0 ? "#6a3e1c" : "#9a6230"); tx = x + 1; ty = y; }
    for (const a of [-2.7, -2.1, -1.4, -0.5, 0.15, -3.1]) { for (let s = 0; s < 14; s++) { const aa = a + Math.sin(t * 1.4) * 0.06, x = Math.round(tx + Math.cos(aa) * s), y = Math.round(ty + Math.sin(aa) * s * 0.55 + s * s * 0.045); P(x, y, 2, 1, s % 3 ? "#2f9a4a" : "#46c060"); P(x, y + 1, 2, 1, "#1e6e34"); } }
    P(tx - 1, ty + 1, 2, 2, "#7a4a22"); P(tx + 2, ty + 2, 2, 2, "#6a3e1c");
    // 파라솔
    const ux = 47, uy = H - 26; P(ux, uy, 1, 18, "#f2f2f2");
    for (let r = 0; r < 6; r++) for (let x = -r * 2 - 1; x <= r * 2 + 1; x++) P(ux + x, uy - 6 + r, 1, 1, Math.floor((x + 20) / 3) % 2 ? "#ff5a5a" : "#fff");
    P(ux - 12, H - 9, 14, 4, "#ffd166"); P(ux - 12, H - 9, 14, 1, "#fff3b0"); P(ux - 8, H - 9, 2, 4, "#ff7eb6");
  },
  plane(g, P, t, bp, W, H) {
    vgrad(P, 0, 0, W, H, "#e8e2d4", "#cfc6b4");
    for (let y = 8; y < H; y += 26) P(0, y, W, 1, "#bdb4a2");
    const cx = W / 2, cy = H * 0.48, rx = W * 0.32, ry = H * 0.3;
    for (let y = Math.floor(cy - ry - 4); y <= cy + ry + 4; y++) for (let x = Math.floor(cx - rx - 4); x <= cx + rx + 4; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1.32) continue;
      if (d > 1) { P(x, y, 1, 1, d > 1.2 ? "#a89e8a" : "#f4efe4"); continue; }
      const v = (y - (cy - ry)) / (2 * ry);
      let c = mix("#2f7fe0", "#cfeaff", v);
      // 구름 바다 + 지나가는 구름
      const cloudY = cy + ry * 0.35 + Math.sin((x + t * 10) * 0.35) * 1.6;
      if (y > cloudY) c = y > cloudY + 2 ? "#f6f9ff" : "#ffffff";
      const px = (x + t * 26) % 40, py = y - (cy - ry * 0.2);
      if (px > 4 && px < 16 && py > 0 && py < 4 && !((px < 6 || px > 14) && py < 1)) c = "#ffffff";
      if (y < cy - ry * 0.62) c = y < cy - ry * 0.66 ? "#ddd4c2" : "#b8ad98";
      P(x, y, 1, 1, c);
    }
    P(Math.round(cx) - 3, Math.round(cy - ry * 0.66) - 2, 6, 2, "#9a907c");
    // 날개
    const wy = Math.round(cy + ry * 0.42);
    for (let i = 0; i < 18; i++) { const x = Math.round(cx + 2 + i), y = wy - Math.round(i * 0.45); const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d < 1) P(x, y, 1, 3 + (i < 10 ? 1 : 0), i % 5 ? "#c8ccd8" : "#9aa0b0"); }
    if (Math.floor(t * 2) % 2) P(Math.round(cx + 17), wy - 8, 2, 1, "#ff3b3b");
    P(4, H - 18, W - 8, 1, "#b8ad98"); P(8, H - 16, 12, 6, "#7a6a58"); P(9, H - 15, 10, 1, "#9a8a76");
  },
  ramen(g, P, t, bp, W, H) {
    P(0, 0, W, H, "#5a3620"); for (let y = 2; y < H; y += 5) for (let x = (y * 3) % 7; x < W; x += 13) P(x, y, 7, 1, "#4a2c18");
    const cx = 31, cy = Math.round(H * 0.56), R = 27;
    g.globalAlpha = 0.35; disc(P, cx + 2, cy + 3, R, "#1a0e08"); g.globalAlpha = 1;
    disc(P, cx, cy, R, "#22202c"); disc(P, cx, cy, R - 1, "#c43a3a"); disc(P, cx, cy, R - 3, "#f2e8dc");
    for (let a = 0; a < 24; a++) { const an = (a / 24) * 6.283; P(Math.round(cx + Math.cos(an) * (R - 2)), Math.round(cy + Math.sin(an) * (R - 2)), 1, 1, "#fff"); }
    disc(P, cx, cy, R - 5, "#d98a3c"); disc(P, cx - 2, cy - 2, R - 10, "#e9a254");
    for (let y = cy - 12; y < cy + 14; y += 2) for (let x = cx - 16; x < cx + 12; x++) { const d = Math.hypot(x - cx, y - cy); if (d < R - 7 && Math.sin(x * 0.8 + y) > 0.2) P(x, y + (Math.sin(x * 0.7 + y * 0.3) > 0 ? 1 : 0), 1, 1, "#ffe08a"); }
    for (const [x, y] of [[cx + 6, cy - 9], [cx + 11, cy - 2]]) { disc(P, x, y, 5, "#c06a5a"); disc(P, x, y, 4, "#e8a090"); P(x - 2, y - 1, 3, 1, "#f8d0c0"); P(x, y + 1, 2, 1, "#c06a5a"); }
    for (const [x, y] of [[cx - 10, cy + 6], [cx - 3, cy + 10]]) { disc(P, x, y, 4, "#ffffff"); disc(P, x, y, 2, "#ff9a1a"); P(x - 1, y - 1, 1, 1, "#ffd08a"); }
    P(cx - 18, cy - 14, 6, 12, "#1a2a1e"); P(cx - 17, cy - 13, 1, 10, "#2e4a34");
    for (let i = 0; i < 14; i++) P(cx - 12 + ((i * 7) % 22), cy - 6 + ((i * 11) % 16), 2, 1, i % 2 ? "#5fc060" : "#8fe080");
    const bob = Math.round(Math.sin(t * 3) * 3) - 2;
    for (let k = 0; k < 4; k++) for (let y = cy - 20 + bob; y < cy - 2; y++) P(cx + 2 + k * 2 + Math.round(Math.sin(y * 0.5 + k) * 0.8), y, 1, 1, k % 2 ? "#ffe08a" : "#f2cf6a");
    for (let i = 0; i < 34; i++) { const x = W - 2 - Math.round(i * 0.55), y = 1 + i + bob; if (y < cy - 18 + bob + 6) { P(x, y, 2, 1, "#c89058"); P(x - 4, y + 1, 2, 1, "#b07a46"); } }
    for (let k = 0; k < 3; k++) for (let i = 0; i < 14; i++) { const ph = (t * 0.7 + k * 0.33 + i * 0.02) % 1, y = Math.round(cy - 10 - ph * 34), x = Math.round(cx - 12 + k * 11 + Math.sin(ph * 9 + k) * 3); g.globalAlpha = 0.45 * (1 - ph); P(x, y, 2, 2, "#ffffff"); }
    g.globalAlpha = 1;
  },
  cake(g, P, t, bp, W, H) {
    P(0, 0, W, H, "#ffc6dc"); for (let y = 3; y < H; y += 8) for (let x = (y / 8) % 2 ? 6 : 2; x < W; x += 8) P(x, y, 2, 2, "#ffe0ec");
    P(0, H - 22, W, 22, "#fff4f8"); P(0, H - 22, W, 1, "#f0c8d8"); for (let x = 0; x < W; x += 6) P(x, H - 21, 3, 21, "#ffe8f0");
    const bx = 11, by = H - 62, bw = 40;
    g.globalAlpha = 0.3; P(bx - 2, H - 24, bw + 8, 3, "#c06a8a"); g.globalAlpha = 1;
    P(bx - 6, H - 28, bw + 12, 4, "#ffffff"); P(bx - 6, H - 25, bw + 12, 1, "#e0d0dc");
    P(bx, by, bw, 34, "#f7d58c"); P(bx, by, bw, 3, "#fffaf0"); P(bx, by + 11, bw, 3, "#fffaf0"); P(bx, by + 22, bw, 3, "#fffaf0");
    for (let x = bx + 3; x < bx + bw - 2; x += 8) { P(x, by + 11, 4, 3, "#ff4a5a"); P(x + 1, by + 12, 1, 1, "#ffd0d0"); P(x, by + 22, 4, 3, "#ff4a5a"); }
    for (let x = bx; x < bx + bw; x += 3) P(x, by + 3 + (x % 2), 2, 1, "#f0c070");
    P(bx + bw - 1, by, 1, 34, "#d8b070");
    for (let x = bx - 1; x < bx + bw + 1; x += 4) { P(x, by - 2, 4, 2, "#ffffff"); P(x + 1, by - 3, 2, 1, "#ffffff"); }
    for (const sx of [bx + 5, bx + 17, bx + 30]) { P(sx, by - 8, 6, 5, "#ff3b4a"); P(sx + 1, by - 9, 4, 1, "#ff3b4a"); P(sx + 1, by - 11, 4, 2, "#3e9e4a"); P(sx + 1, by - 7, 1, 1, "#ffe08a"); P(sx + 4, by - 6, 1, 1, "#ffe08a"); P(sx + 2, by - 5, 1, 1, "#ffe08a"); P(sx + 1, by - 8, 1, 1, "#ff9aa0"); }
    const cx = bx + bw / 2 - 1; for (let y = 0; y < 12; y++) P(cx, by - 12 - y, 2, 1, Math.floor(y / 2) % 2 ? "#7fc8ff" : "#fff");
    const fl = Math.sin(t * 17) > 0 ? 1 : 0; g.globalAlpha = 0.25 + bp * 0.2; disc(P, cx + 1, by - 29, 6, "#ffe9a8"); g.globalAlpha = 1;
    P(cx, by - 31 - fl, 2, 4 + fl, "#ffb03b"); P(cx, by - 29, 2, 2, "#fff3b0"); P(cx + (fl ? 1 : 0), by - 33 - fl, 1, 2, "#ff7a1a");
    for (let k = 0; k < 5; k++) { if ((Math.floor(t * 4) + k) % 3) continue; const x = (k * 13 + 5) % W, y = 8 + ((k * 17) % 30); P(x, y - 1, 1, 3, "#fff"); P(x - 1, y, 3, 1, "#fff"); }
  },
  run(g, P, t, bp, W, H) {
    const hz = Math.round(H * 0.42);
    vgrad(P, 0, 0, W, hz, "#ff8a5a", "#ffd88a");
    disc(P, 31, hz + 2, 9, "#fff0a0"); disc(P, 31, hz + 2, 6, "#fff8d0");
    for (let x = 0, i = 0; x < W; i++) { const w = 3 + ((i * 7) % 5), h = 4 + ((i * 11) % 9); P(x, hz - h, w, h, "#b85a5a"); x += w; }
    P(0, hz, W, H - hz, "#4a9a4a");
    for (let y = hz; y < H; y++) {
      const k = (y - hz) / (H - hz), half = 4 + k * 40, x0 = Math.round(31 - half), x1 = Math.round(31 + half);
      P(x0, y, x1 - x0, 1, "#c8553d");
      for (const l of [-0.5, 0, 0.5]) P(Math.round(31 + l * half * 2 * 0.5), y, 1, 1, "#ffe8d8");
      P(x0, y, 1, 1, "#fff"); P(x1 - 1, y, 1, 1, "#fff");
      const z = 1 / (k + 0.06); if (Math.floor(z * 1.4 - t * 8) % 2) { P(Math.max(0, x0 - 6), y, Math.min(5, x0), 1, "#3e8a3e"); P(x1 + 1, y, 5, 1, "#3e8a3e"); }
    }
    // 뒤에서 본 달리는 사람
    const f = Math.floor(t * 8) % 2, bob = f ? -1 : 0, rx = 28, ry = H - 40 + bob;
    P(rx + 1, ry, 6, 6, "#3a2418"); P(rx + 2, ry - 1, 4, 1, "#3a2418"); P(rx + 6, ry + 1, 2, 4, "#3a2418"); P(rx + 7, ry + 4 + f, 2, 3, "#3a2418");
    P(rx, ry + 6, 8, 9, "#ff5f9e"); P(rx, ry + 6, 8, 1, "#ff8fc0"); P(rx + 3, ry + 8, 2, 2, "#fff");
    P(rx - 2, ry + 7 + (f ? 2 : 0), 2, 6, "#f0c8a0"); P(rx + 8, ry + 7 + (f ? 0 : 2), 2, 6, "#f0c8a0");
    P(rx, ry + 15, 8, 4, "#2a3550");
    P(rx + 1, ry + 19, 2, f ? 6 : 4, "#f0c8a0"); P(rx + 5, ry + 19, 2, f ? 4 : 6, "#f0c8a0");
    P(rx, ry + 19 + (f ? 6 : 4), 3, 2, "#ffffff"); P(rx + 5, ry + 19 + (f ? 4 : 6), 3, 2, "#ffffff");
    g.globalAlpha = 0.25; P(rx - 1, H - 13, 11, 2, "#000"); g.globalAlpha = 1;
  },
  gym(g, P, t, bp, W, H) {
    vgrad(P, 0, 0, W, H - 26, "#3a3f5c", "#2a2e44"); for (let x = 3; x < W; x += 10) P(x, 0, 1, H - 26, "#454b6a");
    P(4, 8, W - 8, 30, "#8aa0c8"); P(5, 9, W - 10, 28, "#b8c8e8"); P(8, 12, 10, 1, "#e8f0ff"); P(9, 14, 6, 1, "#e8f0ff");
    P(0, H - 26, W, 26, "#1e2030"); for (let x = 0; x < W; x += 12) P(x, H - 26, 1, 26, "#2a2c40"); P(0, H - 26, W, 1, "#555a78");
    for (let k = 0; k < 3; k++) { const y = 44 + k * 7; P(2, y + 4, 12, 1, "#9aa0b0"); P(2, y, 3, 5, "#333648"); P(11, y, 3, 5, "#333648"); }
    // 덤벨 들기: 박자에 맞춰 위로
    const up = 1 - Math.min(1, bp * 1.6), lift = Math.round(Math.sin(up * Math.PI / 2) * 18);
    const hx = 30, hy = H - 34 - lift;
    P(hx + 2, hy + 6, 9, H - hy, "#e8b890"); P(hx + 2, hy + 6, 2, H - hy, "#d09a70"); P(hx + 9, hy + 10, 2, 20, "#d09a70");
    P(hx - 14, hy + 2, 34, 3, "#9aa0b0"); P(hx - 14, hy + 2, 34, 1, "#d0d4e0");
    for (const sx of [hx - 19, hx + 17]) { P(sx, hy - 7, 7, 21, "#1a1424"); P(sx + 1, hy - 6, 5, 19, "#d94f4f"); P(sx + 1, hy - 6, 5, 1, "#ff8a8a"); P(sx + 2, hy - 4, 1, 14, "#ff7a7a"); P(sx + 1, hy + 11, 5, 2, "#a03030"); P(sx + 2, hy + 3, 3, 1, "#fff3b0"); }
    // 거울 속 하이라이트
    P(W - 14, 12, 1, 22, "#e8f0ff88"); P(W - 11, 12, 1, 14, "#e8f0ff55");
    P(hx + 1, hy, 11, 7, "#f0c8a0"); P(hx + 1, hy, 11, 1, "#ffe0c0"); for (let k = 0; k < 3; k++) P(hx + 3 + k * 3, hy + 2, 1, 4, "#d09a70");
    if (lift > 12) { for (const dx of [-21, 25]) { P(hx + dx, hy - 2, 1, 4, "#ffffff88"); P(hx + dx + (dx < 0 ? -2 : 2), hy, 1, 3, "#ffffff55"); } }
    if (bp < 0.3) { P(hx + 14, hy - 10, 2, 3, "#9fd8ff"); P(hx + 15, hy - 7, 1, 1, "#d6f0ff"); }
    if (lift > 15) for (let k = 0; k < 4; k++) { const a = k * 1.6 + t * 4, x = Math.round(hx + 5 + Math.cos(a) * 22), y = Math.round(hy - 2 + Math.sin(a) * 9); P(x, y, 1, 1, "#ffd166"); }
  },
  city(g, P, t, bp, W, H) {
    vgrad(P, 0, 0, W, H, "#0b1030", "#3a2a66");
    for (let i = 0; i < 18; i++) { if ((Math.floor(t * 2) + i) % 5 === 0) continue; P((i * 37) % W, (i * 23) % 40, 1, 1, "#ffffffcc"); }
    disc(P, 48, 12, 5, "#fff3c8"); disc(P, 50, 11, 4, "#1a1a44");
    const bl = [[0, 44, 12], [11, 30, 10], [20, 52, 9], [28, 22, 13], [40, 38, 9], [48, 28, 14]];
    for (const [x, top, w] of bl) {
      P(x, top, w, H - top, "#151838"); P(x, top, 1, H - top, "#23285a");
      for (let y = top + 3; y < H - 14; y += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) { const on = Math.sin(xx * 3.1 + y * 1.7 + Math.floor(t * 1.5)) > -0.2; P(xx, y, 1, 2, on ? ((xx + y) % 3 ? "#ffd56a" : "#9fe0ff") : "#252a50"); }
    }
    const nf = Math.sin(t * 21) > 0.9 ? 0.4 : 1; g.globalAlpha = nf;
    P(30, 34, 9, 4, "#ff5fa8"); P(31, 35, 7, 2, "#ffc0dc"); P(5, 56, 6, 3, "#5ff0e0"); P(6, 57, 4, 1, "#d0fff8"); g.globalAlpha = 1;
    P(0, H - 14, W, 14, "#1c1c2e"); P(0, H - 8, W, 1, "#ffd166");
    for (let k = 0; k < 4; k++) { const x = Math.round(((t * 40 + k * 18) % (W + 20)) - 10); P(x, H - 11, 7, 1, "#fff3c0"); P(W - x, H - 5, 7, 1, "#ff4a4a"); }
  },
  me(g, P, t, bp, W, H, art) {
    vgrad(P, 0, 0, W, H, "#ffc8de", "#ffeaf3");
    for (let x = 0; x < W; x++) { const y = 4 + Math.round(Math.abs(Math.sin(x / W * Math.PI * 2.5)) * 3); P(x, y, 1, 1, "#7a5a6a"); if (x % 6 === 2) P(x, y + 1, 1, 2, ["#ffd166", "#ff7eb6", "#7fe0c0", "#b89cff"][(x + Math.floor(t * 3)) % 4]); }
    const nc = "#ff3b8f"; g.globalAlpha = 0.25; NEON.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "X") P(W - 16 + i, 13 + j, 3, 3, nc); })); g.globalAlpha = 1;
    NEON.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "X") P(W - 15 + i, 14 + j, 1, 1, nc); }));
    P(3, 24, 14, 20, "#fff8f0"); P(4, 25, 12, 18, "#9fd0ff"); P(4, 36, 12, 7, "#7fb860"); P(9, 25, 1, 18, "#fff8f0");
    P(0, H - 30, 12, 30, "#e8c0d0"); P(W - 10, H - 40, 10, 40, "#d8b0c8");
    if (!art) {
      const cx = W / 2 | 0, hy = Math.round(H * 0.36);
      P(cx - 16, hy + 22, 32, H - hy - 22, "#ffffff"); P(cx - 16, hy + 22, 32, 2, "#f0e8f0");
      disc(P, cx, hy + 6, 11, "#2a1e24"); disc(P, cx, hy + 9, 9, "#f5d0b0"); P(cx - 11, hy + 4, 4, 20, "#2a1e24"); P(cx + 8, hy + 4, 4, 20, "#2a1e24"); P(cx - 9, hy - 2, 18, 5, "#2a1e24");
      P(cx - 5, hy + 9, 2, 2, "#2a1e2e"); P(cx + 3, hy + 9, 2, 2, "#2a1e2e"); P(cx - 2, hy + 14, 4, 1, "#c04a5a"); P(cx - 7, hy + 12, 2, 1, "#f39aa6"); P(cx + 5, hy + 12, 2, 1, "#f39aa6");
    }
  },
};

// 방법 화면 그림 3장
function stepPics() {
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d"); fn(g, (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }); outline(c); return c.toDataURL(); };
  const fing = (P, x, y) => FINGER.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") P(x + i, y + j, 1, 1, ch === "X" ? "#2a1e2e" : "#ffe6d6"); }));
  const a = mk((g, P) => {
    P(2, 4, 36, 14, "#23203a"); P(2, 4, 12, 14, "#4fb8f0"); P(3, 5, 10, 1, "#9fe0ff");
    P(14, 1, 1, 20, "#ff3b5c"); P(12, 1, 5, 2, "#ff3b5c");
    P(22, 7, 1, 8, "#fff8"); P(20, 9, 5, 5, "#ffffff"); P(21, 10, 3, 3, "#ff5f9e"); P(32, 7, 1, 8, "#fff8"); P(30, 9, 5, 5, "#ffffff"); P(31, 10, 3, 3, "#ff5f9e");
    for (let x = 3; x < 37; x += 2) P(x, 22 + (x % 6 === 3 ? 0 : 2), 1, x % 6 === 3 ? 5 : 2, "#4fd8c8");
    fing(P, 10, 26);
  });
  const b = mk((g, P) => {
    P(4, 2, 16, 30, "#f0a050"); P(5, 3, 14, 6, "#ffd08a"); P(20, 2, 16, 30, "#4fb8f0"); P(21, 3, 14, 10, "#9fe0ff"); P(21, 22, 14, 10, "#f0cf94");
    P(12, 14, 16, 9, "#b06cff"); P(13, 15, 14, 7, "#c88cff"); P(15, 18, 9, 1, "#fff"); P(22, 16, 1, 5, "#fff"); P(23, 17, 1, 3, "#fff"); P(24, 18, 1, 1, "#fff");
    fing(P, 2, 26); P(16, 33, 3, 1, "#fff"); P(20, 33, 3, 1, "#fff8");
  });
  const c = mk((g, P) => {
    P(3, 3, 34, 20, "#ff9ec8"); P(6, 15, 28, 5, "#000a"); P(8, 16, 4, 3, "#fff"); P(13, 16, 4, 3, "#fff"); P(18, 16, 4, 3, "#fff"); P(23, 16, 3, 3, "#fff8");
    P(3, 26, 34, 6, "#201d33"); P(6, 27, 24, 4, "#ffd166"); P(6, 27, 3, 4, "#fff3b0"); P(29, 27, 1, 4, "#c9961c");
    P(14, 24, 1, 10, "#ff3b5c"); fing(P, 10, 27);
  });
  return [[`<img src="${a}" alt="">`, "선에 닿을 때 톡"], [`<img src="${b}" alt="">`, "화살표대로 쓱"], [`<img src="${c}" alt="">`, "자막은 꾹… 떼기"]];
}

export const GAME = {
  key: "insta3", base: "insta", n: "릴스 편집", desc: "퇴근 후 찍은 영상을 음악 박자에 맞춰 잘라 떡상 릴스를 만들어요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 음악에 맞춰 <b>가위 표시</b>가 흘러와요. <b>빨간 선</b>에 닿는 순간 화면 아무 데나 톡 하면 컷이 바뀌어요.",
    "<b>보라 화살표</b>는 전환 효과! 그 방향으로 <b>쓱 밀어요</b>. <b>노란 자막 막대</b>는 꾹 누르고 있다가 막대 끝에서 떼요.",
    "박자에 딱 맞으면 <b>Perfect</b>, 어긋나면 화면이 튀어요. 다 끝나면 내가 만든 릴스가 재생되고 <b>조회수</b>가 정해져요!",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "선에 닿을 때 톡"], ["", "화살표대로 쓱"], ["", "자막은 꾹… 떼기"]]; } },
  css: `
.mg-insta3 .rl-st{background:#15122a!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-insta3 .rl-cv{position:absolute;left:0;top:0;z-index:0;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none}
.mg-insta3 .rl-cv.rl-fr{z-index:2}
.mg-insta3 .mg-msg{top:auto;bottom:8px;z-index:24}
.mg-insta3 .mg-steps img{width:76px;height:76px;image-rendering:pixelated}
.mg-insta3 .rl-pv{position:absolute;z-index:1;overflow:hidden;pointer-events:none}
.mg-insta3 .rl-me{position:absolute;left:0;background-repeat:no-repeat;opacity:0;pointer-events:none;transform-origin:50% 100%}
.mg-insta3 .rl-me.on{opacity:1}
.mg-insta3 .rl-me.gl{animation:rlgl .09s steps(2) infinite}
.mg-insta3 .rl-sub{position:absolute;left:6px;right:6px;bottom:22%;z-index:3;text-align:center;font-weight:900;font-size:14px;line-height:1.25;color:#fff;text-shadow:0 0 3px #000,0 2px 0 #000;opacity:0;word-break:keep-all;transition:opacity .12s}
.mg-insta3 .rl-sub.on{opacity:1}
.mg-insta3 .rl-sub span{background:#000a;padding:2px 7px;border-radius:6px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.mg-insta3 .rl-sub.ok span{background:#ff5f9e;animation:rlpop .3s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-sub.bad span{background:#555a;color:#ddd;font-style:italic}
.mg-insta3 .rl-lb{position:absolute;z-index:3;font-size:10px;font-weight:800;color:#cfc4ff;pointer-events:none;letter-spacing:-.2px;white-space:nowrap;transition:color .2s}
.mg-insta3 .rl-lb.on{color:#fff;text-shadow:0 0 6px #ff5f9e}
.mg-insta3 .rl-lb.tr{background:#0009;border-radius:4px;padding:0 4px;font-size:9.5px;color:#b8b0e0}
.mg-insta3 .rl-j{position:absolute;left:50%;z-index:6;transform:translate(-50%,-50%);font-weight:900;font-size:22px;white-space:nowrap;pointer-events:none;opacity:0;letter-spacing:.5px}
.mg-insta3 .rl-j.on{animation:rlj .55s ease-out forwards}
.mg-insta3 .rl-j.p{background:linear-gradient(90deg,#ff5f9e,#ffd166,#7CFC9A,#5fb8ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #000c)}
.mg-insta3 .rl-j.g{color:#7fe0ff;text-shadow:0 2px 0 #000c}
.mg-insta3 .rl-j.b{color:#ff9a5a;text-shadow:0 2px 0 #000c;font-size:18px}
.mg-insta3 .rl-j.m{color:#b8b8c8;text-shadow:0 2px 0 #000c;font-size:18px}
.mg-insta3 .rl-cb{position:absolute;left:50%;z-index:6;transform:translateX(-50%);font-weight:900;font-size:12px;color:#ffd166;text-shadow:0 1px 0 #000;pointer-events:none;opacity:0;white-space:nowrap}
.mg-insta3 .rl-cb.on{opacity:1}.mg-insta3 .rl-cb.bump{animation:rlpop .25s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-ban{position:absolute;left:50%;z-index:7;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:25px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #b06cff,0 0 14px #b06cff}
.mg-insta3 .rl-ban small{display:block;font-size:12px;font-weight:800;text-shadow:0 1px 2px #000}
.mg-insta3 .rl-ban.on{animation:rlban 1.6s ease-out forwards}
.mg-insta3 .rl-hint{position:absolute;left:0;right:0;z-index:5;text-align:center;font-size:12.5px;font-weight:700;color:#e8e0ff;pointer-events:none;opacity:0;transition:opacity .2s}
.mg-insta3 .rl-hint.on{opacity:1}
.mg-insta3 .rl-hint b{display:inline-block;background:#ff5f9e;color:#fff;border-radius:7px;padding:1px 8px;margin-right:5px;font-weight:900}
.mg-insta3 .rl-hint.s b{background:#b06cff}.mg-insta3 .rl-hint.h b{background:#ffd166;color:#3a2400}
.mg-insta3 .rl-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-4px 0 0 -14px;background-size:100% 100%;image-rendering:pixelated;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-insta3 .rl-hand.on{display:block}
.mg-insta3 .rl-hand.tap{animation:rltap .625s infinite}
.mg-insta3 .rl-hand.sw-r{animation:rlswr 1s infinite}.mg-insta3 .rl-hand.sw-l{animation:rlswl 1s infinite}
.mg-insta3 .rl-hand.sw-u{animation:rlswu 1s infinite}.mg-insta3 .rl-hand.sw-d{animation:rlswd 1s infinite}
.mg-insta3 .rl-hand.hold{animation:rlhold 1.25s infinite}
.mg-insta3 .rl-tut{position:absolute;left:10px;right:10px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-insta3 .rl-tut.off{opacity:0;visibility:hidden}
.mg-insta3 .rl-tc{background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #b06cff;max-width:300px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-insta3 .rl-tut.pop .rl-tc{animation:rlpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-tc em{font-style:normal;display:inline-block;background:#b06cff;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-insta3 .rl-tc p{margin:0}
.mg-insta3 .rl-tc b.pk{color:#e0307a}.mg-insta3 .rl-tc b.pu{color:#8a3ad8}.mg-insta3 .rl-tc b.gd{color:#a87000}.mg-insta3 .rl-tc b.rd{color:#d0283c}
.mg-insta3 .rl-tc .rl-dots{display:inline-flex;gap:4px;margin-top:4px}.mg-insta3 .rl-tc .rl-dots i{width:9px;height:9px;border-radius:50%;background:#ddd;display:block}.mg-insta3 .rl-tc .rl-dots i.on{background:#7CFC9A;box-shadow:0 0 0 1px #1f9a4a}
.mg-insta3 .rl-tb{margin-top:6px;display:flex;justify-content:center}
.mg-insta3 .rl-skip{pointer-events:auto;background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-insta3 .rl-go{pointer-events:auto;background:linear-gradient(#c88cff,#8a3ad8)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #4a1a80!important;animation:rlpulse .5s infinite alternate}
.mg-insta3 .rl-up{position:absolute;left:14px;right:14px;z-index:8;display:none;flex-direction:column;align-items:center;gap:6px;color:#fff;font-weight:800;font-size:13px;pointer-events:none}
.mg-insta3 .rl-up.on{display:flex;animation:rlfade .3s}
.mg-insta3 .rl-up i{display:block;width:80%;height:8px;border-radius:5px;background:#ffffff22;overflow:hidden}
.mg-insta3 .rl-up i em{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,#ff5f9e,#ffd166)}
.mg-insta3 .rl-vw{position:absolute;left:0;right:0;z-index:8;display:none;flex-direction:column;align-items:center;pointer-events:none}
.mg-insta3 .rl-vw.on{display:flex}
.mg-insta3 .rl-vw span{font-size:11.5px;color:#d8c8ee;font-weight:700}
.mg-insta3 .rl-vw b{font-size:30px;font-weight:900;color:#fff;line-height:1.1;text-shadow:0 3px 0 #000a;transition:color .3s}
.mg-insta3 .rl-vw.boom b{color:#ffd166;animation:rlboom .7s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-vw small{font-size:13px;font-weight:900;color:#ff7eb6;min-height:16px}
.mg-insta3 .rl-cm{position:absolute;left:10px;right:10px;z-index:9;display:flex;flex-direction:column;align-items:flex-start;gap:4px;pointer-events:none}
.mg-insta3 .rl-cm div{background:#ffffff1c;color:#fff;font-size:12px;padding:4px 9px;border-radius:11px;animation:rlcm .35s cubic-bezier(.3,1.6,.5,1)}
.mg-insta3 .rl-cm div b{color:#ffc6e0;margin-right:5px;font-size:11px}
@keyframes rlgl{0%{transform:translate(-3px,0);filter:hue-rotate(90deg) saturate(2)}100%{transform:translate(3px,1px);filter:hue-rotate(-60deg)}}
@keyframes rlj{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}35%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-90%) scale(1)}}
@keyframes rlban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(1deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
@keyframes rlpop{0%{transform:scale(.4)}100%{transform:scale(1)}}
@keyframes rlpulse{to{transform:scale(1.07)}}
@keyframes rlfade{from{opacity:0}}
@keyframes rlboom{0%{transform:scale(.6)}60%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes rlcm{from{opacity:0;transform:translateY(10px) scale(.8)}}
@keyframes rltap{0%,100%{transform:translate(5px,10px)}35%,55%{transform:translate(0,0) scale(.88)}}
@keyframes rlswr{0%{transform:translate(-14px,0);opacity:0}15%{opacity:1}70%{transform:translate(44px,0);opacity:1}100%{transform:translate(50px,0);opacity:0}}
@keyframes rlswl{0%{transform:translate(14px,0);opacity:0}15%{opacity:1}70%{transform:translate(-44px,0);opacity:1}100%{transform:translate(-50px,0);opacity:0}}
@keyframes rlswu{0%{transform:translate(0,14px);opacity:0}15%{opacity:1}70%{transform:translate(0,-36px);opacity:1}100%{transform:translate(0,-40px);opacity:0}}
@keyframes rlswd{0%{transform:translate(0,-14px);opacity:0}15%{opacity:1}70%{transform:translate(0,30px);opacity:1}100%{transform:translate(0,34px);opacity:0}}
@keyframes rlhold{0%{transform:translate(4px,10px)}20%,85%{transform:translate(0,0) scale(.86)}100%{transform:translate(4px,10px)}}
@media (prefers-reduced-motion:reduce){.mg-insta3 .rl-ban.on,.mg-insta3 .rl-j.on{animation-duration:.01s}.mg-insta3 .rl-me.gl{animation:none}.mg-insta3 .rl-go{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "insta3", "릴스 편집", "rl-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="rl-cv"></canvas><div class="rl-pv"><div class="rl-me"></div><div class="rl-sub"></div></div><canvas class="rl-cv rl-fr"></canvas>
      <div class="rl-j"></div><div class="rl-cb"></div><div class="rl-ban"></div><div class="rl-hint"></div>
      <div class="rl-up"><span>릴스 내보내는 중…</span><i><em></em></i></div>
      <div class="rl-vw"><span>조회수</span><b>0</b><small></small></div><div class="rl-cm"></div>
      <div class="rl-tut off"><div class="rl-tc"><em>리허설</em><p></p><div class="rl-tb"></div></div></div><div class="rl-hand"></div>`);
    const st = F.stage, $ = (s) => st.querySelector(s);
    const cvB = st.querySelector(".rl-cv"), gB = cvB.getContext("2d"), cvF = $(".rl-fr"), gF = cvF.getContext("2d");
    const pvEl = $(".rl-pv"), meEl = $(".rl-me"), subEl = $(".rl-sub"), jEl = $(".rl-j"), cbEl = $(".rl-cb"), banEl = $(".rl-ban"), hintEl = $(".rl-hint");
    const upEl = $(".rl-up"), vwEl = $(".rl-vw"), cmEl = $(".rl-cm"), tutEl = $(".rl-tut"), tutP = $(".rl-tc p"), tutB = $(".rl-tb"), hand = $(".rl-hand");
    // ── 크기: 논리 폭 110~120칸을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 118)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    for (const c of [cvB, cvF]) { c.width = LW; c.height = LH; c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    const PH = clamp(Math.round(LH * 0.56), 84, 112), PW = Math.round(PH * 9 / 16), PX = Math.round((LW - PW) / 2), PY = 4;
    const tlY = PY + PH + 6, vY = tlY + 6, tY = vY + 17, aY = tY + 11, tlB = aY + 11, playX = 28, PPS = 44;
    const RX = PX + PW + 3, RWc = LW - RX - 2;
    Object.assign(pvEl.style, { left: PX * K + "px", top: PY * K + "px", width: PW * K + "px", height: PH * K + "px" });
    jEl.style.top = (PY + PH * 0.44) * K + "px"; cbEl.style.top = (PY + PH * 0.44 + 9) * K + "px"; banEl.style.top = (PY + PH * 0.3) * K + "px";
    hintEl.style.top = (tlB + 3) * K + "px"; tutEl.style.top = (PY + 6) * K + "px";
    upEl.style.top = (tlY + 8) * K + "px"; vwEl.style.top = (tlY - 2) * K + "px"; cmEl.style.top = (tlY + 26) * K + "px";
    // 글자 이름표(도구·트랙)
    const TOOLS = [["c", "컷"], ["s", "전환"], ["h", "자막"]], toolY = (i) => PY + 6 + i * Math.round((PH - 26) / 2.6);
    const toolLb = TOOLS.map(([k, n], i) => { const e = document.createElement("div"); e.className = "rl-lb"; e.textContent = n; e.style.left = "0px"; e.style.width = (PX - 2) * K + "px"; e.style.textAlign = "center"; e.style.top = (toolY(i) + 19) * K + "px"; st.appendChild(e); return e; });
    { const e = document.createElement("div"); e.className = "rl-lb"; e.textContent = "편집력"; e.style.left = RX * K - 4 + "px"; e.style.width = RWc * K + 8 + "px"; e.style.textAlign = "center"; e.style.top = (PY + 17) * K + "px"; st.appendChild(e); }
    const trLb = [["영상", vY + 1], ["자막", tY], ["음악", aY + 1]].map(([n, y]) => { const e = document.createElement("div"); e.className = "rl-lb tr"; e.textContent = n; e.style.left = "3px"; e.style.top = y * K + "px"; st.appendChild(e); return e; });

    // 내 캐릭터 그림(3x2 표정 시트, 칸 240x540). 미리보기 안에서 얼굴~허리를 셀카처럼 자른다
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    const CW = PW * K, CH = PH * K, sA = CW / 200, meTop = Math.round(CH * 0.2);
    Object.assign(meEl.style, { width: CW + "px", height: CH - meTop + "px", top: meTop + "px", backgroundSize: `${720 * sA}px ${1080 * sA}px` });
    { const im = new Image(); im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp"; }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meTf = "";
    const setFace = (ex) => { if (ex === meX) return; meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${-((i % 3) * 240 + 20) * sA}px ${-((i >= 3 ? 540 : 0) + 14) * sA}px`; };
    setFace("smile");

    // ── 배경(한 번만): 편집기 바탕, 폰 테두리, 타임라인 판 ──
    const BG = document.createElement("canvas"); BG.width = LW; BG.height = LH;
    {
      const b = BG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      vgrad(P, 0, 0, LW, LH, "#1c1838", "#120f24");
      for (let y = 3; y < tlY - 2; y += 6) for (let x = (y / 6) % 2 ? 4 : 1; x < LW; x += 6) P(x, y, 1, 1, "#ffffff0d");
      P(PX - 3, PY - 3, PW + 6, PH + 6, "#08070f"); P(PX - 2, PY - 2, PW + 4, PH + 4, "#2a2640"); P(PX - 1, PY - 1, PW + 2, PH + 2, "#000");
      P(PX - 3, PY - 3, 1, 1, "#1c1838"); P(PX + PW + 2, PY - 3, 1, 1, "#1c1838"); P(PX - 3, PY + PH + 2, 1, 1, "#141029"); P(PX + PW + 2, PY + PH + 2, 1, 1, "#141029");
      P(PX - 4, PY + 20, 1, 8, "#2a2640"); P(PX + PW + 3, PY + 16, 1, 5, "#2a2640");
      P(0, tlY - 2, LW, LH - tlY + 2, "#0f0d1c"); P(0, tlY - 2, LW, 1, "#3a3460");
      P(0, vY, LW, 15, "#23203a"); P(0, tY, LW, 9, "#1e1b33"); P(0, aY, LW, 11, "#171528");
      P(0, vY + 15, LW, 1, "#0a0914"); P(0, tY + 9, LW, 1, "#0a0914");
      P(RX + Math.floor(RWc / 2) - 4, PY + 26, 8, PH - 32, "#0a0914"); P(RX + Math.floor(RWc / 2) - 3, PY + 27, 6, PH - 34, "#1e1b33");
    }
    // 도구 아이콘(18x18)
    const ICON = {};
    for (const [k] of TOOLS) {
      const c = document.createElement("canvas"); c.width = 18; c.height = 18; const b = c.getContext("2d"), P = (x, y, w, h, col) => { b.fillStyle = col; b.fillRect(x, y, w, h); };
      if (k === "c") {
        // 가위: 위로 벌린 날 두 개 + 아래 분홍 손잡이 고리
        for (let i = 0; i < 10; i++) { P(3 + i, 1 + i, 2, 1, i < 3 ? "#ffffff" : "#d8dce8"); P(13 - i, 1 + i, 2, 1, i < 3 ? "#f2f4fa" : "#aab0c4"); }
        P(8, 9, 2, 2, "#5a5470");
        for (const cx of [4, 13]) { P(cx - 3, 12, 6, 1, "#ff5f9e"); P(cx - 3, 16, 6, 1, "#ff5f9e"); P(cx - 4, 13, 1, 3, "#ff5f9e"); P(cx + 2, 13, 1, 3, "#ff5f9e"); P(cx - 2, 12, 4, 1, "#ff9ec8"); }
      }
      else if (k === "s") { P(2, 4, 8, 10, "#ff9ec8"); P(8, 4, 8, 10, "#7fc8ff"); P(4, 8, 9, 2, "#fff"); P(12, 6, 1, 6, "#fff"); P(13, 7, 1, 4, "#fff"); P(14, 8, 1, 2, "#fff"); }
      else { P(2, 3, 14, 12, "#3a3460"); P(5, 5, 8, 2, "#ffd166"); P(8, 7, 2, 6, "#ffd166"); P(3, 13, 12, 1, "#fff8"); }
      ICON[k] = c;
    }
    const pvA = document.createElement("canvas"), pvB = document.createElement("canvas"), pvC = document.createElement("canvas");
    for (const c of [pvA, pvB, pvC]) { c.width = PW; c.height = PH; }
    const drawScene = (cv, kind, tm, bp) => { const g = cv.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; g.clearRect(0, 0, PW, PH); try { SC[kind](g, P, tm, bp, PW, PH, art); } catch (e) { P(0, 0, PW, PH, "#333"); } g.globalAlpha = 1; };

    // ── 상태 ──  tut: 0 시작 전 / 1 컷 / 2 전환 / 3 자막 / 4 안내 카드 / -1 본편집
    let tut = 0, tutOK = 0, tutMode = true;
    let over = false, done = false, raf = 0, last = 0, songStart = 0, clockOn = false, schedStep = 0, musicEnd = 1e9, phase = "", tmr = null;
    let notes = [], ptr = null, holding = null, combo = 0, maxCombo = 0, missStreak = 0, stray = 0;
    const cnt = { p: 0, g: 0, b: 0, m: 0 }, part = { c: [0, 0], s: [0, 0], h: [0, 0] };
    let sumV = 0, N = 0, sceneIdx = 0, cur = PLAY[0], trans = null, flashT = 0, glitchT = 0, shakeT = 0, secShown = -1, subIdx = 0;
    const segs = [{ t0: -99, sc: PLAY[0] }], clips = [], subsDone = [], fx = [], hearts = [];
    const VAL = { p: 1, g: 0.65, b: 0.1, m: 0 };
    const PWIN = 0.075 * ez, GWIN = 0.15 * ez, BWIN = Math.max(0.25, GWIN + 0.06);
    const songT = (now = performance.now()) => (clockOn ? (now - songStart) / 1000 : -9);

    // ── 음악(드럼+베이스, 16분음표 단위로 미리 예약) ──
    const ROOT = [110, 87.31, 130.81, 98], ARP = [[440, 523.25, 659.25], [349.23, 440, 523.25], [523.25, 659.25, 783.99], [392, 493.88, 587.33]];
    const musSec = (b) => (tutMode ? "A" : b < 4 ? "in" : b < 16 ? "A" : b < 28 ? "B" : b < 36 ? "C" : b < 48 ? "D" : b < 50 ? "R" : b < 58 ? "P" : b === 58 ? "E" : "");
    const kick = (a) => { tone(150, 0.13, "sine", 0.34, -100, a); tone(55, 0.09, "sine", 0.2, 0, a); };
    const snare = (a, v = 1) => { noise(0.11, 1900, 0.17 * v, a, 0.7); tone(220, 0.06, "triangle", 0.07 * v, -90, a); };
    const hat = (a, v = 1) => noise(0.022, 8500, 0.05 * v, a, 1.4);
    const bass = (f, d, a) => { tone(f, d, "triangle", 0.17, 0, a); tone(f * 2, d * 0.6, "square", 0.022, 0, a); };
    const playStep = (i, a) => {
      const b = Math.floor(i / 4), s = i % 16, bar = Math.floor(i / 16), S = musSec(b), r = ROOT[bar % 4];
      if (!S) return;
      if (S === "E") { if (s === 0) { kick(a); noise(1.4, 6000, 0.16, a, 0.5); ARP[0].forEach((f) => tone(f, 0.7, "square", 0.04, 0, a)); bass(55, 0.8, a); } return; }
      if (S === "R") { if (s % 2 === 0) hat(a, 0.8); if (i === 48 * 4) tone(180, 1.2, "sawtooth", 0.035, 900, a); if (b === 49) snare(a, 0.3 + (s % 4) * 0.2); return; }
      const big = S === "D" || S === "P";
      if (S === "C") { if (s === 0) { kick(a); bass(r, 0.55, a); ARP[bar % 4].forEach((f) => tone(f / 2, 1.1, "triangle", 0.03, 0, a)); } if (s === 8) { snare(a); bass(r, 0.45, a); } if (s % 4 === 2) hat(a, 0.7); return; }
      if (big ? s % 4 === 0 : s === 0 || s === 8 || (S !== "in" && s === 10 && bar % 2)) kick(a);
      if (S !== "in" && (s === 4 || s === 12)) { snare(a); if (big) noise(0.06, 3200, 0.08, a, 1); }
      if (big || S === "B" ? true : s % 2 === 0) hat(a, s % 2 ? 0.55 : 1);
      if (S === "in") { if (s === 0 || s === 8) bass(r, 0.18, a); }
      else if (big) { if (s % 2 === 0) bass(s % 4 === 2 ? r * 2 : r, 0.13, a); tone(ARP[bar % 4][s % 3] * (s % 8 >= 4 ? 2 : 1), 0.07, "square", 0.022, 0, a); }
      else if ([0, 3, 6, 8, 11, 14].includes(s)) bass(s === 6 || s === 14 ? r * 2 : r, 0.13, a);
      if (!tutMode && (b === 15 || b === 35)) { snare(a, 0.25 + (s % 4) * 0.15); if (s === 12) noise(0.6, 2500, 0.06, a, 0.6); }
    };
    const schedule = (now) => {
      if (!clockOn) return;
      const t = songT(now);
      while (schedStep * SPB / 4 < t + 0.13 && schedStep < musicEnd) {
        const at = schedStep * SPB / 4 - t;
        if (at > -0.03) playStep(schedStep, Math.max(0, at));
        schedStep++;
      }
    };

    // ── 판정 ──
    const pvPt = () => [(PX + PW / 2) * K, (PY + PH * 0.55) * K];
    const showJ = (gr, dt) => {
      jEl.className = "rl-j " + gr; jEl.textContent = gr === "p" ? "PERFECT" : gr === "g" ? "GOOD" : gr === "b" ? (dt < 0 ? "빨라요!" : "늦어요!") : "MISS";
      void jEl.offsetWidth; jEl.classList.add("on");
      cbEl.textContent = combo >= 3 ? `${combo} COMBO` : ""; cbEl.classList.toggle("on", combo >= 3); cbEl.classList.remove("bump"); void cbEl.offsetWidth; if (combo >= 3) cbEl.classList.add("bump");
    };
    const glitch = (s = 0.28) => { glitchT = Math.max(glitchT, s); meEl.classList.add("gl"); noise(0.12, 600, 0.12, 0, 3); tone(90 + rnd() * 60, 0.12, "sawtooth", 0.06, 200); };
    const doCut = (gr, dir) => {
      const prev = cur; sceneIdx++; cur = PLAY[sceneIdx % PLAY.length];
      segs.push({ t0: songT(), sc: cur }); if (segs.length > 60) segs.shift();
      if (dir) trans = { from: prev, to: cur, d: DV[dir], t: 0 };
      if (gr === "p") flashT = 0.14;
      if (!tutMode && !over) clips.push({ sc: cur, gr, sub: null });
      setFace(pick(["smile", "smile", "blush", "neutral"]));
      subEl.classList.remove("on");
    };
    const judge = (n, dt, tail = false) => {
      const gr = dt === null ? "m" : Math.abs(dt) <= PWIN ? "p" : Math.abs(dt) <= GWIN ? "g" : "b";
      if (tail) n.j2 = gr; else n.j = gr;
      const good = gr === "p" || gr === "g";
      if (good) { combo++; maxCombo = Math.max(maxCombo, combo); missStreak = 0; } else { combo = 0; missStreak++; }
      if (!tutMode) { cnt[gr]++; sumV += VAL[gr]; N++; part[n.k][0] += VAL[gr]; part[n.k][1]++; F.sc.textContent = `정확 ${Math.round((sumV / N) * 100)}%`; }
      showJ(gr, dt);
      const hp = [playX * K, (n.k === "h" ? tY + 4 : vY + 7) * K];
      if (gr === "p") { tone(1568, 0.05, "square", 0.05); noise(0.04, 6000, 0.08); vib(10); F.burst(hp, "#ffd166", 8); F.burst(pvPt(), "#ffffff", 6); fx.push({ t: 0, c: "#ffd166" }); }
      else if (gr === "g") { tone(1046, 0.05, "square", 0.04); vib(6); F.burst(hp, "#7fe0ff", 5); fx.push({ t: 0, c: "#7fe0ff" }); }
      else if (gr === "b") { glitch(0.32); F.miss(null); }
      else { if (!over) { glitch(0.18); SFX.fail(); } }
      // 장면 처리
      if (n.k === "c" || n.k === "s") { if (gr !== "m") doCut(gr, n.k === "s" ? n.ud || n.dir : null); }
      else if (n.k === "h") {
        if (!tail) { if (gr !== "m") { n.txt = SUBS[subIdx++ % SUBS.length]; subEl.className = "rl-sub on"; subEl.innerHTML = "<span></span>"; SFX.pop(); } }
        else {
          const ok = good && n.j !== "m";
          if (n.txt) { subEl.className = "rl-sub on " + (ok ? "ok" : "bad"); subEl.innerHTML = `<span>${ok ? n.txt : n.txt.slice(0, Math.max(2, n.txt.length - 4)) + "…ㅇ"}</span>`; }
          if (ok) { [784, 1046, 1318].forEach((f, i) => tone(f, 0.08, "triangle", 0.07, 0, i * 0.05)); setFace("blush"); }
          if (!tutMode && !over) { const c = clips[clips.length - 1]; if (c) c.sub = ok ? n.txt : null; subsDone.push(ok); }
          n.subOff = songT() + 1.1;
        }
      }
      if (tutMode && tut > 0 && tut < 4) {
        const okNote = n.k === "h" ? tail && good && n.j !== "m" : good;
        if (okNote) { tutOK++; drawDots(); const need = tut === 3 ? 1 : 2; if (tutOK >= need) setTimeout(() => { if (tut > 0 && tut < 4) tutNext(tut + 1); }, 700); }
        else if (!good) F.msg(n.k === "c" ? "가위가 빨간 선에 닿는 순간에 톡!" : n.k === "s" ? `화살표(${ARW[n.dir]}) 방향으로 쓱!` : "막대 끝에서 손을 떼요");
      }
    };
    const nearest = (t) => { let best = null, bd = 1e9; for (const n of notes) { if (n.j) continue; const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } } return bd <= BWIN ? best : null; };
    const inDown = (x, y) => {
      if (over || !clockOn || ptr || holding || tut === 4 || tut === 0) return;
      const t = songT(), n = nearest(t);
      if (!n) {
        if (!tutMode) { stray++; combo = 0; glitch(0.12); F.float([x, y], "헛컷", "bad"); cbEl.classList.remove("on"); }
        else SFX.tok();
        ptr = { n: null, x, y }; return;
      }
      const dt = t - n.t;
      if (n.k === "c") { judge(n, dt); ptr = { n: null, x, y }; }
      else if (n.k === "s") { ptr = { n, x, y, dt }; }
      else { judge(n, dt); ptr = { n: null, x, y }; if (n.j !== "m") { holding = n; n.tick = 0; } }
    };
    const inMove = (x, y) => {
      if (!ptr || !ptr.n) return;
      const dx = x - ptr.x, dy = y - ptr.y;
      if (Math.hypot(dx, dy) < 14) return;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : dy > 0 ? "d" : "u";
      const n = ptr.n; ptr.n = null; n.ud = dir; SFX.whoosh(); vib(8);
      if (dir === n.dir) judge(n, ptr.dt);
      else { judge(n, 1); jEl.textContent = "방향이 달라요!"; }
    };
    const inUp = () => {
      if (ptr && ptr.n) { const n = ptr.n; n.ud = null; judge(n, 1); jEl.textContent = "밀어야 해요!"; }
      ptr = null;
      if (holding) { const n = holding; holding = null; if (!n.j2) judge(n, songT() - n.e, true); }
    };
    const xy = (e) => { const r = st.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let pid = null;
    st.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; e.preventDefault(); if (pid !== null) return; pid = e.pointerId; try { st.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = xy(e); inDown(x, y); });
    st.addEventListener("pointermove", (e) => { if (e.pointerId !== pid) return; const [x, y] = xy(e); inMove(x, y); });
    const upH = (e) => { if (e.pointerId !== pid) return; pid = null; inUp(); };
    st.addEventListener("pointerup", upH); st.addEventListener("pointercancel", upH);

    // ── 리허설 ──
    hand.style.backgroundImage = `url(${fingerURL()})`;
    const SKIP = `<button class="rl-skip" data-skip>건너뛰기</button>`;
    const drawDots = () => { const need = tut === 3 ? 1 : 2, d = tutP.querySelector(".rl-dots"); if (d) d.innerHTML = Array.from({ length: need }, (_, i) => `<i class="${i < tutOK ? "on" : ""}"></i>`).join(""); };
    const startClock = (delay = 0) => { songStart = performance.now() + delay; clockOn = true; schedStep = 0; };
    const tutNext = (n) => {
      tut = n; tutOK = 0; notes = []; ptr = null; holding = null;
      tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        startClock(150);
        tutP.innerHTML = `음악에 맞춰 <b class="pk">가위</b>가 흘러와요.<br><b class="rd">빨간 선</b>에 닿는 순간 <b class="pk">톡!</b> 컷이 바뀌어요<br><span class="rl-dots"></span>`;
        tutB.innerHTML = SKIP;
      } else if (n === 2) {
        tutP.innerHTML = `좋아요! <b class="pu">보라 화살표</b>는 전환 효과예요.<br>선에 닿을 때 <b class="pu">그 방향으로 쓱</b> 밀어요<br><span class="rl-dots"></span>`; tutB.innerHTML = SKIP;
      } else if (n === 3) {
        tutP.innerHTML = `마지막! <b class="gd">노란 자막 막대</b>는<br>시작에서 <b class="gd">꾹 누르고</b>, 끝에서 <b class="gd">떼요</b><br><span class="rl-dots"></span>`; tutB.innerHTML = SKIP;
      } else if (n === 4) {
        tutP.innerHTML = `완벽해요! 이제 진짜 편집이에요.<br>30초 동안 <b class="pk">컷 → 전환 → 자막 → 클라이맥스</b>!`; tutB.innerHTML = `<button class="rl-go" data-go>편집 시작!</button>`;
        SFX.ding(3);
      }
      drawDots();
    };
    const tutGen = (t) => {
      if (tut < 1 || tut > 3) return;
      if (notes.some((n) => !n.j || (n.k === "h" && !n.j2 && n.j !== "m"))) return;
      notes = notes.filter((n) => t - (n.e || n.t) < 3);
      const b = Math.ceil(t / SPB) + 2, k = tut === 1 ? "c" : tut === 2 ? "s" : "h";
      notes.push({ b, t: b * SPB, k, dir: k === "s" ? ["r", "l", "u", "d"][tutOK % 2 ? rint(4) : 0] : null, e: k === "h" ? (b + 2) * SPB : 0, help: true, j: null, j2: null });
    };
    const startEdit = () => {
      if (tut < 0) return; tut = -1; tutMode = false; ptr = null; holding = null;
      tutEl.classList.add("off"); hand.className = "rl-hand"; subEl.className = "rl-sub";
      notes = CHART.map(([b, k, x]) => ({ b, t: b * SPB, k, dir: k === "s" ? x : null, e: k === "h" ? x * SPB : 0, j: null, j2: null, help: false }));
      for (const s of SECS) { const ns = notes.filter((n) => n.b > s.b && n.b < s.b + 9 && n.k === s.k).slice(0, s.k === "c" && s.b > 0 ? 1 : 2); ns.forEach((n) => (n.help = true)); }
      combo = 0; maxCombo = 0; missStreak = 0; stray = 0; sumV = 0; N = 0; for (const k in cnt) cnt[k] = 0; for (const k in part) part[k] = [0, 0];
      sceneIdx = 0; cur = PLAY[0]; segs.length = 0; segs.push({ t0: -99, sc: cur }); clips.length = 0; subsDone.length = 0; subIdx = 0; trans = null; secShown = -1;
      F.sc.textContent = "정확 -";
      startClock(80);
      tmr = timer(T, F.bar, end);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startEdit(); } });

    // ── 끝: 내보내기 → 내 릴스 재생 → 조회수 폭발 ──
    let RS = 0, rlist = [], views = 0, score = 0, boomT = 0, rIdx = -1;
    const end = () => {
      if (over) return; over = true; holding = null; ptr = null;
      for (const n of notes) { if (!n.j) judge(n, null); if (n.k === "h" && n.j !== "m" && !n.j2) judge(n, null, true); }
      hand.className = "rl-hand"; hintEl.classList.remove("on"); jEl.classList.remove("on"); cbEl.classList.remove("on");
      trLb.forEach((e) => (e.style.display = "none")); musicEnd = 59 * 4;
      const acc = N ? sumV / N : 0, cr = N ? maxCombo / N : 0;
      score = clamp(acc * 0.85 + cr * 0.15 - stray * 0.008, 0, 1);
      views = Math.round(300 * Math.pow(10, score * 3.6) * (0.9 + rnd() * 0.2));
      // 재생 목록: 내가 자른 클립에서 고르게 8개(모자라면 멈춘 화면 반복 = 엇박)
      const pickN = 8;
      for (let i = 0; i < pickN; i++) { if (clips.length >= pickN) rlist.push(clips[Math.floor((i * clips.length) / pickN)]); else rlist.push(clips[i] || { sc: clips.length ? clips[clips.length - 1].sc : PLAY[0], gr: "m", sub: null }); }
      phase = "render"; upEl.classList.add("on"); SFX.end();
    };
    const boom = () => {
      phase = "boom"; boomT = 0;
      const big = score >= 0.6;
      vwEl.classList.add("boom"); vwEl.querySelector("small").textContent = score >= 0.85 ? "떡상! 알고리즘 탔어요" : big ? "조회수 쑥쑥!" : score >= 0.35 ? "무난하게 올라가요" : "음… 엇박이 아쉬워요";
      vwEl.querySelector("b").textContent = fmtV(views);
      if (big) { vib([30, 30, 30, 30, 60]); F.burst([(PX + PW / 2) * K, (PY + PH / 2) * K], "#ffd166", 18); }
      for (let i = 0; i < (big ? 40 : score >= 0.35 ? 16 : 5); i++) hearts.push({ x: PX + rnd() * PW, y: PY + PH + rnd() * 20, vy: -(20 + rnd() * 30), ph: rnd() * 6, c: pick(HCOL), life: 2 + rnd() * 1.2, delay: i * 0.04 });
      const pool = shuffle(score >= 0.6 ? GOODC : score >= 0.35 ? MIDC.concat(GOODC.slice(0, 2)) : BADC.concat(MIDC.slice(0, 1)));
      const nick = () => pick(["퇴근한", "졸린", "배고픈", "새벽", "월요병", "말랑"]) + pick(["감자", "고양이", "두부", "만두", "펭귄", "라떼"]);
      pool.slice(0, LH >= 190 ? 3 : 2).forEach((c, i) => setTimeout(() => { if (done) return; const d = document.createElement("div"); d.innerHTML = `<b>${nick()}</b>${c}`; cmEl.appendChild(d); SFX.pop(); }, 250 + i * 420));
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const pc = (k) => (part[k][1] ? part[k][0] / part[k][1] : 0);
        finish(score, `조회수 <b>${fmtV(views)}회</b> · Perfect ${cnt.p}개 · 최대 콤보 ${maxCombo}`, "", [["박자 컷", pc("c")], ["전환 효과", pc("s")], ["자막 타이밍", pc("h")]]);
      }, 2700);
    };

    // ── 그리기 ──
    const drawHeart = (g, x, y, c, a = 1) => { g.globalAlpha = a; HEART.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === "X") { g.fillStyle = j === 1 && i === 1 ? "#fff" : j >= 3 ? tint(c, 0.7) : c; g.fillRect(x + i, y + j, 1, 1); } }); g.globalAlpha = 1; };
    const noteIcon = (g, P, n, x, y, hot) => {
      if (n.k === "c") { P(x, vY, 1, 15, "#ffffff40"); P(x - 3, y - 3, 7, 7, hot ? "#fff3b0" : "#ffffff"); P(x - 2, y - 2, 5, 5, "#ff5f9e"); P(x - 1, y - 1, 1, 1, "#fff"); P(x + 1, y - 1, 1, 1, "#fff"); P(x, y, 1, 2, "#fff"); }
      else if (n.k === "s") {
        P(x, vY, 1, 15, "#c88cff60"); P(x - 4, y - 4, 9, 9, hot ? "#f0d8ff" : "#e0c8ff"); P(x - 3, y - 3, 7, 7, "#9a4ae8");
        const [dx, dy] = DV[n.dir];
        for (let k = -2; k <= 2; k++) P(x + dx * k, y + dy * k, 1, 1, "#fff");
        P(x + dx * 2 - dy, y + dy * 2 - dx, 1, 1, "#fff"); P(x + dx * 2 + dy, y + dy * 2 + dx, 1, 1, "#fff");
        P(x + dx - dy * 2, y + dy - dx * 2, 1, 1, "#fff"); P(x + dx + dy * 2, y + dy + dx * 2, 1, 1, "#fff");
      }
    };
    const render = (sT, tm) => {
      const bt = sT / SPB, bp = clamp(bt - Math.floor(bt), 0, 1), beat = Math.floor(bt);
      // 1) 미리보기 장면(전환 중이면 두 장면을 밀어서 겹친다)
      let showMe = cur === "me", meOff = [0, 0];
      let rSc = cur, rGl = false, rFl = false;
      if (phase === "replay" || phase === "boom") {
        const rt = sT - RS; let idx = -1;
        for (let i = 0; i < rlist.length; i++) { const st0 = i * SPB + (rlist[i].gr === "b" || rlist[i].gr === "m" ? 0.17 : 0); if (rt >= st0) idx = i; }
        if (phase === "boom") idx = rlist.length - 1;
        rIdx = idx; const c = rlist[Math.max(0, idx)] || { sc: cur, gr: "g" }; rSc = c.sc;
        const st0 = Math.max(0, idx) * SPB + (c.gr === "b" || c.gr === "m" ? 0.17 : 0);
        rGl = (c.gr === "b" || c.gr === "m") && rt - st0 < 0.22 && phase === "replay"; rFl = c.gr === "p" && rt - st0 < 0.1;
        showMe = rSc === "me";
        if (c.sub && phase === "replay") { if (!subEl.classList.contains("ok") || subEl.textContent !== c.sub) { subEl.className = "rl-sub on ok"; subEl.innerHTML = `<span>${c.sub}</span>`; } } else if (phase === "replay") subEl.className = "rl-sub";
        if (rGl) { glitchT = Math.max(glitchT, 0.05); meEl.classList.add("gl"); }
        if (rFl) flashT = Math.max(flashT, 0.08);
      }
      const gC = pvC.getContext("2d");
      if (trans && phase !== "replay" && phase !== "boom") {
        const e = 1 - Math.pow(1 - clamp(trans.t / 0.22, 0, 1), 3), [dx, dy] = trans.d;
        drawScene(pvA, trans.to, tm, bp); drawScene(pvB, trans.from, tm, bp);
        gC.clearRect(0, 0, PW, PH);
        gC.drawImage(pvB, Math.round(dx * e * PW), Math.round(dy * e * PH)); gC.drawImage(pvA, Math.round(dx * (e - 1) * PW), Math.round(dy * (e - 1) * PH));
        if (trans.from === "me") { showMe = true; meOff = [dx * e * PW * K, dy * e * PH * K]; } else if (trans.to === "me") meOff = [dx * (e - 1) * PW * K, dy * (e - 1) * PH * K];
      } else { drawScene(pvA, rSc, tm, bp); gC.clearRect(0, 0, PW, PH); gC.drawImage(pvA, 0, 0); }
      // 내 얼굴 장면: 캐릭터 그림을 박자에 맞춰 살짝 들썩
      if (art) {
        meEl.classList.toggle("on", showMe);
        const tf = `translate(${Math.round(meOff[0])}px,${Math.round(meOff[1] + (bp < 0.15 ? -3 : 0))}px)`;
        if (tf !== meTf) { meTf = tf; meEl.style.transform = tf; }
        if (glitchT <= 0) meEl.classList.remove("gl");
      }
      // 2) 바탕 + 미리보기 붙이기(튀면 줄 단위로 어긋나게)
      gB.drawImage(BG, 0, 0);
      const shx = shakeT > 0 ? Math.round((rnd() - 0.5) * 4) : 0;
      if (glitchT > 0) {
        for (let y = 0; y < PH; y += 3) { const o = rnd() < 0.5 ? Math.round((rnd() - 0.5) * 9) : 0; gB.drawImage(pvC, 0, y, PW, 3, PX + o + shx, PY + y, PW, 3); }
        gB.globalAlpha = 0.35; gB.globalCompositeOperation = "lighter"; gB.drawImage(pvC, PX + 2, PY); gB.globalCompositeOperation = "source-over"; gB.globalAlpha = 1;
        gB.fillStyle = "#08070f"; gB.fillRect(PX - 6, PY, 5, PH); gB.fillRect(PX + PW + 1, PY, 6, PH);
      } else gB.drawImage(pvC, PX + shx, PY);
      // 3) 앞 그림
      const g = gF, P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      g.clearRect(0, 0, LW, LH);
      if (glitchT > 0) { for (let k = 0; k < 4; k++) { const y = PY + rint(PH); P(PX, y, PW, 1, pick(["#ff00ff88", "#00ffff88", "#ffffff66"])); } P(PX + rint(PW - 10), PY + rint(PH - 4), 10, 2, "#00ffffaa"); }
      if (flashT > 0) { g.globalAlpha = clamp(flashT / 0.14, 0, 1) * 0.7; P(PX, PY, PW, PH, "#fff"); g.globalAlpha = 1; }
      // 릴스 화면 꾸밈(오른쪽 아이콘·아래 글줄·위 진행 막대)
      const ix = PX + PW - 8;
      drawHeart(g, ix, PY + PH - 44, phase === "boom" || flashT > 0 ? "#ff3b5c" : "#ffffff", 0.9);
      P(ix, PY + PH - 34, 7, 5, "#ffffffdd"); P(ix + 1, PY + PH - 29, 2, 2, "#ffffffdd");
      P(ix, PY + PH - 23, 7, 1, "#ffffffdd"); P(ix + 2, PY + PH - 22, 4, 1, "#ffffffdd"); P(ix + 4, PY + PH - 21, 2, 2, "#ffffffdd");
      disc(P, PX + 5, PY + PH - 12, 3, "#ff9ec8"); P(PX + 10, PY + PH - 14, 18, 2, "#ffffffcc"); P(PX + 4, PY + PH - 7, 30, 1, "#ffffff99"); P(PX + 4, PY + PH - 4, 22, 1, "#ffffff77");
      const prog = phase === "replay" || phase === "boom" ? clamp((sT - RS) / (8 * SPB), 0, 1) : tutMode ? (bt % 8) / 8 : clamp(sT / T, 0, 1);
      P(PX + 2, PY + 2, PW - 4, 1, "#ffffff40"); P(PX + 2, PY + 2, Math.round((PW - 4) * prog), 1, "#ffffff");
      if (clockOn && bp < 0.12 && phase !== "boom") { g.globalAlpha = 0.5 * (1 - bp / 0.12); P(PX - 1, PY - 1, PW + 2, 1, "#ff9ec8"); P(PX - 1, PY + PH, PW + 2, 1, "#ff9ec8"); P(PX - 1, PY, 1, PH, "#ff9ec8"); P(PX + PW, PY, 1, PH, "#ff9ec8"); g.globalAlpha = 1; }
      // 도구 칸(지금 구간 반짝)
      const secK = tutMode ? (tut === 2 ? "s" : tut === 3 ? "h" : "c") : (() => { let k = "c"; for (const s of SECS) if (bt >= s.b) k = s.k; return k; })();
      TOOLS.forEach(([k], i) => {
        const on = k === secK && !over, x = Math.round((PX - 2 - 18) / 2), y = toolY(i);
        P(x - 1, y - 1, 20, 20, on ? (bp < 0.2 ? "#ffd166" : "#ff5f9e") : "#2a2640"); P(x, y, 18, 18, on ? "#3a2a5a" : "#1a1730");
        g.globalAlpha = on ? 1 : 0.35; g.drawImage(ICON[k], x, y); g.globalAlpha = 1;
        toolLb[i].classList.toggle("on", on);
      });
      // 오른쪽: 박 표시등 + 편집력 막대
      const lx = RX + Math.floor(RWc / 2) - 5;
      for (let k = 0; k < 4; k++) { const on = clockOn && ((beat % 4) + 4) % 4 === k; P(lx + (k % 2) * 6, PY + 6 + Math.floor(k / 2) * 6, 4, 4, on ? (k === 0 ? "#ff5f9e" : "#ffd166") : "#2a2640"); if (on && bp < 0.25) { g.globalAlpha = 0.4; P(lx + (k % 2) * 6 - 1, PY + 5 + Math.floor(k / 2) * 6, 6, 6, "#ffd166"); g.globalAlpha = 1; } }
      const acc = N ? sumV / N : tutMode ? 0.5 : 0, gh = PH - 34, fh = Math.round(gh * acc), gx = RX + Math.floor(RWc / 2) - 3;
      for (let y = 0; y < fh; y++) P(gx, PY + 27 + gh - 1 - y, 6, 1, mix("#ff5f9e", "#ffd166", y / gh));
      if (fh > 0) P(gx, PY + 27 + gh - fh, 6, 1, "#fff");
      // 4) 타임라인
      if (!over) {
        const xOf = (t) => Math.round(playX + (t - sT) * PPS);
        // 박 눈금
        const b0 = Math.floor(sT / SPB - playX / PPS / SPB) - 1, b1 = Math.ceil(sT / SPB + (LW - playX) / PPS / SPB) + 1;
        for (let b = b0; b <= b1; b++) { const x = xOf(b * SPB); if (x < 0 || x >= LW) continue; const bar = ((b % 4) + 4) % 4 === 0; P(x, tlY, 1, bar ? 5 : 3, bar ? "#8a84b0" : "#4a4670"); P(x, vY, 1, 15, bar ? "#ffffff14" : "#ffffff08"); P(x, tY, 1, 9, "#ffffff08"); }
        for (let b = b0; b <= b1; b++) { const x = xOf((b + 0.5) * SPB); if (x >= 0 && x < LW) P(x, tlY, 1, 1, "#3a3660"); }
        // 지나간 클립(장면 색)
        for (let i = 0; i < segs.length; i++) {
          const s0 = segs[i].t0, s1 = i + 1 < segs.length ? segs[i + 1].t0 : sT, x0 = Math.max(0, xOf(s0)), x1 = Math.min(playX, xOf(s1));
          if (x1 <= x0) continue; const c = SCOL[segs[i].sc];
          P(x0, vY + 1, x1 - x0, 13, tint(c, 0.62)); P(x0, vY + 1, x1 - x0, 1, tint(c, 1.15)); for (let x = x0 + 1; x < x1 - 1; x += 3) P(x, vY + 5 + (x % 2), 2, 4, tint(c, 0.85));
          P(x0, vY + 1, 1, 13, "#0a0914");
        }
        // 앞으로 올 칸
        for (let x = playX + 1; x < LW; x += 4) P(x, vY + 7, 2, 1, "#3a3660");
        // 자막 막대
        for (const n of notes) if (n.k === "h") {
          const x0 = xOf(n.t), x1 = xOf(n.e); if (x1 < 0 || x0 >= LW) continue;
          const okH = n.j2 === "p" || n.j2 === "g", dead = n.j === "m" || (n.j2 && !okH);
          P(x0, tY + 1, x1 - x0, 7, dead ? "#5a5470" : okH ? "#7fe0a0" : "#ffd166"); P(x0, tY + 1, x1 - x0, 1, dead ? "#7a7490" : "#fff3b0"); P(x1 - 1, tY + 1, 1, 7, dead ? "#3a3450" : "#c9961c");
          P(x0 + 1, tY + 3, 3, 1, "#3a2400"); P(x0 + 2, tY + 4, 1, 3, "#3a2400");
          if (holding === n) { const hx = Math.min(playX, x1); P(x0, tY + 2, hx - x0, 5, "#ffffff"); for (let x = x0 + 5; x < hx - 1; x += 3) P(x, tY + 4, 2, 1, "#ff5f9e"); }
          if (!n.j) { P(x0, vY, 1, 15, "#ffd16655"); }
        }
        // 음악 파형(킥에서 크게)
        for (let x = 0; x < LW; x++) {
          const tt = sT + (x - playX) / PPS; if (tt < 0) continue;
          const st16 = tt / (SPB / 4), fr = st16 - Math.floor(st16), s = ((Math.floor(st16) % 16) + 16) % 16, b = Math.floor(tt / SPB);
          const S = musSec(b), big = S === "D", kk = big ? s % 4 === 0 : s === 0 || s === 8, sn = s === 4 || s === 12;
          const amp = Math.round((kk ? 5 * Math.exp(-fr * 2.5) : sn ? 3.5 * Math.exp(-fr * 3) : 1 + (s % 2 ? 0 : 0.6)) + Math.sin(x * 1.7) * 0.6);
          P(x, aY + 5 - amp, 1, amp * 2 + 1, x < playX ? "#2f8a86" : "#4fd8c8");
        }
        // 노트 표시
        let nextN = null;
        for (const n of notes) {
          if (n.k === "h") continue;
          const x = xOf(n.t); if (x < -6 || x > LW + 6) continue;
          if (n.j === "m" || n.j === "b") { P(x - 2, vY + 5, 5, 5, "#5a5470"); P(x - 1, vY + 6, 1, 1, "#ff6a7a"); P(x + 1, vY + 8, 1, 1, "#ff6a7a"); continue; }
          if (n.j) continue;
          if (!nextN || n.t < nextN.t) nextN = n;
          noteIcon(g, P, n, x, vY + 7, n.t - sT < 0.3);
        }
        for (const n of notes) if (n.k === "h" && !n.j && (!nextN || n.t < nextN.t)) nextN = n;
        // 다가오는 표시: 빨간 선 둘레 원이 줄어든다
        if (nextN) { const d = nextN.t - sT; if (d < 0.6 && d > -0.1) { const r = Math.max(2, Math.round(3 + d / 0.6 * 9)), cy = nextN.k === "h" ? tY + 4 : vY + 7, col = nextN.k === "c" ? "#ff9ec8" : nextN.k === "s" ? "#c88cff" : "#ffd166"; g.globalAlpha = 0.85; for (let a = 0; a < 24; a++) { const an = a / 24 * 6.283; P(Math.round(playX + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r * 0.8), 1, 1, col); } g.globalAlpha = 1; } }
        // 빨간 선
        P(playX, tlY - 1, 1, tlB - tlY + 1, "#ff3b5c"); P(playX - 2, tlY - 2, 5, 2, "#ff3b5c"); P(playX - 1, tlY, 3, 1, "#ff3b5c");
        g.globalAlpha = 0.25; P(playX - 1, vY, 3, tlB - vY, "#ff3b5c"); g.globalAlpha = 1;
        for (const f of fx) { const r = Math.round(2 + f.t * 40); g.globalAlpha = clamp(1 - f.t / 0.3, 0, 1); for (let a = 0; a < 20; a++) { const an = a / 20 * 6.283; P(Math.round(playX + Math.cos(an) * r), Math.round(vY + 7 + Math.sin(an) * r * 0.7), 1, 1, f.c); } g.globalAlpha = 1; }
      }
      // 끝: 타임라인 자리에 내가 자른 클립 필름(재생 중인 칸 반짝)
      if (over) {
        P(0, tlY - 1, LW, LH - tlY + 1, "#0f0d1c"); P(0, tlY - 2, LW, 1, "#3a3460");
        const n = rlist.length || 8, fw = Math.floor((LW - 8) / n), fy = LH - 19, fx0 = Math.round((LW - fw * n) / 2);
        P(fx0 - 2, fy - 4, fw * n + 4, 19, "#050409");
        for (let x = fx0; x < fx0 + fw * n; x += 4) { P(x, fy - 3, 2, 2, "#2a2640"); P(x, fy + 12, 2, 2, "#2a2640"); }
        for (let i = 0; i < n; i++) {
          const c = rlist[i]; if (!c) continue; const x = fx0 + i * fw, col = SCOL[c.sc], bad = c.gr === "b" || c.gr === "m", on = i === rIdx && phase === "replay";
          P(x, fy, fw - 1, 11, tint(col, bad ? 0.4 : 0.75)); P(x, fy, fw - 1, 1, tint(col, 1.2)); P(x + 2, fy + 3, fw - 5, 5, tint(col, bad ? 0.55 : 1));
          if (c.gr === "p") P(x + fw - 4, fy + 1, 2, 2, "#ffd166");
          if (bad) { for (let k = 0; k < 4; k++) P(x + 2 + k, fy + 3 + k, 1, 1, "#ff6a7a"); for (let k = 0; k < 4; k++) P(x + 5 - k, fy + 3 + k, 1, 1, "#ff6a7a"); }
          if (on) { P(x - 1, fy - 1, fw + 1, 1, "#fff"); P(x - 1, fy + 11, fw + 1, 1, "#fff"); P(x - 1, fy - 1, 1, 13, "#fff"); P(x + fw - 1, fy - 1, 1, 13, "#fff"); }
        }
      }
      // 하트(끝 연출)
      for (const h of hearts) { if (h.delay > 0) continue; drawHeart(g, Math.round(h.x + Math.sin(h.ph) * 2.5) - 3, Math.round(h.y), h.c, clamp(h.life, 0, 1)); }
    };

    // ── 손가락·힌트 ──
    let hintKey = "";
    const helpUI = (sT) => {
      if (over || tut === 0 || tut === 4) { hand.className = "rl-hand"; hintEl.classList.remove("on"); return; }
      let n = null; for (const x of notes) if (!x.j && (!n || x.t < n.t)) n = x;
      const hn = holding;
      const want = hn || (n && (n.help || missStreak >= 2) && n.t - sT < 1.4 ? n : null);
      if (!want) { hand.className = "rl-hand"; hintEl.classList.remove("on"); hintKey = ""; return; }
      const k = hn ? "hh" : want.k + (want.dir || "");
      if (k !== hintKey) {
        hintKey = k;
        hintEl.className = "rl-hint on " + want.k;
        hintEl.innerHTML = hn ? `<b>꾹…</b>막대 끝에서 떼요!` : want.k === "c" ? `<b>톡!</b>가위가 빨간 선에 닿을 때` : want.k === "s" ? `<b>${ARW[want.dir]} 쓱!</b>선에 닿을 때 화살표 방향으로` : `<b>꾹!</b>노란 막대가 선에 닿으면 누르고 있기`;
      } else hintEl.classList.add("on");
      const y = (want.k === "h" ? tY + 4 : vY + 7) * K;
      hand.style.left = playX * K + "px"; hand.style.top = y + "px";
      const mode = hn ? "hold" : want.k === "c" ? "tap" : want.k === "s" ? "sw-" + want.dir : "hold";
      if (!hand.classList.contains(mode)) hand.className = "rl-hand on " + mode;
    };

    // ── 흐름 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const sT = songT(now), tm = now / 1000;
      schedule(now);
      if (tut === 0) { if (opts.retry) startEdit(); else if (tm - t00 > 0.5) tutNext(1); }
      if (tutMode) tutGen(sT);
      if (!over && clockOn) {
        for (const n of notes) {
          if (!n.j && sT - n.t > BWIN && !(ptr && ptr.n === n)) judge(n, null);
          if (n.k === "h" && n.j && n.j !== "m" && !n.j2 && sT - n.e > BWIN) { if (holding === n) holding = null; judge(n, null, true); }
          if (n.subOff && sT > n.subOff) { n.subOff = 0; subEl.classList.remove("on"); }
        }
        if (ptr && ptr.n && sT - ptr.n.t > BWIN + 0.15) { const n = ptr.n; ptr.n = null; judge(n, 1); }
        // 자막 꾹 누르는 동안 글자가 한 자씩
        if (holding && holding.txt) {
          const p = clamp((sT - holding.t) / (holding.e - holding.t), 0, 1), n = Math.ceil(holding.txt.length * p), sp = subEl.querySelector("span");
          if (sp && sp.textContent.length !== n) { sp.textContent = holding.txt.slice(0, n) || " "; if (n) tone(1900 + n * 30, 0.02, "square", 0.03); }
        }
        // 구간 띠
        if (!tutMode) for (let i = 0; i < SECS.length; i++) if (i > secShown && sT >= SECS[i].b * SPB - 0.05) { secShown = i; banEl.innerHTML = `${SECS[i].n}<small>${SECS[i].s}</small>`; banEl.classList.remove("on"); void banEl.offsetWidth; banEl.classList.add("on"); if (i) SFX.whoosh(); }
      }
      if (over) {
        const b = sT / SPB;
        if (phase === "render") { upEl.querySelector("em").style.setProperty("--p", clamp((b - 48) / 1.8, 0, 1) * 100 + "%"); if (b >= 50) { phase = "replay"; RS = 50 * SPB; upEl.classList.remove("on"); vwEl.classList.add("on"); SFX.snap(); } }
        if (phase === "replay") { const p = clamp((sT - RS) / (8 * SPB), 0, 1); vwEl.querySelector("b").textContent = fmtV(views * 0.12 * p * p); if (b >= 58) boom(); }
        if (phase === "boom") boomT += dt;
      }
      helpUI(sT);
      if (trans) { trans.t += dt; if (trans.t > 0.24) trans = null; }
      if (flashT > 0) flashT -= dt; if (glitchT > 0) glitchT -= dt; if (shakeT > 0) shakeT -= dt;
      for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > 0.3) fx.splice(i, 1); }
      for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.delay > 0) { h.delay -= dt; continue; } h.y += h.vy * dt; h.ph += dt * 4; h.life -= dt * 0.6; if (h.life <= 0 || h.y < -8) hearts.splice(i, 1); }
      render(sT, clockOn ? Math.max(0, sT) : tm);
      raf = requestAnimationFrame(loop);
    };
    const t00 = performance.now() / 1000;
    if (dbg) {
      const sched = new Set();
      const fire = (n, err) => {
        if (sched.has(n)) return; sched.add(n);
        const d = n.t - songT(), cx = st.clientWidth / 2, cy = st.clientHeight * 0.8;
        setTimeout(() => { inDown(cx, cy); if (n.k === "s") { const [dx, dy] = DV[n.dir]; inMove(cx + dx * 30, cy + dy * 30); inUp(); } else if (n.k === "c") inUp(); }, Math.max(0, (d + err) * 1000));
        if (n.k === "h") setTimeout(() => inUp(), Math.max(0, (n.e - songT() + err) * 1000));
      };
      const autoAll = (err) => { const t = songT(); for (const n of notes) if (!n.j && n.t - t < 0.32 && n.t - t > -0.05) fire(n, err); };
      dbg.insta3 = {
        st: () => ({ tut, sT: +songT().toFixed(2), over, phase, combo, maxCombo, cnt: { ...cnt }, N, acc: N ? +(sumV / N).toFixed(3) : 0, stray, score: +score.toFixed(3), views, art, cur, clips: clips.length }),
        tut: () => tut,
        tutDo: () => { if (tut === 4) startEdit(); else if (tut > 0) autoAll(0); },
        start: () => startEdit(),
        auto: (err = 0) => autoAll(err),
      };
    }
    render(0, 0);
    raf = requestAnimationFrame(loop);
  },
};
