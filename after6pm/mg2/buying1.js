// 미니게임 1탄(buying1) "통관 번호 맞추기": 밤 11시, 주문 마감 전. 고객이 보낸 이름·번호와 내 주문 표를 한 줄씩 맞춰 본다.
// 왼쪽(고객이 보낸 것)과 오른쪽(주문 표)이 다른 줄을 눌러 표시하고 [주문 넣기]. 세 판(6줄 → 8줄 → 10줄), 판마다 틀린 줄이 2~3개.
// 틀린 줄을 놓치면 통관에서 멈추고, 멀쩡한 줄을 짚으면 고객에게 괜히 다시 묻게 된다. 빨리 끝낼수록 조금 더.
// 번호는 지어낸 꼴(P-네 자리-네 자리)이다. 그림 파일 없음(DOM 만).
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, vib, rint, pick, shuffle, clamp, RM } from "../mg.js";

const ROWS = [6, 8, 10], BADS = [2, 2, 3];
const FAM = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"];
// 이름과 헷갈리는 짝
const GIV = [["서연", "서현"], ["지우", "지후"], ["하준", "하윤"], ["수아", "수하"], ["도현", "도헌"], ["예린", "예림"], ["시우", "시후"], ["채원", "채윤"], ["건우", "건후"], ["유나", "유라"], ["태윤", "태운"], ["민재", "민제"]];
const TWIN = { 0: "8", 8: "0", 1: "7", 7: "1", 3: "8", 5: "6", 6: "5", 9: "4", 4: "9", 2: "7" }; // 헷갈리는 숫자
const ITEMS = ["만년필 잉크", "방안 노트", "황동 샤프", "티타늄 컵", "드립 주전자", "키캡 세트", "목공 끌", "러닝 양말", "턴테이블 바늘", "가죽 필통", "수채 색연필", "랜턴 유리 갓"];

const CSS = `
.by1{position:absolute;inset:0;display:flex;flex-direction:column;gap:5px;padding:8px;background:linear-gradient(#141a2e,#0d1020);overflow:auto}
.by1-clock{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#c9cde6;font-weight:700}
.by1-clock b{color:#ffe066;font-size:13px}
.by1-h{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr 26px;gap:5px;font-size:11px;font-weight:800;color:#9ea3c0;padding:0 2px}
.by1-l{flex:0 0 auto;display:flex;flex-direction:column;gap:4px}
.mg .by1-r{display:grid;grid-template-columns:1fr 1fr 26px;gap:5px;align-items:stretch;text-align:left;padding:0;border-radius:9px;min-height:36px}
.by1-r>span{display:block;border-radius:8px;padding:3px 7px;line-height:1.25;background:#fffdf7;color:#22242e;border:1px solid #d9d2bf;min-width:0}
.by1-r>span.b{background:#eef4ff;border-color:#b9c9ea}
.by1-r b{display:block;font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.by1-r i{display:block;font-style:normal;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:.2px;white-space:nowrap}
.by1-r em{display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:900;font-size:14px;border-radius:8px;background:#20243d;border:1px solid #3a4168;color:#6f7699}
.by1-r.on em{background:#ff5a6a;border-color:#ff8f9a;color:#fff}
.by1-r.on>span{border-color:#ff8f9a;box-shadow:0 0 0 1px #ff5a6a inset}
.by1-r u{text-decoration:none;background:#ffd0d6;color:#c2182b;border-radius:3px;font-weight:900}
.by1-r.hit em{background:#1f9a5c;border-color:#5fe0a0;color:#fff}
.by1-r.miss em{background:#e0a030;border-color:#ffd166;color:#2a1a00}
.by1-r.fa em{background:#6a7090;border-color:#9ea3c0;color:#fff}
.by1-r:disabled{opacity:1}
.by1-tip{flex:0 0 auto;min-height:34px;font-size:12.5px;line-height:1.4;color:#e8eaf6;background:#0008;border:1px solid #2c3150;border-radius:10px;padding:6px 9px}
.by1-tip b{color:#ffe066}
.by1-tip.ok{border-color:#3cbf7a}.by1-tip.ng{border-color:#ff5a6a}
.by1-tut{display:inline-block;font-size:10.5px;font-weight:900;color:#2a1a00;background:linear-gradient(#ffe08a,#f0b43a);border-radius:6px;padding:1px 6px;margin-right:5px}
.by1-l.n10{gap:3px}.mg .by1-l.n10 .by1-r{min-height:30px}.by1-l.n10 .by1-r>span{padding:1px 7px;line-height:1.12}.by1-l.n10 .by1-r b{font-size:12px}.by1-l.n10 .by1-r i{font-size:11.5px}
@media (max-height:640px){.mg .by1-r{min-height:32px}.by1-r b{font-size:12px}.by1-r i{font-size:11.5px}}
`;

