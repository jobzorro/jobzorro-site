// 미니게임 1탄(tutoring1) "졸지 마 학생아": 퇴근 후 화상과외. 학생은 캐릭터 그림(표정 시트), 방은 실제 배경 그림, 책상·고양이·칠판·아이콘은 고해상도 벡터(그림 실패 때만 도트).
// 화상 수업 격자(학생 4명)에서 딴짓하는 학생을 찾아 이름을 불러 깨운다.
// 졸기 = 톡톡(빠르게 두 번), 폰 보기 = 밀기(퀴즈 던지기), 카메라 끔 = 꾹 길게, 고양이·음소거 = 톡 한 번. 잘 듣는 학생을 부르면 서운해한다.
// 중간 '오늘의 퀴즈' 때 모두 집중해 있으면 보너스. 끝나면 "감사합니다~" 하고 화면이 하나씩 꺼지고 학부모 메시지가 온다. 30초.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

// 학생 이름(흔한 이름, 실제 인물 아님)과 사는 곳(시공간 파괴: 전국 어디서든 접속)
const NAMES = ["지우", "서준", "하윤", "도윤", "예린", "민재", "수아", "태오", "유나", "시우", "채원", "준호", "다인", "건우"];
const TOWNS = ["제주", "부산", "강릉", "전주", "여수", "춘천", "목포", "울산", "안동", "통영", "속초", "포항"];
const ya = (n) => { const c = n.charCodeAt(n.length - 1) - 0xac00; return n + (c >= 0 && c <= 11171 && c % 28 ? "아" : "야"); };
const CALL = {
  sleep: (n) => `${ya(n)}~ 이 문제 풀어 볼까?`, phone: (n) => `${ya(n)}! 퀴즈 간다, 받아!`, camoff: (n) => `${ya(n)}, 카메라 켜 줄래?`,
  cat: (n) => `${ya(n)}~ 냥이는 잠깐 내려놓자`, mute: (n) => `${ya(n)}, 음소거 풀어 볼까?`,
};
const REPLY = {
  sleep: ["네, 네! 안 잤어요!", "헉 깜짝이야… 풀게요!", "(벌떡) 몇 번이요?!"], phone: ["앗 들켰다ㅋㅋ 풀게요!", "폰 내려놨어요!", "헉 네! 풀어 볼게요"],
  camoff: ["켰어요~ 렉 걸렸어요ㅠ", "죄송해요, 지금 켰어요!", "보이세요?"], cat: ["죄송해요ㅋㅋ 얘가 자꾸…", "냥이 퇴장~", "얘 이름 두부예요ㅎㅎ"],
  mute: ["아 들려요? 질문이요!", "음소거였네요ㅋㅋ", "다시 말할게요!"],
};
const SAD = ["저 듣고 있었는데요…", "저 필기 중이었어요ㅠ", "네…? 저 집중했는데…", "(시무룩)"];
const NUDGE = ["음냐…", "5분만…", "zz…"];
const WRONGM = { sleep: "조는 학생은 톡톡! 빠르게 두 번", phone: "폰 보는 학생은 쓱 밀어서 퀴즈 던지기!", camoff: "카메라 끈 학생은 꾹 길게 눌러요", cat: "고양이는 톡 한 번!", mute: "음소거는 톡 한 번!" };
const TAG = { sleep: "톡톡", phone: "쓱 밀기", camoff: "꾹 누르기", cat: "톡", mute: "톡" };
const GEST = { sleep: "dbl", phone: "swipe", camoff: "hold", cat: "tap", mute: "tap" };
const HMODE = { dbl: "dbl", swipe: "swipe", hold: "hold", tap: "tap" };
const KINDS = ["sleep", "phone", "camoff", "cat", "mute"], KW = [3, 3, 2, 1.6, 1.4];
const DRAIN = { sleep: 14, phone: 12, camoff: 16, cat: 10, mute: 9 };
const MUTED = ["쌤! 질문 있어요!", "선생님~ 저 다 풀었어요!", "이거 왜 3이에요?", "쌤 안 들려요?"];
const QUIZ = [["2x + 3 = 11", "x = ?", "4요!"], ["x² = 49 (x>0)", "x = ?", "7이요!"], ["3x − 5 = 10", "x = ?", "5요!"], ["(x−2)(x−3) = 0", "큰 근은?", "3이요!"]];
const IDLE = ["자, 여기 인수분해 보자~", "이 부분 시험에 꼭 나와요!", "질문 있으면 말해요~", "다들 필기하고 있죠?", "좋아요, 다음 줄!"];
const LESSON = ["오늘: 인수분해", "x² − 5x + 6 = 0", "(x − 2)(x − 3) = 0", "x = 2 또는 x = 3"];

const SKIN = ["#f7d5b8", "#f0c8a4", "#e2b48c", "#c99470", "#a87454"];
const HAIR = ["#2a2018", "#3b2a1e", "#5a3b22", "#1b1b22", "#7a4a2a", "#c9a050", "#4a2a3a"];
const TOPS = ["#5b7bd9", "#e0607a", "#3e9e6a", "#e0b040", "#8a5fc0", "#2f3d5c", "#5bb8c8", "#ff9f7a", "#4a4a52", "#c94f8a"];
const WALLS = ["#e9dcc6", "#cfdde6", "#ecd3dc", "#d6e6cf", "#ddd3ee", "#f0e0c0"];
const DESKS = ["#c48a5c", "#b8b0a4", "#e0c8a0", "#8a6a50", "#e8e4dc"];
const CATS = [["#f0a040", "#c87020", "#ffe6c0"], ["#9aa0b0", "#6a7080", "#eef0f4"], ["#3a3440", "#24202a", "#f2f2f2"], ["#f4efe6", "#c8b8a0", "#ffffff"]];
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };

const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
// 어두운 1픽셀 테두리
function outline(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 200;
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) add.push((y * W + x) * 4);
  for (const i of add) { a[i] = 26; a[i + 1] = 16; a[i + 2] = 34; a[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}
const mkCv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const PF = (g) => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// 도트 손가락(안내). X 테두리, o 살
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function paintFinger(P, x0, y0) { FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(x0 + x, y0 + y, 1, 1, ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"); })); }
function fingerURL() { const c = mkCv(13, 13), P = PF(c.getContext("2d")); paintFinger(P, 0, 0); return c.toDataURL(); }

// 학생 겉모습
function stuSpec(style) {
  return { skin: pick(SKIN), hair: pick(HAIR), style, top: pick(["hoodie", "uniform", "tee", "hoodie", "uniform"]), tc: pick(TOPS), glasses: rnd() < 0.3, headset: rnd() < 0.45, hs: pick(["#2a2a34", "#e8e8f0", "#ff7eb6", "#5fb8ff"]), desk: pick(DESKS), cat: pick(CATS) };
}
// 학생 상반신 + 책상. o: { dy 고개, eye n|close|down|happy|wide|sad, mouth n|open|o|smile|sad|drool, arm desk|write|phone|up|wave, f 프레임, glow, sweat, mark, card }
function paintStu(g, s, cx, deskY, o, tx, tw, bot) {
  const P = PF(g);
  if (o.noBody) { const dc = s.desk; P(tx, deskY, tw, bot - deskY, dc); P(tx, deskY, tw, 1, tint(dc, 1.15)); P(tx, deskY + 1, tw, 1, tint(dc, 0.85)); P(cx - 11, deskY + 2, 15, 5, "#f8f4e8"); P(cx - 11, deskY + 2, 15, 1, "#fff"); P(cx - 9, deskY + 3, 9, 1, "#c8c0d8"); P(cx - 9, deskY + 5, 7, 1, "#c8c0d8"); P(cx - 4, deskY + 2, 1, 5, "#e0d0c0"); return; }
  const sk = s.skin, skD = tint(sk, 0.86), hc = s.hair, hcL = tint(hc, 1.5), hcD = tint(hc, 0.72), tc = s.tc, tcD = tint(tc, 0.78), tcL = tint(tc, 1.18), D = "#2a1e2e";
  const sy = deskY - 13, hy = sy - 16 + (o.dy || 0), st = s.style, arm = o.arm || "desk", f = o.f || 0;
  // 뒷머리
  if (st === "long") P(cx - 9, hy + 3, 18, 22, hcD); else if (st === "bob") P(cx - 9, hy + 3, 18, 12, hcD); else if (st === "pony") { P(cx + 7, hy + 4, 4, 11, hcD); P(cx + 8, hy + 15, 3, 2, hcD); }
  // 든 팔(몸통보다 먼저)
  if (arm === "up" || arm === "wave") {
    const ax = cx + 12 + (arm === "wave" && f ? 2 : 0);
    P(cx + 11, sy + 1, 4, 4, tcD); P(ax + 1, sy - 9, 3, 11, tcD); P(ax, sy - 15, 5, 6, sk); P(ax, sy - 16, 1, 1, sk); P(ax + 2, sy - 17, 1, 2, sk); P(ax + 4, sy - 16, 1, 1, sk); P(ax, sy - 10, 5, 1, skD);
    if (o.card) { P(ax - 2, sy - 22, 9, 7, "#fffdf2"); P(ax - 2, sy - 22, 9, 1, "#ffd166"); P(ax + 1, sy - 20, 3, 1, "#e0307a"); P(ax + 3, sy - 19, 1, 1, "#e0307a"); P(ax + 2, sy - 18, 1, 1, "#e0307a"); P(ax + 2, sy - 16, 1, 1, "#e0307a"); }
  }
  // 몸통
  const tb = deskY - sy + 1;
  P(cx - 12, sy, 24, 2, tc); P(cx - 14, sy + 2, 28, tb - 2, tc); P(cx - 14, sy + 2, 2, tb - 2, tcD); P(cx + 12, sy + 2, 2, tb - 2, tcD); P(cx - 12, sy, 24, 1, tcL);
  if (s.top === "hoodie") { P(cx - 7, sy - 1, 14, 3, tcD); P(cx - 4, sy, 8, 2, tint(tc, 0.62)); P(cx - 3, sy + 2, 1, 6, "#f2f2f2"); P(cx + 2, sy + 2, 1, 6, "#f2f2f2"); P(cx - 7, deskY - 3, 14, 1, tcD); }
  else if (s.top === "uniform") { P(cx - 3, sy, 6, 7, "#f4f4f8"); P(cx - 2, sy + 7, 4, 2, "#f4f4f8"); P(cx - 1, sy + 1, 2, 8, "#c0304a"); P(cx - 1, sy + 1, 2, 1, "#e05a6a"); P(cx - 5, sy + 1, 2, 9, tcD); P(cx + 3, sy + 1, 2, 9, tcD); P(cx + 6, sy + 4, 3, 1, "#ffd166"); }
  else { P(cx - 3, sy, 6, 2, sk); P(cx - 2, sy + 2, 4, 1, sk); P(cx - 4, sy + 5, 8, 4, tcL); P(cx - 1, sy + 6, 2, 2, "#fff"); }
  const nk = sy - (hy + 14);
  if (nk > 0) P(cx - 2, hy + 14, 4, nk + 1, skD);
  // 머리
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
  P(cx - 7, hy + 11, 2, 1, "#f39aa6"); P(cx + 5, hy + 11, 2, 1, "#f39aa6");
  const my = hy + 12, M = "#b04a5a", mo = o.mouth || "n";
  if (mo === "open") { P(cx - 1, my, 3, 2, "#6a1f2a"); P(cx, my + 1, 1, 1, "#e07080"); }
  else if (mo === "o") P(cx - 1, my, 2, 2, "#6a1f2a");
  else if (mo === "smile") { P(cx - 2, my, 1, 1, M); P(cx - 1, my + 1, 2, 1, M); P(cx + 1, my, 1, 1, M); }
  else if (mo === "sad") { P(cx - 2, my + 1, 1, 1, M); P(cx - 1, my, 2, 1, M); P(cx + 1, my + 1, 1, 1, M); }
  else if (mo === "drool") { P(cx - 1, my, 2, 2, "#6a1f2a"); P(cx + 1, my + 1, 1, 2, "#bfe8ff"); }
  else P(cx - 1, my, 2, 1, M);
  if (s.glasses) { const G = "#3a2a3a"; for (const x of [cx - 6, cx + 2]) { P(x, ey - 1, 4, 1, G); P(x, ey + 2, 4, 1, G); P(x, ey - 1, 1, 4, G); P(x + 3, ey - 1, 1, 4, G); } P(cx - 2, ey, 4, 1, G); }
  // 앞머리
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
  if (o.glow) { g.globalAlpha = 0.22; P(cx - 8, hy + 5, 16, 10, "#9fdcff"); g.globalAlpha = 1; }
  if (o.sweat) { P(cx + 9, hy + 1, 1, 2, "#9fd8ff"); P(cx + 8, hy + 3, 3, 2, "#9fd8ff"); P(cx + 9, hy + 3, 1, 1, "#e6f6ff"); P(cx - 7, hy - 1, 1, 3, "#8a9ad0"); P(cx - 4, hy - 2, 1, 3, "#8a9ad0"); }
  if (o.mark) { P(cx + 10, hy - 7, 3, 6, "#ffd166"); P(cx + 10, hy, 3, 2, "#ffd166"); P(cx + 11, hy - 7, 1, 6, "#fff3b0"); }
  // 책상
  const dc = s.desk;
  P(tx, deskY, tw, bot - deskY, dc); P(tx, deskY, tw, 1, tint(dc, 1.15)); P(tx, deskY + 1, tw, 1, tint(dc, 0.85));
  P(cx - 11, deskY + 2, 15, 5, "#f8f4e8"); P(cx - 11, deskY + 2, 15, 1, "#fff"); P(cx - 9, deskY + 3, 9, 1, "#c8c0d8"); P(cx - 9, deskY + 5, 7, 1, "#c8c0d8"); P(cx - 4, deskY + 2, 1, 5, "#e0d0c0");
  // 팔·손
  if (arm === "phone") {
    P(cx - 13, sy + 3, 3, tb - 6, tcD); P(cx + 10, sy + 3, 3, tb - 6, tcD);
    P(cx - 6, deskY - 5, 5, 4, sk); P(cx + 1, deskY - 5, 5, 4, sk);
    P(cx - 3, deskY - 12, 6, 9, "#22222c"); P(cx - 2, deskY - 11, 4, 7, o.scr || "#7fd0ff"); P(cx - 2, deskY - 11, 1, 2, "#e6f6ff");
  } else {
    P(cx - 15, sy + 3, 3, tb - 4, tcD); P(cx - 13, deskY - 2, 5, 3, sk);
    if (arm !== "up" && arm !== "wave") {
      P(cx + 12, sy + 3, 3, tb - 4, tcD); const px = cx + 8 - (arm === "write" ? f : 0); P(px, deskY - 2, 5, 3, sk);
      P(px + 1, deskY - 7, 1, 5, "#ffd166"); P(px + 1, deskY - 8, 1, 1, "#ff9fb0"); P(px + 1, deskY - 2, 1, 1, "#2a1e2e");
    }
  }
}
// 방 배경(학생마다 다름): 창문·포스터·책장·코르크판·시계·화분
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
  // 저녁 조명 느낌(가장자리 어둡게)
  const vg = g.createRadialGradient(w / 2, h * 0.55, w * 0.2, w / 2, h * 0.5, w * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,6,24,.35)"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
}
// ── 벡터 그리기(고해상도 캔버스, 논리 좌표) ──
const rrV = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
const lgV = (g, x0, y0, x1, y1, cs) => { const q = g.createLinearGradient(x0, y0, x1, y1); cs.forEach((c, i) => q.addColorStop(i / (cs.length - 1), c)); return q; };
// 고양이(벡터). ox,oy 왼쪽 위, w,h 크기. pose: walk(f) / sit(tail, blink)
function catV(g, col, ox, oy, w, h, pose, f, tl, blink, flip) {
  const [c, cd, cl] = col, pink = "#ffa0b4", D = "#2a1e2e";
  g.save(); g.translate(ox + (flip ? w : 0), oy); g.scale((flip ? -1 : 1) * w / 40, h / 30);
  g.lineJoin = "round"; g.lineCap = "round";
  const out = (fn) => { g.beginPath(); fn(); g.lineWidth = 2.2; g.strokeStyle = D; g.stroke(); g.fillStyle = c; g.fill(); };
  if (pose === "walk") {
    g.lineWidth = 3.6; g.strokeStyle = D; g.beginPath(); g.moveTo(5, 14); g.quadraticCurveTo(-1, 8, 2, f ? 1 : 3); g.stroke(); g.lineWidth = 2; g.strokeStyle = c; g.stroke();
    for (const [lx, ph] of [[9, 0], [13, 1], [22, 1], [26, 0]]) { const a = (f ? 1 : -1) * (ph ? 1 : -1) * 2; g.lineWidth = 4.4; g.strokeStyle = D; g.beginPath(); g.moveTo(lx, 18); g.lineTo(lx + a, 27); g.stroke(); g.lineWidth = 2.6; g.strokeStyle = c; g.stroke(); }
    out(() => g.ellipse(17, 15, 12, 6.6, 0, 0, 6.3));
    g.fillStyle = cl; g.beginPath(); g.ellipse(18, 19, 7, 2.4, 0, 0, 6.3); g.fill();
    g.fillStyle = cd; for (const xx of [12, 16, 20]) { g.beginPath(); g.ellipse(xx, 10.6, 1.2, 2.6, 0, 0, 6.3); g.fill(); }
    out(() => { g.moveTo(26, 6); g.lineTo(27.5, -0.6); g.lineTo(31, 3.6); g.lineTo(35, 3.6); g.lineTo(38.4, -0.6); g.lineTo(39, 7); g.quadraticCurveTo(40, 15, 32.6, 15.4); g.quadraticCurveTo(25, 15, 26, 6); });
    g.fillStyle = pink; g.beginPath(); g.moveTo(28.4, 2.6); g.lineTo(29.6, 0.8); g.lineTo(30.6, 3.4); g.fill();
    g.fillStyle = D; g.beginPath(); g.arc(30.4, 8.4, 1.1, 0, 6.3); g.arc(35.6, 8.4, 1.1, 0, 6.3); g.fill();
    g.fillStyle = cl; g.beginPath(); g.ellipse(33, 12, 3, 2, 0, 0, 6.3); g.fill(); g.fillStyle = pink; g.beginPath(); g.arc(33, 11, 0.8, 0, 6.3); g.fill();
  } else {
    if (tl) { g.lineWidth = 4; g.strokeStyle = D; g.beginPath(); g.moveTo(28, 26); g.quadraticCurveTo(36, 22, 33, 13); g.stroke(); g.lineWidth = 2.4; g.strokeStyle = c; g.stroke(); }
    else { g.lineWidth = 4; g.strokeStyle = D; g.beginPath(); g.moveTo(26, 27); g.quadraticCurveTo(36, 29, 37, 24); g.stroke(); g.lineWidth = 2.4; g.strokeStyle = c; g.stroke(); }
    out(() => g.ellipse(17, 21, 10, 8.4, 0, 0, 6.3));
    g.fillStyle = cl; g.beginPath(); g.ellipse(17, 23, 5.6, 5.4, 0, 0, 6.3); g.fill();
    g.fillStyle = cl; g.beginPath(); g.ellipse(12.4, 28.6, 2.6, 1.6, 0, 0, 6.3); g.ellipse(21.6, 28.6, 2.6, 1.6, 0, 0, 6.3); g.fill();
    out(() => { g.moveTo(6, 8); g.lineTo(7, 0.6); g.lineTo(12.4, 4.4); g.lineTo(21.6, 4.4); g.lineTo(27, 0.6); g.lineTo(28, 8); g.quadraticCurveTo(29.4, 17.6, 17, 17.6); g.quadraticCurveTo(4.6, 17.6, 6, 8); });
    g.fillStyle = pink; g.beginPath(); g.moveTo(8, 3.4); g.lineTo(8.6, 1.6); g.lineTo(10.6, 3.6); g.moveTo(26, 3.4); g.lineTo(25.4, 1.6); g.lineTo(23.4, 3.6); g.fill();
    g.fillStyle = cd; g.beginPath(); g.ellipse(17, 6, 1.2, 2.2, 0, 0, 6.3); g.ellipse(13.6, 6.4, 0.9, 1.6, 0, 0, 6.3); g.ellipse(20.4, 6.4, 0.9, 1.6, 0, 0, 6.3); g.fill();
    if (blink) { g.strokeStyle = D; g.lineWidth = 1.2; g.beginPath(); g.moveTo(10.6, 10.6); g.quadraticCurveTo(12.4, 12, 14.2, 10.6); g.moveTo(19.8, 10.6); g.quadraticCurveTo(21.6, 12, 23.4, 10.6); g.stroke(); }
    else { g.fillStyle = D; g.beginPath(); g.ellipse(12.4, 10.4, 1.8, 2.2, 0, 0, 6.3); g.ellipse(21.6, 10.4, 1.8, 2.2, 0, 0, 6.3); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(11.8, 9.6, 0.7, 0, 6.3); g.arc(21, 9.6, 0.7, 0, 6.3); g.fill(); }
    g.fillStyle = cl; g.beginPath(); g.ellipse(17, 14.2, 3.6, 2.4, 0, 0, 6.3); g.fill(); g.fillStyle = pink; g.beginPath(); g.moveTo(15.8, 12.6); g.lineTo(18.2, 12.6); g.lineTo(17, 13.8); g.fill();
    g.strokeStyle = "#ffffffcc"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(9, 13); g.lineTo(2, 12); g.moveTo(9, 14.4); g.lineTo(2, 15.4); g.moveTo(25, 13); g.lineTo(32, 12); g.moveTo(25, 14.4); g.lineTo(32, 15.4); g.stroke();
  }
  g.restore();
}
// 카메라 꺼짐 화면(벡터)
function camOffV(g, x, y, w, h, s, tm) {
  g.save(); g.fillStyle = lgV(g, 0, y, 0, y + h, ["#22232e", "#15161e"]); g.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h * 0.42, R = Math.min(w, h) * 0.2;
  g.beginPath(); g.arc(cx, cy, R + 1.2, 0, 6.3); g.fillStyle = tint(s.tc, 1.25); g.fill();
  g.beginPath(); g.arc(cx, cy, R, 0, 6.3); g.fillStyle = tint(s.tc, 0.85); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 6.3); g.clip(); g.fillStyle = "#eef0f6"; g.beginPath(); g.arc(cx, cy - R * 0.22, R * 0.38, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(cx, cy + R * 0.86, R * 0.7, R * 0.56, 0, 0, 6.3); g.fill(); g.restore();
  const ix = x + w - 15, iy = y + 4; rrV(g, ix, iy + 1, 8, 6, 1.4); g.fillStyle = "#d0d0d8"; g.fill(); g.beginPath(); g.moveTo(ix + 8, iy + 3); g.lineTo(ix + 11, iy + 1.6); g.lineTo(ix + 11, iy + 6.4); g.lineTo(ix + 8, iy + 5); g.fill();
  g.strokeStyle = "#ff4a5a"; g.lineWidth = 1; g.lineCap = "round"; g.beginPath(); g.moveTo(ix - 1, iy); g.lineTo(ix + 10, iy + 8); g.stroke();
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx - 4 + k * 4, cy + R + 6 + (Math.floor(tm * 4) % 3 === k ? -1 : 0), 1, 0, 6.3); g.fillStyle = "#9aa0b0"; g.fill(); }
  g.restore();
}
// 책상 + 공책(벡터)
function deskV(g, x, w, deskY, bot, dc) {
  g.save(); g.fillStyle = lgV(g, 0, deskY, 0, bot, [tint(dc, 1.18), dc, tint(dc, 0.78)]); g.fillRect(x, deskY, w, bot - deskY);
  g.fillStyle = tint(dc, 1.3); g.fillRect(x, deskY, w, 0.6);
  const cx = x + w / 2;
  g.save(); g.translate(cx - 4, deskY + 3.6); g.rotate(-0.06); g.shadowColor = "rgba(0,0,0,.3)"; g.shadowBlur = 1.4; rrV(g, -8, -2, 16, 5.6, 0.6); g.fillStyle = "#fbf8ee"; g.fill(); g.shadowColor = "transparent";
  g.strokeStyle = "#b8c4e0"; g.lineWidth = 0.35; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(-6.6, -0.4 + k * 1.5); g.lineTo(6.6, -0.4 + k * 1.5); } g.stroke(); g.strokeStyle = "#e08a8a"; g.beginPath(); g.moveTo(-5.4, -2); g.lineTo(-5.4, 3.6); g.stroke(); g.restore();
  g.save(); g.translate(cx + 8, deskY + 3); g.rotate(-0.5); rrV(g, -4, -0.5, 8, 1.1, 0.5); g.fillStyle = "#ffc23f"; g.fill(); g.fillStyle = "#2a2a30"; g.fillRect(3.4, -0.5, 0.9, 1.1); g.restore();
  g.restore();
}
// 고양이 스프라이트(1배로 그리고 2배로 키워 씀: 카메라 바로 앞이라 크다)
function catSprites(col) {
  const [c, cd, cl] = col, pink = "#ffa0b4", D = "#2a1e2e";
  const mk = (w, h, fn) => { const cv = mkCv(w + 2, h + 2), P0 = PF(cv.getContext("2d")); fn((x, y, ww, hh, cc) => P0(x + 1, y + 1, ww, hh, cc)); outline(cv); return cv; };
  const walk = (f) => mk(17, 11, (P) => {
    P(0, f ? 0 : 1, 1, 3, c); P(1, 3, 1, 2, c); P(2, 4, 10, 5, c); P(4, 4, 1, 2, cd); P(7, 4, 1, 2, cd); P(4, 8, 6, 1, cl);
    P(10, 1, 6, 6, c); P(10, 0, 2, 1, c); P(14, 0, 2, 1, c); P(11, 0, 1, 1, pink); P(13, 3, 1, 1, D); P(15, 3, 1, 1, D); P(13, 5, 3, 2, cl); P(14, 5, 1, 1, pink); P(16, 5, 1, 1, "#fff");
    if (f) { P(3, 9, 2, 2, c); P(10, 9, 2, 2, c); P(5, 9, 2, 1, cd); P(8, 9, 2, 1, cd); } else { P(4, 9, 2, 2, c); P(8, 9, 2, 2, c); P(2, 9, 2, 1, cd); P(10, 9, 2, 1, cd); }
  });
  const sit = (tl, blink) => mk(15, 14, (P) => {
    if (tl) { P(12, 9, 2, 3, c); P(13, 7, 1, 2, c); } else { P(12, 11, 3, 2, c); P(14, 10, 1, 1, c); }
    P(3, 8, 9, 6, c); P(5, 9, 5, 4, cl); P(4, 13, 2, 1, cl); P(9, 13, 2, 1, cl);
    P(2, 2, 11, 7, c); P(2, 0, 2, 2, c); P(11, 0, 2, 2, c); P(3, 1, 1, 1, pink); P(11, 1, 1, 1, pink); P(5, 2, 1, 1, cd); P(7, 2, 1, 2, cd); P(9, 2, 1, 1, cd);
    if (blink) { P(4, 5, 2, 1, D); P(9, 5, 2, 1, D); } else { P(4, 4, 2, 2, D); P(9, 4, 2, 2, D); P(4, 4, 1, 1, "#fff"); P(9, 4, 1, 1, "#fff"); }
    P(7, 6, 1, 1, pink); P(6, 7, 3, 1, cl); P(0, 6, 2, 1, "#fff"); P(13, 6, 2, 1, "#fff"); P(0, 8, 2, 1, "#fff8"); P(13, 8, 2, 1, "#fff8");
  });
  return { w0: walk(0), w1: walk(1), s0: sit(1, 0), s1: sit(0, 0), sb: sit(1, 1) };
}
// 카메라 꺼진 화면(학생마다 한 장)
function camOffPic(w, h, s) {
  const c = mkCv(w, h), g = c.getContext("2d"), P = PF(g);
  P(0, 0, w, h, "#1b1c24"); for (let y = 0; y < h; y += 3) P(0, y, w, 1, "#ffffff05");
  // 프로필 원(옷 색) 안에 흰 사람 모양(머리 + 어깨)
  const cx = w >> 1, cy = Math.round(h * 0.42), R = 11, col = tint(s.tc, 0.85), ring = tint(s.tc, 1.25), sil = "#eef0f6";
  for (let j = -R - 1; j <= R + 1; j++) for (let i = -R - 1; i <= R + 1; i++) {
    const d = i * i + j * j;
    if (d > (R + 1) * (R + 1) + 2) continue;
    if (d > R * R + 4) { P(cx + i, cy + j, 1, 1, ring); continue; }
    const head = i * i + (j + 3) * (j + 3) <= 18, body = j >= 4 && (i * i) / 72 + ((j - 12) * (j - 12)) / 64 <= 1;
    P(cx + i, cy + j, 1, 1, head || body ? sil : col);
  }
  // 카메라 꺼짐 아이콘
  const ix = w - 15, iy = 4; P(ix, iy + 1, 8, 6, "#d0d0d8"); P(ix + 8, iy + 2, 3, 4, "#d0d0d8"); P(ix + 1, iy + 2, 6, 4, "#9aa0b0");
  for (let k = 0; k < 10; k++) P(ix - 1 + k, iy + k * 0.8, 1, 1, "#ff4a5a");
  return c;
}

