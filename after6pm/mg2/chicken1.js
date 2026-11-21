// 프랜차이즈 치킨 1탄: 황금 튀김 타이밍 (도트 캔버스 160x200~250)
// 주문표가 들어오면 반죽한 닭을 끌어 튀김 바구니에 넣는다. 연노랑 → 황금 → 갈색 → 탄 색.
// 황금색일 때 바구니를 위로 쓱 끌어 올리면 '탁탁' 기름을 턴다. 주문대로 소스 통을 톡 → 볼을 문질러 버무리고,
// 박스에 치킨무를 톡 넣으면 라이더가 가져간다. 가끔 불이 세져서 기름이 튄다(손잡이 톡).
// 끝나면 배달통 리뷰 알림이 쏟아진다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSprite, uOutline } from "../mg.js";

const W = 160, T = 30, FY = 30, OT = FY + 8;
const BX = [6, 46, 86], BW = 36;
const SAU = {
  f: { n: "후라이드", band: "#ffc23f", glaze: null },
  y: { n: "양념", band: "#e0402a", glaze: "#b8261a" },
  g: { n: "간장", band: "#8a5428", glaze: "#5e2c10" },
};
const POTS = ["f", "y", "g", "m"];
const DSTOP = [[0, "#f6e7b4"], [0.35, "#f2d27e"], [0.6, "#eaa83e"], [0.8, "#cf8226"], [1, "#874616"], [1.15, "#2e1d12"]];
const GOLD = "#eaa83e";
const RV5 = ["바삭함 미쳤다", "튀김옷이 과자처럼 바삭바삭", "양념이 끝까지 촉촉해요", "무까지 완벽, 재주문각", "사장님 손목 괜찮으세요? 너무 맛있어요", "식어도 바삭해요 ㄷㄷ", "황금색 실화냐"];
const RV4 = ["맛있는데 살짝 진하게 튀겨졌어요", "조금 늦었지만 바삭해요", "맛있어요! 다음엔 더 빨리요"];
const RVMU = ["무가 없어요… 치킨엔 무인데", "치킨무 빠졌어요ㅠ"];
const RVX = ["주문이 취소됐어요", "너무 오래 걸려서 취소했어요"];

const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); t = c01(t); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const dcol = (d) => { for (let i = 1; i < DSTOP.length; i++) if (d <= DSTOP[i][0]) { const [a, ca] = DSTOP[i - 1], [b, cb] = DSTOP[i]; return mix(ca, cb, (d - a) / (b - a)); } return DSTOP[DSTOP.length - 1][1]; };
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

// 치킨 한 조각(7~10x6). k: 0 닭다리 1 날개 2 살
function piece(P, x, y, col, k = 0, gloss = false) {
  const hi = mix(col, "#fff6d8", 0.35), lo = mix(col, "#3a1e0a", 0.32), ln = mix(col, "#2a1406", 0.55);
  if (k === 0) {
    P(x + 1, y, 4, 1, hi); P(x, y + 1, 6, 1, hi); P(x, y + 2, 7, 2, col); P(x + 1, y + 4, 5, 1, lo); P(x + 2, y + 5, 3, 1, ln);
    P(x + 7, y + 2, 2, 1, "#f4ecd8"); P(x + 8, y + 1, 2, 1, "#fffaf0"); P(x + 8, y + 3, 2, 1, "#d8ccb0");
    P(x + 2, y + 2, 1, 1, lo); P(x + 4, y + 3, 1, 1, hi); P(x + 5, y + 2, 1, 1, lo);
  } else if (k === 1) {
    P(x, y + 1, 3, 1, hi); P(x + 3, y, 4, 1, hi); P(x, y + 2, 8, 1, col); P(x + 1, y + 3, 7, 1, col); P(x + 2, y + 4, 5, 1, lo); P(x + 3, y + 5, 3, 1, ln);
    P(x + 3, y + 2, 1, 1, lo); P(x + 6, y + 3, 1, 1, hi);
  } else {
    P(x + 1, y, 5, 1, hi); P(x, y + 1, 7, 1, hi); P(x, y + 2, 7, 2, col); P(x, y + 4, 7, 1, lo); P(x + 1, y + 5, 5, 1, ln);
    P(x + 2, y + 2, 1, 1, lo); P(x + 4, y + 1, 1, 1, mix(col, "#ffffff", 0.6)); P(x + 5, y + 3, 1, 1, lo);
  }
  if (gloss) { P(x + 2, y + 1, 2, 1, "#ffffffb0"); P(x + 5, y + 2, 1, 1, "#ffffff90"); }
}
// 큰 조각(바구니·볼·박스용). h 밝음 c 바탕 l 그늘 n 테두리 b·B 뼈
const BIG = [
  ["....hhhhh......", "..hhcchcchh....", ".hcccccccccl...", "hccchccccccl.BB", "hcccccclccclbBB", ".cclccccccllbb.", ".lcccclcclln...", "..lllllnnn....."],
  ["..hhh..hhh..", ".hccchhccch.", "hcccccccccch", "cccclccccccl", ".lcccccclcl.", "..llnnllnn.."],
  ["..hhhhhh...", ".hhcchcchh.", "hcccccccccl", "hccclccccll", "ccccccclccl", ".lcccccccl.", "..lllnnll.."],
];
function bigPiece(P, x, y, col, k, gloss = false, seed = 0) {
  const hi = mix(col, "#fff6d8", 0.38), lo = mix(col, "#3a1e0a", 0.3), ln = mix(col, "#2a1406", 0.55);
  BIG[k].forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) {
    const ch = row[xx]; if (ch === ".") continue;
    let c = ch === "h" ? hi : ch === "l" ? lo : ch === "n" ? ln : ch === "b" ? "#d8ccb0" : ch === "B" ? "#fffaf0" : col;
    if (ch === "c") { const r = (xx * 5 + yy * 3 + seed) % 7; if (r === 0) c = hi; else if (r === 3) c = lo; }
    P(x + xx, y + yy, 1, 1, c);
  } });
  if (gloss) { P(x + 3, y + 1, 3, 1, "#ffffffb8"); P(x + 6, y + 2, 1, 1, "#ffffff90"); }
}
const PC = [[1, 1, 0, 0], [19, 0, 2, 2], [3, 11, 1, 4], [17, 12, 0, 1]];
const clusterCol = (o, coat) => { const base = dcol(o.d0 ?? 0.7); const gz = SAU[o.s].glaze; return gz ? mix(base, gz, coat * 0.85) : mix(base, "#f6dfa0", coat * 0.25); };
function cluster(P, x, y, col, gloss = false) { for (const [a, b, k, sd] of PC) bigPiece(P, x + a, y + b, col, k, gloss, sd); }

// 도트 손가락
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); });
  if (ol) uOutline(c); return c;
}
// 치킨 박스(닫힌 것) 아이콘
const BOXI = (P) => { P(0, 4, 22, 10, "#d9a868"); P(0, 4, 22, 1, "#f0c88a"); P(1, 0, 20, 5, "#e8b878"); P(1, 0, 20, 1, "#fadca8"); P(21, 5, 1, 9, "#a8763e"); P(8, 6, 6, 6, "#ffb03b"); P(9, 7, 4, 4, "#c0302a"); P(10, 8, 2, 2, "#ffe08a"); P(2, 12, 18, 1, "#b8864e"); };
const MUI = (P) => { P(1, 2, 8, 7, "#f6f6f0"); P(0, 1, 10, 2, "#ffffff"); P(2, 3, 2, 2, "#fffbe0"); P(5, 4, 2, 2, "#f8f0c8"); P(3, 6, 2, 2, "#fffbe0"); P(8, 3, 1, 6, "#d8d8cc"); };

