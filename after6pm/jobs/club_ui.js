// 취미 모임 보드(달력형): 이번 달 모임 달력 → 회원 띠(8명·20명 눈금) → 회비·대관료·남는 돈. 규약: engine/jobs/README.md
import * as CL from "../engine/jobs/club.js";

const DOW = ["월", "화", "수", "목", "금", "토", "일"];
const UTAG = '<span class="tag gold" style="font-size:10.5px">업의 이해도 덕분</span>'; // 11-28 이해도 효과가 적용된 자리에 다는 꼬리표
export default {
  key: "club", ic: "users", bg: "cafe", sjBg: "cafe", fullBg: "cafe",
  icons: { cl_open: "users", cl_host: "msg", cl_promo: "cam", cl_after: "glass", cl_fee: "coin", cl_sub: "brief", cl_partner: "door", cl_close: "door" },
  tile: (S) => (S.club.kind ? `${CL.KINDS[S.club.kind].n} · ${S.club.members}명` : "모임 만들기 전"),
  side: (S) => `취미 모임 ${S.club.members}명`,
  quick: (S) => (!S.club.kind ? "cl_open" : S.club.run < CL.CL_BAL.weeks - (S.club.sub ? 2 : 0) ? "cl_host" : "cl_promo"),
  cine: { cl_first: ["cafe", "취미 모임"], cl_full: ["cafe", "취미 모임"], cl_end_wait: ["cafe", "취미 모임 엔딩"], cl_end_empty: ["home", "취미 모임 엔딩"] },
  auto(c) { const S = c.S; S.hb.cnt.wine = Math.max(S.hb.cnt.wine || 0, 9); S.hb.cnt.book = Math.max(S.hb.cnt.book || 0, 7); Object.assign(S.club, { kind: "wine", members: 14, sat: 72, run: 2, months: 9, peak: 14, last: { members: 14, joined: 3, left: 1, rev: 112, cost: 75, profit: 37, hosted: 4, rent: 48, sat: 72, cap: 16 } }); },
  page(c) {
    const { S, esc, won, boardHead, actRow } = c, C = S.club, B = CL.CL_BAL;
    if (!C.kind) {
      const ks = CL.myKinds(S);
      const pick = ks.length ? ks.map((k) => { const K = CL.KINDS[k]; return `<button class="btn" style="display:block;width:100%;text-align:left;margin-top:6px" data-act="cl_open" data-arg="${k}"><b>${esc(K.n)}</b> <span class="tiny gold">⚡1</span><div class="tiny muted">월 회비 ${K.fee}만 · 정원 ${K.cap}명 · ${esc(K.d)} · 다닌 횟수 ${S.hb.cnt[k] || 0}번</div></button>`; }).join("") : `<div class="small muted">모이는 취미(와인·독서·보드게임·러닝·밴드·사진·여행·축구 관람)를 ${B.need}번 넘게 다니면 열 수 있어요.</div>`;
      return `${boardHead("club")}<div class="card"><h3>취미 모임 <small>모임 만들기 전</small></h3><div class="small">다녀 본 취미 중에서 종목을 골라요. 같이 다니던 사람들이 첫 회원이 돼요.</div>${pick}</div>${SJ_PARTNER(c)}`;
    }
    const K = CL.KINDS[C.kind], L = C.last, cap = CL.capOf(S), fee = CL.feeOf(S), v = CL.venueOf(S), need = B.weeks - (C.sub ? 2 : 0);
    // 달력: 4주. 모임 요일(목)에 진행한 주는 채우고, 남은 주는 빈 칸
    const day = 3, weeks = [0, 1, 2, 3].map((w) => `<div class="a6cl-wk">${DOW.map((d, i) => { const meet = i === day, done = meet && (w < C.run || (C.sub && w >= 2)); return `<i class="${meet ? (done ? "on" : "meet") : ""}">${meet ? (done ? "✓" : w + 1) : ""}</i>`; }).join("")}</div>`).join("");
    const cal = `<div class="a6cl-cal"><div class="a6cl-wk hd">${DOW.map((d, i) => `<i class="${i === day ? "meet" : ""}">${d}</i>`).join("")}</div>${weeks}</div>`;
    // 회원 띠: 점 하나가 한 명. 8명·20명 눈금
    const shown = Math.max(cap, 24), dots = Array.from({ length: shown }, (_, i) => `<i class="${i < C.members ? (L && i >= C.members - L.joined ? "new" : "in") : i < cap ? "" : "x"}${i === B.thin - 1 || i === B.full - 1 ? " tick" : ""}"></i>`).join("");
    const stage = C.members < B.thin ? `썰렁해요 · ${B.thin}명이 되면 입소문이 나요` : C.members < B.full ? `정기 모임 · ${B.full}명이 되면 대기 명단이 생겨요` : C.wait > 0 ? `대기 ${C.wait}명 · 회비를 올릴 수 있어요` : "꽉 찬 모임";
    const satCol = C.sat < 45 ? "var(--red)" : C.sat < 65 ? "var(--gold)" : "var(--green)";
    // 11-28 업의 이해도 효과(숙련 300): 탈퇴 조짐 · 정원 확대. 스위치가 꺼져 있으면 U.on 이 false 라 예전 그대로
    const U = CL.undFx(S), O = U.open ? CL.outlook(S) : null;
    const omen = O ? `<div class="tiny" style="margin-top:6px;padding:6px 8px;border-radius:8px;background:var(--panel2)">${UTAG} <b class="${O.lv === 2 ? "bad" : O.lv === 1 ? "gold" : "good"}">탈퇴 조짐: 이대로면 다음 달 약 ${O.n}명</b><span class="muted"> · ${O.why.length ? esc(O.why.join(" · ")) : "평소 수준이에요"}</span></div>` : U.on ? `<div class="tiny muted" style="margin-top:6px;opacity:.7">잠김 · 업의 이해도 숙련(300점)부터 탈퇴 조짐이 미리 보이고 정원이 늘어요. 지금 ${Math.round(U.v).toLocaleString()}점</div>` : "";
    return `${boardHead("club")}
    <div class="card"><h3>${esc(K.n)} <small>${esc(CL.LV[C.lv].n)}</small></h3>
      <div class="row" style="gap:10px;align-items:flex-start">${cal}<div class="grow"><div class="tiny muted">이번 달 진행</div><div style="font-size:22px;font-weight:900">${C.run + (C.sub ? 2 : 0)}<span class="small muted">/${B.weeks}</span></div><div class="tiny muted" style="margin-top:6px">만족도</div><div style="font-size:18px;font-weight:900;color:${satCol}">${Math.round(C.sat)}</div>${C.sub ? '<div class="tiny blue" style="margin-top:4px">부운영진이 절반 진행</div>' : ""}</div></div>
      <div class="tiny muted" style="margin-top:8px">${C.run < need ? `이번 달 ${need - C.run}번 더 진행해야 해요. 빠지면 만족도가 내려가요.` : "이번 달 모임은 다 진행했어요."}</div>
    </div>
    <div class="card"><div class="row"><b>회원 ${C.members}명</b><span class="grow"></span><span class="tiny muted">정원 ${cap}명${v === "mine" ? " · 내 파티룸" : ""}${U.open ? ` ${UTAG}` : ""}</span></div>
      <div class="a6cl-mem">${dots}</div><div class="tiny muted">${stage}${L ? ` · 지난달 +${L.joined} −${L.left}` : ""}</div>${omen}</div>
    <div class="card"><div class="kv"><div><div class="k">월 회비</div><div class="v">${won(fee)}</div></div><div><div class="k">대관료</div><div class="v ${v === "rent" ? "bad" : "good"}">${v === "mine" ? "내 지점" : v === "none" ? "없음" : L ? won(L.rent) : won(Math.round(B.rentPer * B.weeks * c.SYN.pi(S)))}</div></div><div><div class="k">지난달 남은 돈</div><div class="v ${L && L.profit < 0 ? "bad" : "good"}">${L ? won(L.profit) : "-"}</div></div></div>
      <div class="row" style="margin-top:8px;gap:6px"><span class="small grow">회비 단계 <b>×${B.fees[C.fi ?? 1]}</b></span><button class="btn sm" data-act="cl_fee" data-arg="down">내리기</button><button class="btn sm" data-act="cl_fee" data-arg="up">올리기</button></div>
      <div class="tiny muted" style="margin-top:4px">${esc(K.d)}${v === "rent" ? ". 파티룸 지점이 있으면 대관료가 0이 돼요" : ""}</div></div>
    ${actRow("cl_host")}${actRow("cl_promo")}${actRow("cl_after")}${actRow("cl_sub", undefined, C.sub ? "부운영진 해제" : "부운영진 세우기")}${SJ_PARTNER(c)}
    <div class="row" style="margin-top:8px"><span class="grow"></span><button class="btn sm danger" data-act="cl_close">모임 접기</button></div>`;
  },
};
// 파티룸이 있으면: 모임방장 만나기(다른 모임 유치)
function SJ_PARTNER(c) {
  const { S, actRow } = c, n = (S.pr?.rooms || []).filter((x) => x.status === "open").length;
  if (!S.sj?.active?.includes("pr") || !n) return "";
  return `<div class="card"><div class="row"><b>내 파티룸에 유치한 모임</b><span class="grow"></span><b>${S.pr.partners || 0}/${n * CL.CL_BAL.partnerMax}</b></div><div class="tiny muted">유치한 모임 하나마다, 내 모임 회원 10명마다 '대기업 파티룸 체인' 감소가 4분의 1씩 풀려요(지금 ${Math.round(CL.prFill(S) * 100)}%)</div></div>${actRow("cl_partner")}`;
}
