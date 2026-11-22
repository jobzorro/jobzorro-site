// 라이벌 제도(v4.25). 투잡을 시작하고 몇 달 뒤, 같은 동네·같은 판에 경쟁자가 나타난다(안 나올 수도 있다).
// core.js endMonth 에서 투잡 월 처리 뒤 rivalMonth(s, r, notes, scenes) 를 부른다. onChoose 이름은 "rv_" 로 시작(RV_CHOOSE).
// 압박: 그 투잡의 이번 달 이익 × (라이벌 압박 합 − 반사이익) → 장부 "라이벌 경쟁"(지출) / "라이벌 반사이익"(수입). 순 −33% ~ +15%(v4.25b 1.5배).
// 상태: s.rv = { since, ema, cap, lastT, evT, seen, mod, hit, list:[{ id, job, n, d, kind, sk, pc, p, st, t, rel, fr, war }] }
//   kind "price"(가격형: 가격 경쟁) | "skill"(실력형: 손님을 뺏는다), st "on"(경쟁 중) | "ally"(협업) | "gone"(떠남), fr 친구
// 난수는 r 만. 화보는 gen/cg.js 에 그림이 있을 때만(sc.cine).
import * as D from "./defs.js";
import * as REG from "./reg.js";
import * as SYN from "./syn.js";
import { jo, won, addMoney, log, CHAR, ensureRel } from "./core.js";
// v4.29 → 11-23 선배 = 라이벌 한 사람. 투잡마다 '찾아가는 선배'(sj.js ENTRY.who)가 몇 년 뒤 같은 판에 가게·계정을 내고 돌아온다(SENIOR_RIVAL 의 라이벌 칸).
//   찾아간 적 있으면(선배 찾아가기 1번 이상) "내가 커피를 사며 배우던 선배", 없으면 "소문으로만 듣던 선배"로 글이 갈린다(RIVALS 항목의 sr.a / sr.b).
//   찾아간 적 있으면 '선배에게 먼저 연락한다' 선택지가 생긴다(친구로 시작). 배우자·연인이면 후보에서 뺀다.
//   in_cheap·uc_roast·ch_craft 는 선배가 아닌, 얼굴 있는 라이벌(아는 사이면 등장 글 한 줄이 달라진다).
export const SENIOR_RIVAL = { pr: "pr_new", cs: "cs_hr", insta: "in_rise", airbnb: "ab_next", ucafe: "uc_cheap", chicken: "ch_other", tarot: "ta_saju", webnovel: "wn_rook", tutoring: "tu_elite", vibe: "vb_cheap" };
export const RIVAL_WHO = { pr_new: "c094", cs_hr: "c030", in_rise: "c071", in_cheap: "c076", ab_next: "c049", uc_cheap: "c081", uc_roast: "c014", ch_other: "c120", ch_craft: "c066", ta_saju: "c121", wn_rook: "c122", tu_elite: "c123", vb_cheap: "c064" };
const BANMAL = new Set(["c094", "c049"]); // 반말하는 선배(석주원·예소라)
const whoOk = (s, w) => !!w && !!CHAR[w] && !s.rel?.[w]?.spouse && !s.rel?.[w]?.lover;
import { CG } from "../gen/cg.js";
import { rivalReward } from "./cards.js"; // 라이벌 승부 보상 장비(v4.25 아이템)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const M = (s, x) => Math.max(1, Math.round(x * SYN.pi(s) / 5) * 5); // 만원, 물가 반영
const I = (w) => jo(w, "이", "가"), U = (w) => jo(w, "은", "는"), L = (w) => jo(w, "을", "를"), W_ = (w) => jo(w, "과", "와"), RO = (w) => jo(w, "으로", "로");
const cine = (k) => (CG[k]?.length ? k : undefined);
const pct = (x) => `${Math.round(x * 100)}%`;
const P_QUIET = 0.3; // 이 확률로 그 투잡엔 라이벌이 안 나온다(조용한 상권)
const AFTER = 4; // 시작하고 이만큼 지나야 나온다(달)
const P_APPEAR = 0.05, GAP_APPEAR = 6;
// v4.25b: 압박 1.5배(P_MUL, 1명당 압박 = 표의 p × 1.5), 한 달 하한 −22% → −33%, 이벤트로 바뀌는 압박 범위 2~14% → 3~21%
export const P_MUL = 1.2; // v4.27 1.5 → 1.2
const P_EV = 0.2, GAP_EV = 3, NET_LO = -0.27, NET_HI = 0.15, ALLY_BONUS = 0.03, P_MIN = 0.03, P_MAX = 0.21;

// ── 투잡별 낱말: c 손님, i 상품, sh 가게, st 같이 일하는 사람, rv 후기, sup 거래처, acc 사고, fee 오르는 비용, q 품질 능력치 ──
//   11-23: ow 라이벌을 부르는 말(사장님·코치님·작가님…), 온라인 투잡은 pl 그 판(소문이 도는 곳), gone 접었을 때 보이는 것, sale 값 내릴 때 쓰는 말
export const ONLINE = (job) => !D.SJ_SPACE.includes(job); // 가게 없이 하는 투잡: 라이벌 사건을 그 판의 일(순위·저격·덤핑·베끼기·메인 노출)로 바꿔 보여 준다
export const WORDS = {
  pr: { c: "손님", i: "대관", sh: "파티룸", st: "청소 매니저", rv: "후기", sup: "청소 업체", acc: "위생 민원", fee: "건물 관리비", q: "sense", ow: "사장님" },
  cs: { c: "고객", i: "첨삭", sh: "컨설팅", st: "공동 코치", rv: "후기", sup: "강의 의뢰처", acc: "환불 대란", fee: "플랫폼 수수료", q: "write", ow: "코치님", pl: "취준 커뮤니티", gone: "판매 페이지에 '판매 중지'가 떴다", sale: "시즌 할인" },
  insta: { c: "팔로워", i: "콘텐츠", sh: "계정", st: "편집 알바", rv: "댓글", sup: "협찬 업체", acc: "뒷광고 논란", fee: "광고 대행 수수료", q: "sense", ow: "운영자", pl: "댓글 창", gone: "계정이 마지막 게시물에서 멈췄다", sale: "협찬 공개" },
  airbnb: { c: "게스트", i: "숙박", sh: "숙소", st: "청소 매니저", rv: "후기", sup: "세탁 업체", acc: "벌레 후기 대란", fee: "플랫폼 수수료", q: "sense", ow: "호스트님" },
  ucafe: { c: "손님", i: "커피", sh: "카페", st: "관리 알바", rv: "리뷰", sup: "원두 업체", acc: "위생 점검 적발", fee: "월세", q: "hands", ow: "사장님" },
  chicken: { c: "손님", i: "치킨", sh: "가게", st: "주방 알바", rv: "리뷰", sup: "닭 공급처", acc: "위생 점검 적발", fee: "배달 앱 수수료", q: "hands", ow: "사장님" },
  tutoring: { c: "학생", i: "수업", sh: "과외", st: "보조 강사", rv: "후기", sup: "교재 업체", acc: "환불 분쟁", fee: "중개 수수료", q: "career", ow: "선생님", pl: "학부모 단톡방", gone: "프로필이 '모집 마감'으로 바뀐 채 내려갔다", sale: "모집 기간" },
  tarot: { c: "손님", i: "상담", sh: "상담 페이지", st: "보조 리더", rv: "후기", sup: "행사 대행사", acc: "과장 광고 신고", fee: "재능장터 수수료", q: "talk", ow: "선생님", pl: "상담 후기 게시판", gone: "상담 페이지가 '휴업'으로 바뀌었다", sale: "할인 이벤트" },
  webnovel: { c: "독자", i: "연재", sh: "작품", st: "표지 작가", rv: "댓글", sup: "담당 편집자", acc: "표절 논란", fee: "플랫폼 수수료", q: "write", ow: "작가님", pl: "독자 게시판", gone: "작품에 '연재 중단' 공지가 올라왔다", sale: "기획전" },
  vibe: { c: "고객사", i: "외주", sh: "포트폴리오", st: "하청 개발자", rv: "평가", sup: "외주 중개 담당자", acc: "납기 사고", fee: "중개 수수료", q: "num", ow: "대표님", pl: "사장님 카페", gone: "프로필에 '의뢰 받지 않음'이 떴다", sale: "프로모션" },
};

