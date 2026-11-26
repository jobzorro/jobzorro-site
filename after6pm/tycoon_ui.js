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
    stores = (S.pr?.rooms || []).map((rm, i) => { const red = Math.max(rm.red || 0, lossRun(rm.hist || [])); return { id: rm.id, name: rm.name, no: String(rm.name || "").split(" ")[0] || `${i + 1}호점`, idn: parseInt(String(rm.id).replace(/\D/g, ""), 10) || i + 1, dk: rm.dk, floor: rm.floor, size: rm.size, t: "pr", sub: rm.concept, setup: rm.status !== "open", occ: rm.last ? clamp(rm.last.occ, 0, 1) : 0, rating: rm.rating || 0, red, dark: rm.status === "open" && (red >= 3 || (rm.banned || 0) > 0), ban: rm.banned || 0, peak: !!peak }; });
    empty = "첫 파티룸을 열어 보세요";
  } else if (kind === "airbnb") {
    stores = (S.ab?.units || []).map((u, i) => { const R = D.AB_REGIONS[u.rk] || {}, red = lossRun(u.hist || []), pk = (R.peak || []).includes(cal); return { id: u.id, name: u.name, no: String(u.name || "").split(" ")[0] || `${i + 1}호`, idn: parseInt(String(u.id).replace(/\D/g, ""), 10) || i + 1, pv: S._tycPv ? i : null, wait: u.regT != null, t: "ab", sub: u.ty, rk: u.rk, setup: !u.last && !u.months, occ: u.last ? clamp(u.last.occ, 0, 1) : 0, rating: u.rating || 0, red, ban: u.banned || 0, dark: (u.banned || 0) > 0 || red >= 3, peak: pk }; });
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
    for (let i = 0; i < n; i++) { const dk = dks[i % dks.length]; S.ap = 99; S.hp = S.hpMax; E.act(S, "pr_search", dk); while (S.pending) E.choose(S, 0); const Ls = S.pr.listings.filter((l) => l.dk === dk).sort((x, y) => !!PR.rentRule(S, x) - !!PR.rentRule(S, y)); for (const L of Ls) { const cs = Object.keys(D.CONCEPTS).filter((k) => !PR.conceptOk(L, k, S)); const c = cs[i % 3] || cs[0]; if (c && PR.contract(S, L.id, { concept: c, interior: 1 }).ok) break; } } // 11-26 한 매물이 안 되면 같은 동네 다른 매물
    S.pr.rooms.forEach((rm, i) => { rm.status = "open"; rm.months = 6; rm.rating = i === 0 && h.includes("_hi") ? 4.82 : 4.3 + (i % 3) * 0.1; rm.last = { occ: occ[i], bookings: Math.round(occ[i] * 40), rev: 500, cost: 400, ig: 3, bl: 1 }; rm.hist = [{ profit: 100 }];
      // 11-26 보드 외관 시험: 층을 고루(지하·높은 층) · 성적표용 6달 기록(매출 포함)
      rm.floor = [3, -1, 5, 2, 4, -1, 3, 2][i % 8]; rm.openT = S.t - 6; rm.hist = [0, 1, 2, 3, 4, 5].map((k) => ({ t: S.t - 6 + k, occ: clamp(occ[i] - 0.2 + k * 0.05, 0.05, 1), rev: 300 + k * 40 + i * 30, profit: -40 + k * 30 + i * 10, rating: rm.rating })); delete rm.stV; delete rm.cum; delete rm.books; delete rm.bestM; delete rm.worstM; });
  } else if (kind === "airbnb") {
    // 11-26 보드 외관 시험: 여섯 동네·다섯 종류가 고루 · _ty<종류> = 전부 그 종류 · _rk<동네> = 전부 그 동네 · _pat = 겉모습을 순서대로(0,1,2…) · 성적표용 기록
    S.ab.units = []; const rks = ["hongdae", "jongno", "jeju", "seongsu", "busan", "gyeongju"], tys = ["oneroom", "hanok", "detached", "tworoom", "officetel", "hanok", "officetel", "tworoom"], fty = (h.match(/_ty([a-z]+)/) || [])[1], frk = (h.match(/_rk([a-z]+)/) || [])[1];
    for (let i = 0; i < n; i++) { const rk = D.AB_REGIONS[frk] ? frk : rks[i % rks.length]; AB.search(S, r, rk); const L = S.ab.listings.find((l) => l.rk === rk); if (L) AB.contract(S, L.id, "illegal"); }
    if (h.includes("_otel") && S.ab.units.length) S.ab.units.at(-1).ty = "officetel";
    S._tycPv = h.includes("_pat");
    S.ab.units.forEach((u, i) => { delete u.regT; delete u.trap; u.ty = D.AB_TYPES[fty] ? fty : h.includes("_otel") && i === n - 1 ? "officetel" : tys[i % tys.length]; u.name = `${i + 1}호 ${D.AB_REGIONS[u.rk].n} ${D.AB_TYPES[u.ty].n}`; u.months = 6; u.rating = i === 0 && h.includes("_hi") ? 4.9 : 4.55; u.last = { occ: occ[i % occ.length], nights: Math.round(occ[i % occ.length] * 30), stays: 8, rev: 300 + i * 20, cost: 200, foreign: 60, q: 1 };
      u.hist = [0, 1, 2, 3, 4, 5].map((k) => -30 + k * 28 + i * 8); u.t0 = S.t - 6; u.stV = 1; u.cum = u.hist.reduce((a, b) => a + b, 0); u.stays = 38 + i * 5; u.nightsT = Math.round(u.stays * 2.6); u.bestM = { t: S.t - 2, v: 420 + i * 30 }; u.worstM = { t: S.t - 6, v: 140 + i * 10 };
      if (h.includes("_old") && i === 0) { delete u.stV; delete u.cum; delete u.nightsT; delete u.bestM; delete u.worstM; delete u.t0; } }); // _old = 옛 저장(기록 없음 → 처음 한 번 채움)
  } else {
    S.uc.stores = []; const aks = Object.keys(D.UC_AREAS);
    for (let i = 0; i < n; i++) { UC.search(S, r, aks[i % aks.length]); const L = S.uc.listings.find((l) => l.ak === aks[i % aks.length]); if (L) UC.contract(S, L.id, { machine: i % 2 ? "rent" : "buy" }); }
    S.uc.stores.forEach((st, i) => { st.months = 5; st.rating = i === 0 && h.includes("_hi") ? 4.8 : 4.4; st.cctv = i === 0; st.last = { cups: Math.round(occ[i] * 2600), theft: 10, rev: 300, cost: 220, q: 1 }; st.hist = [40]; });
  }
  const list = kind === "pr" ? S.pr.rooms : kind === "airbnb" ? S.ab.units : S.uc.stores;
  if (h.includes("_setup") && list[0]) { if (kind === "pr") { list[0].status = "setup"; list[0].last = null; } else { list[0].last = null; list[0].months = 0; } }
  if (h.includes("_dark") && list[1]) { if (kind === "airbnb") list[1].banned = 2; else list[1].hist = kind === "pr" ? [-50, -80, -30].map((v, k) => ({ t: S.t - 3 + k, occ: 0.2, rev: 200, profit: v, rating: list[1].rating })) : [-50, -80, -30]; if (kind === "pr") list[1].red = 3; } // 파티룸 hist 는 객체(엔진 avgProfit)
  if (h.includes("_broken") && kind === "ucafe" && list[0]) list[0].broken = 1;
  if (h.includes("_night") && kind === "ucafe" && list[0]) { list[0].night = false; if (list[1]) list[1].chain = 1; } // v4.29 밤엔 닫음·옆에 체인
}
// opt(파티룸만): { sel: 고른 지점 id, onSel(id): 판을 눌러 지점을 고름, onDeco(rm): 성적표의 [가구 배치 보기] }
export function tycoonScene(S, kind, opt = {}) {
  try {
    testSetup(S, kind);
    const m = model(S, kind), id = ++SEQ; m.S = S; m.opt = opt || {}; m.sel = m.opt.sel ?? null; MODELS.set(id, m); if (MODELS.size > 6) MODELS.delete(MODELS.keys().next().value);
    const n = m.stores.length, lab = n ? `내 매장 ${n}곳 장면. 가게를 누르면 그 가게 카드로 가요` : m.empty;
    if (kind === "pr" && n) return `<div class="tyc tyc-pr" data-tyc="${id}" data-k="pr" role="group" aria-label="내 파티룸 ${n}곳. 건물을 누르면 성적표가 떠요"><div class="tp-track"></div><button type="button" class="tp-arr l" aria-label="왼쪽 지점" hidden>‹</button><button type="button" class="tp-arr r" aria-label="오른쪽 지점" hidden>›</button><div class="tp-dots" hidden></div></div>`;
    if (kind === "airbnb" && n) return `<div class="tyc tyc-pr" data-tyc="${id}" data-k="airbnb" role="group" aria-label="내 숙소 ${n}채. 집을 누르면 성적표가 떠요"><div class="tp-track"></div><button type="button" class="tp-arr l" aria-label="왼쪽 숙소" hidden>‹</button><button type="button" class="tp-arr r" aria-label="오른쪽 숙소" hidden>›</button><div class="tp-dots" hidden></div></div>`;
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

// ───────── 파티룸 보드 거리(11-26 대표 승인 "이대로 넣어줘" · docs/board_demo/index.html 그대로) ─────────
// 지점마다 판 하나: 동네(rm.dk)마다 다른 건물 20가지 중 내 층보다 높은 것을 방 번호로 고정해 고르고, 내 층(rm.floor)에만 불이 켜진다. 지하는 계단과 입간판.
const PH = 236, PGY = 170, PCURB = 196;
// 동네별 건물 20가지. n = 층수, f = 앞면 위·아래 색, s = 옆면, t = 지붕, win = 창 모양, cols = 창 칸, shop = 1층 가게, roof = 지붕
// 겉모습 요소: set = [몇 층부터, 양옆 들어가는 비율](셋백·테라스), sign = 층마다 가게 간판 띠, bal = 발코니 난간, pil = 기둥 수, fin = 세로 핀,
// brick·tile = 벽 무늬, cornice = 처마 띠, pent = 옥탑 계단실, ac = 옆면 실외기·배관, slab = 층 슬래브 띠, canopy = 로비 차양
const PB = [
  { dk: "univ", n: 5, f: ["#a65a40", "#7a3a28"], s: "#5c2a1c", t: "#b5634a", win: "grid", cols: 3, shop: "cafe", roof: "tank", brick: 1, sign: 1, ac: 1, pent: 1, cornice: 1 },
  { dk: "univ", n: 4, f: ["#ece6da", "#cfc6b2"], s: "#9c937f", t: "#f2ede4", win: "grid", cols: 4, shop: "book", roof: "tank", tile: 1, sign: 1, cornice: 1 },
  { dk: "univ", n: 6, f: ["#cfb892", "#a68e6a"], s: "#7c6a4c", t: "#d8c39e", win: "ribbon", cols: 3, shop: "conv", roof: "flat", set: [5, 0.12], sign: 1, pil: 3, ac: 1 },
  { dk: "univ", n: 5, f: ["#9095a0", "#6c6f78"], s: "#4e5058", t: "#a2a5ad", win: "grid", cols: 3, shop: "chicken", roof: "flat", sign: 1, cornice: 1, pent: 1, ac: 1 },
  { dk: "office", n: 12, f: ["#6a90bc", "#3a5676"], s: "#2c4058", t: "#7a9cc4", win: "curtain", cols: 5, shop: "glass", roof: "equip", set: [11, 0.1], fin: 1, canopy: 1 },
  { dk: "office", n: 10, f: ["#454b5c", "#272b36"], s: "#1c1f28", t: "#4e5466", win: "ribbon", cols: 4, shop: "glass", roof: "equip", set: [9, 0.14], slab: 1, canopy: 1 },
  { dk: "office", n: 8, f: ["#d6cebc", "#a89e88"], s: "#7e7562", t: "#ddd6c6", win: "tall", cols: 4, shop: "cafe", roof: "flat", pil: 4, cornice: 1, canopy: 1 },
  { dk: "office", n: 11, f: ["#78a0b2", "#4a6a7a"], s: "#344c58", t: "#86a9b8", win: "curtain", cols: 4, shop: "conv", roof: "equip", fin: 1 },
  { dk: "home", n: 5, f: ["#ecd9b6", "#c8b28e"], s: "#9a8566", t: "#f0e2c8", win: "grid", cols: 4, shop: "bakery", roof: "flat", tile: 1, sign: 1, cornice: 1, pent: 1 },
  { dk: "home", n: 4, f: ["#f4f2ec", "#d6d2c6"], s: "#a8a395", t: "#faf8f2", win: "tall", cols: 3, shop: "cafe", roof: "garden", bal: 1, slab: 1 },
  { dk: "home", n: 6, f: ["#dfc9a6", "#b9a07c"], s: "#8c7556", t: "#e6d4b6", win: "grid", cols: 4, shop: "conv", roof: "tank", set: [5, 0.1], sign: 1, ac: 1 },
  { dk: "home", n: 4, f: ["#ae6250", "#843f30"], s: "#5e2c22", t: "#bb6c58", win: "grid", cols: 3, shop: "book", roof: "gable", brick: 1, bal: 1 },
  { dk: "hot", n: 4, f: ["#a2503a", "#7a3424"], s: "#56241a", t: "#b05a44", win: "arch", cols: 3, shop: "glass", roof: "garden", brick: 1, cornice: 1, canopy: 1 },
  { dk: "hot", n: 3, f: ["#f1ebdf", "#d4cbba"], s: "#a49a86", t: "#f6f1e8", win: "tall", cols: 3, shop: "cafe", roof: "garden", set: [3, 0.14], slab: 1 },
  { dk: "hot", n: 4, f: ["#34353b", "#1f2024"], s: "#141417", t: "#40424a", win: "tall", cols: 3, shop: "glass", roof: "flat", fin: 1, pent: 1, canopy: 1 },
  { dk: "under", n: 6, f: ["#a0a6b0", "#787e88"], s: "#585d66", t: "#b0b5be", win: "grid", cols: 4, shop: "conv", roof: "flat", sign: 1, ac: 1, pent: 1, cornice: 1, sub: 1 },
  { dk: "under", n: 7, f: ["#c8bfac", "#a0977f"], s: "#776f5c", t: "#d2cab8", win: "ribbon", cols: 4, shop: "chicken", roof: "tank", set: [6, 0.12], sign: 1, ac: 1, sub: 1 },
  { dk: "local", n: 3, f: ["#ddd4bd", "#b8ae94"], s: "#8c8268", t: "#e4dcc8", win: "grid", cols: 3, shop: "chicken", roof: "tank", tile: 1, sign: 1, ac: 1 },
  { dk: "local", n: 4, f: ["#c9cfd5", "#a2a8ae"], s: "#7a8086", t: "#d4d9de", win: "grid", cols: 3, shop: "bakery", roof: "flat", sign: 1, cornice: 1 },
  { dk: "local", n: 2, f: ["#e3cbab", "#c0a684"], s: "#8e7656", t: "#ecdabe", win: "grid", cols: 5, shop: "conv", roof: "gable", sign: 1 },
];
const SIGNC = ["#2f5aa8", "#c2412f", "#2f7a52", "#e0a62a", "#6a3fa0", "#1f6f8a", "#d06a2a", "#8a2a4a", "#3d3d48"];
function ptag(g, x, y, text, bg, fg = "#fff", px = 11, left = false) { g.font = font(px); const w = g.measureText(text).width + 12, h = px + 6, x0 = left ? x : x - w / 2; rr(g, x0, y - h / 2, w, h, h / 2); g.fillStyle = bg; g.fill(); g.fillStyle = fg; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(text, x0 + 6, y + 0.5); return w; }
// 매물에 맞는 건물: 그 동네 건물 가운데 내 층보다 높은 것(지하는 지하 있는 건물)
function pickB(r) { const c = PB.filter((b) => b.dk === r.dk && (r.fl < 0 || b.n > r.fl)); const k = c.length ? c : PB.filter((b) => b.n > Math.max(1, r.fl)); return k[(r.id * 7) % k.length]; }
// 건물 칸 계산
function geo(r, W) {
  const b = pickB(r), w = clamp(W * 0.52, 76, 132), d = w * 0.2, gH = 24, top = b.pent || b.roof === "equip" ? 42 : b.roof === "gable" ? 40 : 32;
  const fH = clamp((PGY - top - gH) / Math.max(1, b.n - 1), 8.5, 17), h = gH + fH * (b.n - 1), x = (W - w - d) / 2;
  const floorY = (k) => (k === 1 ? PGY - gH : PGY - gH - (k - 1) * fH);
  const ins = (f) => (b.set && f >= b.set[0] ? Math.round(b.set[1] * w) : 0); // 셋백: 그 층부터 양옆이 들어간다
  const fx = (f) => x + ins(f), fw = (f) => w - 2 * ins(f);
  return { b, w, d, gH, fH, h, x, floorY, fx, fw, ins, sg: b.sign ? 0.3 : 0, lobby: x + w * 0.82, stair: x + 18 };
}
function skyline(g, W, dk, rnd) {
  const far = "rgba(20,18,44,.55)", near = "rgba(14,12,32,.85)";
  if (dk === "local") { g.fillStyle = "rgba(30,26,60,.7)"; g.beginPath(); g.moveTo(0, PGY - 30); for (let x = 0; x <= W; x += 20) g.lineTo(x, PGY - 40 - Math.sin(x * 0.03 + 1) * 18 - rnd() * 6); g.lineTo(W, PGY); g.lineTo(0, PGY); g.fill(); }
  const hi = { office: 120, under: 85, univ: 60, home: 90, hot: 38, local: 28 }[dk], bwR = dk === "home" ? [30, 14] : [16, 26];
  for (const [col, k, wc] of [[far, 1, "rgba(255,220,150,.35)"], [near, 0.65, "rgba(255,210,140,.5)"]]) {
    let x = -rnd() * 20;
    while (x < W) { const bw = bwR[0] + rnd() * bwR[1], bh = (dk === "home" ? 0.8 + rnd() * 0.2 : 0.3 + rnd() * 0.7) * hi * k + 12; g.fillStyle = col; g.fillRect(x, PGY - bh, bw, bh);
      if (dk === "hot" && rnd() < 0.3) { g.fillRect(x + bw * 0.6, PGY - bh - 14, 4, 14); }
      for (let yy = PGY - bh + 5; yy < PGY - 6; yy += dk === "office" ? 5 : 7) for (let xx = x + 3; xx < x + bw - 3; xx += dk === "home" ? 4 : 5) if (rnd() < (dk === "office" ? 0.35 : 0.2)) { g.fillStyle = wc; g.fillRect(xx, yy, 2, 2.5); }
      x += bw + 2 + rnd() * 6; }
  }
  if (dk === "univ") for (let i = 0; i < 6; i++) { const tx = rnd() * W; g.fillStyle = "rgba(30,60,45,.8)"; g.beginPath(); g.arc(tx, PGY - 10, 9 + rnd() * 6, 0, 7); g.fill(); }
}
// 동네마다 다른 하늘·인도·소품
const SKYD = {
  univ: ["#1d1838", "#6a3f78", "#e8807a"], office: ["#0c1430", "#24406e", "#6d8fc0"], home: ["#1c1a3c", "#5a5088", "#d8a0a8"],
  hot: ["#1e1424", "#7a3a3c", "#f2a050"], under: ["#140f2a", "#3e2a64", "#b0508a"], local: ["#0a0c22", "#1e2a4e", "#4a5a7a"],
};
const WALK = { univ: ["#5a5470", "#423d58"], office: ["#6a6e7c", "#4c505e"], home: ["#7a7068", "#5a524c"], hot: ["#7a4a40", "#5a342c"], under: ["#4a4560", "#34304a"], local: ["#5c5a58", "#44423f"] };
function pStatic(g, W, r, G, rnd) {
  const sk = SKYD[r.dk] || SKYD.univ, gr = g.createLinearGradient(0, 0, 0, PGY); gr.addColorStop(0, sk[0]); gr.addColorStop(0.62, sk[1]); gr.addColorStop(1, sk[2]); g.fillStyle = gr; g.fillRect(0, 0, W, PGY + 2);
  const nStar = { local: 70, home: 26, univ: 22, hot: 16, under: 10, office: 6 }[r.dk] || 20; for (let i = 0; i < nStar; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; const s = r.dk === "local" && rnd() < 0.2 ? 1.8 : 1.2; g.fillRect(rnd() * W, rnd() * (r.dk === "local" ? 90 : 60), s, s); }
  const mx = W * 0.84, my = 24; g.fillStyle = "rgba(255,246,214,.95)"; g.beginPath(); g.arc(mx, my, 8, 0, 7); g.fill(); g.fillStyle = sk[0]; g.beginPath(); g.arc(mx + 4, my - 3, 7, 0, 7); g.fill();
  skyline(g, W, r.dk, rnd);
  // 인도(동네마다 바닥재가 다르다)
  const wk = WALK[r.dk] || WALK.univ, sw = g.createLinearGradient(0, PGY, 0, PCURB); sw.addColorStop(0, wk[0]); sw.addColorStop(1, wk[1]); g.fillStyle = sw; g.fillRect(0, PGY, W, PCURB - PGY);
  g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 0.8;
  if (r.dk === "office") { for (let x = 0; x < W; x += 14) { g.beginPath(); g.moveTo(x, PGY); g.lineTo(x - 6, PCURB); g.stroke(); } for (let y = PGY + 8; y < PCURB; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
  else if (r.dk === "hot") { g.strokeStyle = "rgba(0,0,0,.18)"; for (let y = PGY + 3, i = 0; y < PCURB; y += 4, i++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (i % 2) * 4; x < W; x += 8) { g.beginPath(); g.moveTo(x - (y - PGY) * 0.3, y - 4); g.lineTo(x - (y - PGY) * 0.3, y); g.stroke(); } } }
  else if (r.dk === "home") { for (let x = 0; x < W; x += 10) for (let y = PGY + 4; y < PCURB; y += 8) { g.strokeRect(x + ((y / 8) % 2) * 5 - (y - PGY) * 0.3, y, 10, 8); } }
  else { for (let x = 0; x < W; x += 18) { g.beginPath(); g.moveTo(x, PGY); g.lineTo(x - 8, PCURB); g.stroke(); } }
  g.fillStyle = "#b9b4cc"; g.fillRect(0, PCURB, W, 2.5); g.fillStyle = r.dk === "local" ? "#26252a" : "#1f1d2c"; g.fillRect(0, PCURB + 2.5, W, PH - PCURB);
  if (r.dk === "under" || r.dk === "office") { g.fillStyle = "rgba(240,240,250,.55)"; for (let x = W * 0.06; x < W * 0.4; x += 7) g.fillRect(x, PCURB + 6, 4, PH - PCURB - 10); } // 횡단보도
  else { g.fillStyle = "rgba(255,230,140,.5)"; for (let x = 6; x < W; x += 30) g.fillRect(x, 212, 14, 1.6); }
  neighbors(g, W, G, rnd, r.dk);
  for (const lx of [W * 0.08, W - W * 0.08]) { g.fillStyle = "#2a2838"; g.fillRect(lx - 1, PGY - 46, 2.2, 52); g.fillRect(lx - 1, PGY - 46, 8, 2); }
  props(g, W, r, G, rnd, "back");
  building(g, r, G);
  props(g, W, r, G, rnd, "front");
  pExtra(g, W, r, G);
}
// 동네 소품. 건물 양옆 빈 인도에 둔다
function props(g, W, r, G, rnd, layer) {
  const L = G.x - 6, R = G.x + G.w + G.d + 6, left = L > 22, right = W - R > 22, k = r.dk;
  const tree = (x, s = 1, lights = false) => { g.fillStyle = "#3a2a20"; g.fillRect(x - 1, PGY - 16 * s, 2, 16 * s); g.fillStyle = "#24543a"; g.beginPath(); g.arc(x, PGY - 20 * s, 9 * s, 0, 7); g.arc(x - 6 * s, PGY - 15 * s, 6 * s, 0, 7); g.arc(x + 6 * s, PGY - 15 * s, 6 * s, 0, 7); g.fill(); if (lights) for (let i = 0; i < 9; i++) { g.fillStyle = "rgba(255,226,150,.9)"; g.fillRect(x - 9 * s + rnd() * 18 * s, PGY - 28 * s + rnd() * 16 * s, 1.3, 1.3); } };
  if (layer === "back") {
    if (k === "hot") { g.strokeStyle = "rgba(60,40,30,.6)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(W / 2, 62, W, 40); g.stroke(); for (let i = 0; i < 16; i++) { const t = i / 15, x = t * W, y = 40 + 22 * 4 * t * (1 - t) * 0.98; g.fillStyle = "rgba(255,214,140,.95)"; g.beginPath(); g.arc(x, y + 2, 1.4, 0, 7); g.fill(); } }
    if (k === "univ") { const gx = W * 0.5, gy = PGY - 8; g.fillStyle = "rgba(40,30,60,.55)"; g.fillRect(gx - 40, gy - 30, 6, 30); g.fillRect(gx + 34, gy - 30, 6, 30); g.fillRect(gx - 44, gy - 34, 88, 6); } // 먼 교문
    return;
  }
  if (k === "under") {
    if (left) { const sx = 4, sw = Math.min(30, L - 8); g.fillStyle = "#2f6a4a"; g.fillRect(sx, PGY - 22, sw, 3); g.fillStyle = "rgba(200,230,210,.25)"; g.fillRect(sx + 2, PGY - 19, sw - 4, 16); g.strokeStyle = "#8ac0a0"; g.lineWidth = 1; g.strokeRect(sx + 2, PGY - 19, sw - 4, 16); g.fillStyle = "#1a3a2a"; g.fillRect(sx + sw / 2 - 6, PGY - 30, 12, 7); g.fillStyle = "#7fd0a0"; g.beginPath(); g.arc(sx + sw / 2, PGY - 26.5, 2.2, 0, 7); g.fill(); } // 지하철 출입구
    if (right) { const bx = R + 2, bw = Math.min(34, W - R - 6); g.fillStyle = "#444a5a"; g.fillRect(bx, PGY - 24, bw, 2.5); g.fillRect(bx + 1, PGY - 22, 1.5, 22); g.fillRect(bx + bw - 2.5, PGY - 22, 1.5, 22); g.fillStyle = "rgba(160,190,220,.25)"; g.fillRect(bx + 3, PGY - 21, bw - 6, 14); g.fillStyle = "#e0a62a"; g.fillRect(bx + bw - 10, PGY - 20, 6, 9); } // 버스 정류장
  }
  if (k === "office" && right) { const bx = R + 4; g.fillStyle = "#3a4050"; g.fillRect(bx, PGY - 6, Math.min(26, W - R - 8), 5); g.fillStyle = "#2f6040"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(bx + 4 + i * 8, PGY - 8, 3.5, 0, 7); g.fill(); } } // 화단 벤치
  if (k === "home") { if (left) { tree(L - 12, 0.9); g.fillStyle = "#6a4a36"; g.fillRect(4, PGY - 5, Math.min(22, L - 26), 2); g.fillRect(6, PGY - 3, 1.5, 3); } if (right) tree(R + 12, 0.9); }
  if (k === "univ") { if (left) { tree(L - 12, 0.85); } if (right) { const bx = R + 4; g.strokeStyle = "#9aa0ac"; g.lineWidth = 0.9; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(bx + 4 + i * 8, PGY - 4, 3.2, 0, 7); g.stroke(); g.beginPath(); g.arc(bx + 9 + i * 8, PGY - 4, 3.2, 0, 7); g.stroke(); } } } // 자전거
  if (k === "hot") { if (left) tree(L - 12, 0.9, true); if (right) { g.fillStyle = "#2a2228"; g.fillRect(R + 4, PGY - 14, 3, 14); g.fillStyle = "#c86a3a"; g.fillRect(R + 4, PGY - 20, 14, 7); } }
  if (k === "local" && right) { g.fillStyle = "#5a5f6a"; g.fillRect(R + 6, PGY - 26, 2, 26); g.strokeStyle = "rgba(30,30,40,.7)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(R + 7, PGY - 24); g.quadraticCurveTo(W * 0.9, PGY - 18, W + 4, PGY - 26); g.stroke(); } // 전봇대
}
function neighbors(g, W, G, rnd, dk) { // 양옆 이웃 건물(동네 느낌대로, 어둡게)
  const L = G.x - 4, R = G.x + G.w + G.d + 4, H0 = { office: [90, 60], under: [70, 50], univ: [55, 40], home: [70, 40], hot: [35, 25], local: [28, 18] }[dk] || [60, 50];
  const body = { office: "#232a40", hot: "#3a2228", home: "#2e2a40", local: "#2c2a34" }[dk] || "#2b2540";
  for (const [x0, x1] of [[-6, L], [R, W + 6]]) { if (x1 - x0 < 8) continue; const h = H0[0] + rnd() * H0[1]; g.fillStyle = body; g.fillRect(x0, PGY - h, x1 - x0, h);
    if (dk === "hot") { g.fillStyle = "rgba(0,0,0,.15)"; for (let yy = PGY - h + 2; yy < PGY; yy += 3) g.fillRect(x0, yy, x1 - x0, 0.5); }
    for (let yy = PGY - h + 8; yy < PGY - 20; yy += dk === "office" ? 9 : 12) for (let xx = x0 + 5; xx < x1 - 6; xx += 10) { g.fillStyle = rnd() < (dk === "office" ? 0.4 : 0.3) ? "rgba(255,214,140,.55)" : "#1c1830"; g.fillRect(xx, yy, 5, dk === "office" ? 5 : 6); }
    if (dk === "under" && x1 - x0 > 30 && x0 > 0) { const bw = Math.min(40, x1 - x0 - 8); const lg = g.createLinearGradient(x0 + 4, 0, x0 + 4 + bw, 0); lg.addColorStop(0, "#ff4f9a"); lg.addColorStop(0.5, "#7a5aff"); lg.addColorStop(1, "#3ad0ff"); g.fillStyle = lg; g.fillRect(x0 + 4, PGY - h + 6, bw, 16); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x0 + 6, PGY - h + 9, bw * 0.5, 2); } // LED 전광판
    g.fillStyle = { hot: "#4a2c30", office: "#2e3650" }[dk] || "#3a3254"; g.fillRect(x0, PGY - 22, x1 - x0, 22); }
}
// 상자 하나(앞면 그라데이션·옆면·윗면)
function boxF(g, x, yb, w, h, d, b, top = true) {
  const k = 0.55;
  const sg = g.createLinearGradient(x + w, 0, x + w + d, 0); sg.addColorStop(0, b.s); sg.addColorStop(1, shadeC(b.s, 0.8));
  g.fillStyle = sg; poly(g, [x + w, yb, x + w + d, yb - d * k, x + w + d, yb - h - d * k, x + w, yb - h]); g.fill();
  if (top) poly(g, [x, yb - h, x + w, yb - h, x + w + d, yb - h - d * k, x + d, yb - h - d * k], b.t);
  const gr = g.createLinearGradient(x, yb - h, x, yb); gr.addColorStop(0, b.f[0]); gr.addColorStop(1, b.f[1]); g.fillStyle = gr; g.fillRect(x, yb - h, w, h);
  // 모서리 빛(왼쪽 위에서 빛)
  g.fillStyle = "rgba(255,255,255,.10)"; g.fillRect(x, yb - h, 1.2, h); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + w - 1, yb - h, 1, h);
}
function shadeC(c, f) { const n = c.replace("#", ""), v = [0, 2, 4].map((i) => Math.round(parseInt(n.slice(i, i + 2), 16) * f)); return `rgb(${v.join(",")})`; }
function building(g, r, G) {
  const { b, w, d, gH, fH, h, x, floorY, fx, fw } = G, k = 0.55, base = PGY;
  g.save(); g.fillStyle = "rgba(0,0,0,.32)"; g.beginPath(); g.ellipse(x + w / 2 + d / 2, base + 2, w * 0.64, 4.5, 0, 0, 7); g.fill(); g.restore();
  // 층 묶음(셋백마다 상자 하나). 아래부터 그려서 윗상자가 아래 지붕(테라스)을 덮는다
  const segs = []; let s0 = 1; for (let f = 2; f <= b.n + 1; f++) if (f > b.n || G.ins(f) !== G.ins(s0)) { segs.push([s0, f - 1]); s0 = f; }
  for (const [a, z] of segs) {
    const x0 = fx(a), w0 = fw(a), yb = a === 1 ? base : floorY(a) + fH, yt = floorY(z);
    boxF(g, x0, yb, w0, yb - yt, d, b);
    // 벽 무늬
    g.save(); g.beginPath(); g.rect(x0, yt, w0, yb - yt - (a === 1 ? gH : 0)); g.clip();
    if (b.brick) { g.strokeStyle = "rgba(40,10,5,.18)"; g.lineWidth = 0.5; for (let yy = yt + 2, i = 0; yy < yb; yy += 2.6, i++) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + w0, yy); g.stroke(); for (let xx = x0 + (i % 2 ? 2.5 : 0); xx < x0 + w0; xx += 5) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 2.6); g.stroke(); } } }
    if (b.tile) { g.strokeStyle = "rgba(0,0,0,.07)"; g.lineWidth = 0.5; for (let yy = yt + 3; yy < yb; yy += 3.5) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + w0, yy); g.stroke(); } for (let xx = x0 + 3; xx < x0 + w0; xx += 3.5) { g.beginPath(); g.moveTo(xx, yt); g.lineTo(xx, yb); g.stroke(); } }
    g.restore();
    // 처마·파라펫: 묶음 맨 위에 앞으로 나온 띠
    if (b.cornice || a > 1 || segs.length > 1) { const cy = yt; g.fillStyle = shadeC(b.t.length === 7 ? b.t : "#888888", 0.92); g.fillRect(x0 - 1.5, cy - 2.5, w0 + 3, 3); poly(g, [x0 + w0 + 1.5, cy - 2.5, x0 + w0 + 1.5 + d, cy - 2.5 - d * k, x0 + w0 + 1.5 + d, cy + 0.5 - d * k, x0 + w0 + 1.5, cy + 0.5], shadeC(b.s, 0.9)); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x0, cy + 0.5, w0, 1.2); }
  }
  // 테라스 난간(셋백 아래 지붕 끝)
  for (let i = 1; i < segs.length; i++) { const a = segs[i][0], ty = floorY(a) + fH, x0 = fx(a - 1), w0 = fw(a - 1); g.strokeStyle = "rgba(230,235,245,.75)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x0, ty - 5); g.lineTo(x0 + w0, ty - 5); for (let xx = x0; xx <= x0 + w0; xx += 3) { g.moveTo(xx, ty - 5); g.lineTo(xx, ty); } g.stroke(); g.fillStyle = "#3d7a4e"; for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x0 + 4 + j * 6, ty - 3, 2.2, 0, 7); g.fill(); } }
  // 층마다: 슬래브 띠·간판 띠·창·발코니
  for (let f = 2; f <= b.n; f++) {
    const x0 = fx(f), w0 = fw(f), y0 = floorY(f);
    if (b.slab) { g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(x0, y0 + fH - 1.6, w0, 1.6); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x0, y0 + fH, w0, 0.8); }
    else { g.fillStyle = "rgba(0,0,0,.13)"; g.fillRect(x0, y0 + fH - 1, w0, 1); }
    if (b.sign && f !== r.fl && f <= 5) { // 층마다 다른 가게 간판(글자 없음)
      const c = SIGNC[(f * 5 + r.id * 3 + b.n) % SIGNC.length], sh = fH * 0.26; g.fillStyle = c; g.fillRect(x0 + 2, y0 + 1, w0 - 4, sh); g.fillStyle = "rgba(255,255,255,.35)"; const n = 2 + ((f + r.id) % 3); for (let i = 0; i < n; i++) g.fillRect(x0 + 6 + i * (w0 - 12) / n, y0 + 1 + sh * 0.35, (w0 - 12) / n * 0.6, sh * 0.3); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x0 + 2, y0 + 1 + sh, w0 - 4, 0.8);
    }
    for (const [wx, wy, ww, wh] of wins(G, f)) win(g, b, wx, wy, ww, wh);
    if (b.bal) { const by = y0 + fH - 2.5; g.fillStyle = shadeC(b.f[1], 0.9); g.fillRect(x0 + 2, by, w0 - 4, 2); g.strokeStyle = "rgba(235,238,245,.7)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x0 + 2, by - 4); g.lineTo(x0 + w0 - 2, by - 4); for (let xx = x0 + 2; xx <= x0 + w0 - 2; xx += 2.5) { g.moveTo(xx, by - 4); g.lineTo(xx, by); } g.stroke(); }
  }
  // 기둥·세로 핀
  if (b.pil) { const top = floorY(b.n), n = b.pil; for (let i = 0; i <= n; i++) { const px = fx(2) + i * (fw(2) - 3) / n; g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(px, top, 3, PGY - gH - top); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(px + 3, top, 0.8, PGY - gH - top); } }
  if (b.fin) { const top = floorY(b.n); for (let px = fx(2) + 4; px < fx(2) + fw(2) - 2; px += 6) { g.fillStyle = "rgba(20,24,34,.45)"; g.fillRect(px, top, 1.2, PGY - gH - top); } }
  // 옆면: 창·실외기·배관
  for (let f = 2; f <= b.n; f++) { const xr = fx(f) + fw(f), y = floorY(f) + fH * 0.3, hh = fH * 0.42; g.fillStyle = "rgba(10,8,24,.5)"; poly(g, [xr + d * 0.3, y - d * 0.3 * k, xr + d * 0.7, y - d * 0.7 * k, xr + d * 0.7, y + hh - d * 0.7 * k, xr + d * 0.3, y + hh - d * 0.3 * k]); g.fill();
    if (b.ac && f % 2 === 0) { const ax = xr + d * 0.12, ay = floorY(f) + fH - 4; g.fillStyle = "#cfd2da"; poly(g, [ax, ay, ax + 5, ay - 2.7, ax + 5, ay + 1, ax, ay + 3.7]); g.fill(); g.fillStyle = "#8a8e98"; g.beginPath(); g.arc(ax + 2.5, ay + 0.5, 1, 0, 7); g.fill(); } }
  if (b.ac) { const px = x + w + d * 0.86; g.strokeStyle = "rgba(200,205,215,.6)"; g.lineWidth = 1; g.beginPath(); g.moveTo(px, PGY - d * 0.86 * k); g.lineTo(px, floorY(b.n) - d * 0.86 * k + 4); g.stroke(); }
  // 1층 가게
  shop(g, G);
  // 지붕
  const tx = fx(b.n), tw = fw(b.n), ty = floorY(b.n);
  if (b.pent) { const pw = tw * 0.32, px = tx + tw - pw - 4; boxF(g, px, ty - d * 0.3, pw, 11, d * 0.6, b); g.fillStyle = "#2a2838"; g.fillRect(px + pw * 0.2, ty - d * 0.3 - 8, pw * 0.3, 8); }
  if (b.roof === "tank") { const qx = tx + tw * 0.18; g.fillStyle = "#8a909c"; rr(g, qx, ty - 12, 13, 8, 2); g.fill(); g.fillStyle = "#5f6470"; g.fillRect(qx + 2, ty - 4, 1.4, 4); g.fillRect(qx + 9, ty - 4, 1.4, 4); }
  if (b.roof === "equip") { g.fillStyle = "#4a5060"; g.fillRect(tx + tw * 0.15, ty - 9, tw * 0.4, 7); g.fillStyle = "#6a7080"; for (let i = 0; i < 3; i++) g.fillRect(tx + tw * 0.18 + i * tw * 0.12, ty - 11, tw * 0.08, 2); g.strokeStyle = "#9aa0ac"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(tx + tw * 0.75, ty); g.lineTo(tx + tw * 0.75, ty - 18); g.stroke(); g.fillStyle = "#ff5a6a"; g.fillRect(tx + tw * 0.75 - 0.8, ty - 19, 1.6, 1.6); }
  if (b.roof === "garden") { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#3d7a4e" : "#2f6040"; g.beginPath(); g.arc(tx + 5 + i * (tw - 10) / 5 + d * 0.35, ty - d * 0.22 - 3, 3.6, 0, 7); g.fill(); } g.strokeStyle = "rgba(235,240,245,.6)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(tx, ty - 5); g.lineTo(tx + tw, ty - 5); for (let xx = tx; xx <= tx + tw; xx += 3) { g.moveTo(xx, ty - 5); g.lineTo(xx, ty); } g.stroke(); }
  if (b.roof === "gable") { const ov = 4; poly(g, [tx - ov, ty, tx + tw / 2, ty - 15, tx + tw + ov, ty], "#5e3a2e"); poly(g, [tx + tw / 2, ty - 15, tx + tw + ov, ty, tx + tw + ov + d, ty - d * k, tx + tw / 2 + d, ty - 15 - d * k], "#4a2c22"); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 0.6; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(tx - ov + i * (tw / 2 + ov) / 6, ty - 15 * i / 6); g.lineTo(tx + tw + ov - i * (tw / 2 + ov) / 6, ty - 15 * i / 6); g.stroke(); } }
  // 지하 계단 입구
  if (r.fl < 0) { // 인도에 난 지하 계단(안쪽이 밝다)
    const sx = G.stair - 16, sy = PGY + 3, sw = 32, sd = 17; g.fillStyle = "#0b0916"; poly(g, [sx, sy, sx + sw, sy, sx + sw + 4, sy + sd, sx - 4, sy + sd]); g.fill();
    for (let i = 0; i < 6; i++) { const yy = sy + 2 + i * 2.6; g.fillStyle = `rgba(255,${200 - i * 8},${140 - i * 10},${0.18 + i * 0.09})`; g.fillRect(sx + 2 - i * 0.6, yy, sw - 4 + i * 1.2, 1.6); }
    g.strokeStyle = "#d6d9e4"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx - 4, sy - 9); g.lineTo(sx - 4, sy + sd - 2); g.moveTo(sx + sw + 4, sy - 9); g.lineTo(sx + sw + 4, sy + sd - 2); g.moveTo(sx - 4, sy - 9); g.lineTo(sx + sw + 4, sy - 9); g.stroke();
    g.fillStyle = "#d6d9e4"; g.fillRect(sx + sw / 2 - 0.6, sy - 9, 1.2, 9); }
}
// 창 하나(꺼진 상태): 창틀·유리 반사·창턱·창살
function win(g, b, wx, wy, ww, wh) {
  if (b.win === "curtain") { const gl = g.createLinearGradient(wx, wy, wx + ww, wy + wh); gl.addColorStop(0, "#2c3a5a"); gl.addColorStop(0.5, "#1b2238"); gl.addColorStop(1, "#28324e"); g.fillStyle = gl; g.fillRect(wx, wy, ww, wh); g.fillStyle = "rgba(255,255,255,.07)"; poly(g, [wx + ww * 0.55, wy, wx + ww * 0.7, wy, wx + ww * 0.5, wy + wh, wx + ww * 0.35, wy + wh]); g.fill(); g.fillStyle = "rgba(160,180,210,.35)"; for (let xx = wx + 5; xx < wx + ww; xx += 6) g.fillRect(xx, wy, 0.6, wh); return; }
  g.fillStyle = "rgba(240,238,232,.55)"; if (b.win === "arch") { g.beginPath(); g.moveTo(wx - 1, wy + wh + 1); g.lineTo(wx - 1, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 1, Math.PI, 0); g.lineTo(wx + ww + 1, wy + wh + 1); g.closePath(); g.fill(); } else g.fillRect(wx - 0.8, wy - 0.8, ww + 1.6, wh + 1.6);
  const gl = g.createLinearGradient(wx, wy, wx, wy + wh); gl.addColorStop(0, "#2a2e48"); gl.addColorStop(1, "#15142a"); g.fillStyle = gl;
  if (b.win === "arch") { g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill(); } else g.fillRect(wx, wy, ww, wh);
  g.fillStyle = "rgba(255,255,255,.08)"; poly(g, [wx + ww * 0.6, wy, wx + ww * 0.85, wy, wx + ww * 0.45, wy + wh, wx + ww * 0.2, wy + wh]); g.fill();
  g.fillStyle = "rgba(120,110,130,.6)"; if (b.win !== "ribbon") g.fillRect(wx + ww / 2 - 0.4, wy, 0.8, wh); else for (let xx = wx + 7; xx < wx + ww; xx += 8) g.fillRect(xx, wy, 0.7, wh);
  g.fillStyle = "rgba(245,243,238,.8)"; g.fillRect(wx - 1.2, wy + wh, ww + 2.4, 1.2);
}
function wins(G, f) {
  const { b, fH, floorY } = G, x = G.fx(f), w = G.fw(f), pad = 5, gap = 3, n = Math.max(2, Math.round(b.cols * w / G.w)), y0 = floorY(f), top = y0 + fH * G.sg, fh = fH * (1 - G.sg), out = [];
  if (b.win === "curtain") { out.push([x + 2, y0 + 1, w - 4, fH - 2.2]); return out; }
  if (b.win === "ribbon") { out.push([x + pad, top + fh * 0.26, w - pad * 2, fh * 0.46]); return out; }
  const cw = (w - pad * 2 - gap * (n - 1)) / n, hh = b.win === "tall" || b.win === "arch" ? fh * 0.66 : fh * 0.52, yy = top + (fh - hh) / 2 - (b.bal ? 1 : 0);
  for (let i = 0; i < n; i++) out.push([x + pad + i * (cw + gap), yy, cw, hh]);
  return out;
}
function shop(g, G) {
  const { b, w, x, gH, d } = G, y = PGY - gH, col = { cafe: ["#7b5638", "#f3e7d1"], book: ["#2f5a46", "#e8dcc0"], conv: ["#3b6fd0", "#ffffff"], bakery: ["#b8743a", "#fff1d8"], glass: ["#2a2d38", "#9fb6d4"], chicken: ["#d6542e", "#ffe2a8"] }[b.shop] || ["#555", "#ddd"];
  // 1층 간판 띠(글자 없음)
  g.fillStyle = col[0]; g.fillRect(x, y, w * 0.72, 5); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(x + 4, y + 1.6, w * 0.3, 1.6);
  // 진열창(기둥으로 나뉨)
  const sx = x + 3, sw = w * 0.68, sy = y + 8, sh = gH - 9;
  g.fillStyle = "#1c1612"; g.fillRect(sx - 1, sy - 1, sw + 2, sh + 1);
  const ig = g.createLinearGradient(0, sy, 0, PGY); ig.addColorStop(0, "rgba(255,226,170,.92)"); ig.addColorStop(1, "rgba(240,180,110,.85)"); g.fillStyle = ig; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = "rgba(90,60,40,.55)"; for (let i = 0; i < 3; i++) g.fillRect(sx + 4 + i * sw / 3, PGY - 7, sw / 3 - 8, 3); // 진열대
  g.fillStyle = "#2a221c"; for (let i = 1; i < 3; i++) g.fillRect(sx + i * sw / 3 - 0.8, sy, 1.6, sh);
  g.fillStyle = "rgba(255,255,255,.18)"; poly(g, [sx + sw * 0.55, sy, sx + sw * 0.65, sy, sx + sw * 0.45, sy + sh, sx + sw * 0.35, sy + sh]); g.fill();
  if (b.shop !== "glass") { const n = Math.max(4, Math.round(w * 0.7 / 9)), stw = (w * 0.7) / n, ay = y + 5; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? col[1] : col[0]; g.beginPath(); g.moveTo(x + 1 + i * stw, ay); g.lineTo(x + 1 + (i + 1) * stw, ay); g.lineTo(x + 1 + (i + 1) * stw, ay + 4); g.arc(x + 1 + (i + 0.5) * stw, ay + 4, stw / 2, 0, Math.PI); g.closePath(); g.fill(); } }
  // 화분
  for (const px of [x + 2, x + w * 0.66]) { g.fillStyle = "#6a4a36"; g.fillRect(px, PGY - 4, 4, 4); g.fillStyle = "#3d7a4e"; g.beginPath(); g.arc(px + 2, PGY - 6, 3, 0, 7); g.fill(); }
  // 로비 문 + 차양(위층 손님이 들어가는 곳)
  const lx = x + w * 0.74, lw = w * 0.2; g.fillStyle = "#121020"; g.fillRect(lx, y + 4, lw, gH - 4); const lg = g.createLinearGradient(0, y + 4, 0, PGY); lg.addColorStop(0, "rgba(255,240,210,.6)"); lg.addColorStop(1, "rgba(255,240,210,.15)"); g.fillStyle = lg; g.fillRect(lx + 1.5, y + 6, lw - 3, gH - 7);
  g.fillStyle = "#cfd2e6"; g.fillRect(lx + lw / 2 - 0.5, y + 6, 1, gH - 7);
  if (b.canopy) { g.fillStyle = "#e6e8ee"; g.fillRect(lx - 3, y + 1.5, lw + 6, 2.2); poly(g, [lx + lw + 3, y + 1.5, lx + lw + 3 + 4, y + 1.5 - 2.2, lx + lw + 3 + 4, y + 3.7 - 2.2, lx + lw + 3, y + 3.7], "#b8bcc6"); g.fillStyle = "rgba(255,236,200,.35)"; g.fillRect(lx, y + 3.7, lw, 2); }
  // 1층 기둥(가게와 로비 사이)
  g.fillStyle = shadeC(b.f[1], 0.75); g.fillRect(x + w * 0.715, y, 2.4, gH);
}
// 시안에 없던 실제 상태(정적 층): 겨울 눈 · 성수기 깃발 · 공사 중 줄무늬 · 영업정지 테이프
function pExtra(g, W, r, G) {
  const { x, w, gH, fH, floorY } = G;
  if (r.season === "winter") { g.fillStyle = "rgba(255,255,255,.75)"; for (let xx = 0; xx < W; xx += 3) g.fillRect(xx, PCURB - 1 - ((xx * 7) % 3), 3, 2); }
  if (r.peak && r.on) { // 성수기: 가로등 사이 깃발 줄
    const x0 = W * 0.08 + 6, x1 = W * 0.92 - 6, y0 = PGY - 45, cols = ["#ff6b7f", "#f5c04e", "#5fe0a0", "#6aa8ff", "#ff9f5a"], n = Math.max(6, Math.round((x1 - x0) / 11));
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 + 18, x1, y0); g.stroke();
    for (let i = 1; i < n; i++) { const k = i / n, px = x0 + (x1 - x0) * k, py = y0 + 18 * 2 * k * (1 - k); poly(g, [px - 2.6, py, px + 2.6, py, px, py + 5.5], cols[i % 5]); }
  }
  const stripes = (sx, sy, sw, sh) => { g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip(); g.fillStyle = "rgba(245,192,78,.88)"; g.fillRect(sx, sy, sw, sh); for (let k = -sh; k < sw + sh; k += 7) poly(g, [sx + k, sy + sh, sx + k + 3.5, sy + sh, sx + k + 3.5 + sh, sy, sx + k + sh, sy], "#1b1b22"); g.restore(); };
  const cone = (cx, base) => { poly(g, [cx - 3.5, base + 2, cx + 3.5, base + 2, cx, base - 9], "#ff7a2e"); g.fillStyle = "#fff"; g.fillRect(cx - 2, base - 4, 4, 1.4); };
  if (r.setup) {
    if (r.fl >= 2) { const x0 = G.fx(r.fl), w0 = G.fw(r.fl), y0 = floorY(r.fl); g.fillStyle = "rgba(40,40,52,.7)"; g.fillRect(x0, y0, w0, fH); stripes(x0 + 2, y0 + fH * 0.36, w0 - 4, Math.min(5, fH * 0.3)); cone(G.lobby - 6, PGY + 6); cone(G.lobby + 12, PGY + 6); }
    else { const sx = G.stair - 16; stripes(sx - 4, PGY + 1, 40, 4); cone(sx - 8, PGY + 8); cone(sx + 40, PGY + 8); }
  }
  if (r.ban) { const lx = x + w * 0.74, lw = w * 0.2, y = PGY - gH + 4; g.save(); g.strokeStyle = "#f5c04e"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(lx - 2, y); g.lineTo(lx + lw + 2, PGY); g.moveTo(lx + lw + 2, y); g.lineTo(lx - 2, PGY); g.stroke(); g.restore(); }
}
// ───────── 움직이는 층(지점 하나) ─────────
function pLive(g, W, r, G, st, t) {
  for (const lx of [W * 0.08, W - W * 0.08]) { const lg = g.createRadialGradient(lx + 6, PGY - 44, 1, lx + 6, PGY - 44, 30); lg.addColorStop(0, "rgba(255,220,140,.7)"); lg.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = lg; g.fillRect(lx - 26, PGY - 76, 64, 64); }
  const { b, w, d, fH, x, floorY } = G, col = NEON[r.concept] || "#ff4fd8", ph = r.id * 1.7, on = r.on, lv = 0.35 + r.occ * 0.65, flN = r.flReal >= 1 ? r.flReal : r.fl;
  // 다른 층: 몇 칸만 사무실 불(정해진 자리)
  const R = rng(r.id * 131 + 7);
  for (let f = 2; f <= b.n; f++) { if (f === r.fl) continue; for (const [wx, wy, ww, wh] of wins(G, f)) { if (R() < 0.3) { g.fillStyle = R() < 0.5 ? "rgba(220,232,255,.55)" : "rgba(255,226,170,.5)"; g.fillRect(wx, wy, ww * (b.win === "curtain" || b.win === "ribbon" ? 0.3 + R() * 0.4 : 1), wh); } } }
  // 내 층: 따뜻한 불(지난달 예약률만큼 밝게) + 사람 그림자 + 콘셉트 색
  if (r.fl >= 2) {
    if (on) for (const [wx, wy, ww, wh] of wins(G, r.fl)) {
      const fl = (0.9 + 0.1 * Math.sin(t * 2 + wx)) * (0.55 + 0.45 * r.occ);
      const wg = g.createLinearGradient(wx, wy, wx, wy + wh); wg.addColorStop(0, `rgba(255,226,150,${fl})`); wg.addColorStop(1, `rgba(255,170,90,${fl})`); g.fillStyle = wg; g.fillRect(wx, wy, ww, wh);
      g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); g.globalCompositeOperation = "lighter"; g.fillStyle = col.replace(/^#(..)(..)(..)$/, (m, a, c, e) => `rgba(${parseInt(a, 16)},${parseInt(c, 16)},${parseInt(e, 16)},${0.18 * lv})`); g.fillRect(wx, wy, ww, wh); g.globalCompositeOperation = "source-over";
      const nd = Math.max(1, Math.round(ww / 9 * r.occ)); for (let i = 0; i < nd; i++) { const px = wx + 4 + ((i * 9 + t * 3 + wx) % Math.max(4, ww - 6)), bob = Math.abs(Math.sin(t * 4 + i * 1.7 + ph)) * 1.4, py = wy + wh - bob; g.fillStyle = "rgba(40,16,30,.85)"; g.beginPath(); g.arc(px, py - Math.min(6, wh * 0.55), Math.min(2.2, wh * 0.18), 0, 7); g.fill(); g.fillRect(px - 2, py - Math.min(4, wh * 0.38), 4, wh); }
      g.restore();
      g.save(); g.shadowColor = "rgba(255,200,110,.9)"; g.shadowBlur = 10 * (0.5 + 0.5 * r.occ); g.strokeStyle = "rgba(255,210,140,.5)"; g.lineWidth = 0.8; g.strokeRect(wx, wy, ww, wh); g.restore();
    }
    if (G.b.sign) { const sy0 = floorY(r.fl) + 1, sh = fH * 0.26, x0 = G.fx(r.fl) + 2, w0 = G.fw(r.fl) - 4, fl3 = on ? (Math.sin(t * 7 + ph) > -0.95 ? 1 : 0.5) : 0.3; g.save(); g.shadowColor = col; g.shadowBlur = on ? 8 * fl3 : 0; g.fillStyle = "#16101f"; g.fillRect(x0, sy0, w0, sh); g.strokeStyle = on ? col : "#5a4a6a"; g.globalAlpha = on ? fl3 : 0.7; g.lineWidth = 1; g.strokeRect(x0 + 0.5, sy0 + 0.5, w0 - 1, sh - 1); g.restore(); g.fillStyle = on ? "#fff" : "#6a5a7a"; g.font = font(Math.min(8, sh * 0.8), 900); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("PARTY ROOM", x0 + w0 / 2, sy0 + sh / 2 + 0.3); }
    // 옆면 돌출 간판(층)
    const y = floorY(r.fl), sx = G.fx(r.fl) + G.fw(r.fl) + d * 0.15, sy = y - 1, fl2 = on ? (Math.sin(t * 11 + ph) > -0.94 ? 1 : 0.4) : 0.3;
    g.save(); g.shadowColor = col; g.shadowBlur = on ? 8 * fl2 : 0; g.fillStyle = "#14101f"; poly(g, [sx, sy, sx + 26, sy - 6, sx + 26, sy + fH + 2 - 6, sx, sy + fH + 2]); g.fill(); g.strokeStyle = on ? col : "#5a4a6a"; g.globalAlpha = on ? fl2 : 0.7; g.lineWidth = 1.2; g.stroke(); g.restore();
    g.save(); g.fillStyle = on ? "#fff" : "#8a7a9a"; g.font = font(Math.min(10, fH * 0.62), 900); g.textAlign = "center"; g.textBaseline = "middle"; g.translate(sx + 13, sy + fH / 2 - 2.5); g.transform(1, -0.23, 0, 1, 0, 0); g.fillText(`${flN}F`, 0, 0); g.restore();
  }
  // 지하: 입간판 + 계단 불빛
  if (r.fl < 0) {
    const sx = G.stair - 16, sy = PGY + 3, lv2 = on ? 0.5 + r.occ * 0.5 : 0.06, pul = 0.85 + 0.15 * Math.sin(t * 3 + ph); const sg = g.createLinearGradient(0, sy, 0, sy + 17); sg.addColorStop(0, "rgba(255,190,110,.05)"); sg.addColorStop(1, `rgba(255,170,90,${0.75 * lv2 * pul})`); g.fillStyle = sg; poly(g, [sx, sy, sx + 32, sy, sx + 36, sy + 17, sx - 4, sy + 17]); g.fill();
    const ax = sx + 50, ay = PCURB - 2, fl2 = on ? (Math.sin(t * 9 + ph) > -0.93 ? 1 : 0.45) : 0.3;
    g.fillStyle = "#2a2534"; poly(g, [ax - 9, ay, ax - 6, ay - 30, ax + 6, ay - 30, ax + 9, ay]); g.fill();
    g.save(); g.shadowColor = col; g.shadowBlur = on ? 10 * fl2 : 0; rr(g, ax - 8, ay - 29, 16, 22, 2); g.fillStyle = "#120e1e"; g.fill(); g.strokeStyle = on ? col : "#5a4a6a"; g.globalAlpha = on ? fl2 : 0.7; g.lineWidth = 1.2; g.stroke(); g.restore();
    g.fillStyle = on ? "#fff" : "#8a7a9a"; g.font = font(9, 900); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("B1", ax, ay - 22); g.font = font(7, 800); g.fillStyle = on ? col : "#8a7a9a"; g.fillText("파티룸", ax, ay - 13); g.fillStyle = on ? "#fff" : "#8a7a9a"; g.fillText("↓", ax, ay - 4.5);
  }
  // 사람
  for (const p of st.ppl.slice().sort((a, c) => a.y - c.y)) drawPerson(g, p, t, st.dpr);
  // 별점 반짝(4.7 이상)
  if (on && r.star >= 4.7) for (let i = 0; i < 3; i++) { const a = (Math.sin(t * 2.2 + i * 2.1 + ph) + 1) / 2, sx = x + w * (0.15 + i * 0.35) + d * 0.5, sy = PGY - G.h - 12 - (i % 2) * 7, rr2 = 2 + a * 2.4; g.save(); g.globalAlpha = 0.35 + a * 0.65; g.fillStyle = "#ffe27a"; g.shadowColor = "#ffd24a"; g.shadowBlur = 6; g.beginPath(); g.moveTo(sx, sy - rr2 * 1.8); g.quadraticCurveTo(sx, sy, sx + rr2 * 1.8, sy); g.quadraticCurveTo(sx, sy, sx, sy + rr2 * 1.8); g.quadraticCurveTo(sx, sy, sx - rr2 * 1.8, sy); g.quadraticCurveTo(sx, sy, sx, sy - rr2 * 1.8); g.fill(); g.restore(); }
  // 적자·영업정지·공사 중 표
  const ty = r.fl >= 2 ? Math.max(34, floorY(r.fl) - 8) : PGY - 34, tx = x + (w + d) / 2;
  if (r.setup) ptag(g, tx, ty, "공사 중", "#ff7a2e");
  else if (r.dark) ptag(g, tx, ty, r.ban ? `영업정지 ${r.ban}달` : `적자 ${r.red}달`, r.ban ? "#d9364a" : "rgba(120,30,50,.92)");
  // 계절 입자
  for (const q of st.fx) { g.globalAlpha = q.a; if (r.season === "winter") { g.fillStyle = "#fff"; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); } else { g.fillStyle = r.season === "spring" ? "#ffc0d6" : r.season === "autumn" ? "#f08a3e" : "rgba(255,230,160,.9)"; g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, q.r * 1.6, q.r * 0.8, 0, 0, 7); g.fill(); g.restore(); } }
  g.globalAlpha = 1;
  // 이름표
  ptag(g, 8, 14, `${r.no} · ${r.fl < 0 ? "B1" : flN + "F"} · ${r.size}평`, "rgba(10,8,24,.78)", "#fff", 11, true);
  if (r.peakN && on) ptag(g, 8, 33, r.peakN, "#ff5a7a", "#fff", 10, true);
  ptag(g, W / 2, 222, r.setup ? `${r.dkn} · 오픈 준비` : `${r.dkn} ★${r.star.toFixed(1)}`, "rgba(10,8,24,.82)", on && r.star >= 4.7 ? "#ffe27a" : r.dark ? "#ff9aa8" : "#fff");
}
// 손님(몸은 img/body 캐릭터 그림, 다리는 선) — 위층은 로비 문, 지하는 계단으로 들어간다
function pMk(st, r, G, rnd, toStore) {
  const ids = PPL.pr, fromL = rnd() < 0.5, W = st.W, id = ids[Math.floor(rnd() * ids.length)], lane = PGY + 9 + rnd() * 14;
  const p = { id, spr: sprite(id, st.dpr), x: fromL ? -10 : W + 10, y: lane, lane, vx: (fromL ? 1 : -1) * (14 + rnd() * 10), ph: rnd() * 6, st: "walk", store: toStore, sc: 0.95 + rnd() * 0.1, seed: rnd() * 9, coat: COATS[Math.floor(rnd() * COATS.length)], fade: 1, bag: null, bagC: COATS[Math.floor(rnd() * COATS.length)] };
  if (toStore) { p.tx = (r.fl < 0 ? G.stair : G.lobby) + (rnd() - 0.5) * 4; p.vx = Math.sign(p.tx - p.x) * Math.abs(p.vx); if (rnd() < 0.35) p.bag = rnd() < 0.5 ? "balloon" : "gift"; }
  return p;
}
function pStep(st, r, G, dt, rnd) {
  for (const p of st.ppl) {
    p.ph += dt * Math.abs(p.vx) * 0.42;
    if (p.st === "walk") { p.x += p.vx * dt; if (p.store && (p.vx > 0 ? p.x >= p.tx : p.x <= p.tx)) { p.x = p.tx; p.st = "in"; } }
    else if (p.st === "in") { if (r.fl < 0) { p.y += 10 * dt; p.fade -= dt * 1.6; } else { p.y -= 22 * dt; if (p.y <= PGY + 1) p.fade -= dt * 3; } if (p.fade <= 0) { p.st = "inside"; p.wait = 3 + rnd() * 6; } }
    else if (p.st === "inside") { p.wait -= dt; if (p.wait <= 0) { p.st = "out"; p.fade = 0; p.y = r.fl < 0 ? PCURB - 2 : PGY + 1; } }
    else if (p.st === "out") { p.fade = Math.min(1, p.fade + dt * 3); p.y += (r.fl < 0 ? -6 : 22) * dt; if ((r.fl < 0 && p.fade >= 1) || p.y >= p.lane) { p.y = p.lane; p.st = "leave"; p.vx = (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 10); } }
    else if (p.st === "leave") p.x += p.vx * dt;
  }
  st.ppl = st.ppl.filter((p) => !((p.st === "walk" && !p.store) || p.st === "leave") || (p.x > -20 && p.x < st.W + 20));
  st.spawn -= dt;
  if (st.spawn <= 0) { st.spawn = 0.6 + rnd() * 1.0; const have = st.ppl.filter((p) => p.store && p.st !== "leave").length, want = r.on ? Math.round((0.2 + r.occ) * 4 * (r.peak ? 1.2 : 1)) : 0; if (have < want) st.ppl.push(pMk(st, r, G, rnd, true)); const amb = st.ppl.filter((p) => !p.store).length; if (amb < 2 + (r.peak ? 1 : 0) && rnd() < 0.6) st.ppl.push(pMk(st, r, G, rnd, false)); }
  if (r.season !== "summer" || r.peak) { // 계절 입자(겨울 눈·봄 꽃잎·가을 낙엽)
    const want = r.season === "winter" ? 22 : r.season === "summer" ? 0 : 6;
    while (st.fx.length < want) st.fx.push({ x: rnd() * st.W, y: -rnd() * PH, r: r.season === "winter" ? 0.8 + rnd() * 1.4 : 1.3 + rnd(), a: 0.5 + rnd() * 0.5, vy: r.season === "winter" ? 10 + rnd() * 14 : 9 + rnd() * 8, vx: r.season === "winter" ? -3 + rnd() * 6 : 6 + rnd() * 8, rot: rnd() * 6, ph: rnd() * 6 });
    for (const q of st.fx) { q.ph += dt; q.y += q.vy * dt; q.x += (q.vx + Math.sin(q.ph * 1.7) * 6) * dt; q.rot += dt * 2; if (q.y > PH + 4 || q.x > st.W + 6 || q.x < -6) { q.y = -4; q.x = rnd() * st.W; } }
  }
}
function pPanel(r, W, dpr) {
  const el = document.createElement("div"); el.className = "tp-pan"; el.style.width = W + "px"; el.setAttribute("role", "button"); el.tabIndex = 0; el.setAttribute("aria-label", `${r.no} ${r.dkn} 성적표 보기`);
  const cv = document.createElement("canvas"); cv.width = Math.round(W * dpr); cv.height = Math.round(PH * dpr); cv.style.width = W + "px"; cv.style.height = PH + "px"; el.appendChild(cv);
  const g = cv.getContext("2d"), G = geo(r, W), bg = document.createElement("canvas"); bg.width = cv.width; bg.height = cv.height; const bgc = bg.getContext("2d"); bgc.setTransform(dpr, 0, 0, dpr, 0, 0); pStatic(bgc, W, r, G, rng(r.id * 97 + 11));
  const st = { W, dpr, ppl: [], fx: [], spawn: 0 }, rnd = rng(r.id * 31 + 5); let t = 0;
  for (let i = 0; i < 240; i++) { t += 1 / 30; pStep(st, r, G, 1 / 30, rnd); } // 처음부터 손님이 오가는 중
  el._tick = (dt) => { t += dt; pStep(st, r, G, dt, rnd); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, PH); g.drawImage(bg, 0, 0, W, PH); pLive(g, W, r, G, st, t); };
  el._tick(0);
  return el;
}
// ───────── 붙이기(지점별 판 · 1곳 전체 폭, 2곳 반반, 3곳부터 ‹ › 와 점) ─────────
const PCACHE = new Map(), PRV = { first: 0, sel: null }; // 다시 그릴 때(탭 누름 등) 판과 위치를 이어 쓴다
function prR(m, s) {
  const dk = D.DISTRICTS[s.dk] ? s.dk : "univ", fl = s.floor < 0 ? -1 : Math.max(2, s.floor || 2);
  return { id: s.idn, rid: s.id, no: s.no, dk, dkn: D.DISTRICTS[dk].n, fl, flReal: s.floor, size: s.size || 20, concept: s.sub, occ: s.occ, star: s.rating || 0, on: !s.setup && !s.dark, setup: !!s.setup, dark: !!s.dark, ban: s.ban, red: s.red, peak: !!m.peak, peakN: m.peak, season: m.season };
}
function mountPr(root, m) {
  const K = KIT[m.kind], PCACHE = K.cache, PRV = K.rv;
  const track = root.querySelector(".tp-track"), al = root.querySelector(".tp-arr.l"), ar = root.querySelector(".tp-arr.r"), dots = root.querySelector(".tp-dots");
  const dpr = Math.min(3, window.devicePixelRatio || 1), rs = m.stores.map((s) => K.R(m, s)), N = rs.length;
  for (const id of PPL[m.kind] || PPL.pr) sprite(id, dpr);
  let pans = [], first = PRV.first, selId = PRV.sel ?? m.sel, raf = 0, vis = true, last = 0, dead = false;
  const nv = () => (N === 1 ? 1 : 2);
  const place = () => {
    const v = nv(), pw = pans[0] ? parseFloat(pans[0].style.width) : 0; first = clamp(first, 0, Math.max(0, N - v)); PRV.first = first;
    track.style.transform = `translateX(${-first * pw}px)`;
    const many = N > 2; al.hidden = ar.hidden = dots.hidden = !many; al.disabled = first <= 0; ar.disabled = first >= N - v;
    dots.innerHTML = many ? rs.map((_, i) => `<i class="${i >= first && i < first + v ? "on" : ""}"></i>`).join("") : "";
    go();
  };
  const sel = (id, scroll) => {
    selId = id; PRV.sel = id; pans.forEach((p) => { const on = p.dataset.id === id; p.classList.toggle("sel", on && N > 1); p.setAttribute("aria-pressed", on ? "true" : "false"); });
    const i = rs.findIndex((r) => r.rid === id), v = nv(); if (scroll && i >= 0 && (i < first || i >= first + v)) first = clamp(i - (i >= first + v ? v - 1 : 0), 0, Math.max(0, N - v));
    place();
  };
  const pick = (r) => { sel(r.rid, true); try { m.opt.onSel?.(r.rid); } catch (e) { console.warn("tycoon sel", e); } K.stat(m, r.rid); };
  const build = () => {
    const W = Math.max(240, Math.round(root.clientWidth || 360)), pw = Math.floor(W / nv()), keep = new Set();
    pans = rs.map((r) => { const sig = JSON.stringify([r, pw, dpr]); let c = PCACHE.get(r.rid); if (!c || c.sig !== sig) { c = { sig, el: K.pan(r, pw, dpr) }; PCACHE.set(r.rid, c); } keep.add(r.rid);
      const el = c.el; el.dataset.id = r.rid; el.onclick = () => pick(r); el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(r); } }; return el; });
    for (const k of [...PCACHE.keys()]) if (!keep.has(k)) PCACHE.delete(k);
    track.style.transition = "none"; track.replaceChildren(...pans); track.classList.toggle("multi", N > 1);
    pans.forEach((p) => p.classList.toggle("sel", p.dataset.id === selId && N > 1)); place(); void track.offsetWidth; track.style.transition = "";
  };
  al.onclick = (e) => { e.stopPropagation(); first = Math.max(0, first - 1); place(); };
  ar.onclick = (e) => { e.stopPropagation(); first = first + 1; place(); };
  const loop = (now) => {
    raf = 0; if (dead) return; if (!root.isConnected) return stop();
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    pans.forEach((p, i) => { if (i >= first - 1 && i <= first + nv()) p._tick(dt); }); // 보이는 판(+옆 판)만 움직인다
    if (vis && !document.hidden) raf = requestAnimationFrame(loop);
  };
  function go() { if (!raf && !dead && vis && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { vis = es.some((e) => e.isIntersecting); if (vis) go(); }, { threshold: 0.01 }) : null; io?.observe(root);
  const onVis = () => go(); document.addEventListener("visibilitychange", onVis);
  let rw = root.clientWidth; const ro = "ResizeObserver" in window ? new ResizeObserver(() => { if (!root.isConnected) return stop(); /* 빠진 판은 다시 짓지 않는다 */ if (Math.abs(root.clientWidth - rw) > 4) { rw = root.clientWidth; build(); } }) : null; ro?.observe(root);
  function stop() { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; io?.disconnect(); ro?.disconnect(); document.removeEventListener("visibilitychange", onVis); }
  root._tycStop = stop;
  const chk = setInterval(() => { if (!root.isConnected) { clearInterval(chk); stop(); } }, 4000);
  build();
  // 고른 지점(탭 → 장면): 한 박자 뒤에 옮겨야 판이 미끄러지고 은은한 빛이 옮겨 간다
  requestAnimationFrame(() => { if (!dead) sel(m.sel && rs.some((r) => r.rid === m.sel) ? m.sel : rs[0].rid, true); });
}
// ───────── 성적표(건물을 누르면) ─────────
const escH = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// 달 번호(s.t) → "2028년 12월". 지금 달(S.year·S.cal·S.t)에서 거꾸로 센다(engine/yearend.js 와 같은 식)
function ymOf(S, t) { const k = S.year * 12 + (S.cal - 1) - (S.t - t); return `${Math.floor(k / 12)}년 ${(((k % 12) + 12) % 12) + 1}월`; }
function prStat(m, rid) {
  const S = m.S, rm = S?.pr?.rooms.find((x) => x.id === rid); if (!rm) return;
  const won = E.won, st = PR.roomStats(rm), dk = D.DISTRICTS[rm.dk] ? rm.dk : "univ", sgn = (v) => (v < 0 ? "−" : v > 0 ? "+" : "") + won(Math.abs(v));
  const openT = rm.openT ?? (rm.status === "open" ? S.t - (rm.months || 0) : null), L = rm.last;
  document.getElementById("tp-stov")?._close?.();
  const ov = document.createElement("div"); ov.id = "tp-stov"; ov.className = "tp-ov";
  const fl = rm.floor < 0 ? "지하 1층" : `${rm.floor}층`, cn = D.CONCEPTS[rm.concept]?.n || "";
  ov.innerHTML = `<div class="tp-box" role="dialog" aria-modal="true" aria-labelledby="tp-stt"><div class="tp-bg" style="background-image:url(img/bg/pr_${dk}_${(rm.size || 20) <= 25 ? "s" : "l"}.webp)"></div><div class="tp-in">
    <div class="row"><b id="tp-stt" class="grow" style="font-size:18px">${escH(rm.name)}</b><button type="button" class="tp-x" aria-label="닫기">✕</button></div>
    <span class="tiny muted">${fl} · ${rm.size}평 · ${escH(cn)} · ${rm.deco ? "직접 꾸민 방" : "업체 기본 배치"}</span>
    <div class="tp-grid"><div><span>개점</span><b>${openT != null ? ymOf(S, openT) : "오픈 준비 중"}</b></div><div><span>운영</span><b>${rm.months || 0}개월</b></div>
    <div><span>지금까지 번 돈</span><b class="${st.cum < 0 ? "bad" : ""}">${sgn(st.cum)}</b></div><div><span>누적 예약</span><b>${(st.books || 0).toLocaleString()}건</b></div>
    <div><span>지난달 예약률</span><b>${L ? Math.round(L.occ * 100) + "%" : "-"}</b></div><div><span>별점</span><b class="gold">${rm.status === "open" ? "★" + (rm.rating || 0).toFixed(2) : "-"}</b></div></div>
    <div class="tp-best"><div><span>최고 매출${st.bestM ? " · " + ymOf(S, st.bestM.t) : ""}</span><b class="up">${st.bestM ? won(st.bestM.v) : "아직 없음"}</b></div><div><span>최저 매출${st.worstM ? " · " + ymOf(S, st.worstM.t) : ""}</span><b class="dn">${st.worstM ? won(st.worstM.v) : "아직 없음"}</b></div></div>
    <button type="button" class="tp-go">가구 배치 보기</button></div></div>`;
  const back = document.activeElement;
  const close = () => { ov.remove(); document.removeEventListener("keydown", onKey, true); try { if (back?.isConnected) back.focus?.(); } catch (e) { /* 포커스 되돌리기 실패는 무시 */ } };
  const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  ov._close = close; document.addEventListener("keydown", onKey, true);
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector(".tp-x").onclick = close;
  ov.querySelector(".tp-go").onclick = () => { close(); try { m.opt.onDeco?.(rm); } catch (e) { console.warn("tycoon deco", e); } };
  document.body.appendChild(ov); ov.querySelector(".tp-x").focus();
}

