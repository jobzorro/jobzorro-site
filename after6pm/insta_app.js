// 인별 앱(v4.27): 게임 화면 위에 따로 뜨는 폰 모양 SNS 창. 흰 바탕·자체 글꼴·탭 5개(피드·댓글함·DM·인사이트·협찬함).
// ui.js 가 ctx(jctx + faceSrc·meSrc·bodySrc)를 넘겨 openInsta(ctx, 탭) 으로 연다. 행동은 ctx.doAct 로(행동력·미니게임·장면 흐름 그대로).
import * as INS from "./engine/insta.js";

// 화보(ui.js CINE_BG·CINE_TAG 에 합친다). 그림 파일이 없으면 이 배경 + 사람 그림 겹치기
export const CINE_BG = { in_hot_roof: "rooftop", in_hot_river: "street", in_hot_popup: "popup", in_hot_gallery: "gallery", in_collab: "cafe", in_shoot: "gallery", in_era: "rooftop", in_brand: "popup", in_fanmeet: "cafe" };
export const CINE_TAG = Object.fromEntries(Object.keys(CINE_BG).map((k) => [k, "인별그램"]));
export const DUO = new Set(["in_collab", "in_shoot", "in_era", "in_hot_roof", "in_hot_river", "in_hot_popup", "in_hot_gallery"]); // 상대와 나를 같이 세운다

let X = null, el = null, tab = "feed", game = null, tick = null, poll = null, sig = "", sheet = null, edit = null;
const TABS = [["feed", "▦", "피드"], ["inbox", "💬", "댓글함"], ["dm", "✉", "DM"], ["ins", "📈", "인사이트"], ["deal", "🤝", "협찬함"]];
const HANDLE_T = { pastel: "soft", film: "film", black: "mono", bmov: "lol", lux: "luxe" }, HANDLE_P = { daily: "daily", fit: "fit", food: "eats", space: "room", career: "work", travel: "trip", pet: "paws", fashion: "look" };
const k1 = (n) => (n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + "만" : n >= 1000 ? (n / 1000).toFixed(1) + "천" : String(Math.round(n)));

function S() { return X.S; }
function I() { return INS.ens(X.S); }
function handle() { const i = I(), cc = i.cc; return cc ? `${HANDLE_T[cc.tone]}.${HANDLE_P[cc.topic]}_${(i.seed % 90) + 10}` : "새 계정"; }
function badges() { const i = I(), s = S(); return { inbox: i.inbox && i.inbox.t === s.t && !i.inbox.done ? i.inbox.total : 0, dm: (i.dm || []).filter((d) => !d.done).length, deal: (i.offers || []).length }; }

// ───────── 보드(ui.js pgInsta 가 부른다) ─────────
export function board(ctx) {
  X = ctx; const i = I(), s = S(), esc = ctx.esc, b = badges();
  const n = INS.upsThisMonth(s), need = INS.needOf(s), st = INS.stageOf(i);
  return `${ctx.boardHead("insta")}<div class="card igboard"><div class="row"><div class="grow"><h3 style="margin:0">인별그램 <small>${esc(D_LV(ctx, i.f))}</small></h3>
      <div class="tiny muted">${i.cc ? esc(INS.ccName(i.cc)) : "아직 컨셉이 없어요. 앱을 열어 컨셉부터 설계하세요"}</div></div>
      <button class="btn gold" data-igopen="feed">📱 앱 열기${b.inbox + b.dm + b.deal ? ` <b class="tjx-igb">${b.inbox + b.dm + b.deal}</b>` : ""}</button></div>
    <div class="kv" style="margin-top:8px"><div><div class="k">팔로워</div><div class="v gold">${i.f.toLocaleString()}</div></div><div><div class="k">일관성</div><div class="v">${Math.round(i.cons)}</div></div><div><div class="k">약속 · 연속</div><div class="v ${n >= need ? "good" : ""}">${n}/${need} · ${i.streak}달</div></div></div>
    ${INS.banned(s) ? `<div class="tiny" style="margin-top:6px;color:#e0245e;font-weight:700">⛔ 계정 정지 중(${i.ban.left}달 남음)${i.sub?.on ? ` · 부계정 ${i.sub.f.toLocaleString()}명` : ""}</div>` : ""}
    ${i.cc ? `<div class="tiny muted" style="margin-top:6px">컨셉 수명 '${st.n}' · 팬심 ${Math.round(i.fan)} · 논란 ${Math.round(i.ctrv)}${i.trend ? ` · 요즘 유행 ${esc(INS.TOPICS[i.trend.topic].n)} × ${esc(INS.FMTS[i.trend.fmt].n)}` : ""}</div>` : ""}
    ${b.inbox + b.dm + b.deal ? `<div class="igquick">${[["inbox", "💬 댓글함", b.inbox], ["dm", "✉ DM", b.dm], ["deal", "🤝 협찬함", b.deal]].filter((x) => x[2]).map(([k, t, c]) => `<button data-igopen="${k}">${t} <b>${c}</b></button>`).join("")}</div>` : ""}
    <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">인별이 크는 법 자세히 ▾</summary><div class="tiny muted">인별은 매력이 아니라 컨셉·꾸준함·댓글 관리로 커요. 약속한 만큼 못 올리면 연속 기록이 끊기고, 한 달을 통째로 쉬면 두 달간 노출이 반토막 나요.</div></details></div>${chBoard()}`;
}
// 챌린지(11-26) 플랫폼 칸: 지금 대세 · 내가 있는 곳 · 협찬 단가 · 버티는 중이면 노출과 [갈아타기] · '진짜 사람' 신뢰도. 3년 차 예고부터 보인다
function chInfo() {
  const i = I(), s = S(), P = i.pf, C = INS.IG_CH; if (!i.cc || !P || (s.t < C.mv.warnT && !P.era)) return null;
  return { P, C, hold: INS.holding(s), cut: Math.round((1 - INS.pfReach(s)) * 100), keep: Math.round(INS.moveKeep(s) * 100), pay: INS.payPct(s), on: INS.realOn(s), real: Math.round(i.real), era: INS.platOf(P.era).n, at: INS.platOf(P.at).n, hm: INS.holdM(s) };
}
const REAL_HOW = "오르는 것: 얼굴 공개·브이로그로 올리기, 현장 촬영, 팬 모임, 핫플·화보·콜라보 촬영, 팬 DM에 길게 답하기. 그런 것 없이 올리기만 한 달은 −1.5, 안 올린 달은 −3.";
function chBoard() {
  const c = chInfo(); if (!c) return ""; const esc = X.esc, s = S(), A = c.C.ai;
  const state = c.hold ? `<span style="color:#e0245e;font-weight:700">버틴 지 ${c.hm}달 · 노출 −${c.cut}%</span> · 지금 갈아타면 팔로워 약 ${c.keep}%가 따라와요(1년 늦을 때마다 −${INS.mvShow().late}%p)` : c.P.newM > 0 ? `막 이사 왔어요. 새 문법을 익히는 ${c.P.newM}달 동안 올리기 ⚡+${c.C.mv.newAp}` : c.P.era ? "대세 안에 있어요. 대세는 4년쯤마다 또 바뀌어요." : "아직은 여기가 대세예요. 다만 요즘 애들은 다른 곳을 본다는 말이 들려요.";
  return `<div class="card igboard" style="margin-top:8px"><div class="row"><div class="grow"><h3 style="margin:0">플랫폼</h3><div class="tiny muted">${state}</div></div>${c.hold ? `<button class="btn sm" data-igopen="move">갈아타기</button>` : ""}</div>
    <div class="kv" style="margin-top:8px"><div><div class="k">지금 대세</div><div class="v" style="font-size:13px">${esc(c.era)}</div></div><div><div class="k">내가 있는 곳</div><div class="v ${c.hold ? "bad" : "good"}" style="font-size:13px">${esc(c.at)}</div></div><div><div class="k">협찬 단가</div><div class="v ${c.pay < 100 ? "bad" : ""}">${c.pay}%</div></div></div>
    ${c.on ? `<div class="tiny" style="margin-top:8px">'진짜 사람' 신뢰도 <b>${c.real}</b> <span class="muted">· ${s.t >= A.t0 ? `AI 계정 탓에 단가가 해마다 ${INS.aiShow().perY}%씩(최대 ${INS.aiShow().max}%) 내려가요. 신뢰도가 높으면 절반만` : "곧 중요해져요"}</span></div><div class="meter" style="margin-top:4px"><i style="width:${c.real}%;background:${c.real >= 60 ? "#2e9e5b" : c.real >= 35 ? "#d9a520" : "#e0245e"}"></i></div>
    <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer">무엇으로 오르나 ▾</summary><div class="tiny muted">${REAL_HOW} 현장 촬영(⚡1, 한 달 1번)은 앱의 피드에 있어요.</div></details>` : ""}</div>`;
}
// 앱 피드의 플랫폼 카드: [갈아타기] · [현장 촬영]
function chFeed() {
  const c = chInfo(); if (!c) return ""; const esc = X.esc, s = S(), whyS = INS.canShoot(s);
  if (!c.hold && !c.on && !(c.P.newM > 0)) return "";
  return `<div class="igcard" style="margin:0 14px 8px${c.hold ? ";border-color:#f6c6d4;background:#fff7f8" : ""}"><b>${c.hold ? `대세는 ${esc(c.era)}` : `지금 대세: ${esc(c.era)}`}</b> <small>협찬 단가 ${c.pay}%</small>
    ${c.hold ? `<div class="igsub" style="margin:2px 0 0">${esc(c.at)}에서 버틴 지 ${c.hm}달 · 노출 −${c.cut}% · 지금 옮기면 약 ${c.keep}%가 따라와요</div>` : c.P.newM > 0 ? `<div class="igsub" style="margin:2px 0 0">새 문법을 익히는 중: ${c.P.newM}달 동안 올리기 ⚡+${c.C.mv.newAp}</div>` : ""}
    ${c.on ? `<div class="igmeter" style="margin:6px 0 0"><div class="row"><span>'진짜 사람' 신뢰도 <b>${c.real}</b></span><span>${s.t >= c.C.ai.t0 ? "높을수록 단가가 덜 깎여요" : "곧 중요해져요"}</span></div><div class="igmb"><i style="width:${c.real}%"></i></div></div>
    <details style="margin-top:4px"><summary style="font-size:11px;color:#8e8e8e;cursor:pointer">무엇으로 오르나 ▾</summary><div class="igsub" style="margin:4px 0 0">${REAL_HOW}</div></details>` : ""}
    <div class="igacts" style="padding:0;margin-top:6px">${c.hold ? `<button class="igbtn pri" data-igmove>갈아타기</button>` : ""}${c.on ? `<button class="igbtn" data-igfield ${whyS ? `data-why="${esc(whyS)}"` : ""}>현장 촬영 ⚡1</button>` : ""}</div></div>
    ${sheet === "move" && c.hold ? `<div class="igsheet"><div class="igsh">대세로 갈아탈까요? → ${esc(c.era)}</div><button data-igmovego><b>갈아탄다</b><span>팔로워 ${I().f.toLocaleString()} → 약 ${Math.round(I().f * c.keep / 100).toLocaleString()}(${c.keep}%) · 석 달은 올리기 ⚡+${c.C.mv.newAp} · 되돌릴 수 없어요</span></button><button data-igmove><b>조금 더 버틴다</b><span>지금 노출 −${c.cut}%(해마다 ${Math.round(c.C.mv.decayY * 100)}%씩) · 1년 늦을 때마다 따라오는 비율 −${INS.mvShow().late}%p(최저 ${INS.mvShow().min}%)</span></button></div>` : ""}`;
}
function D_LV(ctx, f) { const L = ctx.D.INSTA_LV; let k = 0; L.forEach((x, j) => { if (f >= x.f) k = j; }); return L[k].n + " 계정"; }