// ── 투잡별 라이벌 후보: n 이름, d 한 줄 소개, kind, sk 실력 범위, pc 가격(내 가격 = 100), p 압박, intro 첫 등장 ──
//   11-23: sr 선배가 이 라이벌로 돌아올 때 글(n·d 덮어쓰기, a 찾아간 적 있음 / b 소문으로만 들음, say 선배의 한마디), ow 호칭 덮어쓰기(""면 이름만), bot 사람이 아닌 서비스(술 한잔·새벽 같은 사건 제외)
export const RIVALS = {
  pr: { max: 3, list: [
    { id: "pr_2f", n: "별빛살롱", d: "같은 건물 2층 파티룸", kind: "price", sk: [35, 50], pc: 75, p: 0.09, intro: "같은 건물 2층에 파티룸이 생겼다. 엘리베이터 거울에 전단이 붙었다. '오픈 기념 25% 할인'. 내 손님이 그 전단을 사진으로 찍어 갔다." },
    { id: "pr_new", n: "스튜디오 오늘", d: "5분 거리 신축 파티룸", kind: "skill", sk: [50, 65], pc: 120, p: 0.08, intro: "5분 거리에 신축 파티룸이 문을 열었다. 통창, 대형 빔, 포토존 세 개. 사진만 봐도 손님들 눈이 돌아간다.",
      sr: { d: "선배의 네 번째 파티룸", a: "석주원 선배의 네 번째 방이 내 가게에서 5분 거리에 문을 열었다. 통창, 대형 빔, 포토존 세 개. 내가 커피를 사며 받아 적은 그 체크리스트 그대로다. 문자가 왔다. \"자리가 나서 들어왔어. 미안하단 말은 안 할게.\"", b: "파티룸 세 곳을 돌린다고 소문으로만 듣던 석주원. 그 사람이 네 번째 방을 냈다. 내 가게에서 5분 거리다. 통창, 대형 빔, 포토존 세 개. 사진만 봐도 손님들 눈이 돌아간다." } },
    { id: "pr_big", n: "파티팩토리", d: "역 앞 대형 파티룸", kind: "price", sk: [40, 55], pc: 70, p: 0.1, intro: "역 앞에 방이 열두 개인 대형 파티룸이 들어왔다. 평일 1시간 9,900원. 그 가격이 어떻게 나오는지 계산이 안 된다." },
  ] },
  cs: { max: 3, list: [
    { id: "cs_fac", n: "오만원 첨삭소", d: "저가 첨삭 공장", ow: "대표", kind: "price", sk: [30, 45], pc: 50, p: 0.09, intro: "'자소서 첨삭 5만 원, 24시간 완료' 광고가 내 광고 바로 위에 떴다. 첨삭하는 사람이 열 명, 후기가 천 개다." },
    { id: "cs_hr", n: "서류의 눈", d: "대기업 인사팀 출신 코치", kind: "skill", sk: [55, 72], pc: 160, p: 0.08, intro: "'인사팀에서 서류 만 장을 본 눈'. 대기업 인사팀 출신 코치가 같은 판에 들어왔다. 가격은 내 두 배 가까운데 예약이 찬다.",
      sr: { d: "커리어 너튜버가 연 1:1 서류 코칭", a: "진아영 선배가 영상 설명란에 링크를 걸었다. '1:1 서류 코칭 정식 오픈, 서류의 눈'. 알음알음 봐 주던 걸 이제 간판을 걸고 판다. 내가 커피를 사며 들은 말, \"회사 이름이 곧 신뢰예요\"가 상품 소개 첫 줄이 됐다. 가격은 내 두 배 가까운데 구독자들이 예약을 채운다.", b: "영상으로만 보던 커리어 너튜버 진아영이 코칭 간판을 걸었다. 이름은 '서류의 눈'. '인사팀에서 서류 만 장을 본 사람'이라는 소개 한 줄에, 내 두 배 가까운 가격인데도 예약이 찬다." } },
    { id: "cs_ai", n: "AI 자소서 99", d: "AI 자동 첨삭 서비스", ow: "운영팀", bot: true, kind: "price", sk: [25, 40], pc: 20, p: 0.07, intro: "'AI가 3분 만에 자소서 완성, 월 9,900원' 광고가 취준생 커뮤니티를 덮었다. 고객 한 명이 물었다. \"이거랑 뭐가 달라요?\"" },
  ] },
  insta: { max: 2, list: [
    { id: "in_rise", n: "먹방요정", d: "같은 분야 급성장 계정", kind: "skill", sk: [45, 62], pc: 100, p: 0.08, intro: "같은 분야에서 팔로워가 한 달 만에 두 배가 된 계정이 있다. 내가 올린 장소에 그 계정이 사흘 뒤 다녀갔다. 좋아요는 그쪽이 세 배.",
      sr: { n: "만원밥상", d: "너튜브 8만이 넘어온 인별 계정", a: "송한결 선배가 인별을 시작했다. 계정 이름은 '만원밥상'. 너튜브 구독자 8만이 그대로 넘어왔고, 요리만 하던 사람이 내 분야까지 올린다. 커피를 사며 들은 말 그대로다. 장비는 폰 하나, 대신 하루도 안 거른다. 내가 다녀온 곳에 사흘 뒤 선배 릴스가 떴다. 좋아요는 그쪽이 세 배.", b: "이름만 알던 자취요리 너튜버 송한결이 인별을 시작했다. 계정 이름은 '만원밥상'. 구독자 8만이 그대로 넘어왔고, 요리만 하던 사람이 내 분야까지 올린다. 내가 다녀온 곳에 사흘 뒤 그 계정 릴스가 떴다. 좋아요는 그쪽이 세 배." } },
    { id: "in_cheap", n: "오늘도리뷰", d: "협찬 단가 후려치는 계정", kind: "price", sk: [30, 45], pc: 50, p: 0.08, intro: "협찬 담당자가 말했다. \"다른 계정은 절반 가격에 해 준다던데요?\" 이름을 들어 보니 오늘도리뷰다." },
  ] },
  airbnb: { max: 2, list: [
    { id: "ab_next", n: "골목스테이", d: "옆 골목 신축 숙소", kind: "skill", sk: [45, 62], pc: 115, p: 0.08, intro: "옆 골목에 신축 숙소가 올라갔다. 루프탑 자쿠지에 한옥 창. 내 숙소 상세 페이지 바로 아래 '비슷한 숙소'로 뜬다.",
      sr: { d: "선배가 경매로 낙찰받은 네 번째 숙소", a: "예소라 선배가 옆 골목 빌라를 경매로 낙찰받았다. 네 번째 숙소다. 루프탑 자쿠지에 한옥 창. 소개 글 첫 줄에 영업신고 번호가 박혀 있다. 내가 커피를 사며 배운 그대로다. 내 숙소 상세 페이지 바로 아래 '비슷한 숙소'로 뜬다. 문자가 왔다. \"물건이 좋아서 어쩔 수 없었어.\"", b: "경매로 집을 모아 숙소를 돌린다는 예소라. 소문으로만 듣던 그 사람이 옆 골목 빌라를 낙찰받았다. 루프탑 자쿠지에 한옥 창. 내 숙소 상세 페이지 바로 아래 '비슷한 숙소'로 뜬다." } },
    { id: "ab_mass", n: "스테이백", d: "숙소 100채 관리업체", ow: "담당자", kind: "price", sk: [35, 50], pc: 80, p: 0.09, intro: "숙소 100채를 굴리는 관리업체가 동네에 들어왔다. 1박이 내 것보다 2만 원 싸다. 청소는 공장처럼 돌린다." },
  ] },
  ucafe: { max: 2, list: [
    { id: "uc_cheap", n: "천원커피", d: "맞은편 저가 커피", kind: "price", sk: [35, 50], pc: 60, p: 0.1, intro: "맞은편에 저가 커피가 생겼다. 아메리카노 천오백 원. 출근길 줄이 그쪽으로 섰다.",
      sr: { d: "선배의 무인카페 3호점", a: "염동규 선배가 무인카페 3호점을 냈다. 하필 내 매장 맞은편이다. 편의점 물류에 얹어 원가를 깎았다며 아메리카노가 천오백 원. 커피를 사며 손익분기 숫자까지 받아 적던 그 선배다. 출근길 줄이 그쪽으로 섰다.", b: "편의점을 하면서 무인카페 두 곳을 돌린다던 염동규. 말로만 듣던 그 사람이 3호점을 내 매장 맞은편에 냈다. 편의점 물류에 얹어 아메리카노가 천오백 원. 출근길 줄이 그쪽으로 섰다." } },
    { id: "uc_roast", n: "로스터리 숨", d: "골목 개인 로스터리", kind: "skill", sk: [50, 66], pc: 140, p: 0.07, intro: "골목 안쪽에 개인 로스터리 카페가 열었다. 원두 볶는 냄새가 큰길까지 나온다. 커피 좀 아는 손님들이 그쪽으로 간다." },
  ] },
  chicken: { max: 2, list: [
    { id: "ch_other", n: "바삭왕 치킨", d: "길 건너 다른 브랜드", kind: "price", sk: [40, 55], pc: 85, p: 0.1, intro: "길 건너에 다른 브랜드 치킨집이 오픈했다. '오픈 기념 한 마리 값에 두 마리'. 배달 앱 순위가 하룻밤 새 밀렸다.",
      sr: { d: "선배가 간판을 바꿔 연 길 건너 가게", a: "주성택 선배가 6년 걸던 간판을 내렸다. 가맹 계약이 끝나자마자 다른 브랜드로 갈아타 내 가게 길 건너에 열었다. \"정보공개서는 끝까지 읽어요.\" 커피를 사며 그 말을 받아 적었다. 간판이 다르면 영업지역 조항도 못 막는다는 건 그때 못 들었다. '오픈 기념 한 마리 값에 두 마리'. 배달 앱 순위가 하룻밤 새 밀렸다.", b: "치킨집 6년 차, 이 바닥에서 이름만 듣던 주성택. 그 사람이 간판을 바꿔 내 가게 길 건너에 열었다. 간판이 다르니 영업지역 조항도 못 막는다. '오픈 기념 한 마리 값에 두 마리'. 배달 앱 순위가 하룻밤 새 밀렸다." } },
    { id: "ch_craft", n: "닭장인", d: "동네 수제 치킨집", kind: "skill", sk: [52, 68], pc: 115, p: 0.08, intro: "사장님이 직접 염지하는 수제 치킨집이 동네에 생겼다. 동네 커뮤니티에 '여기 진짜 맛집' 글이 하루 세 개씩 올라온다." },
  ] },
  tutoring: { max: 2, list: [
    { id: "tu_elite", n: "명문대생 쌤", d: "명문대생 과외", ow: "", kind: "skill", sk: [52, 68], pc: 90, p: 0.08, intro: "학부모 단톡방에 명문대생 과외 공고가 돌았다. '전 과목 1등급, 시범 수업 무료'. 내 학생 어머님도 그 공고를 봤다.",
      sr: { n: "채운쌤 소그룹반", d: "5년 차 선생님의 소그룹반", a: "명채운 선배가 소그룹반을 열었다. 네 명 한 반, 한 사람 수업료는 내 1:1보다 싸다. \"메시지 200통에 한 건이에요.\" 커피를 사며 그 말을 받아 적었는데, 선배는 이제 메시지를 안 보낸다. 대기 명단에서 네 명을 뽑는다. 공고가 내 학생 어머님 단톡방에도 돌았다.", b: "화상과외 5년 차, 대기 명단이 있다는 명채운 선생님. 말로만 듣던 그 사람이 소그룹반을 열었다. 네 명 한 반, 한 사람 수업료는 내 1:1보다 싸다. 공고가 내 학생 어머님 단톡방에도 돌았다." } },
    { id: "tu_app", n: "1분 질문 앱", d: "문제풀이 앱", ow: "운영사", bot: true, kind: "price", sk: [30, 45], pc: 30, p: 0.07, intro: "'질문 하나에 1분, 월 1만 원' 문제풀이 앱이 학교에 퍼졌다. 학생이 물었다. \"쌤, 앱이 더 빠르던데요?\"" },
  ] },
  tarot: { max: 2, list: [
    { id: "ta_saju", n: "달빛사주", d: "타로에 사주를 얹어 파는 상담사", kind: "price", sk: [38, 52], pc: 70, p: 0.09, intro: "재능장터 타로 목록 맨 위에 새 상품이 올라왔다. '타로+사주 세트 만 원'. 내 상담 페이지를 보던 손님이 그쪽 세트로 넘어갔다.",
      sr: { d: "선배가 사주를 얹어 연 세트 상담", a: "배다솜 선배가 사주를 얹었다. 이름은 '달빛사주', '타로+사주 세트 만 원'. \"카드 뜻보다 상담이 본업이에요.\" 커피를 사며 그 말을 받아 적었는데, 선배의 다음 수는 사주였다. 내 상담 페이지를 보던 손님이 그쪽 세트로 넘어간다.", b: "플리마켓에서 줄을 세운다는 타로 리더 배다솜. 소문으로만 듣던 그 사람이 '달빛사주'라는 이름으로 '타로+사주 세트 만 원'을 올렸다. 내 상담 페이지를 보던 손님이 그쪽 세트로 넘어간다." } },
    { id: "ta_tv", n: "방송 나온 타로 마스터", d: "예능 출연 타로 마스터", ow: "", kind: "skill", sk: [55, 70], pc: 180, p: 0.08, intro: "예능에 나온 타로 마스터가 온라인 상담을 열었다. 예약 대기 석 달. 손님들이 \"거기 예약이 안 잡혀서 왔어요\"라고 한다." },
  ] },
  webnovel: { max: 2, list: [
    { id: "wn_rook", n: "폭주작가", d: "같은 장르 하루 3연재 신인", ow: "", kind: "skill", sk: [48, 65], pc: 100, p: 0.08, intro: "같은 장르에 하루 세 편씩 올리는 신인이 나타났다. 내 작품 바로 위로 순위가 오른다. 댓글창엔 '이 작가 미쳤다'.",
      sr: { n: "새벽네시", d: "완결 3편 작가의 새 연재", a: "류시온 선배가 네 번째 작품을 시작했다. 하필 내 장르, 내 연재 요일이다. 필명은 '새벽네시'. \"10화도 못 채우고 그만두는 사람이 열에 일곱이에요.\" 커피를 사며 그 말을 듣던 내가 이제 선배와 같은 순위표에 있다. 선배는 비축분 60화를 하루 세 편씩 푼다. 내 작품 바로 위로 순위가 오른다.", b: "완결만 세 편이라는 류시온. 이름만 알던 그 작가가 필명 '새벽네시'로 내 장르에 신작을 냈다. 비축분 60화를 하루 세 편씩 푼다. 내 작품 바로 위로 순위가 오른다. 댓글창엔 '역시 완결 작가'." } },
    { id: "wn_mass", n: "양산 연재 계정", d: "AI로 찍어 내는 무료 연재", ow: "", bot: true, kind: "price", sk: [25, 42], pc: 40, p: 0.07, intro: "제목만 바꾼 비슷한 작품이 하루 열 개씩 올라온다. 무료 회차를 끝없이 풀어 독자를 쓸어 간다." },
  ] },
  vibe: { max: 2, list: [
    { id: "vb_cheap", n: "만원코딩", d: "저가 외주 팀", kind: "price", sk: [35, 50], pc: 45, p: 0.09, intro: "견적 비교 사이트에 '홈페이지 30만 원, 3일 완성' 팀이 올라왔다. 내 견적서를 받아 간 고객이 그쪽과 계약했다.",
      sr: { d: "선배가 후배 둘과 꾸린 저가 외주 팀", a: "정하람 선배가 주말 외주를 팀으로 키웠다. 이름은 '만원코딩'. 후배 둘을 붙여 '홈페이지 30만 원, 3일 완성'. \"첫 의뢰는 30만 원짜리예요.\" 커피를 사며 들은 그 가격이 그대로 상품이 됐다. 내 견적서를 받아 간 고객이 그쪽과 계약했다.", b: "주말마다 외주를 뛴다는 판교 개발자 정하람. 소문으로만 듣던 그 사람이 팀을 꾸렸다. 이름은 '만원코딩', '홈페이지 30만 원, 3일 완성'. 내 견적서를 받아 간 고객이 그쪽과 계약했다." } },
    { id: "vb_pro", n: "10년 차 개발자", d: "개발자 출신 프리랜서", ow: "", kind: "skill", sk: [55, 72], pc: 150, p: 0.08, intro: "10년 차 개발자가 같은 플랫폼에 들어왔다. 포트폴리오가 화려하다. '유지보수까지 평생 책임' 문구에 고객이 몰린다." },
  ] },
};
export const KIND_N = { price: "가격형", skill: "실력형" };
export const ST_N = { on: "경쟁 중", ally: "협업", gone: "떠남" };

// ── 상태 ──
function st(s) { if (!s.rv) s.rv = { since: {}, ema: {}, cap: {}, lastT: {}, evT: -99, seen: {}, mod: {}, hit: {}, list: [] }; return s.rv; }
const isOn = (s, job) => !!s.sj?.active?.includes(job);
const here = (s, x) => x.st !== "gone" && isOn(s, x.job);
export function rivalsOf(s, job) { return (s.rv?.list || []).filter((x) => x.job === job); }
// 그 투잡의 이번 달 순 압박(음수 = 손해, 양수 = 반사이익)
export function netOf(s, job) {
  const V = st(s); let n = 0;
  for (const x of V.list) if (x.job === job) { if (x.st === "on") n -= x.fr ? x.p / 2 : x.p; else if (x.st === "ally") n += ALLY_BONUS; }
  for (const m of V.mod[job] || []) if (m.until > s.t) n += m.v;
  return clamp(n, NET_LO, NET_HI);
}
// 이번 달 그 투잡 이익(장부에서)
const OLD = { pr: [["파티룸 매출"], ["파티룸 비용"]], cs: [["컨설팅", "VOD·전자책", "강의료"], ["컨설팅 광고·수수료"]], insta: [["인별 수익"], []], airbnb: [["에어씨앤씨 매출"], ["에어씨앤씨 비용"]], ucafe: [["무인카페 매출"], ["무인카페 비용"]] };
export function profitOf(s, job) {
  const Mo = s.month, sum = (o, ks) => ks.reduce((a, k) => a + (o[k] || 0), 0);
  if (OLD[job]) return sum(Mo.inc, OLD[job][0]) - sum(Mo.exp, OLD[job][1]);
  const P = REG.get(job); return P ? REG.sideOf(P, Mo, 0) : 0;
}
const story = (title, text, ck) => ({ kind: "story", tag: "라이벌", title, text, cine: ck, choices: [{ t: "계속", eff: {}, text: "" }] });

