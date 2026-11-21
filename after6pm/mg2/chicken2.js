// 프랜차이즈 치킨 2탄: 치킨은 식기 전에 (도트 캔버스 160x200~250, 동네 지도를 위에서 본 그림)
// 금요일 밤 9시, 축구 하는 날. 주문 핀이 뜨고 치킨이 튀겨지면 가게 앞에 박스가 쌓인다.
// 가게 앞 라이더를 끌어 주문 핀까지 길을 긋는다. 핀 여러 개를 차례로 지나가면 한 번에 묶어 배달(가방 최대 3개).
// 핀마다 식는 시계가 있어 늦으면 별점이 깎이고 식은 치킨 리뷰가 달린다.
// 사건: 라이더 이탈, 배달대행 호출(수수료), 오배송(옆집 회수 → 원래 집), 단체 주문 폭탄.
// 끝나면 배달통 사장님 화면에 평점·매출이 집계되고, 지친 사장님이 셔터를 내린다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uOutline } from "../mg.js";

const W = 160, T = 30, VX = [6, 80, 154], CAP = 3;
const PRICE = 20000, AGFEE = 4000;
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
const RV5 = ["아직 뜨끈뜨끈해요", "비 오는데 엄청 빨리 왔어요", "축구 보면서 먹으니 최고", "라이더님 감사해요 바삭바삭", "하프타임 전에 도착 ㄷㄷ", "튀김옷 살아 있어요"];
const RV4 = ["조금 미지근했지만 맛있어요", "살짝 늦었는데 맛은 좋아요"];
const RV3 = ["식어서 좀 눅눅해요", "전반전 끝나고 왔어요…"];
const RV2 = ["식은 치킨… 축구 다 끝났어요", "차가운 치킨은 좀…"];
const RVX = ["너무 늦어서 취소했어요", "식어서 취소할게요"];
const RVW = "다른 집에 갔다 왔대요ㅠ";
const RIDC = [{ hel: "#ffb03b", jak: "#2a2f3a", box: "#d9a868", bx2: "#e0402a" }, { hel: "#e0402a", jak: "#3a3448", box: "#d9a868", bx2: "#e0402a" }, { hel: "#4f8ad9", jak: "#2c3550", box: "#d9a868", bx2: "#e0402a" }];
const AGC = { hel: "#e8e8e8", jak: "#3e9e6a", box: "#9aa4ae", bx2: "#3e9e6a" };

const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); t = c01(t); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const won = (n) => n.toLocaleString("ko-KR");

