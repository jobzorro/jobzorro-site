// 프랜차이즈 치킨(투자형): "알바가 그만두면 내가 튀긴다."
// 가맹 상담·정보공개서 → 점주 교육 → 1억+ 창업(대출) → 오픈 → 배달퉁 별점·플레이스 순위 → 점장·2호점 → 3형제.
// 매출에서 재료 47%·배달수수료 15%·인건비 17%·임차료 10%를 빼면 11%가 남는다. 그 11%를 지키는 게임.
// 돈 단위 만원. 규약: engine/jobs/README.md
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod, creditRoom, addLoan, salary, spouseIncome, monthlySpend, quitCompany, debt } from "../core.js";
import * as SYN from "../syn.js";
import * as BR from "./chbrand.js"; // 11-23 브랜드 선택·브랜드 인기·갈아타기 제안
import * as SJ from "../sj.js"; // 초반 고생 배율(ramp)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const BRAND = "황금닭";
// 매장 종류: 배달형 10평 / 홀+배달 20평. base = 보통 운영 때 월매출(만원, 물가 1 기준)
export const TYPES = {
  deliv: { n: "배달형 10평", base: 4100, rent: 380, dep: 2000, keyM: 1500, fit: 7000, lab: 280, crew: 4, dshare: 0.92, desc: "홀 없이 배달·포장만. 공시 창업비 5천, 실제는 1억 넘게" },
  hall: { n: "홀+배달 20평", base: 5600, rent: 650, dep: 3000, keyM: 2500, fit: 10500, lab: 450, crew: 6, dshare: 0.68, desc: "맥주 손님까지. 매출이 크지만 월세·인건비도 크다" },
};
// 공시 창업비(가맹금·보증금·인테리어·간판·주방기기) + 실제로 붙는 것(임차보증금·권리금·전기·가스·닥트·철거·소방)
export function quote(s, type, disc = 0) {
  const T = TYPES[type], pi = SYN.pi(s), fr = (s.me?.traits || []).includes("frugal") ? 0.9 : 1;
  const notice = Math.round((type === "hall" ? 7000 : 5000) * pi * BR.f(s).cost), /* 브랜드마다 공시 창업비가 다르다 */ extra = Math.round((T.fit - (type === "hall" ? 7000 : 5000)) * pi * fr);
  const total = Math.round((notice + extra) * fr) + T.dep + Math.round(T.keyM * pi) - disc;
  return { notice, extra, dep: T.dep, key: Math.round(T.keyM * pi), total };
}
// 11-21 밸런스(10개 투잡 공통 비교). 원래: 인건비 = 기본 × 최저임금 지수(해마다 +3~7%) × 물가 지수 → 물가를 두 번 곱해 10년 뒤 1호점이 적자로 돌아섰다.
// 지금: 최저임금 지수에서 물가 몫(wageInfl %p)을 빼고 실질 인상분만 쌓는다. 화면 안내(최저임금 +X%)는 그대로.
export const CH_BAL = { wageInfl: 3.5 };
// 11-22 특이 요소 3개(배달앱 깃발 광고, 5년 리뉴얼, 리뷰 이벤트). 효과 크기는 여기만 고친다.
export const CH_F30 = {
  // 깃발: 1개 월 9만(물가). 기본 2개(예전 '기타' 고정비 45만 안에 18만이 들어 있던 셈). 내 깃발 1개 = 주문 +3%(5개째부터 반), 옆 가게 깃발 1개 = −3%
  // 내가 더 많으면 옆 가게가 달마다 30% 확률로 맞불, 가끔(2.5%) 먼저 늘린다. 기본보다 많고 내가 적거나 같으면 15% 확률로 하나 줄인다
  flag: { def: 2, max: 6, cost: 9, per: 0.03, rival: 0.03, rvUp: 0.3, rvRand: 0.025, rvDown: 0.15, gap: 6 },
  // 리뉴얼: 가맹 60달마다 본사 요구. 배달형 2,500만·홀 4,000만(물가). 하면 24달 주문 +8%(대략 본전), 거부하면 낡은 매장 −3%·12달 뒤 45% 확률로 재계약 거절 통보
  renew: { every: 60, cost: { deliv: 2500, hall: 4000 }, boost: 0.08, boostM: 24, old: 0.03, wait: 12, refuseP: 0.45, late: 1.1 },
  // 리뷰 이벤트: 별점 목표 +0.12, 원가 매출의 2%. 3달 넘게 하다 끊으면 4달 동안 별점 목표 −0.12
  rev: { star: 0.12, cost: 0.02, off: 0.12, offM: 4, minM: 3 },
};
export function flagMul(st) {
  const F3 = CH_F30.flag, f = st.flags ?? F3.def, rv = st.rv ?? F3.def;
  const mine = f <= 4 ? f - F3.def : 2 + (f - 4) * 0.5;
  return clamp(1 + F3.per * mine - F3.rival * (rv - F3.def), 0.8, 1.2);
}
export function setFlags(s, id, d) { const st = s.chicken.stores.find((x) => x.id === id); if (st) st.flags = clamp((st.flags ?? CH_F30.flag.def) + d, 0, CH_F30.flag.max); }
export function toggleRev(s, id) {
  const st = s.chicken.stores.find((x) => x.id === id); if (!st) return "";
  if (st.revEv) { st.revEv = false; if ((st.revM || 0) >= CH_F30.rev.minM) { st.revOff = CH_F30.rev.offM; st.revM = 0; return `${st.name} 리뷰 이벤트 끝: ${CH_F30.rev.offM}달 동안 "이제 서비스 안 줘요?" 별점이 내려가요`; } st.revM = 0; return `${st.name} 리뷰 이벤트 끝`; }
  st.revEv = true; return `${st.name} 리뷰 이벤트 시작: 별점 +, 원가 매출의 ${Math.round(CH_F30.rev.cost * 100)}%`;
}
// 11-23 글 속 숫자가 읽는 값(효과는 그대로): 본사 논란 불매 동안 주문 ×scandal, 오토 운영(점장만·인센티브 없음) 주문 ×auto
export const CH_TXT = { scandal: 0.78, auto: 0.95 };
// 11-23 치킨집에서만 생기는 골치 4개(튀김기·라이더·닭 수급·기름). 효과 크기는 여기만 고친다
export const CH_EV2 = {
  fryer: { fix: 80, lost: 0.06, star: -0.03, close: 0.12, hp: 5 },       // 야간 출장 수리비(물가) / 한 대로 버티면 다음 달 매출·별점 / 주말 휴업
  rider: { okStar: 0.03, ngStar: -0.08, ngLost: 0.04, hp: -10, eye: 4, selfStar: 0.04, zone: 0.96 }, // 대행사 교체(말빨) / 직접 배달 / 반경 축소
  bird: { okLost: 0.02, ngLost: 0.06, soldout: 0.08, hp: 4, catchP: 0.35, fine: 100, mental: -4 }, // 메뉴 전환(마케팅) / 조기 품절 / 사입(적발 확률·위약 벌금)
  oil: { cost: 40, star: 0.04, reuse: -0.06, save: 30, kit: 15, okStar: 0.02, ngStar: -0.03 },       // 매일 교체 / 하루 더 / 산가 측정(숫자)
};
export const renewCost = (s, st) => Math.round(CH_F30.renew.cost[st.type] * BR.f(s).renew * SYN.pi(s) / 10) * 10;
// 큰돈 쓰기: 모자라면 신용대출
function payBig(s, st, v, out) {
  v = Math.round(v); const lack = v - Math.max(0, s.cash);
  if (lack > 0) { const a = Math.min(lack, Math.max(0, Math.round(creditRoom(s)))); if (a > 0) { addLoan(s, "신용대출", a, 0.065); s.cash += a; out.push(`신용대출 ${won(a)}`); } }
  s.cash -= v; addMoney(s, "exp", "치킨 리뉴얼비", v); if (st) st.invested += v; out.push(`리뉴얼비 −${won(v)}`);
}
export const LOAN_MAX = 8000; // 창업대출(정책자금+은행) 한도
export function capacity(s) { return Math.max(0, s.cash) + LOAN_MAX - (s.chicken?.loan || 0) + creditRoom(s) * 0.8; }
// 단계 5개(levels)
export const LV = [
  { n: "가맹 상담 중", need: "상담·정보공개서 → 점주 교육 → 오픈", open: "" },
  { n: "가맹 계약서에 서명", need: "월매출 4,000만 3개월 연속 + 배달퉁 별점 4.8", open: "본사 매뉴얼·오픈 마케팅·배달퉁 입점" },
  { n: "별점 관리 사장님", need: "한 달 매출 5,000만 + 순이익 600만", open: "자사 앱 주문 할인·재주문 쿠폰" },
  { n: "가족 경영", need: "1호점 투자금 회수(BEP)", open: "가족 투입·직원 인센티브" },
  { n: "BEP 돌파", need: "매장 3곳 + 치킨 순이익이 월급의 1.5배", open: "2·3호점 출점·영업양수도" },
  { n: "치킨 3형제", need: "끝까지 왔다", open: "법인 전환·본업 전환" },
];
const SEAS = [1.08, 0.9, 0.93, 0.95, 1.0, 1.04, 1.1, 1.08, 0.97, 1.0, 0.98, 1.12]; // 1~12월: 연말·여름 맥주 성수기, 2월 비수기
export const seas = (cal) => SEAS[(cal || 1) - 1];
export const needAp = (s, st) => (st.mgr ? 0.5 : 2);
const pi = (s) => SYN.pi(s);

function newStore(s, type, disc, opts = {}) {
  const C = s.chicken, n = C.stores.length + 1, q = quote(s, type, disc), T = TYPES[type];
  const pk = !C.stores.length && C.pickA ? C.pickA : null, ai = pk ? pk.ai : (C.seq + (opts.area || 0)) % 5, areaN = BR.AREAS[ai].n; if (pk && !opts.loc) opts = { ...opts, loc: pk.loc }; // 11-23 첫 매장은 내가 고른 자리
  return { id: "K" + (++C.seq), name: `${BR.name(s)} ${n}호점`, area: areaN, ai, type, rent: Math.round(T.rent * BR.AREAS[ai].rent * pi(s)), invested: q.total, dep: T.dep, equip: Math.round(T.fit * 0.45 * pi(s)),
    loc: opts.loc || 1, months: 0, rating: 4.6, buzz: 25, rank: 18, fry: 0.45, ap: 0, shifts: 0, mk: 0, crew: T.crew, crewNeed: T.crew, morale: 60,
    mgr: false, mgrIdle: 0, price: 1, app: false, flags: CH_F30.flag.def, rv: CH_F30.flag.def, revEv: false, revM: 0, revOff: 0, fam: false, inc: false, cum: 0, loss: 0, last: null, hist: [], revOk: 0, risk: opts.risk || 0 };
}

