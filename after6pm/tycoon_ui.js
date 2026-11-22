// 투잡 보드 맨 위 '내 매장 장면'(v4.27, 타이쿤 느낌)
// 파티룸·에어씨앤씨·무인카페 보드 위에 내 가게들을 미니어처로 오밀조밀 세우고, 손님이 드나든다.
// - 그림: 기기 해상도 캔버스 벡터(도트 아님). 손님 몸은 img/body 캐릭터 그림을 작게 잘라 쓰고 다리만 벡터로 걷게 한다.
// - 실제 상태 반영: 지난달 가동률·예약률·잔 수 → 손님 수·불 켜진 창·줄 길이, 별점 4.7↑ 반짝, 공사·준비 중 펜스,
//   성수기 장식, 영업정지·적자 3달 연속은 어둡게, 계절(겨울 눈·여름 노을·봄 꽃잎·가을 낙엽).
// - 가게를 누르면 아래 그 가게 카드로 내려가 반짝 표시. 매장이 없으면 빈 부지 그림.
// - 성능: requestAnimationFrame, 화면 밖·탭 숨김이면 멈춤, 화면이 바뀌어 캔버스가 빠지면 정리.
// ui.js 에서는 tycoonScene(S, "pr"|"airbnb"|"ucafe") 문자열만 보드 맨 위에 꽂는다. 붙이기(mount)는 이 파일이 알아서 한다.
import * as D from "./engine/defs.js";
import { isPeak as prPeak } from "./engine/pr.js";
import * as PR from "./engine/pr.js";
import * as AB from "./engine/abnb.js";
import * as UC from "./engine/ucafe.js";
import * as E from "./engine/core.js";

const H = 212, GY = 150, CURB = 176; // 장면 높이, 가게 바닥선, 인도 끝
const MODELS = new Map(); let SEQ = 0;
// 손님 그림(직접 열어 보고 고름): 파티룸=젊고 밝은 차림, 숙소=여행객, 카페=편한 동네 차림
const PPL = {
  pr: ["c002", "c053", "c009", "c068", "c022", "c079", "c028", "c069", "c038"],
  airbnb: ["c024", "c030", "c047", "c054", "c057", "c070", "c072", "c055"],
  ucafe: ["c010", "c021", "c034", "c051", "c052", "c060", "c074", "c098"],
};
const NEON = { bridal: "#ff7eb6", party: "#ff4fd8", home: "#ffb36b", game: "#5fffb0", study: "#7fd8ff", lecture: "#6aa8ff", work: "#ffcf5a", edu: "#6ff0e0", kids: "#ffe066" };

// ───────── 상태 → 장면 모델 ─────────
const lossRun = (h) => { let n = 0; for (let i = h.length - 1; i >= 0; i--) { const v = typeof h[i] === "number" ? h[i] : h[i]?.profit; if (v < 0) n++; else break; } return n; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function model(S, kind) {
  const cal = S.cal || 1;
  const season = [12, 1, 2].includes(cal) ? "winter" : [6, 7, 8].includes(cal) ? "summer" : [3, 4, 5].includes(cal) ? "spring" : "autumn";
  let stores = [], peak = "", empty = "";
  if (kind === "pr") {
    peak = cal === 12 ? "극성수기" : prPeak(cal) ? "성수기" : "";
    stores = (S.pr?.rooms || []).map((rm) => { const red = Math.max(rm.red || 0, lossRun(rm.hist || [])); return { id: rm.id, name: rm.name, t: "pr", sub: rm.concept, setup: rm.status !== "open", occ: rm.last ? clamp(rm.last.occ, 0, 1) : 0, rating: rm.rating || 0, red, dark: rm.status === "open" && (red >= 3 || (rm.banned || 0) > 0), ban: rm.banned || 0, peak: !!peak }; });
    empty = "첫 파티룸을 열어 보세요";
  } else if (kind === "airbnb") {
    stores = (S.ab?.units || []).map((u) => { const R = D.AB_REGIONS[u.rk] || {}, red = lossRun(u.hist || []), pk = (R.peak || []).includes(cal); return { id: u.id, name: u.name, t: "ab", sub: u.ty, rk: u.rk, setup: !u.last && !u.months, occ: u.last ? clamp(u.last.occ, 0, 1) : 0, rating: u.rating || 0, red, ban: u.banned || 0, dark: (u.banned || 0) > 0 || red >= 3, peak: pk }; });
    peak = stores.some((x) => x.peak) ? "성수기" : (D.AB_SEASON?.[cal - 1] || 1) >= 1.1 ? "여행 시즌" : "";
    empty = "첫 숙소를 열어 보세요";
  } else {
    const sf = D.UC_SEASON?.[cal - 1] || 1;
    peak = sf >= 1.25 ? "아이스 성수기" : season === "winter" ? "" : "";
    stores = (S.uc?.stores || []).map((st) => { const red = lossRun(st.hist || []), cups = st.last?.cups || 0; return { id: st.id, name: st.name, t: "uc", setup: !st.last, occ: clamp(cups / 2600, 0, 1), cups, rating: st.rating || 0, red, ban: 0, dark: red >= 3, broken: !!st.broken, cctv: !!st.cctv, nightOff: st.night === false, chain: st.chain || 0, peak: sf >= 1.25 }; });
    empty = "첫 무인카페를 열어 보세요";
  }
  return { kind, cal, season, peak, stores, empty, off: kind === "ucafe" && season === "winter" };
}
// 시험(#autoN-...-tyc_n3_peak_setup_dark_hi): 매장 수·계절·공사·어둠·별점을 강제로 맞춘다. 시험 해시에서만 돈다.
// 예) #auto2-pr-tyc_n3 · #auto2-abnb-airbnb-tyc_n3_peak · #auto2-ucf-ucafe-tyc_n1_off · -tyc_n0(빈 부지)
function testSetup(S, kind) {
  const h = typeof location !== "undefined" ? location.hash : ""; if (!/tyc_/.test(h) || S._tycT === kind) return; S._tycT = kind;
  const n = +((h.match(/tyc_n(\d+)/) || [])[1] ?? 3), occ = [0.88, 0.55, 0.22, 0.7, 0.4, 0.95, 0.3, 0.6], r = E.R(S); S.cash += 300000;
  if (h.includes("_peak")) S.cal = kind === "pr" ? 12 : kind === "airbnb" ? 10 : 7;
  if (h.includes("_off")) S.cal = kind === "pr" ? 4 : 1;
  if (h.includes("_sum")) S.cal = 8;
  if (kind === "pr") {
    S.pr.rooms = []; const dks = Object.keys(D.DISTRICTS);
    for (let i = 0; i < n; i++) { const dk = dks[i % dks.length]; S.ap = 99; S.hp = S.hpMax; E.act(S, "pr_search", dk); while (S.pending) E.choose(S, 0); const L = S.pr.listings.find((l) => l.dk === dk); if (!L) continue; const c = Object.keys(D.CONCEPTS).filter((k) => !PR.conceptOk(L, k))[i % 3] || Object.keys(D.CONCEPTS).find((k) => !PR.conceptOk(L, k)); PR.contract(S, L.id, { concept: c, interior: 1 }); }
    S.pr.rooms.forEach((rm, i) => { rm.status = "open"; rm.months = 6; rm.rating = i === 0 && h.includes("_hi") ? 4.82 : 4.3 + (i % 3) * 0.1; rm.last = { occ: occ[i], bookings: Math.round(occ[i] * 40), rev: 500, cost: 400, ig: 3, bl: 1 }; rm.hist = [{ profit: 100 }]; });
  } else if (kind === "airbnb") {
    S.ab.units = []; const rks = ["hongdae", "jongno", "jeju", "seongsu", "busan", "gyeongju"];
    for (let i = 0; i < n; i++) { AB.search(S, r, rks[i % rks.length]); const L = S.ab.listings.find((l) => l.rk === rks[i % rks.length]); if (L) AB.contract(S, L.id, L.house && L.owner ? "legal" : "illegal"); }
    if (h.includes("_otel") && S.ab.units.length) S.ab.units.at(-1).ty = "officetel";
    S.ab.units.forEach((u, i) => { u.months = 5; u.rating = i === 0 && h.includes("_hi") ? 4.9 : 4.55; u.last = { occ: occ[i], nights: 20, stays: 8, rev: 300, cost: 200, foreign: 60, q: 1 }; u.hist = [50]; });
  } else {
    S.uc.stores = []; const aks = Object.keys(D.UC_AREAS);
    for (let i = 0; i < n; i++) { UC.search(S, r, aks[i % aks.length]); const L = S.uc.listings.find((l) => l.ak === aks[i % aks.length]); if (L) UC.contract(S, L.id, { machine: i % 2 ? "rent" : "buy" }); }
    S.uc.stores.forEach((st, i) => { st.months = 5; st.rating = i === 0 && h.includes("_hi") ? 4.8 : 4.4; st.cctv = i === 0; st.last = { cups: Math.round(occ[i] * 2600), theft: 10, rev: 300, cost: 220, q: 1 }; st.hist = [40]; });
  }
  const list = kind === "pr" ? S.pr.rooms : kind === "airbnb" ? S.ab.units : S.uc.stores;
  if (h.includes("_setup") && list[0]) { if (kind === "pr") { list[0].status = "setup"; list[0].last = null; } else { list[0].last = null; list[0].months = 0; } }
  if (h.includes("_dark") && list[1]) { if (kind === "airbnb") list[1].banned = 2; else list[1].hist = [-50, -80, -30]; if (kind === "pr") list[1].red = 3; }
  if (h.includes("_broken") && kind === "ucafe" && list[0]) list[0].broken = 1;
  if (h.includes("_night") && kind === "ucafe" && list[0]) { list[0].night = false; if (list[1]) list[1].chain = 1; } // v4.29 밤엔 닫음·옆에 체인
}
export function tycoonScene(S, kind) {
  try {
    testSetup(S, kind);
    const m = model(S, kind), id = ++SEQ; MODELS.set(id, m); if (MODELS.size > 6) MODELS.delete(MODELS.keys().next().value);
    const n = m.stores.length, lab = n ? `내 매장 ${n}곳 장면. 가게를 누르면 그 가게 카드로 가요` : m.empty;
    return `<div class="tyc" data-tyc="${id}" data-k="${kind}"><canvas role="img" aria-label="${lab}"></canvas><div class="tyc-hit"></div></div>`;
  } catch (e) { return ""; }
}

// ───────── 손님 그림(몸은 캐릭터 그림, 다리는 벡터) ─────────
const SPR = {}; // id → { c: 캔버스, leg: 다리 색, ok }
function sprite(id, dpr) {
  const k = id + "@" + dpr; if (SPR[k]) return SPR[k];
  const o = (SPR[k] = { ok: false, c: null, leg: "#2c2f45" });
  const im = new Image(); im.decoding = "async"; im.src = `img/body/${id}.webp`;
  im.onload = () => {
    try {
      const bh = Math.round(26 * dpr * 1.25), bw = Math.round(bh * 240 / 470), c = document.createElement("canvas"); c.width = bw; c.height = bh;
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(im, 240, 0, 240, 470, 0, 0, bw, bh); // 웃는 얼굴 칸
      try { const d = g.getImageData(Math.round(bw * 0.38), bh - 3, 1, 1).data; if (d[3] > 120) o.leg = `rgb(${d[0]},${d[1]},${d[2]})`; } catch (e) {}
      o.c = c; o.ok = true;
    } catch (e) {}
  };
  return o;
}

// ───────── 작은 결정적 난수(장면 연출용, 엔진 난수와 무관) ─────────
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

// ───────── 배치 ─────────
function layout(m, W) {
  const n = Math.min(m.stores.length, 8), out = [], slot = (W - 14) / Math.max(1, n);
  m.stores.slice(0, n).forEach((s, i) => {
    const w = Math.min(112, slot * (n === 1 ? 0.5 : n === 2 ? 0.62 : n <= 5 ? 0.74 : 0.8)), d = Math.max(5, w * 0.15);
    const hb = s.t === "pr" ? 84 : s.t === "uc" ? 72 : s.sub === "officetel" ? 104 : s.sub === "hanok" ? 56 : 62;
    const h = hb * clamp(w / 100, 0.66, 1.04), base = GY, x = 7 + slot * i + (slot - w - d) / 2;
    out.push({ s, x, w, h, d, base, row: 0, slot, door: x + (s.t === "pr" ? w * 0.79 : s.t === "uc" ? w * 0.86 : w * 0.5) });
  });
  return out;
}

// ───────── 그리기 도구 ─────────
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function poly(g, pts, fill) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } }
function box(g, x, base, w, h, d, cf, cs, ct) {
  const k = 0.55;
  poly(g, [x + w, base, x + w + d, base - d * k, x + w + d, base - h - d * k, x + w, base - h], cs);
  if (ct) poly(g, [x, base - h, x + w, base - h, x + w + d, base - h - d * k, x + d, base - h - d * k], ct);
  const gr = g.createLinearGradient(x, base - h, x, base); gr.addColorStop(0, cf[0]); gr.addColorStop(1, cf[1]); g.fillStyle = gr; g.fillRect(x, base - h, w, h);
  g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(x, base - h, w, 1.2);
}
function mix(a, b, t) { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; }
function font(px, w = 800) { return `${w} ${px}px ${getComputedStyle(document.body).getPropertyValue("--sans") || "sans-serif"}`; }
function tag(g, x, y, text, bg, fg = "#fff", px = 11) {
  g.font = font(px); const tw = g.measureText(text).width, w = tw + 10, h = px + 6;
  rr(g, x - w / 2, y - h / 2, w, h, h / 2); g.fillStyle = bg; g.fill();
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, x, y + 0.5); return w;
}

