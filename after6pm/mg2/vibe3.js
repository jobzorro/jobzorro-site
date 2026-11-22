// 바이브코딩 3탄: 이게 왜 터져? (도트 캔버스 160xH)
// 코딩 AI '코디'랑 만든 내 작은 앱이 커뮤니티에서 떡상! 밤 9시~아침 7시, 서버실 대시보드를 지킨다.
// 사용자 도트가 양옆에서 몰려와 로드밸런서를 지나 케이블을 타고 서버 랙으로 들어간다.
// 과부하된(빨간) 랙을 잡고 한가한 랙으로 끌면 트래픽이 옮겨 간다. 꽉 찬 채로 버티면 503으로 터지고 사용자가 떠난다.
// 서버 추가(월 비용↑)·성능 UP, 캐시(쿨타임), 해킹 점 톡 막기, DB 백업 톡, 새벽 3시 졸음엔 커피 톡.
// 마지막: 아침이 밝고, 의자에서 꾸벅 졸던 내가(opts.avatar) 알림에 깨며 가입자·구독 수익 결산.
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite, uOutline } from "../mg.js";

const W = 160, SW = 36, SX = [2, 42, 82, 122], RT = 76, LBX = 80, LBY = 48, CBY = 62;
let H = 280;
const PRICE = 4900, UPU = 150, SUBR = 0.05; // 구독료, 부하 1당 사용자 수, 구독 전환율
const COST0 = 12, COST_ADD = 18, COST_UP = 22; // 만원/월
const DRAIN = 0.3; // 랙 하나가 1초에 처리하는 부하
const UCOL = ["#ff9ad0", "#7fd8ff", "#ffd166", "#9be08a", "#c9a8ff", "#ffb38a", "#f4f4f8", "#5fe0c0"];
const CURVE = [[0, 0], [0.14, 0.08], [0.3, 0.55], [0.5, 0.74], [0.68, 0.96], [0.86, 0.9], [1, 0.7]];
const EVENTS = [[0.14, "viral"], [0.24, "hack"], [0.34, "backup"], [0.46, "hack"], [0.58, "drowsy"], [0.71, "hack2"], [0.79, "backup"], [0.88, "hack"]];
const wonS = (n) => Math.round(n).toLocaleString("ko-KR");
const manS = (won) => { const m = won / 10000; return (Math.abs(m) >= 10 ? Math.round(m) : Math.round(m * 10) / 10).toLocaleString("ko-KR"); };

const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
// 할 일 안내 손가락(벡터). down: 아래를 가리킴
const HAND = `<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`;
function fingerURL(down) { return svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${down ? `<g transform="rotate(180 20 20)">${HAND}</g>` : HAND}</svg>`); }
// ── 그리기 도구(논리 좌표, 캔버스에 배율이 걸려 있음) ──
const hex = (c) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h); };
const lg = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const glow = (g, x, y, r, c, a = 1) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, rgba(c, a)); q.addColorStop(1, rgba(c, 0)); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); };
const txt = (g, s, x, y, col, size, al = "center", wt = 900) => { g.font = `${wt} ${size}px "Noto Sans KR",sans-serif`; g.textAlign = al; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(s, x, y); };
// 해킹 점(바이러스): 가시 달린 빨간 공
function virus(g, x, y, r, bl) {
  glow(g, x, y, r * 3, "#ff3a4a", bl ? 0.55 : 0.3);
  g.strokeStyle = bl ? "#ff6a5a" : "#ff3a4a"; g.lineWidth = r * 0.3; g.lineCap = "round";
  g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * 0.785 + 0.2; g.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.lineTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45); } g.stroke();
  const q = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); q.addColorStop(0, "#ff9a8a"); q.addColorStop(1, "#c8102a");
  g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.1, r * 0.24, 0, 6.29); g.arc(x + r * 0.35, y - r * 0.1, r * 0.24, 0, 6.29); g.fill();
  g.fillStyle = "#2a0008"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.05, r * 0.11, 0, 6.29); g.arc(x + r * 0.4, y - r * 0.05, r * 0.11, 0, 6.29); g.fill();
}
// 방법 화면 그림(벡터 SVG)
const SV_RACK = (x, y, h, st) => {
  const col = st === "hot" ? "#ff4a4a" : st === "mid" ? "#ffd23f" : "#4dff88", n = Math.floor((h - 7) / 6);
  let s = `<rect x="${x}" y="${y}" width="17" height="${h}" rx="2.5" fill="url(#rk)" stroke="#05060e" stroke-width="1"/><rect x="${x + 1.5}" y="${y + 1.5}" width="14" height="3" rx="1" fill="#4a5280"/>`;
  for (let b = 0; b < n; b++) { const yy = y + 6 + b * 6; s += `<rect x="${x + 2}" y="${yy}" width="13" height="4.4" rx="1" fill="#2c3350"/><circle cx="${x + 11}" cy="${yy + 2.2}" r="1" fill="${col}"/><circle cx="${x + 13.4}" cy="${yy + 2.2}" r="1" fill="${b % 2 ? col : "#203024"}"/>`; }
  if (st === "hot") s += `<rect x="${x}" y="${y}" width="17" height="${h}" rx="2.5" fill="#ff2828" opacity=".22" stroke="#ff4a4a" stroke-width="1.2"/><circle cx="${x + 5}" cy="${y - 3}" r="1.8" fill="#9a9aa8" opacity=".7"/><circle cx="${x + 10}" cy="${y - 6}" r="2.3" fill="#b8b8c4" opacity=".5"/>`;
  return s;
};
const SV_DEF = `<defs><linearGradient id="rk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a3150"/><stop offset=".5" stop-color="#1e2336"/><stop offset="1" stop-color="#141828"/></linearGradient><linearGradient id="kk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>`;
const SV_HAND = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${HAND.replace(/<defs>.*<\/defs>/, "").replace(/url\(#k\)/, "url(#kk)")}</g>`;

export const GAME = {
  key: "vibe3", base: "vibe", jc: "#7c9cff", n: "이게 왜 터져?", desc: "떡상한 내 앱! 밤새 서버가 안 터지게 지켜요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 내 앱이 커뮤니티에서 <b>떡상</b>! 사용자가 서버로 몰려와요.",
    "<b>빨간 서버</b>(과부하)를 잡고 <b>한가한 서버</b>로 끌면 트래픽이 옮겨 가요. 꽉 찬 채로 버티면 <b>503</b>으로 터져요.",
    "빨간 <b>해킹 점</b>은 톡! 막고, 사람이 넘치면 <b>캐시</b>·<b>서버 추가</b>(월 비용↑). 새벽 3시 졸음엔 <b>커피 톡</b>!",
  ],
  steps: () => {
    try {
      const box = (inner, vb = "0 0 80 72") => `<img src="${svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${SV_DEF}<rect width="80" height="72" rx="12" fill="#121530"/>${inner}</svg>`)}" alt="" style="height:52px;width:auto;border-radius:9px">`;
      const s1 = box(`${SV_RACK(8, 18, 38, "hot")}${SV_RACK(52, 18, 38, "low")}<path d="M28 14q14-12 26 0" fill="none" stroke="#9fd0ff" stroke-width="2" stroke-dasharray="3 2.5" stroke-linecap="round"/><path d="M50 9l5 5-6.5 1.5z" fill="#9fd0ff"/>${SV_HAND(4, 34, 0.9)}`);
      const s2 = box(`${SV_RACK(31, 36, 30, "low")}<g transform="translate(40 18)"><circle r="12" fill="#ff3a4a" opacity=".25"/><g stroke="#ff3a4a" stroke-width="2" stroke-linecap="round">${Array.from({ length: 8 }, (_, k) => { const a = k * 0.785 + 0.2; return `<path d="M${(Math.cos(a) * 5.6).toFixed(1)} ${(Math.sin(a) * 5.6).toFixed(1)}L${(Math.cos(a) * 9.6).toFixed(1)} ${(Math.sin(a) * 9.6).toFixed(1)}"/>`; }).join("")}</g><circle r="7" fill="#e0202e"/><circle cx="-2.4" cy="-.8" r="1.7" fill="#fff"/><circle cx="2.4" cy="-.8" r="1.7" fill="#fff"/></g><path d="M22 6l4 4M58 6l-4 4M20 30h5M55 30h5" stroke="#ffd23f" stroke-width="2" stroke-linecap="round"/>${SV_HAND(38, 22, 0.8)}`);
      const s3 = box(`<rect x="6" y="20" width="68" height="44" rx="5" fill="#0b0f22" stroke="#3a4270"/><path d="M8 60L18 56L28 54L38 46L48 42L58 32L70 24V62H8z" fill="#5ff0a0" opacity=".3"/><path d="M8 60L18 56L28 54L38 46L48 42L58 32L70 24" fill="none" stroke="#5ff0a0" stroke-width="2" stroke-linejoin="round"/><circle cx="62" cy="13" r="8" fill="#ffd23f" stroke="#a87a10"/><text x="62" y="16.5" font-size="10" font-weight="900" text-anchor="middle" fill="#8a5a08" font-family="sans-serif">₩</text>`);
      return [[s1, "빨간 서버 끌기"], [s2, "해킹 점은 톡!"], [s3, "구독 띵! 아침 결산"]];
    } catch (e) { return [["", "끌어서 옮기기"], ["", "해킹 점 톡"], ["", "아침에 결산"]]; }
  },
  css: `
.mg-v3st{background:#070914!important;display:flex;align-items:center;justify-content:center}
.mg-vibe3 .mg-logo b{font-size:24px}
.mg-vibe3 .v3-w{position:relative;flex:0 0 auto}
.mg-vibe3 .v3-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.mg-vibe3 .v3-gl{position:absolute;z-index:2;font-size:11px;font-weight:800;color:#8a94c8;letter-spacing:-.3px;pointer-events:none;white-space:nowrap}
.mg-vibe3 .v3-gl b{color:#5ff0a0}
.mg-vibe3 .v3-dash{position:absolute;z-index:2;display:flex;flex-direction:column;justify-content:center;gap:0;pointer-events:none;color:#c8d0f0;font-size:11px;font-weight:700;line-height:1.2;letter-spacing:-.3px;white-space:nowrap;overflow:hidden}
.mg-vibe3 .v3-dash i{font-style:normal;font-weight:900;color:#fff}
.mg-vibe3 .v3-dash .v3-clk{font-size:14px;font-weight:900;color:#ffd23f;line-height:1.05;letter-spacing:-.3px;font-variant-numeric:tabular-nums}
.mg-vibe3 .v3-dash .v3-clk small{font-size:11px;color:#8a94c8;margin-left:2px;font-weight:800}
.mg-vibe3 .v3-dash .rv i{color:#5ff0a0}.mg-vibe3 .v3-dash .cs i{color:#ff9a8a}
.mg-vibe3 .v3-dash .bump{animation:v3bump .35s}
@keyframes v3bump{40%{transform:scale(1.25);color:#ffd23f}}
.mg-vibe3 .v3-ctl{position:absolute;z-index:3;display:flex;gap:6px}
.mg-vibe3 .v3-btn{position:relative;flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;border-radius:11px!important;border:0!important;color:#fff!important;overflow:hidden;padding:0!important;touch-action:none}
.mg-vibe3 .v3-btn b{font-size:14px;font-weight:900;position:relative;z-index:1}
.mg-vibe3 .v3-btn small{font-size:11px;font-weight:700;opacity:.9;position:relative;z-index:1}
.mg-vibe3 .v3-add{background:linear-gradient(#4a5490,#323a6a)!important;box-shadow:0 3px 0 #1a1f40!important}
.mg-vibe3 .v3-add small{color:#ffb8a8}
.mg-vibe3 .v3-cache{background:linear-gradient(#3fc890,#238a62)!important;box-shadow:0 3px 0 #11503a!important}
.mg-vibe3 .v3-cache i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--cd,0)*100%);background:#000a;z-index:0;transition:width .1s linear}
.mg-vibe3 .v3-cache.on{animation:v3glow .4s infinite alternate}
.mg-vibe3 .v3-btn.off{filter:grayscale(.7) brightness(.65)}
.mg-vibe3 .v3-btn:active{transform:translateY(2px)}
.mg-vibe3 .v3-btn.go{animation:v3pulse .5s infinite alternate}
@keyframes v3glow{to{box-shadow:0 3px 0 #11503a,0 0 14px #5fe0a0!important}}
@keyframes v3pulse{to{transform:scale(1.06);filter:brightness(1.2)}}
.mg-vibe3 .v3-go{position:absolute;z-index:25;width:0;height:0;display:none;pointer-events:none}
.mg-vibe3 .v3-go.on{display:block}
.mg-vibe3 .v3-go i{position:absolute;width:40px;height:40px;left:-20px;top:-38px;background-size:100% 100%;filter:drop-shadow(0 3px 3px #0009);animation:v3tap .7s infinite}
.mg-vibe3 .v3-go.up i{top:2px;animation:v3tapu .7s infinite}
.mg-vibe3 .v3-go.drag i{animation:v3drag 1.3s infinite}
.mg-vibe3 .v3-go span{position:absolute;left:0;bottom:44px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#2a1e2e;font-size:12px;font-weight:800;padding:3px 9px;border-radius:9px;box-shadow:0 2px 0 #0007,0 0 0 2px #ffd23f}
.mg-vibe3 .v3-go.up span{bottom:auto;top:46px}
.mg-vibe3 .v3-go span b{color:#d8402a}
@keyframes v3tap{0%,100%{transform:translateY(-9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v3tapu{0%,100%{transform:translateY(9px)}45%,60%{transform:translateY(0) scale(.9)}}
@keyframes v3drag{0%{transform:translate(0,0)}15%{transform:translate(0,3px) scale(.9)}70%{transform:translate(var(--dx,60px),var(--dy,0)) scale(.9);opacity:1}88%{transform:translate(var(--dx,60px),var(--dy,0));opacity:0}100%{opacity:0}}
.mg-vibe3 .v3-tut{position:absolute;left:6px;right:6px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-vibe3 .v3-tut.off{opacity:0;visibility:hidden}
.mg-vibe3 .v3-tc{pointer-events:auto;background:#fffdf6;color:#2a2018;border-radius:14px;padding:7px 12px 6px;box-shadow:0 4px 0 #0006,0 0 0 2px #7c9cff;max-width:300px;font-size:12.5px;line-height:1.42;text-align:center;font-weight:600;word-break:keep-all}
.mg-vibe3 .v3-tut.pop .v3-tc{animation:v3pop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-vibe3 .v3-tc em{font-style:normal;display:inline-block;background:#5a74e0;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-vibe3 .v3-tc p{margin:0}.mg-vibe3 .v3-tc b{color:#2f55c8}.mg-vibe3 .v3-tc b.rd{color:#c0392b}
.mg-vibe3 .v3-tc ul{margin:4px 0 0;padding:0;list-style:none;text-align:left;font-size:12px}
.mg-vibe3 .v3-tc li{padding-left:12px;position:relative;margin:1px 0}.mg-vibe3 .v3-tc li::before{content:"";position:absolute;left:2px;top:7px;width:5px;height:5px;background:#7c9cff}
.mg-vibe3 .v3-tb{margin-top:5px;display:flex;justify-content:center}
.mg-vibe3 .v3-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a8070!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important}
.mg-vibe3 .v3-go2{background:linear-gradient(#8aa8ff,#5a74e0)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #2a3a90!important;animation:v3pulse .5s infinite alternate}
@keyframes v3pop{0%{transform:scale(.3)}100%{transform:scale(1)}}
.mg-vibe3 .v3-alert{position:absolute;z-index:6;left:50%;transform:translateX(-50%) scale(.6);background:#ff3a4a;color:#fff;font-size:12px;font-weight:900;padding:3px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;box-shadow:0 2px 0 #0008;transition:opacity .15s,transform .25s cubic-bezier(.3,1.7,.5,1)}
.mg-vibe3 .v3-alert.on{opacity:1;transform:translateX(-50%) scale(1)}
.mg-vibe3 .v3-alert.y{background:#ffd23f;color:#3a2a00}.mg-vibe3 .v3-alert.g{background:#3fd08a}.mg-vibe3 .v3-alert.b{background:#5a74e0}
.mg-vibe3 .v3-end{position:absolute;inset:0;z-index:40;opacity:0;transition:opacity .5s;pointer-events:none;overflow:hidden;background:#05060f}
.mg-vibe3 .v3-end.on{opacity:1;pointer-events:auto}
.mg-vibe3 .v3-end canvas{position:absolute;inset:0;width:100%;height:100%}
.mg-vibe3 .v3-cam{position:absolute;z-index:1;border-radius:8px;overflow:hidden;background:#1a1d36 url("img/bg/home.webp") 72% 40%/cover;box-shadow:0 0 0 1.5px #0a0c18,0 0 0 3px #4a5488,0 3px 8px #000a;pointer-events:none;transition:box-shadow .3s}
.mg-vibe3 .v3-cam::before{content:"";position:absolute;inset:0;background:#0a0c1866}
.mg-vibe3 .v3-cam i{position:absolute;inset:0;background-repeat:no-repeat;transform-origin:50% 100%;transition:filter .5s}
.mg-vibe3 .v3-cam span{position:absolute;left:4px;bottom:2px;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000;line-height:1.1}
.mg-vibe3 .v3-cam b{position:absolute;right:4px;top:4px;width:6px;height:6px;border-radius:50%;background:#ff3a4a;box-shadow:0 0 5px #ff3a4a;animation:v3rec 1.2s steps(2) infinite}
.mg-vibe3 .v3-cam.doze i{animation:v3nod 1.5s ease-in-out infinite;filter:brightness(.5) saturate(.7)}
.mg-vibe3 .v3-cam.hot{box-shadow:0 0 0 1.5px #0a0c18,0 0 0 3px #ff4a4a,0 0 12px #ff4a4a}
@keyframes v3rec{50%{opacity:.15}}
.mg-vibe3 .v3-me{position:absolute;background-repeat:no-repeat;background-size:300% 346.15%;opacity:0;transition:opacity .5s,filter 1.2s;transform-origin:50% 92%;pointer-events:none;filter:brightness(.62) saturate(.8)}
.mg-vibe3 .v3-me.on{opacity:1}
.mg-vibe3 .v3-me.doze{animation:v3nod 1.5s ease-in-out infinite}
.mg-vibe3 .v3-me.wake{filter:none;animation:v3hop .4s cubic-bezier(.3,1.8,.5,1)}
@keyframes v3nod{0%,100%{transform:rotate(-3deg) translateY(4%)}50%{transform:rotate(5deg) translateY(8%)}}
@keyframes v3hop{0%{transform:translateY(8%)}45%{transform:translateY(-6%)}100%{transform:none}}
.mg-vibe3 .v3-dk{position:absolute;inset:0;background:#0a1238;opacity:.72;transition:opacity 1.8s;pointer-events:none}
.mg-vibe3 .v3-dk.lit{opacity:0}
.mg-vibe3 .v3-rep{position:absolute;left:50%;top:10px;width:232px;transform:translate(-50%,-20px) scale(.8);opacity:0;background:#fffdf6;color:#1a1c2a;border-radius:14px;padding:8px 12px 9px;box-shadow:0 5px 0 #0007,0 0 0 2px #7c9cff;transition:opacity .3s,transform .4s cubic-bezier(.3,1.6,.5,1);font-size:12px}
.mg-vibe3 .v3-rep.on{opacity:1;transform:translate(-50%,0) scale(1)}
.mg-vibe3 .v3-rep h4{margin:0 0 5px;font-size:12px;font-weight:900;color:#5a74e0;text-align:center;letter-spacing:-.2px}
.mg-vibe3 .v3-rep div{display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px dashed #e0dccc;opacity:0;transform:translateX(-10px);transition:opacity .25s,transform .3s}
.mg-vibe3 .v3-rep div.on{opacity:1;transform:none}
.mg-vibe3 .v3-rep div:last-child{border-bottom:0;padding-top:4px}
.mg-vibe3 .v3-rep span{color:#5a5a6a;font-weight:700}
.mg-vibe3 .v3-rep b{font-weight:900;font-variant-numeric:tabular-nums}
.mg-vibe3 .v3-rep .pl{color:#1f9a5a}.mg-vibe3 .v3-rep .mi{color:#d0402a}
.mg-vibe3 .v3-rep div:last-child b{font-size:17px}
.mg-vibe3 .v3-say{position:absolute;z-index:3;left:50%;transform:translateX(-50%) scale(.5);background:#fffdf6;color:#2a2018;font-size:12.5px;font-weight:900;padding:5px 10px;border-radius:11px;white-space:nowrap;box-shadow:0 3px 0 #0007;opacity:0;transition:opacity .2s,transform .3s cubic-bezier(.3,1.7,.5,1)}
.mg-vibe3 .v3-say::after{content:"";position:absolute;left:50%;margin-left:-6px;bottom:-6px;border:6px solid transparent;border-bottom:0;border-top-color:#fffdf6}
.mg-vibe3 .v3-say.on{opacity:1;transform:translateX(-50%) scale(1)}
`,
  run(host, ez, finish, skill, opts = {}) { runGame(host, ez, finish, opts); },
};

