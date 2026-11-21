// 미니게임 3탄(tutoring3) "학부모 상담 전화": 퇴근길 지하철에서 과외 학부모와 통화한다.
// 학부모 말풍선이 오면 답 카드 2~3장 중 알맞은 카드를 위로 끌어 올려 보낸다(솔직한 진단·구체적 계획이 정답, 무리한 약속·학생 탓·핑계는 함정).
// 중간 변수: 터널(신호 끊기기 전에 빨리), 옆자리 소음(말풍선 톡 → 다시 듣기), 회사 단톡방 알림(옆으로 밀어 치우기).
// 끝나면 열차가 집앞역에 서고, 학부모 기분에 따라 재등록·입금 알림 또는 "그만하겠습니다" 메시지가 온다. 30초.
// 일러스트판: 통화 얼굴·맞은편 승객은 캐릭터 그림(표정 시트), 지하철·창밖·폰 테두리·동전은 기기 해상도 벡터. 그림 실패 때만 도트.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite } from "../mg.js";

// 학생 이름(흔한 이름, 실제 인물 아님)
const NAMES = ["지우", "서준", "하윤", "도윤", "예린", "민재", "수아", "태오", "유나", "시우", "채원", "준호", "다인", "건우"];
// 학부모 말 + 답 카드: b 좋은 답(솔직한 진단·구체적 계획), o 무난한 답, t 함정(tk: P 무리한 약속, B 학생·집 탓, E 핑계)
const SC = [
  { q: "이번 시험 왜 떨어졌죠?", b: "함수 단원에서 실수가 몰렸어요. 틀린 문제 정리해서 보내 드릴게요", o: "저도 아쉬워요. 다음엔 더 신경 쓸게요", t: "솔직히 {n}가 숙제를 잘 안 해 와서요…", tk: "B" },
  { q: "숙제를 좀 더 내 주세요", b: "양보다 틀린 유형 위주로 하루 20문제씩 내 볼게요", o: "네, 조금 더 늘려 볼게요", t: "매일 100문제씩 내 드릴게요!", tk: "P" },
  { q: "다음 시험은 몇 점 나올까요?", b: "지금 흐름이면 80점대가 목표예요. 매주 점검해 드릴게요", o: "열심히 하면 꼭 오를 거예요", t: "무조건 100점 만들어 드릴게요!", tk: "P" },
  { q: "애가 수업이 지루하대요", b: "다음 시간부터 5분 퀴즈로 시작해 볼게요", o: "제가 더 재밌게 해 볼게요", t: "{n}가 집중을 안 해서 그래요", tk: "B" },
  { q: "학원이랑 진도가 안 맞아요", b: "학원 진도표 사진 보내 주시면 거기 맞출게요", o: "제가 한번 알아볼게요", t: "학원은 끊고 제 수업만 믿으세요!", tk: "P" },
  { q: "옆집 애는 벌써 선행 들어갔대요", b: "지금은 기초부터 잡는 게 더 빨라요. 다음 달부터 조금씩 넣을게요", o: "원하시면 선행도 같이 해 볼게요", t: "그럼 이번 달에 고등 과정 다 끝낼게요!", tk: "P" },
  { q: "수업 시간 좀 바꿀 수 있을까요?", b: "목·토 저녁 8시 가능해요. 어떠세요?", o: "네, 편하신 시간 말씀 주세요", t: "아무 때나 다 돼요! 새벽도 괜찮아요!", tk: "P" },
  { q: "요즘 애가 폰만 봐요…", b: "수업 땐 폰 끄기 약속을 {n}랑 같이 정해 볼게요", o: "그 나이 땐 다 그래요 ㅎㅎ", t: "그건 집에서 관리하셔야죠", tk: "B" },
  { q: "화상수업, 효과 있는 거 맞죠?", b: "지난달보다 틀리는 문제가 30% 줄었어요. 기록 보내 드릴게요", o: "그럼요, 걱정 마세요!", t: "대면이었으면 더 잘했을 거예요", tk: "E" },
];
const FINAL = { q: "선생님… 다음 달부터 그만할까 해요", b: "아쉬워요. 이번 달 성장 리포트 보내 드릴게요. 보시고 정해 주세요", o: "네… 아쉽지만 알겠습니다", t: "그럼 수업료 반값으로 해 드릴게요!", tk: "P" };
const GOOD = ["아, 그렇군요. 좋네요!", "네, 그렇게 해 주세요~", "역시 선생님 믿어요", "자세히 알려 주셔서 감사해요"];
const OKR = ["네… 그럼 부탁드려요", "음, 알겠어요", "네에…"];
const TRAP = { P: ["…그걸 어떻게 장담하세요?", "그건 좀 무리 아닌가요?", "말씀만 그러시는 거 아니죠?"], B: ["…지금 애 탓 하시는 거죠?", "그럼 선생님은 뭐 하셨어요?"], E: ["…핑계 대시는 거죠?", "그럼 화상수업을 왜 하세요?"] };
const TIMEOUT = ["여보세요? 선생님?", "…듣고 계세요?", "선생님? 대답이 없으시네…"];
const TEAM = ["팀장님: 내일 보고서 9시까지 부탁해요~", "과장님: 다들 퇴근했어요? 급한 건 아니고…", "부장님: 내일 회식! 빠지는 사람 없죠?ㅎㅎ", "대리님: 엑셀 파일 어디 있어요?ㅠ", "팀장님: 아 그리고 주말에 잠깐…"];
const LOUD = ["어!! 나 지금 지하철!!", "뭐라고?! 안 들려!!", "아니 그게 아니라!!", "하하하 진짜?!", "여보세요?! 여보세요!!"];
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const SKIN = ["#f7d5b8", "#f0c8a4", "#e2b48c", "#c99470"];

const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const mkCv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const PF = (g) => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const jong = (s) => { const c = s.charCodeAt(s.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };

const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
const rr = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
// 안내 손가락(벡터)
const HAND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;
const TALK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3a3a46"/><path d="M12 4.4c-4.6 0-8 2.8-8 6.4 0 2.2 1.4 4.2 3.6 5.4l-.8 3.4 3.8-2.4c.4 0 .9.1 1.4.1 4.6 0 8-2.8 8-6.5S16.6 4.4 12 4.4z" fill="#ffd84a"/><path d="M8 9.6h8M8 12.4h5.4" stroke="#5a4a10" stroke-width="1.3" stroke-linecap="round"/></svg>`;
// 사람 그림: 학부모(엄마·아빠), 맞은편 승객(잠든 직장인·폰 보는 학생·큰 소리 통화)
const MOMS = ["c007", "c016", "c036", "c003"], DADS = ["c087", "c096", "c062", "c089"];
const PAX = { sleep: ["c061", "c097", "c058"], phone: ["c051", "c021"], loud: ["c063", "c069", "c024"] };
// 학부모 얼굴 표정 → 그림 표정 칸
const FACEX = { delight: "smile", happy: "smile", neutral: "neutral", worried: "sad", angry: "angry", shock: "surprised" };
// 학부모 겉모습(그림을 못 불러올 때만 쓰는 도트 대체용)
function parentSpec() {
  const mom = rnd() < 0.68;
  return { mom, key: pick(mom ? MOMS : DADS), skin: pick(SKIN), hair: pick(mom ? ["#2a2018", "#3b2a1e", "#5a3b22"] : ["#1b1b22", "#2a2018", "#3a3a40"]), top: pick(["#e0607a", "#5b7bd9", "#3e9e6a", "#c9a050", "#8a5fc0"]), bg: pick(["#ffe3ec", "#e3f0ff", "#e2f8e8", "#fff1d2", "#efe6ff"]) };
}
// 대체용 아주 단순한 얼굴(22x22 캔버스)
function paintParent(g, p) { g.fillStyle = p.bg; g.fillRect(0, 0, 22, 22); g.fillStyle = p.top; g.fillRect(2, 17, 18, 5); g.fillStyle = p.skin; g.beginPath(); g.arc(11, 10, 6, 0, 6.3); g.fill(); g.fillStyle = p.hair; g.beginPath(); g.arc(11, 8, 6.4, Math.PI, 0); g.fill(); g.fillStyle = "#2a1e2e"; g.fillRect(8, 10, 1.4, 1.4); g.fillRect(12.6, 10, 1.4, 1.4); }
// 방법 화면 그림 3장
function stepPics() {
  const card = (x, y, w, fill = "#fff", ln = "#c8ccd8", st = "#d6dae6") => `<rect x="${x}" y="${y + 1.4}" width="${w}" height="13" rx="3.4" fill="#0002"/><rect x="${x}" y="${y}" width="${w}" height="13" rx="3.4" fill="${fill}" stroke="${st}" stroke-width=".8"/><rect x="${x + 6}" y="${y + 3.6}" width="${w - 14}" height="1.8" rx=".9" fill="${ln}"/><rect x="${x + 6}" y="${y + 7.6}" width="${w - 22}" height="1.8" rx=".9" fill="${ln}"/><g fill="#b0b6c8"><rect x="${x + 2}" y="${y + 3.4}" width="2" height="1"/><rect x="${x + 2}" y="${y + 6}" width="2" height="1"/><rect x="${x + 2}" y="${y + 8.6}" width="2" height="1"/></g>`;
  const hand = (x, y) => `<g transform="translate(${x} ${y}) scale(.7)">${HAND.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>`;
  const bgs = `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6fb"/><stop offset="1" stop-color="#e2e6f0"/></linearGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${bgs}<rect x="6" y="6" width="44" height="13" rx="6" fill="#fff" stroke="#e0e3ec"/><rect x="11" y="10.4" width="28" height="1.8" rx=".9" fill="#9aa0b0"/><rect x="11" y="13.6" width="18" height="1.8" rx=".9" fill="#c8ccd8"/>
    ${card(10, 54, 60)}${card(14, 34, 56, "#e8fbf4", "#7fc0a8", "#7fe0c0")}<path d="M62 30V18" stroke="#1f9a7a" stroke-width="3" stroke-linecap="round"/><path d="M56.6 23.4L62 17.6l5.4 5.8" fill="none" stroke="#1f9a7a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${hand(30, 44)}</svg>`);
  const b = `<span class="t3-sp2"><span></span><img src="${svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${card(8, 58, 64, "#fff0f2", "#e0a0a8", "#ff5a6a")}<path d="M50 6l20 20M70 6L50 26" stroke="#ff3b4f" stroke-width="5" stroke-linecap="round"/></svg>`)}" alt=""></span>`;
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${bgs}${card(8, 56, 64)}<g transform="translate(6 16)"><rect width="68" height="26" rx="8" fill="#fffdf4" stroke="#e6dcb0"/><image href="${svgU(TALK_SVG)}" x="5" y="4" width="18" height="18"/><rect x="28" y="7" width="32" height="2.4" rx="1.2" fill="#8a7a40"/><rect x="28" y="13" width="24" height="2.4" rx="1.2" fill="#c8bc90"/></g>
    <path d="M14 10h52" stroke="#e0a800" stroke-width="2.4" stroke-linecap="round"/><path d="M18 6.4L14 10l4 3.6M62 6.4L66 10l-4 3.6" fill="none" stroke="#e0a800" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${hand(36, 26)}</svg>`);
  return [[`<img src="${a}" alt="">`, "답 카드 위로 쓱"], [b, "함정 카드 조심"], [`<img src="${c}" alt="">`, "단톡 알림 옆으로 밀기"]];
}

export const GAME = {
  key: "tutoring3", base: "tutoring", jc: "#7fe0c0", n: "학부모 상담 전화", desc: "퇴근길 지하철, 과외 학부모 전화! 말 한마디에 재등록이 갈려요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 학부모 말이 오면 알맞은 <b>답 카드를 위로 쓱</b> 끌어 올려 보내요.",
    "<b>솔직한 진단·구체적 계획</b>은 기분이 오르고, <b>무리한 약속·학생 탓</b>은 함정! 늦게 답해도 기분이 내려가요.",
    "<b>터널</b>에선 신호가 끊기기 전에 빨리, <b>소음</b> 땐 말풍선을 톡 눌러 다시 듣고, <b>단톡방 알림</b>은 옆으로 밀어 치워요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "답 카드 위로 쓱"], ["", "함정 카드 조심"], ["", "단톡 알림 옆으로 밀기"]]; } },
  css: `
