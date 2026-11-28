// 웹소설 투잡 화면 플러그인. 규약은 engine/jobs/README.md
// 보드: 소문 줄 + 새 작품 기획(장르·소재·주인공·독자층 칩) → 기획 완성도 연출 → 내 작품 카드(조합·단계별 반응·고쳐 쓰기) + 공모전 + 서재(책등) + 작가 노트 + 엔딩 길
import * as WN from "../engine/jobs/webnovel.js";
import * as FX from "../fx.js"; // 읽기만: 소리 설정(get().sound)
const UTAG = '<span class="tag gold" style="font-size:10.5px">업의 이해도 덕분</span>'; // 11-28 이해도 효과가 적용된 자리에 다는 꼬리표

const pct = (x) => `${Math.round(x * 100)}%`;
const n0 = (x) => Math.round(x || 0).toLocaleString();
const sgn = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v);
// data-act 버튼(이유가 있으면 흐리게 + data-why)
function actBtn(c, id, arg, label, cls = "") {
  const why = c.E.canAct(c.S, id, arg), a = c.D.ACTIONS[id];
  return `<button class="btn sm ${cls}" data-act="${id}"${arg !== undefined ? ` data-arg="${c.esc(arg)}"` : ""}${why ? ` data-why="${c.esc(why)}" style="opacity:.5"` : ""}>${c.esc(label)} ⚡${a.ap}</button>`;
}
// 새 CSS 는 모두 wn- 접두사. 한 번만 넣는다
const WN_CSS = `
.wn-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.wn-chip{background:var(--panel2);border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:12.5px;color:var(--fg);min-height:32px;max-width:100%;line-height:1.2}
.wn-chip.on{border-color:var(--gold);background:rgba(245,192,78,.14);color:var(--gold2);font-weight:800}
.wn-chip.lock{opacity:.45}
.wn-chip.life{border-style:dashed;border-color:var(--green)}
.wn-chip.life.on{border-style:solid;border-color:var(--gold)}
.wn-chip small{font-size:10.5px;color:var(--muted);margin-left:3px}
.wn-lab{font-size:12px;color:var(--muted);margin-top:10px;display:flex;gap:6px;align-items:baseline}
.wn-lab b{color:var(--fg);font-size:13px}
.wn-title{width:100%;box-sizing:border-box;background:var(--panel2);border:1px solid var(--gold);border-radius:10px;padding:9px 10px;color:var(--gold2);font-size:15px;font-weight:800;font-family:inherit}
.wn-ed{background:var(--panel2);border-left:3px solid var(--gold);border-radius:6px;padding:7px 9px;font-size:12.5px;margin-top:8px}
.wn-rum{font-size:12.5px;padding:3px 0;color:var(--fg)}
.wn-rum::before{content:"› ";color:var(--muted)}
.wn-cmt{font-size:12.5px;background:var(--panel2);border-radius:8px;padding:5px 8px;margin-top:4px}
.wn-parts{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:12.5px;margin-top:6px}
.wn-parts .v{font-weight:800;text-align:right}
.wn-score{font-size:34px;font-weight:900;color:var(--gold);line-height:1}
.wn-shelf{display:flex;flex-wrap:wrap;align-items:flex-end;gap:3px;padding:8px 6px 0;border-bottom:4px solid var(--panel3);min-height:96px}
.wn-book{writing-mode:vertical-rl;text-orientation:mixed;border:0;border-radius:3px 3px 0 0;padding:6px 3px;font-size:11px;font-weight:700;color:#14162a;width:26px;max-height:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-family:inherit}
.wn-book.drop{opacity:.55;transform:rotate(4deg);transform-origin:bottom left}
.wn-book.rev{box-shadow:0 0 0 2px var(--gold)}
.wn-ov{position:fixed;inset:0;z-index:9999;background:rgba(9,10,22,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 16px;box-sizing:border-box;overflow:auto;color:var(--fg)}
.wn-ov .wn-box{width:100%;max-width:360px;text-align:center}
.wn-ov .wn-cap{font-size:12px;color:var(--muted);letter-spacing:.08em}
.wn-ov .wn-ttl{font-size:16px;font-weight:800;color:var(--gold2);margin:4px 0 14px;word-break:keep-all}
.wn-think{position:relative;height:120px;margin:0 auto 8px;width:200px}
.wn-desk{position:absolute;left:20px;right:20px;bottom:14px;height:6px;border-radius:3px;background:var(--panel3)}
.wn-head{position:absolute;left:50%;bottom:20px;width:44px;height:44px;margin-left:-22px;border-radius:50%;background:var(--panel3);border:2px solid var(--line);animation:wn-shake .28s infinite alternate}
.wn-head::before,.wn-head::after{content:"";position:absolute;top:-8px;width:8px;height:26px;border-radius:4px;background:var(--panel3);border:2px solid var(--line)}
.wn-head::before{left:-6px;transform:rotate(-28deg)} .wn-head::after{right:-6px;transform:rotate(28deg)}
.wn-q{position:absolute;bottom:70px;font-weight:900;color:var(--gold);opacity:0;animation:wn-pop .9s forwards}
.wn-sw{position:absolute;bottom:52px;width:6px;height:9px;border-radius:50% 50% 60% 60%;background:var(--blue);opacity:0;animation:wn-drip .7s infinite}
.wn-ball{position:absolute;bottom:20px;width:16px;height:16px;border-radius:45% 55% 50% 60%;background:#d8d8e6;border:1px dashed #8a8ca6;opacity:0;animation:wn-toss .5s forwards}
.wn-num{font-weight:900;color:var(--gold);line-height:1;transition:font-size .18s,color .18s;font-variant-numeric:tabular-nums}
.wn-num small{font-size:.4em;color:var(--muted);margin-left:2px}
.wn-bar{height:12px;border-radius:7px;background:var(--panel3);overflow:hidden;margin:10px 0 4px;position:relative}
.wn-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width .22s ease-out}
.wn-bar.over i{background:linear-gradient(90deg,var(--gold),#fff,var(--pink))}
.wn-list{min-height:150px;text-align:left;margin-top:8px}
.wn-row{display:flex;justify-content:space-between;font-size:13px;padding:2px 4px;opacity:0;transform:translateY(6px);animation:wn-in .2s forwards}
.wn-row b{font-variant-numeric:tabular-nums}
.wn-row.luck{font-size:15px;font-weight:800;border-top:1px dashed var(--line);margin-top:4px;padding-top:6px}
.wn-row.luck.roll b{color:var(--gold2)}
.wn-word{font-size:24px;font-weight:900;margin-top:10px;opacity:0;transform:scale(.6);animation:wn-burst .35s forwards;word-break:keep-all}
.wn-flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;animation:wn-fl .5s}
.wn-skip{position:fixed;bottom:14px;left:0;right:0;text-align:center;font-size:11.5px;color:var(--muted)}
@keyframes wn-shake{from{transform:translateX(-2px) rotate(-3deg)}to{transform:translateX(2px) rotate(3deg)}}
@keyframes wn-pop{0%{opacity:0;transform:translateY(8px) scale(.5)}40%{opacity:1;transform:translateY(-6px) scale(1.2)}100%{opacity:.85;transform:translateY(-12px) scale(1)}}
@keyframes wn-drip{0%{opacity:0;transform:translateY(0)}30%{opacity:.9}100%{opacity:0;transform:translateY(16px)}}
@keyframes wn-toss{0%{opacity:0;transform:translate(0,-50px) rotate(0)}100%{opacity:1;transform:translate(0,0) rotate(200deg)}}
@keyframes wn-in{to{opacity:1;transform:none}}
@keyframes wn-burst{60%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
@keyframes wn-fl{0%{opacity:.85}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.wn-head,.wn-q,.wn-sw,.wn-ball,.wn-row,.wn-word{animation:none;opacity:1;transform:none}}
`;
function css() { if (typeof document === "undefined" || document.getElementById("wn-css")) return; const el = document.createElement("style"); el.id = "wn-css"; el.textContent = WN_CSS; document.head.appendChild(el); }
const SPINE = ["#f5c04e", "#6aa8ff", "#5fe0a0", "#ff7eb6", "#b48cff", "#ff9f5a", "#9ee0e6", "#e6d39e"];
const hue = (str) => { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return SPINE[h % SPINE.length]; };
const scoreCls = (sc) => (sc > 100 ? "pink" : sc >= 80 ? "gold" : sc >= 55 ? "good" : sc > 35 ? "" : "bad");