// ───────── 창 열고 닫기 ─────────
export function openInsta(ctx, t = "feed", opt = {}) {
  X = ctx; tab = TABS.some((x) => x[0] === t) ? t : t === "inboxplay" ? "inbox" : "feed"; sheet = t === "move" ? "move" : null; edit = !I().cc ? {} : null;
  if (!el) { el = document.createElement("div"); el.className = "igapp"; document.body.appendChild(el); }
  draw();
  if (t === "inboxplay") startGame();
  clearInterval(poll); poll = setInterval(() => { if (!el || !el.isConnected) return clearInterval(poll); if (game) return; const s2 = sigOf(); if (s2 !== sig) draw(); }, 600);
}
export function closeInsta() { stopGame(); clearInterval(poll); el?.remove(); el = null; try { X?.render(); } catch (e) {} }
function sigOf() { const s = S(), i = I(); return [s.t, s.ap, s.pending ? 1 : 0, i.f, i.upN, i.upT, (i.dm || []).filter((d) => !d.done).length, i.inbox?.done, (i.offers || []).length, i.cc && INS.ccKey(i.cc), i.plan, i.insT, Math.round(i.cons), i.ban?.left || 0, i.sub?.on ? 1 : 0, (i.hidAds || []).length, i.meetT, i.pf?.at, i.pf?.era, i.pf?.newM, Math.round(i.real ?? 0), i.fsT].join("|"); }

function draw() {
  if (!el) return; sig = sigOf();
  const b = badges(), esc = X.esc;
  el.innerHTML = `<div class="igph"><div class="igscr">
    <div class="igbar"><span class="ighd">${esc(handle())}</span><span class="igap">⚡${S().ap}</span><button class="igx" data-igx aria-label="닫기">✕</button></div>
    <div class="igbody">${body()}</div>
    <nav class="igtabs">${TABS.map(([k, ic, n]) => `<button class="${tab === k ? "on" : ""}" data-igtab="${k}"><span class="ii">${ic}</span><span class="il">${n}</span>${b[k] ? `<i>${b[k]}</i>` : ""}</button>`).join("")}</nav>
  </div></div>`;
  bind();
}
function body() { try { if (edit) return pgConcept(); return { feed: pgFeed, inbox: pgInbox, dm: pgDm, ins: pgIns, deal: pgDeal }[tab](); } catch (e) { console.warn(e); return `<div class="igpad">화면 오류: ${X.esc(String(e.message || e))}</div>`; } }

