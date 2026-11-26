// 바이브코딩 보드: 의뢰함 → 만드는 중 → 유지보수 → 내 앱. 도구 구독 고르기, 다음 단계 조건.
import * as VB from "../engine/jobs/vibe.js";

const ICH = { friend: "users", market: "coin", post: "pen", pkg: "brief" };

export default {
  key: "vibe", ic: "wrench", bg: "cowork", fullBg: "home",
  icons: { vb_build: "spark", vb_fix: "wrench", vb_sell: "mega", vb_study: "book", vb_meet: "users", vb_agent: "users" },
  tile: (S) => { const V = S.vibe; return V.app?.live ? `앱 ${V.app.users}명 · 유지보수 ${V.rets.length}` : `Lv${V.lv} · 진행 ${V.projects.length}건`; },
  side: (S) => `바이브코딩 Lv${S.vibe.lv}`,
  quick: (S) => { const V = S.vibe; if (VB.fixNeed(S) > V.fx && VB.fixNeed(S) - V.fx >= 1) return "vb_fix"; return V.projects.length || V.app?.live ? "vb_build" : "vb_sell"; },
  defaultArg(S, id) {
    const V = S.vibe;
    if (id === "vb_build") { const p = V.projects.slice().sort((a, b) => (a.own ? 1 : 0) - (b.own ? 1 : 0) || (a.due ?? 99) - (b.due ?? 99))[0]; const own = V.projects.find((x) => x.own && x.own !== "app"); return (own || p)?.id || (V.app?.live ? "app" : undefined); }
    if (id === "vb_sell") return V.lv >= 4 && V.niche ? "pkg" : V.lv >= 3 ? "post" : V.lv >= 2 ? "market" : "friend";
    return undefined;
  },
  cine: {
    vb_auto: ["desk", "바이브코딩"], vb_lv2: ["cafe", "첫 외주"], vb_lv3: ["cowork", "리테이너"], vb_app: ["home", "내 앱 출시"], vb_store: ["desk", "앱 심사 거절"],
    vb_lv4: ["cowork", "업종 전문가"], vb_lv5: ["cowork", "솔로프리너"], vb_end_dev: ["home", "퇴근 후 1인 개발사"],
    vb_end_solo: ["cowork", "솔로프리너 독립"], vb_end_exit: ["rooftop", "엑싯의 맛"], vb_close: ["home", "문 닫기"],
  },
  // #auto18-vibe: 중반 상태로 시작해 보드를 다 보이게
  auto(c) { const V = c.S.vibe; Object.assign(V, { tool: 1, tech: 30, lv: 3, site: true, refs: 5, rep: 30, delivered: 4, projects: [], cases: { academy: 2, fit: 1, shop: 1, salon: 0 } }); V.rets.push({ id: "R90", nm: "학원 출결 앱", ind: "academy", fee: 35, t: 0 }); V.app = { live: true, ind: "academy", users: 18, price: 2, buzz: 10, t0: 0, focus: false, best: 18 };
    const m = location.hash.match(/f30([a-z]+)/); if (m) setTimeout(() => { const sc = VB.f30Scene(c.S, c.E.R(c.S), m[1]); if (sc) { c.E.openScene(c.S, sc); const pk = location.hash.match(/pick([0-9])/); if (pk) { c.E.choose(c.S, +pk[1]); c.save(); c.render(); } else c.afterRes({}); } }, 900); }, // 11-22 특이 요소 장면 시험(#auto3-vibe-f30scope|f30model|f30store)
  page(c) {
    const { S, esc, won, boardHead, actRow, meter } = c, V = S.vibe, L = V.last, lv = VB.LV[V.lv];
    const [goal, prog] = VB.nextGoal(S), need = VB.fixNeed(S), sp = VB.speed(S);
    const toolBtns = VB.TOOL.map((t, i) => `<button class="btn sm ${V.tool === i ? "gold" : ""}" data-vbtool="${i}">${esc(t.n)}<br><span class="tiny">월 ${won(Math.round(t.c * (V.tp || 1) * (S.pi || 1)))} · 속도 ×${t.sp}</span></button>`).join("");
    const head = `${boardHead("vibe")}<div class="card"><h3>바이브코딩 <small>Lv${V.lv} ${esc(lv.n)}</small></h3>
      <div class="tiny muted">"${esc(lv.line)}"</div>
      <div class="kv" style="margin-top:6px"><div><div class="k">지난달 순이익</div><div class="v ${(L?.profit ?? 0) >= 0 ? "good" : "bad"}">${L ? won(L.profit) : "-"}</div></div>
        <div><div class="k">평판</div><div class="v gold">${Math.round(V.rep)}</div></div>
        <div><div class="k">기술 이해</div><div class="v">${Math.round(V.tech)}</div></div>
        <div><div class="k">후기</div><div class="v">${V.refs}건</div></div></div>
      <div class="small" style="margin-top:6px">다음 단계: ${esc(goal)}</div>${meter(prog * 100, 100, "var(--gold)")}
      <div class="tiny muted" style="margin-top:4px">풀린 것: ${esc(lv.unlock)}</div></div>
    <div class="card"><details><summary style="cursor:pointer"><span class="row" style="display:inline-flex;width:calc(100% - 16px);vertical-align:middle"><b class="grow">코디 도구 · ${esc(VB.TOOL[V.tool]?.n || "")}</b><span class="tiny muted">속도 ×${sp.toFixed(2)} · 바꾸기 ▾</span></span></summary>
      <div class="row wrap" style="margin-top:6px;gap:6px">${toolBtns}</div>
      <div class="tiny muted" style="margin-top:4px">구독료는 수시로 바뀌어요${V.tp && V.tp !== 1 ? ` (지금 기본가의 ×${V.tp.toFixed(2)})` : ""}.${V.tqT > 0 ? ` 도구 상태 ×${V.tq} (${V.tqT}개월)` : ""} 무료는 느리고, 프로는 빠르지만 비싸요.</div></details></div>
    <div class="card"><div class="row"><b class="grow">계약서 범위</b><span class="tiny muted">답장 ×${VB.scopeOf(S).win} · 수정 요청 ×${VB.scopeOf(S).creep}</span></div>
      <div class="row wrap" style="margin-top:6px;gap:6px">${Object.entries(VB.VB_F30.scope).map(([k, o]) => `<button class="btn sm ${(V.scope || "std") === k ? "gold" : ""}" data-vbscope="${k}">${esc(o.n)}</button>`).join("")}</div>
      <div class="tiny muted" style="margin-top:4px">${esc(VB.scopeOf(S).tip)}</div></div>`;
    // 의뢰함
    const offers = V.offers.map((o) => { const ch = VB.CH[o.ch]; return `<div class="room"><div class="body"><div class="row"><div class="grow"><div class="nm">${esc(o.nm)}</div>
      <div class="tiny"><span class="tag">${esc(ch.n)}</span>${o.dom ? `<span class="tag gold">내 도메인 · ${esc(VB.DOMS[o.dom]?.n || "")}</span>` : `<span class="tag">${esc(VB.INDS[o.ind]?.n || "")}</span>${VB.domOn(S) ? '<span class="tag">도메인 밖</span>' : ""}`}${ch.fee ? `<span class="tag red">수수료 ${Math.round(ch.fee * 100)}%</span>` : ""}${o.exp <= 1 ? '<span class="tag red">답장 이번 달까지</span>' : ""}</div></div>
      <div style="text-align:right"><div class="gold" style="font-weight:900">${o.price ? won(o.price) : "무료"}</div><div class="tiny muted">작업 ${o.need}칸 · 마감 ${o.due}달</div></div></div>
      <div class="row" style="margin-top:6px"><span class="tiny muted grow">${o.price ? `착수금 30% ${won(Math.round(o.price * 0.3))} 바로` : "후기·포트폴리오용 파일럿"}</span><button class="btn sm" data-vbdrop="${o.id}">거절</button><button class="btn sm gold" data-vbtake="${o.id}">맡기</button></div></div></div>`; }).join("");
    // 만드는 중
    const proj = V.projects.map((p) => `<div class="room"><div class="body"><div class="row"><div class="grow"><div class="nm">${esc(p.nm)}</div>
      <div class="tiny">${p.own ? `<span class="tag gold">${p.own === "app" ? "내 앱" : "내 일"}</span>` : `<span class="tag">${esc(VB.CH[p.ch]?.n || "")}</span><span class="tag ${p.due < 0 ? "red" : p.due <= 1 ? "gold" : ""}">${p.due < 0 ? `마감 ${-p.due}달 지남` : `마감 ${p.due}달`}</span>`}${p.dom ? `<span class="tag gold">${esc(VB.DOMS[p.dom]?.n || "")}</span>` : ""}${p.lock ? '<span class="tag red">검수 답 대기(다음 달 재작업)</span>' : p.redo ? '<span class="tag red">재작업 · 잔금 70%</span>' : ""}${p.spec ? '<span class="tag green">정의서 있음</span>' : ""}${p.vague ? '<span class="tag red">요구사항 모호</span>' : ""}${p.creep ? `<span class="tag">수정 요청 ${p.creep}번</span>` : ""}</div></div>
      <div style="text-align:right">${p.price ? `<div class="gold" style="font-weight:900">${won(p.price)}</div><div class="tiny muted">잔금 ${won(p.price - (p.dep || 0))}</div>` : '<div class="tiny muted">무보수</div>'}</div></div>
      ${meter(p.done, p.need, "var(--blue)")}
      <div class="row" style="margin-top:6px"><span class="small grow">진도 <b>${Math.min(p.done, p.need)}/${p.need}</b> <span class="tiny muted">(한 번에 약 ${sp.toFixed(1)}칸)</span></span>${p.lock ? "" : `<button class="btn sm gold" data-act="vb_build" data-arg="${p.id}">코디로 만들기 ⚡1</button>`}</div></div></div>`).join("");
    // 유지보수
    const rets = `<div class="card"><div class="row"><b class="grow">유지보수·버그</b><span class="small">이번 달 <b class="${V.agent || V.fx >= need ? "good" : "bad"}">${V.agent ? "하청" : `${V.fx}/${need}`}</b></span></div>
      <div class="row wrap tiny" style="margin-top:4px;gap:4px">${V.rets.map((t) => `<span class="tag ${VB.domOn(S) && !VB.retIsDom(S, t) ? "red" : "green"}">${esc(t.nm)} 월 ${won(t.fee)}${VB.retIsDom(S, t) && VB.retFee(S, t) > t.fee ? ` → 재계약 때 ${won(VB.retFee(S, t))}` : ""}</span>`).join("") || '<span class="muted">유지보수 계약 없음. Lv2부터 납품하면 가끔 계약을 원해요</span>'}${V.as > 0 ? `<span class="tag gold">무상 AS ${Math.ceil(V.as)}건</span>` : ""}${V.debt > 0 ? `<span class="tag red">기술 부채 ${V.debt}달</span>` : ""}</div>
      ${VB.domOn(S) ? `<div class="tiny" style="margin-top:4px">도메인 계약 <b>${V.rets.filter((t) => VB.retIsDom(S, t)).length}</b>건 / 도메인 밖 <b class="${V.rets.some((t) => !VB.retIsDom(S, t)) ? "bad" : ""}">${V.rets.filter((t) => !VB.retIsDom(S, t)).length}</b>건${V.rets.some((t) => !VB.retIsDom(S, t)) ? `(해지 위험 ↑ 달마다 +${Math.round(VB.retOutQuit(S) * 100)}%p)` : ""} <span class="muted">· 새 계약은 내 도메인 건 납품에서 나오고, 월 유지보수비는 ${VB.VB_CH.x.renew}달마다 재계약 때 이해도를 따라 올라요. 한 도메인에 ${VB.VB_CH.x.retPer[0]}건, 이해도 ${VB.VB_CH.x.hiU}부터 ${VB.VB_CH.x.retPer[1]}건(해지도 줄어요)</span></div>` : ""}
      ${V.debt > 0 ? '<div class="tiny bad" style="margin-top:4px">예전 버전에 묶어 둔 코드: 유지보수 +1칸, 장애·해지 위험 ↑. DB·API·보안 공부 한 번에 3달씩 줄어요.</div>' : ""}
      <details style="margin-top:4px"><summary class="tiny muted" style="cursor:pointer">계약 ${V.rets.length}/${VB.maxRets(S)}건 · 자세히 ▾</summary><div class="tiny muted">건당 0.5칸, 내 앱 1칸 이상. 밀리면 계약이 끊기고 앱 사용자가 떠나요.</div></details>
      ${V.agent ? "" : `<div class="acts" style="padding:0;margin-top:6px">${actRow("vb_fix")}</div>`}</div>`;
    // 내 앱
    const A = V.app;
    const app = A?.live ? `<div class="card"><div class="row"><b class="grow">내 앱 <span class="tag gold">${esc(VB.INDS[A.ind]?.n || "")}</span>${A.focus ? '<span class="tag green">업종 특화</span>' : ""}${A.web ? '<span class="tag">웹 서비스</span>' : ""}${A.noPay ? '<span class="tag red">바깥 결제</span>' : ""}${V.bigFree > 0 ? '<span class="tag red">대형 플랫폼 무료 기능</span>' : ""}</b></div>
      <div class="kv"><div><div class="k">유료 사용자</div><div class="v">${A.users}명</div></div><div><div class="k">월 구독 매출</div><div class="v good">${won(VB.mrr(S))}</div></div><div><div class="k">해지율</div><div class="v ${(A.churn || 0) > 0.06 ? "bad" : ""}">${((A.churn || 0.06) * 100).toFixed(1)}%</div></div><div><div class="k">서버·DB</div><div class="v">${won(VB.appServer(S))}</div></div></div>
      ${meter(A.users, Math.max(1, VB.appCap(S)), "var(--green)")}<div class="tiny muted">지금 단계·평판·가격으로 닿을 수 있는 사용자 약 ${VB.appCap(S)}명</div>
      ${!VB.domOn(S) ? "" : VB.appIsDom(S) ? `<div class="tiny" style="margin-top:4px">앱: <b>${esc(VB.DOMS[A.dom]?.n || "")} 특화</b> · 이해도 ${Math.round(VB.domU(S, A.dom))} → 한도 ×${VB.appDomMul(S).toFixed(2)} · 구독료 상한 ${VB.appPriceMax(S)}만</div>`
        : `<div class="row" style="margin-top:4px"><span class="tiny grow">앱: <b class="bad">범용</b>(한도 −${Math.round((1 - VB.VB_CH.x.appOutCap) * 100)}% · 해지 +${Math.round(VB.VB_CH.x.appOutChurn * 100)}%p)${A.sp ? ` · 특화 ${A.sp}/${VB.VB_CH.x.spN}` : ""}<br><span class="muted">${V.dom?.picks?.length ? `특화는 ${VB.VB_CH.x.spN}번 걸리고, 그동안 안 맞는 사용자가 조금 떠나요. 끝나면 한도가 이해도를 따라 올라요(이해도 0 = ×${VB.VB_CH.x.appLo}, 100 = ×${VB.VB_CH.x.appHi}, 구독료 상한도 ${VB.VB_CH.x.priceMax + VB.VB_CH.x.priceUp}만까지)` : "도메인을 먼저 고르면 특화할 수 있어요"}</span></span>${VB.canSpecApp(S) ? '<button class="btn sm gold" data-act="vb_build" data-arg="appdom">도메인 특화 ⚡1</button>' : ""}</div>`}
      <div class="row wrap small" style="margin-top:6px"><span class="grow">한 달 구독료</span><div class="stepper"><button data-vbprice="-0.5">−</button><b>${A.price}만</b><button data-vbprice="0.5">+</button></div></div>
      <div class="row" style="margin-top:6px"><button class="btn sm danger" data-vbclose="1">문 닫기</button><span class="grow"></span><button class="btn sm gold" data-act="vb_build" data-arg="app">기능 업데이트 ⚡1</button></div></div>`
      : A && !A.live ? `<div class="card"><div class="row"><b class="grow">내 앱 <span class="tag red">재심사 대기</span></b><button class="btn sm danger" data-vbclose="1">문 닫기</button></div><div class="tiny muted" style="margin-top:4px">앱 장터 재심사 ${A.hold >= 99 ? "결정 대기" : `${A.hold}달 남음`} · 베타 신청 ${A.users}명이 기다려요.</div></div>`
      : V.projects.some((p) => p.own === "app") || V.lv < 2 ? "" : `<div class="card"${V.lv < 3 ? ' style="opacity:.6"' : ""}><div class="row"><b class="grow">내 앱(구독)</b>${V.lv >= 3 ? '<button class="btn sm gold" data-vbapp="1">내 앱 만들기 시작</button>' : '<span class="tag">Lv3부터</span>'}</div><div class="tiny muted" style="margin-top:4px">사장님들이 매달 1~3만 원 내고 쓰는 작은 앱. 사용자 50명 × 2만 원이면 월 100만. 대신 새벽 장애와 해지율이 따라와요.</div></div>`;
    // 도메인(11-26): 예고 전에는 안 보인다. 6년 차 뒤 고르기·이해도 막대·오르는 길·지금 단가
    const dm = V.dom || { pre: 0, on: 0, picks: [], u: {} }, DC = VB.VB_CH.dom;
    const domCard = !dm.pre ? "" : !dm.on ? `<div class="card"><div class="row"><b class="grow">도메인</b><span class="tag">예고</span></div>
      <div class="tiny muted" style="margin-top:4px">발주처가 "업계를 아는 사람"을 찾기 시작했어요. 아직 수치는 그대로예요. 6년 차쯤 내 분야를 정해야 할 때가 와요.</div></div>`
      : `<div class="card"><div class="row"><b class="grow">도메인 <small>${dm.picks.length}/${DC.max}</small></b><span class="tiny muted">손님 풀 ${Math.round(VB.domReach(S) * 100)}%</span></div>
      <div class="tiny muted" style="margin-top:4px">분야 밖 문의는 크게 줄었어요. 고른 분야의 일은 이해도가 찰수록 제값을 받아요(이해도 100 = 단가 100%). 유지보수와 앱도 이해도를 따라가요.</div>
      ${dm.picks.map((k) => { const u = dm.u[k] || 0, src = VB.domSources(S, k), g = VB.domGain(S, k); return `<div class="room"><div class="body"><div class="row"><div class="grow"><div class="nm">${esc(VB.DOMS[k].n)}</div><div class="tiny">이해도 <b>${Math.round(u)}</b>/100 · 지금 단가 <b class="${u >= 100 ? "good" : "gold"}">${Math.round(VB.domPriceMul(S, k) * 100)}%</b> · 달마다 +${g.toFixed(1)}</div></div><button class="btn sm" data-vbdomswap="${k}">바꾸기</button></div>
        ${meter(u, 100, "var(--gold)")}
        <div class="tiny" style="margin-top:4px">${src.map((x) => `<div class="${x.on ? "" : "muted"}">${x.on ? "✓" : "·"} ${esc(x.n)} <span class="muted">달마다 +${x.v}</span></div>`).join("")}<div>· 업계 모임 <span class="muted">한 번에 +${DC.meet[0]}~${DC.meet[1]}(${DC.meetGap}달에 한 번)</span></div><div>· 이 분야 일 납품 <span class="muted">건마다 +${DC.deliver}</span></div></div>
        <div class="row" style="margin-top:6px"><span class="grow"></span><button class="btn sm gold" data-act="vb_meet" data-arg="${k}">업계 모임 ⚡1</button></div></div></div>`; }).join("")}
      ${dm.picks.length < DC.max ? `<div class="small" style="margin-top:6px">${dm.picks.length ? "한 분야 더 고를 수 있어요(이해도는 따로 쌓여요)" : "내 분야를 고르세요. 고르기 전까지는 문의가 ${Math.round(VB.domReach(S) * 100)}%만 들어와요"}</div>
        <div class="row wrap" style="margin-top:6px;gap:6px">${VB.domSuggest(S).map((k) => `<button class="btn sm" data-vbdompick="${k}">${esc(VB.DOMS[k].n)}${VB.domGain(S, k) > 0 ? `<br><span class="tiny">달마다 +${VB.domGain(S, k).toFixed(1)}</span>` : ""}</button>`).join("")}</div>
        <div class="tiny muted" style="margin-top:4px">한 번 고르면 바꿀 때 쌓은 이해도가 사라져요. 내 회사·주변 사람·다른 투잡과 맞는 분야가 빨리 차요.</div>` : ""}</div>`;
    // 영업
    const isLock = ([k, ch]) => V.lv < ch.lv || (k === "pkg" && !V.niche);
    const nextLock = Object.entries(VB.CH).filter(isLock).sort((a, b) => a[1].lv - b[1].lv)[0]?.[0];
    const sell = Object.entries(VB.CH).filter((e) => !isLock(e) || e[0] === nextLock).map(([k, ch]) => { const lock = isLock([k, ch]); return `<button class="btn sm" data-act="vb_sell" data-arg="${k}" ${lock ? 'style="opacity:.45"' : ""}>${esc(ch.n)} ⚡1${lock ? `<br><span class="tiny">${V.lv < ch.lv ? `Lv${ch.lv}` : "전문 업종 먼저"}</span>` : ""}</button>`; }).join("");
    return `${head}
    <div class="sec">의뢰함 · ${V.offers.length}건</div>${offers || '<div class="card tiny muted">들어온 의뢰가 없어요. 아래 영업으로 받아 오세요.</div>'}
    <div class="card"><b>영업·견적 보내기</b><div class="row wrap" style="margin-top:6px;gap:6px">${sell}</div><div class="tiny muted" style="margin-top:4px">1~3월(개업·신학기)과 연말에 의뢰가 많고, 7~8월은 조용해요. 재능마켓은 수수료 20%에 해외 반값 견적과 싸워요.</div></div>
    ${domCard}
    ${proj ? `<div class="sec">만드는 중 · ${V.projects.filter((p) => !p.own).length}/${VB.maxProj(S)}건</div>${proj}` : ""}
    ${rets}${app}
    <div class="acts" style="padding:0">${actRow("vb_study")}${V.lv >= 4 || V.agent ? actRow("vb_agent", undefined, V.agent ? "하청 계약 해지" : "하청 개발자 계약(반복 수입 30% + 월 50만, 투잡 칸 +1)") : ""}</div>`;
  },
  bind(c) {
    const done = (r) => { if (r?.msg) c.toast([], r.msg); c.save(); c.render(); };
    c.q("[data-vbtake]", (el) => done(VB.take(c.S, el.dataset.vbtake)));
    c.q("[data-vbdrop]", (el) => done(VB.drop(c.S, el.dataset.vbdrop)));
    c.q("[data-vbtool]", (el) => done(VB.setTool(c.S, +el.dataset.vbtool)));
    c.q("[data-vbscope]", (el) => done(VB.setScope(c.S, el.dataset.vbscope)));
    c.q("[data-vbprice]", (el) => { VB.setAppPrice(c.S, (c.S.vibe.app?.price || 2) + +el.dataset.vbprice); c.save(); c.render(); });
    c.q("[data-vbapp]", () => done(VB.startApp(c.S)));
    const domName = (k) => VB.DOMS[k]?.n || "";
    c.q("[data-vbdompick]", (el) => { const k = el.dataset.vbdompick; c.openWin(`<h2>내 도메인: ${domName(k)}</h2><div class="small">${domName(k)} 분야를 내 도메인으로 정해요. 이해도 0에서 시작하고, 지금 이 분야 일의 단가는 ${Math.round(VB.domPriceMul(c.S, k) * 100)}%예요. 나중에 바꾸면 쌓은 이해도가 사라져요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>그만두기</button><button class="btn gold grow" data-vbyes>정하기</button></div>`, (w) => { w.querySelector("[data-vbyes]").onclick = () => { c.closeWin(); done(VB.pickDom(c.S, k)); }; w.querySelector("[data-close]").onclick = () => c.closeWin(); }); });
    c.q("[data-vbdomswap]", (el) => { const from = el.dataset.vbdomswap, u = Math.round(c.S.vibe.dom?.u?.[from] || 0); c.openWin(`<h2>도메인 바꾸기</h2><div class="small">${domName(from)} 이해도 ${u}이 사라지고, 새 분야는 0에서 시작해요. 되돌릴 수 없어요.</div><div class="row wrap" style="margin-top:10px;gap:6px">${VB.domSuggest(c.S).map((k) => `<button class="btn sm" data-vbto="${k}">${domName(k)}</button>`).join("")}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>그만두기</button></div>`, (w) => { w.querySelectorAll("[data-vbto]").forEach((b) => { b.onclick = () => { c.closeWin(); done(VB.swapDom(c.S, from, b.dataset.vbto)); }; }); w.querySelector("[data-close]").onclick = () => c.closeWin(); }); });
    c.q("[data-vbclose]", () => c.openWin(`<h2>내 앱 문 닫기</h2><div class="small">사용자 ${c.S.vibe.app?.users || 0}명에게 종료 안내를 보내고 서버를 내려요. 구독 매출과 서버비가 같이 사라져요. 되돌릴 수 없어요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>그만두기</button><button class="btn danger grow" data-vbyes>문 닫기</button></div>`, (w) => { w.querySelector("[data-vbyes]").onclick = () => { c.closeWin(); done(VB.closeApp(c.S)); }; w.querySelector("[data-close]").onclick = () => c.closeWin(); }));
  },
};
