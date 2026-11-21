// 웹소설 3탄(webnovel3) "랭킹 레이스": 노블리 공모전 마지막 날 밤 7시 → 자정 마감.
// 위: 실시간 랭킹 보드(내 작품 + 라이벌 5편이 순위를 다투며 줄이 휙휙 바뀐다).
// 가운데: 시간대별 독자 수 그래프(밤 10~12시 피크). 아래: 침대에 앉아 폰으로 관리하는 나 + 작업 버튼.
// 할 일: 떠오르는 독자 댓글에 답글(악플은 무시), 표지 바꾸기(1번), 이벤트 참여, 원고 5편을 피크에 연재 올리기.
// 라이벌이 '연참 폭탄'을 터뜨리면 피크 연재로 맞받아친다. 자정에 최종 순위 발표, 1~3위면 왕관 + 유료 연재 제안 메일.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uOutline } from "../mg.js";

const T = 30, STOCK = 5, CD = 2.1;
// 시간대별 독자 수(시각, 배수). 게임 30초 = 저녁 7시 ~ 자정(1초 = 10분)
const TRP = [[19, 0.45], [20, 0.6], [21, 0.9], [21.8, 1.4], [22, 2.1], [22.5, 2.7], [23, 3.0], [23.5, 3.2], [24, 2.9]];
const trAt = (g) => { const h = 19 + g / 6; for (let i = 1; i < TRP.length; i++) if (h <= TRP[i][0]) { const [a, va] = TRP[i - 1], [b, vb] = TRP[i]; return va + (vb - va) * (h - a) / (b - a); } return 2.9; };
const PEAK = 2.0;
// 작품(지어낸 제목). m: 표지 무늬, bg/fg: 표지 색
const RIVALS = [
  { t: "SSS급 야근 헌터", g: "헌터물", m: "sword", bg: "#26386a", fg: "#9fd8ff" },
  { t: "악역 영애는 퇴사합니다", g: "로판", m: "heart", bg: "#6a2448", fg: "#ff8fc8" },
  { t: "재벌집 막내 인턴", g: "현판", m: "coin", bg: "#4a3810", fg: "#ffd166" },
  { t: "던전 앞 편의점", g: "판타지", m: "store", bg: "#1c4a38", fg: "#7fe0a8" },
  { t: "마왕님은 주 4일제", g: "코믹", m: "crown", bg: "#38205e", fg: "#c79cff" },
];
const MINE = { t: "퇴근 후, 마탑의 주인", g: "판타지", m: "tower", bg: "#1f3a70", fg: "#5fb8ff" };
const START = [7400, 6900, 6400, 5900, 5000], RATE = [1.12, 1.06, 1.0, 0.95, 0.88], ME0 = 5500;
// 7x7 표지 무늬(a 주색, b 밝은색)
const MOTIF = {
  sword: ["......b", ".....a.", "....a..", "...a...", "b.a....", ".b.....", "a.b...."],
  heart: [".aa.aa.", "abaaaaa", "aaaaaaa", "aaaaaaa", ".aaaaa.", "..aaa..", "...a..."],
  coin: ["..aaa..", ".abbba.", "aab.baa", "aab.baa", "aabbbaa", ".aaaaa.", "..aaa.."],
  store: ["aaaaaaa", "bbbbbbb", "a.a.a.a", "aaaaaaa", "a..a..a", "a..a..a", "aaaaaaa"],
  crown: [".......", "a..a..a", "aa.a.aa", "aaaaaaa", "abababa", "aaaaaaa", "......."],
  tower: ["...b...", "..aaa..", "..aba..", "..aaa..", ".aaaaa.", ".abaaa.", "aaaaaaa"],
  draft: ["......a", ".....aa", "....aa.", "...aa..", "..aa...", ".bb....", "b......"],
};
// 독자 댓글(닉네임은 지어낸 말 조합)
const NICK_A = ["새벽", "퇴근한", "정주행", "야식", "졸린", "말랑", "꿈꾸는", "통통", "밤샘", "느긋한", "출근길", "주말"];
const NICK_B = ["독자", "감자", "고양이", "만두", "펭귄", "라떼", "도토리", "호떡", "두부", "판다", "치즈", "붕어빵"];
const C_GOOD = ["작가님 다음 화 언제요ㅠ", "공모전 응원해요!", "이 작품 1위 가자!", "주인공 너무 좋아요", "정주행 끝! 다음 화요", "선작하고 갑니다", "오늘 연재 있나요?", "출근길 유일한 낙", "답글 주시면 평생 독자", "마탑 장면 미쳤어요", "투표하고 왔어요!", "오늘 밤 기다릴게요"];
const C_TROLL = ["노잼… 하차함", "1화부터 뻔하네", "이게 공모전작?", "광고 보고 왔는데 별로", "표절 아님?ㅋ"];
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
// 작은 그림들(X 테두리)
const PIX = {
  up: ["..XXXXXX..", ".XwwwwwwX.", ".XwwbwwwX.", ".XwbbbwwX.", ".XbbbbbwX.", ".XwwbwwwX.", ".XwwbwwwX.", ".XwwwwwwX.", ".XwgggwwX.", ".XwwwwwwX.", "..XXXXXX.."],
  cover: ["XXXXXXXXX.", "XppppppppX", "XpyppppppX", "XpppppyppX", "XppwwwppX.", "XpwwwwwpX.", "XppwwwppX.", "XppppppppX", "XpggggggpX", "XXXXXXXXX."],
  event: [".......XX.", "......XrX.", "....XXrrX.", "XXXXrrrrX.", "XwwXrrrrX.", "XwwXrrrrX.", "XXXXrrrrX.", "..XXXrrrX.", "..XwX.XrX.", "..XXX..XX."],
  heart: [".XX.XX.", "XrrXrrX", "XrwrrrX", "XrrrrrX", ".XrrrX.", "..XrX..", "...X..."],
  plane: ["X.........", "XwX.......", "XwwXX.....", "XwwwwXX...", ".XwwwwwXXX", ".XggXwwwwX", "..XgXXXX..", "..XX......"],
  crown: ["y....y....y", "yX..yXy..Xy", "XyX.XyX.XyX", "XyyXyyyXyyX", "XyyyyryyyyX", "XyryyyyyryX", "XXXXXXXXXXX"],
  env: ["XXXXXXXXXXXXXXXXXX", "XwXwwwwwwwwwwwwXwX", "XwwXwwwwwwwwwwXwwX", "XwwwXXwwwwwwXXwwwX", "XwwwwwXXwwXXwwwwwX", "XwwwwwwrrrrwwwwwwX", "XwwwwwrrwwrrwwwwwX", "XwwwwwwrrrrwwwwwwX", "XwwwwwwwrrwwwwwwwX", "XggggggggggggggggX", "XXXXXXXXXXXXXXXXXX"],
};
const PCOL = { X: "#1a1424", w: "#fffaf0", b: "#1f6fd0", g: "#9aa0c0", p: "#5fb8ff", y: "#ffd166", r: "#ff5a7a" };

const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const hm = (g) => { const m = Math.min(300, Math.floor(g * 10)), h = 19 + Math.floor(m / 60); return h >= 24 ? "00:00" : `${h}:${String(m % 60).padStart(2, "0")}`; };
const cache = {};
function pixURL(k, pal = PCOL) {
  const key = k + JSON.stringify(pal === PCOL ? 0 : pal); if (cache[key]) return cache[key];
  const rows = PIX[k], c = document.createElement("canvas"); c.width = rows[0].length; c.height = rows.length; const g = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = pal[ch] || "#fff"; g.fillRect(x, y, 1, 1); }));
  return (cache[key] = c.toDataURL());
}
// 표지 14x18(+테두리). fancy=false 면 회색 임시 표지
function coverC(d, fancy = true) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 20; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, w, h); };
  const bg = fancy ? d.bg : "#6a6878", fg = fancy ? d.fg : "#c8c6d4";
  for (let y = 0; y < 18; y++) P(0, y, 14, 1, tint(bg, 1.25 - y * 0.03));
  if (fancy) { for (let i = 0; i < 6; i++) P(rint(14), rint(10), 1, 1, "#ffffff55"); P(0, 0, 14, 1, tint(bg, 1.6)); }
  else for (let y = 2; y < 18; y += 3) P(0, y, 14, 1, "#ffffff10");
  const mo = MOTIF[fancy ? d.m : "draft"];
  mo.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "a") P(3 + x, 3 + y, 1, 1, fg); if (ch === "b") P(3 + x, 3 + y, 1, 1, fancy ? "#ffffff" : "#ffd6a0"); }));
  P(1, 12, 12, 4, fancy ? "#00000055" : "#00000030"); P(2, 13, 10, 1, fancy ? "#fffaf0" : "#e8e6f0"); P(3, 15, 7, 1, fancy ? fg : "#b0aec0");
  if (!fancy) { P(9, 1, 4, 3, "#ffe27a"); P(9, 1, 4, 1, "#f0c850"); }
  if (fancy && d === MINE) { P(1, 1, 1, 1, "#fff"); P(12, 5, 1, 1, "#fff"); P(11, 4, 3, 1, "#ffffff88"); P(12, 3, 1, 3, "#ffffff88"); }
  uOutline(c); return c;
}
function fingerURL() {
  if (cache.finger) return cache.finger;
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, 12 - y, 1, 1); }));
  return (cache.finger = c.toDataURL());
}
// 방법 화면 그림(40x40 도트 3장)
function stepPics() {
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d"); fn((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }, g); return c.toDataURL(); };
  const fin = (P, ox, oy) => FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(ox + x, oy + 12 - y, 1, 1, ch === "X" ? "#2a1e2e" : "#ffe6d6"); }));
  const pix = (P, k, ox, oy) => PIX[k].forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(ox + x, oy + y, 1, 1, PCOL[ch]); }));
  const a = mk((P) => {
    P(3, 6, 30, 13, "#0006"); P(2, 5, 30, 13, "#fffaf0"); P(6, 18, 4, 3, "#fffaf0"); P(7, 21, 2, 1, "#fffaf0");
    pix(P, "heart", 4, 8); P(13, 9, 15, 1, "#5a4a5a"); P(13, 12, 11, 1, "#5a4a5a");
    fin(P, 18, 24); for (const [x, y] of [[34, 4], [36, 14]]) { P(x, y, 1, 3, "#ffd166"); P(x - 1, y + 1, 3, 1, "#ffd166"); }
  });
  const b = mk((P) => {
    P(0, 28, 40, 1, "#5a5070");
    for (let i = 0; i < 12; i++) { const h = Math.round(trAt(i * 2.5) * 6), pk = trAt(i * 2.5) >= PEAK; P(2 + i * 3, 28 - h, 2, h, pk ? "#ffd166" : "#4a6aa0"); }
    P(26, 2, 12, 12, "#0006"); pix(P, "up", 27, 2);
    for (let i = 0; i < 5; i++) P(25 + i * 3, 33, 2, 2, "#5fb8ff");
    P(25, 30, 14, 1, "#ffd16688");
  });
  const c = mk((P) => {
    for (let i = 0; i < 3; i++) { const y = 12 + i * 9; P(4, y, 32, 8, i === 0 ? "#3a2e10" : "#221a3e"); P(4, y, 1, 8, i === 0 ? "#ffd166" : "#5a5070"); P(14, y + 2, 18 - i * 4, 1, "#c8c0e0"); P(14, y + 5, 10, 1, "#7a7090"); P(7, y + 1, 5, 6, i === 0 ? "#5fb8ff" : i === 1 ? "#ff8fc8" : "#7fe0a8"); }
    pix(P, "crown", 4, 3); P(30, 2, 1, 4, "#fff3b0"); P(28, 4, 5, 1, "#fff3b0");
  });
  return [[`<img src="${a}" alt="">`, "댓글엔 답글 톡"], [`<img src="${b}" alt="">`, "피크에 연재 올리기"], [`<img src="${c}" alt="">`, "자정에 순위 발표"]];
}

