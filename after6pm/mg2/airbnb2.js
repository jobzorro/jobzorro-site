// 미니게임 2탄: 에어씨앤씨 숙소 — 인간 돋보기(틀린 그림 찾기)
// 위: 지난번 손님 맞이 때 찍은 "완벽한 방" 사진, 아래: 지금 방. 방은 실제 그림(img/bg)이고, 다른 곳은 그 위에
// 기기 해상도로 그린 벡터 소품(수건·카드·쓰레기·슬리퍼·물 자국…)과 그림 손질(조명 끄기·액자 기울이기)로 만든다.
// 방 3개(한옥 스테이·도심 원룸·파티 독채) 중 2개, 방마다 다른 곳 5개를 아래 사진에서 톡. 좌우는 무작위로 뒤집는다.
// 맞히면 빨간 동그라미 + 그 자리가 고쳐지고, 틀리면 감점·흔들림. 시간이 흐르면 캐리어 소리·"곧 도착" 알림.
// 시간이 끝나거나 다 찾으면 손님(캐릭터 그림)이 들어와 표정으로 반응하고 별점. 점수 = 찾은 비율·속도·정확도.
import { frame, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp } from "../mg.js";

const W = 120, H = 80, ND = 5, NR = 2, ROOM_T = 15;
const ACC = ["#4f7bd9", "#d94f6a", "#3e9e6a", "#e09a30", "#8a5fc0", "#2f9fb0"];
// 손님 후보(여행객 평상복, 그림 직접 확인)
const GUESTS = ["c001", "c002", "c008", "c009", "c010", "c012", "c022", "c024", "c034", "c039", "c042", "c047", "c051", "c053", "c054", "c055", "c057", "c060", "c068", "c069", "c072", "c074", "c079", "c084", "c098", "c103", "c105"];
// 표정 칸(3x2): 무표정·웃음·슬픔·화남·수줍음·놀람. 위 312px 만 보인다
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
// 동그란 얼굴 칸(시트에서 얼굴 140px 정사각형만)
const faceBg = (ex) => { const i = EXI[ex] || 0; return `${(((i % 3) * 240 + 45) / 5.78).toFixed(2)}% ${((Math.floor(i / 3) * 540 + 10) / 9.39).toFixed(2)}%`; };
const exPos = (ex) => { const i = EXI[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };
const sh = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const mkC = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const svgURL = (w, h, body) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const STAR_D = "M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1 1.7 9.1l7.2-.9z";
const starImg = (on) => svgURL(24, 23, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${on ? "#fff1a8" : "#7a7f98"}"/><stop offset=".55" stop-color="${on ? "#ffc93c" : "#5a5f78"}"/><stop offset="1" stop-color="${on ? "#f09a20" : "#474b62"}"/></linearGradient></defs><path d="${STAR_D}" fill="url(#g)" stroke="${on ? "#b86a10" : "#33364a"}" stroke-width="1.2" stroke-linejoin="round"/><path d="M8.4 8.6l2.2-4.4" stroke="#fff" stroke-opacity="${on ? 0.8 : 0.25}" stroke-width="1.4" stroke-linecap="round"/>`);
const houseIcon = () => svgURL(24, 24, `<path d="M3.5 11.2L12 3.8l8.5 7.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.4V20h12v-9.6L12 5.3z" fill="#fff"/><rect x="10" y="13.6" width="4" height="6.4" rx="1" fill="#2a8ab8"/><path d="M16.2 4.6v3.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`);
const loupeIcon = () => svgURL(24, 24, `<defs><radialGradient id="l" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#e8f8ff"/><stop offset="1" stop-color="#7cc4ea"/></radialGradient></defs><path d="M14.6 14.6l6 6" stroke="#6a4a26" stroke-width="4" stroke-linecap="round"/><path d="M14.6 14.6l1.6 1.6" stroke="#c9a050" stroke-width="4"/><circle cx="9.6" cy="9.6" r="7" fill="url(#l)" stroke="#e8e8f0" stroke-width="2.2"/><path d="M6 7.6a4.3 4.3 0 0 1 3.4-2.6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);

// ── 그림 불러오기(한 번만, 같은 그림 재사용) ──
const IMG = {};
const loadImg = (src) => { if (IMG[src]) return IMG[src]; const o = { ok: false, fail: false, im: new Image() }; o.p = new Promise((res) => { o.im.onload = () => { o.ok = true; res(o); }; o.im.onerror = () => { o.fail = true; res(o); }; }); o.im.src = src; return (IMG[src] = o); };

// ── 벡터 소품(장면 단위 좌표, 1단위 = 그림 8px) ──
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const lg = (g, x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const shadowE = (g, x, y, rx, ry, a = 0.32) => { const q = g.createRadialGradient(x, y, 0, x, y, rx); q.addColorStop(0, `rgba(40,22,10,${a})`); q.addColorStop(1, "rgba(40,22,10,0)"); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = q; g.beginPath(); g.arc(x, y, rx, 0, 6.283); g.fill(); g.restore(); };
// 개어 놓은 수건 두 장
function towels(g, x, y, w, c1, c2, acc) {
  shadowE(g, x + w / 2, y + 4.3, w * 0.62, 1.1, 0.35);
  const one = (yy, c, ww, xo) => {
    rr(g, x + xo, yy, ww, 2.1, 0.7); g.fillStyle = lg(g, 0, yy, 0, yy + 2.1, [[0, sh(c, 1.08)], [0.5, c], [1, sh(c, 0.82)]]); g.fill();
    g.fillStyle = acc; g.fillRect(x + xo + ww * 0.12, yy + 0.25, ww * 0.1, 1.7);
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 0.18; g.beginPath(); g.moveTo(x + xo + 0.6, yy + 0.35); g.lineTo(x + xo + ww - 0.6, yy + 0.35); g.stroke();
    g.strokeStyle = "rgba(0,0,0,.12)"; g.beginPath(); g.moveTo(x + xo + ww * 0.55, yy + 0.6); g.lineTo(x + xo + ww * 0.55, yy + 1.9); g.stroke();
  };
  one(y + 2, c1, w, 0); one(y + 0.2, c2, w * 0.86, w * 0.07);
}
// 환영 카드(접힌 텐트 카드 + 하트)
function card(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  shadowE(g, 2.4, 3.3, 2.8, 0.6, 0.35);
  g.beginPath(); g.moveTo(0.2, 3.2); g.lineTo(0.7, 0); g.lineTo(4.3, 0); g.lineTo(4.8, 3.2); g.closePath(); g.fillStyle = lg(g, 0, 0, 0, 3.2, [[0, "#fffef8"], [1, "#ece4d0"]]); g.fill();
  g.strokeStyle = "rgba(120,90,60,.35)"; g.lineWidth = 0.12; g.stroke();
  g.fillStyle = "#e8445a"; g.beginPath(); g.moveTo(2.5, 2.2); g.bezierCurveTo(1.2, 1.4, 1.6, 0.5, 2.5, 1.1); g.bezierCurveTo(3.4, 0.5, 3.8, 1.4, 2.5, 2.2); g.fill();
  g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(2.0, 1.05, 0.16, 0, 6.283); g.fill();
  g.restore();
}
// 생수병
function bottle(g, x, y, h = 4.2) {
  shadowE(g, x + 0.75, y + h, 1.2, 0.35, 0.35);
  rr(g, x, y + 1.1, 1.5, h - 1.1, 0.45); g.fillStyle = lg(g, x, 0, x + 1.5, 0, [[0, "rgba(220,244,255,.95)"], [0.35, "rgba(170,220,245,.85)"], [1, "rgba(110,170,210,.9)"]]); g.fill();
  g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(x + 0.25, y + 1.5, 0.22, h - 1.9);
  g.fillStyle = "#3a8fd8"; g.fillRect(x, y + 2.2, 1.5, 0.9); g.fillStyle = "#fff"; g.fillRect(x + 0.3, y + 2.45, 0.9, 0.18);
  g.beginPath(); g.moveTo(x + 0.2, y + 1.2); g.lineTo(x + 0.45, y + 0.5); g.lineTo(x + 1.05, y + 0.5); g.lineTo(x + 1.3, y + 1.2); g.fillStyle = "rgba(200,235,250,.9)"; g.fill();
  rr(g, x + 0.4, y, 0.7, 0.55, 0.15); g.fillStyle = "#2f6fd0"; g.fill();
}
// 구겨진 쓰레기(종이 뭉치·찌그러진 캔·과자 봉지)
function trash(g, x, y, k, a = 0) {
  g.save(); g.translate(x, y); g.rotate(a);
  shadowE(g, 0.3, 0.6, 2.6, 0.7, 0.38);
  if (k === 0) {
    const pts = [[-1.8, -0.2], [-1.2, -1.6], [0, -2.1], [1.3, -1.5], [1.9, -0.3], [1.2, 0.6], [-0.2, 0.8], [-1.4, 0.5]];
    g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fillStyle = lg(g, -1, -2, 1, 1, [[0, "#ffffff"], [1, "#cfccc2"]]); g.fill();
    g.strokeStyle = "rgba(90,80,60,.45)"; g.lineWidth = 0.14; g.beginPath(); g.moveTo(-1.2, -1.2); g.lineTo(0, -0.4); g.lineTo(0.3, -1.8); g.moveTo(0, -0.4); g.lineTo(1.4, -0.1); g.moveTo(-0.6, 0.5); g.lineTo(0, -0.4); g.stroke();
  } else if (k === 1) {
    g.rotate(1.35); rr(g, -1.1, -2.2, 2.2, 4.2, 0.5); g.fillStyle = lg(g, -1.1, 0, 1.1, 0, [[0, "#9a1c28"], [0.35, "#ff6a6a"], [0.6, "#e03a3a"], [1, "#8a1420"]]); g.fill();
    g.fillStyle = "#d8dce2"; g.fillRect(-1.1, -2.2, 2.2, 0.55); g.fillRect(-1.1, 1.45, 2.2, 0.55);
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 0.18; g.beginPath(); g.moveTo(-0.2, -1); g.lineTo(0.5, 0.1); g.lineTo(-0.3, 0.9); g.stroke();
    g.fillStyle = "#ffd166"; g.fillRect(-0.7, -0.4, 1.4, 0.35);
  } else {
    g.beginPath(); g.moveTo(-2.3, -0.9); g.quadraticCurveTo(0, -1.6, 2.3, -0.9); g.lineTo(2.0, 0.9); g.quadraticCurveTo(0, 1.3, -2.0, 0.9); g.closePath();
    g.fillStyle = lg(g, 0, -1.4, 0, 1.2, [[0, "#ffe27a"], [0.45, "#f0a020"], [1, "#c06a10"]]); g.fill();
    g.fillStyle = "#e03a4a"; g.beginPath(); g.ellipse(0, 0, 1.1, 0.55, 0, 0, 6.283); g.fill();
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 0.16; g.beginPath(); g.moveTo(-1.8, -0.7); g.lineTo(1.6, -0.9); g.stroke();
    g.fillStyle = "#e8b860"; for (const [cx, cy] of [[2.9, 0.6], [3.5, 1.1], [-2.8, 1.0], [3.1, -0.2]]) { g.beginPath(); g.ellipse(cx, cy, 0.4, 0.25, cx, 0, 6.283); g.fill(); }
  }
  g.restore();
}
// 슬리퍼(발끝이 위, 길이 약 5.4단위)
function slipper(g, x, y, a, c) {
  g.save(); g.translate(x, y); g.rotate(a);
  shadowE(g, 0.35, 0.5, 1.9, 3.1, 0.34);
  const sole = () => { g.beginPath(); g.moveTo(0, -2.7); g.bezierCurveTo(1.35, -2.7, 1.3, -0.6, 1.05, 0.6); g.bezierCurveTo(0.9, 2.2, 0.75, 2.7, 0, 2.7); g.bezierCurveTo(-0.75, 2.7, -0.9, 2.2, -1.05, 0.6); g.bezierCurveTo(-1.3, -0.6, -1.35, -2.7, 0, -2.7); g.closePath(); };
  sole(); g.fillStyle = sh(c, 0.62); g.fill();
  g.save(); g.translate(0, -0.25); g.scale(0.86, 0.9); sole(); g.restore(); g.fillStyle = lg(g, -1, 0, 1, 0, [[0, "#fbf9f4"], [1, "#ddd7cb"]]); g.fill();
  g.beginPath(); g.moveTo(-1.28, -1.9); g.quadraticCurveTo(0, -2.5, 1.28, -1.9); g.lineTo(1.2, 0.05); g.quadraticCurveTo(0, -0.35, -1.2, 0.05); g.closePath();
  g.fillStyle = lg(g, 0, -2.4, 0, 0.1, [[0, sh(c, 1.3)], [0.5, c], [1, sh(c, 0.72)]]); g.fill();
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 0.16; g.beginPath(); g.moveTo(-0.9, -1.85); g.quadraticCurveTo(0, -2.25, 0.9, -1.85); g.stroke();
  g.restore();
}
// 바닥 물 자국(유리 같은 반사)
function puddle(g, x, y, w, h, seed = 1) {
  g.save(); g.beginPath();
  for (let i = 0; i <= 18; i++) { const t = (i / 18) * 6.283, k = 1 + 0.18 * Math.sin(t * 3 + seed) + 0.1 * Math.sin(t * 5 + seed * 2), px = x + Math.cos(t) * w / 2 * k, py = y + Math.sin(t) * h / 2 * k; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fillStyle = "rgba(150,190,215,.42)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 0.2; g.stroke();
  g.clip(); g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x - w * 0.12, y - h * 0.12, w * 0.28, h * 0.12, -0.1, 0, 6.283); g.fill();
  g.restore();
  g.fillStyle = "rgba(170,210,235,.6)"; for (const [dx, dy, r] of [[w * 0.62, -h * 0.2, 0.35], [w * 0.7, h * 0.25, 0.25], [-w * 0.6, h * 0.3, 0.3]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 6.283); g.fill(); }
}
// 이불이 흐트러짐: 이불을 대충 뭉쳐 놓은 덩어리 + 주름(이불 색은 그림에서 뽑음)
function creases(g, x, y, w, h, seed, c = "#f2eee6") {
  const s = (k) => (Math.sin(seed * 7.1 + k * 3.3) + 1) / 2;
  shadowE(g, x + w * 0.5, y + h * 0.92, w * 0.55, h * 0.18, 0.35);
  const blobs = [[0.22, 0.62, 0.26, 0.36], [0.5, 0.48, 0.3, 0.42], [0.78, 0.6, 0.24, 0.34], [0.38, 0.78, 0.28, 0.24], [0.66, 0.8, 0.26, 0.22]];
  blobs.forEach(([bx, by, rx, ry], k) => {
    const cx = x + w * (bx + (s(k) - 0.5) * 0.06), cy = y + h * by, q = g.createRadialGradient(cx - w * rx * 0.3, cy - h * ry * 0.45, 0.2, cx, cy, w * rx * 1.1);
    q.addColorStop(0, sh(c, 1.08)); q.addColorStop(0.55, c); q.addColorStop(1, sh(c, 0.72));
    g.fillStyle = q; g.beginPath(); g.ellipse(cx, cy, w * rx, h * ry, (s(k + 4) - 0.5) * 0.6, 0, 6.283); g.fill();
  });
  const L = (x0, y0, x1, y1, cx, cy) => { g.lineCap = "round"; g.strokeStyle = "rgba(90,70,62,.24)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x0 - 0.25, y0 - 0.35); g.quadraticCurveTo(cx - 0.25, cy - 0.35, x1 - 0.25, y1 - 0.35); g.stroke(); };
  for (let k = 0; k < 5; k++) { const x0 = x + w * (0.15 + 0.16 * k), y0 = y + h * (0.35 + 0.25 * s(k + 9)), x1 = x0 + w * 0.1 * (k % 2 ? 1 : -1), y1 = y0 + h * (0.25 + 0.15 * s(k + 2)); L(x0, y0, x1, y1, (x0 + x1) / 2 + w * 0.06, (y0 + y1) / 2 - h * 0.08); }
}
// 조명 끄기: 그림의 불빛 자리를 곱하기로 어둡게
function lampOff(g, cx, cy, r) {
  g.save(); g.globalCompositeOperation = "multiply";
  const q = g.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, "rgb(66,58,78)"); q.addColorStop(0.35, "rgb(104,96,116)"); q.addColorStop(0.7, "rgb(196,190,200)"); q.addColorStop(1, "rgb(255,255,255)");
  g.fillStyle = q; g.fillRect(cx - r, cy - r, 2 * r, 2 * r); g.restore();
}
// 그림 한 조각을 기울이기(액자·족자). 뒤는 벽색으로 메운다
function tiltPic(g, R, x, y, w, h, a) {
  const c1 = R.samp(x - 1.2, y + 1), c2 = R.samp(x - 1.2, y + h - 1), c3 = R.samp(x + w + 1.2, y + h / 2);
  g.fillStyle = lg(g, x, y, x + w, y + h, [[0, c1], [0.5, c3], [1, c2]]); g.fillRect(x - 0.4, y - 0.4, w + 0.8, h + 0.8);
  if (!R.ld.ok) return;
  const k = R.img.naturalWidth / W;
  g.save(); g.translate(x + w / 2, y + 0.4); g.rotate(a);
  g.shadowColor = "rgba(30,15,5,.45)"; g.shadowBlur = R.S * 1.1; g.shadowOffsetX = R.S * 0.3; g.shadowOffsetY = R.S * 0.5;
  g.drawImage(R.img, x * k, y * k, w * k, h * k, -w / 2, -0.4, w, h); g.restore();
}
// 서랍이 열려 있음
function drawer(g, x, y, w, h, wood) {
  g.fillStyle = "rgba(20,10,5,.55)"; g.fillRect(x, y - 0.3, w, 0.9);
  g.fillStyle = lg(g, 0, y, 0, y + h, [[0, sh(wood, 1.15)], [1, sh(wood, 0.8)]]); g.beginPath(); g.moveTo(x - 0.4, y + 0.6); g.lineTo(x + w + 0.8, y + 0.6); g.lineTo(x + w + 1.4, y + h); g.lineTo(x - 0.2, y + h); g.closePath(); g.fill();
  g.fillStyle = sh(wood, 0.55); g.beginPath(); g.moveTo(x - 0.4, y + 0.6); g.lineTo(x + w + 0.8, y + 0.6); g.lineTo(x + w + 0.3, y - 0.3); g.lineTo(x, y - 0.3); g.closePath(); g.fill();
  g.fillStyle = "#f4ead4"; g.fillRect(x + 0.8, y - 0.1, w * 0.5, 0.6); g.fillStyle = "#e05a6a"; g.fillRect(x + w * 0.55, y - 0.05, w * 0.25, 0.5);
  rr(g, x + w / 2 - 0.9, y + h * 0.55, 1.8 + 0.6, 0.45, 0.2); g.fillStyle = "#d8b060"; g.fill();
  shadowE(g, x + w / 2 + 0.6, y + h + 0.3, w * 0.7, 0.5, 0.35);
}
// 창호지 문이 반쯤 닫힘
function shoji(g, x, y, w, h, wood) {
  g.fillStyle = "rgba(30,18,8,.3)"; g.fillRect(x + w, y, 0.6, h);
  g.fillStyle = lg(g, x, y, x + w, y + h, [[0, "rgba(250,240,215,.96)"], [1, "rgba(236,220,186,.96)"]]); g.fillRect(x, y, w, h);
  g.strokeStyle = wood; g.lineWidth = 0.32;
  for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + (w * k) / 4, y); g.lineTo(x + (w * k) / 4, y + h); g.stroke(); }
  for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(x, y + (h * k) / 7); g.lineTo(x + w, y + (h * k) / 7); g.stroke(); }
  g.lineWidth = 0.9; g.strokeRect(x + 0.45, y + 0.45, w - 0.9, h - 0.9);
  g.fillStyle = "rgba(255,210,140,.18)"; g.fillRect(x, y, w, h);
}
// 커튼이 반쯤 쳐짐
function curtain(g, x, y, w, h, c) {
  const q = g.createLinearGradient(x, 0, x + w, 0); for (let k = 0; k <= 8; k++) q.addColorStop(k / 8, k % 2 ? sh(c, 0.78) : sh(c, 1.08)); q.addColorStop(1, sh(c, 0.7));
  g.fillStyle = q; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); for (let k = 8; k >= 0; k--) g.lineTo(x + (w * k) / 8, y + h + (k % 2 ? 0.6 : 0)); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x - 0.5, y, 0.5, h);
}
// 의자에 걸친 옷 더미
function clothes(g, x, y, c1, c2) {
  shadowE(g, x + 4, y + 7.5, 4.5, 1, 0.3);
  g.fillStyle = lg(g, x, y, x, y + 8, [[0, sh(c1, 1.15)], [1, sh(c1, 0.75)]]);
  g.beginPath(); g.moveTo(x, y + 1); g.quadraticCurveTo(x + 4, y - 1.2, x + 8.5, y + 0.8); g.lineTo(x + 9, y + 5); g.quadraticCurveTo(x + 7.5, y + 8.2, x + 6, y + 6.8); g.lineTo(x + 5.6, y + 3); g.quadraticCurveTo(x + 3, y + 3.6, x + 1.6, y + 3.2); g.lineTo(x + 1.2, y + 7.4); g.quadraticCurveTo(x + 0.2, y + 7.8, x - 0.4, y + 6.6); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.2; g.beginPath(); g.moveTo(x + 1, y + 1.2); g.quadraticCurveTo(x + 4, y - 0.3, x + 8, y + 1.3); g.stroke();
  g.fillStyle = lg(g, x, y + 2, x, y + 8, [[0, c2], [1, sh(c2, 0.7)]]); g.beginPath(); g.moveTo(x + 2.4, y + 3.4); g.quadraticCurveTo(x + 4, y + 2.6, x + 5.2, y + 3.4); g.lineTo(x + 5, y + 8.2); g.lineTo(x + 3.6, y + 8.4); g.lineTo(x + 3.8, y + 5.6); g.lineTo(x + 3.1, y + 8.4); g.lineTo(x + 2.1, y + 8.2); g.closePath(); g.fill();
}
// 씻지 않은 그릇·머그
function dishes(g, x, y) {
  shadowE(g, x + 3, y + 3.6, 3.6, 0.6, 0.35);
  for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + 2.6, y + 3 - k * 0.55, 2.6, 0.7, 0, 0, 6.283); g.fillStyle = k === 2 ? "#ffffff" : "#e4e2dc"; g.fill(); g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 0.1; g.stroke(); }
  g.fillStyle = "rgba(170,90,40,.75)"; g.beginPath(); g.ellipse(x + 2.2, y + 1.85, 1.2, 0.3, 0.2, 0, 6.283); g.fill(); g.fillStyle = "rgba(200,60,40,.6)"; g.beginPath(); g.arc(x + 3.3, y + 1.9, 0.25, 0, 6.283); g.fill();
  rr(g, x + 4.4, y - 0.4, 2, 2.6, 0.35); g.fillStyle = lg(g, x + 4.4, 0, x + 6.4, 0, [[0, "#f4f0e8"], [1, "#b8b2a6"]]); g.fill();
  g.strokeStyle = "#c8c2b6"; g.lineWidth = 0.35; g.beginPath(); g.arc(x + 6.6, y + 0.9, 0.6, -1.4, 1.4); g.stroke();
  g.fillStyle = "#5a3418"; g.beginPath(); g.ellipse(x + 5.4, y - 0.35, 0.95, 0.25, 0, 0, 6.283); g.fill();
  g.strokeStyle = "rgba(110,60,25,.6)"; g.lineWidth = 0.2; g.beginPath(); g.moveTo(x + 4.6, y + 0.1); g.lineTo(x + 4.7, y + 1.1); g.stroke();
}
// 발매트 귀퉁이가 접힘: 바닥이 드러나고 뒷면(밝은 고무)이 위로
function matFlap(g, x, y, w, h, floor) {
  const A = [x + 1.2, y + 0.8], B = [x + w * 0.42, y + 0.6], C = [x + 0.4, y + h * 0.62], D = [B[0] - 0.6 + (C[0] - A[0]) * 0.9, C[1] + (B[1] - A[1]) * 0.5 + 0.8];
  g.fillStyle = floor; g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.lineTo(...C); g.closePath(); g.fill();
  g.fillStyle = "rgba(20,10,5,.4)"; g.beginPath(); g.moveTo(...B); g.lineTo(...C); g.lineTo(D[0] + 0.6, D[1] + 0.6); g.closePath(); g.fill();
  g.fillStyle = lg(g, B[0], B[1], D[0], D[1], [[0, "#a89c86"], [1, "#6e6454"]]); g.beginPath(); g.moveTo(...B); g.lineTo(...C); g.lineTo(...D); g.closePath(); g.fill();
  g.strokeStyle = "rgba(90,70,50,.45)"; g.lineWidth = 0.15; g.stroke();
  for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(150,140,120,.5)"; g.beginPath(); g.arc(B[0] + (D[0] - B[0]) * (0.2 + k * 0.12) - (k % 2) * 0.8, B[1] + (D[1] - B[1]) * (0.2 + k * 0.12) + 0.3, 0.12, 0, 6.283); g.fill(); }
  const L = (x0, y0, x1, y1) => { g.strokeStyle = "rgba(30,20,12,.4)"; g.lineWidth = 0.55; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 - 1, x1, y1); g.stroke(); g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 0.25; g.beginPath(); g.moveTo(x0 - 0.2, y0 - 0.35); g.quadraticCurveTo((x0 + x1) / 2, y0 - 1.35, x1 - 0.2, y1 - 0.35); g.stroke(); };
  L(x + w * 0.5, y + h * 0.5, x + w * 0.82, y + h * 0.38); L(x + w * 0.55, y + h * 0.78, x + w * 0.92, y + h * 0.72);
}
// 풍선(하트) 다발과 바람 빠진 풍선
function balloons(g, x, y, cs) {
  g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.12;
  cs.forEach((c, i) => { const bx = x + (i - 1) * 2.1, by = y + (i % 2) * 1.8; g.beginPath(); g.moveTo(bx, by + 2.6); g.quadraticCurveTo(bx + 0.6, by + 9, x, y + 16); g.stroke(); });
  cs.forEach((c, i) => {
    const bx = x + (i - 1) * 2.1, by = y + (i % 2) * 1.8; g.save(); g.translate(bx, by);
    g.beginPath(); g.moveTo(0, 2.4); g.bezierCurveTo(-3.2, 0.2, -1.6, -2.6, 0, -0.9); g.bezierCurveTo(1.6, -2.6, 3.2, 0.2, 0, 2.4);
    const q = g.createRadialGradient(-0.7, -0.8, 0.1, 0, 0, 2.8); q.addColorStop(0, sh(c, 1.5)); q.addColorStop(0.5, c); q.addColorStop(1, sh(c, 0.6)); g.fillStyle = q; g.fill();
    g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.ellipse(-0.9, -0.5, 0.35, 0.6, 0.5, 0, 6.283); g.fill(); g.restore();
  });
}
function flatBalloon(g, x, y, c) {
  shadowE(g, x + 1, y + 1, 3, 0.7, 0.3);
  g.fillStyle = lg(g, x - 2, y - 1, x + 2, y + 1, [[0, sh(c, 1.2)], [1, sh(c, 0.6)]]); g.beginPath(); g.moveTo(x - 2.4, y + 0.4); g.quadraticCurveTo(x - 1, y - 1.4, x + 1.4, y - 0.6); g.quadraticCurveTo(x + 2.4, y + 0.2, x + 1.6, y + 0.9); g.quadraticCurveTo(x - 0.4, y + 1.4, x - 2.4, y + 0.4); g.fill();
  g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.12; g.beginPath(); g.moveTo(x + 1.6, y + 0.5); g.quadraticCurveTo(x + 3, y + 0.2, x + 4, y + 1); g.stroke();
}
// 작은 케이크
function cake(g, x, y) {
  shadowE(g, x + 2.2, y + 4.1, 3, 0.6, 0.35);
  g.fillStyle = "#f4f2ee"; g.beginPath(); g.ellipse(x + 2.2, y + 4, 3, 0.65, 0, 0, 6.283); g.fill();
  rr(g, x, y + 1, 4.4, 2.9, 0.5); g.fillStyle = lg(g, x, 0, x + 4.4, 0, [[0, "#fff4f0"], [0.6, "#ffd8de"], [1, "#e8a8b4"]]); g.fill();
  g.fillStyle = "#fffdf8"; g.beginPath(); g.ellipse(x + 2.2, y + 1.05, 2.2, 0.55, 0, 0, 6.283); g.fill();
  g.fillStyle = "#e8445a"; for (const k of [0.9, 2.2, 3.5]) { g.beginPath(); g.arc(x + k, y + 0.85, 0.42, 0, 6.283); g.fill(); }
  g.fillStyle = "#c84a6a"; g.fillRect(x, y + 2.3, 4.4, 0.3);
  g.fillStyle = "#fff"; g.fillRect(x + 2.05, y - 1, 0.3, 1.7); g.fillStyle = "#ffd166"; g.beginPath(); g.ellipse(x + 2.2, y - 1.3, 0.25, 0.45, 0, 0, 6.283); g.fill();
}
// 삼각 깃발 줄
function bunting(g, x0, y0, x1, n, cs) {
  const yAt = (t) => y0 + Math.sin(t * Math.PI) * 2.2;
  g.strokeStyle = "rgba(255,240,210,.8)"; g.lineWidth = 0.15; g.beginPath(); for (let k = 0; k <= 20; k++) { const t = k / 20; k ? g.lineTo(x0 + (x1 - x0) * t, yAt(t)) : g.moveTo(x0, y0); } g.stroke();
  for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = x0 + (x1 - x0) * t, y = yAt(t), c = cs[k % cs.length]; g.fillStyle = lg(g, x, y, x, y + 2.6, [[0, sh(c, 1.15)], [1, sh(c, 0.75)]]); g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x + 1, y); g.lineTo(x, y + 2.6); g.closePath(); g.fill(); }
}
// 쿠션(바닥에 떨어짐)
function cushion(g, x, y, a, c) {
  g.save(); g.translate(x, y); g.rotate(a); shadowE(g, 0.5, 1.9, 5.2, 1.3, 0.4);
  const body = (k) => { g.beginPath(); g.moveTo(-4.2 * k, -2.1 * k); g.quadraticCurveTo(0, -1.4 * k, 4.2 * k, -2.1 * k); g.quadraticCurveTo(3.6 * k, 0, 4.2 * k, 2.1 * k); g.quadraticCurveTo(0, 1.5 * k, -4.2 * k, 2.1 * k); g.quadraticCurveTo(-3.6 * k, 0, -4.2 * k, -2.1 * k); g.closePath(); };
  body(1); g.fillStyle = sh(c, 0.55); g.fill();
  body(0.93); const q = g.createRadialGradient(-1, -0.8, 0.2, 0, 0, 4.6); q.addColorStop(0, sh(c, 1.35)); q.addColorStop(0.6, c); q.addColorStop(1, sh(c, 0.72)); g.fillStyle = q; g.fill();
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.16; g.setLineDash([0.4, 0.3]); body(0.8); g.stroke(); g.setLineDash([]);
  g.fillStyle = sh(c, 0.6); g.beginPath(); g.arc(0, 0, 0.35, 0, 6.283); g.fill();
  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 0.2; for (const t of [0.5, 2.1, 3.7, 5.3]) { g.beginPath(); g.moveTo(Math.cos(t) * 0.45, Math.sin(t) * 0.45); g.lineTo(Math.cos(t) * 1.6, Math.sin(t) * 1); g.stroke(); }
  g.restore();
}
// 꽃가루(색종이) 어질러짐
function confetti(g, x, y, w, h, seed) {
  const cs = ["#ff5a7a", "#ffd166", "#5fd0a0", "#6aa8ff", "#c77dff", "#ffffff"];
  for (let k = 0; k < 46; k++) { const s1 = (Math.sin(seed + k * 12.9898) * 43758.5) % 1, s2 = (Math.sin(seed + k * 78.233) * 12345.6) % 1, px = x + Math.abs(s1) * w, py = y + Math.abs(s2) * h; g.save(); g.translate(px, py); g.rotate(k); g.fillStyle = cs[k % cs.length]; g.fillRect(-0.35, -0.18, 0.7, 0.36); g.restore(); }
  for (let k = 0; k < 3; k++) { g.strokeStyle = cs[k + 1]; g.lineWidth = 0.18; g.beginPath(); const px = x + w * (0.2 + 0.3 * k), py = y + h * (0.3 + 0.2 * (k % 2)); g.moveTo(px, py); g.bezierCurveTo(px + 1, py - 1.2, px + 1.6, py + 1.2, px + 3, py); g.stroke(); }
}
// 스크린이 꺼짐
function screenOff(g, x, y, w, h) {
  g.fillStyle = lg(g, x, y, x, y + h, [[0, "rgba(46,48,60,.97)"], [1, "rgba(24,25,34,.97)"]]); g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.moveTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.45, y + h); g.lineTo(x + w * 0.25, y + h); g.closePath(); g.fill();
  rr(g, x + w / 2 - 3, y + h / 2 - 1.2, 6, 2.4, 0.6); g.fillStyle = "rgba(255,255,255,.12)"; g.fill();
  g.fillStyle = "rgba(255,255,255,.55)"; g.font = "bold 1.6px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NO SIGNAL", x + w / 2, y + h / 2 + 0.05);
}
// 엎질러진 음료(잔 + 웅덩이)
function spill(g, x, y) {
  puddle(g, x + 2.5, y + 0.8, 7, 2.2, 3);
  g.fillStyle = "rgba(200,80,60,.35)"; g.beginPath(); g.ellipse(x + 2.5, y + 0.8, 2.6, 0.7, 0, 0, 6.283); g.fill();
  g.save(); g.translate(x - 1.2, y); g.rotate(-1.35); rr(g, -1, -1.8, 2, 3.6, 0.4); g.fillStyle = lg(g, -1, 0, 1, 0, [[0, "rgba(230,245,255,.95)"], [1, "rgba(160,200,225,.95)"]]); g.fill(); g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(-0.7, -1.4, 0.25, 2.8); g.restore();
}

// ───────── 방 1: 한옥 스테이(img/bg/airbnb.webp) ─────────
function roomHanok(R) {
  const acc = pick(ACC), tw = pick([["#f4ecd8", "#ffffff"], ["#e8dcc6", "#fbf6ea"], ["#dfe8f0", "#ffffff"]]), slipC = pick(["#3a6ea5", "#c8384a", "#3e7a5a", "#8a5a3a"]);
  const tr = pick([[22, 60], [46, 71], [90, 68], [14, 73]]), trK = rint(3), trA = rnd() * 2 - 1, sl2 = pick([[24, 66], [50, 74], [94, 74]]), pu = pick([[40, 52], [30, 64]]), ang = pick([-1, 1]) * (0.14 + rnd() * 0.06);
  const slots = [
    { id: "scroll", n: "족자", fix: "족자 바로!", box: [[97, 1, 11, 24]], good: () => {}, bad: (g) => tiltPic(g, R, 99.4, 2.2, 6.8, 21.4, ang) },
    { id: "lampC", n: "한지 등", fix: "등 켰어요", snd: "click", box: [[4, 22, 9, 11]], good: () => {}, bad: (g) => lampOff(g, 8.7, 27.6, 6.5) },
    { id: "lampB", n: "협탁 등", fix: "등 켰어요", snd: "click", box: [[83, 23, 10, 10]], good: () => {}, bad: (g) => lampOff(g, 88.4, 28.6, 6.5) },
    { id: "lampT", n: "천장 등", fix: "천장 등 켰어요", snd: "click", box: [[46, 0, 14, 8]], good: () => {}, bad: (g) => lampOff(g, 53, 3, 7.5) },
    { id: "towel", n: "수건", fix: "수건 채움", box: [[60, 33, 12, 9]], good: (g) => towels(g, 61.5, 35.6, 8.5, tw[0], tw[1], acc), bad: () => {} },
    { id: "card", n: "환영 카드", fix: "환영 카드 놓음", box: [[94, 31, 9, 7]], good: (g) => card(g, 96, 33.6, 1.15), bad: () => {} },
    { id: "blanket", n: "이불", fix: "이불 쫙!", snd: "whoosh", box: [[58, 40, 24, 13]], good: () => {}, bad: (g) => creases(g, 59, 37.5, 17, 9, ang * 10, R.samp(63, 41)) },
    { id: "slip", n: "슬리퍼", fix: "슬리퍼 짝 맞춤", box: [[66, 55, 12, 10], [sl2[0] - 4, sl2[1] - 4, 8, 8]], good: (g) => { slipper(g, 70, 60, -0.08, slipC); slipper(g, 73.6, 60, 0.08, slipC); }, bad: (g) => { slipper(g, 70, 60, -0.08, slipC); slipper(g, sl2[0], sl2[1], 2.2, slipC); } },
    { id: "trash", n: "쓰레기", fix: "쓰레기 치움", snd: "sweep", box: [[tr[0] - 4, tr[1] - 4, 8, 7]], good: () => {}, bad: (g) => trash(g, tr[0], tr[1], trK, trA) },
    { id: "water", n: "물 자국", fix: "물기 닦음", snd: "sweep", box: [[pu[0] - 7, pu[1] - 3, 14, 6]], good: () => {}, bad: (g) => puddle(g, pu[0], pu[1], 10, 2.6, ang * 20) },
    { id: "drawer", n: "서랍", fix: "서랍 닫음", box: [[0, 44, 11, 10]], good: () => {}, bad: (g) => drawer(g, 0.6, 46.8, 8.2, 4.4, R.samp(4, 50)) },
    { id: "shoji", n: "창호 문", fix: "창 활짝!", snd: "whoosh", box: [[32, 7, 17, 29]], good: () => {}, bad: (g) => shoji(g, 33.4, 8, 14.6, 27, R.samp(31.5, 20)) },
    { id: "bottle", n: "생수", fix: "생수 채움", box: [[41, 30, 6, 8]], good: (g) => { bottle(g, 42, 32.2, 4); bottle(g, 43.8, 32.6, 4); }, bad: () => {} },
  ];
  return { n: "한옥 스테이", bg: "img/bg/airbnb.webp", slots, gx: pick([86, 30]) };
}

// ───────── 방 2: 도심 원룸(img/bg/home.webp) ─────────
function roomStudio(R) {
  const acc = pick(ACC), tw = pick([["#f4ecd8", "#ffffff"], ["#dfe8f0", "#ffffff"], ["#e8dcc6", "#fbf6ea"]]), slipC = pick(["#3a6ea5", "#c8384a", "#3e7a5a", "#5a5a6a"]);
  const tr = pick([[55, 64], [66, 74], [46, 70]]), trK = rint(3), trA = rnd() * 2 - 1, sl2 = pick([[60, 72], [70, 64]]), ang = pick([-1, 1]) * (0.15 + rnd() * 0.06);
  const cl = pick([["#c94f6a", "#3a4a6a"], ["#4f7bd9", "#d8c8a8"], ["#3e9e6a", "#2a2a34"], ["#e09a30", "#4a5a7a"]]);
  const slots = [
    { id: "poster", n: "액자", fix: "액자 바로!", box: [[3, 6, 9, 12]], good: () => {}, bad: (g) => tiltPic(g, R, 4.3, 6.9, 5.6, 9.5, ang) },
    { id: "lampB", n: "협탁 스탠드", fix: "불 켰어요", snd: "click", box: [[34, 20, 9, 10]], good: () => {}, bad: (g) => lampOff(g, 38.6, 24.6, 5.8) },
    { id: "lampD", n: "책상 스탠드", fix: "불 켰어요", snd: "click", box: [[84, 14, 10, 9]], good: () => {}, bad: (g) => lampOff(g, 88.6, 19.3, 5.8) },
    { id: "towel", n: "수건", fix: "수건 채움", box: [[18, 29, 11, 8]], good: (g) => towels(g, 19.2, 30.6, 8.5, tw[0], tw[1], acc), bad: () => {} },
    { id: "card", n: "환영 카드", fix: "환영 카드 놓음", box: [[8, 24, 8, 7]], good: (g) => card(g, 9.6, 25.9, 1.1), bad: () => {} },
    { id: "blanket", n: "이불", fix: "이불 쫙!", snd: "whoosh", box: [[12, 37, 22, 14]], good: () => {}, bad: (g) => creases(g, 14, 36, 16, 9, ang * 10, R.samp(30, 38)) },
    { id: "clothes", n: "옷 더미", fix: "옷 정리했어요", snd: "whoosh", box: [[75, 23, 12, 12]], good: () => {}, bad: (g) => clothes(g, 76.5, 25, cl[0], cl[1]) },
    { id: "dish", n: "설거지", fix: "설거지 끝", snd: "sweep", box: [[103, 21, 10, 8]], good: () => {}, bad: (g) => dishes(g, 104.5, 24) },
    { id: "curtain", n: "커튼", fix: "커튼 걷었어요", snd: "whoosh", box: [[57, 0, 17, 31]], good: () => {}, bad: (g) => curtain(g, 59, 0, 14.5, 30.5, R.samp(76.5, 16)) },
    { id: "mat", n: "발매트", fix: "발매트 쫙!", snd: "whoosh", box: [[94, 59, 25, 16]], good: () => {}, bad: (g) => matFlap(g, 95.5, 60.5, 22, 13, R.samp(92, 66)) },
    { id: "trash", n: "쓰레기", fix: "쓰레기 치움", snd: "sweep", box: [[tr[0] - 4, tr[1] - 4, 8, 7]], good: () => {}, bad: (g) => trash(g, tr[0], tr[1], trK, trA) },
    { id: "slip", n: "슬리퍼", fix: "슬리퍼 짝 맞춤", box: [[37, 54, 11, 10], [sl2[0] - 4, sl2[1] - 4, 8, 8]], good: (g) => { slipper(g, 40.6, 58.6, -0.1, slipC); slipper(g, 44.2, 58.6, 0.1, slipC); }, bad: (g) => { slipper(g, 40.6, 58.6, -0.1, slipC); slipper(g, sl2[0], sl2[1], 2.4, slipC); } },
    { id: "water", n: "물 자국", fix: "물기 닦음", snd: "sweep", box: [[76, 57, 14, 7]], good: () => {}, bad: (g) => puddle(g, 83, 60.5, 10, 2.6, ang * 20) },
    { id: "bottle", n: "생수", fix: "생수 채움", box: [[79, 18, 6, 7]], good: (g) => { bottle(g, 80.4, 19.8, 3.8); bottle(g, 82.2, 20.2, 3.8); }, bad: () => {} },
  ];
  return { n: "도심 원룸", bg: "img/bg/home.webp", slots, gx: pick([88, 60]) };
}

// ───────── 방 3: 파티 독채(img/bg/partyroom.webp) ─────────
function roomParty(R) {
  const bc = shuffle(["#ff5a7a", "#ffd166", "#6aa8ff", "#c77dff", "#5fd0a0"]).slice(0, 3), cuC = pick(["#c94f6a", "#4f7bd9", "#e09a30", "#3e9e6a"]);
  const tr = pick([[16, 60], [46, 70], [100, 62]]), trK = rint(3), trA = rnd() * 2 - 1, seed = rnd() * 50;
  const slots = [
    { id: "screen", n: "스크린", fix: "스크린 켰어요", snd: "click", box: [[63, 6, 37, 23]], good: () => {}, bad: (g) => screenOff(g, 63.6, 6.4, 36.3, 22.6) },
    { id: "lampF", n: "스탠드", fix: "불 켰어요", snd: "click", box: [[38, 17, 9, 9]], good: () => {}, bad: (g) => lampOff(g, 42.6, 21.8, 5.6) },
    { id: "lampL", n: "테이블 램프", fix: "불 켰어요", snd: "click", box: [[0, 20, 8, 8]], good: () => {}, bad: (g) => lampOff(g, 2.4, 24.6, 5) },
    { id: "candle", n: "캔들", fix: "캔들 켰어요", snd: "click", box: [[36, 30, 10, 7]], good: () => {}, bad: (g) => lampOff(g, 40.6, 33.6, 4.2) },
    { id: "balloon", n: "풍선", fix: "풍선 다시 달았어요", box: [[51, 1, 10, 21], [47, 53, 10, 6]], good: (g) => balloons(g, 56, 5, bc), bad: (g) => { g.translate(51.5, 56); g.scale(1.6, 1.6); flatBalloon(g, 0, 0, bc[0]); } },
    { id: "cake", n: "케이크", fix: "케이크 준비", box: [[48, 29, 8, 8]], good: (g) => cake(g, 49.8, 31.2), bad: () => {} },
    { id: "bunting", n: "가랜드", fix: "가랜드 달았어요", box: [[11, 1, 27, 9]], good: (g) => bunting(g, 12.5, 3, 36.5, 9, ["#ff5a7a", "#ffd166", "#6aa8ff", "#5fd0a0"]), bad: () => {} },
    { id: "cushion", n: "쿠션", fix: "쿠션 제자리", box: [[19, 47, 11, 7]], good: () => {}, bad: (g) => cushion(g, 24.6, 50.4, 0.35, cuC) },
    { id: "spill", n: "쏟은 음료", fix: "닦았어요", snd: "sweep", box: [[57, 52, 15, 7]], good: () => {}, bad: (g) => spill(g, 63, 55.5) },
    { id: "confetti", n: "꽃가루", fix: "싹 쓸었어요", snd: "sweep", box: [[74, 60, 22, 12]], good: () => {}, bad: (g) => confetti(g, 75, 61, 20, 10, seed) },
    { id: "trash", n: "쓰레기", fix: "쓰레기 치움", snd: "sweep", box: [[tr[0] - 4, tr[1] - 4, 8, 7]], good: () => {}, bad: (g) => trash(g, tr[0], tr[1], trK, trA) },
    { id: "bottle", n: "생수", fix: "생수 채움", box: [[70, 24, 7, 8]], good: (g) => { bottle(g, 71.6, 26.2, 4); bottle(g, 73.5, 26.6, 4); }, bad: () => {} },
  ];
  return { n: "파티 독채", bg: "img/bg/partyroom.webp", slots, gx: pick([30, 84]) };
}

const ROOMS = [roomHanok, roomStudio, roomParty];
const mkRoom = (fn) => {
  const R = { S: 4 };
  Object.assign(R, fn(R));
  const L = loadImg(R.bg); R.img = L.im; R.ld = L;
  // 그림 색 뽑기(작게 줄인 사본에서 3x3 평균)
  R.samp = (x, y) => {
    if (!R.sm) { R.sm = mkC(W, H); const sg = R.sm.getContext("2d"); if (L.ok) sg.drawImage(R.img, 0, 0, W, H); else { sg.fillStyle = "#d8c8b0"; sg.fillRect(0, 0, W, H); } R.smd = sg.getImageData(0, 0, W, H).data; }
    let r = 0, gg = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = clamp(Math.round(x) + dx, 0, W - 1), py = clamp(Math.round(y) + dy, 0, H - 1), i = (py * W + px) * 4; r += R.smd[i]; gg += R.smd[i + 1]; b += R.smd[i + 2]; n++; }
    return "#" + [r, gg, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
  };
  return R;
};
// 방 한 장 그리기(g 는 장면 단위로 확대된 상태). bad(slot) = 0(완벽) ~ 1(달라진 모습)
function paint(g, R, bad) {
  if (!R.bc || R.bcS !== R.S) {
    R.bcS = R.S; R.bc = mkC(W * R.S, H * R.S); const b = R.bc.getContext("2d");
    if (R.ld.ok) { b.imageSmoothingQuality = "high"; b.drawImage(R.img, 0, 0, R.bc.width, R.bc.height); }
    else { b.fillStyle = lg(b, 0, 0, 0, R.bc.height, [[0, "#e9dcc6"], [0.55, "#dccdb2"], [0.56, "#b07a4a"], [1, "#93633b"]]); b.fillRect(0, 0, R.bc.width, R.bc.height); }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.drawImage(R.bc, 0, 0, W, H);
  for (const s of R.slots) {
    const b = bad(s);
    g.save();
    if (b <= 0) s.good(g); else if (b >= 1) s.bad(g);
    else { g.globalAlpha = b; s.bad(g); g.globalAlpha = 1 - b; s.good(g); }
    g.restore();
  }
}

export const GAME = {
  key: "airbnb2", base: "airbnb", n: "인간 돋보기", desc: "손님 오기 전, 지난번 완벽했던 방 사진과 지금 방을 비교해 다른 곳을 찾아요.",
  how: ["위는 <b>지난번 손님 맞이 사진</b>, 아래는 <b>지금 방</b>이에요", "아래 그림에서 <b>다른 곳 5개</b>를 톡! 틀리면 감점과 시간 -1초", "<b>돋보기</b>를 누르고 사진을 꾹 누르면 크게 보여요. 손님이 문 앞까지 와요!"],
  steps: () => {
    const ph = (pos, extra = "") => `<span class="ab2-sp" style="background-position:${pos}">${extra}</span>`;
    const ring = `<svg viewBox="0 0 76 50" class="ab2-sv"><ellipse cx="44" cy="22" rx="13" ry="9" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3.4"/><ellipse cx="44" cy="22" rx="13" ry="9" fill="none" stroke="#ff3355" stroke-width="2.2" transform="rotate(-6 44 22)"/></svg>`;
    const fing = `<svg viewBox="0 0 24 28" class="ab2-fg"><path d="M9 2.5c1.6 0 2.6 1.1 2.6 2.8v7.6l1.2-.3c1.5-.4 2.6.3 2.9 1.4l.9-.2c1.4-.2 2.5.6 2.7 1.8 1.3-.1 2.4.8 2.4 2.2v3.6c0 3.2-2.4 5.6-5.6 5.6h-3.6c-2.4 0-3.9-1-5.1-3l-3.3-5.4c-.7-1.2-.3-2.5.9-3.1 1-.5 2.1-.2 2.8.6l1.1 1.2V5.3c0-1.7 1-2.8 2.6-2.8z" fill="#ffe6d6" stroke="#2a1e2e" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    const s1 = `<span class="ab2-s1">${ph("62% 30%")}${ph("62% 30%", `<svg viewBox="0 0 76 50" class="ab2-sv"><rect x="30" y="17" width="12" height="6" rx="2" fill="#f4ecd8" stroke="#c8a060" stroke-width=".8" opacity="0"/><text x="41" y="30" font-size="16" font-weight="900" fill="#ff3355" stroke="#fff" stroke-width="2.5" paint-order="stroke">?</text></svg>`)}</span>`;
    const s2 = `<span class="ab2-s2">${ph("70% 40%", ring)}${fing}</span>`;
    const s3 = `<span class="ab2-s3"><span class="ab2-sf" style="background-image:url(img/body/c009.webp);background-position:${exPos("smile")}"></span><span class="ab2-ss">${[0, 1, 2, 3, 4].map(() => `<img src="${starImg(true)}" alt="">`).join("")}</span></span>`;
    return [[s1, "위·아래 비교"], [s2, "다른 곳 톡"], [s3, "손님 별점"]];
  },
  css: `
.mg-ab2st{background:radial-gradient(ellipse at 50% 30%,#2a2d44,#14151f 80%)!important;display:flex;align-items:center;justify-content:center}
.mg-airbnb2 .mg-steps i{min-height:56px}
.mg-airbnb2 .ab2-s1{display:flex;flex-direction:column;gap:3px}
.mg-airbnb2 .ab2-sp{position:relative;display:block;width:66px;height:44px;border-radius:5px;background:url(img/bg/airbnb.webp) 62% 30%/260% auto no-repeat;box-shadow:0 2px 6px #0007}
.mg-airbnb2 .ab2-s1 .ab2-sp{width:52px;height:27px;background-size:300% auto}
.mg-airbnb2 .ab2-s1 .ab2-sp:first-child{border:2px solid #fbfaf5;box-sizing:border-box}
.mg-airbnb2 .ab2-s1 .ab2-sp:last-child{box-shadow:0 0 0 2px #4fc3f7aa,0 2px 6px #0007}
.mg-airbnb2 .ab2-sv{position:absolute;inset:0;width:100%;height:100%}
.mg-airbnb2 .ab2-s2{position:relative;display:block}
.mg-airbnb2 .ab2-fg{position:absolute;right:-6px;bottom:-10px;width:22px;height:26px;filter:drop-shadow(0 2px 0 #0008)}
.mg-airbnb2 .ab2-s3{display:flex;flex-direction:column;align-items:center;gap:2px}
.mg-airbnb2 .ab2-sf{display:block;width:40px;height:52px;background-size:300% 346.15%;background-repeat:no-repeat;border-radius:8px;background-color:#3a3f58}
.mg-airbnb2 .ab2-ss{display:flex;gap:1px}.mg-airbnb2 .ab2-ss img{width:12px;height:12px}
.mg-airbnb2 .ab2-w{display:flex;flex-direction:column;align-items:center;gap:10px}
.mg-airbnb2 canvas.ab2-c{display:block;touch-action:none}
.mg-airbnb2 .ab2-ph{position:relative;background:#fbfaf5;padding:5px 5px 0;border-radius:3px;box-shadow:0 8px 18px #000b;transform:rotate(-1.2deg)}
.mg-airbnb2 .ab2-ph canvas{filter:sepia(.12) saturate(1.05)}
.mg-airbnb2 .ab2-ph.drop{animation:ab2drop .5s cubic-bezier(.3,1.5,.5,1)}
@keyframes ab2drop{from{transform:translateY(-60%) rotate(8deg);opacity:0}}
.mg-airbnb2 .ab2-ph>b{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#4a4450;padding:3px 2px 4px;font-weight:800;gap:6px}
.mg-airbnb2 .ab2-ph>b em{font-style:normal;color:#e07a2a;font-family:ui-monospace,monospace;font-size:11px}
.mg-airbnb2 .ab2-tape{position:absolute;left:50%;top:-7px;width:50px;height:14px;transform:translateX(-50%) rotate(3deg);background:#fff3bdb8;box-shadow:0 1px 2px #0003}
.mg-airbnb2 .ab2-now{position:relative;border-radius:3px;box-shadow:0 0 0 2px #4fc3f7aa,0 8px 18px #000b}
.mg-airbnb2 .ab2-now canvas{border-radius:3px}
.mg-airbnb2 .ab2-now.fadein canvas{animation:ab2fade .5s ease-out}
@keyframes ab2fade{from{filter:brightness(0)}}
.mg-airbnb2 .ab2-now.lp canvas{cursor:zoom-in}
.mg-airbnb2 .ab2-tag{position:absolute;left:4px;top:4px;background:#000b;color:#fff;font-size:11px;font-weight:800;padding:2px 7px;border-radius:99px;pointer-events:none;z-index:2}
.mg-airbnb2 .ab2-dots{position:absolute;right:4px;top:4px;display:flex;gap:3px;background:#000b;padding:4px 6px;border-radius:99px;pointer-events:none;z-index:2}
.mg-airbnb2 .ab2-dots i{width:8px;height:8px;border-radius:50%;background:#ffffff30;border:1px solid #ffffff90}
.mg-airbnb2 .ab2-dots i.on{background:#ff3355;border-color:#fff;animation:ab2dot .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes ab2dot{from{transform:scale(2.2)}}
.mg-airbnb2 .ab2-now.arr .ab2-tag,.mg-airbnb2 .ab2-now.arr .ab2-dots{opacity:0;transition:opacity .2s}
.mg-airbnb2 .ab2-gw{position:absolute;inset:0;overflow:hidden;border-radius:3px;pointer-events:none;z-index:1}
.mg-airbnb2 .ab2-gw::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,#0b0c1666);opacity:0;transition:opacity .4s}
.mg-airbnb2 .ab2-now.arr .ab2-gw::before{opacity:1}
.mg-airbnb2 .ab2-gst{position:absolute;bottom:0;height:84%;aspect-ratio:240/312;background-repeat:no-repeat;background-size:300% 346.15%;transform:translate(-50%,105%);transition:transform .55s cubic-bezier(.25,1.25,.5,1);filter:drop-shadow(0 4px 10px #000a)}
.mg-airbnb2 .ab2-gst.on{transform:translate(-50%,0)}
.mg-airbnb2 .ab2-gst.hop{animation:ab2hop .5s ease-out}
@keyframes ab2hop{40%{margin-bottom:5%}}
.mg-airbnb2 .ab2-gst.shk{animation:ab2shk .45s}
@keyframes ab2shk{25%{margin-left:-3%}75%{margin-left:3%}}
.mg-airbnb2 .ab2-ov{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:3}
.mg-airbnb2 .ab2-bub{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#222;font-weight:900;font-size:12.5px;padding:4px 9px;border-radius:9px;white-space:nowrap;box-shadow:0 2px 0 #0005;animation:ab2bub .35s cubic-bezier(.3,1.6,.5,1) both;z-index:3}
.mg-airbnb2 .ab2-bub::after{content:"";position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:#fff}
.mg-airbnb2 .ab2-bub.sad{background:#ffe2e2;color:#b0002a}.mg-airbnb2 .ab2-bub.sad::after{border-top-color:#ffe2e2}
@keyframes ab2bub{from{transform:translate(-50%,-60%) scale(.3);opacity:0}}
.mg-airbnb2 .ab2-stars{position:absolute;left:6px;bottom:6px;display:flex;gap:3px;background:#000c;padding:4px 8px;border-radius:99px;z-index:3}
.mg-airbnb2 .ab2-stars img{width:20px;height:19px;animation:ab2star .45s cubic-bezier(.3,1.8,.5,1) both}
@keyframes ab2star{from{transform:scale(0) rotate(-120deg);opacity:0}}
.mg-airbnb2 .ab2-noti{position:absolute;left:8px;right:8px;top:8px;z-index:25;background:#fffffff4;color:#222;border-radius:14px;padding:7px 10px;display:flex;gap:9px;align-items:center;box-shadow:0 6px 18px #0009;transform:translateY(-140%);transition:transform .35s cubic-bezier(.3,1.4,.5,1);pointer-events:none}
.mg-airbnb2 .ab2-noti.on{transform:none}
.mg-airbnb2 .ab2-noti>img{width:28px;height:28px;padding:4px;border-radius:8px;background:#4fc3f7;flex:0 0 auto;box-sizing:border-box}
.mg-airbnb2 .ab2-noti>i{width:30px;height:30px;border-radius:50%;flex:0 0 auto;background-repeat:no-repeat;background-color:#dbe8f2;background-size:510% auto;box-shadow:0 0 0 2px #4fc3f7}
.mg-airbnb2 .ab2-noti>i:empty{display:none}
.mg-airbnb2 .ab2-noti div{flex:1;min-width:0;font-size:12.5px;line-height:1.3;font-weight:700}
.mg-airbnb2 .ab2-noti div b{display:block;font-size:11px;color:#2a8ab8;font-weight:800}
.mg-airbnb2 .ab2-noti em{font-style:normal;font-size:11px;color:#999;align-self:flex-start}
.mg-airbnb2 .ab2-noti.red div b{color:#e0244a}
.mg-airbnb2 .ab2-title{position:absolute;inset:0;z-index:24;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0b0c16d0;opacity:0;pointer-events:none;transition:opacity .25s}
.mg-airbnb2 .ab2-title.on{opacity:1}
.mg-airbnb2 .ab2-title small{color:#4fc3f7;font-weight:800;font-size:13px;letter-spacing:2px}
.mg-airbnb2 .ab2-title b{font-size:27px;font-weight:900;color:#fff;margin:4px 0 8px;text-shadow:0 3px 0 #0008}
.mg-airbnb2 .ab2-title.on b{animation:mgcd .55s cubic-bezier(.2,1.6,.4,1)}
.mg-airbnb2 .ab2-title span{font-size:13px;color:#ffd166;font-weight:700}
.mg-airbnb2 .ab2-lp{position:absolute;z-index:26;width:104px;height:104px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #222,0 8px 18px #000a;display:none;pointer-events:none;transform:translate(-50%,-50%);background:#000}
.mg-airbnb2 .ab2-lp.on{display:block}
.mg-airbnb2 .ab2-hurry::after{content:"";position:absolute;inset:0;z-index:20;pointer-events:none;box-shadow:inset 0 0 46px #ff3b4f90;animation:ab2hurry .8s ease-in-out infinite}
@keyframes ab2hurry{50%{opacity:.25}}
.mg-airbnb2 .ab2-rev{position:absolute;inset:0;z-index:27;display:flex;align-items:center;justify-content:center;background:#0b0c16c8;opacity:0;transition:opacity .3s;pointer-events:none}
.mg-airbnb2 .ab2-rev.on{opacity:1}
.mg-airbnb2 .ab2-card{width:min(86%,290px);background:#fff;color:#222;border-radius:16px;padding:14px 14px 12px;box-shadow:0 14px 30px #000b;text-align:center;animation:ab2card .5s cubic-bezier(.3,1.5,.5,1) both}
@keyframes ab2card{from{transform:translateY(40px) scale(.8);opacity:0}}
.mg-airbnb2 .ab2-card small{display:flex;align-items:center;justify-content:center;gap:6px;color:#2a8ab8;font-weight:800;font-size:12px}
.mg-airbnb2 .ab2-card small img{width:20px;height:20px;padding:3px;border-radius:6px;background:#4fc3f7;box-sizing:border-box}
.mg-airbnb2 .ab2-ch{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:6px}
.mg-airbnb2 .ab2-av{width:54px;height:54px;border-radius:50%;background-repeat:no-repeat;background-color:#e4eef6;background-size:510% auto;box-shadow:0 0 0 3px #ffd166,0 4px 10px #0003;flex:0 0 auto}
.mg-airbnb2 .ab2-card .big{font-size:34px;font-weight:900;margin:0;color:#f0a830;line-height:1.1}
.mg-airbnb2 .ab2-card .big span{font-size:14px;color:#999;margin-left:3px}
.mg-airbnb2 .ab2-card q{display:block;font-size:14px;font-weight:700;margin:8px 0 10px;line-height:1.45}
.mg-airbnb2 .ab2-card ul{list-style:none;margin:0;padding:8px 0 0;border-top:1px dashed #ddd;display:flex;flex-direction:column;gap:3px;font-size:12px;color:#555}
.mg-airbnb2 .ab2-card li{display:flex;justify-content:space-between;align-items:center;gap:6px}
.mg-airbnb2 .ab2-card li>i{width:22px;height:22px;border-radius:50%;background-repeat:no-repeat;background-color:#e4eef6;background-size:510% auto;flex:0 0 auto}
.mg-airbnb2 .ab2-card li b{flex:1;text-align:left}
.mg-airbnb2 .ab2-card li span img{width:13px;height:12px}
.mg-airbnb2 .mg-foot .mg-btn{display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;padding:9px 6px}
.mg-airbnb2 .mg-foot .mg-btn img{width:22px;height:22px}
.mg-airbnb2 .mg-foot .mg-btn span{color:var(--mgg)}
.mg-airbnb2 .mg-foot .mg-btn.arm{background:#4fc3f7!important;color:#05202c!important;border-color:#4fc3f7!important;animation:ab2arm .7s ease-in-out infinite}
.mg-airbnb2 .mg-foot .mg-btn.arm span{color:#05202c}
@keyframes ab2arm{50%{box-shadow:0 0 0 4px #4fc3f755}}
.mg-airbnb2 .mg-foot .mg-btn:disabled{opacity:.4}
.mg-airbnb2 .ab2-info{flex:1.3;display:flex;flex-direction:column;justify-content:center;font-size:12px;color:var(--mgm);line-height:1.35}
.mg-airbnb2 .ab2-info b{color:var(--mgf);font-size:13.5px}
@media (prefers-reduced-motion:reduce){.mg-airbnb2 .ab2-hurry::after,.mg-airbnb2 .mg-btn.arm,.mg-airbnb2 .ab2-gst.hop,.mg-airbnb2 .ab2-gst.shk{animation:none}}
`,
  run(host, ez, finish, skill = 0) {
    const T = ROOM_T * ez;
    let lpLeft = 1 + (skill >= 60 ? 1 : 0);
    const F = frame(host, "airbnb2", "인간 돋보기", "mg-ab2st", "", `<button class="mg-btn" data-lp><img src="${loupeIcon()}" alt="">돋보기 <span>${lpLeft}</span></button><div class="ab2-info"><span>지금 방에서</span><b>다른 곳 5개 찾기</b></div>`);
    const dateS = `'${String(24 + rint(2))}.${String(1 + rint(12)).padStart(2, "0")}.${String(1 + rint(28)).padStart(2, "0")}`;
    F.stage.insertAdjacentHTML("beforeend", `<div class="ab2-w"><div class="ab2-ph"><i class="ab2-tape"></i><canvas class="ab2-c ab2-t" width="${W}" height="${H}"></canvas><b><span>지난번 손님 맞이 사진 · 완벽!</span><em>${dateS}</em></b></div>
      <div class="ab2-now"><canvas class="ab2-c ab2-b" width="${W}" height="${H}"></canvas><div class="ab2-gw"><div class="ab2-gst"></div></div><span class="ab2-tag">지금 방</span><span class="ab2-dots">${"<i></i>".repeat(ND)}</span><div class="ab2-ov"></div></div></div>
      <div class="ab2-noti"><img src="${houseIcon()}" alt=""><i></i><div><b>에어씨앤씨</b><span></span></div><em>지금</em></div><div class="ab2-title"></div>
      <canvas class="ab2-lp"></canvas><canvas class="ab2-lp"></canvas><div class="ab2-rev"></div>`);
    const $ = (s) => F.stage.querySelector(s);
    const cvT = $(".ab2-t"), cvB = $(".ab2-b"), gT = cvT.getContext("2d"), gB = cvB.getContext("2d"), ph = $(".ab2-ph"), now = $(".ab2-now"), ov = $(".ab2-ov"), dots = [...F.stage.querySelectorAll(".ab2-dots i")];
    const noti = $(".ab2-noti"), notiT = noti.querySelector("span"), notiF = noti.querySelector("i"), title = $(".ab2-title"), rev = $(".ab2-rev"), [lpT, lpB] = F.stage.querySelectorAll(".ab2-lp"), lpBtn = F.foot.querySelector("[data-lp]"), info = F.foot.querySelector(".ab2-info");
    const gstEl = $(".ab2-gst");
    // 크기: 두 장이 무대에 들어가게. 캔버스는 기기 해상도(S = 장면 1단위당 픽셀)
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let S = 4;
    const sT = mkC(W, H), sB = mkC(W, H), gs = sB.getContext("2d"), gts = sT.getContext("2d");
    const fit = () => {
      const sw = F.stage.clientWidth, sh2 = F.stage.clientHeight; if (!sw || !sh2) return;
      const K = Math.max(1, Math.min((sw - 24) / W, (sh2 - 54) / (2 * H)));
      for (const c of [cvT, cvB]) { c.style.width = Math.round(W * K) + "px"; c.style.height = Math.round(H * K) + "px"; }
      const nS = clamp(Math.ceil(K * DPR), 2, 8);
      if (nS !== S || cvT.width !== W * nS) { S = nS; for (const c of [cvT, cvB, sT, sB]) { c.width = W * S; c.height = H * S; } for (const L of [lpT, lpB]) { L.width = L.height = Math.round(104 * DPR); } }
    };
    fit(); requestAnimationFrame(fit);
    // 그림 미리 받기: 방 그림 3장 + 손님 2명
    const order = shuffle(ROOMS).slice(0, NR), gkeys = shuffle(GUESTS).slice(0, NR);
    const bgP = ["img/bg/airbnb.webp", "img/bg/home.webp", "img/bg/partyroom.webp"].map((s) => loadImg(s).p);
    const gImg = gkeys.map((k) => loadImg("img/body/" + k + ".webp"));
    const faceCss = (k, ex) => `background-image:url(img/body/${k}.webp);background-position:${faceBg(ex)}`;
    let ri = -1, R = null, flip = false, phase = "intro", ph0 = 0, tt = 0, done = false, raf = 0, penalty = 0, misses = 0, lastMiss = -9, ev = 0, lpOn = false, lpArm = false, lpT0 = 0, lpP = null, guest = null;
    const res = [];
    const fxs = [], xs = [], hearts = [];
    const left = () => (phase === "play" ? Math.max(0, T - (tt - ph0) - penalty) : phase === "intro" ? T : 0);
    const found = () => (R ? R.slots.filter((s) => s.ch && s.fx).length : 0);
    const upd = () => { const f = found(); F.sc.textContent = `방 ${ri + 1}/${NR} · ${f}/${ND}`; dots.forEach((d, i) => d.classList.toggle("on", i < f)); };
    const notify = (t, red, face) => { notiT.textContent = t; noti.classList.toggle("red", !!red); if (face) { notiF.textContent = " "; notiF.style.cssText = face; } else notiF.textContent = ""; noti.classList.add("on"); tone(1318, 0.07, "sine", 0.1); tone(1760, 0.12, "sine", 0.1, 0, 0.09); vib(20); clearTimeout(notify.t); notify.t = setTimeout(() => noti.classList.remove("on"), 2100); };
    // 좌표: 화면 → 장면(좌우 뒤집힘 반영), 장면 → 무대
    const toScene = (e, cv) => { const r = cv.getBoundingClientRect(); let x = ((e.clientX - r.left) / r.width) * W; const y = ((e.clientY - r.top) / r.height) * H; if (flip) x = W - x; return [x, y]; };
    const stXY = (cv, sx, sy) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(), dx = flip ? W - sx : sx; return [r.left - s.left + (dx / W) * r.width, r.top - s.top + (sy / H) * r.height]; };
    const cen = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];
    const stars = (x, y, n, sp = 10) => { for (let i = 0; i < n; i++) fxs.push({ x: x + (rnd() - 0.5) * sp * 2, y: y + (rnd() - 0.5) * sp, t0: tt + rnd() * 0.2, l: 0.45 + rnd() * 0.3 }); };
    // 반짝이(네 갈래 빛)
    const star = (g, x, y, p) => {
      const k = (p < 0.5 ? p : 1 - p) * 5 + 0.4; g.save(); g.globalAlpha = 1 - p * 0.4; g.translate(x, y); g.rotate(p * 1.2);
      g.fillStyle = "#fff3a0"; g.beginPath(); g.moveTo(0, -k); g.quadraticCurveTo(0.25, -0.25, k, 0); g.quadraticCurveTo(0.25, 0.25, 0, k); g.quadraticCurveTo(-0.25, 0.25, -k, 0); g.quadraticCurveTo(-0.25, -0.25, 0, -k); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 0.35, 0, 6.283); g.fill(); g.restore();
    };
    // 손으로 그린 듯한 동그라미(살짝 넘치게, 붓 굵기)
    const ring = (g, b, prog, col, seed) => {
      const [cx, cy] = cen(b), rx = b[2] / 2 + 1.6, ry = b[3] / 2 + 1.6, n = 60, m = Math.ceil(n * clamp(prog, 0, 1) * 1.08);
      if (m < 2) return;
      const path = () => { g.beginPath(); for (let i = 0; i <= m; i++) { const a = -2.2 + (i / n) * 6.283, wob = 1 + 0.07 * Math.sin(a * 3 + seed), x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob; i ? g.lineTo(x, y) : g.moveTo(x, y); } };
      g.save(); g.lineCap = "round"; g.lineJoin = "round";
      path(); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.25; g.stroke();
      path(); g.strokeStyle = col; g.lineWidth = 0.7; g.stroke(); g.restore();
    };
    const heart = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.3, y, x - s * 0.7, y - s * 0.9, x, y - s * 0.25); g.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.3, y, x, y + s * 0.9); g.fill(); };
    const blit = (g, src) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); if (flip) g.setTransform(-1, 0, 0, 1, g.canvas.width, 0); g.drawImage(src, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); };
    // ── 방 시작: 제목 카드 → 사진이 툭 → 지금 방
    const startRoom = () => {
      ri++; R = mkRoom(order[ri]); R.S = S; R.gk = gkeys[ri]; flip = rnd() < 0.5; penalty = 0; ev = 0; guest = null; fxs.length = 0; xs.length = 0; hearts.length = 0; ov.innerHTML = ""; now.classList.remove("arr");
      gstEl.className = "ab2-gst"; gstEl.style.cssText = "";
      F.stage.classList.remove("ab2-hurry"); F.bar.parentElement.classList.remove("warn");
      const pool = shuffle(R.slots); pool.slice(0, ND).forEach((s) => { s.ch = true; s.fx = false; s.seed = rnd() * 6; });
      R.top = null;
      title.innerHTML = `<small>방 ${ri + 1} / ${NR}</small><b>${R.n}</b><span>체크인까지 ${Math.round(T)}초</span>`; title.classList.add("on");
      info.innerHTML = `<span>방 ${ri + 1}/${NR} · ${R.n}</span><b>다른 곳 5개 찾기</b>`;
      phase = "intro"; ph0 = tt; upd(); F.bar.style.transform = "scaleX(1)";
      SFX.whoosh();
      // 그림이 늦으면 조금 더 기다린다(최대 4초, 못 받으면 단색 방)
      const t0 = performance.now();
      const go = () => {
        if (!cvB.isConnected) return;
        if (!R.ld.ok && !R.ld.fail && performance.now() - t0 < 4000) { setTimeout(go, 120); return; }
        R.bc = null; R.sm = null;
        title.classList.remove("on"); ph.classList.remove("drop"); void ph.offsetWidth; ph.classList.add("drop"); noise(0.05, 3200, 0.1); tone(1400, 0.04, "square", 0.05, 0, 0.05); now.classList.remove("fadein"); void now.offsetWidth; now.classList.add("fadein");
        setTimeout(() => { if (!cvB.isConnected || done) return; phase = "play"; ph0 = tt; F.msg("사진과 다른 곳을 아래에서 톡!"); }, 450);
      };
      setTimeout(go, 900);
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
      for (const [lp, cv] of [[lpT, cvT], [lpB, cvB]]) {
        const g = lp.getContext("2d"), dx = flip ? W - sx : sx, k = cv.width / W; g.imageSmoothingQuality = "high"; g.fillStyle = "#000"; g.fillRect(0, 0, lp.width, lp.height);
        g.drawImage(cv, (dx - 13) * k, (sy - 13) * k, 26 * k, 26 * k, 0, 0, lp.width, lp.height);
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
    // ── 손님 등장: 캐릭터 그림이 아래에서 올라와 표정으로 반응
    const setEx = (ex) => { if (guest) guest.ex = ex; gstEl.style.backgroundPosition = exPos(ex); };
    const arrive = () => {
      phase = "arrive"; ph0 = tt; now.classList.add("arr"); lpEnd(); lpArm = false; lpBtn.classList.remove("arm"); now.classList.remove("lp"); F.stage.classList.remove("ab2-hurry"); F.bar.parentElement.classList.remove("warn");
      const r = res[res.length - 1], st = clamp(r.f, 1, 5);
      r.st = st; r.gk = R.gk;
      const gi = gImg[ri], gx = R.gx;
      guest = { st, gx, ok: gi.ok, ex: "neutral" };
      r.ex = st >= 4 ? "smile" : st === 3 ? "neutral" : st === 2 ? "sad" : "angry";
      tone(988, 0.3, "sine", 0.16); tone(784, 0.45, "sine", 0.16, 0, 0.3); vib([20, 60, 20]);
      setTimeout(() => { if (cvB.isConnected) for (let k = 0; k < 8; k++) noise(0.035, 260 + rnd() * 160, 0.1, k * 0.07, 3); }, 500);
      if (gi.ok) { gstEl.style.backgroundImage = `url("${gi.im.src}")`; gstEl.style.left = (gx / W) * 100 + "%"; setEx("neutral"); setTimeout(() => { if (cvB.isConnected) gstEl.classList.add("on"); }, 650); }
      setTimeout(() => {
        if (!cvB.isConnected) return;
        const lines = { 5: ["와아~ 사진이랑 똑같아요!", "완벽해요! 호텔인 줄", "우와, 반짝반짝!"], 4: ["우와 깔끔해요~", "좋은데요? 마음에 들어요"], 3: ["음… 괜찮네요", "나쁘지 않아요"], 2: ["어… 이건 뭐죠?", "사진이랑 좀 다른데요?"], 1: ["청소… 하신 거 맞죠?", "사진이랑 너무 달라요!"] };
        // 표정: 5점은 놀랐다가 활짝, 4 웃음, 3 무표정, 2 슬픔, 1 화남
        if (st === 5) { setEx("surprised"); setTimeout(() => cvB.isConnected && setEx("smile"), 650); } else setEx(r.ex);
        gstEl.classList.remove("hop", "shk"); void gstEl.offsetWidth; gstEl.classList.add(st >= 4 ? "hop" : st <= 2 ? "shk" : "x");
        const bx = gi.ok ? clamp((gx / W) * 100, 22, 78) : 50, by = gi.ok ? 19 : 45;
        ov.insertAdjacentHTML("beforeend", `<div class="ab2-bub ${st <= 2 ? "sad" : ""}" style="left:${bx}%;top:${by}%">${pick(lines[st])}</div><div class="ab2-stars">${[0, 1, 2, 3, 4].map((i) => `<img src="${starImg(i < st)}" alt="" style="animation-delay:${0.25 + i * 0.13}s">`).join("")}</div>`);
        if (st >= 4) { const hx = flip ? W - gx : gx; for (let k = 0; k < 7; k++) hearts.push({ x: hx + (rnd() - 0.5) * 18, y: H * 0.32, t0: tt + k * 0.12 }); }
        else if (st <= 2) SFX.fail();
        for (let i = 0; i < 5; i++) setTimeout(() => { if (!cvB.isConnected) return; if (i < st) SFX.ding(i); else tone(220, 0.06, "square", 0.05); }, 250 + i * 130);
      }, 1700);
      setTimeout(() => { if (!cvB.isConnected || done) return; if (ri + 1 < NR) startRoom(); else review(); }, 3900);
    };
    // ── 마지막: 손님 리뷰 카드 → 결과
    const review = () => {
      phase = "end"; const tf = res.reduce((a, r) => a + r.f, 0), avg = res.reduce((a, r) => a + r.st, 0) / res.length;
      const q = avg >= 4.6 ? "사진이랑 똑같아요. 사장님 손이 보이는 숙소!" : avg >= 3.6 ? "깔끔하고 편했어요. 또 올게요~" : avg >= 2.6 ? "괜찮았는데 군데군데 아쉬웠어요." : "사진이랑 너무 달라서 당황했어요…";
      const on = starImg(true), off = starImg(false), last = res[res.length - 1], avEx = avg >= 3.6 ? "smile" : avg >= 2.6 ? "neutral" : avg >= 1.6 ? "sad" : "angry";
      const av = gImg[res.length - 1] && gImg[res.length - 1].ok ? `<i class="ab2-av" style="${faceCss(last.gk, avEx)}"></i>` : "";
      rev.innerHTML = `<div class="ab2-card"><small><img src="${houseIcon()}" alt="">에어씨앤씨 · 새 리뷰</small><div class="ab2-ch">${av}<div class="big">★ ${avg.toFixed(1)}<span>/ 5</span></div></div><q>${q}</q><ul>${res.map((r, i) => `<li>${gImg[i] && gImg[i].ok ? `<i style="${faceCss(r.gk, r.ex)}"></i>` : ""}<b>${r.n}</b><span>${[0, 1, 2, 3, 4].map((k) => `<img src="${k < r.st ? on : off}" alt="">`).join("")}</span></li>`).join("")}</ul></div>`;
      rev.classList.add("on"); SFX.end(); vib(25);
      const spd = res.reduce((a, r) => a + (r.f >= ND ? clamp(r.left / T / 0.45, 0, 1) : 0), 0) / res.length, fr = tf / (ND * NR), acc = tf ? clamp(1 - misses * 0.07, 0, 1) : 0;
      const s = fr * 0.65 + spd * 0.2 + acc * 0.15;
      setTimeout(() => { done = true; cancelAnimationFrame(raf); finish(s, `찾은 곳 <b>${tf}/${ND * NR}</b> · 평균 별점 <b>★${avg.toFixed(1)}</b>${misses ? ` · 헛손질 ${misses}번` : ""}`, "", [["찾은 곳", fr], ["속도", spd], ["정확도", acc]]); }, 2600);
    };
    // ── 그리기
    const render = () => {
      if (!R) return;
      if (R.S !== S) { R.S = S; R.top = null; }
      const toUnit = (g) => g.setTransform(S, 0, 0, S, 0, 0);
      // 위: 완벽했던 사진 + 찾은 곳 동그라미
      if (!R.top && (R.ld.ok || R.ld.fail)) { R.top = mkC(W * S, H * S); const tg = R.top.getContext("2d"); toUnit(tg); paint(tg, R, () => 0); tg.fillStyle = "rgba(255,236,200,.06)"; tg.fillRect(0, 0, W, H); }
      gts.setTransform(1, 0, 0, 1, 0, 0); gts.clearRect(0, 0, sT.width, sT.height);
      if (R.top) gts.drawImage(R.top, 0, 0);
      toUnit(gts);
      for (const s of R.slots) if (s.ch && s.fx) ring(gts, s.at, (tt - s.fxT) / 0.22, "#ff3355", s.seed);
      // 아래: 지금 방
      gs.setTransform(1, 0, 0, 1, 0, 0); gs.clearRect(0, 0, sB.width, sB.height); toUnit(gs);
      if (R.top || R.ld.ok || R.ld.fail) paint(gs, R, (s) => (s.ch ? (s.fx ? clamp(1 - (tt - s.fxT - 0.2) / 0.3, 0, 1) : 1) : 0));
      // 손님이 문 앞(마지막 순간): 문 쪽에서 그림자가 어른거림
      if (phase === "play" && left() / T < 0.18) { const a = 0.12 + 0.08 * Math.sin(tt * 9); gs.fillStyle = `rgba(20,10,30,${a})`; gs.fillRect(0, 0, W, H); }
      for (const s of R.slots) {
        if (!s.ch) continue;
        if (s.fx) ring(gs, s.at, (tt - s.fxT) / 0.22, "#ff3355", s.seed);
        else if (phase === "reveal" && Math.floor((tt - ph0) * 6) % 2 === 0) { ring(gs, s.box[s.box.length - 1], 1, "#ffd23f", s.seed); ring(gts, s.box[s.box.length - 1], 1, "#ffd23f", s.seed); }
      }
      for (const m of xs) { const p = (tt - m.t0) / 0.7; if (p > 1) continue; gs.save(); gs.globalAlpha = 1 - p; gs.lineCap = "round"; for (const [c, w] of [["rgba(255,255,255,.85)", 1.1], ["#ff2244", 0.6]]) { gs.strokeStyle = c; gs.lineWidth = w; gs.beginPath(); gs.moveTo(m.x - 2.2, m.y - 2.2); gs.lineTo(m.x + 2.2, m.y + 2.2); gs.moveTo(m.x + 2.2, m.y - 2.2); gs.lineTo(m.x - 2.2, m.y + 2.2); gs.stroke(); } gs.restore(); }
      for (const s of fxs) { const p = (tt - s.t0) / s.l; if (p >= 0 && p <= 1) star(gs, s.x, s.y, p); }
      for (const h of hearts) { const p = (tt - h.t0) / 1.1; if (p < 0 || p > 1) continue; gs.globalAlpha = 1 - p; gs.fillStyle = "#ff4a7a"; heart(gs, h.x + Math.sin(p * 9) * 1.5, h.y - p * 14, 1.6); gs.globalAlpha = 1; }
      // 다 찾으면 빛줄기
      if (phase === "clear") { const p = (tt - ph0) / 0.8, x0 = -40 + p * 200; gs.save(); gs.globalCompositeOperation = "lighter"; gs.fillStyle = "rgba(255,255,235,.32)"; gs.beginPath(); gs.moveTo(x0, 0); gs.lineTo(x0 + 18, 0); gs.lineTo(x0 - 22, H); gs.lineTo(x0 - 40, H); gs.closePath(); gs.fill(); gs.restore(); }
      if (phase === "intro") { gs.fillStyle = "rgba(10,10,20,.55)"; gs.fillRect(0, 0, W, H); }
      gs.setTransform(1, 0, 0, 1, 0, 0); gts.setTransform(1, 0, 0, 1, 0, 0);
      blit(gT, sT); blit(gB, sB);
      if (lpOn && lpP) lpShow(lpP.x, lpP.y);
    };
    let lastS = -1;
    const loop = (nowT) => {
      if (done || !cvB.isConnected) return;
      const nt = (nowT - t0) / 1000; tt = nt;
      fit();
      for (let i = fxs.length - 1; i >= 0; i--) if (tt - fxs[i].t0 > fxs[i].l) fxs.splice(i, 1);
      if (phase === "play") {
        const l = left(), f = l / T;
        F.bar.style.transform = `scaleX(${clamp(f, 0, 1)})`;
        const gf = gImg[ri] && gImg[ri].ok ? faceCss(R.gk, ev === 0 ? "neutral" : "surprised") : null;
        if (ev === 0 && f < 0.6) { ev = 1; for (let k = 0; k < 12; k++) noise(0.04, 240 + rnd() * 180, 0.13, k * 0.085, 3); notify("손님이 숙소 근처에 도착했어요 (5분 전)", false, gf); F.msg("복도에서 캐리어 소리… 드르륵"); }
        if (ev === 1 && f < 0.32) { ev = 2; [0, 0.16, 0.32].forEach((a) => noise(0.06, 180, 0.35, a, 2)); notify("손님: 문 앞이에요~ 들어가도 되죠?", true, gf); vib([30, 50, 30]); F.stage.classList.add("ab2-hurry"); F.bar.parentElement.classList.add("warn"); }
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
      st: () => ({ phase, room: ri, name: R && R.n, found: found(), misses, left: +left().toFixed(1), S, img: R && R.ld.ok }),
      tgt: () => { const s = R && R.slots.find((q) => q.ch && !q.fx); if (!s) return null; const c = cen(s.box[s.box.length - 1]), r = cvB.getBoundingClientRect(); return [r.left + ((flip ? W - c[0] : c[0]) / W) * r.width, r.top + (c[1] / H) * r.height, cvB]; },
      hit: () => { if (!R) return false; const s = R.slots.find((q) => q.ch && !q.fx); if (!s) return false; const c = cen(s.box[s.box.length - 1]); tapAt(c[0], c[1]); return true; },
      miss: () => { for (let k = 0; k < 200; k++) { const x = 2 + rnd() * (W - 4), y = 2 + rnd() * (H - 4); if (R.slots.every((s) => s.box.every((b) => x < b[0] - 5 || x > b[0] + b[2] + 5 || y < b[1] - 5 || y > b[1] + b[3] + 5))) { tapAt(x, y); return true; } } return false; },
      loupe: (x = 60, y = 50) => { lpArm = true; lpOn = true; lpT0 = tt; lpP = { id: -1, cv: cvB, x, y }; },
      // 점검용: 방 i 의 다른 곳을 전부 켠 채 멈춰 보기(위=완벽, 아래=전부 달라짐)
      peek: (i = 0) => { if ((R && R.pk === i) || (phase !== "play" && phase !== "peek")) return; R = mkRoom(ROOMS[i]); R.pk = i; R.S = S; flip = false; title.classList.remove("on"); R.slots.forEach((s) => { s.ch = true; s.fx = false; }); phase = "peek"; R.ld.p.then(() => { R.bc = null; R.sm = null; R.top = null; }); },
    };
    const t0 = performance.now();
    Promise.all(bgP); // 미리 받기만
    startRoom();
    raf = requestAnimationFrame(loop);
  },
};