// ───────── 고정 배경(하늘·먼 빌딩·인도·도로·가게 몸체) ─────────
const SKY = { winter: ["#081028", "#1d2b58", "#4a5c94"], summer: ["#25235f", "#a8507a", "#ffae6a"], spring: ["#1f1c4a", "#6b4f92", "#f19ab4"], autumn: ["#1b1733", "#7a3f58", "#f08a52"] };
function drawStatic(g, W, m, L, rnd) {
  const sk = SKY[m.season], gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, sk[0]); gr.addColorStop(0.62, sk[1]); gr.addColorStop(1, sk[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, GY + 2);
  if (m.season !== "summer") for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`; g.fillRect(rnd() * W, rnd() * 60, 1.2, 1.2); }
  if (m.season === "summer") { const sx = W * 0.8, sy = GY - 52, sg = g.createRadialGradient(sx, sy, 2, sx, sy, 70); sg.addColorStop(0, "rgba(255,225,150,.95)"); sg.addColorStop(0.18, "rgba(255,190,110,.6)"); sg.addColorStop(1, "rgba(255,160,90,0)"); g.fillStyle = sg; g.fillRect(sx - 70, sy - 70, 140, 140); g.fillStyle = "#ffe6a8"; g.beginPath(); g.arc(sx, sy, 13, 0, 7); g.fill(); }
  else { const mx = W * 0.86, my = 26; g.fillStyle = "rgba(255,246,214,.95)"; g.beginPath(); g.arc(mx, my, 9, 0, 7); g.fill(); g.fillStyle = sk[0]; g.beginPath(); g.arc(mx + 4, my - 3, 8, 0, 7); g.fill(); }
  // 먼 빌딩 두 겹
  for (const [lay, col, hi, wc] of [[0, "rgba(20,18,44,.55)", 70, "rgba(255,220,150,.35)"], [1, "rgba(14,12,32,.85)", 50, "rgba(255,210,140,.5)"]]) {
    let x = -rnd() * 20;
    while (x < W) { const bw = 16 + rnd() * 26, bh = 22 + rnd() * hi; g.fillStyle = col; g.fillRect(x, GY - bh - (lay ? 0 : 8), bw, bh + 10);
      for (let yy = GY - bh - (lay ? 0 : 8) + 5; yy < GY - 6; yy += 7) for (let xx = x + 3; xx < x + bw - 3; xx += 5) if (rnd() < 0.22) { g.fillStyle = wc; g.fillRect(xx, yy, 2, 2.5); }
      x += bw + 2 + rnd() * 6; }
  }
  // 인도·도로
  const sw = g.createLinearGradient(0, GY, 0, CURB); sw.addColorStop(0, m.season === "winter" ? "#8f97b8" : "#5a5470"); sw.addColorStop(1, m.season === "winter" ? "#6c7396" : "#423d58"); g.fillStyle = sw; g.fillRect(0, GY, W, CURB - GY);
  g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; for (let x = 0; x < W; x += 18) { g.beginPath(); g.moveTo(x, GY); g.lineTo(x - 8, CURB); g.stroke(); }
  g.fillStyle = "#b9b4cc"; g.fillRect(0, CURB, W, 2.5); g.fillStyle = "#1f1d2c"; g.fillRect(0, CURB + 2.5, W, H - CURB);
  g.fillStyle = "rgba(255,230,140,.5)"; for (let x = 6; x < W; x += 30) g.fillRect(x, 186, 14, 1.6);
  if (m.season === "winter") { g.fillStyle = "rgba(255,255,255,.75)"; for (let x = 0; x < W; x += 3) g.fillRect(x, CURB - 1 - ((x * 7) % 3), 3, 2); }
  // 가로등 기둥(불빛은 움직이는 층)
  for (const lx of lampXs(L, W)) { g.fillStyle = "#2a2838"; g.fillRect(lx - 1, GY - 46, 2.2, 52); g.fillRect(lx - 1, GY - 46, 8, 2); }
  for (const b of L) drawStore(g, b, m);
  if (!L.length) drawLot(g, W, m);
}
function lampXs(L, W) { if (!L.length) return [W * 0.12, W * 0.88]; const f = L.filter((b) => !b.row); const xs = [f[0].x - 6]; for (let i = 0; i < f.length - 1; i++) xs.push((f[i].x + f[i].w + f[i].d + f[i + 1].x) / 2); xs.push(f.at(-1).x + f.at(-1).w + f.at(-1).d + 6); return xs.filter((x) => x > 4 && x < W - 4); }

// 가게 몸체(정적인 부분)
function drawStore(g, b, m) {
  const { s, x, w, h, d, base } = b;
  g.save(); g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(x + w / 2 + d / 2, base + 2, w * 0.62, 4, 0, 0, 7); g.fill(); g.restore();
  if (s.t === "pr") {
    box(g, x, base, w, h, d, ["#4a2475", "#2b1546"], "#22103a", "#5d3590");
    g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1; for (let yy = base - h + 6; yy < base; yy += 5) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    const wx = x + w * 0.07, wy = base - h * 0.64, ww = w * 0.6, wh = h * 0.5; rr(g, wx - 2, wy - 2, ww + 4, wh + 4, 3); g.fillStyle = "#170b28"; g.fill();
    const gl = g.createLinearGradient(wx, wy, wx, wy + wh); gl.addColorStop(0, "#2a1450"); gl.addColorStop(1, "#120720"); g.fillStyle = gl; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = "#130a22"; g.fillRect(x + w * 0.7, base - h * 0.5, w * 0.2, h * 0.5); g.fillStyle = "#3b2160"; g.fillRect(x + w * 0.7, base - h * 0.5, w * 0.2, 2);
    g.fillStyle = "#ffd36b"; g.fillRect(x + w * 0.86, base - h * 0.25, 1.6, 3);
    rr(g, x + w * 0.08, base - h * 0.93, w * 0.84, h * 0.2, 3); g.fillStyle = "#12091f"; g.fill();
  } else if (s.t === "uc") {
    box(g, x, base, w, h, d, ["#7b5638", "#563a26"], "#432c1c", "#8a6546");
    const gx = x + w * 0.06, gy = base - h * 0.56, gw = w * 0.88, gh = h * 0.56; g.fillStyle = "#1b120c"; g.fillRect(gx - 1.5, gy - 1.5, gw + 3, gh + 1.5);
    rr(g, x + w * 0.04, base - h * 0.98, w * 0.92, h * 0.2, 3); g.fillStyle = "#f3e7d1"; g.fill();
    const big = w >= 74, cx = big ? x + w * 0.13 : x + w * 0.46, cy = base - h * 0.88;
    g.fillStyle = "#6b4226"; poly(g, [cx - 4, cy - 3.5, cx + 4, cy - 3.5, cx + 3, cy + 4, cx - 3, cy + 4]); g.fill(); g.strokeStyle = "#6b4226"; g.lineWidth = 1.3; g.beginPath(); g.arc(cx + 4.2, cy, 2.2, -1.4, 1.4); g.stroke(); g.fillStyle = "#c98b5a"; g.fillRect(cx - 4, cy - 4.6, 8, 1.4);
    if (big) { g.font = font(11); g.fillStyle = "#5a3820"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(s.nightOff ? "무인 카페" : "24H 무인", cx + 9.5, cy + 1); }
    const ay = base - h * 0.78, n = Math.max(4, Math.round(w / 11)), sw = w / n;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? "#f6ead6" : "#9c5f3a"; g.beginPath(); g.moveTo(x + i * sw, ay); g.lineTo(x + (i + 1) * sw, ay); g.lineTo(x + (i + 1) * sw, ay + 6); g.arc(x + (i + 0.5) * sw, ay + 6, sw / 2, 0, Math.PI); g.closePath(); g.fill(); }
    poly(g, [x + w, ay, x + w + d, ay - d * 0.55, x + w + d, ay + 4 - d * 0.55, x + w, ay + 6], "#7a4a2d");
    if (s.cctv) { g.fillStyle = "#d8d8e0"; g.fillRect(x + w - 6, base - h * 0.6 - 6, 6, 3.5); g.fillStyle = "#ff4d5e"; g.fillRect(x + w - 6, base - h * 0.6 - 5, 1.5, 1.5); }
  } else drawHouse(g, b);
  if (s.peak && !s.setup && !s.dark) { // 성수기 깃발
    const y0 = s.t === "pr" ? base - h * 0.7 : s.t === "uc" ? base - h * 0.56 + 2 : base - h - 2, cols = ["#ff6b7f", "#f5c04e", "#5fe0a0", "#6aa8ff", "#ff9f5a"]; g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + w / 2, y0 + 7, x + w, y0); g.stroke();
    for (let i = 1; i < 8; i++) { const t = i / 8, px = x + w * t, py = y0 + 14 * t * (1 - t); poly(g, [px - 2.4, py, px + 2.4, py, px, py + 5], cols[i % 5]); }
  }
  if (s.setup) drawFence(g, b);
}
function drawHouse(g, b) {
  const { s, x, w, h, d, base } = b;
  if (s.sub === "officetel") {
    box(g, x, base, w, h, d, ["#5b6c86", "#3a465c"], "#2c3648", "#6f81a0");
    g.fillStyle = "#24304a"; g.fillRect(x + w * 0.36, base - 16, w * 0.28, 16);
  } else if (s.sub === "hanok") {
    box(g, x, base, w, h, d, ["#efe4cc", "#c9b896"], "#9c8a68", null);
    g.fillStyle = "#5a3a22"; for (const t of [0, 0.33, 0.67, 1]) g.fillRect(x + w * t - (t ? 2 : 0), base - h, 2, h); g.fillRect(x, base - 3, w, 3);
    const ry = base - h, ov = w * 0.16, rh = h * 0.5, L0 = x - ov, R0 = x + w + d + ov, top = ry - rh;
    const rg = g.createLinearGradient(0, top, 0, ry + 4); rg.addColorStop(0, "#4a505c"); rg.addColorStop(1, "#23272f"); g.fillStyle = rg;
    g.beginPath(); g.moveTo(L0, ry - 7); g.quadraticCurveTo(x + (w + d) / 2, ry + 6, R0, ry - 7); g.lineTo(R0 - ov * 1.6, top + 3); g.quadraticCurveTo(x + (w + d) / 2, top + 6, L0 + ov * 1.6, top + 3); g.closePath(); g.fill();
    g.save(); g.clip(); g.strokeStyle = "rgba(255,255,255,.13)"; g.lineWidth = 0.9; for (let k = 0; k <= 12; k++) { const fx = L0 + (R0 - L0) * k / 12; g.beginPath(); g.moveTo(fx, ry + 4); g.lineTo(x + (w + d) / 2 + (fx - x - (w + d) / 2) * 0.7, top); g.stroke(); } g.restore();
    g.strokeStyle = "#e9e4da"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L0, ry - 7); g.quadraticCurveTo(x + (w + d) / 2, ry + 6, R0, ry - 7); g.stroke();
    g.fillStyle = "#1a1d23"; rr(g, L0 + ov * 1.4, top - 2, R0 - L0 - ov * 2.8, 4, 2); g.fill(); g.fillStyle = "#e9e4da"; g.fillRect(L0 + ov * 1.4, top - 2, 2.5, 4); g.fillRect(R0 - ov * 1.4 - 2.5, top - 2, 2.5, 4);
  } else {
    const roofH = h * 0.42, big = s.sub === "detached";
    box(g, x, base, w, h, d, big ? ["#f1e6d0", "#c7b493"] : ["#e7d6c2", "#bba58c"], "#8f7a62", null);
    const top = base - h - roofH; poly(g, [x - 2, base - h, x + w / 2, top, x + w + 2, base - h], big ? "#e8dcc4" : "#dcc9b2");
    poly(g, [x + w / 2, top, x + w + 2, base - h, x + w + d + 2, base - h - d * 0.55, x + w / 2 + d, top - d * 0.55], big ? "#3f5f78" : "#8a3f2e");
    g.strokeStyle = big ? "#2e475c" : "#6a2e22"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 3, base - h + 1); g.lineTo(x + w / 2, top - 1); g.lineTo(x + w + 3, base - h + 1); g.stroke();
    if (!big || true) { g.fillStyle = "#6e5a48"; g.fillRect(x + w * 0.7 + d * 0.6, top + roofH * 0.25 - d * 0.3, 5, 12); }
    if (s.rk === "jeju") { const tx = x - 5, ty = base - 14; g.fillStyle = "#4b3424"; g.fillRect(tx, ty, 2, 14); g.fillStyle = "#2f6b3a"; g.beginPath(); g.arc(tx + 1, ty - 3, 7, 0, 7); g.fill(); g.fillStyle = "#ff9d2e"; for (const [ox, oy] of [[-3, -4], [3, -2], [0, 1], [4, -6]]) { g.beginPath(); g.arc(tx + 1 + ox, ty - 3 + oy, 1.6, 0, 7); g.fill(); } }
  }
  const [dx, dw] = s.sub === "officetel" ? [0, 0] : [x + w * 0.4, w * 0.2];
  if (dw) { g.fillStyle = s.sub === "hanok" ? "#4a2f1c" : "#6b4630"; g.fillRect(dx, base - h * 0.48, dw, h * 0.48); g.fillStyle = "#ffd98a"; g.fillRect(dx + dw * 0.72, base - h * 0.27, 1.5, 1.5); }
}
function windowsOf(b) { // 숙소 창 위치 [x, y, w, h]
  const { s, x, w, h, base } = b, out = [];
  if (s.sub === "officetel") { const cols = 3, rows = Math.max(3, Math.round((h - 22) / 17)); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([x + w * (0.12 + c * 0.28), base - 24 - (r + 1) * ((h - 26) / rows) + 3, w * 0.2, (h - 26) / rows - 6]); }
  else if (s.sub === "hanok") { out.push([x + w * 0.06, base - h * 0.78, w * 0.22, h * 0.46], [x + w * 0.72, base - h * 0.78, w * 0.22, h * 0.46]); }
  else { out.push([x + w * 0.1, base - h * 0.72, w * 0.22, h * 0.3], [x + w * 0.68, base - h * 0.72, w * 0.22, h * 0.3], [x + w * 0.42, base - h - h * 0.24, w * 0.16, h * 0.14]); }
  return out;
}
function drawFence(g, b) {
  const { x, w, h, d, base } = b;
  g.fillStyle = "rgba(60,60,72,.55)"; g.fillRect(x, base - h, w, h); poly(g, [x + w, base, x + w + d, base - d * 0.55, x + w + d, base - h - d * 0.55, x + w, base - h], "rgba(40,40,50,.5)");
  g.strokeStyle = "rgba(200,200,215,.55)"; g.lineWidth = 1; for (let yy = base - h; yy < base; yy += 12) { g.beginPath(); g.moveTo(x - 2, yy); g.lineTo(x + w + 2, yy); g.stroke(); } for (let xx = x; xx <= x + w + 1; xx += w / 3) { g.beginPath(); g.moveTo(xx, base - h - 3); g.lineTo(xx, base); g.stroke(); }
  const fy = base - 2, fh = 15; g.save(); rr(g, x - 3, fy - fh, w + 6 + d * 0.5, fh, 2); g.clip(); g.fillStyle = "#f5c04e"; g.fillRect(x - 3, fy - fh, w + 9 + d, fh); g.fillStyle = "#1b1b22"; for (let k = -fh; k < w + d + 10; k += 8) poly(g, [x + k, fy, x + k + 4, fy, x + k + 4 + fh, fy - fh, x + k + fh, fy - fh], "#1b1b22"); g.restore();
  for (const cx of [x - 6, x + w + d + 4]) { poly(g, [cx - 3.5, base + 3, cx + 3.5, base + 3, cx, base - 8], "#ff7a2e"); g.fillStyle = "#fff"; g.fillRect(cx - 2, base - 3, 4, 1.4); }
  tag(g, x + w / 2, base - h * 0.55, "공사 중", "#ff7a2e");
}
function drawLot(g, W, m) {
  const x = W * 0.22, w = W * 0.56, base = GY;
  g.fillStyle = m.season === "winter" ? "#c9d0e6" : "#3e5a3a"; g.beginPath(); g.ellipse(x + w / 2, base - 2, w * 0.55, 9, 0, 0, 7); g.fill();
  g.setLineDash([4, 4]); g.strokeStyle = "rgba(180,220,255,.65)"; g.lineWidth = 1.2; g.strokeRect(x + w * 0.18, base - 70, w * 0.64, 66); g.beginPath(); g.moveTo(x + w * 0.18, base - 70); g.lineTo(x + w * 0.5, base - 92); g.lineTo(x + w * 0.82, base - 70); g.stroke(); g.setLineDash([]);
  g.fillStyle = "#6b5236"; g.fillRect(x + w * 0.04, base - 34, 2.5, 34); g.fillRect(x + w * 0.04 + 26, base - 34, 2.5, 34); rr(g, x + w * 0.04 - 6, base - 50, 40, 20, 3); g.fillStyle = "#f3e7d1"; g.fill();
  g.font = font(11); g.fillStyle = "#5a3820"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("임대", x + w * 0.04 + 14, base - 40);
  for (const cx of [x + w * 0.9, x + w * 0.98]) { poly(g, [cx - 3.5, base + 2, cx + 3.5, base + 2, cx, base - 9], "#ff7a2e"); }
}

// ───────── 움직이는 층 ─────────
function drawLive(g, W, m, L, st, t) {
  // 가로등 불빛
  for (const lx of st.lamps) { const lg = g.createRadialGradient(lx + 6, GY - 44, 1, lx + 6, GY - 44, 30); lg.addColorStop(0, "rgba(255,220,140,.75)"); lg.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = lg; g.fillRect(lx - 26, GY - 76, 64, 64); g.fillStyle = "rgba(255,214,130,.08)"; poly(g, [lx + 4, GY - 43, lx + 9, GY - 43, lx + 22, CURB, lx - 10, CURB]); g.fill(); }
  for (const b of L) liveStore(g, b, m, t);
  // 차
  const car = st.car; if (car) { const cy = 191; g.save(); g.translate(car.x, cy); g.scale(car.v > 0 ? 1 : -1, 1); g.fillStyle = car.c; rr(g, -15, -8, 30, 8, 3); g.fill(); rr(g, -8, -13, 15, 6, 2.5); g.fill(); g.fillStyle = "rgba(180,220,255,.7)"; g.fillRect(-6, -12, 5, 4); g.fillRect(0, -12, 5, 4); g.fillStyle = "#111"; g.beginPath(); g.arc(-9, 0, 3, 0, 7); g.arc(9, 0, 3, 0, 7); g.fill(); const hl = g.createLinearGradient(15, -4, 50, -4); hl.addColorStop(0, "rgba(255,240,190,.55)"); hl.addColorStop(1, "rgba(255,240,190,0)"); g.fillStyle = hl; poly(g, [15, -6, 50, -11, 50, 3, 15, -2]); g.fill(); g.fillStyle = "#ff4d5e"; g.fillRect(-15, -6, 1.5, 2); g.restore(); }
  // 사람(멀리 있는 줄부터)
  const ppl = st.ppl.slice().sort((a, b) => a.y - b.y);
  for (const p of ppl) drawPerson(g, p, t, st.dpr);
  // 이름표(도로 칸): "1호점 ★4.6" · 좁으면 "★4.6"
  for (const b of L) { const s = b.s, on = !s.setup && !s.dark, nm = String(s.name || "").split(" ")[0], star = `★${(s.rating || 0).toFixed(1)}`, lab = b.slot < 70 ? (s.setup ? nm.replace(/[^0-9]/g, "") + "호" : star) : s.setup ? nm : `${nm} ${star}`; tag(g, b.x + (b.w + b.d) / 2, 201, lab, "rgba(10,8,24,.82)", s.rating >= 4.7 && on ? "#ffe27a" : s.dark ? "#ff9aa8" : "#fff"); }
  if (m.stores.length > L.length) tagL(g, W - 8, 201, `외 ${m.stores.length - L.length}곳`, "rgba(10,8,24,.82)", "#cfd2ea", true);
  // 계절 입자
  for (const q of st.fx) { g.globalAlpha = q.a; if (m.season === "winter") { g.fillStyle = "#fff"; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); } else { g.fillStyle = m.season === "spring" ? "#ffc0d6" : m.season === "autumn" ? "#f08a3e" : "rgba(255,230,160,.9)"; g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, q.r * 1.6, q.r * 0.8, 0, 0, 7); g.fill(); g.restore(); } }
  g.globalAlpha = 1;
  // 머리 글씨
  const n = m.stores.length;
  if (n) {
    let px = 8;
    const t1 = `내 매장 ${n}곳`, w1 = tagL(g, px, 14, t1, "rgba(10,8,24,.72)"); px += w1 + 4;
    if (m.peak) px += tagL(g, px, 14, m.peak, "#ff5a7a") + 4; else if (m.off) px += tagL(g, px, 14, "겨울 비수기", "rgba(90,110,160,.85)") + 4;
    tagL(g, W - 8, 14, "가게를 눌러 보세요", "rgba(10,8,24,.55)", "#cfd2ea", true);
  } else { tag(g, W / 2, 26, m.empty, "rgba(10,8,24,.78)", "#ffe6a8", 13); tag(g, W / 2, 48, "눌러서 자리 보러 가기", "rgba(10,8,24,.55)", "#cfd2ea"); }
}
function tagL(g, x, y, text, bg, fg = "#fff", right = false) { g.font = font(11); const w = g.measureText(text).width + 12; const x0 = right ? x - w : x; rr(g, x0, y - 8.5, w, 17, 8.5); g.fillStyle = bg; g.fill(); g.fillStyle = fg; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(text, x0 + 6, y + 0.5); return w; }

function liveStore(g, b, m, t) {
  const { s, x, w, h, d, base } = b, on = !s.setup && !s.dark, ph = (b.x * 0.37) % 6.28;
  if (s.t === "pr") {
    const col = NEON[s.sub] || "#ff4fd8", wx = x + w * 0.07, wy = base - h * 0.64, ww = w * 0.6, wh = h * 0.5;
    if (on) {
      const lv = 0.25 + s.occ * 0.75; g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
      const bg = g.createLinearGradient(wx, wy, wx, wy + wh); bg.addColorStop(0, `rgba(120,40,200,${0.35 * lv})`); bg.addColorStop(1, `rgba(255,80,200,${0.25 * lv})`); g.fillStyle = bg; g.fillRect(wx, wy, ww, wh);
      g.globalCompositeOperation = "lighter";
      ["rgba(255,80,200,", "rgba(80,220,255,", "rgba(255,220,90,"].forEach((c, i) => { const a = t * (0.9 + i * 0.35) + i * 2.1 + ph, cx = wx + ww / 2, cy = wy + 2; g.fillStyle = c + (0.22 * lv) + ")"; poly(g, [cx, cy, cx + Math.cos(a) * wh * 1.6 - 6, cy + wh * 1.4, cx + Math.cos(a) * wh * 1.6 + 6, cy + wh * 1.4]); g.fill(); });
      g.globalCompositeOperation = "source-over";
      const nd = Math.round(s.occ * 5); for (let i = 0; i < nd; i++) { const px = wx + ww * (0.14 + i * 0.18), bob = Math.abs(Math.sin(t * 5 + i * 1.7)) * 2.4, py = wy + wh - 4 - bob; g.fillStyle = "rgba(20,6,36,.92)"; g.beginPath(); g.arc(px, py - 7, 2.6, 0, 7); g.fill(); rr(g, px - 3.6, py - 4.5, 7.2, 8, 2.5); g.fill(); if (i % 2) { g.fillRect(px + 2.5, py - 9 - bob, 1.4, 5); } }
      // 미러볼
      const mbx = wx + ww / 2, mby = wy + 5; g.fillStyle = "#cfd3e6"; g.beginPath(); g.arc(mbx, mby, 2.6, 0, 7); g.fill(); g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 9)})`; g.fillRect(mbx - 1, mby - 1.5, 1.2, 1.2);
      g.restore();
      // 문 불빛
      const dg = g.createLinearGradient(0, base - h * 0.5, 0, base); dg.addColorStop(0, `rgba(255,120,220,${0.2 + 0.25 * lv})`); dg.addColorStop(1, "rgba(255,120,220,0)"); g.fillStyle = dg; g.fillRect(x + w * 0.7, base - h * 0.5, w * 0.2, h * 0.5);
    }
    // 네온 간판
    const fl = on ? (Math.sin(t * 13 + ph) > -0.93 ? 1 : 0.35) : 0.18, nx = x + w * 0.08, ny = base - h * 0.93, nw = w * 0.84, nh = h * 0.2;
    g.save(); g.shadowColor = col; g.shadowBlur = on ? 10 * fl : 0; g.strokeStyle = on ? col : "#5a4a6a"; g.globalAlpha = on ? fl : 0.6; g.lineWidth = 1.4; rr(g, nx + 2, ny + 2, nw - 4, nh - 4, 2.5); g.stroke();
    g.font = font(11, 900); g.fillStyle = on ? "#fff" : "#6a5a7a"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(w >= 62 ? "PARTY" : "★", nx + nw / 2, ny + nh / 2 + 0.5); g.restore();
    if (on || s.setup === false) { // 풍선(지붕 뒤 모서리)
      const nB = s.dark ? 1 : s.peak ? 5 : 3, cols = ["#ff5a8a", "#ffd25a", "#5ad1ff", "#b48cff", "#5fe0a0"], ax = x + w + d * 0.6, ay = base - h - d * 0.35;
      for (let i = 0; i < nB; i++) { const bx = ax - 4 - i * 5 + Math.sin(t * 1.6 + i) * 2, by = ay - 16 - (i % 2) * 6 - Math.cos(t * 1.3 + i * 2) * 1.5; g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(bx + 2, (ay + by) / 2, bx, by + 5); g.stroke(); const bgd = g.createRadialGradient(bx - 1.6, by - 2, 0.5, bx, by, 6); bgd.addColorStop(0, "#fff"); bgd.addColorStop(0.25, cols[i]); bgd.addColorStop(1, mix(cols[i].length === 7 ? cols[i] : "#ff5a8a", "#000000", 0.35)); g.fillStyle = s.dark ? "#55506a" : bgd; g.beginPath(); g.ellipse(bx, by, 4.4, 5.4, 0, 0, 7); g.fill(); }
    }
  } else if (s.t === "uc") { if (!s.setup) { // 공사 중이면 정적 층의 펜스만
    const gx = x + w * 0.06, gy = base - h * 0.56, gw = w * 0.88, gh = h * 0.56;
    const lit = on ? 1 : s.setup ? 0 : 0.25, ig = g.createLinearGradient(gx, gy, gx, gy + gh);
    ig.addColorStop(0, lit ? `rgba(255,236,196,${0.95 * lit})` : "#211a14"); ig.addColorStop(1, lit ? `rgba(240,196,140,${0.9 * lit})` : "#17110c"); g.fillStyle = ig; g.fillRect(gx, gy, gw, gh);
    if (!s.setup) {
      // 키오스크
      const kx = gx + gw * 0.08, kw = gw * 0.16; g.fillStyle = "#2a2a34"; rr(g, kx, gy + gh * 0.18, kw, gh * 0.82, 1.5); g.fill(); g.fillStyle = on ? `rgba(110,200,255,${0.75 + 0.25 * Math.sin(t * 3 + ph)})` : "#1d2840"; g.fillRect(kx + 1.2, gy + gh * 0.24, kw - 2.4, gh * 0.3);
      // 커피머신
      const mx = gx + gw * 0.32, mw = gw * 0.26, my = gy + gh * 0.3; const mg = g.createLinearGradient(mx, 0, mx + mw, 0); mg.addColorStop(0, "#9aa0ad"); mg.addColorStop(0.5, "#e2e5ec"); mg.addColorStop(1, "#80869a"); g.fillStyle = mg; rr(g, mx, my, mw, gh * 0.42, 1.5); g.fill();
      g.fillStyle = "#30333d"; g.fillRect(mx + mw * 0.3, my + gh * 0.2, mw * 0.4, gh * 0.12); g.fillStyle = "#fff"; g.fillRect(mx + mw * 0.42, my + gh * 0.26, mw * 0.16, gh * 0.06);
      const ledOn = s.broken ? Math.sin(t * 8) > 0 : true; g.fillStyle = s.broken ? (ledOn ? "#ff3d4e" : "#5a1a20") : on ? "#5fe0a0" : "#2a3a30"; g.beginPath(); g.arc(mx + mw * 0.8, my + 3, 1.4, 0, 7); g.fill();
      if (on && !s.broken) for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1, sx = mx + mw * 0.5 + Math.sin(k * 6 + i) * 2, sy = my - k * 10; g.fillStyle = `rgba(255,255,255,${0.45 * (1 - k)})`; g.beginPath(); g.arc(sx, sy, 1.4 + k * 1.6, 0, 7); g.fill(); }
      g.fillStyle = "#6b4a30"; g.fillRect(gx, gy + gh * 0.72, gw * 0.7, gh * 0.08);
      // 유리 반사
      g.fillStyle = "rgba(255,255,255,.12)"; poly(g, [gx + gw * 0.6, gy, gx + gw * 0.72, gy, gx + gw * 0.5, gy + gh, gx + gw * 0.38, gy + gh]); g.fill();
      // 유리문
      g.strokeStyle = "#2a1c12"; g.lineWidth = 1.2; g.strokeRect(gx + gw * 0.74, gy + 1, gw * 0.24, gh - 1);
      if (on) { const fg = g.createLinearGradient(0, base, 0, base + 10); fg.addColorStop(0, "rgba(255,214,150,.35)"); fg.addColorStop(1, "rgba(255,214,150,0)"); g.fillStyle = fg; g.fillRect(gx, base, gw, 10); }
    }
    if (s.broken) tag(g, x + w / 2, base - h - 10, "머신 고장", "#ff4d5e");
  } } else {
    const ws = windowsOf(b), nLit = on ? Math.round(s.occ * ws.length + (s.occ > 0.05 ? 0.4 : 0)) : 0, lit = new Set();
    const order = ws.map((_, i) => i).sort((a, c) => ((a * 7919 + b.x) % 13) - ((c * 7919 + b.x) % 13)); order.slice(0, nLit).forEach((i) => lit.add(i));
    ws.forEach(([wx, wy, ww, wh], i) => {
      const L = lit.has(i), fl = L ? 0.88 + 0.12 * Math.sin(t * 2 + i * 1.3 + ph) : 0;
      g.fillStyle = "#3a2f28"; g.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      if (L) { const wg = g.createLinearGradient(wx, wy, wx, wy + wh); wg.addColorStop(0, `rgba(255,226,150,${fl})`); wg.addColorStop(1, `rgba(255,180,90,${fl})`); g.fillStyle = wg; g.fillRect(wx, wy, ww, wh); g.save(); g.shadowColor = "rgba(255,200,110,.9)"; g.shadowBlur = 8; g.fillRect(wx, wy, ww, wh); g.restore(); }
      else { g.fillStyle = s.sub === "hanok" ? "#4a4438" : "#26324a"; g.fillRect(wx, wy, ww, wh); }
      g.strokeStyle = s.sub === "hanok" ? "rgba(70,45,25,.8)" : "rgba(60,45,35,.75)"; g.lineWidth = 0.8;
      if (s.sub === "hanok") { for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(wx + ww * k / 3, wy); g.lineTo(wx + ww * k / 3, wy + wh); g.stroke(); g.beginPath(); g.moveTo(wx, wy + wh * k / 3); g.lineTo(wx + ww, wy + wh * k / 3); g.stroke(); } }
      else { g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke(); }
    });
    if (m.season === "winter" && s.sub !== "officetel" && s.sub !== "hanok" && on) { const cx = x + w * 0.7 + d * 0.6 + 2.5, top = base - h - h * 0.42 + h * 0.42 * 0.25 - d * 0.3; for (let i = 0; i < 4; i++) { const k = (t * 0.35 + i / 4) % 1; g.fillStyle = `rgba(220,225,240,${0.5 * (1 - k)})`; g.beginPath(); g.arc(cx + k * 8 + Math.sin(k * 7) * 2, top - 2 - k * 18, 2 + k * 3, 0, 7); g.fill(); } }
    if (s.ban) { // 영업정지 테이프
      g.save(); g.strokeStyle = "#f5c04e"; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w * 0.36, base - h * 0.5); g.lineTo(x + w * 0.64, base); g.moveTo(x + w * 0.64, base - h * 0.5); g.lineTo(x + w * 0.36, base); g.stroke(); g.restore();
    }
  }
  if (m.season === "winter") { g.fillStyle = "rgba(255,255,255,.9)"; const ry = s.t === "ab" && s.sub !== "officetel" && s.sub !== "hanok" ? null : base - h - (s.sub === "hanok" ? h * 0.5 + 1 : 0); if (ry !== null) { rr(g, x - 1, ry - 2.5, w + 2, 3.5, 1.5); g.fill(); poly(g, [x + w, ry - 1, x + w + d, ry - 1 - d * 0.55, x + w + d, ry - 3.5 - d * 0.55, x + w, ry - 3.5]); g.fill(); } else { const top = base - h - h * 0.42; g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + w / 2 + 1, top + 1); g.lineTo(x + w / 2 + d, top - d * 0.55 + 1); g.stroke(); } }
  if (s.dark) { // 어둡게(지붕까지)
    const rx = s.t !== "ab" || s.sub === "officetel" ? 0 : s.sub === "hanok" ? h * 0.5 + 3 : h * 0.42, k = 0.55, dk = "rgba(6,6,18,.58)";
    g.fillStyle = dk; g.fillRect(x, base - h, w, h); poly(g, [x + w, base, x + w + d, base - d * k, x + w + d, base - h - d * k, x + w, base - h], dk);
    if (!rx) poly(g, [x, base - h, x + w, base - h, x + w + d, base - h - d * k, x + d, base - h - d * k], dk);
    else if (s.sub === "hanok") { const ov = w * 0.16, L0 = x - ov, R0 = x + w + d + ov, top = base - h - h * 0.5; poly(g, [L0, base - h - 7, R0, base - h - 7, R0 - ov * 1.6, top - 2, L0 + ov * 1.6, top - 2], dk); }
    else { const top = base - h - h * 0.42; poly(g, [x - 2, base - h, x + w / 2, top, x + w + 2, base - h], dk); poly(g, [x + w / 2, top, x + w + 2, base - h, x + w + d + 2, base - h - d * k, x + w / 2 + d, top - d * k], dk); }
    tag(g, x + w / 2, base - h - rx - 10, s.ban ? `영업정지 ${s.ban}달` : `적자 ${s.red}달`, s.ban ? "#d9364a" : "rgba(120,30,50,.92)");
  }
  else if (s.t === "uc" && !s.setup && (s.nightOff || s.chain)) { // v4.29 밤엔 닫는 카페(위쪽 반을 어둡게) · 옆에 저가 체인
    if (s.nightOff) { const dk = "rgba(8,12,40,.42)"; g.fillStyle = dk; g.fillRect(x, base - h, w, h * 0.45); }
    tag(g, x + w / 2, base - h - 10, s.nightOff ? "밤 0~7시 닫음" : `옆에 체인 ${s.chain}`, s.nightOff ? "rgba(36,48,112,.94)" : "rgba(150,60,30,.92)");
  }
  if (on && s.rating >= 4.7) { // 별점 반짝
    for (let i = 0; i < 3; i++) { const a = (Math.sin(t * 2.2 + i * 2.1 + ph) + 1) / 2, sx = x + w * (0.15 + i * 0.35) + d * 0.5, sy = base - h - 10 - (i % 2) * 8 - (s.t === "ab" ? h * 0.3 : 0), r = 2 + a * 2.6; g.save(); g.globalAlpha = 0.35 + a * 0.65; g.fillStyle = "#ffe27a"; g.shadowColor = "#ffd24a"; g.shadowBlur = 6; g.beginPath(); g.moveTo(sx, sy - r * 1.8); g.quadraticCurveTo(sx, sy, sx + r * 1.8, sy); g.quadraticCurveTo(sx, sy, sx, sy + r * 1.8); g.quadraticCurveTo(sx, sy, sx - r * 1.8, sy); g.quadraticCurveTo(sx, sy, sx, sy - r * 1.8); g.fill(); g.restore(); }
  }
  // 이름표(앞줄만): "1호점 ★4.62"
}

