// 미니게임 3탄(pr3): 파티룸 "층간소음 민원 막기"
// 160x270 논리 좌표 건물 단면. 캔버스는 기기 해상도로 그린다: 방 안은 실제 배경 그림, 손님·이웃은 캐릭터 그림(표정), 소품은 벡터. 그림을 못 불러오면 도트로 대체. 위층 파티룸 3칸(A·B·C), 옆집·아래층엔 자는 이웃.
// 방을 톡 → "조금만 낮춰 주세요" 문자(볼륨 한 칸 ↓). 열린 창문을 톡 → 닫기. 너무 낮추면 손님 흥(별점)이 떨어진다.
// 사건: 생일 케이크 떼창(막으면 별점 뚝, 다른 방을 미리 낮춰 둔다), 이웃의 쿵쿵, 112 신고 → 경찰차 도착 전에 전부 조용히.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, H = 270, RW = 75, RH = 76, T = 30;
// 파티룸 자리: 스피커가 왼쪽(L)/오른쪽(R)
const GEO = [{ x: 3, y: 24, side: "L" }, { x: 82, y: 24, side: "R" }, { x: 3, y: 104, side: "L" }];
// 이웃 방: 0 옆집(B 아래, C 옆) · 1 아래층(C 아래)
const NBG = [{ x: 82, y: 104, w: 75, h: 76, n: "옆집" }, { x: 3, y: 184, w: 154, h: 66, n: "아래층" }];
// 방 → 이웃 소리 전달 비율
const WGT = [[0.5, 0.3], [1, 0.3], [0.9, 1]];
const NZ = [0, 0.4, 1.6, 6.5, 13];          // 볼륨별 소음(초당 화)
const FUNT = [0.05, 0.35, 0.88, 1, 1];    // 볼륨별 손님 흥 목표
const VC = ["#56607a", "#5fb8ff", "#5fe0a0", "#ffd166", "#ff4f6a"];
const VN = ["꺼짐", "노잼…", "딱 좋아요", "시끄러워요", "너무 시끄러워요!"];
const LT = ["#ff5f7a", "#ffd166", "#5fe0a0", "#5fb8ff", "#c77dff", "#ff8ac8"];
const THEMES = [
  { n: "생일파티", wall: "#4a2350", pat: "#5a2c62", neon: "#ff6fb5", ic: "heart", ty: "teen" },
  { n: "브라이덜 샤워", wall: "#3c2a55", pat: "#4a3667", neon: "#ffc2e2", ic: "ring", ty: "plain" },
  { n: "동창회", wall: "#173c4a", pat: "#1f4b5b", neon: "#7fd1ff", ic: "star", ty: "worker" },
  { n: "아이돌 생카", wall: "#2c2350", pat: "#3a2d66", neon: "#c77dff", ic: "star", ty: "teen" },
  { n: "MT 뒤풀이", wall: "#46301c", pat: "#563c24", neon: "#ffb347", ic: "note", ty: "student" },
  { n: "회사 회식", wall: "#1f3a2c", pat: "#284a38", neon: "#5fe0a0", ic: "note", ty: "worker" },
];
const ICON = {
  heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  star: ["...X...", "..XXX..", "XXXXXXX", ".XXXXX.", ".XX.XX.", "X.....X"],
  note: ["..XXXXX", "..X...X", "..X...X", "XXX.XXX", "XXX.XXX", ".X...X."],
  ring: ["..X..", ".XXX.", "X...X", "X...X", "X...X", ".XXX."],
};
const ZZ = ["XXX", "..X", ".X.", "X..", "XXX"];
const REPLY = ["넵!", "죄송해요~", "앗 넵", "쉿!", "조심할게요", "네네~"];
const SMS = ["조금만 낮춰 주세요!", "밤이라 조금만요!", "볼륨 살짝만요!"];
const shade = (c, f = 0.75) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const mix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return "#" + [16, 8, 0].map((s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0")).join(""); };
function cvs(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function mk(w, h, fn, ol = true) { const c = cvs(w + 2, h + 2), g = c.getContext("2d"); fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + 1, y + 1, ww, hh); }); if (ol) uOutline(c); return c; }
function pmap(g, rows, x, y, col) { g.fillStyle = col; rows.forEach((r, j) => [...r].forEach((ch, i) => ch === "X" && g.fillRect(x + i, y + j, 1, 1))); }

// 도트 손가락(할 일 안내). down=true 면 위에서 아래로 가리킨다
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL(down) {
  const c = cvs(13, 13), g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, down ? 12 - y : y, 1, 1); }));
  return c.toDataURL();
}

let SP = null;
function sprites() {
  if (SP) return SP;
  const S = {};
  S.spk = mk(12, 22, (P) => { P(0, 0, 12, 22, "#2a2a33"); P(0, 0, 12, 1, "#4a4a58"); P(11, 1, 1, 21, "#1c1c24"); P(4, 3, 4, 4, "#5a5a6e"); P(5, 4, 2, 2, "#15151c"); P(3, 10, 6, 8, "#5a5a6e"); P(2, 11, 8, 6, "#5a5a6e"); P(3, 11, 6, 6, "#1c1c24"); P(4, 12, 4, 4, "#2c2c38"); P(5, 13, 2, 2, "#7a7a90"); P(1, 20, 2, 2, "#111"); P(9, 20, 2, 2, "#111"); });
  S.cake = mk(12, 9, (P) => { P(0, 7, 12, 2, "#e8e8f0"); P(0, 8, 12, 1, "#a8a8ba"); P(1, 3, 10, 4, "#ffe6ef"); P(1, 3, 10, 1, "#ff6fa8"); P(2, 4, 1, 1, "#ff6fa8"); P(6, 4, 1, 2, "#ff6fa8"); P(9, 4, 1, 1, "#ff6fa8"); P(1, 6, 10, 1, "#ffc2d8"); P(3, 0, 1, 3, "#7fd1ff"); P(6, 0, 1, 3, "#ffd166"); P(9, 0, 1, 3, "#c77dff"); });
  S.table = mk(20, 7, (P) => { P(0, 0, 20, 3, "#b07a4a"); P(1, 0, 18, 1, "#c99060"); P(0, 3, 20, 1, "#7a4e2a"); P(2, 4, 2, 3, "#5a3820"); P(16, 4, 2, 3, "#5a3820"); });
  S.car = mk(30, 12, (P) => { P(9, 0, 12, 2, "#2a2a36"); P(10, 0, 5, 2, "#ff3b4f"); P(15, 0, 5, 2, "#3b7bff"); P(6, 2, 18, 4, "#f4f4f8"); P(8, 3, 6, 3, "#8fc8f0"); P(16, 3, 6, 3, "#8fc8f0"); P(0, 5, 30, 4, "#f4f4f8"); P(0, 6, 30, 2, "#2a4aa8"); P(0, 5, 30, 1, "#ffffff"); P(29, 5, 1, 2, "#ffd166"); P(0, 5, 1, 2, "#ff5f5f"); P(3, 8, 6, 4, "#1c1c24"); P(21, 8, 6, 4, "#1c1c24"); P(5, 9, 2, 2, "#8a8a98"); P(23, 9, 2, 2, "#8a8a98"); });
  S.phone = mk(7, 11, (P) => { P(0, 0, 7, 11, "#22222c"); P(1, 1, 5, 8, "#3a7fe0"); P(1, 2, 5, 2, "#ffffff"); P(1, 5, 4, 2, "#9cffc0"); P(3, 10, 1, 1, "#666"); });
  S.broom = mk(6, 9, (P) => { P(1, 0, 4, 2, "#cc3333"); P(0, 2, 6, 7, "#e8c060"); P(0, 2, 6, 1, "#f8e090"); P(1, 3, 1, 6, "#c9a040"); P(3, 3, 1, 6, "#c9a040"); });
  S.F_UP = fingerURL(false); S.F_DN = fingerURL(true);
  return (SP = S);
}

// 고정 배경: 밤하늘, 벽돌 건물, 파티룸 벽·창문, 이웃 방 가구, 거리
function buildBg(rooms) {
  const c = cvs(W, H), g = c.getContext("2d"), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  for (let y = 0; y < 24; y++) P(0, y, W, 1, mix("#060918", "#1b2356", y / 24));
  [[8, 3], [22, 9], [37, 4], [55, 11], [70, 2], [88, 7], [101, 13], [117, 3], [126, 12], [150, 15], [44, 15], [14, 14]].forEach(([x, y], i) => P(x, y, 1, 1, i % 3 ? "#cfd8ff" : "#ffffff"));
  // 달
  for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const d = (i - 4) ** 2 + (j - 4) ** 2, d2 = (i - 6) ** 2 + (j - 3) ** 2; if (d <= 17 && d2 > 13) P(132 + i, 3 + j, 1, 1, d < 6 ? "#fffbe0" : "#f4ecb8"); }
  // 건물 외벽(벽돌)
  P(0, 19, W, 233, "#4a2c26");
  for (let y = 19, r = 0; y < 252; y += 4, r++) { P(0, y, W, 1, "#3a211c"); for (let x = (r % 2) * 4; x < W; x += 8) P(x, y + 1, 1, 3, "#3a211c"); }
  P(0, 18, W, 3, "#6a4a40"); P(0, 18, W, 1, "#9a7a68"); P(0, 21, W, 1, "#2a1814");
  // 층 바닥판
  for (const y of [100, 180, 250]) { P(0, y, W, 4, "#7a6a64"); P(0, y, W, 1, "#a89890"); P(0, y + 3, W, 1, "#3a302c"); }
  P(78, 24, 4, 76, "#6a5a54"); P(78, 104, 4, 76, "#6a5a54"); P(79, 24, 1, 156, "#8a7a74");
  // 파티룸
  rooms.forEach((r) => {
    const { x, y } = r, th = r.th;
    P(x, y, RW, RH, th.wall);
    for (let yy = y + 6; yy < y + RH - 8; yy += 6) for (let xx = x + ((yy / 6) % 2) * 3 + 1; xx < x + RW; xx += 6) P(xx, yy, 2, 1, th.pat);
    // 마루
    P(x, y + RH - 8, RW, 8, "#7a4e30"); P(x, y + RH - 8, RW, 1, "#5a3820"); P(x, y + RH - 9, RW, 1, shade(th.wall, 0.6));
    for (let xx = x + 3; xx < x + RW; xx += 11) P(xx, y + RH - 7, 1, 7, "#6a4228");
    P(x, y + RH - 4, RW, 1, "#6a4228");
    // 창문(닫힌 유리)
    const wx = r.wx, wy = r.wy;
    P(wx - 1, wy - 1, 18, 22, "#cbb8e6"); P(wx, wy, 16, 20, "#141a3a"); P(wx, wy + 11, 16, 9, "#1d2752");
    P(wx + 1, wy + 13, 4, 7, "#0b0e20"); P(wx + 6, wy + 10, 3, 10, "#0e1228"); P(wx + 10, wy + 14, 5, 6, "#0b0e20");
    [[2, 15], [7, 12], [7, 15], [11, 16], [13, 16], [3, 17]].forEach(([i, j]) => P(wx + i, wy + j, 1, 1, "#ffd56a"));
    P(wx + 3, wy + 3, 1, 1, "#ffffff"); P(wx + 12, wy + 5, 1, 1, "#cfd8ff");
    P(wx + 7, wy, 2, 20, "#cbb8e6"); P(wx - 2, wy + 20, 20, 2, "#e0d0f4"); P(wx - 2, wy + 22, 20, 1, "#8a7aa8");
  });
  // 옆집(어두운 침실)
  { const { x, y, w, h } = NBG[0], fy = y + h - 8;
    P(x, y, w, h, "#1a2140"); for (let yy = y + 4; yy < fy; yy += 8) P(x, yy, w, 1, "#1e2648");
    P(x, fy, w, 8, "#2c2838"); P(x, fy, w, 1, "#201c2a"); for (let xx = x + 5; xx < x + w; xx += 12) P(xx, fy + 1, 1, 7, "#26222f");
    P(x + 7, y + 11, 18, 22, "#3a4468"); P(x + 8, y + 12, 16, 20, "#0e1430"); P(x + 15, y + 12, 2, 20, "#3a4468"); P(x + 19, y + 15, 3, 3, "#f4f0c8"); P(x + 20, y + 15, 2, 2, "#0e1430");
    P(x + 5, y + 10, 4, 26, "#34406e"); P(x + 23, y + 10, 4, 26, "#34406e"); P(x + 6, y + 10, 1, 26, "#4a5890");
    // 침대(머리 오른쪽)
    P(x + 66, fy - 26, 6, 26, "#5a4030"); P(x + 66, fy - 26, 6, 1, "#7a5a44"); P(x + 67, fy - 23, 4, 1, "#4a3426");
    P(x + 32, fy - 14, 35, 4, "#c8d0e8"); P(x + 32, fy - 10, 35, 4, "#4a3426"); P(x + 32, fy - 10, 35, 1, "#5a4232"); P(x + 33, fy - 6, 2, 6, "#3a281c"); P(x + 63, fy - 6, 2, 6, "#3a281c");
    // 협탁·시계
    P(x + 22, fy - 13, 9, 13, "#4a3426"); P(x + 22, fy - 13, 9, 1, "#6a4a36"); P(x + 24, fy - 8, 5, 1, "#2a1c14"); P(x + 23, fy - 18, 7, 5, "#1c1c24"); P(x + 24, fy - 17, 5, 3, "#3a0a0a");
    P(x + 44, y + 14, 12, 9, "#6a5a40"); P(x + 45, y + 15, 10, 7, "#34406e"); P(x + 46, y + 19, 8, 3, "#2a6a4a");
  }
  // 아래층(넓은 침실)
  { const { x, y, w, h } = NBG[1], fy = y + h - 8;
    P(x, y, w, h, "#1c2036"); for (let xx = x + 3; xx < x + w; xx += 10) P(xx, y + 3, 1, fy - y - 3, "#20253e");
    P(x, fy, w, 8, "#30283a"); P(x, fy, w, 1, "#221c2a"); for (let xx = x + 7; xx < x + w; xx += 14) P(xx, fy + 1, 1, 7, "#2a2333");
    P(x + 22, y + 10, 18, 20, "#3a4468"); P(x + 23, y + 11, 16, 18, "#0e1430"); P(x + 30, y + 11, 2, 18, "#3a4468"); P(x + 26, y + 14, 1, 1, "#ffffff"); P(x + 35, y + 22, 1, 1, "#cfd8ff");
    P(x + 20, y + 9, 3, 24, "#5a3a5a"); P(x + 39, y + 9, 3, 24, "#5a3a5a");
    // 침대(머리 왼쪽)
    P(x + 52, fy - 24, 6, 24, "#5a4030"); P(x + 52, fy - 24, 6, 1, "#7a5a44");
    P(x + 57, fy - 14, 40, 4, "#d8c8b8"); P(x + 57, fy - 10, 40, 4, "#4a3426"); P(x + 57, fy - 10, 40, 1, "#5a4232"); P(x + 59, fy - 6, 2, 6, "#3a281c"); P(x + 93, fy - 6, 2, 6, "#3a281c");
    // 가족사진·옷장·문
    P(x + 68, y + 12, 14, 11, "#c9a050"); P(x + 69, y + 13, 12, 9, "#3a3448"); P(x + 71, y + 16, 3, 5, "#8a7a68"); P(x + 76, y + 15, 3, 6, "#8a7a68");
    P(x + 108, y + 14, 20, 44, "#4a3426"); P(x + 108, y + 14, 20, 1, "#6a4a36"); P(x + 117, y + 15, 1, 43, "#2a1c14"); P(x + 115, y + 34, 1, 3, "#c9a050"); P(x + 119, y + 34, 1, 3, "#c9a050");
    P(x + 136, y + 16, 15, 42, "#5a4636"); P(x + 137, y + 17, 13, 41, "#6a5444"); P(x + 147, y + 37, 2, 2, "#c9a050"); P(x + 139, y + 20, 9, 14, "#5e4a3a"); P(x + 139, y + 38, 9, 16, "#5e4a3a");
  }
  // 거리
  P(0, 254, W, 16, "#1c1f2a"); P(0, 254, W, 3, "#3a3d4a"); P(0, 254, W, 1, "#55586a");
  for (let x = 2; x < W; x += 14) P(x, 263, 7, 1, "#8a8040");
  return c;
}

