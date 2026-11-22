// 시장 충격 이벤트(v4.25b). 경기·플랫폼·트렌드가 몇 달~1년 동안 그 투잡 이익을 흔든다. 좋은 충격도 조금 있다.
// core.js endMonth 에서 rivalMonth 바로 뒤에 marketMonth(s, r, notes, scenes) 를 부른다. onChoose 이름은 "mk_" 로 시작(MK_CHOOSE).
// 돈: 그 투잡의 이번 달 이익 × (1 + 라이벌 순 압박) × 시장 배수 → 장부 "시장 영향"(손해는 지출, 호재는 수입).
//   라이벌 압박을 먼저 빼고 남은 이익에 곱하므로 두 배수가 서로 덮어쓰지 않는다(곱셈으로 이어짐). 이익이 0 이하인 달은 건드리지 않는다.
// 시대·경제 사건(core.js s.era)과 겹치지 않게:
//   - 경기 한파(s.era.winter)·침체·팬데믹은 파티룸·인별·숙소·무인카페 엔진이 이미 직접 깎는다 → 그동안 그 투잡의 나쁜 충격은 안 나온다.
//   - 대신 한파 동안에만 나오는 '한파 여파' 이벤트(과외·외주·치킨은 나쁨, 이직 컨설팅·웹소설·타로는 좋음)로 회사 연봉 동결·구조조정과 이어진다.
//   - AI 시대(s.era.ai)는 컨설팅을 이미 깎으므로 컨설팅 AI 충격은 그때 안 나오고, 바이브·타로 AI 충격은 더 자주 나온다.
//   - '금리 인상' 이벤트는 s.era.rate 가 없을 때만 나오고, 고르면 금리 시대(대출 이자 +2%p, 12달)를 연다.
//   - 팬데믹 동안엔 화상과외·웹소설 호재가 나온다.
// 상태: s.mk = { evT, seen:{id:t}, list:[{ id, job, v, until, n, hold }] }. 난수는 r 만.
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import { addMoney, log, jo } from "./core.js";
import { profitOf } from "./rival.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const M = (s, x) => Math.max(1, Math.round(x * SYN.pi(s) / 5) * 5); // 만원, 물가 반영
const pct = (x) => `${Math.round(Math.abs(x) * 100)}%`;
const sgn = (x) => (x > 0 ? "+" : "−");
export const MK_BAL = { chance: 0.12, gap: 4, again: 24, lo: -0.4, hi: 0.3, rebound: [0.04, 3] };
export const MK_LABEL = "시장 영향", CUT_LABEL = "투잡 부대비용", CRUISE_LABEL = "단골·입소문";
// v4.27 투잡별 부대비용(defs SIDE_ADJ) − 순항(defs CRUISE: 같은 투잡을 오래 할수록 덜 뗀다, 넘치면 보너스). 시작 달은 s.mk.t0 에 적는다
export function sideCut(s, job) {
  const V = st(s), t0 = ((V.t0 = V.t0 || {})[job] ??= s.t), y = (s.t - t0) / 12, C = D.CRUISE;
  const base = job === "cs" && s.cs?.niches?.includes("career") && D.SIDE_ADJ?.cs_career !== undefined ? D.SIDE_ADJ.cs_career : (D.SIDE_ADJ?.[job] ?? D.SIDE_CUT ?? 0); // v4.28 컨설팅: 경력 이직 분야를 열면 따로
  const k = !C ? 0 : y >= C.full ? 1 : y > C.from ? (y - C.from) / (C.full - C.from) : 0;
  return +(base - k * (C?.v || 0) - (s.hid?.cutNow?.[job] || 0) - (s.h2?.cut?.[job] || 0)).toFixed(3); // v4.30 다른 방식 히든 길(hidden2.js s.h2.cut, 음수면 비용↑) // v4.29 히든 길을 열면 부대비용을 줄인다(hidden.js HID_REW.cut)
}
const isOn = (s, job) => !!s.sj?.active?.includes(job);
const ERA_HIT = { pr: ["winter", "pandemic", "slump", "bigcomp"], insta: ["winter", "algo"], airbnb: ["winter", "pandemic", "intl"], ucafe: ["winter"] }; // 엔진이 이미 깎는 시대
const hitByEra = (s, job) => (ERA_HIT[job] || []).some((k) => s.era?.[k]);

