// 미니게임 2탄(pr2): 파티룸 "파티는 빈틈없이"(주말 예약 달력)
// 논리 좌표 160x250 을 기기 해상도 벡터 캔버스로 그린다(뒤는 파티룸 배경 그림, 손님·예약자는 캐릭터 그림). 위: 예약 알림 카드 3칸, 아래: 금·토·일 × 2시간 6칸 달력.
// 카드를 끌어 빈 칸에 끼운다. 예약 사이엔 청소 1칸(빗자루)이 꼭 필요. 위로 밀면 거절. 한 요일이 꽉 차면 만실!
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const W = 160, H = 250, CX = 22, CW = 22, NC = 6, RY = [84, 138, 192], RH = 52, TY = 16, CDW = 50, CDH = 54;
const SX = (s) => 3 + s * 52;
const DAYS = ["금", "토", "일"], DAYC = ["#ff8ac8", "#7fd1ff", "#ffd166"];
const TIMES = ["12", "14", "16", "18", "20", "22"];
const BULB = ["#ff5f7a", "#ffd166", "#5fe0a0", "#5fb8ff", "#c77dff"];
const shade = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
// 모임 종류: 이름, 색, 길이(2시간 칸 수), 칸당 값(만원), 사람 유형, 응원봉 (그림은 ICON 벡터)
const EV = [
  { k: "cake", n: "생일파티", s: "생일파티", c: "#ff6fa8", L: [1, 2], p: 5, ty: "teen", up: 0 },
  { k: "bridal", n: "브라이덜 샤워", s: "브라이덜 샤워", c: "#ffa8d8", L: [2], p: 6, ty: "plain", up: 0 },
  { k: "reunion", n: "동창회", s: "동창회", c: "#5fb8ff", L: [2, 3], p: 5, ty: "worker", up: 0 },
  { k: "company", n: "회사 회식", s: "회사 회식", c: "#4fd1a5", L: [2, 3], p: 6, ty: "worker", up: 1 },
  { k: "idol", n: "아이돌 생일카페", s: "아이돌 생카", c: "#c77dff", L: [3], p: 5, ty: "teen", up: 1 },
  { k: "mt", n: "과 MT 뒤풀이", s: "MT 뒤풀이", c: "#ff9f43", L: [3], p: 4, ty: "student", up: 1 },
  { k: "board", n: "보드게임 모임", s: "보드게임", c: "#7fd1ff", L: [1], p: 4, ty: "plain", up: 0 },
  { k: "ring", n: "프러포즈 이벤트", s: "프러포즈", c: "#ff5f7a", L: [1], p: 9, ty: "worker", up: 0 },
];
const GOLD = "#ffd166";