// ───────── 에어씨앤씨 보드 거리(11-26 대표 요청) ─────────
// 파티룸 판과 같은 틀(숙소마다 판 하나). 간판·네온·깜빡임 없이 "불 켜진 창과 안에 있는 사람 기척"으로만 내 집을 알린다.
// 겉모습은 종류(u.ty)마다 여러 가지를 숙소 번호로 고정해 고르고, 동네(u.rk)에 어울리는 것부터 쓴다.
// 독채 5(현무암 돌집·삼각 통나무집·흰 상자집·이층 마당집·바닷가 방갈로) · 오피스텔 4(유리 타워·타일 발코니·벽돌+유리·검은 핀 타워)
// 원룸·투룸 빌라 4(벽돌 필로티·바깥 계단+옥탑방·신축 발코니·옛 다세대 반지하) · 한옥 3(담장+솟을대문·대청 정면·ㄱ자 누마루)
const A_ORD = {
  detached: { jeju: [0, 2, 4, 3, 1], busan: [4, 2, 3, 0, 1], _: [3, 1, 2, 4, 0] },
  officetel: { busan: [0, 3, 1, 2], seongsu: [2, 0, 3, 1], hongdae: [1, 2, 0, 3], _: [0, 1, 2, 3] },
  villa: { hongdae: [0, 1, 3, 2], seongsu: [3, 2, 0, 1], busan: [2, 1, 0, 3], _: [0, 1, 2, 3] },
  hanok: { jongno: [0, 2, 1], gyeongju: [1, 2, 0], _: [0, 1, 2] },
};
const A_VILLA = [
  { n: 4, f: ["#a85c42", "#7c3c2a"], s: "#5a2a1c", t: "#b4654c", brick: 1, pil: 1, roof: "tank" },
  { n: 3, f: ["#ece5d6", "#cbc2ac"], s: "#9a917c", t: "#d9d3c4", tile: 1, xst: 1, roof: "oktap" },
  { n: 5, f: ["#bfc2ca", "#8f939d"], s: "#63666f", t: "#c9ccd3", pil: 1, bal: 1, set: 1, roof: "flat" },
  { n: 3, f: ["#9c5240", "#743626"], s: "#532418", t: "#3f7a58", brick: 1, semi: 1, roof: "green" },
];
const A_OTEL = [
  { n: 12, wr: 0.4, f: ["#6f97c2", "#3d5a7c"], s: "#2b415a", t: "#7ea2c8", win: "curtain", cols: 5, roof: "equip", canopy: "glass" },
  { n: 9, wr: 0.46, f: ["#e6dcc6", "#bfb399"], s: "#8e846c", t: "#ece4d2", win: "bal", cols: 4, tile: 1, roof: "tank", canopy: "light" },
  { n: 8, wr: 0.46, f: ["#a2553c", "#77382a"], s: "#54251a", t: "#ae5e46", win: "bay", cols: 3, brick: 1, roof: "garden", canopy: "steel" },
  { n: 13, wr: 0.33, f: ["#3c3f4a", "#23252d"], s: "#16171c", t: "#494c58", win: "fin", cols: 4, roof: "crown", canopy: "steel" },
];
const aKind = (ty) => (ty === "officetel" || ty === "hanok" || ty === "detached" ? ty : "villa");
function aPick(r) { const o = A_ORD[aKind(r.ty)], l = o[r.rk] || o._; return r.pv != null ? r.pv % l.length : l[(Math.max(1, r.id) - 1) % l.length]; }
function aGeo(r, W) {
  const k = aKind(r.ty), pat = aPick(r), G = { k, pat, W, cx: W / 2, mine: [], oth: [], lamps: [], d: 0, s: 1 };
  if (k === "hanok" || k === "detached") { G.s = clamp(W / 150, 1.2, 1.45); W = W / G.s; G.W = W; G.cx = W / 2; } // 집은 키워 그린다(안에서는 줄인 폭으로 계산)
  if (k === "villa") { const P = A_VILLA[pat]; G.w = clamp(W * 0.48, 82, 150); G.d = G.w * 0.18; G.x = (W - G.w - G.d) / 2 + (P.xst ? 9 : 0); G.x0 = G.x - (P.xst ? 20 : 0); G.x1 = G.x + G.w + G.d; }
  else if (k === "officetel") { const P = A_OTEL[pat]; G.w = clamp(W * P.wr, P.wr * 170, P.wr * 330); G.d = G.w * 0.2; G.x = (W - G.w - G.d) / 2; G.x0 = G.x; G.x1 = G.x + G.w + G.d; }
  else if (k === "hanok") { G.w = clamp(W * 0.72, 116, 196); G.x = (W - G.w) / 2; G.x0 = G.x - 6; G.x1 = G.x + G.w + 6; }
  else { const [wr, lo, hi, d] = [[0.6, 104, 168, 12], [0.5, 88, 124, 0], [0.62, 104, 160, 12], [0.5, 90, 128, 14], [0.62, 104, 166, 12]][pat]; G.w = clamp(W * wr, lo, hi); G.d = d; G.x = (W - G.w - d * 0.7) / 2; G.x0 = G.x - 4; G.x1 = G.x + G.w + d; }
  G.door = G.x + G.w / 2; G.top = PGY - 60;
  return G;
}
// 창 하나(꺼진 모습)를 그리고 자리를 적어 둔다. mine = 내 집 창(불이 켜질 자리) · o.paper = 한지 창호 · o.shp = 네모가 아닌 창(꼭짓점 배열, "c" = 둥근 창)
function aLattice(g, x, y, w, h, c) { g.fillStyle = c; const nx = Math.max(2, Math.round(w / 4.4)), ny = Math.max(2, Math.round(h / 4.4)); for (let i = 1; i < nx; i++) g.fillRect(x + (w * i) / nx - 0.3, y, 0.6, h); for (let j = 1; j < ny; j++) g.fillRect(x, y + (h * j) / ny - 0.3, w, 0.6); }
function aWin(g, G, mine, x, y, w, h, o = {}) {
  const nb = o.bars ?? (w > 15 ? 2 : 1);
  if (o.paper) { g.fillStyle = "#4a2f1c"; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = "#8d8570"; g.fillRect(x, y, w, h); aLattice(g, x, y, w, h, "rgba(58,36,20,.85)"); }
  else {
    g.fillStyle = o.fr || "rgba(240,238,232,.62)"; g.fillRect(x - 0.9, y - 0.9, w + 1.8, h + 1.8);
    const gl = g.createLinearGradient(x, y, x, y + h); gl.addColorStop(0, "#2a2e48"); gl.addColorStop(1, "#15142a"); g.fillStyle = gl; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,.08)"; poly(g, [x + w * 0.6, y, x + w * 0.85, y, x + w * 0.45, y + h, x + w * 0.2, y + h]); g.fill();
    g.fillStyle = o.barC || "rgba(120,110,130,.6)"; for (let i = 1; i <= nb; i++) g.fillRect(x + (w * i) / (nb + 1) - 0.4, y, 0.8, h);
    if (o.cross) g.fillRect(x, y + h * 0.42, w, 0.8);
    if (o.sill !== 0) { g.fillStyle = "rgba(245,243,238,.8)"; g.fillRect(x - 1.2, y + h, w + 2.4, 1.2); }
  }
  (mine ? G.mine : G.oth).push([x, y, w, h, o.paper ? 1 : 0, nb, null]);
}
function aWall(g, P, x, y, w, h) {
  if (P.brick) { g.strokeStyle = "rgba(40,10,5,.18)"; g.lineWidth = 0.5; for (let yy = y + 2, i = 0; yy < y + h; yy += 2.6, i++) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); for (let xx = x + (i % 2 ? 2.5 : 0); xx < x + w; xx += 5) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 2.6); g.stroke(); } } }
  if (P.tile) { g.strokeStyle = "rgba(0,0,0,.07)"; g.lineWidth = 0.5; for (let yy = y + 3; yy < y + h; yy += 3.5) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } for (let xx = x + 3; xx < x + w; xx += 3.5) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); } }
}
function aShadow(g, cx, w) { g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(cx, PGY + 2, w * 0.6, 4.5, 0, 0, 7); g.fill(); }
function aCar(g, cx, base, s, c) { g.save(); g.translate(cx, base); g.scale(s, s); g.fillStyle = c; rr(g, -15, -9, 30, 8, 3); g.fill(); rr(g, -8, -14, 15, 6, 2.5); g.fill(); g.fillStyle = "rgba(150,180,210,.45)"; g.fillRect(-6, -13, 5, 4); g.fillRect(0, -13, 5, 4); g.fillStyle = "#0c0c10"; g.beginPath(); g.arc(-9, -1, 3, 0, 7); g.arc(9, -1, 3, 0, 7); g.fill(); g.restore(); }
function aBush(g, x, base, rad, c = "#2f6a44") { g.fillStyle = c; g.beginPath(); g.arc(x, base - rad * 0.7, rad, 0, 7); g.arc(x - rad * 0.8, base - rad * 0.4, rad * 0.7, 0, 7); g.arc(x + rad * 0.8, base - rad * 0.4, rad * 0.7, 0, 7); g.fill(); }
function aTree(g, x, base, s, c = "#24543a", fruit = "") { g.fillStyle = "#3a2a20"; g.fillRect(x - 1, base - 15 * s, 2.2, 15 * s); g.fillStyle = c; g.beginPath(); g.arc(x, base - 20 * s, 9 * s, 0, 7); g.arc(x - 6 * s, base - 15 * s, 6 * s, 0, 7); g.arc(x + 6 * s, base - 15 * s, 6 * s, 0, 7); g.fill(); if (fruit) { g.fillStyle = fruit; for (const [ox, oy] of [[-5, -18], [4, -23], [1, -14], [7, -16], [-8, -13], [-2, -25]]) { g.beginPath(); g.arc(x + ox * s, base + oy * s, 1.5 * s, 0, 7); g.fill(); } } }
function aFir(g, x, base, h, c = "#16382c") { g.fillStyle = "#2c2018"; g.fillRect(x - 1, base - h * 0.2, 2, h * 0.2); for (let i = 0; i < 4; i++) { const y0 = base - h * 0.14 - i * h * 0.2, hw = h * (0.25 - i * 0.045); poly(g, [x - hw, y0, x + hw, y0, x, y0 - h * 0.34], i % 2 ? shadeC(c, 1.18) : c); } }
function aPine(g, x, base, h) { g.strokeStyle = "#3a2a22"; g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + h * 0.14, base - h * 0.5, x - h * 0.06, base - h * 0.86); g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + h * 0.06, base - h * 0.55); g.lineTo(x + h * 0.26, base - h * 0.7); g.stroke(); g.lineCap = "butt"; g.fillStyle = "#17382a"; for (const [ox, oy, rw] of [[-0.06, -0.92, 0.3], [0.2, -0.74, 0.2], [-0.24, -0.76, 0.18], [0.02, -1.04, 0.18]]) { g.beginPath(); g.ellipse(x + ox * h, base + oy * h, rw * h, rw * h * 0.42, 0, 0, 7); g.fill(); } }
function aPalm(g, x, base, h) { g.strokeStyle = "#2c241e"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + h * 0.1, base - h * 0.5, x + h * 0.03, base - h); g.stroke(); g.strokeStyle = "#1c4630"; g.lineWidth = 1.7; g.lineCap = "round"; const tx = x + h * 0.03, ty = base - h; for (const [ex, ey] of [[-0.42, -0.02], [-0.32, -0.26], [-0.1, -0.36], [0.14, -0.34], [0.34, -0.2], [0.44, 0.04], [-0.3, 0.16], [0.3, 0.2]]) { g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + ex * h * 0.55, ty + ey * h - h * 0.14, tx + ex * h, ty + ey * h + h * 0.04); g.stroke(); } g.lineCap = "butt"; }
function aLantern(g, x, y, s = 1) { g.fillStyle = "rgba(255,206,130,.28)"; g.beginPath(); g.arc(x, y, 6.5 * s, 0, 7); g.fill(); g.fillStyle = "#2a2420"; g.fillRect(x - 2 * s, y - 3.6 * s, 4 * s, 1.2 * s); g.fillStyle = "#ffd98a"; rr(g, x - 1.8 * s, y - 2.4 * s, 3.6 * s, 4.6 * s, 1 * s); g.fill(); }
// 돌담(현무암·막돌). hh = 높이
function aStoneWall(g, a, b, base, hh, rnd, cols = ["#3a3c42", "#4c4f56", "#2e3035", "#5a5d64"]) {
  if (b - a < 3) return; g.fillStyle = "#1e1f24"; g.fillRect(a, base - hh + 1.5, b - a, hh - 1.5);
  for (let row = 0, yy = base; yy > base - hh; row++, yy -= 3.3) for (let xx = a - (row % 2) * 2; xx < b; ) { const sw = 3.2 + rnd() * 3.2, sh = 2.9 + rnd() * 1; g.fillStyle = cols[Math.floor(rnd() * cols.length)]; rr(g, Math.max(a, xx), yy - sh, Math.min(sw, b - Math.max(a, xx)), sh, 1.2); g.fill(); xx += sw + 0.5; }
}
// 담장: 아래 돌, 위 회벽(종로 = 회색 전돌 줄눈, 경주 = 흙돌담), 기와 덮개
function aDam(g, a, b, base, hh, rk, rnd) {
  if (b - a < 3) return;
  if (rk === "gyeongju") { g.fillStyle = "#a88a64"; g.fillRect(a, base - hh, b - a, hh); for (let yy = base - 2.5; yy > base - hh + 1; yy -= 3.6) for (let xx = a + 1 + rnd() * 3; xx < b - 3; xx += 5 + rnd() * 3) { g.fillStyle = rnd() < 0.5 ? "#7c7468" : "#948b7c"; g.beginPath(); g.ellipse(xx + 1.5, yy, 2 + rnd(), 1.3, 0, 0, 7); g.fill(); } }
  else { g.fillStyle = "#8d8c92"; g.fillRect(a, base - hh * 0.42, b - a, hh * 0.42); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 0.5; for (let xx = a + 5; xx < b; xx += 7) { g.beginPath(); g.moveTo(xx, base - hh * 0.42); g.lineTo(xx, base); g.stroke(); } g.fillStyle = "#cfc6b4"; g.fillRect(a, base - hh, b - a, hh * 0.58); g.strokeStyle = "rgba(90,80,70,.3)"; for (let yy = base - hh + 2.2, i = 0; yy < base - hh * 0.44; yy += 2.2, i++) { g.beginPath(); g.moveTo(a, yy); g.lineTo(b, yy); g.stroke(); for (let xx = a + (i % 2 ? 2.5 : 0); xx < b; xx += 5) { g.beginPath(); g.moveTo(xx, yy - 2.2); g.lineTo(xx, yy); g.stroke(); } } }
  g.fillStyle = "#2b2d36"; g.fillRect(a - 1.5, base - hh - 3, b - a + 3, 3.4); g.fillStyle = "#4a4e5a"; for (let xx = a - 1; xx < b; xx += 3) { g.beginPath(); g.arc(xx + 1.5, base - hh - 3, 1.5, Math.PI, 0); g.fill(); }
}
// 기와지붕(앞모습): 처마 끝이 살짝 들리고 용마루·기왓골·서까래
function aGiwa(g, xl, xr, ye, rh, o = {}) {
  const ov = o.ov ?? 11, lift = o.lift ?? 5, inn = o.inn ?? (xr - xl) * 0.16, L = xl - ov, R = xr + ov, mid = (L + R) / 2, top = ye - rh;
  g.fillStyle = "#7a5234"; for (let xx = L + 3; xx < R - 2; xx += 3.2) { const tt = (xx - L) / (R - L); g.fillRect(xx, ye - lift + 2 * tt * (1 - tt) * 1.9 * lift + 0.4, 1.6, 2.4); } // 서까래 끝
  const rg = g.createLinearGradient(0, top, 0, ye + 4); rg.addColorStop(0, o.c0 || "#5a5f6c"); rg.addColorStop(1, o.c1 || "#272a32");
  g.beginPath(); g.moveTo(L, ye - lift); g.quadraticCurveTo(mid, ye + lift * 0.9, R, ye - lift); g.quadraticCurveTo(R - inn * 0.5, top + rh * 0.6, R - inn - ov, top + 2); g.quadraticCurveTo(mid, top + 4.5, L + inn + ov, top + 2); g.quadraticCurveTo(L + inn * 0.5, top + rh * 0.6, L, ye - lift); g.closePath(); g.fillStyle = rg; g.fill();
  g.save(); g.clip(); g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 0.8; const nL = Math.max(6, Math.round((R - L) / 4)); for (let i = 0; i <= nL; i++) { const fx = L + ((R - L) * i) / nL; g.beginPath(); g.moveTo(fx, ye + 5); g.lineTo(mid + (fx - mid) * 0.66, top); g.stroke(); } g.restore();
  g.strokeStyle = "#d9d4c8"; g.lineWidth = 1.1; g.beginPath(); g.moveTo(L, ye - lift); g.quadraticCurveTo(mid, ye + lift * 0.9, R, ye - lift); g.stroke();
  const rl = R - L - 2 * (inn + ov) + 6; g.fillStyle = "#1c1e25"; rr(g, L + inn + ov - 3, top - 1.6, rl, 4.2, 2); g.fill(); g.fillStyle = "#d9d4c8"; g.fillRect(L + inn + ov - 3, top - 1.6, 2.2, 4.2); g.fillRect(L + inn + ov - 3 + rl - 2.2, top - 1.6, 2.2, 4.2);
}
// 한옥 몸채: 기둥·회벽·창호. bays: "w" 창 · "d" 두 짝 문 · "o" 대청(트인 마루, 안쪽 창호)
function aHanBody(g, G, x, yb, w, bh, bays) {
  const n = bays.length, bw = w / n, pg = g.createLinearGradient(0, yb - bh, 0, yb); pg.addColorStop(0, "#efe6d2"); pg.addColorStop(1, "#cfc3a8"); g.fillStyle = pg; g.fillRect(x, yb - bh, w, bh);
  bays.forEach((b, i) => { const bx = x + i * bw;
    if (b === "d") { const pw = (bw - 9) / 2; aWin(g, G, true, bx + 4, yb - bh + 5, pw, bh - 9, { paper: 1 }); aWin(g, G, true, bx + 5 + pw, yb - bh + 5, pw, bh - 9, { paper: 1 }); }
    else if (b === "w") { aWin(g, G, true, bx + bw * 0.2, yb - bh + 6, bw * 0.6, bh * 0.44, { paper: 1 }); g.fillStyle = "#6a4630"; g.fillRect(bx + bw * 0.14, yb - bh + 7.5 + bh * 0.44, bw * 0.72, 1.6); g.fillRect(bx + 1.5, yb - bh * 0.3, bw - 3, 1); }
    else { g.fillStyle = "#2a1c14"; g.fillRect(bx + 1.5, yb - bh + 3, bw - 3, bh - 3); aWin(g, G, true, bx + bw * 0.22, yb - bh + 7, bw * 0.56, bh * 0.5, { paper: 1 }); g.fillStyle = "#8a5f3c"; g.fillRect(bx + 1.5, yb - 4.5, bw - 3, 4.5); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(bx + 1.5, yb - 4.5, bw - 3, 0.8); } });
  g.fillStyle = "#5a3a26"; for (let i = 0; i <= n; i++) g.fillRect(x + i * bw - 1.6, yb - bh, 3.2, bh); g.fillRect(x - 1.6, yb - bh, w + 3.2, 3); g.fillStyle = "#4a2f1e"; g.fillRect(x - 1.6, yb - 2.4, w + 3.2, 2.4);
}
function aStoneBase(g, x, y, w, h) { g.fillStyle = "#9a968e"; g.fillRect(x, y, w, h); g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x, y, w, 1); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 0.5; for (let xx = x + 7; xx < x + w; xx += 9) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); } }
function aJars(g, x, base) { g.fillStyle = "#8f8c88"; g.fillRect(x - 3, base - 2, 24, 2); for (const [ox, s] of [[2, 1], [10, 1.25], [17, 0.8]]) { g.fillStyle = "#4a2e22"; g.beginPath(); g.ellipse(x + ox, base - 2 - 4 * s, 3.4 * s, 4 * s, 0, 0, 7); g.fill(); g.fillStyle = "#2e1c15"; g.fillRect(x + ox - 2.6 * s, base - 2 - 8.6 * s, 5.2 * s, 1.4 * s); g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(x + ox - 2 * s, base - 2 - 6 * s, 1, 3 * s); } }
function aSeokdeung(g, x, base) { g.fillStyle = "#8f8c88"; g.fillRect(x - 3.5, base - 2, 7, 2); g.fillRect(x - 1.2, base - 9, 2.4, 7); g.fillRect(x - 3, base - 10.5, 6, 1.6); g.fillStyle = "#6f6c68"; g.fillRect(x - 2.6, base - 15, 5.2, 4.6); g.fillStyle = "#ffd98a"; g.fillRect(x - 1.2, base - 14, 2.4, 2.8); poly(g, [x - 4.5, base - 15, x + 4.5, base - 15, x, base - 19], "#8f8c88"); g.fillStyle = "rgba(255,206,130,.22)"; g.beginPath(); g.arc(x, base - 12.5, 7, 0, 7); g.fill(); }
function aMailbox(g, x, base, c = "#c8463a") { g.fillStyle = "#3a3c44"; g.fillRect(x - 0.7, base - 11, 1.4, 11); g.fillStyle = c; rr(g, x - 3.2, base - 15, 6.4, 4.6, 1); g.fill(); g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(x - 2, base - 13.2, 4, 0.8); }

