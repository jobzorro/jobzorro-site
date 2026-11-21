// 바이브코딩 3탄: 이게 왜 터져? (도트 캔버스 160xH)
// 코딩 AI '코디'랑 만든 내 작은 앱이 커뮤니티에서 떡상! 밤 9시~아침 7시, 서버실 대시보드를 지킨다.
// 사용자 도트가 양옆에서 몰려와 로드밸런서를 지나 케이블을 타고 서버 랙으로 들어간다.
// 과부하된(빨간) 랙을 잡고 한가한 랙으로 끌면 트래픽이 옮겨 간다. 꽉 찬 채로 버티면 503으로 터지고 사용자가 떠난다.
// 서버 추가(월 비용↑)·성능 UP, 캐시(쿨타임), 해킹 점 톡 막기, DB 백업 톡, 새벽 3시 졸음엔 커피 톡.
// 마지막: 아침이 밝고, 의자에서 꾸벅 졸던 내가(opts.avatar) 알림에 깨며 가입자·구독 수익 결산.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, SW = 36, SX = [2, 42, 82, 122], RT = 76, LBX = 80, LBY = 48, CBY = 62;
let H = 280;
const PRICE = 4900, UPU = 150, SUBR = 0.05; // 구독료, 부하 1당 사용자 수, 구독 전환율
const COST0 = 12, COST_ADD = 18, COST_UP = 22; // 만원/월
const DRAIN = 0.3; // 랙 하나가 1초에 처리하는 부하
const UCOL = ["#ff9ad0", "#7fd8ff", "#ffd166", "#9be08a", "#c9a8ff", "#ffb38a", "#f4f4f8", "#5fe0c0"];
const FONT = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111", Z: "1111100010001000100011111", "!": "010010010000010" };
const CURVE = [[0, 0], [0.14, 0.08], [0.3, 0.55], [0.5, 0.74], [0.68, 0.96], [0.86, 0.9], [1, 0.7]];
const EVENTS = [[0.14, "viral"], [0.24, "hack"], [0.34, "backup"], [0.46, "hack"], [0.58, "drowsy"], [0.71, "hack2"], [0.79, "backup"], [0.88, "hack"]];
const wonS = (n) => Math.round(n).toLocaleString("ko-KR");
const manS = (won) => { const m = won / 10000; return (Math.abs(m) >= 10 ? Math.round(m) : Math.round(m * 10) / 10).toLocaleString("ko-KR"); };

function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); });
  if (ol) uOutline(c); return c;
}
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
// 3x5 도트 글자
function ptext(P, s, x, y, col, k = 1) {
  let ox = x;
  [...String(s)].forEach((ch) => { const f = FONT[ch]; if (!f) return; const w = f.length / 5; for (let j = 0; j < f.length; j++) if (f[j] === "1") P(ox + (j % w) * k, y + Math.floor(j / w) * k, k, k, col); ox += (w + 1) * k; });
}
const VIRUS = [".X.X.", "XXXXX", "XoXoX", "XXXXX", "X.X.X"];
const COIN = (P) => { P(2, 0, 5, 1, "#c9961c"); P(1, 1, 7, 7, "#ffd23f"); P(0, 2, 9, 5, "#ffd23f"); P(2, 8, 5, 1, "#c9961c"); P(1, 2, 1, 4, "#fff0a0"); P(3, 2, 3, 1, "#fff0a0"); P(4, 3, 1, 4, "#c9961c"); P(3, 3, 3, 1, "#c9961c"); P(8, 3, 1, 4, "#c9961c"); };
// 작은 랙(방법 화면용)
function miniRack(P, x, y, h, st) {
  P(x, y, 16, h, "#0a0c16"); P(x + 1, y + 1, 14, h - 2, "#1e2336"); P(x + 1, y + 1, 14, 2, "#3a4060");
  const col = st === "hot" ? "#ff4a4a" : st === "mid" ? "#ffd23f" : "#4dff88";
  for (let b = 0; b < Math.floor((h - 6) / 5); b++) { const yy = y + 4 + b * 5; P(x + 2, yy, 12, 4, "#2a3048"); P(x + 2, yy, 12, 1, "#3e4668"); P(x + 10, yy + 1, 1, 2, col); P(x + 12, yy + 1, 1, 2, b % 2 ? col : "#203024"); }
  if (st === "hot") { P(x + 1, y + 1, 14, h - 2, "rgba(255,40,40,.22)"); P(x + 4, y - 3, 2, 2, "#9a9aa8"); P(x + 9, y - 5, 2, 2, "#b8b8c4"); }
  const n = st === "hot" ? 6 : st === "mid" ? 4 : 2; P(x, y + h + 1, 16, 4, "#0a0c16"); for (let c = 0; c < 6; c++) P(x + 1 + c * 2.5 | 0, y + h + 2, 2, 2, c < n ? (c < 3 ? "#4dff88" : c < 5 ? "#ffd23f" : "#ff4a4a") : "#262b40");
}

