// 방 꾸미기 게임 연결(11-21): 파티룸 방·에어씨앤씨 숙소. deco/deco.js(약 100KB)는 꾸미기를 열 때만 받는다.
// 11-26: 평면은 평수(파티룸)·유형(숙소)에 따라 고른다(DF.spaceOf). 예전 저장(옛 평면)은 열 때 새 평면으로 옮겨 싣는다.
// 보기 전용: openDecoView(ctx, kind, x 또는 id) — 저장된 배치를 둘러보기만(안 꾸민 방은 업체 기본 배치 예시). [꾸미기] 단추로 편집 화면.
// ctx = { S, save, render, toast, openWin, closeWin, meta, setMeta, esc, won }
import * as DF from "./engine/decofx.js";

let DM = null;
const loadDeco = () => DM || (DM = import("./deco/deco.js").catch((e) => { DM = null; throw e; }));
export const prefetchDeco = () => { loadDeco().catch(() => {}); };
const target = (S, kind, id) => (kind === "pr" ? S.pr.rooms.find((x) => x.id === id) : S.ab.units.find((x) => x.id === id));
// 컨셉·숙소 유형에 맞는 '알아서' 스타일
const STYLE_OF = { party: "in", game: "in", mega: "in", home: "no", kids: "no", bridal: "vi", study: "mo", lecture: "mo", edu: "mo", work: "mo" };
const autoStyle = (kind, x) => (kind === "pr" ? STYLE_OF[x.concept] || "mo" : x.ty === "hanok" ? "ha" : "no");
const nameOf = (kind, x) => (kind === "pr" ? x.name : x.name);
const sig = (lay) => { const p = DF.pack(lay); return JSON.stringify([p.f, p.w, p.it]); }; // 바뀌었나 견줄 때(예산 숫자는 빼고)

// 보드 한 줄: 감성 점수 · 효과 · [방 꾸미기]
export function decoRow(ctx, kind, x) {
  const sc = DF.score(ctx.S, x), how = x.decoS == null ? "안 꾸밈 · 기본" : x.decoAuto ? "알아서 꾸밈" : "직접 꾸밈";
  const cls = sc >= 75 ? "good" : sc < DF.DECO.pivot ? "bad" : "gold";
  return `<div class="row small" style="gap:6px"><span>감성 점수 <b class="${cls}">${sc}</b> <span class="tiny muted">${how}</span></span><span class="grow"></span><button class="btn sm gold" data-deco="${kind}:${x.id}">방 꾸미기</button></div>
    <details class="more"><summary>감성 효과 ▾</summary><div class="more-b tiny ${sc > DF.DECO.pivot ? "good" : "muted"}">${DF.effectTxt(ctx.S, x, kind)}${sc < 75 ? " · 직접 잘 꾸미면 더 올라요" : ""}</div></details>`; // 11-25 화면 정리 41·59: 감성 효과 설명은 접어 둔다
}

// 계약 직후: 직접 / 알아서 / 나중에
export function decoAsk(ctx, kind, id) {
  const S = ctx.S, x = target(S, kind, id); if (!x) return;
  const sp = DF.spaceOf(kind, x), a = DF.autoScore(S), f = DF.fee(S, sp);
  prefetchDeco();
  ctx.openWin(`<h3>${kind === "pr" ? "파티룸" : "숙소"} 꾸미기</h3>
    <div class="small">${ctx.esc(nameOf(kind, x))}. 가구를 직접 놓아 <b class="gold">감성 점수</b>를 올리면 예약·별점이 오르고, 시세보다 조금 비싸게 받아도 덜 빠져요.</div>
    <div class="tiny muted" style="margin:6px 0 10px">꾸미기 예산은 인테리어·세팅비에 이미 들어 있어요. 귀찮으면 업체에 맡겨도 돼요(손재주·감각만큼, 최대 ${DF.DECO.autoMax}점).</div>
    <button class="btn gold" style="width:100%;padding:12px;margin-bottom:6px" data-dask="hand">직접 꾸미기 (잘하면 80점+)</button>
    <button class="btn" style="width:100%;padding:12px;margin-bottom:6px" data-dask="auto">알아서 꾸며 줘 · 약 ${a}점 · 스타일링비 ${ctx.won(f)}</button>
    <button class="btn sm" style="width:100%" data-close>나중에 (보드에서 언제든)</button>`, (w) => {
    w.querySelector('[data-dask="hand"]').onclick = () => { ctx.closeWin(); decoOpen(ctx, kind, id); };
    w.querySelector('[data-dask="auto"]').onclick = () => { ctx.closeWin(); decoAutoQuiet(ctx, kind, id); };
  }, false, true);
}

