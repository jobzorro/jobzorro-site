// 인물 도감·관계도(v4.27). ui.js 가 열 때만 받는다(import("./people_ui.js")).
// 도감: 인생을 넘어 쌓이는 수집(meta.dex, people_dex.js). 관계도: 지금 인생의 사람들(나를 가운데).
// 묶음은 people_dex.js groupOf 가 등장인물 데이터를 보고 정한다 → 인물이 추가되면(예: 묶음 '인별') 저절로 칸이 생긴다.
import { BIT, GROUPS, groupOf, thumbStyle, dexSync, dexCount } from "./people_dex.js";

let X = null; // ui.js 가 넘기는 것: { S, E, D, esc, openWin, closeWin, charWin, meta, setMeta, toast, stage, face, pix, meFace }
const V = { tab: "all", sel: null, more: false, info: null };
const esc = (t) => X.esc(t);

// ── 공통 ──
const LOC_N = { home: "우리 집 근처", gym: "헬스장", cafe: "동네 카페", library: "스터디카페", pub: "동네 포차", realty: "부동산", office: "회사", officest: "오피스 상권", univ: "대학가", seminar: "커리어센터 강의장", hotplace: "성숲길", online: "온라인", newtown: "신도시", club: "취미 모임", parents: "본가" };
function places(c) {
  if (c.hire) return ["회사 · 새 얼굴"];
  if (c.co) return ["회사 · 같은 팀"];
  return [...new Set((c.hangouts || []).map((h) => LOC_N[h] || h))];
}
function roleHint(c) {
  const L = [], jb = { partyroom: "파티룸", consult: "컨설팅" };
  if (c.mentor) L.push(`${{ cs: "컨설팅", pr: "파티룸", airbnb: "에어씨앤씨", ucafe: "무인카페", chicken: "치킨", insta: "인별", tarot: "타로", webnovel: "웹소설", tutoring: "화상과외", vibe: "바이브코딩", petsit: "펫시팅", carwash: "출장 세차", buying: "구매대행" }[c.mentor] || ""} 스승 · 탐색하다 운 좋으면 만난다`);
  for (const sd of c.side || []) if (L.length < 2) L.push(sd.role);
  // 11-24 투잡에 도움이 되는지·손님인지는 친해져야(호감 50) 안다. 여기서는 알려 주지 않는다
  if ((c.roles || []).includes("romance") && c.single !== false) L.push("인연이 깊어질 수도");
  return L.slice(0, 2);
}
function relTop(o) {
  const b = o[3] || 0, a = o[1] || 0;
  if (b & BIT.spouse) return ["배우자", "💍"];
  if (b & BIT.lover) return ["연인", "♥"];
  if (b & BIT.affair) return ["비밀 관계", "🤫"];
  if (b & BIT.mentee) return ["특별한 제자", "🎓"];
  if (b & BIT.master) return ["스승", "🧭"];
  if (b & BIT.rival) return ["라이벌", "⚔"];
  if (a >= 70) return ["평생 친구", "⭐"];
  if (b & BIT.helper) return ["투잡 조력자", "🤝"];
  if (a >= 45 || b & BIT.friend) return ["친한 사이", "😊"];
  if (b & BIT.client) return ["손님", "🛎"];
  if (a >= 20) return ["아는 사이", "👋"];
  return ["스친 인연", "·"];
}
function bigEvents(c, o) {
  const b = o[3] || 0, L = [];
  for (const a of c.arc || []) if (a.stage <= (o[2] || 0)) L.push(a.title);
  if (b & BIT.helper) L.push("투잡을 같이 했다");
  if (b & BIT.client) L.push("내 손님이었다");
  if (b & BIT.mentee) L.push("특별한 제자가 됐다");
  if (b & BIT.lover) L.push("연인이 됐다");
  if (b & BIT.spouse) L.push("결혼했다");
  if (b & BIT.affair) L.push("선을 넘었다");
  return L.slice(-5);
}
// 11-24 친분 마크: 동성과 ◆인 회사 사람은 ◆ + 작은 글자, 나머지는 ♥. 도감 기록에 연인·배우자였던 적이 있으면 ♥
const relMark = (id, a, o) => { const n = Math.max(0, Math.min(5, Math.round((a || 0) / 20))); let m = { k: "heart" }; try { m = X.E.markOf(X.S, id); } catch (e) {} if (o && ((o[3] || 0) & (BIT.lover | BIT.spouse | BIT.affair))) m = { k: "heart" }; return m.k === "dia" ? `<span class="pp-h a6dm">${"◆".repeat(n)}<i>${"◆".repeat(5 - n)}</i><em>${esc(m.label)}</em></span>` : `<span class="pp-h">${"♥".repeat(n)}<i>${"♥".repeat(5 - n)}</i></span>`; };
function faceHtml(id, px, cls = "") {
  const st = thumbStyle(id, px);
  if (st) return `<i class="pp-f ${cls}" style="width:${px}px;height:${px}px;${st}"></i>`;
  let src = ""; try { src = X.pix(id) || ""; } catch (e) {}
  return `<i class="pp-f ${cls}" style="width:${px}px;height:${px}px;background-image:url('${src}');background-size:cover;background-position:center 20%"></i>`;
}

