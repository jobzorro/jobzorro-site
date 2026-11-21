// 타로 3탄: 축제 부스 대기줄 (일러스트판: 논리 폭 112칸 좌표를 기기 해상도 캔버스에 벡터로 그린다)
// 손님은 캐릭터 그림(전신, 표정: 지침=화남, 술=수줍음(빨간 볼), 만족=웃음), 의자에 앉으면 뒷모습(그림에서 머리·옷 색을 뽑아 벡터로).
// 배경은 실제 저녁 거리 그림 + 벡터 천막·커튼·무대. 그림을 못 불러올 때만 도트 사람으로 대체.
// 연말 야시장. 내 타로 부스 앞에 줄이 선다. 손님을 끌어 의자에 앉히고, 고민 무게에 맞춰 1장·3장을 고른다.
// 상담할수록 멘탈이 닳고, 따뜻한 차로 채운다. 커플은 나란히, 술 취한 손님은 왼쪽으로 밀어 돌려보낸다. 눈이 오면 다들 금방 지친다.
// 마지막: 불이 하나씩 꺼진 텅 빈 장터에서 팁 통을 세며 별을 올려다본다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const T = 34;            // 한 판 시간(초)
const MAXQ = 6, QS = 15; // 줄 칸 수, 칸 간격
const TT = 82, FL = 104, STY = 118, SEATY = 84, POPY = 120; // 탁자 윗면, 무대 바닥, 길, 앉은 손님 그림 위, 고르기 창
const LIGHT = ["star", "clover", "gift"], HEAVY = ["broken", "brief", "storm"];
const SCARF = ["#d94f4f", "#f4f4f4", "#3e9e6a", "#e0b040", "#5f8af0", "#c94f8a"];
const HAPPY_LN = ["속이 다 시원해요!", "내년엔 잘 풀리겠죠?", "또 올게요!", "와, 소름 돋았어요", "덕분에 힘이 나요"];
const won = (n) => Math.round(n).toLocaleString("ko-KR");
const mix = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
function mkCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
const SV = (b, vb = 24) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${b}</svg>`;
// ── 고민 아이콘(SVG 24x24) ──
const ICO = {
  star: SV(`<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#f0a820"/></linearGradient></defs><path d="M12 2l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.1l-6 3.3 1.3-6.7-5-4.7 6.8-.8z" fill="url(#a)" stroke="#a86a08" stroke-width="1" stroke-linejoin="round"/><path d="M9.6 8.4L12 4.4l1 3" fill="#fff" opacity=".7"/>`),
  clover: SV(`<g fill="#3fae5a" stroke="#1f7a36" stroke-width=".8"><circle cx="8.4" cy="8.4" r="4.2"/><circle cx="15.6" cy="8.4" r="4.2"/><circle cx="8.4" cy="15.2" r="4.2"/><circle cx="15.6" cy="15.2" r="4.2"/></g><g fill="#8fe89a"><circle cx="7.4" cy="7.2" r="1.4"/><circle cx="14.6" cy="7.2" r="1.4"/></g><path d="M12 12c1 4 3 7 5.4 9.6" stroke="#2a7a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
  gift: SV(`<rect x="3" y="9" width="18" height="12.4" rx="1.6" fill="#e0475a" stroke="#8a1a2a" stroke-width=".8"/><rect x="2" y="7" width="20" height="4.4" rx="1.2" fill="#ff6a7a" stroke="#8a1a2a" stroke-width=".8"/><rect x="10.4" y="7" width="3.2" height="14.4" fill="#ffd84a"/><path d="M12 7c-2-4.4-7-4-5.4-1.2C7.6 7.4 12 7 12 7zM12 7c2-4.4 7-4 5.4-1.2C16.4 7.4 12 7 12 7z" fill="#ffd84a" stroke="#b08a10" stroke-width=".7"/>`),
  broken: SV(`<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ab4"/><stop offset="1" stop-color="#e02a58"/></linearGradient></defs><path d="M11 5.4C9 2.4 2.6 2.8 2.6 8.6c0 5.4 6 9.6 8.6 12l1.4-5.4-2.4-3.4 2.8-3.2z" fill="url(#h)"/><path d="M13 5.4c2-3 8.4-2.6 8.4 3.2 0 5.4-6 9.6-8.6 12l1-4.8-2-3.4 2.4-3.4z" fill="url(#h)" transform="translate(1.4 .8) rotate(5 17 12)"/><path d="M6 6.4c-1.2.4-1.8 1.6-1.6 2.8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`),
  brief: SV(`<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d89a5a"/><stop offset="1" stop-color="#8a5a2a"/></linearGradient></defs><path d="M8.6 7V5.4A1.6 1.6 0 0 1 10.2 3.8h3.6a1.6 1.6 0 0 1 1.6 1.6V7" stroke="#5a3a1a" stroke-width="1.6" fill="none"/><rect x="2.4" y="7" width="19.2" height="13.6" rx="2.2" fill="url(#b)" stroke="#5a3a1a" stroke-width=".8"/><path d="M2.4 12.4h19.2" stroke="#5a3a1a" stroke-width=".8"/><rect x="10.4" y="10.8" width="3.2" height="3.2" rx=".6" fill="#ffd84a" stroke="#8a6010" stroke-width=".6"/>`),
  storm: SV(`<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4e8f6"/><stop offset="1" stop-color="#8890b0"/></linearGradient></defs><path d="M6.4 14.6a4.4 4.4 0 0 1 .4-8.8 6 6 0 0 1 11.4 1.4 3.8 3.8 0 0 1-.2 7.4z" fill="url(#c)" stroke="#6a7290" stroke-width=".8"/><path d="M8 17l-1.2 3M12 17l-1.2 3.4M16 17l-1.2 3" stroke="#5fb8ff" stroke-width="1.6" stroke-linecap="round"/><path d="M13 9.6l-2.4 3.4h2.4l-1.6 3" stroke="#ffd84a" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`),
  heart: SV(`<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa0c4"/><stop offset="1" stop-color="#ff3f84"/></linearGradient></defs><path d="M12 21C8 17.6 2.6 14 2.6 8.6 2.6 5 6.6 3 9.4 4.8c1.2.8 2.2 2 2.6 2.8.4-.8 1.4-2 2.6-2.8C17.4 3 21.4 5 21.4 8.6 21.4 14 16 17.6 12 21z" fill="url(#h)"/><path d="M6.4 6.6c-1.2.6-1.6 1.8-1.4 3" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>`),
  ring: SV(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c0"/><stop offset=".5" stop-color="#f2c255"/><stop offset="1" stop-color="#9a6416"/></linearGradient></defs><ellipse cx="12" cy="15" rx="7.6" ry="6.6" fill="none" stroke="url(#g)" stroke-width="2.8"/><path d="M7.4 6.4L9.4 3.4h5.2l2 3L12 11.4z" fill="#dff6ff" stroke="#2f7fb8" stroke-width=".8" stroke-linejoin="round"/><path d="M7.4 6.4h9.2M9.4 3.4L12 11.4l2.6-8" stroke="#2f7fb8" stroke-width=".5" fill="none"/>`),
  bottle: SV(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a7a4a"/><stop offset=".4" stop-color="#6ad08a"/><stop offset="1" stop-color="#1f5a36"/></linearGradient></defs><rect x="9.6" y="2" width="4.8" height="2" rx=".6" fill="#3a3a3a"/><path d="M10 4h4v4.4c2.4 1.2 3.6 2.8 3.6 5V20a2 2 0 0 1-2 2H8.4a2 2 0 0 1-2-2v-6.6c0-2.2 1.2-3.8 3.6-5z" fill="url(#g)"/><rect x="7.4" y="13" width="9.2" height="5" rx=".8" fill="#f4f4d0"/><path d="M9 15.4h6" stroke="#c94f4f" stroke-width="1"/>`),
};
const SOUL_SVG = SV(`<defs><radialGradient id="s" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f0e4ff"/><stop offset=".5" stop-color="#c8a8ff"/><stop offset="1" stop-color="#7a4ad8"/></radialGradient></defs><path d="M12 21.4C8 18 2.6 14.4 2.6 9 2.6 5.4 6.6 3.4 9.4 5.2c1.2.8 2.2 2 2.6 2.8.4-.8 1.4-2 2.6-2.8C17.4 3.4 21.4 5.4 21.4 9c0 5.4-5.4 9-9.4 12.4z" fill="url(#s)" stroke="#3a1a68" stroke-width="1"/><circle cx="8.4" cy="9.6" r="1.4" fill="#fff" opacity=".85"/>`);
const CUP_SVG = SV(`<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e6d8c8"/></linearGradient></defs><path d="M9 6c-1.6-1.8 1.6-2.8 0-4.6M13 6c-1.6-1.8 1.6-2.8 0-4.6" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".9"/><ellipse cx="11" cy="21" rx="9.4" ry="1.8" fill="#e8dccc" stroke="#8a6a4a" stroke-width=".6"/><path d="M3.4 9h15.2v5.6a6 6 0 0 1-6 6h-3.2a6 6 0 0 1-6-6z" fill="url(#c)" stroke="#8a5a2a" stroke-width=".9"/><ellipse cx="11" cy="9" rx="7.6" ry="1.6" fill="#c9783a"/><path d="M18.6 11h1.2a2.4 2.4 0 0 1 0 4.8h-1.8" fill="none" stroke="#8a5a2a" stroke-width="1.2"/><path d="M5.4 12v2.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`);
const CARD1 = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-4.4" y="-6.6" width="8.8" height="13.2" rx="1.4" fill="#2e1860" stroke="#e8c060" stroke-width="1.1"/><rect x="-3" y="-5.2" width="6" height="10.4" rx=".6" fill="none" stroke="#e8c06088" stroke-width=".5"/><path d="M0-2.6l.8 2 2 .6-2 .6-.8 2-.8-2-2-.6 2-.6z" fill="#ffd84a"/></g>`;
const CARDS_SVG = (n) => n === 1 ? SV(CARD1(12, 12), 24) : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 24">${CARD1(8, 13, -14)}${CARD1(22, 13, 14)}${CARD1(15, 11.5, 0)}</svg>`;
const HAND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;
// 손님(그림을 못 불러오면 도트): 겉모습 + 겨울 소품
const POOL = [...Array(97)].map((_, i) => "c" + String(i + 1).padStart(3, "0")).filter((k) => !["c013", "c014", "c018", "c029", "c066", "c081", "c082", "c086", "c095"].includes(k));
function mkP(type, extra = {}) {
  const s = uSpec(type); s.kid = false; if (rnd() < 0.6) s.pack = null;
  return Object.assign({ spec: s, cache: {}, scarf: rnd() < 0.65 ? pick(SCARF) : null, party: null, drunk: false, key: pick(POOL) }, extra);
}
// 도트 사람(대체용). view: s 옆 / b 뒤 / f 앞, cut: 위에서 몇 줄만
function drawP(g, p, view, f, flip, cx, feet, cut) {
  const o = { v: view, f };
  const spr = uSprite(p, view + f, o, flip), x0 = Math.round(cx - 8), y0 = Math.round(feet - 30);
  const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  if (cut) g.drawImage(spr, 0, 0, 16, cut, x0, y0, 16, cut); else g.drawImage(spr, x0, y0);
  g.imageSmoothingEnabled = sm;
}
// 방법 화면 그림 3장
function stepPics() {
  const a = `<span class="tq-sp1"><span></span><img src="${svgU(HAND)}" alt=""></span>`;
  const bub = (x, heavy, ico, n) => `<g transform="translate(${x} 6)"><rect width="30" height="26" rx="7" fill="${heavy ? "#3a2258" : "#fffdf4"}" stroke="${heavy ? "#b48cff" : "#2a1e2e"}" stroke-width="1.4"/><path d="M11 25.4l4 5 4-5" fill="${heavy ? "#3a2258" : "#fffdf4"}" stroke="${heavy ? "#b48cff" : "#2a1e2e"}" stroke-width="1.4" stroke-linejoin="round"/><rect x="10" y="24" width="10" height="2.4" fill="${heavy ? "#3a2258" : "#fffdf4"}"/><image href="${svgU(ICO[ico])}" x="5" y="3" width="20" height="20"/>
    <g transform="translate(${n === 1 ? 15 : 15} 52) scale(1.6)">${n === 1 ? CARD1(0, 0) : CARD1(-5, 1, -14) + CARD1(5, 1, 14) + CARD1(0, 0, 0)}</g></g>`;
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#4a2a7a"/><stop offset="1" stop-color="#160a2a"/></radialGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>${bub(4, false, "star", 1)}${bub(46, true, "brief", 3)}<path d="M40 8v64" stroke="#ffffff22"/></svg>`);
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#5a3a7a"/><stop offset="1" stop-color="#1a0c2a"/></radialGradient><linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5fe0"/><stop offset="1" stop-color="#d8b8ff"/></linearGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
    <g transform="translate(14 4) scale(2.1)">${CUP_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g><rect x="8" y="63" width="64" height="8" rx="4" fill="#0008"/><rect x="9" y="64" width="44" height="6" rx="3" fill="url(#m)"/><path d="M60 58l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#ffe9a0"/></svg>`);
  return [[a, "끌어서 앉히기"], [`<img src="${b}" alt="">`, "밝음 1장 · 어둠 3장"], [`<img src="${c}" alt="">`, "멘탈은 차 한 잔"]];
}

export const GAME = {
  key: "tarot3", base: "tarot", jc: "#b48cff", n: "축제 부스 대기줄", desc: "연말 야시장, 줄은 길고 멘탈은 한정판이에요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 연말 야시장, 줄 선 손님을 <b>끌어서 빈 의자</b>에 앉혀요.",
    "<b>밝은 말풍선</b>은 가벼운 고민 → <b>빠른 1장</b>, <b>어두운 말풍선</b>은 무거운 고민 → <b>3장 스프레드</b>. 손 잡은 커플은 <b>나란히 두 자리</b>에!",
    "상담할수록 <b>멘탈</b>이 닳아요. 바닥나기 전에 <b>따뜻한 차</b> 한 잔. 술 취한 손님은 <b>왼쪽으로 쭉 밀어</b> 정중히 돌려보내요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "끌어서 앉히기"], ["", "밝음 1장 · 어둠 3장"], ["", "멘탈은 차 한 잔"]]; } },
  css: `.mg-tarot3 .mg-steps i{width:76px;height:76px;display:flex;align-items:center;justify-content:center}
.mg-tarot3 .mg-steps img{width:76px;height:76px;border-radius:12px;box-shadow:0 3px 10px #0006}
.mg-tarot3 .tq-sp1{position:relative;display:block;width:76px;height:76px;border-radius:12px;overflow:hidden;background:url("img/bg/studyst.webp") 50% 60%/cover;box-shadow:0 3px 10px #0006}
.mg-tarot3 .tq-sp1>span{position:absolute;left:18px;top:6px;width:32px;height:72px;background:url("img/body/c005.webp") 0 0/300% 200% no-repeat;filter:drop-shadow(0 2px 3px #0008)}
.mg-tarot3 .tq-sp1 img{position:absolute;right:2px;top:26px;width:34px!important;height:34px!important;box-shadow:none!important;filter:drop-shadow(0 2px 2px #0009)}
.mg-tarot3 .tq-st{background:#0d0820!important}
.mg-tarot3 .tq-cv{position:absolute;left:0;top:0;touch-action:none}
.mg-tarot3 .tq-bk{z-index:1}
.mg-tarot3 .tq-fr{z-index:3;cursor:grab}
.mg-tarot3 .tq-me{position:absolute;z-index:2;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter .5s;pointer-events:none;filter:drop-shadow(0 0 6px #b48cff55)}
.mg-tarot3 .tq-me.on{opacity:1}
.mg-tarot3 .tq-me.tired{filter:saturate(.45) brightness(.78)}
.mg-tarot3 .tq-pops{position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;pointer-events:none}
.mg-tarot3 .tq-pop{position:absolute;transform:translateX(-50%);display:flex;gap:3px;pointer-events:auto;animation:tqpop .3s cubic-bezier(.3,1.6,.5,1) both}
.mg-tarot3 .tq-pop button{width:42px;height:48px;padding:0!important;margin:0;border-radius:11px!important;background:linear-gradient(#fffefa,#f2ead8)!important;border:1.5px solid #d8b25a!important;color:#2a1e2e!important;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1;box-shadow:0 4px 10px #000a!important}
.mg-tarot3 .tq-pop button[data-k="3"]{background:linear-gradient(#4a2c72,#2a1648)!important;color:#fff!important;border-color:#b48cff!important}
.mg-tarot3 .tq-pop button img{height:17px}
.mg-tarot3 .tq-pop button b{font-size:12.5px;font-weight:900}
.mg-tarot3 .tq-pop button small{font-size:11px;font-weight:800;opacity:.75}
.mg-tarot3 .tq-pop button:active{transform:scale(.94)}
.mg-tarot3 .tq-pop.no button{animation:tqno .35s}
.mg-tarot3 .tq-pop.out{transition:opacity .2s,transform .2s;opacity:0;transform:translateX(-50%) scale(.6)}
.mg-tarot3 .tq-say{position:absolute;z-index:7;transform:translate(-50%,-100%);background:#fffdf8;color:#2a1e2e;font-size:11px;font-weight:800;padding:3px 8px;border-radius:10px;white-space:nowrap;box-shadow:0 3px 8px #0009;pointer-events:none;animation:tqsay 1.6s ease-out forwards}
.mg-tarot3 .tq-say.bad{background:#ffe0e4;color:#a0283c}
.mg-tarot3 .tq-say.dr{background:#e4f4d8;color:#2a5a2a}
.mg-tarot3 .tq-say.gold{background:#ffe9a0;color:#5a3a00}
.mg-tarot3 .tq-hud{position:absolute;left:6px;right:6px;bottom:6px;z-index:6;background:#1b0f33ee;border:1px solid #b48cff66;border-radius:14px;padding:5px 8px 6px;display:flex;flex-direction:column;gap:4px;box-shadow:0 -4px 14px #0008}
.mg-tarot3 .tq-task{font-size:12.5px;font-weight:700;color:#f2eaff;text-align:center;line-height:1.38;min-height:34px;display:flex;align-items:center;justify-content:center;word-break:keep-all}
.mg-tarot3 .tq-task em{font-style:normal;display:inline-block;background:#ff7eb6;color:#fff;font-size:11px;font-weight:900;padding:0 7px;border-radius:6px;margin-right:4px;vertical-align:1px}
.mg-tarot3 .tq-task b{color:#ffd166}.mg-tarot3 .tq-task b.lt{color:#fff3c0}.mg-tarot3 .tq-task b.dk{color:#c8a8ff}.mg-tarot3 .tq-task b.rd{color:#ff8a9a}
.mg-tarot3 .tq-row{display:flex;gap:8px;align-items:center}
.mg-tarot3 .tq-men{flex:1;display:flex;align-items:center;gap:5px;min-width:0}
.mg-tarot3 .tq-men img{width:20px;height:20px;flex:0 0 auto;filter:drop-shadow(0 0 4px #b48cff88)}
.mg-tarot3 .tq-men span{font-size:11px;font-weight:800;color:#d8c8f0;flex:0 0 auto}
.mg-tarot3 .tq-men i{position:relative;flex:1;height:11px;border-radius:6px;background:#0009;border:1px solid #ffffff33;overflow:hidden}
.mg-tarot3 .tq-men em{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(90deg,#8a5fe0,#d8b8ff);transition:width .15s}
.mg-tarot3 .tq-men em::after{content:"";position:absolute;left:0;right:0;top:1px;height:2px;background:#ffffff55}
.mg-tarot3 .tq-men.low em{background:linear-gradient(90deg,#ff3f5f,#ff9a7a)}
.mg-tarot3 .tq-men.low i{animation:tqblink .45s infinite alternate}
.mg-tarot3 .tq-men b{font-size:12px;color:#fff;width:24px;text-align:right;flex:0 0 auto}
.mg-tarot3 .tq-men.pang img{animation:tqpang .4s}
.mg-tarot3 .tq-tea{position:relative;display:flex!important;align-items:center;gap:3px;background:linear-gradient(#ffd89a,#e0904a)!important;color:#3a1a08!important;border-radius:11px!important;padding:3px 10px 3px 6px!important;font-weight:900;font-size:12.5px;box-shadow:0 3px 0 #8a4a1a!important;overflow:hidden;flex:0 0 auto;border:0!important}
.mg-tarot3 .tq-tea img{width:28px;height:28px}
.mg-tarot3 .tq-tea::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;background:conic-gradient(#1a0a20bb calc(var(--cd,0) * 360deg),transparent 0);pointer-events:none}
.mg-tarot3 .tq-tea.rdy{animation:tqpulse .45s infinite alternate}
.mg-tarot3 .tq-tea:active{transform:scale(.95)}
.mg-tarot3 .tq-out{position:absolute;left:0;z-index:4;width:40px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;font-weight:900;color:#ffd0d8;line-height:1.25;background:linear-gradient(90deg,#c0283cbb,#c0283c00);opacity:0;transition:opacity .15s;pointer-events:none;word-break:keep-all}
.mg-tarot3 .tq-out.on{opacity:.75}.mg-tarot3 .tq-out.hot{opacity:1;color:#fff}
.mg-tarot3 .tq-tb{position:absolute;z-index:9}
.mg-tarot3 .tq-tb.sk{right:4px;top:4px}
.mg-tarot3 .tq-tb.go{left:50%;transform:translateX(-50%)}
.mg-tarot3 .tq-skip{background:#0006!important;border:0!important;color:#c8b8e8!important;font-size:11.5px;text-decoration:underline;padding:2px 8px!important;border-radius:8px!important}
.mg-tarot3 .tq-go{background:linear-gradient(#c9a0ff,#8a5fe0)!important;color:#fff!important;border-radius:12px!important;padding:10px 30px!important;font-weight:900;font-size:15px;box-shadow:0 3px 0 #4a2a90,0 0 18px #b48cff88!important;animation:tqpulse .5s infinite alternate;border:0!important}
.mg-tarot3 .tq-hand{position:absolute;z-index:10;width:40px;height:40px;margin:-6px 0 0 -14px;background-size:100% 100%;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px #0009)}
.mg-tarot3 .tq-hand.on{display:block}
.mg-tarot3 .tq-hand.tap{animation:tqtap .8s infinite}
.mg-tarot3 .tq-hand.drag{animation:tqdrag 1.5s ease-in-out infinite}
.mg-tarot3 .tq-end{position:absolute;left:8px;right:8px;bottom:8px;top:50%;z-index:12;background:linear-gradient(#1b0f33f2,#0d0618f8);border:1px solid #b48cff66;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;animation:tqrise .6s cubic-bezier(.3,1.4,.5,1) both;padding:10px;box-shadow:0 -6px 24px #000a}
.mg-tarot3 .tq-end h4{margin:0;font-size:19px;font-weight:900;color:#f3eaff;text-shadow:0 2px 0 #000;text-align:center}
.mg-tarot3 .tq-end h4 small{display:block;font-size:11.5px;color:#c8b0ff;font-weight:700;margin-top:2px}
.mg-tarot3 .tq-end canvas{width:54px;height:63px;filter:drop-shadow(0 0 10px #ffd16655)}
.mg-tarot3 .tq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;width:min(300px,96%)}
.mg-tarot3 .tq-stats div{background:#ffffff12;border-radius:10px;padding:6px 3px;text-align:center;opacity:0;animation:tqst .4s cubic-bezier(.3,1.6,.5,1) forwards}
.mg-tarot3 .tq-stats div:nth-child(2){animation-delay:.25s}.mg-tarot3 .tq-stats div:nth-child(3){animation-delay:.5s}
.mg-tarot3 .tq-stats span{font-size:11px;color:#d8c8ee;display:block}
.mg-tarot3 .tq-stats b{display:block;font-size:17px;font-weight:900;color:#ffd166;margin-top:2px}
.mg-tarot3 .tq-stats div:nth-child(3) b{color:#d8b8ff}
.mg-tarot3 .tq-bye{font-size:12.5px;color:#fff;font-weight:700;opacity:.92;text-align:center;word-break:keep-all}
@keyframes tqtap{0%,100%{transform:translate(6px,-12px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes tqdrag{0%,12%{transform:translate(0,0) scale(.9);opacity:1}70%,85%{transform:translate(var(--dx),var(--dy)) scale(.9);opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:0}}
@keyframes tqpulse{to{transform:scale(1.07)}}
@keyframes tqpop{from{opacity:0;transform:translateX(-50%) translateY(8px) scale(.6)}}
@keyframes tqno{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
@keyframes tqsay{0%{opacity:0;margin-top:6px}12%{opacity:1;margin-top:0}75%{opacity:1}100%{opacity:0;margin-top:-10px}}
@keyframes tqblink{to{border-color:#ff5a6a;box-shadow:0 0 8px #ff5a6a}}
@keyframes tqpang{50%{transform:scale(1.5)}}
@keyframes tqrise{from{opacity:0;transform:translateY(30px)}}
@keyframes tqst{from{opacity:0;transform:translateY(12px) scale(.8)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.mg-tarot3 .tq-go,.mg-tarot3 .tq-tea.rdy{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "tarot3", "축제 부스 대기줄", "tq-st");
    const st = F.stage;
    st.insertAdjacentHTML("beforeend", `<canvas class="tq-cv tq-bk"></canvas><div class="tq-me"></div><canvas class="tq-cv tq-fr"></canvas>
      <div class="tq-pops"></div><div class="tq-out">←<br>돌려<br>보내기</div>
      <div class="tq-hud"><div class="tq-task"></div><div class="tq-row"><div class="tq-men"><img alt=""><span>멘탈</span><i><em></em></i><b>100</b></div><button class="tq-tea"><img alt=""><span>차 한 잔</span></button></div></div>
      <div class="tq-tb"></div><div class="tq-hand"></div>`);
    const $ = (s) => st.querySelector(s);
    const cvB = $(".tq-bk"), gB = cvB.getContext("2d"), cvF = $(".tq-fr"), gF = cvF.getContext("2d");
    const meEl = $(".tq-me"), popsEl = $(".tq-pops"), outEl = $(".tq-out"), hud = $(".tq-hud"), taskEl = $(".tq-task"), menEl = $(".tq-men"), menBar = $(".tq-men em"), menNum = $(".tq-men b"), teaBtn = $(".tq-tea"), tbEl = $(".tq-tb"), hand = $(".tq-hand");
    // 크기: 논리 폭 112칸 안팎을 정수배로
    const sw = st.clientWidth || 336, sh = st.clientHeight || 600;
    const K = Math.max(2, Math.round(sw / 112)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), KS = K * DPR;
    for (const c of [cvB, cvF]) { c.width = Math.round(LW * KS); c.height = Math.round(LH * KS); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; }
    for (const g of [gB, gF]) { g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; }
    const hudH = hud.offsetHeight || 70, qF = Math.max(150, LH - Math.ceil(hudH / K) - 3);
    const cx = LW >> 1, SX = [Math.round(LW * 0.23), cx, Math.round(LW * 0.77)], QX0 = LW - 12, JARX = 5, TEAX = LW - 19;
    const slotX = (i) => QX0 - i * QS;
    outEl.style.top = (qF - 46) * K + "px"; outEl.style.height = 48 * K + "px";
    hand.style.backgroundImage = `url("${svgU(HAND)}")`;
    $(".tq-men img").src = svgU(SOUL_SVG);
    teaBtn.querySelector("img").src = svgU(CUP_SVG);
    const C1 = svgU(CARDS_SVG(1)), C3 = svgU(CARDS_SVG(3));
    const ICI = {}; for (const k in ICO) { ICI[k] = new Image(); ICI[k].src = svgU(ICO[k]); }
    const MFR = ["#d94f4f", "#4f7bd9", "#3e9e6a", "#e0a030", "#8a5fc0", "#ff7eb6"];
    // ── 사람 그림: 표정별로 아래를 흐리게 다듬은 사본을 만들어 둔다(전신 칸 240x540) ──
    const EXI0 = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    const PH = 34, PW = PH * 240 / 540;
    const PIM = {};
    const pim = (key) => {
      if (PIM[key]) return PIM[key];
      const r = { ok: false, fail: false, im: new Image(), fx: {}, hair: null, coat: null, long: false };
      r.im.onload = () => {
        r.ok = true;
        try { // 뒷모습용 색 뽑기: 머리 꼭대기·어깨 옆·몸통
          const c = mkCanvas(240, 540), q = c.getContext("2d"); q.drawImage(r.im, 0, 0, 240, 540, 0, 0, 240, 540);
          const px = (x, y) => q.getImageData(x, y, 1, 1).data;
          let y0 = 0; while (y0 < 120 && px(120, y0)[3] < 200) y0++;
          const h = px(120, y0 + 10), sh = px(70, 250), co = px(62, 380);
          r.hair = `rgb(${h[0]},${h[1]},${h[2]})`; r.coat = `rgb(${co[0]},${co[1]},${co[2]})`;
          r.long = sh[3] > 200 && Math.abs(sh[0] - h[0]) + Math.abs(sh[1] - h[1]) + Math.abs(sh[2] - h[2]) < 70;
        } catch (e) {}
      };
      r.im.onerror = () => (r.fail = true); r.im.src = "img/body/" + key + ".webp";
      return (PIM[key] = r);
    };
    const faded = (r, ex) => {
      if (r.fx[ex]) return r.fx[ex];
      const i = EXI0[ex] || 0, c = mkCanvas(160, 360), q = c.getContext("2d");
      q.drawImage(r.im, (i % 3) * 240, i >= 3 ? 540 : 0, 240, 540, 0, 0, 160, 360);
      q.globalCompositeOperation = "destination-out"; const gr = q.createLinearGradient(0, 270, 0, 360); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)"); q.fillStyle = gr; q.fillRect(0, 270, 160, 90);
      return (r.fx[ex] = c);
    };
    POOL.forEach((k, i) => { if (i % 3 === 0) pim(k); });
    // 내 캐릭터 그림(3x2 표정 시트)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    {
      const h = (TT + 6 - 36) * K, w = Math.round(h * 240 / 312);
      Object.assign(meEl.style, { width: w + "px", height: h + "px", left: Math.round(cx * K - w / 2) + "px", top: 36 * K + "px" });
      const im = new Image();
      im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); setMe("neutral"); };
      im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; };
      im.src = "img/body/" + AV + ".webp";
    }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meT = 0;
    const setMe = (ex, dur = 0) => { meT = dur; if (ex === meX) return; meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };

    // ── 배경(밤 장터): 저녁 거리 그림 + 벡터 천막·커튼·무대 ──
    const BG = mkCanvas(Math.round(LW * KS), Math.round(LH * KS)), stars = [], groundSnow = [];
    const bgImg = new Image(); let bgOk = false;
    const glowAt = (b, x, y, r, rgb, a) => { const q = b.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${rgb},${a})`); q.addColorStop(1, `rgba(${rgb},0)`); b.fillStyle = q; b.fillRect(x - r, y - r, r * 2, r * 2); };
    const star4 = (b, x, y, r, c, a = 1) => { b.globalAlpha = a; b.fillStyle = c; b.beginPath(); b.moveTo(x, y - r); b.quadraticCurveTo(x, y, x + r, y); b.quadraticCurveTo(x, y, x, y + r); b.quadraticCurveTo(x, y, x - r, y); b.quadraticCurveTo(x, y, x, y - r); b.fill(); b.globalAlpha = 1; };
    const rr = (b, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); b.beginPath(); b.moveTo(x + r, y); b.arcTo(x + w, y, x + w, y + h, r); b.arcTo(x + w, y + h, x, y + h, r); b.arcTo(x, y + h, x, y, r); b.arcTo(x, y, x + w, y, r); b.closePath(); };
    for (let i = 0; i < 30; i++) stars.push({ x: rnd() * LW, y: rnd() * 22, ph: rnd() * 6, b: rnd() < 0.25 });
    for (let i = 0; i < 90; i++) groundSnow.push([rnd() * LW, STY + 2 + rnd() * (LH - STY - 4), 0.6 + rnd() * 1.4]);
    const curtainSeed = [...Array(26)].map(() => [5 + rnd() * (LW - 10), 40 + rnd() * (TT - 44), rnd()]);
    const paintBG = () => {
      const b = BG.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0); b.clearRect(0, 0, LW, LH);
      let gr = b.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, "#0c0820"); gr.addColorStop(0.5, "#2a1846"); gr.addColorStop(1, "#1a1424"); b.fillStyle = gr; b.fillRect(0, 0, LW, LH);
      if (bgOk) {
        const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight, ar = LW / LH, cw = ih * ar, sx = (iw - cw) / 2;
        b.save(); try { b.filter = "blur(0.8px) brightness(0.62) saturate(1.15)"; } catch (e) {}
        b.drawImage(bgImg, sx, 0, cw, ih, -1, -1, LW + 2, LH + 2); b.restore();
        gr = b.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, "rgba(40,16,90,.45)"); gr.addColorStop(0.3, "rgba(40,16,90,.15)"); gr.addColorStop(0.7, "rgba(20,10,40,.1)"); gr.addColorStop(1, "rgba(10,6,24,.55)"); b.fillStyle = gr; b.fillRect(0, 0, LW, LH);
      }
      // 기둥(나무)
      for (const x of [1, LW - 4]) { gr = b.createLinearGradient(x, 0, x + 3, 0); gr.addColorStop(0, "#3a2414"); gr.addColorStop(0.45, "#8a5a36"); gr.addColorStop(1, "#3a2414"); b.fillStyle = gr; b.fillRect(x, 26, 3, FL - 26); }
      // 뒤 커튼: 주름 + 금빛 별
      gr = b.createLinearGradient(0, 37, 0, TT); gr.addColorStop(0, "#2a1248"); gr.addColorStop(1, "#3e1e66"); b.fillStyle = gr; b.fillRect(4, 37, LW - 8, TT - 37);
      for (let x = 4; x < LW - 4; x += 7) { gr = b.createLinearGradient(x, 0, x + 7, 0); gr.addColorStop(0, "rgba(0,0,0,.32)"); gr.addColorStop(0.45, "rgba(150,100,230,.18)"); gr.addColorStop(0.7, "rgba(255,255,255,.05)"); gr.addColorStop(1, "rgba(0,0,0,.25)"); b.fillStyle = gr; b.fillRect(x, 37, 7, TT - 37); }
      glowAt(b, cx, 56, 34, "255,190,110", 0.16);
      for (const [x, y, k] of curtainSeed) star4(b, x, y, k < 0.3 ? 1.3 : 0.6, "#e8c060", 0.75);
      // 옆 휘장(묶은 커튼)
      for (const dir of [1, -1]) {
        const x0 = dir > 0 ? 4 : LW - 4; b.beginPath(); b.moveTo(x0, 37); b.lineTo(x0 + dir * 9, 37); b.quadraticCurveTo(x0 + dir * 3, 56, x0 + dir * 5.5, 61); b.quadraticCurveTo(x0 + dir * 8, 70, x0 + dir * 6, TT); b.lineTo(x0, TT); b.closePath();
        gr = b.createLinearGradient(x0, 0, x0 + dir * 9, 0); gr.addColorStop(0, "#4a1e78"); gr.addColorStop(0.6, "#7a3cb8"); gr.addColorStop(1, "#3a1660"); b.fillStyle = gr; b.fill();
        b.strokeStyle = "rgba(0,0,0,.3)"; b.lineWidth = 0.3; b.beginPath(); b.moveTo(x0 + dir * 3, 38); b.quadraticCurveTo(x0 + dir * 2, 52, x0 + dir * 4, 61); b.stroke();
        rr(b, x0 + dir * 5.5 - 2, 59.6, 4, 2.6, 1); gr = b.createLinearGradient(0, 59.6, 0, 62.2); gr.addColorStop(0, "#fff0a0"); gr.addColorStop(1, "#c9952a"); b.fillStyle = gr; b.fill();
      }
      // 줄무늬 천막 지붕 + 물결 끝 + 금테
      b.save(); b.shadowColor = "rgba(0,0,0,.5)"; b.shadowBlur = 3 * KS; b.shadowOffsetY = 1 * KS;
      b.beginPath(); b.moveTo(0, 26); b.lineTo(LW, 26); b.lineTo(LW, 35);
      for (let x = LW; x > 0; x -= 7) b.quadraticCurveTo(x - 3.5, 39, x - 7, 35);
      b.closePath(); b.fillStyle = "#6b2fa0"; b.fill(); b.restore();
      b.save(); b.beginPath(); b.moveTo(0, 26); b.lineTo(LW, 26); b.lineTo(LW, 35); for (let x = LW; x > 0; x -= 7) b.quadraticCurveTo(x - 3.5, 39, x - 7, 35); b.closePath(); b.clip();
      for (let x = 0, i = 0; x < LW; x += 7, i++) if (i % 2) { b.fillStyle = "#f1e2c0"; b.fillRect(x, 26, 7, 14); }
      gr = b.createLinearGradient(0, 26, 0, 39); gr.addColorStop(0, "rgba(255,255,255,.28)"); gr.addColorStop(0.3, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,.28)"); b.fillStyle = gr; b.fillRect(0, 26, LW, 14);
      for (let x = 0; x < LW; x += 7) { gr = b.createLinearGradient(x, 0, x + 7, 0); gr.addColorStop(0, "rgba(0,0,0,.12)"); gr.addColorStop(0.5, "rgba(255,255,255,.08)"); gr.addColorStop(1, "rgba(0,0,0,.12)"); b.fillStyle = gr; b.fillRect(x, 26, 7, 14); }
      b.restore();
      b.fillStyle = "#e8c060"; b.fillRect(0, 34.2, LW, 0.6); b.fillStyle = "rgba(255,255,255,.4)"; b.fillRect(0, 26, LW, 0.4);
      // 지붕 가운데 달 간판
      b.save(); b.shadowColor = "rgba(255,210,100,.6)"; b.shadowBlur = 4 * KS;
      b.beginPath(); b.arc(cx, 30.5, 6.4, 0, 6.3); gr = b.createLinearGradient(cx - 6, 24, cx + 6, 37); gr.addColorStop(0, "#fff0a0"); gr.addColorStop(0.5, "#f2c255"); gr.addColorStop(1, "#9a6416"); b.fillStyle = gr; b.fill(); b.restore();
      b.beginPath(); b.arc(cx, 30.5, 5.3, 0, 6.3); gr = b.createRadialGradient(cx - 1, 29, 0.5, cx, 30.5, 6); gr.addColorStop(0, "#3a2a7a"); gr.addColorStop(1, "#140c38"); b.fillStyle = gr; b.fill();
      b.fillStyle = "#ffe9a0"; b.beginPath(); b.arc(cx - 0.8, 30.5, 3.6, 0, 6.3); b.fill(); b.fillStyle = "#1c1248"; b.beginPath(); b.arc(cx + 0.9, 29.4, 3.2, 0, 6.3); b.fill();
      star4(b, cx + 3.2, 27.6, 1, "#fff"); star4(b, cx + 3.6, 33.4, 0.7, "#ffe9a0");
      // 무대 바닥(나무 판자)
      gr = b.createLinearGradient(0, FL, 0, STY); gr.addColorStop(0, "#9a6a40"); gr.addColorStop(0.15, "#6a4428"); gr.addColorStop(1, "#3e2616"); b.fillStyle = gr; b.fillRect(0, FL, LW, STY - FL);
      for (let y = FL + 3.4; y < STY; y += 3.4) { b.fillStyle = "rgba(0,0,0,.35)"; b.fillRect(0, y, LW, 0.3); b.fillStyle = "rgba(255,220,170,.08)"; b.fillRect(0, y + 0.3, LW, 0.25); }
      glowAt(b, cx, FL + 2, 40, "255,190,110", 0.12);
      gr = b.createLinearGradient(0, STY - 1.5, 0, STY + 2); gr.addColorStop(0, "#1a0e14"); gr.addColorStop(1, "rgba(26,14,20,0)"); b.fillStyle = gr; b.fillRect(0, STY - 1.5, LW, 3.5);
      // 길: 가로등 불빛 웅덩이
      for (const lx of [LW * 0.3, LW * 0.78]) { b.save(); b.translate(lx, qF - 2); b.scale(1, 0.24); glowAt(b, 0, 0, 30, "255,176,74", 0.22); b.restore(); }
    };
    bgImg.onload = () => { bgOk = true; paintBG(); }; bgImg.src = "img/bg/studyst.webp";
    paintBG();
    // 앞 탁자(벨벳 천)·팁 통·찻잔 받침·촛대(벡터, 한 번만)
    const TB = mkCanvas(Math.round(LW * KS), Math.round(LH * KS));
    {
      const b = TB.getContext("2d"); b.setTransform(KS, 0, 0, KS, 0, 0);
      let gr = b.createLinearGradient(0, TT, 0, TT + 7); gr.addColorStop(0, "#5a3a92"); gr.addColorStop(1, "#3c2068"); b.fillStyle = gr; b.fillRect(3, TT, LW - 6, 7);
      b.fillStyle = "rgba(255,255,255,.18)"; b.fillRect(3, TT, LW - 6, 0.4); b.fillStyle = "#e2bd62"; b.fillRect(3, TT + 6.4, LW - 6, 0.6);
      gr = b.createLinearGradient(0, TT + 7, 0, FL); gr.addColorStop(0, "#40206e"); gr.addColorStop(1, "#22103e"); b.fillStyle = gr; b.fillRect(3, TT + 7, LW - 6, FL - TT - 7);
      for (let x = 3; x < LW - 3; x += 8) { gr = b.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, "rgba(0,0,0,.25)"); gr.addColorStop(0.5, "rgba(255,255,255,.05)"); gr.addColorStop(1, "rgba(0,0,0,.2)"); b.fillStyle = gr; b.fillRect(x, TT + 7, 8, FL - TT - 7); }
      for (let x = 4; x < LW - 3; x += 1.6) { b.fillStyle = "#e2bd62"; b.beginPath(); b.ellipse(x, FL - 0.4, 0.45, 0.9, 0, 0, 6.3); b.fill(); }
      b.fillStyle = "#c9952a"; b.fillRect(3, FL - 1.6, LW - 6, 0.5);
      for (let x = 10; x < LW - 8; x += 12) { star4(b, x, TT + 12, 0.9, "#e2bd62", 0.8); star4(b, x + 6, TT + 16, 0.6, "#e2bd62", 0.6); }
      // 팁 통(유리병)
      b.save(); b.shadowColor = "rgba(0,0,0,.4)"; b.shadowBlur = 2 * KS; rr(b, JARX, TT - 13, 11, 14, 2); b.fillStyle = "rgba(200,230,255,.16)"; b.fill(); b.restore();
      rr(b, JARX, TT - 13, 11, 14, 2); b.strokeStyle = "rgba(220,240,255,.7)"; b.lineWidth = 0.4; b.stroke();
      b.fillStyle = "rgba(255,255,255,.55)"; rr(b, JARX + 1, TT - 11.6, 1, 10, 0.5); b.fill();
      rr(b, JARX - 1, TT - 15, 13, 2.4, 0.8); gr = b.createLinearGradient(0, TT - 15, 0, TT - 12.6); gr.addColorStop(0, "#fff0a0"); gr.addColorStop(1, "#a87418"); b.fillStyle = gr; b.fill();
      rr(b, JARX + 2, TT - 9.4, 7, 4.2, 0.6); b.fillStyle = "#f3e6c4"; b.fill(); b.fillStyle = "#c94f4f"; b.font = "900 2.4px sans-serif"; b.textAlign = "center"; b.textBaseline = "middle"; b.fillText("TIP", JARX + 5.5, TT - 7.2);
      // 찻잔 받침
      b.fillStyle = "rgba(0,0,0,.3)"; b.beginPath(); b.ellipse(TEAX + 3.5, TT + 4, 5.6, 1.2, 0, 0, 6.3); b.fill();
      gr = b.createLinearGradient(0, TT + 2.6, 0, TT + 4.6); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#c8c0d0"); b.fillStyle = gr; b.beginPath(); b.ellipse(TEAX + 3.5, TT + 3.4, 5.2, 1.1, 0, 0, 6.3); b.fill();
      // 촛대 + 초
      gr = b.createLinearGradient(LW - 10, 0, LW - 3, 0); gr.addColorStop(0, "#8a6420"); gr.addColorStop(0.5, "#ffe08a"); gr.addColorStop(1, "#8a6420"); b.fillStyle = gr; b.beginPath(); b.ellipse(LW - 6.5, TT + 3.6, 3.6, 1, 0, 0, 6.3); b.fill(); b.fillRect(LW - 7.2, TT + 1, 1.4, 2.6);
      gr = b.createLinearGradient(LW - 8, 0, LW - 5, 0); gr.addColorStop(0, "#fffaf0"); gr.addColorStop(1, "#c8b8e0"); rr(b, LW - 8, TT - 6, 3, 7.4, 0.6); b.fillStyle = gr; b.fill();
      b.strokeStyle = "#3a2a2a"; b.lineWidth = 0.25; b.beginPath(); b.moveTo(LW - 6.5, TT - 6); b.lineTo(LW - 6.5, TT - 7.2); b.stroke();
    }

    // ── 상태 ──  tut: 0 리허설 준비 / 1 끌어 앉히기 / 2 1장 / 3 무거운 손님 3장 / 4 차 / 5 밀기 / 6 시작 버튼 / -1 본게임
    let tut = opts.retry ? -1 : 0;
    let started = false, over = false, done = false, closing = false, timeUp = false, raf = 0, last = 0, now0 = 0, tm = null, el = 0, endT = 0;
    let mental = 100, teaCD = 0, sipT = 0, idleT = 0, firstPop = true, saw = {};
    let money = 0, served = 0, lost = 0, passed = 0, readings = 0, matchOk = 0, lowTime = 0, zeroTime = 0, coupleOk = 0, drunkOut = 0, drunkSeat = 0, pushedBad = 0, waitEnd = 0, jarN = 0;
    let snow = false, snowAcc = 0, evI = 0, nextSp = 0, uid = 0, offK = 0, shoot = null;
    const queue = [], seats = [null, null, null], leavers = [], coins = [], sparks = [], hearts = [], puffs = [], flakes = [], groups = {};
    const R = {}; // 리허설 손님 A·B·C
    let drag = null;
    const rh = () => tut >= 0;

    // ── 말·안내 ──
    const say = (lx, ly, text, cls = "") => { const e = document.createElement("div"); e.className = "tq-say " + cls; e.textContent = text; e.style.left = clamp(lx * K, 40, LW * K - 40) + "px"; e.style.top = ly * K + "px"; st.appendChild(e); setTimeout(() => e.remove(), 1650); };
    let taskHTML = "";
    const setTask = (html) => { if (html === taskHTML) return; taskHTML = html; taskEl.innerHTML = `<span>${html}</span>`; };
    const SKIP = `<button class="tq-skip" data-skip>건너뛰기</button>`;
    const setTB = (html, cls) => { tbEl.innerHTML = html; tbEl.className = "tq-tb " + (cls || ""); if (cls === "go") tbEl.style.bottom = hudH + 22 + "px"; else tbEl.style.bottom = ""; };
    const scUpd = () => { F.sc.textContent = `손님 ${served} · ${won(money)}원`; };
    const handAt = (p, mode, to) => {
      if (!p) { if (hand.className !== "tq-hand") hand.className = "tq-hand"; return; }
      let x, y; if (Array.isArray(p)) { x = p[0]; y = p[1]; } else { const r = p.getBoundingClientRect(), s = st.getBoundingClientRect(); x = r.left - s.left + r.width * 0.78; y = r.top - s.top + r.height * 0.72; }
      hand.style.left = Math.round(x) + "px"; hand.style.top = Math.round(y) + "px";
      if (to) { hand.style.setProperty("--dx", Math.round(to[0] - x) + "px"); hand.style.setProperty("--dy", Math.round(to[1] - y) + "px"); }
      const cn = "tq-hand on " + mode; if (hand.className !== cn) hand.className = cn;
    };
    const menUpd = (pang) => {
      const v = clamp(mental, 0, 100); menBar.style.width = v + "%"; menNum.textContent = Math.round(v); menEl.classList.toggle("low", v < 28);
      if (pang) { menEl.classList.remove("pang"); void menEl.offsetWidth; menEl.classList.add("pang"); }
      const cd = teaCD > 0 ? teaCD / (6.5 / ez) : 0; teaBtn.style.setProperty("--cd", cd.toFixed(3)); teaBtn.classList.toggle("rdy", cd <= 0 && v < 35 && !closing);
      meEl.classList.toggle("tired", v < 25 && !closing);
    };

    // ── 손님 만들기 ──
    const occ = () => queue.reduce((s, u) => s + u.n, 0);
    const mkUnit = (kind, o = {}) => {
      const n = kind === "couple" ? 2 : 1;
      const heavy = o.heavy ?? (kind === "drunk" || kind === "group" ? false : rnd() < 0.45);
      const ico = o.ico || (kind === "drunk" ? "bottle" : kind === "couple" ? (heavy ? "ring" : "heart") : pick(heavy ? HEAVY : LIGHT));
      const ty = () => pick(["plain", "student", "worker", "worker", "teen", "plain", "elder"]);
      const ppl = kind === "couple" ? [mkP(ty()), mkP(ty())] : kind === "drunk" ? [mkP("worker", { drunk: true, scarf: null })] : [mkP(ty(), kind === "group" ? { party: o.hat } : {})];
      const used = new Set(queue.flatMap((q) => q.ppl.map((pp) => pp.key)).concat(seats.filter(Boolean).flatMap((q) => q.ppl.map((pp) => pp.key))));
      ppl.forEach((pp) => { if (used.has(pp.key)) pp.key = pick(POOL.filter((k) => !used.has(k))) || pp.key; used.add(pp.key); pim(pp.key); });
      const pm = (kind === "couple" ? 14 : kind === "group" ? 11 : 12.5) * ez;
      const u = { id: ++uid, kind, n, ppl, heavy, ico, pat: pm, patMax: pm, state: "walk", x: -10 - (n - 1) * QS - (o.off || 0), tx: QX0, t: rnd() * 3, gid: o.gid || 0, seats: [], phase: "", spread: 0, prog: 0, dur: 0, cost: 0, low: false, right: false, flips: 0, pop: null, popT: 0, hic: 1 + rnd(), qT: 0 };
      queue.push(u); return u;
    };
    const unitPos = (u) => [u.x - (u.n - 1) * QS / 2, qF];

    // ── 앉히기·고르기·상담 ──
    const freeFor = (u, i) => {
      if (i < 0 || i > 2 || seats[i]) return null;
      if (u.n === 1) return [i];
      if (i + 1 < 3 && !seats[i + 1]) return [i, i + 1];
      if (i - 1 >= 0 && !seats[i - 1]) return [i - 1, i];
      return null;
    };
    const seatX = (u) => u.seats.reduce((a, k) => a + SX[k], 0) / u.seats.length;
    const fromQueue = (u) => { const i = queue.indexOf(u); if (i >= 0) queue.splice(i, 1); };
    const seatUnit = (u, i) => {
      const ss = freeFor(u, i);
      if (!ss) { SFX.tok(); F.msg(u.n === 2 ? "커플은 나란히 빈 두 자리가 필요해요" : "빈 의자에 앉혀요"); return false; }
      if (rh() && u.kind === "drunk") { SFX.fail(); F.msg("술 취한 손님은 왼쪽으로 밀어 돌려보내요"); return false; }
      fromQueue(u); u.state = "seat"; u.seats = ss; ss.forEach((k) => (seats[k] = u)); u.phase = "sit"; u.t = 0;
      SFX.pop(); tone(880, 0.06, "triangle", 0.06, 0, 0.05); vib(10); idleT = 0;
      sparkle(seatX(u), SEATY + 20, 6, "#ffe9a0");
      if (u.kind === "drunk") { u.phase = "drunk"; drunkSeat++; setMe("surprised", 1.2); say(seatX(u), SEATY + 4, "딸꾹! 내 운세 좀 봐 봐~", "dr"); F.miss([seatX(u) * K, (SEATY + 10) * K]); F.msg("앗, 취한 손님이 소란을 피워요!"); }
      if (u.n === 2) setMe("blush", 1);
      if (u.gid && groups[u.gid]) groups[u.gid].seated++;
      return true;
    };
    const openPop = (u) => {
      const e = document.createElement("div"); e.className = "tq-pop";
      e.style.left = Math.round(clamp(seatX(u), 16, LW - 16) * K) + "px"; e.style.top = POPY * K + "px";
      e.innerHTML = `<button data-k="1"><img src="${C1}" alt=""><b>1장</b><small>빠르게</small></button><button data-k="3"><img src="${C3}" alt=""><b>3장</b><small>정성껏</small></button>`;
      e.addEventListener("pointerdown", (ev) => { const b = ev.target.closest("button"); if (!b) return; ev.preventDefault(); ev.stopPropagation(); choose(u, +b.dataset.k, b); });
      popsEl.appendChild(e); u.pop = e; u.popT = 0;
    };
    const closePop = (u) => { if (!u.pop) return; const e = u.pop; u.pop = null; e.classList.add("out"); setTimeout(() => e.remove(), 220); };
    const choose = (u, k, btn) => {
      if (u.phase !== "choose" || done) return;
      const right = (k === 3) === u.heavy;
      const shake = () => { if (!u.pop) return; u.pop.classList.remove("no"); void u.pop.offsetWidth; u.pop.classList.add("no"); };
      if (rh() && !right) { SFX.fail(); F.msg(u.heavy ? "어두운 말풍선은 무거운 고민! 3장으로" : "밝은 말풍선은 가벼운 고민! 1장으로"); shake(); return; }
      if (mental <= 0) { SFX.fail(); F.msg("멘탈이 바닥이에요! 차부터 한 잔"); shake(); return; }
      idleT = 0; firstPop = false;
      u.spread = k; u.phase = "read"; u.prog = 0; u.flips = 0; u.right = right;
      u.dur = (k === 1 ? 2.1 : 3.9) * (rh() ? 0.7 : 1) * (u.n === 2 ? 1.1 : 1);
      u.cost = (k === 1 ? (u.heavy ? 7 : 4) : (u.heavy ? 10 : 8)) * (u.n === 2 ? 1.3 : 1);
      u.cards = Array.from({ length: k * u.n > 3 ? 3 : k }, () => pick(MFR));
      const p = btn || u.pop;
      if (!rh()) { readings++; if (right) matchOk++; }
      if (right) { if (p) F.hit(p, k === 1 ? "5,000" : "15,000", "#ffd166"); else SFX.ding(); }
      else { if (p) F.miss(p); F.msg(u.heavy ? "무거운 고민인데 1장이면 서운해요" : "가벼운 고민엔 1장이면 충분해요"); }
      closePop(u);
      for (let j = 0; j < 4; j++) noise(0.022, 2600 + rnd() * 1800, 0.06, j * 0.03, 3);
    };
    const finishRead = (u) => {
      u.phase = "done"; u.t = 0;
      let pay, tip = 0, mood, line;
      if (u.right && !u.low) { pay = u.spread === 1 ? 5000 : 15000; tip = u.heavy ? 3000 : 1000; mood = "happy"; line = pick(HAPPY_LN); }
      else if (u.right) { pay = u.spread === 1 ? 5000 : 15000; mood = "meh"; line = "음… 좀 지쳐 보이세요"; }
      else if (u.heavy) { pay = 5000; mood = "sad"; line = "그게 다예요…?"; }
      else { pay = 10000; mood = "meh"; line = "이렇게까지 볼 일은…"; }
      pay *= u.n; tip *= u.n;
      const sx = seatX(u);
      if (u.n === 2 && u.right) { tip += 5000; if (!rh()) coupleOk++; setTimeout(() => !done && say(sx, SEATY - 4, "커플 보너스 +5,000", "gold"), 500); for (let k = 0; k < 10; k++) hearts.push({ x: sx + (rnd() - 0.5) * 30, y: SEATY + 4, vy: -12 - rnd() * 8, t: 0, d: k * 0.07 }); }
      u.mood = mood;
      if (!rh()) {
        served += u.n; money += pay + tip;
        if (u.gid && groups[u.gid]) { const g = groups[u.gid]; g.served++; if (g.served === 3) { money += 10000; setTimeout(() => { if (done) return; say(sx, SEATY - 10, "단체 손님 전원 만족! +10,000", "gold"); SFX.ding(6); }, 700); } }
        scUpd();
      }
      say(sx, SEATY + 2, line, mood === "sad" ? "bad" : "");
      const nc = Math.min(10, Math.round((pay + tip) / 2500));
      for (let k = 0; k < nc; k++) coins.push({ t: -k * 0.07, x0: sx + (rnd() - 0.5) * 8, y0: SEATY + 6, x1: JARX + 3 + rint(5), y1: TT - 4 });
      if (mood === "happy") { [1046, 1318, 1568].forEach((f, k) => tone(f, 0.16, "triangle", 0.08, 0, k * 0.07)); setMe(u.n === 2 ? "blush" : "smile", 1.2); sparkle(sx, SEATY + 6, 10); for (let k = 0; k < 4; k++) hearts.push({ x: sx + (rnd() - 0.5) * 14, y: SEATY + 2, vy: -10 - rnd() * 6, t: 0, d: k * 0.1 }); }
      else if (mood === "sad") { tone(330, 0.25, "sine", 0.07, -90); setMe("sad", 1.2); }
      else { tone(520, 0.12, "triangle", 0.06); setMe("neutral"); }
      if (!rh()) F.float([sx * K, (SEATY - 2) * K], "+" + won(pay + tip));
    };
    const standUp = (u) => {
      u.seats.forEach((k) => { if (seats[k] === u) seats[k] = null; });
      closePop(u);
      u.ppl.forEach((p, j) => leavers.push({ p, x: SX[u.seats[j] ?? u.seats[0]], feet: FL + 13, dir: 1, sp: 30, t: rnd(), mood: u.mood, kind: u.kind }));
      u.state = "gone";
    };
    const leaveAngry = (u) => {
      fromQueue(u); u.state = "gone";
      const [px] = unitPos(u);
      u.ppl.forEach((p, j) => leavers.push({ p, x: u.x - j * QS, feet: qF, dir: -1, sp: 34, t: rnd(), mood: "mad", kind: u.kind }));
      for (let k = 0; k < 4; k++) puffs.push({ x: px + (rnd() - 0.5) * 10, y: qF - 26, t: -k * 0.1 });
      lost += u.n; if (u.gid && groups[u.gid]) groups[u.gid].lost++;
      F.miss([px * K, (qF - 36) * K]); say(px, qF - 38, pick(["너무 오래 기다렸어요!", "다른 데 갈래요", "추워서 못 기다려요…"]), "bad"); setMe("sad", 0.9);
    };
    const pushUnit = (u) => {
      if (rh() && u.kind !== "drunk") { SFX.tok(); F.msg("상담받으러 온 손님이에요! 의자에 앉혀요"); return false; }
      fromQueue(u); u.state = "gone"; idleT = 0;
      const [px] = unitPos(u);
      u.ppl.forEach((p, j) => leavers.push({ p, x: Math.min(u.x, 20) - j * QS, feet: qF, dir: -1, sp: u.kind === "drunk" ? 22 : 34, t: 0, mood: u.kind === "drunk" ? "drunk" : "sad", kind: u.kind }));
      if (u.kind === "drunk") {
        if (!rh()) drunkOut++;
        F.burst([18 * K, (qF - 30) * K], "#7fe0a8", 12); F.float([18 * K, (qF - 30) * K], "정중히 배웅"); SFX.ding(2); vib(12); say(22, qF - 38, "딸꾹… 집에 갈게요~", "dr"); setMe("smile", 0.9);
        SFX.whoosh(); for (const q of queue) q.pat = Math.min(q.patMax, q.pat + 2);
      } else { lost += u.n; pushedBad++; F.miss([18 * K, (qF - 30) * K]); say(22, qF - 38, "네…? 저 상담받으러 왔는데…", "bad"); setMe("sad", 0.9); if (u.gid && groups[u.gid]) groups[u.gid].lost++; }
      if (tut === 5 && u === R.C) tut = 51;
      return true;
    };
    const drinkTea = () => {
      if (teaCD > 0 || closing || done) return false;
      const add = Math.min(100 - mental, 38); mental = Math.min(100, mental + 38); teaCD = 6.5 / ez; sipT = 1; idleT = 0;
      noise(0.3, 600, 0.06, 0, 0.8); tone(392, 0.12, "sine", 0.07, 200, 0.2); tone(784, 0.18, "triangle", 0.06, 0, 0.32); vib(12);
      setMe("smile", 1.1); menUpd(true);
      F.float(teaBtn, "+" + Math.round(Math.max(add, 0)) + " 멘탈", "");
      for (let k = 0; k < 6; k++) puffs.push({ x: TEAX + 4 + (rnd() - 0.5) * 4, y: TT - 2, t: -k * 0.08, steam: 1 });
      if (tut === 4) { tut = 41; R.C = mkUnit("drunk"); }
      return true;
    };
    teaBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!drinkTea() && teaCD > 0) { SFX.tok(); F.msg("찻물이 아직 끓고 있어요"); } });
    tbEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); startGame(); } });
    const sparkle = (x, y, n, col) => { for (let k = 0; k < n; k++) sparks.push({ x: x + (rnd() - 0.5) * 22, y: y + (rnd() - 0.5) * 16, t: 0, life: 0.5 + rnd() * 0.5, c: col || pick(["#ffffff", "#ffe9a0", "#ffd84a", "#d8c0ff"]) }); };

    // ── 사건 ──
    const EV = [[5, "couple"], [10, "drunk"], [13.5, "snow"], [17, "group"], [22, "couple"], [26, "drunk"]];
    const doEvent = (k) => {
      if (k === "snow") { snow = true; F.msg("눈이 와요! 손님들이 빨리 지쳐요"); [659, 784, 988, 1318].forEach((f, j) => tone(f, 0.3, "sine", 0.05, 0, j * 0.12)); return true; }
      if (k === "couple") { if (MAXQ - occ() < 2) return false; mkUnit("couple"); if (!saw.couple) { saw.couple = 1; F.msg("커플 손님! 나란히 빈 두 자리에"); } return true; }
      if (k === "drunk") { if (MAXQ - occ() < 1 || queue.some((u) => u.kind === "drunk")) return false; mkUnit("drunk"); if (!saw.drunk) { saw.drunk = 1; F.msg("술 취한 손님! 왼쪽으로 밀어 돌려보내요"); } tone(220, 0.2, "sawtooth", 0.05, 60); return true; }
      if (k === "group") {
        if (MAXQ - occ() < 3) return false;
        const gid = 100 + evI; groups[gid] = { served: 0, seated: 0, lost: 0 }; const hat = pick(["#ff5f8a", "#5fb8ff", "#7fe0a8", "#ffd84a"]);
        for (let j = 0; j < 3; j++) mkUnit("group", { gid, hat, off: j * QS });
        F.msg("단체 손님 3명! 다 받으면 보너스"); SFX.ding(3); return true;
      }
      return true;
    };
    const spawnMain = (dt) => {
      if (timeUp || !tm || tm.left() < 2.5) return;
      while (evI < EV.length && el >= EV[evI][0]) { if (doEvent(EV[evI][1]) || el > EV[evI][0] + 4) evI++; else break; }
      nextSp -= dt;
      if (nextSp <= 0) {
        if (MAXQ - occ() >= 1) mkUnit("one"); else { passed++; F.msg("줄이 꽉 차서 손님이 지나쳐 가요"); }
        nextSp = 1.75 + rnd() * 0.7;
      }
    };

    // ── 리허설 → 본게임 ──
    const clearAll = () => {
      queue.length = 0; leavers.length = 0; coins.length = 0; hearts.length = 0; puffs.length = 0; sparks.length = 0;
      for (let i = 0; i < 3; i++) { const u = seats[i]; if (u) closePop(u); seats[i] = null; }
      popsEl.innerHTML = ""; drag = null; outEl.className = "tq-out";
    };
    const startGame = () => {
      if (started) return; started = true; tut = -1;
      clearAll(); setTB("", "");
      mental = 100; teaCD = 0; money = 0; served = 0; lost = 0; passed = 0; readings = 0; matchOk = 0; lowTime = 0; zeroTime = 0; coupleOk = 0; drunkOut = 0; drunkSeat = 0; pushedBad = 0; jarN = 0; el = 0; evI = 0; snow = false; snowAcc = 0; idleT = 0; firstPop = true;
      handAt(null); scUpd(); menUpd(); SFX.go(); setMe("smile", 0.8);
      mkUnit("one", { heavy: false }); mkUnit("one", { heavy: true, off: 22 }); nextSp = 2.2;
      tm = timer(T, F.bar, onTimeUp);
    };
    const onTimeUp = () => {
      if (timeUp) return; timeUp = true; handAt(null); drag = null; outEl.className = "tq-out";
      F.msg("축제 끝! 마지막 손님까지 마무리");
      for (const u of queue.slice()) { waitEnd += u.kind === "drunk" ? 0 : u.n; fromQueue(u); u.ppl.forEach((p, j) => leavers.push({ p, x: u.x - j * QS, feet: qF, dir: -1, sp: 30, t: rnd(), mood: "bye", kind: u.kind })); }
      say(cx, qF - 38, "내년에 또 올게요~");
      for (let i = 0; i < 3; i++) { const u = seats[i]; if (!u) continue; if (u.phase === "choose" || u.phase === "sit") { u.mood = "bye"; standUp(u); } }
      setTimeout(() => { if (!done) closeShow(); }, 1700);
    };
    const closeShow = () => {
      if (closing) return; closing = true; over = true; endT = 0;
      for (let i = 0; i < 3; i++) { const u = seats[i]; if (u) { if (u.phase === "read" && u.prog > 0.3) finishRead(u); u.mood = u.mood || "bye"; standUp(u); } }
      setTask("텅 빈 장터, 불이 하나씩 꺼져요…"); setMe("smile");
      [784, 659, 523, 659, 784].forEach((f, k) => tone(f, 0.25, "triangle", 0.07, 0, k * 0.18));
      setTimeout(() => {
        if (done) return;
        const ov = document.createElement("div"); ov.className = "tq-end";
        const good = served >= 10 && readings && matchOk / readings > 0.7;
        ov.innerHTML = `<h4>축제 끝!<small>팁 통을 세며 별을 올려다봐요</small></h4><canvas></canvas>
          <div class="tq-stats"><div><span>상담한 손님</span><b data-k="0">0</b></div><div><span>오늘 수입</span><b data-k="1">0</b></div><div><span>남은 멘탈</span><b data-k="2">0</b></div></div>
          <div class="tq-bye">${good ? "“올해도 고생 많았어, 나.”" : served ? "다음 축제엔 줄을 더 빨리 줄여 봐요" : "손님들이 줄 서서 기다렸어요…"}</div>`;
        st.appendChild(ov);
        const jc = ov.querySelector("canvas"); jc.width = 108; jc.height = 126; drawJar(jc.getContext("2d"), 0);
        const tg = [served, money, Math.round(mental)], bs = ov.querySelectorAll("[data-k]"), t1 = performance.now();
        const cnt = () => {
          if (!ov.isConnected || done) return; const p = clamp((performance.now() - t1 - 300) / 1300, 0, 1), e = 1 - Math.pow(1 - p, 3);
          bs.forEach((b, i) => (b.textContent = i === 1 ? won(tg[i] * e) + "원" : i === 0 ? Math.round(tg[i] * e) + "명" : Math.round(tg[i] * e) + "%"));
          drawJar(jc.getContext("2d"), e * clamp(money / 200000, 0.08, 1));
          if (p < 1) { if (rnd() < 0.4) tone(1900 + rnd() * 500, 0.04, "square", 0.04); requestAnimationFrame(cnt); } else { SFX.ding(4); vib(15); }
        };
        requestAnimationFrame(cnt);
      }, 1600);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const den = served + lost + passed * 0.5 + waitEnd * 0.5;
        const sR = den ? served / den : 0, mR = readings ? matchOk / readings : 0;
        const mS = clamp(1 - zeroTime / 5 - lowTime / 40, 0, 1) * Math.min(1, readings / 5);
        const ev = 0.03 * Math.min(2, coupleOk) + 0.02 * Math.min(2, drunkOut) - 0.07 * drunkSeat - 0.05 * pushedBad;
        const score = readings ? clamp(0.45 * Math.pow(sR, 1.5) + 0.35 * mR * mR + 0.2 * mS + ev, 0, 1) : 0.03;
        finish(score, `손님 <b>${served}명</b> 상담 · 수입 ${won(money)}원 · 놓친 손님 ${lost + passed}명`, "", [["손님 받기", sR], ["상담 고르기", mR], ["멘탈 관리", mS]]);
      }, 6400);
    };
    const drawJar = (g, lv) => {
      g.save(); g.setTransform(6, 0, 0, 6, 0, 0); g.clearRect(0, 0, 18, 21);
      rr(g, 2, 4, 14, 16.4, 2.4); g.fillStyle = "rgba(200,230,255,.14)"; g.fill();
      const top = 19.6 - 14 * lv;
      g.save(); rr(g, 2, 4, 14, 16.4, 2.4); g.clip();
      for (let y = 19.6; y > top; y -= 1.1) for (let x = 3; x < 15.6; x += 2.2) { const gr = g.createRadialGradient(x + 0.6 + (y % 2), y - 0.3, 0.1, x + 0.8 + (y % 2), y, 1.4); gr.addColorStop(0, "#fff3b0"); gr.addColorStop(1, (Math.round(x + y) % 3) ? "#e0a030" : "#c9851c"); g.fillStyle = gr; g.beginPath(); g.ellipse(x + 0.8 + (y % 2), y, 1.1, 0.6, 0, 0, 6.3); g.fill(); }
      if (lv > 0.2) { g.fillStyle = "#9ad88a"; rr(g, 5, top + 1.4, 5.4, 3, 0.4); g.fill(); g.fillStyle = "#c8f0b8"; g.fillRect(5, top + 1.4, 5.4, 0.5); }
      g.restore();
      rr(g, 2, 4, 14, 16.4, 2.4); g.strokeStyle = "rgba(220,240,255,.8)"; g.lineWidth = 0.35; g.stroke();
      g.fillStyle = "rgba(255,255,255,.6)"; rr(g, 3, 5.6, 0.9, 11, 0.45); g.fill();
      rr(g, 1, 1.8, 16, 2.6, 0.8); const gr = g.createLinearGradient(0, 1.8, 0, 4.4); gr.addColorStop(0, "#fff0a0"); gr.addColorStop(1, "#a87418"); g.fillStyle = gr; g.fill();
      rr(g, 5, 7.6, 8, 4.4, 0.6); g.fillStyle = "#f3e6c4"; g.fill(); g.fillStyle = "#c94f4f"; g.font = "900 2.6px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TIP", 9, 9.9);
      g.restore();
    };

    // ── 입력(끌기) ──
    const toL = (e) => { const r = cvF.getBoundingClientRect(); return [(e.clientX - r.left) / K, (e.clientY - r.top) / K]; };
    const hoverSeat = (x, y) => { if (y < TT - 14 || y > STY + 10) return -1; let b = -1, bd = 16; SX.forEach((sx, i) => { const d = Math.abs(x - sx); if (d < bd) { bd = d; b = i; } }); return b; };
    const pickAt = (x, y) => {
      for (let i = queue.length - 1; i >= 0; i--) { const u = queue[i]; if (u.state !== "queue" && u.state !== "walk") continue; if (u.x < 2) continue; for (let j = 0; j < u.n; j++) { const px = u.x - j * QS; if (Math.abs(x - px) <= 8 && y >= qF - 46 && y <= qF + 3) return u; } }
      return null;
    };
    cvF.addEventListener("pointerdown", (e) => {
      e.preventDefault(); if (closing || timeUp || done) return; const [x, y] = toL(e); idleT = 0;
      const u = pickAt(x, y); if (!u) return;
      try { cvF.setPointerCapture(e.pointerId); } catch (er) {}
      drag = { u, x, y, id: e.pointerId, t: 0 }; u.state = "drag"; SFX.tok(); vib(8);
    });
    cvF.addEventListener("pointermove", (e) => { if (!drag || drag.id !== e.pointerId) return; const [x, y] = toL(e); drag.x = x; drag.y = y; });
    const up = (e) => {
      if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; outEl.className = "tq-out";
      const u = d.u; if (u.state !== "drag") return; u.state = "queue";
      const hs = hoverSeat(d.x, d.y);
      if (hs >= 0 && seatUnit(u, hs)) return;
      if (d.x < 14 && d.y > STY) { pushUnit(u); return; }
      noise(0.05, 900, 0.05);
    };
    cvF.addEventListener("pointerup", up); cvF.addEventListener("pointercancel", up);

    // ── 그리기(벡터) ──
    const heartV = (g, x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s * 0.3); g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.32); g.bezierCurveTo(x - s * 0.5, y + s * 0.62, x, y + s * 0.78, x, y + s); g.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.62, x + s * 0.5, y + s * 0.32); g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); g.fill(); };
    const dropV = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y - s); g.bezierCurveTo(x + s * 0.75, y, x + s * 0.75, y + s * 0.75, x, y + s * 0.75); g.bezierCurveTo(x - s * 0.75, y + s * 0.75, x - s * 0.75, y, x, y - s); const q = g.createRadialGradient(x - s * 0.2, y, 0.05, x, y, s); q.addColorStop(0, "#fff"); q.addColorStop(0.45, "#bfe8ff"); q.addColorStop(1, "#4fa8e8"); g.fillStyle = q; g.fill(); };
    const miniCard = (g, x, y, up, col) => {
      g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 1.5 * KS; rr(g, x, y, 5, 7.4, 0.8); g.fillStyle = "#c9952a"; g.fill(); g.restore();
      rr(g, x + 0.5, y + 0.5, 4, 6.4, 0.5);
      if (up) { g.fillStyle = "#f6ead0"; g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(x + 2.5, y + 1.6); g.lineTo(x + 4, y + 3.7); g.lineTo(x + 2.5, y + 5.8); g.lineTo(x + 1, y + 3.7); g.closePath(); g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(x + 2.1, y + 3.1, 0.4, 0, 6.3); g.fill(); }
      else { const q = g.createLinearGradient(0, y, 0, y + 7); q.addColorStop(0, "#3e2480"); q.addColorStop(1, "#1e0e48"); g.fillStyle = q; g.fill(); star4(g, x + 2.5, y + 3.7, 1.1, "#ffd84a"); }
    };
    const drawBubble = (g, bx, bottom, u, tt) => {
      const heavy = u.heavy && u.kind !== "drunk", dr = u.kind === "drunk";
      const x = bx - 5.5 + (dr ? Math.sin(tt * 5) : 0), y = bottom - 12 + Math.sin(tt * 2 + u.id) * 0.5;
      const fill = dr ? "#e4f4d8" : heavy ? "#3a2258" : "#fffdf4";
      g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 2.5 * KS; g.shadowOffsetY = 0.6 * KS;
      rr(g, x, y, 11, 10, 2.8); g.fillStyle = fill; g.fill(); g.beginPath(); g.moveTo(x + 3.6, y + 9.6); g.lineTo(x + 4.8, y + 12.2); g.lineTo(x + 6.6, y + 9.6); g.closePath(); g.fill(); g.restore();
      if (heavy) { const q = g.createLinearGradient(0, y, 0, y + 10); q.addColorStop(0, "rgba(180,140,255,.35)"); q.addColorStop(1, "rgba(180,140,255,0)"); rr(g, x, y, 11, 10, 2.8); g.fillStyle = q; g.fill(); }
      rr(g, x, y, 11, 10, 2.8); g.strokeStyle = heavy ? "#b48cff" : dr ? "#8ab878" : "#d8c8a8"; g.lineWidth = 0.35; g.stroke();
      const im = ICI[u.ico]; if (im && im.complete && im.naturalWidth) g.drawImage(im, x + 1.7, y + 1.3, 7.6, 7.6);
      if (u.n === 2) heartV(g, x + 11.2, y - 0.4, 2.8, "#ff6fa0");
      if (!dr && !rh() && (u.state === "queue" || u.state === "walk")) {
        const k = clamp(u.pat / u.patMax, 0, 1), low = k < 0.3;
        rr(g, x, y - 3.4, 11, 2, 1); g.fillStyle = "rgba(10,6,20,.85)"; g.fill();
        if (!(low && Math.floor(tt * 6) % 2) && k > 0) { rr(g, x + 0.35, y - 3.05, 10.3 * k, 1.3, 0.65); g.fillStyle = k > 0.6 ? "#7fe0a8" : k > 0.3 ? "#ffd166" : "#ff5a6a"; g.fill(); }
      }
    };
    // 서 있는 사람(앞모습 그림). 반환: 머리 꼭대기 y
    const MOODX = { happy: "smile", mad: "angry", sad: "sad", drunk: "blush", bye: "smile", meh: "neutral" };
    const partyHat = (g, x, y, c) => { g.beginPath(); g.moveTo(x - 2.2, y + 0.8); g.lineTo(x, y - 4.6); g.lineTo(x + 2.2, y + 0.8); g.closePath(); const q = g.createLinearGradient(x - 2, 0, x + 2, 0); q.addColorStop(0, mix(c, 0.75)); q.addColorStop(0.5, mix(c, 1.3)); q.addColorStop(1, mix(c, 0.8)); g.fillStyle = q; g.fill(); g.strokeStyle = "#fff8"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x - 1.2, y - 1); g.lineTo(x + 1.4, y - 0.4); g.stroke(); g.fillStyle = "#fff3b0"; g.beginPath(); g.arc(x, y - 4.8, 0.8, 0, 6.3); g.fill(); };
    const drawFront = (g, p, cx, feet, o = {}) => {
      const r = pim(p.key);
      if (!r.ok) { drawP(g, p, o.view || "s", o.f || 0, !!o.flip, cx, feet); return feet - 30; }
      const c = faded(r, o.ex || "neutral"), bob = o.bob || 0;
      if (!o.noShadow) { g.fillStyle = "rgba(0,0,0,.32)"; g.beginPath(); g.ellipse(cx, feet - 0.4, 5.2, 1.1, 0, 0, 6.3); g.fill(); }
      g.save(); g.translate(cx, feet + bob); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
      g.drawImage(c, -PW / 2, -PH, PW, PH); g.restore();
      const top = feet + bob - PH + 0.7;
      if (p.party) partyHat(g, cx, top + 0.6, p.party);
      return top;
    };
    // 앉은 사람(뒷모습 벡터: 그림에서 뽑은 머리·옷 색)
    const drawBack = (g, p, sx, top) => {
      const r = pim(p.key);
      if (!r.ok || !r.hair) { drawP(g, p, "b", 0, false, sx, top + 30, 24); return; }
      const hair = r.hair, coat = r.coat || p.spec.shirt;
      g.save(); g.translate(sx, top);
      // 어깨·외투
      g.beginPath(); g.moveTo(-8.4, 25); g.bezierCurveTo(-8.6, 15.4, -6.8, 11.8, -2.8, 11.1); g.lineTo(2.8, 11.1); g.bezierCurveTo(6.8, 11.8, 8.6, 15.4, 8.4, 25); g.closePath();
      let q = g.createLinearGradient(0, 11, 0, 25); q.addColorStop(0, coat); q.addColorStop(1, "rgba(10,6,20,.95)"); g.fillStyle = coat; g.fill(); g.fillStyle = q; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
      q = g.createLinearGradient(-8, 0, 8, 0); q.addColorStop(0, "rgba(0,0,0,.3)"); q.addColorStop(0.5, "rgba(255,255,255,.08)"); q.addColorStop(1, "rgba(255,200,140,.18)"); g.fillStyle = q; g.fill();
      g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(0, 12); g.lineTo(0, 25); g.stroke();
      // 목
      g.fillStyle = "#d8ae8e"; rr(g, -1.7, 7.4, 3.4, 4.4, 1.2); g.fill();
      // 목도리
      if (p.scarf) { g.fillStyle = p.scarf; rr(g, -4.4, 9.8, 8.8, 2.8, 1.3); g.fill(); g.fillStyle = mix(p.scarf, 0.78); rr(g, 1.4, 11.6, 2.4, 5.4, 0.8); g.fill(); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(-4, 10.2, 8, 0.4); }
      // 긴 머리(등 위로)
      if (r.long) { g.beginPath(); g.moveTo(-4.4, 5); g.bezierCurveTo(-5.4, 10, -5.2, 14, -4.2, 17.6); g.lineTo(4.2, 17.6); g.bezierCurveTo(5.2, 14, 5.4, 10, 4.4, 5); g.closePath(); g.fillStyle = hair; g.fill(); g.fillStyle = "rgba(0,0,0,.2)"; g.fill(); }
      // 귀
      g.fillStyle = "#e0b898"; for (const ex of [-4.4, 4.4]) { g.beginPath(); g.ellipse(ex, 5.8, 0.9, 1.4, 0, 0, 6.3); g.fill(); }
      // 머리통
      g.beginPath(); g.ellipse(0, 4.6, 4.5, 5, 0, 0, 6.3); g.moveTo(-3.9, 6.4); g.quadraticCurveTo(-3.4, 9, -1.6, 9.6); g.quadraticCurveTo(0, 10, 1.6, 9.6); g.quadraticCurveTo(3.4, 9, 3.9, 6.4); g.fillStyle = hair; g.fill();
      g.save(); g.clip(); g.lineWidth = 0.22; for (let k = 0; k < 9; k++) { const a = -2.5 + k * 0.32; g.strokeStyle = k % 3 ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.22)"; g.beginPath(); g.moveTo(0, 0.8); g.quadraticCurveTo(Math.cos(a) * 3, 3.4, Math.cos(a) * 4.6, 6 + Math.abs(Math.sin(a)) * 3.6); g.stroke(); } g.restore();
      g.beginPath(); g.ellipse(0, 4.6, 4.5, 5, 0, 0, 6.3);
      q = g.createRadialGradient(-1.2, 2.4, 0.3, 0, 4.6, 5.6); q.addColorStop(0, "rgba(255,255,255,.22)"); q.addColorStop(0.5, "rgba(255,255,255,0)"); q.addColorStop(1, "rgba(0,0,0,.35)"); g.fillStyle = q; g.fill();
      g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 0.7; g.beginPath(); g.ellipse(0, 4.4, 3.3, 2.8, 0, -2.6, -0.5); g.stroke();
      g.strokeStyle = "rgba(255,200,140,.35)"; g.lineWidth = 0.4; g.beginPath(); g.ellipse(0, 4.6, 4.4, 4.9, 0, -0.9, 0.6); g.stroke();
      if (p.party) partyHat(g, 0, 0, p.party);
      g.restore();
    };
    const render = (tt) => {
      // 뒤: 배경 + 움직이는 불빛
      gB.clearRect(0, 0, LW, LH); gB.drawImage(BG, 0, 0, LW, LH);
      const lit = (i, n) => closing ? clamp(1 - offK * 1.4 + (i / n) * 0.9 - 0.4, 0, 1) > 0.5 : true;
      for (const s of stars) { const a = closing ? 0.7 + 0.3 * Math.sin(tt * 2 + s.ph) : 0.25 + 0.25 * Math.sin(tt * 1.5 + s.ph); star4(gB, s.x, s.y, s.b && closing ? 1 : 0.4, "#fff6d0", clamp(a, 0, 1)); }
      // 전구 줄(위)
      gB.strokeStyle = "#1a1020"; gB.lineWidth = 0.35; gB.beginPath();
      for (let x = 0; x <= LW; x += 1) { const y = 1.4 + Math.abs(Math.sin((x / LW) * Math.PI * 2.5)) * 5; x ? gB.lineTo(x, y) : gB.moveTo(x, y); } gB.stroke();
      for (let x = 3, i = 0; x < LW; x += 6, i++) {
        const y = 1.4 + Math.abs(Math.sin((x / LW) * Math.PI * 2.5)) * 5, on = lit(i, LW / 6) && (closing || Math.sin(tt * 3 + i * 1.7) > -0.6), col = ["#ffd166", "#ff8fc8", "#b48cff", "#7fe0c0"][i % 4];
        if (on) glowAt(gB, x, y + 1.8, 3.4, col === "#ffd166" ? "255,209,102" : col === "#ff8fc8" ? "255,143,200" : col === "#b48cff" ? "180,140,255" : "127,224,192", 0.5);
        gB.fillStyle = on ? col : "#2a2030"; gB.beginPath(); gB.ellipse(x, y + 1.6, 0.75, 1.05, 0, 0, 6.3); gB.fill();
        if (on) { gB.fillStyle = "rgba(255,255,255,.7)"; gB.beginPath(); gB.arc(x - 0.25, y + 1.2, 0.25, 0, 6.3); gB.fill(); }
      }
      // 천막 끝 전구
      for (let x = 3.5, i = 0; x < LW - 1; x += 7, i++) { const on = lit(i, LW / 7) && Math.sin(tt * 4 + i) > -0.7; if (on) glowAt(gB, x, 38.6, 3, "255,233,160", 0.55); gB.fillStyle = on ? "#fff3c0" : "#3a3040"; gB.beginPath(); gB.arc(x, 38.6, 0.7, 0, 6.3); gB.fill(); }
      // 쌓인 눈(지붕 위)
      if (snowAcc > 0) { gB.fillStyle = "#eef4ff"; rr(gB, 0, 24.8, LW * snowAcc, 1.4, 0.7); gB.fill(); for (let x = 2; x < LW * snowAcc; x += 5) { gB.beginPath(); gB.arc(x, 25, 0.9, 0, 6.3); gB.fill(); } }
      if (shoot) { const p = shoot.t / 0.9; if (p < 1) { const x = shoot.x - p * 40, y = shoot.y + p * 14, q = gB.createLinearGradient(x, y, x + 16, y - 5.6); q.addColorStop(0, `rgba(255,255,255,${1 - p})`); q.addColorStop(1, "rgba(255,255,255,0)"); gB.strokeStyle = q; gB.lineWidth = 0.6; gB.lineCap = "round"; gB.beginPath(); gB.moveTo(x, y); gB.lineTo(x + 16, y - 5.6); gB.stroke(); star4(gB, x, y, 1.2, "#fff", 1 - p); } }
      if (closing) { gB.fillStyle = `rgba(6,2,16,${(0.35 * clamp(offK, 0, 1)).toFixed(3)})`; gB.fillRect(0, 26, LW, LH - 26); }

      // 앞: 탁자·카드·손님·줄·효과
      const g = gF; g.clearRect(0, 0, LW, LH); g.drawImage(TB, 0, 0, LW, LH);
      // 촛불
      { const fl = Math.sin(tt * 17) * 0.5 + Math.sin(tt * 7.3) * 0.5, fx = LW - 6.5, fy = TT - 8.4;
        if (!closing || offK < 0.8) { glowAt(g, fx, fy, 11, "255,176,74", 0.22 + 0.05 * fl); g.beginPath(); g.moveTo(fx, fy - 2.6 - fl * 0.4); g.bezierCurveTo(fx + 1.3, fy - 0.6, fx + 1, fy + 1.2, fx, fy + 1.2); g.bezierCurveTo(fx - 1, fy + 1.2, fx - 1.3, fy - 0.6, fx, fy - 2.6 - fl * 0.4); const q = g.createRadialGradient(fx, fy + 0.4, 0.1, fx, fy - 0.4, 2.4); q.addColorStop(0, "#fffbe0"); q.addColorStop(0.45, "#ffd84a"); q.addColorStop(1, "#ff7a20"); g.fillStyle = q; g.fill(); } }
      // 팁 통 동전
      for (let k = 0; k < Math.min(jarN, 30); k++) { const x = JARX + 2 + (k * 3) % 8 + 0.6, y = TT - 0.8 - Math.floor(k / 3) * 0.9; g.fillStyle = k % 2 ? "#ffd84a" : "#e0a030"; g.beginPath(); g.ellipse(x, y, 1.2, 0.55, 0, 0, 6.3); g.fill(); }
      // 찻잔
      { const lift = sipT > 0 ? Math.sin(Math.PI * clamp(1 - sipT, 0, 1)) * 5 : 0, x = TEAX + 3.5, y = TT - 1.6 - lift;
        if (!(sipT > 0.15 && sipT < 0.85)) {
          g.beginPath(); g.moveTo(x - 3.4, y - 1.6); g.lineTo(x + 3.4, y - 1.6); g.quadraticCurveTo(x + 3.2, y + 2.8, x, y + 3); g.quadraticCurveTo(x - 3.2, y + 2.8, x - 3.4, y - 1.6); const q = g.createLinearGradient(x - 3, 0, x + 3, 0); q.addColorStop(0, "#fffaf0"); q.addColorStop(1, "#d8c8b8"); g.fillStyle = q; g.fill();
          g.strokeStyle = "#e8d8c8"; g.lineWidth = 0.6; g.beginPath(); g.arc(x + 3.6, y + 0.2, 1.2, -1.3, 1.3); g.stroke();
          g.fillStyle = "#c9783a"; g.beginPath(); g.ellipse(x, y - 1.6, 3.4, 0.7, 0, 0, 6.3); g.fill();
        }
        if (teaCD <= 0 && !closing) for (let k = 0; k < 2; k++) { const t = (tt * 0.7 + k * 0.5) % 1; g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - t)})`; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x - 1 + k * 2, y - 2.4 - t * 4); g.quadraticCurveTo(x + k * 2, y - 3.6 - t * 4, x - 1 + k * 2, y - 4.8 - t * 4); g.stroke(); } }
      // 의자·앉은 손님(뒷모습)
      for (let i = 0; i < 3; i++) {
        const u = seats[i], sx = SX[i];
        const hl = drag && freeFor(drag.u, i) && !(rh() && drag.u.kind === "drunk"), hov = drag && hoverSeat(drag.x, drag.y) === i;
        if (hl) { g.globalAlpha = hov ? 0.9 : 0.35 + 0.25 * Math.sin(tt * 8); glowAt(g, sx, FL + 7, 12, hov ? "127,224,168" : "255,233,160", 0.8); g.globalAlpha = 1; }
        // 의자(둥근 방석 + 다리)
        g.strokeStyle = "#5a3a22"; g.lineWidth = 0.9; g.lineCap = "round"; g.beginPath(); g.moveTo(sx - 4.4, FL + 4.4); g.lineTo(sx - 5.4, FL + 13.4); g.moveTo(sx + 4.4, FL + 4.4); g.lineTo(sx + 5.4, FL + 13.4); g.moveTo(sx, FL + 4.6); g.lineTo(sx, FL + 13); g.stroke();
        g.lineWidth = 0.5; g.beginPath(); g.moveTo(sx - 5, FL + 9.6); g.lineTo(sx + 5, FL + 9.6); g.stroke();
        g.fillStyle = "#7a2a3a"; g.beginPath(); g.ellipse(sx, FL + 4, 6.4, 1.8, 0, 0, 6.3); g.fill();
        let q = g.createLinearGradient(0, FL + 1.6, 0, FL + 4); q.addColorStop(0, "#ff9ab0"); q.addColorStop(1, "#c94f6a"); g.fillStyle = q; g.beginPath(); g.ellipse(sx, FL + 3, 6.2, 1.7, 0, 0, 6.3); g.fill();
        if (hl && !seats[i]) { const k = Math.sin(tt * 8) * 0.8; g.fillStyle = "#7fe0a8"; g.beginPath(); g.moveTo(sx - 1.6, FL - 5 + k); g.lineTo(sx + 1.6, FL - 5 + k); g.lineTo(sx, FL - 3 + k); g.closePath(); g.fill(); }
        if (u) {
          const j = u.seats.indexOf(i), p = u.ppl[j] || u.ppl[0];
          const bob = u.phase === "drunk" ? Math.sin(tt * 9) : u.phase === "done" && u.mood === "happy" ? -Math.abs(Math.sin(tt * 10)) : 0;
          const sitDrop = u.phase === "sit" ? (1 - clamp(u.t / 0.25, 0, 1)) * -6 : 0;
          drawBack(g, p, sx + (u.phase === "drunk" ? Math.sin(tt * 4) * 0.8 : 0), SEATY + sitDrop + bob);
        }
      }
      // 탁자 위 카드(손님 머리 위로 보이게 세워 펼침)
      for (const u of new Set(seats)) {
        if (!u || (u.phase !== "read" && u.phase !== "done")) continue;
        const n = u.cards.length, mx = seatX(u);
        for (let j = 0; j < n; j++) miniCard(g, mx - (n * 6 - 1) / 2 + j * 6, TT - 6.4, j < u.flips, u.cards[j]);
      }
      // 커플 하트, 상담 진행 막대, 감정
      for (const u of new Set(seats)) {
        if (!u) continue; const mx = seatX(u);
        if (u.n === 2 && u.phase !== "done") heartV(g, mx, SEATY + 4 + Math.sin(tt * 4) * 1.2, 4, "#ff6fa0");
        if (u.phase === "read") {
          const w = u.n === 2 ? 30 : 18, x = mx - w / 2, y = STY + 2;
          rr(g, x - 0.6, y - 0.6, w + 1.2, 3, 1.5); g.fillStyle = "rgba(10,6,20,.85)"; g.fill();
          const pw = w * clamp(u.prog, 0, 1); if (pw > 0.5) { rr(g, x, y, pw, 1.8, 0.9); const q = g.createLinearGradient(0, y, 0, y + 1.8); q.addColorStop(0, mental <= 0 ? "#ff9aa4" : "#fff3b0"); q.addColorStop(1, mental <= 0 ? "#ff5a6a" : "#ffb020"); g.fillStyle = q; g.fill(); }
          if (mental <= 0 && Math.floor(tt * 3) % 2) { g.fillStyle = "#fff"; for (const d of [-3, 0, 3]) { g.beginPath(); g.arc(mx + d, SEATY + 2, 0.9, 0, 6.3); g.fill(); } }
        }
        if (u.phase === "choose" || u.phase === "sit") drawBubble(g, mx, SEATY - 1, u, tt);
        if (u.phase === "done" && u.mood === "sad") { const y = SEATY - 2; g.fillStyle = "#8890b0"; for (const [dx, r] of [[-2, 1.8], [0.4, 2.3], [2.6, 1.6]]) { g.beginPath(); g.arc(mx + dx, y, r, 0, 6.3); g.fill(); } const d = (tt * 2) % 1; g.fillStyle = "#7fc8ff"; for (const dx of [-2, 1.4]) { g.beginPath(); g.ellipse(mx + dx, y + 2.6 + d * 3, 0.35, 0.6, 0, 0, 6.3); g.fill(); } }
        if (u.phase === "drunk") for (let k = 0; k < 3; k++) { const a = tt * 4 + k * 2.1; star4(g, mx + Math.cos(a) * 6, SEATY + 1 + Math.sin(a) * 2, 1, "#ffe066"); }
      }
      // 떠나는 사람들
      for (const l of leavers) {
        const y = l.feet + (l.mood === "drunk" ? Math.sin(l.t * 6) : 0), x = l.x + (l.mood === "drunk" ? Math.sin(l.t * 3) * 2 : 0);
        const top = drawFront(g, l.p, x, y, { ex: MOODX[l.mood] || "neutral", flip: l.dir < 0, bob: -Math.abs(Math.sin(l.t * 8)) * 0.9, rot: Math.sin(l.t * 8) * 0.04, view: "s", f: Math.floor(l.t * 8) % 4 });
        if (l.mood === "mad" && Math.floor(l.t * 4) % 2) { g.strokeStyle = "#ff4f5e"; g.lineWidth = 0.6; g.lineCap = "round"; const vx = x + 3.4 * l.dir, vy = top + 2; g.beginPath(); g.moveTo(vx - 1, vy - 1); g.quadraticCurveTo(vx, vy, vx + 1, vy - 1); g.moveTo(vx - 1, vy + 1); g.quadraticCurveTo(vx, vy, vx + 1, vy + 1); g.stroke(); }
        if (l.mood === "happy" && Math.floor(l.t * 5) % 2) star4(g, x - 1, top - 2, 1.4, "#ffe066");
      }
      // 줄 선 손님
      if (drag) { const hot = drag.x < 14 && drag.y > STY; g.globalAlpha = hot ? 0.45 : 0.18 + 0.08 * Math.sin(tt * 8); const q = g.createLinearGradient(0, 0, 14, 0); q.addColorStop(0, "#c0283c"); q.addColorStop(1, "rgba(192,40,60,0)"); g.fillStyle = q; g.fillRect(0, qF - 46, 14, 48); g.globalAlpha = 1; }
      for (const u of queue) {
        if (u.state === "drag") continue;
        const walking = Math.abs(u.tx - u.x) > 0.5, anx = !rh() && u.kind !== "drunk" && u.pat / u.patMax < 0.3;
        let top = qF - PH;
        for (let j = u.n - 1; j >= 0; j--) {
          const px = u.x - j * QS + (u.kind === "drunk" ? Math.sin(u.t * 2.5) * 1.5 : 0);
          const ex = u.kind === "drunk" ? "blush" : anx ? "angry" : u.pat / u.patMax < 0.55 && !rh() ? "sad" : walking ? "smile" : "neutral";
          const bob = walking ? -Math.abs(Math.sin(u.t * 8 + j)) * 0.9 : anx ? Math.sin(u.t * 14) * 0.25 : 0;
          top = drawFront(g, u.ppl[j], px, qF, { ex, bob, rot: walking ? Math.sin(u.t * 8 + j) * 0.035 : u.kind === "drunk" ? Math.sin(u.t * 2.5) * 0.08 : 0, view: "s", f: walking ? Math.floor(u.t * 8 + j) % 4 : 0 });
          if (anx && Math.floor(u.t * 3) % 2) dropV(g, px + 3.6, top + 3.4, 1.1);
          if (snow && !walking) { g.fillStyle = "#f4f8ff"; g.beginPath(); g.ellipse(px, top + 0.5, 2.6, 0.8, 0, 0, 6.3); g.fill(); }
        }
        if (u.n === 2) heartV(g, u.x - QS / 2, qF - 19 + Math.sin(u.t * 4) * 0.6, 3.4, "#ff8fb0");
        if (u.gid) { g.fillStyle = "#ffd84a"; g.beginPath(); g.arc(u.x, qF + 1.2, 0.8, 0, 6.3); g.fill(); }
        const bx = u.n === 2 ? u.x - QS + 2 : u.x + 2;
        drawBubble(g, bx, top - 0.6 + (u.ppl[0].party ? -4 : 0), u, tt);
        if (u.kind === "drunk" && u.hic < 0.35) { g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(u.x + 6, top - 8, 0.6, 0, 6.3); g.arc(u.x + 8, top - 10, 1, 0, 6.3); g.fill(); }
      }
      // 끄는 손님(들림·그림자)
      if (drag) {
        const u = drag.u, x = drag.x, feet = drag.y + 16;
        const gy = drag.y < STY ? FL + 12 : Math.min(qF, feet + 8);
        g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(x, gy, 6 + (u.n - 1) * 6, 1.3, 0, 0, 6.3); g.fill();
        let top = feet - PH;
        for (let j = 0; j < u.n; j++) top = drawFront(g, u.ppl[j], x + (u.n === 2 ? (j ? 7 : -7) : 0), feet, { ex: u.kind === "drunk" ? "blush" : "surprised", rot: Math.sin(tt * 6) * 0.05, noShadow: 1, view: "f", f: Math.floor(tt * 8) % 2 ? 1 : 3 });
        drawBubble(g, x, top - 0.6, u, tt);
      }
      // 동전·반짝이·하트·김
      for (const c of coins) { if (c.t < 0 || c.t > 0.62) continue; const p = c.t / 0.6, x = c.x0 + (c.x1 - c.x0) * p, y = c.y0 + (c.y1 - c.y0) * p - Math.sin(Math.PI * p) * 16, w = Math.abs(Math.cos(c.t * 14)) * 1.3 + 0.2; const q = g.createLinearGradient(x - 1.4, y - 1.4, x + 1.4, y + 1.4); q.addColorStop(0, "#fff3b0"); q.addColorStop(0.5, "#ffd84a"); q.addColorStop(1, "#b07a10"); g.fillStyle = q; g.beginPath(); g.ellipse(x, y, w, 1.4, 0, 0, 6.3); g.fill(); }
      for (const s of sparks) { const p = s.t / s.life, a = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7; star4(g, s.x, s.y, p < 0.5 ? 1.4 : 0.8, s.c, clamp(a, 0, 1)); }
      for (const h of hearts) { if (h.d > 0) continue; g.globalAlpha = clamp(1.4 - h.t, 0, 1); heartV(g, h.x, h.y, 3.4, "#ff4f7b"); g.globalAlpha = 1; }
      for (const p of puffs) { if (p.t < 0) continue; g.globalAlpha = (1 - p.t) * 0.7; g.fillStyle = "#ffffff"; g.beginPath(); g.arc(p.x + (p.steam ? Math.sin(p.t * 9) * 2 : -p.t * 6), p.y - p.t * 10, 0.8 + p.t * 1.6, 0, 6.3); g.fill(); }
      g.globalAlpha = 1;
      // 눈
      if (snowAcc > 0) { g.fillStyle = "rgba(238,244,255,.9)"; const n = Math.round(groundSnow.length * snowAcc); for (let i = 0; i < n; i++) { const [x, y, w] = groundSnow[i]; g.beginPath(); g.ellipse(x, y, w, 0.45, 0, 0, 6.3); g.fill(); } rr(g, 3, TT - 0.8, (LW - 6) * snowAcc * 0.5, 0.9, 0.45); g.fill(); }
      for (const f of flakes) { g.fillStyle = f.s > 1 ? "#ffffff" : "rgba(223,232,255,.9)"; g.beginPath(); g.arc(f.x, f.y, f.s * 0.45, 0, 6.3); g.fill(); }
      if (closing) { g.fillStyle = `rgba(6,2,16,${(0.3 * clamp(offK, 0, 1)).toFixed(3)})`; g.fillRect(0, 0, LW, LH); }
    };


    // ── 리허설 진행 ──
    const tutStep = () => {
      if (tut === 0 && !R.A) R.A = mkUnit("one", { heavy: false, ico: "star" });
      if (tut === 0 && R.A.state === "queue") tut = 1;
      if (tut === 1 && R.A.state === "seat") tut = 2;
      if (tut === 2 && R.A.phase === "read" && !R.B) R.B = mkUnit("one", { heavy: true, ico: "brief" });
      if (tut === 2 && R.B && R.B.state === "queue" && R.A.phase !== "choose") tut = 3;
      if (tut === 3 && R.B.phase === "read") { tut = 4; mental = 22; menUpd(true); setMe("sad", 1.2); say(cx, 52, "휴…", ""); tone(300, 0.3, "sine", 0.07, -120); }
      if (tut === 51 && !seats.some((u) => u) && !leavers.some((l) => l.kind === "drunk" && l.x > 0)) { tut = 6; setTB(`<button class="tq-go" data-go>축제 시작!</button>`, "go"); }
      if (tut === 41 && R.C && R.C.state === "queue") tut = 5;
      const tag = "<em>리허설</em>";
      const T = {
        0: `${tag}연말 야시장이 열렸어요! 손님이 줄을 서요…`,
        1: `${tag}줄 선 손님을 <b>끌어서</b> 빈 의자에 앉혀요!`,
        2: R.A && R.A.phase === "choose" ? `${tag}<b class="lt">밝은 말풍선</b>은 가벼운 고민 → <b>빠른 1장</b>을 톡!` : `${tag}카드를 펼치는 중…`,
        3: R.B && R.B.state === "seat" ? `${tag}<b class="dk">어두운 말풍선</b>은 무거운 고민 → <b>3장 스프레드</b>!` : `${tag}<b class="dk">어두운 말풍선</b> 손님도 끌어서 앉혀요`,
        4: `${tag}상담할수록 <b>멘탈</b>이 닳아요. 바닥나면 상담이 멈춰요!<br><b>따뜻한 차</b>를 톡!`,
        41: `${tag}멘탈 충전 완료! 어, 저 손님은…?`,
        5: `${tag}술 취한 손님은 <b class="rd">왼쪽으로 쭉 밀어서</b> 정중히 돌려보내요`,
        51: `${tag}잘했어요! 상담을 마무리하는 중…`,
        6: `${tag}완벽해요! 손 잡은 <b>커플</b>은 나란히 두 자리에, <b>눈이 오면</b> 다들 금방 지쳐요`,
      };
      setTask(T[tut] || "");
      if (tut >= 0 && tut <= 51 && !tbEl.innerHTML) setTB(SKIP, "sk");
    };
    const mainTask = () => {
      const dr = queue.find((u) => u.kind === "drunk"), cp = queue.find((u) => u.n === 2);
      let h;
      if (timeUp) h = "축제 끝! 마지막 상담을 마무리해요";
      else if (mental <= 0) h = `<b class="rd">멘탈 바닥!</b> 상담이 멈췄어요. <b>차 한 잔</b> 먼저!`;
      else if (mental < 28) h = `멘탈이 얼마 안 남았어요. <b>따뜻한 차</b>를 톡!`;
      else if (dr) h = `술 취한 손님은 <b class="rd">왼쪽으로 밀어</b> 돌려보내요`;
      else if (cp) h = `손 잡은 <b>커플</b>은 <b>나란히 빈 두 자리</b>에!`;
      else if (snow && el < 19) h = `눈이 와요! 손님들이 <b class="rd">빨리 지쳐요</b>`;
      else h = `끌어서 앉히고 · <b class="lt">밝은 말풍선 1장</b> / <b class="dk">어두운 말풍선 3장</b>`;
      setTask(h);
    };
    const hint = () => {
      if (closing || timeUp || drag) { handAt(null); return; }
      const qp = (u) => [unitPos(u)[0] * K, (qF - 18) * K];
      if (rh()) {
        if (tut === 1 && R.A.state === "queue") return handAt(qp(R.A), "drag", [SX[1] * K, (FL + 2) * K]);
        if (tut === 2 && R.A.pop) return handAt(R.A.pop.querySelector('[data-k="1"]'), "tap");
        if (tut === 3) { if (R.B.state === "queue") { const i = seats.findIndex((s) => !s); return handAt(qp(R.B), "drag", [SX[Math.max(0, i)] * K, (FL + 2) * K]); } if (R.B.pop) return handAt(R.B.pop.querySelector('[data-k="3"]'), "tap"); }
        if (tut === 4) return handAt(teaBtn, "tap");
        if (tut === 5 && R.C.state === "queue") return handAt(qp(R.C), "drag", [2 * K, (qF - 18) * K]);
        return handAt(null);
      }
      if (mental < 28 && teaCD <= 0) return handAt(teaBtn, "tap");
      const dr = queue.find((u) => u.kind === "drunk" && u.state === "queue");
      if (dr && dr.qT > 1.2 && (drunkOut === 0 || idleT > 2)) return handAt(qp(dr), "drag", [2 * K, (qF - 18) * K]);
      const pu = [...new Set(seats)].find((u) => u && u.pop && u.popT > (firstPop ? 1.2 : 3));
      if (pu) return handAt(pu.pop.querySelector(`[data-k="${pu.heavy ? 3 : 1}"]`), "tap");
      if (idleT > (el < 8 ? 1.2 : 3)) {
        for (const u of queue) { if (u.kind === "drunk" || u.state !== "queue") continue; for (let i = 0; i < 3; i++) if (freeFor(u, i)) return handAt(qp(u), "drag", [SX[i] * K, (FL + 2) * K]); }
      }
      handAt(null);
    };

    // ── 한 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) { last = now; now0 = now; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const tt = (now - now0) / 1000;
      if (!started && !opts.retry) tutStep();
      if (!started && opts.retry && tt > 0.3) startGame();
      if (started && !timeUp) { el += dt; spawnMain(dt); }
      idleT += dt;
      // 줄 자리 정리
      let s = 0; for (const u of queue) { u.tx = slotX(s + u.n - 1) + (u.n - 1) * QS; s += u.n; }
      let drunkIn = false;
      for (const u of queue.slice()) {
        u.t += dt; if (u.state === "drag") continue;
        if (u.x < u.tx) { u.x = Math.min(u.tx, u.x + dt * 42); u.state = u.x >= u.tx ? "queue" : "walk"; } else if (u.x > u.tx) { u.x = Math.max(u.tx, u.x - dt * 42); u.state = u.x <= u.tx ? "queue" : "walk"; } else u.state = "queue";
        if (u.kind === "drunk") { drunkIn = true; if (u.state === "queue") u.qT += dt; u.hic -= dt; if (u.hic < 0) { u.hic = 1.3 + rnd(); tone(520, 0.05, "square", 0.04, 300); if (!rh() && rnd() < 0.5) say(u.x, qF - 38, "딸꾹!", "dr"); } }
      }
      if (started && !timeUp) {
        for (const u of queue.slice()) {
          if (u.kind === "drunk" || u.state === "drag") continue;
          u.pat -= dt * (snow ? 1.5 : 1) * (drunkIn ? 1.35 : 1);
          if (u.pat <= 0) leaveAngry(u);
        }
      }
      // 앉은 손님
      for (const u of new Set(seats)) {
        if (!u) continue; u.t += dt;
        if (u.phase === "sit" && u.t > 0.25) { u.phase = "choose"; openPop(u); tone(1320, 0.06, "triangle", 0.05); }
        else if (u.phase === "choose") u.popT += dt;
        else if (u.phase === "read") {
          let sp = 1; if (timeUp) sp = 3; else if (mental <= 0) sp = 0; else if (mental < 25) { sp = 0.6; u.low = true; }
          if (sp > 0) { const d = dt * sp / u.dur; u.prog += d; if (!timeUp) mental = Math.max(0, mental - u.cost * d * (rh() && tut === 4 ? 0 : 1)); }
          const th = u.cards.length === 1 ? [0.45] : [0.22, 0.5, 0.78];
          while (u.flips < th.length && u.prog >= th[u.flips]) { u.flips++; noise(0.05, 3200, 0.06, 0, 2); tone(1046 + u.flips * 200, 0.08, "triangle", 0.06); const mx = seatX(u); sparkle(mx - 6 + u.flips * 3, TT + 2, 3); }
          if (u.prog >= 1) finishRead(u);
        } else if (u.phase === "done" && u.t > 1.0) standUp(u);
        else if (u.phase === "drunk") { mental = Math.max(0, mental - dt * 7); for (const q of queue) if (q.kind !== "drunk") q.pat -= dt * 0.8; if (u.t > 2.6) { u.mood = "drunk"; standUp(u); } }
      }
      // 멘탈·차
      if (teaCD > 0) teaCD = Math.max(0, teaCD - dt);
      if (sipT > 0) sipT = Math.max(0, sipT - dt * 1.2);
      if (started && !timeUp) { if (mental <= 0) zeroTime += dt; else if (mental < 25) lowTime += dt; }
      menUpd();
      if (meT > 0) { meT -= dt; if (meT <= 0) setMe(mental < 25 && !closing ? "sad" : "neutral"); } else if (!closing) setMe(mental < 25 ? "sad" : "neutral");
      // 끌기 중 돌려보내기 칸
      if (drag) { const hot = drag.x < 14 && drag.y > STY; const cn = "tq-out on" + (hot ? " hot" : ""); if (outEl.className !== cn) outEl.className = cn; }
      // 떠나는 사람·효과
      for (let i = leavers.length - 1; i >= 0; i--) { const l = leavers[i]; l.t += dt; l.x += l.dir * l.sp * dt; if (l.x < -14 || l.x > LW + 14) leavers.splice(i, 1); }
      for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.t += dt; if (c.t >= 0.6 && !c.in) { c.in = 1; jarN++; tone(1900 + rnd() * 400, 0.05, "square", 0.05); tone(2600, 0.06, "triangle", 0.05, 0, 0.03); } if (c.t > 0.7) coins.splice(i, 1); }
      for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.t += dt; p.y -= dt * 6; if (p.t > p.life) sparks.splice(i, 1); }
      for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.d > 0) { h.d -= dt; continue; } h.t += dt; h.y += h.vy * dt; h.x += Math.sin(h.t * 6 + i) * 0.15; if (h.t > 1.4) hearts.splice(i, 1); }
      for (let i = puffs.length - 1; i >= 0; i--) { puffs[i].t += dt * 1.4; if (puffs[i].t > 1) puffs.splice(i, 1); }
      if (snow || closing && snowAcc > 0) { snowAcc = Math.min(1, snowAcc + dt / 14); if (rnd() < dt * 26) flakes.push({ x: rnd() * (LW + 20) - 10, y: -2, vy: 9 + rnd() * 8, vx: -2 + rnd() * 3, s: rnd() < 0.25 ? 2 : 1, ph: rnd() * 6 }); }
      for (let i = flakes.length - 1; i >= 0; i--) { const f = flakes[i]; f.y += f.vy * dt; f.x += (f.vx + Math.sin(tt * 2 + f.ph) * 3) * dt; if (f.y > LH) flakes.splice(i, 1); }
      if (closing) { endT += dt; offK = clamp(endT / 1.8, 0, 1); if (!shoot || shoot.t > 1.3) { shoot = { x: 40 + rnd() * (LW - 30), y: 2 + rnd() * 8, t: 0 }; if (endT > 0.8) tone(2400, 0.3, "sine", 0.03, 800); } shoot.t += dt; }
      // 안내
      if (!closing) { if (rh()) {} else mainTask(); hint(); }
      render(tt);
      raf = requestAnimationFrame(loop);
    };

    if (dbg) {
      const seated = () => [...new Set(seats)].filter(Boolean);
      dbg.tarot3 = {
        st: () => ({ tut, started, el: +el.toFixed(1), q: queue.map((u) => u.kind[0] + (u.heavy ? "H" : "L") + Math.round(u.pat)), seats: seats.map((u) => (u ? u.phase : "-")), mental: Math.round(mental), money, served, lost, passed, readings, matchOk, drunkOut, drunkSeat, coupleOk, zeroTime: +zeroTime.toFixed(1), timeUp, closing, done, art, left: tm ? +tm.left().toFixed(1) : null }),
        tut: () => (tut < 0 ? -1 : tut),
        tutDo: () => {
          if (tut === 1 && R.A.state === "queue") seatUnit(R.A, 1);
          else if (tut === 2 && R.A.phase === "choose") choose(R.A, 1);
          else if (tut === 3) { if (R.B.state === "queue") seatUnit(R.B, seats.findIndex((s) => !s)); else if (R.B.phase === "choose") choose(R.B, 3); }
          else if (tut === 4) drinkTea();
          else if (tut === 5 && R.C.state === "queue") pushUnit(R.C);
          else if (tut === 6) startGame();
        },
        start: startGame,
        auto: (bad) => {
          if (!started || closing || timeUp) return;
          if (bad) {
            const ch = seated().find((u) => u.phase === "choose"); if (ch) return choose(ch, rnd() < 0.5 ? 1 : 3);
            if (rnd() < 0.55) return;
            const u = queue.find((q) => q.state === "queue"); if (u) for (let i = 0; i < 3; i++) if (freeFor(u, i)) return seatUnit(u, i);
            return;
          }
          if (mental < 40 && teaCD <= 0) return drinkTea();
          const d = queue.find((u) => u.kind === "drunk" && u.x > 10); if (d) return pushUnit(d);
          const ch = seated().find((u) => u.phase === "choose"); if (ch) return choose(ch, ch.heavy ? 3 : 1);
          const c = queue.filter((u) => u.kind !== "drunk" && u.x > 4).sort((a, b) => a.pat - b.pat);
          for (const u of c) for (let i = 0; i < 3; i++) if (freeFor(u, i)) return seatUnit(u, i);
        },
      };
    }
    scUpd(); menUpd(); setTask(opts.retry ? "축제 준비 중…" : "<em>리허설</em>부스를 여는 중…"); render(0);
    raf = requestAnimationFrame(loop);
  },
};