function commit(ctx, kind, x, lay, res, auto) {
  const r = DF.apply(ctx.S, x, kind, lay, res, auto);
  ctx.save(); return r;
}

// 화면 없이 알아서 꾸미기(안 보이는 곳에 열어 채우고 닫는다)
export async function decoAutoQuiet(ctx, kind, id) {
  const S = ctx.S, x = target(S, kind, id); if (!x) return;
  let M; try { M = await loadDeco(); } catch (e) { return ctx.toast([], "꾸미기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요"); }
  const sp = DF.spaceOf(kind, x), host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:390px;height:760px;visibility:hidden";
  document.body.appendChild(host);
  try {
    const api = M.openDeco(host, { space: sp, budget: DF.BUDGET[sp], size: kind === "pr" ? x.size : null, sound: false });
    const { layout, result } = api.autoFill(autoStyle(kind, x)); api.close();
    const r = commit(ctx, kind, x, layout, result, true);
    ctx.toast(r.lines, "업체가 알아서 꾸며 줬어요");
  } catch (e) { try { console.warn("꾸미기 오류", e); } catch (e2) {} }
  host.remove(); ctx.render();
}

const GUIDE = `<div class="dk-guide"><div class="dk-gcard"><b>방 꾸미기 하는 법</b>
  <ol><li>아래 카드를 <b>끌어서</b> 방에 놓아요(톡 하면 빈자리에 바로).</li><li>놓은 가구를 톡 → 돌리기·옮기기·팔기.</li><li><b>필수품</b>(화장실·주방·자리)부터 채우고, 조명은 넉넉히.</li><li><b>스타일 하나</b>로 모으면(바닥·벽 포함) 점수가 크게 올라요. 너무 꽉 채우면 깎여요.</li></ol>
  <div class="dk-gfx">감성 점수 → 예약·별점·가격 여유. 저장하거나 ‹ 로 나가면 반영돼요. 귀찮으면 위의 <b>알아서</b>.</div>
  <button class="dk-gok">알겠어요</button></div></div>`;
const CSS = `.dk-layer{position:fixed;inset:0;z-index:9000;background:#12142a;display:flex;justify-content:center}
.dk-in{width:100%;max-width:480px;height:100%;position:relative}
body:has(.dk-layer) #toast{z-index:9500;bottom:auto;top:calc(118px + env(safe-area-inset-top,0px))}
.dk-in .dc-l1{display:none}.dk-in .dc-l2{font-size:13px;font-weight:800;color:#f2f1fb}.dk-in .dc-card{justify-content:center}
.dk-guide{position:absolute;inset:0;z-index:20;background:#0a0b18cc;display:flex;align-items:center;justify-content:center;padding:16px}
.dk-gcard{background:#1b1f3b;border:1px solid #323862;border-radius:16px;padding:16px;color:#f2f1fb;font-size:13.5px;line-height:1.5;max-width:340px}
.dk-gcard>b{font-size:16px;color:#f5c04e}.dk-gcard ol{margin:8px 0;padding-left:20px}.dk-gcard li{margin:3px 0}
.dk-gfx{font-size:12px;color:#cfd2e6;background:#252a4d;border-radius:10px;padding:7px 9px}
.dk-gok{margin-top:10px;width:100%;padding:11px;border:0;border-radius:99px;background:#f5c04e;color:#2a1a00;font-weight:900;font-size:14px}`;