// ── 인물 도감 ──
function chars() { return Object.values(X.E.CHAR).filter((c) => c && c.id); }
function groupList() {
  const order = ["co", "pr", "cs", "insta", "town"], cnt = {};
  for (const c of chars()) { const g = groupOf(c); cnt[g] = (cnt[g] || 0) + 1; }
  return [...order.filter((k) => cnt[k]), ...Object.keys(cnt).filter((k) => !order.includes(k))].map((k) => ({ k, ...GROUPS[k], total: cnt[k] }));
}
function dexHtml() {
  const m = X.meta(), dex = m.dex || {}, all = chars(), N = all.length, n = dexCount(m, X.E.CHAR);
  if (V.sel) return dexDetail(V.sel, dex);
  const gl = groupList();
  const got = (k) => all.filter((c) => groupOf(c) === k && dex[c.id]).length;
  const list = all.filter((c) => V.tab === "all" || groupOf(c) === V.tab);
  const card = (c) => {
    const o = dex[c.id], g = GROUPS[groupOf(c)];
    if (!o) return `<button class="pp-c lk" data-dxid="${c.id}" style="--gc:${g.c}">${faceHtml(c.id, 50, "sil")}<b>???</b><span>📍 ${esc(places(c)[0] || "어딘가")}</span></button>`;
    const [rn, ri] = relTop(o);
    return `<button class="pp-c" data-dxid="${c.id}" style="--gc:${g.c}">${faceHtml(c.id, 50)}${ri !== "·" ? `<em>${ri}</em>` : ""}<b>${esc(c.name)}</b><span>${esc(rn)}</span></button>`;
  };
  // 정리(v4.27): 만난 사람만 카드, 못 만난 사람은 '못 만난 N명 · 📍곳' 한 줄(누르면 실루엣)
  const sec = (G) => { const L = list.filter((c) => groupOf(c) === G.k); if (!L.length) return ""; const L1 = L.filter((c) => dex[c.id]), L0 = L.filter((c) => !dex[c.id]); const pl = [...new Set(L0.map((c) => places(c)[0]).filter(Boolean))].slice(0, 2);
    return `<div class="pp-gh" style="--gc:${G.c}"><i>${G.ic}</i><b>${esc(G.n)}</b><span>${got(G.k)}/${G.total}</span></div>${L1.length ? `<div class="pp-grid">${L1.map(card).join("")}</div>` : ""}${L0.length ? `<details class="more pp-miss" style="--gc:${G.c}"><summary>못 만난 ${L0.length}명${pl.length ? ` · 📍${pl.map(esc).join("·")}` : ""} ▾</summary><div class="pp-grid">${L0.map(card).join("")}</div></details>` : ""}`; };
  return `<h2>인물 도감 <span class="tag gold">${n}/${N}</span><button class="x" data-close>✕</button></h2>
    <details class="more"><summary>인생을 넘어 쌓이는 수집이에요 · 자세히 ▾</summary><div class="small muted more-b">한 번 만난 사람은 다음 인생에도 여기 남아요. 실루엣은 아직 못 만난 사람, 📍가 만날 수 있는 곳이에요.</div></details>
    <div class="pp-bar"><i style="width:${Math.round((n / Math.max(1, N)) * 100)}%"></i></div>
    <div class="filters pp-tabs"><button class="${V.tab === "all" ? "on" : ""}" data-dxtab="all">전체 ${n}/${N}</button>${gl.map((G) => `<button class="${V.tab === G.k ? "on" : ""}" data-dxtab="${G.k}" style="--gc:${G.c}">${G.ic} ${esc(G.s)} ${got(G.k)}/${G.total}</button>`).join("")}</div>
    ${gl.map(sec).join("")}`;
}
function dexDetail(id, dex) {
  const c = X.E.CHAR[id], o = dex[id], G = GROUPS[groupOf(c)];
  const back = `<button class="btn sm" data-dxback>‹ 도감</button>`;
  if (!o) {
    const hs = roleHint(c);
    return `<h2>${back}<span class="grow"></span><button class="x" data-close>✕</button></h2>
      <div class="pp-lock" style="--gc:${G.c}">${faceHtml(id, 84, "sil")}<div><b>아직 못 만난 사람</b><div class="tiny muted">${G.ic} ${esc(G.n)}</div></div></div>
      <div class="card" style="margin-top:8px"><div class="small"><b>📍 만날 수 있는 곳</b></div><div class="chips" style="margin-top:4px">${places(c).map((p) => `<span class="chip">${esc(p)}</span>`).join("")}</div>
      ${hs.length ? `<div class="tiny muted" style="margin-top:6px">힌트: ${hs.map(esc).join(" · ")}</div>` : ""}</div>`;
  }
  const [rn, ri] = relTop(o), ev = bigEvents(c, o);
  let stage = ""; try { stage = X.stage(id) || ""; } catch (e) {}
  if (!stage) { let f = ""; try { f = X.face(id) || ""; } catch (e) {} stage = f ? `<div class="pp-bigf"><img class="face" src="${f}" alt=""></div>` : ""; }
  return `<h2>${back}<span class="grow"></span><button class="x" data-close>✕</button></h2>
    ${stage}
    <div class="pp-dh" style="--gc:${G.c}"><b>${esc(c.name)}</b><span class="tag" style="color:${G.c}">${G.ic} ${esc(G.s)}</span><span class="tag pink">${ri !== "·" ? ri + " " : ""}${esc(rn)}</span></div>
    <div class="small">${esc(X.S && X.E?.HL ? X.E.HL.jobOf(X.S, id) : c.job)} · ${X.S && X.E?.charAge ? X.E.charAge(X.S, c) : c.age}세</div>
    <div class="small muted" style="margin:2px 0 8px">${o[1] >= 10 ? esc(c.tagline || "") : "아직 잘 모르는 사이"}</div>
    <div class="kv pp-kv"><div><div class="k">처음 만난 인생</div><div class="v">${o[0] ? `${o[0]}회차` : "예전 인생"}</div></div><div><div class="k">최고 호감</div><div class="v">${relMark(id, o[1], o)} ${o[1]}</div></div><div><div class="k">관계 최고</div><div class="v">${esc(rn)}</div></div><div><div class="k">자주 있는 곳</div><div class="v small">${esc(places(c).slice(0, 2).join(", "))}</div></div></div>
    <div class="card" style="margin-top:8px"><div class="small"><b>같이 겪은 일</b></div>${ev.length ? `<div class="pp-ev">${ev.map((t) => `<span style="--gc:${G.c}">${esc(t)}</span>`).join("")}</div>` : `<div class="tiny muted" style="margin-top:4px">아직 큰 일은 없었어요. 호감 20·45·70에서 이야기가 열려요.</div>`}</div>
    <div class="tiny muted" style="margin-top:6px">${o[1] >= 35 ? `좋아함: ${(c.likes || []).map(esc).join(", ")} · 성격: ${(c.personality || []).map(esc).join(", ")}` : "성격과 취향은 더 친해지면(호감 35) 여기에 적혀요"}</div>`;
}
function bindDex(el) {
  el.querySelectorAll("[data-dxtab]").forEach((b) => b.onclick = () => { V.tab = b.dataset.dxtab; openDex(); });
  el.querySelectorAll("[data-dxid]").forEach((b) => b.onclick = () => { V.sel = b.dataset.dxid; openDex(true); });
  el.querySelectorAll("[data-dxback]").forEach((b) => b.onclick = () => { V.sel = null; openDex(); });
}
let dexScroll = 0;
function openDex(fromCard) {
  const w0 = document.querySelector("#modal .win"); if (fromCard === true && w0) dexScroll = w0.scrollTop; // 카드 → 자세히 → 뒤로 오면 보던 자리로
  X.openWin(`<div class="pp">${dexHtml()}</div>`, (el) => { bindDex(el); const w = el.querySelector(".win"); if (w && !V.sel && dexScroll) { w.scrollTop = dexScroll; dexScroll = 0; } });
}

