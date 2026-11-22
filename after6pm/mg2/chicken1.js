// 프랜차이즈 치킨 1탄: 치킨은 겉바속촉 (논리 좌표 160x200~250, 기기 해상도 벡터 캔버스 + 캐릭터 그림·거리 배경 그림)
// 주문표가 들어오면 반죽한 닭을 끌어 튀김 바구니에 넣는다. 연노랑 → 황금 → 갈색 → 탄 색.
// 황금색일 때 바구니를 위로 쓱 끌어 올리면 '탁탁' 기름을 턴다. 주문대로 소스 통을 톡 → 볼을 문질러 버무리고,
// 박스에 치킨무를 톡 넣으면 라이더가 가져간다. 가끔 불이 세져서 기름이 튄다(손잡이 톡).
// 끝나면 배달퉁 리뷰 알림이 쏟아진다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const W = 160, T = 30, FY = 30, OT = FY + 8;
const BX = [6, 46, 86], BW = 36;
const SAU = {
  f: { n: "후라이드", band: "#ffc23f", glaze: null },
  y: { n: "양념", band: "#e0402a", glaze: "#b8261a" },
  g: { n: "간장", band: "#8a5428", glaze: "#5e2c10" },
};
const POTS = ["f", "y", "g", "m"];
const DSTOP = [[0, "#f6e7b4"], [0.35, "#f2d27e"], [0.6, "#eaa83e"], [0.8, "#cf8226"], [1, "#874616"], [1.15, "#2e1d12"]];
const GOLD = "#eaa83e";
const RV5 = ["바삭함 미쳤다", "튀김옷이 과자처럼 바삭바삭", "양념이 끝까지 촉촉해요", "무까지 완벽, 재주문각", "사장님 손목 괜찮으세요? 너무 맛있어요", "식어도 바삭해요 ㄷㄷ", "황금색 실화냐"];
const RV4 = ["맛있는데 살짝 진하게 튀겨졌어요", "조금 늦었지만 바삭해요", "맛있어요! 다음엔 더 빨리요"];
const RVMU = ["무가 없어요… 치킨엔 무인데", "치킨무 빠졌어요ㅠ"];
const RVX = ["주문이 취소됐어요", "너무 오래 걸려서 취소했어요"];

const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); t = c01(t); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const dcol = (d) => { for (let i = 1; i < DSTOP.length; i++) if (d <= DSTOP[i][0]) { const [a, ca] = DSTOP[i - 1], [b, cb] = DSTOP[i]; return mix(ca, cb, (d - a) / (b - a)); } return DSTOP[DSTOP.length - 1][1]; };
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

// ── 벡터 그리기 도우미(고해상도 캔버스: 논리 좌표 그대로, 화면 배율은 setTransform) ──
const rr = (q, x, y, w, h, r) => { q.beginPath(); if (q.roundRect) q.roundRect(x, y, w, h, r); else q.rect(x, y, w, h); };
const lgr = (q, x0, y0, x1, y1, st) => { const gr = q.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
// 벡터 치킨 한 조각(튀김옷 결·광택). k: 0 닭다리 1 날개 2 순살. 크기 약 15x8(논리 픽셀) × s
function vPiece(q, x, y, col, k = 0, gloss = false, seed = 0, s = 1) {
  const hi = mix(col, "#fff6d8", 0.45), lo = mix(col, "#3a1e0a", 0.38), ln = mix(col, "#2a1406", 0.62);
  q.save(); q.translate(x, y); q.scale(s, s);
  let cx = 5, cy = 3;
  if (k === 0) {
    q.lineCap = "round"; q.strokeStyle = "#d8ccb0"; q.lineWidth = 1.7; q.beginPath(); q.moveTo(8.6, 4.2); q.lineTo(13, 2.8); q.stroke();
    q.strokeStyle = "#fffaf0"; q.lineWidth = 0.8; q.beginPath(); q.moveTo(8.8, 3.8); q.lineTo(12.8, 2.5); q.stroke();
    q.fillStyle = "#fffaf0"; q.strokeStyle = "#b8a888"; q.lineWidth = 0.3; q.beginPath(); q.arc(13.5, 2, 1.1, 0, 6.3); q.fill(); q.stroke(); q.beginPath(); q.arc(14.1, 3.5, 1.05, 0, 6.3); q.fill(); q.stroke();
    q.beginPath(); q.moveTo(0.4, 4.4); q.bezierCurveTo(0, 0.9, 5, -0.6, 8.3, 1.5); q.bezierCurveTo(10.6, 2.9, 10.8, 5.3, 8.6, 6.4); q.bezierCurveTo(5.6, 8.3, 0.9, 7.9, 0.4, 4.4); q.closePath(); cx = 4.4; cy = 3.2;
  } else if (k === 1) {
    q.beginPath(); q.moveTo(0.3, 2.8); q.bezierCurveTo(0.5, 0.4, 3.6, 0, 5.2, 1.4); q.bezierCurveTo(6.6, -0.3, 10.8, 0.1, 11.7, 2.5); q.bezierCurveTo(12.1, 4.8, 9.6, 6.3, 6.4, 6.1); q.bezierCurveTo(3.4, 6.1, 0, 5.1, 0.3, 2.8); q.closePath(); cx = 6; cy = 2.4;
  } else {
    q.beginPath(); q.moveTo(1, 2.1); q.bezierCurveTo(2, -0.3, 7.6, -0.5, 9.9, 1.6); q.bezierCurveTo(11.5, 3.3, 10.5, 6.7, 7.6, 7); q.bezierCurveTo(4.6, 7.4, 0.6, 6.9, 0.3, 4.7); q.bezierCurveTo(0.1, 3.7, 0.4, 2.8, 1, 2.1); q.closePath(); cx = 5; cy = 2.6;
  }
  const gr = q.createRadialGradient(cx - 1.6, cy - 1.7, 0.3, cx, cy + 1.2, 6.4);
  gr.addColorStop(0, hi); gr.addColorStop(0.5, col); gr.addColorStop(1, lo);
  q.fillStyle = gr; q.fill(); q.lineWidth = 0.5; q.strokeStyle = ln; q.stroke();
  q.save(); q.clip();
  let sd = (seed * 7 + k * 13 + 5) % 233280; const r = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 16; i++) { q.fillStyle = (i % 3 ? hi : lo) + (i % 3 ? "b0" : "80"); q.beginPath(); q.arc(r() * 11.5, r() * 7.5, 0.35 + r() * 0.6, 0, 6.3); q.fill(); }
  q.strokeStyle = lo + "90"; q.lineWidth = 0.35; for (let i = 0; i < 4; i++) { const a = r() * 10, b = 1.5 + r() * 5; q.beginPath(); q.moveTo(a, b); q.quadraticCurveTo(a + 1, b - 0.8, a + 2.2, b + 0.2); q.stroke(); }
  if (gloss) { q.fillStyle = "rgba(255,255,255,.55)"; q.beginPath(); q.ellipse(cx - 1.2, cy - 1.6, 2.2, 0.8, -0.3, 0, 6.3); q.fill(); q.fillStyle = "rgba(255,255,255,.8)"; q.beginPath(); q.arc(cx + 2.4, cy - 0.4, 0.45, 0, 6.3); q.fill(); }
  q.restore(); q.restore();
}

// 치킨 한 조각(작은 것·큰 것). P.g(그릴 캔버스)에 벡터로 그린다
const piece = (P, x, y, col, k = 0, gloss = false) => vPiece(P.g, x - 0.2, y, col, k, gloss, 3, 0.68);
const bigPiece = (P, x, y, col, k, gloss = false, seed = 0) => vPiece(P.g, x, y, col, k, gloss, seed, 1);
const PC = [[1, 1, 0, 0], [19, 0, 2, 2], [3, 11, 1, 4], [17, 12, 0, 1]];
const clusterCol = (o, coat) => { const base = dcol(o.d0 ?? 0.7); const gz = SAU[o.s].glaze; return gz ? mix(base, gz, coat * 0.85) : mix(base, "#f6dfa0", coat * 0.25); };
function cluster(P, x, y, col, gloss = false) { for (const [a, b, k, sd] of PC) bigPiece(P, x + a, y + b, col, k, gloss, sd); }

// 벡터 손가락(위를 가리킴, down 이면 뒤집기)
const HANDP = "M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z";
function fingerURL(down) {
  return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -2 30 30"><g transform="${down ? "rotate(180 9 13)" : ""}"><path d="${HANDP}" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/><path d="M3.2 3v9M7.4 10v3M10.4 11.6v2.2M13.2 13.4v1.8" stroke="#e8d8cc" stroke-width=".9" stroke-linecap="round"/></g></svg>`);
}
// 치킨무 컵(벡터, 약 11x10)
function vMu(q, x, y, s = 1) {
  q.save(); q.translate(x, y); q.scale(s, s);
  q.fillStyle = "rgba(0,0,0,.22)"; q.beginPath(); q.ellipse(5.6, 9.6, 5.2, 1, 0, 0, 6.3); q.fill();
  q.beginPath(); q.moveTo(0.6, 2.2); q.lineTo(1.6, 9); q.quadraticCurveTo(5.5, 10.2, 9.4, 9); q.lineTo(10.4, 2.2); q.closePath();
  q.fillStyle = lgr(q, 0, 0, 11, 0, [[0, "#e8eef0"], [0.35, "#ffffff"], [1, "#c8d4d6"]]); q.fill(); q.strokeStyle = "#9aa8aa"; q.lineWidth = 0.4; q.stroke();
  for (const [a, b] of [[2.6, 3.2], [5.4, 2.6], [8, 3.4], [3.8, 5.6], [6.8, 5.4]]) { rr(q, a - 1.1, b - 1, 2.2, 2, 0.4); q.fillStyle = "#fffbe4"; q.fill(); q.strokeStyle = "#e4dcae"; q.lineWidth = 0.25; q.stroke(); }
  q.beginPath(); q.ellipse(5.5, 2.2, 4.95, 1.05, 0, 0, 6.3); q.strokeStyle = "#8fc8b0"; q.lineWidth = 0.7; q.stroke();
  q.fillStyle = "rgba(255,255,255,.7)"; q.fillRect(1.6, 3.2, 0.5, 5);
  q.restore();
}
// 닫힌 치킨 박스(벡터, 약 22x15)
function vBox(q, x, y, s = 1) {
  q.save(); q.translate(x, y); q.scale(s, s);
  q.fillStyle = "rgba(0,0,0,.25)"; q.beginPath(); q.ellipse(11, 14.6, 11, 1.4, 0, 0, 6.3); q.fill();
  rr(q, 0, 4.5, 22, 9.8, 1); q.fillStyle = lgr(q, 0, 4, 0, 14, [[0, "#e6b878"], [1, "#b88448"]]); q.fill();
  q.beginPath(); q.moveTo(0.4, 4.6); q.lineTo(2, 0.4); q.lineTo(20, 0.4); q.lineTo(21.6, 4.6); q.closePath(); q.fillStyle = lgr(q, 0, 0, 0, 5, [[0, "#fbe0b0"], [1, "#e4b070"]]); q.fill();
  q.strokeStyle = "#8a5a26"; q.lineWidth = 0.4; q.stroke(); rr(q, 0, 4.5, 22, 9.8, 1); q.stroke();
  q.fillStyle = "#d8402a"; q.fillRect(0, 8.4, 22, 1.6);
  q.beginPath(); q.arc(11, 9.2, 2.9, 0, 6.3); q.fillStyle = "#ffb03b"; q.fill(); q.strokeStyle = "#a8501a"; q.lineWidth = 0.4; q.stroke();
  vPiece(q, 9.2, 8, "#eaa83e", 0, false, 1, 0.3);
  q.restore();
}
// 방법 화면 그림(벡터 80x68 세 장)
function stepPics() {
  let n = 0;
  const drum = (x, y, c, sc = 1, rot = 0) => { const id = "d" + n++, hi = mix(c, "#fff6d8", 0.45), lo = mix(c, "#3a1e0a", 0.38);
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})"><defs><radialGradient id="${id}" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>
      <path d="M8.6 4.2L13 2.8" stroke="#e8dcc0" stroke-width="1.8" stroke-linecap="round"/><circle cx="13.5" cy="2" r="1.1" fill="#fffaf0"/><circle cx="14.1" cy="3.5" r="1.05" fill="#fffaf0"/>
      <path d="M.4 4.4C0 .9 5-.6 8.3 1.5c2.3 1.4 2.5 3.8.3 4.9-3 1.9-7.7 1.5-8.2-2z" fill="url(#${id})" stroke="${mix(c, "#2a1406", 0.6)}" stroke-width=".5"/>
      <circle cx="3" cy="3" r=".6" fill="${hi}"/><circle cx="6" cy="4.6" r=".5" fill="${lo}"/><circle cx="5" cy="2" r=".45" fill="${hi}"/></g>`; };
  const bg = `<defs><linearGradient id="kb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c22"/><stop offset="1" stop-color="#1e1610"/></linearGradient></defs><rect width="80" height="68" rx="11" fill="url(#kb)"/>`;
  const hand = (x, y) => `<g transform="translate(${x} ${y}) scale(.9)"><path d="${HANDP}" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/></g>`;
  const a = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg}
    <defs><linearGradient id="oil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b848"/><stop offset="1" stop-color="#9a5a16"/></linearGradient><linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="1" stop-color="#8a929c"/></linearGradient></defs>
    <rect x="40" y="6" width="36" height="30" rx="3" fill="url(#st)"/><rect x="43" y="10" width="30" height="20" rx="2" fill="url(#oil)"/>
    <g stroke="#5a3a10" stroke-width=".5" opacity=".5"><path d="M47 10v20M52 10v20M57 10v20M62 10v20M67 10v20M43 15h30M43 20h30M43 25h30"/></g>
    <circle cx="50" cy="16" r="1.2" fill="#fff6c0" opacity=".8"/><circle cx="64" cy="22" r="1" fill="#fff6c0" opacity=".8"/><circle cx="58" cy="13" r=".8" fill="#fff6c0"/>
    <rect x="4" y="44" width="34" height="18" rx="3" fill="url(#st)"/><rect x="6" y="46" width="30" height="14" rx="2" fill="#eef0f2"/>
    ${drum(8, 48, "#f4e2b0", 1)}${drum(20, 52, "#f4e2b0", 0.95, -12)}
    <path d="M30 46C40 40 46 34 54 24" fill="none" stroke="#ffe066" stroke-width="2.2" stroke-dasharray="3.5 2.6" stroke-linecap="round"/><path d="M50 23l5-2 0 5.4" fill="none" stroke="#ffe066" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    ${hand(26, 40)}</svg>`);
  const cols = [dcol(0.25), dcol(0.7), dcol(0.92), dcol(1.12)];
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg}
    ${cols.map((c, i) => drum(3 + i * 19, 10 + (i === 1 ? -3 : 0), c, 1.05)).join("")}
    <circle cx="27.5" cy="11" r="10.5" fill="none" stroke="#ffe066" stroke-width="1.4" stroke-dasharray="2.4 1.8"/>
    <defs><linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2d27e"/><stop offset=".45" stop-color="#eaa83e"/><stop offset=".7" stop-color="#874616"/><stop offset="1" stop-color="#2e1d12"/></linearGradient></defs>
    <rect x="5" y="28" width="70" height="8" rx="4" fill="url(#bar)" stroke="#1a120c" stroke-width="1"/><rect x="21" y="26" width="14" height="12" rx="3" fill="none" stroke="#fff6b0" stroke-width="1.4"/>
    <path d="M28 62V45" stroke="#ffe066" stroke-width="2.4" stroke-linecap="round"/><path d="M23 49l5-5.4 5 5.4" fill="none" stroke="#ffe066" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="54" y="56" font-size="11" font-weight="900" text-anchor="middle" fill="#ffd23f" font-family="sans-serif">쓱!</text></svg>`);
  const star = (x, y, c) => `<path transform="translate(${x} ${y}) scale(.62)" d="M8 0l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L8 12.4 3 15.2l1.2-5.6L0 5.8l5.6-.6z" fill="${c}" stroke="#a86a00" stroke-width=".6"/>`;
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 68">${bg}
    <defs><linearGradient id="bx" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecc080"/><stop offset="1" stop-color="#b88448"/></linearGradient><linearGradient id="cu" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8eef0"/><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#c8d4d6"/></linearGradient></defs>
    <path d="M6 40l4-12h30l4 12z" fill="#fbe0b0" stroke="#8a5a26" stroke-width=".6"/><rect x="6" y="40" width="38" height="20" rx="2" fill="url(#bx)" stroke="#8a5a26" stroke-width=".6"/><rect x="6" y="48" width="38" height="3" fill="#d8402a"/><circle cx="25" cy="49.5" r="5" fill="#ffb03b" stroke="#a8501a" stroke-width=".6"/>
    ${drum(10, 31, dcol(0.7), 1)}${drum(24, 33, mix(dcol(0.7), "#b8261a", 0.8), 0.95, 10)}
    <path d="M52 44l1.6 14q6 1.6 12 0l1.6-14z" fill="url(#cu)" stroke="#9aa8aa" stroke-width=".6"/><ellipse cx="60" cy="44" rx="8" ry="1.8" fill="none" stroke="#8fc8b0" stroke-width="1"/>
    <rect x="54.6" y="46" width="3.4" height="3" rx=".6" fill="#fffbe4" stroke="#e4dcae" stroke-width=".4"/><rect x="59.6" y="45.6" width="3.4" height="3" rx=".6" fill="#fffbe4" stroke="#e4dcae" stroke-width=".4"/><rect x="57" y="50" width="3.4" height="3" rx=".6" fill="#fffbe4" stroke="#e4dcae" stroke-width=".4"/>
    ${[0, 1, 2, 3, 4].map((k) => star(6 + k * 14.4, 4, "#ffd23f")).join("")}</svg>`);
  const im = (u) => `<img src="${u}" alt="">`;
  return [[im(a), "닭을 끌어 넣기"], [im(b), "황금색에 쓱"], [im(c), "소스·무 → ★5"]];
}