function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); });
  if (ol) uOutline(c); return c;
}
// 스쿠터 탄 라이더(위에서 비스듬히 본 그림). v: r 오른쪽, d 아래(앞), u 위(뒤)
function scooter(v, c) {
  if (v === "r") return mkC(15, 14, (P) => {
    P(1, 10, 4, 4, "#1a1a20"); P(2, 11, 2, 2, "#6a6a74"); P(10, 10, 4, 4, "#1a1a20"); P(11, 11, 2, 2, "#6a6a74");
    P(3, 9, 9, 2, "#c8ced6"); P(3, 9, 9, 1, "#f0f4f8"); P(10, 5, 3, 5, "#c0302a"); P(10, 5, 3, 1, "#e85a4a"); P(11, 3, 1, 3, "#2a2a30"); P(10, 3, 3, 1, "#2a2a30"); P(13, 6, 1, 2, "#fff6b0");
    P(0, 3, 5, 6, c.box); P(0, 3, 5, 1, mix(c.box, "#ffffff", 0.35)); P(0, 5, 5, 1, c.bx2); P(4, 4, 1, 5, mix(c.box, "#000000", 0.25));
    P(5, 4, 4, 5, c.jak); P(6, 5, 4, 1, mix(c.jak, "#ffffff", 0.15)); P(8, 6, 3, 1, c.jak); P(10, 6, 1, 1, "#f0c8a8"); P(6, 8, 4, 2, "#2a2f3a");
    P(5, 0, 5, 4, c.hel); P(5, 0, 5, 1, mix(c.hel, "#ffffff", 0.4)); P(8, 1, 2, 2, "#2a2a40"); P(9, 1, 1, 1, "#8ab0d8");
  });
  if (v === "d") return mkC(11, 15, (P) => {
    P(1, 0, 9, 4, c.box); P(1, 0, 9, 1, mix(c.box, "#ffffff", 0.35)); P(1, 2, 9, 1, c.bx2);
    P(3, 2, 5, 4, c.hel); P(3, 2, 5, 1, mix(c.hel, "#ffffff", 0.4)); P(3, 4, 5, 2, "#2a2a40"); P(4, 4, 2, 1, "#8ab0d8");
    P(2, 6, 7, 4, c.jak); P(3, 7, 5, 1, mix(c.jak, "#ffffff", 0.15)); P(0, 8, 2, 1, "#2a2a30"); P(9, 8, 2, 1, "#2a2a30"); P(0, 9, 1, 1, "#f0c8a8"); P(10, 9, 1, 1, "#f0c8a8");
    P(2, 10, 7, 2, "#c0302a"); P(2, 10, 7, 1, "#e85a4a"); P(4, 10, 3, 1, "#fff6b0"); P(4, 12, 3, 3, "#1a1a20"); P(5, 13, 1, 1, "#6a6a74");
  });
  return mkC(11, 15, (P) => {
    P(3, 0, 5, 3, c.hel); P(3, 0, 5, 1, mix(c.hel, "#ffffff", 0.4)); P(0, 4, 2, 1, "#2a2a30"); P(9, 4, 2, 1, "#2a2a30");
    P(2, 3, 7, 3, c.jak); P(1, 5, 9, 6, c.box); P(1, 5, 9, 1, mix(c.box, "#ffffff", 0.35)); P(1, 7, 9, 2, c.bx2); P(4, 7, 3, 2, "#ffe08a"); P(9, 6, 1, 5, mix(c.box, "#000000", 0.25));
    P(3, 11, 5, 1, "#c8ced6"); P(4, 11, 3, 1, "#ff3030"); P(4, 12, 3, 3, "#1a1a20"); P(5, 13, 1, 1, "#6a6a74");
  });
}
function flipC(c) { const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
function riderSet(c) { const r = scooter("r", c); return { r, l: flipC(r), d: scooter("d", c), u: scooter("u", c) }; }
// 치킨 박스 7x5
const BOXI = (P, x, y) => { P(x, y, 7, 5, "#d9a868"); P(x, y, 7, 1, "#f0c88a"); P(x, y + 2, 7, 1, "#e0402a"); P(x + 6, y + 1, 1, 4, "#a8763e"); P(x + 3, y + 2, 1, 1, "#ffe08a"); };
const dig = (P, n, x, y, col) => { const s = DIG[n] || DIG[0]; for (let i = 0; i < 15; i++) if (s[i] === "1") P(x + (i % 3), y + Math.floor(i / 3), 1, 1, col); };
// 도트 손가락
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
// 주문 핀(방법 화면 그림에서도 쓴다). st: c 튀기는 중, r 준비, cold 식음
function pinDraw(P, cx, ty, o) {
  const w = o.w || 11, x = cx - (w >> 1), y = ty - 11;
  const body = o.st === "lost" ? "#ff5a4a" : o.cold ? mix("#fffdf6", "#9fd0ff", o.cold) : "#fffdf6";
  const edge = o.sel ? "#ffe066" : o.urgent ? "#ff3b3b" : "#1a1a22";
  P(x - 1, y - 1, w + 2, 11, edge); P(x, y, w, 9, body); P(cx - 1, ty - 2, 3, 1, edge); P(cx, ty - 1, 1, 1, edge); P(cx - 1, ty - 3, 3, 1, body);
  if (o.st === "c") { P(cx - 3, y + 3, 6, 2, "#3a3a44"); P(cx + 3, y + 3, 2, 1, "#3a3a44"); P(cx - 2, y + 2, 4, 1, o.blink ? "#ffd27a" : "#f0b040"); P(cx - 3, y + 6, 7, 1, "#e8e4d4"); P(cx - 3, y + 6, Math.round(7 * c01(o.prog || 0)), 1, "#ffb03b"); return; }
  if (o.st === "lost") { P(cx, y + 1, 1, 5, "#ffffff"); P(cx, y + 7, 1, 1, "#ffffff"); return; }
  if (o.st === "pick") { BOXI(P, cx - 4, y + 3); P(cx + 2, y, 3, 1, "#2f6fd0"); P(cx + 4, y + 1, 1, 1, "#2f6fd0"); P(cx + 3, y + 2, 1, 1, "#2f6fd0"); P(cx + 3, y + 4, 1, 1, "#2f6fd0"); return; }
  if (o.n > 1) { for (let k = 0; k < Math.min(3, o.n); k++) BOXI(P, x + 1 + k * 5, y + 1 + (k % 2)); }
  else BOXI(P, cx - 3, y + 1);
  if (o.warm != null) { P(x + 1, y + 7, w - 2, 1, "#d8d4c4"); P(x + 1, y + 7, Math.max(1, Math.round((w - 2) * o.warm)), 1, o.warm > 0.6 ? "#ff8a2a" : o.warm > 0.35 ? "#ffd23f" : "#4fa8ff"); }
}

export const GAME = {
  key: "chicken2", base: "chicken", jc: "#ffb03b", n: "치킨은 식기 전에", desc: "축구 하는 밤, 식기 전에 라이더를 보내요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 치킨이 튀겨지면 가게 앞에 박스가 쌓여요. <b>라이더를 끌어</b> 주문 핀까지 길을 그어요.",
    "가까운 주문은 핀 <b>여러 개를 차례로 지나가게</b> 끌면 한 번에 묶어 보내요(가방 최대 3개). 핀 아래 막대는 <b>식는 시계</b>, 파랗게 식으면 별점이 깎여요.",
    "라이더가 그만두면 <b>배달대행</b>을 톡(수수료가 나가요). <b>오배송</b>은 ? 핀에서 회수 → ! 핀으로, <b>단체 주문</b>은 박스를 한 번에 실어요.",
  ],
  steps: () => {
    try {
      const im = (c, h) => `<img src="${c.toDataURL()}" alt="" style="height:${h}px;width:auto">`;
      const mk = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); fn(g, (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return c; };
      const road = (P, w, h) => { P(0, 0, w, h, "#3a3f4a"); P(0, h - 12, w, 8, "#262a33"); for (let x = 1; x < w; x += 6) P(x, h - 8, 3, 1, "#8a7a3a"); };
      const s1 = mk(44, 34, (g, P) => { road(P, 44, 34); const R = riderSet(RIDC[0]); g.drawImage(R.r, 0, 14); for (let x = 16; x < 33; x += 3) P(x, 24, 2, 1, "#ffe066"); pinDraw(P, 37, 22, { st: "r", warm: 0.9 }); P(36, 2, 1, 2, "#ffffffa0"); P(38, 1, 1, 2, "#ffffffa0"); });
      const s2 = mk(44, 34, (g, P) => { road(P, 44, 34); pinDraw(P, 14, 22, { st: "r", sel: 1, warm: 0.8 }); pinDraw(P, 32, 22, { st: "r", sel: 1, warm: 0.7 }); for (const [cx, n] of [[14, 1], [32, 2]]) { P(cx + 3, 7, 5, 7, "#2a1e2e"); dig(P, n, cx + 4, 8, "#ffe066"); } for (let x = 2; x < 42; x += 3) P(x, 26, 2, 1, "#ffe066"); });
      const s3 = mk(44, 34, (g, P) => { road(P, 44, 34); pinDraw(P, 12, 22, { st: "r", warm: 0.15, cold: 0.8 }); P(20, 8, 1, 1, "#9fd0ff"); P(21, 10, 1, 2, "#9fd0ff"); g.fillStyle = "#ffd23f"; for (let k = 0; k < 3; k++) { const x = 24 + k * 6; g.fillRect(x + 2, 4, 1, 5); g.fillRect(x, 6, 5, 1); g.fillRect(x + 1, 5, 3, 3); } g.fillStyle = "#6a6a74"; for (let k = 3; k < 5; k++) { const x = 24 + (k - 3) * 6; g.fillRect(x + 2, 12, 1, 5); g.fillRect(x, 14, 5, 1); g.fillRect(x + 1, 13, 3, 3); } });
      return [[im(s1, 46), "라이더를 끌어 핀으로"], [im(s2, 46), "가까우면 묶어서"], [im(s3, 46), "식으면 별점 ↓"]];
    } catch (e) { return [["", "라이더를 끌어 핀으로"], ["", "가까우면 묶어서"], ["", "식으면 별점 ↓"]]; }
  },
  css: `
.mg-c2st{background:#0e1018!important;display:flex;align-items:center;justify-content:center}
.mg-c2w{position:relative;flex:0 0 auto}
.mg-c2w>canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:pointer}
.mg-chicken2 .mg-steps img{image-rendering:pixelated}
.mg-chicken2 .mg-logo b{font-size:26px}
.mg-c2w .c2hud{position:absolute;left:4px;top:3px;z-index:6;display:flex;gap:3px;pointer-events:none;font:800 10px/1 ui-monospace,monospace}
.mg-c2w .c2hud span{background:#0d1020d8;color:#e8ecff;padding:3px 5px;border-radius:4px;letter-spacing:.2px}
.mg-c2w .c2hud span.fb{background:#1f6a3ad8;color:#e8ffe8}
.mg-c2w .c2hud span.fb.on{animation:c2goal .25s steps(2) 6}
@keyframes c2goal{50%{background:#ffe066;color:#3a2400}}
.mg-c2w .c2lb b{position:absolute;display:block;text-align:center;font-weight:900;white-space:nowrap;overflow:hidden;pointer-events:none}
.mg-c2w .c2lb b.br{color:#ffcf5a;font-size:11px;letter-spacing:1px;text-shadow:0 1px 0 #6a3a0a,0 0 5px #ff9a3b}
.mg-c2w .c2lb b.br.off{color:#6a5a40;text-shadow:none}
.mg-c2w .c2ag{position:absolute;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:linear-gradient(#4fc07a,#2f8a52)!important;color:#fff!important;border:0!important;border-radius:8px!important;box-shadow:0 2px 0 #1a5030,0 0 0 2px #0d2a18!important;font-weight:900;font-size:11.5px;line-height:1.1;padding:0!important;min-height:0!important;touch-action:manipulation}
.mg-c2w .c2ag small{font-size:9.5px;font-weight:700;color:#e0ffe8}
.mg-c2w .c2ag.hot{animation:c2pulse .45s infinite alternate}
.mg-c2w .c2ag.dis{filter:grayscale(.8) brightness(.7)}
.mg-c2w .c2ag:active{transform:translateY(2px)}
.mg-c2w .c2cnt{position:absolute;z-index:6;pointer-events:none;color:#ffe9b0;font:800 10px/1.2 ui-monospace,monospace;text-align:right;text-shadow:0 1px 0 #000}
.mg-c2w .c2go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-c2w .c2go.on{display:block}
.mg-c2w .c2go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-c2w .c2go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffb03b}
.mg-c2w .c2go span b{color:#d8402a}
.mg-c2w .c2go.dn i{top:-37px;animation:c2tapd .7s infinite}
.mg-c2w .c2go.dn span{bottom:44px}
.mg-c2w .c2go.up i{top:2px;animation:c2tapu .7s infinite}
.mg-c2w .c2go.up span{top:46px}
.mg-c2w .c2go.dr i{animation:c2dr 1.4s ease-in-out infinite}
@keyframes c2tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c2tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c2dr{0%{transform:translate(0,0)}15%{transform:translate(0,0) scale(.9)}75%,100%{transform:translate(var(--dx),var(--dy)) scale(.9)}}
@keyframes c2pulse{to{transform:scale(1.07);filter:brightness(1.15)}}
.mg-c2w .c2tut{position:absolute;left:8px;right:8px;top:6px;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-c2w .c2tut.mid{top:30%}
.mg-c2w .c2tut.off{opacity:0;visibility:hidden}
.mg-c2w .c2tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #ffb03b;max-width:292px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-c2w .c2tut.pop .c2tc{animation:c2pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-c2w .c2tc em{font-style:normal;display:inline-block;background:#d8701a;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-c2w .c2tc p{margin:0}.mg-c2w .c2tc b{color:#c0601a}.mg-c2w .c2tc b.rd{color:#c0392b}.mg-c2w .c2tc b.bl{color:#1f6aa8}.mg-c2w .c2tc b.gr{color:#2f8a52}
.mg-c2w .c2tb{margin-top:6px;display:flex;justify-content:center}
.mg-c2w .c2skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-c2w .c2go2{background:linear-gradient(#ffb03b,#d8701a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4410!important;animation:c2pulse .5s infinite alternate}
@keyframes c2pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-c2w .c2dim{position:absolute;inset:0;background:#0000;transition:background .5s;pointer-events:none;z-index:7}
.mg-c2w .c2dim.on{background:#000b}
.mg-c2w .c2end{position:absolute;left:50%;top:50%;z-index:8;width:min(84%,240px);transform:translate(-50%,-50%);pointer-events:none;animation:c2phin .5s cubic-bezier(.3,1.4,.5,1);transition:transform .5s,opacity .5s}
.mg-c2w .c2end.out{transform:translate(-50%,40%) scale(.85);opacity:0}
@keyframes c2phin{0%{transform:translate(-50%,10%) scale(.7);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
.mg-c2w .c2ph{background:#1c1c22;border-radius:22px;padding:10px 7px 12px;box-shadow:0 0 0 2px #3a3a44,0 10px 24px #000a}
.mg-c2w .c2ph .nt0{width:46px;height:5px;background:#000;border-radius:3px;margin:0 auto 7px}
.mg-c2w .c2scr{background:linear-gradient(#ffcf5a,#ff9a3b);border-radius:14px;padding:8px 7px 7px;overflow:hidden}
.mg-c2w .c2hd{display:flex;align-items:center;gap:6px;color:#4a2400;font-weight:900;font-size:12px;margin-bottom:6px}
.mg-c2w .c2hd img{width:26px;height:26px;image-rendering:pixelated;border-radius:6px}
.mg-c2w .c2hd p{margin:0;line-height:1.2}.mg-c2w .c2hd small{display:block;font-weight:700;font-size:10px;color:#7a4410}
.mg-c2w .c2big{background:#fffdf6;border-radius:10px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 0 #0003;margin-bottom:5px}
.mg-c2w .c2big b{font-size:24px;color:#e07a10;letter-spacing:-.5px}
.mg-c2w .c2big small{font-size:10px;color:#8a6a40;font-weight:800;display:block}
.mg-c2w .c2big .st{font-size:13px;color:#ffb000;letter-spacing:1px;text-align:right}
.mg-c2w .c2rows{background:#fffdf6e8;border-radius:10px;padding:4px 8px;margin-bottom:5px;font-size:11px;color:#3a2a1a}
.mg-c2w .c2rows p{margin:2px 0;display:flex;justify-content:space-between;font-weight:700}
.mg-c2w .c2rows p b{font-weight:900}
.mg-c2w .c2rows p.tot b{color:#c0601a;font-size:13px}
.mg-c2w .c2rows p.neg b{color:#c0392b}
.mg-c2w .c2ls{display:flex;flex-direction:column;gap:4px;min-height:84px}
.mg-c2w .c2nt{display:flex;gap:6px;align-items:center;background:#fffdf6f2;border-radius:9px;padding:4px 7px;box-shadow:0 2px 0 #0003;animation:c2ntin .35s cubic-bezier(.3,1.5,.5,1)}
.mg-c2w .c2nt p{margin:0;font-size:10.5px;line-height:1.3;color:#3a2a1a;min-width:0}
.mg-c2w .c2nt p b{display:block;font-size:9.5px;color:#d8701a;letter-spacing:.5px}
.mg-c2w .c2nt.bad p b{color:#4f8ad9}
.mg-c2w .c2nt p span{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@keyframes c2ntin{0%{transform:translateY(-14px) scale(.9);opacity:0}100%{transform:none;opacity:1}}
.mg-c2w .c2fin{position:absolute;inset:0;z-index:8;opacity:0;transition:opacity .6s;pointer-events:none}
.mg-c2w .c2fin.on{opacity:1}
.mg-c2w .c2fin canvas{width:100%;height:100%;display:block;image-rendering:pixelated}
.mg-c2w .c2fin canvas.fg{position:absolute;inset:0;z-index:2;pointer-events:none}
.mg-c2w .c2fin .c2me{z-index:1}.mg-c2w .c2fin .c2say{z-index:3}
.mg-c2w .c2me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;filter:drop-shadow(0 0 6px #0008)}
.mg-c2w .c2say{position:absolute;left:50%;transform:translateX(-50%);background:#fff;color:#2a1e2e;font-weight:900;font-size:12.5px;padding:5px 11px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 0 #0007;opacity:0;transition:opacity .4s}
.mg-c2w .c2say.on{opacity:1}
.mg-c2w .c2sign{position:absolute;text-align:center;font-weight:900;color:#ffcf5a;text-shadow:0 0 6px #ff9a3b,0 2px 0 #6a3a0a;letter-spacing:2px;transition:color .3s,text-shadow .3s}
.mg-c2w .c2sign.off{color:#5a4a36;text-shadow:none}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "chicken2", "치킨은 식기 전에", "mg-c2st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-c2w"><canvas></canvas><div class="mg-bubs"></div><div class="c2hud"><span class="ck">금 21:00</span><span>비</span><span class="fb">축구 0:0</span></div><div class="c2lb"><b class="br">황금닭</b></div><button class="c2ag" data-ag>배달대행 부르기<small>수수료 ${won(AGFEE)}원</small></button><div class="c2cnt"></div><div class="c2go"><span></span><i></i></div><div class="c2tut off"><div class="c2tc"><em>리허설</em><p></p><div class="c2tb"></div></div></div><div class="c2dim"></div></div>`);
  const wrap = F.stage.querySelector(".mg-c2w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), bubs = wrap.querySelector(".mg-bubs");
  const ckEl = wrap.querySelector(".c2hud .ck"), fbEl = wrap.querySelector(".c2hud .fb"), signEl = wrap.querySelector(".c2lb .br"), agBtn = wrap.querySelector(".c2ag"), cntEl = wrap.querySelector(".c2cnt");
  const goEl = wrap.querySelector(".c2go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".c2tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".c2tb"), dim = wrap.querySelector(".c2dim");
  let K = 2, H = 220, R = [30, 77, 123, 190];
  const fit = () => {
    const sw = F.stage.clientWidth || 336, sh = F.stage.clientHeight || 600, r = Math.min(sw / W, sh / 200);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 250);
    const r3 = H - 30, sp = (r3 - 30) / 3; R = [30, Math.round(30 + sp), Math.round(30 + sp * 2), r3];
    cv.width = W; cv.height = H; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  // ── 동네 배치: 집 문(배달지)은 모두 가로 도로 위 ──
  const DEST = [
    { x: 28, r: 0, n: "101동" }, { x: 60, r: 0, n: "102동" }, { x: 101, r: 0, n: "오피스텔" }, { x: 133, r: 0, n: "언덕 빌라" },
    { x: 26, r: 1, n: "빨간 지붕 집" }, { x: 58, r: 1, n: "다세대" },
    { x: 28, r: 2, n: "201동" }, { x: 60, r: 2, n: "호프집" }, { x: 101, r: 2, n: "202동" }, { x: 134, r: 2, n: "모퉁이 집" },
    { x: 26, r: 3, n: "골목 집" }, { x: 58, r: 3, n: "파란 빌라" },
  ];
  const FIELD = { x: 117, r: 1, n: "운동장" };
  const SPOT = [102, 116, 130], AGSPOT = [144, 90];
  const ptOf = (d) => ({ x: d.x, y: R[d.r] });
  const tvWins = [], aptWins = [];
  let BG = null, SHOP = null;

  // ── 배경(정적) ──
  function bgCanvas() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const q = c.getContext("2d");
    const Q = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
    let sd = 11; const sr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    tvWins.length = 0; aptWins.length = 0;
    Q(0, 0, W, H, "#1c2230");
    // 블록 바닥(풀·흙)
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (sr() < 0.08) Q(x, y, 1, 1, "#232a3a");
    // 길: 가로·세로
    const road = (x, y, w, h) => { Q(x, y, w, h, "#262a33"); for (let k = 0; k < w * h / 18; k++) Q(x + Math.floor(sr() * w), y + Math.floor(sr() * h), 1, 1, sr() < 0.5 ? "#2c303a" : "#22262e"); };
    for (const vx of VX) road(vx - 4, 0, 8, R[3] + 4);
    for (const ry of R) road(0, ry - 4, W, 8);
    // 보도(길 양옆)
    for (const ry of R) { Q(0, ry - 6, W, 2, "#4a4f5c"); Q(0, ry + 4, W, 2, "#3e434f"); for (let x = 0; x < W; x += 5) { Q(x, ry - 6, 1, 2, "#40454f"); Q(x, ry + 4, 1, 2, "#363a44"); } }
    for (const vx of VX) { Q(vx - 6, 0, 2, R[3] + 4, "#4a4f5c"); Q(vx + 4, 0, 2, R[3] + 4, "#3e434f"); }
    for (const vx of VX) for (const ry of R) road(vx - 6, ry - 6, 12, 12);
    // 차선
    for (const ry of R) for (let x = 0; x < W; x += 8) { if (VX.some((v) => Math.abs(x + 2 - v) < 8)) continue; Q(x, ry, 4, 1, "#8a7a3a"); }
    for (const vx of VX) for (let y = 0; y < R[3]; y += 8) { if (R.some((r) => Math.abs(y + 2 - r) < 8)) continue; Q(vx, y, 1, 4, "#8a7a3a"); }
    // 횡단보도
    for (const vx of VX) for (const ry of R) { for (let k = -5; k <= 4; k += 2) { if (ry - 8 > 0) Q(vx + k, ry - 8 + 1, 1, 0, "#000"); } for (let k = -4; k <= 3; k += 2) { Q(vx - 9, ry + k, 3, 1, "#8a8e98"); Q(vx + 6, ry + k, 3, 1, "#8a8e98"); } }
    // 맨홀
    for (const [x, y] of [[40, R[1] + 1], [120, R[2] - 1], [70, R[0]], [30, R[3] + 1]]) { Q(x - 1, y - 1, 3, 3, "#3a3f4a"); Q(x, y, 1, 1, "#1a1e26"); }

    // 건물: 위(지붕) + 앞면(창문), 앞면 밑이 보도 → 문은 가로 도로 위
    const win = (x, y, k) => { const r0 = sr(); if (k === "apt" && r0 < 0.18) { tvWins.push([x, y]); Q(x, y, 2, 2, "#5a7ab8"); } else Q(x, y, 2, 2, r0 < 0.62 ? (r0 < 0.4 ? "#ffd27a" : "#ffe9a8") : "#2a3040"); if (k === "apt") aptWins.push([x, y]); };
    const door = (x, by, lit = true) => { Q(x - 2, by - 5, 5, 5, "#2a2026"); Q(x - 2, by - 5, 5, 1, "#4a3a3a"); Q(x - 1, by - 4, 3, 4, "#1a1418"); if (lit) Q(x - 1, by - 7, 3, 1, "#ffe9a8"); };
    const apt = (x0, x1, top, bot, face) => {
      const w = x1 - x0; Q(x0, top, w, 4, "#7a808c"); Q(x0, top, w, 1, "#9aa0ac"); Q(x0 + 3, top + 1, 6, 2, "#5a606c"); Q(x0 + 4, top, 4, 1, "#8a909c");
      Q(x0, top + 4, w, bot - top - 4, face); Q(x1 - 1, top + 4, 1, bot - top - 4, mix(face, "#000000", 0.3)); Q(x0, top + 4, w, 1, mix(face, "#000000", 0.25));
      for (let y = top + 6; y < bot - 6; y += 4) for (let x = x0 + 2; x < x1 - 2; x += 4) win(x, y, "apt");
      Q(x0, bot - 1, w, 1, mix(face, "#000000", 0.4));
    };
    const villa = (x0, x1, top, bot, roof) => {
      const w = x1 - x0, rh = Math.max(5, Math.round((bot - top) * 0.45));
      Q(x0, top, w, rh, roof); for (let y = top + 1; y < top + rh; y += 2) Q(x0, y, w, 1, mix(roof, "#000000", 0.18)); Q(x0, top, w, 1, mix(roof, "#ffffff", 0.25)); Q(x0, top + rh - 1, w, 1, mix(roof, "#000000", 0.35));
      Q(x0 + 1, top + rh, w - 2, bot - top - rh, "#d8d0c0"); Q(x1 - 2, top + rh, 1, bot - top - rh, "#a8a090");
      for (let y = top + rh + 2; y < bot - 5; y += 4) for (let x = x0 + 3; x < x1 - 3; x += 5) win(x, y, "v");
    };
    const house = (x0, x1, top, bot, roof) => {
      const w = x1 - x0, fh = Math.min(10, bot - top - 4), rt = top, rb = bot - fh;
      for (let y = rt; y < rb; y++) { const k = (y - rt) / Math.max(1, rb - rt); Q(x0 + Math.round((1 - k) * 3), y, w - Math.round((1 - k) * 6), 1, (y - rt) % 2 ? roof : mix(roof, "#000000", 0.15)); }
      Q(x0 + 3, rt, w - 6, 1, mix(roof, "#ffffff", 0.3)); Q(x0 + 1, rb, w - 2, fh, "#e6dcc8"); Q(x1 - 2, rb, 1, fh, "#b0a690");
      win(x0 + 4, rb + 2, "h"); win(x1 - 8, rb + 2, "h"); Q(x0 + w / 2 - 6, top + 2, 2, 3, "#5a4a44");
      // 마당 나무
      Q(x0 - 1, bot - 4, 3, 3, "#2f6a3a"); Q(x0, bot - 5, 2, 1, "#3e8a4a");
    };
    const offi = (x0, x1, top, bot) => {
      const w = x1 - x0; Q(x0, top, w, 3, "#5a6070"); Q(x0, top, w, 1, "#7a8090");
      Q(x0, top + 3, w, bot - top - 3, "#34506e"); for (let y = top + 4; y < bot - 5; y += 3) { Q(x0 + 1, y, w - 2, 1, "#2a4058"); for (let x = x0 + 2; x < x1 - 2; x += 3) { const r0 = sr(); Q(x, y + 1, 2, 1, r0 < 0.45 ? "#9fd0ff" : r0 < 0.6 ? "#ffe9a8" : "#22344a"); } }
      Q(x1 - 1, top + 3, 1, bot - top - 3, "#22344a");
    };
    const hof = (x0, x1, top, bot) => {
      const w = x1 - x0, rh = Math.max(4, Math.round((bot - top) * 0.4));
      Q(x0, top, w, rh, "#4a3a34"); Q(x0, top, w, 1, "#6a5a50"); for (let x = x0 + 2; x < x1 - 2; x += 6) Q(x, top + 2, 3, 2, "#3a2e2a");
      Q(x0, top + rh, w, bot - top - rh, "#5a3a26"); Q(x0, top + rh, w, 4, "#c0302a"); for (let x = x0 + 2; x < x1 - 2; x += 4) Q(x, top + rh + 1, 2, 2, "#ffe066");
      const wy = top + rh + 6, wh = Math.max(4, bot - wy - 3);
      Q(x0 + 2, wy, w - 6, wh, "#ffcf6a"); Q(x0 + 2, wy, w - 6, 1, "#fff2c0"); tvWins.push([x0 + 4, wy + 1, 7, 4]); Q(x0 + 4, wy + 1, 7, 4, "#5a8ad8");
      for (let x = x0 + 13; x < x1 - 6; x += 4) { Q(x, wy + wh - 4, 3, 4, "#6a3a20"); Q(x + 1, wy + wh - 6, 2, 2, "#6a3a20"); }
    };
    const field = (x0, x1, top, bot) => {
      const w = x1 - x0, h = bot - top;
      Q(x0, top, w, h, "#2f6a3a"); for (let x = x0; x < x1; x += 8) Q(x, top, 4, h, "#357a42");
      Q(x0 + 3, top + 3, w - 6, 1, "#d8e8d8"); Q(x0 + 3, bot - 4, w - 6, 1, "#d8e8d8"); Q(x0 + 3, top + 3, 1, h - 6, "#d8e8d8"); Q(x1 - 4, top + 3, 1, h - 6, "#d8e8d8"); Q(x0 + (w >> 1), top + 3, 1, h - 6, "#d8e8d8");
      const cx = x0 + (w >> 1), cy = top + (h >> 1); for (let a = 0; a < 24; a++) Q(cx + Math.round(Math.cos(a / 24 * 6.283) * 5), cy + Math.round(Math.sin(a / 24 * 6.283) * 4), 1, 1, "#d8e8d8");
      Q(x0 + 3, cy - 4, 4, 8, "#d8e8d8"); Q(x0 + 4, cy - 3, 3, 6, "#2f6a3a"); Q(x1 - 7, cy - 4, 4, 8, "#d8e8d8"); Q(x1 - 7, cy - 3, 3, 6, "#357a42");
      for (let x = x0; x < x1; x += 2) { Q(x, top, 1, 1, "#8a929c"); Q(x, bot - 1, 1, 1, "#8a929c"); }
      Q(FIELD.x - 4, bot - 1, 9, 1, "#2f6a3a");
      for (const [lx, ly] of [[x0 + 1, top + 1], [x1 - 2, top + 1], [x0 + 1, bot - 3], [x1 - 2, bot - 3]]) { const gr = q.createRadialGradient(lx, ly, 0, lx, ly, 18); gr.addColorStop(0, "rgba(240,255,220,.35)"); gr.addColorStop(1, "rgba(240,255,220,0)"); q.fillStyle = gr; q.fillRect(lx - 18, ly - 18, 36, 36); Q(lx, ly, 2, 2, "#ffffff"); }
    };
    const T0 = 0, B0 = R[0] - 6, T1 = R[0] + 6, B1 = R[1] - 6, T2 = R[1] + 6, B2 = R[2] - 6, T3 = R[2] + 6, B3 = R[3] - 6;
    apt(12, 44, T0 + 1, B0, "#c8c0b0"); apt(46, 74, T0 + 3, B0, "#b8c0c8"); offi(86, 116, T0 + 2, B0); villa(118, 148, T0 + 4, B0, "#3e7a8a");
    villa(12, 40, T1 + 1, B1, "#a83a2a"); villa(42, 74, T1 + 2, B1, "#6a5a8a"); field(86, 148, T1, B1);
    apt(12, 44, T2 + 1, B2, "#d0c4a8"); hof(46, 74, T2 + 2, B2); apt(86, 116, T2 + 1, B2, "#c0c8b8"); house(118, 148, T2 + 2, B2, "#8a4a2a");
    house(12, 40, T3 + 1, B3, "#4a6a8a"); villa(42, 74, T3 + 2, B3, "#3a5a9a");
    for (const d of DEST) door(d.x, R[d.r] - 6, true);
    // 가게(황금닭): 지붕·간판·차양·창문
    { const x0 = 88, x1 = 148, top = T3 + 1, bot = B3, w = x1 - x0, fh = Math.min(17, bot - top - 6);
      const fy = bot - fh;
      Q(x0, top, w, fy - top, "#5a3a26"); for (let y = top + 1; y < fy; y += 2) Q(x0, y, w, 1, "#4e3220"); Q(x0, top, w, 1, "#7a5238");
      Q(x0 + 6, top + 2, 4, 4, "#3a2a20"); Q(x0 + 7, top + 2, 2, 1, "#6a5a50");
      Q(x0 + 10, fy - 9, w - 20, 8, "#2a1608"); Q(x0 + 11, fy - 8, w - 22, 6, "#3a2010"); Q(x0 + 10, fy - 9, w - 20, 1, "#ffb03b");
      Q(x0, fy, w, fh, "#e8d8b8"); Q(x1 - 1, fy, 1, fh, "#b8a888");
      for (let x = x0; x < x1; x += 4) { Q(x, fy, 2, 4, "#ff9a2a"); Q(x + 2, fy, 2, 4, "#fff2d8"); } Q(x0, fy + 4, w, 1, "#a85a10");
      Q(x0 + 3, fy + 6, 20, fh - 8, "#ffcf6a"); Q(x0 + 3, fy + 6, 20, 1, "#fff2c0"); Q(x0 + 6, fy + fh - 6, 8, 4, "#9aa0a8"); Q(x0 + 7, fy + fh - 7, 6, 1, "#d8a040"); Q(x0 + 16, fy + 8, 3, 5, "#6a3a20"); Q(x0 + 16, fy + 7, 3, 2, "#f0c8a8");
      Q(x1 - 23, fy + 6, 20, fh - 8, "#ffcf6a"); Q(x1 - 23, fy + 6, 20, 1, "#fff2c0"); for (let k = 0; k < 4; k++) BOXI(Q, x1 - 21 + (k % 2) * 8, fy + fh - 7 - Math.floor(k / 2) * 5);
      Q(x0 + 27, fy + 6, 6, fh - 6, "#3a2010"); Q(x0 + 28, fy + 7, 4, fh - 7, "#ffd27a"); Q(x0 + 27, bot - 1, 6, 1, "#5a3a20");
      SHOP = { x0, x1, top, bot, fy, door: x0 + 30, chim: [x0 + 8, top + 2] };
      const gr = q.createRadialGradient(x0 + 30, R[3] - 2, 0, x0 + 30, R[3] - 2, 34); gr.addColorStop(0, "rgba(255,190,90,.28)"); gr.addColorStop(1, "rgba(255,190,90,0)"); q.fillStyle = gr; q.fillRect(x0 - 10, R[3] - 30, w + 20, 40);
    }
    // 가로등(보도) + 젖은 길 반사
    for (const [x, ri] of [[46, 0], [114, 0], [20, 1], [70, 2], [140, 2], [44, 3], [140, 1]]) {
      const y = R[ri] - 6; Q(x, y - 1, 1, 2, "#6a707c"); Q(x - 1, y - 2, 3, 1, "#ffe9a8");
      const gr = q.createRadialGradient(x, y + 3, 0, x, y + 3, 14); gr.addColorStop(0, "rgba(255,225,150,.32)"); gr.addColorStop(1, "rgba(255,225,150,0)"); q.fillStyle = gr; q.fillRect(x - 14, y - 11, 28, 28);
      for (let k = 0; k < 6; k++) Q(x + (k % 2), y + 4 + k, 1, 1, `rgba(255,230,160,${0.3 - k * 0.04})`);
    }
    // 아래 띠: 보도·화단·주차된 차
    const yb = R[3] + 6; Q(0, yb, W, H - yb, "#2a2f38");
    for (let x = 0; x < W; x += 6) Q(x, yb, 1, H - yb, "#262a32");
    for (let x = 64; x < W; x += 9) { Q(x, yb + 2, 7, 5, "#24502e"); Q(x + 1, yb + 2, 5, 2, "#2f6a3a"); Q(x + 2, yb + 2, 2, 1, "#3e8a4a"); }
    return c;
  }
  BG = bgCanvas();
  const RS = RIDC.map(riderSet), AGS = riderSet(AGC);

  // ── 소리 ──
  const S = {
    order: () => { tone(1568, 0.06, "square", 0.04); tone(2093, 0.08, "square", 0.04, 0, 0.08); },
    ready: () => { tone(988, 0.05, "triangle", 0.06); noise(0.06, 1500, 0.05, 0.02, 2); },
    add: (n) => { tone(700 + n * 180, 0.05, "square", 0.05); vib(6); },
    bike: () => { tone(90, 0.45, "sawtooth", 0.05, 80); tone(180, 0.4, "square", 0.02, 140, 0.05); noise(0.25, 900, 0.05, 0.05, 1); },
    bell: () => { tone(1318, 0.12, "triangle", 0.06); tone(1046, 0.16, "triangle", 0.06, 0, 0.12); },
    ring: () => { for (let k = 0; k < 4; k++) tone(1400, 0.05, "square", 0.04, 0, k * 0.1); },
    cheer: () => { noise(0.9, 1200, 0.12, 0, 0.4); for (let k = 0; k < 6; k++) tone(500 + rnd() * 500, 0.12, "triangle", 0.03, 0, k * 0.08); },
    alarm: () => { for (let k = 0; k < 3; k++) { tone(880, 0.09, "square", 0.06, 0, k * 0.2); tone(1175, 0.09, "square", 0.06, 0, k * 0.2 + 0.1); } },
    quit: () => { tone(330, 0.3, "triangle", 0.06, -120); tone(247, 0.4, "triangle", 0.05, -80, 0.25); },
    sizzle: (n) => noise(0.12, 5200 + rnd() * 2000, 0.004 + 0.003 * n, 0, 0.6),
    shutter: (at) => { for (let k = 0; k < 18; k++) { tone(180 + rnd() * 80, 0.03, "square", 0.04, 0, at + k * 0.075); noise(0.03, 1800, 0.06, at + k * 0.075, 2); } tone(90, 0.25, "sine", 0.2, -40, at + 1.4); noise(0.15, 500, 0.15, at + 1.4); },
    count: (n) => tone(1046 * Math.pow(1.05, n), 0.04, "square", 0.03),
  };

  // ── 상태 ──
  const orders = [], picks = [], served = [], riders = [], fx = [], rips = [];
  const drops = []; for (let k = 0; k < 70; k++) drops.push([rnd() * W, rnd() * 260, 0.8 + rnd() * 0.5]);
  let over = false, last = 0, t0 = 0, el = 0, oid = 0, nextI = 0, sales = 0, agUses = 0, trips = 0, stopsN = 0;
  let quitDone = false, pendQuit = false, quitT = -9, wrongDone = false, wrongT = -9, groupT = -9, goalT = -9, goals = 0, sizT = 0;
  let drag = null;
  const SCHED = [0.3, 1.4, 2.8, 4.0, 5.3, 8.4, 9.8, 11.2, 12.6, 13.8, 15.2, 17.6, 19.0, 21.0, 22.2, 23.6];
  const GOALS = [6.6, 16.4], GROUP_AT = 19.6, QUIT_AT = 10.2, WRONG_AT = 12.8;

  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = clamp(x, 26, 134) * K + "px"; b.style.top = (y - 2) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1400); };
  const realS = () => served.filter((o) => !o.cx);
  const avgStar = () => { const s = served; return s.length ? (s.reduce((a, o) => a + o.stars * (o.kind === "g" ? 2 : 1), 0) / s.reduce((a, o) => a + (o.kind === "g" ? 2 : 1), 0)).toFixed(1) : "-"; };
  const updSc = () => (F.sc.textContent = `배달 ${realS().length} · ★${avgStar()}`);
  const mul = (o) => ez * (o.kind === "g" ? 1.3 : 1);
  const ageOf = (o) => (o.readyT == null ? 0 : el - o.readyT);
  const warmOf = (o) => (tut >= 0 ? 1 : c01(1 - ageOf(o) / (23 * mul(o))));
  const calcStars = (o) => { if (tut >= 0) return 5; const a = ageOf(o), m = mul(o); return a <= 9 * m ? 5 : a <= 13 * m ? 4 : a <= 17 * m ? 3 : a <= 21 * m ? 2 : 1; };
  const busy = (d) => orders.some((o) => o.d === d && !["done", "cx"].includes(o.st)) || picks.some((p) => p.d === d && p.st !== "done");
  const boxCount = () => orders.reduce((a, o) => a + (o.kind === "n" ? (o.st === "ready" ? 1 : 0) : o.st !== "done" && o.st !== "cx" ? o.readyN - o.asgN : 0), 0);

  // ── 주문 ──
  const newOrder = (d, ck) => {
    if (!d) { const free = DEST.filter((x) => !busy(x)); if (!free.length) return null; d = pick(free); }
    const o = { id: ++oid, kind: "n", d, st: "cook", ck: 0, ckT: ck != null ? ck : (1.5 + rnd() * 0.9) / Math.sqrt(ez), readyT: null, t0: el, stars: 0 };
    orders.push(o); S.order(); return o;
  };
  const newGroup = () => {
    const o = { id: ++oid, kind: "g", d: FIELD, st: "cook", ck: 0, ckT: 0.8 / Math.sqrt(ez), need: 3, readyN: 0, asgN: 0, dlv: 0, readyT: null, t0: el, stars: 0 };
    orders.push(o); groupT = el; S.alarm(); vib([50, 30, 50]);
    F.msg("단체 주문 폭탄! 축구 동호회 치킨 6마리"); bubble(FIELD.x, R[1] - 22, "6마리요! 박스 3개!", "red");
    return o;
  };
  const deliver = (o, wrong = false) => {
    if (o.st === "done" || o.st === "cx") return;
    o.st = "done"; o.t1 = el; o.stars = calcStars(o); if (wrong) { o.wrong = 1; if (tut < 0) o.stars = Math.min(o.stars, 4); } served.push(o);
    sales += o.kind === "g" ? PRICE * 3 : PRICE;
    const p = ptOf(o.d), [sx, sy] = stageXY(p.x, p.y - 16);
    if (o.stars >= 5) { F.hit([sx, sy], "★5", "#ffd23f"); if (rnd() < 0.5 || o.kind === "g") bubble(p.x, p.y - 14, o.kind === "g" ? "와 치킨 왔다!!" : pick(["뜨끈해요!", "감사합니다~", "빠르다!"])); }
    else { F.float([sx, sy], stars(o.stars), o.stars <= 3 ? "bad" : ""); if (o.stars <= 3) bubble(p.x, p.y - 14, o.stars <= 2 ? "치킨이 차가워요…" : "좀 식었네…", "angry"); }
    for (let k = 0; k < 6; k++) fx.push({ x: p.x, y: p.y - 8, vx: rnd() * 40 - 20, vy: -20 - rnd() * 30, t: 0.5, c: o.stars >= 4 ? "#ffe066" : "#9fd0ff" });
    S.bell(); updSc();
    if (tut === 1.5) setTimeout(() => tut === 1.5 && tutNext(2), 700);
  };
  const cancel = (o) => {
    o.st = "cx"; o.cx = 1; o.stars = 1; served.push(o);
    const p = ptOf(o.d); F.miss(stageXY(p.x, p.y - 14)); bubble(p.x, p.y - 14, "식어서 취소할게요", "angry"); F.msg("식어서 주문이 취소됐어요… ★1"); updSc();
  };
  // 오배송: 옆집에 잘못 놓고 온다 → ? 핀(회수) → ! 핀(원래 집)
  const misdeliver = (o) => {
    const same = DEST.filter((d) => d.r === o.d.r && d !== o.d && !busy(d)).sort((a, b) => Math.abs(a.x - o.d.x) - Math.abs(b.x - o.d.x));
    if (!same.length) return false;
    const nb = same[0], p = { kind: "p", d: nb, o, st: "ready" };
    picks.push(p); o.st = "lost"; o.pick = p; o.wrong = 1; wrongDone = true; wrongT = el;
    bubble(nb.x, R[nb.r] - 14, "어? 우리 거 아닌데?");
    setTimeout(() => { if (over) return; S.ring(); vib([30, 30, 30]); bubble(o.d.x, R[o.d.r] - 14, "치킨 아직 안 왔어요!", "angry"); F.msg("오배송! ? 핀에서 회수 → ! 핀으로"); }, 700);
    return true;
  };

  // ── 라이더 ──
  const mkRider = (i, agency = false) => ({ i, agency, set: agency ? AGS : RS[i], x: agency ? 172 : SPOT[i], y: R[3], dir: agency ? "l" : "r", st: agency ? "arrive" : "idle", path: [], stops: [], si: 0, wait: 0, spot: agency ? AGSPOT[riders.filter((r) => r.agency).length % 2] : SPOT[i], mv: false, load: 0 });
  const spotPt = (r) => ({ x: r.spot, y: R[3] });
  const route = (a, b) => {
    if (Math.abs(a.y - b.y) < 0.5) return [{ x: b.x, y: b.y }];
    let best = VX[0], bd = 1e9; for (const v of VX) { const d = Math.abs(a.x - v) + Math.abs(b.x - v); if (d < bd) { bd = d; best = v; } }
    return [{ x: best, y: a.y }, { x: best, y: b.y }, { x: b.x, y: b.y }];
  };
  const pathLen = (a, b) => { let L = 0, p = a; for (const q of route(a, b)) { L += Math.abs(q.x - p.x) + Math.abs(q.y - p.y); p = q; } return L; };
  const stopPt = (s) => ptOf(s.k === "p" ? s.p.d : s.o.d);
  const loadOf = (rt) => rt.reduce((a, s) => a + (s.k === "n" || s.k === "p" ? 1 : s.k === "g" ? s.take : 0), 0);
  const dispatch = (r, rt) => {
    for (const s of rt) { if (s.k === "n") { s.o.st = "asg"; s.o.asg = r; } else if (s.k === "g") s.o.asgN += s.take; else if (s.k === "p") s.p.st = "asg"; else if (s.k === "l") s.o.st = "lasg"; }
    r.stops = rt; r.si = 0; r.st = "go"; r.load = loadOf(rt); r.path = route(r, stopPt(rt[0])); r.wait = 0.15;
    if (tut < 0) { trips++; stopsN += rt.length; }
    S.bike(); vib(14); F.burst(stageXY(r.x, r.y - 6), "#ffb03b", 8);
    if (rt.length >= 2) F.float(stageXY(r.x, r.y - 16), rt.length + "곳 묶음!");
    if (tut === 1) tutNext(1.5);
    if (tut === 2) setTimeout(() => tut === 2 && tutNext(3), 900);
  };
  const handleStop = (r, s) => {
    const p = stopPt(s);
    if (s.k === "n") {
      if (tut < 0 && !wrongDone && el >= WRONG_AT && misdeliver(s.o)) { r.load--; return; }
      r.load--; deliver(s.o);
    } else if (s.k === "g") {
      r.load -= s.take; s.o.dlv += s.take; F.float(stageXY(p.x, p.y - 18), `박스 ${s.o.dlv}/${s.o.need}`);
      for (let k = 0; k < 8; k++) fx.push({ x: p.x, y: p.y - 8, vx: rnd() * 50 - 25, vy: -25 - rnd() * 30, t: 0.6, c: pick(["#ffe066", "#ffffff", "#7fe08a"]) });
      if (s.o.dlv >= s.o.need) { deliver(s.o); S.cheer(); } else S.bell();
    } else if (s.k === "p") {
      s.p.st = "done"; F.float(stageXY(p.x, p.y - 16), "회수!"); bubble(p.x, p.y - 14, "죄송해요 여기요~"); tone(1200, 0.06, "square", 0.05);
    } else if (s.k === "l") { r.load--; deliver(s.o, true); }
  };
  const doQuit = (r) => {
    quitDone = true; pendQuit = false; quitT = el; r.st = "quit"; r.path = [{ x: -14, y: R[3] }]; r.wait = 1.1;
    bubble(r.x, r.y - 16, "사장님… 저 오늘까지만 할게요", "miss"); S.quit(); vib([40, 60, 40]);
    setTimeout(() => !over && F.msg("라이더 한 명이 그만뒀어요! 모자라면 배달대행 톡"), 600);
  };
  const callAgency = () => {
    if (over || !(tut < 0 || tut === 3)) return;
    if (tut === 3 && riders.some((r) => r.agency)) return;
    if (riders.filter((r) => r.agency).length >= 2) { F.msg("대행 라이더가 이미 오고 있어요"); SFX.tok(); return; }
    const r = mkRider(0, true); riders.push(r);
    if (tut < 0) { agUses++; sales -= AGFEE; F.float(stageXY(26, H - 22), "-" + won(AGFEE) + "원", "bad"); }
    tone(880, 0.06, "square", 0.05); tone(1320, 0.08, "square", 0.05, 0, 0.08); vib(12);
    bubble(150, R[3] - 14, "대행 갑니다~");
    if (tut === 3) setTimeout(() => tut === 3 && tutNext(4), 1500);
  };
  const moveR = (r, dt) => {
    r.mv = false;
    if (r.wait > 0) { r.wait -= dt; return; }
    if (!r.path.length) return arrived(r);
    const p = r.path[0], dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy), mv = 66 * Math.sqrt(ez) * (H / 215) * (r.agency ? 1.08 : 1) * dt;
    if (Math.abs(dx) > Math.abs(dy)) r.dir = dx > 0 ? "r" : "l"; else if (d > 0.01) r.dir = dy > 0 ? "d" : "u";
    if (d <= mv) { r.x = p.x; r.y = p.y; r.path.shift(); } else { r.x += dx / d * mv; r.y += dy / d * mv; }
    r.mv = true;
    if (rnd() < 0.5) fx.push({ x: r.x + (r.dir === "r" ? -6 : r.dir === "l" ? 6 : 0) + rnd() * 2, y: r.y + 2, vx: rnd() * 16 - 8, vy: -8 - rnd() * 10, t: 0.3, c: "#8aa0c0" });
  };
  const arrived = (r) => {
    if (r.st === "go") {
      handleStop(r, r.stops[r.si]); r.si++; r.wait = 0.32;
      if (r.si < r.stops.length) r.path = route(r, stopPt(r.stops[r.si]));
      else { r.st = "back"; r.path = route(r, spotPt(r)); }
    } else if (r.st === "back") {
      if (r.agency) { r.st = "leave"; r.path = [{ x: 174, y: R[3] }]; bubble(r.x, r.y - 16, "수고하세요~"); }
      else if (pendQuit && !quitDone) doQuit(r);
      else { r.st = "idle"; r.dir = "r"; }
    } else if (r.st === "arrive") { r.st = "idle"; r.dir = "l"; }
    else if (r.st === "leave" || r.st === "quit") { const i = riders.indexOf(r); if (i >= 0) riders.splice(i, 1); }
  };

  // ── 핀 목록(끌기 판정용) ──
  const pinList = () => {
    const L = [];
    for (const o of orders) {
      const p = ptOf(o.d), base = { cx: p.x, ty: p.y - 7, o };
      if (o.kind === "n") { if (o.st === "cook") L.push({ ...base, k: "c" }); else if (o.st === "ready") L.push({ ...base, k: "n" }); else if (o.st === "lost") L.push({ ...base, k: "l" }); }
      else if (o.st !== "done" && o.st !== "cx") { if (o.readyN - o.asgN > 0) L.push({ ...base, k: "g" }); else if (o.asgN < o.need) L.push({ ...base, k: "c" }); }
    }
    for (const p of picks) if (p.st === "ready") { const q = ptOf(p.d); L.push({ cx: q.x, ty: q.y - 7, k: "p", p, o: p.o }); }
    return L;
  };
  const inRoute = (rt, pn) => rt.some((s) => s.k === pn.k && (pn.k === "p" ? s.p === pn.p : s.o === pn.o));
  const addStop = (rt, pn, quiet = false) => {
    if (inRoute(rt, pn)) return false;
    const say = (t) => { if (!quiet && drag && drag.said !== t) { drag.said = t; F.msg(t); SFX.tok(); } };
    const load = loadOf(rt);
    if (pn.k === "c") { say("아직 튀기는 중이에요! 박스가 나오면 보내요"); return false; }
    if (pn.k === "n" || pn.k === "p") { if (load + 1 > CAP) { say("가방이 꽉 찼어요 (최대 3개)"); return false; } rt.push(pn.k === "p" ? { k: "p", p: pn.p } : { k: "n", o: pn.o }); return true; }
    if (pn.k === "g") { const take = Math.min(pn.o.readyN - pn.o.asgN, CAP - load); if (take <= 0) { say("가방이 꽉 찼어요 (최대 3개)"); return false; } rt.push({ k: "g", o: pn.o, take }); return true; }
    if (pn.k === "l") { if (!(pn.o.pick.st === "done" || rt.some((s) => s.k === "p" && s.p.o === pn.o))) { say("먼저 ? 핀(옆집)에서 치킨을 회수해요"); return false; } rt.push({ k: "l", o: pn.o }); return true; }
    return false;
  };

  // ── 할 일 손가락 ──
  const FUP = fingerURL(false), FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.m || ""},${o.dx | 0},${o.dy | 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "c2go"; return; }
    const up = o.m === "dr" || o.y < 70;
    goI.style.backgroundImage = `url(${up ? FUP : FDN})`;
    goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px"; goT.innerHTML = o.t; goT.style.transform = o.x < 40 ? "translateX(-20%)" : o.x > 120 ? "translateX(-80%)" : "";
    if (o.m === "dr") { goI.style.setProperty("--dx", o.dx * K + "px"); goI.style.setProperty("--dy", o.dy * K + "px"); }
    goEl.className = "c2go on " + (up ? "up" : "dn") + (o.m === "dr" ? " dr" : "");
  };
  const idleR = () => riders.filter((r) => r.st === "idle");
  const dragHint = (r, pn, t) => ({ x: r.x, y: r.y - 4, t, m: "dr", dx: pn.cx - r.x, dy: pn.ty - 5 - (r.y - 4) });
  const agHint = (t) => ({ x: 28, y: H - 22, t });
  const taskNow = () => {
    const id = idleR(); const L = pinList();
    if (quitDone && el - quitT < 5 && !riders.some((r) => r.agency) && agUses === 0) return agHint("배달대행 <b>톡!</b>");
    if (!id.length) return null;
    const r = id[0];
    const pk = L.find((p) => p.k === "p"); if (pk && el - wrongT < 7) return dragHint(r, pk, "? 핀 <b>회수</b> → ! 핀으로");
    const gp = L.find((p) => p.k === "g"); if (gp && el - groupT < 6) return dragHint(r, gp, "단체 주문! <b>박스 한 번에</b>");
    const rd = L.filter((p) => p.k === "n").sort((a, b) => a.o.readyT - b.o.readyT);
    if (rd.length && el < 7) return dragHint(r, rd[0], "라이더를 <b>끌어</b> 핀까지");
    const ur = rd.find((p) => warmOf(p.o) < 0.4); if (ur) return dragHint(r, ur, "식어요! <b>얼른</b>");
    return null;
  };

  // ── 리허설 ──
  let tut = 0, tutT = 0;
  const SKIP = `<button class="c2skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "mid", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) { tutP.innerHTML = `주문이 들어왔어요! 치킨이 튀겨지면 <b>가게 앞에 박스</b>가 쌓이고 핀에 <b>김</b>이 나요.<br>가게 앞 <b>라이더를 끌어서</b> 주문 핀까지 이어요.`; tutB.innerHTML = SKIP; }
    else if (n === 1.5) { tutP.innerHTML = `출발! 도착하면 손님이 <b>별점</b>을 줘요.`; tutB.innerHTML = SKIP; }
    else if (n === 2) {
      const a = DEST[6], b = DEST[7]; newOrder(a, 0.2); newOrder(b, 0.2);
      tutP.innerHTML = `가까운 주문은 <b>한 번에 묶어서!</b><br>라이더에서 시작해 핀 <b>두 개를 차례로 지나가게</b> 끌어요. (가방 최대 3개)`; tutB.innerHTML = SKIP;
    }
    else if (n === 3) { tutP.innerHTML = `핀 아래 막대는 <b>식는 시계</b>예요. <b class="bl">파랗게 식으면</b> <b class="rd">별점이 깎이고</b> 식은 치킨 리뷰가 달려요.<br>라이더가 모자라면 아래 <b class="gr">배달대행</b>을 톡! (진짜 영업에선 수수료가 나가요)`; tutB.innerHTML = SKIP; tutEl.classList.add("mid"); }
    else if (n === 4) {
      tutEl.classList.add("mid");
      tutP.innerHTML = `금요일 밤 9시, 축구 하는 날이라 <b>주문이 쏟아져요!</b><br>중간에 <b class="rd">라이더 이탈 · 오배송 · 단체 주문</b>이 생겨요.<br>할 일은 <b>손가락</b>이 짚어 줘요.`;
      tutB.innerHTML = `<button class="c2go2" data-go>영업 시작!</button>`;
    }
  };
  const resetAll = () => {
    orders.length = 0; picks.length = 0; served.length = 0; fx.length = 0; riders.length = 0;
    for (let i = 0; i < 3; i++) riders.push(mkRider(i));
    sales = 0; agUses = 0; trips = 0; stopsN = 0; oid = 0; nextI = 0;
    quitDone = false; pendQuit = false; quitT = -9; wrongDone = false; wrongT = -9; groupT = -9; goalT = -9; goals = 0;
    fbEl.textContent = "축구 0:0";
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null); drag = null;
    resetAll(); t0 = 0; el = 0; SFX.go?.();
    timer(T, F.bar, end); updSc();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });
  agBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callAgency(); });

  // ── 입력: 라이더에서 시작해 핀들을 지나가게 끌기 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const canDrag = () => !over && (tut < 0 || tut === 1 || tut === 2);
  const down = (x, y) => {
    if (!canDrag()) return;
    let best = null, bd = 1e9;
    for (const r of riders) { const d = Math.hypot(x - r.x, (y - (r.y - 5)) * 0.8); if (d < 13 && d < bd) { bd = d; best = r; } }
    if (best && best.st !== "idle") { F.msg(best.st === "go" ? "배달 중이에요. 다른 라이더를 끌어요" : "아직 가게로 오는 중이에요"); SFX.tok(); return; }
    if (!best && SHOP && x > SHOP.x0 - 6 && x < SHOP.x1 && y > SHOP.fy - 4 && y < R[3] + 8) { best = idleR().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]; if (!best) { F.msg("쉬는 라이더가 없어요. 배달대행을 불러요"); SFX.tok(); return; } }
    if (!best) { if (pinList().some((p) => Math.hypot(p.cx - x, p.ty - 5 - y) < 10)) { F.msg("가게 앞 라이더를 끌어서 핀까지 이어요"); SFX.tok(); } return; }
    drag = { r: best, rt: [], x, y }; tone(520, 0.04, "square", 0.04); vib(5);
  };
  const scan = (x, y) => {
    if (!drag) return;
    for (const pn of pinList()) if (Math.hypot(pn.cx - x, (pn.ty - 5 - y) * 0.9) < 10 && addStop(drag.rt, pn)) S.add(drag.rt.length);
  };
  const move = (x, y) => {
    if (!drag) return;
    const steps = Math.ceil(Math.hypot(x - drag.x, y - drag.y) / 3);
    for (let k = 1; k <= steps; k++) scan(drag.x + (x - drag.x) * k / steps, drag.y + (y - drag.y) * k / steps);
    drag.x = x; drag.y = y;
  };
  const upE = () => {
    if (!drag) return; const d = drag; drag = null;
    if (over || !d.rt.length) { if (!over && Math.hypot(d.x - d.r.x, d.y - d.r.y) > 14) { F.msg("주문 핀 위를 지나가게 끌어요"); SFX.tok(); } return; }
    if (tut === 2 && d.rt.length < 2) { const L = pinList().filter((p) => p.k === "n"); if (L.length) { F.msg("이번엔 핀 두 개를 한 번에 이어 봐요!"); SFX.tok(); return; } }
    if (d.r.st !== "idle") return;
    dispatch(d.r, d.rt);
  };
  let lastP = null;
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = toL(e); lastP = [x, y]; down(x, y); });
  cv.addEventListener("pointermove", (e) => { if (!lastP) return; const [x, y] = toL(e); move(x, y); lastP = [x, y]; });
  cv.addEventListener("pointerup", (e) => { if (lastP && e.clientX != null) move(...toL(e)); upE(); lastP = null; });
  cv.addEventListener("pointercancel", () => { drag = null; lastP = null; });

  // ── 이름표·버튼 자리 ──
  const placeUI = () => {
    Object.assign(signEl.style, { left: (SHOP.x0 + 10) * K + "px", top: (SHOP.fy - 9) * K + "px", width: (SHOP.x1 - SHOP.x0 - 20) * K + "px", height: 8 * K + "px", lineHeight: 8 * K + "px" });
    const yb = R[3] + 7;
    Object.assign(agBtn.style, { left: 3 * K + "px", top: yb * K + "px", width: 56 * K + "px", height: (H - yb - 2) * K + "px" });
    Object.assign(cntEl.style, { right: 4 * K + "px", top: (yb + 1) * K + "px" });
  };
  placeUI();
  const uiUpd = () => {
    const tm = 21 * 60 + Math.floor((tut < 0 ? el : 0) / T * 120), hh = Math.floor(tm / 60), mm = tm % 60;
    const ct = tut >= 0 ? "금 20:58" : `금 ${hh}:${String(mm).padStart(2, "0")}`; if (ckEl.textContent !== ct) ckEl.textContent = ct;
    const hot = (tut === 3) || (tut < 0 && quitDone && el - quitT < 5 && !riders.some((r) => r.agency));
    const cl = "c2ag" + (hot ? " hot" : "") + (riders.filter((r) => r.agency).length >= 2 || (tut >= 0 && tut !== 3) ? " dis" : "");
    if (agBtn.className !== cl) agBtn.className = cl;
    const nR = riders.filter((r) => !r.agency && r.st !== "quit").length, nA = riders.filter((r) => r.agency).length;
    const tx = `라이더 ${nR}명${nA ? ` + 대행 ${nA}` : ""}<br>대행 ${agUses}회`;
    if (cntEl.innerHTML !== tx) cntEl.innerHTML = tx;
  };

  // ── 그리기 ──
  const dash = (pts, col, off) => {
    let acc = off;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.round(L));
      for (let k = 0; k < n; k++) { if (Math.floor(acc / 3) % 2 === 0) P(Math.round(a.x + (b.x - a.x) * k / n), Math.round(a.y + (b.y - a.y) * k / n), 1, 1, col); acc++; }
    }
  };
  const routePts = (r, rt, from) => { const pts = [{ x: r.x, y: r.y }]; let cur = { x: r.x, y: r.y }; for (let i = from; i < rt.length; i++) { const q = stopPt(rt[i]); for (const w of r.path && i === from && r.st === "go" ? r.path : route(cur, q)) pts.push(w); cur = q; } return pts; };
  const drawPins = (tm) => {
    const sel = drag ? drag.rt : [];
    const items = [];
    for (const o of orders) if (!["done", "cx"].includes(o.st)) items.push({ o, d: o.d });
    for (const p of picks) if (p.st !== "done") items.push({ p, d: p.d });
    items.sort((a, b) => R[a.d.r] - R[b.d.r]);
    for (const it of items) {
      const pt = ptOf(it.d), cx = pt.x, ty = pt.y - 7;
      if (it.p) {
        const asg = it.p.st === "asg"; const si = sel.findIndex((s) => s.k === "p" && s.p === it.p);
        if (asg) g.globalAlpha = 0.45;
        pinDraw(P, cx, ty + (asg ? 0 : Math.round(Math.sin(tm * 6) * 1)), { st: "pick", sel: si >= 0 });
        g.globalAlpha = 1; if (si >= 0) badge(cx, ty, si + 1);
        continue;
      }
      const o = it.o, gp = o.kind === "g";
      if (o.st === "cook" || (gp && o.readyN === 0)) { pinDraw(P, cx, ty, { st: "c", prog: gp ? o.ck / o.ckT : o.ck / o.ckT, blink: Math.floor(tm * 6) % 2, w: gp ? 17 : 11 }); continue; }
      const w = warmOf(o), asg = o.st === "asg" || o.st === "lasg" || (gp && o.asgN >= o.need);
      const si = sel.findIndex((s) => s.o === o && s.k !== "p");
      const urgent = !asg && w < 0.35 && Math.floor(tm * 5) % 2;
      const bob = !asg && w < 0.35 ? Math.round(Math.sin(tm * 14)) : 0;
      if (asg) g.globalAlpha = 0.45;
      if (o.st === "lost") pinDraw(P, cx, ty + Math.round(Math.sin(tm * 9)), { st: "lost", sel: si >= 0, urgent: Math.floor(tm * 4) % 2 });
      else pinDraw(P, cx, ty + bob, { st: "r", warm: w, cold: c01((0.5 - w) * 2) * 0.9, sel: si >= 0, urgent, w: gp ? 17 : 11, n: gp ? o.readyN - o.asgN + (o.asgN - o.dlv > 0 ? 0 : 0) : 1 });
      g.globalAlpha = 1;
      // 김(따뜻할 때) · 물방울(식었을 때)
      if (!asg && o.st !== "lost") {
        if (w > 0.55) for (let k = 0; k < 2; k++) { const ph = (tm * 0.9 + k * 0.5) % 1; g.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`; g.fillRect(cx - 2 + k * 4 + Math.round(Math.sin(tm * 4 + k * 2) * 1), ty - 13 - Math.round(ph * 7), 1, 2); }
        else if (w < 0.3) { const ph = (tm * 1.4) % 1; P(cx + 6, ty - 12 + Math.round(ph * 6), 1, 2, "#9fd0ff"); }
      }
      if (gp) { const n = o.need - o.dlv; P(cx + 9, ty - 13, 7, 7, "#e0402a"); dig(P, n, cx + 11, ty - 12, "#ffffff"); }
      if (si >= 0) badge(cx, ty, si + 1);
    }
  };
  const badge = (cx, ty, n) => { P(cx + 3, ty - 17, 7, 7, "#1a1a22"); P(cx + 4, ty - 16, 5, 5, "#ffe066"); dig(P, n, cx + 5, ty - 16, "#2a1e2e"); };
  const drawRider = (r, tm) => {
    const c = r.set[r.dir] || r.set.r, x = Math.round(r.x - c.width / 2), y = Math.round(r.y + 4 - c.height) + (r.mv && Math.floor(tm * 12) % 2 ? -1 : 0);
    // 헤드라이트
    if (r.mv) {
      g.fillStyle = "rgba(255,240,180,.16)";
      if (r.dir === "r") for (let k = 0; k < 14; k++) g.fillRect(r.x + 7 + k, r.y - 2 - (k >> 2), 1, 3 + (k >> 1));
      else if (r.dir === "l") for (let k = 0; k < 14; k++) g.fillRect(r.x - 8 - k, r.y - 2 - (k >> 2), 1, 3 + (k >> 1));
      else if (r.dir === "d") for (let k = 0; k < 12; k++) g.fillRect(r.x - 1 - (k >> 1), r.y + 4 + k, 3 + k, 1);
    }
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(Math.round(r.x - 6), Math.round(r.y + 2), 12, 2);
    g.drawImage(c, x, y);
    if (r.st === "idle" && tut !== 0) { const ph = Math.floor(tm * 3 + r.i) % 3 === 0; if (ph) P(Math.round(r.x) - 1, y - 3, 3, 1, "#ffe066"); }
    if (r.agency) { P(Math.round(r.x) - 4, y - 4, 9, 4, "#1a1a22"); P(Math.round(r.x) - 3, y - 3, 7, 2, "#3e9e6a"); }
    if (r.st === "go" && r.load > 0) for (let k = 0; k < Math.min(3, r.load); k++) P(Math.round(r.x) + 6, y + 1 + k * 2, 2, 1, "#ffe066");
  };
  const drawStack = (tm) => {
    const n = boxCount(); const bx = SHOP.x0 + 2, by = R[3] - 11;
    for (let k = 0; k < Math.min(n, 8); k++) { const col = k % 2, row = k >> 1; BOXI(P, bx + col * 8, by - row * 5); }
    if (n > 8) { P(bx + 16, by - 12, 7, 7, "#e0402a"); dig(P, Math.min(9, n - 8), bx + 18, by - 11, "#fff"); }
    // 가게 굴뚝 김
    const [cx, cy] = SHOP.chim; const nk = orders.some((o) => o.st === "cook") ? 4 : 2;
    for (let k = 0; k < nk; k++) { const ph = (tm * 0.6 + k / nk) % 1; g.fillStyle = `rgba(220,220,230,${0.4 * (1 - ph)})`; g.fillRect(cx + Math.round(Math.sin(tm * 2 + k) * 2 + ph * 4), cy - 2 - Math.round(ph * 14), 2 + Math.round(ph * 2), 2); }
  };
  const render = (tm) => {
    g.drawImage(BG, 0, 0);
    // TV 깜빡임(축구 중계) · 골 장면
    const gl = el - goalT < 1.2 && tut < 0;
    for (const w of tvWins) { const f = (Math.sin(tm * 7 + w[0] * 1.7) + Math.sin(tm * 13 + w[1])) > 0.6; g.fillStyle = gl ? (Math.floor(tm * 10) % 2 ? "#ffffff" : "#ffe066") : f ? "#9fc0ff" : "#4a6ab0"; g.fillRect(w[0], w[1], w[2] || 2, w[3] || 2); }
    if (gl) for (const w of aptWins) if ((w[0] + w[1]) % 3 === Math.floor(tm * 10) % 3) P(w[0], w[1], 2, 2, "#fff6c0");
    // 달리는 라이더의 남은 길(흐리게)
    for (const r of riders) if (r.st === "go") { g.globalAlpha = 0.4; dash(routePts(r, r.stops, r.si), r.agency ? "#7fe0a8" : "#ffd27a", -tm * 20); g.globalAlpha = 1; }
    drawPins(tm);
    drawStack(tm);
    // 끄는 길
    if (drag) {
      const r = drag.r, pts = [{ x: r.x, y: r.y }]; let cur = { x: r.x, y: r.y };
      for (const s of drag.rt) { const q = stopPt(s); for (const w of route(cur, q)) pts.push(w); cur = q; }
      dash(pts, "#ffe066", -tm * 30);
      const lastPt = cur; g.fillStyle = "rgba(255,230,100,.7)"; dash([lastPt, { x: drag.x, y: drag.y }], "#fff6c0", -tm * 30);
      P(Math.round(drag.x) - 2, Math.round(drag.y), 5, 1, "#ffe066"); P(Math.round(drag.x), Math.round(drag.y) - 2, 1, 5, "#ffe066");
      const ld = loadOf(drag.rt); for (let k = 0; k < CAP; k++) P(Math.round(drag.x) + 4 + k * 3, Math.round(drag.y) + 4, 2, 2, k < ld ? "#ffb03b" : "#ffffff60");
    }
    riders.slice().sort((a, b) => a.y - b.y).forEach((r) => drawRider(r, tm));
    // 파티클
    for (const s of fx) { g.globalAlpha = c01(s.t * 2.5); P(Math.round(s.x), Math.round(s.y), 1, 1, s.c); } g.globalAlpha = 1;
    // 빗물 고임 동그라미
    for (const p of rips) { const r = Math.round(p.t * 6); g.fillStyle = `rgba(160,190,230,${0.5 * (1 - p.t / 0.5)})`; g.fillRect(p.x - r, p.y, 1, 1); g.fillRect(p.x + r, p.y, 1, 1); g.fillRect(p.x, p.y - (r >> 1), 1, 1); g.fillRect(p.x, p.y + (r >> 1), 1, 1); }
    // 비
    g.fillStyle = "rgba(170,195,235,.38)";
    for (const d of drops) { const x = ((d[0] - tm * 26 * d[2]) % W + W) % W, y = (d[1] + tm * 190 * d[2]) % (H + 10) - 5; g.fillRect(Math.round(x), Math.round(y), 1, 3); g.fillRect(Math.round(x) - 1, Math.round(y) + 3, 1, 1); }
  };

  // ── 매 프레임 ──
  const step = (dt) => {
    for (const o of orders) {
      if (o.kind === "n" && o.st === "cook") { o.ck += dt; if (o.ck >= o.ckT) { o.st = "ready"; o.readyT = el; S.ready(); const p = ptOf(o.d); F.burst(stageXY(SHOP.x0 + 6, R[3] - 12), "#ffd27a", 5); for (let k = 0; k < 4; k++) fx.push({ x: p.x, y: p.y - 12, vx: rnd() * 20 - 10, vy: -15, t: 0.4, c: "#ffffff" }); } }
      if (o.kind === "g" && o.st !== "done" && o.st !== "cx" && o.readyN < o.need) { o.ck += dt; if (o.ck >= o.ckT) { o.ck = 0; o.readyN++; if (o.readyT == null) o.readyT = el; S.ready(); } }
    }
    riders.slice().forEach((r) => moveR(r, dt));
    for (let i = fx.length - 1; i >= 0; i--) { const s = fx[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 90 * dt; if (s.t <= 0) fx.splice(i, 1); }
    if (rnd() < dt * 9) { const ry = pick(R); rips.push({ x: rint(W), y: ry + rint(7) - 3, t: 0 }); }
    for (let i = rips.length - 1; i >= 0; i--) { rips[i].t += dt; if (rips[i].t > 0.5) rips.splice(i, 1); }
    const nc = orders.filter((o) => o.st === "cook").length; if (nc) { sizT -= dt; if (sizT <= 0) { sizT = 0.15; S.sizzle(nc); } }
  };
  const gameStep = (dt) => {
    while (nextI < SCHED.length && el >= SCHED[nextI]) { newOrder(); nextI++; }
    if (goals < GOALS.length && el >= GOALS[goals]) {
      goals++; goalT = el; S.cheer(); vib([30, 30, 30]); fbEl.textContent = `축구 ${goals}:0`; fbEl.classList.remove("on"); void fbEl.offsetWidth; fbEl.classList.add("on");
      bubble(28, R[0] - 20, "골!!!", "red"); bubble(101, R[2] - 20, "와아아아"); bubble(60, R[2] - 16, "치킨 추가요!");
      F.msg(goals === 1 ? "골! 동네가 들썩, 주문이 몰려요" : "또 골! 축하 치킨 주문!"); newOrder(); newOrder();
    }
    if (groupT < 0 && el >= GROUP_AT) newGroup();
    if (!quitDone && !pendQuit && el >= QUIT_AT) { const r = riders.find((x) => !x.agency && x.st === "idle"); if (r) doQuit(r); else pendQuit = true; }
    for (const o of orders) {
      if (o.readyT == null) continue;
      const unasg = (o.kind === "n" && (o.st === "ready" || (o.st === "lost" && o.pick.st === "ready"))) || (o.kind === "g" && o.asgN === 0 && o.st !== "done" && o.st !== "cx");
      if (unasg && ageOf(o) > 23 * mul(o)) { if (o.pick) o.pick.st = "done"; cancel(o); }
    }
  };

  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tut >= 0) {
      tutT += dt;
      if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else { resetAll(); newOrder(DEST[9], 0.6); tutNext(1); } }
      if (tut >= 1) step(dt);
      if (tut === 1 || tut === 2) { const id = idleR()[0], L = pinList().filter((p) => p.k === "n"); guide(id && L.length ? dragHint(id, L[0], tut === 2 ? "핀 <b>두 개</b>를 지나가게" : "라이더를 <b>끌어</b> 핀까지") : null); }
      else if (tut === 3) guide(agHint("배달대행 <b>톡!</b>"));
      else guide(null);
    } else if (!over) {
      if (!t0) t0 = now;
      el = (now - t0) / 1000;
      gameStep(dt); step(dt);
      guide(drag ? null : taskNow());
    }
    uiUpd();
    render(tut >= 0 ? now / 1000 : el);
    requestAnimationFrame(loop);
  };

  // ── 끝: 배달통 사장님 화면 → 셔터 내리기 ──
  const appURL = () => { const c = document.createElement("canvas"); c.width = 16; c.height = 16; const q = c.getContext("2d"), Q = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); }; Q(0, 0, 16, 16, "#2f6fd0"); Q(3, 5, 10, 7, "#ffffff"); Q(4, 3, 8, 2, "#ffb03b"); Q(5, 12, 2, 2, "#1a1a1a"); Q(10, 12, 2, 2, "#1a1a1a"); Q(5, 7, 6, 1, "#2f6fd0"); return c.toDataURL(); };
  const end = () => {
    if (over) return; over = true; drag = null; guide(null);
    // 이미 달리고 있는 배달은 곧 도착한다고 보고 지금 시각으로 별점
    const live = [];
    for (const r of riders) if (r.st === "go") for (let i = r.si; i < r.stops.length; i++) { const s = r.stops[i]; if ((s.k === "n" || s.k === "l") && !live.includes(s.o)) live.push(s.o); if (s.k === "g" && !live.includes(s.o)) { s.o.dlv += s.take; if (s.o.dlv >= s.o.need) live.push(s.o); } }
    el += 1.5; for (const o of live) if (o.st !== "done") deliver(o, !!o.wrong);
    const due = orders.filter((o) => o.st === "done" || o.st === "cx" || (o.readyT != null && o.readyT < T - 9));
    const wsum = due.reduce((a, o) => a + (o.kind === "g" ? 2 : 1), 0) || 1;
    const base = due.reduce((a, o) => a + (o.kind === "g" ? 2 : 1) * (o.st === "done" ? (o.stars - 1) / 4 : 0), 0) / wsum;
    const done = orders.filter((o) => o.st === "done"), cx = orders.filter((o) => o.st === "cx");
    const thr = clamp(done.length / Math.max(1, due.length), 0, 1);
    const bundle = trips ? clamp((stopsN / trips - 1) / 1, 0, 1) : 0;
    const score = clamp(0.85 * base + 0.15 * thr - 0.012 * Math.max(0, agUses - 1), 0, 1);
    const av = avgStar(), cold = done.filter((o) => o.stars <= 3).length;
    const fee = agUses * AGFEE, gross = sales + fee;
    SFX.end?.(); dim.classList.add("on");
    const box = document.createElement("div"); box.className = "c2end";
    box.innerHTML = `<div class="c2ph"><div class="nt0"></div><div class="c2scr"><div class="c2hd"><img src="${appURL()}" alt=""><p>배달통 사장님<small>황금닭 · 금요일 마감</small></p></div>
      <div class="c2big"><div><small>오늘 리뷰 평점</small><b class="av">★0.0</b></div><div class="st">${av === "-" ? "" : stars(Math.round(+av))}</div></div>
      <div class="c2rows"><p><span>배달 완료</span><b class="n1">0건</b></p><p><span>매출</span><b class="n2">0원</b></p>${fee ? `<p class="neg"><span>배달대행 수수료</span><b>-${won(fee)}원</b></p>` : ""}${cx.length ? `<p class="neg"><span>식어서 취소</span><b>${cx.length}건</b></p>` : ""}<p class="tot"><span>오늘 남은 돈</span><b class="n3">0원</b></p></div>
      <div class="c2ls"></div></div></div>`;
    wrap.appendChild(box);
    const avEl = box.querySelector(".av"), n1 = box.querySelector(".n1"), n2 = box.querySelector(".n2"), n3 = box.querySelector(".n3"), ls = box.querySelector(".c2ls");
    const avN = av === "-" ? 0 : +av, CT = RM() ? 300 : 1100; let ct0 = 0, ck = 0;
    const cnt = (nw) => { if (!box.isConnected) return; if (!ct0) ct0 = nw; const k = c01((nw - ct0) / CT), e = 1 - Math.pow(1 - k, 3);
      avEl.textContent = "★" + (avN * e).toFixed(1); n1.textContent = Math.round(done.length * e) + "건"; n2.textContent = won(Math.round(gross * e / 100) * 100) + "원"; n3.textContent = won(Math.round(sales * e / 100) * 100) + "원";
      if (Math.floor(k * 12) > ck) { ck = Math.floor(k * 12); S.count(ck); }
      if (k < 1) requestAnimationFrame(cnt); };
    setTimeout(() => requestAnimationFrame(cnt), 350);
    // 리뷰 알림
    const pool = []; const by = done.slice().sort((a, b) => b.stars - a.stars);
    if (by.length) pool.push(by[0]); const cw = done.find((o) => o.stars <= 3); if (cw) pool.push(cw); const ww = done.find((o) => o.wrong); if (ww && !pool.includes(ww)) pool.push(ww); if (cx.length) pool.push(cx[0]); for (let k = 1; k < by.length && pool.length < 4; k++) if (!pool.includes(by[k])) pool.push(by[k]);
    const r5 = shuffle(RV5.slice());
    pool.slice(0, 4).forEach((o, k) => setTimeout(() => {
      if (!ls.isConnected) return;
      const txt = o.cx ? pick(RVX) : o.wrong ? RVW : o.stars >= 5 ? r5.shift() || RV5[0] : o.stars === 4 ? pick(RV4) : o.stars === 3 ? pick(RV3) : pick(RV2);
      const d = document.createElement("div"); d.className = "c2nt" + (o.stars >= 4 && !o.cx ? "" : " bad");
      d.innerHTML = `<p><b>${stars(o.cx ? 1 : o.stars)} · ${o.d.n}</b><span>${txt}</span></p>`;
      ls.prepend(d); if (o.stars >= 4 && !o.cx) tone(1318, 0.08, "triangle", 0.05); else tone(392, 0.12, "triangle", 0.05);
    }, (RM() ? 300 : 1500) + k * (RM() ? 100 : 380)));
    const T1 = RM() ? 1400 : 3600;
    setTimeout(() => { box.classList.add("out"); shutter(score, () => finish(score, `${done.length}건 배달 · 평균 <b>★${av}</b> · 남은 돈 ${won(sales)}원${cx.length ? ` · 취소 ${cx.length}` : ""}`, "", [["따끈함(별점)", base], ["처리량", thr], ["묶음 배달", bundle]])); }, T1);
  };
  // 마지막 장면: 비 오는 가게 앞, 사장님(내 캐릭터)이 셔터를 내린다
  const shutter = (score, then) => {
    const el2 = document.createElement("div"); el2.className = "c2fin"; el2.innerHTML = `<canvas></canvas><div class="c2sign">황금닭</div><div class="c2me"></div><canvas class="fg"></canvas><div class="c2say"></div>`; wrap.appendChild(el2);
    const c = el2.querySelector("canvas"), q = c.getContext("2d"), fg = el2.querySelector("canvas.fg"), sg = el2.querySelector(".c2sign"), me = el2.querySelector(".c2me"), say = el2.querySelector(".c2say");
    c.width = W; c.height = H; const Q = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); };
    // 앞 화단: 벽돌 턱 + 회양목 + 젖은 반사
    fg.width = W; fg.height = H; { const f = fg.getContext("2d"), Fp = (x, y, w, h, col) => { f.fillStyle = col; f.fillRect(x, y, w, h); }, fy = Math.round(H * 0.86);
      for (let x = 0; x < 102; x += 3) { const h = 4 + ((x * 7) % 4); Fp(x, fy - h, 4, h + 1, (x / 3) % 2 ? "#24502e" : "#2f6a3a"); Fp(x + 1, fy - h, 2, 1, "#3e8a4a"); }
      Fp(0, fy, 104, H - fy, "#6a3a26"); Fp(0, fy, 104, 1, "#9a5a3a"); for (let y = fy + 3; y < H; y += 4) for (let x = ((y - fy) / 4) % 2 ? 0 : 4; x < 104; x += 8) Fp(x, y, 1, 4, "#4e2a1a"); for (let y = fy + 3; y < H; y += 4) Fp(0, y, 104, 1, "#4e2a1a");
      Fp(103, fy, 1, H - fy, "#3a1e12"); for (let k = 0; k < 8; k++) Fp(8 + k * 12, fy + 1, 2, 1, "#ffb03b40"); }
    const sx0 = 30, sx1 = 150, sTop = Math.round(H * 0.22), sBot = Math.round(H * 0.7), fh = sBot - sTop - 16;
    Object.assign(sg.style, { left: (sx0 + 12) * K + "px", top: (sTop + 1) * K + "px", width: (sx1 - sx0 - 24) * K + "px", height: 12 * K + "px", lineHeight: 12 * K + "px", fontSize: Math.round(9 * K) + "px" });
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    const mh = Math.round(H * K * 0.5), mw = Math.round(mh * 240 / 312), ex = score >= 0.7 ? 1 : 2;
    Object.assign(me.style, { width: mw + "px", height: mh + "px", left: Math.round(2 * K) + "px", top: Math.round(H * K * 0.93 - mh) + "px", backgroundPosition: `${(ex % 3) * 50}% ${ex >= 3 ? 70.3125 : 0}%` });
    const im = new Image(); im.onload = () => { me.style.backgroundImage = `url("${im.src}")`; }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp";
    say.style.top = Math.round(H * K * 0.93 - mh - 30) + "px"; say.style.left = Math.round(2 * K + mw * 0.55) + "px";
    let s0 = 0, light = 1, sndOn = false;
    const DUR = RM() ? 0.6 : 1.5, START = RM() ? 0.2 : 0.7;
    const drw = (nw) => {
      if (!el2.isConnected) return; if (!s0) s0 = nw; const t = (nw - s0) / 1000;
      const p = c01((t - START) / DUR), down = Math.round(p * fh);
      if (t > START && !sndOn) { sndOn = true; S.shutter(0); }
      if (p >= 1 && light === 1 && t > START + DUR + 0.35) { light = 0; sg.classList.add("off"); tone(220, 0.08, "square", 0.05); }
      // 밤하늘·건물
      for (let y = 0; y < H; y++) Q(0, y, W, 1, mix("#0c1020", "#1e2438", y / H));
      for (let x = 0; x < W; x += 9) Q(x, 4 + ((x * 7) % 11), 6, sTop - 6, "#141a2c");
      // 가게 벽
      Q(sx0 - 4, sTop - 4, sx1 - sx0 + 8, sBot - sTop + 4, "#5a3a26"); for (let y = sTop - 4; y < sBot; y += 4) for (let x = sx0 - 4 + ((y / 4) % 2) * 4; x < sx1 + 4; x += 8) Q(x, y, 1, 4, "#4e3220");
      Q(sx0 + 10, sTop, sx1 - sx0 - 20, 14, "#2a1608"); Q(sx0 + 10, sTop, sx1 - sx0 - 20, 1, light ? "#ffb03b" : "#5a4030");
      const iy = sTop + 16;
      Q(sx0, iy, sx1 - sx0, fh, light ? "#ffcf6a" : "#2a2018");
      if (light) { Q(sx0, iy, sx1 - sx0, 2, "#fff2c0"); Q(sx0 + 10, iy + fh - 18, 30, 18, "#9aa0a8"); Q(sx0 + 12, iy + fh - 20, 26, 2, "#d8a040"); Q(sx1 - 50, iy + fh - 14, 40, 14, "#c99a64"); for (let k = 0; k < 3; k++) BOXI(Q, sx1 - 46 + k * 10, iy + fh - 20); }
      // 셔터(주름 줄)
      Q(sx0 - 2, iy - 3, sx1 - sx0 + 4, 4, "#6a707c"); Q(sx0 - 2, iy - 3, sx1 - sx0 + 4, 1, "#9aa0ac");
      for (let y = 0; y < down; y++) Q(sx0, iy + y, sx1 - sx0, 1, y % 3 === 0 ? "#7a808c" : y % 3 === 1 ? "#a8aeb8" : "#8f959f");
      if (down > 2) { Q(sx0, iy + down - 2, sx1 - sx0, 2, "#5a606c"); Q(sx0 + (sx1 - sx0) / 2 - 4, iy + down - 3, 8, 2, "#3a3f4a"); }
      // 길·물웅덩이 반사
      Q(0, sBot, W, H - sBot, "#22262e"); Q(0, sBot, W, 2, "#3a3f4a");
      if (light) { q.fillStyle = "rgba(255,200,100,.18)"; q.fillRect(sx0, sBot + 4, sx1 - sx0, 6); }
      q.fillStyle = light ? "rgba(255,180,60,.25)" : "rgba(90,70,40,.2)"; q.fillRect(sx0 + 14, sBot + 12, sx1 - sx0 - 28, 2);
      // 세워 둔 스쿠터
      q.drawImage(RS[0].l, sx1 - 18, sBot + 6 - 14);
      // 비
      q.fillStyle = "rgba(170,195,235,.4)";
      for (const d of drops) { const x = ((d[0] - t * 26 * d[2]) % W + W) % W, y = (d[1] + t * 190 * d[2]) % (H + 10) - 5; q.fillRect(Math.round(x), Math.round(y), 1, 3); }
      if (t < START + DUR + 2.2) requestAnimationFrame(drw);
    };
    requestAnimationFrame(drw);
    requestAnimationFrame(() => el2.classList.add("on"));
    setTimeout(() => { say.textContent = score >= 0.7 ? "휴… 오늘도 잘 버텼다" : "알바가 그만두면… 내가 뛴다"; say.classList.add("on"); }, (START + DUR) * 1000 + 200);
    setTimeout(then, (START + DUR) * 1000 + (RM() ? 600 : 1700));
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.chicken2 = {
    st: () => ({ tut, el: +el.toFixed(2), over, orders: orders.map((o) => o.kind + o.id + ":" + o.st).join(","), riders: riders.map((r) => (r.agency ? "A" : "R") + r.i + ":" + r.st).join(","), served: served.map((o) => o.stars).join(""), sales, agUses, trips, stopsN, quitDone, wrongDone, picks: picks.map((p) => p.st).join(",") }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1 || tut === 2) { const r = idleR()[0], L = pinList().filter((p) => p.k === "n"); if (r && L.length >= (tut === 2 ? 2 : 1)) { const rt = []; L.forEach((p) => addStop(rt, p, true)); dispatch(r, rt); } }
      else if (tut === 3) callAgency();
      else if (tut === 4) startGame();
    },
    auto: (bad) => {
      if (over || tut >= 0) return;
      const id = idleR();
      if (bad) { if (rnd() < 0.05 && id.length) { const L = pinList().filter((p) => p.k === "n"); if (L.length) { const rt = []; addStop(rt, pick(L), true); dispatch(id[0], rt); } } return; }
      if (!id.length && quitDone && boxCount() >= 2 && riders.filter((r) => r.agency).length < 1 && agUses < 3) callAgency();
      for (const r of idleR()) {
        const L = pinList(), rt = [];
        const pk = L.find((p) => p.k === "p");
        if (pk) { addStop(rt, pk, true); const lo = L.find((p) => p.k === "l" && p.o === pk.o); if (lo) addStop(rt, lo, true); }
        else {
          const gp = L.find((p) => p.k === "g");
          if (gp && gp.o.readyN - gp.o.asgN >= Math.min(2, gp.o.need - gp.o.asgN)) addStop(rt, gp, true);
          else {
            const rd = L.filter((p) => p.k === "n").sort((a, b) => a.o.readyT - b.o.readyT);
            if (rd.length) { addStop(rt, rd[0], true); let cur = rd[0]; const rest = rd.slice(1);
              while (rt.length < CAP && rest.length) { rest.sort((a, b) => pathLen({ x: cur.cx, y: cur.ty + 7 }, { x: a.cx, y: a.ty + 7 }) - pathLen({ x: cur.cx, y: cur.ty + 7 }, { x: b.cx, y: b.ty + 7 })); const nx = rest[0]; if (pathLen({ x: cur.cx, y: cur.ty + 7 }, { x: nx.cx, y: nx.ty + 7 }) > 80) break; rest.shift(); addStop(rt, nx, true); cur = nx; } }
          }
        }
        if (rt.length) dispatch(r, rt);
      }
    },
  };
  updSc(); render(0); requestAnimationFrame(loop);
}
