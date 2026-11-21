// 프랜차이즈 치킨 3탄: 치킨은 사람 장사 (바탕 근무표는 도트 캔버스 160x280~330, 카드·블록·얼굴은 고해상도 벡터 캔버스 + 캐릭터 그림)
// 일요일 밤, 다음 주 근무표를 짠다. 위는 요일(화~일, 월 휴무) x 시간대(저녁 17~21 / 밤 21~01) 격자, 칸마다 자리 2개.
// 금·토 저녁, 토 밤, 축구 경기 날(수 밤)은 '피크' — 두 명, 그중 튀김 1 + 배달 1 이 꼭 있어야 한다.
// 아래 알바 카드(도트 얼굴)를 끌어 칸에 놓고, 놓기 전에 옆으로 쓱 밀거나 블록 끝을 끌어 여러 날로 늘린다. 블록 톡 = 그 칸 빼기.
// 인건비 막대가 예산(75만)을 넘으면 안 되고, 한 사람이 주 15시간을 넘기면 주휴수당이 붙어 비용이 확 뛴다.
// 중간에 한 명이 "다음 주부터 못 나와요" 문자 → 그 사람 칸이 비고, 새 지원자 카드가 온다. 빈 자리는 사장(나)이 직접 들어간다(체력 감소).
// 끝나면 다음 주가 빨리 감기로 지나가며 칸마다 가게가 돌아가는 모습, 빈 칸엔 사장이 튀김기 앞에서 땀 흘린다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSprite, uOutline } from "../mg.js";

const W = 160, T = 36, EVT = 14;
const DAYS = ["화", "수", "목", "금", "토", "일"];
const ROWN = [["저녁", "17~21"], ["밤", "21~01"]];
const PEAK = { "1,1": "축구", "0,3": "금", "0,4": "토", "1,4": "토" };
const HRS = 4, BUDGET = 750000, JH = 15;
const SKN = { F: "튀김", P: "포장", D: "배달" };
const GX = 19, CW = 23, GY = 17, LH = 13, RG = 4;
const rowTop = (r) => GY + r * (2 * LH + RG);
const GB = rowTop(1) + 2 * LH;
const CX = [2, 55, 108], CWD = 50;

// 알바 카드: 시급·숙련(F 튀김 P 포장 D 배달)·가능 시간(저녁/밤, 화~일)·성격 태그·도트 얼굴
const PEOPLE = [
  { id: "A", ck: "c084", n: "휴학생", w: 11500, sk: "FP", av: ["111111", "000000"], tr: "튀김 에이스", pen: 0, col: "#ff8a3b", L: { skin: "#f2c8a0", hair: "#2a1c14", st: "band", shirt: "#ff9a3b" }, sp: { style: "short", shirt: "#ff9a3b", pants: "#3a3a42", hat: "#e0402a" }, bye: "복학 신청했어요… 다음 주부터 못 나와요ㅠ" },
  { id: "B", ck: "c016", n: "대학생", w: 10320, sk: "FP", av: ["000000", "110011"], tr: "목·금 시험", pen: 0, col: "#6f8fe0", L: { skin: "#f6d2b0", hair: "#5a3a22", st: "bob", shirt: "#3a4a8a" }, sp: { style: "bob", shirt: "#3a4a8a", pants: "#2c3550", glasses: true }, bye: "시험 망하면 큰일나서… 다음 주부터 못 나와요" },
  { id: "C", ck: "c090", n: "배달 형님", w: 12000, sk: "PD", av: ["011111", "011111"], tr: "오토바이 있음", pen: 0, col: "#e04a4a", L: { skin: "#e0b08a", hair: "#1a1410", st: "helmet", shirt: "#2a2a34" }, sp: { style: "buzz", shirt: "#2a2a34", pants: "#2c2c34", hat: "#e0402a" }, bye: "옆 가게가 건당 더 준대요… 다음 주부터 못 나와요" },
  { id: "D", ck: "c078", n: "직장인", w: 10800, sk: "FD", av: ["000011", "011110"], tr: "평일은 밤만", pen: 0, col: "#4ab0a0", L: { skin: "#f0c8a8", hair: "#22201e", st: "part", shirt: "#f4f4f0" }, sp: { style: "short", shirt: "#e8ecf0", pants: "#1f2a3a" }, bye: "본업에 야근이 잡혀서… 다음 주부터 못 나와요" },
  { id: "E", ck: "c051", n: "취준생", w: 10320, sk: "FPD", av: ["111111", "111111"], tr: "지각 잦음", pen: 0.15, col: "#a07ad8", L: { skin: "#f4ccaa", hair: "#3a2a20", st: "messy", shirt: "#8a8a96" }, sp: { style: "spiky", shirt: "#8a8a96", pants: "#3a3a42", hood: "#76768a" }, bye: "사장님 저 취업했어요!! 다음 주부터 못 나와요ㅠㅠ" },
];
const NEWBIE = { id: "R", ck: "c015", n: "첫 알바", w: 10320, sk: "FD", av: ["111111", "111111"], tr: "첫 알바(느림)", pen: 0.1, col: "#f0b030", L: { skin: "#f6d4b4", hair: "#4a2a1a", st: "cap", shirt: "#4fa860" }, sp: { style: "long", shirt: "#4fa860", pants: "#3a3a42", hat: "#ffb03b" } };

const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const hx = (c) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); t = c01(t); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const won = (n) => (n / 10000).toFixed(1).replace(/\.0$/, "") + "만";

