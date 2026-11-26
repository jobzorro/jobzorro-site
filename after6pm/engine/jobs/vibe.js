// 바이브코딩: 코딩 AI "코디"에게 말로 시켜 만든다.
// 사내 자동화 → 내 소개 사이트 → 지인·동네 가게 파일럿 → 재능마켓 외주 → 유지보수(리테이너) → 내 앱 구독 → 매각 또는 문 닫기.
// 현실 고생: 매달 바뀌는 도구·구독료, 끝없는 수정 요청, 새벽 장애, 보안 사고, 해외 반값 견적, 회사 겸직 눈치.
// 규약: engine/jobs/README.md
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod, applyEff, R, jo, CHAR } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js"; // 초반 고생 배율(ramp)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r5 = (x) => Math.max(0, Math.round(x / 5) * 5);
const employed = (s) => !(s.co?.quit || s.co?.fired);
const isOn = (s) => !!s.sj?.active?.includes("vibe");

// ───────── 단계(기획 데이터 levels) ─────────
export const LV = [
  null,
  { n: "프롬프트 개발자", line: "도구를 깔고 내 소개 사이트를 띄웠다", unlock: "지인·동네 가게 파일럿, 견적서 템플릿" },
  { n: "첫 외주", line: "남의 가게 예약 버튼이 내 코드다", unlock: "재능마켓 등록, 건당 50~90만 외주" },
  { n: "리테이너 보유자", line: "매달 들어오는 유지보수비가 생겼다", unlock: "단가 +25%, 개발 일지, 내 앱 베타" },
  { n: "업종 전문가", line: "한 업종이라면 눈 감고도 만든다", unlock: "업종 패키지(건당 200~400만), 하청 개발자, 기업 출강" },
  { n: "솔로프리너", line: "구독과 유지보수만으로 생활비가 된다", unlock: "서비스 매각 제안, 퇴사 판단" },
];
// 다음 단계 조건: [설명, 진행(0~1)]
export function nextGoal(s) {
  const V = s.vibe, a3 = avg3(V);
  if (V.lv === 1) return [`내 소개 사이트 + 파일럿 후기 3건 (사이트 ${V.site ? "✓" : "✗"} · 후기 ${V.refs}/3)`, ((V.site ? 1 : 0) + Math.min(3, V.refs)) / 4];
  if (V.lv === 2) return [`최근 3달 평균 순이익 100만 + 유지보수 계약 1건 (${won(Math.round(a3))} · ${V.rets.length}/1)`, (clamp(a3 / 100, 0, 1) + Math.min(1, V.rets.length)) / 2];
  if (V.lv === 3) { const c = bestCase(V); return [`한 업종 사례 3건 + 최근 3달 평균 250만 (${c[0] ? INDS[c[0]].n : "업종"} ${c[1]}/3 · ${won(Math.round(a3))})`, (Math.min(3, c[1]) / 3 + clamp(a3 / 250, 0, 1)) / 2]; }
  if (V.lv === 4) return [`반복 수입(유지보수+구독) 비중 40%·월 250만 이상 3달 연속 (${V.recStreak}/3)`, V.recStreak / 3];
  return ["최고 단계. 매각할지, 키울지, 퇴사할지는 내가 정한다", 1];
}
const avg3 = (V) => { const h = V.hist.slice(-3); return h.length ? h.reduce((a, b) => a + b, 0) / Math.max(3, h.length) : 0; };
const bestCase = (V) => Object.entries(V.cases).sort((a, b) => b[1] - a[1])[0] || [null, 0];

// ───────── 업종·의뢰 경로·도구 ─────────
export const INDS = {
  academy: { n: "학원", jobs: ["출결 앱", "수강 신청 페이지", "학부모 알림 봇", "숙제 제출 페이지"] },
  fit: { n: "요가·필라테스", jobs: ["수업 예약 페이지", "회원권 관리 앱", "출석 스탬프 앱"] },
  shop: { n: "식당·카페", jobs: ["가게 홈페이지", "예약·주문 페이지", "재고 알림 봇", "단골 쿠폰 앱"] },
  salon: { n: "미용실·네일", jobs: ["예약 앱", "포인트 적립 페이지", "시술 사진 갤러리"] },
  biz: { n: "직장인", jobs: ["보고서 자동화 툴"] }, // 내 앱(사내 자동화에서 출발)만
};
export const IND_KEYS = ["academy", "fit", "shop", "salon"];
export const CH = {
  friend: { n: "지인·동네", lv: 1, fee: 0, tip: "아는 사장님께 먼저. 싸거나 공짜지만 후기가 남는다" },
  market: { n: "재능마켓", lv: 2, fee: 0.2, tip: "수수료 20%. 해외 팀과 가격 경쟁" },
  post: { n: "개발 일지", lv: 3, fee: 0, tip: "만든 과정을 글로 올리면 문의가 온다" },
  pkg: { n: "업종 패키지", lv: 4, fee: 0, tip: "한 업종 템플릿을 고쳐 쓴다. 비싸고 빠르다" },
};
export const TOOL = [
  { n: "무료 티어", c: 0, sp: 0.7, d: "느리고 하루 한도가 있다" },
  { n: "기본 구독 2개", c: 5, sp: 1.0, d: "코디 + 배포 서비스" },
  { n: "프로 풀세트", c: 12, sp: 1.2, d: "코디 프로 + DB + 배포 + 모니터링" },
];
// 수요 시기: 1~3월 개업·신학기, 11~12월 연말 예산, 7~8월 휴가철 비수기
export const SEASON = [1.25, 1.2, 1.15, 1, 1, 0.95, 0.8, 0.8, 1, 1, 1.05, 1.15];

// ───────── 계산 도우미 ─────────
export function speed(s) {
  const V = s.vibe;
  return TOOL[V.tool].sp * (V.tq || 1) * (1 + V.tech / 200) * (SYN.on(s, "vb_code") ? 1.15 : 1) * mod(s, "vbSpeed", 1); // 데이터 덕후 +30%는 defs 성향 카드(vbSpeed)에서 온다
}
export const maxProj = (s) => 2 + (s.vibe.lv >= 3 ? 1 : 0) + (s.vibe.agent ? 1 : 0);
// 11-21 밸런스(10개 투잡 공통 비교, 기획 vibecode.json: 중위 월 100만·p75 200만·p95 500만, 리테이너 2~3건).
// 원래: 유지보수 계약 최대 5건, 앱 사용자 상한 20 + 단계×12 + 평판×0.4(→ appBase + 단계×appLv + 평판×appRep) → 3년 차 중앙 월 220만, 10년 차 430만.
// devGood: '퇴근 후 1인 개발사' 엔딩에 세는 좋은 달 기준(원래 100만 → 보통 플레이 100%가 받아 150만으로)
export const VB_BAL = { retMax: 2, appBase: 12, appLv: 6, appRep: 0.2, devGood: 150 };
// 11-22 특이 요소 3개(범위 싸움, 모델이 바뀌면 코드가 깨진다, 앱 심사 거절). 효과 크기는 여기만 고친다.
export const VB_F30 = {
  scope: { // 계약서 범위: 의뢰 답장 확률 ×win, 수정 요청 확률 ×creep, 꼼꼼하면 범위 밖 요청마다 추가 견적(잔금 × paid)
    loose: { n: "느슨하게", win: 1.3, creep: 1.8, paid: 0, tip: "\"네, 다 돼요!\" 수주는 쉽지만 추가 요청이 끝이 없어요" },
    std: { n: "보통", win: 1, creep: 1, paid: 0, tip: "기능 목록만 적어요" },
    tight: { n: "꼼꼼하게", win: 0.75, creep: 0.4, paid: 0.12, tip: "화면·횟수까지 적어요. 깐깐해 보여 답장이 줄지만 범위 밖은 추가 견적" },
  },
  fight: 3, // 한 의뢰의 수정 요청이 이만큼 쌓이면 '범위 싸움' 장면(꼼꼼하면 없음)
  model: { p: 0.04, gap: 14, debtM: 6, debtFix: 1, debtOut: 0.04, debtQuit: 0.01, pay: 20, tq: 1.1 }, // 모델 업데이트: 달마다 4%(14달 간격). 버전 고정 = 기술 부채 6달(유지보수 +1칸, 장애 +4%p, 계약 해지 +1%p)
  store: { rejectP: 0.5, holdM: 2, webCap: 0.85, noPayChurn: 0.015, updRej: 0.08 }, // 첫 심사 거절 50%. 재심사 2달, 웹으로 돌리면 사용자 한도 ×0.85, 바깥 결제는 해지율 +1.5%p, 앱 업데이트 심사 거절 8%
};
// 11-26 투잡 챌린지(바이브코딩): 처음부터 있는 어려움 + 도메인의 시대. 수치는 여기만 고친다.
// 세기 손잡이: 환경변수 VBK(기본값 = VB_CH.k). 오류 확률·문의 0건 확률·도메인 밖 문의 감소폭·단가 하한·재능마켓 단가 바닥에 곱해진다. 첫 5년(s.t < 60)에는 1을 넘지 않는다.
export const VB_CH = {
  k: 1, // 11-26 봇(2회차 400판): 1.0 → 파이어 33.5%, 1.4 → 32.8%, 1.8 → 32.0%. 세게 해도 거의 안 내려가서 기획 수치 그대로인 1로 둔다
  err: { redoHi: 0.25, redoLo: 0.12, fail: 0.05, redoNeed: 0.3, redoPay: 0.7, redoRep: 2, failRep: 6 }, // 납품 오류: 재작업 12~25%(기술 이해·정의서로 내려간다, 작업 +30%·한 달 밀림·잔금 70%), 실패 약 5%(착수금 환불·평판 −6)
  dry: { zero: 0.15, start: 0.03, len: [2, 3], sell: 0.6 }, // 문의 0건인 달 15%, 달마다 3%로 2~3달 가뭄(가뭄 중 영업 답장 ×0.6)
  comp: { cut: 0.04, floor: 0.6, leadT: 36, leadCut: 0.03, leadFloor: 0.7 }, // 재능마켓 단가 해마다 −4%(바닥 60%), 3년 차부터 문의 해마다 −3%(바닥 70%)
  dom: { preT: 36, onT: 72, max: 2, outCut: 0.7, lead: 0.35, lo: 0.45, co: 1.2, meet: [3, 4], meetGap: 3, pal: 0.5, palMax: 2, palAff: 60, mate: 0.6, job: 0.8, deliver: 2 },
  // 도메인 시대: 밖 문의 −70%, 고른 도메인마다 문의 ×0.35, 단가 = 기본 × (0.45 + 0.55 × 이해도/100)
  // 이해도(달): 회사 +1.2, 친한 업계 사람 한 명 +0.5(두 명까지), 배우자·연인 +0.6, 내 다른 투잡 +0.8 / 업계 모임 한 번 +3~4(도메인마다 석 달에 한 번) / 납품 건마다 +2
};
// 11-26 도메인 확장: 도메인 시대(본 사건 뒤)부터 유지보수 계약과 내 앱에도 "그 분야를 아는 사람만 찾는다"가 걸린다. 첫 5년에는 아무것도 없다.
VB_CH.x = {
  retOut: 0.15, // 도메인 밖 건을 납품했을 때 유지보수로 이어질 확률 배율
  renew: 12, // 유지보수 재계약 주기(달): 그때의 이해도로 월 유지보수비를 다시 정한다
  outQuitYr: 0.01, outQuitMax: 0.05, // 도메인 밖 계약: 달마다 해지 확률이 도메인 시대 1년마다 +1%p씩(최대 +5%p)
  retPer: [1, 2], // 한 도메인에서 맺을 수 있는 유지보수 계약 수: 이해도 80 미만 1건, 80 이상 2건(그 업계에서 이름이 알려져야 소개가 돈다)
  hiU: 80, hiQuit: 0.004, // 이해도 80 이상인 도메인 계약: 해지 확률 −0.4%p
  appOutCap: 0.4, appOutGrow: 0.7, appOutChurn: 0.02, // 범용 앱: 사용자 한도 ×0.4, 성장 ×0.7, 해지 +2%p
  spN: 3, spLose: 0.06, // 도메인 특화: 기능 업데이트 3번, 한 번마다 사용자 6% 이탈
  appLo: 0.4, appHi: 1.0, // 특화한 앱의 한도 배율 = 0.4 + 0.6 × 이해도/100. 봇 800판: appHi 1.0 → 2회차 파이어 31.1%, 1.05 → 34.5%, 1.1 → 35.9%, 1.15 → 37%(한도 보상이 파이어율을 크게 올린다)
  priceMax: 5, priceUp: 2, // 구독료 상한 5만(특화한 앱은 이해도 100에서 7만)
};
if (typeof process !== "undefined" && process.env.VBX) Object.assign(VB_CH.x, JSON.parse(process.env.VBX)); // 봇 맞춤용: VBX='{"appOutCap":0.5}'
const K = (typeof process !== "undefined" && +process.env.VBK) || VB_CH.k;
const Kt = (s) => (s.t < 60 ? Math.min(1, K) : K); // 첫 5년에는 1보다 세지지 않는다(처음부터 있는 어려움은 기획 수치 그대로)
export const DOMS = {
  mfg: { n: "제조", jobs: ["설비 점검 기록 앱", "불량 집계 대시보드", "작업 지시서 자동화"] },
  fin: { n: "금융", jobs: ["상담 예약 페이지", "실적 보고 자동화 툴", "고객 안내 챗봇"] },
  retail: { n: "유통", jobs: ["재고·발주 알림 봇", "매장 매출 대시보드", "행사 상품 등록 툴"] },
  edu: { n: "교육", jobs: ["수강 관리 시스템", "과제 채점 보조 툴", "학습 진도 대시보드"] },
  med: { n: "의료", jobs: ["진료 예약 페이지", "문진표 태블릿 앱", "재진 안내 알림 봇"] },
  realty: { n: "부동산", jobs: ["매물 관리 대장", "임대료 정산 툴", "계약 만기 알림 봇"] },
  content: { n: "콘텐츠", jobs: ["원고 일정 관리 보드", "구독자 통계 대시보드", "협찬 견적 자동화"] },
  public: { n: "공공", jobs: ["민원 접수 페이지", "행사 신청·추첨 시스템", "보고 양식 자동화"] },
  food: { n: "외식", jobs: ["주방 발주 앱", "예약·웨이팅 페이지", "매장 원가 계산 툴"] },
  logi: { n: "물류", jobs: ["배차 일정 보드", "입출고 기록 앱", "배송 조회 페이지"] },
};
export const DOM_KEYS = Object.keys(DOMS);
// 회사(게임 안 이름) → 업계. 표에 없는 회사는 회사 종류로 본다.
const CO_DOM = {
  "사성전자": ["mfg"], "현재자동차": ["mfg"], "엘쥐전자": ["mfg"], "스크하이닉스": ["mfg"], "포스크": ["mfg"], "한와솔루션": ["mfg"], "CZ제일제당": ["mfg", "food"], "롯대쇼핑": ["retail"],
  "코웨어": ["mfg", "retail"], "오뚝이": ["mfg", "food"], "한셈": ["mfg", "realty"], "농신": ["mfg", "food"], "동완F&B": ["mfg", "food"], "대승": ["retail", "logi"],
  "토쓰": ["fin"], "홍당무": ["retail"], "유신사": ["retail", "content"], "야놀까": ["realty", "content"], "마켓걸리": ["retail", "logi"], "직빵": ["realty"],
  "대한전력공사": ["public"], "대한철도공사": ["public", "logi"], "대한토지주택공사": ["public", "realty"], "국민튼튼보험공단": ["public", "med"], "인청국제공항공사": ["public", "logi"],
};
const TYPE_DOM = { big: ["mfg"], fin: ["fin"], mid: ["mfg", "retail"], startup: ["content", "retail"], public: ["public"] };
// 직무 → 업계
const JOB_DOM = { buy: ["logi", "retail"], ovs: ["logi"], sales: ["retail"], md: ["retail"], mkt: ["content"], prj: ["content"], dsgn: ["content"], rnd: ["mfg"], prod: ["mfg"], tech: ["mfg"], hr: ["edu"], admin: ["public"],
  acct: ["fin"], rm: ["fin"], pb: ["fin"], risk: ["fin"], am: ["fin"], ib: ["fin"], ins: ["fin"], dfin: ["fin"] };