// ── 한옥 3가지 ──
function aHanok(g, G, r, rnd) {
  const { x, w, cx, W } = G, F = G.f, rk = r.rk;
  aShadow(g, cx, w * 0.9);
  if (G.pat === 0) { // 골목 담장 + 솟을대문 + 안채
    const yb = PGY - 4, bh = 31, hx = x + w * 0.2, hw = w * 0.78, gw = 24, gx = x + 2;
    if (rk === "gyeongju") aPine(g, hx + hw - 6, PGY, 58); else aTree(g, hx + hw - 4, PGY - 20, 1.25, "#2a5a3a", "#ff9a3a");
    aHanBody(g, G, hx, yb, hw, bh, hw > 120 ? ["w", "d", "d", "w"] : ["w", "d", "w"]);
    aGiwa(g, hx, hx + hw, yb - bh, 25);
    aDam(F, x - 6, gx - 1, PGY + 1, 14, rk, rnd); aDam(F, gx + gw + 1, x + w + 8, PGY + 1, 14, rk, rnd);
    // 대문
    const gh = 25, by = PGY + 1; F.fillStyle = "#4a2f1e"; F.fillRect(gx, by - gh, 3, gh); F.fillRect(gx + gw - 3, by - gh, 3, gh); F.fillStyle = "#6e4628"; F.fillRect(gx + 3, by - gh + 3, gw - 6, gh - 3);
    F.strokeStyle = "rgba(0,0,0,.22)"; F.lineWidth = 0.5; for (let xx = gx + 6; xx < gx + gw - 3; xx += 3) { F.beginPath(); F.moveTo(xx, by - gh + 3); F.lineTo(xx, by); F.stroke(); }
    F.fillStyle = "rgba(255,214,150,.55)"; F.fillRect(gx + gw / 2 - 0.6, by - gh + 4, 1.2, gh - 5);
    F.fillStyle = "#c8a04a"; for (const yy of [by - gh + 8, by - 6]) for (let xx = gx + 5.5; xx < gx + gw - 4; xx += 3.4) { F.beginPath(); F.arc(xx, yy, 0.7, 0, 7); F.fill(); } for (const k of [-1, 1]) { F.beginPath(); F.arc(gx + gw / 2 + k * 3, by - gh * 0.45, 1.4, 0, 7); F.fill(); }
    F.fillStyle = "#4a2f1e"; F.fillRect(gx - 1.5, by - gh, gw + 3, 3); aGiwa(F, gx, gx + gw, by - gh, 9, { ov: 5, lift: 2.4, inn: 3 });
    G.door = gx + gw / 2; G.top = yb - bh - 27;
  } else if (G.pat === 1) { // 대청 정면(기단·툇마루·장독대·석등)
    const bw0 = w * 0.84, bx = cx - bw0 / 2, bs = 6, yb = PGY - bs, bh = 28;
    aStoneBase(g, bx - 9, yb, bw0 + 18, bs); g.fillStyle = "#b9b5aa"; g.fillRect(cx - 10, PGY - 3, 20, 3.4); g.fillStyle = "#f2f0ea"; for (const k of [-3, 2]) { g.beginPath(); g.ellipse(cx + k, PGY - 3.6, 1.8, 0.9, 0, 0, 7); g.fill(); }
    aHanBody(g, G, bx, yb, bw0, bh, bw0 > 140 ? ["w", "d", "o", "d", "w"] : ["d", "o", "d"]);
    g.fillStyle = "#8a5f3c"; g.fillRect(bx - 3, yb - 3.4, bw0 + 6, 3.4); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(bx - 3, yb - 0.8, bw0 + 6, 0.8); g.fillStyle = "#5a3a26"; for (let xx = bx; xx <= bx + bw0; xx += bw0 / 6) g.fillRect(xx - 1, yb - 0.5, 2, 2.4);
    aGiwa(g, bx, bx + bw0, yb - bh, 28, { ov: 14, lift: 6.5 });
    if (bx - 9 > 20) { if (rk === "jongno") aTree(g, bx - 16, PGY, 1, "#2a5a3a", "#ff9a3a"); else aPine(g, bx - 16, PGY, 52); }
    if (W - (bx + bw0 + 9) > 26) aJars(F, bx + bw0 + 13, PGY + 2);
    aSeokdeung(F, bx - 12 > 6 ? bx - 12 : 8, PGY + 3);
    if (rk === "gyeongju") { aStoneWall(F, -2, bx - 22, PGY + 2, 7, rnd, ["#7c7468", "#948b7c", "#6a6358", "#a09684"]); }
    G.door = cx; G.top = yb - bh - 30;
  } else { // ㄱ자: 안채 + 앞으로 나온 누마루 날개채(박공)
    const bs = 5, yb = PGY - bs, bh = 27, mw = w * 0.66, wx = x + w * 0.63, ww = w * 0.37, fy = PGY - 9, wt = fy - 24;
    aStoneBase(g, x - 6, yb, mw + 10, bs); g.fillStyle = "#b9b5aa"; g.fillRect(x + mw / 2 - 9, PGY - 3, 18, 3.4);
    aHanBody(g, G, x, yb, mw, bh, ["w", "d", "o"]);
    g.fillStyle = "#8a5f3c"; g.fillRect(x - 3, yb - 3.2, mw + 4, 3.2);
    aGiwa(g, x, x + mw + 8, yb - bh, 25, { ov: 10, lift: 5 });
    // 날개채
    g.fillStyle = "#9a968e"; for (const t of [0.04, 0.48, 0.9]) g.fillRect(wx + ww * t, fy, 3.4, 9); g.fillStyle = "rgba(18,14,22,.4)"; g.fillRect(wx + 4, fy + 1, ww - 8, 7);
    const pg = g.createLinearGradient(0, wt, 0, fy); pg.addColorStop(0, "#efe6d2"); pg.addColorStop(1, "#cfc3a8"); g.fillStyle = pg; g.fillRect(wx, wt, ww, fy - wt); poly(g, [wx, wt, wx + ww / 2, wt - 19, wx + ww, wt], "#e6dcc6");
    const pw = (ww * 0.62 - 1) / 2; aWin(g, G, true, wx + ww * 0.19, wt + 4, pw, 14, { paper: 1 }); aWin(g, G, true, wx + ww * 0.19 + pw + 1, wt + 4, pw, 14, { paper: 1 });
    g.fillStyle = "#5a3a26"; g.fillRect(wx - 1.6, wt, 3.2, fy - wt); g.fillRect(wx + ww - 1.6, wt, 3.2, fy - wt); g.fillRect(wx - 1.6, wt - 1, ww + 3.2, 2.6); g.fillRect(wx + ww / 2 - 1, wt - 15, 2, 15); g.fillRect(wx + ww * 0.25, wt - 8.5, ww * 0.5, 1.6);
    g.fillStyle = "#8a5f3c"; g.fillRect(wx - 3, fy - 2.6, ww + 6, 3); F.strokeStyle = "#6a4630"; F.lineWidth = 0.9; F.beginPath(); F.moveTo(wx - 2, fy - 8); F.lineTo(wx + ww + 2, fy - 8); for (let xx = wx - 2; xx <= wx + ww + 2; xx += 4) { F.moveTo(xx, fy - 8); F.lineTo(xx, fy - 2); } F.stroke();
    for (const k of [-1, 1]) { const ex = wx + ww / 2 - k * (ww / 2 + 9), px = wx + ww / 2; g.beginPath(); g.moveTo(ex, wt + 1); g.quadraticCurveTo(px - k * ww * 0.3, wt - 7, px, wt - 25); g.lineTo(px, wt - 19); g.quadraticCurveTo(px - k * ww * 0.28, wt - 2, ex + k * 2, wt + 5.5); g.closePath(); g.fillStyle = "#2c2e37"; g.fill(); g.strokeStyle = "#d9d4c8"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(ex + k * 2, wt + 5.5); g.quadraticCurveTo(px - k * ww * 0.28, wt - 2, px, wt - 19); g.stroke(); }
    g.fillStyle = "#1c1e25"; rr(g, wx + ww / 2 - 2.6, wt - 27.5, 5.2, 5, 1.6); g.fill();
    if (x - 6 > 22) { if (rk === "gyeongju") aPine(g, x - 12, PGY, 50); else aTree(g, x - 12, PGY, 0.95, "#2a5a3a", "#ff9a3a"); }
    aJars(F, x + 2, PGY + 2);
    G.door = x + mw / 2; G.top = Math.min(yb - bh - 27, wt - 30);
  }
}

