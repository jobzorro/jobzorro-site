// 타로 1탄: 카드빨보다 말빨 (손님은 캐릭터 그림, 배경은 저녁 거리 그림, 탁자·카드·소품은 기기 해상도 벡터)
// 카드 11장은 금테 + 그림 칸 + 이름판의 벡터 그림(고해상도 캔버스에 한 번 그려 둠). 손님 그림 실패 때만 도트 손님.
// 플리마켓 타로 부스. 손님이 고민을 말하면 덱을 문질러 섞고, 3장을 펼쳐 손님이 고른 카드를 뒤집는다.
// 카드 방향(정·역)을 보고 뜻을 고르고, 손님 표정을 보고 말투(따뜻하게·솔직하게)를 고른다.
// 표정이 풀리면 만족 게이지가 오르고 팁·단골 예약이 붙는다. 마지막 손님이 "덕분에 마음이 정리됐어요" 하고 나간다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uOutline } from "../mg.js";

const T = 34;          // 한 판 시간(초)
const RUB = 150;       // 섞기에 필요한 문지른 거리(논리 픽셀)
const CW = 22, CHH = 36; // 카드 크기
const TOPIC = {
  job: { n: "이직", c: "#5fb8ff", lines: ["이직할까 말까… 출근길이 너무 무거워요", "면접 본 회사, 연락이 올까요?", "지금 회사에 남는 게 맞을까요?"] },
  love: { n: "연애", c: "#ff7eb6", lines: ["썸 타는 사람이 답장이 너무 느려요…", "헤어진 사람한테 연락해도 될까요?", "고백할까 말까 고민돼요"] },
  exam: { n: "시험", c: "#7fe0a8", lines: ["자격증 시험이 한 달 남았는데 불안해요", "이번엔 붙을 수 있을까요?", "공부가 손에 안 잡혀요…"] },
  money: { n: "돈", c: "#ffd166", lines: ["모아 둔 돈, 투자해도 될까요?", "이번 달도 카드값이 걱정이에요", "부업을 하나 더 늘려야 할까요?"] },
};
// 카드: 번호, 이름, 정방향 [키워드, 풀이], 역방향 [키워드, 풀이], 바탕색
const CARDS = [
  { id: "fool", no: "0", n: "바보", up: ["새 출발", "가볍게 첫발을 떼도 좋아요"], rv: ["무모함", "준비 없이 뛰면 넘어져요"], bg: "#9ad8f6" },
  { id: "mage", no: "I", n: "마법사", up: ["실행력", "가진 재료로 충분히 해낼 수 있어요"], rv: ["말뿐인 계획", "말만 앞서고 손이 안 가고 있어요"], bg: "#7a2238" },
  { id: "pri", no: "II", n: "여사제", up: ["직감", "마음속 답은 이미 나와 있어요"], rv: ["흔들림", "남의 말에 너무 흔들리고 있어요"], bg: "#1f2a5a" },
  { id: "lov", no: "VI", n: "연인", up: ["선택", "마음이 끌리는 쪽을 골라도 돼요"], rv: ["엇갈림", "서로 바라는 게 조금 달라요"], bg: "#f6c87a" },
  { id: "car", no: "VII", n: "전차", up: ["돌파", "지금 밀고 나가면 이겨요"], rv: ["폭주", "속도를 줄이고 방향부터 봐요"], bg: "#2a3a6a" },
  { id: "whl", no: "X", n: "운명의 수레바퀴", up: ["기회", "흐름이 바뀌는 때가 왔어요"], rv: ["엇박자", "타이밍을 조금만 미뤄요"], bg: "#5a3a8a" },
  { id: "tow", no: "XVI", n: "탑", up: ["깨달음", "무너질 건 무너져야 새로 지어요"], rv: ["미루기", "변화가 무서워 버티고만 있어요"], bg: "#141022" },
  { id: "star", no: "XVII", n: "별", up: ["희망", "버텨 온 만큼 곧 빛을 봐요"], rv: ["낙담", "스스로를 너무 낮게 보고 있어요"], bg: "#16224a" },
  { id: "moon", no: "XVIII", n: "달", up: ["막연한 불안", "걱정이 실제보다 커 보이는 때예요"], rv: ["안개 걷힘", "헷갈리던 게 곧 또렷해져요"], bg: "#1a2850" },
  { id: "sun", no: "XIX", n: "태양", up: ["성공", "결과가 밝게 나와요"], rv: ["잠깐 흐림", "조금 늦어질 뿐 결과는 좋아요"], bg: "#8fd0f4" },
  { id: "wld", no: "XXI", n: "세계", up: ["완성", "한 단계를 끝내고 다음으로 가요"], rv: ["마지막 한 걸음", "거의 다 왔어요, 마무리만 남았어요"], bg: "#2a6a8a" },
];
const PICK_LN = ["왼쪽 카드요!", "가운데 거요!", "오른쪽이 끌려요!"];
const ANX_LN = ["그럼… 저 어떡해요?", "사실 좀 무서워요…", "괜찮을까요…?"];
const GRR_LN = ["그래서 결론이 뭔데요?", "돌려 말하지 마세요.", "빨리 답 주세요."];
const GLY = { I: ["X", "X", "X", "X", "X"], V: ["X.X", "X.X", "X.X", "X.X", ".X."], X: ["X.X", "X.X", ".X.", "X.X", "X.X"], "0": ["XXX", "X.X", "X.X", "X.X", "XXX"] };
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
// 도트 손가락(리허설 안내). X 테두리, o 살
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
const won = (n) => n.toLocaleString("ko-KR");
const mix = (c, f) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };

function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
// ── 카드 그림(벡터): 카드 22x36 칸 좌표, 그림 칸은 (3,3)부터 16x24 ──
const CS = 8; // 카드 한 칸을 실제 몇 픽셀로 그릴지(고해상도)
const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
const rrp = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const st4 = (g, x, y, r, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); g.globalAlpha = 1; };
const lg = (g, x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const rg = (g, x, y, r0, r1, stops, x1 = x, y1 = y) => { const q = g.createRadialGradient(x, y, r0, x1, y1, r1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const circ = (g, x, y, r, f) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fillStyle = f; g.fill(); };
const poly = (g, pts, f) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = f; g.fill(); };
const ln = (g, pts, c, w) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
const GOLDG = (g, x0, y0, x1, y1) => lg(g, x0, y0, x1, y1, [[0, "#fff3c0"], [0.45, "#f2c255"], [1, "#9a6416"]]);
const SKN = "#f5d6bc";
// 사람(머리 + 옷 삼각형)
const fig = (g, x, y, s, robe, hair, o = {}) => {
  poly(g, [[x - 1.6 * s, y + 1.4 * s], [x + 1.6 * s, y + 1.4 * s], [x + 2.6 * s, y + 7.4 * s], [x - 2.6 * s, y + 7.4 * s]], robe);
  g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.moveTo(x - 1.6 * s, y + 1.4 * s); g.lineTo(x - 0.4 * s, y + 1.4 * s); g.lineTo(x - 1.2 * s, y + 7.4 * s); g.lineTo(x - 2.6 * s, y + 7.4 * s); g.fill();
  circ(g, x, y, 1.2 * s, SKN); if (hair) { g.beginPath(); g.arc(x, y - 0.1 * s, 1.25 * s, Math.PI * 1.05, Math.PI * 1.95); g.fillStyle = hair; g.fill(); }
  if (o.crown) poly(g, [[x - 1.1 * s, y - 1 * s], [x - 0.6 * s, y - 2 * s], [x, y - 1.3 * s], [x + 0.6 * s, y - 2 * s], [x + 1.1 * s, y - 1 * s]], o.crown);
};
const SUNF = (g, x, y, r, face) => {
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; poly(g, [[x + Math.cos(a - 0.12) * r * 1.05, y + Math.sin(a - 0.12) * r * 1.05], [x + Math.cos(a) * r * (k % 2 ? 1.45 : 1.75), y + Math.sin(a) * r * (k % 2 ? 1.45 : 1.75)], [x + Math.cos(a + 0.12) * r * 1.05, y + Math.sin(a + 0.12) * r * 1.05]], k % 2 ? "#ffb030" : "#ffe066"); }
  circ(g, x, y, r, rg(g, x - r * 0.3, y - r * 0.3, 0.1, r * 1.1, [[0, "#fff8c0"], [0.6, "#ffd84a"], [1, "#f0a020"]]));
  if (face) { circ(g, x - r * 0.35, y - r * 0.1, r * 0.1, "#8a4a10"); circ(g, x + r * 0.35, y - r * 0.1, r * 0.1, "#8a4a10"); g.beginPath(); g.arc(x, y + r * 0.15, r * 0.35, 0.3, Math.PI - 0.3); g.strokeStyle = "#a85a10"; g.lineWidth = r * 0.09; g.stroke(); }
};
const ART = {
  fool: (g) => {
    SUNF(g, 12, 4.4, 2.2);
    poly(g, [[0, 15.6], [3.6, 10.4], [6.6, 14], [9.4, 9.6], [13.4, 15], [16, 12.4], [16, 24], [0, 24]], "#c8dcf0"); poly(g, [[3.6, 10.4], [4.6, 11.8], [3.4, 12.2], [2.6, 11.8]], "#fff"); poly(g, [[9.4, 9.6], [10.6, 11.4], [9.2, 11.8], [8.4, 11.2]], "#fff");
    poly(g, [[0, 18], [10.4, 18], [9.4, 24], [0, 24]], lg(g, 0, 18, 0, 24, [[0, "#a8744a"], [1, "#6a4028"]])); g.fillStyle = "#5fae5a"; g.fillRect(0, 17.6, 10.4, 0.7);
    fig(g, 6.4, 10.4, 0.95, lg(g, 4, 11, 9, 17, [[0, "#ffd166"], [1, "#e0803a"]]), "#7a4a20");
    ln(g, [[8, 12], [11.6, 7.4]], "#7a4e2a", 0.45); circ(g, 11.8, 7.2, 1.1, "#c94f4f"); circ(g, 4.4, 12.6, 0.6, "#fff");
    circ(g, 2.4, 16.4, 0.9, "#f4f4f4"); circ(g, 3.2, 15.6, 0.6, "#f4f4f4");
  },
  mage: (g) => {
    g.beginPath(); g.moveTo(8, 3.2); g.bezierCurveTo(9.4, 1.4, 11.6, 1.6, 11.6, 3.2); g.bezierCurveTo(11.6, 4.8, 9.4, 5, 8, 3.2); g.bezierCurveTo(6.6, 1.4, 4.4, 1.6, 4.4, 3.2); g.bezierCurveTo(4.4, 4.8, 6.6, 5, 8, 3.2); g.strokeStyle = GOLDG(g, 4, 2, 12, 5); g.lineWidth = 0.6; g.stroke();
    fig(g, 8, 7.6, 1.15, lg(g, 5, 9, 11, 17, [[0, "#ff5a6a"], [1, "#8a1a2a"]]), "#2a2018"); g.fillStyle = "#f4f4f4"; g.fillRect(7.4, 9.4, 1.2, 7);
    ln(g, [[10.6, 10], [12.6, 4.6]], "#fff", 0.5); st4(g, 12.7, 4.3, 1.4, "#fff3b0");
    rrp(g, 1, 17.8, 14, 1.6, 0.4); g.fillStyle = GOLDG(g, 1, 17.8, 15, 19.4); g.fill(); g.fillStyle = "#8a6420"; g.fillRect(2.2, 19.4, 0.6, 2.6); g.fillRect(13.2, 19.4, 0.6, 2.6);
    poly(g, [[2.8, 15.6], [5, 15.6], [4.4, 17.8], [3.4, 17.8]], "#ffd84a"); circ(g, 8.6, 16.8, 1, "#ffd84a"); st4(g, 8.6, 16.8, 0.6, "#a87418"); ln(g, [[11, 17.6], [14, 15.2]], "#cfd8e8", 0.4);
    g.fillStyle = "#3e9e6a"; g.fillRect(0, 22, 16, 2); for (const x of [2.4, 7.4, 12.6]) circ(g, x, 22.6, 0.5, "#ff5a6a");
  },
  pri: (g) => {
    rrp(g, 3.4, 3.4, 9.2, 15, 0.6); g.fillStyle = lg(g, 0, 3, 0, 18, [[0, "#6a4a9a"], [1, "#3a2268"]]); g.fill(); for (const [x, y] of [[4.6, 6], [11, 7.2], [5.2, 12.4], [11.4, 13.4], [8, 5]]) circ(g, x, y, 0.55, "#d94f4f");
    rrp(g, 0.4, 2, 3, 22, 0.3); g.fillStyle = lg(g, 0.4, 0, 3.4, 0, [[0, "#0e0e14"], [0.5, "#3a3a46"], [1, "#0e0e14"]]); g.fill();
    rrp(g, 12.6, 2, 3, 22, 0.3); g.fillStyle = lg(g, 12.6, 0, 15.6, 0, [[0, "#c8c8d4"], [0.5, "#ffffff"], [1, "#b8b8c4"]]); g.fill();
    g.font = "900 1.8px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("B", 1.9, 5); g.fillStyle = "#222"; g.fillText("J", 14.1, 5);
    fig(g, 8, 6.6, 1.15, lg(g, 5, 8, 11, 15, [[0, "#9cc8f8"], [1, "#2f5ab0"]]), "#2a2018"); g.fillStyle = "#fff"; g.fillRect(7.6, 9, 0.8, 3); g.fillRect(6.9, 9.8, 2.2, 0.8);
    g.beginPath(); g.arc(8, 4.6, 1.2, Math.PI, 0); g.strokeStyle = "#f4f4f4"; g.lineWidth = 0.4; g.stroke(); circ(g, 8, 4.2, 0.45, "#ffe9a8");
    rrp(g, 5, 12.6, 3, 1.8, 0.4); g.fillStyle = "#f2e6c8"; g.fill();
    g.beginPath(); g.arc(8, 21.2, 2, 0.2, Math.PI - 0.2); g.lineWidth = 0.9; g.strokeStyle = GOLDG(g, 6, 20, 10, 23); g.stroke(); g.fillStyle = "#2a3a8a"; g.fillRect(0, 22.6, 16, 1.4);
  },
  lov: (g) => {
    g.fillStyle = lg(g, 0, 0, 0, 24, [[0, "#ffe9b0"], [0.5, "#f6c87a"], [1, "#9ad8f6"]]); g.fillRect(0, 0, 16, 24);
    circ(g, 8, 3.4, 3, rg(g, 8, 3.4, 0.2, 3.2, [[0, "#fff8d0"], [1, "rgba(255,240,160,.2)"]]));
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(8, 4); g.quadraticCurveTo(8 + d * 5, 0.4, 8 + d * 7, 3.6); g.quadraticCurveTo(8 + d * 4.4, 3.6, 8, 5.4); g.fillStyle = "#ffffff"; g.fill(); }
    fig(g, 8, 3.8, 0.7, "#c94f8a", "#ffd84a");
    fig(g, 3.6, 12, 1, lg(g, 2, 13, 5, 20, [[0, "#ffb8dc"], [1, "#e06aa0"]]), "#c9a050"); fig(g, 12.4, 12, 1, lg(g, 11, 13, 14, 20, [[0, "#8fb4f8"], [1, "#2f5ab0"]]), "#3b2a1e");
    g.fillStyle = "#ff4f7b"; g.beginPath(); g.moveTo(8, 13.6); g.bezierCurveTo(8, 12.4, 6, 12.2, 6, 13.6); g.bezierCurveTo(6, 15, 8, 16, 8, 16.8); g.bezierCurveTo(8, 16, 10, 15, 10, 13.6); g.bezierCurveTo(10, 12.2, 8, 12.4, 8, 13.6); g.fill(); circ(g, 7, 13.4, 0.35, "#ffd0e0");
    g.fillStyle = "#5fae5a"; g.fillRect(0, 21.6, 16, 2.4);
  },
  car: (g) => {
    for (const [x, y] of [[1.4, 1.4], [14.4, 2.2], [4.4, 0.8], [11.4, 1.2]]) st4(g, x, y, 0.6, "#ffe9a8");
    rrp(g, 1.6, 3, 12.8, 2.2, 0.6); g.fillStyle = "#3a5ad0"; g.fill(); for (const x of [3.6, 6.6, 9.6, 12.4]) st4(g, x, 4.1, 0.55, "#ffd84a");
    g.fillStyle = "#cfd8e8"; g.fillRect(2, 5.2, 0.7, 7); g.fillRect(13.3, 5.2, 0.7, 7);
    fig(g, 8, 7, 1, lg(g, 6, 8, 10, 13, [[0, "#eef2f8"], [1, "#8a94a8"]]), null, { crown: "#ffd84a" });
    rrp(g, 1, 11.6, 14, 6.4, 0.8); g.fillStyle = lg(g, 0, 11.6, 0, 18, [[0, "#d8dde8"], [1, "#7a8294"]]); g.fill();
    circ(g, 8, 14.6, 1.3, "#ffd84a"); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(8 + d, 14.4); g.quadraticCurveTo(8 + d * 4, 12.4, 8 + d * 5.4, 14.2); g.quadraticCurveTo(8 + d * 3.4, 15, 8 + d, 15); g.fillStyle = "#ffd84a"; g.fill(); }
    for (const x of [3.6, 12.4]) { circ(g, x, 18.4, 1.7, "#c9a050"); circ(g, x, 18.4, 0.6, "#4a3010"); }
    circ(g, 3.4, 21.6, 2.1, "#1a1a22"); circ(g, 2.4, 19.8, 1.1, "#1a1a22"); circ(g, 12.6, 21.6, 2.1, "#f4f4f4"); circ(g, 13.6, 19.8, 1.1, "#f4f4f4"); circ(g, 13.8, 19.6, 0.25, "#222");
  },
  whl: (g) => {
    for (const [x, y] of [[1.4, 1.2], [14.6, 1.2], [1.4, 22.8], [14.6, 22.8]]) { circ(g, x, y, 1.6, "#eef0fa"); circ(g, x + 1.2, y, 1.1, "#e0e4f4"); }
    const X = 8, Y = 12.4;
    circ(g, X, Y, 6.4, GOLDG(g, 2, 6, 14, 18)); circ(g, X, Y, 5.4, "#e0a030"); circ(g, X, Y, 4.4, rg(g, X, Y, 0.5, 4.4, [[0, "#fff3d8"], [1, "#e8d4a8"]]));
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ln(g, [[X + Math.cos(a) * 1.3, Y + Math.sin(a) * 1.3], [X + Math.cos(a) * 4.4, Y + Math.sin(a) * 4.4]], "#a8742a", 0.4); }
    circ(g, X, Y, 1.4, "#8a5fc0"); circ(g, X, Y, 0.5, "#ffe9a0");
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; st4(g, X + Math.cos(a) * 5.9, Y + Math.sin(a) * 5.9, 0.7, "#fff"); }
    circ(g, 8, 4.2, 1, "#4f7bd9"); ln(g, [[9.2, 5], [9.2, 1.6]], "#cfd8e8", 0.4);
  },
  tow: (g) => {
    for (const [x, y] of [[1.4, 3.4], [3.4, 1.4], [14.4, 6.4], [2.4, 8.4]]) circ(g, x, y, 0.3, "#8a8ab0");
    rrp(g, 5, 7, 6, 15, 0.3); g.fillStyle = lg(g, 5, 0, 11, 0, [[0, "#b0b0bc"], [0.4, "#8a8a96"], [1, "#5a5a66"]]); g.fill();
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.18; for (let y = 9; y < 22; y += 2) { g.beginPath(); g.moveTo(5, y); g.lineTo(11, y); g.stroke(); }
    for (const [x, y] of [[7, 10], [7, 15]]) { rrp(g, x, y, 2, 2.4, 0.9); g.fillStyle = rg(g, x + 1, y + 1.2, 0.1, 1.6, [[0, "#fff3a0"], [1, "#ff6a20"]]); g.fill(); }
    g.save(); g.translate(7.6, 5.6); g.rotate(-0.4); poly(g, [[-3, 1], [-2.4, -1], [-1.2, 0], [0, -1.4], [1.2, 0], [2.4, -1], [3, 1]], GOLDG(g, -3, -1.4, 3, 1)); g.restore();
    ln(g, [[15, 0], [12, 3.4], [13.4, 3.6], [10.4, 7]], "#fff3a0", 0.6); g.globalAlpha = 0.35; ln(g, [[15, 0], [12, 3.4], [13.4, 3.6], [10.4, 7]], "#ffd84a", 1.6); g.globalAlpha = 1;
    for (const [x, y, c] of [[3.6, 9.4, "#ff5a3a"], [12.4, 12.4, "#ff5a3a"], [4.4, 13.4, "#ffa030"]]) { g.beginPath(); g.moveTo(x, y - 1.4); g.quadraticCurveTo(x + 0.9, y, x, y + 0.8); g.quadraticCurveTo(x - 0.9, y, x, y - 1.4); g.fillStyle = c; g.fill(); }
    circ(g, 2.4, 13.4, 0.6, SKN); circ(g, 13.2, 17.6, 0.6, SKN); g.fillStyle = "#4a4a56"; g.fillRect(2.6, 22, 10.8, 2);
  },
  star: (g) => {
    const X = 8, Y = 6.4; circ(g, X, Y, 5.6, rg(g, X, Y, 0.2, 5.6, [[0, "rgba(255,240,150,.5)"], [1, "rgba(255,240,150,0)"]]));
    g.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 - Math.PI / 2, r = k % 2 ? 1.5 : k % 4 ? 3.2 : 4.6; k ? g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r) : g.moveTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); } g.closePath(); g.fillStyle = rg(g, X, Y, 0.2, 4.6, [[0, "#ffffff"], [0.4, "#fff3a0"], [1, "#ffd84a"]]); g.fill();
    for (const [x, y] of [[1.4, 2.4], [14.4, 1.4], [1.4, 9.4], [14.4, 9.4], [3.4, 12.4], [12.6, 12.4]]) st4(g, x, y, 0.8, "#fff");
    g.fillStyle = lg(g, 0, 19, 0, 24, [[0, "#5f8af0"], [1, "#1a3aa0"]]); g.fillRect(0, 19, 16, 5); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.25; for (const [x, y] of [[1.4, 20.4], [8.4, 22.4]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1.4, y - 0.6, x + 2.8, y); g.stroke(); }
    fig(g, 6.6, 13.6, 0.9, lg(g, 5, 14, 8, 20, [[0, "#c8e4ff"], [1, "#6a9ae0"]]), "#c9a050");
    for (const [x, y] of [[10.6, 15.6], [3.2, 16.6]]) { rrp(g, x - 0.8, y - 0.8, 1.6, 1.8, 0.5); g.fillStyle = "#e0a030"; g.fill(); ln(g, [[x, y + 1], [x + 0.3, 19.4]], "rgba(160,220,255,.9)", 0.4); }
  },
  moon: (g) => {
    const X = 8, Y = 6.2; circ(g, X, Y, 6, rg(g, X, Y, 0.3, 6, [[0, "rgba(255,240,180,.4)"], [1, "rgba(255,240,180,0)"]]));
    circ(g, X, Y, 4.6, rg(g, X - 1, Y - 1, 0.3, 4.8, [[0, "#fff8d8"], [1, "#e8d080"]])); g.save(); g.beginPath(); g.arc(X, Y, 4.6, 0, 6.3); g.clip(); circ(g, X + 2.8, Y - 0.6, 4, "rgba(150,130,60,.35)"); g.restore();
    circ(g, 6.6, 5.6, 0.35, "#6a5a30"); g.beginPath(); g.arc(6.8, 7.4, 0.9, 0.2, Math.PI - 0.6); g.strokeStyle = "#a89040"; g.lineWidth = 0.25; g.stroke();
    for (const [x, y] of [[1.4, 3.4], [15, 5.4], [0.8, 8.4], [14.4, 1.4]]) st4(g, x, y, 0.6, "#ffe9a8");
    for (const x0 of [0, 13]) { rrp(g, x0, 11.6, 3, 10.4, 0.3); g.fillStyle = lg(g, x0, 0, x0 + 3, 0, [[0, "#a8a8b4"], [1, "#6a6a76"]]); g.fill(); rrp(g, x0 + 1, 14, 1, 1.8, 0.4); g.fillStyle = "#ffd84a"; g.fill(); }
    g.beginPath(); g.moveTo(8, 12.6); g.bezierCurveTo(6.4, 15, 9.6, 17, 7.6, 20.4); g.strokeStyle = "#c9a050"; g.lineWidth = 0.6; g.stroke();
    poly(g, [[2.6, 19.8], [3.4, 17.6], [4.4, 18.4], [5.4, 18.4], [5.6, 20]], "#c9a050"); poly(g, [[10.4, 20], [10.6, 18.4], [11.6, 18.4], [12.6, 17.4], [13.4, 19.8]], "#6b6f78");
    g.fillStyle = lg(g, 0, 21, 0, 24, [[0, "#4a7ae0"], [1, "#1a3aa0"]]); g.fillRect(0, 21, 16, 3); circ(g, 8, 22.4, 0.7, "#d94f4f");
  },
  sun: (g) => {
    g.fillStyle = lg(g, 0, 0, 0, 16, [[0, "#6ac0f0"], [1, "#bfe6ff"]]); g.fillRect(0, 0, 16, 16);
    SUNF(g, 8, 6, 3.6, true);
    g.fillStyle = lg(g, 0, 15.6, 0, 17.6, [[0, "#e0b080"], [1, "#a87a50"]]); g.fillRect(0, 15.6, 16, 2);
    for (const x of [2.4, 8, 13.6]) { ln(g, [[x, 15.6], [x, 13.4]], "#3e8e4a", 0.35); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; circ(g, x + Math.cos(a) * 1.1, 13 + Math.sin(a) * 1.1, 0.55, "#ffd84a"); } circ(g, x, 13, 0.7, "#7a4a10"); }
    g.fillStyle = "#5fae5a"; g.fillRect(0, 17.6, 16, 6.4);
    g.beginPath(); g.ellipse(7.4, 20, 4, 1.8, 0, 0, 6.3); g.fillStyle = "#f8f8f8"; g.fill(); circ(g, 11.4, 18.6, 1.1, "#f8f8f8"); for (const x of [4.6, 6.4, 8.6, 10.2]) { g.fillStyle = "#e8e8e8"; g.fillRect(x, 21, 0.6, 2); }
    fig(g, 7.6, 16.2, 0.7, "#ff8a30", "#ffb030"); circ(g, 12, 18.2, 0.2, "#222");
  },
  wld: (g) => {
    const X = 8, Y = 12.4;
    g.beginPath(); g.ellipse(X, Y, 6, 9.6, 0, 0, 6.3); g.strokeStyle = "#3e9e6a"; g.lineWidth = 1.2; g.stroke();
    for (let k = 0; k < 28; k++) { const a = k / 28 * 6.2832; g.save(); g.translate(X + Math.cos(a) * 6, Y + Math.sin(a) * 9.6); g.rotate(a + 0.6); g.beginPath(); g.ellipse(0, 0, 0.9, 0.38, 0, 0, 6.3); g.fillStyle = k % 2 ? "#5fc080" : "#2f8a55"; g.fill(); g.restore(); }
    for (const y of [2.6, 22.2]) { poly(g, [[X - 1.4, y - 0.8], [X + 1.4, y + 0.8], [X + 1.4, y - 0.8], [X - 1.4, y + 0.8]], "#d94f4f"); }
    fig(g, X, 8, 0.95, lg(g, 6, 9, 10, 15, [[0, "#c8a8ff"], [1, "#6a3fb0"]]), "#5a3b22"); ln(g, [[X - 2.6, 10.6], [X - 2.6, 13.4]], "#ffd84a", 0.35); ln(g, [[X + 2.6, 10.6], [X + 2.6, 13.4]], "#ffd84a", 0.35);
    ln(g, [[X - 0.4, 15], [X - 1.2, 17.4]], SKN, 0.5); ln(g, [[X + 0.4, 15], [X + 1.6, 16.4]], SKN, 0.5);
    circ(g, 1.6, 1.6, 1.5, "#f4f4f4"); circ(g, 14.4, 1.6, 1.5, "#ffd84a"); circ(g, 1.6, 22.4, 1.5, "#c9a050"); circ(g, 14.4, 22.4, 1.5, "#e0a030");
  },
};
// 카드 테두리(공통)
function cardFrame(g) {
  g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 0.8 * CS; rrp(g, 0.4, 0.4, CW - 0.8, CHH - 0.8, 1.6); g.fillStyle = "#160c2c"; g.fill(); g.restore();
  rrp(g, 0.4, 0.4, CW - 0.8, CHH - 0.8, 1.6); g.strokeStyle = GOLDG(g, 0, 0, CW, CHH); g.lineWidth = 0.9; g.stroke();
  rrp(g, 1.6, 1.6, CW - 3.2, CHH - 3.2, 0.9); g.strokeStyle = "rgba(242,194,85,.55)"; g.lineWidth = 0.25; g.stroke();
}
function cardFront(cd) {
  const c = mkCanvas(CW * CS, CHH * CS), g = c.getContext("2d"); g.setTransform(CS, 0, 0, CS, 0, 0);
  cardFrame(g);
  // 그림 칸
  g.save(); rrp(g, 3, 3, 16, 24, 0.7); g.clip();
  g.fillStyle = lg(g, 0, 3, 0, 27, [[0, mix(cd.bg, 1.25)], [1, mix(cd.bg, 0.72)]]); g.fillRect(3, 3, 16, 24);
  g.translate(3, 3); ART[cd.id](g);
  g.setTransform(CS, 0, 0, CS, 0, 0); g.fillStyle = lg(g, 3, 3, 19, 27, [[0, "rgba(255,255,255,.18)"], [0.4, "rgba(255,255,255,0)"], [1, "rgba(0,0,0,.18)"]]); g.fillRect(3, 3, 16, 24);
  g.restore();
  rrp(g, 3, 3, 16, 24, 0.7); g.strokeStyle = "#c9952a"; g.lineWidth = 0.4; g.stroke();
  // 이름판
  rrp(g, 3, 27.6, 16, 5.6, 0.7); g.fillStyle = lg(g, 0, 27.6, 0, 33.2, [[0, "#fbf2da"], [1, "#e6d2a4"]]); g.fill(); g.strokeStyle = "#c9952a"; g.lineWidth = 0.3; g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#5a3410"; g.font = "900 2.6px 'Times New Roman', serif"; g.fillText(cd.no, 11, 29.4);
  g.font = "800 1.9px sans-serif"; const w = g.measureText(cd.n).width; g.save(); g.translate(11, 31.7); if (w > 14.6) g.scale(14.6 / w, 1); g.fillStyle = "#3a2410"; g.fillText(cd.n, 0, 0); g.restore();
  for (const [x, y] of [[2.2, 2.2], [19.8, 2.2], [2.2, 33.8], [19.8, 33.8]]) st4(g, x, y, 0.7, "#ffe9a0");
  return c;
}
function cardBack() {
  const c = mkCanvas(CW * CS, CHH * CS), g = c.getContext("2d"); g.setTransform(CS, 0, 0, CS, 0, 0);
  cardFrame(g);
  rrp(g, 2.4, 2.4, CW - 4.8, CHH - 4.8, 0.8); g.fillStyle = rg(g, CW / 2, CHH / 2, 1, 16, [[0, "#4a2a8a"], [1, "#1c0e44"]]); g.fill();
  g.save(); rrp(g, 2.4, 2.4, CW - 4.8, CHH - 4.8, 0.8); g.clip(); g.strokeStyle = "rgba(216,178,90,.28)"; g.lineWidth = 0.18;
  for (let k = -40; k < 40; k += 2.6) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 36, 36); g.stroke(); g.beginPath(); g.moveTo(k + 36, 0); g.lineTo(k, 36); g.stroke(); }
  g.restore();
  rrp(g, 4, 4, CW - 8, CHH - 8, 0.6); g.strokeStyle = "rgba(242,194,85,.7)"; g.lineWidth = 0.3; g.stroke();
  const X = CW / 2, Y = CHH / 2;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ln(g, [[X + Math.cos(a) * 4.6, Y + Math.sin(a) * 4.6], [X + Math.cos(a) * (k % 2 ? 5.8 : 6.8), Y + Math.sin(a) * (k % 2 ? 5.8 : 6.8)]], "#f2c255", 0.35); }
  g.beginPath(); g.arc(X, Y, 4.2, 0, 6.3); g.strokeStyle = GOLDG(g, X - 4, Y - 4, X + 4, Y + 4); g.lineWidth = 0.7; g.stroke();
  circ(g, X, Y, 3.2, rg(g, X - 1, Y - 1, 0.2, 3.4, [[0, "#3a2470"], [1, "#160a3a"]]));
  circ(g, X - 0.4, Y, 2.3, "#ffe9a0"); circ(g, X + 0.6, Y - 0.6, 2, "#1e0f48");
  st4(g, X + 1.4, Y + 1.2, 0.8, "#ffd84a");
  for (const [x, y, r] of [[X, 7.2, 1.3], [X, CHH - 7.2, 1.3], [5.6, Y, 0.8], [CW - 5.6, Y, 0.8], [6, 6, 0.6], [CW - 6, 6, 0.6], [6, CHH - 6, 0.6], [CW - 6, CHH - 6, 0.6]]) st4(g, x, y, r, "#f2c255");
  return c;
}

