// v4.28 파티룸·에어씨앤씨 조작 패널: 동네 가격표·성수기 달력·가격 반응 / 후기 관리 / 명의 팀(에어)
// ui.js 가 ctx = { S, esc, won, meter, actRow } 를 넘겨 부른다. 버튼 처리는 ui.js 의 q(...) 에 있다(data-revev·data-abpeak·data-abfee·data-abpay).
import * as D from "./engine/defs.js";
import * as PR from "./engine/pr.js";
import * as AB from "./engine/abnb.js";
import * as UC from "./engine/ucafe.js";

const pc = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;
const elWord = (el) => (el <= 0.6 ? "아주 둔함" : el <= 0.9 ? "둔함" : el >= 1.4 ? "아주 민감" : el >= 1.2 ? "민감" : "보통");
// 경쟁사 표 한 개: rows [{n, price, star, rev, cut, me}]
function table(c, rows, unit) {
  return `<div style="display:flex;flex-direction:column;gap:2px;margin:6px 0">
    <div class="tiny muted" style="display:grid;grid-template-columns:1fr 54px 44px 52px;gap:4px;padding:0 6px"><span>가게</span><span style="text-align:right">${unit}</span><span style="text-align:right">별점</span><span style="text-align:right">후기</span></div>
    ${rows.map((x) => `<div class="small" style="display:grid;grid-template-columns:1fr 54px 44px 52px;gap:4px;padding:5px 6px;border-radius:8px;background:${x.me ? "rgba(245,192,78,.12)" : "var(--panel2)"};${x.me ? "border:1px solid var(--gold)" : ""}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.me ? "<b class=\"gold\">내 " : ""}${c.esc(x.n)}${x.me ? "</b>" : ""}${x.cut ? ' <span class="tag red">특가</span>' : ""}</span><b style="text-align:right">${x.price}만</b><span style="text-align:right" class="gold">★${x.star.toFixed(1)}</span><span style="text-align:right" class="muted">${x.rev.toLocaleString()}</span></div>`).join("")}
  </div>`;
}
function feelLine(f, el, seasonTxt) {
  const cls = f.occ >= 0.03 ? "good" : f.occ <= -0.03 ? "bad" : "";
  return `<div class="tiny">시세보다 <b>${pc(f.diff)}</b> → 예약 <b class="${cls}">${pc(f.occ)}</b> 예상 <span class="muted">(${seasonTxt} · 가격 민감도 ${elWord(el)} ×${el})</span></div>`;
}
// 12달 달력: kind(m) → "dec"|"peak"|"off"|"mid"
function calendar(S, kind) {
  const col = { dec: "var(--red)", peak: "var(--gold)", mid: "var(--panel3)", off: "#3b5b7a" };
  return `<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px;margin-top:6px">${Array.from({ length: 12 }, (_, i) => { const k = kind(i + 1); return `<div style="text-align:center;font-size:11px;padding:4px 0;border-radius:6px;background:${col[k]};color:${k === "mid" ? "var(--muted)" : "#fff"};${i + 1 === S.cal ? "outline:2px solid #fff" : ""}">${i + 1}</div>`; }).join("")}</div>
  <div class="tiny muted" style="margin-top:4px"><span style="color:var(--red)">■</span> 극성수기 <span class="gold">■</span> 성수기 <span style="color:#3b5b7a">■</span> 비수기 · 흰 테두리 = 이번 달</div>`;
}
function revSeg(S, job) {
  const cur = (job === "pr" ? S.pr.revEv : S.ab.revEv) || "none", E = D.PR_REVIEW.ev;
  return `<div class="seg" style="flex-wrap:wrap">${Object.entries(E).map(([k, v]) => `<button style="min-width:calc(50% - 3px);padding:8px" class="${cur === k ? "on" : ""}" data-revev="${job}:${k}">${v.n}</button>`).join("")}</div><div class="tiny muted" style="margin-top:4px">${E[cur].desc}. 비용은 장부 '후기 페이백'.</div>`;
}

// ───────── 파티룸 ─────────
export function prPanels(c) {
  f30Test(c, PR, ["dec", "depoask", "depo", "minor"]);
  const S = c.S, open = S.pr.rooms.filter((x) => x.status === "open"); if (!open.length) return "";
  const SEA = D.PR_SEASON[S.cal - 1], el = SEA.el, pk = PR.isPeak(S.cal), seasonTxt = S.cal === 12 ? "12월 극성수기" : pk ? `${S.cal}월 성수기` : `${S.cal}월 비수기`;
  const market = open.map((rm) => {
    const M = PR.mkt(S, rm.dk), ref = PR.refNow(S, rm), pEff = Math.round(rm.price * PR.peakMult(S, S.cal)), f = { diff: pEff / ref - 1, occ: Math.pow(ref / pEff, el) - 1 };
    const rows = PR.compTable(S, rm).concat([{ n: rm.name.replace(/^\d+호점 /, ""), price: pEff, star: rm.rating, rev: rm.reviews, me: true }]).sort((a, b) => a.price - b.price);
    const war = M.war && S.t < M.war.until;
    const cls = f.occ >= 0.03 ? "good" : f.occ <= -0.03 ? "bad" : "";
    return `<details class="more sp-mk" style="margin-top:6px"><summary><b>${c.esc(rm.name.replace(/^(\d+호점) .*/, "$1"))}</b> ${pEff}만 · 시세 ${pc(f.diff)} · 예약 <span class="${cls}">${pc(f.occ)}</span>${war ? ' <span class="tag red">가격 전쟁</span>' : ""} ▾</summary><div class="more-b"><div class="row small"><b>${c.esc(rm.name)}</b>${war ? `<span class="tag red">가격 전쟁 ${M.war.until - S.t}달</span>` : ""}<span class="grow"></span><span class="tiny muted">경쟁 ${M.comp}곳 중 ${rows.length - 1}곳</span></div>
      ${table(c, rows, "1건")}${feelLine(f, el, seasonTxt)}
      <div class="tiny muted" style="margin-top:4px">기본 가격 ${rm.price}만(지점 카드에서 조절) · 지난달 전기·난방비 <b>${c.won(rm.last?.util || 0)}</b>${rm.last ? ` · 예약 ${rm.last.bookings}건` : ""}</div></div></details>`;
  }).join("");
  const kind = (m) => (m === 12 ? "dec" : PR.isPeak(m) ? "peak" : "off");
  const RK = D.PR_REVIEW;
  const rev0 = open.map((rm) => {
    const top = (rm.reviews || 0) >= RK.top.n && rm.rating >= RK.top.star, L = rm.last;
    return `<div style="background:var(--panel2);border-radius:10px;padding:8px 10px;margin-top:6px"><div class="row small"><b class="grow">${c.esc(rm.name)}</b>${top ? '<span class="tag gold">상위 노출</span>' : ""}</div>
      <div class="tiny">후기 <b>${rm.reviews}</b>/${RK.top.n} · 별점 <b class="${rm.rating >= RK.top.star ? "good" : ""}">${rm.rating.toFixed(2)}</b>/${RK.top.star}${L ? ` · 지난달 새 후기 ${L.newRev ?? "-"}${L.pay ? ` · 페이백 ${c.won(L.pay)}` : ""}${L.disc ? ` · 할인 ${c.won(L.disc)}` : ""}` : ""}</div>
      ${c.meter(Math.min(rm.reviews, RK.top.n), RK.top.n, top ? "var(--gold)" : "var(--pink)")}
      <div class="row" style="margin-top:4px"><span class="tiny ${(rm.unrep || 0) > RK.unrep.max ? "bad" : "muted"}">밀린 답글 ${Math.round(rm.unrep || 0)}개${(rm.unrep || 0) > RK.unrep.max ? " · 별점 깎이는 중" : ""}</span><span class="grow"></span><button class="btn sm" data-act="pr_reply" data-arg="${rm.id}" ${(rm.unrep || 0) >= 1 ? "" : "disabled"}>답글 달기 ⚡1</button></div></div>`;
  }).join("");
  const pk0 = PR.peakSel(S), pkAuto = S.pr.peak == null; // 성수기 가격(옛 성수기 카드)을 이 카드 하나로 합침(v4.27)
  return `<div class="card"><h3>동네 가격표 <small>${seasonTxt} · ${pkAuto ? "동네 시세 따라감" : `12월 ${pk0 === 1 ? "그대로" : `+${Math.round((pk0 - 1) * 100)}%`}`}</small></h3>${calendar(S, kind)}
    <div class="seg" style="margin-top:8px">${D.PR_PEAK.map((v) => `<button class="${!pkAuto && pk0 === v ? "on" : ""}" data-peak="${v}">${v === 1 ? "그대로" : `+${Math.round((v - 1) * 100)}%`}</button>`).join("")}</div>${market}
    ${more("경쟁사·관리비·성수기 가격 규칙: 경쟁사도 성수기엔 올리고 비수기엔 내려요. 표의 내 가격은 성수기 버튼까지 붙은 이번 달 실제 가격이에요. 관리비(전기·수도·온돌 난방)는 예약이 많을수록 늘어요. 12월엔 평일·주말 모두 값이 올라 동네가 평소의 1.5~2배를 받아요. 그래도 주말이 다 차고 평일도 차요. 버튼을 안 고르면 동네 시세를 따라가요(12월 +50%, 1·7·8·11월 +20%, 2월 +10%). 버튼은 12월 배율이고, 고르면 1·7·8·11월에는 그 절반이 붙어요. 2월은 늘 +10%, 나머지 달은 지점별 기본 가격 그대로예요.")}</div>
  <div class="card"><h3>후기 관리 <small>후기 ${RK.top.n}개·별점 ${RK.top.star}면 상위 노출(예약 +${Math.round(RK.top.occ * 100)}%)</small></h3>${revSeg(S, "pr")}
    ${more(`후기 규칙: 후기가 적으면 예약이 최대 ${Math.round((1 - RK.cntLo) * 100)}% 덜 들어와요. 답글이 ${RK.unrep.max}개 넘게 밀리면 별점이 깎이고, 답글을 단 달은 별점이 올라요. 악성 후기·별점 테러는 사건으로 와요. 지점별 후기·답글은 지점 카드에 있어요.`)}</div>
  ${prRules(c)}`;
}

// ───────── 에어씨앤씨 ─────────
export function abPanels(c) {
  f30Test(c, AB, ["clean", "race", "long", "nb"]);
  const S = c.S, A = S.ab, U = A.units; if (!U.length) return "";
  const p = A.peak || 1, rks = [...new Set(U.map((u) => u.rk))];
  const kind = (m) => (rks.some((rk) => AB.isPeakAb(rk, m)) ? (m === 12 ? "dec" : "peak") : rks.every((rk) => AB.seasonKind(rk, m) === "off") ? "off" : "mid");
  const market = U.map((u) => {
    const ref = AB.refNow(S, u), pEff = Math.round(AB.adrNow(S, u)), el = AB.elOf(u.rk, S.cal), sk = AB.seasonKind(u.rk, S.cal), f = { diff: pEff / ref - 1, occ: Math.pow(ref / pEff, el) - 1 };
    const rows = AB.compTable(S, u).concat([{ n: u.name.replace(/^\d+호 /, ""), price: pEff, star: u.rating, rev: u.reviews || 0, me: true }]).sort((a, b) => a.price - b.price);
    const w = A.war?.[u.rk], war = w && S.t < w.until;
    const cls = f.occ >= 0.03 ? "good" : f.occ <= -0.03 ? "bad" : "";
    return `<details class="more sp-mk" style="margin-top:6px"><summary><b>${c.esc(u.name.replace(/^(\d+호) (\S+).*/, "$1 $2"))}</b> ${pEff}만 · 시세 ${pc(f.diff)} · 예약 <span class="${cls}">${pc(f.occ)}</span>${war ? ' <span class="tag red">가격 전쟁</span>' : ""} ▾</summary><div class="more-b"><div class="row small"><b>${c.esc(u.name)}</b>${war ? `<span class="tag red">가격 전쟁 ${w.until - S.t}달</span>` : ""}</div>
      ${table(c, rows, "1박")}${feelLine(f, el, `${S.cal}월 ${sk === "peak" ? "성수기" : sk === "off" ? "비수기" : "보통"}`)}
      <div class="tiny muted" style="margin-top:4px">기본 1박 ${u.adr}만(숙소 카드에서 조절) · 지난달 전기·난방비 <b>${c.won(u.last?.util || 0)}</b>${u.last ? ` · ${u.last.nights}박` : ""}</div></div></details>`;
  }).join("");
  const RK = D.PR_REVIEW, sumRev = U.reduce((a, u) => a + (u.reviews || 0), 0), minStar = Math.min(...U.map((u) => u.rating));
  const rev0 = U.map((u) => `<div class="row" style="background:var(--panel2);border-radius:10px;padding:6px 10px;margin-top:6px"><div class="grow"><div class="small"><b>${c.esc(u.name)}</b></div><div class="tiny">후기 ${u.reviews || 0} · ★${u.rating.toFixed(2)}${u.last?.newRev != null ? ` · 지난달 +${u.last.newRev}${u.last.pay ? ` · 페이백 ${c.won(u.last.pay)}` : ""}` : ""} · <span class="${(u.unrep || 0) > RK.unrep.max ? "bad" : "muted"}">밀린 답글 ${Math.round(u.unrep || 0)}</span></div></div><button class="btn sm" data-act="ab_reply" data-arg="${u.id}" ${(u.unrep || 0) >= 1 ? "" : "disabled"}>답글 ⚡1</button></div>`).join("");
  return `<div class="card"><h3>주변 숙소 가격표 <small>성수기 1박 ${p === 1 ? "그대로" : `+${Math.round((p - 1) * 100)}%`}</small></h3>${calendar(S, kind)}
    <div class="seg" style="margin-top:8px">${D.PRICE_K.abPeak.map((v) => `<button class="${p === v ? "on" : ""}" data-abpeak="${v}">${v === 1 ? "그대로" : `+${Math.round((v - 1) * 100)}%`}</button>`).join("")}</div>
    ${more("성수기 버튼은 각 숙소 지역의 성수기 달에만 붙어요(홍대 4·10·12월, 해운대 7·8월…).")}${market}</div>
  <div class="card"><h3>후기 관리 <small>${A.super ? "★ 슈퍼호스트" : `슈퍼호스트: 모든 숙소 ★4.8 + 후기 ${RK.abSuperN}개`}</small></h3>
    <div class="tiny">후기 합계 <b>${sumRev}</b>/${RK.abSuperN} · 가장 낮은 별점 <b class="${minStar >= 4.8 ? "good" : "bad"}">${minStar.toFixed(2)}</b>/4.8 · 숙소마다 후기 ${RK.top.n}개+★${RK.top.star}면 상위 노출</div>
    <div style="margin-top:6px">${revSeg(S, "ab")}</div></div>
  ${abF30(c)}`;
}
// 화면 정리(v4.31): 명의 팀은 법 개정 사건 때만 뜨는 급한 칸이라 '운영 설정' 접기 밖에 둔다
export function abLaw(c) { return c.S.ab.units.length ? lawCard(c) : ""; }
// '운영 설정' 접힌 줄에 보이는 지금 값 한 줄
const revN = (S, job) => D.PR_REVIEW.ev[(job === "pr" ? S.pr.revEv : S.ab.revEv) || "none"].n;
const upN = (v) => (v === 1 ? "그대로" : `+${Math.round((v - 1) * 100)}%`);
export function prOpsSum(c) { const S = c.S, P = S.pr; if (!P.rooms.some((x) => x.status === "open")) return `성수기 가격 <b>${upN(P.peak || 1)}</b> · 문을 열면 가격표·후기 관리가 생겨요`; return `성수기 가격 <b>${upN(P.peak || 1)}</b> · 후기 이벤트 <b>${c.esc(revN(S, "pr"))}</b>`; }
export function abOpsSum(c) { const S = c.S, A = S.ab, K = AB.AB_F30, nb = AB.nbGet(S); return `성수기 1박 <b>${upN(A.peak || 1)}</b> · 청소 <b>${A.cohost ? "코호스트" : { self: "내가", gig: "건당 대행", team: "청소팀" }[A.clean || "self"]}</b> · 이웃 인심 <b class="${nb < K.nb.low ? "bad" : ""}">${nb}</b>`; }
export function ucOpsSum(c) { const U = c.S.uc, nt = U.stores.filter((x) => x.night === false).length; return `${nt ? (nt === U.stores.length ? "밤엔 닫기" : `밤엔 닫기 ${nt}곳`) : "24시간"} · 원두 재고 <b>${{ small: "조금씩", mid: "보통", bulk: "많이" }[U.stock || "mid"]}</b>`; }
function lawCard(c) {
  const S = c.S, A = S.ab, L = A.law, K = D.AB_NAME;
  if (!L || L.phase === 0) return ""; // 정리(v4.27): 법 개정 예고(1단계) 전에는 숨김
  const slots = AB.legalSlots(S), legal = AB.legalCount(S), n = A.units.length, names = A.names || [];
  const head = L.phase === 1 ? `법 시행까지 <b class="bad">${L.deadline - S.t}달</b>` : "새 법 시행 중";
  const path = { team: "동료 모으기", parents: "부모님 주소", shrink: "줄이기", hold: "버티기", me: "내 명의" }[L.path] || "고르는 중";
  const rows = names.map((h) => { const k = K.kinds[h.kind], fee = AB.feeOf(S, h); return `<div class="row" style="background:var(--panel2);border-radius:10px;padding:6px 10px"><div class="grow"><b class="small">${c.esc(AB.nameLabel(h))}</b> <span class="tag ${h.kind === "parents" || h.kind === "spouse" ? "green" : "gold"}">${k.n}</span><div class="tiny muted">월 ${c.won(fee)}${k.raise ? ` · 해마다 +${Math.round(k.raise * 100)}%` : " · 인상 없음"}${h.debt ? ` · <b class="bad">밀림 ${h.owed}달 ${c.won(h.debt)}</b>` : ""}</div></div></div>`; }).join("");
  const cands = (L.phase >= 1 && L.path !== "shrink") ? AB.askCands(S) : [];
  const owed = names.reduce((a, h) => a + h.debt, 0);
  return `<div class="card"><h3>명의 팀 <small>${head} · ${path}</small></h3>
    <div class="row small" style="margin-bottom:4px"><span>숙소 <b>${n}</b>채 · 합법 <b class="${legal >= n ? "good" : "bad"}">${legal}</b>채 · 명의 <b>${slots}</b>개(나 포함)</span><span class="grow"></span><span>용돈 <b>${c.won(AB.feeTotal(S))}</b>/월</span></div>
    ${c.meter(Math.min(slots, n), Math.max(1, n), slots >= n ? "var(--green)" : "var(--gold)")}
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${rows || '<div class="tiny muted">아직 빌린 명의가 없어요. 나 1명으로는 1채만 합법이에요.</div>'}</div>
    <div class="row" style="margin-top:8px"><span class="small">용돈 자동 지급</span><span class="grow"></span><div class="seg" style="width:140px"><button style="padding:6px" class="${A.feeAuto ? "on" : ""}" data-abfee="1">켬</button><button style="padding:6px" class="${A.feeAuto ? "" : "on"}" data-abfee="0">끔</button></div></div>
    ${owed ? `<button class="btn gold" style="width:100%;margin-top:6px" data-abpay>밀린 용돈 보내기 · ${c.won(owed)} · ⚡0</button>` : ""}
    <div class="tiny muted" style="margin-top:6px">용돈은 행동력 없이 매달 자동으로 나가요(장부 '명의 용돈'). 끄거나 현금이 모자라면 밀려요. 부모님은 너그럽지만, 남의 명의는 밀리면 호감이 크게 떨어지고 2달이면 빼 달라고 해요. 실거주 점검에 걸리면 과태료·영업정지·명의자와 다툼.</div>
    ${cands.length && slots < n ? `<div class="sec" style="margin-top:8px">명의 부탁하기</div><div style="display:flex;flex-direction:column;gap:6px">${cands.slice(0, 4).map((x) => `<div class="row" style="background:var(--panel2);border-radius:10px;padding:6px 10px"><div class="grow"><b class="small">${c.esc(x.id === "broker" ? "명의 브로커" : (c.E.CHAR[x.id]?.name || "?"))}</b> <span class="tag">${K.kinds[x.kind].n}</span><div class="tiny muted">${x.kind === "broker" ? "확실하지만 비싸고 위험" : `호감 ${Math.round(x.aff)}`} · 성공 ${Math.round(AB.askP(S, x, false) * 100)}% · 월 ${c.won(Math.round(K.kinds[x.kind].fee * (S.pi || 1)))}~</div></div><button class="btn sm" data-act="ab_ask" data-arg="${x.id}">부탁 ⚡1</button></div>`).join("")}</div>` : ""}</div>`;
}

// ───────── v4.29 특이 요소 패널(파티룸 운영 규칙 · 에어 청소·손님·이웃 · 무인카페 영업 방식) ─────────
// 버튼은 data-sp="job:key:arg" 하나로 받는다(ui.js 가 spAct 를 부른다)
const segRow = (label, opts, cur, key, extra = "") => `<div class="row" style="margin-top:6px;gap:6px"><span class="small" style="flex:0 0 auto;min-width:84px">${label}</span><div class="seg grow">${opts.map(([v, n]) => `<button style="padding:6px 2px" class="${String(cur) === String(v) ? "on" : ""}" data-sp="${key}:${v}">${n}</button>`).join("")}</div>${extra}</div>`;
const more = (html) => `<details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer;list-style:none">자세히 ▾</summary><div class="tiny muted" style="margin-top:4px;line-height:1.5">${html}</div></details>`;
const showAll = () => typeof location !== "undefined" && /-f30show/.test(location.hash);
function prRules(c) {
  const S = c.S, P = S.pr, K = PR.PR_F30, all = showAll(), rows = [];
  if (all || [8, 9, 10, 11, 12].includes(S.cal) || P.decY != null) { const cur = P.decPol || "half"; rows.push(segRow("12월 취소", [["half", "50% 환불"], ["full", "전액 환불"], ["none", "환불 불가"]], cur, "pr:dec") + `<div class="tiny muted" style="margin-top:2px">${K.dec.pol[cur].desc}</div>`); }
  if (all || P.depoAsk != null || P.depo) rows.push(segRow(`보증금 ${K.depo.amt}만`, [[0, "안 받음"], [1, "받음"]], P.depo ? 1 : 0, "pr:depo"));
  if (all || P.minorT != null || P.idCheck) rows.push(segRow("신분증 확인", [[0, "안 함"], [1, "확인"]], P.idCheck ? 1 : 0, "pr:id"));
  if (!rows.length) return "";
  const pol = Object.values(K.dec.pol).map((x) => `${x.n}: 12월 예약 ${x.occ >= 1 ? "+" : "−"}${Math.abs(Math.round((x.occ - 1) * 100))}% · 노쇼 ${Math.round(x.noshow * 100)}%${x.keep ? ` · 위약금 ${Math.round(x.keep * 100)}%` : ""}`).join("<br>");
  return `<div class="card"><h3>운영 규칙</h3>${rows.join("")}${more(`매년 9월에 12월 예약을 열어요. 연말 한 달이 1년을 좌우해요.<br>${pol}<br>보증금을 받으면 예약이 ${Math.round((1 - K.depo.occ) * 100)}% 줄고 파손 손해가 ${Math.round((1 - K.depo.dmg) * 100)}% 줄어요. 돌려줄 때 얼룩 분쟁이 생길 수 있어요.<br>신분증을 확인하면 단체 예약이 조금 줄지만, 미성년자 출입으로 영업정지 ${K.minor.ban}달을 맞을 일이 없어요.`)}</div>`;
}
function abF30(c) {
  const S = c.S, A = S.ab, K = AB.AB_F30, cur = A.clean || "self", nb = AB.nbGet(S);
  const units = A.units.map((u) => segRow(c.esc(u.name.replace(/^(\d+호) (\S+).*/, "$1 $2")), [[0, "단기만"], [0.3, "장기 30%"], [0.6, "장기 60%"]], u.longR || 0, `ab:long:${u.id}`)).join("");
  const nbCls = nb >= 55 ? "good" : nb < K.nb.low ? "bad" : "";
  return `<div class="card"><h3>청소·손님·이웃</h3>
    ${A.cohost ? '<div class="tiny muted">코호스트가 청소까지 맡고 있어요.</div>' : segRow("청소", [["self", "내가"], ["gig", "건당 대행"], ["team", "청소팀"]], cur, "ab:clean") + `<div class="tiny muted" style="margin-top:2px">${K.clean[cur].desc}${cur === "team" ? ` · 월 ${c.won(AB.teamFee(S))}` : cur === "gig" ? ` · 1건 ${K.clean.gig.per}만` : ""}</div>`}
    <div class="sec" style="margin-top:8px">한 달 살기</div>${units}
    <div class="row" style="margin-top:8px"><span class="small">이웃 인심 <b class="${nbCls}">${nb}</b></span><span class="grow"></span><button class="btn sm" data-sp="ab:gift" ${A.giftT === S.t ? "disabled" : ""}>관리실에 음료 ${c.won(Math.round(K.nb.gift * (S.pi || 1)))}</button></div>
    ${c.meter(nb, 100, nb < K.nb.low ? "var(--red)" : "var(--green)")}
    ${more(`체크아웃 11시~체크인 3시 사이에 청소를 끝내야 해요. 건당 대행은 손님 1팀마다 ${Math.round(K.clean.gig.punk * 100)}% 확률로 펑크가 나요. 청소팀은 숙소 ${K.clean.team.per3}채마다 월 ${K.clean.team.fix}만, 분리수거까지 해서 이웃 인심이 올라요.<br>한 달 살기는 1박 값이 ${Math.round(K.long.price * 100)}%쯤이지만 계절과 상관없이 차고, 손님이 덜 바뀌어 청소·후기·민원이 줄어요. 미등록 숙소 단속 위험도 줄어요.<br>이웃 인심은 단기 손님이 많을수록 내려가요. 낮으면 관리사무소 호출이 오고, 미등록 숙소는 이웃 신고로 단속될 확률이 최대 ${Math.round((AB.nbF({ sx: null, ab: { nb: 0 } }) - 1) * 100)}% 올라가요.`)}</div>`;
}
export function ucPanels(c) {
  f30Test(c, UC, ["hours", "night", "chain"]);
  const S = c.S, U = S.uc, K = UC.UC_F30; if (!U.stores.length) return "";
  const cur = U.stock || "mid";
  const rows = U.stores.map((st) => segRow(c.esc(st.name.replace(/^(\d+호) (\S+).*/, "$1 $2")) + (st.chain ? ` <span class="tag red">체인 ${st.chain}</span>` : ""), [[1, "24시간"], [0, "밤엔 닫기"]], st.night === false ? 0 : 1, `uc:night:${st.id}`)).join("");
  return `<div class="card"><h3>영업 방식</h3>${rows}
    ${segRow("원두 재고", [["small", "조금씩"], ["mid", "보통"], ["bulk", "많이"]], cur, "uc:stock")}<div class="tiny muted" style="margin-top:2px">${K.stock[cur].desc}</div>
    ${more(`밤 12시~아침 7시를 닫으면 잔 수가 ${Math.round((1 - K.night.keep) * 100)}% 줄지만 전기세 −${Math.round((1 - K.night.util) * 100)}%, 먹튀 −${Math.round((1 - K.night.theft) * 100)}%, 고장 −${Math.round((1 - K.night.brk) * 100)}%, 10대 아지트·새벽 사고가 없어요. 처음 닫을 때 자동문 잠금 ${K.night.lock}만.<br>원두를 많이 사 두면 원가 −${Math.round((1 - K.stock.bulk.unit) * 100)}%, 점검 행동력 −0.5지만 별점 ${K.stock.bulk.star}. 조금씩 자주 사면 원가 +${Math.round((K.stock.small.unit - 1) * 100)}%, 점검 +0.5, 별점 +${K.stock.small.star}.<br>옆에 저가 커피 체인이 생기면 손님 머릿속 '한 잔 값'이 ${Math.round(K.chain.ref * 100)}%씩 내려가요(스페셜티 원두면 절반).`)}</div>`;
}
export function spAct(S, key) {
  const [j, k, a, b] = String(key).split(":");
  if (j === "pr") return k === "dec" ? PR.setDecPol(S, a) : k === "depo" ? PR.setDepo(S, a === "1") : k === "id" ? PR.setIdCheck(S, a === "1") : { ok: false };
  if (j === "ab") return k === "clean" ? AB.setClean(S, a) : k === "long" ? AB.setLong(S, a, +b) : k === "gift" ? AB.gift(S) : { ok: false };
  if (j === "uc") return k === "night" ? UC.setNight(S, a, b === "1") : k === "stock" ? UC.setStock(S, a) : { ok: false };
  return { ok: false };
}
// 시험(#autoN-<보드>-f30<장면>): 장면을 바로 띄운다. 예) #auto6-rooms-pr-f30dec · #auto6-abnb-airbnb-f30race · #auto6-ucf-ucafe-f30chain · -f30show(패널 줄 다 보이기)
function f30Test(c, M, keys) {
  const h = typeof location !== "undefined" ? location.hash : "", m = h.match(/-f30([a-z]+)/);
  if (m && m[1] === "show" && !c.S["_f30S" + M.f30Scene.name + keys[0]]) { const S = c.S; S["_f30S" + M.f30Scene.name + keys[0]] = 1; // 패널 시험용 상태(밤 닫음·체인·청소팀·장기)
    if (M === UC && S.uc.stores[0]) { S.uc.stores[0].night = false; S.uc.stores[0].lock = true; S.uc.stores.forEach((x, i) => { if (i) x.chain = 1; }); S.uc.stock = "bulk"; }
    if (M === AB && S.ab.units[0]) { S.ab.clean = "team"; S.ab.units[0].longR = 0.3; }
    if (M === PR) { S.pr.decPol = "none"; S.pr.depo = true; } }
  if (!m || !keys.includes(m[1]) || c.S._f30T) return;
  c.S._f30T = m[1]; const sc = M.f30Scene(c.S, c.E.R(c.S), m[1]); if (sc && !c.S.pending) c.E.openScene(c.S, sc);
}