// 방법 화면 그림 3장
// 방법 그림(벡터 80x68)
function stepPicsV() {
  const U = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
  const hand = (x, y) => `<g transform="translate(${x} ${y})"><path d="M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const room = `<rect width="80" height="68" rx="11" fill="#3a3048"/><rect x="6" y="6" width="22" height="18" rx="2" fill="#1d2752" stroke="#e8e0d0" stroke-width="1.4"/><path d="M17 6v18" stroke="#e8e0d0"/><rect x="0" y="52" width="80" height="16" fill="#c48a5c"/><rect x="0" y="52" width="80" height="1.4" fill="#e0aa78"/>`;
  const kid = (x, y, mouth, eyes, tilt = 0, top = "#5b7bd9") => `<g transform="translate(${x} ${y}) rotate(${tilt})"><path d="M-14 30c0-10 6-15 14-15s14 5 14 15z" fill="${top}"/><circle r="10" cy="3" fill="#f7d5b8"/><path d="M-10.4 2a10.4 10.4 0 0 1 20.8 0c-3-4.6-17-4.6-20.8 0z" fill="#3b2a1e"/>${eyes}${mouth}</g>`;
  const a = U(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${room}${kid(36, 26, '<ellipse cx="0" cy="9" rx="1.6" ry="1.2" fill="#a84040"/>', '<path d="M-6 4q2 1.4 4 0M2 4q2 1.4 4 0" stroke="#2a1e2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>', 14)}
    <text x="52" y="22" font-size="13" font-weight="900" fill="#fff" stroke="#2a3a6a" stroke-width="1.4" font-family="sans-serif">Z</text><text x="62" y="12" font-size="9" font-weight="900" fill="#fff" stroke="#2a3a6a" stroke-width="1" font-family="sans-serif">z</text>${hand(46, 36)}<circle cx="51" cy="38" r="7" fill="none" stroke="#ffd166" stroke-width="1.6" opacity=".8"/></svg>`);
  const b = U(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${room}${kid(30, 26, '<path d="M-2.4 8.6q2.4 1.6 4.8 0" stroke="#a84040" stroke-width="1" fill="none"/>', '<path d="M-5.4 5h3M2.4 5h3" stroke="#2a1e2e" stroke-width="1.4" stroke-linecap="round"/>', 0, "#e0607a")}
    <rect x="25" y="38" width="10" height="15" rx="2" fill="#1d1f2b"/><rect x="26.4" y="39.6" width="7.2" height="11" rx="1" fill="#ffc6e0"/><path d="M48 44h22m-5-5 5 5-5 5" stroke="#ffe066" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${hand(40, 40)}</svg>`);
  const c = U(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68"><rect width="80" height="68" rx="11" fill="#1b1c24"/><circle cx="36" cy="30" r="15" fill="#8a5fc0"/><circle cx="36" cy="26" r="5.6" fill="#eef0f6"/><path d="M26 41a10 8 0 0 1 20 0z" fill="#eef0f6"/>
    <rect x="58" y="8" width="11" height="8" rx="1.6" fill="#d0d0d8"/><path d="M69 10l4-2v8l-4-2z" fill="#d0d0d8"/><path d="M56 6l18 12" stroke="#ff4a5a" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="36" cy="30" r="20" fill="none" stroke="#ffd166" stroke-width="2.4" stroke-dasharray="80 126" stroke-linecap="round" transform="rotate(-90 36 30)"/>${hand(44, 38)}</svg>`);
  return [`<img src="${a}" alt="">`, `<img src="${b}" alt="">`, `<img src="${c}" alt="">`];
}
function stepPics() {
  try { const V = stepPicsV(); return [[V[0], "졸면 톡톡"], [V[1], "폰 보면 쓱 밀기"], [V[2], "카메라 끄면 꾹"]]; } catch (e) { return stepPicsDot(); }
}
function stepPicsDot() {
  const mk = (fn) => { const c = mkCv(40, 40), g = c.getContext("2d"); fn(g, PF(g)); return c.toDataURL(); };
  const sA = stuSpec("bob"), sB = stuSpec("short"), sC = stuSpec("long");
  sA.headset = false; sB.headset = true;
  const room = (P, wall) => { for (let y = 0; y < 40; y++) P(0, y, 40, 1, tint(wall, 0.6 + 0.3 * (y / 40))); };
  const Z = (P, x, y, c) => { P(x, y, 4, 1, c); P(x + 2, y + 1, 1, 1, c); P(x + 1, y + 2, 1, 1, c); P(x, y + 3, 4, 1, c); };
  const a = mk((g, P) => {
    room(P, "#cfdde6"); paintStu(g, sA, 17, 33, { dy: 3, eye: "close", mouth: "drool" }, 0, 40, 40);
    Z(P, 28, 9, "#fff"); Z(P, 33, 3, "#fffa"); paintFinger(P, 25, 24); P(24, 21, 2, 1, "#ffd166"); P(23, 23, 1, 1, "#ffd166"); P(36, 21, 2, 1, "#ffd166"); P(38, 23, 1, 1, "#ffd166");
  });
  const b = mk((g, P) => {
    room(P, "#ecd3dc"); paintStu(g, sB, 17, 33, { dy: 1, eye: "down", arm: "phone", glow: 1 }, 0, 40, 40);
    P(29, 3, 9, 7, "#fffdf2"); P(29, 3, 9, 1, "#ffd166"); P(32, 5, 3, 1, "#e0307a"); P(34, 6, 1, 1, "#e0307a"); P(33, 7, 1, 1, "#e0307a");
    P(33, 14, 1, 10, "#ffd166"); P(32, 15, 3, 1, "#ffd166"); P(31, 16, 5, 1, "#ffd166"); paintFinger(P, 27, 25);
  });
  const c = mk((g, P) => {
    g.drawImage(camOffPic(40, 40, sC), 0, 0);
    g.strokeStyle = "#ffd166"; g.lineWidth = 2; g.beginPath(); g.arc(20, 17, 15, -Math.PI / 2, Math.PI * 0.9); g.stroke();
    paintFinger(P, 17, 23);
  });
  return [[`<img src="${a}" alt="">`, "졸면 톡톡"], [`<img src="${b}" alt="">`, "폰 보면 쓱 밀기"], [`<img src="${c}" alt="">`, "카메라 끄면 꾹"]];
}

