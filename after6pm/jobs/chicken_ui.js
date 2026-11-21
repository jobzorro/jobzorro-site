// 프랜차이즈 치킨 보드: 매장 카드(배달통 별점·플레이스 순위·11% 막대·알바·점장), 창업 준비 체크리스트, 개인회생 위험 신호.
import * as CH from "../engine/jobs/chicken.js";

const pct = (v, t) => (t > 0 ? Math.round((v / t) * 100) : 0);
// 매출 100원이 어디로 가나: 재료·배달수수료·인건비·임차료·기타·남는 돈
function costBar(c, L) {
  const { esc } = c, t = Math.max(1, L.rev);
  const parts = [["재료", L.mat, "var(--orange)"], ["배달", L.fee, "var(--pink)"], ["인건", L.lab, "var(--blue)"], ["임차", L.rent, "var(--purple)"], ["기타", L.other, "var(--muted)"]];
  const left = L.rev - L.mat - L.fee - L.lab - L.rent - L.other;
  const seg = parts.map(([n, v, col]) => `<i title="${n}" style="display:block;height:100%;width:${Math.max(0, pct(v, t))}%;background:${col}"></i>`).join("");
  const lp = pct(left, t);
  return `<div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--panel3);margin-top:6px">${seg}<i style="display:block;height:100%;width:${Math.max(0, lp)}%;background:${left >= 0 ? "var(--green)" : "var(--red)"}"></i></div>
    <div class="tiny muted" style="display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:3px">${parts.map(([n, v]) => `<span>${esc(n)} ${pct(v, t)}%</span>`).join("")}<b class="${left >= 0 ? "good" : "bad"}">남는 돈 ${lp}%</b></div>`;
}

function dangerCard(c) {
  const { S, won } = c, d = CH.danger(S), C = S.chicken;
  const col = ["green", "gold", "red", "red"][d.lv];
  const tip = d.lv >= 3 ? "카드값을 3달 못 내면 개인회생(게임 끝)이에요. 가장 약한 매장 양수도·점장 해지·가격 조정을 지금 하세요."
    : d.lv === 2 ? "통장이 줄고 있어요. 적자 매장은 양수도 예상가를 보고, 근무·알바 빈자리부터 막으세요."
    : d.lv === 1 ? "아직 버틸 만해요. 그래도 창업대출 원금이 매달 나가요." : "현금 흐름이 플러스예요. 이 흐름을 지키세요.";
  return `<div class="card" style="border:1px solid var(--${col === "gold" ? "gold" : col})"><div class="row"><b>개인회생 위험 신호</b><span class="grow"></span><span class="tag ${col}">${d.n}</span></div>
    <div class="kv"><div><div class="k">한 달 현금 흐름</div><div class="v ${d.flow >= 0 ? "good" : "bad"}">${d.flow >= 0 ? "+" : ""}${won(d.flow)}</div></div>
    <div><div class="k">버틸 수 있는 달</div><div class="v ${d.runway < 6 ? "bad" : ""}">${d.runway >= 99 ? "∞" : `${Math.max(0, Math.round(d.runway))}달`}</div></div>
    <div><div class="k">창업대출 남음</div><div class="v">${won(d.loan)}</div></div><div><div class="k">카드값 연체</div><div class="v ${d.late ? "bad" : ""}">${d.late}/3달</div></div></div>
    <div class="tiny muted" style="margin-top:4px">월급+치킨 순익(3달 평균)−창업대출 원금 ${won(d.prin)}−생활비·이자. 빚 전체 ${won(d.debt)} · 남은 신용 한도 ${won(d.room)}${d.loss ? ` · 치킨 적자 ${d.loss}달째` : ""}${C.famDebt ? ` · 가족 빚 ${won(C.famDebt)}` : ""}</div>
    <div class="tiny ${d.lv >= 2 ? "bad" : "muted"}" style="margin-top:2px">${tip}</div></div>`;
}