// 방법 화면 그림 3칸(벡터 80x68)
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
function steps() {
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const spk = (x, y) => `<g transform="translate(${x} ${y})"><rect width="20" height="34" rx="3" fill="#24242e" stroke="#5a5a70"/><circle cx="10" cy="8" r="3.4" fill="#0e0e14"/><circle cx="10" cy="8" r="2" fill="#4a4a5e"/><circle cx="10" cy="22" r="7.4" fill="#3a3a4a"/><circle cx="10" cy="22" r="6.2" fill="#15151e"/><circle cx="10" cy="22" r="2.2" fill="#50506a"/></g>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><defs><radialGradient id="b" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#6a2a72"/><stop offset="1" stop-color="#1e0c2a"/></radialGradient></defs><rect width="80" height="68" rx="11" fill="url(#b)"/>
    ${spk(8, 16)}<path d="M34 24a10 10 0 0 1 0 16M39 19a17 17 0 0 1 0 26M44 14a24 24 0 0 1 0 36" fill="none" stroke="#ff4f6a" stroke-width="2.4" stroke-linecap="round"/>
    <g fill="#ff4f6a"><rect x="31" y="50" width="4" height="5" rx="1"/><rect x="31" y="44" width="4" height="5" rx="1"/><rect x="31" y="38" width="4" height="5" rx="1" fill="#ffd166"/></g>
    <circle cx="62" cy="14" r="3" fill="#ffd166"/><circle cx="70" cy="22" r="2" fill="#5fb8ff"/>${hand(52, 30)}</svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe4ff"/><stop offset="1" stop-color="#3f8fe8"/></linearGradient></defs><rect width="80" height="68" rx="11" fill="#2a2440"/>
    <path d="M6 8h46a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H18l-7 6v-6H6a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="#fff"/><rect x="7" y="13" width="38" height="2.4" rx="1.2" fill="#3a3456"/><rect x="7" y="19" width="28" height="2.4" rx="1.2" fill="#8a84a6"/>
    <rect x="56" y="30" width="16" height="30" rx="3.4" fill="#1c1c26"/><rect x="58" y="33" width="12" height="22" rx="1.6" fill="url(#s)"/><rect x="60" y="37" width="8" height="4" rx="1" fill="#fff"/>
    <g><rect x="10" y="54" width="7" height="6" rx="1.6" fill="#5fe0a0"/><rect x="19" y="50" width="7" height="10" rx="1.6" fill="#5fe0a0"/><rect x="28" y="46" width="7" height="14" rx="1.6" fill="#3a3a50"/><rect x="37" y="42" width="7" height="18" rx="1.6" fill="#3a3a50"/></g>
    <path d="M46 40v10m-4-4 4 4 4-4" stroke="#5fe0a0" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8aa8f0"/><stop offset="1" stop-color="#3a5ab0"/></linearGradient></defs><rect width="80" height="68" rx="11" fill="#141a3a"/>
    <rect x="58" y="22" width="9" height="34" rx="3" fill="#6a4a36"/><rect x="8" y="46" width="54" height="6" rx="2" fill="#4a3426"/><rect x="8" y="40" width="54" height="7" rx="3" fill="#cfd6ec"/>
    <rect x="44" y="33" width="16" height="7" rx="3.4" fill="#fff"/><circle cx="49" cy="33" r="5.4" fill="#f2c8a8"/><path d="M43.6 32a5.4 5.4 0 0 1 10.8 0c-2-1.4-8.8-1.4-10.8 0z" fill="#3b2a1e"/><path d="M46.6 33.6q1 .8 2 0M50.4 33.6q1 .8 2 0" stroke="#3b2a1e" stroke-width=".8" fill="none"/>
    <path d="M10 41c4-8 26-9 34-3v5H10z" fill="url(#k)"/><text x="32" y="22" font-size="13" font-weight="900" fill="#cfe0ff" font-family="sans-serif">Z</text><text x="42" y="14" font-size="9" font-weight="900" fill="#cfe0ff" opacity=".7" font-family="sans-serif">z</text>
    <circle cx="16" cy="12" r="4.4" fill="#fffbe0"/><circle cx="18" cy="11" r="4" fill="#141a3a"/></svg>`);
  return [[`<img src="${a}" alt="">`, "시끄러운 방 톡"], [`<img src="${b}" alt="">`, "문자로 살짝 낮추기"], [`<img src="${c}" alt="">`, "이웃은 꿀잠"]];
}

