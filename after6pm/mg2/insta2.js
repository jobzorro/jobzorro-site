// 미니게임 2탄(insta2) "이건 라방 떡상 각": 인별그램 첫 라이브. 도트 방 앞에서 내가 말하고 손 흔든다.
// 채팅이 아래에서 위로 쏟아진다. 좋은 질문·칭찬은 톡(답하기), 악플·도배는 옆으로 밀어 가리기, 금색 협찬·후원은 큰 보너스.
// 중간에 "링크 주세요!" 몰림(공구 링크 버튼 타이밍)과 "떡상 구간"(시청자 폭증)이 있다. 30초. 점수 = 최고 시청자 + 분위기.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec } from "../mg.js";

// 닉네임은 지어낸 말 조합(실제 사람 이름 금지)
const NICK_A = ["졸린", "배고픈", "퇴근한", "야근", "새벽", "주말", "말랑", "반짝", "작은", "용감한", "월요병", "출근길", "통통", "꿈꾸는", "느긋한", "수줍은"];
const NICK_B = ["감자", "고양이", "판다", "두부", "만두", "곰돌", "펭귄", "라떼", "토끼", "도토리", "치즈", "별빛", "호떡", "붕어빵", "단무지", "고구마"];
const GOOD = [
  ["첫방 축하해요!!", "와 와 줘서 고마워요!"], ["조명 너무 예쁘다 어디 거예요?", "링라이트요! 이따 링크 드릴게요"], ["목소리 좋으세요~", "헤헤 칭찬 감사해요~"],
  ["퇴근하고 투잡 하시는 거죠? 대단", "네! 저녁엔 제2의 인생ㅎㅎ"], ["오늘 화장 뭐 쓰셨어요?", "다 공구템이에요, 곧 알려 드려요!"], ["방 꾸민 거 감성 미쳤다", "직접 다 꾸몄어요!"],
  ["몇 시에 또 방송해요?", "매주 금요일 밤 9시예요!"], ["첫방인데 안 떨리시는 듯", "사실 손 떨려요ㅋㅋ"], ["팔로우 하고 가요~", "어서 오세요! 반가워요"],
  ["그 머그컵 귀엽다", "제 최애 컵이에요!"], ["본업은 뭐 하세요?", "평범한 회사원이에요ㅎㅎ"], ["화면 밝고 좋아요", "조명 빨이에요ㅋㅋ"],
  ["뒤에 하트 네온 어디 거?", "온라인에서 샀어요, 알려 드릴게요"], ["언니 웃는 거 귀여워요", "아 부끄러워요ㅎㅎ"], ["저도 투잡 해 보고 싶어요", "같이 해요! 생각보다 재밌어요"],
  ["오늘 소개할 거 뭐예요?", "제가 써 본 진짜 꿀템이요!"], ["친구 데려왔어요~", "친구분도 환영해요!"], ["말 진짜 잘하시네", "연습 엄청 했어요ㅋㅋ"],
];
const BAD = ["노잼 ㅋㅋ 나감", "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ", "광고) 팔로워 1만 명 3천 원 ▶", "얼굴이 왜 그럼?", "ㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁ", "이거 다 알바지?", "목소리 별로",
  "코인 리딩방 ㄱㄱ ▶▶", "재미없음", "도배도배도배도배도배", "누가 봄? ㅋ", "회사에 투잡 이른다~", "ㅡㅡ", "광고) 부업 월 500 ▶ 클릭", "ㅎㅇㅎㅇㅎㅇㅎㅇㅎㅇ", "방송 접어라"];
const BAD_REPLY = ["어… 그, 그래요?", "아… 네…;;", "음… 죄송해요…", "그런 말은 좀…ㅠ", "헉… 왜요…?"];
const LINKS = ["링크 주세요!", "링크!!", "어디서 사요?", "링크 링크", "공구 언제 열려요?", "저도 링크요ㅠ", "링크 빨리요!!", "사고 싶어요"];
const GOLD = [
  ["협찬 문의", "저희 제품 리뷰 가능하세요?", "와 감사합니다! 메시지 확인할게요!"], ["후원 5,000원", "첫방 응원해요!", "후원 감사합니다!!"],
  ["후원 10,000원", "목소리 좋아서 후원해요", "헉 만 원이나! 감사해요!!"], ["협찬 문의", "다음 공구 같이 하실래요?", "좋아요! 꼭 연락드릴게요!"], ["후원 3,000원", "커피 한 잔 하세요~", "커피 잘 마실게요!"],
];
const IDLE = ["오늘 첫 라이브예요! 떨려요ㅎㅎ", "퇴근하고 바로 켰어요~", "질문 남겨 주시면 다 답해요!", "제 방 어때요? 직접 꾸몄어요", "조명 괜찮나요?", "오늘 소개할 거 진짜 좋아요!"];
const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
const HCOL = ["#ff4f8b", "#ff7eb6", "#ff3b5c", "#ffd166", "#c77dff", "#7fe0c0"];
const NEON = ["..XX...XX..", ".X..X.X..X.", "X....X....X", "X.........X", ".X.......X.", "..X.....X..", "...X...X...", "....X.X....", ".....X....."];

