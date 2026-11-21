// 무인카페 2탄: 사장님은 원격 중 (논리 160x200~250, 캔버스는 기기 해상도: 손님·사장은 캐릭터 그림(표정), 창밖은 실제 거리 그림, 재고·말풍선·표시는 벡터. 가게 배치는 그대로 두어 알아보기 쉽게)
// 폭염 낮, 손님이 문 → 키오스크 → 커피 머신 → 문으로 다닌다. 아래 재고 칸(얼음·컵·원두·우유·빨대)을
// 창고 상자로 채우고, 가끔 생기는 사고(얼음 기계 고장·쏟은 음료·에어컨 꺼짐)를 처리한다.
// 끝나면 프린터에서 오늘 매출 영수증이 쭉 나온다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, FL = 54, T = 30;
// 세로 길이는 무대 비율에 맞춰 200~290 (바닥이 길어진다). 재고 칸은 늘 맨 아래 50픽셀
let H = 200, PY = 150;
// 재고: 이름, 칸 최대, 사장이 들고 오는 자리(x)
const ITEMS = [
  { id: "ice", n: "얼음", max: 6, st: 92 },
  { id: "cup", n: "컵", max: 8, st: 126 },
  { id: "bean", n: "원두", max: 8, st: 70 },
  { id: "milk", n: "우유", max: 6, st: 110 },
  { id: "straw", n: "빨대", max: 8, st: 143 },
];
const ORD = {
  aa: { n: "아이스 아메리카노", need: ["cup", "bean", "ice", "straw"], price: 2500 },
  al: { n: "아이스 라떼", need: ["cup", "bean", "ice", "milk", "straw"], price: 3500 },
  hl: { n: "따뜻한 라떼", need: ["cup", "bean", "milk"], price: 3500 },
};
const NO_LINE = { ice: "얼음이 없잖아!", cup: "컵이 없어요?", bean: "원두 품절?!", milk: "우유가 없네…", straw: "빨대 어딨어!" };
const SP = { door: [17, 60], kio: [44, 66], mac: [72, 66] };
// 3x5 숫자
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
const ANG = [".X.X.", "XX.XX", ".....", "XX.XX", ".X.X."];
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
const won = (n) => n.toLocaleString("ko-KR");

