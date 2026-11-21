// 라이벌 칸(v4.25): 투잡 보드 위쪽(boardHead)에 작게. 엔진은 engine/rival.js
import { boardInfo, rivalDemo } from "./engine/rival.js";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pc = (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
export const RIVAL_CINE_TAG = { rival_appear: "라이벌", rival_war: "라이벌", rival_close: "라이벌", rival_team: "라이벌", rival_win: "라이벌", rival_lose: "라이벌", rival_friend: "라이벌", rival_copy: "라이벌" };

export function rivalBox(S, k) {
  try { if (/-rvtest/.test(location.hash)) rivalDemo(S, k); } catch (e) {} // 시험용 해시
  const b = boardInfo(S, k); if (!b) return "";
  const live = b.list.filter((x) => x.st !== "gone"), gone = b.list.length - live.length;
  const col = (v) => (v < 0 ? "var(--red)" : v > 0 ? "var(--green)" : "var(--muted)");
  const rows = live.map((x) => `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 0;border-top:1px solid var(--line)">
    <b style="font-size:12px">${esc(x.n)}</b><span class="tag" style="font-size:11px">${esc(x.kind)}</span>${x.stN !== "경쟁 중" ? `<span class="tag gold" style="font-size:11px">${esc(x.stN)}</span>` : ""}
    <span class="grow"></span><span style="font-size:11px;color:${col(x.press)}">${x.press ? pc(x.press) : "0%"}</span>
    <div class="tiny muted" style="flex-basis:100%;font-size:11px">${esc(x.d)} · 실력 ${x.sk} · 가격 내 ${x.pc}%</div></div>`).join("");
  return `<div class="card rvbox" style="padding:8px 10px;margin-bottom:8px"><div class="row" style="gap:6px"><b class="tiny">라이벌</b><span class="tiny muted">${live.length}곳${gone ? ` · 떠난 곳 ${gone}` : ""}</span><span class="grow"></span><span class="tiny" style="color:${col(b.net)}">이익 영향 ${pc(b.net)}</span></div>${rows}</div>`;
}