// ───────── 이벤트 16개(+통장 경보) ─────────
function scene(s, id, st, extra = {}) {
  const C = s.chicken; s._chEv = { id, st: st?.id || null, ...extra };
  const nm = st?.name || `${BR.name(s)} 매장`, P = Math.round(pi(s) * 10) / 10, E2 = CH_EV2;
  const L = {
    e01: { t: "오늘 계약하시면", x: `가맹 상담실. 담당자가 웃는다. "오늘 사인하시면 가맹비 반값입니다." 정보공개서는 아직 받지도 않았다.`,
      c: [{ t: "정보공개서를 받고 14일을 꽉 채워 검토한다", eff: { stat: { num: 1 }, hp: -4, ap: -1 }, text: "\"영업지역 반경 500m\"… 1km가 아니다. 불리한 조항에 밑줄을 쳤다." },
        { t: "가맹거래사를 붙여 7일 만에 끝낸다 (50만)", eff: {}, text: "위약금·영업지역 조항을 고쳐 달라고 했다. 본사가 조금 물러섰다." },
        { t: "할인에 끌려 바로 서명한다 (가맹비 −500만)", eff: { mental: 2 }, text: "500만 원 아꼈다. 계약서 7쪽은 아직 안 읽었다." }] },
    e02: { t: "공시가 5천의 함정", x: `본사 공시 창업비는 5,000만 원이었다. 견적서에 전기 증설, 가스, 닥트, 철거, 소방이 줄줄이 붙는다. 임차보증금과 권리금까지 더하니 숫자가 두 배가 넘는다. (홀+배달 20평 ${won(quote(s, "hall", C.disc).total)} · 배달형 10평 ${won(quote(s, "deliv", C.disc).total)} · 내 현금 ${won(Math.max(0, s.cash))})`,
      c: [{ t: `대출을 끌어 원래 계획대로 홀+배달 20평`, eff: { mental: -4 }, text: "창업대출 서류에 도장을 열두 번 찍었다. 매달 원금이 나간다." },
        { t: `홀 없는 배달형 10평으로 줄인다`, eff: { mental: -1 }, text: "매출 상한은 낮아졌다. 대신 밤에 잠은 잔다." }] },
    e03: { t: "튀김기 앞 점주 교육", x: "본사 교육장, 180도 기름 앞에 섰다. 팔뚝에 작은 화상이 하나 생겼다. 교육은 평일 낮에 닷새다.",
      c: [{ t: "연차를 몰아 쓰고 끝까지 직접 배운다", eff: { eye: 8, stat: { hands: 2 }, hp: -6 }, text: "닭 염지부터 기름 교체까지 몸으로 배웠다. 팀장이 \"요즘 왜 이렇게 쉬어?\" 한다." },
        { t: "점장 될 직원만 교육 보낸다", eff: {}, text: "회사는 조용했다. 대신 매장 레시피는 남의 손에 있다." }] },
    e04: { t: "오픈 주간 주문 폭주", x: `본사 오픈 마케팅이 터졌다. 금요일 저녁 7시, 배달퉁 대기 주문 40건. ${nm} 주방은 이미 전쟁터다.`,
      c: [{ t: "조리 시간을 늘리고 주문을 조절한다", eff: { hp: -5 }, text: "\"조금 늦어도 바삭했어요\" 리뷰가 쌓였다." },
        { t: "다 받는다", eff: { hp: -14 }, text: "매출은 터졌다. \"늦고 식었어요\" 리뷰도 같이 터졌다." }] },
    e05: { t: "배달퉁 수수료 인상 공지", x: "배달퉁에서 공지가 왔다. 다음 달부터 중개 수수료 인상. 매출의 15%였던 배달수수료가 17%가 된다. 남는 11%가 눈앞에서 녹는다.",
      c: [{ t: `자사 앱 주문·포장 할인으로 손님을 옮긴다 (${won(Math.round(30 * pi(s)))})`, eff: { stat: { mkt: 1 } }, text: "포장 손님에게 2천 원 할인. 수수료가 줄기 시작했다." },
        { t: "메뉴 가격을 2,000원 올린다", eff: {}, text: "\"치킨 한 마리 2만 6천 원 실화?\" 댓글이 달렸다." }] },
    e06: { t: "금요일 7시의 잠수", x: `금요일 저녁 6시 50분. ${nm} 튀김 담당 알바가 메시지를 읽지 않는다. 주문 알림은 계속 울리고, 나는 아직 회사 엘리베이터 안이다.`,
      c: [{ t: "택시 타고 달려가 직접 튀긴다 (택시비 3만)", eff: { hp: -12, stat: { hands: 0.5 } }, text: "넥타이를 풀고 앞치마를 맸다. 알바가 그만두면 내가 튀긴다." },
        { t: "배달퉁을 두 시간 일시 중지한다", eff: { mental: -3 }, text: "금요일 피크 두 시간이 날아갔다. 별점도 조금." },
        { t: "가족에게 SOS를 친다", eff: { family: -6 }, text: "엄마가 앞치마를 맸다. \"이게 네가 말한 투잡이니?\"" }] },
    e07: { t: "별점 1점, 눅눅해요", x: `${nm} 새 리뷰. "눅눅하고 양념이 반밖에 없어요." 사진 속 치킨은 확실히 슬퍼 보인다. 별점 평균이 내려갔다.`,
      c: [{ t: `정중히 사과하고 재주문 쿠폰을 보낸다 (${won(Math.round(5 * pi(s)))})`, check: { stat: "talk", dc: 40 }, ok: { text: "\"사장님 답글 보고 다시 시켰어요\" 리뷰가 붙었다.", eff: { mental: 1 } }, ng: { text: "쿠폰은 썼는데 별점은 그대로다.", eff: { mental: -2 } } },
        { t: "\"저희는 레시피대로 했습니다\" 반박 답글", eff: { mental: 3 }, text: "속은 시원했다. 다음 날 그 답글이 캡처돼 동네 맘카페에 돌았다." }] },
    e08: { t: "옆집 커피와 영수증 바터", x: "옆 저가커피 사장님이 먼저 말을 걸었다. \"우리 영수증 보여 주면 치킨 3천 원 할인, 치킨 영수증이면 커피 사이즈업 어때요?\"",
      c: [{ t: "제휴한다", eff: { stat: { mkt: 0.5, talk: 0.5 } }, text: "카운터에 작은 안내판을 세웠다. 동네 사장님 친구가 생겼다." },
        { t: "본사 승인 절차가 귀찮아 거절한다", eff: {}, text: "아무 일도 없었다. 그게 문제였다." }] },
    e09: { t: "내년 최저임금", x: `뉴스 자막에 내년 최저임금이 떴다. +${extra.up || 5}%. 인건비는 이미 매출의 17%다. 계산기를 두드리던 손이 멈춘다.`,
      c: [{ t: "주말 피크를 가족이 맡는다", eff: { family: -5 }, text: "토요일 저녁, 동생이 포장대에 섰다. 인건비가 줄었다. 가족 단톡방은 조용해졌다." },
        { t: "피크만 알바를 쓰고 나머지는 내가 채운다", eff: { hp: -6, eye: 4 }, text: "평일 밤 9시, 회사에서 바로 매장으로. 팀장이 \"요즘 퇴근이 빠르네\" 한다." },
        { t: "그대로 두고 메뉴 가격으로 흡수한다", eff: {}, text: "가격표를 새로 뽑았다. 주문 수가 조금 줄었다." }] },
    e10: { t: "슈퍼바이저의 2호점 제안", x: `본사 슈퍼바이저가 지도를 펼친다. "여기 새 아파트 단지, ${BR.name(s)} ${C.stores.length + 1}호점 자리로 딱입니다." 본사 예상 매출표가 반짝인다. (배달형 10평 ${won(quote(s, "deliv", 0).total)})`,
      c: [{ t: "시간대별 유동인구·경쟁점 리뷰까지 직접 조사하고 연다", eff: { hp: -10, stat: { num: 1.5 } }, text: "평일 밤 9시, 주말 낮 1시. 세 번을 가서 셌다. 숫자가 맞는 자리만 계약했다." },
        { t: "본사 추천만 믿고 바로 연다", eff: {}, text: "도장을 찍었다. 예상 매출표는 늘 예쁘다." },
        { t: "이번엔 출점하지 않는다", eff: {}, text: "지도를 접었다. \"다음에 더 좋은 자리 나오면요.\"" }] },
    e11: { t: "가게 파실 생각 있으세요?", x: `영업양수도 문의 전화가 왔다. 지금 매출이면 권리금 포함 ${won(extra.price || 0)}를 쳐 주겠다고 한다. 그동안 튀긴 닭이 몇 마리였더라.`,
      c: [{ t: "양수도로 투자금을 회수하고 엑시트한다", eff: { mental: 6 }, text: "열쇠 꾸러미를 넘겼다. 기름 냄새가 아직 손에 남아 있다." },
        { t: "계속 운영한다", eff: { hp: -2 }, text: "전화를 끊고 튀김기 온도를 다시 봤다." }] },
    e12: { t: "본업의 1.5배", x: "6개월 연속, 치킨집 수익이 월급의 1.5배를 넘었다. 팀장의 잔소리가 오늘따라 길다. 사직서 양식이 머릿속에 떠오른다.",
      c: [{ t: "1년치 생활비를 확인하고 본업으로 전환한다", eff: {}, text: "사직서를 냈다. 내일부터 출근지는 튀김기 앞이다." },
        { t: "투잡을 유지하며 운영 시스템을 더 다진다", eff: { hp: -3 }, text: "월급은 안전벨트다. 조금 더 매기로 했다." }] },
    e13: { t: "850m 옆 같은 간판", x: `퇴근길, 직선거리 850m에 ${BR.name(s)} 간판이 올라가고 있다. 본사에게 들은 이야기는 없다. 다음 날부터 배달 구역이 겹친다.`,
      c: [{ t: "점주 협의회와 공정거래 기관에 문제를 제기한다", check: { stat: "talk", dc: 50 }, ok: { text: "본사가 그 점포 배달 구역을 조정했다. 시간은 엄청 들었다.", eff: { mental: -4, hp: -6 } }, ng: { text: "서류만 쌓였다. 구역은 그대로 겹친다.", eff: { mental: -8, hp: -6 } } },
        { t: "참고 지역 마케팅을 늘린다 (광고비 60만)", eff: { mental: -3 }, text: "아파트 엘리베이터 광고를 붙였다. 매출은 조금 빠졌다." }] },
    e14: { t: "영업지역 축소 재계약", x: "재계약 시즌, 본사 공문이 왔다. 영업지역을 줄이는 변경 계약에 동의하지 않으면 재계약이 어렵다고 한다. 축소 폭은 최대 72%다.",
      c: [{ t: "다른 점주들과 연대해 신고하고 끝까지 다툰다", check: { stat: "num", dc: 55 }, ok: { text: "시정명령이 나왔다. 손해배상 2,500만 원.", eff: { mental: -6, hp: -8 } }, ng: { text: "1년을 다퉜다. 결론은 아직이다. 지쳤다.", eff: { mental: -12, hp: -8 } } },
        { t: "울며 겨자 먹기로 서명한다", eff: { mental: -6 }, text: "배달 반경이 줄었다. 지도 앱의 원이 작아졌다." }] },
    e15: { t: "본사 오너가 뉴스에 나왔다", x: `포털 메인에 ${BR.name(s)} 본사 오너 논란 기사가 떴다. 동네 맘카페에 "이 브랜드 안 먹어요" 글이 올라온다. 주문이 ${Math.round((1 - CH_TXT.scandal) * 100)}% 줄었다.`,
      c: [{ t: "지역 행사 협찬으로 '우리 동네 사장님'을 판다 (50만)", eff: { stat: { mkt: 1 } }, text: "동네 축구 대회에 치킨 20마리. 아이들이 사장님 이름을 외웠다." },
        { t: "할인 쿠폰을 뿌려 버틴다 (쿠폰 120만)", eff: { mental: -2 }, text: "주문은 돌아왔다. 남는 건 없었다." }] },
    e16: { t: "오토 운영의 배신", x: `본업 프로젝트로 석 달간 ${nm}을 점장에게 맡겼다. 정산표를 보니 매출이 달마다 ${Math.round((1 - CH_TXT.auto) * 100)}%씩 덜 나왔다. 점장은 아무 일도 없었다는 얼굴이다. 직원은 매출을 올릴 이유가 없다.`,
      c: [{ t: "주말마다 매장에 복귀해 직접 운영한다", eff: { hp: -10, eye: 3 }, text: "토요일 오후, 튀김기 앞에 다시 섰다. 직원들 눈빛이 달라졌다." },
        { t: "일별 목표 매출 인센티브 제도를 만든다", eff: { stat: { num: 1 } }, text: "\"하루 180만 넘으면 다 같이 보너스.\" 점장이 처음으로 매출표를 봤다." }] },
    e17: { t: "튀김기가 멈췄다", x: `금요일 오후 5시, ${nm} 튀김기 두 대 중 한 대가 온도를 못 올린다. 본사 수리 기사는 월요일에 온다고 한다. 주문 알림은 6시부터 몰린다.`,
      c: [{ t: `사설 기사를 야간 출장으로 부른다 (${won(Math.round(E2.fryer.fix * pi(s)))})`, eff: {}, text: "밤 8시에 히터를 갈았다. 기사님이 치킨 한 마리를 들고 갔다." },
        { t: "남은 한 대로 메뉴를 줄여 버틴다", eff: { hp: -6 }, text: "순살과 사이드를 품절로 돌렸다. 대기 70분. \"다음엔 다른 데 시킬게요\" 리뷰가 달렸다." },
        { t: "주말 장사를 접고 월요일을 기다린다", eff: { hp: E2.fryer.hp }, text: "금요일 밤에 간판 불을 껐다. 몸은 쉬었고 통장은 못 쉬었다." }] },
    e18: { t: "라이더가 안 잡힌다", x: `비 오는 금요일, 배달 대행 호출이 20분째 '배차 중'이다. 포장대에 치킨 여섯 봉지가 식어 간다. 대행 기사들이 콜비를 더 주는 옆 동네로 옮겨 갔다고 한다.`,
      c: [{ t: "다른 대행사 지사장과 직접 담판한다 (말빨 판정)", check: { stat: "talk", dc: 50 }, ok: { text: "\"피크 시간엔 한 명을 붙여 드릴게요.\" 배차가 3분으로 줄었다.", eff: {} }, ng: { text: "\"저희도 기사가 없어요.\" 옮긴 대행사는 더 늦었다.", eff: { mental: -3 } } },
        { t: "피크 시간엔 내가 오토바이를 탄다", eff: { hp: E2.rider.hp, eye: E2.rider.eye }, text: "헬멧을 쓰고 엘리베이터 거울을 봤다. 월요일 회의 자료는 아직 빈 문서다." },
        { t: "배달 반경을 줄인다", eff: {}, text: "먼 아파트 단지를 배달 구역에서 뺐다. 식은 치킨은 줄었고 주문도 줄었다." }] },
    e19: { t: "닭이 안 들어온다", x: `조류독감 뉴스가 사흘째다. 본사 물류가 문자를 보냈다. "당분간 매장당 하루 60마리만 공급합니다." ${nm}은 금요일에 120마리를 튀긴다. 가맹 계약서에는 '원재료는 본사 공급분만 쓴다'고 적혀 있다.`,
      c: [{ t: "사이드·반마리 세트로 메뉴판을 바꾼다 (마케팅 판정)", check: { stat: "mkt", dc: 45 }, ok: { text: "'반반 세트+떡볶이'가 주문 1위에 올랐다. 닭은 덜 쓰고 매출은 거의 지켰다.", eff: {} }, ng: { text: "\"치킨집에 치킨이 없네요.\" 세트는 안 팔렸다.", eff: {} } },
        { t: "저녁 8시에 품절을 걸고 일찍 닫는다", eff: { hp: E2.bird.hp }, text: "60마리가 나가자 앱을 닫았다. 오랜만에 9시 뉴스를 집에서 봤다." },
        { t: "시장에서 닭을 따로 사다 쓴다 (본사에 걸리면 위약 벌금)", eff: {}, text: "새벽 도매시장에서 닭 두 상자를 실었다." }] },
    e20: { t: "기름 한 통 값", x: `식용유 18L 한 통 값이 또 올랐다. ${nm} 점장이 묻는다. "사장님, 기름 하루만 더 쓰면 안 돼요? 옆 가게는 사흘 쓴대요." 본사 매뉴얼은 매일 교체다.`,
      c: [{ t: `매뉴얼대로 매일 간다 (${won(Math.round(E2.oil.cost * pi(s)))})`, eff: {}, text: "\"여긴 기름 냄새가 안 나요\" 리뷰가 붙었다. 통장은 그 리뷰를 못 읽는다." },
        { t: "하루 더 쓴다", eff: {}, text: "색이 조금 진해졌다. 손님 한 명이 사진을 찍어 올렸다." },
        { t: `산가 측정지를 사서 숫자로 정한다 (${won(Math.round(E2.oil.kit * pi(s)))}, 숫자 판정)`, check: { stat: "num", dc: 45 }, ok: { text: "주문 적은 날은 하루 반, 금요일은 그날 교체. 기름값과 맛을 둘 다 지켰다.", eff: {} }, ng: { text: "기준을 헷갈려 주말에 묵은 기름으로 튀겼다.", eff: {} } }] },
    risk: { t: "통장 경보: 개인회생이 보인다", x: `${extra.why || "적자가 이어진다."} 창업대출 ${won(C.loan)}, 남은 신용 한도 ${won(creditRoom(s))}. 카드값을 3달 못 내면 개인회생이다.`,
      c: [{ t: "가족에게 1,000만 원을 빌린다", eff: { family: -10, mental: -3 }, text: "아버지가 말없이 이체했다. 고맙다는 말이 안 나왔다." },
        { t: `가장 약한 매장을 급매로 넘긴다 (약 ${won(extra.fire || 0)})`, eff: { mental: -6 }, text: "권리금을 반값에 넘겼다. 그래도 숨은 쉰다." },
        { t: "버틴다. 다음 달은 다르겠지", eff: { mental: -4 }, text: "계산기를 덮었다. 그 계산기는 틀린 적이 없었다." }] },
  };
  const e = L[id];
  const kind = "event";
  return { kind, tag: "치킨", title: e.t, text: e.x, choices: e.c, onChoose: "ch_ev" };
}