// 색 밝기 바꾸기(f<1 어둡게, f>1 밝게)
const tint = (c, f) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const fmt = (n) => Math.round(n).toLocaleString();
const nick = (r) => r(NICK_A) + r(NICK_B) + (Math.random() < 0.45 ? "_" + (10 + Math.floor(Math.random() * 89)) : "");
// 어두운 1픽셀 테두리
function outline(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, W = c.width, H = c.height, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[(y * W + x) * 4 + 3] > 200;
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) add.push((y * W + x) * 4);
  for (const i of add) { a[i] = 26; a[i + 1] = 16; a[i + 2] = 34; a[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}

// ── 나(상반신 크게) ── o: { eye: n|blink|happy|shock, mouth: smile|open|o|flat, arm: rest|wave|up2|hold, w: 흔들기 0/1 }
function paintMe(g, s, cx, y0, deskY, o) {
  const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const sk = s.skin, skD = tint(sk, 0.86), hc = s.hair, hcL = tint(hc, 1.45), hcD = tint(hc, 0.72);
  const s1 = s.shirt, s2 = tint(s1, 0.78), s3 = tint(s1, 1.18), st = s.style, yS = y0 + 20, D = "#2a1e2e";
  // 뒤쪽 머리
  if (st === "long") P(cx - 10, y0 + 4, 20, 27, hcD); else if (st === "bob") P(cx - 10, y0 + 4, 20, 15, hcD);
  // 몸통
  const bh = deskY - yS + 2;
  P(cx - 13, yS, 26, 2, s1); P(cx - 15, yS + 2, 30, bh - 2, s1); P(cx - 15, yS + 2, 3, bh - 2, s2); P(cx + 12, yS + 2, 3, bh - 2, s2); P(cx - 13, yS, 26, 1, s3);
  P(cx - 3, yS, 6, 2, sk); P(cx - 2, yS + 2, 4, 1, sk); P(cx - 1, yS + 3, 2, 1, sk); P(cx - 4, yS, 1, 3, s3); P(cx + 3, yS, 1, 3, s3);
  P(cx - 1, yS + 4, 2, 1, "#ffe9a8"); // 목걸이
  P(cx + 5, yS + 9, 4, 3, s3); P(cx + 6, yS + 10, 2, 1, "#ff7eb6"); // 가슴 하트 자수
  // 팔
  const w = o.w ? 2 : 0;
  const upR = (dx) => { P(cx + 13, yS + 1, 3, 4, s2); P(cx + 15, yS - 4, 3, 6, s2); P(cx + 16 + dx, yS - 10, 3, 7, sk); P(cx + 15 + dx, yS - 15, 5, 5, sk); P(cx + 15 + dx, yS - 16, 1, 1, sk); P(cx + 17 + dx, yS - 16, 1, 1, sk); P(cx + 19 + dx, yS - 15, 1, 1, sk); P(cx + 15 + dx, yS - 11, 5, 1, skD); };
  const upL = (dx) => { P(cx - 16, yS + 1, 3, 4, s2); P(cx - 18, yS - 4, 3, 6, s2); P(cx - 19 - dx, yS - 10, 3, 7, sk); P(cx - 20 - dx, yS - 15, 5, 5, sk); P(cx - 16 - dx, yS - 16, 1, 1, sk); P(cx - 18 - dx, yS - 16, 1, 1, sk); P(cx - 20 - dx, yS - 15, 1, 1, sk); P(cx - 20 - dx, yS - 11, 5, 1, skD); };
  const downL = () => P(cx - 17, yS + 3, 3, deskY - yS - 2, s2), downR = () => P(cx + 14, yS + 3, 3, deskY - yS - 2, s2);
  if (o.arm === "wave") { downL(); upR(w); }
  else if (o.arm === "up2") { upL(w); upR(w); }
  else if (o.arm === "hold") {
    downL(); P(cx + 13, yS + 1, 3, 4, s2); P(cx + 15, yS - 4, 3, 6, s2); P(cx + 16, yS - 8, 3, 5, sk);
    const by = yS - 19 + (o.w ? -1 : 0);
    P(cx + 12, by, 12, 11, "#ff7eb6"); P(cx + 12, by, 12, 2, "#ffa8d0"); P(cx + 17, by, 2, 11, "#fff3b0"); P(cx + 12, by + 5, 12, 1, "#fff3b0"); P(cx + 15, by - 2, 2, 2, "#fff3b0"); P(cx + 19, by - 2, 2, 2, "#fff3b0");
    P(cx + 14, by + 9, 7, 3, sk);
  } else { downL(); downR(); }
  // 목·머리
  P(cx - 3, y0 + 17, 6, 4, skD);
  P(cx - 7, y0 + 3, 14, 15, sk); P(cx - 8, y0 + 5, 16, 11, sk); P(cx - 6, y0 + 18, 12, 1, sk);
  P(cx - 9, y0 + 9, 1, 3, sk); P(cx + 8, y0 + 9, 1, 3, sk); P(cx + 8, y0 + 12, 1, 1, "#ffd166"); // 귀걸이
  P(cx - 7, y0 + 5, 14, 1, skD);
  // 얼굴
  const ey = y0 + 10, ex = [cx - 5, cx + 2], my = y0 + 15;
  if (o.eye === "blink") ex.forEach((x) => P(x, ey + 1, 3, 1, D));
  else if (o.eye === "happy") ex.forEach((x) => { P(x, ey + 1, 1, 1, D); P(x + 1, ey, 1, 1, D); P(x + 2, ey + 1, 1, 1, D); });
  else if (o.eye === "shock") { ex.forEach((x) => { P(x, ey - 1, 3, 3, "#fff"); P(x + 1, ey, 1, 1, D); }); P(cx - 5, ey - 3, 3, 1, hcD); P(cx + 2, ey - 3, 3, 1, hcD); P(cx + 6, ey - 4, 1, 3, "#9fd8ff"); P(cx + 6, ey - 1, 1, 1, "#d6f0ff"); }
  else ex.forEach((x) => { P(x, ey, 3, 3, D); P(x, ey, 1, 1, "#fff"); P(x + 1, ey + 2, 2, 1, "#5a4a7a"); });
  if (o.eye !== "shock") { P(cx - 5, ey - 2, 3, 1, hcD); P(cx + 2, ey - 2, 3, 1, hcD); }
  P(cx - 7, ey + 3, 2, 1, "#f39aa6"); P(cx + 5, ey + 3, 2, 1, "#f39aa6");
  const M = "#b04a5a";
  if (o.mouth === "open") { P(cx - 1, my, 3, 2, "#6a1f2a"); P(cx, my + 1, 1, 1, "#e07080"); }
  else if (o.mouth === "o") { P(cx - 1, my, 2, 2, "#6a1f2a"); }
  else if (o.mouth === "flat") { P(cx - 1, my + 1, 3, 1, M); }
  else { P(cx - 2, my, 1, 1, M); P(cx - 1, my + 1, 3, 1, M); P(cx + 2, my, 1, 1, M); }
  if (s.glasses) { const G = "#3a2a3a"; for (const x of [cx - 6, cx + 1]) { P(x, ey - 1, 5, 1, G); P(x, ey + 3, 5, 1, G); P(x, ey - 1, 1, 5, G); P(x + 4, ey - 1, 1, 5, G); } P(cx - 1, ey, 2, 1, G); }
  // 앞머리
  if (st === "buzz") { P(cx - 8, y0 + 2, 16, 3, hc); P(cx - 7, y0 + 1, 14, 1, hc); P(cx - 4, y0 + 2, 4, 1, hcL); }
  else {
    P(cx - 6, y0 - 1, 12, 1, hc); P(cx - 8, y0, 16, 2, hc); P(cx - 9, y0 + 2, 18, 3, hc);
    P(cx - 8, y0 + 5, 4, 2, hc); P(cx - 3, y0 + 5, 3, 1, hc); P(cx + 2, y0 + 5, 6, 2, hc); P(cx + 5, y0 + 7, 3, 1, hc);
    const side = st === "long" ? 22 : st === "bob" ? 10 : st === "bun" ? 6 : 4;
    P(cx - 9, y0 + 5, 2, side, hc); P(cx + 7, y0 + 5, 2, side, hc);
    if (st === "long") { P(cx - 10, y0 + 14, 2, 13, hc); P(cx + 8, y0 + 14, 2, 13, hc); }
    if (st === "spiky") for (let x = cx - 7; x < cx + 7; x += 3) P(x, y0 - 2, 2, 2, hc);
    if (st === "bun") { P(cx - 3, y0 - 5, 6, 5, hc); P(cx - 2, y0 - 6, 4, 1, hc); P(cx - 2, y0 - 4, 2, 1, hcL); }
    P(cx - 5, y0 + 1, 5, 1, hcL); P(cx - 6, y0 + 2, 2, 1, hcL);
    if (s.clip) { P(cx + 4, y0 + 3, 3, 2, s.clip); P(cx + 5, y0 + 3, 1, 1, "#fff"); }
  }
}
// 내 겉모습: uSpec 에서 머리·피부·옷 색을 받아 쓰고, 방송용으로 조금 화사하게
function meSpec() {
  const s = uSpec(pick(["plain", "student", "worker", "teen"]));
  s.shirt = pick(["#ff8fc8", "#7fc8ff", "#ffd166", "#b89cff", "#7fe0a8", "#f2f2f2", "#ff9f7a"]);
  s.clip = rnd() < 0.5 ? pick(["#ff5f9e", "#ffd166", "#7fe0c0"]) : null; s.glasses = rnd() < 0.25;
  return s;
}

// 도트 손가락(리허설 안내). X 테두리, o 살
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];
function fingerURL() {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, 12 - y, 1, 1); }));
  return c.toDataURL();
}
// 방법 화면 그림(작은 도트 3장)
function stepPics() {
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d"); fn(g, (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }); outline(c); return c.toDataURL(); };
  const heart = (P, x, y, col) => HEART.forEach((r, j) => [...r].forEach((ch, i) => ch === "X" && P(x + i, y + j, 1, 1, col)));
  const s = meSpec();
  const a = mk((g, P) => { P(1, 8, 32, 9, "#4a3f66"); P(3, 11, 7, 1, "#ffc6e0"); P(12, 11, 12, 1, "#ddd"); P(25, 10, 6, 5, "#ff5f9e"); P(26, 12, 4, 1, "#fff"); FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(14 + x, 15 + y, 1, 1, ch === "X" ? "#2a1e2e" : "#ffe6d6"); })); heart(P, 30, 26, "#ff4f8b"); heart(P, 2, 24, "#ffd166"); });
  const b = mk((g, P) => {
    P(2, 6, 26, 7, "#4a3f66"); P(4, 8, 6, 1, "#ffc6e0"); P(12, 8, 12, 1, "#ddd");
    P(10, 17, 26, 7, "#7a2a3a"); P(12, 19, 6, 1, "#ffc6e0"); P(20, 19, 12, 1, "#fff"); P(4, 19, 4, 1, "#fff"); P(2, 18, 3, 3, "#fff");
    P(2, 28, 26, 7, "#4a3f66"); P(4, 30, 6, 1, "#ffc6e0"); P(12, 30, 10, 1, "#ddd");
    P(34, 16, 2, 1, "#ff3b5c"); P(36, 17, 1, 1, "#ff3b5c"); P(36, 21, 1, 1, "#ff3b5c"); P(34, 22, 2, 1, "#ff3b5c");
  });
  const c = mk((g, P) => {
    P(2, 4, 36, 8, "#c9961c"); P(3, 5, 34, 6, "#ffd166"); P(5, 7, 8, 2, "#5a3300"); P(15, 7, 18, 2, "#7a5300");
    for (const [x, y] of [[6, 18], [14, 24], [24, 17]]) { P(x, y, 5, 5, "#ffd166"); P(x + 1, y + 1, 1, 2, "#fff3b0"); P(x + 2, y + 2, 1, 1, "#c9961c"); }
    P(26, 25, 12, 12, "#ff5f9e"); P(28, 27, 8, 8, "#d81b60"); P(29, 29, 3, 2, "#fff"); P(32, 31, 3, 2, "#fff"); P(31, 30, 2, 2, "#ffd166");
  });
  return [[`<img src="${a}" alt="">`, "좋은 댓글은 톡"], [`<img src="${b}" alt="">`, "악플은 옆으로 밀기"], [`<img src="${c}" alt="">`, "금색·링크 꼭 잡기"]];
}

