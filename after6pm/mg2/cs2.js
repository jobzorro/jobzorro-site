// 미니게임 2탄(cs2) "면접관 독심술": 컨설턴트가 되어 멘티의 모의면접을 코칭한다.
// 일러스트판: 면접관 3명은 캐릭터 그림(표정 시트: 끄덕=웃음, 갸웃=놀람, 펜 내려놓기=팔짱), 배경은 실제 회의실 그림,
// 앞쪽 멘티는 크게 보이는 뒤통수(기기 해상도 벡터), 책상·펜·명패·표시는 벡터 캔버스. 결과 때 멘티가 돌아본다(그림).
// 3문항: ① 질문 의도 고르기 → ② 답 카드 6장 중 3장을 "결론 → 근거 사례 → 회사 연결" 순서로.
// mg.js 와 서로 불러 쓰므로, 맨 위에서는 불러온 것을 바로 쓰지 않는다(함수 안에서만).
import { frame, SFX, tone, noise, vib, rnd, rint, pick, shuffle, clamp, RM, uSpec, uSprite } from "../mg.js";

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

// ── 사람 그림(3x2 표정 시트: 무표정·웃음·슬픔 / 화남(팔짱)·수줍음·놀람) ──
const EXI = { neutral: 0, smile: 1, sad: 2, angry: 3, blush: 4, surprised: 5 };
const exPos = (ex) => { const i = EXI[ex] || 0; return `${(i % 3) * 50}% ${i >= 3 ? 70.3125 : 0}%`; };
const IV_MID = ["c088", "c096"]; // 가운데: 머리 희끗한 팀장님
const IV_SIDE = ["c004", "c036", "c061", "c062", "c097", "c048", "c077"];
// 멘티: 앞모습 그림 + 뒤통수 벡터(머리 모양·색을 그림에 맞춤)
const MENTEE = [
  { k: "c037", hair: "#1c1a22", st: "short", jk: "#28314e" },
  { k: "c045", hair: "#1d1a1e", st: "bun", jk: "#1f1f26" },
  { k: "c077", hair: "#18171c", st: "short", jk: "#26304c" },
  { k: "c039", hair: "#5a3a26", st: "pony", jk: "#b8cfee", shirt: true },
  { k: "c033", hair: "#33251e", st: "long", jk: "#cdb594" },
];
const SKIN = "#f1cfb4";

// 장면 좌표(가로 100 x 세로 80). 면접관 가운데 x, 책상 윗면 y
const W = 100, H = 80, DESK = 47, IVC = [20, 50, 80];
const IVW = [24, 25.5, 24], IVT = [21, 19.5, 21];