// 도트 한 장(둘레 1픽셀 자리 + 어두운 테두리)
function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); });
  if (ol) uOutline(c); return c;
}
// 재고 아이콘 16x16
const ICON = {
  ice: (P) => { P(1, 8, 14, 7, "#aebccb"); P(1, 8, 14, 1, "#e4ecf4"); P(2, 14, 12, 1, "#7f8c9a"); P(14, 9, 1, 5, "#8f9cab"); for (const [x, y] of [[2, 4], [6, 2], [10, 4], [4, 6], [8, 5], [11, 7]]) { P(x, y, 3, 3, "#d8f2ff"); P(x, y, 3, 1, "#ffffff"); P(x + 2, y + 1, 1, 2, "#9cc8e4"); } },
  cup: (P) => { P(5, 0, 6, 1, "#ffffff"); P(3, 1, 10, 2, "#eef6fb"); P(3, 2, 10, 1, "#c8dbe6"); for (let r = 0; r < 12; r++) { const i = Math.floor(r / 6); P(4 + i, 3 + r, 8 - 2 * i, 1, "#dcecf4"); } P(4, 3, 1, 6, "#ffffff"); P(5, 9, 1, 6, "#ffffff"); P(11, 3, 1, 6, "#a8c8d8"); P(10, 9, 1, 6, "#a8c8d8"); P(5, 7, 6, 2, "#5fbf8f"); P(7, 7, 2, 1, "#ffffff"); },
  bean: (P) => { P(3, 3, 10, 12, "#9a6a3e"); P(3, 3, 10, 1, "#b8834e"); P(3, 1, 10, 2, "#7a4e2a"); P(5, 1, 6, 1, "#c9a050"); P(12, 4, 1, 11, "#7a4e2a"); P(5, 7, 6, 6, "#f2e6c8"); P(6, 9, 4, 2, "#6a3c1e"); P(7, 8, 2, 4, "#6a3c1e"); P(8, 8, 1, 4, "#3a1e0c"); },
  milk: (P) => { P(4, 5, 8, 10, "#f6f6fa"); P(5, 3, 6, 2, "#e6e6ee"); P(6, 2, 4, 1, "#d8d8e4"); P(7, 1, 2, 1, "#4f8ad9"); P(4, 9, 8, 3, "#4f8ad9"); P(4, 9, 8, 1, "#7fb0f0"); P(11, 5, 1, 10, "#c8c8d6"); P(5, 6, 2, 1, "#ffffff"); P(6, 13, 4, 1, "#d8d8e4"); },
  straw: (P) => { for (let k = 0; k < 5; k++) { const x = 4 + k * 2, top = 1 + (k % 2) * 2; for (let y = top; y < 10; y++) P(x, y, 1, 1, (y - top) % 3 === 0 ? "#ffffff" : k % 2 ? "#ff5a6a" : "#3fb8e0"); } P(3, 9, 10, 6, "#4a5a6a"); P(3, 9, 10, 1, "#6a7a8a"); P(12, 10, 1, 5, "#3a4a5a"); P(5, 11, 6, 2, "#7fe0b0"); },
};
const BOX = (P) => { P(0, 1, 8, 6, "#c8955a"); P(0, 1, 8, 1, "#e0b07a"); P(3, 0, 2, 7, "#ecdcaa"); P(7, 2, 1, 5, "#a8763e"); P(1, 3, 1, 1, "#a8763e"); };
// 주문 그림 7x10 (테두리 없음)
const DRINK = {
  aa: (P) => { P(1, 0, 1, 3, "#ff5a6a"); P(0, 2, 7, 1, "#ffffff"); P(1, 3, 5, 7, "#d8ecf4"); P(1, 5, 5, 5, "#5a3018"); P(2, 5, 1, 1, "#e8f8ff"); P(4, 6, 1, 1, "#e8f8ff"); P(2, 8, 1, 1, "#e8f8ff"); P(5, 3, 1, 7, "#b8d0dc"); },
  al: (P) => { P(1, 0, 1, 3, "#3fb8e0"); P(0, 2, 7, 1, "#ffffff"); P(1, 3, 5, 7, "#d8ecf4"); P(1, 5, 5, 2, "#f2e6d0"); P(1, 7, 5, 3, "#b07a4a"); P(2, 5, 1, 1, "#ffffff"); P(4, 6, 1, 1, "#ffffff"); P(5, 3, 1, 7, "#b8d0dc"); },
  hl: (P) => { P(2, 0, 1, 2, "#d8d8d8"); P(4, 0, 1, 1, "#d8d8d8"); P(0, 3, 7, 1, "#ffffff"); P(1, 4, 5, 6, "#f6f2ea"); P(1, 6, 5, 2, "#a8743e"); P(5, 4, 1, 6, "#d8d0c0"); },
};
// 벡터 아이콘(32x32): 재고 5종
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
const ICSVG = {
  ice: `<defs><linearGradient id="i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9cd2f0"/></linearGradient></defs><path d="M3 16h26l-2 13H5z" fill="#aebccb" stroke="#6f7c8a" stroke-width="1"/><path d="M3 16h26" stroke="#e4ecf4" stroke-width="1.6"/>${[[6, 7, -8], [13, 4, 10], [20, 7, -4], [9, 12, 6], [17, 11, -10]].map(([x, y, r]) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.6" transform="rotate(${r} ${x + 3.5} ${y + 3.5})" fill="url(#i)" stroke="#7fb4d6" stroke-width=".8"/>`).join("")}`,
  cup: `<defs><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c8dce8"/></linearGradient></defs><path d="M7 6h18l-2.4 23H9.4z" fill="url(#c)" stroke="#8aa8b8" stroke-width="1"/><rect x="5" y="3" width="22" height="4" rx="1.6" fill="#eef6fb" stroke="#8aa8b8" stroke-width="1"/><path d="M8.4 14h15.2l-.6 6H9z" fill="#5fbf8f"/><path d="M10 9l1 17" stroke="#fff" stroke-width="1.4" opacity=".8"/>`,
  bean: `<rect x="6" y="6" width="20" height="23" rx="3" fill="#9a6a3e" stroke="#5a3a1a" stroke-width="1"/><path d="M6 9h20" stroke="#7a4e2a" stroke-width="3"/><rect x="11" y="3" width="10" height="4" rx="1" fill="#c9a050"/><rect x="10" y="13" width="12" height="12" rx="2" fill="#f2e6c8"/><ellipse cx="16" cy="19" rx="3.4" ry="4.4" fill="#6a3c1e" transform="rotate(20 16 19)"/><path d="M14.6 15.4q2.4 3.6 0 7.4" stroke="#f2e6c8" stroke-width="1" fill="none"/>`,
  milk: `<path d="M9 10l3-5h8l3 5v18a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" fill="#f8f8fc" stroke="#9aa4b8" stroke-width="1"/><path d="M12 5h8" stroke="#4f8ad9" stroke-width="2"/><rect x="9" y="15" width="14" height="7" fill="#4f8ad9"/><path d="M9 15h14" stroke="#9fc6ff" stroke-width="1"/><text x="16" y="21" font-size="5" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">MILK</text><path d="M11 11v14" stroke="#fff" stroke-width="1.4"/>`,
  straw: `${[0, 1, 2, 3, 4].map((k) => `<path d="M${9 + k * 3.4} ${17}V${3 + (k % 2) * 3}" stroke="${k % 2 ? "#ff5a6a" : "#3fb8e0"}" stroke-width="2.2" stroke-linecap="round"/><path d="M${9 + k * 3.4} ${7 + (k % 2) * 3}v1.6M${9 + k * 3.4} ${12 + (k % 2) * 2}v1.6" stroke="#fff" stroke-width="2.2"/>`).join("")}<rect x="5" y="16" width="22" height="13" rx="2.4" fill="#4a5a6a" stroke="#2a3a4a" stroke-width="1"/><rect x="9" y="20" width="14" height="5" rx="1.4" fill="#7fe0b0"/>`,
};
const icoImg = (k) => { const im = new Image(); im.src = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${ICSVG[k]}</svg>`); return im; };
// 주문 음료(벡터, 캔버스에 직접): x,y 왼쪽 위, 7x10 칸
function drinkV(g, k, x, y) {
  g.save(); g.translate(x, y);
  const ice = k !== "hl";
  if (ice) { g.strokeStyle = k === "aa" ? "#ff5a6a" : "#3fb8e0"; g.lineWidth = 0.8; g.lineCap = "round"; g.beginPath(); g.moveTo(2, 3); g.lineTo(1.4, -0.4); g.stroke(); }
  g.beginPath(); g.moveTo(0.4, 2.6); g.lineTo(6.6, 2.6); g.lineTo(5.8, 10); g.lineTo(1.2, 10); g.closePath(); g.fillStyle = ice ? "#d8ecf4" : "#f6f2ea"; g.fill(); g.strokeStyle = "#8aa0ac"; g.lineWidth = 0.4; g.stroke();
  g.beginPath(); g.moveTo(0.8, 5); g.lineTo(6.2, 5); g.lineTo(5.8, 10); g.lineTo(1.2, 10); g.closePath(); g.fillStyle = k === "aa" ? "#5a3018" : k === "al" ? "#b07a4a" : "#a8743e"; g.fill();
  if (k === "al") { g.fillStyle = "#f2e6d0"; g.fillRect(0.8, 5, 5.4, 1.6); }
  if (ice) { g.fillStyle = "#ffffffcc"; [[1.8, 5.8], [4, 7], [2.4, 8.4]].forEach(([a, b]) => { g.fillRect(a, b, 1.1, 1.1); }); }
  else { g.strokeStyle = "#d0d0d0"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(2.4, 1.8); g.quadraticCurveTo(3.4, 0.8, 2.6, -0.6); g.moveTo(4.4, 1.8); g.quadraticCurveTo(5.4, 0.6, 4.6, -0.6); g.stroke(); }
  g.fillStyle = "#ffffff"; g.fillRect(0.2, 2.2, 6.6, 0.7);
  g.restore();
}
function boxV(g, x, y) { // 8x7
  g.save(); g.fillStyle = "#c8955a"; g.beginPath(); g.roundRect ? g.roundRect(x, y + 1, 8, 6, 0.8) : g.rect(x, y + 1, 8, 6); g.fill(); g.fillStyle = "#e0b07a"; g.fillRect(x, y + 1, 8, 1); g.fillStyle = "#ecdcaa"; g.fillRect(x + 3.2, y + 0.6, 1.6, 6.4); g.strokeStyle = "#8a5a2a"; g.lineWidth = 0.35; g.strokeRect(x + 0.2, y + 1.2, 7.6, 5.6); g.restore();
}
function stepPics() {
  const ic = (k, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${ICSVG[k].replace(/id="(\w)"/g, 'id="$1s"').replace(/url\(#(\w)\)/g, "url(#$1s)")}</g>`;
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#dcefe6"/><rect y="40" width="80" height="28" fill="#efdcb8"/><rect x="6" y="10" width="20" height="30" rx="2" fill="#4a5560"/><rect x="8" y="12" width="16" height="28" fill="#bfe6f2"/>
    <g transform="translate(34 16)"><circle cx="10" cy="9" r="7" fill="#f5d0b0"/><path d="M3 8a7 7 0 0 1 14 0c-2-3-11-3-14 0z" fill="#3b2a1e"/><path d="M0 34c0-9 4-15 10-15s10 6 10 15z" fill="#5b8fd8"/><circle cx="7.6" cy="10" r=".9" fill="#222"/><circle cx="12.4" cy="10" r=".9" fill="#222"/><path d="M8 13q2 1.6 4 0" stroke="#a84040" stroke-width=".8" fill="none"/></g>
    <g transform="translate(58 8)"><rect width="16" height="17" rx="4" fill="#fff" stroke="#1c1c24"/><path d="M4 19l2-3h3z" fill="#fff" stroke="#1c1c24" stroke-width=".8"/><path d="M5 5h6l-.8 9H5.8z" fill="#d8ecf4"/><path d="M5.2 8h5.6l-.5 6H5.8z" fill="#5a3018"/></g></svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#3b2b20"/><rect x="8" y="8" width="34" height="50" rx="4" fill="#4e3a2b" stroke="#6a503c"/>${ic("ice", 9, 10, 1)}<rect x="11" y="46" width="28" height="7" rx="2" fill="#2a1d14"/><rect x="13" y="48" width="4" height="3" rx="1" fill="#5fe08a"/><rect x="18" y="48" width="4" height="3" rx="1" fill="#5fe08a"/><rect x="23" y="48" width="4" height="3" rx="1" fill="#5fe08a"/><rect x="28" y="48" width="4" height="3" rx="1" fill="#5fe08a"/><rect x="33" y="48" width="4" height="3" rx="1" fill="#5fe08a"/>
    <g transform="translate(50 18)"><rect y="4" width="22" height="17" rx="2" fill="#c8955a" stroke="#8a5a2a"/><rect x="9" y="3" width="4" height="18" fill="#ecdcaa"/></g><path d="M48 30H40m3-3-3 3 3 3" stroke="#9fe0ff" stroke-width="2" fill="none" stroke-linecap="round"/>${hand(20, 34)}</svg>`);
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#e6d0a8"/><ellipse cx="34" cy="44" rx="22" ry="8" fill="#8a5a32" opacity=".85"/><ellipse cx="28" cy="42" rx="4" ry="1.4" fill="#fff" opacity=".7"/>
    <g transform="translate(46 8) rotate(20)"><rect x="4" width="3.4" height="30" rx="1.4" fill="#c9a050"/><rect x="-4" y="29" width="20" height="4" rx="1.4" fill="#5a6a7a"/>${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${-3 + k * 3.4} 33v7" stroke="${k % 2 ? "#e8e8f0" : "#c8ccd8"}" stroke-width="2.6" stroke-linecap="round"/>`).join("")}</g>
    <circle cx="14" cy="14" r="8" fill="#ffd23f" stroke="#1c1c24"/><path d="M14 9v6M14 18v.6" stroke="#1c1c24" stroke-width="2.4" stroke-linecap="round"/></svg>`);
  return [[`<img src="${a}" alt="">`, "손님이 몰려와요"], [`<img src="${b}" alt="">`, "톡하면 채움"], [`<img src="${c}" alt="">`, "사고는 바로"]];
}
// 사장님(앞치마 초록·흰 모자·안경)
const BOSS = { skin: "#f0c8a8", hair: "#2a2018", style: "short", shirt: "#2f7a5a", shirt2: "#235c44", pants: "#2c3550", shoe: "#222", hat: "#f4f4f4", pack: null, hood: null, glasses: true, kid: false, elder: false };

// 바깥 풍경(벽 높이 그대로). 문·창문 유리 안에 줄마다 흔들어 아지랑이로 그린다
function outside() {
  const c = document.createElement("canvas"); c.width = W; c.height = FL; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let y = 0; y < 34; y++) { const k = y / 33, r = Math.round(94 + (191 - 94) * k), gg = Math.round(196 + (234 - 196) * k); P(0, y, W, 1, `rgb(${r},${gg},255)`); }
  // 해: 빛무리 + 몸통 + 빛줄기
  const sx = 51, sy = 10;
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) { const d = Math.hypot(x, y); if (d <= 8 && d > 4.5) { g.fillStyle = `rgba(255,250,200,${0.55 * (1 - (d - 4.5) / 3.5)})`; g.fillRect(sx + x, sy + y, 1, 1); } }
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.hypot(x, y); if (d <= 4.3) P(sx + x, sy + y, 1, 1, d < 2.6 ? "#fffbe0" : "#ffe066"); }
  for (const [dx, dy] of [[-7, 0], [7, 0], [0, -7], [0, 7], [-5, -5], [5, 5], [-5, 5], [5, -5]]) P(sx + dx, sy + dy, 1, 1, "#fff2a0");
  // 구름
  P(36, 13, 6, 2, "#ffffff"); P(38, 12, 3, 1, "#ffffff"); P(35, 15, 9, 1, "#e8f6ff");
  // 건물들
  const bld = [[-2, 20, 11, "#c4cfdc"], [9, 24, 8, "#d4dce6"], [17, 17, 10, "#b4c2d2"], [27, 22, 8, "#c8d2de"], [35, 19, 11, "#bccadb"], [46, 23, 13, "#d0d8e2"]];
  for (const [x, y, w, col] of bld) { P(x, y, w, 36 - y, col); P(x, y, w, 1, "#eef3f8"); for (let yy = y + 3; yy < 34; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) P(xx, yy, 1, 2, (xx + yy) % 7 ? "#e8f2fa" : "#7fb0d8"); }
  // 도로·연석·보도
  P(0, 34, W, 5, "#8f9098"); for (let x = 2; x < W; x += 8) P(x, 36, 4, 1, "#e8e0b0");
  P(0, 39, W, 2, "#d6d6ce"); P(0, 41, W, 13, "#f2e4b8"); for (let y = 44; y < FL; y += 5) P(0, y, W, 1, "#e2d2a2"); for (let x = 3; x < W; x += 9) P(x, 41, 1, 13, "#e8d8aa");
  // 가로수(매미가 붙어 있다)
  P(17, 26, 3, 15, "#6a4a2a"); P(18, 26, 1, 15, "#8a6038");
  for (let y = -7; y <= 7; y++) for (let x = -8; x <= 8; x++) { const d = Math.hypot(x * 0.9, y * 1.1); if (d < 7.5 + (((x * 7 + y * 3) & 3) - 1.5) * 0.4) P(18 + x, 22 + y, 1, 1, d < 4 && x < 1 && y < 0 ? "#6fd07a" : (x + y) % 3 ? "#3ea050" : "#2f8040"); }
  P(19, 33, 2, 2, "#5a3a1e"); P(19, 33, 1, 1, "#9a7a4a");
  P(14, 40, 9, 1, "#c8b888");
  return c;
}
function bgCanvas() {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 벽(민트)
  P(0, 0, W, FL, "#dcefe6"); for (let x = 2; x < W; x += 12) P(x, 4, 1, FL - 9, "#cfe6db"); P(0, 0, W, 4, "#5e9c86"); P(0, 3, W, 1, "#4a806c");
  P(0, FL - 5, W, 5, "#7aa894"); P(0, FL - 5, W, 1, "#a8d0bc");
  // 바닥(밝은 나무 타일)
  for (let y = FL; y < PY; y += 12) for (let x = 0; x < W; x += 12) { P(x, y, 12, 12, ((x + y) / 12) % 2 ? "#efdcb8" : "#e6d0a8"); P(x, y, 12, 1, "#d8c096"); P(x, y, 1, 12, "#dcc69e"); P(x + 3, y + 5, 4, 1, ((x + y) / 12) % 2 ? "#e6d2ac" : "#dcc49a"); }
  P(0, FL, W, 2, "#c4a87a");
  // 햇빛: 창문에서 바닥으로 비스듬히
  for (let y = FL; y < 124; y++) { const k = (y - FL) / 70, x0 = Math.round(30 + (y - FL) * 0.62), x1 = Math.round(60 + (y - FL) * 0.78); g.fillStyle = `rgba(255,238,160,${0.34 * (1 - k)})`; g.fillRect(x0, y, x1 - x0, 1); }
  for (let y = FL; y < 84; y++) { const k = (y - FL) / 30, x0 = Math.round(8 + (y - FL) * 0.25), x1 = Math.round(28 + (y - FL) * 0.4); g.fillStyle = `rgba(255,240,170,${0.3 * (1 - k)})`; g.fillRect(x0, y, x1 - x0, 1); }
  // 문틀·간판·발판
  P(6, 12, 24, 42, "#4a5560"); P(6, 12, 24, 2, "#6a7580"); P(29, 14, 1, 40, "#3a444e");
  P(7, 5, 22, 6, "#2f5a4a"); P(7, 5, 22, 1, "#4a806c"); for (let x = 9; x < 27; x += 2) P(x, 7, 1, 2, x % 4 ? "#ffe08a" : "#bff0d0");
  P(7, FL, 22, 4, "#4f7262"); for (let x = 8; x < 28; x += 3) P(x, FL + 1, 2, 2, "#5f8676");
  // 창문 틀
  P(31, 5, 28, 22, "#f6f6f4"); P(31, 26, 28, 2, "#d8dcd8"); P(30, 27, 30, 1, "#b8c0bc");
  // 키오스크
  P(37, 55, 14, 3, "#2a2e36"); P(38, 26, 12, 30, "#3a3f4a"); P(39, 27, 10, 1, "#5a6070"); P(49, 27, 1, 28, "#2a2e36"); P(40, 29, 8, 9, "#111"); P(41, 41, 6, 2, "#1a1c22"); P(42, 45, 4, 3, "#5a6070"); P(43, 46, 2, 1, "#e8e8e8");
  // 메뉴판(작은 컵 그림 + 가격 줄)
  P(62, 1, 42, 11, "#2f3a32"); P(62, 1, 42, 1, "#8a6a4a"); P(62, 11, 42, 1, "#8a6a4a");
  for (let i = 0; i < 3; i++) { const x = 65 + i * 13; P(x, 4, 3, 5, i === 2 ? "#f6f2ea" : "#d8ecf4"); P(x, 6, 3, 3, i === 0 ? "#5a3018" : i === 1 ? "#b07a4a" : "#a8743e"); P(x + 4, 5, 5, 1, "#cfe8d0"); P(x + 4, 7, 4, 1, "#e9c46a"); }
  for (const [x, y] of [[100, 3], [99, 4], [101, 4], [100, 5], [98, 4], [102, 4], [100, 2], [100, 6]]) P(x, y, 1, 1, "#9fe0ff");
  // 카운터
  P(58, 34, 102, 3, "#f2efe8"); P(58, 34, 102, 1, "#ffffff"); P(58, 37, 102, 17, "#c99a64"); for (let x = 62; x < W; x += 8) P(x, 38, 1, 15, "#b38552"); P(58, 52, 102, 2, "#8a6440"); P(58, 34, 2, 20, "#a87a48");
  // 커피 머신
  P(62, 12, 18, 22, "#2c2c32"); P(62, 12, 18, 1, "#4a4a52"); P(79, 13, 1, 21, "#1c1c22"); P(64, 14, 14, 5, "#44444c"); P(65, 16, 2, 1, "#ffb040"); P(68, 16, 2, 1, "#5fe08a"); P(71, 16, 2, 1, "#5fb8ff"); P(75, 15, 2, 3, "#2c2c32");
  P(66, 21, 10, 10, "#1a1a1e"); P(70, 21, 2, 3, "#8a8a92"); P(65, 31, 12, 2, "#6a6a72"); P(65, 31, 12, 1, "#8a8a92");
  P(64, 3, 11, 1, "#2c2c32"); P(65, 4, 9, 8, "#c8dce4"); P(73, 4, 1, 8, "#a8bcc4"); P(67, 11, 5, 1, "#2c2c32");
  // 제빙기
  P(84, 14, 17, 20, "#e2eaee"); P(84, 14, 17, 1, "#ffffff"); P(99, 15, 2, 19, "#c4ced4"); P(86, 19, 11, 10, "#2c4a5a"); P(86, 30, 11, 2, "#b8c4ca"); P(91, 31, 2, 2, "#8a969c"); P(86, 16, 6, 1, "#9fd8ef");
  // 우유 냉장고
  P(104, 18, 14, 16, "#f6f6f8"); P(104, 18, 14, 1, "#ffffff"); P(117, 19, 1, 15, "#c8ccd4"); P(106, 20, 10, 12, "#cde8f0"); P(106, 26, 10, 1, "#9ab8c4"); P(115, 23, 1, 5, "#9aa4ac");
  // 컵·빨대·냅킨 자리
  P(120, 33, 34, 1, "#d8d4cc"); P(140, 27, 7, 7, "#4a5a6a"); P(140, 27, 7, 1, "#6a7a8a"); P(148, 28, 6, 6, "#d8c8a8"); P(149, 26, 4, 2, "#ffffff"); P(148, 28, 6, 1, "#e8dcc0");
  // 에어컨(벽걸이)
  P(110, 2, 46, 11, "#f4f6f8"); P(110, 2, 46, 1, "#ffffff"); P(110, 11, 46, 2, "#d0d6dc"); P(155, 3, 1, 9, "#d0d6dc"); P(113, 5, 3, 1, "#c8d0d8"); P(155, 13, 1, 20, "#d8dde2");
  // 패널 바탕(창고 선반)
  g.translate(0, PY - 150);
  P(0, 150, W, 50, "#3b2b20"); P(0, 150, W, 2, "#6b4e36"); P(0, 152, W, 1, "#24180f");
  for (let i = 0; i < 5; i++) { const x0 = 2 + i * 26; P(x0, 154, 24, 43, "#4e3a2b"); P(x0, 154, 24, 1, "#6a503c"); P(x0, 176, 24, 8, "#2a1d14"); }
  P(133, 154, 25, 43, "#2e2118"); P(133, 154, 25, 1, "#4a3628");
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

export const GAME = {
  key: "ucafe2", base: "ucafe", n: "사장님은 원격 중", desc: "폭염 낮, 몰려드는 손님을 원격으로 버텨요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 손님은 알아서 주문하고 음료를 받아 가요. 당신은 <b>사장님(원격)</b>이에요. 한 잔 만들 때마다 <b>얼음·컵·원두·우유·빨대</b>가 줄어요.",
    "<b>내가 할 일 ①</b> 아래 재고 칸을 <b>톡</b>하면 창고 상자 하나로 가득 채워요. 가져오는 데 <b>1초</b> 걸리니 비기 전에 미리! 상자는 한정이라 덜 빈 칸을 채우면 아까워요. 하나라도 비면 손님이 화내고 그냥 가요.",
    "<b>내가 할 일 ②</b> 사고가 나면 바로! 노란 손가락이 할 일을 짚어 줘요. <b>얼음 기계 고장</b>은 기계를 연타, <b>쏟은 음료</b>는 문질러 닦기, <b>에어컨 꺼짐</b>은 에어컨을 톡. 늦으면 미끄러지고, 더워서 손님이 못 기다려요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "손님이 몰려와요"], ["", "톡하면 채움"], ["", "사고는 바로"]]; } },
  css: `