// 꾸미기 화면 열기
export async function decoOpen(ctx, kind, id) {
  const S = ctx.S, x = target(S, kind, id); if (!x) return;
  if (!document.getElementById("dk-css")) { const st = document.createElement("style"); st.id = "dk-css"; st.textContent = CSS; document.head.appendChild(st); }
  const layer = document.createElement("div"); layer.className = "dk-layer"; layer.innerHTML = `<div class="dk-in"><div style="color:#9ea3c0;text-align:center;padding-top:40vh;font-size:14px">꾸미기 불러오는 중…</div></div>`;
  document.body.appendChild(layer);
  let M; try { M = await loadDeco(); } catch (e) { layer.remove(); return ctx.toast([], "꾸미기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요"); }
  const host = layer.firstChild; host.innerHTML = "";
  const sp = DF.spaceOf(kind, x), saved = DF.unpack(x.deco, DF.savedSpace(kind, x));
  let last = saved ? sig(saved) : null, api = null, autoLay = x.decoAuto ? last : null;
  const capped = (sc) => (autoLay && api && sig(api.getLayout()) === autoLay ? Math.min(sc, DF.autoScore(S)) : sc); // 알아서 꾸민 그대로면 상한
  const done = (res, lay) => {
    if (lay && res && sig(lay) !== last && (lay.items || []).length) { const r = commit(ctx, kind, x, lay, res, false); ctx.toast(r.lines, "꾸민 대로 반영했어요"); }
    try { api && api.close(); } catch (e) {}
    layer.remove(); window.__dk = null; ctx.render();
  };
  api = M.openDeco(host, {
    space: sp, budget: DF.BUDGET[sp], size: kind === "pr" ? x.size : null, title: `${nameOf(kind, x)} 꾸미기`, sound: true,
    layout: saved,
    autoStyle: autoStyle(kind, x),
    lines: (res) => fxLines(S, kind, x, res, capped),
    onSave: (lay, res) => { if (!(lay.items || []).length) return; const r = commit(ctx, kind, x, lay, res, false); last = sig(lay); autoLay = null; ctx.toast(r.lines); },
    onAuto: (fill) => { const { layout, result } = fill(); const r = commit(ctx, kind, x, layout, result, true); last = autoLay = sig(layout); ctx.toast(r.lines, `알아서 꾸밈(최대 ${DF.autoScore(S)}점) · 손보면 직접 점수로`); },
    onDone: (res, lay) => done(res, lay),
  });
  window.__dk = api; // 시험용
  const m = ctx.meta();
  if (!m.decoGuide) {
    host.insertAdjacentHTML("beforeend", GUIDE);
    host.querySelector(".dk-gok").onclick = () => { host.querySelector(".dk-guide").remove(); ctx.setMeta(Object.assign({}, ctx.meta(), { decoGuide: 1 })); };
  }
  return api;
}

// 효과 두 줄(꾸미기·보기 화면 위 카드)
function fxLines(S, kind, x, res, capped) {
  if (!res.spent && !x.deco) return [`아직 안 꾸밈 · 효과 없음`, `꾸미면 예약·별점 +`, false];
  const e = DF.effect(S, x, kind, capped ? capped(res.score) : x.decoS ?? res.score); const sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v);
  return kind === "pr" ? [`예약 ${sg(e.occ)}% · 별점 ${sg(e.star.toFixed(2))}`, `가격 여유 ${sg(e.price)}%`, e.occ < 0] : [`사진 클릭 ${sg(e.occ)}%`, `별점 ${sg(e.star.toFixed(2))}`, e.occ < 0];
}

// 보기 전용(보드 그림을 누르면): 저장된 배치·평면을 둘러본다. 사고팔기·옮기기 없음. [꾸미기] → 편집 화면
// ctx = dctx() 와 같은 것, kind = "pr" | "ab", x = 방·숙소 객체 또는 id
export async function openDecoView(ctx, kind, x) {
  const S = ctx.S; if (typeof x === "string") x = target(S, kind, x); if (!x) return null;
  if (!document.getElementById("dk-css")) { const st = document.createElement("style"); st.id = "dk-css"; st.textContent = CSS; document.head.appendChild(st); }
  const layer = document.createElement("div"); layer.className = "dk-layer"; layer.innerHTML = `<div class="dk-in"><div style="color:#9ea3c0;text-align:center;padding-top:40vh;font-size:14px">방 불러오는 중…</div></div>`;
  document.body.appendChild(layer);
  let M; try { M = await loadDeco(); } catch (e) { layer.remove(); ctx.toast([], "방을 불러오지 못했어요. 인터넷 연결을 확인해 주세요"); return null; }
  const host = layer.firstChild; host.innerHTML = "";
  const sp = DF.spaceOf(kind, x), saved = DF.unpack(x.deco, DF.savedSpace(kind, x));
  let api = null;
  const shut = () => { try { api && api.close(); } catch (e) { console.warn("꾸미기 닫기", e); } layer.remove(); window.__dkv = null; };
  api = M.openDeco(host, {
    view: true, space: sp, budget: DF.BUDGET[sp], size: kind === "pr" ? x.size : null, title: nameOf(kind, x), sound: false,
    layout: saved, autoStyle: autoStyle(kind, x),
    viewNote: saved ? "보기만 하는 중 · 확대해서 둘러봐요" : "아직 안 꾸민 방 · 업체 기본 배치 예시",
    lines: (res) => (x.deco ? fxLines(S, kind, x, res, null) : [`아직 안 꾸밈 · 효과 없음`, `꾸미기를 누르면 직접 꾸며요`, false]),
    onDone: () => shut(),
    onEdit: () => { shut(); decoOpen(ctx, kind, x.id); },
  });
  window.__dkv = api; // 시험용
  return api;
}