// ── 독채 5가지 ──
function aDetached(g, G, r, rnd) {
  const { x, w, W } = G, F = G.f, k = 0.55, d = G.d;
  aShadow(g, x + w / 2 + d / 2, w + d);
  if (G.pat === 0) { // 제주 현무암 돌집: 귤빛 낮은 지붕 · 돌담과 정낭 · 귤나무 · 돌하르방
    const yb = PGY - 1, bh = 30, ry = yb - bh, ov = 6, rh = 17, inn = w * 0.2, dx = x + w * 0.43, dw = w * 0.14;
    aTree(g, x - 3, PGY, 1.05, "#2c6a3a", "#ff9d2e");
    boxF(g, x, yb, w, bh, d, { f: ["#4a4c54", "#33353c"], s: "#25272d", t: "#3a3c44" }, false);
    g.save(); g.beginPath(); g.rect(x, ry, w, bh); g.clip(); for (let row = 0, yy = yb; yy > ry; row++, yy -= 4) for (let xx = x - (row % 2) * 3; xx < x + w; ) { const sw = 4.5 + rnd() * 4; g.fillStyle = ["#44464e", "#52555d", "#383a41", "#5c5f67"][Math.floor(rnd() * 4)]; rr(g, xx, yy - 3.6, sw, 3.4, 1.3); g.fill(); xx += sw + 0.6; } g.restore();
    const rg = g.createLinearGradient(0, ry - rh, 0, ry); rg.addColorStop(0, "#e88a40"); rg.addColorStop(1, "#b25a22"); g.fillStyle = rg; poly(g, [x - ov, ry + 1, x + w + ov, ry + 1, x + w - inn, ry - rh, x + inn, ry - rh]); g.fill();
    poly(g, [x + w + ov, ry + 1, x + w + ov + d, ry + 1 - d * k, x + w - inn + d * 0.7, ry - rh - 1.5, x + w - inn, ry - rh], "#8a4418");
    g.save(); poly(g, [x - ov, ry + 1, x + w + ov, ry + 1, x + w - inn, ry - rh, x + inn, ry - rh]); g.clip(); g.strokeStyle = "rgba(0,0,0,.15)"; g.lineWidth = 0.6; for (let yy = ry - rh + 3; yy < ry; yy += 3.2) { g.beginPath(); g.moveTo(x - ov, yy); g.lineTo(x + w + ov, yy); g.stroke(); } g.restore();
    g.fillStyle = "#f0d8b8"; g.fillRect(x + inn - 1, ry - rh - 1.4, w - inn * 2 + 2, 2); g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(x, ry + 1, w, 1.6);
    aWin(g, G, true, x + w * 0.09, ry + 9, w * 0.24, 12, { cross: 1, fr: "#f2efe6" }); aWin(g, G, true, x + w * 0.67, ry + 9, w * 0.24, 12, { cross: 1, fr: "#f2efe6" });
    g.fillStyle = "#f2efe6"; g.fillRect(dx - 1.2, yb - 22.2, dw + 2.4, 22.2); g.fillStyle = "#2f7a78"; g.fillRect(dx, yb - 21, dw, 21); g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(dx + 2, yb - 19, dw - 4, 7); g.fillStyle = "#ffd98a"; g.fillRect(dx + dw - 3, yb - 10, 1.4, 1.4);
    aLantern(g, dx + dw + 5, yb - 18, 0.8);
    const g0 = dx + dw / 2 - 11, g1 = dx + dw / 2 + 11; aStoneWall(F, -2, g0, PGY + 3, 10, rnd); aStoneWall(F, g1, W + 2, PGY + 3, 10, rnd);
    F.fillStyle = "#5c5f66"; rr(F, g0 - 3, PGY - 10, 4, 13, 1.2); F.fill(); rr(F, g1 - 1, PGY - 10, 4, 13, 1.2); F.fill(); F.strokeStyle = "#9a7650"; F.lineWidth = 1.3; F.lineCap = "round"; for (let i = 0; i < 3; i++) { F.beginPath(); F.moveTo(g0, PGY - 7 + i * 3); F.lineTo(g0 + 13, PGY + 2.6); F.stroke(); } F.lineCap = "butt";
    if (g1 + 22 < W) { const hx = g1 + 12, hb = PGY + 3; F.fillStyle = "#6a6d74"; rr(F, hx - 3.6, hb - 20, 7.2, 12, 2.6); F.fill(); F.beginPath(); F.arc(hx, hb - 23, 3.6, 0, 7); F.fill(); F.fillRect(hx - 4.4, hb - 26.4, 8.8, 1.8); rr(F, hx - 2.8, hb - 29.4, 5.6, 3.4, 1.4); F.fill(); F.fillStyle = "#3e4046"; F.fillRect(hx - 2.2, hb - 23.6, 1.2, 1); F.fillRect(hx + 1, hb - 23.6, 1.2, 1); F.fillRect(hx - 3, hb - 15, 6, 0.9); }
    if (g0 - 16 > 4) aMailbox(F, g0 - 10, PGY - 7, "#e0803a");
    G.door = dx + dw / 2; G.top = ry - rh;
  } else if (G.pat === 1) { // 삼각 통나무집: 가파른 박공 · 큰 삼각 유리 · 데크와 난간 · 굴뚝 · 장작
    const dkh = 8, yb = PGY - dkh, ph = Math.min(84, w * 0.8), px = x + w / 2, py = yb - ph, dd = 16;
    if (x - 22 > 2) aFir(g, x - 15, PGY, 56); if (x + w + 30 < W) aFir(g, x + w + 26, PGY, 68, "#143428"); aFir(g, x + w * 0.9, PGY, 44, "#12302a");
    g.fillStyle = "#1c1410"; g.fillRect(x - 12, yb + 2, w + 24, dkh - 2); g.fillStyle = "#5a3c26"; for (let xx = x - 12; xx <= x + w + 12; xx += (w + 22) / 7) g.fillRect(xx, yb + 2, 2, dkh - 2);
    poly(g, [px, py, px + dd, py - dd * k, x + w + 6 + dd, yb - dd * k + 2, x + w + 6, yb + 2], "#2a3632"); g.save(); poly(g, [px, py, px + dd, py - dd * k, x + w + 6 + dd, yb - dd * k + 2, x + w + 6, yb + 2]); g.clip(); g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 0.6; for (let i = 1; i < 12; i++) { const t = i / 12; g.beginPath(); g.moveTo(px + (x + w + 6 - px) * t, py + (yb + 2 - py) * t); g.lineTo(px + dd + (x + w + 6 - px) * t, py - dd * k + (yb + 2 - py) * t); g.stroke(); } g.restore();
    const sx = px + (x + w + 6 - px) * 0.42 + dd * 0.5, sy = py + (yb - py) * 0.42 - dd * k * 0.5; g.fillStyle = "#5a5f6a"; g.fillRect(sx - 2.2, sy - 14, 4.6, 16); g.fillStyle = "#3e424c"; g.fillRect(sx - 3.2, sy - 15.5, 6.6, 2); G.smoke = [sx, sy - 16];
    const wg = g.createLinearGradient(0, py, 0, yb); wg.addColorStop(0, "#a06e42"); wg.addColorStop(1, "#6e4526"); g.fillStyle = wg; poly(g, [x + 2, yb, px, py + 4, x + w - 2, yb]); g.fill();
    g.save(); poly(g, [x + 2, yb, px, py + 4, x + w - 2, yb]); g.clip(); g.strokeStyle = "rgba(30,14,6,.22)"; g.lineWidth = 0.6; for (let xx = x + 4; xx < x + w; xx += 3.6) { g.beginPath(); g.moveTo(xx, py); g.lineTo(xx, yb); g.stroke(); } g.restore();
    // 큰 삼각 유리 + 아래 유리문
    const tw = w * 0.2, ty1 = yb - ph * 0.42, ty0 = ty1 - (tw / (w / 2 - 2)) * (ph - 4) + 3, tri = [px - tw, ty1, px + tw, ty1, px, ty0 + 2];
    poly(g, [px - tw - 1.6, ty1 + 1.4, px + tw + 1.6, ty1 + 1.4, px, ty0 - 0.6], "#3a2a1e"); const gl = g.createLinearGradient(0, ty0, 0, ty1); gl.addColorStop(0, "#2a2e48"); gl.addColorStop(1, "#15142a"); g.fillStyle = gl; poly(g, tri); g.fill(); g.fillStyle = "#3a2a1e"; g.fillRect(px - 0.6, ty0, 1.2, ty1 - ty0);
    G.mine.push([px - tw, ty0 + 2, tw * 2, ty1 - ty0 - 2, 0, 1, tri]);
    aWin(g, G, true, px - tw, ty1 + 3.4, tw * 2, yb - ty1 - 4.4, { bars: 2, fr: "#3a2a1e", sill: 0 });
    g.strokeStyle = "#2a201a"; g.lineWidth = 4.6; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(x - 6, yb + 3); g.lineTo(px, py); g.lineTo(x + w + 6, yb + 3); g.stroke(); g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 6, yb + 1); g.lineTo(px, py - 2); g.stroke(); g.lineCap = "butt"; g.lineJoin = "miter";
    g.fillStyle = "#7a5636"; g.fillRect(x - 14, yb, w + 28, 2.6);
    F.strokeStyle = "#8a6240"; F.lineWidth = 1; for (const [a, b] of [[x - 13, px - tw - 6], [px + tw + 6, x + w + 13]]) { F.beginPath(); F.moveTo(a, yb - 8); F.lineTo(b, yb - 8); for (let xx = a; xx <= b + 0.1; xx += (b - a) / Math.max(2, Math.round((b - a) / 5))) { F.moveTo(xx, yb - 8); F.lineTo(xx, yb); } F.stroke(); }
    for (let s = 0; s < 3; s++) { F.fillStyle = s % 2 ? "#6a4a30" : "#86603c"; F.fillRect(px - 8 - s * 1.5, yb + s * 2.7, 16 + s * 3, 2.8); }
    aLantern(F, px + tw + 6, yb - 12, 0.8);
    const fx0 = x + w + 2; if (fx0 + 16 < W) { for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) { F.fillStyle = "#b08050"; F.beginPath(); F.arc(fx0 + 3 + i * 4.2 + j * 2.1, PGY + 1 - j * 3.7, 2.1, 0, 7); F.fill(); F.fillStyle = "#6a4426"; F.beginPath(); F.arc(fx0 + 3 + i * 4.2 + j * 2.1, PGY + 1 - j * 3.7, 0.9, 0, 7); F.fill(); } }
    G.door = px; G.top = py - 4;
  } else if (G.pat === 2) { // 흰 상자집: 큰 통창 · 옥상 테라스(유리 난간·줄조명) · 낮은 조명 기둥
    const A = { f: ["#f6f4ef", "#d6d3cb"], s: "#a7a49b", t: "#fbfaf7" }, B = { f: ["#dcd9d1", "#bcb9b0"], s: "#8e8b83", t: "#ecebe5" }, w1 = w * 0.58, h1 = 52, w2 = w * 0.52, h2 = 30, x2 = x + w - w2, yb = PGY;
    boxF(g, x2, yb, w2, h2, d, B);
    const tx0 = x + w1 + d * 0.5, tx1 = x2 + w2 + d * 0.4, ty = yb - h2 - d * 0.2; g.fillStyle = "#5a5f6a"; g.fillRect(tx1 - 2, ty - 17, 1.2, 17); g.strokeStyle = "rgba(40,40,50,.8)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(tx0 - 4, ty - 15); g.quadraticCurveTo((tx0 + tx1) / 2, ty - 8, tx1 - 1.4, ty - 16.5); g.stroke(); for (let i = 1; i < 6; i++) { const t = i / 6, bx = (1 - t) * (1 - t) * (tx0 - 4) + 2 * t * (1 - t) * ((tx0 + tx1) / 2) + t * t * (tx1 - 1.4), by = (1 - t) * (1 - t) * (ty - 15) + 2 * t * (1 - t) * (ty - 8) + t * t * (ty - 16.5); g.fillStyle = "rgba(255,222,150,.95)"; g.beginPath(); g.arc(bx, by + 1, 1.1, 0, 7); g.fill(); }
    g.fillStyle = "#6a4a36"; g.fillRect(tx0 + 5, ty - 5, 6, 1.4); g.fillRect(tx0 + 5.6, ty - 4, 1, 4); g.fillRect(tx0 + 9.4, ty - 4, 1, 4); aBush(g, tx1 - 9, ty, 3.2, "#3d7a4e");
    g.fillStyle = "rgba(190,220,240,.22)"; g.fillRect(x + w1, yb - h2 - 7, w - w1, 7); g.fillStyle = "rgba(240,244,250,.85)"; g.fillRect(x + w1, yb - h2 - 7.6, w - w1, 0.9); for (let xx = x + w1 + 6; xx <= x + w; xx += (w - w1 - 7) / 3) g.fillRect(xx, yb - h2 - 7, 0.8, 7);
    boxF(g, x, yb, w1, h1, d, A); g.fillStyle = "#c9c6be"; g.fillRect(x - 1, yb - h1 - 1.6, w1 + 2, 1.8);
    aWin(g, G, true, x + w1 * 0.13, yb - 31, w1 * 0.66, 28, { bars: 2, fr: "#22242a", sill: 0 }); aWin(g, G, true, x + w1 * 0.13, yb - h1 + 7, w1 * 0.74, 7.5, { bars: 3, fr: "#22242a", sill: 0 });
    const vw = x + w - (x + w1), dx = x + w1 + 5, dw = 11; g.fillStyle = "#4a3526"; g.fillRect(dx, yb - 22, dw, 22); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.5; for (let yy = yb - 18; yy < yb; yy += 4) { g.beginPath(); g.moveTo(dx, yy); g.lineTo(dx + dw, yy); g.stroke(); } g.fillStyle = "#d8dae0"; g.fillRect(dx + dw - 2.6, yb - 15, 1, 8);
    g.fillStyle = "#8e8b83"; g.fillRect(dx - 3, yb - 25.5, dw + 6, 1.8); g.fillStyle = "#ffd98a"; g.fillRect(dx + dw + 2.4, yb - 20, 1.6, 2.6); g.fillStyle = "rgba(255,206,130,.25)"; g.beginPath(); g.arc(dx + dw + 3.2, yb - 18, 5.5, 0, 7); g.fill();
    if (vw - dw - 16 > 7) aWin(g, G, true, dx + dw + 8, yb - 21, vw - dw - 15, 9, { bars: 1, fr: "#22242a", sill: 0 });
    g.fillStyle = "#c9c6be"; for (let i = 0; i < 2; i++) g.fillRect(dx - 1, yb + 1 + i * 3.4, dw + 2, 2.6);
    if (x - 18 > 2) { F.fillStyle = "#2c5a3c"; rr(F, x - 18, PGY - 6, 15, 8, 2); F.fill(); F.fillStyle = "#3a744c"; rr(F, x - 18, PGY - 6, 15, 3, 1.5); F.fill(); }
    if (x + w + d + 16 < W) { const ox = x + w + d + 8; F.fillStyle = "#55585f"; F.fillRect(ox - 4, PGY - 5, 8, 7); F.fillStyle = "#4a3a2e"; F.fillRect(ox - 0.6, PGY - 17, 1.3, 12); F.fillStyle = "#6f8a62"; F.beginPath(); F.ellipse(ox, PGY - 20, 6, 5, 0, 0, 7); F.fill(); F.fillStyle = "#86a076"; F.beginPath(); F.ellipse(ox - 1.5, PGY - 21.5, 3.4, 2.6, 0, 0, 7); F.fill(); }
    F.fillStyle = "#2a2c33"; F.fillRect(dx - 8.6, PGY - 11, 1.3, 13); rr(F, dx - 11.4, PGY - 14.5, 7, 4, 0.8); F.fill(); F.fillStyle = "#d8dae0"; F.fillRect(dx - 10.2, PGY - 12.8, 4.6, 0.7);
    for (const bx of [x + w1 * 0.2, x + w1 * 0.74]) { F.fillStyle = "#3a3c44"; F.fillRect(bx, PGY - 5, 1.8, 7); F.fillStyle = "#ffe2a0"; F.fillRect(bx - 0.3, PGY - 6.4, 2.4, 1.6); F.fillStyle = "rgba(255,214,140,.2)"; F.beginPath(); F.arc(bx + 0.9, PGY - 4, 5, 0, 7); F.fill(); }
    G.door = dx + dw / 2; G.top = yb - h1;
  } else if (G.pat === 3) { // 이층 마당집: 박공 지붕·굴뚝 · 발코니 · 내민 창 · 흰 울타리와 아치 대문 · 우편함 · 정원등
    const h = 50, yb = PGY - 1, rh = 25, top = yb - h - rh, dx = x + w * 0.63, dw = w * 0.17, RC = "#7a3a2c";
    if (x + w + d + 18 < W) aTree(g, x + w + d + 10, PGY, 1.1, "#2a5e3c");
    boxF(g, x, yb, w, h, d, { f: ["#f3e7cc", "#d2be98"], s: "#9c8866", t: "#000000" }, false);
    g.fillStyle = "#9a5a44"; g.fillRect(x, yb - 9, w, 9); g.save(); g.beginPath(); g.rect(x, yb - 9, w, 9); g.clip(); aWall(g, { brick: 1 }, x, yb - 9, w, 9); g.restore(); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(x, yb - h / 2 - 1.4, w, 1.6);
    poly(g, [x - 3, yb - h, x + w / 2, top, x + w + 3, yb - h], "#eadcbe"); poly(g, [x + w / 2, top, x + w + 3, yb - h, x + w + 3 + d, yb - h - d * k, x + w / 2 + d, top - d * k], RC);
    g.save(); poly(g, [x + w / 2, top, x + w + 3, yb - h, x + w + 3 + d, yb - h - d * k, x + w / 2 + d, top - d * k]); g.clip(); g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 0.6; for (let i = 1; i < 8; i++) { const t = i / 8; g.beginPath(); g.moveTo(x + w / 2 + (w / 2 + 3) * t, top + rh * t); g.lineTo(x + w / 2 + d + (w / 2 + 3) * t, top - d * k + rh * t); g.stroke(); } g.restore();
    const cx2 = x + w * 0.78 + d * 0.5, cy2 = top + rh * 0.56 - d * k * 0.5; g.fillStyle = "#8a4a3a"; g.fillRect(cx2 - 2.6, cy2 - 15, 5.4, 16); g.fillStyle = "#5e2c22"; g.fillRect(cx2 - 3.6, cy2 - 16.6, 7.4, 2.2);
    g.strokeStyle = "#5e2c22"; g.lineWidth = 3.2; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); g.moveTo(x - 5, yb - h + 2); g.lineTo(x + w / 2, top - 1); g.lineTo(x + w + 5, yb - h + 2); g.stroke(); g.lineCap = "butt"; g.lineJoin = "miter";
    const ax = x + w / 2, ay = yb - h - rh * 0.36; g.fillStyle = "#fbf8f0"; g.beginPath(); g.arc(ax, ay, 5.2, 0, 7); g.fill(); g.fillStyle = "#1c1b30"; g.beginPath(); g.arc(ax, ay, 4.2, 0, 7); g.fill(); g.fillStyle = "#fbf8f0"; g.fillRect(ax - 0.4, ay - 4.2, 0.8, 8.4); g.fillRect(ax - 4.2, ay - 0.4, 8.4, 0.8); G.mine.push([ax - 4.2, ay - 4.2, 8.4, 8.4, 0, 1, "c"]);
    aWin(g, G, true, x + w * 0.13, yb - h + 6, w * 0.3, 15.5, { bars: 1, fr: "#fbf8f0", sill: 0 }); aWin(g, G, true, x + w * 0.63, yb - h + 8, w * 0.24, 11, { cross: 1, fr: "#fbf8f0" });
    g.fillStyle = "#d8cfbc"; g.fillRect(x + w * 0.07, yb - h + 21.5, w * 0.42, 2); F.strokeStyle = "#fbf8f0"; F.lineWidth = 0.8; F.beginPath(); F.moveTo(x + w * 0.07, yb - h + 15); F.lineTo(x + w * 0.49, yb - h + 15); for (let xx = x + w * 0.07; xx <= x + w * 0.49 + 0.1; xx += w * 0.42 / 12) { F.moveTo(xx, yb - h + 15); F.lineTo(xx, yb - h + 21.5); } F.stroke();
    g.fillStyle = "#e8dcc0"; g.fillRect(x + w * 0.08, yb - 21, w * 0.4, 15); poly(g, [x + w * 0.06, yb - 21, x + w * 0.5, yb - 21, x + w * 0.46, yb - 25.5, x + w * 0.1, yb - 25.5], RC); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(x + w * 0.08, yb - 21, w * 0.4, 1); aWin(g, G, true, x + w * 0.11, yb - 18.5, w * 0.34, 10.5, { bars: 2, fr: "#fbf8f0" });
    g.fillStyle = "#fbf8f0"; g.fillRect(dx - 1.2, yb - 20.2, dw + 2.4, 18.2); g.fillStyle = "#5a3a28"; g.fillRect(dx, yb - 19, dw, 17); g.fillStyle = "rgba(255,214,150,.5)"; g.fillRect(dx + 2, yb - 17.5, dw - 4, 4); g.fillStyle = "#ffd98a"; g.fillRect(dx + dw - 2.8, yb - 9, 1.3, 1.3); poly(g, [dx - 4, yb - 21, dx + dw + 4, yb - 21, dx + dw + 2, yb - 24.5, dx - 2, yb - 24.5], RC); g.fillStyle = "#b9b5aa"; g.fillRect(dx - 3, yb - 2, dw + 6, 2.2); g.fillRect(dx - 5, yb, dw + 10, 2.2);
    aLantern(g, dx + dw + 4.5, yb - 15, 0.75);
    aBush(g, x + w * 0.16, yb + 1, 4.2); aBush(g, x + w * 0.42, yb + 1, 3.6, "#377a4c"); g.fillStyle = "#ff8fb0"; for (const [ox, oy] of [[0.12, -5], [0.19, -3], [0.4, -4], [0.45, -2]]) { g.beginPath(); g.arc(x + w * ox, yb + oy, 1, 0, 7); g.fill(); }
    // 울타리(대문 자리만 비움)
    const gc = dx + dw / 2, f0 = Math.max(3, x - 16), f1 = Math.min(W - 3, x + w + d + 12), fb = PGY + 3; F.fillStyle = "#f4f1e8";
    for (let xx = f0; xx <= f1; xx += 3.1) { if (Math.abs(xx + 0.8 - gc) < 9) continue; F.fillRect(xx, fb - 8, 1.7, 8); poly(F, [xx, fb - 8, xx + 1.7, fb - 8, xx + 0.85, fb - 9.8], "#f4f1e8"); } for (const [a, b] of [[f0, gc - 9], [gc + 9, f1 + 1.7]]) { F.fillRect(a, fb - 6.2, b - a, 1); F.fillRect(a, fb - 2.6, b - a, 1); }
    F.fillStyle = "#f4f1e8"; F.fillRect(gc - 10, fb - 12, 2, 12); F.fillRect(gc + 8, fb - 12, 2, 12); F.strokeStyle = "#2f6a40"; F.lineWidth = 2.4; F.beginPath(); F.arc(gc, fb - 11, 9.4, Math.PI, 0); F.stroke(); F.fillStyle = "#ff8fb0"; for (let a = 0; a <= 6; a++) { const an = Math.PI + (a / 6) * Math.PI; F.beginPath(); F.arc(gc + Math.cos(an) * 9.4, fb - 11 + Math.sin(an) * 9.4, 1.1, 0, 7); F.fill(); }
    if (gc - 20 > f0) aMailbox(F, gc - 16, fb - 1);
    if (gc + 22 < f1) { const lx = gc + 17; F.fillStyle = "#2a2c33"; F.fillRect(lx - 0.7, fb - 15, 1.4, 15); aLantern(F, lx, fb - 17, 0.85); }
    G.door = gc; G.top = top;
  } else { // 바닷가 방갈로: 물빛 판벽 · 넓은 베란다와 난간 · 낮은 금속 지붕 · 서프보드 · 밧줄 울타리
    const st = 5, yb = PGY - st, bh = 27, rh = 18, ry = yb - bh, inn = w * 0.2, ov = 9;
    g.fillStyle = "#1c1816"; g.fillRect(x - 4, yb + 2, w + 8, st - 1); g.fillStyle = "#8a765e"; for (let xx = x - 4; xx <= x + w + 4; xx += (w + 6) / 8) g.fillRect(xx, yb + 2, 2.2, st);
    g.save(); g.translate(x - 9, PGY - 1); g.rotate(-0.14); g.fillStyle = "#ff8a5a"; g.beginPath(); g.ellipse(0, -15, 3.4, 15, 0, 0, 7); g.fill(); g.fillStyle = "#fff4e0"; g.fillRect(-0.6, -29, 1.2, 28); g.restore();
    boxF(g, x, yb, w, bh, d, { f: ["#c4dde2", "#95b8c2"], s: "#6a8c96", t: "#000000" }, false);
    g.strokeStyle = "rgba(40,70,80,.2)"; g.lineWidth = 0.5; for (let yy = ry + 3; yy < yb; yy += 3) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } g.fillStyle = "#f6f4ee"; g.fillRect(x, ry, 2, bh); g.fillRect(x + w - 2, ry, 2, bh);
    for (const t of [0.09, 0.69]) { const wx = x + w * t, ww = w * 0.22; g.fillStyle = "#4f8798"; g.fillRect(wx - 4, ry + 7.4, 3, 13.2); g.fillRect(wx + ww + 1, ry + 7.4, 3, 13.2); aWin(g, G, true, wx, ry + 8, ww, 12, { cross: 1, fr: "#f6f4ee" }); }
    aWin(g, G, true, x + w * 0.43, ry + 6, w * 0.14, bh - 7, { bars: 1, fr: "#f6f4ee", sill: 0 });
    const lx = x + w * 0.615, ly = ry + 13; g.fillStyle = "#e0463a"; g.beginPath(); g.arc(lx, ly, 3.6, 0, 7); g.fill(); g.fillStyle = "#c4dde2"; g.beginPath(); g.arc(lx, ly, 1.7, 0, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(lx - 0.6, ly - 3.6, 1.2, 1.9); g.fillRect(lx - 0.6, ly + 1.7, 1.2, 1.9);
    const rg = g.createLinearGradient(0, ry - rh, 0, ry); rg.addColorStop(0, "#768e9b"); rg.addColorStop(1, "#4c626e"); g.fillStyle = rg; poly(g, [x - ov, ry + 2, x + w + ov, ry + 2, x + w - inn, ry - rh, x + inn, ry - rh]); g.fill(); poly(g, [x + w + ov, ry + 2, x + w + ov + d, ry + 2 - d * k, x + w - inn + d * 0.7, ry - rh - 1.5, x + w - inn, ry - rh], "#384a54");
    g.save(); poly(g, [x - ov, ry + 2, x + w + ov, ry + 2, x + w - inn, ry - rh, x + inn, ry - rh]); g.clip(); g.strokeStyle = "rgba(255,255,255,.14)"; g.lineWidth = 0.7; const mid = x + w / 2; for (let i = 0; i <= 22; i++) { const fx = x - ov + ((w + 2 * ov) * i) / 22; g.beginPath(); g.moveTo(fx, ry + 2); g.lineTo(mid + (fx - mid) * ((w - 2 * inn) / (w + 2 * ov)), ry - rh); g.stroke(); } g.restore(); g.fillStyle = "#dfe6ea"; g.fillRect(x + inn - 1, ry - rh - 1.2, w - 2 * inn + 2, 1.8); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x, ry + 2, w, 1.6);
    // 베란다(앞 층)
    F.fillStyle = "#c4a67e"; F.fillRect(x - 7, yb, w + 14, 2.6); const ps = [0, 0.22, 0.4, 0.6, 0.78, 1].map((t) => x - 5 + (w + 8) * t); F.fillStyle = "#f6f4ee"; for (const px of ps) F.fillRect(px, ry + 2, 2, bh - 2);
    F.strokeStyle = "#f6f4ee"; F.lineWidth = 0.8; for (let i = 0; i < 5; i++) { if (i === 2) continue; const a = ps[i] + 2, b = ps[i + 1]; F.beginPath(); F.moveTo(a, yb - 8); F.lineTo(b, yb - 8); F.moveTo(a, yb - 8); F.lineTo(b, yb - 0.5); F.moveTo(b, yb - 8); F.lineTo(a, yb - 0.5); F.stroke(); }
    for (let s = 0; s < 2; s++) { F.fillStyle = s ? "#a88a64" : "#c4a67e"; F.fillRect(ps[2] - s * 2, yb + 2.2 + s * 2.4, ps[3] - ps[2] + 2 + s * 4, 2.6); }
    F.fillStyle = "#2a2420"; F.fillRect(ps[1] + 6.4, ry + 3, 0.6, 3.4); aLantern(F, ps[1] + 6.7, ry + 9, 0.8);
    F.strokeStyle = "#8aa05a"; F.lineWidth = 0.9; for (const tx of [x - 15, x - 2, x + w + d + 4, x + w + d + 15]) if (tx > 3 && tx < W - 3) for (let i = -2; i <= 2; i++) { F.beginPath(); F.moveTo(tx, PGY + 3); F.quadraticCurveTo(tx + i, PGY - 3, tx + i * 2.4, PGY - 6 - (2 - Math.abs(i))); F.stroke(); }
    const posts = []; for (let xx = 6; xx < x - 20; xx += 15) posts.push(xx); const pr0 = posts.length; for (let xx = x + w + d + 22; xx < W - 4; xx += 15) posts.push(xx);
    F.strokeStyle = "#d8c8a4"; F.lineWidth = 0.9; posts.forEach((px, i) => { F.fillStyle = "#8a6f50"; F.fillRect(px, PGY - 5, 2.2, 9); if (i + 1 < posts.length && i + 1 !== pr0) { F.beginPath(); F.moveTo(px + 1, PGY - 4); F.quadraticCurveTo((px + posts[i + 1]) / 2 + 1, PGY, posts[i + 1] + 1, PGY - 4); F.stroke(); } });
    G.door = (ps[2] + ps[3]) / 2 + 1; G.top = ry - rh;
  }
}

