// 업의 이해도 공통 화면(11-28). 모든 투잡이 같은 카드 · 같은 등급 사다리 · 같은 "업계 상위 ○%"를 쓴다. 부제만 투잡마다 다르다.
// 쓰는 법(투잡 보드 어디서나 한 줄): import { undCard } from "../und_ui.js";  …  ${undCard(S, "tutoring")}
//   undCard(S, 키, { how: "어떻게 오르나 글", foot: "점수 아래 한 줄(시기 설명 등)", extra: "카드 안에 더 넣을 HTML" })  → 스위치가 꺼졌거나 모르는 키면 빈 글
// 점수와 등급은 engine/und.js 의 info(S, 키) 가 준다. 클래스 이름은 a6und- 로 시작한다(사이트 공통 CSS 와 겹치지 않게).
import * as D from "./engine/defs.js";
import * as UND from "./engine/und.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => Math.round(v || 0).toLocaleString();
const bar = (v, max, color = "var(--gold)") => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%;background:${color}"></i></div>`;
const CSS = `
.a6und-top{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:baseline}
.a6und-v{font-size:20px;line-height:1.1;color:var(--gold)}
.a6und-grow{flex:1}
.a6und-bar{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px}
.a6und-bar>span{flex:none;min-width:58px}.a6und-bar>.meter{flex:1;min-width:0}.a6und-bar>b{flex:none;min-width:52px;text-align:right}
.a6und-foot{margin-top:6px}
.a6und-how{margin-top:4px}.a6und-how>summary{cursor:pointer;display:inline-block}.a6und-how>div{margin-top:4px}
.a6und-dom{margin-top:8px;padding:7px 10px;border-radius:10px;background:var(--panel2)}
.a6und-dom>b{display:block;font-size:12px;margin-bottom:2px}
.a6und-dom .a6und-bar{margin-top:4px}.a6und-dom .a6und-bar>span{min-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42%}
.a6und-rows{display:flex;flex-direction:column}
.a6und-row{padding:7px 0;border-top:1px solid var(--line);min-width:0}
.a6und-row:first-child{border-top:0;padding-top:0}
.a6und-rh{display:flex;flex-wrap:wrap;gap:2px 6px;align-items:baseline}
.a6und-rh>b{font-size:13px}.a6und-rh>i{font-style:normal;font-size:11px;color:var(--muted)}.a6und-rh>em{font-style:normal;font-weight:900;color:var(--gold)}
.a6und-row>.meter{margin-top:4px}
.a6und-next{margin-top:8px;padding:8px 10px;border-radius:10px;background:var(--panel2);font-size:12px;line-height:1.6}
.a6und-tg{font-style:normal;color:var(--gold);font-weight:700}
`;
let cssDone = false;
function css() { if (cssDone || typeof document === "undefined") return; cssDone = true; if (document.getElementById("a6und-css")) return; const st = document.createElement("style"); st.id = "a6und-css"; st.textContent = CSS; document.head.appendChild(st); }

// 세차 · 컨설팅 · 과외의 기본 "어떻게 오르나" 글(각 보드가 opt.how 로 바꿔 넣을 수 있다)
const HOW_OLD = {
  carwash: "맞춘 처방이 처방 노트로 남을 때 쌓이고, 일한 달도 조금씩 보태요. 어려운 차 · 상태 · 고객 조합일수록 크게 올라요. 신형이 나오면 구형 노트의 몫은 줄어요.",
  cs: "합격시킨 고객이 생길 때마다 쌓여요. 비싼 상품, 눈높이 차이가 큰 고객, 채용 한파 때의 합격일수록 크게 올라요. 전형이 바뀌면 조금 빠져요.",
  tutoring: "맞춘 수업안이 수업 노트로 남을 때, 성적을 올린 학생이 생길 때, 막힌 곳을 풀 때마다 쌓여요. 평가가 바뀌어 노트가 낡으면 그만큼 빠지고, 다시 맞추면 돌아와요.",
};
const domBlock = (L) => `<div class="a6und-dom"><b>도메인 이해도 <span class="tiny muted" style="font-weight:400">· 업종마다 따로 쌓여요(최대 100)</span></b>${L.length ? L.map((d) => `<div class="a6und-bar"><span>${esc(d.n)}${d.on ? "" : " (지난 분야)"}</span>${bar(d.v, 100, "var(--blue)")}<b>${d.v}</b></div>`).join("") : `<div class="tiny muted">아직 정한 분야가 없어요. 6년 차에 분야를 정하면 그 업계 일과 모임으로 올라요.</div>`}</div>`;

// 공통 카드: 제목 "업의 이해도 (부제)" · 점수 · 등급 · 업계 상위 % · 다음 등급까지 막대 · "어떻게 오르나" 펼침
export function undCard(s, key, opt = {}) {
  const I = UND.info(s, key); if (!I) return "";
  css();
  const R = I.rank, how = opt.how || I.how || HOW_OLD[key] || "";
  const foot = [opt.foot || "", I.base ? `전생의 감 +${num(I.base)}` : ""].filter(Boolean).join(" · ");
  return `<div class="card a6und" data-a6und="${esc(key)}"><h3>업의 이해도 <small>(${esc(I.sub)})</small></h3>
    <div class="a6und-top"><b class="a6und-v">${num(I.v)}</b><b>${esc(R.n)}</b>${I.note ? `<span class="tiny muted">(${esc(I.note)})</span>` : ""}<span class="a6und-grow"></span><span class="tag ${R.top <= 10 ? "gold" : ""}">업계 상위 ${R.top}%</span></div>
    <div class="a6und-bar"><span>다음 등급</span>${bar(I.v - R.from, R.to - R.from)}<b>${num(R.next)}점</b></div>
    ${I.doms ? domBlock(I.doms) : ""}${opt.extra || ""}
    ${foot ? `<div class="tiny muted a6und-foot">${esc(foot)}</div>` : ""}
    ${how ? `<details class="a6und-how"><summary class="tiny muted">어떻게 오르나 ▾</summary><div class="tiny muted">${esc(how)} 등급 문턱은 모든 투잡이 같아요(${UND.LADDER.ranks.slice(1).map(([v, n]) => `${n} ${num(v)}`).join(" · ")}, 그 뒤로는 ${num(UND.LADDER.dan)}점마다 한 단).</div></details>` : ""}</div>`;
}
// 새 투잡 보드 맨 위(ui.js 의 boardHead 가 부른다). 세차 · 컨설팅 · 과외는 자기 보드가 직접 넣으므로 여기서는 내지 않는다
export function boardCard(s, key) { if (!D.UND_ON || !UND.isNew(key)) return ""; const I = UND.info(s, key); return I && I.on ? undCard(s, key) : ""; }