// 내 다른 투잡 → 업계
const SJ_DOM = { food: ["chicken", "coffee"], realty: ["pr", "airbnb", "shortstay", "realtyblog"], edu: ["tutoring", "cs", "thesis"], content: ["insta", "webnovel", "tistory", "aivideo", "press"], retail: ["ucafe", "popup", "goods"] };
// 인물의 업계: 직업 글에서 판정한다. 학생·취준생·같은 회사 사람(회사 항목과 겹친다)처럼 판정이 어려운 인물은 뺀다.
const CHAR_SKIP = /준비생|취준생|학년|학생|지망생|우리 팀|우리 회사|옆 팀|인턴|신입|휴학/;
const CHAR_DOM = [
  ["med", /간호사|전문의|의사|한의|약사|물리치료|병원|동물보건/], ["fin", /은행|증권|회계|세무|핀테크|보험|PB/], ["edu", /교사|학원|교수|취업지원|직업상담|영어 강사|첨삭/],
  ["realty", /공인중개사|건물주|경매|인테리어|호스트|파티룸|도배|건축/], ["food", /셰프|바리스타|쌀국수|포차|바텐더|요리|고양이 카페/], ["content", /웹툰|PD|너튜버|작가|인플루언서|크리에이터|카피라이터|편집|일러스트|마케터|포토|배우/],
  ["public", /공사|구청|주무관|소방관|경찰|고용센터|대한전력/], ["retail", /쇼호스트|편의점|꽃집|영업/], ["mfg", /전자|자동차|공방|목수|전기기사/], ["logi", /이삿짐|승무원|물류/],
];
export function charDoms(c) { const j = c?.job || ""; if (!j || CHAR_SKIP.test(j)) return []; return CHAR_DOM.filter(([, re]) => re.test(j)).map(([k]) => k); }
export const domOf = (V) => (V.dom = V.dom || { pre: 0, on: 0, picks: [], u: {}, meetT: {} });
export const domOn = (s) => !!s.vibe?.dom?.on;
export const domU = (s, k) => s.vibe?.dom?.u?.[k] || 0;
const domLo = () => clamp(1 - (1 - VB_CH.dom.lo) * K, 0.15, 1);
export const domPriceMul = (s, k) => domLo() + (1 - domLo()) * domU(s, k) / 100; // 도메인 건 단가 배율
const domOutMul = () => 1 - Math.min(0.95, VB_CH.dom.outCut * K); // 도메인 밖 문의 배율
export const domReach = (s) => (domOn(s) ? Math.min(1, domOutMul() + s.vibe.dom.picks.length * VB_CH.dom.lead) : 1); // 손님 풀(영업 답장에도 곱한다)
export const marketMul = (s) => Math.max(clamp(1 - (1 - VB_CH.comp.floor) * Kt(s), 0.3, 1), Math.pow(1 - VB_CH.comp.cut, Math.floor(s.t / 12))); // 재능마켓 단가(해마다 −4%)
const leadComp = (s) => (s.t < VB_CH.comp.leadT ? 1 : Math.max(VB_CH.comp.leadFloor, 1 - VB_CH.comp.leadCut * (Math.floor((s.t - VB_CH.comp.leadT) / 12) + 1)));
function coDoms(s) { if (!employed(s) || !s.co) return []; return [...new Set([...(CO_DOM[s.co.name] || TYPE_DOM[s.co.type] || []), ...(JOB_DOM[s.me?.job] || [])])]; }
// 이해도가 무엇으로 오르는지(달마다). 화면과 달 마감이 같이 쓴다.
export function domSources(s, k) {
  const C = VB_CH.dom, rel = s.rel || {}, mates = new Set([s.fam?.spouse, ...Object.keys(rel).filter((id) => rel[id]?.lover || rel[id]?.spouse)].filter(Boolean));
  const co = coDoms(s).includes(k);
  const pals = Object.keys(rel).filter((id) => !mates.has(id) && (rel[id]?.aff || 0) >= C.palAff && charDoms(CHAR[id]).includes(k)).length, pn = Math.min(C.palMax, pals);
  const mate = [...mates].some((id) => charDoms(CHAR[id]).includes(k));
  const job = (SJ_DOM[k] || []).filter((j) => s.sj?.active?.includes(j));
  return [
    { id: "co", n: `다니는 회사·직무가 ${DOMS[k].n} 쪽`, v: C.co, on: co },
    { id: "pal", n: `친한 업계 사람(호감 ${C.palAff} 이상) ${pn}/${C.palMax}명`, v: C.pal * Math.max(1, pn), on: pn > 0 },
    { id: "mate", n: "배우자·연인이 업계 사람", v: C.mate, on: mate },
    { id: "job", n: `내 다른 투잡${job.length ? `(${job.map((j) => D.SIDEJOBS[j]?.n || j).join("·")})` : ""}`, v: C.job, on: job.length > 0 },
  ];
}
export const domGain = (s, k) => domSources(s, k).reduce((a, x) => a + (x.on ? x.v : 0), 0);
// 추천 순서: 달마다 저절로 오르는 양이 큰 도메인부터
export function domSuggest(s) { return DOM_KEYS.filter((k) => !domOf(s.vibe).picks.includes(k)).map((k, i) => [k, domGain(s, k), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map((x) => x[0]); }
export function pickDom(s, k) {
  const dm = domOf(s.vibe);
  if (!dm.on) return { ok: false, msg: "아직 고를 때가 아니에요" };
  if (!DOMS[k] || dm.picks.includes(k)) return { ok: false, msg: "고를 수 없어요" };
  if (dm.picks.length >= VB_CH.dom.max) return { ok: false, msg: `도메인은 ${VB_CH.dom.max}개까지예요` };
  dm.picks.push(k); dm.u[k] = dm.u[k] || 0;
  log(s, `바이브코딩: 내 도메인 ${DOMS[k].n}`, "work");
  return { ok: true, msg: `내 도메인: ${DOMS[k].n}. 이해도 0에서 시작해요` };
}
// 도메인 바꾸기: 쌓은 이해도는 사라진다(새 도메인은 0부터)
export function swapDom(s, from, to) {
  const dm = domOf(s.vibe), i = dm.picks.indexOf(from);
  if (!dm.on || i < 0 || !DOMS[to] || dm.picks.includes(to)) return { ok: false, msg: "바꿀 수 없어요" };
  const lost = Math.round(dm.u[from] || 0); delete dm.u[from]; if (dm.meetT) delete dm.meetT[from]; dm.picks[i] = to; dm.u[to] = 0;
  log(s, `바이브코딩: 도메인 ${DOMS[from].n} → ${DOMS[to].n}`, "work");
  return { ok: true, msg: `${DOMS[from].n} 이해도 ${lost}을 내려놓고 ${DOMS[to].n}에서 0부터 다시 시작해요` };
}
// ── 도메인 확장: 유지보수 계약·내 앱 ──
export const retIsDom = (s, t) => domOn(s) && !!t.dom && s.vibe.dom.picks.includes(t.dom);
export const retDomMax = (s, k) => VB_CH.x.retPer[domU(s, k) >= VB_CH.x.hiU ? 1 : 0];
export const retFee = (s, t) => (t.base && retIsDom(s, t) ? r5(t.base * domPriceMul(s, t.dom)) : t.fee); // 지금 재계약하면 받을 월 유지보수비
// 도메인 밖 계약이 달마다 더 끊기는 확률(도메인 시대 햇수에 따라 서서히)
export const retOutQuit = (s) => (domOn(s) ? Math.min(VB_CH.x.outQuitMax, VB_CH.x.outQuitYr * (Math.floor((s.t - s.vibe.dom.on) / 12) + 1)) : 0);
export const appIsDom = (s) => { const A = s.vibe?.app; return domOn(s) && !!A?.dom && s.vibe.dom.picks.includes(A.dom); };
export const appDomMul = (s) => (!domOn(s) || !s.vibe.app ? 1 : appIsDom(s) ? VB_CH.x.appLo + (VB_CH.x.appHi - VB_CH.x.appLo) * domU(s, s.vibe.app.dom) / 100 : VB_CH.x.appOutCap); // 사용자 한도 배율
export const appPriceMax = (s) => VB_CH.x.priceMax + (appIsDom(s) ? Math.round(VB_CH.x.priceUp * domU(s, s.vibe.app.dom) / 100 * 2) / 2 : 0);
const domBest = (s) => domOf(s.vibe).picks.slice().sort((a, b) => domU(s, b) - domU(s, a))[0];
export const canSpecApp = (s) => { const A = s.vibe?.app; return !!A?.live && domOn(s) && s.vibe.dom.picks.length > 0 && !appIsDom(s); };
function domAdd(s, k, v, notes) { const dm = domOf(s.vibe); if (!dm.picks.includes(k)) return 0; const a = dm.u[k] || 0, b = clamp(a + v, 0, 100); dm.u[k] = Math.round(b * 10) / 10; if (a < 100 && b >= 100 && notes) notes.push(`${DOMS[k].n} 이해도 100: 이제 이 업계 일은 제값을 받는다`); return b - a; }
const meetReady = (s, k) => s.t - (domOf(s.vibe).meetT?.[k] ?? -99) >= VB_CH.dom.meetGap;
const meetPick = (s, arg) => { const dm = domOf(s.vibe), L = dm.picks.filter((k) => meetReady(s, k) && (dm.u[k] || 0) < 100); return dm.picks.includes(arg) ? (L.includes(arg) ? arg : undefined) : L.slice().sort((a, b) => (dm.u[a] || 0) - (dm.u[b] || 0))[0]; }; // 도메인을 짚으면 그 모임만, 안 짚으면 이해도가 낮은 쪽
export const scopeOf = (s) => VB_F30.scope[s.vibe?.scope] || VB_F30.scope.std;
export function setScope(s, k) { if (VB_F30.scope[k]) s.vibe.scope = k; return { ok: true, msg: `계약서 범위: ${VB_F30.scope[s.vibe.scope].n}` }; }
export const maxRets = (s) => Math.min(VB_BAL.retMax + (s.vibe.lv >= 5 ? 1 : 0), s.vibe.lv);
export function fixNeed(s) {
  const V = s.vibe; if (V.agent) return 0;
  const n = V.rets.length * 0.5 + (V.app?.live ? 1 + V.app.users / 150 : 0) + V.as * 0.5 + (V.debt > 0 && (V.rets.length || V.app?.live) ? VB_F30.model.debtFix : 0);
  return Math.round(n * 2) / 2;
}
export const toolCost = (s) => Math.round(TOOL[s.vibe.tool].c * (s.vibe.tp || 1) * SYN.pi(s));
export function appCap(s) {
  const V = s.vibe, A = V.app; if (!A) return 0;
  return Math.round((VB_BAL.appBase + VB_BAL.appLv * V.lv + V.rep * VB_BAL.appRep) * Math.pow(2 / A.price, 0.9) * (A.focus ? 1.2 : 1) * (V.bigFree > 0 ? 0.7 : 1) * (A.web ? VB_F30.store.webCap : 1) * appDomMul(s));
}
export const appServer = (s) => (s.vibe.app?.live ? Math.round((3 + s.vibe.app.users * 0.03) * SYN.pi(s)) : 0);
export const mrr = (s) => (s.vibe.app?.live ? Math.round(s.vibe.app.users * s.vibe.app.price * SYN.pi(s)) : 0);
const openProj = (V) => V.projects.filter((p) => !p.lock); // 검수 답을 기다리는 건(lock)은 이번 달에 못 만진다
const curProj = (V, id) => { const L = openProj(V); return L.find((p) => p.id === id) || L.find((p) => p.own) || L.slice().sort((a, b) => (a.due ?? 99) - (b.due ?? 99))[0]; };
const newestPaid = (V) => V.projects.filter((p) => !p.own).at(-1);
function income(s, name, v) { if (!v) return; s.cash += v; addMoney(s, "inc", name, v); }
function expense(s, name, v) { if (!v) return; s.cash -= v; addMoney(s, "exp", name, v); }

// 의뢰 만들기
// dom: 도메인 시대(6년 차~)에만 쓴다. 키 = 그 도메인 건, null = 도메인 밖, 안 주면 손님 풀 비율대로 정한다
export function makeOffer(s, r, ch, dom) {
  const V = s.vibe, pi = SYN.pi(s);
  if (domOn(s) && dom === undefined) { const pk = V.dom.picks, a = domOutMul(), b = pk.length * VB_CH.dom.lead; dom = pk.length && r.chance(b / Math.max(0.01, a + b)) ? r.pick(pk) : null; }
  if (!domOn(s) || !DOMS[dom]) dom = null;
  const ind = ch === "pkg" && V.niche ? V.niche : r.pick(IND_KEYS);
  let price, need;
  if (ch === "friend") { price = r.pick([0, 20, 30, 40]); need = r.int(2, 3); }
  else if (ch === "market") { price = r.range(50, 90) * (V.lv >= 3 ? 1.25 : 1) * marketMul(s); need = r.int(3, 4); }
  else if (ch === "post") { price = r.range(100, 220); need = r.int(5, 7); }
  else { price = r.range(200, 400); need = Math.max(5, r.int(6, 9) - Math.min(2, Math.floor((V.cases[ind] || 0) / 4))); }
  price = r5(price * pi * (1 + V.rep / 400) * mod(s, "vbPrice", 1) * ((SYN.on(s, "vb_uc") || SYN.on(s, "vb_space")) && ch !== "pkg" ? 1.1 : 1));
  if (dom) price = r5(price * domPriceMul(s, dom));
  const o = { id: "O" + (++V.seq), ch, ind, nm: dom ? `${DOMS[dom].n} ${r.pick(DOMS[dom].jobs)}` : `${INDS[ind].n} ${r.pick(INDS[ind].jobs)}`, price, need, due: Math.ceil(need / 1.2) + 2, exp: 2, ...(dom ? { dom } : {}) };
  V.offers.push(o); if (V.offers.length > 5) V.offers.shift();
  return o;
}
// 의뢰 맡기(보드 버튼, 행동력 없음): 착수금 30%
export function take(s, id) {
  const V = s.vibe, o = V.offers.find((x) => x.id === id); if (!o) return { ok: false, msg: "의뢰가 없어요" };
  if (V.projects.filter((p) => !p.own).length >= maxProj(s)) return { ok: false, msg: `동시에 ${maxProj(s)}건까지예요. 하나 끝내고 받으세요` };
  const fee = CH[o.ch].fee, dep = Math.round(o.price * 0.3);
  const p = { ...o, done: 0, dep, mood: 0, spec: false, vague: false, creep: 0 }; delete p.exp;
  V.projects.push(p); V.offers = V.offers.filter((x) => x !== o);
  if (dep) { income(s, "바이브코딩 외주", dep); if (fee) expense(s, "바이브코딩 수수료", Math.round(dep * fee)); }
  return { ok: true, msg: `${p.nm} 수주!${dep ? ` 착수금 ${won(dep)}` : " (파일럿, 대신 후기를 받기로)"}` };
}
export function drop(s, id) { const V = s.vibe; V.offers = V.offers.filter((x) => x.id !== id); return { ok: true, msg: "정중히 거절했다" }; }
export function setTool(s, t) { const V = s.vibe; V.tool = clamp(t | 0, 0, 2); return { ok: true, msg: `${TOOL[V.tool].n}로 바꿨다(월 ${won(toolCost(s))})` }; }
export function setAppPrice(s, v) { const A = s.vibe.app; if (A) A.price = clamp(Math.round(v * 10) / 10, 1, appPriceMax(s)); }
// 내 앱 만들기 시작(Lv3~): 만들기 6번 분량
export function startApp(s) {
  const V = s.vibe; if (V.lv < 3) return { ok: false, msg: "Lv3 리테이너 보유자부터" };
  if (V.app || V.projects.some((p) => p.own === "app")) return { ok: false, msg: "이미 만들고 있어요" };
  const ind = bestCase(V)[0] || "shop";
  const dk = domOn(s) ? domBest(s) : null;
  V.projects.push({ id: "P" + (++V.seq), own: "app", ind, nm: dk ? `내 앱: ${DOMS[dk].n} 실무자용 업무 앱` : `내 앱: ${INDS[ind].n} 사장님용 관리 앱`, need: 6, done: 0, price: 0, ...(dk ? { dom: dk } : {}) });
  return { ok: true, msg: "내 앱 만들기 시작. '코디로 만들기'로 완성해요" };
}
// 내 앱 문 닫기
export function closeApp(s) {
  const V = s.vibe, A = V.app; if (!A) return { ok: false, msg: "앱이 없어요" };
  V.app = null; V.closed++; V.bigFree = 0;
  log(s, `바이브코딩: 내 앱 서비스 종료(마지막 사용자 ${A.users}명)`, "work");
  return { ok: true, msg: `서버를 내렸다. 사용자 ${A.users}명에게 종료 안내 메일을 보냈다.` };
}

// 납품
function deliver(s, r, p, lines) {
  const V = s.vibe;
  V.projects = V.projects.filter((x) => x !== p);
  if (p.own === "auto") {
    V.tech = clamp(V.tech + 6, 0, 100);
    if (employed(s)) { s.co.perf = clamp((s.co.perf || 50) + 4, 0, 100); V.coRisk = 1; }
    V.projects.push({ id: "P" + (++V.seq), own: "site", ind: "shop", nm: "내 소개 사이트(포트폴리오)", need: 3, done: 0, price: 0 });
    lines.push("사내 자동화 완성: 매주 3시간 아꼈다", "다음: 내 소개 사이트");
    return;
  }
  if (p.own === "site") { V.site = true; V.rep = clamp(V.rep + 5, 0, 100); lines.push("내 소개 사이트 오픈!", "지인·동네 의뢰가 늘어요"); return; }
  if (p.own === "app") {
    V.app = { live: true, ind: p.ind, users: r.int(4, 9), price: 2, buzz: 10, t0: s.t, focus: false, best: 0, ...(p.dom ? { dom: p.dom } : {}) };
    if (r.chance(VB_F30.store.rejectP)) { V.app.live = false; V.app.hold = 99; V.storeAsk = 1; lines.push("내 앱 완성! 그런데 앱 장터 심사에서 거절됐다"); return; }
    lines.push("앱 장터 심사 통과! 내 앱 출시, 첫 유료 사용자"); return;
  }
  // 11-26 납품 오류 판정(한 건에 한 번): 기술 이해가 높고 요구사항 정의서가 있으면 덜 난다
  if (!p.redo) {
    const E = VB_CH.err, tq = clamp(V.tech / 100, 0, 1);
    const failP = Math.min(0.12, Math.max(0.01, E.fail * (1.3 - 0.6 * tq) - (p.spec ? 0.01 : 0)) * Kt(s));
    const redoP = Math.min(0.4, clamp(E.redoHi - (E.redoHi - E.redoLo) * (0.7 * tq + (p.spec ? 0.3 : 0)) + (p.vague ? 0.03 : 0), E.redoLo, E.redoHi) * Kt(s));
    const x = r.range(0, 1);
    if (x < failP) {
      V.fails = (V.fails || 0) + 1; V.rep = clamp(V.rep - E.failRep, 0, 100);
      if (p.dep) expense(s, "바이브코딩 환불", p.dep);
      lines.push(`${p.nm} 납품 실패: 실서버에서 돌지 않았다`, `${p.dep ? `착수금 ${won(p.dep)} 환불 · ` : ""}개발 평판 −${E.failRep}`);
      return;
    }
    if (x < failP + redoP) {
      const add = Math.max(1, Math.round(p.need * E.redoNeed));
      p.redo = 1; p.lock = 1; p.need = Math.round((p.need + add) * 10) / 10; p.due = (p.due ?? 0) + 1; V.redos = (V.redos || 0) + 1;
      V.projects.push(p);
      lines.push(`${p.nm} 검수에서 오류: 재작업 +${add}칸`, `다음 달부터 다시 만든다 · 잔금은 ${Math.round(E.redoPay * 100)}%만`);
      return;
    }
  }
  const fee = CH[p.ch].fee, rest = Math.round(Math.max(0, p.price - p.dep) * (p.redo ? VB_CH.err.redoPay : 1));
  if (rest) { income(s, "바이브코딩 외주", rest); if (fee) expense(s, "바이브코딩 수수료", Math.round(rest * fee)); }
  V.delivered++; V.refs++; V.cases[p.ind] = (V.cases[p.ind] || 0) + 1;
  const onTime = p.due >= 0;
  V.rep = clamp(V.rep + (p.redo ? Math.min(VB_CH.err.redoRep, onTime ? 4 : 1) : onTime ? 4 : 1) + (p.logo ? 4 : 0), 0, 100);
  if (p.dom && domAdd(s, p.dom, VB_CH.dom.deliver) > 0) lines.push(`${DOMS[p.dom].n} 이해도 +${VB_CH.dom.deliver}`);
  V.as += 1; // 무상 AS 30일
  lines.push(`${p.nm} 납품${rest ? ` · 잔금 ${won(rest)}` : ""}`, p.redo ? "재작업 끝에 납품(후기 ★★★)" : onTime ? "후기 ★★★★★" : "늦었지만 납품");
  // 도메인 시대: 유지보수는 내 도메인 건에서만 제대로 이어지고, 월 유지보수비도 이해도를 따라간다
  const era = domOn(s), pd = era && p.dom && V.dom.picks.includes(p.dom) ? p.dom : null;
  if (V.lv >= 2 && p.price > 0 && V.rets.length < maxRets(s) && (!pd || V.rets.filter((t) => t.dom === pd).length < retDomMax(s, pd)) && r.chance((0.35 + (onTime ? 0.1 : 0)) * (era && !pd ? VB_CH.x.retOut : 1))) {
    const base = r5((V.lv >= 4 ? r.range(35, 60) : V.lv >= 3 ? r.range(25, 45) : r.range(20, 35)) * SYN.pi(s));
    const fee2 = pd ? r5(base * domPriceMul(s, pd)) : base;
    V.rets.push({ id: "R" + (++V.seq), nm: p.nm, ind: p.ind, fee: fee2, t: s.t, ...(pd ? { dom: pd, base, rt: s.t } : {}) });
    lines.push(`유지보수 계약 월 ${won(fee2)}${pd && fee2 < base ? ` (이해도가 차면 재계약 때 ${won(base)}까지)` : ""}`);
  }
}

// ───────── 이벤트(기획 데이터 15개 + AI 요금 폭탄 + 겸직·현장 고생 4개) ─────────
function evPool(s) {
  const V = s.vibe, A = V.app, emp = employed(s), np = newestPaid(V), pi = SYN.pi(s);
  const mo = Math.max(10, Math.round(mrr(s) - appServer(s))), bill = r5(25 * pi);
  return [
    // 초반
    { id: "e02", ph: "early", ok: V.lv <= 2 && V.site, once: 1, onChoose: "vb_ev", t: "요가원 원장님", x: "동네 요가원 원장님이 수업 예약 페이지가 있으면 좋겠다고 한다. 지금은 메신저로 하나하나 받는다고. 첫 레퍼런스 기회다.",
      c: [{ t: "무료로 만들고 후기·로고 사용 동의를 받는다", eff: {}, text: "\"정말요? 회원들한테 자랑할게요!\" 포트폴리오 첫 줄이 생겼다." },
        { t: "30만 원 견적을 낸다", check: { stat: "talk", dc: 50 }, ok: { text: "\"그 정도면 하죠.\" 첫 유료 의뢰다.", eff: {} }, ng: { text: "\"생각해 볼게요.\" 원장님은 다시 메신저로 예약을 받는다.", eff: { mental: -2 } } }] },
    { id: "e03", ph: "early", ok: V.lv <= 2 && V.m >= 1, once: 1, t: "구독료 네 줄", x: "코딩 도구, 개발 환경, DB, 배포 서비스. 무료 티어만으로는 부업이 안 된다는 걸 깨달았다. 카드 명세서에 달러가 찍힌다.",
      c: [{ t: "필수 도구 두 개만 유료로 쓴다 (월 5만)", eff: { vb_tool: 1 }, text: "코디가 빨라졌다. 하루 한도에 걸려 멈추는 일이 없어졌다." },
        { t: "무료로 버틴다", eff: { vb_tool: 0 }, text: "돈은 아꼈다. 대신 저녁마다 '오늘 한도 초과' 문구를 본다." }] },
    { id: "e04", ph: "early", ok: !!np && np.done <= np.need / 2, once: 1, t: "'예약 시스템 만들어 주세요'", x: `의뢰서는 한 줄이었다. "${np?.nm || "예약 시스템"} 하나 만들어 주세요." 손님 취소는? 노쇼는? 관리자는 몇 명? 아무것도 정해진 게 없다.`,
      c: [{ t: "요구사항 정의서를 먼저 같이 쓴다", eff: { hp: -4, stat: { write: 0.8 }, vb_spec: 1 }, text: "두 시간 통화로 정의서 한 장. 나중에 이 종이가 나를 살린다." },
        { t: "일단 만들고 보여 준다", eff: { vb_spec: -1 }, text: "빨리 시작했다. \"이거 말고요\"가 몇 번 나올지는 아무도 모른다." }] },
    // 중반
    { id: "e05", ph: "mid", ok: V.delivered >= 1 && V.rets.length < maxRets(s), onChoose: "vb_ev", t: "무상 AS의 늪", x: "납품한 지 석 달, 고객이 또 연락했다. 버튼 색 바꾸고, 쿠폰 기능 넣고, 하는 김에 앱도요. 계약서엔 무상 AS 30일이라고 쓰여 있다.",
      c: [{ t: `월 ${won(r5(30 * pi))} 유지보수 계약을 제안한다`, check: { stat: "talk", dc: 45 }, ok: { text: "\"그게 맞죠.\" 매달 들어오는 돈이 생겼다.", eff: {} }, ng: { text: "\"그 정도는 서비스 아닌가요?\" 반값에 합의했다.", eff: { mental: -2 } } },
        { t: "관계를 위해 그냥 해 준다", eff: { hp: -8, mental: -3 }, text: "고맙다는 말과 함께 다음 요청 목록이 왔다." }] },
    { id: "e06", ph: "mid", ok: V.delivered >= 2 || !!A, t: "AI가 DB를 지웠다", x: "코디가 '스키마를 정리하겠습니다'라고 했고, 엔터를 눌렀다. 잘 돌던 서비스의 회원 데이터가 통째로 사라졌다." + (emp ? " 오후 3시, 회사 회의 중이다." : ""),
      c: [{ t: "백업으로 복구하고 스테이징 서버를 만든다", check: { stat: "num", dc: clamp(75 - V.tech, 20, 75) }, ok: { text: "어젯밤 백업이 있었다. 복구 40분. 이제 실서버에 바로 명령하지 않는다.", eff: { hp: -8, vb_tech: 5, eye: emp ? 2 : 0 } }, ng: { text: "백업이 일주일 전 것이었다. 일주일 치 예약이 사라졌다.", eff: { hp: -8, vb_rep: -6, mental: -6 } } },
        { t: "고객에게 사실대로 알리고 같이 복구한다", eff: { vb_rep: -8, mental: -8, vb_tech: 3 }, text: "\"솔직하게 말해 줘서 고마워요. 근데 다음엔…\" 등에 식은땀이 흘렀다." }] },
    { id: "e07", ph: "mid", ok: V.lv >= 2, t: "해외 팀의 반값 견적", x: "재능마켓 입찰에 들어갔더니 해외 팀이 내 견적의 40% 가격을 써냈다. 포트폴리오도 화려하다. 고객이 가격을 맞춰 줄 수 있냐고 묻는다.",
      c: [{ t: "실시간 소통·국내 규정 이해·보안 문서를 앞세운다", check: { stat: "talk", dc: 50 }, ok: { text: "\"밤에도 메신저 답이 오는 게 크네요.\" 제 값에 계약했다.", eff: { vb_rep: 2, stat: { mkt: 0.8 }, vb_offer: "market" } }, ng: { text: "\"고민해 볼게요.\" 일주일 뒤 해외 팀과 계약했다는 소식.", eff: { mental: -3 } } },
        { t: "가격을 깎아 맞춘다", eff: { vb_cut: 0.6, vb_rep: 1 }, text: "계약은 했다. 시급은 계산하지 않기로 했다." }] },
    { id: "e08", ph: "mid", ok: V.lv >= 2 && V.delivered >= 2, once: 1, onChoose: "vb_ev", t: "개발 일지가 터졌다", x: "'퇴근 후 2시간 만에 만든 학원 출결 앱' 글이 커뮤니티 인기글에 올랐다. 하룻밤 사이 문의 DM이 11개 왔다.",
      c: [{ t: "학원 전용 패키지를 바로 만든다", eff: { stat: { mkt: 1 } }, text: "같은 앱을 학원마다 고쳐 쓰는 구조. 업종 전문가의 시작이다." },
        { t: "문의마다 맞춤 견적을 낸다", eff: { hp: -6 }, text: "열한 통 답장을 쓰다 새벽 2시. 그래도 세 건이 남았다." }] },
    { id: "e09", ph: "mid", ok: !!A?.live || V.rets.length >= 1, t: "API 정책 변경", x: `새벽 1시, 서비스가 멈췄다는 알림이 왔다. 연동한 외부 서비스가 인증 방식을 바꿨다. ${A?.live ? `사용자 ${Math.max(5, Math.round(A.users / 3))}명이 결제 중이었다.` : "고객 가게 예약이 막혔다."}`,
      c: [{ t: "새벽에 일어나 패치한다", eff: { hp: -12, eye: emp ? 3 : 0, vb_rep: 2 }, text: "새벽 4시에 고쳤다. 다음 날 회의 때 눈이 감겼다." },
        { t: "아침에 출근 전 고친다", eff: { vb_users: -0.06, vb_rep: -2 }, text: "잠은 잤다. 아침에 '결제 안 돼요' 문의가 쌓여 있었다." }] },
    { id: "x1", ph: "mid", ok: emp && (V.lv >= 2 || V.coRisk), t: "사내 코드 유출 오해", x: "보안팀에서 메일이 왔다. 내 PC에서 외부 AI 서비스로 코드가 올라간 기록이 있다고. 점심시간에 개인 프로젝트를 잠깐 열었을 뿐인데.",
      c: [{ t: "업무 코드와 무관하다는 자료를 정리해 낸다", check: { stat: "num", dc: 45 }, ok: { text: "\"확인했습니다. 다만 회사 PC에선 쓰지 마세요.\" 경고로 끝났다.", eff: { eye: 3, mental: -2 } }, ng: { text: "설명이 꼬였다. 팀장 면담까지 갔다.", eff: { eye: 10, mental: -6 } } },
        { t: "회사 PC에선 다시는 안 연다고 사과한다", eff: { eye: 5, mental: -3 }, text: "조용히 끝났다. 팀장의 눈빛이 한동안 달랐다." }] },
    // 11-23: x2 '회의 중 진동'(파티룸 이야기와 같은 틀)·x4 '열네 번째 수정 요청'(범위 싸움 장면과 같은 사건)을 바이브코딩 고유 골치로 바꿨다
    { id: "x5", ph: "mid", ok: !!np && np.price > 0 && np.done >= np.need / 2, onChoose: "vb_ev", t: "잠수 탄 의뢰인", x: `${np?.nm || "외주"} 중간 시안을 보낸 지 3주. 메신저의 '1'이 사라지지 않는다. 받은 건 착수금 ${won(np?.dep || 0)}뿐이고 잔금 ${won(Math.max(0, (np?.price || 0) - (np?.dep || 0)))}이 남았다. 사장님 가게 계정에는 어제도 새 글이 올라왔다.`,
      c: [{ t: "중도금을 받기 전엔 작업을 멈춘다고 알린다", check: { stat: "talk", dc: 50 }, ok: { text: "\"아, 정신이 없어서요!\" 다음 날 중도금이 들어왔다.", eff: {} }, ng: { text: "'읽음'은 떴다. 답은 없다. 후기에 뭐라고 쓸지 걱정된다.", eff: { vb_rep: -3, mental: -3 } } },
        { t: "믿고 끝까지 만들어 둔다", eff: { hp: -4 }, text: "한 달 뒤 답이 왔다. \"출장이 길었어요. 그런데 그사이 메뉴가 바뀌어서…\"" },
        { t: "착수금만 받고 정리한다", eff: { mental: 2 }, text: "만든 데까지 압축해 보내고 계약 종료 메일을 썼다. 작업 칸이 하나 비었다." }] },
    { id: "x6", ph: "mid", ok: V.delivered >= 1, t: "\"저도 AI로 고쳐 봤거든요\"", x: "납품한 가게 사장님 전화다. \"저도 AI한테 시켜서 좀 고쳐 봤거든요? 근데 결제 버튼이 없어졌어요.\" 관리자 계정으로 들어가 화면을 통째로 덮어쓴 모양이다. \"원래 좀 불안했던 거 아니에요?\"",
      c: [{ t: "말없이 복구하고 사장님 계정 권한을 줄여 둔다", eff: { hp: -5, vb_rep: 2 }, text: "백업으로 되돌리고 사장님 계정은 글·사진만 고치게 바꿨다. 사장님은 끝까지 자기 탓인 줄 몰랐다." },
        { t: "복구는 유상이라고 말한다", check: { stat: "talk", dc: 50 }, ok: { text: "\"…제가 건드린 건 맞죠.\" 복구비가 들어왔다.", eff: { vb_extra: r5(15 * pi) } }, ng: { text: "\"만든 사람이 책임져야죠.\" 전화가 끊겼다.", eff: { vb_rep: -3, mental: -3 } } },
        { t: "직접 고친 부분은 보증 밖이라고 선을 긋는다", eff: { vb_rep: -2, mental: 2 }, text: "계약서의 '임의 수정 시 보증 제외' 줄을 캡처해 보냈다. 사장님은 다른 개발자를 알아본다고 했다." }] },
    // 후반
    { id: "e10", ph: "late", ok: V.lv >= 3 && !A && emp && !V.projects.some((p) => p.own === "app"), once: 1, onChoose: "vb_ev", t: "나를 위한 SaaS", x: "회사에서 매주 3시간씩 하던 보고서 정리를 자동화 툴로 만들어 쓰고 있다. 같은 팀 선배가 이거 돈 주고 쓰고 싶다고 한다.",
      c: [{ t: "회사 데이터는 빼고 월 2만 원 구독 서비스로 출시한다", eff: { stat: { num: 0.8 }, eye: 4 }, text: "다른 회사 사람들도 쓸 수 있게 처음부터 다시 만들었다. 선배가 첫 결제자다." },
        { t: "회사 자산 문제가 될까 봐 혼자만 쓴다", eff: { mental: -1 }, text: "안전하다. 가끔 아깝다." }] },
    { id: "e11", ph: "late", ok: !!A?.live && A.users >= 100, onChoose: "vb_ev", t: "인수 제안 메일", x: `유료 사용자 ${A?.users || 0}명인 내 앱에 인수 제안이 왔다. 월 순이익의 20배, 약 ${won(mo * 20)}를 주겠다고 한다. 실사 자료를 보내 달라고 한다.`,
      c: [{ t: "매각하고 목돈을 쥔다", eff: {}, text: "계약서에 서명했다. 서버 알림이 더는 오지 않는다." },
        { t: "더 키우겠다며 거절한다", eff: { hp: -3, mental: 2 }, text: "\"생각 바뀌면 연락 주세요.\" 메일함에 그대로 남겨 뒀다." }] },
    { id: "e12", ph: "late", ok: V.lv >= 4 || V.rep >= 55, t: "기업 출강 요청", x: "한 중견기업 교육팀이 '비개발자 바이브코딩 1일 워크숍'을 부탁했다. 강사료는 하루 150만 원." + (emp ? " 평일이라 연차를 써야 한다." : ""),
      c: [{ t: emp ? "연차를 쓰고 출강한다" : "바로 수락한다", eff: { vb_lecture: r5(150 * pi), stat: { talk: 1 }, eye: emp ? 6 : 0, hp: -6 }, text: "\"코디한테 이렇게 말하면 돼요.\" 마흔 명이 동시에 고개를 끄덕였다." },
        { t: "주말 온라인 강의로 역제안한다", check: { stat: "talk", dc: 55 }, ok: { text: "\"좋아요, 토요일로 하죠.\" 회사는 모른다.", eff: { vb_lecture: r5(80 * pi), hp: -4 } }, ng: { text: "\"평일이 아니면 어렵네요.\" 다른 강사로 정해졌다.", eff: {} } }] },
    { id: "x3", ph: "late", ok: emp && V.lv >= 3, once: 1, t: "겸직 현황 조사", x: "인사팀이 '겸직 현황 조사' 양식을 돌렸다. 영리 활동이 있으면 적으라고 한다. 사업자등록증이 서랍에 있다.",
      c: [{ t: "외주 활동을 정직하게 적고 허가를 받는다", eff: { eye: 4, vb_ok: 1 }, text: "\"업무 시간·회사 자산만 안 쓰면 됩니다.\" 오히려 마음이 편해졌다." },
        { t: "빈칸으로 낸다", eff: { vb_hide: 1 }, text: "아무 일도 없었다. 아직은." }] },
    // 위기
    { id: "e13", ph: "crisis", ok: V.delivered >= 3, t: "보안 구멍", x: "고객 쇼핑몰의 관리자 페이지 주소가 검색에 노출됐다. 로그인 없이 주문 목록이 보인다. 코디에게 '보안 신경 써 줘'라고만 했던 게 떠오른다.",
      c: [{ t: "즉시 닫고 고객에게 알린 뒤 보안 점검을 공부한다", eff: { vb_rep: -5, vb_tech: 10, mental: -4, hp: -4 }, text: "사과 메일, 점검표, 주말 공부. 다시는 '알아서 해 줘'라고 하지 않는다." },
        { t: "조용히 고치고 넘어간다", eff: { vb_bomb: 1 }, text: "아무도 모르는 것 같다. 같다." }] },
    { id: "e14", ph: "crisis", ok: !!A?.live && A.users >= 15, t: "약관 위반으로 키 차단", x: "자동화 봇으로 돌리던 앱의 API 키가 하루아침에 차단됐다. 외부 서비스 이용 약관 위반이라고 한다. 구독자들의 환불 요청이 쌓인다.",
      c: [{ t: `전액 환불하고 합법적 구조로 다시 만든다 (환불 ${won(Math.round(mrr(s) * 0.6))})`, eff: { vb_cost: Math.round(mrr(s) * 0.6), vb_users: -0.15, vb_tech: 4 }, text: "한 달 매출이 사라졌다. 남은 사용자들은 \"믿고 쓴다\"고 했다." },
        { t: "새 키를 만들어 몰래 다시 돌린다", eff: { vb_ban: 1 }, text: "다시 돌아간다. 언제 또 막힐지 모른다." }] },
    { id: "e15", ph: "crisis", ok: !!A?.live && A.users >= 30 && !(V.bigFree > 0), onChoose: "vb_ev", t: "거대 플랫폼의 무료 기능", x: "내 앱과 똑같은 기능을 대형 플랫폼이 무료로 출시했다. 이번 달 해지율이 12%를 찍었다.",
      c: [{ t: `${INDS[A?.ind || "shop"].n} 한 업종에 특화해 깊게 판다`, eff: { stat: { sense: 0.8 } }, text: "업종 사장님들만 아는 기능을 넣었다. 잠깐 줄었다가 다시 늘 것이다." },
        { t: "가격을 절반으로 내린다", eff: {}, text: "이탈은 멈췄다. 남는 돈도 같이 멈췄다." }] },
    // 11-23: e16 '도구 갈아타기'는 '코디가 새 버전이 됐다'(modelScene)와 같은 사건이라 뺐다
    { id: "e17", ph: "crisis", ok: V.lv >= 2 && V.tool >= 1, t: "AI 요금 폭탄", x: `아침에 메일이 와 있다. "이번 달 사용량이 한도를 넘었습니다." 어젯밤 코디에게 '테스트 통과할 때까지 고쳐 줘'라고 시키고 잤다. 코디는 밤새 같은 오류를 고치고 또 고쳤다. 추가 요금 ${won(bill)}.`,
      c: [{ t: `그냥 낸다 (−${won(bill)})`, eff: { vb_cost: bill, mental: -2 }, text: "결제 버튼을 눌렀다. 유지보수 한 달 치가 통째로 코디 밥값이 됐다." },
        { t: "고객센터에 사정을 적어 보낸다", check: { stat: "write", dc: 50 }, ok: { text: "\"이번 한 번만 조정해 드립니다.\" 절반이 깎였다.", eff: { vb_cost: Math.round(bill / 2) } }, ng: { text: "자동 답장이 왔다. \"사용량 관리는 고객 책임입니다.\"", eff: { vb_cost: bill, mental: -3 } } },
        { t: `내고, 기록을 뒤져 어디서 샜는지 찾는다 (−${won(bill)})`, eff: { vb_cost: bill, hp: -5, vb_tech: 5 }, text: "같은 오류를 412번 고치고 있었다. 사용량 한도와 '세 번 실패하면 멈춰' 규칙을 걸었다." }] },
  ];
}
function vbEvent(s, r, force) {
  const V = s.vibe, pool = evPool(s).filter((e) => e.ok);
  let e = force ? pool.find((x) => x.id === force) : null;
  if (!e) {
    const ph = V.lv <= 1 ? ["early"] : V.lv === 2 ? ["early", "mid", "crisis"] : ["mid", "late", "crisis"];
    const cand = pool.filter((x) => ph.includes(x.ph) && !(x.once && V.seen.includes(x.id)));
    const fresh = cand.filter((x) => !V.seen.includes(x.id));
    const L = fresh.length ? fresh : cand.filter((x) => s.t - (V.seenT[x.id] ?? -99) >= 18);
    if (!L.length) return null;
    e = r.pick(L);
  }
  if (!V.seen.includes(e.id)) V.seen.push(e.id); V.seenT[e.id] = s.t;
  s._vbEv = { id: e.id };
  return { kind: "event", tag: "바이브코딩", title: e.t, text: e.x, choices: e.c, ...(e.onChoose ? { onChoose: e.onChoose } : {}) };
}
// ───────── 11-22 특이 요소 장면 ─────────
function scopeScene(s, p) {
  s._vbScope = { id: p.id };
  return { kind: "event", tag: "바이브코딩", title: "\"이것도 원래 포함 아니에요?\"", onChoose: "vb_scope",
    text: `${p.nm} 수정 요청이 ${p.creep}번째다. 이번엔 회원 등급제와 정산 화면. 사장님은 처음부터 말한 거라고 한다. 계약서에는 '예약 기능 일체'라고만 적혀 있다.`,
    choices: [
      { t: "그냥 해 준다(관계가 먼저)", eff: {}, text: "\"역시 믿고 맡기길 잘했어요.\" 작업 목록이 두 줄 늘었다." },
      { t: "범위 밖은 추가 견적이라고 말한다", check: { stat: "talk", dc: 50 }, ok: { text: "\"아, 그건 따로 맞죠.\" 추가 견적서에 도장을 받았다.", eff: {} }, ng: { text: "\"이 정도는 해 주는 거 아닌가요?\" 목소리가 차가워졌다.", eff: { mental: -3 } } },
      { t: "계약서 범위까지만 하고 마무리한다", eff: {}, text: "정중하게 선을 그었다. 납품일이 당겨졌다. 후기는 별 셋일 것 같다." },
    ] };
}
function modelScene(s) {
  const V = s.vibe, n = Math.max(1, V.rets.length + (V.app?.live ? 1 : 0)); s._vbModel = { n };
  return { kind: "event", tag: "바이브코딩", title: "코디가 새 버전이 됐다", onChoose: "vb_model",
    text: `코딩 AI 코디가 대규모 업데이트를 했다. 새 버전은 더 똑똑하다는데, 어제까지 돌던 코드를 다시 고치게 하자 엉뚱하게 다시 짠다. 관리하는 서비스 ${n}곳이 한꺼번에 흔들린다.`,
    choices: [
      { t: "주말을 갈아 넣어 전부 새 버전에 맞춘다", eff: { hp: -10 }, text: "토·일 이틀을 갈아 넣었다. 월요일, 새 버전이 확실히 빠르다." },
      { t: "예전 버전에 묶어 두고 급한 곳만 막는다", eff: { hp: -3 }, text: "일단 돌아간다. 언젠가 갚아야 할 숙제가 쌓였다." },
      { t: `고객에게 유상 업그레이드를 제안한다 (곳당 ${won(Math.round(VB_F30.model.pay * SYN.pi(s)))})`, check: { stat: "talk", dc: 50 }, ok: { text: "\"보안 때문이라면 해야죠.\" 견적서가 하나씩 돌아왔다.", eff: { hp: -6 } }, ng: { text: "\"고장 난 걸 고치는데 돈을 내라고요?\"", eff: { hp: -6, mental: -3 } } },
    ] };
}
function storeScene(s) {
  const A = s.vibe.app, n = A?.users || 5, st1 = !s.vibe.storeCg; s.vibe.storeCg = 1;
  return { kind: "event", tag: "바이브코딩", title: "앱 심사 거절", onChoose: "vb_store", ...(st1 ? { cine: "vb_store" } : {}), // 화보는 처음 한 번만
    text: `앱 장터 심사 결과: 거절. '최소 기능 요건 미달, 결제 방식 정책 위반.' 사유는 영어 세 줄이 전부다. 베타를 신청한 사장님 ${n}명이 출시를 기다린다.`,
    choices: [
      { t: `지적받은 곳을 고쳐 다시 낸다 (${VB_F30.store.holdM}달)`, eff: { hp: -4 }, text: "정책 문서 40쪽을 읽고 다시 냈다. 이제 기다린다." },
      { t: "앱 대신 웹으로 바로 연다", eff: {}, text: "주소 하나 보내면 끝. 대신 앱 장터 검색에는 안 걸린다." },
      { t: "앱 안 결제를 빼고 바깥 결제로 낸다 (1달)", eff: {}, text: "결제는 웹에서. 사장님들이 한 번 더 눌러야 한다." },
    ] };
}
// 시험용: #auto…-vibe-f30scope|f30model|f30store
export function f30Scene(s, r, what) {
  const V = s.vibe; V.lv = Math.max(V.lv, 2);
  if (what === "model") { if (!V.rets.length) V.rets.push({ id: "R" + (++V.seq), nm: "학원 출결 앱", ind: "academy", fee: 30, t: s.t }); return modelScene(s); }
  if (what === "store") { V.app = { live: false, hold: 99, ind: "shop", users: 6, price: 2, buzz: 10, t0: s.t, focus: false, best: 0 }; return storeScene(s); }
  const p = { id: "P" + (++V.seq), ch: "market", ind: "shop", nm: "식당·카페 예약·주문 페이지", price: 80, dep: 24, need: 5, done: 2, due: 3, mood: 0, spec: false, vague: false, creep: VB_F30.fight };
  V.projects.push(p); return scopeScene(s, p);
}
// 11-26 도메인의 시대 본 사건(6년 차). 고르기는 장면 첫 선택지(추천 하나) 또는 바이브코딩 화면에서
function domScene(s) {
  const k = domSuggest(s)[0], g = domGain(s, k); s._vbDom = { k };
  return { kind: "event", tag: "바이브코딩", title: "도메인의 시대", onChoose: "vb_dom",
    text: `바이브코딩이 흔해졌다. 발주 공고의 첫 줄이 바뀌었다. "우리 업계 경험자만." 만들 줄 아는 사람은 넘치고, 업계를 아는 사람이 모자란다. 내 분야를 정할 때다(최대 ${VB_CH.dom.max}개). 분야 밖 문의는 크게 줄고, 분야 안의 일은 이해도가 찰수록 제값을 받는다. 유지보수 계약과 내 앱도 같은 길을 간다.`,
    choices: [
      { t: `${DOMS[k].n}부터 판다${g > 0 ? "(지금 내 회사·주변과 맞는 분야)" : ""}`, eff: {}, text: `소개 글 첫 줄을 고쳤다. "${DOMS[k].n} 업무를 아는 개발자." 아직은 이름뿐이다. 나머지 한 자리는 바이브코딩 화면에서 고른다.` },
      { t: "바이브코딩 화면에서 천천히 고른다", eff: {}, text: "분야 열 개를 적어 놓고 하나씩 지워 본다. 고르기 전까지는 문의가 눈에 띄게 준다." },
    ] };
}
// 첫 사이트를 만들 때 바로 뜨는 장면(e01)
function firstSite() {
  return { kind: "event", tag: "바이브코딩", title: "10분 만의 첫 사이트", text: "말로 시켰을 뿐인데 사이트가 10분 만에 떴다. 소름이 돋는다. 그런데 로그인 버튼을 누르자 하얀 화면만 나온다.",
    choices: [{ t: "오류 메시지를 읽고 원인을 추적한다", eff: { mental: -3, vb_tech: 6, stat: { num: 0.8 } }, text: "빨간 글씨 세 줄을 검색했다. 환경 변수 하나가 빠져 있었다. 처음으로 '이해하고' 고쳤다." },
      { t: "코디에게 '고쳐줘'만 스무 번 보낸다", eff: { vb_cost: 3, vb_tech: 1 }, text: "스물한 번째에 고쳐졌다. 왜 고쳐졌는지는 모른다. 토큰값이 3만 원 나왔다." }] };
}

// ───────── 플러그인 ─────────
const MONEY = { inc: ["바이브코딩 외주", "바이브코딩 유지보수", "바이브코딩 구독 매출", "바이브코딩 강의"], exp: ["바이브코딩 도구·서버", "바이브코딩 수수료", "바이브코딩 하청", "바이브코딩 환불"] };
export default {
  key: "vibe", prefix: "vb_", hubName: "바이브코딩",
  init: () => ({ v: 3, dom: { pre: 0, on: 0, picks: [], u: {}, meetT: {} }, dry: 0, scope: "std", debt: 0, lv: 1, m: 0, tool: 0, tp: 1, tq: 1, tqT: 0, tech: 10, rep: 0, refs: 0, site: false, delivered: 0, builds: 0, fixes: 0, fx: 0, as: 0,
    projects: [{ id: "P0", own: "auto", ind: "shop", nm: "사내 보고서 자동화(내 업무)", need: 2, done: 0, price: 0 }],
    offers: [], rets: [], app: null, cases: { academy: 0, fit: 0, shop: 0, salon: 0 }, niche: null, agent: false, seq: 1,
    hist: [], revH: [], recH: [], recStreak: 0, goodM: 0, sold: 0, soldAmt: 0, closed: 0, outages: 0, bigFree: 0, ban: 0, bomb: 0, coRisk: 0, ok: 0, hide: 0, seen: [], seenT: {}, last: null }),
  actions: {
    vb_build: { n: "코디로 만들기", ap: 1, hp: 3, desc: "코딩 AI에게 말로 시켜 의뢰·내 앱을 만든다. 진도 +" },
    vb_fix: { n: "버그 잡기·유지보수", ap: 1, hp: 2, desc: "고객 문의·장애·무상 AS를 처리한다. 밀리면 계약이 끊긴다" },
    vb_sell: { n: "영업·견적 보내기", ap: 1, hp: 2, desc: "지인·재능마켓·개발 일지로 의뢰를 받아 온다" },
    vb_study: { n: "DB·API·보안 공부", ap: 1, hp: 2, desc: "코디가 만든 걸 이해한다. 기술 이해 +, 사고 −", stat: { num: 0.5 } },
    vb_meet: { n: "업계 모임", ap: 1, hp: 2, desc: "내 도메인 사람들을 만난다. 도메인 이해도 +3~4(도메인마다 석 달에 한 번)", stat: { talk: 0.3 } },
    vb_agent: { n: "하청 개발자 계약/해지", ap: 0, hp: 0, desc: "유지보수와 작업 일부를 맡긴다(반복 수입 30% + 월 50만, 투잡 칸 +1)" },
  },
  mg: { vb_build: "num" },
  money: MONEY,
  can(s, id, arg) {
    const V = s.vibe;
    if (id === "vb_build") { if (arg === "appdom") return !V.app?.live ? "앱이 없어요" : !domOn(s) ? "아직은 범용 앱으로 충분해요" : !V.dom.picks.length ? "도메인을 먼저 고르세요" : appIsDom(s) ? "이미 내 도메인 앱이에요" : null; if (arg === "app") return V.app?.live ? null : "앱이 없어요"; if (!V.projects.length && !V.app?.live) return "만들 게 없어요. 의뢰를 먼저 받으세요"; if (!openProj(V).length && !V.app?.live) return "검수 답을 기다리는 중이에요. 재작업은 다음 달부터"; return null; }
    if (id === "vb_meet") { const dm = domOf(V); if (!dm.on) return "아직은 만들 줄만 알면 돼요"; if (!dm.picks.length) return "도메인을 먼저 고르세요"; if (dm.picks.includes(arg) ? (dm.u[arg] || 0) >= 100 : dm.picks.every((k) => (dm.u[k] || 0) >= 100)) return "이해도가 꽉 찼어요"; if (!meetPick(s, arg)) return `이번 분기 모임은 다녀왔어요(도메인마다 ${VB_CH.dom.meetGap}달에 한 번)`; return null; }
    if (id === "vb_sell") { const ch = arg && CH[arg] ? arg : "friend"; if (V.lv < CH[ch].lv) return `${jo(CH[ch].n, "은", "는")} Lv${CH[ch].lv}부터`; if (ch === "pkg" && !V.niche) return "업종을 먼저 정하세요(한 업종 사례 3건)"; if (V.offers.length >= 5) return "의뢰함이 꽉 찼어요"; return null; }
    if (id === "vb_fix") return fixNeed(s) > 0 || V.as > 0 ? null : "고칠 게 없어요(유지보수 계약·내 앱이 생기면)";
    if (id === "vb_agent") { if (V.agent) return SJ.slotLock(s, () => { V.agent = false; return () => { V.agent = true; }; }); return V.lv >= 4 ? null : "Lv4 업종 전문가부터"; }
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const V = s.vibe;
    if (id === "vb_build") {
      V.builds++;
      const u = Math.round(boost * speed(s) * 10) / 10;
      gainStat(s, "num", 0.3);
      if (arg === "appdom" && canSpecApp(s)) {
        const A = V.app, X = VB_CH.x; if (!A.spTo || !V.dom.picks.includes(A.spTo)) { A.spTo = domBest(s); A.sp = 0; }
        A.sp = (A.sp || 0) + 1; const lost = Math.round(A.users * X.spLose); A.users = Math.max(0, A.users - lost);
        if (A.sp >= X.spN) { A.dom = A.spTo; A.sp = 0; delete A.spTo; A.buzz = Math.min(60, A.buzz + 10); log(s, `바이브코딩: 내 앱을 ${DOMS[A.dom].n} 특화로 바꿨다`, "work"); return { lines: [`내 앱: ${DOMS[A.dom].n} 특화 완료`, `사용자 한도 ×${appDomMul(s).toFixed(2)} (이해도를 따라 오른다)`], msg: `첫 화면에서 '누구나'를 지웠다. 이제 ${DOMS[A.dom].n} 실무자만 아는 메뉴가 맨 위에 있다.` }; }
        return { lines: [`내 앱 ${DOMS[A.spTo].n} 특화 ${A.sp}/${X.spN}`, ...(lost ? [`안 맞는 사용자 ${lost}명 이탈`] : [])], msg: r.pick([`범용 기능 세 개를 내리고 ${DOMS[A.spTo].n} 업무 흐름을 넣었다. "예전이 편했는데요" 메일이 왔다.`, `${DOMS[A.spTo].n} 용어로 메뉴 이름을 전부 바꿨다. 떠나는 사람도 있고, 반기는 사람도 있다.`]) };
      }
      if (arg === "app" || arg === "appdom" || (!openProj(V).length && V.app?.live)) {
        const A = V.app;
        if (!A.web && r.chance(VB_F30.store.updRej)) return { lines: ["업데이트 심사 거절: 이번 기능은 다음에"], msg: "\"최소 기능 요건 미달.\" 같은 기능을 지난달엔 통과시켜 줬다." };
        A.buzz = Math.min(60, A.buzz + 10 * u);
        return { lines: [`내 앱 기능 업데이트 (화제 +${Math.round(10 * u)})`], msg: r.pick(["\"정기 결제 알림 기능 넣어 줘.\" 코디가 20분 만에 만들었다. 테스트는 내가 두 시간.", "사용자 요청 게시판의 1등 기능을 넣었다. 댓글에 하트가 달렸다."]) };
      }
      const p = curProj(V, arg); const first = p.own === "site" && p.done === 0, firstPaid = !p.own && V.delivered === 0 && p.done === 0 && !V.seen.includes("e04");
      p.done = Math.round((p.done + u) * 10) / 10;
      const lines = [`${p.nm} ${Math.min(p.done, p.need)}/${p.need}`];
      if (p.done >= p.need) deliver(s, r, p, lines);
      if (V.storeAsk) { V.storeAsk = 0; return { lines, msg: "앱 장터에 올리고 사흘을 기다렸다.", scene: storeScene(s) }; }
      const msg = r.pick(["\"예약 버튼을 화면 아래에 크게. 색은 가게 간판처럼.\" 코디가 타자를 친다.", "코디가 300줄을 썼다. 나는 그중 세 줄을 고쳤다. 그 세 줄이 제일 오래 걸렸다.", "퇴근 지하철에서 프롬프트를 다듬고, 집에 오자마자 실행.", "\"로그인 안 한 사람은 못 보게 해 줘.\" 이번엔 보안까지 말로 챙겼다."]);
      if (first) { V.seen.push("e01"); V.seenT.e01 = s.t; return { lines, msg, scene: firstSite() }; }
      if (firstPaid && p.ch !== "friend") { const sc = vbEvent(s, r, "e04"); if (sc) return { lines, msg, scene: sc }; }
      return { lines, msg };
    }
    if (id === "vb_fix") {
      V.fixes++; V.fx = Math.round((V.fx + boost) * 10) / 10; V.as = Math.max(0, V.as - 0.5);
      if (V.app?.live) V.app.buzz = Math.min(60, V.app.buzz + 2);
      gainStat(s, "num", 0.2);
      return { lines: [`유지보수 ${Math.min(V.fx, fixNeed(s) || V.fx)}/${fixNeed(s)}`], msg: r.pick(["\"사장님, 브라우저 새로고침 한 번만 해 보시겠어요?\" 진짜 그걸로 됐다.", "새벽 알림의 원인은 이미지 하나였다. 용량 40MB.", "버그 하나 잡는 데 명령 열두 번. 토큰 영수증을 보지 않기로 했다.", "무상 AS 목록을 하나씩 지웠다. 하나 지우면 하나가 생긴다."]) };
    }
    if (id === "vb_sell") {
      const ch = arg && CH[arg] ? arg : "friend";
      const rf = SJ.ramp(s, "vibe"); // 레퍼런스 없는 초반: 답장이 잘 안 오고 단가도 깎인다
      if (!r.chance(Math.min(0.97, (0.3 + 0.7 * rf) * scopeOf(s).win) * domReach(s) * (V.dry > 0 ? VB_CH.dry.sell : 1))) { if (ch === "friend") gainStat(s, "talk", 0.3); else gainStat(s, "mkt", 0.3); return { lines: ["답장 없음", "레퍼런스가 쌓이면 나아져요"], msg: r.pick(["견적 세 군데. 읽음 표시만 떴다.", "\"포트폴리오 있으세요?\" 그 한 줄에 말문이 막혔다.", "해외 팀이 반값을 불렀다. 이번에도 밀렸다."]) }; }
      const o = makeOffer(s, r, ch);
      if (rf < 1 && o.price) o.price = Math.max(5, Math.round(o.price * (0.7 + 0.3 * rf) / 5) * 5);
      { const sk = SJ.skillRamp(s, "vibe"); if (sk < 1 && o.price) o.price = Math.max(5, Math.round(o.price * sk / 5) * 5); } // v4.25b 배우는 기간: 실력이 쌓이기 전엔 단가가 낮다
      if (ch === "post") { V.rep = clamp(V.rep + 2, 0, 100); gainStat(s, "write", 0.4); if (V.app?.live) V.app.buzz = Math.min(60, V.app.buzz + 6); }
      else if (ch === "friend") gainStat(s, "talk", 0.3); else gainStat(s, "mkt", 0.4);
      const extra = ch !== "friend" && r.chance(Math.min(0.95, (0.3 + V.rep / 300) * scopeOf(s).win)) ? makeOffer(s, r, ch) : null;
      return { lines: [`새 의뢰: ${o.nm} ${o.price ? won(o.price) : "(파일럿·무료)"}`, ...(extra ? [`하나 더: ${extra.nm}`] : [])], msg: { friend: "동네 단골 가게 사장님께 \"홈페이지 하나 만들어 드릴까요?\" 말을 꺼냈다.", market: "재능마켓 견적 요청 세 건에 답을 달았다. 해외 팀 견적이 늘 반값이다.", post: "'퇴근 후 개발 일지 #' 글을 올렸다. 댓글이 달리기 시작했다.", pkg: `${INDS[V.niche || "shop"].n} 사장님 모임에 패키지 소개서를 돌렸다.` }[ch] };
    }
    if (id === "vb_study") { V.tech = clamp(V.tech + 5 * (1 - V.tech / 110), 0, 100); const dz = V.debt > 0 ? (V.debt = Math.max(0, V.debt - 3), true) : false; return { lines: [`기술 이해 ${Math.round(V.tech)}`, ...(dz ? [V.debt ? `기술 부채 ${V.debt}달 남음` : "기술 부채 정리 끝"] : [])], msg: r.pick(["DB 인덱스가 뭔지 드디어 알았다. 코디가 왜 그렇게 짰는지 보인다.", "로그인·권한 점검표를 만들었다. 다음 납품부터 이걸 체크한다.", "API 요금표를 읽었다. 무료가 무료가 아니었다."]) }; }
    if (id === "vb_meet") {
      const k = meetPick(s, arg), dm = domOf(V); if (!k) return { lines: ["이번 분기 모임은 이미 다녀왔다"], msg: "단체방이 조용하다." };
      dm.meetT = dm.meetT || {}; dm.meetT[k] = s.t; dm.meets = (dm.meets || 0) + 1;
      const g = domAdd(s, k, Math.round(r.range(VB_CH.dom.meet[0], VB_CH.dom.meet[1]) * boost * 10) / 10);
      return { lines: [`${DOMS[k].n} 이해도 +${Math.round(g * 10) / 10} (${Math.round(dm.u[k])}/100)`], msg: r.pick([`${DOMS[k].n} 실무자 모임 뒷자리에 앉았다. 반은 못 알아들었다. 모르는 말을 적어 왔다.`, `"그건 현장에선 그렇게 안 해요." ${DOMS[k].n} 10년 차의 한마디에 화면 설계를 다시 그렸다.`, `명함 다섯 장을 받았다. 다들 엑셀로 버티는 일이 하나씩 있었다.`]) };
    }
    if (id === "vb_agent") { V.agent = !V.agent; return { lines: [V.agent ? "하청 개발자 계약: 유지보수 전부 + 월 2칸 작업" : "하청 계약 해지"], msg: V.agent ? "\"코드 리뷰는 매주 금요일에 같이 봐요.\"" : "다시 새벽 알림은 내 휴대폰으로 온다." }; }
    return null;
  },
  monthStart(s) {
    // 시너지: 내가 만든 자동화로 다른 투잡 관리 일부를 덜어 준다
    if (SYN.on(s, "vb_uc")) for (const st of s.uc?.stores || []) st.ap = (st.ap || 0) + 0.5;
    if (SYN.on(s, "vb_space")) { for (const rm of s.pr?.rooms || []) if (rm.status === "open") rm.ap = (rm.ap || 0) + 0.5; for (const u of s.ab?.units || []) u.ap = (u.ap || 0) + 0.5; }
  },
  month(s, r, notes, scenes) {
    const V = s.vibe, pi = SYN.pi(s), M = s.month;
    V.m++;
    // 11-22 앱 재심사 대기
    if (V.app && !V.app.live && V.app.hold > 0) { if (V.app.hold >= 99) V.app.hold = VB_F30.store.holdM; V.app.hold--; if (V.app.hold <= 0) { V.app.live = true; V.app.hold = 0; notes.push("재심사 통과! 내 앱이 앱 장터에 올라갔다"); } else notes.push(`내 앱 재심사 대기(${V.app.hold}달)`); }
    // 0) 하청 개발자: 진행 중 일 2칸
    if (V.agent) { let left = 2 * speed(s); for (const p of V.projects.slice()) { if (left <= 0) break; if (p.lock) continue; const u = Math.min(left, p.need - p.done); p.done += u; left -= u; if (p.done >= p.need - 0.01) { const ls = []; deliver(s, r, p, ls); notes.push(`하청 개발자: ${ls.join(" · ")}`); if (V.storeAsk) { V.storeAsk = 0; scenes.push(storeScene(s)); } } } if (left > 0 && V.app?.live) V.app.buzz = Math.min(60, V.app.buzz + 5 * left); }
    const need = fixNeed(s), q = V.agent || need <= 0 ? 1 : clamp(V.fx / need, 0, 1);
    // 1) 진행 중 외주: 마감·수정 요청
    for (const p of V.projects.slice()) {
      if (p.own) continue;
      if (p.lock) p.lock = 0; // 검수 답이 왔다: 재작업 시작
      p.due--;
      if (r.chance(((p.spec ? 0.05 : 0.14) + (p.vague ? 0.2 : 0)) * scopeOf(s).creep)) {
        p.need += 1; p.creep = (p.creep || 0) + 1; const sp = scopeOf(s);
        if (sp.paid && p.price > 0) { const add = r5(Math.max(5 * pi, (p.price - (p.dep || 0)) * sp.paid)); p.price += add; notes.push(`${p.nm}: 범위 밖 요청 → 추가 견적 +${won(add)}(작업 +1)`); }
        else notes.push(`${p.nm}: "버튼 하나만 더…" 수정 요청(작업 +1)`);
      }
      if (p.due < 0) {
        V.rep = clamp(V.rep - 2, 0, 100);
        if (p.due < -2) { V.projects = V.projects.filter((x) => x !== p); V.rep = clamp(V.rep - 6, 0, 100); notes.push(`${p.nm}: 마감을 석 달 넘겨 고객이 계약을 끊었다(잔금 없음)`); }
        else notes.push(`${p.nm}: 마감이 지났다. 독촉 메신저가 온다`);
      }
    }
    // 2) 유지보수 리테이너
    let ret = 0;
    for (const t of V.rets.slice()) {
      const tIn = retIsDom(s, t), outQ = tIn ? 0 : retOutQuit(s), hiQ = tIn && domU(s, t.dom) >= VB_CH.x.hiU ? VB_CH.x.hiQuit : 0;
      const baseQ = 0.015 + (1 - q) * 0.25 + (V.debt > 0 ? VB_F30.model.debtQuit : 0), xq = r.range(0, 1);
      if (xq < Math.max(0.004, baseQ - hiQ) + outQ) { V.rets = V.rets.filter((x) => x !== t); const byDom = xq >= baseQ; V.rep = clamp(V.rep - (byDom ? 0 : 3), 0, 100); notes.push(byDom ? `${t.nm}: "업계를 아는 업체로 바꾸기로 했어요." 유지보수 계약 종료` : q < 1 ? `${t.nm}: 문의 답장이 늦어 유지보수 계약 해지` : `${t.nm}: 가게가 문을 닫아 유지보수 종료`); continue; }
      if (tIn && t.base && s.t - (t.rt ?? t.t) >= VB_CH.x.renew) { const nf = retFee(s, t); t.rt = s.t; if (nf !== t.fee) { notes.push(`${t.nm}: 재계약 · 월 ${won(t.fee)} → ${won(nf)}`); t.fee = nf; } } // 재계약: 오른 이해도 반영
      ret += t.fee;
    }
    income(s, "바이브코딩 유지보수", ret);
    // 3) 내 앱(구독)
    let mr = 0, srv = 0;
    const A = V.app;
    if (A?.live) {
      const cap = appCap(s);
      const gen = domOn(s) && !appIsDom(s); // 도메인 시대의 범용 앱: 대형 솔루션·무료 기능에 밀린다
      const grow = Math.max(0, cap - A.users) * (0.1 + A.buzz / 300) * (0.6 + 0.4 * q) * (gen ? VB_CH.x.appOutGrow : 1);
      let churn = 0.06 - (SYN.on(s, "vb_num") ? 0.015 : 0) - V.tech / 2500 + (1 - q) * 0.05 + (V.bigFree > 0 ? 0.05 : 0) - (A.focus ? 0.01 : 0);
      churn += (A.noPay ? VB_F30.store.noPayChurn : 0) + (gen ? VB_CH.x.appOutChurn : 0);
      if (A.price > appPriceMax(s)) A.price = appPriceMax(s);
      churn = clamp(churn * (A.users > cap ? 1.5 : 1), 0.015, 0.25);
      A.users = Math.max(0, Math.round(A.users + grow - A.users * churn + r.normal() * Math.sqrt(A.users + 1) * 0.5));
      A.buzz = A.buzz * 0.6; A.best = Math.max(A.best || 0, A.users); A.churn = +churn.toFixed(3);
      // 장애
      const outP = clamp(0.05 + A.users / 3000 - V.tech / 1500 - q * 0.03 + (V.debt > 0 ? VB_F30.model.debtOut : 0), 0.01, 0.24);
      if (r.chance(outP)) {
        V.outages++; const lost = Math.round(A.users * 0.04 * mod(s, "vbOps", 1)); A.users -= lost;
        notes.push(`새벽 3시 서버 장애: 사용자 ${lost}명 이탈${employed(s) ? ", 다음 날 회사에서 졸았다" : ""}`);
        if (employed(s)) applyEff(s, { eye: 1 });
      }
      if (V.ban && r.chance(0.3)) { V.ban = 0; const lost = Math.round(A.users * 0.6); A.users -= lost; V.rep = clamp(V.rep - 12, 0, 100); notes.push(`외부 서비스가 내 계정을 영구 차단했다. 사용자 ${lost}명 이탈, 환불 분쟁`); }
      mr = mrr(s); srv = appServer(s);
      income(s, "바이브코딩 구독 매출", mr);
      if (A.best >= 30 && A.users < 8) notes.push("내 앱 사용자가 한 자릿수로 줄었다. 문 닫을지 고민해야 할 때");
    }
    if (V.bigFree > 0) V.bigFree--;
    // 4) 도구·서버·하청
    if (r.chance(0.06)) { const old = toolCost(s); V.tp = clamp(V.tp * r.pick([0.8, 1.2, 1.3, 1.5]), 0.7, 1.8); if (V.tool) notes.push(`코디 구독료 변경: 월 ${won(old)} → ${won(toolCost(s))}`); }
    if (V.tqT > 0 && --V.tqT === 0) V.tq = 1;
    expense(s, "바이브코딩 도구·서버", toolCost(s) + srv + (V.tool || V.app ? Math.round(1 * pi) : 0));
    if (V.agent) expense(s, "바이브코딩 하청", Math.round(0.3 * (ret + mr) + 50 * pi));
    // 5) 의뢰 들어오기(수요 시기·평판·후기)
    for (const o of V.offers) o.exp--;
    const gone = V.offers.filter((o) => o.exp <= 0).length; V.offers = V.offers.filter((o) => o.exp > 0);
    if (gone) notes.push(`답장이 늦어 의뢰 ${gone}건이 다른 개발자에게 갔다`);
    const lead = SEASON[s.cal - 1] * (s.era?.winter ? 0.85 : 1) * (V.site ? 1 : 0.4) * (0.25 + V.rep / 60 + Math.min(20, V.refs) * 0.03) * ((SYN.on(s, "vb_uc") || SYN.on(s, "vb_space")) ? 1.15 : 1);
    // 11-26 수주가 들쭉날쭉: 0건인 달, 2~3달 가뭄. 3년 차부터는 경쟁자가 늘어 문의가 서서히 준다
    const dm = domOf(V), CD = VB_CH.dry, lead2 = lead * leadComp(s);
    let dryNow = false;
    if (V.dry > 0) { V.dry--; dryNow = true; notes.push(V.dry > 0 ? "문의 가뭄이 이어진다. 메일함이 조용하다" : "문의 가뭄 끝자락. 이번 달도 새 문의는 없다"); }
    else if (V.lv >= 2 && r.chance(Math.min(0.2, CD.start * Kt(s)))) { V.dry = r.int(CD.len[0], CD.len[1]) - 1; dryNow = true; notes.push("문의가 뚝 끊겼다. 몇 달 갈지 모른다"); }
    else if (r.chance(Math.min(0.5, CD.zero * Kt(s)))) { dryNow = true; if (lead2 >= 0.8) notes.push("이번 달은 새 문의가 한 건도 없다"); }
    const roll = (x) => Math.floor(x) + (r.chance(x % 1) ? 1 : 0);
    const w = V.lv >= 4 ? (V.niche ? ["pkg", "pkg", "post", "post", "market"] : ["post", "post", "market"]) : V.lv === 3 ? ["post", "market", "market", "friend"] : V.lv === 2 ? ["market", "market", "friend"] : ["friend"];
    if (!dryNow) {
      if (!dm.on) { const nLead = Math.min(3, roll(lead2)); for (let i = 0; i < nLead && V.offers.length < 5; i++) makeOffer(s, r, r.pick(w)); }
      else { // 도메인 시대: 밖 문의는 줄고, 고른 도메인마다 문의가 따로 들어온다
        const L = []; for (let i = roll(lead2 * domOutMul()); i > 0; i--) L.push(null);
        for (const k of dm.picks) for (let i = roll(lead2 * VB_CH.dom.lead); i > 0; i--) L.push(k);
        for (const k of r.shuffle(L).slice(0, 3)) if (V.offers.length < 5) makeOffer(s, r, r.pick(w), k);
      }
    }
    // 11-26 도메인 이해도: 회사·인맥·배우자·다른 투잡으로 달마다 오른다
    if (dm.on) for (const k of dm.picks) { const g = domGain(s, k); if (g > 0) domAdd(s, k, g, notes); }
    // 6) 겸직 눈치
    if (employed(s) && V.rets.length + (A?.live ? 2 : 0) >= 3 && r.chance(V.ok ? 0.03 : 0.07)) { applyEff(s, { eye: 2 }); notes.push("점심시간마다 노트북을 여는 걸 팀장이 봤다(회사 눈치 +)"); }
    if (SYN.on(s, "vb_night")) s.hp = clamp(s.hp - 2, 0, s.hpMax);
    if (V.bomb && r.chance(0.12)) { V.bomb = 0; V.rep = clamp(V.rep - 15, 0, 100); const lost = V.rets.pop(); scenes.push({ kind: "story", tag: "바이브코딩", title: "들켰다", text: `조용히 고쳤던 보안 구멍을 고객의 지인이 찾아냈다. "왜 말 안 했어요?" ${lost ? `${lost.nm} 유지보수가 끊겼고, ` : ""}재능마켓 후기에 별 하나가 박혔다.`, choices: [{ t: "계속", eff: { mental: -8 }, text: "" }] }); }
    if (V.hide && employed(s) && V.lv >= 3 && r.chance(0.04)) { V.hide = 0; applyEff(s, { eye: 12 }); notes.push("인사팀이 사업자등록 기록으로 미신고 겸직을 찾아냈다(회사 눈치 +12)"); }
    // 7) 이번 달 이익
    const sum = (o, ks) => ks.reduce((a, n) => a + (o[n] || 0), 0);
    const rev = sum(M.inc, MONEY.inc), profit = rev - sum(M.exp, MONEY.exp), rec = ret + mr;
    V.last = { rev, profit, ret, mrr: mr, srv, q, need, fx: V.fx, tool: toolCost(s) };
    V.hist.push(Math.round(profit)); V.revH.push(Math.round(rev)); V.recH.push(Math.round(rec));
    for (const h of [V.hist, V.revH, V.recH]) if (h.length > 24) h.shift();
    V.goodM = profit >= VB_BAL.devGood * pi && employed(s) ? V.goodM + 1 : 0; // 연속으로 센다
    V.recStreak = rec >= 250 * pi && rec >= rev * 0.4 ? V.recStreak + 1 : 0;
    V.fx = 0; V.as = Math.max(0, V.as - 0.5); if (V.debt > 0) V.debt--;
    V.rep = clamp(V.rep * 0.995, 0, 100);
    // 8) 단계 오르기
    const a3 = avg3(V), bc = bestCase(V);
    const up = V.lv === 1 ? V.site && V.refs >= 3 : V.lv === 2 ? a3 >= 100 * pi && V.rets.length >= 1 : V.lv === 3 ? bc[1] >= 3 && a3 >= 250 * pi : V.lv === 4 ? V.recStreak >= 3 : false;
    if (up) {
      V.lv++; if (V.lv === 4 && !V.niche) V.niche = bc[0];
      notes.push(`바이브코딩 Lv${V.lv} ${LV[V.lv].n}! 풀린 것: ${LV[V.lv].unlock}`); log(s, `바이브코딩 Lv${V.lv} ${LV[V.lv].n}`, "work");
    }
    // 9) 장면
    // 11-26 도메인의 시대: 3년 차 예고(수치 그대로), 6년 차 본 사건
    if (!dm.on && s.t >= VB_CH.dom.onT) { dm.pre = 1; dm.on = s.t; scenes.push(domScene(s)); }
    else if (!dm.pre && s.t >= VB_CH.dom.preT) { dm.pre = 1; scenes.push({ kind: "story", tag: "바이브코딩", title: "\"만드는 건 이제 다 하잖아요\"", text: "견적 상담 끝에 발주처 담당자가 말했다. \"만드는 건 이제 다 하잖아요. 저희 업계를 아시는 분을 찾고 있어요.\" 이번 건은 그대로 계약했다. 그 말이 며칠 귀에 남았다.", choices: [{ t: "계속", eff: {}, text: "" }] }); }
    if (!scenes.some((x) => x?.tag === "바이브코딩")) {
      if (V.site && V.lv <= 2 && !V.seen.includes("e02")) scenes.push(vbEvent(s, r, "e02"));
      else if (V.m === 2 && !V.seen.includes("e03")) scenes.push(vbEvent(s, r, "e03"));
      else if (V.scope !== "tight" && V.projects.some((p) => !p.own && !p.fight && p.creep >= VB_F30.fight)) { const p = V.projects.find((x) => !x.own && !x.fight && x.creep >= VB_F30.fight); p.fight = 1; scenes.push(scopeScene(s, p)); }
      else if (V.lv >= 2 && (V.rets.length || A?.live) && s.t - (V.mdT ?? -99) >= VB_F30.model.gap && r.chance(VB_F30.model.p)) { V.mdT = s.t; scenes.push(modelScene(s)); }
      else if (r.chance(V.lv >= 2 ? 0.22 : 0.12)) { const sc = vbEvent(s, r); if (sc) scenes.push(sc); }
    }
    return Math.round(profit);
  },
  idle(s) { const A = s.vibe?.app; if (A?.live) A.users = Math.round(A.users * 0.85); },
  value(s) { const V = s.vibe; if (!V?.app?.live) return 0; return Math.max(0, Math.round((mrr(s) - appServer(s)) * 10)); },
  passive(s) { const V = s.vibe; if (!V?.agent) return 0; const h = V.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0; },
  slot: (s) => !!s.vibe?.agent,
  todos(s) {
    const V = s.vibe, t = [], n = fixNeed(s);
    if (n > 0 && V.fx < n) t.push({ lv: V.fx < n * 0.5 ? 2 : 1, text: `바이브코딩 유지보수 ${V.fx}/${n}` });
    for (const p of V.projects) { if (p.own) { if (p.own !== "app") t.push({ lv: 1, text: `${p.nm} 만들기 ${p.done}/${p.need}` }); } else if (p.due <= 0) t.push({ lv: 2, text: `${p.nm} 마감 ${p.due < 0 ? "지남" : "이번 달"} ${p.done}/${p.need}` }); }
    if (V.offers.length) t.push({ lv: 0, text: `바이브코딩 의뢰 ${V.offers.length}건 답장 대기` });
    if (V.dom?.on && !V.dom.picks.length) t.push({ lv: 1, text: "바이브코딩 도메인 고르기(화면의 '도메인' 칸)" });
    return t;
  },
  stopWhy: (s) => (s.vibe.agent ? "하청 계약을 먼저 해지하세요" : null),
  eff(s, e, out) {
    const V = s.vibe; if (!V) return;
    if (e.vb_tech) { V.tech = clamp(V.tech + e.vb_tech, 0, 100); out.push(`기술 이해 +${e.vb_tech}`); }
    if (e.vb_rep) { V.rep = clamp(V.rep + e.vb_rep, 0, 100); out.push(`개발 평판 ${e.vb_rep > 0 ? "+" : ""}${e.vb_rep}`); }
    if (e.vb_cost) { expense(s, "바이브코딩 도구·서버", e.vb_cost); out.push(`돈 −${won(e.vb_cost)}`); }
    if (e.vb_lecture) { income(s, "바이브코딩 강의", e.vb_lecture); out.push(`강사료 +${won(e.vb_lecture)}`); }
    if (e.vb_extra) { income(s, "바이브코딩 외주", e.vb_extra); out.push(`추가 수정비 +${won(e.vb_extra)}`); }
    if (e.vb_tool !== undefined) { V.tool = e.vb_tool; out.push(`도구: ${TOOL[V.tool].n}`); }
    if (e.vb_tq) { V.tq = e.vb_tq; V.tqT = 6; out.push(`작업 속도 ${e.vb_tq > 1 ? "+" : "−"}${Math.round(Math.abs(e.vb_tq - 1) * 100)}% (6개월)`); }
    if (e.vb_spec) { const p = newestPaid(V); if (p) { if (e.vb_spec > 0) { p.spec = true; out.push("수정 요청 위험 ↓"); } else { p.vague = true; p.done += 1; out.push("진도 +1 · 수정 요청 위험 ↑"); } } }
    if (e.vb_need) { const p = newestPaid(V); if (p) { p.need += e.vb_need; out.push(`작업 +${e.vb_need}`); } }
    if (e.vb_cut) { const p = newestPaid(V); if (p) { const rest = p.price - p.dep; p.price = Math.round(p.dep + rest * e.vb_cut); out.push(`잔금 ${won(rest)} → ${won(p.price - p.dep)}`); } }
    if (e.vb_users && V.app?.live) { const d = Math.round(V.app.users * e.vb_users); V.app.users = Math.max(0, V.app.users + d); out.push(`앱 사용자 ${d >= 0 ? "+" : ""}${d}`); }
    if (e.vb_offer) { const o = makeOffer(s, R(s), e.vb_offer); out.push(`새 의뢰: ${o.nm}`); }
    if (e.vb_bomb) V.bomb = 1;
    if (e.vb_ban) V.ban = 1;
    if (e.vb_ok) { V.ok = 1; V.hide = 0; out.push("겸직 허가"); }
    if (e.vb_hide) V.hide = 1;
  },
  choose: {
    vb_ev(s, r, i, ok) {
      const V = s.vibe, ev = s._vbEv?.id, pi = SYN.pi(s), out = [];
      if (ev === "e02") {
        if (i === 0) { V.projects.push({ id: "P" + (++V.seq), ch: "friend", ind: "fit", nm: "요가원 수업 예약 페이지", price: 0, dep: 0, need: 2, done: 0, due: 4, creep: 0, mood: 0, vague: false, logo: true, spec: true }); out.push("요가원 의뢰 수주(무료·로고 사용 동의)"); }
        else if (ok) { const price = r5(30 * pi), dep = Math.round(price * 0.3); V.projects.push({ id: "P" + (++V.seq), ch: "friend", ind: "fit", nm: "요가원 수업 예약 페이지", price, dep, need: 3, done: 0, due: 4, creep: 0, mood: 0, vague: false }); income(s, "바이브코딩 외주", dep); out.push(`요가원 의뢰 수주 · 착수금 ${won(dep)}`); }
      }
      if (ev === "e05" && i === 0) { const fee = r5((ok ? 30 : 15) * pi); V.rets.push({ id: "R" + (++V.seq), nm: "단골 고객 사이트", ind: "shop", fee, t: s.t }); out.push(`유지보수 계약 월 ${won(fee)}`); }
      if (ev === "e05" && i === 1) { V.as += 2; out.push("무상 AS +2(유지보수 일 +1)"); }
      if (ev === "e08") {
        if (i === 0) { V.niche = V.niche || "academy"; V.cases.academy = (V.cases.academy || 0) + 1; for (let k = 0; k < 2; k++) { const o = makeOffer(s, r, V.lv >= 3 ? "post" : "market"); o.ind = "academy"; o.nm = `학원 ${r.pick(INDS.academy.jobs)}`; } out.push("업종: 학원 · 학원 의뢰 2건"); }
        else { for (let k = 0; k < 3; k++) makeOffer(s, r, V.lv >= 3 ? "post" : "market"); out.push("의뢰 3건"); }
      }
      if (ev === "x5") {
        const p = newestPaid(V); if (!p) return out;
        if (i === 0) { if (ok) { const mid = r5(Math.max(0, p.price - p.dep) * 0.3), fee = CH[p.ch]?.fee || 0; income(s, "바이브코딩 외주", mid); if (fee) expense(s, "바이브코딩 수수료", Math.round(mid * fee)); p.dep += mid; out.push(`중도금 +${won(mid)}`); } }
        else if (i === 1) { p.due += 1; p.need += 1; out.push("마감 +1달", "작업 +1"); }
        else { V.projects = V.projects.filter((x) => x !== p); V.rep = clamp(V.rep - 1, 0, 100); out.push(`${p.nm} 정리(착수금은 그대로)`, "개발 평판 −1"); }
      }
      if (ev === "e10" && i === 0) { V.app = { live: true, web: true, ind: "biz", users: r.int(3, 6), price: 2, buzz: 20, t0: s.t, focus: false, best: 0, ...(domOn(s) && domBest(s) ? { dom: domBest(s) } : {}) }; out.push("내 앱 출시: 보고서 자동화 구독"); }
      if (ev === "e11" && i === 0 && V.app) { const amt = Math.max(100, Math.round((mrr(s) - appServer(s)) * 20)); s.cash += amt; addMoney(s, "inc", "바이브코딩 앱 매각", amt); V.sold++; V.soldAmt += amt; log(s, `바이브코딩: 내 앱 매각 ${won(amt)}`, "work"); V.app = null; out.push(`매각 대금 +${won(amt)}`); }
      if (ev === "e15" && V.app) { if (i === 0) { V.app.focus = true; V.bigFree = 4; V.app.users = Math.round(V.app.users * 0.9); out.push("업종 특화: 한동안 이탈, 이후 사용자 한도 +20%"); } else { V.app.price = Math.max(1, Math.round(V.app.price / 2 * 10) / 10); V.app.users = Math.round(V.app.users * 0.97); out.push(`구독료 월 ${V.app.price}만으로`); } }
      return out;
    },
    vb_dom(s, r, i) { const k = s._vbDom?.k; s._vbDom = null; if (i !== 0 || !k) return ["바이브코딩 화면의 '도메인' 칸에서 고른다"]; const x = pickDom(s, k); return x.ok ? [`내 도메인: ${DOMS[k].n}`, `지금 단가 ${Math.round(domPriceMul(s, k) * 100)}%`] : []; },
    vb_scope(s, r, i, ok) {
      const V = s.vibe, p = V.projects.find((x) => x.id === s._vbScope?.id), pi = SYN.pi(s); s._vbScope = null; if (!p) return [];
      p.fight = 1;
      if (i === 0) { p.need += 2; V.rep = clamp(V.rep + 2, 0, 100); s.hp = clamp(s.hp - 3, 0, s.hpMax); return ["작업 +2", "개발 평판 +2", "스태미너 −3"]; }
      if (i === 1) { if (ok) { const add = r5(Math.max(10 * pi, (p.price - (p.dep || 0)) * 0.25)); p.price += add; return [`추가 견적 +${won(add)}`]; } V.rep = clamp(V.rep - 4, 0, 100); return ["개발 평판 −4"]; }
      const cut = Math.min(p.creep, Math.max(0, p.need - p.done - 0.5)); p.need = Math.round((p.need - cut) * 10) / 10; V.rep = clamp(V.rep - 3, 0, 100); return [`작업 −${Math.round(cut * 10) / 10}`, "개발 평판 −3"];
    },
    vb_model(s, r, i, ok) {
      const V = s.vibe, o = s._vbModel || { n: 1 }, M3 = VB_F30.model; s._vbModel = null; V.mdN = (V.mdN || 0) + 1;
      if (i === 0) { V.tech = clamp(V.tech + 4, 0, 100); V.tq = M3.tq; V.tqT = 6; V.debt = 0; return ["기술 이해 +4", `작업 속도 +${Math.round((M3.tq - 1) * 100)}% (6개월)`]; }
      if (i === 1) { V.debt = M3.debtM; const out = [`기술 부채 ${M3.debtM}달: 유지보수 +${M3.debtFix}칸·장애 위험 ↑`]; if (V.app?.live) { const d = Math.round(V.app.users * 0.04); V.app.users -= d; if (d) out.push(`앱 사용자 −${d}`); } return out; }
      if (ok) { const amt = Math.round(o.n * M3.pay * SYN.pi(s)); income(s, "바이브코딩 유지보수", amt); V.tech = clamp(V.tech + 2, 0, 100); V.debt = 0; return [`업그레이드 비용 +${won(amt)}`, "기술 이해 +2"]; }
      const lost = V.rets.pop(); V.rep = clamp(V.rep - 3, 0, 100); V.debt = Math.round(M3.debtM / 2); return [...(lost ? [`${lost.nm} 유지보수 해지`] : []), "개발 평판 −3", `기술 부채 ${V.debt}달`];
    },
    vb_store(s, r, i) {
      const A = s.vibe.app, S3 = VB_F30.store; if (!A) return [];
      if (i === 0) { A.hold = S3.holdM; return [`재심사 ${S3.holdM}달 뒤 출시`]; }
      if (i === 1) { A.live = true; A.web = true; A.hold = 0; return ["웹으로 바로 출시", `사용자 한도 ×${S3.webCap} · 앞으로 심사 없음`]; }
      A.hold = 1; A.noPay = true; return ["1달 뒤 출시", `바깥 결제: 해지율 +${(S3.noPayChurn * 100).toFixed(1)}%p`];
    },
  },
  migrate(s, V) { if (!V.v) V.v = 1; if (V.v < 2) { V.v = 2; V.scope = V.scope || "std"; V.debt = V.debt || 0; } if (V.v < 3) { V.v = 3; V.dry = V.dry || 0; } const dm = domOf(V); dm.picks = dm.picks || []; dm.u = dm.u || {}; dm.meetT = dm.meetT || {}; V.seen = V.seen || []; V.seenT = V.seenT || {}; },
  milestones: [
    { key: "vb_auto", title: "회사 일을 코디가 했다", test: (s) => (s.vibe?.builds || 0) >= 1 && !(s.vibe.projects || []).some((p) => p.own === "auto"), lines: ["월요일마다 세 시간 걸리던 보고서 정리가 버튼 하나로 끝났다.", "\"이거 어떻게 했어?\" 옆자리가 물었다. 웃기만 했다."] },
    { key: "vb_lv2", title: "첫 외주", test: (s) => (s.vibe?.lv || 0) >= 2, lines: ["동네 가게 예약 버튼에 내가 만든 화면이 떴다.", "후기 세 줄. 포트폴리오 첫 페이지가 찼다."] },
    { key: "vb_lv3", title: "매달 들어오는 돈", test: (s) => (s.vibe?.lv || 0) >= 3, lines: ["월초마다 유지보수비가 들어온다.", "외주를 안 받은 달에도 통장이 비지 않는다."] },
    { key: "vb_app", title: "내 앱 출시", test: (s) => !!s.vibe?.app?.live && (s.vibe?.app?.users || 0) >= 1, lines: ["결제 알림이 울렸다. 모르는 사람이 내 앱에 2만 원을 냈다.", "출시 날 밤, 서버 그래프만 보다가 잠들었다."] },
    { key: "vb_lv4", title: "업종 전문가", test: (s) => (s.vibe?.lv || 0) >= 4, lines: ["같은 업종 사장님들이 서로 나를 소개한다.", "템플릿을 고쳐 쓰니 3주 일이 1주가 됐다."] },
    { key: "vb_lv5", title: "솔로프리너", test: (s) => (s.vibe?.lv || 0) >= 5, lines: ["유지보수와 구독만으로 생활비가 된다.", "회사 월급 없이도 달이 넘어간다. 이제는 용기가 아니라 계산의 문제다."] },
    { key: "vb_end_dev", end: true, kind: "good", epi: "퇴근 후 1인 개발사는 계속 돌아간다. 동네 가게 예약 버튼 열두 개가 내 코드다.", title: "퇴근 후 1인 개발사", test: (s) => (s.vibe?.goodM || 0) >= 24, lines: ["월 150만 원 넘는 달이 스물네 달 이어졌다. 회사도 그대로 다닌다.", "동네 가게 열두 곳의 예약 버튼이 내 코드다."] },
    { key: "vb_end_solo", end: true, kind: "good", epi: "사직서를 내고 솔로프리너가 됐다. 사원증 대신 서버 알림이 나를 깨운다.", title: "솔로프리너 독립", test: (s) => (s.vibe?.lv || 0) >= 5 && (s.fullJob === "vibe" || !!s.co?.quit), lines: ["런웨이를 계산하고 사직서를 냈다.", "사원증 대신 서버 알림이 나를 깨운다."] },
    { key: "vb_end_exit", end: true, kind: "good", epi: "주말에 만든 작은 서비스를 팔았다. 그 돈이 전세 보증금이 됐다.", title: "엑싯의 맛", test: (s) => (s.vibe?.sold || 0) >= 1, lines: ["실사 자료를 보내고 계약서에 서명했다.", "주말마다 만든 작은 서비스가 전세 보증금이 됐다."] },
    { key: "vb_close", title: "서버를 내린 밤", test: (s) => (s.vibe?.closed || 0) >= 1, lines: ["마지막 사용자에게 종료 안내 메일을 보냈다.", "MVP는 10분, 프로덕션은 10주. 문 닫는 데는 하룻밤이면 됐다."] },
  ],
  perks: [
    { id: "p_vb_prompt", n: "말로 짜는 손", line: "프롬프트 한 줄이 설계도다", pro: "바이브코딩 완성 속도 +15%", m: { vbSpeed: 1.15 }, got: "외주 납품 120건", test: (s) => (s.vibe?.delivered || 0) >= 120 },
    { id: "p_vb_ops", n: "새벽 3시의 평정심", line: "장애 알림에도 심박수가 그대로다", pro: "내 앱 장애 피해 절반", m: { vbOps: 0.5 }, got: "버그 잡기 200번 + 내 앱 유료 사용자 72명", test: (s) => (s.vibe?.fixes || 0) >= 200 && (s.vibe?.app?.users || 0) >= 72 },
  ],
  perkCine: { p_vb_prompt: "vb_lv2", p_vb_ops: "vb_app" },
  synergy: [
    { id: "vb_code", kind: "good", n: "코딩 스터디 × 바이브코딩", need: "코딩 스터디 취미 + 바이브코딩", desc: "코디 다루는 법을 같이 배운다: 완성 속도 +15%", test: (s) => isOn(s) && (s.hb?.joined || []).includes("code") },
    { id: "vb_uc", kind: "good", n: "무인카페 × 바이브코딩", need: "무인카페 + 바이브코딩", desc: "내 가게 재고·키오스크 알림을 직접 만든다: 매장마다 점검 +0.5 자동, 소상공인 의뢰 단가·문의 +", test: (s) => isOn(s) && !!s.sj?.active?.includes("ucafe") },
    { id: "vb_space", kind: "good", n: "공간 투잡 × 바이브코딩", need: "파티룸 또는 에어씨앤씨 + 바이브코딩", desc: "예약·자동 응대 봇을 직접 만든다: 지점·숙소마다 관리 +0.5 자동, 의뢰 단가·문의 +", test: (s) => isOn(s) && (!!s.sj?.active?.includes("pr") || !!s.sj?.active?.includes("airbnb")) },
    { id: "vb_num", kind: "good", n: "숫자 감각 × 내 앱", need: "숫자 60 이상 + 바이브코딩 앱 운영", desc: "해지율·LTV를 본다: 앱 해지율 −1.5%p", test: (s) => isOn(s) && !!s.vibe?.app?.live && (s.st?.num || 0) >= 60 },
    { id: "vb_night", kind: "bad", n: "새벽 장애 알림 × 회사", need: "바이브코딩 앱·유지보수 3건 이상 + 회사 다니는 중", desc: "자다가도 서버 알림: 매달 스태미너 −2", test: (s) => isOn(s) && employed(s) && ((s.vibe?.rets?.length || 0) + (s.vibe?.app?.live ? 2 : 0)) >= 3 },
  ],
  spots: { cowork: ["vb_build"], market: ["vb_sell"] },
};