.mg-u2st{background:#1a130e!important;display:flex;align-items:center;justify-content:center}
.mg-u2w{position:relative;flex:0 0 auto}
.mg-u2w canvas{width:100%;height:100%;display:block;touch-action:none;cursor:pointer}
.mg-u2hud{position:absolute;left:4px;top:4px;display:flex;gap:4px;align-items:center;pointer-events:none;z-index:6;font:700 10.5px ui-monospace,monospace}
.mg-u2hud .lv{color:#fff;background:#e0303ad0;padding:1px 6px;border-radius:4px;letter-spacing:.5px}
.mg-u2hud .lv i{font-style:normal;animation:mgu2blink 1s steps(2) infinite}
.mg-u2hud .tp{color:#fff;background:#0009;padding:1px 6px;border-radius:4px;transition:background .3s}
.mg-u2hud .tp.hot{background:#e0601ee8;animation:mgu2hot .6s ease-in-out infinite alternate}
@keyframes mgu2blink{50%{opacity:0}}
@keyframes mgu2hot{to{transform:scale(1.08)}}
.mg-ucafe2 .mg-steps img{width:76px!important;height:65px!important;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-ucafe2 .mg-logo b{font-size:26px}
.mg-u2dim{position:absolute;inset:0;background:#0000;transition:background .5s;pointer-events:none;z-index:7}
.mg-u2dim.on{background:#000a}
.mg-u2rc{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:8;display:flex;flex-direction:column;align-items:center;pointer-events:none;width:min(86%,250px)}
.mg-u2rc .prn{width:100%;height:auto;display:block;position:relative;z-index:2;filter:drop-shadow(0 4px 6px #0008)}
.mg-u2rc .pap{position:relative;z-index:1;width:78%;height:0;margin-top:-3%;overflow:hidden;background:#fffef6;color:#2a2620;box-shadow:0 6px 14px #0007;transform-origin:top center}
.mg-u2rc .pap.torn{animation:mgu2tear .5s cubic-bezier(.3,1.5,.5,1) forwards}
@keyframes mgu2tear{0%{transform:rotate(0)}40%{transform:translateY(8px) rotate(-3deg)}100%{transform:translateY(14px) rotate(-2deg)}}
.mg-u2rc .in{padding:12px 10px 16px;font:11.5px/1.5 ui-monospace,Menlo,monospace}
.mg-u2rc .in b.h{display:block;text-align:center;font-size:13.5px;font-weight:900;letter-spacing:-.3px}
.mg-u2rc .in small{display:block;text-align:center;color:#8a8478;font-size:10.5px}
.mg-u2rc .in hr{border:0;border-top:1px dashed #a8a090;margin:6px 0}
.mg-u2rc .in p{margin:0;display:flex;justify-content:space-between;gap:6px;white-space:nowrap}
.mg-u2rc .in p span:first-child{overflow:hidden;text-overflow:ellipsis}
.mg-u2rc .in p.tot{font-size:14px;font-weight:900;margin-top:2px}
.mg-u2rc .in p.bad{color:#c0392b}
.mg-u2rc .in .bc{height:20px;margin-top:8px;background:repeating-linear-gradient(90deg,#222 0 1px,#0000 1px 3px,#222 3px 5px,#0000 5px 6px,#222 6px 7px,#0000 7px 10px)}
.mg-u2rc .in .thx{text-align:center;font-size:10.5px;color:#8a8478;margin-top:4px}
.mg-u2rc .pap::after{content:"";position:absolute;left:0;right:0;bottom:0;height:6px;background:linear-gradient(-45deg,#fffef6 3px,#0000 0) 0 0/8px 6px,linear-gradient(45deg,#fffef6 3px,#0000 0) 0 0/8px 6px;opacity:0}
.mg-u2rc .pap.torn::after{opacity:1}
.mg-u2w .u2lb b{position:absolute;display:block;text-align:center;font-size:11px;font-weight:800;color:#e8d8bc;background:#2a1d14;border-radius:4px;white-space:nowrap;overflow:hidden;pointer-events:none;letter-spacing:-.3px}
.mg-u2w .u2lb b.lo{background:#ffd23f;color:#3a2400;animation:u2blink .5s steps(2) infinite}
.mg-u2w .u2lb b.pd{background:#1f4a66;color:#bfe8ff;font-size:10px}
.mg-u2w .u2lb b.lk{background:#555a66;color:#fff}
.mg-u2w .u2lb b.bx{color:#ffe8b0;background:#1e140d}
.mg-u2w .u2lb b.bx.lo{background:#a0302a;color:#fff}
@keyframes u2blink{50%{filter:brightness(1.35)}}
.mg-u2w .u2go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-u2w .u2go.on{display:block}
.mg-u2w .u2go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-u2w .u2go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-u2w .u2go span b{color:#d8402a}
.mg-u2w .u2go.dn i{top:-37px;animation:u2tapd .7s infinite}
.mg-u2w .u2go.dn span{bottom:44px}
.mg-u2w .u2go.up i{top:2px;animation:u2tapu .7s infinite}
.mg-u2w .u2go.up span{top:46px}
.mg-u2w .u2go.sw i{animation:u2sw .9s infinite}
@keyframes u2tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes u2tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes u2sw{0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}
.mg-u2w .u2tut{position:absolute;left:8px;right:8px;top:18%;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-u2w .u2tut.low{top:auto;bottom:30%}
.mg-u2w .u2tut.off{opacity:0;visibility:hidden}
.mg-u2w .u2tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #2f7a5a;max-width:290px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-u2w .u2tut.pop .u2tc{animation:u2pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-u2w .u2tc em{font-style:normal;display:inline-block;background:#2f7a5a;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-u2w .u2tc p{margin:0}.mg-u2w .u2tc b{color:#1f6a4a;background:none;padding:0}.mg-u2w .u2tc b.rd{color:#c0392b}.mg-u2w .u2tc b.bl{color:#1f6aa8}
.mg-u2w .u2tb{margin-top:6px;display:flex;justify-content:center}
.mg-u2w .u2skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-u2w .u2go2{background:linear-gradient(#3fa07a,#23704f)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #164a34!important;animation:u2pulse .5s infinite alternate}
@keyframes u2pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes u2pulse{to{transform:scale(1.06)}}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

// 도트 손가락(할 일 안내). down=true 면 위에서 아래로 가리킨다
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}
// 대걸레 도트(문질러 닦을 때 손가락 자리)
function mopC() {
  return mkC(12, 22, (P) => { P(9, 0, 2, 13, "#c9a050"); P(10, 0, 1, 13, "#e8c878"); P(3, 13, 9, 2, "#5a6a7a"); for (let x = 2; x < 13; x++) P(x, 15, 1, 4 + ((x * 5) % 3), x % 2 ? "#e8e8f0" : "#c8ccd8"); });
}

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "ucafe2", "사장님은 원격 중", "mg-u2st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-u2w"><canvas width="${W}" height="${H}"></canvas><div class="mg-u2hud"><span class="lv"><i>●</i> LIVE</span><span class="tp"></span></div><div class="mg-bubs"></div><div class="u2lb"></div><div class="u2go"><span></span><i></i></div><div class="u2tut"><div class="u2tc"><em>리허설</em><p></p><div class="u2tb"></div></div></div><div class="mg-u2dim"></div></div>`);
  const wrap = F.stage.querySelector(".mg-u2w"), lbEl = F.stage.querySelector(".u2lb"), goEl = F.stage.querySelector(".u2go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = F.stage.querySelector(".u2tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".u2tb"), hud = wrap.querySelector(".mg-u2hud"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), bubs = wrap.querySelector(".mg-bubs"), tpEl = wrap.querySelector(".tp"), dim = wrap.querySelector(".mg-u2dim");
  let K = 2, KS = 2;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const fit = () => { const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 200); K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 250); PY = H - 50; KS = K * DPR; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); hud.style.top = Math.round((PY - 4) * K - 20) + "px"; wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px"; };
  fit();
  const BG = bgCanvas(), OUT = outside(), MOP = mopC(), BOXC = mkC(8, 7, BOX);
  const ICC = {}; for (const it of ITEMS) ICC[it.id] = mkC(16, 16, ICON[it.id]);
  const ICV = {}; for (const it of ITEMS) ICV[it.id] = icoImg(it.id);
  // 캐릭터 그림: 손님·앉은 손님·사장님(내 캐릭터). 창밖은 실제 거리 그림
  const ART = {};
  const artOf = (k) => { if (!ART[k]) { const q = { ok: false, im: new Image() }; q.im.onload = () => (q.ok = true); q.im.src = "img/body/" + k + ".webp"; ART[k] = q; } return ART[k]; };
  const AVK = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
  const CPOOL = shuffle(["c002", "c009", "c010", "c013", "c019", "c021", "c022", "c024", "c028", "c030", "c034", "c036", "c039", "c041", "c047", "c050", "c051", "c052", "c053", "c054", "c055", "c057", "c058", "c063", "c069", "c070", "c072", "c074", "c079", "c084", "c088", "c092"]);
  CPOOL.slice(0, 14).forEach(artOf); artOf(AVK);
  let cpi = 0;
  const OUTI = { ok: false, im: new Image() }; OUTI.im.onload = () => { OUTI.ok = true; OUTH = null; }; OUTI.im.src = "img/bg/alley.webp";
  let OUTH = null;
  const buildOut = () => { const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(FL * KS); const q = c.getContext("2d"); const im = OUTI.im, iw = im.naturalWidth, ih = im.naturalHeight; q.drawImage(im, 0, ih * 0.05, iw, iw * FL / W, 0, 0, c.width, c.height); q.fillStyle = "rgba(255,236,170,.18)"; q.fillRect(0, 0, c.width, c.height); return c; };
  const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  const scr = document.createElement("canvas"), sg = scr.getContext("2d");
  // 사람 그림 한 장: 아래는 바닥으로 흐리게(그림이 허벅지까지)
  const body = (a, ex, cx, by, hh, o = {}) => {
    if (!a || !a.ok) return false;
    const ww = hh * 240 / 312, dw = Math.max(2, Math.ceil(ww * KS)), dh = Math.max(2, Math.ceil(hh * KS)), e = EXI[ex] || 0;
    if (scr.width < dw || scr.height < dh) { scr.width = Math.max(scr.width, dw); scr.height = Math.max(scr.height, dh); }
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, dw + 2, dh + 2);
    sg.drawImage(a.im, (e % 3) * 240, e >= 3 ? 540 : 0, 240, 312, 0, 0, dw, dh);
    const fd = o.fade == null ? 0.28 : o.fade;
    if (fd > 0) { sg.globalCompositeOperation = "destination-out"; const q = sg.createLinearGradient(0, dh * (1 - fd), 0, dh); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,1)"); sg.fillStyle = q; sg.fillRect(0, dh * (1 - fd) - 1, dw + 2, dh * fd + 2); sg.globalCompositeOperation = "source-over"; }
    g.save(); g.imageSmoothingEnabled = true; if (o.a != null) g.globalAlpha *= o.a;
    g.translate(cx, by); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
    g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 2 * KS; g.shadowOffsetY = 0.6 * KS;
    g.drawImage(scr, 0, 0, dw, dh, -ww / 2, -hh, ww, hh); g.restore();
    return true;
  };
  const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  const DRC = {}; for (const k in DRINK) DRC[k] = mkC(7, 10, DRINK[k], false);
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  // 상태
  const stock = { ice: 4, cup: 6, bean: 7, milk: 5, straw: 5 };
  let boxes = 9, served = 0, lost = 0, sales = 0, refills = 0, wasted = 0;
  const sold = { aa: 0, al: 0, hl: 0 };
  let inT = 24, acOn = true, iceBroken = false, iceFix = 0, iceShake = 0, meltT = 0, puddle = null;
  let over = false, raf = 0, last = 0, t0 = 0, el = 0, nextAt = 0.6, door = 0, cicT = 0.8, delivered = false, hint2 = false;
  const ppl = [], kq = [], mq = [], owners = [], sparks = [], incs = [];
  const slotFx = ITEMS.map(() => ({ flash: 0, shake: 0 }));
  let boxDrop = 0, mopAt = null, down = false, lastL = null, scrubSnd = 0;
  // 사고 순서: 세 가지를 한 번씩 섞고, 마지막에 하나 더
  const incQ = shuffle(["ice", "spill", "ac"]); incQ.push(pick(["ice", "spill", "ac"].filter((x) => x !== incQ[2])));
  const incAt = [5.5, 11.5, 17.5, 23];
  // 손님 고정 자리 장식: 탁자·앉은 손님
  const DY = PY - 150, TABLES = [[34, 126 + DY], [124, 120 + DY], [112, 92 + DY * 0.5]];
  const sitters = [{ spec: uSpec("worker"), cache: {}, x: 45, y: 129 + DY, flip: true, ak: "c061" }, { spec: uSpec("student"), cache: {}, x: 113, y: 123 + DY, flip: false, ak: "c025" }, { spec: uSpec("elder"), cache: {}, x: 123, y: 95 + DY * 0.5, flip: true, ak: "c087" }];
  sitters.forEach((s2) => (s2.art = artOf(s2.ak)));

  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = x * K + "px"; b.style.top = (y - 34) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1300); };
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const updSc = () => (F.sc.textContent = `판매 ${served} · 놓침 ${lost}`);
  const heatMul = () => 1 + Math.max(0, inT - 25) / 3.2;

  // ── 소리 ──
  const S = {
    chime: () => { tone(1318, 0.12, "triangle", 0.05); tone(1046, 0.18, "triangle", 0.05, 0, 0.12); },
    beep: () => { tone(1500, 0.05, "square", 0.035); tone(1800, 0.05, "square", 0.035, 0, 0.08); },
    grind: () => { noise(0.32, 700, 0.06, 0, 1.4); tone(140, 0.3, "sawtooth", 0.025); },
    clink: () => { tone(2400, 0.04, "triangle", 0.05); tone(2900, 0.05, "triangle", 0.04, 0, 0.05); },
    cicada: () => { for (let k = 0; k < 14; k++) noise(0.035, 4400 + rnd() * 900, 0.022 * (k < 10 ? 1 : 0.5), k * 0.045, 7); },
    refill: (id) => {
      if (id === "ice") for (let k = 0; k < 5; k++) { noise(0.05, 3200 + k * 300, 0.08, k * 0.04, 3); tone(2600 + rnd() * 600, 0.03, "triangle", 0.04, 0, k * 0.045); }
      else if (id === "cup") { tone(700, 0.05, "sine", 0.1, 300); tone(900, 0.05, "sine", 0.08, 300, 0.07); }
      else if (id === "bean") noise(0.28, 1800, 0.12, 0, 0.8);
      else if (id === "milk") { tone(220, 0.1, "sine", 0.2, -60); noise(0.06, 600, 0.08); }
      else for (let k = 0; k < 4; k++) tone(1400 + k * 120, 0.025, "square", 0.04, 0, k * 0.035);
    },
    acOff: () => { tone(600, 0.45, "sine", 0.1, -450); noise(0.2, 300, 0.08, 0.1); },
    acOn: () => { tone(2000, 0.06, "square", 0.05); SFX.whoosh(); },
    alarm: () => { for (let k = 0; k < 3; k++) { tone(880, 0.1, "square", 0.06, 0, k * 0.22); tone(660, 0.1, "square", 0.06, 0, k * 0.22 + 0.11); } noise(0.15, 2500, 0.1); },
    clank: () => { tone(300 + rnd() * 80, 0.05, "square", 0.08); noise(0.04, 2600, 0.12); },
    splash: () => { noise(0.28, 900, 0.16, 0, 0.8); tone(320, 0.12, "sine", 0.1, -180); },
    slip: () => { tone(520, 0.3, "sine", 0.12, -380); tone(90, 0.16, "sine", 0.32, -30, 0.28); noise(0.08, 400, 0.2, 0.28); },
    truck: () => { tone(392, 0.12, "square", 0.06); tone(392, 0.16, "square", 0.06, 0, 0.18); noise(0.2, 500, 0.08, 0.4); },
  };

  // ── 손님 ──
  const spawn = () => {
    if (ppl.filter((p) => !p.gone).length >= 10) return;
    const r = rnd(), ord = r < 0.52 ? "aa" : r < 0.9 ? "al" : "hl";
    const p = { spec: uSpec(pick(["student", "worker", "plain", "teen", "worker", "student", "elder", "plain"])), cache: {}, x: SP.door[0], y: SP.door[1] - 6, alpha: 0, st: "kq", ord, carry: 0, pat: (10 + rnd() * 3) * ez, act: 0, actK: "", walkT: rnd() * 4, v: "f", flip: false, angry: 0, slip: 0, slipped: false, sp: 24 + rnd() * 6, hurry: false, gone: false, moving: true };
    p.art = artOf(CPOOL[cpi++ % CPOOL.length]); kq.push(p); ppl.push(p); S.chime();
  };
  const qpos = (S0, i) => (i === 0 ? S0 : [S0[0] + (i % 2 ? -3 : 3), S0[1] + 9 * i]);
  const walkTo = (p, x, y, dt) => {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy), sp = p.sp * (p.spec.elder ? 0.75 : 1) * (p.hurry ? 1.45 : 1), mv = sp * dt;
    if (d <= mv || d < 0.3) { p.x = x; p.y = y; p.moving = false; return true; }
    p.x += dx / d * mv; p.y += dy / d * mv; p.walkT += dt * sp / 9; p.moving = true;
    if (Math.abs(dx) > Math.abs(dy) * 0.9) { p.v = "s"; p.flip = dx < 0; } else p.v = dy < 0 ? "b" : "f";
    return false;
  };
  const unq = (p) => { for (const q of [kq, mq]) { const i = q.indexOf(p); if (i >= 0) q.splice(i, 1); } };
  const quit = (p, line, count = true) => {
    unq(p); p.st = "quit"; p.act = 0; p.angry = 2.4; p.hurry = true;
    if (count) { lost++; F.miss(stageXY(p.x, p.y - 16)); }
    bubble(p.x, p.y, line, "angry"); updSc();
  };
  const step = (p, dt) => {
    if (p.alpha < 1 && p.st !== "quit" && p.st !== "out") p.alpha = Math.min(1, p.alpha + dt * 4);
    if (p.angry > 0) p.angry -= dt;
    if (p.slip > 0) { p.slip -= dt; return; }
    if (p.st === "kq" || p.st === "mq") {
      const q = p.st === "kq" ? kq : mq, S0 = p.st === "kq" ? SP.kio : SP.mac, i = q.indexOf(p), [tx, ty] = qpos(S0, i);
      const at = walkTo(p, tx, ty, dt);
      if (at) p.v = "b";
      if (!p.act) { p.pat -= dt * heatMul(); if (p.pat <= 0) return quit(p, inT >= 28 ? "더워서 못 기다려…" : "왜 이렇게 느려…"); }
      if (at && i === 0) {
        if (!p.act) {
          if (p.st === "kq") { p.act = 0.7; p.actK = "pay"; S.beep(); }
          else {
            const miss = ORD[p.ord].need.filter((id) => stock[id] <= 0);
            if (miss.length) { const it = ITEMS.find((x) => x.id === miss[0]); slotFx[ITEMS.indexOf(it)].shake = 0.5; F.msg(`${jo(it.n, "이", "가")} 떨어졌어요!`); return quit(p, NO_LINE[miss[0]]); }
            ORD[p.ord].need.forEach((id) => stock[id]--);
            p.act = 0.8; p.actK = "make"; S.grind(); if (ORD[p.ord].need.includes("ice")) setTimeout(S.clink, 380);
          }
        } else {
          p.act -= dt;
          if (p.act <= 0) {
            p.act = 0;
            if (p.st === "kq") { kq.shift(); p.st = "mq"; mq.push(p); p.pat = Math.max(p.pat, 5 * ez); }
            else {
              mq.shift(); p.st = "out"; p.carry = 1; served++; sold[p.ord]++; sales += ORD[p.ord].price;
              F.hit(stageXY(p.x, p.y - 30), won(ORD[p.ord].price), "#ffd166"); updSc();
            }
          }
        }
      }
      return;
    }
    if (p.st === "out" || p.st === "quit") {
      const [dx0, dy0] = SP.door;
      if (walkTo(p, dx0, dy0 - 6, dt)) { p.v = "b"; p.alpha -= dt * 4; if (p.alpha <= 0) p.gone = true; }
    }
  };
  // 웅덩이 밟으면 미끄러진다(생기고 1.8초 뒤부터)
  const slipCheck = (p) => {
    if (!puddle || p.slipped || !p.moving || p.slip > 0 || puddle.age < 1.8 / Math.sqrt(ez)) return;
    const r = puddle.r * (1 - puddle.clean * 0.6);
    if (Math.abs(p.x - puddle.x) < r + 1 && Math.abs(p.y - puddle.y) < r * 0.55 + 1.5) {
      p.slipped = true; p.slip = 1.1; S.slip(); vib([40, 30, 40]); puddle.inc.slips++;
      F.burst(stageXY(p.x, p.y - 4), "#b07a4a", 10);
      F.msg("손님이 미끄러졌어요! 얼른 닦아요");
      if (p.st === "out") { p.carry = 0; bubble(p.x, p.y + 10, "아야! 바닥 좀…", "angry"); p.angry = 2; p.hurry = true; F.miss(null); }
      else quit(p, "으악! 미끄러워!");
    }
  };

  // ── 사고 ──
  const startInc = (type) => {
    const rec = { type, t0: el, t1: 0, slips: 0 }; incs.push(rec);
    if (type === "ice") { iceBroken = true; iceFix = 0; rec.need = 7; S.alarm(); vib([60, 40, 60]); F.msg("얼음 기계 고장! 기계를 연타해서 고쳐요"); bubble(92, 46, "덜컹… 치익", "red"); }
    if (type === "ac") { acOn = false; S.acOff(); vib(40); F.msg("에어컨이 꺼졌어요! 에어컨을 톡"); bubble(133, 46, "푸슝…", "miss"); }
    if (type === "spill") {
      const c = ppl.filter((p) => p.st === "out" && p.carry && !p.slip && p.x > 26 && p.y < 100);
      let x, y;
      if (c.length) { const p = pick(c); p.carry = 0; x = Math.round(p.x) + 2; y = Math.round(p.y) + 2; bubble(p.x, p.y, "앗, 쏟았다!", "miss"); p.slipped = true; }
      else { x = 34 + rint(30); y = 72 + rint(10); }
      const blobs = []; for (let k = 0; k < 7; k++) blobs.push([rnd() * 10 - 5, rnd() * 4 - 2, 2 + rnd() * 3]);
      const cubes = []; for (let k = 0; k < 4; k++) cubes.push([rint(14) - 7, rint(6) - 3]);
      puddle = { x, y, r: 9, age: 0, clean: 0, blobs, cubes, inc: rec, cupRot: rnd() < 0.5 };
      S.splash(); vib(30); F.msg("음료가 쏟아졌어요! 문질러 닦아요");
    }
  };
  const doneInc = (rec, pos, text) => { rec.t1 = el; F.hit(pos, text, "#7fe0ff"); };
  const fixAC = () => { if (acOn) return; acOn = true; S.acOn(); vib(15); const rec = incs.find((r) => r.type === "ac" && !r.t1); if (rec) doneInc(rec, stageXY(133, 18), "시원"); F.msg("에어컨 다시 켜짐! 시원~"); };
  const hitIce = () => {
    if (!iceBroken) return;
    iceFix++; iceShake = 0.18; S.clank(); vib(8);
    for (let k = 0; k < 4; k++) sparks.push({ x: 92 + rnd() * 10 - 5, y: 22 + rnd() * 8, vx: rnd() * 60 - 30, vy: -20 - rnd() * 40, t: 0.4, c: pick(["#ffe066", "#ffffff", "#ffb040"]) });
    const rec = incs.find((r) => r.type === "ice" && !r.t1);
    if (iceFix >= (rec ? rec.need : 7)) { iceBroken = false; if (rec) doneInc(rec, stageXY(92, 20), "수리"); F.msg("얼음 기계 수리 완료!"); SFX.snap(); }
  };
  const inPud = (x, y, pad) => puddle && Math.abs(x - puddle.x) < puddle.r + pad && Math.abs(y - puddle.y) < puddle.r * 0.6 + pad;
  const scrub = (d, x, y) => {
    if (!puddle) return;
    puddle.clean += d / (75 / Math.sqrt(ez));
    scrubSnd += d; if (scrubSnd > 12) { scrubSnd = 0; SFX.sweep(); vib(5); }
    if (rnd() < 0.35) sparks.push({ x: x + rnd() * 6 - 3, y: y + rnd() * 3, vx: rnd() * 20 - 10, vy: -10 - rnd() * 15, t: 0.35, c: "#e8f8ff" });
    if (puddle.clean >= 1) { const pz = puddle; puddle = null; doneInc(pz.inc, stageXY(pz.x, pz.y - 6), "반짝"); F.msg("바닥 반짝반짝!"); for (let k = 0; k < 8; k++) sparks.push({ x: pz.x + rnd() * 16 - 8, y: pz.y + rnd() * 6 - 3, vx: 0, vy: -12 - rnd() * 10, t: 0.6, c: "#fff6b0", star: true }); if (tut === 2) setTimeout(() => tut === 2 && tutNext(3), 700); }
  };

  // ── 재고 채우기 ──
  const refill = (i) => {
    const it = ITEMS[i], s = stock[it.id], fx = slotFx[i];
    if (it.id === "ice" && iceBroken) { F.msg("얼음 기계부터 고쳐요! (기계를 연타)"); SFX.fail(); fx.shake = 0.35; return; }
    if (fx.pend) { F.msg("사장님이 가지러 가는 중…"); SFX.tok(); return; }
    if (s >= it.max - 1) { F.msg(`${jo(it.n, "은", "는")} 아직 넉넉해요`); SFX.tok(); fx.shake = 0.25; return; }
    if (boxes <= 0) { F.msg("창고 상자가 다 떨어졌어요…"); SFX.fail(); fx.shake = 0.35; return; }
    boxes--; refills++; fx.pend = 1; // 창고에서 가져오는 데 1.2초: 미리 대비해야 한다
    setTimeout(() => { fx.pend = 0; const s2 = stock[it.id]; wasted += s2; stock[it.id] = it.max; fx.flash = 0.45; }, 1200); const add = it.max - s;
    owners.push({ x: it.st + rnd() * 4 - 2, t: 0, spec: BOSS, cache: owners.cache || (owners.cache = {}) });
    const [sx, sy] = stageXY(2 + i * 26 + 12, 166 + PY - 150); F.float([sx, sy - 10], `+${add}`); F.burst([sx, sy], "#9fe0ff", 8);
    S.refill(it.id); SFX.whoosh(); vib(10);
  };

  // ── 칸 이름(재고 칸 아래) ──
  lbEl.innerHTML = ITEMS.map((it) => `<b>${it.n}</b>`).join("") + `<b class="bx">상자</b>`;
  const lbs = [...lbEl.children];
  const placeLb = () => { lbs.forEach((b, i) => { const x = i < 5 ? 2 + i * 26 : 133; Object.assign(b.style, { left: x * K + "px", top: (PY + 35) * K + "px", width: (i < 5 ? 24 : 25) * K + "px", height: 11 * K + "px", lineHeight: 11 * K + "px" }); }); };
  placeLb();
  const lbUpd = () => {
    ITEMS.forEach((it, i) => {
      const s = stock[it.id], fx = slotFx[i], lock = it.id === "ice" && iceBroken;
      const st2 = lock ? "고장" : fx.pend ? "가져오는 중" : s <= 0 ? "비었어요!" : s <= 2 && boxes > 0 ? "톡! 채우기" : it.n;
      const cl = lock ? "lk" : fx.pend ? "pd" : s <= 2 ? "lo" : "";
      if (lbs[i].textContent !== st2) lbs[i].textContent = st2;
      if (lbs[i].className !== cl) lbs[i].className = cl;
    });
    const bt = `상자 ${boxes}개`, bc = "bx" + (boxes <= 1 ? " lo" : ""); if (lbs[5].textContent !== bt) lbs[5].textContent = bt; if (lbs[5].className !== bc) lbs[5].className = bc;
  };
  // ── 할 일 손가락: 고장 > 쏟은 음료 > 에어컨 > 거의 빈 재고 ──
  const FUP = fingerURL(false), FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.sw ? 1 : 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "u2go"; return; }
    const up = o.y < 48;
    goI.style.backgroundImage = `url(${up ? FUP : FDN})`;
    goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px"; goT.innerHTML = o.t; goT.style.transform = o.x < 34 ? "translateX(-22%)" : o.x > 126 ? "translateX(-80%)" : "";
    goEl.className = "u2go on " + (up ? "up" : "dn") + (o.sw ? " sw" : "");
  };
  const taskNow = () => {
    if (iceBroken) return { x: 92, y: 34, t: "기계 <b>연타!</b>" };
    if (puddle) return { x: puddle.x, y: puddle.y - 4, t: "<b>문질러</b> 닦기!", sw: 1 };
    if (!acOn) return { x: 133, y: 13, t: "에어컨 <b>톡!</b>" };
    let best = -1, bv = 9;
    ITEMS.forEach((it, i) => { const s = stock[it.id], r = s / it.max; if (s <= 2 && !slotFx[i].pend && boxes > 0 && r < bv) { bv = r; best = i; } });
    if (best >= 0) return { x: 2 + best * 26 + 12, y: PY + 6, t: `${jo(ITEMS[best].n, "을", "를")} <b>톡!</b>` };
    return null;
  };

  // ── 리허설: 얼음 채우기 → 쏟은 음료 닦기 → 고장·에어컨 안내 → 영업 시작 ──
  let tut = 0, tutT = 0;
  const SKIP = `<button class="u2skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "low"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) {
      stock.ice = 1;
      tutP.innerHTML = `손님이 음료를 살 때마다 <b>아래 재고</b>가 줄어요.<br>거의 빈 <b class="rd">얼음</b> 칸을 <b>톡</b> 해서 채워요!`; tutB.innerHTML = SKIP;
    } else if (n === 2) {
      startInc("spill"); if (puddle) { puddle.x = 84; puddle.y = 112; } tutEl.classList.add("low");
      tutP.innerHTML = `앗, 음료가 쏟아졌어요!<br>손님이 미끄러지기 전에 <b>바닥을 문질러</b> 닦아요!`; tutB.innerHTML = SKIP;
    } else if (n === 3) {
      tutP.innerHTML = `좋아요! 영업 중엔 이것도 있어요.<br><b class="rd">얼음 기계 고장</b>은 기계를 <b>연타</b>,<br><b class="bl">에어컨이 꺼지면</b> 에어컨을 <b>톡</b>!<br>할 일이 생기면 <b>손가락</b>이 알려 줘요.`;
      tutB.innerHTML = `<button class="u2go2" data-go>영업 시작!</button>`;
    }
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    Object.assign(stock, { ice: 4, cup: 6, bean: 7, milk: 5, straw: 5 }); boxes = 9; refills = 0; wasted = 0; puddle = null; incs.length = 0; mopAt = null;
    slotFx.forEach((f) => { f.pend = 0; f.flash = 0; f.shake = 0; });
    t0 = 0; SFX.go?.(); S.chime();
    timer(T, F.bar, end);
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 입력 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const tapL = (x, y) => {
    if (over) return;
    if (tut === 1) { if (y >= PY && x < 28) { refill(0); setTimeout(() => { if (tut === 1) { F.msg("좋아요! 가져오는 데 1초 걸리니 비기 전에 미리!"); tutNext(2); } }, 1500); } else { F.msg("깜빡이는 얼음 칸을 톡!"); SFX.tok(); } return; }
    if (tut === 0 || tut === 3) return;
    if (tut === 2 && !(puddle && inPud(x, y, 6))) { F.msg("쏟은 곳을 문질러요!"); return; }
    if (y >= PY) { y -= PY - 150; if (x < 132) { const i = Math.floor((x - 2) / 26); if (i >= 0 && i < 5) refill(i); } else { F.msg("창고 상자 남은 수예요. 왼쪽 재고 칸을 톡!"); SFX.tok(); } return; }
    if (!acOn && x >= 104 && x <= 159 && y <= 24) return fixAC();
    if (iceBroken && x >= 80 && x <= 105 && y >= 8 && y <= 46) return hitIce();
    if (puddle && inPud(x, y, 6)) { mopAt = [x, y]; scrub(5, x, y); return; }
  };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = toL(e); down = true; lastL = [x, y]; tapL(x, y); });
  cv.addEventListener("pointermove", (e) => {
    if (!down || over) return; const [x, y] = toL(e);
    if (puddle && inPud(x, y, 8)) { mopAt = [x, y]; if (lastL) scrub(Math.hypot(x - lastL[0], y - lastL[1]), x, y); } else mopAt = null;
    lastL = [x, y];
  });
  const up = () => { down = false; mopAt = null; lastL = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  // ── 그리기 ──
  const drawPerson = (p, tm) => {
    let key, o, flip = false;
    if (p.st === "kq" && p.act && p.actK === "pay") { const a = Math.floor(tm * 4) % 2; key = "pay" + a; o = { v: "b", arm: a ? "up" : null }; }
    else if (p.st === "mq" && p.act) { key = "mk"; o = { v: "b" }; }
    else if (p.moving) { const f = Math.floor(p.walkT) % 4; key = p.v + f + p.carry; o = { v: p.v, f, carry: p.carry }; flip = p.v === "s" && p.flip; }
    else { key = p.v + "0" + p.carry; o = { v: p.v, f: 0, carry: p.carry }; }
    // 캐릭터 그림(표정): 화남·미끄러짐(깜짝)·음료 받음(웃음)·더위(슬픔)
    const ex = p.slip > 0 ? "surprised" : p.angry > 0 ? "angry" : p.carry ? "smile" : inT >= 29 ? "sad" : "neutral";
    const bob = p.moving ? -Math.abs(Math.sin(p.walkT * Math.PI)) * 1.2 : 0;
    g.save(); g.globalAlpha = clamp(p.alpha, 0, 1);
    if (p.art && p.art.ok) {
      g.fillStyle = "rgba(60,40,20,.22)"; g.beginPath(); g.ellipse(p.x, p.y, 6, 1.6, 0, 0, 6.3); g.fill();
      if (p.slip > 0) { body(p.art, ex, p.x + 8, p.y + 3, 30, { rot: -Math.PI / 2, fade: 0.2 }); g.fillStyle = "#ffe066"; g.font = "900 5px sans-serif"; g.textAlign = "center"; g.fillText("✦ ✦", p.x - 6 + (Math.floor(tm * 10) % 2), p.y - 18); }
      else {
        body(p.art, ex, p.x, p.y + 1 + bob, 34, { flip: p.flip && p.v === "s" });
        if (p.carry) drinkV(g, p.ord, p.x + 4.4, p.y - 16 + bob);
      }
      g.restore(); return;
    }
    g.restore();
    const c = uSprite(p, key, o, flip), x = Math.round(p.x - 8), y = Math.round(p.y - 29);
    g.globalAlpha = clamp(p.alpha, 0, 1);
    if (p.slip > 0) {
      g.save(); g.translate(Math.round(p.x), Math.round(p.y)); g.rotate(-Math.PI / 2); g.drawImage(c, -1, -15); g.restore();
      for (let k = 0; k < 3; k++) P(Math.round(p.x) - 14 + k * 5 + (Math.floor(tm * 10) % 2), Math.round(p.y) - 22 - (k % 2) * 2, 1, 1, "#ffe066");
    } else g.drawImage(c, x, y);
    g.globalAlpha = 1;
  };
  const drawAnger = (x, y, tm) => { const b = Math.floor(tm * 6) % 2; if (true) { g.save(); g.strokeStyle = "#ff3b3b"; g.lineWidth = 1.1; g.lineCap = "round"; const cx = x + 2.5, cy = y + 2.5 - b; g.shadowColor = "#fff"; g.shadowBlur = 1.5 * KS; g.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(cx + sx * 0.8, cy + sy * 2.6); g.quadraticCurveTo(cx + sx * 0.8, cy + sy * 0.8, cx + sx * 2.6, cy + sy * 0.8); } g.stroke(); g.restore(); return; } ANG.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "X") P(x + c, y + r - b, 1, 1, "#ff3b3b"); })); };
  const drawBubble = (p, tm) => {
    if (p.alpha < 0.6 || p.slip > 0) return;
    const x = Math.round(p.x) - 1, y = Math.round(p.y) - 46;
    const missing = ORD[p.ord].need.some((id) => stock[id] <= 0), blink = missing && Math.floor(tm * 5) % 2;
    if (true) {
      g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 2 * KS; g.shadowOffsetY = 0.5 * KS;
      rr(x - 1, y - 1, 13, 14, 3.4); g.fillStyle = blink ? "#ffd0d0" : "#ffffff"; g.fill(); g.restore();
      g.save(); g.beginPath(); g.moveTo(x + 2, y + 12.6); g.lineTo(x + 3, y + 15.4); g.lineTo(x + 5.6, y + 12.6); g.closePath(); g.fillStyle = blink ? "#ffd0d0" : "#ffffff"; g.fill(); rr(x - 1, y - 1, 13, 14, 3.4); g.strokeStyle = "#1c1c24"; g.lineWidth = 0.5; g.stroke(); g.restore();
      drinkV(g, p.ord, x + 2, y + 1.2);
      if (missing) { g.save(); g.beginPath(); g.arc(x + 11.6, y - 0.8, 2.6, 0, 6.3); g.fillStyle = "#ff3b3b"; g.fill(); g.fillStyle = "#fff"; g.fillRect(x + 11.2, y - 2.6, 0.8, 2.2); g.fillRect(x + 11.2, y + 0.1, 0.8, 0.8); g.restore(); }
      return;
    }
    P(x, y, 11, 12, blink ? "#ffd0d0" : "#ffffff"); P(x - 1, y + 1, 1, 10, "#1c1c24"); P(x + 11, y + 1, 1, 10, "#1c1c24"); P(x, y - 1 + 1, 11, 0, "#000"); P(x + 1, y - 1, 9, 1, "#1c1c24"); P(x + 1, y + 12, 9, 1, "#1c1c24"); P(x + 2, y + 13, 2, 1, "#1c1c24"); P(x + 2, y + 12, 2, 1, blink ? "#ffd0d0" : "#ffffff");
    g.drawImage(DRC[p.ord], x + 2, y + 1);
    if (missing) { P(x + 10, y - 3, 2, 5, "#ff3b3b"); P(x + 10, y + 3, 2, 1, "#ff3b3b"); }
  };
  // 소품(벡터)
  const lgr = (x0, y0, x1, y1, cs) => { const q = g.createLinearGradient(x0, y0, x1, y1); cs.forEach((c, i) => q.addColorStop(i / (cs.length - 1), c)); return q; };
  const tableV = ([x, y]) => { g.save(); g.fillStyle = "rgba(60,40,20,.18)"; g.beginPath(); g.ellipse(x, y, 8, 1.8, 0, 0, 6.3); g.fill(); g.fillStyle = "#5c5450"; g.fillRect(x - 0.9, y - 10.5, 1.8, 10); rr(x - 5, y - 1.4, 10, 1.6, 0.8); g.fillStyle = "#4a4440"; g.fill(); g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 1.5 * KS; rr(x - 10.5, y - 14.6, 21, 4.4, 2); g.fillStyle = lgr(0, y - 14.6, 0, y - 10.2, ["#ffffff", "#e8e2d6"]); g.fill(); g.restore(); };
  const stoolV = (x, y) => { g.save(); g.fillStyle = "#6a6a70"; g.fillRect(x - 0.4, y - 5.4, 0.9, 5); rr(x - 2.6, y - 1.2, 5.6, 1.2, 0.6); g.fillStyle = "#4a4a50"; g.fill(); g.beginPath(); g.ellipse(x + 0.2, y - 6.2, 3.8, 1.6, 0, 0, 6.3); g.fillStyle = lgr(0, y - 7.8, 0, y - 4.6, ["#f4a888", "#d0684a"]); g.fill(); g.restore(); };
  const plantV = (x, y) => { g.save(); g.beginPath(); g.moveTo(x - 3.6, y - 6.4); g.lineTo(x + 3.8, y - 6.4); g.lineTo(x + 3, y); g.lineTo(x - 2.8, y); g.closePath(); g.fillStyle = lgr(x - 3, 0, x + 4, 0, ["#ffffff", "#d8d0c0"]); g.fill(); for (const [a, l, c] of [[-1.9, 10, "#4fae5a"], [-1.2, 12, "#3e8e4a"], [-0.5, 13, "#5fc06a"], [0.3, 11, "#3e8e4a"], [0.9, 12, "#4fae5a"], [1.6, 9, "#2f7e3a"]]) { g.save(); g.translate(x + 0.2, y - 6.4); g.rotate(a * 0.42); g.beginPath(); g.ellipse(0, -l / 2, 1.7, l / 2, 0, 0, 6.3); g.fillStyle = c; g.fill(); g.restore(); } g.restore(); };
  const signV = (x, y, tm) => { g.save(); g.strokeStyle = "#3a4a42"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 3, y - 18); g.moveTo(x + 6, y); g.lineTo(x + 4, y - 18); g.stroke(); g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 1.5 * KS; rr(x - 6.5, y - 19, 13, 15, 1.6); g.fillStyle = "#2f3a32"; g.fill(); g.restore(); g.save(); rr(x - 6.5, y - 19, 13, 15, 1.6); g.strokeStyle = "#8a6a4a"; g.lineWidth = 0.8; g.stroke(); drinkV(g, "aa", x - 5.4, y - 16); g.fillStyle = Math.floor(tm * 2) % 2 ? "#9fe0ff" : "#ffffff"; g.font = "900 3.6px sans-serif"; g.textAlign = "center"; g.fillText("❄", x + 3.4, y - 11); g.fillStyle = "#e9c46a"; g.font = "800 2.6px sans-serif"; g.fillText("ICE", x + 3.4, y - 7); g.restore(); };
  const binV = (x, y) => { g.save(); g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 1.5 * KS; rr(x - 4.4, y - 10.4, 9.4, 10.4, 1.6); g.fillStyle = lgr(x - 4, 0, x + 5, 0, ["#7fb0f0", "#4f8ad9", "#3a6ab0"]); g.fill(); g.restore(); g.save(); rr(x - 4.8, y - 11, 10.2, 2.2, 1); g.fillStyle = "#9fc6ff"; g.fill(); g.fillStyle = "#1c2a40"; rr(x - 2, y - 10.6, 5, 1, 0.5); g.fill(); g.fillStyle = "#fff"; g.font = "900 4px sans-serif"; g.textAlign = "center"; g.fillText("♻", x + 0.4, y - 3); g.restore(); };
  const fanV = (x, y, tm) => { g.save(); rr(x - 5.4, y - 1.4, 11, 2.2, 1); g.fillStyle = "#7a848c"; g.fill(); g.fillStyle = "#9aa4ac"; g.fillRect(x - 0.4, y - 13, 1, 12); const cx = x + 0.1, cy = y - 18; g.beginPath(); g.arc(cx, cy, 5.4, 0, 6.3); g.fillStyle = "rgba(220,230,240,.35)"; g.fill(); g.strokeStyle = "#c8d0d8"; g.lineWidth = 0.6; g.stroke(); const sp = acOn ? 10 : 22, rot = tm * sp; g.fillStyle = "#7fd0ff"; for (let b = 0; b < 3; b++) { g.save(); g.translate(cx, cy); g.rotate(rot + b * 2.094); g.beginPath(); g.ellipse(0, -2.4, 1.3, 2.4, 0, 0, 6.3); g.fill(); g.restore(); } g.beginPath(); g.arc(cx, cy, 0.9, 0, 6.3); g.fillStyle = "#4a5a6a"; g.fill(); g.restore(); };
  const drawTable = ([x, y]) => { P(x - 10, y - 14, 20, 4, "#f6f4ee"); P(x - 10, y - 14, 20, 1, "#ffffff"); P(x - 10, y - 11, 20, 1, "#c8c0b0"); P(x - 1, y - 10, 2, 9, "#5c5450"); P(x - 5, y - 1, 10, 1, "#4a4440"); };
  const drawStool = (x, y) => { P(x - 3, y - 7, 7, 2, "#e07a5a"); P(x - 3, y - 7, 7, 1, "#f0a080"); P(x, y - 5, 1, 5, "#6a6a70"); P(x - 2, y - 1, 5, 1, "#4a4a50"); };
  const drawPlant = (x, y) => { P(x - 3, y - 6, 7, 6, "#e8e0d0"); P(x - 3, y - 6, 7, 1, "#ffffff"); P(x + 3, y - 5, 1, 5, "#c8c0b0"); P(x - 1, y - 17, 3, 11, "#3e8e4a"); P(x - 5, y - 13, 4, 3, "#4fae5a"); P(x + 2, y - 15, 4, 3, "#4fae5a"); P(x - 4, y - 9, 3, 2, "#2f6e3a"); P(x + 2, y - 10, 3, 2, "#2f6e3a"); P(x, y - 19, 1, 2, "#6fd07a"); };
  // 입간판(아이스 음료 그림)·분리수거함
  const drawSign = (x, y, tm) => {
    P(x - 6, y - 18, 13, 15, "#3a4a42"); P(x - 5, y - 17, 11, 13, "#2f3a32"); P(x - 6, y - 18, 13, 1, "#5a6a62");
    P(x - 7, y - 3, 2, 3, "#3a4a42"); P(x + 6, y - 3, 2, 3, "#3a4a42");
    P(x - 2, y - 15, 1, 2, "#ff5a6a"); P(x - 3, y - 13, 5, 1, "#ffffff"); P(x - 3, y - 12, 4, 6, "#d8ecf4"); P(x - 3, y - 10, 4, 4, "#5a3018"); P(x - 2, y - 10, 1, 1, "#e8f8ff"); P(x, y - 8, 1, 1, "#e8f8ff");
    for (const [a, b] of [[3, -14], [2, -13], [4, -13], [3, -12], [3, -15], [3, -11]]) P(x + a, y + b, 1, 1, Math.floor(tm * 2) % 2 ? "#9fe0ff" : "#ffffff");
    P(x + 2, y - 8, 3, 1, "#e9c46a");
  };
  const drawBin = (x, y) => { P(x - 4, y - 10, 9, 10, "#4f8ad9"); P(x - 4, y - 10, 9, 2, "#7fb0f0"); P(x - 2, y - 9, 5, 1, "#1c2a40"); P(x + 4, y - 8, 1, 8, "#3a6ab0"); P(x - 1, y - 6, 3, 3, "#ffffff"); P(x, y - 5, 1, 1, "#4f8ad9"); };
  const drawFan = (x, y, tm) => {
    P(x - 5, y - 1, 11, 2, "#7a848c"); P(x - 5, y - 1, 11, 1, "#9aa4ac"); P(x, y - 13, 1, 12, "#9aa4ac");
    const cx = x, cy = y - 18, sp = acOn ? 10 : 22, fr = Math.floor(tm * sp) % 3;
    for (let a = 0; a < 16; a++) { const t = a / 16 * 6.283; P(cx + Math.round(Math.cos(t) * 5), cy + Math.round(Math.sin(t) * 5), 1, 1, "#c8d0d8"); }
    for (let b = 0; b < 3; b++) { const t = (b / 3 + fr / 9) * 6.283; for (let r = 1; r <= 3; r++) P(cx + Math.round(Math.cos(t) * r), cy + Math.round(Math.sin(t) * r), 1, 1, "#7fd0ff"); }
    P(cx, cy, 1, 1, "#4a5a6a");
  };
  const drawMark = (x, y, tm) => { if (Math.floor(tm * 4) % 2) return; if (true) { g.save(); g.shadowColor = "rgba(0,0,0,.4)"; g.shadowBlur = 2 * KS; g.beginPath(); g.moveTo(x + 3.5, y - 0.6); g.lineTo(x + 8, y + 7.4); g.lineTo(x - 1, y + 7.4); g.closePath(); g.fillStyle = "#ffd23f"; g.fill(); g.restore(); g.save(); g.lineWidth = 0.6; g.strokeStyle = "#1c1c24"; g.beginPath(); g.moveTo(x + 3.5, y - 0.6); g.lineTo(x + 8, y + 7.4); g.lineTo(x - 1, y + 7.4); g.closePath(); g.stroke(); g.fillStyle = "#1c1c24"; g.fillRect(x + 3.1, y + 2, 0.8, 3); g.fillRect(x + 3.1, y + 5.6, 0.8, 0.8); g.restore(); return; } P(x, y + 1, 7, 6, "#ffd23f"); P(x + 1, y, 5, 1, "#ffd23f"); P(x - 1, y + 2, 1, 4, "#1c1c24"); P(x + 7, y + 2, 1, 4, "#1c1c24"); P(x + 3, y + 1, 1, 3, "#1c1c24"); P(x + 3, y + 5, 1, 1, "#1c1c24"); };
  const digits = (x, y, n, col) => { String(n).split("").forEach((d, i) => { const m = DIG[+d]; for (let k = 0; k < 15; k++) if (m[k] === "1") P(x + i * 4 + (k % 3), y + Math.floor(k / 3), 1, 1, col); }); };

  const render = (tm) => {
    g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = false;
    g.drawImage(BG, 0, 0);
    if (!OUTH && OUTI.ok) OUTH = buildOut();
    const OS = OUTH ? KS : 1, OI = OUTH || OUT;
    // 바깥(아지랑이): 창문·문 유리 안에 줄마다 흔들어 그린다
    const haze = (x, y0, w, h) => { if (OUTH) g.imageSmoothingEnabled = true; for (let r = 0; r < h; r++) { const yy = y0 + r, amp = yy > 30 ? 1.4 : yy > 18 ? 0.8 : 0; const ox = Math.round(Math.sin(tm * 5 + yy * 0.8) * amp); g.drawImage(OI, (x + ox) * OS, yy * OS, w * OS, OS, x, yy, w, 1); } g.imageSmoothingEnabled = false; };
    haze(33, 7, 25, 19); P(44, 7, 1, 19, "#f6f6f4"); P(33, 15, 25, 1, "#f6f6f4");
    haze(8, 14, 20, 40);
    // 미닫이 유리문
    const near = ppl.some((p) => !p.gone && Math.hypot(p.x - SP.door[0], p.y - SP.door[1]) < 14);
    door = clamp(door + (near ? 0.07 : -0.045), 0, 1);
    g.save(); g.beginPath(); g.rect(8, 14, 20, 40); g.clip();
    const o = Math.round(door * 9);
    for (const [px0, dir] of [[8, -1], [18, 1]]) { const px = px0 + dir * o; g.fillStyle = "rgba(190,230,242,.33)"; g.fillRect(px, 14, 10, 40); g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(px + 2, 17, 1, 7); g.fillRect(px + 3, 16, 1, 3); g.fillStyle = "#4a5560"; g.fillRect(px + (dir < 0 ? 9 : 0), 14, 1, 40); g.fillStyle = "#c8ccd0"; g.fillRect(px + (dir < 0 ? 7 : 2), 32, 1, 5); }
    g.restore();
    // 햇빛 반짝임
    for (let k = 0; k < 4; k++) { const ph = (tm * 0.35 + k * 0.25) % 1, yy = FL + 6 + Math.round(ph * 50), xx = Math.round(36 + (yy - FL) * 0.7 + Math.sin(tm * 2 + k) * 6); g.fillStyle = `rgba(255,255,220,${0.5 * Math.sin(ph * Math.PI)})`; g.fillRect(xx, yy, 1, 1); }
    // 에어컨: 켜짐(바람)·꺼짐(빨간 불)
    P(150, 6, 3, 1, acOn ? "#3fe07a" : Math.floor(tm * 4) % 2 ? "#ff3b3b" : "#7a2020");
    P(112, 12, 42, 1, acOn ? "#9aa8b2" : "#d0d6dc");
    if (acOn) for (let k = 0; k < 7; k++) { const ph = (tm * 0.9 + k / 7) % 1, xx = 114 + k * 6 + Math.round(Math.sin(tm * 3 + k) * 1.5), yy = 14 + Math.round(ph * 14); g.fillStyle = `rgba(160,220,255,${0.75 * (1 - ph)})`; g.fillRect(xx, yy, 2, 1); }
    else { P(118, 6, 2, 1, "#9aa4ac"); P(121, 5, 1, 1, "#9aa4ac"); }
    // 키오스크 화면
    const paying = ppl.some((p) => p.actK === "pay" && p.act > 0 && p.st === "kq");
    P(40, 29, 8, 9, paying ? (Math.floor(tm * 6) % 2 ? "#e9c46a" : "#7fd1ff") : Math.floor(tm * 1.5) % 2 ? "#3a9ad5" : "#2f86c0");
    P(41, 31, 5, 1, "#cfe8ff"); P(41, 33, 4, 1, "#cfe8ff"); P(41, 35, 6, 1, paying ? "#2a6a3a" : "#ffd166");
    // 원두 통
    const br = Math.round(stock.bean / 8 * 7); if (br > 0) { P(66, 11 - br, 7, br, "#6a3c1e"); for (let k = 0; k < br * 2; k++) P(66 + ((k * 3) % 7), 11 - br + (k % br), 1, 1, "#8a5a32"); }
    // 만드는 중: 컵·커피 줄기·김
    const mk = ppl.find((p) => p.st === "mq" && p.act > 0);
    if (mk) { P(69, 27, 4, 4, ORD[mk.ord].need.includes("ice") ? "#d8ecf4" : "#f6f2ea"); P(69, 27, 4, 1, "#ffffff"); if (Math.floor(tm * 12) % 3) P(70, 24, 1, 3, "#5a3018"); for (let i = 0; i < 3; i++) { const ph = (tm * 1.2 + i * 0.33) % 1; g.fillStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`; g.fillRect(70 + Math.round(Math.sin((tm + i) * 6)), 12 - Math.round(ph * 9), 1, 1); } }
    // 제빙기
    const sx = iceBroken && iceShake > 0 ? (Math.floor(tm * 40) % 2 ? 1 : -1) : 0;
    if (sx) { g.drawImage(BG, 84, 14, 17, 20, 84 + sx, 14, 17, 20); }
    for (let k = 0; k < stock.ice; k++) { const col = k % 3, row = Math.floor(k / 3), xx = 87 + col * 3 + sx, yy = 25 - row * 4; P(xx, yy, 3, 3, "#d8f4ff"); P(xx, yy, 3, 1, "#ffffff"); P(xx + 2, yy + 1, 1, 2, "#9cc8e4"); }
    P(97 + sx, 16, 2, 1, iceBroken ? (Math.floor(tm * 5) % 2 ? "#ff3b3b" : "#7a2020") : "#3fe07a");
    if (iceBroken) {
      for (let i = 0; i < 3; i++) { const ph = (tm * 0.8 + i / 3) % 1; g.fillStyle = `rgba(120,120,130,${0.6 * (1 - ph)})`; g.fillRect(88 + i * 4 + Math.round(Math.sin(tm * 3 + i) * 2), 13 - Math.round(ph * 12), 3, 2); }
      if (Math.floor(tm * 7) % 3 === 0) P(86 + rint(12), 18 + rint(10), 1, 1, "#ffe066");
      const ph = (tm * 1.5) % 1; P(91, 33 + Math.round(ph * 4), 1, 1, "#7fd0ff");
      // 수리 막대
      const rec = incs.find((r) => r.type === "ice" && !r.t1), need = rec ? rec.need : 7;
      P(84, 36, 17, 3, "#1c1c24"); P(85, 37, Math.round(15 * iceFix / need), 1, "#5fe08a");
    }
    // 우유 냉장고
    for (let k = 0; k < stock.milk; k++) { const col = k % 3, row = Math.floor(k / 3), xx = 107 + col * 3, yy = 28 - row * 6; P(xx, yy - 1, 2, 4, "#ffffff"); P(xx, yy + 1, 2, 1, "#4f8ad9"); }
    P(106, 20, 1, 12, "rgba(255,255,255,.5)");
    // 컵 탑
    for (let k = 0; k < stock.cup; k++) { const col = k % 2, row = Math.floor(k / 2), xx = 122 + col * 7, yy = 30 - row * 2; P(xx, yy, 5, 3, "#e8f4fa"); P(xx, yy, 5, 1, "#ffffff"); P(xx + 4, yy, 1, 3, "#b8d0dc"); }
    // 빨대
    for (let k = 0; k < stock.straw; k++) { const xx = 141 + Math.round(k * 0.7), top = 20 + (k % 3); P(xx, top, 1, 27 - top, k % 2 ? "#ff5a6a" : "#3fb8e0"); P(xx, top + 2, 1, 1, "#ffffff"); }
    // 웅덩이
    if (puddle) {
      const k = 1 - puddle.clean * 0.75, a = 0.85 * (1 - puddle.clean * 0.5);
      g.fillStyle = `rgba(138,90,50,${a})`;
      for (const [bx, by, br0] of puddle.blobs) { const br1 = br0 * k; g.beginPath(); g.ellipse(puddle.x + bx * k, puddle.y + by * k, br1 + 0.5, br1 * 0.5 + 0.3, 0, 0, 6.3); g.fill(); }
      g.fillStyle = `rgba(255,255,255,${0.7 * k})`; g.fillRect(Math.round(puddle.x - 3 * k), Math.round(puddle.y - 1), 2, 1); g.fillRect(Math.round(puddle.x + 2 * k), Math.round(puddle.y + 1), 1, 1);
      if (puddle.clean < 0.5) { for (const [cx2, cy2] of puddle.cubes) { P(puddle.x + cx2, puddle.y + cy2, 2, 2, "#e8f8ff"); } P(puddle.x + 6, puddle.y - 3, 3, 5, "#d8ecf4"); P(puddle.x + 6, puddle.y - 3, 3, 1, "#ffffff"); P(puddle.x + 9, puddle.y - 2, 2, 1, "#ff5a6a"); }
    }
    // 깊이 순서: 탁자·의자·화분·선풍기·사람·사장님
    const items = [];
    TABLES.forEach((t) => items.push([t[1], () => tableV(t)]));
    items.push([129.5 + DY, () => stoolV(45, 129 + DY)], [123.5 + DY, () => stoolV(113, 123 + DY)], [128.5 + DY, () => stoolV(22, 128 + DY)]);
    sitters.forEach((s) => items.push([s.y + 0.6, () => { const sip = Math.floor(tm * 0.7 + s.x) % 3 === 0; if (s.art.ok) { body(s.art, inT >= 29 ? "sad" : sip ? "smile" : "neutral", s.x + (s.flip ? -2 : 2), s.y - 6, 30, { flip: s.flip, fade: 0.36 }); drinkV(g, "al", s.x + (s.flip ? -9 : 6), s.y - 21); return; } const c = uSprite(s, "sit" + (sip ? 1 : 0), { v: "s", sit: true, carry: 1, arm: null }, s.flip); g.drawImage(c, Math.round(s.x - 8), Math.round(s.y - 29)); }]));
    items.push([95.5 + DY * 0.5, () => stoolV(123, 95 + DY * 0.5)], [86, () => signV(142, 86, tm)], [76, () => binV(152, 76)], [84, () => plantV(5, 84)], [PY - 4, () => plantV(5, PY - 4)], [PY - 4, () => fanV(150, PY - 4, tm)]);
    ppl.forEach((p) => { if (!p.gone) items.push([p.y, () => drawPerson(p, tm)]); });
    owners.forEach((ow) => items.push([60, () => {
      const a = ow.t < 0.12 ? ow.t / 0.12 : ow.t > 0.75 ? Math.max(0, (0.95 - ow.t) / 0.2) : 1, lift = ow.t < 0.2 ? Math.round((0.2 - ow.t) * 30) : 0;
      const me = ART[AVK];
      if (me && me.ok) { g.save(); g.globalAlpha = a; body(me, ow.t > 0.35 && ow.t < 0.6 ? "smile" : "neutral", ow.x, 58 + lift, 30, { fade: 0.35 }); boxV(g, ow.x - 4, 40 + lift - (ow.t > 0.35 && ow.t < 0.6 ? 2 : 0)); g.restore(); return; }
      g.globalAlpha = a; const c = uSprite(ow, "boss" + (Math.floor(tm * 6) % 2), { v: "b", f: Math.floor(tm * 6) % 2 ? 1 : 3 }, false);
      g.drawImage(c, Math.round(ow.x - 8), 31 + lift); g.drawImage(BOXC, Math.round(ow.x - 5), 24 + lift - (ow.t > 0.35 && ow.t < 0.6 ? 2 : 0)); g.globalAlpha = 1;
    }]));
    items.sort((a, b) => a[0] - b[0]).forEach((it) => it[1]());
    // 머리 위: 주문·화남·땀
    ppl.forEach((p) => {
      if (p.gone) return;
      if ((p.st === "mq") && !p.angry) drawBubble(p, tm);
      if (p.angry > 0) drawAnger(Math.round(p.x) + 3, Math.round(p.y) - 36, tm);
      if (inT >= 27 && p.slip <= 0) { const ph = (tm * 2 + p.walkT * 0.1) % 1; P(Math.round(p.x) + 5, Math.round(p.y) - 26 + Math.round(ph * 4), 1, 2, "#7fd0ff"); }
    });
    if (inT >= 27) sitters.forEach((s) => { const ph = (tm * 2 + s.x) % 1; P(Math.round(s.x) + (s.flip ? -3 : 3), Math.round(s.y) - 22 + Math.round(ph * 4), 1, 2, "#7fd0ff"); });
    // 불꽃·반짝이
    for (const s of sparks) { if (s.star) { P(Math.round(s.x), Math.round(s.y) - 1, 1, 3, s.c); P(Math.round(s.x) - 1, Math.round(s.y), 3, 1, s.c); } else P(Math.round(s.x), Math.round(s.y), 1, 1, s.c); }
    // 더위: 붉은 기운 + 실내 아지랑이
    if (inT > 25.5) {
      const a = clamp((inT - 25.5) / 8, 0, 1);
      g.fillStyle = `rgba(255,120,40,${0.22 * a})`; g.fillRect(0, 0, W, PY);
      const n = Math.round(a * 14); for (let k = 0; k < n; k++) { const yy = FL + rint(PY - FL - 2), ox = Math.round(Math.sin(tm * 9 + yy) * 1.4); if (ox) g.drawImage(cv, 0, yy * KS, W * KS, 2 * KS, ox, yy, W, 2); }
    }
    // 사고 표시(!)
    if (!acOn) drawMark(130, 16, tm);
    if (iceBroken) drawMark(89, 2, tm + 0.12);
    if (puddle) drawMark(Math.round(puddle.x) - 3, Math.round(puddle.y) - 14, tm + 0.25);
    if (mopAt && puddle) { const wob = Math.round(Math.sin(tm * 20) * 1); g.drawImage(MOP, Math.round(mopAt[0]) - 8 + wob, Math.round(mopAt[1]) - 21); }
    // ── 재고 칸(150 기준 좌표로 그리고 아래로 옮긴다) ──
    g.save(); g.translate(0, PY - 150);
    ITEMS.forEach((it, i) => {
      const fx = slotFx[i], s = stock[it.id], x0 = 2 + i * 26 + (fx.shake > 0 ? (Math.floor(tm * 40) % 2 ? 1 : -1) : 0);
      const low = s <= 1, lock = it.id === "ice" && iceBroken;
      P(x0, 154, 24, 22, low && Math.floor(tm * 4) % 2 ? "#6a2a22" : "#4e3a2b"); P(x0, 154, 24, 1, "#6a503c");
      if (ICV[it.id].complete && ICV[it.id].naturalWidth) { g.imageSmoothingEnabled = true; g.drawImage(ICV[it.id], x0 + 3, 155.4, 18, 18); g.imageSmoothingEnabled = false; } else g.drawImage(ICC[it.id], x0 + 3, 156);
      if (s <= 0) { for (let k = 0; k < 14; k++) { P(x0 + 5 + k, 158 + k, 2, 1, "#ff3b3b"); P(x0 + 18 - k, 158 + k, 2, 1, "#ff3b3b"); } }
      if (lock) { g.fillStyle = "rgba(30,30,40,.55)"; g.fillRect(x0, 154, 24, 22); P(x0 + 8, 160, 8, 2, "#c8ccd4"); P(x0 + 11, 162, 2, 8, "#c8ccd4"); P(x0 + 7, 158, 2, 3, "#c8ccd4"); P(x0 + 15, 158, 2, 3, "#c8ccd4"); }
      // 막대
      P(x0, 176, 24, 8, "#2a1d14");
      const sw = Math.floor(22 / it.max), off = Math.floor((24 - sw * it.max) / 2) + 1;
      const col = s <= 1 ? "#ff5a4a" : s <= it.max / 2 ? "#ffc23f" : "#5fe08a";
      for (let k = 0; k < it.max; k++) { rr(x0 + off + k * sw + 0.2, 178, sw - 1.2, 4, 1); g.fillStyle = k < s ? col : "#3e2c20"; g.fill(); }
      // 채우기 표시(+)
            if (fx.pend) { g.fillStyle = "rgba(20,40,60,.5)"; g.fillRect(x0, 154, 24, 43); for (let k = 0; k < 3; k++) if (Math.floor(tm * 6) % 3 >= k) P(x0 + 6 + k * 5, 186, 3, 3, "#9fe0ff"); }
      if (fx.flash > 0) { g.fillStyle = `rgba(255,255,255,${fx.flash * 1.6})`; g.fillRect(x0, 154, 24, 43); }
    });
    // 창고 상자
    const nb = Math.min(boxes, 8);
    for (let b = 0; b < nb; b++) { const col = b % 2, row = Math.floor(b / 2), drop = b >= nb - 3 && boxDrop > 0 ? Math.round(boxDrop * 40) : 0; boxV(g, 136 + col * 11, 179 - row * 8 - drop); }
    g.restore();
  };

  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tut >= 0) {
      tutT += dt; if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else tutNext(1); }
      if (puddle) puddle.age = 0;
      guide(tut === 1 ? { x: 14, y: PY + 6, t: "얼음 칸 <b>톡!</b>" } : tut === 2 && puddle ? { x: puddle.x, y: puddle.y - 4, t: "<b>문질러</b> 닦기!", sw: 1 } : null);
    } else if (!over) {
      if (!t0) t0 = now;
      el = (now - t0) / 1000;
      guide(taskNow());
      // 손님: 처음 한산 → 점점 붐빔
      if (el >= nextAt && el < T - 1.2) { spawn(); const prog = Math.min(1, el / T); nextAt = el + (1.75 - 1.1 * prog) * (0.8 + rnd() * 0.4) * Math.pow(ez, 0.4); }
      if (incQ.length && el >= incAt[4 - incQ.length]) { const ty = incQ[0], busy = (ty === "ice" && iceBroken) || (ty === "ac" && !acOn) || (ty === "spill" && puddle); if (!busy) { incQ.shift(); startInc(ty); } else incAt[4 - incQ.length] += 1; }
      if (!delivered && el >= 15) { delivered = true; boxes += 3; boxDrop = 1; S.truck(); F.msg("택배 도착! 창고 상자 +3"); }
      if (!hint2 && el >= 2.2) { hint2 = true; F.msg("아래 재고 칸을 톡하면 채워요"); }
      // 더위
      if (!acOn) inT = Math.min(34, inT + dt * 1.6); else inT = Math.max(24, inT - dt * 2.4);
      // 고장 난 제빙기: 얼음이 녹는다
      if (iceBroken) { meltT += dt; if (meltT >= 2.3 * ez) { meltT = 0; if (stock.ice > 0) stock.ice--; } } else meltT = 0;
      if (puddle) puddle.age += dt;
      for (const p of ppl) if (!p.gone) { step(p, dt); slipCheck(p); }
      for (let i = ppl.length - 1; i >= 0; i--) if (ppl[i].gone) ppl.splice(i, 1);
      cicT -= dt; if (cicT <= 0) { S.cicada(); cicT = 2.6 + rnd() * 1.6; }
      const ts = `실내 ${Math.round(inT)}℃`; if (tpEl.textContent !== ts) tpEl.textContent = ts; tpEl.classList.toggle("hot", inT >= 28);
    }
    for (let i = owners.length - 1; i >= 0; i--) { owners[i].t += dt; if (owners[i].t > 0.95) owners.splice(i, 1); }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 80 * dt; if (s.t <= 0) sparks.splice(i, 1); }
    slotFx.forEach((f) => { f.flash = Math.max(0, f.flash - dt); f.shake = Math.max(0, f.shake - dt); });
    iceShake = Math.max(0, iceShake - dt); boxDrop = Math.max(0, boxDrop - dt * 3);
    lbUpd();
    render(tut >= 0 ? now / 1000 : el);
    raf = requestAnimationFrame(loop);
  };

  // ── 끝: 영수증 ──
  const incScore = () => {
    const rs = incs.filter((r) => r.t1 || r.t0 < T - 3);
    if (!rs.length) return 1;
    return rs.reduce((a, r) => a + (r.t1 ? clamp(1 - (r.t1 - r.t0 - 1.5) / (7 * ez), 0.25, 1) : 0) - 0.25 * r.slips, 0) / rs.length;
  };
  const printerURL = () => {
    try { return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 18"><defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="1" stop-color="#b8bcc4"/></linearGradient></defs><rect x="2" y="0" width="68" height="4" rx="1.4" fill="#c4c8cc"/><rect x="0" y="2.4" width="72" height="15" rx="3" fill="url(#p)" stroke="#8a9098" stroke-width=".6"/><rect x="8" y="11.4" width="56" height="2.4" rx="1.2" fill="#2a2e34"/><rect x="4" y="5.4" width="20" height="3" rx="1.2" fill="#b8bcc2"/><circle cx="62" cy="6.6" r="1.4" fill="#3fe07a"/><circle cx="56" cy="6.6" r="1.4" fill="#e0b040"/></svg>`); } catch (e) {}
    const c = mkC(70, 16, (Q) => { Q(0, 2, 70, 14, "#d8dce0"); Q(0, 2, 70, 1, "#f4f6f8"); Q(2, 0, 66, 3, "#c4c8cc"); Q(8, 11, 54, 2, "#2a2e34"); Q(8, 13, 54, 1, "#5a5e64"); Q(60, 5, 3, 2, "#3fe07a"); Q(54, 5, 3, 2, "#e0b040"); Q(4, 5, 20, 3, "#b8bcc2"); Q(5, 6, 18, 1, "#9aa0a8"); Q(0, 15, 70, 1, "#9aa0a8"); });
    return c.toDataURL();
  };
  const end = () => {
    if (over) return; over = true;
    const tot = served + lost, ratio = tot ? served / tot : 0.5, inc = clamp(incScore(), 0, 1);
    const fixed = incs.filter((r) => r.t1).length;
    const score = 0.72 * ratio + 0.28 * inc;
    dim.classList.add("on");
    const row = (a, b, c = "", cls = "") => `<p class="${cls}"><span>${a}</span><span>${b}</span>${c !== "" ? `<span>${c}</span>` : ""}</p>`;
    const lines = [
      `<b class="h">무인카페 · 오늘 매출</b>`, `<small>한여름 낮 피크 · 바깥 35℃</small>`, `<hr>`,
      ...Object.keys(ORD).map((k) => row(ORD[k].n, `x${sold[k]}`, won(sold[k] * ORD[k].price))),
      `<hr>`, row("판 손님", `${served}/${tot}명`), row("그냥 간 손님", `${lost}명`, "", lost ? "bad" : ""), row("사고 처리", `${fixed}/${incs.length}건`, "", fixed < incs.length ? "bad" : ""), row("쓴 상자", `${refills}개`),
      `<hr>`, row("합계", `${won(sales)}원`, "", "tot"), `<div class="bc"></div>`, `<div class="thx">시원한 하루 되세요 :)</div>`,
    ];
    const box = document.createElement("div"); box.className = "mg-u2rc";
    box.innerHTML = `<img class="prn" src="${printerURL()}" alt=""><div class="pap"><div class="in">${lines.join("")}</div></div>`;
    wrap.appendChild(box);
    const pap = box.querySelector(".pap"), inner = box.querySelector(".in");
    tone(1200, 0.06, "square", 0.05);
    const full = inner.scrollHeight, t1 = performance.now(), DUR = RM() ? 300 : 1900;
    let lastTick = 0;
    const grow = (now) => {
      if (!pap.isConnected) return;
      const p = Math.min(1, (now - t1 - 350) / DUR);
      if (p > 0) { pap.style.height = Math.round(full * p) + "px"; if (now - lastTick > 55) { lastTick = now; noise(0.03, 2600 + rnd() * 800, 0.05, 0, 2); } }
      if (p < 1) requestAnimationFrame(grow);
      else { setTimeout(() => { pap.classList.add("torn"); SFX.snap(); noise(0.12, 3500, 0.12); vib(20); }, 250); setTimeout(() => finish(score, `${served}명에게 판매 · ${lost}명 놓침 · 매출 <b>${won(sales)}원</b>`, "", [["판 손님 비율", ratio], ["사고 처리", inc]]), 1500); }
    };
    requestAnimationFrame(grow);
  };
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.ucafe2 = { st: () => ({ stock, boxes, served, lost, iceBroken, acOn, puddle: !!puddle, el, incs, inT, refills }), tap: tapL, scrubAt: (x, y, d) => { mopAt = [x, y]; scrub(d, x, y); }, puddle: () => puddle && [puddle.x, puddle.y], PY: () => PY, ITEMS, tut: () => tut, start: startGame,
    tutDo: () => { if (tut === 1) tapL(14, PY + 10); else if (tut === 2 && puddle) { mopAt = [puddle.x, puddle.y]; scrub(30, puddle.x, puddle.y); } else if (tut === 3) startGame(); },
    auto: () => { if (iceBroken) for (let k = 0; k < 3; k++) hitIce(); if (!acOn) fixAC(); if (puddle) scrub(40, puddle.x, puddle.y); ITEMS.forEach((it, i) => { if (stock[it.id] <= 2 && !slotFx[i].pend) refill(i); }); } };
  updSc(); lbUpd(); render(0); raf = requestAnimationFrame(loop);
}
