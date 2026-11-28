// 미니게임 1탄(carwash1) "토요일 아침 세 대": 지하 주차장에서 세 대를 닦는다. 한 대에 18·21·24초(차가 클수록 길고, 능력치가 높으면 더 길다).
// 얼룩을 톡 누르면 닦인다. 규칙은 셋.
//   1) 위에서 아래로: 지붕 → 유리 → 옆면 → 아랫단 → 휠. 위가 남았는데 아래를 누르면 물이 흘러 순서 실수.
//   2) 타월은 따로: 도장은 도장 타월, 휠은 휠 타월. 휠 타월로 도장을 닦으면 흠집. 도장 타월로 휠을 닦으면 그 타월이 더러워진다.
//   3) 도장 타월은 여섯 번 쓰면 간다(타월 갈기). 더러운 타월로 닦으면 흠집.
// 점수 = 닦은 곳 50% + 흠집 없이 30% + 순서 20%. 그림 파일 없음(차는 CSS 로 그린다).
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, vib, rnd, pick, shuffle, clamp, RM } from "../mg.js";

const PER = [18, 21, 24], HIT = 20, FRESH = 6, SWAP = 0.5; // 차마다 시간(초. 11-28 QA: 30초는 헐거워 보통 솜씨로 2~5초 남게 줄임), 얼룩을 잡는 반지름(px), 도장 타월 한 장으로 닦는 횟수, 타월 가는 시간(초)
const ZN = ["지붕", "유리", "옆면", "아랫단", "휠"];
// 구역 자리(차 상자 기준 %): 지붕·유리·옆면·아랫단. 휠은 두 개의 원
const ZB = [{ l: 30, t: 3, w: 38, h: 17 }, { l: 22, t: 20, w: 54, h: 18 }, { l: 4, t: 38, w: 92, h: 25 }, { l: 12, t: 63, w: 76, h: 11 }];
const WH = [[24, 80], [76, 80]];
const CARS = [
  { n: "경차", own: "302호", c: "#f0c85a", g: "#bfe3ff", sp: [2, 2, 3, 2, 2] },
  { n: "세단", own: "1104호", c: "#a9bfe0", g: "#cfe9ff", sp: [3, 2, 4, 2, 2] },
  { n: "수입 SUV", own: "2001호", c: "#3a4150", g: "#9fc4e8", sp: [3, 3, 4, 3, 2] },
];
const GOODM = ["\"작업 전 사진까지 보내 주셨네요. 다음 달도 같은 주에 부탁드려요.\"", "\"유리에 물자국이 하나도 없네요. 옆집에도 말해 둘게요.\"", "\"휠이 새 차 같아요. 토요일 아침에 이걸 다 하셨다고요?\""];
const BADM = ["\"보닛에 잔흠집이 보이는데요… 원래 있던 건가요?\"", "\"아랫단에 물자국이 남았네요. 다음에는 신경 써 주세요.\"", "\"한 대는 덜 닦인 것 같아요. 시간이 모자라셨나 봐요.\""];

