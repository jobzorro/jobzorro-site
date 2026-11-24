// 투잡 보드 위쪽 작은 칸(v4.25b): 역량형 '배우는 기간' 한 줄 + 지금 걸린 시장 충격. 엔진은 engine/sj.js skillInfo, engine/market.js
import { skillInfo } from "./engine/sj.js";
import { boardInfo, marketDemo } from "./engine/market.js";
import { waveInfo } from "./engine/wave.js";
import * as PW from "./engine/prwave.js"; // 파티룸 컨셉 위기(11-23) // 판이 바뀐다(11-23)

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pc = (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;

// inCard: '초반 고생 중' 카드 안에 한 줄로 합칠 때(v4.27 화면 정리)
export function skillLine(S, k, inCard) {
  const q = skillInfo(S, k); if (!q || !q.learning) return "";
  // 화면 정리(v4.31): 결론(지금 수입 몇 %, 언제 오르나)만 먼저. 계산은 둘째 줄에 흐리게.
  const head = `<b class="gold">배우는 기간</b> · 지금 수입 <b>${Math.round(q.mult * 100)}%</b>${q.next ? ` · 역량 ${q.next}이 되면 한 칸 올라요` : ""}`, sub = `지금 역량 ${q.N}(${esc(q.statN)} ${q.stat} + 경험 ${q.exp}) · ${q.M}이면 다 배운 거예요`;
  if (inCard) return `<div class="tiny skline" style="font-size:11.5px;margin-top:4px;color:var(--muted)">${head}<div style="opacity:.75">${sub}</div></div>`;
  return `<div class="tiny skline" style="font-size:11.5px;margin:-2px 0 8px;color:var(--muted)">${head}<div style="opacity:.75">${sub}</div></div>`;
}
export function marketBox(S, k, noSkill) {
  try { if (/-mktest/.test(location.hash) && !S.mk?.list?.length) marketDemo(S, k); } catch (e) {} // 시험용 해시
  const b = boardInfo(S, k);
  const mk = b ? `<div class="card mkbox" style="padding:6px 10px;margin-bottom:8px"><div class="row" style="gap:6px"><b class="tiny">시장</b><span class="grow"></span><span class="tiny" style="color:${b.net < 0 ? "var(--red)" : "var(--green)"}">이익 영향 ${pc(b.net)}</span></div>${b.list.map((x) => `<div class="tiny muted" style="font-size:11px">${esc(x.n)} · ${pc(x.v)} · ${x.left}개월 남음</div>`).join("")}</div>` : "";
  const w = waveInfo(S, k), wv = w && !w.own ? `<div class="card a6wbox" style="padding:6px 10px;margin-bottom:8px"><div class="row" style="gap:6px"><b class="tiny bad">판이 바뀌었다</b><span class="tiny">${esc(w.n)}</span><span class="grow"></span><span class="tiny" style="color:${w.cut > 0 ? "var(--red)" : "var(--green)"}">${w.cut > 0 ? `이익 −${Math.round(w.cut * 100)}%` : "적응 끝"}</span></div><div class="tiny muted" style="font-size:11px">${w.mode === "shift" ? (w.left > 0 ? `갈아타는 중 · ${w.left}개월 뒤 원래대로` : "새 방식이 자리를 잡았어요") : w.mode === "fill" ? "모임으로 채우는 중 · 유치한 모임과 내 모임 회원이 늘수록 풀려요" : w.mode === "prep" ? `갈아탈 준비 중 · ${w.req ? `${esc(w.req.n)} ${w.req.need} 필요(지금 ${w.req.cur})` : "조건을 채우면 다시 물어요"}` : w.mode === "half" ? "반만 대응 중 · 해마다 조금씩 더 줄어요" : w.dodge ? "내 길은 비켜 갔어요 · 조금만 줄어요" : "하던 대로 가는 중 · 해마다 더 줄어요. 2년 뒤와 4년 뒤에 다시 고를 수 있어요"}</div></div>` : "";
  let pw = "";
  if (k === "pr") { const q = PW.info(S); if (q) { const L = [];
    if (q.pre) L.push(`<div class="tiny" style="font-size:11.5px"><b class="${q.pre.mine ? "bad" : "gold"}">업계 소식</b> ${esc(q.pre.line)} · '${esc(q.pre.n)}' 컨셉이 ${q.pre.left}개월 안에 흔들릴 수 있어요${q.pre.mine ? " · <b class=\"bad\">내 컨셉</b>" : ""}</div>`);
    for (const x of q.sunk) L.push(`<div class="tiny" style="font-size:11.5px;color:${x.mine ? "var(--red)" : "var(--muted)"}">침몰: ${esc(x.n)} · 예약 −${Math.round(x.cut * 100)}%${x.mine ? " · 내 지점이 이 컨셉이에요" : ""}</div>`);
    for (const x of q.dz) L.push(`<div class="tiny" style="font-size:11.5px;color:${x.v > 0 ? "var(--green)" : "var(--red)"}">${x.v > 0 ? "상권 부흥" : "상권 붕괴"}: ${esc(x.n)} · ${esc(x.why)} · 예약 ${x.v > 0 ? "+" : "−"}${Math.round(Math.abs(x.v) * 100)}% · ${Math.ceil(x.left / 12)}년 남음${x.mine ? " · 내 지점" : ""}</div>`);
    if (q.syn) L.push(`<div class="tiny" style="font-size:11.5px;color:var(--green)">컨셉 묶음 이득: 관리 행동력 −${q.syn}% · 관리비 −${q.synCost}%</div>`); else if (q.synOff) L.push(`<div class="tiny muted" style="font-size:11.5px">컨셉이 ${q.kinds}가지라 관리 이득이 없어요(두 가지 이하일 때만)</div>`);
    if (L.length) pw = `<div class="card a6wbox" style="padding:6px 10px;margin-bottom:8px">${L.join("")}</div>`; } }
  return (noSkill ? "" : skillLine(S, k)) + mk + wv + pw;
}