// 캔버스 한 장(둘레 1픽셀 자리 + 어두운 테두리)
function mkC(w, h, fn, ol = true) {
  const c = document.createElement("canvas"); c.width = w + 2; c.height = h + 2; const g = c.getContext("2d");
  fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); }, g);
  if (ol) uOutline(c); return c;
}
// 도트 얼굴 20x20. mood: 0 보통 1 웃음 2 미안(눈물) 3 놀람
function faceArt(P, L, mood = 0) {
  const sk = L.skin, hr = L.hair, sh = L.shirt, dk = mix(sk, "#5a2a1a", 0.22);
  P(1, 16, 18, 4, sh); P(1, 16, 18, 1, mix(sh, "#ffffff", 0.3)); P(1, 19, 18, 1, mix(sh, "#000000", 0.2));
  P(8, 14, 4, 3, dk);
  P(5, 4, 10, 11, sk); P(4, 6, 12, 7, sk); P(3, 8, 1, 3, sk); P(16, 8, 1, 3, sk); P(5, 14, 10, 1, dk);
  const st = L.st;
  if (st === "band") { P(4, 2, 12, 4, hr); P(4, 6, 1, 3, hr); P(15, 6, 1, 3, hr); P(4, 5, 12, 2, "#e0402a"); P(4, 5, 12, 1, "#ff7a5a"); P(16, 6, 2, 1, "#c0302a"); P(17, 7, 2, 2, "#c0302a"); }
  else if (st === "bob") { P(4, 2, 12, 3, hr); P(3, 4, 2, 10, hr); P(15, 4, 2, 10, hr); P(5, 5, 5, 1, hr); P(4, 3, 3, 1, mix(hr, "#ffffff", 0.25)); }
  else if (st === "helmet") { P(3, 1, 14, 6, "#e0402a"); P(3, 1, 14, 1, "#ff7a5a"); P(9, 1, 2, 6, "#ffffff"); P(3, 7, 14, 1, "#2a2a30"); P(2, 5, 1, 4, "#c0302a"); P(17, 5, 1, 4, "#c0302a"); for (let k = 0; k < 6; k++) P(5 + k * 2 - (k % 2), 13 + (k % 2), 1, 1, "#6a4a34"); }
  else if (st === "part") { P(4, 2, 12, 3, hr); P(4, 5, 2, 3, hr); P(14, 5, 2, 2, hr); P(7, 2, 1, 2, mix(hr, "#ffffff", 0.3)); P(9, 16, 2, 4, "#2f4f9a"); P(9, 16, 2, 1, "#4a6ac0"); P(7, 16, 2, 1, "#ffffff"); P(11, 16, 2, 1, "#ffffff"); }
  else if (st === "messy") { P(4, 2, 12, 4, hr); P(4, 1, 2, 1, hr); P(8, 0, 2, 2, hr); P(13, 1, 2, 1, hr); P(11, 1, 1, 1, hr); P(4, 6, 1, 4, hr); P(15, 6, 1, 3, hr); P(6, 5, 2, 1, hr); P(7, 17, 1, 3, "#ffffff"); P(12, 17, 1, 3, "#ffffff"); P(3, 15, 14, 2, "#76768a"); }
  else if (st === "cap") { P(4, 2, 12, 4, "#ffb03b"); P(4, 2, 12, 1, "#ffd27a"); P(4, 6, 12, 1, "#c8801a"); P(9, 3, 2, 2, "#c0302a"); P(4, 7, 1, 3, hr); P(15, 7, 1, 3, hr); P(16, 8, 2, 6, hr); }
  // 눈·입
  const ey = 9, ec = "#2a1e1a";
  if (mood === 1) { P(6, ey + 1, 1, 1, ec); P(7, ey, 1, 1, ec); P(8, ey + 1, 1, 1, ec); P(11, ey + 1, 1, 1, ec); P(12, ey, 1, 1, ec); P(13, ey + 1, 1, 1, ec); P(8, 12, 4, 1, "#9a3a30"); P(9, 13, 2, 1, "#e06a6a"); P(5, 12, 2, 1, "#f4a0a0"); P(13, 12, 2, 1, "#f4a0a0"); }
  else if (mood === 2) { P(6, ey - 1, 2, 1, mix(hr, "#000000", 0.2)); P(12, ey - 1, 2, 1, mix(hr, "#000000", 0.2)); P(7, ey + 1, 1, 1, ec); P(12, ey + 1, 1, 1, ec); P(9, 12, 2, 1, "#9a3a30"); P(8, 13, 1, 1, "#9a3a30"); P(11, 13, 1, 1, "#9a3a30"); P(13, ey + 2, 1, 2, "#6ac0ff"); P(6, ey + 2, 1, 2, "#6ac0ff"); }
  else if (mood === 3) { P(6, ey - 1, 2, 2, ec); P(12, ey - 1, 2, 2, ec); P(6, ey - 1, 1, 1, "#ffffff"); P(12, ey - 1, 1, 1, "#ffffff"); P(9, 12, 2, 2, "#6a2a20"); }
  else { P(7, ey, 1, 2, ec); P(12, ey, 1, 2, ec); P(9, 12, 2, 1, "#9a4a3a"); }
  if (st === "messy" && mood !== 1) { P(6, ey + 2, 2, 1, mix(sk, "#6a4a8a", 0.35)); P(11, ey + 2, 2, 1, mix(sk, "#6a4a8a", 0.35)); }
  if (st === "bob") { P(5, ey - 1, 4, 1, "#2a2a30"); P(11, ey - 1, 4, 1, "#2a2a30"); P(5, ey + 2, 4, 1, "#2a2a30"); P(11, ey + 2, 4, 1, "#2a2a30"); P(5, ey, 1, 2, "#2a2a30"); P(8, ey, 1, 2, "#2a2a30"); P(11, ey, 1, 2, "#2a2a30"); P(14, ey, 1, 2, "#2a2a30"); P(9, ey, 2, 1, "#2a2a30"); }
}
// 블록 위 작은 얼굴(7x7)
function miniArt(P, L) {
  const sk = L.skin, hr = L.hair;
  P(0, 2, 7, 5, sk); P(0, 0, 7, 3, hr); P(0, 3, 1, 2, hr); P(6, 3, 1, 2, hr);
  if (L.st === "helmet") { P(0, 0, 7, 3, "#e0402a"); P(3, 0, 1, 3, "#ffffff"); }
  if (L.st === "cap") { P(0, 0, 7, 2, "#ffb03b"); P(0, 2, 7, 1, "#c8801a"); }
  if (L.st === "band") P(0, 2, 7, 1, "#e0402a");
  if (L.st === "messy") { P(1, -1, 1, 1, hr); P(4, -1, 1, 1, hr); }
  P(2, 4, 1, 1, "#2a1e1a"); P(4, 4, 1, 1, "#2a1e1a");
  if (L.st === "bob") { P(1, 4, 2, 1, "#2a2a30"); P(4, 4, 2, 1, "#2a2a30"); }
}
// 숙련 아이콘(10x9): 튀김 바구니 / 포장 박스 / 배달 오토바이
const ICO = {
  F: (P, x, y) => { P(x + 1, y + 3, 7, 5, "#8a929c"); P(x + 1, y + 3, 7, 1, "#c8ced6"); P(x + 2, y + 4, 5, 3, "#eaa83e"); P(x + 2, y + 4, 2, 1, "#f6d27e"); P(x + 5, y + 5, 1, 1, "#b8761e"); P(x + 3, y + 2, 2, 1, "#f2c060"); P(x + 8, y + 4, 2, 1, "#2a2a30"); P(x + 1, y + 7, 7, 1, "#5a626c"); },
  P: (P, x, y) => { P(x + 1, y + 3, 8, 6, "#d9a868"); P(x + 1, y + 3, 8, 1, "#f0c88a"); P(x + 2, y + 1, 6, 2, "#e8b878"); P(x + 2, y + 1, 6, 1, "#fadca8"); P(x + 4, y + 5, 2, 2, "#c0302a"); P(x + 8, y + 4, 1, 5, "#a8763e"); },
  D: (P, x, y) => { P(x, y + 2, 3, 3, "#ffb03b"); P(x, y + 2, 3, 1, "#ffd27a"); P(x + 2, y + 5, 6, 2, "#2f6fd0"); P(x + 3, y + 4, 3, 1, "#1a1a22"); P(x + 7, y + 2, 1, 4, "#5a626c"); P(x + 6, y + 2, 2, 1, "#2a2a30"); P(x + 1, y + 7, 2, 2, "#2a2a30"); P(x + 7, y + 7, 2, 2, "#2a2a30"); P(x + 1, y + 7, 1, 1, "#8a8a94"); P(x + 7, y + 7, 1, 1, "#8a8a94"); },
};
// 숙련 아이콘(벡터, 22x20)
const ICOSVG = {
  F: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 20"><defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#eaa83e"/><stop offset="1" stop-color="#b8661a"/></linearGradient><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4e8ee"/><stop offset="1" stop-color="#7a828e"/></linearGradient></defs>
    <path d="M17 9.6h3.6" stroke="#2a2a30" stroke-width="2" stroke-linecap="round"/><ellipse cx="7" cy="8.2" rx="3.6" ry="2.9" fill="url(#o)" stroke="#8a4a10" stroke-width=".5"/><ellipse cx="12.4" cy="7.4" rx="3.9" ry="3" fill="url(#o)" stroke="#8a4a10" stroke-width=".5"/>
    <circle cx="6" cy="7.4" r=".5" fill="#fff3c0"/><circle cx="11.4" cy="6.4" r=".55" fill="#fff3c0"/><circle cx="13.6" cy="8" r=".45" fill="#9a5a14"/>
    <path d="M2.4 9h15.2l-1.6 8.4a1.4 1.4 0 0 1-1.4 1.1H5.4A1.4 1.4 0 0 1 4 17.4z" fill="url(#m)" stroke="#4a525c" stroke-width=".7"/><path d="M3.4 12h13.2M3.9 15h12.2M7 9.4l-.5 8.8M10 9.4v8.8M13 9.4l.5 8.8" stroke="#5a626c" stroke-width=".5" opacity=".7"/></svg>`,
  P: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 20"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d4a0"/><stop offset="1" stop-color="#c8904e"/></linearGradient></defs>
    <path d="M3 7.4L11 4l8 3.4v8.6L11 19.4 3 16z" fill="url(#b)" stroke="#8a5a26" stroke-width=".7" stroke-linejoin="round"/><path d="M3 7.4l8 3.4 8-3.4M11 10.8v8.6" fill="none" stroke="#8a5a26" stroke-width=".6"/>
    <path d="M7 5.7l8 3.4" stroke="#e8c090" stroke-width="1.4"/><circle cx="7" cy="13" r="2.2" fill="#e0402a"/><path d="M6 13h2M7 12v2" stroke="#fff" stroke-width=".6"/><path d="M13.4 12.4l3.6-1.5" stroke="#fff6e0" stroke-width=".9" stroke-linecap="round" opacity=".8"/></svg>`,
  D: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 20"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0ff"/><stop offset="1" stop-color="#2456b8"/></linearGradient></defs>
    <rect x="1.4" y="3.6" width="7.4" height="6.6" rx="1.2" fill="#ffb03b" stroke="#a8601a" stroke-width=".6"/><path d="M2 5.4h6.2" stroke="#ffe0a0" stroke-width=".8"/>
    <path d="M3.6 13.4c.4-2.2 2-3.2 4-3.2h6.4l1.6-5.4h2.2" fill="none" stroke="#3a3f4a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 13.6c0-2.4 1.8-3.4 3.6-3.4h6l1.8 3.2z" fill="url(#s)" stroke="#1a3a80" stroke-width=".6"/>
    <circle cx="4.6" cy="15.6" r="2.6" fill="#22242c"/><circle cx="4.6" cy="15.6" r="1" fill="#a8aeb8"/><circle cx="17" cy="15.6" r="2.6" fill="#22242c"/><circle cx="17" cy="15.6" r="1" fill="#a8aeb8"/><path d="M16.4 4.4h3" stroke="#22242c" stroke-width="1.4" stroke-linecap="round"/></svg>`,
};
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
const ICOIMG = {};
const icoImg = (k) => { if (!ICOIMG[k]) { const im = new Image(); im.src = svgU(ICOSVG[k]); ICOIMG[k] = im; } return ICOIMG[k]; };
// 방법 그림(벡터 80x68)
function stepPics() {
  const inner = (t, n) => t.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/id="(\w)"/g, `id="$1${n}"`).replace(/url\(#(\w)\)/g, `url(#$1${n})`);
  const ico = (k, x, y, sc, n) => `<g transform="translate(${x} ${y}) scale(${sc})">${inner(ICOSVG[k], n)}</g>`;
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const grid = (pk) => { let o = `<rect x="4" y="5" width="72" height="26" rx="3" fill="#fffef6" stroke="#c8bca0"/>`; for (let k = 1; k < 4; k++) o += `<path d="M${4 + k * 18} 5v26" stroke="#d8ccb0" stroke-width=".8"/>`; o += `<path d="M4 18h72" stroke="#e8dcc0" stroke-width=".8"/>`; if (pk) o += `<rect x="40" y="5" width="18" height="26" fill="#ffe1d8" stroke="#e0402a" stroke-width="1.4"/>`; return o; };
  const bg = `<rect width="80" height="68" rx="11" fill="#3a2a1e"/><rect y="38" width="80" height="30" fill="#7a5a3e"/><path d="M0 38h80" stroke="#9a7a5a"/>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg}${grid(false)}<rect x="23" y="7" width="34" height="9" rx="2.4" fill="#ff8a3b" stroke="#a8501a" stroke-width=".6"/><circle cx="27.6" cy="11.5" r="3.4" fill="#f6d2b0" stroke="#fff" stroke-width=".8"/>
    <rect x="6" y="41" width="24" height="24" rx="3" fill="#fffaf1" stroke="#2a1d14" stroke-width=".7"/><rect x="6" y="41" width="24" height="3" rx="1.5" fill="#ff8a3b"/><circle cx="18" cy="52" r="6" fill="#ffe0c4"/><path d="M12 50a6 6 0 0 1 12 0c-2-2-9-2-12 0z" fill="#3a2418"/><path d="M14 61a4 4.4 0 0 1 8 0z" fill="#ff9a3b"/>
    <path d="M30 50C44 46 50 34 48 22" fill="none" stroke="#ffe066" stroke-width="2" stroke-dasharray="3 2.4"/><path d="M44 25l4-5 3 6" fill="none" stroke="#ffe066" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${hand(50, 38)}</svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg}${grid(true)}<rect x="41" y="7" width="16" height="9" rx="2" fill="#ff8a3b"/><rect x="41" y="19.5" width="16" height="9" rx="2" fill="#e04a4a"/>
    <rect x="6" y="40" width="68" height="25" rx="6" fill="#fffaf1" stroke="#e0402a" stroke-width="1.4"/>${ico("F", 9, 42, 1.05, "a")}<text x="40" y="57" font-size="11" font-weight="900" text-anchor="middle" fill="#c0392b" font-family="sans-serif">+</text>${ico("D", 48, 42, 1.05, "b")}</svg>`);
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><defs><linearGradient id="gb" x1="0" x2="1"><stop offset="0" stop-color="#5fc070"/><stop offset=".7" stop-color="#f0a030"/><stop offset="1" stop-color="#e0402a"/></linearGradient></defs>${bg}
    <rect x="6" y="9" width="68" height="12" rx="6" fill="#2a1d14"/><rect x="8" y="11" width="64" height="8" rx="4" fill="#4a3a2e"/><rect x="8" y="11" width="58" height="8" rx="4" fill="url(#gb)"/><path d="M59 6v18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <rect x="8" y="42" width="64" height="20" rx="5" fill="#fffaf1" stroke="#2a1d14" stroke-width=".7"/><rect x="12" y="50" width="48" height="7" rx="3.5" fill="#e0402a"/><path d="M45 47v13" stroke="#fff" stroke-width="1.4"/><text x="66" y="57" font-size="10" font-weight="900" text-anchor="middle" fill="#c0392b" font-family="sans-serif">!</text>
    <text x="40" y="35" font-size="9" font-weight="900" text-anchor="middle" fill="#ffe9a8" font-family="sans-serif">15h</text></svg>`);
  return [[`<img src="${a}" alt="">`, "카드를 칸에 끌기"], [`<img src="${b}" alt="">`, "피크는 튀김+배달"], [`<img src="${c}" alt="">`, "예산·15시간 주의"]];
}
const BALL = (P, x, y) => { P(x + 2, y, 3, 1, "#ffffff"); P(x + 1, y + 1, 5, 5, "#ffffff"); P(x, y + 2, 7, 3, "#ffffff"); P(x + 2, y + 6, 3, 1, "#ffffff"); P(x + 3, y + 2, 2, 2, "#1a1a22"); P(x + 1, y + 4, 1, 1, "#1a1a22"); P(x + 5, y + 4, 1, 1, "#1a1a22"); P(x + 3, y + 6, 1, 1, "#9aa0a8"); };
// 도트 손가락(1탄과 같은 모양)
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}

export const GAME = {
  key: "chicken3", base: "chicken", jc: "#ffb03b", n: "치킨은 사람 장사", desc: "일요일 밤, 다음 주 근무표 짜기",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 아래 <b>알바 카드</b>를 끌어 위 근무표 칸에 놓아요. 놓기 전에 <b>옆으로 쓱</b> 밀거나 <b>블록 끝을 끌면</b> 여러 날이 한 번에 채워져요.",
    "빨간 <b>피크</b>(금·토, 축구 경기 날)는 <b>두 명</b>, 그중 <b>튀김</b>과 <b>배달</b>이 꼭 있어야 해요. 카드의 가능 시간·숙련·성격(지각 잦음, 시험 기간)을 보고 골라요.",
    "<b>인건비 막대</b>가 예산을 넘으면 안 돼요. 한 사람이 <b>주 15시간</b>을 넘기면 주휴수당이 붙어 확 뛰어요. 빈 칸은 <b>사장님이 직접</b> 들어가요(체력↓). 중간에 '못 나와요' 문자가 올 수도…",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "카드를 칸에 끌기"], ["", "피크는 튀김+배달"], ["", "예산·15시간 주의"]]; } },
  css: `
.mg-chicken3 .mg-stage.mg-c3st{background:#1c140e!important;display:flex;align-items:center;justify-content:center}
.mg-chicken3 .c3w{position:relative;flex:0 0 auto}
.mg-chicken3 .c3w>canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.mg-chicken3 .c3w>canvas.c3fr{pointer-events:none;z-index:2}
.mg-chicken3 .mg-steps img{width:76px;height:65px;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-chicken3 .c3w>canvas.c3hi{pointer-events:none;z-index:2;image-rendering:auto}
.mg-chicken3 .c3me{position:absolute;z-index:1;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .25s;pointer-events:none;filter:drop-shadow(0 0 4px #ffb03b66)}
.mg-chicken3 .c3me.on{opacity:1}
.mg-chicken3 .c3me.shk{animation:c3shk .18s infinite}
@keyframes c3shk{50%{transform:translate(1px,1px)}}
.mg-chicken3 .c3lb{position:absolute;inset:0;pointer-events:none;z-index:3}
.mg-chicken3 .c3lb b{position:absolute;display:block;text-align:center;font-size:10px;font-weight:800;color:#3a2a1a;white-space:nowrap;overflow:hidden;letter-spacing:-.5px;line-height:1.05}
.mg-chicken3 .c3lb b.dy{font-size:11.5px;font-weight:900}
.mg-chicken3 .c3lb b.dy.pk{color:#d8302a}
.mg-chicken3 .c3lb b.rw{font-size:9.5px;color:#6a5a48;display:flex;flex-direction:column;justify-content:center}
.mg-chicken3 .c3lb b.rw i{font-style:normal;font-size:8.5px;color:#8a7a68;font-weight:700}
.mg-chicken3 .c3lb b.sm{font-size:8.5px;color:#8a7a68;font-weight:700}
.mg-chicken3 .c3lb b.cost{font-size:10px;text-align:left;color:#3a2a1a}
.mg-chicken3 .c3lb b.cost.ov{color:#d8302a;animation:c3bl .4s steps(2) infinite}
.mg-chicken3 .c3lb b.nm{font-size:10.5px;font-weight:900;text-align:left;color:#2a1d14}
.mg-chicken3 .c3lb b.wg{font-size:9px;text-align:left;color:#7a5a3a;font-weight:800}
.mg-chicken3 .c3lb b.sk{font-size:8.5px;color:#6a5a48;font-weight:800}
.mg-chicken3 .c3lb b.sk.no{color:#c8bca8;text-decoration:line-through}
.mg-chicken3 .c3lb b.tr{font-size:9px;border-radius:4px;background:#efe6d2;color:#5a4632}
.mg-chicken3 .c3lb b.tr.warn{background:#ffe0d8;color:#c0392b}
.mg-chicken3 .c3lb b.tr.good{background:#e0f2dc;color:#2f7a3e}
.mg-chicken3 .c3lb b.hr{font-size:8.5px;color:#fff;text-shadow:0 1px 0 #0008;font-weight:900}
.mg-chicken3 .c3lb b.st{font-size:12px;font-weight:900;color:#fff;background:#c0392b;border-radius:4px;transform:rotate(-12deg);box-shadow:0 0 0 2px #fff,0 2px 0 3px #0006;line-height:1.5}
.mg-chicken3 .c3lb b.nw{font-size:10px;font-weight:900;color:#3a2400;background:#ffd23f;border-radius:4px;line-height:1.5;animation:c3bl .5s steps(2) infinite}
.mg-chicken3 .c3lb b.hd{font-size:10px;color:#ffe9a8;font-weight:800;text-align:left}
.mg-chicken3 .c3lb b.ff{font-size:15px;font-weight:900;color:#fff;text-shadow:0 2px 0 #000a,0 0 6px #000;text-align:left}
.mg-chicken3 .c3lb b.ff em{font-style:normal;font-size:11px;background:#e0402a;border-radius:5px;padding:1px 6px;margin-left:5px;vertical-align:2px}
.mg-chicken3 .c3lb b.ff em.ok{background:#3fae5a}
.mg-chicken3 .c3lb b.fw{font-size:13px;font-weight:900;color:#ffd23f;text-shadow:0 1px 0 #000;text-align:right;letter-spacing:-1px}
.mg-chicken3 .c3lb b.fs{font-size:10px;color:#ffe9a8;text-align:left}
.mg-chicken3 .c3lb b.mn{font-size:10.5px;font-weight:900;color:#ffd23f;letter-spacing:0}
@keyframes c3bl{50%{filter:brightness(1.35)}}
.mg-chicken3 .c3av{position:absolute;z-index:3;border-radius:50%;background-repeat:no-repeat;background-color:#fff3e0;box-shadow:0 0 0 2px #2a1d14;pointer-events:none}
.mg-chicken3 .c3ok{position:absolute;z-index:4;display:none;background:linear-gradient(#ffb03b,#d8701a);color:#fff;border:0;border-radius:10px;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4410;letter-spacing:-.3px}
.mg-chicken3 .c3ok.on{display:block}
.mg-chicken3 .c3ok.rdy{animation:c3pulse .5s infinite alternate}
.mg-chicken3 .c3ok:active{transform:translateY(2px);box-shadow:0 1px 0 #8a4410}
.mg-chicken3 .c3go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-chicken3 .c3go.on{display:block}
.mg-chicken3 .c3go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-chicken3 .c3go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffb03b}
.mg-chicken3 .c3go span b{color:#d8402a}
.mg-chicken3 .c3go.dn i{top:-37px;animation:c3tapd .7s infinite}
.mg-chicken3 .c3go.dn span{bottom:44px}
.mg-chicken3 .c3go.up i{top:2px}
.mg-chicken3 .c3go.up span{top:46px}
.mg-chicken3 .c3go.dr i{animation:c3dr 1.4s ease-in-out infinite}
@keyframes c3tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c3dr{0%{transform:translate(0,0)}15%{transform:translate(0,0) scale(.9)}75%,100%{transform:translate(var(--dx),var(--dy)) scale(.9)}}
.mg-chicken3 .c3tut{position:absolute;left:8px;right:8px;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-chicken3 .c3tut.off{opacity:0;visibility:hidden}
.mg-chicken3 .c3tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #ffb03b;max-width:296px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-chicken3 .c3tut.pop .c3tc{animation:c3pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-chicken3 .c3tc em{font-style:normal;display:inline-block;background:#d8701a;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-chicken3 .c3tc p{margin:0}.mg-chicken3 .c3tc b{color:#c0601a}.mg-chicken3 .c3tc b.rd{color:#c0392b}
.mg-chicken3 .c3tb{margin-top:6px;display:flex;justify-content:center}
.mg-chicken3 .c3skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-chicken3 .c3go2{background:linear-gradient(#ffb03b,#d8701a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4410!important;animation:c3pulse .5s infinite alternate}
@keyframes c3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes c3pulse{to{transform:scale(1.05)}}
.mg-chicken3 .c3nt{position:absolute;left:10px;right:10px;top:8px;z-index:12;display:flex;gap:8px;align-items:center;background:#fffdf6;border-radius:14px;padding:8px 10px;box-shadow:0 4px 0 #0007,0 0 0 2px #e0402a;animation:c3ntin .4s cubic-bezier(.3,1.5,.5,1),c3buzz .09s 5 .4s;pointer-events:none}
.mg-chicken3 .c3nt.out{transition:transform .35s,opacity .35s;transform:translateY(-120%);opacity:0}
.mg-chicken3 .c3nt img{width:42px;height:42px;flex:0 0 auto;background:#efe6d2;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #e0402a}
.mg-chicken3 .c3nt p{margin:0;font-size:12.5px;line-height:1.35;color:#2a2018;font-weight:700;word-break:keep-all}
.mg-chicken3 .c3nt p b{display:block;font-size:10.5px;color:#c0392b}
@keyframes c3ntin{0%{transform:translateY(-130%)}100%{transform:none}}
@keyframes c3buzz{50%{transform:translateX(3px)}}
.mg-chicken3 .c3dim{position:absolute;inset:0;background:#0000;transition:background .4s;pointer-events:none;z-index:7}
.mg-chicken3 .c3dim.on{background:#0009}
.mg-chicken3 .c3sum{position:absolute;left:50%;top:44%;z-index:8;transform:translate(-50%,-50%);width:min(84%,250px);background:#fffdf6;border-radius:14px;padding:12px 12px 10px;box-shadow:0 5px 0 #0007,0 0 0 2px #ffb03b;text-align:center;animation:c3pop .4s cubic-bezier(.3,1.6,.5,1);pointer-events:none}
.mg-chicken3 .c3sum h4{margin:0 0 6px;font-size:14px;color:#2a1d14}
.mg-chicken3 .c3sum div{display:flex;justify-content:space-between;font-size:12px;color:#5a4632;padding:3px 2px;border-top:1px dashed #e0d4bc;font-weight:700}
.mg-chicken3 .c3sum div b{color:#2a1d14}.mg-chicken3 .c3sum div b.rd{color:#c0392b}.mg-chicken3 .c3sum div b.gd{color:#2f7a3e}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "chicken3", "치킨은 사람 장사", "mg-c3st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="c3w"><canvas></canvas><div class="c3me"></div><canvas class="c3fr"></canvas><canvas class="c3hi"></canvas><div class="mg-bubs"></div><div class="c3lb"></div><div class="c3av"></div><button class="c3ok" data-ok>근무표 확정</button><div class="c3go"><span></span><i></i></div><div class="c3tut off"><div class="c3tc"><em>리허설</em><p></p><div class="c3tb"></div></div></div><div class="c3dim"></div></div>`);
  const wrap = F.stage.querySelector(".c3w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), cvF = wrap.querySelector(".c3fr"), gF = cvF.getContext("2d");
  const lbEl = wrap.querySelector(".c3lb"), meEl = wrap.querySelector(".c3me"), avEl = wrap.querySelector(".c3av"), okBtn = wrap.querySelector(".c3ok"), bubs = wrap.querySelector(".mg-bubs");
  const goEl = wrap.querySelector(".c3go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".c3tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".c3tb"), dim = wrap.querySelector(".c3dim");
  let K = 2, H = 300, CH = 79, CY0 = 112;
  const fit = () => {
    const sw = F.stage.clientWidth || 336, sh = F.stage.clientHeight || 600, r = Math.min(sw / W, sh / 280);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 280, 330);
    CY0 = 112; CH = Math.floor((H - CY0 - 30) / 2);
    for (const c of [cv, cvF]) { c.width = W; c.height = H; }
    wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const PG = (gg) => (x, y, w, h, col) => { gg.fillStyle = col; gg.fillRect(x, y, w, h); };
  const cardY = (row) => CY0 + row * (CH + 4);
  const cmp = CH < 78;
  const LY = cmp ? { f: 4, i: 27, s: 36, a: 43, t: 17, h: 8 } : { f: 5, i: 29, s: 39, a: 48, t: 21, h: 10 };

  // 내 캐릭터(몸 그림 시트 3x2 표정). 못 불러오면 도트 대체 없이 숨김
  const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
  let art = false;
  { const im = new Image(); im.onload = () => { art = true; meEl.style.backgroundImage = avEl.style.backgroundImage = `url("${im.src}")`; avFace(1); }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp"; }
  const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  let avX = -1;
  const AVS = 13; // 얼굴 동그라미(논리 픽셀)
  const avFace = (e) => {
    if (e === avX) return; avX = e; const px = AVS * K, s = px / 116, c = e % 3, r = e >= 3 ? 1 : 0;
    Object.assign(avEl.style, { backgroundSize: `${720 * s}px ${1080 * s}px`, backgroundPosition: `${-(c * 240 + 62) * s}px ${-(r * 540 + 12) * s}px` });
  };
  const meExp = (e) => { meEl.style.backgroundPosition = `${(e % 3) * 50}% ${e >= 3 ? 70.3125 : 0}%`; };

  // ── 상태 ──
  const roster = PEOPLE.map((p, i) => ({ ...p, slot: i, dead: false, mood: 0, moodT: 0, hop: 0 }));
  const newbie = { ...NEWBIE, slot: 5, dead: false, mood: 0, moodT: 0, hop: 0, arrive: 0 };
  let slots = [...roster, null];
  const asg = new Map(); // "r,d,lane" → person
  const key = (r, d, l) => `${r},${d},${l}`;
  const at = (r, d, l) => asg.get(key(r, d, l)) || null;
  const inCell = (r, d) => [at(r, d, 0), at(r, d, 1)].filter(Boolean);
  const avail = (p, r, d) => p && !p.dead && p.av[r][d] === "1";
  const has = (p, s) => p.sk.includes(s);
  const fx = [], pops = [];
  let over = false, ff = null, last = 0, t0 = 0, el = 0, evDone = false, quitter = null, idleT = 0, hintUntil = 7, drag = null, lastAct = 0;
  const FACE = new Map(), MINI = new Map();
  const face = (p, m) => { const k = p.id + m; if (!FACE.has(k)) FACE.set(k, mkC(20, 20, (Q) => faceArt(Q, p.L, m))); return FACE.get(k); };
  const mini = (p) => { if (!MINI.has(p.id)) MINI.set(p.id, mkC(7, 7, (Q) => miniArt(Q, p.L))); return MINI.get(p.id); };

  // ── 고해상도 위 캔버스: 카드·블록·얼굴은 벡터와 캐릭터 그림(도트 얼굴은 그림을 못 불러올 때만) ──
  const cvH = wrap.querySelector(".c3hi"), gH = cvH.getContext("2d");
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  let KS = K * DPR;
  const fitH = () => { KS = K * DPR; cvH.width = Math.round(W * KS); cvH.height = Math.round(H * KS); };
  fitH();
  const hiBegin = () => { gH.setTransform(1, 0, 0, 1, 0, 0); gH.clearRect(0, 0, cvH.width, cvH.height); gH.setTransform(KS, 0, 0, KS, 0, 0); gH.globalAlpha = 1; };
  const ART = {};
  const artOf = (k) => { if (!ART[k]) { const r = { ok: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.src = "img/body/" + k + ".webp"; ART[k] = r; } return ART[k]; };
  [...PEOPLE, NEWBIE].forEach((p) => artOf(p.ck));
  ["F", "P", "D"].forEach(icoImg);
  const MEX = [0, 1, 2, 5]; // 기분(보통·웃음·미안·놀람) → 표정 칸
  // 얼굴 자르기: 표정 칸 e, 여백 pad, 아래로 dy(그림 픽셀)
  const faceSrc = (e, pad = 0, dy = 0) => { const c = e % 3, r = e >= 3 ? 1 : 0; return [c * 240 + 62 - pad, r * 540 + 12 - pad + dy, 116 + pad * 2, 116 + pad * 2]; };
  const rr = (q, x, y, w, h, r) => { q.beginPath(); if (q.roundRect) q.roundRect(x, y, w, h, r); else q.rect(x, y, w, h); };
  const drawFace = (p, mood, x, y, s, round) => {
    const a = artOf(p.ck), q = gH;
    q.save(); rr(q, x, y, s, s, round ? s / 2 : 3.5); q.clip();
    const gr = q.createLinearGradient(0, y, 0, y + s); gr.addColorStop(0, mix(p.col, "#ffffff", 0.8)); gr.addColorStop(1, mix(p.col, "#ffffff", 0.35)); q.fillStyle = gr; q.fillRect(x, y, s, s);
    if (a.ok) { const [sx, sy, sw, sh] = faceSrc(MEX[mood] || 0, round ? 2 : 16, round ? 6 : 12); q.drawImage(a.im, sx, sy, sw, sh, x, y, s, s); }
    else { q.imageSmoothingEnabled = false; q.drawImage(face(p, mood), x - 1, y - 1, s + 2, s + 2); q.imageSmoothingEnabled = true; }
    q.restore();
    rr(q, x, y, s, s, round ? s / 2 : 3.5); q.lineWidth = round ? 0.8 : 0.6; q.strokeStyle = round ? "#ffffff" : mix(p.col, "#000000", 0.25); q.stroke();
  };
  // 문자 알림용 얼굴(미안한 표정)
  const faceURL = (p, mood) => {
    const a = artOf(p.ck); if (!a.ok) return face(p, mood).toDataURL();
    const c = document.createElement("canvas"); c.width = c.height = 96; const q = c.getContext("2d");
    q.fillStyle = mix(p.col, "#ffffff", 0.7); q.fillRect(0, 0, 96, 96);
    const [sx, sy, sw, sh] = faceSrc(MEX[mood] || 0, 10, 8); q.drawImage(a.im, sx, sy, sw, sh, 0, 0, 96, 96);
    return c.toDataURL();
  };
  // 빨리 감기 장면의 일하는 사람(캐릭터 그림 위쪽 240x312). clipY 아래는 가린다(튀김기·포장대 뒤)
  const drawBody = (p, ex, cx, top, hh, clipY) => {
    const a = artOf(p.ck); if (!a.ok) return false;
    const ww = hh * 240 / 312, c = ex % 3, r = ex >= 3 ? 1 : 0, q = gH;
    q.save(); if (clipY != null) { q.beginPath(); q.rect(0, 0, W, clipY); q.clip(); }
    q.shadowColor = "rgba(0,0,0,.45)"; q.shadowBlur = 3; q.shadowOffsetY = 1;
    q.drawImage(a.im, c * 240, r * 540, 240, 312, cx - ww / 2, top, ww, hh); q.restore();
    return true;
  };

  // ── 계산 ──
  const hours = (p) => { let n = 0; for (const v of asg.values()) if (v === p) n++; return n * HRS; };
  const people = () => slots.filter(Boolean);
  const costOf = (p) => { const h = hours(p); return h * p.w + (h >= JH ? Math.round((h / 40) * 8 * p.w) : 0); };
  const evalAll = () => {
    const cells = []; let pk = 0, pkQ = 0, nOK = 0, boss = 0;
    for (let r = 0; r < 2; r++) for (let d = 0; d < 6; d++) {
      const st = inCell(r, d), peak = !!PEAK[r + "," + d];
      const c = { r, d, st, peak, miss: [], ok: false, q: 0, boss: 0 };
      if (peak) {
        const hF = st.some((p) => has(p, "F")), hD = st.some((p) => has(p, "D"));
        if (!hF) c.miss.push("F"); if (!hD) c.miss.push("D");
        c.boss = Math.max(2 - st.length, c.miss.length ? 1 : 0);
        c.ok = st.length >= 2 && hF && hD;
        let q = st.length >= 2 ? (hF && hD ? 1 : 0.5) : st.length ? 0.2 : 0;
        for (const p of st) if (p.pen) q *= 1 - p.pen;
        c.q = q; if (c.ok) pk++; pkQ += q;
      } else {
        c.ok = st.length >= 1; c.boss = c.ok ? 0 : 1; c.q = c.ok ? 1 : 0; if (c.ok) nOK++;
        if (!c.ok) c.miss.push("*");
      }
      boss += c.boss; cells.push(c);
    }
    const cost = people().reduce((a, p) => a + costOf(p), 0);
    return { cells, pk, pkQ: pkQ / 4, nOK, boss, cost };
  };
  let ST = evalAll();
  const cellOf = (r, d) => ST.cells[r * 6 + d];

  // ── 소리 ──
  const S = {
    pick: () => { noise(0.06, 2800, 0.06, 0, 1.5); tone(700, 0.04, "square", 0.05); },
    tick: (n) => tone(600 + n * 90, 0.03, "square", 0.05),
    put: () => { tone(220, 0.07, "sine", 0.16, -60); noise(0.05, 900, 0.1); tone(1200, 0.04, "square", 0.04, 0, 0.03); },
    peak: () => { [784, 988, 1318].forEach((f, i) => tone(f, 0.12, "triangle", 0.1, 0, i * 0.07)); },
    juhu: () => { tone(1500, 0.06, "square", 0.07); tone(1200, 0.06, "square", 0.07, 0, 0.07); tone(500, 0.3, "sawtooth", 0.06, -260, 0.14); },
    over: () => { for (let k = 0; k < 3; k++) tone(880, 0.07, "square", 0.07, 0, k * 0.12); },
    del: () => { noise(0.12, 2400, 0.08, 0, 0.9); tone(400, 0.08, "triangle", 0.06, -150); },
    buzz: () => { for (let k = 0; k < 3; k++) tone(110, 0.16, "square", 0.05, 0, k * 0.22); tone(1568, 0.08, "triangle", 0.08, 0, 0.7); tone(1318, 0.12, "triangle", 0.08, 0, 0.78); },
    crack: () => { noise(0.3, 600, 0.14, 0, 0.8); tone(300, 0.25, "sawtooth", 0.06, -200); },
    bell: () => { tone(1760, 0.25, "sine", 0.08); tone(1318, 0.35, "sine", 0.07, 0, 0.18); },
    ff: () => { noise(0.5, 3500, 0.05, 0, 0.5); tone(300, 0.4, "sawtooth", 0.03, 900); },
    okc: (n) => { tone(1046 * Math.pow(1.04, n), 0.07, "triangle", 0.08); },
    bad: () => tone(200, 0.15, "sawtooth", 0.06, -60),
    huff: () => { noise(0.18, 700, 0.08, 0, 1); noise(0.18, 600, 0.07, 0.22, 1); },
  };

  // ── 배경(정적): 뒷방 벽, 근무표 종이, 책상 ──
  const BG = (() => {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const q = c.getContext("2d"), Q = PG(q);
    for (let y = 0; y < H; y++) Q(0, y, W, 1, mix("#3a2a1e", "#2a1d14", y / H));
    for (let y = 0; y < CY0 - 4; y += 6) for (let x = (y / 6) % 2 ? 0 : 3; x < W; x += 6) Q(x, y, 1, 1, "#ffffff08");
    // 책상
    Q(0, CY0 - 4, W, H - CY0 + 4, "#7a5a3e"); for (let y = CY0; y < H; y += 7) Q(0, y, W, 1, "#6e5036"); for (let k = 0; k < 30; k++) Q((k * 37) % W, CY0 + ((k * 23) % (H - CY0)), 3, 1, "#86664a");
    Q(0, CY0 - 4, W, 1, "#9a7a5a");
    // 종이(근무표)
    Q(2, 3, W - 3, CY0 - 9, "#00000040");
    Q(1, 2, W - 3, CY0 - 10, "#fffef6"); Q(1, 2, W - 3, 1, "#ffffff"); Q(W - 3, 3, 1, CY0 - 11, "#e8e0cc");
    for (let k = 0; k < 40; k++) Q(2 + ((k * 29) % (W - 6)), 3 + ((k * 13) % (CY0 - 13)), 1, 1, "#f4efe0");
    // 집게
    Q(68, 0, 24, 5, "#8a929c"); Q(68, 0, 24, 1, "#c8ced6"); Q(72, 4, 16, 2, "#5a626c"); Q(78, 1, 4, 2, "#3a3f4a");
    // 머리줄
    Q(GX - 1, GY - 1, 6 * CW + 1, 1, "#c8bca0");
    // 격자: 칸 바탕(피크는 빨강)
    for (let r = 0; r < 2; r++) for (let d = 0; d < 6; d++) {
      const x = GX + d * CW, y = rowTop(r), pk = PEAK[r + "," + d];
      if (pk) { Q(x, y, CW, 2 * LH, "#ffe1d8"); for (let k = 0; k < 2 * LH + CW; k += 4) for (let t = 0; t < 2 * LH; t++) { const xx = k - t; if (xx >= 0 && xx < CW && (t + k) % 4 === 0) Q(x + xx, y + t, 1, 1, "#ffd0c4"); } }
      Q(x, y + LH, CW, 1, pk ? "#f4b8a8" : "#ece4d0");
    }
    for (let r = 0; r < 2; r++) {
      const y = rowTop(r);
      Q(GX - 1, y - 1, 6 * CW + 1, 1, "#b8ac90"); Q(GX - 1, y + 2 * LH, 6 * CW + 1, 1, "#b8ac90");
      for (let d = 0; d <= 6; d++) Q(GX - 1 + d * CW, y, 1, 2 * LH, "#c8bca0");
      Q(2, y, GX - 4, 2 * LH, "#f4eee0");
    }
    for (const k in PEAK) { const [r, d] = k.split(",").map(Number), x = GX + d * CW - 1, y = rowTop(r) - 1; Q(x, y, CW + 1, 1, "#e0402a"); Q(x, y + 2 * LH + 1, CW + 1, 1, "#e0402a"); Q(x, y, 1, 2 * LH + 2, "#e0402a"); Q(x + CW, y, 1, 2 * LH + 2, "#e0402a"); }
    // 비용·체력 칸
    Q(2, GB + 2, W - 5, 1, "#e0d4bc");
    return c;
  })();

  // ── 이름표(HTML) ──
  const LB = {};
  const lab = (id, t, cls, x, y, w, h) => {
    let b = LB[id]; if (!b) { b = LB[id] = document.createElement("b"); lbEl.appendChild(b); }
    if (b._t !== t) { b._t = t; b.innerHTML = t; } if (b.className !== cls) b.className = cls;
    if (x != null) { const k = `${x},${y},${w},${h}`; if (b._p !== k) { b._p = k; Object.assign(b.style, { left: x * K + "px", top: y * K + "px", width: w * K + "px", height: h * K + "px", lineHeight: h * K + "px" }); } }
    b.style.display = ""; return b;
  };
  const hideLab = (id) => { if (LB[id]) LB[id].style.display = "none"; };
  const staticLabs = () => {
    lab("off", "월 휴무", "sm", 1, 6, GX - 2, 9);
    DAYS.forEach((dn, d) => lab("d" + d, dn, "dy" + (d >= 3 && d <= 4 ? " pk" : d === 1 ? " pk" : ""), GX + d * CW - (d === 1 ? 3 : 0), 5, CW, 11));
    ROWN.forEach(([a, b], r) => { const t = lab("r" + r, `${a}<i>${b}</i>`, "rw", 1, rowTop(r), GX - 3, 2 * LH); t.style.lineHeight = "1.15"; });
  };
  staticLabs();
  Object.assign(avEl.style, { left: GX * K + "px", top: (GB + 17) * K + "px", width: AVS * K + "px", height: AVS * K + "px" });
  Object.assign(okBtn.style, { left: 4 * K + "px", width: (W - 8) * K + "px", top: (H - 24) * K + "px", height: 20 * K + "px" });

  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = x * K + "px"; b.style.top = (y - 2) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1300); };
  const cellXY = (r, d) => [GX + d * CW + CW / 2, rowTop(r) + LH];
  const updSc = () => { F.sc.textContent = `피크 ${ST.pk}/4 · 빈자리 ${ST.boss}`; };

  // ── 배치 ──
  // 칸 변화 비교: 새로 채운 칸·피크 완성·주휴 넘김·예산 넘김을 알린다
  const afterChange = (quiet) => {
    const prev = ST; ST = evalAll(); updSc();
    if (quiet) return;
    let peakNew = 0, fillNew = 0;
    ST.cells.forEach((c, i) => { const o = prev.cells[i]; if (c.ok && !o.ok) { if (c.peak) { peakNew++; F.hit(stageXY(...cellXY(c.r, c.d)), "피크 OK", "#ffd23f"); flashCell(c.r, c.d, "#ffd23f"); } else fillNew++; } });
    if (peakNew) S.peak(); else if (fillNew) { const c = ST.cells.find((c, i) => c.ok && !prev.cells[i].ok); F.hit(stageXY(...cellXY(c.r, c.d)), fillNew, "#7fe0a0"); }
    for (const p of people()) {
      const h = hours(p), oh = p._h || 0; p._h = h;
      if (h >= JH && oh < JH) { S.juhu(); vib([20, 30, 20]); const [x, y] = cardMid(p); F.float(stageXY(x, y - 6), `주휴수당 +${won(Math.round((h / 40) * 8 * p.w))}`, "bad"); p.hop = 0.5; costShake = 0.5; }
    }
    if (ST.cost > BUDGET && prev.cost <= BUDGET) { S.over(); F.msg("인건비가 예산을 넘었어요! 칸을 줄이거나 싼 사람으로"); vib([30, 30, 30]); costShake = 0.6; }
  };
  const flashes = [];
  const flashCell = (r, d, col) => flashes.push({ r, d, col, t: 0.5 });
  const place = (p, r, days, lanePref = -1, quiet = false) => {
    let n = 0;
    for (const d of days) {
      if (!avail(p, r, d) || inCell(r, d).includes(p)) continue;
      let l = lanePref >= 0 && !at(r, d, lanePref) ? lanePref : !at(r, d, 0) ? 0 : !at(r, d, 1) ? 1 : -1;
      if (l < 0) continue;
      asg.set(key(r, d, l), p); n++; lanePref = l;
    }
    if (n) { if (!quiet) { S.put(); vib(10); p.mood = 1; p.moodT = 0.8; } lastAct = el; afterChange(quiet); if (tut > 0) tutCheck(); }
    return n;
  };
  const unplace = (p, r, days, l, quiet = false) => {
    let n = 0;
    for (const d of days) if (at(r, d, l) === p) { asg.delete(key(r, d, l)); n++; const [x, y] = [GX + d * CW + CW / 2, rowTop(r) + l * LH + LH / 2]; for (let k = 0; k < 6; k++) fx.push({ x, y, vx: rnd() * 40 - 20, vy: -10 - rnd() * 25, t: 0.4, c: p.col }); }
    if (n && !quiet) S.del();
    if (n) { lastAct = el; afterChange(true); }
    return n;
  };
  const runOf = (r, d, l) => { const p = at(r, d, l); if (!p) return null; let a = d, b = d; while (a > 0 && at(r, a - 1, l) === p) a--; while (b < 5 && at(r, b + 1, l) === p) b++; return [a, b]; };
  // 앵커에서 cur 까지 이어진(그 사람이 올 수 있고 자리가 빈) 칸들
  const spanFrom = (p, r, anchor, cur, l = -1) => {
    const dir = cur >= anchor ? 1 : -1, out = [anchor];
    for (let d = anchor + dir; dir > 0 ? d <= cur : d >= cur; d += dir) {
      const own = l >= 0 ? at(r, d, l) === p : inCell(r, d).includes(p);
      const free = l >= 0 ? !at(r, d, l) : inCell(r, d).length < 2;
      if (!avail(p, r, d) || (!own && !free) || (l < 0 && own)) break; out.push(d);
    }
    return out.sort((a, b) => a - b);
  };
  const cellOK = (p, r, d) => avail(p, r, d) && !inCell(r, d).includes(p) && inCell(r, d).length < 2;

  // ── 사건: "다음 주부터 못 나와요" ──
  let ntEl = null;
  const quitEvent = () => {
    if (evDone || over) return; evDone = true;
    const live = roster.filter((p) => !p.dead);
    let best = null, bh = -1; for (const p of shuffle(live)) { const h = hours(p) + (p.id === "E" ? 0.5 : 0); if (h > bh) { bh = h; best = p; } }
    quitter = best; if (drag && drag.p === quitter) drag = null;
    S.buzz(); vib([60, 40, 60, 40, 60]);
    ntEl = document.createElement("div"); ntEl.className = "c3nt";
    ntEl.innerHTML = `<img src="${faceURL(quitter, 2)}" alt=""><p><b>문자 · ${quitter.n}</b>${quitter.bye}</p>`;
    wrap.appendChild(ntEl);
    setTimeout(() => {
      if (!wrap.isConnected) return;
      // 그 사람 칸이 깨져 떨어진다
      for (const [k, v] of [...asg]) if (v === quitter) { const [r, d, l] = k.split(",").map(Number); asg.delete(k); const x = GX + d * CW + CW / 2, y = rowTop(r) + l * LH + LH / 2; for (let j = 0; j < 10; j++) fx.push({ x: x + rnd() * 16 - 8, y, vx: rnd() * 30 - 15, vy: -20 - rnd() * 20, t: 0.8, c: j % 3 ? quitter.col : "#2a1d14", g: 1 }); flashCell(r, d, "#e0402a"); }
      quitter.dead = true; quitter.mood = 2; S.crack(); F.miss(null); afterChange(true);
      F.msg(ST.boss ? "칸이 비었어요! 다시 메워요" : "다행히 빈 칸은 없어요");
      hintUntil = el + 6;
    }, 1300);
    setTimeout(() => { if (ntEl) { ntEl.classList.add("out"); setTimeout(() => ntEl && ntEl.remove(), 400); } }, 2900);
    setTimeout(() => {
      if (!wrap.isConnected || over) return;
      slots[5] = newbie; newbie.arrive = 1; newbie.newT = 3.5; S.bell(); F.msg("새 지원자가 왔어요! 첫 알바 카드");
      const [x, y] = cardMid(newbie); F.burst(stageXY(x, y), "#ffd23f", 12);
    }, 2300);
  };

  // ── 리허설 ──
  let tut = 0, tutT = 0;
  const SKIP = `<button class="c3skip" data-skip>건너뛰기</button>`;
  const tutPos = (y) => { tutEl.style.top = y * K + "px"; tutEl.style.bottom = "auto"; };
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) { tutPos(rowTop(1) + 2); tutP.innerHTML = `아래 <b>알바 카드</b>를 끌어서<br>빨간 <b class="rd">금요일 저녁</b> 칸에 놓아요.`; tutB.innerHTML = SKIP; }
    else if (n === 2) { tutPos(CY0 + 8); tutP.innerHTML = `좋아요! 블록 <b>끝을 잡고 옆으로</b> 끌면 여러 날이 한 번에!<br><b>토요일</b>까지 늘려 봐요.`; tutB.innerHTML = SKIP; }
    else if (n === 3) { const c = cellOf(0, 3); tutPos(rowTop(1) + 2); tutP.innerHTML = `피크는 <b>두 명</b>, 그중 <b>튀김</b>과 <b>배달</b>이 꼭 있어야 해요.<br>${c.miss.length ? `<b class="rd">${c.miss.map((s) => SKN[s]).join("·")}</b> 되는 카드를` : "카드 하나를"} 금 저녁에 더 놓아요.`; tutB.innerHTML = SKIP; }
    else if (n === 4) {
      tutPos(CY0 + 2);
      tutP.innerHTML = `완벽해요! 이제 진짜 근무표예요.<br>위 <b>인건비 막대</b>가 예산을 넘으면 안 되고,<br>한 사람이 <b class="rd">주 15시간</b>을 넘기면 <b>주휴수당</b>이 붙어요.<br>빈 칸은 <b>사장님이 직접</b> 들어가요(체력↓).<br>중간에 <b class="rd">'못 나와요'</b> 문자가 올 수도 있어요!`;
      tutB.innerHTML = `<button class="c3go2" data-go>근무표 짜기 시작!</button>`;
    }
  };
  const tutCheck = () => {
    const c = cellOf(0, 3);
    if (tut === 1 && c.st.length >= 1) setTimeout(() => tut === 1 && tutNext(2), 350);
    else if (tut === 2 && [0, 1].some((l) => { const p = at(0, 3, l), rr = runOf(0, 3, l); return p && rr && rr[1] >= 4; })) setTimeout(() => tut === 2 && tutNext(3), 350);
    else if (tut === 3 && c.ok) setTimeout(() => tut === 3 && tutNext(4), 600);
  };
  const resetAll = () => {
    asg.clear(); fx.length = 0; flashes.length = 0;
    for (const p of [...roster, newbie]) { p.dead = false; p.mood = 0; p._h = 0; p.hop = 0; p.newT = 0; p.arrive = 0; }
    slots = [...roster, null]; evDone = false; quitter = null; ST = evalAll(); updSc();
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null); drag = null;
    resetAll(); t0 = 0; el = 0; lastAct = 0; hintUntil = 7; SFX.go?.();
    okBtn.classList.add("on"); tmr = timer(T * ez, F.bar, end); updSc();
  };
  let tmr = null;
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });
  okBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation(); if (over || tut >= 0) return;
    if (!evDone) { F.msg("확정하려는 순간… 문자가 왔어요!"); quitEvent(); return; }
    if (slots[5] !== newbie) return;
    end();
  });

  // ── 할 일 손가락 ──
  const FUP = fingerURL(false), FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.dx | 0},${o.dy | 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "c3go"; return; }
    const up = o.m === "dr" ? o.dy < 0 || (o.dy === 0 && o.y < 60) : o.y < 60;
    goI.style.backgroundImage = `url(${up ? FUP : FDN})`;
    goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px"; goT.innerHTML = o.t;
    goT.style.transform = o.x < 40 ? "translateX(-20%)" : o.x > 120 ? "translateX(-80%)" : "";
    if (o.m === "dr") { goI.style.setProperty("--dx", o.dx * K + "px"); goI.style.setProperty("--dy", o.dy * K + "px"); }
    goEl.className = "c3go on " + (up ? "up" : "dn") + (o.m === "dr" ? " dr" : "");
  };
  const cardMid = (p) => { const s = slots.indexOf(p); const sx = CX[s % 3], sy = cardY(Math.floor(s / 3)); return [sx + 12, sy + 12]; };
  // 지금 가장 급한 빈자리 + 맞는 카드
  const needs = () => {
    const out = [];
    for (const c of ST.cells) if (c.peak && !c.ok) out.push({ c, s: c.miss[0] || null, pr: 0 });
    for (const c of ST.cells) if (!c.peak && !c.ok) out.push({ c, s: null, pr: 1 });
    return out;
  };
  const candFor = (n, strict = true) => {
    const { c, s } = n; let best = null, bv = 1e18;
    for (const p of people()) {
      if (p.dead || !cellOK(p, c.r, c.d) || (s && !has(p, s))) continue;
      if (c.peak && !s && c.st.length === 1) { const o = c.st[0]; if (!(has(o, "F") || has(p, "F")) || !(has(o, "D") || has(p, "D"))) continue; }
      const h = hours(p) + HRS, juhu = h >= JH && hours(p) < JH;
      const extra = HRS * p.w + (juhu ? Math.round((h / 40) * 8 * p.w) : 0) + (h > JH && !juhu ? Math.round((HRS / 40) * 8 * p.w) : 0);
      if (strict && ST.cost + extra > BUDGET) continue;
      let v = extra + (c.peak ? p.pen * 60000 : 0) + (juhu ? 30000 : 0);
      // 피크에 꼭 필요한 사람은 아껴 둔다(희소 숙련)
      if (!c.peak) v += (p.sk.length - 1) * 4000 + (p.av[0].replace(/0/g, "").length + p.av[1].replace(/0/g, "").length) * -300;
      if (v < bv) { bv = v; best = p; }
    }
    return best;
  };
  const taskNow = () => {
    if (drag) return null;
    const ns = needs(); if (!ns.length) return evDone ? { x: W / 2, y: H - 25, t: "다 채웠어요! <b>확정</b>" } : null;
    for (const n of ns) { const p = candFor(n, false); if (!p) continue; const [x, y] = cardMid(p), [tx, ty] = cellXY(n.c.r, n.c.d); return { x, y, t: n.s ? `<b>${SKN[n.s]}</b> 되는 사람을 끌어요` : n.c.peak ? "피크에 <b>한 명 더</b>" : "빈 칸에 <b>끌어</b> 놓기", m: "dr", dx: tx - x, dy: ty - y, p, n }; }
    return null;
  };

  // ── 입력 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const gridAt = (x, y, slack = 0) => {
    const d = Math.floor((x - GX) / CW); if (d < 0 || d > 5) return null;
    for (let r = 0; r < 2; r++) { const t = rowTop(r); if (y >= t - slack && y < t + 2 * LH + slack) return { r, d, l: clamp(Math.floor((y - t) / LH), 0, 1) }; }
    return null;
  };
  const cardAt = (x, y) => { for (let s = 0; s < 6; s++) { const sx = CX[s % 3], sy = cardY(Math.floor(s / 3)); if (x >= sx && x < sx + CWD && y >= sy && y < sy + CH) return s; } return -1; };
  const canTouch = () => !over && !ff && tut !== 0 && tut !== 4;
  const down = (x, y) => {
    if (!canTouch()) return;
    idleT = 0;
    const s = cardAt(x, y);
    if (s >= 0) {
      const p = slots[s]; if (!p) { F.msg("구인 공고 중… 아직 지원자가 없어요"); SFX.tok(); return; }
      if (p.dead) { F.msg(`${p.n}은 이제 못 나와요`); SFX.tok(); return; }
      drag = { k: "card", p, x, y, x0: x, y0: y, anchor: null, range: null, moved: false }; S.pick(); p.hop = 0.25; return;
    }
    const gc = gridAt(x, y);
    if (gc) {
      const p = at(gc.r, gc.d, gc.l);
      if (p) { const rr = runOf(gc.r, gc.d, gc.l), anchor = rr[0] === rr[1] ? gc.d : gc.d >= (rr[0] + rr[1]) / 2 ? rr[0] : rr[1]; drag = { k: "blk", p, r: gc.r, l: gc.l, run: rr, anchor, d0: gc.d, x, y, x0: x, y0: y, range: rr[0] === rr[1] ? [gc.d] : null, moved: false, rm: false }; SFX.tok(); return; }
      F.msg("아래 카드를 끌어서 놓아요"); SFX.tok();
    }
  };
  const move = (x, y) => {
    if (!drag || !canTouch()) return;
    drag.x = x; drag.y = y; if (Math.hypot(x - drag.x0, y - drag.y0) > 3) drag.moved = true;
    const gc = gridAt(x, y, 1), p = drag.p;
    if (drag.k === "card") {
      let nr = drag.range;
      if (gc) {
        if (!drag.anchor || drag.anchor.r !== gc.r) { if (cellOK(p, gc.r, gc.d)) drag.anchor = { r: gc.r, d: gc.d }; else { drag.anchor = null; nr = null; drag.bad = gc; } }
        if (drag.anchor) { nr = spanFrom(p, drag.anchor.r, drag.anchor.d, gc.d); drag.bad = !cellOK(p, gc.r, gc.d) && !nr.includes(gc.d) ? gc : null; }
      } else { drag.bad = null; if (y > GB + 8) { drag.anchor = null; nr = null; } }
      if ((nr || []).join() !== (drag.range || []).join()) { drag.range = nr; if (nr) S.tick(nr.length); }
    } else if (drag.k === "blk") {
      drag.rm = y > GB + 10;
      if (!drag.rm) { const d = clamp(Math.floor((x - GX) / CW), 0, 5); const nr = spanFrom(p, drag.r, drag.anchor, d, drag.l); if (nr.join() !== (drag.range || []).join()) { drag.range = nr; S.tick(nr.length); } }
    }
  };
  const upE = () => {
    if (!drag) return; const d = drag; drag = null; if (!canTouch()) return;
    const p = d.p; if (p.dead) return;
    if (d.k === "card") {
      if (d.range && d.anchor) { const n = place(p, d.anchor.r, d.range); if (!n) F.msg("그 칸은 자리가 꽉 찼어요"); else if (n >= 1 && p.pen && d.range.some((dd) => PEAK[d.anchor.r + "," + dd])) { F.msg(p.id === "E" ? "지각 잦은 친구를 피크에… 괜찮을까요?" : "첫 알바라 피크엔 손이 좀 느려요"); } }
      else if (d.bad) { F.msg(`${p.n}은 그 시간에 못 와요 (카드 아래 가능 시간 확인)`); S.bad(); flashCell(d.bad.r, d.bad.d, "#e0402a"); }
      else if (!d.moved) { F.msg("카드를 위 근무표 칸까지 끌어요"); }
      else F.msg("근무표 칸 위에서 놓아요");
    } else if (d.k === "blk") {
      if (d.rm) { unplace(p, d.r, [0, 1, 2, 3, 4, 5].filter((x) => x >= d.run[0] && x <= d.run[1]), d.l); F.msg(`${p.n} 블록을 뺐어요`); }
      else if (!d.moved) { unplace(p, d.r, [d.d0], d.l); }
      else if (d.range) {
        const keep = new Set(d.range), old = []; for (let x = d.run[0]; x <= d.run[1]; x++) old.push(x);
        const rem = old.filter((x) => !keep.has(x)), add = d.range.filter((x) => at(d.r, x, d.l) !== p);
        if (rem.length) unplace(p, d.r, rem, d.l, !!add.length);
        if (add.length) place(p, d.r, add, d.l);
      }
    }
  };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = toL(e); down(x, y); });
  cv.addEventListener("pointermove", (e) => { if (!drag) return; const [x, y] = toL(e); move(x, y); });
  cv.addEventListener("pointerup", (e) => { if (drag) { const [x, y] = toL(e); move(x, y); } upE(); });
  cv.addEventListener("pointercancel", () => { drag = null; });

  // ── 그리기: 근무표 ──
  let costShake = 0, costShow = 0;
  const drawGhost = (r, d, l, s, tm) => {
    const x = GX + d * CW, y = rowTop(r) + l * LH, a = 0.28 + 0.12 * Math.sin(tm * 5);
    g.globalAlpha = a;
    if (s === "*") { P(x + 9, y + 2, 5, 4, "#8a7a68"); P(x + 8, y + 6, 7, 5, "#8a7a68"); }
    else ICO[s](P, x + 6, y + 2);
    g.globalAlpha = 1;
    for (let k = 0; k < CW - 4; k += 3) { P(x + 2 + k, y + 1, 2, 1, "#c8bca0"); P(x + 2 + k, y + LH - 2, 2, 1, "#c8bca0"); }
  };
  const drawBar = (p, r, a, b, l, alpha = 1, lift = 0) => {
    const x = GX + a * CW + 1, w = (b - a + 1) * CW - 2, y = rowTop(r) + l * LH + 1 - lift, h = LH - 2, q = gH;
    q.globalAlpha = alpha;
    q.save(); q.shadowColor = "rgba(40,20,0,.45)"; q.shadowBlur = lift ? 4 : 1.6; q.shadowOffsetY = lift ? 1.6 : 0.6;
    rr(q, x, y, w, h, 3); const gr = q.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, mix(p.col, "#ffffff", 0.4)); gr.addColorStop(0.45, p.col); gr.addColorStop(1, mix(p.col, "#000000", 0.22)); q.fillStyle = gr; q.fill(); q.restore();
    rr(q, x + 0.3, y + 0.3, w - 0.6, h - 0.6, 2.8); q.lineWidth = 0.6; q.strokeStyle = mix(p.col, "#000000", 0.5); q.stroke();
    q.fillStyle = "#ffffff55"; rr(q, x + 2, y + 0.9, w - 4, 1.1, 0.6); q.fill();
    // 이음매(하루 경계)
    q.strokeStyle = "#ffffff70"; q.lineWidth = 0.5; q.setLineDash([1, 1]);
    for (let k = a + 1; k <= b; k++) { q.beginPath(); q.moveTo(GX + k * CW, y + 2.2); q.lineTo(GX + k * CW, y + h - 2.2); q.stroke(); }
    q.setLineDash([]);
    drawFace(p, p.moodT > 0 ? p.mood : 0, x + 0.8, y + 0.8, h - 1.6, true);
    let sx = x + w - 2.6; for (const s of [...p.sk].reverse()) { if (sx < x + 13) break; q.beginPath(); q.arc(sx, y + h / 2, 1.3, 0, 7); q.fillStyle = s === "F" ? "#ffd23f" : s === "P" ? "#f6d2a0" : "#9fd0ff"; q.fill(); q.lineWidth = 0.4; q.strokeStyle = "#0006"; q.stroke(); sx -= 3.2; }
    q.globalAlpha = 1;
  };
  const renderPlan = (tm) => {
    g.drawImage(BG, 0, 0); hiBegin();
    // 깜빡 칸
    for (const f of flashes) { g.globalAlpha = c01(f.t * 2) * 0.6; P(GX + f.d * CW, rowTop(f.r), CW, 2 * LH, f.col); g.globalAlpha = 1; }
    // 끌고 있는 사람의 가능/불가 표시
    const dp = drag && drag.p;
    if (dp) for (let r = 0; r < 2; r++) for (let d = 0; d < 6; d++) {
      const x = GX + d * CW, y = rowTop(r);
      if (!avail(dp, r, d)) { g.fillStyle = "rgba(60,44,30,.38)"; g.fillRect(x, y, CW, 2 * LH); for (let k = 0; k < CW + 2 * LH; k += 5) for (let t = 0; t < 2 * LH; t++) { const xx = k - t; if (xx >= 0 && xx < CW) P(x + xx, y + t, 1, 1, "rgba(40,28,18,.35)"); } }
      else if (drag.k === "card" && cellOK(dp, r, d)) { g.fillStyle = `rgba(95,192,112,${0.16 + 0.08 * Math.sin(tm * 8)})`; g.fillRect(x, y, CW, 2 * LH); }
    }
    // 빈자리 유령 아이콘
    for (const c of ST.cells) {
      const free = [0, 1].filter((l) => !at(c.r, c.d, l));
      if (c.peak) { const need = c.miss.slice(); while (need.length < 2 - c.st.length) need.push("*"); free.forEach((l, i) => { if (need[i]) drawGhost(c.r, c.d, l, need[i], tm + i); }); }
      else if (!c.st.length) drawGhost(c.r, c.d, 0, "*", tm);
    }
    // 블록
    const skip = drag && drag.k === "blk" ? drag : null;
    for (let r = 0; r < 2; r++) for (let l = 0; l < 2; l++) {
      let d = 0;
      while (d < 6) {
        const p = at(r, d, l); if (!p) { d++; continue; }
        let b = d; while (b < 5 && at(r, b + 1, l) === p) b++;
        if (!(skip && skip.r === r && skip.l === l && skip.run[0] === d)) drawBar(p, r, d, b, l);
        d = b + 1;
      }
    }
    // 끌어서 늘리는 중인 블록·놓기 미리보기
    if (skip) { if (skip.rm) drawBar(skip.p, skip.r, skip.run[0], skip.run[1], skip.l, 0.35); else if (skip.range) drawBar(skip.p, skip.r, skip.range[0], skip.range[skip.range.length - 1], skip.l, 1, 1); }
    if (drag && drag.k === "card" && drag.range && drag.anchor) {
      const r = drag.anchor.r; for (const d of drag.range) { const l = !at(r, d, 0) ? 0 : 1; const x = GX + d * CW + 1, y = rowTop(r) + l * LH + 1; g.globalAlpha = 0.55 + 0.2 * Math.sin(tm * 10); P(x, y, CW - 2, LH - 2, dp.col); g.globalAlpha = 1; P(x, y, CW - 2, 1, "#ffffff"); P(x, y + LH - 3, CW - 2, 1, "#ffffff"); }
    }
    const q = gH;
    // 축구공(축구 경기 날 표시)
    { const bx = GX + CW + 18.5, by = 10.5; q.save(); q.shadowColor = "rgba(0,0,0,.35)"; q.shadowBlur = 1.5; q.beginPath(); q.arc(bx, by, 3.6, 0, 7); q.fillStyle = "#fff"; q.fill(); q.restore(); q.fillStyle = "#1a1a22"; q.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; q.lineTo(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3); } q.fill(); q.strokeStyle = "#1a1a22"; q.lineWidth = 0.4; q.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; q.moveTo(bx + Math.cos(a) * 1.3, by + Math.sin(a) * 1.3); q.lineTo(bx + Math.cos(a) * 3.5, by + Math.sin(a) * 3.5); } q.stroke(); q.beginPath(); q.arc(bx, by, 3.6, 0, 7); q.lineWidth = 0.5; q.stroke(); }
    if (drag && drag.bad) { const x = GX + drag.bad.d * CW + CW / 2, y = rowTop(drag.bad.r) + LH; q.lineCap = "round"; q.lineWidth = 2.4; q.strokeStyle = "#ffffff"; q.beginPath(); q.moveTo(x - 4.5, y - 4.5); q.lineTo(x + 4.5, y + 4.5); q.moveTo(x + 4.5, y - 4.5); q.lineTo(x - 4.5, y + 4.5); q.stroke(); q.lineWidth = 1.5; q.strokeStyle = "#e0402a"; q.stroke(); }
    // 칸 상태 표시(오른쪽 위 동그라미)
    for (const c of ST.cells) {
      const x = GX + c.d * CW + CW - 3, y = rowTop(c.r) + 2.4;
      if (c.ok) { q.beginPath(); q.arc(x, y, 2.3, 0, 7); q.fillStyle = "#3fae5a"; q.fill(); q.lineWidth = 0.5; q.strokeStyle = "#fff"; q.stroke(); q.beginPath(); q.moveTo(x - 1.2, y); q.lineTo(x - 0.3, y + 0.9); q.lineTo(x + 1.3, y - 0.9); q.lineWidth = 0.7; q.lineCap = "round"; q.lineJoin = "round"; q.stroke(); }
      else if (c.peak && c.st.length && Math.floor(tm * 3) % 2) { q.beginPath(); q.arc(x, y, 2.3, 0, 7); q.fillStyle = "#e0402a"; q.fill(); q.fillStyle = "#fff"; q.fillRect(x - 0.35, y - 1.5, 0.7, 1.9); q.fillRect(x - 0.35, y + 0.8, 0.7, 0.7); }
    }
    // 인건비 막대
    costShow += (ST.cost - costShow) * 0.2;
    const by = GB + 12, bx = GX, bw = 6 * CW - 2, max = BUDGET / 0.8, sh = costShake > 0 ? Math.sin(tm * 60) * 1.5 : 0;
    rr(q, bx - 1 + sh, by - 1, bw + 2, 8, 4); q.fillStyle = "#2a1d14"; q.fill(); rr(q, bx + sh, by, bw, 6, 3); q.fillStyle = "#4a3a2e"; q.fill();
    const fw = Math.min(bw, bw * costShow / max), ov = ST.cost > BUDGET;
    if (fw > 1) {
      const c0 = ov ? (Math.floor(tm * 6) % 2 ? "#ff5a4a" : "#c0302a") : costShow / BUDGET > 0.9 ? "#f0a030" : "#5fc070";
      const gr = q.createLinearGradient(0, by, 0, by + 6); gr.addColorStop(0, mix(c0, "#ffffff", 0.35)); gr.addColorStop(1, mix(c0, "#000000", 0.15));
      rr(q, bx + sh, by, fw, 6, 3); q.fillStyle = gr; q.fill();
    }
    // 주휴수당 몫(빗금)
    let jx = 0; for (const p of people()) { const h = hours(p); if (h >= JH) jx += Math.round((h / 40) * 8 * p.w); }
    if (jx) { const jw = bw * jx / max; q.save(); rr(q, bx + sh + fw - jw, by, jw, 6, 2); q.clip(); q.strokeStyle = "#ffffffa0"; q.lineWidth = 0.7; q.beginPath(); for (let k = -6; k < jw + 6; k += 2.2) { q.moveTo(bx + sh + fw - jw + k, by + 6); q.lineTo(bx + sh + fw - jw + k + 4, by); } q.stroke(); q.restore(); }
    const bl = bx + bw * 0.8; q.fillStyle = "#ffffff"; rr(q, bl + sh - 0.6, by - 3, 1.2, 12, 0.6); q.fill(); rr(q, bl - 1.5 + sh, by - 3.4, 3, 1.4, 0.7); q.fill();
    // 사장 체력(빈자리 x 14)
    const stam = clamp(100 - ST.boss * 14, 0, 100), sy = GB + 22, sx = GX + AVS + 3, sw = 70;
    rr(q, sx - 1, sy - 1, sw + 2, 7, 3.5); q.fillStyle = "#2a1d14"; q.fill(); rr(q, sx, sy, sw, 5, 2.5); q.fillStyle = "#4a3a2e"; q.fill();
    if (stam > 0) { const c0 = stam > 60 ? "#ff8a5a" : stam > 30 ? "#f0a030" : "#c0302a", gr = q.createLinearGradient(0, sy, 0, sy + 5); gr.addColorStop(0, mix(c0, "#ffffff", 0.35)); gr.addColorStop(1, c0); rr(q, sx, sy, sw * stam / 100, 5, 2.5); q.fillStyle = gr; q.fill(); }
    q.fillStyle = "#2a1d1470"; for (let k = 1; k < 7; k++) q.fillRect(sx + sw * k / 7 - 0.3, sy + 0.5, 0.6, 4);
    // 카드
    for (let s = 0; s < 6; s++) drawCard(s, tm);
    // 끌고 있는 카드 얼굴
    if (drag && drag.k === "card") {
      const x = drag.x, y = drag.y;
      q.save(); q.fillStyle = "rgba(0,0,0,.3)"; q.beginPath(); q.ellipse(x, y + 5, 10, 2.2, 0, 0, 7); q.fill();
      q.shadowColor = "rgba(0,0,0,.5)"; q.shadowBlur = 5; q.shadowOffsetY = 2; rr(q, x - 12.5, y - 27.5, 25, 25, 4.5); q.fillStyle = "#fffaf1"; q.fill(); q.restore();
      drawFace(dp, 1, x - 11, y - 26, 22, false);
      rr(q, x - 12, y - 5, 24, 4, 2); q.fillStyle = dp.col; q.fill();
    }
    // 조각
    for (const s of fx) P(Math.round(s.x), Math.round(s.y), 2, 2, s.c);
  };
  const drawCard = (s, tm) => {
    const p = slots[s], x = CX[s % 3], y0 = cardY(Math.floor(s / 3)), id = "c" + s;
    const q = gH;
    if (!p) {
      // 구인 공고
      q.save(); q.setLineDash([2.2, 1.6]); q.lineWidth = 0.8; q.strokeStyle = "#c8a880"; rr(q, x + 0.5, y0 + 0.5, CWD - 1, CH - 1, 4); q.stroke(); q.restore();
      q.save(); q.translate(x + 25, y0 + 27); q.rotate(-0.05);
      q.shadowColor = "rgba(0,0,0,.4)"; q.shadowBlur = 3; q.shadowOffsetY = 1.2; q.fillStyle = "#fffef6"; q.fillRect(-12, -15, 24, 30); q.shadowColor = "transparent";
      q.fillStyle = "#e0402a"; q.fillRect(-12, -15, 24, 5); q.fillStyle = "#fff"; q.fillRect(-8, -13.2, 16, 1.2);
      q.fillStyle = "#b8ac98"; for (let k = 0; k < 5; k++) q.fillRect(-9, -6 + k * 4, 18 - (k % 2) * 6, 0.9);
      q.beginPath(); q.arc(0, -15.4, 2.1, 0, 7); q.fillStyle = "#c0302a"; q.fill(); q.beginPath(); q.arc(-0.6, -16, 0.7, 0, 7); q.fillStyle = "#ff9a8a"; q.fill();
      q.restore();
      lab(id + "n", "구인 공고 중…", "sm", x, y0 + 46, CWD, 10);
      for (const t of ["w", "s0", "s1", "s2", "t", "h", "x"]) hideLab(id + t);
      return;
    }
    hideLab(id + "x");
    const dead = p.dead, lift = drag && drag.p === p ? 2 : 0, hop = p.hop > 0 ? Math.round(Math.sin(p.hop * 12) * 2) : 0, ar = p.arrive > 0 ? Math.round(p.arrive * 30) : 0;
    const y = y0 - lift - Math.abs(hop) + ar;
    const tgt = guideNow && guideNow.p === p && !drag;
    // 몸통: 둥근 카드 + 그림자 + 위 색 띠
    q.save(); q.shadowColor = "rgba(0,0,0,.45)"; q.shadowBlur = 4 + lift * 2; q.shadowOffsetY = 1.4 + lift;
    rr(q, x, y, CWD, CH, 4.5); const cg = q.createLinearGradient(0, y, 0, y + CH); cg.addColorStop(0, dead ? "#e2dccf" : "#fffdf7"); cg.addColorStop(1, dead ? "#cfc8b8" : "#f6eedd"); q.fillStyle = cg; q.fill(); q.restore();
    q.save(); rr(q, x, y, CWD, CH, 4.5); q.clip(); const hg = q.createLinearGradient(0, y, 0, y + 4); hg.addColorStop(0, mix(dead ? "#a8a090" : p.col, "#ffffff", 0.3)); hg.addColorStop(1, dead ? "#a8a090" : p.col); q.fillStyle = hg; q.fillRect(x, y, CWD, 3.6); q.restore();
    rr(q, x + 0.3, y + 0.3, CWD - 0.6, CH - 0.6, 4.3); q.lineWidth = 0.6; q.strokeStyle = "#2a1d14b0"; q.stroke();
    if (tgt && Math.floor(tm * 4) % 2) { rr(q, x - 1, y - 1, CWD + 2, CH + 2, 5.5); q.lineWidth = 1.4; q.strokeStyle = "#ffd23f"; q.stroke(); }
    const fm = dead ? 2 : p.moodT > 0 ? p.mood : 0;
    if (dead) q.globalAlpha = 0.6;
    drawFace(p, fm, x + 2, y + LY.f, 22, false);
    // 숙련 아이콘
    const iy = y + LY.i;
    ["F", "P", "D"].forEach((k, i) => { const ix = x + 3 + i * 16, im = icoImg(k); q.globalAlpha = dead ? 0.3 : has(p, k) ? 1 : 0.16; if (im.complete && im.naturalWidth) q.drawImage(im, ix + 1.5, iy - 1, 11.4, 10.4); });
    q.globalAlpha = dead ? 0.55 : 1;
    // 가능 시간(저녁/밤 x 화~일)
    const ay = y + LY.a;
    for (let r = 0; r < 2; r++) for (let d = 0; d < 6; d++) {
      const cx = x + 3 + d * 7 + (d >= 3 ? 1 : 0), cy = ay + r * 5, ok = p.av[r][d] === "1", pk = PEAK[r + "," + d];
      rr(q, cx + 0.2, cy + 0.2, 5.6, 3.8, 1.2); q.fillStyle = ok ? (pk ? "#ff8a6a" : "#7fd08a") : "#e2dacb"; q.fill();
      if (ok) { q.fillStyle = "#ffffff80"; q.fillRect(cx + 1, cy + 0.6, 4, 0.7); }
      else { q.strokeStyle = "#b8ae9a"; q.lineWidth = 0.5; q.beginPath(); q.moveTo(cx + 1.4, cy + 3.2); q.lineTo(cx + 4.6, cy + 1); q.stroke(); }
    }
    // 주당 시간 막대(15시간 선)
    const h = hours(p), hy = y + CH - LY.h, hw = CWD - 6, hf = Math.min(hw, hw * h / 20);
    rr(q, x + 3, hy, hw, 7, 3.5); q.fillStyle = "#4a3a2e"; q.fill();
    if (hf > 0) { const c0 = h >= JH ? (Math.floor(tm * 4) % 2 ? "#e0402a" : "#c0302a") : h >= 12 ? "#f0a030" : "#6aa8e0", gr = q.createLinearGradient(0, hy, 0, hy + 7); gr.addColorStop(0, mix(c0, "#ffffff", 0.3)); gr.addColorStop(1, c0); rr(q, x + 3, hy, Math.max(hf, 3), 7, 3.5); q.fillStyle = gr; q.fill(); }
    q.fillStyle = "#ffffff"; q.fillRect(x + 3 + hw * 15 / 20 - 0.4, hy - 1, 0.8, 9);
    q.globalAlpha = 1;
    // 글자
    lab(id + "n", p.n, "nm", x + 25, y + LY.f + 1, 24, 11);
    lab(id + "w", `${p.w.toLocaleString()}원`, "wg", x + 25, y + LY.f + 12, 25, 9);
    ["F", "P", "D"].forEach((k, i) => lab(id + "s" + i, SKN[k], "sk" + (has(p, k) ? "" : " no"), x + 2 + i * 16, y + LY.s, 16, 7));
    lab(id + "t", p.tr, "tr" + (p.pen ? " warn" : p.id === "A" || p.id === "C" ? " good" : ""), x + 3, y + CH - LY.t, CWD - 6, LY.t - LY.h - 1);
    lab(id + "h", h >= JH ? `${h}h 주휴!` : `주 ${h}시간`, "hr", x + 3, y + CH - LY.h, CWD - 6, 7);
    if (dead) lab(id + "x", "못 나와요", "st", x + 6, y + 18, CWD - 12, 14); else hideLab(id + "x");
    if (p.newT > 0) lab(id + "x", "NEW 지원!", "nw", x + 1, y - 5, 26, 9);
  };
  const planLabs = () => {
    const ov = ST.cost > BUDGET;
    lab("cl", "인건비", "rw", 1, GB + 9, GX - 3, 9);
    lab("cv", `<b style="all:unset;font-weight:900">${won(ST.cost)}</b> / 예산 ${won(BUDGET)}${ov ? " · 초과!" : ""} <i style="font-style:normal;color:#8a7a68;font-weight:700">(흰 선=예산)</i>`, "cost" + (ov ? " ov" : ""), GX, GB + 3, 6 * CW, 9);
    lab("sl", "사장", "rw", 1, GB + 19, GX - 3, 9);
    lab("sv", ST.boss ? `사장 출동 ${ST.boss}칸` : "사장님 휴식", "cost" + (ST.boss ? " ov" : ""), GX + AVS + 76, GB + 20, 50, 9);
    avFace(ST.boss >= 4 ? 2 : ST.boss >= 1 ? 0 : 1);
  };
  const hidePlan = () => { for (const k in LB) LB[k].style.display = "none"; avEl.style.display = "none"; okBtn.classList.remove("on"); };

  // ── 빨리 감기(다음 주) ──
  const FFS = (() => { const o = []; for (let d = 0; d < 6; d++) for (let r = 0; r < 2; r++) o.push([r, d]); return o; })();
  let BGF = null, SPR = new Map();
  const spr = (p) => { if (!SPR.has(p.id)) { const sp = p.sp, sh = sp.shirt; SPR.set(p.id, { spec: { skin: p.L.skin, hair: p.L.hair, style: sp.style, shirt: sh, shirt2: mix(sh, "#000000", 0.25), pants: sp.pants, shoe: "#222", hat: sp.hat || null, pack: null, hood: sp.hood || null, glasses: !!sp.glasses, kid: false, elder: false }, cache: {} }); } return SPR.get(p.id); };
  let FL = 220; // 바닥 선(빨리 감기 장면)
  const mkBGF = () => {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const q = c.getContext("2d"), Q = PG(q);
    Q(0, 0, W, FL, "#e8e4da");
    for (let y = 0; y < FL; y += 8) for (let x = 0; x < 108; x += 8) { Q(x, y, 8, 1, "#d2ccbe"); Q(x, y, 1, 8, "#d8d2c4"); if ((x * 7 + y * 3) % 23 === 0) Q(x + 3, y + 4, 2, 1, "#d8c8a0"); }
    // 주문 레일
    Q(0, 22, 106, 2, "#c8ced6"); Q(0, 22, 106, 1, "#f0f4f8"); Q(0, 24, 106, 1, "#6a727c");
    // 메뉴판(칠판)
    const my = 54; Q(4, my, 56, 34, "#5a3a26"); Q(6, my + 2, 52, 30, "#24302a"); Q(6, my + 2, 52, 1, "#3a4a40");
    for (let k = 0; k < 3; k++) { const yy = my + 15 + k * 6; Q(9, yy, 6, 4, ["#eaa83e", "#b8261a", "#5e2c10"][k]); Q(9, yy, 6, 1, "#ffffff40"); Q(18, yy + 1, 18, 1, "#e8e8d8"); Q(44, yy + 1, 10, 1, "#ffd23f"); }
    // TV 자리(내용은 매 프레임)
    Q(66, my, 38, 26, "#1a1a22"); Q(66, my, 38, 1, "#4a4a54"); Q(83, my + 26, 4, 3, "#3a3a44"); Q(78, my + 29, 14, 2, "#3a3a44");
    // 선반
    Q(66, my + 38, 38, 2, "#8a6448"); Q(68, my + 31, 6, 7, "#f4f0e4"); Q(68, my + 31, 6, 2, "#ffc23f"); Q(76, my + 32, 8, 6, "#c8ced6"); Q(77, my + 31, 6, 2, "#b8261a"); Q(87, my + 30, 7, 8, "#e8f0f0"); Q(87, my + 30, 7, 2, "#7fc0a0");
    // 시계
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) Q(34 + x, 38 + y, 1, 1, x * x + y * y >= 17 ? "#5a626c" : "#ffffff");
    Q(34, 34, 1, 4, "#2a2a30"); Q(34, 38, 3, 1, "#2a2a30");
    // 픽업 창구(밤거리)
    Q(106, 0, 54, FL, "#5a3a26"); Q(106, 0, 2, FL, "#3a2416");
    for (let y = 20; y < FL - 4; y++) { const k = (y - 20) / (FL - 24); q.fillStyle = `rgb(${Math.round(30 + k * 30)},${Math.round(26 + k * 20)},${Math.round(70 - k * 25)})`; q.fillRect(110, y, 47, 1); }
    Q(113, 30, 11, 7, "#ff4a8a"); Q(114, 31, 9, 5, "#2a1030"); Q(115, 32, 7, 1, "#ff9ac0"); Q(115, 34, 5, 1, "#ff9ac0");
    for (const [bx, bw, bh] of [[110, 10, 60], [121, 8, 80], [130, 12, 50], [143, 14, 70]]) { Q(bx, FL - 24 - bh, bw, bh, "#1c2038"); for (let yy = FL - 22 - bh; yy < FL - 28; yy += 5) for (let xx = bx + 2; xx < bx + bw - 1; xx += 3) if ((xx * 7 + yy) % 5 < 2) Q(xx, yy, 1, 2, "#ffe08a"); }
    Q(146, FL - 90, 1, 66, "#5a6070"); Q(144, FL - 91, 5, 2, "#ffe8a0"); q.fillStyle = "rgba(255,230,150,.14)"; q.fillRect(138, FL - 89, 17, 64);
    Q(110, FL - 22, 47, 18, "#2a2c34"); for (let x = 112; x < 156; x += 8) Q(x, FL - 13, 4, 1, "#c8c080");
    Q(108, 18, 51, 2, "#8a929c"); Q(108, FL - 4, 51, 4, "#8a929c"); Q(108, FL - 4, 51, 1, "#c8ced6");
    Q(110, 4, 47, 12, "#3a3f4a"); Q(110, 4, 47, 1, "#5a606c"); Q(112, 6, 30, 7, "#1c1f26");
    // 포장대
    drawTable(Q);
    // 바닥
    Q(0, FL, W, H - FL, "#4e3a2a"); for (let y = FL; y < H; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) Q(x, y, 6, 6, "#5a4432");
    Q(0, FL, W, 1, "#2a1d14");
    // 아래 진행판
    const py = H - 58; Q(0, py, W, 58, "#1c140e"); Q(0, py, W, 1, "#ffb03b");
    return c;
  };
  const drawTable = (Q) => { const tt = FL - 32; Q(62, tt, 42, 32, "#5e4230"); Q(62, tt, 42, 2, "#8a6448"); Q(62, tt + 10, 42, 1, "#4a3220"); for (let k = 0; k < 3; k++) { const bx = 65 + k * 12; Q(bx, tt - 10, 10, 10, "#d9a868"); Q(bx, tt - 10, 10, 1, "#f0c88a"); Q(bx + 3, tt - 7, 4, 3, "#ffb03b"); Q(bx + 4, tt - 6, 2, 1, "#c0302a"); } };
  // 튀김기(앞 판은 위 캔버스에 그려서 사장 아랫몸을 가린다)
  const drawFryerBack = (Q, tm, busy) => {
    const t = FL - 54;
    Q(4, t, 56, 12, "#3a2a14");
    for (let y = t + 2; y < t + 12; y++) Q(6, y, 52, 1, mix("#e2a63a", "#9a5a16", (y - t - 2) / 10));
    for (let k = 0; k < (busy ? 22 : 8); k++) { const ph = (tm * 2 + k * 0.37) % 1; Q(7 + ((k * 23) % 50), t + 3 + ((k * 7) % 8), 1, 1, ph < 0.6 ? "#fff6d0" : "#ffe9a0"); }
    for (let k = 0; k < (busy ? 7 : 3); k++) { const ph = (tm * 0.8 + k / 7) % 1; g.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; g.fillRect(10 + ((k * 9) % 44) + Math.round(Math.sin(tm * 3 + k) * 2), t - 2 - Math.round(ph * 30), 2, 2); }
  };
  const drawFryerFront = (Q) => {
    const t = FL - 44;
    Q(2, t, 60, 44, "#a8b0b8"); for (let y = t; y < FL; y += 2) Q(2, y, 60, 1, y % 4 ? "#b0b8c0" : "#a0a8b0");
    Q(2, t, 60, 3, "#d8dee4"); Q(2, t, 60, 1, "#ffffff"); Q(2, t + 3, 60, 1, "#6a727c");
    Q(20, t + 14, 24, 16, "#2a1d14"); q2c(Q, 32, t + 22);
  };
  const q2c = (Q, cx, cy) => { for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) Q(cx + x, cy + y, 1, 1, "#ffb03b"); Q(cx - 3, cy - 2, 5, 5, "#c0302a"); Q(cx - 1, cy - 1, 2, 2, "#ffe08a"); };
  const ffInfo = () => FFS.map(([r, d]) => { const c = cellOf(r, d); return { ...c, dur: (c.peak ? 1.0 : 0.46) / (RM() ? 1.6 : 1) }; });
  const BW = 54, BH = Math.round(BW * 312 / 240);
  const startFF = () => {
    ff = { t: 0, i: -1, list: ffInfo(), stam: 100, boss: 0, done: false };
    FL = H - 62; hidePlan(); BGF = mkBGF();
    Object.assign(meEl.style, { width: BW * K + "px", height: BH * K + "px" });
    S.ff();
  };
  const ffStep = (dt) => {
    const f = ff; f.t += dt; let acc = 0, idx = -1;
    for (let i = 0; i < f.list.length; i++) { if (f.t < acc + f.list[i].dur) { idx = i; break; } acc += f.list[i].dur; }
    if (idx < 0) { if (!f.done) { f.done = true; showSummary(); } return; }
    if (idx !== f.i) {
      f.i = idx; f.u0 = acc; const c = f.list[idx], hp = stageXY(84, 30);
      if (c.boss) { f.boss += c.boss; f.stam = clamp(f.stam - c.boss * 14, 0, 100); S.huff(); vib(15); }
      if (c.peak) { if (c.q >= 0.99) { S.okc(idx); F.hit(hp, "피크 순항", "#ffd23f"); } else if (c.q >= 0.75) { S.okc(idx); F.float(hp, c.st.some((p) => p.id === "E") ? "지각… 그래도 버팀" : "조금 느렸지만 OK"); } else { S.bad(); F.float(hp, "주문 밀림…", "bad"); } }
      else if (c.ok) S.okc(idx); else S.bad();
    }
  };
  const renderFF = (tm) => {
    const f = ff, Q = P; gF.clearRect(0, 0, W, H); const QF = PG(gF); hiBegin();
    g.drawImage(BGF, 0, 0);
    const c = f.i >= 0 ? f.list[f.i] : f.list[0], u = f.t - (f.u0 || 0), busy = c.peak, fl = (n) => Math.floor(tm * n) % 2;
    // 주문표(피크는 4장, 빨간 딱지)
    const nT = c.peak ? 4 : 2;
    for (let k = 0; k < nT; k++) { const tx = 4 + k * 25, ty = 26 + Math.max(0, Math.round((0.12 * k - u) * 60)); if (ty > 46) continue; Q(tx, ty, 22, 18, "#fffef6"); Q(tx + 21, ty + 1, 1, 17, "#d8d4c4"); Q(tx + 2, ty + 2, 8, 1, "#8a8478"); Q(tx + 2, ty + 5, 14, 1, "#c8c4b4"); Q(tx + 3, ty + 9, 9, 6, "#eaa83e"); Q(tx + 4, ty + 9, 5, 1, "#f6d27e"); if (c.peak && k >= 2) Q(tx + 14, ty + 9, 5, 5, "#e0402a"); }
    // TV: 축구 날엔 경기, 아니면 뉴스
    const ty0 = 55, soc = PEAK[c.r + "," + c.d] === "축구";
    if (soc) { Q(67, ty0, 36, 24, "#3e9e4a"); for (let k = 0; k < 36; k += 6) Q(67 + k, ty0, 3, 24, "#46a852"); Q(84, ty0, 1, 24, "#ffffff"); Q(67, ty0 + 8, 4, 8, "#ffffff"); Q(99, ty0 + 8, 4, 8, "#ffffff"); const bx = 70 + Math.round((Math.sin(tm * 3) + 1) * 14), by = ty0 + 10 + Math.round(Math.sin(tm * 5) * 6); Q(bx, by, 2, 2, "#ffffff"); for (let k = 0; k < 5; k++) Q(72 + ((k * 7 + Math.floor(tm * 4) * 3) % 28), ty0 + 4 + ((k * 5) % 16), 1, 2, k % 2 ? "#e0402a" : "#2f6fd0"); }
    else { Q(67, ty0, 36, 24, "#22305a"); Q(67, ty0 + 17, 36, 7, "#e0402a"); Q(69, ty0 + 19, 20, 1, "#ffffff"); Q(69, ty0 + 21, 14, 1, "#ffffff"); Q(78, ty0 + 4, 12, 13, "#f0c8a8"); Q(77, ty0 + 3, 14, 4, "#2a2018"); Q(76, ty0 + 12, 16, 5, "#3a4a8a"); }
    drawFryerBack(Q, tm, busy);
    // 일하는 사람들: 튀김 담당은 튀김기 앞(뒷모습), 나머지는 포장대·배달
    const st = c.st.slice(), fr = st.find((p) => has(p, "F")) || null, rest = st.filter((p) => p !== fr);
    // 오토바이(배달)
    const dGo = c.peak && rest.some((p) => has(p, "D")) && u > c.dur * 0.6, mx = dGo ? 120 + (u - c.dur * 0.6) * 160 : 120;
    if (mx < 170) { const x = Math.round(mx), y = FL - 16; Q(x, y + 8, 5, 5, "#1a1a22"); Q(x + 18, y + 8, 5, 5, "#1a1a22"); Q(x + 1, y + 9, 3, 3, "#8a8a94"); Q(x + 19, y + 9, 3, 3, "#8a8a94"); Q(x + 3, y + 4, 16, 5, "#2f6fd0"); Q(x + 3, y + 4, 16, 1, "#6fa0f0"); Q(x + 6, y + 2, 7, 2, "#1a1a22"); Q(x, y - 2, 7, 7, "#ffb03b"); Q(x + 1, y - 1, 5, 1, "#ffd27a"); Q(x + 18, y - 2, 2, 7, "#5a626c"); if (dGo) for (let k = 0; k < 3; k++) Q(x - 4 - k * 5, y + 8 + (k % 2), 3, 1, "#ffffff80"); }
    // 사장(내 캐릭터): 빈자리를 직접 메운다. 튀김 담당이 없으면 튀김기 뒤, 있으면 포장대 뒤
    const bossOn = c.boss > 0, atFry = !fr, bx = atFry ? 5 : rest.length ? 74 : 56, btop = (atFry ? FL - 44 : FL - 32) - Math.round(BH * 0.62);
    if (bossOn && art) {
      Object.assign(meEl.style, { left: bx * K + "px", top: btop * K + "px" });
      meEl.classList.add("on"); meEl.classList.toggle("shk", c.peak); meExp(c.peak ? EXI.surprised : EXI.sad);
    } else meEl.classList.remove("on", "shk");
    drawFryerFront(QF);
    if (!atFry && bossOn) drawTable(QF);
    // 일하는 알바: 캐릭터 그림(표정은 칸 결과에 맞춘다). 못 불러오면 도트 대체
    const wex = c.q >= 0.99 ? 1 : c.peak && c.q < 0.75 ? 2 : c.peak ? 5 : 0;
    rest.forEach((p, i) => {
      const goOut = has(p, "D") && c.peak && u > c.dur * 0.45;
      if (goOut) { const k = (u - c.dur * 0.45) / (c.dur * 0.55), x = 84 + k * 90, bob = Math.abs(Math.sin(tm * 14)) * 1.5; if (drawBody(p, 1, x, FL - 46 - bob, 46, FL - 1)) { gH.save(); gH.shadowColor = "rgba(0,0,0,.4)"; gH.shadowBlur = 2; rr(gH, x - 7, FL - 22 - bob, 14, 10, 1.5); gH.fillStyle = "#d9a868"; gH.fill(); gH.restore(); gH.fillStyle = "#e0402a"; gH.beginPath(); gH.arc(x, FL - 17 - bob, 2, 0, 7); gH.fill(); return; } }
      else if (drawBody(p, wex, 70 + i * 22, FL - 32 - 30 + (fl(4) ? 0.6 : 0), 50, FL - 31)) return;
      if (goOut) { const k = (u - c.dur * 0.45) / (c.dur * 0.55), x = 80 + k * 90; gF.drawImage(uSprite(spr(p), "s" + (Math.floor(tm * 10) % 4), { v: "s", f: Math.floor(tm * 10) % 4 }), Math.round(x), FL - 31); QF(Math.round(x) + 2, FL - 18, 8, 6, "#d9a868"); }
      else gF.drawImage(uSprite(spr(p), "f" + fl(4), { v: "f", f: fl(4) ? 1 : 3 }), 72 + i * 14 + (bossOn && !atFry ? 20 : 0), FL - 31);
    });
    if (bossOn) {
      // 땀방울(그림을 못 불러와도 땀은 보인다)
      for (let k = 0; k < 6; k++) { const ph = (tm * 1.7 + k * 0.19) % 1, sx = bx + 8 + ((k * 13) % (BW - 14)), sy = btop + 4 + Math.round(ph * 26); QF(sx, sy, 1, 2, "#7fd0ff"); QF(sx, sy - 1, 1, 1, "#e0f6ff"); }
      if (fl(3)) { QF(bx + BW - 10, btop + 4, 3, 1, "#ffffff"); QF(bx + BW - 9, btop + 3, 1, 3, "#ffffff"); }
      if (f.huff !== f.i) { f.huff = f.i; bubble(bx + BW / 2, btop + 2, c.peak ? "헉헉… 주문 폭주!" : "사장이 직접 튀겨요", "angry"); }
    }
    // 튀김 담당 알바(튀김기 앞, 뒷모습). 지각하면 창구에서 뛰어 들어온다
    if (fr) { const late = fr.id === "E" && c.peak && u < c.dur * 0.35; const sx = late ? Math.round(110 - u * 120) : 24; if (drawBody(fr, late ? 5 : wex, sx + 8, FL - 44 - 32 + (late ? Math.abs(Math.sin(tm * 16)) * -2 : 0), 52, FL - 43)) { if (late && f.lateB !== f.i) { f.lateB = f.i; bubble(70, FL - 36, "늦어서 죄송해요!", "angry"); } } else gF.drawImage(uSprite(spr(fr), late ? "s" + (Math.floor(tm * 8) % 4) : "b" + fl(6), late ? { v: "s", f: Math.floor(tm * 8) % 4 } : { v: "b", f: fl(6) * 2 }, late), sx, FL - 31); if (late && f.lateB !== f.i) { f.lateB = f.i; bubble(70, FL - 36, "늦어서 죄송해요!", "angry"); } }
    if (c.peak && bossOn) { gF.fillStyle = `rgba(255,80,20,${0.08 + 0.05 * Math.sin(tm * 14)})`; gF.fillRect(0, 0, W, FL); }
    // 진행판
    const py = H - 58;
    f.list.forEach((cc, i) => {
      const x = GX + cc.d * CW, y = py + 10 + cc.r * 11, done = i < f.i || f.done, cur = i === f.i && !f.done;
      QF(x, y, CW - 2, 9, done ? (cc.q >= 0.99 ? "#3fae5a" : cc.q >= 0.5 ? "#f0a030" : "#c0302a") : cur ? (fl(8) ? "#ffffff" : "#ffd23f") : "#3a2a1e");
      if (cc.peak) QF(x, y, CW - 2, 1, "#ff6a5a");
      if (done && cc.boss) { QF(x + CW - 7, y + 2, 4, 4, "#fff3e0"); QF(x + CW - 6, y + 3, 2, 2, "#c0302a"); }
    });
    // 사장 체력
    const sy = py + 36, sx = GX + AVS + 3, sw = 6 * CW - AVS - 3;
    QF(sx - 1, sy - 1, sw + 2, 7, "#000000"); QF(sx, sy, sw, 5, "#3a2a1e"); QF(sx, sy, Math.round(sw * f.stam / 100), 5, f.stam > 60 ? "#ff8a5a" : f.stam > 30 ? "#f0a030" : "#c0302a");
    // 글자
    const dn = DAYS[c.d] + "요일 " + (c.r ? "밤" : "저녁");
    lab("f1", `${dn}${c.peak ? `<em class="${c.q >= 0.99 ? "ok" : ""}">피크${soc ? "·축구" : ""}</em>` : ""}`, "ff", 4, 4, 104, 16);
    lab("f2", "▶▶ 다음 주", "fw", 108, 46, 50, 12);
    lab("f7", "황금닭 메뉴", "mn", 6, 57, 52, 10);
    lab("f3", c.boss ? `사장님 출동! (${c.boss}자리)` : c.ok ? "알바들이 잘 돌려요" : "", "fs", 4, py + 2, 150, 8);
    lab("f4", "저녁", "fs", 1, py + 10, GX - 2, 9); lab("f5", "밤", "fs", 1, py + 21, GX - 2, 9);
    Object.assign(avEl.style, { display: "", top: (sy - 4) * K + "px" }); avFace(f.stam > 60 ? 1 : f.stam > 30 ? 0 : 2);
    lab("f6", `사장 체력 ${f.stam}`, "fs", sx, sy + 6, sw, 8);
  };
  const showSummary = () => {
    meEl.classList.remove("on", "shk");
    const r = result();
    dim.classList.add("on"); SFX.whoosh();
    const box = document.createElement("div"); box.className = "c3sum";
    box.innerHTML = `<h4>다음 주 영업 결과</h4><div>피크 지켜냄<b class="${r.pk === 4 ? "gd" : "rd"}">${r.pk} / 4</b></div><div>인건비<b class="${r.cost > BUDGET ? "rd" : "gd"}">${won(r.cost)} / ${won(BUDGET)}</b></div><div>사장님 직접 출동<b class="${r.boss ? "rd" : "gd"}">${r.boss}자리</b></div>`;
    wrap.appendChild(box);
    setTimeout(() => finish(r.score, r.line, "", r.parts), RM() ? 900 : 1600);
  };
  const result = () => {
    // 예산 점수는 실제로 채운 자리 비율만큼만(아무도 안 넣으면 돈이 안 드는 건 당연)
    const e = ST, peak = e.pkQ, norm = e.nOK / 8, cov = clamp((16 - e.boss) / 16, 0, 1), bud = (e.cost <= BUDGET ? 1 : clamp(1 - (e.cost - BUDGET) / 40000, 0, 1)) * cov, stam = clamp(1 - e.boss / 6, 0, 1);
    // 예산을 크게 넘긴 근무표는 가게가 못 버틴다: 넘친 만큼 전체를 깎는다
    const ovr = e.cost > BUDGET ? clamp(1 - ((e.cost - BUDGET) / BUDGET) * 1.3, 0.3, 1) : 1;
    const score = clamp((0.4 * peak + 0.2 * norm + 0.2 * bud + 0.2 * stam) * ovr, 0, 1);
    return { score, pk: e.pk, cost: e.cost, boss: e.boss, line: `피크 <b>${e.pk}/4</b> 지킴 · 인건비 <b>${won(e.cost)}</b>/${won(BUDGET)} · 사장 출동 ${e.boss}자리`, parts: [["피크 인원·숙련", peak], ["평소 칸 채우기", norm], ["예산 지키기", bud], ["사장 체력", stam]] };
  };
  const end = () => {
    if (over) return; over = true; drag = null; guide(null); tutEl.classList.add("off");
    if (tmr) tmr.stop();
    if (ntEl) ntEl.remove();
    if (!evDone) evDone = true;
    SFX.whoosh(); F.msg("근무표 확정! 다음 주로 빨리 감기");
    setTimeout(() => { if (wrap.isConnected) startFF(); }, 700);
  };

  // ── 매 프레임 ──
  let guideNow = null;
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tm = now / 1000;
    for (let i = fx.length - 1; i >= 0; i--) { const s = fx[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 120 * dt; if (s.t <= 0) fx.splice(i, 1); }
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t -= dt; if (flashes[i].t <= 0) flashes.splice(i, 1); }
    for (const p of [...roster, newbie]) { if (p.moodT > 0) p.moodT -= dt; if (p.hop > 0) p.hop -= dt; if (p.arrive > 0) p.arrive = Math.max(0, p.arrive - dt * 3); if (p.newT > 0) p.newT -= dt; }
    costShake = Math.max(0, costShake - dt);
    if (ff) { ffStep(dt); if (ff) renderFF(tm); requestAnimationFrame(loop); return; }
    if (tut >= 0) {
      tutT += dt;
      if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else tutNext(1); }
      let gd = null;
      if (tut === 1) { const [x, y] = cardMid(roster[0]), [tx, ty] = cellXY(0, 3); gd = { x, y, t: "끌어서 <b>금 저녁</b>에", m: "dr", dx: tx - x, dy: ty - y, p: roster[0] }; }
      else if (tut === 2) { const l = [0, 1].find((ll) => at(0, 3, ll)); if (l != null) { const x = GX + 3 * CW + CW - 4, y = rowTop(0) + l * LH + 6; gd = { x, y, t: "끝을 잡고 <b>옆으로</b>", m: "dr", dx: CW, dy: 0 }; } }
      else if (tut === 3) { const n = needs().find((nn) => nn.c.r === 0 && nn.c.d === 3); if (n) { const p = candFor(n, false); if (p) { const [x, y] = cardMid(p), [tx, ty] = cellXY(0, 3); gd = { x, y, t: n.s ? `<b>${SKN[n.s]}</b> 카드를 금 저녁에` : "한 명 더", m: "dr", dx: tx - x, dy: ty - y, p }; } } }
      guideNow = gd; guide(drag ? null : gd);
    } else if (!over) {
      if (!t0) t0 = now;
      el = (now - t0) / 1000; idleT += dt;
      if (!evDone && el >= EVT) quitEvent();
      const tk = taskNow(), show = tk && (el < hintUntil || idleT > 4 || !tk.p);
      guideNow = show ? tk : null; guide(show ? tk : null);
      okBtn.classList.toggle("rdy", evDone && !ST.boss);
    }
    if (!over) { planLabs(); renderPlan(tm); }
    else if (!ff) renderPlan(tm);
    requestAnimationFrame(loop);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.chicken3 = {
    st: () => ({ tut, el: +el.toFixed(1), over, ff: ff ? ff.i : null, evDone, quit: quitter && quitter.id, pk: ST.pk, boss: ST.boss, cost: ST.cost, asg: [...asg].map(([k, v]) => k + v.id).join(" "), hrs: people().map((p) => p.id + hours(p)).join(",") }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1) place(roster[0], 0, [3]);
      else if (tut === 2) { const l = [0, 1].find((ll) => at(0, 3, ll)); place(at(0, 3, l), 0, [4], l); }
      else if (tut === 3) { const n = needs().find((nn) => nn.c.r === 0 && nn.c.d === 3); const p = n && candFor(n, false); if (p) place(p, 0, [3]); }
      else if (tut === 4) startGame();
    },
    auto: (bad) => {
      if (over || tut >= 0) return;
      if (bad) { if (rnd() < 0.12) { const p = pick(people().filter((q) => !q.dead)), r = rint(2), d = rint(6); place(p, r, [d, d + 1, d + 2].filter((x) => x < 6)); } return; }
      const ns = needs();
      for (const n of ns) { const p = candFor(n, true); if (p) { place(p, n.c.r, [n.c.d]); return; } }
      if (evDone && slots[5] === newbie && el > EVT + 3) end();
    },
    quit: quitEvent, end,
  };
  updSc(); planLabs(); renderPlan(0); requestAnimationFrame(loop);
}
