// 미니게임 2탄(cs2) "모의면접 코칭": 컨설턴트가 되어 멘티의 모의면접을 코칭한다.
// 도트 면접장(가로 100칸 x 세로 74칸)을 정수배로 키워 그린다. 면접관 3명은 uSpec/uSprite 로 만든 앉은 모습 + 정장·손·펜 덧그림.
// 3문항: ① 질문 의도 고르기 → ② 답 카드 6장 중 3장을 "결론 → 근거 사례 → 회사 연결" 순서로.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite } from "../mg.js";

const W = 100, H = 74, DESK = 40, SPR_TOP = 20;
const IV_X = [18, 42, 66]; // 면접관 스프라이트 왼쪽 x (가운데 = +8)
const ROLE = ["결론", "근거 사례", "회사 연결"];
const GOOD_SAY = ["두괄식 좋네", "숫자 좋네", "우리한테 이익!"];
// 함정 카드 종류: 꼬리표, 면접관 혼잣말, 반응(tilt 갸웃 / pen 펜 내려놓기)
const TRAP = {
  서두: { tag: "장황한 서두", say: "본론은요?", r: "pen" },
  AI: { tag: "AI 티", say: "어디서 본 말인데…", r: "tilt" },
  막연: { tag: "숫자 없음", say: "그래서 얼마나?", r: "tilt" },
  무관: { tag: "회사와 무관", say: "우리랑 무슨 상관?", r: "pen" },
  남탓: { tag: "남 탓", say: "남 탓이네…", r: "pen" },
};
// 문항: q 질문, it [진짜 의도, 오답, 오답], g [결론, 근거, 연결], t [[함정 종류, 문장]…]
const QS = [
  { q: "1분 자기소개 해 보세요.", it: ["우리 직무에 맞는 사람인지 첫인상으로 보려는 것", "살아온 이야기를 처음부터 듣고 싶은 것", "말을 얼마나 길게 할 수 있는지 보려는 것"],
    g: ["숫자로 매출 문제를 찾는 지원자입니다.", "인턴 때 재고 데이터를 정리해 폐기율을 12% 줄였습니다.", "이 힘으로 우리 회사 영업 현장의 손실을 줄이겠습니다."],
    t: [["서두", "저는 화목한 가정의 장남으로 태어나…"], ["AI", "끊임없이 도전하는 열정적인 인재입니다."], ["막연", "여러 경험을 통해 많이 성장했습니다."], ["무관", "취미는 주말마다 산에 오르는 것입니다."]] },
  { q: "우리 회사에 왜 지원했나요?", it: ["우리 회사를 고른 진짜 이유와 오래 다닐 사람인지", "회사 연혁을 얼마나 외워 왔는지", "연봉을 얼마나 기대하는지"],
    g: ["꾸준히 크는 사업에서 오래 일하고 싶어 지원했습니다.", "최근 3년 매출이 해마다 10% 넘게 큰 걸 직접 확인했습니다.", "그 성장 현장에서 거래처 관리로 매출을 받치겠습니다."],
    t: [["서두", "어릴 때부터 이 회사 광고를 보며 자랐는데요…"], ["AI", "귀사의 비전에 깊이 공감하여 함께 성장하고 싶습니다."], ["무관", "집에서 가깝고 복지가 좋다고 들었습니다."], ["남탓", "전 회사가 비전이 없어서 나왔습니다."]] },
  { q: "팀에서 갈등을 겪은 적 있나요?", it: ["갈등을 피하지 않고 어떻게 풀어 내는지", "갈등이 한 번도 없었는지", "누가 잘못했는지 가려내는 눈"],
    g: ["의견이 갈릴 때 숫자로 기준부터 맞춰 풀었습니다.", "공모전 때 두 안을 설문 120명으로 비교해 하루 만에 합의했습니다.", "부서 간 이견이 많은 실무에서도 기준부터 맞추겠습니다."],
    t: [["남탓", "팀원 한 명이 무책임해서 제가 다 했습니다."], ["AI", "소통과 배려로 원활한 팀워크를 이끌었습니다."], ["막연", "대화를 많이 해서 잘 풀었습니다."], ["서두", "사람마다 생각이 다르다는 것부터 말씀드리면…"]] },
  { q: "가장 크게 실패한 경험은요?", it: ["실패를 인정하고 무엇을 바꿨는지", "실패한 적 없는 완벽한 사람인지", "얼마나 크게 망해 봤는지"],
    g: ["준비 없이 덤벼 첫 장터 판매에서 적자를 냈습니다.", "그 뒤 원가표를 만들어 두 번째엔 30만 원 흑자를 냈습니다.", "입사 후에도 숫자로 먼저 따져 보고 움직이겠습니다."],
    t: [["남탓", "날씨와 자리가 안 좋아서 어쩔 수 없었습니다."], ["AI", "실패를 두려워하지 않는 도전 정신을 길렀습니다."], ["막연", "그 경험으로 정말 많은 것을 배웠습니다."], ["무관", "사실 실패라기보다 좋은 추억이었습니다."]] },
  { q: "입사하면 뭘 하고 싶어요?", it: ["앞으로 회사에 줄 수 있는 이익", "언제쯤 승진하고 싶은지", "개인 꿈이 얼마나 큰지"],
    g: ["3년 안에 담당 거래처 매출을 키우는 사람이 되겠습니다.", "인턴 때 거래처 20곳 주문 주기를 정리해 재주문을 늘렸습니다.", "그 방식으로 우리 회사 신규 거래처를 빨리 안착시키겠습니다."],
    t: [["AI", "회사와 함께 성장하는 글로벌 인재가 되겠습니다."], ["무관", "5년 뒤엔 해외 대학원에 가고 싶습니다."], ["막연", "열심히 배워서 꼭 필요한 사람이 되겠습니다."], ["서두", "포부라고 하면 거창하지만 제 인생 목표부터…"]] },
  { q: "우리 회사 단점이 뭐라고 생각해요?", it: ["회사를 진짜 공부했는지, 균형 잡힌 눈인지", "회사 욕을 할 배짱이 있는지", "단점이 없다고 말하는지"],
    g: ["젊은 고객층 인지도가 경쟁사보다 낮은 점입니다.", "20대 지인 30명에게 물어보니 절반이 브랜드를 몰랐습니다.", "그래서 온라인 채널 매출을 키우는 데 힘을 보태겠습니다."],
    t: [["남탓", "직원 후기에 야근이 많다던데 그게 제일 걱정입니다."], ["AI", "단점보다 무한한 가능성이 더 크다고 생각합니다."], ["막연", "조금 보수적인 느낌이 있는 것 같습니다."], ["서두", "제가 감히 말씀드려도 될지 모르겠지만…"]] },
  { q: "왜 이 직무를 골랐나요?", it: ["직무를 정확히 알고, 붙어서 버틸 사람인지", "다른 직무는 지원 안 했는지", "전공과 딱 맞는지만"],
    g: ["숫자로 현장을 움직이는 일이 제게 맞아 골랐습니다.", "현직자 3명을 만나 하루 업무를 듣고 엑셀 자격도 땄습니다.", "입사 첫해부터 실적 보고를 맡을 수 있게 준비했습니다."],
    t: [["막연", "사람 만나는 걸 좋아해서 잘 맞을 것 같습니다."], ["AI", "직무 역량을 바탕으로 시너지를 창출하겠습니다."], ["무관", "다른 직무는 다 떨어져서 지원했습니다."], ["서두", "직무 얘기 전에 제 성격부터 말씀드리면…"]] },
  { q: "마지막으로 하고 싶은 말 있나요?", it: ["끝까지 회사에 줄 이익을 말하는지", "감사 인사를 얼마나 길게 하는지", "궁금한 게 있는지만"],
    g: ["오늘 말씀드린 데이터 정리력, 첫 달부터 쓰겠습니다.", "준비하며 우리 회사 제품 15개 가격을 직접 비교해 봤습니다.", "그 표를 들고 첫 거래처 미팅부터 바로 뛰겠습니다."],
    t: [["서두", "오늘 정말 떨렸는데요, 사실 아침에 지하철에서…"], ["AI", "뽑아 주신다면 최선을 다하는 인재가 되겠습니다."], ["막연", "꼭 붙고 싶습니다. 정말 열심히 하겠습니다."], ["남탓", "앞 면접자분들보다는 제가 낫다고 생각합니다."]] },
];
const TIPS = { it: "의도를 먼저 짚어야 답이 맞아요", c0: "첫 문장에 결론부터!", c1: "근거엔 사실과 숫자", c2: "끝은 회사에 줄 이익으로", ok: "결론 → 근거 → 회사, 완벽해요" };