// ───────── 소리: WebAudio 로 직접. 게임의 소리 설정이 꺼져 있으면 안 낸다 ─────────
let AC = null;
function soundOn() { try { return !!FX.get().sound; } catch (e) { return false; } }
function tone(f, d = 0.12, type = "triangle", vol = 0.12, at = 0) {
  if (!soundOn() || typeof window === "undefined") return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
    const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) { /* 소리가 안 나도 연출은 간다 */ }
}
const SCALE = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568]; // 한 단계씩 올라가는 음
const ding = (i, down) => { const f = SCALE[Math.min(SCALE.length - 1, i)]; tone(down ? f * 0.5 : f, 0.16, down ? "sine" : "triangle", 0.13); if (!down) tone(f * 2, 0.1, "sine", 0.05, 0.03); };
const tick = () => tone(1800, 0.025, "square", 0.04);
function fanfare(sc) {
  if (sc > 100) { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.28, "triangle", 0.15, i * 0.09)); [1047, 1319, 1568].forEach((f) => tone(f, 0.9, "sawtooth", 0.05, 0.6)); }
  else if (sc >= 80) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, "triangle", 0.14, i * 0.1));
  else if (sc <= 35) [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "sine", 0.12, i * 0.16));
  else tone(659, 0.2, "triangle", 0.1);
}