export const GAME = {
  key: "tutoring1", base: "tutoring", jc: "#7fe0c0", n: "졸지 마 학생아", desc: "퇴근 후 화상과외! 딴짓하는 학생을 불러 수업에 집중시켜요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 화상 수업 화면에서 <b>딴짓하는 학생</b>을 찾아 화면을 눌러 이름을 불러요.",
    "<b>졸면 톡톡</b>(빠르게 두 번), <b>폰 보면 쓱 밀기</b>(퀴즈 던지기), <b>카메라 끄면 꾹</b> 길게, <b>고양이·음소거는 톡</b> 한 번!",
    "잘 듣는 학생을 부르면 서운해해요. 중간 <b>오늘의 퀴즈</b> 때 모두 집중해 있으면 보너스예요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "졸면 톡톡"], ["", "폰 보면 쓱 밀기"], ["", "카메라 끄면 꾹"]]; } },
  css: `
.mg-tutoring1 .tu-st{background:#121319!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-tutoring1 .tu-cv{position:absolute;left:0;top:0;z-index:0;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none}
.mg-tutoring1 .tu-fx{z-index:3}
.mg-tutoring1 .tu-pw{position:absolute;z-index:2;overflow:hidden;pointer-events:none}
.mg-tutoring1 .tu-pt{position:absolute;background-repeat:no-repeat;opacity:0;transform-origin:50% 100%;transition:opacity .25s,filter .3s;filter:drop-shadow(0 3px 6px #0007)}
.mg-tutoring1 .tu-pt.on{opacity:1}
.mg-tutoring1 .tu-pt.zz{filter:drop-shadow(0 3px 6px #0007) brightness(.78) saturate(.8)}
.mg-tutoring1 .tu-ph{position:absolute;width:26px;height:40px;border-radius:5px;background:linear-gradient(160deg,#3a3d4e,#15161e);box-shadow:0 0 0 1.5px #5a5f78,0 0 18px 6px #8fd6ff66;opacity:0;transform:translate(-50%,10px) rotate(-8deg);transition:opacity .2s,transform .25s}
.mg-tutoring1 .tu-ph::before{content:"";position:absolute;inset:3px 3px 6px;border-radius:2px;background:linear-gradient(#cdeeff,#5fb0f0)}
.mg-tutoring1 .tu-ph.pk::before{background:linear-gradient(#ffe0f0,#ff8fc0)}
.mg-tutoring1 .tu-ph.on{opacity:1;transform:translate(-50%,0) rotate(-8deg)}
.mg-tutoring1 .tu-hd{position:absolute;right:6px;top:22px;font-size:22px;line-height:1;opacity:0;transform:scale(.4) rotate(-10deg);transition:opacity .15s,transform .2s cubic-bezier(.3,1.7,.5,1);filter:drop-shadow(0 2px 2px #0008)}
.mg-tutoring1 .tu-hd.on{opacity:1;transform:none;animation:tuhd .5s ease-in-out infinite alternate}
@keyframes tuhd{to{transform:rotate(12deg)}}
.mg-tutoring1 .mg-msg{top:auto;bottom:calc(31% + 8px);z-index:22}
.mg-tutoring1 .mg-steps img{width:76px;height:65px;image-rendering:auto;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-tutoring1 .tu-hud{position:absolute;left:6px;right:6px;top:3px;z-index:5;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#e8eaf4;pointer-events:none;white-space:nowrap}
.mg-tutoring1 .tu-app{display:flex;align-items:center;gap:4px;background:#7fe0c0;color:#0d3a2e;padding:2px 7px;border-radius:5px;font-weight:900}
.mg-tutoring1 .tu-app i{width:6px;height:6px;border-radius:50%;background:#ff4a5a;box-shadow:0 0 6px #ff4a5a;animation:tublink 1s infinite}
.mg-tutoring1 .tu-cls{opacity:.8;font-weight:700}
.mg-tutoring1 .tu-cf{margin-left:auto;display:flex;align-items:center;gap:5px}
.mg-tutoring1 .tu-cf i{width:62px;height:7px;border-radius:4px;background:#ffffff22;overflow:hidden}
.mg-tutoring1 .tu-cf em{display:block;height:100%;width:var(--f,80%);background:linear-gradient(90deg,#7fe0c0,#c8ff8a);transition:width .25s}
.mg-tutoring1 .tu-cf.low em{background:linear-gradient(90deg,#ff5a6a,#ffb03b)}
.mg-tutoring1 .tu-cf b{min-width:30px;text-align:right}
.mg-tutoring1 .tu-tile{position:absolute;z-index:4;touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mg-tutoring1 .tu-nm{position:absolute;left:4px;bottom:4px;background:#000b;color:#fff;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px;pointer-events:none;white-space:nowrap;transition:background .3s}
.mg-tutoring1 .tu-nm small{font-weight:600;opacity:.7;margin-left:3px;font-size:11px}
.mg-tutoring1 .tu-fb{position:absolute;right:5px;bottom:7px;width:42px;height:6px;border-radius:3px;background:#0009;box-shadow:0 0 0 1px #0006;overflow:hidden;pointer-events:none}
.mg-tutoring1 .tu-fb em{display:block;height:100%;width:var(--f,80%);background:#7fe0c0;transition:width .2s,background .3s}
.mg-tutoring1 .tu-fb.mid em{background:#ffd166}.mg-tutoring1 .tu-fb.low em{background:#ff5a6a}
.mg-tutoring1 .tu-tg{position:absolute;left:50%;top:76%;transform:translate(-50%,-50%);display:none;background:#ffd166;color:#2a1a00;font-size:12px;font-weight:900;padding:3px 10px;border-radius:9px;box-shadow:0 3px 0 #0007;pointer-events:none;white-space:nowrap;animation:tupulse .45s infinite alternate}
.mg-tutoring1 .tu-tile.tg .tu-tg{display:block}
.mg-tutoring1 .tu-tg.dbl{background:#b8a8ff;color:#1e1240}.mg-tutoring1 .tu-tg.swipe{background:#7fd0ff;color:#082a40}.mg-tutoring1 .tu-tg.hold{background:#ff9f7a;color:#3a1200}.mg-tutoring1 .tu-tg.tap{background:#ffd166;color:#2a1a00}
.mg-tutoring1 .tu-ring{position:absolute;left:50%;top:44%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:conic-gradient(#ffd166 calc(var(--p,0) * 1turn),#ffffff30 0);-webkit-mask:radial-gradient(circle,transparent 21px,#000 22px);mask:radial-gradient(circle,transparent 21px,#000 22px);opacity:0;pointer-events:none;transition:opacity .12s}
.mg-tutoring1 .tu-ring.on{opacity:1}
.mg-tutoring1 .tu-bub{position:absolute;left:50%;top:5px;transform:translateX(-50%) scale(.4);opacity:0;background:#fff;color:#2a1e2e;font-size:11px;font-weight:800;padding:4px 8px;border-radius:9px;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 0 #0005;pointer-events:none;transition:transform .16s cubic-bezier(.3,1.6,.5,1),opacity .14s}
.mg-tutoring1 .tu-bub.on{opacity:1;transform:translateX(-50%) scale(1)}
.mg-tutoring1 .tu-bub.mute{background:#3a3d4a;color:#b8bccc;font-style:italic;text-decoration:line-through #ff5a6a 2px}
.mg-tutoring1 .tu-bub.sad{background:#dfe4ff;color:#3a4270}
.mg-tutoring1 .tu-bub.ok{background:#d8ffe8;color:#0d4a2a}
.mg-tutoring1 .tu-bub.ans{background:#ffd166;color:#3a2400}
.mg-tutoring1 .tu-tile.gone .tu-nm{background:#ff5a6a00;color:#9aa0b0}
.mg-tutoring1 .tu-tile.gone .tu-fb{display:none}
.mg-tutoring1 .tu-me{position:absolute;z-index:1;overflow:hidden;pointer-events:none;border-radius:2px}
.mg-tutoring1 .tu-av{position:absolute;left:0;bottom:0;background-repeat:no-repeat;opacity:0;transition:opacity .4s;transform-origin:50% 100%}
.mg-tutoring1 .tu-av.on{opacity:1}
.mg-tutoring1 .tu-mnm{position:absolute;z-index:4;background:#000b;color:#fff;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px;pointer-events:none;white-space:nowrap}
.mg-tutoring1 .tu-say{position:absolute;z-index:9;transform:scale(.4);transform-origin:12px 100%;opacity:0;background:#fff;color:#2a1e2e;font-weight:900;font-size:12.5px;padding:6px 11px;border-radius:12px 12px 12px 3px;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis;box-shadow:0 3px 0 #0006,0 0 0 2px #7fe0c0;pointer-events:none;transition:transform .16s cubic-bezier(.3,1.6,.5,1),opacity .14s}
.mg-tutoring1 .tu-say.on{opacity:1;transform:scale(1)}
.mg-tutoring1 .tu-say.bad{box-shadow:0 3px 0 #0006,0 0 0 2px #8a9ad0;background:#eef0ff;color:#3a4270}
.mg-tutoring1 .tu-bd{position:absolute;z-index:4;display:flex;flex-direction:column;justify-content:center;gap:2px;padding:14px 10px 12px;box-sizing:border-box;color:#f4f4e8;font-weight:800;font-size:11.5px;line-height:1.35;pointer-events:none;text-shadow:0 0 3px #fff4}
.mg-tutoring1 .tu-bd p{margin:0;opacity:0;transform:translateX(-6px);transition:opacity .4s,transform .4s;white-space:nowrap}
.mg-tutoring1 .tu-bd p.on{opacity:1;transform:none}
.mg-tutoring1 .tu-bd p:first-child{color:#ffd166;font-size:11px}
.mg-tutoring1 .tu-bd.qz p{display:none}
.mg-tutoring1 .tu-qz{display:none;align-items:center;gap:8px}
.mg-tutoring1 .tu-bd.qz .tu-qz{display:flex}
.mg-tutoring1 .tu-qz div{flex:1;min-width:0}
.mg-tutoring1 .tu-qz em{display:inline-block;font-style:normal;background:#ff5f9e;color:#fff;font-size:11px;padding:1px 6px;border-radius:5px;margin-bottom:3px;text-shadow:none}
.mg-tutoring1 .tu-qz b{display:block;font-size:13.5px;color:#fff;white-space:nowrap}
.mg-tutoring1 .tu-qz small{display:block;font-size:11px;color:#c8ffd8}
.mg-tutoring1 .tu-qz i{flex:0 0 34px;height:34px;border-radius:50%;background:conic-gradient(#ffd166 calc(var(--p,1) * 1turn),#ffffff25 0);-webkit-mask:radial-gradient(circle,transparent 11px,#000 12px);mask:radial-gradient(circle,transparent 11px,#000 12px)}
.mg-tutoring1 .tu-ban{position:absolute;left:50%;top:36%;z-index:12;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:27px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #1f9a7a,0 0 16px #7fe0c0}
.mg-tutoring1 .tu-ban.on{animation:tuban 1.8s ease-out forwards}
.mg-tutoring1 .tu-ban.gd{text-shadow:0 0 2px #000,0 3px 0 #c9961c,0 0 16px #ffd166}
.mg-tutoring1 .tu-ban.rb{background:linear-gradient(90deg,#ff5f9e,#ffd166,#7CFC9A,#5fb8ff,#c77dff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 3px 0 #000c) drop-shadow(0 0 8px #ffb03b);font-size:31px}
.mg-tutoring1 .tu-ban small{display:block;font-size:13px;color:#fff;-webkit-text-fill-color:#fff}
.mg-tutoring1 .tu-tut{position:absolute;z-index:20;display:flex;align-items:stretch;pointer-events:none;transition:opacity .3s}
.mg-tutoring1 .tu-tut.off{opacity:0;visibility:hidden}
.mg-tutoring1 .tu-tc{pointer-events:auto;flex:1;background:#fffdf8;color:#2a1e2e;border-radius:12px;padding:8px 10px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #7fe0c0;font-size:12.5px;line-height:1.42;text-align:center;font-weight:600;word-break:keep-all;display:flex;flex-direction:column;justify-content:center}
.mg-tutoring1 .tu-tut.pop .tu-tc{animation:tupop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-tutoring1 .tu-tc em{font-style:normal;align-self:center;background:#1f9a7a;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-tutoring1 .tu-tc p{margin:0}
.mg-tutoring1 .tu-tc b.pu{color:#6a4ad0}.mg-tutoring1 .tu-tc b.bl{color:#1a7ab0}.mg-tutoring1 .tu-tc b.or{color:#d0501a}.mg-tutoring1 .tu-tc b.gd{color:#a87000}.mg-tutoring1 .tu-tc b.rd{color:#c0392b}
.mg-tutoring1 .tu-tb{margin-top:5px;display:flex;justify-content:center}
.mg-tutoring1 .tu-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-tutoring1 .tu-go{background:linear-gradient(#5fd8b0,#1f9a7a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 22px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d5a44!important;animation:tupulse .5s infinite alternate}
.mg-tutoring1 .tu-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-4px 0 0 -14px;background-size:100% 100%;image-rendering:pixelated;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-tutoring1 .tu-hand.on{display:block}
.mg-tutoring1 .tu-hand.tap{animation:tutap .8s infinite}
.mg-tutoring1 .tu-hand.dbl{animation:tudbl 1s infinite}
.mg-tutoring1 .tu-hand.swipe{animation:tuswp 1.1s infinite}
.mg-tutoring1 .tu-hand.hold{animation:tuhold 1.3s infinite}
.mg-tutoring1 .tu-pm{position:absolute;left:10px;right:10px;top:16%;z-index:16;background:#fffdf8;border-radius:14px;padding:10px 12px;box-shadow:0 6px 0 #0007,0 0 0 2px #7fe0c0,0 0 30px #7fe0c088;display:flex;gap:10px;align-items:flex-start;animation:tupm .5s cubic-bezier(.3,1.5,.5,1)}
.mg-tutoring1 .tu-pm>i{flex:0 0 36px;height:36px;border-radius:9px;background:linear-gradient(#7fe0c0,#1f9a7a);color:#fff;font-style:normal;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center}
.mg-tutoring1 .tu-pm div{flex:1;min-width:0;color:#2a1e2e}
.mg-tutoring1 .tu-pm small{display:block;font-size:11px;color:#7a7090;font-weight:700}
.mg-tutoring1 .tu-pm b{display:block;font-size:12.5px;margin:1px 0 3px}
.mg-tutoring1 .tu-pm p{margin:0;font-size:13px;line-height:1.45;font-weight:600;word-break:keep-all}
.mg-tutoring1 .tu-pm p u{text-decoration:none;color:#e0307a;font-weight:900}
.mg-tutoring1 .tu-pm.sad{box-shadow:0 6px 0 #0007,0 0 0 2px #8a9ad0}
.mg-tutoring1 .tu-pm.sad p u{color:#5a6aa0}
@keyframes tutap{0%,100%{transform:translate(6px,10px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes tudbl{0%,100%{transform:translate(6px,10px)}15%,22%{transform:translate(0,0) scale(.88)}32%{transform:translate(3px,6px)}45%,52%{transform:translate(0,0) scale(.88)}70%{transform:translate(6px,10px)}}
@keyframes tuswp{0%{transform:translate(0,26px);opacity:0}15%{opacity:1}70%{transform:translate(0,-34px);opacity:1}100%{transform:translate(0,-42px);opacity:0}}
@keyframes tuhold{0%{transform:translate(6px,10px)}20%,85%{transform:translate(0,0) scale(.86)}100%{transform:translate(6px,10px)}}
@keyframes tupop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes tupulse{to{transform:translate(-50%,-50%) scale(1.1)}}
.mg-tutoring1 .tu-go{animation-name:tupulse2}
@keyframes tupulse2{to{transform:scale(1.08)}}
@keyframes tublink{50%{opacity:.25}}
@keyframes tupm{from{transform:translateY(-30px) scale(.8);opacity:0}}
@keyframes tuban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.18) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(2deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@media (prefers-reduced-motion:reduce){.mg-tutoring1 .tu-ban.on{animation-duration:.01s}.mg-tutoring1 .tu-tg,.mg-tutoring1 .tu-go{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const T = 30, QUIZ_AT = 14, QLEN = 5, HOLD = 0.5, dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "tutoring1", "졸지 마 학생아", "tu-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="tu-cv"></canvas><div class="tu-me"><div class="tu-av"></div></div><canvas class="tu-cv tu-fx"></canvas>
      <div class="tu-hud"><span class="tu-app"><i></i>과외온</span><span class="tu-cls">화상수업 · 수학</span><span class="tu-cf">반 집중<i><em></em></i><b>85%</b></span></div>
      <div class="tu-bd"><p></p><p></p><p></p><p></p><div class="tu-qz"><div><em>오늘의 퀴즈</em><b></b><small></small></div><i></i></div></div>
      <b class="tu-mnm">나 · 선생님</b><div class="tu-say"></div><div class="tu-ban"></div>
      <div class="tu-tut off"><div class="tu-tc"><em>리허설</em><p></p><div class="tu-tb"></div></div></div><div class="tu-hand"></div>`);
    const st = F.stage, $ = (s) => st.querySelector(s);
    const cv = $(".tu-cv"), g0 = cv.getContext("2d"), cvF = $(".tu-fx"), gF = cvF.getContext("2d");
    const cfEl = $(".tu-cf"), cfBar = $(".tu-cf em"), cfTx = $(".tu-cf b"), bdEl = $(".tu-bd"), bdP = [...bdEl.querySelectorAll("p")], qzB = $(".tu-qz b"), qzS = $(".tu-qz small"), qzI = $(".tu-qz i");
    const sayEl = $(".tu-say"), ban = $(".tu-ban"), tutEl = $(".tu-tut"), tutP = $(".tu-tc p"), tutB = $(".tu-tb"), hand = $(".tu-hand"), meBox = $(".tu-me"), avEl = $(".tu-av"), mnm = $(".tu-mnm");
    // 크기: 논리 폭 112칸 안팎을 정수배로
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cv, cvF]) { c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    const hudH = 8, gap = 2, botH = clamp(Math.round(LH * 0.3), 48, 66);
    const gridTop = hudH + 1, gridBot = LH - botH - 3;
    const tileW = Math.floor((LW - 4 - gap) / 2), tileH = Math.floor((gridBot - gridTop - gap) / 2);
    const ME_R = { x: 2, y: gridBot + 3, w: Math.round(LW * 0.38), h: LH - gridBot - 5 };
    const BD_R = { x: ME_R.x + ME_R.w + 2, y: ME_R.y, w: LW - ME_R.w - 6, h: ME_R.h };
    const css = (el, r, pad = 0) => Object.assign(el.style, { left: r.x * K + pad + "px", top: r.y * K + pad + "px", width: r.w * K - pad * 2 + "px", height: r.h * K - pad * 2 + "px" });
    css(meBox, ME_R); css(bdEl, BD_R);
    Object.assign(tutEl.style, { left: BD_R.x * K + "px", top: BD_R.y * K - 4 + "px", width: BD_R.w * K + "px", height: BD_R.h * K + 4 + "px" });
    Object.assign(mnm.style, { left: ME_R.x * K + 4 + "px", top: (ME_R.y + ME_R.h) * K - 19 + "px" });
    Object.assign(sayEl.style, { left: ME_R.x * K + 2 + "px", bottom: sh - ME_R.y * K + 6 + "px" });

    // ── 학생 4명 ──
    const names = shuffle(NAMES).slice(0, 4), towns = shuffle(TOWNS).slice(0, 4), styles = shuffle(["short", "long", "bob", "spiky", "buzz", "bun", "pony"]), lays = shuffle([0, 1, 2, 3, 4, 5]), walls = shuffle(WALLS);
    const STU_POOL = ["c002", "c009", "c010", "c016", "c021", "c022", "c024", "c025", "c028", "c030", "c034", "c039", "c047", "c051", "c052", "c053", "c054", "c055", "c057", "c063", "c064", "c069", "c079", "c083", "c084", "c085", "pM5", "pM8", "pF3", "pF6"]; // 학생 역할: 후드·티셔츠·니트 같은 캐주얼 차림만
    const myAv = typeof opts.avatar === "string" ? opts.avatar : "", stuKeys = shuffle(STU_POOL.filter((k) => k !== myAv && k !== "c018")).slice(0, 4);
    const studs = [0, 1, 2, 3].map((i) => {
      const r = { x: 2 + (i % 2) * (tileW + gap), y: gridTop + Math.floor(i / 2) * (tileH + gap), w: tileW, h: tileH };
      const sp = stuSpec(styles[i]);
      const bg = mkCv(r.w, r.h); paintRoom(bg, lays[i], walls[i]);
      const el = document.createElement("div"); el.className = "tu-tile"; css(el, r);
      el.innerHTML = `<div class="tu-bub"></div><b class="tu-tg"></b><i class="tu-ring"></i><div class="tu-nm">${names[i]}<small>${towns[i]}</small></div><div class="tu-fb"><em></em></div>`;
      st.appendChild(el);
      const pw = document.createElement("div"); pw.className = "tu-pw"; css(pw, r); pw.innerHTML = `<div class="tu-pt"></div><div class="tu-ph"></div><div class="tu-hd">✋</div>`; st.appendChild(pw);
      const pt = pw.firstChild, ph = pw.querySelector(".tu-ph"), hd = pw.querySelector(".tu-hd"), pr = { ok: false, im: new Image() };
      const dkY = r.h - 8, pwW = Math.round(Math.min(r.w * 0.9, (dkY - 3) * 240 / 236) * K), pwH = Math.round(pwW * 236 / 240);
      Object.assign(pt.style, { width: pwW + "px", height: pwH + "px", left: Math.round((r.w * K - pwW) / 2) + "px", top: dkY * K - pwH + "px", backgroundSize: `300% ${(1080 / 236 * 100).toFixed(2)}%` });
      Object.assign(ph.style, { left: r.w * K / 2 + "px", top: dkY * K - 44 + "px" });
      pr.im.onload = () => { pr.ok = true; pt.style.backgroundImage = `url("${pr.im.src}")`; pt.classList.add("on"); };
      pr.im.src = "img/body/" + stuKeys[i] + ".webp";
      return { pw, pt, ph, hd, pr, ptX: "", ptT: "", i, name: names[i], town: towns[i], r, sp, bg, off: camOffPic(r.w, r.h, sp), cats: catSprites(sp.cat), el, bub: el.querySelector(".tu-bub"), tg: el.querySelector(".tu-tg"), ring: el.querySelector(".tu-ring"), fb: el.querySelector(".tu-fb"), fbE: el.querySelector(".tu-fb em"), nm: el.querySelector(".tu-nm"),
        st: "ok", t: 0, focus: 85, grace: 0, lastTap: -9, sad: 0, jolt: 0, happy: 0, wave: 0, card: 0, talk: 0, fx: 0, zz: [], zT: 0, cat: null, catOut: null, bubT: 0, hand: false, ans: false, gone: false, offP: -1, wf: 0, wT: rnd() * 2, blink: 1 + rnd() * 2, writing: 0, shownF: -1 };
    });
    const tileP = (s) => [(s.r.x + s.r.w / 2) * K, (s.r.y + s.r.h * 0.45) * K];

    // 내 캐릭터(몸 그림 시트 3x2). 위쪽 260만 잘라서 화상 화면에 넣는다. 못 불러오면 도트 실루엣만.
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    {
      const bw = ME_R.w * K, w = Math.round(bw * 1.02), h = Math.round(w * 260 / 240);
      Object.assign(avEl.style, { width: w + "px", height: h + "px", left: Math.round((bw - w) / 2) + "px", backgroundSize: "300% 415.38%" });
      const im = new Image();
      im.onload = () => { art = true; avEl.style.backgroundImage = `url("${im.src}")`; avEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    let meX = "", meT = "";

    // ── 고정 배경(한 번만): 바탕·위 띠·내 방·칠판 ──
    const BG = mkCv(LW, LH);
    {
      const b = BG.getContext("2d"), P = PF(b);
      P(0, 0, LW, LH, "#121319"); P(0, 0, LW, hudH, "#1c1d27"); P(0, hudH, LW, 1, "#2a2c38");
      // 내 방(따뜻한 조명, 책장, 줄전구)
      const { x, y, w, h } = ME_R;
      for (let j = 0; j < h; j++) P(x, y + j, w, 1, tint("#6a5a7a", 0.75 + 0.35 * (j / h)));
      for (let k = x + 2; k < x + w; k += 5) P(k, y, 1, h, "#ffffff08");
      P(x + 2, y + 6, 13, 26, "#7a5236"); P(x + 3, y + 7, 11, 24, "#4a3022");
      for (const sy of [y + 15, y + 23, y + 31]) { P(x + 3, sy, 11, 1, "#a8744c"); let bx = x + 3; while (bx < x + 14) { const bw2 = 1 + rint(2), bh = 4 + rint(3), c = pick(["#e0607a", "#5b7bd9", "#e0b040", "#3e9e6a", "#c77dff", "#f2f2f2"]); P(bx, sy - bh, Math.min(bw2, x + 14 - bx), bh, c); bx += bw2; } }
      P(x + w - 9, y + 5, 7, 9, "#f4f4f8"); P(x + w - 8, y + 6, 5, 2, "#e0307a"); P(x + w - 8, y + 9, 5, 1, "#9aa0b0"); P(x + w - 8, y + 11, 3, 1, "#9aa0b0");
      for (let k = 0; k < w; k++) { const yy = y + 2 + Math.round(Math.abs(Math.sin((k / w) * Math.PI * 2)) * 2); P(x + k, yy, 1, 1, "#3a2a3a"); if (k % 5 === 2) P(x + k, yy + 1, 1, 2, ["#ffd166", "#ff7eb6", "#7fe0c0"][(k / 5 | 0) % 3]); }
      const rg = b.createRadialGradient(x + w - 6, y + 20, 2, x + w - 6, y + 20, 30); rg.addColorStop(0, "rgba(255,220,150,.35)"); rg.addColorStop(1, "rgba(255,220,150,0)"); b.fillStyle = rg; b.fillRect(x, y, w, h);
      // 칠판(화면 공유)
      const B = BD_R; P(B.x, B.y, B.w, B.h, "#8a5a3a"); P(B.x, B.y, B.w, 1, "#b07a4a"); P(B.x + 2, B.y + 2, B.w - 4, B.h - 6, "#2f5a44");
      for (let k = 0; k < 40; k++) P(B.x + 3 + rint(B.w - 6), B.y + 3 + rint(B.h - 9), 1 + rint(3), 1, "#ffffff10");
      P(B.x + 2, B.y + 2, B.w - 4, 4, "#24463a"); P(B.x + 4, B.y + 3, 2, 2, "#ff5a6a"); P(B.x + 7, B.y + 3, 2, 2, "#ffd166"); P(B.x + 10, B.y + 3, 2, 2, "#7fe0c0");
      P(B.x + 2, B.y + B.h - 4, B.w - 4, 2, "#6a4428"); P(B.x + 8, B.y + B.h - 5, 5, 1, "#fff"); P(B.x + 15, B.y + B.h - 5, 4, 1, "#ffd166"); P(B.x + 21, B.y + B.h - 5, 4, 1, "#7fd0ff"); P(B.x + B.w - 12, B.y + B.h - 6, 7, 2, "#3a3a46");
    }

    // ── 실제 방 그림(학생 방·내 방) + 벡터 칠판: 불러오면 고해상도로 한 번 그려 둔다 ──
    const RIMG = {}; const rimg = (k) => { if (!RIMG[k]) { const q = { ok: false, bad: false, im: new Image() }; q.im.onload = () => (q.ok = true); q.im.onerror = () => (q.bad = true); q.im.src = "img/bg/" + k + ".webp"; RIMG[k] = q; } return RIMG[k]; };
    const ROOMK = shuffle(["home", "online", "studyst", "library", "airbnb", "parents"]);
    const ROOMF = { home: [0.25, 0.4], online: [0.75, 0.35], studyst: [0.5, 0.4], library: [0.5, 0.35], airbnb: [0.6, 0.4], parents: [0.55, 0.4] };
    const coverH = (k, w, h, dim) => { const q = rimg(k), c = mkCv(Math.round(w * KS), Math.round(h * KS)), b = c.getContext("2d"), im = q.im, iw = im.naturalWidth, ih = im.naturalHeight, sc = Math.max(c.width / iw, c.height / ih), sw2 = c.width / sc, sh2 = c.height / sc, [fx, fy] = ROOMF[k] || [0.5, 0.4]; b.drawImage(im, (iw - sw2) * fx, (ih - sh2) * fy, sw2, sh2, 0, 0, c.width, c.height); b.fillStyle = dim; b.fillRect(0, 0, c.width, c.height); const vg = b.createRadialGradient(c.width / 2, c.height * 0.55, c.width * 0.2, c.width / 2, c.height * 0.5, c.width * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,6,24,.4)"); b.fillStyle = vg; b.fillRect(0, 0, c.width, c.height); return c; };
    let BGH = null;
    const buildBGH = () => {
      const c = mkCv(Math.round(LW * KS), Math.round(LH * KS)), b = c.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0);
      b.fillStyle = "#121319"; b.fillRect(0, 0, LW, LH); b.fillStyle = "#1c1d27"; b.fillRect(0, 0, LW, hudH); b.fillStyle = "#2a2c38"; b.fillRect(0, hudH, LW, 0.6);
      const { x, y, w, h } = ME_R;
      if (rimg("home").ok) b.drawImage(coverH("home", w, h, "rgba(40,24,50,.25)"), x, y, w, h);
      for (let k = 0; k <= w; k += 4) { const yy = y + 2.4 + Math.abs(Math.sin((k / w) * Math.PI * 2)) * 2; b.shadowColor = ["#ffd166", "#ff7eb6", "#7fe0c0"][(k / 4 | 0) % 3]; b.shadowBlur = 3 * KS; b.beginPath(); b.arc(x + k, yy + 1, 0.8, 0, 6.3); b.fillStyle = b.shadowColor; b.fill(); }
      b.shadowBlur = 0; b.shadowColor = "transparent";
      // 칠판(화면 공유)
      const B = BD_R;
      b.save(); b.shadowColor = "rgba(0,0,0,.5)"; b.shadowBlur = 3 * KS; rrV(b, B.x, B.y, B.w, B.h, 2.4); b.fillStyle = lgV(b, 0, B.y, 0, B.y + B.h, ["#b07a4a", "#8a5a3a", "#6a4428"]); b.fill(); b.restore();
      rrV(b, B.x + 2, B.y + 2, B.w - 4, B.h - 6, 1.4); b.fillStyle = lgV(b, B.x, B.y, B.x + B.w, B.y + B.h, ["#3a6a52", "#2f5a44", "#264a3a"]); b.fill();
      b.save(); rrV(b, B.x + 2, B.y + 2, B.w - 4, B.h - 6, 1.4); b.clip(); b.strokeStyle = "#ffffff10"; b.lineWidth = 0.6; for (let k = 0; k < 26; k++) { const xx = B.x + 4 + ((k * 37) % (B.w - 8)), yy = B.y + 6 + ((k * 23) % (B.h - 12)); b.beginPath(); b.moveTo(xx, yy); b.quadraticCurveTo(xx + 3, yy - 1, xx + 6, yy + 0.4); b.stroke(); } b.restore();
      rrV(b, B.x + 2, B.y + 2, B.w - 4, 4, [1.4, 1.4, 0, 0]); b.fillStyle = "#24463a"; b.fill();
      [["#ff5a6a", 5], ["#ffd166", 8.4], ["#7fe0c0", 11.8]].forEach(([c2, dx]) => { b.beginPath(); b.arc(B.x + dx, B.y + 4, 1, 0, 6.3); b.fillStyle = c2; b.fill(); });
      rrV(b, B.x + 2, B.y + B.h - 4.4, B.w - 4, 2.4, 1); b.fillStyle = "#5a3a22"; b.fill();
      [["#ffffff", 8, 5], ["#ffd166", 15, 4], ["#7fd0ff", 21, 4]].forEach(([c2, dx, l]) => { rrV(b, B.x + dx, B.y + B.h - 5.4, l, 1.2, 0.6); b.fillStyle = c2; b.fill(); });
      rrV(b, B.x + B.w - 12, B.y + B.h - 6, 7, 2, 0.6); b.fillStyle = "#4a4a58"; b.fill();
      return c;
    };

    // ── 상태 ──  tut: 0 리허설 전 / 1 졸기 / 2 폰 / 3 카메라 / 4 고양이 / 5 안내 카드 / -1 수업 중
    let tut = 0, tutS = null, tutT = 0, tutWait = false;
    let over = false, done = false, raf = 0, last = 0, clk = 0, el = 0, tm = null;
    let fixes = 0, wrongs = 0, calls = 0, combo = 0, fSum = 0, fT = 0, distT = 0, nextSpawn = 1.2, lastKind = "", sayT = 0, lastSay = 0, lessonN = 0, quizOk = 0, quizS = 0;
    const quiz = { on: false, done: false, t: 0, q: null, extra: false };
    const fly = [], conf = [];
    const ME = { smile: 0, shock: 0, talk: 0, blush: 0 };

    // ── 소리 ──
    const bell = () => { tone(1568, 0.08, "square", 0.07); tone(2093, 0.14, "triangle", 0.08, 0, 0.06); };
    const meow = () => { tone(720, 0.18, "triangle", 0.07, 380, 0); tone(1100, 0.16, "sine", 0.05, -500, 0.16); };
    const buzz = () => { tone(140, 0.07, "square", 0.05); tone(140, 0.07, "square", 0.05, 0, 0.11); };
    const yawn = () => tone(520, 0.4, "sine", 0.05, -280);
    const click = () => { noise(0.05, 3000, 0.08); tone(300, 0.05, "square", 0.04); };
    const camOn = () => { noise(0.18, 4000, 0.07, 0, 0.5); tone(880, 0.08, "triangle", 0.08, 0, 0.12); tone(1320, 0.12, "triangle", 0.08, 0, 0.2); };
    const sad = () => { tone(440, 0.16, "triangle", 0.07, -120); tone(330, 0.22, "triangle", 0.06, -80, 0.14); };
    const kakao = () => { tone(1318, 0.1, "sine", 0.1); tone(1760, 0.16, "sine", 0.1, 0, 0.12); };

    // ── 말풍선·배너 ──
    const say = (text, cls = "", sec = 1.4) => { sayEl.textContent = text; sayEl.className = "tu-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; lastSay = el; ME.talk = Math.min(sec, 1.2); };
    const bub = (s, text, cls = "", sec = 1.4) => { s.bub.textContent = text; s.bub.className = "tu-bub " + cls; void s.bub.offsetWidth; s.bub.classList.add("on"); s.bubT = sec; s.talk = Math.min(sec, 1.1); };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "tu-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const showTag = (s, on) => { const k = s.st; const show = on && GEST[k]; s.el.classList.toggle("tg", !!show); if (show) { s.tg.textContent = TAG[k]; s.tg.className = "tu-tg " + GEST[k]; } };

    // ── 딴짓 시작 ──
    const setOff = (s, kind) => {
      s.st = kind; s.t = 0; s.hand = false; s.ans = false; s.card = 0;
      if (kind === "sleep") { yawn(); s.zT = 0; }
      else if (kind === "phone") buzz();
      else if (kind === "camoff") { click(); s.fx = 0.25; }
      else if (kind === "cat") { const dir = rnd() < 0.5 ? 1 : -1; s.cat = { x: dir > 0 ? -36 : s.r.w + 2, dir, ph: "walk", t: 0, f: 0 }; meow(); }
      else if (kind === "mute") { bub(s, pick(MUTED), "mute", 2.4); }
    };
    // 알맞게 깨움
    const fix = (s) => {
      const k = s.st, p = tileP(s);
      s.st = "ok"; s.t = 0; s.grace = 0.45; s.lastTap = -9; fixes++; calls++; combo++;
      const gain = Math.round(clamp(100 - s.focus, 8, 40)); s.focus = clamp(s.focus + 14, 0, 100);
      say(CALL[k](s.name), "", 1.5); ME.smile = 1; ME.shock = 0;
      F.hit(p, gain, "#7fe0c0");
      if (k === "sleep") { s.jolt = 0.7; bell(); vib(18); s.zz.length = 0; }
      else if (k === "phone") { const a = [(ME_R.x + ME_R.w / 2), ME_R.y + 8], b = [s.r.x + s.r.w / 2 + 10, s.r.y + s.r.h - 34]; fly.push({ a, b, t: 0, d: 0.42, s }); SFX.whoosh(); vib(12); }
      else if (k === "camoff") { s.fx = 0.35; camOn(); vib(12); }
      else if (k === "cat") { if (s.cat) { s.catOut = { ...s.cat, ph: "out", t: 0 }; s.cat = null; } meow(); vib(12); }
      else if (k === "mute") { tone(988, 0.08, "triangle", 0.08); s.micOk = 0.8; }
      setTimeout(() => { if (!over && s.st === "ok") { bub(s, pick(REPLY[k]), "ok", 1.5); s.happy = 1.2; } }, k === "phone" ? 450 : 300);
      showTag(s, false);
      if (tut >= 1 && tut <= 4 && s === tutS && !tutWait) { tutWait = true; setTimeout(() => { tutWait = false; if (tut >= 1 && tut <= 4) tutNext(tut + 1); }, 1100); }
    };
    // 잘 듣는 학생을 불렀다
    const callWrong = (s) => {
      const p = tileP(s);
      wrongs++; calls++; combo = 0; s.sad = 1.8; s.focus = clamp(s.focus - 15, 0, 100); s.grace = 0.45; s.hand = false;
      F.miss(p); sad(); say(`어… ${ya(s.name)}?`, "bad", 1.1); ME.shock = 1; ME.smile = 0;
      bub(s, pick(SAD), "sad", 1.6); F.msg("잘 듣는 학생이에요! 서운해해요");
    };
    const wrongWay = (s) => {
      const p = tileP(s); wrongs += 0.5; combo = 0; s.grace = 0.3;
      F.miss(p); F.msg(WRONGM[s.st]); showTag(s, true); ME.shock = 0.6;
    };
    // 손짓 판정: tap / dbl / swipe / hold
    const gesture = (s, gx) => {
      if (over || s.gone || s.grace > 0) return;
      if (tut >= 0 && (tut < 1 || tut > 4 || s !== tutS)) { if (tut >= 1 && tut <= 4) F.msg(`${tutS.name} 화면을 눌러요!`); return; }
      const k = s.st;
      if (k === "ok") { if (tut >= 0) return; callWrong(s); return; }
      const need = GEST[k];
      if (gx === need || (need === "tap" && gx === "dbl")) fix(s);
      else if (k === "sleep" && gx === "tap") { bub(s, pick(NUDGE), "", 0.8); F.float(tileP(s), "한 번 더!"); SFX.tok(); s.jolt = 0.15; }
      else if (tut >= 0) { F.msg(WRONGM[k]); SFX.tok(); }
      else wrongWay(s);
    };
    // 입력: 화면마다 누르기·밀기·꾹
    let pd = null;
    const ringOff = () => { studs.forEach((s) => { s.ring.classList.remove("on"); s.ring.style.setProperty("--p", 0); }); };
    studs.forEach((s) => {
      s.el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (over) return; pd = { s, x: e.clientX, y: e.clientY, t: performance.now(), fired: false }; try { s.el.setPointerCapture(e.pointerId); } catch (er) {} });
      s.el.addEventListener("pointermove", (e) => {
        if (!pd || pd.s !== s || pd.fired) return; const dx = e.clientX - pd.x, dy = e.clientY - pd.y;
        if (Math.hypot(dx, dy) > 26) { pd.fired = true; ringOff(); gesture(s, "swipe"); }
      });
      const up = (e) => {
        if (!pd || pd.s !== s) return; const d = pd; pd = null; ringOff(); if (d.fired) return;
        const dur = performance.now() - d.t, mv = Math.hypot(e.clientX - d.x, e.clientY - d.y);
        if (dur < 380 && mv < 18) { const now = performance.now() / 1000; if (now - s.lastTap < 0.45) { s.lastTap = -9; gesture(s, "dbl"); } else { s.lastTap = now; gesture(s, "tap"); } }
      };
      s.el.addEventListener("pointerup", up); s.el.addEventListener("pointercancel", () => { pd = null; ringOff(); });
    });

    studs.forEach((s, i) => { s.roomK = ROOMK[i % ROOMK.length]; rimg(s.roomK); s.bgH = null; });
    rimg("home");
    // ── 그리기 ──
    let g = g0; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const Zg1 = (x, y, c) => { P(x, y, 4, 1, c); P(x + 2, y + 1, 1, 1, c); P(x + 1, y + 2, 1, 1, c); P(x, y + 3, 4, 1, c); };
    const Zg = (x, y, c) => { Zg1(x + 1, y + 1, "#2a3a6a"); Zg1(x - 1, y, "#2a3a6a"); Zg1(x, y, c); };
    const drawTile = (s, tmm) => {
      const { x, y, w, h } = s.r, cx = x + (w >> 1), deskY = y + h - 8;
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      if (s.gone) { P(x, y, w, h, "#0c0d12"); }
      else if (s.st === "camoff") {
        camOffV(g, x, y, w, h, s.sp, tmm);
      } else {
        if (!s.bgH && rimg(s.roomK).ok) s.bgH = coverH(s.roomK, w, h, "rgba(30,20,50,.22)");
        if (s.bgH) { g.imageSmoothingEnabled = true; g.drawImage(s.bgH, x, y, w, h); g.imageSmoothingEnabled = false; } else g.drawImage(s.bg, x, y);
        const k = s.st, o = { f: s.wf };
        if (k === "sleep") { const bob = Math.abs(Math.sin(s.t * 2.1)); o.dy = s.jolt > 0 ? 1 : 2 + Math.round(bob * 4); o.eye = "close"; o.mouth = bob > 0.6 ? "drool" : "o"; }
        else if (k === "phone") { o.dy = 1; o.eye = "down"; o.mouth = Math.floor(s.t * 1.3) % 3 === 0 ? "smile" : "n"; o.arm = "phone"; o.glow = 1; o.scr = Math.floor(tmm * 6) % 5 ? "#7fd0ff" : "#ffc6e0"; }
        else if (k === "cat") { o.eye = "happy"; o.mouth = "smile"; o.arm = "desk"; }
        else if (k === "mute") { o.eye = "n"; o.mouth = Math.floor(tmm * 8) % 2 ? "open" : "n"; o.arm = "wave"; }
        else {
          if (s.jolt > 0) { o.eye = "wide"; o.mouth = "o"; o.mark = 1; o.dy = -1; }
          else if (s.sad > 0) { o.eye = "sad"; o.mouth = "sad"; o.sweat = 1; o.dy = 1; }
          else if (s.happy > 0) { o.eye = "happy"; o.mouth = "smile"; }
          else { o.eye = s.blink < 0.12 ? "close" : "n"; o.mouth = s.talk > 0 && Math.floor(tmm * 8) % 2 ? "open" : "n"; if (s.writing > 0) { o.arm = "write"; o.dy = 1; o.eye = "down"; } }
          if (s.hand || s.wave > 0) o.arm = s.wave > 0 ? "wave" : "up";
          if (s.card > 0) { o.arm = "up"; o.card = 1; }
        }
        const pArt = s.pr.ok;
        if (pArt) o.noBody = 1;
        if (pArt) deskV(g, x, w, deskY, y + h, s.sp.desk); else paintStu(g, s.sp, cx, deskY, o, x, w, y + h);
        if (!pArt) drawTop(s, tmm, x, y, w, h, cx, deskY, k);
      }
      // 잡음(카메라 켜고 끌 때)
      if (s.fx > 0) { for (let k = 0; k < 90; k++) P(x + rint(w), y + rint(h), 2, 1, pick(["#fff", "#9aa0b0", "#3a3d4a", "#000"])); }
      // 끝: 화면 꺼짐(가로줄로 접힘)
      if (s.offP >= 0 && !s.gone) { const p = clamp(s.offP, 0, 1), band = Math.max(1, Math.round(h * (1 - p) * 0.5)), mid = y + (h >> 1); P(x, y, w, mid - band - y, "#0c0d12"); P(x, mid + band, w, y + h - mid - band, "#0c0d12"); if (p > 0.7) P(x, mid - 1, w, 2, "#fff"); }
      g.restore();
      // 테두리: 말하는 사람은 초록
      const bc = s.gone ? "#22242e" : s.talk > 0 && s.st !== "mute" ? "#7CFC9A" : s.hand && quiz.on ? "#ffd166" : "#2c2f3c";
      P(x - 1, y - 1, w + 2, 1, bc); P(x - 1, y + h, w + 2, 1, bc); P(x - 1, y, 1, h, bc); P(x + w, y, 1, h, bc);
      if (bc === "#7CFC9A" || bc === "#ffd166") { P(x, y, w, 1, bc); P(x, y + h - 1, w, 1, bc); P(x, y, 1, h, bc); P(x + w - 1, y, 1, h, bc); }
    };
    // 학생 그림 위에 올라가는 것(졸음 Z·음소거·고양이): 그림 학생이면 위 캔버스에 그린다
    const drawTop = (s, tmm, x, y, w, h, cx, deskY, k) => {
      {
        // 졸음 Z
        s.zz.forEach((z) => { g.globalAlpha = clamp(1.6 - z.t, 0, 1); g.save(); g.font = "900 6px sans-serif"; g.textBaseline = "top"; g.lineWidth = 1.6; g.strokeStyle = "#2a3a6a"; g.strokeText("Z", x + z.x, y + z.y); g.fillStyle = "#fff"; g.fillText("Z", x + z.x, y + z.y); g.restore(); }); g.globalAlpha = 1;
        // 음소거 아이콘 + 안 들리는 소리
        if (k === "mute") {
          micV(x + 2, y + 2, "#ff5a6a", true);
          const ph = (tmm * 2) % 1; g.globalAlpha = 0.7 * (1 - ph); P(cx - 13 - Math.round(ph * 5), deskY - 18, 1, 4, "#c8ccdc"); P(cx - 15 - Math.round(ph * 5), deskY - 19, 1, 6, "#c8ccdc"); g.globalAlpha = 1;
        } else if (s.micOk > 0) micV(x + 2, y + 2, "#7CFC9A", false);
        // 고양이(카메라 바로 앞이라 2배)
        const drawCat = (c) => {
          const sp = c.ph === "walk" || c.ph === "out" ? (c.f ? s.cats.w1 : s.cats.w0) : c.ph === "sit" ? (Math.floor(c.t * 0.7) % 5 === 4 ? s.cats.sb : Math.floor(c.t * 1.6) % 2 ? s.cats.s1 : s.cats.s0) : s.cats.s0;
          const W2 = sp.width * 2, H2 = sp.height * 2, cy = c.ph === "out" ? y + h - H2 + 2 - Math.round(Math.sin(Math.min(1, c.t / 0.5) * Math.PI) * 14) : y + h - H2 + 3;
          const cxp = Math.round(x + c.x), walk = c.ph === "walk" || c.ph === "out";
          if (walk) catV(g, s.sp.cat, cxp, cy + 2, W2, H2 * 0.95, "walk", c.f, 0, 0, c.dir < 0);
          else catV(g, s.sp.cat, cxp, cy, W2 * 1.05, H2, "sit", 0, Math.floor(c.t * 1.6) % 2 === 0, Math.floor(c.t * 0.7) % 5 === 4, false);
        };
        if (s.cat) drawCat(s.cat); if (s.catOut) drawCat(s.catOut);
      }
    };
    // 마이크 아이콘(벡터)
    const micV = (x, y, col, mute) => { g.save(); rrV(g, x, y, 9, 10, 2.4); g.fillStyle = "#000a"; g.fill(); rrV(g, x + 3, y + 1.6, 3, 5, 1.5); g.fillStyle = col; g.fill(); g.strokeStyle = col; g.lineWidth = 0.7; g.beginPath(); g.arc(x + 4.5, y + 5, 2.6, 0.1, Math.PI - 0.1); g.moveTo(x + 4.5, y + 7.6); g.lineTo(x + 4.5, y + 8.8); g.stroke(); if (mute) { g.strokeStyle = "#fff"; g.lineWidth = 0.9; g.lineCap = "round"; g.beginPath(); g.moveTo(x + 1.6, y + 1.6); g.lineTo(x + 7.6, y + 8.6); g.stroke(); } g.restore(); };
    // 그림 학생: 표정·고개·폰·손 들기
    const PTX = { sleep: "blush", phone: "smile", cat: "smile", mute: "surprised" };
    const drawArt = (s, tmm) => {
      const { x, y, w, h } = s.r, cx = x + (w >> 1), deskY = y + h - 8, k = s.st;
      const hide = s.gone || k === "camoff" || s.offP >= 0.5;
      s.pt.style.opacity = hide ? "0" : s.fx > 0 || s.offP >= 0 ? "0.45" : "";
      if (!hide) {
        const ex = k !== "ok" ? PTX[k] : s.jolt > 0 ? "surprised" : s.sad > 0 ? "sad" : s.happy > 0 || s.wave > 0 || s.hand ? "smile" : "neutral";
        if (ex !== s.ptX) { s.ptX = ex; const i = EXI[ex]; s.pt.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? (540 / (1080 - 236) * 100).toFixed(3) : 0}%`; }
        let ty = 0, rot = 0;
        if (k === "sleep") { const bob = Math.abs(Math.sin(s.t * 2.1)); ty = s.jolt > 0 ? 2 : 4 + bob * 7; rot = 7 + bob * 4; }
        else if (k === "phone") { ty = 3; rot = -2; }
        else if (k === "mute") ty = -Math.abs(Math.sin(tmm * 9)) * 2;
        else if (s.jolt > 0) ty = -4;
        else if (s.sad > 0) ty = 3;
        else if (s.talk > 0) ty = -Math.abs(Math.sin(tmm * 8)) * 1.5;
        else if (s.writing > 0) { ty = 3; rot = 1; }
        else ty = Math.sin(tmm * 1.5 + s.i) * 0.8;
        const tf = `translateY(${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
        if (tf !== s.ptT) { s.ptT = tf; s.pt.style.transform = tf; }
        s.pt.classList.toggle("zz", k === "sleep");
      }
      s.ph.classList.toggle("on", !hide && k === "phone"); s.ph.classList.toggle("pk", Math.floor(tmm * 6) % 5 === 0);
      s.hd.classList.toggle("on", !hide && k === "ok" && (s.hand || s.wave > 0 || s.card > 0));
      const hdT = s.card > 0 ? "🃏" : s.wave > 0 ? "👋" : "✋"; if (s.hd.textContent !== hdT) s.hd.textContent = hdT;
      // 위 캔버스(타일 안으로 잘라서)
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      if (!s.gone && k !== "camoff") drawTop(s, tmm, x, y, w, h, cx, deskY, k);
      if (s.sad > 0 && !hide) { g.save(); g.fillStyle = "#9fd8ff"; g.beginPath(); g.moveTo(x + w - 11, y + 7.6); g.quadraticCurveTo(x + w - 8.6, y + 11.6, x + w - 11, y + 12.6); g.quadraticCurveTo(x + w - 13.4, y + 11.6, x + w - 11, y + 7.6); g.fill(); g.fillStyle = "#e6f6ff"; g.beginPath(); g.arc(x + w - 11.6, y + 11, 0.5, 0, 6.3); g.fill(); g.restore(); }
      g.restore();
    };
    const render = (tmm) => {
      g = g0; g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = false;
      if (!BGH && (rimg("home").ok || rimg("home").bad)) BGH = buildBGH();
      if (BGH) { g.imageSmoothingEnabled = true; g.drawImage(BGH, 0, 0, LW, LH); g.imageSmoothingEnabled = false; } else g.drawImage(BG, 0, 0);
      studs.forEach((s) => drawTile(s, tmm));
      // 내 화면 테두리(말할 때 초록)
      const r = ME_R, bc = ME.talk > 0 ? "#7CFC9A" : "#2c2f3c";
      P(r.x - 1, r.y - 1, r.w + 2, 1, bc); P(r.x - 1, r.y + r.h, r.w + 2, 1, bc); P(r.x - 1, r.y, 1, r.h, bc); P(r.x + r.w, r.y, 1, r.h, bc);
      // 위 효과층: 날아가는 퀴즈 카드, 색종이
      g = gF; g.setTransform(KS, 0, 0, KS, 0, 0); g.clearRect(0, 0, LW, LH); g.imageSmoothingEnabled = false;
      studs.forEach((s) => { if (s.pr.ok) drawArt(s, tmm); });
      fly.forEach((q) => { const p = clamp(q.t / q.d, 0, 1), xx = q.a[0] + (q.b[0] - q.a[0]) * p, yy = q.a[1] + (q.b[1] - q.a[1]) * p - Math.sin(p * Math.PI) * 18, sp = Math.floor(q.t * 20) % 2; P(Math.round(xx) - 4, Math.round(yy) - 3, sp ? 9 : 7, sp ? 7 : 8, "#fffdf2"); P(Math.round(xx) - 4, Math.round(yy) - 3, sp ? 9 : 7, 1, "#ffd166"); P(Math.round(xx) - 1, Math.round(yy) - 1, 2, 1, "#e0307a"); P(Math.round(xx), Math.round(yy), 1, 1, "#e0307a"); P(Math.round(xx), Math.round(yy) + 2, 1, 1, "#e0307a"); for (let k = 1; k < 4; k++) { const pp = Math.max(0, p - k * 0.06); g.globalAlpha = 0.25; P(Math.round(q.a[0] + (q.b[0] - q.a[0]) * pp), Math.round(q.a[1] + (q.b[1] - q.a[1]) * pp - Math.sin(pp * Math.PI) * 18), 2, 2, "#fff"); g.globalAlpha = 1; } });
      conf.forEach((c) => P(Math.round(c.x), Math.round(c.y), 1, c.k % 2 ? 2 : 1, c.c));
      // 내 캐릭터 표정·몸짓
      if (art) {
        const busy = studs.filter((s) => GEST[s.st]).length;
        const ex = ME.shock > 0 ? "surprised" : ME.blush > 0 ? "blush" : ME.smile > 0 ? "smile" : busy >= 3 ? "angry" : classF() < 40 ? "sad" : ME.talk > 0 ? "smile" : "neutral";
        if (ex !== meX) { meX = ex; const i = EXI[ex]; avEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 65.85 : 0}%`; }
        let tf = "";
        if (ME.shock > 0) tf = `translateX(${Math.floor(tmm * 30) % 2 ? 2 : -2}px)`;
        else if (ME.talk > 0) tf = `translateY(${Math.floor(tmm * 7) % 2 ? -2 : 0}px)`;
        else tf = `translateY(${(Math.sin(tmm * 1.6) * 1).toFixed(1)}px)`;
        if (tf !== meT) { meT = tf; avEl.style.transform = tf; }
      }
    };
    const classF = () => { const a = studs.filter((s) => !s.gone); return a.length ? a.reduce((t, s) => t + s.focus, 0) / a.length : 0; };
    const updHud = () => {
      const f = Math.round(classF()); cfBar.style.setProperty("--f", f + "%"); cfTx.textContent = f + "%"; cfEl.classList.toggle("low", f < 45); F.sc.textContent = `집중 ${f}%`;
      studs.forEach((s) => { const v = Math.round(s.focus); if (v !== s.shownF) { s.shownF = v; s.fbE.style.setProperty("--f", v + "%"); s.fb.className = "tu-fb" + (v < 35 ? " low" : v < 65 ? " mid" : ""); } });
    };

    // ── 흐름 ──
    const pickKind = () => { let tot = 0; const ws = KINDS.map((k, i) => (k === lastKind ? KW[i] * 0.25 : KW[i])); ws.forEach((v) => (tot += v)); let r = rnd() * tot; for (let i = 0; i < KINDS.length; i++) { r -= ws[i]; if (r <= 0) return KINDS[i]; } return "sleep"; };
    const spawnOne = () => {
      const free = studs.filter((s) => s.st === "ok" && s.grace <= 0 && s.t > 1 && s.sad <= 0 && s.card <= 0);
      if (!free.length) return false;
      const s = pick(free), k = pickKind(); lastKind = k; setOff(s, k); return true;
    };
    const startQuiz = () => {
      quiz.on = true; quiz.t = 0; quiz.q = pick(QUIZ); bdEl.classList.add("qz"); qzB.textContent = quiz.q[0]; qzS.textContent = quiz.q[1];
      banner("오늘의 퀴즈!<small>모두 집중해 있으면 보너스</small>", "gd"); say("자, 오늘의 퀴즈! 다들 손 들어 볼까?", "", 1.8);
      [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, "square", 0.07, 0, i * 0.08)); vib([20, 30, 20]);
      spawnOne(); setTimeout(() => { if (!over && quiz.on) spawnOne(); }, 700); setTimeout(() => { if (!over && quiz.on) spawnOne(); }, 2600);
    };
    const endQuiz = () => {
      quiz.on = false; quiz.done = true; bdEl.classList.remove("qz");
      const ok = studs.filter((s) => s.st === "ok").length; quizOk = ok;
      studs.forEach((s) => { s.hand = false; });
      if (ok === 4) {
        quizS = 1; banner("전원 정답!<small>집중 보너스 +15</small>", "rb"); studs.forEach((s) => { s.focus = clamp(s.focus + 15, 0, 100); s.happy = 1.2; F.burst(tileP(s), "#ffd166", 10); });
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.07, 0, i * 0.07)); vib([30, 30, 60]); ME.smile = 1.5; say("와, 다 맞혔네! 최고!", "", 1.5);
        for (let k = 0; k < (RM() ? 20 : 70); k++) conf.push({ x: rnd() * LW, y: -rnd() * 30, vy: 22 + rnd() * 25, vx: (rnd() - 0.5) * 10, c: pick(["#ffd166", "#ff7eb6", "#7fe0c0", "#7fd0ff", "#c77dff"]), k: rint(4) });
      } else {
        quizS = ok >= 3 ? 0.55 : ok / 4 * 0.4; banner(`${ok}/4명 정답<small>딴짓한 학생이 있었어요</small>`); SFX.tok(); say(ok >= 3 ? "아깝다, 거의 다 맞혔어!" : "음… 다음엔 다 같이 맞혀 보자", "", 1.4);
      }
    };

    // ── 리허설 ──
    const handAt = (s, mode) => {
      if (!s) { hand.className = "tu-hand"; return; }
      hand.style.left = Math.round((s.r.x + s.r.w * 0.66) * K) + "px"; hand.style.top = Math.round((s.r.y + s.r.h * 0.5) * K) + "px";
      const c = "tu-hand on " + mode; if (hand.className !== c) hand.className = c;
    };
    hand.style.backgroundImage = `url(${fingerURL()})`;
    const SKIP = `<button class="tu-skip" data-skip>건너뛰기</button>`;
    const TUT = [null,
      [0, "sleep", (n) => `<b>${n}</b>가 졸아요! 화면을<br><b class="pu">톡톡</b> 빠르게 두 번 눌러 깨워요.`],
      [1, "phone", (n) => `폰 보는 학생은 화면을<br><b class="bl">쓱 밀어서</b> 퀴즈를 던져요!`],
      [2, "camoff", () => `카메라를 껐어요.<br>화면을 <b class="or">꾹 길게</b> 눌러 불러요.`],
      [3, "cat", () => `고양이 등장! <b class="gd">톡</b> 한 번.<br>빨간 마이크(음소거)도 <b class="gd">톡</b>!`],
    ];
    const tutNext = (n) => {
      tut = n; tutT = 0; tutS = null; handAt(null); tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n >= 1 && n <= 4) {
        const [i, kind, txt] = TUT[n], s = studs[i]; tutS = s;
        tutP.innerHTML = txt(s.name.replace(/(.)$/, "$1")); tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut === n && s.st === "ok") { s.grace = 0; setOff(s, kind); showTag(s, true); } }, 450);
        if (n === 1) say("수업 전에 리허설 해 볼게요!", "", 1.6);
      } else if (n === 5) {
        say("좋아요, 수업 시작해 볼까요?", "", 1.6); ME.smile = 1.2;
        tutP.innerHTML = `완벽해요! <b class="rd">잘 듣는 학생</b>을 부르면 서운해해요.<br>중간 <b class="gd">오늘의 퀴즈</b> 때 모두 집중하면 보너스!`;
        tutB.innerHTML = `<button class="tu-go" data-go>수업 시작!</button>`;
      }
    };
    // 리허설 글: 받침 따라 '가/이'
    TUT[1][2] = (n) => { const c = n.charCodeAt(n.length - 1) - 0xac00; return `<b>${n}</b>${c >= 0 && c % 28 ? "이" : "가"} 졸아요! 화면을<br><b class="pu">톡톡</b> 빠르게 두 번 눌러 깨워요.`; };
    const startGame = () => {
      if (tut < 0) return; tut = -1; tutS = null; handAt(null); tutEl.classList.add("off");
      studs.forEach((s, i) => { s.st = "ok"; s.cat = null; s.catOut = null; s.zz.length = 0; s.focus = 85; s.t = 0.6; s.grace = 0; s.sad = 0; s.jolt = 0; s.hand = false; s.card = 0; s.fx = 0.3 + i * 0.12; s.bub.classList.remove("on"); showTag(s, false); });
      fixes = 0; wrongs = 0; calls = 0; combo = 0; fSum = 0; fT = 0; distT = 0; el = 0; nextSpawn = 1.3; lastKind = ""; lessonN = 0; quizOk = 0; quizS = 0; quiz.on = false; quiz.done = false; fly.length = 0;
      bdP.forEach((p) => p.classList.remove("on")); bdP.forEach((p, i) => (p.textContent = LESSON[i]));
      st.classList.add("tags"); banner("수업 시작!<small>딴짓하는 학생을 불러요</small>"); SFX.go?.(); say("자, 오늘도 시작해 볼까요?", "", 1.6);
      studs.forEach((s, i) => setTimeout(() => tone(660 + i * 120, 0.06, "triangle", 0.06), i * 120));
      updHud();
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
        if (tut >= 1 && tut <= 4 && tutS && GEST[tutS.st]) handAt(tutS, HMODE[GEST[tutS.st]]); else handAt(null);
      } else if (!over) {
        el += dt;
        // 딴짓 생성
        const prog = el / T, active = studs.filter((s) => GEST[s.st]).length, maxA = prog < 0.2 ? 1 : prog < 0.45 ? 2 : prog < 0.72 ? 3 : 4;
        if (el >= nextSpawn && !quiz.on) { if (active < maxA) spawnOne(); nextSpawn = el + (2.0 - 0.9 * prog) * ez * (0.8 + rnd() * 0.4); }
        if (el >= QUIZ_AT && !quiz.on && !quiz.done) startQuiz();
        if (quiz.on) {
          quiz.t += dt; qzI.style.setProperty("--p", (1 - quiz.t / QLEN).toFixed(3));
          studs.forEach((s) => { if (s.st === "ok" && s.sad <= 0 && s.card <= 0) { s.hand = true; if (!s.ans && quiz.t > 0.9 + s.i * 0.35) { s.ans = true; bub(s, quiz.q[2], "ans", 1.3); } } else s.hand = false; });
          if (quiz.t >= QLEN) endQuiz();
        }
        // 칠판 진도
        const ln = Math.min(LESSON.length, 1 + Math.floor(el / 6)); if (ln > lessonN) { lessonN = ln; bdP.forEach((p, i) => p.classList.toggle("on", i < ln)); }
        // 집중도
        studs.forEach((s) => {
          if (GEST[s.st]) s.focus -= dt * DRAIN[s.st] * (s.t > 5 ? 1.5 : 1) / ez;
          else if (s.sad <= 0) s.focus += dt * 9;
          s.focus = clamp(s.focus, 0, 100);
          // 저절로 끝나는 딴짓: 고양이는 9초 뒤 떠나고, 음소거는 7초 뒤 포기
          if (s.st === "cat" && s.t > 9) { s.catOut = s.cat ? { ...s.cat, ph: "out", t: 0 } : null; s.cat = null; s.st = "ok"; s.t = 0; s.focus = Math.max(0, s.focus - 5); }
          if (s.st === "mute" && s.t > 7) { s.st = "ok"; s.t = 0; bub(s, "(포기)…", "sad", 1); }
        });
        const cf = classF(); fSum += cf * dt; fT += dt; distT += dt * (studs.filter((s) => GEST[s.st]).length + studs.filter((s) => s.sad > 0).length * 0.5);
        // 손가락·표시: 처음 8초는 할 일 표시 다 보이고, 그 뒤엔 오래 놔둔 것만
        let worst = null;
        studs.forEach((s) => { if (GEST[s.st]) { showTag(s, el < 8 || s.t > 2.6 || quiz.on); if (!worst || s.t > worst.t) worst = s; } else showTag(s, false); });
        if (worst && (el < 6 || worst.t > 3.8 || (quiz.on && quiz.t > 1))) handAt(worst, HMODE[GEST[worst.st]]); else handAt(null);
        if (el - lastSay > 5 && el > 3 && sayT <= 0 && !quiz.on) say(pick(IDLE), "", 1.5);
        updHud();
      }
      // 학생 상태 갱신
      studs.forEach((s) => {
        s.t += dt; for (const k of ["grace", "sad", "jolt", "happy", "wave", "card", "talk", "fx", "micOk", "writing"]) if (s[k] > 0) s[k] -= dt;
        s.blink -= dt; if (s.blink < 0) s.blink = 1.8 + rnd() * 2.5;
        s.wT -= dt; if (s.wT < 0) { s.wT = 0.18; s.wf = 1 - s.wf; }
        if (s.st === "ok" && s.writing <= 0 && rnd() < dt * 0.25) s.writing = 1 + rnd() * 1.2;
        if (s.bubT > 0) { s.bubT -= dt; if (s.bubT <= 0) s.bub.classList.remove("on"); }
        if (s.st === "sleep") { s.zT -= dt; if (s.zT <= 0) { s.zT = 0.65; s.zz.push({ x: s.r.w / 2 + 9, y: s.r.h - 38, t: 0 }); } }
        if (s.st === "mute" && s.bubT <= 0 && s.t > 0.5 && rnd() < dt * 2) bub(s, pick(MUTED), "mute", 2);
        for (let i = s.zz.length - 1; i >= 0; i--) { const z = s.zz[i]; z.t += dt; z.y -= dt * 9; z.x += Math.sin(z.t * 4) * dt * 6; if (z.t > 1.6) s.zz.splice(i, 1); }
        if (s.cat) { const c = s.cat; c.t += dt; if (c.ph === "walk") { c.x += c.dir * dt * 36; if (Math.floor(c.t * 6) % 2 !== c.f) c.f = 1 - c.f; const tx0 = s.r.w / 2 - 15 + (c.dir > 0 ? 4 : -4); if ((c.dir > 0 && c.x >= tx0) || (c.dir < 0 && c.x <= tx0)) { c.x = tx0; c.ph = "sit"; c.t = 0; } } }
        if (s.catOut) { const c = s.catOut; c.t += dt; c.x += c.dir * dt * 70; if (Math.floor(c.t * 8) % 2 !== c.f) c.f = 1 - c.f; if (c.t > 1.2) s.catOut = null; }
        if (s.offP >= 0 && !s.gone) { s.offP += dt / 0.35; if (s.offP >= 1) { s.gone = true; s.el.classList.add("gone"); s.nm.innerHTML = `${s.name} 님이 나갔어요`; tone(520, 0.08, "sine", 0.05, -200); } }
      });
      for (let i = fly.length - 1; i >= 0; i--) { const q = fly[i]; q.t += dt; if (q.t >= q.d) { fly.splice(i, 1); q.s.card = 0.9; q.s.jolt = 0.3; F.burst(tileP(q.s), "#fffdf2", 8); SFX.snap(); } }
      for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.y += c.vy * dt; c.x += c.vx * dt; c.k = (c.k + 1) % 8; if (c.y > LH) conf.splice(i, 1); }
      for (const k of ["smile", "shock", "talk", "blush"]) if (ME[k] > 0) ME[k] -= dt;
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      // 꾹 누르기 원
      if (pd && !pd.fired) {
        const held = (performance.now() - pd.t) / 1000;
        if (held > 0.12) { pd.s.ring.classList.add("on"); pd.s.ring.style.setProperty("--p", clamp((held - 0.12) / (HOLD - 0.12), 0, 1).toFixed(3)); }
        if (held >= HOLD) { const s = pd.s; pd.fired = true; ringOff(); gesture(s, "hold"); }
      }
      render(clk);
      raf = requestAnimationFrame(loop);
    };

    // ── 수업 끝: 감사합니다~ → 화면 하나씩 꺼짐 → 학부모 메시지 → 결과 ──
    const end = () => {
      if (over) return; over = true; pd = null; ringOff(); handAt(null);
      if (quiz.on) endQuiz();
      const dF = fT ? distT / (4 * fT) : 0.5, avg = Math.round((1 - dF) * 100), fS = clamp(1 - (dF - 0.05) / 0.45, 0, 1), acc = fixes ? clamp(fixes / (fixes + wrongs), 0, 1) : 0;
      const score = fS * 0.6 + acc * 0.25 + quizS * 0.15;
      studs.forEach((s) => { showTag(s, false); if (s.st === "cat" && s.cat) { s.catOut = { ...s.cat, ph: "out", t: 0 }; s.cat = null; } if (s.st === "camoff") s.fx = 0.3; s.st = "ok"; s.zz.length = 0; s.hand = false; });
      banner("수업 끝!<small>오늘도 수고했어요</small>"); say("오늘 수업 끝! 다들 수고했어요~", "", 1.8); ME.smile = 2;
      [784, 988, 1175].forEach((f, i) => tone(f, 0.14, "triangle", 0.08, 0, i * 0.1));
      studs.forEach((s, i) => {
        setTimeout(() => { if (done) return; s.wave = 1.6; s.happy = 1.6; bub(s, pick(["감사합니다~", "수고하셨습니다!", "안녕히 계세요~", "다음 주에 봬요!"]), "ok", 1.3); tone(880 + i * 90, 0.06, "sine", 0.06); }, 450 + i * 280);
        setTimeout(() => { if (done) return; s.offP = 0; s.bub.classList.remove("on"); }, 1750 + i * 260);
      });
      setTimeout(() => {
        if (done) return;
        const s = pick(studs), a = 62 + rint(18), good = score >= 0.7, mid = score >= 0.4;
        const msg = good ? `선생님~ 이번 시험 올랐어요! <u>${a}점 → ${Math.min(100, a + 14 + rint(8))}점</u>이에요. 화상으로도 이렇게 될 줄 몰랐어요ㅠㅠ 다음 달도 부탁드려요!`
          : mid ? `선생님, 이번 시험 조금 올랐어요~ <u>${a}점 → ${a + 4 + rint(4)}점</u>! 다음엔 더 오를 거예요 ㅎㅎ`
          : `선생님… 아이가 수업 때 졸았다고 하네요ㅠ 이번 시험은 <u>${a}점 그대로</u>예요. 조금만 더 챙겨 주세요!`;
        const pm = document.createElement("div"); pm.className = "tu-pm" + (mid ? "" : " sad");
        pm.innerHTML = `<i>온</i><div><small>과외온 · 학부모 메시지 · 방금</small><b>${s.name} 어머님</b><p>${msg}</p></div>`;
        st.appendChild(pm); kakao(); vib([15, 40, 15]); ME.blush = good ? 3 : 0; if (!mid) ME.shock = 0.8;
        if (good) { F.burst([sw / 2, sh * 0.28], "#ff7eb6", 16); setTimeout(() => SFX.ding(4), 300); }
      }, 3000);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        finish(score, `수업 집중 시간 <b>${avg}%</b> · 깨운 학생 ${fixes}번 · 퀴즈 ${quizOk}/4`, "", [["집중 시간", fS], ["알맞은 대응", acc], ["오늘의 퀴즈", quizS]]);
      }, 5600);
    };

    if (dbg) dbg.tutoring1 = {
      studs, st: () => ({ el: +el.toFixed(2), tut, fixes, wrongs, focus: Math.round(classF()), quizOk, quizS, over, art, states: studs.map((s) => s.st).join(",") }),
      tut: () => tut, start: startGame, gesture, setOff,
      tutDo: () => { if (tut >= 1 && tut <= 4 && tutS && GEST[tutS.st] && tutS.t > 0.3) gesture(tutS, GEST[tutS.st]); else if (tut === 5) startGame(); },
      auto: () => { const s = studs.filter((q) => GEST[q.st] && q.t > 0.35 && q.grace <= 0).sort((a, b) => b.t - a.t)[0]; if (s) gesture(s, GEST[s.st]); },
    };
    updHud(); render(0);
    raf = requestAnimationFrame(loop);
  },
};
