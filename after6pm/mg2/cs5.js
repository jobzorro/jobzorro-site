// 미니게임(cs5) "1분 답변 재단술": 면접 코칭 2탄(11-24). 포지션이 '면접 코칭'이면 두 번째로 나온다(mg_pick.js).
// 멘티가 답하는 동안 버튼을 꾹 누르고 있다가, 답이 딱 좋은 길이(결론 → 근거 → 회사 연결까지)일 때 손을 떼서 끊어 준다.
// 조작: 꾹 누르기 → 떼기. 일찍 떼면 근거가 빠지고, 늦게 떼면 군더더기가 붙는다. 뒤 문항은 시계가 가려지고 면접관이 포커페이스.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, vib, pick, shuffle, clamp, RM } from "../mg.js";

// 문항: q 질문, lo~hi 딱 좋은 길이(초), l [결론, 근거, 연결], x [군더더기, 군더더기]
const QS = [
  { q: "1분 자기소개 해 보세요.", lo: 50, hi: 60, l: ["숫자로 문제를 찾는 지원자입니다.", "인턴 때 재고 표를 다시 짜 폐기율을 12% 줄였습니다.", "이 습관으로 영업 현장의 손실을 줄이겠습니다."], x: ["그리고 제 취미는 등산인데요…", "아, 초등학교 때 반장도 했습니다…"] },
  { q: "우리 회사에 왜 지원했나요?", lo: 40, hi: 50, l: ["꾸준히 크는 사업에서 오래 일하고 싶어서입니다.", "3년 내리 매출이 10% 넘게 큰 걸 확인했습니다.", "거래처 관리 경험으로 그 성장을 받치겠습니다."], x: ["사실 집에서도 가깝고요…", "복지도 좋다고 들었는데…"] },
  { q: "본인의 단점은 뭔가요?", lo: 30, hi: 40, l: ["일을 혼자 끌어안는 편입니다.", "그래서 주 1회 진행 표를 팀에 먼저 공유합니다.", "입사 후에도 막히면 하루 안에 알리겠습니다."], x: ["또 다른 단점도 있는데요…", "어릴 때부터 좀 그랬습니다…"] },
  { q: "마지막으로 하고 싶은 말은요?", lo: 15, hi: 20, l: ["오늘 말씀드린 정리 습관,", "준비하며 만든 가격 비교표와 함께", "첫 달부터 현장에서 쓰겠습니다."], x: ["그리고 아까 그 질문은 사실…", "한 가지만 더 말씀드리면…"] },
  { q: "그 경험, 별거 아닌 것 같은데요?", lo: 25, hi: 35, l: ["규모는 작았습니다.", "다만 원가표를 처음 만들어 흑자로 돌린 건 저였습니다.", "작은 일도 숫자로 끝내는 습관을 가져오겠습니다."], x: ["아니 그게 사실 꽤 힘들었고요…", "다른 팀원들은 안 했거든요…"] },
  { q: "입사 후 포부는요?", lo: 35, hi: 45, l: ["3년 안에 담당 거래처 매출을 키우겠습니다.", "인턴 때 거래처 20곳의 주문 주기를 정리해 봤습니다.", "그 방식으로 새 거래처를 빨리 안착시키겠습니다."], x: ["10년 뒤에는 임원도…", "나중엔 해외 대학원도 생각 중인데…"] },
  { q: "갈등을 푼 경험이 있나요?", lo: 45, hi: 55, l: ["의견이 갈리면 기준부터 맞춥니다.", "공모전 때 두 안을 설문 120명으로 비교해 하루 만에 합의했습니다.", "실무에서도 숫자로 기준을 먼저 맞추겠습니다."], x: ["그 팀원이 원래 좀 그랬는데…", "그때 얘기를 더 하자면…"] },
];
const ROLE = ["결론", "근거", "연결", "군더더기", "군더더기"];
const IVS = ["c088", "c096", "c004", "c036", "c061"]; // 면접관 그림(3x2 표정 시트)
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const exPos = (ex) => { const i = EXI[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };

const CSS = `
.a6i2{position:absolute;inset:0;display:flex;flex-direction:column;gap:6px;padding:8px;background:radial-gradient(ellipse at 50% 0%,#232a44,#12152a 70%)}
.a6i2-q{flex:0 0 auto;background:linear-gradient(#fffefb,#f2efe6);color:#1d1d22;border-radius:12px;padding:6px 10px;font-size:13.5px;font-weight:800;line-height:1.35;box-shadow:0 4px 14px #0009;display:flex;align-items:center;gap:8px}
.a6i2-q div{flex:1;min-width:0}.a6i2-q small{display:block;font-size:11px;color:#7a7f99;font-weight:700}
.a6i2-q em{flex:0 0 auto;font-style:normal;font-size:11.5px;font-weight:900;color:#0b2a1a;background:linear-gradient(#8ff0bf,#4fd294);border-radius:8px;padding:3px 8px;text-align:center;line-height:1.25}
.a6i2-sc{position:relative;flex:1 1 auto;min-height:0;border-radius:12px;overflow:hidden;background:#3a3026;box-shadow:0 6px 18px #000a,0 0 0 1px #ffffff1f}
.a6i2-bg{position:absolute;inset:-3%;background:url("img/bg/meeting.webp") 50% 36%/cover no-repeat;filter:blur(1.4px) brightness(.78)}
.a6i2-iv{position:absolute;right:3%;top:4%;height:52%;aspect-ratio:1/1.3;background-repeat:no-repeat;background-size:300% 346.15%;filter:drop-shadow(0 5px 9px #000a);transition:transform .2s;-webkit-mask-image:linear-gradient(#000 74%,transparent 99%);mask-image:linear-gradient(#000 74%,transparent 99%)}
.a6i2-iv.nod{animation:a6i2nod .32s ease-in-out 3}
@keyframes a6i2nod{50%{transform:translateY(5%)}}
.a6i2-iv.noimg{background:radial-gradient(circle at 50% 32%,#f1cfb4 0 22%,transparent 23%),linear-gradient(#3a4266,#1b2238);border-radius:40% 40% 0 0}
.a6i2-sw{position:absolute;left:4%;top:5%;background:#0d1020e6;color:#fff;border:1px solid #ffffff33;border-radius:12px;padding:5px 10px;font-weight:900;font-size:22px;line-height:1.1;min-width:86px;text-align:center}
.a6i2-sw small{display:block;font-size:10.5px;color:#9ea3c0;font-weight:700}
.a6i2-sw.hid b{color:#9ea3c0}
.a6i2-ln{position:absolute;left:4%;right:4%;bottom:4%;display:flex;flex-direction:column;gap:4px}
.a6i2-ln div{background:#fffffff2;color:#1d1d22;border-radius:10px;padding:5px 9px;font-size:12.5px;font-weight:700;line-height:1.35;box-shadow:0 3px 8px #0007;min-height:1.9em;animation:a6i2in .18s ease-out}
.a6i2-ln div b{display:inline-block;font-size:10.5px;font-weight:900;color:#fff;background:#3b5bdb;border-radius:5px;padding:0 6px;margin-right:5px}
.a6i2-ln div u{text-decoration:none;opacity:.32}
.a6i2-ln div.x{background:#ffe6eaf2}.a6i2-ln div.x b{background:#e0312f}
@keyframes a6i2in{from{transform:translateY(8px);opacity:0}}
.a6i2-st{position:absolute;left:36%;top:30%;transform:translate(-50%,-50%) rotate(-10deg);font-weight:900;font-size:clamp(24px,8vw,38px);color:#fff;text-shadow:0 3px 0 #000a,0 0 10px #000;white-space:nowrap;pointer-events:none;animation:a6i2st .35s cubic-bezier(.3,1.6,.5,1) both}
.a6i2-st.g{color:#ffe066}.a6i2-st.o{color:#8ff0bf}.a6i2-st.b{color:#ff8a96}
@keyframes a6i2st{from{transform:translate(-50%,-50%) scale(2.4) rotate(-30deg);opacity:0}}
.a6i2-ga{flex:0 0 auto;position:relative;height:26px;border-radius:9px;background:#0b0d18;box-shadow:inset 0 1px 3px #000c,0 0 0 1px #ffffff14;overflow:hidden}
.a6i2-ga .z{position:absolute;top:0;bottom:0;background:linear-gradient(#4fd29488,#2fa86a88);border-left:2px solid #8ff0bf;border-right:2px solid #8ff0bf}
.a6i2-ga .f{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(180deg,#ffffff55,transparent 55%),#f5c04e;border-right:3px solid #fff}
.a6i2-ga .c{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:repeating-linear-gradient(135deg,#232a44,#232a44 8px,#1b2238 8px,#1b2238 16px);color:#c9cde6;font-size:12px;font-weight:900}
.a6i2-ga.hid .c{display:flex}
.a6i2-ga span{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:10.5px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;pointer-events:none}
.mg-cs5 .mg-foot .a6i2-hd{background:linear-gradient(#6aa8ff,#3b5bdb)!important;color:#fff!important;border-color:#9cc4ff!important;font-size:16.5px;padding:15px 10px;box-shadow:0 4px 0 #1f347f,0 6px 14px #0008;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.mg-cs5 .mg-foot .a6i2-hd.dn{transform:translateY(3px);box-shadow:0 1px 0 #1f347f;background:linear-gradient(#ffd166,#f0a82a)!important;color:#2a1a00!important}
.mg-cs5 .mg-foot .a6i2-hd:disabled{opacity:.5}
@media (max-height:680px){.a6i2-ln div{font-size:12px;padding:4px 8px}.a6i2-q{font-size:12.5px}}
@media (prefers-reduced-motion:reduce){.a6i2-iv.nod{animation:none}}
`;

export const GAME = {
  key: "cs5", base: "cs", n: "1분 답변 재단술", desc: "멘티의 면접 답을 딱 좋은 길이에서 끊어 줘요",
  how: ["면접관이 질문하면 아래 버튼을 <b>꾹 누르고 있어요</b>. 누르는 동안 멘티가 <b>결론 → 근거 → 연결</b> 순서로 답해요.", "시계가 <b>초록 구간</b>(딱 좋은 길이)에 들어오면 <b>손을 떼요</b>. 흐린 글씨가 다 진해져 <b>연결</b> 문장이 끝난 바로 그때가 제일 좋아요.", "일찍 떼면 근거가 빠지고, 늦으면 <b>군더더기</b>가 붙어 면접관이 시계를 봐요. 뒤로 갈수록 시계가 가려져요. 질문은 5개."],
  steps: () => [["🎤", "꾹 눌러 답하기"], ["⏱️", "초록 구간에서"], ["✂️", "손 떼서 끊기"]],
  css: CSS,
  run(host, ez, finish) {
    const dbg = typeof window !== "undefined" && window.__mgdbg ? window.__mgdbg : null, auto = dbg && dbg.cs5;
    const N = 5, ezf = 1 + (ez - 1) * 0.8, qs = shuffle(QS).slice(0, N);
    const F = frame(host, "cs5", "1분 답변 재단술", "", "", `<button class="mg-btn a6i2-hd" data-hd disabled>🎤 꾹 눌러 답하기 · 떼면 끝</button>`);
    F.stage.insertAdjacentHTML("beforeend", `<div class="a6i2"><div class="a6i2-q"><div><small>모의면접 준비 중…</small>&nbsp;</div><em></em></div>
      <div class="a6i2-sc"><div class="a6i2-bg"></div><div class="a6i2-iv"></div><div class="a6i2-sw"><small>답변 시간</small><b>0초</b></div><div class="a6i2-ln"></div></div>
      <div class="a6i2-ga"><div class="z"></div><div class="f"></div><div class="c">시계 가림 · 감으로!</div></div></div>`);
    const IN = F.stage.querySelector(".a6i2"), qEl = IN.querySelector(".a6i2-q div"), goalEl = IN.querySelector(".a6i2-q em"), sc = IN.querySelector(".a6i2-sc"), iv = IN.querySelector(".a6i2-iv"), sw = IN.querySelector(".a6i2-sw"), swB = sw.querySelector("b"), lnEl = IN.querySelector(".a6i2-ln");
    const ga = IN.querySelector(".a6i2-ga"), zEl = ga.querySelector(".z"), fEl = ga.querySelector(".f"), hd = F.foot.querySelector("[data-hd]");
    { const im = new Image(); im.onload = () => { iv.style.backgroundImage = `url("${im.src}")`; iv.style.backgroundPosition = exPos("neutral"); }; im.onerror = () => iv.classList.add("noimg"); im.src = "img/body/" + pick(IVS) + ".webp"; }
    let ivEx = ""; const setEx = (ex) => { if (ex !== ivEx) { ivEx = ex; iv.style.backgroundPosition = exPos(ex); } };
    let qi = -1, Q = null, phase = "wait", t = 0, hold = false, over = false, raf = 0, last = performance.now(), idle = 0, resets = 0, lastSec = -1;
    const res = []; // 문항별 { v 점수, k: gold·ok·short·long·cut, hid }
    const later = (fn, ms) => setTimeout(() => { if (!over && host.isConnected) fn(); }, ms);
    // 이번 문항 셈: hi2 = 실력만큼 넓힌 끝, max = 면접관이 말을 끊는 때, v = 1초에 흐르는 답변 초, seg = 문장별 [시작, 끝]
    const setup = () => {
      const hi2 = Q.lo + (Q.hi - Q.lo) * ezf, max = hi2 * 1.45, toLo = [4.2, 3.9, 3.5, 3.2, 3.0][qi] || 3;
      Q.hi2 = hi2; Q.max = max; Q.v = Q.lo / toLo; Q.hid = qi >= 2; Q.poker = qi >= 3;
      Q.seg = [[0, Q.lo * 0.3], [Q.lo * 0.36, Q.lo * 0.66], [Q.lo * 0.72, Q.lo], [hi2, hi2 + (max - hi2) * 0.5], [hi2 + (max - hi2) * 0.55, max]];
      Q.txt = [...Q.l, ...Q.x];
    };
    const paint = () => {
      const p = clamp(t / Q.max, 0, 1), sec = Math.floor(t), cover = Q.hid && t > Q.lo * 0.35 && phase === "talk";
      fEl.style.width = p * 100 + "%"; ga.classList.toggle("hid", cover); sw.classList.toggle("hid", cover); swB.textContent = cover ? "??초" : sec + "초";
      // 문장: 시간만큼 글자가 진해진다(줄은 한 번만 만들고 글자만 바꾼다. 최근 3줄만 보인다)
      Q.seg.forEach(([a, b], k) => {
        if (t <= a) return;
        let e = lnEl.children[k];
        if (!e) { e = document.createElement("div"); if (k >= 3) e.className = "x"; e.innerHTML = `<b>${ROLE[k]}</b><span></span><u></u>`; e._n = -1; lnEl.appendChild(e); }
        const n = Math.ceil(Q.txt[k].length * clamp((t - a) / (b - a), 0, 1));
        if (e._n !== n) { e._n = n; e.children[1].textContent = Q.txt[k].slice(0, n); e.children[2].textContent = Q.txt[k].slice(n); }
      });
      for (let i = 0, c = lnEl.children.length; i < c; i++) lnEl.children[i].style.display = i < c - 3 ? "none" : "";
      if (phase === "talk" && hold) { if (sec !== lastSec) { lastSec = sec; if (sec % 5 === 0) tone(700, 0.02, "square", 0.03); } if (!Q.poker) setEx(t > Q.hi2 ? "angry" : t >= Q.lo ? "smile" : "neutral"); else if (t > Q.hi2 * 1.12) setEx("angry"); }
    };
    const next = () => {
      qi++; if (qi >= N) return end();
      Q = qs[qi]; setup(); t = 0; hold = false; phase = "ask"; idle = 0; resets = 0; lastSec = -1; lnEl.innerHTML = ""; setEx("neutral"); iv.classList.remove("nod");
      sc.querySelectorAll(".a6i2-st").forEach((e) => e.remove());
      qEl.innerHTML = `<small>면접관 질문 ${qi + 1}/${N}${Q.hid ? " · 시계 가림" : ""}${Q.poker ? " · 포커페이스" : ""}</small>${Q.q}`;
      goalEl.innerHTML = `딱 좋은 길이<br>${Q.lo}~${Math.round(Q.hi2)}초`;
      zEl.style.left = Q.lo / Q.max * 100 + "%"; zEl.style.width = (Q.hi2 - Q.lo) / Q.max * 100 + "%";
      ga.classList.remove("hid"); sw.classList.remove("hid"); fEl.style.width = "0%"; swB.textContent = "0초";
      F.sc.textContent = `${qi + 1}/${N}문항`; F.bar.style.transform = `scaleX(${1 - qi / N})`; SFX.whoosh();
      later(() => { phase = "talk"; hd.disabled = false; if (auto) later(() => press(), 300); }, 900);
    };
    const judge = (cut) => {
      phase = "lock"; hold = false; hd.classList.remove("dn"); hd.disabled = true;
      let v, k, word, cls;
      if (cut) { v = 0; k = "cut"; word = t > 0 ? "면접관이 말을 끊었어요" : "답을 못 했어요"; cls = "b"; }
      else if (t < Q.lo) { const r = t / Q.lo; if (r >= 0.88) { v = 0.5; k = "short"; word = "살짝 짧아요"; cls = "o"; } else { v = t > Q.seg[1][1] ? 0.25 : 0.1; k = "short"; word = t > Q.seg[1][1] ? "연결이 빠졌어요" : "근거가 빠졌어요"; cls = "b"; } }
      else if (t <= Q.hi2) { if (t <= Q.lo + (Q.hi2 - Q.lo) * 0.55) { v = 1; k = "gold"; word = "딱 끊었어요!"; cls = "g"; } else { v = 0.85; k = "ok"; word = "좋아요"; cls = "o"; } }
      else { const r = (t - Q.hi2) / Q.hi2; if (r <= 0.12) { v = 0.45; k = "long"; word = "살짝 길어요"; cls = "o"; } else { v = 0.12; k = "long"; word = "군더더기가 붙었어요"; cls = "b"; } }
      res.push({ v, k, hid: Q.hid, q: Q.q, t: Math.round(t), lo: Q.lo, hi: Math.round(Q.hi2) });
      paint(); ga.classList.remove("hid"); sw.classList.remove("hid"); swB.textContent = Math.floor(t) + "초";
      const st = document.createElement("div"); st.className = "a6i2-st " + cls; st.textContent = word; sc.appendChild(st);
      if (v >= 0.85) { setEx("smile"); iv.classList.add("nod"); F.hit(iv, v === 1 ? 2 : 1, v === 1 ? "#ffd166" : "#5fe0a0"); if (v === 1) SFX.snap(); }
      else if (v >= 0.45) { setEx("neutral"); tone(400, 0.12, "triangle", 0.1, -120); vib(15); }
      else { setEx(k === "short" ? "surprised" : "angry"); F.miss(iv); }
      later(next, 1600);
    };
    const press = () => {
      if (over || phase !== "talk" || hold) return;
      hold = true; idle = 0; hd.classList.add("dn"); SFX.tok();
      if (auto) { const want = auto === "good" ? Q.lo + (Q.hi2 - Q.lo) * 0.25 : auto === "long" ? Q.hi2 * 1.3 : Q.lo * 0.5; later(function chk() { if (phase !== "talk" || !hold) return; if (t >= want) release(); else later(chk, 30); }, 30); }
    };
    const release = () => {
      if (!hold || phase !== "talk") return;
      hold = false; hd.classList.remove("dn");
      if (t < Q.lo * 0.12 && resets < 2) { resets++; t = 0; lnEl.innerHTML = ""; F.msg("꾹 누르고 있어요"); return; } // 잘못 스친 것은 봐준다
      judge(false);
    };
    hd.addEventListener("pointerdown", (e) => { if (e.cancelable) e.preventDefault(); try { hd.setPointerCapture(e.pointerId); } catch (er) {} press(); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) hd.addEventListener(ev, release);
    hd.addEventListener("contextmenu", (e) => e.preventDefault());
    const onBlur = () => release(); addEventListener("blur", onBlur);

    const loop = (now) => {
      if (over || !host.isConnected) { removeEventListener("blur", onBlur); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (phase === "talk") {
        if (hold) { t += dt * Q.v; if (t >= Q.max) { t = Q.max; paint(); judge(true); } else paint(); }
        else { idle += dt; if (idle > 3 && idle - dt <= 3) F.msg("버튼을 꾹 눌러요"); if (idle > 8) { t = 0; judge(true); } }
      }
      raf = requestAnimationFrame(loop);
    };
    const end = () => {
      phase = "end"; hd.disabled = true; F.bar.style.transform = "scaleX(0)";
      const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
      const score = clamp(avg(res.map((r) => r.v)), 0, 1), gold = res.filter((r) => r.k === "gold").length, okN = res.filter((r) => r.v >= 0.85).length, hidR = res.filter((r) => r.hid);
      qEl.innerHTML = `<small>모의면접 끝</small>딱 좋은 길이 ${okN}/${N}문항`; goalEl.textContent = score >= 0.6 ? "합격 예감" : "연습 더";
      setEx(score >= 0.6 ? "smile" : "neutral"); if (score >= 0.6 && !RM()) F.burst(iv, "#ffd166", 14);
      const extra = res.filter((r) => r.v < 0.85).slice(0, 3).map((r) => `<div>${r.q}<br><s>${r.t}초에 끊음</s> <em>딱 좋은 길이 ${r.lo}~${r.hi}초</em><small>${r.k === "cut" ? "면접관이 끊기 전에 먼저 끊어 줘요" : r.k === "short" ? "결론 → 근거 → 연결까지는 말하게 둬요" : "연결 문장이 끝나면 바로 끊어요"}</small></div>`).join("");
      setTimeout(() => { over = true; cancelAnimationFrame(raf); removeEventListener("blur", onBlur); if (!host.isConnected) return; finish(score, `딱 좋은 길이 <b>${okN}/${N}</b>문항 · 딱 끊기 ${gold}번`, extra, [["딱 끊기", gold / N], ["적정 길이", okN / N], ["감으로 끊기", avg(hidR.map((r) => r.v))]]); }, 1100);
    };
    raf = requestAnimationFrame(loop);
    later(next, 350);
  },
};
