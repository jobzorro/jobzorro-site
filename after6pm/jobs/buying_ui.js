// 해외 구매대행 화면(11-27, 1단계): 위에 운전자금·환불 준비금, 가운데에 주문 카드가 왼쪽에서 오른쪽으로 흘러가는 줄, 아래에 아이템·방식 단계·사람
import P, * as BY from "../engine/jobs/buying.js";

const A = BY.BY_BAL;
function css() {
  if (document.getElementById("by-css")) return;
  const st = document.createElement("style"); st.id = "by-css";
  st.textContent = `
.by-bank{display:flex;flex-direction:column;gap:7px;margin-top:6px}
.by-bar{height:10px;border-radius:6px;background:var(--line);overflow:hidden;display:flex}
.by-bar i{display:block;height:100%}.by-bar i.f{background:var(--green)}.by-bar i.t{background:var(--gold)}.by-bar i.r{background:var(--pink,#e58)}
.by-btns{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.by-btns .btn{padding:4px 8px;font-size:12px}
.by-flow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:8px}
.by-col{min-width:0;border:1px solid var(--line);border-radius:10px;padding:4px 3px 5px;background:var(--panel2);min-height:92px}
.by-col h4{margin:0 0 4px;font-size:10.5px;font-weight:700;text-align:center;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.by-col.in h4{color:var(--green)}
.by-c{border:1px solid var(--line);border-radius:7px;padding:3px 4px;margin-top:3px;font-size:10.5px;line-height:1.3;background:var(--panel,transparent);min-width:0}
.by-c b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.by-c.q{border-style:dashed}.by-c.h{border-color:var(--red);color:var(--red)}.by-c.p{border-color:var(--green)}.by-c.o{border-color:var(--gold)}
.by-arrow{text-align:center;font-size:10.5px;color:var(--muted);margin-top:3px;letter-spacing:.5px}
.by-it{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--panel2);margin-top:6px;min-width:0}
.by-it.dy{border-color:var(--red)}.by-it.cd{border-style:dashed}
.by-it .nm{font-weight:700;font-size:13.5px}.by-tg{font-size:11px;border-radius:99px;padding:0 7px;border:1px solid var(--line);color:var(--muted);margin-left:4px;white-space:nowrap}
.by-tg.r{border-color:var(--red);color:var(--red)}.by-tg.g{border-color:var(--gold);color:var(--gold)}
.by-st{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 10px;margin-top:5px;font-size:11.5px;color:var(--muted)}
.by-st b{color:var(--text,inherit);font-weight:600}
.by-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:8px}
.by-g div{border:1px solid var(--line);border-radius:10px;padding:6px 2px;text-align:center;font-size:11.5px;color:var(--muted);min-width:0}
.by-g div.on{border-color:var(--green);color:var(--green)}.by-g div.cur{border-color:var(--gold);color:var(--gold);font-weight:700}
.by-warn{border:1px solid var(--red);border-radius:10px;padding:7px 10px;font-size:12.5px;color:var(--red);margin-top:8px}`;
  document.head.appendChild(st);
}
const pct = (v) => Math.round(v * 100);
const rg = (a, f, unit = "") => { const x = f(a[0]), y = f(a[1]); return x === y ? `${x}${unit}` : `${x}~${y}${unit}`; }; // 흐리게 보이는 값은 범위로
const UTAG = '<span class="tag gold" style="font-size:10.5px">업의 이해도 덕분</span>'; // 11-28 이해도 효과가 적용된 자리에 다는 꼬리표
const stats = (S, it) => { const v = BY.seeOf(S, it); return `<div class="by-st"><span>마진 <b>×${rg(v.mg, (x) => x.toFixed(1))}</b></span><span>경쟁 <b>${rg(v.comp, pct, "%")}</b></span><span>반품률 <b>${rg(v.ret, pct, "%")}</b></span><span>인증 위험 <b>${rg(v.cert, pct, "%")}</b></span><span>유행 수명 <b>${rg(v.life, Math.round, "달")}</b></span></div>${v.und ? `<div class="tiny muted" style="margin-top:3px">${UTAG} 반품률 · 인증 위험이 정확히 보여요</div>` : ""}`; };

