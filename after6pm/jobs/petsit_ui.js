// 방문 펫시팅 화면(11-24): 이번 달 방문 약속(달력 줄) · 가구별 신뢰 · 본업화 관문 다섯 · 돌봄 회사 운영
import P, { PS_BAL, LV_N, GATES, regulars, isPro, gateStep, gateOpen, staffCap, careNeed } from "../engine/jobs/petsit.js";

function css() {
  if (document.getElementById("a6ps-css")) return;
  const st = document.createElement("style"); st.id = "a6ps-css";
  st.textContent = `
.a6ps-wk{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.a6ps-h{border:1px solid var(--line);border-radius:12px;padding:9px 11px;background:var(--panel2)}
.a6ps-h.due{border-color:var(--red)}.a6ps-h.ok{border-color:var(--green)}
.a6ps-h .nm{font-weight:700;font-size:13.5px}.a6ps-h .tg{font-size:11px;border-radius:99px;padding:0 7px;border:1px solid var(--line);color:var(--muted);margin-left:4px}
.a6ps-h .tg.r{border-color:var(--gold);color:var(--gold)}.a6ps-h .tg.n{border-color:var(--red);color:var(--red)}
.a6ps-dots{display:flex;gap:4px;margin-top:5px}.a6ps-dots i{width:22px;height:8px;border-radius:5px;background:var(--line)}.a6ps-dots i.b{background:var(--red)}.a6ps-dots i.d{background:var(--green)}
.a6ps-g{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px}
.a6ps-g div{border:1px solid var(--line);border-radius:10px;padding:6px 2px;text-align:center;font-size:11.5px;color:var(--muted)}
.a6ps-g div.on{border-color:var(--green);color:var(--green)}.a6ps-g div.cur{border-color:var(--gold);color:var(--gold);font-weight:700}
.a6ps-clash{border:1px solid var(--red);border-radius:10px;padding:7px 10px;font-size:12.5px;color:var(--red);margin-top:8px}`;
  document.head.appendChild(st);
}
export default {
  key: "petsit",
  icons: { ps_meet: "users", ps_accept: "door", ps_visit: "heart", ps_report: "pen", ps_promo: "spark", ps_edu: "book", ps_gate: "bld", ps_hire: "users", ps_care: "heart", ps_mpromo: "spark", ps_branch: "bld" },
  ic: "heart", bg: "home", sjBg: "home", fullBg: "home",
  tile: (S) => (isPro(S) && S.petsit.g.staff ? `돌봄 회사 · 직원 ${S.petsit.staff}명` : `단골 ${regulars(S.petsit)}가구`),
  side: (S) => (isPro(S) && S.petsit.g.staff ? `돌봄 회사 · 직원 ${S.petsit.staff}명` : `펫시팅 · 단골 ${regulars(S.petsit)}가구`),
  quick: (S) => (S.petsit.staff && S.petsit.care < careNeed(S.petsit) ? "ps_care" : S.petsit.homes.some((h) => h.done < h.wk) ? "ps_visit" : S.petsit.inq >= 1 ? "ps_meet" : "ps_promo"),
  cine: { ps_first: ["home", "펫시팅"], ps_trust: ["home", "펫시팅"], ps_company: ["home", "펫시팅"], ps_end_co: ["home", "펫시팅 엔딩"], ps_end_solo: ["home", "펫시팅 엔딩"], ps_end_lost: ["home", "펫시팅 엔딩"] },
  page(c) {
    css();
    const { S, won, esc, actRow, meter } = c, C = S.petsit, L = C.last, B = PS_BAL, pro = isPro(S) && C.g.staff, cap = B.homes[Math.min(3, C.lv)];
    const left = C.homes.reduce((a, h) => a + Math.max(0, h.wk - h.done), 0), gs = gateStep(C);
    const home = (h) => { const due = h.wk - h.done; return `<div class="a6ps-h ${due > 0 ? "due" : h.wk ? "ok" : ""}"><div class="row"><span class="nm grow">${esc(h.n)}${h.trust >= B.trust.regular ? '<span class="tg r">단골</span>' : ""}${h.pre ? "" : '<span class="tg n">사전 만남 안 함</span>'}</span>${due > 0 ? `<button class="btn sm gold" data-act="ps_visit" data-arg="${h.id}">방문 ⚡1</button>` : ""}</div>
      <div class="row" style="margin-top:4px"><span class="tiny muted">신뢰 ${Math.round(h.trust)}</span><div class="grow">${meter(h.trust, 100, h.trust >= B.trust.regular ? "var(--gold)" : "var(--pink)")}</div></div>
      <div class="a6ps-dots">${h.wk ? Array.from({ length: h.wk }, (_, i) => `<i class="${i < h.done ? "d" : "b"}"></i>`).join("") + `<span class="tiny muted" style="margin-left:4px">이번 달 약속 ${h.done}/${h.wk}주</span>` : `<span class="tiny muted">이번 달은 예약이 없어요</span>`}</div></div>`; };
    const gates = gateOpen(C) ? `<div class="card"><h3>본업화 관문 <small>${gs < 0 ? "모두 통과" : `${gs + 1}/5`}</small></h3><div class="tiny muted">방문 돌봄만으로는 벌이가 작아요. 관문 다섯을 풀면 돌봄 회사가 돼요(유치원·호텔·직원).</div>
      <div class="a6ps-g">${GATES.map(([k, n], i) => `<div class="${C.g[k] ? "on" : i === gs ? "cur" : ""}">${C.g[k] ? "✓ " : ""}${n}</div>`).join("")}</div>
      ${gs >= 0 ? `<div class="tiny" style="margin-top:6px"><b>${GATES[gs][1]}</b> · ${esc(GATES[gs][2])}${GATES[gs][0] === "cert" ? ` (${C.certN}/${B.gate.certN})` : GATES[gs][0] === "reg" && C.regT != null ? ` · 심사 ${Math.max(1, C.regT - S.t)}개월 남음` : ""}</div><div class="acts" style="padding:0;margin-top:6px">${actRow("ps_gate", undefined, `${GATES[gs][1]} 관문 풀기`)}</div>` : ""}</div>` : `<div class="card" style="padding:8px 12px"><div class="tiny muted">단골 ${B.lv[B.gate.lv - 1]}가구가 되면 <b>본업화 관문</b>이 열려요(지금 ${regulars(C)}가구). 그 전까지 벌이는 작아요.</div></div>`;
    const proCard = pro ? `<div class="card"><h3>돌봄 회사 <small>${C.br + 1}호점 · 직원 ${C.staff}/${staffCap(C)}명</small></h3>
      <div class="kv"><div><div class="k">유치원 회원</div><div class="v">${C.mem}/${C.staff * B.pro.per}</div></div><div><div class="k">지난달 호텔</div><div class="v">${L?.pro?.nights ?? 0}박</div></div><div><div class="k">사람 챙기기</div><div class="v ${C.care >= careNeed(C) ? "good" : "bad"}">${C.care}/${careNeed(C)}</div></div></div>
      <div class="tiny muted" style="margin-top:4px">직원 3명에 한 번씩 챙겨야 해요. 못 챙기면 그만두거나 사고가 나요. 월급 1인 ${won(Math.round(B.pro.wage * (S.pi || 1)))}.</div>
      <div class="acts" style="padding:0;margin-top:6px">${actRow("ps_care")}${actRow("ps_mpromo")}${actRow("ps_hire")}${actRow("ps_branch")}</div></div>` : "";
    return `<div class="card"><h3>${pro ? "돌봄 회사" : "방문 펫시팅"} <small>${LV_N[C.lv]}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${(L?.profit ?? 0) >= 0 ? "good" : "bad"}">${won(L?.profit ?? 0)}</div></div><div><div class="k">가구</div><div class="v">${C.homes.length}/${cap}</div></div><div><div class="k">단골</div><div class="v">${regulars(C)}</div></div><div><div class="k">별점</div><div class="v">★${C.rating.toFixed(2)}</div></div></div>
      <div class="tiny muted" style="margin-top:6px">방문은 <b class="gold">약속</b>이에요. 이번 달 약속을 안 가면 신뢰가 크게 깎이고, 대신 보낼 수 없어요. 명절·휴가철(1·2·7·8·9·12월)에 예약이 몰려요.</div>
      ${C.clash && left ? `<div class="a6ps-clash">이번 달은 회사 일이 방문 약속과 부딪칠 것 같아요.</div>` : ""}</div>
    <div class="sec">이번 달 방문 약속 <span class="${left ? "bad" : "muted"} small">· 남은 ${left}주</span></div>
    <div class="a6ps-wk">${C.homes.length ? C.homes.slice().sort((a, b) => (b.wk - b.done) - (a.wk - a.done) || b.trust - a.trust).map(home).join("") : `<div class="tiny muted">아직 맡은 집이 없어요. 소개 글을 쓰면 문의가 와요.</div>`}</div>
    <div class="card" style="margin-top:10px"><div class="row"><b>새 문의</b><span class="grow"></span><span class="${C.inq >= 1 ? "gold" : "muted"}">${Math.floor(C.inq)}건</span></div>
      <div class="acts" style="padding:0;margin-top:6px">${C.inq >= 1 ? actRow("ps_meet") + actRow("ps_accept") : ""}${actRow("ps_promo")}${actRow("ps_report")}${actRow("ps_edu")}</div></div>
    ${gates}${proCard}`;
  },
};