.mg-tutoring3 .t3-st{background:#0f1016!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-tutoring3 .t3-cv{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
.mg-tutoring3 .t3-fx{z-index:6}
.mg-tutoring3 .mg-steps i{width:76px;height:76px;display:flex;align-items:center;justify-content:center}
.mg-tutoring3 .mg-steps img{width:76px;height:76px;border-radius:12px;box-shadow:0 3px 10px #0004}
.mg-tutoring3 .t3-sp2{position:relative;display:block;width:76px;height:76px;border-radius:12px;overflow:hidden;background:linear-gradient(#ffe3ec,#f4f6fb);box-shadow:0 3px 10px #0004}
.mg-tutoring3 .t3-sp2>span{position:absolute;left:4px;top:4px;width:44px;height:57px;background:url("img/body/c016.webp") 0 70.3125%/300% 346.15% no-repeat}
.mg-tutoring3 .t3-sp2 img{position:absolute;inset:0;box-shadow:none!important}
.mg-tutoring3 .mg-msg{z-index:24}
.mg-tutoring3 .t3-mew{position:absolute;left:0;top:0;right:0;overflow:hidden;z-index:1;pointer-events:none}
.mg-tutoring3 .t3-av{position:absolute;background-repeat:no-repeat;opacity:0;transition:opacity .4s;transform-origin:50% 100%;filter:drop-shadow(0 0 1px #0008)}
.mg-tutoring3 .t3-av.on{opacity:1}
.mg-tutoring3 .t3-led{position:absolute;z-index:2;left:22%;width:56%;top:2px;height:14px;background:#140a06;border:1px solid #4a4a52;border-radius:3px;overflow:hidden;color:#ff9a2a;font-size:11px;font-weight:900;line-height:14px;text-shadow:0 0 4px #ff7a00;white-space:nowrap;pointer-events:none}
.mg-tutoring3 .t3-led span{display:inline-block;padding-left:100%;animation:t3led 9s linear infinite}
.mg-tutoring3 .t3-led.arr{color:#7CFC9A;text-shadow:0 0 4px #2fd070}
.mg-tutoring3 .t3-nb{position:absolute;z-index:2;background:#fff;color:#2a1e2e;font-size:11px;font-weight:900;padding:3px 8px;border-radius:9px 9px 9px 2px;white-space:nowrap;box-shadow:0 2px 0 #0006,0 0 0 2px #ff9f7a;pointer-events:none;opacity:0;transform:scale(.4);transform-origin:0 100%;transition:transform .15s cubic-bezier(.3,1.6,.5,1),opacity .12s}
.mg-tutoring3 .t3-nb.on{opacity:1;transform:scale(1) rotate(-2deg)}
.mg-tutoring3 .t3-ph{position:absolute;z-index:3;background:#f2f4fa;border-radius:12px 12px 0 0;overflow:hidden;display:flex;flex-direction:column;color:#23263a}
.mg-tutoring3 .t3-sb{flex:0 0 17px;display:flex;align-items:center;gap:6px;padding:0 9px;font-size:11px;font-weight:800;color:#4a4f66;background:#e4f7ef}
.mg-tutoring3 .t3-app{background:#1f9a7a;color:#fff;border-radius:4px;padding:0 5px;font-size:11px;line-height:13px}
.mg-tutoring3 .t3-bars{display:flex;align-items:flex-end;gap:1px;height:9px}
.mg-tutoring3 .t3-bars i{width:3px;background:#4a4f66;border-radius:1px}
.mg-tutoring3 .t3-bars i:nth-child(1){height:3px}.mg-tutoring3 .t3-bars i:nth-child(2){height:5px}.mg-tutoring3 .t3-bars i:nth-child(3){height:7px}.mg-tutoring3 .t3-bars i:nth-child(4){height:9px}
.mg-tutoring3 .t3-bars i.off{background:#c8ccd8}
.mg-tutoring3 .t3-bars.weak i:not(.off){background:#ff4a5a;animation:t3blink .3s infinite}
.mg-tutoring3 .t3-lt{margin-left:auto;font-variant-numeric:tabular-nums}
.mg-tutoring3 .t3-lt.warn{color:#e0304a}
.mg-tutoring3 .t3-hd{flex:0 0 auto;display:flex;gap:9px;align-items:center;padding:6px 9px 7px;background:linear-gradient(#e4f7ef,#f2f4fa);border-bottom:1px solid #dde0ea}
.mg-tutoring3 .t3-face{width:58px;height:58px;flex:0 0 58px;border-radius:14px;background-color:var(--fbg,#ffe3ec);background-repeat:no-repeat;box-shadow:0 0 0 2px #fff,0 2px 6px 2px #0002;transition:background-color .3s}
.mg-tutoring3 .t3-face.px{image-rendering:pixelated;background-size:100% 100%!important}
.mg-tutoring3 .t3-face.ang{background-color:#ffd4d8}.mg-tutoring3 .t3-face.joy{background-color:#d8f8e6}
.mg-tutoring3 .t3-face.shk{animation:t3shk .35s}
.mg-tutoring3 .t3-face.yay{animation:t3yay .45s}
.mg-tutoring3 .t3-who{flex:1;min-width:0}
.mg-tutoring3 .t3-who b{display:block;font-size:13.5px;font-weight:900}
.mg-tutoring3 .t3-who small{display:block;font-size:11px;color:#7a8098;font-weight:700;margin:1px 0 4px}
.mg-tutoring3 .t3-md{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#4a4f66}
.mg-tutoring3 .t3-md i{position:relative;flex:1;height:10px;border-radius:5px;background:#dde0ea;box-shadow:inset 0 1px 0 #0001}
.mg-tutoring3 .t3-md em{position:absolute;left:0;top:0;bottom:0;border-radius:5px;width:var(--m,45%);background:var(--mc,#ffd166);transition:width .35s cubic-bezier(.3,1.4,.5,1),background .3s}
.mg-tutoring3 .t3-md u{position:absolute;left:60%;top:-3px;bottom:-3px;width:2px;background:#1f9a7a;text-decoration:none}
.mg-tutoring3 .t3-md u::after{content:"재등록";position:absolute;left:50%;bottom:100%;transform:translateX(-50%);font-size:11px;color:#1f9a7a;font-weight:900;white-space:nowrap}
.mg-tutoring3 .t3-md b{min-width:22px;text-align:right;font-size:11px;display:inline}
.mg-tutoring3 .t3-chat{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;padding:6px 9px;overflow:hidden;transition:background .15s,box-shadow .15s}
.mg-tutoring3 .t3-chat.zone{background:#e2faf0;box-shadow:inset 0 0 0 2px #7fe0c0}
.mg-tutoring3 .t3-b{flex:0 0 auto;max-width:84%;padding:6px 10px;border-radius:12px;font-size:12.5px;line-height:1.35;font-weight:700;word-break:keep-all;animation:t3in .22s cubic-bezier(.3,1.5,.5,1)}
.mg-tutoring3 .t3-b.pa{align-self:flex-start;background:#fff;border-radius:3px 12px 12px 12px;box-shadow:0 1px 0 #0002,0 0 0 1px #e0e3ec}
.mg-tutoring3 .t3-b.pa.bad{background:#fff0f2;box-shadow:0 1px 0 #0002,0 0 0 1px #ffb0bc;color:#a02040}
.mg-tutoring3 .t3-b.pa.gd{background:#f0fff6;box-shadow:0 1px 0 #0002,0 0 0 1px #9fe0c0;color:#0d5a3a}
.mg-tutoring3 .t3-b.pa.gb{color:#8a8fa8;font-style:italic;letter-spacing:.5px}
.mg-tutoring3 .t3-b.me{align-self:flex-end;background:#7fe0c0;color:#0d3a2e;border-radius:12px 3px 12px 12px}
.mg-tutoring3 .t3-b.me.sm{font-size:11px;background:#c8f0e0}
.mg-tutoring3 .t3-b.sys{align-self:center;background:#0000;color:#8a90a8;font-size:11px;padding:0;font-weight:800}
.mg-tutoring3 .t3-b.sys.red{color:#e0304a}
.mg-tutoring3 .t3-b.ty i{display:inline-block;width:5px;height:5px;margin:0 2px;border-radius:50%;background:#9aa0b8;animation:t3dot .9s infinite}
.mg-tutoring3 .t3-b.ty i:nth-child(2){animation-delay:.15s}.mg-tutoring3 .t3-b.ty i:nth-child(3){animation-delay:.3s}
.mg-tutoring3 .t3-w{display:block;height:3px;margin-top:5px;background:#e4e6ee;border-radius:2px;overflow:hidden}
.mg-tutoring3 .t3-w em{display:block;height:100%;width:var(--w,100%);background:#7fe0c0}
.mg-tutoring3 .t3-w.low em{background:#ff5a6a}
.mg-tutoring3 .t3-b.pa.tap{cursor:pointer;box-shadow:0 1px 0 #0002,0 0 0 2px #ffd166;animation:t3pulse .5s infinite alternate}
.mg-tutoring3 .t3-cards{position:relative;flex:0 0 auto;padding:4px 9px 12px;background:#e6e9f2;border-top:1px solid #d6dae6}
.mg-tutoring3 .t3-cl{display:block;font-size:11px;font-weight:800;color:#8a90a8;margin:0 0 4px 2px;height:12px}
.mg-tutoring3 .t3-cw{display:flex;flex-direction:column;gap:6px;min-height:var(--cwh,150px)}
.mg-tutoring3 .t3-card{position:relative;background:#fff;border-radius:10px;padding:9px 11px 9px 25px;min-height:34px;display:flex;align-items:center;font-size:12.8px;line-height:1.36;font-weight:800;color:#23263a;word-break:keep-all;box-shadow:0 2px 0 #c4c8d6,0 0 0 1px #d6dae6;touch-action:none;cursor:grab;transition:transform .28s cubic-bezier(.3,1.5,.5,1),opacity .2s,box-shadow .15s;will-change:transform}
.mg-tutoring3 .t3-card::before{content:"";position:absolute;left:9px;top:50%;width:7px;height:11px;margin-top:-6px;background:linear-gradient(#b0b6c8 0 2px,transparent 2px 4.5px,#b0b6c8 4.5px 6.5px,transparent 6.5px 9px,#b0b6c8 9px)}
.mg-tutoring3 .t3-card.in{animation:t3cin .3s cubic-bezier(.3,1.5,.5,1) backwards}
.mg-tutoring3 .t3-card.drag{transition:none;z-index:5;box-shadow:0 12px 18px #0003,0 0 0 2px #7fe0c0;cursor:grabbing}
.mg-tutoring3 .t3-card.wig{animation:t3wig .4s}
.mg-tutoring3 .t3-card.no{box-shadow:0 2px 0 #c4c8d6,0 0 0 2px #ff5a6a;animation:t3wig .4s}
.mg-tutoring3 .t3-card.go{transition:transform .2s ease-in,opacity .2s ease-in;opacity:0;pointer-events:none}
.mg-tutoring3 .t3-card.fade{transition:opacity .18s,transform .18s;opacity:0;transform:translateY(10px);pointer-events:none}
.mg-tutoring3 .t3-haze{position:absolute;inset:0;z-index:4;display:none;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:repeating-linear-gradient(0deg,#e6e9f2ee 0 3px,#d8dce8ee 3px 5px);text-align:center;cursor:pointer}
.mg-tutoring3 .t3-haze.on{display:flex;animation:t3hz .25s steps(3) infinite}
.mg-tutoring3 .t3-haze b{font-size:12.5px;color:#d0501a;font-weight:900}
.mg-tutoring3 .t3-haze small{font-size:11px;color:#4a4f66;font-weight:800;background:#ffd166;border-radius:8px;padding:2px 8px}
.mg-tutoring3 .t3-noti{position:absolute;inset:0;z-index:5;display:none;align-items:center;justify-content:center;background:#23263a55}
.mg-tutoring3 .t3-noti.on{display:flex}
.mg-tutoring3 .t3-nt{position:relative;width:90%;display:flex;gap:9px;align-items:center;background:#fffdf4;border-radius:13px;padding:9px 11px;box-shadow:0 5px 0 #0003,0 0 0 1px #e6dcb0;touch-action:none;cursor:grab;transition:transform .2s ease-in,opacity .2s}
.mg-tutoring3 .t3-nt.in{animation:t3ntin .3s cubic-bezier(.3,1.5,.5,1)}
.mg-tutoring3 .t3-nt.drag{transition:none}
.mg-tutoring3 .t3-nt img{width:30px;height:30px;flex:0 0 30px;border-radius:8px}
.mg-tutoring3 .t3-nt div{flex:1;min-width:0}
.mg-tutoring3 .t3-nt small{display:block;font-size:11px;color:#8a7a40;font-weight:800}
.mg-tutoring3 .t3-nt b{display:block;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-tutoring3 .t3-nt em{position:absolute;right:-5px;top:-6px;font-style:normal;background:#ff4a5a;color:#fff;font-size:11px;font-weight:900;border-radius:9px;padding:0 6px;line-height:16px;display:none}
.mg-tutoring3 .t3-nt em.on{display:block}
.mg-tutoring3 .t3-sig{position:absolute;left:0;right:0;top:0;padding:3px 9px;background:#ffe8ec;z-index:3;display:none;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#e0304a}
.mg-tutoring3 .t3-sig.on{display:flex}
.mg-tutoring3 .t3-sig i{flex:1;height:5px;border-radius:3px;background:#ffd0d6;overflow:hidden}
.mg-tutoring3 .t3-sig em{display:block;height:100%;width:var(--s,100%);background:#ff4a5a}
.mg-tutoring3 .t3-fin{position:absolute;left:9px;right:9px;z-index:7;display:none;flex-direction:column;gap:7px}
.mg-tutoring3 .t3-fin.on{display:flex}
.mg-tutoring3 .t3-fc{display:flex;gap:9px;align-items:flex-start;background:#fffdf8;border-radius:14px;padding:10px 11px;box-shadow:0 5px 0 #0003,0 0 0 2px #7fe0c0,0 0 26px #7fe0c088;animation:t3pm .5s cubic-bezier(.3,1.5,.5,1)}
.mg-tutoring3 .t3-fc>i{flex:0 0 34px;height:34px;border-radius:9px;background:linear-gradient(#7fe0c0,#1f9a7a);color:#fff;font-style:normal;font-weight:900;font-size:15px;display:flex;align-items:center;justify-content:center}
.mg-tutoring3 .t3-fc div{flex:1;min-width:0}
.mg-tutoring3 .t3-fc small{display:block;font-size:11px;color:#7a7090;font-weight:800}
.mg-tutoring3 .t3-fc b{display:block;font-size:12.5px;margin:1px 0 2px}
.mg-tutoring3 .t3-fc p{margin:0;font-size:13px;line-height:1.4;font-weight:700;word-break:keep-all}
.mg-tutoring3 .t3-fc.sad{box-shadow:0 5px 0 #0003,0 0 0 2px #9aa0b8;background:#f4f5fa}
.mg-tutoring3 .t3-fc.sad>i{background:linear-gradient(#b8bccc,#7a8098)}
.mg-tutoring3 .t3-dep{align-self:center;background:#23263a;color:#fff;border-radius:99px;padding:6px 16px;font-size:13px;font-weight:800;box-shadow:0 3px 0 #0004;animation:t3pm .45s cubic-bezier(.3,1.6,.5,1)}
.mg-tutoring3 .t3-dep b{color:#7CFC9A;font-size:16px;margin-left:4px}
.mg-tutoring3 .t3-dep.no{background:#5a5f74}.mg-tutoring3 .t3-dep.no b{color:#ffb0bc;font-size:13px}
.mg-tutoring3 .t3-ban{position:absolute;left:50%;z-index:12;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:25px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #1f9a7a,0 0 16px #7fe0c0}
.mg-tutoring3 .t3-ban.on{animation:t3ban 1.7s ease-out forwards}
.mg-tutoring3 .t3-ban.rd{text-shadow:0 0 2px #000,0 3px 0 #a02040,0 0 16px #ff5a6a}
.mg-tutoring3 .t3-ban small{display:block;font-size:12.5px}
.mg-tutoring3 .t3-tut{position:absolute;left:8px;right:8px;z-index:20;display:flex;pointer-events:none;transition:opacity .3s}
.mg-tutoring3 .t3-tut.off{opacity:0;visibility:hidden}
.mg-tutoring3 .t3-tc{pointer-events:auto;flex:1;background:#fffdf8;color:#2a1e2e;border-radius:12px;padding:8px 10px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #7fe0c0;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-tutoring3 .t3-tut.pop .t3-tc{animation:t3pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-tutoring3 .t3-tc em{display:inline-block;font-style:normal;background:#1f9a7a;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-tutoring3 .t3-tc p{margin:0}
.mg-tutoring3 .t3-tc b.gn{color:#1f9a7a}.mg-tutoring3 .t3-tc b.bl{color:#1a7ab0}.mg-tutoring3 .t3-tc b.gd{color:#a87000}.mg-tutoring3 .t3-tc b.rd{color:#c0392b}
.mg-tutoring3 .t3-tb{margin-top:5px;display:flex;justify-content:center}
.mg-tutoring3 .t3-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-tutoring3 .t3-go{background:linear-gradient(#5fd8b0,#1f9a7a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 22px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d5a44!important;animation:t3gp .5s infinite alternate}
.mg-tutoring3 .t3-hand{position:absolute;z-index:23;width:40px;height:40px;margin:-4px 0 0 -14px;background-size:100% 100%;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px #0009)}
.mg-tutoring3 .t3-hand.on{display:block}
.mg-tutoring3 .t3-hand.tap{animation:t3tap .8s infinite}
.mg-tutoring3 .t3-hand.up{animation:t3up 1.1s infinite}
.mg-tutoring3 .t3-hand.side{animation:t3side 1.1s infinite}
@keyframes t3led{to{transform:translateX(-100%)}}
@keyframes t3blink{50%{opacity:.25}}
@keyframes t3in{from{transform:scale(.5);opacity:0}}
@keyframes t3cin{from{transform:translateY(40px);opacity:0}}
@keyframes t3wig{20%{transform:translateX(-5px) rotate(-2deg)}50%{transform:translateX(5px) rotate(2deg)}80%{transform:translateX(-2px)}}
@keyframes t3dot{50%{transform:translateY(-3px);opacity:.5}}
@keyframes t3pulse{to{box-shadow:0 1px 0 #0002,0 0 0 3px #ffb03b}}
@keyframes t3hz{50%{background-position:0 2px}}
@keyframes t3ntin{from{transform:translateY(-60px) scale(.8);opacity:0}}
@keyframes t3shk{20%{transform:translateX(-4px) rotate(-4deg)}40%{transform:translateX(4px) rotate(4deg)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@keyframes t3yay{40%{transform:translateY(-6px) scale(1.08)}}
@keyframes t3pm{from{transform:translateY(-24px) scale(.8);opacity:0}}
@keyframes t3ban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(2deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@keyframes t3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes t3gp{to{transform:scale(1.08)}}
@keyframes t3tap{0%,100%{transform:translate(6px,10px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes t3up{0%{transform:translate(0,6px) scale(.9);opacity:0}15%{opacity:1;transform:translate(0,0) scale(.88)}75%{transform:translate(0,-62px) scale(.88);opacity:1}100%{transform:translate(0,-70px);opacity:0}}
@keyframes t3side{0%{transform:translate(-34px,0) scale(.88);opacity:0}15%{opacity:1}75%{transform:translate(46px,0) scale(.88);opacity:1}100%{transform:translate(54px,0);opacity:0}}
@media (prefers-reduced-motion:reduce){.mg-tutoring3 .t3-ban.on{animation-duration:.01s}.mg-tutoring3 .t3-go,.mg-tutoring3 .t3-haze.on,.mg-tutoring3 .t3-led span{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const T = 30, dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "tutoring3", "학부모 상담 전화", "t3-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="t3-cv"></canvas><div class="t3-mew"><div class="t3-av"></div></div>
      <div class="t3-led"><span>이번 역은 야근역입니다 · 다음 역은 투잡역 · 내리실 문은 왼쪽입니다</span></div><div class="t3-nb"></div>
      <div class="t3-ph">
        <div class="t3-sb"><b class="t3-app">과외온</b><span class="t3-bars"><i></i><i></i><i></i><i></i></span><span class="t3-lt">리허설</span></div>
        <div class="t3-hd"><div class="t3-face"></div><div class="t3-who"><b></b><small>통화 중 0:00</small><div class="t3-md"><span>기분</span><i><em></em><u></u></i><b>45</b></div></div></div>
        <div class="t3-chat"></div>
        <div class="t3-cards"><small class="t3-cl">답장 카드 · 위로 쓱 올려 보내요</small><div class="t3-cw"></div>
          <div class="t3-sig"><b>신호 끊기기 전에!</b><i><em></em></i></div>
          <div class="t3-haze"><b>옆자리가 시끄러워 잘 안 들려요</b><small>말풍선을 톡 → 다시 듣기</small></div>
          <div class="t3-noti"><div class="t3-nt"><img alt=""><div><small>우리 팀 단톡방 · 지금</small><b></b></div><em></em></div></div>
        </div>
        <div class="t3-fin"></div>
      </div>
      <canvas class="t3-cv t3-fx"></canvas><div class="t3-ban"></div>
      <div class="t3-tut off"><div class="t3-tc"><em>리허설</em><p></p><div class="t3-tb"></div></div></div><div class="t3-hand"></div>`);
    const st = F.stage, $ = (s) => st.querySelector(s);
    const cv = $(".t3-cv"), g0 = cv.getContext("2d"), cvF = $(".t3-fx"), gF = cvF.getContext("2d");
    const mew = $(".t3-mew"), avEl = $(".t3-av"), led = $(".t3-led"), ledS = $(".t3-led span"), nbEl = $(".t3-nb");
    const ph = $(".t3-ph"), bars = $(".t3-bars"), barI = [...bars.querySelectorAll("i")], ltEl = $(".t3-lt"), faceCv = $(".t3-face");
    const whoB = $(".t3-who b"), whoS = $(".t3-who small"), mdEm = $(".t3-md em"), mdB = $(".t3-md b"), chat = $(".t3-chat"), cardsBox = $(".t3-cards"), cw = $(".t3-cw");
    const sigEl = $(".t3-sig"), sigEm = $(".t3-sig em"), haze = $(".t3-haze"), notiEl = $(".t3-noti"), ntEl = $(".t3-nt"), ntB = $(".t3-nt b"), ntE = $(".t3-nt em"), finEl = $(".t3-fin");
    const ban = $(".t3-ban"), tutEl = $(".t3-tut"), tutP = $(".t3-tc p"), tutB = $(".t3-tb"), hand = $(".t3-hand"), msgEl = st.querySelector(".mg-msg"), comboEl = st.querySelector(".mg-combo");
    $(".t3-nt img").src = svgU(TALK_SVG);

    // ── 크기: 논리 폭 112칸 안팎을 정수배로. 위 36%는 지하철, 아래는 내 폰 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cv, cvF]) { c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    for (const q of [g0, gF]) { q.setTransform(KS, 0, 0, KS, 0, 0); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = "high"; }
    const glow = (q, x, y, r, rgb, a) => { const gr = q.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); q.fillStyle = gr; q.fillRect(x - r, y - r, r * 2, r * 2); };
    const SC_H = Math.round(LH * 0.32), PX = 3, PY = SC_H, PW = LW - 6, SX = PX + 3, SY = PY + 6, SW = PW - 6;
    Object.assign(ph.style, { left: SX * K + "px", top: SY * K + "px", width: SW * K + "px", height: sh - SY * K + 2 + "px" });
    const WY = 9, WH = 23, WINS = [{ x: 2, y: WY, w: 44, h: WH }, { x: 50, y: WY, w: LW - 52, h: WH }];
    mew.style.height = PY * K + "px";
    msgEl.style.top = (PY - 9) * K + "px";
    if (comboEl) Object.assign(comboEl.style, { bottom: "auto", top: (PY - 16) * K + "px", right: "14px" });
    nbEl.style.left = 38 * K + "px"; nbEl.style.top = 26 * K + "px";
    ban.style.top = Math.round(PY * K * 0.52) + "px";
    Object.assign(tutEl.style, { top: 20 + "px" });
    // 카드 칸 높이(3장 기준): 폰 화면 높이에 맞춰
    cw.style.setProperty("--cwh", "168px");

    // ── 사람들 ──
    const nm = pick(NAMES), nick = jong(nm) ? nm + "이" : nm, PA = parentSpec(), title = `${nm} ${PA.mom ? "어머님" : "아버님"}`;
    whoB.textContent = title;
    const fmt = (s) => s.replace(/\{n\}/g, nick);
    const pax = [{ sp: { spec: uSpec("worker"), cache: {} }, x: 3, kind: "sleep" }, { sp: { spec: uSpec("student"), cache: {} }, x: 19, kind: "phone" }, { sp: { spec: uSpec("plain"), cache: {} }, x: 35, kind: "loud" }];
    const ldImg = (key) => { const r = { ok: false, fail: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.onerror = () => (r.fail = true); r.im.src = "img/body/" + key + ".webp"; return r; };
    pax.forEach((p) => (p.img = ldImg(pick(PAX[p.kind]))));
    // 통화 얼굴: 학부모 그림 얼굴 부분을 크게(칸 240x540 중 x 40~200, y 0~160)
    let faceOk = false;
    { const im = new Image(); im.onload = () => { faceOk = true; faceCv.style.backgroundImage = `url("${im.src}")`; faceKey = ""; }; im.onerror = () => { const c = mkCv(22, 22); paintParent(c.getContext("2d"), PA); faceCv.classList.add("px"); faceCv.style.backgroundImage = `url("${c.toDataURL()}")`; }; im.src = "img/body/" + PA.key + ".webp"; }
    const FZ = 58 / 160; faceCv.style.backgroundSize = `${720 * FZ}px ${1080 * FZ}px`; faceCv.style.setProperty("--fbg", PA.bg);

    // 내 캐릭터(몸 그림 시트 3x2). 칸 240x540 중 위쪽 300만 쓴다. 폰 위까지만 보인다.
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    {
      const h = Math.round((PY * K - 12) * 1.22), w = Math.round(h * 240 / 300);
      Object.assign(avEl.style, { width: w + "px", height: h + "px", right: Math.round(-w * 0.1) + "px", top: "12px", backgroundSize: "300% 360%" });
      const im = new Image();
      im.onload = () => { art = true; avEl.style.backgroundImage = `url("${im.src}")`; avEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    let meX = "", meT = "";

    // ── 고정 배경(한 번만, 고해상도): 천장·벽(창문 자리는 비움)·좌석·바닥 ──
    const BG = mkCv(Math.round(LW * KS), Math.round(LH * KS));
    {
      const b = BG.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0);
      let gr = b.createLinearGradient(0, 0, 0, PY); gr.addColorStop(0, "#e4ece8"); gr.addColorStop(1, "#aab6b2"); b.fillStyle = gr; b.fillRect(0, 0, LW, PY);
      gr = b.createLinearGradient(0, 0, 0, 6); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#dfe6e6"); b.fillStyle = gr; b.fillRect(0, 0, LW, 6); b.fillStyle = "#b8c0c0"; b.fillRect(0, 5.6, LW, 0.4);
      for (const lx of [4, LW - 22]) { rr(b, lx, 1, 18, 2, 1); b.fillStyle = "#fffef0"; b.fill(); glow(b, lx + 9, 3, 14, "255,250,220", 0.35); }
      // 광고판(창문 사이)
      rr(b, 46.2, 10, 3.6, 21, 0.8); b.fillStyle = "#e8eeec"; b.fill(); rr(b, 46.8, 12, 2.4, 6, 0.6); b.fillStyle = "#ff9f7a"; b.fill(); rr(b, 46.8, 19, 2.4, 6, 0.6); b.fillStyle = "#7fd0ff"; b.fill();
      // 창문 틀(둥근 모서리, 안은 비움)
      for (const r of WINS) {
        rr(b, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 2.4); gr = b.createLinearGradient(0, r.y - 2, 0, r.y + r.h + 2); gr.addColorStop(0, "#c4ccca"); gr.addColorStop(1, "#7a8682"); b.fillStyle = gr; b.fill();
        rr(b, r.x - 0.8, r.y - 0.8, r.w + 1.6, r.h + 1.6, 1.8); b.fillStyle = "#4a5450"; b.fill();
        b.save(); rr(b, r.x, r.y, r.w, r.h, 1.4); b.clip(); b.clearRect(r.x, r.y, r.w, r.h); b.restore();
        b.fillStyle = "rgba(255,255,255,.6)"; b.fillRect(r.x - 2, r.y + r.h + 1.6, r.w + 4, 0.4);
      }
      // 등받이·좌석(파란 벨벳)
      gr = b.createLinearGradient(0, 34, 0, 50); gr.addColorStop(0, "#36609c"); gr.addColorStop(1, "#4a7cc0"); b.fillStyle = gr; b.fillRect(0, 34, LW, 16);
      for (let x = 0; x < LW; x += 8) { gr = b.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, "rgba(0,0,0,.12)"); gr.addColorStop(0.5, "rgba(255,255,255,.08)"); gr.addColorStop(1, "rgba(0,0,0,.12)"); b.fillStyle = gr; b.fillRect(x, 35, 8, 14); }
      gr = b.createLinearGradient(0, 49, 0, 55); gr.addColorStop(0, "#8ab4ea"); gr.addColorStop(0.25, "#4a7cc0"); gr.addColorStop(1, "#3a68a8"); b.fillStyle = gr; b.fillRect(0, 49, LW, 6);
      b.fillStyle = "#2a3a5a"; b.fillRect(0, 55, LW, 3); b.fillStyle = "#1a2238"; b.fillRect(0, 58, LW, 1);
      for (const x of [17, 33, 51]) { gr = b.createLinearGradient(x - 0.6, 0, x + 0.6, 0); gr.addColorStop(0, "#8a9498"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, "#8a9498"); b.fillStyle = gr; b.fillRect(x - 0.6, 30, 1.2, 28); }
      // 바닥
      gr = b.createLinearGradient(0, 59, 0, PY); gr.addColorStop(0, "#5f646c"); gr.addColorStop(1, "#8a8f98"); b.fillStyle = gr; b.fillRect(0, 59, LW, PY - 59);
      b.fillStyle = "rgba(255,255,255,.12)"; for (let k = 0; k < 40; k++) { b.beginPath(); b.arc(rnd() * LW, 60 + rnd() * Math.max(1, PY - 60), 0.25, 0, 6.3); b.fill(); }
      b.fillStyle = "#e0b040"; b.fillRect(0, PY - 4, LW, 0.6);
      // 손잡이 봉
      gr = b.createLinearGradient(0, 6, 0, 8); gr.addColorStop(0, "#eef2f4"); gr.addColorStop(1, "#7a8488"); b.fillStyle = gr; b.fillRect(0, 6, LW, 1.6);
    }
    // 폰 테두리(지하철 장면 위, 화면은 HTML)
    const PHC = mkCv(Math.round(LW * KS), Math.round(LH * KS));
    {
      const b = PHC.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0); const y0 = PY, bt = LH + 6;
      b.save(); b.shadowColor = "rgba(0,0,0,.55)"; b.shadowBlur = 6 * KS; b.shadowOffsetY = -1 * KS;
      rr(b, PX, y0, PW, bt - y0, 6); const gr = b.createLinearGradient(PX, 0, PX + PW, 0); gr.addColorStop(0, "#3a3c48"); gr.addColorStop(0.08, "#1c1d25"); gr.addColorStop(0.92, "#16171e"); gr.addColorStop(1, "#30323e"); b.fillStyle = gr; b.fill(); b.restore();
      rr(b, PX + 0.4, y0 + 0.4, PW - 0.8, bt - y0, 5.6); b.strokeStyle = "rgba(255,255,255,.22)"; b.lineWidth = 0.35; b.stroke();
      const nx = LW / 2; rr(b, nx - 6, y0 + 1.6, 12, 2.6, 1.3); b.fillStyle = "#06060a"; b.fill(); b.fillStyle = "#2a3a6a"; b.beginPath(); b.arc(nx + 3.6, y0 + 2.9, 0.6, 0, 6.3); b.fill();
      b.fillStyle = "#2a2b34"; rr(b, PX + PW - 0.2, y0 + 16, 1, 9, 0.5); b.fill(); rr(b, PX - 0.8, y0 + 14, 1, 6, 0.5); b.fill();
    }
    // 창밖 도시(멀리, 반복, 고해상도 벡터)
    const CITY = mkCv(Math.round(128 * KS), Math.round(WH * KS));
    {
      const b = CITY.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0);
      let gr = b.createLinearGradient(0, 0, 0, WH); gr.addColorStop(0, "#121638"); gr.addColorStop(0.7, "#2c2a5a"); gr.addColorStop(1, "#4a3a6a"); b.fillStyle = gr; b.fillRect(0, 0, 128, WH);
      for (const [a, b2] of [[9, 3], [40, 6], [71, 2], [100, 5], [120, 8], [24, 9], [88, 3]]) { b.fillStyle = "rgba(255,255,255,.7)"; b.beginPath(); b.arc(a, b2, 0.3, 0, 6.3); b.fill(); }
      glow(b, 61.5, 4.5, 5, "255,233,168", 0.35); b.fillStyle = "#ffe9a8"; b.beginPath(); b.arc(61.5, 4.5, 1.8, 0, 6.3); b.fill(); b.fillStyle = "#1e2048"; b.beginPath(); b.arc(62.4, 3.9, 1.6, 0, 6.3); b.fill();
      let x = 0; while (x < 128) { const w = 4 + rnd() * 8, h = 6 + rnd() * 13, c = pick(["#141a32", "#1b2244", "#22284a"]); gr = b.createLinearGradient(0, WH - h, 0, WH); gr.addColorStop(0, c); gr.addColorStop(1, "#0c1024"); b.fillStyle = gr; b.fillRect(x, WH - h, Math.min(w, 128 - x) - 0.2, h); for (let yy = WH - h + 1.6; yy < WH - 1; yy += 1.8) for (let xx = x + 0.8; xx < Math.min(x + w - 1, 127); xx += 1.5) if (rnd() < 0.38) { b.fillStyle = pick(["#ffd56a", "#ffd56a", "#9fd8ff", "#ffb0d0"]); b.fillRect(xx, yy, 0.7, 0.9); } if (h > 15 && rnd() < 0.6) { glow(b, x + w / 2, WH - h - 1.2, 1.6, "255,74,90", 0.8); } x += w; }
    }

    // ── 상태 ──  tut: 0 리허설 전 / 1 카드 보내기 / 2 단톡 치우기 / 3 소음 / 4 안내 카드 / -1 통화 중
    let tut = 0, tutT = 0, over = false, done = false, timeUp = false, raf = 0, last = 0, clk = 0, el = 0, tm = null, callT = 0;
    let mood = 45, moodShown = -1, roundNo = 0, pool = [], finalStarted = false, ended = false;
    const S = { best: 0, ok: 0, trap: 0, to: 0, drop: 0, re: 0, n: 0, rt: 0 };
    let cur = null;
    const TUN_AT = [8.5, 16.5], NZ_AT = [4, 12.5], NT_AT = [6, 11.5, 18];
    let tunK = 0, nzK = 0, ntK = 0;
    const scn = { a: "city", b: null, edge: LW, sc1: 0, sc2: 0, spd: 1, flick: 0, jolt: 0 };
    const nz = { on: false, t: 0, dur: 0, lt: 0 };
    const notis = []; let notiT = 0, nd = null;
    const ME = { smile: 0, shock: 0, angry: 0, sad: 0, blush: 0, talk: 0 };
    let faceKey = "", faceTmp = "", faceTmpT = 0, faceTalk = 0, clackT = 0.5, sigLow = false;
    const coins = [], sparks = [];
    let endSeq = null;

    // ── 소리 ──
    const ring = (at = 0) => { for (let k = 0; k < 2; k++) { tone(988, 0.1, "sine", 0.08, 0, at + k * 0.32); tone(1318, 0.12, "sine", 0.08, 0, at + k * 0.32 + 0.12); } };
    const popIn = () => tone(760, 0.06, "sine", 0.09, 260);
    const notiSnd = () => { tone(1568, 0.07, "sine", 0.09); tone(2093, 0.11, "sine", 0.09, 0, 0.09); };
    const rumble = () => { noise(1.1, 160, 0.14, 0, 0.6); tone(70, 0.9, "sawtooth", 0.03, -20); };
    const dropSnd = () => { for (let k = 0; k < 3; k++) tone(480, 0.22, "sine", 0.08, 0, k * 0.34); };
    const clack = () => { noise(0.05, 260, 0.05); noise(0.05, 220, 0.04, 0.13); };
    const chatter = () => { noise(0.18, 700 + rnd() * 500, 0.05, 0, 3); tone(180 + rnd() * 80, 0.12, "sawtooth", 0.02, 40); };
    const coinSnd = (at = 0) => { tone(1976, 0.06, "square", 0.05, 0, at); tone(2637, 0.14, "square", 0.05, 0, at + 0.06); };
    const sadSnd = () => { tone(440, 0.18, "triangle", 0.07, -120); tone(330, 0.26, "triangle", 0.06, -80, 0.16); };

    // ── 화면 글 ──
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "t3-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const addBub = (cls, html) => {
      const b = document.createElement("div"); b.className = "t3-b " + cls; b.innerHTML = html; chat.appendChild(b);
      while (chat.children.length > 5) chat.firstElementChild.remove();
      return b;
    };
    const faceFx = (cls) => { faceCv.classList.remove("shk", "yay"); void faceCv.offsetWidth; faceCv.classList.add(cls); };
    const setTmpFace = (ex, sec) => { faceTmp = ex; faceTmpT = sec; };
    const moodFace = () => (mood >= 78 ? "delight" : mood >= 58 ? "happy" : mood >= 38 ? "neutral" : mood >= 20 ? "worried" : "angry");
    const updMood = () => {
      const m = Math.round(mood); if (m === moodShown) return; moodShown = m;
      mdEm.style.setProperty("--m", m + "%"); mdEm.style.setProperty("--mc", m >= 60 ? "linear-gradient(90deg,#5fd8b0,#9fffb0)" : m >= 35 ? "linear-gradient(90deg,#ffb03b,#ffd166)" : "linear-gradient(90deg,#ff4a5a,#ff8a7a)");
      mdB.textContent = m; F.sc.textContent = `기분 ${m}`;
    };
    const addMood = (d) => { mood = clamp(mood + d, 0, 100); updMood(); };
    const sig = (n) => { barI.forEach((b, i) => b.classList.toggle("off", i >= n)); bars.classList.toggle("weak", n <= 1); };

    // ── 손가락 ──
    hand.style.backgroundImage = `url("${svgU(HAND)}")`;
    // 무대 기준 위치(움직이는 중인 변형은 무시하고 제자리 기준)
    const relPos = (e) => { let x = 0, y = 0, n = e; while (n && n !== st) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y]; };
    const handAt = (elx, mode, fx = 0.5, fy = 0.5) => {
      if (!elx) { if (hand.className !== "t3-hand") hand.className = "t3-hand"; return; }
      const [x, y] = relPos(elx);
      hand.style.left = Math.round(x + elx.offsetWidth * fx) + "px"; hand.style.top = Math.round(y + elx.offsetHeight * fy) + "px";
      const c = "t3-hand on " + mode; if (hand.className !== c) hand.className = c;
    };

    // ── 판(라운드) ──
    const speakT = () => (cur && cur.tut ? 0.6 : 0.45);
    const startRound = (sc, fl = {}) => {
      roundNo++;
      cur = { sc, ph: "speak", t: 0, W: (fl.final ? 6.2 : fl.tunnel ? 3 : 5.6) * ez, garbled: !!fl.noise, tunnel: !!fl.tunnel, final: !!fl.final, tut: !!fl.tut, bub: null, wEl: null, rd: 1 };
      cw.innerHTML = ""; haze.classList.remove("on");
      cur.bub = addBub("pa ty", "<i></i><i></i><i></i>"); faceTalk = 0.5; popIn();
      if (fl.tunnel) tunnelIn();
      if (fl.noise) noiseOn(fl.tut ? 999 : 3.6 * ez);
    };
    const garble = (s) => [...s].map((ch) => (ch === " " || rnd() < 0.35 ? ch : pick(["■", "▒", "…", "■"]))).join("");
    const reveal = () => {
      const q = fmt(cur.sc.q);
      cur.bub.className = "t3-b pa" + (cur.garbled ? " gb tap" : "");
      cur.bub.innerHTML = `<span>${cur.garbled ? garble(q) : q}</span>${cur.tut ? "" : `<span class="t3-w"><em></em></span>`}`;
      cur.wEl = cur.bub.querySelector(".t3-w");
      faceTalk = 0.9; popIn();
      const ks = cur.tunnel ? shuffle(["b", "t"]) : shuffle(["b", "o", "t"]);
      ks.forEach((k, i) => {
        const c = document.createElement("div"); c.className = "t3-card in"; c.dataset.k = k; c.textContent = fmt(cur.sc[k]); c.style.animationDelay = i * 0.06 + "s";
        bindCard(c); cw.appendChild(c);
      });
      if (cur.garbled) haze.classList.add("on");
      if (cur.tunnel) sigEl.classList.add("on");
      cur.ph = "ask"; cur.t = 0;
    };
    const clearCards = (keep) => { [...cw.children].forEach((c) => { if (c !== keep) c.classList.add("fade"); }); };
    // 답 보내기
    const sendCard = (c) => {
      if (!cur || cur.ph !== "ask" || notis.length || cur.garbled || over && !cur.final) return;
      const k = c.dataset.k, rt = cur.t;
      if (cur.tut && k === "t") {
        c.classList.remove("no"); void c.offsetWidth; c.classList.add("no"); c.style.transform = "";
        setTmpFace("angry", 1); faceFx("shk"); F.miss(); F.msg("함정 카드예요! 다른 카드를 골라 봐요"); ME.shock = 0.8;
        addBub("pa bad", pick(TRAP[cur.sc.tk])); faceTalk = 0.6; return;
      }
      // 카드가 채팅 칸으로 날아간다
      const cr = c.getBoundingClientRect(), chR = chat.getBoundingClientRect();
      c.classList.remove("drag"); c.classList.add("go");
      c.style.transform = `translate(${Math.round((chR.right - cr.right) * 0.5)}px, ${Math.round(chR.bottom - cr.bottom - 10)}px) scale(.55)`;
      clearCards(c); SFX.whoosh(); vib(10);
      if (cur.wEl) cur.wEl.remove(); cur.bub.classList.remove("tap");
      setTimeout(() => { if (done) return; cw.innerHTML = ""; addBub("me", c.textContent); ME.talk = 0.6; }, 190);
      sigEl.classList.remove("on"); haze.classList.remove("on");
      cur.ph = "react"; cur.t = 0; cur.rd = 1.05;
      if (!cur.tut) { S.n++; S.rt += rt; }
      const p = [sw * 0.5, (PY + 12) * K + 40];
      let d = 0, txt = "", cls = "", ex = "";
      if (k === "b") {
        d = cur.final ? 24 : 13; if (!cur.tut) S.best++; txt = cur.final ? "…그렇게까지 챙겨 주시니, 한번 보고 정할게요" : pick(GOOD); cls = "gd"; ex = d >= 13 && mood + d >= 70 ? "delight" : "happy";
        F.hit(p, d, "#7fe0c0"); ME.smile = 1.3; setTimeout(() => !done && faceFx("yay"), 400);
        if (cur.final) { banner("마음을 돌렸어요!", ""); for (let i = 0; i < 14; i++) sparks.push({ x: LW / 2 + (rnd() - 0.5) * 40, y: PY + 20 + rnd() * 10, vx: (rnd() - 0.5) * 40, vy: -20 - rnd() * 30, t: 0, c: pick(["#ffd166", "#7fe0c0", "#ff7eb6"]) }); }
      } else if (k === "o") {
        d = cur.final ? 0 : 4; if (!cur.tut) S.ok++; txt = cur.final ? "네… 그럼 이번 달까지만요" : pick(OKR); ex = "neutral";
        F.float(p, d ? "+" + d : "음…"); tone(560, 0.1, "triangle", 0.07); ME.smile = 0.5;
      } else {
        d = cur.final ? -25 : -20; if (!cur.tut) S.trap++; txt = pick(TRAP[cur.sc.tk]); cls = "bad"; ex = rnd() < 0.5 ? "angry" : "shock";
        F.miss(p); ME.shock = 1; setTimeout(() => !done && faceFx("shk"), 400);
      }
      if (cur.tut && k === "o") F.msg("괜찮지만 더 좋은 답이 있었어요");
      addMood(d);
      const myCur = cur;
      setTimeout(() => { if (done || cur !== myCur) return; addBub("pa " + cls, txt); faceTalk = 0.8; setTmpFace(ex, 1.1); popIn(); }, 430);
    };
    // 시간 안에 답 못 함(터널이면 끊김)
    const timeoutRound = () => {
      const t = cur; clearCards(); sigEl.classList.remove("on"); haze.classList.remove("on"); if (t.wEl) t.wEl.remove(); t.bub.classList.remove("tap");
      t.ph = "react"; t.t = 0;
      if (t.tunnel) {
        S.drop++; t.rd = 1.7; addMood(-12); dropSnd(); vib([40, 60, 40]); ME.shock = 1.2; sig(0); F.miss();
        addBub("sys red", "뚜— 뚜— 통화가 끊겼어요"); banner("통화 끊김!", "rd");
        setTimeout(() => { if (done || cur !== t) return; sig(2); ring(); addBub("sys", "다시 연결했어요"); }, 700);
        setTimeout(() => { if (done || cur !== t) return; addBub("pa bad", "전화가 왜 자꾸 끊겨요?"); faceTalk = 0.7; setTmpFace("angry", 1); faceFx("shk"); }, 1150);
      } else {
        S.to++; t.rd = 1.1; addMood(-10); SFX.fail(); vib([25, 40, 25]); ME.shock = 0.8;
        addBub("pa bad", pick(TIMEOUT)); faceTalk = 0.6; setTmpFace("worried", 1.1); F.msg("너무 늦었어요! 빨리 골라요");
      }
      if (t.final) F.msg("마지막 대답을 놓쳤어요…");
    };
    // 소음: 말풍선 톡 → 다시 듣기
    const reAsk = () => {
      if (!cur || !cur.garbled || cur.ph !== "ask" || notis.length) return;
      cur.garbled = false; haze.classList.remove("on"); SFX.tok();
      if (!cur.tut) { S.re++; addMood(-2); }
      addBub("me sm", "죄송해요, 다시 한 번만요!"); ME.talk = 0.5;
      const b = cur.bub, q = fmt(cur.sc.q);
      setTimeout(() => { if (done || !b.isConnected) return; b.className = "t3-b pa"; b.querySelector("span").textContent = q; chat.appendChild(b); while (chat.children.length > 5) chat.firstElementChild.remove(); popIn(); faceTalk = 0.8; }, 260);
      if (tut === 3) { tutP.innerHTML = `잘 들려요! 이제 알맞은 카드를<br><b class="gn">위로 쓱</b> 끌어 올려 보내요.`; }
    };
    chat.addEventListener("pointerdown", (e) => { if (cur && cur.garbled && e.target.closest(".t3-b.pa")) { e.preventDefault(); reAsk(); } });
    haze.addEventListener("pointerdown", (e) => { e.preventDefault(); reAsk(); });
    // 터널·소음
    const tunnelIn = () => { scn.b = "tunnel"; scn.edge = LW; rumble(); vib(30); scn.jolt = 0.6; scn.flick = 0.5; sig(1); sigLow = true; ME.shock = 0.7; banner("터널 진입!<small>신호 끊기기 전에 빨리 답해요</small>", "rd"); };
    const tunnelOut = () => { if (scn.a !== "tunnel" && scn.b !== "tunnel") return; scn.b = "city"; scn.edge = LW; sig(4); sigLow = false; };
    const noiseOn = (dur) => { nz.on = true; nz.t = 0; nz.dur = dur; nz.lt = 0; vib(15); };
    const noiseOff = () => { nz.on = false; nbEl.classList.remove("on"); };
    // 단톡방 알림
    const pushNoti = (txt) => {
      notis.push(txt); notiT = 0; notiSnd(); vib([12, 30, 12]); ME.angry = 0.9;
      showNoti(notis.length === 1);
    };
    const showNoti = (fresh) => {
      if (!notis.length) { notiEl.classList.remove("on"); return; }
      notiEl.classList.add("on"); ntB.textContent = notis[0]; ntE.textContent = "+" + (notis.length - 1); ntE.classList.toggle("on", notis.length > 1);
      ntEl.style.transform = ""; ntEl.style.opacity = ""; if (fresh) { ntEl.classList.remove("in"); void ntEl.offsetWidth; ntEl.classList.add("in"); }
    };
    const dismissNoti = (dir) => {
      if (!notis.length) return;
      ntEl.classList.remove("drag"); ntEl.style.transform = `translateX(${dir * 140}%) rotate(${dir * 8}deg)`; ntEl.style.opacity = "0"; SFX.sweep(); vib(8);
      notis.shift(); notiT = 0;
      setTimeout(() => { if (done) return; ntEl.style.transition = "none"; showNoti(true); void ntEl.offsetWidth; ntEl.style.transition = ""; if (!notis.length && tut === 2) tutNext(3); }, 190);
    };
    ntEl.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!notis.length) return; nd = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0 }; ntEl.classList.add("drag"); try { ntEl.setPointerCapture(e.pointerId); } catch (er) {} });
    ntEl.addEventListener("pointermove", (e) => { if (!nd) return; nd.dx = e.clientX - nd.x; ntEl.style.transform = `translateX(${nd.dx}px) rotate(${clamp(nd.dx * 0.05, -6, 6)}deg)`; ntEl.style.opacity = String(clamp(1 - Math.abs(nd.dx) / 220, 0.3, 1)); });
    const ntUp = () => {
      if (!nd) return; const d = nd; nd = null; ntEl.classList.remove("drag");
      if (Math.abs(d.dx) > 48) dismissNoti(Math.sign(d.dx));
      else { ntEl.style.transform = ""; ntEl.style.opacity = ""; if (Math.abs(d.dx) < 8) { F.msg("알림은 옆으로 쓱 밀어서 치워요"); SFX.tok(); } }
    };
    ntEl.addEventListener("pointerup", ntUp); ntEl.addEventListener("pointercancel", ntUp);
    notiEl.addEventListener("pointerdown", (e) => { if (e.target === notiEl) { e.preventDefault(); F.msg("알림을 먼저 옆으로 밀어 치워요"); } });

    // 카드 끌기: 위로 끌어 올리면 보내기
    let drag = null;
    const TH = 46;
    function bindCard(c) {
      c.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (!cur || cur.ph !== "ask" || drag) return;
        drag = { c, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, dy: 0, vy: 0, ly: e.clientY, lt: performance.now() };
        c.classList.remove("in", "wig", "no"); c.classList.add("drag"); tone(520, 0.03, "square", 0.03);
        try { c.setPointerCapture(e.pointerId); } catch (er) {}
      });
      c.addEventListener("pointermove", (e) => {
        if (!drag || drag.c !== c) return; const now = performance.now();
        drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
        const dtm = Math.max(1, now - drag.lt); drag.vy = drag.vy * 0.5 + ((e.clientY - drag.ly) / dtm) * 0.5; drag.ly = e.clientY; drag.lt = now;
        c.style.transform = `translate(${Math.round(drag.dx * 0.5)}px, ${Math.round(Math.min(drag.dy, 12))}px) rotate(${clamp(drag.dx * 0.06, -6, 6).toFixed(1)}deg) scale(1.04)`;
        chat.classList.toggle("zone", drag.dy < -TH);
      });
      const up = () => {
        if (!drag || drag.c !== c) return; const d = drag; drag = null; chat.classList.remove("zone");
        const dur = performance.now() - d.t;
        if (d.dy < -TH || (d.vy < -0.7 && d.dy < -22)) { sendCard(c); if (!c.classList.contains("go")) c.classList.remove("drag"); return; }
        c.classList.remove("drag"); c.style.transform = "";
        if (Math.abs(d.dy) < 8 && Math.abs(d.dx) < 8 && dur < 400) { c.classList.add("wig"); F.msg("카드를 위로 쓱 끌어 올려 보내요"); SFX.tok(); hintT = 1.4; hintC = c; }
      };
      c.addEventListener("pointerup", up); c.addEventListener("pointercancel", () => { if (drag && drag.c === c) { drag = null; c.classList.remove("drag"); c.style.transform = ""; chat.classList.remove("zone"); } });
    }
    let hintT = 0, hintC = null;

    // ── 다음 판 고르기 ──
    const nextRound = () => {
      if (cur && cur.tunnel) tunnelOut();
      if (cur && cur.final) { cur = null; doEnd(); return; }
      cur = null;
      const left = tm ? tm.left() : T;
      if (timeUp || left <= 9.6 || !pool.length) { finalStarted = true; startRound(FINAL, { final: true }); if (timeUp) cur.W = 4.5 * ez; return; }
      const sc = pool.shift(), fl = {};
      if (tunK < TUN_AT.length && el >= TUN_AT[tunK]) { fl.tunnel = true; tunK++; }
      else if (nzK < NZ_AT.length && el >= NZ_AT[nzK]) { fl.noise = true; nzK++; }
      startRound(sc, fl);
    };
    const onTime = () => {
      timeUp = true; ltEl.textContent = "남은 통화 0:00";
      if (!cur || cur.final) { if (cur && cur.final && cur.ph === "ask") F.msg("마지막 대답이에요!"); return; }
      if (cur.ph === "speak" || cur.ph === "ask") { if (cur.tunnel) tunnelOut(); cur.bub && cur.bub.classList.remove("tap"); if (cur.wEl) cur.wEl.remove(); cw.innerHTML = ""; haze.classList.remove("on"); sigEl.classList.remove("on"); noiseOff(); cur = null; F.msg("마지막 질문이에요!"); finalStarted = true; startRound(FINAL, { final: true }); cur.W = 4.5 * ez; }
    };

    // ── 리허설 ──
    const SKIP = `<button class="t3-skip" data-skip>건너뛰기</button>`;
    const tutNext = (n) => {
      tut = n; tutT = 0; handAt(null); tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        tutP.innerHTML = `<b>${title}</b> 전화예요! 말에 맞는 답 카드를<br><b class="gn">위로 쓱 끌어 올려</b> 보내요. <b class="rd">무리한 약속·학생 탓</b>은 함정!`; tutB.innerHTML = SKIP;
        addBub("sys", `${title}과 통화 중 · 리허설`); setTimeout(() => { if (tut === 1) startRound(SC[0], { tut: true }); }, 450);
      } else if (n === 2) {
        cur = null; cw.innerHTML = "";
        tutP.innerHTML = `회사 <b class="bl">단톡방 알림</b>이 카드를 가렸어요!<br>알림을 <b class="bl">옆으로 쓱 밀어서</b> 치워요.`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut === 2) pushNoti(TEAM[0]); }, 350);
      } else if (n === 3) {
        tutP.innerHTML = `옆자리가 시끄러워 안 들려요!<br>학부모 <b class="gd">말풍선을 톡</b> 눌러 다시 들어요.`; tutB.innerHTML = SKIP;
        setTimeout(() => { if (tut === 3) startRound(SC[1], { tut: true, noise: true }); }, 350);
      } else if (n === 4) {
        cur = null; noiseOff(); ME.smile = 1.2;
        tutP.innerHTML = `완벽해요! <b class="rd">터널</b>에선 신호가 끊기기 전에 빨리!<br>통화 끝에 <b class="gn">기분 60 이상</b>이면 재등록이에요.`;
        tutB.innerHTML = `<button class="t3-go" data-go>통화 시작!</button>`;
      }
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; handAt(null); tutEl.classList.add("off");
      cur = null; chat.innerHTML = ""; cw.innerHTML = ""; haze.classList.remove("on"); sigEl.classList.remove("on"); notis.length = 0; showNoti(); noiseOff();
      mood = 45; moodShown = -1; updMood(); Object.keys(S).forEach((k) => (S[k] = 0)); roundNo = 0; tunK = 0; nzK = 0; ntK = 0; el = 0; callT = 0; timeUp = false; finalStarted = false;
      scn.a = "city"; scn.b = null; sig(4);
      pool = opts.retry ? shuffle(SC) : shuffle(SC.slice(2)).concat(shuffle(SC.slice(0, 2)));
      ring(); vib([20, 40, 20]); banner("통화 연결!<small>재등록을 지켜라</small>");
      addBub("sys", `${title}과 통화 중`);
      updMood();
      cur = { ph: "gap", t: -0.6, rd: 0 };
      tm = timer(T, F.bar, onTime);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });

    // ── 그리기 ──
    let g = g0; const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const drawScene = (mode, x0, x1, t) => {
      const W = x1 - x0; if (W <= 0) return;
      g.save(); g.beginPath(); g.rect(x0, WY, W, WH); g.clip();
      if (mode === "city") {
        for (let x = -(scn.sc1 % 128); x < LW; x += 128) g.drawImage(CITY, x, WY, 128, WH);
        // 가까운 가로등·불빛 줄(움직임 흐림)
        for (let k = 0; k < 4; k++) { const x = ((k * 41 - scn.sc2) % 164 + 164) % 164 - 20; P(x, WY + 4, 0.8, WH - 4, "#2a2e48"); P(x - 2, WY + 3, 4.6, 0.8, "#3a3e58"); glow(g, x - 1, WY + 4.2, 5, "255,233,168", 0.45); P(x - 2, WY + 3.8, 2.6, 0.7, "#fff6d0"); }
        for (let k = 0; k < 5; k++) { const x = ((k * 37 - scn.sc2 * 1.6) % 185 + 185) % 185 - 20, y = WY + 12 + (k * 5) % 9, w = 7 + (k % 3) * 3, c = ["255,213,106", "255,138,106", "159,216,255", "255,255,255"][k % 4]; const q = g.createLinearGradient(x, 0, x + w, 0); q.addColorStop(0, `rgba(${c},0)`); q.addColorStop(0.5, `rgba(${c},.9)`); q.addColorStop(1, `rgba(${c},0)`); g.fillStyle = q; g.fillRect(x, y, w, 0.8); }
      } else if (mode === "tunnel") {
        P(0, WY, LW, WH, "#0e0e14");
        for (let x = -((scn.sc2 * 1.3 | 0) % 9); x < LW; x += 9) P(x, WY, 1, WH, "#16161e");
        P(0, WY + 15, LW, 1, "#24242e"); P(0, WY + 18, LW, 1, "#202028");
        for (let k = 0; k < 5; k++) { const x = ((k * 30 - scn.sc2 * 1.8) % 150 + 150) % 150 - 20; glow(g, x + 1.5, WY + 5.4, 7, "255,154,42", 0.45); P(x, WY + 5, 3, 0.8, "#ffd080"); }
      } else {
        // 역 승강장(집앞역)
        P(0, WY, LW, WH, "#e8e4d6"); for (let y = WY + 2; y < WY + WH; y += 4) P(0, y, LW, 1, "#d6d2c4");
        P(0, WY + 5, LW, 4, "#1f9a7a"); for (let x = -((scn.sc2 | 0) % 60); x < LW; x += 60) { P(x + 10, WY + 6, 16, 2, "#fff"); P(x + 34, WY + 6, 8, 2, "#ffd166"); }
        for (let x = -((scn.sc2 * 1.4 | 0) % 34); x < LW; x += 34) { P(x, WY, 4, WH, "#9aa6a8"); P(x, WY, 1, WH, "#c4ccd0"); }
        P(0, WY + WH - 3, LW, 3, "#f0d040");
      }
      g.restore();
    };
    const render = (tmm, dt) => {
      g = g0; g.clearRect(0, 0, LW, LH);
      // 창밖
      if (scn.b) { const e = Math.round(scn.edge); drawScene(scn.a, 0, e, tmm); drawScene(scn.b, e, LW, tmm); if (e > 0 && e < LW) P(e, WY, 1, WH, scn.b === "tunnel" ? "#000" : "#fff8"); }
      else drawScene(scn.a, 0, LW, tmm);
      // 창 반사(내 쪽 불빛)
      for (const r of WINS) { const q = g.createLinearGradient(r.x, r.y, r.x + 14, r.y + r.h); q.addColorStop(0, "rgba(255,255,255,.16)"); q.addColorStop(0.5, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(r.x, r.y, r.w, r.h); }
      const jx = scn.jolt > 0 ? (Math.floor(tmm * 30) % 2 ? 1 : -1) : 0;
      g.drawImage(BG, jx, 0, LW, LH);
      // 손잡이
      for (let i = 0; i < 7; i++) {
        const x = 7 + i * 16 + jx, sway = Math.sin(tmm * 1.7 + i * 0.7) * 1.2 * scn.spd + (scn.jolt > 0 ? Math.sin(tmm * 22) * 2 : 0);
        g.strokeStyle = "#6a7478"; g.lineWidth = 0.7; g.lineCap = "round"; g.beginPath(); g.moveTo(x + 0.5, 7.4); g.lineTo(x + 0.5 + sway * 0.6, 10); g.stroke();
        g.strokeStyle = "#f4f4f8"; g.lineWidth = 0.75; g.beginPath(); g.arc(x + 0.5 + sway, 11.6, 1.4, 0, 6.3); g.stroke(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.3; g.beginPath(); g.arc(x + 0.5 + sway, 11.8, 1.4, 0.3, 2.8); g.stroke();
      }
      // 승객(맞은편 좌석)
      const bob = Math.round(Math.sin(tmm * 1.3) * 0.6 * scn.spd);
      pax.forEach((p, i) => {
        let key = "s", o = { v: "f", sit: 1 }, flip = false, dy = 0;
        if (p.kind === "sleep") { dy = Math.floor(tmm * 0.8) % 2; }
        else if (p.kind === "phone") { o = { v: "f", sit: 1, look: Math.floor(tmm * 0.5) % 3 === 0 ? 1 : 0 }; key = "p" + o.look; }
        else { o = { v: "s", sit: 1 }; key = "side"; }
        const x = p.x + jx + (i === 1 ? bob : 0), y = 27 + dy;
        if (p.img && p.img.ok) {
          // 캐릭터 그림(상반신): 잠든 사람은 고개 끄덕, 큰 소리 통화는 입 벌린 표정
          const ex = p.kind === "sleep" ? "neutral" : p.kind === "loud" ? (nz.on ? (Math.floor(tmm * 4) % 2 ? "surprised" : "smile") : "smile") : (Math.floor(tmm * 0.5) % 3 === 0 ? "smile" : "neutral");
          const ei = EXI[ex], cw2 = 17, ch2 = cw2 * 1.3, cx2 = x + 8, top = 50.4 - ch2 + 2 + (p.kind === "sleep" ? Math.sin(tmm * 0.9) * 0.4 + 0.6 : 0);
          g.save(); g.beginPath(); g.rect(x - 2, 20, 20, 30.6); g.clip(); g.translate(cx2, top + ch2); if (p.kind === "sleep") g.rotate(0.07 + Math.sin(tmm * 0.9) * 0.03);
          g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 2 * KS; g.drawImage(p.img.im, (ei % 3) * 240, ei >= 3 ? 540 : 0, 240, 312, -cw2 / 2, -ch2, cw2, ch2); g.restore();
          if (p.kind === "sleep") { const zt = (tmm * 0.7) % 1; g.globalAlpha = 1 - zt; g.fillStyle = "#fff"; g.font = "900 3.4px sans-serif"; g.fillText("z", x + 13 + zt * 2, y + 6 - zt * 6); g.font = "900 2.4px sans-serif"; g.fillText("z", x + 15.4 + zt * 2, y + 3.6 - zt * 6); g.globalAlpha = 1; }
          if (p.kind === "phone") { rr(g, x + 5.6, y + 18.4, 4.8, 3.4, 0.6); g.fillStyle = "#22222c"; g.fill(); rr(g, x + 6.1, y + 18.8, 3.8, 2.6, 0.4); g.fillStyle = Math.floor(tmm * 3) % 2 ? "#7fd0ff" : "#ffc6e0"; g.fill(); glow(g, x + 8, y + 19, 4, "127,208,255", 0.25); }
          if (p.kind === "loud") {
            rr(g, x + 12.4, y + 5.6, 1.8, 3.6, 0.5); g.fillStyle = "#22222c"; g.fill();
            if (nz.on) for (let k = 0; k < 3; k++) { const ph = (tmm * 2.2 + k / 3) % 1, r = 2 + ph * 7; g.globalAlpha = 1 - ph; g.strokeStyle = "#ff9f7a"; g.lineWidth = 0.6; g.beginPath(); g.arc(x + 14, y + 7, r, -0.7, 0.7); g.stroke(); g.globalAlpha = 1; }
          }
        } else {
          const spr = uSprite(p.sp, key, o, flip); g.imageSmoothingEnabled = false; g.drawImage(spr, Math.round(x), Math.round(y)); g.imageSmoothingEnabled = true;
        }
      });
      // 실내 조명(터널에선 살짝 어둡게, 진입 때 깜빡)
      const inT = scn.a === "tunnel" || scn.b === "tunnel";
      if (inT || scn.flick > 0) { g.globalAlpha = scn.flick > 0 && Math.floor(tmm * 18) % 2 ? 0.35 : inT ? 0.14 : 0; P(0, 0, LW, PY, "#0a0820"); g.globalAlpha = 1; }
      g.drawImage(PHC, 0, 0, LW, LH);
      // 위층: 손, 화면 잡음, 동전, 반짝
      g = gF; g.clearRect(0, 0, LW, LH);
      if (sigLow || (cur && cur.ph === "react" && cur.tunnel && cur.t < 0.8 && S.drop)) { g.globalAlpha = 0.16; for (let k = 0; k < 70; k++) P(SX + rint(SW), SY + rint(LH - SY), 2, 1, pick(["#fff", "#000", "#9aa0b0"])); g.globalAlpha = 1; }
      coins.forEach((c) => { const w = Math.abs(Math.cos(c.t * 10)) * 1.8 + 0.25, q = g.createLinearGradient(c.x - 2, c.y - 2, c.x + 2, c.y + 2); q.addColorStop(0, "#fff6c0"); q.addColorStop(0.5, "#ffd166"); q.addColorStop(1, "#b0800c"); g.fillStyle = q; g.beginPath(); g.ellipse(c.x, c.y + 2, w, 2, 0, 0, 6.3); g.fill(); });
      sparks.forEach((s) => { g.globalAlpha = clamp(1 - s.t / 1.2, 0, 1); g.fillStyle = s.c; g.beginPath(); g.moveTo(s.x, s.y - 1.4); g.quadraticCurveTo(s.x, s.y, s.x + 1.4, s.y); g.quadraticCurveTo(s.x, s.y, s.x, s.y + 1.4); g.quadraticCurveTo(s.x, s.y, s.x - 1.4, s.y); g.quadraticCurveTo(s.x, s.y, s.x, s.y - 1.4); g.fill(); g.globalAlpha = 1; });
      // 학부모 얼굴
      const ex = faceTmpT > 0 ? faceTmp : moodFace(), talk = faceTalk > 0 && Math.floor(tmm * 8) % 2 === 1, fk = ex + (talk ? 1 : 0);
      if (fk !== faceKey) {
        faceKey = fk;
        if (faceOk) { const i = EXI[FACEX[ex] || "neutral"]; faceCv.style.backgroundPosition = `${-Math.round(((i % 3) * 240 + 40) * FZ)}px ${-Math.round(((i >= 3 ? 540 : 0) + (talk ? 3 : 0)) * FZ)}px`; }
        faceCv.classList.toggle("ang", ex === "angry" || ex === "worried"); faceCv.classList.toggle("joy", ex === "delight");
      }
      // 내 캐릭터 표정·몸짓
      if (art) {
        const ask = cur && cur.ph === "ask" && !cur.tut && cur.W - cur.t < 1.6;
        const e2 = ME.shock > 0 ? "surprised" : ME.blush > 0 ? "blush" : ME.angry > 0 ? "angry" : ME.smile > 0 ? "smile" : ME.sad > 0 ? "sad" : ask ? "surprised" : mood < 30 ? "sad" : "neutral";
        if (e2 !== meX) { meX = e2; const i = EXI[e2]; avEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 69.2308 : 0}%`; }
        let tf;
        if (ME.shock > 0) tf = `translateX(${Math.floor(tmm * 30) % 2 ? 2 : -2}px)`;
        else if (ME.talk > 0) tf = `translateY(${Math.floor(tmm * 8) % 2 ? -2 : 0}px)`;
        else tf = `translateY(${(Math.sin(tmm * 1.3) * 1.2 * scn.spd).toFixed(1)}px) rotate(${(Math.sin(tmm * 0.9) * 0.6 * scn.spd).toFixed(2)}deg)`;
        if (tf !== meT) { meT = tf; avEl.style.transform = tf; }
      }
    };

    // ── 매 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; clk += dt;
      // 열차 움직임
      scn.sc1 += dt * 6 * scn.spd; scn.sc2 += dt * 70 * scn.spd * (scn.a === "tunnel" ? 1.6 : 1);
      if (scn.b) { scn.edge -= dt * LW / 0.45; if (scn.edge <= 0) { scn.a = scn.b; scn.b = null; } }
      for (const k of ["jolt", "flick"]) if (scn[k] > 0) scn[k] -= dt;
      for (const k of Object.keys(ME)) if (ME[k] > 0) ME[k] -= dt;
      if (faceTmpT > 0) faceTmpT -= dt; if (faceTalk > 0) faceTalk -= dt; if (hintT > 0) hintT -= dt;
      if (!over && tut < 0) { clackT -= dt; if (clackT <= 0) { clackT = 0.9 + rnd() * 0.3; clack(); } }
      // 소음
      if (nz.on) {
        nz.t += dt; nz.lt -= dt;
        if (nz.lt <= 0) { nz.lt = 0.9; nbEl.textContent = pick(LOUD); nbEl.classList.remove("on"); void nbEl.offsetWidth; nbEl.classList.add("on"); chatter(); }
        if (nz.t >= nz.dur) { noiseOff(); if (cur && cur.garbled && cur.ph === "ask") { cur.garbled = false; haze.classList.remove("on"); cur.bub.className = "t3-b pa"; cur.bub.querySelector("span").textContent = fmt(cur.sc.q); popIn(); } }
      }
      // 판 진행
      if (cur) {
        cur.t += dt;
        if (cur.ph === "speak" && cur.t >= speakT()) reveal();
        else if (cur.ph === "ask" && !cur.tut) {
          const left = cur.W - cur.t, fr = clamp(left / cur.W, 0, 1);
          if (cur.wEl) { cur.wEl.firstChild.style.setProperty("--w", (fr * 100).toFixed(1) + "%"); cur.wEl.classList.toggle("low", fr < 0.3); }
          if (cur.tunnel) sigEm.style.setProperty("--s", (fr * 100).toFixed(1) + "%");
          if (left <= 0 && !drag) timeoutRound();
        } else if (cur.ph === "react" && cur.t >= cur.rd) { cur.ph = "gap"; cur.t = 0; if (cur.tunnel) tunnelOut(); if (nz.on && !cur.tut) noiseOff(); }
        else if (cur.ph === "gap" && cur.t >= 0.25) {
          if (tut === 1) tutNext(2); else if (tut === 3) tutNext(4); else if (tut < 0 && !ended) nextRound();
        }
      }
      // 리허설
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) { tut = 4; startGame(); } else tutNext(1); }
        const best = cw.querySelector('.t3-card[data-k="b"]:not(.go):not(.fade)');
        if ((tut === 1 || tut === 3) && cur && cur.ph === "ask" && !drag) { if (cur.garbled) handAt(cur.bub, "tap", 0.6, 0.6); else if (best) handAt(best, "up", 0.55, 0.4); else handAt(null); }
        else if (tut === 2 && notis.length && !nd) handAt(ntEl, "side", 0.35, 0.55);
        else handAt(null);
      } else if (!over) {
        el += dt; callT += dt; notiT += dt;
        if (tm) { const l = Math.ceil(tm.left()); ltEl.textContent = `남은 통화 0:${String(l).padStart(2, "0")}`; ltEl.classList.toggle("warn", l <= 8); }
        whoS.textContent = `통화 중 ${Math.floor(callT / 60)}:${String(Math.floor(callT % 60)).padStart(2, "0")}`;
        // 단톡방 알림
        if (ntK < NT_AT.length && el >= NT_AT[ntK] && !(cur && cur.final)) { pushNoti(TEAM[1 + (ntK % 4)]); if (ntK === 2) setTimeout(() => { if (!over && !done) pushNoti(TEAM[4]); }, 450); ntK++; }
        // 손가락: 알림·소음·첫 판·눌러만 볼 때
        const firstCard = cw.querySelector(".t3-card:not(.go):not(.fade)");
        if (notis.length && (notiT > 1.1 || el < 9) && !nd) handAt(ntEl, "side", 0.35, 0.55);
        else if (cur && cur.ph === "ask" && cur.garbled && !notis.length && cur.t > 0.7) handAt(cur.bub, "tap", 0.6, 0.6);
        else if (hintT > 0 && hintC && hintC.isConnected && !drag) handAt(hintC, "up", 0.55, 0.4);
        else if (cur && cur.ph === "ask" && roundNo === 1 && !notis.length && !drag && firstCard && cur.t > 0.4) handAt(firstCard, "up", 0.55, 0.4);
        else handAt(null);
      } else handAt(null);
      // 끝 장면
      if (endSeq) endSeq(dt);
      for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.t += dt; c.vy += 120 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > LH + 5) coins.splice(i, 1); }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; if (s.t > 1.2) sparks.splice(i, 1); }
      render(clk, dt);
      raf = requestAnimationFrame(loop);
    };

    // ── 통화 끝: 집앞역 도착 → 재등록·입금 또는 그만 ──
    const doEnd = () => {
      if (ended) return; ended = true; over = true; drag = null; nd = null; handAt(null);
      if (tm) tm.stop();
      cw.innerHTML = ""; haze.classList.remove("on"); sigEl.classList.remove("on"); notis.length = 0; showNoti(); noiseOff(); tunnelOut(); sig(4);
      const answered = S.n, all = answered + S.to + S.drop;
      const moodS = clamp((mood - 35) / 55, 0, 1), acc = all ? clamp((S.best + 0.4 * S.ok - S.trap) / all, 0, 1) : 0;
      const spdS = answered ? clamp(1 - (S.rt / answered - 1.2) / 3.5, 0, 1) : 0, resp = clamp(spdS - 0.2 * (S.to + S.drop), 0, 1);
      const score = moodS * 0.5 + acc * 0.32 + resp * 0.18, m = Math.round(mood), grade = m >= 60 ? 2 : m >= 40 ? 1 : 0;
      addBub("sys", `통화 종료 · ${Math.floor(callT / 60)}:${String(Math.floor(callT % 60)).padStart(2, "0")}`); tone(620, 0.12, "sine", 0.08); tone(420, 0.18, "sine", 0.08, 0, 0.14);
      ledS.textContent = "이번 역은 집앞역입니다 · 오늘도 수고하셨습니다 · 내리실 문은 오른쪽입니다"; led.classList.add("arr");
      let t = 0, step = 0;
      endSeq = (dt) => {
        t += dt; scn.spd = Math.max(0, 1 - t / 1.8);
        if (step === 0 && t > 0.5) { step = 1; scn.b = "station"; scn.edge = LW; noise(0.6, 900, 0.06, 0, 0.8); tone(300, 0.6, "sine", 0.03, -120); }
        if (step === 1 && t > 1.7) {
          step = 2; scn.jolt = 0.25; noise(0.25, 400, 0.08); finEl.style.top = Math.round((ph.clientHeight || 300) * 0.24) + "px";
          const msg = grade === 2 ? "선생님~ 다음 달도 잘 부탁드려요 ^^" : grade === 1 ? "한 달만 더 지켜볼게요. 잘 부탁드려요" : "그동안 감사했어요. 이번 달까지만 할게요";
          finEl.innerHTML = `<div class="t3-fc${grade ? "" : " sad"}"><i>온</i><div><small>과외온 · ${grade ? "재등록 알림" : "수업 종료 알림"} · 방금</small><b>${title}</b><p>${msg}</p></div></div>`;
          finEl.classList.add("on"); notiSnd(); vib([15, 40, 15]);
          if (grade) { ME.blush = 4; setTmpFace(grade === 2 ? "delight" : "happy", 9); } else { ME.sad = 4; setTmpFace("worried", 9); sadSnd(); }
        }
        if (step === 2 && t > 2.6) {
          step = 3; const dep = document.createElement("div");
          if (grade) {
            dep.className = "t3-dep"; dep.innerHTML = `입금 <b>+360,000원</b>`; finEl.appendChild(dep);
            for (let k = 0; k < (RM() ? 6 : 26); k++) coins.push({ x: LW / 2 + (rnd() - 0.5) * 20, y: PY + 40, vx: (rnd() - 0.5) * 70, vy: -60 - rnd() * 60, t: rnd() });
            for (let k = 0; k < 5; k++) coinSnd(k * 0.09); setTimeout(() => !done && SFX.ding(4), 450); vib([20, 30, 20, 30, 40]);
            if (grade === 2) banner("재등록 성공!<small>다음 달도 투잡 수입 확보</small>");
          } else { dep.className = "t3-dep no"; dep.innerHTML = `다음 달 수업 <b>취소됨</b>`; finEl.appendChild(dep); SFX.fail(); banner("재등록 실패…", "rd"); }
        }
        if (t > 5.4 && !done) {
          done = true; cancelAnimationFrame(raf);
          const reg = grade === 2 ? "재등록 성공" : grade === 1 ? "한 달 더 지켜보기" : "재등록 실패";
          finish(score, `학부모 기분 <b>${m}</b> · 좋은 답 ${S.best}/${all} · ${reg}`, "", [["학부모 기분", moodS], ["상황 판단", acc], ["빠른 응답", resp]]);
        }
      };
    };

    const sendKey = (k) => { const c = cw.querySelector(`.t3-card[data-k="${k}"]:not(.go):not(.fade)`); if (c) sendCard(c); };
    if (dbg) dbg.tutoring3 = {
      st: () => ({ el: +el.toFixed(2), tut, mood: Math.round(mood), ...S, ph: cur && cur.ph, garbled: !!(cur && cur.garbled), tunnel: !!(cur && cur.tunnel), final: !!(cur && cur.final), notis: notis.length, over, timeUp, art, scene: scn.a }),
      tut: () => tut, start: startGame, sendKey, reAsk, dismissNoti,
      tutDo: () => { if (tut === 2 && notis.length) dismissNoti(1); else if ((tut === 1 || tut === 3) && cur && cur.ph === "ask" && cur.t > 0.3) { if (cur.garbled) reAsk(); else sendKey("b"); } else if (tut === 4) startGame(); },
      auto: () => { if (tut >= 0 || over) return; if (notis.length) { if (notiT > 0.3) dismissNoti(1); return; } if (cur && cur.ph === "ask") { if (cur.garbled) { if (cur.t > 0.3) reAsk(); return; } if (cur.t > 0.6) sendKey("b"); } },
      bad: () => { if (tut >= 0 || over) return; if (cur && cur.ph === "ask" && !notis.length && !cur.garbled && cur.t > 1.2) sendKey(pick(["t", "o", "t"])); },
    };
    sig(4); updMood(); render(0, 0);
    raf = requestAnimationFrame(loop);
  },
};