// 이 게임 CSS
const CSS = `
.mg-cs2 .mg-steps img{width:auto;height:62px;image-rendering:pixelated}
.mg-cs2in{position:absolute;inset:0;display:flex;flex-direction:column;background:#151827;padding:8px 8px 8px}
.mg-cs2ki{flex:0 0 auto;display:flex;align-items:center;gap:7px;margin-bottom:6px;font-size:11.5px;font-weight:800;color:#ffe7a0}
.mg-cs2ki i{flex:1;height:12px;background:#0b0d18;border:2px solid #2c3150;position:relative;overflow:hidden;image-rendering:pixelated}
.mg-cs2ki i em{position:absolute;left:0;top:0;bottom:0;width:var(--k,40%);background:var(--kc,#f5c04e);transition:width .35s steps(8),background .3s;box-shadow:inset 0 -3px 0 #0003,inset 0 2px 0 #fff4}
.mg-cs2ki i::after{content:"";position:absolute;left:60%;top:-2px;bottom:-2px;width:2px;background:#fff9}
.mg-cs2ki b{min-width:28px;text-align:right;color:#fff}
.mg-cs2ki.up i{animation:mgcs2up .35s}.mg-cs2ki.dn i{animation:mgshake .3s}
@keyframes mgcs2up{50%{box-shadow:0 0 10px #5fe0a0}}
.mg-cs2sc{position:relative;flex:0 0 auto;align-self:center;border:3px solid #0b0d18;box-shadow:0 0 0 2px #2c3150}
.mg-cs2sc canvas{display:block;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none}
.mg-cs2pl{position:absolute;transform:translate(-50%,-50%);color:#2a2620;font-weight:900;letter-spacing:-.5px;white-space:nowrap;pointer-events:none;line-height:1}
.mg-cs2q{position:absolute;left:4%;right:4%;top:4%;background:#fff;color:#1d1d22;border-radius:6px;padding:6px 9px;font-size:13.5px;font-weight:800;line-height:1.35;box-shadow:0 0 0 2px #1b1b22,0 3px 0 2px #0006;opacity:0;transform:translateY(-6px) scale(.9);transition:opacity .18s,transform .18s;pointer-events:none;min-height:2.2em}
.mg-cs2q.on{opacity:1;transform:none}
.mg-cs2q::after{content:"";position:absolute;top:100%;left:var(--tx,50%);margin-left:-6px;border:6px solid transparent;border-top:7px solid #fff;filter:drop-shadow(0 2px 0 #1b1b22)}
.mg-cs2q small{display:block;font-size:10.5px;color:#7a7f99;font-weight:700}
.mg-cs2bub{position:absolute;transform:translate(-50%,-100%);background:#fff;color:#111;font-weight:900;font-size:11.5px;padding:3px 7px;border-radius:7px;white-space:nowrap;box-shadow:0 0 0 2px #1b1b22;animation:mgbub 1.3s ease-out forwards;pointer-events:none;z-index:4}
.mg-cs2bub.bad{background:#ffe0e0;color:#c00}.mg-cs2bub.ok{background:#dfffe9;color:#0a6a3a}
.mg-cs2stamp{position:absolute;left:50%;top:32%;z-index:6;width:38%;aspect-ratio:1;border-radius:50%;border:5px double #e0312f;color:#e0312f;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(22px,8vw,36px);background:#fff3;transform:translate(-50%,-50%) rotate(-14deg);animation:mgcs2st .45s cubic-bezier(.3,1.6,.5,1) both;text-shadow:0 0 1px #e0312f;pointer-events:none}
.mg-cs2stamp.hold{color:#8a90ad;border-color:#8a90ad}
@keyframes mgcs2st{0%{transform:translate(-50%,-50%) scale(3) rotate(-40deg);opacity:0}70%{transform:translate(-50%,-50%) scale(.9) rotate(-14deg);opacity:1}100%{transform:translate(-50%,-50%) scale(1) rotate(-14deg)}}
.mg-cs2say{position:absolute;transform:translate(-50%,-100%);background:#ffd166;color:#2a1a00;font-weight:900;font-size:14px;padding:5px 10px;border-radius:10px;white-space:nowrap;box-shadow:0 0 0 2px #1b1b22,0 3px 0 2px #0006;z-index:7;animation:mgcs2say .4s cubic-bezier(.3,1.6,.5,1) both;pointer-events:none}
.mg-cs2say.sad{background:#e8eaf3;color:#3a3f5a}
@keyframes mgcs2say{from{transform:translate(-50%,-60%) scale(.3);opacity:0}}
.mg-cs2pn{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:6px;margin-top:8px;overflow:auto}
.mg-cs2hd{font-size:12px;color:#c9cde6;font-weight:800;display:flex;gap:6px;align-items:baseline}
.mg-cs2hd em{font-style:normal;color:#141726;background:#f5c04e;border-radius:4px;padding:1px 6px;font-size:11px;flex:0 0 auto}
.mg-cs2hd span{color:#fff;font-size:12.5px}
.mg-cs2it{display:flex;flex-direction:column;gap:6px}
.mg-cs2it button{text-align:left;background:#f3f1ea!important;color:#22252f!important;border-radius:6px;padding:9px 10px;font-size:13px;font-weight:700;line-height:1.35;box-shadow:0 0 0 2px #0b0d18,0 3px 0 2px #0b0d18;animation:mgcs2in .3s ease-out both}
.mg-cs2it button:nth-child(2){animation-delay:.06s}.mg-cs2it button:nth-child(3){animation-delay:.12s}
.mg-cs2it button:active{transform:translateY(2px)}
.mg-cs2it button.ok{background:#5fe0a0!important;color:#0b2a1a!important}.mg-cs2it button.ng{background:#ff8a96!important;color:#3a0008!important}
.mg-cs2it button:disabled{opacity:.55}.mg-cs2it button.ok:disabled,.mg-cs2it button.ng:disabled{opacity:1}
@keyframes mgcs2in{from{transform:translateY(10px);opacity:0}}
.mg-cs2sl{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.mg-cs2sl div{border:2px dashed #3a4068;border-radius:6px;padding:4px 5px;min-height:38px;font-size:10.5px;color:#8a90ad;line-height:1.25;overflow:hidden;position:relative}
.mg-cs2sl div b{display:block;font-size:11px;color:#c9cde6}
.mg-cs2sl div.nx{border-color:#f5c04e;color:#f5c04e;animation:mgcs2nx .9s ease-in-out infinite}
@keyframes mgcs2nx{50%{border-color:#f5c04e55}}
.mg-cs2sl div.f{border-style:solid;color:#22252f;background:#f3f1ea;animation:mgcs2in .25s ease-out}
.mg-cs2sl div.f b{color:#22252f}
.mg-cs2sl div.f span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mg-cs2sl div.g1{background:#d6f8e4;border-color:#3cbf7a}.mg-cs2sl div.g2{background:#fff1c9;border-color:#e0a030}.mg-cs2sl div.g0{background:#ffdfe3;border-color:#ff5a6a}
.mg-cs2sl div i{position:absolute;right:3px;top:2px;font-style:normal;font-weight:900;font-size:10px;background:#0b0d18;color:#fff;border-radius:3px;padding:0 3px}
.mg-cs2cd{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mg-cs2cd button{text-align:left;background:#fbf7ee!important;color:#2a2620!important;border-radius:6px;padding:6px 8px;font-size:12px;font-weight:700;line-height:1.38;min-height:52px;box-shadow:0 0 0 2px #0b0d18,0 3px 0 2px #0b0d18;animation:mgcs2in .3s ease-out both}
.mg-cs2cd button:nth-child(2){animation-delay:.04s}.mg-cs2cd button:nth-child(3){animation-delay:.08s}.mg-cs2cd button:nth-child(4){animation-delay:.12s}.mg-cs2cd button:nth-child(5){animation-delay:.16s}.mg-cs2cd button:nth-child(6){animation-delay:.2s}
.mg-cs2cd button:active{transform:translateY(2px)}
.mg-cs2cd button.used{visibility:hidden}
.mg-cs2cd button.fly{animation:mgcs2fly .25s ease-in forwards}
@keyframes mgcs2fly{to{transform:translateY(-40px) scale(.6);opacity:0}}
.mg-cs2sum{background:#0b0d18;border:2px solid #2c3150;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;animation:mgcs2in .25s ease-out}
.mg-cs2sum div{display:flex;flex-wrap:wrap;gap:4px}
.mg-cs2sum span{font-size:11.5px;font-weight:800;border-radius:4px;padding:2px 6px;background:#2c3150;color:#c9cde6}
.mg-cs2sum span.o{background:#1f5a3c;color:#a8ffd0}.mg-cs2sum span.x{background:#5a1f2a;color:#ffb0ba}.mg-cs2sum span.h{background:#5a4a1f;color:#ffe08a}
.mg-cs2sum p{margin:0;font-size:12.5px;color:#ffe7a0;font-weight:800}
@media (max-height:680px){.mg-cs2cd button{font-size:11.5px;min-height:46px;padding:5px 7px}.mg-cs2it button{padding:7px 9px;font-size:12.5px}.mg-cs2q{font-size:12.5px}}
`;

