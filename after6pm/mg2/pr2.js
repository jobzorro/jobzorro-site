// 미니게임 2탄(pr2): 파티룸 "파티는 빈틈없이"(주말 예약 달력)
// 160x250 논리 픽셀 도트 캔버스를 정수배로 키운다. 위: 예약 알림 카드 3칸, 아래: 금·토·일 × 2시간 6칸 달력.
// 카드를 끌어 빈 칸에 끼운다. 예약 사이엔 청소 1칸(빗자루)이 꼭 필요. 위로 밀면 거절. 한 요일이 꽉 차면 만실!
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, H = 250, CX = 22, CW = 22, NC = 6, RY = [84, 138, 192], RH = 52, TY = 16, CDW = 50, CDH = 54;
const SX = (s) => 3 + s * 52;
const DAYS = ["금", "토", "일"], DAYC = ["#ff8ac8", "#7fd1ff", "#ffd166"];
const TIMES = ["12", "14", "16", "18", "20", "22"];
const BULB = ["#ff5f7a", "#ffd166", "#5fe0a0", "#5fb8ff", "#c77dff"];
// 요일 글자(7x10)
const GLY = {
  금: ["XXXXXX.", ".....X.", ".....X.", ".......", "XXXXXXX", ".......", ".XXXXX.", ".X...X.", ".X...X.", ".XXXXX."],
  토: [".XXXXX.", ".X.....", ".XXXX..", ".X.....", ".XXXXX.", ".......", "...X...", "...X...", "XXXXXXX", "......."],
  일: [".XX..X.", "X..X.X.", "X..X.X.", ".XX..X.", ".......", "XXXXXX.", ".....X.", "XXXXXX.", "X......", "XXXXXX."],
};
// 숫자(3x5)
const DG = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 4: "101101111001001", 6: "111100111101111", 8: "111101111101111" };
const shade = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
// 모임 종류: 이름, 색, 길이(2시간 칸 수), 칸당 값(만원), 사람 유형, 응원봉, 그림(16x16)
const EV = [
  { k: "cake", n: "생일파티", s: "생일파티", c: "#ff6fa8", L: [1, 2], p: 5, ty: "teen", up: 0,
    d: (P) => { P(2, 13, 12, 2, "#e8e8f0"); P(2, 15, 12, 1, "#a8a8ba"); P(3, 8, 10, 5, "#ffe6ef"); P(3, 8, 10, 1, "#ff6fa8"); P(4, 9, 1, 1, "#ff6fa8"); P(8, 9, 1, 2, "#ff6fa8"); P(11, 9, 1, 1, "#ff6fa8"); P(3, 11, 10, 1, "#ffc2d8"); P(5, 5, 6, 3, "#fff6f9"); P(5, 5, 6, 1, "#ff6fa8"); P(7, 4, 2, 1, "#e0304a"); P(6, 1, 1, 3, "#7fd1ff"); P(9, 1, 1, 3, "#ffd166"); P(6, 0, 1, 1, "#ffb347"); P(9, 0, 1, 1, "#ffb347"); } },
  { k: "bridal", n: "브라이덜 샤워", s: "브라이덜 샤워", c: "#ffa8d8", L: [2], p: 6, ty: "plain", up: 0,
    d: (P) => { const bl = (x, y, c) => { P(x - 1, y, 3, 1, c); P(x, y - 1, 1, 3, c); P(x, y, 1, 1, "#ffd166"); }; P(7, 8, 1, 6, "#4a9a5a"); P(5, 9, 1, 4, "#4a9a5a"); P(10, 9, 1, 4, "#4a9a5a"); bl(4, 4, "#ffffff"); bl(8, 2, "#ffb3d9"); bl(11, 5, "#ffffff"); bl(7, 6, "#ff8ac8"); bl(3, 8, "#ffb3d9"); bl(12, 9, "#ffd0ea"); P(4, 11, 8, 2, "#ff6fa8"); P(3, 12, 2, 2, "#ff6fa8"); P(11, 12, 2, 2, "#ff6fa8"); P(7, 11, 2, 2, "#ffd0ea"); } },
  { k: "reunion", n: "동창회", s: "동창회", c: "#5fb8ff", L: [2, 3], p: 5, ty: "worker", up: 0,
    d: (P) => { [[7, 2, 2], [5, 3, 6], [3, 4, 10], [1, 5, 14], [3, 6, 10], [5, 7, 6]].forEach(([x, y, w]) => P(x, y, w, 1, "#2e2e44")); P(5, 3, 2, 1, "#4a4a68"); P(4, 7, 8, 4, "#3a3a52"); P(4, 7, 8, 1, "#24243a"); P(12, 5, 1, 6, "#ffd166"); P(11, 11, 3, 2, "#ffd166"); P(2, 12, 8, 3, "#f4ecd8"); P(9, 12, 1, 3, "#e05a5a"); P(2, 12, 8, 1, "#ffffff"); } },
  { k: "company", n: "회사 회식", s: "회사 회식", c: "#4fd1a5", L: [2, 3], p: 6, ty: "worker", up: 1,
    d: (P) => { P(2, 1, 10, 4, "#fffaf0"); P(3, 0, 3, 1, "#fffaf0"); P(7, 0, 3, 1, "#fffaf0"); P(3, 5, 8, 10, "#ffc94a"); P(4, 6, 1, 8, "#ffe08a"); P(9, 5, 1, 10, "#e0a020"); P(3, 14, 8, 1, "#c98a10"); P(11, 7, 3, 1, "#e8e8f0"); P(13, 7, 1, 5, "#e8e8f0"); P(11, 11, 3, 1, "#e8e8f0"); P(6, 9, 1, 1, "#fff3c0"); P(7, 12, 1, 1, "#fff3c0"); P(5, 7, 1, 1, "#fff3c0"); } },
  { k: "idol", n: "아이돌 생일카페", s: "아이돌 생카", c: "#c77dff", L: [3], p: 5, ty: "teen", up: 1,
    d: (P) => { [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."].forEach((r, y) => [...r].forEach((ch, x) => ch === "X" && P(4 + x, 1 + y, 1, 1, y < 2 ? "#ffb3f0" : "#ff6fd8"))); P(5, 2, 1, 1, "#ffffff"); P(7, 7, 2, 7, "#e8e8f0"); P(8, 7, 1, 7, "#b8b8cc"); P(7, 13, 2, 2, "#8a8aa4"); P(1, 3, 1, 1, "#fff3a0"); P(13, 2, 1, 1, "#fff3a0"); P(13, 9, 1, 1, "#ffd166"); P(2, 10, 1, 1, "#ffd166"); } },
  { k: "mt", n: "과 MT 뒤풀이", s: "MT 뒤풀이", c: "#ff9f43", L: [3], p: 4, ty: "student", up: 1,
    d: (P) => { for (let i = 0; i < 7; i++) P(8 + i, 7 - i, 2, 2, "#6a4430"); P(14, 0, 2, 2, "#3a2216"); [[3, 7, 4], [2, 8, 6], [2, 9, 7], [1, 10, 8], [1, 11, 8], [1, 12, 8], [2, 13, 6], [3, 14, 4]].forEach(([x, y, w]) => P(x, y, w, 1, "#e0903a")); P(2, 9, 1, 4, "#f4b060"); P(4, 10, 2, 2, "#3a2216"); P(3, 13, 3, 1, "#b06a20"); } },
  { k: "board", n: "보드게임 모임", s: "보드게임", c: "#7fd1ff", L: [1], p: 4, ty: "plain", up: 0,
    d: (P) => { P(1, 6, 8, 8, "#fafafa"); P(1, 13, 8, 1, "#c8c8d8"); P(8, 6, 1, 8, "#d8d8e4"); [[2, 7], [6, 7], [4, 9], [2, 11], [6, 11]].forEach(([x, y]) => P(x, y, 1, 1, "#222")); P(8, 1, 7, 7, "#ff5f7a"); P(8, 7, 7, 1, "#c03a52"); [[9, 2], [13, 2], [11, 4], [9, 6], [13, 6]].forEach(([x, y]) => y < 7 && P(x, y, 1, 1, "#ffffff")); } },
  { k: "ring", n: "프러포즈 이벤트", s: "프러포즈", c: "#ff5f7a", L: [1], p: 9, ty: "worker", up: 0,
    d: (P) => { P(5, 8, 6, 1, "#ffd166"); P(4, 9, 1, 4, "#ffd166"); P(11, 9, 1, 4, "#e0a020"); P(5, 13, 6, 1, "#e0a020"); P(5, 9, 1, 1, "#fff0b0"); P(6, 3, 4, 3, "#7fe8ff"); P(7, 2, 2, 1, "#c8f8ff"); P(6, 3, 1, 1, "#ffffff"); P(7, 6, 2, 2, "#ffd166"); P(2, 2, 1, 1, "#fff3a0"); P(13, 4, 1, 1, "#fff3a0"); P(12, 1, 1, 1, "#ffffff"); } },
];
const GOLD = "#ffd166";

let SP = null;
function cvs(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function mk(w, h, fn) { const c = cvs(w + 2, h + 2), g = c.getContext("2d"); fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); }); uOutline(c); return c; }
function glyph(g, k, x, y, col) { g.fillStyle = col; GLY[k].forEach((r, j) => [...r].forEach((ch, i) => ch === "X" && g.fillRect(x + i, y + j, 1, 1))); }
function digits(g, s, x, y, col) { g.fillStyle = col; [...s].forEach((d, k) => [...DG[d]].forEach((b, i) => b === "1" && g.fillRect(x + k * 4 + (i % 3), y + Math.floor(i / 3), 1, 1))); }
function sprites() {
  if (SP) return SP;
  const S = { ic: {} };
  for (const e of EV) S.ic[e.k] = mk(16, 16, e.d);
  S.broom = mk(10, 12, (P) => { [8, 8, 7, 7, 6, 5, 5].forEach((x, i) => P(x, i, 1, 1, "#8a5a2b")); P(3, 7, 4, 1, "#cc3333"); P(1, 8, 7, 4, "#e8c060"); P(1, 8, 7, 1, "#f8e090"); P(2, 9, 1, 3, "#c9a040"); P(4, 9, 1, 3, "#c9a040"); P(6, 9, 1, 3, "#c9a040"); });
  S.bell = mk(5, 5, (P) => { P(1, 0, 3, 1, "#fff3c0"); P(0, 1, 5, 3, "#ffe08a"); P(0, 3, 5, 1, "#e0b040"); P(2, 4, 1, 1, "#fff3c0"); });
  // 배경
  const c = cvs(W, H), g = c.getContext("2d"), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  P(0, 0, W, H, "#170d2a");
  for (let x = 0; x < W; x += 8) P(x, 73, 3, H - 73, "#1c1131");
  for (let y = 78; y < H; y += 8) for (let x = ((y / 8) % 2) * 4 + 2; x < W; x += 8) P(x, y, 1, 1, "#2a1a44");
  P(0, 0, W, 13, "#0c0616"); P(0, 12, W, 1, "#2a1a40");
  // 알림판
  P(2, 14, W - 4, 58, "#1f1238"); P(1, 15, W - 2, 56, "#1f1238");
  P(2, 14, W - 4, 1, "#4a3070"); P(2, 71, W - 4, 1, "#110920"); P(1, 15, 1, 56, "#3a2558"); P(W - 2, 15, 1, 56, "#110920");
  for (let s = 0; s < 3; s++) {
    const x = SX(s);
    for (let i = 1; i < CDW - 1; i += 4) { P(x + i, TY, 2, 1, "#33224f"); P(x + i, TY + CDH - 1, 2, 1, "#33224f"); }
    for (let j = 1; j < CDH - 1; j += 4) { P(x, TY + j, 1, 2, "#33224f"); P(x + CDW - 1, TY + j, 1, 2, "#33224f"); }
    P(x + 22, TY + 22, 6, 1, "#2c1d46"); P(x + 21, TY + 23, 8, 6, "#2c1d46"); P(x + 20, TY + 29, 10, 1, "#2c1d46"); P(x + 24, TY + 30, 2, 1, "#2c1d46");
  }
  // 시간 머리줄
  P(CX - 1, 74, NC * CW + 1, 9, "#120a22");
  for (let i = 0; i < NC; i++) { digits(g, TIMES[i], CX + i * CW + 2, 76, "#a68ed6"); P(CX + i * CW, 74, 1, 9, "#2e1f4a"); P(CX + i * CW + 11, 80, 1, 2, "#3a2a5a"); }
  // 요일 줄
  RY.forEach((y, d) => {
    P(0, y - 2, W, RH + 4, "#0e0720");
    P(1, y, 19, RH, shade(DAYC[d], 0.2)); P(1, y, 19, 1, shade(DAYC[d], 0.45)); P(1, y + RH - 1, 19, 1, shade(DAYC[d], 0.12));
    for (let i = 0; i < NC; i++) {
      const x = CX + i * CW;
      P(x, y, CW - 1, RH, "#1d1233"); P(x, y, CW - 1, 1, "#33235a"); P(x, y + RH - 9, CW - 1, 8, "#251740"); P(x, y + RH - 9, CW - 1, 1, "#2e1d4c"); P(x, y + RH - 1, CW - 1, 1, "#120a24");
      for (let k = 0; k < 3; k++) P(x + 3 + k * 7, y + RH - 6, 4, 1, "#2b1b48");
      P(x + 10, y + 18, 1, 1, "#2c1d48"); P(x + 10, y + 24, 1, 1, "#2c1d48");
    }
  });
  P(0, 246, W, 4, "#0b0616");
  S.bg = c;
  return (SP = S);
}
// 방법 화면 그림 3칸
function steps() {
  const S = sprites();
  const img = (w, h, fn) => { const c = cvs(w, h), g = c.getContext("2d"); fn(g, (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return `<img src="${c.toDataURL()}" alt="" style="width:${w * 2}px;height:${h * 2}px;image-rendering:pixelated">`; };
  const cell = (P, x, y, w, h) => { P(x, y, w, h, "#1d1233"); P(x, y, w, 1, "#33235a"); };
  const book = (g, P, x, y, w, h, c, k) => { P(x, y, w, h, shade(c, 0.4)); P(x, y, w, 3, c); P(x, y + h - 1, w, 1, shade(c, 0.25)); g.drawImage(S.ic[k], x + 1, y + 3); };
  const a = img(40, 32, (g, P) => {
    P(0, 0, 40, 32, "#1f1238"); P(4, 2, 32, 28, "#2b1b48"); P(4, 2, 32, 5, shade("#ff6fa8", 0.5)); P(4, 2, 32, 1, "#ff6fa8"); g.drawImage(S.bell, 5, 2); g.drawImage(S.ic.cake, 6, 8);
    P(25, 12, 8, 2, "#ffffff"); P(25, 16, 6, 1, "#c8b8e8"); P(10, 26, 9, 3, "#ff6fa8"); P(20, 26, 9, 3, "#ff6fa8"); P(36, 14, 1, 10, "#ffffff"); P(35, 22, 3, 1, "#ffffff"); P(34, 21, 5, 1, "#ffffff");
  });
  const b = img(48, 26, (g, P) => {
    P(0, 0, 48, 26, "#0e0720"); for (let i = 0; i < 4; i++) cell(P, 1 + i * 12, 2, 11, 22);
    book(g, P, 1, 2, 11, 22, "#4fd1a5", "company");
    P(13, 2, 11, 22, "#2a2440"); for (let k = 0; k < 22; k += 4) P(13 + (k % 11), 2 + k, 2, 1, "#3a3456"); g.drawImage(S.broom, 13, 7);
    P(25, 2, 23, 22, "#ff3d6e66"); P(25, 2, 23, 1, "#ff6f8f"); for (let k = 0; k < 7; k++) { P(32 + k, 9 + k, 2, 1, "#ffffff"); P(38 - k, 9 + k, 2, 1, "#ffffff"); }
  });
  const c = img(48, 26, (g, P) => {
    P(0, 0, 48, 26, "#0e0720"); for (let i = 0; i < 4; i++) cell(P, 1 + i * 12, 4, 11, 20);
    book(g, P, 1, 4, 23, 20, GOLD, "idol"); P(25, 4, 11, 20, "#2a2440"); g.drawImage(S.broom, 25, 9); book(g, P, 37, 4, 11, 20, "#ff5f7a", "ring");
    [[6, 1, "#ff8ac8"], [20, 0, "#ffd166"], [33, 1, "#7fd1ff"], [44, 0, "#5fe0a0"]].forEach(([x, y, col]) => { P(x - 2, y + 1, 5, 1, col); P(x, y - 1 + 1, 1, 3, col); });
  });
  return [[a, "알림을 끌어 넣기"], [b, "사이엔 청소 1칸"], [c, "꽉 차면 만실!"]];
}

export const GAME = {
  key: "pr2", base: "pr", n: "파티는 빈틈없이", desc: "금·토·일 파티룸 주말 달력에 예약을 꽉꽉 끼워 넣어요.",
  how: [
    "위에 뜬 예약 알림을 <b>끌어서</b> 달력 빈 칸에 끼워요. 한 칸은 2시간이에요.",
    "예약 사이엔 <b>청소 1칸</b>이 꼭 필요해요. 붙이면 빨갛게 안 돼요. <b>위로 밀면 거절</b>.",
    "<b>금색 단체 예약</b>은 큰돈! 한 요일을 꽉 채우면 <b>만실</b> 보너스.",
  ],
  steps,
  css: `
.mg-pr2 .mg-pr2st{background:#0b0616!important;display:flex;align-items:center;justify-content:center}
.mg-pr2 .mg-pr2w{position:relative;flex:0 0 auto}
.mg-pr2 .mg-pr2w canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:grab}
.mg-pr2 .mg-pr2l{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-size:calc(var(--k,2) * 5px);line-height:1.15}
.mg-pr2 .mg-pr2c{position:absolute;width:31.25%;height:21.6%;color:#fff}
.mg-pr2 .mg-pr2c .am{position:absolute;left:42%;top:23%;font-size:1.6em;font-weight:900;color:#fff;text-shadow:0 1px 0 #000,0 0 6px #ff8ac8aa;white-space:nowrap}
.mg-pr2 .mg-pr2c.gold .am{color:#ffe08a;text-shadow:0 1px 0 #000,0 0 7px #ffb300}
.mg-pr2 .mg-pr2c .nm{position:absolute;left:5%;right:2%;top:57%;font-size:max(11px,.92em);font-weight:800;white-space:nowrap;overflow:hidden;color:#eadfff;letter-spacing:-.04em}
.mg-pr2 .mg-pr2c .dy{position:absolute;right:3%;top:1.5%;font-style:normal;font-size:max(11px,.82em);font-weight:900;color:#2a0a1a;background:#ffd0e6;padding:0 .3em;border-radius:.3em;white-space:nowrap}
.mg-pr2 .mg-pr2c.dr .nm,.mg-pr2 .mg-pr2c.dr .dy{display:none}
.mg-pr2 .mg-pr2c.dr .am{left:auto;right:0;top:-1.5em;background:#000a;border-radius:.4em;padding:0 .3em}
.mg-pr2 .mg-pr2c.off{display:none}
.mg-pr2 .mg-pr2rej{position:absolute;left:0;right:0;top:0;height:6%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.1em;color:#ffd0e0;background:linear-gradient(#2a0818f0,#ff3d6e55);opacity:0;transition:opacity .15s}
.mg-pr2 .mg-pr2rej.on{opacity:.8}
.mg-pr2 .mg-pr2rej.hot{opacity:1;color:#fff;background:linear-gradient(#ff3d6e,#ff3d6e88)}
.mg-pr2 .mg-pr2full{position:absolute;left:13.75%;width:82.5%;height:20.8%;display:flex;align-items:center;justify-content:center;font-size:3.4em;font-weight:900;color:#fff;letter-spacing:.06em;text-shadow:0 0 3px #fff,0 0 8px #ff4fd8,0 0 16px #ff4fd8,0 0 28px #c77dff;animation:mgpr2full 1.7s ease-out forwards}
@keyframes mgpr2full{0%{transform:scale(2.4);opacity:0}14%{transform:scale(.9);opacity:1}24%{transform:scale(1.06)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-25%)}}
.mg-pr2 .mg-pr2tag{position:absolute;left:.3%;width:12.5%;font-size:max(11px,.8em);font-weight:900;text-align:center;color:#fff;text-shadow:0 0 4px #ff4fd8,0 0 8px #ff4fd8;animation:mgpr2tag 1s steps(2) infinite}
@keyframes mgpr2tag{50%{opacity:.55}}
.mg-pr2 .mg-pr2tot{position:absolute;left:9%;right:9%;top:38%;padding:.7em .4em;border-radius:.9em;background:#140828ee;border:2px solid #ffd166;box-shadow:0 0 18px #ffd16688,inset 0 0 12px #ffd16633;text-align:center;opacity:0;transform:scale(.5);transition:transform .4s cubic-bezier(.3,1.6,.5,1),opacity .25s}
.mg-pr2 .mg-pr2tot.on{opacity:1;transform:none}
.mg-pr2 .mg-pr2tot small{display:block;color:#e9dcff;font-weight:800;font-size:1.15em}
.mg-pr2 .mg-pr2tot b{display:block;font-size:3em;color:#ffe08a;text-shadow:0 0 10px #ffb300;letter-spacing:-.02em;white-space:nowrap}
.mg-pr2 .mg-pr2tot em{display:block;font-style:normal;color:#ff9fdc;font-weight:800;font-size:1.05em;min-height:1.2em}
`,
  run(host, ez, finish) {
    const T = 30, S = sprites();
    const F = frame(host, "pr2", "파티는 빈틈없이", "mg-pr2st", "", "");
    F.stage.insertAdjacentHTML("beforeend", `<div class="mg-pr2w"><canvas width="${W}" height="${H}"></canvas><div class="mg-pr2l"><div class="mg-pr2rej">↑ 놓으면 거절</div><div class="mg-pr2tot"><small>이번 주 매출</small><b>0원</b><em></em></div></div></div>`);
    const wrap = F.stage.querySelector(".mg-pr2w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), lay = wrap.querySelector(".mg-pr2l"), rejEl = lay.querySelector(".mg-pr2rej"), totEl = lay.querySelector(".mg-pr2tot");
    g.imageSmoothingEnabled = false;
    const fit = () => { const sw = F.stage.clientWidth, sh = F.stage.clientHeight; if (!sw || !sh) return; const r = Math.min(sw / W, sh / H), K = r >= 2 ? Math.floor(r) : Math.max(1, r); wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px"; wrap.style.setProperty("--k", K); };
    fit(); requestAnimationFrame(fit);
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const pct = (v, m) => (v / m) * 100 + "%";
    const toL = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };

    // 상태
    const grid = [0, 1, 2].map(() => Array(NC).fill(0)); // 0 빈칸 1 예약 2 청소
    const brT = [0, 1, 2].map(() => Array(NC).fill(-9));
    const full = [-1, -1, -1];
    const reqs = [], slots = [null, null, null], books = [], leaving = [];
    const pts = [], fws = [];
    let tt = 0, tm = null, started = false, over = false, done = false, raf = 0, drag = null, earned = 0, bonus = 0, cleanMiss = 0, placedN = 0, rejN = 0, expN = 0, endT = -1, rush = false, lastHint = 0, ghost = null;
    const prog = () => (tm ? clamp(1 - tm.left() / T, 0, 1) : 0);
    const upd = () => { F.sc.textContent = `${earned + bonus}만 · 만실 ${full.filter((v) => v >= 0).length}`; };

    // 예약 요청 만들기
    // 이번 주 문의 일정(30초 전체)을 미리 정해 둔다 → 점수 기준도 이 전체로 계산
    const plan = [];
    for (let at = 0.1; at < T - 1; ) {
      let ev = pick(EV);
      if (rnd() < 0.25) ev = pick(EV.filter((e) => e.L[0] === 1)); // 남은 칸에 맞는 짧은 예약도 섞이게
      const L = pick(ev.L), gold = L === 3 && rnd() < 0.4, day = rnd() < 0.3 ? rint(3) : -1;
      plan.push({ at, ev, L, gold, day });
      at += plan.length === 1 ? 0.6 : (2.3 - 1.15 * (at / T)) * (0.85 + rnd() * 0.3);
    }
    // 금색 단체는 한 판에 적어도 2번
    for (let k = plan.filter((q) => q.gold).length, i = 3; k < 2 && i < plan.length; i += 5) { const q = plan[i]; if (q.gold) continue; q.ev = pick(EV.filter((e) => e.L.includes(3))); q.L = 3; q.gold = true; k++; }
    plan.forEach((q) => (q.amt = Math.max(3, Math.round(q.L * q.ev.p * (0.85 + rnd() * 0.35) * (q.gold ? 1.75 : 1)))));
    let pi = 0;
    const mkReq = (q) => {
      const { ev, L, gold, day, amt } = q;
      const life = (9.5 - 3.5 * prog()) * ez;
      const r = { ev, L, gold, day, amt, life, t0: tt, st: "in", slot: -1, x: 0, y: 0, ret: null, people: [] };
      r.nm = (gold ? "단체 " : "") + ev.s;
      r.el = document.createElement("div"); r.el.className = "mg-pr2c" + (gold ? " gold" : "");
      r.el.innerHTML = `<b class="am">${r.amt}만</b><span class="nm">${r.nm}</span>${day >= 0 ? `<i class="dy">${DAYS[day]}요일만!</i>` : ""}`;
      lay.appendChild(r.el);
      return r;
    };
    const arrive = (q) => {
      const s = slots.indexOf(null); if (s < 0) return false;
      const r = mkReq(q); r.slot = s; slots[s] = r; reqs.push(r);
      tone(1175, 0.07, "sine", 0.12); tone(1568, 0.11, "sine", 0.1, 0, 0.08);
      if (r.gold) { tone(2093, 0.08, "triangle", 0.08, 0, 0.18); tone(2637, 0.12, "triangle", 0.07, 0, 0.25); F.msg("큰 단체 예약 문의! 금색은 큰돈"); vib(15); }
      else if (r.day >= 0 && performance.now() - lastHint > 2500) { lastHint = performance.now(); F.msg(`"${DAYS[r.day]}요일만 돼요?"`); }
      return true;
    };
    const cardPos = (r) => {
      let x = SX(r.slot), y = TY;
      const a = (tt - r.t0) / 0.38; if (a < 1) { const c1 = 1.7, e = 1 + (c1 + 1) * Math.pow(a - 1, 3) + c1 * Math.pow(a - 1, 2); y = TY - (1 - e) * 70; }
      if (r.ret) { const p = clamp((tt - r.ret.t0) / 0.22, 0, 1), e = 1 - Math.pow(1 - p, 3); x = r.ret.fx + (x - r.ret.fx) * e; y = r.ret.fy + (y - r.ret.fy) * e; if (p >= 1) r.ret = null; }
      return [x, y];
    };
    const unslot = (r) => { if (r.slot >= 0 && slots[r.slot] === r) slots[r.slot] = null };
    const leave = (r, how, silent) => {
      unslot(r); r.st = how; r.lt = tt; const [x, y] = r.st === "rej" && r.dx != null ? [r.dx, r.dy] : cardPos(r); r.lx = x; r.ly = y; leaving.push(r); r.el.classList.add("off");
      if (silent) return;
      const sp = stageXY(x + 25, y + 20);
      if (how === "exp") { expN++; F.float(sp, "다른 데 잡았대요", "bad"); tone(520, 0.18, "triangle", 0.08, -260); }
      else { rejN++; F.float(sp, "거절"); SFX.whoosh(); vib(8); }
    };
    // 놓을 수 있나: null 이면 OK, 아니면 이유
    const check = (r, d, s) => {
      if (s < 0 || s + r.L > NC) return "out";
      for (let c = s; c < s + r.L; c++) if (grid[d][c] === 1) return "busy";
      for (let c = s; c < s + r.L; c++) if (grid[d][c] === 2) return "clean";
      if (r.day >= 0 && r.day !== d) return "day";
      return null;
    };
    const dust = (x, y, n, w = 8) => { for (let i = 0; i < n; i++) { const l = 0.4 + rnd() * 0.4; pts.push({ x: x + (rnd() - 0.5) * w, y: y - rnd() * 3, vx: (rnd() - 0.5) * 30, vy: -8 - rnd() * 16, l, m: l, c: pick(["#e8dcc8", "#cbbfa8", "#a89a86", "#f4ecdc"]), s: rnd() < 0.3 ? 2 : 1, gr: 14 }); } };
    const coins = (x, y, n) => { for (let i = 0; i < n; i++) { const l = 0.5 + rnd() * 0.4; pts.push({ x, y, vx: (rnd() - 0.5) * 70, vy: -30 - rnd() * 40, l, m: l, c: rnd() < 0.5 ? "#ffd166" : "#fff3a0", s: 2, gr: 120 }); } };
    const firework = (x, y, c, n = 22) => { if (RM()) n = 8; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + rnd() * 0.2, v = 22 + rnd() * 26, l = 0.7 + rnd() * 0.5; fws.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l, m: l, c: rnd() < 0.25 ? "#ffffff" : c }); } noise(0.12, 900 + rnd() * 800, 0.12, 0, 0.6); tone(300 + rnd() * 200, 0.12, "sine", 0.06, 900); };
    const place = (r, d, s, fx, fy) => {
      unslot(r); r.st = "placed"; r.el.remove();
      for (let c = s; c < s + r.L; c++) grid[d][c] = 1;
      const brs = [];
      for (const c of [s - 1, s + r.L]) if (c >= 0 && c < NC && grid[d][c] === 0) { grid[d][c] = 2; brT[d][c] = tt + 0.18; brs.push(c); }
      const b = { r, d, s, L: r.L, t0: tt, fx, fy, fl: -9, ppl: [] };
      for (let k = 0; k < r.L; k++) b.ppl.push({ p: { spec: uSpec(r.ev.ty), cache: {} }, ph: rnd() * 4, up: r.ev.up && rnd() < 0.7 });
      b.cf = Array.from({ length: 4 + r.L * 3 }, () => [rnd(), rnd(), pick(BULB)]);
      books.push(b);
      earned += r.amt; placedN++;
      const bx = CX + s * CW + (r.L * CW) / 2, by = RY[d] + RH / 2;
      SFX.snap(); tone(1568, 0.05, "square", 0.06, 0, 0.06); tone(2093, 0.09, "square", 0.06, 0, 0.11);
      F.hit(stageXY(bx, by - 10), `${r.amt}만`, r.gold ? "#ffd166" : r.ev.c); coins(bx, by - 6, r.gold ? 16 : 8);
      if (r.gold) { firework(bx, by - 14, GOLD, 18); vib([15, 30, 15]); }
      if (brs.length) setTimeout(() => { if (!done) SFX.sweep(); }, 180);
      brs.forEach((c) => dust(CX + c * CW + 11, RY[d] + RH - 6, 6, 14));
      // 만실 확인
      if (full[d] < 0 && grid[d].every((v) => v !== 0)) {
        full[d] = tt; bonus += 5;
        const el = document.createElement("div"); el.className = "mg-pr2full"; el.textContent = "만실!"; el.style.top = pct(RY[d], H); lay.appendChild(el); setTimeout(() => el.remove(), 1800);
        const tg = document.createElement("div"); tg.className = "mg-pr2tag"; tg.textContent = "만실"; tg.style.top = pct(RY[d] + RH - 13, H); lay.appendChild(tg);
        for (let k = 0; k < 4; k++) setTimeout(() => { if (!done) firework(30 + rnd() * 120, RY[d] + 4 + rnd() * 30, pick(["#ff8ac8", "#7fd1ff", "#ffd166", "#5fe0a0", "#c77dff"])); }, k * 160);
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.07, 0, 0.15 + i * 0.07));
        F.msg(`${DAYS[d]}요일 만실! 보너스 +5만`); vib([20, 40, 20, 40, 40]);
        if (full.every((v) => v >= 0)) setTimeout(() => { if (!over) { F.msg("주말 전부 만실! 사장님 최고"); end(); } }, 900);
      }
      upd();
    };
    const fail = (r, d, s, why) => {
      const sp = stageXY(CX + (s + r.L / 2) * CW, RY[d] + RH / 2);
      if (why === "clean") { cleanMiss++; F.miss(sp); F.msg("예약 사이엔 청소 1칸이 꼭 필요해요!"); }
      else if (why === "day") { F.miss(sp); F.msg(`손님이 ${DAYS[r.day]}요일만 된대요!`); }
      else if (why === "busy") { SFX.fail(); vib(20); F.float(sp, "✕", "bad"); F.msg("이미 예약된 시간이에요"); }
    };
    // 끌어서 놓기
    const dragRect = () => { const w = drag.r.L * CW - 2, h = RH - 4; return [drag.x - w / 2, drag.y - 26 - h / 2, w, h]; };
    const target = () => {
      if (!drag) return null; const [bx, by, w, h] = dragRect(), cy = by + h / 2;
      if (cy < RY[0] - 14 || cy > RY[2] + RH + 14 || bx + w < CX - 4) return null;
      let d = 0; RY.forEach((y, i) => { if (Math.abs(cy - y - RH / 2) < Math.abs(cy - RY[d] - RH / 2)) d = i; });
      const s = clamp(Math.round((bx - CX) / CW), 0, NC - drag.r.L);
      return { d, s, why: check(drag.r, d, s) };
    };
    const tryDrop = (r, d, s, fx, fy) => { const why = check(r, d, s); if (!why) { place(r, d, s, fx, fy); return true; } fail(r, d, s, why); return false; };
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault(); if (!started || over || drag) return;
      const [lx, ly] = toL(e);
      for (const r of slots) {
        if (!r || r.st !== "in") continue; const [x, y] = cardPos(r);
        if (lx >= x - 2 && lx <= x + CDW + 2 && ly >= y - 2 && ly <= y + CDH + 2) {
          r.st = "drag"; r.ret = null; drag = { r, id: e.pointerId, x: lx, y: ly + 26 - 0, sy: ly, t0: tt, hist: [[performance.now(), ly]] };
          drag.y = ly; r.el.classList.add("dr"); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
          SFX.tok(); vib(8); rejEl.classList.add("on"); return;
        }
      }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return; const [lx, ly] = toL(e);
      drag.x = clamp(lx, 0, W); drag.y = clamp(ly, -10, H + 10); drag.hist.push([performance.now(), ly]); if (drag.hist.length > 6) drag.hist.shift();
      rejEl.classList.toggle("hot", drag.y < 16);
      const t = target(), key = t ? `${t.d},${t.s},${t.why}` : "";
      if (t && key !== (ghost && ghost.key)) { if (!t.why) tone(1200 + t.s * 60, 0.025, "square", 0.04); }
      if (t && t.why && key !== (ghost && ghost.key) && performance.now() - lastHint > 900) { lastHint = performance.now(); if (t.why === "clean") F.msg("붙이면 안 돼요! 청소 1칸 띄우기"); else if (t.why === "day") F.msg(`${DAYS[drag.r.day]}요일만 된대요`); }
      ghost = t ? { ...t, key } : null;
    });
    const release = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return; const dg = drag, r = dg.r; drag = null; ghost = null;
      rejEl.classList.remove("on", "hot"); r.el.classList.remove("dr");
      if (over) return;
      const h0 = dg.hist[0], h1 = dg.hist[dg.hist.length - 1], vy = (h1[1] - h0[1]) / Math.max(1, h1[0] - h0[0]);
      const [bx, by] = (() => { const w = r.L * CW - 2, h = RH - 4; return [dg.x - w / 2, dg.y - 26 - h / 2]; })();
      if (dg.y < 16 || (vy < -0.12 && dg.y < 72 && dg.y < dg.sy - 6)) { r.dx = bx; r.dy = by; leave(r, "rej"); return; }
      drag = dg; const t = target(); drag = null;
      if (t && tryDrop(r, t.d, t.s, bx, by)) return;
      r.st = "in"; r.ret = { fx: bx, fy: by, t0: tt };
    };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((k) => cv.addEventListener(k, release));

    // 그리기
    const star = (x, y, p, col = "#fff3a0") => { const k = Math.max(1, Math.round((p < 0.5 ? p : 1 - p) * 6)); P(x - k, y, 2 * k + 1, 1, col); P(x, y - k, 1, 2 * k + 1, col); P(x, y, 1, 1, "#ffffff"); };
    const drawBlock = (x, y, w, h, r, lift, alpha = 1) => {
      const c = r.gold ? GOLD : r.ev.c;
      g.globalAlpha = alpha;
      if (lift) { g.fillStyle = "rgba(5,0,12,.45)"; g.fillRect(Math.round(x + 2), Math.round(y + lift + 3), w, h); }
      x = Math.round(x); y = Math.round(y);
      P(x, y, w, h, shade(c, r.gold ? 0.42 : 0.34)); P(x, y, w, 4, c); P(x, y + 4, w, 1, shade(c, 0.6)); P(x, y + h - 1, w, 1, shade(c, 0.2)); P(x, y, 1, h, shade(c, 0.75)); P(x + w - 1, y, 1, h, shade(c, 0.22));
      for (let k = 1; k < r.L; k++) for (let j = 6; j < h - 2; j += 3) P(x + k * CW - 1, y + j, 1, 1, shade(c, 0.55));
      if (r.gold) { const sh = ((tt * 40) % (w + h + 20)) - h; for (let j = 0; j < h; j++) { const sx = sh + j; if (sx >= 0 && sx < w - 1) P(x + sx, y + h - 1 - j, 2, 1, "rgba(255,248,200,.55)"); } }
      g.drawImage(S.ic[r.ev.k], x + 2, y + 6);
      g.globalAlpha = 1;
    };
    const drawCard = (r, x, y, a = 1) => {
      const c = r.gold ? GOLD : r.ev.c, f = clamp(1 - (tt - r.t0) / r.life, 0, 1);
      let sx = 0; if (r.st === "in" && f < 0.22 && !over) sx = Math.round(Math.sin(tt * 40) * 1);
      x = Math.round(x + sx); y = Math.round(y);
      g.globalAlpha = a;
      P(x + 1, y, CDW - 2, CDH, "#2b1b48"); P(x, y + 1, CDW, CDH - 2, "#2b1b48");
      P(x + 1, y + 1, CDW - 2, 8, shade(c, 0.45)); P(x + 1, y, CDW - 2, 1, c); P(x, y + 1, 1, CDH - 2, c); P(x + CDW - 1, y + 1, 1, CDH - 2, shade(c, 0.55)); P(x + 1, y + CDH - 1, CDW - 2, 1, shade(c, 0.4));
      g.drawImage(S.bell, x + 2, y + 2);
      P(x + 2, y + 10, 20, 20, shade(c, 0.22)); g.drawImage(S.ic[r.ev.k], x + 3, y + 11);
      const tw = r.L * 11 - 1, bx = x + Math.round((CDW - tw) / 2);
      for (let k = 0; k < r.L; k++) { P(bx + k * 11, y + 40, 10, 7, c); P(bx + k * 11, y + 40, 10, 1, "#ffffff80"); P(bx + k * 11, y + 46, 10, 1, shade(c, 0.55)); }
      const bc = f > 0.5 ? "#5fe0a0" : f > 0.22 ? "#ffd166" : "#ff5f7a";
      P(x + 3, y + 50, CDW - 6, 2, "#120a20"); P(x + 3, y + 50, Math.round((CDW - 6) * f), 2, bc);
      if (r.gold) { const ph = (tt * 1.6) % 2; if (ph < 1) { const px = x + Math.round(ph * CDW); P(px, y, 2, 1, "#ffffff"); P(px - 1, y + CDH - 1, 2, 1, "#fff3a0"); } if (Math.floor(tt * 5) % 2) { P(x - 1, y + 4, 1, 3, GOLD); P(x + CDW, y + 30, 1, 3, GOLD); } }
      if (a === 1 && tt - r.t0 < 0.5) { const p = (tt - r.t0) / 0.5; g.globalAlpha = 0.6 * (1 - p); P(x, y, CDW, CDH, "#ffffff"); }
      g.globalAlpha = 1;
    };
    const drawBook = (b) => {
      const r = b.r, w = b.L * CW - 2, h = RH - 4;
      let x = CX + b.s * CW, y = RY[b.d] + 2;
      const p = clamp((tt - b.t0) / 0.12, 0, 1);
      if (p < 1) { const e = 1 - Math.pow(1 - p, 2); x = b.fx + (x - b.fx) * e; y = b.fy + (y - b.fy) * e; }
      const sq = tt - b.t0 - 0.12; let yo = 0; if (sq > 0 && sq < 0.2) yo = Math.round(Math.sin((sq / 0.2) * Math.PI) * 2);
      drawBlock(x, y + yo, w, h, r, 0);
      x = Math.round(x); y = Math.round(y + yo);
      // 꽃가루
      for (const [u, v, c] of b.cf) P(x + 3 + Math.floor(u * (w - 6)), y + 24 + Math.floor(v * 12), 1, 1, c);
      // 손님들(춤)
      b.ppl.forEach((q, k) => {
        const fr = Math.floor(tt * 6 + q.ph) % 4, up = q.up && Math.floor(tt * 3 + q.ph) % 2 === 0;
        const sp = uSprite(q.p, (up ? "u" : "d") + fr, { v: "f", f: fr, arm: up ? "up" : undefined }, false);
        g.drawImage(sp, x + k * CW + (k === 0 ? 5 : 3), y + h - sp.height + (endT >= 0 ? -Math.round(Math.abs(Math.sin(tt * 9 + k)) * 2) : 0));
      });
      if (tt >= b.fl && tt - b.fl < 0.35) { g.globalAlpha = 0.7 * (1 - (tt - b.fl) / 0.35); P(x, y, w, h, "#ffffff"); g.globalAlpha = 1; }
      if (tt - b.t0 < 0.3) { g.globalAlpha = 0.8 * (1 - (tt - b.t0) / 0.3); P(x, y, w, h, "#ffffff"); g.globalAlpha = 1; }
    };
    const drawBroom = (d, c, warn) => {
      const x = CX + c * CW, y = RY[d] + 2, w = CW - 2, h = RH - 4, a = tt - brT[d][c];
      if (a < 0) return;
      const p = clamp(a / 0.25, 0, 1);
      P(x, y, w, h, warn ? "#5a1830" : "#29233f");
      g.fillStyle = warn ? "#ff5f7a" : "#363055";
      for (let j = 0; j < h; j++) for (let xx = (5 - (j % 5)) % 5; xx < w; xx += 5) g.fillRect(x + xx, y + j, 1, 1);
      P(x, y, w, 1, warn ? "#ff5f7a" : "#4a4270");
      const sw = Math.round(Math.sin(tt * 3 + c + d) * 2);
      g.globalAlpha = p; g.drawImage(S.broom, x + 5 + sw, y + 16 - Math.round((1 - p) * 8)); g.globalAlpha = 1;
      const ph = (tt * 0.7 + c * 0.37 + d * 0.21) % 1.6; if (ph < 0.4) star(x + 16, y + 10, ph / 0.4, "#cfe8ff");
    };
    const render = () => {
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      g.drawImage(S.bg, 0, 0);
      // 간판: 줄전구 + 미러볼 + 네온 띠
      const hue = Math.round(tt * 50) % 360; P(0, 12, W, 1, `hsl(${hue},95%,70%)`); g.fillStyle = `hsla(${hue},95%,60%,.18)`; g.fillRect(0, 13, W, 2);
      for (let x = 0; x < W; x++) if (x < 72 || x > 88) P(x, 3 + Math.round(2 * Math.sin((x / W) * Math.PI * 2)), 1, 1, "#2a1a3c");
      for (let i = 0, x = 4; x < W; x += 9, i++) { if (x > 70 && x < 90) continue; const y = 4 + Math.round(2 * Math.sin((x / W) * Math.PI * 2)), c = BULB[i % 5], lit = (Math.floor(tt * 3) + i) % 3 !== 0 || endT >= 0; if (lit) { g.fillStyle = c + "44"; g.fillRect(x - 1, y - 1, 4, 4); } P(x, y, 2, 2, lit ? c : shade(c, 0.4)); }
      P(80, 0, 1, 3, "#4a4a58");
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { if ((i - 3) ** 2 + (j - 3) ** 2 > 10) continue; P(77 + i, 3 + j, 1, 1, (i + j + Math.floor(tt * 8)) % 4 === 0 ? "#ffffff" : (i * 3 + j) % 2 ? "#9a9ab4" : "#d4d4e4"); }
      // 요일 네온 글자
      RY.forEach((y, d) => {
        const on = !(Math.sin(tt * 6.1 + d * 2) > 0.94 && Math.sin(tt * 1.7 + d) > 0.3) || full[d] >= 0;
        const c = DAYC[d];
        if (on) { g.fillStyle = c + "33"; GLY[DAYS[d]].forEach((row, j) => [...row].forEach((ch, i) => ch === "X" && g.fillRect(7 + i - 1, y + 16 + j - 1, 3, 3))); }
        glyph(g, DAYS[d], 7, y + 16, on ? c : shade(c, 0.45));
        if (full[d] >= 0) { const k = Math.floor(tt * 4) % 2; g.fillStyle = k ? c : "#ffffff"; g.fillRect(CX - 1, y - 2, NC * CW + 1, 1); g.fillRect(CX - 1, y + RH + 1, NC * CW + 1, 1); g.fillStyle = c + "26"; g.fillRect(CX - 1, y - 1, NC * CW + 1, RH + 2); }
      });
      // 청소 칸·예약
      const warnSet = new Set();
      if (ghost && ghost.why === "clean") for (let c = ghost.s; c < ghost.s + drag.r.L; c++) if (grid[ghost.d][c] === 2) warnSet.add(ghost.d * 10 + c);
      for (let d = 0; d < 3; d++) for (let c = 0; c < NC; c++) if (grid[d][c] === 2) drawBroom(d, c, warnSet.has(d * 10 + c) && Math.floor(tt * 8) % 2 === 0);
      for (const b of books) drawBook(b);
      // 놓을 자리 미리 보기
      if (drag && ghost) {
        const { d, s, why } = ghost, x = CX + s * CW, y = RY[d] + 2, w = drag.r.L * CW - 2, h = RH - 4;
        if (!why) { g.fillStyle = "rgba(180,255,220,.22)"; g.fillRect(x, y, w, h); if (Math.floor(tt * 8) % 2) { g.fillStyle = "#c8ffe8"; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); } }
        else { g.fillStyle = "rgba(255,50,90,.35)"; g.fillRect(x, y, w, h); g.fillStyle = "#ff6f8f"; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); const cx = x + w / 2, cy = y + h / 2; for (let k = -5; k <= 5; k++) { P(cx + k - 1, cy + k, 3, 1, "#ffffff"); P(cx + k - 1, cy - k, 3, 1, "#ffffff"); } }
      }
      // 알림 카드
      for (const r of slots) if (r && r.st === "in") { const [x, y] = cardPos(r); drawCard(r, x, y); }
      for (let i = leaving.length - 1; i >= 0; i--) {
        const r = leaving[i], p = (tt - r.lt) / 0.4; if (p >= 1) { leaving.splice(i, 1); r.el.remove(); continue; }
        if (r.st === "rej") drawCard(r, r.lx, r.ly - p * p * 90, 1 - p * 0.5);
        else { g.globalAlpha = 1; drawCard(r, r.lx, r.ly + p * 6, 1 - p); g.fillStyle = `rgba(20,10,30,${0.5 * (1 - p)})`; g.fillRect(r.lx, r.ly + p * 6, CDW, CDH); }
      }
      // 손님 가는 시간이 얼마 안 남은 카드 위에 땀방울
      for (const r of slots) if (r && r.st === "in" && !over && 1 - (tt - r.t0) / r.life < 0.22) { const [x, y] = cardPos(r), k = Math.floor(tt * 4) % 2; P(x + CDW - 6, y + 12 + k, 2, 3, "#7fd1ff"); P(x + CDW - 5, y + 11 + k, 1, 1, "#7fd1ff"); }
      // 들고 있는 블록
      if (drag) {
        const [bx, by, w, h] = dragRect(), lift = Math.min(1, (tt - drag.t0) / 0.08) * 4;
        drawBlock(bx, by - lift, w, h, drag.r, lift + 2);
        drag.r.el.style.left = pct(bx, W); drag.r.el.style.top = pct(by - lift, H); drag.r.el.style.width = pct(w, W);
      }
      // 효과
      for (const q of pts) { g.globalAlpha = clamp(q.l / q.m, 0, 1); P(q.x, q.y, q.s, q.s, q.c); }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "lighter";
      for (const f of fws) { const a = clamp(f.l / f.m, 0, 1); g.globalAlpha = a * 0.5; P(f.px, f.py, 1, 1, f.c); g.globalAlpha = a; P(f.x, f.y, a > 0.5 ? 2 : 1, a > 0.5 ? 2 : 1, f.c); }
      g.globalAlpha = 1;
      // 끝: 달력 위로 빛줄기
      if (endT >= 0) { const p = (tt - endT) / 1.1, x0 = -80 + p * 340; g.fillStyle = "rgba(255,250,225,.28)"; g.beginPath(); g.moveTo(x0, 74); g.lineTo(x0 + 28, 74); g.lineTo(x0 - 52, H); g.lineTo(x0 - 80, H); g.closePath(); g.fill(); }
      g.globalCompositeOperation = "source-over";
      // 카드 글자 위치
      for (const r of slots) if (r && r.st === "in") { const [x, y] = cardPos(r); r.el.style.left = pct(x, W); r.el.style.top = pct(y, H); r.el.style.width = ""; }
    };
    const t0 = performance.now();
    const loop = (now) => {
      if (done || !cv.isConnected) return;
      const nt = (now - t0) / 1000, dt = clamp(nt - tt, 0, 0.05); tt = nt;
      if (started && !over) {
        // 요청 도착
        if (pi < plan.length && T - tm.left() >= plan[pi].at && arrive(plan[pi])) pi++;
        if (!rush && prog() > 0.5) { rush = true; F.msg("주말 문의 폭주! 알림이 빨라져요"); tone(880, 0.06, "square", 0.07); tone(1100, 0.06, "square", 0.07, 0, 0.08); }
        for (const r of slots) if (r && r.st === "in" && tt - r.t0 > r.life) leave(r, "exp");
      }
      for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; q.l -= dt; if (q.l <= 0) { pts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.93; q.vy += q.gr * dt; }
      for (let i = fws.length - 1; i >= 0; i--) { const f = fws[i]; f.l -= dt; if (f.l <= 0) { fws.splice(i, 1); continue; } f.px = f.x; f.py = f.y; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.96; f.vy = f.vy * 0.96 + 26 * dt; }
      render();
      raf = requestAnimationFrame(loop);
    };
    // 점수 기준: 들어온 요청으로 낼 수 있던 최고 매출(요일마다 청소 칸 포함 7칸 배낭)
    const optimum = () => {
      let dp = new Float64Array(512).fill(-1); dp[511] = 0; const mul = [64, 8, 1];
      for (const r of plan) {
        const nd = dp.slice(), wgt = r.L + 1, days = r.day >= 0 ? [r.day] : [0, 1, 2];
        for (let st = 0; st < 512; st++) { if (dp[st] < 0) continue; for (const d of days) { const cap = Math.floor(st / mul[d]) % 8; if (cap >= wgt) { const ns = st - wgt * mul[d]; if (dp[st] + r.amt > nd[ns]) nd[ns] = dp[st] + r.amt; } } }
        dp = nd;
      }
      return Math.max(1, ...dp);
    };
    const end = () => {
      if (over) return; over = true; tm?.stop();
      if (drag) { const r = drag.r; drag = null; ghost = null; r.st = "in"; }
      rejEl.classList.remove("on", "hot");
      for (const r of slots) if (r) leave(r, "exp", true);
      endT = tt;
      const opt = optimum(), nFull = full.filter((v) => v >= 0).length;
      const er = clamp(earned / (opt * 0.9), 0, 1), fr = nFull / 3, cl = placedN ? clamp(1 - cleanMiss * 0.25, 0, 1) : 0.5;
      const s = er * 0.65 + fr * 0.25 + cl * 0.1;
      // 연출: 예약이 차례로 반짝 + 이번 주 매출이 올라간다
      const order = books.slice().sort((a, b) => a.d - b.d || a.s - b.s);
      order.forEach((b, i) => { b.fl = tt + 0.25 + i * 0.11; setTimeout(() => { if (!done) tone(880 * Math.pow(1.06, Math.min(i, 14)), 0.06, "triangle", 0.08); }, 250 + i * 110); });
      SFX.whoosh(); F.msg(placedN ? "이번 주 예약 마감!" : "이번 주는 텅 비었어요…");
      const tot = earned + bonus, bEl = totEl.querySelector("b");
      totEl.querySelector("em").textContent = nFull ? `만실 ${nFull}일 · 보너스 +${bonus}만` : placedN ? `예약 ${placedN}건` : "";
      setTimeout(() => {
        if (done) return; totEl.classList.add("on"); const t1 = performance.now();
        const up = () => { if (done || !totEl.isConnected) return; const p = Math.min(1, (performance.now() - t1) / 1100), v = Math.round(tot * (1 - Math.pow(1 - p, 3))); bEl.textContent = (v * 10000).toLocaleString() + "원"; if (p < 1) requestAnimationFrame(up); else { SFX.ding(6); if (tot) for (let k = 0; k < 3; k++) setTimeout(() => !done && firework(30 + rnd() * 100, 110 + rnd() * 60, pick(["#ffd166", "#ff8ac8", "#7fd1ff"])), k * 140); } };
        requestAnimationFrame(up);
        const ci = setInterval(() => { if (done || performance.now() - t1 > 1100) return clearInterval(ci); tone(1800 + rnd() * 600, 0.03, "square", 0.04); }, 90);
      }, 500 + Math.min(order.length, 12) * 60);
      setTimeout(() => {
        done = true; cancelAnimationFrame(raf);
        finish(s, `이번 주 매출 <b>${tot}만원</b> · 예약 ${placedN}건 · 만실 ${nFull}일${cleanMiss ? ` · 청소 칸 실수 ${cleanMiss}번` : ""}`, "", [["매출", er], ["만실", fr], ["청소 지킴", cl]]);
      }, 2900 + Math.min(order.length, 12) * 60);
    };
    if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.pr2 = { slots, grid, books, reqs, plan, check, drop: (r, d, s) => r && r.st === "in" && !over && tryDrop(r, d, s, CX + s * CW, RY[d]), reject: (r) => { if (r && r.st === "in" && !over) { const [x, y] = cardPos(r); r.dx = x; r.dy = y; leave(r, "rej"); } }, state: () => ({ earned, bonus, full: full.slice(), cleanMiss, placedN, over, opt: optimum() }), setDrag: (r, x, y) => { if (r) { r.st = "drag"; drag = { r, id: -1, x, y, sy: y, t0: tt, hist: [[0, y]] }; r.el.classList.add("dr"); rejEl.classList.add("on"); const t = target(); ghost = t ? { ...t, key: "" } : null; } } };
    upd(); F.bar.style.transform = "scaleX(1)";
    raf = requestAnimationFrame(loop);
    F.msg("주말 예약 오픈! 알림이 와요");
    setTimeout(() => { if (!cv.isConnected) return; started = true; tm = timer(T, F.bar, end); }, 600);
  },
};