const num = () => `P-${String(1000 + rint(9000))}-${String(rint(10000)).padStart(4, "0")}`;
// 번호 한 군데를 헷갈리게 바꾼다: 이웃한 두 숫자 자리 바꾸기 또는 닮은 숫자로
function twist(n) {
  const pos = [...n].map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
  for (let g = 0; g < 30; g++) {
    const a = [...n];
    if (rint(2) === 0) { const k = pos[rint(pos.length - 1)], k2 = pos[pos.indexOf(k) + 1]; if (k2 !== k + 1 || a[k] === a[k2]) continue; [a[k], a[k2]] = [a[k2], a[k]]; }
    else { const k = pos[rint(pos.length)], t = TWIN[a[k]]; if (!t) continue; a[k] = t; }
    const out = a.join(""); if (out !== n) return out;
  }
  const a = [...n], k = pos[pos.length - 1]; a[k] = a[k] === "1" ? "2" : "1"; return a.join("");
}
// 한 판의 줄들: { nm, no, nm2, no2, bad, it }
function deal(n, bads) {
  const names = shuffle(GIV.map((g, i) => i)).slice(0, n).map((gi) => ({ gi, fam: pick(FAM) })), its = shuffle(ITEMS.slice());
  const badAt = new Set(shuffle(names.map((_, i) => i)).slice(0, bads));
  return names.map((x, i) => {
    const nm = x.fam + GIV[x.gi][0], no = num(); let nm2 = nm, no2 = no; const bad = badAt.has(i);
    if (bad) { if (rint(3) === 0) nm2 = x.fam + GIV[x.gi][1]; else no2 = twist(no); }
    return { nm, no, nm2, no2, bad, it: its[i % its.length] };
  });
}
const mark = (a, b) => [...b].map((c, i) => (c !== a[i] ? `<u>${c}</u>` : c)).join(""); // 다른 글자만 표시