export default {
  key: "buying",
  icons: { by_find: "search", by_pick: "spark", by_post: "pen", by_reg: "brief", by_fund: "coin", by_quote: "msg", by_order: "coin", by_cs: "msg", by_book: "chart", by_ad: "mega", by_hire: "users", by_care: "heart", by_up: "bld", by_buy: "door", by_smug: "door", by_gate: "bld", by_sales: "users" },
  bg: "online", sjBg: "online", fullBg: "dealing",
  tile: (S) => (S.buying.mode >= 4 ? `수입 유통사 · 거래처 ${S.buying.dl}곳` : S.buying.mode >= 2 ? `${BY.LV_N[S.buying.mode]} · 진행 ${BY.inflight(S.buying)}건` : `비교 글 ${S.buying.postN}편`),
  side: (S) => `구매대행 · ${BY.LV_N[S.buying.mode]}`,
  quick: (S) => { const B = S.buying; return B.mode < 2 ? (B.postN >= A.postNeed && B.regN < 3 ? "by_reg" : "by_post") : B.staff && B.care < BY.careNeed(B) ? "by_care" : B.q.length ? "by_order" : BY.inqAll(B) >= 1 ? "by_quote" : B.csN < BY.csNeed(B) ? "by_cs" : !B.bk ? "by_book" : "by_post"; },
  defaultArg: (S, id) => (id === "by_fund" ? "w+100" : id === "by_pick" ? "0" : undefined),
  cine: { by_first: ["online", "구매대행"], by_m40: ["online", "구매대행"], by_shop: ["dealing", "구매대행"], by_co: ["dealing", "구매대행"], by_end_co: ["dealing", "구매대행 엔딩"], by_end_solo: ["online", "구매대행 엔딩"], by_end_lost: ["online", "구매대행 엔딩"] },
  auto(c) { // 시험 주소(#auto18-buying-byon): 주문 대행형 보드가 바로 보이게 꾸민다
    const S = c.S, B = S.buying, R = c.E.R(S); S.cash += 1500; Object.assign(B, { postN: 12, posts: 12, regN: 3, regT: null, mode: 2, wc: 600, rsv: 40, done: 60, best: 25, best3: 25 });
    P.act(S, R, "by_find"); P.act(S, R, "by_pick", "0"); P.act(S, R, "by_find"); P.act(S, R, "by_pick", "1"); P.monthStart(S, R); P.act(S, R, "by_quote"); P.act(S, R, "by_order");
    B.orders.forEach((o, i) => { if (i % 3 === 1) { o.t = S.t - 1; o.due = S.t + 1; } else if (i % 3 === 2) { o.t = S.t - 1; o.due = S.t; } }); P.monthStart(S, R); P.act(S, R, "by_find");
  },
  page(c) {
    css();
    const { S, won, esc, actRow, boardHead, meter } = c, B = S.buying, L = B.last, Pi = S.pi || 1, mode = B.mode;
    const tied = BY.tied(B), wcAll = B.wc + tied, wcNeed = BY.wcNeed(S), rNeed = BY.rsvNeed(S), each = BY.orderCost(S), fxd = B.fx0 ? (B.fx / B.fx0 - 1) * 100 : 0;
    const head = `${boardHead("buying")}<div class="card"><h3>해외 구매대행 <small>${BY.LV_N[mode]}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${(L?.profit ?? 0) >= 0 ? "good" : "bad"}">${won(L?.profit ?? 0)}</div></div><div><div class="k">이번 달 주문</div><div class="v">${B.mOrd || 0}건</div></div><div><div class="k">별점</div><div class="v">★${B.rating.toFixed(2)}</div></div><div><div class="k">환율</div><div class="v ${fxd > 0.5 ? "bad" : fxd < -0.5 ? "good" : ""}">${B.fx.toFixed(2)}${Math.abs(fxd) >= 0.5 ? (fxd > 0 ? " ▲" : " ▼") : ""}</div></div></div>
      ${B.haltT > S.t ? `<div class="by-warn">판매 정지 중이에요(${B.haltT - S.t}달 남음). 견적·재고 판매가 멈추고 거래처 납품은 절반이에요.</div>` : ""}
      <div class="tiny muted" style="margin-top:6px">${mode === 1 ? "지금은 <b>소개형</b>이에요. 비교 글에서 해외 상점으로 이어 주고 소개비를 받아요. 묶이는 돈이 없어요." : `주문 한 건마다 날짜가 셋이에요. <b class="gold">주문 → 배송 → 입금.</b> 그 사이 건당 ${won(each)}이 2~6주 묶여요. 주문이 늘수록 통장이 먼저 비어요.`}</div></div>`;
    // 통장: 운전자금(쓸 수 있는 돈 + 묶인 돈) · 환불 준비금
    const wmax = Math.max(wcAll, wcNeed, 1), bank = mode >= 2 || B.regN >= 3 || wcAll > 0 ? `<div class="card"><h3>구매대행 통장 <small>현금 ${won(S.cash)}</small></h3><div class="by-bank">
      <div><div class="row"><b class="small">운전자금</b><span class="grow"></span><span class="small"><span class="good">쓸 수 있는 ${won(B.wc)}</span> · <span class="gold">묶인 ${won(tied)}</span></span></div>
        <div class="by-bar"><i class="t" style="width:${tied / wmax * 100}%"></i><i class="f" style="width:${B.wc / wmax * 100}%"></i></div>
        <div class="tiny muted" style="margin-top:2px">지금 넣을 수 있는 주문 ${Math.max(0, Math.floor(B.wc / each))}건 · 권장 ${won(wcNeed)}</div></div>
      <div><div class="row"><b class="small">환불 준비금</b><span class="grow"></span><span class="small ${B.rsv < rNeed * 0.6 && BY.inflight(B) ? "bad" : ""}">${won(B.rsv)}</span></div>
        <div class="by-bar"><i class="r" style="width:${Math.min(100, B.rsv / Math.max(rNeed, 1) * 100)}%"></i></div>
        <div class="tiny muted" style="margin-top:2px">반품이 오면 여기서 먼저 돌려줘요. 모자라면 환불이 늦어 신고가 들어와요 · 권장 ${won(rNeed)}</div></div></div>
      <div class="by-btns"><button class="btn sm gold" data-act="by_fund" data-arg="w+100">운전자금 +100만</button><button class="btn sm" data-act="by_fund" data-arg="w-100">−100만</button><button class="btn sm gold" data-act="by_fund" data-arg="r+30">준비금 +30만</button><button class="btn sm" data-act="by_fund" data-arg="r-30">−30만</button></div>
      ${B.dry || (mode >= 2 && B.q.length && B.wc < each) ? `<div class="by-warn">운전자금이 바닥났어요. 확정된 견적 ${BY.quoted(B)}건을 넣지 못하고 있어요.</div>` : ""}</div>` : "";
    // 주문이 흘러가는 줄
    const card = (cls, nm, sub) => `<div class="by-c ${cls}"><b>${esc(nm)}</b>${esc(sub)}</div>`;
    const cols = [[], [], [], [], []], nmOf = (id) => B.items.find((x) => x.id === id)?.n || "주문";
    for (const it of B.items) if ((it.inq || 0) > 0) cols[0].push(card("q", it.n, `문의 ${it.inq}건`));
    for (const q of B.q) cols[0].push(card(q.t < S.t ? "h" : "o", nmOf(q.it), `확정 ${q.n}건${q.t < S.t ? " · 기한 임박" : ""}`));
    for (const o of B.orders) cols[BY.colOf(S, o)].push(card(o.hold ? "h" : o.kind ? "q" : "", o.nm, o.kind ? `${won(o.out)} 대기` : `${o.n}건 · ${won(o.out)}`));
    if (L?.paidN) cols[4].push(card("p", "지난달 입금", `${L.paidN}건 · 수수료 ${won(L.paidFee)}`)); if (L?.retN) cols[4].push(card("h", "반품", `${L.retN}건`));
    const CN = ["견적", "주문·통관", "배송", "확정·정산", "입금"];
    const flow = mode >= 2 ? `<div class="sec">주문이 흘러가는 줄 <span class="muted small">· 진행 ${BY.inflight(B)}건</span></div>
      <div class="by-flow">${cols.map((x, i) => `<div class="by-col ${i === 4 ? "in" : ""}"><h4>${CN[i]}</h4>${x.slice(0, 5).join("") || `<div class="tiny muted" style="text-align:center;margin-top:14px">–</div>`}${x.length > 5 ? `<div class="tiny muted" style="text-align:center">+${x.length - 5}</div>` : ""}</div>`).join("")}</div>
      <div class="by-arrow">내 돈이 나감 → → → 2~6주 → → → 돌아옴</div>
      <div class="acts" style="padding:0;margin-top:8px">${actRow("by_quote")}${actRow("by_order")}${actRow("by_cs", undefined, `배송 안내·문의 답하기 (${B.csN}/${Math.max(BY.csNeed(B), 0)})`)}${actRow("by_book", undefined, B.bk ? "정산 대조·장부 (이번 달 끝)" : "정산 대조·장부")}</div>` : "";
    // 아이템
    const item = (it) => { const tr = BY.trend(it), left = Math.round(it.life - it.age), dying = left <= 6; return `<div class="by-it ${dying ? "dy" : ""}"><div class="row"><span class="nm grow">${esc(it.n)}<span class="by-tg">${esc(it.cat)}</span>${dying ? `<span class="by-tg r">${left > 0 ? `유행 ${left}달 남음` : "유행 끝"}</span>` : ""}${it.stock > 0 ? `<span class="by-tg g">재고 ${it.stock}개</span>` : ""}</span>${mode >= 3 ? `<button class="btn sm gold" data-act="by_buy" data-arg="${it.id}">매입 ⚡1</button>` : ""}</div>
      <div class="row" style="margin-top:4px"><span class="tiny muted">유행</span><div class="grow">${meter(tr, 1, dying ? "var(--red)" : "var(--gold)")}</div></div>${stats(S, it)}</div>`; };
    const U = BY.undFx(S); // 11-28 업의 이해도 효과(스위치가 꺼져 있으면 예전 그대로)
    const cand = (it, i) => `<div class="by-it cd"><div class="row"><span class="nm grow">${esc(it.n)}<span class="by-tg">${esc(it.cat)}</span></span><button class="btn sm gold" data-act="by_pick" data-arg="${i}">고르기</button></div>${stats(S, it)}${U.entry && BY.newCat(S, it) ? `<div class="tiny muted" style="margin-top:3px">${UTAG} 새 분야 · 규격 설명 ${BY.BY_UND.spec0}에서 시작</div>` : ""}</div>`;
    const specs = Object.entries(B.spec || {}).filter(([, v]) => v >= 1).map(([k, v]) => `<span class="by-tg">${esc(k)} 규격 설명 ${Math.round(v)}</span>`).join("");
    const items = `<div class="card"><h3>아이템 <small>${B.items.length}/${BY.slots(B)}개</small></h3>
      <div class="tiny muted">유행에는 수명이 있어요. 식기 전에 다음 아이템을 찾아 둬요. 한 분야로 좁히면 규격 설명이 쌓여 반품이 줄어요.</div>
      ${B.items.map(item).join("") || `<div class="tiny muted" style="margin-top:6px">아직 고른 아이템이 없어요.</div>`}${specs ? `<div style="margin-top:6px">${specs}</div>` : ""}
      ${B.cands.length ? `<div class="sec" style="margin-top:10px">후보 셋 <span class="muted small">· 숫자 ${Math.round(S.st.num || 0)}${(S.st.num || 0) < 90 ? " (높을수록 정확히 보여요)" : ""}</span></div>${B.cands.map(cand).join("")}${U.on && !U.see ? `<div class="tiny muted" style="margin-top:4px;opacity:.7">잠김 · 업의 이해도 숙련(300점)부터 반품률과 인증 위험이 정확히 보여요. 지금 ${Math.round(U.v).toLocaleString()}점</div>` : ""}${B.items.length >= BY.slots(B) ? `<div class="tiny muted" style="margin-top:4px">자리가 찼어요. 고르면 가장 식은 아이템과 바뀌어요.</div>` : ""}` : ""}
      <div class="acts" style="padding:0;margin-top:8px">${actRow("by_find")}${actRow("by_post", undefined, `비교 글 쓰기 (${B.postN}편)`)}</div></div>`;
    // 방식 네 단계
    const us = BY.upStep(B), gs = BY.gateStep(B);
    const next = mode === 1 ? `<div class="tiny" style="margin-top:6px"><b>주문 대행형으로</b> · 비교 글 ${Math.min(B.postN, A.postNeed)}/${A.postNeed}편 → 등록 세 가지 ${B.regN}/3${B.regT != null ? " (처리 중)" : ""} → 운전자금 ${won(A.wc0 * Pi)}</div>
        <div class="by-g" style="grid-template-columns:repeat(3,minmax(0,1fr))">${BY.REGS.map(([, n], i) => `<div class="${i < B.regN ? "on" : i === B.regN ? "cur" : ""}">${i < B.regN ? "✓ " : ""}${n} 등록</div>`).join("")}</div><div class="acts" style="padding:0;margin-top:6px">${actRow("by_reg")}</div>`
      : mode === 2 ? `<div class="tiny" style="margin-top:6px"><b>직접 매입형으로</b> · 누적 ${B.done}/${A.m3.need}건, 별점 ${A.m3.star} 이상. 그다음 수입 신고 → 창고 → 인증${B.upT != null ? " (신고 처리 중)" : ""}</div>
        <div class="by-g" style="grid-template-columns:repeat(3,minmax(0,1fr))">${BY.UPS.map(([k, n], i) => `<div class="${B.up[k] ? "on" : i === us ? "cur" : ""}">${B.up[k] ? "✓ " : ""}${n}</div>`).join("")}</div><div class="acts" style="padding:0;margin-top:6px">${actRow("by_up", undefined, us >= 0 ? `직접 매입 준비: ${BY.UPS[us][1]}` : undefined)}</div>
        <div class="tiny muted" style="margin-top:6px">개인 통관으로 재고를 쌓는 것은 구매대행이 아니에요. 할 수는 있지만 걸리면 큰돈을 물고 등록까지 잃을 수 있어요.</div><div class="acts" style="padding:0;margin-top:4px">${actRow("by_smug")}</div>`
      : mode === 3 ? `<div class="tiny" style="margin-top:6px"><b>본업화 관문 ${gs < 0 ? "모두 통과" : `${gs + 1}/4`}</b>${gs >= 0 ? ` · ${BY.GATES[gs][1]}: ${esc(BY.GATES[gs][2])}${BY.GATES[gs][0] === "corp" ? ` (${B.corpN}/${A.gate.corpN}${B.corpT != null ? " · 처리 중, 그동안 판매 −40%" : ""})` : ""}` : ""}</div>
        <div class="by-g">${BY.GATES.map(([k, n], i) => `<div class="${B.g[k] ? "on" : i === gs ? "cur" : ""}">${B.g[k] ? "✓ " : ""}${n}</div>`).join("")}</div><div class="acts" style="padding:0;margin-top:6px">${actRow("by_gate", undefined, gs >= 0 ? `관문 풀기: ${BY.GATES[gs][1]}` : undefined)}</div>`
      : `<div class="kv" style="margin-top:6px"><div><div class="k">거래처</div><div class="v">${B.dl}/${BY.dealerCap(S)}곳</div></div><div><div class="k">직원이 맡는 곳</div><div class="v ${B.dl > A.m4.self + B.staff * A.m4.team ? "bad" : "good"}">${Math.min(B.dl, A.m4.self + B.staff * A.m4.team)}곳</div></div><div><div class="k">묶인 물량</div><div class="v">${won(B.flt)}</div></div></div>
        <div class="tiny muted" style="margin-top:4px">직원 한 명이 거래처 ${A.m4.team}곳을 맡아요. ${S.co.quit || S.co.fired ? "" : `회사를 다니는 동안에는 거래처 ${A.m4.cap[0]}곳이 한계예요(그만두면 ${A.m4.cap[1]}곳).`}</div><div class="acts" style="padding:0;margin-top:6px">${actRow("by_sales")}${B.dl > 0 ? actRow("by_sales", "-", "거래처 한 곳 정리(계약 종료)") : ""}</div>`;
    const stage = `<div class="card"><h3>방식 <small>${mode}/4단계</small></h3><div class="by-g">${[1, 2, 3, 4].map((m) => `<div class="${m < mode ? "on" : m === mode ? "cur" : ""}">${m < mode ? "✓ " : ""}${BY.LV_N[m]}</div>`).join("")}</div>${next}</div>`;
    // 사람·광고
    const people = mode >= 2 ? `<div class="card"><h3>사람과 광고 <small>직원 ${B.staff}/${BY.staffCap(B)}명</small></h3>
      <div class="kv"><div><div class="k">사람 챙기기</div><div class="v ${B.care >= BY.careNeed(B) ? "good" : "bad"}">${B.care}/${BY.careNeed(B)}</div></div><div><div class="k">월급(1인)</div><div class="v">${won(A.staff.wage[mode - 1] * Pi)}</div></div><div><div class="k">광고</div><div class="v">${B.ad || 0}단계</div></div></div>
      <div class="tiny muted" style="margin-top:4px">직원 한 명이 견적·문의 ${A.staff.cover}건을 맡아요. 한 명에 '사람 챙기기' 행동력 0.5가 들어요. 광고는 문의를 늘리지만 운전자금이 더 빨리 말라요.</div>
      <div class="acts" style="padding:0;margin-top:6px">${B.staff ? actRow("by_care") : ""}${actRow("by_hire", undefined, "응대 직원 채용")}${B.staff ? actRow("by_hire", "-", "직원 한 명 내보내기") : ""}${actRow("by_ad", undefined, `광고 단계 바꾸기 (지금 ${B.ad || 0} · 월 ${won(A.ad[B.ad || 0] * Pi)})`)}</div></div>` : "";
    return `${head}${bank}${flow}${items}${stage}${people}`;
  },
};
