// 미니게임 2탄(tutoring2) "풀이 순서 판서": 퇴근 후 화상과외. 학생은 캐릭터 그림(표정 시트), 방·책상·시험지는 도트.
// 학생이 모르는 문제를 보내면, 섞인 풀이 카드를 칠판(화면 공유)으로 끌어 올려 순서대로 붙인다.
// 붙이면 분필로 써지고 학생 이해도가 오른다. 순서가 틀리면 학생 물음표가 커지고, 함정 카드(틀린 공식)를 붙이면 썼다가 지우개로 지운다. 함정은 휴지통으로 버리면 보너스.
// 문제 4개(단계 3→4→4→5). 다 붙이면 학생이 "아~!" 하고 전구가 켜진다. 끝나면 학생이 시험지를 들어 보이고 빨간 동그라미가 그려지며 점수가 오른다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const NAMES = ["지우", "서준", "하윤", "도윤", "예린", "민재", "수아", "태오", "유나", "시우", "채원", "준호", "다인", "건우"];
const ya = (n) => { const c = n.charCodeAt(n.length - 1) - 0xac00; return n + (c >= 0 && c <= 11171 && c % 28 ? "아" : "야"); };
const SUBJ = { m: ["수학", "#5fb8ff"], e: ["영어", "#ff7eb6"], s: ["과학", "#7fe0c0"] };
// 문제: sub 과목, lv 난이도, q 칠판 제목, qs 보조, ask 학생 질문, steps [칠판 글, 카드 이름표, 내 설명], traps [칠판 글, 카드 이름표], ans 답
const PROBS = [
  { sub: "m", lv: 1, q: "3x − 6 = 9", qs: "x는?", ask: "쌤, 이항이 헷갈려요ㅠ", steps: [["3x = 9 + 6", "이항", "−6을 넘기면 +6!"], ["3x = 15", "정리", "정리하면 15!"], ["x = 5", "양변 ÷ 3", "3으로 나누면 끝!"]], traps: [["3x = 9 − 6", "이항"]], ans: "x = 5" },
  { sub: "m", lv: 1, q: "5x + 5 = 20", qs: "x는?", ask: "쌤, 이거 어떻게 풀어요?", steps: [["5x = 20 − 5", "이항", "+5를 넘기면 −5!"], ["5x = 15", "정리", "정리하면 15!"], ["x = 3", "양변 ÷ 5", "5로 나누면 끝!"]], traps: [["5x = 20 + 5", "이항"]], ans: "x = 3" },
  { sub: "s", lv: 1, q: "속력 구하기", qs: "120km를 2시간에", ask: "쌤, 속력 공식이 뭐였죠?", steps: [["속력 = 거리 ÷ 시간", "공식", "거리 나누기 시간!"], ["= 120 ÷ 2", "값 넣기", "숫자를 넣고~"], ["= 60 km/h", "계산", "시속 60km!"]], traps: [["속력 = 거리 × 시간", "공식"]], ans: "60 km/h" },
  { sub: "e", lv: 1, q: "그는 축구를 한다", qs: "영어로 순서대로", ask: "쌤, 영어 순서 모르겠어요ㅠ", steps: [["He", "주어", "주어 먼저!"], ["plays", "동사 (3인칭)", "3인칭 단수니까 -s!"], ["soccer.", "목적어", "목적어는 뒤에!"]], traps: [["play", "동사"]], ans: "He plays soccer." },
  { sub: "m", lv: 2, q: "2(x − 1) = x + 5", qs: "x는?", ask: "괄호 있으면 어떡해요?", steps: [["2x − 2 = x + 5", "괄호 풀기", "괄호부터 풀고!"], ["2x − x = 5 + 2", "이항", "x는 왼쪽, 수는 오른쪽!"], ["x = 7", "정리", "정리하면 7!"], ["2×6 = 12 ✓", "검산", "검산까지 하면 완벽!"]], traps: [["2x − 1 = x + 5", "괄호 풀기"]], ans: "x = 7" },
  { sub: "s", lv: 2, q: "밀도 구하기", qs: "질량 40g · 부피 20cm³", ask: "밀도는 뭘 나눠요?", steps: [["밀도 = 질량 ÷ 부피", "공식", "질량 나누기 부피!"], ["= 40 ÷ 20", "값 넣기", "숫자 넣고~"], ["= 2", "계산", "계산하면 2!"], ["2 g/cm³", "단위", "단위 꼭 붙이기!"]], traps: [["밀도 = 부피 ÷ 질량", "공식"]], ans: "2 g/cm³" },
  { sub: "e", lv: 2, q: "나는 어제 책을 읽었다", qs: "영어로 순서대로", ask: "어제는 어디에 써요?", steps: [["I", "주어", "주어 먼저!"], ["read", "동사 (과거)", "read는 과거도 read!"], ["a book", "목적어", "그다음 목적어"], ["yesterday.", "시간", "시간은 맨 뒤!"]], traps: [["readed", "동사 (과거)"]], ans: "I read a book yesterday." },
  { sub: "m", lv: 3, q: "x + y = 7, x − y = 1", qs: "연립", ask: "연립방정식 너무 어려워요ㅠ", steps: [["두 식을 더하면", "가감법", "두 식을 더해 봐!"], ["2x = 8", "y가 사라짐", "y가 사라지지?"], ["x = 4", "양변 ÷ 2", "x는 4!"], ["4 + y = 7", "대입", "첫 식에 넣으면~"], ["y = 3", "답", "y는 3!"]], traps: [["2x = 6", "y가 사라짐"]], ans: "x = 4, y = 3" },
  { sub: "s", lv: 3, q: "전류 구하기", qs: "전압 12V · 저항 4Ω", ask: "옴의 법칙 모르겠어요ㅠ", steps: [["V = I × R", "옴의 법칙", "전압은 전류 곱하기 저항!"], ["I = V ÷ R", "식 바꾸기", "전류만 남기면"], ["I = 12 ÷ 4", "값 넣기", "숫자를 넣고~"], ["I = 3", "계산", "계산하면 3!"], ["답: 3 A", "단위", "단위는 암페어!"]], traps: [["I = V × R", "식 바꾸기"]], ans: "3 A" },
  { sub: "e", lv: 3, q: "수동태로: I made the cake.", qs: "", ask: "수동태 순서가 헷갈려요", steps: [["The cake", "주어", "목적어가 주어로!"], ["was", "be동사 (과거)", "과거·단수는 was!"], ["made", "과거분사", "made는 p.p.도 made"], ["by", "~에 의해", "by 붙이고"], ["me.", "행위자", "I는 me로!"]], traps: [["were", "be동사 (과거)"]], ans: "The cake was made by me." },
];
const TUT_P = { sub: "m", lv: 0, q: "x + 2 = 5", qs: "x는?", ask: "쌤, 이거 어떻게 풀어요?", steps: [["x = 5 − 2", "이항", "+2를 넘기면 −2!"], ["x = 3", "계산", "계산하면 끝!"]], traps: [["x = 5 + 2", "이항"]], ans: "x = 3" };
const WRONG_SAY = ["어… 그 전에 뭐 해요?", "엥? 순서가…?", "쌤 그거 다음 아니에요?", "잠깐만요, 헷갈려요"];
const TRAP_SAY = ["?!? 헷갈려요ㅠㅠ", "어라? 이상한데요?", "쌤 그거 맞아요…?"];
const NOD = ["아하", "음음!", "오케이!", "그렇구나", "네네!"];

const SKIN = ["#f7d5b8", "#f0c8a4", "#e2b48c", "#c99470", "#a87454"];
const HAIR = ["#2a2018", "#3b2a1e", "#5a3b22", "#1b1b22", "#7a4a2a", "#c9a050", "#4a2a3a"];
const TOPS = ["#5b7bd9", "#e0607a", "#3e9e6a", "#e0b040", "#8a5fc0", "#2f3d5c", "#5bb8c8", "#ff9f7a", "#4a4a52", "#c94f8a"];
const WALLS = ["#e9dcc6", "#cfdde6", "#ecd3dc", "#d6e6cf", "#ddd3ee", "#f0e0c0"];
const DESKS = ["#c48a5c", "#b8b0a4", "#e0c8a0", "#8a6a50", "#e8e4dc"];
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
// 물음표 5x7, 전구 7x9 (X 테두리, Y 유리, W 반짝, G 꼭지)
const QM = [".XXX.", "X...X", "....X", "...X.", "..X..", ".....", "..X.."];
const BULB = ["..XXX..", ".XYYYX.", "XYYWYYX", "XYYYWYX", "XYYYYYX", ".XYYYX.", "..XGX..", "..GGG..", "..XGX.."];

const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
function outline(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 200;
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) add.push((y * W + x) * 4);
  for (const i of add) { a[i] = 26; a[i + 1] = 16; a[i + 2] = 34; a[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}
const mkCv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const PF = (g) => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// 도트 손가락(안내)
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function paintFinger(P, x0, y0) { FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(x0 + x, y0 + y, 1, 1, ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"); })); }
function fingerURL() { const c = mkCv(13, 13), P = PF(c.getContext("2d")); paintFinger(P, 0, 0); return c.toDataURL(); }
// 글리프(테두리 포함) 그리기
function glyph(P, rows, x0, y0, s, col) {
  const map = { X: "#2a1e2e", Y: col.Y, W: "#ffffff", G: "#9aa0b0", o: col.Y };
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(x0 + x * s, y0 + y * s, s, s, map[ch] || col.Y); }));
}
function qmark(P, x0, y0, s, c) {
  // 테두리 먼저(사방 1칸), 그다음 노란 글자
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) QM.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "X") P(x0 + x * s + dx, y0 + y * s + dy, s, s, "#2a1e2e"); }));
  QM.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "X") P(x0 + x * s, y0 + y * s, s, s, c); }));
}
// ── 벡터 그리기(고해상도 캔버스, 논리 좌표) ──
const rrV = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
const lgV = (g, x0, y0, x1, y1, cs) => { const q = g.createLinearGradient(x0, y0, x1, y1); cs.forEach((c, i) => q.addColorStop(i / (cs.length - 1), c)); return q; };
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, "")).replace(/\(/g, "%28").replace(/\)/g, "%29");
function deskV(g, x, w, deskY, bot, dc) {
  g.save(); g.fillStyle = lgV(g, 0, deskY, 0, bot, [tint(dc, 1.18), dc, tint(dc, 0.78)]); g.fillRect(x, deskY, w, bot - deskY);
  g.fillStyle = tint(dc, 1.3); g.fillRect(x, deskY, w, 0.6);
  const cx = x + w * 0.42;
  g.save(); g.translate(cx - 4, deskY + 3.6); g.rotate(-0.06); g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 1.4; rrV(g, -9, -2, 18, 5.6, 0.6); g.fillStyle = "#fbf8ee"; g.fill(); g.shadowColor = "transparent";
  g.strokeStyle = "#b8c4e0"; g.lineWidth = 0.35; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(-7.4, -0.4 + k * 1.5); g.lineTo(7.4, -0.4 + k * 1.5); } g.stroke(); g.strokeStyle = "#e08a8a"; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-6, 3.6); g.stroke(); g.restore();
  g.save(); g.translate(cx + 9, deskY + 3); g.rotate(-0.5); rrV(g, -4, -0.5, 8, 1.1, 0.5); g.fillStyle = "#ffc23f"; g.fill(); g.fillStyle = "#2a2a30"; g.fillRect(3.4, -0.5, 0.9, 1.1); g.restore();
  g.restore();
}
// 물음표(벡터): 왼쪽 위 기준, 크기 s(도트판 5x7 칸의 배수)
function qmarkV(g, x, y, s, c) { g.save(); g.font = `900 ${9 * s}px sans-serif`; g.textBaseline = "top"; g.lineJoin = "round"; g.lineWidth = 1.6 + s * 0.4; g.strokeStyle = "#2a1e2e"; g.strokeText("?", x, y - s); g.fillStyle = c; g.fillText("?", x, y - s); g.restore(); }
// 전구(벡터)
function bulbV(g, x, y, s, on, pulse) {
  const cx = x + 7 * s / 2, cy = y + 3.4 * s;
  g.save(); g.globalAlpha = 0.55; g.strokeStyle = "#fff3a0"; g.lineWidth = 1; g.lineCap = "round"; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r1 = 5.4 * s + pulse, r2 = 7 * s + pulse; g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); } g.stroke(); g.globalAlpha = 1;
  g.shadowColor = "#ffe066"; g.shadowBlur = 8; g.beginPath(); g.arc(cx, cy, 3.4 * s, 0, 6.3); const q = g.createRadialGradient(cx - s, cy - s, 0.3, cx, cy, 3.4 * s); q.addColorStop(0, "#ffffff"); q.addColorStop(0.4, on ? "#ffe066" : "#fff08a"); q.addColorStop(1, "#f0b020"); g.fillStyle = q; g.fill(); g.shadowBlur = 0; g.shadowColor = "transparent";
  rrV(g, cx - 1.6 * s, cy + 3 * s, 3.2 * s, 2.4 * s, 0.6 * s); g.fillStyle = "#9aa0b0"; g.fill(); g.strokeStyle = "#6a7080"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(cx - 1.6 * s, cy + 3.8 * s); g.lineTo(cx + 1.6 * s, cy + 3.8 * s); g.moveTo(cx - 1.6 * s, cy + 4.6 * s); g.lineTo(cx + 1.6 * s, cy + 4.6 * s); g.stroke();
  g.strokeStyle = "#f08a20"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(cx - 1, cy + 2.4 * s); g.lineTo(cx - 0.6, cy); g.lineTo(cx + 0.6, cy + 0.8); g.lineTo(cx + 1, cy + 2.4 * s); g.stroke();
  g.restore();
}
// 휴지통(벡터 SVG)
function binSVG(open) {
  return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 51"><defs><linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#c8d4e4"/><stop offset=".5" stop-color="#8fa0b8"/><stop offset="1" stop-color="#5d6c84"/></linearGradient></defs>
    <path d="M10 18h28l-3 30H13z" fill="url(#b)" stroke="#3a4458" stroke-width="1.6" stroke-linejoin="round"/><path d="M17 23v20M24 23v20M31 23v20" stroke="#5d6c84" stroke-width="2" stroke-linecap="round"/>
    ${open ? `<g transform="rotate(-28 8 15)"><rect x="5" y="10" width="36" height="6" rx="2.4" fill="#8fa0b8" stroke="#3a4458" stroke-width="1.6"/><rect x="18" y="6" width="10" height="5" rx="2" fill="none" stroke="#3a4458" stroke-width="1.6"/></g><ellipse cx="24" cy="18.6" rx="13.6" ry="2.2" fill="#2a3040"/>` : `<rect x="7" y="12" width="34" height="6" rx="2.4" fill="#a8b6cc" stroke="#3a4458" stroke-width="1.6"/><rect x="19" y="8" width="10" height="5" rx="2" fill="none" stroke="#3a4458" stroke-width="1.6"/>`}</svg>`);
}
// 방법 그림(벡터 80x68)
function stepPicsV() {
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const face = (x, y, mouth, eyes) => `<g transform="translate(${x} ${y})"><path d="M-12 26c0-9 5-13 12-13s12 4 12 13z" fill="#5bb8c8"/><circle r="9" cy="3" fill="#f7d5b8"/><path d="M-9.4 2a9.4 9.4 0 0 1 18.8 0c-3-4-15-4-18.8 0z" fill="#3b2a1e"/>${eyes}${mouth}</g>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#2f5a44"/><rect x="4" y="4" width="72" height="44" rx="4" fill="#3a6a52" stroke="#b07a4a" stroke-width="3"/><path d="M12 16h30M12 26h22M12 36h26" stroke="#f4f4ec" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
    <rect x="10" y="50" width="34" height="13" rx="3" fill="#fffdf6" stroke="#5b7bd9" stroke-width="1.4"/><path d="M15 56.6h20" stroke="#3a3448" stroke-width="2" stroke-linecap="round"/><path d="M50 56C58 50 58 38 50 32" fill="none" stroke="#ffe066" stroke-width="2" stroke-dasharray="3 2.4"/>${hand(52, 40)}</svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#3a2f52"/>${face(34, 24, '<path d="M-2 8q2-1.4 4 0" stroke="#a84040" stroke-width="1" fill="none"/>', '<path d="M-5 3.4h2.6M2.4 3.4H5" stroke="#2a1e2e" stroke-width="1.2" stroke-linecap="round"/>')}
    <text x="52" y="30" font-size="28" font-weight="900" fill="#ffd166" stroke="#2a1e2e" stroke-width="1.6" font-family="sans-serif">?</text><text x="10" y="22" font-size="14" font-weight="900" fill="#c8d0ff" stroke="#2a1e2e" stroke-width="1" font-family="sans-serif">?</text></svg>`);
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><defs><radialGradient id="l" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#f0b020"/></radialGradient></defs><rect width="80" height="68" rx="11" fill="#3a4a62"/><circle cx="58" cy="18" r="22" fill="#fff3a0" opacity=".25"/>${face(30, 24, '<path d="M-3.4 6.6q3.4 3.4 6.8 0z" fill="#a84040"/>', '<path d="M-6 3.4q1.6-2 3.2 0M2.8 3.4q1.6-2 3.2 0" stroke="#2a1e2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>')}
    <circle cx="58" cy="17" r="9" fill="url(#l)"/><rect x="54" y="25" width="8" height="6" rx="1.4" fill="#9aa0b0"/><path d="M58 3v-1M70 8l1.4-1.4M46 8l-1.4-1.4M73 18h2M41 18h2" stroke="#fff3a0" stroke-width="2" stroke-linecap="round"/></svg>`);
  return [[`<img src="${a}" alt="">`], [`<img src="${b}" alt="">`], [`<img src="${c}" alt="">`]];
}
// 휴지통 12x13 → 3배
function binURL(open) {
  const c = mkCv(16, 17), P = PF(c.getContext("2d")), B = "#8fa0b8", BD = "#5d6c84", BL = "#c8d4e4";
  for (let y = 6; y < 16; y++) { const ins = y > 13 ? 1 : 0; P(3 + ins, y, 10 - ins * 2, 1, B); }
  P(3, 6, 10, 1, BL); for (const x of [5, 8, 11]) P(x, 8, 1, 6, BD); P(4, 15, 8, 1, BD);
  if (!open) { P(2, 4, 12, 2, BD); P(2, 4, 12, 1, BL); P(6, 3, 4, 1, BD); }
  else { for (let i = 0; i < 11; i++) P(1 + i, 4 - Math.floor(i / 3), 1, 2, i < 1 ? BL : BD); P(2, 2, 2, 1, BD); P(3, 6, 10, 1, "#2a3040"); }
  outline(c); return c.toDataURL();
}

