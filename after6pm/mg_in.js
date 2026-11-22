// 인별그램 미니게임 "결정적 순간": 여행 중 "뭘 올리지…" 하다가 갑자기 나타난 장관(고래·토네이도·유성·번개·오로라·불꽃)을 찍는다.
// 가로 160칸 논리 좌표로 그리되, 캔버스는 기기 해상도로 키워 매끈하게 그린다(11-22 도트 → 고해상도). 화면을 끌어 카메라를 돌리고, 분위기가 꼭대기일 때 셔터.
// mg.js 와 서로 불러 쓰므로, 이 파일 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, noise, vib, rnd, pick, shuffle, clamp, RM, shutterSound } from "./mg.js";

const TRIPS = [
  { id: "whale", place: "제주 바다 여행", think: ["바다 예쁘다…", "근데 인별엔 뭘 올리지?", "바다 사진은 다들 올리잖아…"], wow: "어… 저기 물보라가?!", ev: "고래 점프", ground: "sea", day: 1, sky: ["#2f6fc4", "#7fb8ea", "#e4f2ff"], far: "#6e8fae", gnd: ["#2a78b8", "#0e3c66"], hl: "#bfe3ff" },
  { id: "tornado", place: "대평원 자동차 여행", think: ["끝없는 밀밭…", "찍어도 그냥 노랗기만 해", "하늘이 좀 어두운데?"], wow: "하늘이… 어어어?!", ev: "토네이도", ground: "field", storm: 1, sky: ["#262b33", "#4c5562", "#9a957d"], far: "#3d4038", gnd: ["#a8903f", "#5a4c22"], hl: "#d6bf6a" },
  { id: "meteor", place: "초원 별 보기 캠핑", think: ["별 진짜 많다…", "근데 별 사진은 폰으로 안 나와", "뭐 특별한 거 없나"], wow: "어? 저 불덩이 뭐야?!", ev: "불덩이 유성", ground: "field", night: 1, sky: ["#03050f", "#0f1840", "#2f2a5a"], far: "#090c1c", gnd: ["#141a26", "#06080d"], hl: "#2a3346" },
  { id: "bolt", place: "바닷가 숙소 창가", think: ["비 온다… 망했다", "오늘은 올릴 게 없네", "우르릉…?"], wow: "온다 온다… 크게 온다!", ev: "거대한 번개", ground: "bay", night: 1, storm: 1, sky: ["#0c0f1a", "#232a40", "#3e4460"], far: "#151a28", gnd: ["#1b2236", "#080b14"], hl: "#3a4766" },
  { id: "aurora", place: "북쪽 나라 설원 여행", think: ["춥다… 손 시려", "오로라는 오늘 안 뜬대…", "그냥 숙소 들어갈까"], wow: "하늘이… 움직여?!", ev: "오로라 폭발", ground: "snow", night: 1, sky: ["#020a14", "#081c30", "#173047"], far: "#0d1f30", gnd: ["#d7e3ec", "#8ea6ba"], hl: "#ffffff" },
  { id: "fire", place: "강변 공원 저녁 산책", think: ["치킨 사진 말고…", "뭐 그럴듯한 거 없나", "오늘 무슨 날인가? 사람 많네"], wow: "펑! 불꽃놀이 시작이다!", ev: "황금 불꽃", ground: "river", night: 1, sky: ["#07081e", "#1d1a44", "#3d2a55"], far: "#0e0c22", gnd: ["#17153a", "#07061a"], hl: "#3a3570" },
];
const PEAK = 0.6, VW = 160, WW = 400;
const lerp = (a, b, t) => a + (b - a) * t;
const fmtLike = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, "") + "만" : n.toLocaleString());

