// 웹소설 1탄(webnovel1) "마감 5분 전": 밤 11시 55분, 퇴근하고 책상 앞. 자정까지 오늘 회차 5,000자를 채운다.
// 아래 세 줄로 문장 조각(대사·묘사·반전)이 내려온다. 오늘 장르와 같은 색 조각만 톡 → 원고에 타자로 쌓인다.
// 다른 장르·빨간 밑줄 오타·딴짓 조각은 흘려보낸다. 졸음이 차면 눈꺼풀이 내려오니 커피 조각을 톡.
// 자정 종이 울리면 '업로드' 버튼을 바로 누르는 것이 클라이맥스. 그 뒤 독자 댓글이 쏟아진다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const T = 30, GOAL = 5000;
// 장르: 이름, 색, 작품 제목, 대사·묘사·반전·오타({}가 틀린 글자)
const GEN = {
  reg: { n: "회귀물", c: "#5fb8ff", t: "회귀한 신입은 칼퇴한다", op: "다시, 월요일",
    line: ["“이번 생엔 안 당해.”", "“그 주식, 지금 사.”", "“10년 전이라고?”", "“부장님, 그거 망해요.”", "“이번엔 내가 먼저다.”", "“너, 날 배신했지.”"],
    desc: ["눈을 뜨자 입사 첫날.", "달력이 10년 전이었다.", "모든 게 기억 그대로.", "손목시계가 거꾸로 돈다.", "익숙한 사무실, 젊은 얼굴."],
    twist: ["회귀한 건 나만이 아니었다.", "이번이 세 번째 회귀였다."],
    typo: ["“이번 생엔 {않} 당해.”", "모든 게 {기억데로}.", "“이번엔 내가 {먼저닷}.”", "달력이 10년 {전이엿다}."] },
  rof: { n: "로판", c: "#ff8fc8", t: "북부 대공의 계약 약혼녀", op: "계약 약혼식",
    line: ["“이 계약, 1년이에요.”", "“공작님, 놓아 주세요.”", "“당신만은 지키겠소.”", "“드레스 말고 검을요.”", "“무도회가 시작됩니다.”"],
    desc: ["샹들리에 아래 왈츠.", "은발이 달빛에 젖었다.", "장미 정원에 첫눈이 왔다.", "편지에 황실 문장이 있다."],
    twist: ["악녀에 빙의한 건 나였다.", "대공은 처음부터 알았다."],
    typo: ["“공작님, 놓아 {주새요}.”", "샹들리에 아래 {왈쯔}.", "“당신만은 {지키겟소}.”", "은발이 {달빗에} 젖었다."] },
  mur: { n: "무협", c: "#ffb03b", t: "천하제일 야근검", op: "야근검, 강호에 서다",
    line: ["“검을 뽑아라.”", "“사부님의 원수다!”", "“이 초식을 받아라!”", "“점소이, 술 한 동이!”", "“강호가 날 부른다.”"],
    desc: ["대숲에 검기가 번뜩였다.", "내공이 단전에 휘돈다.", "절벽 아래 비급이 있었다.", "객잔 문이 벌컥 열렸다."],
    twist: ["사부가 마교 교주였다.", "잃은 내공이 두 배로!"],
    typo: ["“검을 {뽑아랑}.”", "내공이 {단젼에} 휘돈다.", "“사부님의 {원쑤다}!”", "객잔 문이 {벌꺽} 열렸다."] },
};
const DIST = ["쇼츠 딱 한 편만…", "침대가 부른다", "5분만 눈 감을까", "단톡방 알림 99+", "야식 시킬까?", "내일 쓰면 안 되나"];
const COF = ["샷 추가 아메리카노", "식은 믹스커피", "에너지 드링크"];
const GAIN = { 대사: 120, 묘사: 140, 반전: 280 };
// 독자 댓글(닉네임은 지어낸 말 조합)
const NICK_A = ["새벽", "출근길", "야근", "정주행", "월요병", "퇴근한", "졸린", "말랑", "주말", "통통", "꿈꾸는", "느긋한"];
const NICK_B = ["독자", "감자", "고양이", "만두", "펭귄", "라떼", "도토리", "붕어빵", "호떡", "두부", "판다", "치즈"];
const C_GOOD = ["작가님 오늘도 감사합니다", "다음 화 언제요ㅠㅠ", "이 맛에 노블리 해요", "오늘 분량 혜자네요", "출근길 유일한 낙이에요", "작가님 건강 챙기세요!", "정주행 3회차입니다", "코인 아깝지 않다", "와 끊는 거 미쳤다", "댓글 1등 하려고 기다림"];
const C_TWIST = ["반전 소름 돋았어요", "아니 이게 반전이라고?!", "반전에서 소리 질렀어요"];
const C_MEH = ["오늘 좀 짧네요ㅠ", "분량 실화…?", "다음 화는 길게 부탁해요", "읽다가 끝나서 당황"];
const C_TYPO = ["3번째 줄 오타 있어요~", "맞춤법… 작가님 피곤하신 듯ㅋㅋ"];
const C_ON = ["자정 땡! 바로 왔어요", "업로드 알람 맞춰 놨어요", "12시 정각 칼업로드 ㄷㄷ"];
const C_LATE = ["12시 땡 하고 왔는데 없어서 놀람", "오늘 지각 업로드ㅋㅋ"];
// 3x5 숫자
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
// 작은 그림(X 테두리, a 주색, b 밝은색, c 포인트)
const ICON = {
  reg: [".XXXXX.", "XbbbbbX", ".XaaaX.", "..XaX..", "..XbX..", ".XbabX.", "XaaaaaX", ".XXXXX."],
  rof: ["..XXX..", ".XabaX.", "XabaaaX", "XaaabaX", ".XaaaX.", "..XcX..", ".ccX...", "...c..."],
  mur: [".....XX", "....XbX", "...XbX.", "..XbX..", "X.XbX..", ".XcX...", "XcXX...", "X......"],
  dist: [".XXXXX.", "XaaaaaX", "XbbbbcX", "XbbbbbX", "XbbbbbX", "XbbbbbX", "XaaaaaX", ".XXXXX."],
  cof: ["..b.b..", ".b.b...", "XXXXXX.", "XccccXX", "XaaaaX.X", "XaaaaXX", ".XaaX..", "..XX..."],
};
const ICOL = {
  reg: { a: "#ffd166", b: "#d6f0ff" }, rof: { a: "#ff6fa8", b: "#ffd0e6", c: "#4fae5a" }, mur: { a: "#c8ccd8", b: "#ffffff", c: "#ffb03b" },
  dist: { a: "#4a3f66", b: "#7fc8ff", c: "#ff3b5c" }, cof: { a: "#8a5a3a", b: "#ffffffaa", c: "#f2e6d8" },
};
const FINGER = ["....XX.......", "...XooX......", "...XooX......", "...XooXXX....", "...XooXooXXX.", ".XXXooXooXooX", "XooXooooooooX", "XoooooooooooX", ".XooooooooooX", "..XoooooooooX", "..XooooooooX.", "...XoooooooX.", "...XXXXXXXXX."];

const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const plain = (s) => s.replace(/[{}]/g, "");
const iconCache = {};
function iconURL(k) {
  if (iconCache[k]) return iconCache[k];
  const c = document.createElement("canvas"); c.width = 8; c.height = 8; const g = c.getContext("2d"), pal = ICOL[k];
  ICON[k].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : pal[ch] || "#fff"; g.fillRect(x, y, 1, 1); }));
  return (iconCache[k] = c.toDataURL());
}
function fingerURL() {
  const c = document.createElement("canvas"); c.width = 13; c.height = 13; const g = c.getContext("2d");
  FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = ch === "X" ? "#2a1e2e" : x <= 4 && y < 6 ? "#fff" : "#ffe6d6"; g.fillRect(x, 12 - y, 1, 1); }));
  return c.toDataURL();
}
// 방법 화면 그림(40x40 도트 3장)
function stepPics() {
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = 40; c.height = 40; const g = c.getContext("2d"); fn((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }); return c.toDataURL(); };
  const ic = (P, k, x, y) => ICON[k].forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") P(x + i, y + j, 1, 1, ch === "X" ? "#2a1e2e" : ICOL[k][ch] || "#fff"); }));
  const card = (P, x, y, col) => { P(x, y + 1, 30, 15, "#0006"); P(x, y, 30, 15, "#fffaf0"); P(x, y, 3, 15, col); P(x + 13, y + 3, 9, 3, col); };
  const a = mk((P) => {
    P(0, 31, 40, 1, "#5fb8ff"); P(0, 30, 40, 1, "#5fb8ff55"); P(0, 32, 40, 1, "#5fb8ff55");
    card(P, 4, 18, "#5fb8ff"); ic(P, "reg", 7, 19); P(8, 29, 20, 1, "#5a4a5a"); P(8, 31, 14, 1, "#5a4a5a");
    FINGER.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") P(18 + x, 26 + (12 - y) - 12 + 12, 1, 1, ch === "X" ? "#2a1e2e" : "#ffe6d6"); }));
    for (const [x, y] of [[4, 8], [34, 10], [20, 4]]) { P(x, y, 1, 3, "#ffd166"); P(x - 1, y + 1, 3, 1, "#ffd166"); }
  });
  const b = mk((P) => {
    card(P, 2, 4, "#ff8fc8"); ic(P, "rof", 5, 5); P(6, 14, 18, 1, "#5a4a5a");
    card(P, 8, 22, "#5fb8ff"); ic(P, "reg", 11, 23); P(12, 31, 8, 1, "#5a4a5a"); for (let i = 0; i < 10; i++) P(22 + i, 33 + (i % 2), 1, 1, "#ff3b4f"); P(22, 31, 9, 1, "#5a4a5a");
    for (let i = 0; i < 6; i++) { P(31 + i, 2 + i, 2, 1, "#ff3b4f"); P(36 - i, 2 + i, 2, 1, "#ff3b4f"); }
    P(32, 16, 1, 1, "#9aa0c0"); P(33, 17, 1, 1, "#9aa0c0"); P(34, 18, 1, 1, "#9aa0c0"); P(33, 19, 1, 1, "#9aa0c0"); P(32, 20, 1, 1, "#9aa0c0");
  });
  const c = mk((P) => {
    ic(P, "cof", 3, 6); P(2, 15, 9, 1, "#0005");
    P(14, 4, 22, 22, "#2a1e2e"); P(15, 5, 20, 20, "#1a1424"); const d = (n, x, y) => [...DIG[n]].forEach((v, i) => v === "1" && P(x + (i % 3), y + Math.floor(i / 3), 1, 1, "#ff4b5c"));
    d(0, 16, 12); d(0, 20, 12); P(24, 13, 1, 1, "#ff4b5c"); P(24, 15, 1, 1, "#ff4b5c"); d(0, 26, 12); d(0, 30, 12);
    P(6, 29, 28, 9, "#1f6fd0"); P(6, 29, 28, 2, "#5fb8ff"); P(7, 37, 26, 1, "#0d3a80"); P(19, 31, 2, 5, "#fff"); P(17, 33, 6, 1, "#fff"); P(18, 32, 4, 1, "#fff");
  });
  return [[`<img src="${a}" alt="">`, "같은 장르 조각 톡"], [`<img src="${b}" alt="">`, "다른 장르·오타는 패스"], [`<img src="${c}" alt="">`, "졸리면 커피, 자정엔 업로드"]];
}