// ── 관계도(지금 인생) ──
const JOB_C = ["#ff9f5a", "#4fd1d9", "#ff6b7f", "#a3e05f", "#e0b35f"];
function rivalGroup(job) {
  const k = { pr: "pr", cs: "cs", insta: "insta" }[job] || "j_" + job;
  if (!GROUPS[k]) GROUPS[k] = { n: `${X.D.SIDEJOBS[job]?.n || job} 판`, s: X.D.SIDEJOBS[job]?.n || job, c: JOB_C[Object.keys(GROUPS).length % JOB_C.length], ic: "⚔" };
  return k;
}
const affC = (a) => (a >= 70 ? "#ff7eb6" : a >= 45 ? "#5fe0a0" : a >= 20 ? "#6aa8ff" : "#9ea3c0");
function mapNodes() {
  const S = X.S, E = X.E, nodes = [];
  const rel = Object.entries(S.rel).filter(([id]) => E.CHAR[id]);
  const pri = ([id, x]) => (x.spouse ? 400 : x.lover ? 300 : x.affair ? 250 : 0) + (x.mentee ? 40 : 0) + (x.helper ? 30 : 0) + (x.client ? 10 : 0) + (x.aff || 0);
  rel.sort((a, b) => pri(b) - pri(a));
  const LIM = V.more ? 44 : 14, shown = rel.slice(0, LIM);
  for (const [id, x] of shown) {
    const c = E.CHAR[id];
    const g = x.spouse || x.lover || x.affair ? "love" : groupOf(c);
    const ics = [x.spouse ? "💍" : x.lover ? "♥" : x.affair ? "🤫" : "", x.mentee ? "🎓" : "", x.helper ? "🤝" : "", x.client && !x.mentee ? "🛎" : ""].filter(Boolean);
    nodes.push({ id, g, name: c.name, aff: x.aff || 0, ic: ics.join(""), line: x.affair ? { c: "#b48cff", d: "3 3" } : x.spouse || x.lover ? { c: "#ff7eb6" } : { c: affC(x.aff || 0) }, sub: x.spouse ? "배우자" : x.lover ? "연인" : x.affair ? "비밀" : x.mentee ? "제자" : x.helper ? "조력" : x.client ? "손님" : "" });
  }
  // 가족
  (S.fam.kids || []).forEach((k, i) => nodes.push({ id: "kid" + i, g: "love", name: k.name, aff: 90, emo: (S.t - k.born) / 12 >= 7 ? "🧒" : "👶", ic: "", line: { c: "#ff7eb6" }, sub: `${Math.floor((S.t - k.born) / 12)}살`, info: `${k.name} · ${Math.floor((S.t - k.born) / 12)}살 · 가족 행복 ${Math.round(S.fam.happy)}` }));
  if (S.fam.spouse || (S.fam.kids || []).length) nodes.push({ id: "parents", g: "love", name: "부모님", aff: Math.round(S.fam.parents || 0), emo: "👵", ic: "", line: { c: "#f5c04e" }, sub: `건강 ${Math.round(S.fam.parents || 0)}`, info: `부모님 · 건강 ${Math.round(S.fam.parents || 0)} · 본가에 자주 가면 좋아해요` });
  // 라이벌
  const KN = { price: "가격형", skill: "실력형" }, SN = { on: "경쟁 중", ally: "협업", gone: "떠남" };
  for (const r of S.rv?.list || []) {
    if (r.st === "gone" && !V.more) continue;
    const g = rivalGroup(r.job), st = r.st === "on" && r.fr ? "친구" : SN[r.st] || r.st;
    nodes.push({ id: "rv:" + r.id, g, name: r.n, aff: Math.max(5, Math.min(60, 25 + (r.rel || 0) / 2)), emo: "⚔", rival: true, ic: r.war ? "🔥" : r.st === "ally" ? "🤝" : "", line: { c: r.st === "ally" || r.fr ? "#5fe0a0" : r.st === "gone" ? "#6b7090" : "#ff6b7f", d: "5 4", w: 1.6, o: r.st === "gone" ? 0.45 : 1 }, sub: st, info: `라이벌 ${r.n} · ${KN[r.kind] || r.kind} · ${st} · ${r.d} · 실력 ${r.sk} · 가격 내 ${r.pc}%` });
  }
  return { nodes, hidden: Math.max(0, rel.length - LIM), total: rel.length };
}
function layout(nodes) {
  // 사람이 많으면(22명 넘게) 판을 세로로 늘리고 고리를 4개로
  const dense = nodes.length > 22, W = 340, H = dense ? 540 : 420, cx = W / 2, cy = H / 2, RX = 132, RY = H / 2 - 50;
  GROUPS.love = GROUPS.love || { n: "가족·사랑", s: "가족", c: "#ff7eb6", ic: "💗" };
  const order = ["love", "co", "pr", "cs", "insta"], keys = [...new Set(nodes.map((n) => n.g))];
  const secs = [...order.filter((k) => keys.includes(k)), ...keys.filter((k) => !order.includes(k) && k !== "town"), ...(keys.includes("town") ? ["town"] : [])];
  const cnt = (k) => nodes.filter((n) => n.g === k).length, wsum = secs.reduce((s, k) => s + Math.max(1.6, cnt(k)), 0);
  const gap = secs.length > 1 ? 0.06 : 0, span0 = Math.PI * 2 - gap * secs.length;
  let a = -Math.PI / 2 - (Math.max(1.6, cnt(secs[0] || "")) / wsum) * span0 / 2; // 첫 묶음(가족·사랑)이 위 가운데
  const RING = dense ? [0.4, 0.58, 0.77, 0.96] : [0.46, 0.71, 0.96], SP = dense ? 44 : 50, last = RING.length - 1, out = [], wedges = [];
  const ringOf = (n) => (n.rival ? last : dense ? (n.aff >= 75 ? 0 : n.aff >= 50 ? 1 : n.aff >= 25 ? 2 : 3) : n.aff >= 65 ? 0 : n.aff >= 35 ? 1 : 2);
  for (const k of secs) {
    const span = (Math.max(1.6, cnt(k)) / wsum) * span0, L = nodes.filter((n) => n.g === k).sort((p, q) => q.aff - p.aff);
    const cap = RING.map((r) => Math.max(1, Math.floor((span * ((RX + RY) / 2) * r) / SP)));
    const rings = RING.map(() => []);
    for (const n of L) {
      const want = ringOf(n); let put = false;
      for (const d of [0, 1, -1, 2, -2, 3, -3]) { const ri = want + d; if (ri >= 0 && ri <= last && rings[ri].length < cap[ri]) { rings[ri].push(n); put = true; break; } }
      if (!put) rings[last].push(n);
    }
    rings.forEach((R, ri) => R.forEach((n, i) => { const t = a + span * ((i + 0.5) / R.length), rr = RING[ri] - (R.length > cap[ri] ? (i % 2) * 0.1 : 0); out.push({ ...n, x: cx + Math.cos(t) * RX * rr, y: cy + Math.sin(t) * RY * rr }); }));
    wedges.push({ k, a0: a, a1: a + span });
    a += span + gap;
  }
  // 겹침 풀기: 얼굴+이름 칸(가로 58·세로 50)이 겹치면 서로 밀어낸다. 가운데 '나' 자리는 비워 둔다. 난수 없이 정해진 순서로
  const BX = dense ? 54 : 60, BY = dense ? 46 : 52;
  for (let it = 0; it < 80; it++) {
    let moved = false;
    for (let p = 0; p < out.length; p++) for (let q = p + 1; q < out.length; q++) {
      const A = out[p], B = out[q]; let dx = B.x - A.x, dy = B.y - A.y;
      const dn = Math.hypot(dx / BX, dy / BY); if (dn >= 1) continue;
      if (dn < 1e-3) { dx = (q - p) % 2 ? 1 : -1; dy = 0.5; }
      const k = (1 - dn) / 2 + 0.01, L = Math.hypot(dx / BX, dy / BY) || 1;
      A.x -= (dx / L) * k; A.y -= (dy / L) * k; B.x += (dx / L) * k; B.y += (dy / L) * k; moved = true;
    }
    for (const n of out) {
      const dx = n.x - cx, dy = n.y - cy, dn = Math.hypot(dx / 64, dy / 76); if (dn < 1) { n.x = cx + dx / (dn || 1); n.y = cy + (dn ? dy / dn : -76); }
      n.x = Math.max(30, Math.min(W - 30, n.x)); n.y = Math.max(22, Math.min(H - 34, n.y));
    }
    if (!moved) break;
  }
  return { W, H, cx, cy, RX, RY, dense, nodes: out, wedges };
}
function mapHtml() {
  const S = X.S, { nodes, hidden, total } = mapNodes(), Lr = layout(nodes), { W, H, cx, cy, RX, RY } = Lr, FS = Lr.dense ? 32 : 36;
  const pct = (v, m) => ((v / m) * 100).toFixed(2) + "%";
  const arc = (w) => { const R = 1.12, p = (t, r) => `${(cx + Math.cos(t) * RX * r).toFixed(1)},${(cy + Math.sin(t) * RY * r).toFixed(1)}`, big = w.a1 - w.a0 > Math.PI ? 1 : 0; return `M${cx},${cy} L${p(w.a0, R)} A${RX * R},${RY * R} 0 ${big} 1 ${p(w.a1, R)} Z`; };
  const wedges = Lr.wedges.map((w) => `<path d="${arc(w)}" fill="${GROUPS[w.k].c}" fill-opacity=".09" stroke="${GROUPS[w.k].c}" stroke-opacity=".25" stroke-width="1"/>`).join("");
  const lines = Lr.nodes.map((n) => `<line x1="${cx}" y1="${cy}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="${n.line.c}" stroke-width="${(n.line.w || 1 + n.aff / 24).toFixed(1)}" stroke-linecap="round" ${n.line.d ? `stroke-dasharray="${n.line.d}"` : ""} stroke-opacity="${n.line.o ?? 0.85}"/>`).join("");
  // 사람 사이: 배우자 ↔ 아이(얇은 선)
  const sp = Lr.nodes.find((n) => S.rel[n.id]?.spouse), fam = sp ? Lr.nodes.filter((n) => n.id.startsWith("kid")).map((k) => `<line x1="${sp.x.toFixed(1)}" y1="${sp.y.toFixed(1)}" x2="${k.x.toFixed(1)}" y2="${k.y.toFixed(1)}" stroke="#ff7eb6" stroke-width="1" stroke-opacity=".55"/>`).join("") : "";
  const labels = Lr.dense ? "" : Lr.wedges.map((w) => { const t = (w.a0 + w.a1) / 2, G = GROUPS[w.k]; let x = cx + Math.cos(t) * RX * 1.17, y = cy + Math.sin(t) * RY * 1.13; x = Math.max(40, Math.min(W - 40, x)); y = Math.max(11, Math.min(H - 11, y)); return `<span class="pp-sl" style="left:${pct(x, W)};top:${pct(y, H)};--gc:${G.c}">${G.ic} ${esc(G.s)}</span>`; }).join("");
  // 화면 정리(v4.31): 사람이 20명을 넘으면 이름표는 가까운 20명만. 나머지는 얼굴을 누르면 아래 칸에 이름이 나온다.
  const nameOn = Lr.nodes.length > 20 ? new Set([...Lr.nodes].sort((p, q) => ((S.rel[q.id]?.spouse || S.rel[q.id]?.lover ? 1 : 0) - (S.rel[p.id]?.spouse || S.rel[p.id]?.lover ? 1 : 0)) || q.aff - p.aff).slice(0, 20).map((n) => n.id)) : null;
  const nd = Lr.nodes.map((n) => `<button class="pp-n${n.rival ? " rv" : ""}${V.info === n.id ? " on" : ""}" data-pn="${esc(n.id)}" style="left:${pct(n.x, W)};top:${pct(n.y, H)};--gc:${GROUPS[n.g].c}">${n.emo ? `<i class="pp-f emo" style="width:${FS}px;height:${FS}px">${n.emo}</i>` : faceHtml(n.id, FS)}${n.ic ? `<em>${n.ic}</em>` : ""}${!nameOn || nameOn.has(n.id) || V.info === n.id ? `<b>${esc(n.name)}</b>` : ""}</button>`).join("");
  let me = ""; const mst = S.me.avatar && thumbStyle(S.me.avatar, 52);
  if (mst) me = `<i class="pp-f" style="width:52px;height:52px;${mst}"></i>`; else { let f = ""; try { f = X.meFace() || ""; } catch (e) {} me = `<i class="pp-f" style="width:52px;height:52px;background-image:url('${f}');background-size:cover"></i>`; }
  const sel = V.info && Lr.nodes.find((n) => n.id === V.info);
  const gcount = Lr.wedges.map((w) => `<span class="chip" style="border:1px solid ${GROUPS[w.k].c}66;color:${GROUPS[w.k].c}">${GROUPS[w.k].ic} ${esc(GROUPS[w.k].n)} ${Lr.nodes.filter((n) => n.g === w.k).length}</span>`).join("");
  const empty = !Lr.nodes.length;
  return `<h2>관계도 <span class="tag gold">${total}명</span><button class="x" data-close>✕</button></h2>
    <div class="small muted">지금 인생의 사람들이에요. 가까울수록 안쪽, 선이 굵고 분홍일수록 호감이 높아요. 얼굴을 누르면 그 사람 창이 열려요.${nameOn ? " 사람이 많아서 이름표는 가까운 20명만 보여요." : ""}</div>
    <div class="pp-map" style="aspect-ratio:${W}/${H}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${wedges}${lines}${fam}</svg>${labels}${nd}
      <div class="pp-me" style="left:${pct(cx, W)};top:${pct(cy, H)}">${me}<b>나</b></div>
      ${empty ? `<div class="pp-empty">아직 아는 사람이 없어요.<br>지도에서 '???'에게 말을 걸어 보세요.</div>` : ""}</div>
    ${sel ? `<div class="card pp-info" style="--gc:${GROUPS[sel.g].c}">${esc(sel.info || sel.name)}</div>` : ""}
    ${hidden || V.more ? `<button class="btn sm" style="width:100%;margin-top:6px" data-pmore>${V.more ? "가까운 사람만 보기" : `더 보기 +${hidden}명${(S.rv?.list || []).some((r) => r.st === "gone") ? " · 떠난 라이벌" : ""}`}</button>` : ""}
    <div class="chips" style="margin-top:8px">${gcount}</div>
    <div class="pp-leg"><span><i style="background:#ff7eb6"></i>호감 70+</span><span><i style="background:#5fe0a0"></i>45+</span><span><i style="background:#6aa8ff"></i>20+</span><span><i class="d" style="border-color:#ff6b7f"></i>라이벌</span><span><i class="d" style="border-color:#b48cff"></i>비밀</span></div>
    <div class="tiny muted" style="margin-top:4px">💍 배우자 · ♥ 연인 · 🤫 비밀 관계 · 🎓 제자 · 🤝 조력·협업 · 🛎 손님 · 🔥 가격 전쟁</div>
    <button class="btn sm" style="width:100%;margin-top:8px" data-pdex>인물 도감 열기</button>`;
}
function openMap() {
  X.openWin(`<div class="pp">${mapHtml()}</div>`, (el) => {
    el.querySelectorAll("[data-pn]").forEach((b) => b.onclick = () => {
      const id = b.dataset.pn;
      if (X.E.CHAR[id]) { V.info = null; return X.charWin(id); }
      V.info = V.info === id ? null : id; openMap();
    });
    const mo = el.querySelector("[data-pmore]"); if (mo) mo.onclick = () => { V.more = !V.more; openMap(); };
    const dx = el.querySelector("[data-pdex]"); if (dx) dx.onclick = () => { V.sel = null; openDex(); };
  });
}