// ── 매달 ──
export function rivalMonth(s, r, notes, scenes) {
  const V = st(s);
  let busy = scenes.some((x) => x.kind === "event");
  for (const job of Object.keys(RIVALS)) {
    if (!isOn(s, job)) continue;
    if (V.since[job] === undefined) { V.since[job] = s.t; V.cap[job] = r.chance(P_QUIET) ? 0 : r.int(1, RIVALS[job].max); V.lastT[job] = -99; }
    const prof = profitOf(s, job);
    V.ema[job] = Math.round((V.ema[job] ?? prof) * 0.7 + prof * 0.3);
    // 압박·반사이익
    const net = netOf(s, job);
    if (net && prof > 0) {
      const amt = Math.round(prof * Math.abs(net));
      if (amt > 0) { if (net < 0) { s.cash -= amt; addMoney(s, "exp", "라이벌 경쟁", amt); } else { s.cash += amt; addMoney(s, "inc", "라이벌 반사이익", amt); } }
      V.hit[job] = { t: s.t, net, amt };
    } else V.hit[job] = { t: s.t, net, amt: 0 };
    // 실력은 해마다 조금씩 오른다
    if (s.cal === 12) for (const x of V.list) if (x.job === job && x.st !== "gone") x.sk = clamp(x.sk + r.int(1, 3), 0, 130);
    // 자연스레 떠나는 라이벌
    for (const x of V.list) if (x.job === job && x.st === "on" && s.t - x.t >= 12 && r.chance(x.kind === "price" ? 0.008 : 0.005)) {
      x.st = "gone"; addMod(s, job, 0.06, 4); notes.push(`라이벌 ${U(x.n)} 조용히 ${ONLINE(job) ? "판을 떠났다" : "문을 닫았다"}(반사이익 +6% · 4개월)`); log(s, `라이벌 ${x.n} ${ONLINE(job) ? "떠남" : "폐업"}`, "work");
    }
    // 등장
    const used = V.list.filter((x) => x.job === job).length;
    if (!busy && used < V.cap[job] && s.t - V.since[job] >= AFTER && (V.ema[job] || 0) >= 30 && s.t - V.lastT[job] >= GAP_APPEAR && r.chance(P_APPEAR)) {
      const cands = RIVALS[job].list.filter((d) => !V.list.some((x) => x.id === d.id) && !(RIVAL_WHO[d.id] && !whoOk(s, RIVAL_WHO[d.id])));
      if (cands.length) { const d = r.pick(cands); const x = spawn(s, r, job, d); V.lastT[job] = s.t; scenes.push(meetScene(s, x)); busy = true; }
    }
  }
  // 이벤트(한 달 최대 1개)
  if (busy || s.t - V.evT < GAP_EV) return;
  const pool = V.list.filter((x) => here(s, x));
  if (!pool.length || !r.chance(P_EV)) return;
  const x = r.pick(pool);
  const evs = EVS.filter((e) => okEv(s, e, x) && (V.seen[e.id] === undefined || s.t - V.seen[e.id] >= 12));
  if (!evs.length) return;
  const tot = evs.reduce((a, e) => a + (e.w || 1), 0); let v = r.next() * tot, e = evs[0];
  for (const c of evs) { v -= c.w || 1; if (v <= 0) { e = c; break; } }
  V.evT = s.t; V.seen[e.id] = s.t;
  scenes.push(evScene(s, e, x));
}
function spawn(s, r, job, d) {
  const yrs = Math.max(0, (s.t - (st(s).since[job] ?? s.t)) / 12);
  const x = { id: d.id, job, n: d.n, d: d.d, kind: d.kind, sk: Math.round(r.int(d.sk[0], d.sk[1]) + yrs * 2), pc: d.pc, p: +(d.p * P_MUL).toFixed(3), st: "on", t: s.t, rel: 0, fr: false, war: false };
  const w = RIVAL_WHO[d.id];
  if (whoOk(s, w)) { // 11-23 선배 = 라이벌: 선배 찾아가기를 한 번이라도 했으면 knew(내가 커피를 사며 배우던 선배), 아니면 소문으로만 듣던 선배
    x.who = w; x.met = !!s.rel[w];
    if (SENIOR_RIVAL[job] === d.id) { x.sen = true; x.knew = (s.sj?.rp?.[job]?.sen || 0) > 0; if (d.sr?.n) x.n = d.sr.n; if (d.sr?.d) x.d = d.sr.d; }
    if (!s.cast.includes(w)) s.cast.push(w); const q = ensureRel(s, w); q.rival = true;
  }
  st(s).list.push(x); log(s, `라이벌 등장: ${x.n}(${x.d})`, "work");
  return x;
}
function addMod(s, job, v, m) { const V = st(s); (V.mod[job] = (V.mod[job] || []).filter((x) => x.until > s.t)).push({ v, until: s.t + m }); }
const defOf = (x) => RIVALS[x.job]?.list.find((q) => q.id === x.id) || {};
// 라이벌을 부르는 말: 인물이 있으면 이름, 없으면 '가게·계정 이름 + 호칭'(사장님·코치님·작가님…)
export function callOf(x) { if (x.who && CHAR[x.who]) return CHAR[x.who].name; const ow = defOf(x).ow ?? WORDS[x.job]?.ow ?? ""; return ow ? `${x.n} ${ow}` : x.n; }
const HUMAN = new Set(["drink", "tired", "respect", "bench", "tip", "move", "united"]); // 사람이 아닌 서비스(bot)에는 안 나오는 사건
function okEv(s, e, x) {
  if (HUMAN.has(e.id) && defOf(x).bot) return false;
  if (e.need === "on" && x.st !== "on") return false;
  if (e.need === "ally" && x.st !== "ally" && !x.fr) return false;
  if (e.kind && x.kind !== e.kind) return false;
  return !e.ok || e.ok(s, x);
}

// ── 장면 ──
const C = (t, eff, text, x) => ({ t, eff, text, ...(x ? { x } : {}) });
const K = (t, stat, dd, ok, ng) => ({ t, check: { stat, dd }, ok, ng }); // dd: 라이벌 실력에 더할 값(장면 만들 때 dc 로 바뀜)
const O = (text, eff, x) => ({ text, eff, ...(x ? { x } : {}) });
function fixChecks(choices, x) { return choices.map((c) => c.check ? { ...c, check: { stat: c.check.stat, dc: Math.round(x.sk + (c.check.dd || 0)) } } : c); }
function meetScene(s, x) {
  const d = defOf(x), Wd = WORDS[x.job], on = ONLINE(x.job), h = callOf(x);
  const wn = x.who && CHAR[x.who]?.name, sr = x.sen && d.sr, knew = !!(sr && x.knew), ban = BANMAL.has(x.who);
  // 글: 선배 라이벌(찾아간 적 있음 / 소문으로만) · 얼굴 있는 라이벌(아는 사이 / 처음) · 이름 없는 라이벌
  const intro = sr ? (knew ? sr.a : sr.b) : (wn ? `'${x.n}'${on ? "의 주인" : " 주인"}은 ${wn}. ${x.met ? "아는 얼굴이다." : "처음 보는 얼굴이다."}\n` : "") + d.intro;
  const spy = on ? { cs: "취준생인 척 상담을 넣어 본다", insta: "부계정으로 조용히 지켜본다", tarot: "손님인 척 상담을 받아 본다", webnovel: "1화부터 정주행해 본다", tutoring: "학부모인 척 문의해 본다", vibe: "고객인 척 견적을 넣어 본다" }[x.job] : "손님인 척 정찰을 간다";
  return { kind: "event", tag: "라이벌", title: `라이벌 등장 · ${x.n}`, ...(x.who ? { who: x.who, expr: "smile" } : {}), text: `${intro}\n(${KIND_N[x.kind]} · 실력 ${x.sk} · 가격 내 ${x.pc}% · ${D.SIDEJOBS[x.job].n} 이익 −${pct(x.p)} 압박)`, onChoose: "rv_meet", rv: x.id, cine: cine("rival_appear"),
    choices: fixChecks([
      K(spy, Wd.q, -5, O(`약점이 보였다. ${x.kind === "price" ? "싼 대신 디테일이 없다." : "좋긴 한데 손이 많이 가서 오래 못 버틸 것 같다."} 내 ${L(Wd.i)} 다시 손봤다.`, { stat: { [Wd.q]: 1 } }, { p: -0.02 }), O("구경만 하고 왔다. 솔직히 좋았다. 그게 더 무섭다.", { mental: -2 })),
      d.bot ? C("고객센터에 인사 메일을 보낸다", { cash: -M(s, 3), mental: 1 }, `답장이 왔다. "소중한 의견 감사합니다." 자동 응답이다. 사흘 뒤 담당자가 따로 연락해 왔다. 사람이 있긴 있었다.`, { rel: 20 })
      : on ? C("커피 쿠폰과 함께 인사 메시지를 보낸다", { cash: -M(s, 3), mental: 1 }, `${I(h)} 놀랐다. "경쟁자가 먼저 연락하는 건 처음이네${ban ? "" : "요"}." 연락처를 주고받았다.`, { rel: 20 })
        : C("떡 한 상자 들고 인사를 간다", { cash: -M(s, 3), mental: 1 }, `${I(h)} 놀랐다. "경쟁자가 먼저 오는 건 처음이네${ban ? "" : "요"}." 명함을 주고받았다.`, { rel: 20 }),
      C("신경 끈다. 내 할 일만 한다", { mental: 1 }, `${L(x.n)} 검색해 보는 걸 하루에 세 번까지만 하기로 했다.`),
      ...(knew ? [C("선배에게 먼저 연락한다", { mental: 1, aff: 4 }, ban ? `${wn}: "역시 연락할 줄 알았어. 경쟁은 경쟁이고, 밥은 밥이지. 오늘은 내가 살게."` : `${wn}: "역시 연락할 줄 알았어요. 경쟁은 경쟁이고, 밥은 밥이죠. 오늘은 제가 살게요."`, { rel: 50 })] : []),
    ], x) };
}
function evScene(s, e, x) {
  const Wd = WORDS[x.job], h = callOf(x);
  let sc = e.mk(s, x, Wd, h);
  const ov = (ONLINE(x.job) ? ONL[e.id] : SPC[e.id]?.[x.job]); if (ov) sc = overlay(sc, ov(s, x, Wd, h)); // 온라인 투잡은 그 판의 일로, 공간형은 업종에 안 맞는 글만 바꾼다(효과·판정은 그대로)
  return { kind: "event", tag: "라이벌", title: sc.title, ...(x.who && CHAR[x.who] ? { who: x.who } : {}), text: sc.text + `\n(라이벌 ${x.n}${x.who && CHAR[x.who] ? ` · ${CHAR[x.who].name}` : ""} · ${KIND_N[x.kind]} · 실력 ${x.sk})`, onChoose: "rv_ev", rv: x.id, ev: e.id, cine: e.cine ? cine(e.cine) : undefined, choices: fixChecks(sc.choices, x) };
}