export const GAME = {
  key: "webnovel1", base: "webnovel", jc: "#5fb8ff", n: "마감 5분 전", desc: "밤 11시 55분, 자정 업로드까지 오늘 회차 5,000자를 채워요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 퇴근하고 책상 앞, 자정까지 오늘 회차 <b>5,000자</b>를 채워요.",
    "아래로 내려오는 문장 조각 중 <b>오늘 장르와 같은 색</b>만 톡! <b>타자 라인</b>에서 누르면 '완벽', 너무 일찍 누르면 덜 써져요. 다른 장르·<b>빨간 밑줄 오타</b>·딴짓은 흘려보내요.",
    "눈꺼풀이 내려오면 <b>커피</b>를 톡. 자정 종이 울리면 <b>업로드</b> 버튼을 바로 눌러요!",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "같은 장르 조각 톡"], ["", "다른 장르·오타는 패스"], ["", "졸리면 커피, 자정엔 업로드"]]; } },
  css: `
.mg-webnovel1 .wn-st{background:#0d0a18!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-webnovel1 .wn-cv{position:absolute;left:0;top:0;z-index:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.mg-webnovel1 .wn-cv.wn-fr{z-index:2;pointer-events:none}
.mg-webnovel1 .mg-steps img{width:76px;height:76px;image-rendering:pixelated}
.mg-webnovel1 .mg-msg{z-index:24}
.mg-webnovel1 .wn-rc{position:absolute;left:0;top:0;right:0;z-index:1;overflow:hidden;pointer-events:none}
.mg-webnovel1 .wn-me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter .4s;transform-origin:50% 90%}
.mg-webnovel1 .wn-me.on{opacity:1}
.mg-webnovel1 .wn-me.sl{filter:brightness(.72) saturate(.8)}
.mg-webnovel1 .wn-gn{position:absolute;left:6px;top:6px;z-index:6;display:flex;align-items:center;gap:5px;background:#0009;border:1px solid var(--gc);color:#fff;font-size:10.5px;font-weight:700;padding:3px 8px 3px 5px;border-radius:7px;pointer-events:none}
.mg-webnovel1 .wn-gn i{width:16px;height:16px;background-size:100% 100%;image-rendering:pixelated}
.mg-webnovel1 .wn-gn b{color:var(--gc);font-size:13px;font-weight:900}
.mg-webnovel1 .wn-gn.pop{animation:wnpop .5s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel1 .wn-say{position:absolute;left:50%;z-index:7;transform:translate(-50%,-100%) scale(.4);transform-origin:50% 100%;opacity:0;background:#fff;color:#2a1e2e;font-weight:800;font-size:12.5px;padding:5px 10px;border-radius:11px;white-space:nowrap;box-shadow:0 3px 0 #0005;pointer-events:none;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s}
.mg-webnovel1 .wn-say.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
.mg-webnovel1 .wn-say.sl{background:#d8d4f0;color:#3a3466}
.mg-webnovel1 .wn-say.gd{background:#ffd166;color:#3a2400}
.mg-webnovel1 .wn-pp{position:absolute;left:8px;right:8px;z-index:4;background:#fbf6ea;border-radius:9px;box-shadow:0 3px 0 #0007,inset 0 0 0 1px #e6dcc6;display:flex;flex-direction:column;overflow:hidden;transition:box-shadow .3s}
.mg-webnovel1 .wn-st.spurt .wn-pp{box-shadow:0 3px 0 #0007,0 0 0 2px #ff5a6a,0 0 14px #ff5a6a88}
.mg-webnovel1 .wn-ph{display:flex;align-items:center;gap:6px;padding:4px 8px;background:#ece3cf;color:#5a4a3a;font-size:10.5px;flex:none}
.mg-webnovel1 .wn-ph b{font-weight:900;color:#3a2a1e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.mg-webnovel1 .wn-ph span{white-space:nowrap;font-weight:700}
.mg-webnovel1 .wn-ph em{margin-left:auto;font-style:normal;font-weight:900;font-size:10.5px;color:#fff;background:#1f6fd0;border-radius:5px;padding:1px 6px;opacity:0;white-space:nowrap;transition:opacity .2s}
.mg-webnovel1 .wn-ph em.on{opacity:1}
.mg-webnovel1 .wn-ph em.bump{animation:wnbump .25s}
.mg-webnovel1 .wn-tx{flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:3px 9px 2px;font-family:"Nanum Myeongjo","Noto Serif KR",Batang,serif;font-size:12.5px;line-height:1.45;color:#2a2018;white-space:pre-wrap;word-break:keep-all}
.mg-webnovel1 .wn-tx p{margin:0}
.mg-webnovel1 .wn-cur{display:inline-block;width:2px;height:13px;background:#1f6fd0;vertical-align:-2px;margin-left:1px;animation:wnblink .8s steps(1) infinite}
.mg-webnovel1 .wn-tx p.del{background:#ff5a6a22}
.mg-webnovel1 .wn-pb{position:relative;flex:none;height:17px;margin:2px 6px 5px;border-radius:5px;background:#e6dcc6;overflow:hidden}
.mg-webnovel1 .wn-pb i{position:absolute;left:0;top:0;bottom:0;width:var(--w,0%);background:linear-gradient(90deg,#5fb8ff,#1f6fd0);transition:width .15s}
.mg-webnovel1 .wn-pb u{position:absolute;left:0;top:0;bottom:0;width:var(--x,0%);background:linear-gradient(90deg,#ffd166,#ffb03b);transition:width .15s}
.mg-webnovel1 .wn-pb span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#2a2018;text-shadow:0 0 3px #fff,0 0 3px #fff}
.mg-webnovel1 .wn-pb.full i{background:linear-gradient(90deg,#3fcf7a,#1f9a4a)}
.mg-webnovel1 .wn-ln{position:absolute;left:0;right:0;z-index:5;overflow:hidden;touch-action:none}
.mg-webnovel1 .wn-p{position:absolute;left:0;top:0;width:var(--cw);will-change:transform}
.mg-webnovel1 .wn-c{box-sizing:border-box;padding:4px 5px 5px 7px;border-radius:8px;background:#fffaf0;color:#2a1e2e;box-shadow:0 3px 0 #0007;border-left:5px solid var(--gc);font-size:11.5px;line-height:1.25;font-weight:700;cursor:pointer;word-break:keep-all;animation:wnin .25s ease-out}
.mg-webnovel1 .wn-c .r{display:flex;align-items:center;gap:4px;margin-bottom:2px}
.mg-webnovel1 .wn-c i{width:16px;height:16px;background-size:100% 100%;image-rendering:pixelated;flex:none}
.mg-webnovel1 .wn-c em{font-style:normal;font-size:9.5px;font-weight:900;color:#fff;background:var(--gc);padding:0 5px;border-radius:4px;text-shadow:0 1px 0 #0004}
.mg-webnovel1 .wn-c s{text-decoration:underline wavy #ff2f45;text-decoration-thickness:2px;text-underline-offset:2px}
.mg-webnovel1 .wn-c u{display:none;margin-left:auto;text-decoration:none;font-size:9.5px;font-weight:900;padding:0 5px;border-radius:6px;background:#1f9a4a;color:#fff;white-space:nowrap}
.mg-webnovel1 .wn-st.tags .wn-c u{display:inline-block}
.mg-webnovel1 .wn-c.k-off u,.mg-webnovel1 .wn-c.k-typo u,.mg-webnovel1 .wn-c.k-dist u{background:#5a5a6a}
.mg-webnovel1 .wn-c.k-dist{background:#2c2440;color:#d8ccf0}
.mg-webnovel1 .wn-c.k-dist em{background:#6a5a90}
.mg-webnovel1 .wn-c.k-cof{background:#5a3a26;color:#ffe9c8}
.mg-webnovel1 .wn-c.k-cof em{background:#c9961c;color:#2a1a00}
.mg-webnovel1 .wn-c.k-cof u{background:#ffd166;color:#3a2400}
.mg-webnovel1 .wn-c.tw{background:linear-gradient(#fff6d0,#ffe39a);box-shadow:0 0 0 2px #ffd166,0 0 12px #ffd166,0 3px 0 #0007;animation:wnin .25s ease-out,wnglow .4s .25s infinite alternate}
.mg-webnovel1 .wn-c.hit{animation:wnhit .38s ease-in forwards;pointer-events:none}
.mg-webnovel1 .wn-c.bad{animation:wnbad .45s ease-out forwards;pointer-events:none}
.mg-webnovel1 .wn-c.late{opacity:.4;filter:grayscale(.8);transition:opacity .2s}
.mg-webnovel1 .wn-c.pass{opacity:.5;transition:opacity .3s}
.mg-webnovel1 .wn-c.nope{animation:wnnope .35s}
.mg-webnovel1 .wn-c.fade{opacity:0;transition:opacity .4s}
.mg-webnovel1 .wn-hl{position:absolute;right:8px;z-index:3;transform:translateY(-100%);font-size:9.5px;font-weight:900;color:#9fd8ff;letter-spacing:.5px;pointer-events:none;opacity:.85;text-shadow:0 1px 0 #000}
.mg-webnovel1 .wn-lid{position:absolute;left:0;right:0;z-index:15;height:var(--lh,0%);pointer-events:none;transition:height .12s}
.mg-webnovel1 .wn-lid.t{top:0;background:linear-gradient(#030208 0,#030208 calc(100% - 26px),#03020800)}
.mg-webnovel1 .wn-lid.b{bottom:0;background:linear-gradient(#03020800,#030208 26px,#030208)}
.mg-webnovel1 .wn-ban{position:absolute;left:50%;z-index:16;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:25px;white-space:nowrap;pointer-events:none;color:#fff;text-shadow:0 0 2px #000,0 3px 0 #1f6fd0,0 0 16px #1f6fd0;text-align:center}
.mg-webnovel1 .wn-ban small{display:block;font-size:12.5px;color:#fff}
.mg-webnovel1 .wn-ban.on{animation:wnban 1.7s ease-out forwards}
.mg-webnovel1 .wn-ban.gd{color:#ffd166;text-shadow:0 0 2px #000,0 3px 0 #a86a00,0 0 16px #ffb03b}
.mg-webnovel1 .wn-ban.rd{text-shadow:0 0 2px #000,0 3px 0 #c0303a,0 0 16px #ff5a6a}
.mg-webnovel1 .wn-up{position:absolute;left:50%;z-index:23;transform:translate(-50%,-50%) scale(.3);opacity:0;pointer-events:none;width:200px;height:74px;border:0!important;border-radius:18px!important;padding:0!important;background:linear-gradient(#5fb8ff,#1f6fd0)!important;box-shadow:0 5px 0 #0d3a80,0 0 0 3px #fff,0 0 30px #5fb8ff!important;color:#fff!important;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;overflow:hidden;cursor:pointer;transition:transform .3s cubic-bezier(.3,1.8,.5,1),opacity .2s}
.mg-webnovel1 .wn-up.on{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto;animation:wnpulse .35s .3s infinite alternate}
.mg-webnovel1 .wn-up b{position:relative;font-size:24px;font-weight:900;letter-spacing:2px}
.mg-webnovel1 .wn-up small{position:relative;font-size:11.5px;font-weight:800;opacity:.95}
.mg-webnovel1 .wn-up::before{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--p,0%);background:#ffffff40;transition:width .7s linear}
.mg-webnovel1 .wn-up.ing{animation:none;pointer-events:none}
.mg-webnovel1 .wn-up.done{opacity:0;transform:translate(-50%,-50%) scale(1.3);transition:transform .35s,opacity .35s}
.mg-webnovel1 .wn-tut{position:absolute;left:10px;right:10px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-webnovel1 .wn-tut.off{opacity:0;visibility:hidden}
.mg-webnovel1 .wn-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #5fb8ff;max-width:310px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-webnovel1 .wn-tut.pop .wn-tc{animation:wnpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel1 .wn-tc em{font-style:normal;display:inline-block;background:#1f6fd0;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-webnovel1 .wn-tc p{margin:0}
.mg-webnovel1 .wn-tc b.bl{color:#1f6fd0}.mg-webnovel1 .wn-tc b.rd{color:#c0392b}.mg-webnovel1 .wn-tc b.br{color:#8a5a3a}.mg-webnovel1 .wn-tc b.gc{color:var(--gd)}
.mg-webnovel1 .wn-tb{margin-top:5px;display:flex;justify-content:center}
.mg-webnovel1 .wn-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-webnovel1 .wn-go{background:linear-gradient(#5fb8ff,#1f6fd0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d3a80!important;animation:wnpulse .5s infinite alternate}
.mg-webnovel1 .wn-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-37px 0 0 -14px;background-size:100% 100%;image-rendering:pixelated;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009)}
.mg-webnovel1 .wn-hand.on{display:block;animation:wntap .8s infinite}
.mg-webnovel1 .wn-end{position:absolute;left:0;right:0;bottom:0;z-index:25;background:linear-gradient(#0f1830,#0a0f20);display:flex;flex-direction:column;gap:7px;padding:9px 10px 8px;animation:wnup .45s cubic-bezier(.2,.9,.3,1);border-top:2px solid #5fb8ff}
.mg-webnovel1 .wn-eh{display:flex;align-items:center;gap:6px;color:#fff;font-size:12px;font-weight:700;white-space:nowrap}
.mg-webnovel1 .wn-eh i{font-style:normal;font-weight:900;background:#5fb8ff;color:#0a1a33;border-radius:5px;padding:1px 6px;font-size:11px}
.mg-webnovel1 .wn-eh b{overflow:hidden;text-overflow:ellipsis;min-width:0}
.mg-webnovel1 .wn-eh em{font-style:normal;margin-left:auto;color:#7CFC9A;font-weight:900;font-size:11px}
.mg-webnovel1 .wn-es{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.mg-webnovel1 .wn-es div{background:#ffffff12;border-radius:9px;padding:6px 2px;text-align:center;opacity:0;animation:wnst .4s cubic-bezier(.3,1.6,.5,1) forwards}
.mg-webnovel1 .wn-es div:nth-child(2){animation-delay:.2s}.mg-webnovel1 .wn-es div:nth-child(3){animation-delay:.4s}
.mg-webnovel1 .wn-es span{display:block;font-size:10.5px;color:#a8c0e0}
.mg-webnovel1 .wn-es b{display:block;font-size:18px;font-weight:900;color:#5fb8ff}
.mg-webnovel1 .wn-es div:nth-child(2) b{color:#ffd166}.mg-webnovel1 .wn-es div:nth-child(3) b{color:#ff8fc8}
.mg-webnovel1 .wn-sum{text-align:center;font-size:12px;color:#c8d8f0;font-weight:700;opacity:0;animation:wnst .4s .6s forwards}
.mg-webnovel1 .wn-sum b{color:#fff;font-size:14px}.mg-webnovel1 .wn-sum em{font-style:normal;color:#ffd166}.mg-webnovel1 .wn-sum i{font-style:normal;color:#ff8fa0}
.mg-webnovel1 .wn-cl{flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;-webkit-mask-image:linear-gradient(transparent,#000 22%);mask-image:linear-gradient(transparent,#000 22%)}
.mg-webnovel1 .wn-cm{background:#ffffff10;border-radius:9px;padding:5px 9px;color:#fff;font-size:12.5px;line-height:1.3;animation:wncm .35s cubic-bezier(.2,.9,.3,1);display:flex;align-items:center;gap:6px}
.mg-webnovel1 .wn-cm b{font-size:10.5px;color:#9fd8ff;font-weight:800;white-space:nowrap}
.mg-webnovel1 .wn-cm span{flex:1}
.mg-webnovel1 .wn-cm small{font-size:10px;color:#ff8fc8;font-weight:800;white-space:nowrap}
.mg-webnovel1 .wn-cm.best{background:linear-gradient(90deg,#1f6fd0aa,#5fb8ff55);box-shadow:inset 0 0 0 1px #9fd8ff}
.mg-webnovel1 .wn-cm.best b::before{content:"베댓 ";color:#ffd166}
.mg-webnovel1 .wn-cm.meh{background:#ff5a6a22}
@keyframes wnin{from{opacity:0;transform:scale(.8)}}
@keyframes wnhit{0%{transform:scale(1.08);filter:brightness(1.3)}100%{transform:translateY(-60px) scale(.5);opacity:0}}
@keyframes wnbad{0%{transform:translateX(-6px);background:#ffb0b8}25%{transform:translateX(6px)}50%{transform:translateX(-4px);opacity:1}100%{transform:translateY(30px) rotate(8deg);opacity:0}}
@keyframes wnnope{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes wnglow{to{box-shadow:0 0 0 3px #fff3b0,0 0 20px #ffd166,0 3px 0 #0007}}
@keyframes wnblink{50%{opacity:0}}
@keyframes wnbump{50%{transform:scale(1.25)}}
@keyframes wnpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes wnpulse{to{filter:brightness(1.15);box-shadow:0 5px 0 #0d3a80,0 0 0 4px #fff,0 0 44px #9fd8ff}}
@keyframes wntap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes wnban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-2deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(1deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@keyframes wnup{from{transform:translateY(40%);opacity:0}}
@keyframes wnst{from{opacity:0;transform:translateY(10px) scale(.8)}to{opacity:1;transform:none}}
@keyframes wncm{from{opacity:0;transform:translateY(18px)}}
@media (prefers-reduced-motion:reduce){.mg-webnovel1 .wn-ban.on{animation-duration:.01s}.mg-webnovel1 .wn-up.on,.mg-webnovel1 .wn-go,.mg-webnovel1 .wn-c.tw{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "webnovel1", "마감 5분 전", "wn-st");
    const GK = pick(Object.keys(GEN)), G = GEN[GK], OTH = Object.keys(GEN).filter((k) => k !== GK), EP = 30 + rint(90);
    const st = F.stage;
    st.style.setProperty("--gc", G.c);
    st.insertAdjacentHTML("beforeend", `<canvas class="wn-cv"></canvas><div class="wn-rc"><div class="wn-me"></div></div><canvas class="wn-cv wn-fr"></canvas>
      <div class="wn-gn"><i style="background-image:url(${iconURL(GK)})"></i><span>오늘 장르</span><b>${G.n}</b></div><div class="wn-say"></div>
      <div class="wn-pp"><div class="wn-ph"><b>${G.t}</b><span>${EP}화</span><em class="wn-cb"></em></div><div class="wn-tx"><p></p></div><div class="wn-pb"><i></i><u></u><span>0 / 5,000자</span></div></div>
      <div class="wn-ln"></div><div class="wn-hl">타자 라인 ▶</div><div class="wn-lid t"></div><div class="wn-lid b"></div><div class="wn-ban"></div>
      <button class="wn-up" aria-label="업로드"><b>업로드</b><small>자정! 지금 톡</small></button>
      <div class="wn-tut off"><div class="wn-tc"><em>리허설</em><p></p><div class="wn-tb"></div></div></div><div class="wn-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const cv = $(".wn-cv"), gB = cv.getContext("2d"), cvF = $(".wn-fr"), gF = cvF.getContext("2d");
    const meEl = $(".wn-me"), rcEl = $(".wn-rc"), sayEl = $(".wn-say"), pp = $(".wn-pp"), txP = $(".wn-tx p"), pb = $(".wn-pb"), pbI = $(".wn-pb i"), pbU = $(".wn-pb u"), pbS = $(".wn-pb span"), cbEl = $(".wn-cb");
    const lnEl = $(".wn-ln"), hlEl = $(".wn-hl"), lidT = $(".wn-lid.t"), lidB = $(".wn-lid.b"), ban = $(".wn-ban"), upBtn = $(".wn-up"), gnEl = $(".wn-gn");
    const tutEl = $(".wn-tut"), tutP = $(".wn-tc p"), tutB = $(".wn-tb"), hand = $(".wn-hand");
    tutEl.style.setProperty("--gd", G.c);

    // ── 크기: 논리 폭 112칸 안팎을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 540;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    for (const c of [cv, cvF]) { c.width = LW; c.height = LH; c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    const RH = Math.round(LH * 0.35), roomH = RH * K, deskY = RH - 12, cx = LW >> 1;
    const ppTop = roomH + 4, ppH = Math.round(sh * 0.18), laneTop = ppTop + ppH + 6;
    const KBR = 3, kbH = (KBR * 6 + 3) * K, kbTop = sh - kbH, hitY = kbTop - Math.round(sh * 0.075);
    const laneH = kbTop - laneTop, hy = hitY - laneTop, lw = (sw - 12) / 3, cw = Math.floor(lw - 6), PERF = 24;
    Object.assign(pp.style, { top: ppTop + "px", height: ppH + "px" });
    Object.assign(lnEl.style, { top: laneTop + "px", height: laneH + "px" });
    lnEl.style.setProperty("--cw", cw + "px");
    hlEl.style.top = hitY - 3 + "px";
    rcEl.style.height = roomH + "px";
    ban.style.top = laneTop + laneH * 0.3 + "px";
    upBtn.style.top = ppTop + ppH / 2 + "px";
    tutEl.style.top = ppTop - 2 + "px";
    F.root.querySelector(".mg-msg").style.top = laneTop + 6 + "px";

    // 내 캐릭터 그림(3x2 표정 시트, 칸 240x540 중 위쪽 312만). 노트북 뒤에 앉은 앞모습.
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    const lidW = 52, lidH = 24, lidX = cx - (lidW >> 1), lidY = deskY - lidH + 3;
    {
      const headTop = RH * 0.1, s = ((lidY + 7 - headTop) * K) / 160, w = Math.round(240 * s), h = Math.round(312 * s);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(cx * K - w / 2) + "px", top: Math.round(headTop * K - 18 * s) + "px" });
      sayEl.style.top = Math.max(30, Math.round(headTop * K - 4)) + "px"; sayEl.style.left = Math.round(cx * K + w * 0.18) + "px";
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = "";

    // ── 배경(한 번만): 밤 방 벽·창문·책장·포스트잇 / 아래 조각 길·키보드 ──
    const BG = document.createElement("canvas"); BG.width = LW; BG.height = LH;
    const wins = [], stars = [], keys = [];
    const lt = Math.floor(laneTop / K), kt = Math.floor(kbTop / K), hl = Math.round(hitY / K);
    const winX = 5, winY = 7, winW = 18, winH = deskY - 18;
    const shX = LW - 27, shW = 24;
    {
      const b = BG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      for (let y = 0; y < RH; y++) { const t = y / RH; P(0, y, LW, 1, `rgb(${Math.round(26 + t * 18)},${Math.round(24 + t * 14)},${Math.round(48 + t * 18)})`); }
      for (let y = 3; y < deskY; y += 6) for (let x = (y / 6) % 2 ? 4 : 1; x < LW; x += 6) P(x, y, 1, 1, "#ffffff0c");
      P(0, deskY - 3, LW, 1, "#00000030");
      // 창문(밤 도시 + 달)
      P(winX - 2, winY - 2, winW + 4, winH + 4, "#5a4a3e"); P(winX - 1, winY - 1, winW + 2, winH + 2, "#3a2e26");
      for (let y = 0; y < winH; y++) { const t = y / winH; P(winX, winY + y, winW, 1, `rgb(${Math.round(10 + t * 30)},${Math.round(14 + t * 20)},${Math.round(40 + t * 34)})`); }
      P(winX + 17, winY + 3, 6, 6, "#fff3c0"); P(winX + 19, winY + 2, 5, 5, "rgb(12,16,44)"); // 초승달
      for (let i = 0; i < 7; i++) stars.push([winX + 1 + rint(winW - 2), winY + 1 + rint(Math.max(2, winH / 2))]);
      let bx = winX; while (bx < winX + winW) { const bw = 3 + rint(4), bh = 5 + rint(Math.max(4, winH - 12)); const w2 = Math.min(bw, winX + winW - bx); P(bx, winY + winH - bh, w2, bh, "#141a32"); for (let yy = winY + winH - bh + 2; yy < winY + winH - 1; yy += 3) for (let xx = bx + 1; xx < bx + w2 - 1; xx += 2) if (rnd() < 0.45) wins.push([xx, yy]); bx += bw + (rnd() < 0.3 ? 1 : 0); }
      P(winX + (winW >> 1), winY, 1, winH, "#3a2e26"); P(winX, winY + (winH >> 1), winW, 1, "#3a2e2688");
      P(winX - 4, winY - 3, 4, winH + 8, "#4a5a8a"); P(winX + winW, winY - 3, 4, winH + 8, "#4a5a8a"); P(winX - 4, winY - 4, winW + 8, 2, "#6a6a7a");
      for (let y = winY - 3; y < winY + winH + 5; y += 3) { P(winX - 3, y, 1, 2, "#3a4a7a"); P(winX + winW + 2, y, 1, 2, "#3a4a7a"); }
      // 포스트잇: 5000 / 체력
      const ps = (x, y, col, f) => { P(x + 1, y + 1, 16, 10, "#0004"); P(x, y, 16, 10, col); P(x, y, 16, 2, tint(col, 0.88)); f(x, y); };
      ps(winX + winW + 5, 6, "#ffe27a", (x, y) => { [5, 0, 0, 0].forEach((n, i) => [...DIG[n]].forEach((v, k) => v === "1" && P(x + 1 + i * 4 + (k % 3), y + 3 + Math.floor(k / 3), 1, 1, "#d0303a"))); });
      ps(winX + winW + 4, 20, "#ff9ec8", (x, y) => { P(x + 2, y + 4, 12, 1, "#7a3a5a"); P(x + 2, y + 7, 9, 1, "#7a3a5a"); P(x + 13, y + 6, 2, 2, "#d0303a"); });
      // 책장(오른쪽): 내 책들
      for (const [k, sy] of [[0, 14], [1, Math.min(deskY - 6, 30)]]) {
        P(shX, sy, shW, 2, "#8a5a3a"); P(shX, sy + 2, shW, 1, "#4a2e1e");
        let x = shX + 1; const cols = ["#5fb8ff", "#ff8fc8", "#ffb03b", "#b89cff", "#7fe0a8", "#e05a5a", "#e6e6e6", "#4a6aa0"];
        while (x < shX + shW - 2) { const h = 6 + rint(4), w2 = 2 + rint(2), c = pick(cols); if (k === 1 && x > shX + shW - 9) break; P(x, sy - h, w2, h, c); P(x, sy - h, w2, 1, tint(c, 1.25)); P(x, sy - h + 2, w2, 1, tint(c, 0.7)); x += w2; }
        if (k === 1) { const tx = shX + shW - 7; P(tx, sy - 5, 6, 5, "#ffd166"); P(tx + 1, sy - 7, 4, 2, "#ffd166"); P(tx + 2, sy - 9, 2, 2, "#fff3b0"); P(tx, sy - 1, 6, 1, "#c9961c"); }
      }
      // 조각 길(어두운 원고 흐름)
      for (let y = lt; y < kt; y++) { const t = (y - lt) / Math.max(1, kt - lt); P(0, y, LW, 1, `rgb(${Math.round(16 + t * 10)},${Math.round(14 + t * 10)},${Math.round(30 + t * 16)})`); }
      for (let l = 1; l < 3; l++) { const x = Math.round((6 + lw * l) / K); for (let y = lt; y < kt; y += 3) P(x, y, 1, 1, "#ffffff18"); }
      for (let y = lt + 4; y < kt; y += 9) for (let x = (y % 2) * 3 + 2; x < LW; x += 11) P(x, y, 1, 1, "#9fd8ff10");
      // 키보드
      P(0, kt, LW, LH - kt, "#2a2838"); P(0, kt, LW, 1, "#5a5870"); P(0, kt + 1, LW, 1, "#3a3848");
      const kw = 6, cols = Math.floor((LW - 3) / (kw + 1)), ox = Math.floor((LW - cols * (kw + 1) + 1) / 2);
      for (let r = 0; r < KBR; r++) for (let i = 0; i < cols; i++) {
        let x = ox + i * (kw + 1) + (r === 1 ? 2 : r === 2 ? 4 : 0), w = kw; const y = kt + 3 + r * 6;
        if (r === 2 && i >= cols - 1) continue;
        if (r === 0 && i === cols - 1) { w = kw; } // 백스페이스(오른쪽 위)
        if (x + w > LW - 1) continue;
        P(x, y, w, 5, "#4a4860"); P(x, y, w, 1, "#6a6884"); P(x, y + 4, w, 1, "#34324a");
        keys.push({ x, y, w, bs: r === 0 && i === cols - 1, t: 0 });
      }
    }
    // 앞쪽 고정(책상·노트북 뒷면·스탠드)
    const FG = document.createElement("canvas"); FG.width = LW; FG.height = LH;
    const mugX = lidX - 12, clkX = lidX + lidW + 4, clkY = deskY - 9, lampX = 1;
    {
      const b = FG.getContext("2d"), P = (x, y, w, h, c) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      P(0, deskY, LW, RH - deskY, "#7a4e32"); P(0, deskY, LW, 1, "#a8744c"); P(0, deskY + 1, LW, 1, "#8e5c3c");
      for (let y = deskY + 3; y < RH; y += 3) for (let x = (y * 7) % 13; x < LW; x += 19) P(x, y, 7, 1, "#6e442c");
      P(0, RH - 1, LW, 1, "#3a2216");
      // 노트북 뒷면
      P(lidX - 1, lidY - 1, lidW + 2, lidH + 2, "#9fd8ff55");
      P(lidX, lidY, lidW, lidH, "#b8bcc8"); P(lidX, lidY, lidW, 1, "#e0e4ee"); P(lidX + 1, lidY + 1, lidW - 2, 1, "#cfd3dd"); P(lidX + lidW - 1, lidY, 1, lidH, "#8a8e9c"); P(lidX, lidY + lidH - 1, lidW, 1, "#8a8e9c");
      P(lidX - 3, lidY + lidH, lidW + 6, 2, "#7a7e8c"); P(lidX - 3, lidY + lidH + 2, lidW + 6, 1, "#0004");
      // 스티커: 펜촉 로고, 별, 원고지
      const lx = cx - 3, ly = lidY + 7; P(lx, ly, 7, 8, "#f4f6fa"); P(lx + 1, ly + 1, 5, 6, "#1f6fd0"); P(lx + 3, ly + 2, 1, 4, "#fff"); P(lx + 2, ly + 6, 3, 1, "#9fd8ff");
      P(lidX + 5, lidY + 4, 5, 5, "#ffd166"); P(lidX + 6, lidY + 5, 3, 3, "#fff3b0"); P(lidX + 7, lidY + 3, 1, 7, "#ffd166"); P(lidX + 4, lidY + 6, 7, 1, "#ffd166");
      P(lidX + lidW - 12, lidY + 13, 8, 7, "#ff8fc8"); P(lidX + lidW - 11, lidY + 14, 6, 1, "#fff"); P(lidX + lidW - 11, lidY + 16, 4, 1, "#fff");
      // 스탠드(왼쪽)
      P(lampX, deskY + 1, 10, 3, "#2f3a4a"); P(lampX, deskY + 1, 10, 1, "#4a5a6e");
      for (let i = 0; i < 13; i++) P(lampX + 4 + Math.round(i * 0.25), deskY - i, 2, 1, "#5a6a80");
      for (let i = 0; i < 6; i++) P(lampX + 7 + i, deskY - 13 + Math.round(i * 0.5), 1, 1, "#5a6a80");
      const sx = lampX + 11, sy = deskY - 13; P(sx + 1, sy - 1, 4, 1, "#3f8a5a"); P(sx, sy, 6, 1, "#2f7a4a"); P(sx - 1, sy + 1, 8, 1, "#2f6a4a"); P(sx - 2, sy + 2, 10, 2, "#25583c"); P(sx - 1, sy + 4, 8, 1, "#fff3c0"); P(sx + 1, sy, 1, 2, "#6fbf8a");
      // 책 더미(오른쪽 끝)
      const bx = LW - 14; [["#5fb8ff", 0], ["#ffb03b", 3], ["#e05a5a", 6]].forEach(([c, d]) => { P(bx - (d % 2), deskY + 2 - d, 12, 3, c); P(bx - (d % 2), deskY + 2 - d, 12, 1, tint(c, 1.25)); P(bx + 10 - (d % 2), deskY + 2 - d, 2, 3, "#f2ead8"); });
    }

    // ── 상태 ── tut: 0 대기 / 1 같은 장르 톡 / 2 다른 장르·오타 흘려보내기 / 3 커피 / 4 시작 카드 / -1 본게임
    let tut = 0, tutT = 0, tm = 0;
    let over = false, done = false, raf = 0, last = 0, el = 0, started = false;
    let chars = 0, queue = [], typeBud = 0, bs = 0, combo = 0, maxCombo = 0, right = 0, wrong = 0, missed = 0, passOk = 0, wrongG = 0, wrongGK = "", typoW = 0, distW = 0, cofOk = 0, twistOk = 0;
    let drowsy = 0, buff = 0, nextAt = 0.6, lastCof = -9, goalHit = false, spurt = false, chance = false, sayT = 0, lastSay = 0, blinkT = 3;
    let upState = 0, upT = 0, upTime = 9, late = false, finalScore = 0;
    let text = `[${EP}화] ${G.op}\n`;
    const cofAt = [6.5, 14, 21.5];
    const pieces = [], zz = [], fx = [], conf = [];
    const cs = { happy: 0, shock: 0, angry: 0, blush: 0 };
    const decks = {}; const deal = (k, pool) => { if (!decks[k] || !decks[k].length) decks[k] = shuffle(pool.slice()); return decks[k].pop(); };

    // ── 소리 ──
    const keySnd = () => { noise(0.018, 2400 + rnd() * 1800, 0.035, 0, 3); };
    const bsSnd = () => { noise(0.03, 900, 0.05, 0, 2); tone(220, 0.04, "square", 0.03); };
    const perfSnd = () => { tone(1568, 0.05, "square", 0.05); tone(2093, 0.09, "triangle", 0.06, 0, 0.04); };
    const sipSnd = () => { noise(0.25, 700, 0.06, 0, 1.5); tone(520, 0.12, "sine", 0.06, 780, 0.22); [784, 988, 1318].forEach((f, i) => tone(f, 0.08, "triangle", 0.07, 0, 0.35 + i * 0.06)); };
    const yawnSnd = () => { tone(380, 0.5, "sine", 0.06, 200); };
    const chime = () => { [[1318, 0], [1046, 0.35], [1175, 0.7], [784, 1.05]].forEach(([f, at]) => { tone(f, 0.6, "triangle", 0.09, 0, at); tone(f * 2, 0.3, "sine", 0.025, 0, at); }); };
    const fanfare = () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.06, 0, i * 0.07)); };
    const upSnd = () => { tone(400, 0.6, "sawtooth", 0.05, 1600); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, "triangle", 0.08, 0, 0.6 + i * 0.08)); noise(0.2, 6000, 0.06, 0.6, 2); };

    // ── 화면 글자 ──
    const say = (t, cls = "", sec = 1.4) => { sayEl.textContent = t; sayEl.className = "wn-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; lastSay = el; };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "wn-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    let shownC = -1;
    const updC = () => {
      const c = Math.round(chars); if (c === shownC) return; shownC = c;
      const x = Math.max(0, c - GOAL);
      pbI.style.setProperty("--w", clamp(c / GOAL, 0, 1) * 100 + "%"); pbU.style.setProperty("--x", clamp(x / 2000, 0, 1) * 100 + "%");
      pb.classList.toggle("full", c >= GOAL);
      pbS.textContent = c >= GOAL ? `5,000자 달성 · 비축분 +${fmt(x)}자` : `${fmt(c)} / 5,000자`;
      F.sc.textContent = `${fmt(c)}자`;
    };
    let shownTx = "";
    const updTx = () => { const s = text.length > 150 ? "…" + text.slice(-150) : text; if (s !== shownTx) { shownTx = s; txP.textContent = s; txP.appendChild(cur); } };
    const cur = document.createElement("i"); cur.className = "wn-cur";
    const updCombo = () => { if (combo >= 3) { cbEl.textContent = `콤보 ${combo} · 타자 ${Math.round(14 + Math.min(combo, 15) * 2.6)}타/초`; cbEl.classList.add("on"); cbEl.classList.remove("bump"); void cbEl.offsetWidth; cbEl.classList.add("bump"); } else cbEl.classList.remove("on"); };

    // ── 조각 ──
    const center = (p) => [6 + p.lane * lw + cw / 2 + 3, laneTop + p.y + p.h / 2];
    const TAGS = { good: "톡", off: "패스", typo: "오타 패스", dist: "딴짓 패스", cof: "톡!" };
    const addPiece = (kind, lane, o = {}) => {
      const gk = kind === "off" ? o.g || pick(OTH) : GK, gd = GEN[gk];
      let type = o.type, txt = o.txt;
      if (kind === "good" || kind === "off") { type = type || (o.tw ? "반전" : rnd() < 0.1 ? "반전" : rnd() < 0.5 ? "대사" : "묘사"); txt = txt || deal(gk + type, type === "대사" ? gd.line : type === "묘사" ? gd.desc : gd.twist); }
      else if (kind === "typo") { type = "오타?"; txt = txt || deal(gk + "typo", gd.typo); type = txt.startsWith("“") ? "대사" : "묘사"; }
      else if (kind === "dist") { type = "딴짓"; txt = txt || deal("dist", DIST); }
      else { type = "커피"; txt = txt || pick(COF); }
      const ic = kind === "dist" ? "dist" : kind === "cof" ? "cof" : gk;
      const e = document.createElement("div"); e.className = "wn-p";
      const html = txt.replace(/\{([^}]*)\}/g, "<s>$1</s>");
      e.innerHTML = `<div class="wn-c k-${kind}${o.tw ? " tw" : ""}" style="--gc:${kind === "dist" ? "#8a7ab0" : kind === "cof" ? "#ffd166" : gd.c}"><div class="r"><i style="background-image:url(${iconURL(ic)})"></i><em>${o.tw ? "반전 찬스" : type}</em><u>${TAGS[kind]}</u></div><div>${html}</div></div>`;
      lnEl.appendChild(e);
      const p = { el: e, c: e.firstChild, kind, g: gk, type, txt: plain(txt), lane, y: 0, h: e.offsetHeight || 46, gone: false, judged: false, hold: !!o.hold, tut: !!o.tut, tw: !!o.tw, born: el };
      p.y = -p.h - 2; e._p = p; place(p); pieces.push(p);
      return p;
    };
    const place = (p) => { p.el.style.transform = `translate(${Math.round(6 + p.lane * lw + 3)}px,${Math.round(p.y)}px)`; };
    const kill = (p, cls, ms = 420) => { p.gone = true; p.judged = true; if (cls) p.c.classList.add(cls); setTimeout(() => p.el.remove(), ms); };
    const freeLane = () => { const ok = [0, 1, 2].filter((l) => !pieces.some((p) => !p.gone && p.lane === l && p.y < p.h + 12)); return ok.length ? pick(ok) : -1; };
    // 원고에 글 넣기(글자마다 점수를 나눠 싣는다)
    const pushText = (s, gain) => { const arr = [...(s + " ")]; const per = gain / arr.length; arr.forEach((ch) => queue.push([ch, per])); if (rnd() < 0.3) queue.push(["\n", 0]); };
    const backspace = (n, pen) => { bs += n; chars = Math.max(0, chars - pen); updC(); };

    const tapP = (p) => {
      if (!p || p.gone || p.judged || over) return;
      if (tut >= 0) {
        if (!p.tut) return;
        if (tut === 2) { F.msg("그건 톡 말고 흘려보내요!"); SFX.tok(); p.c.classList.remove("nope"); void p.c.offsetWidth; p.c.classList.add("nope"); return; }
      }
      const c = center(p), dd = Math.abs(c[1] - hitY), perfect = dd < PERF, early = dd > 72 && c[1] < hitY;
      if (p.kind === "good") {
        if (!early) combo++; maxCombo = Math.max(maxCombo, combo); right++; if (p.type === "반전") twistOk++;
        const base = p.tw ? 600 : GAIN[p.type] || 130;
        const gain = Math.round(base * (perfect ? 1.35 : early ? 0.45 : 1) * (1 + Math.min(combo, 12) * 0.05) * (drowsy >= 60 ? 0.6 : 1) * (buff > 0 ? 1.2 : 1));
        pushText(p.txt, gain);
        F.burst(c, p.tw ? "#ffd166" : G.c, perfect ? 14 : 8); F.float(c, perfect ? `완벽! +${gain}` : early ? `성급! +${gain}` : `+${gain}`); if (early && rnd() < 0.5) F.msg("너무 일찍! 타자 라인에서 톡 해야 많이 써져요");
        SFX.ding(Math.min(combo - 1, 12)); if (perfect) perfSnd(); vib(perfect ? 15 : 8);
        if (p.tw) { fanfare(); vib([20, 30, 20]); cs.happy = 1.6; say("이 반전, 독자들 뒤집어진다!", "gd", 1.6); for (let i = 0; i < 30; i++) conf.push({ x: rnd() * LW, y: -rnd() * 10, vy: 18 + rnd() * 20, vx: (rnd() - 0.5) * 10, c: pick(["#ffd166", G.c, "#fff", "#ff8fc8"]), t: rint(4) }); }
        else if (combo > 0 && combo % 6 === 0) { cs.happy = 1.2; say(pick(["손이 풀린다!", "오늘 필 받았다", "문장이 술술~", "이게 작가지!"]), "", 1.2); }
        kill(p, "hit", 400); updCombo();
      } else if (p.kind === "cof") {
        cofOk++; drowsy = 0; buff = 3.5; sipSnd(); vib([10, 30, 10]); F.burst(c, "#ffd166", 12); F.float(c, "졸음 싹!");
        cs.happy = 1.4; say(pick(["살았다…!", "카페인 충전 완료", "아직 쓸 수 있어!"]), "gd", 1.3);
        kill(p, "hit", 400);
      } else {
        combo = 0; wrong++; updCombo(); F.miss(c);
        if (p.kind === "off") { wrongG++; wrongGK = p.g; backspace(10, 220); F.float(c, "-220자", "bad"); F.msg(`장르 이탈! 오늘은 ${G.n}이에요`); cs.angry = 1.2; say(pick(["어? 이건 다른 작품인데…", "장르가 섞였다!"]), "", 1.2); }
        else if (p.kind === "typo") { typoW++; backspace(8, 180); F.float(c, "오타! -180자", "bad"); F.msg("빨간 밑줄은 오타예요. 흘려보내요"); cs.shock = 1; }
        else { distW++; drowsy = Math.min(100, drowsy + 30); F.msg("딴짓하다 졸음이 몰려와요…"); yawnSnd(); cs.shock = 0.6; say(pick(["딱 한 편만… 어?", "앗 시간이…!"]), "sl", 1.2); }
        kill(p, "bad", 460);
      }
      if (tut === 1 && p.tut) tutNext(2);
      else if (tut === 3 && p.tut) tutNext(4);
    };
    lnEl.addEventListener("pointerdown", (e) => { const t = e.target.closest(".wn-p"); if (!t || !t._p) return; e.preventDefault(); tapP(t._p); });

    // ── 그리기 ──
    let g = gB; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const digit = (n, x, y, c) => [...DIG[n]].forEach((v, i) => v === "1" && P(x + (i % 3), y + Math.floor(i / 3), 1, 1, c));
    const ZP = ["XXX", "..X", ".X.", "X..", "XXX"];
    const render = () => {
      g = gB; g.drawImage(BG, 0, 0);
      // 창문 불빛·별
      wins.forEach(([x, y], i) => { if (Math.sin(tm * 0.6 + i * 2.1) > -0.5 - (over ? 0.4 : 0)) P(x, y, 1, 1, i % 3 ? "#ffd56a" : "#ffeebb"); });
      stars.forEach(([x, y], i) => { if (Math.sin(tm * 2 + i * 1.7) > 0) P(x, y, 1, 1, "#fff8"); });
      // 스탠드 불빛(벽에 둥글게)
      g.globalCompositeOperation = "lighter";
      const lg = g.createRadialGradient(lampX + 14, deskY - 8, 2, lampX + 14, deskY - 2, 26); lg.addColorStop(0, "rgba(255,220,150,.28)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, 0, 50, RH);
      g.globalCompositeOperation = "source-over";
      // 타자 라인
      const flash = fx.length ? 0.5 : 0;
      g.globalAlpha = 0.16; P(0, hl - Math.round(PERF / K), LW, Math.round((PERF * 2) / K), G.c); g.globalAlpha = 0.75 + flash * 0.5; P(0, hl, LW, 1, G.c); g.globalAlpha = 0.35; P(0, hl - 1, LW, 1, G.c); P(0, hl + 1, LW, 1, G.c); g.globalAlpha = 1;
      for (let x = (Math.floor(tm * 20) % 8); x < LW; x += 8) P(x, hl, 2, 1, "#ffffffaa");
      // 키보드 불빛
      keys.forEach((k) => { if (k.t > 0) { P(k.x, k.y, k.w, 5, k.bs ? "#ff7a8a" : G.c); P(k.x, k.y, k.w, 1, "#fff"); } });
      g = gF; g.clearRect(0, 0, LW, LH);
      // 모니터 빛이 얼굴에 비침
      const sg = g.createRadialGradient(cx, lidY - 6, 2, cx, lidY - 6, 26); sg.addColorStop(0, `rgba(140,200,255,${0.13 + (queue.length ? 0.05 * Math.sin(tm * 30) : 0)})`); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(cx - 30, 0, 60, deskY);
      g.drawImage(FG, 0, 0);
      // 노트북 위 화면 새는 빛
      g.globalAlpha = 0.5 + 0.2 * Math.sin(tm * 3); P(lidX + 2, lidY - 1, lidW - 4, 1, "#9fd8ff"); g.globalAlpha = 1;
      // 머그컵 + 김
      const my = deskY - 8; P(mugX, my, 8, 9, "#f2f2f6"); P(mugX, my, 8, 1, "#fff"); P(mugX + 8, my + 2, 2, 1, "#f2f2f6"); P(mugX + 9, my + 2, 1, 4, "#f2f2f6"); P(mugX + 8, my + 5, 2, 1, "#f2f2f6");
      P(mugX + 1, my + 1, 6, 1, buff > 0 ? "#6a3a1e" : "#3a2216"); P(mugX + 2, my + 4, 4, 3, G.c); P(mugX, my + 9, 10, 1, "#0004");
      const wisps = buff > 0 ? 3 : 2;
      for (let i = 0; i < wisps; i++) { const ph = (tm * 0.7 + i / wisps) % 1; g.globalAlpha = 0.55 * (1 - ph); P(mugX + 3 + Math.round(Math.sin((tm + i) * 3) * 1.5), my - 2 - Math.round(ph * 9), 1, 2, "#fff"); } g.globalAlpha = 1;
      // 탁상시계(빨간 숫자): 23:55 → 00:00
      P(clkX - 1, clkY - 1, 21, 11, "#14101c"); P(clkX, clkY, 19, 9, "#06040a"); P(clkX - 1, clkY + 10, 21, 1, "#0006");
      const mins = over ? 60 : tut >= 0 ? 55 : 55 + Math.min(4, Math.floor(el / 6));
      const hh = mins >= 60 ? [0, 0] : [2, 3], mm = mins >= 60 ? [0, 0] : [Math.floor(mins / 10), mins % 10];
      const hot = (!over && tut < 0 && el > T - 5) || over, on = !hot || Math.floor(tm * 4) % 2 === 0, dc = hot ? "#ff3b4f" : "#ff6a6a";
      if (on) { digit(hh[0], clkX + 1, clkY + 2, dc); digit(hh[1], clkX + 5, clkY + 2, dc); digit(mm[0], clkX + 11, clkY + 2, dc); digit(mm[1], clkX + 15, clkY + 2, dc); }
      if (Math.floor(tm * 2) % 2 === 0) { P(clkX + 9, clkY + 3, 1, 1, dc); P(clkX + 9, clkY + 5, 1, 1, dc); }
      // 졸음 Zzz
      zz.forEach((z) => { g.globalAlpha = clamp(z.life, 0, 1); const s = z.big ? 2 : 1; ZP.forEach((r, j) => [...r].forEach((ch, i) => ch === "X" && P(Math.round(z.x) + i * s, Math.round(z.y) + j * s, s, s, "#c8c0ff"))); }); g.globalAlpha = 1;
      // 색종이
      conf.forEach((c) => P(Math.round(c.x), Math.round(c.y), 1, c.t % 2 ? 2 : 1, c.c));
      // 가장자리 어둡게(방)
      const vg = g.createLinearGradient(0, 0, 0, RH); vg.addColorStop(0, "rgba(5,3,14,.35)"); vg.addColorStop(0.3, "rgba(0,0,0,0)"); g.fillStyle = vg; g.fillRect(0, 0, LW, RH);
    };

    // ── 나(표정·몸짓) ──
    const meTick = () => {
      if (!art) return;
      const sleepy = drowsy >= 60;
      const ex = cs.shock > 0 ? "surprised" : cs.angry > 0 ? "angry" : cs.blush > 0 ? "blush" : cs.happy > 0 ? "smile" : sleepy ? "sad" : combo >= 5 ? "smile" : "neutral";
      if (ex !== meX) { meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; }
      let tf;
      if (cs.shock > 0) tf = `translateX(${Math.floor(tm * 30) % 2 ? 2 : -2}px)`;
      else if (cs.happy > 0 && (combo >= 6 || cofOk)) tf = `translateY(${-Math.round(Math.abs(Math.sin(tm * 9)) * 4)}px)`;
      else if (sleepy) tf = `translateY(${4 + Math.round((Math.sin(tm * 1.8) + 1) * 3)}px) rotate(${(Math.sin(tm * 0.9) * 4).toFixed(1)}deg)`;
      else if (queue.length) tf = `translateY(${Math.floor(tm * 12) % 2 ? -1 : 0}px)`;
      else tf = `translateY(${(Math.sin(tm * 1.5) * 1).toFixed(1)}px)`;
      if (tf !== meT) { meT = tf; meEl.style.transform = tf; }
      meEl.classList.toggle("sl", sleepy);
    };
    // 눈꺼풀: 졸음 35부터 내려오기 시작, 졸릴 땐 가끔 깜빡 감김
    const lidTick = (dt) => {
      blinkT -= dt; let k = clamp((drowsy - 35) / 65, 0, 1) * 0.36;
      if (drowsy >= 60 && blinkT < 0.18 && blinkT > 0) k = Math.max(k, 0.42);
      if (blinkT <= 0) blinkT = drowsy >= 60 ? 1.6 + rnd() * 1.4 : 3 + rnd() * 2;
      if (over) k = 0;
      lidT.style.setProperty("--lh", (k * 100).toFixed(1) + "%"); lidB.style.setProperty("--lh", (k * 45).toFixed(1) + "%");
    };

    // ── 흐름 ──
    const spawn = () => {
      const lane = freeLane(); if (lane < 0) return false;
      const prog = el / T;
      if (!chance && el >= 14.5) { chance = true; banner("반전 찬스!<small>금색 반전 조각을 놓치지 마요</small>", "gd"); tone(988, 0.1, "square", 0.07); tone(1318, 0.18, "square", 0.07, 0, 0.1); addPiece("good", 1, { tw: true, type: "반전" }); return true; }
      const needCof = (cofAt.length && el >= cofAt[0]) || (drowsy > 72 && el - lastCof > 3.5 && !pieces.some((p) => !p.gone && p.kind === "cof"));
      if (needCof) { if (cofAt.length && el >= cofAt[0]) cofAt.shift(); lastCof = el; addPiece("cof", lane); return true; }
      const r = rnd();
      if (r < 0.54) addPiece("good", lane);
      else if (r < 0.76) addPiece("off", lane);
      else if (r < 0.9 || prog < 0.15) addPiece("typo", lane);
      else addPiece("dist", lane);
      return true;
    };
    const speed = () => (laneH / (3.1 * ez)) * (1 + 0.3 * clamp(el / T, 0, 1)) * (spurt ? 1.2 : 1);
    const moveAll = (dt) => {
      const v = tut >= 0 ? (laneH / 3.6) : speed();
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        if (p.gone) { pieces.splice(i, 1); continue; }
        if (p.hold && p.y + p.h / 2 >= hy) p.y = hy - p.h / 2; else p.y += v * dt;
        place(p);
        const cy = p.y + p.h / 2;
        if (!p.judged && cy > hy + PERF + 4) {
          p.judged = true;
          if (tut >= 0) { p.c.classList.add("pass"); }
          else if (p.kind === "good") { missed++; combo = 0; updCombo(); p.c.classList.add("late"); F.float(center(p), "놓침", "bad"); tone(240, 0.08, "square", 0.04); }
          else if (p.kind === "off" || p.kind === "typo" || p.kind === "dist") { passOk++; p.c.classList.add("pass"); if (rnd() < 0.6) F.float([center(p)[0], hitY + 14], "패스"); tone(660, 0.04, "sine", 0.03); }
          else p.c.classList.add("pass");
        }
        if (p.y > laneH + 4) { p.gone = true; p.el.remove(); pieces.splice(i, 1); if (tut === 2 && p.tut) tutCheck2(); }
      }
    };
    // 타자: 콤보가 길수록 빨라진다
    const typeTick = (dt) => {
      const cps = over ? 260 : 14 + Math.min(combo, 15) * 2.6 + (buff > 0 ? 6 : 0);
      if (bs > 0) { typeBud += dt * 40; while (typeBud >= 1 && bs > 0) { typeBud--; bs--; if (text.length > 12) text = text.slice(0, -1); bsSnd(); const k = keys.find((x) => x.bs); if (k) k.t = 0.12; } }
      else if (queue.length) {
        typeBud += dt * cps; let n = 0;
        while (typeBud >= 1 && queue.length) { typeBud--; const [ch, gg] = queue.shift(); text += ch; chars += gg; n++; if (ch !== " " && ch !== "\n") { const k = keys[rint(keys.length)]; if (k && !k.bs) k.t = 0.1; } }
        if (n && (!over || rnd() < 0.3)) keySnd();
        if (text.length > 400) text = text.slice(-200);
        updC();
        if (!goalHit && chars >= GOAL && tut < 0) { goalHit = true; banner("5,000자 달성!<small>이제부터는 비축분</small>", "gd"); fanfare(); vib([20, 40, 20]); cs.happy = 1.8; say("오늘 분량 끝! 비축분 간다", "gd", 1.6); }
      } else typeBud = 0;
      updTx();
    };
    const common = (dt) => {
      for (const k in cs) if (cs[k] > 0) cs[k] -= dt;
      if (buff > 0) buff -= dt;
      keys.forEach((k) => { if (k.t > 0) k.t -= dt; });
      for (let i = fx.length - 1; i >= 0; i--) if ((fx[i] -= dt) <= 0) fx.splice(i, 1);
      if (drowsy > 45 && !over && rnd() < dt * (drowsy / 60)) zz.push({ x: cx + 8 + rnd() * 6, y: RH * 0.25, vx: 4 + rnd() * 4, vy: -6 - rnd() * 4, life: 1.6, big: drowsy > 75 && rnd() < 0.5 });
      for (let i = zz.length - 1; i >= 0; i--) { const z = zz[i]; z.x += z.vx * dt; z.y += z.vy * dt; z.life -= dt; if (z.life <= 0) zz.splice(i, 1); }
      for (let i = conf.length - 1; i >= 0; i--) { const c = conf[i]; c.y += c.vy * dt; c.x += c.vx * dt + Math.sin(tm * 6 + i) * 0.2; c.t = (c.t + 1) % 8; if (c.y > LH) conf.splice(i, 1); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      meTick(); lidTick(dt);
    };
    const gameTick = (dt) => {
      const prog = el / T;
      if (el > 8 && st.classList.contains("tags")) st.classList.remove("tags");
      if (el >= nextAt) { if (spawn()) nextAt = el + (0.8 - 0.26 * prog) * (spurt ? 0.85 : 1) * (0.85 + rnd() * 0.3); else nextAt = el + 0.12; }
      if (!spurt && el >= T - 5) { spurt = true; st.classList.add("spurt"); banner("막판 스퍼트!<small>자정까지 5초</small>", "rd"); tone(880, 0.1, "square", 0.07); tone(880, 0.1, "square", 0.07, 0, 0.18); }
      if (buff <= 0) drowsy = Math.min(100, drowsy + dt * (3.1 + 1.4 * prog));
      if (drowsy >= 60 && el - lastSay > 3.2) say(pick(["졸려…", "눈이 감긴다…", "5분만…", "커피…"]), "sl", 1.2);
      else if (el - lastSay > 5.5 && el > 2) say(pick(["오늘도 5,000자…", "연재는 체력이다", "독자님들 기다린다!", "자정까지 버티자"]), "", 1.3);
      moveAll(dt);
    };

    // ── 리허설 ──
    const handAt = (p) => {
      if (!p || p.gone) { hand.className = "wn-hand"; return; }
      const c = center(p); hand.style.left = Math.round(c[0] + 6) + "px"; hand.style.top = Math.round(c[1] + 4) + "px"; hand.className = "wn-hand on";
    };
    hand.style.backgroundImage = `url(${fingerURL()})`;
    const SKIP = `<button class="wn-skip" data-skip>건너뛰기</button>`;
    let tutPs = [];
    const tutCheck2 = () => { if (tut === 2 && tutPs.every((p) => p.gone || p.judged)) setTimeout(() => { if (tut === 2) tutNext(3); }, 350); };
    const tutNext = (n) => {
      tut = n; tutT = 0; tutPs = []; handAt(null); tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        st.classList.add("tags"); gnEl.classList.add("pop"); say("오늘 회차 쓰기 전에 리허설!", "", 1.8);
        tutP.innerHTML = `오늘 장르는 <b class="gc">${G.n}</b>! 같은 색 조각을<br><b class="bl">타자 라인</b>에 왔을 때 <b class="bl">톡</b> 해요`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut !== 1) return; tutPs = [addPiece("good", 1, { hold: true, tut: true, type: "대사" })]; }, 400);
      } else if (n === 2) {
        tutP.innerHTML = `잘했어요! <b class="rd">다른 장르</b>(색이 달라요)와<br><b class="rd">빨간 밑줄 오타</b>는 누르지 말고 흘려보내요`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut !== 2) return; tutPs = [addPiece("off", 0, { tut: true }), addPiece("typo", 2, { tut: true })]; tutPs[1].y -= 40; place(tutPs[1]); }, 500);
      } else if (n === 3) {
        drowsy = 70; yawnSnd(); say("하암… 졸려…", "sl", 1.6);
        tutP.innerHTML = `밤이 깊으면 <b>눈꺼풀</b>이 내려와요.<br><b class="br">커피 조각</b>을 톡 해서 잠을 깨요!`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut !== 3) return; tutPs = [addPiece("cof", 1, { hold: true, tut: true })]; }, 500);
      } else if (n === 4) {
        say("좋아, 이제 진짜 마감이다!", "gd", 1.6); cs.happy = 1.5;
        tutP.innerHTML = `준비 끝! <b class="bl">30초</b> 뒤면 자정이에요.<br>자정 종이 울리면 <b class="bl">업로드</b> 버튼을 바로 톡!`;
        tutB.innerHTML = `<button class="wn-go" data-go>집필 시작!</button>`;
      }
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; handAt(null); tutEl.classList.add("off");
      pieces.forEach((p) => { p.gone = true; p.el.remove(); }); pieces.length = 0;
      chars = 0; queue = []; bs = 0; combo = 0; maxCombo = 0; right = 0; wrong = 0; missed = 0; passOk = 0; wrongG = 0; typoW = 0; distW = 0; cofOk = 0; twistOk = 0;
      drowsy = 12; buff = 0; el = 0; nextAt = 0.7; lastCof = -9; lastSay = 0; shownC = -1; text = `[${EP}화] ${G.op}\n`;
      for (const k in cs) cs[k] = 0;
      st.classList.add("tags"); gnEl.classList.remove("pop"); void gnEl.offsetWidth; gnEl.classList.add("pop");
      updC(); updCombo(); started = true; SFX.go?.(); say("자정까지 5분! 가자!", "", 1.4);
      timer(T, F.bar, end);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });

    // ── 자정: 업로드 → 댓글 ──
    const end = () => {
      if (over) return; over = true; st.classList.remove("spurt", "tags");
      pieces.forEach((p) => { if (!p.gone) { p.judged = true; p.c.classList.add("fade"); } });
      chime(); vib([40, 60, 40]); banner("자정!<small>띵— 동— 00:00</small>"); cs.shock = 0.9; say("자정이다! 업로드!!", "gd", 1.6);
      setTimeout(() => { if (done || upState) return; upState = 1; upT = 0; upBtn.classList.add("on"); SFX.pop(); }, 750);
    };
    const doUpload = (auto = false) => {
      if (upState !== 1) return; upState = 2; upTime = auto ? 9 : upT; late = auto || upT > 1.6;
      upBtn.classList.remove("on"); upBtn.classList.add("on", "ing"); upBtn.style.setProperty("--p", "100%");
      upBtn.querySelector("small").textContent = "업로드 중…"; upSnd(); vib(20);
      // 남은 타자는 그대로 점수로 친다
      queue.forEach(([, gg]) => (chars += gg)); queue = []; updC();
      setTimeout(() => {
        if (done) return; upBtn.classList.add("done");
        banner(late ? "업로드 완료<small>조금 늦었지만 올렸어요</small>" : "칼업로드!<small>자정 정각 업로드 성공</small>", late ? "" : "gd");
        cs.blush = 6; for (let i = 0; i < 40; i++) conf.push({ x: rnd() * LW, y: -rnd() * 14, vy: 16 + rnd() * 22, vx: (rnd() - 0.5) * 12, c: pick(["#5fb8ff", "#ffd166", "#ff8fc8", "#fff", G.c]), t: rint(4) });
        fanfare(); setTimeout(comments, 700);
      }, 800);
      setTimeout(fin, 800 + 700 + 3900);
    };
    upBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); doUpload(false); });
    const nk = () => pick(NICK_A) + pick(NICK_B) + (rnd() < 0.4 ? "_" + (10 + rint(89)) : "");
    const scoreNow = () => {
      const vol = clamp(chars / GOAL, 0, 1), acc = right ? right / (right + wrong * 2 + missed * 0.5) : 0;
      const upS = upTime <= 1.6 ? 1 : upTime >= 9 ? 0.3 : clamp(1 - (upTime - 1.6) / 3.5, 0.3, 1);
      const bonus = clamp((chars - GOAL) / 2000, 0, 1) * 0.08;
      return { vol, acc, upS, score: clamp(0.62 * vol * (0.55 + 0.45 * acc) + 0.23 * acc + 0.15 * upS * clamp(vol + 0.3, 0, 1) + bonus, 0, 1) };
    };
    const comments = () => {
      if (done) return;
      const s = scoreNow(); finalScore = s.score;
      const views = Math.round(200 + s.vol * 7000 + s.acc * 3000 + (late ? 0 : 800)), cmt = Math.round(5 + s.score * 160), star = (6.2 + s.score * 3.7).toFixed(1);
      const ov = document.createElement("div"); ov.className = "wn-end"; ov.style.top = ppTop - 2 + "px";
      ov.innerHTML = `<div class="wn-eh"><i>노블리</i><b>${G.t}</b><span>${EP}화</span><em>업로드 완료</em></div>
        <div class="wn-es"><div><span>조회수</span><b data-k="0">0</b></div><div><span>별점</span><b data-k="1">0</b></div><div><span>댓글</span><b data-k="2">0</b></div></div><div class="wn-sum">오늘 <b>${fmt(chars)}자</b> ${chars >= GOAL ? `<em>· 비축분 +${fmt(chars - GOAL)}자</em>` : `<i>· 목표까지 ${fmt(GOAL - chars)}자 모자람</i>`}</div><div class="wn-cl"></div>`;
      st.appendChild(ov);
      const tg = [views, +star, cmt], bsE = ov.querySelectorAll("[data-k]"), t1 = performance.now();
      const cnt = () => { if (!ov.isConnected) return; const p = clamp((performance.now() - t1 - 200) / 1400, 0, 1), e = 1 - Math.pow(1 - p, 3); bsE.forEach((b, i) => (b.textContent = i === 1 ? (tg[1] * e).toFixed(1) : fmt(tg[i] * e))); if (p < 1) { if (rnd() < 0.4) SFX.tick(); requestAnimationFrame(cnt); } else { SFX.ding(4); vib(15); } };
      requestAnimationFrame(cnt);
      // 댓글 고르기: 칭찬·분량·오타·장르·업로드 시각
      const list = [];
      list.push([late ? pick(C_LATE) : pick(C_ON), late ? "meh" : ""]);
      if (s.vol < 0.75) { list.push([pick(C_MEH), "meh"]); if (s.vol < 0.45) list.push([pick(C_MEH.filter((x) => x !== list[list.length - 1][0])), "meh"]); }
      if (typoW) list.push([pick(C_TYPO), "meh"]);
      if (wrongG) list.push([`갑자기 ${GEN[wrongGK].n} 나옴?ㅋㅋ 장르 바뀐 줄`, "meh"]);
      if (twistOk) list.push([pick(C_TWIST), ""]);
      const gd = shuffle(C_GOOD.slice()); while (list.length < 7) list.push([gd.pop(), ""]);
      const order = shuffle(list.slice(1)); order.unshift(list[0]);
      const best = s.score >= 0.6 ? order.findIndex((x) => !x[1]) : -1;
      const cl = ov.querySelector(".wn-cl");
      order.forEach(([t, cls], i) => setTimeout(() => {
        if (done || !cl.isConnected) return;
        const e = document.createElement("div"); e.className = "wn-cm " + cls + (i === best ? " best" : "");
        e.innerHTML = `<b>${nk()}</b><span>${t}</span><small>♥ ${cls ? rint(9) : 3 + rint(Math.round(40 + s.score * 300))}</small>`;
        cl.appendChild(e); tone(1760 + rnd() * 500, 0.04, "sine", 0.04); if (i === best) { tone(1318, 0.1, "triangle", 0.07); }
        cs.blush = cls ? 0 : 1.5; if (cls) cs.shock = 0.5;
      }, 350 + i * 430));
    };
    const fin = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      const s = scoreNow();
      const line = `<b>${fmt(chars)}자</b> 업로드${chars >= GOAL ? ` · 비축분 +${fmt(chars - GOAL)}자` : ""} · 최고 콤보 ${maxCombo}${late ? " · 지각 업로드" : " · 칼업로드"}`;
      finish(s.score, line, "", [["분량", s.vol], ["장르 정확도", s.acc], ["업로드 타이밍", s.upS]]);
    };

    // ── 돌리기 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) { tut = 4; startGame(); } else tutNext(1); }
        if (tut === 1 || tut === 3) handAt(tutPs.find((p) => !p.gone && p.y + p.h / 2 >= hy - 30));
        if (tut >= 1 && tut <= 3) moveAll(dt);
      } else if (!over) { el += dt; gameTick(dt); }
      else if (upState === 1) { upT += dt; upBtn.querySelector("small").textContent = upT < 1.6 ? "자정! 지금 톡" : "얼른 톡!"; if (upT > 4.5) doUpload(true); }
      typeTick(dt); common(dt); render();
      raf = requestAnimationFrame(loop);
    };
    if (dbg) dbg.webnovel1 = {
      pieces, tap: tapP, up: () => doUpload(false),
      st: () => ({ tut, el: +el.toFixed(2), genre: G.n, chars: Math.round(chars), q: queue.length, combo, maxCombo, right, wrong, missed, passOk, drowsy: Math.round(drowsy), cofOk, up: upState, upTime: +upTime.toFixed(2), n: pieces.length, art, score: +finalScore.toFixed(3) }),
      tut: () => tut,
      tutDo: () => { if (tut === 1 || tut === 3) { const p = tutPs.find((x) => !x.gone); if (p) { p.y = hy - p.h / 2; tapP(p); } } else if (tut === 2) { tutPs.forEach((p) => { if (!p.gone) p.y += 120; }); } else if (tut === 4) startGame(); },
      start: startGame,
      auto: () => {
        if (upState === 1) return doUpload(false);
        if (tut >= 0 || over) return;
        const ok = pieces.filter((p) => !p.gone && !p.judged && (p.kind === "good" || (p.kind === "cof" && drowsy > 40)));
        const near = ok.filter((p) => Math.abs(p.y + p.h / 2 - hy) < PERF - 4).sort((a, b) => b.y - a.y);
        const soon = ok.filter((p) => p.y + p.h / 2 > hy + 2).sort((a, b) => b.y - a.y);
        near.concat(soon).slice(0, 2).forEach(tapP);
      },
    };
    updC(); updTx(); render(); meTick();
    raf = requestAnimationFrame(loop);
  },
};
