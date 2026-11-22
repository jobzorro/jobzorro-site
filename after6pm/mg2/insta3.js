// 미니게임 3탄(insta3) "이건 칼박 숏폼 각": 퇴근 후 찍어 둔 영상(여행·음식·운동·내 얼굴)을 음악 박자에 맞춰 자르는 리듬 편집기.
// 위는 세로 미리보기, 아래는 타임라인. 가위 표시가 빨간 선에 닿을 때 톡 = 컷. 보라 화살표 = 그 방향으로 쓱(전환 효과).
// 노란 자막 막대 = 꾹 눌렀다가 끝에서 떼기. 정박이면 Perfect, 어긋나면 화면이 튄다. 끝나면 내가 편집한 릴스가 박자대로 재생되고 조회수가 터진다.
// 음악은 tone·noise 로 직접 짠 드럼+베이스 루프(BPM 96). 소리와 화면은 같은 시계(performance.now)로 맞춘다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM } from "../mg.js";

const BPM = 96, SPB = 60 / BPM, T = 30;
// 차트: [박, 종류(c 컷 / s 전환 / h 자막), 방향 또는 끝 박]
const CHART = [
  [4, "c"], [6, "c"], [8, "c"], [10, "c"], [12, "c"], [13, "c"], [14, "c"],
  [16, "s", "r"], [18, "s", "l"], [20, "s", "u"], [22, "s", "r"], [24, "s", "d"], [26, "s", "l"],
  [28, "h", 30], [31, "c"], [32, "h", 34], [35, "c"],
  [36, "c"], [37, "c"], [38, "c"], [39, "c"], [40, "c"], [40.5, "c"], [41, "c"], [42, "c"], [43, "c"], [44, "c"], [44.5, "c"], [45, "c"], [46, "s", "r"], [47, "c"],
];
const SECS = [
  { b: 0, k: "c", n: "컷 편집!", s: "가위가 빨간 선에 닿을 때 톡" },
  { b: 15, k: "s", n: "전환 효과!", s: "화살표 방향으로 쓱 밀기" },
  { b: 27, k: "h", n: "자막 타이밍!", s: "꾹 눌렀다가 막대 끝에서 떼기" },
  { b: 35, k: "c", n: "클라이맥스!", s: "몰아치는 컷, 박자만 믿어요" },
];
const PLAY = ["beach", "ramen", "run", "me", "plane", "cake", "gym", "me", "city", "ramen", "beach", "cake", "run", "me", "city", "gym", "plane", "me"];
const SCOL = { beach: "#4fb8f0", plane: "#8fc0ff", ramen: "#f0a050", cake: "#ff9ec8", run: "#ff7a4a", gym: "#8a90c8", city: "#7a6ae0", me: "#ff5f9e" };
const SUBS = ["퇴근 후 6시, 2막 시작", "오늘의 한 끼는 이거", "본업 끝! 이제 내 시간", "이 맛에 투잡하지", "땀 흘린 만큼 개운", "내일도 출근ㅋㅋ"];
const GOODC = ["박자 미쳤다 ㄷㄷ", "편집 장인 등장", "이거 몇 번째 보는지ㅋㅋ", "컷 전환 소름", "노래 제목 뭐예요?", "퇴근하고 이걸 만든다고요?", "저장했어요!!"];
const MIDC = ["오 괜찮은데요?", "음악 좋다~", "다음 편도 올려 주세요", "라멘 맛집 어디예요?"];
const BADC = ["뭔가 엇박…ㅋㅋ", "음악 따로 영상 따로", "편집 연습 중이신가요?", "화면 왜 튀어요ㅋㅋ"];
const ARW = { r: "→", l: "←", u: "↑", d: "↓" };
const DV = { r: [1, 0], l: [-1, 0], u: [0, -1], d: [0, 1] };
const HCOL = ["#ff4f8b", "#ff7eb6", "#ff3b5c", "#ffd166", "#c77dff"];

const hex = (c) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
const tint = (c, f) => "#" + hex(c).map((v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0")).join("");
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const fmtV = (n) => (n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "") + "만" : Math.round(n).toLocaleString());
const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));
// 안내 손가락(벡터, 위를 가리킴)
const HAND = `<defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffd25a"/></linearGradient></defs>
  <path d="M14.5 4.5c0-2 3.5-2 3.5 0v13l1-.4c.2-2.2 3.6-2.2 3.6.2l.2.6c.6-2 3.6-1.8 3.6.4l.2.8c.8-1.8 3.4-1.4 3.4.8v8.6c0 5-3.6 9-8.6 9h-1.8c-3 0-5-1.4-6.6-4l-5.4-8.6c-1.2-2 1.4-3.8 3-2.2l3.9 3.8z" fill="url(#k)" stroke="#5a3a0a" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M19 18v6M22.8 18.6v5.6M26.6 19.6v4.6" stroke="#c9952a" stroke-width="1.2" stroke-linecap="round"/><path d="M16 5.6v8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`;