// ── 들어가는 곳 ──
export function open(kind, ctx) {
  X = ctx; css();
  if (X.S) { try { const m = X.meta(); if (dexSync(X.S, m, X.E.CHAR)) X.setMeta(m); } catch (e) {} }
  if (kind === "map" && X.S) { V.info = null; return openMap(); }
  V.sel = null; if (kind && kind.startsWith("dex:")) V.sel = kind.slice(4);
  openDex();
}
// 시험용: 판 하나에 관계를 잔뜩 만든다(#autoN-pplmany). 난수는 쓰지 않음
export function demo(S, E, many, rivalDemo) {
  const ids = Object.keys(E.CHAR), rom = ids.filter((k) => E.isRomanceable(S, E.CHAR[k]));
  const take = many ? ids.slice(0, 40) : ids.slice(0, 3);
  take.forEach((id, i) => { E.ensureRel(S, id); const x = S.rel[id]; x.aff = Math.max(x.aff || 0, (i * 37) % 95 + 3); x.stage = Math.max(x.stage || 0, i % 4); if (many && i % 7 === 3) x.client = true; if (many && i % 9 === 4) { x.client = true; x.mentee = true; } if (many && i % 11 === 5) x.helper = "on"; });
  if (many) {
    const sp = rom[1]; E.ensureRel(S, sp); Object.assign(S.rel[sp], { spouse: true, aff: 80 }); S.fam.spouse = sp; S.fam.spouseType = "응원형"; S.fam.marriedT = S.t - 30;
    S.fam.kids.push({ born: S.t - 40, name: "하린" }, { born: S.t - 100, name: "도윤" });
    const af = rom[4]; E.ensureRel(S, af); Object.assign(S.rel[af], { affair: true, aff: 62 }); S.fam.affair = { who: af, t: S.t, sus: 20, crisisT: S.t, used: [], asked: false };
    try { rivalDemo(S, "pr"); rivalDemo(S, "cs"); } catch (e) {}
  }
}