export const GAME = {
  key: "webnovel3", base: "webnovel", jc: "#5fb8ff", n: "랭킹 레이스", desc: "노블리 공모전 마지막 날 밤, 자정 마감까지 순위를 끌어올려요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 저녁 7시부터 <b>자정 마감</b>까지, 위쪽 <b>실시간 랭킹</b>에서 내 작품을 3위 안으로!",
    "<b>원고는 5편뿐.</b> 가운데 그래프의 <b>노란 칸(밤 10~12시 피크)</b>에 <b>연재 올리기</b>를 하면 조회가 폭발해요. 그 전엔 아껴 둬요.",
    "피크 전엔 준비: 떠오르는 <b>독자 댓글</b>에 답글 톡(<b>악플은 무시</b>), <b>표지 바꾸기</b>(1번), <b>이벤트 참여</b>. 라이벌의 <b>연참 폭탄</b>도 조심!",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "댓글엔 답글 톡"], ["", "피크에 연재 올리기"], ["", "자정에 순위 발표"]]; } },
  css: `
.mg-webnovel3 .wr-st{background:#120c22!important;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
.mg-webnovel3 .wr-cv{position:absolute;left:0;top:0;z-index:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;pointer-events:none}
.mg-webnovel3 .wr-cv.fg{z-index:2}
.mg-webnovel3 .wr-cv.fx{z-index:19}
.mg-webnovel3 .mg-steps img{width:76px;height:76px;image-rendering:pixelated}
.mg-webnovel3 .mg-msg{z-index:24}
.mg-webnovel3 img{image-rendering:pixelated}
.mg-webnovel3 .wr-hd{position:absolute;left:8px;right:8px;z-index:3;display:flex;align-items:center;gap:6px;color:#fff;font-size:11px;font-weight:800;pointer-events:none;white-space:nowrap}
.mg-webnovel3 .wr-hd i{font-style:normal;background:#5fb8ff;color:#0a1a33;border-radius:5px;padding:1px 6px;font-size:10.5px;font-weight:900}
.mg-webnovel3 .wr-hd .lv{color:#ff5a7a;font-size:10px}
.mg-webnovel3 .wr-hd .lv::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#ff3b5c;margin-right:3px;vertical-align:1px;animation:wrblink 1s steps(2) infinite}
.mg-webnovel3 .wr-clk{margin-left:auto;font:900 13px ui-monospace,Menlo,monospace;color:#ffd166;background:#0008;border-radius:5px;padding:0 6px;letter-spacing:1px}
.mg-webnovel3 .wr-clk.hot{color:#ff5a6a;animation:wrblink .5s steps(2) infinite}
.mg-webnovel3 .wr-bd{position:absolute;left:8px;right:8px;z-index:3;pointer-events:none}
.mg-webnovel3 .wr-row{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:6px;padding:0 6px 0 4px;box-sizing:border-box;transition:transform .42s cubic-bezier(.3,1.35,.5,1);will-change:transform;color:#e8e2f8}
.mg-webnovel3 .wr-row.now{transition:none}
.mg-webnovel3 .wr-row.me{z-index:2;background:linear-gradient(90deg,#5fb8ff44,#5fb8ff14);box-shadow:inset 0 0 0 2px #5fb8ff;border-radius:7px}
.mg-webnovel3 .wr-rk{position:relative;width:24px;height:24px;flex:none;overflow:hidden;font:900 19px/24px ui-monospace,Menlo,monospace;text-align:center;color:#c8c0e0}
.mg-webnovel3 .wr-rk i{position:absolute;left:0;right:0;top:0;font-style:normal}
.mg-webnovel3 .wr-rk i.in{animation:wrrin .38s cubic-bezier(.3,1.6,.5,1)}
.mg-webnovel3 .wr-rk i.in.dn{animation-name:wrrin2}
.mg-webnovel3 .wr-rk i.out{animation:wrrout .3s forwards}
.mg-webnovel3 .wr-rk i.out.dn{animation-name:wrrout2}
.mg-webnovel3 .wr-row.r1 .wr-rk{color:#ffd166;text-shadow:0 0 6px #ffb03b}
.mg-webnovel3 .wr-row.r2 .wr-rk{color:#e6ecf8}
.mg-webnovel3 .wr-row.r3 .wr-rk{color:#e8a070}
.mg-webnovel3 .wr-cov{position:relative;flex:none}
.mg-webnovel3 .wr-cov img{display:block;width:100%;height:100%}
.mg-webnovel3 .wr-cov.flip{animation:wrflip .55s ease-in-out}
.mg-webnovel3 .wr-tt{flex:1 1 auto;min-width:0;line-height:1.2}
.mg-webnovel3 .wr-tt b{display:block;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-webnovel3 .wr-tt small{display:flex;gap:4px;align-items:center;font-size:9.5px;color:#9a90b8;white-space:nowrap}
.mg-webnovel3 .wr-tt small em{font-style:normal;font-weight:900;font-size:9px;padding:0 4px;border-radius:4px;background:#5fb8ff;color:#06203a;display:none}
.mg-webnovel3 .wr-row.me .wr-tt small em.mine{display:inline-block}
.mg-webnovel3 .wr-tt small em.rec{background:#ff8fc8;color:#3a0a24}
.mg-webnovel3 .wr-tt small em.bomb{background:#ff3b4f;color:#fff;animation:wrblink .3s steps(2) infinite}
.mg-webnovel3 .wr-tt small em.new{background:#7fe0a8;color:#0a2a1a}
.mg-webnovel3 .wr-tt small em.on{display:inline-block}
.mg-webnovel3 .wr-pt{flex:none;text-align:right;min-width:62px}
.mg-webnovel3 .wr-pt b{display:block;font:900 12.5px ui-monospace,Menlo,monospace;color:#fff}
.mg-webnovel3 .wr-row.me .wr-pt b{color:#9fd8ff}
.mg-webnovel3 .wr-pt small{display:block;height:12px;font-size:10px;font-weight:900;opacity:0;transition:opacity .3s}
.mg-webnovel3 .wr-pt small.u{color:#5fe08a;opacity:1}.mg-webnovel3 .wr-pt small.d{color:#ff5a6a;opacity:1}
.mg-webnovel3 .wr-row.gl{animation:wrgl .6s}
.mg-webnovel3 .wr-row.me.gl{animation:wrglm .7s}
.mg-webnovel3 .wr-row.hurt{animation:wrhurt .5s}
.mg-webnovel3 .wr-row.shk{animation:wrshk .12s 4}
.mg-webnovel3 .wr-row.rv{animation:wrrv .4s}
.mg-webnovel3 .wr-row.fin{box-shadow:inset 0 0 0 2px #ffd166,0 0 18px #ffd16688;background:linear-gradient(90deg,#ffd16655,#ffd16618)}
.mg-webnovel3 .wr-cov img.wr-crown{position:absolute;left:50%;top:-13px;width:33px;height:21px;margin-left:-16px;opacity:0;pointer-events:none;filter:drop-shadow(0 2px 0 #0008)}
.mg-webnovel3 .wr-cov img.wr-crown.on{animation:wrcrown .7s cubic-bezier(.3,1.6,.5,1) forwards}
.mg-webnovel3 .wr-gl{position:absolute;left:8px;right:8px;z-index:3;display:flex;justify-content:space-between;font-size:9.5px;color:#8a80a8;font-weight:700;pointer-events:none}
.mg-webnovel3 .wr-gl span.pk{color:#ffd166}
.mg-webnovel3 .wr-gx{position:absolute;left:8px;z-index:3;font-size:10.5px;font-weight:800;color:#c8c0e0;pointer-events:none;white-space:nowrap}
.mg-webnovel3 .wr-gx b{font:900 12px ui-monospace,Menlo,monospace;color:#9fd8ff}
.mg-webnovel3 .wr-gx.pk b{color:#ffd166}
.mg-webnovel3 .wr-gx.pk::after{content:"피크!";margin-left:5px;font-size:9.5px;font-weight:900;color:#3a2400;background:#ffd166;border-radius:4px;padding:0 4px;animation:wrblink .5s steps(2) infinite}
.mg-webnovel3 .wr-rc{position:absolute;left:0;right:0;z-index:1;overflow:hidden;pointer-events:none}
.mg-webnovel3 .wr-me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s;transform-origin:50% 90%}
.mg-webnovel3 .wr-me.on{opacity:1}
.mg-webnovel3 .wr-loy{position:absolute;right:8px;z-index:4;display:flex;align-items:center;gap:4px;background:#0009;border-radius:7px;padding:2px 6px 2px 4px;font-size:10px;font-weight:800;color:#fff;pointer-events:none}
.mg-webnovel3 .wr-loy img{width:14px;height:14px}
.mg-webnovel3 .wr-loy u{position:relative;display:block;width:56px;height:7px;border-radius:4px;background:#ffffff22;overflow:hidden;text-decoration:none}
.mg-webnovel3 .wr-loy u i{position:absolute;left:0;top:0;bottom:0;width:var(--w,0%);background:linear-gradient(90deg,#ff8fc8,#ff5a7a);transition:width .25s}
.mg-webnovel3 .wr-loy.pop{animation:wrpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel3 .wr-cms{position:absolute;left:0;right:0;z-index:5;pointer-events:none}
.mg-webnovel3 .wr-cm{position:absolute;left:0;top:0;max-width:178px;box-sizing:border-box;padding:4px 8px 5px;border-radius:10px 10px 10px 2px;background:#fffaf0;color:#2a1e2e;box-shadow:0 3px 0 #0007;font-size:11.5px;line-height:1.25;font-weight:700;pointer-events:auto;cursor:pointer;word-break:keep-all;animation:wrcmin .3s cubic-bezier(.3,1.6,.5,1)}
.mg-webnovel3 .wr-cm b{display:flex;align-items:center;gap:3px;font-size:9.5px;color:#1f6fd0;font-weight:900}
.mg-webnovel3 .wr-cm b img{width:11px;height:11px}
.mg-webnovel3 .wr-cm span{display:block}
.mg-webnovel3 .wr-cm.tr{background:#3a3248;color:#c8c0d8;border:1px dashed #8a7aa8}
.mg-webnovel3 .wr-cm.tr b{color:#9a8ab8}
.mg-webnovel3 .wr-cm.ok{animation:wrcmok .45s ease-in forwards;pointer-events:none}
.mg-webnovel3 .wr-cm.no{animation:wrcmno .45s ease-out forwards;pointer-events:none}
.mg-webnovel3 .wr-cm.ok::after{content:"답글 완료";position:absolute;right:6px;top:-9px;font-size:9.5px;font-weight:900;background:#1f6fd0;color:#fff;padding:0 5px;border-radius:5px}
.mg-webnovel3 .wr-cm.fade{opacity:0;transition:opacity .35s;pointer-events:none}
.mg-webnovel3 .wr-bt{position:absolute;left:6px;right:6px;bottom:6px;z-index:6;display:flex;gap:5px}
.mg-webnovel3 .wr-b{position:relative;flex:1 1 0;min-width:0;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:0!important;border-radius:11px!important;padding:4px 2px!important;min-height:0!important;background:linear-gradient(#3a3060,#2a2248)!important;box-shadow:0 4px 0 #120c22,inset 0 0 0 2px #5a4a8a!important;color:#fff!important;cursor:pointer;transition:transform .08s,filter .2s}
.mg-webnovel3 .wr-b.up{flex:1.35 1 0}
.mg-webnovel3 .wr-b img{width:30px;height:30px;position:relative}
.mg-webnovel3 .wr-b b{position:relative;font-size:12px;font-weight:900;white-space:nowrap}
.mg-webnovel3 .wr-b small{position:relative;font-size:9.5px;font-weight:800;color:#b8b0d8;white-space:nowrap}
.mg-webnovel3 .wr-b:active{transform:translateY(2px)}
.mg-webnovel3 .wr-b::before{content:"";position:absolute;left:0;bottom:0;height:100%;width:var(--cd,0%);background:#00000066;transition:width .1s linear}
.mg-webnovel3 .wr-b.off{filter:grayscale(.85) brightness(.6)}
.mg-webnovel3 .wr-b.hot{background:linear-gradient(#ffd166,#e0951c)!important;box-shadow:0 4px 0 #7a4a00,inset 0 0 0 2px #fff3b0,0 0 16px #ffd16699!important;color:#2a1600!important;animation:wrpulse .4s infinite alternate}
.mg-webnovel3 .wr-b.hot small{color:#5a3400}
.mg-webnovel3 .wr-b.ev{background:linear-gradient(#ff8fc8,#d0407a)!important;box-shadow:0 4px 0 #6a1a3a,inset 0 0 0 2px #ffd0e6,0 0 16px #ff8fc899!important;animation:wrpulse .3s infinite alternate}
.mg-webnovel3 .wr-b.ev small{color:#fff}
.mg-webnovel3 .wr-b.ev::before{width:var(--cd,0%);background:#ffffff40}
.mg-webnovel3 .wr-pips{display:flex;gap:2px;position:relative}
.mg-webnovel3 .wr-pips i{width:7px;height:5px;border-radius:1px;background:#ffffff30}
.mg-webnovel3 .wr-pips i.on{background:#9fd8ff;box-shadow:0 0 3px #5fb8ff}
.mg-webnovel3 .wr-b.hot .wr-pips i.on{background:#3a2400;box-shadow:none}
.mg-webnovel3 .wr-plane{position:absolute;left:0;top:0;z-index:18;width:30px;height:24px;pointer-events:none;filter:drop-shadow(0 2px 0 #0008)}
.mg-webnovel3 .wr-ban{position:absolute;left:50%;z-index:17;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:25px;white-space:nowrap;pointer-events:none;color:#fff;text-shadow:0 0 2px #000,0 3px 0 #1f6fd0,0 0 16px #1f6fd0;text-align:center}
.mg-webnovel3 .wr-ban small{display:block;font-size:12.5px;color:#fff}
.mg-webnovel3 .wr-ban.on{animation:wrban 1.8s ease-out forwards}
.mg-webnovel3 .wr-ban.gd{color:#ffd166;text-shadow:0 0 2px #000,0 3px 0 #a86a00,0 0 16px #ffb03b}
.mg-webnovel3 .wr-ban.rd{color:#fff;text-shadow:0 0 2px #000,0 3px 0 #c0303a,0 0 18px #ff3b4f}
.mg-webnovel3 .wr-ban.pk{color:#ff8fc8;text-shadow:0 0 2px #000,0 3px 0 #a0306a,0 0 16px #ff8fc8}
.mg-webnovel3 .wr-red{position:absolute;inset:0;z-index:16;pointer-events:none;background:radial-gradient(transparent 40%,#ff2a3a66);opacity:0}
.mg-webnovel3 .wr-red.on{animation:wrred .9s ease-out}
.mg-webnovel3 .wr-dim{position:absolute;inset:0;z-index:15;pointer-events:none;background:#05030c;opacity:0;transition:opacity .5s}
.mg-webnovel3 .wr-dim.on{opacity:.55}
.mg-webnovel3 .wr-say{position:absolute;z-index:7;transform:translate(-50%,-100%) scale(.4);transform-origin:50% 100%;opacity:0;background:#fff;color:#2a1e2e;font-weight:800;font-size:12px;padding:4px 9px;border-radius:10px;white-space:nowrap;box-shadow:0 3px 0 #0005;pointer-events:none;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s}
.mg-webnovel3 .wr-say.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
.mg-webnovel3 .wr-say.gd{background:#ffd166;color:#3a2400}
.mg-webnovel3 .wr-say.rd{background:#ffb0b8;color:#5a0a14}
.mg-webnovel3 .wr-mail{position:absolute;left:50%;z-index:22;width:260px;margin-left:-130px;opacity:0;pointer-events:none;transform:translateY(40px) scale(.8);transition:transform .45s cubic-bezier(.3,1.5,.5,1),opacity .3s}
.mg-webnovel3 .wr-mail.on{opacity:1;transform:none}
.mg-webnovel3 .wr-mail .env{display:block;width:108px;height:66px;margin:0 auto -24px;position:relative;z-index:2}
.mg-webnovel3 .wr-mail.op .env{animation:wrenv .4s}
.mg-webnovel3 .wr-lt{position:relative;z-index:1;background:#fffaf0;color:#2a1e2e;border-radius:12px;padding:28px 12px 10px;box-shadow:0 5px 0 #0007,0 0 0 2px #ffd166,0 0 30px #ffd16666;font-size:12px;line-height:1.5;text-align:center;word-break:keep-all;transform:translateY(-14px);opacity:0;transition:transform .5s cubic-bezier(.2,.9,.3,1),opacity .3s}
.mg-webnovel3 .wr-mail.op .wr-lt{transform:none;opacity:1}
.mg-webnovel3 .wr-lt i{font-style:normal;display:inline-block;font-size:10px;font-weight:900;background:#1f6fd0;color:#fff;border-radius:5px;padding:1px 7px;margin-bottom:4px}
.mg-webnovel3 .wr-lt b{display:block;font-size:15px;font-weight:900;color:#1f3a70;margin-bottom:2px}
.mg-webnovel3 .wr-lt s{position:absolute;right:10px;bottom:8px;text-decoration:none;font-size:11px;font-weight:900;color:#d0303a;border:2px solid #d0303a;border-radius:6px;padding:0 5px;transform:rotate(-12deg) scale(2);opacity:0;transition:transform .25s cubic-bezier(.3,1.6,.5,1) .5s,opacity .2s .5s}
.mg-webnovel3 .wr-mail.op .wr-lt s{transform:rotate(-12deg) scale(1);opacity:.9}
.mg-webnovel3 .wr-mail.sad .wr-lt{box-shadow:0 5px 0 #0007,0 0 0 2px #8a80a8}
.mg-webnovel3 .wr-mail.sad .wr-lt b{color:#5a5070}
.mg-webnovel3 .wr-tut{position:absolute;left:10px;right:10px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-webnovel3 .wr-tut.off{opacity:0;visibility:hidden}
.mg-webnovel3 .wr-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #5fb8ff;max-width:310px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-webnovel3 .wr-tut.pop .wr-tc{animation:wrpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel3 .wr-tc em{font-style:normal;display:inline-block;background:#1f6fd0;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-webnovel3 .wr-tc p{margin:0}
.mg-webnovel3 .wr-tc b.bl{color:#1f6fd0}.mg-webnovel3 .wr-tc b.rd{color:#c0392b}.mg-webnovel3 .wr-tc b.gd{color:#b07800}.mg-webnovel3 .wr-tc b.pk{color:#c0306a}
.mg-webnovel3 .wr-tb{margin-top:5px;display:flex;justify-content:center}
.mg-webnovel3 .wr-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-webnovel3 .wr-go{background:linear-gradient(#5fb8ff,#1f6fd0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d3a80!important;animation:wrpulse .5s infinite alternate}
.mg-webnovel3 .wr-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-37px 0 0 -14px;background-size:100% 100%;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-webnovel3 .wr-hand.on{display:block;animation:wrtap .8s infinite}
@keyframes wrblink{50%{opacity:.25}}
@keyframes wrrin{from{transform:translateY(100%)}}
@keyframes wrrin2{from{transform:translateY(-100%)}}
@keyframes wrrout{to{transform:translateY(-100%);opacity:0}}
@keyframes wrrout2{to{transform:translateY(100%);opacity:0}}
@keyframes wrflip{0%{transform:scaleX(1)}45%{transform:scaleX(0)}55%{transform:scaleX(0)}100%{transform:scaleX(1)}}
@keyframes wrgl{0%{background:#ffffff40}100%{background:transparent}}
@keyframes wrglm{0%{background:#7fe0ffaa;transform-origin:center}100%{}}
@keyframes wrhurt{0%{background:#ff3b4f88}100%{}}
@keyframes wrshk{25%{margin-left:-3px}75%{margin-left:3px}}
@keyframes wrrv{0%{background:#ffffff55}100%{}}
@keyframes wrcrown{0%{opacity:0;transform:translateY(-60px) rotate(-20deg)}70%{opacity:1;transform:translateY(2px) rotate(4deg)}100%{opacity:1;transform:none}}
@keyframes wrpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes wrcmin{from{opacity:0;transform:scale(.5)}}
@keyframes wrcmok{0%{filter:brightness(1.2)}100%{opacity:0;margin-top:-40px;filter:brightness(1.4)}}
@keyframes wrcmno{0%{margin-left:-5px;background:#ff8090}30%{margin-left:5px}100%{opacity:0;margin-top:30px}}
@keyframes wrpulse{to{filter:brightness(1.15)}}
@keyframes wrban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-2deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(1deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@keyframes wrred{0%{opacity:1}100%{opacity:0}}
@keyframes wrenv{50%{transform:translateY(-6px) rotate(-4deg)}}
@keyframes wrtap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@media (prefers-reduced-motion:reduce){.mg-webnovel3 .wr-ban.on{animation-duration:.01s}.mg-webnovel3 .wr-b.hot,.mg-webnovel3 .wr-b.ev,.mg-webnovel3 .wr-go{animation:none}.mg-webnovel3 .wr-row{transition-duration:.15s}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "webnovel3", "랭킹 레이스", "wr-st");
    const st = F.stage;
    st.insertAdjacentHTML("beforeend", `<canvas class="wr-cv"></canvas><div class="wr-rc"><div class="wr-me"></div></div><canvas class="wr-cv fg"></canvas>
      <div class="wr-hd"><i>노블리</i><span>공모전 실시간 랭킹</span><span class="lv">LIVE</span><span class="wr-clk">19:00</span></div><div class="wr-bd"></div>
      <div class="wr-gx">지금 독자 <b>×0.5</b></div><div class="wr-gl"><span>7시</span><span>8시</span><span>9시</span><span class="pk">10시</span><span class="pk">11시</span><span class="pk">12시</span></div>
      <div class="wr-loy"><img src="${pixURL("heart")}" alt=""><span>충성도</span><u><i></i></u></div><div class="wr-cms"></div><div class="wr-say"></div>
      <div class="wr-bt"><button class="wr-b up" data-a="up"><img src="${pixURL("up")}" alt=""><b>연재 올리기</b><span class="wr-pips"></span></button><button class="wr-b" data-a="cov"><img src="${pixURL("cover")}" alt=""><b>표지 바꾸기</b><small>1번만</small></button><button class="wr-b off" data-a="ev"><img src="${pixURL("event")}" alt=""><b>이벤트</b><small>대기 중</small></button></div>
      <div class="wr-red"></div><div class="wr-dim"></div><canvas class="wr-cv fx"></canvas><div class="wr-ban"></div><div class="wr-mail"><img class="env" alt=""><div class="wr-lt"></div></div>
      <div class="wr-tut off"><div class="wr-tc"><em>리허설</em><p></p><div class="wr-tb"></div></div></div><div class="wr-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const cv = $(".wr-cv"), gB = cv.getContext("2d"), cvF = $(".wr-cv.fg"), gF = cvF.getContext("2d"), cvX = $(".wr-cv.fx"), gX = cvX.getContext("2d");
    const hdEl = $(".wr-hd"), clkEl = $(".wr-clk"), bdEl = $(".wr-bd"), gxEl = $(".wr-gx"), glEl = $(".wr-gl"), loyEl = $(".wr-loy"), loyI = $(".wr-loy u i"), cmsEl = $(".wr-cms"), sayEl = $(".wr-say");
    const rcEl = $(".wr-rc"), meEl = $(".wr-me"), btEl = $(".wr-bt"), bUp = $('[data-a="up"]'), bCov = $('[data-a="cov"]'), bEv = $('[data-a="ev"]'), pipsEl = $(".wr-pips");
    const redEl = $(".wr-red"), dimEl = $(".wr-dim"), ban = $(".wr-ban"), mailEl = $(".wr-mail"), envEl = $(".wr-mail .env"), ltEl = $(".wr-lt");
    const tutEl = $(".wr-tut"), tutP = $(".wr-tc p"), tutB = $(".wr-tb"), hand = $(".wr-hand");
    pipsEl.innerHTML = "<i></i>".repeat(STOCK);
    const pips = [...pipsEl.children];

    // ── 크기: 논리 폭 112칸 안팎을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    for (const c of [cv, cvF, cvX]) { c.width = LW; c.height = LH; c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    const rowH = clamp(Math.floor(sh * 0.066), 33, 42), hdH = 24, bTop = 4, rowsTop = bTop + hdH, bH = hdH + rowH * 6 + 4;
    const gTop = bTop + bH + 5, gH = clamp(Math.round(sh * 0.11), 52, 70), btH = clamp(Math.round(sh * 0.115), 58, 70);
    const pTop = gTop + gH + 4, btTop = sh - btH - 10, pH = btTop - pTop - 4;
    Object.assign(hdEl.style, { top: bTop + 3 + "px", height: hdH - 6 + "px" });
    Object.assign(bdEl.style, { top: rowsTop + "px", height: rowH * 6 + "px" });
    gxEl.style.top = gTop + 3 + "px"; glEl.style.top = gTop + gH - 14 + "px";
    Object.assign(rcEl.style, { top: pTop + "px", height: pH + "px" });
    Object.assign(cmsEl.style, { top: pTop + "px", height: pH + "px" });
    loyEl.style.top = pTop + 5 + "px"; btEl.style.height = btH + "px";
    ban.style.top = gTop + gH / 2 + "px"; mailEl.style.top = Math.round(rowsTop + rowH * 0.6) + "px"; tutEl.style.top = rowsTop + 4 + "px";
    F.root.querySelector(".mg-msg").style.top = pTop + 8 + "px";
    const L = (px) => Math.round(px / K);
    const gx0 = 5, gx1 = LW - 5, gyB = L(gTop + gH - 16), gyT = L(gTop + 18), gStep = (gx1 - gx0) / 30;

    // 내 캐릭터(3x2 표정 시트, 칸 240x540 중 위쪽 312): 침대에 앉아 폰을 보는 앞모습
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    const avH = Math.round(pH * 1.04), sA = avH / 312, avW = Math.round(240 * sA), avX = 6, meCX = avX + avW / 2;
    Object.assign(meEl.style, { width: avW + "px", height: avH + "px", left: avX + "px", top: Math.round(pH * 0.06) + "px" });
    sayEl.style.left = Math.round(meCX + avW * 0.12) + "px"; sayEl.style.top = pTop + Math.round(pH * 0.12) + "px";
    {
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = "";
    const phX = L(meCX) - 6, phY = L(pTop + pH) - 21;

    // ── 배경(한 번만) ──
    const BG = document.createElement("canvas"); BG.width = LW; BG.height = LH;
    const stars = [], wins = [], bulbs = [];
    const pT = L(pTop), pB = L(btTop - 4), winX = LW - 30, winY = pT + 4, winW = 24, winH = Math.max(14, Math.round((pB - pT) * 0.42));
    {
      const b = BG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      for (let y = 0; y < LH; y++) { const t = y / LH; P(0, y, LW, 1, `rgb(${Math.round(18 + t * 8)},${Math.round(12 + t * 6)},${Math.round(34 + t * 14)})`); }
      // 랭킹 보드 틀
      const bx = 1, by = L(bTop), bw = LW - 2, bh = L(bTop + bH) - by;
      P(bx, by, bw, bh, "#ffd166"); P(bx + 1, by + 1, bw - 2, bh - 2, "#7a5a1e"); P(bx + 2, by + 2, bw - 4, bh - 4, "#191230");
      P(bx + 2, by + 2, bw - 4, L(hdH) - 2, "#24306a"); P(bx + 2, by + L(hdH), bw - 4, 1, "#5fb8ff");
      for (let x = bx + 4; x < bx + bw - 4; x += 4) P(x, by + 3, 2, 1, "#5fb8ff44");
      for (const [x, y] of [[bx, by], [bx + bw - 3, by], [bx, by + bh - 3], [bx + bw - 3, by + bh - 3]]) { P(x, y, 3, 3, "#fff3b0"); P(x + 1, y + 1, 1, 1, "#ffd166"); }
      // 순위 칸(1·2·3위 금·은·동)
      const SL = ["#3a2c0c", "#262a3a", "#34200f", "#1c1636", "#201a3c", "#1c1636"], SE = ["#ffd166", "#c8d0e0", "#d08a50", "#3a3060", "#3a3060", "#3a3060"];
      for (let i = 0; i < 6; i++) { const y0 = L(rowsTop + i * rowH), y1 = L(rowsTop + (i + 1) * rowH); P(bx + 3, y0, bw - 6, y1 - y0 - 1, SL[i]); P(bx + 3, y0, 1, y1 - y0 - 1, SE[i]); if (i < 3) for (let x = bx + 6; x < bx + bw - 4; x += 7) P(x, y0, 1, 1, SE[i] + "55"); }
      // 그래프 판
      P(2, L(gTop), LW - 4, L(gTop + gH) - L(gTop), "#0e0a1c"); P(2, L(gTop), LW - 4, 1, "#3a3060"); P(2, L(gTop + gH) - 1, LW - 4, 1, "#3a3060");
      for (let y = gyT; y < gyB; y += 4) for (let x = gx0; x < gx1; x += 2) P(x, y, 1, 1, "#ffffff08");
      const pkX = gx0 + Math.round(18 * gStep); P(pkX, gyT - 3, gx1 - pkX, gyB - gyT + 3, "#ffd16612"); for (let y = gyT - 3; y < gyB; y += 2) P(pkX, y, 1, 1, "#ffd16666");
      // 방(밤): 벽지 줄무늬, 창문, 줄 전구, 포스터, 선반
      for (let y = pT; y < pB; y++) { const t = (y - pT) / Math.max(1, pB - pT); P(0, y, LW, 1, `rgb(${Math.round(40 + t * 12)},${Math.round(30 + t * 8)},${Math.round(62 + t * 10)})`); }
      for (let x = 3; x < LW; x += 6) for (let y = pT + 2; y < pB; y += 2) P(x, y, 1, 1, "#ffffff0a");
      P(winX - 2, winY - 2, winW + 4, winH + 4, "#6a5a7e"); P(winX - 1, winY - 1, winW + 2, winH + 2, "#3a2e4e");
      for (let y = 0; y < winH; y++) { const t = y / winH; P(winX, winY + y, winW, 1, `rgb(${Math.round(12 + t * 26)},${Math.round(14 + t * 16)},${Math.round(44 + t * 30)})`); }
      P(winX + 16, winY + 2, 5, 5, "#fff3c0"); P(winX + 18, winY + 1, 4, 4, "rgb(12,14,44)");
      for (let i = 0; i < 6; i++) stars.push([winX + 1 + rint(winW - 2), winY + 1 + rint(Math.max(2, winH >> 1))]);
      let wx = winX; while (wx < winX + winW) { const ww = 3 + rint(4), wh = 4 + rint(Math.max(3, winH - 9)), w2 = Math.min(ww, winX + winW - wx); P(wx, winY + winH - wh, w2, wh, "#141a32"); for (let yy = winY + winH - wh + 2; yy < winY + winH - 1; yy += 3) for (let xx = wx + 1; xx < wx + w2 - 1; xx += 2) if (rnd() < 0.45) wins.push([xx, yy]); wx += ww + 1; }
      P(winX + (winW >> 1), winY, 1, winH, "#3a2e4e"); P(winX, winY + (winH >> 1), winW, 1, "#3a2e4e88");
      for (let x = 0; x < LW; x++) { const y = pT + 2 + Math.round(Math.sin(x / 9) * 1.5 + 1.5); P(x, y, 1, 1, "#5a4a5a"); if (x % 7 === 3) bulbs.push([x, y + 1]); }
      const shY = winY + winH + 9; P(winX - 4, shY, winW + 6, 2, "#8a5a3a"); P(winX - 4, shY + 2, winW + 6, 1, "#4a2e1e");
      let sx = winX - 3; const bc = ["#5fb8ff", "#ff8fc8", "#ffb03b", "#b89cff", "#7fe0a8", "#e05a5a"]; while (sx < winX + winW - 6) { const h = 5 + rint(3), w2 = 2, c = pick(bc); P(sx, shY - h, w2, h, c); P(sx, shY - h, w2, 1, tint(c, 1.3)); sx += w2; }
      P(winX + winW - 6, shY - 6, 5, 6, "#ffd166"); P(winX + winW - 5, shY - 8, 3, 2, "#ffd166"); P(winX + winW - 4, shY - 9, 1, 1, "#fff3b0");
      // 작업 패널 바닥
      P(0, L(btTop) - 2, LW, LH - L(btTop) + 2, "#0c0818"); P(0, L(btTop) - 2, LW, 1, "#3a3060");
    }
    // 앞(이불·폰)
    const FG = document.createElement("canvas"); FG.width = LW; FG.height = LH;
    {
      const b = FG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      const by0 = pB - 9;
      for (let y = by0; y < pB; y++) for (let x = 0; x < LW; x++) { const w = Math.round(Math.sin(x / 6 + 1) * 1.2); if (y - by0 >= w) P(x, y, 1, 1, ((Math.floor(x / 4) + Math.floor((y - by0) / 3)) % 2) ? "#8a7ac8" : "#a898e0"); }
      for (let x = 0; x < LW; x++) { const w = Math.round(Math.sin(x / 6 + 1) * 1.2); P(x, by0 + Math.max(0, w), 1, 1, "#d0c4ff"); }
      // 베개
      P(LW - 44, by0 - 5, 16, 6, "#f2ecff"); P(LW - 44, by0 - 5, 16, 1, "#ffffff"); P(LW - 44, by0, 16, 1, "#b8acd8");
    }

    // ── 상태 ── tut: 0 대기 / 1 댓글 / 2 표지 / 3 이벤트 / 4 연재 / 5 시작 카드 / -1 본게임
    let tut = 0, tutT = 0, tm = 0, el = 0, over = false, done = false, raf = 0, last = 0, phase = 0;
    let loy = 0.15, appeal = 1, coverUsed = false, stock = STOCK, cd = 0, fresh = 0, evOn = 0, evWin = 0, evIdx = 0, evJoined = 0, nextCm = 1.2;
    let replies = 0, trollTap = 0, cmMiss = 0, upTr = [], lowWarn = false, bombs = 0, lastSay = 0, sayT = 0, hint = { cov: 0, cm: 0, pk: 0, ev: 0, end: 0 }, idleUp = 0;
    let finalRank = 0, finalScore = 0, flash = 0, gxShown = "";
    const EVT = [8, 22.5], BOMB = [19.2, 26.4];
    const cms = [], conf = [], heads = [], bursts = [];
    const cs = { happy: 0, shock: 0, angry: 0, blush: 0, sad: 0 };

    // ── 작품 줄 ──
    const ents = [];
    const rivals = shuffle(RIVALS.slice());
    const mkRow = (d, me) => {
      const e = document.createElement("div"); e.className = "wr-row" + (me ? " me" : "");
      const cw = Math.round((rowH - 8) * 0.78), ch = rowH - 8;
      e.style.height = rowH + "px";
      e.innerHTML = `<span class="wr-rk"><i></i></span><span class="wr-cov" style="width:${cw}px;height:${ch}px"><img alt=""><img class="wr-crown" alt=""></span><div class="wr-tt"><b>${d.t}</b><small><em class="mine">내 작품</em><em class="rec">추천</em><em class="bomb">연참 ×5</em><em class="new">새 회차</em><span>${d.g}</span></small></div><div class="wr-pt"><b>0</b><small></small></div>`;
      bdEl.appendChild(e);
      return e;
    };
    rivals.forEach((d, i) => { const e = mkRow(d, false); ents.push({ d, me: false, s: START[i], rate: RATE[i], ups: [], el: e }); });
    const ME = { d: MINE, me: true, s: ME0, rate: 1, ups: [], el: mkRow(MINE, true) };
    ents.push(ME);
    for (const e of ents) {
      e.rkEl = e.el.querySelector(".wr-rk"); e.ptEl = e.el.querySelector(".wr-pt b"); e.dlEl = e.el.querySelector(".wr-pt small"); e.covEl = e.el.querySelector(".wr-cov"); e.img = e.el.querySelector(".wr-cov img");
      e.tags = {}; e.el.querySelectorAll(".wr-tt em").forEach((t) => (e.tags[t.className] = t));
      e.img.src = coverC(e.d, !e.me).toDataURL(); e.slot = -1; e.rank = 0; e.dlT = 0; e.shownS = -1; e.tagT = {};
    }
    const crownEl = ME.el.querySelector(".wr-crown"); crownEl.src = pixURL("crown");
    const coverNew = coverC(MINE, true).toDataURL(), coverOld = ME.img.src;
    const tag = (e, k, sec) => { e.tags[k].classList.add("on"); e.tagT[k] = sec; };

    // ── 소리 ──
    const S = {
      cmPop: () => tone(1760 + rnd() * 400, 0.04, "sine", 0.05),
      reply: () => { tone(1046, 0.07, "triangle", 0.08); tone(1568, 0.12, "triangle", 0.08, 0, 0.07); noise(0.05, 5000, 0.04, 0.02, 3); },
      troll: () => { tone(300, 0.18, "sawtooth", 0.06, -120); },
      plane: () => { noise(0.35, 1800, 0.08, 0, 0.9); tone(500, 0.35, "sine", 0.06, 900); },
      boom: () => { noise(0.3, 600, 0.16, 0, 0.7); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "square", 0.05, 0, i * 0.05)); },
      rankUp: (n) => { for (let i = 0; i < Math.min(4, n) + 1; i++) tone(660 * Math.pow(1.19, i), 0.08, "square", 0.06, 0, i * 0.06); noise(0.15, 3000, 0.05, 0, 1); },
      rankDn: () => { tone(520, 0.22, "triangle", 0.08, -260); },
      bomb: () => { for (let k = 0; k < 3; k++) { tone(880, 0.09, "square", 0.07, 0, k * 0.2); tone(587, 0.09, "square", 0.07, 0, k * 0.2 + 0.1); } noise(0.4, 300, 0.2, 0.6, 0.6); },
      chunk: () => { noise(0.08, 900, 0.1, 0, 1); tone(330, 0.08, "square", 0.05, -100); },
      event: () => { [988, 1318, 988, 1568].forEach((f, i) => tone(f, 0.08, "triangle", 0.07, 0, i * 0.08)); },
      cover: () => { noise(0.12, 2500, 0.08, 0, 1.5); noise(0.12, 2000, 0.08, 0.18, 1.5); [1318, 1568, 2093].forEach((f, i) => tone(f, 0.1, "triangle", 0.06, 0, 0.3 + i * 0.07)); },
      chime: () => { [[1318, 0], [1046, 0.35], [1175, 0.7], [784, 1.05]].forEach(([f, at]) => { tone(f, 0.6, "triangle", 0.09, 0, at); tone(f * 2, 0.3, "sine", 0.025, 0, at); }); },
      drum: () => { noise(0.06, 180, 0.25, 0, 0.8); tone(110, 0.08, "sine", 0.18, -40); },
      fanfare: () => { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.16, "square", 0.06, 0, i * 0.08)); },
      mail: () => { tone(1568, 0.08, "sine", 0.1); tone(2093, 0.18, "sine", 0.1, 0, 0.1); },
    };

    // ── 화면 글자 ──
    const say = (t, cls = "", sec = 1.4) => { sayEl.textContent = t; sayEl.className = "wr-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; lastSay = el; };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "wr-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const at = (n) => { const r = n.getBoundingClientRect(), s = st.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]; };
    const rankOf = (e) => e.slot + 1;
    const setRk = (e, n, dn) => {
      const old = e.rkEl.querySelector("i:not(.out)");
      if (old && old.textContent === String(n)) return;
      if (old) { old.className = "out" + (dn ? " dn" : ""); setTimeout(() => old.remove(), 320); }
      const ni = document.createElement("i"); ni.textContent = n; ni.className = old ? "in" + (dn ? " dn" : "") : ""; e.rkEl.appendChild(ni);
      e.el.classList.remove("r1", "r2", "r3"); if (n <= 3) e.el.classList.add("r" + n);
    };
    const reflow = (instant) => {
      const o = ents.slice().sort((a, b) => b.s - a.s);
      const before = ME.slot;
      o.forEach((e, i) => {
        if (e.slot === i) return;
        const dn = e.slot >= 0 && i > e.slot, d = e.slot < 0 ? 0 : e.slot - i;
        e.slot = i;
        if (instant) e.el.classList.add("now");
        e.el.style.transform = `translateY(${i * rowH}px)`;
        if (instant) { void e.el.offsetWidth; e.el.classList.remove("now"); }
        setRk(e, i + 1, dn);
        if (!instant && d) { e.dlEl.textContent = (d > 0 ? "▲" : "▼") + Math.abs(d); e.dlEl.className = d > 0 ? "u" : "d"; e.dlT = 1.3; }
      });
      if (!instant && before >= 0 && ME.slot !== before) myRankFx(before - ME.slot);
      F.sc.textContent = `내 순위 ${ME.slot + 1}위`;
    };
    const myRankFx = (d) => {
      const c = at(ME.el);
      ME.el.classList.remove("gl", "hurt"); void ME.el.offsetWidth;
      if (d > 0) {
        ME.el.classList.add("gl"); S.rankUp(d); vib(d > 1 ? [15, 30, 15] : 15); F.burst([c[0], c[1]], "#9fd8ff", 10 + d * 4);
        F.float([sw * 0.62, c[1]], ME.slot === 0 ? "1위 탈환!" : `추월! ${ME.slot + 1}위`);
        cs.happy = 1.4; if (ME.slot <= 2 && el - lastSay > 1.5) say(ME.slot === 0 ? "1위다!!" : pick(["가즈아!", "올라간다!", `${ME.slot + 1}위 찍었다`]), "gd", 1.2);
      } else {
        ME.el.classList.add("hurt"); S.rankDn(); vib(30); F.float([sw * 0.62, c[1]], `${ME.slot + 1}위로…`, "bad");
        cs.sad = 1.0; if (el - lastSay > 2) say(pick(["아 밀렸다…", "안 돼…!", "추월당했어"]), "rd", 1.1);
      }
    };
    const updPts = (force) => { for (const e of ents) { const v = Math.round(e.s); if (force || v !== e.shownS) { e.shownS = v; e.ptEl.textContent = fmt(v); } } };

    // ── 내 행동 ──
    const loyUpd = () => { loyI.style.setProperty("--w", Math.round(loy * 100) + "%"); loyEl.classList.remove("pop"); void loyEl.offsetWidth; loyEl.classList.add("pop"); };
    const curG = () => (tut === 4 ? 24 : tut >= 0 ? 0 : el);
    const upload = () => {
      if (over || stock <= 0) { if (!over) { F.msg("원고가 다 떨어졌어요"); SFX.fail(); } return; }
      if (tut >= 0 && tut !== 4) return;
      if (cd > 0) { F.msg("다음 회차 다듬는 중…"); SFX.tok(); return; }
      const t = trAt(curG()), amt = 150 * t * appeal * (1 + 0.8 * loy);
      stock--; cd = CD; fresh = 3; idleUp = 0; if (tut < 0) upTr.push(t);
      updPips(); flash = 0.35;
      // 종이비행기: 폰 → 내 줄
      const from = [(phX + 6.5) * K, (phY + 8) * K], to = at(ME.covEl);
      const pl = document.createElement("img"); pl.className = "wr-plane"; pl.src = pixURL("plane"); st.appendChild(pl);
      const mid = [(from[0] + to[0]) / 2 + 60, Math.min(from[1], to[1]) - 30];
      const kf = [from, mid, to].map(([x, y], i) => ({ transform: `translate(${x - 15}px,${y - 12}px) rotate(${i === 0 ? -20 : i === 1 ? -50 : -80}deg) scale(${i === 1 ? 1.4 : 1})` }));
      pl.style.transform = kf[0].transform; pl.style.opacity = "1";
      try { pl.animate(kf, { duration: 520, easing: "ease-in", fill: "forwards" }); } catch (e) {}
      setTimeout(() => pl.remove(), 540);
      S.plane(); vib(10);
      setTimeout(() => {
        if (done) return;
        bursts.push({ left: 1.4, rate: amt / 1.4 }); tag(ME, "new", 1.8);
        const c = at(ME.el); S.boom(); vib([15, 20, 15]); F.burst(to, t >= PEAK ? "#ffd166" : "#9fd8ff", t >= PEAK ? 22 : 8);
        F.float([sw * 0.66, c[1] - 4], t >= PEAK ? `조회 폭발! +${fmt(amt)}` : `+${fmt(amt)}`);
        ME.el.classList.remove("gl"); void ME.el.offsetWidth; ME.el.classList.add("gl");
        if (t >= PEAK) { cs.happy = 1.5; for (let i = 0; i < 16; i++) heads.push({ x: gx0 + curG() / 30 * (gx1 - gx0) + rnd() * 4 - 2, y: gyT, vx: (rnd() - 0.5) * 30, vy: -20 - rnd() * 30, t: 0.8, c: pick(["#ffd166", "#fff", "#9fd8ff"]) }); }
      }, 500);
      if (tut < 0 && t < 1.2 && !lowWarn) { lowWarn = true; setTimeout(() => F.msg("지금은 독자가 적어요… 피크면 3배 넘게!"), 650); }
      if (tut === 4) setTimeout(() => tut === 4 && tutNext(5), 1500);
    };
    const changeCover = () => {
      if (over || coverUsed) { if (coverUsed && !over) { F.msg("표지는 한 번만 바꿀 수 있어요"); SFX.tok(); } return; }
      if (tut >= 0 && tut !== 2) return;
      coverUsed = true; appeal = 1.3; S.cover(); vib(12);
      ME.covEl.classList.remove("flip"); void ME.covEl.offsetWidth; ME.covEl.classList.add("flip");
      setTimeout(() => { ME.img.src = coverNew; F.burst(at(ME.covEl), "#9fd8ff", 14); F.float(at(ME.covEl), "표지 교체! 클릭률 +30%"); }, 260);
      bCov.classList.add("off"); bCov.querySelector("small").textContent = "교체 완료";
      cs.happy = 1.2; say("새 표지 예쁘다!", "gd", 1.2);
      if (tut === 2) setTimeout(() => tut === 2 && tutNext(3), 900);
    };
    const joinEvent = () => {
      if (over) return;
      if (tut >= 0 && tut !== 3) return;
      if (evWin <= 0) { F.msg(evJoined > 0 ? "이벤트 참여 중이에요" : "지금은 이벤트가 없어요"); SFX.tok(); return; }
      evWin = 0; evOn = 7; evJoined = 7; S.event(); vib(15); tag(ME, "rec", 7);
      banner("추천 배너 노출!<small>7초 동안 조회 1.6배</small>", "pk"); F.burst(at(bEv), "#ff8fc8", 14);
      cs.happy = 1.2;
      if (tut === 3) setTimeout(() => tut === 3 && tutNext(4), 1100);
    };
    btEl.addEventListener("pointerdown", (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return; e.preventDefault();
      const a = b.dataset.a; if (a === "up") upload(); else if (a === "cov") changeCover(); else joinEvent();
    });
    const updPips = () => pips.forEach((p, i) => p.classList.toggle("on", i < stock));

    // ── 댓글 ──
    const nk = () => pick(NICK_A) + pick(NICK_B);
    const spawnCm = (o = {}) => {
      if (cms.filter((c) => !c.gone).length >= 3) return null;
      const troll = o.troll ?? (rnd() < 0.24 && el > 3);
      const e = document.createElement("div"); e.className = "wr-cm" + (troll ? " tr" : "");
      e.innerHTML = `<b>${troll ? "" : `<img src="${pixURL("heart")}" alt="">`}${troll ? "익명" : nk()}</b><span>${troll ? pick(C_TROLL) : pick(C_GOOD)}</span>`;
      cmsEl.appendChild(e);
      const xMin = Math.round(avX + avW * 0.78), w = Math.min(178, e.offsetWidth || 150), x = clamp(xMin + rnd() * Math.max(0, sw - 8 - w - xMin), 4, sw - w - 4);
      const c = { el: e, troll, x, y: pH - 26 - (e.offsetHeight || 34) - rnd() * 10, vy: -(pH * 0.42) / (3.4 * ez), life: 3.4 * ez, gone: false, hold: !!o.hold };
      e.style.left = Math.round(c.x) + "px"; e.style.top = Math.round(c.y) + "px";
      e._c = c; cms.push(c); S.cmPop();
      return c;
    };
    cmsEl.addEventListener("pointerdown", (ev) => {
      const t = ev.target.closest(".wr-cm"); if (!t || !t._c) return; ev.preventDefault();
      const c = t._c; if (c.gone || over) return;
      if (tut >= 0 && tut !== 1) return;
      c.gone = true; const p = [c.x + 60, pTop + c.y + 16];
      if (c.troll) {
        trollTap++; loy = Math.max(0, loy - 0.12); loyUpd(); S.troll(); vib([20, 30, 20]); t.classList.add("no"); F.float(p, "악플엔 무대응!", "bad"); F.msg("악플은 답하지 말고 흘려보내요");
        cs.angry = 1.1; say("으… 괜히 답했다", "rd", 1.1);
      } else {
        replies++; loy = Math.min(1, loy + 0.11); loyUpd(); S.reply(); vib(10); t.classList.add("ok"); F.burst(p, "#ff8fc8", 10); F.float(p, "충성도 +");
        cs.blush = 1.1; if (rnd() < 0.35 && el - lastSay > 2) say(pick(["감사합니다!", "다음 화 곧 올려요~", "사랑해요 독자님"]), "", 1.1);
      }
      setTimeout(() => t.remove(), 460);
      if (tut === 1) setTimeout(() => tut === 1 && tutNext(2), 700);
    });
    const moveCms = (dt) => {
      for (let i = cms.length - 1; i >= 0; i--) {
        const c = cms[i];
        if (c.gone) { cms.splice(i, 1); continue; }
        if (!c.hold) { c.y += c.vy * dt; c.life -= dt; }
        c.el.style.left = Math.round(c.x) + "px"; c.el.style.top = Math.round(c.y) + "px";
        if (c.life <= 0) { c.gone = true; if (!c.troll && tut < 0) { cmMiss++; loy = Math.max(0, loy - 0.03); loyUpd(); } c.el.classList.add("fade"); setTimeout(() => c.el.remove(), 380); }
      }
    };

    // ── 라이벌 ──
    const rivalUps = () => { ents.forEach((e) => { if (!e.me) e.ups = [3 + rnd() * 8, 12 + rnd() * 6, 19 + rnd() * 10]; }); };
    rivalUps();
    const bomb = (k) => {
      const o = ents.slice().sort((a, b) => b.s - a.s), mi = o.indexOf(ME);
      let tg = k === 0 ? (mi > 0 ? o[mi - 1] : o[1]) : (mi > 0 ? o[mi - 1] : o[1]);
      if (!tg || tg.me) tg = o.find((e) => !e.me);
      const n = k === 0 ? 5 : 3, tot = (k === 0 ? 3 : 2) * 140 * trAt(el) * (tg.rate);
      bombs++;
      tg.tags.bomb.textContent = `연참 ×${n}`; tag(tg, "bomb", 3.2);
      banner(`연참 폭탄!<small>'${tg.d.t}' ${n}연속 업로드</small>`, "rd"); S.bomb(); vib([50, 40, 50, 40, 80]);
      redEl.classList.remove("on"); void redEl.offsetWidth; redEl.classList.add("on");
      tg.el.classList.remove("shk"); void tg.el.offsetWidth; tg.el.classList.add("shk");
      cs.shock = 1.4; say(pick(["연참이라고?!", "반칙이야…!", "맞불 놓자!"]), "rd", 1.4);
      for (let i = 0; i < n; i++) setTimeout(() => {
        if (done || over) return; tg.s += tot / n; S.chunk(); const c = at(tg.el); F.burst([sw * 0.4, c[1]], "#ff5a3a", 7); F.float([sw * 0.75, c[1]], `+${fmt(tot / n)}`, "bad");
        tg.el.classList.remove("shk"); void tg.el.offsetWidth; tg.el.classList.add("shk");
      }, 350 + i * 420);
      if (stock > 0) setTimeout(() => { if (!over && tut < 0) F.msg("피크 타임! 연재로 맞받아쳐요"); }, 1200);
    };

    // ── 그리기 ──
    let g = gB; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const render = () => {
      g = gB; g.drawImage(BG, 0, 0);
      stars.forEach(([x, y], i) => { if (Math.sin(tm * 2 + i * 1.7) > 0) P(x, y, 1, 1, "#fff8"); });
      wins.forEach(([x, y], i) => { if (Math.sin(tm * 0.5 + i * 2.3) > -0.4) P(x, y, 1, 1, i % 3 ? "#ffd56a" : "#ffeebb"); });
      const BC = ["#ff6a8a", "#ffd166", "#7fe0a8", "#5fb8ff", "#c79cff"];
      bulbs.forEach(([x, y], i) => { const on = Math.sin(tm * 3 + i * 1.3) > -0.3; P(x, y, 1, 2, on ? BC[i % 5] : tint(BC[i % 5], 0.45)); if (on) { g.globalAlpha = 0.25; P(x - 1, y, 3, 3, BC[i % 5]); g.globalAlpha = 1; } });
      // LIVE 점
      // 그래프 막대
      const G0 = curG(), cur = Math.min(29, Math.floor(G0));
      for (let i = 0; i < 30; i++) {
        const t = trAt(i + 0.5), h = Math.max(2, Math.round((t / 3.3) * (gyB - gyT))), x = gx0 + Math.round(i * gStep), w = Math.max(2, Math.floor(gStep) - 1);
        const pk = t >= PEAK, past = i < cur, now = i === cur;
        let col = pk ? "#ffd166" : "#5a7ac8";
        if (past) col = pk ? "#7a6430" : "#33456e";
        if (now) col = Math.floor(tm * 6) % 2 ? "#ffffff" : pk ? "#fff3b0" : "#9fd8ff";
        P(x, gyB - h, w, h, col); P(x, gyB - h, w, 1, tint(col, 1.25));
        if (now) { const ax = x + (w >> 1); P(ax - 2, gyB - h - 5, 5, 1, "#fff"); P(ax - 1, gyB - h - 4, 3, 1, "#fff"); P(ax, gyB - h - 3, 1, 1, "#fff"); }
      }
      P(gx0, gyB, gx1 - gx0, 1, "#5a5070");
      // 독자 머리(지금 막대 위에서 퐁퐁)
      heads.forEach((h) => { g.globalAlpha = clamp(h.t * 1.6, 0, 1); P(Math.round(h.x), Math.round(h.y), 2, 2, h.c); P(Math.round(h.x), Math.round(h.y) + 2, 2, 1, "#2a2448"); }); g.globalAlpha = 1;
      // 앞: 이불·폰
      g = gF; g.clearRect(0, 0, LW, LH); g.drawImage(FG, 0, 0);
      const sg = g.createRadialGradient(phX + 6, phY + 4, 1, phX + 6, phY + 4, 22); sg.addColorStop(0, `rgba(140,200,255,${0.22 + flash})`); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(phX - 20, phY - 22, 52, 44);
      {
        const pw = 11, ph = 17, x0 = phX + 1, y0 = phY + 3, sx = x0 + 1, sy = y0 + 1, sW = pw - 2, sH = ph - 3, my = Math.min(3, ME.slot), SKIN_C = "#f2c9a8";
        P(x0 - 1, y0 - 1, pw + 2, ph + 2, "#1a1424"); P(x0, y0, pw, ph, "#ff8fc8"); P(x0, y0, pw, 1, "#ffc8e4"); P(x0 + pw - 1, y0, 1, ph, "#d0609a");
        P(sx, sy, sW, sH, flash > 0 ? "#ffffff" : "#0e1838");
        if (flash <= 0) {
          P(sx, sy, sW, 2, "#1f6fd0"); P(sx + 1, sy, 3, 1, "#9fd8ff");
          for (let i = 0; i < 4; i++) { const yy = sy + 3 + i * 3; if (i === my) P(sx, yy - 1, sW, 3, "#5fb8ff55"); P(sx + 1, yy, 1, 1, i === 0 ? "#ffd166" : i === my ? "#9fd8ff" : "#6a6a8a"); P(sx + 3, yy, i === my ? 5 : 4, 1, i === my ? "#9fd8ff" : "#4a4a6a"); }
        }
        P(x0 + 4, y0 + ph - 1, 3, 1, "#ffffff88");
        P(x0 - 3, y0 + 8, 3, 7, SKIN_C); P(x0 - 3, y0 + 8, 3, 1, "#ffdcc0"); P(x0 - 1, y0 + 9, 2, 2, SKIN_C); P(x0 + pw, y0 + 8, 3, 7, SKIN_C); P(x0 + pw, y0 + 8, 3, 1, "#ffdcc0"); P(x0 + pw - 1, y0 + 9, 2, 2, SKIN_C);
      }
      // 색종이
      g = gX; g.clearRect(0, 0, LW, LH);
      conf.forEach((c) => P(Math.round(c.x), Math.round(c.y), c.t % 2 ? 1 : 2, c.t % 2 ? 2 : 1, c.c));
    };

    // ── 나(표정·몸짓) ──
    const meTick = () => {
      if (!art) return;
      const r = ME.slot + 1;
      const ex = cs.shock > 0 ? "surprised" : cs.angry > 0 ? "angry" : cs.sad > 0 ? "sad" : cs.blush > 0 ? "blush" : cs.happy > 0 ? "smile" : r <= 2 ? "smile" : r >= 5 && el > 15 ? "sad" : "neutral";
      if (ex !== meX) { meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; }
      let tf;
      if (cs.shock > 0) tf = `translateX(${Math.floor(tm * 30) % 2 ? 2 : -2}px)`;
      else if (cs.happy > 0) tf = `translateY(${-Math.round(Math.abs(Math.sin(tm * 10)) * 5)}px)`;
      else if (cs.sad > 0) tf = `translateY(4px) rotate(-2deg)`;
      else tf = `translateY(${(Math.sin(tm * 1.6) * 1.2).toFixed(1)}px)`;
      if (tf !== meT) { meT = tf; meEl.style.transform = tf; }
    };

    // ── 손가락 ──
    hand.style.backgroundImage = `url(${fingerURL()})`;
    let handKey = null;
    const handAt = (n) => {
      if (!n) { if (handKey) { hand.className = "wr-hand"; handKey = null; } return; }
      const [x, y] = at(n); hand.style.left = Math.round(x + 4) + "px"; hand.style.top = Math.round(y - (n.classList.contains("wr-b") ? 8 : 2)) + "px";
      if (handKey !== n) { handKey = n; hand.className = "wr-hand on"; }
    };
    const guide = () => {
      if (tut >= 0) {
        if (tut === 1) handAt(cms.find((c) => !c.gone)?.el);
        else if (tut === 2) handAt(bCov); else if (tut === 3) handAt(bEv); else if (tut === 4) handAt(bUp); else handAt(null);
        return;
      }
      if (over) return handAt(null);
      const t = trAt(el);
      // 꼭 필요할 때만: 이벤트 창 > 피크인데 놀고 있는 원고 > 첫 댓글 > 첫 표지
      if (evWin > 0 && evIdx <= 1 && hint.ev < 2) return handAt(bEv);
      if (t >= PEAK && stock > 0 && cd <= 0 && (upTr.length === 0 || idleUp > 2.5 || el > 26)) return handAt(bUp);
      const good = cms.find((c) => !c.gone && !c.troll && c.life > 0.6);
      if (good && replies === 0 && el < 12) return handAt(good.el);
      if (!coverUsed && el > 1 && el < 9 && hint.cov < 6) return handAt(bCov);
      handAt(null);
    };

    // ── 흐름 ──
    const evWinUpd = () => {
      const sm = bEv.querySelector("small");
      if (evWin > 0) { bEv.className = "wr-b ev"; bEv.style.setProperty("--cd", Math.round((1 - evWin / (4 * ez)) * 100) + "%"); sm.textContent = `참여! ${Math.ceil(evWin)}초`; }
      else if (evJoined > 0) { bEv.className = "wr-b off"; bEv.style.setProperty("--cd", "0%"); sm.textContent = `추천 중 ${Math.ceil(evJoined)}초`; }
      else { bEv.className = "wr-b off"; bEv.style.setProperty("--cd", "0%"); const nx = EVT[evIdx]; sm.textContent = tut < 0 && nx != null && nx > el ? `${hm(nx)} 예정` : tut < 0 ? "끝" : "대기 중"; }
      const t = trAt(curG());
      bUp.classList.toggle("hot", !over && stock > 0 && cd <= 0 && (t >= PEAK || tut === 4));
      bUp.classList.toggle("off", stock <= 0 || over);
      bUp.style.setProperty("--cd", cd > 0 ? Math.round((cd / CD) * 100) + "%" : "0%");
      bCov.classList.toggle("off", coverUsed || over);
      const gs = `×${t.toFixed(1)}`; if (gs !== gxShown) { gxShown = gs; gxEl.querySelector("b").textContent = gs; gxEl.classList.toggle("pk", t >= PEAK); }
      const ck = tut === 4 ? "23:00" : tut >= 0 ? "19:00" : over ? "00:00" : hm(el); if (clkEl.textContent !== ck) clkEl.textContent = ck;
      clkEl.classList.toggle("hot", !over && tut < 0 && el > T - 5);
    };
    const gameTick = (dt) => {
      const t = trAt(el);
      // 내 조회: 기본 흐름 × 표지 × 충성도 × 이벤트 × 새 회차
      ME.s += 34 * t * appeal * (1 + 0.6 * loy) * (evOn > 0 ? 1.6 : 1) * (fresh > 0 ? 1.25 : 1) * dt;
      for (const e of ents) if (!e.me) {
        e.s += 52 * e.rate * t * dt;
        e.ups.forEach((u, j) => { if (u >= 0 && el >= u) { e.ups[j] = -1; const v = 170 * t * e.rate; e.s += v; tag(e, "new", 1.5); e.el.classList.remove("gl"); void e.el.offsetWidth; e.el.classList.add("gl"); tone(990, 0.05, "triangle", 0.03); } });
      }
      if (evIdx < EVT.length && el >= EVT[evIdx]) { evIdx++; evWin = 4 * ez; banner("이벤트 오픈!<small>지금 참여하면 추천 배너</small>", "pk"); S.event(); vib(15); }
      if (bombs < BOMB.length && el >= BOMB[bombs]) bomb(bombs);
      if (el >= 18 && !hint.pk) { hint.pk = 1; banner("피크 타임!<small>밤 10시, 독자가 몰려와요. 지금 연재!</small>", "gd"); tone(988, 0.1, "square", 0.07); tone(1318, 0.18, "square", 0.07, 0, 0.1); }
      if (el >= 26 && stock > 0 && !hint.end) { hint.end = 1; F.msg(`원고 ${stock}편 남았어요! 마감 전에 다 올려요`); }
      if (el >= nextCm) { spawnCm(); nextCm = el + 1.5 + rnd() * 0.9; }
      if (!coverUsed && el > 1) hint.cov += dt;
      if (t >= PEAK && stock > 0 && cd <= 0) idleUp += dt;
      if (el - lastSay > 6 && el > 3) say(pick(t >= PEAK ? ["지금이 피크다!", "독자들 몰려온다"] : ["피크까지 버티자", "댓글부터 챙기자", "원고는 아껴 둬야지"]), "", 1.3);
    };
    const common = (dt) => {
      for (const k in cs) if (cs[k] > 0) cs[k] -= dt;
      if (cd > 0) cd -= dt; if (fresh > 0) fresh -= dt; if (flash > 0) flash -= dt;
      if (evWin > 0 && tut < 0) { evWin -= dt; if (evWin <= 0) { evWin = 0; if (!evJoined) F.msg("이벤트를 놓쳤어요"); } }
      if (evOn > 0) evOn -= dt; if (evJoined > 0) evJoined -= dt;
      for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i], d = Math.min(dt, b.left); ME.s += b.rate * d; b.left -= d; if (b.left <= 0) bursts.splice(i, 1); }
      for (const e of ents) { if (e.dlT > 0) { e.dlT -= dt; if (e.dlT <= 0) e.dlEl.className = ""; } for (const k in e.tagT) if (e.tagT[k] > 0) { e.tagT[k] -= dt; if (e.tagT[k] <= 0) e.tags[k].classList.remove("on"); } }
      // 독자 머리: 지금 막대 위에서 퐁퐁
      if (!over && rnd() < dt * trAt(curG()) * 3) { const x = gx0 + Math.min(29, Math.floor(curG())) * gStep; heads.push({ x: x + rnd() * 2, y: gyB - Math.round((trAt(curG()) / 3.3) * (gyB - gyT)) - 3, vx: (rnd() - 0.5) * 8, vy: -10 - rnd() * 8, t: 0.7, c: pick(["#ffd8b0", "#f2c9a8", "#c8a080"]) }); }
      for (let i = heads.length - 1; i >= 0; i--) { const h = heads[i]; h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 30 * dt; h.t -= dt; if (h.t <= 0) heads.splice(i, 1); }
      for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.y += c.vy * dt; c.x += c.vx * dt + Math.sin(tm * 6 + i) * 0.2; c.t = (c.t + 1) % 8; if (c.y > LH) conf.splice(i, 1); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      moveCms(dt); reflow(false); updPts(); evWinUpd(); meTick(); guide();
    };

    // ── 리허설 ──
    const SKIP = `<button class="wr-skip" data-skip>건너뛰기</button>`;
    const tutNext = (n) => {
      tut = n; tutT = 0; handAt(null); tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        say("공모전 마지막 날이다!", "", 1.6);
        tutP.innerHTML = `독자 <b class="pk">댓글</b>이 떠오르면 <b class="bl">톡</b>!<br>답글을 달면 <b class="pk">충성도</b>가 올라 조회가 늘어요`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut === 1) spawnCm({ hold: true, troll: false }); }, 350);
      } else if (n === 2) {
        tutP.innerHTML = `회색 <b>임시 표지</b>는 손이 안 가요.<br><b class="bl">표지 바꾸기</b>는 딱 한 번! 지금 톡`; tutB.innerHTML = SKIP;
      } else if (n === 3) {
        evWin = 4; tutP.innerHTML = `<b class="pk">이벤트</b>가 열리면 바로 참여!<br>잠깐 <b class="pk">추천 배너</b>에 올라가요`; tutB.innerHTML = SKIP; S.event();
      } else if (n === 4) {
        tutP.innerHTML = `그래프의 <b class="gd">노란 칸이 피크</b>(밤 10~12시).<br>피크에 <b class="bl">연재 올리기</b>를 하면 조회 폭발!`; tutB.innerHTML = SKIP;
      } else if (n === 5) {
        cs.happy = 1.5; say("좋아, 순위 올려 보자!", "gd", 1.6);
        tutP.innerHTML = `원고는 <b class="bl">5편뿐</b>! <b class="gd">피크까지 아껴</b> 두고,<br>그 전엔 댓글·표지·이벤트로 준비해요. <b class="rd">악플·연참 폭탄</b> 주의!`;
        tutB.innerHTML = `<button class="wr-go" data-go>레이스 시작!</button>`;
      }
    };
    const resetAll = () => {
      ents.forEach((e) => { if (!e.me) { const i = rivals.indexOf(e.d); e.s = START[i]; } e.dlT = 0; e.dlEl.className = ""; for (const k in e.tagT) { e.tagT[k] = 0; e.tags[k].classList.remove("on"); } });
      ME.s = ME0; rivalUps();
      loy = 0.15; appeal = 1; coverUsed = false; stock = STOCK; cd = 0; fresh = 0; evOn = 0; evWin = 0; evIdx = 0; evJoined = 0; nextCm = 1.2;
      replies = 0; trollTap = 0; cmMiss = 0; upTr = []; lowWarn = false; bombs = 0; lastSay = 0; idleUp = 0; hint = { cov: 0, cm: 0, pk: 0, ev: 0, end: 0 };
      bursts.length = 0; cms.forEach((c) => { c.gone = true; c.el.remove(); }); cms.length = 0;
      ME.img.src = coverOld; bCov.querySelector("small").textContent = "1번만";
      for (const k in cs) cs[k] = 0;
      reflow(true); updPts(true); updPips(); loyUpd();
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; handAt(null); tutEl.classList.add("off");
      resetAll(); el = 0;
      SFX.go?.(); say("자정까지 5시간! 가자!", "", 1.4);
      timer(T, F.bar, end);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });

    // ── 자정: 최종 순위 발표 ──
    const scoreNow = () => {
      const r = ME.slot + 1, rankS = [1, 0.82, 0.68, 0.5, 0.34, 0.2][r - 1];
      const peakS = clamp(upTr.reduce((a, b) => a + b, 0) / (STOCK * 3.05), 0, 1);
      const loyS = clamp(replies / Math.max(4, replies + cmMiss * 0.6 + trollTap * 1.5), 0, 1);
      return { r, rankS, peakS, loyS, score: clamp(0.62 * rankS + 0.23 * peakS + 0.15 * loyS, 0, 1) };
    };
    const end = () => {
      if (over) return; over = true; handAt(null);
      bursts.forEach((b) => (ME.s += b.rate * b.left)); bursts.length = 0;
      cms.forEach((c) => { c.gone = true; c.el.classList.add("fade"); });
      reflow(false); updPts(true);
      S.chime(); vib([40, 60, 40]); banner("자정 마감!<small>00:00 · 집계 중…</small>"); cs.shock = 0.8; say("마감이다…!", "", 1.4);
      evWinUpd();
      const s = scoreNow(); finalRank = s.r; finalScore = s.score;
      // 6위부터 1위까지 차례로 비춘다
      const o = ents.slice().sort((a, b) => b.s - a.s);
      setTimeout(() => { if (done) return; dimEl.classList.add("on"); bdEl.style.zIndex = 16; banner("최종 순위 발표", "gd"); }, 1700);
      for (let k = 5; k >= 0; k--) setTimeout(() => {
        if (done) return; const e = o[k];
        e.el.classList.remove("rv", "gl"); void e.el.offsetWidth; e.el.classList.add("rv"); S.drum(); vib(8);
        if (e.me) { e.el.classList.add("fin"); F.burst(at(e.el), "#ffd166", 16); tone(1318, 0.15, "square", 0.07); vib([20, 30, 20]); }
      }, 2600 + (5 - k) * 380);
      const tR = 2600 + 6 * 380 + 300;
      setTimeout(() => {
        if (done) return;
        const win = finalRank <= 3;
        if (win) {
          crownEl.classList.add("on"); S.fanfare(); vib([30, 40, 30, 40, 60]); cs.happy = 9;
          banner(`최종 ${finalRank}위!<small>${finalRank === 1 ? "공모전 대상" : finalRank === 2 ? "공모전 최우수상" : "공모전 우수상"}</small>`, "gd");
          say(finalRank === 1 ? "대상이다!!!" : "수상이다!!", "gd", 3);
          for (let i = 0; i < 60; i++) conf.push({ x: rnd() * LW, y: -rnd() * 30, vy: 14 + rnd() * 22, vx: (rnd() - 0.5) * 12, c: pick(["#ffd166", "#5fb8ff", "#ff8fc8", "#fff", "#7fe0a8"]), t: rint(4) });
        } else {
          banner(`최종 ${finalRank}위<small>아깝게 수상권 밖…</small>`); S.rankDn(); cs.sad = 9; say("다음 공모전엔 꼭…", "rd", 3);
        }
        setTimeout(() => {
          if (done) return;
          envEl.src = pixURL("env", { ...PCOL, w: win ? "#fff3d0" : "#e0dcec" });
          ltEl.innerHTML = win
            ? `<i>노블리 편집부</i><b>유료 연재 제안드립니다</b>공모전 ${finalRank}위 축하드려요!<br>'${MINE.t}', 다음 달부터<br>유료 연재로 함께해요.<s>계약 제안</s>`
            : `<i>노블리 알림</i><b>공모전 결과: ${finalRank}위</b>수상은 놓쳤지만 오늘 밤<br>선작 ${fmt(40 + replies * 12 + upTr.length * 20)}명이 늘었어요.<br>다음 공모전을 노려 봐요!`;
          mailEl.classList.toggle("sad", !win); mailEl.style.top = (win ? rowsTop + 3 * rowH - 14 : gTop + 2) + "px"; mailEl.classList.add("on"); S.mail(); vib(15);
          setTimeout(() => { if (!done) { mailEl.classList.add("op"); S.pop?.(); if (win) setTimeout(() => !done && SFX.stamp(), 500); } }, 450);
        }, 1300);
        setTimeout(fin, 4800);
      }, tR);
    };
    const fin = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      const s = scoreNow();
      const line = `<b>최종 ${s.r}위</b>${s.r <= 3 ? " · 유료 연재 제안!" : ""} · 피크 연재 ${upTr.filter((t) => t >= PEAK).length}/${STOCK}편 · 답글 ${replies}개`;
      finish(finalScore || s.score, line, "", [["최종 순위", s.rankS], ["피크 타이밍", s.peakS], ["독자 관리", s.loyS]]);
    };

    // ── 돌리기 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) { tut = 5; startGame(); } else tutNext(1); }
      } else if (!over) { el += dt; gameTick(dt); }
      common(dt); render();
      raf = requestAnimationFrame(loop);
    };
    if (dbg) dbg.webnovel3 = {
      st: () => ({ tut, el: +el.toFixed(2), rank: ME.slot + 1, me: Math.round(ME.s), top: ents.slice().sort((a, b) => b.s - a.s).map((e) => (e.me ? "*" : "") + Math.round(e.s)), stock, loy: +loy.toFixed(2), cover: coverUsed, evWin: +evWin.toFixed(1), replies, trollTap, cmMiss, upTr: upTr.map((t) => +t.toFixed(1)), over, art, finalRank, score: +finalScore.toFixed(3) }),
      tut: () => tut,
      tutDo: () => {
        if (tut === 1) { const c = cms.find((x) => !x.gone); if (c) c.el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); }
        else if (tut === 2) changeCover(); else if (tut === 3) joinEvent(); else if (tut === 4) upload(); else if (tut === 5) startGame();
      },
      start: startGame,
      auto: (bad = false) => {
        if (tut >= 0 || over) return;
        if (bad) { if (stock > 0 && cd <= 0) upload(); const c = cms.find((x) => !x.gone && x.troll); if (c && rnd() < 0.3) c.el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); return; }
        const c = cms.find((x) => !x.gone && !x.troll); if (c) c.el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        if (!coverUsed && el > 1) changeCover();
        if (evWin > 0) joinEvent();
        if (stock > 0 && cd <= 0 && trAt(el) >= 2.1) upload();
      },
    };
    reflow(true); updPts(true); updPips(); loyUpd(); render(); meTick();
    raf = requestAnimationFrame(loop);
  },
};
