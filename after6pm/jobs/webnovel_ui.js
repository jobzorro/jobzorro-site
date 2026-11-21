// 웹소설 투잡 화면 플러그인. 규약은 engine/jobs/README.md
// 보드: 내 작품 카드(화수·연독률·독자·비축분) + 연재 주기 고르기 + 노블리 공모전 시즌 + 내 서재 + 엔딩 길
import * as WN from "../engine/jobs/webnovel.js";

const pct = (x) => `${Math.round(x * 100)}%`;
const n0 = (x) => Math.round(x || 0).toLocaleString();
// data-act 버튼(이유가 있으면 흐리게 + data-why)
function actBtn(c, id, arg, label, cls = "") {
  const why = c.E.canAct(c.S, id, arg), a = c.D.ACTIONS[id];
  return `<button class="btn sm ${cls}" data-act="${id}"${arg !== undefined ? ` data-arg="${c.esc(arg)}"` : ""}${why ? ` data-why="${c.esc(why)}" style="opacity:.5"` : ""}>${c.esc(label)} ⚡${a.ap}</button>`;
}

export default {
  key: "webnovel", ic: "pen", bg: "library", sjBg: "library", fullBg: "home",
  icons: { wn_new: "spark", wn_write: "pen", wn_plot: "book", wn_reader: "msg", wn_contest: "chart", wn_lunch: "brief", wn_lecture: "mega" },
  tile: (S) => { const W = S.webnovel, w = W?.work; return w ? `${w.ep}화 · 독자 ${n0(w.fans)}` : W?.done ? `완결 ${W.done}질` : "새 작품 기획"; },
  side: (S) => `웹소설 Lv${S.webnovel?.lv || 1}`,
  quick: (S) => (S.webnovel?.work ? "wn_write" : "wn_new"),
  defaultArg: (S, id) => (id === "wn_new" ? "hyun" : undefined),
  cine: {
    wn_first: ["home", "웹소설"], wn_wall: ["library", "웹소설"], wn_paid: ["desk", "웹소설"], wn_done: ["library", "웹소설"],
    wn_ip: ["gallery", "원작자"], wn_steady: ["desk", "성실한 완결 작가"], wn_ghost: ["home", "20화의 유령"],
  },
  auto(c) { const S = c.S; WN.newWork(S, c.E.R(S), "hyun"); S.webnovel.bank = 30; S.st.write = Math.max(S.st.write, 70); S.hb.joined.includes("write") || S.hb.joined.length >= 2 || c.SJ.hbJoin(S, "write"); },
  page(c) {
    const { S, esc, won, boardHead, actRow, meter } = c, W = S.webnovel, w = W.work, L = W.last || {};
    const nx = WN.lvNeed(S), lvN = WN.LEVELS[W.lv].n, last = W.hist.at(-1) || 0, working = !(S.co.quit || S.co.fired);
    const head = `${boardHead("webnovel")}<div class="card"><h3>웹소설 <small>Lv${W.lv} ${esc(lvN)}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${last > 0 ? "good" : last < 0 ? "bad" : ""}">${won(last)}</div></div>
      <div><div class="k">충성 독자</div><div class="v gold">${n0(w?.fans)}명</div></div>
      <div><div class="k">비축분</div><div class="v ${w && W.bank < W.sched ? "bad" : "good"}">${W.bank}화</div></div></div>
      <div class="row small" style="margin-top:8px"><span>연재 피로</span><span class="grow"></span><b class="${W.tired >= 70 ? "bad" : ""}">${Math.round(W.tired)}/100</b>${W.tired >= 70 ? '<span class="tag red" style="margin-left:4px">품질 −</span>' : ""}</div>
      ${meter(W.tired, 100, W.tired >= 70 ? "var(--red)" : "var(--blue)")}
      ${nx ? `<div class="small" style="margin-top:8px">다음 <b class="gold">Lv${nx.lv} ${esc(nx.n)}</b> · ${esc(nx.need)}</div>${meter(nx.prog, 1, "var(--gold)")}` : `<div class="small good" style="margin-top:8px">최고 단계 IP 작가. 작법 강의가 열렸어요.</div>`}
      <div class="tiny muted" style="margin-top:6px">필명으로 쓰는 직장인 작가. 매달 연재 주기만큼 비축분이 빠져나가요. 모자라면 펑크, 독자가 빠져요. 50화 + 매니지먼트 계약이면 유료(한 화 100원, 플랫폼·회사 떼고 작가 몫 약 42원). 100화면 완결, 완결작은 인세가 조금씩 계속 들어와요.</div></div>`;
    let body;
    if (w) {
      const G = WN.GENRES[w.g] || WN.GENRES.hyun, need = W.sched, lack = Math.max(0, need - W.bank);
      const sched = Object.entries(WN.SCHED).sort((a, b) => (+a[0] || 99) - (+b[0] || 99)).map(([k, v]) => `<button class="btn sm ${+k === W.sched ? "gold" : ""}" data-wnsched="${k}">${v.n}${+k ? ` ${k}화` : ""}</button>`).join("");
      body = `<div class="room"><div class="body">
        <div class="row"><div class="grow" style="min-width:0"><div class="nm">'${esc(w.n)}'</div>
          <div class="tiny"><span class="tag">${esc(G.n)}</span>${w.paid ? '<span class="tag gold">유료 연재</span>' : '<span class="tag">무료 연재</span>'}${w.mgmt ? '<span class="tag green">매니지먼트</span>' : ""}${w.cover ? '<span class="tag">표지</span>' : ""}${W.ai ? '<span class="tag blue">AI 도구</span>' : ""}</div></div>
          <div style="text-align:right"><div class="gold" style="font-weight:900">${w.ep}/${w.goal}화</div><div class="tiny muted">${w.paid ? "51화부터 유료" : w.mgmt ? "50화에 유료 전환" : "계약 전"}</div></div></div>
        ${meter(w.ep, w.goal, "var(--gold)")}
        <div class="kv" style="margin-top:6px"><div><div class="k">연독률</div><div class="v ${w.retain < 0.82 ? "bad" : "good"}">${pct(w.retain)}</div></div>
          <div><div class="k">지난달 새 독자</div><div class="v ${(L.newF || 0) < 0 ? "bad" : ""}">${(L.newF || 0) >= 0 ? "+" : ""}${n0(L.newF)}명</div></div>
          <div><div class="k">지난달 연재 수익</div><div class="v">${won(L.rev || 0)}</div></div></div>
        <div class="sec" style="margin-top:8px">연재 주기</div>
        <div class="row wrap" style="gap:4px">${sched}</div>
        <div class="small" style="margin-top:6px">${need ? `이번 달 <b>${need}화</b> 올려요 · 비축 <b class="${lack ? "bad" : "good"}">${W.bank}화</b>${lack ? ` → <b class="bad">${lack}화 모자람(펑크 위험)</b>` : " · 넉넉해요"}` : `휴재 중: 독자가 매달 7%쯤 빠지고, 피로가 크게 풀려요${W.resume ? ` · 비축 10화가 모이면 다시 연재(지금 ${W.bank}화)` : ""}`}</div>
        <div class="tiny muted">주 5회는 노출 +22%지만 피로·멘탈이 크게 깎여요. 회사 다니면서 주 5회면 매달 스태미너 −3.</div>
        <div class="row wrap" style="margin-top:8px;gap:4px">${actBtn(c, "wn_write", undefined, `원고 쓰기 +${WN.writeEps(S)}화`, "gold")}${actBtn(c, "wn_plot", undefined, "플롯 다듬기")}${actBtn(c, "wn_reader", undefined, "독자 소통")}</div>
        <div class="row wrap" style="margin-top:6px;gap:4px"><button class="btn sm" data-wnai="1">${W.ai ? "AI 도구 해지" : "AI 도구 월 5만"}</button>${w.cover ? "" : `<button class="btn sm" data-wncover="1">표지 15만</button>`}${w.ep >= 80 && w.goal > w.ep ? `<button class="btn sm" data-wnfin="1">조기 완결</button>` : ""}<span class="grow"></span><button class="btn sm danger" data-wndrop="1">연재 중단</button></div>
      </div></div>`;
    } else {
      body = `<div class="card"><h3>새 작품 기획 <small>장르 고르기</small></h3><div class="tiny muted">${W.pen ? `필명 팬 ${n0(W.pen)}명 중 절반이 새 작품으로 따라와요.` : "필명 팬 0명. 1화부터 맨땅이에요."} 장르마다 독자가 붙는 속도와 커질 수 있는 크기가 달라요.</div>
        <div class="pick" style="margin-top:8px">${Object.entries(WN.GENRES).map(([k, G]) => { const why = c.E.canAct(S, "wn_new", k); return `<button data-act="wn_new" data-arg="${k}"${why ? ` data-why="${esc(why)}" style="opacity:.5"` : ""}><b>${esc(G.n)}</b><span class="tiny muted">${esc(G.tip)}</span><span class="tiny">속도 ${"●".repeat(Math.round(G.rate * 14))} · 크기 ${"●".repeat(Math.round(G.cap * 4))} · ⚡1</span></button>`; }).join("")}</div></div>`;
    }
    // 공모전·투고·점심·강의
    const mx = Math.max(...WN.SEASON);
    const contest = `<div class="card"><h3>노블리 공모전 <small>지금 ${S.cal}월</small></h3>
      <div class="season" style="height:36px">${WN.SEASON.map((v, i) => `<i class="${i + 1 === S.cal ? "now" : ""} ${WN.CONTEST_M.includes(i + 1) ? "pk" : ""}" style="height:${Math.round(v / mx * 100)}%"></i>`).join("")}</div>
      <div class="season-l" style="font-size:11px">${WN.SEASON.map((_, i) => `<span>${i + 1}</span>`).join("")}</div>
      <div class="tiny muted" style="margin-top:4px">막대 = 독자가 읽는 양(방학·연휴에 많이 읽어요). 진한 달 = 공모전 시즌(5·6·10·11월). 참가하면 두 달 노출 ×1.5, 수상하면 상금 100~500만 + 매니지먼트 계약. 시즌이 아니면 매니지먼트에 투고(30화부터).</div></div>
      <div class="acts" style="padding:0">${actRow("wn_contest")}${working ? actRow("wn_lunch") : ""}${W.lv >= 5 ? actRow("wn_lecture") : ""}</div>`;
    // 내 서재
    const tails = W.works.reduce((a, x) => a + (x.tail || 0), 0);
    const shelf = W.works.length || W.ip ? `<div class="card"><h3>내 서재 <small>완결 ${W.done}질 · 유료 ${W.paidDone}질</small></h3>
      ${W.works.slice(-6).reverse().map((x) => `<div class="row small" style="padding:4px 0;border-bottom:1px solid var(--line)"><div class="grow" style="min-width:0"><b>'${esc(x.n)}'</b> <span class="tiny muted">${esc(WN.GENRES[x.g]?.n || "")} · ${x.ep}화 · 최고 ${n0(x.peak)}명</span></div><span class="tag ${x.done ? "green" : "red"}">${x.done ? "완결" : "중단"}</span>${x.tail ? `<span class="tiny gold" style="margin-left:4px">월 ${won(Math.round(x.tail))}</span>` : ""}</div>`).join("")}
      <div class="tiny muted" style="margin-top:6px">완결작 인세 합계 월 ${won(Math.round(tails))}(매달 4%씩 줄어요)${W.ip ? ` · 2차 판권 ${W.ip}건${W.ipPay.left ? `, 원작료 월 ${won(W.ipPay.amt)} × ${W.ipPay.left}개월 남음` : ""}` : ""}</div></div>` : "";
    // 엔딩 길 3개
    const ghostLeft = W.t0 === null || W.t0 === undefined ? 36 : Math.max(0, 36 - (S.t - W.t0));
    const ends = `<div class="card"><h3>작가의 길 <small>엔딩 3개</small></h3>
      <div class="small"><b class="${W.ip ? "good" : "gold"}">원작자</b> · 2차 판권(웹툰화) 계약 1건 <span class="tiny muted">${W.ip ? "달성" : W.lv >= 4 ? "완결작이 커지면 제안이 와요" : "Lv4 완결 작가부터 제안"}</span></div>
      <div class="small" style="margin-top:4px"><b class="${W.done >= 3 && working ? "good" : "gold"}">성실한 완결 작가</b> · 완결 3질 + 회사 유지 <span class="tiny muted">${Math.min(3, W.done)}/3질${working ? "" : " · 회사를 나왔어요"}</span></div>
      <div class="small" style="margin-top:4px"><b class="${W.maxEp >= 20 ? "muted" : "bad"}">20화의 유령</b> · 3년 동안 20화를 못 넘김 <span class="tiny muted">${W.maxEp >= 20 ? "벗어났어요" : `${ghostLeft}개월 남음 · 지금 최대 ${W.maxEp}화`}</span></div>
      <div class="tiny muted" style="margin-top:6px">연재를 시작한 작가 열에 예닐곱은 10화도 못 채워요. 연 3천만 원 넘게 버는 작가는 5%가 안 돼요.</div></div>`;
    return head + body + contest + shelf + ends;
  },
  bind(c) {
    const done = (msg) => { c.save(); c.render(); if (msg) c.toast([], msg); };
    c.q("[data-wnsched]", (el) => { WN.setSched(c.S, +el.dataset.wnsched); done(`연재 주기: ${WN.SCHED[+el.dataset.wnsched].n}`); });
    c.q("[data-wnai]", () => { const on = WN.toggleAi(c.S); done(on ? "AI 집필 도구 구독(월 5만): 원고 +25%" : "AI 도구 해지"); });
    c.q("[data-wncover]", () => { const r = WN.buyCover(c.S); done(r.msg); });
    c.q("[data-wnfin]", () => { const r = WN.finishNow(c.S); done(r.msg); });
    c.q("[data-wndrop]", () => c.openWin(`<h2>연재를 중단할까요? <button class="x" data-close>✕</button></h2><div class="small">'${c.esc(c.S.webnovel.work?.n || "")}' ${c.S.webnovel.work?.ep || 0}화에서 멈춰요. 비축분은 버리고, 독자는 대부분 떠나요. 필명 팬이 조금 남아요.</div><div class="row" style="margin-top:12px"><button class="btn grow" data-close>계속 쓴다</button><button class="btn danger grow" data-wnyes>중단한다</button></div>`, (w) => { w.querySelector("[data-wnyes]").onclick = () => { const r = WN.dropWork(c.S); c.closeWin(); done(r.msg); }; }));
  },
};