// 손님 겉모습
function custSpec() {
  const s = uSpec(pick(["plain", "student", "worker", "worker", "teen", "plain"]));
  s.kid = false; s.elder = false; s.pack = null;
  if (rnd() < 0.15) s.hat = pick(["#d94f4f", "#2f3d5c", "#3e9e6a", "#e0b040"]);
  s.shirt2 = mix(s.shirt, 0.75);
  return s;
}
// 손님 상반신(44x56 칸, 밑변 가운데 ox=22, oy=54). o: { mood, talk, blink, t, look }
function paintCust(P, s, o) {
  const ox = 22, oy = 54, m = o.mood || "neu", t = o.t || 0;
  const sk = s.skin, skD = mix(sk, 0.86), hc = s.hair, hl = mix(hc, 1.35), sh = s.shirt, sh2 = s.shirt2;
  const bob = m === "happy" ? (Math.sin(t * 11) > 0 ? -1 : 0) : m === "mad" ? (Math.sin(t * 30) > 0 ? -1 : 0) : 0;
  const hy = oy - 38 + bob + (m === "anx" || m === "sad" ? 1 : 0), ty = hy + 16;
  if (s.style === "long") P(ox - 10, hy + 3, 20, 22, hc);
  // 몸통
  P(ox - 11, ty, 22, oy - ty, sh); P(ox - 13, ty + 2, 26, oy - ty - 2, sh); P(ox - 12, ty + 1, 24, 1, sh);
  P(ox + 9, ty + 2, 4, oy - ty - 2, sh2); P(ox - 13, ty + 2, 1, oy - ty - 2, sh2);
  P(ox - 3, ty, 6, 1, sk); P(ox - 2, ty + 1, 4, 1, sk); P(ox - 1, ty + 2, 2, 1, skD);
  if (s.hood) { P(ox - 10, ty - 1, 20, 2, s.hood); P(ox - 3, ty + 3, 1, 4, "#f4f4f4"); P(ox + 2, ty + 3, 1, 4, "#f4f4f4"); }
  else if (s.glasses || s.style === "buzz") { P(ox - 4, ty, 2, 2, "#f4f4f4"); P(ox + 2, ty, 2, 2, "#f4f4f4"); }
  P(ox - 2, hy + 14, 4, 2, skD);
  // 팔·손(기분마다 몸짓)
  if (m === "grr" || m === "mad") {
    P(ox - 13, ty + 2, 3, 9, sh2); P(ox + 10, ty + 2, 3, 9, sh2);
    P(ox - 12, ty + 9, 24, 5, sh2); P(ox - 12, ty + 9, 24, 1, sh); P(ox + 7, ty + 9, 3, 3, sk); P(ox - 10, ty + 11, 3, 3, sk);
    if (Math.sin(t * 9) > 0.3) P(ox + 7, ty + 8, 3, 1, sk);
  } else if (m === "anx" || m === "sad") {
    const w = Math.round(Math.sin(t * 13));
    P(ox - 12, ty + 3, 3, oy - ty - 7, sh2); P(ox + 9, ty + 3, 3, oy - ty - 7, sh2);
    P(ox - 10, oy - 6, 6, 3, sh2); P(ox + 4, oy - 6, 6, 3, sh2);
    P(ox - 4 + w, oy - 6, 4, 3, sk); P(ox - w, oy - 5, 4, 3, skD);
  } else if (m === "happy") {
    P(ox - 12, ty + 3, 3, 6, sh2); P(ox + 9, ty + 3, 3, 6, sh2); P(ox - 10, ty + 7, 4, 3, sh2); P(ox + 6, ty + 7, 4, 3, sh2);
    P(ox - 6, ty + 5, 4, 3, sk); P(ox + 2, ty + 5, 4, 3, sk);
  } else {
    P(ox - 13, ty + 3, 3, oy - ty - 5, sh2); P(ox + 10, ty + 3, 3, oy - ty - 5, sh2);
    P(ox - 13, oy - 3, 4, 3, sk); P(ox + 9, oy - 3, 4, 3, sk);
  }
  // 머리
  P(ox - 7, hy, 14, 15, sk); P(ox - 8, hy + 2, 16, 11, sk); P(ox + 5, hy + 3, 2, 10, skD); P(ox - 6, hy + 14, 12, 1, skD);
  P(ox - 9, hy + 6, 1, 3, sk); P(ox + 8, hy + 6, 1, 3, skD);
  // 얼굴
  const ey = hy + 7, lx = ox - 5, rx = ox + 3, dk = "#2a1e2e", lk = o.look || 0;
  if (m === "happy") {
    for (const ex of [lx, rx]) { P(ex - 1, ey + 1, 1, 1, dk); P(ex, ey, 2, 1, dk); P(ex + 2, ey + 1, 1, 1, dk); }
    P(ox - 2, hy + 11, 4, 1, "#7a2a2a"); P(ox - 1, hy + 12, 2, 1, "#e06070");
    P(lx - 2, ey + 3, 2, 1, "#f08a9a"); P(rx + 2, ey + 3, 2, 1, "#f08a9a");
  } else if (m === "sad") {
    for (const ex of [lx, rx]) { P(ex, ey + 1, 2, 1, dk); P(ex + (ex === lx ? -1 : 2), ey, 1, 1, dk); }
    P(lx, ey + 2, 1, 3 + (Math.floor(t * 4) % 3), "#8fd8ff"); P(rx + 1, ey + 2, 1, 3 + (Math.floor(t * 4 + 1) % 3), "#8fd8ff");
    P(ox - 2, hy + 12, 1, 1, dk); P(ox - 1, hy + 11, 2, 1, dk); P(ox + 1, hy + 12, 1, 1, dk);
    P(lx - 1, ey - 3, 1, 1, hc); P(lx, ey - 2, 2, 1, hc); P(rx, ey - 2, 2, 1, hc); P(rx + 2, ey - 3, 1, 1, hc);
  } else if (m === "grr" || m === "mad") {
    P(lx - 1, ey - 3, 2, 1, hc); P(lx + 1, ey - 2, 2, 1, hc); P(rx - 1, ey - 2, 2, 1, hc); P(rx + 1, ey - 3, 2, 1, hc);
    for (const ex of [lx, rx]) { P(ex, ey, 2, 1, skD); P(ex, ey + 1, 2, 1, dk); }
    if (m === "mad") { P(ox - 2, hy + 11, 1, 1, dk); P(ox - 1, hy + 12, 1, 1, dk); P(ox, hy + 11, 1, 1, dk); P(ox + 1, hy + 12, 1, 1, dk); P(lx - 2, ey + 2, 3, 2, "#e88080"); P(rx + 1, ey + 2, 3, 2, "#e88080"); }
    else P(ox - 2, hy + 11, 4, 1, dk);
  } else if (m === "anx") {
    P(lx - 1, ey - 2, 2, 1, hc); P(lx + 1, ey - 3, 1, 1, hc); P(rx, ey - 3, 1, 1, hc); P(rx + 1, ey - 2, 2, 1, hc);
    for (const ex of [lx, rx]) { P(ex, ey, 2, 3, dk); P(ex, ey, 1, 1, "#ffffff"); P(ex + 1, ey + 2, 1, 1, "#8fd8ff"); }
    if (Math.sin(t * 3) > 0.2) P(lx, ey + 3, 1, 1, "#8fd8ff");
    P(ox - 2, hy + 12, 1, 1, dk); P(ox - 1, hy + 11, 1, 1, dk); P(ox, hy + 12, 1, 1, dk); P(ox + 1, hy + 11, 1, 1, dk);
  } else {
    P(lx - 1, ey - 2, 3, 1, hc); P(rx, ey - 2, 3, 1, hc);
    if (o.blink) { P(lx, ey + 1, 2, 1, dk); P(rx, ey + 1, 2, 1, dk); }
    else for (const ex of [lx, rx]) { P(ex, ey, 2, 2, dk); P(ex + (lk > 0 ? 1 : 0), ey + (lk ? 1 : 0), 1, 1, "#ffffff"); }
    if (o.talk) { P(ox - 1, hy + 11, 2, 2, "#7a2a2a"); P(ox - 1, hy + 12, 2, 1, "#e06070"); } else P(ox - 1, hy + 11, 2, 1, "#a0524a");
  }
  if (o.talk && m !== "neu") P(ox - 1, hy + 12, 2, 1, "#7a2a2a");
  // 머리카락
  const st = s.style;
  if (st === "buzz") { P(ox - 8, hy - 1, 16, 3, hc); P(ox - 9, hy + 1, 1, 4, hc); P(ox + 8, hy + 1, 1, 4, hc); }
  else {
    P(ox - 8, hy - 2, 16, 4, hc); P(ox - 7, hy - 3, 14, 1, hc); P(ox - 9, hy, 1, 4, hc); P(ox + 8, hy, 1, 4, hc);
    if (st === "bob" || st === "long") { P(ox - 8, hy + 2, 16, 2, hc); P(ox - 10, hy + 1, 3, st === "long" ? 22 : 11, hc); P(ox + 7, hy + 1, 3, st === "long" ? 22 : 11, hc); P(ox - 5, hy + 4, 3, 1, hc); }
    else { P(ox - 8, hy + 2, 6, 2, hc); P(ox + 2, hy + 2, 6, 1, hc); P(ox - 9, hy + 2, 2, 5, hc); P(ox + 7, hy + 2, 2, 5, hc); }
    if (st === "bun") { P(ox - 3, hy - 7, 6, 5, hc); P(ox - 2, hy - 7, 2, 1, hl); }
    if (st === "spiky") for (let x = ox - 8; x < ox + 7; x += 3) P(x, hy - 5, 2, 3, hc);
  }
  P(ox - 5, hy - 2, 4, 1, hl);
  if (s.hat) { P(ox - 9, hy - 5, 18, 6, s.hat); P(ox - 9, hy, 18, 2, mix(s.hat, 0.75)); P(ox - 2, hy - 7, 4, 2, "#f4f4f4"); P(ox - 6, hy - 4, 3, 1, mix(s.hat, 1.3)); }
  if (s.glasses && m !== "happy") { for (const ex of [lx, rx]) { P(ex - 1, ey - 1, 4, 1, "#333"); P(ex - 1, ey + 2, 4, 1, "#333"); P(ex - 1, ey - 1, 1, 4, "#333"); P(ex + 2, ey - 1, 1, 4, "#333"); } P(lx + 2, ey, rx - lx - 2, 1, "#333"); }
  return { hy };
}
// 작은 아이콘(벡터 SVG)
const HEART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa0c4"/><stop offset="1" stop-color="#ff3f7b"/></linearGradient></defs><path d="M12 21C8 17.6 2.6 14 2.6 8.6 2.6 5 6.6 3 9.4 4.8c1.2.8 2.2 2 2.6 2.8.4-.8 1.4-2 2.6-2.8C17.4 3 21.4 5 21.4 8.6 21.4 14 16 17.6 12 21z" fill="url(#h)" stroke="#a01a48" stroke-width=".8"/><path d="M6.4 6.6c-1.2.6-1.6 1.8-1.4 3" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".75"/></svg>`;
const WARM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 28"><defs><radialGradient id="w" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffd0e0"/><stop offset=".55" stop-color="#ff8fb4"/><stop offset="1" stop-color="#e0407a"/></radialGradient></defs><path d="M15 25.4C10 21 3.4 16.6 3.4 10 3.4 5.4 8.4 3 11.8 5.2c1.4 1 2.6 2.4 3.2 3.4.6-1 1.8-2.4 3.2-3.4C21.6 3 26.6 5.4 26.6 10c0 6.6-6.6 11-11.6 15.4z" fill="url(#w)" stroke="#a01a48" stroke-width=".9"/><path d="M9.6 14.6c1.6 2.4 3.4 3.4 5.4 3.4s3.8-1 5.4-3.4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="11" cy="11.4" r="1" fill="#fff"/><circle cx="19" cy="11.4" r="1" fill="#fff"/></svg>`;
const FRANK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 28"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8ff"/><stop offset="1" stop-color="#c8d8f8"/></linearGradient></defs><path d="M4 4.6a2.6 2.6 0 0 1 2.6-2.6h16.8A2.6 2.6 0 0 1 26 4.6v12.8a2.6 2.6 0 0 1-2.6 2.6H12.4l-5.6 5v-5H6.6A2.6 2.6 0 0 1 4 17.4z" fill="url(#f)" stroke="#2a3a8a" stroke-width="1.2"/><rect x="13.6" y="5" width="2.8" height="7.6" rx="1.4" fill="#2a3a8a"/><circle cx="15" cy="15.6" r="1.6" fill="#2a3a8a"/></svg>`;
const HAND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;
// 방법 화면 그림 3장(벡터 카드·캐릭터 그림)
function stepPics() {
  const back = cardBack().toDataURL(), star = cardFront(CARDS[7]).toDataURL();
  const bg = `<defs><radialGradient id="b" cx=".5" cy=".3" r=".85"><stop offset="0" stop-color="#4a2a7a"/><stop offset="1" stop-color="#160a2a"/></radialGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>`;
  const hand = (x, y) => `<g transform="translate(${x} ${y}) scale(.75)">${HAND.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 80 80">${bg}<image href="${back}" x="10" y="12" width="30" height="49" transform="rotate(-10 25 36)"/><image href="${back}" x="36" y="10" width="30" height="49" transform="rotate(8 51 34)"/><path d="M8 66h14M58 66h14" stroke="#ffe9a0" stroke-width="2" stroke-linecap="round" opacity=".7"/>${hand(26, 44)}</svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${bg}<g stroke="#ffd84a" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round">${[...Array(12)].map((_, k) => { const an = k * Math.PI / 6; return `<path d="M${40 + Math.cos(an) * 27} ${40 + Math.sin(an) * 27}L${40 + Math.cos(an) * 36} ${40 + Math.sin(an) * 36}"/>`; }).join("")}</g><image href="${star}" x="23" y="12" width="34" height="56"/></svg>`);
  const c = `<span class="tr-sp3"><span></span><img src="${svgU(HEART_SVG)}" alt=""></span>`;
  return [[`<img src="${a}" alt="">`, "문질러 섞기"], [`<img src="${b}" alt="">`, "고른 카드 뒤집기"], [c, "표정 보고 말투"]];
}

