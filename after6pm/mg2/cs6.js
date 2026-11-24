// 미니게임(cs6) "연봉 협상술": 경력 이직 포지션 전용(11-24). 포지션에 '경력 이직'이 있으면 나온다(mg_pick.js).
// 이직 의뢰인의 패(좋은 패 +5%, 나쁜 패 −5%, 상관없는 패 0)를 읽고, 회사가 받아 줄 가장 높은 연봉을 슬라이더로 맞춰 부른다.
// 조작: 슬라이더 끌기(− ＋ 로 1%씩) → 제안. 낮게 부르면 손해, 높게 부르면 협상이 깨진다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, timer, SFX, tone, vib, rint, pick, shuffle, clamp, RM } from "../mg.js";

const BASE = 10, STEP = 5, MAXP = 30;
const WHO = [["7년 차 마케터", 5000], ["5년 차 개발자", 6000], ["9년 차 영업 과장", 8000], ["4년 차 디자이너", 4000], ["6년 차 회계 담당", 5000], ["8년 차 생산관리", 6000], ["10년 차 구매 차장", 8000]];
const CARDS = {
  g: ["다른 회사 최종 합격도 받아 뒀다", "회사가 급하게 뽑는 자리다", "이 일을 해 본 사람이 시장에 드물다", "지난해 성과가 숫자로 증명된다", "면접관이 먼저 입사일을 물었다", "지금 회사에서 올해 승진했다", "헤드헌터가 먼저 연락해 온 자리다"],
  b: ["직무를 바꾸는 이직이다", "쉬었던 공백이 여덟 달 있다", "이 자리에 지원자가 많이 몰렸다", "지금 회사에 다닌 지 1년이 안 됐다", "뽑는 회사가 올해 적자를 냈다", "이미 퇴사하고 구직 중이다", "경력 증빙 서류가 덜 준비됐다"],
  z: ["면접 날 비가 많이 왔다", "면접관이 커피를 권했다", "회사 로비에 화분이 많다", "면접이 금요일 오후였다", "회사 건물이 역에서 5분이다", "면접관 넥타이가 파란색이었다"],
};
const CLIENT = ["c037", "c045", "c077", "c039", "c033"], HR = ["c088", "c096", "c004", "c036"];
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const exPos = (ex) => { const i = EXI[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };
const man = (v) => { v = Math.round(v / 10) * 10; const e = Math.floor(v / 10000), m = v % 10000; return (e ? e + "억" + (m ? " " : "") : "") + (m || !e ? m.toLocaleString("ko-KR") + "만" : "") + " 원"; }; // 만원 → "9,200만 원", "1억 400만 원"

const CSS = `
.a6c1{position:absolute;inset:0;display:flex;flex-direction:column;gap:7px;padding:8px;background:radial-gradient(ellipse at 50% 0%,#2a2540,#12152a 70%);overflow:auto}
.a6c1-cl{flex:0 0 auto;display:flex;align-items:center;gap:9px;background:linear-gradient(#fffefb,#f2efe6);color:#1d1d22;border-radius:12px;padding:6px 9px;box-shadow:0 4px 14px #0009}
.a6c1-av{flex:0 0 auto;width:46px;height:60px;border-radius:9px;background:#3a3048 0 0/300% 346.15% no-repeat;box-shadow:0 2px 6px #0006}
.a6c1-cl div.w{flex:1;min-width:0;line-height:1.3}
.a6c1-cl small{display:block;font-size:11px;color:#7a7f99;font-weight:700}
.a6c1-cl b{display:block;font-size:14.5px}
.a6c1-cl span{font-size:12.5px;font-weight:800;color:#3b5bdb}
.a6c1-cl em{flex:0 0 auto;font-style:normal;font-size:11px;font-weight:900;line-height:1.35;color:#2a1a00;background:linear-gradient(#ffe08a,#f0b43a);border-radius:8px;padding:4px 8px;text-align:center}
.a6c1-cd{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.a6c1-cd div{position:relative;background:linear-gradient(#fffdf7,#f1ecdf);color:#2a2620;border-radius:10px;padding:7px 9px;font-size:12.5px;font-weight:700;line-height:1.38;min-height:52px;box-shadow:0 3px 0 #bdb39c,0 4px 10px #0007;animation:a6c1in .3s ease-out both}
.a6c1-cd div:last-child:nth-child(odd){grid-column:1/-1;min-height:0}
@keyframes a6c1in{from{transform:translateY(12px) rotate(-2deg);opacity:0}}
.a6c1-cd div i{position:absolute;right:4px;top:-7px;font-style:normal;font-weight:900;font-size:11.5px;border-radius:6px;padding:1px 6px;color:#fff;box-shadow:0 2px 4px #0006;animation:a6c1in .2s ease-out both}
.a6c1-cd div.g{background:linear-gradient(#e6fff0,#c9f5dc)}.a6c1-cd div.g i{background:#1f9a5c}
.a6c1-cd div.b{background:linear-gradient(#ffe9ec,#ffd0d6)}.a6c1-cd div.b i{background:#e0312f}
.a6c1-cd div.z{opacity:.7}.a6c1-cd div.z i{background:#6a7090}
.a6c1-of{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;gap:6px}
.a6c1-num{display:flex;align-items:baseline;gap:8px;justify-content:center;color:#fff}
.a6c1-num small{font-size:11.5px;color:#c9cde6;font-weight:800}
.a6c1-num b{font-size:26px;font-weight:900;color:#ffe066;text-shadow:0 2px 0 #0009}
.a6c1-num i{font-style:normal;font-size:14px;font-weight:900;color:#8ff0bf}
.a6c1-sl{display:flex;align-items:center;gap:6px}
.a6c1-sl button{flex:0 0 auto;width:44px;height:44px;border-radius:12px;background:#20243d!important;border:1px solid #4a5280!important;color:#fff!important;font-size:22px;font-weight:900}
.a6c1-sl button:active{transform:translateY(2px)}
.a6c1-sl input{flex:1;min-width:0;height:44px;accent-color:#f5c04e;touch-action:pan-y}
.a6c1-sl input:disabled,.a6c1-sl button:disabled{opacity:.5}
.a6c1-hr{display:flex;align-items:center;gap:8px;min-height:64px;background:#0d1020;border:1px solid #2c3150;border-radius:12px;padding:6px 9px;font-size:12.5px;color:#c9cde6;line-height:1.4}
.a6c1-hr .p{flex:0 0 auto;width:40px;height:52px;border-radius:8px;background:#3a3048 0 0/300% 346.15% no-repeat}
.a6c1-hr b{color:#fff;font-size:13.5px;display:block}
.a6c1-hr u{text-decoration:none;color:#ffe7a0;font-weight:800}
.a6c1-hr.ok{border-color:#3cbf7a}.a6c1-hr.ng{border-color:#ff5a6a}.a6c1-hr.so{border-color:#e0a030}
@media (max-height:680px){.a6c1-cd div{font-size:12px;min-height:44px;padding:5px 8px}.a6c1-num b{font-size:22px}}
`;

// 한 판의 패: n장. 좋은 패 g, 나쁜 패 b, 나머지는 상관없는 패. 상한은 +5% ~ +25%
function deal(n) {
  let g = 1, b = 0;
  for (let k = 0; k < 40; k++) { g = 1 + rint(n); b = rint(n - g + 1); if (g + b <= n && g - b >= -1 && g - b <= 3 && (n < 4 || n - g - b >= 1)) break; g = 1; b = 0; }
  const z = n - g - b, cs = [...shuffle(CARDS.g).slice(0, g).map((t) => ({ t, k: "g" })), ...shuffle(CARDS.b).slice(0, b).map((t) => ({ t, k: "b" })), ...shuffle(CARDS.z).slice(0, z).map((t) => ({ t, k: "z" }))];
  return { cards: shuffle(cs), cap: BASE + STEP * (g - b) };
}

export const GAME = {
  key: "cs6", base: "cs", n: "연봉 협상술", desc: "이직 의뢰인의 패를 읽고, 회사가 받아 줄 가장 높은 연봉을 불러요",
  how: ["이직 의뢰인의 <b>현 연봉</b>과 <b>패 카드</b>가 나와요. 이직 인상은 기본 <b>+10%</b>예요.", "<b>좋은 패</b>(다른 합격·급한 채용·드문 경력·숫자 성과)는 하나에 <b>+5%</b>, <b>나쁜 패</b>(직무 전환·공백·몰린 지원자)는 <b>−5%</b>. 상관없는 패는 0이에요.", "슬라이더를 끌어 <b>회사가 받아 줄 상한</b>에 딱 맞춰 제안! 낮게 부르면 손해, 높게 부르면 협상이 깨져요. 의뢰인은 3명."],
  steps: () => [["🃏", "패 읽기"], ["🎚️", "상한에 맞추기"], ["🤝", "제안!"]],
  css: CSS,
  run(host, ez, finish) {
    const dbg = typeof window !== "undefined" && window.__mgdbg ? window.__mgdbg : null, auto = dbg && dbg.cs6;
    const N = 3, ezf = 1 + (ez - 1) * 0.5, who = shuffle(WHO).slice(0, N), hrK = pick(HR);
    const F = frame(host, "cs6", "연봉 협상술", "", "", `<button class="mg-btn gold" data-go disabled>이 금액으로 제안</button>`);
    F.stage.insertAdjacentHTML("beforeend", `<div class="a6c1"><div class="a6c1-cl"><div class="a6c1-av"></div><div class="w"><small></small><b></b><span></span></div><em>기본 +${BASE}%<br>좋은 패 +${STEP} · 나쁜 패 −${STEP}</em></div>
      <div class="a6c1-cd"></div><div class="a6c1-of"><div class="a6c1-num"><small>부를 연봉</small><b></b><i></i></div>
      <div class="a6c1-sl"><button data-d="-1" aria-label="1% 내리기">−</button><input type="range" min="0" max="${MAXP}" step="1" value="0" aria-label="인상률"><button data-d="1" aria-label="1% 올리기">＋</button></div>
      <div class="a6c1-hr"><div class="p" style="background-image:url(img/body/${hrK}.webp)"></div><div data-hr></div></div></div></div>`);
    const IN = F.stage.querySelector(".a6c1"), av = IN.querySelector(".a6c1-av"), cl = IN.querySelector(".a6c1-cl .w"), cd = IN.querySelector(".a6c1-cd"), numB = IN.querySelector(".a6c1-num b"), numI = IN.querySelector(".a6c1-num i");
    const sl = IN.querySelector("input"), hrBox = IN.querySelector(".a6c1-hr"), hrP = hrBox.querySelector(".p"), hrT = hrBox.querySelector("[data-hr]"), go = F.foot.querySelector("[data-go]"), steps = [...IN.querySelectorAll("[data-d]")];
    let ri = -1, R = null, phase = "wait", over = false, tm = null, sec = 1; const res = [];
    const later = (fn, ms) => setTimeout(() => { if (!over && host.isConnected) fn(); }, ms);
    const lock = (v) => { sl.disabled = v; go.disabled = v; steps.forEach((b) => (b.disabled = v)); };
    const show = () => { const p = +sl.value; numB.textContent = man(R.cur * (1 + p / 100)); numI.textContent = `+${p}%`; };
    sl.addEventListener("input", () => { if (phase === "play") { show(); SFX.tick(); } });
    steps.forEach((b) => (b.onclick = () => { if (phase !== "play") return; sl.value = clamp(+sl.value + +b.dataset.d, 0, MAXP); show(); SFX.tok(); }));
    const next = () => {
      ri++; if (ri >= N) return end();
      const n = 3 + ri, d = deal(n); R = { who: who[ri][0], cur: who[ri][1], ...d }; phase = "deal"; lock(true);
      av.style.backgroundImage = `url(img/body/${CLIENT[(ri + rint(CLIENT.length)) % CLIENT.length]}.webp)`;
      cl.innerHTML = `<small>이직 의뢰인 ${ri + 1}/${N}</small><b>${R.who}</b><span>현 연봉 ${man(R.cur)}</span>`;
      cd.innerHTML = R.cards.map((c, k) => `<div style="animation-delay:${k * 0.32}s">${c.t}</div>`).join("");
      sl.value = 0; show(); hrBox.className = "a6c1-hr"; hrP.style.backgroundPosition = exPos("neutral"); hrT.innerHTML = `<b>인사 담당자</b>희망 연봉을 말씀해 주시죠.`;
      F.sc.textContent = `${ri + 1}/${N}명`; F.bar.style.transform = "scaleX(1)"; SFX.whoosh();
      R.cards.forEach((c, k) => later(() => tone(620 + k * 50, 0.04, "triangle", 0.06), k * 320));
      later(() => {
        phase = "play"; lock(false); sec = (13 + n * 1.6) * ezf; tm = timer(sec, F.bar, () => submit(true));
        if (auto) later(() => { sl.value = clamp(R.cap + (auto === "good" ? 0 : auto === "low" ? -6 : 7), 0, MAXP); show(); submit(false); }, 900);
      }, n * 320 + 250);
    };
    const submit = (timeUp) => {
      if (phase !== "play") return; phase = "lock"; lock(true);
      const left = tm ? tm.left() : 0; if (tm) tm.stop();
      if (!host.isConnected) return; // 그만하기로 창이 닫힌 뒤
      const p = +sl.value, d = p - R.cap, spd = clamp(left / sec, 0, 1);
      let v, cls, ex, say, note;
      if (d === 0) { v = 1; cls = "ok"; ex = "surprised"; say = "…좋습니다. 그 조건으로 하시죠."; note = "회사 상한에 딱! 한 푼도 안 남겼어요"; }
      else if (d < 0) { v = Math.max(0.3, 0.9 - (-d - 1) * 0.1); cls = d >= -2 ? "ok" : "so"; ex = "smile"; say = "네! 바로 계약서 보내겠습니다."; note = `${-d}%p 더 받을 수 있었어요`; }
      else if (d <= 2) { v = 0.6; cls = "so"; ex = "neutral"; say = "조금만 낮추면 가능하겠습니다."; note = `상한보다 ${d}%p 높았어요. 깎아서 겨우 합의`; }
      else if (d <= 5) { v = 0.3; cls = "ng"; ex = "angry"; say = "그 금액은 어렵습니다…"; note = `상한보다 ${d}%p 높았어요. 분위기가 식었어요`; }
      else { v = 0.05; cls = "ng"; ex = "angry"; say = "이번 채용은 없던 일로 하시죠."; note = `상한보다 ${d}%p 높았어요. 협상 결렬`; }
      const val = v * (0.88 + 0.12 * spd);
      res.push({ v, val, d, spd, who: R.who, cap: R.cap, p, cur: R.cur });
      [...cd.children].forEach((e, k) => { const c = R.cards[k]; e.classList.add(c.k); e.style.animationDelay = "0s"; e.insertAdjacentHTML("beforeend", `<i style="animation-delay:${k * 0.1}s">${c.k === "g" ? "+" + STEP + "%" : c.k === "b" ? "−" + STEP + "%" : "0"}</i>`); });
      hrBox.className = "a6c1-hr " + cls; hrP.style.backgroundPosition = exPos(ex);
      hrT.innerHTML = `<b>${timeUp ? "(시간 초과) " : ""}"${say}"</b>회사 상한 <u>+${R.cap}% · ${man(R.cur * (1 + R.cap / 100))}</u> · ${note}`;
      if (v >= 0.8) { F.hit(hrBox, v === 1 ? 2 : 1, v === 1 ? "#ffd166" : "#5fe0a0"); if (v === 1) { SFX.stamp(); if (!RM()) F.burst(numB, "#ffd166", 14); } }
      else if (v >= 0.6) { tone(400, 0.12, "triangle", 0.1, -120); vib(15); }
      else F.miss(hrBox);
      later(next, 2500);
    };
    go.onclick = () => submit(false);
    const end = () => {
      phase = "end"; lock(true); F.bar.style.transform = "scaleX(0)";
      const avg = (f) => res.reduce((a, r) => a + f(r), 0) / Math.max(1, res.length);
      const score = clamp(avg((r) => r.val), 0, 1), exact = res.filter((r) => r.d === 0).length, deals = res.filter((r) => r.d <= 2).length;
      const extra = res.filter((r) => r.d !== 0).map((r) => `<div>${r.who}<br><s>+${r.p}% 제안</s> <em>회사 상한 +${r.cap}%</em><small>${r.d > 0 ? "나쁜 패를 덜 뺐거나 상관없는 패를 좋게 봤어요" : "좋은 패를 덜 셌어요. 낮게 부르면 의뢰인 손해예요"}</small></div>`).join("");
      setTimeout(() => { over = true; if (!host.isConnected) return; finish(score, `계약 성사 <b>${deals}/${N}</b>명 · 상한에 딱 ${exact}번`, extra, [["딱 맞춘 제안", exact / N], ["패 읽기", avg((r) => r.v)], ["결정 속도", avg((r) => r.spd)]]); }, 500);
    };
    later(next, 350);
  },
};