// ── 대응 선택 종류 ──
// 나쁜 충격: price 가격 조정(피해 70%), spend 돈 들여 막기(피해 60%), switch 채널 갈아타기(판정: 성공 피해 40%·기간 70% / 실패 115%), hold 버티기(피해 그대로, 끝나면 반등)
// 좋은 충격: ride 올라탄다(효과 150%, 몸 고생), steady 평소대로(100%), save 들뜨지 않는다(80%, 멘탈 +)
const F = { price: 0.7, spend: 0.6, hold: 1, ride: 1.5, steady: 1, save: 0.8 };
// ch: [종류, 선택지 글, 결과 글(switch 면 [성공, 실패]), 판정 능력치(switch), 비용(spend, 만원)]
export const MK_EV = [
  // ───── 한파 여파(회사 쪽 경기 한파와 이어짐) ─────
  { id: "w_tutor", job: "tutoring", g: false, v: -0.22, m: [8, 12], need: (s) => s.era?.winter, n: "한파 여파 · 학원비부터 줄인다", text: "회사마다 연봉 동결 소식이다. 학부모 단톡방에 '과외 하나 줄였어요' 글이 줄줄이 올라온다. 내 학생 어머님도 \"다음 달까지만…\"이라고 했다.", ch: [
    ["price", "수업료를 10% 내리고 붙잡는다", "\"선생님이 먼저 말해 주셔서 고마워요.\" 둘은 남았다. 남는 건 줄었다."],
    ["switch", "2인 그룹 수업으로 바꿔 부담을 나눈다", ["둘이 반값씩 내니 오히려 더 붙었다. 친구 데려오는 학생까지 생겼다.", "짝이 안 맞았다. 시간 맞추다 한 명이 그만뒀다."], "talk"],
    ["hold", "가격은 그대로. 실력으로 버틴다", "몇 명이 떠났다. 남은 학생 성적표가 다음 학기 광고가 될 거다."],
  ] },
  { id: "w_vibe", job: "vibe", g: false, v: -0.25, m: [8, 12], need: (s) => s.era?.winter, n: "한파 여파 · 외주 예산 동결", text: "\"내년 예산이 전부 동결이라서요.\" 견적까지 받은 고객사 세 곳이 같은 말을 했다. 본업 회사도 연봉 동결인데, 외주 시장은 먼저 얼었다.", ch: [
    ["price", "유지보수 월정액 상품으로 바꿔 판다", "큰 건은 없지만 작은 월정액이 쌓였다. 버틸 만하다."],
    ["switch", "예산이 남은 공공·소상공인 쪽으로 간다", ["지원 사업 공고를 뒤져 두 건을 잡았다. 서류는 많아도 돈은 확실하다.", "서류만 쓰다 한 달이 갔다. 결과는 '탈락'."], "num"],
    ["hold", "포트폴리오를 다듬으며 기다린다", "일이 없는 달엔 내 앱을 고쳤다. 봄이 오면 이게 무기가 될 거다."],
  ] },
  { id: "w_chick", job: "chicken", g: false, v: -0.16, m: [6, 10], need: (s) => s.era?.winter, n: "한파 여파 · 금요일 주문이 줄었다", text: "월급이 안 오르니 치킨부터 줄인다. 금요일 저녁 주문 알림이 작년의 3분의 2다. 사장님 단톡방엔 '이번 달 적자' 인증이 올라온다.", ch: [
    ["price", "1인 세트·반 마리 메뉴를 만든다", "반 마리가 의외로 잘 나간다. 객단가는 내려갔지만 주문 수는 버텼다."],
    ["spend", "단골 쿠폰을 크게 뿌린다", "쿠폰 쓴 단골이 다시 왔다. 쿠폰값은 아프지만 순위는 지켰다.", null, 60],
    ["hold", "메뉴·가격 그대로 버틴다", "주문이 줄어도 맛은 안 줄였다. 한파가 끝나면 남는 가게는 이런 가게다."],
  ] },
  { id: "w_cs", job: "cs", g: true, v: 0.18, m: [6, 10], need: (s) => s.era?.winter || s.era?.freeze, n: "구조조정 바람, 이직 상담이 몰린다", text: "회사마다 희망퇴직·구조조정 소식이다. \"지금 회사에 계속 있어도 될까요?\" 경력기술서 첨삭 문의가 평소의 두 배로 들어온다. 본업 우리 회사도 남 얘기가 아니다.", ch: [
    ["ride", "이직 상담 상품을 따로 만들어 밀어붙인다", "경력기술서·면접 패키지가 매진됐다. 주말이 사라졌다."],
    ["steady", "하던 대로 받는다", "문의가 늘어난 만큼 조금 더 벌었다."],
    ["save", "회사 눈치도 있으니 조용히 받는다", "욕심 내지 않았다. 대신 회사에서도 무사했다."],
  ] },
  { id: "w_novel", job: "webnovel", g: true, v: 0.12, m: [6, 10], need: (s) => s.era?.winter || s.era?.slump, n: "불황형 소확행, 결제가 늘었다", text: "외식도 여행도 줄인 사람들이 한 편에 몇백 원짜리 웹소설로 몰린다. 플랫폼 통계에 '퇴근길 결제'가 역대 최고라고 떴다.", ch: [
    ["ride", "연재 주기를 당겨 하루 한 편씩 올린다", "독자가 따라왔다. 손목이 비명을 지른다."],
    ["steady", "하던 대로 연재한다", "조회수가 조금 올랐다. 덤이다."],
    ["save", "무리하지 않고 비축분을 쌓는다", "급하게 쓰지 않았다. 다음 달이 편하다."],
  ] },
  { id: "w_tarot", job: "tarot", g: true, v: 0.12, m: [6, 9], need: (s) => s.era?.winter, n: "불안한 시절엔 타로가 붐빈다", text: "\"회사가 구조조정한대요. 저 남아도 될까요?\" 연애 고민보다 회사 고민 손님이 많아졌다. 불안이 커질수록 예약이 찬다.", ch: [
    ["ride", "'직장운' 상담 상품을 따로 만든다", "직장운 상담이 연애운을 넘었다. 목이 쉰다."],
    ["steady", "하던 대로 본다", "손님이 조금 늘었다."],
    ["save", "불안을 파는 것 같아 가격은 그대로 둔다", "단골들이 그 마음을 알아줬다."],
  ] },
  // ───── 팬데믹 때 호재 ─────
  { id: "p_tutor", job: "tutoring", g: true, v: 0.2, m: [6, 9], need: (s) => s.era?.pandemic, n: "비대면 수업 수요 폭증", text: "학원이 문을 닫았다. 학부모들이 '화상 수업 되는 선생님'을 찾는다. 원래 화상이었던 내가 갑자기 귀한 사람이 됐다.", ch: [
    ["ride", "저녁 타임을 하나 더 연다", "시간표가 꽉 찼다. 목소리가 갈라진다."],
    ["steady", "지금 학생들만 챙긴다", "문의가 남아 소개로 돌렸다."],
    ["save", "무리하지 않는다", "건강하게 버텼다."],
  ] },
  { id: "p_novel", job: "webnovel", g: true, v: 0.15, m: [4, 8], need: (s) => s.era?.pandemic, n: "집콕 시대, 독자가 늘었다", text: "밖에 못 나가니 다들 휴대폰으로 읽는다. 무료 회차 조회수가 두 배가 됐다.", ch: [
    ["ride", "특별 외전을 연달아 푼다", "외전이 입소문을 탔다. 밤을 새웠다."],
    ["steady", "하던 대로 연재한다", "조회수가 올랐다."],
    ["save", "비축분부터 쌓는다", "급하지 않게 갔다."],
  ] },
  // ───── 금리 ─────
  { id: "rate", job: ["ucafe", "chicken", "pr"], g: false, v: -0.14, m: [8, 12], need: (s) => !s.era?.rate, n: "금리 인상, 지갑이 닫혔다", text: "기준금리가 또 올랐다. 대출 이자 문자에 손님들 지갑이 닫힌다. 내 사업자 대출 이자도 오른다(금리 시대 12달).", era: { rate: 12 }, ch: [
    ["price", "가성비 메뉴·요금제를 앞세운다", "싼 걸 찾는 손님이 왔다. 남는 건 적다."],
    ["spend", "대출 일부를 먼저 갚는다", "이자가 줄었다. 마음이 조금 가볍다.", null, 80],
    ["hold", "그대로 버틴다", "버티는 동안 근처 가게 두 곳이 문을 닫았다."],
  ] },
  // ───── 파티룸 ─────
  { id: "pr_decay", job: "pr", g: false, v: -0.2, m: [9, 14], n: "상권이 식었다", text: "근처 대학 캠퍼스 일부가 이전한다는 기사가 났다. 골목 술집 세 곳이 한꺼번에 '임대'를 붙였다. 토요일 저녁 예약 문의가 눈에 띄게 줄었다.", ch: [
    ["price", "평일 요금을 크게 내린다", "평일이 조금 찼다. 객단가는 내려갔다."],
    ["switch", "회사 워크숍·촬영 대관으로 손님을 바꾼다", ["평일 낮 촬영 대관이 들어왔다. 상권과 상관없는 손님이다.", "기업 담당자는 답이 없었다."], "mkt"],
    ["hold", "버틴다. 상권은 돌고 돈다", "1년쯤 지나자 새 가게들이 들어오기 시작했다."],
  ] },
  { id: "pr_trend", job: "pr", g: true, v: 0.15, m: [4, 7], need: (s) => !hitByEra(s, "pr"), n: "홈파티 대신 파티룸, 유행이 왔다", text: "숏폼에 '파티룸 생일 브이로그'가 유행이다. 처음 보는 대학생 단체 예약이 연달아 들어온다.", ch: [
    ["ride", "컨셉 소품을 바꾸고 주말 요금을 올린다", "사진 찍으러 오는 손님이 줄을 섰다. 청소가 두 배다."],
    ["steady", "하던 대로 받는다", "예약이 조금 늘었다."],
    ["save", "유행은 지나간다. 가격은 그대로", "단골이 고마워했다."],
  ] },
  // ───── 무인카페 ─────
  { id: "uc_decay", job: "ucafe", g: false, v: -0.18, m: [8, 12], n: "앞 건물이 비었다", text: "매장 앞 오피스 건물 회사가 통째로 이사했다. 아침 출근길 손님이 하룻밤 새 사라졌다.", ch: [
    ["price", "아침 할인 메뉴를 만든다", "남은 손님은 붙잡았다. 마진은 줄었다."],
    ["switch", "배달·픽업 주문을 연다", ["근처 아파트에서 픽업 주문이 들어온다. 빈자리를 반쯤 메웠다.", "배달 수수료만 나갔다."], "mkt"],
    ["hold", "새 입주사를 기다린다", "반년 뒤 새 회사가 들어왔다. 그때까진 길었다."],
  ] },
  { id: "uc_hot", job: "ucafe", g: true, v: 0.15, m: [2, 3], need: (s) => [6, 7].includes(s.cal) && !hitByEra(s, "ucafe"), n: "역대급 폭염 특수", text: "낮 기온 37도. 얼음 음료가 날개 돋친 듯 팔린다. 얼음이 오후 세 시에 동났다.", ch: [
    ["ride", "제빙기를 하나 더 빌린다", "얼음이 안 떨어졌다. 매출이 뛰었다. 관리 횟수도 뛰었다."],
    ["steady", "하던 대로 채운다", "오후엔 얼음이 없었지만 그래도 잘 팔렸다."],
    ["save", "무리하지 않는다", "적당히 팔고 적당히 쉬었다."],
  ] },
  // ───── 에어씨앤씨 ─────
  { id: "ab_low", job: "airbnb", g: false, v: -0.2, m: [6, 10], n: "관광 비수기 + 숙박 단속 강화", text: "구청이 미등록 숙소 집중 단속을 발표했다. 같은 달 관광 비수기까지 겹쳐 예약 달력이 듬성듬성하다.", ch: [
    ["price", "장기 숙박 할인을 연다", "한 달 살기 손님이 들어왔다. 1박 단가는 내려갔다."],
    ["switch", "출장객·한 달 살기 플랫폼으로 갈아탄다", ["출장객 예약이 비수기를 메웠다.", "새 플랫폼은 노출이 안 됐다."], "lang"],
    ["hold", "성수기를 기다린다", "비수기는 길었다. 대신 그동안 방을 손봤다."],
  ] },
  { id: "ab_event", job: "airbnb", g: true, v: 0.2, m: [2, 4], need: (s) => !hitByEra(s, "airbnb"), n: "국제 행사 특수", text: "도시에서 큰 국제 행사가 열린다. 호텔이 다 찼다. 내 숙소 예약 달력이 처음으로 빈칸 없이 찼다.", ch: [
    ["ride", "행사 기간 요금을 두 배로 올린다", "그래도 찼다. 청소 매니저 웃음이 커졌다."],
    ["steady", "평소 요금으로 받는다", "후기가 좋았다. '이 가격에 이 숙소?'"],
    ["save", "단골 예약을 먼저 챙긴다", "단골이 고마워했다."],
  ] },
  // ───── 치킨 ─────
  { id: "ch_fee", job: "chicken", g: false, v: -0.15, m: [9, 14], n: "배달 앱 수수료 인상", text: "배달 앱이 중개 수수료와 배달비 정책을 바꿨다. 한 마리 팔면 남는 돈이 천오백 원 줄었다. 사장님 단톡방이 불타고 있다.", ch: [
    ["price", "메뉴 가격을 천 원 올린다", "주문이 조금 줄었다. 그래도 남는 건 지켰다."],
    ["switch", "포장 할인·전화 주문으로 손님을 돌린다", ["포장 손님이 늘었다. 수수료가 안 나가는 주문이다.", "포장 할인만 나가고 손님은 그대로 앱으로 시켰다."], "talk"],
    ["hold", "그냥 감수한다", "남는 게 줄었다. 다들 똑같다는 게 위로다."],
  ] },
  { id: "ch_cost", job: "chicken", g: false, v: -0.14, m: [5, 8], n: "닭값 폭등", text: "조류 질병 여파로 닭 공급가가 30% 올랐다. 기름값까지 올라 원가표가 빨갛다.", ch: [
    ["price", "가격을 올린다", "단골 몇은 투덜댔지만 남았다."],
    ["spend", "다른 공급처를 뚫는다", "공급가를 조금 낮췄다. 발품값은 들었다.", null, 40],
    ["hold", "가격 그대로, 마진을 줄인다", "손님은 그대로다. 통장만 가벼워졌다."],
  ] },
  { id: "ch_cup", job: "chicken", g: true, v: 0.2, m: [1, 2], need: (s) => [6, 7, 11, 12].includes(s.cal), n: "국가대표 경기 시즌", text: "국가대표 경기가 연달아 있다. 경기 시작 30분 전 주문이 한꺼번에 몰린다.", ch: [
    ["ride", "알바를 하나 더 부르고 세트를 만든다", "튀김기가 쉬지 않았다. 매출 신기록."],
    ["steady", "평소대로 튀긴다", "배달이 조금 늦었지만 잘 팔렸다."],
    ["save", "무리하지 않는다", "주문을 조금 끊었다. 대신 사고는 없었다."],
  ] },
  // ───── 인별 ─────
  { id: "in_ad", job: "insta", g: false, v: -0.22, m: [6, 10], need: (s) => !hitByEra(s, "insta"), n: "협찬 시장이 얼었다", text: "광고주들이 마케팅 예산을 줄였다. 협찬 문의가 절반으로 줄고, 들어오는 것도 '제품만 드려요'가 대부분이다.", ch: [
    ["price", "협찬 단가를 낮춰 받는다", "건수는 지켰다. 단가는 지키지 못했다."],
    ["switch", "공동구매로 직접 판다", ["팔로워가 직접 사 줬다. 협찬보다 남는다.", "재고만 남았다."], "mkt"],
    ["hold", "단가는 지킨다. 기다린다", "몇 달 조용했다. 단가를 지킨 계정이 나중에 먼저 불렸다."],
  ] },
  { id: "in_reel", job: "insta", g: false, v: -0.18, m: [5, 8], need: (s) => !hitByEra(s, "insta"), n: "숏폼 우대 개편, 사진 도달 급감", text: "인별이 숏폼 영상을 밀어주는 쪽으로 노출 방식을 바꿨다. 사진 게시물 도달이 반토막 났다. 협찬사는 '도달 수치'부터 묻는다.", ch: [
    ["spend", "편집 알바를 써서 영상으로 갈아탄다", "영상이 올라가자 도달이 돌아왔다. 편집비는 들었다.", null, 50],
    ["switch", "직접 영상을 배워 찍는다", ["첫 영상이 터졌다. 사진보다 반응이 세다.", "어색한 영상이 됐다. 댓글이 조용하다."], "sense"],
    ["hold", "사진 계정으로 버틴다", "도달은 줄었지만 사진을 좋아하는 팔로워는 남았다."],
  ] },
  { id: "in_trend", job: "insta", g: true, v: 0.15, m: [3, 5], need: (s) => !hitByEra(s, "insta"), n: "내 분야가 유행을 탔다", text: "내가 하던 분야가 갑자기 유행이다. 예전 게시물까지 다시 퍼지며 협찬 문의가 몰린다.", ch: [
    ["ride", "하루 두 번씩 올린다", "팔로워가 쭉 올랐다. 잠이 줄었다."],
    ["steady", "하던 대로 올린다", "덤으로 조금 올랐다."],
    ["save", "유행 말고 내 색을 지킨다", "유행이 지나도 남을 팔로워가 늘었다."],
  ] },
  // ───── 웹소설 ─────
  { id: "wn_algo", job: "webnovel", g: false, v: -0.2, m: [5, 8], n: "추천 알고리즘 개편", text: "플랫폼이 추천 방식을 바꿨다. 신작·대형 작품 위주로 노출되고, 연재 중인 중간 작품은 첫 화면에서 사라졌다.", ch: [
    ["price", "무료 회차를 크게 늘린다", "새 독자는 왔다. 유료 전환은 늦다."],
    ["switch", "다른 플랫폼에 동시 연재한다", ["다른 곳에서 독자가 새로 붙었다.", "두 곳 관리하느라 둘 다 엉성해졌다."], "write"],
    ["hold", "버티며 완성도에 집중한다", "노출은 줄었지만 남은 독자는 진짜 독자다."],
  ] },
  { id: "wn_fee", job: "webnovel", g: false, v: -0.13, m: [10, 14], n: "플랫폼 정산 비율 변경", text: "플랫폼이 작가 정산 비율을 바꿨다. 같은 조회수에 들어오는 돈이 줄었다. 작가 커뮤니티가 들끓는다.", ch: [
    ["switch", "작가 모임과 함께 협상에 나선다", ["일부 되돌렸다. 작가들이 박수를 쳤다.", "협상은 실패했다. 공지만 길어졌다."], "talk"],
    ["price", "후원·굿즈로 빈 곳을 메운다", "열성 독자들이 후원해 줬다. 반쯤 메웠다."],
    ["hold", "그냥 쓴다", "다들 똑같다. 쓰는 수밖에."],
  ] },
  // ───── 컨설팅 ─────
  { id: "cs_ads", job: "cs", g: false, v: -0.18, m: [6, 10], n: "검색 광고 단가 폭등", text: "취업 시즌을 앞두고 검색 광고 단가가 두 배가 됐다. 광고 한 번 클릭에 만 원. 같은 돈으로 오던 문의가 반이다.", ch: [
    ["spend", "광고비를 더 넣어 자리를 지킨다", "문의는 지켰다. 남는 건 줄었다.", null, 50],
    ["switch", "블로그·후기 같은 공짜 채널로 갈아탄다", ["검색 광고 없이도 후기 글로 문의가 왔다.", "글을 써도 아무도 안 봤다."], "write"],
    ["hold", "광고를 끄고 소개만 받는다", "문의가 줄었다. 대신 오는 사람은 진짜다."],
  ] },
  { id: "cs_ai", job: "cs", g: false, v: -0.2, m: [8, 12], need: (s) => !s.era?.ai, n: "무료 AI 첨삭이 나왔다", text: "포털이 무료 AI 자소서 첨삭을 내놨다. 커뮤니티에 'AI로 충분하던데요?' 글이 돈다. 첨삭 단건 문의가 뚝 끊겼다.", ch: [
    ["price", "AI 다음 단계, '사람 첨삭' 저가 상품을 만든다", "AI로 쓴 걸 고쳐 달라는 손님이 왔다. 단가는 낮다."],
    ["switch", "면접·전략 상담으로 무게를 옮긴다", ["AI가 못 하는 면접 코칭에 손님이 몰렸다.", "상품만 바꾸고 손님은 안 왔다."], "career"],
    ["hold", "품질로 버틴다", "AI 자소서에 떨어진 사람들이 돌아오기 시작했다. 반년쯤 걸렸다."],
  ] },
  // ───── 화상과외 ─────
  { id: "tu_low", job: "tutoring", g: false, v: -0.18, m: [4, 7], n: "학생이 줄고, 방학 비수기", text: "학령인구가 줄었다는 기사가 또 났다. 방학이 되니 학생들이 여행·특강으로 빠진다. 시간표에 빈칸이 늘었다.", ch: [
    ["price", "방학 특강을 싸게 연다", "빈칸은 채웠다. 시급은 내려갔다."],
    ["switch", "성인 대상(자격증·회화) 수업을 연다", ["직장인 수강생이 들어왔다. 방학이 없다.", "성인반은 모이지 않았다."], "career"],
    ["hold", "방학이 끝나길 기다린다", "개학하자 돌아왔다. 다 돌아오진 않았다."],
  ] },
  { id: "tu_exam", job: "tutoring", g: true, v: 0.15, m: [4, 6], n: "입시 제도 개편 발표", text: "입시 제도가 바뀐다는 발표가 났다. 학부모들이 불안하다. '바뀐 제도 아는 선생님' 문의가 몰린다.", ch: [
    ["ride", "개편 설명회를 연다", "설명회가 꽉 찼다. 상담이 수업으로 이어졌다."],
    ["steady", "하던 대로 받는다", "문의가 조금 늘었다."],
    ["save", "불안을 팔지 않는다", "학부모들이 그 차분함을 믿었다."],
  ] },
  // ───── 타로 ─────
  { id: "ta_ai", job: "tarot", g: false, v: -0.18, m: [6, 10], w: (s) => (s.era?.ai ? 2 : 1), n: "AI 운세 앱이 떴다", text: "'AI 타로, 하루 한 번 무료' 앱이 순위 1위다. 손님이 물었다. \"앱이랑 뭐가 달라요?\"", ch: [
    ["price", "짧은 저가 상담을 만든다", "가볍게 오는 손님은 잡았다. 단가는 낮다."],
    ["switch", "AI가 못 하는 대면 '깊은 상담'으로 간다", ["눈을 보고 듣는 상담에 손님이 다시 왔다.", "깊은 상담은 비싸다는 말만 들었다."], "talk"],
    ["hold", "내 방식대로 본다", "앱을 써 본 손님들이 결국 돌아왔다. 시간이 걸렸다."],
  ] },
  { id: "ta_fee", job: "tarot", g: false, v: -0.14, m: [8, 12], n: "상담 플랫폼 수수료 인상", text: "전화 상담 플랫폼이 수수료를 올렸다. 같은 상담에 남는 돈이 줄었다.", ch: [
    ["price", "상담료를 조금 올린다", "단골은 남았다. 새 손님은 조금 줄었다."],
    ["switch", "단골을 개인 예약으로 옮긴다", ["단골 절반이 개인 예약으로 왔다. 수수료가 없다.", "단골들이 귀찮아했다."], "talk"],
    ["hold", "감수한다", "남는 게 줄었다."],
  ] },
  { id: "ta_ny", job: "tarot", g: true, v: 0.18, m: [2, 3], need: (s) => [11, 12].includes(s.cal), n: "신년 운세 대목", text: "연말이다. '내년 운세' 예약이 밀려든다. 일 년 중 제일 바쁜 두 달이 왔다.", ch: [
    ["ride", "주말 부스를 하나 더 연다", "줄이 섰다. 목이 쉬었다."],
    ["steady", "하던 대로 본다", "평소보다 잘 벌었다."],
    ["save", "무리하지 않는다", "새해를 건강하게 맞았다."],
  ] },
  // ───── 바이브코딩 ─────
  { id: "vb_ai", job: "vibe", g: false, v: -0.2, m: [8, 12], w: (s) => (s.era?.ai ? 2 : 1), n: "AI 코딩 툴 대중화, 단가 하락", text: "새 AI 코딩 툴이 무료로 풀렸다. 고객사가 말한다. \"요즘 이 정도는 저희가 직접 해도 된다던데요?\" 견적이 30% 깎였다.", ch: [
    ["price", "단가를 내리고 건수로 버틴다", "건수는 늘었다. 몸이 힘들다."],
    ["switch", "툴을 먼저 익혀 '빠른 납품'으로 판다", ["사흘 걸리던 일을 하루에 끝냈다. 단가는 깎여도 시급은 올랐다.", "새 툴이 낯설어 오히려 늦었다."], "num"],
    ["hold", "유지보수·책임감으로 승부한다", "\"그래도 맡길 사람이 있어야죠.\" 일부는 돌아왔다."],
  ] },
  { id: "vb_fee", job: "vibe", g: false, v: -0.13, m: [8, 12], n: "외주 중개 수수료 인상", text: "외주 중개 플랫폼이 수수료를 올렸다. 계약 하나에 떼이는 돈이 늘었다.", ch: [
    ["price", "견적에 수수료를 얹는다", "고객 몇은 떠났다. 남는 건 지켰다."],
    ["switch", "지난 고객에게 직접 연락한다", ["재계약 두 건이 직접 들어왔다.", "답장이 없었다."], "talk"],
    ["hold", "감수한다", "남는 게 줄었다."],
  ] },
  { id: "vb_gov", job: "vibe", g: true, v: 0.18, m: [4, 6], n: "소상공인 디지털 전환 지원금", text: "정부가 소상공인 홈페이지·예약 시스템 제작비를 지원한다. 동네 가게 사장님들 문의가 줄을 잇는다.", ch: [
    ["ride", "동네 가게용 묶음 상품을 만든다", "한 달에 다섯 곳. 손가락이 쉬지 않았다."],
    ["steady", "들어오는 것만 받는다", "조금 더 벌었다."],
    ["save", "서류가 복잡해 몇 건만 받는다", "무리하지 않았다."],
  ] },
];
const BY_ID = Object.fromEntries(MK_EV.map((e) => [e.id, e]));

