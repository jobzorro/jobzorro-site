// 미니게임(cs4) "면접 버릇 교정술": 면접 코칭 1탄(11-24). 포지션이 '면접 코칭'이면 첫 번째로 나온다(mg_pick.js).
// 멘티가 모의면접 답을 한 마디씩 한다. 나쁜 버릇(군말·남 탓·숫자 없는 말·외운 티·딴소리·말끝 흐리기)이 나오는 순간 호루라기를 분다.
// 조작: 타이밍 맞춰 톡 한 번(호루라기 버튼 또는 말풍선). 멀쩡한 말에 불면 감점, 버릇을 그냥 보내면 놓침.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, vib, rnd, pick, shuffle, clamp, RM } from "../mg.js";

const HABIT = {
  um: { tag: "군말", tip: "어… 그… 는 빼고 바로 본론" },
  blame: { tag: "남 탓", tip: "남 이야기 말고 내가 한 일" },
  vague: { tag: "숫자 없는 말", tip: "얼마나? 사실과 숫자로" },
  canned: { tag: "외운 티", tip: "어디서 본 말 말고 내 말로" },
  off: { tag: "딴소리", tip: "질문에 닿는 말만" },
  fade: { tag: "말끝 흐리기", tip: "끝까지 또렷하게" },
};
// 문항: q 질문, f [[말] 또는 [말, 버릇, 고친 말]…]. 첫 마디는 늘 멀쩡한 말
const QS = [
  { q: "1분 자기소개 해 보세요.", f: [
    ["숫자로 문제를 찾는 지원자입니다."],
    ["어… 그러니까 음… 뭐랄까요…", "um", "(군말 없이 바로 다음 말로)"],
    ["인턴 때 재고 표를 다시 짜서 폐기율을 12% 줄였습니다."],
    ["참, 저는 주말마다 등산을 다닙니다.", "off", "직무와 닿는 경험만 말해요"],
    ["그때 현장 숫자부터 보는 습관이 생겼습니다."],
    ["끊임없이 도전하는 열정적인 인재입니다.", "canned", "제 강점은 숫자로 확인하는 습관입니다."],
    ["이 습관으로 영업 현장의 손실을 줄이겠습니다."]] },
  { q: "우리 회사에 왜 지원했나요?", f: [
    ["꾸준히 크는 사업에서 오래 일하고 싶어 지원했습니다."],
    ["귀사의 비전에 깊이 공감하여 함께 성장하고자…", "canned", "최근 3년 성장세를 직접 확인했습니다."],
    ["매출이 3년 내리 10% 넘게 큰 걸 찾아봤습니다."],
    ["전 회사는 비전이 없어서 나왔고요.", "blame", "더 큰 시장에서 일하고 싶었습니다."],
    ["저는 거래처 20곳을 맡아 재주문을 늘려 봤습니다."],
    ["잘할 수 있을 것 같기도 하고… 아마도요.", "fade", "잘할 수 있습니다."],
    ["그 경험으로 새 거래처를 빨리 안착시키겠습니다."]] },
  { q: "팀에서 갈등을 겪은 적 있나요?", f: [
    ["의견이 갈리면 기준부터 맞추는 편입니다."],
    ["팀원 한 명이 워낙 무책임해서요.", "blame", "역할 나누기가 흐릿했던 게 원인이었습니다."],
    ["공모전 때 두 안을 설문 120명으로 비교했습니다."],
    ["대화를 많이 해서 잘 풀었습니다.", "vague", "회의 두 번, 하루 만에 합의했습니다."],
    ["그 안으로 본선까지 올라갔습니다."],
    ["그래서 그… 뭐였더라… 아무튼요.", "um", "(군말 없이 바로 다음 말로)"],
    ["입사 후에도 숫자로 기준부터 맞추겠습니다."]] },
  { q: "가장 크게 실패한 경험은요?", f: [
    ["준비 없이 덤볐다가 첫 장터 판매에서 적자를 냈습니다."],
    ["그날 날씨랑 자리가 안 좋았거든요.", "blame", "원가를 따져 보지 않은 제 잘못이었습니다."],
    ["원인은 원가 계산을 건너뛴 것이었습니다."],
    ["그 일로 정말 많은 걸 배웠습니다.", "vague", "그 뒤로 원가표부터 만듭니다."],
    ["원가표를 만들었고 두 번째엔 30만 원 흑자를 냈습니다."],
    ["지금은 뭐… 괜찮아진 것 같습니다, 아마.", "fade", "지금은 숫자부터 따져 보고 움직입니다."],
    ["일을 벌이기 전에 숫자부터 보는 사람이 됐습니다."]] },
  { q: "왜 이 직무를 골랐나요?", f: [
    ["숫자로 현장을 움직이는 일이 저와 맞습니다."],
    ["사실 다른 직무도 여러 군데 넣어 봤는데요.", "off", "이 직무를 고른 이유만 말해요"],
    ["현직자 세 분을 만나 하루 업무를 직접 들었습니다."],
    ["직무 역량을 바탕으로 시너지를 창출하겠습니다.", "canned", "보고서 숫자를 제가 책임지겠습니다."],
    ["필요하다는 엑셀 자격도 석 달 만에 땄습니다."],
    ["음… 그리고 또… 어… 뭐가 있더라…", "um", "(군말 없이 바로 다음 말로)"],
    ["첫해부터 실적 보고를 맡을 수 있게 준비했습니다."]] },
  { q: "마지막으로 하고 싶은 말 있나요?", f: [
    ["오늘 말씀드린 정리 습관, 첫 달부터 쓰겠습니다."],
    ["아, 그런데 여기 야근은 많은가요?", "off", "마지막 말은 내가 줄 것으로 끝내요"],
    ["준비하며 제품 15개 가격을 직접 비교해 봤습니다."],
    ["정말 열심히, 최선을 다하겠습니다.", "vague", "첫 석 달 안에 거래처 표를 완성하겠습니다."],
    ["그 표를 들고 첫 거래처 미팅부터 뛰겠습니다."],
    ["앞 지원자분들보다는 제가 낫습니다.", "blame", "남과 견주지 말고 내 강점만"],
    ["긴 시간 들어 주셔서 고맙습니다."]] },
];
// 멘티 그림(3x2 표정 시트: 무표정·웃음·슬픔 / 화남·수줍음·놀람). 면접관 독심술(cs2)과 같은 사람들
const MENTEE = ["c037", "c045", "c077", "c039", "c033"];
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const exPos = (ex) => { const i = EXI[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };

const CSS = `
.a6i1{position:absolute;inset:0;display:flex;flex-direction:column;gap:6px;padding:8px;background:radial-gradient(ellipse at 50% 0%,#232a44,#12152a 70%)}
.a6i1-q{flex:0 0 auto;background:linear-gradient(#fffefb,#f2efe6);color:#1d1d22;border-radius:12px;padding:6px 10px;font-size:13.5px;font-weight:800;line-height:1.35;box-shadow:0 4px 14px #0009}
.a6i1-q small{display:block;font-size:11px;color:#7a7f99;font-weight:700}
.a6i1-sc{position:relative;flex:1 1 auto;min-height:0;border-radius:12px;overflow:hidden;background:#3a3026;box-shadow:0 6px 18px #000a,0 0 0 1px #ffffff1f}
.a6i1-bg{position:absolute;inset:-3%;background:url("img/bg/meeting.webp") 50% 36%/cover no-repeat;filter:blur(1.4px) brightness(.78)}
.a6i1-me{position:absolute;left:50%;bottom:-8%;height:70%;aspect-ratio:1/1.3;transform:translateX(-50%);background-repeat:no-repeat;background-size:300% 346.15%;filter:drop-shadow(0 6px 10px #000a)}
.a6i1-me.talk{animation:a6i1talk .26s ease-in-out infinite alternate}
@keyframes a6i1talk{to{transform:translateX(-50%) translateY(-1.6%)}}
.a6i1-me.noimg{background:radial-gradient(circle at 50% 30%,#f1cfb4 0 22%,transparent 23%),linear-gradient(#28314e,#1b2238);border-radius:40% 40% 0 0}
.a6i1-bub{position:absolute;left:5%;right:5%;top:5%;background:#fff;color:#1d1d22;border-radius:14px;padding:9px 12px 14px;font-size:15px;font-weight:800;line-height:1.42;box-shadow:0 5px 16px #000a;opacity:0;transform:translateY(8px) scale(.94);transition:opacity .14s,transform .14s,background .15s;min-height:3.5em;cursor:pointer}
.a6i1-bub.on{opacity:1;transform:none}
.a6i1-bub::after{content:"";position:absolute;top:100%;left:50%;margin-left:-8px;border:8px solid transparent;border-top:9px solid #fff;border-bottom:0}
.a6i1-bub s{color:#c62828;text-decoration-thickness:2px}
.a6i1-bub em{display:block;font-style:normal;color:#0a7a44;font-size:13.5px;margin-top:3px}
.a6i1-bub small{display:inline-block;margin-top:4px;font-size:11.5px;font-weight:900;border-radius:6px;padding:1px 7px;background:#1b1f33;color:#fff}
.a6i1-bub.hit{background:#e6fff0}.a6i1-bub.hit::after{border-top-color:#e6fff0}
.a6i1-bub.ng{background:#ffe6ea}.a6i1-bub.ng::after{border-top-color:#ffe6ea}
.a6i1-bub.fa{background:#fff4cf}.a6i1-bub.fa::after{border-top-color:#fff4cf}
.a6i1-tm{position:absolute;left:12px;right:12px;bottom:5px;height:4px;border-radius:9px;background:#0000001f;overflow:hidden}
.a6i1-tm b{display:block;height:100%;background:#7c9cff;transform-origin:left}
.a6i1-log{flex:0 0 auto;display:flex;gap:4px;flex-wrap:wrap;min-height:22px;align-content:flex-start}
.a6i1-log span{font-size:11px;font-weight:800;border-radius:6px;padding:2px 7px;background:#2c3150;color:#c9cde6;animation:a6i1in .2s ease-out}
.a6i1-log span.o{background:#1f5a3c;color:#a8ffd0}.a6i1-log span.x{background:#5a1f2a;color:#ffb0ba}.a6i1-log span.f{background:#5a4a1f;color:#ffe08a}
@keyframes a6i1in{from{transform:translateY(6px);opacity:0}}
.mg-cs4 .mg-foot .a6i1-bz{background:linear-gradient(#ff7a6a,#e0312f)!important;color:#fff!important;border-color:#ff9a8a!important;font-size:17px;padding:15px 10px;box-shadow:0 4px 0 #8a1a18,0 6px 14px #0008}
.mg-cs4 .mg-foot .a6i1-bz:active,.mg-cs4 .mg-foot .a6i1-bz.dn{transform:translateY(3px);box-shadow:0 1px 0 #8a1a18}
@media (max-height:680px){.a6i1-bub{font-size:14px}.a6i1-q{font-size:12.5px}}
@media (prefers-reduced-motion:reduce){.a6i1-me.talk{animation:none}}
`;

// 한 판에 쓸 문항 만들기: 버릇 하나를 빼기도 하고(늘 번갈아 나오지 않게), 가운데 멀쩡한 말 하나를 빼기도 한다
function buildQ(q) {
  let fr = q.f.map(([t, h, fix]) => ({ t, h: h || null, fix: fix || "" }));
  if (rnd() < 0.6) { const b = pick(fr.filter((x) => x.h)); fr = fr.filter((x) => x !== b); }
  if (rnd() < 0.5) { const mids = fr.filter((x, i) => !x.h && i > 0 && i < fr.length - 1); if (mids.length) { const m = pick(mids); fr = fr.filter((x) => x !== m); } }
  return { q: q.q, fr };
}

export const GAME = {
  key: "cs4", base: "cs", n: "면접 버릇 교정술", desc: "모의면접 중 멘티의 나쁜 말버릇이 나오는 순간 호루라기!",
  how: ["멘티가 면접 답을 <b>한 마디씩</b> 말해요. 말풍선 아래 줄이 다 줄기 전에 판단해요.", "<b>나쁜 버릇</b>이 나오면 바로 <b>삑!</b> 군말(어… 그…), 남 탓, 숫자 없는 말, 외운 티, 딴소리, 말끝 흐리기.", "멀쩡한 말에 불면 멘티가 주눅 들어 감점이에요. 빨리 잡을수록 점수가 높아요. 질문은 3개."],
  steps: () => [["🗣️", "멘티가 답해요"], ["📣", "버릇에 삑!"], ["✍️", "바로 고쳐 줘요"]],
  css: CSS,
  run(host, ez, finish) {
    const dbg = typeof window !== "undefined" && window.__mgdbg ? window.__mgdbg : null, auto = dbg && dbg.cs4;
    const N = 3, ezf = 1 + (ez - 1) * 0.5, plan = shuffle(QS).slice(0, N).map(buildQ);
    const B = plan.reduce((a, Q) => a + Q.fr.filter((x) => x.h).length, 0), TOT = plan.reduce((a, Q) => a + Q.fr.length, 0), G = TOT - B;
    const F = frame(host, "cs4", "면접 버릇 교정술", "", "", `<button class="mg-btn a6i1-bz" data-bz>📣 삑! 그 말은 빼요</button>`);
    F.stage.insertAdjacentHTML("beforeend", `<div class="a6i1"><div class="a6i1-q"><small>모의면접 준비 중…</small>&nbsp;</div>
      <div class="a6i1-sc"><div class="a6i1-bg"></div><div class="a6i1-me"></div><div class="a6i1-bub" data-bub><span data-tx></span><div class="a6i1-tm"><b></b></div></div></div><div class="a6i1-log"></div></div>`);
    const IN = F.stage.querySelector(".a6i1"), qEl = IN.querySelector(".a6i1-q"), me = IN.querySelector(".a6i1-me"), bub = IN.querySelector(".a6i1-bub"), tx = bub.querySelector("[data-tx]"), tm = bub.querySelector(".a6i1-tm b"), logEl = IN.querySelector(".a6i1-log"), bz = F.foot.querySelector("[data-bz]");
    { const im = new Image(); im.onload = () => { me.style.backgroundImage = `url("${im.src}")`; me.style.backgroundPosition = exPos("neutral"); }; im.onerror = () => me.classList.add("noimg"); im.src = "img/body/" + pick(MENTEE) + ".webp"; }
    const setEx = (ex) => { me.style.backgroundPosition = exPos(ex); };
    let qi = -1, fi = 0, cur = null, over = false, raf = 0, hits = 0, fa = 0, spd = 0, doneN = 0; const missed = [];
    const later = (fn, ms) => setTimeout(() => { if (!over && host.isConnected) fn(); }, ms);
    const chip = (cls, t) => { const e = document.createElement("span"); e.className = cls; e.textContent = t; logEl.appendChild(e); while (logEl.children.length > 7) logEl.firstChild.remove(); };
    const hud = () => { F.sc.textContent = `교정 ${hits}/${B}`; F.bar.style.transform = `scaleX(${clamp(1 - doneN / TOT, 0, 1)})`; };
    hud();
    const whistle = () => { tone(2300, 0.09, "square", 0.07); tone(2650, 0.14, "square", 0.07, 0, 0.07); vib(18); };

    const nextQ = () => {
      qi++; if (qi >= N) return end();
      fi = 0; cur = null; bub.classList.remove("on"); me.classList.remove("talk"); setEx("neutral");
      qEl.innerHTML = `<small>면접관 질문 ${qi + 1}/${N}</small>${plan[qi].q}`; SFX.whoosh();
      later(nextF, 1150);
    };
    const nextF = () => {
      const Q = plan[qi]; if (fi >= Q.fr.length) { bub.classList.remove("on"); me.classList.remove("talk"); return later(nextQ, 450); }
      const f = Q.fr[fi++], dur = (1.2 + f.t.length * 0.038) * ezf * (1 - qi * 0.07) * 1000;
      cur = { f, t0: performance.now(), dur, judged: false };
      bub.className = "a6i1-bub on"; tx.textContent = f.t; tm.style.transform = "scaleX(1)"; me.classList.add("talk"); setEx(fi % 2 ? "neutral" : "smile");
      tone(480 + (fi % 3) * 60, 0.04, "triangle", 0.05);
      if (auto) { if (auto === "bad" || (f.h && (auto === "good" || (auto === "mix" && fi % 4)))) later(buzz, 420); }
    };
    // 말 한 마디가 지나감(안 불었음)
    const expire = () => {
      const c = cur; c.judged = true; doneN++; me.classList.remove("talk");
      if (c.f.h) {
        const H = HABIT[c.f.h]; missed.push(c.f); bub.classList.add("ng"); tx.innerHTML = `${c.f.t}<br><small>놓침 · ${H.tag}</small>`;
        F.miss(bub); chip("x", "✕ " + H.tag); setEx("blush"); later(nextF, 800);
      } else later(nextF, 150);
      hud();
    };
    // 호루라기
    const buzz = () => {
      const c = cur; if (over || !c || c.judged) return;
      c.judged = true; doneN++; me.classList.remove("talk"); whistle();
      bz.classList.add("dn"); setTimeout(() => bz.classList.remove("dn"), 120);
      const p = (performance.now() - c.t0) / c.dur;
      if (c.f.h) {
        const H = HABIT[c.f.h]; hits++; spd += clamp(1.05 - p * 0.75, 0.3, 1);
        bub.classList.add("hit"); tx.innerHTML = `<s>${c.f.t}</s><em>→ ${c.f.fix}</em><small>${H.tag}</small>`;
        F.hit(bub, 1, "#5fe0a0"); chip("o", "✓ " + H.tag); setEx("surprised"); later(() => setEx("smile"), 500); later(nextF, 1250);
      } else {
        fa++; bub.classList.add("fa"); tx.innerHTML = `${c.f.t}<br><small>멀쩡한 말이었어요</small>`;
        F.miss(bub); chip("f", "△ 괜한 호루라기"); setEx("sad"); later(nextF, 800);
      }
      hud();
    };
    let lastDown = 0;
    const down = (e) => { if (e && e.cancelable) e.preventDefault(); const now = performance.now(); if (now - lastDown < 120) return; lastDown = now; buzz(); };
    bz.addEventListener("pointerdown", down); bub.addEventListener("pointerdown", down);
    bz.addEventListener("click", (e) => { if (performance.now() - lastDown > 400) down(e); }); // 포인터 이벤트가 없는 기기

    const loop = (now) => {
      if (over || !host.isConnected) return;
      if (cur && !cur.judged) { const p = (now - cur.t0) / cur.dur; tm.style.transform = `scaleX(${clamp(1 - p, 0, 1)})`; if (p >= 1) expire(); }
      raf = requestAnimationFrame(loop);
    };
    const end = () => {
      cur = null; bub.className = "a6i1-bub on"; me.classList.remove("talk");
      const catchR = B ? hits / B : 0, calm = clamp(1 - fa / Math.max(1, G) * 2.5, 0, 1), sp = B ? spd / B : 0;
      const score = clamp(catchR * 0.72 + sp * 0.14 + calm * 0.14 - fa * 0.05, 0, 1), good = score >= 0.6;
      setEx(good ? "smile" : "sad"); tx.textContent = good ? "코치님, 말이 훨씬 깔끔해졌어요!" : "아직 버릇이 남았네요… 한 번 더 봐 주세요."; tm.style.transform = "scaleX(0)";
      qEl.innerHTML = `<small>모의면접 끝</small>버릇 ${B}개 중 ${hits}개 교정${fa ? ` · 괜한 호루라기 ${fa}번` : ""}`;
      F.bar.style.transform = "scaleX(0)"; if (good && !RM()) F.burst(bub, "#ffd166", 14); if (good) SFX.snap();
      const extra = missed.slice(0, 3).map((f) => `<div><s>${f.t}</s><br><em>${f.fix}</em><small>${HABIT[f.h].tag}: ${HABIT[f.h].tip}</small></div>`).join("");
      setTimeout(() => { over = true; cancelAnimationFrame(raf); if (!host.isConnected) return; finish(score, `버릇 <b>${hits}/${B}</b>개 교정${fa ? ` · 괜한 호루라기 ${fa}번` : ""}`, extra, [["버릇 잡기", catchR], ["참을성", calm], ["반응 속도", sp]]); }, 1500);
    };
    raf = requestAnimationFrame(loop);
    later(nextQ, 350);
  },
};