let cssOn = false;
function css() {
  if (cssOn) return; cssOn = true;
  const s = document.createElement("style"); s.id = "ppcss";
  s.textContent = `.pp .pp-f{display:block;flex:none;border-radius:50%;background-color:#2a2f4e;background-repeat:no-repeat;box-shadow:0 0 0 2px var(--gc,#6b7090);font-style:normal}
.pp .pp-f.sil{filter:brightness(0) opacity(.55);box-shadow:none;background-color:transparent}
.pp .pp-f.emo{display:flex;align-items:center;justify-content:center;font-size:18px;background-color:#2a2f4e}
.pp-bar{height:8px;border-radius:99px;background:var(--panel3);margin:8px 0;overflow:hidden}.pp-bar i{display:block;height:100%;background:linear-gradient(90deg,#f5c04e,#ff7eb6)}
.pp-tabs{margin:4px 0 6px;padding-bottom:2px;scrollbar-width:none}.pp-tabs::-webkit-scrollbar{display:none}.pp-tabs button{font-size:12px;padding:5px 10px}.pp-tabs button.on{border-color:var(--gc,var(--pink));color:var(--gc,var(--pink))}
.pp-gh{display:flex;align-items:center;gap:6px;margin:12px 0 6px;padding:5px 9px;border-radius:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--gc) 22%,transparent),transparent);border-left:3px solid var(--gc)}
.pp-gh i{font-style:normal}.pp-gh b{font-size:13.5px;color:var(--gc)}.pp-gh span{margin-left:auto;font-size:12px;color:var(--muted);font-weight:700}
.pp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.pp-c{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 3px 6px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);min-width:0}
.pp-c b{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-c span{font-size:11px;color:var(--muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-c em{position:absolute;top:4px;right:5px;font-style:normal;font-size:12px}
.pp-c.lk{background:transparent;border-style:dashed}.pp-c.lk b{color:var(--muted)}
.pp-lock{display:flex;gap:14px;align-items:center;padding:10px;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--gc) 18%,transparent),transparent)}
.pp-kv{grid-template-columns:1fr 1fr!important}.pp-kv .v{white-space:normal}
.pp-dh{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}.pp-dh b{font-size:18px}
.pp-bigf{display:flex;justify-content:center;margin:4px 0 8px}.pp-bigf img{width:150px;height:150px;border-radius:16px;object-fit:cover}
.pp-ev{display:flex;flex-direction:column;gap:4px;margin-top:6px}.pp-ev span{font-size:12.5px;padding:5px 9px;border-radius:9px;background:var(--panel3);border-left:3px solid var(--gc)}
.pp-h{color:var(--pink);letter-spacing:-1px;font-size:12px}.pp-h i{font-style:normal;opacity:.25}
.pp-map{position:relative;width:100%;aspect-ratio:340/400;margin-top:8px;border-radius:16px;background:radial-gradient(circle at 50% 51%,#2a2f4e,#13152a 70%);overflow:hidden}
.pp-map svg{position:absolute;inset:0;width:100%;height:100%}
.pp-n{position:absolute;transform:translate(-50%,-30%);display:flex;flex-direction:column;align-items:center;gap:1px;width:62px;padding:0}
.pp-n b{font-size:11px;line-height:1.2;max-width:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px;border-radius:6px;background:rgba(14,16,32,.78)}
.pp-n em{position:absolute;top:-6px;left:calc(50% + 8px);font-style:normal;font-size:12px;line-height:1;filter:drop-shadow(0 1px 2px #000)}
.pp-n.rv .pp-f{box-shadow:0 0 0 2px var(--gc),0 0 0 4px #ff6b7f55}.pp-n.rv b{color:#ffb3bd}
.pp-n.on .pp-f{box-shadow:0 0 0 3px #fff}
.pp-me{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none}
.pp-me .pp-f{box-shadow:0 0 0 3px var(--gold),0 0 18px #f5c04e66}.pp-me b{font-size:12px;color:var(--gold)}
.pp-sl{position:absolute;transform:translate(-50%,-50%);font-size:11px;font-weight:800;color:var(--gc);background:rgba(14,16,32,.7);padding:1px 6px;border-radius:99px;white-space:nowrap;pointer-events:none}
.pp-empty{position:absolute;left:0;right:0;bottom:16%;text-align:center;font-size:12.5px;color:var(--muted)}
.pp-info{margin-top:6px;padding:8px 10px;font-size:12.5px;border-left:3px solid var(--gc)}
.pp-leg{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:8px;font-size:11px;color:var(--muted)}.pp-leg span{display:flex;align-items:center;gap:4px}
.pp-leg i{display:inline-block;width:16px;height:3px;border-radius:2px}.pp-leg i.d{height:0;border-top:2px dashed;background:none}`;
  document.head.appendChild(s);
}