function st(s) { if (!s.mk) s.mk = { evT: -99, seen: {}, list: [] }; return s.mk; }
// 그 투잡의 지금 시장 배수 합(음수 = 손해)
export function netOf(s, job) { const V = s.mk; if (!V) return 0; let n = 0; for (const x of V.list) if (x.job === job && x.until > s.t) n += x.v; return clamp(n, MK_BAL.lo, MK_BAL.hi); }
export function activeOf(s, job) { return (s.mk?.list || []).filter((x) => x.job === job && x.until > s.t); }
const jobsOf = (e) => (Array.isArray(e.job) ? e.job : [e.job]);
function okEv(s, e, job) {
  if (!isOn(s, job)) return false;
  if (!e.g && hitByEra(s, job)) return false; // 시대 사건이 이미 깎는 중
  if (activeOf(s, job).length) return false; // 한 투잡에 한 번에 하나
  if (st(s).seen[e.id] !== undefined && s.t - st(s).seen[e.id] < MK_BAL.again) return false;
  const P = s.sj?.rp?.[job]; if (!P || P.t0 === undefined || s.t - P.t0 < 3) return false; // 영업 시작 석 달 뒤부터
  return !e.need || e.need(s);
}

// ── 매달 ──
export function marketMonth(s, r, notes, scenes) {
  const V = st(s);
  // 1) 지금 걸린 충격을 돈으로
  for (const job of s.sj?.active || []) {
    const mk = netOf(s, job), cut = sideCut(s, job); if (!mk && !cut) continue;
    const prof = profitOf(s, job); if (!(prof > 0)) continue;
    const h = s.rv?.hit?.[job], rv = h && h.t === s.t ? h.net || 0 : 0;
    const amt = Math.round(prof * (1 + rv) * Math.abs(mk));
    if (amt > 0) { if (mk < 0) { s.cash -= amt; addMoney(s, "exp", MK_LABEL, amt); } else { s.cash += amt; addMoney(s, "inc", MK_LABEL, amt); } }
    // 투잡 부대비용(defs SIDE_CUT): 라이벌·시장까지 반영한 남은 이익에 곱한다(곱셈으로 이어져 겹치지 않음)
    const c2 = Math.round(prof * (1 + rv) * (1 + mk) * cut);
    if (c2 > 0) { s.cash -= c2; addMoney(s, "exp", CUT_LABEL, c2); } else if (c2 < 0) { s.cash -= c2; addMoney(s, "inc", CRUISE_LABEL, -c2); }
  }
  // 2) 끝난 충격 정리 · 버틴 사람은 반등
  const done = V.list.filter((x) => x.until <= s.t && !x.over);
  for (const x of done) {
    x.over = true;
    const nm = D.SIDEJOBS[x.job]?.n || x.job;
    if (x.hold && x.v < 0) { V.list.push({ id: x.id + "_rb", job: x.job, v: MK_BAL.rebound[0], until: s.t + MK_BAL.rebound[1], n: "버틴 보람", rb: true }); notes.push(`시장: ${nm} '${x.n}' 끝 · 버틴 보람(이익 +${pct(MK_BAL.rebound[0])} · ${MK_BAL.rebound[1]}개월)`); }
    else if (!x.rb) notes.push(`시장: ${nm} '${x.n}' 영향이 끝났다`);
  }
  V.list = V.list.filter((x) => x.until > s.t - 1 || !x.over).slice(-12);
  // 3) 새 충격(한 달 최대 1개, 다른 사건과 안 겹치게)
  if (scenes.some((x) => x.kind === "event") || s.t - V.evT < MK_BAL.gap) return;
  const pool = [];
  for (const e of MK_EV) for (const job of jobsOf(e)) if (okEv(s, e, job)) pool.push({ e, job, w: (typeof e.w === "function" ? e.w(s) : e.w || 1) * (e.g ? 0.6 : 1) });
  if (!pool.length || !r.chance(MK_BAL.chance)) return;
  const tot = pool.reduce((a, x) => a + x.w, 0); let v = r.next() * tot, pk = pool[0];
  for (const x of pool) { v -= x.w; if (v <= 0) { pk = x; break; } }
  V.evT = s.t; V.seen[pk.e.id] = s.t;
  scenes.push(evScene(s, r, pk.e, pk.job));
}