// ───────── 피드 ─────────
function pgFeed() {
  const i = I(), s = S(), esc = X.esc, st = INS.stageOf(i), n = INS.upsThisMonth(s), need = INS.needOf(s);
  const ap = X.E.apCost(s, "in_post"), why = X.E.canAct(s, "in_post", "on"), whyR = X.E.canAct(s, "in_reel");
  const cells = [...(i.feed || [])].slice(0, 9); while (cells.length < 9) cells.push(null);
  const pf = X.meSrc ? X.meSrc("smile") : "";
  return `<div class="igprof"><div class="igav"><div>${pf ? `<img src="${pf}" alt="">` : ""}</div></div>
      <div class="igst"><div><b>${i.posts + i.reels + i.dealsDone}</b>게시물</div><div><b>${k1(i.f)}</b>팔로워</div><div><b>${(i.eng * 100).toFixed(1)}%</b>참여율</div></div></div>
    <div class="ignm"><b>${esc(S().me.name)}</b> <span>퇴근 후 인별러 · ${esc(INS.TOPICS[i.cc.topic].n)}</span></div>
    <div class="igcb"><span>컨셉: ${esc(INS.ccName(i.cc))}</span><button data-igedit>바꾸기</button></div>
    <div class="igmeter"><div class="row"><span>컨셉 일관성 <b>${Math.round(i.cons)}</b></span><span>${esc(INS.PLANS[i.plan].n)} 약속 <b>${n}/${need}</b> · ${i.streak}달 연속${i.angry > 0 ? ' · <em class="igbad">노출 반토막</em>' : ""}</span></div><div class="igmb"><i style="width:${Math.round(i.cons)}%"></i></div></div>
    <div class="igchips"><span>수명 '${st.n}'</span>${i.trend ? `<span>유행 ${esc(INS.TOPICS[i.trend.topic].n)}×${esc(INS.FMTS[i.trend.fmt].n)}</span>` : ""}<span class="igfan">팬심 ${Math.round(i.fan)}</span><span class="igctv">논란 ${Math.round(i.ctrv)}</span></div>
    ${f30Feed()}
    ${chFeed()}
    <div class="igacts"><button class="igbtn pri" data-igpost ${why ? `data-why="${esc(why)}"` : ""}>＋ 올리기 ⚡${ap}</button><button class="igbtn" data-igreel ${whyR ? `data-why="${esc(whyR)}"` : ""}>실험 릴스 ⚡2</button><button class="igbtn" data-igplan>약속</button>${i.f >= INS.F30.sub.minF || i.sub?.f ? `<button class="igbtn" data-igsub>부계정</button>` : ""}</div>
    ${sheet === "sub" ? `<div class="igsheet"><div class="igsh">부계정 키우기 · 지금 ${(i.sub?.f || 0).toLocaleString()}명</div><button class="${i.sub?.on ? "on" : ""}" data-igsetsub="1"><b>키운다</b><span>매달 멘탈 ${INS.F30.sub.mental}·피로 조금. 본계정의 ${Math.round(INS.F30.sub.share * 100)}%까지 천천히 따라 커요. 본계정이 막히면 이사 갈 곳</span></button><button class="${i.sub?.on ? "" : "on"}" data-igsetsub="0"><b>안 키운다</b><span>품이 안 들어요. 대신 계정이 막히면 0부터</span></button></div>` : ""}
    ${sheet === "post" ? `<div class="igsheet"><div class="igsh">이번 게시물은?</div>${Object.entries(INS.POSTS).map(([k, p]) => `<button data-igkind="${k}"><b>${esc(p.n)}</b><span>${esc(p.d)}</span></button>`).join("")}</div>` : ""}
    ${sheet === "plan" ? `<div class="igsheet"><div class="igsh">업로드 약속(올리기 1번 = 한 주치 몰아 올리기)</div>${Object.entries(INS.PLANS).map(([k, p]) => `<button class="${+k === i.plan ? "on" : ""}" data-igsetplan="${k}"><b>${esc(p.n)} · 한 달 ${p.need}번</b><span>노출 ×${p.mult}${p.mental ? ` · 매달 멘탈 ${p.mental}` : ""}</span></button>`).join("")}</div>` : ""}
    <div class="iggrid">${cells.map((c) => c ? `<div style="background:${c.col}" class="${c.k}"><span>${c.ic}</span>${c.hit ? "<em>🔥</em>" : c.hid ? "<em>🤫</em>" : ""}${c.fmt === "reels" || c.fmt === "vlog" ? "<u>▶</u>" : ""}</div>` : `<div class="empty"></div>`).join("")}</div>
    <div class="igtip">${cells.some((c) => c && (c.k === "off" || (c.k === "ad")) ) ? "튀는 칸이 컨셉을 벗어난 글이에요. 9칸 색이 흩어질수록 일관성이 떨어져요." : "컨셉대로 올리면 9칸 색이 한 장처럼 이어져요."}</div>`;
}
// 특이 요소(f30): 정지 배너 · 팬 모임 열기(팬심 70+일 때만) · 숨긴 광고 경고
function f30Feed() {
  const i = I(), s = S(), esc = X.esc, out = [];
  if (INS.banned(s)) out.push(`<div class="igcard" style="border-color:#f6c6d4;background:#fff7f8;margin:0 14px 8px"><b style="color:#e0245e">⛔ 계정 정지 중 · ${i.ban.left}달 남음</b><div class="igsub" style="margin:2px 0 0">올리기·댓글·협찬이 멈췄어요. 팬심이 매달 식어요${i.sub?.on ? "(부계정에서 근황을 올려 덜 식어요)" : ""}.</div></div>`);
  const why = INS.canMeet(s);
  if (!why) out.push(`<div class="igcard" style="border-color:#d9ccf5;background:#faf7ff;margin:0 14px 8px"><b>🎉 팬 모임을 열 수 있어요</b><div class="igsub" style="margin:2px 0 6px">팬심 ${Math.round(i.fan)}. 꽉 차면 충성 팬이 생기고, 텅 비면 빈 의자 사진이 박제돼요.</div><button class="igbtn pri wide" style="margin-top:0" data-igmeet>팬 모임 계획하기</button></div>`);
  else if (i.fan >= INS.F30.meet.minFan - 10 && i.f >= INS.F30.meet.minF && !INS.banned(s)) out.push(`<div class="igtip" style="padding:0 14px 6px">🎉 팬 모임: ${esc(why)}</div>`);
  return out.join("");
}
// 컨셉 설계(처음·리브랜딩)
function pgConcept() {
  const i = I(), s = S(), esc = X.esc, cur = i.cc || {}, sel = { topic: "daily", tone: "film", fmt: "photo", face: "hand", ...cur, ...edit };
  const row = (ax, T, title, sub) => `<div class="igax"><div class="igaxh">${title}<span>${sub}</span></div><div class="igaxc">${Object.entries(T).map(([k, v]) => `<button class="${sel[ax] === k ? "on" : ""}" data-igax="${ax}:${k}">${v.ic ? v.ic + " " : ""}${esc(v.n)}${ax === "fmt" ? ` <small>⚡${v.ap}</small>` : ""}</button>`).join("")}</div></div>`;
  const hint = (i.hints || []).find((h) => INS.ccKey(h.cc) === INS.ccKey(sel));
  const same = i.cc && INS.ccKey(i.cc) === INS.ccKey(sel), first = !i.cc;
  const fit = (() => { const T = INS.TOPICS[sel.topic]; return (T.hobby && (s.hb?.joined || []).some((h) => T.hobby.includes(h))) || (T.job && s.sj?.active?.includes(T.job)); })();
  const cool = !first && s.t - i.rbT < 3;
  return `<div class="igpad"><div class="igtt">${first ? "컨셉 설계" : "리브랜딩"}</div>
    <div class="igsub">네 가지를 골라 '컨셉 카드'를 만들어요. 조합마다 숨은 수요와 경쟁이 있어요(인사이트를 볼수록 드러나요).</div>
    ${row("topic", INS.TOPICS, "주제", fit ? "★ 내 취미·투잡과 맞음: 품 −1" : "취미·투잡과 맞으면 소재가 쉽다")}
    ${row("tone", INS.TONES, "톤", "피드 9칸의 색")}
    ${row("fmt", INS.FMTS, "포맷", "품이 다르다")}
    ${row("face", INS.FACES, "얼굴", "얼굴 공개만 매력이 거들고 회사 눈치 +")}
    <div class="igcard"><b>${esc(INS.ccName(sel))}</b><div>${hint ? `인사이트 힌트: <b>${esc(hint.g)}</b>` : "숨은 수요: ??? (인사이트 탭에서 조금씩 보여요)"}</div>
      ${!first && !same ? `<div class="igbad">${sel.topic !== cur.topic ? "주제를 바꾸면 팔로워 25%가 떠나고 일관성 35에서 다시 시작해요." : "톤·포맷·얼굴을 바꾸면 팔로워 조금(축마다 4%)과 일관성이 깎이고, 컨셉 수명이 다시 '성장'으로 돌아가요."}</div>` : ""}
      ${cool ? `<div class="igbad">리브랜딩은 석 달에 한 번이에요(${3 - (s.t - i.rbT)}달 뒤).</div>` : ""}</div>
    <div class="igacts"><button class="igbtn pri" data-igconfirm ${same || cool ? "disabled" : ""}>${first ? "이 컨셉으로 시작" : "리브랜딩하기"}</button>${first ? "" : `<button class="igbtn" data-igcancel>취소</button>`}</div></div>`;
}