export const GAME = {
  key: "chicken1", base: "chicken", jc: "#ffb03b", n: "치킨은 겉바속촉", desc: "황금색일 때 건져야 리뷰가 ★5",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 주문표가 들어오면 <b>반죽한 닭</b>을 끌어 <b>튀김 바구니</b>에 넣어요.",
    "튀김 색이 연노랑 → <b>황금</b> → 갈색 → 탄 색으로 변해요. <b>황금색일 때</b> 바구니를 <b>위로 쓱</b> 끌어 올려요. 타면 버리고 다시 튀겨야 해요.",
    "주문표대로 <b>소스 통을 톡</b> → 볼을 <b>문질러</b> 버무리고, 박스에 <b>치킨무를 톡</b>! 무를 빠뜨리면 별점이 깎여요. 불이 세지면 <b>불 손잡이를 톡</b>.",
  ],
  steps: () => {
    try { return stepPics(); } catch (e) { return [["", "닭을 끌어 넣기"], ["", "황금색에 쓱"], ["", "소스·무 → ★5"]]; }
  },
  css: `
.mg-c1st{background:#17110c!important;display:flex;align-items:center;justify-content:center}
.mg-c1w{position:relative;flex:0 0 auto}
.mg-c1w>canvas{width:100%;height:100%;display:block;image-rendering:auto;touch-action:none;cursor:pointer;border-radius:6px}
.mg-chicken1 .mg-steps img{width:80px;height:68px;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-chicken1 .mg-logo b{font-size:26px}
.mg-c1w .c1lb b{position:absolute;display:block;text-align:center;font-size:11px;font-weight:800;color:#f4e6c8;background:#2a1d14e0;border-radius:4px;white-space:nowrap;overflow:hidden;pointer-events:none;letter-spacing:-.4px}
.mg-c1w .c1lb b.on{background:#ffd23f;color:#3a2400;animation:c1blink .5s steps(2) infinite}
.mg-c1w .c1lb b.tk{color:#fff;font-size:11px;border-radius:0 0 3px 3px}
.mg-c1w .c1lb b.tk.dim{opacity:.55}
.mg-c1w .c1lb b.br{background:none;color:#ffcf5a;font-size:12px;font-weight:900;letter-spacing:1px;text-shadow:0 1px 0 #6a3a0a,0 0 4px #000a}
.mg-c1w .c1lb b.ge{background:#0000;color:#ffe9a8;font-size:11px}
@keyframes c1blink{50%{filter:brightness(1.3)}}
.mg-c1w .c1go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-c1w .c1go.on{display:block}
.mg-c1w .c1go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;filter:drop-shadow(0 2px 1px #0009)}
.mg-c1w .c1go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffb03b}
.mg-c1w .c1go span b{color:#d8402a}
.mg-c1w .c1go.dn i{top:-37px;animation:c1tapd .7s infinite}
.mg-c1w .c1go.dn span{bottom:44px}
.mg-c1w .c1go.up i{top:2px;animation:c1tapu .7s infinite}
.mg-c1w .c1go.up span{top:46px}
.mg-c1w .c1go.sw i{animation:c1sw .9s infinite}
.mg-c1w .c1go.lf i{animation:c1lf .9s infinite}
.mg-c1w .c1go.dr i{animation:c1dr 1.3s ease-in-out infinite}
@keyframes c1tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c1tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c1sw{0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}
@keyframes c1lf{0%{transform:translateY(16px)}70%{transform:translateY(-22px)}100%{transform:translateY(-22px);opacity:0}}
@keyframes c1dr{0%{transform:translate(0,0)}15%{transform:translate(0,0) scale(.9)}75%,100%{transform:translate(var(--dx),var(--dy)) scale(.9)}}
.mg-c1w .c1tut{position:absolute;left:8px;right:8px;top:24%;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-c1w .c1tut.low{top:auto;bottom:40%}
.mg-c1w .c1tut.off{opacity:0;visibility:hidden}
.mg-c1w .c1tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #ffb03b;max-width:290px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-c1w .c1tut.pop .c1tc{animation:c1pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-c1w .c1tc em{font-style:normal;display:inline-block;background:#d8701a;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-c1w .c1tc p{margin:0}.mg-c1w .c1tc b{color:#c0601a}.mg-c1w .c1tc b.rd{color:#c0392b}
.mg-c1w .c1tb{margin-top:6px;display:flex;justify-content:center}
.mg-c1w .c1skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-c1w .c1go2{background:linear-gradient(#ffb03b,#d8701a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4410!important;animation:c1pulse .5s infinite alternate}
@keyframes c1pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes c1pulse{to{transform:scale(1.06)}}
.mg-c1w .c1dim{position:absolute;inset:0;background:#0000;transition:background .5s;pointer-events:none;z-index:7}
.mg-c1w .c1dim.on{background:#000b}
.mg-c1w .c1end{position:absolute;left:50%;top:50%;z-index:8;width:min(82%,236px);transform:translate(-50%,-46%);pointer-events:none;animation:c1phin .5s cubic-bezier(.3,1.4,.5,1)}
@keyframes c1phin{0%{transform:translate(-50%,10%) scale(.7);opacity:0}100%{transform:translate(-50%,-46%) scale(1);opacity:1}}
.mg-c1w .c1ph{background:#1c1c22;border-radius:22px;padding:10px 7px 12px;box-shadow:0 0 0 2px #3a3a44,0 10px 24px #000a}
.mg-c1w .c1ph .nt0{width:46px;height:5px;background:#000;border-radius:3px;margin:0 auto 7px}
.mg-c1w .c1scr{background:linear-gradient(#ffcf5a,#ff9a3b);border-radius:14px;padding:8px 6px 6px;min-height:300px;overflow:hidden}
.mg-c1w .c1hd{display:flex;align-items:center;gap:6px;color:#4a2400;font-weight:900;font-size:12px;margin-bottom:6px}
.mg-c1w .c1hd img{width:28px;height:28px;border-radius:7px;box-shadow:0 1px 2px #0004}
.mg-c1w .c1hd p{margin:0;line-height:1.2}.mg-c1w .c1hd small{display:block;font-weight:700;font-size:11px;color:#7a4410}
.mg-c1w .c1avg{margin-left:auto;text-align:right;font-size:20px;color:#fff;text-shadow:0 2px 0 #b8501a;line-height:1}
.mg-c1w .c1avg i{display:block;font-style:normal;font-size:11px;color:#fff8e0;text-shadow:none;letter-spacing:1px}
.mg-c1w .c1ls{display:flex;flex-direction:column;gap:5px}
.mg-c1w .c1nt{display:flex;gap:6px;align-items:center;background:#fffdf6f2;border-radius:10px;padding:5px 7px;box-shadow:0 2px 0 #0003;animation:c1ntin .35s cubic-bezier(.3,1.5,.5,1)}
.mg-c1w .c1nt img{width:32px;height:32px;flex:0 0 auto;border-radius:50%;background:#ffe9c0;box-shadow:0 0 0 2px #fff,0 0 0 3px #ffb03b}
.mg-c1w .c1nt p{margin:0;font-size:11px;line-height:1.35;color:#3a2a1a;min-width:0}
.mg-c1w .c1nt p b{display:block;font-size:11px;color:#d8701a;letter-spacing:.5px}
.mg-c1w .c1nt.bad p b{color:#8a8070}
.mg-c1w .c1nt p span{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@keyframes c1ntin{0%{transform:translateY(-14px) scale(.9);opacity:0}100%{transform:none;opacity:1}}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "chicken1", "치킨은 겉바속촉", "mg-c1st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-c1w"><canvas></canvas><div class="mg-bubs"></div><div class="c1lb"></div><div class="c1go"><span></span><i></i></div><div class="c1tut"><div class="c1tc"><em>리허설</em><p></p><div class="c1tb"></div></div></div><div class="c1dim"></div></div>`);
  const wrap = F.stage.querySelector(".mg-c1w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), lbEl = wrap.querySelector(".c1lb"), goEl = wrap.querySelector(".c1go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".c1tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".c1tb"), dim = wrap.querySelector(".c1dim"), bubs = wrap.querySelector(".mg-bubs");
  let K = 2, H = 220, OD = 32, LIP = OT + 32, CY = 146, PR = 184, KS = 2;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const fit = () => {
    const sw = F.stage.clientWidth || 336, sh = F.stage.clientHeight || 600, r = Math.min(sw / W, sh / 200);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 250);
    const ex = H - 200; OD = 32 + Math.floor(ex * 0.4); LIP = OT + OD; PR = H - 36; CY = PR - 38 - Math.floor(ex * 0.3);
    KS = K * DPR; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); g.setTransform(KS, 0, 0, KS, 0, 0);
    wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  P.g = g;
  // ── 그림: 픽업 창 밖 거리(배경 그림), 라이더·리뷰 손님(캐릭터 그림) ──
  const ART = {};
  const art = (src, re) => { if (!ART[src]) { const r = { ok: false, im: new Image() }; r.im.onload = () => { r.ok = true; if (re) BG = bgCanvas(); }; r.im.src = src; ART[src] = r; } return ART[src]; };
  const STREET = art("img/bg/street.webp", 1), RIDERA = art("img/body/c090.webp");
  const CUST = shuffle(["c002", "c053", "c024", "c055", "c009", "c063", "c022", "c084", "c034", "c070", "c046", "c083"]);
  CUST.slice(0, 7).forEach((k) => art("img/body/" + k + ".webp"));
  // 얼굴 자르기(표정 칸 e: 0 무표정 1 웃음 2 슬픔 3 화남 4 수줍음 5 놀람)
  const faceSrc = (e, pad = 0, dy = 0) => { const c = e % 3, r = e >= 3 ? 1 : 0; return [c * 240 + 62 - pad, r * 540 + 12 - pad + dy, 116 + pad * 2, 116 + pad * 2]; };
  let BG = bgCanvas();

  // ── 배경(정적, 기기 해상도 벡터) ──
  function bgCanvas() {
    const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(H * KS); const q = c.getContext("2d"); q.setTransform(KS, 0, 0, KS, 0, 0);
    let sd = 7; const sr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    // 벽: 크림색 지하철 타일 + 위쪽 따뜻한 조명
    q.fillStyle = "#cfc6b4"; q.fillRect(0, 0, 128, CY);
    for (let y = 0, row = 0; y < CY; y += 4.5, row++) for (let x = row % 2 ? -4.5 : 0; x < 128; x += 9) {
      rr(q, x + 0.35, y + 0.35, 8.3, 3.8, 0.9); q.fillStyle = lgr(q, 0, y, 0, y + 4.2, [[0, "#fbf8f0"], [0.6, "#efe8da"], [1, "#ddd2bc"]]); q.fill();
      q.fillStyle = "rgba(255,255,255,.6)"; q.fillRect(x + 1.2, y + 0.9, 3.4, 0.4);
    }
    q.fillStyle = lgr(q, 0, 0, 128, 0, [[0, "rgba(90,60,30,.18)"], [0.5, "rgba(255,210,140,.08)"], [1, "rgba(90,60,30,.2)"]]); q.fillRect(0, 0, 128, CY);
    q.fillStyle = lgr(q, 0, 0, 0, FY, [[0, "rgba(60,40,20,.32)"], [1, "rgba(60,40,20,.02)"]]); q.fillRect(0, 0, 128, FY);
    // 주문 레일(크롬 막대)
    rr(q, 0, 1.6, 128, 2.8, 1.4); q.fillStyle = lgr(q, 0, 1.6, 0, 4.4, [[0, "#ffffff"], [0.45, "#c8ced6"], [1, "#5a626c"]]); q.fill();
    // 오른쪽 픽업 창: 나무틀 + 창밖 거리(그림) + 유리 반사
    q.fillStyle = lgr(q, 126, 0, 160, 0, [[0, "#2e1c10"], [0.15, "#6a4630"], [1, "#4a3020"]]); q.fillRect(126, 0, 34, CY);
    for (let k = 0; k < 9; k++) { q.strokeStyle = "rgba(30,16,8,.25)"; q.lineWidth = 0.3; q.beginPath(); q.moveTo(127 + k * 3.7, 0); q.bezierCurveTo(128 + k * 3.7, 40, 126 + k * 3.7, 90, 127.5 + k * 3.7, CY); q.stroke(); }
    // 주문 프린터
    rr(q, 129, 1, 29, 14, 2); q.fillStyle = lgr(q, 0, 1, 0, 15, [[0, "#5a606c"], [1, "#2a2e36"]]); q.fill();
    rr(q, 131, 3, 25, 4, 1); q.fillStyle = "#14161c"; q.fill(); rr(q, 132, 10.5, 23, 2.2, 1); q.fillStyle = "#0e1014"; q.fill();
    q.fillStyle = "rgba(63,224,122,.3)"; q.beginPath(); q.arc(153, 5, 2, 0, 6.3); q.fill(); q.fillStyle = "#3fe07a"; q.beginPath(); q.arc(153, 5, 0.9, 0, 6.3); q.fill();
    const gx = 130, gy = 18, gw = 27, gh = CY - 21;
    q.save(); rr(q, gx, gy, gw, gh, 1.5); q.clip();
    if (STREET.ok) {
      const im = STREET.im, iw = im.naturalWidth, ih = im.naturalHeight, sh = ih * 0.62, sw = sh * gw / gh;
      q.filter = "brightness(.7) saturate(1.15)"; q.drawImage(im, iw * 0.47, ih - sh - ih * 0.12, sw, sh, gx, gy, gw, gh); q.filter = "none";
      q.fillStyle = lgr(q, 0, gy, 0, CY, [[0, "rgba(20,16,60,.45)"], [1, "rgba(20,16,60,.05)"]]); q.fillRect(gx, gy, gw, gh);
    } else { q.fillStyle = lgr(q, 0, gy, 0, CY, [[0, "#1a2240"], [1, "#4a3a50"]]); q.fillRect(gx, gy, gw, gh); }
    q.fillStyle = "rgba(255,255,255,.09)"; q.beginPath(); q.moveTo(gx, gy + 30); q.lineTo(gx + gw, gy + 8); q.lineTo(gx + gw, gy + 18); q.lineTo(gx, gy + 40); q.fill();
    q.restore();
    rr(q, gx, gy, gw, gh, 1.5); q.strokeStyle = "#22140a"; q.lineWidth = 0.8; q.stroke();
    // 창턱(배달 받는 선반)
    rr(q, 128, CY - 4.5, 31, 4.5, 1); q.fillStyle = lgr(q, 0, CY - 4.5, 0, CY, [[0, "#f4f6f8"], [0.5, "#b8c0c8"], [1, "#6a727c"]]); q.fill();
    rr(q, 128, 15.6, 31, 2.4, 1); q.fillStyle = lgr(q, 0, 15.6, 0, 18, [[0, "#e8ecf0"], [1, "#7a828c"]]); q.fill();
    // 튀김기 몸통(헤어라인 스테인리스)
    q.fillStyle = lgr(q, 0, 0, 128, 0, [[0, "#949ca4"], [0.3, "#d2d8de"], [0.55, "#aab2ba"], [0.8, "#cfd5db"], [1, "#8a929a"]]); q.fillRect(0, FY, 128, CY - FY);
    q.globalAlpha = 0.16; for (let y = FY; y < CY; y += 0.9) { q.fillStyle = sr() < 0.5 ? "#ffffff" : "#4a525c"; q.fillRect(0, y, 128, 0.22); } q.globalAlpha = 1;
    rr(q, 1, FY, 126, 4, 1.4); q.fillStyle = lgr(q, 0, FY, 0, FY + 4, [[0, "#ffffff"], [0.5, "#d8dee4"], [1, "#6a727c"]]); q.fill();
    // 기름 칸: 깊이감 + 기름 빛
    rr(q, 3.5, OT - 4.5, 121, OD + 5, 2); q.fillStyle = "#2a1c0c"; q.fill();
    rr(q, 4.5, OT - 1, 119, OD + 1, 1.5); q.fillStyle = lgr(q, 0, OT, 0, LIP, [[0, "#f2c055"], [0.35, "#dc9a32"], [1, "#7e4610"]]); q.fill();
    { const rg = q.createRadialGradient(64, OT + OD * 0.35, 2, 64, OT + OD * 0.35, 70); rg.addColorStop(0, "rgba(255,236,160,.45)"); rg.addColorStop(1, "rgba(255,236,160,0)"); q.fillStyle = rg; q.fillRect(4.5, OT - 1, 119, OD + 1); }
    q.fillStyle = "rgba(40,20,0,.45)"; q.fillRect(4.5, OT - 1, 119, 1.4);
    for (const x of [44, 84]) { rr(q, x - 0.2, OT - 4.5, 2.4, OD + 5, 0.8); q.fillStyle = lgr(q, x, 0, x + 2.4, 0, [[0, "#ffffff"], [0.5, "#b8c0c8"], [1, "#6a727c"]]); q.fill(); }
    // 앞 턱
    rr(q, 0, LIP, 128, 5, 1.2); q.fillStyle = lgr(q, 0, LIP, 0, LIP + 5, [[0, "#ffffff"], [0.35, "#e0e6ec"], [1, "#68707a"]]); q.fill();
    // 앞판: 오목한 패널
    const pT = LIP + 6, pB = CY - 2, ky = Math.round((pT + 16 + pB) / 2);
    rr(q, 4, pT + 12.5, 120, pB - pT - 12.5, 2.5); q.fillStyle = lgr(q, 0, pT + 12, 0, pB, [[0, "#78808a"], [0.15, "#a2aab2"], [1, "#8a929a"]]); q.fill(); q.strokeStyle = "rgba(255,255,255,.5)"; q.lineWidth = 0.4; q.stroke();
    // 불 손잡이(온도 다이얼)
    q.fillStyle = "rgba(0,0,0,.25)"; q.beginPath(); q.arc(23.5, ky + 1.7, 9.4, 0, 6.3); q.fill();
    q.beginPath(); q.arc(23, ky + 1, 9.2, 0, 6.3); q.fillStyle = lgr(q, 14, ky - 8, 32, ky + 10, [[0, "#ffffff"], [0.5, "#b8c0c8"], [1, "#5a626c"]]); q.fill();
    { const fg = q.createRadialGradient(21, ky - 1.5, 0.5, 23, ky + 1, 7.6); fg.addColorStop(0, "#ffffff"); fg.addColorStop(1, "#e4e2da"); q.fillStyle = fg; q.beginPath(); q.arc(23, ky + 1, 7.4, 0, 6.3); q.fill(); }
    q.lineCap = "round"; for (let a = 0; a <= 12; a++) { const t = Math.PI * (0.8 + a / 12 * 1.4), r0 = a % 3 ? 5.6 : 4.8; q.strokeStyle = a > 9 ? "#e0402a" : "#3a3a44"; q.lineWidth = a % 3 ? 0.4 : 0.7; q.beginPath(); q.moveTo(23 + Math.cos(t) * r0, ky + 1 + Math.sin(t) * r0); q.lineTo(23 + Math.cos(t) * 6.6, ky + 1 + Math.sin(t) * 6.6); q.stroke(); }
    q.beginPath(); q.arc(23, ky + 1, 6.1, Math.PI * (0.8 + 1.4 * 10 / 12), Math.PI * 2.2); q.strokeStyle = "rgba(224,64,42,.55)"; q.lineWidth = 1; q.stroke();
    // 버너 창(불꽃 보이는 곳)
    rr(q, 37, ky - 2.5, 50, 10, 2); q.fillStyle = "#16181e"; q.fill(); q.strokeStyle = "#5a626c"; q.lineWidth = 0.6; q.stroke();
    // 황금닭 로고 판
    rr(q, 95, ky - 9.5, 26, 19, 3); q.fillStyle = lgr(q, 0, ky - 9, 0, ky + 9, [[0, "#3e2a1a"], [1, "#22160c"]]); q.fill(); q.strokeStyle = "#c8902a"; q.lineWidth = 0.7; q.stroke();
    { const lg2 = q.createRadialGradient(106.5, ky - 3, 0.5, 108, ky - 1, 7); lg2.addColorStop(0, "#fff0a0"); lg2.addColorStop(0.6, "#ffb03b"); lg2.addColorStop(1, "#c86a10"); q.fillStyle = lg2; q.beginPath(); q.arc(108, ky - 1, 6.2, 0, 6.3); q.fill(); }
    vPiece(q, 102.4, ky - 4.2, "#c0302a", 0, true, 4, 0.72);
    // 조리대: 원목 상판 + 스테인리스 테두리
    q.fillStyle = lgr(q, 0, CY, 0, H, [[0, "#9a7046"], [0.5, "#86603c"], [1, "#6e4c2e"]]); q.fillRect(0, CY, W, H - CY);
    for (let k = 0; k < 26; k++) { const y = CY + 4 + sr() * (H - CY - 4); q.strokeStyle = sr() < 0.5 ? "rgba(60,36,16,.22)" : "rgba(255,220,170,.12)"; q.lineWidth = 0.3 + sr() * 0.4; q.beginPath(); q.moveTo(0, y); q.bezierCurveTo(50, y + sr() * 3 - 1.5, 100, y + sr() * 3 - 1.5, W, y + sr() * 2 - 1); q.stroke(); }
    q.fillStyle = lgr(q, 0, CY, 0, CY + 4, [[0, "#ffffff"], [0.4, "#c8ced6"], [1, "#4a3420"]]); q.fillRect(0, CY, W, 4);
    q.fillStyle = lgr(q, 0, PR - 2, 0, H, [[0, "#3a2818"], [0.08, "#5a4028"], [1, "#3e2a1a"]]); q.fillRect(0, PR - 2, W, H - PR + 2);
    q.fillStyle = "rgba(255,220,160,.18)"; q.fillRect(0, PR, W, 0.5);
    // 반죽 쟁반(밀가루)
    q.fillStyle = "rgba(0,0,0,.3)"; rr(q, 4, CY + 9.5, 38, 24, 3); q.fill();
    rr(q, 3, CY + 8, 38, 24, 3); q.fillStyle = lgr(q, 0, CY + 8, 0, CY + 32, [[0, "#f6f8fa"], [1, "#9aa2aa"]]); q.fill();
    rr(q, 4.5, CY + 9.6, 35, 20.6, 2); q.fillStyle = lgr(q, 0, CY + 9, 0, CY + 30, [[0, "#f2efe6"], [1, "#e2ddd0"]]); q.fill();
    for (let k = 0; k < 40; k++) { q.fillStyle = `rgba(255,255,255,${0.4 + sr() * 0.5})`; q.beginPath(); q.arc(5.5 + sr() * 33, CY + 10.5 + sr() * 18.5, 0.25 + sr() * 0.5, 0, 6.3); q.fill(); }
    // 버무림 볼(스테인리스)
    q.fillStyle = "rgba(0,0,0,.3)"; q.beginPath(); q.ellipse(73, CY + 31, 24, 3, 0, 0, 6.3); q.fill();
    q.beginPath(); q.moveTo(46, CY + 13); q.bezierCurveTo(47, CY + 26, 58, CY + 31.5, 72, CY + 31.5); q.bezierCurveTo(86, CY + 31.5, 97, CY + 26, 98, CY + 13); q.closePath();
    q.fillStyle = lgr(q, 46, 0, 98, 0, [[0, "#6a727c"], [0.25, "#e8ecf0"], [0.45, "#a8b0b8"], [0.75, "#d8dee4"], [1, "#5a626c"]]); q.fill();
    q.beginPath(); q.ellipse(72, CY + 13, 26, 5.4, 0, 0, 6.3); q.fillStyle = lgr(q, 0, CY + 8, 0, CY + 18, [[0, "#5a626c"], [1, "#c8d0d8"]]); q.fill(); q.strokeStyle = "#f4f8fa"; q.lineWidth = 0.9; q.stroke();
    q.strokeStyle = "rgba(255,255,255,.6)"; q.lineWidth = 0.6; q.beginPath(); q.ellipse(72, CY + 20, 22, 9, 0, 2.3, 2.9); q.stroke();
    // 포장대(종이 깔린 판)
    rr(q, 102, CY + 8, 56, 26, 2.5); q.fillStyle = lgr(q, 0, CY + 8, 0, CY + 34, [[0, "#6e4e38"], [1, "#4a3020"]]); q.fill();
    rr(q, 104, CY + 10, 52, 22, 1.5); q.fillStyle = "#ece2cc"; q.fill(); q.strokeStyle = "rgba(0,0,0,.15)"; q.lineWidth = 0.4; q.stroke();
    for (let k = 0; k < 5; k++) { q.strokeStyle = "rgba(160,120,80,.22)"; q.lineWidth = 0.3; q.beginPath(); q.moveTo(105, CY + 13 + k * 4); q.lineTo(155, CY + 13 + k * 4); q.stroke(); }
    return c;
  }

  // ── 상태 ──
  const orders = [], served = [], fx = [], flies = [], drips = [];
  const bk = BX.map(() => ({ o: null, st: "empty", d: 0, age: 0, lift: 0, upT: 0, smoke: 0 }));
  const bowl = { o: null, sauce: false, coat: 0, arr: 1, pour: 0 };
  const box = { o: null, mu: false, t: 0, lid: 0, arr: 1, muArr: 0 };
  const rider = { st: "none", x: 176, t: 0, carry: 0 };
  let over = false, last = 0, t0 = 0, el = 0, oid = 0, sizT = 0, nextI = 0, mistakes = 0, burns = 0, wrongs = 0;
  let flare = null; const flares = []; let flareAt = [10.5, 20.5];
  let drag = null, rubAt = null, rubSnd = 0;
  const SCHED = [0.3, 3, 6, 9, 11.5, 14, 16.5, 19, 21.5, 23.5];
  let firstS = shuffle(["f", "y", "g"]);

  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = x * K + "px"; b.style.top = (y - 2) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1300); };
  const updSc = () => (F.sc.textContent = `배달 ${served.filter((o) => !o.cx).length} · ★${avgStar()}`);
  const avgStar = () => { const s = served.filter((o) => !o.cx); return s.length ? (s.reduce((a, o) => a + o.stars, 0) / s.length).toFixed(1) : "-"; };

  // ── 소리 ──
  const S = {
    sizzle: (n, fresh) => { noise(0.14, 5200 + rnd() * 2400, 0.008 + 0.006 * n + (fresh ? 0.03 : 0), 0, 0.6); if (rnd() < 0.25 + n * 0.15) tone(2600 + rnd() * 2600, 0.012, "square", 0.012); },
    drop: () => { noise(0.7, 3800, 0.16, 0, 0.5); noise(0.25, 900, 0.1, 0, 0.8); for (let k = 0; k < 8; k++) tone(2200 + rnd() * 3000, 0.012, "square", 0.025, 0, 0.05 + k * 0.05); },
    lift: () => { noise(0.22, 2400, 0.08, 0, 0.7); tone(300, 0.15, "sine", 0.05, 260); },
    tak: (at) => { tone(1900, 0.03, "square", 0.07, 0, at); noise(0.04, 3200, 0.12, at, 2); tone(420, 0.06, "triangle", 0.08, -100, at); },
    drip: () => tone(1700 + rnd() * 600, 0.03, "sine", 0.025, 900),
    pour: (s) => { if (s === "f") for (let k = 0; k < 6; k++) noise(0.04, 6000, 0.06, k * 0.06, 3); else { noise(0.35, 500, 0.12, 0, 1.2); tone(200, 0.3, "sine", 0.08, -80); } },
    rub: () => { noise(0.08, 700 + rnd() * 500, 0.08, 0, 1.6); tone(140 + rnd() * 40, 0.05, "sine", 0.04); },
    crunch: () => { for (let k = 0; k < 5; k++) noise(0.025, 2500 + rnd() * 2500, 0.12, k * 0.03, 2.5); },
    mu: () => { tone(500, 0.06, "sine", 0.12, 400); noise(0.05, 1200, 0.06, 0.03); },
    lid: () => { tone(160, 0.09, "sine", 0.2, -60); noise(0.05, 800, 0.1); },
    bike: () => { tone(90, 0.5, "sawtooth", 0.05, 70); tone(180, 0.45, "square", 0.02, 120, 0.05); },
    order: () => { tone(1500, 0.05, "square", 0.04); tone(1500, 0.05, "square", 0.04, 0, 0.09); for (let k = 0; k < 6; k++) noise(0.03, 3000, 0.04, 0.2 + k * 0.035, 3); },
    flare: () => { noise(0.5, 1500, 0.16, 0, 0.5); for (let k = 0; k < 10; k++) tone(2000 + rnd() * 3000, 0.015, "square", 0.04, 0, k * 0.04); },
    knob: () => { tone(900, 0.03, "square", 0.08); tone(600, 0.05, "square", 0.06, 0, 0.05); },
    burnt: () => { tone(200, 0.4, "sawtooth", 0.06, -120); noise(0.4, 600, 0.08); },
    review: (n) => { tone(1318 * Math.pow(1.03, n), 0.08, "triangle", 0.06); tone(1760 * Math.pow(1.03, n), 0.1, "triangle", 0.05, 0, 0.07); },
  };

  // ── 주문 ──
  const newOrder = (s) => {
    const o = { id: ++oid, s: s || (firstS.length ? firstS.shift() : pick(["f", "y", "y", "g", "g", "f"])), t0: el, pat: 16 * ez, st: "wait", b: -1, wrong: 0, crisp: 0, mu: false, tx: 140, d0: 0.7 };
    orders.push(o); S.order(); return o;
  };
  const waiting = () => orders.filter((o) => o.st === "wait").sort((a, b) => a.id - b.id);
  const live = () => orders.filter((o) => o.st !== "done" && o.st !== "cx");
  const finishOrder = (o, cx = false) => {
    o.st = cx ? "cx" : "done"; o.cx = cx; o.t1 = el;
    if (cx) { o.stars = 1; served.push(o); F.miss(null); F.msg("주문이 취소됐어요… 별점 ★1"); updSc(); return; }
    let s = 5; if (o.crisp < 1) s--; if (o.wrong) s--; if (!o.mu) s -= 2; if (tut < 0 && o.t1 - o.t0 > 16 * ez) s--;
    o.stars = Math.max(1, s); served.push(o);
    const [px, py] = stageXY(143, CY - 30);
    if (o.stars >= 5) { F.hit([px, py], "★5", "#ffd23f"); bubble(140, CY - 34, "바삭함 미쳤다 ★5"); }
    else { F.float([px, py], stars(o.stars), o.stars <= 3 ? "bad" : ""); if (!o.mu) bubble(140, CY - 34, "무 어디 갔어요?", "angry"); }
    S.review(served.length); updSc();
  };

  // ── 행동 ──
  const drop = (i, fromX, fromY) => {
    const b = bk[i];
    if (b.st !== "empty") { F.msg("그 바구니는 쓰는 중이에요"); SFX.tok(); return false; }
    const w = waiting()[0];
    if (!w) { F.msg("주문표가 들어오면 넣어요"); SFX.tok(); return false; }
    w.st = "fry"; w.b = i; Object.assign(b, { o: w, st: "oil", d: 0, age: 0, lift: 0, smoke: 0 });
    S.drop(); vib(18);
    for (let k = 0; k < 16; k++) fx.push({ x: BX[i] + 4 + rnd() * (BW - 8), y: OT + 6 + rnd() * 10, vx: rnd() * 50 - 25, vy: -30 - rnd() * 40, t: 0.45 + rnd() * 0.2, c: pick(["#ffe9a0", "#fff6d0", "#f0b040"]) });
    F.burst(stageXY(BX[i] + BW / 2, OT + 10), "#ffd27a", 8);
    if (tut === 1) setTimeout(() => tut === 1 && tutNext(2), 500);
    return true;
  };
  const liftB = (i) => {
    const b = bk[i]; if (b.st !== "oil") return;
    if (b.d < 0.6) { mistakes += tut < 0 ? 1 : 0; F.msg("아직 연노랑이에요! 황금색까지 조금만"); SFX.fail(); b.lift = 0.35; b.bob = 0.35; vib(10); return; }
    if (b.d >= 1) {
      burns += tut < 0 ? 1 : 0; S.burnt(); F.miss(stageXY(BX[i] + BW / 2, OT)); F.msg("탔어요… 버리고 다시 튀겨요");
      const o = b.o; o.st = "wait"; o.b = -1; o.pat = Math.max(o.pat, 6 * ez);
      for (let k = 0; k < 10; k++) fx.push({ x: BX[i] + rnd() * BW, y: OT + rnd() * 8, vx: rnd() * 16 - 8, vy: -14 - rnd() * 14, t: 0.9, c: "#3a3a40", smoke: 1 });
      Object.assign(b, { o: null, st: "empty", d: 0, lift: 0 }); return;
    }
    const o = b.o; o.crisp = b.d < 0.8 ? 1 : 0.6; o.d0 = b.d; b.st = "up"; b.upT = 0; b.lift = 0; b.bob = 0;
    S.lift(); S.tak(0.32); S.tak(0.5); vib(12);
    if (o.crisp === 1) { F.hit(stageXY(BX[i] + BW / 2, OT - 8), "황금!", "#ffd23f"); S.crunch(); }
    else F.float(stageXY(BX[i] + BW / 2, OT - 8), "살짝 진함", "bad");
    if (tut === 2) tutWait = 1;
  };
  const pour = (s) => {
    if (!bowl.o || bowl.arr < 1) { F.msg("볼이 비었어요. 튀긴 닭이 오면 버무려요"); SFX.tok(); return; }
    if (bowl.sauce) { F.msg("이제 볼을 문질러 버무려요!"); SFX.tok(); return; }
    if (s !== bowl.o.s) { if (tut < 0) { bowl.o.wrong = 1; wrongs++; } F.miss(stageXY(72, CY + 14)); F.msg(`주문표는 ${SAU[bowl.o.s].n}예요!`); return; }
    bowl.sauce = true; bowl.pour = 0.6; S.pour(s); vib(10);
    if (tut === 3) tutNext(3.5);
  };
  const rub = (dist, x, y) => {
    if (!bowl.o || bowl.arr < 1) return;
    if (!bowl.sauce) { if (dist > 3) F.msg(`먼저 ${SAU[bowl.o.s].n} 통을 톡!`); return; }
    if (bowl.coat >= 1) return;
    bowl.coat = Math.min(1, bowl.coat + dist / (85 / Math.sqrt(ez)));
    rubSnd += dist; if (rubSnd > 10) { rubSnd = 0; S.rub(); vib(4); }
    if (rnd() < 0.4) fx.push({ x: x + rnd() * 8 - 4, y: y + rnd() * 4, vx: rnd() * 30 - 15, vy: -15 - rnd() * 15, t: 0.3, c: SAU[bowl.o.s].glaze || "#fff2c0" });
    if (bowl.coat >= 1) { S.crunch(); F.float(stageXY(72, CY + 8), "착착!"); }
  };
  const addMu = () => {
    if (!box.o || box.arr < 1) { F.msg("박스에 치킨이 담기면 무를 넣어요"); SFX.tok(); return; }
    if (box.mu) { SFX.tok(); return; }
    box.mu = true; box.o.mu = true; box.muArr = 0; S.mu(); vib(10);
    F.hit(stageXY(146, CY + 14), "무!", "#ffffff");
  };
  const fixFlare = () => {
    if (!flare) return; flare.t1 = el; flare = null; S.knob(); vib(15); F.hit(stageXY(23, knobY()), "불 줄임", "#7fe0ff"); F.msg("불 조절 완료! 기름이 잠잠해요");
  };
  const knobY = () => Math.round((LIP + 6 + 16 + CY - 2) / 2);

  // ── 할 일 손가락 ──
  const FUP = fingerURL(false), FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.m || ""}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "c1go"; return; }
    const up = (o.y < 60 && o.m !== "lf") || o.m === "dr";
    goI.style.backgroundImage = `url(${up || o.m === "lf" ? FUP : FDN})`;
    goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px"; goT.innerHTML = o.t; goT.style.transform = o.x < 30 ? "translateX(-22%)" : o.x > 130 ? "translateX(-80%)" : "";
    if (o.m === "dr") { goI.style.setProperty("--dx", o.dx * K + "px"); goI.style.setProperty("--dy", o.dy * K + "px"); }
    goEl.className = "c1go on " + (o.m === "lf" ? "up lf" : up ? "up" : "dn") + (o.m === "sw" ? " sw" : o.m === "dr" ? " dr" : "");
  };
  const dragHint = (i) => ({ x: 22, y: CY + 18, t: "닭을 <b>끌어</b> 바구니로", m: "dr", dx: BX[i] + BW / 2 - 22, dy: OT + 14 - (CY + 18) });
  const taskNow = () => {
    if (flare) return { x: 23, y: knobY() - 2, t: "불 손잡이 <b>톡!</b>" };
    const gi = bk.findIndex((b) => b.st === "oil" && b.d >= 0.6 && b.d < 1);
    if (gi >= 0) return { x: BX[gi] + BW / 2, y: LIP + 4, t: bk[gi].d < 0.8 ? "황금! <b>위로 쓱</b>" : "<b>얼른</b> 건져요!", m: "lf" };
    const bi = bk.findIndex((b) => b.st === "oil" && b.d >= 1);
    if (bi >= 0) return { x: BX[bi] + BW / 2, y: LIP + 4, t: "탔어요! 건져서 <b>버리기</b>", m: "lf" };
    if (box.o && box.arr >= 1 && !box.mu) return { x: 2 + 3 * 39 + 19, y: PR + 6, t: "치킨무 <b>톡!</b>" };
    if (bowl.o && bowl.arr >= 1 && !bowl.sauce) { const i = POTS.indexOf(bowl.o.s); return { x: 2 + i * 39 + 19, y: PR + 6, t: `${SAU[bowl.o.s].n} <b>톡!</b>` }; }
    if (bowl.o && bowl.arr >= 1 && bowl.sauce && bowl.coat < 1 && !box.o) return { x: 72, y: CY + 18, t: "<b>문질러</b> 버무리기", m: "sw" };
    if (tut >= 0 || el < 9) { const e = bk.findIndex((b) => b.st === "empty"); if (e >= 0 && waiting().length) return dragHint(e); }
    return null;
  };

  // ── 리허설 ──
  let tut = 0, tutT = 0, tutWait = 0;
  const SKIP = `<button class="c1skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "low", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop"); tutEl.style.top = (n === 5 ? 30 : n === 1 ? LIP + 19 : n === 2 ? CY + 2 : FY + 2) * K + "px";
    if (n === 1) { tutP.innerHTML = `주문표가 들어왔어요! (위 레일)<br>아래 <b>반죽한 닭</b>을 <b>끌어서</b> 튀김 바구니에 넣어요.`; tutB.innerHTML = SKIP; }
    else if (n === 2) { tutP.innerHTML = `지글지글~ 색이 <b>연노랑 → 황금 → 갈색 → 탄 색</b>으로 변해요.<br><b>황금색</b>이 되면 바구니를 <b>위로 쓱</b> 끌어 올려요!`; tutB.innerHTML = SKIP; }
    else if (n === 3) { tutP.innerHTML = `주문표가 <b class="rd">${SAU[bowl.o ? bowl.o.s : "y"].n}</b>예요.<br>아래 <b>${SAU[bowl.o ? bowl.o.s : "y"].n} 통을 톡</b> 해서 소스를 부어요.`; tutB.innerHTML = SKIP; }
    else if (n === 3.5) { tutP.innerHTML = `이제 <b>볼을 문질러</b> 골고루 버무려요!`; tutB.innerHTML = SKIP; }
    else if (n === 4) { tutP.innerHTML = `박스에 담겼어요. <b>치킨무를 톡!</b><br>무를 빠뜨리면 <b class="rd">별점이 깎여요</b>.`; tutB.innerHTML = SKIP; }
    else if (n === 5) {
      tutP.innerHTML = `좋아요! 영업 중엔 주문이 몰려요.<br>바구니 <b>3개</b>를 같이 굴리고,<br><b class="rd">불이 세지면</b> 기름이 튀어요 → <b>불 손잡이 톡</b>!<br>할 일은 <b>손가락</b>이 짚어 줘요.`;
      tutB.innerHTML = `<button class="c1go2" data-go>영업 시작!</button>`;
    }
  };
  const resetAll = () => {
    orders.length = 0; served.length = 0; flies.length = 0; fx.length = 0;
    bk.forEach((b) => Object.assign(b, { o: null, st: "empty", d: 0, age: 0, lift: 0, upT: 0, smoke: 0 }));
    Object.assign(bowl, { o: null, sauce: false, coat: 0, arr: 1, pour: 0 }); Object.assign(box, { o: null, mu: false, t: 0, lid: 0, arr: 1, muArr: 0 });
    Object.assign(rider, { st: "none", x: 176, t: 0, carry: 0 }); flare = null; flares.length = 0; mistakes = 0; burns = 0; wrongs = 0; oid = 0; nextI = 0;
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null); drag = null;
    resetAll(); firstS = shuffle(["f", "y", "g"]); t0 = 0; el = 0; SFX.go?.();
    timer(T, F.bar, end); updSc();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 입력 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const bkAt = (x, y) => { if (y < OT - 18 || y > LIP + 16) return -1; for (let i = 0; i < 3; i++) if (x >= BX[i] - 2 && x < BX[i] + BW + 2) return i; return -1; };
  const allow = (kind) => tut < 0 || (tut === 1 && kind === "raw") || (tut === 2 && kind === "bk") || (tut === 3 && kind === "pot") || (tut === 3.5 && kind === "rub") || (tut === 4 && kind === "mu");
  const down = (x, y) => {
    if (over || tut === 0 || tut === 5) return;
    if (flare && Math.abs(x - 23) < 12 && Math.abs(y - knobY()) < 12) return fixFlare();
    if (y >= PR - 1) { const i = clamp(Math.floor((x - 2) / 39), 0, 3); if (i === 3) { if (allow("mu")) addMu(); } else if (allow("pot")) pour(POTS[i]); return; }
    if (x < 42 && y >= CY + 4) { if (!allow("raw")) return; drag = { k: "raw", x, y, x0: x, y0: y }; SFX.tok(); return; }
    const bi = bkAt(x, y); if (bi >= 0) { if (!allow("bk")) return; drag = { k: "bk", i: bi, y0: y, done: false }; return; }
    if (x >= 44 && x < 100 && y >= CY + 4 && y < PR) { if (!allow("rub")) return; drag = { k: "rub" }; rubAt = [x, y]; rub(4, x, y); return; }
    if (x >= 102 && y >= CY + 4 && y < PR) { if (box.o && !box.mu) { F.msg("오른쪽 아래 치킨무 통을 톡!"); SFX.tok(); } return; }
  };
  const move = (x, y, px, py) => {
    if (!drag || over) return;
    if (drag.k === "raw") { drag.x = x; drag.y = y; }
    else if (drag.k === "bk" && !drag.done) { if (drag.y0 - y > 7) { drag.done = true; liftB(drag.i); } }
    else if (drag.k === "rub") { if (x >= 40 && x < 104 && y >= CY && y < PR + 2) { rubAt = [x, y]; rub(Math.hypot(x - px, y - py), x, y); } else rubAt = null; }
  };
  const upE = (x, y) => {
    if (!drag) return; const d = drag; drag = null; rubAt = null;
    if (d.k === "raw") {
      const bi = bkAt(x, y);
      if (bi >= 0) drop(bi);
      else if (Math.hypot(x - d.x0, y - d.y0) < 5) { const e = bk.findIndex((b) => b.st === "empty"); if (e >= 0 && waiting().length) drop(e); else drop(0); }
      else { F.msg("튀김 바구니 위에서 놓아요"); SFX.tok(); }
    } else if (d.k === "bk" && !d.done && bk[d.i].st === "oil") F.msg("바구니를 위로 쓱 끌어 올려요!");
  };
  let lastP = null;
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = toL(e); lastP = [x, y]; down(x, y); });
  cv.addEventListener("pointermove", (e) => { if (!lastP) return; const [x, y] = toL(e); move(x, y, lastP[0], lastP[1]); lastP = [x, y]; });
  const up = (e) => { const [x, y] = lastP ? (e && e.clientX != null ? toL(e) : lastP) : [0, 0]; upE(x, y); lastP = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", () => { drag = null; rubAt = null; lastP = null; });

  // ── 이름표 ──
  lbEl.innerHTML = `<b>반죽 닭</b><b>버무림 볼</b><b>포장</b>` + POTS.map((s) => `<b>${s === "m" ? "치킨무" : SAU[s].n}</b>`).join("") + `<b class="br">황금닭</b><b class="ge">불</b>` + [0, 1, 2, 3].map(() => `<b class="tk"></b>`).join("");
  const lbs = [...lbEl.children];
  const place = (b, x, y, w, h) => Object.assign(b.style, { left: x * K + "px", top: y * K + "px", width: w * K + "px", height: h * K + "px", lineHeight: h * K + "px" });
  const placeLb = () => {
    place(lbs[0], 3, PR - 11, 38, 9); place(lbs[1], 48, PR - 11, 48, 9); place(lbs[2], 104, PR - 11, 52, 9);
    for (let i = 0; i < 4; i++) place(lbs[3 + i], 3 + i * 39, H - 10, 36, 9);
    const ky = knobY(); place(lbs[7], 92, ky + 9, 32, 10); place(lbs[8], 13, ky + 10, 20, 8);
  };
  placeLb();
  const setLb = (b, t, c) => { if (b.textContent !== t) b.textContent = t; if (b.className !== c) b.className = c; };
  const lbUpd = () => {
    const needSauce = bowl.o && bowl.arr >= 1 && !bowl.sauce, needMu = box.o && box.arr >= 1 && !box.mu;
    setLb(lbs[0], "반죽 닭", waiting().length && bk.some((b) => b.st === "empty") && tut !== 0 ? "on" : "");
    setLb(lbs[1], bowl.o && bowl.sauce && bowl.coat < 1 ? "문질러요!" : "버무림 볼", bowl.o && bowl.sauce && bowl.coat < 1 ? "on" : "");
    setLb(lbs[2], needMu ? "무 넣기!" : "포장", needMu ? "on" : "");
    POTS.forEach((s, i) => setLb(lbs[3 + i], s === "m" ? "치킨무" : SAU[s].n, (needSauce && bowl.o.s === s) || (s === "m" && needMu) ? "on" : ""));
    setLb(lbs[8], flare ? "불 톡!" : "불", flare ? "ge on" : "ge");
    const L = live().sort((a, b) => a.id - b.id);
    for (let i = 0; i < 4; i++) {
      const b = lbs[9 + i], o = L[i];
      if (!o) { b.style.display = "none"; continue; }
      b.style.display = ""; place(b, Math.round(o.tx), 20, 29, 9); b.style.background = SAU[o.s].band; b.style.color = o.s === "f" ? "#3a2400" : "#fff";
      setLb(b, SAU[o.s].n, "tk" + (o.st === "wait" ? "" : " dim"));
    }
  };

  // ── 그리기(벡터) ──
  const drawTicket = (o, tm) => {
    const x = o.tx, y = 5, warn = o.st === "wait" && o.pat < 5 * ez && Math.floor(tm * 4) % 2;
    // 집게
    rr(g, x + 12, 2.2, 5, 4, 1); g.fillStyle = lgr(g, 0, 2, 0, 6, [[0, "#f4f6f8"], [1, "#6a727c"]]); g.fill();
    // 종이(그림자 + 지그재그 아래)
    g.save(); g.translate(0.6, 0.8); g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x, y, 29, 24); g.restore();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 29, y); g.lineTo(x + 29, y + 24); for (let k = 29; k > 0; k -= 2.9) g.lineTo(x + k - 1.45, y + 25.2), g.lineTo(x + k - 2.9, y + 24); g.closePath();
    g.fillStyle = warn ? "#ffe0d8" : lgr(g, 0, y, 0, y + 25, [[0, "#ffffff"], [1, "#f2eee2"]]); g.fill(); g.strokeStyle = "rgba(120,110,90,.35)"; g.lineWidth = 0.3; g.stroke();
    g.fillStyle = SAU[o.s].band; g.fillRect(x, y, 29, 1.3);
    g.fillStyle = "#8a8478"; g.fillRect(x + 2, y + 2.4, 5, 0.6); g.fillStyle = "#c8c4b4"; g.fillRect(x + 2, y + 3.8, 7, 0.5);
    const col = o.s === "f" ? GOLD : mix(GOLD, SAU[o.s].glaze, 0.8);
    vPiece(g, x + 2.4, y + 6, col, 0, o.s !== "f", o.id, 0.86);
    vMu(g, x + 18, y + 4.6, 0.8);
    if (o.st === "wait") { const r = c01(o.pat / (16 * ez)); rr(g, x + 2, y + 15.5, 25, 2.2, 1.1); g.fillStyle = "#e8e4d4"; g.fill(); if (r > 0) { rr(g, x + 2, y + 15.5, 25 * r, 2.2, 1.1); g.fillStyle = r < 0.35 ? "#e0402a" : r < 0.6 ? "#ffb03b" : "#5fc070"; g.fill(); } }
    else if (o.st === "fry") { rr(g, x + 2, y + 15.5, 25, 2.2, 1.1); g.fillStyle = "#d8dce2"; g.fill(); const p = c01(bk[o.b] ? bk[o.b].d / 0.7 : 1); rr(g, x + 2, y + 15.5, 25 * p, 2.2, 1.1); g.fillStyle = GOLD; g.fill(); }
    else { g.strokeStyle = "#3fae5a"; g.lineWidth = 1.1; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(x + 10, y + 15.6); g.lineTo(x + 12.6, y + 18); g.lineTo(x + 18, y + 13); g.stroke(); }
  };
  const drawBasket = (i, tm) => {
    const b = bk[i], x = BX[i];
    const lf = b.st === "up" || b.st === "hang" ? Math.min(1, b.lift) : b.lift > 0 && b.bob ? Math.sin((1 - b.lift / 0.35) * Math.PI) * 0.3 : 0;
    const ly = -lf * 16, by = OT + 2 + ly, bh = OD - 6;
    const shake = b.st === "up" && b.upT > 0.28 && b.upT < 0.62 ? ((b.upT > 0.3 && b.upT < 0.38) || (b.upT > 0.48 && b.upT < 0.56) ? 2 : 0) : 0;
    const yy = by + shake;
    if (lf > 0.2) { g.fillStyle = "rgba(60,30,0,.35)"; rr(g, x + 2, OT + 6, BW - 4, bh - 4, 2); g.fill(); }
    // 망 바탕
    rr(g, x, yy, BW, bh, 2); g.fillStyle = lf > 0.2 ? "rgba(70,74,80,.28)" : "rgba(60,40,10,.22)"; g.fill();
    // 치킨
    if (b.o) {
      const col = dcol(b.d), cy0 = yy + bh / 2 - 10;
      cluster(P, x, cy0, col, lf > 0.5);
      if (b.st === "oil") {
        g.fillStyle = lgr(g, 0, yy + bh * 0.45, 0, yy + bh, [[0, "rgba(220,140,30,.12)"], [1, "rgba(180,100,10,.5)"]]); g.fillRect(x, yy + bh * 0.45, BW, bh * 0.55);
        const fresh = b.age < 0.7, n = Math.round((fresh ? 26 : 5) + 12 * (1 - Math.min(1, b.d / 0.95)) + (flare ? 10 : 0));
        for (let k = 0; k < n; k++) {
          const sp = 1.8 + (k % 3) * 0.6, ph = (tm * sp + k * 0.618) % 1, cyc = Math.floor(tm * sp + k * 0.618);
          const bx2 = x + 1.5 + ((k * 37 + cyc * 13) % (BW - 3)), by2 = yy + 1.5 + ((k * 19 + cyc * 7) % (bh - 3)), rad = 0.35 + ph * 0.7;
          g.beginPath(); g.arc(bx2, by2, rad, 0, 6.3);
          if (ph < 0.8) { g.fillStyle = fresh ? "rgba(255,252,235,.75)" : "rgba(255,236,170,.7)"; g.fill(); }
          else { g.strokeStyle = "rgba(255,246,200,.8)"; g.lineWidth = 0.3; g.stroke(); }
        }
        if (fresh) for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.ellipse(x + rnd() * BW, yy + rnd() * bh, 1.1, 0.5, 0, 0, 6.3); g.fill(); }
        if (b.d >= 0.6 && b.d < 0.8) { const a = 0.5 + 0.5 * Math.sin(tm * 12); for (const [p0, p1] of [[3, 2], [BW - 5, 4], [14, bh - 4]]) { g.save(); g.translate(x + p0, yy + p1); g.globalAlpha = a; g.fillStyle = "#fff6b0"; g.beginPath(); for (let t = 0; t < 8; t++) { const r0 = t % 2 ? 0.5 : 2.2, an = t * Math.PI / 4; g.lineTo(Math.cos(an) * r0, Math.sin(an) * r0); } g.fill(); g.restore(); } g.globalAlpha = 1; }
      }
    }
    // 철망 + 테두리
    g.save(); rr(g, x, yy, BW, bh, 2); g.clip();
    g.strokeStyle = lf > 0.2 ? "rgba(170,176,186,.55)" : "rgba(110,70,20,.35)"; g.lineWidth = 0.3;
    g.beginPath(); for (let k = 2; k < BW; k += 2.6) { g.moveTo(x + k, yy); g.lineTo(x + k, yy + bh); } for (let k = 2; k < bh; k += 2.6) { g.moveTo(x, yy + k); g.lineTo(x + BW, yy + k); } g.stroke();
    g.restore();
    rr(g, x - 0.6, yy - 0.6, BW + 1.2, bh + 1.2, 2.4); g.strokeStyle = lgr(g, x, yy, x + BW, yy + bh, [[0, "#f4f8fa"], [0.5, "#a8b0b8"], [1, "#5a626c"]]); g.lineWidth = 1.1; g.stroke();
    // 손잡이(앞 턱으로 나온다)
    const hy = yy + bh + 1, hl = LIP + 10 - hy + (lf > 0.2 ? -4 : 0), rl = Math.max(2, hl - 6);
    g.strokeStyle = lgr(g, 0, hy, 0, hy + rl, [[0, "#d8dee4"], [1, "#7a828c"]]); g.lineWidth = 0.9; g.beginPath(); g.moveTo(x + 15.5, hy - 1); g.lineTo(x + 15.5, hy + rl); g.moveTo(x + 20.5, hy - 1); g.lineTo(x + 20.5, hy + rl); g.stroke();
    rr(g, x + 12.5, hy + rl, 11, 6, 2); g.fillStyle = lgr(g, 0, hy + rl, 0, hy + rl + 6, [[0, "#4a4a54"], [1, "#16161c"]]); g.fill();
    rr(g, x + 13.8, hy + rl + 2.2, 8.4, 1.6, 0.8); g.fillStyle = b.o && b.st === "oil" ? SAU[b.o.s].band : "#3a3a44"; g.fill();
  };
  const drawGauge = (i, tm) => {
    const b = bk[i], x = BX[i] + 2, y = LIP + 13, w = BW - 4;
    rr(g, x - 1, y - 1, w + 2, 6, 3); g.fillStyle = "#2a1d14"; g.fill();
    g.save(); rr(g, x, y, w, 4, 2); g.clip();
    g.fillStyle = lgr(g, x, 0, x + w, 0, [[0, "#f6e7b4"], [0.5, "#f2d27e"], [0.535, GOLD], [0.71, GOLD], [0.72, "#9a5418"], [0.89, "#874616"], [0.9, "#2e1d12"], [1, "#1a100a"]]); g.fillRect(x, y, w, 4);
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x, y, w, 1.2);
    if (b.st === "oil" && b.d >= 0.6 && b.d < 0.8 && Math.floor(tm * 8) % 2) { g.fillStyle = "rgba(255,250,180,.55)"; g.fillRect(x + 0.6 / 1.12 * w, y, 0.2 / 1.12 * w, 4); }
    g.restore();
    g.strokeStyle = "#fff6b0"; g.lineWidth = 0.5; for (const v of [0.6, 0.8]) { g.beginPath(); g.moveTo(x + v / 1.12 * w, y - 1); g.lineTo(x + v / 1.12 * w, y + 5); g.stroke(); }
    if (b.st === "oil") { const m = x + Math.min(1.12, b.d) / 1.12 * w; g.fillStyle = "#ffffff"; g.strokeStyle = "#2a1d14"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(m - 1.6, y - 3); g.lineTo(m + 1.6, y - 3); g.lineTo(m, y - 0.6); g.closePath(); g.fill(); g.stroke(); g.fillRect(m - 0.35, y - 0.6, 0.7, 5.4); }
  };
  // 라이더: 캐릭터 그림(상반신)이 픽업 창으로 걸어와 박스를 받아 간다
  const drawRider = (tm) => {
    if (rider.st === "none") return;
    g.save(); rr(g, 130, 18, 27, CY - 21, 1.5); g.clip();
    const walking = rider.st === "in" || rider.st === "out", bob = walking ? Math.abs(Math.sin(tm * 9)) * 1.2 : 0;
    const bw = 34, bh2 = bw * 312 / 240, x = rider.x - bw / 2, y = CY - 4.5 - bh2 + 6 - bob;
    if (RIDERA.ok) {
      const e = rider.st === "out" ? 1 : rider.st === "wait" ? (box.mu ? 1 : box.t > 1.8 ? 3 : 0) : 0, c = e % 3, r = e >= 3 ? 1 : 0;
      g.save(); if (rider.st === "in") { g.translate(x + bw, 0); g.scale(-1, 1); g.translate(-x, 0); }
      g.drawImage(RIDERA.im, c * 240, r * 540, 240, 312, x, y, bw, bh2); g.restore();
    } else { rr(g, x + 9, y + 6, 16, 30, 6); g.fillStyle = "#2c3550"; g.fill(); g.beginPath(); g.arc(x + 17, y + 6, 6, 0, 6.3); g.fillStyle = "#f0c8a8"; g.fill(); }
    if (rider.carry) vBox(g, x + 6, CY - 18, 1);
    g.restore();
  };
  const drawBowl = (tm) => {
    if (!bowl.o || bowl.arr < 1) return;
    const o = bowl.o, col = clusterCol(o, bowl.coat);
    cluster(P, 54, CY + 8, col, bowl.coat > 0.5 && o.s !== "f");
    if (bowl.sauce && bowl.coat < 1) {
      const gz = SAU[o.s].glaze;
      if (gz) { const r = 10 * (1 - bowl.coat); g.fillStyle = lgr(g, 0, CY + 11, 0, CY + 16, [[0, mix(gz, "#ffffff", 0.35)], [1, gz]]); g.beginPath(); g.ellipse(70, CY + 13.5, r + 1, (r + 1) * 0.32, 0, 0, 6.3); g.fill(); g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.ellipse(67, CY + 12.6, r * 0.3, 0.5, 0, 0, 6.3); g.fill(); }
      else for (let k = 0; k < Math.round(24 * (1 - bowl.coat)); k++) { g.fillStyle = "rgba(255,250,230,.9)"; g.beginPath(); g.arc(56 + ((k * 13) % 34), CY + 9 + ((k * 7) % 14), 0.45, 0, 6.3); g.fill(); }
    }
    if (bowl.pour > 0) {
      const gz = SAU[o.s].glaze;
      if (gz) { g.strokeStyle = gz; g.lineWidth = 2.6; g.lineCap = "round"; g.beginPath(); g.moveTo(69.5, CY - 7); g.quadraticCurveTo(70.5, CY + 2, 69.6, CY + 12); g.stroke(); g.strokeStyle = mix(gz, "#ffffff", 0.4); g.lineWidth = 0.7; g.beginPath(); g.moveTo(69, CY - 6); g.quadraticCurveTo(70, CY + 2, 69.2, CY + 10); g.stroke(); }
      else for (let k = 0; k < 14; k++) { g.fillStyle = "#fff6e0"; g.beginPath(); g.arc(62 + rnd() * 14, CY - 4 + rnd() * 16, 0.4, 0, 6.3); g.fill(); }
    }
    if (bowl.coat >= 1) { const a = 0.5 + 0.5 * Math.sin(tm * 10); g.globalAlpha = a; for (const [px, py] of [[58, CY + 8], [86, CY + 12], [72, CY + 20]]) { g.fillStyle = "#fff6b0"; g.beginPath(); for (let t = 0; t < 8; t++) { const r0 = t % 2 ? 0.5 : 2.2, an = t * Math.PI / 4; g.lineTo(px + Math.cos(an) * r0, py + Math.sin(an) * r0); } g.fill(); } g.globalAlpha = 1; }
  };
  const drawBox = (tm) => {
    if (!box.o || box.arr < 1) return;
    const o = box.o, x = 106, y = CY + 10, cl = box.lid;
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(x + 18, y + 18.5, 19, 2, 0, 0, 6.3); g.fill();
    // 열린 뚜껑(뒤로 젖혀짐 → 닫힘)
    if (cl < 1) { const lh = 12 * (1 - cl); g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 3, y - lh); g.lineTo(x + 33, y - lh); g.lineTo(x + 35.5, y); g.closePath(); g.fillStyle = lgr(g, 0, y - lh, 0, y, [[0, "#fbe0b0"], [1, "#d9a868"]]); g.fill(); g.strokeStyle = "#8a5a26"; g.lineWidth = 0.4; g.stroke(); if (lh > 5) { g.beginPath(); g.arc(x + 18, y - lh * 0.5, 2.6, 0, 6.3); g.fillStyle = "#ffb03b"; g.fill(); g.strokeStyle = "#a8501a"; g.stroke(); } }
    rr(g, x, y, 36, 18, 1.2); g.fillStyle = lgr(g, 0, y, 0, y + 18, [[0, "#ecc080"], [1, "#b88448"]]); g.fill(); g.strokeStyle = "#8a5a26"; g.lineWidth = 0.4; g.stroke();
    if (cl < 0.6) { rr(g, x + 2, y + 1, 32, 8, 1); g.fillStyle = "#fffdf4"; g.fill(); for (let k = 0; k < 6; k++) { g.strokeStyle = "rgba(200,180,140,.5)"; g.lineWidth = 0.25; g.beginPath(); g.moveTo(x + 3 + k * 5.4, y + 1); g.lineTo(x + 4 + k * 5.4, y + 9); g.stroke(); } cluster(P, x + 1, y - 7, clusterCol(o, 1), o.s !== "f"); }
    else { rr(g, x + 1, y + 0.5, 34, 6, 1); g.fillStyle = lgr(g, 0, y, 0, y + 6, [[0, "#fbe0b0"], [1, "#e0b070"]]); g.fill(); g.beginPath(); g.arc(x + 18, y + 3.4, 2.5, 0, 6.3); g.fillStyle = "#ffb03b"; g.fill(); vPiece(g, x + 16.4, y + 2.4, "#c0302a", 0, false, 2, 0.26); }
    g.fillStyle = SAU[o.s].band; g.fillRect(x, y + 11, 36, 2.6); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x, y + 11, 36, 0.6);
    // 무 자리
    if (box.mu) { const a = Math.min(1, box.muArr); vMu(g, 143, y + 2 - (1 - a) * 22, 1); }
    else if (Math.floor(tm * 4) % 2) { g.setLineDash([1.2, 1]); rr(g, 143.5, y + 3.5, 11, 10, 2); g.strokeStyle = "#ffffff"; g.lineWidth = 0.6; g.stroke(); g.setLineDash([]); g.fillStyle = "rgba(255,255,255,.2)"; g.fill(); }
  };
  const drawPots = (tm) => {
    POTS.forEach((s, i) => {
      const x = 2 + i * 39, y = PR + 2, act = (bowl.o && bowl.arr >= 1 && !bowl.sauce && bowl.o.s === s) || (s === "m" && box.o && !box.mu && box.arr >= 1);
      const j = act ? -Math.abs(Math.sin(tm * 10)) * 1.2 : 0, cx = x + 18;
      if (act) { const gl = g.createRadialGradient(cx, y + 12, 1, cx, y + 12, 20); gl.addColorStop(0, "rgba(255,220,90,.45)"); gl.addColorStop(1, "rgba(255,220,90,0)"); g.fillStyle = gl; g.fillRect(x, PR, 37, H - PR - 11); }
      g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(cx, y + 20.6, s === "f" ? 7 : 10.5, 1.4, 0, 0, 6.3); g.fill();
      if (s === "f") { // 시즈닝 통
        rr(g, cx - 6, y + 4 + j, 12, 16.4, 2); g.fillStyle = lgr(g, cx - 6, 0, cx + 6, 0, [[0, "#d8d2c0"], [0.35, "#ffffff"], [1, "#b8b2a0"]]); g.fill();
        rr(g, cx - 5.4, y + 0.6 + j, 10.8, 4, 1.2); g.fillStyle = lgr(g, 0, y + j, 0, y + 4.6 + j, [[0, "#ffe08a"], [1, "#d89a20"]]); g.fill();
        g.fillStyle = "#7a5010"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx - 3 + k * 2, y + 2.4 + j, 0.4, 0, 6.3); g.fill(); }
        rr(g, cx - 6, y + 9.5 + j, 12, 6, 0.6); g.fillStyle = "#ffc23f"; g.fill(); g.beginPath(); g.arc(cx, y + 12.5 + j, 2.2, 0, 6.3); g.fillStyle = "#c0302a"; g.fill();
        g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(cx - 4.6, y + 5 + j, 0.7, 14);
      } else if (s === "m") { // 무 통
        rr(g, cx - 9.5, y + 5.5 + j, 19, 15, 2); g.fillStyle = lgr(g, cx - 9, 0, cx + 9, 0, [[0, "#cfdcdc"], [0.4, "#f4fafa"], [1, "#a8b8b8"]]); g.fill(); g.strokeStyle = "#8a9a9a"; g.lineWidth = 0.4; g.stroke();
        for (let k = 0; k < 8; k++) { rr(g, cx - 7.6 + (k % 4) * 4, y + 8.6 + Math.floor(k / 4) * 4.4 + j, 3.3, 3.3, 0.6); g.fillStyle = k % 3 ? "#fffbe8" : "#f6eec8"; g.fill(); g.strokeStyle = "rgba(200,190,140,.6)"; g.lineWidth = 0.25; g.stroke(); }
        rr(g, cx - 10, y + 3.8 + j, 20, 2.4, 1); g.fillStyle = lgr(g, 0, y + 3.8 + j, 0, y + 6.2 + j, [[0, "#a8e0c4"], [1, "#5fa888"]]); g.fill();
      } else { // 소스 냄비
        const gz = SAU[s].glaze;
        g.strokeStyle = "#4a525c"; g.lineWidth = 1.4; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - 12, y + 10 + j); g.lineTo(cx - 9, y + 10 + j); g.moveTo(cx + 9, y + 10 + j); g.lineTo(cx + 12, y + 10 + j); g.stroke();
        rr(g, cx - 9.5, y + 7 + j, 19, 13.5, 2.4); g.fillStyle = lgr(g, cx - 9, 0, cx + 9, 0, [[0, "#7a828c"], [0.3, "#f4f8fa"], [0.6, "#b8c0c8"], [1, "#5a626c"]]); g.fill();
        g.beginPath(); g.ellipse(cx, y + 7.2 + j, 9.2, 2.2, 0, 0, 6.3); g.fillStyle = lgr(g, 0, y + 5 + j, 0, y + 9.4 + j, [[0, mix(gz, "#ffffff", 0.3)], [1, gz]]); g.fill(); g.strokeStyle = "#e8ecf0"; g.lineWidth = 0.6; g.stroke();
        g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.ellipse(cx - 3, y + 6.6 + j, 2.4, 0.5, 0, 0, 6.3); g.fill();
        rr(g, cx - 7, y + 12 + j, 14, 4.4, 1); g.fillStyle = SAU[s].band; g.fill();
        g.strokeStyle = "#b8905a"; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 3.6, y + 7 + j); g.lineTo(cx + 6.2, y + 0.5 + j); g.stroke(); g.fillStyle = "#d8b070"; g.beginPath(); g.ellipse(cx + 6.4, y + 0.4 + j, 1.4, 0.8, -0.5, 0, 6.3); g.fill();
      }
    });
  };
  const drawKnob = (tm) => {
    const ky = knobY();
    const ang = Math.PI * (flare ? 2.05 + Math.sin(tm * 30) * 0.05 : 1.45);
    if (flare) { const a = 0.5 + 0.5 * Math.sin(tm * 12); g.strokeStyle = `rgba(255,60,40,${0.5 + a * 0.5})`; g.lineWidth = 1.2; g.beginPath(); g.arc(23, ky + 1, 10.6 + a, 0, 6.3); g.stroke(); }
    g.strokeStyle = flare ? "#e0402a" : "#22222a"; g.lineWidth = 0.9; g.lineCap = "round"; g.beginPath(); g.moveTo(23 - Math.cos(ang) * 1.5, ky + 1 - Math.sin(ang) * 1.5); g.lineTo(23 + Math.cos(ang) * 5.6, ky + 1 + Math.sin(ang) * 5.6); g.stroke();
    g.beginPath(); g.arc(23, ky + 1, 1.5, 0, 6.3); g.fillStyle = lgr(g, 21.5, ky, 24.5, ky + 2.5, [[0, "#8a8a94"], [1, "#22222a"]]); g.fill();
    // 버너 불꽃
    const fl = flare ? 5.2 : 2.2;
    for (let k = 0; k < 9; k++) {
      const h = fl + Math.sin(tm * 22 + k * 1.7) * 0.8 + (k % 2) * 0.4, bx = 41 + k * 5, by = ky + 6;
      g.beginPath(); g.moveTo(bx - 1.5, by); g.quadraticCurveTo(bx - 1.4, by - h * 0.6, bx, by - h); g.quadraticCurveTo(bx + 1.4, by - h * 0.6, bx + 1.5, by); g.closePath();
      g.fillStyle = lgr(g, 0, by - h, 0, by, flare ? [[0, "rgba(255,200,80,.9)"], [0.5, "#ff7a2a"], [1, "#3a6aff"]] : [[0, "rgba(180,230,255,.7)"], [1, "#2f6aff"]]); g.fill();
    }
    g.fillStyle = lgr(g, 0, ky + 6, 0, ky + 8, [[0, "#5a5a64"], [1, "#1a1a20"]]); g.fillRect(38, ky + 6, 46, 1.6);
  };
  const star4 = (px, py, r0) => { g.beginPath(); for (let t = 0; t < 8; t++) { const rr0 = t % 2 ? r0 * 0.25 : r0, an = t * Math.PI / 4; g.lineTo(px + Math.cos(an) * rr0, py + Math.sin(an) * rr0); } g.fill(); };
  const render = (tm) => {
    g.drawImage(BG, 0, 0, W, H);
    // 기름 일렁임
    for (let k = 0; k < 12; k++) { const ph = (tm * 0.4 + k * 0.1) % 1, y = OT + 2 + ((k * 7) % 10) / 10 * (OD - 4); g.fillStyle = `rgba(255,236,160,${0.4 * Math.sin(ph * Math.PI)})`; g.beginPath(); g.ellipse(6 + (ph * 100 + k * 9) % 116, y, 3.4, 0.45, 0, 0, 6.3); g.fill(); }
    // 주문표
    live().sort((a, b) => a.id - b.id).slice(0, 4).forEach((o) => drawTicket(o, tm));
    const more = live().length - 4; if (more > 0) for (let k = 0; k < Math.min(more, 3); k++) { g.fillStyle = "#fffef6"; g.fillRect(124 - k * 2, 6 + k, 2, 20); }
    // 프린터 빛
    if (orders.length && el - orders[orders.length - 1].t0 < 0.6 && tut < 0) { g.fillStyle = Math.floor(tm * 10) % 2 ? "#ffffff" : "#9fe0ff"; g.fillRect(132, 10.6, 23, 2); }
    drawRider(tm);
    for (let i = 0; i < 3; i++) drawBasket(i, tm);
    // 김·연기
    bk.forEach((b, i) => {
      if (b.st !== "oil") return;
      const n = 3 + Math.round(4 * (1 - Math.min(1, b.d)));
      for (let k = 0; k < n; k++) { const ph = (tm * 0.7 + k / n + i * 0.3) % 1, xx = BX[i] + 5 + ((k * 11) % (BW - 8)) + Math.sin(tm * 2 + k) * 3, yy = OT - 2 - ph * 28; g.fillStyle = b.d >= 0.95 ? `rgba(60,60,64,${0.6 * (1 - ph)})` : `rgba(255,255,255,${0.35 * (1 - ph)})`; g.beginPath(); g.arc(xx, yy, 1.2 + ph * 2.6, 0, 6.3); g.fill(); }
    });
    for (const d of drips) { g.fillStyle = "#f0c060"; g.beginPath(); g.ellipse(d.x, d.y, 0.5, 1, 0, 0, 6.3); g.fill(); }
    for (let i = 0; i < 3; i++) drawGauge(i, tm);
    drawKnob(tm);
    drawBowl(tm); drawBox(tm); drawPots(tm);
    // 쟁반 위 반죽 닭(무한)
    for (const [a, b2, k, sd] of [[5, CY + 11, 0, 0], [22, CY + 11, 2, 3], [6, CY + 21, 1, 1], [22, CY + 21, 0, 5]]) bigPiece(P, a, b2, dcol(0.02), k, false, sd);
    // 날아가는 치킨(바구니 → 볼 → 박스)
    for (const f of flies) { const p = c01(f.t / f.dur), e = 1 - Math.pow(1 - p, 2), x = f.a[0] + (f.b[0] - f.a[0]) * e, y = f.a[1] + (f.b[1] - f.a[1]) * e - Math.sin(p * Math.PI) * 14; cluster(P, x, y, f.col, f.gloss); }
    // 끌고 있는 닭
    if (drag && drag.k === "raw") { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(drag.x + 1, drag.y + 8, 12, 2, 0, 0, 6.3); g.fill(); bigPiece(P, drag.x - 12, drag.y - 8, dcol(0.02), 0, false, 2); bigPiece(P, drag.x - 2, drag.y - 3, dcol(0.02), 2, false, 4); for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(drag.x - 6 + k * 4, drag.y + 4.5 + (k % 2) * 2 + (Math.floor(tm * 8) % 2), 0.5, 0, 6.3); g.fill(); } }
    // 문지르는 주걱
    if (rubAt) { const w = Math.sin(tm * 24); const x = rubAt[0] + w, y = rubAt[1]; g.save(); g.translate(x, y); g.rotate(0.25 + w * 0.08); rr(g, -1, -17, 2, 12.5, 1); g.fillStyle = lgr(g, -1, 0, 1, 0, [[0, "#e8c080"], [1, "#a8783a"]]); g.fill(); rr(g, -4.2, -5.5, 8.4, 6, 1.6); g.fillStyle = lgr(g, 0, -5.5, 0, 0.5, [[0, "#ffffff"], [1, "#a8b0b8"]]); g.fill(); g.restore(); }
    // 튀는 기름·불꽃·연기
    for (const s of fx) {
      if (s.smoke) { g.fillStyle = `rgba(50,50,56,${0.8 * c01(s.t)})`; g.beginPath(); g.arc(s.x, s.y, 1.4 + (1 - c01(s.t)) * 2, 0, 6.3); g.fill(); }
      else if (s.big) { const a = c01(s.t * 1.2); const gl = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 4); gl.addColorStop(0, `rgba(255,250,220,${a})`); gl.addColorStop(0.4, `rgba(255,190,60,${a * 0.8})`); gl.addColorStop(1, "rgba(255,120,20,0)"); g.fillStyle = gl; g.beginPath(); g.arc(s.x, s.y, 4, 0, 6.3); g.fill(); }
      else { g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 0.55, 0, 6.3); g.fill(); }
    }
    // 불 셈: 붉은 기운
    if (flare) { g.fillStyle = `rgba(255,90,20,${0.1 + 0.06 * Math.sin(tm * 12)})`; g.fillRect(0, 0, 128, LIP + 6); }
  };

  // ── 매 프레임 ──
  const step = (dt) => {
    // 바구니
    bk.forEach((b, i) => {
      if (b.st === "oil") {
        b.age += dt;
        let r = 0.19 * (flare ? 1.7 : 1);
        if (b.d >= 0.6 && b.d < 0.8) r /= 1.35 * ez;
        if (tut >= 0) r *= 1.15;
        b.d += r * dt;
        if (tut >= 0 && b.d > 0.74) b.d = 0.74;
        if (b.d >= 1 && !b.burnSnd) { b.burnSnd = 1; F.msg("타고 있어요! 얼른 건져서 버려요"); S.burnt(); }
        if (b.lift > 0 && b.bob) { b.lift -= dt; if (b.lift <= 0) { b.lift = 0; b.bob = 0; } }
      } else b.burnSnd = 0;
      if (b.st === "up") {
        b.upT += dt; b.lift = Math.min(1, b.lift + dt * 6);
        if (rnd() < 0.5) drips.push({ x: BX[i] + 3 + rnd() * (BW - 6), y: LIP - 19, vy: 10, t: 0.5 });
        if ((b.upT > 0.32 && b.upT < 0.34) || (b.upT > 0.5 && b.upT < 0.52)) for (let k = 0; k < 6; k++) fx.push({ x: BX[i] + rnd() * BW, y: OT + 8, vx: rnd() * 40 - 20, vy: -20 - rnd() * 25, t: 0.35, c: "#ffd27a" });
        if (b.upT > 0.7) { b.st = "hang"; }
      }
      if (b.st === "hang") {
        if (rnd() < 0.15) drips.push({ x: BX[i] + 3 + rnd() * (BW - 6), y: LIP - 19, vy: 10, t: 0.4 });
        if (!bowl.o) {
          const o = b.o; Object.assign(bowl, { o, sauce: false, coat: 0, arr: 0, pour: 0 }); o.st = "bowl";
          flies.push({ a: [BX[i] + 1, OT - 8], b: [54, CY + 8], t: 0, dur: 0.38, col: dcol(o.d0), gloss: true, to: "bowl" });
          Object.assign(b, { o: null, st: "empty", d: 0, lift: 0, upT: 0 }); SFX.whoosh();
        }
      }
    });
    for (let i = drips.length - 1; i >= 0; i--) { const d = drips[i]; d.vy += 140 * dt; d.y += d.vy * dt; d.t -= dt; if (d.t <= 0 || d.y > LIP - 2) { if (rnd() < 0.2) S.drip(); drips.splice(i, 1); } }
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i]; f.t += dt;
      if (f.t >= f.dur) { flies.splice(i, 1); if (f.to === "bowl") { bowl.arr = 1; noise(0.08, 1500, 0.1); if (tut === 2) tutNext(3); } else { box.arr = 1; S.lid(); if (tut === 3.5) tutNext(4); } }
    }
    // 볼 → 박스
    if (bowl.o && bowl.coat >= 1 && !box.o) {
      const o = bowl.o; o.st = "box"; Object.assign(box, { o, mu: false, t: 0, lid: 0, arr: 0, muArr: 0 });
      flies.push({ a: [54, CY + 8], b: [107, CY + 3], t: 0, dur: 0.32, col: clusterCol(o, 1), gloss: o.s !== "f", to: "box" });
      Object.assign(bowl, { o: null, sauce: false, coat: 0, arr: 1, pour: 0 });
    }
    bowl.pour = Math.max(0, bowl.pour - dt);
    // 박스·라이더
    if (box.o && box.arr >= 1) {
      box.t += dt; if (box.mu) { box.muArr += dt * 4; if (box.muArr >= 1) box.lid = Math.min(1, box.lid + dt * 5); }
      if (rider.st === "none") { rider.st = "in"; rider.x = 176; S.bike(); }
      const ready = (box.mu && box.lid >= 1) || (!box.mu && box.t > 3.4 * ez && tut < 0);
      if (ready && rider.st === "wait") {
        const o = box.o; if (!box.mu) F.msg("라이더가 무 없이 가져갔어요!");
        rider.st = "out"; rider.carry = 1; S.bike();
        Object.assign(box, { o: null, mu: false, t: 0, lid: 0, arr: 1, muArr: 0 });
        finishOrder(o);
        if (tut === 4) setTimeout(() => tut === 4 && tutNext(5), 700);
      }
    }
    if (rider.st === "in") { rider.x -= dt * 60; if (rider.x <= 143) { rider.x = 143; rider.st = "wait"; } }
    if (rider.st === "out") { rider.x += dt * 70; if (rider.x > 176) { rider.st = "none"; rider.carry = 0; } }
    // 불 셈
    if (flare) {
      if (rnd() < 0.6) { const i = rint(3); fx.push({ x: BX[i] + rnd() * BW, y: OT + 4 + rnd() * 10, vx: rnd() * 60 - 30, vy: -40 - rnd() * 50, t: 0.5, c: pick(["#ffd27a", "#fff6d0", "#ff9a3b"]) }); }
      if (rnd() < 0.08) { fx.push({ x: 10 + rnd() * 140, y: 40 + rnd() * (H - 80), vx: 0, vy: 0, t: 0.7, big: 1 }); noise(0.05, 4000, 0.06, 0, 2); }
      if (rnd() < 0.2) tone(2500 + rnd() * 2500, 0.012, "square", 0.03);
    }
    for (let i = fx.length - 1; i >= 0; i--) { const s = fx[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (!s.smoke && !s.big) s.vy += 160 * dt; if (s.t <= 0) fx.splice(i, 1); }
    // 지글지글
    const nOil = bk.filter((b) => b.st === "oil").length;
    if (nOil) { sizT -= dt; if (sizT <= 0) { sizT = 0.1; S.sizzle(nOil + (flare ? 2 : 0), bk.some((b) => b.st === "oil" && b.age < 0.7)); } }
    // 주문표 미끄러짐
    live().sort((a, b) => a.id - b.id).forEach((o, k) => { const tx = 3 + Math.min(k, 3) * 31; o.tx += (tx - o.tx) * Math.min(1, dt * 9); });
  };
  const gameStep = (dt) => {
    // 주문
    while (nextI < SCHED.length && el >= SCHED[nextI] * Math.pow(ez, 0.15)) { if (waiting().length >= 4) break; newOrder(); nextI++; }
    for (const o of orders) if (o.st === "wait") { o.pat -= dt; if (o.pat <= 0) finishOrder(o, true); }
    // 불 셈 사건
    if (flareAt.length && el >= flareAt[0] && !flare) { flareAt.shift(); flare = { t0: el, t1: 0 }; flares.push(flare); S.flare(); vib([40, 30, 40]); F.msg("불이 너무 세요! 기름이 튀어요 → 불 손잡이 톡"); }
  };

  let lastNow = 0;
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; lastNow = now;
    if (tut >= 0) {
      tutT += dt;
      if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else { newOrder("y"); tutNext(1); } }
      if (tut >= 1) step(dt);
      guide(tut === 1 ? dragHint(0) : tut === 2 ? (bk[0].st === "oil" && bk[0].d >= 0.6 ? { x: BX[0] + BW / 2, y: LIP + 4, t: "황금! <b>위로 쓱</b>", m: "lf" } : null) : tut === 3 || tut === 3.5 || tut === 4 ? taskNow() : null);
      if (tut === 2 && bk[0].d >= 0.6 && !tutWait && tutT > 0.5 && !tutEl.dataset.g) { tutEl.dataset.g = 1; tutP.innerHTML = `<b>황금색</b>이 됐어요! 지금 바구니를 <b>위로 쓱</b>!`; }
    } else if (!over) {
      if (!t0) t0 = now;
      el = (now - t0) / 1000;
      gameStep(dt); step(dt);
      guide(taskNow());
    }
    lbUpd();
    render(tut >= 0 ? now / 1000 : el);
    requestAnimationFrame(loop);
  };

  // ── 끝: 배달퉁 리뷰 알림 ──
  const iconURL = () => { const c = document.createElement("canvas"); c.width = c.height = 64; const q = c.getContext("2d"); q.fillStyle = "#fff3d0"; q.fillRect(0, 0, 64, 64); vPiece(q, 8, 18, GOLD, 0, true, 2, 3.2); return c.toDataURL(); };
  const appURL = () => svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8ff0"/><stop offset="1" stop-color="#1f56b0"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#a)"/><path d="M7 12h14l-1.4 9H8.4z" fill="#fff"/><path d="M9 12V9.6A5 5 0 0 1 19 9.6V12" fill="none" stroke="#ffb03b" stroke-width="2"/><circle cx="11" cy="24.5" r="2" fill="#1a1a2a"/><circle cx="20" cy="24.5" r="2" fill="#1a1a2a"/><path d="M21 15h4l2 4v4h-6z" fill="#ffd23f"/></svg>`);
  // 리뷰 손님 얼굴: 별점에 따라 웃음·슬픔·화남
  const custFace = (k, st) => {
    const a = ART["img/body/" + CUST[k % CUST.length] + ".webp"]; if (!a || !a.ok) return null;
    const c = document.createElement("canvas"); c.width = c.height = 72; const q = c.getContext("2d");
    const e = st >= 5 ? 1 : st >= 4 ? 4 : st >= 3 ? 2 : 3, [sx, sy, sw, sh] = faceSrc(e, 4, 6);
    q.drawImage(a.im, sx, sy, sw, sh, 0, 0, 72, 72); return c.toDataURL();
  };
  const end = () => {
    if (over) return; over = true; drag = null; rubAt = null; guide(null); flare = null;
    // 이미 박스에 담긴 건 마지막 라이더가 가져간다
    if (box.o) { const o = box.o; box.o = null; o.mu = box.mu; finishOrder(o); }
    const real = served.filter((o) => !o.cx), cx = served.filter((o) => o.cx);
    const due = Math.max(orders.filter((o) => o.t0 < T - 9).length, served.length, 1);
    const base = served.reduce((a, o) => a + (o.stars - 1) / 4, 0) / due;
    const safety = flares.length ? flares.reduce((a, f) => a + (f.t1 ? clamp(1 - (f.t1 - f.t0 - 1.2) / (5 * ez), 0, 1) : 0), 0) / flares.length : 1;
    let score = 0.9 * base + 0.1 * safety * (real.length ? 1 : 0) - 0.04 * burns - 0.015 * mistakes;
    score = clamp(score, 0, 1);
    const crispAvg = real.length ? real.reduce((a, o) => a + o.crisp, 0) / real.length : 0;
    const accAvg = real.length ? real.reduce((a, o) => a + (o.mu ? 1 : 0.3) * (o.wrong ? 0.6 : 1), 0) / real.length : 0;
    const thr = clamp(real.length / due, 0, 1);
    const av = avgStar();
    SFX.whoosh(); dim.classList.add("on");
    const box2 = document.createElement("div"); box2.className = "c1end";
    box2.innerHTML = `<div class="c1ph"><div class="nt0"></div><div class="c1scr"><div class="c1hd"><img src="${appURL()}" alt=""><p>배달퉁 사장님<small>황금닭 · 오늘 저녁</small></p><div class="c1avg">${av === "-" ? "-" : "★" + av}<i>리뷰 ${served.length}개</i></div></div><div class="c1ls"></div></div></div>`;
    wrap.appendChild(box2);
    const ls = box2.querySelector(".c1ls"), ic = iconURL();
    const list = served.slice().sort((a, b) => a.stars - b.stars).slice(-7);
    if (!list.length) list.push({ stars: 0, none: 1 });
    const gap = RM() ? 120 : 330;
    const pool5 = shuffle(RV5.slice(1));
    list.forEach((o, k) => setTimeout(() => {
      if (!ls.isConnected) return;
      const top5 = o.stars >= 5 && k === list.length - 1;
      const txt = o.none ? "오늘은 주문을 하나도 못 보냈어요…" : o.cx ? pick(RVX) : top5 ? "바삭함 미쳤다" : o.stars >= 5 ? (pool5.length ? pool5.shift() : pick(RV5)) : !o.mu ? pick(RVMU) : pick(RV4);
      const d = document.createElement("div"); d.className = "c1nt" + (o.stars >= 5 ? "" : " bad");
      d.innerHTML = `<img src="${(!o.none && custFace(k, o.cx ? 1 : o.stars)) || ic}" alt=""><p><b>${o.none ? "배달퉁" : stars(o.stars)}</b><span>${txt}</span></p>`;
      ls.prepend(d); while (ls.children.length > 6) ls.lastChild.remove();
      if (o.stars >= 5) { S.review(k); vib(8); } else tone(400, 0.1, "triangle", 0.06);
    }, 500 + k * gap));
    const done = 500 + list.length * gap + 1300;
    setTimeout(() => finish(score, `${real.length}마리 배달 · 평균 <b>★${av}</b>${cx.length ? ` · 취소 ${cx.length}건` : ""}`, "", [["바삭함(황금색)", crispAvg], ["주문 정확도(소스·무)", accAvg], ["처리량", thr]]), done);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.chicken1 = {
    st: () => ({ tut, el, over, orders: orders.map((o) => o.s + ":" + o.st).join(","), bk: bk.map((b) => b.st + ":" + b.d.toFixed(2)).join(","), bowl: !!bowl.o, box: !!box.o, served: served.map((o) => o.stars).join(""), flare: !!flare, burns, mistakes }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1) drop(0);
      else if (tut === 2) { if (bk[0].st === "oil" && bk[0].d >= 0.6) liftB(0); }
      else if (tut === 3) { if (bowl.o && bowl.arr >= 1) pour(bowl.o.s); }
      else if (tut === 3.5) rub(60, 72, CY + 18);
      else if (tut === 4) { if (box.o && box.arr >= 1) addMu(); }
      else if (tut === 5) startGame();
    },
    auto: (bad) => {
      if (over) return;
      if (flare && !bad) fixFlare();
      bk.forEach((b, i) => { if (b.st === "oil" && (bad ? b.d >= 0.85 : b.d >= 0.6)) liftB(i); });
      if (bowl.o && bowl.arr >= 1 && !bowl.sauce) pour(bowl.o.s);
      if (bowl.sauce) rub(60, 72, CY + 18);
      if (box.o && box.arr >= 1 && !box.mu && !bad) addMu();
      bk.forEach((b, i) => { if (b.st === "empty" && waiting().length) drop(i); });
    },
  };
  updSc(); lbUpd(); render(0); requestAnimationFrame(loop);
}