// 시험 훅(#auto18-pr-rooms-dkpr-dkhand 등). 결과는 <pre id="dkops"> 에 적는다
export async function decoTest(ctx, h) {
  if (!window.__errs) { window.__errs = []; addEventListener("error", (e) => window.__errs.push(e.message)); addEventListener("unhandledrejection", (e) => window.__errs.push(String(e.reason))); }
  const kind = h.includes("-dkpr") ? "pr" : "ab", S = ctx.S;
  let x = kind === "pr" ? S.pr.rooms[0] : S.ab.units[0];
  if (!x && kind === "ab" && h.includes("dkview")) x = { id: "Utest", name: "시험 숙소", ty: (h.match(/dkty_(\w+)/) || [])[1] || "detached" }; // 숙소가 없을 때 보기 시험용(저장 안 함)
  const out = [], log = (k, v) => out.push(k + "=" + v), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const put = () => { let d = document.getElementById("dkops"); if (!d) { d = document.createElement("pre"); d.id = "dkops"; d.style.cssText = "position:fixed;left:0;bottom:0;z-index:9999;background:#000c;color:#0f0;font-size:11px;margin:0;max-width:100%;white-space:pre-wrap"; document.body.appendChild(d); } d.textContent = out.join("\n"); };
  if (!x) { log("err", "방 없음"); return put(); }
  if (!h.includes("dkguide")) ctx.setMeta(Object.assign({}, ctx.meta(), { decoGuide: 1 }));
  log("before", DF.score(S, x) + (x.decoS == null ? "(기본)" : "") + " w=" + innerWidth);
  if (h.includes("dkask")) return decoAsk(ctx, kind, x.id);
  if (h.includes("dkauto")) { const c0 = S.cash; await decoAutoQuiet(ctx, kind, x.id); log("auto", x.decoS + " cap=" + DF.autoScore(S) + " fee=" + Math.round(c0 - S.cash) + " items=" + (x.deco?.it.length || 0)); log("fx", DF.effectTxt(S, x, kind)); }
  if (h.includes("dkboard")) { log("ERR", (window.__errs || []).join(" | ")); put(); setTimeout(() => document.querySelector(".room .btn[data-deco]")?.scrollIntoView({ block: "center" }), 300); return; }
  if (h.includes("dkview")) { const v = await openDecoView(ctx, kind, x); await wait(300); log("view", v ? v.dbg.items().length + " items sp=" + DF.spaceOf(kind, x) + " size=" + (x.size || x.ty) : "없음"); log("ERR", (window.__errs || []).join(" | ")); return put(); }
  const api = await decoOpen(ctx, kind, x.id);
  if (h.includes("dkhand") && api) {
    const st = autoStyle(kind, x), P = (id, i, j, r = 0) => api.dbg.place(id + "_" + st, i, j, r);
    const L = kind === "pr"
      ? [["sofa3", 5, 0], ["ctable", 5, 2], ["ptable", 4, 5], ["bench", 4, 4], ["bench", 4, 6], ["karaoke", 0, 6, 3], ["tv", 0, 4, 3], ["mball", 8, 4], ["counter", 0, 0], ["fridge", 2, 0], ["stove", 3, 0], ["toilet", 9, 0], ["basin", 11, 0], ["flamp", 11, 4], ["plant", 11, 3], ["plant", 3, 8], ["neon", 5, 0], ["window", 0, 4, 1], ["string", 0, 6, 1], ["wlamp", 0, 3, 1], ["balloon", 9, 8, 2], ["speaker", 0, 8, 3]]
      : [["bed2", 0, 0], ["nstand", 2, 0], ["sofa2", 2, 4, 3], ["ctable", 4, 3, 1], ["counter", 3, 0], ["toilet", 5, 0], ["shower", 6, 1], ["basin", 6, 0], ["flamp", 0, 5], ["plant", 1, 5], ["window", 0, 2, 1], ["frame", 2, 0], ["tlamp", 0, 3]];
    log("place", L.map((a) => P(...a)).filter((r) => r === "ok").length + "/" + L.length);
    api.dbg.mat("floor", { in: "conc", no: "oak", mo: "walnut", vi: "parquet", ha: "jang" }[st]); api.dbg.mat("wall", { in: "brick", no: "beige", mo: "gray", vi: "panel", ha: "hanji" }[st]);
    await wait(200); log("live", api.getStats().score);
    document.querySelector(".dc-save").click(); await wait(100); log("saved", x.decoS + " auto=" + !!x.decoAuto + " items=" + x.deco.it.length + " bytes=" + JSON.stringify(x.deco).length);
    log("fx", DF.effectTxt(S, x, kind));
    if (!h.includes("dkstay")) {
      document.querySelector(".dc-back").click(); await wait(300); log("closed", !document.querySelector(".dk-layer"));
      const a2 = await decoOpen(ctx, kind, x.id); await wait(200); log("reopen", a2.dbg.items().length + "/" + x.deco.it.length + " score=" + a2.getStats().score);
    }
  }
  log("ERR", (window.__errs || []).join(" | ")); put();
}