export const GAME = {
  key: "pr3", base: "pr", n: "층간소음 막기", desc: "밤 11시, 파티룸의 흥은 지키고 이웃은 재워요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 파티룸 3칸이 영업 중이고, <b>옆집·아래층</b> 이웃은 자고 있어요.",
    "손님들이 자꾸 볼륨을 올려요. <b>시끄러운 방을 톡</b>하면 '조금만 낮춰 주세요' 문자가 가서 한 칸 내려가요. <b>열린 창문</b>은 톡해서 닫아요.",
    "너무 낮추면 손님이 <b>노잼</b>이라 별점이 떨어져요. 스피커 칸이 <b>초록</b>이면 딱 좋아요. <b>생일 케이크 떼창</b>은 막지 말고 다른 방을 미리 낮춰요. 이웃이 <b>112</b>에 신고하면 경찰차가 오기 전에 전부 조용히!",
  ],
  steps,
  css: `
.mg-pr3 .mg-p3st{background:#060918!important;display:flex;align-items:center;justify-content:center}
.mg-pr3 .mg-steps img{width:76px!important;height:65px!important;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-pr3 .mg-p3w{position:relative;flex:0 0 auto;font-size:calc(var(--k,2) * 4.7px);line-height:1.2}
.mg-pr3 .mg-p3w.shk{animation:mgp3shk .28s}
@keyframes mgp3shk{25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-1px)}75%{transform:translate(-2px,0)}}
.mg-pr3 .mg-p3w canvas{width:100%;height:100%;display:block;touch-action:none;cursor:pointer}
.mg-pr3 .p3lb{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.mg-pr3 .p3lb b{position:absolute;font-weight:800;color:#fff;background:#0009;border-radius:.35em;padding:0 .35em;white-space:nowrap;letter-spacing:-.03em;font-size:.95em}
.mg-pr3 .p3lb b i{font-style:normal;color:#ffd166;letter-spacing:-.12em;margin-left:.2em}
.mg-pr3 .p3lb b.lo{background:#1f4a7acc;color:#cfe8ff}
.mg-pr3 .p3lb b.hi{background:#b02a40e0;animation:mgp3bl .5s steps(2) infinite}
.mg-pr3 .p3lb b.ck{background:#d0408ae8;animation:mgp3bl .5s steps(2) infinite}
.mg-pr3 .p3lb b.nb{background:#141a34d8;color:#bcd0ff}
.mg-pr3 .p3lb b.nb.w{background:#8a5a10e0;color:#fff}
.mg-pr3 .p3lb b.nb.a{background:#c0283ce8;color:#fff;animation:mgp3bl .4s steps(2) infinite}
@keyframes mgp3bl{50%{filter:brightness(1.4)}}
.mg-pr3 .p3clk{position:absolute;left:.4em;top:.25em;font:800 1.05em ui-monospace,monospace;color:#ffe9a8;text-shadow:0 1px 0 #000;pointer-events:none;letter-spacing:-.02em}
.mg-pr3 .p3sms{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#1d1d2a;font-weight:800;font-size:1em;padding:.2em .55em;border-radius:.8em .8em .8em .2em;white-space:nowrap;pointer-events:none;box-shadow:0 2px 0 #0007;animation:mgp3sms .95s ease-out forwards;z-index:5}
.mg-pr3 .p3sms.rp{background:#5fe0a0;color:#0b2a1a;border-radius:.8em .8em .2em .8em}
.mg-pr3 .p3sms.bad{background:#ff5f7a;color:#fff}
@keyframes mgp3sms{0%{opacity:0;margin-top:1.2em;transform:translate(-50%,-100%) scale(.6)}18%{opacity:1;margin-top:0;transform:translate(-50%,-100%) scale(1.05)}30%{transform:translate(-50%,-100%) scale(1)}75%{opacity:1}100%{opacity:0;margin-top:-1em}}
.mg-pr3 .p3pol{position:absolute;left:6%;right:6%;top:77%;text-align:center;pointer-events:none;z-index:6;display:none}
.mg-pr3 .p3pol.on{display:block}
.mg-pr3 .p3pol b{display:inline-block;font-size:1.9em;font-weight:900;color:#fff;padding:.15em .6em;border-radius:.5em;animation:mgp3sir .5s steps(2) infinite;box-shadow:0 3px 0 #0008}
.mg-pr3 .p3pol small{display:block;margin-top:.3em;font-weight:900;font-size:1.15em;color:#fff;text-shadow:0 1px 0 #000,0 0 6px #000}
@keyframes mgp3sir{0%{background:#e0283c}100%{background:#2a5ae0}}
.mg-pr3 .p3stamp{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-8deg);font-size:2.6em;font-weight:900;color:#ff3b4f;border:.12em solid #ff3b4f;border-radius:.3em;padding:.05em .4em;background:#fff2;pointer-events:none;z-index:7;animation:mgp3stp 1.4s ease-out forwards;white-space:nowrap}
.mg-pr3 .p3stamp.ok{color:#5fe0a0;border-color:#5fe0a0}
@keyframes mgp3stp{0%{opacity:0;transform:translate(-50%,-50%) rotate(-8deg) scale(2.4)}15%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(.95)}22%{transform:translate(-50%,-50%) rotate(-8deg) scale(1)}80%{opacity:1}100%{opacity:0}}
.mg-pr3 .p3note{position:absolute;left:14%;right:14%;top:56%;z-index:8;background:#fff6a8;color:#3a3020;border-radius:.2em;padding:.9em .8em .7em;box-shadow:0 .4em .8em #000a;transform:rotate(-3deg) scale(.4);opacity:0;transition:transform .45s cubic-bezier(.3,1.6,.5,1),opacity .25s;font-size:1.25em;line-height:1.45;font-weight:700;text-align:center;word-break:keep-all;pointer-events:none}
.mg-pr3 .p3note.on{opacity:1;transform:rotate(-3deg) scale(1)}
.mg-pr3 .p3note::before{content:"";position:absolute;left:38%;top:-.5em;width:24%;height:1em;background:#ffffffa0;transform:rotate(2deg)}
.mg-pr3 .p3note small{display:block;text-align:right;color:#7a6a40;font-size:.8em;margin-top:.2em}
.mg-pr3 .p3note.bad{background:#ffd8d8;color:#5a1a1a}
.mg-pr3 .p3note.bad small{color:#a04040}
.mg-pr3 .p3note em{display:block;font-style:normal;margin-top:.5em;font-size:.82em;background:#2a2a3a;color:#fff;border-radius:.7em;padding:.3em .5em;text-align:left}
.mg-pr3 .p3go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-pr3 .p3go.on{display:block}
.mg-pr3 .p3go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 #0009)}
.mg-pr3 .p3go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-pr3 .p3go span b{color:#d8402a}
.mg-pr3 .p3go.dn i{top:-37px;animation:mgp3tapd .7s infinite}
.mg-pr3 .p3go.dn span{bottom:44px}
.mg-pr3 .p3go.up i{top:2px;animation:mgp3tapu .7s infinite}
.mg-pr3 .p3go.up span{top:46px}
@keyframes mgp3tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes mgp3tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
.mg-pr3 .p3tut{position:absolute;left:8px;right:8px;top:62%;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-pr3 .p3tut.mid{top:30%}
.mg-pr3 .p3tut.off{opacity:0;visibility:hidden}
.mg-pr3 .p3tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #c77dff;max-width:292px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-pr3 .p3tut.pop .p3tc{animation:mgp3pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-pr3 .p3tc em{font-style:normal;display:inline-block;background:#8a3fc0;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-pr3 .p3tc p{margin:0}.mg-pr3 .p3tc b{color:#6a2a9a}.mg-pr3 .p3tc b.p3rd{color:#c0392b}.mg-pr3 .p3tc b.p3gr{color:#1f8a5a}.mg-pr3 .p3tc b.p3pk{color:#d0407a}.mg-pr3 .p3tc b.p3bl{color:#1f5ac0}
.mg-pr3 .p3tb{margin-top:6px;display:flex;justify-content:center}
.mg-pr3 .p3skip{background:none!important;border:0!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important}
.mg-pr3 .p3gob{background:linear-gradient(#a85ae0,#7a2fb0)!important;color:#fff!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #4a1a70!important;animation:mgp3pulse .5s infinite alternate}
@keyframes mgp3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes mgp3pulse{to{transform:scale(1.06)}}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const S = sprites();
  const F = frame(host, "pr3", "층간소음 막기", "mg-p3st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-p3w"><canvas width="${W}" height="${H}"></canvas><div class="p3lb"></div><div class="p3clk"></div><div class="p3pol"><b></b><small>경찰차 오기 전에 전부 조용히!</small></div><div class="p3go"><span></span><i></i></div><div class="p3tut off"><div class="p3tc"><em>리허설</em><p></p><div class="p3tb"></div></div></div></div>`);
  const wrap = F.stage.querySelector(".mg-p3w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), lbEl = wrap.querySelector(".p3lb"), clkEl = wrap.querySelector(".p3clk"), polEl = wrap.querySelector(".p3pol"), polB = polEl.querySelector("b");
  const goEl = wrap.querySelector(".p3go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".p3tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".p3tb");
  g.imageSmoothingEnabled = false;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  let KS = 1, BGH = null;
  const fit = () => { const sw = F.stage.clientWidth, sh = F.stage.clientHeight; if (!sw || !sh) return; const r = Math.min(sw / W, sh / H), K = r >= 2 ? Math.floor(r) : Math.max(1, r); wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px"; wrap.style.setProperty("--k", K); const ks = K * DPR; if (ks !== KS) { KS = ks; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); BGH = null; } };
  fit(); requestAnimationFrame(fit);
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const pct = (v, m) => (v / m) * 100 + "%";
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };

  // ── 상태 ──
  const themes = shuffle(THEMES.slice()).slice(0, 3);
  const rooms = GEO.map((q, i) => {
    const th = themes[i], L = q.side === "L";
    const r = { i, ...q, th, nm: "ABC"[i], vol: 2, fun: 0.85, win: false, winT: -9, nextUp: 3, mute: -1, cake: null, flash: -9, tapT: -9, funSum: 0, bump: -9 };
    r.sx = L ? q.x + 3 : q.x + RW - 15; r.sy = q.y + RH - 29;
    r.wx = L ? q.x + 51 : q.x + 9; r.wy = q.y + 10;
    r.mx = q.x + (L ? 38 : 36);
    r.ppl = (L ? [20, 35, 51] : [5, 21, 38]).map((dx, k) => ({ p: { spec: uSpec(k === 1 && rnd() < 0.5 ? pick(["plain", "student", "worker", "teen"]) : th.ty), cache: {} }, x: q.x + dx, ph: rnd() * 6 }));
    return r;
  });
  const BG = buildBg(rooms);
  // ── 그림(배경·사람) ──
  const IMG = {};
  const ld = (k, src) => { if (!IMG[k]) { const q = { ok: false, bad: false, im: new Image() }; q.im.onload = () => (q.ok = true); q.im.onerror = () => (q.bad = true); q.im.src = src; IMG[k] = q; } return IMG[k]; };
  const AV = typeof opts.avatar === "string" ? opts.avatar : "";
  const POOL_Y = ["c002", "c009", "c010", "c013", "c021", "c022", "c024", "c025", "c028", "c030", "c034", "c039", "c047", "c050", "c052", "c053", "c054", "c055", "c057", "c063", "c064", "c069", "c074", "c079", "c084", "c085", "pF2", "pF3", "pF5", "pF6", "pM1", "pM3", "pM4", "pM5", "pM8"];
  const POOL_W = ["c004", "c005", "c006", "c019", "c033", "c036", "c037", "c041", "c042", "c058", "c059", "c061", "c062", "c067", "c070", "c077", "c078", "c082", "c091", "pF1", "pF4", "pM2", "pM6", "pM7"];
  { const used = new Set([AV]); rooms.forEach((r) => { const pool = shuffle((r.th.ty === "worker" ? POOL_W : POOL_Y).filter((k) => !used.has(k))); r.ppl.forEach((q, k) => { q.ak = pool[k]; used.add(q.ak); q.art = ld(q.ak, "img/body/" + q.ak + ".webp"); }); }); }
  const BGI = { party: ld("party", "img/bg/partyroom.webp"), nb0: ld("nb0", "img/bg/online.webp"), nb1: ld("nb1", "img/bg/home.webp") };
  const nbs = NBG.map((q, j) => ({ j, ...q, spec: uSpec(j ? "elder" : "worker"), cache: {}, anger: j ? 4 : 8, st: "sleep", stT: 0, knockN: 0, thump: 0, cool: 0 }));
  nbs.forEach((n) => { n.p = { spec: n.spec, cache: n.cache }; n.ak = n.j ? "c043" : "c072"; n.art = ld(n.ak, "img/body/" + n.ak + ".webp"); });
  let tt = 0, el = 0, started = false, over = false, done = false, raf = 0, tm = null, tut = -9, tutT = 0;
  let beatT = 0, beatN = 0, pol = null, calls = 0, fails = 0, knocks = 0, cakesOK = 0, cakesBroken = 0, cakesN = 0, angSum = 0, timeSum = 0, endT = -1, endPh = 0, ending = null, lastLow = 0, lastNb = 0, hint0 = false;
  const rings = [], pts = [], winEv = [], cakeEv = [];
  const sky = { t: 0 };

  // ── HTML 이름표 ──
  lbEl.innerHTML = rooms.map(() => "<b></b>").join("") + nbs.map(() => `<b class="nb"></b>`).join("");
  const lbs = [...lbEl.children];
  rooms.forEach((r, i) => { lbs[i].style.left = pct(r.x + 1, W); lbs[i].style.top = pct(r.y + 1, H); });
  nbs.forEach((n, j) => { const b = lbs[3 + j]; b.style.left = pct(n.x + 1, W); b.style.top = pct(n.y + 1, H); });
  const st5 = (f) => 1 + 4 * clamp(f / 0.9, 0, 1);
  const stars = (f) => "★".repeat(clamp(Math.round(st5(f)), 1, 5));
  const lbUpd = () => {
    rooms.forEach((r, i) => {
      const b = lbs[i], ck = r.cake && (r.cake.ph === "warn" || r.cake.ph === "sing");
      let t, cl;
      if (ck) { t = r.cake.ph === "warn" ? `${r.th.n} · 케이크 곧!` : `${r.th.n} · 떼창 중♪`; cl = "ck"; }
      else if (endPh >= 1) { t = `${r.th.n} · 퇴실`; cl = "lo"; }
      else if (r.vol <= 1) { t = `${r.th.n} · ${r.vol ? "노잼…" : "꺼짐"}`; cl = "lo"; }
      else { t = `${r.th.n}<i>${stars(r.fun)}</i>`; cl = r.vol >= 4 ? "hi" : ""; }
      if (b.dataset.t !== t) { b.dataset.t = t; b.innerHTML = t; }
      if (b.className !== cl) b.className = cl;
    });
    nbs.forEach((n) => {
      const b = lbs[3 + n.j], a = n.anger;
      const t = n.st === "call" ? `${n.n} · 112 신고 중!` : n.st === "knock" ? `${n.n} · ${n.j ? "쿵쿵!" : "쾅쾅!"}` : a >= 45 ? `${n.n} · 뒤척뒤척` : `${n.n} · 꿀잠`;
      const cl = "nb" + (n.st === "call" || n.st === "knock" ? " a" : a >= 45 ? " w" : "");
      if (b.textContent !== t) b.textContent = t; if (b.className !== cl) b.className = cl;
    });
  };
  const clock = () => {
    let s;
    if (endPh >= 2) s = "아침 6:30";
    else { const m = Math.round((tut >= 0 || !started ? 0 : clamp(el / T, 0, 1)) * 120), h = 23 + Math.floor(m / 60), mm = m % 60; s = `${h >= 24 ? "새벽 " + (h - 24 === 0 ? 12 : h - 24) : "밤 " + (h - 12)}:${String(mm - (mm % 5)).padStart(2, "0")}`; }
    if (clkEl.textContent !== s) clkEl.textContent = s;
  };
  const updSc = () => { const f = rooms.reduce((a, r) => a + r.fun, 0) / 3; F.sc.textContent = `★${st5(f).toFixed(1)} · 신고 ${calls}`; };

  // ── 효과 ──
  const bubble = (x, y, t, cls = "") => { const e = document.createElement("div"); e.className = "p3sms " + cls; e.textContent = t; e.style.left = pct(x, W); e.style.top = pct(y, H); wrap.appendChild(e); setTimeout(() => e.remove(), 1000); };
  const confetti = (x, y, n) => { if (RM()) n = Math.min(n, 6); for (let i = 0; i < n; i++) { const l = 0.6 + rnd() * 0.5; pts.push({ x, y, vx: (rnd() - 0.5) * 60, vy: -30 - rnd() * 35, l, m: l, c: pick(LT), s: rnd() < 0.4 ? 2 : 1, gr: 90 }); } };
  const dust = (x, y, n, w = 10) => { for (let i = 0; i < n; i++) { const l = 0.5 + rnd() * 0.5; pts.push({ x: x + (rnd() - 0.5) * w, y, vx: (rnd() - 0.5) * 6, vy: 4 + rnd() * 10, l, m: l, c: pick(["#cbbfa8", "#a89a86", "#e8dcc8"]), s: 1, gr: 40 }); } };
  const shake = () => { if (RM()) return; wrap.classList.remove("shk"); void wrap.offsetWidth; wrap.classList.add("shk"); };
  const stamp = (t, ok) => { const e = document.createElement("div"); e.className = "p3stamp" + (ok ? " ok" : ""); e.textContent = t; wrap.appendChild(e); setTimeout(() => e.remove(), 1450); SFX.stamp(); };
  const thump = () => { noise(0.07, 160, 0.45); tone(70, 0.12, "sine", 0.3, -30); vib(30); };
  const siren = (k) => tone(k % 2 ? 960 : 700, 0.34, "triangle", 0.07, k % 2 ? -260 : 260);
  const song = () => [392, 392, 440, 392, 523, 494].forEach((f, i) => { tone(f, i === 5 ? 0.3 : 0.15, "square", 0.06, 0, i * 0.19); tone(f / 2, 0.15, "triangle", 0.05, 0, i * 0.19); });

  // ── 손가락 ──
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "p3go"; return; }
    const up = o.y < 50;
    goI.style.backgroundImage = `url(${up ? S.F_UP : S.F_DN})`;
    goEl.style.left = pct(o.x, W); goEl.style.top = pct(o.y, H); goT.innerHTML = o.t;
    goT.style.transform = o.x < 34 ? "translateX(-22%)" : o.x > 126 ? "translateX(-80%)" : "";
    goEl.className = "p3go on " + (up ? "up" : "dn");
  };
  const rPt = (r) => ({ x: r.x + RW / 2, y: r.y + 30 });
  const loudest = (ex) => { let b = null; for (const r of rooms) { if (r === ex || (r.cake && r.cake.ph === "sing" && !pol)) continue; if (!b || r.vol > b.vol) b = r; } return b; };
  const taskNow = () => {
    if (pol) { const w = rooms.find((r) => r.win); if (w) return { x: w.wx + 8, y: w.wy + 10, t: "창문 <b>톡!</b>" }; const r = loudest(); if (r && r.vol > 1) return { ...rPt(r), t: "<b>톡!</b> 조용히" }; return null; }
    const ck = rooms.find((r) => r.cake && r.cake.ph === "warn"); if (ck) { const r = loudest(ck); if (r && r.vol >= 3) return { ...rPt(r), t: "미리 <b>낮춰요</b>" }; }
    if (nbs.some((n) => n.st === "knock")) { const r = loudest(); if (r && r.vol >= 3) return { ...rPt(r), t: "<b>톡!</b> 낮춰요" }; const w = rooms.find((q) => q.win); if (w) return { x: w.wx + 8, y: w.wy + 10, t: "창문 <b>톡!</b>" }; }
    const w = rooms.find((q) => q.win && el - q.winT > 0.6); if (w) return { x: w.wx + 8, y: w.wy + 10, t: "창문 <b>톡!</b>" };
    const r = rooms.find((q) => q.vol >= 4 && !(q.cake && q.cake.ph === "sing")); if (r && (el < 7 || nbs.some((n) => n.anger > 50))) return { ...rPt(r), t: "<b>톡!</b>" };
    return null;
  };

  // ── 조작 ──
  const openWin = (r) => { if (r.win) return; r.win = true; r.winT = el; bubble(r.wx + 8, r.wy - 1, pick(["더워~ 창문 열자!", "환기 좀!", "덥다 더워"]), "bad"); tone(500, 0.1, "triangle", 0.06, 200); };
  const closeWin = (r) => {
    if (!r.win) return; r.win = false; r.flash = tt; SFX.snap(); noise(0.05, 2400, 0.08);
    F.hit(stageXY(r.wx + 8, r.wy + 10), 1, "#cbb8e6"); F.msg("창문 닫았어요! 소리가 덜 새요");
    if (tut === 2) setTimeout(() => tut === 2 && tutNext(3), 800);
  };
  const sendMsg = (r) => {
    const sp = stageXY(r.x + RW / 2, r.y + 26);
    r.tapT = tt;
    tone(1320, 0.05, "sine", 0.1); tone(1760, 0.08, "sine", 0.08, 0, 0.06);
    if (r.cake && r.cake.ph === "sing" && !pol) {
      cakesBroken++; r.cake.ph = "broken"; r.vol = 2; r.fun = Math.max(0, r.fun - 0.45);
      bubble(r.x + RW / 2, r.y + 20, "생일 노래 중인데요?!", "bad"); F.miss(sp); F.msg("떼창 순간에 끄다니! 별점 뚝"); return;
    }
    bubble(r.x + RW / 2, r.y + 22, pick(SMS));
    if (r.vol <= 0) { F.msg("이미 꺼져 있어요"); SFX.tok(); return; }
    const was = r.vol; r.vol--; r.nextUp = el + (2.6 + rnd() * 1.4) * ez; r.flash = tt;
    if (r.cake && r.cake.ph === "sing") { r.cake.ph = "done"; }
    setTimeout(() => { if (!done) bubble(r.x + RW / 2, r.y + 36, pick(REPLY), "rp"); }, 380);
    if (was >= 3) F.hit(sp, 1, VC[r.vol]);
    else { SFX.tok(); F.float(sp, r.vol ? "노잼…" : "꺼짐", "bad"); if (performance.now() - lastLow > 2500) { lastLow = performance.now(); F.msg("너무 낮추면 손님이 '노잼'해요"); } }
    if (tut === 1 && r.i === 1 && r.vol <= 2) { F.msg("초록! 딱 좋아요"); setTimeout(() => tut === 1 && tutNext(2), 900); }
  };
  const tapL = (x, y) => {
    if (over || tut === 0 || tut === 3) return;
    for (const r of rooms) if (r.win && x >= r.wx - 3 && x <= r.wx + 19 && y >= r.wy - 3 && y <= r.wy + 24) return closeWin(r);
    const r = rooms.find((q) => x >= q.x - 1 && x <= q.x + RW + 1 && y >= q.y && y <= q.y + RH);
    if (tut === 1 && r !== rooms[1]) { F.msg("빨간 B방을 톡!"); SFX.tok(); return; }
    if (tut === 2) { F.msg("열린 창문을 톡!"); SFX.tok(); return; }
    if (r) return sendMsg(r);
    if (y > 100 && y < 252 && performance.now() - lastNb > 1500) { lastNb = performance.now(); F.msg("이웃 방이에요. 시끄러운 파티룸을 톡!"); SFX.tok(); }
  };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); const [x, y] = toL(e); tapL(x, y); });

  // ── 리허설: 시끄러운 방 낮추기 → 창문 닫기 → 사건 안내 → 영업 시작 ──
  const SKIP = `<button class="p3skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "mid", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) {
      rooms.forEach((r) => (r.vol = 2)); rooms[1].vol = 4;
      tutP.innerHTML = `밤 11시, 파티룸 3칸이 영업 중이고 <b class="p3bl">옆집·아래층</b>은 자요.<br><b class="p3rd">빨간 B방</b>을 톡! '조금만 낮춰 주세요' 문자가 가요.<br>스피커 칸이 <b class="p3gr">초록</b>이 될 때까지!`;
      tutB.innerHTML = SKIP;
    } else if (n === 2) {
      openWin(rooms[2]);
      tutP.innerHTML = `손님이 <b class="p3rd">창문</b>을 열었어요! 소리가 밖으로 새요.<br>열린 <b>창문을 톡</b> 해서 닫아요.`;
      tutB.innerHTML = SKIP;
    } else if (n === 3) {
      tutEl.classList.add("mid");
      tutP.innerHTML = `영업 중엔 이런 일도 있어요.<br><b class="p3pk">생일 케이크 떼창</b>은 막지 말고 <b>다른 방을 미리</b> 낮춰요.<br>이웃이 <b class="p3rd">쿵쿵</b>하면 바로 낮추고, <b class="p3bl">사이렌</b>이 울리면 전부 조용히!<br>너무 낮추면 <b>노잼</b>이라 별점이 떨어져요.`;
      tutB.innerHTML = `<button class="p3gob" data-go>영업 시작!</button>`;
    }
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });
  const startGame = () => {
    if (started) return; tut = -1; tutEl.classList.add("off"); guide(null);
    rooms.forEach((r, i) => { r.vol = i === 1 ? 3 : 2; r.fun = 0.85; r.win = false; r.cake = null; r.nextUp = (1.6 + i * 0.9 + rnd() * 0.6) * ez; r.mute = -1; });
    nbs.forEach((n, j) => { n.anger = j ? 4 : 8; n.st = "sleep"; });
    // 사건 일정
    const ca = rint(3); let cb = rint(3); if (cb === ca) cb = (ca + 1 + rint(2)) % 3;
    cakeEv.push({ at: 8.5 + rnd() * 1.2, r: ca }, { at: 19 + rnd() * 1.5, r: cb });
    winEv.push(...[5 + rnd(), 13 + rnd() * 1.5, 23.5 + rnd()].map((at) => ({ at })));
    started = true; el = 0; SFX.go();
    tm = timer(T, F.bar, end);
    F.msg("영업 시작! 시끄러운 방을 톡");
  };

  // ── 경찰 ──
  const startPol = (n) => {
    if (pol) return; calls++;
    pol = { t0: el, dur: 5 * Math.min(ez, 1.3), nb: n, k: 0, carX: 176, ok: false };
    polEl.classList.add("on"); F.msg(`${n.n} 이웃이 112에 신고했어요!`); vib([40, 60, 40]); updSc();
  };
  const quiet = () => rooms.every((r) => r.vol <= 1 && !r.win);
  const resolvePol = () => {
    const ok = quiet(); polEl.classList.remove("on");
    if (ok) {
      stamp("조용하네요?", true); F.msg("경찰: 별일 없네요. 돌아갑니다"); SFX.ding(4);
      nbs.forEach((n) => { n.anger = Math.min(n.anger, 55); n.st = "sleep"; });
    } else {
      fails++; stamp("경찰 출동!"); F.miss(stageXY(W / 2, H / 2)); F.msg("경찰이 올라왔어요… 강제로 음악 끔"); shake();
      rooms.forEach((r) => { r.vol = 0; r.mute = el + 2.6; r.fun = Math.max(0, r.fun - 0.3); r.win = false; if (r.cake && r.cake.ph !== "done") r.cake.ph = "done"; });
      nbs.forEach((n) => { n.anger = 45; n.st = "sleep"; });
    }
    pol.left = el; pol.ok = ok; const p = pol; pol = null; leaving = p; updSc();
  };
  let leaving = null;

  // ── 게임 진행 ──
  const ckAct = (r) => r.cake && (r.cake.ph === "warn" || r.cake.ph === "sing");
  const effVol = (r) => (r.cake && r.cake.ph === "sing" ? 4 : r.vol);
  const stepGame = (dt) => {
    el += dt;
    // 사건: 창문
    for (const w of winEv) if (!w.done && el >= w.at) { w.done = true; const c = rooms.filter((r) => !r.win && !ckAct(r)); if (c.length) openWin(pick(c)); }
    // 사건: 케이크
    for (const c of cakeEv) {
      const r = rooms[c.r];
      if (!c.w && el >= c.at - 2.6) { c.w = true; if (!ckAct(r)) { r.cake = { ph: "warn", ev: c }; cakesN++; F.msg(`${r.th.n}방 생일 케이크 들어가요! 다른 방을 미리 낮춰요`); tone(1568, 0.08, "triangle", 0.08); tone(2093, 0.1, "triangle", 0.07, 0, 0.1); } else c.skip = true; }
      if (c.w && !c.s && !c.skip && el >= c.at) { c.s = true; if (r.cake && r.cake.ph === "warn") { r.cake.ph = "sing"; r.cake.t0 = el; r.cake.tt = tt; r.mute = -1; song(); noise(0.4, 1800, 0.08, 1.2, 0.5); bubble(r.x + RW / 2, r.y + 18, "생일 축하합니다~♪"); } }
      if (c.s && !c.e && el >= c.at + 3.6) { c.e = true; if (r.cake && r.cake.ph === "sing") { r.cake.ph = "done"; cakesOK++; r.vol = 3; r.nextUp = el + 2.5 * ez; F.hit(stageXY(r.x + RW / 2, r.y + 30), 3, "#ff8ac8"); confetti(r.x + RW / 2, r.y + 40, 24); F.msg("떼창 성공! 손님 별점 쑥"); r.fun = 1; } }
    }
    // 손님이 볼륨을 올린다
    const prog = clamp(el / T, 0, 1);
    for (const r of rooms) {
      if (r.cake && (r.cake.ph === "sing")) { r.fun += (1 - r.fun) * Math.min(1, dt * 2); continue; }
      if (el < r.mute) { r.fun += (0 - r.fun) * Math.min(1, dt * 0.5); continue; }
      if (el >= r.nextUp) {
        if (r.vol < 4) { r.vol++; r.flash = tt; r.bump = tt; if (r.vol === 4) { tone(90, 0.15, "square", 0.06, 40); if (rnd() < 0.6) bubble(r.x + RW / 2, r.y + 24, pick(["볼륨 업!!", "이 노래 좋아!", "소리 질러~", "한 곡 더!"]), "bad"); } }
        r.nextUp = el + (r.vol <= 1 ? 1.5 + rnd() * 0.8 : (2.2 + rnd() * 1.5) * (1 - 0.3 * prog)) * ez;
      }
      r.fun += (FUNT[r.vol] - r.fun) * Math.min(1, dt * 0.8);
    }
    // 이웃 화
    if (!pol) {
      nbs.forEach((n) => {
        let add = 0; rooms.forEach((r) => (add += WGT[r.i][n.j] * NZ[effVol(r)] * (r.win ? 1.6 : 1)));
        n.anger = clamp(n.anger + (add - 6) * dt, 0, 100);
        if (n.st === "sleep" && n.anger >= 75) { n.st = "knock"; n.stT = el; n.thump = 0; knocks++; F.msg(n.j ? "아래층에서 천장을 쿵쿵! 빨리 낮춰요" : "옆집이 벽을 쾅쾅! 빨리 낮춰요"); }
        if (n.st === "knock") {
          if (el >= n.thump) { n.thump = el + 0.55; thump(); shake(); const cx = n.j ? n.x + 26 : n.x + 2; if (n.j) dust(cx, n.y + 1, 5); F.float(stageXY(n.x + (n.j ? 30 : 16), n.y + (n.j ? 10 : 30)), n.j ? "쿵쿵!" : "쾅쾅!", "bad"); }
          if (n.anger < 52) { n.st = "sleep"; F.msg(`${n.n} 이웃이 다시 잠들었어요`); SFX.ding(2); }
          else if (n.anger >= 100) { n.st = "call"; n.stT = el; startPol(n); }
        }
      });
    } else {
      pol.k += dt; if (Math.floor(pol.k / 0.36) !== pol.sk) { pol.sk = Math.floor(pol.k / 0.36); siren(pol.sk); }
      const left = pol.dur - (el - pol.t0); polB.textContent = `경찰 도착까지 ${Math.max(0, Math.ceil(left))}초`;
      if (left <= 0) resolvePol();
    }
    // 기록
    rooms.forEach((r) => (r.funSum += r.fun * dt));
    angSum += ((nbs[0].anger + nbs[1].anger) / 2) * dt; timeSum += dt;
    // 소음 먼지: 이웃 천장
    for (const n of nbs) { let add = 0; rooms.forEach((r) => (add += WGT[r.i][n.j] * NZ[effVol(r)])); if (rnd() < add * dt * 0.25) dust(n.x + 8 + rnd() * (n.w - 16), n.y + 1, 1, 4); }
    if (!hint0 && el > 2.5) { hint0 = true; if (rooms.some((r) => r.vol >= 3)) F.msg("노랑·빨강 방을 톡! 초록이면 딱 좋아요"); }
  };

  // ── 그리기 ──
  // ── 벡터 그리기 도우미(논리 좌표, 캔버스는 KS 배율) ──
  const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  const dot = (x, y, r, c) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fillStyle = c; g.fill(); };
  const glow = (c, b) => { g.shadowColor = c; g.shadowBlur = b * KS; };
  const noGlow = () => { g.shadowColor = "transparent"; g.shadowBlur = 0; };
  const lg = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => q.addColorStop(i / (stops.length - 1), c)); return q; };
  const cover = (im, x, y, w, h, fx = 0.5, fy = 0.5, zoom = 1) => { const iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(w / iw, h / ih) * zoom, sw = w / sc, sh = h / sc; g.drawImage(im, (iw - sw) * fx, (ih - sh) * fy, sw, sh, x, y, w, h); };
  // 사람 그림: 아래쪽은 바닥 쪽으로 흐리게 사라진다(그림이 허벅지까지라서)
  const scr = document.createElement("canvas"), sg = scr.getContext("2d");
  const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  const body = (a, ex, cx, top, hh, o = {}) => {
    if (!a || !a.ok) return false;
    const ww = hh * 240 / 312, dw = Math.max(2, Math.ceil(ww * KS)), dh = Math.max(2, Math.ceil(hh * KS)), e = EXI[ex] || 0;
    if (scr.width < dw || scr.height < dh) { scr.width = Math.max(scr.width, dw); scr.height = Math.max(scr.height, dh); }
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, dw + 2, dh + 2);
    sg.drawImage(a.im, (e % 3) * 240, e >= 3 ? 540 : 0, 240, 312, 0, 0, dw, dh);
    const fd = o.fade == null ? 0.3 : o.fade;
    if (fd > 0) { sg.globalCompositeOperation = "destination-out"; const q = sg.createLinearGradient(0, dh * (1 - fd), 0, dh); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,1)"); sg.fillStyle = q; sg.fillRect(0, dh * (1 - fd) - 1, dw + 2, dh * fd + 2); }
    if (o.tint) { sg.globalCompositeOperation = "source-atop"; sg.fillStyle = o.tint; sg.fillRect(0, 0, dw + 2, dh + 2); }
    sg.globalCompositeOperation = "source-over";
    g.save(); g.imageSmoothingEnabled = true; g.globalAlpha *= o.a == null ? 1 : o.a;
    g.translate(cx, top + hh); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
    g.drawImage(scr, 0, 0, dw, dh, -ww / 2, -hh, ww, hh); g.restore();
    return true;
  };
  // 누운 얼굴(머리 쪽 crop 을 돌려서 베개 위에)
  const headLying = (a, ex, cx, cy, s, rot) => {
    if (!a || !a.ok) return false;
    const e = EXI[ex] || 0;
    g.save(); g.imageSmoothingEnabled = true; g.translate(cx, cy); g.rotate(rot);
    g.drawImage(a.im, (e % 3) * 240 + 44, (e >= 3 ? 540 : 0) + 0, 152, 152, -s / 2, -s / 2, s, s); g.restore();
    return true;
  };
  // 벡터 소품
  const spk = (x, y, b) => {
    g.save(); glow("#000a", 2); rr(x, y, 12, 22, 1.8); g.fillStyle = lg(x, 0, x + 12, 0, ["#3e3e4e", "#24242e", "#16161e"]); g.fill(); noGlow();
    rr(x + 0.4, y + 0.4, 11.2, 21.2, 1.5); g.lineWidth = 0.4; g.strokeStyle = "#5a5a70"; g.stroke();
    dot(x + 6, y + 5, 2.3, "#0e0e14"); dot(x + 6, y + 5, 1.5, "#4a4a5e"); dot(x + 5.5, y + 4.5, 0.5, "#c8c8e0");
    const R = 4.7 + b * 0.5, cy = y + 14.5; dot(x + 6, cy, R, "#3a3a4a"); const q = g.createRadialGradient(x + 5.2, cy - 1, 0.4, x + 6, cy, R - 0.6); q.addColorStop(0, "#6a6a80"); q.addColorStop(0.35, "#2a2a36"); q.addColorStop(1, "#101018"); dot(x + 6, cy, R - 0.6, q); dot(x + 6, cy, 1.5, "#50506a"); dot(x + 5.5, cy - 0.5, 0.5, "#9a9ab8");
    g.restore();
  };
  const cakeV = (cx, by, s = 1) => { // 아래 가운데 기준
    g.save(); g.translate(cx, by); g.scale(s, s);
    g.beginPath(); g.ellipse(0, 0, 7.4, 1.6, 0, 0, 6.3); g.fillStyle = "#e8e8f2"; g.fill();
    rr(-5.6, -6.4, 11.2, 6.2, 1.2); g.fillStyle = lg(0, -6.4, 0, 0, ["#fff2f7", "#ffd0e2"]); g.fill();
    g.beginPath(); g.moveTo(-5.6, -5.4); for (let k = 0; k <= 8; k++) { const xx = -5.6 + k * 1.4; g.lineTo(xx, -5.4 + (k % 2 ? 1.6 : 0.4)); } g.lineTo(5.6, -6.4); g.lineTo(-5.6, -6.4); g.closePath(); g.fillStyle = "#ff6fa8"; g.fill();
    [-3, 0, 3].forEach((dx, k) => { rr(dx - 0.45, -9.4, 0.9, 3.2, 0.3); g.fillStyle = ["#7fd1ff", "#ffd166", "#c77dff"][k]; g.fill(); });
    dot(-3.6, -3, 0.5, "#ff6fa8"); dot(0.6, -2.4, 0.5, "#ff6fa8"); dot(3.4, -3.2, 0.5, "#ff6fa8");
    g.restore();
  };
  const flame = (x, y, t) => { g.save(); glow("#ffb347", 3); g.beginPath(); const h = 2.2 + Math.sin(t) * 0.4; g.moveTo(x, y - h); g.quadraticCurveTo(x + 1, y - 0.6, x, y); g.quadraticCurveTo(x - 1, y - 0.6, x, y - h); g.fillStyle = "#ffd166"; g.fill(); noGlow(); dot(x, y - 0.6, 0.35, "#ff8a3a"); g.restore(); };
  const broomV = (x, y, rot = 0) => { // 빗자루 머리(위 가운데 기준)
    g.save(); g.translate(x, y); g.rotate(rot); rr(-2, -1.2, 4, 2.2, 0.6); g.fillStyle = "#cc3333"; g.fill();
    g.beginPath(); g.moveTo(-2.4, 1); g.lineTo(2.4, 1); g.lineTo(3.6, 8); g.lineTo(-3.6, 8); g.closePath(); g.fillStyle = lg(0, 1, 0, 8, ["#f4d27a", "#c99a3a"]); g.fill();
    g.strokeStyle = "#a87a2a"; g.lineWidth = 0.35; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(k * 0.9, 1.4); g.lineTo(k * 1.4, 7.8); } g.stroke(); g.restore();
  };
  const phoneV = (x, y) => { g.save(); g.translate(x, y); g.rotate(-0.25); rr(0, 0, 5, 9, 1); g.fillStyle = "#1c1c26"; g.fill(); rr(0.6, 0.9, 3.8, 6.6, 0.5); g.fillStyle = lg(0, 0, 0, 8, ["#bfe4ff", "#3f8fe8"]); g.fill(); g.fillStyle = "#ff4f6a"; g.font = "900 2.8px sans-serif"; g.textAlign = "center"; g.fillText("112", 2.5, 4.9); g.restore(); };
  const carV = (x, y, k) => { // 30x12
    g.save(); glow("#0008", 2); rr(x + 7, y + 1.6, 16, 5, 2); g.fillStyle = "#f4f4f8"; g.fill(); rr(x, y + 5, 30, 5.2, 2); g.fillStyle = lg(0, y + 5, 0, y + 10, ["#ffffff", "#d8dce6"]); g.fill(); noGlow();
    g.fillStyle = "#2a4aa8"; g.fillRect(x + 0.4, y + 6.6, 29.2, 1.8);
    rr(x + 8.6, y + 2.6, 5.6, 2.8, 0.8); g.fillStyle = "#8fc8f0"; g.fill(); rr(x + 15.4, y + 2.6, 5.8, 2.8, 0.8); g.fill();
    rr(x + 10, y, 10, 1.8, 0.8); g.fillStyle = "#2a2a36"; g.fill();
    g.save(); glow(k ? "#ff3b4f" : "#3b7bff", 5); rr(x + 10.4, y + 0.2, 4.4, 1.4, 0.6); g.fillStyle = k ? "#ff5a6a" : "#7a1a24"; g.fill(); rr(x + 15.2, y + 0.2, 4.4, 1.4, 0.6); g.fillStyle = k ? "#1a2a6a" : "#5a8aff"; g.fill(); g.restore();
    dot(x + 6, y + 10.4, 2.3, "#16161c"); dot(x + 6, y + 10.4, 1, "#9aa0b0"); dot(x + 24, y + 10.4, 2.3, "#16161c"); dot(x + 24, y + 10.4, 1, "#9aa0b0");
    dot(x + 29.2, y + 6, 0.7, "#ffd166"); dot(x + 0.8, y + 6, 0.7, "#ff5f5f");
    g.fillStyle = "#2a4aa8"; g.font = "900 2.4px sans-serif"; g.textAlign = "center"; g.fillText("POLICE", x + 15, y + 9.4);
    g.restore();
  };
  const winV = (r) => { // 닫힌 창문(16x20)
    const wx = r.wx, wy = r.wy;
    rr(wx - 1.2, wy - 1.2, 18.4, 22.4, 1.2); g.fillStyle = lg(wx, wy, wx + 18, wy + 22, ["#e8dcff", "#a898c8"]); g.fill();
    g.fillStyle = lg(0, wy, 0, wy + 20, ["#0c1030", "#1d2752", "#2a2a5a"]); g.fillRect(wx, wy, 16, 20);
    g.fillStyle = "#0a0c1e"; g.fillRect(wx + 1, wy + 13, 4, 7); g.fillRect(wx + 6, wy + 10, 3, 10); g.fillRect(wx + 10, wy + 14, 5, 6);
    [[2, 15], [7, 12], [7, 15], [11, 16], [13, 16], [3, 17], [7.6, 13.6]].forEach(([i, j]) => { g.fillStyle = "#ffd56a"; g.fillRect(wx + i, wy + j, 0.8, 0.8); });
    dot(wx + 3.4, wy + 3.4, 0.4, "#fff"); dot(wx + 12, wy + 5, 0.35, "#cfd8ff");
    g.fillStyle = "#ffffff18"; g.beginPath(); g.moveTo(wx + 1, wy); g.lineTo(wx + 6, wy); g.lineTo(wx + 1, wy + 7); g.fill();
    g.fillStyle = "#d8ccf0"; g.fillRect(wx + 7.4, wy, 1.2, 20); rr(wx - 2, wy + 20, 20, 2.2, 0.6); g.fillStyle = "#efe4ff"; g.fill(); g.fillStyle = "#8a7aa8"; g.fillRect(wx - 2, wy + 22, 20, 0.6);
  };
  // 고해상도 배경(한 번 그려 둔다): 밤하늘·벽돌·방 안 그림·침대·거리
  const buildHi = () => {
    const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(H * KS);
    const q = c.getContext("2d"); q.setTransform(KS, 0, 0, KS, 0, 0); q.imageSmoothingEnabled = true;
    const G = q;
    G.fillStyle = (() => { const t = G.createLinearGradient(0, 0, 0, 24); t.addColorStop(0, "#050816"); t.addColorStop(1, "#1e2860"); return t; })(); G.fillRect(0, 0, W, 24);
    [[8, 3], [22, 9], [37, 4], [55, 11], [70, 2], [88, 7], [101, 13], [117, 3], [126, 12], [150, 15], [44, 15], [14, 14], [64, 8], [110, 9]].forEach(([x, y], i) => { G.beginPath(); G.arc(x + 0.5, y + 0.5, i % 3 ? 0.35 : 0.55, 0, 6.3); G.fillStyle = i % 3 ? "#cfd8ff" : "#ffffff"; G.fill(); });
    G.save(); G.shadowColor = "#fff6c0"; G.shadowBlur = 6 * KS; G.beginPath(); G.arc(136.5, 7.5, 4.2, 0, 6.3); G.fillStyle = "#fffbe0"; G.fill(); G.restore();
    G.save(); G.beginPath(); G.arc(138.8, 6.2, 3.8, 0, 6.3); G.fillStyle = "#121a48"; G.fill(); G.restore();
    // 벽돌 외벽
    { const t = G.createLinearGradient(0, 19, 0, 252); t.addColorStop(0, "#56342c"); t.addColorStop(1, "#3e241e"); G.fillStyle = t; G.fillRect(0, 19, W, 233); }
    G.strokeStyle = "#2c1813"; G.lineWidth = 0.45;
    G.beginPath(); for (let y = 19, rw = 0; y < 252; y += 4, rw++) { G.moveTo(0, y); G.lineTo(W, y); for (let x = (rw % 2) * 4; x < W; x += 8) { G.moveTo(x, y); G.lineTo(x, y + 4); } } G.stroke();
    for (let k = 0; k < 140; k++) { const x = (k * 37) % W, y = 20 + ((k * 53) % 230); G.fillStyle = k % 2 ? "#ffffff08" : "#00000014"; G.fillRect(x, y, 3.4, 3.2); }
    { const t = G.createLinearGradient(0, 18, 0, 21.5); t.addColorStop(0, "#b0907c"); t.addColorStop(1, "#5a3e34"); G.fillStyle = t; G.fillRect(0, 18, W, 3.5); }
    // 방 안: 파티룸 그림 + 테마 색
    const pim = BGI.party.ok ? BGI.party.im : null;
    rooms.forEach((r) => {
      const { x, y } = r, th = r.th;
      G.save(); G.beginPath(); G.rect(x, y, RW, RH); G.clip();
      if (pim) { const iw = pim.naturalWidth, ih = pim.naturalHeight, sc = Math.max(RW / (iw * 0.62), RH / ih), sw = RW / sc, sh = RH / sc; G.drawImage(pim, r.side === "L" ? iw * 0.08 : iw * 0.32, (ih - sh) * 0.62, sw, sh, x, y, RW, RH); }
      else { G.fillStyle = th.wall; G.fillRect(x, y, RW, RH); }
      G.globalAlpha = 0.5; G.fillStyle = th.wall; G.fillRect(x, y, RW, RH); G.globalAlpha = 1;
      const v = G.createRadialGradient(x + RW / 2, y + RH * 0.45, 8, x + RW / 2, y + RH * 0.5, RW * 0.75); v.addColorStop(0, "#00000000"); v.addColorStop(1, "#0a041a99"); G.fillStyle = v; G.fillRect(x, y, RW, RH);
      G.restore();
    });
    // 옆집·아래층: 어두운 침실 그림 + 밤 색
    NBG.forEach((n, j) => {
      const im = (j ? BGI.nb1 : BGI.nb0);
      G.save(); G.beginPath(); G.rect(n.x, n.y, n.w, n.h); G.clip();
      if (im.ok) { const I = im.im, iw = I.naturalWidth, ih = I.naturalHeight; if (j) { const sw = iw * 0.64, sh = sw * n.h / n.w; G.drawImage(I, iw - sw, ih * 0.3, sw, sh, n.x, n.y, n.w, n.h); } else { const sw = ih * n.w / n.h; G.drawImage(I, iw - sw - iw * 0.02, 0, sw, ih, n.x, n.y, n.w, n.h); } }
      else { G.fillStyle = j ? "#1c2036" : "#1a2140"; G.fillRect(n.x, n.y, n.w, n.h); }
      G.fillStyle = "rgba(10,14,44,.62)"; G.fillRect(n.x, n.y, n.w, n.h);
      const fy = n.y + n.h - 8;
      { const t = G.createLinearGradient(0, fy, 0, fy + 8); t.addColorStop(0, "#2c2638"); t.addColorStop(1, "#1a1624"); G.fillStyle = t; G.fillRect(n.x, fy, n.w, 8); }
      // 침대(벡터)
      const hb = j ? n.x + 52 : n.x + 66, mx = j ? n.x + 57 : n.x + 32, mw = j ? 40 : 35, hbh = j ? 24 : 26;
      { const t = G.createLinearGradient(hb, 0, hb + 6, 0); t.addColorStop(0, "#7a5a44"); t.addColorStop(1, "#4a3426"); G.fillStyle = t; G.beginPath(); G.roundRect ? G.roundRect(hb, fy - hbh, 6, hbh, [2.4, 2.4, 0, 0]) : G.rect(hb, fy - hbh, 6, hbh); G.fill(); }
      G.fillStyle = "#3a281c"; G.fillRect(mx + 1, fy - 6, 2, 6); G.fillRect(mx + mw - 3, fy - 6, 2, 6);
      { const t = G.createLinearGradient(0, fy - 10, 0, fy - 6); t.addColorStop(0, "#6a4a36"); t.addColorStop(1, "#40291c"); G.fillStyle = t; G.beginPath(); G.roundRect ? G.roundRect(mx, fy - 10, mw, 4, 1) : G.rect(mx, fy - 10, mw, 4); G.fill(); }
      G.fillStyle = j ? "#e0d2c4" : "#cfd6ec"; G.beginPath(); G.roundRect ? G.roundRect(mx, fy - 14.4, mw, 4.6, 1.6) : G.rect(mx, fy - 14.4, mw, 4.6); G.fill();
      if (!j) { // 협탁·시계
        G.fillStyle = "#4a3426"; G.fillRect(n.x + 22, fy - 13, 9, 13); G.fillStyle = "#6a4a36"; G.fillRect(n.x + 22, fy - 13, 9, 1); G.fillStyle = "#2a1c14"; G.fillRect(n.x + 24, fy - 8, 5, 0.6);
        G.fillStyle = "#16161e"; G.beginPath(); G.roundRect ? G.roundRect(n.x + 23, fy - 18, 7, 5, 1) : G.rect(n.x + 23, fy - 18, 7, 5); G.fill();
        G.save(); G.shadowColor = "#ff3040"; G.shadowBlur = 2 * KS; G.fillStyle = "#ff4050"; G.font = "800 3.4px sans-serif"; G.textAlign = "center"; G.fillText("1:00", n.x + 26.5, fy - 14.4); G.restore();
      }
      G.restore();
    });
    // 층 바닥판·기둥
    for (const y of [100, 180, 250]) { const t = G.createLinearGradient(0, y, 0, y + 4); t.addColorStop(0, "#b0a098"); t.addColorStop(0.3, "#7a6a64"); t.addColorStop(1, "#3a302c"); G.fillStyle = t; G.fillRect(0, y, W, 4); }
    { const t = G.createLinearGradient(78, 0, 82, 0); t.addColorStop(0, "#5a4a44"); t.addColorStop(0.4, "#8a7a74"); t.addColorStop(1, "#4a3a34"); G.fillStyle = t; G.fillRect(78, 24, 4, 76); G.fillRect(78, 104, 4, 76); }
    // 거리
    { const t = G.createLinearGradient(0, 254, 0, 270); t.addColorStop(0, "#3a3d4a"); t.addColorStop(0.2, "#23262f"); t.addColorStop(1, "#15171e"); G.fillStyle = t; G.fillRect(0, 252, W, 18); }
    G.fillStyle = "#6a6d7a"; G.fillRect(0, 254, W, 0.6);
    G.fillStyle = "#c8b850"; for (let x = 2; x < W; x += 14) { G.beginPath(); G.roundRect ? G.roundRect(x, 262.6, 7, 0.9, 0.4) : G.rect(x, 262.6, 7, 0.9); G.fill(); }
    // 가로등
    G.fillStyle = "#3a3a46"; G.fillRect(10, 236, 1.2, 18); G.fillStyle = "#5a5a68"; G.beginPath(); G.roundRect ? G.roundRect(7.6, 234.6, 6.4, 2, 1) : G.rect(7.6, 234.6, 6.4, 2); G.fill();
    { const t = G.createRadialGradient(10.6, 237, 0.5, 10.6, 244, 12); t.addColorStop(0, "rgba(255,226,150,.45)"); t.addColorStop(1, "rgba(255,226,150,0)"); G.fillStyle = t; G.fillRect(0, 236, 22, 18); }
    G.fillStyle = "#ffe9a8"; G.fillRect(8.8, 236.6, 3.8, 0.8);
    return c;
  };
  const NEON = { heart: "♥", star: "★", note: "♪", ring: "◎" };
  const drawRoom = (r) => {
    const { x, y } = r, ev = effVol(r), sing = r.cake && r.cake.ph === "sing", off = endPh >= 1;
    const lit = !off && ev > 0;
    g.save(); g.beginPath(); g.rect(x, y, RW, RH); g.clip();
    // 줄전구
    g.strokeStyle = "#140c20"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, y + 2.4); g.quadraticCurveTo(x + RW / 2, y + 7, x + RW, y + 2.4); g.stroke();
    for (let xx = x + 3, k = 0; xx < x + RW - 2; xx += 7, k++) { const yy = y + 3.4 + 1.6 * Math.sin(((xx - x) / RW) * Math.PI), c = LT[(k + r.i) % LT.length], on = lit && (Math.floor(tt * (1 + ev)) + k) % 3 !== 0; if (on) glow(c, 3); dot(xx + 1, yy + 1, 1.15, on ? c : shade(c, 0.35)); noGlow(); if (on) dot(xx + 0.7, yy + 0.6, 0.35, "#fff"); }
    // 네온 아이콘
    { const ix = x + (r.side === "L" ? 29.5 : 53.5), iy = y + 19.5, on = lit && !(Math.sin(tt * 7.1 + r.i) > 0.92); g.font = "900 9px sans-serif"; g.textAlign = "center"; if (on) glow(r.th.neon, 5); g.fillStyle = on ? r.th.neon : shade(r.th.neon, 0.35); g.fillText(NEON[r.th.ic] || "★", ix, iy); noGlow(); if (on) { g.lineWidth = 0.3; g.strokeStyle = "#ffffffaa"; g.strokeText(NEON[r.th.ic] || "★", ix, iy); } }
    // 창문
    winV(r);
    if (r.win) {
      const wx = r.wx, wy = r.wy, fl = Math.sin(tt * 9) * 1.5;
      g.fillStyle = "#05081a"; g.fillRect(wx, wy, 8, 20);
      g.save(); g.beginPath(); g.moveTo(wx + 8, wy); g.lineTo(wx + 15.5, wy - 1.6); g.lineTo(wx + 15.5, wy + 21.6); g.lineTo(wx + 8, wy + 20); g.closePath(); g.fillStyle = lg(wx + 8, 0, wx + 16, 0, ["#3a4a78", "#6a7aa8"]); g.fill(); g.strokeStyle = "#e8dcff"; g.lineWidth = 0.6; g.stroke(); g.restore();
      g.fillStyle = r.th.neon + "aa"; g.beginPath(); g.moveTo(wx, wy + 0.5); for (let j = 0; j <= 18; j += 2) g.lineTo(wx + 2.4 + fl * (j / 18) + Math.sin(tt * 7 + j) * 0.6, wy + 1 + j); g.lineTo(wx, wy + 19); g.closePath(); g.fill();
      if (lit && ev >= 2) for (let k = 0; k < 2; k++) { const ph = (tt * 0.8 + k * 0.5) % 1, nx = wx + 3 + k * 3 + Math.sin(ph * 7) * 2, ny = wy + 14 - ph * 16; g.globalAlpha = 1 - ph; g.fillStyle = VC[Math.min(4, ev)]; g.font = "900 5px sans-serif"; g.fillText("♪", nx, ny + 3); g.globalAlpha = 1; }
    }
    // 미러볼
    g.strokeStyle = "#5a5a68"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(r.mx + 0.5, y); g.lineTo(r.mx + 0.5, y + 3.4); g.stroke();
    { const bx = r.mx + 0.5, by = y + 6.6, q = g.createRadialGradient(bx - 1, by - 1.2, 0.3, bx, by, 3.4); q.addColorStop(0, "#ffffff"); q.addColorStop(0.5, "#b8b8d0"); q.addColorStop(1, "#5a5a74"); if (lit) glow("#ffffffaa", 3); dot(bx, by, 3.4, q); noGlow();
      g.save(); g.beginPath(); g.arc(bx, by, 3.4, 0, 6.3); g.clip(); g.strokeStyle = "#6a6a8466"; g.lineWidth = 0.25; g.beginPath(); for (let k = -3; k <= 3; k += 1.2) { g.moveTo(bx + k, by - 4); g.lineTo(bx + k, by + 4); g.moveTo(bx - 4, by + k); g.lineTo(bx + 4, by + k); } g.stroke(); g.restore();
      if (lit) for (let k = 0; k < 3; k++) { const a = tt * 3 + k * 2.1; dot(bx + Math.cos(a) * 2, by + Math.sin(a) * 1.6, 0.45, "#ffffff"); } }
    // 스피커 + 볼륨 칸
    const bump = lit && ev >= 2 && beatN % 2 === 0 && tt - beatT < 0.09 ? 1 : 0;
    spk(r.sx - 1, r.sy - 1 - bump, bump);
    const mxL = r.side === "L" ? r.sx + 13 : r.sx - 4;
    rr(mxL - 1.2, r.sy - 0.4, 4.4, 22.8, 1.4); g.fillStyle = "#0d0a16"; g.fill();
    for (let k = 0; k < 4; k++) { const on = k < ev, c = on ? VC[ev] : "#2a2638"; if (on) glow(c, 2.5); rr(mxL, r.sy + 17 - k * 5, 2, 4, 0.8); g.fillStyle = c; g.fill(); noGlow(); if (on && ev >= 3 && Math.floor(tt * 6) % 2) { g.fillStyle = "#ffffffaa"; g.fillRect(mxL + 0.3, r.sy + 17.3 - k * 5, 1.4, 0.8); } }
    if (tt - r.flash < 0.3) { g.globalAlpha = 1 - (tt - r.flash) / 0.3; rr(mxL - 1.2, r.sy - 1, 4.4, 24, 1.4); g.fillStyle = "#ffffff"; g.fill(); g.globalAlpha = 1; }
    // 손님(캐릭터 그림): 흥이면 웃음, 노잼이면 시무룩, 문자 받으면 깜짝
    const fy = y + RH - 5;
    const order = r.side === "L" ? [0, 2, 1] : [0, 2, 1];
    order.forEach((k) => {
      const q = r.ppl[k];
      let a = 1; if (endPh >= 1) { a = clamp(1 - (tt - endT - 0.2 - k * 0.12) / 0.5, 0, 1); if (!a) return; }
      let oy = 0, ox = 0, rot = 0, ex = "smile";
      if (sing) { oy = -Math.abs(Math.sin(tt * 6 + q.ph)) * 1.6; ox = Math.sin(tt * 2 + k) * 1; rot = Math.sin(tt * 3 + k) * 0.05; ex = Math.floor(tt * 1.5 + k) % 2 ? "smile" : "blush"; }
      else if (lit && ev >= 2) { oy = -Math.abs(Math.sin(tt * (4 + ev * 1.6) + q.ph)) * (ev - 1) * 0.9; rot = Math.sin(tt * (2 + ev) + q.ph) * 0.03 * ev; ex = ev >= 4 && k === 1 ? "blush" : "smile"; }
      else if (endPh >= 1) { ox = (tt - endT) * 30 * (r.side === "R" ? -1 : 1); ex = "neutral"; }
      else ex = "sad";
      if (!off && (tt - r.tapT < 0.9 || pol)) ex = "surprised";
      const cx = q.x + 8 + ox, hh = 41;
      if (!body(q.art, ex, cx, fy - hh + 6 + oy, hh, { a, rot, fade: 0.32 })) {
        let fr = 0, arm, v = "f"; if (endPh >= 1) { v = "s"; fr = Math.floor(tt * 6) % 4; }
        const sp = uSprite(q.p, v + fr + (arm || ""), { v, f: fr, arm }, v === "s" && r.side === "R");
        g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = a; g.drawImage(sp, q.x + (v === "s" && r.side === "R" ? -ox : ox), fy - 29 + oy); g.restore();
      }
      if (!sing && !off && ev <= 1 && Math.floor(tt * 2 + k) % 3 === 0) { g.fillStyle = "#bcd0ff"; g.font = "800 4px sans-serif"; g.textAlign = "center"; g.fillText("…", cx, fy - 37); }
    });
    // 바닥 그림자
    g.fillStyle = lg(0, fy - 4, 0, y + RH, ["#00000000", "#0a061888"]); g.fillRect(x, fy - 4, RW, y + RH - fy + 4);
    // 케이크
    if (r.cake && (r.cake.ph === "warn" || sing)) {
      const cx = x + RW / 2 + (r.side === "L" ? 4 : -4);
      if (sing) {
        g.save(); glow("#0008", 2); rr(cx - 11, fy - 8, 22, 2.6, 1); g.fillStyle = lg(0, fy - 8, 0, fy - 5.4, ["#d09a6a", "#8a5a34"]); g.fill(); noGlow(); g.fillStyle = "#5a3820"; g.fillRect(cx - 9, fy - 5.4, 1.6, 5); g.fillRect(cx + 7.4, fy - 5.4, 1.6, 5); g.restore();
        cakeV(cx, fy - 8.2);
      } else if (Math.floor(tt * 4) % 2) { g.save(); glow("#ff6fb5", 4); cakeV(cx, y + 34, 0.9); g.restore(); }
    }
    // 어둠(볼륨 낮을수록, 떼창 땐 촛불만)
    const dk = off ? 0.55 : sing ? 0.45 : ev === 0 ? 0.55 : ev === 1 ? 0.28 : 0;
    if (dk) { g.fillStyle = `rgba(6,4,20,${dk})`; g.fillRect(x, y, RW, RH); }
    if (sing) {
      const cx = x + RW / 2 + (r.side === "L" ? 4 : -4);
      g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(cx, fy - 17, 1, cx, fy - 17, 24); rg.addColorStop(0, "rgba(255,200,110,.5)"); rg.addColorStop(1, "rgba(255,200,110,0)"); g.fillStyle = rg; g.fillRect(cx - 24, fy - 42, 48, 48); g.globalCompositeOperation = "source-over";
      [-3, 0, 3].forEach((dx, k) => flame(cx + dx, fy - 17.6, tt * 14 + k));
    }
    // 디스코 빛
    if (lit && !sing) { g.globalCompositeOperation = "lighter"; for (let k = 0; k < ev * 3; k++) { const an = tt * (0.6 + ev * 0.25) + k * 1.3, rd = 10 + (k % 4) * 8, dx = r.mx + Math.cos(an) * rd * 1.2, dy = y + 36 + Math.sin(an) * rd * 0.6; const q = g.createRadialGradient(dx, dy, 0, dx, dy, 2.2); q.addColorStop(0, LT[k % LT.length] + "aa"); q.addColorStop(1, LT[k % LT.length] + "00"); g.fillStyle = q; g.fillRect(dx - 2.2, dy - 2.2, 4.4, 4.4); } g.globalCompositeOperation = "source-over"; }
    g.restore();
    // 시끄러움 테두리
    if (!off && ev >= 3) { const on = Math.floor(tt * (ev === 4 ? 8 : 4)) % 2; if (on) { g.save(); glow(VC[ev], 4); rr(x + 0.5, y + 0.5, RW - 1, RH - 1, 1.5); g.lineWidth = 1; g.strokeStyle = VC[ev]; g.stroke(); g.restore(); } }
    if (tt - r.tapT < 0.25) { g.globalAlpha = 0.25 * (1 - (tt - r.tapT) / 0.25); g.fillStyle = "#ffffff"; g.fillRect(x, y, RW, RH); g.globalAlpha = 1; }
  };
  const drawSleeper = (n) => {
    const fy = n.y + n.h - 8, right = n.j === 0;
    const by = fy - 14, br = Math.sin(tt * 2.2 + n.j) * 0.6 + 0.5, toss = n.anger >= 45 ? Math.sin(tt * 9) * (n.anger >= 65 ? 1 : 0.6) : 0;
    const hx = right ? n.x + 58 : n.x + 59, bx0 = right ? n.x + 34 : n.x + 66, bw = 24;
    // 베개
    const px = right ? n.x + 59 : n.x + 56; g.save(); glow("#0006", 1.5); rr(px - 1, by - 4.4, 11, 4.4, 2); g.fillStyle = lg(0, by - 4.4, 0, by, ["#ffffff", "#c8c8dc"]); g.fill(); g.restore();
    // 얼굴(누운 그림). 자면 눈 감은 표정, 화나면 찌푸림
    const ex = n.anger >= 65 ? "angry" : n.anger >= 45 ? "sad" : "blush";
    const fx = right ? hx + 4.4 + toss : hx + 1.6 + toss;
    if (!headLying(n.art, ex, fx, by - 5.4, 12, right ? Math.PI / 2 : -Math.PI / 2)) {
      const s = n.spec; g.save(); g.imageSmoothingEnabled = false; P(hx + toss, by - 7, 6, 5, s.skin); P(hx + toss, by - 8, 6, 2, s.hair); g.restore();
    }
    // 이불
    const bc = n.j ? "#a86a8a" : "#5a7ad0";
    g.save(); glow("#0007", 1.5); g.beginPath(); const b0 = right ? bx0 : bx0, b1 = bx0 + bw + (right ? 1.4 : 0);
    g.moveTo(b0, by - 0.5); g.quadraticCurveTo(b0 + 2, by - 5.4 - br, b0 + bw * 0.4, by - 5.6 - br); g.quadraticCurveTo(b0 + bw * 0.8, by - 6.2 - br, b1, by - 4.6 - br * 0.6); g.lineTo(b1, by + 0.6); g.closePath();
    g.fillStyle = lg(0, by - 6, 0, by + 1, [shade(bc, 1.3), bc, shade(bc, 0.7)]); g.fill(); g.restore();
    g.strokeStyle = shade(bc, 0.7); g.lineWidth = 0.4; g.beginPath(); g.moveTo(bx0 + 6, by - 4.6 - br); g.lineTo(bx0 + 6.6, by); g.moveTo(bx0 + 15, by - 5 - br); g.lineTo(bx0 + 15.4, by); g.stroke();
    if (n.anger < 40 && endPh < 2) { const ph = (tt * 0.5 + n.j * 0.4) % 1, zx = hx + (right ? -4 : 6) + ph * 6, zy = by - 9 - ph * 10; g.globalAlpha = 1 - ph; g.fillStyle = "#cfe0ff"; g.font = `900 ${4 + ph * 2}px sans-serif`; g.textAlign = "center"; g.fillText("Z", zx, zy); g.font = "900 3px sans-serif"; g.fillText("z", zx + 3.4, zy + 2.6); g.globalAlpha = 1; }
  };
  const drawNb = (n) => {
    const fy = n.y + n.h - 8, a = n.anger;
    if (a > 30 && endPh < 2) { g.fillStyle = `rgba(255,40,60,${0.18 * clamp((a - 30) / 70, 0, 1) * (0.7 + 0.3 * Math.sin(tt * 6))})`; g.fillRect(n.x, n.y, n.w, n.h); }
    if (endPh >= 2) { g.fillStyle = `rgba(255,220,160,${0.18 * clamp((tt - endT - 1.1) / 0.8, 0, 1)})`; g.fillRect(n.x, n.y, n.w, n.h); }
    g.save(); g.beginPath(); g.rect(n.x, n.y, n.w, n.h); g.clip();
    // 아래층 빗자루(기대 둠)
    if (n.j === 1 && n.st !== "knock") { g.strokeStyle = lg(0, n.y + 30, 0, fy, ["#a8743a", "#6a4420"]); g.lineWidth = 0.9; g.lineCap = "round"; g.beginPath(); g.moveTo(n.x + 14, n.y + 30); g.lineTo(n.x + 12.4, fy - 9); g.stroke(); broomV(n.x + 12.2, fy - 9.4, 0.05); }
    if (n.st === "knock" || n.st === "call") {
      const up = n.st === "knock", kx = n.j ? n.x + 18 : n.x + 4, hh = n.j ? 44 : 46, cx = kx + 8, top = fy - hh + 8;
      if (n.j === 1 && up) {
        const poke = Math.max(0, 1 - ((el - n.thump + 0.55) / 0.18)) > 0 ? 0 : 3;
        const hx = kx + 15, tp = n.y + 1 + poke;
        if (!body(n.art, "angry", cx, top - (poke ? 0 : 1), hh)) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(uSprite(n.p, "u", { v: "f", arm: "up" }, false), kx, fy - 29); g.restore(); }
        g.strokeStyle = lg(0, tp, 0, fy, ["#a8743a", "#6a4420"]); g.lineWidth = 1; g.lineCap = "round"; g.beginPath(); g.moveTo(hx, tp); g.lineTo(hx, fy - 12); g.stroke(); broomV(hx, fy - 12.6, 0);
        dot(hx, top + hh * 0.42, 1.6, "#f2c8a8");
        if (!poke) { g.save(); glow("#fff3a0", 4); g.fillStyle = "#fff3a0"; g.fillRect(hx - 6, n.y, 13, 0.9); g.restore(); }
      } else if (up) {
        const hit = Math.floor((el - n.stT) / 0.275) % 2;
        if (!body(n.art, "angry", cx + (hit ? -1 : 0), top, hh, { flip: true })) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(uSprite(n.p, "s", { v: "s", f: 0 }, true), kx + (hit ? -1 : 0), fy - 29); g.restore(); }
        dot(n.x + 2.6 + (hit ? -0.8 : 0), top + hh * 0.38, 1.8, "#f2c8a8");
        if (hit) { g.save(); glow("#fff3a0", 4); g.strokeStyle = "#fff3a0"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(n.x + 0.5, n.y + 26); g.lineTo(n.x + 0.5, n.y + 50); g.stroke(); g.restore(); }
      } else {
        if (!body(n.art, Math.floor(tt * 2) % 2 ? "angry" : "surprised", cx, top, hh)) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(uSprite(n.p, "f", { v: "f" }, false), kx, fy - 29); g.restore(); }
        phoneV(cx + 3.4, top + 6);
      }
      // 빈 침대(이불 젖힘)
      const right = n.j === 0, bx0 = right ? n.x + 34 : n.x + 66, by = fy - 14, bc = n.j ? "#a86a8a" : "#5a7ad0";
      rr(right ? n.x + 58 : n.x + 56, by - 4.4, 11, 4.4, 2); g.fillStyle = "#e8e8f4"; g.fill();
      rr(bx0 + 2, by - 3, 22, 3, 1.2); g.fillStyle = lg(0, by - 3, 0, by, [shade(bc, 1.25), bc]); g.fill();
    } else drawSleeper(n);
    g.restore();
    // 화 막대(얼굴 + 막대)
    const gx = n.x + n.w - 34, gy = n.y + 3;
    rr(gx - 1.4, gy - 1.4, 34, 7.8, 3.9); g.fillStyle = "#0b0d1ee8"; g.fill();
    const fc = a >= 75 ? "#ff4f6a" : a >= 45 ? "#ffb347" : "#7fd1ff";
    dot(gx + 2.5, gy + 2.5, 2.7, fc); g.fillStyle = "#1a1020"; dot(gx + 1.5, gy + 1.9, 0.45, "#1a1020"); dot(gx + 3.5, gy + 1.9, 0.45, "#1a1020");
    g.strokeStyle = "#1a1020"; g.lineWidth = 0.45; g.beginPath(); if (a >= 45) { g.moveTo(gx + 1.4, gy + 3.9); g.quadraticCurveTo(gx + 2.5, gy + 3.1, gx + 3.6, gy + 3.9); } else { g.moveTo(gx + 1.4, gy + 3.2); g.quadraticCurveTo(gx + 2.5, gy + 4.2, gx + 3.6, gy + 3.2); } g.stroke();
    rr(gx + 7, gy + 1, 24, 3, 1.5); g.fillStyle = "#2a2440"; g.fill();
    if (a > 1) { rr(gx + 7, gy + 1, 24 * a / 100, 3, 1.5); g.fillStyle = lg(gx + 7, 0, gx + 31, 0, ["#7fd1ff", "#ffb347", "#ff4f6a"]); g.fill(); }
    g.fillStyle = "#ffffffaa"; g.fillRect(gx + 7 + 24 * 0.75 - 0.3, gy + 0.2, 0.6, 4.6);
  };
  const ringPix = (cx, cy, rd, col, a) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 0.7; g.beginPath(); g.ellipse(cx, cy, rd, rd * 0.75, 0, 0, 6.2832); g.stroke(); g.globalAlpha = 1; };
  const render = () => {
    g.setTransform(KS, 0, 0, KS, 0, 0);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.imageSmoothingEnabled = false;
    const ready = (BGI.party.ok || BGI.party.bad) && (BGI.nb0.ok || BGI.nb0.bad) && (BGI.nb1.ok || BGI.nb1.bad);
    if (!BGH && ready) BGH = buildHi();
    if (BGH) { g.imageSmoothingEnabled = true; g.drawImage(BGH, 0, 0, W, H); } else g.drawImage(BG, 0, 0);
    g.imageSmoothingEnabled = true;
    // 새벽 하늘
    if (endPh >= 2) { const p = clamp((tt - endT - 1.1) / 0.9, 0, 1); g.globalAlpha = p; g.fillStyle = lg(0, 0, 0, 18, ["#7ab8f0", "#ffb88a"]); g.fillRect(0, 0, W, 18); g.globalAlpha = 1; }
    for (const r of rooms) drawRoom(r);
    for (const n of nbs) drawNb(n);
    // 소리 고리
    for (const q of rings) { const p = (tt - q.t0) / 0.75; if (p >= 0 && p <= 1) ringPix(q.x, q.y, 6 + p * q.R, q.c, (1 - p) * 0.8); }
    const car = pol || leaving || (ending && ending.car ? ending : null);
    if (car) {
      let cx;
      if (pol) { const p = clamp((el - pol.t0) / Math.min(2.2, pol.dur * 0.6), 0, 1); cx = 176 - (176 - 92) * (1 - Math.pow(1 - p, 3)); }
      else if (leaving) { const p = clamp((el - leaving.left) / 1.6, 0, 1); cx = 92 - p * 140; if (p >= 1) leaving = null; }
      else cx = 92 + Math.max(0, 1 - (tt - endT - 1.9) / 0.6) * 84;
      if (cx != null) {
        const k = Math.floor(tt * 6) % 2;
        carV(cx, 253, k);
        g.globalCompositeOperation = "lighter"; g.fillStyle = k ? "rgba(255,40,60,.14)" : "rgba(40,90,255,.14)"; g.fillRect(0, 100, W, 170); g.globalCompositeOperation = "source-over";
      }
    }
    // 입자
    for (const q of pts) { g.globalAlpha = clamp(q.l / q.m, 0, 1); if (q.s > 1) { g.fillStyle = q.c; g.save(); g.translate(q.x, q.y); g.rotate(q.l * 8); g.fillRect(-1, -0.6, 2, 1.2); g.restore(); } else dot(q.x, q.y, 0.6, q.c); }
    g.globalAlpha = 1;
  };

  // ── 루프 ──
  let last = 0;
  const loop = (now) => {
    if (done || !cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tt += dt;
    if (tut === -9) { tutT += dt; if (tutT > 0.35) { if (opts.retry) { tut = 0; startGame(); } else tutNext(1); } }
    else if (tut >= 1) {
      rooms.forEach((r) => { if (r.cake) r.cake = null; });
      guide(tut === 1 ? { ...rPt(rooms[1]), t: "빨간 방 <b>톡!</b>" } : tut === 2 ? { x: rooms[2].wx + 8, y: rooms[2].wy + 10, t: "창문 <b>톡!</b>" } : null);
    } else if (started && !over) { stepGame(dt); guide(taskNow()); }
    // 박자: 쿵쿵 베이스 + 소리 고리
    const mv = Math.max(...rooms.map(effVol));
    if (!over && tt - beatT >= 0.42) {
      beatT = tt; beatN++;
      if (mv >= 2 && tut !== -9) { tone(58, 0.11, "sine", 0.03 + 0.025 * (mv - 2), -18); if (mv >= 3 && beatN % 2) noise(0.03, 7000, 0.02 + 0.01 * (mv - 3)); }
      for (const r of rooms) { const v = effVol(r); if (v >= 3 && (v === 4 || beatN % 2 === 0)) rings.push({ x: r.sx + 6, y: r.sy + 13, t0: tt, R: v === 4 ? 40 : 24, c: VC[v] }); if (r.win && v >= 2) rings.push({ x: r.wx + 8, y: r.wy + 10, t0: tt, R: 18, c: VC[v] }); }
    }
    for (let i = rings.length - 1; i >= 0; i--) if (tt - rings[i].t0 > 0.8) rings.splice(i, 1);
    for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; q.l -= dt; if (q.l <= 0) { pts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy += q.gr * dt; }
    if (endPh === 1 && tt - endT > 1.1) { endPh = 2; SFX.whoosh(); [2400, 2900, 2600].forEach((f, i) => tone(f, 0.07, "sine", 0.05, 400, i * 0.12)); }
    lbUpd(); clock(); if (Math.floor(tt * 4) !== Math.floor((tt - dt) * 4)) updSc();
    render();
    raf = requestAnimationFrame(loop);
  };

  // ── 끝: 퇴실 → 새벽 → 쪽지 또는 경찰차 ──
  const end = () => {
    if (over) return; over = true; tm?.stop(); guide(null);
    if (pol) { const p = pol; resolvePol(); leaving = null; void p; }
    polEl.classList.remove("on");
    rooms.forEach((r) => { if (r.cake && r.cake.ph === "warn") { r.cake = null; cakesN = Math.max(0, cakesN - 1); } });
    const time = Math.max(1, timeSum);
    const funAvg = rooms.reduce((a, r) => a + r.funSum, 0) / (3 * time), angAvg = angSum / time;
    const funS = clamp((funAvg - 0.3) / 0.5, 0, 1);
    const sleepS = clamp(1 - (angAvg - 10) / 55 - knocks * 0.04 - fails * 0.08, 0, 1);
    const cakeS = cakesN ? cakesOK / cakesN : 1;
    const s = clamp(0.85 * Math.sqrt(funS * sleepS) + 0.15 * cakeS - 0.04 * calls - 0.1 * fails, 0, 1);
    const star = st5(funAvg).toFixed(1);
    endT = tt; endPh = 1;
    rooms.forEach((r) => { r.vol = 0; r.win = false; if (r.cake) r.cake = null; });
    F.msg("새벽 1시, 영업 끝! 손님 퇴실"); SFX.whoosh(); updSc();
    const bad = fails > 0 || sleepS < 0.35, good = !bad && sleepS >= 0.65 && calls === 0;
    ending = { car: bad };
    setTimeout(() => {
      if (done || !cv.isConnected) return;
      const nb = good ? "아래층" : nbs[0].anger > nbs[1].anger ? "옆집" : "아래층";
      const e = document.createElement("div"); e.className = "p3note" + (bad ? " bad" : "");
      e.innerHTML = good ? `어젯밤 조용했어요.<br>덕분에 푹 잤어요 :)<small>- ${nb} 드림</small>`
        : bad ? `밤마다 이러면 못 살아요!<br>또 시끄러우면 건물주에게 말할게요.<small>- ${nb}</small><em>건물주: 사장님, 민원 또 들어왔어요…</em>`
        : `어젯밤 조금 시끄러웠어요…<br>다음엔 조금만 부탁해요.<small>- ${nb}</small>`;
      wrap.appendChild(e); requestAnimationFrame(() => e.classList.add("on"));
      if (good) { SFX.ding(5); setTimeout(() => SFX.ding(8), 140); confetti(W / 2, 200, 18); }
      else if (bad) { siren(0); setTimeout(() => siren(1), 360); setTimeout(() => siren(2), 720); vib([30, 40, 30]); }
      else tone(660, 0.18, "triangle", 0.08, -120);
    }, 2100);
    setTimeout(() => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      finish(s, `손님 별점 <b>★${star}</b> · 이웃 꿀잠 ${Math.round(sleepS * 100)}% · 신고 ${calls}번${fails ? ` · 경찰 출동 ${fails}번` : ""}`, "", [["손님 흥", funS], ["이웃 꿀잠", sleepS], ["떼창 지킴", cakeS]]);
    }, 4300);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.pr3 = {
    st: () => ({ el: +el.toFixed(2), vol: rooms.map((r) => r.vol), fun: rooms.map((r) => +r.fun.toFixed(2)), win: rooms.map((r) => r.win), anger: nbs.map((n) => Math.round(n.anger)), nbst: nbs.map((n) => n.st), pol: !!pol, calls, fails, knocks, cakesOK, cakesBroken, cakesN, over }),
    tut: () => (tut === -9 ? 0 : tut),
    tutDo: () => { if (tut === 1) sendMsg(rooms[1]); else if (tut === 2) closeWin(rooms[2]); else if (tut === 3) startGame(); },
    start: startGame,
    auto: () => {
      if (tut >= 1 || !started || over) return;
      for (const r of rooms) if (r.win) closeWin(r);
      const ck = rooms.find((r) => r.cake && r.cake.ph === "warn");
      for (const r of rooms) {
        const sing = r.cake && r.cake.ph === "sing";
        if (pol) { if (r.vol > 1 || sing) sendMsg(r); continue; }
        if (sing) continue;
        const cs = rooms.find((q) => q.cake && q.cake.ph === "sing");
        if (r.vol >= 3 || ((ck || cs) && r.vol >= 2 && nbs.some((n) => n.anger > 35))) sendMsg(r);
      }
    },
    auto1: () => { if (tut >= 1 || !started || over) return; const w = rooms.find((r) => r.win); if (w) return closeWin(w); const r = loudest(); if (r && (r.vol >= 3 || (pol && r.vol > 1))) sendMsg(r); },
    spam: () => { if (started && !over) rooms.forEach((r) => sendMsg(r)); },
  };
  lbUpd(); clock(); updSc(); render();
  raf = requestAnimationFrame(loop);
}
