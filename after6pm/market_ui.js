// 투잡 보드 위쪽 작은 칸(v4.25b): 역량형 '배우는 기간' 한 줄 + 지금 걸린 시장 충격. 엔진은 engine/sj.js skillInfo, engine/market.js
import { skillInfo } from "./engine/sj.js";
import { boardInfo, marketDemo } from "./engine/market.js";

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
  return (noSkill ? "" : skillLine(S, k)) + mk;
}