// ── 빌라(원룸·투룸) 4가지 ──
function aVilla(g, G, r, rnd) {
  const P = A_VILLA[G.pat], { x, w, d } = G, k = 0.55, n = P.n, gH = P.pil ? 22 : P.semi ? 9 : 0;
  const fH = clamp((PGY - 46 - gH) / n, 14, 23), h = gH + fH * n, ins = P.set ? Math.round(w * 0.1) : 0, hM = P.set ? h - fH : h, gy = PGY - gH;
  const fyT = (i) => gy - (i + 1) * fH, fx = (i) => x + (P.set && i === n - 1 ? ins : 0), fw = (i) => w - (P.set && i === n - 1 ? 2 * ins : 0);
  const par = (x0, w0, y) => { g.fillStyle = shadeC(P.pc || P.f[0], 0.94); g.fillRect(x0 - 1.5, y - 2.6, w0 + 3, 3); poly(g, [x0 + w0 + 1.5, y - 2.6, x0 + w0 + 1.5 + d, y - 2.6 - d * k, x0 + w0 + 1.5 + d, y + 0.4 - d * k, x0 + w0 + 1.5, y + 0.4], shadeC(P.s, 0.9)); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x0, y + 0.4, w0, 1.2); };
  aShadow(g, x + w / 2 + d / 2, w + d);
  if (P.xst) { // 바깥 계단(왼쪽): 층마다 지그재그
    const sx = x - 18, sw = 18; g.fillStyle = "#8f897d"; g.fillRect(sx, PGY - (n - 1) * fH, 1.6, (n - 1) * fH);
    for (let i = 1; i < n; i++) { const y0 = PGY - (i - 1) * fH, y1 = PGY - i * fH, ym = (y0 + y1) / 2; g.fillStyle = "#b8b2a6"; g.fillRect(sx - 1, y1 - 1.6, sw + 1, 2.2);
      for (const [ax, ay, bx, by] of [[sx + sw - 2, y0, sx + 1.5, ym], [sx + 1.5, ym, sx + sw - 2, y1]]) { g.strokeStyle = "#a8a296"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.strokeStyle = "rgba(226,230,238,.85)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(ax, ay - 6); g.lineTo(bx, by - 6); for (let t = 0; t <= 1.001; t += 0.25) { g.moveTo(ax + (bx - ax) * t, ay + (by - ay) * t - 6); g.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t); } g.stroke(); } }
  }
  boxF(g, x, PGY, w, hM, d, P); if (P.set) boxF(g, x + ins, PGY - hM, w - 2 * ins, fH, d, P);
  g.save(); g.beginPath(); g.rect(x, PGY - hM, w, hM - gH); if (P.set) g.rect(x + ins, PGY - h, w - 2 * ins, fH); g.clip(); aWall(g, P, x, PGY - h, w, h); g.restore();
  par(x, w, PGY - hM); if (P.set) { par(x + ins, w - 2 * ins, PGY - h); g.strokeStyle = "rgba(230,235,245,.75)"; g.lineWidth = 0.7; for (const [a, b] of [[x, x + ins - 1], [x + w - ins + 1, x + w]]) { g.beginPath(); g.moveTo(a, PGY - hM - 7.6); g.lineTo(b, PGY - hM - 7.6); for (let xx = a; xx <= b + 0.1; xx += (b - a) / 3) { g.moveTo(xx, PGY - hM - 7.6); g.lineTo(xx, PGY - hM - 2.6); } g.stroke(); } aBush(g, x + ins / 2, PGY - hM - 2.6, 2.6, "#3d7a4e"); }
  const mf = n > 1 ? 1 + ((r.id * 3) % (n - 1)) : 0, ms = r.id % 2, cw = w * 0.15;
  for (let i = 0; i < n; i++) {
    const x0 = fx(i), w0 = fw(i), yt = fyT(i), uw = (w0 - cw) / 2 - 7, ww = (uw - 3) / 2, wh = fH * 0.46, wy = yt + fH * 0.17;
    g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(x0, yt + fH - 1, w0, 1);
    for (const sd of [0, 1]) { const ux = sd ? x0 + w0 - 4.5 - uw : x0 + 4.5, mineU = i === mf && sd === ms;
      for (const j of [0, 1]) aWin(g, G, mineU && (r.ty !== "oneroom" || j === (sd ? 1 : 0)), ux + j * (ww + 3), wy, ww, wh, { bars: 1 });
      if (P.bal) { const by = yt + fH * 0.68; g.fillStyle = "rgba(190,215,235,.3)"; g.fillRect(ux - 1.5, by, uw + 3, fH * 0.22); g.fillStyle = "rgba(240,244,250,.85)"; g.fillRect(ux - 2, by - 0.6, uw + 4, 0.9); g.fillStyle = shadeC(P.f[1], 0.78); g.fillRect(ux - 2.5, by + fH * 0.22, uw + 5, 1.6); } }
    if (i > 0 || P.pil || P.xst) { const sx = x + w / 2 - cw * 0.24, sw = cw * 0.48, sy = yt + fH * 0.18, sh = fH * 0.6; g.fillStyle = "rgba(240,238,232,.5)"; g.fillRect(sx - 0.7, sy - 0.7, sw + 1.4, sh + 1.4); g.fillStyle = "#1a1830"; g.fillRect(sx, sy, sw, sh); g.fillStyle = (i + r.id) % 2 ? "rgba(214,228,255,.3)" : "rgba(214,228,255,.1)"; g.fillRect(sx, sy, sw, sh); g.fillStyle = "rgba(120,110,130,.6)"; g.fillRect(sx, sy + sh / 2, sw, 0.7); }
  }
  // 옆면 창·실외기·배관
  for (let i = 0; i < n; i++) { const xr = fx(i) + fw(i), y = fyT(i) + fH * 0.26, hh = fH * 0.4; g.fillStyle = "rgba(10,8,24,.5)"; poly(g, [xr + d * 0.3, y - d * 0.3 * k, xr + d * 0.7, y - d * 0.7 * k, xr + d * 0.7, y + hh - d * 0.7 * k, xr + d * 0.3, y + hh - d * 0.3 * k]); g.fill(); if (i % 2 === 0 && !P.bal) { const ax = xr + d * 0.1, ay = fyT(i) + fH - 4.5; g.fillStyle = "#cfd2da"; poly(g, [ax, ay, ax + 4.4, ay - 2.4, ax + 4.4, ay + 1, ax, ay + 3.4]); g.fill(); g.fillStyle = "#8a8e98"; g.beginPath(); g.arc(ax + 2.2, ay + 0.5, 0.9, 0, 7); g.fill(); } }
  { const px = x + w + d * 0.86; g.strokeStyle = "rgba(205,208,216,.55)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(px, PGY - d * 0.86 * k); g.lineTo(px, PGY - hM - d * 0.86 * k + 4); g.stroke(); g.strokeStyle = "rgba(60,50,50,.4)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + w - 2.4, PGY - hM + 2); g.lineTo(x + w - 2.4, gy); g.stroke(); }
  // 1층
  if (P.pil) {
    g.fillStyle = "#14121c"; g.fillRect(x, gy, w, gH); g.fillStyle = "#2c2935"; g.fillRect(x + 4, gy + 3, w - 8, gH - 3); poly(g, [x + w, PGY, x + w + d, PGY - d * k, x + w + d, gy - d * k + 2, x + w, gy + 2], "rgba(10,8,20,.6)");
    const dx = x + w * 0.58, dw = w * 0.2; g.fillStyle = "#0f0d18"; g.fillRect(dx - 1, gy + 4, dw + 2, gH - 4); const lg = g.createLinearGradient(0, gy + 4, 0, PGY); lg.addColorStop(0, "rgba(255,236,200,.62)"); lg.addColorStop(1, "rgba(255,236,200,.2)"); g.fillStyle = lg; g.fillRect(dx, gy + 5, dw, gH - 5); g.fillStyle = "#cfd2e6"; g.fillRect(dx + dw / 2 - 0.4, gy + 5, 0.8, gH - 5); g.fillStyle = "rgba(255,236,200,.5)"; g.fillRect(x + w * 0.24, gy + 3.4, 5, 1);
    aCar(g, x + w * 0.27, PGY, clamp(w / 150, 0.56, 0.74), G.pat === 2 ? "#e6e2da" : "#3e5a8a");
    for (const t of [0, 0.47, 1]) { const px = x + t * (w - 5); g.fillStyle = shadeC(P.f[1], 0.9); g.fillRect(px, gy, 5, gH); g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(px + 4, gy, 1, gH); }
    g.fillStyle = shadeC(P.f[1], 0.7); g.fillRect(x, gy, w, 2.2); G.door = dx + dw / 2;
  } else if (P.semi) {
    g.fillStyle = "#77716a"; g.fillRect(x, gy, w, gH); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x, gy, w, 1);
    for (const t of [0.08, 0.7]) { const bx = x + w * t, bw = w * 0.22; g.fillStyle = "#15142a"; g.fillRect(bx, gy + 2.6, bw, 4.4); g.fillStyle = "rgba(200,205,215,.6)"; for (let xx = bx + 2; xx < bx + bw; xx += 2.6) g.fillRect(xx, gy + 2.6, 0.6, 4.4); G.oth.push([bx, gy + 2.6, bw, 4.4, 0, 0, null]); }
    const dw = cw * 0.86, dh = fH * 0.78, dx = x + w / 2 - dw / 2; g.fillStyle = "#3a2018"; g.beginPath(); g.moveTo(dx - 1.6, gy); g.lineTo(dx - 1.6, gy - dh + dw / 2); g.arc(dx + dw / 2, gy - dh + dw / 2, dw / 2 + 1.6, Math.PI, 0); g.lineTo(dx + dw + 1.6, gy); g.closePath(); g.fill();
    const lg = g.createLinearGradient(0, gy - dh, 0, gy); lg.addColorStop(0, "rgba(255,232,190,.7)"); lg.addColorStop(1, "rgba(255,232,190,.22)"); g.fillStyle = "#0f0d18"; g.beginPath(); g.moveTo(dx, gy); g.lineTo(dx, gy - dh + dw / 2); g.arc(dx + dw / 2, gy - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(dx + dw, gy); g.closePath(); g.fill(); g.fillStyle = lg; g.fill(); g.fillStyle = "#3a2018"; g.fillRect(dx + dw / 2 - 0.4, gy - dh, 0.8, dh);
    for (let s = 0; s < 3; s++) { g.fillStyle = s % 2 ? "#8a847c" : "#a09a90"; g.fillRect(dx - 3 - s * 2, gy + s * (gH / 3), dw + 6 + s * 4, gH / 3 + 0.2); }
    G.door = x + w / 2;
  } else { // 바깥 계단 집: 1층 앞 화단·가스 배관
    g.fillStyle = "#77716a"; g.fillRect(x, PGY - 3, w, 3); for (const t of [0.14, 0.34, 0.68, 0.88]) aBush(g, x + w * t, PGY - 2.4, 2.8, "#3d7a4e");
    G.door = x - 16;
  }
  // 지붕
  const tx = fx(n - 1), tw = fw(n - 1), ty = PGY - h;
  if (P.roof === "tank") { const qx = tx + tw * 0.14; g.fillStyle = "#e2bb3e"; rr(g, qx, ty - 13, 15, 9.4, 2.6); g.fill(); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(qx, ty - 9.4, 15, 0.8); g.fillStyle = "#6a6f7a"; g.fillRect(qx + 2, ty - 3.6, 1.4, 3.6); g.fillRect(qx + 11.4, ty - 3.6, 1.4, 3.6); boxF(g, tx + tw * 0.58, ty - d * 0.3, tw * 0.3, 11, d * 0.5, P); g.fillStyle = "#2a2838"; g.fillRect(tx + tw * 0.65, ty - d * 0.3 - 8, tw * 0.1, 8); g.strokeStyle = "#9aa0ac"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(tx + tw * 0.5, ty - 2); g.lineTo(tx + tw * 0.5, ty - 17); g.moveTo(tx + tw * 0.5 - 3, ty - 14); g.lineTo(tx + tw * 0.5 + 3, ty - 14); g.stroke(); }
  if (P.roof === "oktap") { const ow = tw * 0.46, ox = tx + 6, oy = ty - d * 0.25, oh = 14; boxF(g, ox, oy, ow, oh, d * 0.55, { f: ["#e8e2d4", "#c9c1ae"], s: "#948b78", t: "#5a6a7a" }); g.fillStyle = "#4e5c6a"; g.fillRect(ox - 2, oy - oh - 2, ow + 4, 2.4); aWin(g, G, false, ox + 3.5, oy - oh + 3.6, ow * 0.34, 6, { bars: 1 }); g.fillStyle = "#5a4634"; g.fillRect(ox + ow * 0.62, oy - 10.4, ow * 0.2, 10.4);
    const l0 = ox + ow + 7, l1 = tx + tw - 3, ly = oy - 12; g.fillStyle = "#8a8e98"; g.fillRect(l0, ly, 1, 12); g.fillRect(l1, ly, 1, 12); g.strokeStyle = "rgba(230,232,240,.7)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(l0, ly + 1); g.quadraticCurveTo((l0 + l1) / 2, ly + 3.4, l1, ly + 1); g.stroke(); ["#f2efe6", "#6aa8ff", "#ff9fb2", "#f5c04e"].forEach((c, i) => { const cx = l0 + 3 + i * ((l1 - l0 - 8) / 3.4); if (cx + 4 < l1) { g.fillStyle = c; g.fillRect(cx, ly + 2.4, 3.6, 5 + (i % 2)); } }); aBush(g, ox - 2.6, oy + 0.4, 2.4, "#3d7a4e"); }
  if (P.roof === "green") { const qx = tx + tw * 0.6; g.fillStyle = "#3d78c2"; rr(g, qx, ty - 13.4, 14, 10, 3); g.fill(); g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(qx + 2, ty - 12, 1.6, 7); g.fillStyle = "#6a6f7a"; g.fillRect(qx + 2, ty - 3.6, 1.4, 3.6); g.fillRect(qx + 10.6, ty - 3.6, 1.4, 3.6); const l0 = tx + 6, l1 = tx + tw * 0.48, ly = ty - 13; g.fillStyle = "#8a8e98"; g.fillRect(l0, ly, 1, 11); g.fillRect(l1, ly, 1, 11); g.strokeStyle = "rgba(230,232,240,.7)"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(l0, ly + 1); g.quadraticCurveTo((l0 + l1) / 2, ly + 3.2, l1, ly + 1); g.stroke(); ["#f2efe6", "#ff9fb2", "#6aa8ff"].forEach((c, i) => { g.fillStyle = c; g.fillRect(l0 + 4 + i * ((l1 - l0 - 8) / 2.6), ly + 2.4, 3.6, 5 + (i % 2)); }); }
  if (P.roof === "flat") { g.fillStyle = "#4a5060"; g.fillRect(tx + tw * 0.14, ty - 8, tw * 0.26, 6); g.fillStyle = "#28407a"; poly(g, [tx + tw * 0.52, ty - 3, tx + tw * 0.86, ty - 3, tx + tw * 0.9, ty - 10, tx + tw * 0.56, ty - 10]); g.fill(); g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 0.5; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(tx + tw * (0.52 + i * 0.085), ty - 3); g.lineTo(tx + tw * (0.56 + i * 0.085), ty - 10); g.stroke(); } }
  G.top = ty - 14;
}