export const GAME = {
  key: "chicken1", base: "chicken", jc: "#ffb03b", n: "황금 튀김 타이밍", desc: "황금색일 때 건져야 리뷰가 ★5",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 주문표가 들어오면 <b>반죽한 닭</b>을 끌어 <b>튀김 바구니</b>에 넣어요.",
    "튀김 색이 연노랑 → <b>황금</b> → 갈색 → 탄 색으로 변해요. <b>황금색일 때</b> 바구니를 <b>위로 쓱</b> 끌어 올려요. 타면 버리고 다시 튀겨야 해요.",
    "주문표대로 <b>소스 통을 톡</b> → 볼을 <b>문질러</b> 버무리고, 박스에 <b>치킨무를 톡</b>! 무를 빠뜨리면 별점이 깎여요. 불이 세지면 <b>불 손잡이를 톡</b>.",
  ],
  steps: () => {
    try {
      const im = (c, h) => `<img src="${c.toDataURL()}" alt="" style="height:${h}px;width:auto">`;
      const s1 = document.createElement("canvas"); s1.width = 40; s1.height = 34; {
        const g = s1.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        P(0, 20, 40, 14, "#c98a2a"); P(0, 20, 40, 1, "#f0c060"); P(2, 22, 36, 10, "#9aa0a8"); P(3, 23, 34, 8, "#b8761e");
        for (let k = 0; k < 9; k++) P(4 + k * 4, 22 + (k % 3), 1, 1, "#fff2c0");
        piece(P, 15, 3, dcol(0.05), 0); piece(P, 5, 10, dcol(0.05), 2);
        P(28, 6, 1, 8, "#ffe066"); P(26, 12, 5, 1, "#ffe066"); P(27, 13, 3, 1, "#ffe066");
      }
      const s2 = document.createElement("canvas"); s2.width = 40; s2.height = 34; {
        const g = s2.getContext("2d"), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        [0.2, 0.7, 0.92, 1.12].forEach((d, i) => piece(P, 1 + i * 10, 4, dcol(d), i % 3));
        P(0, 16, 40, 4, "#2a1d14"); P(1, 17, 21, 2, "#f2d27e"); P(22, 17, 6, 2, GOLD); P(28, 17, 6, 2, "#874616"); P(34, 17, 5, 2, "#2e1d12");
        P(24, 21, 2, 1, "#ffe066"); P(23, 22, 4, 1, "#ffe066"); P(22, 23, 6, 1, "#ffe066");
        P(14, 26, 1, 7, "#ffe066"); P(12, 28, 5, 1, "#ffe066"); P(13, 27, 3, 1, "#ffe066");
      }
      const s3 = document.createElement("canvas"); s3.width = 40; s3.height = 34; {
        const g = s3.getContext("2d");
        g.drawImage(mkC(22, 14, BOXI), 2, 14); g.drawImage(mkC(10, 9, MUI), 26, 18);
        g.fillStyle = "#ffd23f"; for (let k = 0; k < 5; k++) { const x = 2 + k * 8; g.fillRect(x + 2, 2, 1, 5); g.fillRect(x, 4, 5, 1); g.fillRect(x + 1, 3, 3, 3); }
      }
      return [[im(s1, 46), "닭을 끌어 넣기"], [im(s2, 46), "황금색에 쓱"], [im(s3, 46), "소스·무 → ★5"]];
    } catch (e) { return [["", "닭을 끌어 넣기"], ["", "황금색에 쓱"], ["", "소스·무 → ★5"]]; }
  },
  css: `
.mg-c1st{background:#17110c!important;display:flex;align-items:center;justify-content:center}
.mg-c1w{position:relative;flex:0 0 auto}
.mg-c1w>canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:pointer}
.mg-chicken1 .mg-steps img{image-rendering:pixelated}
.mg-chicken1 .mg-logo b{font-size:26px}
.mg-c1w .c1lb b{position:absolute;display:block;text-align:center;font-size:10.5px;font-weight:800;color:#f4e6c8;background:#2a1d14e0;border-radius:4px;white-space:nowrap;overflow:hidden;pointer-events:none;letter-spacing:-.4px}
.mg-c1w .c1lb b.on{background:#ffd23f;color:#3a2400;animation:c1blink .5s steps(2) infinite}
.mg-c1w .c1lb b.tk{color:#fff;font-size:10px;border-radius:0 0 3px 3px}
.mg-c1w .c1lb b.tk.dim{opacity:.55}
.mg-c1w .c1lb b.br{background:none;color:#ffcf5a;font-size:12px;font-weight:900;letter-spacing:1px;text-shadow:0 1px 0 #6a3a0a,0 0 4px #000a}
.mg-c1w .c1lb b.ge{background:#0000;color:#ffe9a8;font-size:9.5px}
@keyframes c1blink{50%{filter:brightness(1.3)}}
.mg-c1w .c1go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-c1w .c1go.on{display:block}
.mg-c1w .c1go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-c1w .c1go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffb03b}
.mg-c1w .c1go span b{color:#d8402a}
.mg-c1w .c1go.dn i{top:-37px;animation:c1tapd .7s infinite}
.mg-c1w .c1go.dn span{bottom:44px}
.mg-c1w .c1go.up i{top:2px;animation:c1tapu .7s infinite}
.mg-c1w .c1go.up span{top:46px}
.mg-c1w .c1go.sw i{animation:c1sw .9s infinite}
.mg-c1w .c1go.lf i{animation:c1lf .9s infinite}
.mg-c1w .c1go.dr i{animation:c1dr 1.3s ease-in-out infinite}
@keyframes c1tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c1tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c1sw{0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}
@keyframes c1lf{0%{transform:translateY(16px)}70%{transform:translateY(-22px)}100%{transform:translateY(-22px);opacity:0}}
@keyframes c1dr{0%{transform:translate(0,0)}15%{transform:translate(0,0) scale(.9)}75%,100%{transform:translate(var(--dx),var(--dy)) scale(.9)}}
.mg-c1w .c1tut{position:absolute;left:8px;right:8px;top:24%;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-c1w .c1tut.low{top:auto;bottom:40%}
.mg-c1w .c1tut.off{opacity:0;visibility:hidden}
.mg-c1w .c1tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #ffb03b;max-width:290px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-c1w .c1tut.pop .c1tc{animation:c1pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-c1w .c1tc em{font-style:normal;display:inline-block;background:#d8701a;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-c1w .c1tc p{margin:0}.mg-c1w .c1tc b{color:#c0601a}.mg-c1w .c1tc b.rd{color:#c0392b}
.mg-c1w .c1tb{margin-top:6px;display:flex;justify-content:center}
.mg-c1w .c1skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-c1w .c1go2{background:linear-gradient(#ffb03b,#d8701a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4410!important;animation:c1pulse .5s infinite alternate}
@keyframes c1pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes c1pulse{to{transform:scale(1.06)}}
.mg-c1w .c1dim{position:absolute;inset:0;background:#0000;transition:background .5s;pointer-events:none;z-index:7}
.mg-c1w .c1dim.on{background:#000b}
.mg-c1w .c1end{position:absolute;left:50%;top:50%;z-index:8;width:min(82%,236px);transform:translate(-50%,-46%);pointer-events:none;animation:c1phin .5s cubic-bezier(.3,1.4,.5,1)}
@keyframes c1phin{0%{transform:translate(-50%,10%) scale(.7);opacity:0}100%{transform:translate(-50%,-46%) scale(1);opacity:1}}
.mg-c1w .c1ph{background:#1c1c22;border-radius:22px;padding:10px 7px 12px;box-shadow:0 0 0 2px #3a3a44,0 10px 24px #000a}
.mg-c1w .c1ph .nt0{width:46px;height:5px;background:#000;border-radius:3px;margin:0 auto 7px}
.mg-c1w .c1scr{background:linear-gradient(#ffcf5a,#ff9a3b);border-radius:14px;padding:8px 6px 6px;min-height:300px;overflow:hidden}
.mg-c1w .c1hd{display:flex;align-items:center;gap:6px;color:#4a2400;font-weight:900;font-size:12px;margin-bottom:6px}
.mg-c1w .c1hd img{width:26px;height:26px;image-rendering:pixelated;border-radius:6px;background:#fff8e0}
.mg-c1w .c1hd p{margin:0;line-height:1.2}.mg-c1w .c1hd small{display:block;font-weight:700;font-size:10px;color:#7a4410}
.mg-c1w .c1avg{margin-left:auto;text-align:right;font-size:20px;color:#fff;text-shadow:0 2px 0 #b8501a;line-height:1}
.mg-c1w .c1avg i{display:block;font-style:normal;font-size:9.5px;color:#fff8e0;text-shadow:none;letter-spacing:1px}
.mg-c1w .c1ls{display:flex;flex-direction:column;gap:5px}
.mg-c1w .c1nt{display:flex;gap:6px;align-items:center;background:#fffdf6f2;border-radius:10px;padding:5px 7px;box-shadow:0 2px 0 #0003;animation:c1ntin .35s cubic-bezier(.3,1.5,.5,1)}
.mg-c1w .c1nt img{width:24px;height:24px;image-rendering:pixelated;flex:0 0 auto}
.mg-c1w .c1nt p{margin:0;font-size:11px;line-height:1.35;color:#3a2a1a;min-width:0}
.mg-c1w .c1nt p b{display:block;font-size:10px;color:#d8701a;letter-spacing:.5px}
.mg-c1w .c1nt.bad p b{color:#8a8070}
.mg-c1w .c1nt p span{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@keyframes c1ntin{0%{transform:translateY(-14px) scale(.9);opacity:0}100%{transform:none;opacity:1}}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "chicken1", "황금 튀김 타이밍", "mg-c1st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-c1w"><canvas></canvas><div class="mg-bubs"></div><div class="c1lb"></div><div class="c1go"><span></span><i></i></div><div class="c1tut"><div class="c1tc"><em>리허설</em><p></p><div class="c1tb"></div></div></div><div class="c1dim"></div></div>`);
  const wrap = F.stage.querySelector(".mg-c1w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), lbEl = wrap.querySelector(".c1lb"), goEl = wrap.querySelector(".c1go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".c1tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".c1tb"), dim = wrap.querySelector(".c1dim"), bubs = wrap.querySelector(".mg-bubs");
  let K = 2, H = 220, OD = 32, LIP = OT + 32, CY = 146, PR = 184;
  const fit = () => {
    const sw = F.stage.clientWidth || 336, sh = F.stage.clientHeight || 600, r = Math.min(sw / W, sh / 200);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 250);
    const ex = H - 200; OD = 32 + Math.floor(ex * 0.4); LIP = OT + OD; PR = H - 36; CY = PR - 38 - Math.floor(ex * 0.3);
    cv.width = W; cv.height = H; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const PG = (gg) => (x, y, w, h, col) => { gg.fillStyle = col; gg.fillRect(x, y, w, h); };
  const BG = bgCanvas(), BOXC = mkC(22, 14, BOXI), MUC = mkC(10, 9, MUI);
  const RIDER = { spec: { skin: "#f0c8a8", hair: "#2a2018", style: "buzz", shirt: "#2f6fd0", shirt2: "#2558a8", pants: "#2c3550", shoe: "#222", hat: "#ffb03b", pack: "#ff7a2a", hood: null, glasses: false, kid: false, elder: false }, cache: {} };

  // ── 배경(정적) ──
  function bgCanvas() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const q = c.getContext("2d"), Q = PG(q);
    // 벽 타일
    Q(0, 0, W, CY, "#e8e4da");
    for (let y = 0; y < CY; y += 8) for (let x = 0; x < 128; x += 8) { Q(x, y, 8, 1, "#d2ccbe"); Q(x, y, 1, 8, "#d8d2c4"); if ((x * 7 + y * 3) % 23 === 0) Q(x + 3, y + 4, 2, 1, "#d8c8a0"); }
    // 후드(스테인리스)
    Q(0, 0, 128, 3, "#8a929c"); Q(0, 3, 128, 1, "#5a626c");
    for (let y = 0; y < FY; y++) { const a = 0.05 + y / FY * 0.1; q.fillStyle = `rgba(80,60,30,${a})`; q.fillRect(0, y, 128, 1); }
    // 주문 레일
    Q(0, 2, 128, 2, "#c8ced6"); Q(0, 2, 128, 1, "#f0f4f8"); Q(0, 4, 128, 1, "#6a727c");
    // 오른쪽: 픽업 창구
    Q(126, 0, 34, CY, "#5a3a26"); Q(126, 0, 2, CY, "#3a2416");
    Q(129, 1, 29, 14, "#3a3f4a"); Q(129, 1, 29, 1, "#5a606c"); Q(131, 3, 25, 4, "#1c1f26"); Q(132, 11, 23, 2, "#1a1c22"); Q(152, 4, 2, 2, "#3fe07a");
    Q(130, 18, 27, CY - 21, "#1a2240");
    for (let y = 18; y < CY - 3; y++) { const k = (y - 18) / (CY - 21); q.fillStyle = `rgba(${40 + k * 30},${30 + k * 20},${80 - k * 30},1)`; q.fillRect(130, y, 27, 1); }
    // 바깥 밤거리: 네온·가로등·도로
    Q(132, 22, 9, 6, "#ff4a8a"); Q(133, 23, 7, 4, "#2a1030"); Q(134, 24, 5, 1, "#ff9ac0"); Q(134, 25, 3, 1, "#ff9ac0");
    Q(147, 21, 1, 20, "#5a6070"); Q(145, 20, 5, 2, "#ffe8a0"); q.fillStyle = "rgba(255,230,150,.18)"; q.fillRect(141, 22, 13, 24);
    for (let k = 0; k < 6; k++) Q(132 + ((k * 11) % 24), 30 + ((k * 7) % 12), 1, 1, "#ffe066");
    Q(130, CY - 16, 27, 13, "#2a2c34"); for (let x = 131; x < 157; x += 7) Q(x, CY - 10, 4, 1, "#c8c080");
    Q(128, CY - 4, 31, 4, "#8a929c"); Q(128, CY - 4, 31, 1, "#c8ced6");
    Q(128, 16, 31, 2, "#8a929c"); Q(128, 16, 31, 1, "#c8ced6");
    // 튀김기 몸통
    Q(0, FY, 128, CY - FY, "#a8b0b8");
    for (let y = FY; y < CY; y += 2) Q(0, y, 128, 1, y % 4 ? "#b0b8c0" : "#a0a8b0");
    Q(2, FY, 124, 3, "#d8dee4"); Q(2, FY, 124, 1, "#f4f8fa"); Q(2, FY + 3, 124, 1, "#6a727c");
    // 기름 칸
    Q(4, OT - 4, 120, OD + 4, "#4a3418");
    for (let y = OT; y < LIP; y++) { const k = (y - OT) / OD; q.fillStyle = mix("#e2a63a", "#9a5a16", k); q.fillRect(4, y, 120, 1); }
    Q(4, OT - 4, 120, 4, "#3a2a14"); Q(4, OT - 1, 120, 1, "#c8862a");
    for (const x of [44, 84]) { Q(x, OT - 4, 2, OD + 4, "#c8ced6"); Q(x, OT - 4, 1, OD + 4, "#eef2f6"); }
    // 앞 턱
    Q(0, LIP, 128, 5, "#d8dee4"); Q(0, LIP, 128, 1, "#ffffff"); Q(0, LIP + 4, 128, 1, "#6a727c");
    // 앞판: 바구니 번호판, 온도계, 불 손잡이, 로고
    const pT = LIP + 6, pB = CY - 2;
    Q(4, pT + 13, 120, pB - pT - 13, "#98a0a8"); Q(4, pT + 13, 120, 1, "#7a828c");
    const ky = Math.round((pT + 16 + pB) / 2);
    Q(14, ky - 9, 18, 18, "#e8ecf0"); Q(15, ky - 8, 16, 16, "#f8f8f4"); Q(14, ky - 9, 18, 1, "#ffffff");
    for (let a = 0; a < 7; a++) { const t = Math.PI * (0.8 + a / 6 * 1.4); Q(23 + Math.round(Math.cos(t) * 6), ky + 1 + Math.round(Math.sin(t) * 6), 1, 1, a > 4 ? "#e0402a" : "#3a3a44"); }
    Q(96, ky - 9, 24, 18, "#2a1d14"); Q(97, ky - 8, 22, 16, "#3a2616");
    q.fillStyle = "#ffb03b"; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) q.fillRect(108 + x, ky + y, 1, 1);
    Q(105, ky - 3, 6, 6, "#c0302a"); Q(106, ky - 5, 2, 2, "#e0402a"); Q(109, ky - 2, 3, 2, "#ffe08a"); Q(106, ky - 2, 1, 1, "#1a1a1a");
    // 조리대
    Q(0, CY, W, H - CY, "#7a5a3e"); for (let y = CY + 4; y < H; y += 6) Q(0, y, W, 1, "#6e5036");
    Q(0, CY, W, 4, "#c8ced6"); Q(0, CY, W, 1, "#f4f8fa"); Q(0, CY + 4, W, 1, "#4a3420");
    Q(0, PR - 2, W, 2, "#5a3e28"); Q(0, PR, W, H - PR, "#4e3624"); Q(0, PR, W, 1, "#6e5036");
    // 반죽 쟁반
    Q(3, CY + 8, 38, 24, "#c8ced6"); Q(3, CY + 8, 38, 1, "#f4f8fa"); Q(4, CY + 10, 36, 20, "#e8ecf0"); Q(3, CY + 31, 38, 1, "#7a828c");
    for (let k = 0; k < 18; k++) Q(5 + ((k * 13) % 34), CY + 11 + ((k * 7) % 18), 1, 1, "#ffffff");
    // 버무림 볼
    for (let y = -11; y <= 11; y++) { const w = Math.round(26 * Math.sqrt(1 - (y / 11.5) ** 2)); Q(72 - w, CY + 20 + y, w * 2, 1, y < -7 ? "#e8ecf0" : y < 0 ? "#c0c8d0" : mix("#a8b0b8", "#6a727c", y / 11)); }
    for (let y = -7; y <= -1; y++) { const w = Math.round(22 * Math.sqrt(1 - (y / 7.5) ** 2)); Q(72 - w, CY + 15 + y + 2, w * 2, 1, "#8a929c"); }
    Q(50, CY + 12, 44, 1, "#ffffff");
    // 포장대
    Q(102, CY + 8, 56, 26, "#5e4230"); Q(102, CY + 8, 56, 1, "#8a6448");
    return c;
  }

  // ── 상태 ──
  const orders = [], served = [], fx = [], flies = [], drips = [];
  const bk = BX.map(() => ({ o: null, st: "empty", d: 0, age: 0, lift: 0, upT: 0, smoke: 0 }));
  const bowl = { o: null, sauce: false, coat: 0, arr: 1, pour: 0 };
  const box = { o: null, mu: false, t: 0, lid: 0, arr: 1, muArr: 0 };
  const rider = { st: "none", x: 176, t: 0, carry: 0 };
  let over = false, last = 0, t0 = 0, el = 0, oid = 0, sizT = 0, nextI = 0, mistakes = 0, burns = 0, wrongs = 0;
  let flare = null; const flares = []; let flareAt = [10.5, 20.5];
  let drag = null, rubAt = null, rubSnd = 0;
  const SCHED = [0.3, 3, 6, 9, 11.5, 14, 16.5, 19, 21.5, 23.5];
  let firstS = shuffle(["f", "y", "g"]);

  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = x * K + "px"; b.style.top = (y - 2) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1300); };
  const updSc = () => (F.sc.textContent = `배달 ${served.filter((o) => !o.cx).length} · ★${avgStar()}`);
  const avgStar = () => { const s = served.filter((o) => !o.cx); return s.length ? (s.reduce((a, o) => a + o.stars, 0) / s.length).toFixed(1) : "-"; };

  // ── 소리 ──
  const S = {
    sizzle: (n, fresh) => { noise(0.14, 5200 + rnd() * 2400, 0.008 + 0.006 * n + (fresh ? 0.03 : 0), 0, 0.6); if (rnd() < 0.25 + n * 0.15) tone(2600 + rnd() * 2600, 0.012, "square", 0.012); },
    drop: () => { noise(0.7, 3800, 0.16, 0, 0.5); noise(0.25, 900, 0.1, 0, 0.8); for (let k = 0; k < 8; k++) tone(2200 + rnd() * 3000, 0.012, "square", 0.025, 0, 0.05 + k * 0.05); },
    lift: () => { noise(0.22, 2400, 0.08, 0, 0.7); tone(300, 0.15, "sine", 0.05, 260); },
    tak: (at) => { tone(1900, 0.03, "square", 0.07, 0, at); noise(0.04, 3200, 0.12, at, 2); tone(420, 0.06, "triangle", 0.08, -100, at); },
    drip: () => tone(1700 + rnd() * 600, 0.03, "sine", 0.025, 900),
    pour: (s) => { if (s === "f") for (let k = 0; k < 6; k++) noise(0.04, 6000, 0.06, k * 0.06, 3); else { noise(0.35, 500, 0.12, 0, 1.2); tone(200, 0.3, "sine", 0.08, -80); } },
    rub: () => { noise(0.08, 700 + rnd() * 500, 0.08, 0, 1.6); tone(140 + rnd() * 40, 0.05, "sine", 0.04); },
    crunch: () => { for (let k = 0; k < 5; k++) noise(0.025, 2500 + rnd() * 2500, 0.12, k * 0.03, 2.5); },
    mu: () => { tone(500, 0.06, "sine", 0.12, 400); noise(0.05, 1200, 0.06, 0.03); },
    lid: () => { tone(160, 0.09, "sine", 0.2, -60); noise(0.05, 800, 0.1); },
    bike: () => { tone(90, 0.5, "sawtooth", 0.05, 70); tone(180, 0.45, "square", 0.02, 120, 0.05); },
    order: () => { tone(1500, 0.05, "square", 0.04); tone(1500, 0.05, "square", 0.04, 0, 0.09); for (let k = 0; k < 6; k++) noise(0.03, 3000, 0.04, 0.2 + k * 0.035, 3); },
    flare: () => { noise(0.5, 1500, 0.16, 0, 0.5); for (let k = 0; k < 10; k++) tone(2000 + rnd() * 3000, 0.015, "square", 0.04, 0, k * 0.04); },
    knob: () => { tone(900, 0.03, "square", 0.08); tone(600, 0.05, "square", 0.06, 0, 0.05); },
    burnt: () => { tone(200, 0.4, "sawtooth", 0.06, -120); noise(0.4, 600, 0.08); },
    review: (n) => { tone(1318 * Math.pow(1.03, n), 0.08, "triangle", 0.06); tone(1760 * Math.pow(1.03, n), 0.1, "triangle", 0.05, 0, 0.07); },
  };

  // ── 주문 ──
  const newOrder = (s) => {
    const o = { id: ++oid, s: s || (firstS.length ? firstS.shift() : pick(["f", "y", "y", "g", "g", "f"])), t0: el, pat: 16 * ez, st: "wait", b: -1, wrong: 0, crisp: 0, mu: false, tx: 140, d0: 0.7 };
    orders.push(o); S.order(); return o;
  };
  const waiting = () => orders.filter((o) => o.st === "wait").sort((a, b) => a.id - b.id);
  const live = () => orders.filter((o) => o.st !== "done" && o.st !== "cx");
  const finishOrder = (o, cx = false) => {
    o.st = cx ? "cx" : "done"; o.cx = cx; o.t1 = el;
    if (cx) { o.stars = 1; served.push(o); F.miss(null); F.msg("주문이 취소됐어요… 별점 ★1"); updSc(); return; }
    let s = 5; if (o.crisp < 1) s--; if (o.wrong) s--; if (!o.mu) s -= 2; if (tut < 0 && o.t1 - o.t0 > 16 * ez) s--;
    o.stars = Math.max(1, s); served.push(o);
    const [px, py] = stageXY(143, CY - 30);
    if (o.stars >= 5) { F.hit([px, py], "★5", "#ffd23f"); bubble(140, CY - 34, "바삭함 미쳤다 ★5"); }
    else { F.float([px, py], stars(o.stars), o.stars <= 3 ? "bad" : ""); if (!o.mu) bubble(140, CY - 34, "무 어디 갔어요?", "angry"); }
    S.review(served.length); updSc();
  };

  // ── 행동 ──
  const drop = (i, fromX, fromY) => {
    const b = bk[i];
    if (b.st !== "empty") { F.msg("그 바구니는 쓰는 중이에요"); SFX.tok(); return false; }
    const w = waiting()[0];
    if (!w) { F.msg("주문표가 들어오면 넣어요"); SFX.tok(); return false; }
    w.st = "fry"; w.b = i; Object.assign(b, { o: w, st: "oil", d: 0, age: 0, lift: 0, smoke: 0 });
    S.drop(); vib(18);
    for (let k = 0; k < 16; k++) fx.push({ x: BX[i] + 4 + rnd() * (BW - 8), y: OT + 6 + rnd() * 10, vx: rnd() * 50 - 25, vy: -30 - rnd() * 40, t: 0.45 + rnd() * 0.2, c: pick(["#ffe9a0", "#fff6d0", "#f0b040"]) });
    F.burst(stageXY(BX[i] + BW / 2, OT + 10), "#ffd27a", 8);
    if (tut === 1) setTimeout(() => tut === 1 && tutNext(2), 500);
    return true;
  };
  const liftB = (i) => {
    const b = bk[i]; if (b.st !== "oil") return;
    if (b.d < 0.6) { mistakes += tut < 0 ? 1 : 0; F.msg("아직 연노랑이에요! 황금색까지 조금만"); SFX.fail(); b.lift = 0.35; b.bob = 0.35; vib(10); return; }
    if (b.d >= 1) {
      burns += tut < 0 ? 1 : 0; S.burnt(); F.miss(stageXY(BX[i] + BW / 2, OT)); F.msg("탔어요… 버리고 다시 튀겨요");
      const o = b.o; o.st = "wait"; o.b = -1; o.pat = Math.max(o.pat, 6 * ez);
      for (let k = 0; k < 10; k++) fx.push({ x: BX[i] + rnd() * BW, y: OT + rnd() * 8, vx: rnd() * 16 - 8, vy: -14 - rnd() * 14, t: 0.9, c: "#3a3a40", smoke: 1 });
      Object.assign(b, { o: null, st: "empty", d: 0, lift: 0 }); return;
    }
    const o = b.o; o.crisp = b.d < 0.8 ? 1 : 0.6; o.d0 = b.d; b.st = "up"; b.upT = 0; b.lift = 0; b.bob = 0;
    S.lift(); S.tak(0.32); S.tak(0.5); vib(12);
    if (o.crisp === 1) { F.hit(stageXY(BX[i] + BW / 2, OT - 8), "황금!", "#ffd23f"); S.crunch(); }
    else F.float(stageXY(BX[i] + BW / 2, OT - 8), "살짝 진함", "bad");
    if (tut === 2) tutWait = 1;
  };
  const pour = (s) => {
    if (!bowl.o || bowl.arr < 1) { F.msg("볼이 비었어요. 튀긴 닭이 오면 버무려요"); SFX.tok(); return; }
    if (bowl.sauce) { F.msg("이제 볼을 문질러 버무려요!"); SFX.tok(); return; }
    if (s !== bowl.o.s) { if (tut < 0) { bowl.o.wrong = 1; wrongs++; } F.miss(stageXY(72, CY + 14)); F.msg(`주문표는 ${SAU[bowl.o.s].n}예요!`); return; }
    bowl.sauce = true; bowl.pour = 0.6; S.pour(s); vib(10);
    if (tut === 3) tutNext(3.5);
  };
  const rub = (dist, x, y) => {
    if (!bowl.o || bowl.arr < 1) return;
    if (!bowl.sauce) { if (dist > 3) F.msg(`먼저 ${SAU[bowl.o.s].n} 통을 톡!`); return; }
    if (bowl.coat >= 1) return;
    bowl.coat = Math.min(1, bowl.coat + dist / (85 / Math.sqrt(ez)));
    rubSnd += dist; if (rubSnd > 10) { rubSnd = 0; S.rub(); vib(4); }
    if (rnd() < 0.4) fx.push({ x: x + rnd() * 8 - 4, y: y + rnd() * 4, vx: rnd() * 30 - 15, vy: -15 - rnd() * 15, t: 0.3, c: SAU[bowl.o.s].glaze || "#fff2c0" });
    if (bowl.coat >= 1) { S.crunch(); F.float(stageXY(72, CY + 8), "착착!"); }
  };
  const addMu = () => {
    if (!box.o || box.arr < 1) { F.msg("박스에 치킨이 담기면 무를 넣어요"); SFX.tok(); return; }
    if (box.mu) { SFX.tok(); return; }
    box.mu = true; box.o.mu = true; box.muArr = 0; S.mu(); vib(10);
    F.hit(stageXY(146, CY + 14), "무!", "#ffffff");
  };
  const fixFlare = () => {
    if (!flare) return; flare.t1 = el; flare = null; S.knob(); vib(15); F.hit(stageXY(23, knobY()), "불 줄임", "#7fe0ff"); F.msg("불 조절 완료! 기름이 잠잠해요");
  };
  const knobY = () => Math.round((LIP + 6 + 16 + CY - 2) / 2);

  // ── 할 일 손가락 ──
  const FUP = fingerURL(false), FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.m || ""}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "c1go"; return; }
    const up = (o.y < 60 && o.m !== "lf") || o.m === "dr";
    goI.style.backgroundImage = `url(${up || o.m === "lf" ? FUP : FDN})`;
    goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px"; goT.innerHTML = o.t; goT.style.transform = o.x < 30 ? "translateX(-22%)" : o.x > 130 ? "translateX(-80%)" : "";
    if (o.m === "dr") { goI.style.setProperty("--dx", o.dx * K + "px"); goI.style.setProperty("--dy", o.dy * K + "px"); }
    goEl.className = "c1go on " + (o.m === "lf" ? "up lf" : up ? "up" : "dn") + (o.m === "sw" ? " sw" : o.m === "dr" ? " dr" : "");
  };
  const dragHint = (i) => ({ x: 22, y: CY + 18, t: "닭을 <b>끌어</b> 바구니로", m: "dr", dx: BX[i] + BW / 2 - 22, dy: OT + 14 - (CY + 18) });
  const taskNow = () => {
    if (flare) return { x: 23, y: knobY() - 2, t: "불 손잡이 <b>톡!</b>" };
    const gi = bk.findIndex((b) => b.st === "oil" && b.d >= 0.6 && b.d < 1);
    if (gi >= 0) return { x: BX[gi] + BW / 2, y: LIP + 4, t: bk[gi].d < 0.8 ? "황금! <b>위로 쓱</b>" : "<b>얼른</b> 건져요!", m: "lf" };
    const bi = bk.findIndex((b) => b.st === "oil" && b.d >= 1);
    if (bi >= 0) return { x: BX[bi] + BW / 2, y: LIP + 4, t: "탔어요! 건져서 <b>버리기</b>", m: "lf" };
    if (box.o && box.arr >= 1 && !box.mu) return { x: 2 + 3 * 39 + 19, y: PR + 6, t: "치킨무 <b>톡!</b>" };
    if (bowl.o && bowl.arr >= 1 && !bowl.sauce) { const i = POTS.indexOf(bowl.o.s); return { x: 2 + i * 39 + 19, y: PR + 6, t: `${SAU[bowl.o.s].n} <b>톡!</b>` }; }
    if (bowl.o && bowl.arr >= 1 && bowl.sauce && bowl.coat < 1 && !box.o) return { x: 72, y: CY + 18, t: "<b>문질러</b> 버무리기", m: "sw" };
    if (tut >= 0 || el < 9) { const e = bk.findIndex((b) => b.st === "empty"); if (e >= 0 && waiting().length) return dragHint(e); }
    return null;
  };

  // ── 리허설 ──
  let tut = 0, tutT = 0, tutWait = 0;
  const SKIP = `<button class="c1skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "low", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop"); tutEl.style.top = (n === 5 ? 30 : n === 1 ? LIP + 19 : n === 2 ? CY + 2 : FY + 2) * K + "px";
    if (n === 1) { tutP.innerHTML = `주문표가 들어왔어요! (위 레일)<br>아래 <b>반죽한 닭</b>을 <b>끌어서</b> 튀김 바구니에 넣어요.`; tutB.innerHTML = SKIP; }
    else if (n === 2) { tutP.innerHTML = `지글지글~ 색이 <b>연노랑 → 황금 → 갈색 → 탄 색</b>으로 변해요.<br><b>황금색</b>이 되면 바구니를 <b>위로 쓱</b> 끌어 올려요!`; tutB.innerHTML = SKIP; }
    else if (n === 3) { tutP.innerHTML = `주문표가 <b class="rd">${SAU[bowl.o ? bowl.o.s : "y"].n}</b>예요.<br>아래 <b>${SAU[bowl.o ? bowl.o.s : "y"].n} 통을 톡</b> 해서 소스를 부어요.`; tutB.innerHTML = SKIP; }
    else if (n === 3.5) { tutP.innerHTML = `이제 <b>볼을 문질러</b> 골고루 버무려요!`; tutB.innerHTML = SKIP; }
    else if (n === 4) { tutP.innerHTML = `박스에 담겼어요. <b>치킨무를 톡!</b><br>무를 빠뜨리면 <b class="rd">별점이 깎여요</b>.`; tutB.innerHTML = SKIP; }
    else if (n === 5) {
      tutP.innerHTML = `좋아요! 영업 중엔 주문이 몰려요.<br>바구니 <b>3개</b>를 같이 굴리고,<br><b class="rd">불이 세지면</b> 기름이 튀어요 → <b>불 손잡이 톡</b>!<br>할 일은 <b>손가락</b>이 짚어 줘요.`;
      tutB.innerHTML = `<button class="c1go2" data-go>영업 시작!</button>`;
    }
  };
  const resetAll = () => {
    orders.length = 0; served.length = 0; flies.length = 0; fx.length = 0;
    bk.forEach((b) => Object.assign(b, { o: null, st: "empty", d: 0, age: 0, lift: 0, upT: 0, smoke: 0 }));
    Object.assign(bowl, { o: null, sauce: false, coat: 0, arr: 1, pour: 0 }); Object.assign(box, { o: null, mu: false, t: 0, lid: 0, arr: 1, muArr: 0 });
    Object.assign(rider, { st: "none", x: 176, t: 0, carry: 0 }); flare = null; flares.length = 0; mistakes = 0; burns = 0; wrongs = 0; oid = 0; nextI = 0;
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null); drag = null;
    resetAll(); firstS = shuffle(["f", "y", "g"]); t0 = 0; el = 0; SFX.go?.();
    timer(T, F.bar, end); updSc();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 입력 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const bkAt = (x, y) => { if (y < OT - 18 || y > LIP + 16) return -1; for (let i = 0; i < 3; i++) if (x >= BX[i] - 2 && x < BX[i] + BW + 2) return i; return -1; };
  const allow = (kind) => tut < 0 || (tut === 1 && kind === "raw") || (tut === 2 && kind === "bk") || (tut === 3 && kind === "pot") || (tut === 3.5 && kind === "rub") || (tut === 4 && kind === "mu");
  const down = (x, y) => {
    if (over || tut === 0 || tut === 5) return;
    if (flare && Math.abs(x - 23) < 12 && Math.abs(y - knobY()) < 12) return fixFlare();
    if (y >= PR - 1) { const i = clamp(Math.floor((x - 2) / 39), 0, 3); if (i === 3) { if (allow("mu")) addMu(); } else if (allow("pot")) pour(POTS[i]); return; }
    if (x < 42 && y >= CY + 4) { if (!allow("raw")) return; drag = { k: "raw", x, y, x0: x, y0: y }; SFX.tok(); return; }
    const bi = bkAt(x, y); if (bi >= 0) { if (!allow("bk")) return; drag = { k: "bk", i: bi, y0: y, done: false }; return; }
    if (x >= 44 && x < 100 && y >= CY + 4 && y < PR) { if (!allow("rub")) return; drag = { k: "rub" }; rubAt = [x, y]; rub(4, x, y); return; }
    if (x >= 102 && y >= CY + 4 && y < PR) { if (box.o && !box.mu) { F.msg("오른쪽 아래 치킨무 통을 톡!"); SFX.tok(); } return; }
  };
  const move = (x, y, px, py) => {
    if (!drag || over) return;
    if (drag.k === "raw") { drag.x = x; drag.y = y; }
    else if (drag.k === "bk" && !drag.done) { if (drag.y0 - y > 7) { drag.done = true; liftB(drag.i); } }
    else if (drag.k === "rub") { if (x >= 40 && x < 104 && y >= CY && y < PR + 2) { rubAt = [x, y]; rub(Math.hypot(x - px, y - py), x, y); } else rubAt = null; }
  };
  const upE = (x, y) => {
    if (!drag) return; const d = drag; drag = null; rubAt = null;
    if (d.k === "raw") {
      const bi = bkAt(x, y);
      if (bi >= 0) drop(bi);
      else if (Math.hypot(x - d.x0, y - d.y0) < 5) { const e = bk.findIndex((b) => b.st === "empty"); if (e >= 0 && waiting().length) drop(e); else drop(0); }
      else { F.msg("튀김 바구니 위에서 놓아요"); SFX.tok(); }
    } else if (d.k === "bk" && !d.done && bk[d.i].st === "oil") F.msg("바구니를 위로 쓱 끌어 올려요!");
  };
  let lastP = null;
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = toL(e); lastP = [x, y]; down(x, y); });
  cv.addEventListener("pointermove", (e) => { if (!lastP) return; const [x, y] = toL(e); move(x, y, lastP[0], lastP[1]); lastP = [x, y]; });
  const up = (e) => { const [x, y] = lastP ? (e && e.clientX != null ? toL(e) : lastP) : [0, 0]; upE(x, y); lastP = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", () => { drag = null; rubAt = null; lastP = null; });

  // ── 이름표 ──
  lbEl.innerHTML = `<b>반죽 닭</b><b>버무림 볼</b><b>포장</b>` + POTS.map((s) => `<b>${s === "m" ? "치킨무" : SAU[s].n}</b>`).join("") + `<b class="br">황금닭</b><b class="ge">불</b>` + [0, 1, 2, 3].map(() => `<b class="tk"></b>`).join("");
  const lbs = [...lbEl.children];
  const place = (b, x, y, w, h) => Object.assign(b.style, { left: x * K + "px", top: y * K + "px", width: w * K + "px", height: h * K + "px", lineHeight: h * K + "px" });
  const placeLb = () => {
    place(lbs[0], 3, PR - 11, 38, 9); place(lbs[1], 48, PR - 11, 48, 9); place(lbs[2], 104, PR - 11, 52, 9);
    for (let i = 0; i < 4; i++) place(lbs[3 + i], 3 + i * 39, H - 10, 36, 9);
    const ky = knobY(); place(lbs[7], 92, ky + 9, 32, 10); place(lbs[8], 13, ky + 10, 20, 8);
  };
  placeLb();
  const setLb = (b, t, c) => { if (b.textContent !== t) b.textContent = t; if (b.className !== c) b.className = c; };
  const lbUpd = () => {
    const needSauce = bowl.o && bowl.arr >= 1 && !bowl.sauce, needMu = box.o && box.arr >= 1 && !box.mu;
    setLb(lbs[0], "반죽 닭", waiting().length && bk.some((b) => b.st === "empty") && tut !== 0 ? "on" : "");
    setLb(lbs[1], bowl.o && bowl.sauce && bowl.coat < 1 ? "문질러요!" : "버무림 볼", bowl.o && bowl.sauce && bowl.coat < 1 ? "on" : "");
    setLb(lbs[2], needMu ? "무 넣기!" : "포장", needMu ? "on" : "");
    POTS.forEach((s, i) => setLb(lbs[3 + i], s === "m" ? "치킨무" : SAU[s].n, (needSauce && bowl.o.s === s) || (s === "m" && needMu) ? "on" : ""));
    setLb(lbs[8], flare ? "불 톡!" : "불", flare ? "ge on" : "ge");
    const L = live().sort((a, b) => a.id - b.id);
    for (let i = 0; i < 4; i++) {
      const b = lbs[9 + i], o = L[i];
      if (!o) { b.style.display = "none"; continue; }
      b.style.display = ""; place(b, Math.round(o.tx), 20, 29, 9); b.style.background = SAU[o.s].band; b.style.color = o.s === "f" ? "#3a2400" : "#fff";
      setLb(b, SAU[o.s].n, "tk" + (o.st === "wait" ? "" : " dim"));
    }
  };

  // ── 그리기 ──
  const drawTicket = (o, tm) => {
    const x = Math.round(o.tx), y = 5, warn = o.st === "wait" && o.pat < 5 * ez && Math.floor(tm * 4) % 2;
    P(x + 13, 3, 3, 3, "#8a929c"); P(x + 14, 3, 1, 2, "#e8ecf0");
    P(x, y, 29, 24, warn ? "#ffe0d8" : "#fffef6"); P(x + 28, y + 1, 1, 23, "#d8d4c4"); P(x, y + 23, 29, 1, "#c8c4b4");
    for (let k = 0; k < 29; k += 3) P(x + k, y + 24, 2, 1, "#fffef6");
    P(x + 2, y + 2, 4, 1, "#8a8478"); P(x + 2, y + 4, 6, 1, "#c8c4b4");
    const col = o.s === "f" ? GOLD : mix(GOLD, SAU[o.s].glaze, 0.8);
    piece(P, x + 3, y + 7, col, 0, o.s !== "f");
    g.drawImage(MUC, x + 17, y + 5);
    if (o.st === "wait") { const r = c01(o.pat / (16 * ez)); P(x + 2, y + 13, 25, 2, "#e8e4d4"); P(x + 2, y + 13, Math.round(25 * r), 2, r < 0.35 ? "#e0402a" : r < 0.6 ? "#ffb03b" : "#5fc070"); }
    else if (o.st === "fry") { P(x + 3, y + 13, 23, 2, "#c8ced6"); for (let k = 0; k <= o.b; k++) P(x + 20 + k * 2 - o.b, y + 13, 1, 2, "#2a2a30"); P(x + 4, y + 13, Math.round(14 * c01(bk[o.b] ? bk[o.b].d / 0.7 : 1)), 2, GOLD); }
    else { P(x + 10, y + 14, 2, 1, "#3fae5a"); P(x + 12, y + 15, 1, 1, "#3fae5a"); P(x + 13, y + 12, 1, 3, "#3fae5a"); P(x + 14, y + 11, 1, 2, "#3fae5a"); }
  };
  const drawBasket = (i, tm) => {
    const b = bk[i], x = BX[i];
    const lf = b.st === "up" || b.st === "hang" ? Math.min(1, b.lift) : b.lift > 0 && b.bob ? Math.sin((1 - b.lift / 0.35) * Math.PI) * 0.3 : 0;
    const ly = -Math.round(lf * 16), by = OT + 2 + ly, bh = OD - 6;
    const shake = b.st === "up" && b.upT > 0.28 && b.upT < 0.62 ? ((b.upT > 0.3 && b.upT < 0.38) || (b.upT > 0.48 && b.upT < 0.56) ? 2 : 0) : 0;
    const yy = by + shake;
    // 바구니 그림자(들렸을 때)
    if (lf > 0.2) { g.fillStyle = "rgba(60,30,0,.35)"; g.fillRect(x + 2, OT + 6, BW - 4, bh - 4); }
    // 망
    P(x, yy, BW, bh, lf > 0.2 ? "rgba(70,74,80,.35)" : "rgba(60,40,10,.25)");
    g.fillStyle = lf > 0.2 ? "rgba(140,146,156,.55)" : "rgba(120,80,20,.35)";
    for (let k = 3; k < BW; k += 4) g.fillRect(x + k, yy + 1, 1, bh - 2);
    for (let k = 4; k < bh; k += 4) g.fillRect(x + 1, yy + k, BW - 2, 1);
    // 치킨
    if (b.o) {
      const col = dcol(b.d), cy0 = yy + Math.round(bh / 2) - 10;
      cluster(P, x, cy0, col, lf > 0.5);
      if (b.st === "oil") {
        // 기름에 잠긴 기운 + 거품
        g.fillStyle = "rgba(200,120,20,.28)"; g.fillRect(x, yy + Math.round(bh * 0.55), BW, Math.round(bh * 0.45));
        const fresh = b.age < 0.7, n = Math.round((fresh ? 26 : 5) + 12 * (1 - Math.min(1, b.d / 0.95)) + (flare ? 10 : 0));
        for (let k = 0; k < n; k++) {
          const sp = 1.8 + (k % 3) * 0.6, ph = (tm * sp + k * 0.618) % 1, cyc = Math.floor(tm * sp + k * 0.618);
          const bx2 = x + 1 + ((k * 37 + cyc * 13) % (BW - 3)), by2 = yy + 1 + ((k * 19 + cyc * 7) % (bh - 3));
          if (ph < 0.75) P(bx2, by2, 1, 1, fresh ? "#fffbe8" : "#ffe9a0");
          else { P(bx2 - 1, by2, 1, 1, "#fff2c0"); P(bx2 + 1, by2, 1, 1, "#fff2c0"); P(bx2, by2 - 1, 1, 1, "#fff2c0"); P(bx2, by2 + 1, 1, 1, "#fff2c0"); }
        }
        if (fresh) for (let k = 0; k < 14; k++) P(x + rint(BW), yy + rint(bh), 2, 1, "#ffffffc0");
        // 황금 반짝
        if (b.d >= 0.6 && b.d < 0.8 && Math.floor(tm * 6) % 2) for (const [a, c] of [[3, 2], [BW - 5, 4], [14, bh - 4]]) { P(x + a, yy + c - 1, 1, 3, "#fff6b0"); P(x + a - 1, yy + c, 3, 1, "#fff6b0"); }
        // 탄 연기
        if (b.d >= 0.92) b.smoke += 0;
      }
    }
    // 테두리
    P(x - 1, yy - 1, BW + 2, 1, "#c8ced6"); P(x - 1, yy + bh, BW + 2, 1, "#5a626c"); P(x - 1, yy, 1, bh, "#a8b0b8"); P(x + BW, yy, 1, bh, "#6a727c");
    // 손잡이(앞 턱으로 나온다)
    const hy = yy + bh + 1, hl = LIP + 10 - hy + (lf > 0.2 ? -4 : 0);
    P(x + 15, hy, 1, Math.max(2, hl - 6), "#9aa0a8"); P(x + 20, hy, 1, Math.max(2, hl - 6), "#9aa0a8");
    P(x + 13, hy + Math.max(2, hl - 6), 10, 6, "#2a2a30"); P(x + 13, hy + Math.max(2, hl - 6), 10, 1, "#4a4a54"); P(x + 14, hy + Math.max(2, hl - 6) + 2, 8, 1, b.o && b.st === "oil" ? SAU[b.o.s].band : "#3a3a44");
  };
  const drawGauge = (i, tm) => {
    const b = bk[i], x = BX[i] + 2, y = LIP + 13, w = BW - 4;
    P(x - 1, y - 1, w + 2, 6, "#2a1d14");
    const seg = [[0, 0.6, "#f2d27e"], [0.6, 0.8, GOLD], [0.8, 1, "#874616"], [1, 1.12, "#2e1d12"]];
    for (const [a, c, col] of seg) P(x + Math.round(a / 1.12 * w), y, Math.round((c - a) / 1.12 * w), 4, col);
    P(x + Math.round(0.6 / 1.12 * w), y - 1, 1, 6, "#fff6b0"); P(x + Math.round(0.8 / 1.12 * w), y - 1, 1, 6, "#fff6b0");
    if (b.st === "oil") { const m = x + Math.round(Math.min(1.12, b.d) / 1.12 * w); P(m - 1, y - 3, 3, 1, "#ffffff"); P(m, y - 2, 1, 7, "#ffffff"); if (b.d >= 0.6 && b.d < 0.8 && Math.floor(tm * 8) % 2) { g.fillStyle = "rgba(255,240,150,.5)"; g.fillRect(x + Math.round(0.6 / 1.12 * w), y, Math.round(0.2 / 1.12 * w) + 1, 4); } }
  };
  const drawRider = (tm) => {
    if (rider.st === "none") return;
    g.save(); g.beginPath(); g.rect(130, 18, 27, CY - 21); g.clip();
    const walking = rider.st === "in" || rider.st === "out", f = walking ? Math.floor(tm * 8) % 4 : 0;
    const c = uSprite(RIDER, (walking ? "s" : "f") + f + (rider.st === "out" ? "o" : ""), walking ? { v: "s", f } : { v: "f", f: 0, arm: null }, rider.st === "in");
    const x = Math.round(rider.x - 8), y = CY - 33;
    g.drawImage(c, x, y);
    if (rider.carry) g.drawImage(BOXC, x - 4, y + 12);
    g.restore();
  };
  const drawBowl = (tm) => {
    if (!bowl.o) return;
    const o = bowl.o;
    if (bowl.arr < 1) return;
    const col = clusterCol(o, bowl.coat);
    cluster(P, 54, CY + 8, col, bowl.coat > 0.5 && o.s !== "f");
    if (bowl.sauce && bowl.coat < 1) {
      const gz = SAU[o.s].glaze;
      if (gz) { g.fillStyle = gz; const r = Math.round(9 * (1 - bowl.coat)); for (let k = -r; k <= r; k++) g.fillRect(66 + k, CY + 12 + Math.round(Math.abs(k) * 0.3), 1, 3 - Math.round(Math.abs(k) / 5)); P(64, CY + 12, 3, 1, "#ffffff80"); }
      else for (let k = 0; k < Math.round(20 * (1 - bowl.coat)); k++) P(56 + ((k * 13) % 34), CY + 9 + ((k * 7) % 14), 1, 1, "#ffffff");
    }
    if (bowl.pour > 0) {
      const s = o.s, gz = SAU[s].glaze;
      if (gz) { P(68, CY - 6, 3, 18, gz); P(69, CY - 6, 1, 18, mix(gz, "#ffffff", 0.3)); }
      else for (let k = 0; k < 10; k++) P(62 + rint(14), CY - 4 + rint(16), 1, 1, "#ffffff");
    }
    if (bowl.coat >= 1 && Math.floor(tm * 5) % 2) for (const [a, c] of [[58, CY + 8], [86, CY + 12], [72, CY + 20]]) { P(a, c - 1, 1, 3, "#fff6b0"); P(a - 1, c, 3, 1, "#fff6b0"); }
  };
  const drawBox = (tm) => {
    if (!box.o || box.arr < 1) return;
    const o = box.o, x = 106, y = CY + 10, cl = box.lid;
    // 열린 뚜껑 → 닫힘
    if (cl < 1) { const lh = Math.round(12 * (1 - cl)); P(x + 1, y - lh, 34, lh, "#e8b878"); P(x + 1, y - lh, 34, 1, "#fadca8"); if (lh > 5) { P(x + 14, y - lh + 2, 7, 6, "#ffb03b"); P(x + 15, y - lh + 3, 5, 4, "#c0302a"); } }
    P(x, y, 36, 18, "#d9a868"); P(x, y, 36, 1, "#f0c88a"); P(x + 35, y + 1, 1, 17, "#a8763e"); P(x, y + 17, 36, 1, "#a8763e");
    if (cl < 0.6) { P(x + 2, y + 1, 32, 8, "#fffef6"); cluster(P, x + 1, y - 7, clusterCol(o, 1), o.s !== "f"); }
    else { P(x + 1, y + 1, 34, 6, "#e8b878"); P(x + 14, y + 1, 7, 5, "#ffb03b"); P(x + 15, y + 2, 5, 3, "#c0302a"); }
    P(x + 4, y + 11, 28, 3, SAU[o.s].band);
    // 무 자리
    if (box.mu) { const a = Math.min(1, box.muArr); g.drawImage(MUC, 143, Math.round(y + 2 - (1 - a) * 22)); }
    else if (Math.floor(tm * 4) % 2) { P(144, y + 4, 10, 9, "rgba(255,255,255,.35)"); P(144, y + 4, 10, 1, "#ffffff"); P(144, y + 12, 10, 1, "#ffffff"); }
  };
  const drawPots = (tm) => {
    POTS.forEach((s, i) => {
      const x = 2 + i * 39, y = PR + 2, act = (bowl.o && bowl.arr >= 1 && !bowl.sauce && bowl.o.s === s) || (s === "m" && box.o && !box.mu && box.arr >= 1);
      const j = act && Math.floor(tm * 6) % 2 ? -1 : 0;
      if (act) { g.fillStyle = "rgba(255,210,63,.25)"; g.fillRect(x, PR, 37, H - PR - 11); }
      const cx = x + 18;
      if (s === "f") { // 시즈닝 통
        P(cx - 6, y + 4 + j, 12, 16, "#f4f0e4"); P(cx - 6, y + 4 + j, 12, 1, "#ffffff"); P(cx + 5, y + 5 + j, 1, 15, "#c8c4b4");
        P(cx - 5, y + 1 + j, 10, 3, "#ffc23f"); for (let k = 0; k < 4; k++) P(cx - 4 + k * 2, y + 2 + j, 1, 1, "#7a5010");
        P(cx - 6, y + 10 + j, 12, 5, "#ffc23f"); P(cx - 3, y + 11 + j, 6, 3, "#c0302a");
      } else if (s === "m") { // 무 통
        P(cx - 9, y + 6 + j, 18, 14, "#e8f0f0"); P(cx - 9, y + 6 + j, 18, 1, "#ffffff"); P(cx + 8, y + 7 + j, 1, 13, "#b8c4c4");
        for (let k = 0; k < 8; k++) P(cx - 7 + (k % 4) * 4, y + 9 + Math.floor(k / 4) * 4 + j, 3, 3, k % 3 ? "#fffbe8" : "#f6eec8");
        P(cx - 9, y + 4 + j, 18, 2, "#7fc0a0");
      } else { // 소스 냄비
        const gz = SAU[s].glaze;
        P(cx - 9, y + 7 + j, 18, 13, "#c8ced6"); P(cx - 9, y + 7 + j, 18, 1, "#f4f8fa"); P(cx + 8, y + 8 + j, 1, 12, "#7a828c");
        P(cx - 8, y + 6 + j, 16, 3, gz); P(cx - 5, y + 6 + j, 4, 1, mix(gz, "#ffffff", 0.45)); P(cx - 12, y + 9 + j, 3, 2, "#5a626c"); P(cx + 9, y + 9 + j, 3, 2, "#5a626c");
        P(cx - 7, y + 12 + j, 14, 4, SAU[s].band); P(cx + 4, y + 2 + j, 1, 6, "#8a6a40"); P(cx + 3, y + 1 + j, 3, 2, "#c8a060");
      }
    });
  };
  const drawKnob = (tm) => {
    const ky = knobY(), red = flare && Math.floor(tm * 6) % 2;
    // 바늘
    const ang = Math.PI * (flare ? 2.05 + Math.sin(tm * 30) * 0.05 : 1.45);
    for (let r = 1; r <= 5; r++) P(23 + Math.round(Math.cos(ang) * r), ky + 1 + Math.round(Math.sin(ang) * r), 1, 1, flare ? "#e0402a" : "#2a2a30");
    P(22, ky, 3, 3, "#2a2a30");
    if (red) { P(13, ky - 10, 20, 1, "#ff3b3b"); P(13, ky + 9, 20, 1, "#ff3b3b"); P(13, ky - 10, 1, 20, "#ff3b3b"); P(32, ky - 10, 1, 20, "#ff3b3b"); }
    // 불꽃(바닥 화구) 표시
    const fl = flare ? 5 : 2;
    for (let k = 0; k < 9; k++) { const h = fl + ((Math.floor(tm * 14) + k * 3) % 3); P(40 + k * 5, ky + 6 - h, 2, h, k % 2 ? "#4fa8ff" : flare ? "#ff7a2a" : "#8fd0ff"); }
    P(38, ky + 6, 46, 2, "#3a3a44");
  };
  const render = (tm) => {
    g.drawImage(BG, 0, 0);
    // 기름 일렁임
    for (let k = 0; k < 10; k++) { const ph = (tm * 0.4 + k * 0.1) % 1, y = OT + 2 + Math.round(((k * 7) % 10) / 10 * (OD - 4)); g.fillStyle = `rgba(255,230,140,${0.35 * Math.sin(ph * Math.PI)})`; g.fillRect(4 + Math.round(ph * 100 + k * 9) % 116, y, 6, 1); }
    // 주문표
    live().sort((a, b) => a.id - b.id).slice(0, 4).forEach((o) => drawTicket(o, tm));
    const more = live().length - 4; if (more > 0) for (let k = 0; k < Math.min(more, 3); k++) P(124 - k * 2, 6 + k, 2, 20, "#fffef6");
    // 프린터 빛
    if (orders.length && el - orders[orders.length - 1].t0 < 0.6 && tut < 0) P(132, 9, 23, 2, Math.floor(tm * 10) % 2 ? "#ffffff" : "#9fe0ff");
    drawRider(tm);
    // 바구니
    for (let i = 0; i < 3; i++) drawBasket(i, tm);
    // 김·연기
    bk.forEach((b, i) => {
      if (b.st !== "oil") return;
      const n = 3 + Math.round(4 * (1 - Math.min(1, b.d)));
      for (let k = 0; k < n; k++) { const ph = (tm * 0.7 + k / n + i * 0.3) % 1, xx = BX[i] + 4 + ((k * 11) % (BW - 8)) + Math.round(Math.sin(tm * 2 + k) * 3), yy = OT - 2 - Math.round(ph * 28); g.fillStyle = b.d >= 0.95 ? `rgba(60,60,64,${0.7 * (1 - ph)})` : `rgba(255,255,255,${0.45 * (1 - ph)})`; g.fillRect(xx, yy, 2 + (b.d >= 0.95 ? 1 : 0), 2); }
    });
    // 기름 방울(들린 바구니)
    for (const d of drips) P(Math.round(d.x), Math.round(d.y), 1, 2, "#f0c060");
    for (let i = 0; i < 3; i++) drawGauge(i, tm);
    drawKnob(tm);
    drawBowl(tm); drawBox(tm); drawPots(tm);
    // 쟁반 위 반죽 닭(무한)
    for (const [a, b2, k, sd] of [[4, CY + 11, 0, 0], [22, CY + 11, 2, 3], [5, CY + 21, 1, 1], [22, CY + 21, 0, 5]]) bigPiece(P, a, b2, dcol(0.02), k, false, sd);
    // 날아가는 치킨(바구니 → 볼 → 박스)
    for (const f of flies) { const p = c01(f.t / f.dur), e = 1 - Math.pow(1 - p, 2), x = f.a[0] + (f.b[0] - f.a[0]) * e, y = f.a[1] + (f.b[1] - f.a[1]) * e - Math.sin(p * Math.PI) * 14; cluster(P, Math.round(x), Math.round(y), f.col, f.gloss); }
    // 끌고 있는 닭
    if (drag && drag.k === "raw") { g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(Math.round(drag.x) - 10, Math.round(drag.y) + 6, 22, 3); bigPiece(P, Math.round(drag.x) - 12, Math.round(drag.y) - 8, dcol(0.02), 0, false, 2); bigPiece(P, Math.round(drag.x) - 2, Math.round(drag.y) - 3, dcol(0.02), 2, false, 4); for (let k = 0; k < 4; k++) P(Math.round(drag.x) - 6 + k * 4, Math.round(drag.y) + 4 + (k % 2) * 2 + (Math.floor(tm * 8) % 2), 1, 1, "#ffffff"); }
    // 문지르는 주걱
    if (rubAt) { const w = Math.round(Math.sin(tm * 24)); const x = Math.round(rubAt[0]) + w, y = Math.round(rubAt[1]); P(x - 1, y - 16, 2, 12, "#c89a5a"); P(x - 1, y - 16, 1, 12, "#e8c080"); P(x - 4, y - 5, 8, 5, "#e8ecf0"); P(x - 4, y - 5, 8, 1, "#ffffff"); }
    // 튀는 기름·불꽃·연기
    for (const s of fx) { if (s.smoke) { g.fillStyle = `rgba(50,50,56,${c01(s.t)})`; g.fillRect(Math.round(s.x), Math.round(s.y), 3, 3); } else if (s.big) { g.fillStyle = `rgba(255,190,60,${c01(s.t * 1.2) * 0.8})`; g.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 5, 5); g.fillStyle = `rgba(255,250,220,${c01(s.t) * 0.8})`; g.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); } else P(Math.round(s.x), Math.round(s.y), 1, 1, s.c); }
    // 불 셈: 붉은 기운
    if (flare) { g.fillStyle = `rgba(255,90,20,${0.1 + 0.06 * Math.sin(tm * 12)})`; g.fillRect(0, 0, 128, LIP + 6); }
  };

  // ── 매 프레임 ──
  const step = (dt) => {
    // 바구니
    bk.forEach((b, i) => {
      if (b.st === "oil") {
        b.age += dt;
        let r = 0.19 * (flare ? 1.7 : 1);
        if (b.d >= 0.6 && b.d < 0.8) r /= 1.35 * ez;
        if (tut >= 0) r *= 1.15;
        b.d += r * dt;
        if (tut >= 0 && b.d > 0.74) b.d = 0.74;
        if (b.d >= 1 && !b.burnSnd) { b.burnSnd = 1; F.msg("타고 있어요! 얼른 건져서 버려요"); S.burnt(); }
        if (b.lift > 0 && b.bob) { b.lift -= dt; if (b.lift <= 0) { b.lift = 0; b.bob = 0; } }
      } else b.burnSnd = 0;
      if (b.st === "up") {
        b.upT += dt; b.lift = Math.min(1, b.lift + dt * 6);
        if (rnd() < 0.5) drips.push({ x: BX[i] + 3 + rnd() * (BW - 6), y: LIP - 19, vy: 10, t: 0.5 });
        if ((b.upT > 0.32 && b.upT < 0.34) || (b.upT > 0.5 && b.upT < 0.52)) for (let k = 0; k < 6; k++) fx.push({ x: BX[i] + rnd() * BW, y: OT + 8, vx: rnd() * 40 - 20, vy: -20 - rnd() * 25, t: 0.35, c: "#ffd27a" });
        if (b.upT > 0.7) { b.st = "hang"; }
      }
      if (b.st === "hang") {
        if (rnd() < 0.15) drips.push({ x: BX[i] + 3 + rnd() * (BW - 6), y: LIP - 19, vy: 10, t: 0.4 });
        if (!bowl.o) {
          const o = b.o; Object.assign(bowl, { o, sauce: false, coat: 0, arr: 0, pour: 0 }); o.st = "bowl";
          flies.push({ a: [BX[i] + 1, OT - 8], b: [54, CY + 8], t: 0, dur: 0.38, col: dcol(o.d0), gloss: true, to: "bowl" });
          Object.assign(b, { o: null, st: "empty", d: 0, lift: 0, upT: 0 }); SFX.whoosh();
        }
      }
    });
    for (let i = drips.length - 1; i >= 0; i--) { const d = drips[i]; d.vy += 140 * dt; d.y += d.vy * dt; d.t -= dt; if (d.t <= 0 || d.y > LIP - 2) { if (rnd() < 0.2) S.drip(); drips.splice(i, 1); } }
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i]; f.t += dt;
      if (f.t >= f.dur) { flies.splice(i, 1); if (f.to === "bowl") { bowl.arr = 1; noise(0.08, 1500, 0.1); if (tut === 2) tutNext(3); } else { box.arr = 1; S.lid(); if (tut === 3.5) tutNext(4); } }
    }
    // 볼 → 박스
    if (bowl.o && bowl.coat >= 1 && !box.o) {
      const o = bowl.o; o.st = "box"; Object.assign(box, { o, mu: false, t: 0, lid: 0, arr: 0, muArr: 0 });
      flies.push({ a: [54, CY + 8], b: [107, CY + 3], t: 0, dur: 0.32, col: clusterCol(o, 1), gloss: o.s !== "f", to: "box" });
      Object.assign(bowl, { o: null, sauce: false, coat: 0, arr: 1, pour: 0 });
    }
    bowl.pour = Math.max(0, bowl.pour - dt);
    // 박스·라이더
    if (box.o && box.arr >= 1) {
      box.t += dt; if (box.mu) { box.muArr += dt * 4; if (box.muArr >= 1) box.lid = Math.min(1, box.lid + dt * 5); }
      if (rider.st === "none") { rider.st = "in"; rider.x = 176; S.bike(); }
      const ready = (box.mu && box.lid >= 1) || (!box.mu && box.t > 3.4 * ez && tut < 0);
      if (ready && rider.st === "wait") {
        const o = box.o; if (!box.mu) F.msg("라이더가 무 없이 가져갔어요!");
        rider.st = "out"; rider.carry = 1; S.bike();
        Object.assign(box, { o: null, mu: false, t: 0, lid: 0, arr: 1, muArr: 0 });
        finishOrder(o);
        if (tut === 4) setTimeout(() => tut === 4 && tutNext(5), 700);
      }
    }
    if (rider.st === "in") { rider.x -= dt * 60; if (rider.x <= 143) { rider.x = 143; rider.st = "wait"; } }
    if (rider.st === "out") { rider.x += dt * 70; if (rider.x > 176) { rider.st = "none"; rider.carry = 0; } }
    // 불 셈
    if (flare) {
      if (rnd() < 0.6) { const i = rint(3); fx.push({ x: BX[i] + rnd() * BW, y: OT + 4 + rnd() * 10, vx: rnd() * 60 - 30, vy: -40 - rnd() * 50, t: 0.5, c: pick(["#ffd27a", "#fff6d0", "#ff9a3b"]) }); }
      if (rnd() < 0.08) { fx.push({ x: 10 + rnd() * 140, y: 40 + rnd() * (H - 80), vx: 0, vy: 0, t: 0.7, big: 1 }); noise(0.05, 4000, 0.06, 0, 2); }
      if (rnd() < 0.2) tone(2500 + rnd() * 2500, 0.012, "square", 0.03);
    }
    for (let i = fx.length - 1; i >= 0; i--) { const s = fx[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (!s.smoke && !s.big) s.vy += 160 * dt; if (s.t <= 0) fx.splice(i, 1); }
    // 지글지글
    const nOil = bk.filter((b) => b.st === "oil").length;
    if (nOil) { sizT -= dt; if (sizT <= 0) { sizT = 0.1; S.sizzle(nOil + (flare ? 2 : 0), bk.some((b) => b.st === "oil" && b.age < 0.7)); } }
    // 주문표 미끄러짐
    live().sort((a, b) => a.id - b.id).forEach((o, k) => { const tx = 3 + Math.min(k, 3) * 31; o.tx += (tx - o.tx) * Math.min(1, dt * 9); });
  };
  const gameStep = (dt) => {
    // 주문
    while (nextI < SCHED.length && el >= SCHED[nextI] * Math.pow(ez, 0.15)) { if (waiting().length >= 4) break; newOrder(); nextI++; }
    for (const o of orders) if (o.st === "wait") { o.pat -= dt; if (o.pat <= 0) finishOrder(o, true); }
    // 불 셈 사건
    if (flareAt.length && el >= flareAt[0] && !flare) { flareAt.shift(); flare = { t0: el, t1: 0 }; flares.push(flare); S.flare(); vib([40, 30, 40]); F.msg("불이 너무 세요! 기름이 튀어요 → 불 손잡이 톡"); }
  };

  let lastNow = 0;
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; lastNow = now;
    if (tut >= 0) {
      tutT += dt;
      if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else { newOrder("y"); tutNext(1); } }
      if (tut >= 1) step(dt);
      guide(tut === 1 ? dragHint(0) : tut === 2 ? (bk[0].st === "oil" && bk[0].d >= 0.6 ? { x: BX[0] + BW / 2, y: LIP + 4, t: "황금! <b>위로 쓱</b>", m: "lf" } : null) : tut === 3 || tut === 3.5 || tut === 4 ? taskNow() : null);
      if (tut === 2 && bk[0].d >= 0.6 && !tutWait && tutT > 0.5 && !tutEl.dataset.g) { tutEl.dataset.g = 1; tutP.innerHTML = `<b>황금색</b>이 됐어요! 지금 바구니를 <b>위로 쓱</b>!`; }
    } else if (!over) {
      if (!t0) t0 = now;
      el = (now - t0) / 1000;
      gameStep(dt); step(dt);
      guide(taskNow());
    }
    lbUpd();
    render(tut >= 0 ? now / 1000 : el);
    requestAnimationFrame(loop);
  };

  // ── 끝: 배달통 리뷰 알림 ──
  const iconURL = () => { const c = document.createElement("canvas"); c.width = 16; c.height = 16; const q = c.getContext("2d"), Q = PG(q); Q(0, 0, 16, 16, "#fff8e0"); piece(Q, 3, 5, GOLD, 0, true); Q(2, 12, 12, 1, "#ffb03b"); return c.toDataURL(); };
  const appURL = () => { const c = document.createElement("canvas"); c.width = 16; c.height = 16; const q = c.getContext("2d"), Q = PG(q); Q(0, 0, 16, 16, "#2f6fd0"); Q(3, 5, 10, 7, "#ffffff"); Q(4, 3, 8, 2, "#ffb03b"); Q(5, 12, 2, 2, "#1a1a1a"); Q(10, 12, 2, 2, "#1a1a1a"); Q(5, 7, 6, 1, "#2f6fd0"); return c.toDataURL(); };
  const end = () => {
    if (over) return; over = true; drag = null; rubAt = null; guide(null); flare = null;
    // 이미 박스에 담긴 건 마지막 라이더가 가져간다
    if (box.o) { const o = box.o; box.o = null; o.mu = box.mu; finishOrder(o); }
    const real = served.filter((o) => !o.cx), cx = served.filter((o) => o.cx);
    const due = Math.max(orders.filter((o) => o.t0 < T - 9).length, served.length, 1);
    const base = served.reduce((a, o) => a + (o.stars - 1) / 4, 0) / due;
    const safety = flares.length ? flares.reduce((a, f) => a + (f.t1 ? clamp(1 - (f.t1 - f.t0 - 1.2) / (5 * ez), 0, 1) : 0), 0) / flares.length : 1;
    let score = 0.9 * base + 0.1 * safety * (real.length ? 1 : 0) - 0.04 * burns - 0.015 * mistakes;
    score = clamp(score, 0, 1);
    const crispAvg = real.length ? real.reduce((a, o) => a + o.crisp, 0) / real.length : 0;
    const accAvg = real.length ? real.reduce((a, o) => a + (o.mu ? 1 : 0.3) * (o.wrong ? 0.6 : 1), 0) / real.length : 0;
    const thr = clamp(real.length / due, 0, 1);
    const av = avgStar();
    SFX.whoosh(); dim.classList.add("on");
    const box2 = document.createElement("div"); box2.className = "c1end";
    box2.innerHTML = `<div class="c1ph"><div class="nt0"></div><div class="c1scr"><div class="c1hd"><img src="${appURL()}" alt=""><p>배달통 사장님<small>황금닭 · 오늘 저녁</small></p><div class="c1avg">${av === "-" ? "-" : "★" + av}<i>리뷰 ${served.length}개</i></div></div><div class="c1ls"></div></div></div>`;
    wrap.appendChild(box2);
    const ls = box2.querySelector(".c1ls"), ic = iconURL();
    const list = served.slice().sort((a, b) => a.stars - b.stars).slice(-7);
    if (!list.length) list.push({ stars: 0, none: 1 });
    const gap = RM() ? 120 : 330;
    const pool5 = shuffle(RV5.slice(1));
    list.forEach((o, k) => setTimeout(() => {
      if (!ls.isConnected) return;
      const top5 = o.stars >= 5 && k === list.length - 1;
      const txt = o.none ? "오늘은 주문을 하나도 못 보냈어요…" : o.cx ? pick(RVX) : top5 ? "바삭함 미쳤다" : o.stars >= 5 ? (pool5.length ? pool5.shift() : pick(RV5)) : !o.mu ? pick(RVMU) : pick(RV4);
      const d = document.createElement("div"); d.className = "c1nt" + (o.stars >= 5 ? "" : " bad");
      d.innerHTML = `<img src="${ic}" alt=""><p><b>${o.none ? "배달통" : stars(o.stars)}</b><span>${txt}</span></p>`;
      ls.prepend(d); while (ls.children.length > 6) ls.lastChild.remove();
      if (o.stars >= 5) { S.review(k); vib(8); } else tone(400, 0.1, "triangle", 0.06);
    }, 500 + k * gap));
    const done = 500 + list.length * gap + 1300;
    setTimeout(() => finish(score, `${real.length}마리 배달 · 평균 <b>★${av}</b>${cx.length ? ` · 취소 ${cx.length}건` : ""}`, "", [["바삭함(황금색)", crispAvg], ["주문 정확도(소스·무)", accAvg], ["처리량", thr]]), done);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.chicken1 = {
    st: () => ({ tut, el, over, orders: orders.map((o) => o.s + ":" + o.st).join(","), bk: bk.map((b) => b.st + ":" + b.d.toFixed(2)).join(","), bowl: !!bowl.o, box: !!box.o, served: served.map((o) => o.stars).join(""), flare: !!flare, burns, mistakes }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1) drop(0);
      else if (tut === 2) { if (bk[0].st === "oil" && bk[0].d >= 0.6) liftB(0); }
      else if (tut === 3) { if (bowl.o && bowl.arr >= 1) pour(bowl.o.s); }
      else if (tut === 3.5) rub(60, 72, CY + 18);
      else if (tut === 4) { if (box.o && box.arr >= 1) addMu(); }
      else if (tut === 5) startGame();
    },
    auto: (bad) => {
      if (over) return;
      if (flare && !bad) fixFlare();
      bk.forEach((b, i) => { if (b.st === "oil" && (bad ? b.d >= 0.85 : b.d >= 0.6)) liftB(i); });
      if (bowl.o && bowl.arr >= 1 && !bowl.sauce) pour(bowl.o.s);
      if (bowl.sauce) rub(60, 72, CY + 18);
      if (box.o && box.arr >= 1 && !box.mu && !bad) addMu();
      bk.forEach((b, i) => { if (b.st === "empty" && waiting().length) drop(i); });
    },
  };
  updSc(); lbUpd(); render(0); requestAnimationFrame(loop);
}