export const GAME = {
  key: "buying1", base: "buying", jc: "#7fb4e6", n: "통관 번호 맞추기", desc: "밤 11시 주문 마감! 고객이 보낸 이름·번호와 주문 표가 다른 줄을 찾아요",
  how: ["처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. 왼쪽은 <b>고객이 보낸 것</b>, 오른쪽은 <b>내 주문 표</b>예요.",
    "이름이나 번호가 <b>다른 줄</b>을 톡 눌러 표시해요. 다시 누르면 풀려요. 숫자 자리가 바뀌었거나 닮은 글자로 적힌 줄이 숨어 있어요.",
    "다 봤으면 <b>주문 넣기</b>! 놓친 줄은 통관에서 멈추고, 멀쩡한 줄을 짚으면 감점이에요. 세 판, 줄이 점점 늘어요."],
  steps: () => [["🔍", "한 줄씩 맞춰 보기"], ["👆", "다른 줄 누르기"], ["📦", "주문 넣기"]],
  css: CSS,
  run(host, ez, finish, skill, opts = {}) {
    const dbg = typeof window !== "undefined" && window.__mgdbg ? window.__mgdbg : null, auto = dbg && dbg.buying1;
    const ezf = 1 + (ez - 1) * 0.5, N = ROWS.length;
    const F = frame(host, "buying1", "통관 번호 맞추기", "", "", `<button class="mg-btn gold" data-go disabled>주문 넣기</button>`);
    F.stage.insertAdjacentHTML("beforeend", `<div class="by1"><div class="by1-clock"><span data-rd></span><b data-ck>밤 11:00</b></div>
      <div class="by1-h"><span>고객이 보낸 것</span><span>내 주문 표</span><span></span></div><div class="by1-l"></div><div class="by1-tip"></div></div>`);
    const IN = F.stage.querySelector(".by1"), list = IN.querySelector(".by1-l"), tip = IN.querySelector(".by1-tip"), rd = IN.querySelector("[data-rd]"), ck = IN.querySelector("[data-ck]"), go = F.foot.querySelector("[data-go]");
    let ri = -1, R = [], phase = "wait", over = false, tm = null, sec = 1, tut = !opts.retry; const res = [];
    const later = (fn, ms) => setTimeout(() => { if (!over && host.isConnected) fn(); }, ms);
    const say = (h, cls = "") => { tip.className = "by1-tip " + cls; tip.innerHTML = h; };
    const draw = () => {
      list.classList.toggle("n10", R.length >= 10); // 11-28 열 줄 판: 줄을 조금 낮춰 아래 안내 글이 잘리지 않게(폭 390)
      list.innerHTML = R.map((x, i) => `<button class="by1-r" data-i="${i}"><span class="a"><b>${x.nm}</b><i>${x.no}</i></span><span class="b"><b>${x.nm2}</b><i>${x.no2}</i></span><em>·</em></button>`).join("");
      list.querySelectorAll(".by1-r").forEach((b) => (b.onclick = () => {
        if (phase !== "play" && phase !== "tut") return; const x = R[+b.dataset.i]; x.on = !x.on; b.classList.toggle("on", x.on); b.querySelector("em").textContent = x.on ? "!" : "·"; if (x.on) SFX.tok(); else SFX.tick();
      }));
    };
    const reveal = () => {
      let hit = 0, fa = 0, miss = 0;
      list.querySelectorAll(".by1-r").forEach((b) => {
        const x = R[+b.dataset.i], em = b.querySelector("em"); b.disabled = true; b.classList.remove("on");
        if (x.bad) { b.querySelector(".b b").innerHTML = mark(x.nm, x.nm2); b.querySelector(".b i").innerHTML = mark(x.no, x.no2); }
        if (x.bad && x.on) { hit++; b.classList.add("hit"); em.textContent = "✓"; } else if (x.bad) { miss++; b.classList.add("miss"); em.textContent = "!"; } else if (x.on) { fa++; b.classList.add("fa"); em.textContent = "✕"; }
      });
      return { hit, fa, miss, bad: hit + miss };
    };
    // ── 리허설: 세 줄, 틀린 줄 하나. 시계는 안 간다 ──
    const startTut = () => {
      phase = "tut"; R = deal(3, 1); draw(); go.disabled = false; rd.textContent = "리허설"; ck.textContent = "밤 10:50"; F.sc.textContent = "연습"; F.bar.style.transform = "scaleX(1)";
      say(`<span class="by1-tut">리허설</span>왼쪽과 오른쪽을 한 줄씩 맞춰 봐요. <b>다른 줄 하나</b>를 톡 누르고 <b>주문 넣기</b>.`);
      if (auto) later(() => submit(false), 500);
    };
    const next = () => {
      ri++; if (ri >= N) return end();
      R = deal(ROWS[ri], BADS[ri]); draw(); phase = "play"; go.disabled = false;
      rd.textContent = `${ri + 1}/${N}번째 묶음 · ${ROWS[ri]}건`; ck.textContent = `밤 11:${String(10 + ri * 15).padStart(2, "0")}`; F.sc.textContent = `${ri + 1}/${N}`;
      say(`마감 전에 <b>다른 줄</b>을 모두 찾아요. 이번 묶음에는 몇 줄이 숨어 있는지 몰라요.`);
      SFX.whoosh(); sec = (9 + ROWS[ri] * 1.7) * ezf; tm = timer(sec, F.bar, () => submit(true));
      if (auto) later(() => { if (auto === "good") R.forEach((x) => (x.on = x.bad)); else if (auto === "fa") R.forEach((x) => (x.on = true)); submit(false); }, 700);
    };
    const submit = (timeUp) => {
      if (phase === "tut") {
        phase = "lock"; go.disabled = true; const v = reveal(), ok = v.hit === v.bad && !v.fa;
        if (ok) { F.hit(tip, 1, "#5fe0a0"); say(`<span class="by1-tut">리허설</span>맞아요. 이런 줄이 통관에서 멈춰요. 이제 진짜 마감이에요.`, "ok"); } else { tone(400, 0.12, "triangle", 0.1, -120); say(`<span class="by1-tut">리허설</span>빨갛게 표시된 글자가 다른 곳이에요. ${v.fa ? "멀쩡한 줄을 짚으면 감점이에요. " : ""}이제 진짜 마감이에요.`, "ng"); }
        return later(() => { tut = false; next(); }, auto ? 300 : 1900);
      }
      if (phase !== "play") return; phase = "lock"; go.disabled = true;
      const left = tm ? tm.left() : 0; if (tm) tm.stop();
      if (!host.isConnected) return; // 그만하기로 창이 닫힌 뒤
      const v = reveal(), spd = clamp(left / sec, 0, 1), q = clamp(v.hit / Math.max(1, v.bad) - 0.34 * v.fa, 0, 1), val = q * (0.85 + 0.15 * spd);
      res.push({ ...v, spd, q, val });
      if (v.hit === v.bad && !v.fa) { F.hit(tip, v.bad, "#ffd166"); SFX.stamp(); if (!RM()) F.burst(go, "#ffd166", 12); say(`${timeUp ? "(마감) " : ""}<b>${v.bad}줄 모두 찾았어요.</b> 고객에게 번호를 다시 받았다. 이 묶음은 그대로 통과한다.`, "ok"); }
      else if (v.hit && !v.miss) { tone(400, 0.12, "triangle", 0.1, -120); vib(15); say(`${timeUp ? "(마감) " : ""}틀린 줄은 다 찾았어요. 멀쩡한 줄 <b>${v.fa}건</b>은 고객에게 괜히 다시 물었다.`, "ng"); }
      else { F.miss(tip); say(`${timeUp ? "(마감) " : ""}<b>${v.miss}줄</b>을 놓쳤어요. 그 주문은 통관에서 선다.${v.fa ? ` 멀쩡한 줄 ${v.fa}건도 짚었어요.` : ""}`, "ng"); }
      later(next, auto ? 300 : 2300);
    };
    go.onclick = () => submit(false);
    const end = () => {
      phase = "end"; go.disabled = true; F.bar.style.transform = "scaleX(0)";
      const sum = (f) => res.reduce((a, r) => a + f(r), 0), avg = (f) => sum(f) / Math.max(1, res.length);
      const hit = sum((r) => r.hit), bad = sum((r) => r.bad), fa = sum((r) => r.fa), score = clamp(avg((r) => r.val), 0, 1);
      setTimeout(() => { over = true; if (!host.isConnected) return; finish(score, `틀린 줄 <b>${hit}/${bad}</b> 찾음 · 헛짚음 ${fa}건`, "", [["틀린 줄 찾기", hit / Math.max(1, bad)], ["헛짚지 않기", clamp(1 - fa / Math.max(1, bad), 0, 1)], ["마감 여유", avg((r) => r.spd)]]); }, 500);
    };
    later(() => (tut ? startTut() : next()), 350);
  },
};
