// 바이브코딩 1탄: 이게 되네? (일러스트판: 논리 160xH 좌표를 기기 해상도 캔버스에 벡터로 그린다)
// 의뢰인은 캐릭터 그림(표정 시트: 반가움=웃음, 수정 요청=슬픔, 함정=놀람, 반만 줄게=팔짱), 가게는 실제 배경 그림.
// 칩 아이콘·손가락·동전·기기·코디·노트북은 벡터. 그림을 못 불러올 때만 도트 사람으로 대체.
// 퇴근 후 외주. 의뢰인(도트 사람)이 가게에서 두루뭉술하게 말한다. 아래 '프롬프트 칩'(기능·색·화면·조건)을
// 끌어서(톡도 됨) 프롬프트 창에 조립하고 [실행] → 코딩 AI '코디'가 타자 치고, 오른쪽 미리보기에 도트 앱이 생긴다.
// 조립한 칩대로 앱이 바뀌고(색·기능·기기·로그인 벽·글씨 크기), 의뢰인이 만족하거나 수정을 요청한다. 의뢰 3건.
// 마지막: 내 폰에 입금 알림이 줄줄이, 의뢰인 "와, 이게 하룻밤에?"
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, SCN = 112, PBY = 113, TRY = 176, BASE_T = 46;
let H = 280;
// 칩 종류: f 기능, c 색, s 화면, x 조건, t 함정(모호한 말)
const FEAT = { rsv: "예약 버튼", gal: "사진 갤러리", att: "출석 체크", tbl: "표 자동 정리", menu: "메뉴·주문" };
// 색: [배경, 주색, 강조, 글자]
const COL = {
  cream: { n: "크림·갈색", c: ["#fff4e0", "#a8683a", "#e8a25a", "#5a3a22"] },
  pink: { n: "분홍·연두", c: ["#fff0f6", "#ff7eb0", "#8fd46a", "#7a2a4a"] },
  neon: { n: "검정·형광", c: ["#17171e", "#2c2c38", "#c8ff3a", "#d8d8e4"] },
  blue: { n: "파랑·흰색", c: ["#f4f8ff", "#2f6fd8", "#5fb8ff", "#1a2a4a"] },
  red: { n: "빨강·노랑", c: ["#fff8e0", "#e0382a", "#ffc83a", "#4a1a10"] },
  green: { n: "초록·흰색", c: ["#f2fbf4", "#2f9e5a", "#7fdc9c", "#1a3a24"] },
};
const GRAY = ["#e4e4ea", "#9a9aa8", "#b8b8c4", "#6a6a78"];
const SCR = { phone: "폰 화면", tab: "태블릿 화면", pc: "PC 화면" };
const CND = { nolog: "로그인 없이", big: "글씨 크게", noti: "알림 왕창" };
const TRAP = ["대충 알아서", "느낌 있게", "다 넣어 줘", "요즘 스타일로"];
const CATN = { f: "기능", c: "색", s: "화면", x: "조건" };
const chipName = (id) => { const [k, v] = id.split(":"); return k === "f" ? FEAT[v] : k === "c" ? COL[v].n : k === "s" ? SCR[v] : k === "x" ? CND[v] : TRAP[+v]; };

// 의뢰인: 말풍선(두루뭉술), 꼭 필요한 칩, 불만 대사
const CLI = [
  { id: "bak", who: "동네 빵집 사장님", type: "elder", look: { shirt: "#f4f0e8", hat: "#ffffff" }, fee: 30,
    say: "케이크 <b>예약</b> 되는 거요. <b>따뜻~한</b> 빵집 느낌으로! 손님들 다 <b>폰</b>으로 봐요.",
    need: { f: "rsv", c: "cream", s: "phone" }, nf: "예약은 어디서 해요? 버튼이 없네…", nc: "색이 너무 차가워요. 빵집은 따뜻~하게!" },
  { id: "flo", who: "골목 꽃집 사장님", type: "plain", look: { shirt: "#5fa86a", style: "long" }, fee: 25,
    say: "꽃다발 <b>사진</b>이 쭉 보이게요! <b>분홍분홍</b>하게~ 인별그램 보고 <b>폰</b>으로 와요.",
    need: { f: "gal", c: "pink", s: "phone" }, nf: "꽃 사진이 하나도 안 보여요!", nc: "분홍분홍한 느낌이 하나도 없어요ㅠ" },
  { id: "gym", who: "헬스장 관장님", type: "plain", look: { shirt: "#1b1b22", style: "buzz", glasses: false, hat: null }, fee: 40,
    say: "회원 <b>출석</b> 찍는 거! <b>강렬하게</b> 가 주세요. 카운터 <b>태블릿</b>에 세워 둘 거예요.",
    need: { f: "att", c: "neon", s: "tab" }, nf: "출석은 어디서 찍어요?", nc: "너무 순해요. 강렬하게! 불타게!" },
  { id: "ofc", who: "옆 부서 팀장님", type: "worker", look: { shirt: "#e6e6e6" }, fee: 50,
    say: "매주 하는 <b>표 정리</b>, 자동으로 좀… 회사 색 <b>파랑</b>으로요. 사무실 <b>PC</b>에서 써요.",
    need: { f: "tbl", c: "blue", s: "pc" }, nf: "표 정리 기능은요? 그게 핵심인데…", nc: "회사 색은 파랑이에요~" },
  { id: "snk", who: "분식집 사장님", type: "plain", look: { shirt: "#e0382a", hat: "#f4f4f4" }, fee: 35,
    say: "<b>메뉴</b> 보고 <b>폰</b>으로 바로 주문! 떡볶이처럼 <b>빨강노랑</b>. <b>가입</b>하라 하면 다 도망가요.",
    need: { f: "menu", c: "red", s: "phone", x: "nolog" }, nf: "메뉴판이 없잖아요!", nc: "떡볶이 색! 빨강노랑이요!" },
  { id: "phm", who: "약국 약사님", type: "elder", look: { shirt: "#f4f4f8", glasses: true, hat: null }, fee: 30,
    say: "어르신들 상담 <b>예약</b>이요. <b>글씨 크게</b>! 약국은 <b>초록</b>이죠. 다들 <b>폰</b>으로 해요.",
    need: { f: "rsv", c: "green", s: "phone", x: "big" }, nf: "예약 버튼이 안 보여요~", nc: "약국은 초록이에요!" },
];
const PRAC = { id: "caf", who: "단골 카페 사장님", type: "plain", look: { shirt: "#7a4a2a", hat: null }, fee: 0,
  say: "<b>메뉴</b> 보이게 해 주세요. 커피처럼 <b>따뜻한 갈색</b>, <b>폰</b>으로 볼 거예요.",
  need: { f: "menu", c: "cream", s: "phone" }, nf: "메뉴가 없어요!", nc: "커피색, 따뜻한 갈색이요!" };
const SCR_NO = { phone: "손님들은 폰으로 봐요! 화면이 안 맞아요", tab: "카운터 태블릿에 세워 둔다니까요~", pc: "사무실 PC로 쓴다고 했잖아요~" };
const X_NO = { nolog: "가입하라고 하면 손님 다 도망가요!", big: "글씨가 개미만 해요. 크~게요!" };
const HAPPY = ["딱 이거예요!", "오, 제가 생각한 그대로!", "와, 벌써요? 마음에 쏙!", "이거 진짜 쓸게요!"];

