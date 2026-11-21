// After 6PM v4.25 · 성장 카드 고르기 · 카드팩 · 가방 화면
// ui.js 가 dctx()(S·save·render·toast·openWin·closeWin·esc·won) + E(엔진)를 넘긴다.
// - pickWin(ctx, next): S.gc.offers 맨 앞 카드 묶음을 뒤집어 보여 주고 1장 고르게 한다. 다 고르면 next()
// - bagWin(ctx): 가방(종류별 칸·모은 개수·세트 효과·상점·소모품 쓰기·내 카드·카드팩)
// - 광고 무료 팩: 실제 광고 연동 전이라 '광고 자리' 상자만 보여 준다. 하루 1개는 실제 날짜(localStorage, 실패해도 동작)
import * as GC from "./engine/cards.js";
import * as IT from "./engine/items.js";

const AD_KEY = "a6_adpack_day";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function adUsed() { try { return localStorage.getItem(AD_KEY) === today(); } catch (e) { return false; } }
function adMark() { try { localStorage.setItem(AD_KEY, today()); } catch (e) {} }
const GCOL = { c: "#9aa3b5", r: "#5aa8ff", h: "#b67bff", l: "#ffc43d" };
const CAT_IC = { gear: "🛠", final: "👑", memo: "💌", cons: "🧃", life: "🎒" };
const SRC_T = { year: ["연말 성장 카드", "올해를 마치며 카드 한 장을 골라요"], shard: ["조각 5개 완성", "모은 조각으로 카드 한 장을 골라요"], pack: ["카드팩", "다섯 장 중 한 장을 골라요"], ad: ["무료 카드팩", "다섯 장 중 한 장을 골라요"], test: ["카드", "한 장을 골라요"] };