// ── 벡터 그리기 도우미(고해상도 캔버스: 논리 좌표 그대로, 화면 배율은 setTransform) ──
const rr = (q, x, y, w, h, r) => { q.beginPath(); if (q.roundRect) q.roundRect(x, y, w, h, r); else q.rect(x, y, w, h); };
const lgr = (q, x0, y0, x1, y1, st) => { const gr = q.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const rgr = (q, x, y, r0, r1, st, ox = 0, oy = 0) => { const gr = q.createRadialGradient(x + ox, y + oy, r0, x, y, r1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const mixc = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return "#" + [16, 8, 0].map((s) => Math.round(((A >> s) & 255) + (((B >> s) & 255) - ((A >> s) & 255)) * t).toString(16).padStart(2, "0")).join(""); };
const star5 = (q, x, y, r, ri = 0.45) => { q.beginPath(); for (let k = 0; k < 10; k++) { const rad = k % 2 ? r * ri : r, an = -Math.PI / 2 + k * Math.PI / 5; q.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); } q.closePath(); };
const heart = (q, x, y, s) => { q.beginPath(); q.moveTo(x, y + s * 0.9); q.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.7, y - s * 0.9, x, y - s * 0.25); q.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.3, y + s * 0.1, x, y + s * 0.9); q.closePath(); };
// 모임 그림(16x16 상자 안, 벡터)
const ICON = {
  cake: (q) => {
    q.fillStyle = "rgba(0,0,0,.25)"; q.beginPath(); q.ellipse(8, 14.6, 7, 1.2, 0, 0, 6.3); q.fill();
    q.beginPath(); q.ellipse(8, 13.6, 6.6, 1.5, 0, 0, 6.3); q.fillStyle = lgr(q, 0, 12, 0, 15, [[0, "#ffffff"], [1, "#b8b8cc"]]); q.fill();
    rr(q, 2.8, 8.4, 10.4, 5, 1.2); q.fillStyle = lgr(q, 2.8, 0, 13.2, 0, [[0, "#ffd0e0"], [0.4, "#fff2f6"], [1, "#f0a8c4"]]); q.fill();
    q.fillStyle = "#ff6fa8"; q.beginPath(); q.moveTo(2.8, 8.4); for (let x = 2.8; x <= 13.2; x += 2.08) q.quadraticCurveTo(x + 1.04, 11, x + 2.08, 8.4); q.lineTo(13.2, 8); q.lineTo(2.8, 8); q.fill();
    rr(q, 4.8, 5, 6.4, 3.6, 1); q.fillStyle = lgr(q, 4.8, 0, 11.2, 0, [[0, "#ffe6ef"], [0.5, "#ffffff"], [1, "#f4c0d4"]]); q.fill();
    q.fillStyle = "#e0304a"; q.beginPath(); q.arc(8, 4.6, 0.9, 0, 6.3); q.fill();
    for (const [x, c] of [[6.2, "#7fd1ff"], [9.8, "#ffd166"]]) { q.fillStyle = c; q.fillRect(x - 0.4, 1.6, 0.8, 3.4); q.fillStyle = rgr(q, x, 1, 0, 1.3, [[0, "#fff6c0"], [0.5, "#ffb347"], [1, "rgba(255,120,40,0)"]]); q.beginPath(); q.ellipse(x, 0.9, 0.8, 1.3, 0, 0, 6.3); q.fill(); }
  },
  bridal: (q) => {
    q.strokeStyle = "#4a9a5a"; q.lineWidth = 0.7; q.beginPath(); for (const x of [5.6, 7, 8.4, 9.8]) { q.moveTo(x, 8); q.lineTo(7.6 + (x - 7.6) * 0.3, 14.6); } q.stroke();
    for (const [x, y, r, c] of [[4.2, 5.4, 2, "#ffffff"], [8, 3.6, 2.3, "#ffb3d9"], [11.6, 5.6, 2, "#ffffff"], [6.4, 7.4, 2, "#ff8ac8"], [10, 7.6, 1.9, "#ffd0ea"], [8, 6.2, 1.6, "#fff0f8"]]) { q.fillStyle = rgr(q, x, y, 0.2, r, [[0, "#ffffff"], [0.6, c], [1, mixc(c, "#c86a9a", 0.35)]], -0.4, -0.5); q.beginPath(); q.arc(x, y, r, 0, 6.3); q.fill(); q.fillStyle = "#ffd166"; q.beginPath(); q.arc(x, y, 0.45, 0, 6.3); q.fill(); }
    q.fillStyle = "#ff6fa8"; q.beginPath(); q.moveTo(7.6, 10.6); q.quadraticCurveTo(4.4, 9.4, 4.6, 12.2); q.quadraticCurveTo(6.4, 12.4, 7.6, 10.6); q.quadraticCurveTo(10.8, 9.4, 10.6, 12.2); q.quadraticCurveTo(8.8, 12.4, 7.6, 10.6); q.fill(); q.beginPath(); q.arc(7.6, 10.8, 0.8, 0, 6.3); q.fill();
  },
  reunion: (q) => {
    rr(q, 1.6, 11, 10, 3.4, 1.6); q.fillStyle = lgr(q, 0, 11, 0, 14.4, [[0, "#ffffff"], [1, "#e4dcc4"]]); q.fill(); q.fillStyle = "#e05a5a"; q.fillRect(8.6, 11, 1, 3.4);
    q.beginPath(); q.moveTo(8, 1.6); q.lineTo(15, 4.8); q.lineTo(8, 8); q.lineTo(1, 4.8); q.closePath(); q.fillStyle = lgr(q, 0, 1.6, 0, 8, [[0, "#4a4a6a"], [1, "#1e1e30"]]); q.fill();
    q.beginPath(); q.moveTo(4, 6.2); q.lineTo(4, 9); q.quadraticCurveTo(8, 11, 12, 9); q.lineTo(12, 6.2); q.lineTo(8, 8); q.closePath(); q.fillStyle = "#2a2a40"; q.fill();
    q.strokeStyle = "#ffd166"; q.lineWidth = 0.6; q.beginPath(); q.moveTo(8, 4.8); q.lineTo(13, 6); q.lineTo(13, 10.4); q.stroke(); q.fillStyle = "#ffd166"; q.beginPath(); q.ellipse(13, 11, 0.9, 1.3, 0, 0, 6.3); q.fill();
  },
  company: (q) => {
    rr(q, 3, 4.6, 8.4, 10.4, 1.2); q.fillStyle = lgr(q, 3, 0, 11.4, 0, [[0, "#e8a020"], [0.35, "#ffd870"], [1, "#c88a10"]]); q.fill();
    q.strokeStyle = "rgba(255,255,255,.6)"; q.lineWidth = 0.5; q.beginPath(); q.moveTo(4.4, 6); q.lineTo(4.4, 13.6); q.stroke();
    q.strokeStyle = "#e8e8f0"; q.lineWidth = 1.2; q.beginPath(); q.moveTo(11.4, 7); q.quadraticCurveTo(14.6, 7, 14.4, 9.6); q.quadraticCurveTo(14.4, 12, 11.4, 12); q.stroke();
    q.fillStyle = "#fffaf0"; for (const [x, y, r] of [[4, 4.2, 1.8], [6.6, 3.2, 2.1], [9.4, 3.8, 1.9], [10.8, 4.8, 1.3]]) { q.beginPath(); q.arc(x, y, r, 0, 6.3); q.fill(); }
    q.fillStyle = "#fff3c0"; for (const [x, y] of [[6, 9], [8.4, 11.6], [7, 7.4]]) { q.beginPath(); q.arc(x, y, 0.45, 0, 6.3); q.fill(); }
  },
  idol: (q) => {
    q.save(); q.shadowColor = "#ff6fd8"; q.shadowBlur = 3; heart(q, 8, 4.6, 3.6); q.fillStyle = lgr(q, 0, 1, 0, 8, [[0, "#ffb3f0"], [1, "#ff4fc8"]]); q.fill(); q.restore();
    q.fillStyle = "rgba(255,255,255,.75)"; q.beginPath(); q.ellipse(6.4, 3.6, 0.9, 0.6, -0.5, 0, 6.3); q.fill();
    rr(q, 7.1, 8.2, 1.8, 6.6, 0.8); q.fillStyle = lgr(q, 7, 0, 9, 0, [[0, "#ffffff"], [1, "#9a9ab4"]]); q.fill();
    for (const [x, y] of [[2, 3], [14, 2.4], [13.4, 9.6], [2.6, 10.6]]) { q.fillStyle = "#fff3a0"; star5(q, x, y, 1.1); q.fill(); }
  },
  mt: (q) => {
    q.strokeStyle = "#7a5030"; q.lineWidth = 1.2; q.lineCap = "round"; q.beginPath(); q.moveTo(9, 7); q.lineTo(14.4, 1.6); q.stroke();
    q.fillStyle = "#fffaf0"; q.beginPath(); q.arc(14.6, 1.2, 0.9, 0, 6.3); q.arc(15.4, 2, 0.8, 0, 6.3); q.fill();
    q.beginPath(); q.ellipse(6, 10.6, 5, 4.2, -0.5, 0, 6.3); q.fillStyle = rgr(q, 6, 10.6, 0.5, 5.4, [[0, "#f4b060"], [0.6, "#d0782a"], [1, "#7a3a10"]], -1.4, -1.6); q.fill();
    q.strokeStyle = "rgba(60,20,4,.6)"; q.lineWidth = 0.6; for (let k = 0; k < 3; k++) { q.beginPath(); q.moveTo(3 + k * 2.2, 8.4 + k * 0.4); q.lineTo(5.6 + k * 2.2, 12.2 + k * 0.2); q.stroke(); }
    q.fillStyle = "rgba(255,255,255,.5)"; q.beginPath(); q.ellipse(4.4, 8.6, 1.4, 0.6, -0.6, 0, 6.3); q.fill();
  },
  board: (q) => {
    const die = (x, y, w, rot, bg, dot, pips) => { q.save(); q.translate(x, y); q.rotate(rot); rr(q, -w / 2, -w / 2, w, w, 1.4); q.fillStyle = lgr(q, 0, -w / 2, 0, w / 2, [[0, mixc(bg, "#ffffff", 0.4)], [1, bg]]); q.fill(); q.strokeStyle = "rgba(0,0,0,.25)"; q.lineWidth = 0.3; q.stroke(); q.fillStyle = dot; for (const [a, b] of pips) { q.beginPath(); q.arc(a * w * 0.28, b * w * 0.28, w * 0.09, 0, 6.3); q.fill(); } q.restore(); };
    die(5.4, 10.4, 7.4, -0.15, "#f6f6fa", "#222", [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]);
    die(11, 5.2, 6.6, 0.3, "#ff5f7a", "#ffffff", [[-1, -1], [0, 0], [1, 1]]);
  },
  ring: (q) => {
    q.strokeStyle = lgr(q, 3, 8, 13, 15, [[0, "#fff0b0"], [0.5, "#e0a020"], [1, "#ffd166"]]); q.lineWidth = 1.6; q.beginPath(); q.ellipse(8, 11, 4.6, 3.6, 0, 0, 6.3); q.stroke();
    q.beginPath(); q.moveTo(5.6, 5.4); q.lineTo(10.4, 5.4); q.lineTo(11.6, 3.6); q.lineTo(8, 1.2); q.lineTo(4.4, 3.6); q.closePath(); q.fillStyle = lgr(q, 4, 1, 12, 6, [[0, "#e8fcff"], [0.5, "#7fe8ff"], [1, "#3ab0d8"]]); q.fill();
    q.beginPath(); q.moveTo(5.6, 5.4); q.lineTo(8, 8); q.lineTo(10.4, 5.4); q.closePath(); q.fillStyle = "#4ac0e8"; q.fill(); q.fillStyle = "#ffffff"; q.beginPath(); q.moveTo(6, 3.4); q.lineTo(7.4, 2.4); q.lineTo(7, 4.2); q.fill();
    for (const [x, y] of [[2, 2.6], [14, 4], [13, 1]]) { q.fillStyle = "#fff3a0"; star5(q, x, y, 0.9); q.fill(); }
  },
};
const drawIcon = (q, k, x, y, s = 1) => { q.save(); q.translate(x, y); q.scale(s, s); (ICON[k] || ICON.cake)(q); q.restore(); };
// 빗자루(청소 칸, 10x13)
const drawBroomV = (q, x, y) => {
  q.save(); q.translate(x, y);
  q.strokeStyle = lgr(q, 0, 0, 0, 8, [[0, "#c8905a"], [1, "#7a4a1e"]]); q.lineWidth = 1; q.lineCap = "round"; q.beginPath(); q.moveTo(8.6, 0.2); q.lineTo(4.6, 7.6); q.stroke();
  rr(q, 2.6, 7, 4.6, 1.4, 0.4); q.fillStyle = "#cc3333"; q.fill();
  q.beginPath(); q.moveTo(2.4, 8.2); q.lineTo(7.4, 8.2); q.lineTo(9.2, 12.6); q.lineTo(0.6, 12.6); q.closePath(); q.fillStyle = lgr(q, 0, 8, 0, 12.6, [[0, "#f8e090"], [1, "#c9a040"]]); q.fill();
  q.strokeStyle = "rgba(140,100,30,.6)"; q.lineWidth = 0.3; q.beginPath(); for (let k = 0; k < 6; k++) { q.moveTo(3 + k * 0.9, 8.6); q.lineTo(1.4 + k * 1.5, 12.4); } q.stroke();
  q.restore();
};
// 알림 종(5x5)
const drawBell = (q, x, y, s = 1) => { q.save(); q.translate(x, y); q.scale(s, s); q.beginPath(); q.moveTo(0.4, 4); q.quadraticCurveTo(0.6, 0.4, 2.5, 0.4); q.quadraticCurveTo(4.4, 0.4, 4.6, 4); q.closePath(); q.fillStyle = lgr(q, 0, 0, 0, 4, [[0, "#fff3c0"], [1, "#e0b040"]]); q.fill(); q.fillStyle = "#fff3c0"; q.beginPath(); q.arc(2.5, 4.6, 0.6, 0, 6.3); q.fill(); q.restore(); };