export const GAME = {
  key: "tarot1", base: "tarot", jc: "#b48cff", n: "카드빨보다 말빨", desc: "플리마켓 타로 부스, 카드보다 상담이 본업이에요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 손님이 고민을 말하면 가운데 <b>덱을 좌우로 문질러</b> 섞어요.",
    "카드 3장이 펼쳐지면 손님이 고른 <b>반짝이는 카드</b>를 톡! 카드가 <b>거꾸로</b> 나오면 역방향 뜻이에요. 방향에 맞는 뜻을 골라요.",
    "손님 <b>표정</b>을 보고 말투를 골라요. 글썽이며 꼼지락대면 <b>따뜻하게</b>, 팔짱 끼고 한숨 쉬면 <b>솔직하게</b>. 만족하면 팁과 단골 예약이 붙어요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "문질러 섞기"], ["", "고른 카드 뒤집기"], ["", "표정 보고 말투"]]; } },
  css: `.mg-tarot1 .mg-steps i{width:76px;height:76px;display:flex;align-items:center;justify-content:center}
.mg-tarot1 .mg-steps img{width:76px;height:76px;border-radius:12px;box-shadow:0 3px 10px #0006}
.mg-tarot1 .tr-sp3{position:relative;display:block;width:76px;height:76px;border-radius:12px;overflow:hidden;background:url("img/bg/studyst.webp") 40% 40%/cover;box-shadow:0 3px 10px #0006}
.mg-tarot1 .tr-sp3>span{position:absolute;left:10px;top:8px;width:54px;height:70px;background:url("img/body/c003.webp") 50% 0/300% 346.15% no-repeat;filter:drop-shadow(0 2px 3px #0008)}
.mg-tarot1 .tr-sp3 img{position:absolute;right:3px;top:3px;width:22px!important;height:22px!important;box-shadow:none!important;border-radius:0!important}
.mg-tarot1 .tr-st{background:#140a26!important}
.mg-tarot1 .tr-bgi{position:absolute;inset:-4px;z-index:0;background:url("img/bg/studyst.webp") 38% 30%/cover no-repeat;filter:brightness(.5) saturate(1.1) hue-rotate(-12deg) blur(.8px);transform:scale(1.02)}
.mg-tarot1 .tr-vg{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 70% 45% at 30% 28%,#ffb05a26,transparent 70%),linear-gradient(180deg,#1a0b3399,transparent 30%,#1a0b3366 60%),radial-gradient(ellipse at 50% 35%,transparent 50%,#06020faa 100%)}
.mg-tarot1 .tr-awn{position:absolute;left:0;right:0;top:0;height:30px;z-index:1;pointer-events:none;background:repeating-linear-gradient(90deg,#6b2fa0 0 21px,#f1e2c0 21px 42px);-webkit-mask:radial-gradient(circle 11px at 10.5px 19px,#000 98%,transparent) 0 0/21px 30px repeat-x,linear-gradient(#000,#000) 0 0/100% 19px no-repeat;mask:radial-gradient(circle 11px at 10.5px 19px,#000 98%,transparent) 0 0/21px 30px repeat-x,linear-gradient(#000,#000) 0 0/100% 19px no-repeat;filter:drop-shadow(0 4px 4px #0009)}
.mg-tarot1 .tr-awn::after{content:"";position:absolute;left:0;right:0;top:0;height:19px;background:linear-gradient(#ffffff40,transparent 40%,#00000030)}
.mg-tarot1 .tr-lts{position:absolute;left:0;right:0;top:30px;height:16px;z-index:1;pointer-events:none;background:radial-gradient(circle 3px,#ffe29a 60%,#ffb04a00 61%) 0 0/24px 16px repeat-x;filter:drop-shadow(0 0 4px #ffc46a)}
.mg-tarot1 .tr-cu{position:absolute;z-index:2;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;pointer-events:none;transform-origin:50% 100%;filter:drop-shadow(0 0 10px #ffb05a33) drop-shadow(0 6px 10px #0009)}
.mg-tarot1 .tr-cu.dim{filter:brightness(.55) saturate(.7)}
.mg-tarot1 .tr-mk{position:absolute;z-index:3;font-size:20px;line-height:1;pointer-events:none;opacity:0;transition:opacity .2s;filter:drop-shadow(0 2px 2px #0008)}
.mg-tarot1 .tr-mk.on{opacity:1;animation:trmk .9s ease-in-out infinite alternate}
@keyframes trmk{to{transform:translateY(-4px) scale(1.12)}}
.mg-tarot1 .tr-cv{position:absolute;left:0;top:0;touch-action:none}
.mg-tarot1 .tr-fr{z-index:3;cursor:pointer}
.mg-tarot1 .tr-bk{z-index:1}
.mg-tarot1 .tr-me{position:absolute;z-index:2;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter .3s;pointer-events:none;filter:drop-shadow(0 0 6px #b48cff55)}
.mg-tarot1 .tr-me.on{opacity:1}
.mg-tarot1 .tr-me.dim{filter:brightness(.55)}
.mg-tarot1 .tr-bub{position:absolute;top:8px;z-index:6;max-width:54%;background:#fffdf8;color:#2a1e2e;font-size:12.5px;line-height:1.4;font-weight:700;padding:6px 9px;border-radius:12px;box-shadow:0 3px 0 #0007;pointer-events:none;opacity:0;transform:scale(.6);transition:opacity .15s,transform .2s cubic-bezier(.3,1.6,.5,1);word-break:keep-all}
.mg-tarot1 .tr-bub.on{opacity:1;transform:none}
.mg-tarot1 .tr-bub.c{left:8px;transform-origin:30% 100%}
.mg-tarot1 .tr-bub.m{right:8px;transform-origin:70% 100%;background:#f3eaff;box-shadow:0 3px 0 #0007,0 0 0 2px #b48cff}
.mg-tarot1 .tr-bub::after{content:"";position:absolute;bottom:-7px;border:7px solid transparent;border-bottom:0;border-top-color:inherit}
.mg-tarot1 .tr-bub.c::after{left:22px;border-top-color:#fffdf8}.mg-tarot1 .tr-bub.m::after{right:30px;border-top-color:#f3eaff}
.mg-tarot1 .tr-bub u{text-decoration:none;display:inline-block;font-size:11px;font-weight:900;color:#1a0e30;border-radius:6px;padding:0 6px;margin-right:4px;vertical-align:1px}
.mg-tarot1 .tr-bub.big{font-size:13.5px}
.mg-tarot1 .tr-sat{position:absolute;left:6px;z-index:5;width:14px;display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none}
.mg-tarot1 .tr-sat img{width:16px;height:16px;filter:drop-shadow(0 0 4px #ff4f7b88)}
.mg-tarot1 .tr-sat i{position:relative;flex:1;width:10px;border-radius:6px;background:#0008;border:1px solid #ffffff33;overflow:hidden}
.mg-tarot1 .tr-sat i em{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(0deg,#ff4f7b,#ffb0c8);transition:height .4s cubic-bezier(.3,1.4,.5,1)}
.mg-tarot1 .tr-sat.pang img{animation:trpang .4s}
.mg-tarot1 .tr-pan{position:absolute;left:6px;right:6px;bottom:6px;z-index:6;background:#1b0f33ee;border:1px solid #b48cff66;border-radius:14px;padding:6px 8px 7px;display:flex;flex-direction:column;gap:5px;box-shadow:0 -4px 14px #0008}
.mg-tarot1 .tr-chips{display:flex;gap:4px;justify-content:center;flex:0 0 auto}
.mg-tarot1 .tr-chips span{font-size:11px;font-weight:800;color:#8f7fb0;background:#ffffff0d;border-radius:99px;padding:1px 6px}
.mg-tarot1 .tr-chips span.on{background:#b48cff;color:#1a0e30}
.mg-tarot1 .tr-chips span.ok{color:#7fe0a8}
.mg-tarot1 .tr-lim{height:4px;flex:0 0 auto;border-radius:9px;background:#ffffff14;overflow:hidden;display:none}
.mg-tarot1 .tr-lim.on{display:block}
.mg-tarot1 .tr-lim i{display:block;height:100%;background:linear-gradient(90deg,#ff5a6a,#ffd166 40%,#b48cff);transform-origin:left}
.mg-tarot1 .tr-task{font-size:13px;font-weight:700;color:#f2eaff;text-align:center;line-height:1.45;word-break:keep-all}
.mg-tarot1 .tr-task em{font-style:normal;display:inline-block;background:#ff7eb6;color:#fff;font-size:11px;font-weight:900;padding:0 7px;border-radius:6px;margin-right:4px;vertical-align:1px}
.mg-tarot1 .tr-task b{color:#ffd166}.mg-tarot1 .tr-task b.rd{color:#ff8a9a}.mg-tarot1 .tr-task b.pk{color:#ffb0d0}.mg-tarot1 .tr-task b.bl{color:#9cd0ff}
.mg-tarot1 .tr-task small{display:block;color:#b8a8d8;font-size:11.5px;font-weight:600}
.mg-tarot1 .tr-opts{display:flex;flex-direction:column;gap:6px}
.mg-tarot1 .tr-o{display:flex!important;align-items:center;gap:9px;text-align:left;background:#2c1a52!important;border:1px solid #6a4ea0!important;border-radius:12px!important;padding:6px 10px!important;color:#fff!important;min-height:48px;animation:trin .3s cubic-bezier(.3,1.5,.5,1) both}
.mg-tarot1 .tr-o:nth-child(2){animation-delay:.08s}
.mg-tarot1 .tr-o img{flex:0 0 auto;width:25px;height:41px;filter:drop-shadow(0 2px 3px #0008)}
.mg-tarot1 .tr-o img.ic{width:30px;height:28px}
.mg-tarot1 .tr-o span{display:flex;flex-direction:column;gap:1px}
.mg-tarot1 .tr-o b{font-size:14px;font-weight:900}.mg-tarot1 .tr-o b i{font-style:normal;color:#c8b0ff;font-size:11.5px;font-weight:800;margin-right:5px}
.mg-tarot1 .tr-o small{font-size:12px;color:#d8ccf0;font-weight:600;line-height:1.3}
.mg-tarot1 .tr-o:active{transform:scale(.97)}
.mg-tarot1 .tr-o.ok{background:#1f6a4a!important;border-color:#7fe0a8!important}
.mg-tarot1 .tr-o.ng{background:#7a2238!important;border-color:#ff8a9a!important}
.mg-tarot1 .tr-o.no{animation:trno .35s}
.mg-tarot1 .tr-o:disabled{opacity:.92}
.mg-tarot1 .tr-tb{display:flex;justify-content:center;gap:10px}
.mg-tarot1 .tr-tb.sk{position:absolute;right:4px;top:5px}
.mg-tarot1 .tr-skip{background:none!important;border:0!important;color:#9d8cc0!important;font-size:11.5px;text-decoration:underline;padding:0 6px!important}
.mg-tarot1 .tr-go{background:linear-gradient(#c9a0ff,#8a5fe0)!important;color:#fff!important;border-radius:10px!important;padding:8px 26px!important;font-weight:900;font-size:14.5px;box-shadow:0 3px 0 #4a2a90!important;animation:trpulse .5s infinite alternate}
.mg-tarot1 .tr-hand{position:absolute;z-index:8;width:40px;height:40px;margin:-6px 0 0 -14px;background-size:100% 100%;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px #0009)}
.mg-tarot1 .tr-hand.on{display:block}
.mg-tarot1 .tr-hand.tap{animation:trtap .8s infinite}
.mg-tarot1 .tr-hand.rub{animation:trrub .9s ease-in-out infinite}
.mg-tarot1 .tr-book{position:absolute;z-index:7;left:12px;width:84px;height:84px;border-radius:50%;border:4px double #ff5f8a;color:#ff5f8a;background:#fff4f8ee;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:15px;line-height:1.1;transform:rotate(-14deg);pointer-events:none;animation:trstamp .45s cubic-bezier(.3,1.6,.5,1) both;box-shadow:0 4px 10px #0007}
.mg-tarot1 .tr-book small{font-size:11px;font-weight:800;color:#c0406a}
.mg-tarot1 .tr-book.out{transition:opacity .4s,transform .4s;opacity:0;transform:rotate(-14deg) scale(.6)}
.mg-tarot1 .tr-end{position:absolute;inset:0;z-index:12;background:radial-gradient(ellipse at 50% 35%,#3a1d62ee,#0d0618f4 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;animation:trfade .5s both;padding:16px}
.mg-tarot1 .tr-end h4{margin:0;font-size:21px;font-weight:900;color:#f3eaff;text-shadow:0 2px 0 #000}
.mg-tarot1 .tr-end h4 small{display:block;font-size:12px;color:#c8b0ff;font-weight:700;text-align:center;margin-top:2px}
.mg-tarot1 .tr-end canvas{width:132px;height:216px;filter:drop-shadow(0 0 14px #b48cff88);animation:trcard .6s cubic-bezier(.3,1.5,.5,1) both}
.mg-tarot1 .tr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(300px,94%)}
.mg-tarot1 .tr-stats div{background:#ffffff12;border-radius:10px;padding:8px 4px;text-align:center;opacity:0;animation:trst .4s cubic-bezier(.3,1.6,.5,1) forwards}
.mg-tarot1 .tr-stats div:nth-child(2){animation-delay:.25s}.mg-tarot1 .tr-stats div:nth-child(3){animation-delay:.5s}
.mg-tarot1 .tr-stats span{font-size:11px;color:#d8c8ee;display:block}
.mg-tarot1 .tr-stats b{display:block;font-size:19px;font-weight:900;color:#ffd166;margin-top:2px}
.mg-tarot1 .tr-stats div:nth-child(3) b{color:#ff8fb0}
.mg-tarot1 .tr-bye{font-size:13px;color:#fff;font-weight:700;opacity:.9;text-align:center}
@keyframes trtap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes trrub{0%,100%{transform:translateX(-34px)}50%{transform:translateX(34px)}}
@keyframes trpulse{to{transform:scale(1.07)}}
@keyframes trin{from{opacity:0;transform:translateY(10px) scale(.95)}}
@keyframes trno{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes trpang{50%{transform:scale(1.5)}}
@keyframes trstamp{0%{transform:scale(2.6) rotate(-35deg);opacity:0}70%{transform:scale(.92) rotate(-14deg);opacity:1}100%{transform:scale(1) rotate(-14deg)}}
@keyframes trfade{from{opacity:0}}
@keyframes trst{from{opacity:0;transform:translateY(12px) scale(.8)}to{opacity:1;transform:none}}
@keyframes trcard{from{transform:rotateY(90deg) scale(.6);opacity:0}}
@media (max-height:640px){.mg-tarot1 .tr-o{min-height:46px;padding:4px 9px!important}.mg-tarot1 .tr-o img{width:22px;height:36px}.mg-tarot1 .tr-o small{font-size:11.5px}}
@media (prefers-reduced-motion:reduce){.mg-tarot1 .tr-go{animation:none}.mg-tarot1 .tr-o{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "tarot1", "카드빨보다 말빨", "tr-st");
    const st = F.stage;
    st.insertAdjacentHTML("beforeend", `<div class="tr-bgi"></div><div class="tr-vg"></div><div class="tr-awn"></div><div class="tr-lts"></div><canvas class="tr-cv tr-bk"></canvas><div class="tr-cu"></div><div class="tr-mk"></div><div class="tr-me"></div><canvas class="tr-cv tr-fr"></canvas>
      <div class="tr-bub c"></div><div class="tr-bub m"></div>
      <div class="tr-sat"><img alt=""><i><em></em></i></div>
      <div class="tr-pan"><div class="tr-chips"><span>① 섞기</span><span>② 고르기</span><span>③ 뜻</span><span>④ 말투</span></div><div class="tr-lim"><i></i></div><div class="tr-task"></div><div class="tr-opts"></div><div class="tr-tb"></div></div>
      <div class="tr-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const cvB = $(".tr-bk"), gB = cvB.getContext("2d"), cvF = $(".tr-fr"), gF = cvF.getContext("2d");
    const meEl = $(".tr-me"), bubC = $(".tr-bub.c"), bubM = $(".tr-bub.m"), satEl = $(".tr-sat"), satBar = $(".tr-sat em"), pan = $(".tr-pan");
    const chips = [...st.querySelectorAll(".tr-chips span")], limEl = $(".tr-lim"), limBar = $(".tr-lim i"), taskEl = $(".tr-task"), optsEl = $(".tr-opts"), tbEl = $(".tr-tb"), hand = $(".tr-hand");
    // 크기: 논리 폭 112칸 안팎을 정수배로
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cvB, cvF]) { c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    for (const q of [gB, gF]) { q.setTransform(KS, 0, 0, KS, 0, 0); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = "high"; }
    const cx = LW >> 1, T0 = Math.round(LH * 0.39), custX = Math.round(LW * 0.29);
    const slotY = T0 + 7, SLOT = [cx - 29, cx, cx + 29], deckY = T0 + 7;
    const jarX = LW - 13, candX = 3;
    satEl.style.top = (T0 - 44) * K + "px"; satEl.style.height = 40 * K + "px";
    satEl.querySelector("img").src = svgU(HEART_SVG);
    hand.style.backgroundImage = `url("${svgU(HAND)}")`;
    const warmIco = svgU(WARM_SVG), frankIco = svgU(FRANK_SVG);
    // 내 캐릭터 그림(3x2 표정 시트, 칸 240x540 중 위 312)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    {
      const h = 64 * K, w = Math.round(h * 240 / 312);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(LW * 0.76 * K - w / 2) + "px", top: (T0 + 5) * K - h + "px" });
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); setMe("neutral"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = 0;
    const setMe = (ex, dur = 0) => { meT = dur; if (ex === meX) return; meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };
    // 손님 그림(3x2 표정 시트): 고민할 때 표정(걱정=슬픔, 짜증=화남)이 말투 힌트
    const cuEl = $(".tr-cu"), mkEl = $(".tr-mk");
    const CU_POOL = [...Array(23)].map((_, i) => "c" + String(i + 1).padStart(3, "0")).concat(["pM1", "pM2", "pM3", "pM4", "pM5", "pM6", "pM7", "pM8", "pF2", "pF3", "pF4", "pF5", "pF6", "pF7", "pF8"]).filter((k) => k !== AV);
    const cuKeys = shuffle(CU_POOL).slice(0, 8), CU_IMG = {};
    const loadCu = (key) => { if (CU_IMG[key]) return CU_IMG[key]; const r = { ok: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.src = "img/body/" + key + ".webp"; return (CU_IMG[key] = r); };
    cuKeys.slice(0, 4).forEach(loadCu);
    let keyI = 0, cuShown = "", cuEx = "", mkTxt = "";
    const CUH = 66, CUW = CUH * 240 / 312;
    Object.assign(cuEl.style, { width: Math.round(CUW * K) + "px", height: CUH * K + "px", left: Math.round((custX - CUW / 2) * K) + "px", top: (T0 + 6 - CUH) * K + "px" });
    const MOODX = { neu: "neutral", anx: "sad", sad: "sad", grr: "angry", mad: "angry", happy: "smile" };

    // ── 그림 미리 만들기 ──
    const BACK = cardBack(), FRONT = {}; CARDS.forEach((c) => (FRONT[c.id] = cardFront(c)));
    const rot180 = (c) => { const o = mkCanvas(c.width, c.height), g = o.getContext("2d"); g.translate(c.width, c.height); g.rotate(Math.PI); g.drawImage(c, 0, 0); return o; };
    const ICON = {}; const iconOf = (id, rv) => { const k = id + (rv ? "r" : ""); if (!ICON[k]) ICON[k] = (rv ? rot180(FRONT[id]) : FRONT[id]).toDataURL(); return ICON[k]; };
    // 배경(부스): 밤하늘·장터 불빛·천막·커튼·간판
    const BG = mkCanvas(LW, LH), bulbs = [], bokeh = [];
    {
      const b = BG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      for (let y = 0; y < T0 + 2; y++) { const k = y / T0; P(0, y, LW, 1, `rgb(${Math.round(18 + k * 30)},${Math.round(10 + k * 12)},${Math.round(38 + k * 36)})`); }
      const gL = Math.round(LW * 0.41) + 1, gR = Math.round(LW * 0.6) - 2;
      for (let i = 0; i < 14; i++) bokeh.push({ x: gL + rint(gR - gL), y: 16 + rint(T0 - 24), r: 1 + rint(2), c: pick(["#ffb04a", "#ff7eb6", "#ffe9a0", "#7fc8ff", "#b48cff"]), ph: rnd() * 6 });
      // 먼 장터 천막 실루엣
      for (let x = 34; x < LW - 30; x += 10) { const hh = 8 + rint(6); P(x, T0 - hh, 9, hh, "#1c1036"); for (let k = 0; k < 9; k++) P(x + k, T0 - hh - Math.round(3 - Math.abs(k - 4) * 0.75), 1, 3, "#1c1036"); }
      // 커튼(좌우)
      const curL = Math.round(LW * 0.41), curR = Math.round(LW * 0.6);
      for (let x = 0; x < LW; x++) {
        if (x >= curL && x < curR) continue;
        const f = (x % 7), col = f === 0 ? "#2a1244" : f === 3 ? "#5a2c88" : f < 3 ? "#43206e" : "#3b1d62";
        P(x, 11, 1, T0 - 11, col);
      }
      // 커튼 끝 묶음(금색 끈)과 주름
      for (const [x0, dir] of [[curL - 1, -1], [curR, 1]]) { for (let y = 11; y < T0; y++) { const bend = Math.round(Math.max(0, 5 - Math.abs(y - (T0 - 18)) * 0.35)); P(x0 + dir * bend, y, 1, 1, "#2a1244"); } P(x0 + dir * 5 - 2, T0 - 19, 4, 2, "#ffd84a"); P(x0 + dir * 5 - 1, T0 - 17, 2, 3, "#c9952a"); }
      // 별 수 놓기
      for (let i = 0; i < 18; i++) { const x = rint(LW), y = 14 + rint(T0 - 18); if (x >= curL - 1 && x <= curR) continue; P(x, y, 1, 1, "#c9952a"); }
      // 줄무늬 천막 지붕 + 물결 끝
      for (let x = 0; x < LW; x++) { const s = Math.floor(x / 7) % 2; P(x, 0, 1, 9, s ? "#f1e2c0" : "#6b2fa0"); const k = x % 7, dy = k === 0 || k === 6 ? 0 : k === 1 || k === 5 ? 1 : 2; P(x, 9, 1, dy, s ? "#f1e2c0" : "#6b2fa0"); P(x, 9 + dy, 1, 1, "#0006"); }
      P(0, 0, LW, 1, "#ffffff22"); P(0, 8, LW, 1, "#ffd84a");
      // 기둥
      P(0, 0, 2, T0, "#4a2e1a"); P(LW - 2, 0, 2, T0, "#4a2e1a"); P(1, 0, 1, T0, "#6a4428");
      // 매달린 간판(초승달·별)
      const sx = cx - 9, sy = 15; P(sx + 3, 10, 1, 5, "#c9952a"); P(sx + 14, 10, 1, 5, "#c9952a");
      P(sx, sy, 18, 12, "#6a4428"); P(sx, sy, 18, 1, "#8a5a38"); P(sx + 1, sy + 1, 16, 10, "#2a1650"); P(sx, sy + 11, 18, 1, "#3a2010");
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const d = Math.hypot(x - 3.5, y - 3.5), d2 = Math.hypot(x - 5.2, y - 2.6); if (d <= 3.6 && d2 > 3) P(sx + 3 + x, sy + 2 + y, 1, 1, "#ffe9a0"); }
      P(sx + 13, sy + 3, 1, 3, "#ffd84a"); P(sx + 12, sy + 4, 3, 1, "#ffd84a"); P(sx + 11, sy + 8, 1, 1, "#ffe9a0"); P(sx + 15, sy + 7, 1, 1, "#ffe9a0");
      // 전구 줄
      for (let x = 2; x < LW - 2; x++) { const y = 12 + Math.round(Math.abs(Math.sin((x / LW) * Math.PI * 2)) * 4); P(x, y, 1, 1, "#2a1a20"); if (x % 8 === 4) bulbs.push([x, y + 1]); }
    }
    // 탁자(벨벳 천)·수정 구슬·자수정·초·팁 병: 고해상도 벡터로 한 번만
    const TB = mkCanvas(Math.round(LW * KS), Math.round(LH * KS));
    {
      const b = TB.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0);
      let q = b.createLinearGradient(0, T0, 0, LH); q.addColorStop(0, "#4a2478"); q.addColorStop(0.35, "#3a1c66"); q.addColorStop(1, "#1e0e3c"); b.fillStyle = q; b.fillRect(0, T0, LW, LH - T0);
      q = b.createRadialGradient(cx, T0 + 10, 2, cx, T0 + 10, 60); q.addColorStop(0, "rgba(255,190,110,.16)"); q.addColorStop(1, "rgba(255,190,110,0)"); b.fillStyle = q; b.fillRect(0, T0, LW, LH - T0);
      b.fillStyle = "#e2bd62"; b.fillRect(0, T0, LW, 0.6); b.fillStyle = "#8a6420"; b.fillRect(0, T0 + 0.6, LW, 0.4);
      q = b.createLinearGradient(0, T0 + 1, 0, T0 + 4); q.addColorStop(0, "rgba(0,0,0,.35)"); q.addColorStop(1, "rgba(0,0,0,0)"); b.fillStyle = q; b.fillRect(0, T0 + 1, LW, 3);
      // 수 놓은 원(카드 자리)
      const my = slotY + 18;
      b.save(); b.setLineDash([1.6, 1.2]); b.strokeStyle = "rgba(226,189,98,.55)"; b.lineWidth = 0.4; b.beginPath(); b.ellipse(cx, my, 44, 22, 0, 0, 6.3); b.stroke();
      b.setLineDash([0.3, 1.4]); b.lineCap = "round"; b.lineWidth = 0.5; b.strokeStyle = "rgba(226,189,98,.4)"; b.beginPath(); b.ellipse(cx, my, 40, 19, 0, 0, 6.3); b.stroke(); b.restore();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; st4(b, cx + Math.cos(a) * 44, my + Math.sin(a) * 22, 1.1, "#e2bd62", 0.8); }
      for (let i = 0; i < 22; i++) { const x = rnd() * LW, y = T0 + 4 + rnd() * (LH - T0 - 6); st4(b, x, y, rnd() < 0.3 ? 0.9 : 0.5, "#c9952a", 0.6); }
      // 수정 구슬(왼쪽 아래)
      { const bx = 15, by = slotY + CHH + 24;
        b.fillStyle = "rgba(0,0,0,.35)"; b.beginPath(); b.ellipse(bx + 1, by + 12.6, 9, 1.8, 0, 0, 6.3); b.fill();
        q = b.createLinearGradient(bx - 7, 0, bx + 7, 0); q.addColorStop(0, "#8a6420"); q.addColorStop(0.5, "#ffe08a"); q.addColorStop(1, "#8a6420"); b.fillStyle = q; b.beginPath(); b.moveTo(bx - 6.4, by + 7.4); b.lineTo(bx + 6.4, by + 7.4); b.lineTo(bx + 7.6, by + 12.4); b.lineTo(bx - 7.6, by + 12.4); b.closePath(); b.fill();
        b.fillStyle = "#c9952a"; b.fillRect(bx - 7.6, by + 12, 15.2, 0.6);
        b.fillStyle = "rgba(180,140,255,.25)"; b.beginPath(); b.arc(bx, by, 11, 0, 6.3); b.fill();
        q = b.createRadialGradient(bx - 2.6, by - 3, 0.5, bx, by, 8.4); q.addColorStop(0, "#f4eaff"); q.addColorStop(0.35, "#b48cff"); q.addColorStop(0.8, "#5a3aa0"); q.addColorStop(1, "#2a1660"); b.fillStyle = q; b.beginPath(); b.arc(bx, by, 8.2, 0, 6.3); b.fill();
        b.strokeStyle = "rgba(255,255,255,.35)"; b.lineWidth = 0.5; b.beginPath(); b.arc(bx + 0.6, by + 0.8, 4.6, 2.4, 4.6); b.stroke(); b.beginPath(); b.arc(bx - 0.4, by + 0.2, 2.4, -0.6, 1.8); b.stroke();
        b.fillStyle = "rgba(255,255,255,.85)"; b.beginPath(); b.ellipse(bx - 3.2, by - 4, 1.8, 1, -0.6, 0, 6.3); b.fill(); st4(b, bx + 3.4, by - 2.4, 0.9, "#fff", 0.9); }
      // 자수정(오른쪽 아래)
      { const ax = LW - 18, ay = slotY + CHH + 33;
        b.fillStyle = "rgba(0,0,0,.35)"; b.beginPath(); b.ellipse(ax + 7, ay + 1.4, 9, 1.6, 0, 0, 6.3); b.fill();
        for (const [ox, h, w, c] of [[0, 9, 3.2, "#9a6ad8"], [8.4, 8, 3, "#8a5fc0"], [11.6, 6, 2.6, "#c8a8ff"], [4, 13, 3.6, "#b48cff"]]) {
          const x0 = ax + ox; b.beginPath(); b.moveTo(x0, ay); b.lineTo(x0, ay - h + 1.6); b.lineTo(x0 + w / 2, ay - h); b.lineTo(x0 + w, ay - h + 1.6); b.lineTo(x0 + w, ay); b.closePath();
          q = b.createLinearGradient(x0, 0, x0 + w, 0); q.addColorStop(0, mix(c, 1.35)); q.addColorStop(0.5, c); q.addColorStop(1, mix(c, 0.65)); b.fillStyle = q; b.fill();
          b.fillStyle = "rgba(255,255,255,.4)"; b.beginPath(); b.moveTo(x0 + w / 2, ay - h); b.lineTo(x0 + w * 0.3, ay - h + 1.4); b.lineTo(x0 + w * 0.3, ay - 1); b.lineTo(x0 + w / 2, ay - 1.4); b.fill();
        }
        q = b.createLinearGradient(0, ay, 0, ay + 2.4); q.addColorStop(0, "#5a3a78"); q.addColorStop(1, "#2a1840"); b.fillStyle = q; rrp(b, ax - 1, ay - 0.4, 16.6, 2.6, 1); b.fill(); }
      // 초 받침 + 초
      q = b.createLinearGradient(candX - 1, 0, candX + 8, 0); q.addColorStop(0, "#8a6420"); q.addColorStop(0.5, "#ffe08a"); q.addColorStop(1, "#8a6420"); b.fillStyle = q; b.beginPath(); b.ellipse(candX + 3.5, T0 + 16, 4.6, 1.2, 0, 0, 6.3); b.fill();
      q = b.createLinearGradient(candX + 1, 0, candX + 6, 0); q.addColorStop(0, "#fffaf0"); q.addColorStop(0.5, "#eee4fa"); q.addColorStop(1, "#b8a8d0"); b.fillStyle = q; rrp(b, candX + 1, T0 + 5, 5, 10.6, 0.8); b.fill();
      b.fillStyle = "rgba(255,255,255,.8)"; rrp(b, candX + 4.6, T0 + 5, 0.9, 3, 0.45); b.fill();
      b.strokeStyle = "#3a2a2a"; b.lineWidth = 0.3; b.beginPath(); b.moveTo(candX + 3.5, T0 + 5); b.lineTo(candX + 3.5, T0 + 3.6); b.stroke();
      // 팁 유리병
      b.save(); b.shadowColor = "rgba(0,0,0,.4)"; b.shadowBlur = 2 * KS; rrp(b, jarX, T0 + 3, 11, 14, 2); b.fillStyle = "rgba(200,230,255,.16)"; b.fill(); b.restore();
      rrp(b, jarX, T0 + 3, 11, 14, 2); b.strokeStyle = "rgba(220,240,255,.7)"; b.lineWidth = 0.4; b.stroke();
      b.fillStyle = "rgba(255,255,255,.55)"; rrp(b, jarX + 1, T0 + 4.4, 1, 10, 0.5); b.fill();
      q = b.createLinearGradient(0, T0 + 1, 0, T0 + 3.4); q.addColorStop(0, "#fff0a0"); q.addColorStop(1, "#a87418"); rrp(b, jarX - 1, T0 + 1, 13, 2.4, 0.8); b.fillStyle = q; b.fill();
      rrp(b, jarX + 2, T0 + 6.6, 7, 4.2, 0.6); b.fillStyle = "#f3e6c4"; b.fill(); b.fillStyle = "#c94f4f"; b.font = "900 2.4px sans-serif"; b.textAlign = "center"; b.textBaseline = "middle"; b.fillText("TIP", jarX + 5.5, T0 + 8.8);
    }

    // ── 상태 ──  tut: 0 리허설 전 / 1 섞기 / 2 고르기 / 3 뜻 / 4 말투 / 5 시작 카드 / -1 본게임
    let tut = opts.retry ? -1 : 0;
    let over = false, done = false, raf = 0, last = 0, now0 = 0, tm = null, timeUp = false, closing = false;
    let phase = "idle", pt = 0, cu = null, cuN = 0, tLeft = 0, hintAll = false;
    let served = 0, sats = [], tips = 0, book = 0, meanOk = 0, meanN = 0, toneOk = 0, toneN = 0, lastLine = "";
    let rub = 0, rubDir = 0, rubAct = 0, rubPh = 0, ptr = null, dimAll = 0;
    const cards = [], flyers = [], sparks = [], rays = [], coins = [], hearts = [], puffs = [];
    let jarCoins = 0, bookEl = null, started = false, lastCard = "star";
    const rh = () => tut >= 0;

    // ── 말풍선·패널 ──
    let bubCT = 0, bubMT = 0;
    const sayC = (html, dur = 2.2, big = false) => { bubC.innerHTML = html; bubC.classList.toggle("big", big); bubC.classList.remove("on"); void bubC.offsetWidth; bubC.classList.add("on"); bubCT = dur; if (cu) cu.talk = Math.min(1.2, dur); tone(520 + rnd() * 140, 0.04, "triangle", 0.05); };
    const sayM = (html, dur = 2) => { bubM.innerHTML = html; bubM.classList.remove("on"); void bubM.offsetWidth; bubM.classList.add("on"); bubMT = dur; };
    const STEP = { shuf: 0, deal: 1, pick: 1, flip: 1, mean: 2, meanW: 2, tone: 3, say: 3 };
    const chipUpd = () => { const k = STEP[phase] ?? -1; chips.forEach((c, i) => { c.classList.toggle("on", i === k); c.classList.toggle("ok", k > i || phase === "react" || phase === "out"); }); };
    const SKIP = `<button class="tr-skip" data-skip>건너뛰기</button>`;
    const setTask = (html, opt = "", tb = "") => { taskEl.innerHTML = html; optsEl.innerHTML = opt; tbEl.innerHTML = tb; tbEl.style.display = tb ? "" : "none"; tbEl.classList.toggle("sk", tb === SKIP); };
    const satUpd = (pang) => { if (!cu) return; const v = clamp(cu.sat, 0, 100); satBar.style.height = v + "%"; if (pang) { satEl.classList.remove("pang"); void satEl.offsetWidth; satEl.classList.add("pang"); } };
    const scUpd = () => { F.sc.textContent = `손님 ${served} · 팁 ${won(tips)}원`; };
    const handAt = (p, mode) => {
      if (!p) { hand.className = "tr-hand"; return; }
      let x, y; if (Array.isArray(p)) { x = p[0]; y = p[1]; } else { const r = p.getBoundingClientRect(), s = st.getBoundingClientRect(); x = r.left - s.left + r.width * 0.8; y = r.top - s.top + r.height * 0.4; }
      hand.style.left = Math.round(x) + "px"; hand.style.top = Math.round(y) + "px";
      if (!hand.classList.contains(mode) || !hand.classList.contains("on")) hand.className = "tr-hand on " + mode;
    };

    // ── 손님 ──
    const newCust = (fixed) => {
      cuN++;
      const tk = fixed ? "job" : pick(Object.keys(TOPIC)), tp = TOPIC[tk];
      const cd = fixed ? CARDS.find((c) => c.id === "star") : pick(CARDS);
      cu = { s: custSpec(), ci: loadCu(cuKeys[keyI++ % cuKeys.length]), tk, line: fixed ? tp.lines[0] : pick(tp.lines), mood: "neu", feel: fixed ? "anx" : rnd() < 0.5 ? "anx" : "grr", card: cd, rv: fixed ? true : rnd() < 0.45, pickIdx: fixed ? 1 : rint(3), x: -40, sat: 0, talk: 0, blink: 0, react: 0, wrongPick: false, meanRight: false, toneRight: false, t: 0, chosen: null };
      cards.length = 0; rub = 0; rubAct = 0; dimAll = 0; satBar.style.height = "0%";
      if (bookEl) { bookEl.remove(); bookEl = null; }
      bubM.classList.remove("on"); bubC.classList.remove("on");
      setPhase("in");
      tone(1568, 0.14, "sine", 0.07); tone(1175, 0.26, "sine", 0.07, 0, 0.12);
    };
    const setPhase = (p) => {
      phase = p; pt = 0; chipUpd(); limEl.classList.remove("on"); handAt(null);
      const tag = rh() ? "<em>리허설</em>" : "";
      if (p === "in") setTask("손님이 들어와요…");
      else if (p === "shuf") {
        const tp = TOPIC[cu.tk];
        sayC(`<u style="background:${tp.c}">${tp.n}</u>${cu.line}`, 99, true);
        if (rh()) { tut = 1; setTask(`${tag}고민을 들으며 카드를 섞어요.<br>가운데 <b>덱을 좌우로 문질러요!</b>`, "", SKIP); }
        else setTask(`가운데 <b>덱을 좌우로 문질러</b> 섞어요`);
      } else if (p === "deal") setTask("카드 3장을 펼쳐요…");
      else if (p === "pick") {
        sayC(PICK_LN[cu.pickIdx], 99);
        if (rh()) { tut = 2; setTask(`${tag}손님이 카드를 골랐어요.<br><b>반짝이는 카드</b>를 톡 해서 뒤집어요!`, "", SKIP); }
        else setTask(`손님이 고른 <b>반짝이는 카드</b>를 톡!`);
      } else if (p === "flip") setTask("두근두근…");
      else if (p === "mean") {
        const cd = cu.card, o = shuffle(["up", "rv"]);
        const btn = (k) => `<button class="tr-o" data-o="${k}"><img src="${iconOf(cd.id, k === "rv")}" alt=""><span><b><i>${k === "rv" ? "역방향" : "정방향"}</i>${cd[k][0]}</b><small>${cd[k][1]}</small></span></button>`;
        if (rh()) { tut = 3; setTask(`${tag}<b>${cd.no} ${cd.n}</b> 카드가 <b class="rd">거꾸로</b> 나왔어요!<br>그림이 같은 방향인 <b>역방향 뜻</b>을 골라요`, o.map(btn).join(""), SKIP); }
        else { setTask(`<b>${cd.no} ${cd.n}</b> — 카드 <b>방향</b>을 보고 뜻을 골라요`, o.map(btn).join("")); limEl.classList.add("on"); }
      } else if (p === "tone") {
        cu.mood = cu.feel;
        sayC(cu.feel === "anx" ? pick(ANX_LN) : pick(GRR_LN), 99);
        tone(cu.feel === "anx" ? 330 : 180, 0.18, cu.feel === "anx" ? "sine" : "sawtooth", 0.06, cu.feel === "anx" ? -60 : 30);
        const o = ["warm", "frank"];
        const btn = (k) => k === "warm" ? `<button class="tr-o" data-o="warm"><img class="ic" src="${warmIco}" alt=""><span><b>따뜻하게</b><small>"괜찮아요, 천천히 가도 돼요"</small></span></button>` : `<button class="tr-o" data-o="frank"><img class="ic" src="${frankIco}" alt=""><span><b>솔직하게</b><small>"결론부터 말할게요"</small></span></button>`;
        if (rh()) { tut = 4; setTask(`${tag}손님 <b>표정</b>을 봐요. 눈물이 글썽, 손을 꼼지락!<br>불안한 손님에겐 <b class="pk">따뜻하게</b>`, o.map(btn).join(""), SKIP); }
        else { setTask(`손님 <b>표정</b>을 보고 말투를 골라요<small>글썽·꼼지락 → 따뜻하게 / 팔짱·한숨 → 솔직하게</small>`, o.map(btn).join("")); limEl.classList.add("on"); }
      } else if (p === "say") setTask("상담 중…");
      else if (p === "react") setTask("손님 마음이 어떨까요?");
      else if (p === "out") setTask(timeUp ? "오늘 상담 마감!" : "다음 손님을 기다려요…");
    };
    const custHead = () => [(custX + (cu ? cu.x : 0)) * K, (T0 - 40) * K];

    // ── 섞기 ──
    const riffle = () => { for (let k = 0; k < 4; k++) noise(0.022, 2600 + rnd() * 1800, 0.07, k * 0.028, 3); };
    const addRub = (d, dx) => {
      if (phase !== "shuf") return;
      rub += d; rubAct = 1; rubPh += d * 0.12;
      const dir = Math.sign(dx);
      if (dir && dir !== rubDir) { rubDir = dir; riffle(); vib(6); for (let k = 0; k < 3; k++) flyers.push({ t: -k * 0.06, d: dir, h: 6 + rnd() * 8 }); }
      if (rub >= RUB) {
        cu.sat += 5; F.float([cx * K, (deckY + 10) * K], "섞기 완료!"); satUpd(true);
        SFX.snap(); tone(1318, 0.12, "triangle", 0.09, 0, 0.05);
        sparkle(cx, deckY + 18, 8, "#ffe9a0");
        setPhase("deal");
        SLOT.forEach((x, i) => cards.push({ x: cx - CW / 2, y: deckY, tx: x - CW / 2, ty: slotY, sx: cx - CW / 2, sy: deckY, d: i * 0.14, t: 0, id: i === cu.pickIdx ? cu.card.id : pick(CARDS.filter((c) => c.id !== cu.card.id)).id, rv: i === cu.pickIdx ? cu.rv : rnd() < 0.5, flip: 0, fl: false, lift: 0, shine: -1 }));
      }
    };
    // ── 고르기·뒤집기 ──
    const tapCard = (i) => {
      if (phase !== "pick") return;
      const c = cards[i]; if (!c) return;
      if (i !== cu.pickIdx) {
        SFX.tok(); F.msg("손님이 고른 카드는 반짝이는 카드예요");
        if (!rh() && !cu.wrongPick) { cu.wrongPick = true; }
        sayC("아니 그거 말고요~", 1.2); return;
      }
      if (!cu.wrongPick) { cu.sat += 5; satUpd(true); }
      c.fl = true; c.flip = 0; setPhase("flip"); SFX.whoosh(); vib(10);
    };
    const sparkle = (x, y, n, col) => { for (let k = 0; k < n; k++) sparks.push({ x: x + (rnd() - 0.5) * 26, y: y + (rnd() - 0.5) * 30, t: 0, life: 0.5 + rnd() * 0.6, c: col || pick(["#ffffff", "#ffe9a0", "#ffd84a", "#d8c0ff"]) }); };
    const revealed = (c) => {
      [1046, 1318, 1568, 2093].forEach((f, k) => tone(f, 0.22, "triangle", 0.09, 0, k * 0.06)); tone(2637, 0.4, "sine", 0.04, 0, 0.26);
      lastCard = c.id; vib(18); rays.push({ x: c.x + CW / 2, y: c.y + CHH / 2, t: 0 }); sparkle(c.x + CW / 2, c.y + CHH / 2, 16); c.shine = 0; dimAll = 1;
      setMe("surprised", 0.6);
    };
    // ── 고르기 답 ──
    const answer = (k, btn) => {
      if (over && !closing) return;
      if (phase === "mean") {
        const right = (k === "rv") === cu.rv;
        if (rh() && !right) { SFX.fail(); F.msg("카드가 거꾸로예요! 역방향 뜻을 골라요"); if (btn) { btn.classList.remove("no"); void btn.offsetWidth; btn.classList.add("no"); } return; }
        const win = 6.5 * ez, sp = clamp(1 - pt / win, 0, 1);
        optsEl.querySelectorAll(".tr-o").forEach((b) => { b.disabled = true; if ((b.dataset.o === "rv") === cu.rv) b.classList.add("ok"); else if (b === btn) b.classList.add("ng"); });
        cu.chosen = k || (cu.rv ? "up" : "rv"); cu.meanRight = right;
        if (!rh()) { meanN++; if (right) meanOk++; } cu.sat += right ? 40 + 10 * sp : -15; satUpd(true);
        if (right) { if (btn) F.hit(btn, rh() ? 1 : Math.round(40 + 10 * sp), "#ffd166"); else SFX.ding(); setMe("smile", 0.9); sayC(pick(["오… 맞아요!", "헉, 소름…", "어떻게 아셨어요?"]), 1.1); cu.mood = "neu"; }
        else { F.miss(btn || null); setMe("surprised", 0.9); sayC(btn ? "음? 그건 좀 아닌 것 같은데…" : "저기… 카드 뜻이요…?", 1.2); F.msg(btn ? "카드 방향을 잘 봐요" : "시간 초과!"); }
        limEl.classList.remove("on");
        setTimeout(() => { if (!done && phase === "meanW") setPhase("tone"); }, right ? 650 : 950);
        phase = "meanW";
      } else if (phase === "tone") {
        const right = (k === "warm") === (cu.feel === "anx");
        if (rh() && !right) { SFX.fail(); F.msg("글썽이는 손님에겐 따뜻하게!"); if (btn) { btn.classList.remove("no"); void btn.offsetWidth; btn.classList.add("no"); } return; }
        const win = 5 * ez, sp = clamp(1 - pt / win, 0, 1);
        optsEl.querySelectorAll(".tr-o").forEach((b) => { b.disabled = true; if ((b.dataset.o === "warm") === (cu.feel === "anx")) b.classList.add("ok"); else if (b === btn) b.classList.add("ng"); });
        cu.toneRight = right; limEl.classList.remove("on");
        if (!rh()) { toneN++; if (right) toneOk++; } cu.sat += right ? 30 + 10 * sp : -15; satUpd(true);
        if (right) { if (btn) F.hit(btn, rh() ? 1 : Math.round(30 + 10 * sp), "#ff8fb0"); else SFX.ding(); }
        else { F.miss(btn || null); F.msg(btn ? (cu.feel === "anx" ? "글썽이는 손님에겐 따뜻하게!" : "팔짱 낀 손님에겐 솔직하게!") : "시간 초과!"); }
        const cd = cu.card, ln = cd[cu.chosen][1], warm = k ? k === "warm" : cu.feel !== "anx";
        sayM(warm ? `괜찮아요. <b>${cd.n}</b> 카드가 말해요. ${ln}. 제가 응원할게요.` : `솔직히 말할게요. ${ln}. 이제 정하실 때예요.`, 2.2);
        setMe(right ? "smile" : "sad", 1.6);
        bubC.classList.remove("on");
        setPhase("say");
      }
    };
    optsEl.addEventListener("click", (e) => { const b = e.target.closest(".tr-o"); if (!b || b.disabled) return; answer(b.dataset.o, b); });
    tbEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });
    // ── 반응·팁·단골 ──
    const doReact = () => {
      setPhase("react");
      const s = clamp(cu.sat, 0, 100), tier = rh() ? 3 : s >= 70 ? 3 : s >= 40 ? 2 : 1;
      cu.mood = cu.toneRight && cu.meanRight ? "happy" : cu.toneRight || cu.meanRight ? "neu" : cu.feel === "anx" ? "sad" : "mad";
      if (!cu.toneRight && cu.meanRight) cu.mood = cu.feel === "anx" ? "sad" : "mad";
      if (tier === 3) { cu.mood = "happy"; lastLine = "덕분에 마음이 정리됐어요!"; sayC(`덕분에 마음이 정리됐어요!<br><small>다음 달에 또 올게요</small>`, 2.4, true); }
      else if (tier === 2) { sayC("고마워요… 생각 좀 해 볼게요", 2.2); }
      else sayC(cu.feel === "anx" ? "흑… 더 불안해졌어요" : "음… 잘 모르겠네요", 2.2);
      const tip = rh() ? 0 : tier === 3 ? (s >= 88 ? 5000 : 3000) : tier === 2 ? 1000 : 0;
      if (!rh()) { served++; sats.push(s / 100); tips += tip; if (tier === 3) book++; scUpd(); }
      const n = tier === 3 ? 7 : tier === 2 ? 3 : 0;
      for (let k = 0; k < n; k++) coins.push({ t: -k * 0.09, x0: custX + (cu.x || 0), y0: T0 - 14, x1: jarX + 3 + rint(5), y1: T0 + 12 });
      if (tier === 3) {
        for (let k = 0; k < 8; k++) hearts.push({ x: custX + (rnd() - 0.5) * 26, y: T0 - 44 - rnd() * 6, vy: -10 - rnd() * 8, t: 0, d: k * 0.08 });
        const me = cu; setTimeout(() => {
          if (done || cu !== me) return;
          if (bookEl) bookEl.remove();
          bookEl = document.createElement("div"); bookEl.className = "tr-book"; bookEl.innerHTML = `<small>다음 달</small>단골<br>예약<small>${tip ? "+팁 " + won(tip) : "리허설"}</small>`;
          bookEl.style.top = (T0 - 26) * K + "px"; st.appendChild(bookEl); SFX.stamp(); vib(25); setMe("blush", 1.4);
        }, 650);
      } else if (tier === 1) { F.miss(null); setMe("sad", 1.2); }
      else setMe("neutral");
    };
    const custOut = (line) => {
      if (line) sayC(line, 1.6);
      setPhase("out");
    };
    // ── 마감 ──
    const closeShop = () => {
      if (closing) return; closing = true; over = true; setPhase("closed"); setTask("오늘 상담 마감!"); handAt(null);
      [784, 659, 523, 659].forEach((f, k) => tone(f, 0.2, "triangle", 0.09, 0, k * 0.14));
      const best = CARDS.find((c) => c.id === lastCard) || CARDS[7];
      const ov = document.createElement("div"); ov.className = "tr-end";
      ov.innerHTML = `<h4>오늘 부스 마감<small>플리마켓 타로 · ${T}초</small></h4><canvas></canvas>
        <div class="tr-stats"><div><span>상담한 손님</span><b data-k="0">0</b></div><div><span>받은 팁</span><b data-k="1">0</b></div><div><span>단골 예약</span><b data-k="2">0</b></div></div>
        <div class="tr-bye">${book ? "“덕분에 마음이 정리됐어요”" : served ? "다음엔 손님 마음을 더 잘 읽어 봐요" : "손님이 기다리고 있었어요…"}</div>`;
      setTimeout(() => {
        if (done) return; st.appendChild(ov);
        const ec = ov.querySelector("canvas"); ec.width = CW * CS; ec.height = CHH * CS; ec.getContext("2d").drawImage(FRONT[best.id], 0, 0);
        const tg = [served, tips, book], bs = ov.querySelectorAll("[data-k]"), t1 = performance.now();
        const cnt = () => { if (!ov.isConnected) return; const p = clamp((performance.now() - t1 - 300) / 1200, 0, 1), e = 1 - Math.pow(1 - p, 3); bs.forEach((b, i) => (b.textContent = i === 1 ? won(Math.round(tg[i] * e)) + "원" : Math.round(tg[i] * e) + "명")); if (p < 1) { if (rnd() < 0.4) SFX.tick(); requestAnimationFrame(cnt); } else { SFX.ding(4); vib(15); } };
        requestAnimationFrame(cnt);
      }, 500);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const avg = served ? sats.reduce((a, b) => a + b, 0) / served : 0;
        const score = served ? Math.pow(avg, 1.25) * (0.55 + 0.45 * Math.min(1, served / 3)) : 0.04;
        finish(score, `손님 <b>${served}명</b> 상담 · 팁 ${won(tips)}원 · 단골 예약 ${book}명`, "", [["카드 읽기", meanN ? meanOk / meanN : 0], ["말투", toneN ? toneOk / toneN : 0], ["손님 만족", avg]]);
      }, 4200);
    };
    const onTimeUp = () => {
      if (timeUp) return; timeUp = true; F.msg("마감 시간! 이 손님이 마지막이에요");
      if (!cu || ["in", "shuf", "deal", "pick", "flip"].includes(phase)) { if (cu && phase !== "in") custOut("앗, 마감이네요! 다음에 올게요"); else if (cu) setPhase("out"); else closeShop(); }
    };
    // ── 리허설 → 본게임 ──
    const startGame = () => {
      if (started) return; started = true; tut = -1;
      served = 0; sats = []; tips = 0; book = 0; meanOk = 0; meanN = 0; toneOk = 0; toneN = 0; jarCoins = 0; coins.length = 0; hearts.length = 0; cuN = 0;
      handAt(null); scUpd(); hintAll = true; SFX.go();
      newCust(false);
      tm = timer(T, F.bar, onTimeUp);
    };

    // ── 입력 ──
    const toL = (e) => { const r = cvF.getBoundingClientRect(); return [(e.clientX - r.left) / K, (e.clientY - r.top) / K]; };
    cvF.addEventListener("pointerdown", (e) => {
      e.preventDefault(); const [x, y] = toL(e); ptr = { x, y, id: e.pointerId };
      try { cvF.setPointerCapture(e.pointerId); } catch (er) {}
      if (phase === "pick") { cards.forEach((c, i) => { if (x >= c.x - 2 && x <= c.x + CW + 2 && y >= c.y - 3 && y <= c.y + CHH + 3) tapCard(i); }); }
      if (phase === "shuf") { rubDir = 0; }
    });
    cvF.addEventListener("pointermove", (e) => { if (!ptr || ptr.id !== e.pointerId) return; const [x, y] = toL(e); const dx = x - ptr.x, dy = y - ptr.y; if (phase === "shuf") addRub(Math.hypot(dx, dy), Math.abs(dx) > 0.6 ? dx : 0); ptr.x = x; ptr.y = y; });
    const up = (e) => { if (ptr && ptr.id === e.pointerId) ptr = null; };
    cvF.addEventListener("pointerup", up); cvF.addEventListener("pointercancel", up);

    // ── 그리기 ──
    const CC = mkCanvas(44, 56), cg = CC.getContext("2d");
    const drawCard = (g, c, alpha = 1) => {
      const cxp = c.x + CW / 2, cyp = c.y + CHH / 2 - c.lift;
      g.save(); g.globalAlpha = alpha; g.translate(Math.round(cxp), Math.round(cyp));
      if (c.fl && c.flip < 1) { const sx = Math.abs(Math.cos(Math.PI * c.flip)); g.scale(Math.max(0.04, sx), 1 + 0.12 * Math.sin(Math.PI * c.flip)); }
      const front = c.fl && c.flip >= 0.5;
      if (front && c.rv) g.rotate(Math.PI);
      g.drawImage(front ? FRONT[c.id] : BACK, -CW / 2, -CHH / 2, CW, CHH);
      g.restore();
    };
    const render = (tt) => {
      // 뒤: 배경 + 손님
      gB.clearRect(0, 0, LW, LH);
      const cuArt = !!(cu && cu.ci && cu.ci.ok);
      if (cuArt) {
        if (cuShown !== cu.ci.im.src) { cuShown = cu.ci.im.src; cuEl.style.backgroundImage = `url("${cuShown}")`; cuEx = ""; }
        const ex = MOODX[cu.mood] || "neutral";
        if (ex !== cuEx) { cuEx = ex; const i = EXI[ex]; cuEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; }
        const walk = phase === "in" || phase === "out";
        let dy = Math.sin(tt * 1.6) * 0.25;
        if (walk) dy -= Math.abs(Math.sin(tt * 9)) * 1.2; else if (cu.talk > 0) dy -= Math.abs(Math.sin(tt * 8)) * 0.4;
        if (cu.mood === "happy") dy -= Math.abs(Math.sin(tt * 7)) * 0.8;
        if (cu.mood === "mad") dy += Math.sin(tt * 30) * 0.3;
        const look = phase === "pick" || phase === "flip" || phase === "mean" ? 1.5 : 0;
        cuEl.style.transform = `translate(${((cu.x + look * 0.4) * K).toFixed(1)}px,${(dy * K).toFixed(1)}px) rotate(${look.toFixed(1)}deg)`;
        cuEl.style.opacity = clamp(1 + cu.x / 26, 0, 1).toFixed(2);
        cuEl.classList.toggle("dim", closing);
        const mk = cu.mood === "anx" || cu.mood === "sad" ? "💧" : cu.mood === "grr" || cu.mood === "mad" ? "💢" : cu.mood === "happy" ? "✨" : "";
        if (mk !== mkTxt) { mkTxt = mk; mkEl.textContent = mk; mkEl.classList.toggle("on", !!mk); }
        mkEl.style.left = Math.round((custX + cu.x + CUW * 0.3) * K) + "px"; mkEl.style.top = Math.round((T0 + 6 - CUH * 0.97) * K) + "px";
        if (cu.mood === "grr" || cu.mood === "mad") { if (rnd() < 0.08) puffs.push({ x: custX + cu.x + 8, y: T0 + 6 - CUH * 0.6, t: 0 }); }
      } else { cuEl.style.opacity = "0"; if (mkTxt) { mkTxt = ""; mkEl.classList.remove("on"); } }
      if (cu && !cuArt) {
        cg.clearRect(0, 0, 44, 56);
        const P = (x, y, w, h, c) => { cg.fillStyle = c; cg.fillRect(x, y, w, h); };
        const look = phase === "pick" || phase === "flip" || phase === "mean" ? 1 : 0;
        const r = paintCust(P, cu.s, { mood: cu.mood, talk: cu.talk > 0 && Math.floor(tt * 8) % 2 === 0, blink: cu.blink > 0, t: tt, look });
        uOutline(CC); gB.imageSmoothingEnabled = false;
        const walk = phase === "in" || phase === "out", bx = Math.round(custX + cu.x - 22), by = T0 + 1 - 54 + (walk && Math.floor(tt * 8) % 2 ? -1 : 0) + (phase === "out" ? -2 : 0);
        gB.drawImage(CC, bx, by); gB.imageSmoothingEnabled = true;
        const hy = by + r.hy;
        // 감정 표시
        if (cu.mood === "anx" || cu.mood === "sad") { const dy = (tt * 5) % 4 | 0; gB.fillStyle = "#8fd8ff"; gB.fillRect(bx + 32, hy + 1 + dy, 2, 3); gB.fillRect(bx + 33, hy + dy, 1, 1); gB.fillStyle = "#ffffff"; gB.fillRect(bx + 32, hy + 2 + dy, 1, 1); }
        if (cu.mood === "grr" || cu.mood === "mad") {
          const ax = bx + 30, ay = hy - 2; gB.fillStyle = "#ff4f5e"; for (const [x, y] of [[0, 1], [1, 0], [3, 0], [4, 1], [0, 3], [1, 4], [3, 4], [4, 3]]) gB.fillRect(ax + x, ay + y, 1, 1);
          if (rnd() < 0.08) puffs.push({ x: bx + 10, y: hy + 2, t: 0 });
        }
        if (cu.mood === "happy") { gB.fillStyle = "#ffe066"; const k = Math.floor(tt * 6) % 2; gB.fillRect(bx + 4 - k, hy - 3, 1, 3); gB.fillRect(bx + 3 - k, hy - 2, 3, 1); gB.fillRect(bx + 37 + k, hy + 1, 1, 3); gB.fillRect(bx + 36 + k, hy + 2, 3, 1); }
      }
      for (const p of puffs) { const a = 1 - p.t; gB.globalAlpha = a * 0.7; gB.fillStyle = "#f4f4f4"; gB.beginPath(); gB.arc(p.x - p.t * 6, p.y - p.t * 10, 0.8 + p.t * 1.6, 0, 6.3); gB.fill(); }
      gB.globalAlpha = 1;
      if (closing) { gB.fillStyle = "#0a041466"; gB.fillRect(0, 0, LW, LH); }
      // 앞: 탁자 + 카드 + 효과
      gF.clearRect(0, 0, LW, LH); gF.drawImage(TB, 0, 0, LW, LH);
      // 촛불
      { const fl = Math.sin(tt * 17) * 0.5 + Math.sin(tt * 7.3) * 0.5, fx = candX + 3.5, fy = T0 + 2.2;
        let q = gF.createRadialGradient(fx, fy, 0, fx, fy, 12); q.addColorStop(0, `rgba(255,176,74,${0.3 + 0.06 * fl})`); q.addColorStop(1, "rgba(255,176,74,0)"); gF.fillStyle = q; gF.fillRect(fx - 12, fy - 12, 24, 24);
        gF.beginPath(); gF.moveTo(fx, fy - 2.8 - fl * 0.4); gF.bezierCurveTo(fx + 1.4, fy - 0.6, fx + 1.1, fy + 1.3, fx, fy + 1.3); gF.bezierCurveTo(fx - 1.1, fy + 1.3, fx - 1.4, fy - 0.6, fx, fy - 2.8 - fl * 0.4);
        q = gF.createRadialGradient(fx, fy + 0.4, 0.1, fx, fy - 0.4, 2.6); q.addColorStop(0, "#fffbe0"); q.addColorStop(0.45, "#ffd84a"); q.addColorStop(1, "#ff7a20"); gF.fillStyle = q; gF.fill(); }
      // 유리병 동전
      for (let k = 0; k < Math.min(jarCoins, 24); k++) { const x = jarX + 2.6 + (k * 3) % 8, y = T0 + 15.6 - Math.floor(k / 3) * 0.9; gF.fillStyle = k % 2 ? "#ffd84a" : "#e0a030"; gF.beginPath(); gF.ellipse(x, y, 1.2, 0.55, 0, 0, 6.3); gF.fill(); }
      // 덱
      const showDeck = phase === "in" || phase === "shuf" || phase === "deal" || phase === "idle" || phase === "out" || phase === "wait" || phase === "closed";
      if (showDeck && !(phase === "deal" && pt > 0.5)) {
        const sp = phase === "shuf" ? rubAct * (3 + 4 * Math.abs(Math.sin(rubPh))) : 0, dx = cx - CW / 2, dy = deckY;
        gF.fillStyle = "rgba(0,0,0,.35)"; gF.beginPath(); gF.ellipse(dx + CW / 2, dy + CHH + 3, CW * 0.7 + sp, 2, 0, 0, 6.3); gF.fill();
        for (let k = 3; k >= 0; k--) gF.drawImage(BACK, dx - sp - k * 0.5, dy + k, CW, CHH);
        if (sp > 0.5) for (let k = 3; k >= 0; k--) gF.drawImage(BACK, dx + sp + k * 0.5, dy + k + 1, CW, CHH);
        // 진행 테두리(빛나는 금선이 한 바퀴 차오름)
        if (phase === "shuf" && rub > 0) {
          const x0 = dx - 4, y0 = dy - 3, w = CW + 8, h = CHH + 8, per = 2 * (w + h), f = clamp(rub / RUB, 0, 1);
          gF.save(); gF.shadowColor = "#ffd84a"; gF.shadowBlur = 3 * KS; gF.strokeStyle = "#ffe066"; gF.lineWidth = 0.9; gF.lineCap = "round"; gF.setLineDash([per * f, per]); rrp(gF, x0, y0, w, h, 2.4); gF.stroke(); gF.restore();
        }
        if (phase === "shuf" && rub === 0) { gF.save(); gF.globalAlpha = 0.35 + 0.35 * Math.sin(tt * 6); gF.shadowColor = "#ffe9a0"; gF.shadowBlur = 4 * KS; gF.strokeStyle = "#ffe9a0"; gF.lineWidth = 0.5; rrp(gF, dx - 2.4, dy - 2.4, CW + 4.8, CHH + 6, 2); gF.stroke(); gF.restore(); }
      }
      // 섞일 때 날아다니는 카드
      for (const f of flyers) { if (f.t < 0) continue; const p = f.t / 0.32, x = cx - CW / 2 - f.d * 8 + f.d * 16 * p, y = deckY - Math.sin(Math.PI * p) * f.h; gF.save(); gF.translate(Math.round(x + CW / 2), Math.round(y + CHH / 2)); gF.rotate(f.d * (p - 0.5) * 0.9); gF.drawImage(BACK, -CW / 2, -CHH / 2, CW, CHH); gF.restore(); }
      // 빛줄기
      for (const r of rays) { const a = 1 - r.t / 1.2; if (a <= 0) continue; gF.lineCap = "round"; for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6 + r.t * 0.8, d0 = 14 + r.t * 10, d1 = 24 + r.t * 26, x0 = r.x + Math.cos(an) * d0, y0 = r.y + Math.sin(an) * d0 * 0.9, x1 = r.x + Math.cos(an) * d1, y1 = r.y + Math.sin(an) * d1 * 0.9, q = gF.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, `rgba(255,233,160,${0.6 * a})`); q.addColorStop(1, "rgba(255,233,160,0)"); gF.strokeStyle = q; gF.lineWidth = 1.1; gF.beginPath(); gF.moveTo(x0, y0); gF.lineTo(x1, y1); gF.stroke(); } }
      gF.globalAlpha = 1;
      // 카드
      cards.forEach((c, i) => {
        const chosen = i === cu?.pickIdx;
        const al = dimAll && !chosen ? 0.45 : 1;
        if (phase === "pick" && chosen) { const p = 0.5 + 0.5 * Math.sin(tt * 8); gF.save(); gF.shadowColor = "#ffe9a0"; gF.shadowBlur = (4 + 4 * p) * KS; gF.fillStyle = `rgba(255,240,180,${0.5 + 0.4 * p})`; rrp(gF, c.x - 1.2, c.y - 1.2, CW + 2.4, CHH + 2.4, 2.2); gF.fill(); gF.restore(); if (rnd() < 0.25) sparkle(c.x + CW / 2, c.y + CHH / 2, 1); }
        if (c.fl && c.flip >= 1 && chosen) { gF.save(); gF.shadowColor = "#b48cff"; gF.shadowBlur = (5 + 2 * Math.sin(tt * 4)) * KS; gF.fillStyle = "rgba(180,140,255,.55)"; rrp(gF, c.x - 0.8, c.y - 0.8 - c.lift, CW + 1.6, CHH + 1.6, 2); gF.fill(); gF.restore(); }
        drawCard(gF, c, al);
        if (c.shine >= 0 && c.shine < 1) { gF.save(); rrp(gF, c.x + 0.6, c.y + 0.6 - c.lift, CW - 1.2, CHH - 1.2, 1.4); gF.clip(); const sx = c.x - 12 + c.shine * (CW + 30), q = gF.createLinearGradient(sx - 4, 0, sx + 4, 0); q.addColorStop(0, "rgba(255,255,255,0)"); q.addColorStop(0.5, "rgba(255,255,255,.6)"); q.addColorStop(1, "rgba(255,255,255,0)"); gF.fillStyle = q; gF.beginPath(); gF.moveTo(sx - 4, c.y - c.lift); gF.lineTo(sx + 4, c.y - c.lift); gF.lineTo(sx + 4 - CHH * 0.5, c.y - c.lift + CHH); gF.lineTo(sx - 4 - CHH * 0.5, c.y - c.lift + CHH); gF.fill(); gF.restore(); }
      });
      // 반짝이
      for (const s of sparks) { const p = s.t / s.life, a = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7; st4(gF, s.x, s.y, p < 0.5 ? (p > 0.15 && p < 0.35 ? 2 : 1.4) : 0.8, s.c, clamp(a, 0, 1)); }
      gF.globalAlpha = 1;
      // 동전
      for (const c of coins) { if (c.t < 0 || c.t > 0.62) continue; const p = c.t / 0.6, x = c.x0 + (c.x1 - c.x0) * p, y = c.y0 + (c.y1 - c.y0) * p - Math.sin(Math.PI * p) * 18, w = Math.abs(Math.cos(c.t * 14)) * 1.3 + 0.2, q = gF.createLinearGradient(x - 1.4, y - 1.4, x + 1.4, y + 1.4); q.addColorStop(0, "#fff3b0"); q.addColorStop(0.5, "#ffd84a"); q.addColorStop(1, "#b07a10"); gF.fillStyle = q; gF.beginPath(); gF.ellipse(x, y, w, 1.4, 0, 0, 6.3); gF.fill(); }
      // 하트
      for (const h of hearts) { if (h.d > 0) continue; const a = clamp(1.4 - h.t, 0, 1), x = h.x, y = h.y, sz = 4; gF.globalAlpha = a; gF.fillStyle = "#ff4f7b"; gF.beginPath(); gF.moveTo(x, y + sz * 0.3); gF.bezierCurveTo(x, y, x - sz * 0.5, y, x - sz * 0.5, y + sz * 0.32); gF.bezierCurveTo(x - sz * 0.5, y + sz * 0.62, x, y + sz * 0.78, x, y + sz); gF.bezierCurveTo(x, y + sz * 0.78, x + sz * 0.5, y + sz * 0.62, x + sz * 0.5, y + sz * 0.32); gF.bezierCurveTo(x + sz * 0.5, y, x, y, x, y + sz * 0.3); gF.fill(); }
      gF.globalAlpha = 1;
      if (closing) { gF.fillStyle = "#0a041455"; gF.fillRect(0, 0, LW, LH); }
    };

    // ── 한 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) { last = now; now0 = now; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const tt = (now - now0) / 1000;
      pt += dt;
      if (phase === "idle" && pt > 0.4) { if (opts.retry) startGame(); else newCust(true); }
      if (cu) {
        cu.t += dt; if (cu.talk > 0) cu.talk -= dt; if (cu.blink > 0) cu.blink -= dt; else if (rnd() < dt * 0.4) cu.blink = 0.14;
        if (phase === "in") { cu.x = Math.min(0, -40 + pt / 0.85 * 40); if (pt >= 0.85) { cu.x = 0; setPhase("shuf"); } }
        else if (phase === "deal") {
          for (const c of cards) { c.t = clamp((pt - c.d) / 0.26, 0, 1); const e = 1 - Math.pow(1 - c.t, 3); c.x = c.sx + (c.tx - c.sx) * e; c.y = c.sy + (c.ty - c.sy) * e - Math.sin(Math.PI * c.t) * 4; if (c.t > 0 && !c.snd) { c.snd = 1; noise(0.06, 1800, 0.08, 0, 1.2); } }
          if (pt > 0.8) { cards.forEach((c) => { c.x = c.tx; c.y = c.ty; }); setPhase("pick"); }
        } else if (phase === "flip") {
          const c = cards[cu.pickIdx]; const prev = c.flip; c.flip = clamp(pt / 0.42, 0, 1); c.lift = Math.round(Math.sin(Math.PI * c.flip) * 6 + (c.flip >= 1 ? 3 : 0));
          if (prev < 0.5 && c.flip >= 0.5) noise(0.05, 3200, 0.06, 0, 2);
          if (prev < 1 && c.flip >= 1) revealed(c);
          if (pt > 0.95) setPhase("mean");
        } else if (phase === "mean" && !rh()) { const win = 6.5 * ez; limBar.style.transform = `scaleX(${clamp(1 - pt / win, 0, 1)})`; if (pt > win) answer(null, null); }
        else if (phase === "tone" && !rh()) { const win = 5 * ez; limBar.style.transform = `scaleX(${clamp(1 - pt / win, 0, 1)})`; if (pt > win) answer(null, null); }
        else if (phase === "say") { if (pt > 1.5) doReact(); }
        else if (phase === "react") { if (pt > (rh() ? 1.6 : 1.9)) custOut(); }
        else if (phase === "out") {
          cu.x = -pt / 0.9 * 50;
          for (const c of cards) { c.x += (cx - CW / 2 - c.x) * Math.min(1, dt * 7); c.y += (deckY - c.y) * Math.min(1, dt * 7); c.lift = 0; }
          if (bookEl && pt > 0.5) bookEl.classList.add("out");
          if (pt > 1.0) {
            cards.length = 0; dimAll = 0; bubC.classList.remove("on"); bubM.classList.remove("on");
            if (rh()) { cu = null; phase = "wait"; tut = 5; satBar.style.height = "0%"; chipUpd(); setTask(`<em>리허설</em>완벽해요! 본게임에선 <b class="rd">팔짱·한숨</b> 쉬는 손님도 와요.<br>그럴 땐 <b class="bl">솔직하게</b>! 손님 표정이 풀리면 팁과 단골 예약!`, "", `<button class="tr-go" data-go>상담 시작!</button>`); }
            else if (timeUp) { cu = null; closeShop(); }
            else newCust(false);
          }
        }
        // 손가락 안내
        if (!closing) {
          const first = rh() || (hintAll && cuN === 1), idle = pt > 2.2;
          if (phase === "shuf" && (first || idle) && rub < RUB * 0.6) handAt([cx * K, (deckY + 20) * K], "rub");
          else if (phase === "pick" && (first || idle)) { const c = cards[cu.pickIdx]; handAt([(c.x + CW / 2) * K, (c.y + CHH / 2) * K], "tap"); }
          else if ((phase === "mean" || phase === "tone") && rh()) { const b = optsEl.querySelector(`[data-o="${phase === "mean" ? (cu.rv ? "rv" : "up") : cu.feel === "anx" ? "warm" : "frank"}"]`); if (b) handAt(b, "tap"); }
          else if (hand.classList.contains("on")) handAt(null);
        }
      }
      if (bubCT > 0) { bubCT -= dt; if (bubCT <= 0) bubC.classList.remove("on"); }
      if (bubMT > 0) { bubMT -= dt; if (bubMT <= 0) bubM.classList.remove("on"); }
      if (meT > 0) { meT -= dt; if (meT <= 0) setMe("neutral"); }
      rubAct = Math.max(0, rubAct - dt * 2.5);
      for (let i = flyers.length - 1; i >= 0; i--) { flyers[i].t += dt; if (flyers[i].t > 0.32) flyers.splice(i, 1); }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t += dt; s.y -= dt * 6; if (s.t > s.life) sparks.splice(i, 1); }
      for (let i = rays.length - 1; i >= 0; i--) { rays[i].t += dt; if (rays[i].t > 1.2) rays.splice(i, 1); }
      for (const c of cards) if (c.shine >= 0 && c.shine < 1) c.shine += dt * 1.6;
      for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.t += dt; if (c.t >= 0.6 && !c.in) { c.in = 1; jarCoins++; tone(1900 + rnd() * 400, 0.05, "square", 0.05); tone(2600, 0.06, "triangle", 0.05, 0, 0.03); } if (c.t > 0.7) coins.splice(i, 1); }
      for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.d > 0) { h.d -= dt; continue; } h.t += dt; h.y += h.vy * dt; h.x += Math.sin(h.t * 6 + i) * 0.15; if (h.t > 1.4) hearts.splice(i, 1); }
      for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].t += dt * 1.4; if (puffs[i].t > 1) puffs.splice(i, 1); }
      render(tt);
      raf = requestAnimationFrame(loop);
    };

    if (dbg) {
      const correct = () => phase === "mean" ? (cu.rv ? "rv" : "up") : (cu.feel === "anx" ? "warm" : "frank");
      const wrong = () => phase === "mean" ? (cu.rv ? "up" : "rv") : (cu.feel === "anx" ? "frank" : "warm");
      const press = (k) => { const b = optsEl.querySelector(`[data-o="${k}"]`); if (b && !b.disabled) b.click(); };
      const act = (good) => {
        if (!cu || closing) return;
        if (phase === "shuf") { addRub(RUB / 3, rubDir >= 0 ? -10 : 10); }
        else if (phase === "pick") { if (!good && !cu.wrongPick) tapCard((cu.pickIdx + 1) % 3); else tapCard(cu.pickIdx); }
        else if (phase === "mean" || phase === "tone") press(good ? correct() : wrong());
      };
      dbg.tarot1 = {
        st: () => ({ phase, tut, served, tips, book, sat: cu ? Math.round(cu.sat) : null, timeUp, closing, done, art, meanOk, meanN, toneOk, toneN, left: tm ? +tm.left().toFixed(1) : null }),
        tut: () => tut,
        tutDo: () => { if (tut === 5) return startGame(); if (tut >= 1) act(true); },
        start: startGame,
        auto: () => act(true),
        bad: () => act(false),
      };
    }
    scUpd(); setTask("부스를 여는 중…"); chipUpd(); render(0);
    raf = requestAnimationFrame(loop);
  },
};