const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
const shade = (c, f = 0.75) => { const n = parseInt(c.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const wonS = (man) => (man * 10000).toLocaleString("ko-KR");

const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
const mix = (c, f) => { const n = parseInt(c.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const rrect = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
// 칩 아이콘(SVG 24x24)
const SV = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${b}</svg>`;
const ICN = {
  rsv: SV(`<rect x="2.5" y="4" width="19" height="17.5" rx="3" fill="#fff" stroke="#c9ccd8" stroke-width=".8"/><path d="M2.5 7a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v2.6h-19z" fill="#e8503e"/><rect x="7" y="2" width="1.8" height="4.4" rx=".9" fill="#3a3a46"/><rect x="15.2" y="2" width="1.8" height="4.4" rx=".9" fill="#3a3a46"/><g fill="#b4b9c8"><circle cx="6.5" cy="13" r="1"/><circle cx="10.2" cy="13" r="1"/><circle cx="13.9" cy="13" r="1"/><circle cx="17.6" cy="13" r="1"/><circle cx="6.5" cy="17" r="1"/><circle cx="10.2" cy="17" r="1"/></g><circle cx="15.6" cy="17" r="2.6" fill="#e8503e"/><path d="M14.4 17l.9.9 1.6-1.8" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round"/>`),
  gal: SV(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd6ff"/><stop offset="1" stop-color="#d8f2ff"/></linearGradient></defs><rect x="2.5" y="4" width="19" height="16" rx="2.6" fill="url(#s)" stroke="#fff" stroke-width="1.4"/><circle cx="16.5" cy="8.6" r="2" fill="#ffd166"/><path d="M3.2 18.6l5.6-6.4 4 4.4 2.4-2.4 5.6 4.4V19a.6.6 0 0 1-.6.6H3.8z" fill="#4fae5a"/><path d="M8.8 12.2l4 4.4" stroke="#3a8e46" stroke-width=".6"/>`),
  att: SV(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fe09a"/><stop offset="1" stop-color="#1f9e56"/></linearGradient></defs><rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="url(#g)"/><path d="M7 12.4l3.4 3.4L17.4 8.6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  tbl: SV(`<rect x="2.5" y="3.5" width="19" height="17" rx="2.4" fill="#fff" stroke="#b8c4d8" stroke-width=".8"/><path d="M2.5 6a2.4 2.4 0 0 1 2.4-2.4h14.2A2.4 2.4 0 0 1 21.5 6v2.4h-19z" fill="#2f6fd8"/><path d="M2.5 12.4h19M2.5 16.4h19M8.8 8.4v12M15.2 8.4v12" stroke="#b8c4d8" stroke-width=".9"/><rect x="9.6" y="13.2" width="4.8" height="2.4" rx=".6" fill="#5fb8ff"/>`),
  menu: SV(`<defs><radialGradient id="b" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#ff7a5a"/><stop offset="1" stop-color="#c8281a"/></radialGradient></defs><ellipse cx="11" cy="15.6" rx="8.6" ry="5" fill="#f4f4f4" stroke="#c8c8d4" stroke-width=".8"/><ellipse cx="11" cy="14.6" rx="6" ry="3" fill="url(#b)"/><g fill="#fff4e0"><rect x="7" y="13.4" width="3.4" height="1.4" rx=".7" transform="rotate(-18 8.7 14)"/><rect x="11" y="13" width="3.4" height="1.4" rx=".7" transform="rotate(14 12.7 13.7)"/><rect x="9.6" y="15" width="3.2" height="1.4" rx=".7"/></g><path d="M20 3v8M18.4 3v3.6a1.6 1.6 0 0 0 3.2 0V3" stroke="#c9a050" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M5 7c1.6-1.4.4-2.6 1.8-4M8.4 7c1.6-1.4.4-2.6 1.8-4" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".7"/>`),
  phone: SV(`<rect x="6.5" y="2" width="11" height="20" rx="2.8" fill="#2a2a36"/><rect x="7.7" y="4" width="8.6" height="15" rx="1.2" fill="#8fd0f4"/><path d="M7.7 4h5.2L7.7 11z" fill="#d0f0ff" opacity=".8"/><rect x="10.2" y="20" width="3.6" height=".9" rx=".45" fill="#9a9aa8"/>`),
  tab: SV(`<rect x="1.8" y="4" width="20.4" height="16" rx="2.6" fill="#2a2a36"/><rect x="3.6" y="5.6" width="16.8" height="12.8" rx="1" fill="#8fd0f4"/><path d="M3.6 5.6h7L3.6 12z" fill="#d0f0ff" opacity=".8"/><circle cx="21" cy="12" r=".6" fill="#6a6a78"/>`),
  pc: SV(`<rect x="2" y="3" width="20" height="13.6" rx="1.8" fill="#2a2a36"/><rect x="3.4" y="4.4" width="17.2" height="10.6" rx=".8" fill="#8fd0f4"/><path d="M3.4 4.4h6.4L3.4 10z" fill="#d0f0ff" opacity=".8"/><path d="M10 16.6h4l.8 3.4H9.2z" fill="#7a7a88"/><rect x="6.6" y="19.8" width="10.8" height="1.6" rx=".8" fill="#9a9aa8"/>`),
  nolog: SV(`<path d="M8 10.4V8a4 4 0 0 1 8 0v2.4" stroke="#c8c8d4" stroke-width="2" fill="none"/><rect x="5" y="10.4" width="14" height="10.6" rx="2.2" fill="#f2c14e"/><circle cx="12" cy="15" r="1.6" fill="#7a5a10"/><rect x="11.3" y="15.6" width="1.4" height="3" rx=".7" fill="#7a5a10"/><path d="M3.5 21L20.5 3" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M3.5 21L20.5 3" stroke="#e0382a" stroke-width="2.4" stroke-linecap="round"/>`),
  big: SV(`<rect x="2" y="2" width="20" height="20" rx="4" fill="#fff" stroke="#c8c8d4" stroke-width=".8"/><text x="11" y="18.6" font-size="16" font-weight="900" text-anchor="middle" fill="#22222c" font-family="sans-serif">가</text><path d="M18 9.5V4.5M15.6 6.8L18 4.4l2.4 2.4" stroke="#e0382a" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  noti: SV(`<defs><linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f0b020"/></linearGradient></defs><path d="M12 3.2a6 6 0 0 1 6 6v4.6l1.8 2.8H4.2L6 13.8V9.2a6 6 0 0 1 6-6z" fill="url(#y)" stroke="#b07a10" stroke-width=".7"/><path d="M9.6 18.4a2.4 2.4 0 0 0 4.8 0z" fill="#b07a10"/><circle cx="18.4" cy="5.2" r="3.6" fill="#ff3b3b" stroke="#fff" stroke-width="1"/><text x="18.4" y="7.1" font-size="5" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">9</text>`),
  trap: SV(`<defs><radialGradient id="c" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd0ea"/></radialGradient></defs><path d="M6 19a4.6 4.6 0 0 1 .4-9.2A6.4 6.4 0 0 1 18.6 9a4.8 4.8 0 0 1 .4 9.6z" fill="url(#c)" stroke="#9a9ac4" stroke-width=".8"/><text x="12" y="17.2" font-size="9.5" font-weight="900" text-anchor="middle" fill="#7a5ad0" font-family="sans-serif">?</text>`),
};
const swatchSVG = (a) => SV(`<defs><clipPath id="k"><circle cx="12" cy="12" r="9.4"/></clipPath></defs><g clip-path="url(#k)"><rect width="24" height="24" fill="${a[1]}"/><path d="M24 2L2 24h22z" fill="${a[2]}"/><circle cx="8.5" cy="8.5" r="5" fill="#fff" opacity=".22"/></g><circle cx="12" cy="12" r="9.4" fill="none" stroke="#fff" stroke-width="1.4"/>`);
let ICON_URL = null;
function iconURL(id) {
  if (!ICON_URL) ICON_URL = {};
  if (ICON_URL[id]) return ICON_URL[id];
  const [k, v] = id.split(":");
  return (ICON_URL[id] = svgU(k === "c" ? swatchSVG(COL[v].c) : k === "t" ? ICN.trap : ICN[v]));
}
// 할 일 안내 손가락(벡터). down: 아래를 가리킴
const HAND = `<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`;
function fingerURL(down) { return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${down ? `<g transform="rotate(180 20 20)">${HAND}</g>` : HAND}</svg>`); }
const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="o" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#c9961c"/></radialGradient></defs><circle cx="12" cy="12" r="10.4" fill="url(#o)" stroke="#a87a10" stroke-width="1"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#c9961c" stroke-width=".8"/><text x="12" y="16" font-size="10.5" font-weight="900" text-anchor="middle" fill="#8a5a08" font-family="sans-serif">₩</text></svg>`;

// ── 의뢰인: 캐릭터 그림 + 가게 배경 그림(못 불러오면 도트) ──
function cliSpec(c) { const s = uSpec(c.type); Object.assign(s, c.look || {}); s.pack = null; s.hood = null; s.kid = false; s.shirt2 = shade(s.shirt); return s; }
// 가게마다: 사람 그림, 배경 그림, 배경 가로 초점(0~1)
const SHOP = { bak: ["c095", "cafe", 0.7], flo: ["c029", "alley", 0.5], gym: ["c060", "gym", 0.45], ofc: ["c062", "desk", 0.5], snk: ["c018", "pub", 0.42], phm: ["c043", "pantry", 0.3], caf: ["c014", "ucafe", 0.5] };
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const IMGS = {};
const img = (src) => { if (IMGS[src]) return IMGS[src]; const r = { ok: false, fail: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.onerror = () => (r.fail = true); r.im.src = src; return (IMGS[src] = r); };
// 가게 배경(왼쪽 0~92, 고해상도) + 내 쪽 밤 패널(오른쪽). s: 논리 1칸당 실제 픽셀
function shopBg(id, s) {
  const c = document.createElement("canvas"); c.width = Math.round(W * s); c.height = Math.round(SCN * s); const g = c.getContext("2d"); g.setTransform(s, 0, 0, s, 0, 0);
  const bi = img("img/bg/" + SHOP[id][1] + ".webp");
  const wall = { bak: "#f3e2c4", flo: "#dff2e6", gym: "#272a36", ofc: "#dfe6ee", snk: "#fff1c8", phm: "#f2f8f4", caf: "#5a3a28" }[id];
  g.fillStyle = wall; g.fillRect(0, 0, 92, SCN);
  if (bi.ok) {
    const iw = bi.im.naturalWidth, ih = bi.im.naturalHeight, cw = ih * 92 / SCN, sx = clamp(iw * SHOP[id][2] - cw / 2, 0, iw - cw);
    g.save(); try { g.filter = "blur(0.6px) brightness(0.92) saturate(1.05)"; } catch (e) {}
    g.drawImage(bi.im, sx, 0, cw, ih, -1, -1, 94, SCN + 2); g.restore();
    let gr = g.createLinearGradient(0, 0, 0, SCN); gr.addColorStop(0, "rgba(10,8,20,.35)"); gr.addColorStop(0.35, "rgba(10,8,20,0)"); gr.addColorStop(1, "rgba(10,8,20,.25)"); g.fillStyle = gr; g.fillRect(0, 0, 92, SCN);
    gr = g.createLinearGradient(70, 0, 92, 0); gr.addColorStop(0, "rgba(5,6,15,0)"); gr.addColorStop(1, "rgba(5,6,15,.55)"); g.fillStyle = gr; g.fillRect(70, 0, 22, SCN);
  }
  // 오른쪽: 내 쪽(밤 작업 패널)
  let gr = g.createLinearGradient(0, 0, 0, SCN); gr.addColorStop(0, "#10122a"); gr.addColorStop(1, "#1a1e3c"); g.fillStyle = gr; g.fillRect(92, 0, 68, SCN);
  gr = g.createRadialGradient(127, 52, 2, 127, 52, 50); gr.addColorStop(0, "rgba(124,156,255,.22)"); gr.addColorStop(1, "rgba(124,156,255,0)"); g.fillStyle = gr; g.fillRect(92, 0, 68, SCN);
  g.fillStyle = "rgba(255,255,255,.05)"; for (let y = 3; y < SCN; y += 6) for (let x = 95 + ((y / 6) % 2) * 3; x < W; x += 6) { g.beginPath(); g.arc(x, y, 0.35, 0, 6.3); g.fill(); }
  g.fillStyle = "#06081a"; g.fillRect(91.6, 0, 0.8, SCN); g.fillStyle = "rgba(124,156,255,.35)"; g.fillRect(92.4, 0, 0.4, SCN);
  return c;
}
// 가게 앞 계산대(의뢰인 앞, 벡터)
function shopFront(id, s) {
  const c = document.createElement("canvas"); c.width = Math.round(92 * s); c.height = Math.round(SCN * s); const g = c.getContext("2d"); g.setTransform(s, 0, 0, s, 0, 0);
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const R = (x, y, w, h, r, col) => { rrect(g, x, y, w, h, r); g.fillStyle = col; g.fill(); };
  const [top, face] = { bak: ["#c88a52", "#a8683a"], flo: ["#d8b88a", "#b8946a"], gym: ["#3a3a46", "#1b1b22"], ofc: ["#c4ccd8", "#9aa4b2"], snk: ["#dfe3ea", "#b8bec8"], phm: ["#f4f8f8", "#dfe6e8"], caf: ["#9a6a42", "#6a4428"] }[id];
  // 그림자 + 상판 + 앞판
  let gr = g.createLinearGradient(0, 82, 0, 87); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.3)"); g.fillStyle = gr; g.fillRect(0, 82, 92, 5);
  gr = g.createLinearGradient(0, 86, 0, 89.4); gr.addColorStop(0, mix(top, 1.25)); gr.addColorStop(1, top); g.fillStyle = gr; g.fillRect(0, 86, 92, 3.4);
  P(0, 86, 92, 0.4, mix(top, 1.5));
  gr = g.createLinearGradient(0, 89.4, 0, SCN); gr.addColorStop(0, mix(face, 0.62)); gr.addColorStop(0.12, face); gr.addColorStop(1, mix(face, 0.78)); g.fillStyle = gr; g.fillRect(0, 89.4, 92, SCN - 89.4);
  for (let x = 0; x < 92; x += 12) { P(x, 90, 0.35, SCN - 90, mix(face, 0.8)); P(x + 0.35, 90, 0.25, SCN - 90, mix(face, 1.15)); }
  const glow = (x, y, r, rgb, a) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${rgb},${a})`); q.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); };
  if (id === "bak") { // 케이크 진열장
    gr = g.createLinearGradient(0, 92, 0, 108); gr.addColorStop(0, "rgba(220,240,250,.95)"); gr.addColorStop(1, "rgba(170,200,215,.95)"); R(6, 92, 80, 16, 1.2, "#8aa8b8"); R(6.4, 92.4, 79.2, 15.2, 1, gr);
    for (let k = 0; k < 5; k++) { const x = 10 + k * 15; R(x, 100.2, 9, 5.6, 1, k % 2 ? "#f7b8cc" : "#c07a3a"); R(x, 99.6, 9, 1.6, 0.8, "#fffaf2"); g.fillStyle = "#e0303a"; g.beginPath(); g.arc(x + 4.5, 99, 0.9, 0, 6.3); g.fill(); }
    P(6.4, 92.6, 79.2, 0.5, "rgba(255,255,255,.8)"); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(14, 92.4); g.lineTo(22, 92.4); g.lineTo(16, 107.6); g.lineTo(8, 107.6); g.fill();
  }
  if (id === "flo") { R(64, 76, 22, 10, 1, "#8a5a32"); P(64, 76, 22, 0.6, "#b8885a"); for (let k = 0; k < 9; k++) { const fx = 65.5 + k * 2.4, fy = 73 + (k % 3) * 1.2, col = ["#ff7eb0", "#ffd23f", "#ffffff", "#c77dff"][k % 4]; g.strokeStyle = "#3e8e4a"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(fx, fy + 1); g.lineTo(fx + 0.4, 76); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(fx, fy, 1.15, 0, 6.3); g.fill(); g.fillStyle = "#ffe066"; g.beginPath(); g.arc(fx, fy, 0.4, 0, 6.3); g.fill(); } }
  if (id === "gym") { P(0, 95, 92, 1.4, "#c8ff3a"); glow(46, 96, 30, "200,255,58", 0.18); R(34, 99.6, 24, 7, 1.4, "#c8ff3a"); R(35, 100.6, 22, 5, 1, "#1b1b22"); g.fillStyle = "#c8ff3a"; g.font = "900 3.8px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NO PAIN", 46, 103.2); }
  if (id === "ofc") { R(69, 80, 6.4, 6.2, 1, "#ffffff"); g.strokeStyle = "#fff"; g.lineWidth = 0.6; g.beginPath(); g.arc(75.6, 83, 1.4, -1.4, 1.4); g.stroke(); R(69.8, 80.5, 4.8, 1.2, 0.5, "#7a4a2a"); for (let k = 0; k < 3; k++) { g.save(); g.translate(17, 84 - k * 0.7); g.rotate(-0.06 + k * 0.05); R(-7, -1.6, 14, 3.2, 0.3, k ? "#eef0f6" : "#ffffff"); g.restore(); } }
  if (id === "snk") { R(62, 79, 28, 8, 1.6, "#2a2a30"); R(63, 79.4, 26, 6, 1.2, "#e0382a"); glow(76, 82, 12, "255,120,60", 0.25); g.fillStyle = "#fff4e0"; for (let k = 0; k < 7; k++) { g.save(); g.translate(65.5 + k * 3.3, 81.4 + (k % 2)); g.rotate(k * 0.7); rrect(g, -1.2, -0.5, 2.4, 1, 0.5); g.fill(); g.restore(); } P(63, 79.4, 26, 0.5, "#ff7a5a"); }
  if (id === "phm") { P(0, 96, 92, 2.6, "#2fbf6a"); P(0, 96, 92, 0.5, "#6fe09a"); R(8, 80, 8, 6, 1, "#ffffff"); R(8, 80, 8, 2, 1, "#ff9a9a"); R(9.6, 82.8, 4.8, 0.8, 0.4, "#c8ccd8"); }
  if (id === "caf") { R(4, 67, 18, 19, 1.6, "#c8ccd4"); R(4, 67, 18, 2.2, 1, "#eef0f4"); R(6, 71, 14, 7, 1, "#2a2a30"); g.fillStyle = "#ff5a5a"; g.beginPath(); g.arc(17.4, 72.6, 0.7, 0, 6.3); g.fill(); R(8, 78, 3, 3, 0.6, "#555"); R(15, 78, 3, 3, 0.6, "#555"); R(7.6, 82, 4.4, 3.6, 0.8, "#f4f4f4"); }
  return c;
}

export const GAME = {
  key: "vibe1", base: "vibe", jc: "#7c9cff", n: "이게 되네?", desc: "의뢰인 말을 칩으로 조립해 코딩 AI 코디에게 시켜요",
  how: [
    "처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. 의뢰인이 말풍선으로 원하는 걸 <b>두루뭉술하게</b> 말해요.",
    "아래 <b>프롬프트 칩</b>(기능·색·화면·조건)을 끌어서(톡도 돼요) 위 <b>프롬프트 창</b>에 넣고 <b>실행</b>! 코디가 앱을 만들어 미리보기에 띄워요.",
    "<b>대충 알아서</b> 같은 모호한 칩은 함정이에요. 결과가 다르면 <b>수정 요청</b>이 와요. 빨간 칩을 톡 해서 빼고 다시 실행. 의뢰 3건, 빨리 끝내면 보너스!",
  ],
  steps: () => {
    try {
      const s1 = `<span class="v1-sp1"><span></span><b>예약<em>…?</em></b></span>`;
      const chip = (x, y, id, c) => `<g transform="translate(${x} ${y})"><rect width="28" height="14" rx="4" fill="#262c4e" stroke="#4a56a0" stroke-width=".8"/><rect width="2.4" height="14" rx="1" fill="${c}"/><image href="${iconURL(id)}" x="3.6" y="1.6" width="10.8" height="10.8"/><rect x="16" y="4.6" width="9" height="2" rx="1" fill="#c8d0f0"/><rect x="16" y="8" width="6" height="2" rx="1" fill="#6a74a8"/></g>`;
      const s2 = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#2c3466"/><stop offset="1" stop-color="#11152a"/></radialGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
        <rect x="6" y="7" width="68" height="27" rx="6" fill="#11152a" stroke="#7c9cff" stroke-width="1.2" stroke-dasharray="3 2"/>${chip(9, 13.5, "f:rsv", "#5fb8ff")}${chip(41, 13.5, "c:cream", "#ff7eb0")}
        ${chip(9, 55, "s:phone", "#5fe0c0")}${chip(41, 55, "t:0", "#ffb85a")}<path d="M23 52V40" stroke="#ffd23f" stroke-width="2.6" stroke-linecap="round"/><path d="M18.4 44.4L23 39.4l4.6 5" fill="none" stroke="#ffd23f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
      const c3 = document.createElement("canvas"), k = 3; c3.width = 32 * k; c3.height = 44 * k;
      { const g = c3.getContext("2d"); g.setTransform(k, 0, 0, k, 0, 0); rrect(g, 4, 1, 22, 42, 4); g.fillStyle = "#23263a"; g.fill(); rrect(g, 5.4, 4, 19.2, 35, 1.4); g.save(); g.clip(); drawApp(g, { x: 5.4, y: 4, w: 19.2, h: 35 }, { f: "rsv", col: COL.cream.c, scr: "phone" }, 0); g.restore(); }
      return [[s1, "두루뭉술한 의뢰"], [`<img src="${s2}" alt="">`, "칩으로 조립"], [`<span class="v1-sp3"><img src="${c3.toDataURL()}" alt=""><img src="${svgU(COIN_SVG)}" alt=""></span>`, "코디가 뚝딱"]];
    } catch (e) { return [["", "두루뭉술한 의뢰"], ["", "칩으로 조립"], ["", "코디가 뚝딱"]]; }
  },
  css: `
.mg-v1st{background:#0d1020!important;display:flex;align-items:center;justify-content:center}
.mg-vibe1 .mg-steps i{width:66px;height:66px;display:flex;align-items:center;justify-content:center}
.mg-vibe1 .mg-steps img{width:66px;height:66px;border-radius:12px;box-shadow:0 3px 10px #0006}
.mg-vibe1 .v1-sp1{position:relative;display:block;width:66px;height:66px;border-radius:12px;overflow:hidden;background:url("img/bg/cafe.webp") 70% 40%/cover;box-shadow:0 3px 10px #0006}
.mg-vibe1 .v1-sp1>span{position:absolute;left:12px;top:14px;width:44px;height:57px;background:url("img/body/c095.webp") 50% 0/300% 346.15% no-repeat}
.mg-vibe1 .v1-sp1 b{position:absolute;left:3px;top:3px;background:#fffdf6;color:#2f55c8;font-size:11px;font-weight:900;padding:1px 5px;border-radius:7px;box-shadow:0 1px 3px #0006}
.mg-vibe1 .v1-sp1 b em{font-style:normal;color:#2a2018}
.mg-vibe1 .v1-sp3{position:relative;display:block;width:66px;height:66px;border-radius:12px;background:radial-gradient(circle at 50% 30%,#2c3466,#11152a);box-shadow:0 3px 10px #0006}
.mg-vibe1 .v1-sp3 img{position:absolute;box-shadow:none;border-radius:0}
.mg-vibe1 .v1-sp3 img:first-child{left:11px;top:2px;width:44px;height:61px}
.mg-vibe1 .v1-sp3 img:last-child{right:3px;bottom:4px;width:20px;height:20px;filter:drop-shadow(0 2px 2px #0008)}
.mg-vibe1 .mg-logo b{font-size:26px}
.mg-vibe1 .v1-w{position:relative;flex:0 0 auto}
.mg-vibe1 .v1-w>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.mg-vibe1 .v1-bub{position:absolute;z-index:4;background:#fffdf6;color:#2a2018;border-radius:12px;padding:5px 9px 6px;font-size:12.5px;line-height:1.38;font-weight:600;box-shadow:0 4px 12px #0008;word-break:keep-all;pointer-events:none;transform-origin:30% 100%;opacity:0;transform:scale(.6);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.mg-vibe1 .v1-bub.on{opacity:1;transform:scale(1)}
.mg-vibe1 .v1-bub::after{content:"";position:absolute;left:var(--tx,42%);bottom:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fffdf6}
.mg-vibe1 .v1-bub em{display:block;font-style:normal;font-size:11px;font-weight:900;color:#7c9cff;letter-spacing:-.2px}
.mg-vibe1 .v1-bub b{color:#2f55c8;background:#7c9cff26;border-radius:4px;padding:0 2px}
.mg-vibe1 .v1-bub.ok{background:#eafff2}.mg-vibe1 .v1-bub.ok::after{border-top-color:#eafff2}
.mg-vibe1 .v1-bub.no{background:#fff0ee}.mg-vibe1 .v1-bub.no::after{border-top-color:#fff0ee}
.mg-vibe1 .v1-bub.ok p{color:#1f7a4a;font-weight:800}.mg-vibe1 .v1-bub.no p{color:#c0392b;font-weight:800}
.mg-vibe1 .v1-bub p{margin:0}
.mg-vibe1 .v1-pvl{position:absolute;z-index:3;font-size:11px;font-weight:800;color:#8a94c8;text-align:center;letter-spacing:-.2px;pointer-events:none;white-space:nowrap}
.mg-vibe1 .v1-pvl i{font-style:normal;color:#7c9cff}
.mg-vibe1 .v1-pr{position:absolute;z-index:3;border-radius:10px;background:#11152a;border:2px dashed #3c4680;padding:16px 5px 5px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;transition:border-color .15s,background .15s}
.mg-vibe1 .v1-pr::before{content:"코디에게 시킬 말";position:absolute;left:8px;top:2px;font-size:11px;font-weight:900;color:#7c9cff}
.mg-vibe1 .v1-pr.full{border-style:solid;border-color:#4a56a0}
.mg-vibe1 .v1-pr.hot{border-color:#ffd23f;background:#1a1f3a}
.mg-vibe1 .v1-ph{position:absolute;inset:16px 6px 6px;display:flex;align-items:center;justify-content:center;color:#59629a;font-size:12px;font-weight:700;pointer-events:none;text-align:center}
.mg-vibe1 .v1-chip{position:relative;display:flex;align-items:center;gap:4px;height:32px;padding:0 7px 0 4px;border-radius:9px!important;background:#262c4e!important;border:1px solid #3c4680!important;box-shadow:0 2px 0 #0008;color:#eef0ff!important;font-size:12.5px!important;font-weight:800!important;white-space:nowrap;letter-spacing:-.4px;overflow:hidden;touch-action:none}
.mg-vibe1 .v1-chip img{width:22px;height:22px;flex:0 0 auto;pointer-events:none;filter:drop-shadow(0 1px 1px #0006)}
.mg-vibe1 .v1-chip span{pointer-events:none;overflow:hidden;text-overflow:ellipsis}
.mg-vibe1 .v1-chip::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--kc,#7c9cff)}
.mg-vibe1 .v1-chip.k-f{--kc:#5fb8ff}.mg-vibe1 .v1-chip.k-c{--kc:#ff7eb0}.mg-vibe1 .v1-chip.k-s{--kc:#5fe0c0}.mg-vibe1 .v1-chip.k-x,.mg-vibe1 .v1-chip.k-t{--kc:#ffb85a}
.mg-vibe1 .v1-tg .v1-chip{width:100%;justify-content:flex-start;height:var(--chh,40px);white-space:normal;line-height:1.12;text-align:left;font-size:12.5px!important}
.mg-vibe1 .v1-tg .v1-chip span{word-break:keep-all}
.mg-vibe1 .v1-tg .v1-chip.used{opacity:.22;box-shadow:none;border-style:dashed!important}
.mg-vibe1 .v1-tg .v1-chip.lift{opacity:.35}
.mg-vibe1 .v1-pc .v1-chip{height:28px;font-size:11.5px!important;padding:0 6px 0 3px;animation:v1in .28s cubic-bezier(.3,1.7,.5,1)}
.mg-vibe1 .v1-pc .v1-chip img{width:18px;height:18px}
.mg-vibe1 .v1-pc .v1-chip.ok{border-color:#3fd08a!important;box-shadow:0 0 0 1px #3fd08a,0 2px 0 #0008}
.mg-vibe1 .v1-pc .v1-chip.bad{border-color:#ff5a5a!important;box-shadow:0 0 0 1px #ff5a5a,0 2px 0 #0008;background:#4a1e2a!important;animation:v1shk .4s}
.mg-vibe1 .v1-pc .v1-chip.ok::after,.mg-vibe1 .v1-pc .v1-chip.bad::after{position:absolute;right:1px;top:-1px;font-size:11px;font-weight:900}
.mg-vibe1 .v1-pc .v1-chip.ok::after{content:"✓";color:#3fd08a}.mg-vibe1 .v1-pc .v1-chip.bad::after{content:"✕";color:#ff7a7a}
.mg-vibe1 .v1-miss{display:flex;align-items:center;height:28px;padding:0 7px;border-radius:9px;border:1px dashed #ff7a7a;color:#ff9a9a;font-size:11px;font-weight:800;white-space:nowrap;animation:v1blink .8s steps(2) infinite}
@keyframes v1in{0%{transform:scale(.4) translateY(14px)}100%{transform:none}}
@keyframes v1shk{20%,60%{transform:translateX(-3px)}40%,80%{transform:translateX(3px)}}
@keyframes v1blink{50%{opacity:.45}}
.mg-vibe1 .v1-ghost{position:absolute;z-index:30;pointer-events:none;transform:translate(-50%,-60%) scale(1.12) rotate(-3deg);box-shadow:0 8px 14px #000a!important;opacity:.96;width:auto!important}
.mg-vibe1 .v1-run{position:absolute;z-index:3;border-radius:11px!important;background:linear-gradient(#8aa8ff,#5a74e0)!important;color:#fff!important;font-weight:900!important;font-size:15px!important;box-shadow:0 3px 0 #2a3a90!important;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;border:0!important}
.mg-vibe1 .v1-run small{font-size:11px;font-weight:700;opacity:.85}
.mg-vibe1 .v1-run.off{filter:grayscale(.8) brightness(.6)}
.mg-vibe1 .v1-run.go{animation:v1pulse .5s infinite alternate}
.mg-vibe1 .v1-run:active{transform:translateY(2px);box-shadow:0 1px 0 #2a3a90!important}
@keyframes v1pulse{to{transform:scale(1.07);box-shadow:0 3px 0 #2a3a90,0 0 12px #8aa8ff}}
.mg-vibe1 .v1-tray{position:absolute;z-index:3}
.mg-vibe1 .v1-tl{font-size:11px;font-weight:800;color:#8a94c8;margin:0 2px 4px;letter-spacing:-.2px;white-space:nowrap;overflow:hidden}
.mg-vibe1 .v1-tl b{color:#ffd23f}
.mg-vibe1 .v1-tg{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.mg-vibe1 .v1-tg.in .v1-chip{animation:v1deal .35s cubic-bezier(.3,1.5,.5,1) backwards}
@keyframes v1deal{0%{transform:translateY(30px) scale(.6);opacity:0}100%{transform:none;opacity:1}}
.mg-vibe1 .v1-cb{position:absolute;z-index:6;background:#7c9cff;color:#fff;font-size:11px;font-weight:900;padding:2px 7px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;box-shadow:0 2px 0 #0007}
.mg-vibe1 .v1-cb.on{opacity:1}
.mg-vibe1 .v1-go{position:absolute;z-index:25;width:0;height:0;display:none;pointer-events:none}
.mg-vibe1 .v1-go.on{display:block}
.mg-vibe1 .v1-go i{position:absolute;width:40px;height:40px;left:-20px;top:-38px;background-size:100% 100%;filter:drop-shadow(0 3px 3px #0009);animation:v1tap .7s infinite}
.mg-vibe1 .v1-go.up i{top:2px;animation:v1tapu .7s infinite}
.mg-vibe1 .v1-go span{position:absolute;left:0;bottom:44px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-vibe1 .v1-go.up span{bottom:auto;top:46px}
.mg-vibe1 .v1-go span b{color:#d8402a}
.mg-vibe1 .v1-go.drag i{animation:v1drag 1.1s infinite}
@keyframes v1tap{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v1tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v1drag{0%{transform:translateY(0)}15%{transform:translateY(2px) scale(.9)}75%{transform:translateY(-70px) scale(.9);opacity:1}90%{transform:translateY(-70px);opacity:0}100%{opacity:0}}
.mg-vibe1 .v1-tut{position:absolute;left:6px;right:6px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-vibe1 .v1-tut.off{opacity:0;visibility:hidden}
.mg-vibe1 .v1-tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:8px 12px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #7c9cff;max-width:300px;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-vibe1 .v1-tut.pop .v1-tc{animation:v1pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-vibe1 .v1-tc em{font-style:normal;display:inline-block;background:#5a74e0;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-vibe1 .v1-tc p{margin:0}.mg-vibe1 .v1-tc b{color:#2f55c8}.mg-vibe1 .v1-tc b.rd{color:#c0392b}
.mg-vibe1 .v1-tb{margin-top:5px;display:flex;justify-content:center}
.mg-vibe1 .v1-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important}
.mg-vibe1 .v1-go2{background:linear-gradient(#8aa8ff,#5a74e0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #2a3a90!important;animation:v1pulse .5s infinite alternate}
@keyframes v1pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-vibe1 .v1-end{position:absolute;inset:0;z-index:40;background:#05060fe0;opacity:0;transition:opacity .45s;pointer-events:none;overflow:hidden}
.mg-vibe1 .v1-end.on{opacity:1;pointer-events:auto}
.mg-vibe1 .v1-ph2{position:absolute;left:50%;top:12px;width:178px;height:254px;transform:translate(-50%,40px);border-radius:24px;background:#0b0d18 center/cover no-repeat;border:5px solid #23263a;box-shadow:0 0 0 2px #4a4e6a,0 10px 24px #000c;overflow:hidden;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}
.mg-vibe1 .v1-end.on .v1-ph2{transform:translate(-50%,0)}
.mg-vibe1 .v1-ph2::before{content:"";position:absolute;left:50%;top:5px;width:46px;height:9px;border-radius:9px;background:#05060c;transform:translateX(-50%)}
.mg-vibe1 .v1-clk{position:absolute;left:0;right:0;top:22px;text-align:center;color:#fff;text-shadow:0 2px 6px #0009}
.mg-vibe1 .v1-clk b{display:block;font-size:38px;font-weight:300;letter-spacing:-1px;line-height:1}
.mg-vibe1 .v1-clk small{font-size:11px;opacity:.85}
.mg-vibe1 .v1-nots{position:absolute;left:7px;right:7px;top:92px;display:flex;flex-direction:column;gap:5px}
.mg-vibe1 .v1-nt{display:flex;gap:6px;align-items:center;background:#f4f5fbee;color:#1a1c2a;border-radius:11px;padding:5px 7px;font-size:11px;line-height:1.3;box-shadow:0 2px 6px #0007;animation:v1nt .45s cubic-bezier(.3,1.5,.5,1) backwards}
.mg-vibe1 .v1-nt img{width:22px;height:22px;flex:0 0 auto}
.mg-vibe1 .v1-nt b{font-weight:900;color:#2f55c8}.mg-vibe1 .v1-nt em{font-style:normal;font-weight:900;font-size:12.5px;color:#111}
.mg-vibe1 .v1-nt.none{justify-content:center;color:#6a6a7a}
@keyframes v1nt{0%{transform:translateY(-30px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
.mg-vibe1 .v1-sum{position:absolute;left:0;right:0;top:276px;text-align:center;color:#fff;font-size:13px;font-weight:700;opacity:0;transition:opacity .4s}
.mg-vibe1 .v1-sum b{display:block;font-size:24px;font-weight:900;color:#ffd23f;text-shadow:0 0 10px #ffd23f66}
.mg-vibe1 .v1-sum.on{opacity:1}
.mg-vibe1 .v1-ecl{position:absolute;left:4px;bottom:0;width:96px;height:125px;background-repeat:no-repeat;background-size:300% 346.15%;filter:drop-shadow(0 0 8px #0009)}
.mg-vibe1 .v1-ecl.px{background-size:100% 100%;image-rendering:pixelated;width:64px;left:14px}
.mg-vibe1 .v1-esay{position:absolute;left:10px;bottom:130px;background:#fffdf6;color:#2a2018;font-size:12.5px;font-weight:900;padding:5px 9px;border-radius:11px;white-space:nowrap;box-shadow:0 3px 0 #0007;opacity:0;transform:scale(.5);transform-origin:20% 100%;transition:opacity .2s,transform .3s cubic-bezier(.3,1.7,.5,1)}
.mg-vibe1 .v1-esay::after{content:"";position:absolute;left:26px;bottom:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fffdf6}
.mg-vibe1 .v1-esay.on{opacity:1;transform:scale(1)}
.mg-vibe1 .v1-me{position:absolute;right:4px;bottom:0;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s;pointer-events:none;filter:drop-shadow(0 0 6px #7c9cff55)}
.mg-vibe1 .v1-me.on{opacity:1}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

// ── 코디가 만든 앱 그리기 ──
// r: 화면 영역, a: { f 기능, col 색 4개, mix 섞인 색, big, noti, login, trap }, tm: 시간(움직임)
function drawApp(g, r, a, tm) {
  const P = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(r.x + x, r.y + y, w, h); };
  const w = r.w, h = r.h;
  if (a.trap) {
    // 함정: 코디가 아무거나 섞어 만든 앱(지지직)
    const pal = ["#ff5a5a", "#5fb8ff", "#ffd23f", "#c77dff", "#3fd08a", "#ff9ad0", "#222", "#fff"];
    let s = a.seed || 7; const rr = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    P(0, 0, w, h, "#d8d0f0");
    for (let k = 0; k < 16; k++) P(Math.floor(rr() * w), Math.floor(rr() * h), 3 + Math.floor(rr() * w * 0.5), 2 + Math.floor(rr() * 7), pal[Math.floor(rr() * pal.length)]);
    const jt = Math.floor(tm * 8) % 4;
    for (let y = jt; y < h; y += 5) P(Math.floor(rr() * 4) - 2, y, w, 1, "#ffffff55");
    rrect(g, r.x + w / 2 - 6, r.y + h / 2 - 6, 12, 12, 2.4); g.fillStyle = "#1a1a24"; g.fill();
    g.fillStyle = "#ffd23f"; g.font = "900 9px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", r.x + w / 2, r.y + h / 2 + 0.4);
    return;
  }
  const [bg, main0, acc0, txt] = a.col || GRAY, main = main0, acc = a.mix ? a.mix[2] : acc0, main2 = a.mix ? a.mix[1] : main0;
  const th = a.big ? 2 : 1;
  const T = (x, y, len, c) => P(x, y, len, th, c);
  P(0, 0, w, h, bg);
  P(0, 0, w, 2, shade(main, 0.7)); P(w - 5, 0, 3, 1, "#ffffff88");
  const hh = a.big ? 9 : 7;
  P(0, 2, w, hh, main); T(3, 2 + (hh >> 1) - (th >> 1), Math.min(a.big ? 16 : 12, w - 12), "#ffffff");
  P(w - 5, 4, 3, 1, "#ffffffaa"); P(w - 5, 6, 3, 1, "#ffffffaa");
  const bx = 2, bw = w - 4; let by = 2 + hh + 3; const yEnd = h - 3;
  const btnH = a.big ? 9 : 7;
  const button = () => { P(bx, yEnd - btnH, bw, btnH, acc); P(bx, yEnd - btnH, bw, 1, shade(acc, 1.2)); P(bx, yEnd - 1, bw, 1, shade(acc, 0.7)); T((w >> 1) - (a.big ? 7 : 5), yEnd - btnH + (btnH >> 1) - (th >> 1), a.big ? 14 : 10, "#ffffff"); };
  const light = shade(bg, 0.9), lines = shade(bg, 0.8);
  if (a.f === "rsv") {
    T(bx, by, a.big ? 16 : 12, txt); by += th + 3;
    const cs = Math.max(3, Math.floor(bw / 7)), rows = clamp(Math.floor((yEnd - btnH - 3 - by) / cs), 1, 5);
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < 7; c++) { const k = rr * 7 + c; P(bx + c * cs, by + rr * cs, cs - 1, cs - 1, k === 9 ? acc : k % 7 === 0 ? shade(light, 0.95) : light); if (k === 9 && cs > 3) P(bx + c * cs + 1, by + rr * cs + 1, 1, 1, "#ffffff"); }
    button();
  } else if (a.f === "gal") {
    const cols = bw > 34 ? 3 : 2, tw = Math.floor((bw - (cols - 1) * 2) / cols), rows = Math.max(1, Math.floor((yEnd - by + 2) / (tw + 2)));
    const fc = ["#ff7eb0", "#ff5a5a", "#ffd23f", "#c77dff", "#ffffff", "#ff9ad0"];
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const x = bx + c * (tw + 2), y = by + rr * (tw + 2), k = rr * cols + c; if (y + tw > yEnd + 1) continue;
      P(x, y, tw, tw, shade(main2, 1.25)); P(x, y, tw, 1, "#ffffff66");
      const cx = x + (tw >> 1), cy = y + (tw >> 1) - 1, col = fc[k % fc.length];
      P(cx, cy + 1, 1, (tw >> 1), "#3e8e4a"); P(cx - 2, cy - 1, 2, 2, col); P(cx + 1, cy - 1, 2, 2, col); P(cx - 1, cy - 2, 3, 1, col); P(cx - 1, cy + 1, 3, 1, col); P(cx, cy, 1, 1, "#ffe066");
    }
  } else if (a.f === "att") {
    const rh = a.big ? 9 : 7; let i = 0;
    for (let y = by; y + rh <= yEnd - btnH - 2; y += rh + 1, i++) {
      P(bx, y, bw, rh, light); P(bx + 1, y + 1, rh - 2, rh - 2, main2); P(bx + 2, y + 2, Math.max(1, rh - 6), 1, "#ffffff88");
      T(bx + rh + 1, y + (rh >> 1) - (th >> 1), 8 + ((i * 5) % 9), txt);
      const ck = i < 3 || (i === 3 && Math.floor(tm * 2) % 2); P(bx + bw - rh + 1, y + 1, rh - 2, rh - 2, ck ? acc : lines);
      if (ck) { P(bx + bw - rh + 2, y + (rh >> 1), 1, 1, "#ffffff"); P(bx + bw - rh + 3, y + (rh >> 1) + 1, 1, 1, "#ffffff"); P(bx + bw - rh + 4, y + (rh >> 1) - 1, 1, 1, "#ffffff"); }
    }
    button();
  } else if (a.f === "tbl") {
    const cols = bw > 34 ? 5 : 3, cw = Math.floor(bw / cols), rh = a.big ? 6 : 4, rows = clamp(Math.floor((yEnd - btnH - 3 - by) / rh), 2, 9);
    P(bx, by, cw * cols, rh, main2);
    for (let rr = 1; rr < rows; rr++) for (let c = 0; c < cols; c++) { P(bx + c * cw, by + rr * rh, cw - 1, rh - 1, (rr + c) % 5 === 0 ? shade(acc, 1.3) : light); if (c > 0) P(bx + c * cw + 1, by + rr * rh + (rh >> 1) - 1, Math.max(1, cw - 3 - ((rr * c) % 3)), 1, lines); }
    // 자동 정리 톱니
    const gx = bx + bw - 6, gy = by + 1, sp = Math.floor(tm * 6) % 2;
    P(gx + 1, gy, 3, 5, acc); P(gx, gy + 1, 5, 3, acc); P(gx + 2, gy + 2, 1, 1, main2); if (sp) { P(gx, gy, 1, 1, acc); P(gx + 4, gy + 4, 1, 1, acc); } else { P(gx + 4, gy, 1, 1, acc); P(gx, gy + 4, 1, 1, acc); }
    button();
  } else if (a.f === "menu") {
    const rh = a.big ? 10 : 8, foods = [["#e0382a", "#fff4e0"], ["#c07a3a", "#f0c080"], ["#ffc83a", "#e0382a"], ["#6a4a2a", "#f4f4f4"]]; let i = 0;
    for (let y = by; y + rh <= yEnd - btnH - 2; y += rh + 1, i++) {
      const [f1, f2] = foods[i % 4]; P(bx, y, rh, rh - 1, shade(bg, 0.85)); P(bx + 1, y + 2, rh - 2, rh - 4, f1); P(bx + 2, y + 3, 2, 1, f2); P(bx + rh - 4, y + 2, 2, 1, f2);
      T(bx + rh + 2, y + 1, Math.min(bw - rh - 10, 10 + ((i * 3) % 6)), txt); T(bx + bw - 7, y + rh - 3, 6, acc);
      P(bx, y + rh, bw, 1, lines);
    }
    button();
  } else {
    // 기능 없음: 빈 화면에 인사말만
    P(bx + 2, by + 4, bw - 4, Math.max(6, (yEnd - by) >> 1), light);
    T((w >> 1) - 6, by + 8, 12, shade(txt, 1.6)); T((w >> 1) - 4, by + 11 + th, 8, shade(txt, 1.8));
  }
  if (a.login) {
    // 회원가입 벽
    const oy = 2 + hh; P(0, oy, w, h - oy, "#000000aa"); const cw2 = w - 8, ch2 = Math.min(34, h - oy - 6), cx = 4, cy = oy + ((h - oy - ch2) >> 1);
    P(cx, cy, cw2, ch2, "#ffffff"); P(cx, cy, cw2, 1, "#e8e8f0");
    P(cx + (cw2 >> 1) - 2, cy + 3, 5, 4, "#f2c14e"); P(cx + (cw2 >> 1) - 1, cy + 1, 3, 2, "#c8c8d4");
    P(cx + 3, cy + 10, cw2 - 6, 5, "#e8e8f0"); P(cx + 3, cy + 10, cw2 - 6, 1, "#b8b8c8"); P(cx + 3, cy + 17, cw2 - 6, 5, "#e8e8f0"); P(cx + 3, cy + 17, cw2 - 6, 1, "#b8b8c8");
    P(cx + 3, cy + 25, cw2 - 6, 6, main); P(cx + (cw2 >> 1) - 5, cy + 27, 10, 1, "#ffffff");
  }
  if (a.noti) {
    // 알림 폭탄
    P(1, 2 + hh + 1, w - 2, 5, "#ffd23f"); P(3, 2 + hh + 3, w - 12, 1, "#5a4a10");
    const spots = [[w - 6, 1], [4, hh + 12], [w - 10, hh + 20], [8, h - 16], [w - 7, h - 24], [w >> 1, hh + 28]];
    spots.forEach(([x, y], k) => { if (y > h - 4) return; const bl = Math.floor(tm * 4 + k) % 3 ? "#ff3b3b" : "#ff8a8a"; P(x, y, 4, 4, bl); P(x + 1, y + 1, 2, 1, "#ffffff"); });
  }
}

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "vibe1", "이게 되네?", "mg-v1st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="v1-w"><canvas></canvas>
    <div class="v1-bub"><em></em><p></p></div><div class="v1-pvl"><i>코디</i> 미리보기</div>
    <div class="v1-pr"><div class="v1-ph">여기에 칩을 끌어 놓아요</div><div class="v1-pc" style="display:contents"></div></div>
    <button class="v1-run off" data-run>실행<small>코디야 부탁해</small></button>
    <div class="v1-tray"><div class="v1-tl">프롬프트 칩 · <b>끌어서</b>(톡) 위 창으로</div><div class="v1-tg"></div></div>
    <div class="v1-cb"></div><div class="v1-go"><span></span><i></i></div>
    <div class="v1-tut off"><div class="v1-tc"><em>리허설</em><p></p><div class="v1-tb"></div></div></div>
    <div class="v1-end"></div></div>`);
  const $ = (s) => F.stage.querySelector(s);
  const wrap = $(".v1-w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d");
  const bub = $(".v1-bub"), bubWho = bub.querySelector("em"), bubP = bub.querySelector("p"), pvl = $(".v1-pvl");
  const prEl = $(".v1-pr"), prPh = $(".v1-ph"), prC = $(".v1-pc"), runB = $("[data-run]"), trayEl = $(".v1-tray"), trayG = $(".v1-tg");
  const cbEl = $(".v1-cb"), goEl = $(".v1-go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i");
  const tutEl = $(".v1-tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".v1-tb"), endEl = $(".v1-end");
  let K = 2, KS = 2;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const px = (v) => Math.round(v * K) + "px";
  const fit = () => {
    const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 236);
    K = Math.max(1, r); H = clamp(Math.floor(sh / K), 236, 300); KS = K * DPR;
    cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); wrap.style.width = Math.round(W * K) + "px"; wrap.style.height = Math.round(H * K) + "px";
    g.setTransform(KS, 0, 0, KS, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    for (const k in BGS) delete BGS[k]; for (const k in FRS) delete FRS[k];
    Object.assign(bub.style, { left: px(3), top: px(3), width: px(88) });
    Object.assign(pvl.style, { left: px(94), width: px(66), top: px(102) });
    Object.assign(prEl.style, { left: px(43), top: px(PBY + 2), width: px(115), height: px(TRY - PBY - 6) });
    Object.assign(runB.style, { left: px(2), top: px(149), width: px(38), height: px(TRY - 149 - 4) });
    Object.assign(trayEl.style, { left: px(3), top: px(TRY), width: px(154) });
    trayEl.style.setProperty("--chh", Math.round(clamp(((H - TRY) * K - 34) / 3 - 5, 32, 46)) + "px");
    Object.assign(cbEl.style, { left: px(2), top: px(97) });
    Object.assign(tutEl.style, { top: px(48) });
  };
  const BGS = {}, FRS = {};
  fit();
  // 배경 그림이 늦게 오면 다시 만든다
  const bgOf = (id) => { const b = BGS[id], ok = img("img/bg/" + SHOP[id][1] + ".webp").ok; if (b && (b.ok || !ok)) return b.c; return (BGS[id] = { c: shopBg(id, KS), ok }).c; };
  const frOf = (id) => FRS[id] || (FRS[id] = shopFront(id, KS));
  [...CLI, PRAC].forEach((c) => { img("img/bg/" + SHOP[c.id][1] + ".webp"); img("img/body/" + SHOP[c.id][0] + ".webp"); });
  // 책상 띠(노트북 자리) + 칩 서랍(매트): 벡터
  const drawDesk = () => {
    const oy = SCN, ty = TRY - SCN - 4;
    let gr = g.createLinearGradient(0, oy, 0, oy + ty); gr.addColorStop(0, "#4a3c5a"); gr.addColorStop(0.08, "#3a2f48"); gr.addColorStop(1, "#231c2e"); g.fillStyle = gr; g.fillRect(0, oy, W, ty);
    for (let x = 0; x < W; x += 23) { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x, oy + 2, 0.4, ty - 2); }
    g.fillStyle = "rgba(255,230,200,.18)"; g.fillRect(0, oy, W, 0.5);
    gr = g.createLinearGradient(0, oy + ty, 0, H); gr.addColorStop(0, "#1e2440"); gr.addColorStop(1, "#141830"); g.fillStyle = gr; g.fillRect(0, oy + ty, W, H - oy - ty);
    g.fillStyle = "#3a4270"; g.fillRect(0, oy + ty, W, 0.5); g.fillStyle = "#0a0d1c"; g.fillRect(0, oy + ty + 0.5, W, 0.6);
    g.strokeStyle = "rgba(124,156,255,.07)"; g.lineWidth = 0.3; g.beginPath(); for (let y = oy + ty + 6; y < H; y += 8) { g.moveTo(0, y); g.lineTo(W, y); } for (let x = 4; x < W; x += 8) { g.moveTo(x, oy + ty + 2); g.lineTo(x, H); } g.stroke();
    // 노트북 받침
    gr = g.createLinearGradient(0, oy + 33, 0, oy + 37); gr.addColorStop(0, "#e6e9f2"); gr.addColorStop(1, "#8a8e9e"); rrect(g, 1, oy + 33, 41, 4, 1.2); g.fillStyle = gr; g.fill();
    rrect(g, 17, oy + 33.6, 9, 1, 0.5); g.fillStyle = "#a4a8b8"; g.fill();
  };
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const FDN = fingerURL(true), FUP = fingerURL(false);

  // ── 상태 ──
  let tut = opts.retry ? 0 : 0, tutT = 0, over = false, last = 0, phase = "idle", phT = 0, el = 0, started = false, tm0 = null;
  let cur = null, clientIdx = -1, queue = [], runs = 0, prompt = [], trayIds = [], marks = {}, missCats = [], app = null, appRev = 1, lastAct = 0, revGuide = false, revGuided = false;
  let cl = null; // 의뢰인 { p, x, mode, t }
  const results = []; // { c, sat, frac, runs, pay }
  let codeLines = [], codiMood = "idle", sparks = [], firstHint = false;
  const T = BASE_T * ez;
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };
  const elXY = (el, dy = 0) => { const r = el.getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + dy]; };
  const updSc = () => (F.sc.textContent = tut >= 0 ? "리허설" : `의뢰 ${clamp(clientIdx + 1, 1, 3)}/3`);

  // ── 소리 ──
  const S = {
    key: () => tone(1700 + rnd() * 600, 0.018, "square", 0.025),
    snap: () => { SFX.snap(); },
    pop: () => tone(520, 0.06, "sine", 0.1, -200),
    door: () => { tone(1318, 0.1, "triangle", 0.05); tone(988, 0.16, "triangle", 0.05, 0, 0.1); },
    hmm: () => { tone(300, 0.14, "triangle", 0.08, -40); tone(260, 0.2, "triangle", 0.08, -50, 0.16); },
    yay: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "triangle", 0.1, 0, i * 0.07)); },
    coin: (at = 0) => { tone(1568, 0.07, "square", 0.06, 0, at); tone(2093, 0.16, "square", 0.06, 0, at + 0.07); },
    glitch: () => { noise(0.25, 900, 0.12, 0, 3); tone(90, 0.25, "sawtooth", 0.06, 60); },
    build: () => tone(440, 0.4, "triangle", 0.05, 440),
  };

  // ── 칩 ──
  const chipHTML = (id) => `<button class="v1-chip k-${id[0]}" data-id="${id}"><img src="${iconURL(id)}" alt=""><span>${chipName(id)}</span></button>`;
  const dealTray = (ids) => {
    trayIds = ids; trayG.classList.remove("in"); trayG.innerHTML = ids.map(chipHTML).join("");
    [...trayG.children].forEach((b, i) => (b.style.animationDelay = i * 0.04 + "s")); void trayG.offsetWidth; trayG.classList.add("in");
  };
  const trayFor = (c) => {
    const n = c.need, ids = ["f:" + n.f, "c:" + n.c, "s:" + n.s];
    if (n.x) ids.push("x:" + n.x);
    ids.push("f:" + pick(Object.keys(FEAT).filter((k) => k !== n.f)));
    shuffle(Object.keys(COL).filter((k) => k !== n.c)).slice(0, n.x ? 1 : 2).forEach((k) => ids.push("c:" + k));
    ids.push("s:" + pick(Object.keys(SCR).filter((k) => k !== n.s)));
    if (n.x) ids.push("x:noti");
    shuffle([0, 1, 2, 3]).slice(0, n.x ? 1 : 2).forEach((i) => ids.push("t:" + i));
    if (c === PRAC) return shuffle(["f:menu", "c:cream", "s:phone", "f:gal", "c:blue", "s:pc", "t:0", "c:neon", "t:1"]);
    return shuffle(ids);
  };
  const renderPrompt = () => {
    prC.innerHTML = prompt.map(chipHTML).join("") + missCats.map((k) => `<span class="v1-miss">+ ${CATN[k]} 빠짐</span>`).join("");
    [...prC.querySelectorAll(".v1-chip")].forEach((b) => { const m = marks[b.dataset.id]; if (m) b.classList.add(m); });
    prPh.style.display = prompt.length || missCats.length ? "none" : "";
    prEl.classList.toggle("full", prompt.length > 0);
    [...trayG.children].forEach((b) => b.classList.toggle("used", prompt.includes(b.dataset.id)));
    const can = phase === "ask" && prompt.length > 0 && tut !== 1;
    runB.classList.toggle("off", !can);
    runB.classList.toggle("go", can && (tut === 2 || (cur && prompt.length >= needCats(cur).length && !Object.keys(marks).length)));
  };
  const needCats = (c) => ["f", "c", "s"].concat(c.need.x ? ["x"] : []);
  const addChip = (id) => {
    if (over) return;
    if (phase !== "ask") { if (phase === "run") F.msg("코디가 만드는 중이에요"); return; }
    if (prompt.includes(id)) return;
    if (prompt.length >= 5) { F.msg("창이 꽉 찼어요. 뺄 칩을 톡!"); SFX.tok(); return; }
    prompt.push(id); lastAct = el; missCats = missCats.filter((k) => k !== id[0]);
    S.snap(); vib(8); renderPrompt();
    const b = prC.querySelector(`[data-id="${id}"]`); if (b) F.burst(stageXYfromEl(b), "#9fb4ff", 6);
    if (tut === 1) {
      if (cur.need[id[0]] !== id.slice(2)) { F.msg(id[0] === "t" ? "모호한 말은 함정! 톡 하면 빠져요" : "의뢰인 말과 달라요. 톡 하면 빠져요"); marks[id] = "bad"; renderPrompt(); }
      else if (needCats(cur).every((k) => prompt.includes(k + ":" + cur.need[k])) && prompt.length === needCats(cur).length) setTimeout(() => { if (tut === 1) tutNext(2); }, 350);
    }
  };
  const removeChip = (id) => {
    if (over || (phase !== "ask")) return;
    const i = prompt.indexOf(id); if (i < 0) return;
    prompt.splice(i, 1); delete marks[id]; lastAct = el; S.pop(); renderPrompt();
  };
  const stageXYfromEl = (el2) => { const r = el2.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]; };

  // 끌기: 서랍 칩을 잡고 위 창으로. 조금만 움직이면 톡으로 친다
  let drag = null;
  const overPrompt = (x, y) => { const r = prEl.getBoundingClientRect(); return x >= r.left - 14 && x <= r.right + 14 && y >= r.top - 18 && y <= r.bottom + 14; };
  trayG.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".v1-chip"); if (!b || b.classList.contains("used") || over) return;
    e.preventDefault(); drag = { id: b.dataset.id, el: b, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
    try { b.setPointerCapture(e.pointerId); } catch (er) {}
    SFX.tick();
  });
  const dragMove = (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 7) {
      drag.moved = true; const gh = drag.el.cloneNode(true); gh.classList.add("v1-ghost"); gh.classList.remove("used"); wrap.appendChild(gh); drag.ghost = gh; drag.el.classList.add("lift");
    }
    if (drag.moved) { const w = wrap.getBoundingClientRect(); drag.ghost.style.left = e.clientX - w.left + "px"; drag.ghost.style.top = e.clientY - w.top + "px"; prEl.classList.toggle("hot", overPrompt(e.clientX, e.clientY)); }
  };
  const dragEnd = (e, cancel) => {
    if (!drag) return; const d = drag; drag = null;
    if (d.ghost) d.ghost.remove(); d.el.classList.remove("lift"); prEl.classList.remove("hot");
    if (cancel) return;
    if (!d.moved || overPrompt(e.clientX, e.clientY)) addChip(d.id);
    else SFX.tok();
  };
  trayG.addEventListener("pointermove", dragMove);
  trayG.addEventListener("pointerup", (e) => dragEnd(e, false));
  trayG.addEventListener("pointercancel", (e) => dragEnd(e, true));
  prC.parentElement.addEventListener("pointerdown", (e) => { const b = e.target.closest(".v1-chip"); if (!b) return; e.preventDefault(); removeChip(b.dataset.id); });
  runB.addEventListener("pointerdown", (e) => { e.preventDefault(); doRun(); });

  // ── 판정 ──
  const judge = (ids, c) => {
    const n = c.need, cats = needCats(c), mk = {}; let trap = false, extra = 0;
    for (const id of ids) { const k = id[0], v = id.slice(2); if (k === "t") { trap = true; mk[id] = "bad"; } else if (n[k] === v) mk[id] = "ok"; else { mk[id] = "bad"; if (k === "x") extra++; } }
    const sat = cats.filter((k) => ids.includes(k + ":" + n[k]) && !ids.some((id) => id[0] === k && mk[id] === "bad"));
    const miss = cats.filter((k) => !sat.includes(k));
    let frac = trap ? 0 : clamp(sat.length / cats.length - 0.2 * extra, 0, 1);
    const perfect = !trap && !miss.length && !extra;
    let line = "";
    if (trap) line = "이게… 뭐예요? 제가 말한 거랑 완전 달라요";
    else if (miss.includes("f")) line = ids.some((id) => id[0] === "f") ? c.nf : "그래서 뭘 누르면 돼요? 텅 비었는데요";
    else if (miss.includes("s")) line = SCR_NO[n.s];
    else if (miss.includes("c")) line = ids.some((id) => id[0] === "c") ? (ids.filter((id) => id[0] === "c").length > 1 ? "색이 섞여서 정신없어요!" : c.nc) : "색이 너무 칙칙해요…";
    else if (miss.includes("x")) line = X_NO[n.x];
    else if (extra) line = "알림이 왜 이렇게 많아요? 그건 안 시켰는데…";
    const empty = cats.filter((k) => !ids.some((id) => id[0] === k));
    return { mk, frac, perfect, line, empty, trap };
  };
  const appOf = (ids, c) => {
    const gv = (k) => ids.filter((id) => id[0] === k).map((id) => id.slice(2));
    const fs = gv("f"), cs = gv("c"), ss = gv("s"), xs = gv("x");
    return { f: fs[0] || null, col: cs.length ? COL[cs[0]].c : GRAY, mix: cs.length > 1 ? COL[cs[1]].c : null, scr: ss[0] || "pc", big: xs.includes("big"), noti: xs.includes("noti"), login: c.need.x === "nolog" && !xs.includes("nolog"), trap: ids.some((id) => id[0] === "t"), seed: 1 + rint(9999) };
  };

  // ── 의뢰인 등장·퇴장 ──
  const say = (who, html, cls = "") => { bubWho.textContent = who; bubP.innerHTML = html; bub.className = "v1-bub " + cls; void bub.offsetWidth; bub.classList.add("on"); };
  const hideSay = () => bub.classList.remove("on");
  const newClient = (c) => {
    cur = c; runs = 0; prompt = []; marks = {}; missCats = []; app = null; appRev = 1;
    cl = { p: { spec: cliSpec(c), cache: {} }, x: -14, mode: "enter", t: 0 };
    phase = "enter"; phT = 0; hideSay(); dealTray(trayFor(c)); renderPrompt(); S.door(); codeLines = []; codiMood = "idle"; cbEl.classList.remove("on"); updSc();
  };
  const arrive = () => { phase = "ask"; phT = 0; lastAct = el; cl.mode = "idle"; cl.x = 46; say(cur.who, cur.say); tone(660, 0.05, "triangle", 0.06); renderPrompt(); };

  // ── 실행: 코디가 타자 → 미리보기 생성 → 의뢰인 반응 ──
  const RUN_D = () => (RM() ? 0.6 : 1.55);
  const doRun = () => {
    if (over) return;
    if (phase !== "ask") return;
    if (tut === 1) { F.msg("먼저 칩 3개를 넣어요"); SFX.tok(); return; }
    if (!prompt.length) { F.msg("칩을 먼저 넣어요!"); SFX.tok(); return; }
    phase = "run"; phT = 0; runs++; marks = {}; missCats = []; renderPrompt(); hideSay();
    app = appOf(prompt, cur); appRev = 0; codiMood = "work";
    codeLines = []; const cols = ["#7c9cff", "#5fe0a0", "#ffd166", "#ff7ab0", "#c8d0f0", "#c8d0f0"];
    for (let k = 0; k < 14; k++) codeLines.push({ ind: [0, 2, 4, 2, 4, 6][rint(6)], len: 4 + rint(18), c: pick(cols) });
    cbEl.textContent = "코디: 만드는 중…"; cbEl.classList.add("on");
    SFX.whoosh(); vib(10);
    if (tutEl && tut === 2) tutEl.classList.add("off");
    guide(null);
  };
  const react = () => {
    const j = judge(prompt, cur);
    marks = j.mk; missCats = j.empty; phase = "react"; phT = 0; cur._trap = j.trap;
    const pvXY = stageXY(127, 50);
    if (app.trap) S.glitch();
    if (j.perfect) {
      codiMood = "happy"; cbEl.textContent = "코디: 완성!"; cl.mode = "happy"; cl.t = 0;
      say(cur.who, pick(HAPPY), "ok"); S.yay(); F.hit(pvXY, 1, "#7c9cff");
      for (let k = 0; k < 12; k++) sparks.push({ x: 127 + rnd() * 30 - 15, y: 60, vx: rnd() * 60 - 30, vy: -40 - rnd() * 40, t: 0.9, c: pick(["#ffd23f", "#7c9cff", "#ffffff", "#5fe0a0"]) });
      if (tut < 0) {
        const sat = runs === 1 ? 1 : runs === 2 ? 0.8 : 0.6, pay = Math.round(cur.fee * sat);
        results.push({ c: cur, sat, frac: 1, runs, pay }); F.float(stageXY(46, 40), `+${pay}만원`); S.coin(0.25);
      }
    } else if (runs >= 3 && tut < 0) {
      codiMood = "sad"; cbEl.textContent = "코디: 다음엔 잘할게요…"; cl.mode = "meh"; cl.t = 0;
      const sat = 0.5 * j.frac, pay = Math.round(cur.fee * sat);
      results.push({ c: cur, sat, frac: j.frac, runs, pay }); say(cur.who, "음… 일단 이걸로 쓸게요. 반만 드릴게요", "no"); S.hmm(); F.miss(pvXY);
    } else {
      codiMood = "sad"; cbEl.textContent = "코디: 수정할게요!"; cl.mode = "sad"; cl.t = 0;
      say(cur.who, `${j.line}`, "no"); S.hmm(); F.miss(pvXY);
      if (!revGuided) revGuide = true;
      cur._best = Math.max(cur._best || 0, j.frac);
    }
    renderPrompt(); updSc();
  };
  const nextClient = () => {
    if (tut >= 0) { tutNext(3); return; }
    if (results.length >= 3 || clientIdx >= queue.length - 1) return endGame();
    cl.mode = "exit"; cl.t = 0; phase = "leave"; phT = 0; hideSay(); cbEl.classList.remove("on");
  };

  // ── 할 일 손가락 ──
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.drag ? 1 : 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "v1-go"; return; }
    const up = o.y < 70;
    goI.style.backgroundImage = `url("${up ? FUP : FDN}")`;
    goEl.style.left = o.x + "px"; goEl.style.top = o.y + "px"; goT.innerHTML = o.t;
    const ww = W * K; goT.style.transform = o.x < 60 ? "translateX(-22%)" : o.x > ww - 60 ? "translateX(-80%)" : "";
    goEl.className = "v1-go on" + (up ? " up" : "") + (o.drag ? " drag" : "");
  };
  const atChip = (id, t, drag2) => { const b = (prC.querySelector(`[data-id="${id}"]`) || trayG.querySelector(`[data-id="${id}"]`)); if (!b) return null; const [x, y] = elXY(b, 6); return { x, y, t, drag: drag2 }; };
  const taskNow = () => {
    if (phase !== "ask" || tut >= 0) return null;
    const idle = el - lastAct, bad = prompt.find((id) => marks[id] === "bad");
    if (revGuide && bad) return atChip(bad, "빨간 칩 <b>톡!</b> 빼기");
    if (revGuide && !bad) { revGuide = false; revGuided = true; }
    if (clientIdx === 0 && !firstHint && phT < 3.2 && !prompt.length) { const [x, y] = elXY(trayG.children[4] || trayG, 8); return { x, y, t: "말풍선 보고 맞는 칩을 <b>위로!</b>", drag: 1 }; }
    if (bad && idle > 3.5) return atChip(bad, "빨간 칩 <b>톡!</b> 빼기");
    if (idle > 5 && prompt.length < needCats(cur).length) { const [x, y] = elXY(trayG.children[4] || trayG, 8); return { x, y, t: "맞는 칩을 <b>위로!</b>", drag: 1 }; }
    if (idle > 3 && prompt.length >= needCats(cur).length && !Object.keys(marks).length) { const [x, y] = elXY(runB, 8); return { x, y, t: "<b>실행!</b>" }; }
    return null;
  };

  // ── 리허설: 칩 넣기 → 실행 → 함정·수정 안내 → 시작 ──
  const SKIP = `<button class="v1-skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) {
      tutEl.style.top = px(64);
      tutP.innerHTML = `말풍선을 읽고 맞는 <b>칩</b>을 <b>위 창</b>으로 끌어요(톡도 OK).<br>손가락 따라 <b>3개</b>!`; tutB.innerHTML = SKIP;
    } else if (n === 2) {
      tutP.innerHTML = `다 넣었으면 <b>실행</b>!<br>코디가 앱을 만들어 줘요.`; tutB.innerHTML = SKIP;
    } else if (n === 3) {
      phase = "tut3"; tutEl.style.top = px(40);
      tutP.innerHTML = `좋아요! 이제 진짜 의뢰 <b>3건</b>.<br><b class="rd">대충 알아서·느낌 있게</b> 같은 모호한 칩은 <b class="rd">함정</b>!<br>결과가 다르면 <b>수정 요청</b>이 와요.<br>빨간 칩을 톡 해서 빼고 다시 실행해요.`;
      tutB.innerHTML = `<button class="v1-go2" data-go>의뢰 받기!</button>`;
    }
    renderPrompt();
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    queue = shuffle(CLI.filter((c) => !c.need.x)).slice(0, 2).concat([pick(CLI.filter((c) => c.need.x))]);
    queue.forEach((c) => (c._best = 0));
    clientIdx = -1; results.length = 0; el = 0; tm0 = timer(T, F.bar, () => endGame(true)); started = true;
    clientIdx = 0; newClient(queue[0]); SFX.go?.();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 그리기 ──
  const heart = (x, y, sz, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + sz * 0.3); g.bezierCurveTo(x, y, x - sz * 0.5, y, x - sz * 0.5, y + sz * 0.32); g.bezierCurveTo(x - sz * 0.5, y + sz * 0.62, x, y + sz * 0.78, x, y + sz); g.bezierCurveTo(x, y + sz * 0.78, x + sz * 0.5, y + sz * 0.62, x + sz * 0.5, y + sz * 0.32); g.bezierCurveTo(x + sz * 0.5, y, x, y, x, y + sz * 0.3); g.fill(); };
  const drop = (x, y, sz) => { g.beginPath(); g.moveTo(x, y - sz); g.bezierCurveTo(x + sz * 0.75, y, x + sz * 0.75, y + sz * 0.75, x, y + sz * 0.75); g.bezierCurveTo(x - sz * 0.75, y + sz * 0.75, x - sz * 0.75, y, x, y - sz); const q = g.createRadialGradient(x - sz * 0.2, y, 0.1, x, y, sz); q.addColorStop(0, "#fff"); q.addColorStop(0.4, "#bfe8ff"); q.addColorStop(1, "#4fa8e8"); g.fillStyle = q; g.fill(); };
  // 의뢰인: 캐릭터 그림(상반신) + 표정. 그림이 없으면 도트
  const drawClient = (tm) => {
    if (!cl) return;
    const ci = img("img/body/" + SHOP[cur.id][0] + ".webp");
    let x = cl.x, bob = 0, ex = "neutral", tilt = 0;
    if (cl.mode === "enter" || cl.mode === "exit") { bob = -Math.abs(Math.sin(tm * 11)) * 1.6; ex = cl.mode === "enter" ? "smile" : "neutral"; tilt = cl.mode === "enter" ? 2 : -2; }
    else if (cl.mode === "happy") { bob = -Math.abs(Math.sin(cl.t * 9)) * 2.6; ex = "smile"; }
    else if (cl.mode === "sad") { ex = cur._trap ? "surprised" : "sad"; tilt = Math.sin(cl.t * 5) * 1.5; }
    else if (cl.mode === "meh") ex = "angry";
    else { bob = Math.sin(tm * 2) * 0.3; if (phase === "run") ex = "surprised"; else if (bub.classList.contains("on") && phT < 2.2) ex = Math.floor(tm * 3) % 4 ? "smile" : "neutral"; }
    if (ci.ok) {
      const cw = 60, ch = cw * 1.3, top = 92 - ch + 4 + bob, i = EXI[ex];
      g.save(); g.translate(x, top + ch); g.rotate(tilt * Math.PI / 180);
      g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 4 * KS; g.shadowOffsetY = 1 * KS;
      g.drawImage(ci.im, (i % 3) * 240, i >= 3 ? 540 : 0, 240, 312, -cw / 2, -ch, cw, ch);
      g.restore();
    } else {
      const p = cl.p; let o, flip = false, y = 22;
      if (cl.mode === "enter") o = { v: "s", f: Math.floor(tm * 8) % 4 };
      else if (cl.mode === "exit") { o = { v: "s", f: Math.floor(tm * 8) % 4 }; flip = true; }
      else if (cl.mode === "happy") { o = { v: "f", arm: Math.floor(cl.t * 4) % 2 ? "up" : undefined }; y -= Math.abs(Math.sin(cl.t * 9)) * 3 | 0; }
      else if (cl.mode === "sad") o = { v: "f", look: Math.floor(cl.t * 5) % 2 ? -1 : 1 };
      else if (cl.mode === "meh") o = { v: "f", look: -1 };
      else o = { v: "f", f: Math.floor(tm * 1.6) % 2 ? 1 : 0 };
      const key = `${o.v}${o.f || 0}${o.arm || ""}${o.look || 0}`;
      g.imageSmoothingEnabled = false; g.drawImage(uSprite(p, key, o, flip), Math.round(x - 24), y, 48, 93); g.imageSmoothingEnabled = true;
    }
    if (cl.mode === "sad" || cl.mode === "meh") drop(x + 17, 40 + Math.sin(cl.t * 4), 2.4);
    if (cl.mode === "happy") for (let k = 0; k < 3; k++) { const a = cl.t * 3 + k * 2.1; heart(x + Math.cos(a) * 28, 36 + Math.sin(a) * 7, 4.2, k % 2 ? "#ff7eb0" : "#ff5a8a"); }
  };
  // 미리보기 기기(오른쪽). 반환: 화면 영역
  const drawDevice = (scr) => {
    const frame = (x, y, w, h, r) => { g.save(); g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 6 * KS; g.shadowOffsetY = 2 * KS; rrect(g, x, y, w, h, r); const q = g.createLinearGradient(x, y, x + w, y + h); q.addColorStop(0, "#4a4c62"); q.addColorStop(0.5, "#24263a"); q.addColorStop(1, "#15161f"); g.fillStyle = q; g.fill(); g.restore(); rrect(g, x + 0.3, y + 0.3, w - 0.6, h - 0.6, r); g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 0.35; g.stroke(); };
    if (scr === "tab") { frame(96, 30, 62, 48, 4); g.fillStyle = "#555a70"; g.beginPath(); g.arc(156.6, 54, 0.6, 0, 6.3); g.fill(); return { x: 99, y: 33.5, w: 56, h: 41 }; }
    if (scr === "pc") {
      let q = g.createLinearGradient(122, 0, 132, 0); q.addColorStop(0, "#6a6a78"); q.addColorStop(0.5, "#a4a6b4"); q.addColorStop(1, "#5a5a68"); g.fillStyle = q; g.beginPath(); g.moveTo(123, 63); g.lineTo(131, 63); g.lineTo(132.5, 73); g.lineTo(121.5, 73); g.fill();
      rrect(g, 112, 72.6, 30, 3, 1.4); q = g.createLinearGradient(0, 72.6, 0, 75.6); q.addColorStop(0, "#c4c6d2"); q.addColorStop(1, "#6a6a78"); g.fillStyle = q; g.fill();
      frame(96, 20, 62, 44, 2.6); return { x: 98, y: 22, w: 58, h: 38 };
    }
    frame(105, 8, 44, 92, 7); rrect(g, 121.5, 10.2, 11, 2.2, 1.1); g.fillStyle = "#06070c"; g.fill(); g.fillStyle = "#3a3c50"; g.fillRect(149, 28, 0.6, 8);
    return { x: 107.6, y: 13.6, w: 38.8, h: 81, r: 3 };
  };
  const drawPreview = (tm) => {
    if (!app) {
      const r = drawDevice("phone");
      rrect(g, r.x, r.y, r.w, r.h, r.r); const q = g.createLinearGradient(0, r.y, 0, r.y + r.h); q.addColorStop(0, "#1a2040"); q.addColorStop(1, "#10142a"); g.fillStyle = q; g.fill();
      // 코디 로고(물음표 말풍선)
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + Math.sin(tm * 3) * 0.8;
      g.fillStyle = "rgba(124,156,255,.16)"; g.beginPath(); g.arc(cx, cy, 10, 0, 6.3); g.fill();
      rrect(g, cx - 6.5, cy - 6, 13, 11, 3); g.fillStyle = "#2a3260"; g.fill(); g.beginPath(); g.moveTo(cx - 2, cy + 4.6); g.lineTo(cx - 4, cy + 8); g.lineTo(cx + 1.5, cy + 4.6); g.fill();
      g.fillStyle = "#9fb4ff"; g.font = "900 8px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", cx, cy + 0.2);
      g.fillStyle = "#7a84c0"; g.font = "800 5.2px sans-serif"; g.fillText("코디 대기 중", cx, r.y + r.h - 9);
      return;
    }
    const r = drawDevice(app.scr);
    g.save(); rrect(g, r.x, r.y, r.w, r.h, r.r || 0.8); g.clip();
    g.save(); g.beginPath(); g.rect(r.x, r.y, r.w, r.h * appRev); g.clip();
    drawApp(g, r, app, tm); g.restore();
    if (appRev < 1) { const yy = r.y + r.h * appRev; g.fillStyle = "#10142a"; g.fillRect(r.x, yy, r.w, r.h - r.h * appRev); const q = g.createLinearGradient(0, yy - 3, 0, yy + 1); q.addColorStop(0, "rgba(124,156,255,0)"); q.addColorStop(1, "rgba(160,190,255,.9)"); g.fillStyle = q; g.fillRect(r.x, yy - 3, r.w, 4); g.fillStyle = "#fff"; g.fillRect(r.x, yy, r.w, 0.4); }
    // 화면 유리 반사
    const gl = g.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); gl.addColorStop(0, "rgba(255,255,255,.12)"); gl.addColorStop(0.35, "rgba(255,255,255,0)"); g.fillStyle = gl; g.fillRect(r.x, r.y, r.w, r.h);
    g.restore();
    // 판정 표시(체크/엑스 도장)
    if (phase === "react" && phT > 0.15) {
      const ok = cl && cl.mode === "happy", sx = r.x + r.w - 5, sy = r.y + 5.5, sc = Math.min(1, (phT - 0.15) * 6);
      g.save(); g.translate(sx, sy); g.scale(0.6 + 0.4 * sc, 0.6 + 0.4 * sc);
      g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(0.3, 0.5, 4.4, 0, 6.3); g.fill();
      const q = g.createRadialGradient(-1.2, -1.4, 0.3, 0, 0, 4.4); q.addColorStop(0, ok ? "#9af5c4" : "#ffb0b0"); q.addColorStop(1, ok ? "#22a868" : "#e03a3a"); g.fillStyle = q; g.beginPath(); g.arc(0, 0, 4.2, 0, 6.3); g.fill();
      g.strokeStyle = "#fff"; g.lineWidth = 0.4; g.stroke(); g.lineWidth = 1.1; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
      if (ok) { g.moveTo(-2, 0); g.lineTo(-0.6, 1.5); g.lineTo(2.1, -1.5); } else { g.moveTo(-1.6, -1.6); g.lineTo(1.6, 1.6); g.moveTo(1.6, -1.6); g.lineTo(-1.6, 1.6); }
      g.stroke(); g.restore();
    }
  };
  // 노트북 + 코디(책상 띠)
  const drawLaptop = (tm) => {
    const oy = SCN, run = phase === "run";
    // 노트북 화면
    g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 4 * KS; rrect(g, 3, oy + 6, 37, 27, 2); g.fillStyle = "#3a3e52"; g.fill(); g.restore();
    rrect(g, 4.2, oy + 7.2, 34.6, 24.6, 1.2); let q = g.createLinearGradient(0, oy + 7, 0, oy + 32); q.addColorStop(0, "#101528"); q.addColorStop(1, "#0a0d1a"); g.fillStyle = q; g.fill();
    const n = run ? Math.min(codeLines.length, Math.floor(phT * 14)) : 0;
    const line = (x, y, len, c) => { rrect(g, x, y, len, 1.1, 0.55); g.fillStyle = c; g.fill(); };
    if (run) { const vis = codeLines.slice(Math.max(0, n - 7), n); vis.forEach((l, i) => line(6 + l.ind, oy + 9 + i * 3, Math.min(l.len, 30 - l.ind), l.c)); if (Math.floor(tm * 6) % 2) line(6, oy + 9 + vis.length * 3, 2, "#ffffff"); }
    else { [[0, 10, "#7c9cff"], [2, 16, "#5a6290"], [2, 12, "#5a6290"], [0, 6, "#7c9cff"]].forEach(([ind, len, c], i) => line(6 + ind, oy + 9 + i * 3, len, c)); if (Math.floor(tm * 2) % 2) line(6, oy + 21, 2, "#ffffff"); }
    q = g.createLinearGradient(4, oy + 7, 30, oy + 30); q.addColorStop(0, "rgba(255,255,255,.08)"); q.addColorStop(0.4, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(4.2, oy + 7.2, 34.6, 24.6);
    // 코디: 노트북 위로 빼꼼(둥근 로봇)
    const cx = 22, cy = oy - 1 + (codiMood === "happy" ? -Math.abs(Math.sin(tm * 10)) * 2 : run ? Math.sin(tm * 30) * 0.4 : Math.sin(tm * 2) * 0.3);
    g.strokeStyle = "#9aa6d8"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx, cy - 9); g.stroke();
    const ac = Math.floor(tm * 3) % 2 ? "#ffd23f" : "#ff7ab0"; g.fillStyle = ac; g.beginPath(); g.arc(cx, cy - 9.6, 1.2, 0, 6.3); g.fill();
    q = g.createRadialGradient(cx, cy - 9.6, 0, cx, cy - 9.6, 4); q.addColorStop(0, ac + "88"); q.addColorStop(1, ac + "00"); g.fillStyle = q; g.fillRect(cx - 4, cy - 13.6, 8, 8);
    rrect(g, cx - 8, cy - 6.4, 16, 12, 4.4); q = g.createLinearGradient(0, cy - 6.4, 0, cy + 5.6); q.addColorStop(0, "#b8c8ff"); q.addColorStop(0.4, "#7c9cff"); q.addColorStop(1, "#4a64d0"); g.fillStyle = q; g.fill();
    g.strokeStyle = "#1a1e38"; g.lineWidth = 0.5; g.stroke();
    rrect(g, cx - 6, cy - 4.2, 12, 7.4, 3); g.fillStyle = "#121834"; g.fill();
    const ec = "#5ff0ff"; g.strokeStyle = ec; g.fillStyle = ec; g.lineWidth = 0.8; g.lineCap = "round"; g.shadowColor = ec; g.shadowBlur = 2 * KS;
    if (codiMood === "happy") { g.beginPath(); g.arc(cx - 2.6, cy, 1.3, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(cx + 1.4, cy - 0.5); g.arc(cx + 2.6, cy, 1.3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (codiMood === "sad") { g.beginPath(); g.moveTo(cx - 3.8, cy - 0.6); g.lineTo(cx - 1.4, cy + 0.2); g.moveTo(cx + 3.8, cy - 0.6); g.lineTo(cx + 1.4, cy + 0.2); g.stroke(); }
    else if (run) { const s2 = Math.sin(tm * 9) * 1; g.beginPath(); g.arc(cx - 2.6 + s2, cy - 0.3, 1, 0, 6.3); g.arc(cx + 2.6 + s2, cy - 0.3, 1, 0, 6.3); g.fill(); }
    else if (Math.floor(tm * 1.3) % 5 === 0) { g.beginPath(); g.moveTo(cx - 3.6, cy); g.lineTo(cx - 1.6, cy); g.moveTo(cx + 1.6, cy); g.lineTo(cx + 3.6, cy); g.stroke(); }
    else { g.beginPath(); g.ellipse(cx - 2.6, cy - 0.3, 1, 1.3, 0, 0, 6.3); g.ellipse(cx + 2.6, cy - 0.3, 1, 1.3, 0, 0, 6.3); g.fill(); }
    g.shadowBlur = 0;
    // 손(노트북 모서리 잡기)
    g.fillStyle = "#7c9cff"; for (const hx of [cx - 9, cx + 9]) { g.beginPath(); g.ellipse(hx, oy + 6.2, 1.8, 1.2, 0, 0, 6.3); g.fill(); }
    if (run) for (let k = 0; k < 3; k++) if (Math.floor(tm * 12 + k) % 3 === 0) { g.fillStyle = "rgba(255,255,255,.55)"; rrect(g, 8 + k * 10 + rint(4), oy + 33.5, 3, 0.8, 0.4); g.fill(); }
  };
  const render = (tm) => {
    g.clearRect(0, 0, W, H);
    const sid = (cur || PRAC).id;
    g.drawImage(bgOf(sid), 0, 0, W, SCN);
    drawClient(tm);
    g.drawImage(frOf(sid), 0, 0, 92, SCN);
    const steam = (x, y, t, a) => { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(x, y, 1 + t * 1.4, 0, 6.3); g.fill(); };
    if (sid === "snk") for (let k = 0; k < 3; k++) { const t = (tm * 0.8 + k / 3) % 1; steam(68 + k * 8 + Math.sin(t * 6 + k) * 2, 78 - t * 16, t, 0.35 * (1 - t)); }
    if (sid === "caf") for (let k = 0; k < 2; k++) { const t = (tm * 0.7 + k / 2) % 1; steam(9.8 + Math.sin(t * 7) * 1.5, 80 - t * 10, t * 0.5, 0.5 * (1 - t)); }
    drawPreview(tm);
    drawDesk();
    drawLaptop(tm);
    for (const s of sparks) { g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 1, 0, 6.3); g.fill(); }
  };

  // ── 끝: 입금 알림 ──
  const endGame = (timeUp) => {
    if (over) return; over = true; guide(null); phase = "end";
    if (tm0) tm0.stop();
    if (drag) { if (drag.ghost) drag.ghost.remove(); drag = null; }
    const all3 = results.length >= 3;
    if (timeUp && cur && !results.some((r) => r.c === cur)) results.push({ c: cur, sat: 0, frac: cur._best || 0, runs, pay: 0 });
    while (results.length < 3) results.push({ c: null, sat: 0, frac: 0, runs: 0, pay: 0 });
    const satAvg = results.reduce((a, r) => a + r.sat, 0) / 3, fracAvg = results.reduce((a, r) => a + r.frac, 0) / 3;
    const first = results.filter((r) => r.c && r.runs === 1 && r.sat >= 1).length;
    const speed = all3 && tm0 ? clamp(tm0.left() / (T * 0.35), 0, 1) * clamp(results.reduce((a, r) => a + r.sat, 0) / 3, 0, 1) : 0;
    const score = clamp(0.88 * satAvg + 0.12 * speed, 0, 1);
    const total = results.reduce((a, r) => a + r.pay, 0), done = results.filter((r) => r.pay > 0).length;
    if (timeUp) F.msg(all3 ? "마감!" : "마감! 시간이 다 됐어요");
    // 폰 배경(벡터 밤하늘 + 도시)
    const wp = document.createElement("canvas"); wp.width = 45 * 8; wp.height = 64 * 8;
    { const d = wp.getContext("2d"); d.setTransform(8, 0, 0, 8, 0, 0); let q = d.createLinearGradient(0, 0, 0, 64); q.addColorStop(0, "#141238"); q.addColorStop(0.6, "#3a2a6a"); q.addColorStop(1, "#7a4a7a"); d.fillStyle = q; d.fillRect(0, 0, 45, 64);
      for (let k = 0; k < 26; k++) { d.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; d.beginPath(); d.arc(rnd() * 45, rnd() * 36, 0.12 + rnd() * 0.25, 0, 6.3); d.fill(); }
      q = d.createRadialGradient(35, 8.5, 0, 35, 8.5, 7); q.addColorStop(0, "rgba(255,233,168,.5)"); q.addColorStop(1, "rgba(255,233,168,0)"); d.fillStyle = q; d.fillRect(26, 0, 18, 18);
      d.fillStyle = "#ffe9a8"; d.beginPath(); d.arc(35, 8.5, 2.6, 0, 6.3); d.fill(); d.fillStyle = "#1c1840"; d.beginPath(); d.arc(36.3, 7.6, 2.3, 0, 6.3); d.fill();
      let x = -1; while (x < 46) { const bw = 3 + rnd() * 4.5, bh = 8 + rnd() * 15; q = d.createLinearGradient(0, 64 - bh, 0, 64); q.addColorStop(0, "#1e2148"); q.addColorStop(1, "#0e1028"); d.fillStyle = q; d.fillRect(x, 64 - bh, bw - 0.3, bh); d.fillStyle = "#ffd27a"; for (let yy = 64 - bh + 1.6; yy < 63; yy += 2.2) for (let xx = x + 0.7; xx < x + bw - 1; xx += 1.4) if (rnd() < 0.35) d.fillRect(xx, yy, 0.6, 0.9); x += bw; } }
    const last = [...results].reverse().find((r) => r.c && r.pay > 0) || results.find((r) => r.c) || { c: cur || PRAC };
    const happy = total > 0;
    endEl.innerHTML = `<div class="v1-ph2" style="background-image:url(${wp.toDataURL()})"><div class="v1-clk"><b>23:48</b><small>금요일 밤 · 퇴근 후</small></div><div class="v1-nots"></div></div>
      <div class="v1-sum">이번 달 외주 부수입<b>+${wonS(total)}원</b></div><div class="v1-ecl"></div><div class="v1-esay"></div><div class="v1-me"></div>`;
    const ecl = endEl.querySelector(".v1-ecl"), esay = endEl.querySelector(".v1-esay"), meEl = endEl.querySelector(".v1-me"), nots = endEl.querySelector(".v1-nots"), sumEl = endEl.querySelector(".v1-sum");
    if (last.c) {
      const ci = img("img/body/" + SHOP[last.c.id][0] + ".webp"), i = happy ? 1 : 2;
      if (ci.ok) { ecl.style.backgroundImage = `url("${ci.im.src}")`; ecl.style.backgroundPosition = `${(i % 3) * 50}% 0%`; }
      else { const p = { spec: cliSpec(last.c), cache: {} }; ecl.classList.add("px"); try { ecl.style.backgroundImage = `url("${uSprite(p, "e", happy ? { v: "f", arm: "up" } : { v: "f", look: -1 }, false).toDataURL()}")`; } catch (e) {} }
    }
    // 내 캐릭터 그림(표정 시트 3x2). 못 불러오면 그냥 안 보인다
    {
      const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
      const hh = Math.round(clamp(H * K - 290, 60, 170)), ww = Math.round(hh * 240 / 312);
      Object.assign(meEl.style, { width: ww + "px", height: hh + "px" });
      const i = happy ? 1 : 2; meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`;
      const im = new Image(); im.onload = () => { meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp";
    }
    requestAnimationFrame(() => endEl.classList.add("on"));
    const paid = results.filter((r) => r.c && r.pay > 0), D = RM() ? 0.25 : 0.55;
    const coinURL = svgU(COIN_SVG);
    paid.forEach((r, i) => setTimeout(() => {
      if (!nots.isConnected) return;
      nots.insertAdjacentHTML("beforeend", `<div class="v1-nt"><img src="${coinURL}" alt=""><div><b>입금</b> ${r.c.who}<br><em>+${wonS(r.pay)}원</em></div></div>`);
      S.coin(); vib(15);
    }, 700 + i * D * 1000));
    if (!paid.length) setTimeout(() => { if (nots.isConnected) nots.insertAdjacentHTML("beforeend", `<div class="v1-nt none">새 입금 알림이 없어요…</div>`); SFX.fail(); }, 700);
    const tSay = 700 + Math.max(1, paid.length) * D * 1000 + 250;
    setTimeout(() => { if (!esay.isConnected) return; esay.textContent = happy ? "와, 이게 하룻밤에?" : "다음에… 다시 연락드릴게요"; esay.classList.add("on"); sumEl.classList.add("on"); if (happy) { S.yay(); F.burst([W * K / 2, 300], "#ffd23f", 14); } }, tSay);
    const line = `의뢰 ${done}건 완료 · 이번 달 외주 <b>${wonS(total)}원</b>`;
    setTimeout(() => finish(score, line, "", [["요구 맞추기", fracAvg], ["한 번에 통과", first / 3], ["속도", speed]]), tSay + 1500);
  };

  // ── 반복 ──
  let raf = 0;
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tm = now / 1000;
    if (!over) {
      el += dt; phT += dt;
      if (tut === 0 && !cur) { if (opts.retry) { tut = 0; startGame(); } else { cur = PRAC; newClient(PRAC); } }
      if (cl) {
        cl.t += dt;
        if (cl.mode === "enter") { cl.x = Math.min(46, cl.x + dt * 110); if (cl.x >= 46) arrive(); }
        if (cl.mode === "exit") { cl.x -= dt * 120; }
      }
      if (tut === 0 && phase === "ask" && cur === PRAC) tutNext(1);
      if (phase === "run") {
        if (Math.floor(phT * 22) !== Math.floor((phT - dt) * 22)) S.key();
        const d = RUN_D();
        appRev = clamp((phT - d * 0.45) / (d * 0.5), 0, 1);
        if (appRev > 0 && appRev < 0.08 && !app._b) { app._b = 1; S.build(); }
        if (phT >= d) react();
      } else if (phase === "react") {
        const ok = cl.mode === "happy" || cl.mode === "meh";
        if (!ok && phT > 0.9) { phase = "ask"; phT = 0; lastAct = el; codiMood = "idle"; cl.mode = "idle"; cbEl.classList.remove("on"); renderPrompt(); }
        if (ok && phT > 1.5) nextClient();
      } else if (phase === "leave") {
        if (cl.x < -16) { clientIdx++; if (clientIdx >= queue.length) endGame(); else { codiMood = "idle"; newClient(queue[clientIdx]); } }
      } else if (phase === "ask" && tut < 0 && clientIdx === 0 && phT > 3.2) firstHint = true;
      // 손가락
      if (tut === 1) { const nx = needCats(cur).map((k) => k + ":" + cur.need[k]).find((id) => !prompt.includes(id)), bad = prompt.find((id) => marks[id] === "bad"); guide(bad ? atChip(bad, "톡! <b>빼기</b>") : nx ? atChip(nx, prompt.length ? "이것도 <b>위로!</b>" : "끌어서 <b>위로!</b>", 1) : null); }
      else if (tut === 2) { if (phase === "ask") { const [x, y] = elXY(runB, 8); guide({ x, y, t: "<b>실행!</b>" }); } else guide(null); }
      else if (tut === 3) guide(null);
      else guide(taskNow());
    }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 90 * dt; if (s.t <= 0) sparks.splice(i, 1); }
    render(tm);
    raf = requestAnimationFrame(loop);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.vibe1 = {
    st: () => ({ tut, phase, client: cur && cur.id, clientIdx, runs, prompt: prompt.slice(), marks: { ...marks }, results: results.map((r) => ({ id: r.c && r.c.id, sat: r.sat, pay: r.pay, runs: r.runs })), el, over }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1 && phase === "ask") { const bad = prompt.find((id) => marks[id] === "bad"); if (bad) return removeChip(bad); const nx = needCats(cur).map((k) => k + ":" + cur.need[k]).find((id) => !prompt.includes(id)); if (nx) addChip(nx); }
      else if (tut === 2 && phase === "ask") doRun();
      else if (tut === 3) startGame();
    },
    auto: () => {
      if (phase !== "ask" || over) return;
      const bad = prompt.find((id) => { const k = id[0]; return k === "t" || cur.need[k] !== id.slice(2); });
      if (bad) return removeChip(bad);
      const nx = needCats(cur).map((k) => k + ":" + cur.need[k]).find((id) => !prompt.includes(id));
      if (nx) return addChip(nx);
      doRun();
    },
    bad: () => {
      if (phase !== "ask" || over) return;
      if (prompt.length < 3) { const left = trayIds.filter((id) => !prompt.includes(id)); const t = left.find((id) => id[0] === "t") || pick(left); return addChip(t); }
      doRun();
    },
  };
  const onR = () => { if (!cv.isConnected || over) removeEventListener("resize", onR); else { fit(); render(last / 1000 || 0); } }; addEventListener("resize", onR);
  updSc(); render(0); raf = requestAnimationFrame(loop);
}