const fingerURL = () => svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${HAND}</svg>`);

// ── 그리기 도구(논리 좌표, 캔버스에 배율이 걸려 있음) ──
const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h); };
const lg = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const glow = (g, x, y, r, c, a = 1) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, rgba(c, a)); q.addColorStop(1, rgba(c, 0)); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); };
const heartP = (g, cx, cy, s) => { g.beginPath(); g.moveTo(cx, cy + s * 0.85); g.bezierCurveTo(cx - s * 1.35, cy + s * 0.05, cx - s * 0.85, cy - s * 1.05, cx, cy - s * 0.38); g.bezierCurveTo(cx + s * 0.85, cy - s * 1.05, cx + s * 1.35, cy + s * 0.05, cx, cy + s * 0.85); g.closePath(); };
function scissors(g, x, y, s, col = "#fff") {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.fillStyle = col; g.lineCap = "round";
  g.lineWidth = 0.55; g.beginPath(); g.moveTo(-1.5, -2.4); g.lineTo(1.1, 1.2); g.moveTo(1.5, -2.4); g.lineTo(-1.1, 1.2); g.stroke();
  g.lineWidth = 0.45; g.beginPath(); g.arc(-1.35, 1.75, 0.75, 0, 6.29); g.moveTo(2.1, 1.75); g.arc(1.35, 1.75, 0.75, 0, 6.29); g.stroke();
  g.restore();
}
function arrowP(g, x, y, dx, dy, s, col = "#fff") {
  g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx)); g.strokeStyle = col; g.lineWidth = 0.7 * s; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(-2.3 * s, 0); g.lineTo(2.1 * s, 0); g.moveTo(0.6 * s, -1.6 * s); g.lineTo(2.3 * s, 0); g.lineTo(0.6 * s, 1.6 * s); g.stroke(); g.restore();
}

// ── 영상 장면: 실제 배경 그림 + 벡터 소품. g 는 논리 좌표(배율 적용), W·H 는 미리보기 크기 ──
const IMC = {};
function ldImg(name) { if (IMC[name]) return IMC[name]; const r = { ok: false, fail: false, im: new Image(), bl: null }; r.im.onload = () => (r.ok = true); r.im.onerror = () => (r.fail = true); r.im.src = "img/bg/" + name + ".webp"; return (IMC[name] = r); }
function blurOf(r) { if (r.bl) return r.bl; const c = document.createElement("canvas"); c.width = 480; c.height = 320; const g = c.getContext("2d"); try { g.filter = "blur(2.4px)"; } catch (e) {} g.drawImage(r.im, -10, -10, 500, 340); return (r.bl = c); }
function cover(g, src, W, H, fx = 0.5, z = 1, oy = 0, dx = 0) {
  const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height; if (!iw) return;
  const s = Math.max(W / iw, H / ih) * z, sw = W / s, sh = H / s;
  const sx = clamp(fx * iw - sw / 2 + dx * iw, 0, iw - sw), sy = clamp((ih - sh) / 2 + oy * ih, 0, ih - sh);
  g.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
}
// 장면마다: 배경 그림 이름, 가로 초점, 흐림
const SBG = { beach: ["airbnb", 0.4, 0], ramen: ["dinner", 0.36, 1], cake: ["cafe", 0.44, 1], run: ["street", 0.42, 0], gym: ["gym", 0.6, 0], city: ["rooftop", 0.8, 0], me: ["home", 0.74, 1] };
const photo = (g, k, W, H, z = 1, oy = 0, dx = 0) => {
  const [n, fx, bl] = SBG[k], r = ldImg(n);
  if (!r.ok) { g.fillStyle = lg(g, 0, 0, 0, H, [[0, tint(SCOL[k], 0.55)], [1, tint(SCOL[k], 0.25)]]); g.fillRect(0, 0, W, H); return false; }
  cover(g, bl ? blurOf(r) : r.im, W, H, fx, z, oy, dx); return true;
};
const vign = (g, W, H, a = 0.45) => { const q = g.createRadialGradient(W / 2, H * 0.48, H * 0.2, W / 2, H * 0.5, H * 0.72); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = q; g.fillRect(0, 0, W, H); };
const sparkle = (g, x, y, s, a) => { g.save(); g.globalAlpha = a; g.fillStyle = "#fff"; g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill(); g.restore(); };
const SC = {
  // 여행: 숙소 창밖 풍경(그림) + 햇살
  beach(g, t, bp, W, H) {
    photo(g, "beach", W, H, 1.1 + Math.sin(t * 0.35) * 0.04, 0, Math.sin(t * 0.22) * 0.03);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, W * 0.52, H * 0.36, W * 0.75, "#ffd9a0", 0.32 + bp * 0.08); g.restore();
    for (let k = 0; k < 7; k++) { const ph = (t * 0.12 + k * 0.143) % 1, x = W * (0.15 + ((k * 0.37) % 0.7)) + Math.sin(t + k) * 2, y = H * (0.75 - ph * 0.55); sparkle(g, x, y, 0.8 + (k % 3) * 0.3, 0.7 * Math.sin(ph * Math.PI)); }
    vign(g, W, H, 0.35);
  },
  // 비행기 창(벡터)
  plane(g, t, bp, W, H) {
    g.fillStyle = lg(g, 0, 0, W, 0, [[0, "#cfc6b4"], [0.5, "#efe9de"], [1, "#cbc2ae"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(120,100,80,.12)"; for (let y = H * 0.08; y < H; y += H * 0.3) g.fillRect(0, y, W, 0.4);
    const cx = W / 2, cy = H * 0.46, rx = W * 0.34, ry = H * 0.29;
    g.save(); g.shadowColor = "rgba(60,40,20,.35)"; g.shadowBlur = 4; rr(g, cx - rx - 4.5, cy - ry - 4.5, 2 * rx + 9, 2 * ry + 9, rx + 4.5);
    g.fillStyle = lg(g, 0, cy - ry, 0, cy + ry, [[0, "#fbf8f2"], [1, "#d6cdbb"]]); g.fill(); g.restore();
    rr(g, cx - rx - 1.2, cy - ry - 1.2, 2 * rx + 2.4, 2 * ry + 2.4, rx + 1.2); g.fillStyle = "#b9ae98"; g.fill();
    g.save(); rr(g, cx - rx, cy - ry, 2 * rx, 2 * ry, rx); g.clip();
    g.fillStyle = lg(g, 0, cy - ry, 0, cy + ry, [[0, "#2b6fd6"], [0.55, "#8cc4ff"], [1, "#ffe9cf"]]); g.fillRect(cx - rx, cy - ry, 2 * rx, 2 * ry);
    glow(g, cx + rx * 0.5, cy + ry * 0.15, rx * 0.9, "#fff2c8", 0.6);
    // 아래 구름 바다
    g.fillStyle = "#fbfdff"; g.beginPath(); g.moveTo(cx - rx, cy + ry);
    for (let x = -rx; x <= rx + 0.5; x += 1) g.lineTo(cx + x, cy + ry * 0.42 + Math.sin((x + t * 9) * 0.32) * 1.4 + Math.sin((x + t * 5) * 0.11) * 1.8);
    g.lineTo(cx + rx, cy + ry); g.fill();
    // 지나가는 구름
    g.fillStyle = "rgba(255,255,255,.95)";
    for (let k = 0; k < 3; k++) { const x = cx + rx + 8 - (((t * (7 + k * 3)) + k * 21) % (2 * rx + 22)), y = cy - ry * 0.25 + k * ry * 0.28, s = 2.2 + k * 0.6; g.beginPath(); g.ellipse(x, y, s * 2.2, s, 0, 0, 6.29); g.ellipse(x - s * 1.4, y + s * 0.3, s * 1.3, s * 0.75, 0, 0, 6.29); g.ellipse(x + s * 0.8, y - s * 0.5, s * 1.2, s * 0.9, 0, 0, 6.29); g.fill(); }
    // 날개
    g.fillStyle = lg(g, cx, cy + ry * 0.15, cx + rx, cy + ry * 0.6, [[0, "#e8ecf4"], [1, "#9aa3b6"]]);
    g.beginPath(); g.moveTo(cx - rx * 0.15, cy + ry * 0.62); g.lineTo(cx + rx * 1.1, cy + ry * 0.08); g.lineTo(cx + rx * 1.1, cy + ry * 0.24); g.lineTo(cx + rx * 0.1, cy + ry * 0.8); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(cx - rx * 0.1, cy + ry * 0.6, rx * 1.1, 0.35);
    if (Math.floor(t * 2) % 2) glow(g, cx + rx * 0.92, cy + ry * 0.14, 2.2, "#ff3b3b", 1);
    // 창 가리개
    g.fillStyle = lg(g, 0, cy - ry, 0, cy - ry * 0.55, [[0, "#ece6da"], [1, "#d9d1c2"]]); g.fillRect(cx - rx, cy - ry, 2 * rx, ry * 0.42);
    g.fillStyle = "#b9ae98"; rr(g, cx - 3, cy - ry * 0.6 - 1.2, 6, 1.4, 0.7); g.fill();
    g.restore();
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.5; rr(g, cx - rx + 1, cy - ry + 1, 2 * rx - 2, 2 * ry - 2, rx - 1); g.stroke();
    // 아래 좌석 머리 받침
    g.fillStyle = lg(g, 0, H - 16, 0, H, [[0, "#3d4a6a"], [1, "#222a40"]]); rr(g, -4, H - 14, W * 0.55, 20, 6); g.fill();
    g.fillStyle = "#e8e2d4"; rr(g, 2, H - 12.5, W * 0.4, 4, 1.5); g.fill();
  },
  // 라멘: 식당 그림(흐림) + 벡터 그릇
  ramen(g, t, bp, W, H) {
    photo(g, "ramen", W, H, 1.05); g.fillStyle = "rgba(30,14,4,.28)"; g.fillRect(0, 0, W, H);
    g.fillStyle = lg(g, 0, H * 0.55, 0, H, [[0, "rgba(60,30,14,0)"], [0.35, "#5a3520"], [1, "#3a2012"]]); g.fillRect(0, H * 0.55, W, H * 0.45);
    const cx = W / 2, cy = H * 0.66, R = W * 0.43, bob = Math.sin(t * 3) * 1.4 - (bp < 0.15 ? 1.2 : 0);
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(cx + 1.5, cy + R * 0.62, R * 0.86, R * 0.22, 0, 0, 6.29); g.fill();
    // 그릇 몸통
    g.fillStyle = lg(g, cx - R, 0, cx + R, 0, [[0, "#3a0f12"], [0.35, "#b3262c"], [0.6, "#8e1b22"], [1, "#2a0a0c"]]);
    g.beginPath(); g.moveTo(cx - R, cy); g.bezierCurveTo(cx - R, cy + R * 0.55, cx - R * 0.55, cy + R * 0.72, cx, cy + R * 0.72); g.bezierCurveTo(cx + R * 0.55, cy + R * 0.72, cx + R, cy + R * 0.55, cx + R, cy); g.fill();
    g.strokeStyle = "rgba(255,230,200,.7)"; g.lineWidth = 0.45; g.beginPath(); for (let a = 0.15; a < 3; a += 0.36) { const x = cx - R * Math.cos(a) * 0.86; g.moveTo(x, cy + R * 0.2 + Math.sin(a) * R * 0.25); g.lineTo(x + 1.6, cy + R * 0.32 + Math.sin(a) * R * 0.25); } g.stroke();
    // 테두리 + 국물
    g.fillStyle = "#f4ede2"; g.beginPath(); g.ellipse(cx, cy, R, R * 0.4, 0, 0, 6.29); g.fill();
    const q = g.createRadialGradient(cx - R * 0.2, cy - R * 0.08, 1, cx, cy, R * 0.92); q.addColorStop(0, "#f6b860"); q.addColorStop(0.7, "#d9822f"); q.addColorStop(1, "#a85a1c");
    g.fillStyle = q; g.beginPath(); g.ellipse(cx, cy + 0.4, R * 0.9, R * 0.34, 0, 0, 6.29); g.fill();
    g.save(); g.beginPath(); g.ellipse(cx, cy + 0.4, R * 0.9, R * 0.34, 0, 0, 6.29); g.clip();
    g.strokeStyle = "#ffe08a"; g.lineWidth = 0.75; g.lineCap = "round";
    for (let k = 0; k < 9; k++) { g.beginPath(); const y0 = cy - R * 0.26 + k * R * 0.07; for (let x = -R; x <= R * 0.2; x += 1) g.lineTo(cx + x, y0 + Math.sin(x * 0.55 + k * 1.3) * 0.9); g.stroke(); }
    g.restore();
    // 차슈·달걀·김·파
    for (const [dx, dy] of [[0.36, -0.08], [0.5, 0.1]]) { const x = cx + R * dx, y = cy + R * dy; g.fillStyle = "#b8604c"; g.beginPath(); g.ellipse(x, y, R * 0.2, R * 0.11, -0.2, 0, 6.29); g.fill(); g.fillStyle = "#f0b4a0"; g.beginPath(); g.ellipse(x, y - 0.2, R * 0.15, R * 0.075, -0.2, 0, 6.29); g.fill(); g.strokeStyle = "#d88a74"; g.lineWidth = 0.35; g.beginPath(); g.ellipse(x, y - 0.2, R * 0.08, R * 0.04, -0.2, 0, 6.29); g.stroke(); }
    for (const [dx, dy] of [[-0.42, 0.08], [-0.22, 0.17]]) { const x = cx + R * dx, y = cy + R * dy; g.fillStyle = "#fffdf6"; g.beginPath(); g.ellipse(x, y, R * 0.14, R * 0.09, 0.15, 0, 6.29); g.fill(); const yq = g.createRadialGradient(x - 0.5, y - 0.5, 0.2, x, y, R * 0.08); yq.addColorStop(0, "#ffd27a"); yq.addColorStop(1, "#f08a10"); g.fillStyle = yq; g.beginPath(); g.ellipse(x, y, R * 0.085, R * 0.055, 0.15, 0, 6.29); g.fill(); }
    g.fillStyle = lg(g, 0, cy - R * 0.5, 0, cy, [[0, "#1d3424"], [1, "#0d1a12"]]); g.save(); g.translate(cx - R * 0.55, cy - R * 0.22); g.rotate(-0.25); rr(g, -R * 0.12, -R * 0.38, R * 0.24, R * 0.42, 0.6); g.fill(); g.restore();
    for (let i = 0; i < 12; i++) { const a = i * 2.4, x = cx + Math.cos(a) * R * (0.1 + (i % 4) * 0.07) - R * 0.05, y = cy + Math.sin(a) * R * 0.1; g.fillStyle = i % 2 ? "#6cc65a" : "#a8e888"; g.beginPath(); g.ellipse(x, y, 0.9, 0.6, 0, 0, 6.29); g.fill(); g.fillStyle = "#e8ffd8"; g.beginPath(); g.ellipse(x, y, 0.35, 0.25, 0, 0, 6.29); g.fill(); }
    // 젓가락으로 면 들기
    const ty = cy - R * 0.62 + bob;
    g.strokeStyle = "#f2cf6a"; g.lineWidth = 0.7;
    for (let k = 0; k < 6; k++) { g.beginPath(); const x0 = cx + R * 0.05 + k * 0.9; g.moveTo(x0, ty + 1); g.bezierCurveTo(x0 + Math.sin(t * 2 + k) * 1.2, ty + R * 0.25, x0 - 1, ty + R * 0.42, x0 - 0.5 + Math.sin(k) * 1.5, cy - R * 0.05); g.stroke(); }
    g.strokeStyle = "#7a4a26"; g.lineWidth = 1.2; g.lineCap = "round";
    g.beginPath(); g.moveTo(W + 2, ty - R * 0.75); g.lineTo(cx + R * 0.02, ty + 0.5); g.moveTo(W + 4, ty - R * 0.55); g.lineTo(cx + R * 0.08, ty + 1.8); g.stroke();
    g.strokeStyle = "rgba(255,230,190,.5)"; g.lineWidth = 0.35; g.beginPath(); g.moveTo(W + 2, ty - R * 0.75 - 0.4); g.lineTo(cx + R * 0.02, ty + 0.1); g.stroke();
    // 김
    for (let k = 0; k < 3; k++) { const ph = (t * 0.55 + k * 0.33) % 1; g.strokeStyle = `rgba(255,255,255,${0.5 * Math.sin(ph * Math.PI)})`; g.lineWidth = 1.6 - ph; g.beginPath(); const x = cx - R * 0.45 + k * R * 0.38; for (let s = 0; s < 1; s += 0.1) g.lineTo(x + Math.sin(s * 6 + t * 2 + k) * 2.2, cy - R * 0.3 - (ph * 0.7 + s * 0.3) * H * 0.42); g.stroke(); }
    vign(g, W, H, 0.4);
  },
  // 케이크: 카페 그림(흐림) + 벡터 케이크
  cake(g, t, bp, W, H) {
    photo(g, "cake", W, H, 1.05); g.fillStyle = "rgba(255,210,225,.14)"; g.fillRect(0, 0, W, H);
    const cx = W / 2, top = H * 0.48, cw = W * 0.6, ch = H * 0.22, ey = cw * 0.18;
    g.fillStyle = "rgba(60,30,30,.3)"; g.beginPath(); g.ellipse(cx + 1, top + ch + ey + 2, cw * 0.66, ey * 0.75, 0, 0, 6.29); g.fill();
    g.fillStyle = lg(g, 0, top + ch, 0, top + ch + ey * 1.6, [[0, "#ffffff"], [1, "#d8d4dc"]]); g.beginPath(); g.ellipse(cx, top + ch + ey * 0.6, cw * 0.66, ey * 0.95, 0, 0, 6.29); g.fill();
    // 몸통(층)
    g.fillStyle = lg(g, cx - cw / 2, 0, cx + cw / 2, 0, [[0, "#f2e4d4"], [0.4, "#fffaf2"], [1, "#e6d2bc"]]);
    g.beginPath(); g.moveTo(cx - cw / 2, top); g.lineTo(cx - cw / 2, top + ch); g.ellipse(cx, top + ch, cw / 2, ey, 0, Math.PI, 0, true); g.lineTo(cx + cw / 2, top); g.fill();
    for (const f of [0.36, 0.68]) { g.fillStyle = "#ff6f86"; g.beginPath(); g.ellipse(cx, top + ch * f, cw / 2, ey, 0, 0, Math.PI); g.lineTo(cx - cw / 2, top + ch * f - 1.2); g.ellipse(cx, top + ch * f - 1.2, cw / 2, ey, 0, Math.PI, 0, true); g.fill(); }
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(cx, top, cw / 2, ey, 0, 0, 6.29); g.fill();
    g.fillStyle = "#fff"; for (let k = 0; k < 9; k++) { const a = Math.PI * (k / 8), x = cx - Math.cos(a) * cw * 0.47, y = top + Math.sin(a) * ey * 0.95; g.beginPath(); g.arc(x, y, 1.6, 0, 6.29); g.fill(); g.beginPath(); g.moveTo(x - 1.4, y + 0.6); g.quadraticCurveTo(x, y + 3.4, x + 1.4, y + 0.6); g.fill(); }
    for (const [dx, dy] of [[-0.28, -0.15], [0.02, -0.4], [0.3, -0.1], [-0.05, 0.25]]) { const x = cx + dx * cw, y = top + dy * ey; g.fillStyle = lg(g, x, y - 2.2, x, y + 2, [[0, "#ff5a6a"], [1, "#c4182e"]]); heartP(g, x, y - 0.2, 2.1); g.fill(); g.fillStyle = "#3e9e4a"; g.beginPath(); g.ellipse(x, y - 2.3, 1.2, 0.5, 0, 0, 6.29); g.fill(); g.fillStyle = "#ffe8a0"; g.fillRect(x - 0.6, y - 0.6, 0.35, 0.35); g.fillRect(x + 0.5, y + 0.2, 0.35, 0.35); }
    // 초
    const kx = cx, ky = top - ey * 0.2;
    g.save(); rr(g, kx - 0.9, ky - 11, 1.8, 11, 0.5); g.clip(); g.fillStyle = "#fff"; g.fillRect(kx - 1, ky - 11, 2, 11); g.strokeStyle = "#6fb8ff"; g.lineWidth = 0.7; for (let y = -12; y < 2; y += 2.2) { g.beginPath(); g.moveTo(kx - 1, ky + y); g.lineTo(kx + 1, ky + y - 1.4); g.stroke(); } g.restore();
    const fl = Math.sin(t * 17) * 0.25 + 1, fy = ky - 12.5;
    glow(g, kx, fy, 9 + bp * 3, "#ffd98a", 0.55);
    g.fillStyle = lg(g, kx, fy - 3.5 * fl, kx, fy + 1.5, [[0, "#fff6d0"], [0.5, "#ffc24a"], [1, "#ff7a1a"]]);
    g.beginPath(); g.moveTo(kx, fy - 3.6 * fl); g.quadraticCurveTo(kx + 1.6, fy - 0.5, kx, fy + 1.4); g.quadraticCurveTo(kx - 1.6, fy - 0.5, kx, fy - 3.6 * fl); g.fill();
    for (let k = 0; k < 6; k++) { const ph = (t * 0.6 + k / 6) % 1; sparkle(g, W * ((k * 0.29 + 0.1) % 1), H * (0.08 + ((k * 0.37) % 0.4)), 1 + (k % 2) * 0.5, Math.sin(ph * Math.PI) * 0.9); }
    vign(g, W, H, 0.3);
  },
  // 러닝: 저녁 거리 그림 + 달리는 시점 흔들림·속도선
  run(g, t, bp, W, H) {
    const f = Math.floor(t * 8) % 2, z = 1.12 + ((t * 0.12) % 1) * 0.08;
    photo(g, "run", W, H, z, -0.03 + (f ? 0.006 : 0), Math.sin(t * 4) * 0.006);
    g.save(); g.globalCompositeOperation = "lighter";
    for (let k = 0; k < 14; k++) { const a = k * 2.399 + 0.3, ph = (t * 1.6 + k * 0.17) % 1, r0 = 8 + ph * H * 0.7, cx = W * 0.5, cy = H * 0.5; g.strokeStyle = `rgba(255,236,210,${0.4 * ph})`; g.lineWidth = 0.4 + ph * 0.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (r0 + 5 + ph * 9), cy + Math.sin(a) * (r0 + 5 + ph * 9)); g.stroke(); }
    g.restore();
    vign(g, W, H, 0.5);
    // 손목 러닝 시계
    g.fillStyle = "rgba(10,12,24,.72)"; rr(g, 3, 5, 22, 8, 3); g.fill();
    g.fillStyle = "#7CFC9A"; g.font = "800 4.6px sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("5.2km", 5, 9.2);
  },
  // 헬스: 헬스장 그림 + 박자에 들어 올리는 덤벨(벡터)
  gym(g, t, bp, W, H) {
    photo(g, "gym", W, H, 1.06);
    g.fillStyle = "rgba(20,24,44,.18)"; g.fillRect(0, 0, W, H);
    const up = 1 - Math.min(1, bp * 1.6), lift = Math.sin(up * Math.PI / 2) * H * 0.2, hx = W * 0.52, hy = H * 0.62 - lift;
    // 팔
    g.fillStyle = lg(g, hx - 5, 0, hx + 6, 0, [[0, "#c98a62"], [0.45, "#f0c29c"], [1, "#b8774e"]]);
    g.beginPath(); g.moveTo(hx - 4.5, H + 2); g.bezierCurveTo(hx - 6, hy + 20, hx - 4.6, hy + 8, hx - 3.6, hy + 3); g.lineTo(hx + 4.4, hy + 3); g.bezierCurveTo(hx + 5.6, hy + 9, hx + 7, hy + 20, hx + 6, H + 2); g.fill();
    // 덤벨
    g.fillStyle = lg(g, 0, hy - 1.2, 0, hy + 1.2, [[0, "#f4f6fb"], [0.5, "#9aa2b4"], [1, "#5c6476"]]); rr(g, hx - W * 0.36, hy - 1.1, W * 0.72, 2.2, 1); g.fill();
    for (const s of [-1, 1]) {
      const px = hx + s * W * 0.3;
      for (let k = 0; k < 2; k++) { const x = px + s * k * 4.4 - 2; g.fillStyle = lg(g, x, 0, x + 4, 0, [[0, "#1a1624"], [0.4, "#3e3850"], [1, "#120e18"]]); rr(g, x, hy - 11 + k * 1.8, 4, 22 - k * 3.6, 1.5); g.fill(); g.fillStyle = "#e04848"; g.fillRect(x + 0.5, hy - 10.2 + k * 1.8, 0.6, 20.4 - k * 3.6); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x + 1.6, hy - 10 + k * 1.8, 0.4, 20 - k * 3.6); }
    }
    g.fillStyle = lg(g, 0, hy - 3, 0, hy + 4, [[0, "#f6cfaa"], [1, "#c98a62"]]); rr(g, hx - 4.6, hy - 2.6, 9.2, 6, 2.6); g.fill();
    g.strokeStyle = "rgba(150,90,60,.6)"; g.lineWidth = 0.35; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(hx - 4.6 + k * 2.3, hy - 2.4); g.lineTo(hx - 4.6 + k * 2.3, hy + 1.2); g.stroke(); }
    if (lift > H * 0.14) for (const s of [-1, 1]) { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 0.5; g.beginPath(); g.arc(hx + s * W * 0.36, hy, 6, s < 0 ? 2.4 : -0.7, s < 0 ? 3.9 : 0.8); g.stroke(); }
    if (bp < 0.3) { g.fillStyle = "#9fd8ff"; g.beginPath(); g.moveTo(hx + 9, hy - 9); g.quadraticCurveTo(hx + 10.6, hy - 6, hx + 9, hy - 5.2); g.quadraticCurveTo(hx + 7.4, hy - 6, hx + 9, hy - 9); g.fill(); }
    vign(g, W, H, 0.4);
  },
  // 야경: 루프톱 그림 + 반짝이는 불빛
  city(g, t, bp, W, H) {
    photo(g, "city", W, H, 1.12 + Math.sin(t * 0.3) * 0.03);
    g.save(); g.globalCompositeOperation = "lighter";
    const BK = ["#ffd56a", "#ff7eb6", "#9fe0ff", "#ffb070"];
    for (let k = 0; k < 9; k++) { const x = W * ((k * 0.41 + 0.07) % 1), y = H * (0.3 + ((k * 0.23) % 0.35)), a = 0.25 + 0.25 * Math.sin(t * 2 + k * 1.7) + (bp < 0.15 ? 0.15 : 0); glow(g, x, y, 3 + (k % 3) * 1.6, BK[k % 4], a); }
    g.restore();
    for (let k = 0; k < 8; k++) { const ph = (t * 0.5 + k * 0.125) % 1; sparkle(g, W * ((k * 0.31 + 0.12) % 1), H * (0.05 + ((k * 0.17) % 0.22)), 0.8 + (k % 2) * 0.4, Math.sin(ph * Math.PI) * 0.8); }
    vign(g, W, H, 0.35);
  },
  // 내 얼굴: 방 그림(흐림) + 링 조명. 사람은 캐릭터 그림(DOM)으로 위에 얹는다
  me(g, t, bp, W, H, art) {
    photo(g, "me", W, H, 1.08); g.fillStyle = "rgba(255,190,220,.16)"; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, W / 2, H * 0.34, W * 0.7, "#fff0f6", 0.28 + (bp < 0.15 ? 0.1 : 0)); g.restore();
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.2; g.beginPath(); g.arc(W / 2, H * 0.3, W * 0.48, 0, 6.29); g.stroke();
    for (const [x, y] of [[4, 8], [W - 6, 16], [6, H * 0.5], [W - 5, H * 0.62]]) sparkle(g, x, y, 1.3, 0.5 + 0.4 * Math.sin(t * 3 + x));
    if (!art) {
      const cx = W / 2, hy = H * 0.42;
      g.fillStyle = "#fff"; rr(g, cx - 15, hy + 13, 30, H, 10); g.fill();
      g.fillStyle = "#2a1e24"; g.beginPath(); g.ellipse(cx, hy, 10.5, 12, 0, 0, 6.29); g.fill();
      g.fillStyle = "#f5d0b0"; g.beginPath(); g.ellipse(cx, hy + 2.5, 8, 9, 0, 0, 6.29); g.fill();
      g.fillStyle = "#2a1e2e"; g.beginPath(); g.arc(cx - 3.2, hy + 2.5, 0.9, 0, 6.29); g.arc(cx + 3.2, hy + 2.5, 0.9, 0, 6.29); g.fill();
      g.strokeStyle = "#c04a5a"; g.lineWidth = 0.6; g.beginPath(); g.arc(cx, hy + 5.4, 2, 0.3, 2.8); g.stroke();
    }
  },
};

// 방법 화면 그림 3장(벡터)
function stepPics() {
  const hand = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${HAND.replace(/id="k"/, 'id="kk"').replace(/url\(#k\)/, "url(#kk)")}</g>`;
  const box = (inner) => svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#1c1838"/>${inner}</svg>`);
  const sc = `<g stroke="#fff" stroke-linecap="round" fill="none"><path d="M-3-5l5.5 7.5M3-5l-5.5 7.5" stroke-width="1.6"/><circle cx="-2.8" cy="3.6" r="1.6" stroke-width="1.3"/><circle cx="2.8" cy="3.6" r="1.6" stroke-width="1.3"/></g>`;
  const a = box(`<rect x="6" y="10" width="68" height="22" rx="5" fill="#2a2648"/><rect x="6" y="10" width="22" height="22" rx="5" fill="#4fb8f0"/><rect x="8" y="12" width="18" height="6" rx="2" fill="#bfe8ff" opacity=".6"/>
    <circle cx="45" cy="21" r="7" fill="#ff5f9e" stroke="#fff" stroke-width="1.5"/><g transform="translate(45 21) scale(.8)">${sc}</g><circle cx="64" cy="21" r="5.5" fill="#ff5f9e" opacity=".7"/>
    <path d="M28 4v40" stroke="#ff3b5c" stroke-width="2.2"/><path d="M24 3h8l-4 5z" fill="#ff3b5c"/>
    <g fill="#4fd8c8">${Array.from({ length: 16 }, (_, i) => `<rect x="${7 + i * 4.2}" y="${50 - (i % 4 === 0 ? 6 : 2.5)}" width="2.2" height="${i % 4 === 0 ? 12 : 5}" rx="1.1"/>`).join("")}</g>${hand(14, 40, 0.95)}`);
  const b = box(`<rect x="8" y="8" width="30" height="50" rx="5" fill="#f0a050"/><rect x="10" y="10" width="26" height="14" rx="3" fill="#ffd08a"/><rect x="38" y="8" width="30" height="50" rx="5" fill="#4fb8f0"/><rect x="40" y="38" width="26" height="18" rx="3" fill="#f0cf94"/>
    <rect x="22" y="23" width="36" height="18" rx="6" fill="#9a4ae8" stroke="#e8d8ff" stroke-width="1.5"/><path d="M29 32h20m-6-6l6 6-6 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${hand(8, 42, 0.95)}<path d="M38 72h10m6 0h6" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`);
  const c = box(`<rect x="8" y="6" width="64" height="38" rx="6" fill="#ff9ec8"/><rect x="14" y="30" width="52" height="9" rx="4" fill="#000" opacity=".55"/><rect x="18" y="32.5" width="30" height="4" rx="2" fill="#fff"/>
    <rect x="8" y="50" width="64" height="13" rx="4" fill="#201d33"/><rect x="12" y="52" width="46" height="9" rx="3" fill="#ffd166"/><text x="15.5" y="59.6" font-size="8" font-weight="900" fill="#3a2400" font-family="sans-serif">T</text><rect x="56" y="52" width="2" height="9" fill="#c9961c"/>
    <path d="M28 46v22" stroke="#ff3b5c" stroke-width="2.2"/>${hand(14, 54, 0.9)}`);
  return [[`<img src="${a}" alt="">`, "선에 닿을 때 톡"], [`<img src="${b}" alt="">`, "화살표대로 쓱"], [`<img src="${c}" alt="">`, "자막은 꾹… 떼기"]];
}