function drawPerson(g, p, t, dpr) {
  const sc = p.sc * (p.fade ?? 1) ** 0.3, sp = p.spr, bh = 26 * sc, legH = 7 * sc, fy = p.y, a = p.fade ?? 1; if (a <= 0.02) return;
  g.save(); g.globalAlpha = a;
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(p.x, fy, 5 * sc, 1.6 * sc, 0, 0, 7); g.fill();
  const walk = p.st === "walk" || p.st === "in" || p.st === "out" || p.st === "leave", sw = walk ? Math.sin(p.ph) * 0.45 : 0, bob = walk ? Math.abs(Math.cos(p.ph)) * 1.1 * sc : Math.sin(t * 2 + p.seed) * 0.3;
  const hipY = fy - legH - bob, hx = p.x;
  if (p.bag === "case") { const dir = p.vx >= 0 ? -1 : 1, cx = hx + dir * 7 * sc; g.strokeStyle = "#555a6a"; g.lineWidth = 0.9 * sc; g.beginPath(); g.moveTo(hx + dir * 3 * sc, hipY - 3 * sc); g.lineTo(cx, fy - 9 * sc); g.stroke(); g.fillStyle = p.bagC; rr(g, cx - 3 * sc, fy - 9 * sc, 6 * sc, 8 * sc, 1.2 * sc); g.fill(); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(cx - 1.5 * sc, fy - 8 * sc, 0.8 * sc, 6 * sc); g.fillStyle = "#222"; g.beginPath(); g.arc(cx - 1.8 * sc, fy - 0.6 * sc, 0.8 * sc, 0, 7); g.arc(cx + 1.8 * sc, fy - 0.6 * sc, 0.8 * sc, 0, 7); g.fill(); }
  // 다리
  g.strokeStyle = sp?.leg || "#2c2f45"; g.lineCap = "round"; g.lineWidth = 2 * sc;
  for (const k of [-1, 1]) { const ang = sw * k, lx = hx + k * 1.4 * sc; g.beginPath(); g.moveTo(lx, hipY); g.lineTo(lx + Math.sin(ang) * legH, hipY + Math.cos(ang) * legH); g.stroke(); g.fillStyle = "#1c1c24"; g.beginPath(); g.ellipse(lx + Math.sin(ang) * legH + (p.vx >= 0 ? 0.8 : -0.8) * sc, hipY + Math.cos(ang) * legH, 1.6 * sc, 0.9 * sc, 0, 0, 7); g.fill(); }
  // 몸(캐릭터 그림)
  if (sp?.ok) { const bw = bh * 240 / 470; g.save(); g.translate(hx, hipY + 1.5 * sc); if (p.vx < 0) g.scale(-1, 1); g.drawImage(sp.c, -bw / 2, -bh, bw, bh); g.restore(); }
  else { g.fillStyle = p.coat; rr(g, hx - 4 * sc, hipY - 13 * sc, 8 * sc, 14 * sc, 3 * sc); g.fill(); g.fillStyle = "#f1cfb4"; g.beginPath(); g.arc(hx, hipY - 17 * sc, 3.6 * sc, 0, 7); g.fill(); g.fillStyle = "#2a1f1a"; g.beginPath(); g.arc(hx, hipY - 18 * sc, 3.8 * sc, Math.PI, 0); g.fill(); }
  // 손에 든 것
  if (p.bag === "cup") { const cx = hx + (p.vx >= 0 ? 4 : -4) * sc, cy = hipY - 7 * sc; g.fillStyle = "#f4efe6"; poly(g, [cx - 1.6 * sc, cy, cx + 1.6 * sc, cy, cx + 1.2 * sc, cy + 4 * sc, cx - 1.2 * sc, cy + 4 * sc]); g.fill(); g.fillStyle = "#8a5a3a"; g.fillRect(cx - 1.5 * sc, cy + 1.2 * sc, 3 * sc, 1.2 * sc); g.fillStyle = "#e6e0d6"; g.fillRect(cx - 1.8 * sc, cy - 0.8 * sc, 3.6 * sc, 0.9 * sc); }
  if (p.bag === "balloon") { const bx = hx + (p.vx >= 0 ? 5 : -5) * sc, by = hipY - 30 * sc + Math.sin(t * 2 + p.seed) * 1.2; g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(hx + (p.vx >= 0 ? 3 : -3) * sc, hipY - 8 * sc); g.lineTo(bx, by + 4 * sc); g.stroke(); g.fillStyle = p.bagC; g.beginPath(); g.ellipse(bx, by, 3.2 * sc, 4 * sc, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(bx - 1 * sc, by - 1.4 * sc, 0.9 * sc, 0, 7); g.fill(); }
  if (p.bag === "gift") { const cx = hx + (p.vx >= 0 ? 4 : -4) * sc, cy = hipY - 6 * sc; g.fillStyle = p.bagC; g.fillRect(cx - 2.4 * sc, cy, 4.8 * sc, 4 * sc); g.fillStyle = "#fff"; g.fillRect(cx - 0.4 * sc, cy, 0.8 * sc, 4 * sc); }
  g.restore();
}

// ───────── 손님 움직임 ─────────
const COATS = ["#e86a8a", "#5a8fd8", "#f2c14e", "#7bc47f", "#b48cff", "#e9e3d6", "#3f4660"];
function mkPerson(st, m, store, rnd) {
  const ids = PPL[m.kind] || PPL.pr, id = ids[(st.pi = ((st.pi ?? Math.floor(rnd() * 8)) + 1 + (rnd() < 0.3 ? 1 : 0))) % ids.length], fromL = rnd() < 0.5, W = st.W;
  const row = store?.row ? 1 : 0, sc = row ? 0.76 : 0.92 + rnd() * 0.12;
  const lane = row ? GY - 20 + rnd() * 3 : GY + 9 + rnd() * 15;
  const p = { id, spr: sprite(id, st.dpr), x: fromL ? -10 : W + 10, y: lane, lane, vx: (fromL ? 1 : -1) * (14 + rnd() * 10), ph: rnd() * 6, st: "walk", store, sc, seed: rnd() * 9, coat: COATS[Math.floor(rnd() * COATS.length)], fade: 1, bag: null, bagC: COATS[Math.floor(rnd() * COATS.length)] };
  if (store) { p.tx = store.door + (rnd() - 0.5) * 4; p.vx = Math.sign(p.tx - p.x) * Math.abs(p.vx); }
  if (m.kind === "airbnb" && store && rnd() < 0.75) p.bag = "case";
  if (m.kind === "pr" && store && rnd() < 0.35) p.bag = rnd() < 0.5 ? "balloon" : "gift";
  if (!store && rnd() < 0.15) p.bag = m.kind === "ucafe" ? "cup" : null;
  return p;
}
function step(st, m, L, dt, rnd) {
  const W = st.W;
  for (const p of st.ppl) {
    p.ph += dt * Math.abs(p.vx) * 0.42;
    if (p.st === "walk") { p.x += p.vx * dt; if (p.store && (p.vx > 0 ? p.x >= p.tx : p.x <= p.tx)) { p.x = p.tx; p.st = "in"; } }
    else if (p.st === "in") { p.y -= 22 * dt; p.vx = 0.001; if (p.y <= p.store.base + 1) { p.fade -= dt * 3; if (p.fade <= 0) { p.st = "inside"; p.wait = 2.5 + rnd() * 6; } } }
    else if (p.st === "inside") { p.wait -= dt; if (p.wait <= 0) { p.st = "out"; p.fade = 0; p.y = p.store.base + 1; if (m.kind === "ucafe" && rnd() < 0.8) p.bag = "cup"; } }
    else if (p.st === "out") { p.fade = Math.min(1, p.fade + dt * 3); p.y += 22 * dt; if (p.y >= p.lane) { p.y = p.lane; p.st = "leave"; p.vx = (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 10); } }
    else if (p.st === "leave") p.x += p.vx * dt;
    else if (p.st === "queue") { /* 줄 서기: 맨 앞이 들어가면 한 칸씩 */ }
  }
  st.ppl = st.ppl.filter((p) => !((p.st === "walk" && !p.store) || p.st === "leave") || (p.x > -20 && p.x < W + 20));
  // 가게별 손님 수 맞추기
  st.spawnT -= dt;
  if (st.spawnT <= 0) {
    st.spawnT = 0.5 + rnd() * 0.9;
    const cand = L.filter((b) => !b.s.setup && !b.s.dark).map((b) => { const max = b.s.t === "pr" ? 5 : b.s.t === "uc" ? 3 : 3, want = Math.round((0.15 + b.s.occ) * max * (b.s.peak ? 1.2 : 1)); const have = st.ppl.filter((p) => p.store === b && p.st !== "leave").length; return [b, want - have]; }).filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1]);
    if (cand.length && st.ppl.length < 26) st.ppl.push(mkPerson(st, m, cand[Math.floor(rnd() * Math.min(2, cand.length))][0], rnd));
    const amb = st.ppl.filter((p) => !p.store).length, ambWant = 2 + (m.peak ? 1 : 0) + (m.stores.length ? 0 : 1);
    if (amb < ambWant && rnd() < 0.6) st.ppl.push(mkPerson(st, m, null, rnd));
  }
  // 무인카페 줄: 잔 수만큼 문 옆에 서 있는 사람(맨 앞은 가끔 들어간다)
  for (const b of L) if (b.s.t === "uc" && !b.s.setup && !b.s.dark && !b.row) {
    const want = b.s.broken ? 0 : Math.min(b.slot < 70 ? 2 : 3, Math.round(b.s.occ * 3.4)); let q = st.ppl.filter((p) => p.st === "queue" && p.store === b);
    while (q.length < want) { const p = mkPerson(st, m, b, rnd); p.st = "queue"; p.vx = -0.001; p.fade = 0; p.x = b.door + 8 + q.length * 8; q.push(p); st.ppl.push(p); }
    q.forEach((p, i) => { const qx = b.door + 8 + i * 8, qy = GY + 6 + i * 0.6; p.x += (qx - p.x) * Math.min(1, dt * 3); p.y = p.lane = qy; p.fade = Math.min(1, p.fade + dt * 2); });
    b.qT = (b.qT ?? 3 + rnd() * 3) - dt; if (b.qT <= 0 && q.length) { b.qT = 3 + rnd() * 4; const p = q[0]; p.st = "walk"; p.tx = b.door; p.vx = -10; p.lane = GY + 9; }
  }
  // 차
  st.carT -= dt; if (!st.car && st.carT <= 0) { const v = rnd() < 0.5 ? 1 : -1; st.car = { x: v > 0 ? -30 : W + 30, v: v * (55 + rnd() * 30), c: ["#d94a5a", "#3e6fd8", "#e6e2da", "#2f3442", "#f2b84a"][Math.floor(rnd() * 5)] }; }
  if (st.car) { st.car.x += st.car.v * dt; if (st.car.x < -40 || st.car.x > W + 40) { st.car = null; st.carT = 3 + rnd() * 6; } }
  // 계절 입자
  if (m.season !== "summer" || m.peak) {
    const want = m.season === "winter" ? 34 : m.season === "summer" ? 0 : 9;
    while (st.fx.length < want) st.fx.push({ x: rnd() * W, y: -rnd() * H, r: m.season === "winter" ? 0.8 + rnd() * 1.4 : 1.3 + rnd(), a: 0.5 + rnd() * 0.5, vy: m.season === "winter" ? 10 + rnd() * 14 : 9 + rnd() * 8, vx: m.season === "winter" ? -3 + rnd() * 6 : 6 + rnd() * 8, rot: rnd() * 6, ph: rnd() * 6 });
    for (const q of st.fx) { q.ph += dt; q.y += q.vy * dt; q.x += (q.vx + Math.sin(q.ph * 1.7) * 6) * dt; q.rot += dt * 2; if (q.y > H + 4 || q.x > W + 6 || q.x < -6) { q.y = -4; q.x = rnd() * W; } }
  }
}