// 홈: 하는 투잡 줄에 붙는 등급 꼬리표(" · 장인")
export function homeTag(s, key) { if (!D.UND_ON) return ""; const I = UND.info(s, key); if (!I || !I.has) return ""; css(); return ` · <i class="a6und-tg">${esc(I.rank.n)}</i>`; }

const rowHtml = (I, withBar) => `<div class="a6und-row"><div class="a6und-rh"><b>${esc(I.n)}</b><i>${esc(I.sub)}</i><span class="a6und-grow"></span><em>${num(I.v)}</em><b>${esc(I.rank.n)}</b><span class="tag ${I.rank.top <= 10 ? "gold" : ""}">상위 ${I.rank.top}%</span></div>${withBar ? bar(I.v - I.rank.from, I.rank.to - I.rank.from) : ""}${I.doms?.length ? `<div class="tiny muted" style="margin-top:3px">도메인 이해도: ${I.doms.map((d) => `${esc(d.n)} ${d.v}`).join(" · ")}</div>` : ""}</div>`;

// 나 화면: 능력치 아래 "업의 이해도" 칸
export function meCard(s) {
  if (!D.UND_ON) return ""; css();
  const L = UND.list(s);
  return `<div class="card a6und" data-a6und="me"><h3>업의 이해도 <small>일을 하면 쌓여요 · 등급 눈금은 모든 투잡이 같아요</small></h3>${L.length ? `<div class="a6und-rows">${L.map((I) => rowHtml(I, true)).join("")}</div>` : `<div class="tiny muted">아직 없어요. 투잡을 시작해 일을 하면 쌓이고, 다음 회차에 일부를 가져갈 수 있어요.</div>`}</div>`;
}

// 엔딩: "이번 인생의 업의 이해도" 줄과 다음 회차(n)에 가져갈 수 있는 점수 미리 보기
export function endCard(s, n) {
  if (!D.UND_ON) return ""; css();
  const rec = UND.endRec(s), L = Object.keys(rec).map((k) => UND.info(s, k)).filter(Boolean).sort((a, b) => b.v - a.v);
  if (!L.length) return "";
  const pct = Math.round(UND.rateOf(n) * 100), O = UND.options(rec, n), same = O.filter((o) => !o.cross), cross = O.filter((o) => o.cross)[0];
  const nx = !pct ? `다음 회차에는 가져갈 수 없어요.` : `<b class="gold">${n}회차에 가져갈 수 있는 점수 (${pct}%)</b><br>${same.map((o) => `${esc(UND.nameOf(o.k))} <b>+${num(o.v)}</b>`).join(" · ")}${cross ? `<br><span class="muted">다른 투잡으로 옮기면 절반: ${esc(UND.nameOf(cross.from))}에서 <b>+${num(cross.v)}</b></span>` : ""}<br><span class="muted">새 인생을 만들 때 투잡 하나만 골라요.</span>`;
  return `<div class="card a6und" data-a6und="end"><h3>이번 인생의 업의 이해도</h3><div class="a6und-rows">${L.map((I) => rowHtml(I, false)).join("")}</div><div class="a6und-next">${nx}</div></div>`;
}

// 명예의 전당(이 기기 기록): 투잡별 최고 이해도. m.undBest = { 키: { v 점수, n 회차, age 끝난 나이, t 시각 } }
export function bestUpdate(m, s) {
  if (!D.UND_ON) return false;
  const rec = UND.endRec(s); let ch = false;
  for (const [k, v] of Object.entries(rec)) if (v > (m.undBest?.[k]?.v || 0)) { m.undBest = { ...(m.undBest || {}), [k]: { v, n: s.ng?.n || 1, age: Math.floor(s.age || 0), t: Date.now() } }; ch = true; }
  return ch;
}
export function hallCard(m) {
  if (!D.UND_ON) return ""; css();
  const on = new Set(UND.jobs()), L = Object.entries(m?.undBest || {}).filter(([k, x]) => on.has(k) && x?.v > 0).sort((a, b) => b[1].v - a[1].v);
  if (!L.length) return "";
  return `<div class="card a6und" style="margin-top:10px" data-a6und="hall"><h3>투잡별 최고 이해도 <small>이 기기 기록</small></h3><div class="a6und-rows">${L.map(([k, x]) => { const R = UND.rankOf(x.v); return `<div class="a6und-row"><div class="a6und-rh"><b>${esc(UND.nameOf(k))}</b><i>${esc(UND.subOf(k))}${x.n ? ` · ${x.n}회차` : ""}</i><span class="a6und-grow"></span><em>${num(x.v)}</em><b>${esc(R.n)}</b><span class="tag ${R.top <= 10 ? "gold" : ""}">상위 ${R.top}%</span></div></div>`; }).join("")}</div></div>`;
}
