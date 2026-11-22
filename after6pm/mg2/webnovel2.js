// 웹소설 2탄(webnovel2) "작가님 절단신공": 오늘 회차는 다 썼다. 이제 어디서 '다음 화에 계속'으로 끊을지가 승부.
// 원고가 위로 흘러가고, 오른쪽 '긴장도' 파형이 같이 흐른다. 빨간 점선(절단각)을 넘는 진짜 꼭대기 줄이
// 가위선에 왔을 때 톡 → 가위가 지나가고 "다음 화에 계속" 도장이 쾅. 너무 일찍(분량 표시 전)이면 "분량 실화?",
// 늦으면 긴장이 풀려 독자 이탈이 오른다. 점선 아래 작은 봉우리(가짜 꼭대기)에 속으면 손해. 회차 4개를 이어서.
// 마지막엔 '다음 화 결제' 숫자가 쭉 오르고 유료 전환율이 나온다.
// 그림(11-22 2차): 방은 실제 배경 그림(img/bg/online.webp)+흐림, 나는 캐릭터 그림 표정 시트, 책상·노트북·가위·긴장도 파형·이탈 막대는 기기 해상도 벡터.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const EPS = 4, TH = 0.8;
// 장르: 이름, 색, 작품 제목, 줄 묶음(평온·대사·위기·가짜 꼭대기·절단 줄·풀린 뒤)
const GEN = {
  reg: { n: "회귀물", c: "#5fb8ff", t: "회귀한 신입은 칼퇴한다",
    calm: ["출근 첫날 아침이었다.", "엘리베이터가 열렸다.", "책상에 서류가 쌓였다.", "커피가 식어 갔다.", "창밖에 벚꽃이 졌다.", "팀장이 하품을 했다.", "모니터가 깜빡였다.", "점심은 김치찌개였다."],
    talk: ["“이번엔 안 당해.”", "“그 주식, 지금 사.”", "“부장님, 그거 망해요.”", "“너 그때 나 버렸지.”", "“10년 전이라고?”", "“이번 생은 칼퇴다.”", "“회의 5분이면 돼요.”"],
    crisis: ["회장실 문이 잠겼다.", "기억과 다른 일이 터졌다.", "누가 내 이름을 불렀다.", "결재판이 바뀌어 있었다.", "전생의 그가 웃었다."],
    fake: ["“잠깐, 이상한데?”", "전화벨이 울렸다!", "“누구세요?!”", "탕비실에서 비명이!", "커피를 엎질렀다!"],
    cliff: ["회귀한 건 나만이 아니었다—", "그가 속삭였다. “또 왔네?”", "달력이 다시 거꾸로—", "“넌 이번이 네 번째야.”"],
    after: ["…라는 꿈을 꿨다.", "다행히 별일 없었다.", "그리고 퇴근했다.", "모두 웃고 넘어갔다.", "평화로운 오후였다.", "커피를 한 잔 더 마셨다."] },
  rof: { n: "로판", c: "#ff8fc8", t: "북부 대공의 계약 약혼녀",
    calm: ["샹들리에가 반짝였다.", "정원에 장미가 폈다.", "하녀가 차를 내왔다.", "무도회장은 붐볐다.", "은발이 달빛에 젖었다.", "마차가 성문을 지났다.", "드레스 자락이 끌렸다."],
    talk: ["“이 계약, 1년이에요.”", "“공작님, 놓아 주세요.”", "“드레스 말고 검을요.”", "“당신만은 지키겠소.”", "“황녀님이 오십니다.”", "“춤 한 곡 추시겠소?”"],
    crisis: ["황제의 칙서가 왔다.", "독이 든 잔이었다.", "검이 목에 닿았다.", "약혼반지가 깨졌다.", "대공의 눈이 붉어졌다."],
    fake: ["“어머, 공작님!”", "찻잔이 쨍 깨졌다!", "“무례하군요!”", "누군가 뺨을 쳤다!", "음악이 뚝 멈췄다!"],
    cliff: ["대공은 처음부터 알았다—", "“당신, 악녀가 아니군.”", "가면 아래 얼굴은, 나였다—", "“이 결혼, 무효요.”"],
    after: ["그리고 차를 마셨다.", "무도회는 무사히 끝났다.", "다들 잠자리에 들었다.", "평온한 아침이 왔다.", "정원사가 꽃을 심었다."] },
  mur: { n: "무협", c: "#ffb03b", t: "천하제일 야근검",
    calm: ["객잔에 비가 내렸다.", "대숲에 바람이 불었다.", "점소이가 술을 날랐다.", "산길은 고요했다.", "내공이 천천히 돌았다.", "만두가 김을 뿜었다.", "강물이 느리게 흘렀다."],
    talk: ["“검을 뽑아라.”", "“사부님의 원수다!”", "“점소이, 술 한 동이!”", "“강호가 날 부른다.”", "“이 초식을 받아라!”", "“네놈, 어느 문파냐?”"],
    crisis: ["검기가 대숲을 갈랐다.", "독침이 날아들었다.", "단전이 터질 듯했다.", "포위당했다. 백 명이다.", "피가 칼끝을 탔다."],
    fake: ["“게 섰거라!”", "탁자가 쪼개졌다!", "술잔이 날아왔다!", "“흥, 제법이구나!”", "지붕 위에 그림자가!"],
    cliff: ["사부가 마교 교주였다—", "가면을 벗자, 그는—", "“네 아비는 내가 죽였다.”", "검이 내 가슴을 꿰뚫—"],
    after: ["그리고 국수를 먹었다.", "객잔은 다시 조용했다.", "다들 푹 잤다.", "날이 밝았다. 평화롭다.", "만두를 하나 더 시켰다."] },
};
// 독자 댓글(닉네임은 지어낸 말 조합)
const NICK_A = ["새벽", "출근길", "야근", "정주행", "월요병", "퇴근한", "졸린", "말랑", "주말", "통통", "꿈꾸는", "느긋한"];
const NICK_B = ["독자", "감자", "고양이", "만두", "펭귄", "라떼", "도토리", "붕어빵", "호떡", "두부", "판다", "치즈"];
const CM = {
  perfect: ["아 여기서 끊어?!ㅋㅋ 결제함", "작가님 절단신공 미쳤다", "결제 버튼 누르는 손이 떨림", "다음 화 내놔요 당장!!", "와 소름… 바로 결제", "이 맛에 노블리 해요ㅠ"],
  soon: ["어? 벌써 끝? 좀 아쉽…", "한 줄만 더 보여 주지…", "애매하게 끊네ㅋㅋ"],
  fake: ["엥 여기서 끊는다고?", "이게 끊을 자리…?", "흠… 별로 안 궁금함"],
  early: ["분량 실화?", "읽다가 끝나서 당황", "오늘 분량 혜자 아니네요ㅠ"],
  late: ["흠…", "긴장감 다 풀렸네", "여기까지 보면 결제 안 하지…", "끊을 타이밍 놓치셨다ㅋㅋ"],
  end: ["결말까지 다 알려 주심ㅋㅋ", "다음 화 안 봐도 되겠다", "흠… 할 말이 없다"],
};
const RES = { perfect: ["절단신공!", "gd"], soon: ["살짝 일찍", ""], fake: ["가짜 꼭대기!", "rd"], early: ["분량 실화?", "rd"], late: ["늦었다…", "rd"], end: ["다 풀어 버림", "rd"] };
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
const tint = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join(""); };
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const tcol = (t) => (t >= TH ? "#ff3b5c" : t >= 0.58 ? "#ff8fc8" : t >= 0.33 ? "#5fb8ff" : "#3a6ea8");
// 가위(오른쪽을 보고 벌린 모양, 벡터)
const SCI_IN = `<g stroke-linecap="round"><path d="M10 11L25 22M10 33L25 22" stroke="#2a1e2e" stroke-width="6.6"/><path d="M10 11L25 22M10 33L25 22" stroke="#ff4b5c" stroke-width="4"/></g><circle cx="9" cy="10" r="6.4" fill="none" stroke="#2a1e2e" stroke-width="6"/><circle cx="9" cy="10" r="6.4" fill="none" stroke="#ff4b5c" stroke-width="3.6"/><circle cx="9" cy="34" r="6.4" fill="none" stroke="#2a1e2e" stroke-width="6"/><circle cx="9" cy="34" r="6.4" fill="none" stroke="#ff4b5c" stroke-width="3.6"/><path d="M7 6.5a4 4 0 0 1 4-.5" stroke="#ffb0b8" stroke-width="1.2" fill="none"/><path d="M23 20.5L54 8l1 3.6-28 12.4z" fill="#eef1f7" stroke="#2a1e2e" stroke-width="1.4" stroke-linejoin="round"/><path d="M23 23.5L54 36l1-3.6-28-12.4z" fill="#cfd5e2" stroke="#2a1e2e" stroke-width="1.4" stroke-linejoin="round"/><path d="M28.5 20.6L52 10.6" stroke="#fff" stroke-width="1.1"/><circle cx="25" cy="22" r="2.7" fill="#ffd166" stroke="#2a1e2e" stroke-width="1.2"/>`;
const SCI_URL = svgU(svgW("0 0 56 44", SCI_IN));
const sciG = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${SCI_IN}</g>`;

// 방법 화면 그림(벡터 3장)
function stepPics() {
  const bg = `<rect width="80" height="80" rx="12" fill="#17142c"/>`;
  const panel = (curve) => `<rect x="6" y="5" width="68" height="70" rx="6" fill="#141a32" stroke="#2a3458" stroke-width="1.2"/><rect x="56" y="5" width="18" height="70" fill="#ff3b5c" opacity=".1"/><defs><linearGradient id="tg" x1="8" x2="70" gradientUnits="userSpaceOnUse"><stop offset=".3" stop-color="#3a6ea8"/><stop offset=".45" stop-color="#5fb8ff"/><stop offset=".68" stop-color="#ff8fc8"/><stop offset=".8" stop-color="#ff3b5c"/></linearGradient></defs><path d="${curve}" fill="url(#tg)" stroke="#fff" stroke-width="1.2"/><path d="M56 7v66" stroke="#ff3b5c" stroke-width="1.6" stroke-dasharray="3 2"/>`;
  const a = svgW("0 0 80 80", bg + panel("M7 6H16C20 14 22 18 22 24 26 26 44 28 44 33 44 38 28 40 24 44 22 52 26 60 24 74H7z") + `<rect x="44" y="20" width="26" height="16" rx="4" fill="#fffaf0"/><text x="57" y="31.5" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="9" fill="#c0303a">참기</text>`);
  const b = svgW("0 0 80 80", bg + panel("M7 6H14C18 16 20 22 26 28 40 32 66 34 66 40 66 46 40 48 26 52 20 60 18 66 16 74H7z") + `<path d="M2 40H78" stroke="#ff3b5c" stroke-width="1.8" stroke-dasharray="4 2.5"/>` + sciG(-2, 31, 0.42) + sparkG(70, 22, 5, "#ffd166") + sparkG(72, 58, 4, "#fff3b0"));
  const c = svgW("0 0 80 80", bg + `<rect x="10" y="6" width="56" height="64" rx="4" fill="#fbf6ea"/><g fill="#c8b8a0"><rect x="16" y="13" width="40" height="2.4" rx="1.2"/><rect x="16" y="19" width="34" height="2.4" rx="1.2"/><rect x="16" y="25" width="38" height="2.4" rx="1.2"/></g><g transform="rotate(-10 38 46)"><rect x="15" y="34" width="46" height="22" rx="4" fill="none" stroke="#d8263a" stroke-width="2.6"/><rect x="18.5" y="37.5" width="39" height="15" rx="2" fill="none" stroke="#d8263a" stroke-width="1.2"/><text x="38" y="48.6" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="8.4" fill="#d8263a">다음 화에</text></g><circle cx="64" cy="64" r="10" fill="#c9961c"/><circle cx="64" cy="64" r="8" fill="#ffd166"/><text x="64" y="68" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="10" fill="#a86a00">₩</text>`);
  return [[`<img src="${svgU(a)}" alt="">`, "작은 봉우리는 참기"], [`<img src="${svgU(b)}" alt="">`, "꼭대기에서 톡"], [`<img src="${svgU(c)}" alt="">`, "다음 화 결제!"]];
}

export const GAME = {
  key: "webnovel2", base: "webnovel", jc: "#5fb8ff", n: "작가님 절단신공", desc: "오늘 회차는 다 썼다. 어디서 '다음 화에 계속'으로 끊을지가 결제를 가른다",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 원고가 위로 흘러가고, 오른쪽 <b>긴장도 그래프</b>가 같이 흘러가요.",
    "그래프가 <b>빨간 점선(절단각)</b>을 넘은 꼭대기 줄이 <b>가위선</b>에 오면 톡! 점선 아래 작은 봉우리는 가짜 꼭대기예요.",
    "<b>분량 OK</b> 선이 지나기 전에 자르면 \"분량 실화?\", 꼭대기를 지나면 <b>독자 이탈</b>이 올라요. 회차 4개를 이어서 끊어요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "작은 봉우리는 참기"], ["", "꼭대기에서 톡"], ["", "다음 화 결제!"]]; } },
  css: `