function css() {
  if (document.getElementById("gccss")) return;
  const s = document.createElement("style"); s.id = "gccss";
  s.textContent = `.gc-h{font-size:12px;color:var(--muted,#9aa0b8);margin:2px 0 10px;line-height:1.5;word-break:keep-all}
.gc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;perspective:800px}
.gc-card{position:relative;font:inherit;color:#fff;text-align:left;border-radius:14px;padding:10px 8px 9px;min-height:150px;display:flex;flex-direction:column;gap:5px;cursor:pointer;border:2px solid var(--gc);background:linear-gradient(170deg,color-mix(in srgb,var(--gc) 30%,#151a2c),#11141f 70%);box-shadow:0 4px 14px #0006;animation:gcFlip .55s cubic-bezier(.2,.8,.3,1.2) both;transform-origin:50% 50%;overflow:hidden}
.gc-card:active{transform:scale(.97)}
.gc-card.l{box-shadow:0 0 18px #ffc43d88,0 4px 14px #0006}.gc-card.l::after{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,#fff0,#fff4,#fff0 30%);animation:gcSpin 3s linear infinite;pointer-events:none;mix-blend-mode:overlay}
.gc-card.h{box-shadow:0 0 12px #b67bff66,0 4px 14px #0006}
@keyframes gcFlip{0%{transform:rotateY(180deg) scale(.85);opacity:0;filter:brightness(2.5)}55%{opacity:1}100%{transform:none;filter:none}}@keyframes gcSpin{to{transform:rotate(1turn)}}
.gc-g{font-size:11px;font-weight:800;color:var(--gc);letter-spacing:.04em}.gc-ic{font-size:26px;line-height:1}
.gc-n{font-size:14px;font-weight:800;line-height:1.25;word-break:keep-all}.gc-d{font-size:11.5px;line-height:1.4;color:#cfd4ea;word-break:keep-all;flex:1}
.gc-lv{position:absolute;top:7px;right:7px;font-size:11px;font-weight:800;background:#000a;border-radius:999px;padding:1px 6px;color:#ffd25e}
.gc-res{margin-top:12px;border-radius:12px;padding:12px;background:#ffffff0d;font-size:13px;line-height:1.6}.gc-res b{color:var(--gold,#ffd25e)}
.gc-luck{display:inline-block;font-size:11px;font-weight:800;color:#2a1a00;background:var(--gold,#ffd25e);border-radius:999px;padding:1px 8px;margin-left:4px}
.bag-top{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}.bag-top div{background:#ffffff0b;border-radius:10px;padding:8px;text-align:center}.bag-top b{display:block;font-size:17px}.bag-top span{font-size:11px;color:var(--muted,#9aa0b8)}
.bag-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:4px;margin:6px 0 8px;scrollbar-width:none}.bag-tabs button{flex:0 0 auto;font:inherit;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #ffffff26;background:none;color:inherit;cursor:pointer}.bag-tabs button.on{background:var(--gold,#ffd25e);color:#2a1a00;border-color:transparent;font-weight:800}
.bag-l{display:flex;flex-direction:column;gap:6px}.bag-i{display:flex;align-items:center;gap:8px;background:#ffffff0a;border-radius:12px;padding:8px 10px}.bag-i.no{opacity:.55}
.bag-i .ic{font-size:20px;width:26px;text-align:center;flex:0 0 auto}.bag-i .tx{flex:1;min-width:0}.bag-i .tx b{font-size:13px;display:block;word-break:keep-all}.bag-i .tx span{font-size:11.5px;color:var(--muted,#9aa0b8);display:block;line-height:1.4;word-break:keep-all}
.bag-i button{flex:0 0 auto;font:inherit;font-size:12px;font-weight:700;padding:7px 10px;border-radius:10px;border:0;background:var(--gold,#ffd25e);color:#2a1a00;cursor:pointer}.bag-i button:disabled{background:#ffffff1a;color:#ffffff80;cursor:default}
.bag-i em{font-style:normal;font-size:11px;color:#7fe3a5;flex:0 0 auto}
.bag-set{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.bag-set div{border-radius:10px;padding:7px 9px;background:#ffffff08;border:1px solid #ffffff14;font-size:11.5px;line-height:1.4;word-break:keep-all}.bag-set div.on{border-color:#7fe3a5;background:#7fe3a514}.bag-set b{font-size:12px;display:block}
.bag-pack{border-radius:14px;padding:12px;margin:8px 0;background:linear-gradient(135deg,#5aa8ff22,#b67bff22,#ffc43d22);border:1px solid #ffffff22}.bag-pack .row2{display:flex;gap:6px;margin-top:8px}.bag-pack .row2 button{flex:1;font:inherit;font-size:13px;font-weight:800;padding:10px 6px;border-radius:12px;border:0;cursor:pointer;background:var(--gold,#ffd25e);color:#2a1a00}.bag-pack .row2 button.ad{background:#ffffff1c;color:#fff}.bag-pack .row2 button:disabled{opacity:.45;cursor:default}
.bag-mini{font-size:11.5px;color:var(--muted,#9aa0b8);line-height:1.5;word-break:keep-all}
.ad-box{border:1px dashed #ffffff44;border-radius:14px;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:16px;background:#ffffff06}.ad-box b{font-size:13px;color:var(--gold,#ffd25e)}.ad-box span{font-size:12px;color:var(--muted,#9aa0b8)}
.ad-bar{width:80%;height:6px;border-radius:4px;background:#ffffff14;overflow:hidden}.ad-bar i{display:block;height:100%;width:0;background:var(--gold,#ffd25e);transition:width 2.4s linear}`;
  document.head.appendChild(s);
}
function faceOf(e) {
  if (e.k === "i") { const x = IT.BY[e.id]; return { g: e.g, ic: CAT_IC[x.cat] || "🎁", n: x.n, d: x.d, tag: x.cat === "final" ? "최종 아이템" : IT.CAT[x.cat] }; }
  const c = GC.BY[e.id]; return { g: c.g, ic: { c: "🎴", r: "💠", h: "🔮", l: "🌟" }[c.g], n: c.n, d: c.d, tag: GC.GRADE[c.g] + " 카드" };
}

