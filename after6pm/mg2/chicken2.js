// 프랜차이즈 치킨 2탄: 치킨은 식기 전에 (논리 좌표 160x200~250, 동네 지도를 위에서 본 기기 해상도 벡터 그림 + 라이더·손님 캐릭터 그림)
// 금요일 밤 9시, 축구 하는 날. 주문 핀이 뜨고 치킨이 튀겨지면 가게 앞에 박스가 쌓인다.
// 가게 앞 라이더를 끌어 주문 핀까지 길을 긋는다. 핀 여러 개를 차례로 지나가면 한 번에 묶어 배달(가방 최대 3개).
// 핀마다 식는 시계가 있어 늦으면 별점이 깎이고 식은 치킨 리뷰가 달린다.
// 사건: 라이더 이탈, 배달대행 호출(수수료), 오배송(옆집 회수 → 원래 집), 단체 주문 폭탄.
// 끝나면 배달통 사장님 화면에 평점·매출이 집계되고, 지친 사장님이 셔터를 내린다.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const W = 160, T = 30, VX = [6, 80, 154], CAP = 3;
const PRICE = 20000, AGFEE = 4000;
const RV5 = ["아직 뜨끈뜨끈해요", "비 오는데 엄청 빨리 왔어요", "축구 보면서 먹으니 최고", "라이더님 감사해요 바삭바삭", "하프타임 전에 도착 ㄷㄷ", "튀김옷 살아 있어요"];
const RV4 = ["조금 미지근했지만 맛있어요", "살짝 늦었는데 맛은 좋아요"];
const RV3 = ["식어서 좀 눅눅해요", "전반전 끝나고 왔어요…"];
const RV2 = ["식은 치킨… 축구 다 끝났어요", "차가운 치킨은 좀…"];
const RVX = ["너무 늦어서 취소했어요", "식어서 취소할게요"];
const RVW = "다른 집에 갔다 왔대요ㅠ";
const RIDC = [{ hel: "#ffb03b", jak: "#2a2f3a", box: "#d9a868", bx2: "#e0402a" }, { hel: "#e0402a", jak: "#3a3448", box: "#d9a868", bx2: "#e0402a" }, { hel: "#4f8ad9", jak: "#2c3550", box: "#d9a868", bx2: "#e0402a" }];
const AGC = { hel: "#e8e8e8", jak: "#3e9e6a", box: "#9aa4ae", bx2: "#3e9e6a" };
// 라이더 캐릭터 그림(가게 라이더 3명, 배달대행), 손님 얼굴
const RCK = ["c090", "c095", "c054"], AGCK = "c065";
const CUSTK = ["c002", "c053", "c022", "c055", "c009", "c063", "c034", "c084", "c070", "c046", "c083", "c024", "c051", "c037"];

const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const hx = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); t = c01(t); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const won = (n) => n.toLocaleString("ko-KR");

// ── 벡터 그리기 도우미(고해상도 캔버스: 논리 좌표 그대로, 화면 배율은 setTransform) ──
const rr = (q, x, y, w, h, r) => { q.beginPath(); if (q.roundRect) q.roundRect(x, y, w, h, r); else q.rect(x, y, w, h); };
const lgr = (q, x0, y0, x1, y1, st) => { const gr = q.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const glow = (q, x, y, r, col, a) => { const gr = q.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); q.fillStyle = gr; q.fillRect(x - r, y - r, r * 2, r * 2); };
const svgU = (t) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t.replace(/\s*\n\s*/g, ""));
// 치킨 박스(위에서 본 작은 것, 7x5 기준 × s)
function vBox(q, x, y, s = 1) {
  q.save(); q.translate(x, y); q.scale(s, s);
  q.fillStyle = "rgba(0,0,0,.3)"; q.fillRect(0.4, 4.6, 7, 0.8);
  rr(q, 0, 0, 7, 5, 0.6); q.fillStyle = lgr(q, 0, 0, 0, 5, [[0, "#f6d39a"], [1, "#c08a4c"]]); q.fill(); q.strokeStyle = "#7a4a1a"; q.lineWidth = 0.3; q.stroke();
  q.fillStyle = "#e0402a"; q.fillRect(0, 2, 7, 0.9); q.fillStyle = "#ffcf5a"; q.beginPath(); q.arc(3.5, 2.45, 0.9, 0, 6.3); q.fill();
  q.restore();
}
// 스쿠터 탄 라이더(위에서 본 그림, 오른쪽을 보는 모양을 돌린다). c: 헬멧·재킷·배달통 색
function vScooter(q, x, y, dir, c, tm, mv) {
  q.save(); q.translate(x, y);
  if (dir === "l") q.scale(-1, 1); else if (dir === "d") q.rotate(Math.PI / 2); else if (dir === "u") q.rotate(-Math.PI / 2);
  q.fillStyle = "rgba(0,0,0,.35)"; q.beginPath(); q.ellipse(0.5, 1.2, 8, 3.4, 0, 0, 6.3); q.fill();
  // 바퀴
  q.fillStyle = "#16161c"; rr(q, -7.4, -1.1, 3.6, 2.2, 1); q.fill(); rr(q, 4, -1.1, 3.6, 2.2, 1); q.fill();
  // 몸통
  q.beginPath(); q.moveTo(-5, -2.4); q.lineTo(4.4, -1.8); q.quadraticCurveTo(7, 0, 4.4, 1.8); q.lineTo(-5, 2.4); q.closePath();
  q.fillStyle = lgr(q, 0, -2.4, 0, 2.4, [[0, "#ff7a6a"], [0.5, "#d8382a"], [1, "#8a1a12"]]); q.fill();
  // 핸들·헤드라이트
  q.strokeStyle = "#2a2a30"; q.lineWidth = 0.8; q.lineCap = "round"; q.beginPath(); q.moveTo(4.6, -3); q.lineTo(4.6, 3); q.stroke();
  q.fillStyle = "#fff6b0"; q.beginPath(); q.arc(6.4, 0, 0.8, 0, 6.3); q.fill();
  // 배달통
  rr(q, -8.6, -3.2, 5, 6.4, 0.8); q.fillStyle = lgr(q, -8.6, 0, -3.6, 0, [[0, mix(c.box, "#000000", 0.25)], [0.5, mix(c.box, "#ffffff", 0.2)], [1, c.box]]); q.fill(); q.strokeStyle = "rgba(0,0,0,.4)"; q.lineWidth = 0.3; q.stroke();
  q.fillStyle = c.bx2; q.fillRect(-8.6, -0.6, 5, 1.2);
  // 사람: 어깨(재킷) + 헬멧
  q.beginPath(); q.ellipse(-0.6, 0, 2.6, 3.4, 0, 0, 6.3); q.fillStyle = lgr(q, 0, -3.4, 0, 3.4, [[0, mix(c.jak, "#ffffff", 0.25)], [1, c.jak]]); q.fill();
  q.strokeStyle = c.jak; q.lineWidth = 1.1; q.beginPath(); q.moveTo(0.4, -2.4); q.lineTo(4, -2.6); q.moveTo(0.4, 2.4); q.lineTo(4, 2.6); q.stroke();
  q.beginPath(); q.arc(0.4, 0, 2.2, 0, 6.3); q.fillStyle = q.createRadialGradient(-0.2, -0.8, 0.2, 0.4, 0, 2.4); q.fillStyle.addColorStop(0, mix(c.hel, "#ffffff", 0.6)); q.fillStyle.addColorStop(1, c.hel); q.fill();
  q.fillStyle = "#1a1e30"; q.beginPath(); q.arc(0.4, 0, 2.2, -0.9, 0.9); q.closePath(); q.fill();
  q.restore();
}
// 주문 핀(벡터 말풍선). st: c 튀기는 중, r 준비, lost 오배송, pick 회수
function pinDraw(q, cx, ty, o) {
  const w = (o.w || 11) + 1, x = cx - w / 2, y = ty - 11.5, h = 9.5;
  const body = o.st === "lost" ? "#ff5a4a" : o.cold ? mix("#fffdf6", "#9fd0ff", o.cold) : "#fffdf6";
  const edge = o.sel ? "#ffd23f" : o.urgent ? "#ff3b3b" : "#1a1a22";
  q.fillStyle = "rgba(0,0,0,.35)"; q.beginPath(); q.ellipse(cx, ty + 0.4, 2.4, 0.8, 0, 0, 6.3); q.fill();
  q.beginPath(); if (q.roundRect) q.roundRect(x, y, w, h, 2.2); else q.rect(x, y, w, h); q.moveTo(cx - 1.8, y + h - 0.2); q.lineTo(cx, ty - 0.4); q.lineTo(cx + 1.8, y + h - 0.2);
  q.fillStyle = body; q.fill(); q.strokeStyle = edge; q.lineWidth = o.sel || o.urgent ? 1 : 0.6; q.stroke();
  if (o.sel) { q.strokeStyle = "rgba(255,210,63,.45)"; q.lineWidth = 2.2; rr(q, x - 0.8, y - 0.8, w + 1.6, h + 1.6, 3); q.stroke(); }
  if (o.st === "c") {
    rr(q, cx - 3.4, y + 2, 6.8, 3.4, 0.8); q.fillStyle = lgr(q, 0, y + 2, 0, y + 5.4, [[0, "#9aa2aa"], [1, "#3a3f48"]]); q.fill();
    q.fillStyle = o.blink ? "#ffd27a" : "#f0b040"; rr(q, cx - 2.6, y + 2.6, 5.2, 1.3, 0.6); q.fill();
    rr(q, cx - 4, y + 6.4, 8, 1.4, 0.7); q.fillStyle = "#e8e4d4"; q.fill(); rr(q, cx - 4, y + 6.4, 8 * c01(o.prog || 0), 1.4, 0.7); q.fillStyle = "#ffb03b"; q.fill(); return;
  }
  q.textAlign = "center"; q.textBaseline = "middle";
  if (o.st === "lost") { q.fillStyle = "#ffffff"; q.font = "900 7px sans-serif"; q.fillText("!", cx, y + 4.9); return; }
  if (o.st === "pick") { vBox(q, cx - 4.6, y + 2.6, 0.85); q.fillStyle = "#2f6fd0"; q.font = "900 5.6px sans-serif"; q.fillText("?", cx + 3.4, y + 3.4); return; }
  if (o.n > 1) { for (let k = 0; k < Math.min(3, o.n); k++) vBox(q, x + 1.4 + k * 4.6, y + 1.4 + (k % 2) * 0.8, 0.62); }
  else vBox(q, cx - 3.5, y + 1.2, 1);
  if (o.warm != null) { rr(q, x + 1.4, y + 6.9, w - 2.8, 1.3, 0.65); q.fillStyle = "#d8d4c4"; q.fill(); rr(q, x + 1.4, y + 6.9, Math.max(0.8, (w - 2.8) * o.warm), 1.3, 0.65); q.fillStyle = o.warm > 0.6 ? "#ff8a2a" : o.warm > 0.35 ? "#ffd23f" : "#4fa8ff"; q.fill(); }
}
// 벡터 손가락(위를 가리킴, down 이면 뒤집기)
const HANDP = "M5 0c1.6 0 2.4 1 2.4 2.4v7l1-.2c1.4-.2 2.4.6 2.6 1.6l.2.2c1.4-.4 2.6.4 2.8 1.6 1.4-.2 2.4.8 2.4 2v4.6c0 3.6-2.6 6.4-6.2 6.4H8.8c-2.2 0-3.6-1-4.8-2.8L.6 17.6c-.8-1.2-.4-2.6.8-3.2 1-.4 2-.2 2.8.6V2.4C2.6 1 3.4 0 5 0z";
function fingerURL(down) {
  return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -2 30 30"><g transform="${down ? "rotate(180 9 13)" : ""}"><path d="${HANDP}" fill="#fff" stroke="#2a1e2e" stroke-width="1.3" stroke-linejoin="round"/><path d="M3.2 3v9M7.4 10v3M10.4 11.6v2.2M13.2 13.4v1.8" stroke="#e8d8cc" stroke-width=".9" stroke-linecap="round"/></g></svg>`);
}
// 방법 화면 그림(벡터 80x68 세 장): 캔버스에 그려 이미지로
function stepPics() {
  const mk = (fn) => { const c = document.createElement("canvas"); c.width = 160; c.height = 136; const q = c.getContext("2d"); q.scale(2, 2);
    rr(q, 0, 0, 80, 68, 11); q.fillStyle = lgr(q, 0, 0, 0, 68, [[0, "#232a3a"], [1, "#151a26"]]); q.fill();
    q.fillStyle = "#30353f"; q.fillRect(0, 40, 80, 14); q.strokeStyle = "#c8b060"; q.lineWidth = 0.8; q.setLineDash([3, 3]); q.beginPath(); q.moveTo(0, 47); q.lineTo(80, 47); q.stroke(); q.setLineDash([]);
    q.fillStyle = "#4a4f5c"; q.fillRect(0, 38, 80, 2); q.fillRect(0, 54, 80, 2);
    fn(q); return `<img src="${c.toDataURL()}" alt="">`; };
  const C0 = { hel: "#ffb03b", jak: "#2a2f3a", box: "#d9a868", bx2: "#e0402a" };
  const route = (q, pts) => { q.strokeStyle = "#ffe066"; q.lineWidth = 1.6; q.setLineDash([2.6, 2]); q.lineCap = "round"; q.beginPath(); pts.forEach(([a, b], i) => (i ? q.lineTo(a, b) : q.moveTo(a, b))); q.stroke(); q.setLineDash([]); };
  const badge = (q, x, y, n) => { q.beginPath(); q.arc(x, y, 3.6, 0, 6.3); q.fillStyle = "#ffe066"; q.fill(); q.strokeStyle = "#1a1a22"; q.lineWidth = 0.6; q.stroke(); q.fillStyle = "#2a1e2e"; q.font = "900 5px sans-serif"; q.textAlign = "center"; q.textBaseline = "middle"; q.fillText(n, x, y + 0.2); };
  const pin = (q, x, ty, sc, o) => { q.save(); q.translate(x, ty); q.scale(sc, sc); pinDraw(q, 0, 0, o); q.restore(); };
  const steam = (q, x, y) => { q.strokeStyle = "rgba(255,255,255,.75)"; q.lineWidth = 0.9; q.lineCap = "round"; for (const k of [0, 1]) { q.beginPath(); q.moveTo(x + k * 5, y); q.quadraticCurveTo(x + 2 + k * 5, y - 3, x + k * 5, y - 6); q.stroke(); } };
  const a = mk((q) => { route(q, [[30, 47], [58, 47]]); q.save(); q.translate(19, 47); q.scale(1.5, 1.5); vScooter(q, 0, 0, "r", C0, 0, 1); q.restore(); pin(q, 60, 40, 2, { st: "r", warm: 0.9 }); steam(q, 56, 14); });
  const b = mk((q) => { route(q, [[4, 47], [76, 47]]); for (const [x, n] of [[24, 1], [56, 2]]) { pin(q, x, 40, 1.8, { st: "r", sel: 1, warm: 0.8 }); badge(q, x + 11, 12, n); } });
  const c = mk((q) => { pin(q, 22, 40, 2, { st: "r", warm: 0.15, cold: 0.8 });
    q.fillStyle = "#9fd0ff"; for (const [x, y] of [[36, 12], [39, 20]]) { q.beginPath(); q.moveTo(x, y - 2.4); q.quadraticCurveTo(x + 2, y + 0.8, x, y + 1.5); q.quadraticCurveTo(x - 2, y + 0.8, x, y - 2.4); q.fill(); }
    const st = (x, y, col) => { q.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 1.8 : 4.2, an = -Math.PI / 2 + k * Math.PI / 5; q.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } q.closePath(); q.fillStyle = col; q.fill(); };
    for (let k = 0; k < 3; k++) st(50 + k * 9.4, 16 + (k === 1 ? 0 : 1), k < 1 ? "#ffd23f" : "#5a6070"); q.fillStyle = "#ff8a8a"; q.font = "900 10px sans-serif"; q.textAlign = "center"; q.fillText("↓", 59, 34); });
  return [[a, "라이더를 끌어 핀으로"], [b, "가까우면 묶어서"], [c, "식으면 별점 ↓"]];
}