// ── 도트 그리기 도구 ──
function mkCv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function outline(c) {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, Wc = c.width, Hc = c.height;
  const on = (x, y) => x >= 0 && y >= 0 && x < Wc && y < Hc && a[(y * Wc + x) * 4 + 3] > 0, add = [];
  for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) add.push((y * Wc + x) * 4);
  for (const i of add) { a[i] = 22; a[i + 1] = 22; a[i + 2] = 32; a[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
}
// 면접장 배경(벽·창·시계 자리·현판·화분·바닥) + 책상 층
function csBg() {
  const c = mkCv(W, H), g = c.getContext("2d"), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 벽
  P(0, 0, W, 38, "#d9dde8"); for (let x = 0; x < W; x += 12) P(x, 0, 1, 30, "#ccd1de");
  P(0, 30, W, 8, "#b9a07c"); P(0, 30, W, 1, "#d6bf98"); P(0, 37, W, 1, "#8a6e4a"); // 징두리 나무판
  P(0, 0, W, 2, "#aeb4c6");
  // 왼쪽 창(블라인드)
  P(3, 4, 18, 22, "#7a8296"); P(4, 5, 16, 20, "#a9d4f2"); for (let y = 6; y < 25; y += 2) P(4, y, 16, 1, "#e9f3fb"); P(4, 5, 16, 1, "#5f677a"); P(11, 5, 1, 20, "#7a8296"); P(3, 26, 18, 2, "#aeb4c6");
  // 가운데 현판: "우리 회사" 상징(마름모 로고 + 글자 줄)
  P(34, 5, 32, 11, "#2f3d5c"); P(34, 5, 32, 1, "#4a5a80"); P(34, 15, 32, 1, "#1f2a40");
  P(38, 9, 3, 3, "#f5c04e"); P(39, 8, 1, 5, "#f5c04e"); P(37, 10, 5, 1, "#f5c04e"); P(39, 10, 1, 1, "#fff3b0");
  P(44, 8, 18, 1, "#cfd8f0"); P(44, 10, 14, 1, "#cfd8f0"); P(44, 12, 16, 1, "#8fa0c8");
  // 오른쪽 시계 판(바늘은 매 프레임)
  P(84, 6, 9, 9, "#3a3f4a"); P(85, 5, 7, 11, "#3a3f4a"); P(85, 7, 7, 7, "#fbfbf6"); P(86, 6, 5, 9, "#fbfbf6"); P(88, 6, 1, 1, "#3a3f4a"); P(88, 14, 1, 1, "#3a3f4a"); P(85, 10, 1, 1, "#3a3f4a"); P(91, 10, 1, 1, "#3a3f4a");
  // 화분(오른쪽 구석)
  P(92, 22, 3, 5, "#3e9e5a"); P(95, 20, 4, 6, "#4fbe6a"); P(90, 25, 4, 4, "#3e9e5a"); P(96, 21, 1, 3, "#8fe09a"); P(93, 28, 6, 2, "#2f7a3e"); P(92, 30, 8, 2, "#d8784a"); P(93, 32, 6, 6, "#c0603a"); P(97, 32, 2, 6, "#9a4a2a");
  // 바닥 카펫
  P(0, 38, W, H - 38, "#59627a"); for (let y = 40; y < H; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < W; x += 8) P(x, y, 1, 1, "#646e88");
  P(0, 38, W, 1, "#454d62");
  // 왼쪽 서류장 끝(책상 뒤)
  P(0, 18, 4, 20, "#8a94a6"); P(0, 18, 4, 1, "#aeb4c6"); P(1, 24, 2, 1, "#5f677a"); P(1, 31, 2, 1, "#5f677a");
  return c;
}
function csDesk() {
  const c = mkCv(W, H), g = c.getContext("2d"), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  P(6, DESK, 88, 4, "#c79a62"); P(6, DESK, 88, 1, "#e3bd86"); P(6, DESK + 3, 88, 1, "#a87c4a");
  P(7, DESK + 4, 86, 10, "#8a5e36"); P(7, DESK + 4, 86, 1, "#6e4a2a"); for (const x of [7, 36, 64, 92]) P(x, DESK + 4, 1, 10, "#6e4a2a");
  P(7, DESK + 13, 86, 1, "#5a3c22"); P(5, DESK, 1, 4, "#a87c4a"); P(94, DESK, 1, 4, "#a87c4a");
  // 서류(면접관 앞)
  for (const x of IV_X) { P(x + 3, DESK + 1, 10, 3, "#f6f6f2"); P(x + 4, DESK + 2, 6, 1, "#b8bccb"); P(x + 12, DESK + 1, 1, 3, "#dcdcd6"); }
  // 물컵
  for (const x of [37, 61]) { P(x, DESK - 3, 3, 4, "#cfe8ff"); P(x, DESK - 3, 3, 1, "#ffffff"); P(x + 2, DESK - 2, 1, 3, "#9ec4e8"); }
  // 명패
  for (const x of IV_X) { const cx = x + 8; P(cx - 8, DESK + 6, 16, 6, "#f4f1e8"); P(cx - 8, DESK + 6, 16, 1, "#ffffff"); P(cx - 8, DESK + 11, 16, 1, "#cfc8b4"); P(cx - 9, DESK + 6, 1, 6, "#3a2a1a"); P(cx + 8, DESK + 6, 1, 6, "#3a2a1a"); }
  return c;
}
// 멘티: 뒷모습(앉음) / 앞모습(만세) 32x26 칸
function csMentee(sp, front) {
  const c = mkCv(32, 26), g = c.getContext("2d"), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const { skin, hair, suit, suit2, long } = sp;
  if (!front) {
    P(4, 13, 24, 13, suit); P(5, 12, 22, 1, suit); P(6, 11, 20, 1, suit); P(15, 13, 2, 13, suit2); P(4, 13, 1, 13, suit2); P(27, 13, 1, 13, suit2);
    P(12, 10, 8, 2, "#f2f2f2"); P(13, 9, 6, 1, skin);
    P(10, 0, 12, 10, hair); P(9, 2, 14, 7, hair); P(11, 0, 10, 1, shade(hair, 1.25)); P(12, 1, 3, 1, shade(hair, 1.4));
    P(8, 4, 1, 3, skin); P(23, 4, 1, 3, skin);
    if (long) { P(12, 9, 8, 5, hair); P(13, 14, 6, 1, hair); } else P(11, 9, 10, 1, shade(hair, 0.8));
  } else {
    // 만세: 팔을 위로
    P(2, 2, 3, 12, suit); P(27, 2, 3, 12, suit); P(2, 0, 3, 2, skin); P(27, 0, 3, 2, skin);
    P(5, 13, 22, 13, suit); P(6, 12, 20, 1, suit); P(13, 13, 6, 6, "#f2f2f2"); P(15, 14, 2, 6, "#c94f4f"); P(12, 13, 1, 8, suit2); P(19, 13, 1, 8, suit2);
    P(10, 1, 12, 10, skin); P(9, 0, 14, 3, hair); P(9, 3, 2, long ? 9 : 4, hair); P(21, 3, 2, long ? 9 : 4, hair);
    P(12, 5, 2, 1, "#222"); P(18, 5, 2, 1, "#222"); P(11, 4, 1, 1, "#222"); P(14, 4, 1, 1, "#222"); P(17, 4, 1, 1, "#222"); P(20, 4, 1, 1, "#222"); // ^^ 눈
    P(14, 7, 4, 2, "#a8323a"); P(15, 8, 2, 1, "#ff8a96"); P(11, 7, 2, 1, "#ff9aa8"); P(19, 7, 2, 1, "#ff9aa8");
    P(13, 11, 6, 1, skin);
  }
  return outline(c);
}
const shade = (col, f = 0.75) => { const n = parseInt(col.slice(1), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
// 면접관: 정장 입은 직장인
function csInterviewer(i) {
  const s = uSpec("worker");
  s.shirt = "#eef0f4"; s.shirt2 = "#c9ccd6"; s.pack = null; s.hat = null; s.hood = null;
  if (i === 1) { s.hair = pick(["#9e9e9e", "#bdbdbd", "#7a7a7a"]); s.style = pick(["short", "buzz"]); s.glasses = true; }
  return { p: { spec: s, cache: {} }, spec: s, jk: i === 1 ? "#2a2f3a" : pick(["#2f3d5c", "#3a3a42", "#4a4a52", "#5a4630", "#3d4a3a"]), tie: pick(["#c94f4f", "#3a6ea5", "#8a5fc0", "#e0a030", "#2f7a5a"]), x: IV_X[i], r: null, rT: 0, pen: "hold", talk: 0, mark: null, markT: 0 };
}

export const GAME = {
  key: "cs2", base: "cs", n: "모의면접 코칭", desc: "멘티 모의면접, 면접관 마음을 읽고 답을 짜 줘요",
  how: ["면접관이 질문해요. 먼저 <b>면접관이 정말 확인하려는 것</b>(질문 의도)을 3개 중에서 골라요.", "답 카드 6장 중 3장을 <b>결론 → 근거 사례 → 회사 연결</b> 순서로 톡톡. 두괄식, 사실과 숫자, 회사에 줄 이익이 정답이에요.", "함정 카드 조심! 장황한 서두, AI 티 나는 상투어, 숫자 없는 말, 회사와 무관한 말, 남 탓. 시간이 줄면 멘티가 땀을 흘려요."],
  steps: () => {
    const mk = (w, h, fn) => { const c = mkCv(w, h), g = c.getContext("2d"); fn(g, (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return `<img src="${c.toDataURL()}" alt="" style="width:${w * 2}px;height:${h * 2}px">`; };
    const iv = csInterviewer(0), spr = uSprite(iv.p, "f", { v: "f" }, false);
    const a = mk(30, 31, (g, P) => {
      g.drawImage(spr, 7, 6); P(11, 21, 2, 5, iv.jk); P(17, 21, 2, 5, iv.jk); P(14, 22, 2, 4, iv.tie);
      P(3, 25, 24, 3, "#c79a62"); P(3, 25, 24, 1, "#e3bd86"); P(4, 28, 22, 3, "#8a5e36");
      P(20, 0, 9, 9, "#16161f"); P(21, 1, 7, 7, "#fff"); P(23, 2, 3, 1, "#e0312f"); P(25, 3, 1, 2, "#e0312f"); P(24, 5, 1, 1, "#e0312f"); P(24, 7, 1, 1, "#e0312f"); P(21, 8, 2, 2, "#fff");
    });
    const b = mk(30, 31, (g, P) => {
      const col = ["#5fe0a0", "#f5c04e", "#6aa8ff"];
      for (let k = 0; k < 3; k++) { const y = 2 + k * 10; P(2 + k * 3, y, 22, 8, "#16161f"); P(3 + k * 3, y + 1, 20, 6, "#fbf7ee"); P(3 + k * 3, y + 1, 4, 6, col[k]); P(4 + k * 3, y + 2, 2, 1, "#16161f"); P(8 + k * 3, y + 3, 12, 1, "#b8b0a0"); P(8 + k * 3, y + 5, 9, 1, "#b8b0a0"); }
      P(26, 6, 1, 18, "#e0312f"); P(25, 22, 3, 1, "#e0312f"); P(26, 23, 1, 2, "#e0312f");
    });
    const c = mk(30, 31, (g, P) => {
      const R = "#e0312f";
      for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) { const d = Math.hypot(x - 14.5, y - 14.5); if ((d > 12 && d < 14.5) || (d > 9.5 && d < 10.6)) P(x, y, 1, 1, R); }
      P(9, 14, 2, 2, R); P(11, 16, 2, 2, R); P(13, 18, 2, 2, R); P(15, 16, 2, 2, R); P(17, 14, 2, 2, R); P(19, 12, 2, 2, R); P(21, 10, 1, 2, R);
    });
    return [[a, "의도 고르기"], [b, "결론→근거→회사"], [c, "합격 도장"]];
  },
  css: CSS,
  run(host, ez, finish) {
    const dbg = typeof window !== "undefined" && window.__mgdbg ? window.__mgdbg : null, auto = dbg && dbg.cs2;
    const N = 3, PER = 15 * ez, qs = shuffle(QS).slice(0, N);
    const F = frame(host, "cs2", "모의면접 코칭", "");
    F.stage.insertAdjacentHTML("beforeend", `<div class="mg-cs2in"><div class="mg-cs2ki"><span>합격 기운</span><i><em></em></i><b>40</b></div>
      <div class="mg-cs2sc"><canvas width="${W}" height="${H}"></canvas><div class="mg-cs2q"></div></div><div class="mg-cs2pn"></div></div>`);
    const IN = F.stage.querySelector(".mg-cs2in"), sc = IN.querySelector(".mg-cs2sc"), cv = sc.querySelector("canvas"), g = cv.getContext("2d");
    const qEl = sc.querySelector(".mg-cs2q"), pn = IN.querySelector(".mg-cs2pn"), kiEl = IN.querySelector(".mg-cs2ki"), kiFill = kiEl.querySelector("em"), kiNum = kiEl.querySelector("b");
    let K = 3;
    const fit = () => {
      const sw = IN.clientWidth - 16, sh = (IN.clientHeight || 440) * 0.42;
      const r = Math.min(sw / W, sh / H); K = r >= 2 ? Math.floor(r) : Math.max(1, r);
      sc.style.width = W * K + "px"; sc.style.height = H * K + "px";
      sc.querySelectorAll(".mg-cs2pl").forEach((e) => (e.style.fontSize = Math.max(8, Math.round(K * 3.1)) + "px"));
    };
    // 명패 글자
    IV_X.forEach((x) => sc.insertAdjacentHTML("beforeend", `<span class="mg-cs2pl" style="left:${(x + 8) / W * 100}%;top:${(DESK + 9) / H * 100}%">면접관</span>`));
    fit();
    const BG = csBg(), DK = csDesk();
    const ivs = [0, 1, 2].map(csInterviewer);
    const msp = { skin: pick(["#f5d0b0", "#ecc09c", "#d9a47c"]), hair: pick(["#2a2018", "#3b2a1e", "#5a3b22", "#1b1b22"]), suit: pick(["#2f3d5c", "#2c2c34", "#3a3f4a"]), long: rnd() < 0.5 };
    msp.suit2 = shade(msp.suit, 0.75);
    const MB = csMentee(msp, false), MF = csMentee(msp, true);
    // 상태
    let qi = -1, phase = "ask", el = 0, last = performance.now(), raf = 0, over = false, ki = 40, combo = 0, lastTick = -1;
    let mentee = { front: false, jump: 0, slump: 0, talk: 0 }, drops = [], confetti = [];
    const rec = []; // 문항별 { it, s:[0~1 x3], tags:[], spd }
    let cur = null, asker = 0;
    const setKi = (d) => {
      ki = clamp(ki + d, 0, 100); kiFill.style.setProperty("--k", ki + "%"); kiFill.style.setProperty("--kc", ki >= 60 ? "#5fe0a0" : ki >= 35 ? "#f5c04e" : "#ff5a6a"); kiNum.textContent = Math.round(ki);
      kiEl.classList.remove("up", "dn"); void kiEl.offsetWidth; kiEl.classList.add(d >= 0 ? "up" : "dn");
    };
    setKi(0);
    // 캔버스 좌표 → 무대 픽셀
    const toStage = (x, y) => { const r = cv.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x * r.width / W, r.top - s.top + y * r.height / H]; };
    const bub = (i, text, cls = "") => { const e = document.createElement("div"); e.className = "mg-cs2bub " + cls; e.textContent = text; e.style.left = (ivs[i].x + 8) / W * 100 + "%"; e.style.top = (SPR_TOP + 6) / H * 100 + "%"; sc.appendChild(e); setTimeout(() => e.remove(), 1300); };
    // 면접관 반응: nod 끄덕 / tilt 갸웃 / pen 펜 내려놓기
    const react = (i, r, delay = 0) => setTimeout(() => {
      if (over && r !== "nod") return; const v = ivs[i];
      v.r = r; v.rT = 0;
      if (r === "nod") { v.mark = "ok"; v.markT = 1.1; if (v.pen === "down") v.pen = "hold"; }
      else if (r === "tilt") { v.mark = "q"; v.markT = 1.1; }
      else if (r === "pen") { v.mark = "x"; v.markT = 1.3; v.pen = "down"; tone(240, 0.06, "square", 0.06); noise(0.05, 900, 0.12, 0.05); }
    }, delay);
    const all = (r, first) => { react(first, r, 0); [0, 1, 2].filter((k) => k !== first).forEach((k, j) => react(k, r, 120 + j * 110)); };

    // ── 그리기 ──
    const draw = (now) => {
      const t = now / 1000;
      g.drawImage(BG, 0, 0);
      // 시계 바늘(남은 시간 따라 분침이 돈다)
      { const a = (phase === "intent" || phase === "cards") ? el / PER * 6.283 : t * 0.2, cx = 88, cy = 10; g.fillStyle = "#3a3f4a"; g.fillRect(cx, cy - 3, 1, 3); g.fillStyle = "#e0312f"; g.fillRect(cx + Math.round(Math.sin(a) * 3), cy - Math.round(Math.cos(a) * 3), 1, 1); g.fillRect(cx + Math.round(Math.sin(a) * 2), cy - Math.round(Math.cos(a) * 2), 1, 1); }
      // 면접관
      ivs.forEach((v, i) => {
        v.rT += 1 / 60; const spr = uSprite(v.p, "f", { v: "f" }, false), x = v.x, y = SPR_TOP;
        let dx = 0, dy = 0;
        if (v.r === "nod" && v.rT < 0.9) dy = [0, 1, 1, 0, 1, 1, 0][Math.min(6, Math.floor(v.rT / 0.13))];
        else if (v.r === "tilt" && v.rT < 1.0) dx = v.rT < 0.1 ? 0 : (i === 2 ? -1 : 1);
        else if (phase === "end" && v.r === "confer") dx = i === 0 ? 1 : i === 2 ? -1 : (Math.floor(t * 3) % 2 ? 1 : -1);
        else if (v.r !== "nod" && v.r !== "tilt") dy = (Math.floor(t * 1.2 + i) % 5 === 0) ? 0 : 0;
        // 몸(아래) → 정장 → 머리(위)
        g.drawImage(spr, 0, 15, 16, 16, x, y + 15, 16, 16);
        const P = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, w, h); };
        P(3, 16, 3, 6, v.jk); P(10, 16, 3, 6, v.jk); P(2, 17, 2, 5, v.jk); P(12, 17, 2, 5, v.jk); P(6, 15, 1, 2, v.jk); P(9, 15, 1, 2, v.jk); P(7, 16, 2, 4, v.tie); P(7, 16, 2, 1, shade(v.tie, 1.3));
        g.drawImage(spr, 0, 0, 16, 15, x + dx, y + dy, 16, 15);
        const Q = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(x + dx + a, y + dy + b, w, h); }, sk = v.spec.skin, dk = "#5a2a2a";
        // 표정: 말하기 / 웃음 / 찡그림
        if (v.talk > 0) { v.talk -= 1 / 60; Q(7, 14, 2, 1, Math.floor(t * 8) % 2 ? "#7a2a2a" : shade(sk, 0.8)); }
        else if (v.mark === "ok" && v.markT > 0) { Q(7, 14, 2, 1, sk); Q(6, 13, 1, 1, dk); Q(7, 14, 2, 1, dk); Q(9, 13, 1, 1, dk); }
        else if (v.pen === "down" || v.mark === "x") { Q(5, 11, 2, 1, "#2a2018"); Q(9, 11, 2, 1, "#2a2018"); Q(7, 14, 2, 1, "#4a2a2a"); }
        // 손과 펜(책상 위)
        if (v.pen === "down") { P(5, 19, 6, 2, sk); P(4, 19, 1, 2, v.jk); P(11, 19, 1, 2, v.jk); P(10, 22, 6, 1, "#1b1b22"); P(15, 22, 1, 1, "#e0312f"); }
        else {
          const wr = (phase === "cards" && Math.floor(t * 6 + i * 2) % 3 === 0) ? 1 : 0;
          P(3, 20, 3, 2, sk); P(11 + wr, 20, 3, 2, sk); P(13 + wr, 16, 1, 5, "#1b1b22"); P(13 + wr, 16, 1, 1, "#6aa8ff");
        }
        // 머리 위 표시: 초록 체크 / 노란 물음표 / 빨간 점점점
        if (v.markT > 0) {
          v.markT -= 1 / 60; const my = y - 9 + dy - (v.markT > 0.9 ? Math.round((v.markT - 0.9) * 10) : 0), mx = x + dx + 4;
          const M = (a, b, w, h, col) => { g.fillStyle = col; g.fillRect(mx + a, my + b, w, h); };
          if (v.mark === "ok") { M(-1, -1, 9, 8, "#16161f"); M(0, 0, 7, 6, "#5fe0a0"); M(1, 2, 1, 2, "#fff"); M(2, 3, 1, 2, "#fff"); M(3, 3, 1, 1, "#fff"); M(4, 2, 1, 1, "#fff"); M(5, 1, 1, 1, "#fff"); }
          else if (v.mark === "q") { M(1, -1, 6, 9, "#16161f"); M(2, 0, 4, 1, "#ffd166"); M(5, 1, 1, 2, "#ffd166"); M(4, 3, 1, 1, "#ffd166"); M(3, 4, 1, 1, "#ffd166"); M(3, 6, 1, 1, "#ffd166"); M(1, 1, 1, 1, "#ffd166"); }
          else if (v.mark === "x") { M(-1, 1, 10, 5, "#16161f"); M(0, 3, 2, 1, "#ff5a6a"); M(3, 3, 2, 1, "#ff5a6a"); M(6, 3, 2, 1, "#ff5a6a"); M(0, 2, 8, 1, "#3a1a22"); M(0, 4, 8, 1, "#3a1a22"); }
          if (v.markT <= 0) { v.mark = null; if (v.r !== "confer") v.r = null; }
        }
      });
      g.drawImage(DK, 0, 0);
      // 멘티
      const left = (phase === "intent" || phase === "cards") ? 1 - el / PER : 1;
      let mx = 34, my = 52, shake = 0;
      if (left < 0.25 && (phase === "intent" || phase === "cards")) shake = Math.floor(t * 14) % 2;
      if (mentee.talk > 0) { mentee.talk -= 1 / 60; my += Math.floor(t * 10) % 2; }
      if (mentee.front) { const jt = mentee.jump; my -= Math.round(Math.abs(Math.sin(jt * 7)) * 5); mentee.jump += 1 / 60; g.drawImage(MF, mx, my); }
      else { my += mentee.slump; g.drawImage(MB, mx + shake, my); }
      g.fillStyle = "#3a3f4a"; g.fillRect(36, 68, 28, 6); g.fillStyle = "#5a6070"; g.fillRect(36, 68, 28, 1); g.fillStyle = "#2a2e36"; g.fillRect(36, 73, 28, 1); g.fillRect(49, 69, 2, 5);
      // 긴장 땀방울: 남은 시간이 절반 아래면 흐르고, 1/4 아래면 펑펑
      if (!mentee.front && (phase === "intent" || phase === "cards") && left < 0.55 && !RM()) {
        const rate = left < 0.25 ? 0.16 : 0.05;
        if (rnd() < rate) drops.push({ x: pick([mx + 7, mx + 8, mx + 24, mx + 25]) + shake, y: my + 2 + rint(4), v: 0 });
      }
      drops = drops.filter((d) => { d.v += 0.02; d.y += 0.25 + d.v; g.fillStyle = "#16161f"; g.fillRect(d.x - 1, d.y - 1, 3, 4); g.fillStyle = "#8fd8ff"; g.fillRect(d.x, d.y, 1, 2); g.fillStyle = "#fff"; g.fillRect(d.x, d.y, 1, 1); return d.y < my + 16; });
      if (!mentee.front && left < 0.55 && (phase === "intent" || phase === "cards")) { // 큰 땀 한 방울(옆머리)
        const big = left < 0.25; g.fillStyle = "#16161f"; g.fillRect(mx + 25, my + 1, 4, big ? 6 : 5); g.fillStyle = "#8fd8ff"; g.fillRect(mx + 26, my + 2, 2, big ? 4 : 3); g.fillStyle = "#fff"; g.fillRect(mx + 26, my + 2, 1, 1);
      }
      // 꽃가루
      confetti = confetti.filter((p) => { p.vy += 0.03; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); return p.y < H; });
    };
    const loop = (now) => {
      if (!host.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (phase === "intent" || phase === "cards") {
        el += dt; const l = Math.max(0, PER - el);
        F.bar.style.transform = `scaleX(${clamp(l / PER, 0, 1)})`;
        const s = Math.ceil(l); if (l < 4 && s !== lastTick) { lastTick = s; SFX.tick(); }
        F.bar.parentElement.classList.toggle("warn", l < 4);
        if (l <= 0) timeUp();
      }
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    // ── 진행 ──
    const typeQ = (text, sub, i, then) => {
      const tx = (ivs[i].x + 8) / W * 100; qEl.style.setProperty("--tx", clamp((tx - 4) / 92 * 100, 8, 92) + "%");
      qEl.innerHTML = `<small>면접관</small><span></span>`; qEl.classList.add("on"); const sp = qEl.querySelector("span");
      ivs[i].talk = text.length * 0.045 + 0.2; let k = 0;
      const step = () => { if (over || !host.isConnected) return; k++; sp.textContent = text.slice(0, k); if (k % 2) tone(520 + rint(5) * 40, 0.03, "square", 0.04); if (k < text.length) setTimeout(step, 42); else setTimeout(then, 380); };
      step();
    };
    const next = () => {
      qi++; if (qi >= N) return endSeq();
      cur = qs[qi]; asker = rint(3); el = 0; lastTick = -1; phase = "ask";
      ivs.forEach((v) => { v.pen = "hold"; v.r = null; v.mark = null; });
      F.sc.textContent = `${qi + 1}/${N}문항`; F.bar.style.transform = "scaleX(1)";
      rec.push({ it: 0, s: [0, 0, 0], tags: [], spd: 0, done: false });
      pn.innerHTML = `<div class="mg-cs2hd"><em>Q${qi + 1}</em><span>면접관 질문을 듣는 중…</span></div>`;
      SFX.whoosh(); typeQ(cur.q, "", asker, showIntent);
    };
    const head = (n, t) => `<div class="mg-cs2hd"><em>${n}</em><span>${t}</span></div>`;
    const showIntent = () => {
      if (over) return; phase = "intent";
      const opts = shuffle([0, 1, 2]);
      pn.innerHTML = head("① 질문 의도", "면접관이 <b>정말</b> 확인하려는 건?") + `<div class="mg-cs2it">${opts.map((k) => `<button data-k="${k}">${cur.it[k]}</button>`).join("")}</div>`;
      pn.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => pickIntent(b)));
      if (auto) setTimeout(() => { const want = auto === "good" || (auto === "mix" && qi !== 1) ? "0" : "1"; const b = pn.querySelector(`[data-k="${want}"]`); if (b && phase === "intent") b.click(); }, 900);
    };
    const pickIntent = (b) => {
      if (phase !== "intent") return; phase = "lock";
      const ok = b.dataset.k === "0", R = rec[qi];
      pn.querySelectorAll("[data-k]").forEach((x) => { x.disabled = true; if (x.dataset.k === "0") x.classList.add("ok"); else if (x === b) x.classList.add("ng"); });
      qEl.classList.remove("on");
      if (ok) { R.it = 1; combo++; F.hit(b, 1, "#5fe0a0"); all("nod", asker); bub(asker, "그렇죠!", "ok"); setKi(8); }
      else { R.it = 0; combo = 0; F.miss(b); react(asker, "tilt"); bub(asker, "그게 아닌데…", "bad"); setKi(-8); }
      setTimeout(() => { if (!over) { phase = "cards"; showCards(); } }, ok ? 650 : 1000);
    };
    let filled = 0, deck = [];
    const showCards = () => {
      filled = 0;
      const traps = shuffle(cur.t).slice(0, 3).map(([ty, tx]) => ({ tx, role: -1, ty }));
      deck = shuffle([...cur.g.map((tx, r) => ({ tx, role: r })), ...traps]);
      pn.innerHTML = head("② 답 조합", `<b>${cur.q}</b>`) +
        `<div class="mg-cs2sl">${ROLE.map((r, k) => `<div data-s="${k}" class="${k ? "" : "nx"}"><b>${k + 1}. ${r}</b></div>`).join("")}</div>` +
        `<div class="mg-cs2cd">${deck.map((c, k) => `<button data-c="${k}">${c.tx}</button>`).join("")}</div>`;
      pn.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => pickCard(b)));
      if (auto) autoCard();
    };
    const autoCard = () => setTimeout(() => {
      if (phase !== "cards") return;
      let k = -1;
      if (auto === "good" || (auto === "mix" && filled !== 1)) k = deck.findIndex((c, j) => c.role === filled && !c.used);
      else k = deck.findIndex((c) => c.role < 0 && !c.used);
      if (k < 0) k = deck.findIndex((c) => !c.used);
      const b = pn.querySelector(`[data-c="${k}"]`); if (b) b.click(); autoCard();
    }, 700);
    const pickCard = (b) => {
      if (phase !== "cards") return;
      const c = deck[+b.dataset.c]; if (c.used) return; c.used = true;
      const s = filled++, R = rec[qi], slot = pn.querySelector(`[data-s="${s}"]`);
      b.classList.add("fly"); setTimeout(() => b.classList.add("used"), 240);
      mentee.talk = 0.6;
      let v, tag, cls, mark;
      if (c.role === s) { v = 1; tag = GOOD_SAY[s]; cls = "g1"; mark = "✓"; }
      else if (c.role >= 0) { v = 0.4; tag = "순서 뒤바뀜"; cls = "g2"; mark = "△"; }
      else { v = 0; tag = TRAP[c.ty].tag; cls = "g0"; mark = "✕"; }
      R.s[s] = v; R.tags.push(v === 1 ? null : tag);
      slot.className = "f " + cls; slot.innerHTML = `<b>${s + 1}. ${ROLE[s]}</b><span>${c.tx}</span><i>${mark}</i>`;
      const nx = pn.querySelector(`[data-s="${s + 1}"]`); if (nx) nx.classList.add("nx");
      const who = rint(3), hp = toStage(ivs[who].x + 8, SPR_TOP + 4);
      if (v === 1) { F.hit(hp, 1, "#5fe0a0"); all("nod", who); bub(who, tag, "ok"); setKi(7); }
      else if (v > 0) { tone(400, 0.12, "triangle", 0.1, -120); vib(15); react(who, "tilt"); bub(who, "순서가…?", ""); F.float(hp, "△ 순서", "bad"); setKi(2); }
      else { const T = TRAP[c.ty]; F.miss(hp); all(T.r, who); bub(who, T.say, "bad"); setKi(-9); }
      if (filled >= 3) { phase = "lock"; R.spd = clamp(1 - el / PER, 0, 1) * (R.s[0] + R.s[1] + R.s[2]) / 3; setTimeout(summary, 900); }
    };
    const timeUp = () => {
      if (phase !== "intent" && phase !== "cards") return;
      const R = rec[qi]; const wasIntent = phase === "intent"; phase = "lock";
      F.bar.parentElement.classList.remove("warn");
      qEl.classList.remove("on"); F.miss(null); all("pen", asker); bub(asker, "시간 다 됐습니다", "bad"); setKi(-10);
      R.spd = 0; if (wasIntent) R.it = 0;
      for (let k = filled; k < 3; k++) R.tags.push("시간 초과");
      mentee.slump = 1; setTimeout(() => (mentee.slump = 0), 900);
      setTimeout(summary, 1000);
    };
    const summary = () => {
      if (over) return; phase = "sum";
      const R = rec[qi], perfect = R.it === 1 && R.s.every((x) => x === 1);
      const chip = (ok, t, half) => `<span class="${ok ? "o" : half ? "h" : "x"}">${ok ? "✓" : half ? "△" : "✕"} ${t}</span>`;
      const tip = R.it !== 1 ? TIPS.it : R.s[0] < 1 ? TIPS.c0 : R.s[1] < 1 ? TIPS.c1 : R.s[2] < 1 ? TIPS.c2 : TIPS.ok;
      pn.innerHTML = head(`Q${qi + 1} 코칭`, cur.q) + `<div class="mg-cs2sum"><div>${chip(R.it === 1, "질문 의도")}${ROLE.map((r, k) => chip(R.s[k] === 1, r + (R.tags[k] ? ` · ${R.tags[k]}` : ""), R.s[k] > 0 && R.s[k] < 1)).join("")}</div><p>조로 코치: ${tip}</p></div>`;
      if (perfect) { SFX.snap(); F.float(toStage(50, 30), "완벽한 답변!"); F.burst(toStage(50, 30), "#ffd166", 14); }
      setTimeout(next, perfect ? 1500 : 1900);
    };
    // 마지막: 면접관 회의 → 합격/보류 도장 → 멘티 반응
    const endSeq = () => {
      phase = "end"; F.bar.style.transform = "scaleX(0)"; F.sc.textContent = "결과 발표";
      const qv = rec.map((R) => 0.3 * R.it + 0.6 * (R.s[0] + R.s[1] + R.s[2]) / 3 + 0.1 * R.spd);
      const score = qv.reduce((a, b) => a + b, 0) / N, pass = score >= 0.6;
      pn.innerHTML = head("결과", "면접관들이 상의 중이에요…") + `<div class="mg-cs2sum"><p>두근두근…</p></div>`;
      ivs.forEach((v) => { v.r = "confer"; v.pen = "hold"; v.mark = null; });
      for (let k = 0; k < 8; k++) noise(0.05, 300 + k * 30, 0.1, k * 0.11);
      setTimeout(() => {
        ivs.forEach((v) => (v.r = null));
        const st = document.createElement("div"); st.className = "mg-cs2stamp" + (pass ? "" : " hold"); st.textContent = pass ? "합격" : "보류"; sc.appendChild(st);
        SFX.stamp(); vib(40); F.burst(toStage(50, 30), pass ? "#ff5a6a" : "#9ea3c0", 12);
        if (pass) all("nod", 1);
      }, 1300);
      setTimeout(() => {
        const say = document.createElement("div"); say.className = "mg-cs2say" + (pass ? "" : " sad");
        say.style.left = "50%"; say.style.top = 51 / H * 100 + "%";
        if (pass) {
          mentee.front = true; mentee.jump = 0; say.textContent = "저 붙었어요!";
          for (let k = 0; k < (RM() ? 15 : 60); k++) confetti.push({ x: 50 + (rnd() - 0.5) * 20, y: 50, vx: (rnd() - 0.5) * 1.6, vy: -1.2 - rnd() * 1.4, s: rnd() < 0.3 ? 2 : 1, c: pick(["#ff5a6a", "#ffd166", "#5fe0a0", "#6aa8ff", "#c77dff", "#ffffff"]) });
          [523, 659, 784, 1046, 1318].forEach((f, k) => tone(f, 0.12, "triangle", 0.12, 0, k * 0.08)); vib([20, 40, 20]);
          F.float(toStage(50, 40), "합격!");
        } else { mentee.slump = 2; say.textContent = "다음엔 꼭 붙을게요…"; tone(330, 0.2, "triangle", 0.1, -80); tone(247, 0.3, "triangle", 0.1, -60, 0.2); }
        sc.appendChild(say);
        pn.innerHTML = head("결과", pass ? "멘티 합격! 코칭 대성공이에요" : "아쉽게 보류… 다음 연습 때 다시!") + `<div class="mg-cs2sum"><div>${rec.map((R, k) => `<span class="${qv[k] >= 0.7 ? "o" : qv[k] >= 0.4 ? "h" : "x"}">Q${k + 1} ${Math.round(qv[k] * 100)}점</span>`).join("")}</div><p>${pass ? "두괄식에 숫자, 회사 이익까지. 멘티가 웃어요!" : "결론부터, 숫자로, 회사 이익으로. 다시 해 봐요"}</p></div>`;
      }, 2000);
      setTimeout(() => {
        over = true; cancelAnimationFrame(raf);
        const nIt = rec.filter((R) => R.it === 1).length, nCard = rec.reduce((a, R) => a + R.s.filter((x) => x === 1).length, 0);
        const avg = (k) => rec.reduce((a, R) => a + R.s[k], 0) / N;
        finish(score, `${pass ? "<b>합격</b>" : "보류"} · 의도 ${nIt}/${N} · 좋은 답 카드 ${nCard}/${N * 3}`, "", [["질문 의도", nIt / N], ["두괄식 결론", avg(0)], ["사실·숫자", avg(1)], ["회사 연결", avg(2)], ["답 속도", rec.reduce((a, R) => a + R.spd, 0) / N]]);
      }, 4300);
    };
    const onR = () => { if (!host.isConnected || over) removeEventListener("resize", onR); else fit(); }; addEventListener("resize", onR);
    raf = requestAnimationFrame(loop);
    setTimeout(next, 400);
    void combo; void vib;
  },
};
