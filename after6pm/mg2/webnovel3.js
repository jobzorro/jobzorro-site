// 웹소설 3탄(webnovel3) "작가님 1위 가즈아": 노블리 공모전 마지막 날 밤 7시 → 자정 마감.
// 위: 실시간 랭킹 보드(내 작품 + 라이벌 5편이 순위를 다투며 줄이 휙휙 바뀐다).
// 가운데: 시간대별 독자 수 그래프(밤 10~12시 피크). 아래: 침대에 앉아 폰으로 관리하는 나 + 작업 버튼.
// 할 일: 떠오르는 독자 댓글에 답글(악플은 무시), 표지 바꾸기(1번), 이벤트 참여, 원고 5편을 피크에 연재 올리기.
// 라이벌이 '연참 폭탄'을 터뜨리면 피크 연재로 맞받아친다. 자정에 최종 순위 발표, 1~3위면 왕관 + 유료 연재 제안 메일.
// 그림(11-22 2차): 방은 실제 배경 그림(img/bg/home.webp)+흐림, 나는 캐릭터 그림 표정 시트, 랭킹 판·표지·그래프·폰·이불·아이콘은 기기 해상도 벡터.
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
// 표지 무늬(가운데 0,0 기준 벡터, F=주색)
const MOTIF = {
  sword: (F) => `<g transform="rotate(40)"><path d="M0-19l3.4 4.6v18.4h-6.8v-18.4z" fill="#fff"/><path d="M0-16v18" stroke="${F}" stroke-width="1.2" opacity=".6"/><rect x="-8" y="4" width="16" height="3.6" rx="1.8" fill="${F}"/><rect x="-1.8" y="7.6" width="3.6" height="8" rx="1.2" fill="${F}"/><circle cy="17" r="2.2" fill="#fff"/></g>`,
  heart: (F) => `<path d="M0 15C-12 7-15 1-15-4.5-15-9.5-11.2-13-7-13c3.2 0 5.6 1.7 7 4.4 1.4-2.7 3.8-4.4 7-4.4 4.2 0 8 3.5 8 8.5C15 1 12 7 0 15z" fill="${F}"/><path d="M-10-6c1-2.4 3-3.4 5-3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  coin: (F) => `<circle r="14" fill="${F}"/><circle r="10.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/><text y="5.6" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="15" fill="#fff">₩</text>`,
  store: (F) => `<path d="M-14-6h28v20h-28z" fill="${F}"/><path d="M-16-14h32l-2 8h-28z" fill="#fff"/><path d="M-10-14l-2 8M-2-14v8M6-14l1 8M13-14l2 8" stroke="${F}" stroke-width="3"/><rect x="-10" y="0" width="8" height="14" fill="#fff" opacity=".9"/><rect x="2" y="0" width="9" height="7" rx="1" fill="#fff" opacity=".7"/>`,
  crown: (F) => `<path d="M-15 10l-2-17 9 7 8-11 8 11 9-7-2 17z" fill="${F}"/><rect x="-15" y="9" width="30" height="5" rx="1.5" fill="#fff"/><circle cy="2" r="2.6" fill="#fff"/>`,
  tower: (F) => `<path d="M-6-10h12v24h-12z" fill="${F}"/><path d="M-9-10L0-21 9-10z" fill="${F}"/><path d="M-11 14h22v4h-22z" fill="${F}"/><rect x="-2.2" y="-5" width="4.4" height="6" rx="2.2" fill="#fff"/><rect x="-2.2" y="5" width="4.4" height="5" rx="1" fill="#fff" opacity=".7"/><path d="M0-27l1.4 3 3 .4-2.2 2 .6 3L0-20l-2.8 1.4.6-3-2.2-2 3-.4z" fill="#fff"/>`,
  draft: (F) => `<g transform="rotate(-40)"><rect x="-3.4" y="-15" width="6.8" height="24" fill="${F}"/><rect x="-3.4" y="-17" width="6.8" height="3" fill="#ffd6a0"/><path d="M-3.4 9L0 16 3.4 9z" fill="#ffd6a0"/><path d="M-1 14l1 2 1-2z" fill="#3a3448"/></g>`,
};
// 독자 댓글(닉네임은 지어낸 말 조합)
const NICK_A = ["새벽", "퇴근한", "정주행", "야식", "졸린", "말랑", "꿈꾸는", "통통", "밤샘", "느긋한", "출근길", "주말"];
const NICK_B = ["독자", "감자", "고양이", "만두", "펭귄", "라떼", "도토리", "호떡", "두부", "판다", "치즈", "붕어빵"];
const C_GOOD = ["작가님 다음 화 언제요ㅠ", "공모전 응원해요!", "이 작품 1위 가자!", "주인공 너무 좋아요", "정주행 끝! 다음 화요", "선작하고 갑니다", "오늘 연재 있나요?", "출근길 유일한 낙", "답글 주시면 평생 독자", "마탑 장면 미쳤어요", "투표하고 왔어요!", "오늘 밤 기다릴게요"];
const C_TROLL = ["노잼… 하차함", "1화부터 뻔하네", "이게 공모전작?", "광고 보고 왔는데 별로", "표절 아님?ㅋ"];
const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const hm = (g) => { const m = Math.min(300, Math.floor(g * 10)), h = 19 + Math.floor(m / 60); return h >= 24 ? "00:00" : `${h}:${String(m % 60).padStart(2, "0")}`; };
// ── 벡터 그림 도구(도트 대신 기기 해상도 그림) ──
const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
const svgW = (vb, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
// 둥근 네모 길
function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const lin = (c, x0, y0, x1, y1, st) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rad = (c, x, y, r0, r1, st) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
function star5(c, x, y, r, fill, stroke) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = r * 0.18; c.stroke(); } }
// 7세그먼트 숫자(디지털 시계)
const SEG7 = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
function seg7(c, d, x, y, w, h, col, dim) {
  const t = w * 0.26, m = y + h / 2, S = { a: [x + t, y, x + w - t, y], b: [x + w, y + t, x + w, m - t * 0.6], c: [x + w, m + t * 0.6, x + w, y + h - t], d: [x + t, y + h, x + w - t, y + h], e: [x, m + t * 0.6, x, y + h - t], f: [x, y + t, x, m - t * 0.6], g: [x + t, m, x + w - t, m] };
  c.lineCap = "round"; c.lineWidth = t;
  for (const k of "abcdefg") { const on = SEG7[d].includes(k); if (!on && !dim) continue; c.strokeStyle = on ? col : dim; c.beginPath(); c.moveTo(S[k][0], S[k][1]); c.lineTo(S[k][2], S[k][3]); c.stroke(); }
}
// 아래를 가리키는 손(리허설 안내)
const HAND_URL = svgU(svgW("0 0 40 40", `<rect x="10" y="0.8" width="24" height="5.4" rx="2" fill="#5fb8ff" stroke="#2a1e2e" stroke-width="1.6"/><g stroke="#2a1e2e" stroke-width="2" stroke-linejoin="round"><rect x="8.5" y="4" width="27" height="19" rx="7" fill="#ffe6d6"/><rect x="10" y="12" width="9.6" height="26" rx="4.8" fill="#fff4ec"/></g><path d="M23 12.5v7.5M28 12.5v7.5M32.4 13.5v5.5" stroke="#d8a898" stroke-width="1.5" stroke-linecap="round"/><path d="M12.6 33.4a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="#e8b8a8" stroke-width="1.3"/><path d="M12 15v8" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>`));
// 장르·조각 아이콘(32칸 기준 벡터)
const ICON_SVG = {
  reg: `<rect x="7" y="2.5" width="18" height="3.8" rx="1.6" fill="#ffd166" stroke="#5a3a10" stroke-width="1.2"/><rect x="7" y="25.7" width="18" height="3.8" rx="1.6" fill="#ffd166" stroke="#5a3a10" stroke-width="1.2"/><path d="M9.6 6.3h12.8c0 6-6.2 7-6.2 9.7s6.2 3.7 6.2 9.7H9.6c0-6 6.2-7 6.2-9.7S9.6 12.3 9.6 6.3z" fill="#d6f0ff" stroke="#2a3a5a" stroke-width="1.2"/><path d="M12.2 9h7.6c-.6 2.6-3.8 3.4-3.8 5.6-.1-2.2-3.2-3-3.8-5.6z" fill="#ffb03b"/><path d="M11.6 25.4c.6-3 4.4-3.8 4.4-6.4 0 2.6 3.8 3.4 4.4 6.4z" fill="#ffb03b"/><path d="M16 15.5v3.3" stroke="#ffb03b" stroke-width="1"/><path d="M11 7.5c.4 2 1 3.2 2.2 4.2" stroke="#fff" stroke-width="1" fill="none" opacity=".8"/>`,
  rof: `<path d="M16 17c-1.2 5-1.2 9 0 13" stroke="#3f9a4c" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M16 24.5c3-3.2 7.4-3.2 8.6-1-2.2 2.4-5.6 3.2-8.6 1z" fill="#5fc06c" stroke="#2f6a3a" stroke-width=".8"/><path d="M15.6 22c-2.6-2.6-6.4-2.4-7.4-.4 2 2 5 2.4 7.4.4z" fill="#5fc06c" stroke="#2f6a3a" stroke-width=".8"/><circle cx="16" cy="11" r="8.2" fill="#ff6fa8" stroke="#8a1f4a" stroke-width="1.2"/><path d="M10.5 11.5c.8-4.6 10.2-4.6 11 0-2.4-2.4-8.4-2.4-11 0z" fill="#ffb0d0"/><path d="M12.6 13.2c2 2.4 5.4 2.2 6.8-1" stroke="#b8205a" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M13.4 9.4c1.6-1.8 4.4-1.8 5.6.2" stroke="#b8205a" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="12.8" cy="7.8" r="1.3" fill="#fff" opacity=".7"/>`,
  mur: `<g transform="rotate(45 16 16)"><path d="M16 .8l2.2 3.4v15.4h-4.4V4.2z" fill="#e8ecf4" stroke="#3a3e50" stroke-width="1.1"/><path d="M16 2.6v16.6" stroke="#fff" stroke-width=".9"/><rect x="9.6" y="19.4" width="12.8" height="2.8" rx="1.3" fill="#ffb03b" stroke="#5a3a10" stroke-width="1"/><rect x="14.6" y="22.2" width="2.8" height="6" rx="1" fill="#7a4a2a" stroke="#3a2010" stroke-width=".8"/><circle cx="16" cy="29.6" r="1.9" fill="#ffd166" stroke="#5a3a10" stroke-width=".8"/></g>`,
  dist: `<rect x="8.5" y="3" width="15" height="26" rx="3.2" fill="#4a3f66" stroke="#d8ccf0" stroke-width="1.2"/><rect x="10.4" y="6.2" width="11.2" height="18.4" rx="1.2" fill="#7fc8ff"/><path d="M14 11.8v7l5.6-3.5z" fill="#fff"/><rect x="13.5" y="26" width="5" height="1.2" rx=".6" fill="#d8ccf0"/><circle cx="22.6" cy="5.6" r="4.2" fill="#ff3b5c" stroke="#fff" stroke-width="1.2"/><path d="M22.6 3.6v2.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><circle cx="22.6" cy="7.8" r=".8" fill="#fff"/>`,
  cof: `<path d="M6.5 12.5h15.5v9.5a5.2 5.2 0 0 1-5.2 5.2h-5.1a5.2 5.2 0 0 1-5.2-5.2z" fill="#f2e6d8" stroke="#2a1a10" stroke-width="1.3"/><path d="M22 14.6h2a3.6 3.6 0 0 1 0 7.2h-2" fill="none" stroke="#2a1a10" stroke-width="1.6"/><ellipse cx="14.25" cy="12.7" rx="7.4" ry="1.9" fill="#8a5a3a" stroke="#2a1a10" stroke-width="1"/><rect x="6.6" y="17" width="15.3" height="3" fill="#ffd166"/><path d="M10.5 9.4c-1.6-2 1.6-3 0-5.4M14.5 9.4c-1.6-2 1.6-3 0-5.4M18.5 9.4c-1.6-2 1.6-3 0-5.4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".9"/>`,
};
const icCache = {};
const iconURL = (k) => icCache[k] || (icCache[k] = svgU(svgW("0 0 32 32", ICON_SVG[k])));
const icG = (k, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${ICON_SVG[k]}</g>`;
const handG = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="10" y="0.8" width="24" height="5.4" rx="2" fill="#5fb8ff" stroke="#2a1e2e" stroke-width="1.6"/><g stroke="#2a1e2e" stroke-width="2" stroke-linejoin="round"><rect x="8.5" y="4" width="27" height="19" rx="7" fill="#ffe6d6"/><rect x="10" y="12" width="9.6" height="26" rx="4.8" fill="#fff4ec"/></g><path d="M23 12.5v7.5M28 12.5v7.5" stroke="#d8a898" stroke-width="1.5" stroke-linecap="round"/></g>`;
const sparkG = (x, y, r, c) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="${c}"/>`;
// 작은 아이콘(벡터): 연재·표지·이벤트·하트·종이비행기·왕관·편지
const VIC = {
  up: ["0 0 32 32", () => `<rect x="6" y="3" width="20" height="26" rx="3" fill="#fffaf0" stroke="#1a1424" stroke-width="1.4"/><path d="M6 8V6a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2z" fill="#9fd8ff"/><path d="M16 9.5l-6.2 6.2h4.1v6.6h4.2v-6.6h4.1z" fill="#1f6fd0"/><rect x="10" y="24.4" width="12" height="2" rx="1" fill="#9aa0c0"/>`],
  cover: ["0 0 32 32", () => `<rect x="7" y="3" width="19" height="26" rx="2.4" fill="#5fb8ff" stroke="#1a1424" stroke-width="1.4"/><path d="M7 5.4A2.4 2.4 0 0 1 9.4 3H11v26H9.4A2.4 2.4 0 0 1 7 26.6z" fill="#1f6fd0"/><path d="M12 22l4.5-6 3 3.5 2-2.2 3.5 4.7z" fill="#fffaf0"/><circle cx="20.5" cy="10" r="2.4" fill="#ffd166"/>${sparkG(26, 5, 4.2, "#ffd166")}`],
  event: ["0 0 32 32", () => `<path d="M4.5 12.5h5.5l11.5-6.5v19.5L10 19H4.5z" fill="#ff5a7a" stroke="#1a1424" stroke-width="1.4" stroke-linejoin="round"/><rect x="4.5" y="12.5" width="5.5" height="6.5" fill="#ffd0e0" stroke="#1a1424" stroke-width="1.2"/><rect x="6.5" y="19" width="4" height="7" rx="1.5" fill="#fffaf0" stroke="#1a1424" stroke-width="1.2"/><path d="M24.5 12c1.8 1.6 1.8 6 0 7.6M27.5 9c3.4 3.2 3.4 10.6 0 13.8" stroke="#ffd166" stroke-width="1.9" fill="none" stroke-linecap="round"/>`],
  heart: ["0 0 32 32", () => `<path d="M16 27.5C6 20.4 3.4 15.2 3.4 10.8 3.4 7 6.4 4.4 10 4.4c2.6 0 4.6 1.4 6 3.6 1.4-2.2 3.4-3.6 6-3.6 3.6 0 6.6 2.6 6.6 6.4 0 4.4-2.6 9.6-12.6 16.7z" fill="#ff5a7a" stroke="#1a1424" stroke-width="1.6"/><path d="M8 9.6c.8-1.7 2.2-2.3 3.6-2.1" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`],
  plane: ["0 0 40 32", () => `<path d="M2 14.5L37.5 3 26.5 29l-7.2-9.2z" fill="#fffaf0" stroke="#1a1424" stroke-width="1.6" stroke-linejoin="round"/><path d="M19.3 19.8L37.5 3 13.6 17.5z" fill="#c8cce0" stroke="#1a1424" stroke-width="1.3" stroke-linejoin="round"/><path d="M19.3 19.8l-2 8 4.6-4.7" fill="#9aa0c0" stroke="#1a1424" stroke-width="1.2" stroke-linejoin="round"/>`],
  crown: ["0 0 44 28", () => `<path d="M3.5 23L1.6 6.5l10.4 7.6L22 2.6l10 11.5 10.4-7.6L40.5 23z" fill="#ffd166" stroke="#5a3a00" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 20.5L5 11l7 5 10-10" stroke="#fff3b0" stroke-width="1.2" fill="none"/><rect x="3" y="21.5" width="38" height="5.4" rx="1.6" fill="#e0a020" stroke="#5a3a00" stroke-width="1.4"/><circle cx="22" cy="15.5" r="2.8" fill="#ff5a7a" stroke="#5a3a00" stroke-width=".8"/><circle cx="11.5" cy="17" r="1.9" fill="#5fb8ff"/><circle cx="32.5" cy="17" r="1.9" fill="#5fb8ff"/><circle cx="1.8" cy="6.3" r="1.8" fill="#fff3b0" stroke="#5a3a00" stroke-width=".8"/><circle cx="22" cy="2.4" r="1.9" fill="#fff3b0" stroke="#5a3a00" stroke-width=".8"/><circle cx="42.2" cy="6.3" r="1.8" fill="#fff3b0" stroke="#5a3a00" stroke-width=".8"/>`],
  env: ["0 0 108 66", (o) => `<rect x="2" y="2" width="104" height="62" rx="7" fill="${o.w || "#fff3d0"}" stroke="#1a1424" stroke-width="2.6"/><path d="M4.5 6l49.5 33L103.5 6" fill="none" stroke="#1a1424" stroke-width="2.6" stroke-linejoin="round"/><path d="M4.5 62L40 30M103.5 62L68 30" stroke="#1a1424" stroke-width="1.6" opacity=".35"/><path d="M54 47.5c-6-4.2-7.6-7.4-7.6-10 0-2.3 1.8-3.9 3.9-3.9 1.6 0 2.8.9 3.7 2.2.9-1.3 2.1-2.2 3.7-2.2 2.1 0 3.9 1.6 3.9 3.9 0 2.6-1.6 5.8-7.6 10z" fill="#ff5a7a" stroke="#a0203a" stroke-width="1.2"/>`],
};
const vCache = {};
function vURL(k, o = {}) { const key = k + JSON.stringify(o); return vCache[key] || (vCache[key] = svgU(svgW(VIC[k][0], VIC[k][1](o)))); }
const vG = (k, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${VIC[k][1]({})}</g>`;
// 표지(56x72 벡터). fancy=false 면 회색 임시 표지
function coverURL(d, fancy = true, mine = false) {
  const bg = fancy ? d.bg : "#6a6878", fg = fancy ? d.fg : "#c8c6d4", id = "c" + (fancy ? d.m : "draft");
  const dots = fancy ? [[12, 10], [44, 14], [40, 40], [14, 44], [48, 30], [20, 22]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 0.9 : 1.4}" fill="#fff" opacity=".55"/>`).join("") : [12, 20, 28, 36, 44].map((y) => `<path d="M10 ${y}h40" stroke="#fff" stroke-width="1" opacity=".1"/>`).join("");
  const glow = fancy ? `<circle cx="28" cy="30" r="18" fill="${fg}" opacity=".22"/>` : "";
  const shine = fancy ? `<path d="M30 1h12L18 71H6z" fill="#fff" opacity="${mine ? 0.2 : 0.1}"/>` : `<rect x="34" y="4" width="16" height="11" rx="1" fill="#ffe27a" transform="rotate(6 42 9)"/><text x="42" y="12.6" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="6.5" fill="#7a5a10" transform="rotate(6 42 9)">임시</text>`;
  return svgU(svgW("0 0 56 72", `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tint(bg, fancy ? 1.55 : 1.15)}"/><stop offset="1" stop-color="${tint(bg, 0.75)}"/></linearGradient></defs><rect x="1" y="1" width="54" height="70" rx="4" fill="url(#${id})" stroke="#0a0814" stroke-width="2"/><path d="M2 5a4 4 0 0 1 4-4v70a4 4 0 0 1-4-4z" fill="#000" opacity=".25"/>${dots}${glow}<g transform="translate(29 29)">${MOTIF[fancy ? d.m : "draft"](fg)}</g><rect x="7" y="50" width="44" height="15" rx="2.5" fill="#000" opacity="${fancy ? 0.45 : 0.25}"/><rect x="11" y="54" width="36" height="2.8" rx="1.4" fill="${fancy ? "#fffaf0" : "#e8e6f0"}"/><rect x="11" y="59.2" width="24" height="2.2" rx="1.1" fill="${fancy ? fg : "#b0aec0"}"/>${shine}`));
}
// 방법 화면 그림(벡터 3장)
function stepPics() {
  const bg = `<rect width="80" height="80" rx="12" fill="#17142c"/>`;
  const a = svgW("0 0 80 80", bg + `<path d="M8 10h56a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H26l-9 8v-8h-9a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6z" fill="#fffaf0"/>` + vG("heart", 8, 14, 0.5) + `<rect x="26" y="17" width="34" height="3.4" rx="1.7" fill="#1f6fd0"/><rect x="26" y="26" width="26" height="3" rx="1.5" fill="#8a7a8a"/>` + handG(34, 40, 0.8) + sparkG(72, 8, 5, "#ffd166") + sparkG(74, 52, 4, "#ff8fc8"));
  const bars = [...Array(12)].map((_, i) => { const t = trAt(i * 2.5 + 1), h = Math.round(t * 13), pk = t >= PEAK; return `<rect x="${5 + i * 6}" y="${66 - h}" width="4.4" height="${h}" rx="1.4" fill="${pk ? "#ffd166" : "#4a6aa0"}"/>`; }).join("");
  const b = svgW("0 0 80 80", bg + `<rect x="4" y="22" width="72" height="50" rx="5" fill="#0e0a1c"/><rect x="47" y="24" width="28" height="46" fill="#ffd166" opacity=".12"/>` + bars + `<path d="M4 66.5h72" stroke="#5a5070" stroke-width="1.2"/><rect x="46" y="2" width="26" height="26" rx="6" fill="#ffd166"/>` + vG("up", 47, 3, 0.75) + sparkG(40, 10, 4, "#fff3b0"));
  const row = (y, c, gold) => `<rect x="5" y="${y}" width="70" height="15" rx="3" fill="${gold ? "#3a2e10" : "#221a3e"}" stroke="${gold ? "#ffd166" : "#3a3060"}" stroke-width="1.2"/><rect x="10" y="${y + 2.5}" width="8" height="10" rx="1.5" fill="${c}"/><rect x="22" y="${y + 4}" width="${gold ? 36 : 30}" height="2.6" rx="1.3" fill="#c8c0e0"/><rect x="22" y="${y + 9}" width="16" height="2" rx="1" fill="#7a7090"/>`;
  const c = svgW("0 0 80 80", bg + row(26, "#5fb8ff", true) + row(44, "#ff8fc8") + row(62, "#7fe0a8") + vG("crown", 4, 4, 0.62) + sparkG(44, 10, 5, "#fff3b0") + sparkG(66, 14, 3.5, "#ffd166"));
  return [[`<img src="${svgU(a)}" alt="">`, "댓글엔 답글 톡"], [`<img src="${svgU(b)}" alt="">`, "피크에 연재 올리기"], [`<img src="${svgU(c)}" alt="">`, "자정에 순위 발표"]];
}