// ── 이벤트 목록 ── g: 좋은 일(true)/나쁜 일(false), need: "on"(경쟁 중)|"ally"(협업·친구)|없음(아무 때나), kind: 성향 제한
// x: p 라이벌 압박 ±, pc 라이벌 가격 ±, sk 라이벌 실력 ±, mod [v, 달] 내 이익 ±(기간), st "on"/"ally"/"gone", rel 사이 ±, war 가격 전쟁, end 화보 키(결과 화면 뒤)
export const EVS = [
  // ───── 나쁜 일 ─────
  { id: "cut", g: false, need: "on", kind: "price", w: 1.4, cine: "rival_war", mk: (s, x, w, h) => ({ title: "가격 후려치기", text: `${I(x.n)} ${w.i} 가격을 또 내렸다. 현수막: '오픈 기념 반값 연장'. ${w.c} 문의가 뚝 끊겼다.`, choices: [
    C("가격 맞불을 놓는다 (6개월 이익 −6%)", { mental: -1 }, "우리도 내렸다. 손님은 돌아왔는데 남는 게 없다. 이게 맞나?", { mod: [-0.06, 6], p: -0.04, pc: -5, war: true }),
    K(`가격 대신 ${w.i} 품질로 승부한다`, w.q, 0, O(`"비싸도 여기가 낫네요." ${w.c} 몇 명이 돌아왔다.`, { mental: 3 }, { p: -0.03 }), O("품질을 올렸는데 아무도 몰라준다. 가격표만 본다.", { mental: -3 }, { p: 0.01 })),
    C("그냥 둔다. 싼 데는 싼 손님이 간다", { mental: -2 }, "그 말이 반은 맞았다. 반은 내 손님이었다.", { p: 0.02 }),
  ] }) },
  { id: "coupon", g: false, need: "on", kind: "price", mk: (s, x, w, h) => ({ title: "첫 방문 0원 쿠폰", text: `${I(x.n)} '첫 ${w.i} 0원' 쿠폰을 뿌렸다. 동네 단톡방, 커뮤니티, 전단까지. 공짜는 이길 수가 없다.`, choices: [
    C(`단골 쿠폰으로 맞대응한다`, { cash: -M(s, 30) }, `단골들이 쿠폰을 쓰러 왔다. "역시 여기죠" 한마디에 쓴 돈이 아깝지 않았다.`, { p: -0.02 }),
    K(`${w.rv}로 맞선다. 진짜 ${w.c} 이야기를 모은다`, "mkt", 0, O(`진짜 ${w.rv} 스무 개가 쿠폰보다 셌다.`, { mental: 2 }, { p: -0.02 }), O(`${w.rv} 부탁을 하다가 오히려 부담스럽다는 말을 들었다.`, { mental: -2 })),
    C("공짜 손님은 어차피 안 남는다", { mental: -1 }, "석 달 뒤 쿠폰이 끝나자 절반은 돌아왔다. 절반은.", { p: 0.01 }),
  ] }) },
  { id: "bulk", g: false, need: "on", kind: "price", mk: (s, x, w, h) => ({ title: "큰 건을 뺏겼다", text: `견적까지 낸 큰 건이 ${RO(x.n)} 넘어갔다. "거기가 30% 싸더라고요." 계약서를 쓰기 직전이었다.`, choices: [
    K("견적을 다시 짜서 들고 간다", "num", 5, O("남는 건 줄였지만 계약은 지켰다. 다음부턴 그쪽이 먼저 연락 온다.", { cash: M(s, 40), mental: 2 }), O("숫자를 아무리 짜도 30%는 못 이긴다.", { mental: -3 })),
    C("보낸다. 다음 건을 노린다", { mental: -2 }, "달력 한 칸이 비었다. 그 칸이 유독 넓어 보인다."),
  ] }) },
  { id: "war2", g: false, need: "on", kind: "price", ok: (s, x) => x.war, cine: "rival_war", mk: (s, x, w, h) => ({ title: "출혈 경쟁 2라운드", text: `${I(x.n)} 한 번 더 내렸다. 이제 원가 아래다. 누가 먼저 쓰러지나 보자는 거다.`, choices: [
    K("끝까지 간다. 버티는 쪽이 이긴다", "num", 8, O(`석 달 뒤, ${x.n} 유리문에 '임대 문의'가 붙었다. 이겼다. 상처뿐인 승리지만.`, { mental: 2 }, { st: "gone", mod: [0.08, 6], end: "rival_close" }), O("통장이 먼저 비었다. 가격을 원래대로 돌리니 손님이 더 빠졌다.", { mental: -6 }, { mod: [-0.1, 6], war: false })),
    K("휴전을 제안한다", "talk", 0, O(`"솔직히 저도 죽겠어요." 둘 다 가격을 되돌렸다.`, { mental: 3 }, { p: -0.04, pc: 10, war: false, rel: 15 }), O("\"무서우세요?\" 대화는 3분 만에 끝났다.", { mental: -3 })),
    C("나만 빠진다. 가격을 되돌린다", { mental: -1 }, "가격표를 원래대로 바꿨다. 싼 손님은 떠났고, 숨이 좀 쉬어진다.", { war: false, p: 0.01 }),
  ] }) },
  { id: "poach", g: false, need: "on", kind: "skill", w: 1.3, mk: (s, x, w, h) => ({ title: "단골을 뺏겼다", text: `3년 단골 ${I(w.c)} ${RO(x.n)} 갔다. 우연히 들은 말: "거기 요즘 진짜 좋더라고요."`, choices: [
    K("직접 연락해 이유를 듣고 고친다", w.q, 0, O(`"사실 그게 좀 불편했어요." 그 말 한마디로 ${L(w.i)} 고쳤다. 다음 달 다시 왔다.`, { stat: { [w.q]: 1 }, mental: 2 }, { p: -0.03 }), O("\"아뇨, 그냥요.\" 그냥이 제일 아프다.", { mental: -3 })),
    C("단골 할인을 새로 만든다", { cash: -M(s, 25) }, "할인은 효과가 있었다. 할인에만 효과가 있었다.", { p: -0.02 }),
    C("보내 준다. 오는 사람 잘하면 된다", { mental: -2 }, "마음은 넓게, 매출은 좁게.", { p: 0.01 }),
  ] }) },
  { id: "copy", g: false, cine: "rival_copy", mk: (s, x, w, h) => ({ title: "내 컨셉을 베꼈다", text: `${x.n}의 새 ${w.i} 소개를 봤다. 내 것과 판박이다. 사진 구도, 소개 문구, 이름 붙이는 방식까지.`, choices: [
    K("한발 앞선 새 컨셉으로 간다", "sense", 0, O("베끼는 쪽은 늘 한 박자 늦다. 이번에도 그랬다.", { stat: { sense: 1 }, mental: 3 }, { p: -0.03 }), O("새 컨셉이 어설펐다. 오히려 그쪽이 원조처럼 보인다.", { mental: -4 }, { p: 0.02 })),
    C("정중하지만 분명한 메시지를 보낸다", { mental: -1 }, `"참고만 했어요." 답장은 짧았다. 그래도 다음 달 문구는 바뀌었다.`, { rel: -10, p: -0.01 }),
    C("따라 하면 원조가 이긴다", { mental: 1 }, `${w.c} 몇 명이 먼저 알아봤다. "여기가 원조죠?"`),
  ] }) },
  { id: "staff", g: false, ok: (s, x) => ["pr", "airbnb", "ucafe", "chicken", "cs", "tutoring", "vibe"].includes(x.job), mk: (s, x, w, h) => ({ title: "사람을 빼 갔다", text: `${I(w.st)} 조심스레 말했다. "${x.n}에서 시급을 더 준대요. 저도 고민이…"`, choices: [
    C("돈을 올려 붙잡는다", { cash: -M(s, 40) }, "붙잡았다. 다음 달부터 비용이 조금 늘었다.", { mod: [-0.02, 6] }),
    K("진심으로 이야기한다", "talk", -5, O(`"${w.ow}이랑 일하는 게 편해서요." 그 말에 그날 밤 잠을 잘 잤다.`, { mental: 4 }), O("결국 갔다. 새 사람을 구하는 한 달 동안 몸이 두 배로 힘들었다.", { hp: -8, mental: -3 }, { mod: [-0.03, 2] })),
    C("보내고 새로 구한다", { hp: -6, mental: -2 }, "인수인계는 사흘. 새 사람은 아직 서툴다.", { mod: [-0.03, 2] }),
  ] }) },
  { id: "terror", g: false, w: 1.2, mk: (s, x, w, h) => ({ title: "별점 테러 의심", text: `하룻밤 새 별 하나짜리 ${w.rv} 다섯 개. 아이디는 전부 어제 만든 것. 시기가 ${x.n} 할인 행사랑 딱 겹친다.`, choices: [
    K("증거를 모아 신고한다", "write", -5, O("다섯 개 중 네 개가 지워졌다. 플랫폼이 경고 문자를 보냈다고 한다.", { mental: 3 }, { p: -0.01 }), O("'규정 위반 아님'. 답장이 기계 같다.", { mental: -3 }, { mod: [-0.04, 3] })),
    K("정중한 답글을 하나하나 단다", "talk", -5, O(`답글을 본 ${w.c}들이 오히려 편을 들어 줬다.`, { mental: 2 }), O("답글이 변명처럼 읽혔다.", { mental: -2 }, { mod: [-0.04, 3] })),
    K("똑같이 갚아 준다", "sense", 15, O("아무도 몰랐다. 그런데 기분이 별로다.", { mental: -1 }, { p: -0.02, rel: -20 }), O(`캡처가 동네 커뮤니티에 돌았다. '${w.ow}이 직접 테러?'`, { mental: -8 }, { mod: [-0.1, 6], rel: -30 })),
  ] }) },
  { id: "renew", g: false, need: "on", kind: "skill", mk: (s, x, w, h) => ({ title: "라이벌 리뉴얼", text: `${I(x.n)} 리뉴얼했다. 새 사진이 동네 커뮤니티를 도배했다. 내 ${U(w.sh)} 갑자기 어제 산 옷처럼 낡아 보인다.`, choices: [
    C("나도 손본다 (150만 원)", { cash: -M(s, 150), mental: 2 }, "새 단장. 사진을 다시 찍으니 이쪽도 꽤 괜찮다.", { p: -0.03, sk: 4 }),
    K("홍보로 맞선다", "mkt", 5, O("'오래돼서 편한 곳' 컨셉이 의외로 먹혔다.", { stat: { mkt: 1 } }, { p: -0.02, sk: 4 }), O("홍보비만 나갔다.", { cash: -M(s, 20), mental: -2 }, { sk: 4, p: 0.01 })),
    C("버틴다. 새것도 1년이면 헌것", { mental: -1 }, "1년은 생각보다 길다.", { sk: 4, p: 0.02 }),
  ] }) },
  { id: "media", g: false, need: "on", kind: "skill", mk: (s, x, w, h) => ({ title: "라이벌이 방송을 탔다", text: `${I(x.n)} 지역 방송 '골목의 고수'에 나왔다. 방송 다음 날부터 그쪽 앞에 줄이 섰다.`, choices: [
    C("축하 메시지를 보낸다", { mental: -1 }, `"고마워요. 언제 밥 한번 해요." 의외로 다정한 답장.`, { rel: 15 }),
    K("그 주에 맞불 이벤트를 연다", "mkt", 5, O("줄 서다 지친 손님들이 이쪽으로 넘어왔다. 방송 효과를 나눠 먹었다.", { mental: 3 }, { mod: [0.04, 3] }), O("이벤트를 해도 방송을 이길 순 없었다.", { cash: -M(s, 20), mental: -3 }, { p: 0.02 })),
    C("못 본 척한다", { mental: -3 }, "못 본 척하려고 그 방송을 세 번 봤다.", { p: 0.02 }),
  ] }) },
  { id: "award", g: false, need: "on", kind: "skill", mk: (s, x, w, h) => ({ title: "라이벌의 수상 소식", text: `업계 모임에서 '올해의 ${w.sh}' 상이 ${x.n}에게 갔다. 박수를 치는 손이 조금 늦었다.`, choices: [
    C("내년엔 내가 받는다. 공부를 시작한다", { ap: -1 }, `그날 밤 노트에 '내년 목표'를 적었다.`, { p: 0.01 }),
    K("다가가 비결을 묻는다", "talk", -5, O(`"별거 없어요. 그냥 매일 해요." 진짜로 별게 없어서 더 대단했다.`, { stat: { [w.q]: 1 } }, { rel: 15 }), O("어색한 웃음만 오갔다.", { mental: -1 })),
    C("배가 아프다. 오늘은 그냥 아파한다", { mental: -3 }, "배 아픈 것도 체력이 든다.", { p: 0.01 }),
  ] }) },
  { id: "rumor", g: false, mk: (s, x, w, h) => ({ title: "험담 소문", text: `"거기 ${w.ow} 회사 다니면서 대충 한대요." 소문의 끝을 따라가 보니 ${x.n} 근처였다.`, choices: [
    K("직접 찾아가 따진다", "talk", 0, O(`"제가 그런 게 아니라 손님이…" 사과를 받았다. 소문도 같이 멈췄다.`, { mental: 3 }, { p: -0.02, rel: 5 }), O("언성이 높아졌다. 그 장면이 또 소문이 됐다.", { mental: -5 }, { rel: -15, mod: [-0.04, 3] })),
    C("실력으로 답한다. 이번 달 더 꼼꼼히", { hp: -5 }, "소문보다 결과가 빨리 돌았다.", { p: -0.01 }),
    C("웃어넘긴다", { mental: -2 }, "웃었는데 계속 생각난다.", { p: 0.01 }),
  ] }) },
  { id: "adtop", g: false, need: "on", kind: "price", mk: (s, x, w, h) => ({ title: "검색 맨 위는 늘 라이벌", text: `${I(w.c)} 검색하면 ${I(x.n)} 맨 위에 뜬다. 광고 자리를 통째로 샀다.`, choices: [
    C("나도 광고비를 쓴다 (80만 원)", { cash: -M(s, 80) }, "두 번째 줄을 샀다. 그래도 안 보이는 것보다 낫다.", { p: -0.03 }),
    K("광고 대신 검색어를 판다", "mkt", 0, O("남들이 안 쓰는 검색어 세 개를 잡았다. 그쪽 손님이 아닌 내 손님이 왔다.", { stat: { mkt: 1 } }, { p: -0.02 }), O("검색어를 바꿨더니 아무도 안 찾는 말이었다.", { mental: -2 })),
    C("소개로 오는 손님만 믿는다", { mental: -1 }, "소개는 느리다. 대신 오래간다.", { p: 0.02 }),
  ] }) },
  { id: "supplier", g: false, mk: (s, x, w, h) => ({ title: "거래처를 가로챘다", text: `오래 같이 일한 ${I(w.sup)} 말했다. "${x.n} 쪽 물량이 커서요. 그쪽 일을 먼저 하게 됐어요."`, choices: [
    C("단가를 올려 붙잡는다", { cash: -M(s, 30) }, "의리는 돈으로 산다. 슬프지만 효과는 있다."),
    K("새 거래처를 직접 찾는다", "num", 0, O("더 싸고 더 빠른 곳을 찾았다. 오히려 잘됐다.", { stat: { num: 1 }, mental: 3 }, { mod: [0.02, 6] }), O("새 거래처가 두 번 펑크를 냈다.", { mental: -3 }, { mod: [-0.04, 3] })),
    C("기다린다. 일정이 밀리는 건 감수", { mental: -2 }, "한 달 동안 일정이 꼬였다.", { mod: [-0.03, 2] }),
  ] }) },
  { id: "expand", g: false, need: "on", ok: (s, x) => s.t - x.t >= 10, mk: (s, x, w, h) => ({ title: "라이벌이 판을 키운다", text: `${I(x.n)} 투자를 받았다는 소문. 2호점, 광고, 할인 행사가 한꺼번에 터졌다.`, choices: [
    C("나도 키운다. 이번 달 몸을 갈아 넣는다", { ap: -2, hp: -6 }, "덩치로는 못 이겨도 속도로는 안 진다.", { sk: 5, p: 0.0 }),
    K("틈새로 간다. 그쪽이 못 하는 걸 한다", "sense", 0, O(`큰 데가 못 챙기는 ${I(w.c)} 따로 있었다. 그 사람들이 다 이쪽으로 왔다.`, { stat: { sense: 1 }, mental: 3 }, { sk: 5, p: -0.03 }), O("틈새가 너무 좁았다.", { mental: -3 }, { sk: 5, p: 0.02 })),
    C("지켜본다", { mental: -2 }, "지켜보는 사이 그쪽 간판이 하나 더 늘었다.", { sk: 5, p: 0.02 }),
  ] }) },
  { id: "noshow", g: false, ok: (s, x) => ["pr", "airbnb", "tutoring", "tarot", "chicken", "cs"].includes(x.job), mk: (s, x, w, h) => ({ title: "수상한 노쇼", text: `같은 번호로 예약 세 건, 전부 노쇼. 하필 제일 바쁜 주말이었다. 묘하게 ${x.n} 행사 날짜와 겹친다.`, choices: [
    C("예약금 제도를 만든다", { mental: 2 }, "예약은 조금 줄었지만 노쇼는 사라졌다.", { mod: [-0.02, 2] }),
    K("번호를 추적해 본다", "sense", 0, O(`번호 주인은 ${x.n}의 알바였다. ${I(h)} 직접 사과하러 왔다.`, { mental: 4 }, { p: -0.02, rel: -5 }), O("모르는 번호는 끝까지 모르는 번호였다.", { mental: -2 })),
    C("넘어간다", { cash: -M(s, 20) }, "빈방 사진을 보며 한숨만 쉬었다."),
  ] }) },
  { id: "flyer", g: false, need: "on", kind: "price", ok: (s, x) => x.job !== "airbnb", mk: (s, x, w, h) => ({ title: "홍보 전쟁", text: `내가 붙인 홍보물 위에 ${x.n} 홍보물이 덮여 있다. 정확히 내 것만 골라서.`, choices: [
    K("더 눈에 띄게 다시 만든다", "mkt", 0, O("새 홍보물이 동네 사진 맛집이 됐다. 일부러 찍으러 오는 사람까지 생겼다.", { stat: { mkt: 1 }, mental: 2 }, { p: -0.02 }), O("더 크게 만들었더니 더 크게 덮였다.", { mental: -2 })),
    K(`${h}에게 협정을 제안한다`, "talk", 0, O(`"각자 자리 정해서 붙이죠." 의외로 쉽게 합의했다.`, { mental: 2 }, { p: -0.02, rel: 10 }), O("\"무슨 말씀이세요?\" 시치미가 프로급이다.", { mental: -2 })),
    C("무시한다", { mental: -1 }, "홍보물 전쟁은 동네 사람들만 재밌어한다.", { p: 0.01 }),
  ] }) },
  { id: "compare", g: false, need: "on", kind: "price", mk: (s, x, w, h) => ({ title: "\"저기는 더 싸던데요?\"", text: `${I(w.c)} 대놓고 물었다. "${U(x.n)} 여기 ${x.pc}% 가격이던데요?"`, choices: [
    K("차이를 차분히 설명한다", "talk", 0, O(`"아, 그래서 다르구나." 설명을 들은 ${I(w.c)} 지인 둘을 데려왔다.`, { mental: 3 }, { p: -0.02 }), O("설명이 길어질수록 변명처럼 들렸다.", { mental: -2 })),
    C("그 자리에서 깎아 준다", { cash: -M(s, 5) }, "소문이 났다. '말하면 깎아 주는 집'.", { mod: [-0.03, 3] }),
    C(`"그럼 거기 가셔도 돼요" 웃으며 말한다`, { mental: 2 }, "그 손님은 갔다. 묘하게 속이 시원하다.", { p: 0.01 }),
  ] }) },
  // ───── 좋은 일 ─────
  { id: "close", g: true, need: "on", w: 1.2, ok: (s, x) => s.t - x.t >= 8, cine: "rival_close", mk: (s, x, w, h) => ({ title: "라이벌 폐업", text: `${x.n} 문 앞에 '그동안 감사했습니다'가 붙었다. 오래 버틴 쪽이 이겼다. 기쁜데, 마냥 기쁘진 않다.`, choices: [
    C("넘어올 손님 맞을 준비를 한다", { hp: -4, mental: 3 }, `${x.n}의 ${w.c}들이 하나둘 넘어왔다.`, { st: "gone", mod: [0.1, 6] }),
    C("집기·명단을 싸게 넘겨받는다", { cash: -M(s, 80) }, `${I(h)} 웃었다. "잘 써 주세요." 손님 명단이 꽤 두꺼웠다.`, { st: "gone", mod: [0.12, 9] }),
    C(`${h}에게 수고했다고 연락한다`, { mental: 4 }, `"덕분에 재밌었어요. 진심이에요." 그 말이 오래 남았다.`, { st: "gone", mod: [0.06, 6], rel: 20 }),
  ] }) },
  { id: "promo", g: true, need: "on", w: 1.2, mk: (s, x, w, h) => ({ title: "공동 프로모션 제안", text: `${I(h)} 찾아왔다. "우리 이러지 말고 같이 해요. 스탬프 공유하고, 넘치는 손님은 서로 보내 주고."`, choices: [
    C("손잡는다", { mental: 3 }, "동네에 '두 집 다 가면 할인' 현수막이 붙었다. 경쟁자가 동료가 됐다.", { st: "ally", end: "rival_team" }),
    K("내 조건을 얹어서 손잡는다", "talk", 0, O("수수료 없이 손님을 나누는 조건으로 합의. 협상 잘했다.", { mental: 4, stat: { talk: 1 } }, { st: "ally", mod: [0.04, 6], end: "rival_team" }), O("조건을 너무 세게 걸었다. \"생각해 볼게요\"가 마지막이었다.", { mental: -2 }, { rel: -5 })),
    C("정중히 거절한다", {}, "\"아쉽네요.\" 그 뒤로 인사가 조금 어색하다.", { rel: -10 }),
  ] }) },
  { id: "overflow", g: true, need: "ally", w: 1.4, mk: (s, x, w, h) => ({ title: "라이벌이 넘긴 손님", text: `${x.n}에서 연락이 왔다. "오늘 꽉 차서요. ${w.c} 그쪽으로 보내도 될까요?"`, choices: [
    C("감사히 받는다", { cash: M(s, 40) }, "넘어온 손님이 단골이 될 것 같다.", { rel: 5 }),
    C("받고 답례로 선물을 보낸다", { cash: M(s, 30), mental: 2 }, "\"이런 거 안 하셔도 되는데!\" 다음 주에 또 보내 줬다.", { rel: 12 }),
  ] }) },
  { id: "street", g: true, w: 0.9, mk: (s, x, w, h) => ({ title: "동네 상권 같이 키우기", text: `${I(h)} '골목 축제'를 같이 하자고 한다. 상인 다섯 집이 모여 주말에 행사를 연다.`, choices: [
    C("부스까지 낸다", { cash: -M(s, 25), hp: -5, mental: 3 }, "골목에 사람이 넘쳤다. 경쟁이 아니라 판이 커졌다.", { mod: [0.06, 6], rel: 12, p: -0.01 }),
    C("이름만 올린다", {}, "포스터 구석에 내 이름이 있다.", { mod: [0.02, 3], rel: 3 }),
    C("빠진다. 주말은 쉬어야 한다", { mental: 1 }, "축제 사진에 내 가게만 없다.", { rel: -5 }),
  ] }) },
  { id: "respect", g: true, ok: (s, x) => (s.st[WORDS[x.job].q] || 0) >= x.sk, mk: (s, x, w, h) => ({ title: "라이벌의 인정", text: `우연히 마주친 ${I(h)} 말했다. "솔직히 그쪽 ${w.i}, 우리보다 낫더라고요. 손님들도 그래요."`, choices: [
    C("고맙다고, 그쪽도 대단하다고 한다", { mental: 5 }, "서로 칭찬하다 커피 두 잔이 식었다.", { rel: 18 }),
    C("내 노하우를 하나 알려 준다", { mental: 3 }, "\"이걸 그냥 알려 줘요?\" 그쪽 눈빛이 바뀌었다.", { rel: 25, p: -0.01 }),
    C("속으로 으쓱한다", { mental: 7 }, "오늘 저녁은 내가 쏜다. 나한테.", {}),
  ] }) },
  { id: "drink", g: true, ok: (s, x) => x.rel >= 10 || x.st === "ally", mk: (s, x, w, h) => ({ title: "라이벌과 술 한잔", text: `밤 11시, ${h}의 문자. "마감했어요? 한잔할래요? 이 일 하는 사람끼리만 아는 얘기가 있잖아요."`, choices: [
    C("간다", { cash: -M(s, 8), mental: 5, hp: -2 }, "진상 손님 얘기로 두 시간을 웃었다. 이 사람, 적이 아니었다.", { rel: 22 }),
    C("오늘은 피곤하다고 한다", { hp: 2 }, `"다음에 꼭이요." 답장에 웃는 이모티콘.`, { rel: 3 }),
  ] }) },
  { id: "tip", g: true, need: "ally", mk: (s, x, w, h) => ({ title: "노하우 교환", text: `${I(h)} 엑셀 파일 하나를 보냈다. "제가 쓰는 관리표예요. 그쪽 것도 보여 줘요."`, choices: [
    C("배운다", { stat: { num: 1, [w.q]: 1 } }, "남의 관리표에서 내 구멍이 보였다."),
    C("내 노하우도 통째로 준다", { stat: { [w.q]: 1 }, mental: 2 }, "서로 좋아졌다. 동네 손님 평이 두 집 다 올랐다.", { rel: 10, mod: [0.03, 6] }),
  ] }) },
  { id: "buyout", g: true, need: "on", ok: (s, x) => s.t - x.t >= 12, cine: "rival_close", mk: (s, x, w, h) => ({ title: "인수 제안", text: `${I(h)} 조용히 말했다. "저 그만하려고요. 손님 명단이랑 집기, 싸게 넘길게요. 300만 원이면 돼요."`, choices: [
    C("인수한다 (300만 원)", { cash: -M(s, 300) }, `${x.n} 손님들이 그대로 넘어왔다. 동네에 나 혼자 남았다.`, { st: "gone", mod: [0.15, 12] }),
    K("깎아 본다", "num", 0, O("180만 원에 합의했다. 웃으며 악수했다.", { cash: -M(s, 180) }, { st: "gone", mod: [0.14, 12] }), O("\"그럼 다른 분께 넘길게요.\" 새 주인이 들어온다고 한다.", { mental: -3 }, { sk: 6, rel: -5 })),
    C("거절한다. 어차피 문 닫으면 손님은 온다", {}, "한 달 뒤 정말 문을 닫았다. 손님 일부가 넘어왔다.", { st: "gone", mod: [0.05, 4] }),
  ] }) },
  { id: "partner", g: true, need: "on", kind: "skill", mk: (s, x, w, h) => ({ title: "\"같이 해 볼래요?\"", text: `${x.n}에서 연락이 왔다. "서로 잘하는 게 다르잖아요. 같이 묶어서 팔아 보면 어때요?"`, choices: [
    C("협업한다", { mental: 3 }, "둘이 묶으니 손님이 '세트'로 사 갔다.", { st: "ally", end: "rival_team" }),
    K("역제안: 내가 주도하는 조건으로", "talk", 5, O("내 쪽 조건으로 계약. 이건 협업이 아니라 영입이다.", { mental: 4 }, { st: "ally", mod: [0.05, 6], end: "rival_team" }), O("\"그럼 없던 걸로 해요.\"", { mental: -2 }, { rel: -5 })),
    C("정중히 거절한다", { mental: 1 }, "혼자가 편하다. 아직은.", {}),
  ] }) },
  { id: "duel", g: true, need: "on", w: 1.3, mk: (s, x, w, h) => ({ title: "정면 승부", text: `동네 커뮤니티에 비교 글이 올라왔다. '${x.n} vs 여기, 어디가 나아요?' 댓글 300개. 다음 주 둘 다 써 보고 후기를 올리겠다는 사람이 열 명.`, choices: [
    K("제대로 붙는다. 이번 주는 최고로", w.q, 0, O(`후기 열 개 중 일곱이 이쪽. '${x.n}도 좋지만 여기가 한 수 위'.`, { mental: 6, hp: -4 }, { p: -0.05, mod: [0.05, 6], end: "rival_win" }), O(`일곱이 ${x.n} 쪽이었다. 댓글 300개가 전부 나를 보는 것 같다.`, { mental: -6, hp: -4 }, { p: 0.03, end: "rival_lose" })),
    K("이벤트로 판을 뒤집는다", "mkt", 5, O("후기보다 이벤트 인증 글이 더 많이 올라왔다. 판이 바뀌었다.", { cash: -M(s, 20), mental: 4 }, { p: -0.04, end: "rival_win" }), O("이벤트만 남고 후기는 그쪽이 이겼다.", { cash: -M(s, 20), mental: -4 }, { p: 0.02, end: "rival_lose" })),
    C("참전하지 않는다", { mental: -1 }, `"여기 ${w.ow}은 자신 없나 봐요" 댓글 하나가 달렸다.`, { p: 0.01 }),
  ] }) },
  { id: "truce", g: true, need: "on", kind: "price", mk: (s, x, w, h) => ({ title: "가격 휴전", text: `${I(h)} 먼저 연락했다. "우리 이러다 둘 다 죽어요. 최저가 선만 정해요."`, choices: [
    C("최저가 선을 같이 지킨다", { mental: 3 }, "가격표가 제자리를 찾았다. 숨통이 트였다.", { p: -0.05, pc: 10, war: false, rel: 10 }),
    K("내 조건으로 정한다", "talk", 0, O("내 가격은 지키고 그쪽만 올리기로. 이게 되네?", { mental: 4 }, { p: -0.06, pc: 15, war: false }), O("\"그럼 안 할래요.\" 협상 결렬.", { mental: -2 })),
    C("거절한다. 끝까지 간다", { mental: -1 }, "전쟁은 계속된다.", { p: 0.01, war: true }),
  ] }) },
  { id: "accident", g: true, need: "on", mk: (s, x, w, h) => ({ title: "라이벌의 사고", text: `${x.n}에 ${I(w.acc)} 터졌다. 동네가 시끄럽다. ${w.c}들이 갈 곳을 찾는다.`, choices: [
    C("몰려온 손님을 받는다", { hp: -4 }, `한 달 내내 바빴다. 넘어온 ${w.c} 절반이 남았다.`, { mod: [0.08, 4] }),
    C(`${L(h)} 도와준다`, { hp: -3, mental: 4 }, `"이 은혜 안 잊을게요." 경쟁자가 그날 친구가 됐다.`, { rel: 30, p: -0.02 }),
    C("조용히 내 일을 한다", { mental: 1 }, `말을 아끼니 오히려 ${I(w.c)} 믿어 줬다.`, { mod: [0.04, 3] }),
  ] }) },
  { id: "bench", g: true, need: "on", kind: "skill", mk: (s, x, w, h) => ({ title: "몰래 벤치마킹", text: `손님인 척 ${x.n}에 가 봤다. 들어서자마자 알겠다. 잘되는 데는 이유가 있다.`, choices: [
    K("배울 점을 메모해 온다", "sense", -5, O("세 가지를 바로 따라 했다. 다음 주 후기가 달라졌다.", { stat: { [w.q]: 2 } }, { p: -0.02 }), O("너무 많아서 뭘 배워야 할지 모르겠다.", { mental: -2 })),
    C("그냥 손님으로 즐긴다", { mental: 3, cash: -M(s, 3) }, "좋은 걸 좋다고 인정하니 마음이 편하다."),
    C("정체를 밝히고 인사한다", { mental: 1 }, `"알아봤어요. 들어오실 때부터." 둘 다 웃었다.`, { rel: 15 }),
  ] }) },
  { id: "tired", g: true, need: "on", ok: (s, x) => s.t - x.t >= 12, mk: (s, x, w, h) => ({ title: "라이벌의 새벽", text: `새벽 1시, ${x.n} 불이 아직 켜져 있다. ${I(h)} 셔터 앞에 쪼그려 앉아 있다. 나도 저랬던 날이 있다.`, choices: [
    C("편의점 커피를 건넨다", { cash: -1, mental: 3 }, `"…고마워요. 이 일 진짜 쉽지 않죠?" 한 시간을 같이 앉아 있었다.`, { rel: 25, p: -0.01 }),
    C("기회다. 이번 달 더 몰아붙인다", { hp: -4, mental: -2 }, "몰아붙였다. 그쪽이 휘청했다. 이상하게 개운하지 않다.", { mod: [0.05, 4], p: -0.02 }),
    C("못 본 척 지나간다", {}, "집에 오는 길이 길었다."),
  ] }) },
  { id: "united", g: true, mk: (s, x, w, h) => ({ title: "공동의 적", text: `${w.fee} 인상 공지가 떴다. ${I(h)} 단톡방을 만들었다. "이번엔 같이 대응해요."`, choices: [
    K("앞장서서 협상한다", "talk", -5, O("인상 폭이 절반으로 줄었다. 단톡방에 박수 이모티콘이 쏟아졌다.", { mental: 4, stat: { talk: 1 } }, { rel: 15, mod: [0.03, 6] }), O("협상은 실패했지만 같은 편이 생겼다.", { mental: 1 }, { rel: 10, mod: [-0.02, 4] })),
    C("단톡방에서 응원만 한다", {}, "결과는 반쯤 성공. 내 몫은 없었지만 피해도 덜했다.", { rel: 3, mod: [-0.01, 4] }),
    C("혼자 감수한다", { cash: -M(s, 25) }, "오른 비용은 그냥 낸다. 마음은 편하다.", { rel: -5 }),
  ] }) },
  { id: "move", g: true, need: "on", ok: (s, x) => s.t - x.t >= 10, mk: (s, x, w, h) => ({ title: "라이벌의 이사", text: `${I(x.n)} 더 큰 동네로 옮긴다고 한다. "여기선 그쪽을 못 이기겠더라고요. 농담이에요. 반은."`, choices: [
    C("송별 화분을 보낸다", { cash: -M(s, 5), mental: 3 }, `"새 동네 가서 그쪽 얘기 많이 할게요." 진짜 손님 몇 명을 소개해 줬다.`, { st: "gone", mod: [0.06, 6], rel: 15 }),
    C("조용히 박수를 친다", { mental: 2 }, "다음 날 그 자리에 '임대' 현수막이 붙었다.", { st: "gone", mod: [0.05, 6] }),
  ] }) },
  { id: "refer", g: true, need: "ally", mk: (s, x, w, h) => ({ title: "라이벌이 물어 온 큰 건", text: `${I(h)} 전화했다. "이건 우리보다 그쪽이 잘할 일이라. 소개해 드릴게요."`, choices: [
    K("제대로 해낸다", w.q, -5, O("큰 건을 깔끔하게 끝냈다. 소개해 준 사람 체면도 살았다.", { cash: M(s, 90), mental: 4 }, { rel: 10 }), O("결과가 애매했다. 돈은 받았지만 소개한 쪽이 머쓱해졌다.", { cash: M(s, 40), mental: -2 }, { rel: -5 })),
    C("바빠서 정중히 사양한다", {}, "\"다음엔 꼭이요.\"", {}),
  ] }) },
];