// ───────── 11-22 특이 요소 장면 ─────────
function flagScene(s, st) {
  const F3 = CH_F30.flag, c = Math.round(F3.cost * pi(s)), fl1 = !s.chicken.flagCg; s._chFl = { id: st.id }; s.chicken.flagCg = 1;
  return { kind: "event", tag: "치킨", title: "깃발 전쟁", onChoose: "ch_flag", ...(fl1 ? { cine: "ch_flag" } : {}), // 화보는 처음 한 번만
    text: `${st.name} 근처 치킨집이 배달앱 광고 깃발을 ${st.rv}개로 늘렸다. 우리 동네 주문 화면 첫 줄을 그 집이 차지했다. 깃발은 하나에 월 ${won(c)}. 우리는 지금 ${st.flags}개.`,
    choices: [
      { t: "리뷰 답글·포장 할인으로 버틴다", eff: {}, text: "깃발 대신 단골을 챙겼다. 첫 줄은 내줬다." },
      { t: `깃발을 하나 더 꽂는다 (월 +${won(c)})`, eff: {}, text: "다시 첫 줄. 광고비 명세서도 한 줄 늘었다." },
      { t: "옆 가게 사장님께 같이 줄이자고 한다", check: { stat: "talk", dc: 50 }, ok: { text: "\"우리끼리 싸워 봐야 앱만 좋은 일이죠.\" 둘 다 하나씩 뺐다.", eff: {} }, ng: { text: "\"장사는 각자 하는 거죠.\" 다음 날 깃발이 하나 더 늘었다.", eff: { mental: -3 } } },
    ] };
}
function renewScene(s, st, mode) {
  const R3 = CH_F30.renew, cost = renewCost(s, st); s._chRn = { id: st.id, cost, mode };
  if (mode === "deny") return { kind: "event", tag: "치킨", title: "재계약 거절 통보", onChoose: "ch_renew",
    text: `${st.name}: 본사가 재계약 거절을 통보했다. 리뉴얼을 안 한 매장은 브랜드 기준 미달이라고. 계약 만료까지 석 달.`,
    choices: [{ t: `지금이라도 리뉴얼한다 (${won(Math.round(cost * R3.late))})`, eff: {}, text: "공사 가림막을 쳤다. 처음부터 할 걸 그랬다." }, { t: "간판을 내리고 폐점한다", eff: {}, text: "마지막 주문을 튀겼다." }] };
  const yr = Math.round(st.months / 12), again = st.months > R3.every; // 60달마다 다시 온다: 10년 차엔 10년 차라고
  return { kind: "event", tag: "치킨", title: `${yr}년 차 리뉴얼 공문`, onChoose: "ch_renew",
    text: `${st.name} 가맹 ${yr}년 차. ${again ? "5년 전 그 공문이 날짜만 바뀌어 또 왔다. " : ""}본사 공문: "브랜드 이미지 통일을 위해 매장 리뉴얼(인테리어·간판·주방 일부)을 진행해 주십시오." 견적 ${won(cost)}. 거부하면 재계약 심사에 반영된다고 한다.`,
    choices: [
      { t: `리뉴얼한다 (${won(cost)})`, eff: {}, text: "새 간판에 불이 들어왔다. 손님들이 \"새로 생긴 집이에요?\" 묻는다." },
      { t: "점주 협의회와 같이 비용 분담을 요구한다", check: { stat: "num", dc: 55 }, ok: { text: "본사가 절반을 대기로 했다. 점주 단톡방이 처음으로 박수 이모티콘으로 찼다.", eff: {} }, ng: { text: "\"분담 규정은 없습니다.\" 결국 전액이다.", eff: { mental: -4 } } },
      { t: "거부한다", eff: {}, text: again ? "5년 전에 간 간판이다. 본사 담당자가 메모를 했다." : "아직 멀쩡한 매장이다. 본사 담당자가 메모를 했다." },
    ] };
}
function revScene(s, mode) {
  s._chRv = { mode };
  if (mode === "trap") return { kind: "event", tag: "치킨", title: "콜라만 받고 별점 셋", onChoose: "ch_revev",
    text: "\"리뷰 이벤트 참여합니다\" 요청사항에 콜라를 받고, 별점은 3점. 이번 달만 열두 번째다. 이벤트 원가는 매달 그대로 나간다. 끊으면 별점이 한동안 떨어질 거다.",
    choices: [{ t: "그래도 계속한다", eff: {}, text: "콜라 박스를 또 주문했다." }, { t: "이벤트를 끊는다", eff: {}, text: "가게 공지에서 '리뷰 이벤트' 줄을 지웠다." }] };
  return { kind: "event", tag: "치킨", title: "리뷰 쓰면 콜라 무료", onChoose: "ch_revev",
    text: `동네 치킨집 리뷰 다섯 개 중 넷이 '리뷰 이벤트 참여'다. 콜라·치즈볼을 주면 별점은 오른다. 원가는 매출의 ${Math.round(CH_F30.rev.cost * 100)}%쯤. 한번 시작하면 끊기 어렵다.`,
    choices: [{ t: "맛으로 승부한다(안 한다)", eff: {}, text: "서비스 대신 튀김 온도를 1도 더 봤다." }, { t: "전 매장에서 시작한다", eff: {}, text: "포스기 옆에 콜라 박스가 쌓였다." }] };
}
// 시험용: #auto…-chicken-f30flag|f30renew|f30deny|f30rev|f30trap
export function f30Scene(s, r, what) {
  const st = s.chicken.stores[0]; if (!st) return null;
  if (what === "flag") { st.rv = Math.max(st.rv ?? 2, 3); return flagScene(s, st); }
  if (what === "renew" || what === "deny") { st.months = Math.max(st.months, 60); return renewScene(s, st, what === "deny" ? "deny" : "ask"); }
  if (what === "trap") { st.revEv = true; st.revM = 9; return revScene(s, "trap"); }
  return revScene(s, "ask");
}
function f30Choose(s, r, i, ok, name) {
  const C = s.chicken, out = [];
  if (name === "ch_flag") {
    const st = C.stores.find((x) => x.id === s._chFl?.id); s._chFl = null; if (!st) return out; C.flagN = (C.flagN || 0) + 1;
    if (i === 0) { st.buzz = Math.min(100, st.buzz + 8); out.push(`${st.name} 입소문 +8`); }
    else if (i === 1) { setFlags(s, st.id, 1); out.push(`${st.name} 깃발 ${st.flags}개`); }
    else if (ok) { st.rv = Math.max(0, st.rv - 1); st.flags = Math.max(0, st.flags - 1); out.push(`휴전: 깃발 우리 ${st.flags} · 옆 가게 ${st.rv}`); }
    else { st.rv = Math.min(CH_F30.flag.max, st.rv + 1); out.push(`옆 가게 깃발 ${st.rv}개`); }
    out.push(`주문 배율 ×${flagMul(st).toFixed(2)}`); return out;
  }
  if (name === "ch_renew") {
    const o = s._chRn || {}, st = C.stores.find((x) => x.id === o.id), R3 = CH_F30.renew; s._chRn = null; if (!st) return out;
    const fresh = (m) => { st.freshM = m; st.old = false; st.refuseT = undefined; st.rating = clamp(st.rating + 0.05, 3.4, 5); out.push(`새 단장: ${m}달 동안 주문 +${Math.round(R3.boost * 100)}%`); };
    if (o.mode === "deny") { if (i === 0) { payBig(s, st, o.cost * R3.late, out); fresh(R3.boostM); } else out.push(...closeStore(s, st.id)); return out; }
    C.renewN = (C.renewN || 0) + 1;
    if (i === 0) { payBig(s, st, o.cost, out); fresh(R3.boostM); }
    else if (i === 1) { payBig(s, st, ok ? o.cost * 0.5 : o.cost, out); fresh(R3.boostM); }
    else { st.old = true; st.refuseT = st.months; out.push(`낡은 매장: 주문 −${Math.round(R3.old * 100)}%`, `${R3.wait}달 뒤 재계약 심사`); }
    return out;
  }
  if (name === "ch_revev") {
    const mode = s._chRv?.mode; s._chRv = null; C.seen[mode === "trap" ? "rv2" : "rv1"] = s.t;
    if (mode === "trap") { if (i === 1) for (const st of C.stores) if (st.revEv) out.push(toggleRev(s, st.id)); return out; }
    if (i === 1) for (const st of C.stores) if (!st.revEv) out.push(toggleRev(s, st.id));
    return out;
  }
  return out;
}