// ───────── 댓글함(30초 판) ─────────
function pgInbox() {
  const i = I(), s = S(), esc = X.esc, B = i.inbox;
  if (!B || B.t !== s.t) return `<div class="igpad"><div class="igtt">댓글함</div><div class="igsub">아직 쌓인 댓글이 없어요. 다음 달부터 매달 한 번 열려요.</div></div>`;
  if (B.done) {
    const R = B.res || [];
    return `<div class="igpad"><div class="igtt">댓글함 정리 끝 <small>잘 고른 것 ${R.filter((x) => x.good > 0).length}/${R.length}</small></div>
      ${B.list.map((c) => { const r = R.find((x) => x.id === c.id) || {}; return `<div class="igcm ${r.good > 0 ? "igok" : r.good < 0 ? "igng" : ""}"><b>${esc(c.nm)}</b> <small>${esc(INS.CM[c.k].n)}</small><p>${esc(c.tx)}</p><div class="igres">${r.good > 0 ? "✓" : r.good < 0 ? "✗" : "△"} ${esc(INS.REPLY[r.a] || "무시")}${r.note ? ` · ${esc(r.note)}` : ""}</div></div>`; }).join("")}
      <div class="iggauge"><span>팬심 ${B.sum.fan >= 0 ? "▲" : "▼"} ${Math.abs(B.sum.fan)} → ${Math.round(i.fan)}</span><span>논란 ${B.sum.ctrv > 0 ? "▲" : "▼"} ${Math.abs(B.sum.ctrv)} → ${Math.round(i.ctrv)}</span></div></div>`;
  }
  if (!game) {
    const why = X.E.canAct(s, "in_engage");
    return `<div class="igpad"><div class="igtt">댓글함 <small>오늘 ${B.total}개</small></div>
      <div class="igsub">그중 답이 필요한 댓글 ${B.list.length}개. 30초 안에 하나씩 골라요: 답글 톤(다정·유머·해명·단호), 고정, 숨김, 차단. 악플을 방치하면 논란이 커지고, 과하게 맞서면 박제돼요. 안 열면 댓글이 쌓여 참여율이 떨어져요.</div>
      <div class="iggauge"><span>팬심 ${Math.round(i.fan)}</span><span>논란 ${Math.round(i.ctrv)}</span>${i.pile ? `<span class="igbad">쌓인 달 ${i.pile}</span>` : ""}</div>
      <button class="igbtn pri wide" data-igstart ${why ? `data-why="${esc(why)}"` : ""}>30초 판 시작 ⚡1</button></div>`;
  }
  const left = Math.max(0, Math.ceil((game.end - Date.now()) / 1000));
  return `<div class="igpad igplay">${B.list.map((c) => `<div class="igcm ${c.k === "hate" || c.k === "cross" ? "warn" : ""}"><b>${esc(c.nm)}</b><p>${esc(c.tx)}</p><div class="igopt">${optsOf(c).map((a) => `<button class="${game.picks[c.id] === a ? "on" : ""}" data-igpick="${c.id}:${a}">${esc(INS.REPLY[a])}</button>`).join("")}</div></div>`).join("")}</div>
    <div class="iggauge sticky"><span>골랐다 ${Object.keys(game.picks).length}/${B.list.length}</span><span class="igtime">남은 시간 0:${String(left).padStart(2, "0")}</span><button data-igdone>다 했어요</button></div>`;
}
// 답 버튼 순서는 댓글마다 섞는다(늘 정답이 첫째가 아니게)
function optsOf(c) { const o = INS.CM[c.k].opts.slice(), sd = (I().seed + c.id * 7 + S().t * 13) >>> 0; return o.map((a, k) => [a, (sd * (k + 3) * 2654435761) % 1000]).sort((x, y) => x[1] - y[1]).map((x) => x[0]); }
function startGame() {
  const s = S(), why = X.E.canAct(s, "in_engage"); if (why) return X.toast([], why);
  game = { picks: {}, end: Date.now() + 30000 }; draw();
  clearInterval(tick); tick = setInterval(() => { if (!game) return clearInterval(tick); const t = el?.querySelector(".igtime"); const left = Math.max(0, Math.ceil((game.end - Date.now()) / 1000)); if (t) t.textContent = `남은 시간 0:${String(left).padStart(2, "0")}`; if (left <= 0) finishGame(); }, 250);
}
function stopGame() { clearInterval(tick); game = null; }
function finishGame() { if (!game) return; const picks = game.picks; stopGame(); X.doAct("in_engage", picks); setTimeout(draw, 30); }

// ───────── DM ─────────
function pgDm() {
  const i = I(), esc = X.esc, L = [...(i.dm || [])].sort((a, b) => (a.done - b.done) || ((b.k === "celeb") - (a.k === "celeb")) || b.id - a.id); // 안 읽은 것 → 유명인 → 최신
  if (!L.length) return `<div class="igpad"><div class="igtt">DM</div><div class="igsub">새 메시지가 없어요. 팔로워가 늘면 팬, 브랜드, 그리고 가끔 유명인에게서도 연락이 와요.</div></div>`;
  return `<div class="igpad"><div class="igtt">DM</div><div class="igsub">협찬 중엔 진짜와 사기가 섞여 있어요(선입금·수상한 링크 주의). 답하는 데 행동력은 들지 않아요.</div>${L.map((d) => {
    const face = d.k === "celeb" && d.who && X.faceSrc ? X.faceSrc(d.who, "smile") : "";
    const tag = { fan: "팬", deal: "협찬", scam: "협찬?", revise: "수정 요청", hidead: "광고 표시", celeb: "유명인" }[d.k];
    return `<div class="igdm ${d.done ? "done" : ""} ${d.k}"><div class="igdmh"><span class="igdav">${face ? `<img class="face" src="${face}" alt="">` : esc((d.from || "?").slice(0, 1))}</span><b>${esc(d.from)}</b><small>${tag}</small></div><p>${esc(d.tx)}</p>
      ${d.done ? `<div class="igres">답함: ${esc(d.ch[d.pick] || "")}</div>` : `<div class="igdmc">${d.ch.map((c, k) => `<button data-igdm="${d.id}:${k}">${esc(c)}</button>`).join("")}</div>`}</div>`; }).join("")}</div>`;
}