export const IN_CSS = `
.mg-trip{background:#000!important}
.mg-tcv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;z-index:0}
.mg-tcv:active{cursor:grabbing}
.mg-vf{position:absolute;inset:10px;pointer-events:none;z-index:2;background:linear-gradient(#fff0 33.2%,#ffffff1c 33.3%,#ffffff1c 33.6%,#fff0 33.7%,#fff0 66.4%,#ffffff1c 66.5%,#ffffff1c 66.8%,#fff0 66.9%),linear-gradient(90deg,#fff0 33.2%,#ffffff1c 33.3%,#ffffff1c 33.6%,#fff0 33.7%,#fff0 66.4%,#ffffff1c 66.5%,#ffffff1c 66.8%,#fff0 66.9%)}
.mg-vf i{position:absolute;width:18px;height:18px;border:2px solid #ffffffd0}
.mg-vf .c1{left:0;top:0;border-right:0;border-bottom:0}.mg-vf .c2{right:0;top:0;border-left:0;border-bottom:0}.mg-vf .c3{left:0;bottom:0;border-right:0;border-top:0}.mg-vf .c4{right:0;bottom:0;border-left:0;border-top:0}
.mg-fbox{position:absolute;left:50%;top:42%;width:30%;aspect-ratio:1;transform:translate(-50%,-50%);border:2px solid #ffffff80;border-radius:6px;z-index:2;pointer-events:none;transition:border-color .1s,box-shadow .1s,width .2s}
.mg-fbox.on{border-color:#4cff7a;box-shadow:0 0 14px #4cff7a,inset 0 0 10px #4cff7a55;width:27%}
.mg-meter{position:absolute;right:14px;top:22%;height:42%;width:9px;border-radius:5px;background:#ffffff2a;z-index:3;pointer-events:none;box-shadow:0 0 0 1px #0006}
.mg-meter em{position:absolute;left:0;right:0;bottom:0;height:0;border-radius:5px;background:linear-gradient(0deg,#ffd166,#ff5e7e)}
.mg-meter::after{content:"";position:absolute;left:-4px;right:-4px;top:0;height:2px;background:#fff}
.mg-meter span{position:absolute;top:-17px;right:-6px;font-size:11px;color:#fff;font-weight:800;text-shadow:0 1px 3px #000;white-space:nowrap}
.mg-meter.hot em{box-shadow:0 0 10px #ff5e7e}
.mg-story{position:absolute;left:12px;right:34px;top:14px;z-index:4;pointer-events:none;transition:opacity .3s}
.mg-story.off{opacity:0}
.mg-place{display:inline-block;background:#000a;color:#fff;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px}
.mg-think{margin-top:6px;display:inline-block;max-width:100%;background:#fffffff0;color:#333;font-size:13.5px;font-weight:700;padding:7px 11px;border-radius:14px 14px 14px 4px;box-shadow:0 4px 12px #0005;min-height:1.2em}
.mg-think:empty{display:none}
.mg-wow{position:absolute;left:50%;top:30%;z-index:5;transform:translate(-50%,-50%) scale(.4);font-size:25px;font-weight:900;color:#fff;white-space:nowrap;text-shadow:0 0 2px #000,0 3px 0 #ff3b5c,0 0 18px #ff3b5c;opacity:0;pointer-events:none}
.mg-wow.on{animation:mgwow 1.4s ease-out forwards}
@keyframes mgwow{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-3deg)}25%{transform:translate(-50%,-50%) scale(1) rotate(2deg)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
.mg-arrow{position:absolute;top:44%;z-index:4;background:#ff3b5c;color:#fff;font-weight:900;font-size:13px;padding:5px 11px;border-radius:99px;box-shadow:0 0 12px #ff3b5c;pointer-events:none;display:none;animation:mgblink .5s infinite alternate}
.mg-arrow.l{left:12px;display:block}.mg-arrow.r{right:30px;display:block}
@keyframes mgblink{to{opacity:.55;transform:scale(.94)}}
.mg-hud{position:absolute;left:16px;bottom:14px;z-index:3;font:700 11px/1 ui-monospace,monospace;color:#ffffffc0;pointer-events:none;letter-spacing:.5px}
.mg-hud b{color:#ff3b5c}
.mg-drag{position:absolute;left:50%;bottom:16%;transform:translateX(-50%);z-index:3;color:#fff;font-size:12px;font-weight:800;background:#0008;padding:4px 10px;border-radius:99px;pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap}
.mg-drag.on{opacity:1}
.mg-trip .mg-pimg{background-size:cover;background-position:center;aspect-ratio:4/3}
.mg-trip .mg-pola{width:min(66%,240px)}
.mg-trip .mg-pcap{font-size:15px}
.mg-ptag{font-size:11px;color:#888;text-align:center;font-weight:700}
.mg-viral{position:absolute;left:50%;top:14%;z-index:8;transform:translateX(-50%);font-size:24px;font-weight:900;color:#ffd166;text-shadow:0 0 3px #000,0 0 16px #ff5e7e;pointer-events:none;animation:mgwow 1.6s ease-out forwards;white-space:nowrap}
.mg-shots span{background-size:cover;background-position:center;position:relative;overflow:hidden}
.mg-shots span b{position:absolute;right:2px;bottom:1px;font-size:11px;color:#fff;text-shadow:0 1px 2px #000}
@media (prefers-reduced-motion:reduce){.mg-wow.on,.mg-viral{animation-duration:.01s}.mg-arrow{animation:none}}
`;

