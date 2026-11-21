// 타로 2탄: 속마음 읽기 (일러스트판: 손님은 캐릭터 그림, 배경은 실제 그림, 소품·효과는 고해상도 벡터 캔버스)
// 조용한 카페 상담실. 손님이 별일 아닌 척 이야기하는 동안 몸짓에 단서가 잠깐씩 스친다.
// 단서(반지·폰 알림·사원증 줄·문 쪽 시선·한숨·다리 떨기·통지서)를 톡 해서 단서 노트에 모으고,
// 가짜 몸짓(커피 홀짝·머리 넘기기·창밖 보기)은 그냥 둔다. 마지막에 "진짜 고민" 카드 3장 중 하나를 고른다.
// 단서가 많을수록 안 맞는 카드가 흐려진다. 맞히면 "어떻게 아셨어요?!" → 마지막엔 후기 별점이 쌓인다.
// 손님 표정이 속마음 힌트: 진짜 단서 몸짓엔 굳거나 슬픈 표정, 가짜 몸짓엔 편한 표정.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uOutline } from "../mg.js";

const T = 40; // 한 판 시간(초)
const NCU = 3; // 상담할 손님 수
// 단서 7가지
const CLUE = {
  ring: { n: "반지", say: "반지를 자꾸 만지작거리셨어요" },
  phone: { n: "폰 알림", say: "폰 알림을 몰래 보시더라고요" },
  badge: { n: "사원증", say: "사원증 줄을 꼭 쥐고 계셨죠" },
  door: { n: "문 쪽 시선", say: "눈이 자꾸 문 쪽으로 갔어요" },
  sigh: { n: "한숨", say: "한숨이 아주 깊으셨어요" },
  legs: { n: "다리 떨기", say: "다리를 계속 떠시더라고요" },
  letter: { n: "통지서", say: "손에 쥔 통지서가 보였어요" },
};
const CL_ORDER = ["ring", "phone", "badge", "door", "sigh", "legs", "letter"];
const FAKE = { sip: "커피 홀짝", hair: "머리 넘기기", window: "창밖 보기" };
// 진짜 고민 4가지: 제목, 부제, 단서 묶음, 털어놓는 말, 말풍선(별일 아닌 척)
const WORRY = {
  quit: { t: "회사를 그만두고 싶어요", s: "사원증만 봐도 숨이 막혀요", set: ["badge", "door", "sigh", "phone"], conf: "사실… 회사를 그만두고 싶어요", ln: ["요즘 그냥… 좀 피곤해서요", "일은 뭐, 다 힘들잖아요 ㅎㅎ", "월요일이 너무 빨리 와요", "별일은 아니에요, 진짜로요", "그냥 운세나 보려고요"] },
  offer: { t: "붙은 회사로 옮겨도 될까요", s: "합격은 했는데 발이 안 떨어져요", set: ["letter", "badge", "legs", "phone"], conf: "사실 다른 회사에 붙었어요…!", ln: ["요즘 좀 정신이 없어서요", "좋은 일… 이긴 한데요", "제가 원래 결정을 잘 못 해요", "그냥 궁금해서 와 봤어요 ㅎㅎ", "다들 잘됐다고는 하는데…"] },
  marry: { t: "결혼하자는 말에 망설여져요", s: "좋은 사람인데 겁이 나요", set: ["ring", "phone", "sigh", "legs"], conf: "사실… 프러포즈를 받았어요", ln: ["요즘 좀 복잡해서요…", "주변에서 다들 축하한대요", "근데 저는 잘 모르겠어요", "아, 별건 아니에요 ㅎㅎ", "그냥 마음이 좀 그래요"] },
  ex: { t: "헤어진 사람이 자꾸 생각나요", s: "연락할까 말까 하루 종일", set: ["ring", "door", "phone", "sigh"], conf: "사실 헤어진 지 한 달 됐어요…", ln: ["그냥… 요즘 잠이 안 와서요", "혼자 있는 게 아직 어색해요", "괜찮아요, 진짜 괜찮아요", "가끔 그냥 생각이 나서요", "이 카페 원래 둘이 오던 데예요"] },
};
const W_KEYS = Object.keys(WORRY);
// 표정 힌트: 진짜 단서 몸짓 → 굳은·슬픈 표정, 가짜 몸짓 → 편한 표정
const EVX = { sigh: "sad", letter: "sad", phone: "surprised", badge: "angry", ring: "blush", door: "sad", legs: "angry", sip: "smile", hair: "smile", window: "neutral" };
const MX = { happy: "smile", sad: "sad", anx: "angry", surp: "surprised" };
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const exPos = (ex) => { const i = EXI[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };
const mix = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
const GOLD = `<linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c0"/><stop offset=".45" stop-color="#f2c255"/><stop offset="1" stop-color="#9a6416"/></linearGradient>`;
const SPK = (x, y, r, c = "#fff") => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;

// ── 단서 아이콘(SVG 32x32) ──
const ICON = {
  ring: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs>${GOLD}<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8fd6ff"/></linearGradient></defs>
    <ellipse cx="16" cy="21" rx="9" ry="7.6" fill="none" stroke="#5a3a0a" stroke-width="4.4" opacity=".35"/><ellipse cx="16" cy="20.4" rx="9" ry="7.6" fill="none" stroke="url(#au)" stroke-width="3.2"/>
    <path d="M10.6 8.6L13.2 5h5.6l2.6 3.6L16 14.6z" fill="url(#d)" stroke="#2f7fb8" stroke-width=".8" stroke-linejoin="round"/><path d="M10.6 8.6h10.8M13.2 5L16 14.6 18.8 5" fill="none" stroke="#2f7fb8" stroke-width=".55"/>${SPK(26, 6, 3.4)}${SPK(5, 13, 2, "#ffe9a0")}</svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe4ff"/><stop offset="1" stop-color="#3f8fe8"/></linearGradient></defs>
    <rect x="8" y="4" width="15" height="25" rx="3.4" fill="#1d1f2b" stroke="#5a5f78" stroke-width=".8"/><rect x="9.6" y="7" width="11.8" height="19" rx="1.4" fill="url(#s)"/>
    <rect x="11" y="10" width="9" height="4.2" rx="1.2" fill="#fff" opacity=".92"/><rect x="12" y="11.3" width="5" height=".9" rx=".4" fill="#3f8fe8"/><rect x="12" y="12.7" width="6.6" height=".8" rx=".4" fill="#9ab"/>
    <rect x="11" y="16" width="7" height="2.4" rx="1" fill="#fff" opacity=".55"/><circle cx="23.5" cy="6" r="4.4" fill="#ff4f5e" stroke="#fff" stroke-width="1.2"/><text x="23.5" y="8.1" font-size="6" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">1</text></svg>`,
  badge: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M9 1l6 11M23 1l-6 11" stroke="#3a6ad0" stroke-width="2.6" stroke-linecap="round"/><rect x="14" y="10" width="4" height="4" rx="1" fill="#c9cfdc"/>
    <rect x="7" y="13" width="18" height="17" rx="2.6" fill="#f7f8fb" stroke="#8a94aa" stroke-width=".8"/><path d="M7 15.6a2.6 2.6 0 0 1 2.6-2.6h12.8a2.6 2.6 0 0 1 2.6 2.6V18H7z" fill="#3a6ad0"/>
    <circle cx="12.6" cy="23" r="2.7" fill="#e5c2a0"/><path d="M9.2 28a3.4 3 0 0 1 6.8 0z" fill="#7f8aa6"/><rect x="17.5" y="21" width="5" height="1.3" rx=".6" fill="#9aa4b8"/><rect x="17.5" y="24" width="4" height="1.3" rx=".6" fill="#c3c9d6"/></svg>`,
  door: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b27a4c"/><stop offset="1" stop-color="#6e4426"/></linearGradient></defs>
    <rect x="3" y="3" width="15" height="27" rx="1.5" fill="url(#w)" stroke="#3e2412" stroke-width=".8"/><rect x="5.5" y="6" width="10" height="9" rx="1" fill="#2a3a6e"/><path d="M5.5 6h5v9h-5z" fill="#4a64a8" opacity=".6"/><circle cx="15.3" cy="19.5" r="1.1" fill="#ffd166"/>
    <path d="M19 17c2.4-3.2 7.6-3.2 10 0-2.4 3.2-7.6 3.2-10 0z" fill="#fff" stroke="#2a1e2e" stroke-width=".9"/><circle cx="22.2" cy="17" r="2" fill="#2a1e2e"/><circle cx="21.6" cy="16.4" r=".6" fill="#fff"/><path d="M20 12.6l-1.6-1.6M24 12V10M27.6 12.8l1.5-1.4" stroke="#ffd166" stroke-width="1.1" stroke-linecap="round"/></svg>`,
  sigh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><radialGradient id="c" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c3cfe6"/></radialGradient></defs>
    <path d="M7 24a5 5 0 0 1 .6-9.9A7 7 0 0 1 21 11.6a5.6 5.6 0 0 1 4.4 10.6 3 3 0 0 1-2.4 1.8z" fill="url(#c)" stroke="#8d9bbd" stroke-width=".9"/><path d="M3.5 27h9M6 30h5" stroke="#9fb0d4" stroke-width="1.3" stroke-linecap="round"/><circle cx="27" cy="8" r="1.6" fill="#dfe6f6"/><circle cx="29.4" cy="4.6" r="1" fill="#dfe6f6"/></svg>`,
  legs: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a6c96"/><stop offset="1" stop-color="#34405e"/></linearGradient></defs>
    <path d="M11 2h8l-.6 18h-7z" fill="url(#p)"/><path d="M10.8 19.6h8.2l1.4 3.6 6.4 1.6c1.4.4 1.6 3.2 0 3.2H10.4z" fill="#2a2630"/><path d="M10.4 26.6h17.4" stroke="#5a5260" stroke-width=".9"/>
    <path d="M3 9h4M2 13h5M3 17h4M25 7l3-1.4M25.5 11.5H29M25 16l3 1.4" stroke="#ffd166" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  letter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="9" y="2.5" width="16" height="20" rx="1.2" fill="#fffdf5" stroke="#b9ad90" stroke-width=".8" transform="rotate(8 17 12)"/>
    <g transform="rotate(8 17 12)"><rect x="11.5" y="6" width="9" height="1.4" rx=".6" fill="#3a3a4a"/><rect x="11.5" y="9.4" width="11" height=".9" rx=".4" fill="#9aa"/><rect x="11.5" y="11.6" width="10" height=".9" rx=".4" fill="#9aa"/></g>
    <path d="M3 15h20v14.5H3z" fill="#f2e6c8" stroke="#a8946a" stroke-width=".8"/><path d="M3 15l10 8 10-8" fill="#e6d6b0" stroke="#a8946a" stroke-width=".8" stroke-linejoin="round"/><circle cx="13" cy="22.4" r="3" fill="#d4374a" stroke="#8a1a2a" stroke-width=".6"/><path d="M11.6 22.4h2.8M13 21v2.8" stroke="#ffb0b8" stroke-width=".7"/>${SPK(27.5, 5, 3, "#ffd166")}</svg>`,
};
// ── 진짜 고민 그림(SVG 64x64, 카드 메달 안) ──
const WICON = {
  quit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M20 4l10 18M44 4L34 22" stroke="#4a7ae0" stroke-width="4" stroke-linecap="round"/><rect x="15" y="20" width="34" height="34" rx="4.5" fill="#f7f8fb" stroke="#8a94aa" stroke-width="1.2"/><path d="M15 24.5a4.5 4.5 0 0 1 4.5-4.5h25a4.5 4.5 0 0 1 4.5 4.5V29H15z" fill="#4a7ae0"/>
    <circle cx="25" cy="38" r="5" fill="#e5c2a0"/><path d="M18.6 48a6.4 5.6 0 0 1 12.8 0z" fill="#7f8aa6"/><rect x="35" y="35" width="9" height="2.2" rx="1" fill="#9aa4b8"/><rect x="35" y="40" width="7" height="2.2" rx="1" fill="#c3c9d6"/>
    <path d="M12 16l40 40M52 16L12 56" stroke="#e8304a" stroke-width="5" stroke-linecap="round" opacity=".92"/></svg>`,
  offer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${GOLD}</defs><rect x="20" y="6" width="26" height="32" rx="2" fill="#fffdf5" stroke="#b9ad90" stroke-width="1.2" transform="rotate(-6 33 22)"/>
    <g transform="rotate(-6 33 22)"><rect x="24" y="12" width="13" height="2.6" rx="1" fill="#3a3a4a"/><rect x="24" y="18" width="18" height="1.6" rx=".8" fill="#9aa"/><rect x="24" y="22" width="16" height="1.6" rx=".8" fill="#9aa"/><circle cx="38" cy="31" r="4.6" fill="none" stroke="#d4374a" stroke-width="1.6"/><text x="38" y="33" font-size="5" font-weight="900" text-anchor="middle" fill="#d4374a" font-family="sans-serif">합격</text></g>
    <path d="M8 30h48v28H8z" fill="#f2e6c8" stroke="#a8946a" stroke-width="1.2"/><path d="M8 30l24 17 24-17" fill="#e6d6b0" stroke="#a8946a" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M32 40l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="url(#au)" stroke="#8a5a10" stroke-width=".8"/>${SPK(54, 10, 5, "#ffe9a0")}${SPK(10, 18, 3.5, "#fff")}</svg>`,
  marry: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${GOLD}<linearGradient id="sv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c8cede"/><stop offset="1" stop-color="#7d8499"/></linearGradient><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fb0"/><stop offset="1" stop-color="#e0305e"/></linearGradient></defs>
    <circle cx="24" cy="40" r="13" fill="none" stroke="url(#au)" stroke-width="5"/><circle cx="40" cy="40" r="13" fill="none" stroke="url(#sv)" stroke-width="5"/><path d="M20 23l3-4.4h6l3 4.4-6 6z" fill="#dff4ff" stroke="#2f7fb8" stroke-width="1"/>
    <path d="M44 6c3-4 10-2 9.4 3.6C52.8 15 44 20 44 20s-8.8-5-9.4-10.4C34 4 41 2 44 6z" fill="url(#h)"/>${SPK(56, 26, 4, "#fff")}${SPK(8, 14, 3.5, "#ffe9a0")}</svg>`,
  ex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fb0"/><stop offset="1" stop-color="#c02a54"/></linearGradient></defs>
    <path d="M31 16c-5-9-22-8-22 7 0 12 14 22 21 28l3-11-6-6 7-7z" fill="url(#h)"/><path d="M34 16c5-9 22-8 22 7 0 12-14 22-21 28l2.5-10-5-6 6-7z" fill="url(#h)" transform="translate(3 3) rotate(6 44 30)"/>
    <path d="M18 18c-3 1-4.4 4-4 7" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><path d="M14 54c1 3 3 4 3 6M50 56c-1 2-1 4 0 6" stroke="#8fd8ff" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="22" cy="57" rx="1.6" ry="2.4" fill="#8fd8ff"/></svg>`,
};
const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs>${GOLD}</defs><path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1l-5.3-5 7.2-.9z" fill="url(#au)" stroke="#8a5a10" stroke-width="1" stroke-linejoin="round"/><path d="M9.6 7.6l2.4-4.2 1 3" fill="#fff" opacity=".7"/></svg>`;
const HAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;
const CARD_BACK = svgU(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><g fill="none" stroke="#d8b25a" stroke-opacity=".38" stroke-width=".8"><path d="M30 6l24 24-24 24L6 30z"/><circle cx="30" cy="30" r="9"/><path d="M0 0l12 12M60 0L48 12M0 60l12-12M60 60L48 48"/></g><path d="M30 24l1.6 4.4L36 30l-4.4 1.6L30 36l-1.6-4.4L24 30l4.4-1.6z" fill="#f2c255" fill-opacity=".7"/></svg>`);

// 손님 겉모습(그림을 못 불러올 때만 도트로 대체)
function custSpec() {
  const s = uSpec(pick(["plain", "student", "worker", "worker", "teen", "plain"]));
  s.kid = false; s.elder = false; s.pack = null; s.hat = null;
  s.shirt2 = mix(s.shirt, 0.75); s.pantsD = mix(s.pants, 0.75);
  return s;
}
// 대체용 도트 손님 상반신(44x56)
function paintSit(P, s, o) {
  const ox = 22, oy = 56, m = o.mood || "neu";
  const sk = s.skin, skD = mix(sk, 0.86), hc = s.hair, sh = s.shirt, sh2 = s.shirt2;
  const ty = 32, hy = ty - 16, hx = ox;
  if (s.style === "long") P(hx - 10, hy + 3, 20, 22, hc);
  P(ox - 13, ty + 2, 26, oy - ty - 2, sh); P(ox - 11, ty, 22, 2, sh); P(ox + 9, ty + 2, 4, oy - ty - 2, sh2);
  P(ox - 3, ty, 6, 1, sk); P(hx - 2, hy + 14, 4, ty - hy - 13, skD);
  P(hx - 7, hy, 14, 15, sk); P(hx - 8, hy + 2, 16, 11, sk); P(hx + 5, hy + 3, 2, 10, skD);
  const ey = hy + 7, lx = hx - 5, rx = hx + 3, dk = "#2a1e2e";
  if (m === "happy") for (const ex of [lx, rx]) { P(ex - 1, ey + 1, 1, 1, dk); P(ex, ey, 2, 1, dk); P(ex + 2, ey + 1, 1, 1, dk); }
  else for (const ex of [lx, rx]) { P(ex, ey, 2, 2, dk); P(ex, ey, 1, 1, "#ffffff"); }
  P(hx - 1, hy + 11, 2, 1, m === "happy" ? "#e06070" : "#a0524a");
  P(hx - 8, hy - 2, 16, 4, hc); P(hx - 7, hy - 3, 14, 1, hc); P(hx - 9, hy, 1, 4, hc); P(hx + 8, hy, 1, 4, hc);
  if (s.style === "bob" || s.style === "long") { P(hx - 10, hy + 1, 3, s.style === "long" ? 22 : 11, hc); P(hx + 7, hy + 1, 3, s.style === "long" ? 22 : 11, hc); }
  else { P(hx - 8, hy + 2, 6, 2, hc); P(hx - 9, hy + 2, 2, 5, hc); P(hx + 7, hy + 2, 2, 5, hc); }
  return { hy, hx };
}
// 방법 화면 그림 3장(SVG)
function stepPics() {
  const bg = (id, a, b) => `<radialGradient id="${id}" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
  const hand = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s * 0.62})">${HAND_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/id="k"/, 'id="k2"').replace(/url\(#k\)/, "url(#k2)")}</g>`;
  const inner = (s) => s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs>${bg("b", "#4a2a72", "#160a2a")}</defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
    <circle cx="36" cy="34" r="20" fill="#ffd166" opacity=".16"/><g transform="translate(16 14) scale(1.25)">${inner(ICON.ring).replace(/id="au"/, 'id="au1"').replace(/url\(#au\)/g, "url(#au1)").replace(/id="d"/, 'id="d1"').replace(/url\(#d\)/g, "url(#d1)")}</g>
    <circle cx="44" cy="46" r="9" fill="none" stroke="#ffd166" stroke-width="2" opacity=".8"/>${hand(40, 42)}</svg>`);
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs>${bg("b", "#3a2a5a", "#120a22")}<linearGradient id="cp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd3e2"/></linearGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
    <path d="M30 22c-3-4 3-6 0-10M38 22c-3-4 3-6 0-10M46 22c-3-4 3-6 0-10" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/>
    <ellipse cx="38" cy="58" rx="22" ry="5" fill="#e6e8f2"/><path d="M22 28h32l-3 24a5 5 0 0 1-5 4H30a5 5 0 0 1-5-4z" fill="url(#cp)" stroke="#9aa0b8" stroke-width="1.2"/><ellipse cx="38" cy="28" rx="16" ry="3.6" fill="#6a3a1a"/><path d="M54 33c8 0 8 12 0 12" fill="none" stroke="#cfd3e2" stroke-width="4"/>
    <path d="M14 14l52 52M66 14L14 66" stroke="#ff4f5e" stroke-width="5" stroke-linecap="round" opacity=".9"/></svg>`);
  const card = (x, y, r, on, w) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-12" y="-18" width="24" height="36" rx="3" fill="${on ? "#2c1858" : "#241a3a"}" stroke="${on ? "#f2c255" : "#6a5a8a"}" stroke-width="1.6"/><rect x="-9" y="-15" width="18" height="30" rx="1.6" fill="none" stroke="${on ? "#f2c25588" : "#6a5a8a66"}" stroke-width=".8"/><g opacity="${on ? 1 : 0.35}" transform="translate(-9 -9) scale(.28)">${inner(WICON[w]).replace(/id="(\w+)"/g, `id="$1${w}"`).replace(/url\(#(\w+)\)/g, `url(#$1${w})`)}</g></g>`;
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs>${bg("b", "#5a2a8a", "#14082a")}<radialGradient id="gl"><stop offset="0" stop-color="#ffd166" stop-opacity=".6"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>${GOLD}</defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
    ${card(18, 46, -14, false, "quit")}${card(62, 46, 14, false, "offer")}<circle cx="40" cy="38" r="26" fill="url(#gl)"/>${card(40, 38, 0, true, "marry")}${SPK(16, 14, 4)}${SPK(66, 16, 3, "#ffe9a0")}${SPK(58, 70, 3)}</svg>`);
  return [[`<img src="${a}" alt="">`, "몸짓 단서 톡"], [`<img src="${b}" alt="">`, "가짜 몸짓은 그냥"], [`<img src="${c}" alt="">`, "진짜 고민 고르기"]];
}
const CU_POOL = [...Array(23)].map((_, i) => "c" + String(i + 1).padStart(3, "0")).concat(["pM1", "pM2", "pM3", "pM4", "pM5", "pM6", "pM7", "pM8", "pF2", "pF3", "pF4", "pF5", "pF6", "pF7", "pF8"]);

export const GAME = {
  key: "tarot2", base: "tarot", jc: "#b48cff", n: "속마음 읽기", desc: "카페 상담실 타로, 카드보다 상담이 본업이에요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 손님이 별일 아닌 척 이야기하는 동안 <b>몸짓에 단서</b>가 잠깐씩 스쳐요.",
    "<b>반지 만지작·폰 알림·사원증 줄·문 쪽 시선·한숨·다리 떨기·통지서</b>가 보이면 톡! 커피 홀짝·머리 넘기기·창밖 보기는 <b>가짜</b>라 누르면 감점이에요.",
    "마지막에 <b>진짜 고민</b> 카드 3장 중 하나를 골라요. 단서를 많이 모을수록 안 맞는 카드가 흐려져요. 손님 3명을 상담해요. 손님 <b>표정</b>도 힌트예요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "몸짓 단서 톡"], ["", "가짜 몸짓은 그냥"], ["", "진짜 고민 고르기"]]; } },
  css: `.mg-tarot2 .mg-steps img{width:76px;height:76px;image-rendering:auto;border-radius:12px;box-shadow:0 3px 10px #0006}
.mg-tarot2 .t2-st{background:#120a1e!important}
.mg-tarot2 .t2-bgi{position:absolute;inset:-4px;z-index:0;background:url("img/bg/tarot.webp") 44% 50%/cover no-repeat;filter:brightness(.6) saturate(1.15) blur(.7px);transform:scale(1.02)}
.mg-tarot2 .t2-vg{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 80% 55% at 42% 38%,#ffb05a1c,transparent 70%),linear-gradient(180deg,#0d061a99 0%,transparent 22%,transparent 50%,#0d061acc 100%),radial-gradient(ellipse at 50% 45%,transparent 55%,#05020caa 100%)}
.mg-tarot2 .t2-dl{position:absolute;left:0;top:0;bottom:0;width:46%;z-index:1;pointer-events:none;opacity:0;background:linear-gradient(90deg,#ffc27acc,#ffb05a44 35%,transparent);mix-blend-mode:screen}
.mg-tarot2 .t2-cv{position:absolute;left:0;top:0;touch-action:none}
.mg-tarot2 .t2-bk{z-index:1;image-rendering:pixelated;image-rendering:crisp-edges}
.mg-tarot2 .t2-fr{z-index:3;cursor:pointer}
.mg-tarot2 .t2-cu,.mg-tarot2 .t2-me{position:absolute;z-index:2;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;pointer-events:none;transform-origin:50% 100%}
.mg-tarot2 .t2-cu{filter:drop-shadow(0 0 10px #ffb05a33) drop-shadow(0 6px 10px #0009);transition:filter .3s}
.mg-tarot2 .t2-cu.dim,.mg-tarot2 .t2-me.dim{filter:brightness(.55) saturate(.7)}
.mg-tarot2 .t2-me{transition:opacity .5s,filter .3s;filter:drop-shadow(0 0 8px #b48cff44) brightness(.92)}
.mg-tarot2 .t2-me.on{opacity:1}
.mg-tarot2 .t2-bub{position:absolute;z-index:6;max-width:58%;background:linear-gradient(#fffefa,#f6f0e6);color:#2a1e2e;font-size:12.5px;line-height:1.4;font-weight:700;padding:7px 10px;border-radius:14px;box-shadow:0 4px 14px #0008,0 0 0 1px #ffffff55;pointer-events:none;opacity:0;transform:scale(.6);transition:opacity .15s,transform .2s cubic-bezier(.3,1.6,.5,1);word-break:keep-all}
.mg-tarot2 .t2-bub.on{opacity:1;transform:none}
.mg-tarot2 .t2-bub.c{left:8px;transform-origin:30% 100%}
.mg-tarot2 .t2-bub.m{right:8px;transform-origin:70% 100%;background:linear-gradient(#f8f2ff,#ebe0ff);box-shadow:0 4px 14px #0008,0 0 0 1.5px #b48cff}
.mg-tarot2 .t2-bub::after{content:"";position:absolute;bottom:-7px;border:7px solid transparent;border-bottom:0}
.mg-tarot2 .t2-bub.c::after{left:34px;border-top-color:#f6f0e6}.mg-tarot2 .t2-bub.m::after{right:30px;border-top-color:#ebe0ff}
.mg-tarot2 .t2-bub.big{font-size:15px;font-weight:900;color:#c0306a}
.mg-tarot2 .t2-bub small{display:block;font-size:11.5px;color:#6a5a7a;font-weight:700}
.mg-tarot2 .t2-pan{position:absolute;left:6px;right:6px;bottom:6px;z-index:6;background:linear-gradient(#24124af2,#170b30f5);border:1px solid #d8b25a66;border-radius:14px;padding:6px 7px 7px;display:flex;flex-direction:column;gap:5px;box-shadow:0 -4px 18px #000a,inset 0 1px 0 #ffffff14}
.mg-tarot2 .t2-nt{display:flex;align-items:center;gap:4px}
.mg-tarot2 .t2-nt>b{flex:0 0 auto;writing-mode:vertical-rl;font-size:11px;font-weight:900;color:#e8cf8a;letter-spacing:1px;background:#d8b25a1c;border:1px solid #d8b25a44;border-radius:6px;padding:4px 1px}
.mg-tarot2 .t2-slots{flex:1;display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.mg-tarot2 .t2-slots i{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;font-style:normal;background:#ffffff08;border:1px dashed #ffffff26;border-radius:8px;padding:3px 0 2px;transition:background .25s,border-color .25s;min-width:0}
.mg-tarot2 .t2-slots img{width:28px;height:28px;opacity:.3;filter:grayscale(1) brightness(1.4);transition:opacity .2s,filter .2s}
.mg-tarot2 .t2-slots small{font-size:11px;font-weight:800;color:#8f7fb0;white-space:nowrap;letter-spacing:-1px;line-height:1.15}
.mg-tarot2 .t2-slots i.on{background:radial-gradient(circle at 50% 30%,#ffd16640,#ffd16614);border:1px solid #ffd166;box-shadow:0 0 8px #ffd16655}
.mg-tarot2 .t2-slots i.on img{opacity:1;filter:drop-shadow(0 0 3px #ffd16699)}
.mg-tarot2 .t2-slots i.on small{color:#ffe9a0}
.mg-tarot2 .t2-slots i.pop{animation:t2pop .45s cubic-bezier(.3,1.7,.5,1)}
.mg-tarot2 .t2-slots i.hint{border-color:#ffd166;animation:t2glow .7s infinite alternate}
.mg-tarot2 .t2-lim{height:4px;flex:0 0 auto;border-radius:9px;background:#ffffff14;overflow:hidden;display:none}
.mg-tarot2 .t2-lim.on{display:block}
.mg-tarot2 .t2-lim i{display:block;height:100%;background:linear-gradient(90deg,#ff5a6a,#ffd166 40%,#b48cff);transform-origin:left}
.mg-tarot2 .t2-task{font-size:13px;font-weight:700;color:#f2eaff;text-align:center;line-height:1.45;word-break:keep-all;min-height:38px}
.mg-tarot2 .t2-task em{font-style:normal;display:inline-block;background:#ff7eb6;color:#fff;font-size:11px;font-weight:900;padding:0 7px;border-radius:6px;margin-right:4px;vertical-align:1px}
.mg-tarot2 .t2-task b{color:#ffd166}.mg-tarot2 .t2-task b.rd{color:#ff8a9a}
.mg-tarot2 .t2-task small{display:block;color:#b8a8d8;font-size:11.5px;font-weight:600}
.mg-tarot2 .t2-tb{display:flex;justify-content:center}
.mg-tarot2 .t2-tb.sk{position:absolute;right:4px;top:-26px}
.mg-tarot2 .t2-skip{background:#1b0f33cc!important;border:0!important;border-radius:8px!important;color:#c8b8e8!important;font-size:11.5px;text-decoration:underline;padding:3px 8px!important}
.mg-tarot2 .t2-go{background:linear-gradient(#f6d27a,#c9952a)!important;color:#2a1400!important;border-radius:10px!important;padding:8px 26px!important;font-weight:900;font-size:14.5px;box-shadow:0 3px 0 #7a5410,0 0 16px #ffd16666!important;animation:t2pulse .5s infinite alternate}
.mg-tarot2 .t2-cards{position:absolute;left:6px;right:6px;z-index:7;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;pointer-events:none}
.mg-tarot2 .t2-cd{pointer-events:auto;position:relative;display:block!important;background:none!important;border:0!important;padding:0!important;color:#fff!important;perspective:700px;transition:transform .15s}
.mg-tarot2 .t2-ci{display:block;position:relative;transform-style:preserve-3d;animation:t2flip .8s cubic-bezier(.3,1.25,.5,1) both}
.mg-tarot2 .t2-cd:nth-child(2) .t2-ci{animation-delay:.12s}.mg-tarot2 .t2-cd:nth-child(3) .t2-ci{animation-delay:.24s}
.mg-tarot2 .t2-cf,.mg-tarot2 .t2-cb{-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:10px}
.mg-tarot2 .t2-cf{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 5px 7px;background:radial-gradient(ellipse at 50% 0%,#5a3a9a,#2a1656 55%,#170a33);border:1.5px solid #d8b25a;box-shadow:0 6px 14px #000a,inset 0 0 0 3px #170a33,inset 0 0 0 4px #d8b25a77;transition:opacity .4s .55s,filter .4s .55s,border-color .3s,box-shadow .3s;overflow:hidden}
.mg-tarot2 .t2-cf::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,#ffffff30 45%,transparent 60%);transform:translateX(-120%);animation:t2shine 2.6s 1s infinite;pointer-events:none}
.mg-tarot2 .t2-cf::after{content:"✦  ✧  ✦";position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:11px;color:#d8b25a88;letter-spacing:2px;pointer-events:none}
.mg-tarot2 .t2-cb{position:absolute;inset:0;transform:rotateY(180deg);background:url("${CARD_BACK}") center/30px 30px,radial-gradient(circle,#3a2270,#1a0c3a);border:1.5px solid #d8b25a;box-shadow:0 6px 14px #000a,inset 0 0 0 3px #1a0c3a,inset 0 0 0 4px #d8b25a88}
.mg-tarot2 .t2-md{width:50px;height:50px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,#4a2c86,#1c0d3a);box-shadow:0 0 0 2px #d8b25a,0 0 0 4px #1c0d3a,0 0 0 5px #d8b25a66,0 0 14px #ffd16644}
.mg-tarot2 .t2-md img{width:40px;height:40px}
.mg-tarot2 .t2-cd b{font-size:12.5px;font-weight:900;line-height:1.25;text-align:center;word-break:keep-all;min-height:31px;display:flex;align-items:center;color:#fff6e0;text-shadow:0 1px 2px #000;margin-top:3px}
.mg-tarot2 .t2-cd small{font-size:11px;color:#cbbbe8;font-weight:600;line-height:1.25;text-align:center;word-break:keep-all}
.mg-tarot2 .t2-cd u{display:flex;gap:2px;text-decoration:none;min-height:19px;flex-wrap:wrap;justify-content:center;margin-bottom:8px}
.mg-tarot2 .t2-cd u img{width:18px;height:18px;border-radius:5px;background:#ffd16633;padding:1px}
.mg-tarot2 .t2-cd u img.x{background:#ff4f5e55;filter:grayscale(.7);outline:1px solid #ff4f5e}
.mg-tarot2 .t2-cd.f1 .t2-cf{opacity:.6;filter:saturate(.4) brightness(.85)}
.mg-tarot2 .t2-cd.f2 .t2-cf{opacity:.32;filter:saturate(0) blur(.4px)}
.mg-tarot2 .t2-cd.f2::after{content:"단서와 안 맞아요";position:absolute;top:44%;left:-2px;right:-2px;transform:rotate(-12deg);background:#ff4f5e;color:#fff;font-size:11px;font-weight:900;padding:2px 0;text-align:center;border-radius:4px;box-shadow:0 2px 6px #0008;animation:t2fade .3s .9s both}
.mg-tarot2 .t2-cd.best .t2-cf{border-color:#ffe28a;box-shadow:0 6px 14px #000a,inset 0 0 0 3px #170a33,inset 0 0 0 4px #ffe28a,0 0 18px #ffd166cc}
.mg-tarot2 .t2-cd:active{transform:scale(.96)}
.mg-tarot2 .t2-cd.ok{transform:scale(1.06)}
.mg-tarot2 .t2-cd.ok .t2-cf{opacity:1;filter:none;border-color:#7fe0a8;background:radial-gradient(ellipse at 50% 0%,#3aa87a,#1a5a44 60%,#0d3326);box-shadow:0 6px 14px #000a,inset 0 0 0 3px #0d3326,inset 0 0 0 4px #7fe0a8,0 0 20px #7fe0a8aa;transition-delay:0s}
.mg-tarot2 .t2-cd.ng .t2-cf{border-color:#ff8a9a;background:radial-gradient(ellipse at 50% 0%,#9a3a5a,#5a1a30 60%,#2a0a16);transition-delay:0s}
.mg-tarot2 .t2-cd.ng,.mg-tarot2 .t2-cd.no{animation:t2no .35s}
.mg-tarot2 .t2-hand{position:absolute;z-index:9;width:40px;height:40px;margin:-6px 0 0 -14px;background:url("${svgU(HAND_SVG)}") 0 0/100% 100% no-repeat;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px #0009)}
.mg-tarot2 .t2-hand.on{display:block}
.mg-tarot2 .t2-hand.tap{animation:t2tap .8s infinite}
.mg-tarot2 .t2-end{position:absolute;inset:0;z-index:12;background:radial-gradient(ellipse at 50% 25%,#4a2a7af0,#120824f8 72%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;animation:t2fade .5s both;padding:14px}
.mg-tarot2 .t2-end::before{content:"";position:absolute;inset:8px;border:1px solid #d8b25a55;border-radius:12px;pointer-events:none;box-shadow:inset 0 0 0 4px #120824,inset 0 0 0 5px #d8b25a33}
.mg-tarot2 .t2-end h4{margin:0;font-size:20px;font-weight:900;color:#fff3d8;text-shadow:0 2px 8px #000;text-align:center}
.mg-tarot2 .t2-end h4 small{display:block;font-size:12px;color:#e0c890;font-weight:700;margin-top:2px;letter-spacing:1px}
.mg-tarot2 .t2-avg{display:flex;align-items:center;gap:8px;background:#ffffff10;border:1px solid #d8b25a44;border-radius:14px;padding:6px 14px}
.mg-tarot2 .t2-avg img{width:32px;height:32px;filter:drop-shadow(0 0 6px #ffd16699)}
.mg-tarot2 .t2-avg b{font-size:30px;font-weight:900;color:#ffd166;text-shadow:0 2px 0 #7a4a10}
.mg-tarot2 .t2-avg span{font-size:12px;color:#c8b8e8;font-weight:700}
.mg-tarot2 .t2-revs{display:flex;flex-direction:column;gap:7px;width:min(310px,96%)}
.mg-tarot2 .t2-rv{display:flex;gap:9px;align-items:center;background:linear-gradient(#fffefa,#f5efe4);border-radius:12px;padding:6px 9px;color:#2a1e2e;box-shadow:0 4px 12px #0009;opacity:0;animation:t2rv .45s cubic-bezier(.3,1.5,.5,1) forwards}
.mg-tarot2 .t2-rv>img{flex:0 0 auto;width:44px;height:44px;object-fit:cover;background:#e8dcff;border-radius:50%;box-shadow:0 0 0 2px #d8b25a}
.mg-tarot2 .t2-rv>img.px{image-rendering:pixelated}
.mg-tarot2 .t2-rv div{flex:1;min-width:0}
.mg-tarot2 .t2-rv i{display:flex;gap:1px}
.mg-tarot2 .t2-rv i img{width:15px;height:15px;opacity:.18;transform:scale(.4);filter:grayscale(1);transition:opacity .15s,transform .25s cubic-bezier(.3,1.8,.5,1),filter .15s}
.mg-tarot2 .t2-rv i img.on{opacity:1;transform:none;filter:none}
.mg-tarot2 .t2-rv p{margin:1px 0 0;font-size:13px;font-weight:900;line-height:1.3;word-break:keep-all}
.mg-tarot2 .t2-rv small{display:block;font-size:11px;color:#7a6a8a;font-weight:700}
.mg-tarot2 .t2-bye{font-size:12.5px;color:#fff;font-weight:700;opacity:.9;text-align:center}
@keyframes t2tap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes t2pulse{to{transform:scale(1.07)}}
@keyframes t2pop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:none}}
@keyframes t2glow{to{box-shadow:0 0 8px #ffd166}}
@keyframes t2flip{0%{opacity:0;transform:translateY(46px) rotateY(180deg) scale(.7)}35%{opacity:1;transform:translateY(0) rotateY(180deg) scale(1)}100%{opacity:1;transform:rotateY(0)}}
@keyframes t2shine{0%{transform:translateX(-120%)}40%,100%{transform:translateX(120%)}}
@keyframes t2no{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes t2fade{from{opacity:0}}
@keyframes t2rv{from{opacity:0;transform:translateX(-30px) scale(.9)}to{opacity:1;transform:none}}
@media (max-height:640px){.mg-tarot2 .t2-md{width:40px;height:40px}.mg-tarot2 .t2-md img{width:32px;height:32px}.mg-tarot2 .t2-cd small{display:none}}
@media (prefers-reduced-motion:reduce){.mg-tarot2 .t2-go,.mg-tarot2 .t2-ci,.mg-tarot2 .t2-cf::before,.mg-tarot2 .t2-slots i.hint{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "tarot2", "속마음 읽기", "t2-st");
    const st = F.stage;
    const ICU = {}; CL_ORDER.forEach((k) => (ICU[k] = svgU(ICON[k])));
    const WIU = {}; W_KEYS.forEach((k) => (WIU[k] = svgU(WICON[k])));
    const STARU = svgU(STAR_SVG);
    const slotsHTML = CL_ORDER.map((k) => `<i data-c="${k}"><img alt="" src="${ICU[k]}"><small>${CLUE[k].n}</small></i>`).join("");
    st.insertAdjacentHTML("beforeend", `<div class="t2-bgi"></div><div class="t2-vg"></div><div class="t2-dl"></div><canvas class="t2-cv t2-bk"></canvas><div class="t2-cu"></div><div class="t2-me"></div><canvas class="t2-cv t2-fr"></canvas>
      <div class="t2-bub c"></div><div class="t2-bub m"></div><div class="t2-cards"></div>
      <div class="t2-pan"><div class="t2-nt"><b>단서노트</b><div class="t2-slots">${slotsHTML}</div></div><div class="t2-lim"><i></i></div><div class="t2-task">상담실 불을 켜는 중…<small>잠시만요</small></div><div class="t2-tb"></div></div>
      <div class="t2-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const cvB = $(".t2-bk"), gB = cvB.getContext("2d"), cvF = $(".t2-fr"), gF = cvF.getContext("2d");
    const meEl = $(".t2-me"), cuEl = $(".t2-cu"), dlEl = $(".t2-dl"), bubC = $(".t2-bub.c"), bubM = $(".t2-bub.m"), cardsEl = $(".t2-cards"), pan = $(".t2-pan");
    const limEl = $(".t2-lim"), limBar = $(".t2-lim i"), taskEl = $(".t2-task"), tbEl = $(".t2-tb"), hand = $(".t2-hand");
    const slotEl = {}; st.querySelectorAll(".t2-slots i").forEach((e) => (slotEl[e.dataset.c] = e));
    // 크기: 논리 폭 112칸 안팎(좌표계). 앞 캔버스는 기기 해상도로 매끈하게 그린다.
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    cvB.width = LW; cvB.height = LH;
    cvF.width = Math.round(LW * KS); cvF.height = Math.round(LH * KS);
    for (const c of [cvB, cvF]) { c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    gB.imageSmoothingEnabled = false;
    const panH = (pan.offsetHeight || 130) + 6;
    const TY = clamp(Math.min(Math.round(LH * 0.56), Math.floor((sh - panH) / K) - 22), 72, 140); // 탁자 윗면
    const cx = Math.round(LW * 0.36); // 손님 자리
    const CANX = Math.round(LW * 0.7), BALLX = Math.round(LW * 0.6), DECKX = Math.round(LW * 0.9);
    bubM.style.bottom = sh - (TY - 58) * K + "px";
    cardsEl.style.bottom = panH + 4 + "px";
    // 손님 그림 크기·자리(그림 칸 240x312 중 얼굴 눈 0.29, 입 0.39, 가슴 0.68)
    const CH = Math.round(clamp(TY - 26, 58, 80)), CW = CH * 240 / 312, CTOP = TY + 7 - CH;
    const eyeY = CTOP + CH * 0.29, mouthY = CTOP + CH * 0.39, chestY = CTOP + CH * 0.66;
    bubC.style.bottom = sh - (CTOP + 3) * K + "px";
    Object.assign(cuEl.style, { width: Math.round(CW * K) + "px", height: CH * K + "px", left: Math.round((cx - CW / 2) * K) + "px", top: CTOP * K + "px" });
    // 내 캐릭터 그림(3x2 표정 시트)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    {
      const h = 58 * K, w = Math.round(h * 240 / 312);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(LW * 0.86 * K - w / 2) + "px", top: (TY + 5) * K - h + "px" });
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); setMe("neutral"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    let meX = "", meT = 0;
    const setMe = (ex, dur = 0) => { meT = dur; if (ex === meX) return; meX = ex; meEl.style.backgroundPosition = exPos(ex); };
    // 손님 그림: 리허설 1명 + 본게임 3명을 미리 골라 불러 둔다
    const CU_IMG = {};
    const cuKeys = shuffle(CU_POOL.filter((k) => k !== AV)).slice(0, NCU + 2);
    const loadCu = (key) => { if (CU_IMG[key]) return CU_IMG[key]; const r = { ok: false, fail: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.onerror = () => (r.fail = true); r.im.src = "img/body/" + key + ".webp"; return (CU_IMG[key] = r); };
    cuKeys.forEach(loadCu);
    let cuX = "", cuShown = "", keyI = 0;

    // ── 앞 탁자(타로 천)·고정 소품: 한 번만 고해상도로 그려 둔다 ──
    const star4 = (g, x, y, r, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); g.globalAlpha = 1; };
    const glow = (g, x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const heart = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * 0.3); g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.32); g.bezierCurveTo(x - s * 0.5, y + s * 0.62, x, y + s * 0.78, x, y + s); g.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.62, x + s * 0.5, y + s * 0.32); g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); g.fill(); };
    const HEM = TY + 17;
    const TB = mkCanvas(cvF.width, cvF.height);
    {
      const g = TB.getContext("2d"); g.setTransform(KS, 0, 0, KS, 0, 0);
      const top = TY - 7;
      // 바닥 그림자
      glow(g, LW / 2, HEM + 3, LW * 0.7, "0,0,0", 0.55);
      // 윗면(천을 위에서 본 면)
      let gr = g.createLinearGradient(0, top, 0, TY); gr.addColorStop(0, "#241042"); gr.addColorStop(1, "#3c2068");
      g.fillStyle = gr; g.fillRect(-2, top, LW + 4, 7.4);
      glow(g, CANX, TY - 4, 26, "255,176,90", 0.28);
      g.fillStyle = "#d8b25a55"; g.fillRect(-2, top + 0.6, LW + 4, 0.3);
      for (let i = 0; i < 26; i++) { const x = (i * 37.7) % LW, y = top + 1.6 + ((i * 13) % 5); star4(g, x, y, 0.7, "#e8c870", 0.35); }
      // 앞으로 늘어진 천: 물결 밑단
      const sc = 7;
      g.beginPath(); g.moveTo(-2, TY); g.lineTo(LW + 2, TY); g.lineTo(LW + 2, HEM - 1);
      for (let x = LW + 2; x > -2; x -= sc) g.quadraticCurveTo(x - sc / 2, HEM + 1.6, x - sc, HEM - 1);
      g.closePath();
      gr = g.createLinearGradient(0, TY, 0, HEM); gr.addColorStop(0, "#3a1d66"); gr.addColorStop(0.5, "#2a1450"); gr.addColorStop(1, "#1a0b34"); g.fillStyle = gr; g.fill();
      // 주름
      g.save(); g.clip();
      for (let x = 3; x < LW; x += 9) { const fg = g.createLinearGradient(x - 3, 0, x + 3, 0); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(0.5, "rgba(0,0,0,.28)"); fg.addColorStop(1, "rgba(255,255,255,.04)"); g.fillStyle = fg; g.fillRect(x - 3, TY, 6, HEM - TY + 3); }
      glow(g, CANX, TY + 2, 22, "255,176,90", 0.16);
      g.restore();
      // 금실 테두리·자수(달·별)
      g.strokeStyle = "#e2bd62"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-2, TY + 0.25); g.lineTo(LW + 2, TY + 0.25); g.stroke();
      g.strokeStyle = "#d8b25a99"; g.lineWidth = 0.35; g.beginPath(); g.moveTo(-2, TY + 1.6); g.lineTo(LW + 2, TY + 1.6); g.stroke();
      g.beginPath(); g.moveTo(LW + 2, HEM - 3);
      for (let x = LW + 2; x > -2; x -= sc) g.quadraticCurveTo(x - sc / 2, HEM - 0.4, x - sc, HEM - 3);
      g.strokeStyle = "#d8b25acc"; g.lineWidth = 0.45; g.stroke();
      for (let x = LW + 2 - sc / 2; x > -2; x -= sc) { g.fillStyle = "#e2bd62"; g.beginPath(); g.ellipse(x, HEM + 1.4, 0.55, 1, 0, 0, Math.PI * 2); g.fill(); }
      const mx = Math.round(LW * 0.5), my = TY + 8;
      g.fillStyle = "#e2bd62cc"; g.beginPath(); g.arc(mx, my, 3.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2a1450"; g.beginPath(); g.arc(mx + 1.4, my - 0.8, 3, 0, Math.PI * 2); g.fill();
      for (const [x, y, r] of [[mx - 8, my - 2, 1.2], [mx + 7, my + 2, 1], [mx - 16, my + 3, 0.8], [mx + 15, my - 2, 1.3], [mx - 26, my, 1], [mx + 26, my + 1, 0.9], [mx + 36, my - 2, 1.1], [mx - 38, my + 1, 1.2]]) star4(g, x, y, r * 1.4, "#e2bd62", 0.85);
      // 내 쪽 카드 덱
      for (let k = 4; k >= 0; k--) { rr(g, DECKX - 4 - k * 0.25, TY - 6.5 - k * 0.55, 8, 4.4, 0.6); g.fillStyle = k ? "#c9952a" : "#2e1860"; g.fill(); g.strokeStyle = "#7a5410"; g.lineWidth = 0.2; g.stroke(); }
      g.strokeStyle = "#e2bd62"; g.lineWidth = 0.3; rr(g, DECKX - 3.3, TY - 6, 6.6, 3.4, 0.4); g.stroke(); star4(g, DECKX, TY - 4.3, 1.1, "#e2bd62");
      // 수정 구슬 받침
      gr = g.createLinearGradient(BALLX - 4, 0, BALLX + 4, 0); gr.addColorStop(0, "#7a5410"); gr.addColorStop(0.5, "#f2c255"); gr.addColorStop(1, "#7a5410");
      g.fillStyle = gr; g.beginPath(); g.moveTo(BALLX - 4.2, TY - 2); g.lineTo(BALLX + 4.2, TY - 2); g.lineTo(BALLX + 3, TY - 4.6); g.lineTo(BALLX - 3, TY - 4.6); g.closePath(); g.fill();
      // 초 몸통
      gr = g.createLinearGradient(CANX - 1.6, 0, CANX + 1.6, 0); gr.addColorStop(0, "#d8c8f0"); gr.addColorStop(0.4, "#fffaf0"); gr.addColorStop(1, "#b8a8d8");
      g.fillStyle = gr; rr(g, CANX - 1.6, TY - 10, 3.2, 8, 0.6); g.fill();
      g.fillStyle = "#c9952a"; g.beginPath(); g.ellipse(CANX, TY - 2, 3.4, 1, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#3a2a2a"; g.lineWidth = 0.25; g.beginPath(); g.moveTo(CANX, TY - 10); g.lineTo(CANX, TY - 11); g.stroke();
    }
    // 떠다니는 먼지 빛
    const motes = [...Array(14)].map(() => ({ x: rnd() * LW, y: rnd() * TY, s: 0.3 + rnd() * 0.7, v: 0.6 + rnd() * 1.2, p: rnd() * 6 }));

    // ── 상태 ──  tut: 0 준비 / 1 단서 톡 / 2 가짜는 그냥 / 3 한숨 톡 / 4 카드 고르기 / 5 시작 버튼 / -1 본게임
    let tut = opts.retry ? -1 : 0;
    let done = false, raf = 0, last = 0, now0 = 0, tm = null, timeUp = false, closing = false, started = false;
    let phase = "idle", pt = 0, cu = null, cuN = 0, hintAll = false;
    let served = 0, found = 0, realN = 0, correct = 0, falseT = 0, emptyT = 0, combo = 0;
    const log = []; // 손님별 후기 재료
    const sparks = [], rings = [], puffs = [], floats = [], hearts = [];
    let lineI = 0, lineT = 0, doorOpen = 0, bellT = 0, lineSmile = false;
    const rh = () => tut >= 0;

    // ── 말풍선·패널 ──
    let bubCT = 0, bubMT = 0;
    const sayC = (html, dur = 2, big = false) => { bubC.innerHTML = html; bubC.classList.toggle("big", big); bubC.classList.remove("on"); void bubC.offsetWidth; bubC.classList.add("on"); bubCT = dur; lineSmile = /ㅎㅎ|!/.test(html); if (cu) cu.talk = Math.min(1.1, dur); tone(520 + rnd() * 160, 0.035, "triangle", 0.045); tone(640 + rnd() * 160, 0.035, "triangle", 0.035, 0, 0.07); };
    const sayM = (html, dur = 2) => { bubM.innerHTML = html; bubM.classList.remove("on"); void bubM.offsetWidth; bubM.classList.add("on"); bubMT = dur; };
    const SKIP = `<button class="t2-skip" data-skip>리허설 건너뛰기</button>`;
    const setTask = (html, tb = "") => { taskEl.innerHTML = html; tbEl.innerHTML = tb; tbEl.style.display = tb ? "" : "none"; tbEl.classList.toggle("sk", tb === SKIP); };
    const scUpd = () => { F.sc.textContent = `손님 ${served}/${NCU} · 단서 ${found}`; };
    const noteReset = () => CL_ORDER.forEach((k) => slotEl[k].classList.remove("on", "pop", "hint"));
    const handAt = (p) => {
      if (!p) { hand.className = "t2-hand"; return; }
      let x, y; if (Array.isArray(p)) { x = p[0]; y = p[1]; } else { const r = p.getBoundingClientRect(), s = st.getBoundingClientRect(); x = r.left - s.left + r.width * 0.62; y = r.top - s.top + r.height * 0.42; }
      hand.style.left = Math.round(x) + "px"; hand.style.top = Math.round(y) + "px";
      if (!hand.classList.contains("on")) hand.className = "t2-hand on tap";
    };
    // 단서·가짜 몸짓 위치(논리 좌표 가운데, 반폭, 반높이): 손님 그림의 눈·입·가슴 높이에 맞춘다
    const CUPX = cx + 17, CUPY = TY - 4.5, SIPY = mouthY + 4;
    const BOX = {
      ring: [cx - 6, TY - 3, 7, 6], letter: [cx + 6, TY - 5, 8, 7], phone: [cx - 20, TY - 3, 8, 6], badge: [cx + 1, chestY + 3, 8, 9],
      door: [cx - 25, eyeY - 4, 9, 8], window: [cx + 25, eyeY - 7, 9, 8], hair: [cx - 11, CTOP + CH * 0.13, 9, 9],
      sigh: [cx + 10, mouthY - 3, 9, 8], sip: [CUPX - 4, (CUPY + SIPY) / 2, 8, (CUPY - SIPY) / 2 + 5], legs: [cx + 4, HEM + 2, 9, 6],
    };
    const boxOf = (k) => BOX[k].slice();

    // ── 손님 ──
    const mkEvents = (w, first) => {
      const real = shuffle(WORRY[w].set.slice()), fake = shuffle(Object.keys(FAKE)).slice(0, 2);
      const seq = [real[0], fake[0], real[1], real[2], fake[1], real[3]];
      if (!first && rnd() < 0.5) { seq[0] = fake[0]; seq[1] = real[0]; }
      return seq.map((k, i) => { const isR = !!CLUE[k]; return { k, real: isR, t0: 0.5 + i * 0.95 + rnd() * 0.1, dur: isR ? Math.min(1.6, 1.1 * ez) : 0.95, hit: false, gone: false }; });
    };
    const newCust = (reh) => {
      cuN++;
      const used = log.map((l) => l.w);
      const w = reh ? "marry" : pick(W_KEYS.filter((k) => !used.includes(k) && (!cu || k !== cu.w)));
      const key = cuKeys[keyI++ % cuKeys.length], ci = loadCu(key);
      cu = { s: custSpec(), key, ci, w, x: -34, mood: "neu", talk: 0, blink: 0, t: 0, got: [], miss: 0, falseN: 0, ev: reh ? [] : mkEvents(w, cuN === 1), picked: null, ok: false, flash: 0, mt: 0 };
      noteReset(); cardsEl.innerHTML = ""; lineI = 0; lineT = 0.2;
      bubM.classList.remove("on"); bubC.classList.remove("on");
      setPhase("in");
    };
    const custMood = (m, dur) => { if (!cu) return; cu.mood = m; cu.mt = dur || 0; };
    const setPhase = (p) => {
      phase = p; pt = 0; limEl.classList.remove("on"); handAt(null);
      const tag = rh() ? "<em>리허설</em>" : "";
      if (p === "in") setTask("딸랑~ 손님이 들어와요…");
      else if (p === "talk") {
        if (rh()) { tut = 1; cu.ev.push({ k: "ring", real: true, t0: 0.9, dur: 99, hit: false, gone: false }); setTask(`${tag}이야기를 들으며 <b>몸짓</b>을 봐요.<br>지금 <b>반지를 만지작</b>! 반짝이는 반지를 <b>톡</b>`, SKIP); }
        else if (hintAll && cuN === 1) setTask(`몸짓에서 <b>단서</b>가 보이면 톡!<small>커피 홀짝·머리 넘기기·창밖 보기는 가짜예요</small>`);
        else setTask(`단서가 보이면 톡! <b class="rd">가짜 몸짓</b>은 감점<small>손님 ${cuN}/${NCU} · 표정이 굳으면 수상해요</small>`);
      } else if (p === "pick") showCards();
      else if (p === "react") setTask(cu.ok ? "속마음을 읽었어요!" : "아쉬워요…");
      else if (p === "out") setTask(timeUp ? "오늘 상담 마감!" : "다음 손님을 기다려요…");
    };
    // ── 단서 톡 ──
    const evActive = (e) => !e.hit && !e.gone && pt >= e.t0 && pt < e.t0 + e.dur;
    const evP = (e) => e.dur > 50 ? ((pt - e.t0) % 1.6) / 1.6 : clamp((pt - e.t0) / Math.min(e.dur, 1.4), 0, 1);
    const tapAt = (x, y) => {
      if (phase !== "talk" || !cu) return;
      let best = null, bd = 1e9;
      for (const e of cu.ev) {
        if (!evActive(e)) continue; const [bx, by, hw, hh] = boxOf(e.k);
        if (Math.abs(x - bx) <= hw + 3 && Math.abs(y - by) <= hh + 3) { const d = Math.hypot((x - bx) / hw, (y - by) / hh) - (e.real ? 0.15 : 0); if (d < bd) { bd = d; best = e; } }
      }
      const px = [x * K, y * K];
      if (!best) {
        rings.push({ x, y, t: 0, c: "255,255,255" }); SFX.tok();
        if (!rh()) { emptyT++; cu.falseN += 0.5; }
        F.float(px, "…?", "bad"); return;
      }
      if (best.real) {
        best.hit = true; combo++;
        const k = best.k, fresh = !cu.got.includes(k); if (fresh) cu.got.push(k);
        if (!rh()) { found++; scUpd(); }
        F.hit(px, 1, "#ffd166"); F.float([x * K, y * K - 18], CLUE[k].n, "");
        noise(0.05, 4200, 0.05, 0.02, 2); noise(0.04, 3000, 0.04, 0.08, 2); tone(1568, 0.08, "triangle", 0.06, 0, 0.12);
        rings.push({ x, y, t: 0, c: "255,209,102" }); for (let i = 0; i < 10; i++) sparks.push({ x: x + (rnd() - 0.5) * 14, y: y + (rnd() - 0.5) * 12, t: 0, life: 0.5 + rnd() * 0.4, c: pick(["#ffffff", "#ffe9a0", "#ffd84a"]), r: 0.8 + rnd() * 1.2 });
        const sl = slotEl[k]; sl.classList.remove("pop", "hint"); void sl.offsetWidth; sl.classList.add("on", "pop");
        setMe("surprised", 0.5);
        if (rh() && tut === 1) { tut = 2; cu.ev.push({ k: "sip", real: false, t0: pt + 0.7, dur: 2.4, hit: false, gone: false }); setTask(`<em>리허설</em>잘했어요! 이번엔 <b>커피를 홀짝</b>. 표정도 편하죠?<br>이런 평범한 몸짓은 <b class="rd">가짜</b>예요. 누르지 말고 지켜봐요`, SKIP); }
        else if (rh() && tut === 3) { tut = 4; endTalk(0.6); }
      } else {
        best.hit = true; combo = 0;
        if (rh()) { SFX.fail(); F.msg("그건 그냥 커피 마시기! 본게임에선 감점이에요"); best.hit = false; return; }
        falseT++; cu.falseN++;
        F.miss(px); F.float([x * K, y * K - 18], "가짜 몸짓!", "bad");
        custMood("anx", 0.8); sayC(pick(["네…? 왜 그렇게 보세요?", "제 얼굴에 뭐 묻었어요?", "…?"]), 1.0);
        setMe("sad", 0.6);
      }
    };
    let talkEndAt = -1;
    const endTalk = (delay = 0.3) => { if (talkEndAt < 0) talkEndAt = pt + delay; };
    // ── 진짜 고민 카드 ──
    let cardOpts = [];
    const fogOf = (w) => cu.got.filter((k) => !WORRY[w].set.includes(k)).length;
    const showCards = () => {
      const others = shuffle(W_KEYS.filter((k) => k !== cu.w)).slice(0, 2);
      cardOpts = shuffle([cu.w, ...others]);
      if (rh()) cardOpts = ["quit", "marry", "offer"];
      const lit = cu.got.slice();
      cardsEl.innerHTML = cardOpts.map((w) => {
        const f = fogOf(w), ic = lit.map((k) => `<img class="${WORRY[w].set.includes(k) ? "" : "x"}" src="${ICU[k]}" alt="">`).join("");
        return `<button class="t2-cd ${f >= 2 ? "f2" : f === 1 ? "f1" : lit.length >= 2 ? "best" : ""}" data-w="${w}"><span class="t2-ci"><span class="t2-cf"><span class="t2-md"><img src="${WIU[w]}" alt=""></span><b>${WORRY[w].t}</b><small>${WORRY[w].s}</small><u>${ic}</u></span><span class="t2-cb"></span></span></button>`;
      }).join("");
      bubC.classList.remove("on");
      setMe("neutral");
      tone(392, 0.18, "sine", 0.07); tone(587, 0.22, "sine", 0.06, 0, 0.1); tone(784, 0.3, "triangle", 0.05, 0, 0.2);
      if (rh()) setTask(`<em>리허설</em>단서 2개가 모였어요. 단서와 <b class="rd">안 맞는 카드</b>는 흐려져요.<br><b>밝은 카드</b>가 손님의 진짜 고민! 톡`, SKIP);
      else { setTask(`<b>진짜 고민</b> 카드를 골라요<small>${lit.length ? `모은 단서 ${lit.length}개 · 흐린 카드는 단서와 안 맞아요` : "단서가 없어서… 감으로 골라요"}</small>`); limEl.classList.add("on"); }
    };
    const choose = (w, btn) => {
      if (phase !== "pick" || !cu || cu.chosen) return;
      const right = w === cu.w;
      if (rh() && !right) { SFX.fail(); F.msg("흐린 카드는 단서와 안 맞아요! 밝은 카드를 골라요"); if (btn) { btn.classList.remove("no"); void btn.offsetWidth; btn.classList.add("no"); } return; }
      cu.chosen = true; cu.picked = w; cu.ok = right; limEl.classList.remove("on"); handAt(null);
      cardsEl.querySelectorAll(".t2-cd").forEach((b) => { b.disabled = true; if (b.dataset.w === cu.w) b.classList.add("ok"); else if (b === btn) b.classList.add("ng"); });
      const sp = clamp(1 - pt / (6 * ez), 0, 1);
      if (!rh()) {
        served++; realN += cu.ev.filter((e) => e.real && (e.hit || e.gone)).length; if (right) correct++;
        log.push({ w: cu.w, ok: right, got: cu.got.slice(), falseN: cu.falseN, sp, s: cu.s, ci: cu.ci });
        scUpd();
      }
      if (right) {
        if (btn) F.hit(btn, rh() ? 1 : 3, "#7fe0a8"); else SFX.ding(3);
        [1046, 1318, 1568, 2093].forEach((f, k) => tone(f, 0.2, "triangle", 0.08, 0, 0.25 + k * 0.06));
        vib([20, 30, 40]);
      } else { F.miss(btn || null); F.msg(btn ? "아쉬워요! 진짜 고민은 초록 카드였어요" : "시간 초과!"); }
      setTimeout(() => { if (!done && cu) doReact(); }, 650);
    };
    cardsEl.addEventListener("click", (e) => { const b = e.target.closest(".t2-cd"); if (!b || b.disabled) return; choose(b.dataset.w, b); });
    tbEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });
    // ── 반응 ──
    const doReact = () => {
      cardsEl.innerHTML = "";
      setPhase("react");
      const W = WORRY[cu.w];
      if (cu.ok) {
        custMood("surp", 1.3); cu.flash = 1;
        sayC(`어떻게 아셨어요?!<small>${W.conf}</small>`, 2.4, true);
        for (let k = 0; k < 9; k++) hearts.push({ x: cx + (rnd() - 0.5) * 30, y: CTOP + 10 - rnd() * 6, vy: -9 - rnd() * 8, t: 0, d: 0.3 + k * 0.07, s: 3 + rnd() * 2 });
        const g = cu.got[0];
        setTimeout(() => { if (!done && phase === "react") { sayM(g ? `${CLUE[g].say}. ㅎㅎ` : "카드가 그렇게 말하네요 ㅎㅎ", 1.8); setMe("smile", 1.6); } }, 700);
        setMe("smile", 1.4);
      } else {
        custMood("sad", 2); sayC(`음… 그건 아닌데요?<small>${W.conf}</small>`, 2.2);
        setMe("sad", 1.6);
      }
    };
    // ── 마감·후기 ──
    const faceURL = (l) => {
      const ci = l.ci;
      if (ci && ci.ok) { try { const im = ci.im, cw = im.width / 3, k = cw / 240, c = mkCanvas(96, 96); c.getContext("2d").drawImage(im, cw + 58 * k, 22 * k, 124 * k, 124 * k, 0, 0, 96, 96); return [c.toDataURL("image/webp", 0.85), ""]; } catch (e) {} }
      const c = mkCanvas(44, 56), g = c.getContext("2d"); paintSit((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }, l.s, { mood: "happy" }); uOutline(c); const o = mkCanvas(28, 28); o.getContext("2d").drawImage(c, 8, 7, 28, 28, 0, 0, 28, 28); return [o.toDataURL(), "px"];
    };
    const closeShop = () => {
      if (closing) return; closing = true; setPhase("closed"); setTask("오늘 상담 마감!"); handAt(null); if (tm) tm.stop();
      bubC.classList.remove("on"); bubM.classList.remove("on"); meEl.classList.add("dim");
      [784, 659, 523, 659].forEach((f, k) => tone(f, 0.2, "triangle", 0.09, 0, k * 0.14));
      const rv = log.map((l) => {
        const n = l.got.length, stars = l.ok ? (n >= 2 && l.falseN < 1 ? 5 : n >= 1 ? 5 : 4) - (l.falseN >= 2 ? 1 : 0) : n >= 2 ? 3 : 2;
        const txt = l.ok ? (stars >= 5 ? pick(["소름 돋게 정확해요", "말 안 했는데 다 아셨어요", "여기 진짜예요… 소름"]) : "신기하게 맞혔어요!") : pick(["음… 반은 맞았어요", "제 얘기를 더 들어 주셨으면…", "분위기는 좋았어요"]);
        const sub = l.ok ? (n ? l.got.map((k) => CLUE[k].n).join("·") + " 단서로 읽음" : "감으로 읽음") : WORRY[l.w].t;
        return { stars, txt, sub, f: faceURL(l) };
      });
      const avg = rv.length ? rv.reduce((a, r) => a + r.stars, 0) / rv.length : 0;
      const ov = document.createElement("div"); ov.className = "t2-end";
      ov.innerHTML = `<h4>오늘의 상담 후기<small>카페 타로 · 속마음 읽기</small></h4>
        <div class="t2-avg"><img src="${STARU}" alt=""><b data-avg>0.0</b><span>/ 5 · 후기 ${rv.length}개</span></div>
        <div class="t2-revs">${rv.map((r, i) => `<div class="t2-rv" style="animation-delay:${0.5 + i * 0.75}s"><img class="${r.f[1]}" src="${r.f[0]}" alt=""><div><i>${[0, 1, 2, 3, 4].map(() => `<img src="${STARU}" alt="">`).join("")}</i><p>“${r.txt}”</p><small>${r.sub}</small></div></div>`).join("")}</div>
        <div class="t2-bye">${!rv.length ? "손님 마음을 읽기도 전에 마감했어요…" : correct === rv.length ? "“여기 타로 잘 본대” 소문이 났어요!" : correct ? "다음엔 몸짓을 더 잘 봐요" : "단서를 모으면 카드가 쉬워져요"}</div>`;
      setTimeout(() => {
        if (done) return; st.appendChild(ov);
        rv.forEach((r, i) => {
          const im = ov.querySelectorAll(".t2-rv")[i].querySelectorAll("i img");
          for (let s = 0; s < r.stars; s++) setTimeout(() => { if (!im[s]) return; im[s].classList.add("on"); tone(1046 * Math.pow(1.12, s), 0.07, "triangle", 0.07); if (s === r.stars - 1 && r.stars >= 5) { SFX.ding(4); vib(15); } }, 900 + i * 750 + s * 110);
        });
        const ab = ov.querySelector("[data-avg]"), t1 = performance.now();
        const cnt = () => { if (!ov.isConnected) return; const p = clamp((performance.now() - t1 - 700) / (rv.length * 750 + 300), 0, 1); ab.textContent = (avg * (1 - Math.pow(1 - p, 3))).toFixed(1); if (p < 1) requestAnimationFrame(cnt); };
        requestAnimationFrame(cnt);
      }, 450);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const fr = realN ? found / realN : 0, pr = served ? correct / served : 0, clean = served ? clamp(1 - (falseT + emptyT * 0.5) * 0.14, 0, 1) : 0;
        const score = served ? (0.42 * fr + 0.43 * pr + 0.15 * clean) * (0.5 + 0.5 * Math.min(1, served / NCU)) : 0.04;
        finish(score, `손님 <b>${served}명</b> 상담 · 속마음 적중 ${correct}명 · 별점 ${avg.toFixed(1)}`, "", [["단서 찾기", fr], ["진짜 고민", pr], ["헛짚기 없음", clean]]);
      }, 1700 + Math.max(1, rv.length) * 750 + 1300);
    };
    const onTimeUp = () => {
      if (timeUp) return; timeUp = true; F.msg("마감 시간! 이 손님이 마지막이에요");
      if (!cu) closeShop();
      else if (phase === "talk") endTalk(0);
      else if (phase === "in") setPhase("out");
    };
    // ── 리허설 → 본게임 ──
    const startGame = () => {
      if (started) return; started = true; tut = -1;
      served = 0; found = 0; realN = 0; correct = 0; falseT = 0; emptyT = 0; log.length = 0; cuN = 0; combo = 0;
      handAt(null); hintAll = true; SFX.go(); cardsEl.innerHTML = ""; talkEndAt = -1;
      cu = null; newCust(false); scUpd();
      tm = timer(T, F.bar, onTimeUp);
    };

    // ── 입력 ──
    const toL = (e) => { const r = cvF.getBoundingClientRect(); return [(e.clientX - r.left) / K, (e.clientY - r.top) / K]; };
    cvF.addEventListener("pointerdown", (e) => { e.preventDefault(); const [x, y] = toL(e); tapAt(x, y); });

    // ── 그리기 ──
    const CC = mkCanvas(44, 56), cg = CC.getContext("2d");
    const ease = (p) => (p < 0.3 ? p / 0.3 : p > 0.75 ? (1 - p) / 0.25 : 1);
    const drawCup = (g, x, y, lift) => {
      if (!lift) { g.fillStyle = "#e9e6f2"; g.beginPath(); g.ellipse(x, y + 4.2, 5, 1.2, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#b8b4c8"; g.beginPath(); g.ellipse(x, y + 4.5, 4.2, 0.7, 0, 0, Math.PI); g.fill(); }
      const gr = g.createLinearGradient(x - 3, 0, x + 3, 0); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.6, "#eceaf4"); gr.addColorStop(1, "#b9b6cc");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3, y - 1); g.lineTo(x + 3, y - 1); g.quadraticCurveTo(x + 2.9, y + 4, x + 1.6, y + 4.2); g.lineTo(x - 1.6, y + 4.2); g.quadraticCurveTo(x - 2.9, y + 4, x - 3, y - 1); g.fill();
      g.strokeStyle = "#cfcbe0"; g.lineWidth = 0.7; g.beginPath(); g.arc(x + 3.4, y + 1.2, 1.3, -1.3, 1.3); g.stroke();
      g.fillStyle = "#5a2e14"; g.beginPath(); g.ellipse(x, y - 1, 3, 0.8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#c9952a"; g.fillRect(x - 3, y + 0.6, 6, 0.35);
    };
    const render = (tt) => {
      const ox = cu ? cx + cu.x : cx;
      const ev = {}; if (cu && phase === "talk") for (const e of cu.ev) if (evActive(e)) ev[e.k] = e;
      const g = gF;
      // 문빛(손님이 드나들 때 왼쪽에서 따뜻한 빛)
      dlEl.style.opacity = (doorOpen * 0.85).toFixed(2);
      // 손님: 그림이면 표정 시트, 못 불러오면 도트
      gB.clearRect(0, 0, LW, LH);
      if (cu && cu.ci.ok) {
        if (cuShown !== cu.key) { cuShown = cu.key; cuEl.style.backgroundImage = `url("${cu.ci.im.src}")`; cuX = ""; }
        const evk = Object.keys(ev)[0];
        const ex = cu.mood !== "neu" ? MX[cu.mood] || "neutral" : evk ? EVX[evk] : phase === "talk" && cu.talk > 0 && lineSmile ? "smile" : "neutral";
        if (ex !== cuX) { cuX = ex; cuEl.style.backgroundPosition = exPos(ex); }
        const walk = phase === "in" || phase === "out";
        let dx = 0, dy = 0, rot = 0;
        if (ev.door) { dx = -1.6; rot = -2.5; } else if (ev.window) { dx = 1.6; rot = 2.5; }
        if (ev.sigh) { dy = 1.4 * Math.sin(Math.PI * evP(ev.sigh)); rot -= 1; }
        if (ev.hair) rot -= 3 * Math.sin(Math.PI * evP(ev.hair));
        if (ev.legs) dy += Math.sin(tt * 40) * 0.25;
        if (walk) dy += -Math.abs(Math.sin(tt * 9)) * 1.2;
        else if (cu.talk > 0) dy += -Math.abs(Math.sin(tt * 8)) * 0.4;
        if (cu.mood === "surp") dy -= 1.5 + Math.abs(Math.sin(tt * 12)) * 0.6;
        if (cu.mood === "happy") dy -= Math.abs(Math.sin(tt * 7)) * 0.8;
        dy += Math.sin(tt * 1.6) * 0.25; // 숨쉬기
        cuEl.style.transform = `translate(${((cu.x + dx) * K).toFixed(1)}px,${(dy * K).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
        cuEl.style.opacity = clamp(1 + cu.x / 24, 0, 1).toFixed(2);
        cuEl.classList.toggle("dim", closing);
      } else {
        cuEl.style.opacity = "0";
        if (cu) {
          cg.clearRect(0, 0, 44, 56);
          paintSit((x, y, w, h, c) => { cg.fillStyle = c; cg.fillRect(x, y, w, h); }, cu.s, { mood: cu.mood === "happy" || cu.mood === "surp" ? "happy" : "neu" });
          uOutline(CC);
          const sx = Math.round(ox) - 22, sy = TY - 48;
          gB.drawImage(CC, 0, 0, 44, 50, sx, sy, 44, 50);
        }
      }
      // 앞 캔버스(고해상도)
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvF.width, cvF.height);
      g.setTransform(KS, 0, 0, KS, 0, 0);
      // 떠다니는 먼지 빛
      for (const m of motes) { const y = (m.y - tt * m.v + 400) % (TY + 4), x = m.x + Math.sin(tt * 0.6 + m.p) * 2; g.globalAlpha = (0.25 + 0.2 * Math.sin(tt * 2 + m.p)) * (closing ? 0.3 : 1); g.fillStyle = "#ffe2b0"; g.beginPath(); g.arc(x, y, m.s * 0.5, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      // 시선(문 쪽·창밖): 눈에서 옆으로 흐르는 빛 점선 + 끝의 반짝
      for (const k of ["door", "window"]) if (ev[k]) {
        const d = k === "door" ? -1 : 1, p = evP(ev[k]), [bx, by] = BOX[k];
        g.strokeStyle = k === "door" ? "rgba(255,214,140,.95)" : "rgba(170,210,255,.95)"; g.lineWidth = 0.8; g.setLineDash([1.2, 1.4]); g.lineDashOffset = -tt * 8 * d;
        g.beginPath(); g.moveTo(cx + d * 11, eyeY - 1); g.quadraticCurveTo(cx + d * 16, eyeY - 6, bx - d * 5, by + 2); g.stroke(); g.setLineDash([]);
        glow(g, bx, by + 1, 11, k === "door" ? "255,200,120" : "150,200,255", 0.6 + 0.25 * Math.sin(tt * 10));
        star4(g, bx + d * 6, by - 2, 1.6 + Math.sin(tt * 12) * 0.5, "#ffffff");
        // 눈 모양
        g.save(); g.translate(bx, by + 2); g.scale(1.5, 1.5); g.globalAlpha = clamp(p * 4, 0, 1);
        g.fillStyle = "#ffffffee"; g.beginPath(); g.moveTo(-3.4, 0); g.quadraticCurveTo(0, -3, 3.4, 0); g.quadraticCurveTo(0, 3, -3.4, 0); g.fill();
        g.fillStyle = "#2a1e2e"; g.beginPath(); g.arc(d * 1.2, 0, 1.3, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(d * 1.2 - 0.4, -0.4, 0.4, 0, Math.PI * 2); g.fill();
        g.restore(); g.globalAlpha = 1;
      }
      // 머리 넘기기(가짜): 머리 위로 휙 지나가는 곡선
      if (ev.hair) {
        const p = evP(ev.hair), [bx, by] = BOX.hair;
        g.lineCap = "round";
        for (let i = 0; i < 3; i++) { const a = clamp(p * 1.6 - i * 0.15, 0, 1); g.strokeStyle = `rgba(255,240,220,${(0.75 * Math.sin(Math.PI * a)).toFixed(2)})`; g.lineWidth = 0.7 - i * 0.15; g.beginPath(); g.arc(bx + 6, by + 6 + i * 1.6, 7 + i * 1.6, Math.PI * 1.05, Math.PI * (1.05 + 0.55 * a)); g.stroke(); }
        star4(g, bx - 1, by - 1, 1.4, "#fff", Math.sin(Math.PI * p));
      }
      // 한숨 구름
      if (ev.sigh) {
        const p = evP(ev.sigh);
        for (let i = 0; i < 3; i++) {
          const q = clamp(p * 1.4 - i * 0.18, 0, 1); if (q <= 0) continue;
          const r = 1.8 + q * 2.6, x = cx + 3 + q * 13 + i * 2.6, y = mouthY - q * 8;
          g.globalAlpha = clamp((1 - q) * 1.8, 0, 1);
          const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.3); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#c7d2ec");
          g.fillStyle = gr; g.beginPath(); g.arc(x - r * 0.6, y + r * 0.2, r * 0.7, 0, Math.PI * 2); g.arc(x, y - r * 0.2, r, 0, Math.PI * 2); g.arc(x + r * 0.7, y + r * 0.25, r * 0.65, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      }
      // 사원증(가슴 앞에서 흔들리는 줄)
      if (ev.badge) {
        const p = evP(ev.badge), a = Math.sin(tt * 7) * 0.18 * clamp(p * 4, 0, 1), nx = cx, ny = chestY - 9;
        g.save(); g.translate(nx, ny); g.rotate(a);
        g.strokeStyle = "#3a6ad0"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-3.6, -2); g.lineTo(0, 9); g.lineTo(3.6, -2); g.stroke();
        g.fillStyle = "#c9cfdc"; g.fillRect(-0.8, 8.4, 1.6, 1.6);
        g.translate(0, 10); g.fillStyle = "rgba(0,0,0,.35)"; rr(g, -3.6, 0.5, 7.6, 9.6, 0.9); g.fill();
        g.fillStyle = "#f7f8fb"; rr(g, -3.8, 0, 7.6, 9.6, 0.9); g.fill(); g.fillStyle = "#3a6ad0"; g.fillRect(-3.8, 0.8, 7.6, 1.8);
        g.fillStyle = "#e5c2a0"; g.beginPath(); g.arc(-1.6, 5, 1.2, 0, Math.PI * 2); g.fill(); g.fillStyle = "#7f8aa6"; g.fillRect(-2.8, 6.5, 2.4, 1.6);
        g.fillStyle = "#9aa4b8"; g.fillRect(0.6, 4.4, 2.4, 0.6); g.fillRect(0.6, 6, 1.8, 0.6);
        g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(-3.8 + (tt * 6) % 9, 0); g.lineTo(-2.8 + (tt * 6) % 9, 0); g.lineTo(-4.8 + (tt * 6) % 9, 9.6); g.lineTo(-5.8 + (tt * 6) % 9, 9.6); g.fill();
        g.restore();
      }
      g.drawImage(TB, 0, 0, TB.width, TB.height, 0, 0, LW, LH);
      // 수정 구슬
      { const by = TY - 8.5, r = 4.4;
        glow(g, BALLX, by, 12, "180,140,255", closing ? 0.15 : 0.35 + 0.1 * Math.sin(tt * 2));
        const gr = g.createRadialGradient(BALLX - 1.4, by - 1.6, 0.4, BALLX, by, r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.25, "#d9c8ff"); gr.addColorStop(0.75, "#7a5ad0"); gr.addColorStop(1, "#3a2280");
        g.fillStyle = gr; g.beginPath(); g.arc(BALLX, by, r, 0, Math.PI * 2); g.fill();
        g.save(); g.beginPath(); g.arc(BALLX, by, r - 0.3, 0, Math.PI * 2); g.clip(); g.strokeStyle = "rgba(255,220,255,.45)"; g.lineWidth = 0.5;
        g.beginPath(); for (let i = 0; i <= 20; i++) { const a = tt * 1.3 + i * 0.4, rr2 = i * 0.18; g.lineTo(BALLX + Math.cos(a) * rr2, by + Math.sin(a) * rr2 * 0.8); } g.stroke(); g.restore();
        g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(BALLX - 1.6, by - 2, 1.1, 0.6, -0.6, 0, Math.PI * 2); g.fill(); }
      // 촛불
      { const fl = Math.sin(tt * 17) * 0.5 + Math.sin(tt * 7.3) * 0.5, fx = CANX + fl * 0.25, fy = TY - 11.2;
        glow(g, CANX, fy, 14, "255,170,80", closing ? 0.12 : 0.32 + 0.06 * fl);
        g.fillStyle = "#ff9a3a"; g.beginPath(); g.moveTo(CANX - 1, fy + 0.6); g.quadraticCurveTo(CANX - 1.1, fy - 1.4, fx, fy - 3.4 - fl * 0.3); g.quadraticCurveTo(CANX + 1.1, fy - 1.4, CANX + 1, fy + 0.6); g.closePath(); g.fill();
        g.fillStyle = "#fff3c8"; g.beginPath(); g.ellipse(CANX, fy - 0.4, 0.45, 1.1, 0, 0, Math.PI * 2); g.fill(); }
      if (cu) {
        // 커피잔(홀짝이면 입까지 들려 올라감)
        let cupX = ox - cx + CUPX, cupY = CUPY, lift = 0;
        if (ev.sip) { const e = ease(evP(ev.sip)); lift = e; cupX = cupX + (cx + 5 - CUPX) * e; cupY = CUPY + (SIPY - CUPY) * e; }
        if (lift > 0.02) { g.fillStyle = "#e9e6f2"; g.beginPath(); g.ellipse(ox - cx + CUPX, CUPY + 4.2, 5, 1.2, 0, 0, Math.PI * 2); g.fill(); }
        drawCup(g, cupX, cupY, lift > 0.02);
        if (ev.legs) { g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(cupX - 2 + Math.sin(tt * 40) * 0.5, cupY - 1.2, 1.2, 0.35); }
        if (!closing && !lift) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.4; for (let i = 0; i < 2; i++) { const s = (tt * 0.8 + i * 0.5) % 1; g.globalAlpha = Math.sin(Math.PI * s) * 0.8; g.beginPath(); g.moveTo(cupX - 0.6 + i * 1.2, cupY - 1.6 - s * 5); g.bezierCurveTo(cupX + 0.6 + i, cupY - 3 - s * 5, cupX - 1.2 + i, cupY - 4.4 - s * 5, cupX + i * 0.8, cupY - 6 - s * 5); g.stroke(); } g.globalAlpha = 1; }
        // 폰(엎어 둠 → 알림이면 화면이 켜지고 알림 카드가 뜬다)
        { const [px, py] = BOX.phone, x = ox - cx + px;
          g.save(); g.translate(x, py + 1); g.transform(1, 0, -0.35, 1, 0, 0);
          g.fillStyle = "rgba(0,0,0,.4)"; rr(g, -4.2, -1.4, 9, 4, 0.9); g.fill();
          g.fillStyle = "#1d1f2b"; rr(g, -4.5, -2, 9, 4, 0.9); g.fill(); g.strokeStyle = "#5a5f78"; g.lineWidth = 0.25; g.stroke();
          if (ev.phone) { const gr = g.createLinearGradient(0, -2, 0, 2); gr.addColorStop(0, "#bfe4ff"); gr.addColorStop(1, "#3f8fe8"); g.fillStyle = gr; rr(g, -3.9, -1.5, 7.8, 3, 0.5); g.fill(); }
          g.restore();
          if (ev.phone) {
            const p = clamp(evP(ev.phone) * 3, 0, 1), on = 0.6 + 0.4 * Math.sin(tt * 14);
            glow(g, x, py, 10, "120,190,255", 0.45 * on);
            g.globalAlpha = p; g.fillStyle = "rgba(255,255,255,.95)"; rr(g, x - 5.5, py - 8 - p * 2, 11, 4.4, 1.2); g.fill();
            g.fillStyle = "#3f8fe8"; rr(g, x - 4.8, py - 7.3 - p * 2, 3, 3, 0.7); g.fill(); g.fillStyle = "#3a3a4a"; g.fillRect(x - 1.2, py - 7 - p * 2, 5, 0.7); g.fillStyle = "#9aa"; g.fillRect(x - 1.2, py - 5.6 - p * 2, 4, 0.6);
            g.fillStyle = "#ff4f5e"; g.beginPath(); g.arc(x + 5.2, py - 8.2 - p * 2, 1.3, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
          }
        }
        // 반지(탁자 위에서 빙글빙글 만지작)
        if (ev.ring) {
          const [rx, ry0] = BOX.ring, x = ox - cx + rx, sp = Math.cos(tt * 7), w = 3.4 * Math.abs(sp) + 0.8, ry = ry0 - 1;
          glow(g, x, ry, 8, "255,214,102", 0.5 + 0.2 * Math.sin(tt * 9));
          const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, "#9a6416"); gr.addColorStop(0.5, "#fff3c0"); gr.addColorStop(1, "#c9952a");
          g.strokeStyle = gr; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, ry + 1.4, w, 3.1, 0, 0, Math.PI * 2); g.stroke();
          g.fillStyle = "#e6f6ff"; g.beginPath(); g.moveTo(x - 1.7, ry - 2.4); g.lineTo(x + 1.7, ry - 2.4); g.lineTo(x, ry - 0.2); g.closePath(); g.fill(); g.strokeStyle = "#5fb8ff"; g.lineWidth = 0.2; g.stroke();
          star4(g, x + 2.4, ry - 3, 1.4 + Math.abs(Math.sin(tt * 8)) * 1.2, "#ffffff");
        }
        // 통지서(봉투에서 반쯤 꺼낸 종이)
        if (ev.letter) {
          const [lx, ly] = BOX.letter, x = ox - cx + lx, p = clamp(evP(ev.letter) / 0.25, 0, 1);
          glow(g, x, ly - 2, 9, "255,230,160", 0.35);
          g.save(); g.translate(x, ly + 3); g.rotate(-0.12); g.scale(1.35, 1.35);
          g.fillStyle = "#fffdf5"; rr(g, -3.6, -4 - p * 6, 7.2, 8, 0.4); g.fill(); g.strokeStyle = "#b9ad90"; g.lineWidth = 0.2; g.stroke();
          g.fillStyle = "#3a3a4a"; g.fillRect(-2.6, -3.2 - p * 6, 4, 0.6); g.fillStyle = "#9aa"; g.fillRect(-2.6, -2 - p * 6, 5, 0.4); g.fillRect(-2.6, -1.2 - p * 6, 4.4, 0.4);
          g.strokeStyle = "#d4374a"; g.lineWidth = 0.35; g.beginPath(); g.arc(1.6, 0.4 - p * 6, 1.2, 0, Math.PI * 2); g.stroke();
          g.fillStyle = "#f2e6c8"; g.fillRect(-4.4, -1, 8.8, 5); g.strokeStyle = "#a8946a"; g.lineWidth = 0.25; g.strokeRect(-4.4, -1, 8.8, 5);
          g.fillStyle = "#e6d6b0"; g.beginPath(); g.moveTo(-4.4, -1); g.lineTo(0, 1.8); g.lineTo(4.4, -1); g.closePath(); g.fill();
          g.restore();
          star4(g, x + 4, ly - 7 - Math.sin(tt * 6), 1.3, "#ffe9a0");
        }
        // 다리 떨기: 천 아래로 빼꼼 나온 구두 끝이 달달
        { const [lx, ly] = BOX.legs, x = ox - cx + lx, b = ev.legs ? Math.abs(Math.sin(tt * 30)) * 1.1 : 0;
          if (ev.legs || phase === "talk" || phase === "pick" || phase === "react") {
            g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(x, ly + 3.2, 4, 0.8, 0, 0, Math.PI * 2); g.fill();
            const gr = g.createLinearGradient(0, ly - 1 - b, 0, ly + 3 - b); gr.addColorStop(0, "#a06a44"); gr.addColorStop(1, "#4a2a18");
            g.fillStyle = gr; g.beginPath(); g.moveTo(x - 3, HEM); g.lineTo(x - 3, ly + 0.8 - b); g.quadraticCurveTo(x + 2, ly - 0.4 - b, x + 4, ly + 1.6 - b); g.quadraticCurveTo(x + 4.4, ly + 3 - b, x + 2.6, ly + 3 - b); g.lineTo(x - 3, ly + 3 - b); g.closePath(); g.fill();
            g.strokeStyle = "rgba(255,220,180,.55)"; g.lineWidth = 0.3; g.stroke(); g.fillStyle = "rgba(255,240,220,.5)"; g.beginPath(); g.ellipse(x + 1.6, ly + 0.8 - b, 1.5, 0.45, -0.2, 0, Math.PI * 2); g.fill();
            if (ev.legs) glow(g, x + 1, ly + 1, 8, "255,220,150", 0.35);
            if (ev.legs) { g.strokeStyle = "rgba(255,230,160,.9)"; g.lineWidth = 0.45; g.lineCap = "round"; const m = Math.sin(tt * 30) > 0 ? 0.6 : 0; for (const [a, c] of [[-1, 0], [0, 1.6], [1, 0.2]]) { g.beginPath(); g.moveTo(x + 5.5 + m, ly - 1 + a * 1.8); g.lineTo(x + 7.5 + m, ly - 1.4 + a * 2.2 + c * 0.1); g.stroke(); } }
          }
        }
        // 감정 표시(놀람 느낌표·땀방울·반짝)
        const hx = ox, hy = CTOP + 2;
        if (cu.mood === "surp") { const j = Math.abs(Math.sin(tt * 12)) * 0.8; g.save(); g.translate(hx + CW * 0.36, hy - j); g.rotate(0.2); g.fillStyle = "#ffd84a"; g.strokeStyle = "#5a3a0a"; g.lineWidth = 0.4; rr(g, -1, -4, 2, 5, 0.9); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 2.6, 1, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); }
        if (cu.mood === "sad" || cu.mood === "anx") { const d = (tt * 3) % 1; g.globalAlpha = 1 - d * 0.6; g.fillStyle = "#9fdcff"; g.beginPath(); const sx = hx + CW * 0.3, sy = hy + 6 + d * 3; g.moveTo(sx, sy - 2); g.quadraticCurveTo(sx + 1.4, sy, sx, sy + 1); g.quadraticCurveTo(sx - 1.4, sy, sx, sy - 2); g.fill(); g.globalAlpha = 1; }
        if (cu.mood === "happy" || cu.flash) for (let i = 0; i < 3; i++) star4(g, hx + (i - 1) * CW * 0.42, hy + 2 + (i % 2) * 6, 1.2 + Math.abs(Math.sin(tt * 6 + i)) * 1, i % 2 ? "#ffe9a0" : "#ffffff");
      }
      // 톡 원·반짝·하트·놓침
      for (const r of rings) { const a = 1 - r.t / 0.45; g.strokeStyle = `rgba(${r.c},${clamp(a, 0, 1).toFixed(2)})`; g.lineWidth = 0.7 * a + 0.2; g.beginPath(); g.arc(r.x, r.y, 2 + r.t * 22, 0, Math.PI * 2); g.stroke(); }
      for (const s of sparks) { const p = s.t / s.life, a = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7; star4(g, s.x, s.y, s.r * (1.2 - p * 0.6), s.c, clamp(a, 0, 1)); }
      for (const h of hearts) { if (h.d > 0) continue; g.globalAlpha = clamp(1.4 - h.t, 0, 1); const gr = g.createLinearGradient(0, h.y, 0, h.y + h.s); gr.addColorStop(0, "#ff9ab8"); gr.addColorStop(1, "#e0305e"); g.fillStyle = gr; heart(g, h.x, h.y, h.s); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(h.x - h.s * 0.25, h.y + h.s * 0.25, h.s * 0.09, 0, Math.PI * 2); g.fill(); }
      for (const f of floats) { g.globalAlpha = clamp(1 - f.t, 0, 1); g.fillStyle = "#c8c0d8"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(f.x - 2.4 + i * 2.4, f.y - f.t * 6, 0.6, 0, Math.PI * 2); g.fill(); } }
      g.globalAlpha = 1;
      if (closing) { g.fillStyle = "rgba(10,4,20,.45)"; g.fillRect(0, 0, LW, LH); }
    };

    // ── 한 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) { last = now; now0 = now; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const tt = (now - now0) / 1000;
      pt += dt;
      if (phase === "idle" && pt > 0.4) { if (opts.retry) startGame(); else newCust(true); }
      // 문
      const wantOpen = cu && ((phase === "in" && cu.x < -10) || (phase === "out" && cu.x < -12)) ? 1 : 0;
      if (wantOpen && doorOpen < 0.1) { bellT = 0.5; tone(2093, 0.12, "triangle", 0.06); tone(2637, 0.18, "triangle", 0.05, 0, 0.08); tone(2093, 0.12, "triangle", 0.04, 0, 0.2); }
      doorOpen += (wantOpen - doorOpen) * Math.min(1, dt * 10); if (bellT > 0) bellT -= dt;
      if (cu) {
        cu.t += dt; if (cu.talk > 0) cu.talk -= dt; if (cu.blink > 0) cu.blink -= dt; else if (rnd() < dt * 0.4) cu.blink = 0.14;
        if (cu.mt > 0) { cu.mt -= dt; if (cu.mt <= 0 && phase === "talk") cu.mood = "neu"; }
        if (phase === "in") { cu.x = Math.min(0, -34 + pt / 0.8 * 34); if (pt >= 0.8) { cu.x = 0; talkEndAt = -1; setPhase("talk"); } }
        else if (phase === "talk") {
          // 말풍선(별일 아닌 척)
          lineT -= dt; if (lineT <= 0 && talkEndAt < 0) { const L = WORRY[cu.w].ln; sayC(L[lineI % L.length], 1.6); lineI++; lineT = rh() ? 2.4 : 1.75; }
          // 사라진 단서
          for (const e of cu.ev) if (!e.hit && !e.gone && pt >= e.t0 + e.dur) {
            e.gone = true;
            if (e.real) { const [bx, by] = boxOf(e.k); floats.push({ x: bx, y: by - 6, t: 0 }); tone(300, 0.12, "sine", 0.04, -80); if (!rh()) { cu.miss++; F.float([bx * K, by * K - 10], "놓침", "bad"); } }
            else if (rh() && tut === 2 && e.k === "sip") { tut = 3; cu.ev.push({ k: "sigh", real: true, t0: pt + 0.6, dur: 99, hit: false, gone: false }); setTask(`<em>리허설</em>좋아요, 가짜는 그냥 보내요.<br>이번엔 <b>깊은 한숨</b>! 표정이 슬퍼지고 나오는 한숨 구름을 <b>톡</b>`, SKIP); }
          }
          if (!rh() && talkEndAt < 0 && cu.ev.every((e) => e.hit || e.gone)) endTalk(0.35);
          if (talkEndAt >= 0 && pt >= talkEndAt) { talkEndAt = -1; for (const e of cu.ev) if (!e.hit && !e.gone && pt >= e.t0) { e.gone = true; if (e.real && !rh()) cu.miss++; } setPhase("pick"); }
        } else if (phase === "pick" && !rh()) { const win = 6 * ez; limBar.style.transform = `scaleX(${clamp(1 - pt / win, 0, 1)})`; if (pt > win && !cu.chosen) choose(null, null); }
        else if (phase === "react") { if (pt > 2.2) { cu.flash = 0; custMood("happy"); setPhase("out"); sayC(cu.ok ? pick(["다음 달에 또 올게요!", "친구한테 소문낼게요 ㅎㅎ", "속이 다 시원해요!"]) : "그래도 들어 주셔서 고마워요", 1.3); if (!cu.ok) cu.mood = "neu"; } }
        else if (phase === "out") {
          if (pt > 0.35) cu.x = -(pt - 0.35) / 0.75 * 40;
          if (pt > 1.2) {
            bubC.classList.remove("on"); bubM.classList.remove("on");
            if (rh()) { cu = null; phase = "wait"; tut = 5; noteReset(); setTask(`<em>리허설</em>완벽해요! 본게임에선 단서가 <b>잠깐만</b> 보였다 사라져요.<br>손님 ${NCU}명, <b class="rd">가짜 몸짓</b>은 꾹 참기!`, `<button class="t2-go" data-go>상담 시작!</button>`); }
            else if (timeUp || served >= NCU) { cu = null; closeShop(); }
            else newCust(false);
          }
        }
        // 손가락 안내: 리허설, 본게임 첫 손님 첫 단서, 카드를 오래 못 고를 때
        if (!closing && cu) {
          const first = rh() || (hintAll && cuN === 1 && found === 0);
          const a = phase === "talk" ? cu.ev.find((e) => e.real && evActive(e) && pt - e.t0 > 0.1) : null;
          if (a && first) { const [bx, by, hw, hh] = boxOf(a.k); handAt([(bx + hw * 0.4) * K, (by + hh * 0.5) * K]); slotEl[a.k].classList.add("hint"); }
          else if (phase === "pick" && (rh() || (hintAll && cuN === 1 && pt > 2.5))) { const b = cardsEl.querySelector(`[data-w="${cu.w}"]`); if (b && (rh() || !b.disabled)) handAt(b); }
          else if (hand.classList.contains("on")) { handAt(null); CL_ORDER.forEach((k) => slotEl[k].classList.remove("hint")); }
        }
      }
      if (!cu) { cuEl.style.opacity = "0"; }
      if (bubCT > 0) { bubCT -= dt; if (bubCT <= 0) bubC.classList.remove("on"); }
      if (bubMT > 0) { bubMT -= dt; if (bubMT <= 0) bubM.classList.remove("on"); }
      if (meT > 0) { meT -= dt; if (meT <= 0) setMe("neutral"); }
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t += dt; s.y -= dt * 6; if (s.t > s.life) sparks.splice(i, 1); }
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.45) rings.splice(i, 1); }
      for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt * 1.5; if (floats[i].t > 1) floats.splice(i, 1); }
      for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.d > 0) { h.d -= dt; continue; } h.t += dt; h.y += h.vy * dt; h.x += Math.sin(h.t * 6 + i) * 0.15; if (h.t > 1.4) hearts.splice(i, 1); }
      render(tt);
      raf = requestAnimationFrame(loop);
    };

    if (dbg) {
      const act = (bad) => {
        if (!cu || closing) return;
        if (phase === "talk") {
          const a = cu.ev.find((e) => evActive(e) && e.real !== !!bad && pt - e.t0 > 0.2);
          if (a) { const [bx, by] = boxOf(a.k); tapAt(bx, by); }
          else if (bad && rnd() < 0.08) tapAt(LW - 6, 30);
        } else if (phase === "pick") {
          const b = cardsEl.querySelector(bad ? `.t2-cd:not([data-w="${cu.w}"])` : `[data-w="${cu.w}"]`); if (b && !b.disabled) b.click();
        }
      };
      dbg.tarot2 = {
        st: () => ({ phase, tut, served, found, realN, correct, falseT, emptyT, got: cu ? cu.got.join(",") : "", w: cu ? cu.w : null, timeUp, closing, done, art, cuArt: cu ? cu.ci.ok : null, ev: cu && phase === "talk" ? cu.ev.filter(evActive).map((e) => e.k).join(",") : "", left: tm ? +tm.left().toFixed(1) : null }),
        tut: () => tut,
        tutDo: () => { if (tut === 5) return startGame(); if (tut === 1 || tut === 3 || tut === 4) act(false); },
        start: startGame,
        auto: (bad) => act(bad),
      };
    }
    scUpd(); render(0);
    raf = requestAnimationFrame(loop);
  },
};