// 장면 선택 결과
function evChoose(s, r, i, ok) {
  const C = s.chicken, ev = s._chEv || {}, st = C.stores.find((x) => x.id === ev.st) || C.stores[0], out = [], P = pi(s);
  const spend = (v, nm = "치킨 비용") => { v = Math.round(v); s.cash -= v; addMoney(s, "exp", nm, v); out.push(`돈 −${won(v)}`); };
  const rate = (v) => { if (st) { st.rating = clamp(st.rating + v, 3.4, 5); out.push(`${st.name} 별점 ${v > 0 ? "+" : ""}${v.toFixed(2)}`); } };
  C.seen[ev.id] = s.t;
  switch (ev.id) {
    case "e01": C.step = Math.max(C.step, 1);
      if (i === 0) { C.risk = 0; out.push("14일 숙려: 계약 위험 낮음"); }
      else if (i === 1) { spend(50 * P, "치킨 창업비"); C.risk = 0; out.push("가맹거래사 검토: 계약 위험 낮음"); }
      else { C.disc = 500; C.risk = 2; out.push("가맹비 −500만", "영업지역·위약금 위험 높음"); }
      log(s, `${BR.name(s)} 가맹 상담. 정보공개서를 받았다.`, "work"); break;
    case "e03": C.step = Math.max(C.step, 2); C.trained = i === 0; out.push(i === 0 ? "점주 교육 수료: 튀김 품질 +" : "직원만 교육: 매장이 점장 손에"); break;
    case "e02": case "e10": {
      if (ev.id === "e10" && i === 2) { C.nextT = s.t + 6; out.push("출점 보류(6개월 뒤 다시)"); break; }
      const type = ev.id === "e02" ? (i === 0 ? "hall" : "deliv") : "deliv"; if (ev.id === "e02" && C.step >= 3) C.disc = 0;
      const o = openStore(s, r, type, ev.id === "e10" ? { loc: i === 0 ? r.range(0.98, 1.1) : r.range(0.72, 1.16), risk: i === 0 ? 0 : 1, area: C.stores.length } : { risk: C.risk });
      out.push(...o); if (ev.id === "e02") C.step = 3; break; }
    case "e04": if (st) { if (i === 0) rate(0.05); else { const v = Math.round(st.last ? st.last.rev * 0.06 * 0.35 : 90 * P); s.cash += v; addMoney(s, "inc", "치킨 매출", v); out.push(`추가 이익 +${won(v)}`); rate(-0.12); } } break;
    case "e05": C.fee = 0.17; if (i === 0) { for (const x of C.stores) x.app = true; spend(30 * P); out.push("자사 앱 할인 켜짐: 수수료 −20%"); } else { for (const x of C.stores) x.price = clamp(x.price + 0.08, 0.85, 1.2); out.push("메뉴 가격 +8%"); } break;
    case "e06": if (st) { if (i === 0) { spend(3 * P); st.fry = Math.max(st.fry, 0.6); out.push("피크 지켰다"); } else if (i === 1) { st.lost = (st.lost || 0) + 0.04; rate(-0.04); out.push("다음 달 매출 −4%"); } else { out.push("피크 지켰다"); } st.crew = Math.max(0, st.crew - 1); out.push(`${st.name} 알바 −1`); } break;
    case "e07": if (st) { if (i === 0) { spend(5 * P); rate(ok ? 0.08 : 0.02); } else { rate(-0.15); st.buzz = Math.max(0, st.buzz - 15); out.push("동네 입소문 −"); } } break;
    case "e08": if (i === 0) { C.barter = true; for (const x of C.stores) x.buzz = Math.min(100, x.buzz + 8); out.push("영수증 제휴: 매출 +3%"); } break;
    case "e09": if (i === 0) { for (const x of C.stores) x.fam = true; out.push("가족 투입: 인건비 −, 가족 피로"); } else if (i === 1) { C.selfFill = 6; out.push("6개월간 내가 피크를 채운다: 인건비 −, 근무 필요 +1"); } else { for (const x of C.stores) x.price = clamp(x.price + 0.06, 0.85, 1.2); out.push("메뉴 가격 +6%"); } break;
    case "e11": if (i === 0) out.push(...sellAll(s, ev.price || 0)); break;
    case "e12": if (i === 0) { const need = monthlySpend(s) * 12; if (s.cash + s.invest < need) { out.push(`생활비 1년치(${won(need)})가 안 된다. 전환 보류`); break; } const q = quitCompany(s); if (q.ok) { s.fullJob = "chicken"; s.moments = s.moments || {}; s.moments.quit = s.t; out.push("본업 전환: 치킨이 본잡", "월급 끊김"); log(s, "치킨을 본잡으로. 회사를 나왔다.", "work"); } else out.push(q.msg); } break;
    case "e13": if (st) { if (i === 0 && ok) { st.zone = (st.zone || 1) * 0.97; out.push("배달 구역 일부 보전: 매출 −3%"); } else if (i === 0) { st.zone = (st.zone || 1) * 0.88; out.push("배달 구역 겹침: 매출 −12%"); } else { spend(60 * P); st.zone = (st.zone || 1) * 0.93; st.buzz = Math.min(100, st.buzz + 15); out.push("매출 −7%, 동네 입소문 +"); } } break;
    case "e14": if (st) { if (i === 0 && ok) { s.cash += 2500; addMoney(s, "inc", "치킨 손해배상", 2500); out.push("손해배상 +2,500만"); } else if (i === 0) { st.zone = (st.zone || 1) * 0.9; out.push("결론 없이 재계약: 매출 −10%"); } else { st.zone = (st.zone || 1) * 0.86; out.push("영업지역 축소: 매출 −14%"); } } break;
    case "e15": C.scandal = SYN.on(s, "ch_insta") ? 2 : 4; if (i === 0) { spend(50 * P); C.scandal = Math.max(1, C.scandal - 2); out.push(`불매 ${C.scandal}개월(지역 이미지로 빨리 회복)`); } else { spend(120 * P); out.push(`불매 ${C.scandal}개월`); } break;
    case "e16": if (st) { if (i === 0) { st.mgrIdle = 0; st.ap += 1; st.fry = Math.max(st.fry, 0.55); out.push("오토 운영 감소 회복"); } else { st.inc = true; st.mgrIdle = 0; out.push("일별 인센티브: 매출의 1.5%, 오토 운영 감소 없음"); } } break;
    case "e17": if (st) { const F = CH_EV2.fryer; if (i === 0) { spend(F.fix * P); out.push("피크 지켰다"); } else if (i === 1) { st.lost = (st.lost || 0) + F.lost; rate(F.star); out.push(`다음 달 매출 −${Math.round(F.lost * 100)}%`); } else { st.lost = (st.lost || 0) + F.close; out.push(`주말 휴업: 다음 달 매출 −${Math.round(F.close * 100)}%`); } } break;
    case "e18": if (st) { const F = CH_EV2.rider; if (i === 0) { if (ok) rate(F.okStar); else { rate(F.ngStar); st.lost = (st.lost || 0) + F.ngLost; out.push(`다음 달 매출 −${Math.round(F.ngLost * 100)}%`); } } else if (i === 1) rate(F.selfStar); else { st.zone = (st.zone || 1) * F.zone; out.push(`배달 반경 축소: 매출 −${Math.round((1 - F.zone) * 100)}%`); } } break;
    case "e19": if (st) { const F = CH_EV2.bird; if (i === 0) { const v = ok ? F.okLost : F.ngLost; st.lost = (st.lost || 0) + v; out.push(`다음 달 매출 −${Math.round(v * 100)}%`); } else if (i === 1) { st.lost = (st.lost || 0) + F.soldout; out.push(`조기 품절: 다음 달 매출 −${Math.round(F.soldout * 100)}%`); } else if (r.chance(F.catchP)) { spend(F.fine * P, "치킨 비용"); s.mental = clamp(s.mental + F.mental, 0, 100); out.push("슈퍼바이저가 냉장고를 열어 봤다. 사입 적발, 위약 벌금", `멘탈 ${F.mental}`); } else out.push("이번엔 아무도 몰랐다. 매출은 지켰다"); } break;
    case "e20": if (st) { const F = CH_EV2.oil; if (i === 0) { spend(F.cost * P); rate(F.star); } else if (i === 1) { const v = Math.round(F.save * P); s.cash += v; addMoney(s, "inc", "치킨 매출", v); out.push(`기름값 아낌 +${won(v)}`); rate(F.reuse); } else { spend(F.kit * P); rate(ok ? F.okStar : F.ngStar); } } break;
    case "risk": C.riskT = s.t;
      if (i === 1) { const w = [...C.stores].sort((a, b) => avgP(a) - avgP(b))[0]; if (w) out.push(...sellStore(s, w.id, 0.6)); }
      else if (i === 0) { s.cash += 1000; addMoney(s, "inc", "가족에게 빌린 돈", 1000); C.famDebt = (C.famDebt || 0) + 1000; out.push("현금 +1,000만(가족 빚)"); }
      break;
  }
  s._chEv = null; return out;
}

