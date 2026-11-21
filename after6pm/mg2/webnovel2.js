// 웹소설 2탄(webnovel2) "작가님 절단신공": 오늘 회차는 다 썼다. 이제 어디서 '다음 화에 계속'으로 끊을지가 승부.
// 원고가 위로 흘러가고, 오른쪽 '긴장도' 파형이 같이 흐른다. 빨간 점선(절단각)을 넘는 진짜 꼭대기 줄이
// 가위선에 왔을 때 톡 → 가위가 지나가고 "다음 화에 계속" 도장이 쾅. 너무 일찍(분량 표시 전)이면 "분량 실화?",
// 늦으면 긴장이 풀려 독자 이탈이 오른다. 점선 아래 작은 봉우리(가짜 꼭대기)에 속으면 손해. 회차 4개를 이어서.
// 마지막엔 '다음 화 결제' 숫자가 쭉 오르고 유료 전환율이 나온다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const EPS = 4, TH = 0.8;
// 장르: 이름, 색, 작품 제목, 줄 묶음(평온·대사·위기·가짜 꼭대기·절단 줄·풀린 뒤)
const GEN = {
  reg: { n: "회귀물", c: "#5fb8ff", t: "회귀한 신입은 칼퇴한다",
    calm: ["출근 첫날 아침이었다.", "엘리베이터가 열렸다.", "책상에 서류가 쌓였다.", "커피가 식어 갔다.", "창밖에 벚꽃이 졌다.", "팀장이 하품을 했다.", "모니터가 깜빡였다.", "점심은 김치찌개였다."],
    talk: ["“이번엔 안 당해.”", "“그 주식, 지금 사.”", "“부장님, 그거 망해요.”", "“너 그때 나 버렸지.”", "“10년 전이라고?”", "“이번 생은 칼퇴다.”", "“회의 5분이면 돼요.”"],
    crisis: ["회장실 문이 잠겼다.", "기억과 다른 일이 터졌다.", "누가 내 이름을 불렀다.", "결재판이 바뀌어 있었다.", "전생의 그가 웃었다."],
    fake: ["“잠깐, 이상한데?”", "전화벨이 울렸다!", "“누구세요?!”", "탕비실에서 비명이!", "커피를 엎질렀다!"],
    cliff: ["회귀한 건 나만이 아니었다—", "그가 속삭였다. “또 왔네?”", "달력이 다시 거꾸로—", "“넌 이번이 네 번째야.”"],
    after: ["…라는 꿈을 꿨다.", "다행히 별일 없었다.", "그리고 퇴근했다.", "모두 웃고 넘어갔다.", "평화로운 오후였다.", "커피를 한 잔 더 마셨다."] },
  rof: { n: "로판", c: "#ff8fc8", t: "북부 대공의 계약 약혼녀",
    calm: ["샹들리에가 반짝였다.", "정원에 장미가 폈다.", "하녀가 차를 내왔다.", "무도회장은 붐볐다.", "은발이 달빛에 젖었다.", "마차가 성문을 지났다.", "드레스 자락이 끌렸다."],
    talk: ["“이 계약, 1년이에요.”", "“공작님, 놓아 주세요.”", "“드레스 말고 검을요.”", "“당신만은 지키겠소.”", "“황녀님이 오십니다.”", "“춤 한 곡 추시겠소?”"],
    crisis: ["황제의 칙서가 왔다.", "독이 든 잔이었다.", "검이 목에 닿았다.", "약혼반지가 깨졌다.", "대공의 눈이 붉어졌다."],
    fake: ["“어머, 공작님!”", "찻잔이 쨍 깨졌다!", "“무례하군요!”", "누군가 뺨을 쳤다!", "음악이 뚝 멈췄다!"],
    cliff: ["대공은 처음부터 알았다—", "“당신, 악녀가 아니군.”", "가면 아래 얼굴은, 나였다—", "“이 결혼, 무효요.”"],
    after: ["그리고 차를 마셨다.", "무도회는 무사히 끝났다.", "다들 잠자리에 들었다.", "평온한 아침이 왔다.", "정원사가 꽃을 심었다."] },
  mur: { n: "무협", c: "#ffb03b", t: "천하제일 야근검",
    calm: ["객잔에 비가 내렸다.", "대숲에 바람이 불었다.", "점소이가 술을 날랐다.", "산길은 고요했다.", "내공이 천천히 돌았다.", "만두가 김을 뿜었다.", "강물이 느리게 흘렀다."],
    talk: ["“검을 뽑아라.”", "“사부님의 원수다!”", "“점소이, 술 한 동이!”", "“강호가 날 부른다.”", "“이 초식을 받아라!”", "“네놈, 어느 문파냐?”"],
    crisis: ["검기가 대숲을 갈랐다.", "독침이 날아들었다.", "단전이 터질 듯했다.", "포위당했다. 백 명이다.", "피가 칼끝을 탔다."],
    fake: ["“게 섰거라!”", "탁자가 쪼개졌다!", "술잔이 날아왔다!", "“흥, 제법이구나!”", "지붕 위에 그림자가!"],
    cliff: ["사부가 마교 교주였다—", "가면을 벗자, 그는—", "“네 아비는 내가 죽였다.”", "검이 내 가슴을 꿰뚫—"],
    after: ["그리고 국수를 먹었다.", "객잔은 다시 조용했다.", "다들 푹 잤다.", "날이 밝았다. 평화롭다.", "만두를 하나 더 시켰다."] },
};
// 독자 댓글(닉네임은 지어낸 말 조합)
const NICK_A = ["새벽", "출근길", "야근", "정주행", "월요병", "퇴근한", "졸린", "말랑", "주말", "통통", "꿈꾸는", "느긋한"];
const NICK_B = ["독자", "감자", "고양이", "만두", "펭귄", "라떼", "도토리", "붕어빵", "호떡", "두부", "판다", "치즈"];
const CM = {
  perfect: ["아 여기서 끊어?!ㅋㅋ 결제함", "작가님 절단신공 미쳤다", "결제 버튼 누르는 손이 떨림", "다음 화 내놔요 당장!!", "와 소름… 바로 결제", "이 맛에 노블리 해요ㅠ"],
  soon: ["어? 벌써 끝? 좀 아쉽…", "한 줄만 더 보여 주지…", "애매하게 끊네ㅋㅋ"],
  fake: ["엥 여기서 끊는다고?", "이게 끊을 자리…?", "흠… 별로 안 궁금함"],
  early: ["분량 실화?", "읽다가 끝나서 당황", "오늘 분량 혜자 아니네요ㅠ"],
  late: ["흠…", "긴장감 다 풀렸네", "여기까지 보면 결제 안 하지…", "끊을 타이밍 놓치셨다ㅋㅋ"],
  end: ["결말까지 다 알려 주심ㅋㅋ", "다음 화 안 봐도 되겠다", "흠… 할 말이 없다"],
};
const RES = { perfect: ["절단신공!", "gd"], soon: ["살짝 일찍", ""], fake: ["가짜 꼭대기!", "rd"], early: ["분량 실화?", "rd"], late: ["늦었다…", "rd"], end: ["다 풀어 버림", "rd"] };
// 작은 그림(X 테두리, a 주색, b 밝은색, c 포인트)
const ICON = {
  reg: [".XXXXX.", "XbbbbbX", ".XaaaX.", "..XaX..", "..XbX..", ".XbabX.", "XaaaaaX", ".XXXXX."],
  rof: ["..XXX..", ".XabaX.", "XabaaaX", "XaaabaX", ".XaaaX.", "..XcX..", ".ccX...", "...c..."],
  mur: [".....XX", "....XbX", "...XbX.", "..XbX..", "X.XbX..", ".XcX...", "XcXX...", "X......"],
};
const ICOL = { reg: { a: "#ffd166", b: "#d6f0ff" }, rof: { a: "#ff6fa8", b: "#ffd0e6", c: "#4fae5a" }, mur: { a: "#c8ccd8", b: "#ffffff", c: "#ffb03b" } };
// 가위(오른쪽을 보고 벌린 모양)
const SCI = [
  ".XXX..........",
  "XoooX.........",
  "XoXoX.....XXXX",
  "XoooXX..XXbbbX",
  ".XXX.XXXbbbXX.",
  "......XcX.....",
  ".XXX.XXXbbbXX.",
  "XoooXX..XXbbbX",
  "XoXoX.....XXXX",
  "XoooX.........",
  ".XXX..........",
];
const SCOL = { X: "#2a1e2e", o: "#ff4b5c", b: "#e8ecf4", c: "#ffd166" };
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];