// ───────── 기획 완성도 연출(화면 전체). 누르면 건너뛴다 ─────────
function planResultHtml(c, p, big) {
  const { esc } = c, P = p.parts || [];
  return `<div class="${big ? "wn-num" : "wn-score"}" ${big ? `style="font-size:${p.score > 100 ? 76 : 64}px;${p.score > 100 ? "color:var(--pink)" : p.score <= 35 ? "color:var(--red)" : ""}"` : ""}>${p.score}<small style="font-size:.4em;color:var(--muted)">점</small></div>
    <div class="${big ? "wn-word" : ""} ${scoreCls(p.score)}" style="${big ? "" : "font-weight:900;font-size:16px;margin-top:4px"}">${esc(WN.scoreWord(p.score))}</div>
    <div class="wn-parts" style="text-align:left">${P.map((x) => `<span class="${x.id === "luck" ? "gold" : "muted"}">${esc(x.n)}</span><span class="v ${x.v > 0 ? "good" : x.v < 0 ? "bad" : "muted"}">${sgn(x.v)}</span>`).join("")}</div>
    <div class="wn-ed" style="text-align:left"><span class="tiny muted">편집자</span><br>"${esc(WN.editorSay(p))}"</div>
    <div class="tiny muted" style="margin-top:6px">완성도 50점이 보통(독자 상한 1배), 80점 1.6배, 100점 2.4배. 지금 이 기획은 약 <b class="gold">${p.mult}배</b>.</div>`;
}
const planBtns = () => `<div class="row" style="margin-top:12px;gap:6px"><button class="btn grow" data-wnscrap>엎고 다시 기획</button><button class="btn gold grow" data-wnstart>이대로 연재 시작</button></div><div class="tiny muted" style="margin-top:4px">엎으면 비축분 절반·피로 +8, 이번 달은 다시 못 짜요.</div>`;
function planActions(c, root, close) {
  const fin = (r) => { close && close(); c.save(); c.render(); if (r?.msg) c.toast([], r.msg); };
  const a = root.querySelector("[data-wnstart]"), b = root.querySelector("[data-wnscrap]");
  if (a) a.onclick = (e) => { e.stopPropagation(); fin(WN.startPlan(c.S)); };
  if (b) b.onclick = (e) => { e.stopPropagation(); fin(WN.scrapPlan(c.S)); };
}
function playReveal(c) {
  const p = c.S.webnovel.plan; if (!p || typeof document === "undefined" || document.querySelector(".wn-ov")) return;
  WN.planSeen(c.S); c.save();
  const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ov = document.createElement("div"); ov.className = "wn-ov";
  const timers = []; let done = false;
  const later = (ms, fn) => timers.push(setTimeout(() => { if (!done) fn(); }, ms));
  const close = () => { done = true; timers.forEach(clearTimeout); ov.remove(); };
  const result = (quiet) => {
    if (done) return; done = true; timers.forEach(clearTimeout);
    ov.innerHTML = `<div class="wn-box"><div class="wn-cap">기획 완성도</div><div class="wn-ttl">'${c.esc(p.title)}'</div>${planResultHtml(c, p, true)}${planBtns()}</div>${p.score > 100 && !reduce ? '<div class="wn-flash"></div>' : ""}`;
    planActions(c, ov, () => ov.remove());
    if (!quiet) fanfare(p.score);
  };
  document.body.appendChild(ov);
  if (reduce) return result(true);
  // 1) 머리를 쥐어뜯는 1초
  ov.innerHTML = `<div class="wn-box"><div class="wn-cap">기획 중…</div><div class="wn-ttl">'${c.esc(p.title)}'</div>
    <div class="wn-think"><div class="wn-desk"></div><div class="wn-head"></div>
      <span class="wn-q" style="left:62px;font-size:20px;animation-delay:.05s">?</span><span class="wn-q" style="left:96px;font-size:28px;animation-delay:.3s">?</span><span class="wn-q" style="left:132px;font-size:18px;animation-delay:.55s">?</span>
      <i class="wn-sw" style="left:68px;animation-delay:.1s"></i><i class="wn-sw" style="left:128px;animation-delay:.4s"></i>
      <i class="wn-ball" style="left:28px;animation-delay:.2s"></i><i class="wn-ball" style="left:44px;bottom:22px;animation-delay:.5s"></i><i class="wn-ball" style="left:150px;animation-delay:.75s"></i><i class="wn-ball" style="left:36px;bottom:34px;animation-delay:.95s"></i></div>
    <div class="tiny muted">${c.esc(WN.comboTag(p))}</div></div><div class="wn-skip">화면을 누르면 건너뛰어요</div>`;
  ov.onclick = (e) => { if (!done && !e.target.closest("button")) result(); };
  [0, 260, 520, 780].forEach((ms) => later(ms, () => tone(180 + Math.random() * 60, 0.05, "square", 0.03))); // 원고지 구기는 소리
  // 2) 요소가 하나씩 더해진다
  later(1150, () => {
    const parts = p.parts.filter((x) => x.id !== "luck"), luck = p.parts.find((x) => x.id === "luck") || { n: "운", v: 0 };
    ov.querySelector(".wn-box").innerHTML = `<div class="wn-cap">기획 완성도</div><div class="wn-ttl">'${c.esc(p.title)}'</div><div class="wn-num" style="font-size:40px">0<small>점</small></div><div class="wn-bar"><i></i></div><div class="wn-list"></div>`;
    const num = ov.querySelector(".wn-num"), bar = ov.querySelector(".wn-bar"), fillEl = bar.querySelector("i"), list = ov.querySelector(".wn-list");
    let cur = 0;
    const show = (v) => { const sv = Math.max(0, v); num.firstChild.nodeValue = String(sv); num.style.fontSize = `${Math.round(40 + Math.min(110, sv) * 0.36)}px`; num.style.color = sv > 100 ? "var(--pink)" : sv <= 20 ? "var(--muted)" : ""; fillEl.style.width = `${Math.min(100, sv)}%`; bar.classList.toggle("over", sv > 100); };
    const STEP = 430;
    parts.forEach((x, i) => later(i * STEP, () => { cur += x.v; show(cur); list.insertAdjacentHTML("beforeend", `<div class="wn-row"><span>${c.esc(x.n)}</span><b class="${x.v > 0 ? "good" : x.v < 0 ? "bad" : "muted"}">${sgn(x.v)}</b></div>`); ding(i, x.v < 0); }));
    // 3) 운 룰렛: 빠르게 돌다 느려지고, 멈춘 뒤 한 박자 쉬었다가 결과
    const t0 = parts.length * STEP + 250;
    later(t0, () => {
      list.insertAdjacentHTML("beforeend", `<div class="wn-row luck roll"><span>${c.esc(luck.n.replace("(신들림)", ""))}</span><b>+?</b></div>`);
      const b = list.querySelector(".luck b"), base = cur; let at = 0, gap = 45;
      for (let k = 0; k < 26; k++) { at += gap; gap = Math.min(260, gap * 1.11); later(at, () => { const v = Math.round(-18 + Math.random() * 60); b.textContent = sgn(v); show(base + v); tick(); }); }
      later(at + 320, () => { b.textContent = sgn(luck.v); b.className = luck.v > 0 ? "good" : luck.v < 0 ? "bad" : "muted"; list.querySelector(".luck").classList.remove("roll"); if (luck.n !== "운") list.querySelector(".luck span").textContent = luck.n; cur = base + luck.v; show(cur); tone(luck.v >= 0 ? 1319 : 220, 0.22, "triangle", 0.14); });
      later(at + 320 + 750, () => { done = false; result(); });
    });
  });
}