// ───────── 오픈·양수도·폐점 ─────────
function openStore(s, r, type, opts = {}) {
  const C = s.chicken, q = quote(s, type, C.stores.length ? 0 : C.disc || 0);
  let lack = q.total - Math.max(0, s.cash) + 300, out = [];
  if (lack > 0 && lack > capacity(s) - Math.max(0, s.cash)) { // 큰 매장을 못 하면 작은 매장으로
    if (type === "hall") return openStore(s, r, "deliv", opts).concat(["자금이 모자라 배달형 10평으로"]);
    return ["창업 자금이 모자라 계약하지 못했다"];
  }
  let loanAdd = 0;
  if (lack > 0) { const a = Math.min(lack, LOAN_MAX - C.loan); if (a > 0) { addLoan(s, "창업대출", a, 0.052); s.cash += a; C.loan += a; loanAdd = a; lack -= a; } if (lack > 0) { addLoan(s, "신용대출", lack, 0.065); s.cash += lack; out.push(`신용대출 ${won(lack)}`); } }
  s.cash -= q.total; addMoney(s, "exp", "치킨 창업비", q.total);
  const st = newStore(s, type, C.stores.length ? 0 : C.disc || 0, opts); st.invested = q.total; st.loan = loanAdd; st.loan0 = loanAdd; C.stores.push(st); C.invested += q.total; C.opened++;
  if (C.lv < 1) C.lv = 1;
  log(s, `${st.name} 오픈(${TYPES[type].n}). 창업비 ${won(q.total)}${loanAdd ? `, 창업대출 ${won(loanAdd)}` : ""}`, "work");
  return [`${st.name} 계약·공사 시작`, `창업비 ${won(q.total)}`, ...(loanAdd ? [`창업대출 ${won(loanAdd)} (5년 원금 상환)`] : []), ...out];
}
const avgP = (st) => { const h = st.hist.slice(-6); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; };
export function sellPrice(s, st, f = 1) { const ap = Math.max(0, avgP(st)); return Math.round((st.dep + Math.min(ap * 14, st.invested * 0.9) + st.equip * Math.max(0, 1 - st.months / 60) * 0.3) * f / 10) * 10; }
export function closeCost(s, st) { const pen = st.months < 60 ? Math.round(st.invested * 0.15) : 0; return { pen, back: Math.round(st.dep - 500 * pi(s) - pen) }; }
function payLoan(s, st, out) { const C = s.chicken; const p = Math.min(st.loan || 0, C.loan); if (p > 0) { const l = s.loans.find((x) => x.n === "창업대출"); s.cash -= p; C.loan -= p; if (l) { l.amt -= p; if (l.amt <= 1) s.loans = s.loans.filter((x) => x !== l); } out.push(`창업대출 ${won(p)} 일시 상환`); } }
export function sellStore(s, id, f = 1) {
  const C = s.chicken, st = C.stores.find((x) => x.id === id); if (!st) return ["매장이 없어요"];
  const price = sellPrice(s, st, f), out = [`${st.name} 영업양수도 +${won(price)}`];
  s.cash += price; addMoney(s, "inc", "치킨 양수도", price); payLoan(s, st, out);
  if (st.cum + price >= st.invested) { C.exitGood = (C.exitGood || 0) + 1; out.push("투자금 이상 회수"); } else out.push(`투자금 대비 ${won(st.cum + price - st.invested)}`);
  C.recovered += price; C.stores = C.stores.filter((x) => x !== st); log(s, `${st.name} 양수도 ${won(price)}`, "work");
  return out;
}
function sellAll(s, total) { const C = s.chicken, out = []; const sum = C.stores.reduce((a, st) => a + sellPrice(s, st), 0) || 1; for (const st of [...C.stores]) out.push(...sellStore(s, st.id, total / sum)); C.exited = s.t; return out; }
export function closeStore(s, id) {
  const C = s.chicken, st = C.stores.find((x) => x.id === id); if (!st) return ["매장이 없어요"];
  const { pen, back } = closeCost(s, st), out = [`${st.name} 폐점`, ...(pen ? [`가맹 위약금 −${won(pen)}`] : []), `보증금 회수 ${won(back)}`];
  s.cash += back; addMoney(s, back >= 0 ? "inc" : "exp", "치킨 폐점 정산", Math.abs(back)); payLoan(s, st, out);
  if (st.cum + back < st.invested) { C.hqWin = (C.hqWin || 0) + 1; out.push(`투자금 대비 ${won(st.cum + back - st.invested)}`); }
  C.stores = C.stores.filter((x) => x !== st); log(s, `${st.name} 폐점. 위약금 ${won(pen)}`, "work");
  return out;
}
export function setPrice(s, id, d) { const st = s.chicken.stores.find((x) => x.id === id); if (st) st.price = clamp(Math.round((st.price + d) * 100) / 100, 0.88, 1.2); }
export function toggle(s, id, k) { const C = s.chicken, st = C.stores.find((x) => x.id === id); if (!st) return; if (k === "app" && C.lv >= 2) st.app = !st.app; if (k === "fam" && C.lv >= 3) st.fam = !st.fam; if (k === "inc" && C.lv >= 3) st.inc = !st.inc; }
export function corp(s) { const C = s.chicken; if (C.lv < 5 || C.corp) return "치킨 3형제(Lv5)부터"; const c = Math.round(300 * pi(s)); s.cash -= c; addMoney(s, "exp", "치킨 비용", c); C.corp = true; log(s, "치킨 3형제를 법인으로 전환했다.", "work"); return `법인 전환(${won(c)}): 세무 관리로 기타 비용 −1.5%p`; }

// ───────── 위험 신호(개인회생) ─────────
export function danger(s) {
  const C = s.chicken; if (!C) return { lv: 0, n: "안전" };
  // 한 달 현금 흐름(다른 투잡은 빼고 보수적으로): 월급 + 배우자 + 치킨 순익(최근 3달 평균) − 창업대출 원금 − 생활비·주거·이자
  const h = C.hist.slice(-3), chk = h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0;
  const prin = C.stores.reduce((a, st) => a + (st.loan > 0 ? Math.min(st.loan, (st.loan0 || st.loan) / 60) : 0), 0);
  const flow = Math.round(salary(s) + spouseIncome(s) + chk - prin - monthlySpend(s));
  const room = creditRoom(s), buf = Math.max(0, s.cash) + room, burn = Math.max(0, -flow);
  const runway = burn > 0 ? buf / burn : 99;
  const late = s.debtLate || 0, loss = C.lossRun || 0;
  let lv = 0;
  if (late > 0 || runway < 3 || (s.cash < 0 && room < 300)) lv = 3; else if (runway < 8 || loss >= 3) lv = 2; else if (runway < 18 || loss >= 1) lv = 1;
  return { lv, n: ["안전", "주의", "위험", "매우 위험"][lv], runway, burn, flow, late, loss, room, debt: Math.round(debt(s)), loan: Math.round(C.loan), prin: Math.round(prin) };
}