function runGame(host, ez, finish, opts = {}) {
  const F = frame(host, "vibe3", "이게 왜 터져?", "mg-v3st");
  F.stage.insertAdjacentHTML("beforeend", `<div class="v3-w"><canvas class="v3-cv"></canvas>
    <div class="v3-gl">실시간 가입자 <b>▲</b></div>
    <div class="v3-dash"><b class="v3-clk">21:00</b><span>가입 <i data-k="u">0</i>명</span><span class="rv">구독 <i data-k="s">0</i>명 <i data-k="r">0</i>만</span><span class="cs">서버비 <i data-k="c">36</i>만/월</span></div>
    <div class="v3-cam"><i></i><b></b><span>나</span></div>
    <div class="v3-alert"></div>
    <div class="v3-ctl"><button class="v3-btn v3-add" data-add><b>서버 추가</b><small>+18만/월</small></button><button class="v3-btn v3-cache" data-cache><i></i><b>캐시</b><small>잠깐 부하 절반</small></button></div>
    <div class="v3-go"><span></span><i></i></div>
    <div class="v3-tut off"><div class="v3-tc"><em>리허설</em><p></p><div class="v3-tb"></div></div></div>
    <div class="v3-end"></div></div>`);
  const $ = (s) => F.stage.querySelector(s);
  const wrap = $(".v3-w"), cv = $(".v3-cv"), g = cv.getContext("2d");
  const glEl = $(".v3-gl"), dashEl = $(".v3-dash"), clkEl = $(".v3-clk"), alertEl = $(".v3-alert");
  const camEl = $(".v3-cam"), camI = camEl.querySelector("i");
  const ctlEl = $(".v3-ctl"), addB = $("[data-add]"), cacheB = $("[data-cache]");
  const goEl = $(".v3-go"), goT = goEl.querySelector("span"), goI = goEl.querySelector("i");
  const tutEl = $(".v3-tut"), tutP = tutEl.querySelector("p"), tutB = tutEl.querySelector(".v3-tb"), endEl = $(".v3-end");
  const dk = {}; dashEl.querySelectorAll("[data-k]").forEach((e) => (dk[e.dataset.k] = e));
  let K = 2, KS = 2, RB = 200, DY = 212;
  const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const px = (v) => Math.round(v * K) + "px";
  let BG = null, DESK = null;
  const fit = () => {
    const sw = F.stage.clientWidth, sh = F.stage.clientHeight, r = Math.min(sw / W, sh / 236);
    K = r >= 2 ? Math.floor(r) : Math.max(1, r); H = clamp(Math.floor(sh / K), 236, 300);
    RB = H - 78; DY = RB + 13;
    KS = K * DPR; cv.width = Math.round(W * KS); cv.height = Math.round(H * KS); g.setTransform(KS, 0, 0, KS, 0, 0); wrap.style.width = W * K + "px"; wrap.style.height = H * K + "px";
    Object.assign(glEl.style, { left: px(4), top: px(2) });
    Object.assign(dashEl.style, { left: px(100), top: px(1), width: px(59), height: px(39) });
    Object.assign(ctlEl.style, { left: px(3), top: px(H - 31), width: px(154), height: px(28) });
    Object.assign(alertEl.style, { top: px(57) });
    // 내 화상 카메라(책상 왼쪽): 표시 칸 = 얼굴~어깨(칸 240x540 중 x 40~200, y 22~)
    const cw = Math.round(29 * K), ch = Math.round(25 * K), cs = cw / 160;
    Object.assign(camEl.style, { left: px(3), top: px(DY + 4), width: cw + "px", height: ch + "px" });
    camEl.dataset.s = cs; camI.style.backgroundSize = `${720 * cs}px ${1080 * cs}px`;
    BG = makeBg(); DESK = makeDesk();
  };
  const P = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(x, y, w, h); };

  // ── 배경: 서버실 벽·바닥(기기 해상도 벡터, 한 번만) ──
  function hiC(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * KS)); c.height = Math.max(1, Math.round(h * KS)); const d = c.getContext("2d"); d.setTransform(KS, 0, 0, KS, 0, 0); return [c, d]; }
  function makeBg() {
    const [c, d] = hiC(W, H);
    d.fillStyle = lg(d, 0, 40, 0, RB, [[0, "#141832"], [1, "#1d2246"]]); d.fillRect(0, 40, W, RB - 38);
    glow(d, W / 2, RB - 40, 95, "#4a5ac0", 0.16);
    d.fillStyle = "rgba(255,255,255,.035)"; for (let x = 0; x < W; x += 20) d.fillRect(x, 56, 0.4, RB - 56);
    d.fillStyle = "rgba(0,0,0,.3)"; for (let x = 0.4; x < W; x += 20) d.fillRect(x, 56, 0.4, RB - 56);
    d.fillStyle = "rgba(120,140,230,.12)"; d.fillRect(0, 56, W, 0.4);
    // 벽 환기구
    for (const vx of [6, 140]) { d.fillStyle = "#10132a"; rr(d, vx, 60, 14, 9, 1.5); d.fill(); d.fillStyle = "rgba(120,140,220,.18)"; for (let k = 0; k < 4; k++) d.fillRect(vx + 1.5, 61.6 + k * 2, 11, 0.5); }
    // 천장 케이블 트레이
    d.fillStyle = lg(d, 0, 40, 0, 43.5, [[0, "#2e3660"], [1, "#121630"]]); d.fillRect(0, 40, W, 3.5);
    d.fillStyle = "rgba(140,160,240,.28)"; for (let x = 4; x < W; x += 9) { rr(d, x, 40.9, 3, 1.1, 0.5); d.fill(); }
    // 바닥(이중 마루, 원근)
    d.fillStyle = lg(d, 0, RB + 2, 0, DY, [[0, "#20264a"], [1, "#10132a"]]); d.fillRect(0, RB + 2, W, DY - RB - 2);
    d.strokeStyle = "rgba(0,0,0,.35)"; d.lineWidth = 0.4; d.beginPath();
    for (let x = -96; x <= W + 96; x += 16) { d.moveTo(W / 2 + (x - W / 2) * 0.7, RB + 2); d.lineTo(x, DY); }
    d.moveTo(0, RB + 6.5); d.lineTo(W, RB + 6.5); d.stroke();
    d.fillStyle = "rgba(140,160,255,.22)"; d.fillRect(0, RB + 2, W, 0.5);
    // 비상등 자리
    for (const ex of [4, 152]) { d.fillStyle = "#4a1820"; rr(d, ex, 46, 4, 2, 1); d.fill(); }
    // 위 대시보드 판
    d.fillStyle = lg(d, 0, 0, 0, 40, [[0, "#0e1126"], [1, "#080a16"]]); d.fillRect(0, 0, W, 40);
    d.fillStyle = "#2e3460"; d.fillRect(0, 39.5, W, 0.5); d.fillRect(98, 3, 0.4, 34);
    rr(d, 3, 11, 94, 27, 2.5); d.fillStyle = "#0a0f22"; d.fill(); d.strokeStyle = "rgba(100,120,220,.3)"; d.lineWidth = 0.4; d.stroke();
    d.fillStyle = "rgba(100,120,220,.12)"; for (let y = 14; y < 38; y += 6) d.fillRect(3.5, y, 93, 0.3); for (let x = 15; x < 97; x += 12) d.fillRect(x, 11.5, 0.3, 26);
    return c;
  }
  // 책상 띠(키보드·쪽지·에너지 음료). 왼쪽은 내 화상 카메라 칸
  function makeDesk() {
    const DH = H - DY, [c, d] = hiC(W, DH);
    d.fillStyle = lg(d, 0, 0, 0, DH, [[0, "#57445f"], [0.06, "#3e3048"], [1, "#1e1626"]]); d.fillRect(0, 0, W, DH);
    d.fillStyle = "#8a76a0"; d.fillRect(0, 0, W, 0.6); d.fillStyle = "rgba(0,0,0,.35)"; d.fillRect(0, 2.4, W, 0.5);
    d.strokeStyle = "rgba(255,255,255,.035)"; d.lineWidth = 0.5; for (let k = 0; k < 5; k++) { d.beginPath(); d.moveTo(0, 6 + k * 6); d.bezierCurveTo(W * 0.3, 4 + k * 6, W * 0.6, 9 + k * 6, W, 6 + k * 6); d.stroke(); }
    // 키보드
    d.save(); d.shadowColor = "rgba(0,0,0,.55)"; d.shadowBlur = 3 * KS; d.shadowOffsetY = 1 * KS; rr(d, 44, 6, 62, 14, 2.5); d.fillStyle = lg(d, 0, 6, 0, 20, [[0, "#363a4c"], [1, "#1c1e2a"]]); d.fill(); d.restore();
    for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) { const kx = 45.8 + k * 4.2 + (r % 2) * 0.8, ky = 7.6 + r * 4, ac = (k + r) % 7 === 3; rr(d, kx, ky, 3.4, 3.2, 0.7); d.fillStyle = ac ? "#7c9cff" : "#4c5066"; d.fill(); d.fillStyle = ac ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.12)"; d.fillRect(kx + 0.5, ky + 0.4, 2.4, 0.4); }
    // 쪽지
    d.save(); d.translate(39, 12); d.rotate(-0.12); d.shadowColor = "rgba(0,0,0,.4)"; d.shadowBlur = 2 * KS; d.fillStyle = lg(d, 0, -5, 0, 5, [[0, "#ffb8de"], [1, "#ff8fc8"]]); d.fillRect(-4, -5, 8, 10); d.restore();
    d.save(); d.translate(39, 12); d.rotate(-0.12); d.strokeStyle = "#a04a70"; d.lineWidth = 0.45; d.beginPath(); d.moveTo(-2.6, -2); d.lineTo(2.2, -2); d.moveTo(-2.6, 0.4); d.lineTo(1.4, 0.4); d.moveTo(-2.6, 2.8); d.lineTo(2, 2.8); d.stroke(); d.restore();
    // 에너지 음료 캔
    d.fillStyle = lg(d, 113.5, 0, 121.5, 0, [[0, "#1f8a5a"], [0.4, "#6ff0b0"], [1, "#156a44"]]); rr(d, 113.5, 5, 8, 13, 1.5); d.fill();
    d.fillStyle = lg(d, 113.5, 0, 121.5, 0, [[0, "#8a8a96"], [0.5, "#f0f0f6"], [1, "#7a7a86"]]); d.beginPath(); d.ellipse(117.5, 5.2, 4, 1.1, 0, 0, 6.29); d.fill();
    d.fillStyle = "#14141c"; rr(d, 115.4, 9, 4.2, 5, 1); d.fill(); d.fillStyle = "#6ff0b0"; d.beginPath(); d.moveTo(117.9, 9.6); d.lineTo(116.4, 11.8); d.lineTo(117.6, 11.8); d.lineTo(117, 13.4); d.lineTo(118.8, 11); d.lineTo(117.6, 11); d.closePath(); d.fill();
    return c;
  }
  fit();
  const FDN = fingerURL(true), FUP = fingerURL(false);
  // 아침 장면 그림 미리 불러오기
  const ENDBG = new Image(); let endBgOk = false; ENDBG.onload = () => (endBgOk = true); ENDBG.src = "img/bg/desk.webp";

  // ── 소리 ──
  const S = {
    coin: (at = 0) => { tone(1568, 0.06, "square", 0.045, 0, at); tone(2093, 0.13, "square", 0.045, 0, at + 0.06); },
    beep: () => tone(1046, 0.07, "square", 0.04),
    crash: () => { noise(0.45, 500, 0.28, 0, 0.8); tone(160, 0.45, "sawtooth", 0.12, -110); },
    thud: () => { tone(90, 0.22, "sine", 0.32, -40); noise(0.12, 300, 0.2); },
    block: () => { tone(1200, 0.05, "square", 0.08); tone(1800, 0.1, "square", 0.07, 0, 0.05); noise(0.08, 4000, 0.08); },
    siren: () => { tone(620, 0.16, "sawtooth", 0.05, 380); tone(620, 0.16, "sawtooth", 0.05, 380, 0.2); },
    cache: () => { tone(360, 0.35, "triangle", 0.09, 1100); noise(0.3, 2400, 0.06, 0.05, 0.6); },
    backup: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.07, "triangle", 0.08, 0, i * 0.07)); },
    gulp: () => { tone(320, 0.09, "sine", 0.16, -140); tone(300, 0.09, "sine", 0.16, -140, 0.13); tone(660, 0.18, "triangle", 0.08, 300, 0.3); },
    yawn: () => tone(300, 0.9, "sine", 0.07, -140),
    move: () => { noise(0.18, 1800, 0.1, 0, 0.8); tone(500, 0.16, "triangle", 0.06, 500); },
    alarm: (at = 0) => { for (let k = 0; k < 3; k++) { tone(1480, 0.07, "square", 0.06, 0, at + k * 0.11); } },
    yay: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "triangle", 0.1, 0, i * 0.07)); },
  };

  // ── 상태 ──
  const T = 36 * ez;
  const mkRack = (i, on) => ({ i, on, L: 0, heat: 0, down: 0, boost: 0, drop: 0, flash: 0, bk: 0, bkp: 0, acc: 0, crashN: 0 });
  let racks = [0, 1, 2, 3].map((i) => mkRack(i, i < 3));
  let tut = 0, inited = false, over = false, last = 0, el = 0, p = 0, tm0 = null, endT = -1;
  let hot = 0, hotT = 0, cacheOn = 0, cacheCd = 0, boosts = 0, cost = COST0 * 3;
  let served = 0, lost = 0, subs = 0, hacksN = 0, hacksOk = 0, bkN = 0, bkOk = 0, coffeeOk = 0, drowsyN = 0, crashes = 0, moves = 0, rescues = 0;
  let evI = 0, drowsy = null, sel = -1, selT = 0, drag = null, lastAct = 0, firstHint = true, alarmT = 0, dingT = 0, dingN = 0, shake = 0;
  let dots = [], hacks = [], sparks = [], hist = [], histAcc = { s: 0, l: 0, t: 0 }, cacheAcc = 0;
  const rackUp = (r) => r.on && r.down <= 0 && r.drop <= 0;
  const cx = (i) => SX[i] + 18;
  const lerp = (a, b, t) => a + (b - a) * t;
  const curve = (q) => { for (let k = 1; k < CURVE.length; k++) if (q <= CURVE[k][0]) { const [a, va] = CURVE[k - 1], [b, vb] = CURVE[k]; return lerp(va, vb, (q - a) / (b - a)); } return CURVE[CURVE.length - 1][1]; };
  const inRate = () => (tut >= 0 ? 0.35 : 0.5 + 1.18 * curve(p) + Math.sin(el * 1.7) * 0.05);
  const capNow = () => racks.filter(rackUp).length * DRAIN * (1 + 0.25 * boosts);
  const stageXY = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + (x / W) * r.width, r.top - s.top + (y / H) * r.height]; };
  const elXY = (e, dy = 0) => { const r = e.getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + dy]; };
  const updSc = () => (F.sc.textContent = tut >= 0 ? "리허설" : `구독 ${subs}명`);
  let alertTo = 0;
  const alertMsg = (t, cls = "") => { alertEl.textContent = t; alertEl.className = "v3-alert " + cls; void alertEl.offsetWidth; alertEl.classList.add("on"); clearTimeout(alertTo); alertTo = setTimeout(() => alertEl.classList.remove("on"), 1500); };
  const setDash = () => {
    const h = 21 + p * 10, hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    clkEl.innerHTML = tut >= 0 ? `20:58<small>출시 전</small>` : `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}<small>${hh >= 21 ? "밤" : hh < 5 ? "새벽" : "아침"}</small>`;
    dk.u.textContent = wonS(served); dk.s.textContent = wonS(subs); dk.r.textContent = manS(subs * PRICE); dk.c.textContent = cost;
  };
  const updBtns = () => {
    const full = racks[3].on;
    addB.innerHTML = !full ? `<b>서버 추가</b><small>+${COST_ADD}만/월</small>` : boosts < 2 ? `<b>성능 UP</b><small>+${COST_UP}만/월</small>` : `<b>최대치</b><small>더는 못 늘려요</small>`;
    addB.classList.toggle("off", tut >= 0 && tut !== 9 || (full && boosts >= 2) || over);
    cacheB.classList.toggle("off", cacheCd > 0 || over || (tut >= 0 && tut !== 3));
    cacheB.classList.toggle("on", cacheOn > 0);
    cacheB.style.setProperty("--cd", cacheCd > 0 ? (cacheCd / (9 * 1)).toFixed(3) : 0);
  };

  // ── 내 화상 카메라: 상황에 따라 표정이 바뀐다 ──
  const CEX = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
  let camF = "", camTmp = null, camCls = "";
  { const AVc = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1"; const im = new Image(); im.onload = () => (camI.style.backgroundImage = `url("${im.src}")`); im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AVc + ".webp"; }
  const camSet = (f, dur) => { camTmp = { f, t: dur }; };
  const camUpd = (dt) => {
    if (camTmp) { camTmp.t -= dt; if (camTmp.t <= 0) camTmp = null; }
    const hotR = racks.some((r) => r.on && r.L > 1 && r.down <= 0), downR = racks.some((r) => r.on && r.down > 0);
    const f = drowsy ? "neutral" : camTmp ? camTmp.f : hacks.some((h) => !h.dead) ? "surprised" : downR ? "sad" : hotR ? "angry" : tut < 0 && el - dingT < 0.7 ? "smile" : "neutral";
    if (f !== camF) { camF = f; const i = CEX[f], cs = +camEl.dataset.s || 0.36; camI.style.backgroundPosition = `${-((i % 3) * 240 + 40) * cs}px ${-((i >= 3 ? 540 : 0) + 22) * cs}px`; }
    const cl = "v3-cam" + (drowsy ? " doze" : "") + (hotR || downR ? " hot" : "");
    if (cl !== camCls) { camCls = cl; camEl.className = cl; }
  };

  // ── 길 따라 움직이는 점 ──
  const pathTo = (i, sx, sy) => [[sx, sy], [LBX + (sx < LBX ? -6 : 6), LBY], [LBX, LBY + 6], [LBX, CBY], [cx(i), CBY], [cx(i), RT - 1]];
  const spawnUser = (i, cached) => {
    if (dots.length > 160) return;
    const left = rnd() < 0.5, sx = left ? -2 : W + 1, sy = 44 + rint(9);
    const pts = cached ? [[sx, sy], [LBX + (left ? -6 : 6), LBY]] : pathTo(i, sx, sy);
    dots.push({ k: cached ? "c" : "u", r: i, pts, s: 1, x: sx, y: sy, v: 70 + rnd() * 30, c: pick(UCOL) });
  };
  const stepPath = (o, dt) => {
    let d = o.v * dt;
    while (d > 0 && o.s < o.pts.length) {
      const [tx, ty] = o.pts[o.s], dx = tx - o.x, dy = ty - o.y, L = Math.hypot(dx, dy);
      if (L <= d) { o.x = tx; o.y = ty; o.s++; d -= L; } else { o.x += (dx / L) * d; o.y += (dy / L) * d; d = 0; }
    }
    return o.s >= o.pts.length;
  };

  // ── 조작 ──
  const doMove = (a, b) => {
    if (over || a === b) return false;
    const A = racks[a], B = racks[b];
    if (!rackUp(A) || !B.on || B.drop > 0) return false;
    if (B.down > 0) { F.msg("꺼진 서버(503)로는 못 옮겨요"); SFX.tok(); return false; }
    const amt = (A.L - B.L) * 0.55;
    if (amt < 0.05) { F.msg(A.L < B.L ? "거긴 더 바빠요! 한가한 쪽으로" : "부하 차이가 별로 없어요"); SFX.tok(); return false; }
    const was = A.L;
    A.L -= amt; B.L += amt; moves++; lastAct = el;
    for (let k = 0; k < 12; k++) dots.push({ k: "m", a, b, t: -k * 0.035, c: k % 3 ? "#9fd0ff" : "#ffffff" });
    S.move(); vib(10);
    const bp = stageXY(cx(b), RT - 6);
    if (was > 0.92) { rescues++; F.hit(stageXY(cx(a), RT - 6), Math.round(amt * 100), "#7fd8ff"); }
    else F.float(bp, `+${Math.round(amt * 100)}%`);
    if (tut === 1 && was > 0.9) setTimeout(() => { if (tut === 1) tutNext(2); }, 650);
    else if (tut === 1) F.msg("빨간 서버에서 옮겨 봐요");
    return true;
  };
  const blockHack = (h) => {
    h.dead = 1; hacksOk += tut < 0 ? 1 : 0; lastAct = el;
    S.block(); F.hit(stageXY(h.x, h.y), 1, "#5fe0ff");
    for (let k = 0; k < 10; k++) sparks.push({ x: h.x, y: h.y, vx: rnd() * 80 - 40, vy: rnd() * 80 - 50, t: 0.5, c: pick(["#5fe0ff", "#ffffff", "#ff3a4a"]) });
    alertMsg("해킹 차단!", "b"); camSet("smile", 1);
    if (tut === 2) setTimeout(() => { if (tut === 2) tutNext(3); }, 600);
  };
  const useCache = () => {
    if (over) return;
    if (tut >= 0 && tut !== 3) { F.msg(tut === 4 ? "출시 버튼을 눌러요" : "지금은 손가락 안내를 따라가요"); SFX.tok(); return; }
    if (cacheCd > 0) { F.msg(`캐시 충전 중… ${Math.ceil(cacheCd)}초`); SFX.tok(); return; }
    cacheOn = 4 * ez; cacheCd = 9; lastAct = el;
    racks.forEach((r) => { if (rackUp(r)) r.L = Math.max(0, r.L - 0.18); });
    S.cache(); vib(15); alertMsg("캐시 ON! 부하 절반", "g"); F.burst(stageXY(LBX, LBY), "#5fe0a0", 14);
    if (tut === 3) setTimeout(() => { if (tut === 3) tutNext(4); }, 900);
    updBtns();
  };
  const addServer = () => {
    if (over) return;
    if (tut >= 0) { F.msg("리허설에선 서버를 안 늘려요"); SFX.tok(); return; }
    lastAct = el;
    if (!racks[3].on) {
      const r = racks[3]; r.on = true; r.drop = 1; r.L = 0; cost += COST_ADD;
      tone(880, 0.1, "triangle", 0.06); F.float(stageXY(cx(3), 70), `월 +${COST_ADD}만`, "bad");
    } else if (boosts < 2) {
      boosts++; cost += COST_UP; racks.forEach((r) => (r.flash = 0.6)); S.cache(); F.float(stageXY(LBX, 80), `성능 UP! 월 +${COST_UP}만`, "bad");
    } else { F.msg("서버는 이미 최대예요"); SFX.tok(); return; }
    dk.c.classList.remove("bump"); void dk.c.offsetWidth; dk.c.classList.add("bump"); camSet("smile", 0.8);
    updBtns(); setDash();
  };
  const drink = () => {
    if (!drowsy) return;
    if (tut < 0 && drowsy.t < 4.5) coffeeOk = 1;
    drowsy = null; S.gulp(); vib(20); lastAct = el; camSet("blush", 1.4);
    F.float(stageXY(140, DY), "정신 번쩍!"); for (let k = 0; k < 8; k++) sparks.push({ x: 140, y: DY + 6, vx: rnd() * 60 - 30, vy: -30 - rnd() * 40, t: 0.6, c: pick(["#ffd23f", "#ffffff"]) });
  };
  const startBackup = (r) => { r.bk = 0; r.bkp = 0.001; S.beep(); lastAct = el; alertMsg("DB 백업 중…", "b"); };

  // 포인터: 랙 잡고 끌기, 톡(선택→다른 랙 톡), 해킹 점·커피·백업 톡
  const toL = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const rackAt = (x, y) => { for (let i = 0; i < 4; i++) if (racks[i].on && x >= SX[i] - 2 && x <= SX[i] + SW + 2 && y >= RT - 18 && y <= RB + 12) return i; return -1; };
  const mugHit = (x, y) => x >= 126 && x <= 156 && y >= DY - 6 && y <= DY + 22;
  cv.addEventListener("pointerdown", (e) => {
    if (over) return; e.preventDefault();
    const [x, y] = toL(e);
    if (drowsy && mugHit(x, y)) return drink();
    let best = null, bd = 13;
    for (const h of hacks) { if (h.dead) continue; const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
    if (best) return blockHack(best);
    const i = rackAt(x, y);
    if (i < 0) { if (sel >= 0) sel = -1; return; }
    const r = racks[i];
    if (r.bk > 0) return startBackup(r);
    if (r.down > 0) { F.msg("재부팅 중이에요…"); SFX.tok(); return; }
    drag = { from: i, x, y, x0: x, y0: y, moved: false };
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    SFX.tick();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return; const [x, y] = toL(e); drag.x = x; drag.y = y;
    if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > 5) drag.moved = true;
  });
  const up = (e, cancel) => {
    if (!drag) return; const d = drag; drag = null; if (cancel || over) return;
    const [x, y] = toL(e), t = rackAt(x, y);
    if (d.moved) { if (t >= 0 && t !== d.from) doMove(d.from, t); else SFX.tok(); sel = -1; return; }
    if (sel >= 0 && sel !== d.from) { doMove(sel, d.from); sel = -1; return; }
    if (sel === d.from) { sel = -1; return; }
    sel = d.from; selT = 0; F.msg("옮길 서버를 톡!");
  };
  cv.addEventListener("pointerup", (e) => up(e, false));
  cv.addEventListener("pointercancel", (e) => up(e, true));
  addB.addEventListener("pointerdown", (e) => { e.preventDefault(); addServer(); });
  cacheB.addEventListener("pointerdown", (e) => { e.preventDefault(); useCache(); });

  // ── 사건 ──
  const spawnHack = (target, spd) => {
    const ups = racks.filter(rackUp); if (!ups.length) return;
    const i = target != null ? target : pick(ups).i, left = rnd() < 0.5, sx = left ? -3 : W + 2, sy = 46;
    hacks.push({ r: i, pts: pathTo(i, sx, sy), s: 1, x: sx, y: sy, v: spd || 24 / ez, dead: 0 });
    if (tut < 0) hacksN++;
    S.siren(); alertMsg("해킹 시도! 빨간 점을 톡", "");
  };
  const runEvent = (k) => {
    if (k === "viral") { F.msg("커뮤니티 글 떡상! 사람이 몰려와요"); alertMsg("떡상!", "y"); S.yay(); }
    else if (k === "hack") spawnHack();
    else if (k === "hack2") { spawnHack(); setTimeout(() => { if (!over) spawnHack(); }, 450); }
    else if (k === "backup") {
      const c = racks.filter((r) => rackUp(r) && r.bk <= 0 && r.bkp <= 0); if (!c.length) return;
      const r = pick(c); r.bk = 5 * ez; bkN++; alertMsg("DB 백업 알림! 서버를 톡", "y"); S.beep();
    } else if (k === "drowsy") { drowsy = { t: 0 }; drowsyN++; S.yawn(); F.msg("새벽 3시… 눈꺼풀이 무거워요"); }
  };

  // ── 할 일 손가락 ──
  let goKey = "";
  const guide = (o) => {
    const k = o ? `${o.x | 0},${o.y | 0},${o.t},${o.dx | 0},${o.dy | 0}` : "";
    if (k === goKey) return; goKey = k;
    if (!o) { goEl.className = "v3-go"; return; }
    const upw = o.y < 70;
    goI.style.backgroundImage = `url("${upw ? FUP : FDN}")`;
    goEl.style.left = o.x + "px"; goEl.style.top = o.y + "px"; goT.innerHTML = o.t;
    const ww = W * K; goT.style.transform = o.x < 70 ? "translateX(-22%)" : o.x > ww - 70 ? "translateX(-80%)" : "";
    goEl.style.setProperty("--dx", (o.dx || 0) + "px"); goEl.style.setProperty("--dy", (o.dy || 0) + "px");
    goEl.className = "v3-go on" + (upw ? " up" : "") + (o.dx != null ? " drag" : "");
  };
  const atL = (x, y, t, extra = {}) => ({ x: x * K, y: y * K, t, ...extra });
  const dragGuide = (a, b, t) => ({ x: cx(a) * K, y: (RT + 26) * K, t, dx: (cx(b) - cx(a)) * K, dy: 0 });
  const hottest = () => { let a = -1, b = -1; racks.forEach((r, i) => { if (!rackUp(r)) return; if (a < 0 || r.L > racks[a].L) a = i; if (b < 0 || r.L < racks[b].L) b = i; }); return [a, b]; };
  const taskNow = () => {
    if (tut >= 0) return null;
    const idle = el - lastAct;
    if (drowsy && drowsy.t > 0.8) return atL(141, DY + 2, "커피 <b>톡!</b>");
    const h = hacks.find((q) => !q.dead);
    if (h && (idle > 0.8 || hacksOk === 0)) return atL(h.x, h.y - 3, "해킹 점 <b>톡!</b>");
    const bk = racks.find((r) => r.bk > 0);
    if (bk && (idle > 1 || bkOk === 0)) return atL(cx(bk.i), RT - 9, "백업 <b>톡!</b>");
    const [a, b] = hottest();
    if (firstHint && el < 3.2 && a >= 0 && b >= 0 && a !== b) return dragGuide(a, b, "빨간 서버를 <b>한가한 쪽으로</b>");
    if (a >= 0 && b >= 0 && a !== b && racks[a].L > 0.9 && racks[a].L - racks[b].L > 0.3 && idle > 1.6) return dragGuide(a, b, "끌어서 <b>옮기기!</b>");
    if (cacheCd <= 0 && inRate() > capNow() * 1.02 && racks.filter(rackUp).every((r) => r.L > 0.7) && idle > 1.2) { const [x, y] = elXY(cacheB, 6); return { x, y, t: "<b>캐시!</b>" }; }
    if (!racks[3].on && p > 0.3 && p < 0.8 && racks.filter(rackUp).every((r) => r.L > 0.75) && idle > 2) { const [x, y] = elXY(addB, 6); return { x, y, t: "<b>서버 추가</b>도 있어요" }; }
    return null;
  };

  // ── 리허설 ──
  const SKIP = `<button class="v3-skip" data-skip>건너뛰기</button>`;
  const tutNext = (n) => {
    tut = n; tutEl.classList.remove("pop", "off"); void tutEl.offsetWidth; tutEl.classList.add("pop");
    tutEl.style.top = px(1);
    if (n === 1) {
      racks[0].L = 1.08; racks[1].L = 0.22; racks[2].L = 0.55; hot = 0;
      tutP.innerHTML = `<b class="rd">빨간 서버</b>가 꽉 찼어요! 꾹 잡고<br><b>한가한 서버</b>로 끌면 트래픽이 옮겨 가요.`; tutB.innerHTML = SKIP;
    } else if (n === 2) {
      tutP.innerHTML = `해킹 시도! 케이블을 타고 오는<br><b class="rd">빨간 점</b>을 <b>톡</b> 해서 막아요.`; tutB.innerHTML = SKIP;
      hacks = []; spawnHack(2, 16);
    } else if (n === 3) {
      racks.forEach((r) => { if (r.on) r.L = 0.85 + rnd() * 0.1; });
      tutP.innerHTML = `사람이 너무 몰려 다 빨개질 땐<br><b>캐시</b>! 잠깐 부하가 절반이 돼요.`; tutB.innerHTML = SKIP;
    } else if (n === 4) {
      tutEl.style.top = px(58);
      tutP.innerHTML = `준비 끝! 이제 진짜 <b>출시 날 밤</b>(21시→아침 7시)<ul><li>사람이 점점 늘어요. <b>서버 추가</b>는 든든하지만 <b class="rd">월 비용↑</b></li><li>노란 <b>DB 백업</b> 알림은 그 서버를 톡</li><li>새벽 3시 졸음엔 <b>커피 톡</b></li><li>빨간 채로 버티면 <b class="rd">503</b>! 사용자가 떠나요</li></ul>`;
      tutB.innerHTML = `<button class="v3-go2" data-go>출시하기!</button>`;
    }
    updBtns(); updSc();
  };
  const startGame = () => {
    if (tut < 0) return; tut = -1; tutEl.classList.add("off"); guide(null);
    racks = [0, 1, 2, 3].map((i) => mkRack(i, i < 3)); racks[0].L = 0.2; racks[1].L = 0.28; racks[2].L = 0.16;
    hacks = []; drowsy = null; sel = -1; cacheOn = 0; cacheCd = 0; boosts = 0; cost = COST0 * 3;
    served = lost = subs = hacksN = hacksOk = bkN = bkOk = coffeeOk = drowsyN = crashes = moves = rescues = 0;
    evI = 0; hist = []; histAcc = { s: 0, l: 0, t: 0 }; el = 0; p = 0; lastAct = 0; hot = rint(3); hotT = 4;
    tm0 = timer(T, F.bar, () => endGame()); SFX.go();
    alertMsg("출시! 앱 공개", "b"); updBtns(); updSc(); setDash();
  };
  tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

  // ── 그리기(논리 좌표, 기기 해상도 벡터) ──
  const drawGraph = (tm) => {
    g.save(); rr(g, 3, 11, 94, 27, 2.5); g.clip();
    const n = hist.length, base = 37.5;
    if (n > 1) {
      const mx = Math.max(60, ...hist.map((h) => h.s + h.l)) * 1.1, x0 = 96 - n * 2;
      const pts = hist.map((h, k) => [x0 + k * 2 + 1, base - (h.s / mx) * 25, base - ((h.s + h.l) / mx) * 25]);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][2]); pts.forEach((p) => g.lineTo(p[0], p[2])); for (let k = pts.length - 1; k >= 0; k--) g.lineTo(pts[k][0], pts[k][1]); g.closePath(); g.fillStyle = "rgba(255,74,90,.5)"; g.fill();
      g.beginPath(); g.moveTo(pts[0][0], base); pts.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(pts[pts.length - 1][0], base); g.closePath(); g.fillStyle = lg(g, 0, 12, 0, base, [[0, "rgba(95,240,160,.55)"], [1, "rgba(95,240,160,.04)"]]); g.fill();
      g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokeStyle = "#5ff0a0"; g.lineWidth = 0.7; g.lineJoin = "round"; g.stroke();
      const lp = pts[pts.length - 1]; if (Math.floor(tm * 4) % 2) { glow(g, lp[0], lp[1], 3.5, "#5ff0a0", 0.8); g.fillStyle = "#fff"; g.beginPath(); g.arc(lp[0], lp[1], 0.9, 0, 6.29); g.fill(); }
    }
    if (tut >= 0) { g.beginPath(); for (let x = 0; x < 92; x += 1) { const v = 3 + Math.sin(x * 0.3 + tm * 3) * 1.5; x ? g.lineTo(4 + x, base - v) : g.moveTo(4, base - v); } g.strokeStyle = "#2e7a5a"; g.lineWidth = 0.6; g.stroke(); }
    g.restore();
  };
  const cablePath = (x) => { g.beginPath(); g.moveTo(LBX, LBY + 5); g.arcTo(LBX, CBY, x, CBY, 3); g.arcTo(x, CBY, x, RT, 3); g.lineTo(x, RT + 1); };
  const drawCables = (tm) => {
    g.lineCap = "round"; g.lineJoin = "round";
    racks.forEach((r, i) => {
      if (!r.on) return;
      const x = cx(i), isHot = i === hot && tut < 0 && rackUp(r);
      cablePath(x); g.strokeStyle = "#090b18"; g.lineWidth = 2.6; g.stroke();
      cablePath(x); g.strokeStyle = r.down > 0 ? "#4a1a26" : isHot ? "#5a3424" : "#2a3158"; g.lineWidth = 1.7; g.stroke();
      cablePath(x); g.strokeStyle = "rgba(160,180,255,.18)"; g.lineWidth = 0.4; g.stroke();
      if (isHot) { g.setLineDash([1.6, 3.2]); g.lineDashOffset = -tm * 26; cablePath(x); g.strokeStyle = "#ffa24a"; g.lineWidth = 1; g.stroke(); g.setLineDash([]); }
    });
    // 로드밸런서
    g.save(); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 3 * KS; rr(g, LBX - 15, LBY - 6, 30, 12, 3); g.fillStyle = lg(g, 0, LBY - 6, 0, LBY + 6, [[0, "#46507e"], [1, "#1e2442"]]); g.fill(); g.restore();
    rr(g, LBX - 15, LBY - 6, 30, 12, 3); g.strokeStyle = "#05060e"; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = "rgba(255,255,255,.22)"; rr(g, LBX - 13.5, LBY - 4.8, 27, 0.6, 0.3); g.fill();
    for (let k = 0; k < 6; k++) { const on = Math.floor(tm * 10 + k * 1.3) % 3, x = LBX - 10 + k * 4, y = LBY - 0.6; if (on) glow(g, x, y, 2.4, "#5fb8ff", 0.6); g.fillStyle = on ? "#8fd0ff" : "#1a3a5a"; g.beginPath(); g.arc(x, y, 0.9, 0, 6.29); g.fill(); }
    g.fillStyle = "#141830"; rr(g, LBX - 12, LBY + 2.4, 24, 1.4, 0.7); g.fill();
    if (cacheOn > 0) {
      const a = 0.5 + 0.5 * Math.sin(tm * 14);
      glow(g, LBX, LBY, 26, "#5fe0a0", 0.25 + a * 0.15);
      rr(g, LBX - 18, LBY - 9, 36, 18, 5); g.strokeStyle = `rgba(95,224,160,${0.55 + a * 0.45})`; g.lineWidth = 0.8; g.stroke();
      for (let k = 0; k < 5; k++) { const t = (tm * 1.6 + k / 5) % 1; g.fillStyle = `rgba(150,255,200,${1 - t})`; g.beginPath(); g.arc(LBX - 15 + k * 7.5, LBY - 9 - t * 7, 0.7, 0, 6.29); g.fill(); }
    }
  };
  const drawRack = (i, tm) => {
    const r = racks[i], x = SX[i];
    if (!r.on) {
      const pulse = tut < 0 && Math.floor(tm * 2) % 2 ? "#4a58a8" : "#2a3268";
      g.setLineDash([2.4, 2]); rr(g, x + 0.5, RT + 0.5, 35, RB - RT - 1, 3); g.strokeStyle = pulse; g.lineWidth = 0.7; g.stroke(); g.setLineDash([]);
      const my = (RT + RB) / 2; g.fillStyle = pulse; rr(g, x + 16.2, my - 6, 3.6, 12, 1.2); g.fill(); rr(g, x + 12, my - 1.8, 12, 3.6, 1.2); g.fill();
      return;
    }
    const oy = r.drop > 0 ? -r.drop * r.drop * 150 : 0, top = RT + oy, bot = RB + oy, h = bot - top, down = r.down > 0;
    if (r.drop > 0) { const s = (1 - r.drop) * 30; g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.ellipse(x + 18, RB + 2, s / 2, 1.4, 0, 0, 6.29); g.fill(); }
    // 캐비닛
    g.save(); g.shadowColor = "rgba(0,0,0,.65)"; g.shadowBlur = 4 * KS; g.shadowOffsetY = 1.5 * KS;
    rr(g, x, top, 36, h, 3); g.fillStyle = lg(g, x, 0, x + 36, 0, [[0, "#323a5c"], [0.12, "#252b48"], [0.85, "#1a1f36"], [1, "#10132a"]]); g.fill(); g.restore();
    rr(g, x, top, 36, h, 3); g.strokeStyle = "#05060e"; g.lineWidth = 0.6; g.stroke();
    rr(g, x + 1.2, top + 1.2, 33.6, 6, 2); g.fillStyle = lg(g, 0, top, 0, top + 7, [[0, "#56609a"], [1, "#2e3462"]]); g.fill();
    g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x + 2.5, top + 1.6, 31, 0.4);
    rr(g, x + 2.2, top + 1.6, 8.4, 5.4, 1.3); g.fillStyle = "#0b0f22"; g.fill();
    txt(g, String(i + 1), x + 6.4, top + 4.4, down ? "#ff4a4a" : "#d8e0ff", 5.5);
    g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(x + 1.2, top + 8, 0.6, h - 11);
    const nb = Math.floor((h - 13) / 8), lc = r.L < 0.7 ? "#4dff88" : r.L < 1 ? "#ffd23f" : "#ff4a4a";
    for (let b = 0; b < nb; b++) {
      const y = top + 9 + b * 8;
      rr(g, x + 3, y, 30, 6, 1.2); g.fillStyle = down ? "#16161f" : lg(g, 0, y, 0, y + 6, [[0, "#3a4566"], [1, "#232a44"]]); g.fill();
      g.fillStyle = "rgba(0,0,0,.45)"; for (let vx = x + 5; vx < x + 19; vx += 1.8) g.fillRect(vx, y + 1.6, 0.6, 2.8);
      g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 3.6, y + 0.4, 28.8, 0.35);
      if (!down) {
        const sp = 3 + r.L * 12, on1 = (tm * sp + b * 0.37 + i * 0.21) % 1 < 0.55, on2 = (tm * sp * 1.3 + b * 0.61) % 1 < 0.4, blue = b % 3 === 0;
        for (const [lx, on, c] of [[22.2, on1, lc], [26.2, on2, lc], [30.2, blue, "#5fb8ff"]]) { if (on) glow(g, x + lx, y + 3, 2.3, c, 0.55); g.fillStyle = on ? c : "#1c2a26"; g.beginPath(); g.arc(x + lx, y + 3, 0.95, 0, 6.29); g.fill(); }
      }
    }
    if (boosts) { g.fillStyle = lg(g, 0, top, 0, bot, [[0, "rgba(95,184,255,0)"], [0.5, boosts > 1 ? "rgba(159,208,255,.8)" : "rgba(95,184,255,.65)"], [1, "rgba(95,184,255,0)"]]); g.fillRect(x + 0.6, top + 6, 0.6, h - 9); g.fillRect(x + 34.8, top + 6, 0.6, h - 9); }
    if (r.flash > 0) { rr(g, x + 1, top + 1, 34, h - 2, 2.5); g.fillStyle = `rgba(160,220,255,${r.flash * 0.6})`; g.fill(); }
    if (!down && r.L > 0.95) {
      rr(g, x + 1, top + 1, 34, h - 2, 2.5); g.fillStyle = `rgba(255,40,40,${0.2 + 0.12 * Math.sin(tm * 14)})`; g.fill();
      if (Math.floor(tm * 6) % 2) { glow(g, x + 18, top + h / 2, 30, "#ff3030", 0.18); rr(g, x - 0.3, top - 0.3, 36.6, h + 0.6, 3.2); g.strokeStyle = "#ff4a4a"; g.lineWidth = 0.8; g.stroke(); }
      if (r.L > 1) { const fl = Math.floor(tm * 8) % 2, wx = x + 29.5, wy = top + 4.3; g.fillStyle = fl ? "#ffd23f" : "#ff4a4a"; g.beginPath(); g.moveTo(wx, wy - 3); g.lineTo(wx + 3.2, wy + 2.4); g.lineTo(wx - 3.2, wy + 2.4); g.closePath(); g.fill(); txt(g, "!", wx, wy + 0.6, "#2a0a00", 3.8); }
    }
    // 과열 연기
    if (!down && r.heat > 0) for (let k = 0; k < 5; k++) { const t = (tm * 1.3 + k * 0.2) % 1; g.fillStyle = `rgba(190,190,205,${0.45 * (1 - t) * Math.min(1, r.heat)})`; g.beginPath(); g.arc(x + 7 + k * 5.5 + Math.sin(t * 6 + k) * 2, top - 2 - t * 15, 1.4 + t * 2.6, 0, 6.29); g.fill(); }
    if (down) {
      const my = top + h / 2 - 9;
      rr(g, x + 3, my, 30, 19, 2); g.fillStyle = "#1a0408"; g.fill(); g.strokeStyle = "#ff4a4a"; g.lineWidth = 0.6; g.stroke();
      if (Math.floor(tm * 5) % 4) { glow(g, x + 18, my + 7.5, 12, "#ff2a3a", 0.4); txt(g, "503", x + 18, my + 7.8, "#ff5a5a", 8.5); }
      g.fillStyle = "rgba(0,0,0,.28)"; for (let y = my + 1; y < my + 19; y += 1.4) g.fillRect(x + 3, y, 30, 0.5);
      if (rnd() < 0.3) sparks.push({ x: x + 4 + rnd() * 28, y: top + 2, vx: rnd() * 40 - 20, vy: -20 - rnd() * 30, t: 0.4, c: pick(["#ffd23f", "#ff7a3a"]) });
      const rb = clamp(1 - r.down / 4.5, 0, 1); rr(g, x + 5, my + 15.4, 26, 1.8, 0.9); g.fillStyle = "#2a0c14"; g.fill(); if (rb > 0.02) { rr(g, x + 5, my + 15.4, 26 * rb, 1.8, 0.9); g.fillStyle = "#5fb8ff"; g.fill(); }
    }
    // 백업 알림(DB 아이콘)·진행
    if (r.bk > 0) {
      const by = top - 9 + (Math.floor(tm * 4) % 2) * 0.8, bx = x + 18;
      glow(g, bx, by, 9, "#ffd23f", 0.5);
      rr(g, bx - 5.5, by - 5.5, 11, 11, 3); g.fillStyle = "#ffd23f"; g.fill(); g.strokeStyle = "#05060e"; g.lineWidth = 0.6; g.stroke();
      g.fillStyle = "#7a5a00"; g.fillRect(bx - 3, by - 2.4, 6, 5); g.fillStyle = "#c99a1a"; for (const yy of [-2.4, 0, 2.6]) { g.beginPath(); g.ellipse(bx, by + yy, 3, 1.1, 0, 0, 6.29); g.fill(); }
      g.fillStyle = "#fff0a0"; g.beginPath(); g.ellipse(bx, by - 2.4, 3, 1.1, 0, 0, 6.29); g.fill();
      const left = clamp(r.bk / (5 * ez), 0, 1); rr(g, x + 2, top - 2.6, 32 * left, 1.2, 0.6); g.fillStyle = "#ffd23f"; g.fill();
    }
    if (r.bkp > 0) { rr(g, x + 3, top + 7.4, 30, 1.6, 0.8); g.fillStyle = "#10142a"; g.fill(); rr(g, x + 3, top + 7.4, 30 * r.bkp, 1.6, 0.8); g.fillStyle = "#5fb8ff"; g.fill(); }
    // 선택·끌기 표시
    const isSrc = (drag && drag.from === i && drag.moved) || sel === i;
    const isDst = drag && drag.moved && drag.from !== i && rackAt(drag.x, drag.y) === i;
    if (isSrc || isDst) { const c = isDst ? "#5ff0a0" : Math.floor(tm * 6) % 2 ? "#ffd23f" : "#fff0a0"; glow(g, x + 18, top + h / 2, 32, c, 0.15); rr(g, x - 1, top - 1, 38, h + 2, 4); g.strokeStyle = c; g.lineWidth = 0.9; g.stroke(); }
    // 부하 게이지
    const gy = RB + 3;
    if (r.drop <= 0) {
      rr(g, x, gy, 36, 7, 2); g.fillStyle = "#05060e"; g.fill(); rr(g, x + 0.8, gy + 0.8, 34.4, 5.4, 1.6); g.fillStyle = "#141830"; g.fill();
      const n = Math.ceil(Math.min(r.L, 1) * 8), over1 = r.L > 1 && !down;
      for (let c = 0; c < 8; c++) { const col = c < 4 ? "#4dff88" : c < 6 ? "#ffd23f" : "#ff4a4a", on = c < n && !down; rr(g, x + 2 + c * 4.1, gy + 1.8, 3.4, 3.4, 0.9); g.fillStyle = down ? "#2a1a20" : on ? (over1 && Math.floor(tm * 8) % 2 ? "#ffffff" : col) : "#262b40"; g.fill(); }
    }
  };
  const drawDots = (tm) => {
    for (const d of dots) {
      if (d.k === "m") { if (d.t < 0) continue; const ax = cx(d.a), bx = cx(d.b), t = clamp(d.t, 0, 1), x = lerp(ax, bx, t), y = RT - 4 - Math.sin(t * Math.PI) * 22; glow(g, x, y, 2.6, d.c, 0.6); g.fillStyle = d.c; g.beginPath(); g.arc(x, y, 0.95, 0, 6.29); g.fill(); continue; }
      const x = d.x, y = d.y;
      if (d.k === "l") { const a = clamp(d.t / 0.8, 0, 1); g.fillStyle = `rgba(150,150,170,${a})`; g.beginPath(); g.arc(x + 1, y + 1.3, 1, Math.PI, 0); g.fill(); g.beginPath(); g.arc(x + 1, y - 0.3, 0.7, 0, 6.29); g.fill(); continue; }
      const c = d.k === "c" ? "#5fe0a0" : d.c;
      g.fillStyle = c; g.beginPath(); g.arc(x + 1, y + 1.5, 1.05, Math.PI, 0); g.fill();
      g.fillStyle = "#ffd8b8"; g.beginPath(); g.arc(x + 1, y - 0.2, 0.75, 0, 6.29); g.fill();
    }
    for (const h of hacks) { if (h.dead) continue; virus(g, h.x, h.y, 2.3, Math.floor(tm * 8) % 2); }
  };
  const drawMug = (tm) => {
    const x = 132, y = DY + 3, lit = drowsy && Math.floor(tm * 4) % 2;
    if (drowsy) { glow(g, x + 6, y + 8, 16, "#ffd23f", lit ? 0.6 : 0.3); rr(g, x - 3, y - 3, 22, 20, 4); g.strokeStyle = lit ? "#ffd23f" : "rgba(255,210,63,.5)"; g.lineWidth = 0.9; g.stroke(); }
    g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 2 * KS; g.shadowOffsetY = 0.6 * KS;
    rr(g, x + 0.5, y + 2.5, 11, 11.5, 2.2); g.fillStyle = lg(g, x, 0, x + 12, 0, [[0, "#cfd0dc"], [0.35, "#ffffff"], [1, "#b8b8c8"]]); g.fill(); g.restore();
    g.strokeStyle = "#d8d8e4"; g.lineWidth = 1.3; g.beginPath(); g.arc(x + 11.6, y + 8, 2.6, -1.3, 1.3); g.stroke();
    g.fillStyle = lg(g, 0, y + 2.4, 0, y + 4, [[0, "#8a5a32"], [1, "#4a2a12"]]); g.beginPath(); g.ellipse(x + 6, y + 3.2, 4.9, 1.2, 0, 0, 6.29); g.fill();
    g.fillStyle = "#7c9cff"; rr(g, x + 3, y + 7.6, 6, 2.6, 1); g.fill(); g.fillStyle = "#fff"; g.fillRect(x + 4.2, y + 8.6, 3.6, 0.5);
    for (let k = 0; k < 2; k++) { const t = (tm * 0.8 + k / 2) % 1; g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - t)})`; g.lineWidth = 0.7; g.lineCap = "round"; g.beginPath(); const sx = x + 4 + k * 3.5; g.moveTo(sx, y + 1.5 - t * 3); g.bezierCurveTo(sx + 1.6, y - 1 - t * 4, sx - 1.6, y - 3 - t * 5, sx + 0.4, y - 5 - t * 6); g.stroke(); }
  };
  const render = (tm) => {
    g.clearRect(0, 0, W, H);
    const sx = shake > 0 ? (rnd() - 0.5) * 3 : 0;
    g.save(); g.translate(sx, 0);
    g.drawImage(BG, 0, 0, W, H);
    drawGraph(tm);
    // 경고등
    const anyHot = racks.some((r) => r.on && (r.L > 1 || r.down > 0));
    for (const ex of [6, 154]) { const on = anyHot && Math.floor(tm * 4) % 2; if (on) glow(g, ex, 47, 9, "#ff3a4a", 0.6); g.fillStyle = on ? "#ff5a5a" : "#4a1820"; rr(g, ex - 2, 46, 4, 2, 1); g.fill(); }
    drawCables(tm);
    for (let i = 0; i < 4; i++) drawRack(i, tm);
    drawDots(tm);
    if (drag && drag.moved) {
      const ax = cx(drag.from), ay = RT + 20, mx2 = (ax + drag.x) / 2, my2 = (ay + drag.y) / 2 - 12;
      g.setLineDash([2, 2]); g.lineDashOffset = -tm * 20; g.strokeStyle = "#ffd23f"; g.lineWidth = 1; g.lineCap = "round";
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx2, my2, drag.x, drag.y); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(drag.x, drag.y, 1.8, 0, 6.29); g.fill();
    }
    g.drawImage(DESK, 0, DY, W, H - DY);
    drawMug(tm);
    for (const s of sparks) { g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 0.9, 0, 6.29); g.fill(); }
    g.restore();
    // 졸음: 눈꺼풀(둥근 곡선)
    if (drowsy) {
      const lid = clamp(drowsy.t / 3.6, 0, 0.9) * (0.9 + 0.1 * Math.sin(tm * 3)), hh = (H / 2) * lid;
      g.fillStyle = `rgba(5,6,20,${0.35 * lid})`; g.fillRect(0, 0, W, H);
      g.fillStyle = "#020208";
      g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, hh * 0.7); g.quadraticCurveTo(W / 2, hh * 1.35, 0, hh * 0.7); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, H); g.lineTo(W, H); g.lineTo(W, H - hh * 0.7); g.quadraticCurveTo(W / 2, H - hh * 1.35, 0, H - hh * 0.7); g.closePath(); g.fill();
      txt(g, "Z", 22, 30 + Math.sin(tm * 2) * 3, "#9fb4ff", 9); txt(g, "z", 33, 21 + Math.sin(tm * 2 + 1) * 3, "#9fb4ff", 6.5);
      drawMug(tm);
    }
  };

  // ── 끝: 아침 결산 ──
  const endGame = () => {
    if (over) return; over = true; guide(null); endT = 0;
    if (tm0) tm0.stop(); drag = null; sel = -1; updBtns();
    const tot = served + lost, uptime = tot ? served / tot : 0;
    const revenue = subs * PRICE, costW = cost * 10000, profit = revenue - costW;
    const maxRev = tot * SUBR * PRICE;
    const upN = clamp((uptime - 0.7) / 0.27, 0, 1);
    const secT = hacksN + bkN + drowsyN, secN = secT ? (hacksOk + bkOk + coffeeOk) / secT : 1;
    const profitN = maxRev > 0 ? clamp(profit / (0.6 * maxRev), 0, 1) : 0;
    const score = clamp(0.6 * upN + 0.25 * secN + 0.15 * profitN, 0, 1);
    const happy = score >= 0.5;
    F.msg("아침 7시! 밤샘 끝");
    // 장면 캔버스: 뒤 = 실제 사무실 그림(창밖 해 뜨는 도시) + 의자, 앞 = 책상 소품(매 프레임)
    const deskY = Math.round(H * 0.76);
    const [eb, ed] = hiC(W, H);
    {
      const d = ed;
      if (endBgOk) { const iw = ENDBG.naturalWidth, ih = ENDBG.naturalHeight, s = Math.max(W / iw, H / ih), sw = W / s, sh = H / s; d.drawImage(ENDBG, clamp(iw * 0.62 - sw / 2, 0, iw - sw), clamp(ih * 0.4 - sh / 2, 0, ih - sh), sw, sh, 0, 0, W, H); }
      else { d.fillStyle = lg(d, 0, 0, 0, H, [[0, "#5a6aa8"], [0.5, "#e8a878"], [1, "#3a3048"]]); d.fillRect(0, 0, W, H); }
      d.fillStyle = "rgba(20,16,40,.18)"; d.fillRect(0, 0, W, H);
      // 의자 등받이
      const cy0 = Math.round(H * 0.5);
      d.save(); d.shadowColor = "rgba(0,0,0,.5)"; d.shadowBlur = 5 * KS; rr(d, 44, cy0, 72, deskY - cy0 + 8, 10); d.fillStyle = lg(d, 44, 0, 116, 0, [[0, "#1a1b24"], [0.3, "#353848"], [1, "#15161e"]]); d.fill(); d.restore();
      rr(d, 49, cy0 + 4, 62, deskY - cy0, 8); d.fillStyle = lg(d, 0, cy0, 0, deskY, [[0, "#3a3d50"], [1, "#24262f"]]); d.fill();
      d.strokeStyle = "rgba(255,255,255,.08)"; d.lineWidth = 0.5; for (let k = 0; k < 4; k++) { d.beginPath(); d.moveTo(54, cy0 + 10 + k * 8); d.lineTo(106, cy0 + 10 + k * 8); d.stroke(); }
    }
    endEl.innerHTML = `<canvas class="v3-eb"></canvas><div class="v3-dk"></div><div class="v3-me"></div><canvas class="v3-ef"></canvas><div class="v3-say"></div>
      <div class="v3-rep"><h4>07:00 · 출시 첫날 밤 결산</h4><div><span>가입자</span><b>${wonS(served)}명</b></div><div><span>떠난 사람(503·느림)</span><b class="mi">${wonS(lost)}명</b></div><div><span>구독 ${wonS(subs)}명 × 4,900원</span><b class="pl">+${manS(revenue)}만/월</b></div><div><span>서버비</span><b class="mi">-${cost}만/월</b></div><div><span>남는 돈</span><b class="${profit >= 0 ? "pl" : "mi"}">${profit >= 0 ? "+" : ""}${manS(profit)}만/월</b></div></div>`;
    const cb = endEl.querySelector(".v3-eb"), cf = endEl.querySelector(".v3-ef"), meEl = endEl.querySelector(".v3-me"), dkEl = endEl.querySelector(".v3-dk"), sayEl = endEl.querySelector(".v3-say"), rep = endEl.querySelector(".v3-rep");
    cb.width = cf.width = eb.width; cb.height = cf.height = eb.height; cb.getContext("2d").drawImage(eb, 0, 0);
    const Hc = H * K;
    // 내 캐릭터(표정 시트 3x2, 칸 240x540 중 위 312만)
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    const avH = Math.round(Hc * 0.5), avW = Math.round(avH * 240 / 312);
    Object.assign(meEl.style, { width: avW + "px", height: avH + "px", left: Math.round(W * K / 2 - avW / 2) + "px", top: Math.round(Hc * 0.88 - avH) + "px" });
    const face = (i) => (meEl.style.backgroundPosition = `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`);
    face(0); meEl.classList.add("doze");
    { const im = new Image(); im.onload = () => { meEl.style.backgroundImage = `url("${im.src}")`; meEl.classList.add("on"); }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp"; }
    Object.assign(sayEl.style, { top: Math.round(Hc * 0.88 - avH - 30) + "px" });
    // 앞 캔버스: 책상·모니터·커피컵·폰(매 프레임)
    const fg = cf.getContext("2d");
    endScene = { fg, deskY, t: 0, buzz: 0, woke: false, happy };
    requestAnimationFrame(() => endEl.classList.add("on"));
    const at = (ms, fn) => setTimeout(() => { if (endEl.isConnected) fn(); }, ms);
    at(1700, () => { dkEl.classList.add("lit"); endScene.buzz = 1; S.alarm(); S.alarm(0.4); vib([40, 60, 40]); });
    at(2500, () => { endScene.woke = true; meEl.classList.remove("doze"); meEl.classList.add("wake"); face(5); sayEl.textContent = "헉! 아침이야?!"; sayEl.classList.add("on"); });
    at(3200, () => {
      rep.classList.add("on"); sayEl.classList.remove("on");
      [...rep.querySelectorAll("div")].forEach((d, k) => at(k * 230, () => { d.classList.add("on"); if (k === 2) { for (let j = 0; j < Math.min(6, Math.ceil(subs / 25)); j++) S.coin(j * 0.09); } else SFX.tick(); }));
    });
    at(4700, () => {
      face(happy ? 1 : 2); meEl.classList.remove("wake");
      sayEl.textContent = happy ? (crashes ? "몇 번 터졌지만… 지켜냈다!" : "한 번도 안 터졌다! 구독 띵띵!") : "503이 몇 번이야… 다음엔 꼭!";
      sayEl.classList.add("on"); if (happy) { S.yay(); F.burst([W * K / 2, Hc * 0.3], "#ffd23f", 14); } else SFX.fail();
    });
    const line = `가입 ${wonS(served)}명 · 구독 <b>${wonS(subs)}명</b> · 남는 돈 <b>${profit >= 0 ? "+" : ""}${manS(profit)}만/월</b>` + (crashes ? ` · 503 ${crashes}번` : "");
    at(6400, () => finish(score, line, "", [["서버 지키기", upN], ["보안·백업", secN], ["남는 돈", profitN]]));
    if (window.__mgdbg) window.__mgdbg._vibe3res = { score, uptime, upN, secN, profitN, served, lost, subs, cost, profit, crashes, moves, rescues, hacksN, hacksOk, bkN, bkOk, coffeeOk };
  };
  let endScene = null;
  const drawEnd = (tm, dt) => {
    const E = endScene; if (!E) return; E.t += dt; if (E.buzz > 0) E.buzz = Math.max(0, E.buzz - dt * 0.6);
    const d = E.fg, dy = E.deskY;
    d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, d.canvas.width, d.canvas.height); d.setTransform(KS, 0, 0, KS, 0, 0);
    // 책상
    d.fillStyle = lg(d, 0, dy, 0, H, [[0, "#8a6446"], [0.06, "#6a4a34"], [1, "#3a2820"]]); d.fillRect(0, dy, W, H - dy);
    d.fillStyle = "#b08a68"; d.fillRect(0, dy, W, 0.7); d.fillStyle = "rgba(0,0,0,.35)"; d.fillRect(0, dy + 3, W, 0.6);
    d.strokeStyle = "rgba(255,230,200,.06)"; d.lineWidth = 0.5; for (let k = 0; k < 5; k++) { d.beginPath(); d.moveTo(0, dy + 6 + k * 9); d.bezierCurveTo(W * 0.35, dy + 4 + k * 9, W * 0.65, dy + 10 + k * 9, W, dy + 6 + k * 9); d.stroke(); }
    // 키보드
    rr(d, 52, dy - 3, 56, 6.5, 1.6); d.fillStyle = lg(d, 0, dy - 3, 0, dy + 3.5, [[0, "#454a5e"], [1, "#22242e"]]); d.fill();
    d.fillStyle = "#62677e"; for (let k = 0; k < 13; k++) { rr(d, 54 + k * 4, dy - 1.6, 3.2, 2.2, 0.5); d.fill(); }
    // 모니터(오른쪽, 대시보드: 초록 그래프)
    const mx = 114, my = dy - 34;
    d.fillStyle = "#2a2c3a"; rr(d, mx + 18, my + 27, 6, 6, 1); d.fill(); rr(d, mx + 11, dy - 2.4, 20, 2.4, 1); d.fill();
    d.save(); d.shadowColor = "rgba(0,0,0,.5)"; d.shadowBlur = 4 * KS; rr(d, mx, my, 42, 28, 2.5); d.fillStyle = "#06070f"; d.fill(); d.restore();
    rr(d, mx + 1.2, my + 1.2, 39.6, 25.6, 1.8); d.fillStyle = lg(d, 0, my, 0, my + 28, [[0, "#0e1530"], [1, "#081020"]]); d.fill();
    const pts = []; for (let k = 0; k < 18; k++) pts.push([mx + 3 + k * 2.1, my + 25 - (3 + Math.pow(k / 18, 1.4) * 18 * (E.happy ? 1 : 0.6) + Math.sin(k * 1.3) * 2)]);
    d.beginPath(); d.moveTo(pts[0][0], my + 25.5); pts.forEach((p) => d.lineTo(p[0], p[1])); d.lineTo(pts[17][0], my + 25.5); d.closePath(); d.fillStyle = lg(d, 0, my + 4, 0, my + 26, [[0, "rgba(95,240,160,.55)"], [1, "rgba(95,240,160,.05)"]]); d.fill();
    d.beginPath(); pts.forEach((p, k) => (k ? d.lineTo(p[0], p[1]) : d.moveTo(p[0], p[1]))); d.strokeStyle = "#5ff0a0"; d.lineWidth = 0.7; d.stroke();
    d.fillStyle = "rgba(255,255,255,.06)"; d.beginPath(); d.moveTo(mx + 1.2, my + 1.2); d.lineTo(mx + 18, my + 1.2); d.lineTo(mx + 6, my + 26.8); d.lineTo(mx + 1.2, my + 26.8); d.fill();
    // 빈 커피컵 3개(밤샘의 흔적)
    for (let k = 0; k < 3; k++) {
      const x = 8 + k * 11, y = dy - 11 + (k === 1 ? 2 : 0);
      d.fillStyle = lg(d, x, 0, x + 9, 0, [[0, "#d8d4cc"], [0.4, "#ffffff"], [1, "#c8c2b8"]]); d.beginPath(); d.moveTo(x, y); d.lineTo(x + 9, y); d.lineTo(x + 8, y + 10); d.lineTo(x + 1, y + 10); d.closePath(); d.fill();
      d.fillStyle = "#7c9cff"; d.beginPath(); d.moveTo(x + 0.4, y + 3.6); d.lineTo(x + 8.6, y + 3.6); d.lineTo(x + 8.3, y + 6.6); d.lineTo(x + 0.7, y + 6.6); d.closePath(); d.fill();
      d.fillStyle = "#4a3a30"; rr(d, x - 0.5, y - 1.2, 10, 1.6, 0.8); d.fill();
    }
    // 폰(알림 진동)
    const bz = E.buzz > 0 ? Math.sin(E.t * 60) * 1.5 : 0, px0 = 40 + bz, py0 = dy + 6, lit = E.buzz > 0 && Math.floor(E.t * 8) % 2;
    rr(d, px0, py0, 15, 8.5, 1.8); d.fillStyle = "#06070f"; d.fill();
    rr(d, px0 + 1, py0 + 1, 13, 6.5, 1.2); d.fillStyle = lit ? "#ffd23f" : "#2a3058"; d.fill();
    if (lit) glow(d, px0 + 7.5, py0 + 4, 12, "#ffd23f", 0.45);
    if (E.buzz > 0) { d.strokeStyle = "#ffd23f"; d.lineWidth = 0.6; d.lineCap = "round"; d.beginPath(); d.arc(px0 + 7.5, py0 + 4.2, 10, 2.6, 3.7); d.moveTo(px0 + 17.5, py0 - 1); d.arc(px0 + 7.5, py0 + 4.2, 10, -0.55, 0.55); d.stroke(); }
    // 졸 때 Z
    if (!E.woke) { const b = H * 0.4; for (let k = 0; k < 3; k++) { const t = (E.t * 0.6 + k / 3) % 1, zx = 100 + k * 7 + t * 10, zy = b - t * 26, zs = k ? 9 : 7; txt(d, "Z", zx + 0.5, zy + 0.5, `rgba(10,12,40,${0.8 * (1 - t)})`, zs); txt(d, "Z", zx, zy, `rgba(240,244,255,${1 - t})`, zs); } }
    // 아침 햇살
    if (E.t > 1.7) { const a = clamp((E.t - 1.7) / 1.5, 0, 1) * 0.2; d.fillStyle = lg(d, 0, 0, 0, H, [[0, `rgba(255,224,160,${a})`], [1, `rgba(255,200,140,${a * 0.3})`]]); d.beginPath(); d.moveTo(40, 0); d.lineTo(120, 0); d.lineTo(150, H); d.lineTo(20, H); d.fill(); }
  };

  // ── 반복 ──
  let raf = 0;
  const loop = (now) => {
    if (!cv.isConnected) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tm = now / 1000;
    if (!inited) { inited = true; if (opts.retry) startGame(); else tutNext(1); }
    if (!over) {
      if (tut < 0) { el += dt; p = clamp(el / T, 0, 1); }
      if (shake > 0) shake -= dt;
      if (sel >= 0) { selT += dt; if (selT > 3) sel = -1; }
      // 사건
      if (tut < 0) while (evI < EVENTS.length && p >= EVENTS[evI][0]) runEvent(EVENTS[evI++][1]);
      // 핫스팟
      if (tut < 0) { hotT -= dt; if (hotT <= 0) { const c = racks.filter((r) => r.on && r.i !== hot); if (c.length) hot = pick(c).i; hotT = 3.6 + rnd() * 2.4; } }
      if (cacheOn > 0) cacheOn -= dt; if (cacheCd > 0) cacheCd = Math.max(0, cacheCd - dt);
      // 부하 계산
      const I = inRate(), cm = cacheOn > 0 ? 0.5 : 1;
      const ws = racks.map((r) => (r.on && r.drop <= 0 ? (tut >= 0 ? 1 : r.i === hot ? 2.8 : 1) : 0)), wsum = ws.reduce((a, b) => a + b, 0) || 1;
      let sv = 0, ls = 0;
      racks.forEach((r, i) => {
        if (r.flash > 0) r.flash -= dt * 1.5;
        if (r.drop > 0) { r.drop -= dt * 2.2; if (r.drop <= 0) { r.drop = 0; S.thud(); vib(30); shake = 0.25; for (let k = 0; k < 14; k++) sparks.push({ x: SX[3] + rnd() * 36, y: RB, vx: rnd() * 60 - 30, vy: -10 - rnd() * 30, t: 0.5, c: "#8a8aa8" }); alertMsg("서버 추가 완료!", "b"); } }
        if (!r.on || r.drop > 0) return;
        const inflow = I * (ws[i] / wsum) * cm * dt;
        r.acc += I * (ws[i] / wsum) * cm * dt * 14;
        if (tut >= 0) { while (r.acc >= 1) { r.acc -= 1; spawnUser(i); } return; }
        if (r.down > 0) {
          r.down -= dt; ls += inflow; while (r.acc >= 1) { r.acc -= 1; spawnUser(i); }
          if (r.down <= 0) { r.down = 0; r.L = 0.1; alertMsg(`${i + 1}번 서버 복구`, "g"); tone(880, 0.1, "triangle", 0.06); }
          return;
        }
        while (r.acc >= 1) { r.acc -= 1; spawnUser(i); }
        r.L += inflow;
        if (r.L > 1) { sv += inflow * 0.5; ls += inflow * 0.5; } else sv += inflow;
        r.L = Math.max(0, r.L - DRAIN * (1 + 0.25 * boosts) * dt);
        r.L = Math.min(r.L, 1.45);
        if (r.L > 1) {
          r.heat += dt / ez;
          if (r.heat > 2.2) {
            r.down = 4.5; r.heat = 0; r.L = 0; r.crashN++; crashes++; S.crash(); vib([60, 40, 80]); shake = 0.4; camSet("sad", 2.2);
            F.miss(stageXY(cx(i), RT + 30)); alertMsg(`${i + 1}번 서버 503! 사용자 이탈`); if (sel === i) sel = -1;
            for (let k = 0; k < 18; k++) sparks.push({ x: cx(i), y: RT + 20, vx: rnd() * 120 - 60, vy: -30 - rnd() * 60, t: 0.6, c: pick(["#ff4a4a", "#ffd23f", "#ffffff"]) });
          }
        } else r.heat = Math.max(0, r.heat - dt * 1.5);
      });
      if (tut < 0) {
        // 캐시가 받아 준 몫도 손님은 손님
        const cached = cacheOn > 0 ? I * 0.5 * dt : 0;
        sv += cached; cacheAcc += cached * 14; while (cacheAcc >= 1) { cacheAcc -= 1; spawnUser(0, true); }
        served += sv * UPU; lost += ls * UPU;
        const ns = Math.floor(served * SUBR);
        if (ns > subs) { subs = ns; dingN++; if (el - dingT > 0.32) { dingT = el; S.coin(); if (dingN % 3 === 0) F.float(stageXY(128, 30), "+4,900원"); dk.s.classList.remove("bump"); void dk.s.offsetWidth; dk.s.classList.add("bump"); } updSc(); }
        histAcc.s += sv * UPU; histAcc.l += ls * UPU; histAcc.t += dt;
        if (histAcc.t >= 0.4) { hist.push({ s: histAcc.s / histAcc.t, l: histAcc.l / histAcc.t }); if (hist.length > 46) hist.shift(); histAcc = { s: 0, l: 0, t: 0 }; }
        // 과부하 삑
        alarmT -= dt; if (alarmT <= 0 && racks.some((r) => r.on && r.L > 1 && r.down <= 0)) { alarmT = 0.5; S.beep(); }
        // 백업
        racks.forEach((r) => {
          if (r.bk > 0) { r.bk -= dt; if (r.bk <= 0 || r.down > 0) { r.bk = 0; alertMsg("백업을 놓쳤어요…", ""); SFX.fail(); camSet("sad", 1.2); } }
          if (r.bkp > 0) { r.bkp += dt / 1.2; if (r.bkp >= 1) { r.bkp = 0; bkOk++; S.backup(); alertMsg("백업 완료!", "g"); camSet("smile", 1); F.float(stageXY(cx(r.i), RT - 6), "백업 완료"); } }
        });
        // 졸음
        if (drowsy) { drowsy.t += dt; if (drowsy.t > 7) { drowsy = null; F.msg("헉! 깜빡 졸았다"); SFX.fail(); } }
      }
      // 점·해킹 이동
      for (let k = dots.length - 1; k >= 0; k--) {
        const d = dots[k];
        if (d.k === "m") { d.t += dt * 2.4; if (d.t >= 1) dots.splice(k, 1); continue; }
        if (d.k === "l") { d.t -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 40 * dt; if (d.t <= 0) dots.splice(k, 1); continue; }
        if (stepPath(d, dt)) {
          dots.splice(k, 1);
          if (d.k === "c") { if (rnd() < 0.5) sparks.push({ x: d.x, y: d.y, vx: rnd() * 30 - 15, vy: -20, t: 0.3, c: "#9fffc8" }); continue; }
          const r = racks[d.r];
          if (r.down > 0 || (r.L > 1 && rnd() < 0.5)) dots.push({ k: "l", x: d.x, y: d.y, vx: rnd() * 50 - 25, vy: -40 - rnd() * 20, t: 0.8 });
        }
      }
      for (const h of hacks) {
        if (h.dead) continue;
        if (stepPath(h, dt)) {
          h.dead = 1;
          if (tut === 2) { F.msg("놓쳤어요! 한 번 더"); setTimeout(() => { if (tut === 2) spawnHack(2, 16); }, 500); continue; }
          const r = racks[h.r]; if (r.on && r.down <= 0) r.L += 0.5;
          F.miss(stageXY(h.x, h.y)); alertMsg("해킹 당했어요! 부하 폭증"); camSet("angry", 1.6);
          for (let k = 0; k < 10; k++) sparks.push({ x: h.x, y: h.y, vx: rnd() * 80 - 40, vy: -rnd() * 60, t: 0.5, c: "#ff3a4a" });
        }
      }
      hacks = hacks.filter((h) => !h.dead);
      // 손가락
      if (tut === 1) { guide(dragGuide(0, 1, "꾹 잡고 <b>한가한 서버로!</b>")); }
      else if (tut === 2) { const h = hacks[0]; guide(h ? atL(h.x, h.y - 3, "빨간 점 <b>톡!</b>") : null); }
      else if (tut === 3) { const [x, y] = elXY(cacheB, 6); guide({ x, y, t: "<b>캐시</b> 톡!" }); }
      else if (tut === 4) guide(null);
      else { if (el > 3.2) firstHint = false; guide(taskNow()); }
      setDash(); updBtns(); camUpd(dt);
    } else if (endScene) drawEnd(tm, dt);
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 90 * dt; if (s.t <= 0) sparks.splice(i, 1); }
    if (!over || !endScene) render(tm);
    raf = requestAnimationFrame(loop);
  };

  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.vibe3 = {
    st: () => ({ tut, p: +p.toFixed(3), el: +el.toFixed(2), over, L: racks.map((r) => (r.on ? +r.L.toFixed(2) : null)), down: racks.map((r) => +r.down.toFixed(1)), hot, served: Math.round(served), lost: Math.round(lost), subs, cost, crashes, moves, hacks: hacks.length, hacksN, hacksOk, bkN, bkOk, drowsy: !!drowsy, coffeeOk, cacheCd: +cacheCd.toFixed(1), boosts }),
    tut: () => tut, start: startGame,
    tutDo: () => {
      if (tut === 1) doMove(0, 1);
      else if (tut === 2) { const h = hacks.find((q) => !q.dead); if (h) blockHack(h); }
      else if (tut === 3) useCache();
      else if (tut === 4) startGame();
    },
    auto: () => {
      if (tut >= 0 || over) return;
      if (drowsy) return drink();
      const h = hacks.find((q) => !q.dead); if (h) return blockHack(h);
      const bk = racks.find((r) => r.bk > 0); if (bk) return startBackup(bk);
      if (!racks[3].on && p > 0.28) return addServer();
      if (racks[3].on && boosts < 1 && p > 0.5 && racks.filter(rackUp).every((r) => r.L > 0.6)) return addServer();
      if (cacheCd <= 0 && inRate() > capNow() * 0.95 && racks.filter(rackUp).some((r) => r.L > 0.75)) return useCache();
      const [a, b] = hottest(); if (a >= 0 && b >= 0 && racks[a].L - racks[b].L > 0.28) doMove(a, b);
    },
  };
  updBtns(); updSc(); setDash(); render(0); raf = requestAnimationFrame(loop);
}