// ── 온라인 투잡용 글(11-23) ── 사건 id 별로 글만 덮어쓴다. 효과·판정·확률은 EVS 원본 그대로.
//   돌려주는 값: { title?, text?, c: [선택지 순서대로 [선택지 글, 결과 글] 또는 판정이면 [선택지 글, 성공 글, 실패 글]. null·빠진 칸은 원본 유지] }
//   j(x, {cs, insta, tarot, webnovel, tutoring, vibe}): 투잡마다 다른 문장. n = 라이벌 이름, h = 부르는 말(인물 이름 또는 '이름 + 코치님·작가님…')
const j = (x, m, def = "") => m[x.job] ?? def;
function overlay(sc, o) {
  if (!o) return sc;
  return { ...sc, title: o.title || sc.title, text: o.text || sc.text, choices: sc.choices.map((c, i) => {
    const q = o.c?.[i]; if (!q) return c; const [t, a, b] = q;
    return c.check ? { ...c, t: t ?? c.t, ok: { ...c.ok, text: a ?? c.ok.text }, ng: { ...c.ng, text: b ?? c.ng.text } } : { ...c, t: t ?? c.t, text: a ?? c.text };
  }) };
}
const ONL = {
  cut: (s, x, w) => ({ text: j(x, {
    cs: `${I(x.n)} 첨삭 가격을 또 내렸다. 취준 커뮤니티 배너에 '공채 시즌 반값 연장'. 이번 주 문의가 뚝 끊겼다.`,
    insta: `${I(x.n)} 협찬 단가를 또 내렸다. 담당자 메일: "그쪽은 제품만 줘도 올려 준다는데요." 이번 달 제안이 뚝 끊겼다.`,
    tarot: `${I(x.n)} 상담 가격을 또 내렸다. '첫 리딩 3천 원, 이번 주까지' 딱지가 목록 맨 위에 붙었다. 문의 알림이 조용하다.`,
    webnovel: `${I(x.n)} 무료 회차를 또 늘렸다. '50화까지 무료' 딱지가 붙었다. 내 유료 회차 결제가 뚝 떨어졌다.`,
    tutoring: `${I(x.n)} 수업료를 또 내렸다. '첫 달 반값' 공고가 학부모 단톡방에 돌았다. 상담 전화가 뚝 끊겼다.`,
    vibe: `${I(x.n)} 견적을 또 내렸다. 비교 견적 화면에서 내 숫자 옆에 절반짜리 숫자가 나란히 뜬다. 문의가 뚝 끊겼다.` }),
    c: [[null, `나도 내렸다. ${w.c} 숫자는 돌아왔는데 남는 게 없다. 이게 맞나?`], null, ["그냥 둔다. 가격만 보는 사람은 어차피 떠난다", `그 말이 반은 맞았다. 반은 내 ${jo(w.c, "이었다", "였다")}.`]] }),
  coupon: (s, x, w) => ({ title: "첫 이용 0원", text: j(x, {
    cs: `${I(x.n)} '첫 첨삭 0원' 쿠폰을 뿌렸다. 취준 단톡방, 학교 게시판, 카페 배너까지. 공짜는 이길 수가 없다.`,
    insta: `${I(x.n)} '첫 협찬은 무료로 올려 드려요'를 브랜드 담당자들에게 돌렸다. 내 단가표를 받아 간 담당자가 답이 없다.`,
    tarot: `${I(x.n)} '첫 리딩 0원' 쿠폰을 뿌렸다. 재능장터 배너, 오픈채팅, 인별 광고까지. 공짜는 이길 수가 없다.`,
    webnovel: `${I(x.n)} 전 회차 무료 이벤트를 열었다. 플랫폼 팝업에 걸렸다. 내 독자 서재에도 그 작품이 꽂혔다.`,
    tutoring: `${I(x.n)} '시범 수업 2회 무료'를 걸었다. 맘카페, 학부모 단톡방, 매칭 앱 배너까지. 공짜는 이길 수가 없다.`,
    vibe: `${I(x.n)} '첫 페이지 무료 제작'을 걸었다. 외주 플랫폼 배너, 사장님 카페, 단톡방까지. 공짜는 이길 수가 없다.` }),
    c: [[`오래된 ${w.c}에게 혜택을 돌린다`, `떠날까 말까 하던 ${I(w.c)} 남았다. "역시 여기죠" 한마디에 쓴 돈이 아깝지 않았다.`], null, ["공짜로 온 사람은 어차피 안 남는다", "석 달 뒤 이벤트가 끝나자 절반은 돌아왔다. 절반은."]] }),
  bulk: (s, x, w) => ({ text: j(x, {
    cs: `학교 취업센터 단체 첨삭 건이 ${RO(x.n)} 넘어갔다. "거기가 30% 싸더라고요." 계약서를 쓰기 직전이었다.`,
    insta: `석 달짜리 브랜드 협찬이 ${RO(x.n)} 넘어갔다. "그쪽이 30% 싸게 해 준대서요." 계약서를 쓰기 직전이었다.`,
    tarot: `회사 송년 행사 타로 부스 건이 ${RO(x.n)} 넘어갔다. "거기가 30% 싸더라고요." 날짜까지 잡아 둔 일이었다.`,
    webnovel: `플랫폼 기획전 한 자리가 ${RO(x.n)} 넘어갔다. 담당 편집자: "그쪽이 정산 비율을 30% 양보했대요." 원고까지 넘긴 뒤였다.`,
    tutoring: `형제 둘, 1년짜리 수업이 ${RO(x.n)} 넘어갔다. "거기가 30% 싸더라고요." 교재까지 골라 둔 집이었다.` }, null),
    c: [["조건을 다시 짜서 들고 간다"], [null, "달력 한 칸이 비었다. 그 칸이 유독 넓어 보인다."]] }),
  war2: (s, x, w) => ({ c: [[null, `석 달 뒤, ${x.n} ${w.gone}. 이겼다. 상처뿐인 승리지만.`, `통장이 먼저 비었다. 가격을 원래대로 돌리니 ${I(w.c)} 더 빠졌다.`], null, [null, "가격을 원래대로 돌렸다. 가격만 보던 사람은 떠났고, 숨이 좀 쉬어진다."]] }),
  poach: (s, x, w) => ({ title: j(x, { cs: "수강생을 빼 갔다", tutoring: "학생을 빼 갔다" }, null), text: j(x, {
    cs: `내 그룹반 수강생 셋이 ${RO(x.n)} 옮겼다. 단톡방에 누가 그쪽 링크를 올렸다고 한다. "거기는 면접까지 봐 준대."`,
    insta: `매번 첫 댓글을 달던 팔로워가 ${x.n} 게시물에 댓글을 단다. 내 글에는 사흘째 조용하다.`,
    tarot: `매달 오던 단골이 ${RO(x.n)} 갔다. 그쪽 후기에 익숙한 닉네임이 보였다. "여기 진짜 잘 봐요."`,
    webnovel: `매 화 첫 댓글을 달던 독자가 ${x.n} 작품에 가 있다. 추천 글까지 썼다. "요즘은 이게 제일 재밌음."`,
    tutoring: `2년 가르친 학생 어머님이 전화했다. "이번 달까지만 할게요." 알고 보니 ${RO(x.n)} 옮긴다. 같은 반 친구가 거기 다닌단다.`,
    vibe: `유지보수까지 맡던 고객사가 다음 프로젝트를 ${x.n}에 줬다. 담당자: "거기 포트폴리오가 좋더라고요."` }),
    c: [null, [`오래된 ${w.c} 혜택을 새로 만든다`, "혜택은 효과가 있었다. 혜택에만 효과가 있었다."]] }),
  copy: (s, x, w) => ({ title: j(x, { webnovel: "표절 의심" }, null), text: j(x, {
    cs: `${x.n}의 새 상품 소개를 봤다. 내 첨삭 양식과 판박이다. 목차, 예시 문장, '3단계 진단'이라는 이름까지.`,
    insta: `${x.n}의 새 게시물을 봤다. 내 것과 판박이다. 구도, 첫 문장, 해시태그 순서까지.`,
    tarot: `${x.n}의 새 상품 소개를 봤다. 내 것과 판박이다. '연애 3카드 + 한 달 조언' 구성에 소개 문구까지.`,
    webnovel: `${x.n}의 새 연재 1화를 읽었다. 회귀 시점, 첫 대사, 조연 이름 돌림자까지 내 작품과 겹친다. 댓글에 벌써 "이거 어디서 본 것 같은데"가 달렸다.`,
    tutoring: `${x.n}의 수업 소개를 봤다. 내 커리큘럼 표와 판박이다. '오답 3줄 보고서'라는 이름까지.`,
    vibe: `${x.n}의 포트폴리오에 내가 만든 화면이 올라와 있다. 색만 바꿨다. 버튼 문구는 그대로다.` }) }),
  staff: (s, x, w) => ({ text: `${I(w.st)} 조심스레 말했다. "${x.n}에서 ${j(x, { cs: "건당 만 원", vibe: "단가를" }, "시급을")} 더 준대요. 저도 고민이…"`,
    c: [null, [null, `"같이 일하는 게 편해서요." 그 말에 그날 밤 잠을 잘 잤다.`]] }),
  terror: (s, x, w) => (x.job === "insta" ? { title: "신고 폭탄", text: `자고 일어나니 게시물 세 개가 '검토 중'으로 내려갔다. 누가 한꺼번에 신고를 넣었다. 계정 정지 경고까지 왔다. 시기가 ${x.n}의 협찬 공개 날짜랑 딱 겹친다.`,
    c: [["증거를 모아 이의 신청을 넣는다", "세 개 중 두 개가 살아났다. '악의적 신고'로 처리됐다는 답이 왔다.", "'검토 결과 변동 없음'. 답장이 기계 같다."], ["사정을 스토리에 차분히 올린다", "팔로워들이 오히려 편을 들어 줬다.", "해명이 변명처럼 읽혔다."], [null, null, "캡처가 돌았다. '신고 폭탄, 알고 보니 맞신고?'"]] }
    : { text: `하룻밤 새 별 하나짜리 ${x.job === "webnovel" ? "평점 서른" : w.rv + " 다섯"} 개. 아이디는 전부 어제 만든 것. 시기가 ${x.n} ${jo(w.sale, "이랑", "랑")} 딱 겹친다.`,
      c: [[null, "거의 다 지워졌다. 플랫폼이 그쪽에 경고를 보냈다고 한다."], null, [null, null, `캡처가 ${w.pl}에 돌았다. '본인이 직접 테러?'`]] }),
  renew: (s, x, w) => ({ title: "라이벌의 새 단장", text: j(x, {
    cs: `${I(x.n)} 상품을 전부 새로 짰다. 상세 페이지에 합격 후기 영상이 붙었다. 내 페이지가 갑자기 3년 전 양식처럼 보인다.`,
    insta: `${I(x.n)} 피드를 통째로 갈아엎었다. 톤, 글씨체, 표지까지. 내 피드가 갑자기 작년 유행처럼 보인다.`,
    tarot: `${I(x.n)} 프로필을 새로 찍고 상담 구성을 바꿨다. 후기 영상까지 붙었다. 내 상담 페이지가 갑자기 낡아 보인다.`,
    webnovel: `${I(x.n)} 표지를 새로 그리고 1~10화를 통째로 고쳐 썼다. 플랫폼이 '개정판'이라며 다시 밀어 준다. 내 표지가 갑자기 낡아 보인다.`,
    tutoring: `${I(x.n)} 수업 소개 영상을 새로 찍었다. 판서 화면이 방송국 같다. 내 프로필 사진이 갑자기 증명사진처럼 보인다.`,
    vibe: `${I(x.n)} 포트폴리오 사이트를 새로 열었다. 작업물마다 전후 비교 영상이 붙었다. 내 PDF 소개서가 갑자기 낡아 보인다.` }),
    c: [[null, "새 단장. 다시 만들고 보니 이쪽도 꽤 괜찮다."], [null, "'꾸준히 해 온 사람' 이야기가 의외로 먹혔다."]] }),
  media: (s, x, w) => ({ title: j(x, { insta: "라이벌이 탐색 탭에 걸렸다", webnovel: "라이벌이 메인 배너에 걸렸다", vibe: "라이벌이 첫 화면에 걸렸다" }, null), text: j(x, {
    cs: `${I(x.n)} 구독자 50만 취업 채널에 나왔다. 영상이 올라간 다음 날부터 그쪽 예약이 한 달 치 찼다.`,
    insta: `${x.n} 게시물이 탐색 탭 맨 위에 걸렸다. 하루 만에 팔로워가 만 명 늘었다. 내 분야를 검색하면 첫 줄이 그 계정이다.`,
    tarot: `${I(x.n)} 연애 예능에 나왔다. 방송 다음 날부터 그쪽 상담 대기가 석 달이 됐다.`,
    webnovel: `${x.n} 작품이 플랫폼 메인 배너에 걸렸다. 일주일 내내 첫 화면이다. 내 작품은 장르 탭 세 번째 줄로 밀렸다.`,
    tutoring: `${I(x.n)} 구독자 30만 교육 채널에 '이 선생님을 찾아라'로 나왔다. 영상 다음 날부터 그쪽에 대기 명단이 생겼다.`,
    vibe: `${x.n} 작업물이 외주 플랫폼 '이달의 프로젝트'에 뽑혔다. 첫 화면에 한 달 걸린다. 문의가 그쪽으로 몰린다.` }),
    c: [null, [null, `그쪽 대기에 지친 ${I(w.c)} 이쪽으로 넘어왔다. 노출 효과를 나눠 먹었다.`, "이벤트로 그 노출을 이길 순 없었다."], [null, "못 본 척하려고 그 화면을 세 번 봤다."]] }),
  award: (s, x, w) => ({ text: `${j(x, { cs: "재능장터 연말 결산 '올해의 코치'가", insta: "브랜드들이 뽑는 '올해의 계정'이", tarot: "재능장터 '올해의 상담사'가", webnovel: "플랫폼 연말 시상 '올해의 신작'이", tutoring: "매칭 앱 '올해의 선생님'이", vibe: "외주 플랫폼 '올해의 전문가'가" })} ${x.n}에게 갔다. 축하 댓글을 쓰다가 한 번 지웠다.` }),
  rumor: (s, x, w) => ({ title: "저격 글", text: j(x, {
    cs: `취준 커뮤니티에 글이 올라왔다. '회사 다니면서 부업으로 첨삭하는 사람, 믿어도 됨?' 이름은 없는데 누가 봐도 나다. 글쓴이 흔적을 따라가 보니 ${x.n} 근처였다.`,
    insta: `익명 계정이 스토리를 올렸다. '협찬인데 광고 표기 늦게 다는 계정 있음.' 이름은 없는데 누가 봐도 나다. 그 계정이 팔로우하는 곳은 ${x.n} 하나뿐이다.`,
    tarot: `상담 후기 게시판에 글이 올라왔다. '회사원이 취미로 보는 타로, 돈 내고 볼 만함?' 누가 봐도 나다. 글쓴이 흔적을 따라가 보니 ${x.n} 근처였다.`,
    webnovel: `작가 게시판에 저격 글이 올라왔다. '직장인이 취미로 쓰는 글이 순위권인 게 말이 됨?' 작품 이름은 없는데 누가 봐도 나다. 글쓴이 말투가 ${x.n} 후기와 똑같다.`,
    tutoring: `맘카페에 글이 올라왔다. '회사 다니면서 과외하는 선생님, 시험 기간에 책임지나요?' 누가 봐도 나다. 댓글에는 ${I(x.n)} 추천돼 있다.`,
    vibe: `개발자 게시판에 글이 올라왔다. 'AI로 찍어 낸 코드 납품하는 사람 조심.' 캡처 속 화면이 내 작업물이다. 글쓴이 흔적을 따라가 보니 ${x.n} 근처였다.` }),
    c: [["직접 연락해 따진다", `"제가 쓴 건 아닌데… 내리라고 할게요." 글은 그날 밤 지워졌다.`, "말이 거칠어졌다. 그 대화 캡처가 또 돌았다."], [null, "저격 글보다 결과가 빨리 돌았다."]] }),
  adtop: (s, x, w) => ({ text: j(x, {
    insta: `내 분야 해시태그를 누르면 ${I(x.n)} 맨 위에 뜬다. 광고를 한 달 내내 돌린다.`,
    webnovel: `장르 탭을 열면 ${x.n} 작품이 맨 위에 뜬다. 플랫폼 유료 광고 자리를 통째로 샀다.` }, null),
    c: [null, [null, `남들이 안 쓰는 검색어 세 개를 잡았다. 그쪽이 아니라 나를 찾는 ${I(w.c)} 왔다.`], [`소개로 오는 ${w.c}만 믿는다`]] }),
  supplier: (s, x, w) => ({ title: "일감 줄을 가로챘다", text: j(x, {
    cs: `해마다 특강을 맡기던 학교 취업센터 담당자가 말했다. "올해는 ${x.n} 쪽이랑 하기로 했어요. 패키지로 묶어 주신대서요."`,
    insta: `1년째 협찬을 주던 브랜드 담당자가 말했다. "이번 시즌은 ${x.n} 쪽이랑 먼저 하게 됐어요."`,
    tarot: `행사를 물어다 주던 대행사 실장이 말했다. "${x.n} 쪽이 팀으로 움직여서요. 큰 행사는 그쪽에 먼저 주게 됐어요."`,
    webnovel: `담당 편집자가 조심스레 말했다. "${x.n} 쪽 일정이 급해서요. 교정이 한 주 밀릴 것 같아요."`,
    tutoring: `학생을 소개해 주던 학원 실장이 말했다. "${x.n} 쪽이 소개비를 더 줘서요. 이번 학기는 그쪽에 먼저 보내게 됐어요."`,
    vibe: `일을 물어다 주던 중개 담당자가 말했다. "${x.n} 쪽이 물량을 다 받겠대서요. 그쪽에 먼저 넘기게 됐어요."` }),
    c: [["조건을 올려 붙잡는다"], ["새 통로를 직접 찾는다", "조건이 더 좋은 곳을 찾았다. 오히려 잘됐다.", "새로 튼 곳이 두 번 펑크를 냈다."]] }),
  expand: (s, x, w) => ({ text: `${I(x.n)} ${j(x, {
    cs: "코치를 다섯 명 뽑았다. 광고, 무료 특강, 할인이 한꺼번에 터졌다.",
    insta: "편집자를 두고 부계정 두 개를 열었다. 하루 세 번 올라온다.",
    tarot: "상담사 셋을 묶어 팀 계정을 열었다. 24시간 응대, 광고, 할인이 한꺼번에 터졌다.",
    webnovel: "두 번째 작품을 동시 연재한다. 보조 작가를 붙였다는 소문이다. 순위표에 그 이름이 두 줄이다.",
    tutoring: "강사 셋을 뽑아 과목을 늘렸다. 광고, 무료 진단, 형제 할인이 한꺼번에 터졌다.",
    vibe: "개발자 둘을 뽑았다. 광고, 무료 상담, 묶음 할인이 한꺼번에 터졌다." })}`,
    c: [null, null, [null, "지켜보는 사이 그쪽 덩치가 한 번 더 커졌다."]] }),
  noshow: (s, x, w) => ({ text: `같은 번호로 ${j(x, { tutoring: "시범 수업" }, "상담")} 예약 세 건, 전부 노쇼. 하필 제일 바쁜 주말이었다. 묘하게 ${x.n} ${w.sale} 날짜와 겹친다.`,
    c: [null, [null, `번호 주인은 ${x.n} 쪽 사람이었다. 사과 연락이 왔다.`], [null, "빈 시간표를 보며 한숨만 쉬었다."]] }),
  flyer: (s, x, w, h) => ({ title: "홍보 글 덮기", text: j(x, { insta: `내가 쓰는 해시태그마다 ${x.n} 게시물이 5분 안에 따라 올라온다. 정확히 내가 올린 직후에만.` }, `내가 홍보 글을 올리면 바로 위에 ${x.n} 홍보 글이 올라온다. 올릴 때마다, 5분 안에.`),
    c: [["더 눈에 띄게 다시 쓴다", "새 글이 인기 글에 올랐다. 일부러 찾아오는 사람까지 생겼다.", "더 자주 올렸더니 더 자주 덮였다."], [null, `"요일을 나눠서 올리죠." 의외로 쉽게 합의했다.`], [null, "홍보 글 전쟁은 구경꾼만 재밌어한다."]] }),
  compare: (s, x, w) => (x.job === "insta" ? { text: `협찬 담당자가 대놓고 물었다. "${U(x.n)} 이 단가의 ${x.pc}%에 해 준다던데요?"`, c: [[null, `"아, 그래서 다르구나." 담당자가 다음 시즌 건까지 얘기했다.`], [null, "소문이 났다. '말하면 깎아 주는 계정'."], [null, "그 담당자는 갔다. 묘하게 속이 시원하다."]] }
    : { c: [null, [null, "소문이 났다. '말하면 깎아 주는 사람'."], [null, "그 사람은 갔다. 묘하게 속이 시원하다."]] }),
  close: (s, x, w, h) => ({ title: "라이벌이 접었다", text: `${x.n} ${w.gone}. 마지막 공지는 '그동안 감사했습니다'. 오래 버틴 쪽이 이겼다. 기쁜데, 마냥 기쁘진 않다.`,
    c: [[`넘어올 ${w.c} 맞을 준비를 한다`], [j(x, { cs: "양식·고객 명단을 싸게 넘겨받는다", insta: "소재 노트·거래처 연락처를 넘겨받는다", tarot: "단골 명단을 싸게 넘겨받는다", webnovel: "독자 채널 운영권을 넘겨받는다", tutoring: "학생 명단·자료를 싸게 넘겨받는다", vibe: "유지보수 계약을 넘겨받는다" }), `${I(h)} 웃었다. "잘 써 주세요." 생각보다 묵직했다.`]] }),
  promo: (s, x, w, h) => ({ title: "같이 하자는 제안", text: `${I(h)} 먼저 연락했다. "우리 이러지 말고 같이 해요. ${j(x, {
    cs: "서로 못 받는 직무는 넘겨 주고, 후기 이벤트도 묶고",
    insta: "합동 게시물 올리고, 안 맞는 협찬은 서로 넘겨 주고",
    tarot: "예약 넘치면 서로 넘겨 주고, 세트 상품도 묶고",
    webnovel: "작가의 말에 서로 추천 걸고, 합동 이벤트도 하고",
    tutoring: "과목 안 겹치는 학생은 서로 소개하고",
    vibe: "일정 넘치는 건은 서로 넘기고, 큰 건은 같이 받고" })}."`,
    c: [[null, "서로의 페이지에 서로의 이름이 걸렸다. 경쟁자가 동료가 됐다."], [null, `수수료 없이 ${L(w.c)} 나누는 조건으로 합의. 협상 잘했다.`]] }),
  overflow: (s, x, w, h) => ({ title: "라이벌이 넘긴 일", text: j(x, {
    insta: `${I(h)} 연락했다. "이번 협찬은 제 분야가 아니라서요. 담당자한테 그쪽 소개해도 될까요?"`,
    webnovel: `${I(h)} 연락했다. "제 독자들이 다음에 읽을 걸 찾는데, 작가의 말에 그쪽 작품 추천해도 될까요?"` }, `${I(h)} 연락했다. "이번 달은 꽉 차서요. ${w.c} 그쪽으로 보내도 될까요?"`),
    c: [[null, `넘어온 ${I(w.c)} 오래 남을 것 같다.`]] }),
  street: (s, x, w, h) => ({ title: "판 같이 키우기", text: `${I(h)} ${j(x, {
    cs: "'공채 시즌 무료 합동 특강'을 같이 하자고 한다. 코치 다섯이 모여 주말에 온라인으로 연다.",
    insta: "같은 분야 계정 다섯이 모이는 합동 챌린지를 하자고 한다. 주말 이틀, 같은 해시태그로.",
    tarot: "'연말 운세 합동 라이브'를 같이 하자고 한다. 상담사 다섯이 주말에 돌아가며 본다.",
    webnovel: "같은 장르 작가 다섯이 묶는 '합동 연재 주간'을 하자고 한다. 서로의 작가의 말에 추천을 건다.",
    tutoring: "'중간고사 무료 합동 설명회'를 같이 하자고 한다. 선생님 다섯이 주말에 온라인으로 연다.",
    vibe: "'사장님을 위한 무료 홈페이지 상담회'를 같이 하자고 한다. 다섯 팀이 주말에 연다." })}`,
    c: [["한 꼭지를 맡는다", "사람이 몰렸다. 경쟁이 아니라 판이 커졌다."], [null, "안내 글 구석에 내 이름이 있다."], [null, "행사 후기에 나만 없다."]] }),
  respect: (s, x, w, h) => ({ text: `${I(h)} 메시지를 보냈다. "솔직히 그쪽 ${w.i}, 저보다 낫더라고요. ${w.c}들도 그래요."`, c: [[null, "서로 칭찬하다 답장이 열 번 오갔다."]] }),
  drink: (s, x, w, h) => ({ text: `밤 11시, ${h}의 메시지. "${j(x, { cs: "오늘 첨삭 끝났어요?", insta: "오늘 올릴 거 올렸어요?", tarot: "오늘 상담 끝났어요?", webnovel: "오늘 분량 올렸어요?", tutoring: "오늘 수업 끝났어요?", vibe: "오늘 배포 끝났어요?" })} 한잔할래요? 이 일 하는 사람끼리만 아는 얘기가 있잖아요."`,
    c: [[null, `진상 ${w.c} 얘기로 두 시간을 웃었다. 이 사람, 적이 아니었다.`]] }),
  tip: (s, x, w, h) => ({ text: `${I(h)} 파일 하나를 보냈다. "제가 쓰는 ${j(x, { cs: "첨삭 체크리스트", insta: "콘텐츠 일정표", tarot: "상담 기록 양식", webnovel: "플롯 관리표", tutoring: "학생별 진도표", vibe: "견적 계산 시트" })}예요. 그쪽 것도 보여 줘요."`,
    c: [[null, "남의 양식에서 내 구멍이 보였다."], [null, `서로 좋아졌다. ${w.c} 평이 양쪽 다 올랐다.`]] }),
  buyout: (s, x, w, h) => ({ text: `${I(h)} 조용히 말했다. "저 그만하려고요. ${j(x, { cs: "고객 명단이랑 양식", insta: "계정이랑 거래처 연락처", tarot: "단골 명단이랑 상품 페이지", webnovel: "독자 채널이랑 기획 노트", tutoring: "학생 명단이랑 자료", vibe: "유지보수 계약이랑 코드" })}, 싸게 넘길게요. 300만 원이면 돼요."`,
    c: [[null, `${x.n}의 ${I(w.c)} 그대로 넘어왔다. 이 판에 맞수가 하나 줄었다.`], [null, "180만 원에 합의했다. 서로 고생했다는 말로 끝냈다.", "\"그럼 다른 분께 넘길게요.\" 새 주인이 이어받는다고 한다."], ["거절한다. 어차피 접으면 넘어온다", `한 달 뒤 정말 접었다. ${w.c} 일부가 넘어왔다.`]] }),
  partner: (s, x, w, h) => ({ text: `${I(h)} 연락했다. "서로 잘하는 게 다르잖아요. 둘이 묶어서 같이 내 보면 어때요?"`, c: [[null, `둘이 묶으니 ${I(w.c)} '세트'로 찾았다.`]] }),
  duel: (s, x, w) => ({ title: j(x, { webnovel: "순위 맞대결" }, null), text: j(x, {
    cs: `취준 커뮤니티에 비교 글이 올라왔다. '${x.n} vs 여기, 어디가 나아요?' 댓글 300개. 둘 다 받아 보고 후기를 올리겠다는 사람이 열 명.`,
    insta: `누가 릴스로 비교를 올렸다. '${x.n} vs 이 계정, 누구 추천이 맞나'. 댓글 300개. 다음 주에 둘이 고른 곳을 다 가 보겠단다.`,
    tarot: `상담 후기 게시판에 비교 글이 올라왔다. '${x.n} vs 여기, 어디가 잘 봐요?' 댓글 300개. 둘 다 받아 보고 후기를 올리겠다는 사람이 열 명.`,
    webnovel: `이번 주 장르 1위 자리가 ${x.n} 작품과 내 작품 둘로 좁혀졌다. 독자 게시판에 투표 글이 올라왔다. 댓글 300개. 둘 다 정주행하고 후기를 쓰겠다는 사람이 열 명.`,
    tutoring: `맘카페에 비교 글이 올라왔다. '${x.n} vs 이 선생님, 어디가 나아요?' 댓글 300개. 시범 수업을 둘 다 들어 보겠다는 집이 열 곳.`,
    vibe: `사장님 카페에 비교 글이 올라왔다. '${x.n} vs 여기, 어디에 맡길까요?' 댓글 300개. 둘 다 견적을 받아 보겠다는 가게가 열 곳.` }),
    c: [[null, `열 중 일곱이 이쪽. '${x.n}도 좋지만 여기가 한 수 위'.`], null, [null, `"여기는 자신 없나 봐요" 댓글 하나가 달렸다.`]] }),
  accident: (s, x, w, h) => ({ text: `${x.n}에 ${I(w.acc)} 터졌다. ${I(w.pl)} 시끄럽다. ${w.c}들이 갈 곳을 찾는다.`, c: [[`몰려온 ${L(w.c)} 받는다`]] }),
  bench: (s, x, w) => ({ text: `${j(x, {
    cs: `취준생인 척 ${x.n} 상담을 신청해 봤다`, insta: `${x.n} 계정을 첫 게시물까지 내려 봤다`, tarot: `손님인 척 ${x.n} 상담을 받아 봤다`,
    webnovel: `${x.n} 작품을 1화부터 최신 화까지 결제해 읽었다`, tutoring: `학부모인 척 ${x.n} 시범 수업을 신청해 봤다`, vibe: `고객인 척 ${x.n}에 견적을 넣어 봤다` })}. 5분 만에 알겠다. 잘되는 데는 이유가 있다.`,
    c: [null, ["분석은 접고 그냥 즐긴다"], [null, `"알아봤어요. 처음부터." 둘 다 웃었다.`]] }),
  tired: (s, x, w, h) => ({ title: "새벽 1시의 접속 표시", text: `새벽 1시, ${h}의 접속 표시가 아직 켜져 있다. ${j(x, {
    cs: "첨삭 파일 수정 시각이 1분 전이다", insta: "방금 스토리가 올라왔다. '오늘도 편집 중'", tarot: "'지금 상담 가능' 딱지가 붙어 있다",
    webnovel: "방금 '오늘 분량 늦습니다' 공지가 떴다", tutoring: "보강 수업 공지가 방금 올라왔다", vibe: "수정 기록이 방금 또 하나 올라왔다" })}. 나도 저랬던 날이 있다.`,
    c: [["커피 쿠폰을 보낸다", `"…고마워요. 이 일 진짜 쉽지 않죠?" 한 시간을 메시지로 떠들었다.`], null, ["못 본 척 창을 닫는다", "잠이 늦게 왔다."]] }),
  move: (s, x, w) => ({ title: "라이벌의 이적", text: `${I(x.n)} ${j(x, { cs: "기업 교육 쪽으로", insta: "다른 플랫폼으로", tarot: "오프라인 상담실로", webnovel: "다른 플랫폼 독점 연재로", tutoring: "대형 학원 전임으로", vibe: "한 회사 전속 계약으로" })} 옮긴다고 한다. "여기선 그쪽을 못 이기겠더라고요. 농담이에요. 반은."`,
    c: [["축하 선물을 보낸다", `"거기 가서 그쪽 얘기 많이 할게요." 진짜 ${w.c} 몇을 소개해 줬다.`], [null, `다음 날 ${x.n} ${w.gone}.`]] }),
};
// 공간형인데 업종에 안 맞는 글만(투잡별)
const SPC = {
  noshow: {
    chicken: (s, x) => ({ title: "수상한 단체 주문", text: `같은 번호로 단체 주문 세 건. 배달을 가 보니 받는 사람이 없다. 하필 제일 바쁜 금요일이었다. 묘하게 ${x.n} 행사 날짜와 겹친다.`, c: [["선결제만 받기로 한다", "단체 주문은 조금 줄었지만 헛걸음은 사라졌다."], null, [null, "식은 치킨 여섯 마리를 알바들과 나눠 먹었다."]] }),
    airbnb: (s, x) => ({ text: `같은 번호로 예약 세 건, 전부 당일 취소. 하필 연휴였다. 묘하게 ${x.n} 할인 날짜와 겹친다.`, c: [["환불 불가 요금을 만든다"], null, [null, "빈 달력을 보며 한숨만 쉬었다."]] }),
  },
  tired: { airbnb: (s, x, w, h) => ({ text: `새벽 1시, ${x.n} 현관 불이 아직 켜져 있다. ${I(h)} 이불 봉지를 끌어안고 계단에 앉아 있다. 나도 저랬던 날이 있다.` }) },
  media: { airbnb: (s, x) => ({ text: `${I(x.n)} 여행 예능에 나왔다. 방송 다음 날부터 그쪽 달력이 석 달 치 찼다.`, c: [null, [null, "예약을 못 잡은 게스트들이 이쪽으로 넘어왔다. 방송 효과를 나눠 먹었다."]] }) },
  street: { airbnb: (s, x, w, h) => ({ text: `${I(h)} '골목 지도'를 같이 만들자고 한다. 숙소 다섯 곳이 모여 동네 맛집·산책길을 한 장에 담는다.`, c: [["내 숙소 추천 코스까지 싣는다", "지도를 들고 다니는 게스트가 늘었다. 경쟁이 아니라 판이 커졌다."], [null, "지도 구석에 내 숙소 이름이 있다."], [null, "지도에 내 숙소만 없다."]] }) },
};

