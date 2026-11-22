// 타로 보드 화면: 상담 큐(문의)·멘탈·단계 조건이 한눈에. 규약: engine/jobs/README.md
import * as TR from "../engine/jobs/tarot.js";

const MON = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default {
  key: "tarot", ic: "spark", bg: "tarot", sjBg: "tarot", fullBg: "tarot",
  icons: { tr_read: "msg", tr_practice: "book", tr_card: "cam", tr_booth: "users", tr_kit: "pen", tr_agent: "brief" },
  tile: (S) => (S.tarot.lv >= 2 ? `Lv${S.tarot.lv} · 문의 ${S.tarot.queue}건` : `연습 노트 ${S.tarot.notes}/20`),
  side: (S) => `타로 Lv${S.tarot.lv}${S.tarot.brand ? " 브랜드" : ""}`,
  quick: (S) => { const T = S.tarot; if (T.agent) return null; if (T.lv === 1 && T.notes < 20) return "tr_practice"; if (T.queue > 0 || T.lv === 1) return "tr_read"; return "tr_card"; },
  cine: {
    tr_lv2: ["home", "타로"], tr_paid: ["online", "타로"], tr_lv3: ["online", "타로"], tr_lv4: ["cafe", "타로"], tr_lv5: ["tarot", "타로"],
    tr_brand: ["popup", "타로"], tr_end_wait: ["tarot", "타로 엔딩"], tr_end_goods: ["popup", "타로 엔딩"], tr_end_witch: ["home", "타로 엔딩"],
  },
  auto(c) { const T = c.S.tarot; Object.assign(T, { notes: 22, free: 10, reviews: 11, lv: 3, follow: 900, regulars: 3, rep: 45, queue: 12 }); },
  page(c) {
    const { S, esc, won, boardHead, actRow, meter } = c, T = S.tarot, L = T.last;
    const lvn = TR.LV[T.lv - 1], nx = TR.nextNeed(S), nextLv = T.lv < 5 ? TR.LV[T.lv] : null;
    const unit = TR.unitPrice(S), cap = TR.capPerRead(S), dr = TR.drainPer(S);
    const mCol = S.mental < 30 ? "var(--red)" : S.mental < 50 ? "var(--gold)" : "var(--green)";
    const tags = [T.niche ? `<span class="tag purple">${esc(TR.NICHES[T.niche].n)} 전문</span>` : "", T.brand ? '<span class="tag gold">브랜드</span>' : "", T.agent ? '<span class="tag blue">위탁 중</span>' : "", T.room !== "none" ? `<span class="tag green">${T.room === "lease" ? "상담실" : "주말 공간"}</span>` : ""].join("");
    // 단계 점
    const dots = TR.LV.map((x, i) => `<span class="tag ${i < T.lv ? "gold" : ""}" style="font-size:11px">${i + 1}</span>`).join("");
    const steps = nx.length ? `<div class="steps">${nx.map((x) => { const ok = x.cur >= x.goal; return `<div class="${ok ? "done" : ""}"><span class="ck">${ok ? "✓" : ""}</span><span class="grow">${esc(x.n)} <b>${x.goal === 1 ? (ok ? "정함" : "아직") : `${Math.min(x.cur, x.goal).toLocaleString()}/${x.goal.toLocaleString()}`}</b></span></div>`; }).join("")}</div>` : '<div class="small good">모든 단계 완료. 이제 지키는 일만 남았다.</div>';
    const seas = TR.SEASON.map((v, i) => `<i class="${i === S.cal - 1 ? "now" : v >= 1.2 ? "pk" : ""}" style="height:${Math.round(v / 1.8 * 100)}%"></i>`).join("");
    const pbtn = TR.PRICES.map((p, i) => `<button class="${T.price === i ? "on" : ""}" data-trprice="${i}"><b>${p.n}</b><span class="tiny muted">단가 ×${p.m}${p.d ? " · " + p.d : ""}</span></button>`).join("");
    const nbtn = Object.entries(TR.NICHES).map(([k, n]) => `<button class="${T.niche === k ? "on" : ""}" data-trniche="${k}" ${T.lv < 4 ? "disabled" : ""}><b>${esc(n.n)}</b><span class="tiny muted">${esc(n.d)}</span></button>`).join("");
    const tog = (k, on, n, d, lock) => `<button class="${on ? "on" : ""}" data-trtog="${k}" ${lock ? "disabled" : ""}><b>${n} ${on ? "켬" : "끔"}</b><span class="tiny muted">${d}</span></button>`;
    // f30: 적중 기록부 · 매일 오는 손님 · 대목 패키지(조건이 있을 때만)
    const F = TR.TR_F30, hn = T.hitN + T.missN, hr = hn ? Math.round(T.hitN / hn * 100) : 0;
    const f30 = T.lv >= 3 ? `<div class="card"><h3>적중 기록부 <small>${hn ? `맞힘 ${T.hitN} · 빗나감 ${T.missN} · ${hr}%` : "아직 결과 없음"}</small></h3>
      <div class="pick">${[1, 2, 0].map((k) => `<button class="${(T.style ?? 1) === k ? "on" : ""}" data-trstyle="${k}"><b>${esc(F.style[k].n)}</b><span class="tiny muted">${esc(F.style[k].d)}</span></button>`).join("")}</div>
      ${T.buzzH >= 1 ? `<div class="tiny good" style="margin-top:4px">적중 입소문: 문의 +${Math.round(T.buzzH)}%</div>` : ""}
      ${T.hv ? `<div class="row small" style="margin-top:8px;background:var(--panel2);border-radius:8px;padding:6px 8px"><span class="grow">매일 오는 손님 ${T.hv.m}달째 · 멘탈 −${Math.min(F.heavy.drainMax, Math.round((F.heavy.drain + F.heavy.drainUp * T.hv.m) * 10) / 10)}/달</span><button class="btn sm" data-trcut="1">선 긋기</button></div>` : ""}
      ${TR.peakOn(S) ? `<div class="tiny gold" style="margin-top:6px">신년 운세 패키지 판매 중: 한 번에 ×${F.peak.cap} · 단가 ×${F.peak.unit}</div>` : ""}
      <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer;display:inline-block">자세히 ▾</summary><div class="tiny muted" style="margin-top:4px">읽은 리딩의 일부는 결과가 돌아와요. 단정적으로 말하면 맞혔을 때 입소문이 크게 나고, 빗나가면 평판이 크게 깎여요. 애매하게 말하면 안전하지만 단골이 덜 돌아와요. 10월엔 11·12·1월 대목 준비를 정할 수 있어요.</div></details></div>` : "";
    const rooms = [["none", "온라인만", "고정비 0"], ["hourly", "주말 공간 대여", "월 12만 · 단가 +10%"], ["lease", "상담실 계약", "보증금 500·인테리어 300 · 월세 55 · 단가 +30%"]];
    return `${boardHead("tarot")}
    <div class="card" style="padding:0;overflow:hidden">
      <div style="background:linear-gradient(180deg,rgba(14,16,32,.15),rgba(14,16,32,.92)),url(img/bg_tarot.webp) center/cover;min-height:150px;padding:12px;display:flex;flex-direction:column;justify-content:flex-end">
        <div class="row wrap" style="gap:4px">${dots}<span class="grow"></span>${tags}</div>
        <h3 style="margin:6px 0 2px">타로 <small>Lv${T.lv} ${esc(lvn.n)}</small></h3>
        <div class="tiny" style="color:#ddd">"카드보다 상담이 본업." 손님은 카드가 아니라 들어 줄 사람을 찾아온다.</div>
      </div>
      <div style="padding:10px 12px">
        <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${(T.hist.at(-1) || 0) >= 0 ? "good" : "bad"}">${won(T.hist.at(-1) || 0)}</div></div>
          <div><div class="k">평판</div><div class="v gold">${Math.round(T.rep)}</div></div>
          <div><div class="k">팔로워</div><div class="v">${Math.round(T.follow).toLocaleString()}</div></div>
          <div><div class="k">단골 · 재구매</div><div class="v">${T.regulars}명 · ${T.rebuy}%</div></div></div>
        <div class="sec" style="margin-top:8px">${nextLv ? `다음 단계 Lv${T.lv + 1} ${esc(nextLv.n)}` : T.brand ? "타로 브랜드 완성" : "브랜드 완성 조건"}</div>
        ${steps}
        <details style="margin-top:4px"><summary class="tiny muted" style="cursor:pointer">${nextLv ? "열리는 것" : T.brand ? "엔딩 조건" : "열리는 것"} 자세히 ▾</summary><div class="tiny muted">${nextLv ? `${esc(nextLv.open)}` : T.brand ? "재구매 30%·월 매출 200만 1년 → '예약 대기 3주의 리더' / 키트·굿즈가 상담을 넘으면 '카드 굿즈 브랜드'" : "매출 +, 부스가 워크숍으로, 굿즈 단가 +, 구독 상한 +"}</div></details>
      </div>
    </div>
    <div class="card"><h3>이번 달 상담 <small>${T.lv < 3 ? "무료 연습" : `건당 ${won(unit)}${T.tail ? " + 꼬리 질문" : ""}`}</small></h3>
      <div class="kv"><div><div class="k">${T.lv < 3 ? "무료 신청" : "대기 문의"}</div><div class="v ${T.queue >= 10 ? "bad" : T.queue ? "gold" : ""}">${T.lv === 1 ? "지인" : T.queue + "건"}</div></div>
        <div><div class="k">이번 달 읽음</div><div class="v">${T.served}건</div></div>
        <div><div class="k">한 번에</div><div class="v">약 ${cap}건</div></div>
        <div><div class="k">건당 멘탈</div><div class="v bad">−${(Math.round(dr * 100) / 100).toFixed(2)}</div></div></div>
      <div class="row small" style="margin-top:8px"><span>멘탈 <b style="color:${mCol}">${Math.round(S.mental)}</b></span><span class="grow"></span><span class="tiny muted">30 아래면 행동력 −2 · 0이면 번아웃</span></div>
      ${meter(S.mental, 100, mCol)}
      <div class="acts" style="padding:0;margin-top:8px">${actRow("tr_read", undefined, T.lv < 3 ? "무료 리딩 (후기 모으기)" : T.lv >= 4 ? "리딩·통화 상담" : "텍스트 리딩")}</div>
      ${L ? `<div class="tiny muted" style="margin-top:6px">지난달 문의 ${L.leads}건 · 읽음 ${L.served}건 · 매출 ${won(L.inc)}</div>` : ""}
      <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">문의 시즌: 연말·연초 몰림, 2월 정적 · 지금 ${S.cal}월 ▾</summary>
      <div class="season" style="height:36px">${seas}</div>
      <div class="season-l" style="font-size:11px">${MON.map((m) => `<span>${m}</span>`).join("")}</div>
      <div class="tiny muted" style="margin-top:6px">문의는 달마다 새로 들어오고, 그달 안 읽으면 40%만 예약 대기로 남고 나머지는 떠나요(평판 −). 재능마켓 수수료 ${T.brand ? 10 : 18}%${T.room === "lease" ? "(상담실 대면은 절반)" : ""}.</div></details>
    </div>
    ${f30}
    ${T.lv >= 3 ? `<div class="card"><h3>가격과 운영</h3>
      <div class="pick">${pbtn}</div>
      ${T.lv < 4 ? "" : `<div class="sec" style="margin-top:8px">전문 분야 ${T.niche ? "" : '<span class="bad small">· Lv5 조건</span>'}</div>
      <div class="pick">${nbtn}</div>`}
      <div class="sec" style="margin-top:8px">상담 방식</div>
      <div class="pick">${tog("boundary", T.boundary, "상담 범위 안내문", "30분·질문 3개: 멘탈 소모 −35%, 문의 −8%")}${T.lv < 4 ? "" : tog("tail", T.tail, "꼬리 질문 3,000원", "리딩당 수입 +, 평판 조금 −")}${T.lv < 4 && !T.subOn ? "" : tog("sub", T.subOn, "월 구독 리딩", `월 3.5만 · 지금 ${T.subs}명 · 리포트마다 멘탈 −`)}</div>
      ${T.lv < 4 ? '<div class="tiny muted" style="margin-top:6px;opacity:.6">잠김 · Lv4에 열려요: 전문 분야 3개 · 꼬리 질문 · 월 구독</div>' : ""}
    </div>` : ""}
    ${T.lv >= 4 ? `<div class="card"><h3>저절로 들어오는 돈 <small>${won((L?.kit || 0))}/월</small></h3>
      <div class="kv"><div><div class="k">구독</div><div class="v">${T.subs}명</div></div><div><div class="k">리딩 키트</div><div class="v">${T.kits}개</div></div><div><div class="k">키트 작업</div><div class="v">${T.kitProg}%</div></div>${T.bot ? '<div><div class="k">챗봇 상품</div><div class="v">월 6만</div></div>' : ""}</div>
      ${T.kitProg ? meter(T.kitProg, 100, "var(--purple)") : ""}
      ${T.lv >= 5 ? `<div class="sec" style="margin-top:8px">상담 공간</div><div class="pick">${rooms.map(([k, n, d]) => `<button class="${T.room === k ? "on" : ""}" data-trroom="${k}"><b>${n}</b><span class="tiny muted">${d}</span></button>`).join("")}</div>` : ""}
    </div>` : ""}
    <div class="acts" style="padding:0">${actRow("tr_practice")}${actRow("tr_card")}${actRow("tr_booth", undefined, T.brand ? "'타로의 밤' 워크숍" : "플리마켓·카페 부스")}${T.lv >= 4 ? actRow("tr_kit") : ""}${T.lv >= 4 || T.agent ? actRow("tr_agent", undefined, T.agent ? "위탁 해지" : "후배 리더에게 위탁(투잡 칸 +1)") : ""}</div>`;
  },
  bind(c) {
    const done = (res) => { if (res && res.msg) c.toast([], res.msg); c.save(); c.render(); };
    c.q("[data-trprice]", (el) => { TR.setPrice(c.S, +el.dataset.trprice); done({ msg: `가격: ${TR.PRICES[+el.dataset.trprice].n}` }); });
    c.q("[data-trniche]", (el) => done(TR.setNiche(c.S, el.dataset.trniche)));
    c.q("[data-trtog]", (el) => done(TR.toggle(c.S, el.dataset.trtog)));
    c.q("[data-trstyle]", (el) => done(TR.setStyle(c.S, +el.dataset.trstyle)));
    c.q("[data-trcut]", () => done(TR.cutHeavy(c.S)));
    c.q("[data-trroom]", (el) => done(TR.setRoom(c.S, el.dataset.trroom)));
  },
};