function evScene(s, r, e, job) {
  const mo = r.int(e.m[0], e.m[1]), nm = D.SIDEJOBS[job]?.n || job;
  const choices = e.ch.map(([k, t, res, stat, cost]) => {
    if (k === "switch") return { t, check: { stat, dc: 48 }, ok: { text: res[0], eff: { mental: 2, stat: { [stat]: 1 } } }, ng: { text: res[1], eff: { mental: -3 } } };
    const eff = k === "spend" ? { cash: -M(s, cost || 40) } : k === "price" ? { mental: -1 } : k === "hold" ? { mental: -2 } : k === "ride" ? { hp: -5, mental: -1 } : k === "save" ? { mental: 2 } : {};
    return { t: k === "spend" ? `${t} (${M(s, cost || 40)}만 원)` : t, eff, text: res };
  });
  return { kind: "event", tag: "시장", title: `시장 ${e.g ? "호재" : "충격"} · ${e.n}`, text: `${e.text}\n(${nm} 이익 ${sgn(e.v)}${pct(e.v)} · 약 ${mo}개월. 고르는 대응에 따라 달라져요)`, onChoose: "mk_ev", mk: e.id, mkJob: job, mkMo: mo, choices };
}

export const MK_CHOOSE = {
  mk_ev(s, r, i, okv, sc) {
    const e = BY_ID[sc?.mk]; if (!e) return [];
    const c = e.ch[i]; if (!c) return [];
    const k = c[0], V = st(s), job = sc.mkJob || jobsOf(e)[0];
    let f = F[k] ?? 1, mo = sc.mkMo || e.m[0];
    if (k === "switch") { if (okv) { f = 0.4; mo = Math.max(1, Math.round(mo * 0.7)); } else f = 1.15; }
    const v = Math.round(e.v * f * 1000) / 1000;
    V.list.push({ id: e.id, job, v, until: s.t + mo, n: e.n, hold: k === "hold" }); // 고르는 달부터 mo달
    const out = [`${D.SIDEJOBS[job]?.n || job} 이익 ${sgn(v)}${pct(v)} · ${mo}개월`];
    if (e.era) for (const [ek, em] of Object.entries(e.era)) { if (!s.era[ek]) { s.era[ek] = em; if (ek === "rate") out.push(`금리 시대 ${em}개월(대출 이자 +2%p)`); } }
    if (k === "hold" && v < 0) out.push("버티면 끝난 뒤 반등");
    log(s, `[시장] ${e.n} (${D.SIDEJOBS[job]?.n || job})`, "work");
    return out;
  },
};

// 보드 칸용: 지금 걸린 충격 목록
export function boardInfo(s, job) {
  const L = activeOf(s, job); if (!L.length) return null;
  return { net: netOf(s, job), list: L.map((x) => ({ n: x.n, v: x.v, left: x.until - s.t })) };
}
// 시험용: 그 투잡에 충격을 바로 건다
export function marketDemo(s, job, id) { const e = id ? BY_ID[id] : MK_EV.find((x) => jobsOf(x).includes(job) && !x.g); if (!e) return; st(s).list.push({ id: e.id, job, v: e.v * 0.55, until: s.t + 6, n: e.n }); }
void jo;
// 시험용: 장면을 바로 만든다(조건 무시)
export function mkScene(s, r, id, job) { const e = BY_ID[id]; return e ? evScene(s, r, e, job || jobsOf(e)[0]) : null; }