// 카드 고르기 창. next: 다 고른 뒤 부를 함수
export function pickWin(ctx, next) {
  css();
  const { S, esc, save, openWin, closeWin } = ctx;
  const o = S.gc?.offers?.[0]; if (!o) return next && next();
  const [ttl, sub] = SRC_T[o.src] || SRC_T.test;
  const own = S.gc.own || {};
  const cards = o.list.map((e, i) => { const f = faceOf(e), lv = e.k === "c" ? own[e.id] || 0 : 0; return `<button class="gc-card ${f.g}" style="--gc:${GCOL[f.g]};animation-delay:${0.12 + i * 0.18}s" data-pick="${i}"><span class="gc-g">${esc(f.tag)}</span><span class="gc-ic">${f.ic}</span><span class="gc-n">${esc(f.n)}</span><span class="gc-d">${esc(f.d)}</span>${lv ? `<span class="gc-lv">${lv + 1}단계↑</span>` : e.k === "i" && IT.owned(S, e.id) && IT.BY[e.id].cat !== "cons" ? `<span class="gc-lv">조각</span>` : ""}</button>`; }).join("");
  openWin(`<h2>${esc(ttl)}${o.src === "year" && o.luck >= 0.35 ? `<span class="gc-luck">성적 보너스</span>` : ""}</h2>
    <div class="gc-h">${esc(sub)}. 같은 카드를 또 고르면 한 단계 강해져요(최대 3단계).${o.src === "year" ? " 올해 성적이 좋을수록 희귀 이상이 잘 나와요." : ""}${S.gc.offers.length > 1 ? ` 남은 카드 묶음 ${S.gc.offers.length - 1}개.` : ""}</div>${o.note ? `<div class="gc-res" style="margin:0 0 10px">💌 ${esc(o.note)}</div>` : ""}
    <div class="gc-grid">${cards}</div><div data-gcres></div>`, (w) => {
    w.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => {
      const r = GC.pick(S, 0, +b.dataset.pick); save();
      try { ctx.FX?.play("ok"); } catch (e) {}
      w.querySelectorAll("[data-pick]").forEach((x) => { x.disabled = true; if (x !== b) x.style.opacity = ".35"; });
      w.querySelector("[data-gcres]").innerHTML = `<div class="gc-res"><b>${esc(r.lines[0] || "")}</b>${r.lines.slice(1).map((l) => `<div>${esc(l)}</div>`).join("")}</div><button class="btn gold" style="width:100%;margin-top:10px;padding:12px" data-ok>${S.gc.offers.length ? "다음 카드 묶음" : "확인"}</button>`;
      w.querySelector("[data-ok]").onclick = () => { closeWin(); if (S.gc.offers.length) pickWin(ctx, next); else { ctx.render?.(); next && next(); } };
    });
  }, true, true);
}

// 광고 자리(실제 광고 연동 전). 끝나면 done()
function adWin(ctx, done) {
  css();
  ctx.openWin(`<h2>광고 보고 무료 카드팩</h2><div class="ad-box" data-adbox><b>광고 자리</b><span>여기에 광고가 들어갈 예정이에요. 지금은 잠깐 기다리면 팩이 열려요.</span><div class="ad-bar"><i></i></div></div><button class="btn" style="width:100%;margin-top:10px" data-adx>그만두기</button>`, (w) => {
    let alive = true; w.querySelector("[data-adx]").onclick = () => { alive = false; ctx.closeWin(); bagWin(ctx); };
    // 나중에 광고 SDK: if (window.ADS?.ready) return window.ADS.rewarded({ slot: "card_pack" }).then(ok => ok && done());
    requestAnimationFrame(() => { const bar = w.querySelector(".ad-bar i"); if (bar) bar.style.width = "100%"; });
    setTimeout(() => { if (alive && w.querySelector("[data-adbox]")) done(); }, 2500);
  }, true, true);
}
function packOpen(ctx, free) {
  const { S, E, save, toast } = ctx;
  const res = GC.openPack(S, E.R(S), { free }, { creditRoom: E.creditRoom(S), addMoney: E.addMoney });
  if (!res.ok) { toast([], res.msg); return bagWin(ctx); }
  if (free) adMark();
  save(); pickWin(ctx, () => bagWin(ctx));
}