export function gIN2(host, ez, finish) {
  const N = 3, dbgT = typeof window !== "undefined" && window.__mgdbg && window.__mgdbg.trip, trips = dbgT ? [TRIPS.find((x) => x.id === dbgT), ...shuffle(TRIPS.filter((x) => x.id !== dbgT))].slice(0, N) : shuffle(TRIPS).slice(0, N);
  const F = frame(host, "insta", "이건 인생샷 각", "mg-trip", "", `<div class="mg-shots">${trips.map(() => "<span>-</span>").join("")}</div><button class="mg-shut" data-shut aria-label="셔터"></button>`);
  F.foot.style.alignItems = "center"; F.foot.style.justifyContent = "space-between";
  F.stage.insertAdjacentHTML("afterbegin", `<canvas class="mg-tcv"></canvas>`);
  F.stage.insertAdjacentHTML("beforeend", `<div class="mg-vf"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div><div class="mg-fbox"></div><div class="mg-meter"><em></em><span>분위기</span></div>
    <div class="mg-story"><div class="mg-place"></div><br><div class="mg-think"></div></div><div class="mg-wow"></div><div class="mg-arrow"></div><div class="mg-drag">👆 화면을 끌어 카메라를 돌려요</div>
    <div class="mg-hud"><b>●</b> 4K · ISO 800 · 1/1000</div><div class="mg-flash"></div><div class="mg-click">찰칵!</div>`);
  const $ = (s) => F.stage.querySelector(s);
  const cv = $(".mg-tcv"), g = cv.getContext("2d"), fbox = $(".mg-fbox"), meter = $(".mg-meter"), meterE = $(".mg-meter em"), story = $(".mg-story"), placeEl = $(".mg-place"), thinkEl = $(".mg-think"),
    wowEl = $(".mg-wow"), arrow = $(".mg-arrow"), dragHint = $(".mg-drag"), flash = $(".mg-flash"), click = $(".mg-click"), shots = F.foot.querySelectorAll(".mg-shots span");
  let SS = 1, VH = 200, HZ = 124, k = 0, raf = 0, over = false, sum = 0, likesAll = 0, cam = 0, st = null, busy = false, dragged = false;
  const shotV = [];
  F.bar.style.transform = "scaleX(1)";

  // ── 카메라 돌리기(끌기) ──
  let px = null;
  cv.addEventListener("pointerdown", (e) => { px = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
  cv.addEventListener("pointermove", (e) => { if (px == null) return; const dx = (e.clientX - px) * VW / (cv.clientWidth || 1); px = e.clientX; cam = clamp(cam - dx, 0, WW - VW); if (Math.abs(dx) > 0.5) { dragged = true; dragHint.classList.remove("on"); } });
  const up = () => { px = null; }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  // ── 한 판 준비: 장소 그림 재료(별·산·건물·물결)를 미리 만든다 ──
  const setup = () => {
    if (k >= N) return end();
    const T = trips[k], W = cv.clientWidth || 320, H = cv.clientHeight || 400;
    VH = clamp(Math.round(VW * H / W), 120, 320); HZ = Math.round(VH * 0.62);
    SS = clamp(W * Math.min(2, window.devicePixelRatio || 1) / VW, 1, 6); cv.width = Math.round(VW * SS); cv.height = Math.round(VH * SS);
    const dir = rnd() < 0.5 ? 1 : -1, ex = 110 + rnd() * (WW - 220);
    st = {
      T, dir, ex, t0: performance.now(), phase: "calm", calm: 2.4, D: (4.4 + rnd() * 0.7) * ez, p: 0, shot: false, fired: {},
      seed: rnd() * 100,
      stars: Array.from({ length: 70 }, () => [rnd() * (VW + (WW - VW) * 0.2), rnd() * HZ * 0.9, rnd()]),
      clouds: Array.from({ length: T.storm ? 9 : 5 }, () => [rnd() * (VW + (WW - VW) * 0.4), (T.storm ? 4 : 10) + rnd() * VH * 0.22, 14 + rnd() * 26]),
      bld: (() => { const a = []; let x = 0; while (x < VW + (WW - VW) * 0.7) { const w = 6 + Math.floor(rnd() * 10), h = 6 + Math.floor(rnd() * (T.ground === "river" ? 30 : 18)); a.push([x, w, h, Array.from({ length: 12 }, () => rnd() < 0.45)]); x += w + Math.floor(rnd() * 3); } return a; })(),
      rows: Array.from({ length: 40 }, () => [rnd() * WW, rnd()]),
      bolt: null, bursts: [],
    };
    // 번개 모양(본 줄기 + 가지)
    if (T.id === "bolt") {
      const mk = (x, y, len, dx) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { x += (rnd() - 0.5) * 7 + dx; y += 3 + rnd() * 3; pts.push([x, y]); } return pts; };
      const main = mk(0, VH * 0.1, Math.ceil((HZ - VH * 0.1) / 4.5), 0); main[main.length - 1][1] = HZ - 6;
      st.bolt = [main, mk(main[4][0], main[4][1], 6, 1.6), mk(main[9][0], main[9][1], 5, -1.8), mk(main[13]?.[0] || 0, main[13]?.[1] || HZ * 0.7, 4, 1.2)];
      st.tease = [mk((rnd() - 0.5) * 50, VH * 0.08, 5, 1), mk((rnd() - 0.5) * 60, VH * 0.1, 6, -1)];
    }
    if (T.id === "fire") st.bursts = [[0.08, -40, 0.3, 11, "#ff5e7e"], [0.2, 35, 0.22, 13, "#5ec8ff"], [0.3, -15, 0.34, 10, "#b07dff"]].map(([pb, dx, y, r, c]) => ({ pb, dx: dx * (0.8 + rnd() * 0.4), y: VH * y, r, c, big: 0 })).concat([{ pb: PEAK - 0.08, dx: 0, y: VH * 0.24, r: 52, c: "#ffd166", big: 1 }]);
    if (T.id === "meteor") st.frag = Array.from({ length: 16 }, () => [rnd() * 6.283, 18 + rnd() * 30]);
    // 처음엔 장관이 화면 밖(옆)에 있게
    cam = clamp(ex - VW / 2 + (rnd() < 0.5 ? -1 : 1) * (VW * (0.6 + rnd() * 0.25)), 0, WW - VW);
    busy = false; F.sc.textContent = `${k + 1}/${N}장`;
    placeEl.textContent = "📍 " + T.place; story.classList.remove("off"); thinkEl.textContent = "";
    wowEl.classList.remove("on"); arrow.className = "mg-arrow"; meterE.style.height = "0"; meter.classList.remove("hot");
    T.think.forEach((line, i) => setTimeout(() => { if (st && st.T === T && st.phase === "calm") { thinkEl.textContent = "💭 " + line; SFX.tok(); } }, 150 + i * 750));
    if (!dragged && k === 0) setTimeout(() => dragHint.classList.add("on"), 600);
  };

  // ── 분위기(타이밍) ──
  const mood = (p) => (p < PEAK ? Math.pow(p / PEAK, 1.6) : Math.max(0, 1 - (p - PEAK) / 0.3));
  // 장관의 화면 위치(구도 계산용)
  const evPos = (p, t) => {
    const T = st.T, sx = st.ex - cam;
    if (T.id === "whale") { const q = (p - 0.38) / 0.44; const by = HZ + (VH - HZ) * 0.3; if (q <= 0 || q >= 1) return [sx + (q >= 1 ? 13 * st.dir : 0), by]; return [sx + (q - 0.5) * 26 * st.dir, by - Math.sin(q * Math.PI) * VH * 0.3]; }
    if (T.id === "tornado") return [sx + (p - 0.5) * 60 * st.dir, (VH * 0.16 + HZ) / 2];
    if (T.id === "meteor") { const h = meteorHead(p); return [h[0] - cam, h[1]]; }
    if (T.id === "bolt") return [sx, (VH * 0.1 + HZ) / 2];
    if (T.id === "aurora") return [sx, VH * 0.22];
    if (T.id === "fire") return [sx, VH * 0.24];
    return [sx, VH / 2];
  };
  const meteorHead = (p) => { const q = Math.pow(clamp(p / PEAK, 0, 1), 1.3); return [lerp(st.ex - st.dir * 80, st.ex + st.dir * 6, q), lerp(VH * 0.04, VH * 0.3, q)]; };

  // ── 그리기 ──
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const ell = (x, y, rx, ry, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 6.283); g.fill(); g.globalAlpha = 1; };
  const glow = (x, y, r, c, a = 1) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, c + "00"); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  const ridgeY = (u) => HZ - VH * (0.05 + 0.035 * Math.sin(u * 0.03 + st.seed) + 0.02 * Math.sin(u * 0.081 + st.seed * 2) + 0.008 * Math.sin(u * 0.23));

  const drawSky = (t) => {
    const T = st.T, sg = g.createLinearGradient(0, 0, 0, HZ);
    sg.addColorStop(0, T.sky[0]); sg.addColorStop(0.6, T.sky[1]); sg.addColorStop(1, T.sky[2]); g.fillStyle = sg; g.fillRect(0, 0, VW, HZ + 1);
    if (T.night) for (const [x, y, b] of st.stars) { const sx = x - cam * 0.2; if (sx < -1 || sx > VW) continue; g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + b * 2) + b * 9)) * b; R(sx, y, 1, 1, b > 0.85 ? "#ffe9b0" : "#ffffff"); }
    g.globalAlpha = 1;
    if (T.day) { const sx = 120 - cam * 0.15; glow(sx, VH * 0.16, 26, "#fff6d0", 0.8); ell(sx, VH * 0.16, 7, 7, "#fffbe8"); }
    if (T.id === "fire" || T.id === "meteor") { const mx = 30 - cam * 0.15; ell(mx, VH * 0.12, 5, 5, "#f4f0d8"); ell(mx + 2, VH * 0.12 - 1, 4.5, 4.5, T.sky[0]); }
    for (const [x, y, r] of st.clouds) {
      const sx = x - cam * 0.4 + (T.storm ? Math.sin(t * 0.3 + x) * 2 : t * 1.5 % 400);
      const c = T.storm ? (T.night ? "#1a1f2e" : "#3a3f48") : T.night ? "#1c2140" : "#ffffff";
      const ca = T.storm ? 0.95 : T.night ? 0.55 : 0.85; ell(sx, y, r, r * 0.32, c, ca); ell(sx - r * 0.45, y + 2, r * 0.6, r * 0.25, c, ca); ell(sx + r * 0.5, y + 1, r * 0.55, r * 0.28, T.storm ? (T.night ? "#141826" : "#30343c") : T.night ? "#252a4e" : "#eef6ff", T.night && !T.storm ? 0.6 : 0.9);
    }
  };
  const drawRidge = () => {
    const T = st.T; if (T.ground === "river" || T.ground === "bay") return;
    g.fillStyle = T.far; g.beginPath(); g.moveTo(0, HZ + 1);
    for (let x = 0; x <= VW; x += 2) g.lineTo(x, Math.round(ridgeY(x + cam * 0.5)));
    g.lineTo(VW, HZ + 1); g.closePath(); g.fill();
    if (T.ground === "snow") { g.fillStyle = "#c8d6e2"; for (let x = 0; x <= VW; x += 2) { const y = ridgeY(x + cam * 0.5); if (y < HZ - VH * 0.06) R(x, y, 2, 2, "#c8d6e2"); } }
  };
  const drawCity = (t, flashA) => {
    const T = st.T, k2 = 0.7;
    for (const [x, w, h, win] of st.bld) {
      const sx = x - cam * k2; if (sx + w < 0 || sx > VW) continue;
      R(sx, HZ - h, w, h, flashA > 0.2 ? "#2a3150" : T.far);
      for (let j = 0; j < win.length; j++) { if (!win[j]) continue; const wx = sx + 1 + (j % 3) * 2 * (w / 7), wy = HZ - h + 2 + Math.floor(j / 3) * 4; if (wy < HZ - 1) R(wx, wy, 1, 1, "#ffd98a"); }
    }
  };
  const drawGround = (t) => {
    const T = st.T, gg = g.createLinearGradient(0, HZ, 0, VH);
    gg.addColorStop(0, T.gnd[0]); gg.addColorStop(1, T.gnd[1]); g.fillStyle = gg; g.fillRect(0, HZ, VW, VH - HZ);
    if (T.ground === "sea" || T.ground === "bay" || T.ground === "river") {
      for (const [x, s] of st.rows) {
        const y = HZ + 1 + s * (VH - HZ - 2), depth = (y - HZ) / (VH - HZ), sx = ((x - cam * (0.6 + depth * 0.8) + t * (4 + s * 6) * (s > 0.5 ? 1 : -1)) % (VW + 30) + VW + 30) % (VW + 30) - 15;
        g.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(t * 2 + x)); R(sx, y, 3 + depth * 7, 1, T.hl); g.globalAlpha = 1;
      }
      if (T.ground === "river") for (const [x, w, h, win] of st.bld) { const sx = x - cam * 0.7; if (sx + w < 0 || sx > VW || !win[0]) continue; g.globalAlpha = 0.22; R(sx + 1, HZ + 1, 1, h * 0.8 * (0.6 + 0.4 * Math.sin(t * 3 + x)), "#ffd98a"); g.globalAlpha = 1; }
    } else if (T.ground === "field") {
      for (const [x, s] of st.rows) { const y = HZ + 2 + s * s * (VH - HZ - 4), depth = (y - HZ) / (VH - HZ), sx = ((x - cam * (0.8 + depth * 0.9)) % (VW + 20) + VW + 20) % (VW + 20) - 10; const sw = Math.sin(t * 2 + x) * depth * 1.5; g.fillStyle = T.hl; g.globalAlpha = 0.5; g.fillRect(Math.round(sx + sw), Math.round(y - 2 - depth * 4), 1, Math.round(2 + depth * 4)); g.globalAlpha = 1; }
      if (T.id === "tornado") { const ry = VH - (VH - HZ) * 0.3; R(0, ry, VW, (VH - HZ) * 0.16, "#3a3a3a"); for (let x = -((cam * 1.6) % 14); x < VW; x += 14) R(x, ry + (VH - HZ) * 0.07, 6, 1, "#e8c84a"); const cx = 20 - cam * 1.6 + 60; R(cx, ry - 6, 22, 6, "#7a2a2a"); R(cx + 4, ry - 10, 12, 5, "#6a2424"); R(cx + 6, ry - 9, 4, 3, "#9fc3d8"); R(cx + 11, ry - 9, 4, 3, "#9fc3d8"); R(cx + 3, ry, 4, 2, "#111"); R(cx + 15, ry, 4, 2, "#111"); }
      if (T.id === "meteor") { const tx = 230 - cam * 1.1; g.fillStyle = "#d9772b"; g.beginPath(); g.moveTo(tx, VH - 14); g.lineTo(tx + 10, VH - 30); g.lineTo(tx + 20, VH - 14); g.fill(); glow(tx + 10, VH - 20, 14, "#ffb35c", 0.5); R(tx + 9, VH - 18, 2, 4, "#2a1a0a"); }
    } else if (T.ground === "snow") {
      for (let x = 0; x < VW; x += 2) { const y = HZ + 6 + Math.sin((x + cam * 1.2) * 0.05) * 3; R(x, y, 2, 1, "#ffffff"); }
      const hx = 280 - cam * 1.1; R(hx, HZ + 4, 14, 9, "#4a2e22"); g.fillStyle = "#e9f1f7"; g.beginPath(); g.moveTo(hx - 2, HZ + 5); g.lineTo(hx + 7, HZ - 2); g.lineTo(hx + 16, HZ + 5); g.fill(); R(hx + 3, HZ + 7, 3, 3, "#ffd98a"); glow(hx + 4, HZ + 8, 9, "#ffcc66", 0.5);
    }
    if (T.ground === "river" || T.ground === "bay") { R(0, VH - 5, VW, 1, "#6b6f80"); for (let x = -((cam * 1.8) % 12); x < VW; x += 12) R(x, VH - 5, 1, 5, "#6b6f80"); }
  };

  // ── 장관 그리기 ──
  const drawWhale = (p, t) => {
    const by = HZ + (VH - HZ) * 0.3, sx0 = st.ex - cam, s = VH / 200, d = st.dir;
    if (p < 0.4) { for (let i = 0; i < 3; i++) { const r = ((p * 2.6 + i / 3) % 1) * 16; g.globalAlpha = (1 - r / 16) * 0.8; g.strokeStyle = "#e8f6ff"; g.lineWidth = 1; g.beginPath(); g.ellipse(sx0, by, r * s + 1, r * 0.25 * s + 0.5, 0, 0, 6.283); g.stroke(); } g.globalAlpha = 1;
      if (p > 0.12 && p < 0.34) { const h = Math.sin((p - 0.12) / 0.22 * Math.PI) * 14 * s; for (let i = 0; i < 14; i++) R(sx0 + (rnd() - 0.5) * 4, by - rnd() * h, 1, 1, "#ffffff"); R(sx0 - 3, by - 1, 6, 2, "#1e3348"); } }
    const q = (p - 0.38) / 0.44;
    if (q > 0 && q < 1) {
      const x = sx0 + (q - 0.5) * 26 * d, y = by - Math.sin(q * Math.PI) * VH * 0.3, ang = -(0.5 - q) * 1.9 * d;
      g.save(); g.translate(x, y); g.rotate(ang); g.scale(d * s * 1.3, s * 1.3);
      // 꼬리 → 몸 → 배 → 지느러미
      g.fillStyle = "#24364a"; g.beginPath(); g.moveTo(-18, -2); g.lineTo(-30, -1); g.lineTo(-38, -8); g.lineTo(-33, 0); g.lineTo(-38, 8); g.lineTo(-30, 1); g.lineTo(-18, 3); g.fill();
      ell(0, 0, 24, 8, "#2d4560"); ell(-4, -2, 18, 4.5, "#3a5878");
      ell(3, 3.5, 19, 4, "#d6e2ea"); g.fillStyle = "#9fb3c2"; for (let i = -10; i < 18; i += 3) g.fillRect(i, 2, 1, 4);
      ell(17, -1.5, 1.2, 1.2, "#0b1520");
      g.fillStyle = "#e3edf3"; g.beginPath(); g.moveTo(6, 4); g.lineTo(-4, 17); g.lineTo(-8, 16); g.lineTo(1, 4); g.fill();
      g.restore();
      for (let i = 0; i < 12; i++) R(x - d * (rnd() * 26 * s) , y + rnd() * 10 * s + Math.sin(q * Math.PI) * rnd() * 12, 1, 1 + rnd(), "#ffffff");
    }
    // 물기둥: 뛰어오를 때와 떨어질 때
    for (const [c, a] of [[0.38, 0.12], [0.82, 0.18]]) { const b = (p - c) / a; if (b < 0 || b > 1) continue; const x = sx0 + (c === 0.38 ? -13 : 13) * d; for (let i = 0; i < 40; i++) { const ang = -Math.PI / 2 + (i / 40 - 0.5) * 2.4, sp = (8 + (i * 37 % 13)) * s * (c === 0.82 ? 1.6 : 1); const dx = Math.cos(ang) * sp * b * 1.4, dy = Math.sin(ang) * sp * b * 2.2 + b * b * 14 * s; g.globalAlpha = 1 - b; R(x + dx, by + dy, 1 + (i % 3 === 0), 1 + (i % 2), "#ffffff"); } g.globalAlpha = 1; ell(x, by, 10 * s * (1 + b), 2 * s, "#ffffff", 0.6 * (1 - b)); }
  };
  const drawTornado = (p, t) => {
    const sx = st.ex - cam + (p - 0.5) * 60 * st.dir, top = VH * 0.16, gy = HZ + 4, reach = clamp(p / 0.42, 0, 1), I = mood(p), s = VH / 200;
    ell(sx, top - 4, 60 * s, 12 * s, "#20252c", 0.95); ell(sx + Math.sin(t * 1.5) * 6, top, 38 * s, 7 * s, "#2b3038", 0.95);
    for (let i = 0; i < 6; i++) { const a = t * 2 + i; R(sx + Math.cos(a) * 34 * s, top - 4 + Math.sin(a) * 6 * s, 6, 1, "#4a5260"); }
    const bot = top + (gy - top) * reach;
    for (let y = top; y < bot; y++) {
      const yr = (y - top) / (gy - top), w = lerp(22, 4, Math.pow(yr, 0.55)) * s * (0.85 + 0.35 * I), xo = Math.sin(y * 0.14 - t * 7) * 1.6 * yr + Math.sin(t * 1.1 + st.seed) * 7 * yr * yr;
      g.globalAlpha = 0.88; R(sx + xo - w, y, w * 2, 1, yr < 0.5 ? "#3a4049" : "#4f4a3e");
      g.globalAlpha = 0.6; R(sx + xo + Math.sin(y * 0.35 - t * 11) * w * 0.75, y, 1, 1, "#9aa0a8"); g.globalAlpha = 1;
    }
    if (reach >= 1) {
      const xo = Math.sin(t * 1.1 + st.seed) * 7;
      ell(sx + xo, gy - 2, (14 + I * 14) * s, (5 + I * 5) * s, "#6b5a3a", 0.55 + 0.3 * I);
      const n = Math.round(10 + 40 * I);
      for (let i = 0; i < n; i++) { const a = t * (5 + (i % 3)) + i * 2.4, r = (6 + (i % 6) * 3 + I * 10) * s, y = gy - ((i * 7) % 22) * (0.5 + I) * s; R(sx + xo + Math.cos(a) * r, y + Math.sin(a) * 2, 1 + (i % 4 === 0), 1, i % 5 === 0 ? "#8a6a3a" : "#3a2e22"); }
    }
    if (I > 0.6 && Math.sin(t * 23) > 0.92) { g.globalAlpha = 0.18; R(0, 0, VW, HZ, "#dfe8ff"); g.globalAlpha = 1; }
  };
  const drawMeteor = (p, t) => {
    const [hx0, hy] = meteorHead(p), hx = hx0 - cam, q = clamp(p / PEAK, 0, 1), d = st.dir;
    if (p < PEAK + 0.02) {
      const len = 10 + 60 * q, ux = -d * 0.94, uy = -0.34;
      const gr = g.createLinearGradient(hx, hy, hx + ux * len, hy + uy * len); gr.addColorStop(0, "#fff6d0"); gr.addColorStop(0.3, "#ffb347cc"); gr.addColorStop(1, "#ff5e2000");
      g.strokeStyle = gr; g.lineWidth = 1 + 3 * q; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + ux * len, hy + uy * len); g.stroke();
      glow(hx, hy, 4 + 14 * q, "#ffd27a", 0.9); ell(hx, hy, 1 + 1.5 * q, 1 + 1.5 * q, "#ffffff");
      g.globalAlpha = 0.12 * q; R(0, 0, VW, VH, "#ff9a3c"); g.globalAlpha = 1;
    } else {
      const b = clamp((p - PEAK) / 0.32, 0, 1);
      glow(hx, hy, 20 + 60 * b, "#fff0c0", 1 - b); ell(hx, hy, 6 * (1 - b) + 1, 6 * (1 - b) + 1, "#ffffff", 1 - b);
      for (const [a, sp] of st.frag) { const fx = hx + Math.cos(a) * sp * b, fy = hy + Math.sin(a) * sp * b + b * b * 20; g.globalAlpha = 1 - b; g.strokeStyle = "#ffb347"; g.lineWidth = 1; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx - Math.cos(a) * 5, fy - Math.sin(a) * 5 - 1); g.stroke(); R(fx, fy, 1, 1, "#fff6d0"); }
      g.globalAlpha = 0.35 * (1 - b); R(0, 0, VW, VH, "#ffb060"); g.globalAlpha = 1;
    }
  };
  const drawBolt = (p, t) => {
    const sx = st.ex - cam, line = (pts, w, c, a) => { g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(sx + x, y) : g.moveTo(sx + x, y))); g.stroke(); g.globalAlpha = 1; };
    for (const c of [0.16, 0.29, 0.44]) if (Math.abs(p - c) < 0.025) glow(sx + Math.sin(c * 99) * 40, VH * 0.1, 30, "#bcd4ff", 0.6);
    if (Math.abs(p - 0.34) < 0.02) st.tease.forEach((b) => { line(b, 2, "#9fc8ff", 0.4); line(b, 1, "#ffffff", 0.9); });
    if (p > 0.565 && p < 0.7 && (Math.sin(t * 70) > -0.4 || p < 0.6)) {
      const a = 1 - (p - 0.565) / 0.135;
      g.globalAlpha = 0.55 * a; R(0, 0, VW, VH, "#e8f0ff"); g.globalAlpha = 1;
      st.bolt.forEach((b, i) => { line(b, i ? 2 : 4, "#8fbfff", 0.45 * a + 0.2); line(b, 1, "#ffffff", a * 0.8 + 0.2); });
      glow(sx + st.bolt[0][st.bolt[0].length - 1][0], HZ - 4, 18, "#cfe2ff", a);
    }
  };
  const drawAurora = (p, t) => {
    const sx = st.ex - cam, a = p < PEAK ? 0.2 + 0.8 * Math.pow(p / PEAK, 1.5) : Math.max(0.15, 1 - (p - PEAK) * 2.6), span = 110;
    for (let x = -span; x <= span; x++) {
      const X = sx + x; if (X < 0 || X >= VW) continue;
      const fall = Math.pow(1 - Math.abs(x) / span, 0.6), y0 = VH * 0.13 + Math.sin(x * 0.045 + t * 0.9) * 6 + Math.sin(x * 0.013 - t * 0.5) * 9;
      const len = (20 + 14 * Math.sin(x * 0.11 + t * 2.2) + 10 * Math.sin(x * 0.031 - t)) * a * fall * VH / 200 * 1.5;
      g.globalAlpha = 0.35 * a * fall; R(X, y0 - len * 0.5, 1, len * 0.5, "#b06cff");
      g.globalAlpha = 0.7 * a * fall; R(X, y0, 1, len * 0.7, "#5dffa0");
      g.globalAlpha = 0.95 * a * fall; R(X, y0 + len * 0.62, 1, 2, "#d8ffe9");
      g.globalAlpha = 0.25 * a * fall; R(X, y0 + len * 0.7, 1, len * 0.4, "#3ad48a");
    }
    g.globalAlpha = 1;
    if (Math.abs(p - PEAK) < 0.14) { const c = 1 - Math.abs(p - PEAK) / 0.14; glow(sx, VH * 0.2, 30 + 20 * c, "#a8ffd0", 0.6 * c); for (let i = 0; i < 18; i++) { const an = i / 18 * 6.283 + t * 0.4; g.globalAlpha = 0.5 * c; g.strokeStyle = "#c8ffe0"; g.beginPath(); g.moveTo(sx, VH * 0.2); g.lineTo(sx + Math.cos(an) * 40 * c, VH * 0.2 + Math.sin(an) * 26 * c); g.stroke(); } g.globalAlpha = 1; }
    g.globalAlpha = 0.18 * a; R(0, HZ, VW, VH - HZ, "#5dffa0"); g.globalAlpha = 1;
  };
  const drawFire = (p, t) => {
    const sx = st.ex - cam;
    for (const b of st.bursts) {
      const x = sx + b.dx;
      if (b.big && p > 0.4 && p < b.pb) { const q = (p - 0.4) / (b.pb - 0.4), y = lerp(HZ, b.y, q); for (let i = 0; i < 8; i++) { g.globalAlpha = 1 - i / 8; R(x + Math.sin(i + t * 20) * 0.5, y + i * 2, 1, 2, "#ffe0a0"); } g.globalAlpha = 1; glow(x, y, 4, "#ffd166"); }
      const q = (p - b.pb) / (b.big ? 0.3 : 0.2); if (q < 0 || q > 1) continue;
      const n = b.big ? 64 : 26, rr = b.r * (VH / 200) * (1 - Math.pow(1 - q, 3));
      if (q < 0.25) glow(x, b.y, rr * 1.2, b.c, (0.25 - q) * 3);
      for (let i = 0; i < n; i++) { const an = i / n * 6.283 + (b.big ? (i % 2) * 0.05 : 0), r = rr * (b.big && i % 2 ? 0.7 : 1), fx = x + Math.cos(an) * r, fy = b.y + Math.sin(an) * r + q * q * 10; g.globalAlpha = (1 - q) * (b.big && q > 0.5 ? 0.6 + 0.4 * Math.sin(t * 40 + i) : 1); R(fx, fy, b.big ? 2 : 1, b.big ? 2 : 1, i % 7 === 0 ? "#ffffff" : b.c); if (q > 0.15) { g.globalAlpha *= 0.4; R(x + Math.cos(an) * r * 0.75, b.y + Math.sin(an) * r * 0.75 + q * q * 7, 1, 1, b.c); } }
      g.globalAlpha = 0.35 * (1 - q); R(x - 2, HZ + 1, 4, (VH - HZ) * 0.7, b.c); g.globalAlpha = 1;
      if (b.big) { g.globalAlpha = 0.15 * (1 - q); R(0, 0, VW, VH, "#ffcc66"); g.globalAlpha = 1; }
    }
  };
  const DRAW = { whale: drawWhale, tornado: drawTornado, meteor: drawMeteor, bolt: drawBolt, aurora: drawAurora, fire: drawFire };
  const SKYEV = { meteor: 1, aurora: 1, fire: 1 };

  const render = (t) => {
    const T = st.T, p = st.phase === "ev" ? st.p : st.phase === "after" ? 1 : -1;
    g.setTransform(SS, 0, 0, SS, 0, 0);
    drawSky(t);
    if (p >= 0 && SKYEV[T.id]) DRAW[T.id](p, t);
    drawRidge();
    if (T.ground === "river" || T.ground === "bay") drawCity(t, 0);
    if (p >= 0 && T.id === "bolt") DRAW.bolt(p, t);
    drawGround(t);
    if (p >= 0 && (T.id === "whale" || T.id === "tornado")) DRAW[T.id](p, t);
    // 손떨림 느낌의 아주 작은 흔들림은 캔버스 전체를 CSS로
  };

  // 지금 구도(0~1): 장관이 가운데에 가까울수록
  const framing = () => {
    const [x, y] = evPos(st.p, 0);
    if (x < 0 || x > VW) return 0;
    const fx = clamp(1 - Math.abs(x - VW / 2) / (VW * 0.45), 0, 1), fy = clamp(1 - Math.abs(y - VH * 0.42) / (VH * 0.55), 0, 1);
    return fx * (0.75 + 0.25 * fy);
  };

  const loop = () => {
    if (over) return;
    const now = performance.now(), t = (now - st.t0) / 1000;
    if (st.phase === "calm" && t >= st.calm) {
      st.phase = "ev"; st.te = now; story.classList.add("off");
      wowEl.textContent = st.T.wow; wowEl.classList.remove("on"); void wowEl.offsetWidth; wowEl.classList.add("on");
      if (!RM()) { F.stage.classList.remove("mg-shake"); void F.stage.offsetWidth; F.stage.classList.add("mg-shake"); setTimeout(() => F.stage.classList.remove("mg-shake"), 320); }
      noise(0.7, 90, 0.3, 0, 0.6); tone(220, 0.25, "sawtooth", 0.06, 200); vib([20, 40, 20]);
    }
    if (st.phase === "ev") {
      st.p = (now - st.te) / 1000 / st.D; if (window.__mgdbg && window.__mgdbg.p != null) st.p = window.__mgdbg.p;
      const T = st.T;
      const once = (key, at, fn) => { if (!st.fired[key] && st.p >= at) { st.fired[key] = 1; fn(); } };
      if (T.id === "bolt") { once("b", 0.565, () => { noise(0.25, 2500, 0.25, 0, 0.7); noise(1.6, 80, 0.45, 0.05, 0.5); vib(60); }); once("t", 0.34, () => noise(0.9, 110, 0.15, 0, 0.6)); }
      if (T.id === "fire") st.bursts.forEach((b, i) => once("f" + i, b.pb, () => { noise(b.big ? 0.9 : 0.4, b.big ? 140 : 300, b.big ? 0.4 : 0.2, 0, 0.6); if (b.big) { noise(1.4, 4000, 0.06, 0.2, 0.5); vib(40); } }));
      if (T.id === "whale") { once("w1", 0.38, () => noise(0.5, 700, 0.2, 0, 0.6)); once("w2", 0.82, () => { noise(0.9, 500, 0.35, 0, 0.5); vib(40); }); }
      if (T.id === "meteor") { once("m0", 0.05, () => noise(2.2, 900, 0.06, 0, 0.4)); once("m1", PEAK, () => { noise(1.2, 120, 0.4, 0, 0.5); vib(50); }); }
      if (T.id === "tornado") once("t0", 0.02, () => { noise(3.5, 260, 0.12, 0, 0.4); noise(3, 600, 0.05, 0.4, 0.5); });
      if (T.id === "aurora") once("a0", 0.3, () => [392, 523, 659, 784].forEach((f, i) => tone(f, 1.2, "sine", 0.03, 0, i * 0.35)));
      const m = mood(st.p); meterE.style.height = Math.round(m * 100) + "%"; meter.classList.toggle("hot", m > 0.8);
      F.bar.style.transform = `scaleX(${clamp(1 - st.p, 0, 1)})`;
      const [ex] = evPos(st.p, t); arrow.className = "mg-arrow" + (ex < 6 ? " l" : ex > VW - 6 ? " r" : ""); arrow.textContent = ex < 6 ? "◀ 저기!" : ex > VW - 6 ? "저기! ▶" : "";
      fbox.classList.toggle("on", framing() > 0.72);
      if (st.p >= 1 && !busy) shoot(true);
    }
    render(t);
    raf = requestAnimationFrame(loop);
  };

  const snap = () => { try { return cv.toDataURL("image/jpeg", 0.88); } catch (e) { return ""; } };
  const polaroid = (img, v, f, tm) => {
    const T = st.T, good = v >= 0.6, likes = Math.round((80 + v * v * v * 150000) * (0.85 + rnd() * 0.3)); likesAll += likes;
    const cap = v > 0.85 ? `인생샷! ${T.ev}` : good ? "잘 찍혔다!" : v > 0.3 ? "아깝다… 살짝 빗나감" : "흔들렸다…";
    const why = good ? (v > 0.85 ? "알고리즘이 날 사랑해요" : "") : f < 0.5 ? "구도가 아쉬워요 · 가운데에 담아요" : "타이밍이 아쉬워요 · 분위기 꼭대기에서";
    const el = document.createElement("div"); el.className = "mg-pola" + (good ? "" : " blur"); el.style.setProperty("--r", (rnd() * 12 - 6).toFixed(1) + "deg");
    el.innerHTML = `<div class="mg-pimg" style="background-image:url(${img})"></div><div class="mg-pcap">${cap}</div>${why ? `<div class="mg-ptag">${why}</div>` : ""}<div class="mg-plike">❤️ <b>0</b></div>`;
    F.stage.appendChild(el);
    const b = el.querySelector(".mg-plike b"), t1 = performance.now(), dur = good ? 1100 : 500;
    const cnt = () => { const q = Math.min(1, (performance.now() - t1 - 350) / dur); if (q > 0) b.textContent = fmtLike(Math.round(likes * (1 - Math.pow(1 - q, 3)))); if (q < 1 && el.isConnected) requestAnimationFrame(cnt); else if (good) el.querySelector(".mg-plike").classList.add("pang"); };
    requestAnimationFrame(cnt);
    if (good) for (let i = 0; i < (v > 0.85 ? 18 : 9); i++) { const h = document.createElement("i"); h.className = "mg-heart"; h.textContent = pick(["❤️", "💖", "💗", "🧡", "🔥"]); h.style.left = 30 + rnd() * 40 + "%"; h.style.setProperty("--dx", (rnd() * 160 - 80) + "px"); h.style.setProperty("--dy", -(80 + rnd() * 140) + "px"); h.style.animationDelay = 0.35 + rnd() * 0.5 + "s"; F.stage.appendChild(h); setTimeout(() => h.remove(), 2200); }
    if (v > 0.85) { const vv = document.createElement("div"); vv.className = "mg-viral"; vv.textContent = pick(["떡상! 🔥", "알고리즘 탔다! 🚀", "기사에 실렸다! 📰"]); F.stage.appendChild(vv); setTimeout(() => vv.remove(), 1800); [523, 659, 784, 1046, 1318].forEach((fq, i) => tone(fq, 0.12, "triangle", 0.1, 0, 0.4 + i * 0.07)); }
    setTimeout(() => el.classList.add("away"), 2000); setTimeout(() => el.remove(), 2400);
  };

  const shoot = (miss) => {
    if (over || k >= N || busy || !st) return;
    if (!miss && st.phase === "calm") { F.msg("아직… 뭔가 올 것 같은데?"); SFX.tok(); return; }
    busy = true; let v = 0; dragHint.classList.remove("on");
    if (!miss) {
      const f = framing(), tm = clamp(1 - Math.abs(st.p - PEAK) / (0.13 * ez), 0, 1);
      v = f <= 0 ? tm * 0.12 : clamp(0.42 * f + 0.58 * tm, 0, 1);
      const img = snap();
      shutterSound(); vib(15);
      flash.classList.toggle("soft", v < 0.6); flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
      click.classList.remove("on"); void click.offsetWidth; click.classList.add("on");
      polaroid(img, v, f, tm); fbox.classList.remove("on");
      if (img) { shots[k].style.backgroundImage = `url(${img})`; }
      shots[k].innerHTML = `<b>${Math.round(v * 100)}</b>`;
      if (v >= 0.6) F.hit([F.stage.clientWidth / 2, F.stage.clientHeight * 0.25], Math.round(v * 10), "#ff8fc8"); else F.miss(null);
    } else { shots[k].innerHTML = "놓침"; F.msg(`${st.T.ev}를 놓쳤어요… 😭`); SFX.fail(); }
    sum += v; shotV.push(v);
    st.phase = "after";
    arrow.className = "mg-arrow"; meterE.style.height = "0";
    k++; setTimeout(() => { if (!over) setup(); }, miss ? 1300 : 2500);
  };
  const end = () => {
    if (over) return; over = true; cancelAnimationFrame(raf);
    const s = sum / N;
    finish(s, `결정적 순간 평균 ${Math.round(s * 100)}점 · 좋아요 ${fmtLike(likesAll)}개`, "", trips.map((T, j) => [T.ev, shotV[j] || 0]));
  };
  F.foot.querySelector("[data-shut]").onclick = () => shoot(false);
  if (typeof window !== "undefined" && window.__mgdbg) window.__mgdbg.ins = { get st() { return st; }, setCam: (c) => (cam = c), shoot };
  setup(); raf = requestAnimationFrame(loop);
}
