// 출장 세차 화면(11-27, 1단계): 거점 지도(깃발) · 이번 달 네 주의 날씨 · 거점별 회차 · 봐 둔 건물 · 본업화 관문 넷 · 차량 관리 회사
// 2단계(11-27): 용품 가방 · 처방 카드 · 차 도감 · 처방 노트(창 하나에 탭 넷). 자료는 engine/jobs/carwash_data.js
import * as X from "../engine/jobs/carwash.js";
import * as UNDC from "../engine/und.js"; // 11-28 업의 이해도: 등급 · 업계 상위 % 는 공통 계산을 쓴다
import { undCard as undCardC } from "../und_ui.js"; // 11-28 업의 이해도 공통 카드
import { CW_BAL, lvName, gateDone, man1, GATES, WX_N, wxOf, dryWeeks, season, isCo, gateStep, gateOpen, custAll, owedAll, backAll, careNeed, staffCap, baseMax, corpMax, carCap, runCap, perRun, needWaste, talkP, bidP, bldHelp, gating, ageK } from "../engine/jobs/carwash.js";

function css() {
  if (document.getElementById("cw-css")) return;
  const st = document.createElement("style"); st.id = "cw-css";
  st.textContent = `
.cw-map{position:relative;height:150px;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:8px;background:linear-gradient(0deg,rgba(106,168,255,.05) 1px,transparent 1px) 0 0/100% 30px,linear-gradient(90deg,rgba(106,168,255,.05) 1px,transparent 1px) 0 0/12.5% 100%,var(--panel2)}
.cw-map .cw-road{position:absolute;left:0;right:0;top:52%;height:6px;background:var(--panel3);opacity:.8}.cw-map .cw-road.v{left:24%;right:auto;top:0;bottom:0;width:6px;height:auto}.cw-map .cw-road.v2{left:74%;right:auto;top:0;bottom:0;width:6px;height:auto}
.cw-map .cw-ring{position:absolute;left:26%;right:26%;top:8%;bottom:8%;border:1.5px dashed var(--gold);border-radius:50%;opacity:.55}
.cw-map .cw-ringn{position:absolute;left:50%;top:4px;transform:translateX(-50%);font-size:10.5px;color:var(--gold);white-space:nowrap}
.cw-flag{position:absolute;transform:translate(-50%,-100%);text-align:center;line-height:1;pointer-events:none}
.cw-flag b{display:block;font-size:20px}.cw-flag i{display:inline-block;font-style:normal;font-size:10px;font-weight:700;border-radius:99px;padding:1px 5px;background:var(--bg);border:1px solid var(--green);color:var(--green);margin-top:1px}
.cw-flag.due i{border-color:var(--red);color:var(--red)}.cw-flag.hold{opacity:.45}.cw-flag.lead b{font-size:15px;opacity:.75}.cw-flag.lead i{border-color:var(--line);color:var(--muted)}
.cw-wx{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}
.cw-wx div{border:1px solid var(--line);border-radius:10px;padding:5px 2px;text-align:center;font-size:11.5px;color:var(--muted);background:var(--panel2);min-width:0}
.cw-wx div b{display:block;font-size:18px;line-height:1.2}.cw-wx div.sun{border-color:var(--gold);color:var(--gold)}.cw-wx div.rain{border-color:var(--blue);color:var(--blue)}.cw-wx div.ice{border-color:var(--purple);color:var(--purple)}
.cw-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.cw-b{border:1px solid var(--line);border-radius:12px;padding:9px 11px;background:var(--panel2);min-width:0}
.cw-b.due{border-color:var(--red)}.cw-b.ok{border-color:var(--green)}.cw-b.hold{opacity:.6}
.cw-b .cw-nm{font-weight:700;font-size:13.5px;word-break:keep-all}
.cw-tg{display:inline-block;font-size:11px;border-radius:99px;padding:0 7px;border:1px solid var(--line);color:var(--muted);margin:2px 4px 0 0;white-space:nowrap}
.cw-tg.g{border-color:var(--green);color:var(--green)}.cw-tg.r{border-color:var(--red);color:var(--red)}.cw-tg.y{border-color:var(--gold);color:var(--gold)}
.cw-g{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
.cw-g div{border:1px solid var(--line);border-radius:10px;padding:6px 2px;text-align:center;font-size:11.5px;color:var(--muted);min-width:0;word-break:keep-all}
.cw-g div.on{border-color:var(--green);color:var(--green)}.cw-g div.cur{border-color:var(--gold);color:var(--gold);font-weight:700}
.cw-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.cw-tg.q{border-style:dashed;color:var(--muted)}
.cw-rx{border:1px solid var(--gold);border-radius:12px;padding:9px 11px;background:var(--panel2);min-width:0}
.cw-rx.corp{border-color:var(--blue)}
.cw-slot{border-top:1px solid var(--line);padding:7px 0;min-width:0}
.cw-slot .cw-sn{font-size:12px;color:var(--muted);display:flex;justify-content:space-between;gap:6px}
.cw-opts{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.cw-opt{border:1px solid var(--line);border-radius:10px;padding:5px 8px;font-size:12px;background:var(--bg);color:inherit;text-align:left;max-width:100%;min-width:0;word-break:keep-all}
.cw-opt.on{border-color:var(--gold);background:rgba(245,192,78,.12)}
.cw-opt.warn{border-color:var(--red)}
.cw-opt small{display:block;color:var(--muted);font-size:10.5px;line-height:1.3}
.cw-pv{border:1px dashed var(--line);border-radius:10px;padding:7px 9px;margin-top:8px;font-size:12.5px;word-break:keep-all}
.cw-it{border:1px solid var(--line);border-radius:10px;padding:7px 9px;background:var(--panel2);display:flex;gap:8px;align-items:center;min-width:0;margin-top:5px}
.cw-it.in{border-color:var(--green)}
.cw-it .grow{min-width:0;font-size:12.5px;word-break:keep-all}.cw-it .btn{flex:none}
.cw-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0 8px}
.cw-tabs button{border:1px solid var(--line);border-radius:10px;padding:6px 2px;font-size:12.5px;background:var(--panel2);color:var(--muted);min-width:0}
.cw-tabs button.on{border-color:var(--gold);color:var(--gold);font-weight:700}
.cw-dex{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px}
.cw-dex>div{border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-size:12px;min-width:0;word-break:keep-all;background:var(--panel2)}
.cw-dex>div.un{opacity:.45}
.cw-h{font-weight:700;font-size:13px;margin-top:10px;word-break:keep-all}
.cw-seg{display:inline-grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:10px;overflow:hidden;flex:none}
.cw-seg button{border:0;background:var(--panel2);color:var(--muted);font-size:12px;padding:5px 10px;min-width:0}.cw-seg button.on{background:rgba(245,192,78,.16);color:var(--gold);font-weight:700}
.cw-prow{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
.cw-step{display:grid;grid-template-columns:44px 1fr 44px;gap:8px;align-items:center;margin-top:10px}
.cw-step button{height:44px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);color:inherit;font-size:20px}
.cw-step .cw-big{text-align:center;font-size:20px;font-weight:700;word-break:keep-all}`;
  document.head.appendChild(st);
}
function demo(S) { // 시험용 상태: 거점 둘(동선 안·밖)과 봐 둔 건물 하나
  const C = S.carwash; if (!C) return;
  C.bases = [{ id: "B" + (++C.seq), n: "내가 사는 오피스텔 지하 주차장", zone: 0, cap: 5, drain: true, x: 48, y: 46, cust: 4, owed: 8, back: 0, done: 0, sat: 60, since: S.t, hold: 0, night: 0 },
    { id: "B" + (++C.seq), n: "신축 아파트 단지 지하 주차장", zone: 1, cap: 12, drain: false, x: 86, y: 30, cust: 6, owed: 14, back: 2, done: 0, sat: 48, since: S.t, hold: 0, night: 0 }];
  C.leads = [{ id: "L" + (++C.seq), n: "주상복합 지하 주차장", zone: 0, cap: 9, drain: false, dc: 55, tries: 1, x: 36, y: 70 }]; C.lv = 2; C.mT = S.t; C.runs = 0; C.cars = 0;
  // 2단계 시험: 중급 용품 몇 개, 고급 주상복합 한 곳(정기 둘 · 처방 대기 둘), 노트 두 장
  C.washes = Math.max(C.washes || 0, 400); C.own = C.own || {}; for (const id of ["p_spray", "w_one", "h_left", "d_towel", "f_wax", "p_foam", "w_two", "h_clean", "d_big", "f_seal", "f_matte", "s_glass", "s_lens", "i_vac"]) C.own[id] = 1;
  C.bag = ["p_spray", "h_left", "p_foam", "w_two", "h_clean", "d_big", "f_seal", "f_matte", "s_glass", "s_lens"]; C.packT = -1; C.notes = {}; C.dex = {}; C.cdex = { kids: 1 }; C.warn = { "kronen.0": ["one"] };
  const pb = { id: "B" + (++C.seq), n: "강변 주상복합", tier: 1, zone: 0, cap: 6, drain: true, x: 60, y: 62, cust: 0, owed: 0, back: 0, done: 0, sat: 62, since: S.t, hold: 0, night: 0 }; C.bases.push(pb);
  const mk = (m, p, cu, st) => ({ id: "V" + (++C.seq), b: pb.id, m, g: 0, p, c: cu, st, since: S.t, tries: 0 });
  const a1 = mk("haeorum", "coat", "kids", "wait"), a2 = mk("kongal", "std", "photo", "wait"); C.vips = [a1, a2, mk("lumenx", "matte", "matteowner", "wait"), mk("kronen", "ppf", "mania", "wait")];
  X.adopt(C, a1, ["p_foam", "w_two", "h_clean", "d_big", "f_seal", "", "", "i_vac"], "S"); X.adopt(C, a2, ["p_foam", "w_two", "h_clean", "d_big", "f_seal", "s_tire", "", ""], "A"); pb.owed = pb.cust * 2;
}
const WX_IC = { sun: "☀️", rain: "🌧️", ice: "🧊" };
const tg = (t, k = "") => `<span class="cw-tg ${k}">${X.tagN(t)}</span>`, QQ = '<span class="cw-tg q">??? (아직 모름)</span>';
function carTags(C, v) { const V = X.viewOf(C, v), one = (t, k, pre = "") => (V.hid.has(t) ? QQ : `<span class="cw-tg ${k}">${pre}${X.tagN(t)}</span>`); return { V, html: V.need.map((t) => one(t, "y")).join("") + V.fine.map((t) => one(t, "", "세부 · ")).join("") + V.ban.map((t) => one(t, "r", "금기 · ")).join("") }; }
const itLine = (S, it) => `${it.min}분 · 재료 ${man1(it.mat * (S.pi || 1))} · 무게 ${it.wt}${it.tags.length ? " · " + it.tags.map((t) => X.tagN(t)).join("·") : ""}`;
let RX = null; // 짜고 있는 처방(창을 다시 그려도 남게)
function rxWin(c, vid) {
  const v0 = c.S.carwash.vips.find((x) => x.id === vid && x.st === "wait"); if (!v0) return;
  if (!RX || RX.vid !== vid) { const ref = X.refNote(c.S.carwash, v0); RX = { vid, q: 1, sel: X.SLOTS.map((sl, i) => (ref && ref.rx[i] && X.inBag(c.S, ref.rx[i]) ? ref.rx[i] : "")), ref: ref?.kind || "" }; }
  c.openWin(`<div id="cw-rxw"></div>`, (w) => {
    const box = w.querySelector("#cw-rxw"), win = w.querySelector(".win");
    const paint = () => {
      const S = c.S, C = S.carwash, v = C.vips.find((x) => x.id === vid && x.st === "wait"), esc = c.esc, P = S.pi || 1; if (!v) return c.closeWin();
      const T = carTags(C, v), V = T.V, U = X.CUSTS[v.c], pv = X.rxPreview(S, v, RX.sel, RX.q), arg = `${vid}:${RX.sel.join(",")}:${RX.q}`, why = c.E.canAct(S, "cw_rx", arg), ban = new Set([...V.ban.filter((t) => !V.hid.has(t)), ...(V.cban && !V.cbanHid ? [V.cban] : [])]), first = !(C.dex[`${v.m}.${v.g}`]?.n > 0), warn = C.warn[`${v.m}.${v.g}`] || [], bag = X.kit(S);
      const slot = (sl, i) => { const L = bag.filter((x) => x.slot === (sl.of || sl.id)), cur = X.ITEM[RX.sel[i]]; return `<div class="cw-slot"><div class="cw-sn"><b>${i < 5 ? i + 1 + " " : ""}${sl.n}${sl.need ? "" : " (선택)"}</b><span>${cur ? esc(cur.n) + " · " + cur.min + "분" : sl.need ? '<span class="bad">골라요</span>' : "안 함"}</span></div>
        <div class="cw-opts">${sl.need ? "" : `<button class="cw-opt ${cur ? "" : "on"}" data-cwsel="${i}:">안 함</button>`}${L.map((it) => `<button class="cw-opt ${RX.sel[i] === it.id ? "on" : ""} ${it.tags.some((t) => ban.has(t)) ? "warn" : ""}" data-cwsel="${i}:${it.id}">${esc(it.n)}${it.tags.some((t) => ban.has(t)) ? " ⚠" : ""}<small>${itLine(S, it)}</small></button>`).join("") || (sl.need ? "" : '<span class="tiny muted" style="align-self:center">가방에 없어요</span>')}</div></div>`; };
      box.innerHTML = `<h2>처방 짜기 <button class="x" data-close>✕</button></h2>
        <div class="tiny gold">${first ? "새 차종" : "닦아 본 차종"} · ${V.cbanHid ? "처음 보는 고객" : "아는 고객 유형"}${v.x ? " · 임원 지정석(법인 계약)" : v.k ? " · 법인 차량" : ""}</div>
        ${v.k ? "" : `<div class="tiny" style="margin-top:3px">찾는 상품: <b class="gold">${esc(X.svcOf(v).n)}</b> <span class="muted">· ${esc(X.svcOf(v).memo)} · 기준가 ${man1(X.CLASSES[X.MODEL[v.m].cls].price * P)} × ${X.svcOf(v).k}</span></div>`}
        <div class="cw-nm" style="font-size:15.5px;margin-top:2px">${esc(X.vipName(v))} <span class="muted">×</span> ${esc(U.n)}</div>
        <div style="margin-top:4px">${T.html || '<span class="cw-tg">숙제 없음</span>'}</div>
        <div class="tiny muted" style="margin-top:4px">${esc(V.hw || "")}${V.gmemo ? ` · <b>신형:</b> ${esc(V.gmemo)}` : ""}${X.PAINTS[v.p]?.memo ? ` · ${esc(X.PAINTS[v.p].memo)}` : ""}</div>
        <div class="tiny" style="margin-top:4px">바라는 것: <b>${esc(U.say)}</b> ${U.want.map((t) => tg(t, pv.tags.has(t) ? "g" : "")).join("")}<br>싫어하는 것: ${V.cbanHid ? QQ : `<b class="bad">${esc(U.hate)}</b>`} · 잘 맞추면: ${esc(U.winN)}</div>
        ${warn.length ? `<div class="tiny bad" style="margin-top:4px">노트의 경고: 이 차에 ${warn.map((t) => X.tagN(t)).join(" · ")} 금지</div>` : ""}
        ${RX.ref && RX.ref !== "exact" ? `<div class="tiny muted" style="margin-top:4px">${RX.ref === "old" ? "구형 노트를 참고로 채웠어요. 신형에서 바뀐 곳은 새로 맞춰야 해요." : "같은 차의 다른 노트를 참고로 채웠어요."}</div>` : ""}
        ${X.SLOTS.map(slot).join("")}
        ${v.k ? "" : `<div class="cw-slot"><div class="cw-sn"><b>이 고객에게 부를 값</b><span>${V.cbanHid ? "처음 보는 고객이라 감이 없어요" : (U.px >= 1.25 ? "값을 잘 안 따져요" : U.px >= 1.05 ? "조금 더 불러도 돼요" : U.px >= 1 ? "시세만큼 내요" : "값에 민감해요")}</span></div><div class="cw-opts">${[["깎아 주기", "−10% · 잘 안 끊어요"], ["내 단가", "기본"], ["더 부르기", "+25% · 지불 의사를 넘으면 한 번만 맡겨요"], ["크게 부르기", "+50% · 지불 의사가 높은 고객만. 넘으면 평판도 깎여요"]].map(([n, d], i) => `<button class="cw-opt ${RX.q === i ? "on" : ""}" data-cwq="${i}">${n}<small>${d}</small></button>`).join("")}</div></div>`}
        <div class="cw-pv"><b>예상</b> ${pv.min}분 · 재료비 ${man1(pv.mat * P)} · 받는 값 ${man1(pv.px * P)}${pv.mood ? ` <span class="${pv.mood === "돌아설 듯" ? "bad" : pv.mood === "망설일 듯" ? "gold" : "good"}">(${pv.mood})</span>` : ""} · 사고 위험 <b class="${pv.risk === "높음" ? "bad" : pv.risk === "낮음" ? "good" : "gold"}">${pv.risk}</b> · 체력 ${pv.load}대 몫
          ${pv.hit.length ? `<div class="bad">금기를 건드려요: ${pv.hit.map((t) => X.tagN(t)).join(" · ")}</div>` : ""}${pv.miss.length ? `<div class="gold">못 채운 숙제: ${pv.miss.map((t) => X.tagN(t)).join(" · ")}</div>` : ""}${pv.missS.length ? `<div class="muted">S까지 남은 것: ${pv.missS.map((t) => X.tagN(t)).join(" · ")}</div>` : ""}${pv.unknown ? `<div class="muted">모르는 칸 ${pv.unknown}개. 닦아 보면 드러나요.</div>` : !pv.hit.length && !pv.miss.length && !pv.missS.length ? '<div class="good">아는 숙제와 요구를 다 채웠어요.</div>' : ""}</div>
        <button class="btn gold" data-cwgo style="width:100%;margin-top:10px" ${why ? "disabled" : ""}>이 처방으로 닦기 ⚡1</button>
        ${why ? `<div class="tiny bad" style="margin-top:4px">${esc(String(why))}</div>` : ""}
        <div class="tiny muted" style="margin-top:6px">숙제를 다 채우면 A, 고객 요구까지 맞추면 S. A부터 노트에 남아 다음부터 자동으로 돌아요. 금기를 건드리면 사고예요(복원비·평판). 틀린 이유는 노트에 남아요.</div>`;
      box.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => c.closeWin()));
      box.querySelectorAll("[data-cwsel]").forEach((b) => (b.onclick = () => { const [i, id] = b.dataset.cwsel.split(":"); if (id) RX.sel = RX.sel.map((x, k) => (x === id && k !== +i ? "" : x)); RX.sel[+i] = id || ""; const st = win ? win.scrollTop : 0; paint(); if (win) win.scrollTop = st; }));
      box.querySelectorAll("[data-cwq]").forEach((b) => (b.onclick = () => { RX.q = +b.dataset.cwq; const st = win ? win.scrollTop : 0; paint(); if (win) win.scrollTop = st; }));
      const go = box.querySelector("[data-cwgo]"); if (go) go.onclick = () => { c.closeWin(); RX = null; c.doAct("cw_rx", arg); };
    };
    paint();
  });
}
let TAB = "bag";
function kitWin(c, tab) { // 가방 · 가게 · 도감 · 노트
  if (tab) TAB = tab;
  c.openWin(`<div id="cw-kw"></div>`, (w) => {
    const box = w.querySelector("#cw-kw"), win = w.querySelector(".win");
    const act = (id, arg) => { const r = c.E.act(c.S, id, arg); if (!r.ok) c.toast([], r.msg); else { c.save(); if (id === "cw_buy" && r.lines?.length) c.toast(r.lines, r.msg); } const st = win ? win.scrollTop : 0; paint(); if (win) win.scrollTop = st; };
    const paint = () => {
      const S = c.S, C = S.carwash, esc = c.esc, B = CW_BAL, P = S.pi || 1, free = X.bagFree(S), lock = !free && C.packT === S.t, slots = X.SLOTS.filter((sl) => !sl.of), sn = (sl) => sl.n.replace(" ①", "");
      let body = "";
      if (TAB === "bag") {
        body = `<div class="tiny muted">${free ? "작업 차량이 있어 가진 용품이 전부 실려요." : `출장이라 다 못 실어요. 무게 ${B.rx.wt}까지. 이번 달 도는 거점의 차에 맞춰 싸요.`}${lock ? ' <b class="bad">이번 달은 이미 메고 나가 못 바꿔요.</b>' : ""}</div>
          ${free ? "" : `<div class="row" style="margin-top:6px"><span class="tiny muted">무게 ${X.bagWt(C)}/${B.rx.wt}</span><div class="grow">${c.meter(X.bagWt(C), B.rx.wt, "var(--gold)")}</div></div><div class="cw-btns"><button class="btn sm gold" data-cwpack="auto" ${lock ? "disabled" : ""}>노트대로 싸기</button></div>`}
          ${slots.map((sl) => { const L = X.ITEMS.filter((x) => x.slot === sl.id && C.own[x.id]); return `<div class="cw-h">${sn(sl)}${sl.need ? "" : " (선택)"}</div>${L.map((it) => { const on = X.inBag(S, it.id); return `<div class="cw-it ${on ? "in" : ""}"><div class="grow"><b>${esc(it.n)}</b> <span class="muted">${X.TIER_N[it.tier]}</span><div class="tiny muted">${itLine(S, it)}</div></div>${free ? "" : `<button class="btn sm" data-cwpack="${it.id}" ${lock ? "disabled" : ""}>${on ? "빼기" : "넣기"}</button>`}</div>`; }).join("") || '<div class="tiny muted">가진 것이 없어요</div>'}`; }).join("")}`;
      } else if (TAB === "shop") {
        const open = X.ITEMS.filter((x) => !C.own[x.id] && X.itemOpen(S, x)), later = X.ITEMS.filter((x) => !C.own[x.id] && !X.itemOpen(S, x)).length;
        body = `<div class="tiny muted">용품마다 값, 한 대 재료비, 걸리는 시간, 무게, 꼬리표가 달라요. 가진 돈 ${c.won(S.cash)}.</div>
          ${slots.map((sl) => { const L = open.filter((x) => x.slot === sl.id); return L.length ? `<div class="cw-h">${sn(sl)}</div>${L.map((it) => `<div class="cw-it"><div class="grow"><b>${esc(it.n)}</b> <span class="muted">${X.TIER_N[it.tier]}</span><div class="tiny muted">${itLine(S, it)}</div>${it.memo ? `<div class="tiny gold">${esc(it.memo)}</div>` : ""}</div><button class="btn sm gold" data-cwbuy="${it.id}" ${S.cash < X.itemCost(S, it) ? "disabled" : ""}>${c.won(X.itemCost(S, it))}</button></div>`).join("")}` : ""; }).join("") || '<div class="tiny muted" style="margin-top:8px">지금 살 수 있는 용품은 다 샀어요.</div>'}
          ${later ? `<div class="tiny muted" style="margin-top:10px">아직 가게에 없는 용품 ${later}개. 신형 차가 나오거나 해가 지나면 풀려요.</div>` : ""}`;
      } else if (TAB === "dex") {
        const seenM = (m) => Object.keys(C.dex).filter((k) => k.startsWith(m.id + ".")), live = X.MODELS.filter((m) => (m.from || 0) <= S.t), nSeen = live.filter((m) => seenM(m).length).length, E = X.eraOf(S);
        body = `<div class="tiny muted">만난 차 ${nSeen}/${live.length}종${X.MODELS.length > live.length ? ` · 아직 세상에 없는 차 ${X.MODELS.length - live.length}종` : ""}. 차는 3~5년마다 신형으로 바뀌어요. 예전 노트는 구형에만 통해요. 기준가는 기본 세차 한 대 값이에요(꼼꼼 ×${X.SVC[1].k}, 프리미엄 ×${X.SVC[2].k}). 어느 거점에서 닦아도 같아요.</div>
          <div class="tiny muted">요즘 들어오는 차: 전기차 ${E.ev >= 2 ? "아주 많음" : E.ev >= 1.2 ? "많음" : E.ev >= 0.8 ? "늘어나는 중" : "드묾"} · 내연 고성능차 ${E.perf >= 0.9 ? "흔함" : E.perf >= 0.5 ? "줄어드는 중" : "수집가 쪽으로 넘어감"}</div>
          ${Object.entries(X.CLASSES).map(([ck, K]) => { const L = live.filter((m) => m.cls === ck); if (!L.length) return ""; const any = L.some((m) => seenM(m).length); return `<div class="cw-h">${esc(K.n)} <span class="muted tiny">기준가 ${man1(K.price * P)}</span></div><div class="tiny muted">${any ? esc(K.hw) : "아직 만난 적 없는 갈래예요"}</div>
            <div class="cw-dex">${L.map((m) => { const ks = seenM(m), cur = X.genOf(C, m.id); if (!ks.length) return `<div class="un">???${cur ? ` <span class="tiny">(${cur + 1}세대까지 나옴)</span>` : ""}</div>`; const g = Math.max(...ks.map((k) => +k.split(".")[1])), T = carTags(C, { m: m.id, g, p: "std", c: "mania" }), nt = Object.keys(C.notes).filter((k) => k.startsWith(m.id + ".")).length; return `<div><b>${esc(X.carName(m.id, g))}</b>${cur > g ? ' <span class="tiny gold">신형 나옴</span>' : ""}<div style="margin-top:2px">${T.html || '<span class="tiny muted">숙제 없음</span>'}</div><div class="tiny muted">노트 ${nt}장</div></div>`; }).join("")}</div>`; }).join("")}`;
      } else {
        const N = Object.entries(C.notes).sort((a, b) => b[1].t - a[1].t), nk = Math.min(B.rx.note.max, N.length), wk = Object.entries(C.warn).filter(([, L]) => L.length);
        body = `<div class="tiny muted">맞춘(A 이상) 차×상태×고객×상품 조합이 한 장씩 남아요. 노트에 있는 차는 자동으로 돌고, 직원·알바도 노트에 있는 차만 맡아요.</div>
          <div class="kv" style="margin-top:6px"><div><div class="k">노트</div><div class="v">${N.length}장</div></div><div><div class="k">그중 S</div><div class="v gold">${N.filter(([, n]) => n.gr === "S").length}장</div></div><div><div class="k">입소문</div><div class="v good">+${Math.round(nk * B.rx.note.wom * 100)}%p</div></div><div><div class="k">사건 위험</div><div class="v good">−${Math.round(nk * B.rx.note.risk * 100)}%</div></div></div>
          ${wk.length ? `<div class="cw-h">경고(틀려서 배운 것)</div>${wk.map(([k, L]) => { const [m, g] = k.split("."); return `<div class="tiny bad">· ${esc(X.carName(m, +g))}: ${L.map((t) => X.tagN(t)).join(" · ")} 금지</div>`; }).join("")}` : ""}
          <div class="cw-h">노트 ${N.length > 30 ? "(최근 30장)" : ""}</div>
          ${N.slice(0, 30).map(([k, n]) => { const [mg, p, cu, sv] = k.split("|"), [m, g] = mg.split("."), E2 = X.rxEval(n.rx); return `<div class="cw-it"><div class="grow"><b>${esc(X.carName(m, +g))}</b> <span class="cw-tg ${n.gr === "S" ? "y" : "g"}">${n.gr}</span><div class="tiny muted">${esc(X.svcOf({ s: sv }).n)} · ${esc(X.PAINTS[p]?.n || "")} · ${esc(X.CUSTS[cu]?.n || "")} · ${E2.min}분 · 재료 ${man1(E2.mat * P)}</div><div class="tiny">${n.rx.filter(Boolean).map((id) => esc(X.ITEM[id]?.n || "")).join(" → ")}</div></div></div>`; }).join("") || '<div class="tiny muted" style="margin-top:6px">아직 노트가 없어요. 고급 거점에서 처방을 맞추면 쌓여요.</div>'}`;
      }
      box.innerHTML = `<h2>${{ bag: "용품 가방", shop: "용품 가게", dex: "차 도감", note: "처방 노트" }[TAB]} <button class="x" data-close>✕</button></h2>
        <div class="cw-tabs">${[["bag", "가방"], ["shop", "가게"], ["dex", "도감"], ["note", "노트"]].map(([k, n]) => `<button class="${TAB === k ? "on" : ""}" data-cwtab="${k}">${n}</button>`).join("")}</div>${body}`;
      box.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { c.closeWin(); c.render(); }));
      box.querySelectorAll("[data-cwtab]").forEach((b) => (b.onclick = () => { TAB = b.dataset.cwtab; paint(); if (win) win.scrollTop = 0; }));
      box.querySelectorAll("[data-cwpack]").forEach((b) => (b.onclick = () => act("cw_pack", b.dataset.cwpack)));
      box.querySelectorAll("[data-cwbuy]").forEach((b) => (b.onclick = () => act("cw_buy", b.dataset.cwbuy)));
    };
    paint();
  });
}
let PR = null; // 고르고 있는 단가(창을 다시 그려도 남게)
function priceWin(c, tier) {
  if (!PR || PR.tier !== tier) PR = { tier, pct: null };
  c.openWin(`<div id="cw-pw"></div>`, (w) => {
    const box = w.querySelector("#cw-pw");
    const paint = () => {
      const S = c.S, C = S.carwash, M = X.MARKET, P = S.pi || 1, V0 = X.priceView(S, tier), auto = V0.auto, cur = Math.max(M.min, Math.min(M.max, Math.round(C.rate[tier] / M.step) * M.step));
      if (PR.pct == null) PR.pct = cur; const V = X.priceView(S, tier, auto ? undefined : PR.pct), arg = `${tier}:${PR.pct}`, why = auto ? null : c.E.canAct(S, "cw_price", arg), T = X.SVC[tier];
      box.innerHTML = `<h2>단가 정하기 <button class="x" data-close>✕</button></h2>
        <div class="cw-prow"><div class="cw-nm">${c.esc(T.n)}</div><div class="cw-seg"><button class="${auto ? "on" : ""}" data-cwpm="auto">오토</button><button class="${auto ? "" : "on"}" data-cwpm="manual">직접</button></div></div>
        <div class="tiny muted" style="margin-top:4px">${c.esc(T.memo)}. ${tier ? `기준은 ${c.esc(X.CLASSES[M.ref].n)} 한 대 값이에요. 차마다 기준가가 다르고 같은 비율로 움직여요.` : "일반차 한 대 값이에요."} 법인 계약은 입찰가라 여기에 안 걸려요.</div>
        <div class="kv" style="margin-top:8px"><div><div class="k">요즘 시세</div><div class="v">${man1(V.mkWon * P)}</div></div><div><div class="k">${auto ? "오토가 잡은 값" : "지금 내 단가"}</div><div class="v gold">${man1(V0.won * P)}</div></div><div><div class="k">시세 대비</div><div class="v">${V0.ratio}%</div></div><div><div class="k">실력 웃돈</div><div class="v ${V.skill === "거의 없음" ? "" : "good"}">${V.skill}</div></div></div>
        ${V.why.length ? `<div class="tiny" style="margin-top:6px">${V.why.map((x) => "· " + c.esc(x)).join("<br>")}</div>` : '<div class="tiny muted" style="margin-top:6px">· 시세가 잔잔해요</div>'}
        ${auto ? `<div class="cw-pv">오토가 잡은 값 <b>${man1(V0.won * P)}</b>(시세의 ${V0.ratio}%) · 보수적으로 잡아요. 문의는 <b>${V0.ask}</b>.<div class="muted">시세보다 조금 낮게, 실력 웃돈은 조금만 받아요. 시세가 급하게 움직이면 한두 달 늦게 따라가요. 조금씩만 움직여서 값 때문에 떠나는 고객은 없어요. 잘 맞춘 값보다는 덜 벌어요.</div></div>`
          : `<div class="cw-step"><button data-cwpd="-1" ${PR.pct <= M.min ? "disabled" : ""}>−</button><div class="cw-big">${man1(V.won * P)} <span class="tiny muted">시세의 ${V.ratio}%</span></div><button data-cwpd="1" ${PR.pct >= M.max ? "disabled" : ""}>+</button></div>
        <div class="cw-pv">이 값이면 문의가 <b class="${V.ask === "많음" ? "good" : V.ask === "보통" ? "" : V.ask === "드묾" ? "gold" : "bad"}">${V.ask}</b>${V.leave ? ` · 값을 올리면 떠날 정기 고객: <b class="${V.leave === "여럿" ? "bad" : "gold"}">${V.leave}</b>` : ""}<div class="muted">오토라면 ${man1(V.autoWon * P)}(시세의 ${V.autoRatio}%). 싸면 문의가 늘고 덜 끊어요. 비싸면 문의가 줄고, 많이 비싸면 끊겨요. 이해도·평판·S 노트가 쌓이면 더 불러도 돼요. 한 번에 크게 올리면 더 많이 떠나요.</div></div>
        <button class="btn gold" data-cwpgo style="width:100%;margin-top:10px" ${why ? "disabled" : ""}>이 값으로 정하기</button>${why ? `<div class="tiny bad" style="margin-top:4px">${c.esc(String(why))}</div>` : ""}
        <div class="tiny muted" style="margin-top:6px">직접 정하면 한 달에 한 번 바꿀 수 있어요.</div>`}`;
      box.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { c.closeWin(); c.render(); }));
      box.querySelectorAll("[data-cwpm]").forEach((b) => (b.onclick = () => { if ((b.dataset.cwpm === "auto") === auto) return; const r = c.E.act(c.S, "cw_price", `${tier}:${b.dataset.cwpm}`); if (!r.ok) c.toast([], r.msg); else c.save(); PR.pct = null; paint(); }));
      box.querySelectorAll("[data-cwpd]").forEach((b) => (b.onclick = () => { PR.pct = Math.max(M.min, Math.min(M.max, PR.pct + M.step * +b.dataset.cwpd)); paint(); }));
      const go = box.querySelector("[data-cwpgo]"); if (go) go.onclick = () => { c.closeWin(); PR = null; c.doAct("cw_price", arg); };
    };
    paint();
  });
}
const coOn = (S) => isCo(S);
export default {
  key: "carwash",
  icons: { cw_price: "coin", cw_buy: "coin", cw_pack: "brief", cw_rx: "spark", cw_study: "book", cw_scout: "search", cw_talk: "msg", cw_wash: "spark", cw_gear: "wrench", cw_promo: "mega", cw_photo: "cam", cw_deal: "brief", cw_hire: "users", cw_care: "heart", cw_gate: "bld", cw_bid: "chart", cw_van: "door" },
  bg: "apt", sjBg: "apt", fullBg: "apt",
  tile: (S) => (coOn(S) ? `차량 관리 회사 · 계약 ${S.carwash.corps.length}건` : `거점 ${S.carwash.bases.length}곳 · 정기 ${custAll(S.carwash)}명`),
  side: (S) => (coOn(S) ? `차량 관리 회사 · 직원 ${S.carwash.staff}명` : `출장 세차 · 거점 ${S.carwash.bases.length}곳`),
  quick: (S) => { const C = S.carwash; return C.staff && C.care < careNeed(C) ? "cw_care" : owedAll(C) > 0 && C.runs < runCap(S) && C.cars < carCap(S) ? "cw_wash" : C.leads.some((L) => L.talkT !== S.t) && C.bases.length < baseMax(S) ? "cw_talk" : C.bases.some((b) => b.cust < b.cap) ? "cw_promo" : "cw_scout"; },
  cine: { cw_first: ["apt", "출장 세차"], cw_three: ["apt", "출장 세차"], cw_company: ["apt", "출장 세차"], cw_end_co: ["apt", "출장 세차 엔딩"], cw_end_solo: ["apt", "출장 세차 엔딩"], cw_end_lost: ["apt", "출장 세차 엔딩"] },
  auto(c) { demo(c.S); }, // #auto18-carwash-cwon 시험
  page(c) {
    css();
    if (typeof location !== "undefined" && /^#auto\d+.*carwash/.test(location.hash || "") && c.S.carwash && !c.S.carwash.demoOff) { demo(c.S); c.S.carwash.demoOff = 1; } // 시험 주소: 자동 진행(18달) 동안 세차를 안 돌아 고객이 빠지므로, 보드를 처음 그릴 때 시험용 거점을 다시 깐다
    const { S, won, esc, actRow, meter, boardHead } = c, C = S.carwash, L = C.last, B = CW_BAL, co = isCo(S), P = S.pi || 1;
    const wx = wxOf(S), dry = dryWeeks(S), cap = carCap(S), rc = runCap(S), gs = gateStep(C), owed = owedAll(C), back = backAll(C), help = bldHelp(S);
    const flag = (b) => `<div class="cw-flag ${b.hold ? "hold" : b.owed > 0 ? "due" : ""}" style="left:${b.x}%;top:${b.y + 16}%"><b>🚩</b><i>${b.cust}명</i></div>`;
    const lflag = (l) => `<div class="cw-flag lead" style="left:${l.x}%;top:${l.y + 16}%"><b>🏢</b><i>?</i></div>`;
    const map = `<div class="cw-map"><span class="cw-road"></span><span class="cw-road v"></span><span class="cw-road v2"></span><span class="cw-ring"></span><span class="cw-ringn">내 동선(집 ↔ 회사)</span>${C.leads.map(lflag).join("")}${C.bases.map(flag).join("")}${C.bases.length || C.leads.length ? "" : `<div class="tiny muted" style="position:absolute;left:0;right:0;top:44%;text-align:center">아직 거점이 없어요</div>`}</div>
      <div class="tiny muted" style="margin-top:4px">🚩 내 거점(정기 고객 수) · 🏢 봐 둔 건물 · 점선 안은 한 번에 ${B.perRun}대, 밖은 ${B.perRunOut}대</div>`;
    const wxRow = `<div class="cw-wx">${wx.map((w, i) => `<div class="${w}"><b>${WX_IC[w]}</b>${i + 1}주 ${WX_N[w]}</div>`).join("")}</div>
      <div class="tiny muted" style="margin-top:4px">${season(S) ? `<b class="gold">${season(S)}</b> · ` : ""}맑은 주 <b>${dry}</b>주 · 이번 달 돌기 <b class="${C.runs >= rc ? "bad" : ""}">${C.runs}/${rc}</b>번 · 비·결빙 주에는 못 해요. 못 돈 회차는 밀려요.</div>`;
    const base = (b) => { const full = b.cust * B.per2, tot = b.owed + b.done; return `<div class="cw-b ${b.hold ? "hold" : b.owed > 0 ? "due" : b.cust ? "ok" : ""}"><div class="cw-nm">${esc(b.n)}</div>
      <div>${b.tier ? `<span class="cw-tg y">${X.TIERS[b.tier].short || X.TIERS[b.tier].n} · 한 번에 ${X.perRunX(b)}대</span><span class="cw-tg ${b.zone ? "r" : "g"}">${b.zone ? "동선 밖" : "동선 안"}</span>${b.cust ? `<span class="cw-tg">한 대 평균 ${man1(X.basePx(C, b) * P)}</span>` : ""}${X.vipsAt(C, b, "wait").length ? `<span class="cw-tg r">처방 대기 ${X.vipsAt(C, b, "wait").length}대</span>` : ""}` : `<span class="cw-tg ${b.zone ? "r" : "g"}">${b.zone ? `동선 밖 · 한 번에 ${B.perRunOut}대` : `동선 안 · 한 번에 ${B.perRun}대`}</span>`}<span class="cw-tg ${b.drain ? "g" : "y"}">${b.drain ? "배수 가능" : "물 회수"}</span>${b.night > 0 ? '<span class="cw-tg y">밤 작업</span>' : ""}${b.hold ? `<span class="cw-tg r">작업 정지 ${b.hold}달</span>` : ""}${b.back > 0 ? `<span class="cw-tg r">밀린 회차 ${b.back}</span>` : ""}</div>
      <div class="row" style="margin-top:5px"><span class="tiny muted">정기 ${b.cust}/${b.cap}명</span><div class="grow">${meter(b.cust, b.cap, "var(--gold)")}</div></div>
      <div class="row" style="margin-top:3px"><span class="tiny muted">이번 달 ${b.done}/${tot}회차</span><div class="grow">${meter(b.done, Math.max(1, tot), b.owed > 0 ? "var(--red)" : "var(--green)")}</div></div>
      ${b.tier && b.cust ? `<div class="tiny muted" style="margin-top:3px">${X.vipsAt(C, b, "auto").slice(0, 4).map((v) => esc(X.carName(v.m, v.g)) + `<b class="${v.gr === "S" ? "gold" : ""}"> ${v.gr}</b>`).join(" · ")}${b.cust > 4 ? ` 외 ${b.cust - 4}대` : ""}</div>` : ""}
      <div class="cw-btns">${!b.hold && X.washable(S, b) > 0 ? `<button class="btn sm gold" data-act="cw_wash" data-arg="${b.id}">세차 돌기 ⚡1 · ${Math.min(X.perRunX(b), X.washable(S, b))}대</button>` : !b.hold && b.owed > 0 ? `<span class="tiny bad" style="align-self:center">가방에 이 거점 차의 처방 용품이 없어요</span>` : ""}${!b.hold && X.roomOf(C, b) > 0 ? `<button class="btn sm" data-act="cw_promo" data-arg="${b.id}">${b.tier ? "차 모으기" : "정기 고객 모으기"} ⚡1</button>` : ""}${full === 0 && !b.hold ? `<span class="tiny muted" style="align-self:center">${b.tier ? "여기 차는 처방을 맞춰야 정기 고객이 돼요" : "세 대가 모여야 한 번 돈 값이 나와요"}</span>` : ""}</div></div>`; };
    const V1 = (v) => { const T = carTags(C, v), U = X.CUSTS[v.c], bb = C.bases.find((y) => y.id === v.b), left = B.rx.wait - (S.t - (v.wT ?? v.since)); return `<div class="cw-rx ${v.k ? "corp" : ""}"><div class="cw-nm">${esc(X.vipName(v))} <span class="muted">×</span> ${esc(U.n)}</div>
      <div class="tiny muted">${v.x ? `임원 지정석 · ${esc(C.corps.find((k) => k.id === v.k)?.n || "")} · 같은 주차장의 좋은 자리예요. 기사님이 열쇠를 건네요. 맞추면 이 자리 값을 받아요` : v.k ? `법인 차량 · ${esc(C.corps.find((k) => k.id === v.k)?.n || "")} · 노트가 없어 직원 효율 ${Math.round(B.rx.corpNo * 100)}%` : `${esc(bb?.n || "")} · ${left > 0 ? `${left}달 안에 안 맡으면 떠나요` : "이번 달이 마지막이에요"}${v.tries ? ` · ${v.tries}번 틀림` : ""}`}</div>
      <div style="margin-top:3px">${v.k ? "" : `<span class="cw-tg g">${X.svcOf(v).n}</span>`}${T.html || '<span class="cw-tg">숙제 없음</span>'}</div>
      <div class="cw-btns"><button class="btn sm gold" data-cwrx="${v.id}">처방 짜기</button>${T.V.nHid ? `<button class="btn sm" data-act="cw_study" data-arg="${v.id}">조사하기 ⚡1</button>` : ""}</div></div>`; };
    const lead = (l) => `<div class="cw-b"><div class="cw-nm">${esc(l.n)}</div>
      <div>${l.tier ? `<span class="cw-tg y">${X.TIERS[l.tier].short || X.TIERS[l.tier].n}</span>` : ""}<span class="cw-tg ${l.zone ? "r" : "g"}">${l.zone ? "동선 밖" : "동선 안"}</span><span class="cw-tg">${l.tier ? `자리 ${l.cap}대` : `주차 ${l.cap}대 규모`}</span><span class="cw-tg ${l.drain ? "g" : "y"}">${l.drain ? "배수 가능" : "물 회수"}</span><span class="cw-tg">찾아간 횟수 ${l.tries}/${B.lead.tries}</span></div>
      <div class="cw-btns">${l.talkT === S.t ? `<span class="tiny muted">이번 달은 다녀왔어요. 다음 달에 다시 가요.</span>` : `<button class="btn sm gold" data-act="cw_talk" data-arg="${l.id}">관리사무소 설득 ⚡1 · ${Math.round(talkP(S, l) * 100)}%</button>`}</div></div>`;
    const gates = gateOpen(C) ? `<div class="card" style="margin-top:10px"><h3>본업화 관문 <small>${gs < 0 ? "모두 통과" : `${gateDone(C)}/4 통과`}</small></h3><div class="tiny muted">혼자 닦는 대수에는 한계가 있어요. 관문 넷을 풀면 차량 관리 회사가 돼요(법인 계약·직원·작업 차량). 푸는 동안에는 내 세차 건수가 줄어요.</div>
      <div class="cw-g">${GATES.map(([k, n], i) => `<div class="${C.g[k] ? "on" : i === gs ? "cur" : ""}">${C.g[k] ? "✓ " : ""}${n}</div>`).join("")}</div>
      ${gs >= 0 ? `<div class="tiny" style="margin-top:6px"><b>${GATES[gs][1]}</b> · ${esc(GATES[gs][2])}${GATES[gs][0] === "site" && C.siteT != null ? " · 신고 결과를 기다리는 중" : GATES[gs][0] === "bid" ? ` · 지금 ${Math.round(bidP(S) * 100)}%` : ""}</div><div class="acts" style="padding:0;margin-top:6px">${actRow("cw_gate", undefined, `${GATES[gs][1]} 관문 풀기`)}</div>` : ""}</div>`
      : `<div class="card" style="margin-top:10px;padding:8px 12px"><div class="tiny muted">거점 ${B.lv[2][0]}곳·정기 ${B.lv[2][1]}명·누적 ${B.gate.washes.toLocaleString()}대가 되면 <b>본업화 관문</b>이 열려요(지금 ${C.bases.length}곳·${custAll(C)}명·${C.washes.toLocaleString()}대). 법인 입찰은 실적이 있어야 해요.</div></div>`;
    const crew = !co && (C.lv >= 2 || C.staff) ? `<div class="card" style="margin-top:10px"><h3>같이 도는 사람 <small>주말 알바 ${C.staff}/${staffCap(S)}명</small></h3>
      <div class="tiny muted">내가 못 돈 회차를 대신 돌아요(한 명에 한 달 ${B.crew.per}대까지, 한 대에 ${man1(B.crew.pay * P)}). 한 명마다 거점을 한 곳 더 맡을 수 있어요. 두 명에 한 번은 챙겨야 해요.</div>
      ${C.staff ? `<div class="kv" style="margin-top:6px"><div><div class="k">사람 챙기기</div><div class="v ${C.care >= careNeed(C) ? "good" : "bad"}">${C.care}/${careNeed(C)}</div></div><div><div class="k">지난달 대신 돈 대수</div><div class="v">${L?.staffCars ?? 0}대</div></div></div>` : ""}
      <div class="acts" style="padding:0;margin-top:6px">${C.staff ? actRow("cw_care") : ""}${actRow("cw_hire", undefined, "주말 알바 구하기")}${C.staff ? actRow("cw_hire", "out", "한 명 내보내기") : ""}</div></div>` : "";
    const corp = co ? `<div class="card" style="margin-top:10px"><h3>차량 관리 회사 <small>차량 ${C.vans}대 · 직원 ${C.staff}/${staffCap(S)}명</small></h3>
      <div class="kv"><div><div class="k">법인 계약</div><div class="v">${C.corps.length}/${corpMax(S)}건</div></div><div><div class="k">지난달 법인</div><div class="v ${L && L.corpDone < L.corpDem * 0.9 ? "bad" : ""}">${L?.corpDone ?? 0}/${L?.corpDem ?? 0}대</div></div><div><div class="k">사람 챙기기</div><div class="v ${C.care >= careNeed(C) ? "good" : "bad"}">${C.care}/${careNeed(C)}</div></div></div>
      ${C.corps.map((k) => `<div class="tiny" style="margin-top:4px">· ${esc(k.n)} <span class="muted">월 ${k.cars}대 · 재입찰까지 ${Math.max(0, (k.end ?? S.t) - S.t)}달</span></div>`).join("")}
      <div class="tiny muted" style="margin-top:6px">직원 한 명이 한 달 ${B.co.per}대쯤 맡아요(월급 ${won(Math.round(B.co.wage * P))}). 법인 일은 실내 작업이 섞여 날씨를 덜 타요. 약속한 대수를 못 채우면 계약이 끊겨요. 계약은 2년마다 다시 입찰해요.</div>
      <div class="acts" style="padding:0;margin-top:6px">${actRow("cw_care")}${actRow("cw_bid", undefined, `법인 계약 입찰 · ${Math.round(bidP(S) * 100)}%`)}${actRow("cw_hire", undefined, "직원 채용")}${actRow("cw_van")}${C.staff ? actRow("cw_hire", "out", "직원 한 명 내보내기(마지막 월급)") : ""}</div></div>` : "";
    const UI = UNDC.info(S, "carwash"), UD = { v: UI ? UI.v : X.understanding(S).v, stage: X.understanding(S).stage }; // 점수 · 등급 · 상위 % 는 공통 것(UI), 단계만 세차 것
    const undTop = undCardC(S, "carwash", { foot: X.STAGE_N[UD.stage], how: undHow(), extra: undExtra(S, UD) });
    const ak = ageK(S), W = X.waits(C), wn = X.wxNeed(S), top = X.tierTop(S), bagL = X.kit(S), nN = X.noteN(C), nextT = X.TIERS[top + 1];
    const rxSec = W.length ? `<div class="sec">처방 대기 <span class="bad small">· ${W.length}대</span> <span class="muted small">· 처음 보는 차·새 고객만 짜요</span></div><div class="cw-list">${W.map(V1).join("")}</div>` : "";
    const bagCard = `<div class="card" style="margin-top:10px"><h3>용품 가방 <small>${X.bagFree(S) ? "작업 차량에 전부 실림" : `무게 ${X.bagWt(C)}/${B.rx.wt}`} · 노트 ${nN}장</small></h3>
      ${X.bagFree(S) ? "" : `<div class="row"><span class="tiny muted">가방</span><div class="grow">${meter(X.bagWt(C), B.rx.wt, X.bagWt(C) > B.rx.wt * 0.9 ? "var(--red)" : "var(--gold)")}</div></div>`}
      <div style="margin-top:4px">${X.SLOTS.filter((sl) => !sl.of).map((sl) => { const L = bagL.filter((x) => x.slot === sl.id); return L.length ? `<span class="cw-tg ${sl.need ? "g" : ""}" style="white-space:normal">${sl.n.replace(" ①", "")} · ${L.map((x) => esc(x.n)).join(", ")}</span>` : sl.need ? `<span class="cw-tg r">${sl.n} 없음</span>` : ""; }).join("")}</div>
      ${wn.length ? `<div class="tiny" style="margin-top:5px">이번 달 날씨: <b class="gold">${wn.map((w) => X.WX_NEED[w].n).join(" · ")}</b> · ${wn.map((w) => (X.hasTag(S, X.WX_NEED[w].tag) ? `<span class="good">${X.tagN(X.WX_NEED[w].tag)} 챙김(값 +)</span>` : `<span class="bad">${X.tagN(X.WX_NEED[w].tag)} 용품 없음${C.bases.some((b) => b.tier) ? "(고급 거점 값 −)" : ""}</span>`)).join(" · ")}</div>` : ""}
      <div class="tiny muted" style="margin-top:5px">세차는 아이템빨이에요. 가방에 든 것으로만 처방을 짜요. ${X.bagFree(S) ? "" : "한 번 메고 나가면 그달은 못 바꿔요. "}${nextT ? `${nextT.n}: 업의 이해도 ${nextT.need.und}점·손재주 ${nextT.need.hands}·누적 ${nextT.need.washes}대부터(지금 ${UD.v}점·${Math.round(S.st.hands || 0)}·${C.washes}대)` : "모든 등급의 거점이 열렸어요"}${X.keeperOn(C) ? ' · <b class="gold">전속 관리인</b>' : ""}</div>
      <div class="cw-btns"><button class="btn sm gold" data-cwwin="bag">가방 싸기</button><button class="btn sm" data-cwwin="shop">용품 가게</button><button class="btn sm" data-cwwin="dex">차 도감</button><button class="btn sm" data-cwwin="note">처방 노트</button></div></div>`;
    const priceCard = `<div class="card" style="margin-top:10px"><h3>단가표 <small>차 기준가 × 서비스 상품 × 내 값</small></h3>
      ${X.priceSvcs(S).map((t) => { const V = X.priceView(S, t); return `<div class="cw-b" style="margin-top:6px"><div class="cw-prow"><div class="cw-nm">${esc(X.SVC[t].n)} <b class="gold">${man1(V.won * P)}</b></div><button class="btn sm" data-cwprice="${t}">${V.auto ? "오토" : "직접"} · 바꾸기</button></div>
        <div><span class="cw-tg">시세 ${man1(V.mkWon * P)}</span><span class="cw-tg ${V.ratio > 110 ? "y" : ""}">시세의 ${V.ratio}%</span><span class="cw-tg ${V.ask === "많음" ? "g" : V.ask === "보통" ? "" : V.ask === "드묾" ? "y" : "r"}">문의 ${V.ask}</span></div>
        <div class="tiny muted" style="margin-top:3px">${V.auto ? `오토가 잡은 값 ${man1(V.won * P)}(시세의 ${V.ratio}%) · 보수적으로 잡아요` : `오토라면 ${man1(V.autoWon * P)}`}${V.why.length ? ` · ${esc(V.why[0])}` : ""}</div></div>`; }).join("")}
      <div class="tiny muted" style="margin-top:5px">값은 거점이 아니라 차와 상품에 따라 받아요. 위는 ${X.priceSvcs(S).length > 1 ? "기본은 일반차, 나머지는 국산 준대형 세단 기준이에요" : "일반차 기준이에요"}. 큰 차·손이 가는 차는 기준가가 높아요(도감). 고급 거점일수록 높은 상품을 찾아요. 법인 계약은 입찰가로 따로 정해져요.</div></div>`;
    return `${boardHead("carwash")}${undTop}<div class="card"><h3>${co ? "차량 관리 회사" : "출장 세차"} <small>${lvName(C)}</small></h3>
      <div class="kv"><div><div class="k">지난달 순이익</div><div class="v ${(L?.profit ?? 0) >= 0 ? "good" : "bad"}">${won(L?.profit ?? 0)}</div></div><div><div class="k">거점</div><div class="v">${C.bases.length}/${baseMax(S)}</div></div><div><div class="k">정기 고객</div><div class="v">${custAll(C)}명</div></div><div><div class="k">이번 달 내 대수</div><div class="v ${C.cars >= cap ? "bad" : ""}">${C.cars}/${cap}</div></div></div>
      <div class="tiny muted" style="margin-top:6px">차보다 <b class="gold">장소</b>가 먼저예요. 같은 건물에 세 대가 모이면 행동력 1에 세 대를 닦아요. 한 달 대수 상한은 체력에 걸려요${ak < 1 ? `(나이로 ${Math.round((1 - ak) * 100)}% 줄었어요)` : ""}${gating(S) ? " · 관문을 푸는 동안 줄어 있어요" : ""}.</div>
      ${map}${wxRow}</div>
    ${rxSec}
    <div class="sec">내 거점 <span class="${owed ? "bad" : "muted"} small">· 남은 회차 ${owed}건${back ? ` · 밀린 ${back}건` : ""}</span></div>
    <div class="cw-list">${C.bases.length ? C.bases.slice().sort((a, b) => (b.hold ? -1 : b.owed) - (a.hold ? -1 : a.owed)).map(base).join("") : `<div class="tiny muted">아직 승인받은 건물이 없어요. 봐 둔 건물의 관리사무소부터 가 봐요.</div>`}</div>
    <div class="sec">봐 둔 건물 <span class="muted small">· ${C.leads.length}/${B.lead.max}곳${help ? " · 관리 쪽에 아는 사람이 있어 승인이 쉬워요" : ""}</span></div>
    <div class="cw-list">${C.leads.map(lead).join("") || `<div class="tiny muted">거점 찾기로 건물을 돌아봐요.</div>`}</div>
    <div class="acts" style="padding:0;margin-top:6px">${actRow("cw_scout")}${top ? actRow("cw_scout", "hi", `고급 거점 찾기(${X.TIERS[top].short || X.TIERS[top].n}까지)`) : ""}</div>
    ${priceCard}
    ${bagCard}
    <div class="card" style="margin-top:10px"><h3>장비와 계약</h3>
      <div class="row"><span class="tiny muted">약품·타월 상태 ${Math.round(C.gear)}</span><div class="grow">${meter(C.gear, 100, C.gear < B.gear.low ? "var(--red)" : "var(--green)")}</div></div>
      <div style="margin-top:4px"><span class="cw-tg ${C.photo ? "g" : ""}">작업 전 사진 ${C.photo ? "찍는 중" : "안 찍음"}</span><span class="cw-tg ${C.ins ? "g" : ""}">배상 보험 ${C.ins === 2 ? "한도 올림" : C.ins ? `가입 · 월 ${won(Math.round(B.ins[1] * P))}` : "없음"}</span><span class="cw-tg ${C.waste ? "g" : needWaste(C) ? "r" : ""}">처리업체 ${C.waste ? `계약 · 월 ${won(Math.round(B.waste * P))}` : needWaste(C) ? "없음(물 회수 거점 있음)" : "없음"}</span>${C.dump && !C.waste ? '<span class="cw-tg r">집에서 버리는 중</span>' : ""}</div>
      <div class="acts" style="padding:0;margin-top:6px">${actRow("cw_gear")}${actRow("cw_photo", undefined, C.photo ? "작업 전 사진 그만 찍기" : "작업 전 사진 찍기")}${C.ins === 2 ? "" : actRow("cw_deal", "ins", C.ins ? "배상 보험 해지" : "배상 보험 들기")}${C.g.site && C.waste ? "" : actRow("cw_deal", "waste", C.waste ? "처리업체 계약 해지" : "처리업체 계약")}</div></div>
    ${crew}${gates}${corp}`;
  },
  bind(c) {
    c.q("[data-cwrx]", (el) => rxWin(c, el.dataset.cwrx));
    c.q("[data-cwwin]", (el) => kitWin(c, el.dataset.cwwin));
    c.q("[data-cwprice]", (el) => priceWin(c, +el.dataset.cwprice));
    if (typeof location !== "undefined") { const m = /-cw(rx|bag|shop|dex|note|price)\b/.exec(location.hash || ""); if (m && !c.S.carwash._shown) { c.S.carwash._shown = 1; if (m[1] === "rx") { const v = X.waits(c.S.carwash).find((x) => x.c === "matteowner") || X.waits(c.S.carwash)[0]; if (v) rxWin(c, v.id); } else if (m[1] === "price") priceWin(c, 0); else kitWin(c, m[1]); } } // 시험 주소: …-cwrx · -cwbag · -cwshop · -cwdex · -cwnote · -cwprice 로 창을 바로 연다
  },
};

// ── 업의 이해도 공통 카드에 넣는 세차 글(11-28) ── 숫자는 자료(UND)에서 읽는다. 눈금(scale)이 바뀌면 글도 같이 바뀐다
function undHow() {
  const U = X.UND, k = U.scale || 1, r1 = (v) => Math.round(v * k * 10) / 10;
  return `맞춘 처방이 처방 노트로 남을 때 쌓여요. 노트 한 장은 기본 +${r1(10)}에 숙제 하나마다 +${r1(6)}, 금기 · 세부 숙제 하나마다 +${r1(4)}, 차 기준가가 높을수록 조금 더(+${r1(7)}~${r1(11)}), 프리미엄이면 +${r1(6)}, 기본 세차면 −${r1(4)}. S 처방이면 +${r1(8)}에 고객 요구 하나마다 +${r1(3)}. 노트가 쌓일수록 새 한 장의 몫은 줄어요(${U.slow}장째는 절반). 일한 달마다 +${r1(U.month)}(${U.monthMax}달까지). 신형이 나오면 구형 노트의 몫은 ${Math.round(U.stale * 100)}%로 줄어요. 세차에서는 ${U.stage[0]}점부터 중반, ${U.stage[1]}점부터 후반이에요.`;
}
function undExtra(S, UD) {
  const C = S.carwash, U = X.UND, N = Object.values(C.notes || {}), sN = N.filter((x) => x.gr === "S").length;
  const nx = UD.stage === 1 ? ` · 중반까지 ${(U.stage[0] - UD.v).toLocaleString()}점` : UD.stage === 2 ? ` · 후반까지 ${(U.stage[1] - UD.v).toLocaleString()}점` : "";
  return `<div class="tiny muted" style="margin-top:6px">내 처방 노트 ${N.length}장${sN ? `(S ${sN}장)` : ""}${nx}</div>`;
}