function pickEvent(s, r) {
  const C = s.chicken, seen = (k, gap = 999) => C.seen[k] !== undefined && s.t - C.seen[k] < gap, stores = C.stores;
  if (!stores.length) return null;
  const st = r.pick(stores), mo = Math.max(...stores.map((x) => x.months)), P = [];
  const add = (id, w, ok) => { if (ok) P.push([id, w]); };
  add("e05", 1, mo >= 4 && !seen("e05") && C.fee < 0.17);
  add("e06", 1 + (st.morale < 45 ? 2 : 0), mo >= 3 && !seen("e06", 10) && !st.mgr);
  add("e07", 0.6 + (st.rating < 4.6 ? 1.5 : 0), mo >= 3 && !seen("e07", 12));
  add("e17", 0.6, mo >= 12 && !seen("e17", 36));
  add("e18", 0.6, mo >= 4 && !seen("e18", 30));
  add("e19", 0.4, mo >= 6 && !seen("e19", 48));
  add("e20", 0.6, mo >= 5 && !seen("e20", 36));
  add("e08", 0.8, mo >= 5 && !seen("e08"));
  add("e11", 0.7, C.lv >= 4 && !seen("e11", 24) && stores.every((x) => x.months >= 12));
  add("e13", 0.5 * BR.f(s).near, mo >= 10 && !seen("e13"));
  add("e14", 0.6, mo >= 30 && !seen("e14"));
  add("e15", 0.4 * BR.f(s).risk, mo >= 8 && !seen("e15", BR.f(s).risk > 1.5 ? 72 : 999)); // 사고 잦은 본사는 6년 뒤 또 터질 수 있다
  if (!P.length) return null;
  const tot = P.reduce((a, x) => a + x[1], 0); let v = r.next() * tot, id = P[0][0];
  for (const [k, w] of P) { v -= w; if (v <= 0) { id = k; break; } }
  if (id === "e11") { const price = Math.round(stores.reduce((a, x) => a + sellPrice(s, x), 0) * r.range(1.0, 1.15)); return scene(s, id, st, { price }); }
  if (id === "e17") return scene(s, id, [...stores].sort((a, b) => b.months - a.months)[0]); // 가장 오래된 매장 튀김기
  return scene(s, id, id === "e06" || id === "e07" ? (stores.find((x) => x.morale < 45 && !x.mgr) || st) : st);
}