// 이 게임 CSS
const CSS = `
.mg-cs2 .mg-steps i{width:66px;height:66px;display:flex;align-items:center;justify-content:center}
.mg-cs2 .mg-steps img{width:66px;height:66px;border-radius:12px;box-shadow:0 3px 10px #0006}
.mg-cs2 .cs2-sp{position:relative;display:block;width:66px;height:66px;border-radius:12px;overflow:hidden;background:linear-gradient(#e9ddc8,#b9a487);box-shadow:0 3px 10px #0006}
.mg-cs2 .cs2-sp span{position:absolute;left:8px;top:4px;width:50px;height:65px;background:url("img/body/c088.webp") 0 0/300% 346.15% no-repeat}
.mg-cs2 .cs2-sp b{position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff2a8,#f5b82e);color:#5a3a00;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px #0006}
.mg-cs2in{position:absolute;inset:0;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 0%,#232a44,#12152a 70%);padding:8px}
.mg-cs2ki{flex:0 0 auto;display:flex;align-items:center;gap:7px;margin-bottom:6px;font-size:11.5px;font-weight:800;color:#ffe7a0}
.mg-cs2ki i{flex:1;height:10px;background:#0b0d18;border-radius:99px;position:relative;overflow:hidden;box-shadow:inset 0 1px 3px #000c,0 0 0 1px #ffffff14}
.mg-cs2ki i em{position:absolute;left:0;top:0;bottom:0;width:var(--k,40%);border-radius:99px;background:linear-gradient(180deg,#ffffff55,transparent 55%),var(--kc,#f5c04e);transition:width .45s cubic-bezier(.3,1.3,.5,1),background .3s;box-shadow:0 0 8px var(--kc,#f5c04e)}
.mg-cs2ki i::after{content:"";position:absolute;left:60%;top:0;bottom:0;width:2px;background:#fff9}
.mg-cs2ki b{min-width:28px;text-align:right;color:#fff}
.mg-cs2ki.up i{animation:mgcs2up .35s}.mg-cs2ki.dn i{animation:mgshake .3s}
@keyframes mgcs2up{50%{box-shadow:0 0 12px #5fe0a0}}
.mg-cs2sc{position:relative;flex:0 0 auto;align-self:center;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px #000a,0 0 0 1px #ffffff1f;background:#3a3026}
.mg-cs2bg{position:absolute;inset:-3%;z-index:0;background:url("img/bg/meeting.webp") 50% 36%/cover no-repeat;filter:blur(1.4px) brightness(.86) saturate(1.05)}
.mg-cs2vg{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 70% 60% at 50% 30%,#ffd9a018,transparent 70%),linear-gradient(180deg,transparent 55%,#0b0d1866 100%),radial-gradient(ellipse at 50% 40%,transparent 60%,#0008 100%)}
.mg-cs2iv{position:absolute;z-index:1;background-repeat:no-repeat;background-size:300% 346.15%;transform-origin:50% 92%;filter:drop-shadow(0 4px 6px #0007);transition:filter .3s}
.mg-cs2iv.px{background-size:100% 100%;image-rendering:pixelated}
.mg-cs2sc canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;pointer-events:none}
.mg-cs2sc .cs2-dk{z-index:2}.mg-cs2sc .cs2-fx{z-index:5}
.mg-cs2pl{position:absolute;z-index:3;transform:translate(-50%,-50%);color:#2a2620;font-weight:900;letter-spacing:-.5px;white-space:nowrap;pointer-events:none;line-height:1}
.mg-cs2mf{position:absolute;z-index:4;left:50%;bottom:0;background-repeat:no-repeat;background-size:300% 346.15%;transform:translate(-50%,100%);opacity:0;filter:drop-shadow(0 -2px 10px #0008);pointer-events:none}
.mg-cs2mf.on{opacity:1;transform:translate(-50%,0);transition:transform .45s cubic-bezier(.3,1.5,.5,1),opacity .2s}
.mg-cs2mf.jump{animation:mgcs2jump .5s .45s ease-in-out 4 alternate}
@keyframes mgcs2jump{to{transform:translate(-50%,-9%)}}
.mg-cs2q{position:absolute;z-index:6;left:4%;right:4%;top:4%;background:linear-gradient(#fffefb,#f2efe6);color:#1d1d22;border-radius:12px;padding:6px 10px;font-size:13.5px;font-weight:800;line-height:1.35;box-shadow:0 4px 14px #0009,0 0 0 1px #ffffff88;opacity:0;transform:translateY(-6px) scale(.9);transition:opacity .18s,transform .18s;pointer-events:none;min-height:2.2em}
.mg-cs2q.on{opacity:1;transform:none}
.mg-cs2q::after{content:"";position:absolute;top:100%;left:var(--tx,50%);margin-left:-7px;border:7px solid transparent;border-top:8px solid #f2efe6;border-bottom:0}
.mg-cs2q small{display:block;font-size:11px;color:#7a7f99;font-weight:700}
.mg-cs2bub{position:absolute;z-index:7;transform:translate(-50%,-100%);background:#fff;color:#111;font-weight:900;font-size:11.5px;padding:3px 8px;border-radius:9px;white-space:nowrap;box-shadow:0 3px 8px #0008;animation:mgbub 1.3s ease-out forwards;pointer-events:none}
.mg-cs2bub.bad{background:#ffe3e3;color:#c00}.mg-cs2bub.ok{background:#e0ffec;color:#0a6a3a}
.mg-cs2stamp{position:absolute;left:24%;top:40%;z-index:8;width:38%;aspect-ratio:1;border-radius:50%;border:5px double #e0312f;color:#e0312f;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(22px,8vw,36px);background:radial-gradient(circle,#fffdf6f2 60%,#fffdf6c0 72%);box-shadow:0 6px 16px #0008;transform:translate(-50%,-50%) rotate(-14deg);animation:mgcs2st .45s cubic-bezier(.3,1.6,.5,1) both;text-shadow:0 0 1px #e0312f;pointer-events:none}
.mg-cs2stamp.hold{color:#5a6080;border-color:#5a6080;text-shadow:none}
@keyframes mgcs2st{0%{transform:translate(-50%,-50%) scale(3) rotate(-40deg);opacity:0}70%{transform:translate(-50%,-50%) scale(.9) rotate(-14deg);opacity:1}100%{transform:translate(-50%,-50%) scale(1) rotate(-14deg)}}
.mg-cs2say{position:absolute;transform:translate(-50%,-100%);background:#ffd166;color:#2a1a00;font-weight:900;font-size:14px;padding:5px 11px;border-radius:12px;white-space:nowrap;box-shadow:0 4px 12px #0009;z-index:9;animation:mgcs2say .4s cubic-bezier(.3,1.6,.5,1) both;pointer-events:none}
.mg-cs2say.sad{background:#e8eaf3;color:#3a3f5a}
@keyframes mgcs2say{from{transform:translate(-50%,-60%) scale(.3);opacity:0}}
.mg-cs2pn{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:6px;margin-top:8px;overflow:auto}
.mg-cs2hd{font-size:12px;color:#c9cde6;font-weight:800;display:flex;gap:6px;align-items:baseline}
.mg-cs2hd em{font-style:normal;color:#141726;background:linear-gradient(#ffe08a,#f0b43a);border-radius:6px;padding:1px 7px;font-size:11px;flex:0 0 auto}
.mg-cs2hd span{color:#fff;font-size:12.5px}
.mg-cs2it{display:flex;flex-direction:column;gap:6px}
.mg-cs2it button{text-align:left;background:linear-gradient(#fbfaf6,#ece8de)!important;color:#22252f!important;border-radius:10px;padding:9px 11px;font-size:13px;font-weight:700;line-height:1.35;box-shadow:0 3px 0 #b9b2a2,0 4px 10px #0007;animation:mgcs2in .3s ease-out both}
.mg-cs2it button:nth-child(2){animation-delay:.06s}.mg-cs2it button:nth-child(3){animation-delay:.12s}
.mg-cs2it button:active{transform:translateY(2px)}
.mg-cs2it button.ok{background:linear-gradient(#8ff0bf,#4fd294)!important;color:#0b2a1a!important}.mg-cs2it button.ng{background:linear-gradient(#ffb0b8,#ff7f8c)!important;color:#3a0008!important}
.mg-cs2it button:disabled{opacity:.55}.mg-cs2it button.ok:disabled,.mg-cs2it button.ng:disabled{opacity:1}
@keyframes mgcs2in{from{transform:translateY(10px);opacity:0}}
.mg-cs2sl{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.mg-cs2sl div{border:1.5px dashed #4a5280;border-radius:9px;padding:4px 5px;min-height:38px;font-size:11px;color:#8a90ad;line-height:1.25;overflow:hidden;position:relative;background:#ffffff06}
.mg-cs2sl div b{display:block;font-size:11px;color:#c9cde6}
.mg-cs2sl div.nx{border-color:#f5c04e;color:#f5c04e;animation:mgcs2nx .9s ease-in-out infinite}
@keyframes mgcs2nx{50%{border-color:#f5c04e55}}
.mg-cs2sl div.f{border-style:solid;color:#22252f;background:#f3f1ea;animation:mgcs2in .25s ease-out}
.mg-cs2sl div.f b{color:#22252f}
.mg-cs2sl div.f span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mg-cs2sl div.g1{background:#d6f8e4;border-color:#3cbf7a}.mg-cs2sl div.g2{background:#fff1c9;border-color:#e0a030}.mg-cs2sl div.g0{background:#ffdfe3;border-color:#ff5a6a}
.mg-cs2sl div i{position:absolute;right:3px;top:2px;font-style:normal;font-weight:900;font-size:11px;background:#1b1f33;color:#fff;border-radius:5px;padding:0 4px}
.mg-cs2cd{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.mg-cs2cd button{text-align:left;background:linear-gradient(#fffdf7,#f1ecdf)!important;color:#2a2620!important;border-radius:10px;padding:6px 8px;font-size:12px;font-weight:700;line-height:1.38;min-height:52px;box-shadow:0 3px 0 #bdb39c,0 4px 10px #0007;animation:mgcs2in .3s ease-out both}
.mg-cs2cd button:nth-child(2){animation-delay:.04s}.mg-cs2cd button:nth-child(3){animation-delay:.08s}.mg-cs2cd button:nth-child(4){animation-delay:.12s}.mg-cs2cd button:nth-child(5){animation-delay:.16s}.mg-cs2cd button:nth-child(6){animation-delay:.2s}
.mg-cs2cd button:active{transform:translateY(2px)}
.mg-cs2cd button.used{visibility:hidden}
.mg-cs2cd button.fly{animation:mgcs2fly .25s ease-in forwards}
@keyframes mgcs2fly{to{transform:translateY(-40px) scale(.6);opacity:0}}
.mg-cs2sum{background:#0d1020;border:1px solid #2c3150;border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;animation:mgcs2in .25s ease-out}
.mg-cs2sum div{display:flex;flex-wrap:wrap;gap:4px}
.mg-cs2sum span{font-size:11.5px;font-weight:800;border-radius:6px;padding:2px 7px;background:#2c3150;color:#c9cde6}
.mg-cs2sum span.o{background:#1f5a3c;color:#a8ffd0}.mg-cs2sum span.x{background:#5a1f2a;color:#ffb0ba}.mg-cs2sum span.h{background:#5a4a1f;color:#ffe08a}
.mg-cs2sum p{margin:0;font-size:12.5px;color:#ffe7a0;font-weight:800}
@media (max-height:680px){.mg-cs2cd button{font-size:11.5px;min-height:46px;padding:5px 7px}.mg-cs2it button{padding:7px 9px;font-size:12.5px}.mg-cs2q{font-size:12.5px}}
@media (prefers-reduced-motion:reduce){.mg-cs2mf.jump{animation:none}}
`;