// 가방
export function bagWin(ctx, tab0) {
  css();
  const { S, E, esc, won, save, toast, openWin, closeWin } = ctx;
  GC.ensure(S);
  let tab = tab0 || "gear";
  const draw = () => {
    const B = IT.bagInfo(S), g = S.gc, act = new Set(S.sj?.active || []);
    const tabs = [["gear", "장비"], ["final", "최종"], ["memo", "기념품"], ["cons", "소모품"], ["life", "생활"], ["cards", "카드"], ["sets", "세트"]];
    const cnt = (k) => k === "cards" ? Object.keys(g.own).length : k === "sets" ? B.sets.filter((x) => x.on).length : B.cats[k].have;
    const all = (k) => k === "cards" ? GC.CARDS.length : k === "sets" ? B.sets.length : B.cats[k].all;
    let body = "";
    if (tab === "cards") {
      const my = GC.myCards(S);
      body = my.length ? `<div class="bag-l">${my.map((c) => `<div class="bag-i"><span class="ic" style="color:${GCOL[c.g]}">${{ c: "🎴", r: "💠", h: "🔮", l: "🌟" }[c.g]}</span><div class="tx"><b>${esc(c.n)} <span style="display:inline;color:${GCOL[c.g]}">${GC.GRADE[c.g]}${c.lv > 1 ? ` · ${c.lv}단계` : ""}</span></b><span>${esc(c.d)}${c.lv > 1 && c.m ? ` (효과 ${(1 + 0.25 * (c.lv - 1)).toFixed(2)}배)` : ""}</span></div></div>`).join("")}</div>` : `<div class="bag-mini">아직 카드가 없어요. 연말 결산, 이벤트 조각 5개, 카드팩으로 모아요.</div>`;
      body += `<div class="bag-mini" style="margin-top:8px">일반 ${GC.COUNT.c} · 희귀 ${GC.COUNT.r} · 영웅 ${GC.COUNT.h} · 전설 ${GC.COUNT.l}장. 뽑힐 확률 일반 60% · 희귀 28% · 영웅 10% · 전설 2%.${g.guard ? ` 번아웃 막기 ${g.guard}번 남음.` : ""}</div>`;
    } else if (tab === "sets") {
      body = `<div class="bag-mini" style="margin-bottom:6px">한 투잡의 장비 2개를 다 모으면 세트 효과가 생겨요.</div><div class="bag-set">${B.sets.map((x) => `<div class="${x.on ? "on" : ""}"><b>${esc(x.jn)} · ${esc(x.n)}</b>${x.have}/${x.need} · ${esc(x.d)}${x.on ? " ✓" : ""}</div>`).join("")}</div>`;
    } else {
      let list = B.cats[tab].list;
      if (tab === "gear") list = list.slice().sort((a, b) => (act.has(b.job) - act.has(a.job)) || (b.own - a.own));
      body = `<div class="bag-l">${list.map((x) => {
        const jn = x.job ? `${IT.jobN(x.job)} · ` : "";
        let right;
        if (x.cat === "cons") right = x.cnt ? `<button data-use="${x.id}">쓰기 ×${x.cnt}</button>` : x.price != null ? `<button data-buy="${x.id}">${won(x.price)}</button>` : `<em>선물·보상</em>`;
        else if (x.own) right = `<em>갖고 있음</em>`;
        else if (x.cat === "memo") right = `<em style="color:var(--muted,#9aa0b8)">이벤트</em>`;
        else right = `<button data-buy="${x.id}">${won(x.price)}</button>`;
        return `<div class="bag-i ${x.own || x.cnt ? "" : "no"}"><span class="ic">${x.cat === "memo" && !x.own ? "❔" : CAT_IC[x.cat]}</span><div class="tx"><b>${x.cat === "memo" && !x.own ? "???" : esc(x.n)}</b><span>${esc(jn)}${x.cat === "memo" && !x.own ? "이벤트에서 좋은 선택을 하면 얻어요" : esc(x.d)}</span></div>${right}</div>`;
      }).join("")}</div>`;
      if (tab === "final") body = `<div class="bag-mini" style="margin-bottom:6px">투잡 하나를 크게 바꾸지만 비싸요. 지금 살까, 모아서 파이어할까? 카드팩 전설 칸에서도 가끔 나와요.</div>` + body;
      if (tab === "gear") body = `<div class="bag-mini" style="margin-bottom:6px">하는 투잡 장비가 위에 있어요. 이벤트·라이벌 승부·미니게임 대성공으로도 얻어요.</div>` + body;
    }
    const pl = GC.packLeft(S), pp = GC.packPrice(S), ad = adUsed(), busy = g.offers.length > 0;
    return `<h2>가방 <button class="x" data-close>✕</button></h2>
      <div class="bag-top"><div><b>${B.total}/${B.totalAll}</b><span>모은 물건</span></div><div><b>${Object.keys(g.own).length}</b><span>성장 카드</span></div><div><b>${g.shards}/${GC.SHARD_N}</b><span>카드 조각</span></div></div>
      ${busy ? `<button class="btn gold" style="width:100%;padding:11px" data-gcpick>고를 카드가 ${g.offers.length}묶음 있어요</button>` : ""}
      <div class="bag-pack"><b>카드팩</b> <span class="bag-mini">5장 중 1장 · 최종 아이템은 전설 칸에서만</span>
        <div class="row2"><button data-pack ${pl <= 0 || busy ? "disabled" : ""}>${won(pp)} 사기 (올해 ${pl}/${GC.PACK.perYear})</button><button class="ad" data-adpack ${ad || busy ? "disabled" : ""}>${ad ? "오늘 무료 팩 받음" : "광고 보고 무료 1팩"}</button></div></div>
      <div class="bag-tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${n} ${cnt(k)}/${all(k)}</button>`).join("")}</div>${body}`;
  };
  const bind = (w) => {
    w.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => { closeWin(); ctx.render?.(); });
    w.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; re(w); });
    w.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => { const r = E.buyItem(S, b.dataset.buy); toast(r.lines || [], r.msg); if (r.ok) save(); re(w); });
    w.querySelectorAll("[data-use]").forEach((b) => b.onclick = () => { const r = IT.use(S, b.dataset.use); toast(r.lines || [], r.msg); if (r.ok) { if (S.gc.shards >= GC.SHARD_N) GC.addShard(S, E.R(S), 0); save(); } re(w); });
    w.querySelector("[data-pack]")?.addEventListener("click", () => packOpen(ctx, false));
    w.querySelector("[data-adpack]")?.addEventListener("click", () => adWin(ctx, () => packOpen(ctx, true)));
    w.querySelector("[data-gcpick]")?.addEventListener("click", () => pickWin(ctx, () => bagWin(ctx, tab)));
  };
  const re = (w) => { const win = w.querySelector(".win") || w; const st = win.scrollTop; win.innerHTML = draw(); bind(w); win.scrollTop = st; };
  openWin(draw(), bind);
}
// 나 화면 요약 카드(ui.js 가 넣는다)
export function bagCard(S, esc) {
  GC.ensure(S); const B = IT.bagInfo(S), g = S.gc, sets = B.sets.filter((x) => x.on);
  return `<div class="card"><h3>가방 <small>물건 ${B.total}/${B.totalAll} · 카드 ${Object.keys(g.own).length} · 조각 ${g.shards}/${GC.SHARD_N}</small></h3>
    <div class="tiny muted">${Object.values(B.cats).map((c) => `${c.n} ${c.have}/${c.all}`).join(" · ")}${sets.length ? `<br>세트 효과: ${sets.map((x) => esc(x.n)).join(", ")}` : ""}</div>
    <div class="row" style="margin-top:8px"><button class="btn gold grow" data-bag>가방 열기${g.offers.length ? ` · 고를 카드 ${g.offers.length}` : ""}</button><button class="btn grow" data-bagpack>카드팩</button></div></div>`;
}