// ───────── 붙이기·돌리기·정리 ─────────
function jump(kind, b) {
  const app = document.getElementById("app") || document;
  let el = null;
  if (b) { const name = b.s.name; for (const nm of app.querySelectorAll(".room .nm")) if (nm.textContent.trim() === name) { el = nm.closest(".room"); break; } }
  else el = app.querySelector(kind === "pr" ? '[data-prflow="district"]' : kind === "airbnb" ? '[data-act="ab_search"]' : '[data-act="uc_search"]')?.closest(".actrow, button, .card") || null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("tyc-flash"); void el.offsetWidth; el.classList.add("tyc-flash"); setTimeout(() => el.classList.remove("tyc-flash"), 1600);
}
function mount(root) {
  if (root.dataset.on) return; root.dataset.on = "1";
  const m = MODELS.get(+root.dataset.tyc); if (!m) return;
  const cv = root.querySelector("canvas"), hit = root.querySelector(".tyc-hit"), g = cv.getContext("2d");
  const dpr = Math.min(3, window.devicePixelRatio || 1), rnd = rng(m.stores.length * 977 + m.cal * 31 + 7);
  let W = 0, L = [], bg = null, raf = 0, vis = true, last = 0, t = 0, dead = false;
  const st = { W: 0, dpr, ppl: [], fx: [], spawnT: 0, carT: 1.5, car: null, lamps: [] };
  for (const id of PPL[m.kind] || []) sprite(id, dpr); // 미리 불러오기
  const build = () => {
    W = Math.max(240, Math.round(root.clientWidth || 360)); st.W = W;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
    L = layout(m, W); st.lamps = lampXs(L, W);
    bg = document.createElement("canvas"); bg.width = cv.width; bg.height = cv.height; const bgc = bg.getContext("2d"); bgc.setTransform(dpr, 0, 0, dpr, 0, 0); drawStatic(bgc, W, m, L, rng(m.cal * 131 + 3));
    hit.innerHTML = ""; // 누르는 칸(키보드로도 갈 수 있게 버튼)
    if (L.length) for (const b of L) { const bt = document.createElement("button"); bt.type = "button"; bt.className = "tyc-b"; bt.setAttribute("aria-label", `${b.s.name} 카드로 가기`); const top = b.base - b.h - (b.s.t === "ab" ? b.h * 0.45 : 6) - 10; Object.assign(bt.style, { left: b.x - 2 + "px", top: Math.max(0, top) + "px", width: b.w + b.d + 4 + "px", height: Math.min(H, b.base + 16) - Math.max(0, top) + "px" }); bt.onclick = () => jump(m.kind, b); hit.appendChild(bt); }
    else { const bt = document.createElement("button"); bt.type = "button"; bt.className = "tyc-b"; bt.setAttribute("aria-label", m.empty); Object.assign(bt.style, { left: "0", top: "0", width: "100%", height: "100%" }); bt.onclick = () => jump(m.kind, null); hit.appendChild(bt); }
  };
  const frame = () => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(bg, 0, 0, W, H); drawLive(g, W, m, L, st, t); };
  build();
  for (let i = 0; i < 260; i++) { t += 1 / 30; step(st, m, L, 1 / 30, rnd); } // 처음부터 손님이 오가는 중인 장면
  frame();
  const loop = (now) => {
    raf = 0; if (dead) return;
    if (!root.isConnected) return stop();
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now; t += dt; step(st, m, L, dt, rnd); frame();
    if (vis && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const go = () => { if (!raf && !dead && vis && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { vis = es.some((e) => e.isIntersecting); if (vis) go(); }, { threshold: 0.01 }) : null; io?.observe(root);
  const onVis = () => go(); document.addEventListener("visibilitychange", onVis);
  let rw = root.clientWidth; const ro = "ResizeObserver" in window ? new ResizeObserver(() => { if (Math.abs(root.clientWidth - rw) > 2) { rw = root.clientWidth; build(); frame(); } }) : null; ro?.observe(root);
  function stop() { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; io?.disconnect(); ro?.disconnect(); document.removeEventListener("visibilitychange", onVis); }
  root._tycStop = stop;
  // 화면이 바뀌어 빠졌는지 가끔 확인(멈춰 있는 동안에도 정리되게)
  const chk = setInterval(() => { if (!root.isConnected) { clearInterval(chk); stop(); } }, 4000);
  go();
}
function scan() { for (const el of document.querySelectorAll(".tyc[data-tyc]:not([data-on])")) { try { mount(el); } catch (e) { console.warn("tycoon", e); } } }
if (typeof document !== "undefined") {
  const target = document.getElementById("app") || document.body;
  if (target) new MutationObserver(() => scan()).observe(target, { childList: true, subtree: true });
  window.__tycdbg = { model, MODELS };
}