// ── 선택 처리 ──
function applyX(s, x, X, out) {
  if (!X) return;
  const w = WORDS[x.job];
  if (X.p) { const b = x.p; x.p = clamp(x.p + X.p * P_MUL, P_MIN, P_MAX); const d = x.p - b; if (d) out.push(`${x.n} 압박 ${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%p (지금 ${pct(x.p)})`); }
  if (X.pc) x.pc = clamp(x.pc + X.pc, 10, 200);
  if (X.sk) { x.sk = clamp(x.sk + X.sk, 0, 130); out.push(`${x.n} 실력 ${X.sk > 0 ? "+" : ""}${X.sk}`); }
  if (X.war !== undefined) x.war = X.war;
  if (X.mod) { addMod(s, x.job, X.mod[0], X.mod[1]); out.push(`${D.SIDEJOBS[x.job].n} 이익 ${X.mod[0] > 0 ? "+" : "−"}${pct(Math.abs(X.mod[0]))} (${X.mod[1]}개월)`); }
  if (X.rel) { x.rel = clamp(x.rel + X.rel, -50, 100); }
  if (X.st && X.st !== x.st) {
    x.st = X.st;
    if (X.st === "gone") { out.push(`라이벌 ${x.n} 떠남`); log(s, `라이벌 ${I(x.n)} 떠났다.`, "work"); }
    if (X.st === "ally") { out.push(`${W_(x.n)} 협업 (이익 +${pct(ALLY_BONUS)})`); log(s, `라이벌 ${W_(x.n)} 손잡았다.`, "work"); }
  }
  if (x.st === "on" && !x.fr && x.rel >= 50) {
    x.fr = true; out.push(`${U(x.n)} 이제 친구 같은 라이벌 (압박 절반)`); log(s, `라이벌 ${W_(x.n)} 친구가 됐다.`, "love");
    const ck = cine("rival_friend"); if (ck) s.sceneQ.unshift(story(`라이벌, 친구가 되다`, `${W_(callOf(x))}는 이제 경쟁보다 수다가 길다. 같은 걸 겪는 사람은 생각보다 적다.`, ck));
  }
  if (X.end) { const ck = cine(X.end); if (ck) s.sceneQ.unshift(story(END_T[X.end] || "라이벌", `${x.n} · ${w.sh}`, ck)); }
}
const END_T = { rival_close: "라이벌이 떠난 거리", rival_team: "어제의 적, 오늘의 동료", rival_win: "정면 승부, 승리", rival_lose: "정면 승부, 패배", rival_war: "가격 전쟁", rival_copy: "베낀 간판", rival_friend: "라이벌, 친구가 되다", rival_appear: "라이벌 등장" };
function pickX(sc, i, okv) { const ch = sc?.choices?.[i]; if (!ch) return null; return ch.check ? (okv ? ch.ok?.x : ch.ng?.x) : ch.x; }
export const RV_CHOOSE = {
  rv_meet(s, r, i, okv, sc) { const x = (s.rv?.list || []).find((q) => q.id === sc?.rv); if (!x) return []; const out = []; applyX(s, x, pickX(sc, i, okv), out); if (!out.length) out.push(`라이벌 ${x.n}: ${KIND_N[x.kind]} · 압박 −${pct(x.p)}`); return out; },
  rv_ev(s, r, i, okv, sc) { const x = (s.rv?.list || []).find((q) => q.id === sc?.rv); if (!x) return []; const out = []; const X = pickX(sc, i, okv); applyX(s, x, X, out); if (X?.end === "rival_win" || X?.end === "rival_close") { try { out.push(...rivalReward(s, r, x.job)); } catch (e) { console.warn(e); } } return out; },
};
// 화면용 요약: 그 투잡 라이벌 목록 + 이번 달 순 압박
export function boardInfo(s, job) {
  const list = rivalsOf(s, job); if (!list.length) return null;
  return { net: netOf(s, job), hit: s.rv?.hit?.[job] || null, list: list.map((x) => ({ n: x.n, who: x.who, d: x.d, kind: KIND_N[x.kind], sk: x.sk, pc: x.pc, st: x.st, stN: x.st === "on" && x.fr ? "친구" : ST_N[x.st], press: x.st === "on" ? -(x.fr ? x.p / 2 : x.p) : x.st === "ally" ? ALLY_BONUS : 0 })) };
}
export const __test = { spawn, meetScene, evScene, okEv }; // 글 점검 스크립트용(게임은 쓰지 않는다)
// 시험용(#...-rvtest): 그 투잡에 라이벌을 바로 세운다(경쟁 중 1 + 협업·친구 1, 압박 기록)
export function rivalDemo(s, job) {
  const V = st(s), R = RIVALS[job]; if (!R || V.list.some((x) => x.job === job)) return;
  V.since[job] = s.t - 12; V.cap[job] = R.max;
  R.list.slice(0, 3).forEach((d, i) => V.list.push({ id: d.id, job, n: d.n, d: d.d, kind: d.kind, sk: d.sk[1], pc: d.pc, p: +(d.p * P_MUL).toFixed(3), st: i === 1 ? "ally" : i === 2 ? "gone" : "on", t: s.t - 6, rel: i === 0 ? 55 : 30, fr: false, war: false }));
  addMod(s, job, 0.04, 3); V.hit[job] = { t: s.t, net: netOf(s, job), amt: 0 };
}