// ───────── 인사이트 ─────────
function pgIns() {
  const i = I(), s = S(), esc = X.esc, H = (i.rh || []).slice(-12), cc = i.cc, m = INS.market(s, cc), rv = i.reveal || 0;
  const fs = (i.hist || []).slice(-24), mx = Math.max(10, ...fs), W = 300, Hh = 80;
  const pts = fs.map((v, k) => `${Math.round(k / Math.max(1, fs.length - 1) * W)},${Math.round(Hh - v / mx * (Hh - 6) - 3)}`).join(" ");
  const bm = Math.max(1, ...H.map((h) => h.g || 0));
  const dots = (v, lo, hi) => { const n = Math.max(1, Math.min(5, Math.round((v - lo) / (hi - lo) * 4) + 1)); return "●".repeat(n) + "○".repeat(5 - n); };
  const last = H[H.length - 1], best = last?.best;
  return `<div class="igpad"><div class="igtt">인사이트</div>
    <div class="igsub">팔로워 ${i.f.toLocaleString()} · 최근 24달</div>
    ${fs.length > 1 ? `<svg class="igline" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#e1306c" stroke-width="2.5"/></svg>` : `<div class="igsub">한 달이 지나면 그래프가 그려져요.</div>`}
    ${H.length ? `<div class="igbars">${H.map((h) => `<div title="${h.t}"><i style="height:${Math.round((h.g || 0) / bm * 100)}%"></i><b style="height:${Math.round((h.sv || 0) / bm * 100)}%"></b></div>`).join("")}</div><div class="iglg"><span><i></i>도달(새 팔로워)</span><span><b></b>저장</span></div>` : ""}
    ${best ? `<div class="igcard">지난달 가장 잘 된 글: <b>${esc(INS.POSTS[best.kind]?.n || "광고")} · ${esc(INS.FMTS[best.fk]?.n || "")}</b> +${best.g.toLocaleString()}${best.kind !== "on" ? " · 컨셉 밖 글이 터졌다면 운일 수 있어요" : " · 컨셉대로가 통했어요"}</div>` : ""}
    <div class="igcard"><b>내 컨셉 시장</b> <small>정보 ${rv}/3</small>
      <div>수요 ${rv >= 1 ? `${dots(m.d, 0.45, 1.8)} ${m.d >= 1.1 ? "큼" : m.d <= 0.85 ? "작음" : "보통"}` : "?????"}</div>
      <div>경쟁 ${rv >= 2 ? `${dots(m.c, 0, 1)} ${m.c >= 0.7 ? "꽉 참" : m.c <= 0.35 ? "비어 있음" : "보통"}` : "?????"}</div>
      <div>판정 ${rv >= 3 ? `<b>${esc(INS.grade(m))}</b>` : "???"}</div>
      <div class="igsub">수요가 크면 천장이 높고, 경쟁이 적으면 빨리 커요.</div></div>
    ${(i.hints || []).length ? `<div class="igcard"><b>숨은 수요 힌트</b>${i.hints.map((h) => `<div>${esc(INS.TOPICS[h.cc.topic].n)}×${esc(INS.TONES[h.cc.tone].n)}×${esc(INS.FMTS[h.cc.fmt].n)} → <b>${esc(h.g)}</b></div>`).join("")}</div>` : ""}
    <button class="igbtn pri wide" data-iginsight ${i.insT === s.t ? "disabled" : ""}>${i.insT === s.t ? "이번 달 인사이트는 다 봤어요" : "인사이트 꼼꼼히 보기(한 달 1번)"}</button></div>`;
}

// ───────── 협찬함 ─────────
function pgDeal() {
  const i = I(), s = S(), esc = X.esc, O = i.offers || [], why = X.E.canAct(s, "in_gong");
  return `<div class="igpad"><div class="igtt">협찬함 <small>${O.length}건</small></div>
    <div class="igsub">컨셉과 맞는 브랜드는 단가가 높고 일관성을 거의 안 깎아요. 안 맞으면 돈은 되지만 '광고충' 소리와 함께 일관성 −12.</div>
    ${hidCard()}
    ${O.length ? O.map((o) => { const w = X.E.canAct(s, "in_deal", o.id); const base = o.hid ? { ...o, mul: o.mul / (o.hid === 1 ? INS.F30.ad.mul : INS.F30.ad.softMul) } : o;
      return `<div class="igdeal ${o.fit ? "fit" : "nofit"}"><div><b>${esc(o.nm)}</b><span class="igtag">${o.fit ? "컨셉과 맞음" : o.cat === "any_bad" ? "평판 위험" : "컨셉과 안 맞음"}</span>${o.hid ? `<span class="igtag" style="color:#e0245e">· ${o.hid === 1 ? "광고 표시 빼기로 함" : "'제품 제공'만 작게"}</span>` : ""}</div><div class="igsub">${o.cat === "any_bad" ? "아무 계정에나 오는 광고" : esc(INS.TOPICS[o.cat]?.n || "")} · 예상 ${X.won(INS.offerPay(s, o))}</div>${o.hid ? `<div class="igacts" style="padding:0"><button class="igbtn" style="border-color:#f6c6d4" data-igdeal="${o.id}:hide" ${w ? `data-why="${esc(w)}"` : ""}>표시 없이 ⚡1<br><small style="font-size:11px;font-weight:600">${X.won(INS.offerPay(s, o))}</small></button><button class="igbtn pri" data-igdeal="${o.id}:lab" ${w ? `data-why="${esc(w)}"` : ""}>표시하고 ⚡1<br><small style="font-size:11px;font-weight:600">${X.won(INS.offerPay(s, base))}</small></button></div>` : `<button class="igbtn ${o.fit ? "pri" : ""}" data-igdeal="${o.id}" ${w ? `data-why="${esc(w)}"` : ""}>콘텐츠 만들기 ⚡1</button>`}</div>`; }).join("") : `<div class="igsub">아직 제안이 없어요. 팔로워 1천 명부터, 컨셉이 분명할수록 자주 와요.</div>`}
    <div class="igcard"><b>공동구매</b><div class="igsub">팔로워 1만부터 석 달에 한 번. 팬심이 높을수록 잘 팔려요.</div><button class="igbtn" data-iggong ${why ? `data-why="${esc(why)}"` : ""}>공동구매 열기 ⚡2</button></div>
    ${i.brand ? `<div class="igcard"><b>내 브랜드</b><div class="igsub">${S().t - i.brand.t0}달째 판매 중 · 매달 팬심과 참여율만큼 팔려요</div></div>` : ""}</div>`;
}

// 숨긴 광고가 있을 때만: 몇 건, 언제까지 들킬 수 있는지(규칙은 접어 둔다)
function hidCard() {
  const i = I(), s = S(), L = i.hidAds || [], A = INS.F30.ad; if (!L.length) return "";
  const end = Math.max(...L.map((x) => x.t + A.life)) - s.t;
  return `<div class="igcard" style="border-color:#f6c6d4;background:#fff7f8"><b style="color:#e0245e">🤫 숨긴 광고 ${L.length}건</b> <small>앞으로 ${end}달 동안 들킬 수 있어요</small>
    <details style="margin-top:4px"><summary style="font-size:11px;color:#8e8e8e;cursor:pointer">자세히 ▾</summary><div class="igsub" style="margin:4px 0 0">팔로워가 많을수록, "광고 아니에요"라고 거짓 해명할수록 잘 들켜요. 들키면 한꺼번에 드러나 과징금(협찬비의 약 ${A.fineK}배)과 논란이 와요.</div></details></div>`;
}
function openMeet() {
  const s = S(), why = INS.canMeet(s); if (why) return X.toast([], why);
  if (s.pending) return X.toast([], "먼저 열린 장면을 끝내요");
  X.E.openScene(s, INS.fanMeetScene(s)); X.afterRes({ ok: true, lines: [] }); setTimeout(draw, 30);
}

// ───────── 버튼 ─────────
function act(id, arg) { X.doAct(id, arg); setTimeout(draw, 30); }
function bind() {
  const on = (sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); if (b.dataset.why) return X.toast([], b.dataset.why); fn(b); }));
  on("[data-igx]", () => closeInsta());
  on("[data-igtab]", (b) => { if (game) return X.toast([], "댓글함 판을 먼저 끝내요"); tab = b.dataset.igtab; sheet = null; edit = !I().cc ? {} : null; draw(); });
  on("[data-igedit]", () => { edit = {}; draw(); });
  on("[data-igcancel]", () => { edit = null; draw(); });
  on("[data-igax]", (b) => { const [ax, k] = b.dataset.igax.split(":"); edit = { ...(edit || {}), [ax]: k }; draw(); });
  on("[data-igconfirm]", () => { const i = I(); const cc = { topic: "daily", tone: "film", fmt: "photo", face: "hand", ...(i.cc || {}), ...edit }; const r = INS.setConcept(S(), cc); X.toast(r.lines || [], r.msg); if (r.ok) edit = null; X.save(); draw(); });
  on("[data-igpost]", () => { sheet = sheet === "post" ? null : "post"; draw(); });
  on("[data-igplan]", () => { sheet = sheet === "plan" ? null : "plan"; draw(); });
  on("[data-igsetplan]", (b) => { const r = INS.setPlan(S(), b.dataset.igsetplan); X.toast([], r.msg); sheet = null; X.save(); draw(); });
  on("[data-igkind]", (b) => { sheet = null; act("in_post", b.dataset.igkind); });
  on("[data-igreel]", () => act("in_reel"));
  on("[data-igsub]", () => { sheet = sheet === "sub" ? null : "sub"; draw(); });
  on("[data-igsetsub]", (b) => { const r = INS.setSub(S(), b.dataset.igsetsub === "1"); X.toast([], r.msg); sheet = null; X.save(); draw(); });
  on("[data-igmeet]", () => openMeet());
  // 챌린지(11-26): 갈아타기(시트에서 한 번 더 확인) · 현장 촬영
  on("[data-igmove]", () => { sheet = sheet === "move" ? null : "move"; draw(); });
  on("[data-igmovego]", () => { const r = INS.moveNow(S()); X.toast(r.lines || [], r.msg); sheet = null; X.save(); draw(); });
  on("[data-igfield]", () => { const r = INS.fieldShoot(S()); X.toast(r.lines || [], r.msg); X.save(); draw(); });
  on("[data-igstart]", () => startGame());
  on("[data-igpick]", (b) => { if (!game) return; const [id, a] = b.dataset.igpick.split(":"); game.picks[id] = a; b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); const c = el.querySelector(".iggauge span"); if (c) c.textContent = `골랐다 ${Object.keys(game.picks).length}/${I().inbox.list.length}`; });
  on("[data-igdone]", () => finishGame());
  on("[data-igdm]", (b) => { const [id, k] = b.dataset.igdm.split(":").map(Number); const s = S(); if (s.pending) return X.afterRes({ ok: true, lines: [] }); const res = INS.dmAnswer(s, X.E.R(s), id, k); if (!res.ok) return X.toast([], res.msg); X.afterRes(res); setTimeout(draw, 30); });
  on("[data-iginsight]", () => { const r = INS.viewInsight(S()); X.toast([], r.msg); X.save(); draw(); });
  on("[data-igdeal]", (b) => act("in_deal", b.dataset.igdeal));
  on("[data-iggong]", () => act("in_gong"));
}

// ───────── 시험(#auto6-instatest): 컨셉 → 올리기 → 댓글함 판 → DM → 이벤트 장면 전부 → 저장/불러오기 ─────────
export async function selfTest(ctx) {
  { const m = location.hash.match(/f30([a-z]+)/); if (m) return f30Test(ctx, m[1]); }
  X = ctx; const log = [], E = ctx.E, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const say = (ok, lines) => { const er = document.getElementById("err"); if (er) { ok = false; lines = [er.textContent, ...lines]; } const d = document.createElement("pre"); d.id = "igtest"; d.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99;background:#000d;color:#9f9;font-size:11px;max-height:50vh;overflow:auto;margin:0;padding:6px"; d.textContent = [ok ? "INSTA TEST OK" : "INSTA TEST FAIL", ...lines].join("\n"); document.body.appendChild(d); };
  const flush = async () => { let g = 0; while (g++ < 60) { const c = document.querySelector(".cine"); if (c) { c._skip?.(); await wait(20); continue; } const b = document.querySelector("#modal .scene [data-ch]"); if (b) { b.click(); await wait(10); continue; } const ok = document.querySelector("#modal [data-ok]"); if (ok) { ok.click(); await wait(10); continue; } const s = ctx.S; if (s.pending) { ctx.afterRes({ ok: true, lines: [] }); await wait(10); continue; } if (s.sceneQ?.length) { E.nextQueuedScene(s); continue; } break; } };
  const click = async (sel) => { const b = el?.querySelector(sel); if (!b) throw new Error("버튼 없음: " + sel); b.click(); await wait(40); };
  try {
    const s = ctx.S; s.ap = 99; s.hp = s.hpMax; s.mgT = { ...(s.mgT || {}), insta: s.t }; // 미니게임은 건너뛴다
    // 1) 리브랜딩 화면에서 컨셉 고르기
    openInsta(ctx, "feed"); await wait(30);
    await click("[data-igedit]"); await click('[data-igax="topic:career"]'); await click('[data-igax="tone:bmov"]'); await click('[data-igax="fmt:info"]'); await click('[data-igax="face:hand"]');
    I().rbT = -99; draw(); await click("[data-igconfirm]");
    if (I().cc.topic !== "career" || I().cc.fmt !== "info") throw new Error("컨셉이 안 바뀜"); log.push("컨셉 OK: " + INS.ccName(I().cc));
    // 2) 약속·올리기
    await click("[data-igplan]"); await click('[data-igsetplan="3"]');
    const f0 = I().f, u0 = INS.upsThisMonth(s);
    await click("[data-igpost]"); await click('[data-igkind="on"]'); await flush();
    await click("[data-igpost]"); await click('[data-igkind="drift"]'); await flush();
    if (INS.upsThisMonth(s) !== u0 + 2) throw new Error("올리기 횟수 이상"); log.push(`올리기 OK: 팔로워 ${f0} → ${I().f}, 일관성 ${Math.round(I().cons)}, 피드 ${I().feed.length}칸`);
    // 3) 댓글함 판(이번 달 것을 만들어서)
    INS.testInbox(s, E.R(s)); await click('[data-igtab="inbox"]'); await click("[data-igstart]");
    for (const c of I().inbox.list) { const b = el.querySelector(`[data-igpick^="${c.id}:"]`); b.click(); }
    await click("[data-igdone]"); await flush();
    if (!I().inbox.done || !I().inbox.res) throw new Error("댓글함이 안 끝남"); log.push(`댓글함 OK: 잘 고른 것 ${I().inbox.res.filter((x) => x.good > 0).length}/${I().inbox.res.length}, 팬심 ${Math.round(I().fan)} 논란 ${Math.round(I().ctrv)}`);
    // 4) DM 다섯 종류
    s.ins.f = Math.max(s.ins.f, 70000);
    s.ins.dm = []; for (const k of ["celeb", "fan", "scam", "deal"]) INS.testDm(s, E.R(s), k);
    openInsta(ctx, "dm"); await wait(30); let dmN = 0;
    for (let g = 0; g < 8; g++) { const b = el.querySelector("[data-igdm]"); if (!b) break; b.click(); dmN++; await wait(40); await flush(); openInsta(ctx, "dm"); await wait(20); }
    INS.testDm(s, E.R(s), "revise"); openInsta(ctx, "dm"); await wait(20); { const b = el.querySelector("[data-igdm]"); if (b) { b.click(); dmN++; await wait(40); await flush(); } }
    log.push(`DM OK: ${dmN}개 답함, 만난 유명인 ${Object.keys(I().met).map((id) => E.CHAR[id]?.name).join("·") || "없음"}`);
    // 5) 협찬함·인사이트
    openInsta(ctx, "ins"); await wait(20); await click("[data-iginsight]");
    openInsta(ctx, "deal"); await wait(20); const db = el.querySelector("[data-igdeal]"); if (db) { db.click(); await wait(40); await flush(); }
    log.push(`인사이트·협찬 OK: 정보 ${I().reveal}/3, 협찬 ${I().dealsDone}건`);
    // 6) 모든 인별 장면(위기 6 + 대박 + 전용 이벤트 + 트렌드 + 콜라보 + 브랜드)
    closeInsta(); const scs = INS.testScenes(s, E.R(s)); let nSc = 0, nCine = 0;
    for (const sc of scs) { for (let ci = 0; ci < sc.choices.length; ci++) { const c2 = JSON.parse(JSON.stringify(sc)); s.ap = 99; s.hp = s.hpMax; E.openScene(s, c2); ctx.afterRes({ ok: true, lines: [] }); await wait(10); const bs = document.querySelectorAll("#modal .scene [data-ch]"); if (bs[ci]) { if (s.sceneQ.some((q) => q.cine)) nCine++; bs[ci].click(); await wait(10); if (s.sceneQ.some((q) => q.cine)) nCine++; } await flush(); nSc++; } }
    log.push(`장면 OK: ${scs.length}개 × 선택지 = ${nSc}번, 화보 ${nCine}번, 앨범 ${(ctx.meta?.().album || []).filter((a) => /^in_/.test(a.k)).length}장`);
    // 7) 다음 달 넘기기 몇 번 + 저장/불러오기
    for (let m = 0; m < 3; m++) { E.endMonth(s); await flush(); }
    const s2 = E.load(E.save(s)); if (!s2?.ins?.cc) throw new Error("저장/불러오기 실패");
    log.push(`월 넘김·저장 OK: 팔로워 ${I().f.toLocaleString()}, 유명인 관계 ${Object.keys(s.rel).filter((id) => E.CHAR[id]?.celeb).length}명`);
    openInsta(ctx, "feed"); say(true, log);
  } catch (e) { say(false, [String(e.stack || e), ...log]); }
}

// ───────── 특이 요소 시험(#auto6-insta-instatest-f30<무엇>) ─────────
// all: 전부 자동으로(뒷광고 → 적발, 정지 → 부계정 이사·이의 신청 → 복구, 팬 모임 성공·박제, 저장) · 나머지는 화면을 띄우고 멈춘다(스크린샷용)
// ad(협찬함: 숨긴 광고 1건 + 표시 고르기) · adx(적발 장면) · ban(정지 장면) · banned(정지 중 피드) · sub(부계정 시트) · meet(팬 모임 카드) · meetgo(팬 모임 장면) · meetok(성공 화보)
async function f30Test(ctx, k) {
  X = ctx; const E = ctx.E, s = ctx.S, log = [], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const say = (ok, lines) => { const er = document.getElementById("err"); if (er) { ok = false; lines = [er.textContent, ...lines]; } const d = document.createElement("pre"); d.id = "igtest"; d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99;background:#000d;color:#9f9;font-size:11px;max-height:40vh;overflow:auto;margin:0;padding:6px"; d.textContent = [ok ? "F30 TEST OK" : "F30 TEST FAIL", ...lines].join("\n"); document.body.appendChild(d); };
  const flush = async (n = 80) => { let g = 0; while (g++ < n) { const c = document.querySelector(".cine"); if (c) { c._skip?.(); await wait(20); continue; } const b = document.querySelector("#modal .scene [data-ch]"); if (b) { b.click(); await wait(10); continue; } const ok = document.querySelector("#modal [data-ok]"); if (ok) { ok.click(); await wait(10); continue; } if (s.pending) { ctx.afterRes({ ok: true, lines: [] }); await wait(10); continue; } if (s.sceneQ?.length) { E.nextQueuedScene(s); continue; } break; } };
  const click = async (sel) => { const b = el?.querySelector(sel) || document.querySelector(sel); if (!b) throw new Error("버튼 없음: " + sel); b.click(); await wait(40); };
  const scene = async (sc, ci) => { E.openScene(s, sc); ctx.afterRes({ ok: true, lines: [] }); await wait(30); if (ci === undefined) return; const bs = document.querySelectorAll("#modal .scene [data-ch]"); if (!bs[ci]) throw new Error(`선택지 ${ci} 없음: ${sc.title}`); bs[ci].click(); await wait(30); };
  const need = (c, m) => { if (!c) throw new Error(m); };
  try {
    s.ap = 99; s.hp = s.hpMax; s.mgT = { ...(s.mgT || {}), insta: s.t }; const i = INS.ens(s);
    if (!i.cc) INS.setConcept(s, { topic: "food", tone: "film", fmt: "photo", face: "hand" });
    i.f = Math.max(i.f, 9000); i.fan = 60;
    const offer = (nm, cat, fit) => { i.offers.push({ id: ++i.offSeq, nm, cat, fit, mul: fit ? 1.3 : 0.75, t: s.t }); i.deals = i.offers.length; return i.offers[i.offers.length - 1]; };
    // ── 뒷광고 ──
    if (/^(ad|adx|all)$/.test(k)) {
      i.offers = []; i.dm = []; const o1 = offer("동네 로스터리", "food", true), o2 = offer("밀키트 회사", "food", true);
      INS.testDm(s, E.R(s), "hidead", o1.id); INS.testDm(s, E.R(s), "hidead", o2.id);
      openInsta(ctx, "dm"); await wait(30);
      for (let g = 0; g < 2; g++) { const b = el.querySelector('[data-igdm$=":0"]'); need(b, "뒷광고 DM 버튼 없음"); b.click(); await wait(40); openInsta(ctx, "dm"); await wait(20); }
      need(o1.hid === 1 && o2.hid === 1, "표시 빼기 약속이 안 됨"); log.push(`뒷광고 DM OK: 단가 ×${o1.mul}`);
      if (k === "ad") { openInsta(ctx, "dm"); await wait(20); }
      openInsta(ctx, "deal"); await wait(20); await click(`[data-igdeal="${o1.id}:hide"]`); await flush();
      need(i.hidAds.length === 1, "숨긴 광고가 안 쌓임"); log.push(`표시 없이 올리기 OK: 숨긴 광고 ${i.hidAds.length}건, 피드 🤫 ${i.feed[0].hid ? "있음" : "없음"}`);
      openInsta(ctx, "deal"); await wait(20);
      if (k === "ad") return say(true, log);
      if (k === "adx") { closeInsta(); await scene(INS.testF30(s, E.R(s), "ad")); return say(true, log); }
      await click(`[data-igdeal="${o2.id}:lab"]`); await flush(); need(i.hidAds.length === 1, "표시하고 올렸는데 숨긴 광고가 늘었다"); log.push("표시하고 올리기 OK");
      // 댓글함 거짓 해명 → 들킬 위험 +
      INS.testInbox(s, E.R(s)); i.inbox.list[0] = { id: 0, k: "doubt", nm: "익명123", tx: "광고 아님?" }; const h0 = i.adHeat;
      closeInsta(); ctx.doAct("in_engage", { 0: "explain" }); await flush(); need(i.adHeat === h0 + 1, "거짓 해명 위험이 안 오름"); log.push(`거짓 해명 OK: 위험 ${i.adHeat}`);
      // 들킨다(달 넘김)
      i.hidAds.forEach((x) => (x.p = 5)); const cash0 = s.cash; let m = 0;
      while (!i.adCaught && m++ < 4) { E.endMonth(s); await flush(); }
      need(i.adCaught === 1 && !i.hidAds.length, "적발 장면이 안 나옴"); log.push(`적발 OK: ${m}달 만에, 돈 ${Math.round(s.cash - cash0)}`);
    }
    // ── 계정 정지·부계정 ──
    if (/^(ban|banned|sub|all)$/.test(k)) {
      i.f = Math.max(i.f, 9000);
      if (k === "sub") { openInsta(ctx, "feed"); await wait(30); await click("[data-igsub]"); return say(true, log); }
      if (k === "banned") { i.ban = { left: 2, t: s.t }; i.sub = { f: 1300, on: true }; openInsta(ctx, "feed"); await wait(30); return say(true, log); }
      openInsta(ctx, "feed"); await wait(30); await click("[data-igsub]"); await click('[data-igsetsub="1"]'); need(i.sub.on, "부계정 켜기 실패");
      i.sub.f = 1300;
      if (k === "ban") { closeInsta(); await scene(INS.testF30(s, E.R(s), "ban")); return say(true, log); }
      closeInsta(); const f0 = i.f; await scene(INS.testF30(s, E.R(s), "ban"), 1); await flush();
      need(!i.ban && i.sub.f === 0 && i.f < f0, "부계정 이사 실패"); log.push(`부계정 이사 OK: ${f0} → ${i.f}`);
      i.f = 9000; await scene(INS.testF30(s, E.R(s), "ban"), 0); await flush(); need(INS.banned(s), "정지가 안 걸림");
      need(!!E.canAct(s, "in_post", "on"), "정지 중인데 올리기가 됨"); log.push(`이의 신청 OK: 정지 ${i.ban.left}달, 올리기 막힘 "${E.canAct(s, "in_post", "on")}"`);
      let m = 0; while (INS.banned(s) && m++ < 5) { E.endMonth(s); await flush(); }
      await flush(200); s.ap = 99;
      if (s.pending) { log.push('연말 결산 등 남은 화면 닫음: ' + (s.pending.title || s.pending.kind)); s.pending = null; s.sceneQ = []; document.querySelector('#modal')?.replaceChildren(); ctx.render(); await wait(30); } // 시험용
      need(!INS.banned(s) && !i.ban, "복구가 안 됨 " + JSON.stringify(i.ban) + " m=" + m + " t=" + s.t); log.push(`복구 OK: ${m}달 뒤, 올리기 ${E.canAct(s, "in_post", "on") || "가능"}`);
    }
    // ── 팬 모임 ──
    if (/^(meet|meetgo|meetok|all)$/.test(k)) {
      i.ban = null; i.f = Math.max(i.f, 12000); i.fan = 86; i.meetT = -99;
      if (k === "meetok") i.loyal = 60;
      openInsta(ctx, "feed"); await wait(30);
      if (k === "meet") return say(true, log);
      await click("[data-igmeet]"); await wait(40);
      if (k === "meetgo") return say(true, log);
      if (k === "meetok") { const b = document.querySelector("#modal .scene [data-ch]"); b.click(); await wait(60); for (let g = 0; g < 6 && !document.querySelector(".cine"); g++) { const ok = document.querySelector("#modal [data-ok]"); if (ok) ok.click(); else if (s.sceneQ.length) E.nextQueuedScene(s); await wait(60); } return say(true, log); }
      i.loyal = 60; const l0 = i.loyal; document.querySelector("#modal .scene [data-ch]").click(); await wait(40); await flush();
      need(i.meetN === 1 && i.loyal > l0 && i.lastMeet?.ratio >= INS.F30.meet.ok, "팬 모임 성공 실패"); log.push(`팬 모임 성공 OK: ${i.lastMeet.att}/${i.lastMeet.seats}명, 충성 팬 ${i.loyal}`);
      need(!!INS.canMeet(s), "쿨타임이 안 걸림");
      i.f = 400; i.fan = 70; i.loyal = 0; const c0 = i.ctrv; closeInsta(); await scene(INS.fanMeetScene(s), 0); await flush();
      need(i.lastMeet.ratio < INS.F30.meet.mid && i.ctrv > c0, "박제 결과가 안 나옴"); log.push(`팬 모임 박제 OK: ${i.lastMeet.att}/${i.lastMeet.seats}명, 논란 ${Math.round(c0)} → ${Math.round(i.ctrv)}`);
      log.push(`앨범 팬 모임 화보 ${(ctx.meta?.().album || []).filter((a) => a.k === "in_fanmeet").length}장`);
    }
    // ── 봇 선택 + 저장 ──
    const picks = ["meet", "ban", "ad"].map((q) => { const sc = INS.testF30(s, E.R(s), q); return `${sc.ev}:${INS.pickFor(s, sc)}`; });
    log.push("봇 기본 선택 " + picks.join(" "));
    const s2 = E.load(E.save(s)); need(s2?.ins?.sub && Array.isArray(s2.ins.hidAds), "저장/불러오기 실패"); log.push("저장/불러오기 OK");
    say(true, log);
  } catch (e) { say(false, [String(e.stack || e), ...log]); }
}