export const GAME = {
  key: "carwash1", base: "carwash", jc: "#6fc3ff", n: "토요일 아침 세 대", desc: "지하 주차장에 세 대! 위에서 아래로, 휠은 맨 마지막에 닦아요",
  how: [
    "처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. <b>얼룩을 톡</b> 누르면 닦여요. 세 대예요. 한 대에 18~24초, 큰 차일수록 조금 더 줘요.",
    "<b>위에서 아래로</b> 닦아요. 지붕 → 유리 → 옆면 → 아랫단 → 휠. 위가 남았는데 아래를 누르면 물이 흘러요.",
    "<b>휠은 휠 타월</b>로, 나머지는 <b>도장 타월</b>로 닦아요. 도장 타월은 여섯 번 쓰면 <b>타월 갈기</b>. 더러운 타월은 흠집을 내요.",
  ],
  steps: () => [["⬇️", "위에서 아래로"], ["🧽", "타월은 따로"], ["✨", "흠집 없이"]],
  css: `
.mg-carwash1 .cw-st{background:linear-gradient(#1b222b 0 62%,#2b323c 62% 100%)!important;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
.mg-carwash1 .cw-pil{position:absolute;top:0;bottom:38%;width:9%;background:linear-gradient(90deg,#39424e,#4a5563 50%,#39424e);border-bottom:6px solid #f2c94c}
.mg-carwash1 .cw-pil.a{left:3%}.mg-carwash1 .cw-pil.b{right:3%}
.mg-carwash1 .cw-lamp{position:absolute;top:0;left:30%;right:30%;height:5px;background:#fff8d6;box-shadow:0 0 24px 8px #fff8d655;border-radius:0 0 4px 4px}
.mg-carwash1 .cw-tag{position:absolute;left:8px;top:8px;z-index:6;background:#000a;color:#f2efe6;border-radius:9px;padding:4px 9px;font-size:12px;font-weight:800;pointer-events:none}
.mg-carwash1 .cw-tag b{color:#6fc3ff}
.mg-carwash1 .cw-car{position:absolute;left:6%;right:6%;top:50%;aspect-ratio:1.5;transform:translateY(-54%);transition:transform .45s ease,opacity .3s}
.mg-carwash1 .cw-car.out{transform:translate(120%,-54%);opacity:0}.mg-carwash1 .cw-car.in{transform:translate(-120%,-54%);opacity:0;transition:none}
.mg-carwash1 .cw-z{position:absolute;background:var(--c);box-shadow:inset 0 -4px 0 #0003,inset 0 3px 0 #fff3}
.mg-carwash1 .cw-z.z0{border-radius:46% 46% 4px 4px/90% 90% 4px 4px}
.mg-carwash1 .cw-z.z1{background:var(--g);border-radius:18px 18px 2px 2px;box-shadow:inset 0 0 0 4px var(--c),inset 12px 0 0 -4px #fff6}
.mg-carwash1 .cw-z.z2{border-radius:22px 26px 6px 6px}
.mg-carwash1 .cw-z.z3{background:#20242b;border-radius:2px 2px 8px 8px;box-shadow:inset 0 3px 0 #0005}
.mg-carwash1 .cw-wh{position:absolute;width:21%;aspect-ratio:1;margin:-10.5% 0 0 -10.5%;border-radius:50%;background:radial-gradient(circle,#cfd6de 0 26%,#6b7480 27% 38%,#15181c 39% 100%);box-shadow:0 3px 0 #0006;z-index:2}
.mg-carwash1 .cw-z.cur,.mg-carwash1 .cw-wh.cur{outline:2px dashed #ffffffaa;outline-offset:2px}
.mg-carwash1 .cw-z.shine::after,.mg-carwash1 .cw-wh.shine::after{content:"✨";position:absolute;right:4px;top:-6px;font-size:14px;animation:cwtw .8s ease-out}
.mg-carwash1 .cw-scr{position:absolute;width:26px;height:2px;background:#fff;opacity:.85;transform:rotate(-24deg);box-shadow:5px 5px 0 #fff9;z-index:3;pointer-events:none}
.mg-carwash1 .cw-sp{position:absolute;z-index:4;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:46% 54% 50% 50%;background:radial-gradient(circle at 40% 35%,#9a8468,#6b5a45 70%);border:2px solid #3d3226;box-shadow:0 2px 0 #0005;cursor:pointer}
.mg-carwash1 .cw-sp::after{content:"";position:absolute;inset:-4px}
.mg-carwash1 .cw-sp.w{background:radial-gradient(circle at 40% 35%,#a0a6ae,#4a4e55 70%);border-color:#ffb347}
.mg-carwash1 .cw-sp.off{animation:cwwipe .28s ease-out forwards;pointer-events:none}
.mg-carwash1 .cw-drip{position:absolute;z-index:3;width:5px;border-radius:3px;background:#9fd4ff;opacity:.85;animation:cwdrip .7s ease-in forwards;pointer-events:none}
.mg-carwash1 .cw-ban{position:absolute;left:50%;top:22%;z-index:12;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:25px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #0008}
.mg-carwash1 .cw-ban.on{animation:cwban 1.3s ease-out forwards}
.mg-carwash1 .cw-ban small{display:block;font-size:13px;margin-top:2px}
.mg-carwash1 .cw-pm{position:absolute;left:10px;right:10px;top:10%;z-index:14;background:#fffdf8;color:#2a1e2e;border-radius:12px;padding:8px 11px;box-shadow:0 4px 0 #0006;font-size:12.5px;line-height:1.45;font-weight:600;word-break:keep-all;animation:cwpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-carwash1 .cw-pm small{display:block;font-size:11px;color:#7a6f80;font-weight:700}
.mg-carwash1 .cw-pm.sad{box-shadow:0 4px 0 #0006,0 0 0 2px #ff5a6a}
.mg-carwash1 .cw-tut{position:absolute;left:8px;right:8px;bottom:8px;z-index:20;pointer-events:none;transition:opacity .3s}
.mg-carwash1 .cw-tut.off{opacity:0;visibility:hidden}
.mg-carwash1 .cw-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:12px;padding:8px 10px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #6fc3ff;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all;display:flex;flex-direction:column}
.mg-carwash1 .cw-tut.pop .cw-tc{animation:cwpop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-carwash1 .cw-tc em{font-style:normal;align-self:center;background:#2a7fc0;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-carwash1 .cw-tc p{margin:0}.mg-carwash1 .cw-tc b{color:#1f6fb0}.mg-carwash1 .cw-tc b.rd{color:#d23b4b}
.mg-carwash1 .cw-tb{display:flex;justify-content:center;gap:8px;margin-top:6px}
.mg-carwash1 .cw-tb button{border:0;border-radius:9px;padding:7px 14px;font-weight:900;font-size:13px;min-height:36px;cursor:pointer}
.mg-carwash1 .cw-go{background:#2a7fc0;color:#fff;box-shadow:0 3px 0 #17507c}.mg-carwash1 .cw-skip{background:#e7e2ea;color:#5b5163}
.mg-carwash1 .cw-hand{position:absolute;z-index:21;font-size:26px;pointer-events:none;display:none;animation:cwhand .7s infinite alternate}
.mg-carwash1 .cw-hand.on{display:block}
.mg-carwash1 .mg-foot{display:flex;gap:6px}
.mg-carwash1 .mg-foot .mg-btn{flex:1;min-height:44px;font-size:12.5px;line-height:1.25;padding:5px 4px;word-break:keep-all}
.mg-carwash1 .mg-foot .mg-btn small{display:block;font-size:10.5px;font-weight:700;opacity:.85}
.mg-carwash1 .mg-foot .mg-btn.bad{box-shadow:0 0 0 2px #ff5a6a inset;animation:cwbad .5s infinite alternate}
@keyframes cwwipe{to{transform:scale(1.7);opacity:0}}
@keyframes cwdrip{from{height:6px;opacity:.9}to{height:44px;opacity:0}}
@keyframes cwban{0%{opacity:0;transform:translate(-50%,-30%) scale(.8)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-70%)}}
@keyframes cwpop{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}
@keyframes cwhand{from{transform:translateY(0)}to{transform:translateY(7px)}}
@keyframes cwtw{from{transform:scale(.4);opacity:0}40%{transform:scale(1.3);opacity:1}to{transform:scale(1);opacity:0}}
@keyframes cwbad{from{opacity:1}to{opacity:.65}}
@media (prefers-reduced-motion:reduce){.mg-carwash1 .cw-car{transition:none}.mg-carwash1 .cw-hand,.mg-carwash1 .mg-foot .mg-btn.bad{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const T = () => PER[ci] * ez, dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "carwash1", "토요일 아침 세 대", "cw-st", "",
      `<button class="mg-btn on" data-tw="p">도장 타월<small></small></button><button class="mg-btn" data-tw="w">휠 타월<small>휠만 닦아요</small></button><button class="mg-btn" data-tw="x">타월 갈기<small>새 도장 타월</small></button>`);
    F.stage.insertAdjacentHTML("beforeend", `<div class="cw-pil a"></div><div class="cw-pil b"></div><div class="cw-lamp"></div><div class="cw-tag"></div><div class="cw-car"></div><div class="cw-ban"></div>
      <div class="cw-tut off"><div class="cw-tc"><em>리허설</em><p></p><div class="cw-tb"></div></div></div><div class="cw-hand">👆</div>`);
    const st = F.stage, $ = (q) => st.querySelector(q);
    const carEl = $(".cw-car"), tag = $(".cw-tag"), ban = $(".cw-ban"), tutEl = $(".cw-tut"), tutP = $(".cw-tc p"), tutB = $(".cw-tb"), hand = $(".cw-hand");
    const bP = F.foot.querySelector('[data-tw="p"]'), bW = F.foot.querySelector('[data-tw="w"]'), bX = F.foot.querySelector('[data-tw="x"]');
    // ── 상태 ──  ph: tut 리허설 / run / gap(다음 차로) / over
    let ph = "tut", tutN = 0, ci = 0, t = 0, phT = 0, lock = 0, done = false, raf = 0, last = 0;
    let tool = "p", pUse = 0, pBad = false, spots = [], frz = false; // frz: 시험용 시계 멈춤(__mgdbg 로만 켠다)
    const S = { tot: CARS.reduce((a, c) => a + c.sp.reduce((x, y) => x + y, 0), 0), wiped: 0, scr: 0, ord: 0, cars: 0 };
    const banner = (h) => { ban.innerHTML = h; ban.classList.remove("on"); void ban.offsetWidth; ban.classList.add("on"); };
    const left = (z) => spots.filter((p) => p.z === z && !p.done).length;
    const curZ = () => { for (let z = 0; z < 5; z++) if (left(z)) return z; return -1; };
    const zEls = (z) => (z < 4 ? [carEl.querySelector(".z" + z)] : [...carEl.querySelectorAll(".cw-wh")]);
    function buildCar(i) {
      const C = CARS[i]; spots = [];
      carEl.style.setProperty("--c", C.c); carEl.style.setProperty("--g", C.g);
      let h = ZB.map((b, z) => `<div class="cw-z z${z}" style="left:${b.l}%;top:${b.t}%;width:${b.w}%;height:${b.h}%"></div>`).join("") + WH.map(([x, y]) => `<div class="cw-wh" style="left:${x}%;top:${y}%"></div>`).join("");
      C.sp.forEach((n, z) => {
        for (let k = 0; k < n; k++) {
          let x, y;
          if (z === 4) [x, y] = WH[k % 2];
          else if (z === 3) { x = 37 + 26 * (k + 0.5) / n; y = ZB[3].t + ZB[3].h * 0.5; } // 아랫단 얼룩은 두 휠 사이에만(휠과 겹치지 않게)
          else { const b = ZB[z]; x = b.l + b.w * clamp((k + 0.5) / n + (rnd() - 0.5) * 0.12, 0.12, 0.88); y = b.t + b.h * (0.35 + rnd() * 0.3); }
          spots.push({ z, x, y, done: false });
        }
      });
      h += spots.map((p, k) => `<i class="cw-sp${p.z === 4 ? " w" : ""}" data-k="${k}" style="left:${p.x.toFixed(1)}%;top:${p.y.toFixed(1)}%"></i>`).join("");
      carEl.innerHTML = h; spots.forEach((p, k) => { p.el = carEl.querySelector(`[data-k="${k}"]`); });
      updHud();
    }
    function updHud() {
      const C = CARS[ci], z = curZ();
      tag.innerHTML = `<b>${ci + 1}/3대</b> · ${C.own} ${C.n}${z >= 0 ? ` · 지금은 ${ZN[z]}` : ""}`;
      F.sc.textContent = `흠집 ${S.scr}`;
      F.bar.style.transform = `scaleX(${ph === "run" ? clamp(1 - t / T(), 0, 1) : 1})`;
      const dirty = pBad || pUse >= FRESH;
      bP.querySelector("small").textContent = pBad ? "휠 가루가 묻었어요" : dirty ? "더러워요 · 갈아요" : `${FRESH - pUse}번 남음`;
      bP.classList.toggle("on", tool === "p"); bW.classList.toggle("on", tool === "w"); bP.classList.toggle("bad", dirty); bX.classList.toggle("on", false);
      carEl.querySelectorAll(".cur").forEach((e) => e.classList.remove("cur"));
      if (z >= 0 && ph !== "over") zEls(z).forEach((e) => e.classList.add("cur"));
    }
    function scratch(p, why) {
      S.scr++; F.miss(p.el); F.float(p.el, "흠집!", "bad"); F.msg(why);
      const m = document.createElement("i"); m.className = "cw-scr"; m.style.left = `calc(${p.x.toFixed(1)}% - 8px)`; m.style.top = `calc(${p.y.toFixed(1)}% + 14px)`; carEl.appendChild(m);
      try { SFX.scratch(0.2); } catch (e) {}
    }
    function tapSpot(k) {
      const p = spots[k]; if (!p || p.done || done || (ph !== "run" && ph !== "tut") || lock > 0) return;
      if (ph === "tut") { if (tutN !== 1) return; if (p.z !== 0) { F.msg("먼저 지붕의 얼룩을 눌러 봐요"); return; } }
      const cz = curZ();
      if (p.z > cz) { // 위가 남았다: 물이 흘러 순서 실수
        S.ord++; F.miss(null); F.float(p.el, "위부터!", "bad"); F.msg(`${ZN[cz]}부터 닦아요 · 위에서 아래로`);
        const d = document.createElement("i"); d.className = "cw-drip"; d.style.left = `${p.x.toFixed(1)}%`; d.style.top = `${p.y.toFixed(1)}%`; carEl.appendChild(d); setTimeout(() => d.remove(), 720);
        updHud(); return;
      }
      if (p.z < 4) {
        if (tool === "w") { scratch(p, "휠 타월로 도장을 닦았어요"); updHud(); return; }
        if (pBad || pUse >= FRESH) { scratch(p, "더러운 타월이에요 · 타월 갈기"); updHud(); return; }
        pUse++;
      } else if (tool === "p") { pBad = true; F.msg("도장 타월에 휠 가루가 묻었어요 · 타월 갈기"); vib([20, 30, 20]); }
      p.done = true; p.el.classList.add("off"); S.wiped++; lock = 0.12; F.hit(p.el, 1, p.z === 4 ? "#cfd6de" : "#9fd4ff");
      if (!left(p.z)) { zEls(p.z).forEach((e) => { e.classList.remove("shine"); void e.offsetWidth; e.classList.add("shine"); }); try { SFX.sweep(); } catch (e) {} }
      if (ph === "tut") { tutNext(2); updHud(); return; }
      if (curZ() < 0) carDone(true); else updHud();
    }
    function setTool(k) {
      if (done || ph === "over") return;
      if (k === "x") { if (lock > 0) return; pUse = 0; pBad = false; tool = "p"; lock = SWAP; SFX.snap(); F.msg("새 도장 타월을 꺼냈어요"); }
      else { tool = k; SFX.tok(); }
      updHud();
    }
    function carDone(clean) {
      if (ph !== "run") return; ph = "gap"; phT = 0; if (clean) S.cars++;
      banner(clean ? `${ci + 1}대 끝!<small>${CARS[ci].own} 완료</small>` : `시간 끝!<small>${CARS[ci].own}는 여기까지</small>`);
      if (clean) { SFX.ding(2 + ci); F.burst(carEl, "#9fd4ff", 14); } else SFX.fail();
      updHud();
    }
    function nextCar() {
      if (ci >= CARS.length - 1) return over();
      carEl.classList.add("out");
      setTimeout(() => {
        if (done) return; ci++; t = 0; buildCar(ci); carEl.classList.remove("out"); carEl.classList.add("in"); void carEl.offsetWidth; carEl.classList.remove("in");
        ph = "run"; phT = 0; SFX.go(); updHud();
      }, RM() ? 60 : 420);
      ph = "wait";
    }
    function over() {
      if (ph === "over") return; ph = "over"; updHud();
      const cleanR = S.tot ? S.wiped / S.tot : 0, scrN = clamp(1 - S.scr / 5, 0, 1), ordN = clamp(1 - S.ord / 5, 0, 1);
      const score = cleanR * 0.5 + scrN * 0.3 + ordN * 0.2, good = score >= 0.8, bad = S.scr >= 2 ? 0 : S.ord >= 3 ? 1 : cleanR < 0.85 ? 2 : -1;
      banner(`세 대 끝!<small>토요일 아침 9시</small>`); [784, 988, 1175].forEach((f, i) => tone(f, 0.14, "triangle", 0.08, 0, i * 0.1));
      setTimeout(() => {
        if (done) return; const pm = document.createElement("div"); pm.className = "cw-pm" + (bad >= 0 && !good ? " sad" : "");
        pm.innerHTML = `<small>고객 문자 · ${pick(CARS).own} · 방금</small>${bad >= 0 && !good ? BADM[bad] : pick(GOODM)}`; st.appendChild(pm);
        if (good) { SFX.ding(3); vib([15, 40, 15]); } else if (bad >= 0) SFX.fail();
      }, 900);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        finish(score, `닦은 곳 <b>${S.wiped}/${S.tot}</b> · 흠집 ${S.scr} · 순서 실수 ${S.ord}`, "", [["닦은 곳", cleanR], ["흠집 없이", scrN], ["위에서 아래로", ordN]]);
      }, 3200);
    }
    // ── 리허설 ──
    const SKIP = `<button class="cw-skip" data-skip>건너뛰기</button>`;
    const handAt = (p) => { if (!p) { hand.classList.remove("on"); return; } const a = p.el.getBoundingClientRect(), b = st.getBoundingClientRect(); hand.style.left = a.left - b.left + 6 + "px"; hand.style.top = a.top - b.top + 14 + "px"; hand.classList.add("on"); };
    const tutNext = (n) => {
      tutN = n; tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) { tutP.innerHTML = `토요일 아침, 지하 주차장에 세 대가 기다려요.<br><b>지붕의 얼룩</b>을 톡! 위에서 아래로 닦아요.`; tutB.innerHTML = SKIP; handAt(spots.find((p) => p.z === 0)); }
      else { handAt(null); tutP.innerHTML = `좋아요! 휠은 맨 마지막에, <b>휠 타월</b>로 바꿔서 닦아요.<br>도장 타월은 여섯 번 쓰면 <b>타월 갈기</b>. <b class="rd">더러운 타월은 흠집</b>을 내요.`; tutB.innerHTML = `<button class="cw-go" data-go>첫 차 시작!</button>`; }
    };
    const startGame = () => {
      if (ph !== "tut") return; tutEl.classList.add("off"); handAt(null);
      ci = 0; t = 0; tool = "p"; pUse = 0; pBad = false; S.wiped = 0; S.scr = 0; S.ord = 0; S.cars = 0; buildCar(0);
      ph = "run"; phT = 0; banner(`1대째<small>${CARS[0].own} ${CARS[0].n} · 위에서 아래로</small>`); SFX.go(); updHud();
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });
    // 누른 자리에서 반지름 HIT 안의 얼룩을 고른다. 이웃 구역과 겹치는 자리에서는 지금 닦을 구역의 얼룩이 먼저다(11-28 QA: 지붕을 눌렀는데 유리가 잡히던 것)
    const pickAt = (cx, cy) => {
      const cz = curZ(); let best = -1, bd = 1e9, bz = false;
      spots.forEach((p, k) => { if (p.done) return; const q = p.el.getBoundingClientRect(), d = Math.hypot(cx - (q.left + q.width / 2), cy - (q.top + q.height / 2)); if (d > HIT) return; const inz = p.z === cz; if ((inz && !bz) || (inz === bz && d < bd)) { best = k; bd = d; bz = inz; } });
      return best;
    };
    carEl.addEventListener("pointerdown", (e) => { const k = pickAt(e.clientX, e.clientY); if (k < 0) return; e.preventDefault(); tapSpot(k); });
    F.foot.addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-tw]"); if (!b) return; e.preventDefault(); if (ph === "tut") { F.msg("리허설이 끝나면 쓸 수 있어요"); return; } setTool(b.dataset.tw); });
    // ── 매 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; phT += dt; if (lock > 0) lock -= dt;
      if (ph === "tut") { if (tutN === 0 && (opts.retry || phT > 0.4)) { if (opts.retry) startGame(); else tutNext(1); } }
      else if (ph === "run") { if (!frz) t += dt; F.bar.style.transform = `scaleX(${clamp(1 - t / T(), 0, 1)})`; if (t >= T()) carDone(false); }
      else if (ph === "gap") { if (phT > 1.0) nextCar(); }
      raf = requestAnimationFrame(loop);
    };
    if (dbg) dbg.carwash1 = {
      S, st: () => ({ ph, ci, t: +t.toFixed(2), tool, pUse, pBad, left: spots.filter((p) => !p.done).length, wiped: S.wiped, scr: S.scr, ord: S.ord }),
      tap: (k) => { lock = 0; tapSpot(k); }, tool: (k) => { lock = 0; setTool(k); }, start: startGame, freeze: (v) => { frz = !!v; }, spots: () => spots.map((p) => ({ z: p.z, done: p.done })),
      // 시험용: 지금 차를 규칙대로 다 닦는다
      auto: () => {
        if (ph === "tut") startGame();
        for (let z = 0; z < 5; z++) spots.forEach((p, k) => { if (p.z !== z || p.done || ph !== "run") return; lock = 0; if (z < 4) { if (pBad || pUse >= FRESH) setTool("x"); else if (tool !== "p") setTool("p"); } else if (tool !== "w") setTool("w"); lock = 0; tapSpot(k); });
      },
    };
    buildCar(0);
    raf = requestAnimationFrame(loop);
  },
};