export const GAME = {
  key: "insta3", base: "insta", n: "이건 칼박 숏폼 각", desc: "퇴근 후 찍은 영상을 음악 박자에 맞춰 잘라 떡상 릴스를 만들어요",
  how: [
    "처음엔 <b>리허설</b>로 한 번씩 해 보고 시작해요. 음악에 맞춰 <b>가위 표시</b>가 흘러와요. <b>빨간 선</b>에 닿는 순간 화면 아무 데나 톡 하면 컷이 바뀌어요.",
    "<b>보라 화살표</b>는 전환 효과! 그 방향으로 <b>쓱 밀어요</b>. <b>노란 자막 막대</b>는 꾹 누르고 있다가 막대 끝에서 떼요.",
    "박자에 딱 맞으면 <b>Perfect</b>, 어긋나면 화면이 튀어요. 다 끝나면 내가 만든 릴스가 재생되고 <b>조회수</b>가 정해져요!",
  ],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "선에 닿을 때 톡"], ["", "화살표대로 쓱"], ["", "자막은 꾹… 떼기"]]; } },
  css: `
.mg-insta3 .rl-st{background:#15122a!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-insta3 .rl-cv{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
.mg-insta3 .rl-cv.rl-fr{z-index:2}
.mg-insta3 .mg-msg{top:auto;bottom:8px;z-index:24}
.mg-insta3 .mg-steps img{width:76px;height:76px;border-radius:12px}
.mg-insta3 .rl-pv{position:absolute;z-index:1;overflow:hidden;pointer-events:none;border-radius:10px}
.mg-insta3 .rl-me{position:absolute;left:0;background-repeat:no-repeat;opacity:0;pointer-events:none;transform-origin:50% 100%}
.mg-insta3 .rl-me.on{opacity:1}
.mg-insta3 .rl-me.gl{animation:rlgl .09s steps(2) infinite}
.mg-insta3 .rl-sub{position:absolute;left:6px;right:6px;bottom:22%;z-index:3;text-align:center;font-weight:900;font-size:14px;line-height:1.25;color:#fff;text-shadow:0 0 3px #000,0 2px 0 #000;opacity:0;word-break:keep-all;transition:opacity .12s}
.mg-insta3 .rl-sub.on{opacity:1}
.mg-insta3 .rl-sub span{background:#000a;padding:2px 7px;border-radius:6px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.mg-insta3 .rl-sub.ok span{background:#ff5f9e;animation:rlpop .3s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-sub.bad span{background:#555a;color:#ddd;font-style:italic}
.mg-insta3 .rl-lb{position:absolute;z-index:3;font-size:11px;font-weight:800;color:#cfc4ff;pointer-events:none;letter-spacing:-.2px;white-space:nowrap;transition:color .2s}
.mg-insta3 .rl-lb.on{color:#fff;text-shadow:0 0 6px #ff5f9e}
.mg-insta3 .rl-lb.tr{background:#0009;border-radius:4px;padding:0 4px;font-size:11px;color:#b8b0e0}
.mg-insta3 .rl-j{position:absolute;left:50%;z-index:6;transform:translate(-50%,-50%);font-weight:900;font-size:22px;white-space:nowrap;pointer-events:none;opacity:0;letter-spacing:.5px}
.mg-insta3 .rl-j.on{animation:rlj .55s ease-out forwards}
.mg-insta3 .rl-j.p{background:linear-gradient(90deg,#ff5f9e,#ffd166,#7CFC9A,#5fb8ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #000c)}
.mg-insta3 .rl-j.g{color:#7fe0ff;text-shadow:0 2px 0 #000c}
.mg-insta3 .rl-j.b{color:#ff9a5a;text-shadow:0 2px 0 #000c;font-size:18px}
.mg-insta3 .rl-j.m{color:#b8b8c8;text-shadow:0 2px 0 #000c;font-size:18px}
.mg-insta3 .rl-cb{position:absolute;left:50%;z-index:6;transform:translateX(-50%);font-weight:900;font-size:12px;color:#ffd166;text-shadow:0 1px 0 #000;pointer-events:none;opacity:0;white-space:nowrap}
.mg-insta3 .rl-cb.on{opacity:1}.mg-insta3 .rl-cb.bump{animation:rlpop .25s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-ban{position:absolute;left:50%;z-index:7;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:25px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #b06cff,0 0 14px #b06cff}
.mg-insta3 .rl-ban small{display:block;font-size:12px;font-weight:800;text-shadow:0 1px 2px #000}
.mg-insta3 .rl-ban.on{animation:rlban 1.6s ease-out forwards}
.mg-insta3 .rl-hint{position:absolute;left:0;right:0;z-index:5;text-align:center;font-size:12.5px;font-weight:700;color:#e8e0ff;pointer-events:none;opacity:0;transition:opacity .2s}
.mg-insta3 .rl-hint.on{opacity:1}
.mg-insta3 .rl-hint b{display:inline-block;background:#ff5f9e;color:#fff;border-radius:7px;padding:1px 8px;margin-right:5px;font-weight:900}
.mg-insta3 .rl-hint.s b{background:#b06cff}.mg-insta3 .rl-hint.h b{background:#ffd166;color:#3a2400}
.mg-insta3 .rl-hand{position:absolute;z-index:21;width:39px;height:39px;margin:-4px 0 0 -14px;background-size:100% 100%;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px #0009)}
.mg-insta3 .rl-hand.on{display:block}
.mg-insta3 .rl-hand.tap{animation:rltap .625s infinite}
.mg-insta3 .rl-hand.sw-r{animation:rlswr 1s infinite}.mg-insta3 .rl-hand.sw-l{animation:rlswl 1s infinite}
.mg-insta3 .rl-hand.sw-u{animation:rlswu 1s infinite}.mg-insta3 .rl-hand.sw-d{animation:rlswd 1s infinite}
.mg-insta3 .rl-hand.hold{animation:rlhold 1.25s infinite}
.mg-insta3 .rl-tut{position:absolute;left:10px;right:10px;z-index:20;display:flex;justify-content:center;pointer-events:none;transition:opacity .3s}
.mg-insta3 .rl-tut.off{opacity:0;visibility:hidden}
.mg-insta3 .rl-tc{background:#fffdf8;color:#2a1e2e;border-radius:14px;padding:9px 12px 8px;box-shadow:0 4px 0 #0006,0 0 0 2px #b06cff;max-width:300px;font-size:13px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all}
.mg-insta3 .rl-tut.pop .rl-tc{animation:rlpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-tc em{font-style:normal;display:inline-block;background:#b06cff;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:4px}
.mg-insta3 .rl-tc p{margin:0}
.mg-insta3 .rl-tc b.pk{color:#e0307a}.mg-insta3 .rl-tc b.pu{color:#8a3ad8}.mg-insta3 .rl-tc b.gd{color:#a87000}.mg-insta3 .rl-tc b.rd{color:#d0283c}
.mg-insta3 .rl-tc .rl-dots{display:inline-flex;gap:4px;margin-top:4px}.mg-insta3 .rl-tc .rl-dots i{width:9px;height:9px;border-radius:50%;background:#ddd;display:block}.mg-insta3 .rl-tc .rl-dots i.on{background:#7CFC9A;box-shadow:0 0 0 1px #1f9a4a}
.mg-insta3 .rl-tb{margin-top:6px;display:flex;justify-content:center}
.mg-insta3 .rl-skip{pointer-events:auto;background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-insta3 .rl-go{pointer-events:auto;background:linear-gradient(#c88cff,#8a3ad8)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 24px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #4a1a80!important;animation:rlpulse .5s infinite alternate}
.mg-insta3 .rl-up{position:absolute;left:14px;right:14px;z-index:8;display:none;flex-direction:column;align-items:center;gap:6px;color:#fff;font-weight:800;font-size:13px;pointer-events:none}
.mg-insta3 .rl-up.on{display:flex;animation:rlfade .3s}
.mg-insta3 .rl-up i{display:block;width:80%;height:8px;border-radius:5px;background:#ffffff22;overflow:hidden}
.mg-insta3 .rl-up i em{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,#ff5f9e,#ffd166)}
.mg-insta3 .rl-vw{position:absolute;left:0;right:0;z-index:8;display:none;flex-direction:column;align-items:center;pointer-events:none}
.mg-insta3 .rl-vw.on{display:flex}
.mg-insta3 .rl-vw span{font-size:11.5px;color:#d8c8ee;font-weight:700}
.mg-insta3 .rl-vw b{font-size:30px;font-weight:900;color:#fff;line-height:1.1;text-shadow:0 3px 0 #000a;transition:color .3s}
.mg-insta3 .rl-vw.boom b{color:#ffd166;animation:rlboom .7s cubic-bezier(.3,1.8,.5,1)}
.mg-insta3 .rl-vw small{font-size:13px;font-weight:900;color:#ff7eb6;min-height:16px}
.mg-insta3 .rl-cm{position:absolute;left:10px;right:10px;z-index:9;display:flex;flex-direction:column;align-items:flex-start;gap:4px;pointer-events:none}
.mg-insta3 .rl-cm div{background:#ffffff1c;color:#fff;font-size:12px;padding:4px 9px;border-radius:11px;animation:rlcm .35s cubic-bezier(.3,1.6,.5,1)}
.mg-insta3 .rl-cm div b{color:#ffc6e0;margin-right:5px;font-size:11px}
@keyframes rlgl{0%{transform:translate(-3px,0);filter:hue-rotate(90deg) saturate(2)}100%{transform:translate(3px,1px);filter:hue-rotate(-60deg)}}
@keyframes rlj{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}35%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-90%) scale(1)}}
@keyframes rlban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(1deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
@keyframes rlpop{0%{transform:scale(.4)}100%{transform:scale(1)}}
@keyframes rlpulse{to{transform:scale(1.07)}}
@keyframes rlfade{from{opacity:0}}
@keyframes rlboom{0%{transform:scale(.6)}60%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes rlcm{from{opacity:0;transform:translateY(10px) scale(.8)}}
@keyframes rltap{0%,100%{transform:translate(5px,10px)}35%,55%{transform:translate(0,0) scale(.88)}}
@keyframes rlswr{0%{transform:translate(-14px,0);opacity:0}15%{opacity:1}70%{transform:translate(44px,0);opacity:1}100%{transform:translate(50px,0);opacity:0}}
@keyframes rlswl{0%{transform:translate(14px,0);opacity:0}15%{opacity:1}70%{transform:translate(-44px,0);opacity:1}100%{transform:translate(-50px,0);opacity:0}}
@keyframes rlswu{0%{transform:translate(0,14px);opacity:0}15%{opacity:1}70%{transform:translate(0,-36px);opacity:1}100%{transform:translate(0,-40px);opacity:0}}
@keyframes rlswd{0%{transform:translate(0,-14px);opacity:0}15%{opacity:1}70%{transform:translate(0,30px);opacity:1}100%{transform:translate(0,34px);opacity:0}}
@keyframes rlhold{0%{transform:translate(4px,10px)}20%,85%{transform:translate(0,0) scale(.86)}100%{transform:translate(4px,10px)}}
@media (prefers-reduced-motion:reduce){.mg-insta3 .rl-ban.on,.mg-insta3 .rl-j.on{animation-duration:.01s}.mg-insta3 .rl-me.gl{animation:none}.mg-insta3 .rl-go{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "insta3", "이건 칼박 숏폼 각", "rl-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="rl-cv"></canvas><div class="rl-pv"><div class="rl-me"></div><div class="rl-sub"></div></div><canvas class="rl-cv rl-fr"></canvas>
      <div class="rl-j"></div><div class="rl-cb"></div><div class="rl-ban"></div><div class="rl-hint"></div>
      <div class="rl-up"><span>릴스 내보내는 중…</span><i><em></em></i></div>
      <div class="rl-vw"><span>조회수</span><b>0</b><small></small></div><div class="rl-cm"></div>
      <div class="rl-tut off"><div class="rl-tc"><em>리허설</em><p></p><div class="rl-tb"></div></div></div><div class="rl-hand"></div>`);
    const st = F.stage, $ = (s) => st.querySelector(s);
    const cvB = st.querySelector(".rl-cv"), gB = cvB.getContext("2d"), cvF = $(".rl-fr"), gF = cvF.getContext("2d");
    const pvEl = $(".rl-pv"), meEl = $(".rl-me"), subEl = $(".rl-sub"), jEl = $(".rl-j"), cbEl = $(".rl-cb"), banEl = $(".rl-ban"), hintEl = $(".rl-hint");
    const upEl = $(".rl-up"), vwEl = $(".rl-vw"), cmEl = $(".rl-cm"), tutEl = $(".rl-tut"), tutP = $(".rl-tc p"), tutB = $(".rl-tb"), hand = $(".rl-hand");
    // ── 크기: 논리 폭 110~120칸을 정수배로 ──
    const sw = st.clientWidth || 336, sh = st.clientHeight || 560;
    const K = Math.max(2, Math.round(sw / 118)), LW = Math.ceil(sw / K), LH = Math.ceil(sh / K);
    // 캔버스는 기기 해상도(논리 1칸 = K*DPR 픽셀)로 그리고, 좌표는 논리 칸 그대로 쓴다
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), R = K * DPR;
    for (const c of [cvB, cvF]) { c.width = Math.round(LW * R); c.height = Math.round(LH * R); c.style.width = LW * K + "px"; c.style.height = LH * K + "px"; c.getContext("2d").setTransform(R, 0, 0, R, 0, 0); }
    // 장면 그림 미리 불러오기
    for (const k in SBG) ldImg(SBG[k][0]);
    const PH = clamp(Math.round(LH * 0.56), 84, 112), PW = Math.round(PH * 9 / 16), PX = Math.round((LW - PW) / 2), PY = 4;
    const tlY = PY + PH + 6, vY = tlY + 6, tY = vY + 17, aY = tY + 11, tlB = aY + 11, playX = 28, PPS = 44;
    const RX = PX + PW + 3, RWc = LW - RX - 2;
    Object.assign(pvEl.style, { left: PX * K + "px", top: PY * K + "px", width: PW * K + "px", height: PH * K + "px" });
    jEl.style.top = (PY + PH * 0.44) * K + "px"; cbEl.style.top = (PY + PH * 0.44 + 9) * K + "px"; banEl.style.top = (PY + PH * 0.3) * K + "px";
    hintEl.style.top = (tlB + 3) * K + "px"; tutEl.style.top = (PY + 6) * K + "px";
    upEl.style.top = (tlY + 8) * K + "px"; vwEl.style.top = (tlY - 2) * K + "px"; cmEl.style.top = (tlY + 26) * K + "px";
    // 글자 이름표(도구·트랙)
    const TOOLS = [["c", "컷"], ["s", "전환"], ["h", "자막"]], toolY = (i) => PY + 6 + i * Math.round((PH - 26) / 2.6);
    const toolLb = TOOLS.map(([k, n], i) => { const e = document.createElement("div"); e.className = "rl-lb"; e.textContent = n; e.style.left = "0px"; e.style.width = (PX - 2) * K + "px"; e.style.textAlign = "center"; e.style.top = (toolY(i) + 19) * K + "px"; st.appendChild(e); return e; });
    { const e = document.createElement("div"); e.className = "rl-lb"; e.textContent = "편집력"; e.style.left = RX * K - 4 + "px"; e.style.width = RWc * K + 8 + "px"; e.style.textAlign = "center"; e.style.top = (PY + 17) * K + "px"; st.appendChild(e); }
    const trLb = [["영상", vY + 1], ["자막", tY], ["음악", aY + 1]].map(([n, y]) => { const e = document.createElement("div"); e.className = "rl-lb tr"; e.textContent = n; e.style.left = "3px"; e.style.top = y * K + "px"; st.appendChild(e); return e; });

    // 내 캐릭터 그림(3x2 표정 시트, 칸 240x540). 미리보기 안에서 얼굴~허리를 셀카처럼 자른다
    const AV = typeof opts.avatar === "string" && /^p[FM][0-9]$/.test(opts.avatar) ? opts.avatar : "p" + (opts.gender === "M" ? "M" : "F") + "1";
    let art = false;
    const CW = PW * K, CH = PH * K, sA = CW / 200, meTop = Math.round(CH * 0.2);
    Object.assign(meEl.style, { width: CW + "px", height: CH - meTop + "px", top: meTop + "px", backgroundSize: `${720 * sA}px ${1080 * sA}px` });
    { const im = new Image(); im.onload = () => { art = true; meEl.style.backgroundImage = `url("${im.src}")`; }; im.onerror = () => { if (!/pF1\.webp$/.test(im.src)) im.src = "img/body/pF1.webp"; }; im.src = "img/body/" + AV + ".webp"; }
    const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
    let meX = "", meTf = "";
    const setFace = (ex) => { if (ex === meX) return; meX = ex; const i = EXI[ex]; meEl.style.backgroundPosition = `${-((i % 3) * 240 + 20) * sA}px ${-((i >= 3 ? 540 : 0) + 14) * sA}px`; };
    setFace("smile");

    // ── 배경(한 번만): 편집기 바탕, 폰 테두리, 타임라인 판 ──
    const hiC = (w, h) => { const c = document.createElement("canvas"); c.width = Math.round(w * R); c.height = Math.round(h * R); const x = c.getContext("2d"); x.setTransform(R, 0, 0, R, 0, 0); return [c, x]; };
    const [BG, bgx] = hiC(LW, LH), mX = RX + RWc / 2;
    {
      const b = bgx;
      b.fillStyle = lg(b, 0, 0, 0, LH, [[0, "#211b44"], [0.55, "#16122e"], [1, "#0e0b1e"]]); b.fillRect(0, 0, LW, LH);
      glow(b, PX + PW / 2, PY + PH * 0.45, PW * 1.1, "#b06cff", 0.18);
      b.fillStyle = "rgba(255,255,255,.05)"; for (let y = 3; y < tlY - 2; y += 6) for (let x = (y / 6) % 2 ? 4 : 1; x < LW; x += 6) { b.beginPath(); b.arc(x, y, 0.3, 0, 6.29); b.fill(); }
      // 폰 테두리
      b.save(); b.shadowColor = "rgba(0,0,0,.6)"; b.shadowBlur = 6 * DPR; b.shadowOffsetY = 1.5 * R; rr(b, PX - 3.4, PY - 3.4, PW + 6.8, PH + 6.8, 6.5); b.fillStyle = "#07060d"; b.fill(); b.restore();
      rr(b, PX - 3.4, PY - 3.4, PW + 6.8, PH + 6.8, 6.5); b.strokeStyle = lg(b, PX, PY, PX + PW, PY + PH, [[0, "#6a6290"], [0.5, "#2a2640"], [1, "#4a4470"]]); b.lineWidth = 0.7; b.stroke();
      rr(b, PX, PY, PW, PH, 3.5); b.fillStyle = "#000"; b.fill();
      b.fillStyle = "#3a3458"; rr(b, PX - 4.4, PY + 18, 1.2, 8, 0.6); b.fill(); rr(b, PX + PW + 3.2, PY + 14, 1.2, 5, 0.6); b.fill();
      // 타임라인 판
      b.fillStyle = lg(b, 0, tlY - 2, 0, LH, [[0, "#141128"], [1, "#0b0916"]]); b.fillRect(0, tlY - 2, LW, LH - tlY + 2);
      b.fillStyle = "#3a3460"; b.fillRect(0, tlY - 2, LW, 0.35);
      b.fillStyle = "#211d38"; rr(b, 0.5, vY, LW - 1, 15, 2.2); b.fill(); b.fillStyle = "#1b1830"; rr(b, 0.5, tY, LW - 1, 9, 2); b.fill(); b.fillStyle = "#151326"; rr(b, 0.5, aY, LW - 1, 11, 2); b.fill();
      // 편집력 칸
      b.fillStyle = "#0a0914"; rr(b, mX - 4, PY + 26, 8, PH - 32, 4); b.fill(); b.fillStyle = "#1e1b33"; rr(b, mX - 3, PY + 27, 6, PH - 34, 3); b.fill();
    }
    // 도구 아이콘(18x18, 벡터)
    const ICON = {};
    for (const [k] of TOOLS) {
      const [c, b] = hiC(18, 18);
      if (k === "c") {
        b.save(); b.translate(9, 8.4); b.lineCap = "round";
        for (const s of [-1, 1]) { b.save(); b.rotate(s * 0.42); b.fillStyle = lg(b, -1.4, 0, 1.4, 0, [[0, "#ffffff"], [1, "#aab0c4"]]); b.beginPath(); b.moveTo(-1.3, 2); b.lineTo(0, -7.4); b.lineTo(1.3, 2); b.closePath(); b.fill(); b.restore(); }
        b.strokeStyle = "#ff5f9e"; b.lineWidth = 1.5; for (const s of [-1, 1]) { b.beginPath(); b.ellipse(s * 3.6, 5.6, 2.2, 1.9, 0, 0, 6.29); b.stroke(); }
        b.fillStyle = "#5a5470"; b.beginPath(); b.arc(0, 1.6, 1, 0, 6.29); b.fill(); b.restore();
      } else if (k === "s") {
        b.fillStyle = lg(b, 0, 3, 0, 15, [[0, "#ffb8d8"], [1, "#ff7eb6"]]); rr(b, 1.5, 3.5, 9, 11, 2); b.fill();
        b.fillStyle = lg(b, 0, 3, 0, 15, [[0, "#a8dcff"], [1, "#5fb0f0"]]); rr(b, 7.5, 3.5, 9, 11, 2); b.fill();
        arrowP(b, 9, 9, 1, 0, 1.25);
      } else {
        b.fillStyle = "#3a3460"; rr(b, 1.5, 3, 15, 12, 2.5); b.fill();
        b.fillStyle = "#ffd166"; b.font = "900 8.5px sans-serif"; b.textAlign = "center"; b.textBaseline = "middle"; b.fillText("T", 9, 8.6);
        b.fillStyle = "rgba(255,255,255,.5)"; rr(b, 4, 12.6, 10, 1, 0.5); b.fill();
      }
      ICON[k] = c;
    }
    const pvA = document.createElement("canvas"), pvB = document.createElement("canvas"), pvC = document.createElement("canvas");
    for (const c of [pvA, pvB, pvC]) { c.width = Math.round(PW * R); c.height = Math.round(PH * R); }
    const drawScene = (cv, kind, tm, bp) => { const g = cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, cv.width, cv.height); g.setTransform(R, 0, 0, R, 0, 0); try { SC[kind](g, tm, bp, PW, PH, art); } catch (e) { g.fillStyle = "#333"; g.fillRect(0, 0, PW, PH); } g.globalAlpha = 1; };

    // ── 상태 ──  tut: 0 시작 전 / 1 컷 / 2 전환 / 3 자막 / 4 안내 카드 / -1 본편집
    let tut = 0, tutOK = 0, tutMode = true;
    let over = false, done = false, raf = 0, last = 0, songStart = 0, clockOn = false, schedStep = 0, musicEnd = 1e9, phase = "", tmr = null;
    let notes = [], ptr = null, holding = null, combo = 0, maxCombo = 0, missStreak = 0, stray = 0;
    const cnt = { p: 0, g: 0, b: 0, m: 0 }, part = { c: [0, 0], s: [0, 0], h: [0, 0] };
    let sumV = 0, N = 0, sceneIdx = 0, cur = PLAY[0], trans = null, flashT = 0, glitchT = 0, shakeT = 0, secShown = -1, subIdx = 0;
    const segs = [{ t0: -99, sc: PLAY[0] }], clips = [], subsDone = [], fx = [], hearts = [];
    const VAL = { p: 1, g: 0.65, b: 0.1, m: 0 };
    const PWIN = 0.075 * ez, GWIN = 0.15 * ez, BWIN = Math.max(0.25, GWIN + 0.06);
    const songT = (now = performance.now()) => (clockOn ? (now - songStart) / 1000 : -9);

    // ── 음악(드럼+베이스, 16분음표 단위로 미리 예약) ──
    const ROOT = [110, 87.31, 130.81, 98], ARP = [[440, 523.25, 659.25], [349.23, 440, 523.25], [523.25, 659.25, 783.99], [392, 493.88, 587.33]];
    const musSec = (b) => (tutMode ? "A" : b < 4 ? "in" : b < 16 ? "A" : b < 28 ? "B" : b < 36 ? "C" : b < 48 ? "D" : b < 50 ? "R" : b < 58 ? "P" : b === 58 ? "E" : "");
    const kick = (a) => { tone(150, 0.13, "sine", 0.34, -100, a); tone(55, 0.09, "sine", 0.2, 0, a); };
    const snare = (a, v = 1) => { noise(0.11, 1900, 0.17 * v, a, 0.7); tone(220, 0.06, "triangle", 0.07 * v, -90, a); };
    const hat = (a, v = 1) => noise(0.022, 8500, 0.05 * v, a, 1.4);
    const bass = (f, d, a) => { tone(f, d, "triangle", 0.17, 0, a); tone(f * 2, d * 0.6, "square", 0.022, 0, a); };
    const playStep = (i, a) => {
      const b = Math.floor(i / 4), s = i % 16, bar = Math.floor(i / 16), S = musSec(b), r = ROOT[bar % 4];
      if (!S) return;
      if (S === "E") { if (s === 0) { kick(a); noise(1.4, 6000, 0.16, a, 0.5); ARP[0].forEach((f) => tone(f, 0.7, "square", 0.04, 0, a)); bass(55, 0.8, a); } return; }
      if (S === "R") { if (s % 2 === 0) hat(a, 0.8); if (i === 48 * 4) tone(180, 1.2, "sawtooth", 0.035, 900, a); if (b === 49) snare(a, 0.3 + (s % 4) * 0.2); return; }
      const big = S === "D" || S === "P";
      if (S === "C") { if (s === 0) { kick(a); bass(r, 0.55, a); ARP[bar % 4].forEach((f) => tone(f / 2, 1.1, "triangle", 0.03, 0, a)); } if (s === 8) { snare(a); bass(r, 0.45, a); } if (s % 4 === 2) hat(a, 0.7); return; }
      if (big ? s % 4 === 0 : s === 0 || s === 8 || (S !== "in" && s === 10 && bar % 2)) kick(a);
      if (S !== "in" && (s === 4 || s === 12)) { snare(a); if (big) noise(0.06, 3200, 0.08, a, 1); }
      if (big || S === "B" ? true : s % 2 === 0) hat(a, s % 2 ? 0.55 : 1);
      if (S === "in") { if (s === 0 || s === 8) bass(r, 0.18, a); }
      else if (big) { if (s % 2 === 0) bass(s % 4 === 2 ? r * 2 : r, 0.13, a); tone(ARP[bar % 4][s % 3] * (s % 8 >= 4 ? 2 : 1), 0.07, "square", 0.022, 0, a); }
      else if ([0, 3, 6, 8, 11, 14].includes(s)) bass(s === 6 || s === 14 ? r * 2 : r, 0.13, a);
      if (!tutMode && (b === 15 || b === 35)) { snare(a, 0.25 + (s % 4) * 0.15); if (s === 12) noise(0.6, 2500, 0.06, a, 0.6); }
    };
    const schedule = (now) => {
      if (!clockOn) return;
      const t = songT(now);
      while (schedStep * SPB / 4 < t + 0.13 && schedStep < musicEnd) {
        const at = schedStep * SPB / 4 - t;
        if (at > -0.03) playStep(schedStep, Math.max(0, at));
        schedStep++;
      }
    };

    // ── 판정 ──
    const pvPt = () => [(PX + PW / 2) * K, (PY + PH * 0.55) * K];
    const showJ = (gr, dt) => {
      jEl.className = "rl-j " + gr; jEl.textContent = gr === "p" ? "PERFECT" : gr === "g" ? "GOOD" : gr === "b" ? (dt < 0 ? "빨라요!" : "늦어요!") : "MISS";
      void jEl.offsetWidth; jEl.classList.add("on");
      cbEl.textContent = combo >= 3 ? `${combo} COMBO` : ""; cbEl.classList.toggle("on", combo >= 3); cbEl.classList.remove("bump"); void cbEl.offsetWidth; if (combo >= 3) cbEl.classList.add("bump");
    };
    const glitch = (s = 0.28) => { glitchT = Math.max(glitchT, s); meEl.classList.add("gl"); noise(0.12, 600, 0.12, 0, 3); tone(90 + rnd() * 60, 0.12, "sawtooth", 0.06, 200); };
    const doCut = (gr, dir) => {
      const prev = cur; sceneIdx++; cur = PLAY[sceneIdx % PLAY.length];
      segs.push({ t0: songT(), sc: cur }); if (segs.length > 60) segs.shift();
      if (dir) trans = { from: prev, to: cur, d: DV[dir], t: 0 };
      if (gr === "p") flashT = 0.14;
      if (!tutMode && !over) clips.push({ sc: cur, gr, sub: null });
      setFace(gr === "p" ? pick(["smile", "blush"]) : gr === "g" ? pick(["smile", "neutral"]) : "surprised");
      subEl.classList.remove("on");
    };
    const judge = (n, dt, tail = false) => {
      const gr = dt === null ? "m" : Math.abs(dt) <= PWIN ? "p" : Math.abs(dt) <= GWIN ? "g" : "b";
      if (tail) n.j2 = gr; else n.j = gr;
      const good = gr === "p" || gr === "g";
      if (good) { combo++; maxCombo = Math.max(maxCombo, combo); missStreak = 0; } else { combo = 0; missStreak++; }
      if (!tutMode) { cnt[gr]++; sumV += VAL[gr]; N++; part[n.k][0] += VAL[gr]; part[n.k][1]++; F.sc.textContent = `정확 ${Math.round((sumV / N) * 100)}%`; }
      showJ(gr, dt);
      const hp = [playX * K, (n.k === "h" ? tY + 4 : vY + 7) * K];
      if (gr === "p") { tone(1568, 0.05, "square", 0.05); noise(0.04, 6000, 0.08); vib(10); F.burst(hp, "#ffd166", 8); F.burst(pvPt(), "#ffffff", 6); fx.push({ t: 0, c: "#ffd166" }); }
      else if (gr === "g") { tone(1046, 0.05, "square", 0.04); vib(6); F.burst(hp, "#7fe0ff", 5); fx.push({ t: 0, c: "#7fe0ff" }); }
      else if (gr === "b") { glitch(0.32); F.miss(null); }
      else { if (!over) { glitch(0.18); SFX.fail(); setFace("sad"); } }
      // 장면 처리
      if (n.k === "c" || n.k === "s") { if (gr !== "m") doCut(gr, n.k === "s" ? n.ud || n.dir : null); }
      else if (n.k === "h") {
        if (!tail) { if (gr !== "m") { n.txt = SUBS[subIdx++ % SUBS.length]; subEl.className = "rl-sub on"; subEl.innerHTML = "<span></span>"; SFX.pop(); } }
        else {
          const ok = good && n.j !== "m";
          if (n.txt) { subEl.className = "rl-sub on " + (ok ? "ok" : "bad"); subEl.innerHTML = `<span>${ok ? n.txt : n.txt.slice(0, Math.max(2, n.txt.length - 4)) + "…ㅇ"}</span>`; }
          if (ok) { [784, 1046, 1318].forEach((f, i) => tone(f, 0.08, "triangle", 0.07, 0, i * 0.05)); setFace("blush"); }
          if (!tutMode && !over) { const c = clips[clips.length - 1]; if (c) c.sub = ok ? n.txt : null; subsDone.push(ok); }
          n.subOff = songT() + 1.1;
        }
      }
      if (tutMode && tut > 0 && tut < 4) {
        const okNote = n.k === "h" ? tail && good && n.j !== "m" : good;
        if (okNote) { tutOK++; drawDots(); const need = tut === 3 ? 1 : 2; if (tutOK >= need) setTimeout(() => { if (tut > 0 && tut < 4) tutNext(tut + 1); }, 700); }
        else if (!good) F.msg(n.k === "c" ? "가위가 빨간 선에 닿는 순간에 톡!" : n.k === "s" ? `화살표(${ARW[n.dir]}) 방향으로 쓱!` : "막대 끝에서 손을 떼요");
      }
    };
    const nearest = (t) => { let best = null, bd = 1e9; for (const n of notes) { if (n.j) continue; const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } } return bd <= BWIN ? best : null; };
    const inDown = (x, y) => {
      if (over || !clockOn || ptr || holding || tut === 4 || tut === 0) return;
      const t = songT(), n = nearest(t);
      if (!n) {
        if (!tutMode) { stray++; combo = 0; glitch(0.12); F.float([x, y], "헛컷", "bad"); cbEl.classList.remove("on"); }
        else SFX.tok();
        ptr = { n: null, x, y }; return;
      }
      const dt = t - n.t;
      if (n.k === "c") { judge(n, dt); ptr = { n: null, x, y }; }
      else if (n.k === "s") { ptr = { n, x, y, dt }; }
      else { judge(n, dt); ptr = { n: null, x, y }; if (n.j !== "m") { holding = n; n.tick = 0; } }
    };
    const inMove = (x, y) => {
      if (!ptr || !ptr.n) return;
      const dx = x - ptr.x, dy = y - ptr.y;
      if (Math.hypot(dx, dy) < 14) return;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : dy > 0 ? "d" : "u";
      const n = ptr.n; ptr.n = null; n.ud = dir; SFX.whoosh(); vib(8);
      if (dir === n.dir) judge(n, ptr.dt);
      else { judge(n, 1); jEl.textContent = "방향이 달라요!"; }
    };
    const inUp = () => {
      if (ptr && ptr.n) { const n = ptr.n; n.ud = null; judge(n, 1); jEl.textContent = "밀어야 해요!"; }
      ptr = null;
      if (holding) { const n = holding; holding = null; if (!n.j2) judge(n, songT() - n.e, true); }
    };
    const xy = (e) => { const r = st.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let pid = null;
    st.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; e.preventDefault(); if (pid !== null) return; pid = e.pointerId; try { st.setPointerCapture(e.pointerId); } catch (er) {} const [x, y] = xy(e); inDown(x, y); });
    st.addEventListener("pointermove", (e) => { if (e.pointerId !== pid) return; const [x, y] = xy(e); inMove(x, y); });
    const upH = (e) => { if (e.pointerId !== pid) return; pid = null; inUp(); };
    st.addEventListener("pointerup", upH); st.addEventListener("pointercancel", upH);

    // ── 리허설 ──
    hand.style.backgroundImage = `url("${fingerURL()}")`;
    const SKIP = `<button class="rl-skip" data-skip>건너뛰기</button>`;
    const drawDots = () => { const need = tut === 3 ? 1 : 2, d = tutP.querySelector(".rl-dots"); if (d) d.innerHTML = Array.from({ length: need }, (_, i) => `<i class="${i < tutOK ? "on" : ""}"></i>`).join(""); };
    const startClock = (delay = 0) => { songStart = performance.now() + delay; clockOn = true; schedStep = 0; };
    const tutNext = (n) => {
      tut = n; tutOK = 0; notes = []; ptr = null; holding = null;
      tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) {
        startClock(150);
        tutP.innerHTML = `음악에 맞춰 <b class="pk">가위</b>가 흘러와요.<br><b class="rd">빨간 선</b>에 닿는 순간 <b class="pk">톡!</b> 컷이 바뀌어요<br><span class="rl-dots"></span>`;
        tutB.innerHTML = SKIP;
      } else if (n === 2) {
        tutP.innerHTML = `좋아요! <b class="pu">보라 화살표</b>는 전환 효과예요.<br>선에 닿을 때 <b class="pu">그 방향으로 쓱</b> 밀어요<br><span class="rl-dots"></span>`; tutB.innerHTML = SKIP;
      } else if (n === 3) {
        tutP.innerHTML = `마지막! <b class="gd">노란 자막 막대</b>는<br>시작에서 <b class="gd">꾹 누르고</b>, 끝에서 <b class="gd">떼요</b><br><span class="rl-dots"></span>`; tutB.innerHTML = SKIP;
      } else if (n === 4) {
        tutP.innerHTML = `완벽해요! 이제 진짜 편집이에요.<br>30초 동안 <b class="pk">컷 → 전환 → 자막 → 클라이맥스</b>!`; tutB.innerHTML = `<button class="rl-go" data-go>편집 시작!</button>`;
        SFX.ding(3);
      }
      drawDots();
    };
    const tutGen = (t) => {
      if (tut < 1 || tut > 3) return;
      if (notes.some((n) => !n.j || (n.k === "h" && !n.j2 && n.j !== "m"))) return;
      notes = notes.filter((n) => t - (n.e || n.t) < 3);
      const b = Math.ceil(t / SPB) + 2, k = tut === 1 ? "c" : tut === 2 ? "s" : "h";
      notes.push({ b, t: b * SPB, k, dir: k === "s" ? ["r", "l", "u", "d"][tutOK % 2 ? rint(4) : 0] : null, e: k === "h" ? (b + 2) * SPB : 0, help: true, j: null, j2: null });
    };
    const startEdit = () => {
      if (tut < 0) return; tut = -1; tutMode = false; ptr = null; holding = null;
      tutEl.classList.add("off"); hand.className = "rl-hand"; subEl.className = "rl-sub";
      notes = CHART.map(([b, k, x]) => ({ b, t: b * SPB, k, dir: k === "s" ? x : null, e: k === "h" ? x * SPB : 0, j: null, j2: null, help: false }));
      for (const s of SECS) { const ns = notes.filter((n) => n.b > s.b && n.b < s.b + 9 && n.k === s.k).slice(0, s.k === "c" && s.b > 0 ? 1 : 2); ns.forEach((n) => (n.help = true)); }
      combo = 0; maxCombo = 0; missStreak = 0; stray = 0; sumV = 0; N = 0; for (const k in cnt) cnt[k] = 0; for (const k in part) part[k] = [0, 0];
      sceneIdx = 0; cur = PLAY[0]; segs.length = 0; segs.push({ t0: -99, sc: cur }); clips.length = 0; subsDone.length = 0; subIdx = 0; trans = null; secShown = -1;
      F.sc.textContent = "정확 -";
      startClock(80);
      tmr = timer(T, F.bar, end);
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startEdit(); } });

    // ── 끝: 내보내기 → 내 릴스 재생 → 조회수 폭발 ──
    let RS = 0, rlist = [], views = 0, score = 0, boomT = 0, rIdx = -1;
    const end = () => {
      if (over) return; over = true; holding = null; ptr = null;
      for (const n of notes) { if (!n.j) judge(n, null); if (n.k === "h" && n.j !== "m" && !n.j2) judge(n, null, true); }
      hand.className = "rl-hand"; hintEl.classList.remove("on"); jEl.classList.remove("on"); cbEl.classList.remove("on");
      trLb.forEach((e) => (e.style.display = "none")); musicEnd = 59 * 4;
      const acc = N ? sumV / N : 0, cr = N ? maxCombo / N : 0;
      score = clamp(acc * 0.85 + cr * 0.15 - stray * 0.008, 0, 1);
      views = Math.round(300 * Math.pow(10, score * 3.6) * (0.9 + rnd() * 0.2));
      // 재생 목록: 내가 자른 클립에서 고르게 8개(모자라면 멈춘 화면 반복 = 엇박)
      const pickN = 8;
      for (let i = 0; i < pickN; i++) { if (clips.length >= pickN) rlist.push(clips[Math.floor((i * clips.length) / pickN)]); else rlist.push(clips[i] || { sc: clips.length ? clips[clips.length - 1].sc : PLAY[0], gr: "m", sub: null }); }
      phase = "render"; upEl.classList.add("on"); SFX.end();
    };
    const boom = () => {
      phase = "boom"; boomT = 0; setFace(score >= 0.6 ? "blush" : score >= 0.35 ? "smile" : "sad");
      const big = score >= 0.6;
      vwEl.classList.add("boom"); vwEl.querySelector("small").textContent = score >= 0.85 ? "떡상! 알고리즘 탔어요" : big ? "조회수 쑥쑥!" : score >= 0.35 ? "무난하게 올라가요" : "음… 엇박이 아쉬워요";
      vwEl.querySelector("b").textContent = fmtV(views);
      if (big) { vib([30, 30, 30, 30, 60]); F.burst([(PX + PW / 2) * K, (PY + PH / 2) * K], "#ffd166", 18); }
      for (let i = 0; i < (big ? 40 : score >= 0.35 ? 16 : 5); i++) hearts.push({ x: PX + rnd() * PW, y: PY + PH + rnd() * 20, vy: -(20 + rnd() * 30), ph: rnd() * 6, c: pick(HCOL), life: 2 + rnd() * 1.2, delay: i * 0.04 });
      const pool = shuffle(score >= 0.6 ? GOODC : score >= 0.35 ? MIDC.concat(GOODC.slice(0, 2)) : BADC.concat(MIDC.slice(0, 1)));
      const nick = () => pick(["퇴근한", "졸린", "배고픈", "새벽", "월요병", "말랑"]) + pick(["감자", "고양이", "두부", "만두", "펭귄", "라떼"]);
      pool.slice(0, LH >= 190 ? 3 : 2).forEach((c, i) => setTimeout(() => { if (done) return; const d = document.createElement("div"); d.innerHTML = `<b>${nick()}</b>${c}`; cmEl.appendChild(d); SFX.pop(); }, 250 + i * 420));
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const pc = (k) => (part[k][1] ? part[k][0] / part[k][1] : 0);
        finish(score, `조회수 <b>${fmtV(views)}회</b> · Perfect ${cnt.p}개 · 최대 콤보 ${maxCombo}`, "", [["박자 컷", pc("c")], ["전환 효과", pc("s")], ["자막 타이밍", pc("h")]]);
      }, 2700);
    };

    // ── 그리기 ──
    const drawHeart = (g, x, y, c, a = 1, s = 3) => { g.globalAlpha = a; heartP(g, x, y, s); g.fillStyle = c; g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x - s * 0.42, y - s * 0.32, s * 0.22, s * 0.15, -0.6, 0, 6.29); g.fill(); g.globalAlpha = 1; };
    // 지나간 클립·필름 칸에 장면 그림 조각
    const thumb = (g, sc, x, y, w, h, a = 0.85) => {
      if (w <= 0.5) return;
      g.save(); rr(g, x, y, w, h, 1.2); g.clip();
      g.fillStyle = tint(SCOL[sc], 0.6); g.fillRect(x, y, w, h);
      const bg = SBG[sc], r = bg && ldImg(bg[0]);
      if (r && r.ok) { g.globalAlpha = a; g.translate(x, y); cover(g, r.im, Math.max(w, h * 1.6), h, bg[1]); g.translate(-x, -y); g.globalAlpha = 1; }
      g.fillStyle = lg(g, 0, y, 0, y + h, [[0, rgba(SCOL[sc], 0.15)], [1, rgba(SCOL[sc], 0.55)]]); g.fillRect(x, y, w, h);
      g.restore();
    };
    const noteIcon = (g, n, x, y, hot) => {
      if (n.k === "c") {
        g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x - 0.2, vY + 0.5, 0.4, 14);
        if (hot) glow(g, x, y, 7, "#ff9ec8", 0.7);
        g.beginPath(); g.arc(x, y, 3.7, 0, 6.29); g.fillStyle = lg(g, 0, y - 3.7, 0, y + 3.7, [[0, "#ff8fc0"], [1, "#e8337a"]]); g.fill();
        g.lineWidth = 0.6; g.strokeStyle = hot ? "#fff3b0" : "#fff"; g.stroke();
        scissors(g, x, y - 0.1, 0.72);
      } else if (n.k === "s") {
        g.fillStyle = "rgba(200,140,255,.35)"; g.fillRect(x - 0.2, vY + 0.5, 0.4, 14);
        if (hot) glow(g, x, y, 8, "#c88cff", 0.75);
        rr(g, x - 4.2, y - 4.2, 8.4, 8.4, 2.2); g.fillStyle = lg(g, 0, y - 4, 0, y + 4, [[0, "#b878ff"], [1, "#7a2ed0"]]); g.fill();
        g.lineWidth = 0.6; g.strokeStyle = hot ? "#fff3b0" : "#e8d8ff"; g.stroke();
        const [dx, dy] = DV[n.dir]; arrowP(g, x, y, dx, dy, 1);
      }
    };
    const render = (sT, tm) => {
      const bt = sT / SPB, bp = clamp(bt - Math.floor(bt), 0, 1), beat = Math.floor(bt);
      // 1) 미리보기 장면(전환 중이면 두 장면을 밀어서 겹친다)
      let showMe = cur === "me", meOff = [0, 0];
      let rSc = cur, rGl = false, rFl = false;
      if (phase === "replay" || phase === "boom") {
        const rt = sT - RS; let idx = -1;
        for (let i = 0; i < rlist.length; i++) { const st0 = i * SPB + (rlist[i].gr === "b" || rlist[i].gr === "m" ? 0.17 : 0); if (rt >= st0) idx = i; }
        if (phase === "boom") idx = rlist.length - 1;
        rIdx = idx; const c = rlist[Math.max(0, idx)] || { sc: cur, gr: "g" }; rSc = c.sc;
        const st0 = Math.max(0, idx) * SPB + (c.gr === "b" || c.gr === "m" ? 0.17 : 0);
        rGl = (c.gr === "b" || c.gr === "m") && rt - st0 < 0.22 && phase === "replay"; rFl = c.gr === "p" && rt - st0 < 0.1;
        showMe = rSc === "me";
        if (c.sub && phase === "replay") { if (!subEl.classList.contains("ok") || subEl.textContent !== c.sub) { subEl.className = "rl-sub on ok"; subEl.innerHTML = `<span>${c.sub}</span>`; } } else if (phase === "replay") subEl.className = "rl-sub";
        if (rGl) { glitchT = Math.max(glitchT, 0.05); meEl.classList.add("gl"); }
        if (rFl) flashT = Math.max(flashT, 0.08);
      }
      const gC = pvC.getContext("2d"), dW = pvC.width, dH = pvC.height;
      gC.setTransform(1, 0, 0, 1, 0, 0);
      if (trans && phase !== "replay" && phase !== "boom") {
        const e = 1 - Math.pow(1 - clamp(trans.t / 0.22, 0, 1), 3), [dx, dy] = trans.d;
        drawScene(pvA, trans.to, tm, bp); drawScene(pvB, trans.from, tm, bp);
        gC.clearRect(0, 0, dW, dH);
        gC.drawImage(pvB, Math.round(dx * e * dW), Math.round(dy * e * dH)); gC.drawImage(pvA, Math.round(dx * (e - 1) * dW), Math.round(dy * (e - 1) * dH));
        // 밀리는 경계에 빛 줄
        gC.fillStyle = "rgba(255,255,255,.6)"; if (dx) gC.fillRect((dx > 0 ? e : 1 - e) * dW - R * 0.4, 0, R * 0.8, dH); else gC.fillRect(0, (dy > 0 ? e : 1 - e) * dH - R * 0.4, dW, R * 0.8);
        if (trans.from === "me") { showMe = true; meOff = [dx * e * PW * K, dy * e * PH * K]; } else if (trans.to === "me") meOff = [dx * (e - 1) * PW * K, dy * (e - 1) * PH * K];
      } else { drawScene(pvA, rSc, tm, bp); gC.clearRect(0, 0, dW, dH); gC.drawImage(pvA, 0, 0); }
      // 내 얼굴 장면: 캐릭터 그림을 박자에 맞춰 살짝 들썩
      if (art) {
        meEl.classList.toggle("on", showMe);
        const tf = `translate(${Math.round(meOff[0])}px,${Math.round(meOff[1] + (bp < 0.15 ? -3 : 0))}px)`;
        if (tf !== meTf) { meTf = tf; meEl.style.transform = tf; }
        if (glitchT <= 0) meEl.classList.remove("gl");
      }
      // 2) 바탕 + 미리보기 붙이기(튀면 줄 단위로 어긋나게)
      gB.drawImage(BG, 0, 0, LW, LH);
      const shx = shakeT > 0 ? (rnd() - 0.5) * 4 : 0;
      gB.save(); rr(gB, PX, PY, PW, PH, 3.5); gB.clip();
      if (glitchT > 0) {
        for (let y = 0; y < PH; y += 3) { const o = rnd() < 0.5 ? Math.round((rnd() - 0.5) * 9) : 0; gB.drawImage(pvC, 0, Math.round(y * R), dW, Math.round(3 * R), PX + o + shx, PY + y, PW, 3); }
        gB.globalAlpha = 0.35; gB.globalCompositeOperation = "lighter"; gB.drawImage(pvC, PX + 2, PY, PW, PH); gB.globalCompositeOperation = "source-over"; gB.globalAlpha = 1;
      } else gB.drawImage(pvC, PX + shx, PY, PW, PH);
      gB.restore();
      // 3) 앞 그림
      const g = gF, P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      g.clearRect(0, 0, LW, LH);
      g.save(); rr(g, PX, PY, PW, PH, 3.5); g.clip();
      if (glitchT > 0) { for (let k = 0; k < 4; k++) { const y = PY + rnd() * PH; P(PX, y, PW, 0.5 + rnd(), pick(["rgba(255,0,255,.5)", "rgba(0,255,255,.5)", "rgba(255,255,255,.4)"])); } P(PX + rnd() * (PW - 10), PY + rnd() * (PH - 4), 10, 1.5, "rgba(0,255,255,.65)"); }
      if (flashT > 0) { g.globalAlpha = clamp(flashT / 0.14, 0, 1) * 0.7; P(PX, PY, PW, PH, "#fff"); g.globalAlpha = 1; }
      // 릴스 화면 꾸밈(아래 어둡게, 오른쪽 아이콘, 아래 글줄, 위 진행 막대)
      g.fillStyle = lg(g, 0, PY + PH - 30, 0, PY + PH, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.5)"]]); g.fillRect(PX, PY + PH - 30, PW, 30);
      const ix = PX + PW - 5, boomH = phase === "boom" || flashT > 0;
      if (boomH) drawHeart(g, ix, PY + PH - 40, "#ff3b5c", 1, 2.7);
      else { heartP(g, ix, PY + PH - 40, 2.7); g.strokeStyle = "#fff"; g.lineWidth = 0.55; g.stroke(); }
      g.strokeStyle = "#fff"; g.lineWidth = 0.55; g.lineJoin = "round";
      g.beginPath(); g.ellipse(ix, PY + PH - 31, 2.6, 2.2, 0, 0.5, 6.0); g.lineTo(ix - 2.4, PY + PH - 28.2); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(ix - 2.6, PY + PH - 21.5); g.lineTo(ix + 2.8, PY + PH - 24); g.lineTo(ix + 0.6, PY + PH - 18.8); g.lineTo(ix - 0.2, PY + PH - 21); g.closePath(); g.stroke();
      g.beginPath(); g.arc(PX + 5, PY + PH - 12, 2.6, 0, 6.29); g.fillStyle = lg(g, PX + 3, 0, PX + 8, 0, [[0, "#ffd166"], [1, "#ff5f9e"]]); g.fill(); g.lineWidth = 0.4; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "rgba(255,255,255,.85)"; rr(g, PX + 9.5, PY + PH - 13.3, 16, 1.6, 0.8); g.fill();
      g.fillStyle = "rgba(255,255,255,.55)"; rr(g, PX + 4, PY + PH - 7.4, 28, 1.1, 0.55); g.fill(); g.fillStyle = "rgba(255,255,255,.4)"; rr(g, PX + 4, PY + PH - 4.6, 20, 1.1, 0.55); g.fill();
      const prog = phase === "replay" || phase === "boom" ? clamp((sT - RS) / (8 * SPB), 0, 1) : tutMode ? (bt % 8) / 8 : clamp(sT / T, 0, 1);
      g.fillStyle = "rgba(255,255,255,.3)"; rr(g, PX + 3, PY + 2.2, PW - 6, 0.7, 0.35); g.fill(); g.fillStyle = "#fff"; rr(g, PX + 3, PY + 2.2, (PW - 6) * prog, 0.7, 0.35); g.fill();
      g.restore();
      if (clockOn && bp < 0.12 && phase !== "boom") { g.globalAlpha = 0.7 * (1 - bp / 0.12); rr(g, PX - 0.6, PY - 0.6, PW + 1.2, PH + 1.2, 4); g.strokeStyle = "#ff9ec8"; g.lineWidth = 0.8; g.stroke(); g.globalAlpha = 1; }
      // 도구 칸(지금 구간 반짝)
      const secK = tutMode ? (tut === 2 ? "s" : tut === 3 ? "h" : "c") : (() => { let k = "c"; for (const s of SECS) if (bt >= s.b) k = s.k; return k; })();
      TOOLS.forEach(([k], i) => {
        const on = k === secK && !over, x = Math.round((PX - 2 - 18) / 2), y = toolY(i);
        if (on) glow(g, x + 9, y + 9, 16, bp < 0.2 ? "#ffd166" : "#ff5f9e", 0.35);
        rr(g, x - 1, y - 1, 20, 20, 4.5); g.fillStyle = on ? (bp < 0.2 ? "#ffd166" : "#ff5f9e") : "#2a2640"; g.fill();
        rr(g, x, y, 18, 18, 3.8); g.fillStyle = on ? lg(g, 0, y, 0, y + 18, [[0, "#4a3474"], [1, "#2a1e48"]]) : "#1a1730"; g.fill();
        g.globalAlpha = on ? 1 : 0.35; g.drawImage(ICON[k], x, y, 18, 18); g.globalAlpha = 1;
        toolLb[i].classList.toggle("on", on);
      });
      // 오른쪽: 박 표시등 + 편집력 막대
      for (let k = 0; k < 4; k++) {
        const on = clockOn && ((beat % 4) + 4) % 4 === k, x = mX - 3 + (k % 2) * 6, y = PY + 8 + Math.floor(k / 2) * 6, c = k === 0 ? "#ff5f9e" : "#ffd166";
        if (on && bp < 0.25) glow(g, x, y, 5, c, 0.8);
        g.beginPath(); g.arc(x, y, 2, 0, 6.29); g.fillStyle = on ? c : "#2a2640"; g.fill(); if (on) { g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.arc(x - 0.6, y - 0.6, 0.6, 0, 6.29); g.fill(); }
      }
      const acc = N ? sumV / N : tutMode ? 0.5 : 0, gh = PH - 34, fh = gh * acc, gx = mX - 3;
      if (fh > 0.5) { g.save(); rr(g, gx, PY + 27, 6, gh, 3); g.clip(); g.fillStyle = lg(g, 0, PY + 27 + gh, 0, PY + 27, [[0, "#ff5f9e"], [1, "#ffd166"]]); g.fillRect(gx, PY + 27 + gh - fh, 6, fh); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(gx + 0.8, PY + 27 + gh - fh, 1, fh); g.fillStyle = "#fff"; g.fillRect(gx, PY + 27 + gh - fh, 6, 0.6); g.restore(); }
      // 4) 타임라인
      if (!over) {
        const xOf = (t) => playX + (t - sT) * PPS;
        // 박 눈금
        const b0 = Math.floor(sT / SPB - playX / PPS / SPB) - 1, b1 = Math.ceil(sT / SPB + (LW - playX) / PPS / SPB) + 1;
        for (let b = b0; b <= b1; b++) { const x = xOf(b * SPB); if (x < 0 || x >= LW) continue; const bar = ((b % 4) + 4) % 4 === 0; P(x - 0.2, tlY, 0.4, bar ? 4.5 : 2.5, bar ? "#8a84b0" : "#4a4670"); P(x - 0.15, vY, 0.3, 15, bar ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.04)"); P(x - 0.15, tY, 0.3, 9, "rgba(255,255,255,.04)"); }
        for (let b = b0; b <= b1; b++) { const x = xOf((b + 0.5) * SPB); if (x >= 0 && x < LW) P(x - 0.15, tlY, 0.3, 1.2, "#3a3660"); }
        // 지나간 클립(장면 그림 조각)
        for (let i = 0; i < segs.length; i++) {
          const s0 = segs[i].t0, s1 = i + 1 < segs.length ? segs[i + 1].t0 : sT, x0 = Math.max(0.5, xOf(s0)), x1 = Math.min(playX, xOf(s1));
          if (x1 - x0 < 0.6) continue;
          thumb(g, segs[i].sc, x0 + 0.3, vY + 1, x1 - x0 - 0.6, 13);
          g.strokeStyle = rgba(tint(SCOL[segs[i].sc], 1.3), 0.9); g.lineWidth = 0.35; rr(g, x0 + 0.3, vY + 1, x1 - x0 - 0.6, 13, 1.2); g.stroke();
        }
        // 앞으로 올 칸
        g.fillStyle = "#3a3660"; for (let x = playX + 1; x < LW; x += 4) { rr(g, x, vY + 7, 2, 0.6, 0.3); g.fill(); }
        // 자막 막대
        for (const n of notes) if (n.k === "h") {
          const x0 = xOf(n.t), x1 = xOf(n.e); if (x1 < 0 || x0 >= LW) continue;
          const okH = n.j2 === "p" || n.j2 === "g", dead = n.j === "m" || (n.j2 && !okH);
          rr(g, x0, tY + 1, x1 - x0, 7, 2); g.fillStyle = dead ? "#5a5470" : okH ? lg(g, 0, tY, 0, tY + 8, [[0, "#a8f0c0"], [1, "#4fc880"]]) : lg(g, 0, tY, 0, tY + 8, [[0, "#ffe08a"], [1, "#f0b030"]]); g.fill();
          g.lineWidth = 0.4; g.strokeStyle = dead ? "#7a7490" : "rgba(255,255,255,.7)"; g.stroke();
          g.fillStyle = dead ? "#3a3450" : "#3a2400"; g.font = "900 5.5px sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("T", x0 + 1.5, tY + 4.7);
          if (holding === n) { const hx = Math.min(playX, x1); g.save(); rr(g, x0, tY + 1, x1 - x0, 7, 2); g.clip(); g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(x0, tY + 1, hx - x0, 7); g.fillStyle = "#ff5f9e"; for (let x = x0 + 5; x < hx - 1; x += 3) { g.beginPath(); g.arc(x, tY + 4.5, 0.6, 0, 6.29); g.fill(); } g.restore(); }
          if (!n.j) P(x0 - 0.2, vY, 0.4, 15, "rgba(255,209,102,.4)");
        }
        // 음악 파형(킥에서 크게)
        for (let x = 0; x < LW; x += 1) {
          const tt = sT + (x - playX) / PPS; if (tt < 0) continue;
          const st16 = tt / (SPB / 4), fr = st16 - Math.floor(st16), s = ((Math.floor(st16) % 16) + 16) % 16, b = Math.floor(tt / SPB);
          const S = musSec(b), big = S === "D", kk = big ? s % 4 === 0 : s === 0 || s === 8, sn = s === 4 || s === 12;
          const amp = (kk ? 4.6 * Math.exp(-fr * 2.5) : sn ? 3.2 * Math.exp(-fr * 3) : 0.9 + (s % 2 ? 0 : 0.5)) + Math.abs(Math.sin(x * 1.7)) * 0.6;
          rr(g, x + 0.2, aY + 5.5 - amp, 0.6, amp * 2, 0.3); g.fillStyle = x < playX ? "#2f8a86" : "#4fd8c8"; g.fill();
        }
        // 노트 표시
        let nextN = null;
        for (const n of notes) {
          if (n.k === "h") continue;
          const x = xOf(n.t); if (x < -6 || x > LW + 6) continue;
          if (n.j === "m" || n.j === "b") { g.beginPath(); g.arc(x, vY + 7.5, 2.3, 0, 6.29); g.fillStyle = "#4a4460"; g.fill(); g.strokeStyle = "#ff6a7a"; g.lineWidth = 0.55; g.beginPath(); g.moveTo(x - 1, vY + 6.5); g.lineTo(x + 1, vY + 8.5); g.moveTo(x + 1, vY + 6.5); g.lineTo(x - 1, vY + 8.5); g.stroke(); continue; }
          if (n.j) continue;
          if (!nextN || n.t < nextN.t) nextN = n;
          noteIcon(g, n, x, vY + 7.5, n.t - sT < 0.3);
        }
        for (const n of notes) if (n.k === "h" && !n.j && (!nextN || n.t < nextN.t)) nextN = n;
        // 다가오는 표시: 빨간 선 둘레 원이 줄어든다
        if (nextN) { const d = nextN.t - sT; if (d < 0.6 && d > -0.1) { const r = Math.max(2, 3.5 + d / 0.6 * 9), cy = nextN.k === "h" ? tY + 4.5 : vY + 7.5, col = nextN.k === "c" ? "#ff9ec8" : nextN.k === "s" ? "#c88cff" : "#ffd166"; g.globalAlpha = 0.9; g.strokeStyle = col; g.lineWidth = 0.6; g.beginPath(); g.ellipse(playX, cy, r, r * 0.8, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; } }
        // 빨간 선
        g.fillStyle = "rgba(255,59,92,.18)"; g.fillRect(playX - 1.2, vY, 2.4, tlB - vY);
        P(playX - 0.3, tlY - 1, 0.6, tlB - tlY + 1, "#ff3b5c");
        g.fillStyle = "#ff3b5c"; g.beginPath(); g.moveTo(playX - 2.4, tlY - 2.6); g.lineTo(playX + 2.4, tlY - 2.6); g.lineTo(playX + 2.4, tlY - 0.6); g.lineTo(playX, tlY + 1.2); g.lineTo(playX - 2.4, tlY - 0.6); g.closePath(); g.fill();
        for (const f of fx) { const r = 2 + f.t * 40; g.globalAlpha = clamp(1 - f.t / 0.3, 0, 1); g.strokeStyle = f.c; g.lineWidth = 0.8; g.beginPath(); g.ellipse(playX, vY + 7.5, r, r * 0.7, 0, 0, 6.29); g.stroke(); g.globalAlpha = 1; }
      }
      // 끝: 타임라인 자리에 내가 자른 클립 필름(재생 중인 칸 반짝)
      if (over) {
        P(0, tlY - 1.5, LW, LH - tlY + 1.5, "#0f0d1c"); P(0, tlY - 2, LW, 0.35, "#3a3460");
        const n = rlist.length || 8, fw = Math.floor((LW - 8) / n), fy = LH - 19, fx0 = Math.round((LW - fw * n) / 2);
        rr(g, fx0 - 2, fy - 4, fw * n + 4, 19, 2); g.fillStyle = "#050409"; g.fill();
        g.fillStyle = "#2a2640"; for (let x = fx0; x < fx0 + fw * n; x += 4) { rr(g, x, fy - 3, 2, 1.6, 0.5); g.fill(); rr(g, x, fy + 12.4, 2, 1.6, 0.5); g.fill(); }
        for (let i = 0; i < n; i++) {
          const c = rlist[i]; if (!c) continue; const x = fx0 + i * fw, bad = c.gr === "b" || c.gr === "m", on = i === rIdx && phase === "replay";
          thumb(g, c.sc, x + 0.3, fy, fw - 0.9, 11, bad ? 0.45 : 0.95);
          if (bad) { g.fillStyle = "rgba(20,10,20,.45)"; rr(g, x + 0.3, fy, fw - 0.9, 11, 1.2); g.fill(); g.strokeStyle = "#ff6a7a"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + fw / 2 - 2, fy + 3.5); g.lineTo(x + fw / 2 + 2, fy + 7.5); g.moveTo(x + fw / 2 + 2, fy + 3.5); g.lineTo(x + fw / 2 - 2, fy + 7.5); g.stroke(); }
          if (c.gr === "p") { g.fillStyle = "#ffd166"; sparkle(g, x + fw - 2.6, fy + 2.2, 1.5, 1); }
          if (on) { g.strokeStyle = "#fff"; g.lineWidth = 0.7; rr(g, x - 0.3, fy - 0.6, fw + 0.3, 12.2, 1.6); g.stroke(); }
        }
      }
      // 하트(끝 연출)
      for (const h of hearts) { if (h.delay > 0) continue; drawHeart(g, h.x + Math.sin(h.ph) * 2.5, h.y, h.c, clamp(h.life, 0, 1), 2.6); }
    };

    // ── 손가락·힌트 ──
    let hintKey = "";
    const helpUI = (sT) => {
      if (over || tut === 0 || tut === 4) { hand.className = "rl-hand"; hintEl.classList.remove("on"); return; }
      let n = null; for (const x of notes) if (!x.j && (!n || x.t < n.t)) n = x;
      const hn = holding;
      const want = hn || (n && (n.help || missStreak >= 2) && n.t - sT < 1.4 ? n : null);
      if (!want) { hand.className = "rl-hand"; hintEl.classList.remove("on"); hintKey = ""; return; }
      const k = hn ? "hh" : want.k + (want.dir || "");
      if (k !== hintKey) {
        hintKey = k;
        hintEl.className = "rl-hint on " + want.k;
        hintEl.innerHTML = hn ? `<b>꾹…</b>막대 끝에서 떼요!` : want.k === "c" ? `<b>톡!</b>가위가 빨간 선에 닿을 때` : want.k === "s" ? `<b>${ARW[want.dir]} 쓱!</b>선에 닿을 때 화살표 방향으로` : `<b>꾹!</b>노란 막대가 선에 닿으면 누르고 있기`;
      } else hintEl.classList.add("on");
      const y = (want.k === "h" ? tY + 4 : vY + 7) * K;
      hand.style.left = playX * K + "px"; hand.style.top = y + "px";
      const mode = hn ? "hold" : want.k === "c" ? "tap" : want.k === "s" ? "sw-" + want.dir : "hold";
      if (!hand.classList.contains(mode)) hand.className = "rl-hand on " + mode;
    };

    // ── 흐름 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const sT = songT(now), tm = now / 1000;
      schedule(now);
      if (tut === 0) { if (opts.retry) startEdit(); else if (tm - t00 > 0.5) tutNext(1); }
      if (tutMode) tutGen(sT);
      if (!over && clockOn) {
        for (const n of notes) {
          if (!n.j && sT - n.t > BWIN && !(ptr && ptr.n === n)) judge(n, null);
          if (n.k === "h" && n.j && n.j !== "m" && !n.j2 && sT - n.e > BWIN) { if (holding === n) holding = null; judge(n, null, true); }
          if (n.subOff && sT > n.subOff) { n.subOff = 0; subEl.classList.remove("on"); }
        }
        if (ptr && ptr.n && sT - ptr.n.t > BWIN + 0.15) { const n = ptr.n; ptr.n = null; judge(n, 1); }
        // 자막 꾹 누르는 동안 글자가 한 자씩
        if (holding && holding.txt) {
          const p = clamp((sT - holding.t) / (holding.e - holding.t), 0, 1), n = Math.ceil(holding.txt.length * p), sp = subEl.querySelector("span");
          if (sp && sp.textContent.length !== n) { sp.textContent = holding.txt.slice(0, n) || " "; if (n) tone(1900 + n * 30, 0.02, "square", 0.03); }
        }
        // 구간 띠
        if (!tutMode) for (let i = 0; i < SECS.length; i++) if (i > secShown && sT >= SECS[i].b * SPB - 0.05) { secShown = i; banEl.innerHTML = `${SECS[i].n}<small>${SECS[i].s}</small>`; banEl.classList.remove("on"); void banEl.offsetWidth; banEl.classList.add("on"); if (i) SFX.whoosh(); }
      }
      if (over) {
        const b = sT / SPB;
        if (phase === "render") { upEl.querySelector("em").style.setProperty("--p", clamp((b - 48) / 1.8, 0, 1) * 100 + "%"); if (b >= 50) { phase = "replay"; RS = 50 * SPB; upEl.classList.remove("on"); vwEl.classList.add("on"); SFX.snap(); } }
        if (phase === "replay") { const p = clamp((sT - RS) / (8 * SPB), 0, 1); vwEl.querySelector("b").textContent = fmtV(views * 0.12 * p * p); if (b >= 58) boom(); }
        if (phase === "boom") boomT += dt;
      }
      helpUI(sT);
      if (trans) { trans.t += dt; if (trans.t > 0.24) trans = null; }
      if (flashT > 0) flashT -= dt; if (glitchT > 0) glitchT -= dt; if (shakeT > 0) shakeT -= dt;
      for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > 0.3) fx.splice(i, 1); }
      for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.delay > 0) { h.delay -= dt; continue; } h.y += h.vy * dt; h.ph += dt * 4; h.life -= dt * 0.6; if (h.life <= 0 || h.y < -8) hearts.splice(i, 1); }
      render(sT, clockOn ? Math.max(0, sT) : tm);
      raf = requestAnimationFrame(loop);
    };
    const t00 = performance.now() / 1000;
    if (dbg) {
      const sched = new Set();
      const fire = (n, err) => {
        if (sched.has(n)) return; sched.add(n);
        const d = n.t - songT(), cx = st.clientWidth / 2, cy = st.clientHeight * 0.8;
        setTimeout(() => { inDown(cx, cy); if (n.k === "s") { const [dx, dy] = DV[n.dir]; inMove(cx + dx * 30, cy + dy * 30); inUp(); } else if (n.k === "c") inUp(); }, Math.max(0, (d + err) * 1000));
        if (n.k === "h") setTimeout(() => inUp(), Math.max(0, (n.e - songT() + err) * 1000));
      };
      const autoAll = (err) => { const t = songT(); for (const n of notes) if (!n.j && n.t - t < 0.32 && n.t - t > -0.05) fire(n, err); };
      dbg.insta3 = {
        st: () => ({ tut, sT: +songT().toFixed(2), over, phase, combo, maxCombo, cnt: { ...cnt }, N, acc: N ? +(sumV / N).toFixed(3) : 0, stray, score: +score.toFixed(3), views, art, cur, clips: clips.length }),
        tut: () => tut,
        tutDo: () => { if (tut === 4) startEdit(); else if (tut > 0) autoAll(0); },
        start: () => startEdit(),
        auto: (err = 0) => autoAll(err),
      };
    }
    render(0, 0);
    raf = requestAnimationFrame(loop);
  },
};