function prepCard(c) {
  const { S, won, actRow, esc } = c, C = S.chicken;
  const steps = ["가맹 상담·정보공개서(14일 숙려)", "점주 교육(평일 닷새)", "견적·계약·오픈"];
  const qd = CH.quote(S, "deliv", C.disc), qh = CH.quote(S, "hall", C.disc), cap = CH.capacity(S);
  const row = (n, q) => `<div class="room"><div class="body"><div class="nm">${esc(n)}</div><div class="small">공시 창업비 ${won(q.notice)} + 숨은 공사비 ${won(q.extra)} + 임차보증금 ${won(q.dep)} + 권리금 ${won(q.key)}</div><div class="row small"><span>합계 <b class="gold">${won(q.total)}</b></span><span class="grow"></span><span class="${cap >= q.total + 300 ? "good" : "bad"}">${cap >= q.total + 300 ? "가능" : "자금 부족"}</span></div></div></div>`;
  return `<div class="card"><h3>창업 준비 <small>${C.step}/3</small></h3>
    ${steps.map((t, i) => `<div class="small" style="margin:2px 0">${i < C.step ? '<b class="good">✓</b>' : i === C.step ? '<b class="gold">▶</b>' : '<span class="muted">○</span>'} ${esc(t)}</div>`).join("")}
    <div class="tiny muted" style="margin-top:6px">정보공개서는 계약 14일 전에 받아야 해요(가맹거래사 동행 시 7일). 본사 공시 창업비는 5천만 원이지만 전기·가스·닥트·철거·소방·권리금이 붙어 실제는 2배가 넘어요. 모자라면 창업대출(최대 ${won(CH.LOAN_MAX)}, 5년 원금 상환) → 신용대출 순서로 빌려요.</div>
    <div class="small" style="margin-top:6px">내 현금 ${won(Math.max(0, S.cash))} · 빌릴 수 있는 돈 포함 <b>${won(cap)}</b></div></div>
    ${C.step >= 2 ? row(CH.TYPES.deliv.n, qd) + row(CH.TYPES.hall.n, qh) : ""}
    <div class="acts" style="padding:0">${actRow("ch_prep", undefined, ["가맹 상담 받기 (정보공개서)", "점주 교육 받기", "견적 받고 계약·오픈"][C.step])}</div>`;
}

function storeCard(c, st) {
  const { S, esc, won, meter } = c, C = S.chicken, L = st.last, T = CH.TYPES[st.type], n = CH.needAp(S, st) + (C.selfFill && !st.mgr ? 1 : 0);
  const sp = CH.sellPrice(S, st), cc = CH.closeCost(S, st), pr = Math.round(2.4 * (S.pi || 1) * st.price * 10000 / 100) * 100;
  const tags = [`<span class="tag">${esc(T.n)}</span>`, st.mgr ? '<span class="tag blue">점장</span>' : "", st.fam ? '<span class="tag pink">가족</span>' : "", st.app ? '<span class="tag green">자사 앱</span>' : "", st.inc ? '<span class="tag gold">인센티브</span>' : "", st.months === 0 ? '<span class="tag gold">공사 중</span>' : ""].join("");
  return `<div class="room"><div class="body">
    <div class="row"><div class="grow"><div class="nm">${esc(st.name)}</div><div class="tiny muted">${esc(st.area)} · ${st.months}개월째</div><div class="tiny">${tags}</div></div>
      <div style="text-align:right"><div class="gold" style="font-weight:900">배달통 ★ ${st.rating.toFixed(2)}</div><div class="tiny">플레이스 <b class="${st.rank <= 5 ? "good" : st.rank >= 20 ? "bad" : ""}">${st.rank}위</b>/30</div></div></div>
    ${L ? `<div class="kv"><div><div class="k">월매출</div><div class="v">${won(L.rev)}</div></div><div><div class="k">주문</div><div class="v">${L.orders.toLocaleString()}건</div></div><div><div class="k">지난달 순익</div><div class="v ${L.profit >= 0 ? "good" : "bad"}">${won(L.profit)}</div></div></div>${costBar(c, L)}`
      : '<div class="tiny muted" style="margin-top:4px">이번 달은 공사·오픈 준비. 다음 정산부터 주문이 들어와요(첫 달은 반달 영업).</div>'}
    <div class="row small" style="margin-top:6px"><span>알바 <b class="${st.crew < st.crewNeed ? "bad" : "good"}">${st.crew}/${st.crewNeed}명</b></span><span class="grow"></span><span class="tiny muted">사기 ${Math.round(st.morale)}</span></div>
    ${meter(st.morale, 100, st.morale < 35 ? "var(--red)" : st.morale < 55 ? "var(--gold)" : "var(--green)")}
    <div class="row small" style="margin-top:4px"><span>입소문 ${Math.round(st.buzz)}</span><span class="grow"></span><span>튀김 품질 ${Math.round(st.fry * 100)}</span></div>
    <div class="row wrap" style="margin-top:6px"><span class="small">근무 <b class="${st.ap >= n ? "good" : "bad"}">${Math.round(st.ap * 10) / 10}/${n}</b></span><span class="grow"></span>
      <button class="btn sm gold" data-act="ch_shift" data-arg="${st.id}">근무 ⚡1</button><button class="btn sm" data-act="ch_crew" data-arg="${st.id}">알바 ⚡1</button><button class="btn sm" data-act="ch_market" data-arg="${st.id}">배달통 ⚡1</button></div>
    <div class="row wrap small" style="margin-top:6px"><span class="muted">한 마리</span><div class="stepper"><button data-chprice="${st.id}:-0.02">−</button><b>${pr.toLocaleString()}원</b><button data-chprice="${st.id}:0.02">+</button></div><span class="grow"></span>
      <button class="btn sm" data-act="ch_mgr" data-arg="${st.id}">${st.mgr ? "점장 해지" : "점장 고용"}</button></div>
    <div class="row wrap" style="margin-top:6px">
      ${C.lv >= 2 ? `<button class="btn sm" data-chtg="${st.id}:app">${st.app ? "자사 앱 끄기" : "자사 앱 할인 켜기"}</button>` : ""}
      ${C.lv >= 3 ? `<button class="btn sm" data-chtg="${st.id}:fam">${st.fam ? "가족 빼기" : "가족 투입"}</button><button class="btn sm" data-chtg="${st.id}:inc">${st.inc ? "인센티브 끄기" : "인센티브 켜기"}</button>` : ""}</div>
    <div class="row wrap" style="margin-top:6px"><span class="tiny muted">누적 ${won(Math.round(st.cum))} / 투자 ${won(st.invested)}</span><span class="grow"></span>
      ${st.months >= 1 ? `<button class="btn sm" data-chsell="${st.id}">양수도 ${won(sp)}</button><button class="btn sm danger" data-chclose="${st.id}">폐점${cc.pen ? `(위약금 ${won(cc.pen)})` : ""}</button>` : ""}</div>
    ${meter(Math.max(0, st.cum), st.invested, "var(--gold)")}
  </div></div>`;
}