// ───────── 플러그인 ─────────
export default {
  key: "chicken", prefix: "ch_", hubName: "치킨집",
  init: () => ({ v: 2, lv: 0, step: 0, disc: 0, risk: 0, trained: false, stores: [], seq: 0, loan: 0, invested: 0, recovered: 0, profitCum: 0, opened: 0,
    fee: 0.15, wage: 1, cost: 0, costUp: 0, pop: 1, scandal: 0, barter: false, selfFill: 0, corp: false, seen: {}, hist: [], lossRun: 0, revRun: 0, hiRun: 0, riskT: -99, nextT: 0, shifts: 0, crewActs: 0, fams: 0 }),
  actions: {
    ch_prep: { n: "창업·출점 준비", ap: 1, hp: 3, desc: "가맹 상담 → 점주 교육 → 계약·오픈. BEP 뒤엔 2·3호점" },
    ch_shift: { n: "매장 근무(튀김·피크)", ap: 1, hp: 6, desc: "직접 튀기고 피크를 막는다. 인건비 −, 별점 +" },
    ch_market: { n: "배달퉁·플레이스 관리", ap: 1, hp: 2, desc: "리뷰 답글·사진·쿠폰. 플레이스 순위 +(광고비)" },
    ch_crew: { n: "알바 관리(면접·면담)", ap: 1, hp: 2, desc: "빈자리를 채우고 사기를 올린다. 이탈·태업 −" },
    ch_survey: { n: "상권 분석", ap: 1, hp: 2, desc: "동네 손님 구성과 5년 뒤 전망, 브랜드 궁합을 봐요. 창업 전과 계약 갱신 석 달 전에만 열려요", stat: { num: 0.4 } },
    ch_mgr: { n: "점장 고용/해지", ap: 0, hp: 0, desc: "점장 월급을 주고 매장을 맡긴다(투잡 칸 +1)" },
  },
  mg: { ch_shift: "hands" },
  money: { inc: ["치킨 매출"], exp: ["치킨 비용"] },
  spots: { alley: ["ch_shift"], apt: ["ch_market"] },
  can(s, id, arg) {
    const C = s.chicken;
    if (id === "ch_survey") return BR.surveyOpen(s) ? null : `계약 갱신 석 달 전에 열려요${C.ctT != null ? `(${C.ctT - s.t}개월 뒤 갱신)` : ""}`;
    if (id === "ch_prep") {
      if (C.step < 3) { if (C.prepT === s.t) return ["다음 달에", "정보공개서 14일 숙려 중: 다음 달에", "교육 끝, 견적은 다음 달에"][C.step]; if (C.step === 2 && capacity(s) < quote(s, "deliv", C.disc).total + 300) return `창업 자금 부족: 배달형도 ${won(quote(s, "deliv", C.disc).total)} 필요(현금+대출 한도 ${won(capacity(s))})`; return null; }
      if (!C.stores.length) return capacity(s) < quote(s, "deliv", 0).total + 300 ? `재창업 자금 부족(${won(quote(s, "deliv", 0).total)} 필요)` : null;
      if (C.lv < 4) return "2호점은 BEP 돌파(Lv4)부터";
      if (C.stores.length >= 3) return "매장 3곳이 한계예요";
      if (s.t < C.nextT) return `출점 보류 중(${C.nextT - s.t}개월)`;
      if (capacity(s) < quote(s, "deliv", 0).total + 300) return `출점 자금 부족(${won(quote(s, "deliv", 0).total)} 필요)`;
      return null;
    }
    if (!C.stores.length) return C.step < 3 ? "먼저 창업 준비(오픈)" : "매장이 없어요";
    if (id === "ch_shift") { const st = C.stores.find((x) => x.id === arg) || C.stores[0]; if (st.months === 0 && st.ap >= 2) return "오픈 준비 근무는 충분해요"; }
    if (id === "ch_mgr") { const st = C.stores.find((x) => x.id === arg) || C.stores[0]; if (st.mgr) { const why = SJ.slotLock(s, () => { st.mgr = false; return () => { st.mgr = true; }; }); if (why) return why; } } // 버그 6: 마지막 점장을 끊으면 투잡 칸이 준다
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const C = s.chicken, P = pi(s);
    if (id === "ch_survey") { const ais = BR.survey(s, r); return { lines: [`상권 분석: ${ais.map((a) => BR.AREAS[a].n).join("·")}`, "손님 구성·5년 뒤 전망·브랜드 궁합을 알았어요"], msg: "토요일 저녁, 골목 입구에 서서 지나가는 사람을 셌다. 배달 오토바이가 어느 집으로 들어가는지도 적었다." }; }
    if (id === "ch_prep") {
      if (C.step < 3) C.prepT = s.t;
      if (C.step === 0 && !C.brand && !C.pickA) return { lines: ["부동산 발품"], msg: "부동산 세 곳을 돌았다. 자리부터 정해야 한다.", scene: BR.areaScene(s, r) };
      if (C.step === 0 && !C.brand) return { lines: ["창업 박람회"], msg: "부스마다 줄이 길다. 간판부터 정해야 한다.", scene: BR.pickScene(s) };
      if (C.step === 0) return { lines: ["정보공개서 수령"], msg: "본사 상담실의 커피는 달았다. 계약서는 두꺼웠다.", scene: scene(s, "e01") };
      if (C.step === 1) return { lines: ["점주 교육 신청"], msg: "교육 일정표: 월~금 09:00~18:00. 회사도 월~금 09:00~18:00이다.", scene: scene(s, "e03") };
      if (C.step === 2) return { lines: ["견적서 도착"], msg: "견적서를 펼치는 순간 숫자가 두 배가 됐다.", scene: scene(s, "e02") };
      if (!C.stores.length) return { lines: ["재창업 견적"], msg: "다시 견적서를 받았다. 이번엔 숫자를 끝까지 읽었다.", scene: scene(s, "e02") };
      return { lines: ["출점 상담"], msg: "슈퍼바이저가 태블릿을 켰다.", scene: scene(s, "e10") };
    }
    const st = C.stores.find((x) => x.id === arg) || C.stores[0];
    if (id === "ch_shift") {
      st.ap += 1; st.shifts++; C.shifts++;
      st.fry = clamp(st.fry * 0.5 + clamp((boost - 0.7) / 0.8, 0, 1) * 0.5 + (C.trained ? 0.04 : 0) + mod(s, "chFry", 0), 0, 1);
      if (st.crew < st.crewNeed && r.chance(0.5)) st.morale = clamp(st.morale + 3, 0, 100);
      st.morale = clamp(st.morale + 2 * boost, 0, 100);
      gainStat(s, "hands", 0.3); gainStat(s, "body", 0.3);
      return { lines: [`${st.name} 근무 ${Math.round(st.ap * 10) / 10}/${needAp(s, st)}`, `튀김 품질 ${Math.round(st.fry * 100)}`, `인건비 −${won(Math.round(45 * P))}`], msg: r.pick(["180도 기름, 7분 30초. 바구니를 올리면 탁탁 소리가 난다.", "금요일 밤 9시, 주문 알림이 멈추질 않는다. 앞치마가 기름으로 반짝였다.", "알바가 그만둔 자리, 오늘은 내가 튀긴다.", "치킨무를 세 박스째 채웠다. 손목이 시큰하다."]) };
    }
    if (id === "ch_market") {
      st.mk = (st.mk || 0) + 1; const eff = st.mk <= 2 ? 1 : 0.35; // 한 달 두 번까지 제대로, 그 뒤는 체감
      const add = Math.round((14 + s.st.mkt / 8) * eff * Math.min(1.3, boost) * (1 - st.buzz / 130));
      st.buzz = clamp(st.buzz + add, 0, 100); st.rating = clamp(st.rating + 0.015 * eff, 3.4, 5);
      const ad = Math.round(25 * P); s.cash -= ad; addMoney(s, "exp", "치킨 비용", ad);
      gainStat(s, "mkt", 0.4);
      return { lines: [`${st.name} 입소문 +${add}`, `광고비 −${won(ad)}`, ...(eff < 1 ? ["이번 달은 효과가 줄었어요"] : [])], msg: r.pick(["리뷰 답글 37개. \"사장님 정성에 재주문해요\"가 하나 있었다.", "메뉴 사진을 다시 찍었다. 양념이 반짝이게, 조명은 노랗게.", "플레이스 사진을 바꾸고 '동네 치킨' 키워드를 넣었다.", "재주문 쿠폰을 리뷰 이벤트로 걸었다."]) };
    }
    if (id === "ch_crew") {
      st.ap += 0.5; C.crewActs++;
      let line;
      if (st.crew < st.crewNeed) { st.crew++; st.morale = clamp(st.morale + 4, 0, 100); line = `알바 채용: ${st.crew}/${st.crewNeed}명`; }
      else { st.morale = clamp(st.morale + 14 + s.st.talk / 12, 0, 100); line = `알바 사기 ${Math.round(st.morale)}`; }
      gainStat(s, "talk", 0.3);
      return { lines: [line], msg: st.crew < st.crewNeed ? "면접 세 명 잡았는데 한 명 왔다." : r.pick(["마감 후 알바들과 떡볶이. \"사장님 다음 주도 나와요?\"", "근무표를 2주 먼저 짜 줬다. 다들 표정이 밝아졌다.", "주휴수당 계산을 다시 해 보니 맞았다. 안심."]) };
    }
    if (id === "ch_mgr") {
      st.mgr = !st.mgr; st.mgrIdle = 0;
      return { lines: [st.mgr ? `${st.name} 점장 고용: 월 ${won(Math.round(310 * C.wage * P))}(알바 시간 −${won(Math.round(140 * P))}), 근무 필요 0.5` : `${st.name} 점장 해지`], msg: st.mgr ? "\"사장님 걱정 마세요.\" 걱정이 시작됐다." : "다시 내가 튀긴다." };
    }
    return null;
  },
  month(s, r, notes, scenes) {
    const C = s.chicken, P = pi(s); let total = 0, rev0 = 0, fsc = null;
    BR.brandMonth(s, r, notes, scenes);
    if (!C.stores.length) { C.hist.push(0); if (C.hist.length > 24) C.hist.shift(); return 0; }
    if (C.costUp > 0) C.costUp--;
    if (C.scandal > 0) C.scandal--;
    if (C.selfFill > 0) C.selfFill--;
    const syn = (SYN.on(s, "ch_insta") ? 1.04 : 1) * (SYN.on(s, "ch_ucafe") || C.barter ? 1.03 : 1);
    for (const st of C.stores) {
      const T = TYPES[st.type], need = needAp(s, st) + (C.selfFill && !st.mgr ? 1 : 0), q = st.mgr ? clamp(0.85 + 0.15 * st.ap / need, 0, 1) : clamp(st.ap / need, 0, 1), own = st.mgr ? 0 : Math.min(3, st.shifts);
      // 알바: 사기·이탈·태업
      const short = Math.max(0, st.crewNeed - st.crew), cover = Math.min(short, Math.floor(st.shifts / 2)), unc = short - cover;
      st.morale = clamp(st.morale + (58 - st.morale) * 0.25 - (C.wage > 1.08 ? 2 : 0) + (st.inc ? 4 : 0) - unc * 4 + (q - 0.5) * 6, 0, 100);
      // 별점·순위
      const fry = st.mgr && !st.shifts ? Math.min(st.fry, 0.45) : st.fry;
      let target = 4.32 + 0.28 * q + 0.22 * fry + (C.trained ? 0.04 : 0) + (SYN.on(s, "ch_cook") ? 0.05 : 0) + mod(s, "chStar", 0) - 0.07 * unc - 1.4 * Math.max(0, st.price - 1) - (st.morale < 35 ? 0.1 : 0) + (st.revEv ? CH_F30.rev.star : 0) - (st.revOff > 0 ? CH_F30.rev.off : 0);
      st.rating = clamp(st.rating + (target - st.rating) * 0.4 + 0.03 * r.normal(), 3.4, 5);
      st.rank = clamp(Math.round(29 - st.buzz * 0.17 - (st.rating - 4.4) * 22 + r.int(-1, 1)), 1, 30);
      const mk = (30 - st.rank) / 29;
      // 주문 → 매출
      let dem = (0.9 + 0.25 * mk) * (1 + (st.rating - 4.6) * 0.35) * seas(s.cal) * st.loc * (st.zone || 1) * C.pop * syn * (0.75 + 0.25 * q) * Math.pow(st.price, -1.5);
      if (st.months === 0) dem *= 0.75; else if (st.months < 6) dem *= 0.8 + 0.035 * st.months; // 첫 달은 공사·오픈 반달, 6개월 램프
      dem *= SJ.ramp(s, "chicken"); // 첫 매장 초반 고생: 배달앱 순위·리뷰가 쌓일수록 1로(sj.js ENTRY)
      if (unc) dem *= 1 - 0.08 * unc;
      if (st.morale < 35) dem *= 0.95;
      if (st.mgr && !st.inc && st.shifts < 1) dem *= CH_TXT.auto; // 오토 운영: 직원은 매출을 올릴 이유가 없다
      if (C.scandal) dem *= CH_TXT.scandal;
      dem *= BR.dem(s) * BR.fitOf(s, st); // 11-23 브랜드 힘 × 올해 인기 × 상권 궁합·상권 크기
      if (st.lost) { dem *= 1 - st.lost; st.lost = 0; }
      if (s.era?.winter) dem *= 0.95;
      if (st.app) dem *= 0.985;
      dem *= flagMul(st) * (st.freshM > 0 ? 1 + CH_F30.renew.boost : 1) * (st.old ? 1 - CH_F30.renew.old : 1); // 11-22 깃발·리뉴얼
      dem = Math.max(0.2, dem * (1 + 0.05 * r.normal()));
      const orders = Math.round(T.base * dem / 2.4), rev = Math.round(orders * 2.4 * P * st.price);
      const mat = rev / st.price * BR.f(s).mat * (C.costUp ? 1.1 : 1) * (1 + C.cost) + (st.revEv ? rev * CH_F30.rev.cost : 0);
      const fee = rev * T.dshare * C.fee * (st.app ? 0.8 : 1);
      let lab = (T.lab + 0.1 * T.base * dem) * C.wage * P * (1 - 0.12 * short) - own * 45 * P - (st.fam ? 120 * P : 0) - (C.selfFill && !st.mgr ? 40 * P : 0);
      lab = Math.max(T.lab * 0.4 * P, lab) + (st.mgr ? (310 * C.wage - 140) * P : 0); // 점장 월급 − 점장이 대신하는 알바 시간
      const other = rev * (C.corp ? 0.015 : 0.03) + (45 - CH_F30.flag.def * CH_F30.flag.cost + (st.flags ?? CH_F30.flag.def) * CH_F30.flag.cost) * P + (st.inc ? rev * 0.015 : 0) + rev * BR.f(s).ad; // 본사 광고 분담금
      const cost = Math.round(mat + fee + lab + st.rent + other);
      const profit = rev - cost;
      s.cash += rev - cost; addMoney(s, "inc", "치킨 매출", rev); addMoney(s, "exp", "치킨 비용", cost);
      st.last = { orders, rev, cost, profit, mat: Math.round(mat), fee: Math.round(fee), lab: Math.round(lab), rent: st.rent, other: Math.round(other), q, unc };
      st.hist.push(profit); if (st.hist.length > 24) st.hist.shift();
      st.cum += profit; total += profit; rev0 += rev;
      st.revOk = rev >= 4000 * P ? st.revOk + 1 : 0;
      if (st.fam) { s.fam.happy = clamp(s.fam.happy - 2 * mod(s, "chFamTire", 1), 0, 100); C.fams++; }
      // 알바 이탈
      const quitP = clamp(0.05 + (60 - st.morale) / 260, 0.02, 0.35) * mod(s, "chQuit", 1);
      if (!st.mgr && st.crew > 0 && r.chance(quitP)) { st.crew--; notes.push(`${st.name}: 알바 한 명이 그만뒀다(${st.crew}/${st.crewNeed}명). 빈자리는 내가 튀겨야 한다`); }
      if (st.mgr && st.crew < st.crewNeed) st.crew = Math.min(st.crewNeed, st.crew + 1); // 점장이 뽑는다
      if (st.mgr && st.shifts < 1 && !st.inc) st.mgrIdle++; else st.mgrIdle = 0;
      st.buzz = Math.max(0, st.buzz * 0.78 - (st.months > 18 ? 1 : 0)); st.fry = st.fry * 0.85 + 0.45 * 0.15;
      if (st.months > 0 && st.months % 24 === 0) { st.rent = Math.round(st.rent * 1.05); notes.push(`${st.name}: 건물주가 월세를 5% 올렸다(${won(st.rent)})`); }
      st.months++; st.ap = 0; st.shifts = 0; st.mk = 0;
      // 11-22 깃발 경쟁·리뉴얼·리뷰 이벤트
      { const F3 = CH_F30.flag, R3 = CH_F30.renew; st.flags ??= F3.def; st.rv ??= F3.def;
        if (st.months >= 2) { if (st.rv < F3.max && ((st.flags > st.rv && r.chance(F3.rvUp)) || r.chance(F3.rvRand))) { st.rv++; if (s.t - (C.flagT ?? -99) >= F3.gap) { C.flagT = s.t; fsc = fsc || flagScene(s, st); } else notes.push(`${st.name}: 옆 치킨집 깃발이 ${st.rv}개로 늘었다`); } else if (st.rv > F3.def && st.flags <= st.rv && r.chance(F3.rvDown)) st.rv--; }
        if (st.freshM > 0) st.freshM--;
        if (st.revEv) st.revM = (st.revM || 0) + 1; else if (st.revOff > 0) st.revOff--;
        if (st.months % R3.every === 0 && st.renewAt !== st.months) { st.renewAt = st.months; fsc = renewScene(s, st, "ask"); }
        else if (st.old && st.refuseT !== undefined && st.months - st.refuseT === R3.wait) { if (r.chance(R3.refuseP)) fsc = renewScene(s, st, "deny"); else { st.refuseT = undefined; notes.push(`${st.name}: 본사가 이번 재계약은 넘어갔다. 낡은 매장은 그대로`); } } }
      // 창업대출 원금: 5년 분할(이자는 대출 이자로 따로 나간다)
      if (st.loan > 0) { const p = Math.min(st.loan, Math.round((st.loan0 || st.loan) / 60)); st.loan -= p; C.loan = Math.max(0, C.loan - p); s.cash -= p; addMoney(s, "exp", "창업대출 원금", p); const l = s.loans.find((x) => x.n === "창업대출"); if (l) { l.amt -= p; if (l.amt <= 1) s.loans = s.loans.filter((x) => x !== l); } }
      if (st.months === 1) scenes.push(scene(s, "e04", st));
      if (st.mgr && st.mgrIdle >= 3 && !C.seen.e16) scenes.push(scene(s, "e16", st));
    }
    C.profitCum += total; C.hist.push(Math.round(total)); if (C.hist.length > 24) C.hist.shift();
    C.lossRun = total < 0 ? C.lossRun + 1 : 0;
    const sal = salary(s);
    C.hiRun = sal && total >= sal * 1.5 ? C.hiRun + 1 : 0;
    // 단계
    const st1 = C.stores[0], bepNeed = (st1?.invested || 0) - ((s.me?.traits || []).includes("cfo") ? Math.max(0, avgP(st1)) * 6 : 0);
    const up = (n, line) => { if (C.lv < n) { C.lv = n; notes.push(`치킨 단계 업! Lv${n} ${LV[n].n}: ${LV[n].open}`); log(s, `치킨 Lv${n} ${LV[n].n}`, "work"); if (line) notes.push(line); } };
    if (C.lv === 1 && C.stores.some((x) => x.revOk >= 3 && x.rating >= 4.8)) up(2);
    if (C.lv === 2 && rev0 >= 5000 * P && total >= 600 * P) up(3);
    if (C.lv === 3 && st1 && st1.cum >= bepNeed) up(4, "본사 다점포 상담이 열렸어요(창업·출점 준비)");
    if (C.lv === 4 && C.stores.length >= 3 && C.hiRun >= 1) up(5);
    // 매년 1월: 최저임금·인구 감소
    if (s.cal === 12) { const upw = r.int(3, 7); C.wageNext = upw; if (!C.seen.e09) scenes.push(scene(s, "e09", st1, { up: upw })); else notes.push(`내년 최저임금 +${upw}%. 인건비 계산을 다시 했다`); }
    if (s.cal === 1) { C.wage *= 1 + Math.max(0.5, (C.wageNext || 4) - CH_BAL.wageInfl) / 100; C.pop *= 0.995; notes.push("출생아 감소·1인 가구: 동네 치킨 주 고객이 조금 줄었다(수요 −0.5%)"); }
    if (!C.costUp && r.chance(0.02)) { C.costUp = 5; notes.push("닭값·식용유 급등! 5개월 동안 재료비 +10%. 본사 필수구매가도 같이 올랐다"); }
    if (r.chance(0.04)) notes.push(r.pick(["근처에 다른 치킨 브랜드가 생겼다. 전단지가 우리 문에도 꽂혔다", "배달 라이더가 모자라 주문이 20분씩 밀렸다", "본사에서 새 시즌 메뉴 교육 공문이 왔다(필수 구매 소스 추가)"]));
    // 11-22 리뷰 이벤트 장면(처음 권유 / 오래 하면 함정)
    if (!fsc && !C.seen.rv1 && C.stores.some((x) => x.months >= 2) && !C.stores.some((x) => x.revEv) && r.chance(0.25)) fsc = revScene(s, "ask");
    else if (!fsc && C.stores.some((x) => x.revEv && x.revM >= 8) && s.t - (C.seen.rv2 ?? -99) >= 18 && r.chance(0.06)) fsc = revScene(s, "trap");
    if (fsc) scenes.push(fsc);
    // 본업 1.5배
    if (C.hiRun >= 6 && !C.seen.e12 && !(s.co.quit || s.co.fired)) scenes.push(scene(s, "e12", st1));
    // 위험 신호
    const dg = danger(s);
    if (dg.lv >= 2 && s.t - C.riskT >= 4 && C.stores.length) { C.riskT = s.t; const w = [...C.stores].sort((a, b) => avgP(a) - avgP(b))[0]; scenes.push(scene(s, "risk", w, { why: C.lossRun ? `치킨집 적자 ${C.lossRun}개월째.` : `통장이 매달 ${won(dg.burn)}씩 줄고 있다. 버틸 수 있는 건 약 ${Math.round(dg.runway)}개월.`, fire: sellPrice(s, w, 0.6) })); }
    else if (r.chance(0.13)) { const e = pickEvent(s, r); if (e) scenes.push(e); }
    return total;
  },
  value(s) { const C = s.chicken; if (!C?.stores) return 0; return C.stores.reduce((a, st) => a + st.dep + Math.round(st.equip * Math.max(0, 1 - st.months / 60)), 0); },
  passive(s) { const C = s.chicken; if (!C?.stores) return 0; return Math.round(C.stores.filter((st) => st.mgr).reduce((a, st) => a + Math.max(0, avgP(st)), 0)); },
  slot: (s) => !!s.chicken?.stores?.some((st) => st.mgr),
  todos(s) {
    const C = s.chicken, t = [];
    if (C.step < 3) t.push({ lv: 1, text: ["치킨: 가맹 상담·정보공개서 받기", "치킨: 점주 교육", "치킨: 견적 받고 오픈"][C.step] });
    for (const st of C.stores) {
      const n = needAp(s, st) + (C.selfFill && !st.mgr ? 1 : 0);
      if (st.ap < n) t.push({ lv: st.ap < n * 0.5 ? 2 : 1, text: `${st.name} 근무 ${Math.round(st.ap * 10) / 10}/${n}` });
      if (st.crew < st.crewNeed && !st.mgr) t.push({ lv: st.crew < st.crewNeed - 1 ? 2 : 1, text: `${st.name} 알바 빈자리 ${st.crewNeed - st.crew}명` });
    }
    const dg = danger(s); if (C.stores.length && dg.lv >= 2) t.unshift({ lv: 2, text: `개인회생 위험 신호 '${dg.n}': 치킨 보드 확인` });
    return t;
  },
  stopWhy: (s) => (s.chicken.stores.length ? "매장을 모두 양도하거나 폐점해야 접을 수 있어요" : null),
  choose: { ch_ev: evChoose, ch_flag: (s, r, i, ok) => f30Choose(s, r, i, ok, "ch_flag"), ch_renew: (s, r, i, ok) => f30Choose(s, r, i, ok, "ch_renew"), ch_revev: (s, r, i, ok) => f30Choose(s, r, i, ok, "ch_revev") },
  migrate(s, T) { if (!T.v) T.v = 1; T.seen = T.seen || {}; T.stores = T.stores || []; if (T.v < 2) { T.v = 2; for (const st of T.stores) { st.flags ??= CH_F30.flag.def; st.rv ??= CH_F30.flag.def; st.revEv = !!st.revEv; st.revM = st.revM || 0; st.revOff = st.revOff || 0; st.renewAt ??= Math.floor(st.months / CH_F30.renew.every) * CH_F30.renew.every; } } },
  milestones: [
    { key: "ch_sign", title: "가맹 계약서에 서명", test: (s) => (s.chicken?.lv || 0) >= 1, lines: ["두꺼운 계약서 마지막 장에 이름을 썼다. 손에 땀이 났다.", "\"축하드립니다, 점주님.\" 점주님. 처음 듣는 호칭이다."] },
    { key: "ch_lv2", title: "별점 관리 사장님", test: (s) => (s.chicken?.lv || 0) >= 2, lines: ["배달퉁 별점 4.8. 리뷰 알림이 울릴 때마다 심장이 먼저 뛴다.", "\"사장님 답글 보고 시켰어요.\" 답글도 장사다."] },
    { key: "ch_lv3", title: "가족 경영", test: (s) => (s.chicken?.lv || 0) >= 3, lines: ["월매출 5,500만. 토요일 저녁, 가족이 포장대에 섰다.", "엄마가 치킨무를 담으며 말했다. \"너 회사 다니는 거 맞니?\""] },
    { key: "ch_lv4", title: "BEP 돌파", test: (s) => (s.chicken?.lv || 0) >= 4, lines: ["1호점 투자금을 다 찾았다. 이제부터 튀기는 닭은 진짜 내 몫이다.", "엑셀의 빨간 숫자가 처음으로 검은색이 됐다."] },
    { key: "ch_lv5", title: "치킨 3형제", test: (s) => (s.chicken?.lv || 0) >= 5, lines: ["지도 앱에 황금닭 세 곳. 금요일 밤 세 매장 주문 알림이 동시에 울렸다.", "회사 월급의 1.5배. 사원증이 갑자기 가볍다."] },
    { key: "ch_end_ceo", end: true, kind: "good", epi: "치킨 세 매장을 법인으로 묶었다. 금요일 밤 주문 알림 세 개가 동시에 울린다.", title: "엔딩: 튀김 장인 법인 대표", test: (s) => !!s.chicken?.corp && (s.chicken?.stores?.length || 0) >= 3 && (s.fullJob === "chicken" || !!s.co?.quit), lines: ["회사에서는 보고서를 튀겼고, 이제는 닭을 튀긴다. 둘 다 바삭해야 산다."] },
    { key: "ch_end_hq", end: true, kind: "bad", epi: "간판은 유명했지만 남은 건 본사 몫이었다. 다시는 '오늘 계약하시면'에 서명하지 않는다.", title: "엔딩: 본사만 배불렀다", test: (s) => (s.chicken?.hqWin || 0) >= 1, lines: ["간판은 유명했다. 그런데 그 간판 아래에 내가 없었다."] },
    { key: "ch_end_exit", end: true, kind: "good", epi: "치킨집은 웃으며 넘겼다. 튀김기 앞 화상 자국만 기념으로 남았다.", title: "엔딩: 깔끔한 양수도", test: (s) => (s.chicken?.exitGood || 0) >= 1 && (s.chicken?.lv || 0) >= 4, lines: ["들어갈 때보다 나올 때가 더 어려운 업종에서, 웃으며 문을 닫았다."] },
  ],
  perks: [
    { id: "p_ch_fry", n: "황금 손목", line: "7분 30초는 몸이 안다", pro: "치킨 튀김 품질 +0.06(별점 +)", m: { chFry: 0.06 }, got: "매장 근무 120번 + 별점 4.85 매장", test: (s) => (s.chicken?.shifts || 0) >= 120 && (s.chicken?.stores || []).some((st) => (st.rating || 0) >= 4.85) },
    { id: "p_ch_crew", n: "알바 대장", line: "근무표는 2주 먼저", pro: "치킨 알바 이탈 −40%", m: { chQuit: 0.6 }, got: "알바 관리 12번 + 매장 2곳", test: (s) => (s.chicken?.crewActs || 0) >= 12 && (s.chicken?.stores || []).length >= 2 },
  ],
  perkCine: { p_ch_fry: "ch_lv2", p_ch_crew: "ch_lv3" },
  synergy: [
    { id: "ch_insta", kind: "good", n: "인별그램 × 치킨", need: "인별그램 + 프랜차이즈 치킨", desc: "매장 계정·지역 해시태그: 주문 +4%, 본사 오너 논란 피해 절반", test: (s) => !!s.sj?.active?.includes("chicken") && !!s.sj?.active?.includes("insta") },
    { id: "ch_ucafe", kind: "good", n: "무인카페 × 치킨", need: "무인카페 + 프랜차이즈 치킨", desc: "가맹·매장 운영 노하우, 영수증 제휴: 주문 +3%", test: (s) => !!s.sj?.active?.includes("chicken") && !!s.sj?.active?.includes("ucafe") },
    { id: "ch_cook", kind: "good", n: "쿠킹 클래스 × 치킨", need: "홈카페·쿠킹 클래스 + 치킨", desc: "기름 온도 감각: 별점 +0.05", test: (s) => !!s.sj?.active?.includes("chicken") && (s.hb?.joined || []).includes("cook") },
    { id: "ch_night", kind: "bad", n: "튀김기 × 회사", need: "치킨 직접 운영 + 회사 다니는 중", desc: "퇴근하고 바로 매장: 근무할 때 회사 눈치가 쌓인다", test: (s) => !!s.sj?.active?.includes("chicken") && !(s.co?.quit || s.co?.fired) && !!s.chicken?.stores?.some((x) => !x.mgr) },
  ],
  traits: [
    { trait: "goldhand", t: "튀김 손이 빠르다: 치킨 별점 +0.04", m: { chStar: 0.04 } },
    { trait: "familyfirst", t: "가족이 매장을 돕는 걸 덜 힘들어한다", m: { chFamTire: 0.5 } },
  ],
  eff(s, eff, out) {},
  monthStart(s, r) { // 튀김기 × 회사: 직접 운영 중이면 매달 눈치 조금
    if (SYN.on(s, "ch_night")) { const n = s.chicken.stores.filter((x) => !x.mgr).length; s.co.eye = clamp(s.co.eye + 1.5 * n, 0, 100); }
  },
};