export default {
  key: "webnovel", ic: "pen", bg: "library", sjBg: "library", fullBg: "home",
  icons: { wn_new: "spark", wn_scout: "book", wn_write: "pen", wn_plot: "book", wn_reader: "msg", wn_contest: "chart", wn_lunch: "brief", wn_lecture: "mega" },
  tile: (S) => { const W = S.webnovel, w = W?.work; return w ? `${w.ep}화 · 독자 ${n0(w.fans)}` : W?.plan ? `기획 완성도 ${W.plan.score}` : W?.done ? `완결 ${W.done}질` : "새 작품 기획"; },
  side: (S) => `웹소설 Lv${S.webnovel?.lv || 1}`,
  quick: (S) => (S.webnovel?.work ? "wn_write" : null), // 새 작품 기획은 고를 것이 많아 작업실(보드)에서 한다
  defaultArg: (S, id) => (id === "wn_new" ? "plan" : undefined),
  cine: {
    wn_first: ["home", "웹소설"], wn_wall: ["library", "웹소설"], wn_paid: ["desk", "웹소설"], wn_done: ["library", "웹소설"], wn_plag: ["desk", "웹소설"],
    wn_ip: ["gallery", "원작자"], wn_steady: ["desk", "성실한 완결 작가"], wn_ghost: ["home", "20화의 유령"],
  },
  auto(c) { const S = c.S, noNew = /wnplan/.test(location.hash); if (!noNew) { WN.newWork(S, c.E.R(S), "hyun"); S.webnovel.bank = 30; } S.st.write = Math.max(S.st.write, 70); S.hb.joined.includes("write") || S.hb.joined.length >= 2 || c.SJ.hbJoin(S, "write");
    const m = location.hash.match(/f30([a-z]+)/); if (m) setTimeout(() => { const sc = m[1] === "out" ? WN.outSceneTest(c.S, c.E.R(c.S)) : WN.f30Scene(c.S, c.E.R(c.S), m[1]); if (sc) { c.E.openScene(c.S, sc); const pk = location.hash.match(/pick([0-9])/); if (pk) { c.E.choose(c.S, +pk[1]); c.save(); c.render(); } else c.afterRes({}); } }, 900); }, // 장면 시험(#auto3-webnovel-f30deal|f30plag|f30edit|f30out) · 기획 화면 시험(#auto3-webnovel-wnplan)
  page(c) {
    css();
    const { S, esc, won, boardHead, actRow, meter } = c, W = S.webnovel, w = W.work, L = W.last || {};
    const nx = WN.lvNeed(S), lvN = WN.LEVELS[W.lv].n, last = W.hist.at(-1) || 0, working = !(S.co.quit || S.co.fired);
    const head = `${boardHead("webnovel")}<div class="card"><h3>웹소설 <small>Lv${W.lv} ${esc(lvN)}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last > 0 ? "good" : last < 0 ? "bad" : ""}">${won(last)}</div></div>
      <div><div class="k">충성 독자</div><div class="v gold">${n0(w?.fans)}명</div></div>
      <div><div class="k">비축분</div><div class="v ${w && W.bank < W.sched ? "bad" : "good"}">${W.bank}화</div></div></div>
      <div class="row small" style="margin-top:8px"><span>연재 피로</span><span class="grow"></span><b class="${W.tired >= 70 ? "bad" : ""}">${Math.round(W.tired)}/100</b>${W.tired >= 70 ? '<span class="tag red" style="margin-left:4px">품질 −</span>' : ""}</div>
      ${meter(W.tired, 100, W.tired >= 70 ? "var(--red)" : "var(--blue)")}
      ${nx ? `<div class="small" style="margin-top:8px">다음 <b class="gold">Lv${nx.lv} ${esc(nx.n)}</b> · ${esc(nx.need)}</div>${meter(nx.prog, 1, "var(--gold)")}` : `<div class="small good" style="margin-top:8px">최고 단계 IP 작가. 작법 강의가 열렸어요.</div>`}
      <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">연재·유료 전환 규칙 자세히 ▾</summary><div class="tiny muted">필명으로 쓰는 직장인 작가. 매달 연재 주기만큼 비축분이 빠져나가요. 모자라면 펑크, 독자가 빠져요. 50화 + 매니지먼트 계약이면 유료(한 화 100원, 플랫폼·회사 떼고 작가 몫 약 42원). 100화면 완결, 완결작은 인세가 조금씩 계속 들어와요.</div></details></div>`;
    // 독자 게시판 소문(유행 힌트. 열에 일곱만 맞는다)
    const rum = WN.rumors(S);
    const rumor = rum.length ? `<div class="card"><h3>독자 게시판 소문 <small>다 맞지는 않아요</small></h3>${rum.map((x) => `<div class="wn-rum">${esc(x)}</div>`).join("")}</div>` : "";
    const hand = WN.hand(S), lifeK = new Set(hand.life.map((x) => x.k));
    const subChip = (k, on, attr) => `<button class="wn-chip ${on ? "on" : ""} ${lifeK.has(k) ? "life" : ""}" ${attr}="${k}">#${esc(WN.SUBS[k].n)}${lifeK.has(k) ? "<small>내 경험</small>" : ""}</button>`;
    let body;
    if (w) {
      const G = WN.GENRES[w.g] || WN.GENRES.hyun, need = W.sched, lack = Math.max(0, need - W.bank);
      const sched = Object.entries(WN.SCHED).sort((a, b) => (+a[0] || 99) - (+b[0] || 99)).map(([k, v]) => `<button class="btn sm ${+k === W.sched ? "gold" : ""}" data-wnsched="${k}">${v.n}${+k ? ` ${k}화` : ""}</button>`).join("");
      const tr = WN.trendOf(S, w), isNew = w.sc !== undefined;
      // 조합과 단계별 반응
      const stage = isNew ? `<div class="sec" style="margin-top:8px">기획과 반응</div>
        <div class="row small"><span>기획 완성도 <b class="${scoreCls(w.sc)}">${w.sc}점</b> · ${esc(WN.scoreWord(w.sc))}</span><span class="grow"></span>${w.shape ? `<span class="tag ${/대박/.test(w.shape) ? "gold" : /쪽박/.test(w.shape) ? "red" : ""}">${esc(w.shape)}${w.s50 ? "" : "?"}</span>` : `<span class="tag">${w.ep < 5 ? "5화에 첫 반응" : "20화에 윤곽"}</span>`}</div>
        ${tr.hot ? `<div class="tiny good">#${esc(WN.SUBS[w.sub].n)} 유행을 타는 중 · 독자 유입 ×${WN.WN_CH.trend.hot}</div>` : ""}${tr.cold ? `<div class="tiny bad">${esc(G.n)} 장르가 식는 중 · 독자 유입 ×${WN.WN_CH.trend.cold}</div>` : ""}
        ${w.rev ? `<div class="tiny gold">역주행! 독자 상한 ×${w.rev}</div>` : w.steady ? `<div class="tiny muted">꾸준히 쓰는 중 · ${w.rv40 ? (w.rv70 ? "완결 때" : "70화에") : "40화에"} 역주행 판정</div>` : ""}
        ${w.grow > 0 ? `<div class="tiny good">필력으로 만회 중 +${Math.round(w.grow * 100)}%</div>` : ""}${w.lazy ? `<div class="tiny bad">'연중 작가' 딱지: 첫 독자가 줄었어요</div>` : ""}
        ${(w.react || []).length ? `<details ${w.ep < 20 ? "open" : ""}><summary class="tiny muted" style="cursor:pointer">5화 첫 댓글 ▾</summary>${w.react.map((x) => `<div class="wn-cmt">${esc(x)}</div>`).join("")}</details>` : ""}
        <details><summary class="tiny muted" style="cursor:pointer">완성도 내역 ▾</summary><div class="wn-parts">${(w.parts || []).map((x) => `<span class="muted">${esc(x.n)}</span><span class="v ${x.v > 0 ? "good" : x.v < 0 ? "bad" : "muted"}">${sgn(x.v)}</span>`).join("")}</div></details>` : `<div class="tiny muted" style="margin-top:6px">예전 방식으로 시작한 작품이에요(평범 궁합). 다음 작품부터 조합 기획을 해요.</div>`;
      const rwWhy = WN.canRework(S), UF = WN.undFx(S), keepPct = Math.round(WN.reworkKeep(S) * 100); // 11-28 업의 이해도 효과(스위치가 꺼져 있으면 예전 그대로 60%)
      const rwCards = [...hand.rand, ...hand.life.map((x) => x.k)].filter((k) => k !== w.sub), rwHint = (v, t, cls) => { const L = rwCards.filter((k) => WN.reworkHint(S, k) === v); return L.length ? `<span class="${cls}">${t} ${L.map((k) => `#${esc(WN.SUBS[k].n)}`).join(" ")}</span>` : ""; };
      const rw = isNew && !w.rw ? `<details class="more" ${W.rwAsk && !rwWhy ? "open" : ""}><summary>고쳐 쓰기 · 소재 한 장 교체 ▾</summary><div class="more-b"><div class="tiny muted">소재를 바꿔 궁합을 다시 봐요(운과 독자층 결과는 그대로). 독자 ${keepPct}% 유지, 비축분 절반, 한 달 휴재. 작품에 한 번만.${rwWhy ? ` <b class="bad">${esc(rwWhy)}</b>` : ""}</div>
        <div class="wn-chips">${rwCards.map((k) => subChip(k, false, "data-wnrw")).join("")}</div>
        ${UF.pro && w.sc !== undefined && rwCards.length ? `<div class="tiny" style="margin-top:5px;line-height:1.7" data-wnund="rw">${UTAG} 독자 유지 ${Math.round(WN.WN_CH.rework.keep * 100)} → ${keepPct}% · 바꾸면 궁합이 ${[rwHint(1, "나아질 듯", "good"), rwHint(0, "비슷할 듯", "muted"), rwHint(-1, "나빠질 듯", "bad")].filter(Boolean).join(" · ")}</div>` : UF.on && !UF.pro ? `<div class="tiny muted" style="margin-top:5px;opacity:.7">업의 이해도 전문(600점)부터 어느 소재가 나을지 보여요. 지금 ${Math.round(UF.v).toLocaleString()}점</div>` : ""}
        <div class="row" style="margin-top:6px">${actBtn(c, "wn_scout", undefined, "취재 · 카드 다시 뽑기")}</div></div></details>` : "";
      body = `<div class="room"><div class="body">
        <div class="row"><div class="grow" style="min-width:0"><div class="nm">'${esc(w.n)}'</div>
          <div class="tiny"><span class="tag">${esc(G.n)}</span>${isNew ? `<span class="tag">#${esc(WN.SUBS[w.sub]?.n || "")}</span><span class="tag">${esc(WN.PROS[w.pro]?.n || "")}</span><span class="tag">${esc(WN.AUDS[w.aud]?.n || "")}</span>` : ""}${w.paid ? '<span class="tag gold">유료 연재</span>' : '<span class="tag">무료 연재</span>'}${w.mgmt && !w.indie ? '<span class="tag green">매니지먼트</span>' : ""}${WN.DEAL_N[w.deal] ? `<span class="tag gold">${WN.DEAL_N[w.deal]}</span>` : ""}${w.indie ? '<span class="tag">혼자 연재</span>' : ""}${w.cover ? '<span class="tag">표지</span>' : ""}${W.ai ? '<span class="tag blue">AI 도구</span>' : ""}</div></div>
          <div style="text-align:right"><div class="gold" style="font-weight:900">${w.ep}/${w.goal}화</div><div class="tiny muted">${w.paid ? "51화부터 유료" : w.mgmt ? "50화에 유료 전환" : "계약 전"}</div></div></div>
        ${meter(w.ep, w.goal, "var(--gold)")}
        <div class="kv" style="margin-top:6px"><div><div class="k">연독률</div><div class="v ${w.retain < 0.82 ? "bad" : "good"}">${pct(w.retain)}</div></div>
          <div><div class="k">지난달 새 독자</div><div class="v ${(L.newF || 0) < 0 ? "bad" : ""}">${(L.newF || 0) >= 0 ? "+" : ""}${n0(L.newF)}명</div></div>
          <div><div class="k">지난달 연재 수익</div><div class="v">${won(L.rev || 0)}</div></div></div>
        ${w.adv > 0 ? `<div class="small" style="margin-top:6px">선인세 회수 중 <b class="bad">${won(Math.round(w.adv))}</b> 남음 <span class="tiny muted">· 다 갚아야 연재 수익이 들어와요</span></div>` : ""}${w.exT > 0 ? `<div class="tiny gold">메인 배너 노출 ${w.exT}달 남음</div>` : ""}
        ${WN.DEAL_N[w.deal] || w.indie ? `<details style="margin-top:4px"><summary class="tiny muted" style="cursor:pointer">계약 방식 자세히 ▾</summary><div class="tiny muted">독점: 선인세와 메인 배너(6달 노출 ×1.25, 그 뒤 ×1.08). 선인세만큼은 연재 수익에서 먼저 깎여요. 기다리면 무료: 독자 유입 ×1.3, 한 명당 결제 ×0.72. 비독점: 결제 ×1.18, 노출 ×0.9, 업로드 관리 피로 +4/달. 혼자 연재: 작가 몫 55%, 노출 ×0.88, 피로 +3/달, 편집자 없음.</div></details>` : ""}
        ${stage}
        <div class="sec" style="margin-top:8px">연재 주기</div>
        <div class="row wrap" style="gap:4px">${sched}</div>
        <div class="small" style="margin-top:6px">${need ? `이번 달 <b>${need}화</b> 올려요 · 비축 <b class="${lack ? "bad" : "good"}">${W.bank}화</b>${lack ? ` → <b class="bad">${lack}화 모자람(펑크 위험)</b>` : " · 넉넉해요"}` : `휴재 중: 독자가 매달 7%쯤 빠지고, 피로가 크게 풀려요${W.resume ? (W.rwBack ? " · 고쳐 쓰는 중, 다음 달 다시 연재" : ` · 비축 10화가 모이면 다시 연재(지금 ${W.bank}화)`) : ""}`}</div>
        <details><summary class="tiny muted" style="cursor:pointer">주기별 차이 자세히 ▾</summary><div class="tiny muted">주 5회는 노출 +22%지만 피로·멘탈이 크게 깎여요. 회사 다니면서 주 5회면 매달 스태미너 −3.</div></details>
        <div class="row wrap" style="margin-top:8px;gap:4px">${actBtn(c, "wn_write", undefined, `원고 쓰기 +${WN.writeEps(S)}화`, "gold")}${actBtn(c, "wn_plot", undefined, "플롯 다듬기")}${actBtn(c, "wn_reader", undefined, "독자 소통")}</div>
        <div class="row wrap" style="margin-top:6px;gap:4px"><button class="btn sm" data-wnai="1">${W.ai ? "AI 도구 해지" : "AI 도구 월 5만"}</button>${w.cover ? "" : `<button class="btn sm" data-wncover="1">표지 15만</button>`}${w.ep >= 80 && w.goal > w.ep ? `<button class="btn sm" data-wnfin="1">조기 완결</button>` : ""}</div>
        ${rw}
        <details class="more"><summary>접고 새로 쓰기 · 더 보기 ▾</summary><div class="more-b"><div class="row"><span class="grow tiny muted">지금 작품을 접어요. 독자의 20~35%가 다음 작품으로 따라와요${W.drops >= WN.WN_CH.drop.lazyFrom - 1 ? " · 또 접으면 '연중 작가' 딱지" : ""}. 누르면 한 번 더 물어봐요.</span><button class="btn sm danger" data-wndrop="1">연재 중단</button></div></div></details>
      </div></div>`;
    } else if (W.plan) {
      const p = W.plan;
      body = `<div class="card"><h3>기획 완성도 <small>'${esc(p.title)}'</small></h3><div class="tiny muted">${esc(WN.comboTag(p))}</div>
        <div style="text-align:center;margin-top:8px">${planResultHtml(c, p, false)}</div>${planBtns()}</div>`;
    } else {
      const d = WN.draftOf(S), lockWhy = c.E.canAct(S, "wn_new", "plan");
      const chips = (obj, cur, attr, lab) => Object.entries(obj).map(([k, v]) => `<button class="wn-chip ${k === cur ? "on" : ""}" ${attr}="${k}" title="${esc(v.tip || "")}">${esc(lab ? lab(k, v) : v.n)}</button>`).join("");
      const G = WN.GENRES[d.g], ga = G.aud;
      body = `<div class="card"><h3>새 작품 기획 <small>네 가지를 골라요</small></h3>
        <div class="tiny muted">${W.carry ? `접은 작품 독자 ${n0(W.carry)}명이 따라와요.` : W.pen ? `필명 팬 ${n0(W.pen)}명 중 절반이 새 작품으로 따라와요.` : "필명 팬 0명. 1화부터 맨땅이에요."} 어떤 조합이 터질지는 이번 인생에서 써 봐야 알아요.</div>
        <div class="wn-lab"><b>큰 장르</b><span>${esc(G.tip)}</span></div>
        <div class="wn-chips">${Object.entries(WN.GENRES).map(([k, v]) => { const open = WN.genreOpen(S, k); return `<button class="wn-chip ${k === d.g ? "on" : ""} ${open ? "" : "lock"}" ${open ? `data-wng="${k}"` : `data-wnlock="Lv${v.lv} ${esc(WN.LEVELS[v.lv].n)}부터 열려요"`}>${esc(v.n)}${open ? "" : `<small>Lv${v.lv}</small>`}</button>`; }).join("")}</div>
        <div class="tiny muted" style="margin-top:3px">속도 ${"●".repeat(Math.max(1, Math.round(G.rate * 14)))} · 크기 ${"●".repeat(Math.max(1, Math.round(G.cap * 4)))} · 기본 독자층 ${ga === "m" ? "남성향" : ga === "f" ? "여성향" : "가리지 않음"}</div>
        <div class="wn-lab"><b>세부 장르·소재</b><span>이번에 떠오른 ${hand.rand.length + hand.life.length}장</span></div>
        <div class="wn-chips">${hand.rand.map((k) => subChip(k, k === d.sub, "data-wns")).join("")}${hand.life.map((x) => subChip(x.k, x.k === d.sub, "data-wns")).join("")}</div>
        ${hand.life.length ? `<div class="tiny good" style="margin-top:3px">내 경험 카드: ${hand.life.map((x) => `#${esc(WN.SUBS[x.k].n)}(${esc(x.why)})`).join(" · ")} · 겪어 본 소재는 완성도가 올라요</div>` : ""}
        <div class="row" style="margin-top:6px">${actBtn(c, "wn_scout", undefined, "취재 · 카드 다시 뽑기")}${W.scouted ? '<span class="tiny good" style="margin-left:6px">취재해 둠 · 완성도 +</span>' : ""}</div>
        <div class="wn-lab"><b>주인공</b><span>${esc(WN.PROS[d.pro].tip)}</span></div>
        <div class="wn-chips">${chips(WN.PROS, d.pro, "data-wnp")}</div>
        <div class="wn-lab"><b>노리는 독자</b><span>${d.aud === "b" ? "터지면 크고, 어중간해지기 쉬워요" : ga !== "x" && d.aud !== ga ? "역발상: 대부분 손해, 드물게 크게 터져요" : "무난한 선택"}</span></div>
        <div class="wn-chips">${chips(WN.AUDS, d.aud, "data-wna")}</div>
        <div class="wn-lab"><b>제목</b><span>고쳐 써도 돼요</span></div>
        <div class="row" style="gap:6px"><input class="wn-title grow" data-wntitle maxlength="40" value="${esc(d.title)}"><button class="btn sm" data-wnti="${d.ti + 1}">다른 제목</button></div>
        <div class="wn-ed"><span class="tiny muted">편집자</span><br>"${esc(WN.editorHint(S, d))}"</div>
        ${(() => { const U = WN.undFx(S), h = WN.readerHint(S, d); return h ? `<div class="wn-ed" data-wnund="plan"><span class="tiny muted">독자 반응 예고</span> ${UTAG}<br><b class="${h.lv === "bad" ? "bad" : h.lv === "good" ? "good" : ""}">${esc(h.text)}</b></div>` : U.on ? `<div class="tiny muted" style="margin-top:6px;opacity:.7">업의 이해도 숙련(300점)부터 확정하기 전에 독자 반응 예고가 보여요. 지금 ${Math.round(U.v).toLocaleString()}점</div>` : ""; })()}
        <div class="row" style="margin-top:10px"><button class="btn gold grow" data-act="wn_new" data-arg="plan"${lockWhy ? ` data-why="${esc(lockWhy)}" style="opacity:.5"` : ""}>기획 확정 ⚡1</button></div>
        <div class="tiny muted" style="margin-top:4px">확정하면 기획 완성도가 나와요. 조합 궁합이 절반, 그다음이 운, 그리고 필력·경험·유행·컨디션.</div></div>`;
    }
    // 공모전·투고·점심·강의
    const mx = Math.max(...WN.SEASON);
    const onC = WN.CONTEST_M.includes(S.cal), nextC = WN.CONTEST_M.find((m) => m > S.cal) || WN.CONTEST_M[0];
    const contest = `<div class="card"><h3>노블리 공모전 <small>지금 ${S.cal}월 · ${onC ? '<b class="gold">시즌 중</b>' : `다음 ${nextC}월`}</small></h3>
      <details><summary class="tiny muted" style="cursor:pointer">공모전 5·6·10·11월 · 읽는 양 차트 ▾</summary>
      <div class="season" style="height:36px">${WN.SEASON.map((v, i) => `<i class="${i + 1 === S.cal ? "now" : ""} ${WN.CONTEST_M.includes(i + 1) ? "pk" : ""}" style="height:${Math.round(v / mx * 100)}%"></i>`).join("")}</div>
      <div class="season-l" style="font-size:11px">${WN.SEASON.map((_, i) => `<span>${i + 1}</span>`).join("")}</div>
      <div class="tiny muted" style="margin-top:4px">막대 = 독자가 읽는 양(방학·연휴에 많이 읽어요). 진한 달 = 공모전 시즌(5·6·10·11월). 참가하면 두 달 노출 ×1.5, 수상하면 상금 100~500만 + 매니지먼트 계약. 시즌이 아니면 매니지먼트에 투고(30화부터).</div></details></div>
      <div class="acts" style="padding:0">${actRow("wn_contest")}${working ? actRow("wn_lunch") : ""}${W.lv >= 5 ? actRow("wn_lecture") : ""}</div>`;
    // 내 서재: 책등으로 쌓인다
    const tails = W.works.reduce((a, x) => a + (x.tail || 0), 0), from = Math.max(0, W.works.length - 28);
    const shelf = W.works.length || W.ip ? `<div class="card"><h3>내 서재 <small>완결 ${W.done}질 · 유료 ${W.paidDone}질${(W.awards || []).length ? ` · 수상 ${W.awards.length}` : ""}</small></h3>
      <div class="wn-shelf">${W.works.slice(from).map((x, i) => `<button class="wn-book ${x.done ? "" : "drop"} ${x.rev ? "rev" : ""}" data-wnbook="${from + i}" style="background:${hue(x.n)};height:${Math.round(60 + Math.min(60, Math.sqrt(x.peak || 0) * 1.6))}px" title="${esc(x.n)}">${esc(x.n)}</button>`).join("")}</div>
      <div class="tiny muted" style="margin-top:6px">책등을 누르면 성적이 나와요. 기울어진 책 = 접은 작품, 금테 = 역주행. 완결작 인세 합계 월 ${won(Math.round(tails))}(매달 4%씩 줄어요)${W.ip ? ` · 2차 판권 ${W.ip}건${W.ipPay.left ? `, 원작료 월 ${won(W.ipPay.amt)} × ${W.ipPay.left}개월 남음` : ""}` : ""}</div>
      ${(W.awards || []).length ? `<div class="tiny gold" style="margin-top:4px">${W.awards.slice(-4).map((a) => `${a.y} ${esc(a.n)}`).join(" · ")}</div>` : ""}</div>` : "";
    // 작가 노트: 이번 인생에서 써 본 조합과 완성도
    const notes = (W.note || []).slice(-12).reverse();
    const note = notes.length ? `<div class="card"><details><summary style="cursor:pointer;list-style:none;min-height:40px;display:flex;align-items:center"><h3 style="display:inline;margin:0">작가 노트 <small>써 본 조합 ${W.note.length}개 · 자세히 ▾</small></h3></summary>
      <div class="tiny muted" style="margin:4px 0">이번 인생의 궁합표는 이번 인생에만 통해요. 궁합 점수가 높았던 짝을 기억해 두세요.</div>
      ${notes.map((x) => `<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)"><b class="${scoreCls(x.sc)}">${x.sc}점</b> ${esc(WN.GENRES[x.g]?.n || "")} × #${esc(WN.SUBS[x.sub]?.n || "")} × ${esc(WN.PROS[x.pro]?.n || "")}${x.rw ? ' <span class="tag">고쳐 씀</span>' : ""}
        <div class="tiny muted">장르 궁합 <b class="${x.gf >= 20 ? "good" : x.gf <= 2 ? "bad" : ""}">${sgn(x.gf)}</b> · 주인공 궁합 <b class="${x.pf >= 12 ? "good" : x.pf <= 1 ? "bad" : ""}">${sgn(x.pf)}</b> · ${esc(WN.AUDS[x.aud]?.n || "")} <b class="${x.av >= 10 ? "good" : x.av < 0 ? "bad" : ""}">${sgn(x.av)}</b> · '${esc(x.n)}'</div></div>`).join("")}</details></div>` : "";
    // 엔딩 길 3개
    const ghostLeft = W.t0 === null || W.t0 === undefined ? 36 : Math.max(0, 36 - (S.t - W.t0));
    const ends = `<div class="card"><details><summary style="cursor:pointer;list-style:none;min-height:40px;display:flex;align-items:center"><h3 style="display:inline;margin:0">작가의 길 <small>엔딩 3개 · 자세히 ▾</small></h3></summary><div style="margin-top:6px">
      <div class="small"><b class="${W.ip ? "good" : "gold"}">원작자</b> · 2차 판권(웹툰화) 계약 1건 <span class="tiny muted">${W.ip ? "달성" : W.lv >= 4 ? "완결작이 커지면 제안이 와요" : "Lv4 완결 작가부터 제안"}</span></div>
      <div class="small" style="margin-top:4px"><b class="${W.done >= 3 && working ? "good" : "gold"}">성실한 완결 작가</b> · 완결 3질 + 회사 유지 <span class="tiny muted">${Math.min(3, W.done)}/3질${working ? "" : " · 회사를 나왔어요"}</span></div>
      <div class="small" style="margin-top:4px"><b class="${W.maxEp >= 20 ? "muted" : "bad"}">20화의 유령</b> · 3년 동안 20화를 못 넘김 <span class="tiny muted">${W.maxEp >= 20 ? "벗어났어요" : `${ghostLeft}개월 남음 · 지금 최대 ${W.maxEp}화`}</span></div>
      <div class="tiny muted" style="margin-top:6px">연재를 시작한 작가 열에 예닐곱은 10화도 못 채워요. 연 3천만 원 넘게 버는 작가는 5%가 안 돼요.</div></div></details></div>`;
    return head + rumor + body + contest + shelf + note + ends;
  },
  bind(c) {
    const done = (msg) => { c.save(); c.render(); if (msg) c.toast([], msg); };
    const W = c.S.webnovel;
    c.q("[data-wnsched]", (el) => { WN.setSched(c.S, +el.dataset.wnsched); done(`연재 주기: ${WN.SCHED[+el.dataset.wnsched].n}`); });
    c.q("[data-wnai]", () => { const on = WN.toggleAi(c.S); done(on ? "AI 집필 도구 구독(월 5만): 원고 +25%" : "AI 도구 해지"); });
    c.q("[data-wncover]", () => { const r = WN.buyCover(c.S); done(r.msg); });
    c.q("[data-wnfin]", () => { const r = WN.finishNow(c.S); done(r.msg); });
    c.q("[data-wndrop]", () => c.openWin(`<h2>연재를 중단할까요? <button class="x" data-close>✕</button></h2><div class="small">'${c.esc(c.S.webnovel.work?.n || "")}' ${c.S.webnovel.work?.ep || 0}화에서 멈춰요. 비축분은 버리고, 독자의 20~35%만 다음 작품으로 따라와요. 서재에는 기울어진 책으로 남아요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>계속 쓴다</button><button class="btn danger grow" data-wnyes>중단한다</button></div>`, (w) => { w.querySelector("[data-wnyes]").onclick = () => { const r = WN.dropWork(c.S); c.closeWin(); done(r.msg); }; }));
    // 기획 칩
    c.q("[data-wng]", (el) => { WN.setDraft(c.S, { g: el.dataset.wng, aud: "" }); done(); });
    c.q("[data-wns]", (el) => { WN.setDraft(c.S, { sub: el.dataset.wns }); done(); });
    c.q("[data-wnp]", (el) => { WN.setDraft(c.S, { pro: el.dataset.wnp }); done(); });
    c.q("[data-wna]", (el) => { WN.setDraft(c.S, { aud: el.dataset.wna }); done(); });
    c.q("[data-wnti]", (el) => { WN.setDraft(c.S, { ti: +el.dataset.wnti }); done(); });
    c.q("[data-wnlock]", (el) => c.toast([], el.dataset.wnlock));
    if (typeof document !== "undefined") document.querySelectorAll("[data-wntitle]").forEach((el) => { el.onclick = (e) => e.stopPropagation(); el.onchange = () => { WN.setDraft(c.S, { title: el.value.trim().slice(0, 40) }); c.save(); }; });
    // 고쳐 쓰기
    c.q("[data-wnrw]", (el) => { const why = WN.canRework(c.S); if (why) return c.toast([], why); const k = el.dataset.wnrw;
      c.openWin(`<h2>고쳐 쓸까요? <button class="x" data-close>✕</button></h2><div class="small">소재를 <b class="gold">#${c.esc(WN.SUBS[k].n)}</b>(으)로 바꿔요. 제목도 바뀌어요. 독자 ${Math.round(WN.reworkKeep(c.S) * 100)}% 유지, 비축분 절반, 한 달 휴재. 이 작품에서는 한 번만 할 수 있어요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>그만둔다</button><button class="btn gold grow" data-wnyes>고쳐 쓴다</button></div>`, (w) => { w.querySelector("[data-wnyes]").onclick = () => { const r = WN.rework(c.S, k); c.closeWin(); if (r.ok) { c.S.webnovel.rwAsk = 0; fanfare(r.to >= r.from ? Math.max(60, r.to) : 30); } done(r.msg); }; }); });
    // 서재 책등
    c.q("[data-wnbook]", (el) => { const x = c.S.webnovel.works[+el.dataset.wnbook]; if (!x) return;
      c.openWin(`<h2>'${c.esc(x.n)}' <button class="x" data-close>✕</button></h2>
        <div class="tiny"><span class="tag ${x.done ? "green" : "red"}">${x.done ? "완결" : "연중"}</span>${x.paid ? '<span class="tag gold">유료</span>' : ""}${x.rev ? '<span class="tag gold">역주행</span>' : ""}</div>
        <div class="small" style="margin-top:6px">${c.esc(WN.comboTag(x))}</div>
        <div class="kv" style="margin-top:8px"><div><div class="k">화수</div><div class="v">${x.ep}화</div></div><div><div class="k">최고 독자</div><div class="v gold">${n0(x.peak)}명</div></div><div><div class="k">번 돈</div><div class="v">${c.won(x.earn || 0)}</div></div></div>
        <div class="kv" style="margin-top:6px"><div><div class="k">평점</div><div class="v">${x.star ? `★${x.star}` : "–"}</div></div><div><div class="k">기획 완성도</div><div class="v">${x.sc !== undefined && x.sc !== null ? `${x.sc}점` : "–"}</div></div><div><div class="k">지금 인세</div><div class="v">${x.tail ? `월 ${c.won(Math.round(x.tail))}` : "–"}</div></div></div>
        ${x.line ? `<div class="wn-cmt" style="margin-top:8px"><span class="tiny muted">독자 한 줄 평</span><br>${c.esc(x.line)}</div>` : ""}`); });
    // 기획 결과 카드(연출을 이미 본 뒤)와 완성도 연출
    if (typeof document !== "undefined") { const card = document.querySelector("[data-wnstart]")?.closest(".card"); if (card) planActions(c, card); }
    if (W.plan && !W.plan.seen && !c.S.pending) playReveal(c);
  },
};