export const GAME = {
  key: "vibe3", base: "vibe", jc: "#7c9cff", n: "이게 왜 터져?", desc: "떡상한 내 앱! 밤새 서버가 안 터지게 지켜요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 내 앱이 커뮤니티에서 <b>떡상</b>! 사용자가 서버로 몰려와요.",
    "<b>빨간 서버</b>(과부하)를 잡고 <b>한가한 서버</b>로 끌면 트래픽이 옮겨 가요. 꽉 찬 채로 버티면 <b>503</b>으로 터져요.",
    "빨간 <b>해킹 점</b>은 톡! 막고, 사람이 넘치면 <b>캐시</b>·<b>서버 추가</b>(월 비용↑). 새벽 3시 졸음엔 <b>커피 톡</b>!",
  ],
  steps: () => {
    try {
      const im = (c, h) => `<img src="${c.toDataURL()}" alt="" style="height:${h}px;width:auto">`;
      const s1 = document.createElement("canvas"); s1.width = 44; s1.height = 40;
      { const g = s1.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; miniRack(P, 2, 8, 24, "hot"); miniRack(P, 26, 8, 24, "low"); for (let k = 0; k < 4; k++) P(18 + k * 2, 5 - Math.round(Math.sin((k / 3) * Math.PI) * 3), 2, 2, "#9fd0ff"); P(25, 4, 1, 3, "#ffd23f"); P(24, 5, 3, 1, "#ffd23f"); }
      const s2 = document.createElement("canvas"); s2.width = 36; s2.height = 40;
      { const g = s2.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; miniRack(P, 10, 18, 16, "low"); VIRUS.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "X") P(13 + x * 2, 2 + y * 2, 2, 2, "#ff3a4a"); if (ch === "o") P(13 + x * 2, 2 + y * 2, 2, 2, "#fff"); })); P(11, 0, 1, 14, "#5fe0ff"); P(25, 0, 1, 14, "#5fe0ff"); P(11, 0, 15, 1, "#5fe0ff"); [[4, 6], [30, 4], [29, 13], [5, 14]].forEach(([x, y]) => P(x, y, 2, 2, "#ffd23f")); }
      const s3 = document.createElement("canvas"); s3.width = 44; s3.height = 40;
      { const g = s3.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; P(0, 6, 44, 30, "#0b0e1c"); P(0, 6, 44, 1, "#3a4270"); for (let x = 0; x < 40; x++) { const v = Math.round(4 + Math.pow(x / 40, 1.6) * 20 + Math.sin(x * 0.9) * 1.5); P(2 + x, 34 - v, 1, v, "#3fd08a55"); P(2 + x, 34 - v, 1, 1, "#5ff0a0"); } g.drawImage(mkC(9, 9, COIN), 30, 0); }
      return [[im(s1, 52), "빨간 서버 끌기"], [im(s2, 52), "해킹 점은 톡!"], [im(s3, 52), "구독 띵! 아침 결산"]];
    } catch (e) { return [["", "끌어서 옮기기"], ["", "해킹 점 톡"], ["", "아침에 결산"]]; }
  },
  css: `
.mg-v3st{background:#070914!important;display:flex;align-items:center;justify-content:center}
.mg-vibe3 .mg-steps img{image-rendering:pixelated}
.mg-vibe3 .mg-logo b{font-size:24px}
.mg-vibe3 .v3-w{position:relative;flex:0 0 auto}
.mg-vibe3 .v3-cv{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.mg-vibe3 .v3-gl{position:absolute;z-index:2;font-size:9.5px;font-weight:800;color:#8a94c8;letter-spacing:-.3px;pointer-events:none;white-space:nowrap}
.mg-vibe3 .v3-gl b{color:#5ff0a0}
.mg-vibe3 .v3-dash{position:absolute;z-index:2;display:flex;flex-direction:column;justify-content:center;gap:0;pointer-events:none;color:#c8d0f0;font-size:9.5px;font-weight:700;line-height:1.28;letter-spacing:-.3px;white-space:nowrap;overflow:hidden}
.mg-vibe3 .v3-dash i{font-style:normal;font-weight:900;color:#fff}
.mg-vibe3 .v3-dash .v3-clk{font-size:15px;font-weight:900;color:#ffd23f;line-height:1.05;letter-spacing:0;font-variant-numeric:tabular-nums}
.mg-vibe3 .v3-dash .v3-clk small{font-size:9px;color:#8a94c8;margin-left:3px;font-weight:800}
.mg-vibe3 .v3-dash .rv i{color:#5ff0a0}.mg-vibe3 .v3-dash .cs i{color:#ff9a8a}
.mg-vibe3 .v3-dash .bump{animation:v3bump .35s}
@keyframes v3bump{40%{transform:scale(1.25);color:#ffd23f}}
.mg-vibe3 .v3-ctl{position:absolute;z-index:3;display:flex;gap:6px}
.mg-vibe3 .v3-btn{position:relative;flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;border-radius:11px!important;border:0!important;color:#fff!important;overflow:hidden;padding:0!important;touch-action:none}
.mg-vibe3 .v3-btn b{font-size:14px;font-weight:900;position:relative;z-index:1}
.mg-vibe3 .v3-btn small{font-size:9.5px;font-weight:700;opacity:.9;position:relative;z-index:1}
.mg-vibe3 .v3-add{background:linear-gradient(#4a5490,#323a6a)!important;box-shadow:0 3px 0 #1a1f40!important}
.mg-vibe3 .v3-add small{color:#ffb8a8}
.mg-vibe3 .v3-cache{background:linear-gradient(#3fc890,#238a62)!important;box-shadow:0 3px 0 #11503a!important}
.mg-vibe3 .v3-cache i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--cd,0)*100%);background:#000a;z-index:0;transition:width .1s linear}
.mg-vibe3 .v3-cache.on{animation:v3glow .4s infinite alternate}
.mg-vibe3 .v3-btn.off{filter:grayscale(.7) brightness(.65)}
.mg-vibe3 .v3-btn:active{transform:translateY(2px)}
.mg-vibe3 .v3-btn.go{animation:v3pulse .5s infinite alternate}
@keyframes v3glow{to{box-shadow:0 3px 0 #11503a,0 0 14px #5fe0a0!important}}
@keyframes v3pulse{to{transform:scale(1.06);filter:brightness(1.2)}}
.mg-vibe3 .v3-go{position:absolute;z-index:25;width:0;height:0;display:none;pointer-events:none}
.mg-vibe3 .v3-go.on{display:block}
.mg-vibe3 .v3-go i{position:absolute;width:39px;height:39px;left:-14px;top:-37px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009);animation:v3tap .7s infinite}
.mg-vibe3 .v3-go.up i{top:2px;animation:v3tapu .7s infinite}
.mg-vibe3 .v3-go.drag i{animation:v3drag 1.3s infinite}
.mg-vibe3 .v3-go span{position:absolute;left:0;bottom:44px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-vibe3 .v3-go.up span{bottom:auto;top:46px}
.mg-vibe3 .v3-go span b{color:#d8402a}
@keyframes v3tap{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v3tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v3drag{0%{transform:translate(0,0)}15%{transform:translate(0,3px) scale(.9)}70%{transform:translate(var(--dx,60px),var(--dy,0)) scale(.9);opacity:1}88%{transform:translate(var(--dx,60px),var(--dy,0));opacity:0}100%{opacity:0}}
.mg-vibe3 .v3-tut{position:absolute;left:6px;right:6px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-vibe3 .v3-tut.off{opacity:0;visibility:hidden}
.mg-vibe3 .v3-tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:7px 12px 6px;box-shadow:0 4px 0 #0006,0 0 0 2px #7c9cff;max-width:300px;font-size:12.5px;line-height:1.42;text-align:center;font-weight:600;word-break:keep-all}
.mg-vibe3 .v3-tut.pop .v3-tc{animation:v3pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-vibe3 .v3-tc em{font-style:normal;display:inline-block;background:#5a74e0;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-vibe3 .v3-tc p{margin:0}.mg-vibe3 .v3-tc b{color:#2f55c8}.mg-vibe3 .v3-tc b.rd{color:#c0392b}
.mg-vibe3 .v3-tc ul{margin:4px 0 0;padding:0;list-style:none;text-align:left;font-size:12px}
.mg-vibe3 .v3-tc li{padding-left:12px;position:relative;margin:1px 0}.mg-vibe3 .v3-tc li::before{content:"";position:absolute;left:2px;top:7px;width:5px;height:5px;background:#7c9cff}
.mg-vibe3 .v3-tb{margin-top:5px;display:flex;justify-content:center}
.mg-vibe3 .v3-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important}
.mg-vibe3 .v3-go2{background:linear-gradient(#8aa8ff,#5a74e0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #2a3a90!important;animation:v3pulse .5s infinite alternate}
@keyframes v3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-vibe3 .v3-alert{position:absolute;z-index:6;left:50%;transform:translateX(-50%) scale(.6);background:#ff3a4a;color:#fff;font-size:12px;font-weight:900;padding:3px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;box-shadow:0 2px 0 #0008;transition:opacity .15s,transform .25s cubic-bezier(.3,1.7,.5,1)}
.mg-vibe3 .v3-alert.on{opacity:1;transform:translateX(-50%) scale(1)}
.mg-vibe3 .v3-alert.y{background:#ffd23f;color:#3a2a00}.mg-vibe3 .v3-alert.g{background:#3fd08a}.mg-vibe3 .v3-alert.b{background:#5a74e0}
.mg-vibe3 .v3-end{position:absolute;inset:0;z-index:40;opacity:0;transition:opacity .5s;pointer-events:none;overflow:hidden;background:#05060f}
.mg-vibe3 .v3-end.on{opacity:1;pointer-events:auto}
.mg-vibe3 .v3-end canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.mg-vibe3 .v3-me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter 1.2s;transform-origin:50% 92%;pointer-events:none;filter:brightness(.62) saturate(.8)}
.mg-vibe3 .v3-me.on{opacity:1}
.mg-vibe3 .v3-me.doze{animation:v3nod 1.5s ease-in-out infinite}
.mg-vibe3 .v3-me.wake{filter:none;animation:v3hop .4s cubic-bezier(.3,1.8,.5,1)}
@keyframes v3nod{0%,100%{transform:rotate(-3deg) translateY(4%)}50%{transform:rotate(5deg) translateY(8%)}}
@keyframes v3hop{0%{transform:translateY(8%)}45%{transform:translateY(-6%)}100%{transform:none}}
.mg-vibe3 .v3-dk{position:absolute;inset:0;background:#0a1238;opacity:.72;transition:opacity 1.8s;pointer-events:none}
.mg-vibe3 .v3-dk.lit{opacity:0}
.mg-vibe3 .v3-rep{position:absolute;left:50%;top:10px;width:232px;transform:translate(-50%,-20px) scale(.8);opacity:0;background:#fffdf6;color:#1a1c2a;border-radius:14px;padding:8px 12px 9px;box-shadow:0 5px 0 #0007,0 0 0 2px #7c9cff;transition:opacity .3s,transform .4s cubic-bezier(.3,1.6,.5,1);font-size:12px}
.mg-vibe3 .v3-rep.on{opacity:1;transform:translate(-50%,0) scale(1)}
.mg-vibe3 .v3-rep h4{margin:0 0 5px;font-size:12px;font-weight:900;color:#5a74e0;text-align:center;letter-spacing:-.2px}
.mg-vibe3 .v3-rep div{display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px dashed #e0dccc;opacity:0;transform:translateX(-10px);transition:opacity .25s,transform .3s}
.mg-vibe3 .v3-rep div.on{opacity:1;transform:none}
.mg-vibe3 .v3-rep div:last-child{border-bottom:0;padding-top:4px}
.mg-vibe3 .v3-rep span{color:#5a5a6a;font-weight:700}
.mg-vibe3 .v3-rep b{font-weight:900;font-variant-numeric:tabular-nums}
.mg-vibe3 .v3-rep .pl{color:#1f9a5a}.mg-vibe3 .v3-rep .mi{color:#d0402a}
.mg-vibe3 .v3-rep div:last-child b{font-size:17px}
.mg-vibe3 .v3-say{position:absolute;z-index:3;left:50%;transform:translateX(-50%) scale(.5);background:#fffdf6;color:#2a2018;font-size:12.5px;font-weight:900;padding:5px 10px;border-radius:11px;white-space:nowrap;box-shadow:0 3px 0 #0007;opacity:0;transition:opacity .2s,transform .3s cubic-bezier(.3,1.7,.5,1)}
.mg-vibe3 .v3-say::after{content:"";position:absolute;left:50%;margin-left:-6px;bottom:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fffdf6}
.mg-vibe3 .v3-say.on{opacity:1;transform:translateX(-50%) scale(1)}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "vibe3", "이게 왜 터져?", "mg-v3st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="v3-w"><canvas class="v3-cv"></canvas>
    <div class="v3-gl">실시간 가입자 <b>▲</b></div>
    <div class="v3-dash"><b class="v3-clk">21:00</b><span>가입 <i data-k="u">0</i>명</span><span class="rv">구독 <i data-k="s">0</i>명 <i data-k="r">0</i>만</span><span class="cs">서버비 <i data-k="c">36</i>만/월</span></div>
    <div class="v3-alert"></div>
    <div class="v3-ctl"><button class="v3-btn v3-add" data-add><b>서버 추가</b><small>+18만/월</small></button><button class="v3-btn v3-cache" data-cache><i></i><b>캐시</b><small>잠깐 부하 절반</small></button></div>
    <div class="v3-go"><span></span><i></i></div>
    <div class="v3-tut off"><div class="v3-tc"><em>리허설</em><p></p><div class="v3-tb"></div></div></div>
    <div class="v3-end"></div></div>`);
  const $ = (s) => F.stage.querySelector(s);
  const wrap = $(".v3-w"), cv = $(".v3-cv"), g = cv.getContext("2d");
  const glEl = $(".v3-gl"), dashEl = $(".v3-dash"), clkEl = $(".v3-clk"), alertEl = $(".v3-alert");
  const ctlEl = $(".v3-ctl"), addB = $("[data-add]"), cacheB = $("[data-cache]");
  const goEl = $(".v3-go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i");
  const tutEl = $(".v3-tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".v3-tb"), endEl = $(".v3-end");
  const dk = {}; dashEl.querySelectorAll("[data-k]").forEach((e) => (dk[e.dataset.k] = e));
  let K = 2, RB = 200, DY = 212;
  const px = (v) => Math.round(v * K) + "px";
  let BG = null, DESK = null;
  const fit = () => {
    const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 236);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 236, 300);
    RB = H - 78; DY = RB + 13;
    cv.width = W; cv.height = H; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
    Object.assign(glEl.style, { left: px(4), top: px(2) });
    Object.assign(dashEl.style, { left: px(100), top: px(1), width: px(59), height: px(39) });
    Object.assign(ctlEl.style, { left: px(3), top: px(H - 31), width: px(154), height: px(28) });
    Object.assign(alertEl.style, { top: px(57) });
    BG = makeBg(); DESK = makeDesk();
  };
  const P = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(x, y, w, h); };

  // ── 배경: 서버실 벽·바닥 ──
  function makeBg() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const d = c.getContext("2d");
    const Q = (x, y, w, h, col) => { d.fillStyle = col; d.fillRect(x, y, w, h); };
    for (let y = 40; y < H; y++) { const t = (y - 40) / (H - 40); Q(0, y, W, 1, `rgb(${Math.round(14 + t * 6)},${Math.round(17 + t * 6)},${Math.round(36 + t * 8)})`); }
    for (let x = 0; x < W; x += 20) Q(x, 56, 1, RB - 56, "#161a32");
    Q(0, 56, W, 1, "#1e2444");
    // 천장 케이블 트레이
    Q(0, 40, W, 2, "#1a1f3a"); Q(0, 42, W, 1, "#0a0c18");
    for (let x = 4; x < W; x += 9) Q(x, 41, 3, 1, "#2a3158");
    // 바닥 타일(이중 마루)
    for (let y = RB + 2; y < DY; y++) Q(0, y, W, 1, y % 2 ? "#141830" : "#171c38");
    for (let x = 0; x < W; x += 16) Q(x, RB + 2, 1, DY - RB - 2, "#0e1124");
    Q(0, RB + 2, W, 1, "#262c50");
    // 벽 비상등
    Q(4, 46, 4, 2, "#5a1a20"); Q(152, 46, 4, 2, "#5a1a20");
    // 전 데이터: 대시보드 판
    Q(0, 0, W, 40, "#090b18"); Q(0, 39, W, 1, "#2e3460"); Q(98, 2, 1, 36, "#1e2444");
    Q(3, 11, 94, 27, "#0b1022");
    for (let y = 14; y < 38; y += 6) Q(3, y, 94, 1, "#121834");
    for (let x = 3; x < 97; x += 12) Q(x, 11, 1, 27, "#121834");
    return c;
  }
  // 책상 띠(키보드·쪽지·에너지 음료)
  function makeDesk() {
    const c = document.createElement("canvas"); c.width = W; c.height = H - DY; const d = c.getContext("2d");
    const Q = (x, y, w, h, col) => { d.fillStyle = col; d.fillRect(x, y, w, h); };
    Q(0, 0, W, H - DY, "#2a2234"); Q(0, 0, W, 2, "#5a4a68"); Q(0, 2, W, 1, "#3a3048");
    for (let x = 0; x < W; x += 23) Q(x, 3, 1, H - DY - 3, "#241d2e");
    // 키보드
    Q(44, 6, 62, 14, "#1a1c26"); Q(45, 7, 60, 12, "#2c2f3e");
    for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) Q(46 + k * 4 + (r % 2), 8 + r * 4, 3, 3, (k + r) % 7 === 3 ? "#7c9cff" : "#4a4e62");
    // 쪽지
    Q(8, 5, 14, 12, "#ffe680"); Q(8, 5, 14, 2, "#ffd23f"); Q(10, 9, 9, 1, "#a08a30"); Q(10, 12, 7, 1, "#a08a30");
    Q(24, 7, 12, 10, "#ff9ad0"); Q(26, 10, 7, 1, "#a04a70"); Q(26, 13, 5, 1, "#a04a70");
    // 에너지 음료 캔
    Q(114, 4, 7, 14, "#2a2a30"); Q(115, 5, 5, 12, "#5fe0a0"); Q(115, 5, 5, 1, "#c8c8d0"); Q(116, 8, 3, 5, "#1a1a20");
    return c;
  }
  fit();
  g.imageSmoothingEnabled = false;
  const FDN = fingerURL(true), FUP = fingerURL(false);

  // ── 소리 ──
  const S = {
    coin: (at = 0) => { tone(1568, 0.06, "square", 0.045, 0, at); tone(2093, 0.13, "square", 0.045, 0, at + 0.06); },
    beep: () => tone(1046, 0.07, "square", 0.04),
    crash: () => { noise(0.45, 500, 0.28, 0, 0.8); tone(160, 0.45, "sawtooth", 0.12, -110); },
    thud: () => { tone(90, 0.22, "sine", 0.32, -40); noise(0.12, 300, 0.2); },
    block: () => { tone(1200, 0.05, "square", 0.08); tone(1800, 0.1, "square", 0.07, 0, 0.05); noise(0.08, 4000, 0.08); },
    siren: () => { tone(620, 0.16, "sawtooth", 0.05, 380); tone(620, 0.16, "sawtooth", 0.05, 380, 0.2); },
    cache: () => { tone(360, 0.35, "triangle", 0.09, 1100); noise(0.3, 2400, 0.06, 0.05, 0.6); },
    backup: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.07, "triangle", 0.08, 0, i * 0.07)); },
    gulp: () => { tone(320, 0.09, "sine", 0.16, -140); tone(300, 0.09, "sine", 0.16, -140, 0.13); tone(660, 0.18, "triangle", 0.08, 300, 0.3); },
    yawn: () => tone(300, 0.9, "sine", 0.07, -140),
    move: () => { noise(0.18, 1800, 0.1, 0, 0.8); tone(500, 0.16, "triangle", 0.06, 500); },
    alarm: (at = 0) => { for (let k = 0; k < 3; k++) { tone(1480, 0.07, "square", 0.06, 0, at + k * 0.11); } },
    yay: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "triangle", 0.1, 0, i * 0.07)); },
  };

  // ── 상태 ──
  const T = 36 * ez;
  const mkRack = (i, on) => ({ i, on, L: 0, heat: 0, down: 0, boost: 0, drop: 0, flash: 0, bk: 0, bkp: 0, acc: 0, crashN: 0 });
  let racks = [0, 1, 2, 3].map((i) => mkRack(i, i < 3));
  let tut = 0, inited = false, over = false, last = 0, el = 0, p = 0, tm0 = null, endT = -1;
  let hot = 0, hotT = 0, cacheOn = 0, cacheCd = 0, boosts = 0, cost = COST0 * 3;
  let served = 0, lost = 0, subs = 0, hacksN = 0, hacksOk = 0, bkN = 0, bkOk = 0, coffeeOk = 0, drowsyN = 0, crashes = 0, moves = 0, rescues = 0;
  let evI = 0, drowsy = null, sel = -1, selT = 0, drag = null, lastAct = 0, firstHint = true, alarmT = 0, dingT = 0, dingN = 0, shake = 0;
  let dots = [], hacks = [], sparks = [], hist = [], histAcc = { s: 0, l: 0, t: 0 }, cacheAcc = 0;
  const rackUp = (r) => r.on && r.down <= 0 && r.drop <= 0;
  const cx = (i) => SX[i] + 18;
  const lerp = (a, b, t) => a + (b - a) * t;
  const curve = (q) => { for (let k = 1; k < CURVE.length; k++) if (q <= CURVE[k][0]) { const [a, va] = CURVE[k - 1], [b, vb] = CURVE[k]; return lerp(va, vb, (q - a) / (b - a)); } return CURVE[CURVE.length - 1][1]; };
  const inRate = () => (tut >= 0 ? 0.35 : 0.5 + 1.18 * curve(p) + Math.sin(el * 1.7) * 0.05);
  const capNow = () => racks.filter(rackUp).length * DRAIN * (1 + 0.25 * boosts);
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };
  const elXY = (e, dy = 0) => { const r = e.getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + dy]; };
  const updSc = () => (F.sc.textContent = tut >= 0 ? "리허설" : `구독 ${subs}명`);
  let alertTo = 0;
  const alertMsg = (t, cls = "") => { alertEl.textContent = t; alertEl.className = "v3-alert " + cls; void alertEl.offsetWidth; alertEl.classList.add("on"); clearTimeout(alertTo); alertTo = setTimeout(() => alertEl.classList.remove("on"), 1500); };
  const setDash = () => {
    const h = 21 + p * 10, hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    clkEl.innerHTML = tut >= 0 ? `20:58<small>출시 전</small>` : `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}<small>${hh >= 21 ? "밤" : hh < 5 ? "새벽" : "아침"}</small>`;
    dk.u.textContent = wonS(served); dk.s.textContent = wonS(subs); dk.r.textContent = manS(subs * PRICE); dk.c.textContent = cost;
  };
  const updBtns = () => {
    const full = racks[3].on;
    addB.innerHTML = !full ? `<b>서버 추가</b><small>+${COST_ADD}만/월</small>` : boosts < 2 ? `<b>성능 UP</b><small>+${COST_UP}만/월</small>` : `<b>최대치</b><small>더는 못 늘려요</small>`;
    addB.classList.toggle("off", tut >= 0 && tut !== 9 || (full && boosts >= 2) || over);
    cacheB.classList.toggle("off", cacheCd > 0 || over || (tut >= 0 && tut !== 3));
    cacheB.classList.toggle("on", cacheOn > 0);
    cacheB.style.setProperty("--cd", cacheCd > 0 ? (cacheCd / (9 * 1)).toFixed(3) : 0);
  };

  // ── 길 따라 움직이는 점 ──
  const pathTo = (i, sx, sy) => [[sx, sy], [LBX + (sx < LBX ? -6 : 6), LBY], [LBX, LBY + 6], [LBX, CBY], [cx(i), CBY], [cx(i), RT - 1]];
  const spawnUser = (i, cached) => {
    if (dots.length > 160) return;
    const left = rnd() < 0.5, sx = left ? -2 : W + 1, sy = 44 + rint(9);
    const pts = cached ? [[sx, sy], [LBX + (left ? -6 : 6), LBY]] : pathTo(i, sx, sy);
    dots.push({ k: cached ? "c" : "u", r: i, pts, s: 1, x: sx, y: sy, v: 70 + rnd() * 30, c: pick(UCOL) });
  };
  const stepPath = (o, dt) => {
    let d = o.v * dt;
    while (d > 0 && o.s < o.pts.length) {
      const [tx, ty] = o.pts[o.s], dx = tx - o.x, dy = ty - o.y, L = Math.hypot(dx, dy);
      if (L <= d) { o.x = tx; o.y = ty; o.s++; d -= L; } else { o.x += (dx / L) * d; o.y += (dy / L) * d; d = 0; }
    }
    return o.s >= o.pts.length;
  };

  // ── 조작 ──
  const doMove = (a, b) => {
    if (over || a === b) return false;
    const A = racks[a], B = racks[b];
    if (!rackUp(A) || !B.on || B.drop > 0) return false;
    if (B.down > 0) { F.msg("꺼진 서버(503)로는 못 옮겨요"); SFX.tok(); return false; }
    const amt = (A.L - B.L) * 0.55;
    if (amt < 0.05) { F.msg(A.L < B.L ? "거긴 더 바빠요! 한가한 쪽으로" : "부하 차이가 별로 없어요"); SFX.tok(); return false; }
    const was = A.L;
    A.L -= amt; B.L += amt; moves++; lastAct = el;
    for (let k = 0; k < 12; k++) dots.push({ k: "m", a, b, t: -k * 0.035, c: k % 3 ? "#9fd0ff" : "#ffffff" });
    S.move(); vib(10);
    const bp = stageXY(cx(b), RT - 6);
    if (was > 0.92) { rescues++; F.hit(stageXY(cx(a), RT - 6), Math.round(amt * 100), "#7fd8ff"); }
    else F.float(bp, `+${Math.round(amt * 100)}%`);
    if (tut === 1 && was > 0.9) setTimeout(() => { if (tut === 1) tutNext(2); }, 650);
    else if (tut === 1) F.msg("빨간 서버에서 옮겨 봐요");
    return true;
  };
  const blockHack = (h) => {
    h.dead = 1; hacksOk += tut < 0 ? 1 : 0; lastAct = el;
    S.block(); F.hit(stageXY(h.x, h.y), 1, "#5fe0ff");
    for (let k = 0; k < 10; k++) sparks.push({ x: h.x, y: h.y, vx: rnd() * 80 - 40, vy: rnd() * 80 - 50, t: 0.5, c: pick(["#5fe0ff", "#ffffff", "#ff3a4a"]) });
    alertMsg("해킹 차단!", "b");
    if (tut === 2) setTimeout(() => { if (tut === 2) tutNext(3); }, 600);
  };
  const useCache = () => {
    if (over) return;
    if (tut >= 0 && tut !== 3) { F.msg(tut === 4 ? "출시 버튼을 눌러요" : "지금은 손가락 안내를 따라가요"); SFX.tok(); return; }
    if (cacheCd > 0) { F.msg(`캐시 충전 중… ${Math.ceil(cacheCd)}초`); SFX.tok(); return; }
    cacheOn = 4 * ez; cacheCd = 9; lastAct = el;
    racks.forEach((r) => { if (rackUp(r)) r.L = Math.max(0, r.L - 0.18); });
    S.cache(); vib(15); alertMsg("캐시 ON! 부하 절반", "g"); F.burst(stageXY(LBX, LBY), "#5fe0a0", 14);
    if (tut === 3) setTimeout(() => { if (tut === 3) tutNext(4); }, 900);
    updBtns();
  };
  const addServer = () => {
    if (over) return;
    if (tut >= 0) { F.msg("리허설에선 서버를 안 늘려요"); SFX.tok(); return; }
    lastAct = el;
    if (!racks[3].on) {
      const r = racks[3]; r.on = true; r.drop = 1; r.L = 0; cost += COST_ADD;
      tone(880, 0.1, "triangle", 0.06); F.float(stageXY(cx(3), 70), `월 +${COST_ADD}만`, "bad");
    } else if (boosts < 2) {
      boosts++; cost += COST_UP; racks.forEach((r) => (r.flash = 0.6)); S.cache(); F.float(stageXY(LBX, 80), `성능 UP! 월 +${COST_UP}만`, "bad");
    } else { F.msg("서버는 이미 최대예요"); SFX.tok(); return; }
    dk.c.classList.remove("bump"); void dk.c.offsetWidth; dk.c.classList.add("bump");
    updBtns(); setDash();
  };
  const drink = () => {
    if (!drowsy) return;
    if (tut < 0 && drowsy.t < 4.5) coffeeOk = 1;
    drowsy = null; S.gulp(); vib(20); lastAct = el;
    F.float(stageXY(140, DY), "정신 번쩍!"); for (let k = 0; k < 8; k++) sparks.push({ x: 140, y: DY + 6, vx: rnd() * 60 - 30, vy: -30 - rnd() * 40, t: 0.6, c: pick(["#ffd23f", "#ffffff"]) });
  };
  const startBackup = (r) => { r.bk = 0; r.bkp = 0.001; S.beep(); lastAct = el; alertMsg("DB 백업 중…", "b"); };

  // 포인터: 랙 잡고 끌기, 톡(선택→다른 랙 톡), 해킹 점·커피·백업 톡
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const rackAt = (x, y) => { for (let i = 0; i < 4; i++) if (racks[i].on && x >= SX[i] - 2 && x <= SX[i] + SW + 2 && y >= RT - 18 && y <= RB + 12) return i; return -1; };
  const mugHit = (x, y) => x >= 126 && x <= 156 && y >= DY - 6 && y <= DY + 22;
  cv.addEventListener("pointerdown", (e) => {
    if (over) return; e.preventDefault();
    const [x, y] = toL(e);
    if (drowsy && mugHit(x, y)) return drink();
    let best = null, bd = 13;
    for (const h of hacks) { if (h.dead) continue; const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
    if (best) return blockHack(best);
    const i = rackAt(x, y);
    if (i < 0) { if (sel >= 0) sel = -1; return; }
    const r = racks[i];
    if (r.bk > 0) return startBackup(r);
    if (r.down > 0) { F.msg("재부팅 중이에요…"); SFX.tok(); return; }
    drag = { from: i, x, y, x0: x, y0: y, moved: false };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    SFX.tick();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return; const [x, y] = toL(e); drag.x = x; drag.y = y;
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > 5) drag.moved = true;
  });
  const up = (e, cancel) => {
    if (!drag) return; const d = drag; drag = null; if (cancel || over) return;
    const [x, y] = toL(e), t = rackAt(x, y);
    if (d.moved) { if (t >= 0 && t !== d.from) doMove(d.from, t); else SFX.tok(); sel = -1; return; }
    if (sel >= 0 && sel !== d.from) { doMove(sel, d.from); sel = -1; return; }
    if (sel === d.from) { sel = -1; return; }
    sel = d.from; selT = 0; F.msg("옮길 서버를 톡!");
  };
  cv.addEventListener("pointerup", (e) => up(e, false));
  cv.addEventListener("pointercancel", (e) => up(e, true));
  addB.addEventListener("pointerdown", (e) => { e.preventDefault(); addServer(); });
  cacheB.addEventListener("pointerdown", (e) => { e.preventDefault(); useCache(); });

  // ── 사건 ──
  const spawnHack = (target, spd) => {
    const ups = racks.filter(rackUp); if (!ups.length) return;
    const i = target != null ? target : pick(ups).i, left = rnd() < 0.5, sx = left ? -3 : W + 2, sy = 46;
    hacks.push({ r: i, pts: pathTo(i, sx, sy), s: 1, x: sx, y: sy, v: spd || 24 / ez, dead: 0 });
    if (tut < 0) hacksN++;
    S.siren(); alertMsg("해킹 시도! 빨간 점을 톡", "");
  };
  const runEvent = (k) => {
    if (k === "viral") { F.msg("커뮤니티 글 떡상! 사람이 몰려와요"); alertMsg("떡상!", "y"); S.yay(); }
    else if (k === "hack") spawnHack();
    else if (k === "hack2") { spawnHack(); setTimeout(() => { if (!over) spawnHack(); }, 450); }
    else if (k === "backup") {
      const c = racks.filter((r) => rackUp(r) && r.bk <= 0 && r.bkp <= 0); if (!c.length) return;
      const r = pick(c); r.bk = 5 * ez; bkN++; alertMsg("DB 백업 알림! 서버를 톡", "y"); S.beep();
    } else if (k === "drowsy") { drowsy = { t: 0 }; drowsyN++; S.yawn(); F.msg("새벽 3시… 눈꺼풀이 무거워요"); }
  };

  // ── 할 일 손가락 ──
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.dx | 0},${o.dy | 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "v3-go"; return; }
    const upw = o.y < 70;
    goI.style.backgroundImage = `url(${upw ? FUP : FDN})`;
    goEl.style.left = o.x + "px"; goEl.style.top = o.y + "px"; goT.innerHTML = o.t;
    const ww = W * K; goT.style.transform = o.x < 70 ? "translateX(-22%)" : o.x > ww - 70 ? "translateX(-80%)" : "";
    goEl.style.setProperty("--dx", (o.dx || 0) + "px"); goEl.style.setProperty("--dy", (o.dy || 0) + "px");
    goEl.className = "v3-go on" + (upw ? " up" : "") + (o.dx != null ? " drag" : "");
  };
  const atL = (x, y, t, extra = {}) => ({ x: x * K, y: y * K, t, ...extra });
  const dragGuide = (a, b, t) => ({ x: cx(a) * K, y: (RT + 26) * K, t, dx: (cx(b) - cx(a)) * K, dy: 0 });
  const hottest = () => { let a = -1, b = -1; racks.forEach((r, i) => { if (!rackUp(r)) return; if (a < 0 || r.L > racks[a].L) a = i; if (b < 0 || r.L < racks[b].L) b = i; }); return [a, b]; };
  const taskNow = () => {
    if (tut >= 0) return null;
    const idle = el - lastAct;
    if (drowsy && drowsy.t > 0.8) return atL(141, DY + 2, "커피 <b>톡!</b>");
    const h = hacks.find((q) => !q.dead);
    if (h && (idle > 0.8 || hacksOk === 0)) return atL(h.x, h.y - 3, "해킹 점 <b>톡!</b>");
    const bk = racks.find((r) => r.bk > 0);
    if (bk && (idle > 1 || bkOk === 0)) return atL(cx(bk.i), RT - 9, "백업 <b>톡!</b>");
    const [a, b] = hottest();
    if (firstHint && el < 3.2 && a >= 0 && b >= 0 && a !== b) return dragGuide(a, b, "빨간 서버를 <b>한가한 쪽으로</b>");
    if (a >= 0 && b >= 0 && a !== b && racks[a].L > 0.9 && racks[a].L - racks[b].L > 0.3 && idle > 1.6) return dragGuide(a, b, "끌어서 <b>옮기기!</b>");
    if (cacheCd <= 0 && inRate() > capNow() * 1.02 && racks.filter(rackUp).every((r) => r.L > 0.7) && idle > 1.2) { const [x, y] = elXY(cacheB, 6); return { x, y, t: "<b>캐시!</b>" }; }
    if (!racks[3].on && p > 0.3 && p < 0.8 && racks.filter(rackUp).every((r) => r.L > 0.75) && idle > 2) { const [x, y] = elXY(addB, 6); return { x, y, t: "<b>서버 추가</b>도 있어요" }; }
    return null;
  };

  // ── 리허설 ──
  const SKIP = `<button class="v3-skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutEl.classList.remove("pop", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    tutEl.style.top = px(1);
    if (n === 1) {
      racks[0].L = 1.08; racks[1].L = 0.22; racks[2].L = 0.55; hot = 0;
      tutP.innerHTML = `<b class="rd">빨간 서버</b>가 꽉 찼어요! 꾹 잡고<br><b>한가한 서버</b>로 끌면 트래픽이 옮겨 가요.`; tutB.innerHTML = SKIP;
    } else if (n === 2) {
      tutP.innerHTML = `해킹 시도! 케이블을 타고 오는<br><b class="rd">빨간 점</b>을 <b>톡</b> 해서 막아요.`; tutB.innerHTML = SKIP;
      hacks = []; spawnHack(2, 16);
    } else if (n === 3) {
      racks.forEach((r) => { if (r.on) r.L = 0.85 + rnd() * 0.1; });
      tutP.innerHTML = `사람이 너무 몰려 다 빨개질 땐<br><b>캐시</b>! 잠깐 부하가 절반이 돼요.`; tutB.innerHTML = SKIP;
    } else if (n === 4) {
      tutEl.style.top = px(58);
      tutP.innerHTML = `준비 끝! 이제 진짜 <b>출시 날 밤</b>(21시→아침 7시)<ul><li>사람이 점점 늘어요. <b>서버 추가</b>는 든든하지만 <b class="rd">월 비용↑</b></li><li>노란 <b>DB 백업</b> 알림은 그 서버를 톡</li><li>새벽 3시 졸음엔 <b>커피 톡</b></li><li>빨간 채로 버티면 <b class="rd">503</b>! 사용자가 떠나요</li></ul>`;
      tutB.innerHTML = `<button class="v3-go2" data-go>출시하기!</button>`;
    }
    updBtns(); updSc();
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    racks = [0, 1, 2, 3].map((i) => mkRack(i, i < 3)); racks[0].L = 0.2; racks[1].L = 0.28; racks[2].L = 0.16;
    hacks = []; drowsy = null; sel = -1; cacheOn = 0; cacheCd = 0; boosts = 0; cost = COST0 * 3;
    served = lost = subs = hacksN = hacksOk = bkN = bkOk = coffeeOk = drowsyN = crashes = moves = rescues = 0;
    evI = 0; hist = []; histAcc = { s: 0, l: 0, t: 0 }; el = 0; p = 0; lastAct = 0; hot = rint(3); hotT = 4;
    tm0 = timer(T, F.bar, () => endGame()); SFX.go();
    alertMsg("출시! 앱 공개", "b"); updBtns(); updSc(); setDash();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 그리기 ──
  const drawGraph = (tm) => {
    const n = hist.length, mx = Math.max(60, ...hist.map((h) => h.s + h.l)) * 1.1;
    const x0 = 96 - n * 2;
    hist.forEach((h, k) => {
      const x = x0 + k * 2, hs = Math.round((h.s / mx) * 25), hl = Math.round((h.l / mx) * 25);
      if (x < 3) return;
      P(x, 37 - hs, 2, hs, "#1f6a4a"); P(x, 37 - hs, 2, 1, "#5ff0a0");
      if (hl > 0) P(x, 37 - hs - hl, 2, hl, "#a0303a");
    });
    if (n) { const h = hist[n - 1], hs = Math.round((h.s / mx) * 25); if (Math.floor(tm * 4) % 2) P(95, 36 - hs, 2, 2, "#ffffff"); }
    if (tut >= 0) for (let x = 0; x < 92; x += 2) { const v = 3 + Math.round(Math.sin(x * 0.3 + tm * 3) * 1.5); P(4 + x, 37 - v, 2, 1, "#2e5a4a"); }
  };
  const drawCables = (tm) => {
    P(LBX - 1, LBY + 6, 3, CBY - LBY - 5, "#262c4c");
    racks.forEach((r, i) => {
      if (!r.on) return;
      const x = cx(i), xa = Math.min(x, LBX), xb = Math.max(x, LBX), isHot = i === hot && tut < 0 && rackUp(r);
      const col = r.down > 0 ? "#3a1a22" : isHot ? "#6a3a22" : "#262c4c";
      P(xa, CBY, xb - xa + 2, 2, col); P(x, CBY, 2, RT - CBY - (r.drop > 0 ? 0 : 0), col);
      if (isHot) { const ph = Math.floor(tm * 20) % 6; for (let k = ph; k < xb - xa; k += 6) P(xa + k, CBY, 2, 1, "#ff9a3a"); for (let y = CBY + ph % 4; y < RT - 1; y += 4) P(x, y, 1, 2, "#ff9a3a"); }
    });
    // 로드밸런서
    P(LBX - 15, LBY - 6, 32, 12, "#05060e"); P(LBX - 14, LBY - 5, 30, 10, "#283050"); P(LBX - 14, LBY - 5, 30, 1, "#4a5488");
    for (let k = 0; k < 6; k++) P(LBX - 11 + k * 4, LBY - 2, 2, 2, Math.floor(tm * 10 + k * 1.3) % 3 ? "#5fb8ff" : "#1a3a5a");
    P(LBX - 12, LBY + 2, 26, 1, "#1a1f3a");
    if (cacheOn > 0) {
      const a = 0.5 + 0.5 * Math.sin(tm * 14), c = `rgba(95,224,160,${0.5 + a * 0.5})`;
      P(LBX - 18, LBY - 9, 38, 1, c); P(LBX - 18, LBY + 8, 38, 1, c); P(LBX - 18, LBY - 9, 1, 18, c); P(LBX + 19, LBY - 9, 1, 18, c);
      for (let k = 0; k < 4; k++) { const t = (tm * 1.6 + k / 4) % 1; P(LBX - 16 + k * 10, LBY - 9 - Math.round(t * 6), 1, 1, `rgba(150,255,200,${1 - t})`); }
    }
  };
  const drawRack = (i, tm) => {
    const r = racks[i], x = SX[i];
    if (!r.on) {
      const pulse = tut < 0 && Math.floor(tm * 2) % 2 ? "#3a4488" : "#262c58";
      for (let y = RT; y < RB; y += 4) { P(x, y, 1, 2, pulse); P(x + 35, y, 1, 2, pulse); }
      for (let xx = x; xx < x + 36; xx += 4) { P(xx, RT, 2, 1, pulse); P(xx, RB - 1, 2, 1, pulse); }
      const my = (RT + RB) >> 1; P(x + 16, my - 5, 4, 12, pulse); P(x + 12, my - 1, 12, 4, pulse);
      return;
    }
    const oy = r.drop > 0 ? -Math.round(r.drop * r.drop * 150) : 0, top = RT + oy, bot = RB + oy, h = bot - top;
    // 그림자
    if (r.drop > 0) { const s = Math.round((1 - r.drop) * 30); P(x + 18 - (s >> 1), RB + 1, s, 2, "#05060e"); }
    P(x, top, 36, h, "#05060e"); P(x + 1, top + 1, 34, h - 2, "#1e2336");
    P(x + 1, top + 1, 34, 6, "#3a4060"); P(x + 1, top + 1, 34, 1, "#5a6288"); P(x + 1, top + 7, 34, 1, "#141828");
    P(x + 3, top + 2, 7, 5, "#10142a"); ptext(P, i + 1, x + 5, top + 2, r.down > 0 ? "#ff4a4a" : "#c8d0f0");
    P(x + 1, top + 4, 1, h - 6, "#2c3350"); P(x + 34, top + 4, 1, h - 6, "#141828");
    P(x + 3, bot, 4, 2, "#05060e"); P(x + 29, bot, 4, 2, "#05060e");
    const nb = Math.floor((h - 13) / 8), down = r.down > 0;
    const lc = r.L < 0.7 ? "#4dff88" : r.L < 1 ? "#ffd23f" : "#ff4a4a";
    for (let b = 0; b < nb; b++) {
      const y = top + 9 + b * 8;
      P(x + 3, y, 30, 6, down ? "#15151e" : "#2a3048"); P(x + 3, y, 30, 1, down ? "#1e1e28" : "#3e4668"); P(x + 3, y + 5, 30, 1, "#161a2a");
      for (let vx = x + 5; vx < x + 19; vx += 2) P(vx, y + 2, 1, 2, "#161a2a");
      if (!down) {
        const sp = 3 + r.L * 12, on1 = (tm * sp + b * 0.37 + i * 0.21) % 1 < 0.55, on2 = (tm * sp * 1.3 + b * 0.61) % 1 < 0.4;
        P(x + 21, y + 2, 2, 2, on1 ? lc : "#1c2a22"); P(x + 25, y + 2, 2, 2, on2 ? lc : "#1c2a22"); P(x + 29, y + 2, 2, 2, b % 3 === 0 ? "#5fb8ff" : "#1c2a3a");
      }
    }
    if (r.boost || boosts) { const bc = boosts > 1 ? "#9fd0ff" : "#5fb8ff"; for (let y = top + 6; y < bot - 3; y += 3) { P(x + 1, y, 1, 1, bc); P(x + 34, y, 1, 1, bc); } }
    if (r.flash > 0) P(x + 1, top + 1, 34, h - 2, `rgba(160,220,255,${r.flash * 0.6})`);
    if (!down && r.L > 0.95) {
      P(x + 1, top + 1, 34, h - 2, `rgba(255,40,40,${0.2 + 0.12 * Math.sin(tm * 14)})`);
      if (Math.floor(tm * 6) % 2) { P(x, top, 36, 1, "#ff4a4a"); P(x, bot - 1, 36, 1, "#ff4a4a"); P(x, top, 1, h, "#ff4a4a"); P(x + 35, top, 1, h, "#ff4a4a"); }
      if (r.L > 1) ptext(P, "!", x + 31, top + 2, Math.floor(tm * 8) % 2 ? "#ffd23f" : "#ff4a4a");
    }
    // 과열 연기
    if (!down && r.heat > 0) for (let k = 0; k < 4; k++) { const t = (tm * 1.3 + k * 0.25) % 1; P(x + 7 + k * 7 + Math.round(Math.sin(t * 6 + k) * 2), top - 2 - Math.round(t * 14), 3, 2, `rgba(190,190,200,${0.65 * (1 - t) * Math.min(1, r.heat)})`); }
    if (down) {
      // 503 화면
      const my = top + (h >> 1) - 9;
      P(x + 3, my, 30, 19, "#1a0408"); P(x + 3, my, 30, 1, "#ff4a4a");
      if (Math.floor(tm * 5) % 4) ptext(P, "503", x + 7, my + 4, "#ff4a4a", 2);
      for (let y = my + 1; y < my + 19; y += 2) P(x + 3, y, 30, 1, "rgba(0,0,0,.25)");
      if (rnd() < 0.3) sparks.push({ x: x + 4 + rnd() * 28, y: top + 2, vx: rnd() * 40 - 20, vy: -20 - rnd() * 30, t: 0.4, c: pick(["#ffd23f", "#ff7a3a"]) });
      // 재부팅 막대
      const rb = clamp(1 - r.down / 4.5, 0, 1); P(x + 3, my + 16, Math.round(30 * rb), 2, "#5fb8ff");
    }
    // 백업 알림·진행
    if (r.bk > 0) {
      const by = top - 13 + (Math.floor(tm * 4) % 2), bx = x + 13;
      P(bx - 1, by - 1, 11, 11, "#05060e"); P(bx, by, 9, 9, "#ffd23f"); P(bx + 1, by + 1, 7, 2, "#fff0a0"); P(bx + 1, by + 4, 7, 1, "#c99a1a"); P(bx + 1, by + 7, 7, 1, "#c99a1a");
      const left = clamp(r.bk / (5 * ez), 0, 1); P(x + 2, top - 3, Math.round(32 * left), 1, "#ffd23f");
    }
    if (r.bkp > 0) { P(x + 3, top + 7, 30, 2, "#10142a"); P(x + 3, top + 7, Math.round(30 * r.bkp), 2, "#5fb8ff"); }
    // 선택·끌기 표시
    const isSrc = (drag && drag.from === i && drag.moved) || sel === i;
    const isDst = drag && drag.moved && drag.from !== i && rackAt(drag.x, drag.y) === i;
    if (isSrc || isDst) {
      const c = isDst ? "#5ff0a0" : Math.floor(tm * 6) % 2 ? "#ffd23f" : "#fff0a0";
      P(x - 1, top - 1, 38, 1, c); P(x - 1, bot, 38, 1, c); P(x - 1, top - 1, 1, h + 1, c); P(x + 36, top - 1, 1, h + 2, c);
    }
    // 부하 게이지
    const gy = RB + 3;
    if (r.drop <= 0) {
      P(x, gy, 36, 7, "#05060e"); P(x + 1, gy + 1, 34, 5, "#141830");
      const n = Math.ceil(Math.min(r.L, 1) * 8), over1 = r.L > 1 && !down;
      for (let c = 0; c < 8; c++) { const col = c < 4 ? "#4dff88" : c < 6 ? "#ffd23f" : "#ff4a4a"; P(x + 2 + c * 4, gy + 2, 3, 3, down ? "#2a1a20" : c < n ? (over1 && Math.floor(tm * 8) % 2 ? "#ffffff" : col) : "#262b40"); }
    }
  };
  const drawDots = (tm) => {
    for (const d of dots) {
      if (d.k === "m") { if (d.t < 0) continue; const ax = cx(d.a), bx = cx(d.b), t = clamp(d.t, 0, 1), x = Math.round(lerp(ax, bx, t)), y = Math.round(RT - 4 - Math.sin(t * Math.PI) * 22); P(x, y, 2, 2, d.c); continue; }
      const x = Math.round(d.x), y = Math.round(d.y);
      if (d.k === "l") { const a = clamp(d.t / 0.8, 0, 1); P(x, y, 2, 2, `rgba(150,150,170,${a})`); P(x, y - 1, 2, 1, `rgba(200,200,210,${a})`); continue; }
      P(x, y, 2, 2, d.k === "c" ? "#5fe0a0" : d.c); P(x, y - 1, 2, 1, "#ffd8b8");
    }
    for (const h of hacks) {
      if (h.dead) continue;
      const x = Math.round(h.x) - 2, y = Math.round(h.y) - 2, bl = Math.floor(tm * 8) % 2;
      P(x - 2, y - 2, 9, 9, bl ? "rgba(255,58,74,.35)" : "rgba(255,58,74,.15)");
      VIRUS.forEach((rw, yy) => [...rw].forEach((ch, xx) => { if (ch === "X") P(x + xx, y + yy, 1, 1, bl ? "#ff3a4a" : "#ff6a5a"); if (ch === "o") P(x + xx, y + yy, 1, 1, "#ffffff"); }));
    }
  };
  const drawMug = (tm) => {
    const x = 132, y = DY + 3, glow = drowsy && Math.floor(tm * 4) % 2;
    if (glow) { P(x - 3, y - 3, 22, 20, "#ffd23f"); P(x - 2, y - 2, 20, 18, "#3a3048"); }
    P(x, y + 2, 12, 12, "#05060e"); P(x + 1, y + 3, 10, 10, "#f4f4f8"); P(x + 1, y + 3, 10, 2, "#5a3a22"); P(x + 11, y + 5, 3, 5, "#05060e"); P(x + 12, y + 6, 1, 3, "#f4f4f8");
    P(x + 3, y + 8, 6, 2, "#7c9cff");
    for (let k = 0; k < 2; k++) { const t = (tm * 0.8 + k / 2) % 1; P(x + 4 + k * 3 + Math.round(Math.sin(t * 7) * 1.5), y + 1 - Math.round(t * 8), 1, 2, `rgba(255,255,255,${0.6 * (1 - t)})`); }
  };
  const render = (tm) => {
    g.clearRect(0, 0, W, H);
    const sx = shake > 0 ? Math.round((rnd() - 0.5) * 3) : 0;
    g.save(); g.translate(sx, 0);
    g.drawImage(BG, 0, 0);
    drawGraph(tm);
    // 경고등
    const anyHot = racks.some((r) => r.on && (r.L > 1 || r.down > 0));
    if (anyHot && Math.floor(tm * 4) % 2) { P(4, 46, 4, 2, "#ff3a4a"); P(152, 46, 4, 2, "#ff3a4a"); P(2, 44, 8, 6, "rgba(255,58,74,.2)"); P(150, 44, 8, 6, "rgba(255,58,74,.2)"); }
    drawCables(tm);
    for (let i = 0; i < 4; i++) drawRack(i, tm);
    drawDots(tm);
    if (drag && drag.moved) {
      const ax = cx(drag.from), ay = RT + 20;
      for (let k = 0; k <= 10; k++) { const t = k / 10; if ((k + Math.floor(tm * 10)) % 2) continue; P(Math.round(lerp(ax, drag.x, t)), Math.round(lerp(ay, drag.y, t) - Math.sin(t * Math.PI) * 10), 2, 2, "#ffd23f"); }
    }
    g.drawImage(DESK, 0, DY);
    drawMug(tm);
    for (const s of sparks) P(Math.round(s.x), Math.round(s.y), 2, 2, s.c);
    g.restore();
    // 졸음: 눈꺼풀
    if (drowsy) {
      const lid = clamp(drowsy.t / 3.6, 0, 0.9) * (0.9 + 0.1 * Math.sin(tm * 3)), hh = Math.round((H / 2) * lid);
      P(0, 0, W, H, `rgba(5,6,20,${0.35 * lid})`);
      P(0, 0, W, hh, "#020208"); P(0, H - hh, W, hh, "#020208");
      P(0, hh, W, 2, "rgba(2,2,8,.6)"); P(0, H - hh - 2, W, 2, "rgba(2,2,8,.6)");
      ptext(P, "Z", 20, 30 + Math.round(Math.sin(tm * 2) * 3), "#7c9cff", 2); ptext(P, "Z", 32, 22 + Math.round(Math.sin(tm * 2 + 1) * 3), "#7c9cff", 1);
      drawMug(tm);
    }
  };

  // ── 끝: 아침 결산 ──
  const endGame = () => {
    if (over) return; over = true; guide(null); endT = 0;
    if (tm0) tm0.stop(); drag = null; sel = -1; updBtns();
    const tot = served + lost, uptime = tot ? served / tot : 0;
    const revenue = subs * PRICE, costW = cost * 10000, profit = revenue - costW;
    const maxRev = tot * SUBR * PRICE;
    const upN = clamp((uptime - 0.7) / 0.27, 0, 1);
    const secT = hacksN + bkN + drowsyN, secN = secT ? (hacksOk + bkOk + coffeeOk) / secT : 1;
    const profitN = maxRev > 0 ? clamp(profit / (0.6 * maxRev), 0, 1) : 0;
    const score = clamp(0.6 * upN + 0.25 * secN + 0.15 * profitN, 0, 1);
    const happy = score >= 0.5;
    F.msg("아침 7시! 밤샘 끝");
    // 장면 캔버스
    const eb = document.createElement("canvas"), ef = document.createElement("canvas");
    eb.width = ef.width = W; eb.height = ef.height = H;
    const deskY = Math.round(H * 0.76);
    {
      const d = eb.getContext("2d"), Q = (x, y, w, h, c) => { d.fillStyle = c; d.fillRect(x, y, w, h); };
      for (let y = 0; y < H; y++) { const t = y / H; Q(0, y, W, 1, `rgb(${Math.round(30 + t * 20)},${Math.round(32 + t * 16)},${Math.round(58 + t * 18)})`); }
      // 창문 + 해 뜨는 하늘
      const wx = 28, wy = 8, ww = 104, wh = Math.round(H * 0.42);
      Q(wx - 3, wy - 3, ww + 6, wh + 6, "#1a1c2c");
      for (let y = 0; y < wh; y++) { const t = y / wh; Q(wx, wy + y, ww, 1, `rgb(${Math.round(120 + t * 135)},${Math.round(150 + t * 40)},${Math.round(220 - t * 110)})`); }
      const sy = wy + wh - 8; for (let r = 14; r > 0; r--) Q(80 - r, sy - Math.round(Math.sqrt(196 - (14 - r) * (14 - r)) * 0.6), r * 2, 2, r > 9 ? "#ffd27a" : "#fff0b0");
      Q(76, sy - 18, 8, 3, "#fff8d8");
      let x = wx; while (x < wx + ww) { const bw = 6 + rint(9), bh = 8 + rint(Math.round(wh * 0.35)); Q(x, wy + wh - bh, bw, bh, "#3a3450"); for (let yy = wy + wh - bh + 2; yy < wy + wh - 1; yy += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (rnd() < 0.25) Q(xx, yy, 1, 1, "#ffe0a0"); x += bw + 1; }
      Q(wx + (ww >> 1) - 1, wy, 2, wh, "#1a1c2c"); Q(wx, wy + (wh >> 1), ww, 2, "#1a1c2c");
      for (let y = wy; y < wy + 12; y += 3) Q(wx, y, ww, 2, "#d8d0c0");
      // 양옆 서버 랙
      for (const rx of [2, 136]) { const ry = Math.round(H * 0.3); Q(rx, ry, 22, deskY - ry, "#05060e"); Q(rx + 1, ry + 1, 20, deskY - ry - 2, "#1e2336"); for (let y = ry + 4; y < deskY - 4; y += 6) { Q(rx + 2, y, 18, 4, "#2a3048"); Q(rx + 14, y + 1, 2, 2, "#4dff88"); Q(rx + 17, y + 1, 2, 2, (y >> 2) % 3 ? "#4dff88" : "#5fb8ff"); } }
      // 의자 등받이
      const cy0 = Math.round(H * 0.5); Q(46, cy0, 68, deskY - cy0, "#15161e"); Q(48, cy0 + 2, 64, deskY - cy0 - 2, "#2a2c3a"); Q(48, cy0 + 2, 64, 2, "#3e4052"); Q(52, cy0 + 6, 2, deskY - cy0 - 8, "#353748"); Q(106, cy0 + 6, 2, deskY - cy0 - 8, "#20222e");
    }
    endEl.innerHTML = `<canvas class="v3-eb"></canvas><div class="v3-dk"></div><div class="v3-me"></div><canvas class="v3-ef"></canvas><div class="v3-say"></div>
      <div class="v3-rep"><h4>07:00 · 출시 첫날 밤 결산</h4><div><span>가입자</span><b>${wonS(served)}명</b></div><div><span>떠난 사람(503·느림)</span><b class="mi">${wonS(lost)}명</b></div><div><span>구독 ${wonS(subs)}명 × 4,900원</span><b class="pl">+${manS(revenue)}만/월</b></div><div><span>서버비</span><b class="mi">-${cost}만/월</b></div><div><span>남는 돈</span><b class="${profit >= 0 ? "pl" : "mi"}">${profit >= 0 ? "+" : ""}${manS(profit)}만/월</b></div></div>`;
    const cb = endEl.querySelector(".v3-eb"), cf = endEl.querySelector(".v3-ef"), meEl = endEl.querySelector(".v3-me"), dkEl = endEl.querySelector(".v3-dk"), sayEl = endEl.querySelector(".v3-say"), rep = endEl.querySelector(".v3-rep");
    cb.width = cf.width = W; cb.height = cf.height = H; cb.getContext("2d").drawImage(eb, 0, 0);
    const Hc = H * K;
    // 내 캐릭터(표정 시트 3x2, 칸 240x540 중 위 312만)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    const avH = Math.round(Hc * 0.5), avW = Math.round(avH * 240 / 312);
    Object.assign(meEl.style, { width: avW + "px", height: avH + "px", left: Math.round(W * K / 2 - avW / 2) + "px", top: Math.round(Hc * 0.88 - avH) + "px" });
    const face = (i) => (meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`);
    face(0); meEl.classList.add("doze");
    { const im = new Image(); im.onload = () => { meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp"; }
    Object.assign(sayEl.style, { top: Math.round(Hc * 0.88 - avH - 30) + "px" });
    // 앞 캔버스: 책상·모니터·커피컵·폰(매 프레임)
    const fg = cf.getContext("2d");
    endScene = { fg, deskY, t: 0, buzz: 0, woke: false, happy };
    requestAnimationFrame(() => endEl.classList.add("on"));
    const at = (ms, fn) => setTimeout(() => { if (endEl.isConnected) fn(); }, ms);
    at(1700, () => { dkEl.classList.add("lit"); endScene.buzz = 1; S.alarm(); S.alarm(0.4); vib([40, 60, 40]); });
    at(2500, () => { endScene.woke = true; meEl.classList.remove("doze"); meEl.classList.add("wake"); face(5); sayEl.textContent = "헉! 아침이야?!"; sayEl.classList.add("on"); });
    at(3200, () => {
      rep.classList.add("on"); sayEl.classList.remove("on");
      [...rep.querySelectorAll("div")].forEach((d, k) => at(k * 230, () => { d.classList.add("on"); if (k === 2) { for (let j = 0; j < Math.min(6, Math.ceil(subs / 25)); j++) S.coin(j * 0.09); } else SFX.tick(); }));
    });
    at(4700, () => {
      face(happy ? 1 : 2); meEl.classList.remove("wake");
      sayEl.textContent = happy ? (crashes ? "몇 번 터졌지만… 지켜냈다!" : "한 번도 안 터졌다! 구독 띵띵!") : "503이 몇 번이야… 다음엔 꼭!";
      sayEl.classList.add("on"); if (happy) { S.yay(); F.burst([W * K / 2, Hc * 0.3], "#ffd23f", 14); } else SFX.fail();
    });
    const line = `가입 ${wonS(served)}명 · 구독 <b>${wonS(subs)}명</b> · 남는 돈 <b>${profit >= 0 ? "+" : ""}${manS(profit)}만/월</b>` + (crashes ? ` · 503 ${crashes}번` : "");
    at(6400, () => finish(score, line, "", [["서버 지키기", upN], ["보안·백업", secN], ["남는 돈", profitN]]));
    if (window.__mgdbg) window.__mgdbg._vibe3res = { score, uptime, upN, secN, profitN, served, lost, subs, cost, profit, crashes, moves, rescues, hacksN, hacksOk, bkN, bkOk, coffeeOk };
  };
  let endScene = null;
  const drawEnd = (tm, dt) => {
    const E = endScene; if (!E) return; E.t += dt; if (E.buzz > 0) E.buzz = Math.max(0, E.buzz - dt * 0.6);
    const d = E.fg, Q = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; d.fillStyle = c; d.fillRect(x, y, w, h); }, dy = E.deskY;
    d.clearRect(0, 0, W, H);
    Q(0, dy, W, H - dy, "#3a2a22"); Q(0, dy, W, 3, "#7a5a40"); Q(0, dy + 3, W, 1, "#2a1c16"); for (let x = 0; x < W; x += 26) Q(x, dy + 4, 1, H - dy - 4, "#32241c");
    // 키보드
    Q(52, dy - 3, 56, 6, "#15161e"); Q(53, dy - 2, 54, 4, "#3a3d4e"); for (let k = 0; k < 13; k++) Q(54 + k * 4, dy - 1, 3, 2, "#5a5e72");
    // 모니터(오른쪽, 대시보드: 초록 그래프)
    const mx = 114, my = dy - 34; Q(mx, my, 42, 28, "#05060e"); Q(mx + 1, my + 1, 40, 26, "#0b1022");
    for (let k = 0; k < 18; k++) { const v = Math.round(3 + Math.pow(k / 18, 1.4) * 18 * (E.happy ? 1 : 0.6) + Math.sin(k * 1.3) * 2); Q(mx + 3 + k * 2, my + 25 - v, 2, v, "#1f6a4a"); Q(mx + 3 + k * 2, my + 25 - v, 2, 1, "#5ff0a0"); }
    Q(mx + 18, my + 28, 6, 4, "#2a2c3a"); Q(mx + 12, dy - 2, 18, 2, "#2a2c3a");
    // 빈 커피컵 3개(밤샘의 흔적)
    for (let k = 0; k < 3; k++) { const x = 8 + k * 11, y = dy - 11 + (k === 1 ? 2 : 0); Q(x, y, 9, 10, "#05060e"); Q(x + 1, y + 1, 7, 8, "#f4f4f8"); Q(x + 1, y + 1, 7, 1, "#c8b8a8"); Q(x + 2, y + 5, 5, 2, "#7c9cff"); }
    // 폰(알림 진동)
    const bz = E.buzz > 0 ? Math.round(Math.sin(E.t * 60) * 1.5) : 0, px0 = 40 + bz, py0 = dy + 6;
    Q(px0, py0, 14, 8, "#05060e"); Q(px0 + 1, py0 + 1, 12, 6, E.buzz > 0 && Math.floor(E.t * 8) % 2 ? "#ffd23f" : "#2a3058");
    if (E.buzz > 0) { Q(px0 - 3, py0 + 2, 1, 4, "#ffd23f"); Q(px0 + 16, py0 + 2, 1, 4, "#ffd23f"); }
    // 졸 때 Z
    if (!E.woke) { const b = Math.round(H * 0.4); for (let k = 0; k < 3; k++) { const t = (E.t * 0.6 + k / 3) % 1; const zx = 98 + k * 7 + Math.round(t * 10), zy = b - Math.round(t * 26), zk = k ? 2 : 1; ptext(Q, "Z", zx + 1, zy + 1, `rgba(10,12,40,${0.8 * (1 - t)})`, zk); ptext(Q, "Z", zx, zy, `rgba(240,244,255,${1 - t})`, zk); } }
    // 아침 햇살 기울기
    if (E.t > 1.7) { const a = clamp((E.t - 1.7) / 1.5, 0, 1) * 0.16; d.fillStyle = `rgba(255,220,150,${a})`; d.beginPath(); d.moveTo(40, 0); d.lineTo(120, 0); d.lineTo(150, H); d.lineTo(20, H); d.fill(); }
  };

  // ── 반복 ──
  let raf = 0;
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tm = now / 1000;
    if (!inited) { inited = true; if (opts.retry) startGame(); else tutNext(1); }
    if (!over) {
      if (tut < 0) { el += dt; p = clamp(el / T, 0, 1); }
      if (shake > 0) shake -= dt;
      if (sel >= 0) { selT += dt; if (selT > 3) sel = -1; }
      // 사건
      if (tut < 0) while (evI < EVENTS.length && p >= EVENTS[evI][0]) runEvent(EVENTS[evI++][1]);
      // 핫스팟
      if (tut < 0) { hotT -= dt; if (hotT <= 0) { const c = racks.filter((r) => r.on && r.i !== hot); if (c.length) hot = pick(c).i; hotT = 3.6 + rnd() * 2.4; } }
      if (cacheOn > 0) cacheOn -= dt; if (cacheCd > 0) cacheCd = Math.max(0, cacheCd - dt);
      // 부하 계산
      const I = inRate(), cm = cacheOn > 0 ? 0.5 : 1;
      const ws = racks.map((r) => (r.on && r.drop <= 0 ? (tut >= 0 ? 1 : r.i === hot ? 2.8 : 1) : 0)), wsum = ws.reduce((a, b) => a + b, 0) || 1;
      let sv = 0, ls = 0;
      racks.forEach((r, i) => {
        if (r.flash > 0) r.flash -= dt * 1.5;
        if (r.drop > 0) { r.drop -= dt * 2.2; if (r.drop <= 0) { r.drop = 0; S.thud(); vib(30); shake = 0.25; for (let k = 0; k < 14; k++) sparks.push({ x: SX[3] + rnd() * 36, y: RB, vx: rnd() * 60 - 30, vy: -10 - rnd() * 30, t: 0.5, c: "#8a8aa8" }); alertMsg("서버 추가 완료!", "b"); } }
        if (!r.on || r.drop > 0) return;
        const inflow = I * (ws[i] / wsum) * cm * dt;
        r.acc += I * (ws[i] / wsum) * cm * dt * 14;
        if (tut >= 0) { while (r.acc >= 1) { r.acc -= 1; spawnUser(i); } return; }
        if (r.down > 0) {
          r.down -= dt; ls += inflow; while (r.acc >= 1) { r.acc -= 1; spawnUser(i); }
          if (r.down <= 0) { r.down = 0; r.L = 0.1; alertMsg(`${i + 1}번 서버 복구`, "g"); tone(880, 0.1, "triangle", 0.06); }
          return;
        }
        while (r.acc >= 1) { r.acc -= 1; spawnUser(i); }
        r.L += inflow;
        if (r.L > 1) { sv += inflow * 0.5; ls += inflow * 0.5; } else sv += inflow;
        r.L = Math.max(0, r.L - DRAIN * (1 + 0.25 * boosts) * dt);
        r.L = Math.min(r.L, 1.45);
        if (r.L > 1) {
          r.heat += dt / ez;
          if (r.heat > 2.2) {
            r.down = 4.5; r.heat = 0; r.L = 0; r.crashN++; crashes++; S.crash(); vib([60, 40, 80]); shake = 0.4;
            F.miss(stageXY(cx(i), RT + 30)); alertMsg(`${i + 1}번 서버 503! 사용자 이탈`); if (sel === i) sel = -1;
            for (let k = 0; k < 18; k++) sparks.push({ x: cx(i), y: RT + 20, vx: rnd() * 120 - 60, vy: -30 - rnd() * 60, t: 0.6, c: pick(["#ff4a4a", "#ffd23f", "#ffffff"]) });
          }
        } else r.heat = Math.max(0, r.heat - dt * 1.5);
      });
      if (tut < 0) {
        // 캐시가 받아 준 몫도 손님은 손님
        const cached = cacheOn > 0 ? I * 0.5 * dt : 0;
        sv += cached; cacheAcc += cached * 14; while (cacheAcc >= 1) { cacheAcc -= 1; spawnUser(0, true); }
        served += sv * UPU; lost += ls * UPU;
        const ns = Math.floor(served * SUBR);
        if (ns > subs) { subs = ns; dingN++; if (el - dingT > 0.32) { dingT = el; S.coin(); if (dingN % 3 === 0) F.float(stageXY(128, 30), "+4,900원"); dk.s.classList.remove("bump"); void dk.s.offsetWidth; dk.s.classList.add("bump"); } updSc(); }
        histAcc.s += sv * UPU; histAcc.l += ls * UPU; histAcc.t += dt;
        if (histAcc.t >= 0.4) { hist.push({ s: histAcc.s / histAcc.t, l: histAcc.l / histAcc.t }); if (hist.length > 46) hist.shift(); histAcc = { s: 0, l: 0, t: 0 }; }
        // 과부하 삑
        alarmT -= dt; if (alarmT <= 0 && racks.some((r) => r.on && r.L > 1 && r.down <= 0)) { alarmT = 0.5; S.beep(); }
        // 백업
        racks.forEach((r) => {
          if (r.bk > 0) { r.bk -= dt; if (r.bk <= 0 || r.down > 0) { r.bk = 0; alertMsg("백업을 놓쳤어요…", ""); SFX.fail(); } }
          if (r.bkp > 0) { r.bkp += dt / 1.2; if (r.bkp >= 1) { r.bkp = 0; bkOk++; S.backup(); alertMsg("백업 완료!", "g"); F.float(stageXY(cx(r.i), RT - 6), "백업 완료"); } }
        });
        // 졸음
        if (drowsy) { drowsy.t += dt; if (drowsy.t > 7) { drowsy = null; F.msg("헉! 깜빡 졸았다"); SFX.fail(); } }
      }
      // 점·해킹 이동
      for (let k = dots.length - 1; k >= 0; k--) {
        const d = dots[k];
        if (d.k === "m") { d.t += dt * 2.4; if (d.t >= 1) dots.splice(k, 1); continue; }
        if (d.k === "l") { d.t -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 40 * dt; if (d.t <= 0) dots.splice(k, 1); continue; }
        if (stepPath(d, dt)) {
          dots.splice(k, 1);
          if (d.k === "c") { if (rnd() < 0.5) sparks.push({ x: d.x, y: d.y, vx: rnd() * 30 - 15, vy: -20, t: 0.3, c: "#9fffc8" }); continue; }
          const r = racks[d.r];
          if (r.down > 0 || (r.L > 1 && rnd() < 0.5)) dots.push({ k: "l", x: d.x, y: d.y, vx: rnd() * 50 - 25, vy: -40 - rnd() * 20, t: 0.8 });
        }
      }
      for (const h of hacks) {
        if (h.dead) continue;
        if (stepPath(h, dt)) {
          h.dead = 1;
          if (tut === 2) { F.msg("놓쳤어요! 한 번 더"); setTimeout(() => { if (tut === 2) spawnHack(2, 16); }, 500); continue; }
          const r = racks[h.r]; if (r.on && r.down <= 0) r.L += 0.5;
          F.miss(stageXY(h.x, h.y)); alertMsg("해킹 당했어요! 부하 폭증");
          for (let k = 0; k < 10; k++) sparks.push({ x: h.x, y: h.y, vx: rnd() * 80 - 40, vy: -rnd() * 60, t: 0.5, c: "#ff3a4a" });
        }
      }
      hacks = hacks.filter((h) => !h.dead);
      // 손가락
      if (tut === 1) { guide(dragGuide(0, 1, "꾹 잡고 <b>한가한 서버로!</b>")); }
      else if (tut === 2) { const h = hacks[0]; guide(h ? atL(h.x, h.y - 3, "빨간 점 <b>톡!</b>") : null); }
      else if (tut === 3) { const [x, y] = elXY(cacheB, 6); guide({ x, y, t: "<b>캐시</b> 톡!" }); }
      else if (tut === 4) guide(null);
      else { if (el > 3.2) firstHint = false; guide(taskNow()); }
      setDash(); updBtns();
    } else if (endScene) drawEnd(tm, dt);
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 90 * dt; if (s.t <= 0) sparks.splice(i, 1); }
    if (!over || !endScene) render(tm);
    raf = requestAnimationFrame(loop);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.vibe3 = {
    st: () => ({ tut, p: +p.toFixed(3), el: +el.toFixed(2), over, L: racks.map((r) => (r.on ? +r.L.toFixed(2) : null)), down: racks.map((r) => +r.down.toFixed(1)), hot, served: Math.round(served), lost: Math.round(lost), subs, cost, crashes, moves, hacks: hacks.length, hacksN, hacksOk, bkN, bkOk, drowsy: !!drowsy, coffeeOk, cacheCd: +cacheCd.toFixed(1), boosts }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1) doMove(0, 1);
      else if (tut === 2) { const h = hacks.find((q) => !q.dead); if (h) blockHack(h); }
      else if (tut === 3) useCache();
      else if (tut === 4) startGame();
    },
    auto: () => {
      if (tut >= 0 || over) return;
      if (drowsy) return drink();
      const h = hacks.find((q) => !q.dead); if (h) return blockHack(h);
      const bk = racks.find((r) => r.bk > 0); if (bk) return startBackup(bk);
      if (!racks[3].on && p > 0.28) return addServer();
      if (racks[3].on && boosts < 1 && p > 0.5 && racks.filter(rackUp).every((r) => r.L > 0.6)) return addServer();
      if (cacheCd <= 0 && inRate() > capNow() * 0.95 && racks.filter(rackUp).some((r) => r.L > 0.75)) return useCache();
      const [a, b] = hottest(); if (a >= 0 && b >= 0 && racks[a].L - racks[b].L > 0.28) doMove(a, b);
    },
  };
  updBtns(); updSc(); setDash(); render(0); raf = requestAnimationFrame(loop);
}