// 방법 화면 그림 3칸(벡터, 캔버스 2배로 그려 이미지로)
function steps() {
  const img = (fn) => { const c = document.createElement("canvas"); c.width = 160; c.height = 136; const q = c.getContext("2d"); q.scale(2, 2);
    rr(q, 0, 0, 80, 68, 11); q.fillStyle = lgr(q, 0, 0, 0, 68, [[0, "#2a1848"], [1, "#140a26"]]); q.fill(); fn(q); return `<img src="${c.toDataURL()}" alt="">`; };
  const cell = (q, x, y, w, h) => { rr(q, x, y, w, h, 2); q.fillStyle = "rgba(60,40,100,.55)"; q.fill(); q.strokeStyle = "rgba(160,130,220,.35)"; q.lineWidth = 0.5; q.stroke(); };
  const blk = (q, x, y, w, h, c, k) => { rr(q, x, y, w, h, 2.4); q.fillStyle = lgr(q, 0, y, 0, y + h, [[0, mixc(c, "#ffffff", 0.15)], [1, mixc(c, "#1a0a30", 0.55)]]); q.fill(); q.strokeStyle = c; q.lineWidth = 0.8; q.stroke(); drawIcon(q, k, x + w / 2 - 6, y + h / 2 - 6, 0.75); };
  const hand = (q, x, y, rot = 0) => { q.save(); q.translate(x, y); q.rotate(rot); q.scale(0.9, 0.9); q.fillStyle = "#fff"; q.strokeStyle = "#2a1e2e"; q.lineWidth = 1.2; q.lineJoin = "round"; q.fill(new Path2D(HANDP)); q.stroke(new Path2D(HANDP)); q.restore(); };
  const a = img((q) => {
    rr(q, 8, 6, 34, 40, 4); q.fillStyle = "#2b1b48"; q.fill(); q.strokeStyle = "#ff6fa8"; q.lineWidth = 1; q.stroke(); rr(q, 8, 6, 34, 7, [4, 4, 0, 0]); q.fillStyle = "#7a2a52"; q.fill(); drawBell(q, 10, 7.2, 1);
    rr(q, 11, 16, 14, 14, 3); q.fillStyle = "#3a2058"; q.fill(); drawIcon(q, "cake", 11, 16, 0.88);
    q.fillStyle = "#ffffff"; q.font = "900 7px sans-serif"; q.fillText("9만", 27, 26); rr(q, 13, 36, 10, 5, 1.4); q.fillStyle = "#ff6fa8"; q.fill(); rr(q, 25, 36, 10, 5, 1.4); q.fill();
    q.strokeStyle = "#ffe066"; q.lineWidth = 1.6; q.setLineDash([2.6, 2]); q.lineCap = "round"; q.beginPath(); q.moveTo(36, 46); q.quadraticCurveTo(50, 60, 66, 54); q.stroke(); q.setLineDash([]);
    cell(q, 54, 46, 22, 16); hand(q, 30, 34);
  });
  const b = img((q) => {
    for (let i = 0; i < 4; i++) cell(q, 3 + i * 18.5, 18, 17, 34);
    blk(q, 3, 18, 17, 34, "#4fd1a5", "company");
    rr(q, 21.5, 18, 17, 34, 2); q.fillStyle = "rgba(80,70,120,.7)"; q.fill(); drawBroomV(q, 25, 28);
    rr(q, 40, 18, 35.5, 34, 2.4); q.fillStyle = "rgba(255,61,110,.4)"; q.fill(); q.strokeStyle = "#ff6f8f"; q.lineWidth = 1; q.stroke();
    q.strokeStyle = "#ffffff"; q.lineWidth = 2.2; q.lineCap = "round"; q.beginPath(); q.moveTo(51, 28); q.lineTo(64, 42); q.moveTo(64, 28); q.lineTo(51, 42); q.stroke();
    q.fillStyle = "#cfe8ff"; star5(q, 34, 22, 2.2, 0.3); q.fill();
  });
  const c = img((q) => {
    for (let i = 0; i < 4; i++) cell(q, 3 + i * 18.5, 22, 17, 30);
    blk(q, 3, 22, 35.5, 30, "#ffd166", "idol"); rr(q, 40, 22, 17, 30, 2); q.fillStyle = "rgba(80,70,120,.7)"; q.fill(); drawBroomV(q, 43.5, 30); blk(q, 58.5, 22, 17, 30, "#ff5f7a", "ring");
    q.save(); q.shadowColor = "#ff4fd8"; q.shadowBlur = 5; q.fillStyle = "#ffffff"; q.font = "900 12px sans-serif"; q.textAlign = "center"; q.fillText("만실!", 40, 16); q.restore();
    for (const [x, y, col] of [[10, 8, "#ff8ac8"], [70, 6, "#7fd1ff"], [64, 15, "#5fe0a0"]]) { q.fillStyle = col; star5(q, x, y, 2.4, 0.35); q.fill(); }
  });
  return [[a, "알림을 끌어 넣기"], [b, "사이엔 청소 1칸"], [c, "꽉 차면 만실!"]];
}
const HANDP = "M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z";
// 사람 유형별 캐릭터 그림(손님·예약자)
const PPL = {
  teen: ["c002", "c009", "c022", "c034", "c047", "c050", "c053", "c069", "c079", "c084"],
  worker: ["c019", "c033", "c036", "c045", "c004", "c061", "c062", "c077", "c078", "c083"],
  student: ["c010", "c021", "c051", "c052", "c054", "c064", "c057", "c072"],
  plain: ["c001", "c008", "c012", "c011", "c024", "c038", "c055", "c073", "c074"],
};

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
.mg-pr2 .mg-pr2w canvas{width:100%;height:100%;display:block;image-rendering:auto;touch-action:none;cursor:grab;border-radius:6px}
.mg-pr2 .mg-steps img{width:80px;height:68px;border-radius:11px;box-shadow:0 3px 10px #0006}
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
    const T = 30;
    const F = frame(host, "pr2", "파티는 빈틈없이", "mg-pr2st", "", "");
    F.stage.insertAdjacentHTML("beforeend", `<div class="mg-pr2w"><canvas width="${W}" height="${H}"></canvas><div class="mg-pr2l"><div class="mg-pr2rej">↑ 놓으면 거절</div><div class="mg-pr2tot"><small>이번 주 매출</small><b>0원</b><em></em></div></div></div>`);
    const wrap = F.stage.querySelector(".mg-pr2w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), lay = wrap.querySelector(".mg-pr2l"), rejEl = lay.querySelector(".mg-pr2rej"), totEl = lay.querySelector(".mg-pr2tot");
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    let KS = 2 * DPR, BGC = null, BGK = 0, BGI = false;
    const setRes = (K) => { const ks = K * DPR; if (ks === KS && cv.width === Math.round(W * ks)) return; KS = ks; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); g.setTransform(KS, 0, 0, KS, 0, 0); };
    cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); g.setTransform(KS, 0, 0, KS, 0, 0);
    const fit = () => { const sw = F.stage.clientWidth, sh = F.stage.clientHeight; if (!sw || !sh) return; const r = Math.min(sw / W, sh / H), K = r >= 2 ? Math.floor(r) : Math.max(1, r); wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px"; wrap.style.setProperty("--k", K); setRes(K); };
    fit(); requestAnimationFrame(fit);
    // 그림 불러오기: 파티룸 배경, 손님 캐릭터(표정 칸 e: 0 무표정 1 웃음 2 슬픔 3 화남 4 수줍음 5 놀람)
    const ART = {};
    const artOf = (k) => { if (!ART[k]) { const r = { ok: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.src = "img/body/" + k + ".webp"; ART[k] = r; } return ART[k]; };
    const PARTY = { ok: false, im: new Image() }; PARTY.im.onload = () => (PARTY.ok = true); PARTY.im.src = "img/bg/partyroom.webp";
    Object.values(PPL).forEach((l) => l.slice(0, 5).forEach(artOf));
    // 정적 배경: 파티룸 사진(어둡게) + 유리 알림판 + 달력 칸
    const bgBuild = () => {
      const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(H * KS); const q = c.getContext("2d"); q.setTransform(KS, 0, 0, KS, 0, 0);
      q.fillStyle = "#170d2a"; q.fillRect(0, 0, W, H);
      if (PARTY.ok) { const im = PARTY.im, iw = im.naturalWidth, ih = im.naturalHeight, sw2 = ih * W / H; q.filter = "blur(1px) brightness(.72) saturate(1.25)"; q.drawImage(im, (iw - sw2) * 0.5, 0, sw2, ih, -2, -2, W + 4, H + 4); q.filter = "none"; }
      q.fillStyle = lgr(q, 0, 0, 0, H, [[0, "rgba(20,8,44,.45)"], [0.3, "rgba(30,12,60,.22)"], [1, "rgba(14,6,30,.6)"]]); q.fillRect(0, 0, W, H);
      q.fillStyle = lgr(q, 0, 0, 0, 13, [[0, "rgba(8,4,18,.9)"], [1, "rgba(16,8,34,.7)"]]); q.fillRect(0, 0, W, 13);
      // 알림판(유리)
      rr(q, 1.5, 14.5, W - 3, 57, 4); q.fillStyle = "rgba(30,16,60,.45)"; q.fill(); q.strokeStyle = "rgba(170,130,240,.45)"; q.lineWidth = 0.6; q.stroke();
      for (let sI = 0; sI < 3; sI++) { const x = SX(sI); rr(q, x + 0.5, TY + 0.5, CDW - 1, CDH - 1, 4); q.setLineDash([2, 2]); q.strokeStyle = "rgba(140,110,200,.5)"; q.lineWidth = 0.5; q.stroke(); q.setLineDash([]); q.globalAlpha = 0.3; drawBell(q, x + CDW / 2 - 4, TY + CDH / 2 - 5, 1.6); q.globalAlpha = 1; }
      // 시간 머리줄
      rr(q, CX - 1, 74, NC * CW + 1, 9, 2); q.fillStyle = "rgba(12,6,28,.8)"; q.fill();
      q.font = "800 6.2px sans-serif"; q.textAlign = "center"; q.textBaseline = "middle";
      for (let i = 0; i < NC; i++) { q.fillStyle = "#c8b4f0"; q.fillText(TIMES[i] + "시", CX + i * CW + CW / 2 - 0.5, 78.8); if (i) { q.fillStyle = "rgba(120,90,180,.4)"; q.fillRect(CX + i * CW - 0.8, 75.5, 0.4, 6); } }
      // 요일 줄(유리 칸)
      RY.forEach((y, d) => {
        rr(q, 0.5, y - 1.5, W - 1, RH + 3, 3); q.fillStyle = "rgba(10,4,24,.55)"; q.fill();
        rr(q, 1, y, 19, RH, 3); q.fillStyle = lgr(q, 0, y, 0, y + RH, [[0, shade(DAYC[d], 0.32)], [1, shade(DAYC[d], 0.12)]]); q.fill(); q.strokeStyle = shade(DAYC[d], 0.6); q.lineWidth = 0.5; q.stroke();
        for (let i = 0; i < NC; i++) { const x = CX + i * CW; rr(q, x, y, CW - 1, RH, 2.4); q.fillStyle = lgr(q, 0, y, 0, y + RH, [[0, "rgba(60,40,110,.5)"], [1, "rgba(30,18,60,.62)"]]); q.fill(); q.strokeStyle = "rgba(150,120,220,.28)"; q.lineWidth = 0.4; q.stroke(); }
      });
      return c;
    };
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
      r.nm = (gold ? "단체 " : "") + ev.s; r.ck = pick(PPL[ev.ty] || PPL.plain); artOf(r.ck);
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
      { const pool = shuffle((PPL[r.ev.ty] || PPL.plain).filter((k) => k !== r.ck)), n = r.L; b.ppl.push({ ck: r.ck, ph: rnd() * 4, up: r.ev.up && rnd() < 0.7 }); for (let k = 1; k < n; k++) { artOf(pool[k - 1]); b.ppl.push({ ck: pool[k - 1], ph: rnd() * 4, up: r.ev.up && rnd() < 0.7 }); } }
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

    // 그리기(벡터 + 캐릭터 그림)
    const star = (x, y, p, col = "#fff3a0") => { const k = 1 + (p < 0.5 ? p : 1 - p) * 6; g.fillStyle = col; star5(g, x, y, k, 0.28); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, 0.5, 0, 6.3); g.fill(); };
    // 사람(캐릭터 그림 위쪽 240x312)을 칸 안에 그린다. e 표정 칸
    const person = (ck, e, cx, bot, ph) => {
      const a = artOf(ck); if (!a.ok) return;
      const pw = ph * 240 / 312, c = e % 3, r = e >= 3 ? 1 : 0;
      g.drawImage(a.im, c * 240, r * 540, 240, 312, cx - pw / 2, bot - ph, pw, ph);
    };
    const drawBlock = (x, y, w, h, r, lift, alpha = 1) => {
      const c = r.gold ? GOLD : r.ev.c;
      g.globalAlpha = alpha;
      if (lift) { g.fillStyle = "rgba(5,0,12,.45)"; rr(g, x + 2, y + lift + 3, w, h, 3); g.fill(); }
      rr(g, x, y, w, h, 3); g.fillStyle = lgr(g, 0, y, 0, y + h, [[0, shade(c, r.gold ? 0.62 : 0.5)], [1, shade(c, r.gold ? 0.3 : 0.22)]]); g.fill();
      rr(g, x, y, w, 10, [3, 3, 0, 0]); g.fillStyle = lgr(g, 0, y, 0, y + 10, [[0, mixc(c, "#ffffff", 0.3)], [1, c]]); g.fill();
      g.strokeStyle = mixc(c, "#ffffff", 0.35); g.lineWidth = 0.6; rr(g, x + 0.3, y + 0.3, w - 0.6, h - 0.6, 3); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 0.4; g.setLineDash([1, 1.4]); g.beginPath(); for (let k = 1; k < r.L; k++) { g.moveTo(x + k * CW - 1, y + 11); g.lineTo(x + k * CW - 1, y + h - 2); } g.stroke(); g.setLineDash([]);
      if (r.gold) { const sh = ((tt * 40) % (w + h + 20)) - h; g.save(); rr(g, x, y, w, h, 3); g.clip(); g.fillStyle = "rgba(255,248,200,.4)"; g.beginPath(); g.moveTo(x + sh, y + h); g.lineTo(x + sh + 5, y + h); g.lineTo(x + sh + 5 + h, y); g.lineTo(x + sh + h, y); g.fill(); g.restore(); }
      drawIcon(g, r.ev.k, x + 1.6, y + 1, 0.52);
      g.globalAlpha = 1;
    };
    // 예약 알림 카드: 예약하는 손님 얼굴(시간이 줄면 표정이 굳는다) + 모임 그림
    const drawCard = (r, x, y, a = 1) => {
      const c = r.gold ? GOLD : r.ev.c, f = clamp(1 - (tt - r.t0) / r.life, 0, 1);
      let sx = 0; if (r.st === "in" && f < 0.22 && !over) sx = Math.sin(tt * 40) * 0.8;
      x += sx;
      g.globalAlpha = a;
      g.fillStyle = "rgba(0,0,0,.35)"; rr(g, x + 1, y + 1.4, CDW, CDH, 4); g.fill();
      rr(g, x, y, CDW, CDH, 4); g.fillStyle = lgr(g, 0, y, 0, y + CDH, [[0, "#33215a"], [1, "#1e1238"]]); g.fill();
      rr(g, x, y, CDW, 9, [4, 4, 0, 0]); g.fillStyle = lgr(g, 0, y, 0, y + 9, [[0, mixc(c, "#ffffff", 0.15)], [1, shade(c, 0.5)]]); g.fill();
      rr(g, x + 0.3, y + 0.3, CDW - 0.6, CDH - 0.6, 4); g.strokeStyle = c; g.lineWidth = 0.7; g.stroke();
      drawBell(g, x + 2.4, y + 2, 1);
      // 손님 얼굴
      const e = r.st === "rej" ? 2 : r.st === "exp" ? 3 : r.st === "drag" ? 1 : f > 0.5 ? 1 : f > 0.22 ? 0 : 3;
      const fx0 = x + 2, fy0 = y + 10.5, fs = 19.5, ar = artOf(r.ck);
      g.save(); rr(g, fx0, fy0, fs, fs, 3); g.fillStyle = lgr(g, 0, fy0, 0, fy0 + fs, [[0, mixc(c, "#ffffff", 0.6)], [1, shade(c, 0.6)]]); g.fill(); g.clip();
      if (ar.ok) { const cc = e % 3, rw = e >= 3 ? 1 : 0; g.drawImage(ar.im, cc * 240 + 50, rw * 540 + 6, 140, 140, fx0, fy0, fs, fs); } else drawIcon(g, r.ev.k, fx0 + 2, fy0 + 2, 1);
      g.restore(); rr(g, fx0, fy0, fs, fs, 3); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 0.5; g.stroke();
      g.beginPath(); g.arc(fx0 + fs - 1.5, fy0 + fs - 3.6, 4.4, 0, 6.3); g.fillStyle = "#1e1238"; g.fill(); g.strokeStyle = c; g.lineWidth = 0.6; g.stroke();
      drawIcon(g, r.ev.k, fx0 + fs - 5.5, fy0 + fs - 7.6, 0.5);
      // 몇 칸(2시간) 알약
      const tw = r.L * 11 - 1, bx = x + (CDW - tw) / 2;
      for (let k = 0; k < r.L; k++) { rr(g, bx + k * 11, y + 40, 10, 6.4, 2); g.fillStyle = lgr(g, 0, y + 40, 0, y + 46.4, [[0, mixc(c, "#ffffff", 0.35)], [1, c]]); g.fill(); }
      const bc = f > 0.5 ? "#5fe0a0" : f > 0.22 ? "#ffd166" : "#ff5f7a";
      rr(g, x + 3, y + 49.6, CDW - 6, 2.2, 1.1); g.fillStyle = "#120a20"; g.fill(); if (f > 0) { rr(g, x + 3, y + 49.6, (CDW - 6) * f, 2.2, 1.1); g.fillStyle = bc; g.fill(); }
      if (r.gold) { const ph = (tt * 1.6) % 2; if (ph < 1) { g.fillStyle = "rgba(255,255,255,.9)"; star5(g, x + ph * CDW, y + 0.5, 1.6, 0.3); g.fill(); } g.save(); g.shadowColor = GOLD; g.shadowBlur = 4 + 2 * Math.sin(tt * 8); rr(g, x, y, CDW, CDH, 4); g.strokeStyle = GOLD; g.lineWidth = 0.9; g.stroke(); g.restore(); }
      if (a === 1 && tt - r.t0 < 0.5) { const p = (tt - r.t0) / 0.5; g.globalAlpha = 0.6 * (1 - p); rr(g, x, y, CDW, CDH, 4); g.fillStyle = "#ffffff"; g.fill(); }
      g.globalAlpha = 1;
    };
    const drawBook = (b) => {
      const r = b.r, w = b.L * CW - 2, h = RH - 4;
      let x = CX + b.s * CW, y = RY[b.d] + 2;
      const p = clamp((tt - b.t0) / 0.12, 0, 1);
      if (p < 1) { const e = 1 - Math.pow(1 - p, 2); x = b.fx + (x - b.fx) * e; y = b.fy + (y - b.fy) * e; }
      const sq = tt - b.t0 - 0.12; let yo = 0; if (sq > 0 && sq < 0.2) yo = Math.sin((sq / 0.2) * Math.PI) * 2;
      y += yo;
      drawBlock(x, y, w, h, r, 0);
      // 꽃가루·조명
      g.save(); rr(g, x, y, w, h, 3); g.clip();
      for (const [u, v, c] of b.cf) { g.fillStyle = c; g.beginPath(); g.arc(x + 3 + u * (w - 6), y + 12 + v * 12, 0.55, 0, 6.3); g.fill(); }
      // 손님들(캐릭터 그림): 들어올 때 놀람·웃음, 춤추며 웃음↔수줍음, 끝나면 모두 웃음
      const n = b.ppl.length, ph = Math.min(30, h - 11), sp = n > 1 ? (w - 4 - ph * 0.77) / (n - 1) : 0;
      b.ppl.forEach((q, k) => {
        const age = tt - b.t0, dance = Math.sin(tt * 6 + q.ph), up = q.up && Math.sin(tt * 3 + q.ph) > 0;
        const e = endT >= 0 ? 1 : age < 0.7 ? (r.gold ? 5 : 1) : Math.floor(tt * 0.8 + q.ph) % 3 === 2 ? 4 : 1;
        const cx = n > 1 ? x + 2 + ph * 0.385 + k * sp : x + w / 2;
        person(q.ck, e, cx, y + h + 3 - Math.abs(dance) * 1.2 - (up ? 1 : 0) - (endT >= 0 ? Math.abs(Math.sin(tt * 9 + k)) * 1.5 : 0), ph);
        if (up) { g.save(); g.translate(cx + ph * 0.3, y + h - ph * 0.55); g.rotate(0.3 * dance); rr(g, -0.5, -7, 1, 7, 0.5); g.fillStyle = "#e8e8f0"; g.fill(); g.shadowColor = r.ev.c; g.shadowBlur = 4; g.beginPath(); g.arc(0, -7.4, 1.6, 0, 6.3); g.fillStyle = mixc(r.ev.c, "#ffffff", 0.4); g.fill(); g.restore(); }
      });
      g.fillStyle = lgr(g, 0, y + h - 8, 0, y + h, [[0, "rgba(20,8,40,0)"], [1, "rgba(20,8,40,.55)"]]); g.fillRect(x, y + h - 8, w, 8);
      g.restore();
      if (tt >= b.fl && tt - b.fl < 0.35) { g.globalAlpha = 0.7 * (1 - (tt - b.fl) / 0.35); rr(g, x, y, w, h, 3); g.fillStyle = "#ffffff"; g.fill(); g.globalAlpha = 1; }
      if (tt - b.t0 < 0.3) { g.globalAlpha = 0.8 * (1 - (tt - b.t0) / 0.3); rr(g, x, y, w, h, 3); g.fillStyle = "#ffffff"; g.fill(); g.globalAlpha = 1; }
    };
    const drawBroom = (d, c, warn) => {
      const x = CX + c * CW, y = RY[d] + 2, w = CW - 2, h = RH - 4, a = tt - brT[d][c];
      if (a < 0) return;
      const p = clamp(a / 0.25, 0, 1);
      rr(g, x, y, w, h, 3); g.fillStyle = warn ? "rgba(120,20,50,.85)" : "rgba(52,44,84,.88)"; g.fill();
      g.save(); g.clip(); g.strokeStyle = warn ? "rgba(255,95,122,.7)" : "rgba(120,110,170,.35)"; g.lineWidth = 0.5; g.beginPath(); for (let k = -h; k < w; k += 4) { g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); } g.stroke(); g.restore();
      rr(g, x, y, w, h, 3); g.strokeStyle = warn ? "#ff5f7a" : "rgba(150,140,200,.5)"; g.lineWidth = 0.6; g.stroke();
      const sw = Math.sin(tt * 3 + c + d) * 2;
      g.globalAlpha = p; drawBroomV(g, x + 5.5 + sw, y + 16 - (1 - p) * 8); g.globalAlpha = 1;
      g.fillStyle = "rgba(220,230,255,.75)"; g.font = "800 5.6px sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText("청소", x + w / 2, y + h - 4);
      const ph2 = (tt * 0.7 + c * 0.37 + d * 0.21) % 1.6; if (ph2 < 0.4) star(x + 16, y + 10, ph2 / 0.4, "#cfe8ff");
    };
    const render = () => {
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      if (!BGC || BGK !== KS || (!BGI && PARTY.ok)) { BGC = bgBuild(); BGK = KS; BGI = PARTY.ok; }
      g.drawImage(BGC, 0, 0, W, H);
      // 간판: 줄전구 + 미러볼 + 네온 띠
      const hue = Math.round(tt * 50) % 360; g.fillStyle = `hsl(${hue},95%,70%)`; g.fillRect(0, 12.4, W, 0.8); g.fillStyle = `hsla(${hue},95%,60%,.2)`; g.fillRect(0, 13, W, 2);
      g.strokeStyle = "#3a2a4c"; g.lineWidth = 0.5; g.beginPath(); for (let x = 0; x <= W; x += 2) { const y = 4 + 2 * Math.sin((x / W) * Math.PI * 2); if (x === 0) g.moveTo(x, y); else if (x > 71 && x < 89) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
      for (let i = 0, x = 4; x < W; x += 9, i++) { if (x > 70 && x < 90) continue; const y = 5 + 2 * Math.sin((x / W) * Math.PI * 2), c = BULB[i % 5], lit = (Math.floor(tt * 3) + i) % 3 !== 0 || endT >= 0;
        if (lit) { g.fillStyle = rgr(g, x, y, 0, 4, [[0, c + "aa"], [1, c + "00"]]); g.fillRect(x - 4, y - 4, 8, 8); }
        g.beginPath(); g.ellipse(x, y + 0.4, 1.1, 1.4, 0, 0, 6.3); g.fillStyle = lit ? mixc(c, "#ffffff", 0.35) : shade(c, 0.4); g.fill(); }
      g.strokeStyle = "#5a5a68"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(80, 0); g.lineTo(80, 2.4); g.stroke();
      { const mx = 80, my = 6.4, mr = 3.8; g.save(); g.beginPath(); g.arc(mx, my, mr, 0, 6.3); g.fillStyle = rgr(g, mx, my, 0.3, mr, [[0, "#ffffff"], [0.5, "#b8b8cc"], [1, "#5a5a70"]], -1.2, -1.2); g.fill(); g.clip();
        g.strokeStyle = "rgba(40,40,60,.5)"; g.lineWidth = 0.25; g.beginPath(); for (let k = -4; k <= 4; k += 1.3) { g.moveTo(mx - 4, my + k); g.lineTo(mx + 4, my + k); g.moveTo(mx + k + ((tt * 2) % 1.3), my - 4); g.lineTo(mx + k + ((tt * 2) % 1.3), my + 4); } g.stroke(); g.restore();
        if (Math.floor(tt * 8) % 3 === 0) { g.fillStyle = "#ffffff"; star5(g, mx - 1.4, my - 1.2, 1.4, 0.25); g.fill(); } }
      // 요일 네온 글자
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 12px sans-serif";
      RY.forEach((y, d) => {
        const on = !(Math.sin(tt * 6.1 + d * 2) > 0.94 && Math.sin(tt * 1.7 + d) > 0.3) || full[d] >= 0;
        const c = DAYC[d];
        g.save(); if (on) { g.shadowColor = c; g.shadowBlur = 6; } g.fillStyle = on ? mixc(c, "#ffffff", 0.3) : shade(c, 0.45); g.fillText(DAYS[d], 10.5, y + RH / 2); g.restore();
        if (full[d] >= 0) { const k = Math.floor(tt * 4) % 2; g.strokeStyle = k ? c : "#ffffff"; g.lineWidth = 0.8; rr(g, CX - 1, y - 1.6, NC * CW + 1, RH + 3.2, 3); g.stroke(); g.fillStyle = c + "26"; g.fill(); }
      });
      // 청소 칸·예약
      const warnSet = new Set();
      if (ghost && ghost.why === "clean") for (let c = ghost.s; c < ghost.s + drag.r.L; c++) if (grid[ghost.d][c] === 2) warnSet.add(ghost.d * 10 + c);
      for (let d = 0; d < 3; d++) for (let c = 0; c < NC; c++) if (grid[d][c] === 2) drawBroom(d, c, warnSet.has(d * 10 + c) && Math.floor(tt * 8) % 2 === 0);
      for (const b of books) drawBook(b);
      // 놓을 자리 미리 보기
      if (drag && ghost) {
        const { d, s, why } = ghost, x = CX + s * CW, y = RY[d] + 2, w = drag.r.L * CW - 2, h = RH - 4;
        rr(g, x, y, w, h, 3);
        if (!why) { g.fillStyle = "rgba(180,255,220,.22)"; g.fill(); g.setLineDash([2, 1.4]); g.lineDashOffset = -tt * 10; g.strokeStyle = "#c8ffe8"; g.lineWidth = 0.8; g.stroke(); g.setLineDash([]); }
        else { g.fillStyle = "rgba(255,50,90,.35)"; g.fill(); g.strokeStyle = "#ff6f8f"; g.lineWidth = 0.8; g.stroke(); const cx = x + w / 2, cy = y + h / 2; g.strokeStyle = "#ffffff"; g.lineWidth = 1.8; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - 5, cy - 5); g.lineTo(cx + 5, cy + 5); g.moveTo(cx + 5, cy - 5); g.lineTo(cx - 5, cy + 5); g.stroke(); }
      }
      // 알림 카드
      for (const r of slots) if (r && r.st === "in") { const [x, y] = cardPos(r); drawCard(r, x, y); }
      for (let i = leaving.length - 1; i >= 0; i--) {
        const r = leaving[i], p = (tt - r.lt) / 0.4; if (p >= 1) { leaving.splice(i, 1); r.el.remove(); continue; }
        if (r.st === "rej") drawCard(r, r.lx, r.ly - p * p * 90, 1 - p * 0.5);
        else { drawCard(r, r.lx, r.ly + p * 6, 1 - p); g.fillStyle = `rgba(20,10,30,${0.5 * (1 - p)})`; rr(g, r.lx, r.ly + p * 6, CDW, CDH, 4); g.fill(); }
      }
      // 손님 가는 시간이 얼마 안 남은 카드 위에 땀방울
      for (const r of slots) if (r && r.st === "in" && !over && 1 - (tt - r.t0) / r.life < 0.22) { const [x, y] = cardPos(r), k = (tt * 2) % 1, dx = x + CDW - 5, dy = y + 12 + k * 3; g.fillStyle = "#7fd1ff"; g.beginPath(); g.moveTo(dx, dy - 2); g.quadraticCurveTo(dx + 1.6, dy + 0.8, dx, dy + 1.4); g.quadraticCurveTo(dx - 1.6, dy + 0.8, dx, dy - 2); g.fill(); }
      // 들고 있는 블록
      if (drag) {
        const [bx, by, w, h] = dragRect(), lift = Math.min(1, (tt - drag.t0) / 0.08) * 4;
        drawBlock(bx, by - lift, w, h, drag.r, lift + 2);
        { const ar = artOf(drag.r.ck), fs = Math.min(h - 14, w - 4); if (ar.ok) { g.save(); rr(g, bx + w / 2 - fs / 2, by - lift + 12, fs, fs, 3); g.clip(); g.drawImage(ar.im, 240 + 50, 6, 140, 140, bx + w / 2 - fs / 2, by - lift + 12, fs, fs); g.restore(); } }
        drag.r.el.style.left = pct(bx, W); drag.r.el.style.top = pct(by - lift, H); drag.r.el.style.width = pct(w, W);
      }
      // 효과
      for (const q of pts) { g.globalAlpha = clamp(q.l / q.m, 0, 1); g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.s * 0.6, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const f of fws) { const a = clamp(f.l / f.m, 0, 1); g.globalAlpha = a; g.strokeStyle = f.c; g.lineWidth = a > 0.5 ? 1.1 : 0.7; g.beginPath(); g.moveTo(f.px - (f.x - f.px) * 2, f.py - (f.y - f.py) * 2); g.lineTo(f.x, f.y); g.stroke(); }
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