const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const tcol = (t) => (t >= TH ? "#ff3b5c" : t >= 0.58 ? "#ff8fc8" : t >= 0.33 ? "#5fb8ff" : "#3a6ea8");
const cache = {};
function pix(key, rows, pal, flip) {
  if (cache[key]) return cache[key];
  const c = document.createElement("canvas"); c.width = rows[0].length; c.height = rows.length; const g = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = typeof pal === "function" ? pal(ch, x, y) : pal[ch] || "#fff"; g.fillRect(x, flip ? rows.length - 1 - y : y, 1, 1); }));
  return (cache[key] = c.toDataURL());
}
const iconURL = (k) => pix("i" + k, ICON[k], (ch) => (ch === "X" ? "#2a1e2e" : ICOL[k][ch] || "#fff"));
const sciURL = () => pix("sci", SCI, SCOL);
const fingerURL = () => pix("fin", FINGER, (ch, x, y) => (ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"), true);

// 방법 화면 그림(40x40 도트 3장)
function stepPics() {
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d"); fn((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }); return c.toDataURL(); };
  const graph = (P, prof, cutY) => {
    P(4, 2, 34, 36, "#141a32"); P(4, 2, 34, 1, "#2a3458");
    for (let y = 3; y < 38; y++) { const t = prof(y); const w = Math.round(t * 30); P(5, y, w, 1, tcol(t)); P(5 + w, y, 1, 1, "#fff"); }
    for (let y = 3; y < 38; y += 3) P(5 + Math.round(TH * 30), y, 1, 2, "#ff3b5c");
    if (cutY) { for (let x = 0; x < 40; x += 3) P(x, cutY, 2, 1, "#ff3b5c"); }
  };
  const sci = (P, x, y) => SCI.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") P(x + i, y + j, 1, 1, SCOL[ch]); }));
  const bump = (y, c, h, w) => h * Math.exp(-((y - c) * (y - c)) / w);
  const a = mk((P) => {
    graph(P, (y) => 0.18 + bump(y, 15, 0.45, 8) + 0.004 * y);
    P(29, 10, 7, 9, "#fffaf0"); P(30, 11, 5, 1, "#c0303a"); P(32, 12, 1, 4, "#c0303a"); P(32, 17, 1, 1, "#c0303a"); // 느낌표 카드: 참기
  });
  const b = mk((P) => {
    graph(P, (y) => 0.2 + bump(y, 20, 0.78, 10), 20);
    sci(P, 0, 15);
    for (const [x, y] of [[34, 12], [37, 26]]) { P(x, y, 1, 3, "#ffd166"); P(x - 1, y + 1, 3, 1, "#ffd166"); }
  });
  const c = mk((P) => {
    P(5, 4, 30, 32, "#fbf6ea"); P(5, 4, 30, 1, "#fff"); for (let y = 8; y < 20; y += 3) P(8, y, 22 - (y % 5), 1, "#b8a890");
    P(9, 21, 22, 11, "#d8263a"); P(10, 22, 20, 9, "#fbf6ea"); P(11, 23, 18, 7, "#d8263a"); P(12, 24, 16, 5, "#fbf6ea");
    for (let i = 0; i < 4; i++) P(13 + i * 4, 26, 2, 1, "#d8263a");
    P(30, 28, 8, 8, "#c9961c"); P(31, 29, 6, 6, "#ffd166"); P(33, 30, 2, 4, "#fff3b0");
  });
  return [[`<img src="${a}" alt="">`, "작은 봉우리는 참기"], [`<img src="${b}" alt="">`, "꼭대기에서 톡"], [`<img src="${c}" alt="">`, "다음 화 결제!"]];
}

export const GAME = {
  key: "webnovel2", base: "webnovel", jc: "#5fb8ff", n: "작가님 절단신공", desc: "오늘 회차는 다 썼다. 어디서 '다음 화에 계속'으로 끊을지가 결제를 가른다",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 원고가 위로 흘러가고, 오른쪽 <b>긴장도 그래프</b>가 같이 흘러가요.",
    "그래프가 <b>빨간 점선(절단각)</b>을 넘은 꼭대기 줄이 <b>가위선</b>에 오면 톡! 점선 아래 작은 봉우리는 가짜 꼭대기예요.",
    "<b>분량 OK</b> 선이 지나기 전에 자르면 \"분량 실화?\", 꼭대기를 지나면 <b>독자 이탈</b>이 올라요. 회차 4개를 이어서 끊어요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "작은 봉우리는 참기"], ["", "꼭대기에서 톡"], ["", "다음 화 결제!"]]; } },
  css: `
.mg-webnovel2 .wz-st{background:#0d0a18!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-webnovel2 .wz-cv{position:absolute;left:0;top:0;z-index:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;pointer-events:none}
.mg-webnovel2 .wz-cv.wz-fr{z-index:2}
.mg-webnovel2 .mg-steps img{width:76px;height:76px;image-rendering:pixelated}
.mg-webnovel2 .mg-msg{z-index:24}
.mg-webnovel2 .wz-rc{position:absolute;left:0;top:0;right:0;z-index:1;overflow:hidden;pointer-events:none}
.mg-webnovel2 .wz-me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter .4s;transform-origin:50% 90%}
.mg-webnovel2 .wz-me.on{opacity:1}
.mg-webnovel2 .wz-say{position:absolute;left:50%;z-index:7;transform:translate(-50%,-100%) scale(.4);transform-origin:50% 100%;opacity:0;background:#fff;color:#2a1e2e;font-weight:800;font-size:12px;padding:4px 9px;border-radius:11px;white-space:nowrap;box-shadow:0 3px 0 #0005;pointer-events:none;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s}
.mg-webnovel2 .wz-say.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
.mg-webnovel2 .wz-say.sl{background:#d8d4f0;color:#3a3466}
.mg-webnovel2 .wz-say.gd{background:#ffd166;color:#3a2400}
.mg-webnovel2 .wz-say.rd{background:#ff8fa0;color:#3a0010}
.mg-webnovel2 .wz-eps{position:absolute;left:6px;top:6px;z-index:6;display:flex;gap:3px;background:#0009;border-radius:7px;padding:3px 5px;pointer-events:none}
.mg-webnovel2 .wz-eps i{width:22px;height:16px;border-radius:4px;background:#ffffff14;border:1px solid #ffffff30;font-style:normal;font-size:9px;font-weight:900;color:#ffffff80;display:flex;align-items:center;justify-content:center}
.mg-webnovel2 .wz-eps i.now{border-color:#5fb8ff;color:#fff;animation:wzblink .7s infinite alternate}
.mg-webnovel2 .wz-eps i.g0{background:#ffd166;color:#3a2400;border-color:#fff3b0;animation:wzpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-eps i.g1{background:#5fb8ff;color:#06203a;border-color:#9fd8ff;animation:wzpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-eps i.g2{background:#c0303a;color:#fff;border-color:#ff8fa0;animation:wzpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-pp{position:absolute;left:8px;right:8px;z-index:4;background:#fbf6ea;border-radius:9px;box-shadow:0 3px 0 #0007,inset 0 0 0 1px #e6dcc6;overflow:hidden}
.mg-webnovel2 .wz-pp.shk{animation:wzshk .3s}
.mg-webnovel2 .wz-ph{position:absolute;left:0;right:0;top:0;height:22px;display:flex;align-items:center;gap:5px;padding:0 7px;background:#ece3cf;color:#5a4a3a;font-size:10.5px;z-index:3}
.mg-webnovel2 .wz-ph i{width:14px;height:14px;background-size:100% 100%;image-rendering:pixelated;flex:none}
.mg-webnovel2 .wz-ph b{font-weight:900;color:#3a2a1e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.mg-webnovel2 .wz-ph span{white-space:nowrap;font-weight:800;color:var(--gc)}
.mg-webnovel2 .wz-ph em{margin-left:auto;font-style:normal;font-weight:900;font-size:10px;color:#fff;background:#8a7a6a;border-radius:5px;padding:1px 6px;white-space:nowrap;transition:background .2s}
.mg-webnovel2 .wz-ph em.ok{background:#1f9a4a}
.mg-webnovel2 .wz-ph em.bump{animation:wzbump .3s}
.mg-webnovel2 .wz-bd{position:absolute;left:0;right:0;bottom:0;overflow:hidden}
.mg-webnovel2 .wz-tx{position:absolute;left:0;top:0;bottom:0;overflow:hidden}
.mg-webnovel2 .wz-in{position:absolute;left:0;right:0;top:0;will-change:transform}
.mg-webnovel2 .wz-l{position:absolute;left:0;right:0;height:28px;display:flex;align-items:center;padding:0 4px 0 21px;box-sizing:border-box;font-family:"Nanum Myeongjo","Noto Serif KR",Batang,serif;font-size:12px;color:#5a4a3a;white-space:nowrap;transition:background .15s}
.mg-webnovel2 .wz-l span{overflow:hidden;text-overflow:ellipsis}
.mg-webnovel2 .wz-l::before{content:"";position:absolute;left:15px;top:7px;bottom:7px;width:3px;border-radius:2px;background:var(--lc,#c8b8a0)}
.mg-webnovel2 .wz-l.k-talk{color:#1f3a66;font-weight:700;--lc:#5fb8ff}
.mg-webnovel2 .wz-l.k-crisis,.mg-webnovel2 .wz-l.k-fake{color:#8a2a10;font-weight:800;--lc:#ff8a3d}
.mg-webnovel2 .wz-l.k-cliff{color:#2a0a10;font-weight:900;--lc:#ff3b5c}
.mg-webnovel2 .wz-l.k-after{color:#9a9488;--lc:#d0c8b8}
.mg-webnovel2 .wz-l.cur{background:#ffe27a66}
.mg-webnovel2 .wz-l.past{opacity:.55}
.mg-webnovel2 .wz-l.drop{transition:transform .7s cubic-bezier(.5,0,.9,.6),opacity .7s;opacity:0!important}
.mg-webnovel2 .wz-l.pk{background:#ffd16655}
.mg-webnovel2 .wz-ok{position:absolute;left:4px;right:2px;height:0;border-top:2px dashed #1f9a4a;pointer-events:none}
.mg-webnovel2 .wz-ok b{position:absolute;right:0;top:-8px;font-size:9px;font-weight:900;color:#fff;background:#1f9a4a;border-radius:4px;padding:0 4px;font-family:sans-serif}
.mg-webnovel2 .wz-ok.drop{transition:transform .7s,opacity .7s;opacity:0}
.mg-webnovel2 .wz-gr{position:absolute;right:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges}
.mg-webnovel2 .wz-fog{position:absolute;right:0;bottom:0;background:repeating-linear-gradient(135deg,#1a2040 0 6px,#141a32 6px 12px);display:flex;align-items:center;justify-content:center;color:#5a6a9a;font-weight:900;font-size:20px;letter-spacing:4px;transition:opacity .4s;border-top:1px dashed #5a6a9a}
.mg-webnovel2 .wz-fog small{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:0;color:#5a6a9a}
.mg-webnovel2 .wz-fog.off{opacity:0}
.mg-webnovel2 .wz-thl{position:absolute;top:2px;transform:translateX(-50%);font-size:9px;font-weight:900;color:#fff;background:#c0303a;border-radius:4px;padding:0 3px;white-space:nowrap;pointer-events:none;z-index:2}
.mg-webnovel2 .wz-gl{position:absolute;top:2px;font-size:9px;font-weight:900;color:#9fb0e0;white-space:nowrap;pointer-events:none;z-index:2}
.mg-webnovel2 .wz-cut{position:absolute;left:0;right:0;height:0;border-top:2px dashed #ff3b5c;z-index:2;pointer-events:none}
.mg-webnovel2 .wz-cut i{position:absolute;left:0;top:-12px;width:28px;height:22px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 1px 0 #0006)}
.mg-webnovel2 .wz-cut.snip{border-top-style:solid}
.mg-webnovel2 .wz-cut.snip i{animation:wzsnip .38s ease-in forwards}
.mg-webnovel2 .wz-vig{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 26px 6px #ff2040;opacity:0;z-index:2}
.mg-webnovel2 .wz-stamp{position:absolute;left:50%;z-index:5;transform:translate(-50%,-50%) rotate(-8deg) scale(2.6);opacity:0;pointer-events:none;color:#d8263a;border:3px solid #d8263a;outline:2px solid #d8263a;outline-offset:2px;border-radius:6px;padding:4px 12px;font-weight:900;font-size:20px;letter-spacing:1px;white-space:nowrap;background:#fbf6eacc;text-shadow:0 0 1px #d8263a}
.mg-webnovel2 .wz-stamp.on{animation:wzstamp .32s cubic-bezier(.5,0,.7,1.4) forwards}
.mg-webnovel2 .wz-stamp.meh{color:#6a6a7a;border-color:#6a6a7a;outline-color:#6a6a7a;text-shadow:none}
.mg-webnovel2 .wz-cms{position:absolute;left:8px;right:8px;z-index:6;display:flex;flex-direction:column;gap:4px;pointer-events:none}
.mg-webnovel2 .wz-cm{align-self:flex-end;max-width:92%;background:#1a2236ee;border-radius:10px 10px 2px 10px;padding:4px 9px;color:#fff;font-size:12px;line-height:1.3;display:flex;align-items:center;gap:6px;box-shadow:0 2px 0 #0006;animation:wzcm .3s cubic-bezier(.2,.9,.3,1)}
.mg-webnovel2 .wz-cm b{font-size:10px;color:#9fd8ff;font-weight:800;white-space:nowrap}
.mg-webnovel2 .wz-cm small{font-size:10px;color:#ff8fc8;font-weight:800;white-space:nowrap}
.mg-webnovel2 .wz-cm.meh{background:#3a2a36ee}
.mg-webnovel2 .wz-cm.meh b{color:#c8b0c0}
.mg-webnovel2 .wz-cm.gd{background:linear-gradient(90deg,#1f6fd0ee,#5fb8ffcc);box-shadow:0 2px 0 #0006,inset 0 0 0 1px #9fd8ff}
.mg-webnovel2 .wz-cm.out{opacity:0;transform:translateY(-8px);transition:opacity .3s,transform .3s}
.mg-webnovel2 .wz-dr{position:absolute;left:8px;right:8px;z-index:4;background:#141a2a;border-radius:8px;box-shadow:0 2px 0 #0007;display:flex;align-items:center;gap:6px;padding:0 8px;box-sizing:border-box}
.mg-webnovel2 .wz-dr span{font-size:10.5px;font-weight:800;color:#ff8fa0;white-space:nowrap;line-height:1.1}
.mg-webnovel2 .wz-dr span small{display:block;font-size:9px;color:#8a90b0;font-weight:700}
.mg-webnovel2 .wz-dr canvas{image-rendering:pixelated;image-rendering:crisp-edges;background:#0c1020;border-radius:3px}
.mg-webnovel2 .wz-dr b{margin-left:auto;font-size:14px;font-weight:900;color:#ff8fa0;white-space:nowrap}
.mg-webnovel2 .wz-dr b.up{animation:wzbump .3s}
.mg-webnovel2 .wz-btn{position:absolute;left:8px;right:8px;z-index:8;border:0!important;border-radius:14px!important;padding:0!important;background:linear-gradient(#ff6a7a,#d8263a)!important;box-shadow:0 4px 0 #7a1020!important;color:#fff!important;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:900;font-size:17px;letter-spacing:1px;cursor:pointer;touch-action:none}
.mg-webnovel2 .wz-btn i{width:34px;height:27px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0005)}
.mg-webnovel2 .wz-btn small{font-size:10.5px;font-weight:700;opacity:.9;letter-spacing:0}
.mg-webnovel2 .wz-btn:active,.mg-webnovel2 .wz-btn.prs{transform:translateY(3px);box-shadow:0 1px 0 #7a1020!important}
.mg-webnovel2 .wz-btn.hot{animation:wzhot .3s infinite alternate}
.mg-webnovel2 .wz-btn.dim{filter:saturate(.3) brightness(.7)}
.mg-webnovel2 .wz-ban{position:absolute;left:50%;z-index:16;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:24px;white-space:nowrap;pointer-events:none;color:#fff;text-shadow:0 0 2px #000,0 3px 0 #1f6fd0,0 0 16px #1f6fd0;text-align:center}
.mg-webnovel2 .wz-ban small{display:block;font-size:12.5px;color:#fff}
.mg-webnovel2 .wz-ban.on{animation:wzban 1.5s ease-out forwards}
.mg-webnovel2 .wz-ban.gd{color:#ffd166;text-shadow:0 0 2px #000,0 3px 0 #a86a00,0 0 16px #ffb03b}
.mg-webnovel2 .wz-tut{position:absolute;left:10px;right:10px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-webnovel2 .wz-tut.off{opacity:0;visibility:hidden}
.mg-webnovel2 .wz-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #5fb8ff;max-width:310px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-webnovel2 .wz-tut.pop .wz-tc{animation:wzpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-tc em{font-style:normal;display:inline-block;background:#1f6fd0;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-webnovel2 .wz-tc p{margin:0}
.mg-webnovel2 .wz-tc b.rd{color:#c0303a}.mg-webnovel2 .wz-tc b.gn{color:#1f9a4a}.mg-webnovel2 .wz-tc b.bl{color:#1f6fd0}
.mg-webnovel2 .wz-tb{margin-top:5px;display:flex;justify-content:center}
.mg-webnovel2 .wz-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-webnovel2 .wz-go{background:linear-gradient(#5fb8ff,#1f6fd0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d3a80!important;animation:wzpulse .5s infinite alternate}
.mg-webnovel2 .wz-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-37px 0 0 -14px;background-size:100% 100%;image-rendering:pixelated;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-webnovel2 .wz-hand.on{display:block;animation:wztap .8s infinite}
.mg-webnovel2 .wz-end{position:absolute;left:0;right:0;bottom:0;z-index:25;background:linear-gradient(#0f1830,#0a0f20);display:flex;flex-direction:column;gap:8px;padding:10px 12px 10px;animation:wzup .45s cubic-bezier(.2,.9,.3,1);border-top:2px solid #5fb8ff;box-sizing:border-box}
.mg-webnovel2 .wz-eh{display:flex;align-items:center;gap:6px;color:#fff;font-size:12.5px;font-weight:800;white-space:nowrap}
.mg-webnovel2 .wz-eh i{font-style:normal;font-weight:900;background:#5fb8ff;color:#0a1a33;border-radius:5px;padding:1px 6px;font-size:11px}
.mg-webnovel2 .wz-eh em{font-style:normal;margin-left:auto;color:#7CFC9A;font-weight:900;font-size:11px}
.mg-webnovel2 .wz-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;height:128px;align-items:end}
.mg-webnovel2 .wz-bar{display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end}
.mg-webnovel2 .wz-bar u{text-decoration:none;font-size:11px;font-weight:900;color:#fff}
.mg-webnovel2 .wz-bar s{text-decoration:none;display:block;flex:none;width:70%;height:var(--h,4px);border-radius:5px 5px 0 0;background:linear-gradient(var(--bc),#ffffff22);box-shadow:inset 0 2px 0 #ffffff66;animation:wzgrow 1s .15s cubic-bezier(.2,.9,.3,1) backwards}
@keyframes wzgrow{from{height:0}}
.mg-webnovel2 .wz-bar i{width:14px;height:14px;background-size:100% 100%;image-rendering:pixelated}
.mg-webnovel2 .wz-bar small{font-size:9.5px;font-weight:800;color:var(--bc);white-space:nowrap}
.mg-webnovel2 .wz-big{text-align:center;color:#c8d8f0;font-size:12px;font-weight:700}
.mg-webnovel2 .wz-big b{display:block;font-size:34px;font-weight:900;color:#ffd166;line-height:1.15;text-shadow:0 3px 0 #a86a00}
.mg-webnovel2 .wz-big b.pop{animation:wzbump .3s}
.mg-webnovel2 .wz-rate{display:flex;align-items:center;gap:8px;background:#ffffff10;border-radius:10px;padding:7px 10px;color:#fff;font-size:12px;font-weight:800;opacity:0;animation:wzst .4s 1.5s forwards}
.mg-webnovel2 .wz-rate b{margin-left:auto;font-size:20px;color:#7CFC9A;font-weight:900}
.mg-webnovel2 .wz-best{background:linear-gradient(90deg,#1f6fd0aa,#5fb8ff55);box-shadow:inset 0 0 0 1px #9fd8ff;border-radius:10px;padding:6px 10px;color:#fff;font-size:12.5px;opacity:0;animation:wzst .4s 2s forwards}
.mg-webnovel2 .wz-best b{color:#ffd166;font-size:10.5px;margin-right:6px}
@keyframes wzblink{to{background:#5fb8ff44}}
@keyframes wzpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes wzbump{50%{transform:scale(1.25)}}
@keyframes wzshk{20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,1px)}80%{transform:translate(2px,0)}}
@keyframes wzsnip{0%{left:0}100%{left:calc(100% - 20px)}}
@keyframes wzstamp{0%{opacity:0;transform:translate(-50%,-50%) rotate(-14deg) scale(2.6)}70%{opacity:1;transform:translate(-50%,-50%) rotate(-7deg) scale(.92)}100%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(1)}}
@keyframes wzcm{from{opacity:0;transform:translateX(30px)}}
@keyframes wzhot{to{filter:brightness(1.2);box-shadow:0 4px 0 #7a1020,0 0 0 3px #fff,0 0 22px #ff6a7a}}
@keyframes wzpulse{to{filter:brightness(1.15)}}
@keyframes wztap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes wzban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-2deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(1deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@keyframes wzup{from{transform:translateY(40%);opacity:0}}
@keyframes wzst{from{opacity:0;transform:translateY(10px) scale(.8)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.mg-webnovel2 .wz-ban.on{animation-duration:.01s}.mg-webnovel2 .wz-btn.hot,.mg-webnovel2 .wz-go{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "webnovel2", "작가님 절단신공", "wz-st");
    const st = F.stage;
    const ORDER = shuffle(Object.keys(GEN)); ORDER.push(pick(ORDER.slice(0, 2)));
    const EPNO = {}; for (const k of Object.keys(GEN)) EPNO[k] = 20 + rint(120);
    st.insertAdjacentHTML("beforeend", `<canvas class="wz-cv"></canvas><div class="wz-rc"><div class="wz-me"></div></div><canvas class="wz-cv wz-fr"></canvas>
      <div class="wz-say"></div><div class="wz-eps">${Array.from({ length: EPS }, (_, i) => `<i>${i + 1}</i>`).join("")}</div>
      <div class="wz-pp"><div class="wz-ph"><i></i><b></b><span></span><em>분량 0자</em></div>
        <div class="wz-bd"><div class="wz-tx"><div class="wz-in"></div></div><canvas class="wz-gr"></canvas><div class="wz-fog">??<small>아직 안 쓴 긴장</small></div>
        <div class="wz-gl">긴장도</div><div class="wz-thl">절단각</div><div class="wz-cut"><i></i></div><div class="wz-vig"></div><div class="wz-stamp">다음 화에 계속</div></div></div>
      <div class="wz-cms"></div>
      <div class="wz-dr"><span>독자 이탈<small>이번 화</small></span><canvas></canvas><b>0%</b></div>
      <button class="wz-btn" aria-label="여기서 끊기"><i></i><span>여기서 끊기<br><small>가위선에서 다음 화로</small></span></button>
      <div class="wz-ban"></div>
      <div class="wz-tut off"><div class="wz-tc"><em>리허설</em><p></p><div class="wz-tb"></div></div></div><div class="wz-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const cv = $(".wz-cv"), gB = cv.getContext("2d"), cvF = $(".wz-fr"), gF = cvF.getContext("2d");
    const meEl = $(".wz-me"), rcEl = $(".wz-rc"), sayEl = $(".wz-say"), epsEl = [...st.querySelectorAll(".wz-eps i")];
    const pp = $(".wz-pp"), phI = $(".wz-ph i"), phB = $(".wz-ph b"), phS = $(".wz-ph span"), lenEl = $(".wz-ph em");
    const bd = $(".wz-bd"), txEl = $(".wz-tx"), inEl = $(".wz-in"), grC = $(".wz-gr"), gG = grC.getContext("2d"), fogEl = $(".wz-fog"), thlEl = $(".wz-thl"), glEl = $(".wz-gl");
    const cutEl = $(".wz-cut"), vigEl = $(".wz-vig"), stampEl = $(".wz-stamp"), cmsEl = $(".wz-cms");
    const drEl = $(".wz-dr"), drC = $(".wz-dr canvas"), gD = drC.getContext("2d"), drB = $(".wz-dr b"), btn = $(".wz-btn"), ban = $(".wz-ban");
    const tutEl = $(".wz-tut"), tutP = $(".wz-tc p"), tutB = $(".wz-tb"), hand = $(".wz-hand");
    cutEl.querySelector("i").style.backgroundImage = `url(${sciURL()})`; btn.querySelector("i").style.backgroundImage = `url(${sciURL()})`;
    hand.style.backgroundImage = `url(${fingerURL()})`;

    // ── 크기: 논리 폭 112칸 안팎을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const RH = Math.max(40, Math.round(LH * 0.25)), roomH = RH * K, deskY = RH - 11, cx = LW >> 1;
    for (const c of [cv, cvF]) { c.width = LW; c.height = RH; c.style.width = LW * K + "px"; c.style.height = RH * K + "px"; }
    const btnH = Math.round(Math.min(54, sh * 0.09)), btnTop = sh - btnH - 8, drH = 40, drTop = btnTop - 6 - drH;
    const ppTop = roomH + 4, ppH = drTop - 6 - ppTop, phH = 22, bodyH = ppH - phH;
    const ROW = 28, cutY = Math.round(bodyH * 0.42), gwL = 32, gW = gwL * K, ghL = Math.ceil(bodyH / K), tw = sw - 16 - gW;
    const fogY = Math.round(cutY + ROW * 1.5);
    Object.assign(pp.style, { top: ppTop + "px", height: ppH + "px" });
    Object.assign(bd.style, { top: phH + "px", height: bodyH + "px" });
    txEl.style.width = tw + "px";
    grC.width = gwL; grC.height = ghL; Object.assign(grC.style, { width: gW + "px", height: ghL * K + "px" });
    Object.assign(fogEl.style, { width: gW + "px", top: fogY + "px" });
    const gx = (t) => 1 + Math.round(clamp(t, 0, 1.05) * (gwL - 4));
    thlEl.style.left = tw + gx(TH) * K + "px"; glEl.style.left = tw + 3 + "px";
    cutEl.style.top = cutY + "px"; stampEl.style.top = Math.min(bodyH - 30, cutY + 46) + "px";
    Object.assign(drEl.style, { top: drTop + "px", height: drH + "px" });
    const drW = Math.floor((sw - 16 - 16 - 62 - 44 - 12) / K), drHL = 10;
    drC.width = drW; drC.height = drHL; Object.assign(drC.style, { width: drW * K + "px", height: drHL * K + "px" });
    Object.assign(btn.style, { top: btnTop + "px", height: btnH + "px" });
    cmsEl.style.top = ppTop + phH + Math.min(bodyH - 64, cutY + 74) + "px";
    rcEl.style.height = roomH + "px";
    ban.style.top = ppTop + phH + cutY - 40 + "px";
    tutEl.style.top = Math.max(30, roomH - 112) + "px";
    F.root.querySelector(".mg-msg").style.top = ppTop + phH + cutY - 34 + "px";

    // 내 캐릭터 그림(3x2 표정 시트). 노트북 뒤에 앉은 앞모습.
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    const lidW = 44, lidH = 18, lidX = cx - (lidW >> 1), lidY = deskY - lidH + 3;
    let sayLeft = 0;
    {
      const headTop = RH * 0.1, s = ((lidY + 7 - headTop) * K) / 160, w = Math.round(240 * s), h = Math.round(312 * s);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(cx * K - w / 2) + "px", top: Math.round(headTop * K - 18 * s) + "px" });
      sayEl.style.top = Math.max(26, Math.round(headTop * K)) + "px"; sayLeft = Math.min(sw - 70, Math.round(cx * K + w * 0.55)); sayEl.style.left = sayLeft + "px";
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = "";

    // ── 방 배경(한 번만): 밤 벽·창문·책장 / 앞쪽 책상·노트북 뒷면·스탠드 ──
    const BG = document.createElement("canvas"); BG.width = LW; BG.height = RH;
    const wins = [], stars = [];
    const winX = 5, winY = 5, winW = 18, winH = deskY - 13;
    {
      const b = BG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      for (let y = 0; y < RH; y++) { const t = y / RH; P(0, y, LW, 1, `rgb(${Math.round(26 + t * 18)},${Math.round(24 + t * 14)},${Math.round(48 + t * 18)})`); }
      for (let y = 3; y < deskY; y += 6) for (let x = (y / 6) % 2 ? 4 : 1; x < LW; x += 6) P(x, y, 1, 1, "#ffffff0c");
      P(winX - 2, winY - 2, winW + 4, winH + 4, "#5a4a3e"); P(winX - 1, winY - 1, winW + 2, winH + 2, "#3a2e26");
      for (let y = 0; y < winH; y++) { const t = y / winH; P(winX, winY + y, winW, 1, `rgb(${Math.round(10 + t * 30)},${Math.round(14 + t * 20)},${Math.round(40 + t * 34)})`); }
      P(winX + 12, winY + 2, 5, 5, "#fff3c0"); P(winX + 14, winY + 1, 4, 4, "rgb(12,16,44)");
      for (let i = 0; i < 6; i++) stars.push([winX + 1 + rint(winW - 2), winY + 1 + rint(Math.max(2, winH / 2))]);
      let bx = winX; while (bx < winX + winW) { const bw = 3 + rint(4), bh = 4 + rint(Math.max(3, winH - 9)); const w2 = Math.min(bw, winX + winW - bx); P(bx, winY + winH - bh, w2, bh, "#141a32"); for (let yy = winY + winH - bh + 2; yy < winY + winH - 1; yy += 3) for (let xx = bx + 1; xx < bx + w2 - 1; xx += 2) if (rnd() < 0.45) wins.push([xx, yy]); bx += bw + (rnd() < 0.3 ? 1 : 0); }
      P(winX + (winW >> 1), winY, 1, winH, "#3a2e26"); P(winX, winY + (winH >> 1), winW, 1, "#3a2e2688");
      P(winX - 4, winY - 3, 4, winH + 7, "#4a5a8a"); P(winX + winW, winY - 3, 4, winH + 7, "#4a5a8a"); P(winX - 4, winY - 4, winW + 8, 2, "#6a6a7a");
      // 포스트잇: "끊기!" 메모, 결제율 그래프 메모
      const ps = (x, y, col, f) => { P(x + 1, y + 1, 14, 9, "#0004"); P(x, y, 14, 9, col); P(x, y, 14, 2, tint(col, 0.88)); f(x, y); };
      ps(winX + winW + 5, 5, "#ffe27a", (x, y) => { SCI.forEach((r, j) => j % 2 === 0 && [...r].forEach((ch, i) => { if (ch !== "." && i % 2 === 0) P(x + 2 + (i >> 1), y + 2 + (j >> 1), 1, 1, ch === "o" ? "#d0303a" : "#5a4a3a"); })); P(x + 10, y + 3, 1, 3, "#d0303a"); P(x + 10, y + 7, 1, 1, "#d0303a"); });
      ps(winX + winW + 4, 18, "#ff9ec8", (x, y) => { P(x + 2, y + 6, 2, 2, "#7a3a5a"); P(x + 5, y + 4, 2, 4, "#7a3a5a"); P(x + 8, y + 3, 2, 5, "#7a3a5a"); P(x + 11, y + 2, 1, 1, "#d0303a"); });
      // 책장(오른쪽)
      const shX = LW - 26, shW = 23;
      for (const [k, sy] of [[0, 12], [1, Math.min(deskY - 5, 25)]]) {
        P(shX, sy, shW, 2, "#8a5a3a"); P(shX, sy + 2, shW, 1, "#4a2e1e");
        let x = shX + 1; const cols = ["#5fb8ff", "#ff8fc8", "#ffb03b", "#b89cff", "#7fe0a8", "#e05a5a", "#e6e6e6", "#4a6aa0"];
        while (x < shX + shW - 2) { const h = 5 + rint(4), w2 = 2 + rint(2), c = pick(cols); if (k === 1 && x > shX + shW - 9) break; P(x, sy - h, w2, h, c); P(x, sy - h, w2, 1, tint(c, 1.25)); P(x, sy - h + 2, w2, 1, tint(c, 0.7)); x += w2; }
        if (k === 1) { const tx = shX + shW - 7; P(tx, sy - 5, 6, 5, "#ffd166"); P(tx + 1, sy - 7, 4, 2, "#ffd166"); P(tx + 2, sy - 9, 2, 2, "#fff3b0"); P(tx, sy - 1, 6, 1, "#c9961c"); }
      }
    }
    const FG = document.createElement("canvas"); FG.width = LW; FG.height = RH;
    const mugX = lidX - 12, clkX = lidX + lidW + 4, clkY = deskY - 9, lampX = 1;
    {
      const b = FG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      P(0, deskY, LW, RH - deskY, "#7a4e32"); P(0, deskY, LW, 1, "#a8744c"); P(0, deskY + 1, LW, 1, "#8e5c3c");
      for (let y = deskY + 3; y < RH; y += 3) for (let x = (y * 7) % 13; x < LW; x += 19) P(x, y, 7, 1, "#6e442c");
      P(0, RH - 1, LW, 1, "#3a2216");
      P(lidX - 1, lidY - 1, lidW + 2, lidH + 2, "#9fd8ff55");
      P(lidX, lidY, lidW, lidH, "#b8bcc8"); P(lidX, lidY, lidW, 1, "#e0e4ee"); P(lidX + lidW - 1, lidY, 1, lidH, "#8a8e9c"); P(lidX, lidY + lidH - 1, lidW, 1, "#8a8e9c");
      P(lidX - 3, lidY + lidH, lidW + 6, 2, "#7a7e8c"); P(lidX - 3, lidY + lidH + 2, lidW + 6, 1, "#0004");
      const lx = cx - 3, ly = lidY + 5; P(lx, ly, 7, 8, "#f4f6fa"); P(lx + 1, ly + 1, 5, 6, "#1f6fd0"); P(lx + 3, ly + 2, 1, 4, "#fff"); P(lx + 2, ly + 6, 3, 1, "#9fd8ff");
      P(lidX + 4, lidY + 4, 5, 5, "#ffd166"); P(lidX + 5, lidY + 5, 3, 3, "#fff3b0");
      SCI.forEach((r, j) => j % 2 === 0 && [...r].forEach((ch, i) => { if (ch !== "." && i % 2 === 0) P(lidX + lidW - 11 + (i >> 1), lidY + 9 + (j >> 1), 1, 1, SCOL[ch]); }));
      P(lampX, deskY + 1, 10, 3, "#2f3a4a"); P(lampX, deskY + 1, 10, 1, "#4a5a6e");
      for (let i = 0; i < 12; i++) P(lampX + 4 + Math.round(i * 0.25), deskY - i, 2, 1, "#5a6a80");
      for (let i = 0; i < 6; i++) P(lampX + 7 + i, deskY - 12 + Math.round(i * 0.5), 1, 1, "#5a6a80");
      const sx = lampX + 11, sy = deskY - 12; P(sx + 1, sy - 1, 4, 1, "#3f8a5a"); P(sx, sy, 6, 1, "#2f7a4a"); P(sx - 1, sy + 1, 8, 1, "#2f6a4a"); P(sx - 2, sy + 2, 10, 2, "#25583c"); P(sx - 1, sy + 4, 8, 1, "#fff3c0");
      const bx = LW - 14; [["#5fb8ff", 0], ["#ffb03b", 3], ["#e05a5a", 6]].forEach(([c, d]) => { P(bx - (d % 2), deskY + 2 - d, 12, 3, c); P(bx - (d % 2), deskY + 2 - d, 12, 1, tint(c, 1.25)); P(bx + 10 - (d % 2), deskY + 2 - d, 2, 3, "#f2ead8"); });
    }

    // ── 상태 ── tut: 0 대기 / 1 작은 봉우리 참기 / 2 진짜 꼭대기 자르기 / 3 시작 카드 / -1 본게임
    let tut = 0, tutT = 0, tm = 0, el = 0;
    let done = false, raf = 0, last = 0, phase = "idle", phT = 0;
    let E = null, epI = -1, off = 0, cur = -2, reveal = false, hold = false, beatT = 0, sayT = 0, lastSay = 0, hintShown = false, lateMsg = false;
    const results = [];
    const cs = { happy: 0, shock: 0, sad: 0, blush: 0, angry: 0 };
    const decks = {}; const deal = (k, pool, used) => { for (let i = 0; i < 12; i++) { if (!decks[k] || !decks[k].length) decks[k] = shuffle(pool.slice()); const t = decks[k].pop(); if (!used.has(t) || i === 11) { used.add(t); return t; } } return pick(pool); };

    // ── 소리 ──
    const pageSnd = () => noise(0.04, 3200 + rnd() * 800, 0.025, 0, 2);
    const beat = (t) => { tone(62, 0.11, "sine", 0.18 + t * 0.12); tone(52, 0.12, "sine", 0.14 + t * 0.1, 0, 0.13); };
    const snipSnd = () => { noise(0.05, 5200, 0.12, 0, 3); tone(1900, 0.03, "square", 0.05); noise(0.06, 4200, 0.12, 0.17, 3); tone(1500, 0.04, "square", 0.05, 0, 0.17); };
    const fanfare = () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.06, 0, i * 0.07)); };
    const mehSnd = () => { tone(330, 0.18, "triangle", 0.07, -60); tone(262, 0.26, "triangle", 0.07, -50, 0.18); };
    const coinSnd = (i) => { tone(1318 + (i % 5) * 90, 0.05, "square", 0.04); tone(1976, 0.06, "triangle", 0.03, 0, 0.04); };

    // ── 화면 글자 ──
    const say = (t, cls = "", sec = 1.4) => { sayEl.textContent = t; sayEl.className = "wz-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; lastSay = el; };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "wz-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const nk = () => pick(NICK_A) + pick(NICK_B) + (rnd() < 0.4 ? "_" + (10 + rint(89)) : "");

    // ── 회차 만들기: 긴장도 곡선 + 줄 ──
    const makeEp = (gk, ei, tutor) => {
      const g = GEN[gk];
      let n, m, p, fk;
      if (tutor) { n = 12; m = 3; p = 8; fk = [[5, 0.62]]; }
      else {
        n = 14 + rint(3); m = 5 + rint(2); p = clamp(m + 3 + rint(3), m + 3, n - 4);
        const fv = () => 0.55 + rnd() * (ei >= 2 ? 0.19 : 0.12);
        fk = [];
        if (ei === 0 || ei >= 2) fk.push([2 + rint(Math.max(1, m - 2)), fv()]);
        if (ei >= 1) fk.push([m + rint(Math.max(1, p - 2 - m)), fv()]);
        fk = fk.filter((f, i, a) => f[0] < p - 2 && a.findIndex((x) => x[0] === f[0]) === i);
      }
      const v = [];
      for (let i = 0; i < n; i++) v[i] = i < p ? 0.13 + 0.26 * (i / p) + (rnd() - 0.5) * 0.08 : 0.17 + rnd() * 0.1;
      for (const [f, fv] of fk) { v[f] = fv; if (f > 0) v[f - 1] = Math.min(v[f - 1], fv - 0.16); if (f + 1 < p) v[f + 1] = Math.min(v[f + 1], fv - 0.22); }
      v[p - 2] = Math.max(0.5, Math.min(0.6, v[p - 2] + 0.25)); v[p - 1] = 0.72 + rnd() * 0.05; v[p] = 0.92 + rnd() * 0.07;
      v[p + 1] = 0.46 + rnd() * 0.06; v[p + 2] = 0.3 + rnd() * 0.05;
      for (const [f] of fk) if (f === p - 2 || f === p - 1) v[f] = Math.min(v[f], TH - 0.06);
      const used = new Set();
      const L = v.map((t, i) => {
        const kind = i === p ? "cliff" : fk.some((f) => f[0] === i) ? "fake" : i > p ? "after" : t >= 0.58 ? "crisis" : t >= 0.33 ? "talk" : "calm";
        return { t, kind, txt: deal(gk + kind, g[kind], used) };
      });
      return { gk, g, n, m, p, fk: fk.map((f) => f[0]), v, L, no: EPNO[gk]++, drop: 0, dh: [], chars: 0, spl: (tutor ? 0.72 : [0.55, 0.48, 0.43, 0.39][ei] || 0.39) * ez };
    };
    const Y0 = cutY + ROW * 0.9;
    const lineTop = (i) => Y0 + i * ROW;
    let lineEls = [], okEl = null;
    const beginEp = (gk, ei, tutor) => {
      E = makeEp(gk, ei, tutor); off = 0; cur = -2; reveal = false; hold = false; lateMsg = false; phase = "scroll"; phT = 0;
      inEl.innerHTML = E.L.map((l, i) => `<div class="wz-l k-${l.kind}" style="top:${lineTop(i)}px"><span>${l.txt}</span></div>`).join("") + `<div class="wz-ok" style="top:${lineTop(E.m) - 1}px"><b>분량 OK ▼</b></div>`;
      lineEls = [...inEl.querySelectorAll(".wz-l")]; okEl = inEl.querySelector(".wz-ok");
      inEl.style.transform = "translateY(0px)";
      pp.style.setProperty("--gc", E.g.c); phI.style.backgroundImage = `url(${iconURL(gk)})`; phB.textContent = E.g.t; phS.textContent = `${E.no}화`;
      lenEl.textContent = "분량 0자"; lenEl.classList.remove("ok");
      fogEl.classList.remove("off"); cutEl.classList.remove("snip"); stampEl.className = "wz-stamp";
      cmsEl.innerHTML = ""; drB.textContent = "0%"; btn.classList.remove("dim", "hot");
      if (!tutor) { epsEl.forEach((e, i) => e.classList.toggle("now", i === ei)); banner(`${ei + 1}화째 · ${E.g.n}<small>${E.g.t}</small>`); tone(660, 0.08, "square", 0.05); tone(990, 0.12, "square", 0.05, 0, 0.09); }
    };

    // 줄이 가위선에 올라올 때(독자가 그 줄을 읽음)
    const reach = (i) => {
      const l = E.L[i]; if (!l) return;
      lineEls.forEach((e, k) => { e.classList.toggle("cur", k === i); e.classList.toggle("past", k < i); });
      E.chars = Math.round(((i + 1) * 4000) / (E.m + 1) / 10) * 10;
      lenEl.textContent = `분량 ${fmt(E.chars)}자`;
      if (i === E.m && !lenEl.classList.contains("ok")) { lenEl.classList.add("ok"); lenEl.classList.remove("bump"); void lenEl.offsetWidth; lenEl.classList.add("bump"); tone(1046, 0.06, "triangle", 0.05); if (tut < 0 && epI === 0) F.msg("분량 OK! 이제부터 끊을 수 있어요"); }
      const d = i > E.p ? 7 + (i - E.p) * 2 : l.kind === "calm" ? 1.6 : l.kind === "talk" ? 0.7 : 0.2;
      E.drop = clamp(E.drop + d, 0, 80); E.dh.push(E.drop); drB.textContent = Math.round(E.drop) + "%";
      if (i > E.p) { drB.classList.remove("up"); void drB.offsetWidth; drB.classList.add("up"); tone(300 - (i - E.p) * 30, 0.1, "square", 0.04); }
      pageSnd();
      if (tut >= 0) return;
      if (l.kind === "fake" && i >= E.m && rnd() < 0.6 && el - lastSay > 1) say(pick(["오, 여기서 끊어?", "여기 괜찮은데…?", "끊을까 말까…"]), "", 1);
      if (l.kind === "cliff" && epI === 0) say("지금이다!", "gd", 0.9);
      if (i === E.p + 1 && !lateMsg) { lateMsg = true; F.msg("꼭대기 지났어요! 긴장이 풀려요"); cs.shock = 0.8; say(pick(["앗, 지나갔다!", "늦었나…?"]), "rd", 1); }
    };

    // ── 자르기 ──
    const nope = (t, c) => { F.msg(t); SFX.tok(); vib(8); pp.classList.remove("shk"); void pp.offsetWidth; pp.classList.add("shk"); if (c) cs.shock = 0.4; };
    const tryCut = () => {
      if (done || phase !== "scroll" || !E) return;
      if (tut === 1) { nope("아직! 점선을 못 넘은 작은 봉우리예요"); return; }
      if (tut === 2 && cur !== E.p) { nope(cur < E.p ? "조금만 더! 꼭대기가 가위선에 오면 톡" : "지금!"); if (cur < E.p) return; }
      if (tut === 0 || tut === 3) return;
      if (cur < 0) { nope("아직 첫 줄도 안 나왔어요"); return; }
      doCut(cur, false);
    };
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); btn.classList.add("prs"); setTimeout(() => btn.classList.remove("prs"), 120); tryCut(); });
    bd.addEventListener("pointerdown", (e) => { e.preventDefault(); tryCut(); });

    const doCut = (idx, auto) => {
      if (phase !== "scroll") return;
      phase = "cut"; phT = 0; hold = false; handAt(null); E.cutIdx = idx;
      const d = idx - E.p, early = idx < E.m && !auto;
      let q, res;
      if (auto) { q = 0.05; res = "end"; }
      else if (early) { q = 0.1; res = "early"; E.drop = clamp(E.drop + 22, 0, 80); }
      else if (d === 0) { q = 1; res = "perfect"; }
      else if (d > 0) { q = Math.max(0.05, 0.62 - 0.2 * (d - 1)); res = "late"; }
      else { const r = E.v[idx] / E.v[E.p]; q = clamp(0.95 * r * r - 0.05 * -d, 0.08, 0.66); res = E.fk.includes(idx) ? "fake" : "soon"; }
      const conv = clamp(4 + 40 * q - 0.25 * E.drop, 1, 45);
      const R = { gk: E.gk, no: E.no, idx, p: E.p, q, res, drop: E.drop, conv, reader: 6000 + rint(5000) };
      if (tut < 0) results.push(R);
      drB.textContent = Math.round(E.drop) + "%";
      reveal = true; fogEl.classList.add("off"); vigEl.style.opacity = "0"; btn.classList.remove("hot");
      if (lineEls[E.p]) lineEls[E.p].classList.add("pk");
      // 가위가 선을 따라 지나간다
      cutEl.classList.remove("snip"); void cutEl.offsetWidth; cutEl.classList.add("snip"); snipSnd(); vib(12);
      const good = res === "perfect", ok = res === "perfect" || res === "soon";
      setTimeout(() => {
        if (done) return;
        // 가위선 아래 원고가 떨어져 나간다
        lineEls.forEach((e, k) => { if (k > idx) { e.style.transitionDelay = (k - idx) * 0.03 + "s"; e.style.transform = `translate(${(rnd() - 0.4) * 30}px,${160 + rnd() * 60}px) rotate(${(rnd() - 0.5) * 30}deg)`; e.classList.add("drop"); } });
        if (okEl && E.m > idx) { okEl.style.transform = "translateY(180px)"; okEl.classList.add("drop"); }
        stampEl.textContent = good || res === "soon" ? "다음 화에 계속" : res === "early" ? "분량 실화?" : "다음 화에 계속…?";
        stampEl.className = "wz-stamp on" + (ok ? "" : " meh");
        SFX.stamp(); vib(good ? [30, 40, 30] : 25); pp.classList.remove("shk"); void pp.offsetWidth; pp.classList.add("shk");
        const sp = [8 + tw / 2 + gW / 2, ppTop + phH + Math.min(bodyH - 30, cutY + 46)];
        F.burst(sp, ok ? "#d8263a" : "#6a6a7a", good ? 16 : 8);
        const [lab, lc] = RES[res]; F.float([sw / 2, ppTop + phH + cutY - 12], lab, lc === "rd" ? "bad" : "");
        if (good) { fanfare(); cs.happy = 2; say(pick(["완벽한 절단!", "이건 결제각이다", "독자들 난리 나겠다"]), "gd", 1.6); }
        else if (res === "soon") { SFX.ding(2); cs.happy = 1; say("나쁘지 않아!", "", 1.2); }
        else { mehSnd(); cs.sad = 1.8; say(res === "early" ? "분량이… 너무 짧았나" : res === "fake" ? "거기가 아니었나…" : "흠… 늦었다", "sl", 1.6); }
        if (tut < 0) { const ep = epsEl[epI]; ep.classList.remove("now"); ep.classList.add(good ? "g0" : ok ? "g1" : "g2"); }
      }, 300);
      // 독자 댓글 반응
      const pool = CM[res], first = good ? CM.perfect[0] : pick(pool);
      const lines = [first, pick(pool.filter((x) => x !== first)) || pick(pool)];
      lines.forEach((t, i) => setTimeout(() => {
        if (done || phase !== "cut") return;
        const e = document.createElement("div"); e.className = "wz-cm " + (good ? "gd" : ok ? "" : "meh");
        e.innerHTML = `<b>${nk()}</b><span>${t}</span><small>♥ ${ok ? 20 + rint(good ? 400 : 80) : rint(6)}</small>`;
        cmsEl.appendChild(e); tone(1760 + rnd() * 500, 0.04, "sine", 0.05); if (good) coinSnd(i);
        cs.blush = good ? 1.2 : 0;
      }, 700 + i * 450));
      if (tut === 2) setTimeout(() => { if (tut === 2) tutNext(3); }, 2000);
      else if (tut < 0) setTimeout(nextEp, 1950);
    };
    const nextEp = () => {
      if (done) return;
      if (epI + 1 >= EPS) return finale();
      epI++; cmsEl.querySelectorAll(".wz-cm").forEach((e) => e.classList.add("out"));
      setTimeout(() => { if (!done) beginEp(ORDER[epI], epI, false); }, 250);
      phase = "wait";
    };

    // ── 그리기 ──
    let g = gB; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const digit = (n, x, y, c) => [...DIG[n]].forEach((v, i) => v === "1" && P(x + (i % 3), y + Math.floor(i / 3), 1, 1, c));
    const curT = () => (E && cur >= 0 && cur < E.n ? E.v[cur] : 0);
    const renderRoom = () => {
      g = gB; g.drawImage(BG, 0, 0);
      wins.forEach(([x, y], i) => { if (Math.sin(tm * 0.6 + i * 2.1) > -0.5) P(x, y, 1, 1, i % 3 ? "#ffd56a" : "#ffeebb"); });
      stars.forEach(([x, y], i) => { if (Math.sin(tm * 2 + i * 1.7) > 0) P(x, y, 1, 1, "#fff8"); });
      g.globalCompositeOperation = "lighter";
      const lg = g.createRadialGradient(lampX + 13, deskY - 6, 2, lampX + 13, deskY - 2, 22); lg.addColorStop(0, "rgba(255,220,150,.28)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, 0, 46, RH);
      g.globalCompositeOperation = "source-over";
      g = gF; g.clearRect(0, 0, LW, RH);
      const t = curT();
      const sg = g.createRadialGradient(cx, lidY - 6, 2, cx, lidY - 6, 24); sg.addColorStop(0, `rgba(${140 + Math.round(t * 110)},${200 - Math.round(t * 120)},${255 - Math.round(t * 150)},${0.12 + t * 0.1})`); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(cx - 28, 0, 56, deskY);
      g.drawImage(FG, 0, 0);
      g.globalAlpha = 0.5 + 0.2 * Math.sin(tm * 3); P(lidX + 2, lidY - 1, lidW - 4, 1, t >= TH ? "#ff8fa0" : "#9fd8ff"); g.globalAlpha = 1;
      // 머그컵 + 김
      const my = deskY - 8; P(mugX, my, 8, 9, "#f2f2f6"); P(mugX, my, 8, 1, "#fff"); P(mugX + 8, my + 2, 2, 1, "#f2f2f6"); P(mugX + 9, my + 2, 1, 4, "#f2f2f6"); P(mugX + 8, my + 5, 2, 1, "#f2f2f6");
      P(mugX + 1, my + 1, 6, 1, "#3a2216"); P(mugX + 2, my + 4, 4, 3, "#5fb8ff"); P(mugX, my + 9, 10, 1, "#0004");
      for (let i = 0; i < 2; i++) { const ph = (tm * 0.7 + i / 2) % 1; g.globalAlpha = 0.55 * (1 - ph); P(mugX + 3 + Math.round(Math.sin((tm + i) * 3) * 1.5), my - 2 - Math.round(ph * 7), 1, 2, "#fff"); } g.globalAlpha = 1;
      // 탁상시계 23:5x
      P(clkX - 1, clkY - 1, 21, 11, "#14101c"); P(clkX, clkY, 19, 9, "#06040a"); P(clkX - 1, clkY + 10, 21, 1, "#0006");
      const mm = 50 + Math.min(9, Math.max(0, epI) * 2 + (phase === "cut" ? 1 : 0)), dc = "#ff6a6a";
      digit(2, clkX + 1, clkY + 2, dc); digit(3, clkX + 5, clkY + 2, dc); digit(Math.floor(mm / 10), clkX + 11, clkY + 2, dc); digit(mm % 10, clkX + 15, clkY + 2, dc);
      if (Math.floor(tm * 2) % 2 === 0) { P(clkX + 9, clkY + 3, 1, 1, dc); P(clkX + 9, clkY + 5, 1, 1, dc); }
      const vg = g.createLinearGradient(0, 0, 0, RH); vg.addColorStop(0, "rgba(5,3,14,.35)"); vg.addColorStop(0.3, "rgba(0,0,0,0)"); g.fillStyle = vg; g.fillRect(0, 0, LW, RH);
    };
    // 긴장도 파형(세로로 흐름): 줄마다 오른쪽으로 뻗는 길이 = 긴장
    const renderGraph = () => {
      g = gG; g.fillStyle = "#141a32"; g.fillRect(0, 0, gwL, ghL);
      for (const f of [0.25, 0.5]) for (let y = (Math.floor(off / K) % 4 + 4) % 4; y < ghL; y += 4) P(gx(f), ghL - 1 - y, 1, 1, "#2a3458");
      P(gx(TH) + 1, 0, gwL - gx(TH) - 1, ghL, "#ff3b5c12");
      if (!E) return;
      const n = E.n, cyL = (i) => (lineTop(i) + ROW / 2 - off) / K;
      const knownTo = reveal ? Infinity : fogY / K;
      const cutL = cutY / K;
      for (let y = 0; y < ghL; y++) {
        if (y > knownTo) break;
        // 이 높이의 긴장(줄 가운데 사이를 이어서)
        const fi = (y * K + off - Y0 - ROW / 2) / ROW; if (fi < -0.5 || fi > n - 0.5) continue;
        const i0 = clamp(Math.floor(fi), 0, n - 1), i1 = clamp(i0 + 1, 0, n - 1), fr = clamp(fi - i0, 0, 1);
        const s = fr * fr * (3 - 2 * fr); let t = E.v[i0] * (1 - s) + E.v[i1] * s;
        if (fi < 0) t = E.v[0] * (fi + 0.5) * 2;
        const wob = phase === "scroll" ? Math.sin(y * 0.9 + tm * 9) * 0.7 * t : 0;
        const w = Math.max(1, Math.round(gx(t) + wob));
        const after = reveal && E.cutIdx != null && fi > E.cutIdx + 0.5;
        g.globalAlpha = after ? 0.35 : y > cutL + 0.5 && !reveal ? 0.55 : 1;
        P(0, y, w, 1, after ? "#8a90b0" : tcol(t)); P(w, y, 1, 1, after ? "#c8cce0" : "#fff");
        g.globalAlpha = 1;
      }
      // 절단각 점선
      for (let y = Math.floor(tm * 10) % 3; y < ghL; y += 3) P(gx(TH), y, 1, 2, "#ff3b5c");
      // 자른 뒤: 진짜 꼭대기 별
      if (reveal) {
        const py = Math.round(cyL(E.p)), px = gx(E.v[E.p]) - 2;
        if (py > -3 && py < ghL + 3) { const c = Math.floor(tm * 6) % 2 ? "#ffd166" : "#fff3b0"; P(px + 1, py - 2, 1, 5, c); P(px - 1, py, 5, 1, c); P(px, py - 1, 3, 3, c); }
      }
    };
    const renderDrop = () => {
      g = gD; g.fillStyle = "#0c1020"; g.fillRect(0, 0, drW, drHL);
      for (let x = 0; x < drW; x += 6) P(x, drHL - 1, 3, 1, "#2a3458");
      if (!E) return;
      const h = E.dh, n = E.n;
      for (let i = 0; i < h.length; i++) {
        const x0 = Math.floor((i * drW) / n), x1 = Math.floor(((i + 1) * drW) / n), hh = Math.max(1, Math.round((h[i] / 50) * (drHL - 1)));
        const late = i > E.p;
        P(x0, drHL - hh, x1 - x0, hh, late ? "#ff3b5c" : "#ff8fa066"); P(x0, drHL - hh, x1 - x0, 1, late ? "#ffd0d8" : "#ff8fa0");
      }
    };

    // ── 나(표정·몸짓) ──
    const meTick = () => {
      if (!art) return;
      const t = phase === "scroll" ? curT() : 0;
      const ex = cs.shock > 0 ? "surprised" : cs.sad > 0 ? "sad" : cs.happy > 0 ? "smile" : cs.blush > 0 ? "blush" : t >= TH ? "surprised" : t >= 0.58 ? "angry" : "neutral";
      if (ex !== meX) { meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; }
      let tf;
      if (cs.happy > 0) tf = `translateY(${-Math.round(Math.abs(Math.sin(tm * 9)) * 4)}px)`;
      else if (cs.sad > 0) tf = `translateY(3px) rotate(${(Math.sin(tm * 1.2) * 2).toFixed(1)}deg)`;
      else if (t >= 0.58) tf = `translate(${Math.floor(tm * 24) % 2 ? 1 : -1}px,${-1 - Math.round(t * 2)}px)`;
      else tf = `translateY(${(Math.sin(tm * 1.5) * 1).toFixed(1)}px)`;
      if (tf !== meT) { meT = tf; meEl.style.transform = tf; }
    };

    // ── 흐름 ──
    const scrollTick = (dt) => {
      if (!E) return;
      const v = ROW / E.spl;
      // 리허설 2단계: 진짜 꼭대기가 가위선 가운데 오면 멈춰 기다린다
      const holdOff = lineTop(E.p) + ROW / 2 - cutY;
      if (tut === 2 && off + v * dt >= holdOff) { off = holdOff; hold = true; } else off += v * dt;
      inEl.style.transform = `translateY(${-Math.round(off)}px)`;
      const c = Math.floor((cutY + off - Y0) / ROW);
      if (c !== cur && c >= 0) { for (let i = Math.max(0, cur + 1); i <= Math.min(c, E.n - 1); i++) reach(i); }
      cur = c;
      if (cur >= E.n) { cur = E.n - 1; if (tut < 0) { F.msg("결말까지 다 써 버렸어요!"); doCut(E.n - 1, true); } else off -= v * dt; return; }
      // 긴장이 높을수록 빠른 심장 소리
      const t = curT();
      beatT -= dt; if (t >= 0.55 && beatT <= 0) { beat(t); beatT = 60 / (70 + t * 90); if (t >= TH) vib(10); }
      vigEl.style.opacity = t >= 0.55 ? ((t - 0.55) * 1.6 + 0.08 * Math.sin(tm * 12)).toFixed(2) : "0";
      btn.classList.toggle("hot", cur >= E.m && t >= TH && tut !== 1 && (epI <= 1 || tut === 2));
      // 첫 회차: 진짜 꼭대기에서만 손가락
      if (tut < 0 && epI === 0 && !opts.retry) handAt(cur === E.p ? "btn" : null);
    };
    const handAt = (w) => {
      if (!w) { hand.className = "wz-hand"; return; }
      let x, y;
      if (w === "btn") { x = sw / 2 + 50; y = btnTop + btnH / 2 + 6; }
      else { x = 8 + tw + gx(TH) * K + 4; y = ppTop + phH + cutY + 8; }
      hand.style.left = Math.round(x) + "px"; hand.style.top = Math.round(y) + "px"; hand.className = "wz-hand on";
    };

    // ── 리허설 ──
    const SKIP = `<button class="wz-skip" data-skip>건너뛰기</button>`;
    const tutNext = (n) => {
      tut = n; tutT = 0; tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        say("오늘 회차 다 썼다! 어디서 끊지?", "", 1.8);
        beginEp(ORDER[0], 0, true);
        tutP.innerHTML = `원고가 위로 흘러가요. 오른쪽 <b>긴장도</b>가<br><b class="rd">빨간 점선</b>을 못 넘은 <b>작은 봉우리</b>는 참아요`; tutB.innerHTML = SKIP;
        handAt("graph");
      } else if (n === 2) {
        tutP.innerHTML = `왔다! <b class="rd">점선을 넘는 꼭대기</b>가<br><b class="rd">가위선</b>에 오면 <b>여기서 끊기</b>를 톡!`; tutB.innerHTML = SKIP;
        handAt("btn");
      } else if (n === 3) {
        handAt(null); say("이 맛에 연재하지!", "gd", 1.6);
        tutP.innerHTML = `<b class="gn">분량 OK</b> 선 전에 자르면 "분량 실화?",<br>꼭대기를 지나면 <b class="rd">독자 이탈</b>이 올라요.<br>회차 <b class="bl">4개</b>를 이어서 끊어요!`;
        tutB.innerHTML = `<button class="wz-go" data-go>연재 시작!</button>`;
      }
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; handAt(null); tutEl.classList.add("off");
      results.length = 0; epI = 0; el = 0; lastSay = 0;
      for (const k in cs) cs[k] = 0;
      epsEl.forEach((e) => (e.className = ""));
      beginEp(ORDER[0], 0, false);
      SFX.go?.(); say("오늘 4작품 연재! 가자!", "", 1.4);
      if (!opts.retry) setTimeout(() => { if (!done && epI === 0) F.msg("점선을 넘는 꼭대기에서 톡!"); }, 900);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

    // ── 마지막 장면: 다음 화 결제 ──
    let finalScore = 0;
    const scoreNow = () => {
      const qs = results.map((r) => r.q), mq = qs.length ? qs.reduce((a, b) => a + b, 0) / EPS : 0;
      const perf = results.filter((r) => r.res === "perfect").length;
      const len = results.filter((r) => r.res !== "early").length / EPS;
      const keep = results.length ? 1 - results.reduce((a, r) => a + r.drop, 0) / results.length / 60 : 0;
      return { mq, perf, len, keep: clamp(keep, 0, 1), score: clamp(mq * 0.9 + 0.1 * (perf / EPS), 0, 1) };
    };
    const finale = () => {
      if (done || phase === "end") return; phase = "end"; handAt(null); btn.classList.add("dim"); btn.classList.remove("hot"); vigEl.style.opacity = "0";
      F.bar.style.transform = "scaleX(0)";
      const s = scoreNow(); finalScore = s.score;
      const reader = results.reduce((a, r) => a + r.reader, 0), paid = results.reduce((a, r) => a + r.reader * (1 - r.drop / 100) * (r.conv / 100), 0), rate = reader ? (paid / reader) * 100 : 0;
      const ov = document.createElement("div"); ov.className = "wz-end"; ov.style.top = ppTop - 2 + "px";
      const LAB = { perfect: "절단신공", soon: "살짝 일찍", fake: "가짜 꼭대기", early: "분량 실화?", late: "늦음", end: "다 풀어 버림" };
      const COL = { perfect: "#ffd166", soon: "#5fb8ff", fake: "#ff8fa0", early: "#ff8fa0", late: "#ff8fa0", end: "#ff8fa0" };
      ov.innerHTML = `<div class="wz-eh"><i>노블리</i><b>오늘 연재 결산</b><em>4회차 업로드 완료</em></div>
        <div class="wz-bars">${results.map((r) => `<div class="wz-bar" style="--bc:${COL[r.res]}"><u>${r.conv.toFixed(0)}%</u><s style="--h:${Math.round((r.conv / 45) * 66) + 4}px"></s><i style="background-image:url(${iconURL(r.gk)})"></i><small>${LAB[r.res]}</small></div>`).join("")}</div>
        <div class="wz-big">다음 화 결제<b>0명</b></div>
        <div class="wz-rate">유료 전환율<b>${rate.toFixed(1)}%</b></div>
        <div class="wz-best"><b>베댓</b>${s.score >= 0.75 ? "작가님 절단 장인… 매화 결제 중" : s.score >= 0.45 ? "재밌는데 끊는 데가 좀 애매ㅋㅋ" : "흠… 다음 화는 무료로 볼게요"}</div>`;
      st.appendChild(ov);
      cs.happy = s.score >= 0.6 ? 6 : 0; cs.sad = s.score < 0.4 ? 6 : 0;
      const big = ov.querySelector(".wz-big b"), t1 = performance.now(); let lastN = -1, k = 0;
      const cnt = () => {
        if (!ov.isConnected || done) return;
        const p = clamp((performance.now() - t1 - 400) / 1500, 0, 1), e = 1 - Math.pow(1 - p, 3), nn = Math.round(paid * e);
        if (nn !== lastN) { lastN = nn; big.textContent = fmt(nn) + "명"; if (p > 0 && p < 1 && rnd() < 0.5) coinSnd(k++); }
        if (p < 1) requestAnimationFrame(cnt); else { big.classList.add("pop"); if (s.score >= 0.6) fanfare(); else SFX.ding(2); vib(20); }
      };
      requestAnimationFrame(cnt);
      say(s.score >= 0.75 ? "결제 알림이 멈추질 않아!" : s.score >= 0.45 ? "그래도 꽤 결제했다!" : "다음엔 더 잘 끊어야지…", s.score >= 0.45 ? "gd" : "sl", 3);
      setTimeout(fin, 4300);
    };
    const fin = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      const s = scoreNow();
      const line = `절단신공 <b>${s.perf}/${EPS}</b>회 · 다음 화 결제 <b>${st.querySelector(".wz-big b")?.textContent || "0명"}</b>`;
      finish(s.score, line, "", [["절단 타이밍", s.mq], ["분량 지키기", s.len], ["독자 붙잡기", s.keep]]);
    };

    // ── 돌리기 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) { tut = 3; startGame(); } else tutNext(1); }
        else if (tut === 1) { if (phase === "scroll") scrollTick(dt); if (E && cur >= E.fk[0] + 2) tutNext(2); }
        else if (tut === 2) { if (phase === "scroll") scrollTick(dt); }
      } else {
        el += dt;
        if (phase === "scroll") scrollTick(dt);
        phT += dt;
        if (phase !== "end") { const fr = E && phase === "scroll" ? clamp(cur / Math.max(1, E.p + 2), 0, 1) : phase === "wait" ? 0 : 1; F.bar.style.transform = `scaleX(${clamp(1 - (epI + fr) / EPS, 0, 1)})`; }
        F.sc.textContent = `${Math.min(EPS, epI + 1)}/${EPS}화`;
        if (phase === "scroll" && el - lastSay > 4 && curT() < 0.4) say(pick(["어디서 끊지…", "아직이야, 참자", "독자들 기다린다", "결제각을 노려라"]), "", 1.2);
      }
      for (const k in cs) if (cs[k] > 0) cs[k] -= dt;
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      renderRoom(); renderGraph(); renderDrop(); meTick();
      raf = requestAnimationFrame(loop);
    };
    if (dbg) dbg.webnovel2 = {
      st: () => ({ tut, phase, ep: epI, cur, p: E && E.p, m: E && E.m, fk: E && E.fk, n: E && E.n, drop: E && Math.round(E.drop), res: results.map((r) => r.res + ":" + r.q.toFixed(2)), art, score: +finalScore.toFixed(3) }),
      tut: () => tut,
      tutDo: () => {
        if (tut === 1 && E) { off = lineTop(E.fk[0] + 2) + 2 - cutY; }
        else if (tut === 2 && E) { off = lineTop(E.p) + ROW / 2 - cutY; scrollTick(0); tryCut(); }
        else if (tut === 3) startGame();
      },
      start: startGame,
      // 잘 두기: 진짜 꼭대기가 가위선에 오면 자른다
      auto: () => { if (tut < 0 && phase === "scroll" && E && cur === E.p) tryCut(); },
      cutNow: () => { if (tut < 0 && phase === "scroll" && cur >= 0) tryCut(); },
      cutAt: (k) => { if (tut < 0 && phase === "scroll" && E && cur >= k(E)) tryCut(); },
    };
    renderRoom(); renderGraph(); renderDrop(); meTick();
    raf = requestAnimationFrame(loop);
  },
};