function stuSpec(style) {
  return { skin: pick(SKIN), hair: pick(HAIR), style, top: pick(["hoodie", "uniform", "tee", "hoodie", "uniform"]), tc: pick(TOPS), glasses: rnd() < 0.3, headset: rnd() < 0.45, hs: pick(["#2a2a34", "#e8e8f0", "#ff7eb6", "#5fb8ff"]), desk: pick(DESKS) };
}
// 학생 상반신 + 책상(1탄과 같은 그림체). o: { dy, eye n|close|down|happy|wide|sad, mouth n|open|o|smile|sad, arm desk|write|up|wave, f, sweat, mark, paper }
function paintStu(g, s, cx, deskY, o, tx, tw, bot) {
  const P = PF(g);
  if (o.noBody) { const dc = s.desk; P(tx, deskY, tw, bot - deskY, dc); P(tx, deskY, tw, 1, tint(dc, 1.15)); P(tx, deskY + 1, tw, 1, tint(dc, 0.85)); P(cx - 11, deskY + 2, 15, 5, "#f8f4e8"); P(cx - 11, deskY + 2, 15, 1, "#fff"); P(cx - 9, deskY + 3, 9, 1, "#c8c0d8"); P(cx - 9, deskY + 5, 7, 1, "#c8c0d8"); P(cx - 4, deskY + 2, 1, 5, "#e0d0c0"); return; }
  const sk = s.skin, skD = tint(sk, 0.86), hc = s.hair, hcL = tint(hc, 1.5), hcD = tint(hc, 0.72), tc = s.tc, tcD = tint(tc, 0.78), tcL = tint(tc, 1.18), D = "#2a1e2e";
  const sy = deskY - 13, hy = sy - 16 + (o.dy || 0), st = s.style, arm = o.arm || "desk", f = o.f || 0;
  if (st === "long") P(cx - 9, hy + 3, 18, 22, hcD); else if (st === "bob") P(cx - 9, hy + 3, 18, 12, hcD); else if (st === "pony") { P(cx + 7, hy + 4, 4, 11, hcD); P(cx + 8, hy + 15, 3, 2, hcD); }
  if (arm === "up" || arm === "wave") {
    const ax = cx + 12 + (arm === "wave" && f ? 2 : 0);
    P(cx + 11, sy + 1, 4, 4, tcD); P(ax + 1, sy - 9, 3, 11, tcD); P(ax, sy - 15, 5, 6, sk); P(ax, sy - 16, 1, 1, sk); P(ax + 2, sy - 17, 1, 2, sk); P(ax + 4, sy - 16, 1, 1, sk); P(ax, sy - 10, 5, 1, skD);
  }
  const tb = deskY - sy + 1;
  P(cx - 12, sy, 24, 2, tc); P(cx - 14, sy + 2, 28, tb - 2, tc); P(cx - 14, sy + 2, 2, tb - 2, tcD); P(cx + 12, sy + 2, 2, tb - 2, tcD); P(cx - 12, sy, 24, 1, tcL);
  if (s.top === "hoodie") { P(cx - 7, sy - 1, 14, 3, tcD); P(cx - 4, sy, 8, 2, tint(tc, 0.62)); P(cx - 3, sy + 2, 1, 6, "#f2f2f2"); P(cx + 2, sy + 2, 1, 6, "#f2f2f2"); P(cx - 7, deskY - 3, 14, 1, tcD); }
  else if (s.top === "uniform") { P(cx - 3, sy, 6, 7, "#f4f4f8"); P(cx - 2, sy + 7, 4, 2, "#f4f4f8"); P(cx - 1, sy + 1, 2, 8, "#c0304a"); P(cx - 1, sy + 1, 2, 1, "#e05a6a"); P(cx - 5, sy + 1, 2, 9, tcD); P(cx + 3, sy + 1, 2, 9, tcD); P(cx + 6, sy + 4, 3, 1, "#ffd166"); }
  else { P(cx - 3, sy, 6, 2, sk); P(cx - 2, sy + 2, 4, 1, sk); P(cx - 4, sy + 5, 8, 4, tcL); P(cx - 1, sy + 6, 2, 2, "#fff"); }
  const nk = sy - (hy + 14);
  if (nk > 0) P(cx - 2, hy + 14, 4, nk + 1, skD);
  P(cx - 7, hy, 14, 15, sk); P(cx - 8, hy + 2, 16, 10, sk); P(cx - 6, hy + 14, 12, 1, skD);
  P(cx - 9, hy + 6, 1, 3, sk); P(cx + 8, hy + 6, 1, 3, sk);
  const ey = hy + 8, ex = [cx - 5, cx + 3], eye = o.eye || "n";
  if (eye === "close") ex.forEach((x) => P(x - 1, ey + 1, 3, 1, D));
  else if (eye === "down") ex.forEach((x) => P(x, ey + 1, 2, 1, D));
  else if (eye === "happy") ex.forEach((x) => { P(x - 1, ey + 1, 1, 1, D); P(x, ey, 2, 1, D); P(x + 2, ey + 1, 1, 1, D); });
  else if (eye === "wide") ex.forEach((x) => { P(x - 1, ey - 1, 3, 3, "#fff"); P(x, ey, 1, 1, D); });
  else ex.forEach((x) => { P(x, ey, 2, 2, D); P(x, ey, 1, 1, "#fff"); });
  if (eye === "sad") { P(cx - 6, ey - 2, 2, 1, hcD); P(cx - 4, ey - 3, 1, 1, hcD); P(cx + 4, ey - 2, 2, 1, hcD); P(cx + 3, ey - 3, 1, 1, hcD); }
  else if (eye === "wide") { P(cx - 6, ey - 4, 3, 1, hcD); P(cx + 3, ey - 4, 3, 1, hcD); }
  else if (eye !== "close") { P(cx - 6, ey - 2, 3, 1, hcD); P(cx + 3, ey - 2, 3, 1, hcD); }
  P(cx - 7, hy + 11, 2, 1, o.blush ? "#ff7a90" : "#f39aa6"); P(cx + 5, hy + 11, 2, 1, o.blush ? "#ff7a90" : "#f39aa6");
  if (o.blush) { P(cx - 8, hy + 10, 3, 1, "#ff9fb0"); P(cx + 5, hy + 10, 3, 1, "#ff9fb0"); }
  const my = hy + 12, M = "#b04a5a", mo = o.mouth || "n";
  if (mo === "open") { P(cx - 1, my, 3, 2, "#6a1f2a"); P(cx, my + 1, 1, 1, "#e07080"); }
  else if (mo === "o") P(cx - 1, my, 2, 2, "#6a1f2a");
  else if (mo === "smile") { P(cx - 2, my, 1, 1, M); P(cx - 1, my + 1, 2, 1, M); P(cx + 1, my, 1, 1, M); }
  else if (mo === "sad") { P(cx - 2, my + 1, 1, 1, M); P(cx - 1, my, 2, 1, M); P(cx + 1, my + 1, 1, 1, M); }
  else P(cx - 1, my, 2, 1, M);
  if (s.glasses) { const G = "#3a2a3a"; for (const x of [cx - 6, cx + 2]) { P(x, ey - 1, 4, 1, G); P(x, ey + 2, 4, 1, G); P(x, ey - 1, 1, 4, G); P(x + 3, ey - 1, 1, 4, G); } P(cx - 2, ey, 4, 1, G); }
  if (st === "buzz") { P(cx - 7, hy - 1, 14, 2, hc); P(cx - 8, hy + 1, 16, 2, hc); P(cx - 4, hy, 4, 1, hcL); }
  else {
    P(cx - 6, hy - 2, 12, 1, hc); P(cx - 8, hy - 1, 16, 3, hc); P(cx - 9, hy + 2, 18, 3, hc);
    P(cx - 8, hy + 5, 4, 2, hc); P(cx - 3, hy + 5, 3, 1, hc); P(cx + 2, hy + 5, 6, 2, hc); P(cx + 5, hy + 7, 3, 1, hc);
    const side = st === "long" ? 20 : st === "bob" ? 10 : 4;
    P(cx - 9, hy + 5, 2, side, hc); P(cx + 7, hy + 5, 2, side, hc);
    if (st === "spiky") for (let x = cx - 7; x < cx + 7; x += 3) P(x, hy - 3, 2, 2, hc);
    if (st === "bun") { P(cx - 3, hy - 6, 6, 5, hc); P(cx - 2, hy - 5, 2, 1, hcL); }
    if (st === "pony") P(cx + 6, hy + 2, 3, 2, "#ff7eb6");
    P(cx - 5, hy - 1, 5, 1, hcL); P(cx - 6, hy, 2, 1, hcL);
  }
  if (s.headset) { const H = s.hs; P(cx - 8, hy - 3, 16, 1, H); P(cx - 9, hy - 2, 1, 7, H); P(cx + 8, hy - 2, 1, 7, H); P(cx - 11, hy + 5, 3, 6, H); P(cx + 8, hy + 5, 3, 6, H); P(cx - 10, hy + 6, 1, 4, tint(H, 1.3)); for (let i = 0; i < 6; i++) P(cx - 9 + i, hy + 11 + (i > 3 ? 1 : 0), 1, 1, H); P(cx - 4, hy + 12, 2, 1, "#555"); }
  if (o.sweat) { P(cx + 9, hy + 1, 1, 2, "#9fd8ff"); P(cx + 8, hy + 3, 3, 2, "#9fd8ff"); P(cx + 9, hy + 3, 1, 1, "#e6f6ff"); P(cx - 7, hy - 1, 1, 3, "#8a9ad0"); P(cx - 4, hy - 2, 1, 3, "#8a9ad0"); }
  if (o.mark) { P(cx + 10, hy - 7, 3, 6, "#ffd166"); P(cx + 10, hy, 3, 2, "#ffd166"); P(cx + 11, hy - 7, 1, 6, "#fff3b0"); }
  if (o.noDesk) return;
  const dc = s.desk;
  P(tx, deskY, tw, bot - deskY, dc); P(tx, deskY, tw, 1, tint(dc, 1.15)); P(tx, deskY + 1, tw, 1, tint(dc, 0.85));
  P(cx - 11, deskY + 2, 15, 5, "#f8f4e8"); P(cx - 11, deskY + 2, 15, 1, "#fff"); P(cx - 9, deskY + 3, 9, 1, "#c8c0d8"); P(cx - 9, deskY + 5, 7, 1, "#c8c0d8"); P(cx - 4, deskY + 2, 1, 5, "#e0d0c0");
  P(cx - 15, sy + 3, 3, tb - 4, tcD); P(cx - 13, deskY - 2, 5, 3, sk);
  if (arm !== "up" && arm !== "wave") {
    P(cx + 12, sy + 3, 3, tb - 4, tcD); const px = cx + 8 - (arm === "write" ? f : 0); P(px, deskY - 2, 5, 3, sk);
    P(px + 1, deskY - 7, 1, 5, "#ffd166"); P(px + 1, deskY - 8, 1, 1, "#ff9fb0"); P(px + 1, deskY - 2, 1, 1, "#2a1e2e");
  }
}
// 방 배경(1탄과 같은 그림체)
function paintRoom(c, lay, wall) {
  const w = c.width, h = c.height, g = c.getContext("2d"), P = PF(g);
  for (let y = 0; y < h; y++) P(0, y, w, 1, tint(wall, 0.6 + 0.32 * (y / h)));
  if (lay % 2) for (let x = 3; x < w; x += 6) P(x, 0, 1, h, "#ffffff0e"); else for (let y = 4; y < h; y += 7) for (let x = (y / 7) % 2 ? 4 : 1; x < w; x += 6) P(x, y, 1, 1, "#ffffff16");
  const win = (x, y) => {
    const cur = pick(["#e88fb0", "#8fb8e8", "#9ad0a0", "#e8c870"]);
    P(x - 1, y - 1, 17, 18, "#e8e0d0"); for (let j = 0; j < 16; j++) P(x, y + j, 15, 1, `rgb(${14 + j * 2},${20 + j * 2},${56 + j * 2})`);
    P(x + 10, y + 2, 3, 3, "#ffe9a8"); P(x + 11, y + 2, 2, 2, "#1a2048"); for (const [a, b] of [[2, 2], [6, 1], [4, 5], [8, 4]]) P(x + a, y + b, 1, 1, "#fff9");
    let bx = x; while (bx < x + 15) { const bw = 2 + rint(3), bh = 4 + rint(7); P(bx, y + 16 - bh, Math.min(bw, x + 15 - bx), bh, "#141a32"); for (let yy = y + 17 - bh; yy < y + 15; yy += 2) for (let xx = bx; xx < Math.min(bx + bw, x + 15); xx += 2) if (rnd() < 0.45) P(xx, yy, 1, 1, "#ffd56a"); bx += bw; }
    P(x + 7, y, 1, 16, "#e8e0d0"); P(x, y + 8, 15, 1, "#e8e0d0aa");
    P(x - 3, y - 2, 3, 20, cur); P(x + 15, y - 2, 3, 20, cur); P(x - 3, y - 2, 21, 1, tint(cur, 0.8)); P(x - 2, y, 1, 18, tint(cur, 1.15));
  };
  const poster = (x, y) => {
    const pc = pick(["#ff7eb6", "#5fb8ff", "#ffd166", "#7fe0c0", "#c77dff"]);
    P(x, y, 12, 15, pc); P(x + 1, y + 1, 10, 13, tint(pc, 1.2)); P(x + 3, y + 3, 6, 6, "#fff8"); P(x + 5, y + 2, 2, 8, "#fff"); P(x + 2, y + 5, 8, 2, "#fff"); P(x + 2, y + 11, 8, 1, tint(pc, 0.6)); P(x + 3, y + 13, 6, 1, tint(pc, 0.6));
    P(x - 1, y - 1, 3, 2, "#f4f0d0cc"); P(x + 10, y - 1, 3, 2, "#f4f0d0cc");
  };
  const shelf = (x, y) => {
    P(x, y, 17, 21, "#8a5a3a"); P(x + 1, y + 1, 15, 19, "#5a3a26");
    for (const sy of [y + 9, y + 19]) { P(x + 1, sy, 15, 2, "#a8744c"); let bx = x + 1; while (bx < x + 15) { const bw = 1 + rint(2), bh = 5 + rint(3), c = pick(["#e0607a", "#5b7bd9", "#e0b040", "#3e9e6a", "#c77dff", "#f2f2f2", "#ff9f7a"]); P(bx, sy - bh, Math.min(bw, x + 16 - bx), bh, c); P(bx, sy - bh, Math.min(bw, x + 16 - bx), 1, tint(c, 1.3)); bx += bw + (rnd() < 0.2 ? 1 : 0); } }
    P(x + 11, y + 2, 4, 4, "#4fae5a"); P(x + 12, y + 6, 3, 3, "#c0703d");
  };
  const cork = (x, y) => {
    P(x, y, 17, 13, "#8a5a3a"); P(x + 1, y + 1, 15, 11, "#c89a60"); for (let k = 0; k < 9; k++) P(x + 1 + rint(15), y + 1 + rint(11), 1, 1, "#b0844c");
    [["#fff3b0", 2, 2], ["#ffc6e0", 8, 3], ["#c8f0ff", 4, 7], ["#d8ffc8", 11, 6]].forEach(([c, a, b]) => { P(x + a, y + b, 5, 4, c); P(x + a + 2, y + b, 1, 1, "#e0304a"); P(x + a + 1, y + b + 2, 3, 1, "#0002"); });
  };
  const clock = (x, y) => {
    P(x + 1, y, 7, 9, "#fff"); P(x, y + 1, 9, 7, "#fff"); P(x + 1, y + 1, 7, 7, "#f4f4f8"); P(x + 4, y + 2, 1, 3, "#2a1e2e"); P(x + 4, y + 4, 3, 1, "#2a1e2e"); P(x + 4, y + 4, 1, 1, "#e0304a");
    P(x - 1, y + 12, 11, 10, "#fff"); P(x - 1, y + 12, 11, 3, "#e0304a"); for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) P(x + 1 + i * 2, y + 16 + j * 2, 1, 1, i === 2 && j === 1 ? "#e0304a" : "#9aa0b0");
  };
  const plant = (x, y) => { P(x, y + 6, 7, 6, "#c0703d"); P(x, y + 6, 7, 1, "#e08a50"); P(x + 1, y, 5, 6, "#3e9e6a"); P(x - 1, y + 2, 3, 3, "#2f7e4a"); P(x + 5, y + 1, 3, 3, "#2f7e4a"); P(x + 2, y - 2, 2, 2, "#5fc080"); };
  const lamp = (x, y) => { const rg = g.createRadialGradient(x + 3, y + 4, 1, x + 3, y + 4, 22); rg.addColorStop(0, "rgba(255,226,160,.45)"); rg.addColorStop(1, "rgba(255,226,160,0)"); g.fillStyle = rg; g.fillRect(x - 22, y - 18, 50, 50); P(x, y, 7, 4, "#ffe6a0"); P(x + 1, y - 1, 5, 1, "#fff3c8"); P(x + 3, y + 4, 1, 8, "#5a5666"); };
  const L = [[win, shelf], [poster, clock], [shelf, win], [cork, poster], [clock, cork], [win, poster]][lay % 6];
  L[0](3, 4); L[1](w - 19, 4);
  if (lay % 3 === 0) plant(2, h - 22); else if (lay % 3 === 1) lamp(w - 9, h - 26); else plant(w - 9, h - 22);
  const vg = g.createRadialGradient(w / 2, h * 0.55, w * 0.2, w / 2, h * 0.5, w * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,6,24,.35)"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
}