// ── 오피스텔 4가지 ──
function aOtel(g, G, r, rnd) {
  const P = A_OTEL[G.pat], { x, w, d } = G, k = 0.55, n = P.n, gH = 25, fH = clamp((PGY - 46 - gH) / (n - 1), 7.4, 13), h = gH + fH * (n - 1), yT = PGY - h, gy = PGY - gH;
  const fy = (f) => gy - (f - 1) * fH, cur = P.win === "curtain", pad = cur ? 2.4 : 4.5, gap = cur ? 0.9 : P.win === "fin" ? 2.6 : 3, cols = P.cols, cw = (w - pad * 2 - gap * (cols - 1)) / cols;
  const mf = 3 + ((r.id * 5) % (n - 3)), mc = (r.id * 3) % (cols - 1);
  aShadow(g, x + w / 2 + d / 2, w + d);
  boxF(g, x, PGY, w, h, d, P);
  g.save(); g.beginPath(); g.rect(x, yT, w, h - gH); g.clip(); aWall(g, P, x, yT, w, h); g.restore();
  if (P.roof === "crown") { const ci = Math.round(w * 0.14); boxF(g, x + ci, yT, w - 2 * ci, 9, d, P); g.fillStyle = "rgba(255,226,170,.5)"; g.fillRect(x + ci + 2, yT - 2.2, w - 2 * ci - 4, 0.9); }
  g.fillStyle = shadeC(P.f[0], 0.94); g.fillRect(x - 1.5, yT - 2.6, w + 3, 3); poly(g, [x + w + 1.5, yT - 2.6, x + w + 1.5 + d, yT - 2.6 - d * k, x + w + 1.5 + d, yT + 0.4 - d * k, x + w + 1.5, yT + 0.4], shadeC(P.s, 0.9));
  for (let f = 2; f <= n; f++) { const y0 = fy(f), mineF = f === mf;
    if (cur) {
      const gl = g.createLinearGradient(x, y0, x + w, y0 + fH); gl.addColorStop(0, "#2c3a5a"); gl.addColorStop(0.5, "#1b2238"); gl.addColorStop(1, "#28324e"); g.fillStyle = gl; g.fillRect(x + pad, y0 + 1, w - pad * 2, fH - 2.2);
      g.fillStyle = "rgba(255,255,255,.06)"; poly(g, [x + w * 0.55, y0 + 1, x + w * 0.7, y0 + 1, x + w * 0.5, y0 + fH - 1.2, x + w * 0.35, y0 + fH - 1.2]); g.fill();
      for (let c = 0; c < cols; c++) (mineF && (c === mc || c === mc + 1) ? G.mine : G.oth).push([x + pad + c * (cw + gap), y0 + 1, cw, fH - 2.2, 0, 0, null]);
      g.fillStyle = "rgba(170,190,220,.45)"; for (let c = 1; c < cols; c++) g.fillRect(x + pad + c * (cw + gap) - gap, y0 + 1, gap, fH - 2.2); g.fillStyle = "rgba(150,180,215,.3)"; g.fillRect(x, y0 + fH - 1.2, w, 1.2);
    } else {
      const wh = P.win === "bay" ? fH * 0.7 : P.win === "fin" ? fH * 0.64 : fH * 0.48, wy = y0 + (P.win === "bal" ? fH * 0.14 : (fH - wh) / 2);
      g.fillStyle = "rgba(0,0,0,.13)"; g.fillRect(x, y0 + fH - 1, w, 1);
      for (let c = 0; c < cols; c++) aWin(g, G, mineF && (c === mc || c === mc + 1), x + pad + c * (cw + gap), wy, cw, wh, P.win === "bal" ? { bars: 1, sill: 0 } : { bars: P.win === "bay" ? 1 : 0, fr: "rgba(26,28,36,.92)", sill: 0 });
      if (P.win === "bal") { const by = y0 + fH * 0.7; g.fillStyle = shadeC(P.f[1], 0.86); g.fillRect(x + 2.5, by + fH * 0.2, w - 5, 1.5); g.strokeStyle = "rgba(235,238,245,.7)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 2.5, by); g.lineTo(x + w - 2.5, by); for (let xx = x + 2.5; xx <= x + w - 2.4; xx += 2.6) { g.moveTo(xx, by); g.lineTo(xx, by + fH * 0.2); } g.stroke(); }
      if (P.win === "bay" && f % 2 === 0) { g.fillStyle = "rgba(230,220,200,.5)"; g.fillRect(x, y0 + fH - 1.4, w, 1.2); }
    }
  }
  if (P.win === "fin") for (let c = 0; c <= cols; c++) { const px = x + pad + c * (cw + gap) - gap / 2 - 1; g.fillStyle = "#666a78"; g.fillRect(px, yT + 1, 2, h - gH - 1); g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(px, yT + 1, 0.6, h - gH - 1); }
  for (let f = 2; f <= n; f++) { const xr = x + w, y = fy(f) + fH * 0.25, hh = fH * 0.5; g.fillStyle = cur ? "rgba(20,30,54,.6)" : "rgba(10,8,24,.5)"; poly(g, [xr + d * 0.22, y - d * 0.22 * k, xr + d * 0.78, y - d * 0.78 * k, xr + d * 0.78, y + hh - d * 0.78 * k, xr + d * 0.22, y + hh - d * 0.22 * k]); g.fill(); if (P.win === "bal" && f % 2) { const ax = xr + d * 0.1, ay = fy(f) + fH - 3.6; g.fillStyle = "#cfd2da"; poly(g, [ax, ay, ax + 4, ay - 2.2, ax + 4, ay + 0.8, ax, ay + 3]); g.fill(); } }
  // 로비: 유리 벽 · 안내 데스크 · 가운데 문 · 캐노피
  g.fillStyle = "#12101c"; g.fillRect(x + 3, gy + 3, w - 6, gH - 3); const lg = g.createLinearGradient(0, gy + 3, 0, PGY); lg.addColorStop(0, "rgba(255,232,190,.8)"); lg.addColorStop(1, "rgba(232,186,126,.5)"); g.fillStyle = lg; g.fillRect(x + 4, gy + 4, w - 8, gH - 4);
  g.fillStyle = "rgba(70,48,34,.6)"; g.fillRect(x + w * 0.1, PGY - 8, w * 0.24, 8); g.fillStyle = "rgba(255,246,220,.85)"; for (const t of [0.16, 0.28]) g.fillRect(x + w * t, gy + 6.4, 1.6, 1.6); g.fillStyle = "rgba(40,80,50,.7)"; g.beginPath(); g.arc(x + w * 0.88, PGY - 9, 3.4, 0, 7); g.fill(); g.fillRect(x + w * 0.88 - 1.6, PGY - 6, 3.2, 6);
  g.fillStyle = "rgba(30,28,40,.85)"; for (const t of [0.2, 0.4]) g.fillRect(x + 4 + (w - 8) * t - 0.5, gy + 4, 1, gH - 4);
  const dx = x + w * 0.5, dw = w * 0.24; g.strokeStyle = "#d4d7e6"; g.lineWidth = 1; g.strokeRect(dx, gy + 7.5, dw, gH - 7.5); g.fillStyle = "#d4d7e6"; g.fillRect(dx + dw / 2 - 0.5, gy + 7.5, 1, gH - 7.5); g.fillRect(dx + dw / 2 - 2.6, gy + 15, 0.9, 4); g.fillRect(dx + dw / 2 + 1.7, gy + 15, 0.9, 4);
  g.fillStyle = shadeC(P.f[1], 0.8); g.fillRect(x, gy, 3.6, gH); g.fillRect(x + w - 3.6, gy, 3.6, gH); g.fillStyle = shadeC(P.f[1], 0.62); g.fillRect(x, gy, w, 3);
  { const c0 = dx - 7, c1 = dx + dw + 7, cy = gy + 3.4, cc = P.canopy === "glass" ? ["rgba(200,225,245,.75)", "rgba(160,195,225,.55)"] : P.canopy === "steel" ? ["#3a3d48", "#23252d"] : ["#eceef2", "#c2c6d0"];
    g.fillStyle = cc[0]; g.fillRect(c0, cy, c1 - c0, 2.2); poly(g, [c0, cy + 2.2, c1, cy + 2.2, c1 + 5, cy + 5.6, c0 - 5, cy + 5.6], cc[1]); g.fillStyle = "rgba(255,244,214,.95)"; for (const t of [0.2, 0.5, 0.8]) g.fillRect(c0 + (c1 - c0) * t - 0.8, cy + 5.6, 1.6, 0.9);
    g.fillStyle = P.canopy === "steel" ? "#23252d" : "#b8bcc6"; g.fillRect(c0 - 4.4, cy + 5.6, 1, PGY - cy - 4.6); g.fillRect(c1 + 3.4, cy + 5.6, 1, PGY - cy - 4.6); }
  for (const px of [x + 5, x + w - 12]) { g.fillStyle = "#3a3c46"; g.fillRect(px, PGY - 4.5, 7, 4.5); g.fillStyle = "#3d7a4e"; g.beginPath(); g.arc(px + 2, PGY - 6, 2.6, 0, 7); g.arc(px + 5, PGY - 6.4, 2.6, 0, 7); g.fill(); }
  // 지붕
  if (P.roof === "equip") { g.fillStyle = "#4a5060"; g.fillRect(x + w * 0.15, yT - 10, w * 0.4, 7.4); g.fillStyle = "#6a7080"; for (let i = 0; i < 3; i++) g.fillRect(x + w * 0.18 + i * w * 0.12, yT - 12, w * 0.08, 2); g.strokeStyle = "#9aa0ac"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + w * 0.76, yT - 2); g.lineTo(x + w * 0.76, yT - 19); g.stroke(); g.fillStyle = "#ff6a78"; g.fillRect(x + w * 0.76 - 0.8, yT - 20, 1.6, 1.6); }
  if (P.roof === "tank") { const qx = x + w * 0.16; g.fillStyle = "#8a909c"; rr(g, qx, yT - 12.6, 13, 8.4, 2); g.fill(); g.fillStyle = "#5f6470"; g.fillRect(qx + 2, yT - 4.2, 1.4, 4); g.fillRect(qx + 9.6, yT - 4.2, 1.4, 4); boxF(g, x + w * 0.56, yT - d * 0.3, w * 0.3, 10, d * 0.5, P); }
  if (P.roof === "garden") { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#3d7a4e" : "#2f6040"; g.beginPath(); g.arc(x + 5 + (i * (w - 10)) / 5 + d * 0.35, yT - d * 0.22 - 4, 3.6, 0, 7); g.fill(); } g.strokeStyle = "rgba(235,240,245,.6)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, yT - 7.6); g.lineTo(x + w, yT - 7.6); for (let xx = x; xx <= x + w; xx += 3) { g.moveTo(xx, yT - 7.6); g.lineTo(xx, yT - 2.6); } g.stroke(); }
  G.door = dx + dw / 2; G.top = yT - (P.roof === "crown" ? 12 : P.roof === "equip" ? 20 : 12);
}

// ── 동네 배경: 하늘·먼 풍경·바닥·가로등 ──
const A_SKY = { hongdae: ["#1d1838", "#6a3f78", "#e8807a"], seongsu: ["#1e1424", "#7a3a3c", "#f2a050"], jongno: ["#0d1130", "#2a3668", "#8a6c90"], busan: ["#0b1736", "#1f4f7a", "#f0a878"], jeju: ["#050918", "#101e44", "#3a5c90"], gyeongju: ["#0e102c", "#2a2d60", "#7c5c7c"] };
const A_WALK = { hongdae: ["#5a5470", "#423d58"], seongsu: ["#7a4a40", "#5a342c"], jongno: ["#8c8c94", "#66666f"], busan: ["#a08060", "#775c40"], jeju: ["#43464c", "#2e3035"], gyeongju: ["#917a5c", "#6c5a42"] };
function aRidge(g, W, y0, amp, ph, col) { g.fillStyle = col; g.beginPath(); g.moveTo(-2, PGY); for (let xx = -2; xx <= W + 4; xx += 6) g.lineTo(xx, y0 - amp * (0.55 + 0.45 * Math.sin(xx * 0.021 + ph)) - amp * 0.22 * Math.sin(xx * 0.057 + ph * 2.3)); g.lineTo(W + 4, PGY); g.closePath(); g.fill(); }
function aBlocks(g, W, rnd, hi, col, wc, p = 0.22) { let xx = -rnd() * 20; while (xx < W) { const bw = 16 + rnd() * 24, bh = (0.35 + rnd() * 0.65) * hi + 10; g.fillStyle = col; g.fillRect(xx, PGY - bh, bw, bh); for (let yy = PGY - bh + 5; yy < PGY - 6; yy += 7) for (let x2 = xx + 3; x2 < xx + bw - 3; x2 += 5) if (rnd() < p) { g.fillStyle = wc; g.fillRect(x2, yy, 2, 2.6); } xx += bw + 2 + rnd() * 6; } }
function aBack(g, W, r, G, rnd) {
  const k = r.rk, sk = A_SKY[k] || A_SKY.hongdae, gr = g.createLinearGradient(0, 0, 0, PGY); gr.addColorStop(0, sk[0]); gr.addColorStop(0.62, sk[1]); gr.addColorStop(1, sk[2]); g.fillStyle = gr; g.fillRect(0, 0, W, PGY + 2);
  const nStar = { jeju: 110, gyeongju: 46, jongno: 26, busan: 18 }[k] || 14; for (let i = 0; i < nStar; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.65})`; const s = k === "jeju" && rnd() < 0.2 ? 1.8 : 1.2; g.fillRect(rnd() * W, rnd() * (k === "jeju" ? 104 : 62), s, s); }
  const mx = W * 0.84, my = 25;
  if (k === "gyeongju") { const mg = g.createRadialGradient(mx, my, 2, mx, my, 26); mg.addColorStop(0, "rgba(255,244,210,.5)"); mg.addColorStop(1, "rgba(255,244,210,0)"); g.fillStyle = mg; g.fillRect(mx - 26, my - 26, 52, 52); g.fillStyle = "rgba(255,247,222,.96)"; g.beginPath(); g.arc(mx, my, 9, 0, 7); g.fill(); g.fillStyle = "rgba(220,205,170,.5)"; g.beginPath(); g.arc(mx - 2.6, my - 1.6, 2.2, 0, 7); g.arc(mx + 3, my + 2.6, 1.5, 0, 7); g.fill(); }
  else { g.fillStyle = "rgba(255,246,214,.95)"; g.beginPath(); g.arc(mx, my, 8, 0, 7); g.fill(); g.fillStyle = sk[0]; g.beginPath(); g.arc(mx + 4, my - 3, 7, 0, 7); g.fill(); }
  if (k === "hongdae") { aBlocks(g, W, rnd, 62, "rgba(20,18,44,.55)", "rgba(255,220,150,.35)"); aBlocks(g, W, rnd, 40, "rgba(14,12,32,.85)", "rgba(255,210,140,.5)");
    for (const [y0, sag] of [[44, 20], [58, 14]]) { g.strokeStyle = "rgba(40,30,50,.7)"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0 - 6); g.stroke(); const nb = Math.round(W / 15); for (let i = 1; i < nb; i++) { const t = i / nb, bx = t * W, by = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * (y0 + sag * 2) + t * t * (y0 - 6); g.fillStyle = "rgba(255,214,140,.2)"; g.beginPath(); g.arc(bx, by + 2, 3.4, 0, 7); g.fill(); g.fillStyle = ["#ffe2a0", "#ffd0a0", "#fff0c8"][i % 3]; g.beginPath(); g.arc(bx, by + 2, 1.4, 0, 7); g.fill(); } } }
  else if (k === "seongsu") { // 붉은 벽돌 공장: 톱니 지붕·굴뚝·물탱크
    let xx = -rnd() * 30; while (xx < W) { const bw = 44 + rnd() * 26, bh = 34 + rnd() * 20, nt = Math.max(2, Math.round(bw / 15)); g.fillStyle = "rgba(52,24,24,.88)"; g.fillRect(xx, PGY - bh, bw, bh); for (let i = 0; i < nt; i++) { const tx = xx + (i * bw) / nt; poly(g, [tx, PGY - bh, tx + bw / nt, PGY - bh, tx, PGY - bh - 9], "rgba(52,24,24,.88)"); g.fillStyle = "rgba(255,190,120,.16)"; poly(g, [tx + 1, PGY - bh - 1, tx + 1, PGY - bh - 7, tx + bw / nt * 0.6, PGY - bh - 1]); g.fill(); }
      for (let x2 = xx + 5; x2 < xx + bw - 7; x2 += 9) { g.fillStyle = rnd() < 0.3 ? "rgba(255,200,130,.5)" : "rgba(20,10,14,.7)"; g.fillRect(x2, PGY - bh + 8, 5, 11); g.beginPath(); g.arc(x2 + 2.5, PGY - bh + 8, 2.5, Math.PI, 0); g.fill(); }
      if (rnd() < 0.6) { const cx = xx + bw * (0.2 + rnd() * 0.6); g.fillStyle = "rgba(70,34,30,.95)"; g.fillRect(cx, PGY - bh - 34, 5, 34); g.fillStyle = "rgba(230,220,210,.5)"; g.fillRect(cx, PGY - bh - 30, 5, 1.6); g.fillRect(cx, PGY - bh - 26, 5, 1.6); }
      xx += bw + 4 + rnd() * 10; }
    const wx = W * 0.2; g.fillStyle = "rgba(34,18,22,.95)"; g.fillRect(wx - 5, PGY - 78, 10, 9); poly(g, [wx - 6, PGY - 78, wx + 6, PGY - 78, wx, PGY - 84], "rgba(34,18,22,.95)"); g.fillRect(wx - 4.4, PGY - 69, 1, 22); g.fillRect(wx + 3.4, PGY - 69, 1, 22); }
  else if (k === "jongno") { // 산 능선과 탑 · 겹겹 기와지붕 · 궁궐 돌담
    aRidge(g, W, PGY - 44, 30, 0.6, "rgba(24,30,66,.85)"); aRidge(g, W, PGY - 30, 22, 2.2, "rgba(18,22,52,.92)");
    const tx = W * 0.2, tb = PGY - 44 - 30 * (0.55 + 0.45 * Math.sin(tx * 0.021 + 0.6)) - 30 * 0.22 * Math.sin(tx * 0.057 + 1.38) + 3; g.fillStyle = "rgba(24,30,66,.95)"; g.fillRect(tx - 0.9, tb - 22, 1.8, 22); rr(g, tx - 2.8, tb - 15, 5.6, 3.6, 1.2); g.fill(); g.fillRect(tx - 0.35, tb - 29, 0.7, 7); g.fillStyle = "#ff7a86"; g.fillRect(tx - 0.8, tb - 30, 1.6, 1.6); g.fillStyle = "rgba(255,226,170,.8)"; g.fillRect(tx - 2, tb - 14, 4, 1);
    for (const [yy, a] of [[PGY - 22, 0.75], [PGY - 12, 0.95]]) { let xx = -rnd() * 18; while (xx < W) { const rw = 24 + rnd() * 12, y0 = yy - rnd() * 6; g.fillStyle = `rgba(22,22,44,${a})`; g.beginPath(); g.moveTo(xx - 3, y0 + 1); g.quadraticCurveTo(xx + rw / 2, y0 + 5, xx + rw + 3, y0 + 1); g.lineTo(xx + rw - 4, y0 - 6); g.lineTo(xx + 4, y0 - 6); g.closePath(); g.fill(); g.fillRect(xx + 1, y0 + 2, rw - 2, PGY - y0); if (rnd() < 0.5) { g.fillStyle = "rgba(255,206,130,.5)"; g.fillRect(xx + rw * 0.3, y0 + 5, 3, 3); } xx += rw + 3 + rnd() * 6; } }
    g.fillStyle = "#56525f"; g.fillRect(0, PGY - 13, W, 13); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.5; for (let yy = PGY - 9, i = 0; yy < PGY; yy += 4, i++) { g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); for (let xx = (i % 2) * 5; xx < W; xx += 10) { g.beginPath(); g.moveTo(xx, yy - 4); g.lineTo(xx, yy); g.stroke(); } } g.fillStyle = "#22222c"; g.fillRect(0, PGY - 16, W, 3.4); g.fillStyle = "#3a3c48"; for (let xx = 0; xx < W; xx += 3) { g.beginPath(); g.arc(xx + 1.5, PGY - 16, 1.5, Math.PI, 0); g.fill(); } }
  else if (k === "busan") { // 바다 수평선 · 다리 불빛 · 고층
    const hy = PGY - 40, sg = g.createLinearGradient(0, hy, 0, PGY); sg.addColorStop(0, "#2a5a80"); sg.addColorStop(1, "#0e2238"); g.fillStyle = sg; g.fillRect(0, hy, W, 40); g.fillStyle = "rgba(255,200,150,.35)"; g.fillRect(0, hy, W, 0.8);
    for (let i = 0; i < W / 5; i++) { g.fillStyle = `rgba(255,${200 + rnd() * 40},${150 + rnd() * 60},${0.1 + rnd() * 0.25})`; g.fillRect(rnd() * W, hy + 2 + rnd() * 36, 3 + rnd() * 7, 0.8); }
    for (let i = 0; i < 5; i++) { const bx = W * 0.02 + i * W * 0.062 + rnd() * 4, bw = 8 + rnd() * 5, bh = 46 + rnd() * 62; g.fillStyle = "rgba(14,22,50,.92)"; g.fillRect(bx, hy - bh + 6, bw, bh); for (let yy = hy - bh + 10; yy < hy + 2; yy += 4) for (let x2 = bx + 1.6; x2 < bx + bw - 2; x2 += 3) if (rnd() < 0.32) { g.fillStyle = "rgba(255,220,160,.6)"; g.fillRect(x2, yy, 1.4, 1.8); } g.fillStyle = "rgba(255,220,160,.12)"; g.fillRect(bx, hy + 6, bw, 14); }
    const dy = hy - 9, b0 = W * 0.36, t1 = W * 0.56, t2 = W * 0.86; g.strokeStyle = "rgba(20,28,56,.95)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(b0, dy); g.lineTo(W + 4, dy); g.stroke(); g.fillStyle = "rgba(20,28,56,.95)"; for (const tx of [t1, t2]) { g.fillRect(tx - 1.2, dy - 26, 2.4, 26 + 9); g.fillRect(tx - 2.4, dy - 20, 4.8, 1.2); }
    g.lineWidth = 0.7; g.beginPath(); g.moveTo(b0, dy); g.quadraticCurveTo((b0 + t1) / 2, dy - 2, t1, dy - 26); g.quadraticCurveTo((t1 + t2) / 2, dy + 18, t2, dy - 26); g.quadraticCurveTo((t2 + W + 30) / 2, dy - 2, W + 30, dy); g.stroke();
    for (let xx = b0 + 3; xx < W; xx += 5.4) { g.fillStyle = "rgba(255,226,160,.95)"; g.fillRect(xx, dy - 2.4, 1.3, 1.3); g.fillStyle = "rgba(255,226,160,.2)"; g.fillRect(xx, hy + 1 + rnd() * 3, 1.3, 7 + rnd() * 8); } for (const tx of [t1, t2]) { g.fillStyle = "#ff7a86"; g.fillRect(tx - 0.8, dy - 28, 1.6, 1.6); }
    g.strokeStyle = "rgba(215,222,235,.7)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, PGY - 7); g.lineTo(W, PGY - 7); g.moveTo(0, PGY - 3.6); g.lineTo(W, PGY - 3.6); for (let xx = 2; xx < W; xx += 9) { g.moveTo(xx, PGY - 7.6); g.lineTo(xx, PGY); } g.stroke(); }
  else if (k === "jeju") { // 큰 산 · 오름 · 밭담 · 야자수
    g.fillStyle = "#1c2c5a"; g.beginPath(); g.moveTo(-4, PGY); g.lineTo(-4, PGY - 20); g.bezierCurveTo(W * 0.22, PGY - 26, W * 0.36, PGY - 60, W * 0.5, PGY - 64); g.lineTo(W * 0.54, PGY - 61); g.lineTo(W * 0.58, PGY - 63); g.bezierCurveTo(W * 0.74, PGY - 54, W * 0.86, PGY - 26, W + 4, PGY - 18); g.lineTo(W + 4, PGY); g.closePath(); g.fill();
    g.fillStyle = "#101a3a"; for (const [cx, rw, rh2] of [[W * 0.14, 34, 20], [W * 0.82, 40, 24]]) { g.beginPath(); g.ellipse(cx, PGY - 4, rw, rh2, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = "#16302a"; g.fillRect(0, PGY - 12, W, 12); g.fillStyle = "#1c3a30"; g.fillRect(0, PGY - 12, W, 3);
    for (const [y0, ph] of [[PGY - 11, 0], [PGY - 5, 2]]) for (let xx = -2; xx < W; xx += 2.6) { g.fillStyle = rnd() < 0.5 ? "#2c2e34" : "#3a3c44"; g.fillRect(xx, y0 + Math.sin(xx * 0.05 + ph) * 2.2 - rnd(), 2.2, 2.4); }
    aPalm(g, W * 0.07, PGY, 58); aPalm(g, W * 0.9, PGY - 2, 46); }
  else if (k === "gyeongju") { // 낮은 산 · 고분 · 소나무
    aRidge(g, W, PGY - 34, 22, 1.1, "rgba(22,26,60,.9)");
    for (const [cx, rw, rh2] of [[W * 0.16, 50, 44], [W * 0.66, 60, 50], [W * 0.95, 44, 38], [W * 0.4, 32, 26]]) { const tg = g.createLinearGradient(0, PGY - rh2, 0, PGY); tg.addColorStop(0, "#3c6c4c"); tg.addColorStop(1, "#1c3a30"); g.fillStyle = tg; g.beginPath(); g.ellipse(cx, PGY, rw, rh2, 0, Math.PI, 0); g.fill(); g.strokeStyle = "rgba(200,226,180,.2)"; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, PGY, rw - 1, rh2 - 1, 0, Math.PI * 1.15, Math.PI * 1.7); g.stroke(); }
    aPine(g, W * 0.06, PGY, 46); if (W > 230) aPine(g, W * 0.96, PGY, 40); }
}
function aGround(g, W, r, rnd) {
  const k = r.rk, wk = A_WALK[k] || A_WALK.hongdae, sw = g.createLinearGradient(0, PGY, 0, PCURB); sw.addColorStop(0, wk[0]); sw.addColorStop(1, wk[1]); g.fillStyle = sw; g.fillRect(0, PGY, W, PCURB - PGY);
  g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 0.8;
  if (k === "seongsu") { g.strokeStyle = "rgba(0,0,0,.18)"; for (let y = PGY + 3, i = 0; y < PCURB; y += 4, i++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (i % 2) * 4; x < W; x += 8) { g.beginPath(); g.moveTo(x - (y - PGY) * 0.3, y - 4); g.lineTo(x - (y - PGY) * 0.3, y); g.stroke(); } } }
  else if (k === "jongno") { g.strokeStyle = "rgba(0,0,0,.16)"; for (let y = PGY + 1, i = 0; y < PCURB; y += 8.4, i++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (i % 2) * 9 - 4; x < W; x += 18) { g.beginPath(); g.moveTo(x - (y - PGY) * 0.25, y); g.lineTo(x - (y + 8.4 - PGY) * 0.25, y + 8.4); g.stroke(); } } }
  else if (k === "busan") { g.strokeStyle = "rgba(50,30,14,.3)"; for (let x = -10; x < W + 10; x += 7) { g.beginPath(); g.moveTo(x, PGY); g.lineTo(x - 7, PCURB); g.stroke(); } g.strokeStyle = "rgba(255,255,255,.1)"; g.beginPath(); g.moveTo(0, PGY + 13); g.lineTo(W, PGY + 13); g.stroke(); }
  else if (k === "jeju" || k === "gyeongju") { for (let i = 0; i < W * 0.9; i++) { g.fillStyle = k === "jeju" ? `rgba(${rnd() < 0.5 ? "120,124,132" : "20,20,24"},.35)` : `rgba(${rnd() < 0.5 ? "190,170,130" : "70,56,38"},.3)`; g.fillRect(rnd() * W, PGY + 1 + rnd() * (PCURB - PGY - 2), 1 + rnd() * 1.6, 1); } if (k === "gyeongju") for (let i = 0; i < W / 40; i++) { g.fillStyle = "rgba(150,144,130,.5)"; g.beginPath(); g.ellipse(rnd() * W, PGY + 5 + rnd() * 18, 4 + rnd() * 3, 1.6, 0, 0, 7); g.fill(); } }
  else { for (let x = 0; x < W; x += 18) { g.beginPath(); g.moveTo(x, PGY); g.lineTo(x - 8, PCURB); g.stroke(); } g.beginPath(); g.moveTo(0, PGY + 13); g.lineTo(W, PGY + 13); g.stroke(); }
  g.fillStyle = { jeju: "#55585f", gyeongju: "#8c8474", jongno: "#a8a8b0" }[k] || "#b9b4cc"; g.fillRect(0, PCURB, W, 2.5); g.fillStyle = k === "jeju" || k === "gyeongju" ? "#232327" : "#1f1d2c"; g.fillRect(0, PCURB + 2.5, W, PH - PCURB);
  if (k === "jongno" || k === "gyeongju") { g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 0.6; for (let x = 0; x < W; x += 12) { g.beginPath(); g.moveTo(x, PCURB + 3); g.lineTo(x - 4, PH); g.stroke(); } }
  else { g.fillStyle = k === "jeju" ? "rgba(255,230,140,.4)" : "rgba(255,230,140,.5)"; for (let x = 6; x < W; x += 30) g.fillRect(x, 212, 14, 1.6); }
  if (k === "jeju") { for (let xx = 0; xx < W; xx += 2.8) { g.fillStyle = rnd() < 0.5 ? "#3a3c44" : "#4c4f56"; g.fillRect(xx, PCURB - 1.4 - rnd(), 2.4, 2.6); } }
}
function aLamps(g, W, r, G) {
  const k = r.rk;
  for (const lx of k === "jeju" ? [W - W * 0.08] : [W * 0.08, W - W * 0.08]) {
    if (k === "jongno" || k === "gyeongju") { g.fillStyle = "#2a2018"; g.fillRect(lx - 1, PGY - 34, 2, 40); g.fillRect(lx - 1, PGY - 34, 8.5, 1.6); g.fillRect(lx + 5.6, PGY - 33, 0.7, 3); g.fillStyle = "#d9364a"; rr(g, lx + 3.2, PGY - 30.4, 5.6, 4.2, 1.6); g.fill(); g.fillStyle = "#3a5ac8"; rr(g, lx + 3.2, PGY - 26.6, 5.6, 4.2, 1.6); g.fill(); g.fillStyle = "rgba(255,236,190,.85)"; g.fillRect(lx + 4.6, PGY - 28.6, 2.8, 3.6); G.lamps.push([lx + 6, PGY - 27, 20]); }
    else if (k === "jeju") { g.fillStyle = "#3a2c22"; g.fillRect(lx - 1, PGY - 40, 2, 46); g.fillRect(lx - 1, PGY - 40, 7, 1.4); g.fillStyle = "#ffe2a0"; g.fillRect(lx + 3.6, PGY - 38.6, 3, 2); G.lamps.push([lx + 5, PGY - 37, 24]); }
    else { g.fillStyle = "#2a2838"; g.fillRect(lx - 1, PGY - 46, 2.2, 52); g.fillRect(lx - 1, PGY - 46, 8, 2); G.lamps.push([lx + 6, PGY - 44, 30]); }
  }
  if (k === "busan") { const lx = W - W * 0.08; g.fillStyle = "#f2f2f4"; g.beginPath(); g.ellipse(lx + 3, PGY - 48.4, 3, 1.6, 0, 0, 7); g.fill(); g.beginPath(); g.arc(lx + 5.6, PGY - 49.8, 1.3, 0, 7); g.fill(); g.fillStyle = "#f5b04a"; g.fillRect(lx + 6.6, PGY - 50, 1.4, 0.7); }
}
// 양옆 이웃(빌라·오피스텔만): 홍대 = 벽화 골목 · 성수 = 벽돌 창고와 카페 · 부산 = 아파트와 트인 바다
function aNeigh(g, W, r, G, rnd) {
  const L = G.x0 - 4, R = G.x1 + 4, k = r.rk;
  const blk = (x0, x1, h, body, p = 0.28, band = "#3a3254") => { if (x1 - x0 < 8) return false; g.fillStyle = body; g.fillRect(x0, PGY - h, x1 - x0, h); for (let yy = PGY - h + 8; yy < PGY - 24; yy += 12) for (let xx = x0 + 5; xx < x1 - 6; xx += 10) { g.fillStyle = rnd() < p ? "rgba(255,214,140,.5)" : "#1c1830"; g.fillRect(xx, yy, 5, 6); } g.fillStyle = band; g.fillRect(x0, PGY - 22, x1 - x0, 22); return true; };
  if (k === "hongdae") {
    if (blk(-6, L, 48 + rnd() * 22, "#2b2540")) { g.save(); g.beginPath(); g.rect(0, PGY - 40, L, 40); g.clip(); g.fillStyle = "#23203a"; g.fillRect(0, PGY - 40, L, 40); const C = ["#ff5a8a", "#ffd25a", "#5ad1ff", "#b48cff", "#5fe0a0", "#ff9f5a"]; for (let i = 0; i < Math.max(5, L / 7); i++) { const cx = rnd() * L, cy = PGY - 6 - rnd() * 32, s = 4 + rnd() * 8, t = Math.floor(rnd() * 3); g.globalAlpha = 0.82; g.fillStyle = C[Math.floor(rnd() * C.length)]; if (t === 0) { g.beginPath(); g.arc(cx, cy, s * 0.6, 0, 7); g.fill(); } else if (t === 1) poly(g, [cx - s * 0.6, cy + s * 0.5, cx + s * 0.6, cy + s * 0.5, cx, cy - s * 0.6], g.fillStyle); else { g.lineWidth = 2; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(cx - s, cy); g.quadraticCurveTo(cx - s * 0.4, cy - s * 0.8, cx, cy); g.quadraticCurveTo(cx + s * 0.4, cy + s * 0.8, cx + s, cy); g.stroke(); } } g.globalAlpha = 1; g.restore(); }
    if (blk(R, W + 6, 42 + rnd() * 26, "#30284a")) { const sx = R + 4, sw = Math.min(40, W - R - 8); if (sw > 12) { g.fillStyle = "#1c1612"; g.fillRect(sx - 1, PGY - 19, sw + 2, 19); const ig = g.createLinearGradient(0, PGY - 18, 0, PGY); ig.addColorStop(0, "rgba(255,226,170,.85)"); ig.addColorStop(1, "rgba(240,180,110,.7)"); g.fillStyle = ig; g.fillRect(sx, PGY - 18, sw, 18); g.fillStyle = "rgba(60,40,30,.6)"; g.fillRect(sx + 3, PGY - 7, sw - 6, 3); const nn = Math.max(3, Math.round(sw / 7)); for (let i = 0; i < nn; i++) { g.fillStyle = i % 2 ? "#f3e7d1" : "#2f7a6a"; g.fillRect(sx - 1 + (i * (sw + 2)) / nn, PGY - 23, (sw + 2) / nn + 0.3, 4.4); } } }
  } else if (k === "seongsu") {
    if (L > 8) { const h = 44 + rnd() * 10, nt = Math.max(1, Math.round((L + 6) / 22)); g.fillStyle = "#5a2a22"; g.fillRect(-6, PGY - h, L + 6, h); for (let i = 0; i < nt; i++) { const tx = -6 + (i * (L + 6)) / nt; poly(g, [tx, PGY - h, tx + (L + 6) / nt, PGY - h, tx, PGY - h - 10], "#4a221c"); } g.save(); g.beginPath(); g.rect(0, PGY - h, L, h); g.clip(); aWall(g, { brick: 1 }, 0, PGY - h, L, h); g.restore(); for (let xx = 5; xx < L - 12; xx += 15) { g.fillStyle = "#16121c"; g.fillRect(xx, PGY - h + 10, 9, 16); g.beginPath(); g.arc(xx + 4.5, PGY - h + 10, 4.5, Math.PI, 0); g.fill(); g.fillStyle = "rgba(255,206,130,.3)"; g.fillRect(xx, PGY - h + 10, 9, 16); g.fillStyle = "#2a2228"; g.fillRect(xx + 4, PGY - h + 6, 0.9, 20); g.fillRect(xx, PGY - h + 17, 9, 0.9); } g.fillStyle = "#3a1c18"; g.fillRect(-6, PGY - 6, L + 6, 6); }
    if (W - R > 8) { const h = 38 + rnd() * 12, sw = W - R; g.fillStyle = "#3a2228"; g.fillRect(R, PGY - h, sw + 6, h); g.fillStyle = "rgba(0,0,0,.15)"; for (let yy = PGY - h + 2; yy < PGY; yy += 3) g.fillRect(R, yy, sw + 6, 0.5); if (sw > 18) { const cx = R + 4, cw = Math.min(46, sw - 6); g.fillStyle = "#1c1612"; g.fillRect(cx - 1, PGY - 24, cw + 2, 24); const ig = g.createLinearGradient(0, PGY - 23, 0, PGY); ig.addColorStop(0, "rgba(255,226,170,.88)"); ig.addColorStop(1, "rgba(240,180,110,.7)"); g.fillStyle = ig; g.fillRect(cx, PGY - 23, cw, 23); g.fillStyle = "#2a221c"; g.fillRect(cx + cw / 2 - 0.6, PGY - 23, 1.2, 23); g.fillStyle = "rgba(70,48,34,.6)"; g.fillRect(cx + 3, PGY - 8, cw * 0.36, 8); g.fillStyle = "rgba(255,246,220,.85)"; g.fillRect(cx + cw * 0.25, PGY - 19, 1.6, 1.6); g.fillRect(cx + cw * 0.7, PGY - 19, 1.6, 1.6); g.fillStyle = "#23382e"; g.fillRect(cx - 2, PGY - 28, cw + 4, 4.4); } }
  } else if (k === "busan") {
    if (L > 14) { const h = 104 + rnd() * 16, x1 = L - 4; g.fillStyle = "#222a44"; g.fillRect(-6, PGY - h, x1 + 6, h); for (let yy = PGY - h + 6; yy < PGY - 10; yy += 8) { g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(-6, yy + 5.6, x1 + 6, 1); for (let xx = 3; xx < x1 - 5; xx += 8) { g.fillStyle = rnd() < 0.34 ? "rgba(255,214,140,.5)" : "#161a30"; g.fillRect(xx, yy, 5, 4.4); } } g.fillStyle = "#2e3650"; g.fillRect(-6, PGY - 12, x1 + 6, 12); }
  } else { blk(-6, L, 30 + rnd() * 20, "#2c2a34", 0.25, "#35323e"); blk(R, W + 6, 30 + rnd() * 20, "#2c2a34", 0.25, "#35323e"); }
}
function aProps(g, W, r, G, rnd) { // 앞쪽 소품(건물 양옆 빈자리)
  const L = G.x0 - 6, R = G.x1 + 6, k = r.rk, multi = G.k === "villa" || G.k === "officetel";
  if (k === "hongdae" && multi) { // 버스킹 자리(앰프·마이크·기타 가방) / 자전거
    if (L > 40) { const bx = L - 30, by = PGY + 5; g.fillStyle = "#22202c"; g.fillRect(bx, by - 9, 8, 9); g.fillStyle = "#4a465a"; g.beginPath(); g.arc(bx + 4, by - 4.4, 2.6, 0, 7); g.fill(); g.strokeStyle = "#b8bcc8"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(bx + 14, by); g.lineTo(bx + 14, by - 17); g.lineTo(bx + 17, by - 19); g.stroke(); g.fillStyle = "#2a2a34"; g.beginPath(); g.arc(bx + 17.4, by - 19.4, 1.5, 0, 7); g.fill(); g.fillStyle = "#3a2a22"; g.beginPath(); g.ellipse(bx + 23, by - 1.2, 6.4, 2.2, -0.1, 0, 7); g.fill(); g.fillStyle = "#c8463a"; g.beginPath(); g.ellipse(bx + 23, by - 1.6, 5.2, 1.4, -0.1, 0, 7); g.fill(); g.fillStyle = "#ffd98a"; for (const [ox, oy] of [[-2, 0], [1, -0.4], [3, 0.3]]) g.fillRect(bx + 23 + ox, by - 2 + oy, 1, 0.8); }
    if (W - R > 30) { const bx = R + 6; g.strokeStyle = "#9aa0ac"; g.lineWidth = 0.9; g.beginPath(); g.arc(bx + 4, PGY - 4, 3.4, 0, 7); g.stroke(); g.beginPath(); g.arc(bx + 13, PGY - 4, 3.4, 0, 7); g.stroke(); g.beginPath(); g.moveTo(bx + 4, PGY - 4); g.lineTo(bx + 8, PGY - 9); g.lineTo(bx + 13, PGY - 4); g.moveTo(bx + 8, PGY - 9); g.lineTo(bx + 7, PGY - 11.4); g.stroke(); }
  }
  if (k === "seongsu" && multi) { if (L > 34) { const tx = L - 14; g.fillStyle = "#3a2a20"; g.fillRect(tx - 1, PGY - 22, 2.2, 22); g.fillStyle = "#d9a62e"; g.beginPath(); g.arc(tx, PGY - 28, 9.4, 0, 7); g.arc(tx - 6, PGY - 21, 6, 0, 7); g.arc(tx + 6, PGY - 21, 6, 0, 7); g.fill(); g.fillStyle = "#f0c44a"; g.beginPath(); g.arc(tx - 2, PGY - 30, 4.6, 0, 7); g.fill(); } if (W - R > 34) { const bx = R + 8; g.fillStyle = "#6a4a36"; g.fillRect(bx, PGY - 6, 18, 2); g.fillRect(bx + 1.6, PGY - 4, 1.5, 4); g.fillRect(bx + 15, PGY - 4, 1.5, 4); } }
  if (k === "busan" && multi && W - R > 30) { const bx = R + 8; g.fillStyle = "#7a5a40"; g.fillRect(bx, PGY - 6, 18, 2); g.fillRect(bx, PGY - 11, 18, 1.6); g.fillRect(bx + 1.6, PGY - 11, 1.5, 11); g.fillRect(bx + 15, PGY - 11, 1.5, 11); }
}
// 정적 층 한 장(bg) + 앞 층(fg: 담·울타리·난간처럼 불 켜진 창 앞에 오는 것)
function aStatic(g, W, r, G, rnd) {
  aBack(g, W, r, G, rnd); aGround(g, W, r, rnd);
  if (G.k === "villa" || G.k === "officetel") aNeigh(g, W, r, G, rnd);
  aLamps(g, W, r, G);
  const s = G.s, sy = (y) => PGY + (y - PGY) * s;
  if (s !== 1) for (const c of [g, G.f]) { c.save(); c.translate(0, PGY * (1 - s)); c.scale(s, s); }
  (G.k === "villa" ? aVilla : G.k === "officetel" ? aOtel : G.k === "hanok" ? aHanok : aDetached)(g, G, r, rnd);
  if (s !== 1) { g.restore(); G.f.restore(); for (const wn of [...G.mine, ...G.oth]) { wn[0] *= s; wn[1] = sy(wn[1]); wn[2] *= s; wn[3] *= s; if (Array.isArray(wn[6])) wn[6] = wn[6].map((v, i) => (i % 2 ? sy(v) : v * s)); } G.door *= s; G.top = sy(G.top); G.x0 *= s; G.x1 *= s; G.cx *= s; if (G.smoke) G.smoke = [G.smoke[0] * s, sy(G.smoke[1])]; G.W = W; }
  aProps(g, W, r, G, rnd);
  // 다른 집: 몇 칸만 은은한 불(정해진 자리, 안 깜빡임)
  const R = rng(r.id * 131 + 7); for (const wn of G.oth) if (R() < 0.13) { g.fillStyle = R() < 0.75 ? "rgba(255,222,165,.3)" : "rgba(206,222,255,.2)"; g.fillRect(wn[0], wn[1], wn[2], wn[3]); }
  G.ord = G.mine.map((_, i) => i).sort((a, b) => G.mine[b][2] * G.mine[b][3] - G.mine[a][2] * G.mine[a][3]); // 큰 창부터 불이 켜진다
  const F = G.f, dx = G.door;
  if (r.season === "winter") { g.fillStyle = "rgba(255,255,255,.75)"; for (let xx = 0; xx < W; xx += 3) g.fillRect(xx, PCURB - 1 - ((xx * 7) % 3), 3, 2); }
  if (r.setup) { F.save(); F.beginPath(); F.rect(dx - 13, PGY - 13, 26, 4.4); F.clip(); F.fillStyle = "rgba(245,192,78,.92)"; F.fillRect(dx - 13, PGY - 13, 26, 4.4); for (let q = -6; q < 32; q += 7) poly(F, [dx - 13 + q, PGY - 8.6, dx - 9.5 + q, PGY - 8.6, dx - 5.1 + q, PGY - 13, dx - 8.6 + q, PGY - 13], "#1b1b22"); F.restore(); for (const cx of [dx - 16, dx + 16]) { poly(F, [cx - 3.5, PGY + 8, cx + 3.5, PGY + 8, cx, PGY - 3], "#ff7a2e"); F.fillStyle = "#fff"; F.fillRect(cx - 2, PGY + 2, 4, 1.4); } }
  if (r.ban) { F.strokeStyle = "#f5c04e"; F.lineWidth = 2.4; F.beginPath(); F.moveTo(dx - 10, PGY - 20); F.lineTo(dx + 10, PGY); F.moveTo(dx + 10, PGY - 20); F.lineTo(dx - 10, PGY); F.stroke(); }
}
// 불 켜진 창 하나: 따뜻한 빛 + 안에서 천천히 오가는 사람 그림자(np 명)
function aLit(g, wn, a, t, np, ph) {
  const [x, y, w, h, paper, nb, shp] = wn;
  g.save(); g.beginPath(); if (shp === "c") g.arc(x + w / 2, y + h / 2, w / 2, 0, 7); else if (shp) { g.moveTo(shp[0], shp[1]); for (let i = 2; i < shp.length; i += 2) g.lineTo(shp[i], shp[i + 1]); g.closePath(); } else g.rect(x, y, w, h); g.clip();
  const wg = g.createLinearGradient(x, y, x, y + h); wg.addColorStop(0, `rgba(255,${paper ? 222 : 228},${paper ? 158 : 162},${a})`); wg.addColorStop(1, `rgba(${paper ? 250 : 255},${paper ? 194 : 180},${paper ? 120 : 104},${a})`); g.fillStyle = wg; g.fillRect(x, y, w, h);
  if (!paper && w > 9 && h > 8) { g.fillStyle = "rgba(255,246,226,.26)"; g.fillRect(x, y, w * 0.13, h); g.fillRect(x + w * 0.87, y, w * 0.13, h); }
  for (let i = 0; i < np; i++) { const hr = clamp(h * 0.17, 0.9, 2.4), bw = hr * 1.9, cx = x + w / 2 + Math.sin(t * 0.3 + ph + i * 2.6) * Math.max(0, w / 2 - bw - 0.6) * 0.86, top = y + h - clamp(h * 0.74, 3.4, 11.5) + Math.sin(t * 0.9 + ph + i) * 0.3; g.fillStyle = paper ? "rgba(104,60,28,.42)" : "rgba(56,28,22,.7)"; g.beginPath(); g.arc(cx, top + hr, hr, 0, 7); g.fill(); rr(g, cx - bw, top + hr * 1.9, bw * 2, h, Math.min(hr, bw)); g.fill(); }
  if (paper) aLattice(g, x, y, w, h, "rgba(70,42,24,.78)"); else if (nb) { g.fillStyle = "rgba(60,44,40,.5)"; for (let i = 1; i <= nb; i++) g.fillRect(x + (w * i) / (nb + 1) - 0.4, y, 0.8, h); }
  g.restore();
}
function aLive(g, W, r, G, st, t) {
  for (const [lx, ly, lr] of G.lamps) { const lg = g.createRadialGradient(lx, ly, 1, lx, ly, lr); lg.addColorStop(0, "rgba(255,220,140,.7)"); lg.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = lg; g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); }
  const on = r.on, ph = r.id * 1.7, n = G.mine.length;
  // 내 집: 지난달 예약률만큼 여러 칸에 따뜻한 불 + 사람 기척(깜빡이지 않는다)
  if (on && n) { const nl = clamp(Math.ceil(n * (0.3 + 0.7 * r.occ)), 1, n), a = 0.52 + 0.4 * r.occ; let np = r.occ < 0.1 ? 0 : Math.max(1, Math.round(r.occ * 3.4));
    for (let i = 0; i < nl; i++) { const wn = G.mine[G.ord[i]], kk = np > 0 && wn[2] >= 4.5 ? Math.min(np, wn[2] > 17 ? 2 : 1) : 0; np -= kk; aLit(g, wn, a * (0.975 + 0.025 * Math.sin(t * 0.6 + i * 1.3)), t, kk, ph + i * 2.1); }
    g.save(); g.shadowColor = "rgba(255,200,110,.85)"; g.shadowBlur = 6 + 5 * r.occ; g.strokeStyle = "rgba(255,214,150,.38)"; g.lineWidth = 0.8; for (let i = 0; i < nl; i++) { const wn = G.mine[G.ord[i]]; if (!wn[6]) g.strokeRect(wn[0], wn[1], wn[2], wn[3]); } g.restore(); }
  g.drawImage(G.fgc, 0, 0, W, PH);
  if (on && G.smoke) for (let i = 0; i < 4; i++) { const u = (t * 0.16 + i / 4) % 1; g.fillStyle = `rgba(210,214,226,${0.2 * (1 - u)})`; g.beginPath(); g.arc(G.smoke[0] + Math.sin(u * 5 + i) * 2.4 + u * 5, G.smoke[1] - u * 26, 2 + u * 4, 0, 7); g.fill(); }
  for (const p of st.ppl.slice().sort((a, c) => a.y - c.y)) drawPerson(g, p, t, st.dpr);
  // 별점 반짝(4.7 이상) — 은은하게 둘만
  if (on && r.star >= 4.7) for (let i = 0; i < 2; i++) { const a = (Math.sin(t * 1.3 + i * 2.6 + ph) + 1) / 2, sx = (G.x0 + G.x1) / 2 + (i ? 1 : -1) * (G.x1 - G.x0) * 0.3, sy = Math.max(30, G.top - 6 - i * 6), r2 = 1.6 + a * 1.4; g.save(); g.globalAlpha = 0.2 + a * 0.45; g.fillStyle = "#ffe9a0"; g.beginPath(); g.moveTo(sx, sy - r2 * 1.8); g.quadraticCurveTo(sx, sy, sx + r2 * 1.8, sy); g.quadraticCurveTo(sx, sy, sx, sy + r2 * 1.8); g.quadraticCurveTo(sx, sy, sx - r2 * 1.8, sy); g.quadraticCurveTo(sx, sy, sx, sy - r2 * 1.8); g.fill(); g.restore(); }
  const tx = (G.x0 + G.x1) / 2, ty = clamp(G.top - 9, 44, PGY - 40);
  if (r.wait) ptag(g, tx, ty, "등록 대기", "rgba(90,110,160,.92)");
  else if (r.setup) ptag(g, tx, ty, "오픈 준비", "#ff7a2e");
  else if (r.dark) ptag(g, tx, ty, r.ban ? `영업정지 ${r.ban}달` : `적자 ${r.red}달`, r.ban ? "#d9364a" : "rgba(120,30,50,.92)");
  for (const q of st.fx) { g.globalAlpha = q.a; if (r.season === "winter") { g.fillStyle = "#fff"; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill(); } else { g.fillStyle = r.season === "spring" ? "#ffc0d6" : r.season === "autumn" ? "#f08a3e" : "rgba(255,230,160,.9)"; g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, q.r * 1.6, q.r * 0.8, 0, 0, 7); g.fill(); g.restore(); } }
  g.globalAlpha = 1;
  ptag(g, 8, 14, `${r.no} · ${r.tyn}`, "rgba(10,8,24,.78)", "#fff", 11, true);
  if (r.peak && on) ptag(g, 8, 33, "성수기", "#ff5a7a", "#fff", 10, true);
  ptag(g, W / 2, 222, r.setup ? `${r.rkn} · ${r.wait ? "등록 대기" : "오픈 준비"}` : `${r.rkn} ★${r.star.toFixed(1)}`, "rgba(10,8,24,.82)", on && r.star >= 4.7 ? "#ffe27a" : r.dark ? "#ff9aa8" : "#fff");
}
// 사람: 지나가는 동네 사람은 늘 조금, 손님은 가끔 — 캐리어를 끌고 오거나, 친구 3~5명이 우르르 와서 차례로 들어가거나, 캐리어를 끌고 떠난다(예약률이 높을수록 자주)
function aMk(st, G, rnd, o = {}) {
  const ids = PPL.airbnb, fromL = o.fromL ?? rnd() < 0.5, W = st.W, id = ids[Math.floor(rnd() * ids.length)], lane = o.lane ?? PGY + 9 + rnd() * 14, sp = o.sp ?? 14 + rnd() * 10;
  const p = { id, spr: sprite(id, st.dpr), x: (fromL ? -10 : W + 10) - (fromL ? 1 : -1) * (o.back || 0), y: lane, lane, vx: (fromL ? 1 : -1) * sp, ph: rnd() * 6, st: "walk", store: !!o.guest, sc: 0.95 + rnd() * 0.1, seed: rnd() * 9, coat: COATS[Math.floor(rnd() * COATS.length)], fade: 1, bag: o.bag || null, bagC: COATS[Math.floor(rnd() * COATS.length)] };
  if (o.guest) p.tx = clamp(G.door + (o.off || 0), 4, W - 4);
  return p;
}
function aEvent(st, r, G, rnd, kind) {
  const x = rnd(), ev = kind || (x < 0.28 && r.occ > 0.25 ? "group" : x < 0.74 ? "arrive" : "leave"), fromL = rnd() < 0.5;
  if (ev === "group") { const n = 3 + Math.floor(rnd() * 3), sp = 15 + rnd() * 4, lane = PGY + 12 + rnd() * 6; for (let i = 0; i < n; i++) st.ppl.push(aMk(st, G, rnd, { guest: 1, fromL, sp, back: i * (8 + rnd() * 3), lane: lane + (i % 2 ? 3.4 : -2.6) + rnd() * 1.6, off: (rnd() - 0.5) * 3, bag: i === 0 || rnd() < 0.3 ? "case" : null })); }
  else if (ev === "arrive") { const n = rnd() < 0.4 ? 2 : 1, sp = 13 + rnd() * 5, lane = PGY + 11 + rnd() * 8; for (let i = 0; i < n; i++) st.ppl.push(aMk(st, G, rnd, { guest: 1, fromL, sp, back: i * 10, lane: lane + i * 3, bag: "case" })); }
  else { const n = rnd() < 0.35 ? 2 : 1, dir = fromL ? 1 : -1; for (let i = 0; i < n; i++) { const p = aMk(st, G, rnd, { bag: "case", lane: PGY + 11 + rnd() * 8 + i * 3 }); p.x = G.door + (rnd() - 0.5) * 3; p.y = PGY + 1; p.fade = 0; p.st = "out"; p.store = true; p.delay = i * 0.7; p.dir = dir; p.vx = dir * 0.001; st.ppl.push(p); } }
  return ev;
}
function aStep(st, r, G, dt, rnd) {
  for (const p of st.ppl) {
    p.ph += dt * Math.abs(p.vx) * 0.42;
    if (p.st === "walk") { p.x += p.vx * dt; if (p.store && (p.vx > 0 ? p.x >= p.tx : p.x <= p.tx)) { p.x = p.tx; p.st = "queue"; } }
    else if (p.st === "queue") { if (!st.ppl.some((q) => q !== p && q.st === "in" && q.y > PGY + 6)) p.st = "in"; } // 앞사람이 들어간 다음에 차례로
    else if (p.st === "in") { p.y -= 20 * dt; if (p.y <= PGY + 1) { p.y = PGY + 1; p.fade -= dt * 3; } if (p.fade <= 0) p.st = "gone"; }
    else if (p.st === "out") { if (p.delay > 0) p.delay -= dt; else { p.fade = Math.min(1, p.fade + dt * 3); p.y += 20 * dt; if (p.y >= p.lane) { p.y = p.lane; p.st = "leave"; p.vx = (p.dir || 1) * (13 + rnd() * 5); } } }
    else if (p.st === "leave") p.x += p.vx * dt;
  }
  st.ppl = st.ppl.filter((p) => p.st !== "gone" && (p.st === "queue" || p.st === "in" || p.st === "out" || (p.store && p.st === "walk") || (p.x > -70 && p.x < st.W + 70 && (p.st !== "leave" || (p.x > -20 && p.x < st.W + 20)) && (p.store || (p.x > -20 && p.x < st.W + 20)))));
  st.spawn -= dt;
  if (st.spawn <= 0) { st.spawn = 0.7 + rnd() * 1.1; const amb = st.ppl.filter((p) => !p.store).length; if (amb < 2 + (r.peak ? 1 : 0) && rnd() < 0.55) st.ppl.push(aMk(st, G, rnd)); }
  if (r.on) { st.ev -= dt; if (st.ev <= 0) { st.ev = (9 + rnd() * 10) / (0.4 + r.occ) / (r.peak ? 1.25 : 1); if (st.ppl.filter((p) => p.store).length < 6) st.last = aEvent(st, r, G, rnd); } }
  if (r.season !== "summer") { const want = r.season === "winter" ? 22 : 6;
    while (st.fx.length < want) st.fx.push({ x: rnd() * st.W, y: -rnd() * PH, r: r.season === "winter" ? 0.8 + rnd() * 1.4 : 1.3 + rnd(), a: 0.5 + rnd() * 0.5, vy: r.season === "winter" ? 10 + rnd() * 14 : 9 + rnd() * 8, vx: r.season === "winter" ? -3 + rnd() * 6 : 6 + rnd() * 8, rot: rnd() * 6, ph: rnd() * 6 });
    for (const q of st.fx) { q.ph += dt; q.y += q.vy * dt; q.x += (q.vx + Math.sin(q.ph * 1.7) * 6) * dt; q.rot += dt * 2; if (q.y > PH + 4 || q.x > st.W + 6 || q.x < -6) { q.y = -4; q.x = rnd() * st.W; } } }
}
function aPanel(r, W, dpr) {
  const el = document.createElement("div"); el.className = "tp-pan"; el.style.width = W + "px"; el.setAttribute("role", "button"); el.tabIndex = 0; el.setAttribute("aria-label", `${r.no} ${r.rkn} ${r.tyn} 성적표 보기`);
  const mk = () => { const c = document.createElement("canvas"); c.width = Math.round(W * dpr); c.height = Math.round(PH * dpr); return c; };
  const cv = mk(); cv.style.width = W + "px"; cv.style.height = PH + "px"; el.appendChild(cv);
  const g = cv.getContext("2d"), G = aGeo(r, W), bg = mk(), fg = mk(), bgc = bg.getContext("2d"), fgc = fg.getContext("2d"); bgc.setTransform(dpr, 0, 0, dpr, 0, 0); fgc.setTransform(dpr, 0, 0, dpr, 0, 0); G.f = fgc; G.fgc = fg;
  aStatic(bgc, W, r, G, rng(r.id * 97 + 11));
  const rnd = rng(r.id * 31 + 5), st = { W, dpr, ppl: [], fx: [], spawn: 0, ev: 1 + rnd() * 3, last: "" }; let t = 0;
  for (let i = 0; i < 240; i++) { t += 1 / 30; aStep(st, r, G, 1 / 30, rnd); } // 처음부터 사람이 오가는 중
  el._tick = (dt) => { t += dt; aStep(st, r, G, dt, rnd); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, PH); g.drawImage(bg, 0, 0, W, PH); aLive(g, W, r, G, st, t); };
  el._st = st; el._ev = (k) => aEvent(st, r, G, rnd, k); // 시험용: 손님 장면을 바로 부른다
  el._tick(0);
  return el;
}
const ACACHE = new Map(), ARV = { first: 0, sel: null };
function aR(m, s) {
  const rk = D.AB_REGIONS[s.rk] ? s.rk : "hongdae", ty = D.AB_TYPES[s.sub] ? s.sub : "oneroom";
  return { id: s.idn, rid: s.id, no: s.no, ty, tyn: D.AB_TYPES[ty].n, rk, rkn: D.AB_REGIONS[rk].n, occ: s.occ, star: s.rating || 0, on: !s.setup && !s.dark && !s.wait, setup: !!s.setup || !!s.wait, wait: !!s.wait, dark: !!s.dark, ban: s.ban, red: s.red, peak: !!s.peak, season: m.season, pv: s.pv ?? null };
}
// 숙소 성적표(판을 누르면)
function abStat(m, uid) {
  const S = m.S, u = S?.ab?.units.find((x) => x.id === uid); if (!u) return;
  const won = E.won, st = AB.unitStats(u, S.t), rk = D.AB_REGIONS[u.rk] ? u.rk : "hongdae", Rg = D.AB_REGIONS[rk], T = D.AB_TYPES[u.ty] || D.AB_TYPES.oneroom, sgn = (v) => (v < 0 ? "−" : v > 0 ? "+" : "") + won(Math.abs(v)), L = u.last;
  const openT = st.t0 ?? S.t - (u.months || 0);
  document.getElementById("tp-stov")?._close?.();
  const ov = document.createElement("div"); ov.id = "tp-stov"; ov.className = "tp-ov";
  ov.innerHTML = `<div class="tp-box" role="dialog" aria-modal="true" aria-labelledby="tp-stt"><div class="tp-bg" style="background-image:url(img/bg/ab_${rk}.webp)"></div><div class="tp-in">
    <div class="row"><b id="tp-stt" class="grow" style="font-size:18px">${escH(u.name)}</b><button type="button" class="tp-x" aria-label="닫기">✕</button></div>
    <span class="tiny muted">${escH(Rg.n)} · ${escH(T.n)} · ${u.reg === "legal" ? "등록 숙소" : "미등록"} · ${u.deco ? "직접 꾸민 방" : "업체 기본 배치"}</span>
    <div class="tp-grid"><div><span>개점</span><b>${ymOf(S, openT)}</b></div><div><span>운영</span><b>${u.months || 0}개월</b></div>
    <div><span>지금까지 번 돈</span><b class="${st.cum < 0 ? "bad" : ""}">${sgn(Math.round(st.cum))}</b></div><div><span>누적 숙박 · ${(st.stays || 0).toLocaleString()}팀</span><b>${(st.nights || 0).toLocaleString()}박</b></div>
    <div><span>지난달 예약률</span><b>${L ? Math.round(L.occ * 100) + "%" : "-"}</b></div><div><span>별점</span><b class="gold">${u.months ? "★" + (u.rating || 0).toFixed(2) : "-"}</b></div></div>
    <div class="tp-best"><div><span>최고 매출${st.bestM ? " · " + ymOf(S, st.bestM.t) : ""}</span><b class="up">${st.bestM ? won(Math.round(st.bestM.v)) : "아직 없음"}</b></div><div><span>최저 매출${st.worstM ? " · " + ymOf(S, st.worstM.t) : ""}</span><b class="dn">${st.worstM ? won(Math.round(st.worstM.v)) : "아직 없음"}</b></div></div>
    <button type="button" class="tp-go">가구 배치 보기</button></div></div>`;
  const back = document.activeElement;
  const close = () => { ov.remove(); document.removeEventListener("keydown", onKey, true); try { if (back?.isConnected) back.focus?.(); } catch (e) { /* 포커스 되돌리기 실패는 무시 */ } };
  const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  ov._close = close; document.addEventListener("keydown", onKey, true);
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector(".tp-x").onclick = close;
  ov.querySelector(".tp-go").onclick = () => { close(); try { m.opt.onDeco?.(u); } catch (e) { console.warn("tycoon deco", e); } };
  document.body.appendChild(ov); ov.querySelector(".tp-x").focus();
}
// 판 묶음(파티룸·에어씨앤씨가 같은 틀을 쓴다)
const KIT = { pr: { R: prR, pan: pPanel, stat: prStat, cache: PCACHE, rv: PRV }, airbnb: { R: aR, pan: aPanel, stat: abStat, cache: ACACHE, rv: ARV } };

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
  if (KIT[m.kind] && m.stores.length) return mountPr(root, m); // 11-26 파티룸·에어씨앤씨는 지점별 거리 판
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
  window.__tycdbg = { model, MODELS, abPanel: (r, W, dpr) => aPanel(r, W, dpr) }; // abPanel = 숙소 겉모습 시험용
}