export const GAME = {
  key: "insta2", base: "insta", n: "이건 라방 떡상 각", desc: "떨리는 첫 라이브, 채팅을 받아 치며 시청자를 모아요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 채팅이 아래에서 올라오면 <b>좋은 질문·칭찬</b>은 톡 해서 답하면 시청자와 하트가 늘어요.",
    "<b>악플·도배·광고</b>는 옆으로 <b>밀어서</b> 가려요. 악플에 답하거나, 가리지 않고 두면 분위기가 싸해져요.",
    "<b>금색</b> 협찬 문의·후원은 큰 보너스! 중간에 <b>링크 주세요!</b>가 몰리면 원이 꽉 찼을 때 <b>공구 링크</b> 버튼을 눌러요. 그다음엔 떡상 구간이 와요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "좋은 댓글은 톡"], ["", "악플은 옆으로 밀기"], ["", "금색·링크 꼭 잡기"]]; } },
  css: `
.mg-insta2 .lv-st{background:#120c1e!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-insta2 .lv-cv{position:absolute;left:0;top:0;z-index:0;image-rendering:pixelated;image-rendering:crisp-edges}
.mg-insta2 .mg-msg{top:auto;bottom:calc(43% + 10px);z-index:22}
.mg-insta2 .mg-steps img{width:76px;height:76px;image-rendering:pixelated}
.mg-insta2 .lv-hud{position:absolute;left:8px;top:8px;z-index:5;display:flex;align-items:center;gap:6px;pointer-events:none}
.mg-insta2 .lv-live{background:linear-gradient(#ff4b6c,#e0123d);color:#fff;font-size:11px;font-weight:900;padding:3px 7px;border-radius:5px;letter-spacing:.6px;box-shadow:0 0 10px #ff3b5c88;opacity:.25}
.mg-insta2 .lv-live.on{opacity:1;animation:lvpop .5s cubic-bezier(.3,1.8,.5,1)}
.mg-insta2 .lv-vw{display:flex;align-items:center;gap:5px;background:#000a;color:#fff;font-size:12px;font-weight:800;padding:3px 8px 3px 7px;border-radius:5px;transition:background .3s,box-shadow .3s}
.mg-insta2 .lv-vw i{position:relative;width:11px;height:7px;border:2px solid #fff;border-radius:60% 10%;transform:rotate(45deg) scale(.8);box-sizing:border-box}
.mg-insta2 .lv-vw i::after{content:"";position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px;background:#fff;border-radius:50%}
.mg-insta2 .lv-vw em{font-style:normal;min-width:2ch;display:inline-block}
.mg-insta2 .lv-vw em.up{animation:lvup .3s}
.mg-insta2 .lv-st.surge .lv-vw{background:linear-gradient(90deg,#ff3b5c,#ffb03b);box-shadow:0 0 14px #ffb03b}
.mg-insta2 .lv-mood{position:absolute;left:8px;top:34px;z-index:5;display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:#fff;background:#0008;padding:3px 7px;border-radius:5px;pointer-events:none}
.mg-insta2 .lv-mood i{width:58px;height:6px;border-radius:3px;background:#ffffff26;overflow:hidden}
.mg-insta2 .lv-mood em{display:block;height:100%;width:var(--m,60%);background:linear-gradient(90deg,#ff7eb6,#ffd166);transition:width .3s,background .3s}
.mg-insta2 .lv-mood.low em{background:linear-gradient(90deg,#5a6aa0,#8a9ad0)}
.mg-insta2 .lv-mood.low{color:#b8c4ff}
.mg-insta2 .lv-chat{position:absolute;left:8px;right:56px;bottom:8px;top:57%;z-index:6;touch-action:none;-webkit-mask-image:linear-gradient(transparent,#000 20%);mask-image:linear-gradient(transparent,#000 20%)}
.mg-insta2 .lv-m{position:absolute;left:0;bottom:0;max-width:100%;box-sizing:border-box;padding:5px 10px;border-radius:13px;background:#0a061485;color:#fff;font-size:13px;line-height:1.3;transform:translate(var(--sx,0px),var(--oy,0px));transition:transform .28s cubic-bezier(.2,.9,.3,1),opacity .3s,background .15s;cursor:pointer;text-shadow:0 1px 2px #0008;word-break:keep-all;animation:lvin .3s ease-out}
.mg-insta2 .lv-m b{color:#ffc6e0;font-weight:800;margin-right:5px;font-size:11.5px}
.mg-insta2 .lv-m.drag{transition:opacity .1s;background:#2a1d40d0}
.mg-insta2 .lv-m.gold{background:linear-gradient(90deg,#c9961cf0,#ffd166e8);color:#2a1a00;text-shadow:none;box-shadow:0 0 12px #ffd16699;border:1px solid #fff3b0;font-weight:700}
.mg-insta2 .lv-m.gold b{color:#5a3300}
.mg-insta2 .lv-m.gold i{font-style:normal;font-weight:900;background:#2a1a00;color:#ffd166;border-radius:4px;padding:0 5px;margin-right:5px;font-size:11px}
.mg-insta2 .lv-m.link{background:#2a5cd0b0}
.mg-insta2 .lv-m.ans{background:#ff5f9ef0;opacity:0;transform:translate(24px,calc(var(--oy) - 34px)) scale(.85)}
.mg-insta2 .lv-m.hid{opacity:0;transform:translate(calc(var(--hx,1) * 280px),var(--oy)) rotate(calc(var(--hx,1) * 8deg))}
.mg-insta2 .lv-m.bad.oops{background:#7a2a3af0}
.mg-insta2 .lv-m.exp{opacity:0}
.mg-insta2 .lv-say{position:absolute;left:50%;z-index:7;transform:translate(-50%,-100%) scale(.4);transform-origin:50% 100%;opacity:0;background:#fff;color:#2a1e2e;font-weight:800;font-size:13px;padding:6px 11px;border-radius:12px;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis;box-shadow:0 3px 0 #0005;pointer-events:none;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s}
.mg-insta2 .lv-say.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
.mg-insta2 .lv-say.bad{background:#dfe4ff;color:#3a4270}
.mg-insta2 .lv-say.gold{background:#ffd166;color:#3a2400}
.mg-insta2 .lv-link{position:absolute;right:8px;top:31%;z-index:8;width:76px;height:76px;border-radius:50%;border:0!important;padding:0!important;display:none;align-items:center;justify-content:center;flex-direction:column;gap:1px;background:conic-gradient(#ffd166 calc(var(--p,0) * 1turn),#ffffff2a 0)!important;box-shadow:0 4px 0 #0007;cursor:pointer}
.mg-insta2 .lv-link::before{content:"";position:absolute;inset:6px;border-radius:50%;background:linear-gradient(#ff6fa8,#d81b60)}
.mg-insta2 .lv-link b,.mg-insta2 .lv-link small{position:relative;color:#fff;line-height:1.1}
.mg-insta2 .lv-link b{font-size:13px;font-weight:900}.mg-insta2 .lv-link small{font-size:10px;font-weight:800;opacity:.9}
.mg-insta2 .lv-link.on{display:flex;animation:lvpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-insta2 .lv-link.ready{box-shadow:0 0 0 3px #7CFC9A,0 0 24px #7CFC9A;animation:lvpulse .3s infinite alternate}
.mg-insta2 .lv-link.ready small{color:#eaffd0}
.mg-insta2 .lv-link.out{display:flex;animation:lvout .4s ease-in forwards;pointer-events:none}
.mg-insta2 .lv-ban{position:absolute;left:50%;top:22%;z-index:9;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:26px;white-space:nowrap;pointer-events:none;color:#fff;text-shadow:0 0 2px #000,0 3px 0 #ff3b5c,0 0 16px #ff3b5c}
.mg-insta2 .lv-ban.on{animation:lvban 1.7s ease-out forwards}
.mg-insta2 .lv-ban.rb{background:linear-gradient(90deg,#ff5f9e,#ffd166,#7CFC9A,#5fb8ff,#c77dff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 3px 0 #000c) drop-shadow(0 0 8px #ffb03b);font-size:34px}
.mg-insta2 .lv-ban small{display:block;font-size:13px;text-align:center;color:#fff;-webkit-text-fill-color:#fff}
.mg-insta2 .lv-con{position:absolute;inset:0;z-index:12;background:#07040d;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#fff;transition:opacity .45s}
.mg-insta2 .lv-con.off{opacity:0;pointer-events:none}
.mg-insta2 .lv-con b{font-size:15px;font-weight:800}
.mg-insta2 .lv-con i{display:flex;gap:6px}.mg-insta2 .lv-con i u{width:8px;height:8px;border-radius:50%;background:#ff5f9e;animation:lvdot .9s infinite}
.mg-insta2 .lv-con i u:nth-child(2){animation-delay:.15s}.mg-insta2 .lv-con i u:nth-child(3){animation-delay:.3s}
.mg-insta2 .lv-end{position:absolute;inset:0;z-index:15;background:#0d0818ec;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;animation:lvfade .5s;padding:12px}
.mg-insta2 .lv-endt{font-size:21px;font-weight:900;color:#fff;text-align:center}
.mg-insta2 .lv-endt small{display:block;font-size:12px;color:#c9b8e0;font-weight:700;margin-top:3px}
.mg-insta2 .lv-endt em{font-style:normal;display:inline-block;background:#555;color:#fff;font-size:11px;padding:2px 7px;border-radius:5px;margin-right:6px;vertical-align:3px}
.mg-insta2 .lv-endg{width:min(280px,88%);aspect-ratio:2.4;image-rendering:pixelated;border-radius:8px;background:#ffffff0d;border:1px solid #ffffff1a}
.mg-insta2 .lv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(300px,94%)}
.mg-insta2 .lv-stats div{background:#ffffff12;border-radius:10px;padding:9px 4px;text-align:center;opacity:0;animation:lvst .4s cubic-bezier(.3,1.6,.5,1) forwards}
.mg-insta2 .lv-stats div:nth-child(2){animation-delay:.25s}.mg-insta2 .lv-stats div:nth-child(3){animation-delay:.5s}
.mg-insta2 .lv-stats span{font-size:11px;color:#d8c8ee;display:block}
.mg-insta2 .lv-stats b{display:block;font-size:20px;font-weight:900;color:#ffd166;margin-top:2px}
.mg-insta2 .lv-stats div:nth-child(2) b{color:#ff7eb6}.mg-insta2 .lv-stats div:nth-child(3) b{color:#7fe0c0}
.mg-insta2 .lv-bye{font-size:12.5px;color:#fff;font-weight:700;opacity:.85}
.mg-insta2 .lv-cv.lv-fr{z-index:2}
.mg-insta2 .lv-me{position:absolute;z-index:1;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter .3s;transform-origin:50% 100%;pointer-events:none;filter:drop-shadow(0 0 5px #ffe2c066)}
.mg-insta2 .lv-me.on{opacity:1}
.mg-insta2 .lv-me.glow{filter:drop-shadow(0 0 9px #ffb03b) brightness(1.08)}
.mg-insta2 .lv-m u.tg{display:none;text-decoration:none;margin-left:7px;font-size:10.5px;font-weight:900;padding:1px 7px;border-radius:8px;background:#ff5f9e;color:#fff;vertical-align:1px;text-shadow:none}
.mg-insta2 .lv-st.tags .lv-m u.tg,.mg-insta2 .lv-m.warn u.tg{display:inline-block}
.mg-insta2 .lv-m.bad u.tg{background:#e8ecff;color:#3a4270}
.mg-insta2 .lv-m.gold u.tg{background:#2a1a00;color:#ffd166}
.mg-insta2 .lv-m.link u.tg{background:#7CFC9A;color:#0a3a1a}
.mg-insta2 .lv-m.bad.warn{animation:lvwarn .45s infinite alternate}
.mg-insta2 .lv-m.bad.warn u.tg{background:#ff5a6a;color:#fff}
.mg-insta2 .lv-m.nope{animation:lvnope .35s}
.mg-insta2 .lv-tut{position:absolute;left:10px;right:10px;bottom:calc(43% + 6px);z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-insta2 .lv-tut.off{opacity:0;visibility:hidden}
.mg-insta2 .lv-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #ff7eb6;max-width:300px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-insta2 .lv-tut.pop .lv-tc{animation:lvpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-insta2 .lv-tc em{font-style:normal;display:inline-block;background:#ff5f9e;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-insta2 .lv-tc p{margin:0}
.mg-insta2 .lv-tc b{background:none;padding:0}.mg-insta2 .lv-tut.low{bottom:14px}
.mg-insta2 .lv-tc b.pk{color:#e0307a}.mg-insta2 .lv-tc b.rd{color:#c0392b}.mg-insta2 .lv-tc b.gd{color:#a87000}.mg-insta2 .lv-tc b.gr{color:#1f9a4a}
.mg-insta2 .lv-tb{margin-top:6px;display:flex;justify-content:center}
.mg-insta2 .lv-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-insta2 .lv-go{background:linear-gradient(#ff6fa8,#d81b60)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a0f3e!important;animation:lvpulse .5s infinite alternate}
.mg-insta2 .lv-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-37px 0 0 -14px;background-size:100% 100%;image-rendering:pixelated;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-insta2 .lv-hand.on{display:block}
.mg-insta2 .lv-hand.tap{animation:lvtap .8s infinite}
.mg-insta2 .lv-hand.swipe{animation:lvswp 1.2s infinite}
.mg-insta2 .lv-lh{position:absolute;right:92px;top:calc(31% + 16px);z-index:8;background:#fff;color:#2a1e2e;font-size:11.5px;font-weight:800;padding:5px 9px;border-radius:9px;line-height:1.3;display:none;box-shadow:0 3px 0 #0006;pointer-events:none}
.mg-insta2 .lv-lh b{color:#1f9a4a}
.mg-insta2 .lv-lh::after{content:"";position:absolute;right:-6px;top:50%;margin-top:-6px;border:6px solid transparent;border-right:0;border-left-color:#fff}
.mg-insta2 .lv-lh.on{display:block;animation:lvpop .35s cubic-bezier(.3,1.8,.5,1)}
@keyframes lvtap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes lvswp{0%{transform:translate(-20px,0);opacity:0}15%{opacity:1}70%{transform:translate(70px,0);opacity:1}100%{transform:translate(80px,0);opacity:0}}
@keyframes lvwarn{to{box-shadow:0 0 0 2px #ff5a6a,0 0 10px #ff5a6a}}
@keyframes lvnope{50%{background:#a0303af0}}
@keyframes lvpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes lvup{50%{transform:translateY(-3px) scale(1.25);color:#ffd166}}
@keyframes lvin{from{opacity:0;filter:brightness(2)}}
@keyframes lvpulse{to{transform:scale(1.08)}}
@keyframes lvout{to{transform:scale(.2) rotate(30deg);opacity:0}}
@keyframes lvban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.18) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(2deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-85%) scale(1)}}
@keyframes lvdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
@keyframes lvfade{from{opacity:0}}
@keyframes lvst{from{opacity:0;transform:translateY(12px) scale(.8)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.mg-insta2 .lv-ban.on{animation-duration:.01s}.mg-insta2 .lv-link.ready{animation:none}.mg-insta2 .lv-m{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const T = 30, dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "insta2", "이건 라방 떡상 각", "lv-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="lv-cv"></canvas><div class="lv-me"></div><canvas class="lv-cv lv-fr"></canvas>
      <div class="lv-hud"><b class="lv-live">LIVE</b><span class="lv-vw"><i></i><em>0</em></span></div>
      <div class="lv-mood"><span>분위기</span><i><em></em></i></div>
      <div class="lv-say"></div><div class="lv-chat"></div>
      <button class="lv-link" aria-label="공구 링크 올리기"><b>공구 링크</b><small>모으는 중</small></button>
      <div class="lv-lh">원이 <b>초록</b>이 되면<br>바로 톡!</div>
      <div class="lv-ban"></div>
      <div class="lv-tut"><div class="lv-tc"><em>리허설</em><p></p><div class="lv-tb"></div></div></div><div class="lv-hand"></div>
      <div class="lv-con off"><i><u></u><u></u><u></u></i><b>라이브 연결 중…</b></div>`);
    const st = F.stage, cv = st.querySelector(".lv-cv"), gB = cv.getContext("2d"), cvF = st.querySelector(".lv-fr"), gF = cvF.getContext("2d");
    const $ = (s) => st.querySelector(s);
    const vwEl = $(".lv-vw em"), moodEl = $(".lv-mood"), moodBar = $(".lv-mood em"), sayEl = $(".lv-say"), chat = $(".lv-chat"), linkBtn = $(".lv-link"), ban = $(".lv-ban"), con = $(".lv-con");
    const tutEl = $(".lv-tut"), tutP = $(".lv-tc p"), tutB = $(".lv-tb"), hand = $(".lv-hand"), lhEl = $(".lv-lh"), meEl = $(".lv-me");
    // 크기: 논리 폭 110~130칸 안팎을 정수배로
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 118)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    for (const c of [cv, cvF]) { c.width = LW; c.height = LH; c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    const cx = LW >> 1, y0 = Math.round(LH * 0.2), deskY = Math.round(LH * 0.47);
    const rx = Math.max(16, cx - 37), ry = y0 + 17, RR = 11;
    const ME = meSpec();
    sayEl.style.top = (y0 - 9) * K + "px";
    // 내 캐릭터 그림(몸 그림 시트 3x2 = 표정 6개). 칸 240x540 중 위쪽 312만 쓴다. 못 불러오면 도트로.
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false, artFail = false;
    {
      const s = ((deskY - y0 + 12) * K) / 250, w = Math.round(240 * s), h = Math.round(312 * s);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(cx * K - w / 2) + "px", top: Math.round((y0 - 12) * K - 10 * s) + "px" });
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; else artFail = true; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = "";

    // ── 배경(한 번만) ──
    const BG = document.createElement("canvas"); BG.width = LW; BG.height = LH;
    const wins = [], bulbs = [];
    const shX = cx + 23, shW = Math.max(20, LW - shX - 3);
    {
      const b = BG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      for (let y = 0; y < deskY; y++) { const t = y / deskY; P(0, y, LW, 1, `rgb(${Math.round(30 + t * 26)},${Math.round(22 + t * 18)},${Math.round(50 + t * 30)})`); }
      for (let x = 2; x < LW; x += 6) P(x, 0, 1, deskY, "#ffffff07");
      for (let y = 4; y < deskY; y += 8) for (let x = (y / 8) % 2 ? 5 : 2; x < LW; x += 6) P(x, y, 1, 1, "#ffffff10");
      // 창문(밤 도시)
      const wx = Math.max(3, rx - 13), wy = 13, ww = 26, wh = 26;
      P(wx - 2, wy - 2, ww + 4, wh + 4, "#b8a488"); P(wx - 1, wy - 1, ww + 2, wh + 2, "#8a7660");
      for (let y = 0; y < wh; y++) { const t = y / wh; P(wx, wy + y, ww, 1, `rgb(${Math.round(14 + t * 40)},${Math.round(20 + t * 22)},${Math.round(58 + t * 30)})`); }
      P(wx + 18, wy + 3, 5, 5, "#ffe9a8"); P(wx + 20, wy + 3, 3, 3, `rgb(16,22,60)`); // 초승달
      for (const [x, y] of [[3, 4], [9, 2], [13, 7], [6, 10]]) P(wx + x, wy + y, 1, 1, "#fff8");
      let bx = wx; while (bx < wx + ww) { const bw = 3 + rint(4), bh2 = 6 + rint(11); P(bx, wy + wh - bh2, Math.min(bw, wx + ww - bx), bh2, "#151a33"); for (let yy = wy + wh - bh2 + 2; yy < wy + wh - 1; yy += 3) for (let xx = bx + 1; xx < Math.min(bx + bw, wx + ww) - 1; xx += 2) if (rnd() < 0.5) wins.push([xx, yy]); bx += bw + (rnd() < 0.3 ? 1 : 0); }
      P(wx + ww / 2 - 1, wy, 1, wh, "#8a7660"); P(wx, wy + wh / 2, ww, 1, "#8a766088");
      P(wx - 4, wy - 3, 5, wh + 10, "#e88fb0aa"); P(wx + ww - 1, wy - 3, 5, wh + 10, "#e88fb0aa"); P(wx - 4, wy - 4, ww + 8, 2, "#c9a0b8");
      // 링라이트 스탠드
      P(rx, ry + RR, 1, deskY - ry - RR, "#4a4656"); P(rx - 1, ry + RR, 3, 2, "#5a5666");
      // 선반(오른쪽)
      for (const [k, sy] of [[0, y0 + 6], [1, y0 + 27]]) {
        P(shX, sy, shW, 2, "#b0805a"); P(shX, sy + 2, shW, 1, "#6a4a32"); P(shX + 1, sy + 3, 1, 3, "#5a3a26"); P(shX + shW - 2, sy + 3, 1, 3, "#5a3a26");
        if (k === 0) { let x = shX + 1; const cols = ["#ff7eb6", "#7fc8ff", "#ffd166", "#b89cff", "#7fe0a8", "#ff9f7a", "#e6e6e6"]; for (let i = 0; i < 5 && x < shX + shW - 9; i++) { const h = 7 + rint(4), w2 = 2 + rint(2), c = pick(cols); P(x, sy - h, w2, h, c); P(x, sy - h, w2, 1, tint(c, 1.25)); P(x, sy - h + 2, w2, 1, tint(c, 0.7)); x += w2; }
          const px = shX + shW - 8; P(px, sy - 4, 6, 4, "#c0703d"); P(px, sy - 4, 6, 1, "#e08a50"); P(px - 1, sy - 9, 8, 5, "#3e9e6a"); P(px + 1, sy - 11, 4, 2, "#5fc080"); P(px - 2, sy - 7, 2, 2, "#2f7e4a"); P(px + 6, sy - 8, 2, 2, "#2f7e4a"); }
        else { const fx = shX + 2; P(fx, sy - 10, 9, 10, "#e8d8c0"); P(fx + 1, sy - 9, 7, 8, "#7fb8ea"); P(fx + 1, sy - 4, 7, 3, "#5fa060"); P(fx + 5, sy - 8, 2, 2, "#ffe9a8");
          const cx2 = shX + shW - 7; P(cx2, sy - 3, 5, 3, "#d9c4a3"); P(cx2 + 1, sy - 9, 3, 6, "#4fae5a"); P(cx2, sy - 7, 1, 2, "#4fae5a"); P(cx2 + 4, sy - 8, 1, 2, "#4fae5a"); P(cx2 + 2, sy - 10, 1, 1, "#ff7eb6");
          P(fx + 12, sy - 5, 4, 5, "#ffd166"); P(fx + 13, sy - 7, 2, 2, "#ffd166"); P(fx + 12, sy - 1, 4, 1, "#c9961c"); }
      }
      // 반짝이 전구 줄
      for (let x = 0; x < LW; x++) { const y = 5 + Math.round(Math.abs(Math.sin((x / LW) * Math.PI * 3)) * 4); P(x, y, 1, 1, "#4a3a3a"); if (x % 7 === 3) bulbs.push([x, y + 1]); }
    }
    // 가장자리 어둡게(한 번만)
    const VG = document.createElement("canvas"); VG.width = LW; VG.height = LH;
    { const v = VG.getContext("2d"), rg = v.createRadialGradient(cx, LH * 0.32, LW * 0.25, cx, LH * 0.45, LH * 0.75); rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(8,2,18,.55)"); v.fillStyle = rg; v.fillRect(0, 0, LW, LH); }
    const ring = []; for (let y = -RR - 1; y <= RR + 1; y++) for (let x = -RR - 1; x <= RR + 1; x++) { const d = Math.hypot(x, y); if (d <= RR + 0.4 && d >= RR - 2.3) ring.push([x, y, d > RR - 1 ? 1 : 0]); }

    // ── 상태 ──  tut: 0 리허설 전 / 1 좋은 댓글 톡 / 2 악플 밀기 / 3 안내 카드 / -1 방송 중
    let tut = 0, tutM = null, tutT = 0;
    let over = false, done = false, raf = 0, t0 = 0, last = 0, el = 0;
    let viewers = 3, peak = 3, mood = 62, moodSum = 0, moodT = 0, likes = 0, fol = 0, folF = 0, combo = 0;
    let shownV = -1, nextAt = 1.6, nextHist = 0, sayT = 0, lastSay = 0, goldIdx = 0;
    let badSeen = 0, badOk = 0, goodOk = 0, goldOk = 0, wrongs = 0;
    const hist = [], msgs = [], hearts = [], coins = [], confetti = [];
    const cs = { talk: 0, happy: 0, shock: 0, wave: 0, hold: 0, up: 0, sad: 0, blush: 0, blink: 2.2 };
    const goldAt = [6.2, 16.8, 27.2];
    let deckG = shuffle(GOOD), deckB = shuffle(BAD), deckGold = shuffle(GOLD);
    const take = (k) => { if (k === "g") { if (!deckG.length) deckG = shuffle(GOOD); return deckG.pop(); } if (k === "b") { if (!deckB.length) deckB = shuffle(BAD); return deckB.pop(); } if (!deckGold.length) deckGold = shuffle(GOLD); return deckGold.pop(); };
    const link = { on: false, t: 0, done: false, dem: 0, q: 0, nextMsg: 0, started: false };
    const surge = { on: false, done: false, t: 0 };
    const LINK_AT = 10.4, SURGE_AT = 19, SURGE_LEN = 6.5;

    // ── 소리 ──
    const coinSnd = () => { [1318, 1760, 2093].forEach((f, i) => tone(f, 0.09, "square", 0.07, 0, i * 0.06)); };
    const regSnd = () => { tone(1568, 0.08, "square", 0.08); tone(2093, 0.16, "triangle", 0.1, 0, 0.07); noise(0.12, 5000, 0.08, 0.02, 2); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.1, "triangle", 0.08, 0, 0.15 + i * 0.06)); };
    const surgeSnd = () => { tone(300, 0.7, "sawtooth", 0.06, 900); [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.12, "square", 0.06, 0, 0.3 + i * 0.07)); };
    const pling = () => tone(1760 + rnd() * 400, 0.04, "sine", 0.03);

    // ── 화면 글자 ──
    let moodLb = ""; const moodUpd = () => { mood = clamp(mood, 0, 100); moodBar.style.setProperty("--m", mood.toFixed(1) + "%"); moodEl.classList.toggle("low", mood < 35); const lb = mood >= 75 ? "분위기 최고" : mood >= 50 ? "분위기 좋음" : mood >= 35 ? "분위기 보통" : "분위기 싸함"; if (lb !== moodLb) moodEl.firstChild.textContent = moodLb = lb; };
    const say = (text, cls = "", sec = 1.4) => { sayEl.textContent = text; sayEl.className = "lv-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; lastSay = el; cs.talk = Math.min(sec, 1.3); };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "lv-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const addV = (n) => { viewers = Math.max(1, viewers + n); if (n > 0) folF += n * 0.07; };
    const xyOf = (lx, ly) => [lx * K, ly * K];
    // 하트·동전·색종이
    const heartUp = (n, fromTop = false) => { if (RM()) n = Math.min(n, 3); for (let i = 0; i < n; i++) { hearts.push(fromTop ? { x: 4 + rnd() * (LW - 12), y: -6 - rnd() * 20, vy: 18 + rnd() * 14, ph: rnd() * 6, c: pick(HCOL), life: 3, down: true } : { x: LW - 11 + (rnd() - 0.5) * 6, y: LH * 0.9 + rnd() * 8, vy: -(16 + rnd() * 14), ph: rnd() * 6, c: pick(HCOL), life: 2.6 + rnd() * 0.6, delay: i * 0.07 }); likes += 1 + Math.floor(viewers / 25); } };
    const coinRain = (n) => { if (RM()) n = Math.min(n, 5); for (let i = 0; i < n; i++) coins.push({ x: 4 + rnd() * (LW - 8), y: -4 - rnd() * 30, vy: 10 + rnd() * 20, vx: (rnd() - 0.5) * 8, sp: rnd() * 6 }); };

    // ── 채팅 ──
    const relayout = () => {
      const H = chat.clientHeight || 220; let off = 0; const ex = [];
      for (let i = msgs.length - 1; i >= 0; i--) { const m = msgs[i]; m.off = off; m.el.style.setProperty("--oy", -off + "px"); off += m.h + 5; if (m.off + m.h > H + 6) ex.push(m); m.el.classList.toggle("warn", m.type === "bad" && m.off > H * 0.45); }
      ex.forEach(expire);
    };
    // 말풍선 오른쪽 할 일 표시(처음 10초와 리허설엔 다 보이고, 뒤에는 위로 밀려 올라간 악플만)
    const TAG = { good: "톡", bad: "← 밀기", gold: "톡!", link: "버튼 →" };
    const drop = (m, cls, ms = 340) => { m.gone = true; const i = msgs.indexOf(m); if (i >= 0) msgs.splice(i, 1); m.el.classList.remove("drag"); m.el.classList.add(cls); setTimeout(() => m.el.remove(), ms); relayout(); };
    const addMsg = (type, data) => {
      const e = document.createElement("div"); e.className = "lv-m " + type;
      if (type === "gold") e.innerHTML = `<i>${data[0]}</i><b>${nick(pick)}</b>${data[1]}`;
      else e.innerHTML = `<b>${nick(pick)}</b>${type === "good" ? data[0] : data}`;
      e.insertAdjacentHTML("beforeend", `<u class="tg">${TAG[type]}</u>`);
      chat.appendChild(e);
      const m = { el: e, type, data, h: e.offsetHeight || 26, off: 0, gone: false, born: el };
      e._m = m; msgs.push(m); if (type === "bad") badSeen++;
      relayout(); pling();
    };
    const mPos = (m) => { const r = m.el.getBoundingClientRect(), s = st.getBoundingClientRect(); return [clamp(r.left - s.left + Math.min(r.width, 200) / 2, 30, s.width - 30), r.top - s.top + r.height / 2]; };
    const expire = (m) => {
      if (m.gone) return;
      if (tut >= 0) return drop(m, "exp");
      if (m.type === "bad") { mood -= link.on ? 5 : 10; F.miss(null); F.msg("악플이 그대로 보였어요… 밀어서 가려요"); combo = 0; addV(-2 - Math.sqrt(viewers) * 0.6); cs.shock = 0.6; }
      else if (m.type === "gold") { mood -= 3; F.msg("앗, 협찬 메시지를 놓쳤어요!"); }
      else if (m.type === "good") mood -= 0.6;
      moodUpd(); drop(m, "exp");
    };
    const tapMsg = (m) => {
      if (over || m.gone) return;
      if (tut >= 0 && m !== tutM) return;
      if (tut === 2 && m.type === "bad") { F.msg("톡 말고, 옆으로 쓱 밀어요!"); SFX.tok(); m.el.classList.remove("nope"); void m.el.offsetWidth; m.el.classList.add("nope"); return; }
      const p = mPos(m);
      if (m.type === "good") {
        combo++; const gain = Math.round((4 + Math.sqrt(viewers) * 0.9) * (1 + Math.min(combo, 8) * 0.12) * (surge.on ? 2.2 : 1));
        addV(gain); mood += 4; goodOk++; fol += 1 + (rnd() < 0.5 ? 1 : 0) + (surge.on ? 2 : 0);
        F.hit(p, gain, "#ff7eb6"); heartUp(4 + Math.min(combo, 6) + (surge.on ? 4 : 0));
        say(m.data[1], "", 1.5); cs.happy = 1.3; if (rnd() < 0.35) cs.wave = 1.1;
        drop(m, "ans");
      } else if (m.type === "bad") {
        combo = 0; wrongs++; mood -= 17; addV(-(4 + Math.sqrt(viewers) * 2.5)); m.el.classList.add("oops");
        F.miss(p); F.msg("악플에 답하면 분위기가 싸해져요"); say(pick(BAD_REPLY), "bad", 1.4); cs.shock = 1.3; cs.sad = 1.3; cs.happy = 0;
        drop(m, "exp", 500);
      } else if (m.type === "gold") {
        combo++; goldOk++; const gain = Math.round(15 + Math.sqrt(viewers) * 3);
        addV(gain); mood += 10; fol += 5 + rint(4);
        F.hit(p, gain, "#ffd166"); F.burst(p, "#fff3b0", 14); coinSnd(); vib([20, 30, 20]);
        coinRain(16); heartUp(8, true); say(m.data[2], "gold", 1.6); cs.happy = 1.6; cs.up = 1.2; cs.blush = 1.5;
        drop(m, "ans");
      } else if (m.type === "link") { F.msg("오른쪽 공구 링크 버튼을 눌러요!"); }
      moodUpd(); updV();
      if (tut === 1 && m === tutM) tutNext(2);
    };
    const hideMsg = (m, dir) => {
      if (over || m.gone) return;
      if (tut >= 0 && (m !== tutM || m.type !== "bad")) { m.el.style.setProperty("--sx", "0px"); if (tut === 1) { F.msg("좋은 댓글은 밀지 말고 톡!"); SFX.tok(); } return; }
      const p = mPos(m); m.el.style.setProperty("--hx", dir < 0 ? -1 : 1);
      if (m.type === "bad") { badOk++; mood += 3; SFX.whoosh(); vib(8); F.float(p, "가림!"); F.burst(p, "#9aa0c0", 6); }
      else if (m.type === "good") { mood -= 5; combo = 0; wrongs++; F.miss(p); F.msg("앗, 팬 댓글을 가렸어요"); cs.shock = 0.7; }
      else if (m.type === "gold") { mood -= 8; combo = 0; wrongs++; F.miss(p); F.msg("협찬 메시지를 가려 버렸어요!!"); cs.shock = 1; }
      else SFX.sweep();
      moodUpd(); drop(m, "hid", 380);
      if (tut === 2 && m === tutM) tutNext(3);
    };
    // 톡 / 옆으로 밀기
    let drag = null;
    chat.addEventListener("pointerdown", (e) => { const t = e.target.closest(".lv-m"); if (!t || !t._m || t._m.gone || over) return; e.preventDefault(); drag = { m: t._m, x: e.clientX, y: e.clientY, dx: 0 }; try { chat.setPointerCapture(e.pointerId); } catch (er) {} t.classList.add("drag"); });
    chat.addEventListener("pointermove", (e) => {
      if (!drag) return; drag.dx = e.clientX - drag.x; const m = drag.m; if (m.gone) { drag = null; return; }
      m.el.style.setProperty("--sx", drag.dx + "px"); m.el.style.opacity = String(1 - Math.min(0.55, Math.abs(drag.dx) / 220));
      if (Math.abs(drag.dx) > 72) { const d = drag; drag = null; d.m.el.style.opacity = ""; hideMsg(d.m, Math.sign(d.dx)); }
    });
    const up = (e) => {
      if (!drag) return; const d = drag; drag = null; const m = d.m; if (m.gone) return;
      m.el.classList.remove("drag"); m.el.style.opacity = "";
      const ady = Math.abs(e.clientY - d.y);
      if (Math.abs(d.dx) > 38) hideMsg(m, Math.sign(d.dx));
      else { m.el.style.setProperty("--sx", "0px"); if (Math.abs(d.dx) < 12 && ady < 16) tapMsg(m); }
    };
    chat.addEventListener("pointerup", up); chat.addEventListener("pointercancel", () => { if (drag) { drag.m.el.classList.remove("drag"); drag.m.el.style.setProperty("--sx", "0px"); drag.m.el.style.opacity = ""; drag = null; } });

    // ── 공구 링크 ──
    const pressLink = () => {
      if (!link.on || link.done || over) return;
      link.done = true; link.q = link.dem; const q = link.q;
      linkBtn.classList.remove("ready", "on"); linkBtn.classList.add("out");
      const p = [st.clientWidth - 46, st.clientHeight * 0.31 + 38];
      if (q >= 0.8) {
        const gain = Math.round((25 + Math.sqrt(viewers) * 5) * q); addV(gain); mood += 9; fol += Math.round(10 * q);
        regSnd(); vib([25, 40, 25]); F.hit(p, gain, "#7CFC9A"); F.burst(p, "#ffd166", 16); coinRain(22); heartUp(10);
        banner("완판 각!<small>링크 타이밍 완벽</small>"); say("링크 올렸어요! 완판 가즈아~", "gold", 1.6); cs.up = 1.4; cs.happy = 1.6;
      } else {
        const gain = Math.round((25 + Math.sqrt(viewers) * 5) * q * 0.5); addV(gain); mood -= 2; SFX.tok();
        F.float(p, "+" + gain); F.msg("너무 빨랐어요… 아직 덜 모였어요"); say("어? 벌써 올렸나…", "bad", 1.2); cs.shock = 0.6;
      }
      setTimeout(() => linkBtn.classList.remove("out"), 420);
      moodUpd(); updV();
    };
    linkBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); pressLink(); });
    const updV = () => {
      const v = Math.round(viewers); if (v > peak) peak = v;
      if (v !== shownV) { const upv = v > shownV; shownV = v; vwEl.textContent = fmt(v); if (upv) { vwEl.classList.remove("up"); void vwEl.offsetWidth; vwEl.classList.add("up"); } }
      F.sc.textContent = `최고 ${fmt(peak)}명`;
    };

    // ── 그리기 ──
    let g = gB; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const drawHeart = (x, y, c, a = 1) => { g.globalAlpha = a; const hl = tint(c, 1.35), dk = tint(c, 0.7); HEART.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === "X") P(x + i, y + j, 1, 1, j === 1 && i === 1 ? "#fff" : j >= 3 ? dk : j === 1 && i === 2 ? hl : c); }); g.globalAlpha = 1; };
    const drawGraph = (ctx, X, Y, W, H, glow, all) => {
      const n = all ? hist.length : Math.max(hist.length, 1), mx = Math.max(20, ...hist, peak) * 1.12;
      ctx.fillStyle = "rgba(10,6,20,.62)"; ctx.fillRect(X, Y, W, H);
      ctx.fillStyle = "rgba(255,255,255,.08)"; for (let k = 1; k < 3; k++) ctx.fillRect(X, Y + Math.round(H * k / 3), W, 1);
      const total = all ? Math.max(1, hist.length - 1) : Math.round(T / 0.2);
      let py = null;
      for (let c = 0; c < W; c++) {
        const idx = Math.floor(c / (W - 1) * total); if (idx >= hist.length) break;
        const v = hist[idx], y = Y + H - 1 - Math.round((v / mx) * (H - 2));
        const hot = surge.done || surge.on ? idx * 0.2 >= SURGE_AT && idx * 0.2 <= SURGE_AT + SURGE_LEN : false;
        ctx.fillStyle = hot ? "rgba(255,176,59,.35)" : "rgba(255,95,158,.3)"; ctx.fillRect(X + c, y, 1, Y + H - y);
        ctx.fillStyle = hot ? "#ffd166" : "#ff7eb6";
        if (py !== null && Math.abs(py - y) > 1) ctx.fillRect(X + c, Math.min(py, y), 1, Math.abs(py - y)); ctx.fillRect(X + c, y, 1, 1); py = y;
      }
      if (glow && py !== null) { ctx.fillStyle = "#fff"; ctx.fillRect(X + Math.min(W - 1, Math.floor((hist.length - 1) / total * (W - 1))), py - 1, 1, 3); }
    };
    // 책상 윗면(안쪽으로 깊이) + 앞 소품: 화장품, 대본 노트, 노트북 뒷면, 곰 인형
    const DT = 19;
    const drawDesk = (tm) => {
      P(0, deskY, LW, DT, "#c48a5c"); P(0, deskY, LW, 1, "#a8744c"); for (let y = deskY + 3; y < deskY + DT; y += 4) for (let x = (y * 7) % 11; x < LW; x += 17) P(x, y, 6, 1, "#b98052");
      P(0, deskY + DT, LW, 2, "#e0a874"); P(0, deskY + DT + 2, LW, 1, "#6a3e26"); P(0, deskY + DT + 3, LW, LH - deskY - DT - 3, "#5a3826");
      for (let x = 10; x < LW; x += 26) P(x, deskY + DT + 3, 1, LH - deskY - DT - 3, "#4a2c1c");
      P(cx - 8, deskY + DT + 9, 16, 2, "#3a2216"); P(cx - 8, deskY + DT + 9, 16, 1, "#c9a050");
      // 화장품(왼쪽 앞)
      const kx = 5, ky = deskY + DT - 3; P(kx - 1, ky + 1, 24, 2, "#0003");
      P(kx, ky - 9, 4, 10, "#ff9ec8"); P(kx, ky - 9, 4, 1, "#ffd0e4"); P(kx + 1, ky - 12, 2, 3, "#2a1e2e");
      P(kx + 5, ky - 6, 5, 7, "#f2f2f6"); P(kx + 5, ky - 6, 5, 1, "#fff"); P(kx + 6, ky - 4, 3, 2, "#7fc8ff");
      P(kx + 11, ky - 8, 3, 9, "#2a1e2e"); P(kx + 11, ky - 11, 3, 3, "#e0304a"); P(kx + 11, ky - 11, 1, 3, "#ff6a7a");
      P(kx + 15, ky - 3, 8, 4, "#e8d0b8"); P(kx + 16, ky - 2, 2, 2, "#d88a6a"); P(kx + 19, ky - 2, 2, 2, "#f0b0a0");
      // 대본 노트 + 펜
      const nx = cx - 33, ny = deskY + 8; P(nx, ny, 20, 9, "#ff8fc0"); P(nx, ny, 20, 1, "#ffc0dc"); P(nx + 2, ny + 2, 16, 6, "#fff8f0"); for (let k = 0; k < 3; k++) P(nx + 4, ny + 3 + k * 2, 10 - k * 3, 1, "#c8b8c8"); P(nx - 1, ny + 9, 22, 1, "#0003");
      for (let k = 0; k < 9; k++) P(nx + 10 + k, ny + 7 - Math.round(k * 0.5), 1, 1, k < 2 ? "#2a1e2e" : "#ffd166");
      // 노트북 뒷면(하트 스티커)
      const lx = cx + 15, ly = deskY + 1; P(lx, ly, 26, 15, "#c8ccd8"); P(lx, ly, 26, 1, "#e8ecf4"); P(lx + 25, ly, 1, 15, "#9aa0b0"); P(lx - 1, ly + 15, 28, 2, "#8a90a0"); P(lx - 1, ly + 17, 28, 1, "#0003");
      HEART.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "X") P(lx + 10 + i, ly + 4 + j, 1, 1, "#ff7eb6"); })); P(lx + 4, ly + 10, 4, 3, "#7fe0c0"); P(lx + 18, ly + 3, 4, 4, "#ffd166"); P(lx + 19, ly + 4, 2, 2, "#fff3b0");
      // 곰 인형(오른쪽 끝)
      const bx = LW - 13, by = deskY + 3; P(bx, by + 1, 3, 3, "#c08a5a"); P(bx + 8, by + 1, 3, 3, "#c08a5a"); P(bx + 1, by + 2, 9, 7, "#d8a070"); P(bx + 2, by + 9, 7, 6, "#d8a070"); P(bx + 3, by + 5, 1, 1, "#2a1e2e"); P(bx + 7, by + 5, 1, 1, "#2a1e2e"); P(bx + 4, by + 6, 3, 2, "#f2d8b8"); P(bx + 5, by + 6, 1, 1, "#2a1e2e"); P(bx + 3, by + 9, 5, 1, "#ff7eb6"); P(bx + 1, by + 15, 9, 1, "#0003");
      if (Math.floor(tm * 0.5) % 4 === 0) P(bx + 7, by + 5, 1, 1, "#d8a070");
    };
    const render = (tm) => {
      g = gB;
      g.drawImage(BG, 0, 0);
      // 창문 불빛·전구 반짝
      for (let i = 0; i < wins.length; i++) { const on = Math.sin(tm * 0.7 + i * 2.3) > -0.6; if (on) P(wins[i][0], wins[i][1], 1, 1, i % 3 ? "#ffd56a" : "#ffeebb"); }
      bulbs.forEach(([x, y], i) => { const on = Math.floor(tm * 3 + i) % 3 !== 0; const c = ["#ffd166", "#ff7eb6", "#7fe0c0", "#b89cff"][i % 4]; P(x, y, 1, 2, on ? c : tint(c, 0.45)); if (on) { g.globalAlpha = 0.25; P(x - 1, y, 3, 3, c); g.globalAlpha = 1; } });
      // 네온 하트
      const nx = shX + Math.max(0, Math.floor((shW - 11) / 2)), ny = Math.max(22, y0 - 20), flick = Math.sin(tm * 23) > 0.93 ? 0.4 : 1;
      const nc = surge.on ? `hsl(${(tm * 240) % 360},100%,70%)` : "#ff5fa8";
      g.globalAlpha = 0.22 * flick; NEON.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "X") P(nx + i - 1, ny + j - 1, 3, 3, nc); })); g.globalAlpha = flick;
      NEON.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "X") P(nx + i, ny + j, 1, 1, i === 2 && j === 1 ? "#fff" : nc); })); g.globalAlpha = 1;
      // 링라이트
      const rc = surge.on ? `hsl(${(tm * 300) % 360},100%,80%)` : "#fff6e0";
      g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(rx, ry, 2, rx, ry, RR + 12); rg.addColorStop(0, "rgba(255,240,210,.05)"); rg.addColorStop(0.55, `rgba(255,236,200,${0.22 + (surge.on ? 0.15 * Math.sin(tm * 12) : 0)})`); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(rx - RR - 13, ry - RR - 13, (RR + 13) * 2, (RR + 13) * 2); g.globalCompositeOperation = "source-over";
      ring.forEach(([x, y, o]) => P(rx + x, ry + y, 1, 1, o ? rc : "#d8d0c0")); P(rx - 1, ry - 1, 3, 3, "#2a2a34"); P(rx, ry, 1, 1, "#7fc8ff");
      g = gF; g.clearRect(0, 0, LW, LH);
      // 나: 몸 그림이 있으면 그 칸(표정), 없으면 도트
      const eye = cs.shock > 0 ? "shock" : cs.happy > 0 ? "happy" : cs.blink < 0.12 ? "blink" : "n";
      const mouth = cs.shock > 0 ? "o" : cs.talk > 0 && Math.floor(tm * 9) % 2 ? "open" : cs.happy > 0 ? "open" : mood < 30 ? "flat" : "smile";
      const arm = cs.hold > 0 ? "hold" : cs.up > 0 ? "up2" : cs.wave > 0 ? "wave" : "rest";
      const bob = (cs.talk > 0 || cs.up > 0) && Math.floor(tm * 5) % 2 ? -1 : 0;
      if (art) {
        // 표정: 놀람 > 속상(악플에 답함·분위기 바닥) > 수줍(금색) > 웃음(답·인사) > 기본
        const ex = cs.shock > 0 ? (cs.sad > 0 ? "sad" : "surprised") : cs.blush > 0 ? "blush" : cs.happy > 0 || cs.wave > 0 || cs.up > 0 ? "smile" : mood < 28 ? "sad" : cs.talk > 0 ? "smile" : "neutral";
        if (ex !== meX) { meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; }
        // 몸짓: 말할 때 들썩, 손 흔들 땐 좌우로, 신나면 폴짝, 놀라면 부르르
        let tf = "";
        if (cs.shock > 0) tf = `translateX(${Math.floor(tm * 30) % 2 ? 2 : -2}px)`;
        else if (cs.up > 0) tf = `translateY(${-4 - Math.round(Math.abs(Math.sin(tm * 9)) * 6)}px) scale(1.03)`;
        else if (cs.wave > 0) tf = `rotate(${(Math.sin(tm * 9) * 2.2).toFixed(1)}deg)`;
        else if (cs.talk > 0) tf = `translateY(${Math.floor(tm * 7) % 2 ? -3 : 0}px)`;
        else tf = `translateY(${(Math.sin(tm * 1.6) * 1.2).toFixed(1)}px)`;
        if (tf !== meT) { meT = tf; meEl.style.transform = tf; }
        meEl.classList.toggle("glow", surge.on);
        // 공구템 들기: 오른쪽 어깨 옆에 상자를 띄운다
        if (cs.hold > 0) { const by = deskY - 24 + (Math.floor(tm * 4) % 2 ? -1 : 0), bx0 = cx + 18; P(bx0, by, 14, 12, "#ff7eb6"); P(bx0, by, 14, 2, "#ffa8d0"); P(bx0 + 6, by, 2, 12, "#fff3b0"); P(bx0, by + 5, 14, 1, "#fff3b0"); P(bx0 + 4, by - 3, 3, 3, "#fff3b0"); P(bx0 + 8, by - 3, 3, 3, "#fff3b0"); P(bx0 + 12, by, 2, 12, "#d85a94"); for (const [a, b] of [[-3, 2], [16, 4], [-2, 10]]) if (Math.floor(tm * 6 + a) % 2) P(bx0 + a, by + b, 1, 1, "#fff"); }
      } else if (artFail) paintMe(g, ME, cx, y0 + bob, deskY, { eye, mouth, arm, w: Math.floor(tm * 7) % 2 });
      // 마이크(붐 암)
      P(cx - 26, y0 + 12, 1, 1, "#3a3644"); for (let i = 0; i < 12; i++) P(cx - 26 + i, y0 + 12 + Math.round(i * 0.6), 1, 1, "#3a3644");
      P(cx - 15, y0 + 16, 4, 8, "#2b2834"); P(cx - 15, y0 + 16, 4, 1, "#4a4656"); for (let k = 0; k < 3; k++) P(cx - 14, y0 + 18 + k * 2, 2, 1, "#55506a"); P(cx - 16, y0 + 19, 1, 3, "#222");
      // 책상과 소품
      drawDesk(tm);
      if (artFail) { if (cs.hold <= 0 && cs.up <= 0) { P(cx - 15, deskY - 2, 5, 3, ME.skin); P(cx + 10, deskY - 2, 5, 3, ME.skin); } else if (cs.hold > 0) P(cx - 15, deskY - 2, 5, 3, ME.skin); }
      const mx = cx + 18; P(mx, deskY - 7, 6, 7, "#f2e6d8"); P(mx, deskY - 7, 6, 1, "#fff"); P(mx + 6, deskY - 5, 2, 1, "#f2e6d8"); P(mx + 7, deskY - 5, 1, 3, "#f2e6d8"); P(mx + 6, deskY - 3, 2, 1, "#f2e6d8"); P(mx + 2, deskY - 5, 2, 2, "#ff6fa8");
      for (let i = 0; i < 2; i++) { const ph = (tm * 0.8 + i * 0.5) % 1; g.globalAlpha = 0.6 * (1 - ph); P(mx + 2 + Math.round(Math.sin((tm + i) * 4)), deskY - 9 - Math.round(ph * 8), 1, 2, "#fff"); } g.globalAlpha = 1;
      const bx = Math.min(LW - 10, cx + 28), glow = link.on && !link.done;
      if (glow) { g.globalAlpha = 0.35 + 0.25 * Math.sin(tm * 14); P(bx - 2, deskY - 13, 12, 14, "#ffd166"); g.globalAlpha = 1; }
      P(bx, deskY - 10, 8, 10, "#7fe0c0"); P(bx, deskY - 10, 8, 1, "#b0f0dc"); P(bx + 3, deskY - 10, 2, 10, "#fff"); P(bx + 1, deskY - 14, 5, 4, "#ffd166"); P(bx + 1, deskY - 14, 5, 1, "#fff3b0");
      const px = Math.max(3, cx - 34); P(px, deskY - 5, 6, 5, "#e0e0e8"); P(px, deskY - 5, 6, 1, "#fff"); P(px - 1, deskY - 10, 8, 5, "#4fae5a"); P(px + 1, deskY - 12, 4, 2, "#6fce7a"); P(px + 2, deskY - 9, 1, 1, "#ff7eb6");
      // 링라이트가 비추는 빛
      g.globalCompositeOperation = "lighter"; const lg = g.createRadialGradient(cx - 4, y0 + 12, 2, cx, y0 + 18, 34); lg.addColorStop(0, "rgba(255,230,200,.13)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(cx - 40, y0 - 22, 80, 80); g.globalCompositeOperation = "source-over";
      g.drawImage(VG, 0, 0);
      // 떡상 색종이
      confetti.forEach((c) => P(Math.round(c.x), Math.round(c.y), 1, c.t % 2 ? 2 : 1, c.c));
      // 하트
      hearts.forEach((h) => { if (h.delay > 0) return; const a = h.down ? clamp(h.life, 0, 1) : clamp(h.life / 0.8, 0, 1); drawHeart(Math.round(h.x + Math.sin(h.ph) * 2.5) - 3, Math.round(h.y), h.c, a); });
      // 동전
      coins.forEach((c) => { const w = [5, 3, 1, 3][Math.floor(c.sp) % 4], x = Math.round(c.x - w / 2), y = Math.round(c.y); P(x, y, w, 5, "#c9961c"); if (w > 1) P(x + 1, y + 1, w - 2, 3, "#ffd166"); if (w === 5) P(x + 1, y + 1, 1, 2, "#fff3b0"); });
      // 시청자 그래프(오른쪽 위)
      const GW = Math.min(40, Math.floor(LW * 0.34)), GH = 15, GX = LW - GW - 3, GY = 3;
      drawGraph(g, GX, GY, GW, GH, true, false);
      if (surge.on) { g.fillStyle = Math.floor(tm * 8) % 2 ? "#ffd166" : "#ff5f9e"; g.fillRect(GX - 1, GY - 1, GW + 2, 1); g.fillRect(GX - 1, GY + GH, GW + 2, 1); g.fillRect(GX - 1, GY, 1, GH); g.fillRect(GX + GW, GY, 1, GH); }
    };

    // ── 흐름 ──
    const spawn = () => {
      const prog = el / T;
      if (goldIdx < goldAt.length && el >= goldAt[goldIdx]) { goldIdx++; addMsg("gold", take("o")); return; }
      const badP = surge.on ? 0.22 : 0.26 + 0.16 * prog;
      if (rnd() < badP) addMsg("bad", take("b"));
      else if (surge.on && rnd() < 0.08) addMsg("gold", take("o"));
      else addMsg("good", take("g"));
      // 도배: 가끔 같은 악플이 두 줄 연달아
      if (prog > 0.3 && rnd() < 0.12) { const t = take("b"); addMsg("bad", t); setTimeout(() => { if (!over) addMsg("bad", t); }, 260); }
    };
    const startLink = () => {
      link.on = true; link.t = 0; link.started = true; banner("링크 주세요!<small>공구 링크 요청이 몰려와요</small>");
      linkBtn.classList.add("on"); cs.hold = 4.6; say("짜잔! 오늘의 공구템이에요~", "", 1.6); SFX.whoosh(); tone(880, 0.12, "square", 0.08); tone(1175, 0.16, "square", 0.08, 0, 0.1);
    };
    const tickLink = (dt) => {
      link.t += dt; const e = link.t;
      link.dem = e < 2.4 ? e / 2.4 : e < 3.4 ? 1 : Math.max(0, 1 - (e - 3.4) / 1.3 * 0.75);
      linkBtn.style.setProperty("--p", link.dem.toFixed(3));
      const ready = link.dem >= 0.8 && !link.done; linkBtn.classList.toggle("ready", ready); linkBtn.querySelector("small").textContent = ready ? "지금!" : e < 2.4 ? "모으는 중" : "빠지는 중…";
      if (e < 3.6 && e >= link.nextMsg) { link.nextMsg = e + 0.3; addMsg("link", pick(LINKS)); }
      if (e > 4.8 || link.done) {
        link.on = false; if (!link.done) { link.done = true; link.q = 0; mood -= 10; F.miss(null); F.msg("링크 타이밍을 놓쳤어요… 다들 나가요"); addV(-(viewers * 0.15)); say("아앗, 링크…!", "bad", 1.2); cs.shock = 1; linkBtn.classList.remove("on", "ready"); linkBtn.classList.add("out"); setTimeout(() => linkBtn.classList.remove("out"), 420); moodUpd(); }
        // 남은 링크 요청 말은 걷어 낸다
        msgs.filter((m) => m.type === "link").forEach((m) => drop(m, "exp"));
      }
    };
    const startSurge = () => { surge.on = true; surge.t = 0; st.classList.add("surge"); banner("떡상 구간!<small>시청자가 몰려와요</small>", "rb"); surgeSnd(); vib([30, 30, 30, 30, 60]); cs.up = 1.6; say("헉 사람 왜 이렇게 많아요?!", "gold", 1.5); heartUp(12, true); };
    // ── 리허설: 좋은 댓글 톡 → 악플 밀기 → 금색·링크 안내 → 방송 시작 ──
    const handAt = (elm, mode) => {
      if (!elm) { hand.className = "lv-hand"; return; }
      const r = elm.getBoundingClientRect(), s = st.getBoundingClientRect();
      hand.style.left = Math.round(r.left - s.left + Math.min(r.width, 230) * 0.55) + "px"; hand.style.top = Math.round(r.top - s.top + 6) + "px";
      if (!hand.classList.contains(mode)) hand.className = "lv-hand on " + mode;
    };
    hand.style.backgroundImage = `url(${fingerURL()})`;
    const SKIP = `<button class="lv-skip" data-skip>건너뛰기</button>`;
    const tutNext = (n) => {
      tut = n; tutT = 0; tutM = null; handAt(null); tutEl.classList.remove("pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        st.classList.add("tags"); say("방송 전에 리허설 해 볼게요!", "", 1.8); cs.wave = 1.6;
        tutP.innerHTML = `채팅이 아래에서 올라와요.<br><b class="pk">좋은 댓글</b>은 <b class="pk">톡</b> 해서 답해요!`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut !== 1) return; addMsg("good", ["첫방 축하해요!!", "와 와 줘서 고마워요!"]); tutM = msgs[msgs.length - 1]; }, 500);
      } else if (n === 2) {
        tutP.innerHTML = `잘했어요! 이번엔 <b class="rd">악플·광고</b>예요.<br>답하지 말고 <b class="rd">옆으로 쓱 밀어서</b> 가려요!`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut !== 2) return; addMsg("bad", "광고) 팔로워 1만 명 3천 원 ▶"); tutM = msgs[msgs.length - 1]; }, 900);
      } else if (n === 3) {
        say("좋아요, 준비 끝!", "gold", 1.6); cs.up = 1;
        tutP.innerHTML = `완벽해요! 방송 중엔 이것도 챙겨요.<br><b class="gd">금색 말</b>(협찬·후원)은 꼭 <b class="gd">톡</b>!<br><b>"링크 주세요!"</b>가 몰리면 오른쪽 버튼이 <b class="gr">초록</b>일 때 톡!`;
        tutB.innerHTML = `<button class="lv-go" data-go>방송 시작!</button>`; tutEl.classList.add("low");
      }
    };
    const startLive = () => {
      if (tut < 0) return; tut = -1; tutM = null; handAt(null); tutEl.classList.add("off");
      [...msgs].forEach((m) => drop(m, "exp"));
      viewers = 3; peak = 3; mood = 62; moodSum = 0; moodT = 0; likes = 0; fol = 0; folF = 0; combo = 0; badSeen = 0; badOk = 0; goodOk = 0; goldOk = 0; wrongs = 0; hist.length = 0; hearts.length = 0; coins.length = 0;
      for (const k of ["talk", "happy", "shock", "wave", "hold", "up", "sad", "blush"]) cs[k] = 0;
      sayEl.classList.remove("on"); sayT = 0; lastSay = 0; nextAt = 1.6; nextHist = 0;
      con.classList.remove("off"); st.classList.add("tags"); t0 = 0; SFX.go?.(); moodUpd(); updV();
      timer(T, F.bar, end);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startLive(); } });
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) startLive(); else tutNext(1); }
        if ((tut === 1 || tut === 2) && tutM && !tutM.gone) handAt(tutM.el, tut === 1 ? "tap" : "swipe"); else if (tut !== 3) handAt(null);
        if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
        if (tutT > 1 && rnd() < dt * 0.4) heartUp(1);
      } else {
      if (!t0) t0 = now;
      el = (now - t0) / 1000;
      if (el > 10 && st.classList.contains("tags")) st.classList.remove("tags");
      lhEl.classList.toggle("on", link.on && !link.done);
      if (!over) {
        if (el > 1.3 && !con.classList.contains("off")) { con.classList.add("off"); $(".lv-live").classList.add("on"); say("안녕하세요! 첫 라이브예요!", "", 1.8); cs.wave = 2.2; SFX.pop(); tone(1046, 0.12, "triangle", 0.1, 0, 0.1); }
        if (el >= LINK_AT && !link.started) startLink();
        if (link.on) tickLink(dt);
        if (el >= SURGE_AT && !surge.done && !surge.on) startSurge();
        if (surge.on) { surge.t += dt; if (rnd() < dt * 40) confetti.push({ x: rnd() * LW, y: -2, vy: 20 + rnd() * 25, vx: (rnd() - 0.5) * 10, c: pick(HCOL), t: rint(4) }); if (surge.t > SURGE_LEN) { surge.on = false; surge.done = true; st.classList.remove("surge"); } }
        if (el >= nextAt && el > 1.4) {
          if (!link.on) spawn();
          const prog = el / T; nextAt = el + (1.2 - 0.42 * prog) * ez * (surge.on ? 0.55 : 1) * (0.8 + rnd() * 0.4) * (link.on ? 2.5 : 1);
        }
        // 시청자 흐름: 분위기가 좋으면 늘고, 싸하면 빠진다
        if (el > 1.3) {
          const r = ((mood - 50) / 50) * (1 + Math.sqrt(viewers) * 0.6) * (surge.on ? 2 : 1); mood -= dt * 1.3; moodUpd();
          addV(r * dt);
          if (surge.on && mood > 30) addV(dt * (8 + Math.sqrt(viewers) * 1.6) * (mood - 30) / 70);
          if (rnd() < dt * clamp(viewers / 40, 0.3, 6)) heartUp(1);
        }
        moodSum += mood * dt; moodT += dt;
        if (el >= nextHist) { nextHist += 0.2; hist.push(viewers); }
        if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
        if (el - lastSay > 4.6 && el > 3 && !link.on) { say(pick(IDLE), "", 1.5); cs.wave = 1.2; }
        updV();
      } else if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      }
      for (const k of ["talk", "happy", "shock", "wave", "hold", "up", "sad", "blush"]) if (cs[k] > 0) cs[k] -= dt;
      cs.blink -= dt; if (cs.blink < 0) cs.blink = 2 + rnd() * 2.5;
      for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.delay > 0) { h.delay -= dt; continue; } h.y += h.vy * dt; h.ph += dt * 4; h.life -= dt; if (h.down && h.y > LH * 0.55) h.life -= dt * 3; if (h.life <= 0) hearts.splice(i, 1); }
      for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.vy += 60 * dt; c.y += c.vy * dt; c.x += c.vx * dt; c.sp += dt * 10; if (c.y > deskY - 2 && c.vy > 0 && !c.b) { c.vy *= -0.45; c.b = 1; } if (c.y > LH + 4) coins.splice(i, 1); }
      for (let i = confetti.length - 1; i >= 0; i--) { const c = confetti[i]; c.y += c.vy * dt; c.x += c.vx * dt + Math.sin(el * 6 + i) * 0.2; c.t = (c.t + 1) % 8; if (c.y > LH) confetti.splice(i, 1); }
      render(tut >= 0 ? now / 1000 : el);
      raf = requestAnimationFrame(loop);
    };
    // 방송 종료 연출 → 집계 → 결과
    const end = () => {
      if (over) return; over = true; drag = null;
      linkBtn.classList.remove("on", "ready");
      hist.push(viewers); fol = Math.round(fol + folF);
      say("오늘 와 줘서 고마워요! 또 만나요~", "", 2); cs.wave = 2; cs.happy = 2;
      setTimeout(() => {
        if (done) return;
        [784, 659, 523].forEach((f, i) => tone(f, 0.16, "triangle", 0.1, 0, i * 0.12));
        const ov = document.createElement("div"); ov.className = "lv-end";
        ov.innerHTML = `<div class="lv-endt"><em>LIVE</em>방송이 종료되었어요<small>첫 라이브 · 30초</small></div><canvas class="lv-endg"></canvas>
          <div class="lv-stats"><div><span>최고 시청자</span><b data-k="0">0</b></div><div><span>받은 하트</span><b data-k="1">0</b></div><div><span>새 팔로워</span><b data-k="2">+0</b></div></div><div class="lv-bye">다음 방송도 기대할게요!</div>`;
        st.appendChild(ov);
        const gc = ov.querySelector("canvas"); gc.width = 96; gc.height = 40; drawGraph(gc.getContext("2d"), 0, 0, 96, 40, false, true);
        const tg = [peak, likes, fol], bs = ov.querySelectorAll("[data-k]"), t1 = performance.now();
        const cnt = () => { const p = clamp((performance.now() - t1 - 300) / 1300, 0, 1), e = 1 - Math.pow(1 - p, 3); bs.forEach((b, i) => (b.textContent = (i === 2 ? "+" : "") + fmt(tg[i] * e))); if (p < 1 && b0()) { if (Math.random() < 0.5) SFX.tick(); requestAnimationFrame(cnt); } else if (p >= 1) { SFX.ding(4); vib(15); } };
        const b0 = () => ov.isConnected;
        requestAnimationFrame(cnt);
      }, 1100);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const vS = clamp(Math.log(Math.max(1, peak) / 8) / Math.log(2000 / 8), 0, 1);
        const mAvg = moodT ? moodSum / moodT : mood, mS = clamp((mAvg - 25) / 60, 0, 1);
        const score = vS * 0.6 + mS * 0.4;
        finish(score, `최고 시청자 <b>${fmt(peak)}명</b> · 하트 ${fmt(likes)} · 새 팔로워 +${fmt(fol)}`, "", [["최고 시청자", vS], ["분위기", mS], ["악플 처리", badSeen ? badOk / badSeen : 1]]);
      }, 4300);
    };
    if (dbg) dbg.insta2 = { msgs, link, surge, tap: tapMsg, hide: hideMsg, press: pressLink, start: startLive, tut: () => tut, tutM: () => tutM, st: () => ({ el, viewers: Math.round(viewers), peak, mood: Math.round(mood), likes, fol: Math.round(fol + folF), goodOk, goldOk, badOk, badSeen, wrongs, q: link.q, art }) };
    moodUpd(); updV(); render(0);
    raf = requestAnimationFrame(loop);
  },
};