// 방법 화면 그림 3장
function stepPics() {
  try { const V = stepPicsV(), T = stepPicsDot(); return T.map((t, i) => [V[i][0], t[1]]); } catch (e) { return stepPicsDot(); }
}
function stepPicsDot() {
  const mk = (fn) => { const c = mkCv(40, 40), g = c.getContext("2d"); fn(g, PF(g)); return c.toDataURL(); };
  const sA = stuSpec("bob"), sB = stuSpec("short");
  sA.headset = false; sB.headset = false;
  const room = (P, wall) => { for (let y = 0; y < 40; y++) P(0, y, 40, 1, tint(wall, 0.6 + 0.3 * (y / 40))); };
  const a = mk((g, P) => {
    P(0, 0, 40, 40, "#3a2a20"); P(1, 1, 38, 22, "#8a5a3a"); P(2, 2, 36, 19, "#2f5a44");
    for (let k = 0; k < 14; k++) P(3 + rint(34), 3 + rint(17), 2, 1, "#ffffff12");
    P(4, 4, 3, 3, "#ffffff90"); P(9, 5, 14, 1, "#f2f2e6"); P(9, 4, 6, 1, "#f2f2e6");
    for (let x = 4; x < 34; x += 3) P(x, 12, 2, 1, "#ffd166"); P(4, 9, 3, 3, "#ffd166");
    P(1, 22, 38, 2, "#6a4428");
    P(5, 29, 22, 9, "#fffdf4"); P(5, 29, 2, 9, "#5fb8ff"); P(9, 31, 12, 2, "#2a1e2e"); P(9, 35, 7, 1, "#9a90a8"); P(5, 38, 22, 1, "#0005");
    for (let y = 15; y < 27; y += 2) P(16, y, 1, 1, "#fff"); P(14, 15, 5, 1, "#fff"); P(15, 14, 3, 1, "#fff");
    paintFinger(P, 22, 25);
  });
  const b = mk((g, P) => {
    room(P, "#cfdde6"); paintStu(g, sA, 15, 33, { eye: "sad", mouth: "o", sweat: 1 }, 0, 40, 40);
    qmark(P, 27, 3, 2, "#ffd166"); P(23, 2, 1, 2, "#ffd166"); P(37, 4, 1, 2, "#ffd166");
  });
  const c = mk((g, P) => {
    room(P, "#ecd3dc"); paintStu(g, sB, 15, 33, { eye: "happy", mouth: "open", dy: -1 }, 0, 40, 40);
    g.globalAlpha = 0.35; P(25, 0, 15, 22, "#fff3a0"); g.globalAlpha = 1;
    glyph(P, BULB, 26, 2, 2, { Y: "#ffe066" });
    P(24, 4, 1, 3, "#fff3a0"); P(39, 4, 1, 3, "#fff3a0"); P(32, 0, 1, 1, "#fff3a0");
  });
  return [[`<img src="${a}" alt="">`, "카드를 칠판으로 끌기"], [`<img src="${b}" alt="">`, "순서 틀리면 물음표"], [`<img src="${c}" alt="">`, "다 붙이면 아~!"]];
}