export const GAME = {
  key: "chicken2", base: "chicken", jc: "#ffb03b", n: "치킨은 식기 전에", desc: "축구 하는 밤, 식기 전에 라이더를 보내요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 치킨이 튀겨지면 가게 앞에 박스가 쌓여요. <b>라이더를 끌어</b> 주문 핀까지 길을 그어요.",
    "가까운 주문은 핀 <b>여러 개를 차례로 지나가게</b> 끌면 한 번에 묶어 보내요(가방 최대 3개). 핀 아래 막대는 <b>식는 시계</b>, 파랗게 식으면 별점이 깎여요.",
    "라이더가 그만두면 <b>배달대행</b>을 톡(수수료가 나가요). <b>오배송</b>은 ? 핀에서 회수 → ! 핀으로, <b>단체 주문</b>은 박스를 한 번에 실어요.",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "라이더를 끌어 핀으로"], ["", "가까우면 묶어서"], ["", "식으면 별점 ↓"]]; } },
  css: `
.mg-c2st{background:#0e1018!important;display:flex;align-items:center;justify-content:center}
.mg-c2w{position:relative;flex:0 0 auto}
.mg-c2w>canvas{width:100%;height:100%;display:block;image-rendering:auto;touch-action:none;cursor:pointer;border-radius:6px}
.mg-chicken2 .mg-steps img{width:80px;height:68px;border-radius:11px;box-shadow:0 3px 10px #0006}
.mg-chicken2 .mg-logo b{font-size:26px}
.mg-c2w .c2hud{position:absolute;left:4px;top:3px;z-index:6;display:flex;gap:3px;pointer-events:none;font:800 10px/1 ui-monospace,monospace}
.mg-c2w .c2hud span{background:#0d1020d8;color:#e8ecff;padding:3px 5px;border-radius:4px;letter-spacing:.2px}
.mg-c2w .c2hud span.fb{background:#1f6a3ad8;color:#e8ffe8}
.mg-c2w .c2hud span.fb.on{animation:c2goal .25s steps(2) 6}
@keyframes c2goal{50%{background:#ffe066;color:#3a2400}}
.mg-c2w .c2lb b{position:absolute;display:block;text-align:center;font-weight:900;white-space:nowrap;overflow:hidden;pointer-events:none}
.mg-c2w .c2lb b.br{color:#ffcf5a;font-size:11px;letter-spacing:1px;text-shadow:0 1px 0 #6a3a0a,0 0 5px #ff9a3b}
.mg-c2w .c2lb b.br.off{color:#6a5a40;text-shadow:none}
.mg-c2w .c2ag{position:absolute;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:linear-gradient(#4fc07a,#2f8a52)!important;color:#fff!important;border:0!important;border-radius:8px!important;box-shadow:0 2px 0 #1a5030,0 0 0 2px #0d2a18!important;font-weight:900;font-size:11.5px;line-height:1.1;padding:0!important;min-height:0!important;touch-action:manipulation}
.mg-c2w .c2ag small{font-size:9.5px;font-weight:700;color:#e0ffe8}
.mg-c2w .c2ag.hot{animation:c2pulse .45s infinite alternate}
.mg-c2w .c2ag.dis{filter:grayscale(.8) brightness(.7)}
.mg-c2w .c2ag:active{transform:translateY(2px)}
.mg-c2w .c2cnt{position:absolute;z-index:6;pointer-events:none;color:#ffe9b0;font:800 10px/1.2 ui-monospace,monospace;text-align:right;text-shadow:0 1px 0 #000}
.mg-c2w .c2go{position:absolute;z-index:9;width:0;height:0;display:none;pointer-events:none}
.mg-c2w .c2go.on{display:block}
.mg-c2w .c2go i{position:absolute;width:39px;height:39px;left:-14px;background-size:100% 100%;filter:drop-shadow(0 2px 1px #0009)}
.mg-c2w .c2go span{position:absolute;left:0;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffb03b}
.mg-c2w .c2go span b{color:#d8402a}
.mg-c2w .c2go.dn i{top:-37px;animation:c2tapd .7s infinite}
.mg-c2w .c2go.dn span{bottom:44px}
.mg-c2w .c2go.up i{top:2px;animation:c2tapu .7s infinite}
.mg-c2w .c2go.up span{top:46px}
.mg-c2w .c2go.dr i{animation:c2dr 1.4s ease-in-out infinite}
@keyframes c2tapd{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c2tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes c2dr{0%{transform:translate(0,0)}15%{transform:translate(0,0) scale(.9)}75%,100%{transform:translate(var(--dx),var(--dy)) scale(.9)}}
@keyframes c2pulse{to{transform:scale(1.07);filter:brightness(1.15)}}
.mg-c2w .c2tut{position:absolute;left:8px;right:8px;top:6px;z-index:10;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-c2w .c2tut.mid{top:30%}
.mg-c2w .c2tut.off{opacity:0;visibility:hidden}
.mg-c2w .c2tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #ffb03b;max-width:292px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-c2w .c2tut.pop .c2tc{animation:c2pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-c2w .c2tc em{font-style:normal;display:inline-block;background:#d8701a;color:#fff;font-size:10.5px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-c2w .c2tc p{margin:0}.mg-c2w .c2tc b{color:#c0601a}.mg-c2w .c2tc b.rd{color:#c0392b}.mg-c2w .c2tc b.bl{color:#1f6aa8}.mg-c2w .c2tc b.gr{color:#2f8a52}
.mg-c2w .c2tb{margin-top:6px;display:flex;justify-content:center}
.mg-c2w .c2skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-c2w .c2go2{background:linear-gradient(#ffb03b,#d8701a)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4410!important;animation:c2pulse .5s infinite alternate}
@keyframes c2pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-c2w .c2dim{position:absolute;inset:0;background:#0000;transition:background .5s;pointer-events:none;z-index:7}
.mg-c2w .c2dim.on{background:#000b}
.mg-c2w .c2end{position:absolute;left:50%;top:50%;z-index:8;width:min(84%,240px);transform:translate(-50%,-50%);pointer-events:none;animation:c2phin .5s cubic-bezier(.3,1.4,.5,1);transition:transform .5s,opacity .5s}
.mg-c2w .c2end.out{transform:translate(-50%,40%) scale(.85);opacity:0}
@keyframes c2phin{0%{transform:translate(-50%,10%) scale(.7);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
.mg-c2w .c2ph{background:#1c1c22;border-radius:22px;padding:10px 7px 12px;box-shadow:0 0 0 2px #3a3a44,0 10px 24px #000a}
.mg-c2w .c2ph .nt0{width:46px;height:5px;background:#000;border-radius:3px;margin:0 auto 7px}
.mg-c2w .c2scr{background:linear-gradient(#ffcf5a,#ff9a3b);border-radius:14px;padding:8px 7px 7px;overflow:hidden}
.mg-c2w .c2hd{display:flex;align-items:center;gap:6px;color:#4a2400;font-weight:900;font-size:12px;margin-bottom:6px}
.mg-c2w .c2hd img{width:28px;height:28px;border-radius:7px;box-shadow:0 1px 2px #0004}
.mg-c2w .c2hd p{margin:0;line-height:1.2}.mg-c2w .c2hd small{display:block;font-weight:700;font-size:10px;color:#7a4410}
.mg-c2w .c2big{background:#fffdf6;border-radius:10px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 0 #0003;margin-bottom:5px}
.mg-c2w .c2big b{font-size:24px;color:#e07a10;letter-spacing:-.5px}
.mg-c2w .c2big small{font-size:10px;color:#8a6a40;font-weight:800;display:block}
.mg-c2w .c2big .st{font-size:13px;color:#ffb000;letter-spacing:1px;text-align:right}
.mg-c2w .c2rows{background:#fffdf6e8;border-radius:10px;padding:4px 8px;margin-bottom:5px;font-size:11px;color:#3a2a1a}
.mg-c2w .c2rows p{margin:2px 0;display:flex;justify-content:space-between;font-weight:700}
.mg-c2w .c2rows p b{font-weight:900}
.mg-c2w .c2rows p.tot b{color:#c0601a;font-size:13px}
.mg-c2w .c2rows p.neg b{color:#c0392b}
.mg-c2w .c2ls{display:flex;flex-direction:column;gap:4px;min-height:84px}
.mg-c2w .c2nt{display:flex;gap:6px;align-items:center;background:#fffdf6f2;border-radius:9px;padding:4px 7px;box-shadow:0 2px 0 #0003;animation:c2ntin .35s cubic-bezier(.3,1.5,.5,1)}
.mg-c2w .c2nt img{width:28px;height:28px;flex:0 0 auto;border-radius:50%;background:#ffe9c0;box-shadow:0 0 0 2px #fff,0 0 0 3px #ffb03b}
.mg-c2w .c2nt p{margin:0;font-size:10.5px;line-height:1.3;color:#3a2a1a;min-width:0}
.mg-c2w .c2nt p b{display:block;font-size:9.5px;color:#d8701a;letter-spacing:.5px}
.mg-c2w .c2nt.bad p b{color:#4f8ad9}
.mg-c2w .c2nt p span{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@keyframes c2ntin{0%{transform:translateY(-14px) scale(.9);opacity:0}100%{transform:none;opacity:1}}
.mg-c2w .c2fin{position:absolute;inset:0;z-index:8;opacity:0;transition:opacity .6s;pointer-events:none}
.mg-c2w .c2fin.on{opacity:1}
.mg-c2w .c2fin canvas{width:100%;height:100%;display:block}
.mg-c2w .c2fin canvas.fg{position:absolute;inset:0;z-index:2;pointer-events:none}
.mg-c2w .c2fin .c2me{z-index:1}.mg-c2w .c2fin .c2say{z-index:3}
.mg-c2w .c2me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;filter:drop-shadow(0 0 6px #0008)}
.mg-c2w .c2say{position:absolute;left:50%;transform:translateX(-50%);background:#fff;color:#2a1e2e;font-weight:900;font-size:12.5px;padding:5px 11px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 0 #0007;opacity:0;transition:opacity .4s}
.mg-c2w .c2say.on{opacity:1}
.mg-c2w .c2qt{position:absolute;left:50%;bottom:20%;z-index:9;display:flex;align-items:flex-end;gap:6px;transform:translateX(-50%);pointer-events:none;animation:c2qin .4s cubic-bezier(.3,1.5,.5,1)}
.mg-c2w .c2qt.out{opacity:0;transform:translate(-50%,16px);transition:opacity .4s,transform .4s}
.mg-c2w .c2qt i{display:block;width:84px;height:109px;background-repeat:no-repeat;background-size:300% 346.15%;background-position:100% 0;filter:drop-shadow(0 4px 8px #000a);border-radius:12px 12px 0 0}
.mg-c2w .c2qt span{background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;line-height:1.35;padding:6px 10px;border-radius:12px 12px 12px 2px;box-shadow:0 2px 0 #0007,0 0 0 2px #4f8ad9;margin-bottom:62px;white-space:nowrap}
@keyframes c2qin{0%{opacity:0;transform:translate(-50%,24px) scale(.85)}100%{opacity:1;transform:translateX(-50%)}}
.mg-c2w .c2sign{position:absolute;text-align:center;font-weight:900;color:#ffcf5a;text-shadow:0 0 6px #ff9a3b,0 2px 0 #6a3a0a;letter-spacing:2px;transition:color .3s,text-shadow .3s}
.mg-c2w .c2sign.off{color:#5a4a36;text-shadow:none}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "chicken2", "치킨은 식기 전에", "mg-c2st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-c2w"><canvas></canvas><div class="mg-bubs"></div><div class="c2hud"><span class="ck">금 21:00</span><span>비</span><span class="fb">축구 0:0</span></div><div class="c2lb"><b class="br">황금닭</b></div><button class="c2ag" data-ag>배달대행 부르기<small>수수료 ${won(AGFEE)}원</small></button><div class="c2cnt"></div><div class="c2go"><span></span><i></i></div><div class="c2tut off"><div class="c2tc"><em>리허설</em><p></p><div class="c2tb"></div></div></div><div class="c2dim"></div></div>`);
  const wrap = F.stage.querySelector(".mg-c2w"), cv = wrap.querySelector("canvas"), g = cv.getContext("2d"), bubs = wrap.querySelector(".mg-bubs");
  const ckEl = wrap.querySelector(".c2hud .ck"), fbEl = wrap.querySelector(".c2hud .fb"), signEl = wrap.querySelector(".c2lb .br"), agBtn = wrap.querySelector(".c2ag"), cntEl = wrap.querySelector(".c2cnt");
  const goEl = wrap.querySelector(".c2go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i"), tutEl = wrap.querySelector(".c2tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".c2tb"), dim = wrap.querySelector(".c2dim");
  let K = 2, H = 220, R = [30, 77, 123, 190], KS = 2;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const fit = () => {
    const sw = F.stage.clientWidth || 336, sh = F.stage.clientHeight || 600, r = Math.min(sw / W, sh / 200);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 200, 250);
    const r3 = H - 30, sp = (r3 - 30) / 3; R = [30, Math.round(30 + sp), Math.round(30 + sp * 2), r3];
    KS = K * DPR; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); g.setTransform(KS, 0, 0, KS, 0, 0);
    wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
  };
  fit();
  // 캐릭터 그림(라이더·손님): 미리 불러오기, 표정 칸 e(0 무표정 1 웃음 2 슬픔 3 화남 4 수줍음 5 놀람)
  const ART = {};
  const artOf = (k) => { if (!ART[k]) { const r = { ok: false, im: new Image() }; r.im.onload = () => (r.ok = true); r.im.src = "img/body/" + k + ".webp"; ART[k] = r; } return ART[k]; };
  const custs = shuffle(CUSTK.slice()); [...RCK, AGCK, ...custs.slice(0, 8)].forEach(artOf);
  const faceSrc = (e, pad = 0, dy = 0) => { const c = e % 3, r = e >= 3 ? 1 : 0; return [c * 240 + 62 - pad, r * 540 + 12 - pad + dy, 116 + pad * 2, 116 + pad * 2]; };
  const pops = [];
  let custI = 0;
  const custPop = (x, y, stars) => { pops.push({ x, y, ck: custs[custI++ % custs.length], e: stars >= 5 ? 1 : stars >= 4 ? 0 : stars >= 3 ? 2 : 3, t: 0 }); };

  // ── 동네 배치: 집 문(배달지)은 모두 가로 도로 위 ──
  const DEST = [
    { x: 28, r: 0, n: "101동" }, { x: 60, r: 0, n: "102동" }, { x: 101, r: 0, n: "오피스텔" }, { x: 133, r: 0, n: "언덕 빌라" },
    { x: 26, r: 1, n: "빨간 지붕 집" }, { x: 58, r: 1, n: "다세대" },
    { x: 28, r: 2, n: "201동" }, { x: 60, r: 2, n: "호프집" }, { x: 101, r: 2, n: "202동" }, { x: 134, r: 2, n: "모퉁이 집" },
    { x: 26, r: 3, n: "골목 집" }, { x: 58, r: 3, n: "파란 빌라" },
  ];
  const FIELD = { x: 117, r: 1, n: "운동장" };
  const SPOT = [102, 116, 130], AGSPOT = [144, 90];
  const ptOf = (d) => ({ x: d.x, y: R[d.r] });
  const tvWins = [], aptWins = [];
  let BG = null, SHOP = null;

  // ── 배경(정적, 기기 해상도 벡터: 비 오는 밤 동네를 위에서 본 그림) ──
  function bgCanvas() {
    const c = document.createElement("canvas"); c.width = Math.round(W * KS); c.height = Math.round(H * KS); const q = c.getContext("2d"); q.setTransform(KS, 0, 0, KS, 0, 0);
    let sd = 11; const sr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    tvWins.length = 0; aptWins.length = 0;
    // 블록 바닥(어두운 풀밭·보도블록)
    q.fillStyle = lgr(q, 0, 0, 0, H, [[0, "#1c2434"], [1, "#182030"]]); q.fillRect(0, 0, W, H);
    for (let k = 0; k < 160; k++) { q.fillStyle = sr() < 0.5 ? "rgba(60,90,70,.18)" : "rgba(10,14,24,.3)"; q.beginPath(); q.arc(sr() * W, sr() * H, 0.3 + sr() * 0.8, 0, 6.3); q.fill(); }
    // 길: 젖은 아스팔트
    const road = (x, y, w, h) => { q.fillStyle = "#262a33"; q.fillRect(x, y, w, h); for (let k = 0; k < w * h / 30; k++) { q.fillStyle = sr() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.12)"; q.fillRect(x + sr() * w, y + sr() * h, 0.6, 0.6); } };
    for (const vx of VX) road(vx - 4, 0, 8, R[3] + 4);
    for (const ry of R) road(0, ry - 4, W, 8);
    // 보도(연석 + 보도블록 줄)
    const walk = (x, y, w, h, hor) => { q.fillStyle = lgr(q, x, y, hor ? x : x + w, hor ? y + h : y, [[0, "#555b68"], [1, "#3e434f"]]); q.fillRect(x, y, w, h); q.strokeStyle = "rgba(20,24,32,.45)"; q.lineWidth = 0.25; q.beginPath(); if (hor) for (let k = x; k < x + w; k += 2.5) { q.moveTo(k, y); q.lineTo(k, y + h); } else for (let k = y; k < y + h; k += 2.5) { q.moveTo(x, k); q.lineTo(x + w, k); } q.stroke(); };
    for (const ry of R) { walk(0, ry - 6, W, 2, 1); walk(0, ry + 4, W, 2, 1); }
    for (const vx of VX) { walk(vx - 6, 0, 2, R[3] + 4, 0); walk(vx + 4, 0, 2, R[3] + 4, 0); }
    for (const vx of VX) for (const ry of R) road(vx - 6, ry - 6, 12, 12);
    // 차선(노란 점선)
    q.strokeStyle = "#a8943e"; q.lineWidth = 0.55; q.setLineDash([3.4, 4.6]);
    for (const ry of R) { q.beginPath(); for (let i = 0; i <= VX.length; i++) { const a = i ? VX[i - 1] + 8 : 0, b = i < VX.length ? VX[i] - 8 : W; if (b > a) { q.moveTo(a, ry); q.lineTo(b, ry); } } q.stroke(); }
    for (const vx of VX) { q.beginPath(); for (let i = 0; i <= R.length; i++) { const a = i ? R[i - 1] + 8 : 0, b = i < R.length ? R[i] - 8 : R[3]; if (b > a) { q.moveTo(vx, a); q.lineTo(vx, b); } } q.stroke(); }
    q.setLineDash([]);
    // 횡단보도
    q.fillStyle = "rgba(220,224,232,.55)";
    for (const vx of VX) for (const ry of R) for (let k = -4; k <= 3; k += 2) { q.fillRect(vx - 9.5, ry + k, 3, 1.1); q.fillRect(vx + 6.5, ry + k, 3, 1.1); }
    // 맨홀
    for (const [x, y] of [[40, R[1] + 1], [120, R[2] - 1], [70, R[0]], [30, R[3] + 1]]) { q.beginPath(); q.arc(x, y, 1.5, 0, 6.3); q.fillStyle = "#3a3f4a"; q.fill(); q.strokeStyle = "#1a1e26"; q.lineWidth = 0.3; q.stroke(); }
    // 창문: 불 켜진 창은 노란빛, 일부는 축구 중계 TV(파란빛, 깜빡임은 매 프레임)
    const win = (x, y, k, w = 2, h = 2) => {
      const r0 = sr();
      if (k === "apt" && r0 < 0.18) { tvWins.push([x, y, w, h]); rr(q, x, y, w, h, 0.3); q.fillStyle = "#5a7ab8"; q.fill(); }
      else { const lit = r0 < 0.62; if (lit) glow(q, x + w / 2, y + h / 2, 2.6, r0 < 0.4 ? "255,200,110" : "255,230,170", 0.35); rr(q, x, y, w, h, 0.3); q.fillStyle = lit ? lgr(q, 0, y, 0, y + h, [[0, r0 < 0.4 ? "#ffe2a0" : "#fff2c8"], [1, r0 < 0.4 ? "#f0b860" : "#e8d090"]]) : "#232a3a"; q.fill(); }
      if (k === "apt") aptWins.push([x, y]);
    };
    const door = (x, by, lit = true) => { rr(q, x - 2.5, by - 5, 5, 5, [1, 1, 0, 0]); q.fillStyle = lgr(q, 0, by - 5, 0, by, [[0, "#4a3a3a"], [1, "#1a1418"]]); q.fill(); if (lit) { glow(q, x, by - 6.5, 3.2, "255,230,160", 0.5); q.fillStyle = "#ffe9a8"; q.fillRect(x - 1.2, by - 7.2, 2.4, 0.7); } };
    const apt = (x0, x1, top, bot, face) => {
      const w = x1 - x0; rr(q, x0, top, w, 4.4, 0.8); q.fillStyle = lgr(q, 0, top, 0, top + 4.4, [[0, "#a0a6b2"], [1, "#6a707c"]]); q.fill();
      rr(q, x0 + 3, top + 0.8, 6, 2.4, 0.4); q.fillStyle = "#4e5460"; q.fill(); q.fillStyle = "#8a909c"; q.fillRect(x0 + 3.4, top + 1, 5.2, 0.5);
      q.fillStyle = lgr(q, x0, 0, x1, 0, [[0, mix(face, "#ffffff", 0.08)], [0.85, face], [1, mix(face, "#000000", 0.3)]]); q.fillRect(x0, top + 4, w, bot - top - 4);
      q.fillStyle = "rgba(0,0,0,.25)"; q.fillRect(x0, top + 4, w, 0.8);
      for (let y = top + 6; y < bot - 6; y += 4) { q.fillStyle = "rgba(0,0,0,.12)"; q.fillRect(x0, y + 2.6, w, 0.4); for (let x = x0 + 2; x < x1 - 2; x += 4) win(x, y, "apt"); }
      q.fillStyle = "rgba(0,0,0,.4)"; q.fillRect(x0, bot - 1, w, 1);
    };
    const villa = (x0, x1, top, bot, roof) => {
      const w = x1 - x0, rh = Math.max(5, Math.round((bot - top) * 0.45));
      rr(q, x0, top, w, rh, 1); q.fillStyle = lgr(q, 0, top, 0, top + rh, [[0, mix(roof, "#ffffff", 0.25)], [1, mix(roof, "#000000", 0.3)]]); q.fill();
      q.strokeStyle = mix(roof, "#000000", 0.35); q.lineWidth = 0.3; q.beginPath(); for (let y = top + 1.5; y < top + rh; y += 1.6) { q.moveTo(x0, y); q.lineTo(x1, y); } q.stroke();
      q.fillStyle = lgr(q, x0, 0, x1, 0, [[0, "#e6dece"], [0.85, "#d4ccbc"], [1, "#a8a090"]]); q.fillRect(x0 + 1, top + rh, w - 2, bot - top - rh);
      for (let y = top + rh + 2; y < bot - 5; y += 4) for (let x = x0 + 3; x < x1 - 3; x += 5) win(x, y, "v");
    };
    const house = (x0, x1, top, bot, roof) => {
      const w = x1 - x0, fh = Math.min(10, bot - top - 4), rb = bot - fh;
      q.beginPath(); q.moveTo(x0 + 3, top); q.lineTo(x1 - 3, top); q.lineTo(x1, rb); q.lineTo(x0, rb); q.closePath(); q.fillStyle = lgr(q, 0, top, 0, rb, [[0, mix(roof, "#ffffff", 0.2)], [1, mix(roof, "#000000", 0.25)]]); q.fill();
      q.strokeStyle = mix(roof, "#000000", 0.3); q.lineWidth = 0.3; q.beginPath(); for (let y = top + 1.5; y < rb; y += 1.5) { const k = (y - top) / (rb - top); q.moveTo(x0 + 3 * (1 - k), y); q.lineTo(x1 - 3 * (1 - k), y); } q.stroke();
      q.fillStyle = mix(roof, "#ffffff", 0.35); q.fillRect(x0 + 3, top, w - 6, 0.6);
      q.fillStyle = lgr(q, x0, 0, x1, 0, [[0, "#ece2ce"], [1, "#b8ae98"]]); q.fillRect(x0 + 1, rb, w - 2, fh);
      win(x0 + 4, rb + 2, "h", 3, 2.4); win(x1 - 8, rb + 2, "h", 3, 2.4); rr(q, x0 + w / 2 - 6, top + 2, 2.2, 3, 0.4); q.fillStyle = "#5a4a44"; q.fill();
      q.beginPath(); q.arc(x0 + 0.5, bot - 3, 2.6, 0, 6.3); q.fillStyle = q.createRadialGradient(x0 - 0.3, bot - 4, 0.3, x0 + 0.5, bot - 3, 2.8); q.fillStyle.addColorStop(0, "#4e9a5a"); q.fillStyle.addColorStop(1, "#1e4a2a"); q.fill();
    };
    const offi = (x0, x1, top, bot) => {
      const w = x1 - x0; rr(q, x0, top, w, 3.2, 0.6); q.fillStyle = lgr(q, 0, top, 0, top + 3, [[0, "#8a90a0"], [1, "#4a5060"]]); q.fill();
      q.fillStyle = lgr(q, x0, top, x1, bot, [[0, "#3e6488"], [0.5, "#2c4a68"], [1, "#22344a"]]); q.fillRect(x0, top + 3, w, bot - top - 3);
      for (let y = top + 4; y < bot - 5; y += 3) { q.fillStyle = "rgba(20,30,46,.8)"; q.fillRect(x0 + 1, y, w - 2, 0.6); for (let x = x0 + 2; x < x1 - 2; x += 3) { const r0 = sr(); rr(q, x, y + 1, 2, 1.2, 0.2); q.fillStyle = r0 < 0.45 ? "#a8d8ff" : r0 < 0.6 ? "#ffe9a8" : "#1e3044"; q.fill(); } }
      q.fillStyle = "rgba(255,255,255,.07)"; q.beginPath(); q.moveTo(x0, top + 3); q.lineTo(x0 + 10, top + 3); q.lineTo(x0, bot - 10); q.fill();
    };
    const hof = (x0, x1, top, bot) => {
      const w = x1 - x0, rh = Math.max(4, Math.round((bot - top) * 0.4));
      rr(q, x0, top, w, rh, 1); q.fillStyle = lgr(q, 0, top, 0, top + rh, [[0, "#6a5a50"], [1, "#3a2e2a"]]); q.fill();
      for (let x = x0 + 2; x < x1 - 2; x += 6) { rr(q, x, top + 2, 3, 2, 0.4); q.fillStyle = "#2e2420"; q.fill(); }
      q.fillStyle = "#5a3a26"; q.fillRect(x0, top + rh, w, bot - top - rh);
      // 빨간 차양(물결) + 전구
      q.fillStyle = lgr(q, 0, top + rh, 0, top + rh + 4, [[0, "#e04a3a"], [1, "#a0201a"]]); q.beginPath(); q.moveTo(x0, top + rh); q.lineTo(x1, top + rh); q.lineTo(x1, top + rh + 3.4); for (let x = x1; x > x0; x -= 3) q.quadraticCurveTo(x - 1.5, top + rh + 5, x - 3, top + rh + 3.4); q.closePath(); q.fill();
      for (let x = x0 + 2; x < x1 - 2; x += 4) { glow(q, x + 1, top + rh + 1, 2, "255,230,120", 0.5); q.fillStyle = "#ffe066"; q.beginPath(); q.arc(x + 1, top + rh + 1, 0.6, 0, 6.3); q.fill(); }
      const wy = top + rh + 6, wh = Math.max(4, bot - wy - 3);
      rr(q, x0 + 2, wy, w - 6, wh, 0.8); q.fillStyle = lgr(q, 0, wy, 0, wy + wh, [[0, "#fff2c0"], [1, "#e8a84a"]]); q.fill();
      tvWins.push([x0 + 4, wy + 1, 7, 4]); rr(q, x0 + 4, wy + 1, 7, 4, 0.5); q.fillStyle = "#5a8ad8"; q.fill();
      q.fillStyle = "#5a2a14"; for (let x = x0 + 13; x < x1 - 6; x += 4) { q.beginPath(); q.arc(x + 1.5, wy + wh - 4.4, 1.2, 0, 6.3); q.fill(); rr(q, x, wy + wh - 3.4, 3, 3.4, [1.2, 1.2, 0, 0]); q.fill(); }
    };
    const field = (x0, x1, top, bot) => {
      const w = x1 - x0, h = bot - top;
      q.fillStyle = "#2f6a3a"; q.fillRect(x0, top, w, h); for (let x = x0; x < x1; x += 8) { q.fillStyle = "#377a44"; q.fillRect(x, top, 4, h); }
      q.strokeStyle = "rgba(230,240,230,.85)"; q.lineWidth = 0.5; q.strokeRect(x0 + 3, top + 3, w - 6, h - 6.6); q.beginPath(); q.moveTo(x0 + w / 2, top + 3); q.lineTo(x0 + w / 2, bot - 3.6); q.stroke();
      const cx = x0 + w / 2, cy = top + h / 2; q.beginPath(); q.ellipse(cx, cy, 5, 4, 0, 0, 6.3); q.stroke();
      q.strokeRect(x0 + 3, cy - 4, 4, 8); q.strokeRect(x1 - 7, cy - 4, 4, 8);
      q.strokeStyle = "#8a929c"; q.setLineDash([0.8, 0.8]); q.strokeRect(x0 + 0.3, top + 0.3, w - 0.6, h - 0.6); q.setLineDash([]);
      q.fillStyle = "#2f6a3a"; q.fillRect(FIELD.x - 4, bot - 1, 9, 1);
      for (const [lx, ly] of [[x0 + 1.5, top + 1.5], [x1 - 1.5, top + 1.5], [x0 + 1.5, bot - 2], [x1 - 1.5, bot - 2]]) { glow(q, lx, ly, 18, "240,255,220", 0.3); q.fillStyle = "#ffffff"; q.beginPath(); q.arc(lx, ly, 1, 0, 6.3); q.fill(); }
    };
    const T0 = 0, B0 = R[0] - 6, T1 = R[0] + 6, B1 = R[1] - 6, T2 = R[1] + 6, B2 = R[2] - 6, T3 = R[2] + 6, B3 = R[3] - 6;
    apt(12, 44, T0 + 1, B0, "#c8c0b0"); apt(46, 74, T0 + 3, B0, "#b8c0c8"); offi(86, 116, T0 + 2, B0); villa(118, 148, T0 + 4, B0, "#3e7a8a");
    villa(12, 40, T1 + 1, B1, "#a83a2a"); villa(42, 74, T1 + 2, B1, "#6a5a8a"); field(86, 148, T1, B1);
    apt(12, 44, T2 + 1, B2, "#d0c4a8"); hof(46, 74, T2 + 2, B2); apt(86, 116, T2 + 1, B2, "#c0c8b8"); house(118, 148, T2 + 2, B2, "#8a4a2a");
    house(12, 40, T3 + 1, B3, "#4a6a8a"); villa(42, 74, T3 + 2, B3, "#3a5a9a");
    for (const d of DEST) door(d.x, R[d.r] - 6, true);
    // 가게(황금닭): 지붕·간판·차양·창문
    { const x0 = 88, x1 = 148, top = T3 + 1, bot = B3, w = x1 - x0, fh = Math.min(17, bot - top - 6), fy = bot - fh;
      rr(q, x0, top, w, fy - top, 1); q.fillStyle = lgr(q, 0, top, 0, fy, [[0, "#7a5238"], [1, "#4a2e1c"]]); q.fill();
      q.strokeStyle = "rgba(30,16,8,.4)"; q.lineWidth = 0.3; q.beginPath(); for (let y = top + 1.5; y < fy; y += 1.6) { q.moveTo(x0, y); q.lineTo(x1, y); } q.stroke();
      rr(q, x0 + 6, top + 2, 4, 4, 0.6); q.fillStyle = "#3a2a20"; q.fill();
      // 간판(글자는 HTML)
      rr(q, x0 + 10, fy - 9, w - 20, 8, 1.4); q.fillStyle = lgr(q, 0, fy - 9, 0, fy - 1, [[0, "#3a2010"], [1, "#1e0e04"]]); q.fill(); q.strokeStyle = "#ffb03b"; q.lineWidth = 0.6; q.stroke();
      glow(q, x0 + w / 2, fy - 5, 22, "255,170,60", 0.2);
      q.fillStyle = lgr(q, x0, 0, x1, 0, [[0, "#f0e2c4"], [1, "#c8b898"]]); q.fillRect(x0, fy, w, fh);
      // 줄무늬 차양(물결 끝)
      q.save(); q.beginPath(); q.moveTo(x0 - 0.5, fy - 0.5); q.lineTo(x1 + 0.5, fy - 0.5); q.lineTo(x1 + 0.5, fy + 3.6); for (let x = x1 + 0.5; x > x0; x -= 4) q.quadraticCurveTo(x - 2, fy + 5.6, x - 4, fy + 3.6); q.closePath(); q.clip();
      for (let x = x0 - 1; x < x1 + 1; x += 4) { q.fillStyle = "#ff9a2a"; q.fillRect(x, fy - 1, 2, 7); q.fillStyle = "#fff2d8"; q.fillRect(x + 2, fy - 1, 2, 7); }
      q.fillStyle = "rgba(0,0,0,.15)"; q.fillRect(x0, fy + 3, w, 3); q.restore();
      // 창: 튀김기·치킨 박스가 보이는 따뜻한 창
      for (const wx of [x0 + 3, x1 - 23]) { glow(q, wx + 10, fy + fh / 2 + 3, 16, "255,200,100", 0.35); rr(q, wx, fy + 6, 20, fh - 8, 1); q.fillStyle = lgr(q, 0, fy + 6, 0, fy + fh - 2, [[0, "#fff2c0"], [1, "#f0b050"]]); q.fill(); q.strokeStyle = "#6a4a2a"; q.lineWidth = 0.5; q.stroke(); }
      rr(q, x0 + 6, fy + fh - 6, 8, 4, 0.6); q.fillStyle = lgr(q, 0, fy + fh - 6, 0, fy + fh - 2, [[0, "#d8dee4"], [1, "#6a727c"]]); q.fill(); q.fillStyle = "#d8a040"; q.fillRect(x0 + 7, fy + fh - 6.6, 6, 0.8);
      q.fillStyle = "#6a3a20"; q.beginPath(); q.arc(x0 + 17.5, fy + 7.6, 1.6, 0, 6.3); q.fill(); rr(q, x0 + 16, fy + 9, 3, 4, [1, 1, 0, 0]); q.fill();
      for (let k = 0; k < 4; k++) vBox(q, x1 - 21 + (k % 2) * 8, fy + fh - 7 - Math.floor(k / 2) * 5, 1);
      rr(q, x0 + 27, fy + 6, 6, fh - 6, [1.4, 1.4, 0, 0]); q.fillStyle = "#3a2010"; q.fill(); rr(q, x0 + 28, fy + 7, 4, fh - 7, [1, 1, 0, 0]); q.fillStyle = lgr(q, 0, fy + 7, 0, bot, [[0, "#fff0b0"], [1, "#ffc060"]]); q.fill();
      SHOP = { x0, x1, top, bot, fy, door: x0 + 30, chim: [x0 + 8, top + 2] };
      glow(q, x0 + 30, R[3] - 2, 34, "255,190,90", 0.28);
    }
    // 가로등(보도) + 젖은 길 반사
    for (const [x, ri] of [[46, 0], [114, 0], [20, 1], [70, 2], [140, 2], [44, 3], [140, 1]]) {
      const y = R[ri] - 6; glow(q, x, y + 3, 15, "255,225,150", 0.32);
      q.fillStyle = "#6a707c"; q.fillRect(x - 0.3, y - 1.4, 0.8, 2); q.fillStyle = "#fff2c0"; q.beginPath(); q.ellipse(x + 0.1, y - 1.8, 1.6, 0.7, 0, 0, 6.3); q.fill();
      q.fillStyle = lgr(q, 0, y + 3, 0, y + 11, [[0, "rgba(255,230,160,.35)"], [1, "rgba(255,230,160,0)"]]); q.beginPath(); q.ellipse(x + 0.4, y + 7, 1.2, 4.5, 0, 0, 6.3); q.fill();
    }
    // 아래 띠: 보도·화단
    const yb = R[3] + 6; q.fillStyle = lgr(q, 0, yb, 0, H, [[0, "#30353f"], [1, "#22262e"]]); q.fillRect(0, yb, W, H - yb);
    q.strokeStyle = "rgba(0,0,0,.25)"; q.lineWidth = 0.3; q.beginPath(); for (let x = 0; x < W; x += 6) { q.moveTo(x, yb); q.lineTo(x, H); } q.stroke();
    for (let x = 64; x < W; x += 9) { rr(q, x, yb + 2, 7.4, 5.4, 2.4); q.fillStyle = lgr(q, 0, yb + 2, 0, yb + 7.4, [[0, "#4e9a5a"], [1, "#1e4a2a"]]); q.fill(); }
    return c;
  }
  BG = bgCanvas();

  // ── 소리 ──
  const S = {
    order: () => { tone(1568, 0.06, "square", 0.04); tone(2093, 0.08, "square", 0.04, 0, 0.08); },
    ready: () => { tone(988, 0.05, "triangle", 0.06); noise(0.06, 1500, 0.05, 0.02, 2); },
    add: (n) => { tone(700 + n * 180, 0.05, "square", 0.05); vib(6); },
    bike: () => { tone(90, 0.45, "sawtooth", 0.05, 80); tone(180, 0.4, "square", 0.02, 140, 0.05); noise(0.25, 900, 0.05, 0.05, 1); },
    bell: () => { tone(1318, 0.12, "triangle", 0.06); tone(1046, 0.16, "triangle", 0.06, 0, 0.12); },
    ring: () => { for (let k = 0; k < 4; k++) tone(1400, 0.05, "square", 0.04, 0, k * 0.1); },
    cheer: () => { noise(0.9, 1200, 0.12, 0, 0.4); for (let k = 0; k < 6; k++) tone(500 + rnd() * 500, 0.12, "triangle", 0.03, 0, k * 0.08); },
    alarm: () => { for (let k = 0; k < 3; k++) { tone(880, 0.09, "square", 0.06, 0, k * 0.2); tone(1175, 0.09, "square", 0.06, 0, k * 0.2 + 0.1); } },
    quit: () => { tone(330, 0.3, "triangle", 0.06, -120); tone(247, 0.4, "triangle", 0.05, -80, 0.25); },
    sizzle: (n) => noise(0.12, 5200 + rnd() * 2000, 0.004 + 0.003 * n, 0, 0.6),
    shutter: (at) => { for (let k = 0; k < 18; k++) { tone(180 + rnd() * 80, 0.03, "square", 0.04, 0, at + k * 0.075); noise(0.03, 1800, 0.06, at + k * 0.075, 2); } tone(90, 0.25, "sine", 0.2, -40, at + 1.4); noise(0.15, 500, 0.15, at + 1.4); },
    count: (n) => tone(1046 * Math.pow(1.05, n), 0.04, "square", 0.03),
  };

  // ── 상태 ──
  const orders = [], picks = [], served = [], riders = [], fx = [], rips = [];
  const drops = []; for (let k = 0; k < 70; k++) drops.push([rnd() * W, rnd() * 260, 0.8 + rnd() * 0.5]);
  let over = false, last = 0, t0 = 0, el = 0, oid = 0, nextI = 0, sales = 0, agUses = 0, trips = 0, stopsN = 0;
  let quitDone = false, pendQuit = false, quitT = -9, wrongDone = false, wrongT = -9, groupT = -9, goalT = -9, goals = 0, sizT = 0;
  let drag = null;
  const SCHED = [0.3, 1.4, 2.8, 4.0, 5.3, 8.4, 9.8, 11.2, 12.6, 13.8, 15.2, 17.6, 19.0, 21.0, 22.2, 23.6];
  const GOALS = [6.6, 16.4], GROUP_AT = 19.6, QUIT_AT = 10.2, WRONG_AT = 12.8;

  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x / W * r.width, r.top - s.top + y / H * r.height]; };
  const bubble = (x, y, text, cls = "") => { const b = document.createElement("div"); b.className = "mg-bub2 " + cls; b.textContent = text; b.style.left = clamp(x, 26, 134) * K + "px"; b.style.top = (y - 2) * K + "px"; bubs.appendChild(b); setTimeout(() => b.remove(), 1400); };
  const realS = () => served.filter((o) => !o.cx);
  const avgStar = () => { const s = served; return s.length ? (s.reduce((a, o) => a + o.stars * (o.kind === "g" ? 2 : 1), 0) / s.reduce((a, o) => a + (o.kind === "g" ? 2 : 1), 0)).toFixed(1) : "-"; };
  const updSc = () => (F.sc.textContent = `배달 ${realS().length} · ★${avgStar()}`);
  const mul = (o) => ez * (o.kind === "g" ? 1.3 : 1);
  const ageOf = (o) => (o.readyT == null ? 0 : el - o.readyT);
  const warmOf = (o) => (tut >= 0 ? 1 : c01(1 - ageOf(o) / (23 * mul(o))));
  const calcStars = (o) => { if (tut >= 0) return 5; const a = ageOf(o), m = mul(o); return a <= 9 * m ? 5 : a <= 13 * m ? 4 : a <= 17 * m ? 3 : a <= 21 * m ? 2 : 1; };
  const busy = (d) => orders.some((o) => o.d === d && !["done", "cx"].includes(o.st)) || picks.some((p) => p.d === d && p.st !== "done");
  const boxCount = () => orders.reduce((a, o) => a + (o.kind === "n" ? (o.st === "ready" ? 1 : 0) : o.st !== "done" && o.st !== "cx" ? o.readyN - o.asgN : 0), 0);

  // ── 주문 ──
  const newOrder = (d, ck) => {
    if (!d) { const free = DEST.filter((x) => !busy(x)); if (!free.length) return null; d = pick(free); }
    const o = { id: ++oid, kind: "n", d, st: "cook", ck: 0, ckT: ck != null ? ck : (1.5 + rnd() * 0.9) / Math.sqrt(ez), readyT: null, t0: el, stars: 0 };
    orders.push(o); S.order(); return o;
  };
  const newGroup = () => {
    const o = { id: ++oid, kind: "g", d: FIELD, st: "cook", ck: 0, ckT: 0.8 / Math.sqrt(ez), need: 3, readyN: 0, asgN: 0, dlv: 0, readyT: null, t0: el, stars: 0 };
    orders.push(o); groupT = el; S.alarm(); vib([50, 30, 50]);
    F.msg("단체 주문 폭탄! 축구 동호회 치킨 6마리"); bubble(FIELD.x, R[1] - 22, "6마리요! 박스 3개!", "red");
    return o;
  };
  const deliver = (o, wrong = false) => {
    if (o.st === "done" || o.st === "cx") return;
    o.st = "done"; o.t1 = el; o.stars = calcStars(o); if (wrong) { o.wrong = 1; if (tut < 0) o.stars = Math.min(o.stars, 4); } served.push(o);
    sales += o.kind === "g" ? PRICE * 3 : PRICE;
    const p = ptOf(o.d), [sx, sy] = stageXY(p.x, p.y - 16);
    if (o.stars >= 5) { F.hit([sx, sy], "★5", "#ffd23f"); if (rnd() < 0.5 || o.kind === "g") bubble(p.x, p.y - 14, o.kind === "g" ? "와 치킨 왔다!!" : pick(["뜨끈해요!", "감사합니다~", "빠르다!"])); }
    else { F.float([sx, sy], stars(o.stars), o.stars <= 3 ? "bad" : ""); if (o.stars <= 3) bubble(p.x, p.y - 14, o.stars <= 2 ? "치킨이 차가워요…" : "좀 식었네…", "angry"); }
    for (let k = 0; k < 6; k++) fx.push({ x: p.x, y: p.y - 8, vx: rnd() * 40 - 20, vy: -20 - rnd() * 30, t: 0.5, c: o.stars >= 4 ? "#ffe066" : "#9fd0ff" });
    custPop(p.x, p.y - 21, o.stars);
    S.bell(); updSc();
    if (tut === 1.5) setTimeout(() => tut === 1.5 && tutNext(2), 700);
  };
  const cancel = (o) => {
    o.st = "cx"; o.cx = 1; o.stars = 1; served.push(o);
    const p = ptOf(o.d); F.miss(stageXY(p.x, p.y - 14)); bubble(p.x, p.y - 14, "식어서 취소할게요", "angry"); custPop(p.x, p.y - 21, 1); F.msg("식어서 주문이 취소됐어요… ★1"); updSc();
  };
  // 오배송: 옆집에 잘못 놓고 온다 → ? 핀(회수) → ! 핀(원래 집)
  const misdeliver = (o) => {
    const same = DEST.filter((d) => d.r === o.d.r && d !== o.d && !busy(d)).sort((a, b) => Math.abs(a.x - o.d.x) - Math.abs(b.x - o.d.x));
    if (!same.length) return false;
    const nb = same[0], p = { kind: "p", d: nb, o, st: "ready" };
    picks.push(p); o.st = "lost"; o.pick = p; o.wrong = 1; wrongDone = true; wrongT = el;
    bubble(nb.x, R[nb.r] - 14, "어? 우리 거 아닌데?");
    setTimeout(() => { if (over) return; S.ring(); vib([30, 30, 30]); bubble(o.d.x, R[o.d.r] - 14, "치킨 아직 안 왔어요!", "angry"); F.msg("오배송! ? 핀에서 회수 → ! 핀으로"); }, 700);
    return true;
  };

  // ── 라이더 ──
  const mkRider = (i, agency = false) => ({ i, agency, c: agency ? AGC : RIDC[i], ck: agency ? AGCK : RCK[i], x: agency ? 172 : SPOT[i], y: R[3], dir: agency ? "l" : "r", st: agency ? "arrive" : "idle", path: [], stops: [], si: 0, wait: 0, spot: agency ? AGSPOT[riders.filter((r) => r.agency).length % 2] : SPOT[i], mv: false, load: 0 });
  const spotPt = (r) => ({ x: r.spot, y: R[3] });
  const route = (a, b) => {
    if (Math.abs(a.y - b.y) < 0.5) return [{ x: b.x, y: b.y }];
    let best = VX[0], bd = 1e9; for (const v of VX) { const d = Math.abs(a.x - v) + Math.abs(b.x - v); if (d < bd) { bd = d; best = v; } }
    return [{ x: best, y: a.y }, { x: best, y: b.y }, { x: b.x, y: b.y }];
  };
  const pathLen = (a, b) => { let L = 0, p = a; for (const q of route(a, b)) { L += Math.abs(q.x - p.x) + Math.abs(q.y - p.y); p = q; } return L; };
  const stopPt = (s) => ptOf(s.k === "p" ? s.p.d : s.o.d);
  const loadOf = (rt) => rt.reduce((a, s) => a + (s.k === "n" || s.k === "p" ? 1 : s.k === "g" ? s.take : 0), 0);
  const dispatch = (r, rt) => {
    for (const s of rt) { if (s.k === "n") { s.o.st = "asg"; s.o.asg = r; } else if (s.k === "g") s.o.asgN += s.take; else if (s.k === "p") s.p.st = "asg"; else if (s.k === "l") s.o.st = "lasg"; }
    r.stops = rt; r.si = 0; r.st = "go"; r.load = loadOf(rt); r.path = route(r, stopPt(rt[0])); r.wait = 0.15;
    if (tut < 0) { trips++; stopsN += rt.length; }
    S.bike(); vib(14); F.burst(stageXY(r.x, r.y - 6), "#ffb03b", 8);
    if (rt.length >= 2) F.float(stageXY(r.x, r.y - 16), rt.length + "곳 묶음!");
    if (tut === 1) tutNext(1.5);
    if (tut === 2) setTimeout(() => tut === 2 && tutNext(3), 900);
  };
  const handleStop = (r, s) => {
    const p = stopPt(s);
    if (s.k === "n") {
      if (tut < 0 && !wrongDone && el >= WRONG_AT && misdeliver(s.o)) { r.load--; return; }
      r.load--; deliver(s.o);
    } else if (s.k === "g") {
      r.load -= s.take; s.o.dlv += s.take; F.float(stageXY(p.x, p.y - 18), `박스 ${s.o.dlv}/${s.o.need}`);
      for (let k = 0; k < 8; k++) fx.push({ x: p.x, y: p.y - 8, vx: rnd() * 50 - 25, vy: -25 - rnd() * 30, t: 0.6, c: pick(["#ffe066", "#ffffff", "#7fe08a"]) });
      if (s.o.dlv >= s.o.need) { deliver(s.o); S.cheer(); } else S.bell();
    } else if (s.k === "p") {
      s.p.st = "done"; F.float(stageXY(p.x, p.y - 16), "회수!"); bubble(p.x, p.y - 14, "죄송해요 여기요~"); tone(1200, 0.06, "square", 0.05);
    } else if (s.k === "l") { r.load--; deliver(s.o, true); }
  };
  const doQuit = (r) => {
    quitDone = true; pendQuit = false; quitT = el; r.st = "quit"; r.path = [{ x: -14, y: R[3] }]; r.wait = 1.1;
    S.quit(); vib([40, 60, 40]);
    { const qt = document.createElement("div"); qt.className = "c2qt"; qt.innerHTML = `<i></i><span>사장님…<br>저 오늘까지만 할게요</span>`; const a = artOf(r.ck); qt.querySelector("i").style.backgroundImage = `url("${a.im.src}")`; wrap.appendChild(qt);
      setTimeout(() => qt.classList.add("out"), RM() ? 900 : 1900); setTimeout(() => qt.remove(), RM() ? 1300 : 2400); }
    setTimeout(() => !over && F.msg("라이더 한 명이 그만뒀어요! 모자라면 배달대행 톡"), 600);
  };
  const callAgency = () => {
    if (over || !(tut < 0 || tut === 3)) return;
    if (tut === 3 && riders.some((r) => r.agency)) return;
    if (riders.filter((r) => r.agency).length >= 2) { F.msg("대행 라이더가 이미 오고 있어요"); SFX.tok(); return; }
    const r = mkRider(0, true); riders.push(r);
    if (tut < 0) { agUses++; sales -= AGFEE; F.float(stageXY(26, H - 22), "-" + won(AGFEE) + "원", "bad"); }
    tone(880, 0.06, "square", 0.05); tone(1320, 0.08, "square", 0.05, 0, 0.08); vib(12);
    bubble(150, R[3] - 14, "대행 갑니다~");
    if (tut === 3) setTimeout(() => tut === 3 && tutNext(4), 1500);
  };
  const moveR = (r, dt) => {
    r.mv = false;
    if (r.wait > 0) { r.wait -= dt; return; }
    if (!r.path.length) return arrived(r);
    const p = r.path[0], dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy), mv = 66 * Math.sqrt(ez) * (H / 215) * (r.agency ? 1.08 : 1) * dt;
    if (Math.abs(dx) > Math.abs(dy)) r.dir = dx > 0 ? "r" : "l"; else if (d > 0.01) r.dir = dy > 0 ? "d" : "u";
    if (d <= mv) { r.x = p.x; r.y = p.y; r.path.shift(); } else { r.x += dx / d * mv; r.y += dy / d * mv; }
    r.mv = true;
    if (rnd() < 0.5) fx.push({ x: r.x + (r.dir === "r" ? -6 : r.dir === "l" ? 6 : 0) + rnd() * 2, y: r.y + 2, vx: rnd() * 16 - 8, vy: -8 - rnd() * 10, t: 0.3, c: "#8aa0c0" });
  };
  const arrived = (r) => {
    if (r.st === "go") {
      handleStop(r, r.stops[r.si]); r.si++; r.wait = 0.32;
      if (r.si < r.stops.length) r.path = route(r, stopPt(r.stops[r.si]));
      else { r.st = "back"; r.path = route(r, spotPt(r)); }
    } else if (r.st === "back") {
      if (r.agency) { r.st = "leave"; r.path = [{ x: 174, y: R[3] }]; bubble(r.x, r.y - 16, "수고하세요~"); }
      else if (pendQuit && !quitDone) doQuit(r);
      else { r.st = "idle"; r.dir = "r"; }
    } else if (r.st === "arrive") { r.st = "idle"; r.dir = "l"; }
    else if (r.st === "leave" || r.st === "quit") { const i = riders.indexOf(r); if (i >= 0) riders.splice(i, 1); }
  };

  // ── 핀 목록(끌기 판정용) ──
  const pinList = () => {
    const L = [];
    for (const o of orders) {
      const p = ptOf(o.d), base = { cx: p.x, ty: p.y - 7, o };
      if (o.kind === "n") { if (o.st === "cook") L.push({ ...base, k: "c" }); else if (o.st === "ready") L.push({ ...base, k: "n" }); else if (o.st === "lost") L.push({ ...base, k: "l" }); }
      else if (o.st !== "done" && o.st !== "cx") { if (o.readyN - o.asgN > 0) L.push({ ...base, k: "g" }); else if (o.asgN < o.need) L.push({ ...base, k: "c" }); }
    }
    for (const p of picks) if (p.st === "ready") { const q = ptOf(p.d); L.push({ cx: q.x, ty: q.y - 7, k: "p", p, o: p.o }); }
    return L;
  };
  const inRoute = (rt, pn) => rt.some((s) => s.k === pn.k && (pn.k === "p" ? s.p === pn.p : s.o === pn.o));
  const addStop = (rt, pn, quiet = false) => {
    if (inRoute(rt, pn)) return false;
    const say = (t) => { if (!quiet && drag && drag.said !== t) { drag.said = t; F.msg(t); SFX.tok(); } };
    const load = loadOf(rt);
    if (pn.k === "c") { say("아직 튀기는 중이에요! 박스가 나오면 보내요"); return false; }
    if (pn.k === "n" || pn.k === "p") { if (load + 1 > CAP) { say("가방이 꽉 찼어요 (최대 3개)"); return false; } rt.push(pn.k === "p" ? { k: "p", p: pn.p } : { k: "n", o: pn.o }); return true; }
    if (pn.k === "g") { const take = Math.min(pn.o.readyN - pn.o.asgN, CAP - load); if (take <= 0) { say("가방이 꽉 찼어요 (최대 3개)"); return false; } rt.push({ k: "g", o: pn.o, take }); return true; }
    if (pn.k === "l") { if (!(pn.o.pick.st === "done" || rt.some((s) => s.k === "p" && s.p.o === pn.o))) { say("먼저 ? 핀(옆집)에서 치킨을 회수해요"); return false; } rt.push({ k: "l", o: pn.o }); return true; }
    return false;
  };

  // ── 할 일 손가락 ──
  const FUP = fingerURL(false), FDN = fingerURL(true);
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.m || ""},${o.dx | 0},${o.dy | 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "c2go"; return; }
    const up = o.m === "dr" || o.y < 70;
    goI.style.backgroundImage = `url(${up ? FUP : FDN})`;
    goEl.style.left = o.x * K + "px"; goEl.style.top = o.y * K + "px"; goT.innerHTML = o.t; goT.style.transform = o.x < 40 ? "translateX(-20%)" : o.x > 120 ? "translateX(-80%)" : "";
    if (o.m === "dr") { goI.style.setProperty("--dx", o.dx * K + "px"); goI.style.setProperty("--dy", o.dy * K + "px"); }
    goEl.className = "c2go on " + (up ? "up" : "dn") + (o.m === "dr" ? " dr" : "");
  };
  const idleR = () => riders.filter((r) => r.st === "idle");
  const dragHint = (r, pn, t) => ({ x: r.x, y: r.y - 4, t, m: "dr", dx: pn.cx - r.x, dy: pn.ty - 5 - (r.y - 4) });
  const agHint = (t) => ({ x: 28, y: H - 22, t });
  const taskNow = () => {
    const id = idleR(); const L = pinList();
    if (quitDone && el - quitT < 5 && !riders.some((r) => r.agency) && agUses === 0) return agHint("배달대행 <b>톡!</b>");
    if (!id.length) return null;
    const r = id[0];
    const pk = L.find((p) => p.k === "p"); if (pk && el - wrongT < 7) return dragHint(r, pk, "? 핀 <b>회수</b> → ! 핀으로");
    const gp = L.find((p) => p.k === "g"); if (gp && el - groupT < 6) return dragHint(r, gp, "단체 주문! <b>박스 한 번에</b>");
    const rd = L.filter((p) => p.k === "n").sort((a, b) => a.o.readyT - b.o.readyT);
    if (rd.length && el < 7) return dragHint(r, rd[0], "라이더를 <b>끌어</b> 핀까지");
    const ur = rd.find((p) => warmOf(p.o) < 0.4); if (ur) return dragHint(r, ur, "식어요! <b>얼른</b>");
    return null;
  };

  // ── 리허설 ──
  let tut = 0, tutT = 0;
  const SKIP = `<button class="c2skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutT = 0; tutEl.classList.remove("pop", "mid", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    if (n === 1) { tutP.innerHTML = `주문이 들어왔어요! 치킨이 튀겨지면 <b>가게 앞에 박스</b>가 쌓이고 핀에 <b>김</b>이 나요.<br>가게 앞 <b>라이더를 끌어서</b> 주문 핀까지 이어요.`; tutB.innerHTML = SKIP; }
    else if (n === 1.5) { tutP.innerHTML = `출발! 도착하면 손님이 <b>별점</b>을 줘요.`; tutB.innerHTML = SKIP; }
    else if (n === 2) {
      const a = DEST[6], b = DEST[7]; newOrder(a, 0.2); newOrder(b, 0.2);
      tutP.innerHTML = `가까운 주문은 <b>한 번에 묶어서!</b><br>라이더에서 시작해 핀 <b>두 개를 차례로 지나가게</b> 끌어요. (가방 최대 3개)`; tutB.innerHTML = SKIP;
    }
    else if (n === 3) { tutP.innerHTML = `핀 아래 막대는 <b>식는 시계</b>예요. <b class="bl">파랗게 식으면</b> <b class="rd">별점이 깎이고</b> 식은 치킨 리뷰가 달려요.<br>라이더가 모자라면 아래 <b class="gr">배달대행</b>을 톡! (진짜 영업에선 수수료가 나가요)`; tutB.innerHTML = SKIP; tutEl.classList.add("mid"); }
    else if (n === 4) {
      tutEl.classList.add("mid");
      tutP.innerHTML = `금요일 밤 9시, 축구 하는 날이라 <b>주문이 쏟아져요!</b><br>중간에 <b class="rd">라이더 이탈 · 오배송 · 단체 주문</b>이 생겨요.<br>할 일은 <b>손가락</b>이 짚어 줘요.`;
      tutB.innerHTML = `<button class="c2go2" data-go>영업 시작!</button>`;
    }
  };
  const resetAll = () => {
    orders.length = 0; picks.length = 0; served.length = 0; fx.length = 0; riders.length = 0;
    for (let i = 0; i < 3; i++) riders.push(mkRider(i));
    sales = 0; agUses = 0; trips = 0; stopsN = 0; oid = 0; nextI = 0;
    quitDone = false; pendQuit = false; quitT = -9; wrongDone = false; wrongT = -9; groupT = -9; goalT = -9; goals = 0;
    fbEl.textContent = "축구 0:0";
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null); drag = null;
    resetAll(); t0 = 0; el = 0; SFX.go?.();
    timer(T, F.bar, end); updSc();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });
  agBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callAgency(); });

  // ── 입력: 라이더에서 시작해 핀들을 지나가게 끌기 ──
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const canDrag = () => !over && (tut < 0 || tut === 1 || tut === 2);
  const down = (x, y) => {
    if (!canDrag()) return;
    let best = null, bd = 1e9;
    for (const r of riders) { const d = Math.hypot(x - r.x, (y - (r.y - 5)) * 0.8); if (d < 13 && d < bd) { bd = d; best = r; } }
    if (best && best.st !== "idle") { F.msg(best.st === "go" ? "배달 중이에요. 다른 라이더를 끌어요" : "아직 가게로 오는 중이에요"); SFX.tok(); return; }
    if (!best && SHOP && x > SHOP.x0 - 6 && x < SHOP.x1 && y > SHOP.fy - 4 && y < R[3] + 8) { best = idleR().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]; if (!best) { F.msg("쉬는 라이더가 없어요. 배달대행을 불러요"); SFX.tok(); return; } }
    if (!best) { if (pinList().some((p) => Math.hypot(p.cx - x, p.ty - 5 - y) < 10)) { F.msg("가게 앞 라이더를 끌어서 핀까지 이어요"); SFX.tok(); } return; }
    drag = { r: best, rt: [], x, y }; tone(520, 0.04, "square", 0.04); vib(5);
  };
  const scan = (x, y) => {
    if (!drag) return;
    for (const pn of pinList()) if (Math.hypot(pn.cx - x, (pn.ty - 5 - y) * 0.9) < 10 && addStop(drag.rt, pn)) S.add(drag.rt.length);
  };
  const move = (x, y) => {
    if (!drag) return;
    const steps = Math.ceil(Math.hypot(x - drag.x, y - drag.y) / 3);
    for (let k = 1; k <= steps; k++) scan(drag.x + (x - drag.x) * k / steps, drag.y + (y - drag.y) * k / steps);
    drag.x = x; drag.y = y;
  };
  const upE = () => {
    if (!drag) return; const d = drag; drag = null;
    if (over || !d.rt.length) { if (!over && Math.hypot(d.x - d.r.x, d.y - d.r.y) > 14) { F.msg("주문 핀 위를 지나가게 끌어요"); SFX.tok(); } return; }
    if (tut === 2 && d.rt.length < 2) { const L = pinList().filter((p) => p.k === "n"); if (L.length) { F.msg("이번엔 핀 두 개를 한 번에 이어 봐요!"); SFX.tok(); return; } }
    if (d.r.st !== "idle") return;
    dispatch(d.r, d.rt);
  };
  let lastP = null;
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = toL(e); lastP = [x, y]; down(x, y); });
  cv.addEventListener("pointermove", (e) => { if (!lastP) return; const [x, y] = toL(e); move(x, y); lastP = [x, y]; });
  cv.addEventListener("pointerup", (e) => { if (lastP && e.clientX != null) move(...toL(e)); upE(); lastP = null; });
  cv.addEventListener("pointercancel", () => { drag = null; lastP = null; });

  // ── 이름표·버튼 자리 ──
  const placeUI = () => {
    Object.assign(signEl.style, { left: (SHOP.x0 + 10) * K + "px", top: (SHOP.fy - 9) * K + "px", width: (SHOP.x1 - SHOP.x0 - 20) * K + "px", height: 8 * K + "px", lineHeight: 8 * K + "px" });
    const yb = R[3] + 7;
    Object.assign(agBtn.style, { left: 3 * K + "px", top: yb * K + "px", width: 56 * K + "px", height: (H - yb - 2) * K + "px" });
    Object.assign(cntEl.style, { right: 4 * K + "px", top: (yb + 1) * K + "px" });
  };
  placeUI();
  const uiUpd = () => {
    const tm = 21 * 60 + Math.floor((tut < 0 ? el : 0) / T * 120), hh = Math.floor(tm / 60), mm = tm % 60;
    const ct = tut >= 0 ? "금 20:58" : `금 ${hh}:${String(mm).padStart(2, "0")}`; if (ckEl.textContent !== ct) ckEl.textContent = ct;
    const hot = (tut === 3) || (tut < 0 && quitDone && el - quitT < 5 && !riders.some((r) => r.agency));
    const cl = "c2ag" + (hot ? " hot" : "") + (riders.filter((r) => r.agency).length >= 2 || (tut >= 0 && tut !== 3) ? " dis" : "");
    if (agBtn.className !== cl) agBtn.className = cl;
    const nR = riders.filter((r) => !r.agency && r.st !== "quit").length, nA = riders.filter((r) => r.agency).length;
    const tx = `라이더 ${nR}명${nA ? ` + 대행 ${nA}` : ""}<br>대행 ${agUses}회`;
    if (cntEl.innerHTML !== tx) cntEl.innerHTML = tx;
  };

  // ── 그리기(벡터) ──
  const dash = (pts, col, off, wd = 0.9) => {
    if (pts.length < 2) return;
    g.save(); g.strokeStyle = col; g.lineWidth = wd; g.lineCap = "round"; g.lineJoin = "round"; g.setLineDash([2, 1.6]); g.lineDashOffset = off;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); g.restore();
  };
  const routePts = (r, rt, from) => { const pts = [{ x: r.x, y: r.y }]; let cur = { x: r.x, y: r.y }; for (let i = from; i < rt.length; i++) { const q = stopPt(rt[i]); for (const w of r.path && i === from && r.st === "go" ? r.path : route(cur, q)) pts.push(w); cur = q; } return pts; };
  const numBadge = (x, y, n, bg, fg, r0 = 3.6) => { g.beginPath(); g.arc(x, y, r0, 0, 6.3); g.fillStyle = bg; g.fill(); g.strokeStyle = "#1a1a22"; g.lineWidth = 0.6; g.stroke(); g.fillStyle = fg; g.font = `900 ${r0 * 1.45}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(n), x, y + 0.3); };
  const drawPins = (tm) => {
    const sel = drag ? drag.rt : [];
    const items = [];
    for (const o of orders) if (!["done", "cx"].includes(o.st)) items.push({ o, d: o.d });
    for (const p of picks) if (p.st !== "done") items.push({ p, d: p.d });
    items.sort((a, b) => R[a.d.r] - R[b.d.r]);
    for (const it of items) {
      const pt = ptOf(it.d), cx = pt.x, ty = pt.y - 7;
      if (it.p) {
        const asg = it.p.st === "asg"; const si = sel.findIndex((s) => s.k === "p" && s.p === it.p);
        if (asg) g.globalAlpha = 0.45;
        pinDraw(g, cx, ty + (asg ? 0 : Math.sin(tm * 6)), { st: "pick", sel: si >= 0 });
        g.globalAlpha = 1; if (si >= 0) badge(cx, ty, si + 1);
        continue;
      }
      const o = it.o, gp = o.kind === "g";
      if (o.st === "cook" || (gp && o.readyN === 0)) { pinDraw(g, cx, ty, { st: "c", prog: o.ck / o.ckT, blink: Math.floor(tm * 6) % 2, w: gp ? 17 : 11 }); continue; }
      const w = warmOf(o), asg = o.st === "asg" || o.st === "lasg" || (gp && o.asgN >= o.need);
      const si = sel.findIndex((s) => s.o === o && s.k !== "p");
      const urgent = !asg && w < 0.35 && Math.floor(tm * 5) % 2;
      const bob = !asg && w < 0.35 ? Math.sin(tm * 14) * 0.8 : 0;
      if (asg) g.globalAlpha = 0.45;
      if (o.st === "lost") pinDraw(g, cx, ty + Math.sin(tm * 9), { st: "lost", sel: si >= 0, urgent: Math.floor(tm * 4) % 2 });
      else pinDraw(g, cx, ty + bob, { st: "r", warm: w, cold: c01((0.5 - w) * 2) * 0.9, sel: si >= 0, urgent, w: gp ? 17 : 11, n: gp ? o.readyN - o.asgN : 1 });
      g.globalAlpha = 1;
      // 김(따뜻할 때) · 물방울(식었을 때)
      if (!asg && o.st !== "lost") {
        if (w > 0.55) { g.lineCap = "round"; for (let k = 0; k < 2; k++) { const ph = (tm * 0.9 + k * 0.5) % 1, sx = cx - 2 + k * 4 + Math.sin(tm * 4 + k * 2), sy = ty - 13 - ph * 7; g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(sx, sy + 2.4); g.quadraticCurveTo(sx + 1.2, sy + 1.2, sx, sy); g.stroke(); } }
        else if (w < 0.3) { const ph = (tm * 1.4) % 1, dx = cx + 6.4, dy = ty - 12 + ph * 6; g.fillStyle = "#9fd0ff"; g.beginPath(); g.moveTo(dx, dy - 1.4); g.quadraticCurveTo(dx + 1.1, dy + 0.4, dx, dy + 0.9); g.quadraticCurveTo(dx - 1.1, dy + 0.4, dx, dy - 1.4); g.fill(); }
      }
      if (gp) numBadge(cx + 11, ty - 10, o.need - o.dlv, "#e0402a", "#ffffff", 3.8);
      if (si >= 0) badge(cx, ty, si + 1);
    }
  };
  const badge = (cx, ty, n) => numBadge(cx + 6.5, ty - 14, n, "#ffe066", "#2a1e2e", 3.8);
  // 라이더 얼굴 동그라미(캐릭터 그림): 쉬는 중 무표정, 출발 웃음, 그만둘 때 슬픔
  const faceDot = (ck, e, x, y, rad, ring) => {
    const a = artOf(ck); g.save(); g.beginPath(); g.arc(x, y, rad, 0, 6.3); g.fillStyle = "#e8eef8"; g.fill(); g.clip();
    if (a.ok) { const [sx, sy, sw, sh] = faceSrc(e, 6, 10); g.drawImage(a.im, sx, sy, sw, sh, x - rad, y - rad, rad * 2, rad * 2); }
    g.restore(); g.beginPath(); g.arc(x, y, rad, 0, 6.3); g.strokeStyle = ring; g.lineWidth = 0.7; g.stroke();
  };
  const drawRider = (r, tm) => {
    const bob = r.mv ? Math.sin(tm * 24) * 0.3 : 0, x = r.x, y = r.y - 1 + bob;
    if (r.mv) { // 헤드라이트 빛
      const ang = r.dir === "r" ? 0 : r.dir === "l" ? Math.PI : r.dir === "d" ? Math.PI / 2 : -Math.PI / 2;
      g.save(); g.translate(x, y); g.rotate(ang); const gl = g.createLinearGradient(6, 0, 20, 0); gl.addColorStop(0, "rgba(255,240,180,.35)"); gl.addColorStop(1, "rgba(255,240,180,0)"); g.fillStyle = gl; g.beginPath(); g.moveTo(6, -1); g.lineTo(20, -5); g.lineTo(20, 5); g.lineTo(6, 1); g.fill(); g.restore();
    }
    vScooter(g, x, y, r.dir, r.c, tm, r.mv);
    const e = r.st === "quit" ? 2 : r.st === "go" ? 1 : r.agency && r.st === "leave" ? 1 : 0;
    const fy = y - 9.5, idle = r.st === "idle" && tut !== 0;
    if (idle) { const a = 0.5 + 0.5 * Math.sin(tm * 5 + r.i); g.strokeStyle = `rgba(255,224,102,${a})`; g.lineWidth = 0.8; g.beginPath(); g.arc(x, fy, 5.6, 0, 6.3); g.stroke(); }
    faceDot(r.ck, e, x, fy, 4.2, r.agency ? "#3ec07a" : "#ffffff");
    if (r.st === "go" && r.load > 0) for (let k = 0; k < Math.min(3, r.load); k++) vBox(g, x + 5 + k * 0.4, fy - 4 + k * 2.6, 0.5);
  };
  const drawStack = (tm) => {
    const n = boxCount(); const bx = SHOP.x0 + 2, by = R[3] - 11;
    for (let k = 0; k < Math.min(n, 8); k++) { const col = k % 2, row = k >> 1; vBox(g, bx + col * 8, by - row * 5, 1); }
    if (n > 8) numBadge(bx + 20, by - 9, Math.min(9, n - 8), "#e0402a", "#ffffff", 3.8);
    // 가게 굴뚝 김
    const [cx, cy] = SHOP.chim; const nk = orders.some((o) => o.st === "cook") ? 4 : 2;
    for (let k = 0; k < nk; k++) { const ph = (tm * 0.6 + k / nk) % 1; g.fillStyle = `rgba(220,220,230,${0.4 * (1 - ph)})`; g.beginPath(); g.arc(cx + 1 + Math.sin(tm * 2 + k) * 2 + ph * 4, cy - 1 - ph * 14, 1 + ph * 2, 0, 6.3); g.fill(); }
  };
  // 손님 반응 얼굴(배달 도착: 별점에 맞는 표정)
  const drawPops = (tm) => {
    for (const p of pops) {
      const a = p.t < 0.15 ? p.t / 0.15 : p.t > 1.1 ? Math.max(0, 1 - (p.t - 1.1) / 0.3) : 1, s = 0.6 + 0.4 * Math.min(1, p.t / 0.18);
      g.save(); g.globalAlpha = a; g.translate(p.x, p.y - p.t * 4); g.scale(s, s);
      g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(-1.6, 5.6); g.lineTo(0, 8.4); g.lineTo(1.6, 5.6); g.fill();
      faceDot(p.ck, p.e, 0, 0, 6.2, p.e === 1 ? "#ffd23f" : p.e === 3 ? "#ff5a4a" : "#9fd0ff");
      g.restore();
    }
  };
  const render = (tm) => {
    g.drawImage(BG, 0, 0, W, H);
    // TV 깜빡임(축구 중계) · 골 장면
    const gl = el - goalT < 1.2 && tut < 0;
    for (const w of tvWins) { const f = (Math.sin(tm * 7 + w[0] * 1.7) + Math.sin(tm * 13 + w[1])) > 0.6; g.fillStyle = gl ? (Math.floor(tm * 10) % 2 ? "#ffffff" : "#ffe066") : f ? "#a8c8ff" : "#4a6ab0"; rr(g, w[0], w[1], w[2] || 2, w[3] || 2, 0.3); g.fill(); }
    if (gl) for (const w of aptWins) if ((w[0] + w[1]) % 3 === Math.floor(tm * 10) % 3) { g.fillStyle = "#fff6c0"; rr(g, w[0], w[1], 2, 2, 0.3); g.fill(); }
    // 달리는 라이더의 남은 길(흐리게)
    for (const r of riders) if (r.st === "go") { g.globalAlpha = 0.45; dash(routePts(r, r.stops, r.si), r.agency ? "#7fe0a8" : "#ffd27a", -tm * 20); g.globalAlpha = 1; }
    drawPins(tm);
    drawStack(tm);
    // 끄는 길
    if (drag) {
      const r = drag.r, pts = [{ x: r.x, y: r.y }]; let cur = { x: r.x, y: r.y };
      for (const s of drag.rt) { const q = stopPt(s); for (const w of route(cur, q)) pts.push(w); cur = q; }
      g.save(); g.shadowColor = "rgba(255,220,80,.8)"; g.shadowBlur = 3; dash(pts, "#ffe066", -tm * 30, 1.3); g.restore();
      dash([cur, { x: drag.x, y: drag.y }], "rgba(255,246,192,.8)", -tm * 30);
      g.strokeStyle = "#ffe066"; g.lineWidth = 0.8; g.beginPath(); g.arc(drag.x, drag.y, 2.2, 0, 6.3); g.stroke();
      const ld = loadOf(drag.rt); for (let k = 0; k < CAP; k++) { rr(g, drag.x + 4 + k * 3.2, drag.y + 3.4, 2.6, 2.6, 0.6); g.fillStyle = k < ld ? "#ffb03b" : "rgba(255,255,255,.35)"; g.fill(); }
    }
    riders.slice().sort((a, b) => a.y - b.y).forEach((r) => drawRider(r, tm));
    drawPops(tm);
    // 파티클
    for (const s of fx) { g.globalAlpha = c01(s.t * 2.5); g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 0.6, 0, 6.3); g.fill(); } g.globalAlpha = 1;
    // 빗물 고임 동그라미
    for (const p of rips) { g.strokeStyle = `rgba(160,190,230,${0.5 * (1 - p.t / 0.5)})`; g.lineWidth = 0.3; g.beginPath(); g.ellipse(p.x, p.y, 0.5 + p.t * 7, 0.3 + p.t * 3, 0, 0, 6.3); g.stroke(); }
    // 비(가는 빗줄기)
    g.strokeStyle = "rgba(180,205,240,.42)"; g.lineWidth = 0.35; g.lineCap = "round"; g.beginPath();
    for (const d of drops) { const x = ((d[0] - tm * 26 * d[2]) % W + W) % W, y = (d[1] + tm * 190 * d[2]) % (H + 10) - 5; g.moveTo(x, y); g.lineTo(x - 0.5, y + 3.6); }
    g.stroke();
  };

  // ── 매 프레임 ──
  const step = (dt) => {
    for (const o of orders) {
      if (o.kind === "n" && o.st === "cook") { o.ck += dt; if (o.ck >= o.ckT) { o.st = "ready"; o.readyT = el; S.ready(); const p = ptOf(o.d); F.burst(stageXY(SHOP.x0 + 6, R[3] - 12), "#ffd27a", 5); for (let k = 0; k < 4; k++) fx.push({ x: p.x, y: p.y - 12, vx: rnd() * 20 - 10, vy: -15, t: 0.4, c: "#ffffff" }); } }
      if (o.kind === "g" && o.st !== "done" && o.st !== "cx" && o.readyN < o.need) { o.ck += dt; if (o.ck >= o.ckT) { o.ck = 0; o.readyN++; if (o.readyT == null) o.readyT = el; S.ready(); } }
    }
    riders.slice().forEach((r) => moveR(r, dt));
    for (let i = fx.length - 1; i >= 0; i--) { const s = fx[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 90 * dt; if (s.t <= 0) fx.splice(i, 1); }
    if (rnd() < dt * 9) { const ry = pick(R); rips.push({ x: rint(W), y: ry + rint(7) - 3, t: 0 }); }
    for (let i = rips.length - 1; i >= 0; i--) { rips[i].t += dt; if (rips[i].t > 0.5) rips.splice(i, 1); }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.4) pops.splice(i, 1); }
    const nc = orders.filter((o) => o.st === "cook").length; if (nc) { sizT -= dt; if (sizT <= 0) { sizT = 0.15; S.sizzle(nc); } }
  };
  const gameStep = (dt) => {
    while (nextI < SCHED.length && el >= SCHED[nextI]) { newOrder(); nextI++; }
    if (goals < GOALS.length && el >= GOALS[goals]) {
      goals++; goalT = el; S.cheer(); vib([30, 30, 30]); fbEl.textContent = `축구 ${goals}:0`; fbEl.classList.remove("on"); void fbEl.offsetWidth; fbEl.classList.add("on");
      bubble(28, R[0] - 20, "골!!!", "red"); bubble(101, R[2] - 20, "와아아아"); bubble(60, R[2] - 16, "치킨 추가요!");
      F.msg(goals === 1 ? "골! 동네가 들썩, 주문이 몰려요" : "또 골! 축하 치킨 주문!"); newOrder(); newOrder();
    }
    if (groupT < 0 && el >= GROUP_AT) newGroup();
    if (!quitDone && !pendQuit && el >= QUIT_AT) { const r = riders.find((x) => !x.agency && x.st === "idle"); if (r) doQuit(r); else pendQuit = true; }
    for (const o of orders) {
      if (o.readyT == null) continue;
      const unasg = (o.kind === "n" && (o.st === "ready" || (o.st === "lost" && o.pick.st === "ready"))) || (o.kind === "g" && o.asgN === 0 && o.st !== "done" && o.st !== "cx");
      if (unasg && ageOf(o) > 23 * mul(o)) { if (o.pick) o.pick.st = "done"; cancel(o); }
    }
  };

  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tut >= 0) {
      tutT += dt;
      if (tut === 0 && (opts.retry || tutT > 0.4)) { if (opts.retry) startGame(); else { resetAll(); newOrder(DEST[9], 0.6); tutNext(1); } }
      if (tut >= 1) step(dt);
      if (tut === 1 || tut === 2) { const id = idleR()[0], L = pinList().filter((p) => p.k === "n"); guide(id && L.length ? dragHint(id, L[0], tut === 2 ? "핀 <b>두 개</b>를 지나가게" : "라이더를 <b>끌어</b> 핀까지") : null); }
      else if (tut === 3) guide(agHint("배달대행 <b>톡!</b>"));
      else guide(null);
    } else if (!over) {
      if (!t0) t0 = now;
      el = (now - t0) / 1000;
      gameStep(dt); step(dt);
      guide(drag ? null : taskNow());
    }
    uiUpd();
    render(tut >= 0 ? now / 1000 : el);
    requestAnimationFrame(loop);
  };

  // ── 끝: 배달통 사장님 화면 → 셔터 내리기 ──
  const appURL = () => svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8ff0"/><stop offset="1" stop-color="#1f56b0"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#a)"/><path d="M7 12h14l-1.4 9H8.4z" fill="#fff"/><path d="M9 12V9.6A5 5 0 0 1 19 9.6V12" fill="none" stroke="#ffb03b" stroke-width="2"/><circle cx="11" cy="24.5" r="2" fill="#1a1a2a"/><circle cx="20" cy="24.5" r="2" fill="#1a1a2a"/><path d="M21 15h4l2 4v4h-6z" fill="#ffd23f"/></svg>`);
  const custFace = (k, st) => {
    const a = artOf(custs[k % custs.length]); if (!a.ok) return "";
    const c = document.createElement("canvas"); c.width = c.height = 64; const q = c.getContext("2d");
    const [sx, sy, sw, sh] = faceSrc(st >= 5 ? 1 : st >= 4 ? 4 : st >= 3 ? 2 : 3, 4, 6); q.drawImage(a.im, sx, sy, sw, sh, 0, 0, 64, 64);
    return `<img src="${c.toDataURL()}" alt="">`;
  };
  const end = () => {
    if (over) return; over = true; drag = null; guide(null);
    // 이미 달리고 있는 배달은 곧 도착한다고 보고 지금 시각으로 별점
    const live = [];
    for (const r of riders) if (r.st === "go") for (let i = r.si; i < r.stops.length; i++) { const s = r.stops[i]; if ((s.k === "n" || s.k === "l") && !live.includes(s.o)) live.push(s.o); if (s.k === "g" && !live.includes(s.o)) { s.o.dlv += s.take; if (s.o.dlv >= s.o.need) live.push(s.o); } }
    el += 1.5; for (const o of live) if (o.st !== "done") deliver(o, !!o.wrong);
    const due = orders.filter((o) => o.st === "done" || o.st === "cx" || (o.readyT != null && o.readyT < T - 9));
    const wsum = due.reduce((a, o) => a + (o.kind === "g" ? 2 : 1), 0) || 1;
    const base = due.reduce((a, o) => a + (o.kind === "g" ? 2 : 1) * (o.st === "done" ? (o.stars - 1) / 4 : 0), 0) / wsum;
    const done = orders.filter((o) => o.st === "done"), cx = orders.filter((o) => o.st === "cx");
    const thr = clamp(done.length / Math.max(1, due.length), 0, 1);
    const bundle = trips ? clamp((stopsN / trips - 1) / 1, 0, 1) : 0;
    const score = clamp(0.85 * base + 0.15 * thr - 0.012 * Math.max(0, agUses - 1), 0, 1);
    const av = avgStar(), cold = done.filter((o) => o.stars <= 3).length;
    const fee = agUses * AGFEE, gross = sales + fee;
    SFX.end?.(); dim.classList.add("on");
    const box = document.createElement("div"); box.className = "c2end";
    box.innerHTML = `<div class="c2ph"><div class="nt0"></div><div class="c2scr"><div class="c2hd"><img src="${appURL()}" alt=""><p>배달통 사장님<small>황금닭 · 금요일 마감</small></p></div>
      <div class="c2big"><div><small>오늘 리뷰 평점</small><b class="av">★0.0</b></div><div class="st">${av === "-" ? "" : stars(Math.round(+av))}</div></div>
      <div class="c2rows"><p><span>배달 완료</span><b class="n1">0건</b></p><p><span>매출</span><b class="n2">0원</b></p>${fee ? `<p class="neg"><span>배달대행 수수료</span><b>-${won(fee)}원</b></p>` : ""}${cx.length ? `<p class="neg"><span>식어서 취소</span><b>${cx.length}건</b></p>` : ""}<p class="tot"><span>오늘 남은 돈</span><b class="n3">0원</b></p></div>
      <div class="c2ls"></div></div></div>`;
    wrap.appendChild(box);
    const avEl = box.querySelector(".av"), n1 = box.querySelector(".n1"), n2 = box.querySelector(".n2"), n3 = box.querySelector(".n3"), ls = box.querySelector(".c2ls");
    const avN = av === "-" ? 0 : +av, CT = RM() ? 300 : 1100; let ct0 = 0, ck = 0;
    const cnt = (nw) => { if (!box.isConnected) return; if (!ct0) ct0 = nw; const k = c01((nw - ct0) / CT), e = 1 - Math.pow(1 - k, 3);
      avEl.textContent = "★" + (avN * e).toFixed(1); n1.textContent = Math.round(done.length * e) + "건"; n2.textContent = won(Math.round(gross * e / 100) * 100) + "원"; n3.textContent = won(Math.round(sales * e / 100) * 100) + "원";
      if (Math.floor(k * 12) > ck) { ck = Math.floor(k * 12); S.count(ck); }
      if (k < 1) requestAnimationFrame(cnt); };
    setTimeout(() => requestAnimationFrame(cnt), 350);
    // 리뷰 알림
    const pool = []; const by = done.slice().sort((a, b) => b.stars - a.stars);
    if (by.length) pool.push(by[0]); const cw = done.find((o) => o.stars <= 3); if (cw) pool.push(cw); const ww = done.find((o) => o.wrong); if (ww && !pool.includes(ww)) pool.push(ww); if (cx.length) pool.push(cx[0]); for (let k = 1; k < by.length && pool.length < 4; k++) if (!pool.includes(by[k])) pool.push(by[k]);
    const r5 = shuffle(RV5.slice());
    pool.slice(0, 4).forEach((o, k) => setTimeout(() => {
      if (!ls.isConnected) return;
      const txt = o.cx ? pick(RVX) : o.wrong ? RVW : o.stars >= 5 ? r5.shift() || RV5[0] : o.stars === 4 ? pick(RV4) : o.stars === 3 ? pick(RV3) : pick(RV2);
      const d = document.createElement("div"); d.className = "c2nt" + (o.stars >= 4 && !o.cx ? "" : " bad");
      d.innerHTML = `${custFace(k + 3, o.cx ? 1 : o.wrong ? 3 : o.stars)}<p><b>${stars(o.cx ? 1 : o.stars)} · ${o.d.n}</b><span>${txt}</span></p>`;
      ls.prepend(d); if (o.stars >= 4 && !o.cx) tone(1318, 0.08, "triangle", 0.05); else tone(392, 0.12, "triangle", 0.05);
    }, (RM() ? 300 : 1500) + k * (RM() ? 100 : 380)));
    const T1 = RM() ? 1400 : 3600;
    setTimeout(() => { box.classList.add("out"); shutter(score, () => finish(score, `${done.length}건 배달 · 평균 <b>★${av}</b> · 남은 돈 ${won(sales)}원${cx.length ? ` · 취소 ${cx.length}` : ""}`, "", [["따끈함(별점)", base], ["처리량", thr], ["묶음 배달", bundle]])); }, T1);
  };
  // 마지막 장면: 비 오는 가게 앞, 사장님(내 캐릭터)이 셔터를 내린다
  const shutter = (score, then) => {
    const el2 = document.createElement("div"); el2.className = "c2fin"; el2.innerHTML = `<canvas></canvas><div class="c2sign">황금닭</div><div class="c2me"></div><canvas class="fg"></canvas><div class="c2say"></div>`; wrap.appendChild(el2);
    const c = el2.querySelector("canvas"), q = c.getContext("2d"), fg = el2.querySelector("canvas.fg"), sg = el2.querySelector(".c2sign"), me = el2.querySelector(".c2me"), say = el2.querySelector(".c2say");
    c.width = Math.round(W * KS); c.height = Math.round(H * KS); q.setTransform(KS, 0, 0, KS, 0, 0);
    // 앞 화단: 벽돌 턱 + 회양목 + 젖은 반사
    fg.width = Math.round(W * KS); fg.height = Math.round(H * KS); { const f = fg.getContext("2d"), fy = Math.round(H * 0.86); f.setTransform(KS, 0, 0, KS, 0, 0);
      for (let x = -2; x < 104; x += 4.4) { f.beginPath(); f.arc(x + 2.2, fy - 3.2 - ((x * 7) % 3), 3.6, 0, 6.3); f.fillStyle = f.createRadialGradient(x + 1.4, fy - 5.4, 0.3, x + 2.2, fy - 3.2, 4); f.fillStyle.addColorStop(0, "#4e9a5a"); f.fillStyle.addColorStop(1, "#1a4024"); f.fill(); }
      f.fillStyle = lgr(f, 0, fy, 0, H, [[0, "#8a4a2e"], [1, "#4e2a1a"]]); f.fillRect(0, fy, 104, H - fy);
      f.strokeStyle = "rgba(40,18,8,.55)"; f.lineWidth = 0.4; f.beginPath(); for (let y = fy + 3; y < H; y += 4) { f.moveTo(0, y); f.lineTo(104, y); for (let x = ((y - fy) / 4) % 2 ? 0 : 4; x < 104; x += 8) { f.moveTo(x, y); f.lineTo(x, y + 4); } } f.stroke();
      f.fillStyle = "rgba(255,200,140,.25)"; f.fillRect(0, fy, 104, 0.6); f.fillStyle = "#3a1e12"; f.fillRect(103.4, fy, 0.6, H - fy); }
    const sx0 = 30, sx1 = 150, sTop = Math.round(H * 0.22), sBot = Math.round(H * 0.7), fh = sBot - sTop - 16;
    Object.assign(sg.style, { left: (sx0 + 12) * K + "px", top: (sTop + 1) * K + "px", width: (sx1 - sx0 - 24) * K + "px", height: 12 * K + "px", lineHeight: 12 * K + "px", fontSize: Math.round(9 * K) + "px" });
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    const mh = Math.round(H * K * 0.5), mw = Math.round(mh * 240 / 312), ex = score >= 0.7 ? 1 : 2;
    Object.assign(me.style, { width: mw + "px", height: mh + "px", left: Math.round(2 * K) + "px", top: Math.round(H * K * 0.93 - mh) + "px", backgroundPosition: `${(ex % 3) * 50}% ${ex >= 3 ? 70.3125 : 0}%` });
    const im = new Image(); im.onload = () => { me.style.backgroundImage = `url("${im.src}")`; }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp";
    say.style.top = Math.round(H * K * 0.93 - mh - 30) + "px"; say.style.left = Math.round(2 * K + mw * 0.55) + "px";
    let s0 = 0, light = 1, sndOn = false;
    const DUR = RM() ? 0.6 : 1.5, START = RM() ? 0.2 : 0.7;
    const sky = [];
    for (let x = 0, k = 0; x < W; x += 7 + (k * 5) % 6, k++) sky.push([x, 6 + ((k * 13) % 14), 6 + (k % 3) * 2]);
    const drw = (nw) => {
      if (!el2.isConnected) return; if (!s0) s0 = nw; const t = (nw - s0) / 1000;
      const p = c01((t - START) / DUR), down = p * fh;
      if (t > START && !sndOn) { sndOn = true; S.shutter(0); }
      if (p >= 1 && light === 1 && t > START + DUR + 0.35) { light = 0; sg.classList.add("off"); tone(220, 0.08, "square", 0.05); }
      // 밤하늘·뒤 건물
      q.fillStyle = lgr(q, 0, 0, 0, H, [[0, "#0a0e1e"], [1, "#222a40"]]); q.fillRect(0, 0, W, H);
      for (const [x, y, w] of sky) { q.fillStyle = "#121828"; q.fillRect(x, y, w, sTop); for (let yy = y + 2; yy < sTop - 4; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if ((xx * 7 + yy * 3) % 5 === 0) { q.fillStyle = "rgba(255,220,150,.45)"; q.fillRect(xx, yy, 0.9, 1); } }
      // 가게 벽(벽돌)
      q.fillStyle = lgr(q, 0, sTop - 4, 0, sBot, [[0, "#6a4630"], [1, "#4a2e1c"]]); q.fillRect(sx0 - 4, sTop - 4, sx1 - sx0 + 8, sBot - sTop + 4);
      q.strokeStyle = "rgba(30,14,6,.5)"; q.lineWidth = 0.3; q.beginPath(); for (let y = sTop - 4; y < sBot; y += 3) { q.moveTo(sx0 - 4, y); q.lineTo(sx1 + 4, y); for (let x = sx0 - 4 + ((y / 3) % 2) * 3.5; x < sx1 + 4; x += 7) { q.moveTo(x, y); q.lineTo(x, y + 3); } } q.stroke();
      // 간판(글자는 HTML)
      rr(q, sx0 + 10, sTop, sx1 - sx0 - 20, 14, 2); q.fillStyle = lgr(q, 0, sTop, 0, sTop + 14, [[0, "#3a2010"], [1, "#1a0c04"]]); q.fill(); q.strokeStyle = light ? "#ffb03b" : "#5a4030"; q.lineWidth = 0.8; q.stroke();
      if (light) glow(q, (sx0 + sx1) / 2, sTop + 7, 40, "255,170,60", 0.25);
      const iy = sTop + 16;
      rr(q, sx0, iy, sx1 - sx0, fh, 0.6); q.fillStyle = light ? lgr(q, 0, iy, 0, iy + fh, [[0, "#fff2c0"], [1, "#f0a848"]]) : "#2a2018"; q.fill();
      if (light) {
        rr(q, sx0 + 10, iy + fh - 18, 30, 18, 1.5); q.fillStyle = lgr(q, sx0 + 10, 0, sx0 + 40, 0, [[0, "#7a828c"], [0.4, "#e8ecf0"], [1, "#6a727c"]]); q.fill(); rr(q, sx0 + 12, iy + fh - 20, 26, 2.4, 1); q.fillStyle = "#d8a040"; q.fill();
        rr(q, sx1 - 50, iy + fh - 14, 40, 14, 1); q.fillStyle = lgr(q, 0, iy + fh - 14, 0, iy + fh, [[0, "#d8aa74"], [1, "#9a6a3a"]]); q.fill();
        for (let k = 0; k < 3; k++) vBox(q, sx1 - 46 + k * 10, iy + fh - 20, 1.2);
      }
      // 셔터(주름 철판)
      rr(q, sx0 - 2, iy - 3, sx1 - sx0 + 4, 4, 1); q.fillStyle = lgr(q, 0, iy - 3, 0, iy + 1, [[0, "#b8bec8"], [1, "#4a505c"]]); q.fill();
      if (down > 0.2) {
        q.save(); q.beginPath(); q.rect(sx0, iy, sx1 - sx0, down); q.clip();
        for (let y = iy + down; y > iy - 3; y -= 3) { q.fillStyle = lgr(q, 0, y - 3, 0, y, [[0, "#c4cad4"], [0.5, "#8a909c"], [1, "#5a606c"]]); q.fillRect(sx0, y - 3, sx1 - sx0, 3); }
        q.restore();
        rr(q, sx0, iy + down - 2, sx1 - sx0, 2, 0.6); q.fillStyle = "#4a505c"; q.fill(); rr(q, (sx0 + sx1) / 2 - 4, iy + down - 3, 8, 2, 0.6); q.fillStyle = "#2a2f3a"; q.fill();
      }
      // 길·물웅덩이 반사
      q.fillStyle = lgr(q, 0, sBot, 0, H, [[0, "#2a2f38"], [1, "#1a1e26"]]); q.fillRect(0, sBot, W, H - sBot); q.fillStyle = "#4a505c"; q.fillRect(0, sBot, W, 1.4);
      if (light) { q.fillStyle = "rgba(255,200,100,.2)"; q.fillRect(sx0, sBot + 4, sx1 - sx0, 6); }
      q.fillStyle = light ? "rgba(255,180,60,.28)" : "rgba(90,70,40,.2)"; q.beginPath(); q.ellipse((sx0 + sx1) / 2, sBot + 13, (sx1 - sx0 - 28) / 2, 1.4, 0, 0, 6.3); q.fill();
      // 비
      q.strokeStyle = "rgba(180,205,240,.45)"; q.lineWidth = 0.35; q.lineCap = "round"; q.beginPath();
      for (const d of drops) { const x = ((d[0] - t * 26 * d[2]) % W + W) % W, y = (d[1] + t * 190 * d[2]) % (H + 10) - 5; q.moveTo(x, y); q.lineTo(x - 0.5, y + 3.6); }
      q.stroke();
      if (t < START + DUR + 2.2) requestAnimationFrame(drw);
    };
    requestAnimationFrame(drw);
    requestAnimationFrame(() => el2.classList.add("on"));
    setTimeout(() => { say.textContent = score >= 0.7 ? "휴… 오늘도 잘 버텼다" : "알바가 그만두면… 내가 뛴다"; say.classList.add("on"); }, (START + DUR) * 1000 + 200);
    setTimeout(then, (START + DUR) * 1000 + (RM() ? 600 : 1700));
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.chicken2 = {
    st: () => ({ tut, el: +el.toFixed(2), over, orders: orders.map((o) => o.kind + o.id + ":" + o.st).join(","), riders: riders.map((r) => (r.agency ? "A" : "R") + r.i + ":" + r.st).join(","), served: served.map((o) => o.stars).join(""), sales, agUses, trips, stopsN, quitDone, wrongDone, picks: picks.map((p) => p.st).join(",") }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1 || tut === 2) { const r = idleR()[0], L = pinList().filter((p) => p.k === "n"); if (r && L.length >= (tut === 2 ? 2 : 1)) { const rt = []; L.forEach((p) => addStop(rt, p, true)); dispatch(r, rt); } }
      else if (tut === 3) callAgency();
      else if (tut === 4) startGame();
    },
    auto: (bad) => {
      if (over || tut >= 0) return;
      const id = idleR();
      if (bad) { if (rnd() < 0.05 && id.length) { const L = pinList().filter((p) => p.k === "n"); if (L.length) { const rt = []; addStop(rt, pick(L), true); dispatch(id[0], rt); } } return; }
      if (!id.length && quitDone && boxCount() >= 2 && riders.filter((r) => r.agency).length < 1 && agUses < 3) callAgency();
      for (const r of idleR()) {
        const L = pinList(), rt = [];
        const pk = L.find((p) => p.k === "p");
        if (pk) { addStop(rt, pk, true); const lo = L.find((p) => p.k === "l" && p.o === pk.o); if (lo) addStop(rt, lo, true); }
        else {
          const gp = L.find((p) => p.k === "g");
          if (gp && gp.o.readyN - gp.o.asgN >= Math.min(2, gp.o.need - gp.o.asgN)) addStop(rt, gp, true);
          else {
            const rd = L.filter((p) => p.k === "n").sort((a, b) => a.o.readyT - b.o.readyT);
            if (rd.length) { addStop(rt, rd[0], true); let cur = rd[0]; const rest = rd.slice(1);
              while (rt.length < CAP && rest.length) { rest.sort((a, b) => pathLen({ x: cur.cx, y: cur.ty + 7 }, { x: a.cx, y: a.ty + 7 }) - pathLen({ x: cur.cx, y: cur.ty + 7 }, { x: b.cx, y: b.ty + 7 })); const nx = rest[0]; if (pathLen({ x: cur.cx, y: cur.ty + 7 }, { x: nx.cx, y: nx.ty + 7 }) > 80) break; rest.shift(); addStop(rt, nx, true); cur = nx; } }
          }
        }
        if (rt.length) dispatch(r, rt);
      }
    },
  };
  updSc(); render(0); requestAnimationFrame(loop);
}