.mg-webnovel2 .wz-st{background:#0d0a18!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-webnovel2 .wz-cv{position:absolute;left:0;top:0;z-index:0;touch-action:none;pointer-events:none}
.mg-webnovel2 .wz-bgi{position:absolute;left:0;top:0;right:0;z-index:0;overflow:hidden;pointer-events:none;background:#1a1530}
.mg-webnovel2 .wz-bgi::before{content:"";position:absolute;inset:-6px;background:url("img/bg/online.webp") 70% 6%/170% auto no-repeat;filter:brightness(.6) saturate(1.1) blur(1.2px)}
.mg-webnovel2 .wz-bgi::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,transparent 45%,#05031088),linear-gradient(#0a081c55,transparent 40%)}
.mg-webnovel2 .wz-cv.wz-fr{z-index:2}
.mg-webnovel2 .mg-steps img{width:76px;height:76px}
.mg-webnovel2 .mg-msg{z-index:24}
.mg-webnovel2 .wz-rc{position:absolute;left:0;top:0;right:0;z-index:1;overflow:hidden;pointer-events:none}
.mg-webnovel2 .wz-me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter .4s;transform-origin:50% 90%}
.mg-webnovel2 .wz-me.on{opacity:1}
.mg-webnovel2 .wz-say{position:absolute;left:50%;z-index:7;transform:translate(-50%,-100%) scale(.4);transform-origin:50% 100%;opacity:0;background:#fff;color:#2a1e2e;font-weight:800;font-size:12px;padding:4px 9px;border-radius:11px;white-space:nowrap;box-shadow:0 3px 0 #0005;pointer-events:none;transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s}
.mg-webnovel2 .wz-say.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
.mg-webnovel2 .wz-say.sl{background:#d8d4f0;color:#3a3466}
.mg-webnovel2 .wz-say.gd{background:#ffd166;color:#3a2400}
.mg-webnovel2 .wz-say.rd{background:#ff8fa0;color:#3a0010}
.mg-webnovel2 .wz-eps{position:absolute;left:6px;top:6px;z-index:6;display:flex;gap:3px;background:#0009;border-radius:7px;padding:3px 5px;pointer-events:none}
.mg-webnovel2 .wz-eps i{width:22px;height:16px;border-radius:4px;background:#ffffff14;border:1px solid #ffffff30;font-style:normal;font-size:9px;font-weight:900;color:#ffffff80;display:flex;align-items:center;justify-content:center}
.mg-webnovel2 .wz-eps i.now{border-color:#5fb8ff;color:#fff;animation:wzblink .7s infinite alternate}
.mg-webnovel2 .wz-eps i.g0{background:#ffd166;color:#3a2400;border-color:#fff3b0;animation:wzpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-eps i.g1{background:#5fb8ff;color:#06203a;border-color:#9fd8ff;animation:wzpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-eps i.g2{background:#c0303a;color:#fff;border-color:#ff8fa0;animation:wzpop .4s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-pp{position:absolute;left:8px;right:8px;z-index:4;background:#fbf6ea;border-radius:9px;box-shadow:0 3px 0 #0007,inset 0 0 0 1px #e6dcc6;overflow:hidden}
.mg-webnovel2 .wz-pp.shk{animation:wzshk .3s}
.mg-webnovel2 .wz-ph{position:absolute;left:0;right:0;top:0;height:22px;display:flex;align-items:center;gap:5px;padding:0 7px;background:#ece3cf;color:#5a4a3a;font-size:10.5px;z-index:3}
.mg-webnovel2 .wz-ph i{width:15px;height:15px;background-size:100% 100%;flex:none}
.mg-webnovel2 .wz-ph b{font-weight:900;color:#3a2a1e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.mg-webnovel2 .wz-ph span{white-space:nowrap;font-weight:800;color:var(--gc)}
.mg-webnovel2 .wz-ph em{margin-left:auto;font-style:normal;font-weight:900;font-size:10px;color:#fff;background:#8a7a6a;border-radius:5px;padding:1px 6px;white-space:nowrap;transition:background .2s}
.mg-webnovel2 .wz-ph em.ok{background:#1f9a4a}
.mg-webnovel2 .wz-ph em.bump{animation:wzbump .3s}
.mg-webnovel2 .wz-bd{position:absolute;left:0;right:0;bottom:0;overflow:hidden}
.mg-webnovel2 .wz-tx{position:absolute;left:0;top:0;bottom:0;overflow:hidden}
.mg-webnovel2 .wz-in{position:absolute;left:0;right:0;top:0;will-change:transform}
.mg-webnovel2 .wz-l{position:absolute;left:0;right:0;height:28px;display:flex;align-items:center;padding:0 4px 0 21px;box-sizing:border-box;font-family:"Nanum Myeongjo","Noto Serif KR",Batang,serif;font-size:12px;color:#5a4a3a;white-space:nowrap;transition:background .15s}
.mg-webnovel2 .wz-l span{overflow:hidden;text-overflow:ellipsis}
.mg-webnovel2 .wz-l::before{content:"";position:absolute;left:15px;top:7px;bottom:7px;width:3px;border-radius:2px;background:var(--lc,#c8b8a0)}
.mg-webnovel2 .wz-l.k-talk{color:#1f3a66;font-weight:700;--lc:#5fb8ff}
.mg-webnovel2 .wz-l.k-crisis,.mg-webnovel2 .wz-l.k-fake{color:#8a2a10;font-weight:800;--lc:#ff8a3d}
.mg-webnovel2 .wz-l.k-cliff{color:#2a0a10;font-weight:900;--lc:#ff3b5c}
.mg-webnovel2 .wz-l.k-after{color:#9a9488;--lc:#d0c8b8}
.mg-webnovel2 .wz-l.cur{background:#ffe27a66}
.mg-webnovel2 .wz-l.past{opacity:.55}
.mg-webnovel2 .wz-l.drop{transition:transform .7s cubic-bezier(.5,0,.9,.6),opacity .7s;opacity:0!important}
.mg-webnovel2 .wz-l.pk{background:#ffd16655}
.mg-webnovel2 .wz-ok{position:absolute;left:4px;right:2px;height:0;border-top:2px dashed #1f9a4a;pointer-events:none}
.mg-webnovel2 .wz-ok b{position:absolute;right:0;top:-8px;font-size:9px;font-weight:900;color:#fff;background:#1f9a4a;border-radius:4px;padding:0 4px;font-family:sans-serif}
.mg-webnovel2 .wz-ok.drop{transition:transform .7s,opacity .7s;opacity:0}
.mg-webnovel2 .wz-gr{position:absolute;right:0;top:0}
.mg-webnovel2 .wz-fog{position:absolute;right:0;bottom:0;background:repeating-linear-gradient(135deg,#1a2040 0 6px,#141a32 6px 12px);display:flex;align-items:center;justify-content:center;color:#5a6a9a;font-weight:900;font-size:20px;letter-spacing:4px;transition:opacity .4s;border-top:1px dashed #5a6a9a}
.mg-webnovel2 .wz-fog small{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:0;color:#5a6a9a}
.mg-webnovel2 .wz-fog.off{opacity:0}
.mg-webnovel2 .wz-thl{position:absolute;top:2px;transform:translateX(-50%);font-size:9px;font-weight:900;color:#fff;background:#c0303a;border-radius:4px;padding:0 3px;white-space:nowrap;pointer-events:none;z-index:2}
.mg-webnovel2 .wz-gl{position:absolute;top:2px;font-size:9px;font-weight:900;color:#9fb0e0;white-space:nowrap;pointer-events:none;z-index:2}
.mg-webnovel2 .wz-cut{position:absolute;left:0;right:0;height:0;border-top:2px dashed #ff3b5c;z-index:2;pointer-events:none}
.mg-webnovel2 .wz-cut i{position:absolute;left:0;top:-12px;width:28px;height:22px;background-size:100% 100%;filter:drop-shadow(0 1px 1px #0006)}
.mg-webnovel2 .wz-cut.snip{border-top-style:solid}
.mg-webnovel2 .wz-cut.snip i{animation:wzsnip .38s ease-in forwards}
.mg-webnovel2 .wz-vig{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 26px 6px #ff2040;opacity:0;z-index:2}
.mg-webnovel2 .wz-stamp{position:absolute;left:50%;z-index:5;transform:translate(-50%,-50%) rotate(-8deg) scale(2.6);opacity:0;pointer-events:none;color:#d8263a;border:3px solid #d8263a;outline:2px solid #d8263a;outline-offset:2px;border-radius:6px;padding:4px 12px;font-weight:900;font-size:20px;letter-spacing:1px;white-space:nowrap;background:#fbf6eacc;text-shadow:0 0 1px #d8263a}
.mg-webnovel2 .wz-stamp.on{animation:wzstamp .32s cubic-bezier(.5,0,.7,1.4) forwards}
.mg-webnovel2 .wz-stamp.meh{color:#6a6a7a;border-color:#6a6a7a;outline-color:#6a6a7a;text-shadow:none}
.mg-webnovel2 .wz-cms{position:absolute;left:8px;right:8px;z-index:6;display:flex;flex-direction:column;gap:4px;pointer-events:none}
.mg-webnovel2 .wz-cm{align-self:flex-end;max-width:92%;background:#1a2236ee;border-radius:10px 10px 2px 10px;padding:4px 9px;color:#fff;font-size:12px;line-height:1.3;display:flex;align-items:center;gap:6px;box-shadow:0 2px 0 #0006;animation:wzcm .3s cubic-bezier(.2,.9,.3,1)}
.mg-webnovel2 .wz-cm b{font-size:10px;color:#9fd8ff;font-weight:800;white-space:nowrap}
.mg-webnovel2 .wz-cm small{font-size:10px;color:#ff8fc8;font-weight:800;white-space:nowrap}
.mg-webnovel2 .wz-cm.meh{background:#3a2a36ee}
.mg-webnovel2 .wz-cm.meh b{color:#c8b0c0}
.mg-webnovel2 .wz-cm.gd{background:linear-gradient(90deg,#1f6fd0ee,#5fb8ffcc);box-shadow:0 2px 0 #0006,inset 0 0 0 1px #9fd8ff}
.mg-webnovel2 .wz-cm.out{opacity:0;transform:translateY(-8px);transition:opacity .3s,transform .3s}
.mg-webnovel2 .wz-dr{position:absolute;left:8px;right:8px;z-index:4;background:#141a2a;border-radius:8px;box-shadow:0 2px 0 #0007;display:flex;align-items:center;gap:6px;padding:0 8px;box-sizing:border-box}
.mg-webnovel2 .wz-dr span{font-size:10.5px;font-weight:800;color:#ff8fa0;white-space:nowrap;line-height:1.1}
.mg-webnovel2 .wz-dr span small{display:block;font-size:9px;color:#8a90b0;font-weight:700}
.mg-webnovel2 .wz-dr canvas{background:#0c1020;border-radius:4px}
.mg-webnovel2 .wz-dr b{margin-left:auto;font-size:14px;font-weight:900;color:#ff8fa0;white-space:nowrap}
.mg-webnovel2 .wz-dr b.up{animation:wzbump .3s}
.mg-webnovel2 .wz-btn{position:absolute;left:8px;right:8px;z-index:8;border:0!important;border-radius:14px!important;padding:0!important;background:linear-gradient(#ff6a7a,#d8263a)!important;box-shadow:0 4px 0 #7a1020!important;color:#fff!important;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:900;font-size:17px;letter-spacing:1px;cursor:pointer;touch-action:none}
.mg-webnovel2 .wz-btn i{width:36px;height:28px;background-size:100% 100%;filter:drop-shadow(0 2px 0 #0005)}
.mg-webnovel2 .wz-btn small{font-size:10.5px;font-weight:700;opacity:.9;letter-spacing:0}
.mg-webnovel2 .wz-btn:active,.mg-webnovel2 .wz-btn.prs{transform:translateY(3px);box-shadow:0 1px 0 #7a1020!important}
.mg-webnovel2 .wz-btn.hot{animation:wzhot .3s infinite alternate}
.mg-webnovel2 .wz-btn.dim{filter:saturate(.3) brightness(.7)}
.mg-webnovel2 .wz-ban{position:absolute;left:50%;z-index:16;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:24px;white-space:nowrap;pointer-events:none;color:#fff;text-shadow:0 0 2px #000,0 3px 0 #1f6fd0,0 0 16px #1f6fd0;text-align:center}
.mg-webnovel2 .wz-ban small{display:block;font-size:12.5px;color:#fff}
.mg-webnovel2 .wz-ban.on{animation:wzban 1.5s ease-out forwards}
.mg-webnovel2 .wz-ban.gd{color:#ffd166;text-shadow:0 0 2px #000,0 3px 0 #a86a00,0 0 16px #ffb03b}
.mg-webnovel2 .wz-tut{position:absolute;left:10px;right:10px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-webnovel2 .wz-tut.off{opacity:0;visibility:hidden}
.mg-webnovel2 .wz-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #5fb8ff;max-width:310px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-webnovel2 .wz-tut.pop .wz-tc{animation:wzpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-webnovel2 .wz-tc em{font-style:normal;display:inline-block;background:#1f6fd0;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-webnovel2 .wz-tc p{margin:0}
.mg-webnovel2 .wz-tc b.rd{color:#c0303a}.mg-webnovel2 .wz-tc b.gn{color:#1f9a4a}.mg-webnovel2 .wz-tc b.bl{color:#1f6fd0}
.mg-webnovel2 .wz-tb{margin-top:5px;display:flex;justify-content:center}
.mg-webnovel2 .wz-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-webnovel2 .wz-go{background:linear-gradient(#5fb8ff,#1f6fd0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #0d3a80!important;animation:wzpulse .5s infinite alternate}
.mg-webnovel2 .wz-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-37px 0 0 -14px;background-size:100% 100%;pointer-events:none;display:none;filter:drop-shadow(0 2px 2px #0009)}
.mg-webnovel2 .wz-hand.on{display:block;animation:wztap .8s infinite}
.mg-webnovel2 .wz-end{position:absolute;left:0;right:0;bottom:0;z-index:25;background:linear-gradient(#0f1830,#0a0f20);display:flex;flex-direction:column;gap:8px;padding:10px 12px 10px;animation:wzup .45s cubic-bezier(.2,.9,.3,1);border-top:2px solid #5fb8ff;box-sizing:border-box}
.mg-webnovel2 .wz-eh{display:flex;align-items:center;gap:6px;color:#fff;font-size:12.5px;font-weight:800;white-space:nowrap}
.mg-webnovel2 .wz-eh i{font-style:normal;font-weight:900;background:#5fb8ff;color:#0a1a33;border-radius:5px;padding:1px 6px;font-size:11px}
.mg-webnovel2 .wz-eh em{font-style:normal;margin-left:auto;color:#7CFC9A;font-weight:900;font-size:11px}
.mg-webnovel2 .wz-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;height:128px;align-items:end}
.mg-webnovel2 .wz-bar{display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end}
.mg-webnovel2 .wz-bar u{text-decoration:none;font-size:11px;font-weight:900;color:#fff}
.mg-webnovel2 .wz-bar s{text-decoration:none;display:block;flex:none;width:70%;height:var(--h,4px);border-radius:5px 5px 0 0;background:linear-gradient(var(--bc),#ffffff22);box-shadow:inset 0 2px 0 #ffffff66;animation:wzgrow 1s .15s cubic-bezier(.2,.9,.3,1) backwards}
@keyframes wzgrow{from{height:0}}
.mg-webnovel2 .wz-bar i{width:16px;height:16px;background-size:100% 100%}
.mg-webnovel2 .wz-bar small{font-size:9.5px;font-weight:800;color:var(--bc);white-space:nowrap}
.mg-webnovel2 .wz-big{text-align:center;color:#c8d8f0;font-size:12px;font-weight:700}
.mg-webnovel2 .wz-big b{display:block;font-size:34px;font-weight:900;color:#ffd166;line-height:1.15;text-shadow:0 3px 0 #a86a00}
.mg-webnovel2 .wz-big b.pop{animation:wzbump .3s}
.mg-webnovel2 .wz-rate{display:flex;align-items:center;gap:8px;background:#ffffff10;border-radius:10px;padding:7px 10px;color:#fff;font-size:12px;font-weight:800;opacity:0;animation:wzst .4s 1.5s forwards}
.mg-webnovel2 .wz-rate b{margin-left:auto;font-size:20px;color:#7CFC9A;font-weight:900}
.mg-webnovel2 .wz-best{background:linear-gradient(90deg,#1f6fd0aa,#5fb8ff55);box-shadow:inset 0 0 0 1px #9fd8ff;border-radius:10px;padding:6px 10px;color:#fff;font-size:12.5px;opacity:0;animation:wzst .4s 2s forwards}
.mg-webnovel2 .wz-best b{color:#ffd166;font-size:10.5px;margin-right:6px}
@keyframes wzblink{to{background:#5fb8ff44}}
@keyframes wzpop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes wzbump{50%{transform:scale(1.25)}}
@keyframes wzshk{20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,1px)}80%{transform:translate(2px,0)}}
@keyframes wzsnip{0%{left:0}100%{left:calc(100% - 20px)}}
@keyframes wzstamp{0%{opacity:0;transform:translate(-50%,-50%) rotate(-14deg) scale(2.6)}70%{opacity:1;transform:translate(-50%,-50%) rotate(-7deg) scale(.92)}100%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(1)}}
@keyframes wzcm{from{opacity:0;transform:translateX(30px)}}
@keyframes wzhot{to{filter:brightness(1.2);box-shadow:0 4px 0 #7a1020,0 0 0 3px #fff,0 0 22px #ff6a7a}}
@keyframes wzpulse{to{filter:brightness(1.15)}}
@keyframes wztap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes wzban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-2deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(1deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@keyframes wzup{from{transform:translateY(40%);opacity:0}}
@keyframes wzst{from{opacity:0;transform:translateY(10px) scale(.8)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.mg-webnovel2 .wz-ban.on{animation-duration:.01s}.mg-webnovel2 .wz-btn.hot,.mg-webnovel2 .wz-go{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "webnovel2", "작가님 절단신공", "wz-st");
    const st = F.stage;
    const ORDER = shuffle(Object.keys(GEN)); ORDER.push(pick(ORDER.slice(0, 2)));
    const EPNO = {}; for (const k of Object.keys(GEN)) EPNO[k] = 20 + rint(120);
    st.insertAdjacentHTML("beforeend", `<div class="wz-bgi"></div><canvas class="wz-cv"></canvas><div class="wz-rc"><div class="wz-me"></div></div><canvas class="wz-cv wz-fr"></canvas>
      <div class="wz-say"></div><div class="wz-eps">${Array.from({ length: EPS }, (_, i) => `<i>${i + 1}</i>`).join("")}</div>
      <div class="wz-pp"><div class="wz-ph"><i></i><b></b><span></span><em>분량 0자</em></div>
        <div class="wz-bd"><div class="wz-tx"><div class="wz-in"></div></div><canvas class="wz-gr"></canvas><div class="wz-fog">??<small>아직 안 쓴 긴장</small></div>
        <div class="wz-gl">긴장도</div><div class="wz-thl">절단각</div><div class="wz-cut"><i></i></div><div class="wz-vig"></div><div class="wz-stamp">다음 화에 계속</div></div></div>
      <div class="wz-cms"></div>
      <div class="wz-dr"><span>독자 이탈<small>이번 화</small></span><canvas></canvas><b>0%</b></div>
      <button class="wz-btn" aria-label="여기서 끊기"><i></i><span>여기서 끊기<br><small>가위선에서 다음 화로</small></span></button>
      <div class="wz-ban"></div>
      <div class="wz-tut off"><div class="wz-tc"><em>리허설</em><p></p><div class="wz-tb"></div></div></div><div class="wz-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const bgiEl = $(".wz-bgi"), cv = $(".wz-cv"), gB = cv.getContext("2d"), cvF = $(".wz-fr"), gF = cvF.getContext("2d");
    const meEl = $(".wz-me"), rcEl = $(".wz-rc"), sayEl = $(".wz-say"), epsEl = [...st.querySelectorAll(".wz-eps i")];
    const pp = $(".wz-pp"), phI = $(".wz-ph i"), phB = $(".wz-ph b"), phS = $(".wz-ph span"), lenEl = $(".wz-ph em");
    const bd = $(".wz-bd"), txEl = $(".wz-tx"), inEl = $(".wz-in"), grC = $(".wz-gr"), gG = grC.getContext("2d"), fogEl = $(".wz-fog"), thlEl = $(".wz-thl"), glEl = $(".wz-gl");
    const cutEl = $(".wz-cut"), vigEl = $(".wz-vig"), stampEl = $(".wz-stamp"), cmsEl = $(".wz-cms");
    const drEl = $(".wz-dr"), drC = $(".wz-dr canvas"), gD = drC.getContext("2d"), drB = $(".wz-dr b"), btn = $(".wz-btn"), ban = $(".wz-ban");
    const tutEl = $(".wz-tut"), tutP = $(".wz-tc p"), tutB = $(".wz-tb"), hand = $(".wz-hand");
    cutEl.querySelector("i").style.backgroundImage = `url("${SCI_URL}")`; btn.querySelector("i").style.backgroundImage = `url("${SCI_URL}")`;
    hand.style.backgroundImage = `url("${HAND_URL}")`;

    // ── 크기: 논리 폭 112칸 안팎을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const RH = Math.max(40, Math.round(LH * 0.25)), roomH = RH * K, deskY = RH - 11, cx = LW >> 1;
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cv, cvF]) { c.width = Math.round(LW * KS); c.height = Math.round(RH * KS); c.style.width = LW * K + "px"; c.style.height = RH * K + "px"; }
    gB.setTransform(KS, 0, 0, KS, 0, 0); gF.setTransform(KS, 0, 0, KS, 0, 0);
    const btnH = Math.round(Math.min(54, sh * 0.09)), btnTop = sh - btnH - 8, drH = 40, drTop = btnTop - 6 - drH;
    const ppTop = roomH + 4, ppH = drTop - 6 - ppTop, phH = 22, bodyH = ppH - phH;
    const ROW = 28, cutY = Math.round(bodyH * 0.42), gwL = 32, gW = gwL * K, ghL = Math.ceil(bodyH / K), tw = sw - 16 - gW;
    const fogY = Math.round(cutY + ROW * 1.5);
    Object.assign(pp.style, { top: ppTop + "px", height: ppH + "px" });
    Object.assign(bd.style, { top: phH + "px", height: bodyH + "px" });
    txEl.style.width = tw + "px";
    grC.width = Math.round(gwL * KS); grC.height = Math.round(ghL * KS); gG.setTransform(KS, 0, 0, KS, 0, 0); Object.assign(grC.style, { width: gW + "px", height: ghL * K + "px" });
    Object.assign(fogEl.style, { width: gW + "px", top: fogY + "px" });
    const gx = (t) => 1 + Math.round(clamp(t, 0, 1.05) * (gwL - 4));
    thlEl.style.left = tw + gx(TH) * K + "px"; glEl.style.left = tw + 3 + "px";
    cutEl.style.top = cutY + "px"; stampEl.style.top = Math.min(bodyH - 30, cutY + 46) + "px";
    Object.assign(drEl.style, { top: drTop + "px", height: drH + "px" });
    const drW = Math.floor((sw - 16 - 16 - 62 - 44 - 12) / K), drHL = 10;
    drC.width = Math.round(drW * KS); drC.height = Math.round(drHL * KS); gD.setTransform(KS, 0, 0, KS, 0, 0); Object.assign(drC.style, { width: drW * K + "px", height: drHL * K + "px" });
    Object.assign(btn.style, { top: btnTop + "px", height: btnH + "px" });
    cmsEl.style.top = ppTop + phH + Math.min(bodyH - 64, cutY + 74) + "px";
    rcEl.style.height = roomH + "px"; bgiEl.style.height = roomH + "px";
    ban.style.top = ppTop + phH + cutY - 40 + "px";
    tutEl.style.top = Math.max(30, roomH - 112) + "px";
    F.root.querySelector(".mg-msg").style.top = ppTop + phH + cutY - 34 + "px";

    // 내 캐릭터 그림(3x2 표정 시트). 노트북 뒤에 앉은 앞모습.
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    const lidW = 44, lidH = 18, lidX = cx - (lidW >> 1), lidY = deskY - lidH + 3;
    let sayLeft = 0;
    {
      const headTop = RH * 0.1, s = ((lidY + 7 - headTop) * K) / 160, w = Math.round(240 * s), h = Math.round(312 * s);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(cx * K - w / 2) + "px", top: Math.round(headTop * K - 18 * s) + "px" });
      sayEl.style.top = Math.max(26, Math.round(headTop * K)) + "px"; sayLeft = Math.min(sw - 70, Math.round(cx * K + w * 0.55)); sayEl.style.left = sayLeft + "px";
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = "";

    // ── 방 배경(한 번만): 실제 그림(.wz-bgi) 위에 어둠·메모 / 앞쪽 책상·노트북·스탠드는 벡터 ──
    const hiC = () => { const c = document.createElement("canvas"); c.width = Math.round(LW * KS); c.height = Math.round(RH * KS); const x = c.getContext("2d"); x.setTransform(KS, 0, 0, KS, 0, 0); return [c, x]; };
    const [BG, b0] = hiC();
    {
      const b = b0;
      b.fillStyle = lin(b, 0, 0, 0, RH, [[0, "rgba(8,6,24,.28)"], [0.45, "rgba(8,6,24,0)"], [1, "rgba(8,6,24,.35)"]]); b.fillRect(0, 0, LW, RH);
      // 포스트잇: "끊기!" 메모
      b.save(); b.translate(LW - 24, 4); b.rotate(0.07);
      b.fillStyle = "rgba(0,0,0,.35)"; b.fillRect(0.8, 1, 19, 12);
      b.fillStyle = lin(b, 0, 0, 0, 12, [[0, "#fff2a0"], [1, "#ffd95a"]]); b.fillRect(0, 0, 19, 12);
      b.fillStyle = "rgba(255,255,255,.55)"; b.fillRect(5.5, -1.2, 8, 2.4);
      b.fillStyle = "#d0303a"; b.font = "900 4.4px sans-serif"; b.textAlign = "center"; b.fillText("끊기!", 9.5, 6.4);
      b.fillStyle = "#7a5a2a"; b.font = "800 3.1px sans-serif"; b.fillText("결제각 ✂", 9.5, 10.4);
      b.restore();
    }
    const [FG, f0] = hiC();
    const mugX = lidX - 12, clkX = lidX + lidW + 4, clkY = deskY - 9, lampX = 1;
    {
      const b = f0;
      b.fillStyle = lin(b, 0, deskY, 0, RH, [[0, "#a06c44"], [0.15, "#83552f"], [1, "#4a2e1a"]]); b.fillRect(0, deskY, LW, RH - deskY);
      b.fillStyle = "#d7a273"; b.fillRect(0, deskY, LW, 0.5);
      b.strokeStyle = "rgba(50,24,8,.28)"; b.lineWidth = 0.3;
      for (let i = 0; i < 6; i++) { const y = deskY + 2.5 + i * ((RH - deskY - 3) / 6); b.beginPath(); b.moveTo(0, y); b.bezierCurveTo(LW * 0.3, y + 0.8, LW * 0.6, y - 0.8, LW, y + 0.4); b.stroke(); }
      b.fillStyle = "rgba(0,0,0,.45)"; b.fillRect(0, RH - 0.8, LW, 0.8);
      b.fillStyle = rad(b, cx, lidY + lidH + 2, 1, lidW * 0.6, [[0, "rgba(0,0,0,.45)"], [1, "rgba(0,0,0,0)"]]); b.fillRect(lidX - 10, lidY + lidH - 2, lidW + 20, 8);
      b.save(); b.shadowColor = "rgba(140,200,255,.55)"; b.shadowBlur = 5 * KS;
      rr(b, lidX, lidY, lidW, lidH + 1, 2.2); b.fillStyle = lin(b, lidX, lidY, lidX + lidW, lidY + lidH, [[0, "#eef1f6"], [0.45, "#c9ced8"], [1, "#9aa0ae"]]); b.fill(); b.restore();
      b.save(); rr(b, lidX, lidY, lidW, lidH + 1, 2.2); b.clip();
      b.fillStyle = "rgba(255,255,255,.22)"; b.beginPath(); b.moveTo(lidX + lidW * 0.18, lidY); b.lineTo(lidX + lidW * 0.42, lidY); b.lineTo(lidX + lidW * 0.2, lidY + lidH + 1); b.lineTo(lidX - 2, lidY + lidH + 1); b.closePath(); b.fill();
      b.restore();
      rr(b, lidX + 0.2, lidY + 0.2, lidW - 0.4, lidH + 0.6, 2.1); b.strokeStyle = "rgba(255,255,255,.75)"; b.lineWidth = 0.35; b.stroke();
      rr(b, lidX - 3, lidY + lidH, lidW + 6, 2.4, 1.1); b.fillStyle = lin(b, 0, lidY + lidH, 0, lidY + lidH + 2.4, [[0, "#a3a8b6"], [1, "#5d6270"]]); b.fill();
      const ly = lidY + lidH * 0.5;
      b.fillStyle = rad(b, cx, ly, 0.5, 4.6, [[0, "rgba(255,255,255,.95)"], [0.6, "rgba(190,228,255,.8)"], [1, "rgba(190,228,255,0)"]]); b.beginPath(); b.arc(cx, ly, 4.6, 0, 7); b.fill();
      b.fillStyle = "#1f6fd0"; b.beginPath(); b.moveTo(cx, ly + 2.8); b.lineTo(cx - 1.9, ly - 0.5); b.lineTo(cx - 1.1, ly - 2.8); b.lineTo(cx + 1.1, ly - 2.8); b.lineTo(cx + 1.9, ly - 0.5); b.closePath(); b.fill();
      b.strokeStyle = "#fff"; b.lineWidth = 0.4; b.beginPath(); b.moveTo(cx, ly + 2.2); b.lineTo(cx, ly - 0.4); b.stroke();
      star5(b, lidX + 6, lidY + 5.5, 2.8, "#ffd166", "#b07800");
      // 가위 스티커(벡터 그림을 붙임)
      const sti = new Image(); sti.onload = () => { f0.save(); f0.translate(lidX + lidW - 13, lidY + lidH - 9.5); f0.rotate(-0.12); f0.fillStyle = "#fff"; rr(f0, -1, -1, 13, 10.5, 1.5); f0.fill(); f0.drawImage(sti, 0, 0, 11, 8.6); f0.restore(); }; sti.src = SCI_URL;
      b.fillStyle = "rgba(0,0,0,.4)"; b.beginPath(); b.ellipse(lampX + 5.5, deskY + 2.6, 6, 1.4, 0, 0, 7); b.fill();
      b.fillStyle = lin(b, 0, deskY, 0, deskY + 3, [[0, "#5a6a80"], [1, "#253040"]]); b.beginPath(); b.ellipse(lampX + 5.5, deskY + 1.6, 5.2, 1.6, 0, 0, 7); b.fill();
      b.strokeStyle = "#7a8aa0"; b.lineCap = "round"; b.lineWidth = 1.1;
      b.beginPath(); b.moveTo(lampX + 5, deskY + 1); b.lineTo(lampX + 8, deskY - 12); b.lineTo(lampX + 13, deskY - 13); b.stroke();
      b.fillStyle = "#9aaac0"; b.beginPath(); b.arc(lampX + 8, deskY - 12, 0.9, 0, 7); b.fill();
      b.save(); b.translate(lampX + 14, deskY - 12); b.rotate(0.35);
      b.beginPath(); b.moveTo(-2.5, -2); b.lineTo(2.5, -2); b.lineTo(5.5, 3); b.lineTo(-5.5, 3); b.closePath(); b.fillStyle = lin(b, 0, -2, 0, 3, [[0, "#4fae76"], [1, "#1e5a3a"]]); b.fill();
      b.fillStyle = "rgba(255,255,255,.3)"; b.fillRect(-1.8, -1.6, 1, 4); b.fillStyle = "#fff6cc"; b.beginPath(); b.ellipse(0, 3, 5.2, 0.9, 0, 0, 7); b.fill(); b.restore();
      const bx = LW - 14;
      [["#5fb8ff", 0], ["#ffb03b", 3], ["#e05a5a", 6]].forEach(([c, d]) => { const x = bx - (d % 2), y = deskY + 2 - d; rr(b, x, y, 12.5, 3, 0.7); b.fillStyle = lin(b, 0, y, 0, y + 3, [[0, tint(c, 1.2)], [1, tint(c, 0.78)]]); b.fill(); b.fillStyle = "#f2ead8"; b.fillRect(x + 10.2, y + 0.5, 2, 2); b.fillStyle = "rgba(255,255,255,.5)"; b.fillRect(x + 1.5, y + 1.2, 6, 0.4); });
    }

    // ── 상태 ── tut: 0 대기 / 1 작은 봉우리 참기 / 2 진짜 꼭대기 자르기 / 3 시작 카드 / -1 본게임
    let tut = 0, tutT = 0, tm = 0, el = 0;
    let done = false, raf = 0, last = 0, phase = "idle", phT = 0;
    let E = null, epI = -1, off = 0, cur = -2, reveal = false, hold = false, beatT = 0, sayT = 0, lastSay = 0, hintShown = false, lateMsg = false;
    const results = [];
    const cs = { happy: 0, shock: 0, sad: 0, blush: 0, angry: 0 };
    const decks = {}; const deal = (k, pool, used) => { for (let i = 0; i < 12; i++) { if (!decks[k] || !decks[k].length) decks[k] = shuffle(pool.slice()); const t = decks[k].pop(); if (!used.has(t) || i === 11) { used.add(t); return t; } } return pick(pool); };

    // ── 소리 ──
    const pageSnd = () => noise(0.04, 3200 + rnd() * 800, 0.025, 0, 2);
    const beat = (t) => { tone(62, 0.11, "sine", 0.18 + t * 0.12); tone(52, 0.12, "sine", 0.14 + t * 0.1, 0, 0.13); };
    const snipSnd = () => { noise(0.05, 5200, 0.12, 0, 3); tone(1900, 0.03, "square", 0.05); noise(0.06, 4200, 0.12, 0.17, 3); tone(1500, 0.04, "square", 0.05, 0, 0.17); };
    const fanfare = () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.06, 0, i * 0.07)); };
    const mehSnd = () => { tone(330, 0.18, "triangle", 0.07, -60); tone(262, 0.26, "triangle", 0.07, -50, 0.18); };
    const coinSnd = (i) => { tone(1318 + (i % 5) * 90, 0.05, "square", 0.04); tone(1976, 0.06, "triangle", 0.03, 0, 0.04); };

    // ── 화면 글자 ──
    const say = (t, cls = "", sec = 1.4) => { sayEl.textContent = t; sayEl.className = "wz-say " + cls; void sayEl.offsetWidth; sayEl.classList.add("on"); sayT = sec; lastSay = el; };
    const banner = (html, cls = "") => { ban.innerHTML = html; ban.className = "wz-ban " + cls; void ban.offsetWidth; ban.classList.add("on"); };
    const nk = () => pick(NICK_A) + pick(NICK_B) + (rnd() < 0.4 ? "_" + (10 + rint(89)) : "");

    // ── 회차 만들기: 긴장도 곡선 + 줄 ──
    const makeEp = (gk, ei, tutor) => {
      const g = GEN[gk];
      let n, m, p, fk;
      if (tutor) { n = 12; m = 3; p = 8; fk = [[5, 0.62]]; }
      else {
        n = 14 + rint(3); m = 5 + rint(2); p = clamp(m + 3 + rint(3), m + 3, n - 4);
        const fv = () => 0.55 + rnd() * (ei >= 2 ? 0.19 : 0.12);
        fk = [];
        if (ei === 0 || ei >= 2) fk.push([2 + rint(Math.max(1, m - 2)), fv()]);
        if (ei >= 1) fk.push([m + rint(Math.max(1, p - 2 - m)), fv()]);
        fk = fk.filter((f, i, a) => f[0] < p - 2 && a.findIndex((x) => x[0] === f[0]) === i);
      }
      const v = [];
      for (let i = 0; i < n; i++) v[i] = i < p ? 0.13 + 0.26 * (i / p) + (rnd() - 0.5) * 0.08 : 0.17 + rnd() * 0.1;
      for (const [f, fv] of fk) { v[f] = fv; if (f > 0) v[f - 1] = Math.min(v[f - 1], fv - 0.16); if (f + 1 < p) v[f + 1] = Math.min(v[f + 1], fv - 0.22); }
      v[p - 2] = Math.max(0.5, Math.min(0.6, v[p - 2] + 0.25)); v[p - 1] = 0.72 + rnd() * 0.05; v[p] = 0.92 + rnd() * 0.07;
      v[p + 1] = 0.46 + rnd() * 0.06; v[p + 2] = 0.3 + rnd() * 0.05;
      for (const [f] of fk) if (f === p - 2 || f === p - 1) v[f] = Math.min(v[f], TH - 0.06);
      const used = new Set();
      const L = v.map((t, i) => {
        const kind = i === p ? "cliff" : fk.some((f) => f[0] === i) ? "fake" : i > p ? "after" : t >= 0.58 ? "crisis" : t >= 0.33 ? "talk" : "calm";
        return { t, kind, txt: deal(gk + kind, g[kind], used) };
      });
      return { gk, g, n, m, p, fk: fk.map((f) => f[0]), v, L, no: EPNO[gk]++, drop: 0, dh: [], chars: 0, spl: (tutor ? 0.72 : [0.55, 0.48, 0.43, 0.39][ei] || 0.39) * ez };
    };
    const Y0 = cutY + ROW * 0.9;
    const lineTop = (i) => Y0 + i * ROW;
    let lineEls = [], okEl = null;
    const beginEp = (gk, ei, tutor) => {
      E = makeEp(gk, ei, tutor); off = 0; cur = -2; reveal = false; hold = false; lateMsg = false; phase = "scroll"; phT = 0;
      inEl.innerHTML = E.L.map((l, i) => `<div class="wz-l k-${l.kind}" style="top:${lineTop(i)}px"><span>${l.txt}</span></div>`).join("") + `<div class="wz-ok" style="top:${lineTop(E.m) - 1}px"><b>분량 OK ▼</b></div>`;
      lineEls = [...inEl.querySelectorAll(".wz-l")]; okEl = inEl.querySelector(".wz-ok");
      inEl.style.transform = "translateY(0px)";
      pp.style.setProperty("--gc", E.g.c); phI.style.backgroundImage = `url("${iconURL(gk)}")`; phB.textContent = E.g.t; phS.textContent = `${E.no}화`;
      lenEl.textContent = "분량 0자"; lenEl.classList.remove("ok");
      fogEl.classList.remove("off"); cutEl.classList.remove("snip"); stampEl.className = "wz-stamp";
      cmsEl.innerHTML = ""; drB.textContent = "0%"; btn.classList.remove("dim", "hot");
      if (!tutor) { epsEl.forEach((e, i) => e.classList.toggle("now", i === ei)); banner(`${ei + 1}화째 · ${E.g.n}<small>${E.g.t}</small>`); tone(660, 0.08, "square", 0.05); tone(990, 0.12, "square", 0.05, 0, 0.09); }
    };

    // 줄이 가위선에 올라올 때(독자가 그 줄을 읽음)
    const reach = (i) => {
      const l = E.L[i]; if (!l) return;
      lineEls.forEach((e, k) => { e.classList.toggle("cur", k === i); e.classList.toggle("past", k < i); });
      E.chars = Math.round(((i + 1) * 4000) / (E.m + 1) / 10) * 10;
      lenEl.textContent = `분량 ${fmt(E.chars)}자`;
      if (i === E.m && !lenEl.classList.contains("ok")) { lenEl.classList.add("ok"); lenEl.classList.remove("bump"); void lenEl.offsetWidth; lenEl.classList.add("bump"); tone(1046, 0.06, "triangle", 0.05); if (tut < 0 && epI === 0) F.msg("분량 OK! 이제부터 끊을 수 있어요"); }
      const d = i > E.p ? 7 + (i - E.p) * 2 : l.kind === "calm" ? 1.6 : l.kind === "talk" ? 0.7 : 0.2;
      E.drop = clamp(E.drop + d, 0, 80); E.dh.push(E.drop); drB.textContent = Math.round(E.drop) + "%";
      if (i > E.p) { drB.classList.remove("up"); void drB.offsetWidth; drB.classList.add("up"); tone(300 - (i - E.p) * 30, 0.1, "square", 0.04); }
      pageSnd();
      if (tut >= 0) return;
      if (l.kind === "fake" && i >= E.m && rnd() < 0.6 && el - lastSay > 1) say(pick(["오, 여기서 끊어?", "여기 괜찮은데…?", "끊을까 말까…"]), "", 1);
      if (l.kind === "cliff" && epI === 0) say("지금이다!", "gd", 0.9);
      if (i === E.p + 1 && !lateMsg) { lateMsg = true; F.msg("꼭대기 지났어요! 긴장이 풀려요"); cs.shock = 0.8; say(pick(["앗, 지나갔다!", "늦었나…?"]), "rd", 1); }
    };

    // ── 자르기 ──
    const nope = (t, c) => { F.msg(t); SFX.tok(); vib(8); pp.classList.remove("shk"); void pp.offsetWidth; pp.classList.add("shk"); if (c) cs.shock = 0.4; };
    const tryCut = () => {
      if (done || phase !== "scroll" || !E) return;
      if (tut === 1) { nope("아직! 점선을 못 넘은 작은 봉우리예요"); return; }
      if (tut === 2 && cur !== E.p) { nope(cur < E.p ? "조금만 더! 꼭대기가 가위선에 오면 톡" : "지금!"); if (cur < E.p) return; }
      if (tut === 0 || tut === 3) return;
      if (cur < 0) { nope("아직 첫 줄도 안 나왔어요"); return; }
      doCut(cur, false);
    };
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); btn.classList.add("prs"); setTimeout(() => btn.classList.remove("prs"), 120); tryCut(); });
    bd.addEventListener("pointerdown", (e) => { e.preventDefault(); tryCut(); });

    const doCut = (idx, auto) => {
      if (phase !== "scroll") return;
      phase = "cut"; phT = 0; hold = false; handAt(null); E.cutIdx = idx;
      const d = idx - E.p, early = idx < E.m && !auto;
      let q, res;
      if (auto) { q = 0.05; res = "end"; }
      else if (early) { q = 0.1; res = "early"; E.drop = clamp(E.drop + 22, 0, 80); }
      else if (d === 0) { q = 1; res = "perfect"; }
      else if (d > 0) { q = Math.max(0.05, 0.62 - 0.2 * (d - 1)); res = "late"; }
      else { const r = E.v[idx] / E.v[E.p]; q = clamp(0.95 * r * r - 0.05 * -d, 0.08, 0.66); res = E.fk.includes(idx) ? "fake" : "soon"; }
      const conv = clamp(4 + 40 * q - 0.25 * E.drop, 1, 45);
      const R = { gk: E.gk, no: E.no, idx, p: E.p, q, res, drop: E.drop, conv, reader: 6000 + rint(5000) };
      if (tut < 0) results.push(R);
      drB.textContent = Math.round(E.drop) + "%";
      reveal = true; fogEl.classList.add("off"); vigEl.style.opacity = "0"; btn.classList.remove("hot");
      if (lineEls[E.p]) lineEls[E.p].classList.add("pk");
      // 가위가 선을 따라 지나간다
      cutEl.classList.remove("snip"); void cutEl.offsetWidth; cutEl.classList.add("snip"); snipSnd(); vib(12);
      const good = res === "perfect", ok = res === "perfect" || res === "soon";
      setTimeout(() => {
        if (done) return;
        // 가위선 아래 원고가 떨어져 나간다
        lineEls.forEach((e, k) => { if (k > idx) { e.style.transitionDelay = (k - idx) * 0.03 + "s"; e.style.transform = `translate(${(rnd() - 0.4) * 30}px,${160 + rnd() * 60}px) rotate(${(rnd() - 0.5) * 30}deg)`; e.classList.add("drop"); } });
        if (okEl && E.m > idx) { okEl.style.transform = "translateY(180px)"; okEl.classList.add("drop"); }
        stampEl.textContent = good || res === "soon" ? "다음 화에 계속" : res === "early" ? "분량 실화?" : "다음 화에 계속…?";
        stampEl.className = "wz-stamp on" + (ok ? "" : " meh");
        SFX.stamp(); vib(good ? [30, 40, 30] : 25); pp.classList.remove("shk"); void pp.offsetWidth; pp.classList.add("shk");
        const sp = [8 + tw / 2 + gW / 2, ppTop + phH + Math.min(bodyH - 30, cutY + 46)];
        F.burst(sp, ok ? "#d8263a" : "#6a6a7a", good ? 16 : 8);
        const [lab, lc] = RES[res]; F.float([sw / 2, ppTop + phH + cutY - 12], lab, lc === "rd" ? "bad" : "");
        if (good) { fanfare(); cs.happy = 2; say(pick(["완벽한 절단!", "이건 결제각이다", "독자들 난리 나겠다"]), "gd", 1.6); }
        else if (res === "soon") { SFX.ding(2); cs.happy = 1; say("나쁘지 않아!", "", 1.2); }
        else { mehSnd(); cs.sad = 1.8; say(res === "early" ? "분량이… 너무 짧았나" : res === "fake" ? "거기가 아니었나…" : "흠… 늦었다", "sl", 1.6); }
        if (tut < 0) { const ep = epsEl[epI]; ep.classList.remove("now"); ep.classList.add(good ? "g0" : ok ? "g1" : "g2"); }
      }, 300);
      // 독자 댓글 반응
      const pool = CM[res], first = good ? CM.perfect[0] : pick(pool);
      const lines = [first, pick(pool.filter((x) => x !== first)) || pick(pool)];
      lines.forEach((t, i) => setTimeout(() => {
        if (done || phase !== "cut") return;
        const e = document.createElement("div"); e.className = "wz-cm " + (good ? "gd" : ok ? "" : "meh");
        e.innerHTML = `<b>${nk()}</b><span>${t}</span><small>♥ ${ok ? 20 + rint(good ? 400 : 80) : rint(6)}</small>`;
        cmsEl.appendChild(e); tone(1760 + rnd() * 500, 0.04, "sine", 0.05); if (good) coinSnd(i);
        cs.blush = good ? 1.2 : 0;
      }, 700 + i * 450));
      if (tut === 2) setTimeout(() => { if (tut === 2) tutNext(3); }, 2000);
      else if (tut < 0) setTimeout(nextEp, 1950);
    };
    const nextEp = () => {
      if (done) return;
      if (epI + 1 >= EPS) return finale();
      epI++; cmsEl.querySelectorAll(".wz-cm").forEach((e) => e.classList.add("out"));
      setTimeout(() => { if (!done) beginEp(ORDER[epI], epI, false); }, 250);
      phase = "wait";
    };

    // ── 그리기 ──
    let g = gB;
    const curT = () => (E && cur >= 0 && cur < E.n ? E.v[cur] : 0);
    const renderRoom = () => {
      g = gB; g.clearRect(0, 0, LW, RH); g.drawImage(BG, 0, 0, LW, RH);
      g.globalCompositeOperation = "lighter";
      const lg = g.createRadialGradient(lampX + 13, deskY - 6, 2, lampX + 13, deskY - 2, 22); lg.addColorStop(0, "rgba(255,220,150,.28)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, 0, 46, RH);
      g.globalCompositeOperation = "source-over";
      g = gF; g.clearRect(0, 0, LW, RH);
      const t = curT();
      const sg = g.createRadialGradient(cx, lidY - 6, 2, cx, lidY - 6, 24); sg.addColorStop(0, `rgba(${140 + Math.round(t * 110)},${200 - Math.round(t * 120)},${255 - Math.round(t * 150)},${0.12 + t * 0.1})`); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(cx - 28, 0, 56, deskY);
      g.drawImage(FG, 0, 0, LW, RH);
      g.globalAlpha = 0.45 + 0.2 * Math.sin(tm * 3); rr(g, lidX + 2, lidY - 0.7, lidW - 4, 0.8, 0.4); g.fillStyle = t >= TH ? "#ff8fa0" : "#bfe6ff"; g.fill(); g.globalAlpha = 1;
      // 머그컵 + 김(벡터)
      const my = deskY - 8;
      g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(mugX + 4.5, my + 9.2, 5.6, 1.2, 0, 0, 7); g.fill();
      g.strokeStyle = "#e4e4ec"; g.lineWidth = 1.2; g.beginPath(); g.arc(mugX + 8, my + 4.2, 2.2, -1.3, 1.3); g.stroke();
      g.beginPath(); g.moveTo(mugX, my + 0.6); g.lineTo(mugX + 8.2, my + 0.6); g.lineTo(mugX + 7.7, my + 8); g.quadraticCurveTo(mugX + 7.5, my + 9.2, mugX + 6.3, my + 9.2); g.lineTo(mugX + 1.9, my + 9.2); g.quadraticCurveTo(mugX + 0.7, my + 9.2, mugX + 0.5, my + 8); g.closePath();
      g.fillStyle = lin(g, mugX, 0, mugX + 8.2, 0, [[0, "#c9cad6"], [0.35, "#ffffff"], [1, "#d2d3de"]]); g.fill();
      g.fillStyle = "#5fb8ff"; g.fillRect(mugX + 0.3, my + 4, 7.6, 2.2); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(mugX + 2, my + 4, 1.2, 2.2);
      g.fillStyle = "#3a2216"; g.beginPath(); g.ellipse(mugX + 4.1, my + 0.8, 3.9, 0.8, 0, 0, 7); g.fill();
      g.lineCap = "round"; g.lineWidth = 0.7;
      for (let i = 0; i < 2; i++) { const ph = (tm * 0.7 + i / 2) % 1, x0 = mugX + 3 + i * 2, y0 = my - 0.5 - ph * 7; g.strokeStyle = `rgba(255,255,255,${(0.55 * (1 - ph)).toFixed(2)})`; g.beginPath(); g.moveTo(x0 + Math.sin((tm + i) * 3) * 1.2, y0); g.bezierCurveTo(x0 - 1.4, y0 - 1.5, x0 + 1.4, y0 - 2.5, x0 + Math.sin((tm + i) * 3 + 1) * 1.2, y0 - 4); g.stroke(); }
      // 탁상시계 23:5x(빨간 7세그먼트)
      rr(g, clkX - 1.2, clkY - 1.2, 21.4, 11.6, 1.8); g.fillStyle = lin(g, 0, clkY - 1, 0, clkY + 10, [[0, "#2a2434"], [1, "#0e0a14"]]); g.fill();
      rr(g, clkX, clkY, 19, 9, 1); g.fillStyle = "#050308"; g.fill();
      const mm = 50 + Math.min(9, Math.max(0, epI) * 2 + (phase === "cut" ? 1 : 0)), dc = "#ff6a6a";
      g.save(); g.shadowColor = dc; g.shadowBlur = 2.5 * KS;
      [[2, 1.3], [3, 5.3], [Math.floor(mm / 10), 11.3], [mm % 10, 15.3]].forEach(([d, x]) => seg7(g, d, clkX + x, clkY + 2, 2.6, 5, dc, "rgba(255,80,90,.1)"));
      g.restore();
      if (Math.floor(tm * 2) % 2 === 0) { g.fillStyle = dc; g.beginPath(); g.arc(clkX + 9.6, clkY + 3.3, 0.45, 0, 7); g.arc(clkX + 9.6, clkY + 5.7, 0.45, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,255,255,.08)"; rr(g, clkX, clkY, 19, 3.5, 1); g.fill();
      const vg = g.createLinearGradient(0, 0, 0, RH); vg.addColorStop(0, "rgba(5,3,14,.3)"); vg.addColorStop(0.3, "rgba(0,0,0,0)"); g.fillStyle = vg; g.fillRect(0, 0, LW, RH);
    };
    // 긴장도 파형(세로로 흐름, 매끈한 벡터): 줄마다 오른쪽으로 뻗는 길이 = 긴장
    const gxf = (t) => 1 + clamp(t, 0, 1.05) * (gwL - 4);
    const renderGraph = () => {
      g = gG; g.clearRect(0, 0, gwL, ghL);
      g.fillStyle = lin(g, 0, 0, gwL, 0, [[0, "#121830"], [1, "#182040"]]); g.fillRect(0, 0, gwL, ghL);
      g.strokeStyle = "#2a3458"; g.lineWidth = 0.35; g.setLineDash([1, 2.5]); g.lineDashOffset = -((off / K) % 3.5);
      for (const f of [0.25, 0.5]) { g.beginPath(); g.moveTo(gxf(f), 0); g.lineTo(gxf(f), ghL); g.stroke(); }
      g.setLineDash([]);
      g.fillStyle = "rgba(255,59,92,.08)"; g.fillRect(gxf(TH), 0, gwL - gxf(TH), ghL);
      if (E) {
        const n = E.n, cyL = (i) => (lineTop(i) + ROW / 2 - off) / K;
        const knownTo = reveal ? ghL : Math.min(ghL, fogY / K), cutL = cutY / K;
        const segs = []; let sg2 = null;
        for (let y = 0; y <= knownTo + 0.001; y += 0.5) {
          const fi = (y * K + off - Y0 - ROW / 2) / ROW;
          if (fi < -0.5 || fi > n - 0.5) { sg2 = null; continue; }
          const i0 = clamp(Math.floor(fi), 0, n - 1), i1 = clamp(i0 + 1, 0, n - 1), fr = clamp(fi - i0, 0, 1);
          const sm = fr * fr * (3 - 2 * fr); let t = E.v[i0] * (1 - sm) + E.v[i1] * sm;
          if (fi < 0) t = E.v[0] * (fi + 0.5) * 2;
          const wob = phase === "scroll" ? Math.sin(y * 0.9 + tm * 9) * 0.7 * t : 0;
          if (!sg2) segs.push((sg2 = []));
          sg2.push([Math.max(0.6, gxf(t) + wob), y]);
        }
        const grad = lin(g, 1, 0, gxf(1.05), 0, [[0, "#2a5a98"], [0.3 / 1.05, "#3a6ea8"], [0.36 / 1.05, "#5fb8ff"], [0.55 / 1.05, "#5fb8ff"], [0.62 / 1.05, "#ff8fc8"], [0.76 / 1.05, "#ff8fc8"], [0.82 / 1.05, "#ff3b5c"], [1, "#ff3b5c"]]);
        const shape = (pts) => { g.beginPath(); g.moveTo(0, pts[0][1]); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(0, pts[pts.length - 1][1]); g.closePath(); };
        const edge = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
        const cutB = reveal && E.cutIdx != null ? ((E.cutIdx + 0.5) * ROW + Y0 + ROW / 2 - off) / K : Infinity;
        // 구역: [y0, y1, 색, 투명도]
        const zones = reveal ? [[-1, cutB, grad, 1, "#fff"], [cutB, ghL + 1, "#8a90b0", 0.35, "#c8cce0"]] : [[-1, cutL, grad, 1, "#fff"], [cutL, ghL + 1, grad, 0.55, "#fff"]];
        for (const [y0, y1, fill, al, ec] of zones) {
          if (y1 <= y0) continue;
          g.save(); g.beginPath(); g.rect(0, y0, gwL, y1 - y0); g.clip(); g.globalAlpha = al;
          for (const pts of segs) if (pts.length > 1) { shape(pts); g.fillStyle = fill; g.fill(); edge(pts); g.strokeStyle = ec; g.lineWidth = 0.55; g.lineJoin = "round"; g.stroke(); }
          g.restore();
        }
        // 자른 뒤: 진짜 꼭대기 별
        if (reveal) { const py = cyL(E.p), px = gxf(E.v[E.p]) - 1.5; if (py > -3 && py < ghL + 3) { g.save(); g.shadowColor = "#ffd166"; g.shadowBlur = 3 * KS; star5(g, px, py, 2.4 + 0.3 * Math.sin(tm * 10), "#ffd166", "#fff3b0"); g.restore(); } }
      }
      // 절단각 점선
      g.strokeStyle = "#ff3b5c"; g.lineWidth = 0.55; g.setLineDash([2, 1.2]); g.lineDashOffset = -tm * 10; g.beginPath(); g.moveTo(gxf(TH), 0); g.lineTo(gxf(TH), ghL); g.stroke(); g.setLineDash([]);
    };
    const renderDrop = () => {
      g = gD; g.clearRect(0, 0, drW, drHL); g.fillStyle = "#0c1020"; g.fillRect(0, 0, drW, drHL);
      g.strokeStyle = "#2a3458"; g.lineWidth = 0.3; g.setLineDash([1.5, 1.5]); g.beginPath(); g.moveTo(0, drHL - 0.4); g.lineTo(drW, drHL - 0.4); g.stroke(); g.setLineDash([]);
      if (!E) return;
      const h = E.dh, n = E.n;
      for (let i = 0; i < h.length; i++) {
        const x0 = (i * drW) / n, x1 = ((i + 1) * drW) / n, hh = Math.max(0.8, (h[i] / 50) * (drHL - 1));
        const late = i > E.p;
        rr(g, x0 + 0.25, drHL - hh, x1 - x0 - 0.5, hh + 1, 0.6); g.fillStyle = late ? lin(g, 0, drHL - hh, 0, drHL, [[0, "#ff5a7a"], [1, "#c0203a"]]) : "rgba(255,143,160,.4)"; g.fill();
        g.fillStyle = late ? "#ffd0d8" : "#ff8fa0"; g.fillRect(x0 + 0.5, drHL - hh, x1 - x0 - 1, 0.35);
      }
    };

    // ── 나(표정·몸짓) ──
    const meTick = () => {
      if (!art) return;
      const t = phase === "scroll" ? curT() : 0;
      const ex = cs.shock > 0 ? "surprised" : cs.sad > 0 ? "sad" : cs.happy > 0 ? "smile" : cs.blush > 0 ? "blush" : t >= TH ? "surprised" : t >= 0.58 ? "angry" : "neutral";
      if (ex !== meX) { meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; }
      let tf;
      if (cs.happy > 0) tf = `translateY(${-Math.round(Math.abs(Math.sin(tm * 9)) * 4)}px)`;
      else if (cs.sad > 0) tf = `translateY(3px) rotate(${(Math.sin(tm * 1.2) * 2).toFixed(1)}deg)`;
      else if (t >= 0.58) tf = `translate(${Math.floor(tm * 24) % 2 ? 1 : -1}px,${-1 - Math.round(t * 2)}px)`;
      else tf = `translateY(${(Math.sin(tm * 1.5) * 1).toFixed(1)}px)`;
      if (tf !== meT) { meT = tf; meEl.style.transform = tf; }
    };

    // ── 흐름 ──
    const scrollTick = (dt) => {
      if (!E) return;
      const v = ROW / E.spl;
      // 리허설 2단계: 진짜 꼭대기가 가위선 가운데 오면 멈춰 기다린다
      const holdOff = lineTop(E.p) + ROW / 2 - cutY;
      if (tut === 2 && off + v * dt >= holdOff) { off = holdOff; hold = true; } else off += v * dt;
      inEl.style.transform = `translateY(${-Math.round(off)}px)`;
      const c = Math.floor((cutY + off - Y0) / ROW);
      if (c !== cur && c >= 0) { for (let i = Math.max(0, cur + 1); i <= Math.min(c, E.n - 1); i++) reach(i); }
      cur = c;
      if (cur >= E.n) { cur = E.n - 1; if (tut < 0) { F.msg("결말까지 다 써 버렸어요!"); doCut(E.n - 1, true); } else off -= v * dt; return; }
      // 긴장이 높을수록 빠른 심장 소리
      const t = curT();
      beatT -= dt; if (t >= 0.55 && beatT <= 0) { beat(t); beatT = 60 / (70 + t * 90); if (t >= TH) vib(10); }
      vigEl.style.opacity = t >= 0.55 ? ((t - 0.55) * 1.6 + 0.08 * Math.sin(tm * 12)).toFixed(2) : "0";
      btn.classList.toggle("hot", cur >= E.m && t >= TH && tut !== 1 && (epI <= 1 || tut === 2));
      // 첫 회차: 진짜 꼭대기에서만 손가락
      if (tut < 0 && epI === 0 && !opts.retry) handAt(cur === E.p ? "btn" : null);
    };
    const handAt = (w) => {
      if (!w) { hand.className = "wz-hand"; return; }
      let x, y;
      if (w === "btn") { x = sw / 2 + 50; y = btnTop + btnH / 2 + 6; }
      else { x = 8 + tw + gx(TH) * K + 4; y = ppTop + phH + cutY + 8; }
      hand.style.left = Math.round(x) + "px"; hand.style.top = Math.round(y) + "px"; hand.className = "wz-hand on";
    };

    // ── 리허설 ──
    const SKIP = `<button class="wz-skip" data-skip>건너뛰기</button>`;
    const tutNext = (n) => {
      tut = n; tutT = 0; tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        say("오늘 회차 다 썼다! 어디서 끊지?", "", 1.8);
        beginEp(ORDER[0], 0, true);
        tutP.innerHTML = `원고가 위로 흘러가요. 오른쪽 <b>긴장도</b>가<br><b class="rd">빨간 점선</b>을 못 넘은 <b>작은 봉우리</b>는 참아요`; tutB.innerHTML = SKIP;
        handAt("graph");
      } else if (n === 2) {
        tutP.innerHTML = `왔다! <b class="rd">점선을 넘는 꼭대기</b>가<br><b class="rd">가위선</b>에 오면 <b>여기서 끊기</b>를 톡!`; tutB.innerHTML = SKIP;
        handAt("btn");
      } else if (n === 3) {
        handAt(null); say("이 맛에 연재하지!", "gd", 1.6);
        tutP.innerHTML = `<b class="gn">분량 OK</b> 선 전에 자르면 "분량 실화?",<br>꼭대기를 지나면 <b class="rd">독자 이탈</b>이 올라요.<br>회차 <b class="bl">4개</b>를 이어서 끊어요!`;
        tutB.innerHTML = `<button class="wz-go" data-go>연재 시작!</button>`;
      }
    };
    const startGame = () => {
      if (tut < 0) return; tut = -1; handAt(null); tutEl.classList.add("off");
      results.length = 0; epI = 0; el = 0; lastSay = 0;
      for (const k in cs) cs[k] = 0;
      epsEl.forEach((e) => (e.className = ""));
      beginEp(ORDER[0], 0, false);
      SFX.go?.(); say("오늘 4작품 연재! 가자!", "", 1.4);
      if (!opts.retry) setTimeout(() => { if (!done && epI === 0) F.msg("점선을 넘는 꼭대기에서 톡!"); }, 900);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

    // ── 마지막 장면: 다음 화 결제 ──
    let finalScore = 0;
    const scoreNow = () => {
      const qs = results.map((r) => r.q), mq = qs.length ? qs.reduce((a, b) => a + b, 0) / EPS : 0;
      const perf = results.filter((r) => r.res === "perfect").length;
      const len = results.filter((r) => r.res !== "early").length / EPS;
      const keep = results.length ? 1 - results.reduce((a, r) => a + r.drop, 0) / results.length / 60 : 0;
      return { mq, perf, len, keep: clamp(keep, 0, 1), score: clamp(mq * 0.9 + 0.1 * (perf / EPS), 0, 1) };
    };
    const finale = () => {
      if (done || phase === "end") return; phase = "end"; handAt(null); btn.classList.add("dim"); btn.classList.remove("hot"); vigEl.style.opacity = "0";
      F.bar.style.transform = "scaleX(0)";
      const s = scoreNow(); finalScore = s.score;
      const reader = results.reduce((a, r) => a + r.reader, 0), paid = results.reduce((a, r) => a + r.reader * (1 - r.drop / 100) * (r.conv / 100), 0), rate = reader ? (paid / reader) * 100 : 0;
      const ov = document.createElement("div"); ov.className = "wz-end"; ov.style.top = ppTop - 2 + "px";
      const LAB = { perfect: "절단신공", soon: "살짝 일찍", fake: "가짜 꼭대기", early: "분량 실화?", late: "늦음", end: "다 풀어 버림" };
      const COL = { perfect: "#ffd166", soon: "#5fb8ff", fake: "#ff8fa0", early: "#ff8fa0", late: "#ff8fa0", end: "#ff8fa0" };
      ov.innerHTML = `<div class="wz-eh"><i>노블리</i><b>오늘 연재 결산</b><em>4회차 업로드 완료</em></div>
        <div class="wz-bars">${results.map((r) => `<div class="wz-bar" style="--bc:${COL[r.res]}"><u>${r.conv.toFixed(0)}%</u><s style="--h:${Math.round((r.conv / 45) * 66) + 4}px"></s><i style="background-image:url('${iconURL(r.gk)}')"></i><small>${LAB[r.res]}</small></div>`).join("")}</div>
        <div class="wz-big">다음 화 결제<b>0명</b></div>
        <div class="wz-rate">유료 전환율<b>${rate.toFixed(1)}%</b></div>
        <div class="wz-best"><b>베댓</b>${s.score >= 0.75 ? "작가님 절단 장인… 매화 결제 중" : s.score >= 0.45 ? "재밌는데 끊는 데가 좀 애매ㅋㅋ" : "흠… 다음 화는 무료로 볼게요"}</div>`;
      st.appendChild(ov);
      cs.happy = s.score >= 0.6 ? 6 : 0; cs.sad = s.score < 0.4 ? 6 : 0;
      const big = ov.querySelector(".wz-big b"), t1 = performance.now(); let lastN = -1, k = 0;
      const cnt = () => {
        if (!ov.isConnected || done) return;
        const p = clamp((performance.now() - t1 - 400) / 1500, 0, 1), e = 1 - Math.pow(1 - p, 3), nn = Math.round(paid * e);
        if (nn !== lastN) { lastN = nn; big.textContent = fmt(nn) + "명"; if (p > 0 && p < 1 && rnd() < 0.5) coinSnd(k++); }
        if (p < 1) requestAnimationFrame(cnt); else { big.classList.add("pop"); if (s.score >= 0.6) fanfare(); else SFX.ding(2); vib(20); }
      };
      requestAnimationFrame(cnt);
      say(s.score >= 0.75 ? "결제 알림이 멈추질 않아!" : s.score >= 0.45 ? "그래도 꽤 결제했다!" : "다음엔 더 잘 끊어야지…", s.score >= 0.45 ? "gd" : "sl", 3);
      setTimeout(fin, 4300);
    };
    const fin = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      const s = scoreNow();
      const line = `절단신공 <b>${s.perf}/${EPS}</b>회 · 다음 화 결제 <b>${st.querySelector(".wz-big b")?.textContent || "0명"}</b>`;
      finish(s.score, line, "", [["절단 타이밍", s.mq], ["분량 지키기", s.len], ["독자 붙잡기", s.keep]]);
    };

    // ── 돌리기 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
      if (tut >= 0) {
        tutT += dt;
        if (tut === 0 && (opts.retry || tutT > 0.5)) { if (opts.retry) { tut = 3; startGame(); } else tutNext(1); }
        else if (tut === 1) { if (phase === "scroll") scrollTick(dt); if (E && cur >= E.fk[0] + 2) tutNext(2); }
        else if (tut === 2) { if (phase === "scroll") scrollTick(dt); }
      } else {
        el += dt;
        if (phase === "scroll") scrollTick(dt);
        phT += dt;
        if (phase !== "end") { const fr = E && phase === "scroll" ? clamp(cur / Math.max(1, E.p + 2), 0, 1) : phase === "wait" ? 0 : 1; F.bar.style.transform = `scaleX(${clamp(1 - (epI + fr) / EPS, 0, 1)})`; }
        F.sc.textContent = `${Math.min(EPS, epI + 1)}/${EPS}화`;
        if (phase === "scroll" && el - lastSay > 4 && curT() < 0.4) say(pick(["어디서 끊지…", "아직이야, 참자", "독자들 기다린다", "결제각을 노려라"]), "", 1.2);
      }
      for (const k in cs) if (cs[k] > 0) cs[k] -= dt;
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) sayEl.classList.remove("on"); }
      renderRoom(); renderGraph(); renderDrop(); meTick();
      raf = requestAnimationFrame(loop);
    };
    if (dbg) dbg.webnovel2 = {
      st: () => ({ tut, phase, ep: epI, cur, p: E && E.p, m: E && E.m, fk: E && E.fk, n: E && E.n, drop: E && Math.round(E.drop), res: results.map((r) => r.res + ":" + r.q.toFixed(2)), art, score: +finalScore.toFixed(3) }),
      tut: () => tut,
      tutDo: () => {
        if (tut === 1 && E) { off = lineTop(E.fk[0] + 2) + 2 - cutY; }
        else if (tut === 2 && E) { off = lineTop(E.p) + ROW / 2 - cutY; scrollTick(0); tryCut(); }
        else if (tut === 3) startGame();
      },
      start: startGame,
      // 잘 두기: 진짜 꼭대기가 가위선에 오면 자른다
      auto: () => { if (tut < 0 && phase === "scroll" && E && cur === E.p) tryCut(); },
      cutNow: () => { if (tut < 0 && phase === "scroll" && cur >= 0) tryCut(); },
      cutAt: (k) => { if (tut < 0 && phase === "scroll" && E && cur >= k(E)) tryCut(); },
    };
    renderRoom(); renderGraph(); renderDrop(); meTick();
    raf = requestAnimationFrame(loop);
  },
};