export const GAME = {
  key: "tutoring2", base: "tutoring", jc: "#7fe0c0", n: "풀이 순서 판서", desc: "학생이 보낸 문제! 풀이 카드를 순서대로 칠판에 붙여 이해시켜요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 학생이 모르는 문제를 보내면 아래 <b>풀이 카드</b>를 <b>칠판으로 끌어 올려요</b>.",
    "<b>위에서부터 순서대로</b> 붙여야 해요. 순서가 틀리면 학생 머리 위 <b>물음표가 커져요</b>.",
    "<b>틀린 공식(함정 카드)</b>이 섞여 있어요. 칠판 옆 <b>휴지통</b>에 버리면 보너스! 문제는 갈수록 길어져요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "카드를 칠판으로 끌기"], ["", "순서 틀리면 물음표"], ["", "다 붙이면 아~!"]]; } },
  css: `
.mg-tutoring2 .tg-st{background:#121319!important;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
.mg-tutoring2 .tg-cv{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
.mg-tutoring2 .tg-fx{z-index:6}
.mg-tutoring2 .tg-pw{position:absolute;z-index:1;overflow:hidden;pointer-events:none}
.mg-tutoring2 .tg-pt,.mg-tutoring2 .tg-ept{position:absolute;background-repeat:no-repeat;opacity:0;transform-origin:50% 100%;transition:opacity .25s;filter:drop-shadow(0 3px 6px #0007)}
.mg-tutoring2 .tg-pt.on,.mg-tutoring2 .tg-ept.on{opacity:1}
.mg-tutoring2 .tg-end .tg-e2{z-index:1}
.mg-tutoring2 .mg-msg{top:auto;bottom:calc(28% + 4px);z-index:32}
.mg-tutoring2 .mg-steps img{width:76px;height:65px;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-tutoring2 .tg-hud{position:absolute;left:6px;right:6px;top:3px;z-index:5;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#e8eaf4;pointer-events:none;white-space:nowrap}
.mg-tutoring2 .tg-app{display:flex;align-items:center;gap:4px;background:#7fe0c0;color:#0d3a2e;padding:2px 7px;border-radius:5px;font-weight:900}
.mg-tutoring2 .tg-app i{width:6px;height:6px;border-radius:50%;background:#ff4a5a;box-shadow:0 0 6px #ff4a5a;animation:tgblink2 1s infinite}
.mg-tutoring2 .tg-cls{opacity:.8;font-weight:700}
.mg-tutoring2 .tg-un{margin-left:auto;display:flex;align-items:center;gap:5px}
.mg-tutoring2 .tg-un i{width:62px;height:7px;border-radius:4px;background:#ffffff22;overflow:hidden}
.mg-tutoring2 .tg-un em{display:block;height:100%;width:var(--u,0%);background:linear-gradient(90deg,#ffd166,#7fe0c0);transition:width .3s}
.mg-tutoring2 .tg-un.full em{background:linear-gradient(90deg,#fff3a0,#ffd166);box-shadow:0 0 8px #ffd166}
.mg-tutoring2 .tg-un b{min-width:30px;text-align:right}
.mg-tutoring2 .tg-snm,.mg-tutoring2 .tg-mnm{position:absolute;z-index:5;background:#000b;color:#fff;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px;pointer-events:none;white-space:nowrap}
.mg-tutoring2 .tg-snm small{font-weight:600;opacity:.7;margin-left:3px;font-size:11px}
.mg-tutoring2 .tg-me{position:absolute;z-index:1;overflow:hidden;pointer-events:none;border-radius:2px}
.mg-tutoring2 .tg-av{position:absolute;bottom:0;background-repeat:no-repeat;opacity:0;transition:opacity .4s;transform-origin:50% 100%}
.mg-tutoring2 .tg-av.on{opacity:1}
.mg-tutoring2 .tg-bub{position:absolute;z-index:9;transform:translateX(-50%) scale(.4);opacity:0;background:#fff;color:#2a1e2e;font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:10px 10px 10px 3px;white-space:nowrap;box-shadow:0 2px 0 #0005;pointer-events:none;transition:transform .16s cubic-bezier(.3,1.6,.5,1),opacity .14s}
.mg-tutoring2 .tg-bub.on{opacity:1;transform:translateX(-50%) scale(1)}
.mg-tutoring2 .tg-bub.huh{background:#dfe4ff;color:#3a4270}
.mg-tutoring2 .tg-bub.ok{background:#d8ffe8;color:#0d4a2a}
.mg-tutoring2 .tg-bub.aha{background:#ffd166;color:#3a2400;font-size:17px;font-weight:900;padding:4px 14px;box-shadow:0 3px 0 #0006,0 0 14px #ffd166}
.mg-tutoring2 .tg-bub.ask{background:#fffdf2;box-shadow:0 2px 0 #0005,0 0 0 2px #ff7eb6}
.mg-tutoring2 .tg-say{position:absolute;z-index:9;transform:scale(.4);transform-origin:100% 0;opacity:0;background:#fff;color:#2a1e2e;font-weight:900;font-size:12px;padding:5px 10px;border-radius:12px 3px 12px 12px;white-space:nowrap;box-shadow:0 3px 0 #0006,0 0 0 2px #7fe0c0;pointer-events:none;transition:transform .16s cubic-bezier(.3,1.6,.5,1),opacity .14s}
.mg-tutoring2 .tg-say.on{opacity:1;transform:scale(1)}
.mg-tutoring2 .tg-say.bad{box-shadow:0 3px 0 #0006,0 0 0 2px #ff7a8a;background:#fff0f2;color:#8a2030}
.mg-tutoring2 .tg-bd{position:absolute;z-index:4;pointer-events:none;color:#f2f2e6;display:flex;flex-direction:column;box-sizing:border-box;padding:2px 4px;border-radius:3px;transition:box-shadow .15s,background .15s}
.mg-tutoring2 .tg-bd.hot{box-shadow:0 0 0 2px #ffd166aa,0 0 18px #ffd16655 inset;background:#ffd1660c}
.mg-tutoring2 .tg-q{display:flex;align-items:center;gap:6px;padding:1px 2px 5px;margin-bottom:4px;border-bottom:1px dashed #ffffff38;min-height:22px;white-space:nowrap;overflow:hidden}
.mg-tutoring2 .tg-q em{font-style:normal;font-size:11px;font-weight:900;background:var(--sc,#5fb8ff);color:#10202a;padding:1px 6px;border-radius:5px;flex:0 0 auto}
.mg-tutoring2 .tg-q b{font-size:14.5px;font-weight:900;letter-spacing:.2px;text-shadow:0 0 3px #fff5;clip-path:inset(0 100% 0 0)}
.mg-tutoring2 .tg-q small{font-size:11px;color:#ffe9a0;font-weight:700;overflow:hidden;text-overflow:ellipsis}
.mg-tutoring2 .tg-sls{display:flex;flex-direction:column;gap:3px}
.mg-tutoring2 .tg-sl{display:flex;align-items:center;gap:7px;border-radius:5px;padding:0 5px;position:relative;transition:background .2s}
.mg-tutoring2 .tg-sl i{font-style:normal;font-size:11px;font-weight:900;width:15px;height:15px;border-radius:50%;border:1.5px solid #ffffff55;display:flex;align-items:center;justify-content:center;color:#ffffff99;flex:0 0 auto;box-sizing:border-box}
.mg-tutoring2 .tg-sl span{position:relative;font-size:15px;font-weight:800;white-space:nowrap;text-shadow:0 0 3px #fff6,1px 1px 0 #0003;letter-spacing:.3px;clip-path:inset(-4px 100% -4px 0)}
.mg-tutoring2 .tg-sl span.bad{color:#ffc0c0}
.mg-tutoring2 .tg-sl.x span::after{content:"";position:absolute;left:-3px;right:-3px;top:48%;height:2px;background:#ff5a6a;transform:rotate(-5deg);box-shadow:0 0 4px #ff5a6a}
.mg-tutoring2 .tg-sl.er span{opacity:0;filter:blur(3px);transition:opacity .3s,filter .3s}
.mg-tutoring2 .tg-sl.nx{background:linear-gradient(#ffd166,#ffd166) 26px calc(100% - 3px)/calc(100% - 34px) 1.5px no-repeat}
.mg-tutoring2 .tg-sl.nx i{border-color:#ffd166;color:#ffd166;animation:tgpulse .7s infinite alternate}
.mg-tutoring2 .tg-bd.hot .tg-sl.nx{background-color:#ffd16630}
.mg-tutoring2 .tg-sl.ok i{background:#7fe0c0;border-color:#7fe0c0;color:#0d3a2e}
.mg-tutoring2 .tg-ans{position:absolute;right:58px;bottom:3px;font-size:12.5px;font-weight:900;color:#ffe066;text-shadow:0 0 6px #ffd16688;white-space:nowrap;opacity:0;clip-path:inset(-4px 100% -4px 0)}
.mg-tutoring2 .tg-ans.on{opacity:1}
.mg-tutoring2 .tg-bd.wipe .tg-q,.mg-tutoring2 .tg-bd.wipe .tg-sls,.mg-tutoring2 .tg-bd.wipe .tg-ans{opacity:0;filter:blur(3px);transition:opacity .45s,filter .45s}
.mg-tutoring2 .tg-th{position:absolute;left:8px;right:8px;z-index:3;font-size:11.5px;font-weight:900;color:#4a3020;pointer-events:none;white-space:nowrap}
.mg-tutoring2 .tg-th small{font-weight:700;color:#7a5a40;margin-left:4px;font-size:11px}
.mg-tutoring2 .tg-bin{position:absolute;z-index:5;width:48px;height:51px;background-size:100% 100%;pointer-events:none;transition:transform .15s}
.mg-tutoring2 .tg-bin small{position:absolute;left:50%;top:-13px;transform:translateX(-50%);font-size:11px;font-weight:900;color:#ffb0b8;white-space:nowrap;text-shadow:0 1px 0 #000}
.mg-tutoring2 .tg-bin.open{transform:scale(1.18)}
.mg-tutoring2 .tg-bin.gulp{animation:tggulp .35s}
.mg-tutoring2 .tg-card{position:absolute;z-index:8;box-sizing:border-box;background:#fffdf4;border-radius:6px;padding:3px 6px 3px 11px;box-shadow:0 3px 0 #0005,inset 0 -2px 0 #e8e0c8;touch-action:none;cursor:grab;display:flex;flex-direction:column;justify-content:center;color:#2a1e2e;overflow:hidden;transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}
.mg-tutoring2 .tg-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--tc)}
.mg-tutoring2 .tg-card::after{content:"";position:absolute;right:6px;top:5px;width:8px;height:8px;border-radius:2px;background:radial-gradient(circle,#c8bfa8 1px,transparent 1.5px) 0 0/4px 4px}
.mg-tutoring2 .tg-card b{font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px;line-height:1.2}
.mg-tutoring2 .tg-card small{font-size:11px;color:#8a7f96;font-weight:700;line-height:1.2}
.mg-tutoring2 .tg-card.up{z-index:30;transform:scale(1.08) rotate(-3deg);box-shadow:0 14px 12px #0008,0 0 0 2px #ffd166;cursor:grabbing}
.mg-tutoring2 .tg-card.mv{transition:left .24s cubic-bezier(.3,1.35,.5,1),top .24s cubic-bezier(.3,1.35,.5,1),transform .2s,opacity .2s,box-shadow .2s}
.mg-tutoring2 .tg-card.deal{opacity:0;transform:translateY(40px) rotate(8deg)}
.mg-tutoring2 .tg-card.snap{opacity:0;transform:scale(.5)}
.mg-tutoring2 .tg-card.shk{animation:tgshk .38s}
.mg-tutoring2 .tg-card.tobin{transition:left .32s ease-in,top .32s cubic-bezier(.5,-0.7,.7,1),transform .32s,opacity .2s .14s;transform:scale(.18) rotate(280deg);opacity:0}
.mg-tutoring2 .tg-ban{position:absolute;left:50%;top:40%;z-index:24;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:27px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #1f9a7a,0 0 16px #7fe0c0}
.mg-tutoring2 .tg-ban.on{animation:tgban 1.6s ease-out forwards}
.mg-tutoring2 .tg-ban.gd{text-shadow:0 0 2px #000,0 3px 0 #c9961c,0 0 16px #ffd166}
.mg-tutoring2 .tg-ban.rb{background:linear-gradient(90deg,#ff5f9e,#ffd166,#7CFC9A,#5fb8ff,#c77dff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 3px 0 #000c) drop-shadow(0 0 8px #ffb03b);font-size:31px}
.mg-tutoring2 .tg-ban small{display:block;font-size:13px;color:#fff;-webkit-text-fill-color:#fff}
.mg-tutoring2 .tg-tut{position:absolute;z-index:20;display:flex;pointer-events:none;transition:opacity .3s}
.mg-tutoring2 .tg-tut.off{opacity:0;visibility:hidden}
.mg-tutoring2 .tg-tc{pointer-events:auto;flex:1;background:#fffdf8;color:#2a1e2e;border-radius:12px;padding:7px 10px 6px;box-shadow:0 4px 0 #0006,0 0 0 2px #7fe0c0;font-size:12.5px;line-height:1.42;text-align:center;font-weight:600;word-break:keep-all;display:flex;flex-direction:column;justify-content:center}
.mg-tutoring2 .tg-tut.pop .tg-tc{animation:tgpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-tutoring2 .tg-tc em{font-style:normal;align-self:center;background:#1f9a7a;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-tutoring2 .tg-tc p{margin:0}
.mg-tutoring2 .tg-tc b.rd{color:#c0392b}.mg-tutoring2 .tg-tc b.gd{color:#a87000}.mg-tutoring2 .tg-tc b.tg-g{color:#1f8a6a}
.mg-tutoring2 .tg-tb{margin-top:4px;display:flex;justify-content:center}
.mg-tutoring2 .tg-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-tutoring2 .tg-go{background:linear-gradient(#5fd8b0,#1f9a7a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 22px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d5a44!important;animation:tggo .5s infinite alternate}
.mg-tutoring2 .tg-hand{position:absolute;left:0;top:0;z-index:33;width:39px;height:39px;margin:-4px 0 0 -14px;background-size:100% 100%;image-rendering:pixelated;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-tutoring2 .tg-hand.on{display:block;animation:tgdrag 1.6s infinite}
.mg-tutoring2 .tg-gh{position:absolute;left:0;top:0;z-index:32;pointer-events:none;display:none;box-sizing:border-box;background:#fffdf4;border-radius:6px;box-shadow:0 0 0 2px #ffd166;opacity:.55;color:#2a1e2e;font-weight:900;font-size:14px;padding-left:11px;align-items:center;white-space:nowrap;overflow:hidden}
.mg-tutoring2 .tg-gh.on{display:flex;animation:tgghost 1.6s infinite}
.mg-tutoring2 .tg-end{position:absolute;inset:0;z-index:28;display:none;background:#0c0e16}
.mg-tutoring2 .tg-end.on{display:block;animation:tgfade .4s}
.mg-tutoring2 .tg-end canvas{position:absolute;left:0;top:0}
.mg-tutoring2 .tg-esc{position:absolute;left:0;right:0;top:14px;text-align:center;color:#fff;pointer-events:none;opacity:0;transition:opacity .3s}
.mg-tutoring2 .tg-esc.on{opacity:1}
.mg-tutoring2 .tg-esc small{display:inline-block;font-size:11.5px;font-weight:800;background:#000a;padding:2px 9px;border-radius:7px;color:#e8eaf4}
.mg-tutoring2 .tg-esc b{display:block;font-size:30px;font-weight:900;margin-top:4px;text-shadow:0 3px 0 #000a,0 0 2px #000}
.mg-tutoring2 .tg-esc b s{color:#b8bccc;font-size:22px;text-decoration-color:#ff5a6a;text-decoration-thickness:3px}
.mg-tutoring2 .tg-esc b em{font-style:normal;color:#ffe066;display:inline-block}
.mg-tutoring2 .tg-esc b em.pop{animation:tgpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-tutoring2 .tg-esc i{display:inline-block;font-style:normal;margin-left:6px;font-size:14px;font-weight:900;color:#fff;background:#e0304a;padding:2px 8px;border-radius:8px;transform:rotate(-8deg) scale(0);transition:transform .25s cubic-bezier(.3,1.8,.5,1);vertical-align:middle}
.mg-tutoring2 .tg-esc i.on{transform:rotate(-8deg) scale(1)}
.mg-tutoring2 .tg-esc i.dn{background:#6a7090}
.mg-tutoring2 .tg-esc p{margin:6px 12px 0;font-size:12.5px;font-weight:700;color:#d8ffe8;text-shadow:0 1px 0 #000;opacity:0;transition:opacity .4s}
.mg-tutoring2 .tg-esc p.on{opacity:1}
@keyframes tgpulse{to{box-shadow:0 0 6px #ffd166;transform:scale(1.12)}}
@keyframes tgblink2{50%{opacity:.25}}
@keyframes tgshk{0%,100%{transform:none}20%{transform:translateX(-7px) rotate(-3deg)}45%{transform:translateX(6px) rotate(2deg)}70%{transform:translateX(-3px)}}
@keyframes tggulp{0%{transform:scale(1.18)}40%{transform:scale(.88,1.12)}70%{transform:scale(1.08,.94)}100%{transform:none}}
@keyframes tgpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes tggo{to{transform:scale(1.08)}}
@keyframes tgfade{from{opacity:0}}
@keyframes tgdrag{0%{transform:translate(var(--x0),var(--y0));opacity:0}12%{transform:translate(var(--x0),var(--y0)) scale(.86);opacity:1}68%{transform:translate(var(--x1),var(--y1)) scale(.86);opacity:1}84%{transform:translate(var(--x1),var(--y1));opacity:1}100%{transform:translate(var(--x1),var(--y1));opacity:0}}
@keyframes tgghost{0%{transform:translate(var(--g0),var(--h0));opacity:0}12%{transform:translate(var(--g0),var(--h0)) rotate(-3deg);opacity:.55}68%{transform:translate(var(--g1),var(--h1)) rotate(-3deg);opacity:.55}84%,100%{transform:translate(var(--g1),var(--h1)) scale(.6);opacity:0}}
@keyframes tgban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.18) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(2deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@media (prefers-reduced-motion:reduce){.mg-tutoring2 .tg-ban.on{animation-duration:.01s}.mg-tutoring2 .tg-go,.mg-tutoring2 .tg-sl.nx i{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const T = Math.round(40 * (1 + (clamp(ez, 1, 1.5) - 1) * 0.6)), dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "tutoring2", "풀이 순서 판서", "tg-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="tg-cv"></canvas><div class="tg-me"><div class="tg-av"></div></div><canvas class="tg-cv tg-fx"></canvas>
      <div class="tg-hud"><span class="tg-app"><i></i>과외온</span><span class="tg-cls">1:1 · 화면 공유 중</span><span class="tg-un">이해도<i><em></em></i><b>0%</b></span></div>
      <div class="tg-snm"></div><b class="tg-mnm">나 · 선생님</b><div class="tg-bub"></div><div class="tg-say"></div>
      <div class="tg-bd"><div class="tg-q"><em></em><b></b><small></small></div><div class="tg-sls"></div><div class="tg-ans"></div></div>
      <div class="tg-th">풀이 카드<small>위에서부터 순서대로 칠판에 끌어 올려요</small></div><div class="tg-bin"><small>함정은 여기</small></div>
      <div class="tg-ban"></div>
      <div class="tg-tut off"><div class="tg-tc"><em>리허설</em><p></p><div class="tg-tb"></div></div></div><div class="tg-gh"></div><div class="tg-hand"></div>
      <div class="tg-end"><canvas></canvas><div class="tg-ept"></div><canvas class="tg-e2"></canvas><div class="tg-esc"></div></div><div class="tg-pw"><div class="tg-pt"></div></div>`);
    const st = F.stage, $ = (s) => st.querySelector(s);
    const cv = $(".tg-cv"), g0 = cv.getContext("2d"), cvF = $(".tg-fx"), gF = cvF.getContext("2d"), endEl = $(".tg-end"), ecv = endEl.querySelector("canvas"), gE = ecv.getContext("2d"), escEl = $(".tg-esc");
    const unEl = $(".tg-un"), unBar = $(".tg-un em"), unTx = $(".tg-un b"), snm = $(".tg-snm"), mnm = $(".tg-mnm"), bubEl = $(".tg-bub"), sayEl = $(".tg-say");
    const bdEl = $(".tg-bd"), qEm = $(".tg-q em"), qB = $(".tg-q b"), qS = $(".tg-q small"), slsEl = $(".tg-sls"), ansEl = $(".tg-ans"), thEl = $(".tg-th"), binEl = $(".tg-bin");
    const ban = $(".tg-ban"), tutEl = $(".tg-tut"), tutP = $(".tg-tc p"), tutB = $(".tg-tb"), hand = $(".tg-hand"), ghost = $(".tg-gh"), meBox = $(".tg-me"), avEl = $(".tg-av");
    // 크기: 논리 폭 112칸 안팎을 정수배로
    const sw = st.clientWidth || 336, sh = st.clientHeight || 600;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const ecv2 = endEl.querySelector(".tg-e2"), gE2 = ecv2.getContext("2d");
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cv, cvF, ecv, ecv2]) { c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    const hudH = 8, topY = hudH + 2, topH = clamp(Math.round(LH * 0.26), 42, 56);
    const STU_R = { x: 2, y: topY, w: Math.round(LW * 0.6), h: topH };
    const ME_R = { x: STU_R.x + STU_R.w + 2, y: topY, w: LW - STU_R.w - 6, h: topH };
    const trayH = clamp(Math.round(LH * 0.28), 46, 60), TR_Y = LH - trayH;
    const BD_R = { x: 2, y: topY + topH + 3, w: LW - 4, h: TR_Y - 3 - (topY + topH + 3) };
    const css = (el, r, pad = 0) => Object.assign(el.style, { left: r.x * K + pad + "px", top: r.y * K + pad + "px", width: r.w * K - pad * 2 + "px", height: r.h * K - pad * 2 + "px" });
    css(meBox, ME_R);
    const bdBox = { x: (BD_R.x + 3) * K, y: (BD_R.y + 3) * K, w: (BD_R.w - 6) * K, h: (BD_R.h - 8) * K };
    Object.assign(bdEl.style, { left: bdBox.x + "px", top: bdBox.y + "px", width: bdBox.w + "px", height: bdBox.h + "px" });
    Object.assign(snm.style, { left: STU_R.x * K + 4 + "px", top: (STU_R.y + STU_R.h) * K - 19 + "px" });
    Object.assign(mnm.style, { left: ME_R.x * K + 4 + "px", top: (ME_R.y + ME_R.h) * K - 19 + "px" });
    Object.assign(bubEl.style, { left: (STU_R.x + STU_R.w * 0.42) * K + "px", top: STU_R.y * K + 4 + "px" });
    Object.assign(sayEl.style, { right: "6px", top: (ME_R.y + ME_R.h) * K - 4 + "px" });
    const trayTop = TR_Y * K;
    Object.assign(thEl.style, { top: trayTop + 5 + "px" });
    const BIN = { w: 48, h: 51 }; BIN.x = sw - BIN.w - 8; BIN.y = trayTop - BIN.h + 4;
    Object.assign(binEl.style, { left: BIN.x + "px", top: BIN.y + "px" });
    const binImg = (() => { try { return [binSVG(false), binSVG(true)]; } catch (e) { return [binURL(false), binURL(true)]; } })(); binEl.style.backgroundImage = `url(${binImg[0]})`;
    // 카드 칸
    const gapC = 6, cw = Math.floor((sw - 12 - gapC) / 2), areaTop = trayTop + 24, ch = clamp(Math.floor((sh - 5 - areaTop - gapC * 2) / 3), 30, 44);
    const homeOf = (i) => ({ x: 6 + (i % 2) * (cw + gapC), y: areaTop + Math.floor(i / 2) * (ch + gapC) });
    Object.assign(ghost.style, { width: cw + "px", height: ch + "px" });

    // ── 학생 한 명 ──
    const name = pick(NAMES), sp = stuSpec(pick(["short", "long", "bob", "spiky", "buzz", "bun", "pony"])), lay = rint(6), wall = pick(WALLS);
    snm.innerHTML = `${name}<small>중2</small>`;
    const stuBg = mkCv(STU_R.w, STU_R.h); paintRoom(stuBg, lay, wall);
    // 학생 그림(몸 그림 시트 3x2): 위 236px만 화상 화면에
    const STU_POOL = ["c002", "c009", "c010", "c016", "c021", "c022", "c024", "c025", "c028", "c030", "c034", "c039", "c047", "c051", "c052", "c053", "c054", "c055", "c057", "c063", "c064", "c069", "c079", "c083", "c084", "c085", "pM5", "pM8", "pF3", "pF6"]; // 학생 역할: 캐주얼 차림만
    const stuKey = pick(STU_POOL.filter((k) => k !== opts.avatar && k !== "c018")), stuPr = { ok: false, im: new Image() };
    const pwEl = st.querySelector(".tg-pw"), ptEl = st.querySelector(".tg-pt"), eptEl = st.querySelector(".tg-ept");
    css(pwEl, STU_R);
    const PVH = 236, sxOff = Math.round(STU_R.w * 0.42), dkRel = STU_R.h - 8;
    const ptH = Math.round((dkRel - 1) * K), ptW = Math.round(ptH * 240 / PVH);
    Object.assign(ptEl.style, { width: ptW + "px", height: ptH + "px", left: Math.round(sxOff * K - ptW / 2) + "px", top: dkRel * K - ptH + "px", backgroundSize: `300% ${(1080 / PVH * 100).toFixed(2)}%` });
    stuPr.im.onload = () => { try { const c = mkCv(1, 1), cg2 = c.getContext("2d"), k2 = stuPr.im.width / 720; cg2.drawImage(stuPr.im, 105 * k2, 300 * k2, 30 * k2, 30 * k2, 0, 0, 1, 1); const d = cg2.getImageData(0, 0, 1, 1).data; if (d[3] > 200) stuPr.tc = "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join(""); } catch (e) {} stuPr.ok = true; ptEl.style.backgroundImage = eptEl.style.backgroundImage = `url("${stuPr.im.src}")`; ptEl.classList.add("on"); };
    stuPr.im.src = "img/body/" + stuKey + ".webp";
    let ptX = "", ptT = "", eptX = "";
    const posOf = (ex, vh) => { const i = EXI[ex]; return `${(i % 3) * 50}% ${i >= 3 ? (540 / (1080 - vh) * 100).toFixed(3) : 0}%`; };
    const S = { q: 0, qPop: 0, nod: 0, aha: 0, bulb: 0, talk: 0, blink: 2, wf: 0, wT: 0, write: 0, shake: 0, blush: 0 };

    // 내 캐릭터(몸 그림 시트 3x2)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    {
      const bw = ME_R.w * K, w = Math.round(bw * 1.3), h = Math.round(w * 260 / 240);
      Object.assign(avEl.style, { width: w + "px", height: h + "px", left: Math.round((bw - w) / 2) + "px", backgroundSize: "300% 415.38%" });
      const im = new Image();
      im.onload = () => { art = true; avEl.style.backgroundImage = `url("${im.src}")`; avEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    let meX = "", meT = "";
    const ME = { smile: 0, shock: 0, talk: 0 };

    // ── 고정 배경 ──
    const BG = mkCv(LW, LH);
    {
      const b = BG.getContext("2d"), P = PF(b);
      P(0, 0, LW, LH, "#121319"); P(0, 0, LW, hudH, "#1c1d27"); P(0, hudH, LW, 1, "#2a2c38");
      // 내 방
      const { x, y, w, h } = ME_R;
      for (let j = 0; j < h; j++) P(x, y + j, w, 1, tint("#6a5a7a", 0.75 + 0.35 * (j / h)));
      for (let k = x + 2; k < x + w; k += 5) P(k, y, 1, h, "#ffffff08");
      P(x + 2, y + 5, 12, 22, "#7a5236"); P(x + 3, y + 6, 10, 20, "#4a3022");
      for (const sy of [y + 13, y + 20, y + 26]) { P(x + 3, sy, 10, 1, "#a8744c"); let bx = x + 3; while (bx < x + 13) { const bw2 = 1 + rint(2), bh = 4 + rint(3), c = pick(["#e0607a", "#5b7bd9", "#e0b040", "#3e9e6a", "#c77dff", "#f2f2f2"]); P(bx, sy - bh, Math.min(bw2, x + 13 - bx), bh, c); bx += bw2; } }
      for (let k = 0; k < w; k++) { const yy = y + 2 + Math.round(Math.abs(Math.sin((k / w) * Math.PI * 2)) * 2); P(x + k, yy, 1, 1, "#3a2a3a"); if (k % 5 === 2) P(x + k, yy + 1, 1, 2, ["#ffd166", "#ff7eb6", "#7fe0c0"][(k / 5 | 0) % 3]); }
      const rg = b.createRadialGradient(x + w - 6, y + 20, 2, x + w - 6, y + 20, 30); rg.addColorStop(0, "rgba(255,220,150,.35)"); rg.addColorStop(1, "rgba(255,220,150,0)"); b.fillStyle = rg; b.fillRect(x, y, w, h);
      // 칠판(화면 공유)
      const B = BD_R; P(B.x, B.y, B.w, B.h, "#8a5a3a"); P(B.x, B.y, B.w, 1, "#b07a4a"); P(B.x + 2, B.y + 2, B.w - 4, B.h - 6, "#2f5a44");
      for (let k = 0; k < 70; k++) P(B.x + 3 + rint(B.w - 6), B.y + 3 + rint(B.h - 9), 1 + rint(3), 1, "#ffffff0d");
      for (let k = 0; k < 6; k++) { const yy = B.y + 6 + rint(B.h - 14); P(B.x + 4 + rint(B.w - 30), yy, 8 + rint(16), 1, "#ffffff08"); }
      P(B.x + 2, B.y + B.h - 4, B.w - 4, 2, "#6a4428"); P(B.x + 2, B.y + B.h - 2, B.w - 4, 1, "#4a2e1a");
      P(B.x + 8, B.y + B.h - 5, 5, 1, "#fff"); P(B.x + 15, B.y + B.h - 5, 4, 1, "#ffd166"); P(B.x + 21, B.y + B.h - 5, 4, 1, "#7fd0ff");
      // 책상(카드 놓는 곳): 나무 + 종이 매트
      for (let j = TR_Y; j < LH; j++) P(0, j, LW, 1, tint("#c89a68", 1.04 - 0.16 * ((j - TR_Y) / trayH)));
      for (let k = 0; k < 18; k++) { const yy = TR_Y + 2 + rint(trayH - 3); P(rint(LW - 20), yy, 10 + rint(30), 1, "#a87a4c55"); }
      P(0, TR_Y, LW, 1, "#e8c090"); P(0, TR_Y + 1, LW, 1, "#8a6040");
      P(2, TR_Y + 7, LW - 4, trayH - 8, "#00000014");
    }

    // ── 실제 방 그림 + 벡터 칠판·책상: 불러오면 고해상도로 한 번 그려 둔다 ──
    const RIMG = {}; const rimg = (k) => { if (!RIMG[k]) { const q = { ok: false, bad: false, im: new Image() }; q.im.onload = () => (q.ok = true); q.im.onerror = () => (q.bad = true); q.im.src = "img/bg/" + k + ".webp"; RIMG[k] = q; } return RIMG[k]; };
    const ROOMF = { home: [0.25, 0.4], online: [0.75, 0.35], studyst: [0.5, 0.4], library: [0.5, 0.35], airbnb: [0.6, 0.4], parents: [0.55, 0.4] };
    const stuRoom = pick(["home", "online", "studyst", "airbnb", "parents"]); rimg(stuRoom); rimg("home");
    const coverH = (k, w, h, dim) => { const q = rimg(k), c = mkCv(Math.round(w * KS), Math.round(h * KS)), b = c.getContext("2d"), im = q.im, iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(c.width / iw, c.height / ih), sw2 = c.width / sc, sh2 = c.height / sc, [fx, fy] = ROOMF[k] || [0.5, 0.4]; b.drawImage(im, (iw - sw2) * fx, (ih - sh2) * fy, sw2, sh2, 0, 0, c.width, c.height); b.fillStyle = dim; b.fillRect(0, 0, c.width, c.height); const vg = b.createRadialGradient(c.width / 2, c.height * 0.55, c.width * 0.2, c.width / 2, c.height * 0.5, c.width * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,6,24,.4)"); b.fillStyle = vg; b.fillRect(0, 0, c.width, c.height); return c; };
    let BGH = null, stuBgH = null;
    const buildBGH = () => {
      const c = mkCv(Math.round(LW * KS), Math.round(LH * KS)), b = c.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0);
      b.fillStyle = "#121319"; b.fillRect(0, 0, LW, LH); b.fillStyle = "#1c1d27"; b.fillRect(0, 0, LW, hudH); b.fillStyle = "#2a2c38"; b.fillRect(0, hudH, LW, 0.6);
      const { x, y, w, h } = ME_R;
      if (rimg("home").ok) b.drawImage(coverH("home", w, h, "rgba(40,24,50,.25)"), x, y, w, h);
      for (let k = 0; k <= w; k += 4) { const yy = y + 2.4 + Math.abs(Math.sin((k / w) * Math.PI * 2)) * 2; b.shadowColor = ["#ffd166", "#ff7eb6", "#7fe0c0"][(k / 4 | 0) % 3]; b.shadowBlur = 3 * KS; b.beginPath(); b.arc(x + k, yy + 1, 0.8, 0, 6.3); b.fillStyle = b.shadowColor; b.fill(); }
      b.shadowBlur = 0; b.shadowColor = "transparent";
      const B = BD_R;
      b.save(); b.shadowColor = "rgba(0,0,0,.5)"; b.shadowBlur = 3 * KS; rrV(b, B.x, B.y, B.w, B.h, 2.4); b.fillStyle = lgV(b, 0, B.y, 0, B.y + B.h, ["#b07a4a", "#8a5a3a", "#6a4428"]); b.fill(); b.restore();
      rrV(b, B.x + 2, B.y + 2, B.w - 4, B.h - 6, 1.4); b.fillStyle = lgV(b, B.x, B.y, B.x + B.w, B.y + B.h, ["#3a6a52", "#2f5a44", "#264a3a"]); b.fill();
      b.save(); rrV(b, B.x + 2, B.y + 2, B.w - 4, B.h - 6, 1.4); b.clip(); b.strokeStyle = "#ffffff0e"; b.lineWidth = 0.6; for (let k = 0; k < 40; k++) { const xx = B.x + 4 + ((k * 37) % (B.w - 8)), yy = B.y + 6 + ((k * 23) % (B.h - 12)); b.beginPath(); b.moveTo(xx, yy); b.quadraticCurveTo(xx + 4, yy - 1, xx + 9, yy + 0.4); b.stroke(); } b.restore();
      rrV(b, B.x + 2, B.y + B.h - 4.4, B.w - 4, 2.4, 1); b.fillStyle = "#5a3a22"; b.fill();
      [["#ffffff", 8, 5], ["#ffd166", 15, 4], ["#7fd0ff", 21, 4]].forEach(([c2, dx, l]) => { rrV(b, B.x + dx, B.y + B.h - 5.4, l, 1.2, 0.6); b.fillStyle = c2; b.fill(); });
      // 책상(카드 놓는 곳): 나무결 + 종이 매트
      b.fillStyle = lgV(b, 0, TR_Y, 0, LH, ["#d8aa78", "#c89a68", "#a87a4c"]); b.fillRect(0, TR_Y, LW, LH - TR_Y);
      b.strokeStyle = "#8a5a3022"; b.lineWidth = 0.5; for (let k = 0; k < 14; k++) { const yy = TR_Y + 3 + ((k * 11) % (trayH - 4)); b.beginPath(); b.moveTo(0, yy); b.bezierCurveTo(LW * 0.3, yy - 1.4, LW * 0.6, yy + 1.4, LW, yy); b.stroke(); }
      b.fillStyle = "#f0c898"; b.fillRect(0, TR_Y, LW, 0.8); b.fillStyle = "#7a5030"; b.fillRect(0, TR_Y + 0.8, LW, 0.6);
      rrV(b, 2, TR_Y + 7, LW - 4, trayH - 8, 2); b.fillStyle = "#00000014"; b.fill();
      return c;
    };

    // ── 상태 ──  tut: 0 리허설 전 / 1 첫 카드 / 2 함정 버리기 / 3 마지막 카드 / 4 안내 / -1 본게임
    let tut = 0, tutT = 0;
    let over = false, done = false, raf = 0, last = 0, clk = 0, el = 0, tm = null, lastAct = 0;
    let probs = [], pi = 0, cur = null, placed = 0, cards = [], slots = [], trans = false, wiping = false, drag = null;
    let good = 0, bad = 0, trapHit = 0, binned = 0, binBad = 0, solvedN = 0, stepsDone = 0, probMiss = 0, allDone = false, leftT = 0, und = 0, undShow = -1;
    const writes = [], erasers = [], dust = [], conf = [];
    let endOn = false, endT = 0, endInfo = null;
    const LOG = dbg ? [] : { push() {}, join: () => "" };

    // ── 소리 ──
    const chalk = () => { for (let k = 0; k < 5; k++) noise(0.035, 4200 + rnd() * 1800, 0.045, k * 0.075, 4); };
    const eraseS = () => noise(0.42, 900, 0.07, 0, 0.6);
    const pling = () => { tone(1318, 0.1, "sine", 0.1); tone(1760, 0.16, "sine", 0.1, 0, 0.12); };
    const ahaS = () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "triangle", 0.08, 0, i * 0.065)); tone(380, 0.4, "sine", 0.05, 420, 0.32); };
    const huh = () => { tone(300, 0.12, "triangle", 0.07, 180); tone(480, 0.16, "triangle", 0.06, -150, 0.12); };
    const crumple = () => { noise(0.12, 2500, 0.09, 0, 1); noise(0.08, 1800, 0.07, 0.1, 1); tone(180, 0.08, "sine", 0.08, -60, 0.22); };
    const redpen = () => tone(820, 0.14, "sine", 0.06, 520);

    // ── 말풍선·배너 ──
    let sayT = 0, bubT = 0;
    const say = (text, cls = "", sec = 1.3) => { sayEl.textContent = text; sayEl.className = "tg-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; ME.talk = Math.min(sec, 1.1); };
    const bub = (text, cls = "", sec = 1.4) => { bubEl.textContent = text; bubEl.className = "tg-bub " + cls; void bubEl.offsetWidth; bubEl.classList.add("on"); bubT = sec; S.talk = Math.min(sec, 1); };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "tg-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const stageRect = () => st.getBoundingClientRect();
    const relRect = (e) => { const r = e.getBoundingClientRect(), s = stageRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
    const stuHead = () => [(STU_R.x + STU_R.w * 0.42) * K, (STU_R.y + STU_R.h * 0.45) * K];

    // ── 칠판·카드 만들기 ──
    // 분필로 쓰기: 왼쪽부터 10칸씩 드러낸다(매 프레임 직접 갱신)
    const clipAt = (e, p) => { e.style.clipPath = p >= 1 ? "inset(-6px -6px -6px -4px)" : `inset(-6px ${Math.round((1 - Math.ceil(p * 10) / 10) * 100)}% -6px -4px)`; };
    const writeIn = (span, text, cls = "", dur = 0.42) => { span.textContent = text; span.className = cls; clipAt(span, 0); writes.push({ el: span, t: 0, dur }); chalk(); S.write = Math.max(S.write, 0.9); };
    const markNext = () => slots.forEach((s, i) => s.el.classList.toggle("nx", i === placed && !trans));
    const updUnd = () => {
      if (!cur) return; und = clamp((placed / cur.steps.length) * 100 - S.q * 9, 0, 100); if (trans && placed >= cur.steps.length) und = 100;
      const v = Math.round(und); if (v !== undShow) { undShow = v; unBar.style.setProperty("--u", v + "%"); unTx.textContent = v + "%"; unEl.classList.toggle("full", v >= 100); }
    };
    const load = (p) => { LOG.push("load " + p.q);
      cur = p; placed = 0; probMiss = 0; trans = false; wiping = false; S.q = 0; S.bulb = 0; S.aha = 0;
      bdEl.classList.remove("wipe"); ansEl.className = "tg-ans"; ansEl.textContent = ""; ansEl.style.clipPath = ""; writes.length = 0;
      const [sn, sc] = SUBJ[p.sub]; qEm.textContent = sn; bdEl.style.setProperty("--sc", sc); qS.textContent = p.qs;
      writeIn(qB, p.q, "", 0.5);
      slsEl.innerHTML = ""; const n = p.steps.length, avail = bdBox.h - 34;
      const slh = clamp(Math.floor((avail - (n - 1) * 3) / Math.max(n, tut >= 0 ? 4 : n)), 20, 32);
      slots = p.steps.map((_, i) => { const d = document.createElement("div"); d.className = "tg-sl"; d.style.height = slh + "px"; d.innerHTML = `<i>${i + 1}</i><span></span>`; slsEl.appendChild(d); return { el: d, sp: d.querySelector("span") }; });
      markNext();
      // 카드: 단계 + 함정, 섞어서 나눠 주기
      cards.forEach((c) => c.el.remove()); cards = [];
      const list = shuffle([...p.steps.map((s, i) => ({ t: s[0], l: s[1], line: s[2], idx: i, trap: false })), ...p.traps.map((s) => ({ t: s[0], l: s[1], idx: -1, trap: true }))]);
      list.forEach((d, i) => {
        const c = { ...d, home: homeOf(i), gone: false, x: 0, y: 0 };
        c.el = document.createElement("div"); c.el.className = "tg-card deal"; c.el.style.setProperty("--tc", sc); c.el.style.width = cw + "px"; c.el.style.height = ch + "px";
        c.el.innerHTML = `<b></b><small></small>`; c.el.querySelector("b").textContent = d.t; c.el.querySelector("small").textContent = d.l;
        st.appendChild(c.el); setPos(c, c.home.x, c.home.y); bindCard(c); cards.push(c);
        setTimeout(() => { if (!c.gone) { c.el.classList.add("mv"); c.el.classList.remove("deal"); tone(700 + i * 90, 0.04, "triangle", 0.05); setTimeout(() => c.el.classList.remove("mv"), 300); } }, 260 + i * 90);
      });
      pling(); bub(p.ask, "ask", 2); F.sc.textContent = tut >= 0 ? "리허설" : `문제 ${pi + 1}/${probs.length}`;
      lastAct = el; updUnd();
    };
    const setPos = (c, x, y) => { c.x = x; c.y = y; c.el.style.left = x + "px"; c.el.style.top = y + "px"; };
    const goHome = (c, shake) => {
      c.el.classList.remove("up"); c.el.classList.add("mv"); setPos(c, c.home.x, c.home.y);
      if (shake) { c.el.classList.remove("shk"); void c.el.offsetWidth; c.el.classList.add("shk"); }
      setTimeout(() => c.el.classList.remove("mv", "shk"), 400);
    };
    const zoneOf = (c) => {
      const cx = c.x + cw / 2, cy = c.y + ch / 2;
      if (cx > BIN.x - 20 && cx < BIN.x + BIN.w + 26 && cy > BIN.y - 24 && cy < BIN.y + BIN.h + 18) return "bin";
      if (cy < trayTop + 2) return "board";
      return null;
    };
    const hot = (z) => { bdEl.classList.toggle("hot", z === "board"); const o = z === "bin"; if (binEl.classList.contains("open") !== o) { binEl.classList.toggle("open", o); binEl.style.backgroundImage = `url(${binImg[o ? 1 : 0]})`; } };
    function bindCard(c) {
      const e0 = c.el;
      e0.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (over || c.gone || drag || tut === 0 || tut === 4) return;
        if (trans) { F.msg("다음 문제 준비 중이에요!"); return; }
        const s = stageRect(); drag = { c, id: e.pointerId, ox: e.clientX - s.left - c.x, oy: e.clientY - s.top - c.y, sx: e.clientX, sy: e.clientY, mv: false };
        try { e0.setPointerCapture(e.pointerId); } catch (er) {}
        e0.classList.remove("mv", "shk"); e0.classList.add("up"); SFX.tok(); vib(8);
      });
      e0.addEventListener("pointermove", (e) => {
        if (!drag || drag.c !== c || e.pointerId !== drag.id) return; const s = stageRect();
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.mv = true;
        setPos(c, clamp(e.clientX - s.left - drag.ox, -cw * 0.3, sw - cw * 0.7), clamp(e.clientY - s.top - drag.oy, 0, sh - ch)); hot(zoneOf(c));
      });
      const up = (e) => {
        if (!drag || drag.c !== c || (e && e.pointerId !== drag.id)) return; const d = drag; drag = null; hot(null);
        if (!d.mv) { goHome(c); F.msg("카드를 잡은 채로 칠판까지 끌어 올려요!"); return; }
        drop(c, zoneOf(c));
      };
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((k) => e0.addEventListener(k, up));
    }

    // ── 놓기 판정 ──
    const expect = () => {
      if (!cur) return [null, null];
      if (tut === 2) return [cards.find((c) => c.trap && !c.gone), "bin"];
      return [cards.find((c) => !c.gone && !c.trap && c.idx === placed), "board"];
    };
    const TUTMSG = { 1: "첫 단계 카드(x = 5 − 2)를 칠판으로!", 2: "함정 카드(x = 5 + 2)를 휴지통으로!", 3: "남은 카드(x = 3)를 칠판으로!" };
    const drop = (c, zone) => {
      if (over || c.gone) return;
      if (!zone) { goHome(c); return; }
      if (trans || wiping) { goHome(c); F.msg("잠깐! 칠판 정리 중이에요"); return; }
      // 리허설 1단계: 첫 카드를 붙인 뒤 2단계로 넘어가기 전(0.9초)엔 더 못 붙인다(함정 카드가 저절로 버려져 2단계에서 막히던 문제)
      if (tut === 1 && placed >= 1) { goHome(c); return; }
      if (tut >= 1 && tut <= 3) { const [ec, ez2] = expect(); if (c !== ec || zone !== ez2) { goHome(c, true); F.msg(TUTMSG[tut]); SFX.tok(); return; } }
      lastAct = el;
      if (zone === "bin") return toBin(c);
      if (c.trap) return trapOn(c);
      if (c.idx === placed) return correct(c);
      wrongOrder(c);
    };
    const flyTo = (c, x, y) => { c.el.classList.remove("up"); c.el.classList.add("mv", "snap"); setPos(c, x, y); setTimeout(() => c.el.remove(), 280); };
    const correct = (c) => { LOG.push("ok " + placed + " " + c.t);
      const s = slots[placed], r = relRect(s.el); c.gone = true; placed++; good++; stepsDone++;
      flyTo(c, r.x + 16, r.y + r.h / 2 - ch / 2);
      setTimeout(() => { if (over && !endInfo) return; writeIn(s.sp, c.t); s.el.classList.add("ok"); }, 150);
      S.q = Math.max(0, S.q - 1); S.nod = 0.9; S.shake = 0; ME.smile = 1; ME.shock = 0;
      say(c.line, "", 1.3); setTimeout(() => { if (!over && !trans) bub(pick(NOD), "ok", 0.9); }, 380);
      F.hit([r.x + r.w * 0.5, r.y + r.h / 2], 10, "#7fe0c0"); SFX.snap();
      markNext(); updUnd();
      if (placed >= cur.steps.length) { trans = true; markNext(); setTimeout(solved, 560); }
      if (tut === 1) setTimeout(() => { if (tut === 1) tutNext(2); }, 900);
    };
    const wrongOrder = (c) => { LOG.push("wrong " + placed + " " + c.t);
      bad++; probMiss++; S.q = Math.min(3, S.q + 1); S.qPop = 0.45; S.shake = 0.4;
      goHome(c, true); F.miss([c.x + cw / 2, c.y]); huh();
      bub(pick(WRONG_SAY), "huh", 1.5); ME.shock = 0.8; ME.smile = 0; say("앗, 순서가…", "bad", 1);
      F.msg(`순서가 달라요! ${placed + 1}번 칸에 올 단계를 찾아요`); updUnd();
    };
    const trapOn = (c) => { LOG.push("trap " + placed + " " + c.t);
      const s = slots[placed], r = relRect(s.el); c.gone = true; trapHit++; probMiss++; wiping = true;
      flyTo(c, r.x + 16, r.y + r.h / 2 - ch / 2); markNext();
      setTimeout(() => writeIn(s.sp, c.t, "bad"), 150);
      setTimeout(() => {
        if (done) return; s.el.classList.add("x"); S.q = Math.min(3, S.q + 2); S.qPop = 0.5; S.shake = 0.5;
        F.miss([r.x + r.w * 0.5, r.y + r.h / 2]); huh(); bub(pick(TRAP_SAY), "huh", 1.6); ME.shock = 1; say("앗, 틀린 공식이었다!", "bad", 1.1);
        F.msg("함정 카드! 틀린 공식은 휴지통으로 버려요"); updUnd();
      }, 620);
      setTimeout(() => { if (done) return; s.el.classList.add("er"); erasers.push({ x0: r.x / K, x1: (r.x + r.w) / K, y: (r.y + r.h / 2) / K, t: 0, dur: 0.38 }); eraseS(); }, 1000);
      setTimeout(() => { if (done) return; s.sp.textContent = ""; s.sp.className = ""; s.sp.style.clipPath = ""; s.el.classList.remove("x", "er"); wiping = false; markNext(); }, 1420);
    };
    const binCenter = () => [BIN.x + BIN.w / 2, BIN.y + BIN.h / 2];
    const gulp = () => { binEl.classList.remove("gulp"); void binEl.offsetWidth; binEl.classList.add("gulp"); };
    const toBin = (c) => { LOG.push("bin " + c.t);
      if (!c.trap) { binBad++; probMiss++; goHome(c, true); F.miss([c.x + cw / 2, c.y]); F.msg("그건 맞는 풀이예요! 버리면 안 돼요"); ME.shock = 0.6; return; }
      c.gone = true; binned++; c.el.classList.remove("up"); c.el.classList.add("tobin"); setPos(c, BIN.x + BIN.w / 2 - cw / 2, BIN.y + 8 - ch / 2); setTimeout(() => c.el.remove(), 380);
      setTimeout(() => { if (done) return; crumple(); gulp(); F.hit(binCenter(), 5, "#ffd166"); F.float([BIN.x + BIN.w / 2, BIN.y - 8], "함정 버림!"); }, 260);
      say("이건 틀린 공식~ 버리자!", "", 1.1); ME.smile = 0.8;
      if (tut === 2) setTimeout(() => { if (tut === 2) tutNext(3); }, 800);
    };
    const solved = () => { LOG.push("solved " + pi);
      if (over && !endInfo) return;
      solvedN++; S.bulb = 1; S.aha = 1.8; S.q = 0; updUnd();
      bub("아~!", "aha", 1.5); ahaS(); vib([20, 30, 40]); ME.smile = 1.6;
      writeIn(ansEl, "답 " + cur.ans, "tg-ans on", 0.45);
      const perfect = probMiss === 0;
      if (tut < 0) banner(perfect ? "완벽한 설명!<small>한 번도 안 헷갈렸어요</small>" : "이해 완료!<small>전구가 켜졌어요</small>", perfect ? "rb" : "gd");
      F.burst(stuHead(), "#ffd166", 14);
      // 남은 함정 카드는 휴지통으로 날아간다(보너스 없음)
      cards.filter((c) => !c.gone).forEach((c, i) => setTimeout(() => { if (c.gone) return; c.gone = true; c.el.classList.add("tobin"); setPos(c, BIN.x + BIN.w / 2 - cw / 2, BIN.y + 8 - ch / 2); setTimeout(() => { c.el.remove(); gulp(); }, 380); }, 380 + i * 120));
      if (tut === 3) { setTimeout(() => { if (tut === 3) tutNext(4); }, 1500); return; }
      if (tut >= 0) return;
      if (pi + 1 < probs.length) {
        setTimeout(() => { if (over) return; eraseBoard(); }, 1500);
        setTimeout(() => { if (over) return; pi++; load(probs[pi]); }, 2080);
      } else {
        allDone = true; leftT = tm ? tm.left() : 0; if (tm) tm.stop(); setTimeout(end, 1300);
      }
    };
    const eraseBoard = () => {
      bdEl.classList.add("wipe"); eraseS();
      erasers.push({ full: true, t: 0, dur: 0.5 });
    };

    // ── 그리기 ──
    let g = g0; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const drawStu = (tmm) => {
      const { x, y, w, h } = STU_R, cx = x + Math.round(w * 0.42), deskY = y + h - 8;
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      if (!stuBgH && rimg(stuRoom).ok) stuBgH = coverH(stuRoom, w, h, "rgba(30,20,50,.2)");
      if (stuBgH) { g.imageSmoothingEnabled = true; g.drawImage(stuBgH, x, y, w, h); g.imageSmoothingEnabled = false; } else g.drawImage(stuBg, x, y);
      // 전구 켜지면 방이 환해짐
      if (S.bulb > 0) { const rg = g.createRadialGradient(cx + 18, y + 10, 2, cx + 18, y + 10, 40); rg.addColorStop(0, "rgba(255,240,150,.45)"); rg.addColorStop(1, "rgba(255,240,150,0)"); g.fillStyle = rg; g.fillRect(x, y, w, h); }
      const o = { f: S.wf };
      if (S.aha > 0) { const big = S.aha > 1.1; o.eye = big ? "wide" : "happy"; o.mouth = big ? "open" : "smile"; o.dy = big ? -1 : 0; if (big) o.arm = "wave"; o.blush = !big; }
      else if (S.q >= 2) { o.eye = "sad"; o.mouth = Math.floor(tmm * 3) % 2 ? "o" : "sad"; o.sweat = 1; o.dy = 1; }
      else if (S.q === 1) { o.eye = S.blink < 0.12 ? "close" : "n"; o.mouth = "o"; }
      else if (S.nod > 0) { o.dy = Math.floor(S.nod * 9) % 2 ? 2 : 0; o.eye = "happy"; o.mouth = "smile"; }
      else { o.eye = S.blink < 0.12 ? "close" : "n"; o.mouth = S.talk > 0 && Math.floor(tmm * 8) % 2 ? "open" : "n"; if (S.write > 0) { o.arm = "write"; o.eye = "down"; o.dy = 1; } }
      const jx = S.shake > 0 ? (Math.floor(tmm * 30) % 2 ? 1 : -1) : 0;
      if (stuPr.ok) {
        o.noBody = 1;
        const ex = S.aha > 1.1 ? "surprised" : S.aha > 0 ? "smile" : S.q >= 2 ? "sad" : S.q === 1 ? "angry" : S.nod > 0 ? "smile" : S.blush > 0 ? "blush" : "neutral";
        if (ex !== ptX) { ptX = ex; ptEl.style.backgroundPosition = posOf(ex, PVH); }
        let ty = Math.sin(tmm * 1.5) * 0.8, rot = 0;
        if (S.aha > 1.1) ty = -4; else if (S.q >= 2) { ty = 3; rot = -3; } else if (S.q === 1) rot = -2; else if (S.nod > 0) ty = Math.floor(S.nod * 9) % 2 ? 4 : 0; else if (S.talk > 0) ty = -Math.abs(Math.sin(tmm * 8)) * 1.5; else if (S.write > 0) { ty = 3; rot = 1; }
        const tf = `translate(${jx * K}px,${ty.toFixed(1)}px) rotate(${rot}deg)`;
        if (tf !== ptT) { ptT = tf; ptEl.style.transform = tf; }
      }
      if (stuPr.ok) deskV(g, x, w, deskY, y + h, sp.desk); else paintStu(g, sp, cx + jx, deskY, o, x, w, y + h);
      if (!stuPr.ok) stuTop(tmm);
      g.restore();
      const bc = S.talk > 0 ? "#7CFC9A" : S.bulb > 0 ? "#ffd166" : "#2c2f3c";
      P(x - 1, y - 1, w + 2, 1, bc); P(x - 1, y + h, w + 2, 1, bc); P(x - 1, y, 1, h, bc); P(x + w, y, 1, h, bc);
      if (bc !== "#2c2f3c") { P(x, y, w, 1, bc); P(x, y + h - 1, w, 1, bc); P(x, y, 1, h, bc); P(x + w - 1, y, 1, h, bc); }
    };
    // 물음표·전구(그림 학생이면 위 캔버스에)
    const stuTop = (tmm) => {
      const { x, y, w, h } = STU_R, cx = x + Math.round(w * 0.42), deskY = y + h - 8;
      const hy = deskY - 29;
      // 물음표: 헷갈릴수록 커진다
      if (S.q > 0 && S.aha <= 0) {
        const sc = S.q + (S.qPop > 0 ? 1 : 0), qw = 5 * sc, qh = 7 * sc, bob = Math.round(Math.sin(tmm * 5) * 1);
        const qx = Math.min(x + w - qw - 2, cx + 11), qy = Math.max(y + 1, hy - 2 - qh + 6) + bob;
        qmarkV(g, qx, qy, sc, S.q >= 3 ? "#ff9f7a" : "#ffd166");
        if (S.q >= 2) { qmarkV(g, cx - 15 - 5 * (sc - 1), qy + 4, Math.max(1, sc - 1), "#c8d0ff"); }
      }
      // 전구
      if (S.bulb > 0) {
        const bx = cx + 12, by = Math.max(y + 1, hy - 8), s2 = 2, pulse = Math.floor(tmm * 6) % 2;
        bulbV(g, bx, by, s2, pulse, pulse);
      }
    };
    const render = (tmm) => {
      g = g0; g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = false;
      if (!BGH && (rimg("home").ok || rimg("home").bad)) BGH = buildBGH();
      if (BGH) { g.imageSmoothingEnabled = true; g.drawImage(BGH, 0, 0, LW, LH); g.imageSmoothingEnabled = false; } else g.drawImage(BG, 0, 0);
      drawStu(tmm);
      const r = ME_R, bc = ME.talk > 0 ? "#7CFC9A" : "#2c2f3c";
      P(r.x - 1, r.y - 1, r.w + 2, 1, bc); P(r.x - 1, r.y + r.h, r.w + 2, 1, bc); P(r.x - 1, r.y, 1, r.h, bc); P(r.x + r.w, r.y, 1, r.h, bc);
      // 효과층: 분필, 지우개, 가루, 색종이
      g = gF; g.setTransform(KS, 0, 0, KS, 0, 0); g.clearRect(0, 0, LW, LH);
      if (stuPr.ok) { g.save(); g.beginPath(); g.rect(STU_R.x, STU_R.y, STU_R.w, STU_R.h); g.clip(); stuTop(tmm); g.restore(); }
      const s0 = stageRect();
      for (const w0 of writes) {
        const p = clamp(w0.t / w0.dur, 0, 1), rr = w0.el.getBoundingClientRect();
        const x0 = (rr.left - s0.left) / K, ww = rr.width / K, yy = Math.round((rr.top - s0.top + rr.height * 0.8) / K), xx = Math.round(x0 + ww * p + Math.sin(w0.t * 60) * 0.6);
        g.save(); g.translate(xx + 1, yy - 3); g.rotate(0.35); rrV(g, -1, -3.4, 2, 6, 0.8); g.fillStyle = lgV(g, -1, 0, 1, 0, ["#ffffff", "#cfcfc2"]); g.fill(); g.restore(); g.beginPath(); g.ellipse(xx + 3.4, yy - 6.4, 2.2, 2.6, 0.4, 0, 6.3); g.fillStyle = "#ffe0cc"; g.fill(); g.strokeStyle = "#e8b898"; g.lineWidth = 0.4; g.stroke();
        if (rnd() < 0.6) dust.push({ x: xx + rnd() * 2, y: yy, vx: (rnd() - 0.5) * 6, vy: 4 + rnd() * 8, l: 0.5 + rnd() * 0.4, c: "#f4f4ec" });
      }
      for (const e of erasers) {
        const p = clamp(e.t / e.dur, 0, 1);
        let ex, ey;
        if (e.full) { const B = BD_R; ex = B.x + 4 + p * (B.w - 18); ey = B.y + 8 + Math.abs(Math.sin(p * Math.PI * 3)) * (B.h - 22); }
        else { ex = e.x0 + p * (e.x1 - e.x0 - 10); ey = e.y - 3; }
        ex = Math.round(ex); ey = Math.round(ey);
        g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 1.5 * KS; rrV(g, ex, ey, 11, 3.4, [1.4, 1.4, 0, 0]); g.fillStyle = lgV(g, 0, ey, 0, ey + 3.4, ["#d09a6a", "#a8703e"]); g.fill(); g.restore(); rrV(g, ex, ey + 3.2, 11, 3.6, [0, 0, 1, 1]); g.fillStyle = "#4a4a58"; g.fill(); g.fillStyle = "#d8d8e0"; g.fillRect(ex + 0.6, ey + 6.4, 9.8, 0.6);
        if (rnd() < 0.8) dust.push({ x: ex + rnd() * 11, y: ey + 6, vx: (rnd() - 0.5) * 10, vy: 6 + rnd() * 10, l: 0.6, c: "#e8e8e0" });
      }
      for (const d of dust) { g.globalAlpha = clamp(d.l * 1.6, 0, 0.8); P(Math.round(d.x), Math.round(d.y), 1, 1, d.c); } g.globalAlpha = 1;
      conf.forEach((c) => P(Math.round(c.x), Math.round(c.y), 1, c.k % 2 ? 2 : 1, c.c));
      // 내 캐릭터 표정
      if (art) {
        const ex = ME.shock > 0 ? "surprised" : ME.smile > 0 ? "smile" : S.q >= 2 ? "sad" : ME.talk > 0 ? "smile" : "neutral";
        if (ex !== meX) { meX = ex; const i = EXI[ex]; avEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 65.85 : 0}%`; }
        let tf = "";
        if (ME.shock > 0) tf = `translateX(${Math.floor(tmm * 30) % 2 ? 2 : -2}px)`;
        else if (ME.talk > 0) tf = `translateY(${Math.floor(tmm * 7) % 2 ? -2 : 0}px)`;
        else tf = `translateY(${(Math.sin(tmm * 1.6) * 1).toFixed(1)}px)`;
        if (tf !== meT) { meT = tf; avEl.style.transform = tf; }
      }
    };

    // ── 손가락 안내: 카드 → 칠판 칸(또는 휴지통) ──
    hand.style.backgroundImage = `url(${fingerURL()})`;
    let handKey = "";
    const handOff = () => { if (handKey) { handKey = ""; hand.className = "tg-hand"; ghost.className = "tg-gh"; } };
    const handShow = () => {
      const [c, z] = expect(); if (!c || !z || c.gone) return handOff();
      let tx, ty;
      if (z === "bin") { tx = BIN.x + BIN.w / 2; ty = BIN.y + BIN.h / 2; }
      else { const s = slots[placed]; if (!s) return handOff(); const r = relRect(s.el); tx = r.x + 60; ty = r.y + r.h / 2; }
      const fx = c.home.x + cw * 0.5, fy = c.home.y + ch * 0.55, key = [Math.round(fx), Math.round(fy), Math.round(tx), Math.round(ty)].join(",");
      if (key === handKey) return; handKey = key;
      hand.style.setProperty("--x0", fx + "px"); hand.style.setProperty("--y0", fy + "px"); hand.style.setProperty("--x1", tx + "px"); hand.style.setProperty("--y1", ty + "px");
      ghost.textContent = c.t;
      ghost.style.setProperty("--g0", c.home.x + "px"); ghost.style.setProperty("--h0", c.home.y + "px"); ghost.style.setProperty("--g1", tx - cw * 0.5 + "px"); ghost.style.setProperty("--h1", ty - ch * 0.55 + "px");
      hand.className = "tg-hand"; ghost.className = "tg-gh"; void hand.offsetWidth; hand.className = "tg-hand on"; ghost.className = "tg-gh on";
    };

    // ── 리허설 ──
    const SKIP = `<button class="tg-skip" data-skip>건너뛰기</button>`;
    const placeTut = (tall) => { const h = tall ? 118 : 92; Object.assign(tutEl.style, { left: bdBox.x + 4 + "px", width: bdBox.w - (tall ? 8 : 60) + "px", top: bdBox.y + bdBox.h - h + "px", height: h + "px" }); };
    const tutNext = (n) => {
      tut = n; tutT = 0; handOff(); tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop"); placeTut(n === 4);
      if (n === 1) { load(TUT_P); tutP.innerHTML = `학생이 문제를 보냈어요! 아래 카드 중 <b class="tg-g">첫 단계</b>를<br><b>칠판으로 끌어 올려</b> 붙여요.`; tutB.innerHTML = SKIP; say("리허설 먼저 해 볼게요!", "", 1.6); }
      else if (n === 2) { tutP.innerHTML = `<b class="rd">x = 5 + 2</b> 는 틀린 공식(함정)!<br>칠판 옆 <b>휴지통</b>으로 끌어 버려요.`; tutB.innerHTML = SKIP; }
      else if (n === 3) { tutP.innerHTML = `마지막 단계를 붙이면<br>학생이 <b class="gd">아~!</b> 하고 이해해요.`; tutB.innerHTML = SKIP; }
      else if (n === 4) {
        say("좋아요, 수업 시작!", "", 1.6); ME.smile = 1.2;
        tutP.innerHTML = `완벽해요! <b class="rd">순서가 틀리면</b> 물음표가 커지고,<br>함정을 칠판에 붙이면 지우느라 시간이 가요.<br>문제는 <b class="gd">갈수록 길어져요!</b>`;
        tutB.innerHTML = `<button class="tg-go" data-go>수업 시작!</button>`;
      }
    };
    const mkSet = () => {
      const s = shuffle(["m", "e", "s"]);
      const one = (lv, sub) => shuffle(PROBS.filter((p) => p.lv === lv && p.sub === sub))[0];
      return [one(1, s[0]), one(2, s[1]), one(2, s[2]), one(3, s[0] === s[2] ? s[1] : s[0])];
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; handOff(); tutEl.classList.add("off");
      if (drag) { drag = null; hot(null); }
      writes.length = 0; erasers.length = 0;
      good = 0; bad = 0; trapHit = 0; binned = 0; binBad = 0; solvedN = 0; stepsDone = 0; allDone = false; el = 0; lastAct = 0;
      probs = mkSet(); pi = 0; load(probs[0]);
      banner("수업 시작!<small>풀이 카드를 순서대로!</small>"); SFX.go?.(); say("자, 같이 풀어 볼까?", "", 1.4);
      tm = timer(T, F.bar, end);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });

    // ── 매 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clk += dt;
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) startGame(); else tutNext(1); }
        if (tut >= 1 && tut <= 3 && tutT > 0.9 && !drag && !trans && !wiping) handShow(); else if (drag || tut === 4) handOff();
      } else if (!over) {
        el += dt;
        // 손가락: 첫 문제 처음 5초, 그 뒤엔 4.5초 넘게 가만히 있을 때만
        const idle = el - lastAct;
        if (!drag && !trans && !wiping && ((pi === 0 && el < 5) || idle > 4.5)) handShow(); else handOff();
        updUnd();
      }
      // 상태 갱신
      for (const k of ["qPop", "nod", "talk", "write", "shake"]) if (S[k] > 0) S[k] -= dt;
      if (S.aha > 0) S.aha -= dt;
      S.blink -= dt; if (S.blink < 0) S.blink = 1.8 + rnd() * 2.5;
      S.wT -= dt; if (S.wT < 0) { S.wT = 0.18; S.wf = 1 - S.wf; }
      for (const k of ["smile", "shock", "talk"]) if (ME[k] > 0) ME[k] -= dt;
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      if (bubT > 0) { bubT -= dt; if (bubT <= 0) bubEl.classList.remove("on"); }
      for (let i = writes.length - 1; i >= 0; i--) { const w = writes[i]; w.t += dt; clipAt(w.el, w.t / w.dur); if (w.t >= w.dur) writes.splice(i, 1); }
      for (let i = erasers.length - 1; i >= 0; i--) { erasers[i].t += dt; if (erasers[i].t >= erasers[i].dur) erasers.splice(i, 1); }
      for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.l -= dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.l <= 0) dust.splice(i, 1); }
      for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.y += c.vy * dt; c.x += c.vx * dt; c.k = (c.k + 1) % 8; if (c.y > LH) conf.splice(i, 1); }
      if (endOn) { endT += dt; drawEnd(); }
      else render(clk);
      raf = requestAnimationFrame(loop);
    };

    // ── 끝: 수업 끝 → 학생이 시험지를 들어 보이고, 빨간 동그라미 → 점수 오름 ──
    const end = () => {
      if (over) return; over = true; handOff(); if (tm && !allDone) tm.stop();
      if (drag) { const c = drag.c; drag = null; hot(null); goHome(c); }
      const total = probs.reduce((a, p) => a + p.steps.length, 0) || 1;
      const prog = clamp(stepsDone / total, 0, 1);
      const den = good + binned + bad + trapHit * 1.5 + binBad;
      const acc = den > 0 ? clamp((good + binned) / den, 0, 1) : 0;
      const quick = allDone ? clamp(0.35 + (2.2 * leftT) / T, 0, 1) : 0;
      const score = clamp(prog * (0.1 + 0.75 * Math.pow(acc, 1.5)) + 0.15 * quick * acc, 0, 1);
      const before = 52 + rint(16), up = score >= 0.3 ? Math.max(4, Math.round(score * 36)) : rint(3), after = Math.min(100, before + up);
      const okN = clamp(Math.round(score * 5 + 0.2), 0, 5);
      endInfo = { score, prog, acc, quick, before, after, okN, marks: [false, false, false, false, false], counted: false, stamped: false };
      cards.forEach((c) => { if (!c.gone) { c.gone = true; c.el.classList.add("mv", "deal"); } });
      banner(allDone ? "수업 끝!<small>오늘 문제 다 풀었어요</small>" : "수업 끝!<small>시간이 다 됐어요</small>", allDone ? "gd" : "");
      bub(allDone ? "쌤 감사합니다!!" : "감사합니다~", "ok", 1.3); say("오늘도 수고했어!", "", 1.3); ME.smile = 2;
      [784, 988, 1175].forEach((f, i) => tone(f, 0.14, "triangle", 0.08, 0, i * 0.1));
      setTimeout(() => {
        if (done) return;
        // 끝 장면 준비: 학생 방 크게
        endBg = mkCv(Math.ceil(LW / 2), Math.ceil(LH / 2)); paintRoom(endBg, lay, wall);
        endOn = true; endT = 0; endEl.classList.add("on"); pling(); vib([15, 40, 15]);
        escEl.innerHTML = `<small>과외온 · ${name} 학생이 사진을 보냈어요</small><b><s>${before}</s> → <em>${before}</em>점<i class="${up >= 4 ? "" : "dn"}">${up >= 4 ? "UP!" : "그대로"}</i></b><p></p>`;
        setTimeout(() => escEl.classList.add("on"), 250);
      }, 1300);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        finish(score, `푼 문제 <b>${solvedN}/${probs.length}</b> · 바른 순서 ${good}번 · 함정 ${trapHit ? trapHit + "번 걸림" : "안 걸림"}${binned ? ` · 함정 버림 ${binned}` : ""}`, "", [["풀이 완성", prog], ["순서 정확도", acc], ["시간 여유", quick]]);
      }, 1300 + 4700);
    };
    let endBg = null, endBgH = null;
    const eS = mkCv(60, 64), eSg = eS.getContext("2d");
    const drawEnd = () => {
      const g2 = gE, P2 = PF(g2), I = endInfo, t = endT;
      g2.setTransform(KS, 0, 0, KS, 0, 0); gE2.setTransform(KS, 0, 0, KS, 0, 0);
      g2.imageSmoothingEnabled = false;
      if (rimg(stuRoom).ok) { if (!endBgH) endBgH = coverH(stuRoom, LW, LH, "rgba(30,20,50,.15)"); g2.imageSmoothingEnabled = true; g2.drawImage(endBgH, 0, 0, LW, LH); g2.imageSmoothingEnabled = false; } else g2.drawImage(endBg, 0, 0, LW, LH);
      g2.fillStyle = "rgba(10,8,24,.35)"; g2.fillRect(0, 0, LW, 50);
      // 학생(2배)
      const good2 = I.score >= 0.5, cnt = t > 2.5;
      const eArt = stuPr.ok, P3 = eArt ? PF(gE2) : P2;
      if (eArt) gE2.clearRect(0, 0, LW, LH);
      eSg.clearRect(0, 0, 60, 64);
      const o = { noDesk: true, f: 0 };
      if (cnt) { o.eye = good2 ? "happy" : "sad"; o.mouth = good2 ? (Math.floor(t * 6) % 2 ? "open" : "smile") : "sad"; o.blush = good2; o.dy = good2 ? Math.floor(t * 5) % 2 ? -1 : 0 : 1; }
      else { o.eye = t % 2.2 < 0.12 ? "close" : "n"; o.mouth = "smile"; }
      const sx = Math.round(LW / 2 - 60), sy = -2 + Math.round(LH * 0.1);
      if (!eArt) { paintStu(eSg, sp, 30, 62, o, 0, 60, 64); g2.drawImage(eS, sx, sy, 120, 128); }
      else {
        const ex = cnt ? (good2 ? "smile" : "sad") : "neutral";
        if (ex !== eptX) { eptX = ex; const eh = Math.round(118 * K), ew = Math.round(eh * 240 / 312); Object.assign(eptEl.style, { width: ew + "px", height: eh + "px", left: Math.round(LW * K / 2 - ew / 2) + "px", top: (sy + 124) * K - eh + "px", backgroundSize: "300% 346.15%", backgroundPosition: posOf(ex, 312) }); eptEl.classList.add("on"); }
        eptEl.style.transform = `translateY(${cnt && good2 ? (Math.floor(t * 5) % 2 ? -K : 0) : cnt ? K : 0}px)`;
      }
      // 책상(벡터)
      const dkY = sy + 124; g2.fillStyle = lgV(g2, 0, dkY, 0, LH, [tint(sp.desk, 1.15), sp.desk, tint(sp.desk, 0.8)]); g2.fillRect(0, dkY, LW, LH - dkY); g2.fillStyle = tint(sp.desk, 1.3); g2.fillRect(0, dkY, LW, 0.8);
      // 시험지 들어 올리기(벡터)
      const pr = clamp(t / 0.5, 0, 1), eb = 1 + 2.7 * Math.pow(pr - 1, 3) + 1.7 * Math.pow(pr - 1, 2);
      const pw = 58, ph = 66, px = Math.round(LW / 2 - pw / 2), py0 = sy + 100, py = LH + 4 + (py0 - LH - 4) * eb;
      const G3 = eArt ? gE2 : g2;
      const sk = eArt ? "#f6dcc8" : sp.skin, tcC = eArt && stuPr.tc ? stuPr.tc : sp.tc, skD = tint(sk, 0.86), tcD = tint(tcC, 0.78);
      for (const hx of [px - 4, px + pw - 3]) { rrV(G3, hx + 1, py + 16, 6, LH, 2.4); G3.fillStyle = lgV(G3, hx, 0, hx + 7, 0, [tcC, tcD]); G3.fill(); }
      G3.save(); G3.translate(px + pw / 2, py + ph / 2); G3.rotate(-0.025); G3.translate(-pw / 2, -ph / 2);
      G3.shadowColor = "rgba(0,0,0,.4)"; G3.shadowBlur = 4 * KS; G3.shadowOffsetY = 1.5 * KS; rrV(G3, 0, 0, pw, ph, 1.2); G3.fillStyle = "#fffdf6"; G3.fill(); G3.shadowColor = "transparent"; G3.shadowBlur = 0; G3.shadowOffsetY = 0;
      G3.fillStyle = "#3a3448"; G3.font = "900 3.6px sans-serif"; G3.textBaseline = "top"; G3.fillText("수학 단원평가", 4, 3.4); G3.fillStyle = "#9a96a8"; G3.font = "700 2.6px sans-serif"; G3.fillText("2학년 " + name, 4, 8); G3.strokeStyle = "#c8c4d4"; G3.lineWidth = 0.4; G3.beginPath(); G3.moveTo(30, 5); G3.lineTo(52, 5); G3.moveTo(30, 8); G3.lineTo(46, 8); G3.stroke();
      G3.strokeStyle = "#e0d8c8"; G3.lineWidth = 0.5; G3.beginPath(); G3.moveTo(3, 11.4); G3.lineTo(pw - 3, 11.4); G3.stroke();
      if (I.counted) { rrV(G3, pw - 17, 1.6, 14, 8.6, 1.4); G3.fillStyle = "#ffecec"; G3.fill(); G3.save(); G3.translate(pw - 10, 6); G3.rotate(-0.12); G3.fillStyle = "#e0304a"; G3.font = "900 5.4px sans-serif"; G3.textAlign = "center"; G3.textBaseline = "middle"; G3.fillText(String(I.after), 0, 0.4); G3.restore(); }
      for (let i = 0; i < 5; i++) {
        const ry = 15 + i * 10;
        G3.fillStyle = "#5a5468"; G3.font = "800 3.4px sans-serif"; G3.textBaseline = "top"; G3.textAlign = "left"; G3.fillText(String(i + 1) + ".", 4.4, ry);
        G3.strokeStyle = "#9a96a8"; G3.lineWidth = 0.55; G3.beginPath(); G3.moveTo(14, ry + 0.6); G3.lineTo(14 + 26 + ((i * 7) % 12), ry + 0.6); G3.stroke(); G3.strokeStyle = "#c8c4d4"; G3.beginPath(); G3.moveTo(14, ry + 3.4); G3.lineTo(14 + 16 + ((i * 5) % 10), ry + 3.4); G3.stroke();
        const t0 = 0.8 + i * 0.33;
        if (t > t0) {
          if (!I.marks[i]) { I.marks[i] = true; if (i < I.okN) redpen(); else tone(260, 0.1, "square", 0.04, -60); }
          const p = clamp((t - t0) / 0.22, 0, 1), cx2 = 7, cy2 = ry + 2;
          G3.strokeStyle = "#e0304a"; G3.lineWidth = 1; G3.lineCap = "round";
          if (i < I.okN) { G3.beginPath(); G3.ellipse(cx2, cy2, 5, 4, -0.2, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2.1); G3.stroke(); }
          else { G3.beginPath(); G3.moveTo(cx2 - 4, cy2 + 4); G3.lineTo(cx2 - 4 + 9 * p, cy2 + 4 - 9 * p); G3.stroke(); }
        }
      }
      G3.restore();
      // 손(시험지 양옆을 잡음)
      for (const hx of [px - 4, px + pw - 3]) { G3.beginPath(); G3.ellipse(hx + 3.5, py + 14.4, 3.8, 4.8, 0, 0, 6.3); G3.fillStyle = lgV(G3, hx, py + 10, hx + 7, py + 19, [sk, skD]); G3.fill(); G3.strokeStyle = skD; G3.lineWidth = 0.4; G3.beginPath(); const fx = hx + (hx < px ? 5.4 : 1.6); for (let k = 0; k < 3; k++) { G3.moveTo(fx - 1, py + 12 + k * 1.6); G3.lineTo(fx + 1, py + 12 + k * 1.6); } G3.stroke(); }
      // 점수 올라가기
      if (t > 2.45 && !I.counted) {
        const p = clamp((t - 2.45) / 0.7, 0, 1), v = Math.round(I.before + (I.after - I.before) * p), em = escEl.querySelector("em");
        if (em && em.textContent !== String(v)) { em.textContent = v; SFX.tick?.(); }
        if (p >= 1) {
          I.counted = true; em.classList.add("pop"); SFX.stamp(); vib(25); escEl.querySelector("i").classList.add("on");
          const pEl = escEl.querySelector("p"); pEl.textContent = I.score >= 0.7 ? `"쌤 덕분에 처음으로 이해했어요! 다음 주도 부탁드려요ㅠㅠ"` : I.score >= 0.4 ? `"조금 올랐어요! 다음엔 더 올릴게요 ㅎㅎ"` : `"쌤… 아직 좀 헷갈려요ㅠ 다음 주에 다시 알려 주세요"`; pEl.classList.add("on");
          if (I.score >= 0.6) { F.burst([sw / 2, sh * 0.12], "#ffd166", 16); setTimeout(() => SFX.ding(4), 200); for (let k = 0; k < (RM() ? 20 : 70); k++) conf.push({ x: rnd() * LW, y: -rnd() * 30, vy: 22 + rnd() * 25, vx: (rnd() - 0.5) * 10, c: pick(["#ffd166", "#ff7eb6", "#7fe0c0", "#7fd0ff", "#c77dff"]), k: rint(4) }); }
        }
      }
      conf.forEach((c) => P3(Math.round(c.x), Math.round(c.y), 1, c.k % 2 ? 2 : 1, c.c));
    };

    if (dbg) dbg.tutoring2 = {
      st: () => ({ el: +el.toFixed(2), tut, pi, placed, n: cur ? cur.steps.length : 0, good, bad, trapHit, binned, solvedN, stepsDone, und: Math.round(und), trans, wiping, over, art, endOn }),
      tut: () => tut, start: startGame, drop, cards: () => cards, log: () => LOG.join(" | "), slots: () => slots.map((s) => s.el.className + ":" + s.sp.textContent).join(" , "),
      tutDo: () => { if (tut >= 1 && tut <= 3) { if (trans || wiping) return; const [c, z] = expect(); if (c && z) drop(c, z); } else if (tut === 4) startGame(); },
      auto: (badMode) => {
        if (tut !== -1 || over || trans || wiping || drag) return;
        const live = cards.filter((c) => !c.gone);
        if (badMode) { if (rnd() > 0.3) return; const c = pick(live); if (c) drop(c, rnd() < 0.85 ? "board" : "bin"); return; }
        const tr = live.find((c) => c.trap); if (tr && rnd() < 0.5) return drop(tr, "bin");
        const [c] = expect(); if (c) drop(c, "board");
      },
    };
    updUnd(); render(0);
    raf = requestAnimationFrame(loop);
  },
};
