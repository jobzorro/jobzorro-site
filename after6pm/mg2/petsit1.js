// 미니게임 1탄(petsit1) "명절 대작전": 추석 연휴 닷새, 맡은 집 여섯 곳을 돈다.
// 동네 지도(바둑판 골목)에서 집을 누른 순서대로 내가 걸어간다. 다시 누르면 순서에서 빠진다.
// 집마다 오늘 가야 하는지·언제 가야 하는지가 다르다(☀ 아침 ~13시, 🌙 저녁 16시~, 언제든). 노령묘는 매일 아침 약.
// 제때 가면 신뢰 그대로, 늦으면 깎이고, 못 가면 크게 깎인다. 하루 8초(능력치가 높으면 최대 10초), 닷새.
// 지도·골목은 캔버스, 집·나는 DOM. 그림 파일 없음. 끝나면 보호자 문자가 온다.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, vib, rnd, pick, shuffle, clamp, RM } from "../mg.js";

const GC = 5, GR = 6; // 골목 바둑판: 세로길 5줄, 가로길 6줄 (칸 좌표 c 0~4, r 0~5)
const DAYS = 5, CARE = 0.4, SPD = 4.2; // 한 집 돌보는 시간(초), 걷는 빠르기(칸/초)
const AM_END = 13, PM_START = 16, H0 = 8, H1 = 22; // 아침은 13시까지, 저녁은 16시부터, 하루는 8시~22시
const DAYN = ["연휴 첫날", "추석 전날", "추석", "추석 다음 날", "연휴 끝"];
const DAYSTART = [8, 8, 10, 8, 8]; // 추석 당일은 차례 지내고 10시에 나간다
// 지도: 첫 칸이 우리 집, 나머지 여섯이 맡은 집
const LAYOUTS = [
  [[2, 5], [0, 1], [3, 0], [4, 2], [1, 3], [0, 5], [4, 4]],
  [[0, 5], [1, 0], [4, 1], [2, 2], [0, 3], [3, 4], [4, 5]],
  [[2, 3], [1, 1], [4, 0], [0, 4], [3, 5], [4, 3], [0, 0]],
];
const BLD = ["101동", "골목 끝집", "2층 빌라", "단독 주택", "오피스텔", "상가 위층", "꽃집 옆", "3층 원룸"];
// 맡은 집: 무엇을 하러 가는지, 언제(win), 어느 날(days)
const ROLES = [
  { k: "med", em: "🐈", ns: ["할미", "순덕", "할배"], kind: "노령묘", win: "am", days: [1, 1, 1, 1, 1], job: "약 먹이기", med: 1 },
  { k: "walk", em: "🐕", ns: ["콩이", "보리", "몽이"], kind: "강아지", win: "pm", days: [1, 1, 1, 1, 1], job: "저녁 산책" },
  { k: "cats", em: "🐱", ns: ["모카·라떼", "치즈·두부", "깨·참"], kind: "고양이 둘", win: "any", days: [1, 0, 1, 0, 1], job: "밥·화장실" },
  { k: "bird", em: "🦜", ns: ["초록이", "망고", "하늘이"], kind: "앵무새", win: "am", days: [1, 1, 1, 0, 0], job: "모이·덮개", back: 3 },
  { k: "ham", em: "🐹", ns: ["도토리", "밤톨", "쿠키"], kind: "햄스터", win: "any", days: [0, 1, 0, 1, 0], job: "물·톱밥" },
  { k: "bun", em: "🐰", ns: ["솜이", "봄이", "눈송이"], kind: "토끼", win: "pm", days: [1, 1, 1, 1, 1], job: "채소·건초" },
];
const WIN = { am: ["☀", "~13시"], pm: ["🌙", "16시~"], any: ["🕘", "언제든"] };
const LOSS = { late: 12, miss: 28 }, LOSS_MED = { late: 18, miss: 40 };
const GOODM = {
  med: (n) => `${n} 약 잘 먹었네요. 사진 보고 울컥했어요. 다음 명절도 부탁드려요!`,
  walk: (n) => `${n} 산책 사진 잘 받았어요! 꼬리가 아주 신났네요ㅎㅎ`,
  cats: (n) => `${n} 둘 다 밥그릇 싹 비웠네요. 덕분에 맘 편히 쉬었어요!`,
  bird: (n) => `${n}가 새 말을 배웠어요. "안녕~" 혹시 선생님이 가르치셨어요?ㅋㅋ`,
  ham: (n) => `${n} 볼 빵빵한 사진 최고예요. 단골 할게요!`,
  bun: (n) => `${n} 채소 먹는 영상 몇 번이나 봤는지 몰라요. 고마워요!`,
};
const BADM = {
  med: (n) => `저… ${n} 약 시간이 많이 늦었더라고요. 다음엔 꼭 아침에 부탁드려요.`,
  walk: (n) => `${n}가 산책을 못 나갔나 봐요. 집이 좀 난리였어요ㅠ`,
  cats: (n) => `${n} 화장실이 좀 밀렸더라고요. 다음엔 신경 써 주세요.`,
  bird: (n) => `${n} 덮개가 밤새 열려 있었어요. 잠을 못 잤나 봐요ㅠ`,
  ham: (n) => `${n} 물병이 비어 있었어요… 좀 놀랐어요.`,
  bun: (n) => `${n} 건초가 바닥났더라고요. 다음엔 제때 부탁드려요.`,
};
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
const hh = (h) => { const m = Math.floor(h * 60 + 1e-6), H = Math.floor(m / 60), M = Math.floor((m % 60) / 10) * 10; return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`; };

export const GAME = {
  key: "petsit1", base: "petsit", jc: "#ffb36b", n: "명절 대작전", desc: "추석 연휴 닷새, 맡은 집 여섯 곳! 방문 순서를 정해 제때 돌아요",
  how: [
    "처음엔 <b>리허설</b>로 한 번 해 보고 시작해요. 지도에서 <b>집을 톡</b> 누르면 번호가 붙고, <b>누른 순서대로</b> 걸어가요. 다시 누르면 순서에서 빠져요.",
    "<b>☀ 아침 집</b>은 13시 전에, <b>🌙 저녁 집</b>은 16시부터 가요. 일찍 가면 문 앞에서 기다려요. <b>할미(노령묘)</b>는 매일 아침 약이에요.",
    "늦게 가면 <b>신뢰가 깎이고</b>, 못 가면 크게 깎여요. 흐린 집은 오늘 안 가도 돼요. 가까운 집끼리 묶어 돌면 빨라요.",
  ],
  steps: () => [["🗺️", "순서대로 톡"], ["☀️🌙", "시간 맞춰 방문"], ["💛", "신뢰 지키기"]],
  css: `
.mg-petsit1 .ps-st{background:#1c2a24!important;touch-action:none;user-select:none;-webkit-user-select:none}
.mg-petsit1 .ps-cv{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
.mg-petsit1 .ps-cv.ov{z-index:2}
.mg-petsit1 .mg-msg{top:auto;bottom:46px;z-index:22}
.mg-petsit1 .ps-hud{position:absolute;left:6px;right:6px;top:5px;z-index:6;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:#f2efe6;pointer-events:none;white-space:nowrap}
.mg-petsit1 .ps-dy{background:#ffb36b;color:#3a1c00;padding:2px 8px;border-radius:6px;font-weight:900}
.mg-petsit1 .ps-dn{opacity:.85}
.mg-petsit1 .ps-ck{margin-left:auto;font-size:15px;font-weight:900;font-variant-numeric:tabular-nums;color:#fff}
.mg-petsit1 .ps-tl{position:absolute;left:8px;right:8px;top:27px;height:6px;border-radius:3px;background:#ffffff1c;z-index:6;pointer-events:none;overflow:visible}
.mg-petsit1 .ps-tl i{position:absolute;top:0;bottom:0;border-radius:3px}
.mg-petsit1 .ps-tl i.am{left:0;width:${((AM_END - H0) / (H1 - H0)) * 100}%;background:#ffd16677}
.mg-petsit1 .ps-tl i.pm{left:${((PM_START - H0) / (H1 - H0)) * 100}%;right:0;background:#8fa8ff77}
.mg-petsit1 .ps-tl em{position:absolute;top:-3px;width:4px;height:12px;margin-left:-2px;border-radius:2px;background:#fff;box-shadow:0 0 6px #fff;left:0}
.mg-petsit1 .ps-h{position:absolute;z-index:4;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:#2c3b34;border:3px solid #55645c;display:flex;align-items:center;justify-content:center;transition:opacity .25s,filter .25s,transform .15s;pointer-events:none}
.mg-petsit1 .ps-h .em{font-style:normal;font-size:24px;line-height:1;filter:drop-shadow(0 2px 2px #0008)}
.mg-petsit1 .ps-h .nm{position:absolute;top:47px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:800;color:#f2efe6;background:#000a;padding:1px 6px;border-radius:5px;white-space:nowrap}
.mg-petsit1 .ps-h .wn{position:absolute;top:-9px;right:-14px;font-size:11px;font-weight:900;padding:1px 5px;border-radius:7px;background:#3a4640;color:#fff;white-space:nowrap;box-shadow:0 2px 0 #0007}
.mg-petsit1 .ps-h.am .wn{background:#ffd166;color:#3a2400}.mg-petsit1 .ps-h.pm .wn{background:#8fa8ff;color:#101a40}.mg-petsit1 .ps-h.any .wn{background:#7fe0c0;color:#0d3a2e}
.mg-petsit1 .ps-h.need.am{border-color:#ffd166}.mg-petsit1 .ps-h.need.pm{border-color:#8fa8ff}.mg-petsit1 .ps-h.need.any{border-color:#7fe0c0}
.mg-petsit1 .ps-h.off{opacity:.38;filter:grayscale(.8)}
.mg-petsit1 .ps-h.off .wn{display:none}
.mg-petsit1 .ps-h .no{position:absolute;left:-9px;top:-9px;min-width:21px;height:21px;border-radius:11px;background:#ffb36b;color:#3a1c00;font-size:12px;font-weight:900;display:none;align-items:center;justify-content:center;box-shadow:0 2px 0 #0008;padding:0 4px}
.mg-petsit1 .ps-h.q .no{display:flex}
.mg-petsit1 .ps-h .ok{position:absolute;inset:-3px;border-radius:50%;background:#2fbf7acc;color:#fff;font-size:22px;font-weight:900;display:none;align-items:center;justify-content:center}
.mg-petsit1 .ps-h.done .ok{display:flex}
.mg-petsit1 .ps-h.done .wn{display:none}
.mg-petsit1 .ps-h.late{border-color:#ff5a6a!important;animation:pslate .5s infinite alternate}
.mg-petsit1 .ps-h.late .wn{background:#ff5a6a;color:#fff}
.mg-petsit1 .ps-h.tg{transform:scale(1.12)}
.mg-petsit1 .ps-h .tr{position:absolute;bottom:-4px;left:7px;right:7px;height:5px;border-radius:3px;background:#0009;overflow:hidden}
.mg-petsit1 .ps-h .tr u{display:block;height:100%;width:var(--t,100%);background:#ffd166;transition:width .3s}
.mg-petsit1 .ps-h .tr.mid u{background:#ffb36b}.mg-petsit1 .ps-h .tr.low u{background:#ff5a6a}
.mg-petsit1 .ps-home{position:absolute;z-index:3;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:10px;background:#5a4636;border:2px solid #c9a07a;display:flex;align-items:center;justify-content:center;font-size:19px;pointer-events:none}
.mg-petsit1 .ps-home small{position:absolute;top:37px;font-size:10.5px;font-weight:800;color:#e8d8c4;white-space:nowrap}
.mg-petsit1 .ps-me{position:absolute;z-index:5;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:#fff;border:3px solid #ffb36b;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 0 #0007,0 0 12px #ffb36b88;pointer-events:none}
.mg-petsit1 .ps-me.walk{animation:psbob .28s infinite alternate}
.mg-petsit1 .ps-me b{position:absolute;top:-17px;font-size:12px;white-space:nowrap;display:none}
.mg-petsit1 .ps-me.wait b,.mg-petsit1 .ps-me.care b{display:block}
.mg-petsit1 .ps-foot{position:absolute;left:6px;right:6px;bottom:6px;z-index:6;display:flex;align-items:center;gap:6px;background:#000a;border-radius:10px;padding:6px 9px;font-size:12px;font-weight:700;color:#f2efe6;pointer-events:none;white-space:nowrap;overflow:hidden}
.mg-petsit1 .ps-foot b{color:#ffd166}
.mg-petsit1 .ps-foot span:last-child{margin-left:auto;opacity:.85;overflow:hidden;text-overflow:ellipsis}
.mg-petsit1 .ps-ban{position:absolute;left:50%;top:40%;z-index:12;transform:translate(-50%,-50%);opacity:0;font-weight:900;font-size:27px;white-space:nowrap;pointer-events:none;color:#fff;text-align:center;text-shadow:0 0 2px #000,0 3px 0 #b8682a,0 0 16px #ffb36b}
.mg-petsit1 .ps-ban.on{animation:psban 1.6s ease-out forwards}
.mg-petsit1 .ps-ban small{display:block;font-size:13px;color:#fff;margin-top:2px}
.mg-petsit1 .ps-night{position:absolute;inset:0;z-index:10;background:radial-gradient(circle at 78% 20%,#fff6d0 0 26px,#ffe9a066 27px,#0b1028ee 70px);opacity:0;transition:opacity .35s;pointer-events:none}
.mg-petsit1 .ps-night.on{opacity:1}
.mg-petsit1 .ps-nt{position:absolute;left:12px;right:12px;top:44%;transform:translateY(-50%);text-align:center;color:#fff;font-weight:800;font-size:13.5px;line-height:1.6}
.mg-petsit1 .ps-nt b{display:block;font-size:20px;color:#ffe9a0;margin-bottom:2px}
.mg-petsit1 .ps-tut{position:absolute;left:8px;right:8px;bottom:6px;z-index:20;pointer-events:none;transition:opacity .3s}
.mg-petsit1 .ps-tut.off{opacity:0;visibility:hidden}
.mg-petsit1 .ps-tc{pointer-events:auto;background:#fffdf8;color:#2a1e2e;border-radius:12px;padding:8px 10px 7px;box-shadow:0 4px 0 #0006,0 0 0 2px #ffb36b;font-size:12.5px;line-height:1.45;text-align:center;font-weight:600;word-break:keep-all;display:flex;flex-direction:column}
.mg-petsit1 .ps-tut.pop .ps-tc{animation:pspop .35s cubic-bezier(.3,1.8,.5,1)}
.mg-petsit1 .ps-tc em{font-style:normal;align-self:center;background:#c8702a;color:#fff;font-size:11px;font-weight:900;padding:1px 8px;border-radius:6px;margin-bottom:3px}
.mg-petsit1 .ps-tc p{margin:0}
.mg-petsit1 .ps-tc b.am{color:#a87000}.mg-petsit1 .ps-tc b.pm{color:#3a4ac0}.mg-petsit1 .ps-tc b.rd{color:#c0392b}.mg-petsit1 .ps-tc b.or{color:#c8602a}
.mg-petsit1 .ps-tb{margin-top:5px;display:flex;justify-content:center;gap:10px;align-items:center}
.mg-petsit1 .ps-skip{background:none!important;border:0!important;box-shadow:none!important;color:#8a7a90!important;font-size:11.5px;text-decoration:underline;padding:2px 6px!important;min-height:0!important}
.mg-petsit1 .ps-go{background:linear-gradient(#ffc78a,#d8782e)!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:8px 22px!important;font-weight:900;font-size:14px;box-shadow:0 3px 0 #8a4a14!important;animation:psgo .5s infinite alternate}
.mg-petsit1 .ps-hand{position:absolute;z-index:21;font-size:30px;line-height:1;margin:6px 0 0 -6px;pointer-events:none;display:none;filter:drop-shadow(0 2px 0 #0009);animation:pstap .8s infinite}
.mg-petsit1 .ps-hand.on{display:block}
.mg-petsit1 .ps-pm{position:absolute;left:10px;right:10px;top:18%;z-index:16;background:#fffdf8;border-radius:14px;padding:10px 12px;box-shadow:0 6px 0 #0007,0 0 0 2px #ffb36b,0 0 30px #ffb36b88;display:flex;gap:10px;align-items:flex-start;animation:pspm .5s cubic-bezier(.3,1.5,.5,1)}
.mg-petsit1 .ps-pm>i{flex:0 0 36px;height:36px;border-radius:9px;background:#fff3e4;font-style:normal;font-size:22px;display:flex;align-items:center;justify-content:center}
.mg-petsit1 .ps-pm div{flex:1;min-width:0;color:#2a1e2e}
.mg-petsit1 .ps-pm small{display:block;font-size:11px;color:#7a7090;font-weight:700}
.mg-petsit1 .ps-pm b{display:block;font-size:12.5px;margin:1px 0 3px}
.mg-petsit1 .ps-pm p{margin:0;font-size:13px;line-height:1.45;font-weight:600;word-break:keep-all}
.mg-petsit1 .ps-pm.sad{box-shadow:0 6px 0 #0007,0 0 0 2px #8a9ad0}
.mg-petsit1 .ps-pm + .ps-pm{top:46%}
@keyframes pslate{to{box-shadow:0 0 14px #ff5a6a}}
@keyframes psbob{to{transform:translateY(-3px)}}
@keyframes pspop{0%{transform:scale(.3)}100%{transform:scale(1)}}
@keyframes psgo{to{transform:scale(1.08)}}
@keyframes pstap{0%,100%{transform:translate(6px,10px)}40%,55%{transform:translate(0,0) scale(.88)}}
@keyframes pspm{from{transform:translateY(-30px) scale(.8);opacity:0}}
@keyframes psban{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}14%{opacity:1;transform:translate(-50%,-50%) scale(1.15) rotate(-3deg)}24%{transform:translate(-50%,-50%) scale(1) rotate(2deg)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
@media (prefers-reduced-motion:reduce){.mg-petsit1 .ps-ban.on{animation-duration:.01s}.mg-petsit1 .ps-h.late,.mg-petsit1 .ps-me.walk,.mg-petsit1 .ps-go,.mg-petsit1 .ps-hand{animation:none}}
`,
  run(host, ez, finish, skill, opts = {}) {
    const DAY = 8 * (1 + (ez - 1) * 0.5), dbg = typeof window !== "undefined" && window.__mgdbg;
    const F = frame(host, "petsit1", "명절 대작전", "ps-st");
    F.stage.insertAdjacentHTML("beforeend", `<canvas class="ps-cv"></canvas><canvas class="ps-cv ov"></canvas>
      <div class="ps-hud"><span class="ps-dy"></span><span class="ps-dn"></span><span class="ps-ck">08:00</span></div><div class="ps-tl"><i class="am"></i><i class="pm"></i><em></em></div>
      <div class="ps-home">🏠<small>우리 집</small></div><div class="ps-me">🚶<b></b></div>
      <div class="ps-foot"><span></span><span></span></div><div class="ps-ban"></div><div class="ps-night"><div class="ps-nt"></div></div>
      <div class="ps-tut off"><div class="ps-tc"><em>리허설</em><p></p><div class="ps-tb"></div></div></div><div class="ps-hand">👆</div>`);
    const st = F.stage, $ = (s) => st.querySelector(s);
    const [cv, cvO] = st.querySelectorAll(".ps-cv"), g = cv.getContext("2d"), gO = cvO.getContext("2d");
    const dyEl = $(".ps-dy"), dnEl = $(".ps-dn"), ckEl = $(".ps-ck"), tlEm = $(".ps-tl em"), homeEl = $(".ps-home"), meEl = $(".ps-me"), meB = meEl.querySelector("b");
    const [ftL, ftR] = st.querySelectorAll(".ps-foot span"), ban = $(".ps-ban"), night = $(".ps-night"), ntEl = $(".ps-nt"), tutEl = $(".ps-tut"), tutP = $(".ps-tc p"), tutB = $(".ps-tb"), hand = $(".ps-hand");
    // 크기: 위 HUD 40, 아래 안내 44 를 뺀 자리에 바둑판
    const sw = st.clientWidth || 360, sh = st.clientHeight || 460;
    const DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    for (const c of [cv, cvO]) { c.width = Math.round(sw * DPR); c.height = Math.round(sh * DPR); c.style.width = sw + "px"; c.style.height = sh + "px"; }
    g.setTransform(DPR, 0, 0, DPR, 0, 0); gO.setTransform(DPR, 0, 0, DPR, 0, 0);
    const padX = 34, top = 80, bot = sh - 84;
    const dx = (sw - padX * 2) / (GC - 1), dy = Math.max(30, (bot - top) / (GR - 1));
    const P = (c, r) => [padX + c * dx, top + r * dy];

    // ── 판 만들기: 지도·집·반려동물 ──
    let lay = pick(LAYOUTS).map((p) => p.slice()); if (rnd() < 0.5) lay = lay.map(([c, r]) => [GC - 1 - c, r]);
    const HOME = lay[0], blds = shuffle(BLD);
    const homes = shuffle(ROLES).map((ro, i) => ({ i, ro, c: lay[i + 1][0], r: lay[i + 1][1], name: pick(ro.ns), bld: blds[i], trust: 100, need: false, done: false, late: false, el: null }));
    // 앵무새·햄스터는 판마다 때가 조금 다르다
    homes.forEach((h) => { h.win = h.ro.k === "ham" ? pick(["any", "am"]) : h.ro.k === "cats" ? pick(["any", "pm"]) : h.ro.win; });
    homes.forEach((h) => {
      const e = document.createElement("div"); e.className = "ps-h " + h.win; const [x, y] = P(h.c, h.r);
      e.style.left = x + "px"; e.style.top = y + "px";
      e.innerHTML = `<i class="em">${h.ro.em}</i><span class="wn">${WIN[h.win][0]} ${WIN[h.win][1]}</span><b class="no"></b><small class="nm">${h.name}</small><em class="tr"><u></u></em><span class="ok">✓</span>`;
      st.appendChild(e); h.el = e; h.no = e.querySelector(".no"); h.tr = e.querySelector(".tr");
    });
    { const [x, y] = P(HOME[0], HOME[1]); homeEl.style.left = x + "px"; homeEl.style.top = y + "px"; }

    // ── 동네 그림(한 번만) ──
    const drawBg = () => {
      g.fillStyle = "#1c2a24"; g.fillRect(0, 0, sw, sh);
      // 골목 사이 블록: 집·공원·논밭
      const seedB = shuffle([0, 1, 2, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0]);
      let k = 0;
      for (let r = 0; r < GR - 1; r++) for (let c = 0; c < GC - 1; c++) {
        const [x0, y0] = P(c, r), x = x0 + 9, y = y0 + 9, w = dx - 18, h = dy - 18, ty = seedB[k++ % seedB.length];
        if (w < 6 || h < 6) continue;
        g.fillStyle = ty === 1 ? "#274a33" : ty === 2 ? "#3a3a26" : "#2a3a33"; rr(g, x, y, w, h, 7); g.fill();
        if (ty === 1) { for (let t = 0; t < 4; t++) { g.fillStyle = t % 2 ? "#3f7a4e" : "#356b44"; g.beginPath(); g.arc(x + w * (0.2 + 0.2 * t), y + h * (t % 2 ? 0.35 : 0.65), Math.min(w, h) * 0.16, 0, 6.283); g.fill(); } }
        else if (ty === 2) { g.strokeStyle = "#5a5a34"; g.lineWidth = 1.5; for (let t = 1; t < 4; t++) { g.beginPath(); g.moveTo(x + 4, y + (h * t) / 4); g.lineTo(x + w - 4, y + (h * t) / 4); g.stroke(); } }
        else { const n = w > 50 ? 3 : 2; for (let t = 0; t < n; t++) { const bw = (w - 8) / n - 4, bx = x + 6 + t * ((w - 8) / n), bh = h * 0.42; g.fillStyle = ["#3d4d46", "#46534a", "#3a4a52"][t % 3]; g.fillRect(bx, y + h - bh - 5, bw, bh); g.fillStyle = "#ffe9a033"; g.fillRect(bx + bw * 0.3, y + h - bh, bw * 0.25, bh * 0.25); } }
      }
      // 골목: 가로·세로
      g.lineCap = "round";
      const road = (x0, y0, x1, y1) => { g.strokeStyle = "#46534d"; g.lineWidth = 13; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
      for (let c = 0; c < GC; c++) { const [x, y0] = P(c, 0), [, y1] = P(c, GR - 1); road(x, y0, x, y1); }
      for (let r = 0; r < GR; r++) { const [x0, y] = P(0, r), [x1] = P(GC - 1, r); road(x0, y, x1, y); }
      g.strokeStyle = "#ffffff22"; g.lineWidth = 1.2; g.setLineDash([4, 6]);
      for (let c = 0; c < GC; c++) { const [x, y0] = P(c, 0), [, y1] = P(c, GR - 1); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
      for (let r = 0; r < GR; r++) { const [x0, y] = P(0, r), [x1] = P(GC - 1, r); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
      g.setLineDash([]);
      // 명절 등(작은 불빛) 몇 개
      for (let t = 0; t < 7; t++) { const [x, y] = P(Math.floor(rnd() * GC), Math.floor(rnd() * GR)), ox = (rnd() - 0.5) * dx * 0.6; g.fillStyle = "#ffb36b55"; g.beginPath(); g.arc(x + ox, y - dy / 2, 5, 0, 6.283); g.fill(); g.fillStyle = "#ffd9a0"; g.beginPath(); g.arc(x + ox, y - dy / 2, 2, 0, 6.283); g.fill(); }
    };
    function rr(q, x, y, w, h, r) { q.beginPath(); q.moveTo(x + r, y); q.arcTo(x + w, y, x + w, y + h, r); q.arcTo(x + w, y + h, x, y + h, r); q.arcTo(x, y + h, x, y, r); q.arcTo(x, y, x + w, y, r); q.closePath(); }
    drawBg();

    // ── 상태 ──  ph: tut 리허설 / pre 하루 시작(시계 멈춤, 순서는 정할 수 있음) / run / night / over
    let ph = "tut", tutN = 0, day = 0, t = 0, phT = 0, done = false, raf = 0, last = 0;
    const me = { x: HOME[0], y: HOME[1], path: [], care: 0, wait: false, tgt: -1 };
    const queue = [];
    const S = { need: 0, on: 0, late: 0, miss: 0, medNeed: 0, medOn: 0, dOn: 0, dLate: 0, dMiss: 0, walked: 0 };
    const hourAt = () => DAYSTART[day] + ((H1 - H0) * t) / DAY; // 시계 빠르기는 날마다 같다
    const dayLen = () => DAY * (H1 - DAYSTART[day]) / (H1 - H0); // 늦게 시작하는 날은 그만큼 짧다
    const openH = (h) => (h.win === "pm" ? PM_START : H0), closeH = (h) => (h.win === "am" ? AM_END : H1);

    const banner = (html) => { ban.innerHTML = html; ban.classList.remove("on"); void ban.offsetWidth; ban.classList.add("on"); };
    const setupDay = () => {
      t = 0; me.x = HOME[0]; me.y = HOME[1]; me.path = []; me.care = 0; me.wait = false; me.tgt = -1; queue.length = 0;
      S.dOn = 0; S.dLate = 0; S.dMiss = 0;
      homes.forEach((h) => { h.need = !!h.ro.days[day]; h.done = false; h.late = false; });
      dyEl.textContent = `${day + 1}일차`; dnEl.textContent = DAYN[day];
      updHomes(); updHud();
    };
    const updHomes = () => {
      const hr = ph === "run" ? hourAt() : DAYSTART[day];
      homes.forEach((h) => {
        const qi = queue.indexOf(h.i);
        h.late = h.need && !h.done && hr > closeH(h);
        const cls = `ps-h ${h.win}${h.need ? (h.done ? " done" : " need") : " off"}${qi >= 0 ? " q" : ""}${h.late ? " late" : ""}${me.tgt === h.i ? " tg" : ""}`;
        if (h.el.className !== cls) h.el.className = cls;
        if (qi >= 0) h.no.textContent = qi + 1;
        h.tr.style.setProperty("--t", h.trust + "%"); h.tr.className = "tr" + (h.trust < 50 ? " low" : h.trust < 80 ? " mid" : "");
      });
    };
    const updHud = () => {
      const hr = ph === "run" ? hourAt() : DAYSTART[day];
      ckEl.textContent = hh(Math.min(H1, hr)); tlEm.style.left = clamp((hr - H0) / (H1 - H0), 0, 1) * 100 + "%";
      const left = homes.filter((h) => h.need && !h.done).length;
      ftL.innerHTML = `오늘 남은 집 <b>${left}</b>`;
      const nx = me.tgt >= 0 ? homes[me.tgt] : queue.length ? homes[queue[0]] : null;
      ftR.textContent = nx ? (me.wait ? `${nx.name} 집 앞에서 기다리는 중` : me.care > 0 ? `${nx.name} ${nx.ro.job} 중` : `다음: ${nx.name} (${nx.ro.job})`) : left ? "집을 눌러 순서를 정해요" : "오늘 할 일 끝! 쉬어도 돼요";
      const avg = Math.round(homes.reduce((a, h) => a + h.trust, 0) / homes.length);
      F.sc.textContent = `신뢰 ${avg}`;
      F.bar.style.transform = `scaleX(${clamp(1 - (day + (ph === "run" ? t / dayLen() : 0)) / DAYS, 0, 1)})`;
    };
    // 지금 자리에서 (tc,tr) 까지 골목 따라 ㄱ자 길
    const route = (x, y, tc, tr) => (Math.abs(y - Math.round(y)) < 1e-6 ? [[tc, y], [tc, tr]] : [[x, tr], [tc, tr]]);
    const retarget = () => {
      me.path = []; me.care = 0; me.wait = false; me.tgt = -1;
      if (!queue.length) return;
      const h = homes[queue[0]]; me.tgt = h.i; me.path = route(me.x, me.y, h.c, h.r);
    };

    // ── 누르기 ──
    const tapAt = (px, py) => {
      if (done || ph === "night" || ph === "over") return;
      let best = null, bd = 34 * 34;
      homes.forEach((h) => { const [x, y] = P(h.c, h.r), d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = h; } });
      if (!best) return;
      if (ph === "tut" && tutN === 1 && best !== tutH) { F.msg(`먼저 ${tutH.name} 집을 눌러 봐요`); return; }
      tapHome(best);
    };
    const tapHome = (h) => {
      const qi = queue.indexOf(h.i);
      if (qi >= 0) {
        if (qi === 0 && me.care > 0) { F.msg(`${h.name} ${h.ro.job} 중이에요`); return; }
        queue.splice(qi, 1); SFX.pop(); if (qi === 0) retarget(); updHomes(); updHud(); return;
      }
      if (!h.need) { F.msg(h.ro.back && day >= h.ro.back ? `${h.name} 보호자가 돌아왔어요` : `${jo(h.name, "은", "는")} 오늘 안 가도 돼요`); SFX.tok(); return; }
      if (h.done) { F.msg(`${h.name} 집은 오늘 다녀왔어요`); SFX.tok(); return; }
      queue.push(h.i); SFX.tok(); vib(8); if (queue.length === 1) retarget();
      updHomes(); updHud();
      if (ph === "tut" && tutN === 1) tutNext(2);
    };
    st.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".ps-tc")) return;
      e.preventDefault(); const r = st.getBoundingClientRect(); tapAt(e.clientX - r.left, e.clientY - r.top);
    });

    // ── 방문 끝 ──
    const visit = (h) => {
      const hr = hourAt(), onT = hr <= closeH(h) + 1e-6, L = h.ro.med ? LOSS_MED : LOSS, p = P(h.c, h.r);
      h.done = true; queue.shift(); S.need++; if (h.ro.med) S.medNeed++;
      if (onT) { S.on++; S.dOn++; if (h.ro.med) S.medOn++; h.trust = Math.min(100, h.trust + 2); F.hit(p, 1, "#ffd166"); }
      else { S.late++; S.dLate++; h.trust = Math.max(0, h.trust - L.late); F.miss(null); F.float(p, `늦음 −${L.late}`, "bad"); }
      retarget(); updHomes(); updHud();
    };
    const endDay = () => {
      ph = "night"; phT = 0; me.path = []; me.care = 0; me.wait = false;
      homes.forEach((h) => {
        if (!h.need || h.done) return; const L = h.ro.med ? LOSS_MED : LOSS;
        S.need++; S.miss++; S.dMiss++; if (h.ro.med) S.medNeed++; h.trust = Math.max(0, h.trust - L.miss); F.float(P(h.c, h.r), `못 감 −${L.miss}`, "bad");
      });
      if (S.dMiss) { SFX.fail(); vib([30, 40, 30]); } else tone(660, 0.1, "triangle", 0.08);
      queue.length = 0; me.tgt = -1; updHomes(); updHud();
      const lastD = day === DAYS - 1;
      ntEl.innerHTML = `<b>${day + 1}일차 끝${S.dMiss || S.dLate ? "" : " · 완벽!"}</b>제때 ${S.dOn} · 늦음 ${S.dLate} · 못 감 ${S.dMiss}<br>${lastD ? "연휴 끝. 보호자들이 돌아와요" : S.dMiss ? "못 간 집이 마음에 걸린다…" : pick(["보름달이 밝다. 내일도 걷자", "다리가 뻐근하다. 그래도 뿌듯하다", "사진 보고서 보내고 잔다"])}`;
      night.classList.add("on");
    };
    const over = () => {
      ph = "over"; night.classList.remove("on");
      const avg = homes.reduce((a, h) => a + h.trust, 0) / homes.length;
      const onR = S.need ? S.on / S.need : 0, trustN = clamp((avg - 40) / 60, 0, 1), medR = S.medNeed ? S.medOn / S.medNeed : 0;
      const score = onR * 0.45 + trustN * 0.4 + medR * 0.15;
      banner(`연휴 끝!<small>보호자들이 돌아와요</small>`); [784, 988, 1175].forEach((f, i) => tone(f, 0.14, "triangle", 0.08, 0, i * 0.1));
      // 보호자 문자: 가장 고마워하는 집, 가장 서운한 집
      const srt = homes.slice().sort((a, b) => b.trust - a.trust), good = srt[0], bad = srt[srt.length - 1];
      const card = (h, sad) => { const pm = document.createElement("div"); pm.className = "ps-pm" + (sad ? " sad" : ""); pm.innerHTML = `<i>${h.ro.em}</i><div><small>보호자 문자 · ${h.bld} · 방금</small><b>${h.name} 보호자</b><p>${(sad ? BADM : GOODM)[h.ro.k](h.name)}</p></div>`; st.appendChild(pm); };
      if (good.trust >= 80) setTimeout(() => { if (done) return; card(good, false); vib([15, 40, 15]); SFX.ding(3); if (good.trust >= 95) F.burst([sw / 2, sh * 0.28], "#ffb36b", 16); }, 900);
      if (bad.trust < 80) setTimeout(() => { if (done) return; card(bad, true); SFX.fail(); }, 1900);
      setTimeout(() => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        finish(score, `제때 방문 <b>${S.on}/${S.need}</b> · 늦음 ${S.late} · 못 감 ${S.miss} · 신뢰 평균 ${Math.round(avg)}`, "", [["제때 방문", onR], ["보호자 신뢰", trustN], ["노령묘 약 시간", medR]]);
      }, bad.trust < 80 ? 4400 : 3600);
    };

    // ── 리허설 ──
    const medH = homes.find((h) => h.ro.med); let tutH = medH;
    const SKIP = `<button class="ps-skip" data-skip>건너뛰기</button>`;
    const handAt = (h) => { if (!h) { hand.classList.remove("on"); return; } const [x, y] = P(h.c, h.r); hand.style.left = x + 8 + "px"; hand.style.top = y + 4 + "px"; hand.classList.add("on"); };
    const tutNext = (n) => {
      tutN = n; Object.assign(tutEl.style, medH.r >= 3 ? { top: "40px", bottom: "auto" } : { top: "auto", bottom: "6px" }); // 할미 집을 가리지 않게
      tutEl.classList.remove("off", "pop"); void tutEl.offsetWidth; tutEl.classList.add("pop");
      if (n === 1) { tutP.innerHTML = `추석 연휴 닷새, 맡은 집이 여섯 곳이에요.<br><b class="or">${medH.name}</b>(노령묘) 집을 <b class="or">톡</b>! 누른 순서대로 걸어가요.`; tutB.innerHTML = SKIP; handAt(medH); }
      else {
        handAt(null);
        tutP.innerHTML = `좋아요! <b class="am">☀ 아침 집</b>은 13시 전에, <b class="pm">🌙 저녁 집</b>은 16시부터.<br>늦으면 <b class="rd">신뢰가 깎여요</b>. 다시 누르면 순서에서 빠져요.`;
        tutB.innerHTML = `<button class="ps-go" data-go>연휴 시작!</button>`;
      }
    };
    const startGame = () => {
      if (ph !== "tut") return; tutEl.classList.add("off"); handAt(null);
      const keep = queue.slice(); setupDay(); keep.forEach((i) => queue.push(i)); if (queue.length) retarget();
      ph = "pre"; phT = 0; banner(`1일차<small>${DAYN[0]} · 순서를 정해요</small>`); SFX.go(); updHomes(); updHud();
    };
    tutEl.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-skip],[data-go]")) { e.preventDefault(); e.stopPropagation(); startGame(); } });

    // ── 매 프레임 ──
    const loop = (now) => {
      if (done) return;
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; phT += dt;
      if (ph === "tut") { if (tutN === 0 && (opts.retry || phT > 0.4)) { if (opts.retry) startGame(); else tutNext(1); } }
      else if (ph === "pre") { if (phT > 0.9) { ph = "run"; phT = 0; } }
      else if (ph === "run") {
        t += dt; const hr = hourAt();
        // 걷기 → 문 앞(이르면 기다림) → 돌보기
        if (me.care > 0) { me.care -= dt; if (me.care <= 0) { me.care = 0; visit(homes[me.tgt]); } }
        else if (me.path.length) {
          let d = SPD * dt;
          while (d > 0 && me.path.length) {
            const [tx, ty] = me.path[0], ex = tx - me.x, ey = ty - me.y, L = Math.abs(ex) + Math.abs(ey);
            if (L <= d) { me.x = tx; me.y = ty; d -= L; S.walked += L; me.path.shift(); }
            else { me.x += Math.sign(ex) * Math.min(Math.abs(ex), d); me.y += Math.sign(ey) * Math.min(Math.abs(ey), d); S.walked += d; d = 0; }
          }
        } else if (me.tgt >= 0) {
          const h = homes[me.tgt];
          if (hr < openH(h)) { if (!me.wait) { me.wait = true; F.msg(`아직 일러요 · ${openH(h)}시부터`); } }
          else { me.wait = false; me.care = CARE; tone(520, 0.06, "sine", 0.08); }
        }
        if (Math.floor(hr) !== Math.floor(hr - (dt * (H1 - H0)) / DAY) && hr >= 20) SFX.tick();
        if (t >= dayLen()) endDay();
        updHomes(); updHud();
      } else if (ph === "night") {
        if (phT > 1.4) { if (day >= DAYS - 1) over(); else { night.classList.remove("on"); day++; setupDay(); ph = "pre"; phT = 0; banner(`${day + 1}일차<small>${DAYN[day]}${DAYSTART[day] > H0 ? ` · 차례 지내고 ${DAYSTART[day]}시 출발` : ""}</small>`); SFX.go(); } }
      }
      // 나·길 그리기
      const [mx, my] = P(me.x, me.y); meEl.style.left = mx + "px"; meEl.style.top = my + "px";
      const walking = ph === "run" && me.path.length > 0, mc = "ps-me" + (walking ? " walk" : "") + (me.wait ? " wait" : "") + (me.care > 0 ? " care" : "");
      if (meEl.className !== mc) meEl.className = mc;
      meB.textContent = me.wait ? "⏳" : me.care > 0 ? "💛" : "";
      gO.clearRect(0, 0, sw, sh);
      if (queue.length && ph !== "night" && ph !== "over") {
        let x = me.x, y = me.y; gO.lineCap = "round"; gO.lineJoin = "round";
        queue.forEach((qi, k) => {
          const h = homes[qi], pts = k === 0 && me.path.length ? me.path : route(x, y, h.c, h.r);
          gO.strokeStyle = k === 0 ? "#ffb36bdd" : "#ffb36b66"; gO.lineWidth = k === 0 ? 4 : 3; gO.setLineDash(k === 0 ? [] : [6, 6]);
          gO.beginPath(); gO.moveTo(...P(x, y)); pts.forEach(([a, b]) => gO.lineTo(...P(a, b))); gO.stroke();
          x = h.c; y = h.r;
        });
        gO.setLineDash([]);
      }
      raf = requestAnimationFrame(loop);
    };

    if (dbg) dbg.petsit1 = {
      homes, S, me, queue,
      st: () => ({ ph, day, t: +t.toFixed(2), hr: ph === "run" ? +hourAt().toFixed(2) : DAYSTART[day], q: queue.slice(), trust: homes.map((h) => h.trust), on: S.on, late: S.late, miss: S.miss }),
      tap: (i) => tapHome(homes[i]), start: startGame,
      // 시험용 자동 순서: 아침 집 → 언제든 → 저녁 집, 같은 무리 안에서는 가까운 순
      auto: () => {
        if (ph === "tut") startGame();
        const todo = homes.filter((h) => h.need && !h.done && !queue.includes(h.i)), rank = { am: 0, any: 1, pm: 2 };
        let x = me.x, y = me.y;
        todo.sort((a, b) => rank[a.win] - rank[b.win]);
        const out = [];
        for (const w of ["am", "any", "pm"]) {
          const grp = todo.filter((h) => h.win === w);
          while (grp.length) { grp.sort((a, b) => Math.abs(a.c - x) + Math.abs(a.r - y) - (Math.abs(b.c - x) + Math.abs(b.r - y))); const h = grp.shift(); out.push(h); x = h.c; y = h.r; }
        }
        out.forEach((h) => tapHome(h));
      },
    };
    setupDay(); updHomes(); updHud();
    raf = requestAnimationFrame(loop);
  },
};
