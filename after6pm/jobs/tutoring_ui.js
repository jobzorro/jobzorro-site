// 화상과외 보드: 주간 시간표(평일 저녁 타임) · 시범수업 문의 카드 · 학생 카드(학생 만족 vs 학부모 만족, 성적) · 단계 진행.
// 규약: engine/jobs/README.md
import * as TU from "../engine/jobs/tutoring.js";

const DAYS = ["월", "화", "수", "목", "금", "토"];
const SEAS_TIP = (cal) => (TU.examOf(cal) ? `${TU.examOf(cal)} 달: 수업 빠지면 성적에 바로 보여요` : TU.isVac(cal) ? "방학: 문의가 줄고 쉬는 학생이 생겨요" : TU.SEASON[cal - 1] >= 1.2 ? "시험 대비 시즌: 문의가 몰려요" : "보통 시즌");
const pct = (x) => `${Math.round(x)}`;

export default {
  key: "tutoring", ic: "video", bg: "online", fullBg: "online",
  icons: { tu_class: "video", tu_find: "search", tu_trial: "msg", tu_report: "pen", tu_make: "cam" },
  tile: (S) => `학생 ${TU.heads(S)}명 · Lv${S.tutoring.lv}`,
  side: (S) => `화상과외 Lv${S.tutoring.lv}`,
  quick: (S) => (TU.needAp(S) > S.tutoring.ap ? "tu_class" : S.tutoring.leads.length ? "tu_trial" : "tu_find"),
  defaultArg: (S, id) => (id === "tu_trial" ? S.tutoring.leads[0]?.id : undefined),
  cine: {
    tu_first: ["home", "화상과외"], tu_far: ["online", "화상과외"], tu_lv3: ["apt", "화상과외"], tu_lv4: ["studyst", "화상과외"], tu_lv5: ["online", "화상과외"], tu_drop: ["home", "화상과외"],
    tu_end_star: ["online", "화상과외 엔딩"], tu_end_local: ["home", "화상과외 엔딩"], tu_end_cash: ["home", "화상과외 엔딩"],
  },
  auto(c) { TU.demoSetup(c.S); },

  page(c) {
    const { S, esc, won, boardHead, actRow, meter } = c, T = S.tutoring, L = T.last, lv = TU.LV[T.lv];
    const n = TU.needAp(S), u = TU.used(S), ua = TU.usedAll(S), mx = TU.maxOpen(S), net = T.hist.at(-1) ?? 0;
    // 1) 단계·요약
    const prog = T.lv < 5 ? TU.lvProgress(S).map(([t, a, b]) => `<div class="row small" style="gap:6px"><span style="min-width:96px">${esc(t)}</span><div class="grow">${meter(a, b, a >= b ? "var(--green)" : "var(--gold)")}</div><b class="${a >= b ? "good" : ""}" style="min-width:42px;text-align:right">${a}/${b}</b></div>`).join("") : '<div class="small good">마지막 단계예요. 엔딩: 그룹·자료 매출이 연봉을 넘으면 \'모니터 속 일타 선생\'.</div>';
    const head = `<div class="card"><h3>화상과외 <small>${T.lv}단계 · ${esc(lv.n)}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${net >= 0 ? "good" : "bad"}">${won(net)}</div></div>
      <div><div class="k">정규 학생</div><div class="v">${TU.heads(S)}명</div></div>
      <div><div class="k">과외온 별점</div><div class="v gold">★ ${T.stars.toFixed(2)}</div></div>
      <div><div class="k">학부모 후기</div><div class="v">${T.reviews}개</div></div></div>
      <div class="tiny muted" style="margin:8px 0 4px">${T.lv < 5 ? `다음 ${T.lv + 1}단계 '${esc(TU.LV[T.lv + 1].n)}' 조건 · 열리는 것: ${esc(TU.LV[T.lv + 1].open)}` : ""}</div>${prog}
      <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">학부모·학생·수수료 규칙 자세히 ▾</summary><div class="tiny muted">돈 내는 고객은 학부모, 수업 듣는 고객은 학생. 둘 다 챙겨야 남아요. 화상이라 지방·섬·해외 학생도 받을 수 있어요(시공간 파괴). 과외온 학생은 수수료 ${Math.round(T.cut * 100)}%, 소개·직거래는 0%.</div></details></div>`;
    // 2) 시간표: 주 n타임(평일 저녁 1타임 = 1시간)
    const cells = []; for (const st of T.studs) for (let k = 0; k < st.wk; k++) cells.push(st);
    const cols = mx > 10 ? 6 : 5, rows = Math.ceil(mx / cols);
    let grid = "";
    for (let i = 0; i < rows * cols; i++) {
      const day = DAYS[i % cols], slot = Math.floor(i / cols), st = cells[i], open = i < T.open, inRange = i < mx;
      const lab = !inRange ? "" : st ? `${st.grp ? `${st.size}인반` : st.g}<br>${st.subj.slice(0, 4)}` : open ? "빈 타임" : "닫힘";
      const bg = !inRange ? "transparent" : st ? (st.pause ? "var(--panel3)" : st.grp ? "rgba(180,140,255,.22)" : st.par < 50 ? "rgba(255,107,127,.2)" : "rgba(106,168,255,.2)") : open ? "var(--panel2)" : "transparent";
      const bd = inRange ? (open ? "1px solid var(--line)" : "1px dashed var(--line)") : "none";
      grid += `<div style="min-width:0;background:${bg};border:${bd};border-radius:8px;padding:3px 2px;text-align:center;font-size:11px;line-height:1.25;min-height:34px;overflow:hidden;color:${st ? "var(--text)" : "var(--muted)"}">${slot === 0 && inRange ? `<div style="font-size:11px;color:var(--muted)">${day} ${8 + slot}시</div>` : inRange ? `<div style="font-size:11px;color:var(--muted)">${day} ${8 + slot}시</div>` : ""}${lab}</div>`;
    }
    const tt = `<div class="card"><h3>주간 시간표 <small>${ua}/${T.open}타임 · 상한 ${mx}</small></h3>
      <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:4px">${grid}</div>
      <div class="row wrap small" style="margin-top:8px"><span>열어 둔 타임</span><div class="stepper"><button data-tuopen="-1">−</button><b>주 ${T.open}</b><button data-tuopen="1">+</button></div><span class="grow"></span><span class="tiny muted">${TU.employed(S) ? "6타임 넘으면 회사 눈치·체력 ↓" : "퇴사해서 낮 수업도 가능"}</span></div>
      ${!n ? "" : `<div class="row small" style="gap:6px;margin-top:6px"><span style="min-width:96px">이번 달 수업</span><div class="grow">${meter(n ? T.ap : 1, n || 1, T.ap >= n ? "var(--green)" : "var(--blue)")}</div><b class="${T.ap >= n ? "good" : "bad"}">${T.ap}/${n}</b></div>`}
      <div class="row wrap" style="margin-top:6px"><span class="tag ${TU.examOf(S.cal) ? "red" : TU.isVac(S.cal) ? "blue" : TU.SEASON[S.cal - 1] >= 1.2 ? "gold" : ""}">${S.cal}월</span><span class="tiny muted">${SEAS_TIP(S.cal)}</span></div></div>`;
    // 2-1) f30: 성적표 심판의 날 · 입시 결과 · 교습자 신고(조건이 있을 때만)
    const F = TU.TU_F30, nx = S.cal % 12 + 1, up = (T.ipUp ?? -1) > S.t, dn = (T.ipDown ?? -1) > S.t, g3 = T.studs.filter((x) => x.g === "고3").length;
    const fl = [];
    if (T.bst && TU.examOf(T.bst.cal)) fl.push(`<span class="tag gold">${esc(TU.examOf(T.bst.cal))} ${T.bst.k === "free" ? "무료 보강" : "유료 대비반"}</span>`);
    else if (TU.examOf(nx) && T.studs.length) fl.push(`<span class="tag red">다음 달 ${esc(TU.examOf(nx))}</span>`);
    if (up) fl.push(`<span class="tag green">대기 명단 ${T.ipUp - S.t}달 · 수업료 +${Math.round((F.ipsi.upFee - 1) * 100)}%</span>`);
    if (dn) fl.push(`<span class="tag red">소개 끊김 ${T.ipDown - S.t}달</span>`);
    if (g3) fl.push(`<span class="tag">고3 ${g3}명 · 2월 입시 결과</span>`);
    const lic = T.lic === 2 ? '<span class="tag red">미신고 · 적발 위험</span>' : "";
    const f30 = fl.length || T.lic === 2 ? `<div class="card"><div class="row wrap" style="gap:4px">${fl.join("")}${lic}<span class="grow"></span>${T.lic === 2 ? '<button class="btn sm" data-tulic="1">교습자 신고하기</button>' : ""}</div>
      <details style="margin-top:4px"><summary class="tiny muted" style="cursor:pointer;display:inline-block">자세히 ▾</summary><div class="tiny muted" style="margin-top:4px">시험 달(4·6·10·12월)에 성적이 ${F.judge.refD}점 넘게 오르면 소개가 오고, ${-F.judge.leaveD}점 넘게 떨어지면 ${Math.round(F.judge.leaveP * 100)}% 확률로 학원으로 떠나요. 시험 전 달에 보강을 고를 수 있어요. 고3 입시 결과는 2월에 나와 1년 소개를 좌우해요. 교습자 신고를 안 하면 학생이 많을수록 과태료 위험이 커요.</div></details></div>` : "";
    // 3) 행동·운영
    const hasSt = T.studs.length > 0;
    const ops = `<div class="acts" style="padding:0">${n ? actRow("tu_class", undefined, `화상 수업 (${T.ap}/${n})`) : ""}${actRow("tu_find")}${hasSt ? actRow("tu_report", undefined, T.repT === S.t ? "학부모 리포트(이번 달 보냄, 효과 작음)" : "학부모 리포트") : ""}${actRow("tu_make", undefined, T.lv >= 4 ? `자료·숏폼 만들기 (자료집 ${Math.min(100, T.rec)}%)` : "자료·숏폼 만들기")}</div>
      <div class="card"><div class="row wrap" style="gap:6px">
        <button class="btn sm ${T.ad ? "gold" : ""}" data-tuad="1">${T.ad ? "유료 광고 끄기" : `유료 광고 월 ${won(Math.round(20 * c.SYN.pi(S)))}`}</button>
        ${T.lv >= 4 ? `<button class="btn sm" data-tugrp="1" ${ua + 1 > T.open ? 'style="opacity:.5"' : ""}>4인 소그룹반 열기(1타임)</button>` : '<span class="tag" style="opacity:.6">소그룹반: 4단계부터</span>'}
        ${T.lv >= 5 ? `<button class="btn sm ${T.agent ? "gold" : ""}" data-tuagent="1">${T.agent ? "조교 계약 끝내기" : `조교 채용 월 ${won(Math.round(45 * c.SYN.pi(S)))}`}</button>` : T.lv === 4 ? '<span class="tag" style="opacity:.6">조교: 5단계부터</span>' : ""}
      </div><div class="tiny muted" style="margin-top:6px">프로필 ${Math.round(T.prof)}점 · 수업 준비도 ${T.prep} · 자료집 ${T.mats}권${T.autoRep ? " · 정기 리포트 중" : ""}${T.ai ? " · AI 채점" : ""}${T.series ? " · 출제경향 시리즈" : ""}</div></div>`;
    // 4) 시범수업 문의
    const leads = T.leads.length ? `<div class="sec">시범수업 문의 ${T.leads.length}건</div>${T.leads.map((l) => {
      const fee = TU.feeOf(S, { ...l, grp: false }), p = TU.trialP(S, l), full = ua + l.wk > T.open;
      return `<div class="room"><div class="body"><div class="row"><div class="grow" style="min-width:0"><div class="nm">${esc(TU.leadLabel(l))}</div>
        <div class="tiny"><span class="tag ${["isl", "ovs"].includes(l.reg) ? "purple" : ""}">${esc(TU.regName(l.reg))}</span> <span class="tag ${l.how === "ref" ? "green" : ""}">${esc(TU.howName(l.how))}</span> <span class="tag">주 ${l.wk}회</span> <span class="tag">${esc(l.mood)}</span></div></div>
        <div style="text-align:right"><div class="gold" style="font-weight:900">월 ${won(fee)}</div><div class="tiny muted">성공 ${Math.round(p * 100)}%</div></div></div>
        <div class="row"><span class="grow tiny muted">${full ? "시간표가 꽉 찼어요. 타임을 늘리세요" : l.how === "app" ? `과외온 수수료 ${Math.round(T.cut * 100)}%` : "수수료 없음"}</span><button class="btn sm gold" data-act="tu_trial" data-arg="${esc(l.id)}">시범수업 ⚡1</button></div></div></div>`;
    }).join("")}` : "";
    // 5) 학생 카드
    const studs = T.studs.length ? `<div class="sec">정규 학생 ${TU.heads(S)}명</div>${T.studs.map((st) => `<div class="room"><div class="body">
      <div class="row"><div class="grow" style="min-width:0"><div class="nm">${esc(TU.studLabel(st))}</div>
        <div class="tiny"><span class="tag ${["isl", "ovs"].includes(st.reg) ? "purple" : ""}">${esc(TU.regName(st.reg))}</span> <span class="tag ${st.how === "app" ? "" : "green"}">${esc(TU.howName(st.how))}</span> <span class="tag">${st.grp ? `${st.size}명 · 1타임` : `주 ${st.wk}회`}</span>${st.pause ? ' <span class="tag blue">방학 휴식</span>' : ""}</div></div>
        <div style="text-align:right"><div class="gold" style="font-weight:900">월 ${won(st.fee)}</div><div class="tiny muted">${st.months}개월째</div></div></div>
      <div class="row small" style="gap:6px"><span style="min-width:64px">학생 만족</span><div class="grow">${meter(st.sat, 100, "var(--blue)")}</div><b style="min-width:26px;text-align:right">${pct(st.sat)}</b></div>
      <div class="row small" style="gap:6px"><span style="min-width:64px">학부모 만족</span><div class="grow">${meter(st.par, 100, st.par < 50 ? "var(--red)" : "var(--gold)")}</div><b class="${st.par < 50 ? "bad" : ""}" style="min-width:26px;text-align:right">${pct(st.par)}</b></div>
      <div class="row small"><span class="muted">${st.g === "성인" ? "시험 없음(성인)" : `성적 ${st.sc}점${st.last ? ` <b class="${st.last > 0 ? "good" : "bad"}">(${st.last > 0 ? "+" : ""}${st.last})</b>` : ""}`}</span><span class="grow"></span><button class="btn sm danger" data-tudrop="${esc(st.id)}">수업 마무리</button></div>
    </div></div>`).join("")}` : '<div class="card tiny muted">아직 정규 학생이 없어요. 과외온에서 학생을 모집하고, 문의가 오면 시범수업을 하세요. 처음엔 메시지 200통에 1건 성사라는 말도 있어요.</div>';
    // 6) 지난달 정산
    const bill = L && (L.rev || L.mat) ? `<div class="card"><h3>지난달 정산 <small>${L.ex ? esc(L.ex) : ""}</small></h3><div class="kv">
      <div><div class="k">수업료</div><div class="v">${won(L.rev)}</div></div><div><div class="k">자료 판매</div><div class="v">${won(L.mat)}</div></div>
      <div><div class="k">수수료·비용</div><div class="v bad">−${won(L.cost)}</div></div><div><div class="k">수업 진행</div><div class="v ${L.q >= 100 ? "good" : "bad"}">${L.q}%</div></div></div>
      <div class="tiny muted" style="margin-top:6px">수업을 다 못 하면 수업료 일부를 환불·보강으로 미뤄요. 회사 마감 주간엔 한 타임이 펑크 날 수 있어요.</div></div>` : "";
    return `${boardHead("tutoring")}${head}${tt}${f30}${ops}${leads}${studs}${bill}`;
  },

  bind(c) {
    const done = (msg) => { if (msg) c.toast([msg], ""); c.save(); c.render(); };
    c.q("[data-tuopen]", (el) => { TU.setOpen(c.S, c.S.tutoring.open + +el.dataset.tuopen); done(); });
    c.q("[data-tuad]", () => done(TU.toggleAd(c.S)));
    c.q("[data-tuagent]", () => done(TU.toggleAgent(c.S)));
    c.q("[data-tugrp]", () => done(TU.openGroup(c.S) ? "4인 소그룹반을 열었어요. 빈자리는 소개로 차요" : "빈 타임이 없어요. 타임을 먼저 늘리세요"));
    c.q("[data-tulic]", () => done(TU.doLicense(c.S)));
    c.q("[data-tudrop]", (el) => done(TU.dropStud(c.S, el.dataset.tudrop)));
  },
};