// ── 그리기 도구 ──
function mkCv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const shade = (col, f = 0.75) => { const n = parseInt(col.slice(1, 7), 16); return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const svgU = (s) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace(/\s*\n\s*/g, ""));

// 책상(장면 단위 좌표로, 확대된 g 위에 한 번 그림)
function paintDesk(g) {
  // 바닥 그림자
  let gr = g.createLinearGradient(0, DESK + 12, 0, H); gr.addColorStop(0, "rgba(0,0,0,.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, DESK + 12, W, H - DESK - 12);
  // 앞판(가림판): 짙은 호두나무
  gr = g.createLinearGradient(0, DESK + 3, 0, DESK + 15); gr.addColorStop(0, "#4a2f1c"); gr.addColorStop(0.15, "#6b4529"); gr.addColorStop(1, "#3a2414");
  g.fillStyle = gr; g.fillRect(1, DESK + 3, W - 2, 12);
  for (let x = 4; x < W; x += 1.7) { g.strokeStyle = `rgba(${x % 3 < 1.5 ? "255,220,170" : "0,0,0"},${0.04 + (x * 7 % 5) / 100})`; g.lineWidth = 0.18; g.beginPath(); g.moveTo(x, DESK + 3.5); g.bezierCurveTo(x + 0.6, DESK + 7, x - 0.6, DESK + 11, x + 0.3, DESK + 15); g.stroke(); }
  for (const x of [34.5, 65.5]) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, DESK + 3.5, 0.35, 11.5); g.fillStyle = "rgba(255,220,170,.12)"; g.fillRect(x + 0.35, DESK + 3.5, 0.25, 11.5); }
  g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(1, DESK + 14.6, W - 2, 0.4);
  // 윗면(위에서 비스듬히): 밝은 나무 + 창빛 반사
  g.beginPath(); g.moveTo(3, DESK); g.lineTo(W - 3, DESK); g.lineTo(W - 0.5, DESK + 3); g.lineTo(0.5, DESK + 3); g.closePath();
  gr = g.createLinearGradient(0, DESK, 0, DESK + 3); gr.addColorStop(0, "#9a6a40"); gr.addColorStop(1, "#c08a56"); g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  gr = g.createLinearGradient(20, 0, 80, 0); gr.addColorStop(0, "rgba(255,240,210,0)"); gr.addColorStop(0.5, "rgba(255,240,210,.28)"); gr.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = gr; g.fillRect(0, DESK, W, 3);
  g.restore();
  g.fillStyle = "#e7bd86"; g.fillRect(0.5, DESK + 2.85, W - 1, 0.35); // 모서리 하이라이트
  g.fillStyle = "#5a3a20"; g.fillRect(0.5, DESK + 3.2, W - 1, 0.3);
  // 면접관 앞 서류·명패
  IVC.forEach((cx, i) => {
    // 서류(살짝 비스듬)
    g.save(); g.translate(cx - 3.5, DESK + 1.4); g.transform(1, 0, -0.35, 1, 0, 0);
    g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(-4.6, -1.1, 9.6, 2.6);
    g.fillStyle = "#fbfbf8"; g.fillRect(-5, -1.4, 9.6, 2.5); g.fillStyle = "#e9e9e2"; g.fillRect(-5, 0.9, 9.6, 0.2);
    g.fillStyle = "#b9bfcf"; for (let k = 0; k < 3; k++) g.fillRect(-4.2, -0.9 + k * 0.65, 5 + (k % 2) * 2, 0.22);
    g.restore();
    // 명패(삼각 명패: 앞면)
    const pw = 13, ph = 4.4, py = DESK - 3.2;
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(cx, DESK + 1.3, pw / 2 + 0.6, 0.7, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - pw / 2, py + ph); g.lineTo(cx + pw / 2, py + ph); g.lineTo(cx + pw / 2 - 0.4, py); g.lineTo(cx - pw / 2 + 0.4, py); g.closePath();
    gr = g.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#e6e1d3"); g.fillStyle = gr; g.fill();
    g.strokeStyle = "#2c3350"; g.lineWidth = 0.3; g.stroke();
    g.fillStyle = "#2c3350"; g.fillRect(cx - pw / 2 + 0.4, py, pw - 0.8, 0.55);
  });
  // 물컵(유리)
  for (const x of [35, 64.5]) {
    const y0 = DESK - 4.4, y1 = DESK + 1.2;
    g.fillStyle = "rgba(0,0,0,.2)"; g.beginPath(); g.ellipse(x + 0.4, y1 + 0.2, 2.1, 0.55, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - 1.8, y0); g.lineTo(x + 1.8, y0); g.lineTo(x + 1.5, y1); g.lineTo(x - 1.5, y1); g.closePath();
    gr = g.createLinearGradient(x - 1.8, 0, x + 1.8, 0); gr.addColorStop(0, "rgba(210,235,255,.55)"); gr.addColorStop(0.3, "rgba(255,255,255,.85)"); gr.addColorStop(0.55, "rgba(170,210,240,.35)"); gr.addColorStop(1, "rgba(120,170,210,.6)"); g.fillStyle = gr; g.fill();
    g.fillStyle = "rgba(120,190,240,.45)"; g.fillRect(x - 1.6, y0 + 2, 3.2, y1 - y0 - 2);
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 0.2; g.beginPath(); g.ellipse(x, y0, 1.8, 0.45, 0, 0, Math.PI * 2); g.stroke();
  }
}
// 펜(가운데 x,y, 각도, 길이)
function paintPen(g, x, y, a, L = 6.4) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = "rgba(0,0,0,.22)"; g.beginPath(); g.ellipse(0.3, 0.7, L / 2, 0.5, 0, 0, Math.PI * 2); g.fill();
  let gr = g.createLinearGradient(0, -0.5, 0, 0.5); gr.addColorStop(0, "#5a6a9a"); gr.addColorStop(0.45, "#1d2440"); gr.addColorStop(1, "#0d1124");
  g.fillStyle = gr; rr(g, -L / 2, -0.45, L * 0.8, 0.9, 0.4); g.fill();
  gr = g.createLinearGradient(0, -0.45, 0, 0.45); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#b8bfd0"); gr.addColorStop(1, "#6a7288");
  g.fillStyle = gr; g.beginPath(); g.moveTo(L * 0.3, -0.42); g.lineTo(L / 2, 0); g.lineTo(L * 0.3, 0.42); g.closePath(); g.fill();
  g.fillStyle = "#d9b45a"; g.fillRect(-L / 2 + 0.6, -0.45, 0.35, 0.9); g.fillRect(-L / 2 + 0.6, -0.65, 2.2, 0.22);
  g.restore();
}
// 머리 위 표시: ok 초록 체크 / q 물음표 / x 점점점
function paintMark(g, kind, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = kind === "ok" ? ["#9af5c4", "#2fbf78"] : kind === "q" ? ["#fff2a8", "#f0a82a"] : ["#ffb0ba", "#e8405a"];
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.arc(0.25, 0.4, 3.3, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(-1, -1.2, 0.3, 0, 0, 3.4); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 3.2, 0, Math.PI * 2); g.fill();
  if (kind !== "ok") { g.beginPath(); g.moveTo(-1.2, 2.6); g.lineTo(-2.6, 4.4); g.lineTo(0.2, 3); g.fill(); }
  g.strokeStyle = "#fff"; g.lineWidth = 0.28; g.beginPath(); g.arc(0, 0, 3.2, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "ok") { g.lineWidth = 0.85; g.beginPath(); g.moveTo(-1.5, 0.1); g.lineTo(-0.4, 1.2); g.lineTo(1.6, -1.2); g.stroke(); }
  else if (kind === "q") { g.fillStyle = "#6a3a00"; g.font = "900 4.6px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 0, 0.35); }
  else for (const d of [-1.4, 0, 1.4]) { g.beginPath(); g.arc(d, 0.1, 0.48, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// 멘티 뒤통수 + 어깨(가운데 x=50, 머리 가운데 y=63)
function paintBack(g, sp, ox, oy, sweat) {
  g.save(); g.translate(ox + 50, oy + 82); g.scale(1.18, 1.18); g.translate(-50, -82); // 크게(어깨 너머 시점)
  const hc = sp.hair, jk = sp.jk;
  // 어깨·재킷
  g.beginPath(); g.moveTo(12, 86); g.bezierCurveTo(13, 78.6, 23, 75.4, 36, 74.4); g.quadraticCurveTo(50, 73.1, 64, 74.4); g.bezierCurveTo(77, 75.4, 87, 78.6, 88, 86); g.closePath();
  let gr = g.createLinearGradient(0, 73, 0, 82); gr.addColorStop(0, shade(jk, 1.25)); gr.addColorStop(0.35, jk); gr.addColorStop(1, shade(jk, 0.7)); g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  gr = g.createRadialGradient(72, 76, 1, 72, 76, 16); gr.addColorStop(0, "rgba(255,225,180,.22)"); gr.addColorStop(1, "rgba(255,225,180,0)"); g.fillStyle = gr; g.fillRect(50, 70, 40, 14);
  gr = g.createRadialGradient(28, 80, 1, 28, 80, 16); gr.addColorStop(0, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(10, 70, 40, 14);
  g.strokeStyle = "rgba(255,226,186,.35)"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(14, 82); g.bezierCurveTo(15, 78.4, 24, 75.8, 36, 74.8); g.moveTo(64, 74.8); g.bezierCurveTo(76, 75.8, 85, 78.4, 86, 82); g.stroke();
  g.strokeStyle = shade(jk, sp.shirt ? 0.85 : 0.6); g.lineWidth = 0.35;
  if (sp.shirt) { g.beginPath(); g.moveTo(30, 76.6); g.quadraticCurveTo(50, 75.2, 70, 76.6); g.stroke(); } // 셔츠 어깨선
  else { g.beginPath(); g.moveTo(50, 75.5); g.lineTo(50, 86); g.stroke(); g.beginPath(); g.moveTo(26, 76.4); g.quadraticCurveTo(25, 80, 26.5, 86); g.moveTo(74, 76.4); g.quadraticCurveTo(75, 80, 73.5, 86); g.stroke(); }
  g.restore();
  // 목 뒤 그림자 + 목
  gr = g.createLinearGradient(0, 68, 0, 75); gr.addColorStop(0, shade(SKIN, 0.62)); gr.addColorStop(1, shade(SKIN, 0.9));
  g.fillStyle = gr; rr(g, 45.6, 67, 8.8, 8, 2); g.fill();
  // 깃: 흰 셔츠 깃 + 재킷 깃
  g.fillStyle = "#f6f6f2"; g.beginPath(); g.moveTo(44.4, 73.3); g.quadraticCurveTo(50, 71.6, 55.6, 73.3); g.lineTo(56.3, 74.8); g.quadraticCurveTo(50, 73.2, 43.7, 74.8); g.closePath(); g.fill();
  g.strokeStyle = "#c9c9c2"; g.lineWidth = 0.18; g.stroke();
  if (!sp.shirt) { g.fillStyle = shade(jk, 0.82); g.beginPath(); g.moveTo(42.6, 74.4); g.quadraticCurveTo(50, 72.4, 57.4, 74.4); g.lineTo(58.6, 76); g.quadraticCurveTo(50, 74, 41.4, 76); g.closePath(); g.fill(); }
  const ear = (x, f) => { g.fillStyle = SKIN; g.beginPath(); g.ellipse(x, 64.6, 1.5, 2.6, f * 0.12, 0, Math.PI * 2); g.fill(); g.fillStyle = shade(SKIN, 0.8); g.beginPath(); g.ellipse(x + f * 0.3, 64.8, 0.6, 1.5, 0, 0, Math.PI * 2); g.fill(); };
  const earsOut = sp.st !== "bob" && sp.st !== "long";
  // 긴 머리는 어깨 위로 먼저
  const hairFill = (y0) => { const r = g.createRadialGradient(46, y0 + 3, 0.5, 50, y0 + 9, 17); r.addColorStop(0, shade(hc, 1.55)); r.addColorStop(0.35, shade(hc, 1.12)); r.addColorStop(1, shade(hc, 0.62)); return r; };
  if (sp.st === "long") {
    g.beginPath(); g.moveTo(37.8, 60); g.bezierCurveTo(36.4, 68, 35.6, 74, 37.2, 80); g.lineTo(39.6, 83.6); g.lineTo(42.6, 81.4); g.lineTo(46, 84.6); g.lineTo(50, 82.2); g.lineTo(54, 84.8); g.lineTo(57.6, 81.6); g.lineTo(60.6, 83.6); g.lineTo(62.8, 80); g.bezierCurveTo(64.4, 74, 63.6, 68, 62.2, 60); g.closePath();
    g.fillStyle = hairFill(56); g.fill();
  }
  if (earsOut) { ear(38.2, -1); ear(61.8, 1); }
  // 머리통
  g.beginPath();
  if (sp.st === "bob") { g.moveTo(37.2, 62); g.bezierCurveTo(36.6, 50.5, 63.4, 50.5, 62.8, 62); g.lineTo(63.2, 71.6); g.quadraticCurveTo(50, 73.6, 36.8, 71.6); g.closePath(); }
  else if (sp.st === "long") { g.ellipse(50, 61.6, 12.6, 11.6, 0, 0, Math.PI * 2); }
  else { g.moveTo(38.2, 63); g.bezierCurveTo(37.4, 50.2, 62.6, 50.2, 61.8, 63); g.quadraticCurveTo(61.4, 68.6, 56.6, 70.6); g.quadraticCurveTo(50, 72.4, 43.4, 70.6); g.quadraticCurveTo(38.6, 68.6, 38.2, 63); g.closePath(); }
  g.fillStyle = hairFill(51); g.fill();
  g.save(); g.clip();
  // 머리결: 정수리에서 퍼지는 결
  g.lineCap = "round";
  for (let k = 0; k < 13; k++) {
    const a = -2.75 + k * 0.215, x1 = 50 + Math.cos(a) * 17, y1 = 56 + Math.abs(Math.sin(a)) * 19;
    g.strokeStyle = k % 3 ? `rgba(255,255,255,${0.035 + (k % 4) * 0.012})` : "rgba(0,0,0,.14)"; g.lineWidth = 0.28;
    g.beginPath(); g.moveTo(50 + (k - 6) * 0.15, 54.2); g.quadraticCurveTo(50 + Math.cos(a) * 10, 58.5 + Math.abs(Math.sin(a)) * 2, x1, y1); g.stroke();
  }
  // 윤기 고리(애니메이션풍 하이라이트)
  g.lineWidth = 1.5; g.strokeStyle = shade(hc, 2.2) + "55"; g.beginPath(); g.ellipse(50, 61, 9.6, 7.4, 0, -2.75, -0.45); g.stroke();
  g.lineWidth = 0.5; g.strokeStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.ellipse(50, 61, 9.6, 7.4, 0, -2.4, -0.8); g.stroke();
  // 창빛 테두리(오른쪽)
  const rim = g.createLinearGradient(56, 0, 64, 0); rim.addColorStop(0, "rgba(255,214,160,0)"); rim.addColorStop(1, "rgba(255,214,160,.38)"); g.fillStyle = rim; g.fillRect(56, 48, 9, 26);
  g.restore();
  // 묶음 머리: 포니테일 / 똥머리
  if (sp.st === "pony") {
    g.beginPath(); g.moveTo(48, 57.5); g.bezierCurveTo(44.4, 64, 46.6, 74, 50.4, 81); g.bezierCurveTo(53.4, 74, 55.4, 64, 52, 57.5); g.closePath(); g.fillStyle = hairFill(57); g.fill();
    g.strokeStyle = "rgba(255,255,255,.14)"; g.lineWidth = 0.3; g.beginPath(); g.moveTo(50, 59); g.quadraticCurveTo(48.4, 68, 50.2, 78); g.stroke();
    g.fillStyle = "#2a2a3a"; rr(g, 47.6, 56.6, 4.8, 1.6, 0.6); g.fill();
  } else if (sp.st === "bun") {
    const r = g.createRadialGradient(48.8, 51.4, 0.3, 50, 52.6, 5.2); r.addColorStop(0, shade(hc, 1.6)); r.addColorStop(1, shade(hc, 0.65));
    g.fillStyle = r; g.beginPath(); g.arc(50, 52.4, 4.6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.16)"; g.lineWidth = 0.3; g.beginPath(); g.arc(50, 52.4, 2.8, 0.4, 4.6); g.stroke(); g.beginPath(); g.arc(50, 52.6, 1.4, 2, 6); g.stroke();
    g.fillStyle = "#2a2a3a"; rr(g, 46.8, 55.6, 6.4, 1.2, 0.5); g.fill();
  }
  // 땀(시간이 줄면)
  if (sweat > 0) {
    const drop = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, -2.2); g.bezierCurveTo(1.6, 0, 1.6, 1.6, 0, 1.6); g.bezierCurveTo(-1.6, 1.6, -1.6, 0, 0, -2.2); const r = g.createRadialGradient(-0.4, 0, 0.1, 0, 0.2, 2); r.addColorStop(0, "#ffffff"); r.addColorStop(0.4, "#bfe8ff"); r.addColorStop(1, "#4fa8e8"); g.fillStyle = r; g.fill(); g.strokeStyle = "rgba(30,80,140,.6)"; g.lineWidth = 0.2; g.stroke(); g.restore(); };
    drop(63.6, 58.4, sweat > 1 ? 1.25 : 1);
    if (sweat > 1) drop(36.2, 60.2, 0.95);
  }
  g.restore();
}
// 그림 못 불러올 때만: 도트 면접관
function dotIv(i) {
  const s = uSpec("worker"); s.shirt = "#eef0f4"; s.shirt2 = "#c9ccd6"; s.pack = null; s.hat = null; s.hood = null;
  if (i === 1) { s.hair = "#9e9e9e"; s.glasses = true; }
  try { return uSprite({ spec: s, cache: {} }, "f", { v: "f" }, false).toDataURL(); } catch (e) { return ""; }
}
// 방법 화면 그림 3장
function stepPics() {
  const a = `<span class="cs2-sp"><span></span><b>?</b></span>`;
  const cardRow = (y, c, n, w) => `<g transform="translate(${6 + n * 3} ${y})"><rect width="50" height="17" rx="3.5" fill="#000" opacity=".25" transform="translate(1 1.5)"/><rect width="50" height="17" rx="3.5" fill="#fffdf6" stroke="#cfc6b0" stroke-width=".8"/><rect width="10" height="17" rx="3.5" fill="${c}"/><rect x="6" width="4" height="17" fill="${c}"/><text x="5" y="12" font-size="9" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">${n + 1}</text><rect x="14" y="5" width="${w}" height="2.4" rx="1.2" fill="#a9a08c"/><rect x="14" y="10" width="${w - 8}" height="2.4" rx="1.2" fill="#cdc5b2"/></g>`;
  const b = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="b" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#3a4470"/><stop offset="1" stop-color="#151a30"/></radialGradient></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
    ${cardRow(8, "#3cbf7a", 0, 30)}${cardRow(31, "#f0a82a", 1, 26)}${cardRow(54, "#4a86e8", 2, 28)}
    <path d="M70 12v52" stroke="#ff5a6a" stroke-width="3" stroke-linecap="round"/><path d="M65 58l5 8 5-8" fill="none" stroke="#ff5a6a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const c = svgU(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><radialGradient id="b" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8dcc4"/></radialGradient><filter id="r"><feTurbulence baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.3"/><feComposite in="SourceGraphic" operator="in"/></filter></defs><rect width="80" height="80" rx="12" fill="url(#b)"/>
    <g transform="rotate(-14 40 40)" filter="url(#r)"><circle cx="40" cy="40" r="27" fill="none" stroke="#e0312f" stroke-width="3.4"/><circle cx="40" cy="40" r="22" fill="none" stroke="#e0312f" stroke-width="1.4"/><text x="40" y="47.5" font-size="19" font-weight="900" text-anchor="middle" fill="#e0312f" font-family="sans-serif">합격</text></g></svg>`);
  return [[a, "의도 고르기"], [`<img src="${b}" alt="">`, "결론→근거→회사"], [`<img src="${c}" alt="">`, "합격 도장"]];
}

export const GAME = {
  key: "cs2", base: "cs", n: "면접관 독심술", desc: "멘티 모의면접, 면접관 마음을 읽고 답을 짜 줘요",
  how: ["면접관이 질문해요. 먼저 <b>면접관이 정말 확인하려는 것</b>(질문 의도)을 3개 중에서 골라요.", "답 카드 6장 중 3장을 <b>결론 → 근거 사례 → 회사 연결</b> 순서로 톡톡. 두괄식, 사실과 숫자, 회사에 줄 이익이 정답이에요.", "함정 카드 조심! 장황한 서두, AI 티 나는 상투어, 숫자 없는 말, 회사와 무관한 말, 남 탓. 시간이 줄면 멘티가 땀을 흘려요. 면접관 <b>표정</b>도 잘 봐요."],
  steps: () => { try { return stepPics(); } catch (e) { return [["", "의도 고르기"], ["", "결론→근거→회사"], ["", "합격 도장"]]; } },
  css: CSS,
  run(host, ez, finish) {
    const dbg = typeof window !== "undefined" && window.__mgdbg ? window.__mgdbg : null, auto = dbg && dbg.cs2;
    const N = 3, PER = 15 * ez, qs = shuffle(QS).slice(0, N);
    const F = frame(host, "cs2", "면접관 독심술", "");
    // 사람 고르기: 가운데 팀장님 + 양옆 면접관 2명 + 멘티 1명
    const mt = pick(MENTEE);
    const sideK = shuffle(IV_SIDE.filter((k) => k !== mt.k)).slice(0, 2), ivKeys = [sideK[0], pick(IV_MID), sideK[1]];
    F.stage.insertAdjacentHTML("beforeend", `<div class="mg-cs2in"><div class="mg-cs2ki"><span>합격 기운</span><i><em></em></i><b>40</b></div>
      <div class="mg-cs2sc"><div class="mg-cs2bg"></div><div class="mg-cs2vg"></div>${ivKeys.map(() => `<div class="mg-cs2iv"></div>`).join("")}<canvas class="cs2-dk"></canvas><div class="mg-cs2mf"></div><canvas class="cs2-fx"></canvas><div class="mg-cs2q"></div></div><div class="mg-cs2pn"></div></div>`);
    const IN = F.stage.querySelector(".mg-cs2in"), sc = IN.querySelector(".mg-cs2sc"), cvD = sc.querySelector(".cs2-dk"), cvF = sc.querySelector(".cs2-fx"), gD = cvD.getContext("2d"), g = cvF.getContext("2d");
    const qEl = sc.querySelector(".mg-cs2q"), pn = IN.querySelector(".mg-cs2pn"), kiEl = IN.querySelector(".mg-cs2ki"), kiFill = kiEl.querySelector("em"), kiNum = kiEl.querySelector("b");
    const ivEl = [...sc.querySelectorAll(".mg-cs2iv")], mfEl = sc.querySelector(".mg-cs2mf");
    // 면접관 자리·그림
    ivEl.forEach((e, i) => {
      const w = IVW[i], h = w * 1.3;
      Object.assign(e.style, { left: (IVC[i] - w / 2) + "%", top: IVT[i] / H * 100 + "%", width: w + "%", height: h / H * 100 + "%" });
      const im = new Image(); im.onload = () => { e.style.backgroundImage = `url("${im.src}")`; e.style.backgroundPosition = exPos("neutral"); };
      im.onerror = () => { const u = dotIv(i); if (u) { e.classList.add("px"); e.style.backgroundImage = `url("${u}")`; } };
      im.src = "img/body/" + ivKeys[i] + ".webp";
    });
    { const w = 30; Object.assign(mfEl.style, { width: w + "%", height: w * 1.3 / H * 100 + "%", backgroundPosition: exPos("smile") }); const im = new Image(); im.onload = () => (mfEl.style.backgroundImage = `url("${im.src}")`); im.src = "img/body/" + mt.k + ".webp"; }
    let K = 3, DPR = 1;
    const fit = () => {
      const sw = IN.clientWidth - 16, sh = (IN.clientHeight || 440) * 0.42;
      K = Math.min(sw / W, sh / H);
      sc.style.width = Math.round(W * K) + "px"; sc.style.height = Math.round(H * K) + "px";
      DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
      for (const c of [cvD, cvF]) { c.width = Math.round(W * K * DPR); c.height = Math.round(H * K * DPR); }
      gD.setTransform(K * DPR, 0, 0, K * DPR, 0, 0); gD.clearRect(0, 0, W, H); paintDesk(gD);
      sc.querySelectorAll(".mg-cs2pl").forEach((e) => (e.style.fontSize = Math.max(11, Math.round(K * 3.2)) + "px"));
    };
    // 명패 글자
    IVC.forEach((x) => sc.insertAdjacentHTML("beforeend", `<span class="mg-cs2pl" style="left:${x / W * 100}%;top:${(DESK - 0.8) / H * 100}%">면접관</span>`));
    fit();
    const ivs = [0, 1, 2].map((i) => ({ x: IVC[i], r: null, rT: 0, pen: "hold", talk: 0, mark: null, markT: 0, ex: "", ink: 0 }));
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
    // 장면 좌표 → 무대 픽셀
    const toStage = (x, y) => { const r = sc.getBoundingClientRect(), s = F.stage.getBoundingClientRect(); return [r.left - s.left + x * r.width / W, r.top - s.top + y * r.height / H]; };
    const bub = (i, text, cls = "") => { const e = document.createElement("div"); e.className = "mg-cs2bub " + cls; e.textContent = text; e.style.left = clamp(ivs[i].x, 15, 85) + "%"; e.style.top = (IVT[i] - 2.5) / H * 100 + "%"; sc.appendChild(e); setTimeout(() => e.remove(), 1300); };
    // 면접관 반응: nod 끄덕(웃음) / tilt 갸웃(놀람) / pen 펜 내려놓고 팔짱(화남)
    const react = (i, r, delay = 0) => setTimeout(() => {
      if (over && r !== "nod") return; const v = ivs[i];
      v.r = r; v.rT = 0;
      if (r === "nod") { v.mark = "ok"; v.markT = 1.1; if (v.pen === "down") v.pen = "hold"; }
      else if (r === "tilt") { v.mark = "q"; v.markT = 1.1; }
      else if (r === "pen") { v.mark = "x"; v.markT = 1.3; v.pen = "down"; tone(240, 0.06, "square", 0.06); noise(0.05, 900, 0.12, 0.05); }
    }, delay);
    const all = (r, first) => { react(first, r, 0); [0, 1, 2].filter((k) => k !== first).forEach((k, j) => react(k, r, 120 + j * 110)); };
    let endEx = null; // 결과 때 표정

    // ── 그리기 ──
    const draw = (now) => {
      const t = now / 1000, live = phase === "intent" || phase === "cards";
      // 면접관(그림): 표정 + 몸짓
      ivs.forEach((v, i) => {
        v.rT += 1 / 60;
        let dx = 0, dy = 0, rot = 0, ex = "neutral";
        if (v.r === "nod" && v.rT < 0.9) { dy = Math.abs(Math.sin(v.rT * 10.5)) * 1.6; ex = "smile"; }
        else if (v.r === "tilt" && v.rT < 1.0) { rot = (i === 2 ? -1 : 1) * Math.min(1, v.rT * 8) * 5; ex = "surprised"; }
        else if (phase === "end" && v.r === "confer") { dx = (i === 0 ? 1.4 : i === 2 ? -1.4 : Math.sin(t * 5) * 0.6); rot = i === 0 ? 4 : i === 2 ? -4 : 0; ex = i === 1 ? "neutral" : "smile"; }
        else dy = Math.sin(t * 1.3 + i * 2) * 0.25; // 숨쉬기
        if (v.pen === "down" || (v.mark === "x" && v.markT > 0)) ex = "angry";
        if (v.talk > 0) { v.talk -= 1 / 60; dy += Math.abs(Math.sin(t * 16)) * 0.5; }
        if (endEx) ex = endEx;
        if (ex !== v.ex) { v.ex = ex; ivEl[i].style.backgroundPosition = exPos(ex); }
        ivEl[i].style.transform = `translate(${dx * K}px,${dy * K}px) rotate(${rot}deg)`;
      });
      g.setTransform(K * DPR, 0, 0, K * DPR, 0, 0); g.clearRect(0, 0, W, H);
      // 펜·잉크(서류 위)
      ivs.forEach((v, i) => {
        const px = IVC[i] - 3.5, py = DESK + 1.2;
        if (phase === "cards" && v.pen !== "down") v.ink = Math.min(1, v.ink + 1 / 60 / 9);
        if (v.ink > 0) { g.strokeStyle = "rgba(30,50,120,.75)"; g.lineWidth = 0.16; g.beginPath(); const n = Math.floor(v.ink * 18); for (let k = 0; k <= n; k++) { const xx = px - 4 + k * 0.42, yy = py - 0.2 + Math.sin(k * 2.3 + i) * 0.28; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
        if (v.pen === "down") paintPen(g, IVC[i] + 5.4, DESK + 1.7, 0.08);
        else if (phase === "cards") { const tx = px - 4 + v.ink * 7.5 + Math.sin(t * 9 + i * 2) * 0.6, ty = py - 0.2 - Math.abs(Math.sin(t * 13 + i)) * 0.25; paintPen(g, tx + 1.9, ty - 2.6, 2.2); }
        else paintPen(g, px + 0.6, py + 0.1, -0.12);
      });
      // 머리 위 표시
      ivs.forEach((v, i) => {
        if (v.markT > 0) {
          v.markT -= 1 / 60; const p = Math.min(1, (1.3 - v.markT) * 6), s = 0.6 + 0.4 * (p < 1 ? p * 1.15 : 1);
          paintMark(g, v.mark, IVC[i] + 6, IVT[i] + 1.5 - p * 1.2, s * 0.95);
          if (v.markT <= 0) { v.mark = null; if (v.r !== "confer") v.r = null; }
        }
      });
      // 멘티 뒤통수(크게)
      const left = live ? 1 - el / PER : 1;
      let ox = 0, oy = 0;
      if (left < 0.25 && live && !RM()) ox = Math.sin(t * 60) * 0.35;
      if (mentee.talk > 0) { mentee.talk -= 1 / 60; oy += Math.abs(Math.sin(t * 14)) * 0.5; }
      oy += mentee.slump * 1.2;
      if (!mentee.front) paintBack(g, mt, ox, oy, live && left < 0.55 ? (left < 0.25 ? 2 : 1) : 0);
      // 흐르는 땀방울
      if (!mentee.front && live && left < 0.55 && !RM()) {
        const rate = left < 0.25 ? 0.12 : 0.04;
        if (rnd() < rate) drops.push({ x: pick([62.5, 63.5, 37, 36]) + ox, y: 58 + rnd() * 4 + oy, v: 0 });
      }
      drops = drops.filter((d) => { d.v += 0.012; d.y += 0.12 + d.v; g.fillStyle = "rgba(150,215,255,.9)"; g.beginPath(); g.ellipse(d.x, d.y, 0.42, 0.7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(d.x - 0.12, d.y - 0.2, 0.15, 0, Math.PI * 2); g.fill(); return d.y < 74; });
      // 꽃가루
      confetti = confetti.filter((p) => { p.vy += 0.025; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.cos(p.a * 2)); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); return p.y < H + 2; });
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
      qEl.style.setProperty("--tx", clamp((ivs[i].x - 4) / 92 * 100, 8, 92) + "%");
      qEl.innerHTML = `<small>면접관</small><span></span>`; qEl.classList.add("on"); const sp = qEl.querySelector("span");
      ivs[i].talk = text.length * 0.045 + 0.2; let k = 0;
      const step = () => { if (over || !host.isConnected) return; k++; sp.textContent = text.slice(0, k); if (k % 2) tone(520 + rint(5) * 40, 0.03, "square", 0.04); if (k < text.length) setTimeout(step, 42); else setTimeout(then, 380); };
      step();
    };
    const next = () => {
      qi++; if (qi >= N) return endSeq();
      cur = qs[qi]; asker = rint(3); el = 0; lastTick = -1; phase = "ask";
      ivs.forEach((v) => { v.pen = "hold"; v.r = null; v.mark = null; v.ink = 0; });
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
      const who = rint(3), hp = toStage(ivs[who].x, IVT[who] + 6);
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
    // 마지막: 면접관 회의 → 합격/보류 도장 → 멘티가 돌아봄(웃음/슬픔)
    const endSeq = () => {
      phase = "end"; F.bar.style.transform = "scaleX(0)"; F.sc.textContent = "결과 발표";
      const qv = rec.map((R) => 0.3 * R.it + 0.6 * (R.s[0] + R.s[1] + R.s[2]) / 3 + 0.1 * R.spd);
      const score = qv.reduce((a, b) => a + b, 0) / N, pass = score >= 0.6;
      pn.innerHTML = head("결과", "면접관들이 상의 중이에요…") + `<div class="mg-cs2sum"><p>두근두근…</p></div>`;
      ivs.forEach((v) => { v.r = "confer"; v.pen = "hold"; v.mark = null; v.markT = 0; });
      for (let k = 0; k < 8; k++) noise(0.05, 300 + k * 30, 0.1, k * 0.11);
      setTimeout(() => {
        ivs.forEach((v) => (v.r = null)); endEx = pass ? "smile" : "sad";
        const st = document.createElement("div"); st.className = "mg-cs2stamp" + (pass ? "" : " hold"); st.textContent = pass ? "합격" : "보류"; sc.appendChild(st);
        SFX.stamp(); vib(40); F.burst(toStage(50, 30), pass ? "#ff5a6a" : "#9ea3c0", 12);
        if (pass) all("nod", 1);
      }, 1300);
      setTimeout(() => {
        const say = document.createElement("div"); say.className = "mg-cs2say" + (pass ? "" : " sad");
        say.style.left = "56%"; say.style.top = 40 / H * 100 + "%";
        mentee.front = true; mfEl.style.backgroundPosition = exPos(pass ? "smile" : "sad"); mfEl.classList.add("on");
        if (pass) {
          mfEl.classList.add("jump"); say.textContent = "저 붙었어요!";
          for (let k = 0; k < (RM() ? 15 : 60); k++) confetti.push({ x: 50 + (rnd() - 0.5) * 30, y: 52, vx: (rnd() - 0.5) * 1.4, vy: -1 - rnd() * 1.2, s: 1 + rnd() * 1.2, a: rnd() * 6, va: (rnd() - 0.5) * 0.3, c: pick(["#ff5a6a", "#ffd166", "#5fe0a0", "#6aa8ff", "#c77dff", "#ffffff"]) });
          [523, 659, 784, 1046, 1318].forEach((f, k) => tone(f, 0.12, "triangle", 0.12, 0, k * 0.08)); vib([20, 40, 20]);
          F.float(toStage(50, 40), "합격!");
        } else { say.textContent = "다음엔 꼭 붙을게요…"; tone(330, 0.2, "triangle", 0.1, -80); tone(247, 0.3, "triangle", 0.1, -60, 0.2); }
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
    const onR = () => { if (!host.isConnected || over) removeEventListener("resize", onR); else { fit(); draw(last); } }; addEventListener("resize", onR);
    raf = requestAnimationFrame(loop);
    setTimeout(next, 400);
    void combo; void vib;
  },
};