export default {
  key: "chicken", ic: "coin", bg: "pub", sjBg: "pub",
  icons: { ch_prep: "brief", ch_shift: "wrench", ch_market: "mega", ch_crew: "users", ch_mgr: "users" },
  tile: (S) => (S.chicken.stores.length ? `${S.chicken.stores.length}곳 · ★${S.chicken.stores[0].rating.toFixed(1)}` : ["상담 전", "교육 전", "오픈 전"][S.chicken.step] || "준비 중"),
  side: (S) => `치킨 Lv${S.chicken.lv}`,
  quick: (S) => (S.chicken.step < 3 ? "ch_prep" : S.chicken.stores.length ? "ch_shift" : null),
  defaultArg(S, id) { const ss = S.chicken.stores; if (!ss.length) return undefined; return [...ss].sort((a, b) => a.ap / CH.needAp(S, a) - b.ap / CH.needAp(S, b))[0].id; },
  fullBg: "pub",
  cine: { ch_sign: ["meeting", "가맹 계약"], ch_lv2: ["pub", "배달통 별점"], ch_lv3: ["dinner", "가족 경영"], ch_lv4: ["pub", "BEP 돌파"], ch_lv5: ["alley", "치킨 3형제"], ch_end_ceo: ["pub", "엔딩"], ch_end_hq: ["alley", "엔딩"], ch_end_exit: ["pub", "엔딩"] },
  auto(c) { const S = c.S, C = S.chicken; S.cash += 6000; C.step = 2; C.trained = true; S.ap = Math.max(S.ap, 3); c.E.act(S, "ch_prep"); if (S.pending) c.E.choose(S, 1); const st = C.stores[0]; if (st) st.mgr = true; },
  page(c) {
    const { S, esc, won, boardHead, actRow, meter } = c, C = S.chicken, LV = CH.LV, lv = C.lv, last = C.hist.at(-1) || 0;
    const inv = C.stores.reduce((a, st) => a + st.invested, 0), cum = C.stores.reduce((a, st) => a + st.cum, 0);
    const nx = LV[Math.min(5, lv)];
    // 다음 단계까지 진행도
    const st1 = C.stores[0];
    let prog = 0;
    if (lv === 0) prog = C.step / 3;
    else if (lv === 1) prog = st1 ? Math.min(1, (st1.revOk / 3) * 0.5 + Math.min(1, Math.max(0, (st1.rating - 4.4) / 0.4)) * 0.5) : 0;
    else if (lv === 2) prog = Math.min(1, (st1?.last?.rev || 0) / (5000 * (S.pi || 1)));
    else if (lv === 3) prog = st1 ? Math.min(1, Math.max(0, st1.cum) / st1.invested) : 0;
    else if (lv === 4) prog = Math.min(1, C.stores.length / 3);
    else prog = 1;
    return `${boardHead("chicken")}<div class="card"><h3>${esc("황금닭")} 치킨 <small>Lv${lv} ${esc(LV[lv].n)}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last >= 0 ? "good" : "bad"}">${won(last)}</div></div><div><div class="k">매장</div><div class="v">${C.stores.length}/3곳</div></div>
      <div><div class="k">회수</div><div class="v gold">${inv ? `${pct(Math.max(0, cum), inv)}%` : "-"}</div></div>${C.scandal ? `<div><div class="k">불매</div><div class="v bad">${C.scandal}달</div></div>` : ""}${C.costUp ? `<div><div class="k">닭값 급등</div><div class="v bad">${C.costUp}달</div></div>` : ""}</div>
      ${lv < 5 ? `<div class="small" style="margin-top:6px">다음 <b class="gold">Lv${lv + 1} ${esc(LV[lv + 1].n)}</b>: ${esc(nx.need)}</div>${meter(prog * 100, 100, "var(--gold)")}<div class="tiny muted">열리는 것: ${esc(LV[lv + 1].open)}</div>` : `<div class="small good" style="margin-top:6px">치킨 3형제 완성. 법인 전환·본업 전환을 고를 수 있어요.</div>`}
      <div class="tiny muted" style="margin-top:6px">월매출에서 재료 47%·배달수수료 15%·인건비 17%·임차료 10%를 빼면 11% 남아요. 직접 튀기면 인건비가 줄고 별점이 올라요. 알바가 그만두면 그 빈자리는 내가 튀겨야 해요. 연말·여름이 성수기, 2월이 비수기. 매년 1월 최저임금이 올라요.</div></div>
      ${C.stores.length || C.loan > 0 ? dangerCard(c) : ""}
      ${C.step < 3 ? prepCard(c) : ""}
      ${C.stores.map((st) => storeCard(c, st)).join("")}
      ${C.step >= 3 ? `<div class="acts" style="padding:0">${actRow("ch_prep", undefined, C.stores.length ? `${C.stores.length + 1}호점 출점 상담` : "다시 창업하기(견적·계약)")}</div>` : ""}
      ${lv >= 5 && !C.corp ? `<div class="row" style="margin-top:6px"><span class="grow tiny muted">법인 전환: 세무 관리로 기타 비용이 줄어요</span><button class="btn sm gold" data-chcorp="1">법인 전환</button></div>` : ""}
      ${C.step >= 3 && !C.stores.length ? `<div class="card tiny muted">매장이 없어요. 투잡 탐색에서 치킨을 접거나, 자금이 되면 다시 창업할 수 있어요.</div>` : ""}`;
  },
  bind(c) {
    const { q, save, render, toast, openWin, closeWin, won } = c;
    q("[data-chprice]", (el) => { const [id, d] = el.dataset.chprice.split(":"); CH.setPrice(c.S, id, +d); save(); render(); });
    q("[data-chtg]", (el) => { const [id, k] = el.dataset.chtg.split(":"); CH.toggle(c.S, id, k); save(); render(); });
    q("[data-chcorp]", () => { const m = CH.corp(c.S); save(); render(); toast([], m); });
    const confirm = (title, body, fn) => openWin(`<h2>${c.esc(title)}</h2><div class="small">${body}</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>취소</button><button class="btn gold grow" data-chyes>확인</button></div>`, (w) => { w.querySelector("[data-chyes]").onclick = () => { const lines = fn(); closeWin(); save(); render(); toast(lines, ""); }; });
    q("[data-chsell]", (el) => { const st = c.S.chicken.stores.find((x) => x.id === el.dataset.chsell); if (!st) return; const p = CH.sellPrice(c.S, st); confirm(`${st.name} 양수도`, `권리금 포함 약 <b class="gold">${won(p)}</b>에 넘겨요. 남은 창업대출 ${won(st.loan || 0)}은 바로 갚아요. 누적 순익 ${won(Math.round(st.cum))} + 양수도 ${won(p)} vs 투자 ${won(st.invested)}.`, () => CH.sellStore(c.S, st.id)); });
    q("[data-chclose]", (el) => { const st = c.S.chicken.stores.find((x) => x.id === el.dataset.chclose); if (!st) return; const cc = CH.closeCost(c.S, st); confirm(`${st.name} 폐점`, `가맹 계약 5년 안 폐점은 위약금 <b class="bad">${won(cc.pen)}</b>. 원상복구비를 빼고 보증금 ${won(cc.back)}을 돌려받아요. 남은 창업대출 ${won(st.loan || 0)}은 바로 갚아야 해요. 양수도보다 거의 항상 손해예요.`, () => CH.closeStore(c.S, st.id)); });
  },
};