export const GAME = {
  key: "webnovel3", base: "webnovel", jc: "#5fb8ff", n: "작가님 1위 가즈아", desc: "노블리 공모전 마지막 날 밤, 자정 마감까지 순위를 끌어올려요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 저녁 7시부터 <b>자정 마감</b>까지, 위쪽 <b>실시간 랭킹</b>에서 내 작품을 3위 안으로!",
    "<b>원고는 5편뿐.</b> 가운데 그래프의 <b>노란 칸(밤 10~12시 피크)</b>에 <b>연재 올리기</b>를 하면 조회가 폭발해요. 그 전엔 아껴 둬요.",
    "피크 전엔 준비: 떠오르는 <b>독자 댓글</b>에 답글 톡(<b>악플은 무시</b>), <b>표지 바꾸기</b>(1번), <b>이벤트 참여</b>. 라이벌의 <b>연참 폭탄</b>도 조심!",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "댓글엔 답글 톡"], ["", "피크에 연재 올리기"], ["", "자정에 순위 발표"]]; } },
  css: `
.mg-webnovel3 .wr-st{background:#120c22!important;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
.mg-webnovel3 .wr-cv{position:absolute;left:0;top:0;z-index:0;touch-action:none;pointer-events:none}
.mg-webnovel3 .wr-bgi{position:absolute;left:0;right:0;z-index:0;overflow:hidden;pointer-events:none;background:#1a1530}
.mg-webnovel3 .wr-bgi::before{content:"";position:absolute;inset:-6px;background:url("img/bg/home.webp") 22% 36%/150% auto no-repeat;filter:brightness(.6) saturate(1.1) blur(1px)}
.mg-webnovel3 .wr-bgi::after{content:"";position:absolute;inset:0;background:linear-gradient(#120c22cc,transparent 22%,transparent 70%,#0a0616aa),radial-gradient(120% 90% at 40% 50%,transparent 50%,#05031088)}
.mg-webnovel3 .wr-cv.fg{z-index:2}
.mg-webnovel3 .wr-cv.fx{z-index:19}
.mg-webnovel3 .mg-steps img{width:76px;height:76px}
.mg-webnovel3 .mg-msg{z-index:24}
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
.mg-webnovel3 .wr-cov img{display:block;width:100%;height:100%;filter:drop-shadow(0 1px 1px #0008)}
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
    const F = frame(host, "webnovel3", "작가님 1위 가즈아", "wr-st");
    const st = F.stage;
    st.insertAdjacentHTML("beforeend", `<div class="wr-bgi"></div><canvas class="wr-cv"></canvas><div class="wr-rc"><div class="wr-me"></div></div><canvas class="wr-cv fg"></canvas>
      <div class="wr-hd"><i>노블리</i><span>공모전 실시간 랭킹</span><span class="lv">LIVE</span><span class="wr-clk">19:00</span></div><div class="wr-bd"></div>
      <div class="wr-gx">지금 독자 <b>×0.5</b></div><div class="wr-gl"><span>7시</span><span>8시</span><span>9시</span><span class="pk">10시</span><span class="pk">11시</span><span class="pk">12시</span></div>
      <div class="wr-loy"><img src="${vURL("heart")}" alt=""><span>충성도</span><u><i></i></u></div><div class="wr-cms"></div><div class="wr-say"></div>
      <div class="wr-bt"><button class="wr-b up" data-a="up"><img src="${vURL("up")}" alt=""><b>연재 올리기</b><span class="wr-pips"></span></button><button class="wr-b" data-a="cov"><img src="${vURL("cover")}" alt=""><b>표지 바꾸기</b><small>1번만</small></button><button class="wr-b off" data-a="ev"><img src="${vURL("event")}" alt=""><b>이벤트</b><small>대기 중</small></button></div>
      <div class="wr-red"></div><div class="wr-dim"></div><canvas class="wr-cv fx"></canvas><div class="wr-ban"></div><div class="wr-mail"><img class="env" alt=""><div class="wr-lt"></div></div>
      <div class="wr-tut off"><div class="wr-tc"><em>리허설</em><p></p><div class="wr-tb"></div></div></div><div class="wr-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const bgiEl = $(".wr-bgi"), cv = $(".wr-cv"), gB = cv.getContext("2d"), cvF = $(".wr-cv.fg"), gF = cvF.getContext("2d"), cvX = $(".wr-cv.fx"), gX = cvX.getContext("2d");
    const hdEl = $(".wr-hd"), clkEl = $(".wr-clk"), bdEl = $(".wr-bd"), gxEl = $(".wr-gx"), glEl = $(".wr-gl"), loyEl = $(".wr-loy"), loyI = $(".wr-loy u i"), cmsEl = $(".wr-cms"), sayEl = $(".wr-say");
    const rcEl = $(".wr-rc"), meEl = $(".wr-me"), btEl = $(".wr-bt"), bUp = $('[data-a="up"]'), bCov = $('[data-a="cov"]'), bEv = $('[data-a="ev"]'), pipsEl = $(".wr-pips");
    const redEl = $(".wr-red"), dimEl = $(".wr-dim"), ban = $(".wr-ban"), mailEl = $(".wr-mail"), envEl = $(".wr-mail .env"), ltEl = $(".wr-lt");
    const tutEl = $(".wr-tut"), tutP = $(".wr-tc p"), tutB = $(".wr-tb"), hand = $(".wr-hand");
    pipsEl.innerHTML = "<i></i>".repeat(STOCK);
    const pips = [...pipsEl.children];

    // ── 크기: 논리 폭 112칸 안팎을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cv, cvF, cvX]) { c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    for (const x of [gB, gF, gX]) x.setTransform(KS, 0, 0, KS, 0, 0);
    const rowH = clamp(Math.floor(sh * 0.066), 33, 42), hdH = 24, bTop = 4, rowsTop = bTop + hdH, bH = hdH + rowH * 6 + 4;
    const gTop = bTop + bH + 5, gH = clamp(Math.round(sh * 0.11), 52, 70), btH = clamp(Math.round(sh * 0.115), 58, 70);
    const pTop = gTop + gH + 4, btTop = sh - btH - 10, pH = btTop - pTop - 4;
    Object.assign(hdEl.style, { top: bTop + 3 + "px", height: hdH - 6 + "px" });
    Object.assign(bdEl.style, { top: rowsTop + "px", height: rowH * 6 + "px" });
    gxEl.style.top = gTop + 3 + "px"; glEl.style.top = gTop + gH - 14 + "px";
    Object.assign(rcEl.style, { top: pTop + "px", height: pH + "px" });
    Object.assign(bgiEl.style, { top: pTop - 2 + "px", height: btTop - pTop + 2 + "px" });
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

    // ── 배경(한 번만): 랭킹 판·그래프 판은 벡터, 방은 실제 그림(.wr-bgi) 위에 줄 전구 ──
    const hiC = () => { const c = document.createElement("canvas"); c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); const x = c.getContext("2d"); x.setTransform(KS, 0, 0, KS, 0, 0); return [c, x]; };
    const [BG, b0] = hiC();
    const bulbs = [];
    const pT = (pTop - 2) / K, pB = (btTop - 4) / K;
    {
      const b = b0;
      b.fillStyle = lin(b, 0, 0, 0, pT, [[0, "#140e28"], [1, "#1a1232"]]); b.fillRect(0, 0, LW, pT);
      // 랭킹 보드 틀(금테)
      const bx = 1, by = bTop / K, bw = LW - 2, bh = (bTop + bH) / K - by;
      b.save(); b.shadowColor = "rgba(255,209,102,.35)"; b.shadowBlur = 4 * KS;
      rr(b, bx, by, bw, bh, 3); b.fillStyle = lin(b, 0, by, 0, by + bh, [[0, "#ffe9a8"], [0.5, "#e0a838"], [1, "#a8701a"]]); b.fill(); b.restore();
      rr(b, bx + 0.9, by + 0.9, bw - 1.8, bh - 1.8, 2.4); b.fillStyle = "#5a3e12"; b.fill();
      rr(b, bx + 1.6, by + 1.6, bw - 3.2, bh - 3.2, 2); b.fillStyle = lin(b, 0, by, 0, by + bh, [[0, "#1c1438"], [1, "#150f2a"]]); b.fill();
      b.save(); rr(b, bx + 1.6, by + 1.6, bw - 3.2, bh - 3.2, 2); b.clip();
      b.fillStyle = lin(b, 0, by, 0, by + hdH / K, [[0, "#2e3c86"], [1, "#1e2858"]]); b.fillRect(bx, by, bw, hdH / K - 0.2);
      b.restore();
      b.fillStyle = "#5fb8ff"; b.fillRect(bx + 1.6, by + hdH / K - 0.4, bw - 3.2, 0.4);
      for (const [x, y] of [[bx + 1.8, by + 1.8], [bx + bw - 1.8, by + 1.8], [bx + 1.8, by + bh - 1.8], [bx + bw - 1.8, by + bh - 1.8]]) { b.fillStyle = rad(b, x - 0.3, y - 0.3, 0.1, 1.3, [[0, "#fffbe0"], [1, "#c89020"]]); b.beginPath(); b.arc(x, y, 1.2, 0, 7); b.fill(); }
      // 순위 칸(1·2·3위 금·은·동)
      const SL = [["#4a3a12", "#2e230a"], ["#30364a", "#1e2232"], ["#40280f", "#2a1a0a"], ["#221a40", "#1a1434"], ["#251d46", "#1c1638"], ["#221a40", "#1a1434"]], SE = ["#ffd166", "#d8e0f0", "#e09858", "#3a3060", "#3a3060", "#3a3060"];
      for (let i = 0; i < 6; i++) {
        const y0 = (rowsTop + i * rowH) / K, h = rowH / K - 0.6;
        rr(b, bx + 2.6, y0 + 0.3, bw - 5.2, h, 1.6); b.fillStyle = lin(b, bx, 0, bx + bw, 0, [[0, SL[i][0]], [1, SL[i][1]]]); b.fill();
        if (i < 3) { b.fillStyle = lin(b, 0, y0, 0, y0 + h, [[0, "rgba(255,255,255,.12)"], [0.5, "rgba(255,255,255,0)"]]); b.fill(); }
        rr(b, bx + 2.6, y0 + 0.3, 1, h, 0.5); b.fillStyle = SE[i]; b.fill();
      }
      // 그래프 판
      const gy0 = gTop / K, gh2 = gH / K;
      rr(b, 2, gy0, LW - 4, gh2, 2.4); b.fillStyle = lin(b, 0, gy0, 0, gy0 + gh2, [[0, "#140f28"], [1, "#0b0818"]]); b.fill(); b.strokeStyle = "#3a3060"; b.lineWidth = 0.4; b.stroke();
      b.strokeStyle = "rgba(255,255,255,.05)"; b.lineWidth = 0.25; for (let y = gyT; y < gyB; y += 4) { b.beginPath(); b.moveTo(gx0, y); b.lineTo(gx1, y); b.stroke(); }
      const pkX = gx0 + 18 * gStep;
      b.fillStyle = lin(b, 0, gyT - 3, 0, gyB, [[0, "rgba(255,209,102,.04)"], [1, "rgba(255,209,102,.14)"]]); b.fillRect(pkX, gyT - 3, gx1 - pkX, gyB - gyT + 3);
      b.strokeStyle = "rgba(255,209,102,.55)"; b.lineWidth = 0.35; b.setLineDash([1, 1]); b.beginPath(); b.moveTo(pkX, gyT - 3); b.lineTo(pkX, gyB); b.stroke(); b.setLineDash([]);
      // 방: 줄 전구(전선)
      b.strokeStyle = "#3a3040"; b.lineWidth = 0.4; b.beginPath();
      for (let x = 0; x <= LW; x += 0.5) { const y = pT + 3 + Math.sin(x / 9) * 1.6 + 1.6; x ? b.lineTo(x, y) : b.moveTo(x, y); if (Math.abs((x % 7) - 3) < 0.25) bulbs.push([x, y + 1.2]); }
      b.stroke();
      // 작업 패널 바닥
      b.fillStyle = lin(b, 0, btTop / K - 2, 0, LH, [[0, "#140e26"], [1, "#0a0614"]]); b.fillRect(0, btTop / K - 2, LW, LH - btTop / K + 2);
      b.fillStyle = "#3a3060"; b.fillRect(0, btTop / K - 2, LW, 0.35);
    }
    // 앞(이불·베개)
    const [FG, f0] = hiC();
    {
      const b = f0, by0 = pB - 9;
      const wave = (x) => Math.sin(x / 6 + 1) * 1.2;
      b.beginPath(); b.moveTo(0, pB); for (let x = 0; x <= LW; x += 0.5) b.lineTo(x, by0 + wave(x)); b.lineTo(LW, pB); b.closePath();
      b.fillStyle = lin(b, 0, by0, 0, pB, [[0, "#b8a8f0"], [0.35, "#9a88d8"], [1, "#6a5aa8"]]); b.fill();
      b.save(); b.clip(); b.strokeStyle = "rgba(255,255,255,.16)"; b.lineWidth = 0.3;
      for (let x = -20; x < LW + 20; x += 5) { b.beginPath(); b.moveTo(x, by0 - 2); b.lineTo(x + 10, pB); b.stroke(); b.beginPath(); b.moveTo(x + 10, by0 - 2); b.lineTo(x, pB); b.stroke(); }
      b.restore();
      b.beginPath(); for (let x = 0; x <= LW; x += 0.5) { const y = by0 + wave(x); x ? b.lineTo(x, y) : b.moveTo(x, y); } b.strokeStyle = "#e0d8ff"; b.lineWidth = 0.5; b.stroke();
      // 베개
      b.save(); b.shadowColor = "rgba(0,0,0,.35)"; b.shadowBlur = 2 * KS; rr(b, LW - 45, by0 - 5.5, 17, 6.5, 2.6); b.fillStyle = lin(b, 0, by0 - 5.5, 0, by0 + 1, [[0, "#ffffff"], [1, "#cfc4ec"]]); b.fill(); b.restore();
      b.strokeStyle = "rgba(160,140,210,.6)"; b.lineWidth = 0.3; b.beginPath(); b.moveTo(LW - 40, by0 - 2); b.quadraticCurveTo(LW - 36.5, by0 - 3, LW - 33, by0 - 2); b.stroke();
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
      e.img.src = coverURL(e.d, !e.me); e.slot = -1; e.rank = 0; e.dlT = 0; e.shownS = -1; e.tagT = {};
    }
    const crownEl = ME.el.querySelector(".wr-crown"); crownEl.src = vURL("crown");
    const coverNew = coverURL(MINE, true, true), coverOld = ME.img.src;
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
      const pl = document.createElement("img"); pl.className = "wr-plane"; pl.src = vURL("plane"); st.appendChild(pl);
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
      e.innerHTML = `<b>${troll ? "" : `<img src="${vURL("heart")}" alt="">`}${troll ? "익명" : nk()}</b><span>${troll ? pick(C_TROLL) : pick(C_GOOD)}</span>`;
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
    let g = gB;
    const render = () => {
      g = gB; g.clearRect(0, 0, LW, LH); g.drawImage(BG, 0, 0, LW, LH);
      const BC = ["#ff6a8a", "#ffd166", "#7fe0a8", "#5fb8ff", "#c79cff"];
      bulbs.forEach(([x, y], i) => {
        const on = Math.sin(tm * 3 + i * 1.3) > -0.3, c = BC[i % 5];
        if (on) { g.fillStyle = rad(g, x, y + 0.6, 0.2, 3.2, [[0, c + "88"], [1, c + "00"]]); g.beginPath(); g.arc(x, y + 0.6, 3.2, 0, 7); g.fill(); }
        g.fillStyle = "#2a2430"; g.fillRect(x - 0.45, y - 0.7, 0.9, 0.7);
        g.fillStyle = on ? c : tint(c, 0.45); g.beginPath(); g.ellipse(x, y + 0.6, 0.75, 1.05, 0, 0, 7); g.fill();
        if (on) { g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(x - 0.25, y + 0.3, 0.25, 0, 7); g.fill(); }
      });
      // 그래프 막대(둥근 벡터)
      const G0 = curG(), cur = Math.min(29, Math.floor(G0));
      for (let i = 0; i < 30; i++) {
        const t = trAt(i + 0.5), h = Math.max(1.5, (t / 3.3) * (gyB - gyT)), x = gx0 + i * gStep, w = Math.max(1.4, gStep - 0.8);
        const pk = t >= PEAK, past = i < cur, now = i === cur;
        let c0 = pk ? "#ffe08a" : "#7a9ae0", c1 = pk ? "#e0a020" : "#3a56a0";
        if (past) { c0 = pk ? "#8a7038" : "#3a4c78"; c1 = pk ? "#5a4620" : "#26345a"; }
        if (now) { const fl = Math.floor(tm * 6) % 2; c0 = fl ? "#ffffff" : pk ? "#fff3b0" : "#bfe6ff"; c1 = fl ? "#dfe8ff" : pk ? "#ffd166" : "#5fb8ff"; }
        rr(g, x, gyB - h, w, h + 0.4, Math.min(0.9, w / 2)); g.fillStyle = lin(g, 0, gyB - h, 0, gyB, [[0, c0], [1, c1]]); g.fill();
        if (now) { const ax = x + w / 2, ay = gyB - h - 1.2; g.fillStyle = "#fff"; g.beginPath(); g.moveTo(ax - 2, ay - 2.6); g.lineTo(ax + 2, ay - 2.6); g.lineTo(ax, ay); g.closePath(); g.fill(); }
      }
      g.fillStyle = "#5a5070"; g.fillRect(gx0, gyB, gx1 - gx0, 0.4);
      // 독자 머리(지금 막대 위에서 퐁퐁)
      heads.forEach((h) => { g.globalAlpha = clamp(h.t * 1.6, 0, 1); g.fillStyle = h.c; g.beginPath(); g.arc(h.x + 1, h.y + 1.2, 1.05, 0, 7); g.fill(); g.fillStyle = "#2a2448"; g.beginPath(); g.arc(h.x + 1, h.y + 0.9, 1.1, Math.PI, 0); g.fill(); }); g.globalAlpha = 1;
      // 앞: 이불·폰
      g = gF; g.clearRect(0, 0, LW, LH); g.drawImage(FG, 0, 0, LW, LH);
      const sg = g.createRadialGradient(phX + 6, phY + 4, 1, phX + 6, phY + 4, 22); sg.addColorStop(0, `rgba(140,200,255,${0.22 + flash})`); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(phX - 20, phY - 22, 52, 44);
      {
        const pw = 11, ph = 17, x0 = phX + 1, y0 = phY + 3, sx = x0 + 1, sy = y0 + 1.2, sW = pw - 2, sH = ph - 3, my = Math.min(3, ME.slot), SKIN = "#f2c9a8";
        g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 2 * KS; rr(g, x0, y0, pw, ph, 1.8); g.fillStyle = lin(g, x0, y0, x0 + pw, y0 + ph, [[0, "#ffb0d8"], [1, "#d0609a"]]); g.fill(); g.restore();
        rr(g, sx, sy, sW, sH, 0.9); g.fillStyle = flash > 0 ? "#ffffff" : lin(g, 0, sy, 0, sy + sH, [[0, "#14204a"], [1, "#0a1230"]]); g.fill();
        if (flash <= 0) {
          g.save(); rr(g, sx, sy, sW, sH, 0.9); g.clip();
          g.fillStyle = "#1f6fd0"; g.fillRect(sx, sy, sW, 2); g.fillStyle = "#9fd8ff"; g.fillRect(sx + 0.8, sy + 0.7, 3, 0.6);
          for (let i = 0; i < 4; i++) { const yy = sy + 3.4 + i * 2.8; if (i === my) { g.fillStyle = "rgba(95,184,255,.35)"; g.fillRect(sx, yy - 1, sW, 2.4); } g.fillStyle = i === 0 ? "#ffd166" : i === my ? "#9fd8ff" : "#6a6a8a"; g.beginPath(); g.arc(sx + 1.2, yy + 0.2, 0.55, 0, 7); g.fill(); rr(g, sx + 2.4, yy - 0.2, i === my ? 5.4 : 4.4, 0.8, 0.4); g.fillStyle = i === my ? "#9fd8ff" : "#4a4a6a"; g.fill(); }
          g.fillStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + sW * 0.6, sy); g.lineTo(sx, sy + sH * 0.5); g.closePath(); g.fill();
          g.restore();
        }
        rr(g, x0 + 3.8, y0 + ph - 0.9, 3.4, 0.45, 0.2); g.fillStyle = "rgba(255,255,255,.6)"; g.fill();
        // 손(양쪽에서 폰을 쥔)
        for (const [hx, dir] of [[x0 - 0.6, -1], [x0 + pw + 0.6, 1]]) {
          g.fillStyle = lin(g, hx - 2, 0, hx + 2, 0, dir < 0 ? [[0, "#e0b090"], [1, SKIN]] : [[0, SKIN], [1, "#e0b090"]]);
          g.beginPath(); g.ellipse(hx, y0 + 11.5, 2.2, 3.8, dir * 0.15, 0, 7); g.fill();
          g.fillStyle = "#ffdcc0"; g.beginPath(); g.ellipse(hx - dir * 0.6, y0 + 8.2, 1.2, 0.9, 0, 0, 7); g.fill();
        }
      }
      // 색종이
      g = gX; g.clearRect(0, 0, LW, LH);
      conf.forEach((c, i) => { g.save(); g.translate(c.x, c.y); g.rotate(tm * 6 + i); g.scale(1, Math.cos(tm * 9 + i)); g.fillStyle = c.c; g.fillRect(-1, -0.55, 2, 1.1); g.restore(); });
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
    hand.style.backgroundImage = `url("${HAND_URL}")`;
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
          envEl.src = vURL("env", { w: win ? "#fff3d0" : "#e0dcec" });
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
