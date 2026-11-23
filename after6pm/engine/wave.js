// 판이 바뀐다(11-23). 투잡마다 두 번 오는 큰 변화(1차 8~10년 차 WAVES, 2차 17~20년 차 WAVES2). WARNING 화면(ui.js warnPlay) → 대응을 고른다.
// 시장 충격(market.js)은 몇 달 뒤 끝나지만, 이건 끝나지 않는다. 하던 대로 가면 해마다 더 줄고, 판을 갈아타면 여섯 달 고생 뒤 원래대로 번다.
// core.js endMonth 에서 marketMonth 바로 뒤에 waveMonth(s, r, notes, scenes). onChoose 는 "wv_ev"(WV_CHOOSE).
// 돈: 그 투잡의 이번 달 이익 × 감소율 → 장부 "판 변화"(지출). 컨설팅은 cs.js aiCut 이 문의·단가를 직접 줄이므로 여기선 경고 장면만 띄운다.
// 상태: s.wv = { [job](1차)·[job+"2"](2차): { t: 경고가 뜬 달, mode: "shift"|"half"|"stay", mt: 고른 달, askT: 마지막으로 물은 달 } }
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import { addMoney, log } from "./core.js";
import { profitOf } from "./rival.js";
import { CS_AI, aiDrop } from "./cs.js";

export const WV_LABEL = "판 변화";
// at: 게임 몇 달째에 오나([1차, 2차]. 8~10년 차와 17~20년 차. 판마다·투잡마다 이 사이에서 따로 정한다) · between: 1차와 2차 사이 최소 간격(달) · minTen: 그 투잡을 시작하고 적어도 이만큼은 지나야 온다 · gap: 경고 화면끼리 최소 간격(달) · perYear: 하던 대로 가면 해마다 더 줄어드는 폭 · cap: 최대 감소 · first: 첫해 감소
// half: 반만 대응하면 감소의 몇 배 · shiftMo/shiftDip: 갈아타는 동안(달)·그동안 감소 · again: 다시 묻는 간격(달) · late: 늦게 갈아타면 비용 배수
export const WV_BAL = { at: [[96, 120], [204, 240]], between: 36, minTen: 12, gap: 3, first: 0.08, perYear: 0.07, cap: 0.4, capMax: 0.7, half: 0.5, shiftMo: 6, shiftDip: 0.15, again: 24, askMax: 2, late: 1.5 };
// 투잡마다 세기(k): 이익에서 투잡이 차지하는 몫이 달라서, 하던 대로 갔을 때 파이어율이 비슷하게(8~10%p) 떨어지도록 맞춘 값(봇 200판)
export const WV_K = { cs: 1, pr: 1.6, insta: 0.6, airbnb: 0.9, ucafe: 1.6, tarot: 1, webnovel: 1.6, tutoring: 1.2, chicken: 0.6, vibe: 1.4 };
if (typeof process !== "undefined" && process.env?.WVK) Object.assign(WV_K, JSON.parse(process.env.WVK)); // 봇 시험용
const bal = (job) => { const k = WV_K[job] ?? 1, B = WV_BAL, r2 = (x) => Math.round(x * 100) / 100; return { first: r2(B.first * k), perYear: r2(B.perYear * k), cap: Math.min(B.capMax, r2(B.cap * k)) }; };
const M = (s, x) => Math.max(5, Math.round(x * SYN.pi(s) / 5) * 5); // 만원, 물가 반영

// ch: [갈아타기(글, 결과, 비용 만원), 반만 대응(글, 결과, 비용), 하던 대로(글, 결과)]
export const WAVES = {
  cs: { head: "AI가 취업판을 지배한다", n: "AI 대세", own: true,
    text: "취준생 열에 아홉이 AI로 자소서를 쓴다. 기업은 AI로 서류를 거른다. 커뮤니티에는 \"첨삭 받을 돈으로 구독료 낸다\"는 글이 돈다. 신입 자소서 첨삭은 해마다 줄어들 판이다. 사람 손이 끝까지 남는 곳은 경력 이직이다. 강의는 당분간 버팀목이 된다.",
    ch: [["경력 이직 쪽으로 넓힐 준비를 한다", "경력기술서와 연봉 협상을 다시 공부했다. 이직 상담은 AI가 대신 못 한다."], ["대학 커리어센터에 강의 제안서를 돌린다", "\"AI 시대 자소서\" 특강 제안에 한 곳이 답했다. 강의 섭외가 들어왔다."], ["하던 대로 신입 자소서를 본다", "아직은 문의가 온다. 내년에도 올지는 모르겠다."]] },
  pr: { head: "여럿이 모이는 시대가 끝난다", n: "모임 문화 변화",
    text: "스무 명 생일 파티 예약이 사라졌다. 요즘 손님은 둘셋이 조용히 논다. 회사 회식도 점심으로 바뀌었다. 큰 방 하나를 통째로 빌려주는 방식으로는 해마다 주말이 빈다.",
    ch: [["큰 방을 쪼개 2~4인 프라이빗 룸으로 갈아엎는다", "공사 먼지 속에서 여섯 달을 보냈다. 작은 방 셋이 큰 방 하나보다 잘 찬다.", 900], ["소규모 요금제와 촬영 대관만 더한다", "빈 타임 몇 개는 메웠다. 큰 흐름은 그대로다.", 200], ["하던 대로 단체 손님을 받는다", "단골 동아리가 있다. 그 동아리도 해마다 인원이 준다."]] },
  insta: { head: "가상 인플루언서가 협찬을 쓸어 간다", n: "가상 모델 시대",
    text: "광고주가 AI 가상 모델을 쓰기 시작했다. 지치지 않고, 사고도 안 치고, 단가는 십분의 일이다. \"제품 사진 예쁘게\"만으로 받던 협찬이 해마다 줄 판이다.",
    ch: [["얼굴과 일상을 걸고 라이브·공동구매로 간다", "어색한 첫 라이브를 지나자 \"진짜 사람이라 산다\"는 댓글이 달렸다.", 150], ["AI 편집 툴로 게시물 물량을 늘린다", "올리는 속도는 빨라졌다. 내 계정도 AI 계정처럼 보이기 시작했다.", 50], ["하던 대로 예쁜 사진을 올린다", "좋아요는 여전히 달린다. 협찬 메일은 뜸해졌다."]] },
  airbnb: { head: "호텔이 한 달 살기 시장에 들어왔다", n: "호텔의 반격",
    text: "대형 호텔 체인이 '한 달 살기 요금제'를 내놨다. 청소와 조식이 포함인데 내 숙소와 값이 같다. 깔끔한 방 하나로 받던 예약이 해마다 줄 판이다.",
    ch: [["호텔이 못 하는 '동네에 사는 집'으로 바꾼다", "주방·세탁기·동네 지도를 채웠다. 여섯 달 뒤 \"호텔보다 집 같다\"는 후기가 쌓였다.", 600], ["장기 숙박 할인만 넣는다", "예약 몇 건은 지켰다. 남는 건 줄었다.", 100], ["하던 대로 간다", "성수기는 아직 찬다. 비수기가 길어졌다."]] },
  ucafe: { head: "천오백 원 커피가 골목을 덮는다", n: "저가 커피 전쟁",
    text: "저가 커피 체인이 한 블록에 하나씩 들어섰다. 사람이 내려 주는데 내 무인카페보다 싸다. '무인이라 싸다'는 장점이 사라졌다. 커피만 팔아서는 해마다 손님이 빠진다.",
    ch: [["커피 대신 '머무는 자리'를 판다(좌석 구독·무인 간식)", "콘센트와 칸막이를 달고 구독권을 팔았다. 여섯 달 뒤 저녁 자리가 찼다.", 500], ["원두를 바꾸고 값을 맞춘다", "가격표는 따라갔다. 마진이 얇아졌다.", 120], ["하던 대로 간다", "단골은 아직 온다. 새 손님은 길 건너로 간다."]] },
  tarot: { head: "AI 점술이 운세 판을 삼킨다", n: "AI 점술",
    text: "생년월일만 넣으면 30초 만에 풀이가 나온다. 무료다. 손님이 묻는다. \"앱이랑 뭐가 달라요?\" 십 분짜리 단건 상담은 해마다 줄 판이다.",
    ch: [["대면 '깊은 상담'과 타로 클래스로 간다", "한 시간짜리 상담과 주말 클래스를 열었다. 여섯 달 뒤 예약표가 다시 찼다.", 180], ["AI 풀이를 곁들인 저가 상담을 만든다", "가볍게 오는 손님은 잡았다. 단가는 내려갔다.", 50], ["내 방식대로 본다", "오던 손님은 온다. 새 손님이 줄었다."]] },
  webnovel: { head: "AI 양산작이 플랫폼을 덮는다", n: "AI 양산작 범람",
    text: "하루에 새 작품이 오백 편씩 올라온다. 절반은 AI가 썼다. 신작 목록에서 내 작품은 십 분 만에 밀려난다. 조회수만 보고 쓰는 방식으로는 해마다 정산이 준다.",
    ch: [["독자를 내 편으로 모은다(후원 연재·단행본·독자 모임)", "독자 모임에 열두 명이 왔다. 여섯 달 뒤 그 열두 명이 입소문이 됐다.", 120], ["AI로 초고 속도를 올려 물량으로 맞선다", "편수는 늘었다. 댓글에 \"요즘 글이 밋밋해요\"가 달렸다.", 40], ["하던 대로 쓴다", "쓰던 독자는 남았다. 새 독자가 안 온다."]] },
  tutoring: { head: "AI 튜터가 과외 판을 삼킨다", n: "AI 튜터",
    text: "월 2만 원짜리 AI 튜터가 24시간 문제를 풀어 준다. 학부모가 묻는다. \"설명은 AI가 하는데, 선생님은 뭘 해 주시나요?\" 문제 풀이만 해 주는 과외는 해마다 줄 판이다.",
    ch: [["'관리형 과외'로 간다(계획·습관·입시 상담)", "주간 계획표와 학부모 보고서를 만들었다. 여섯 달 뒤 \"AI는 이걸 못 해요\"라는 소개가 돌았다.", 180], ["AI 문제집을 수업에 끼운다", "수업은 편해졌다. 수업료를 올리긴 어렵다.", 50], ["하던 대로 가르친다", "지금 학생은 남았다. 다음 학기 문의가 줄었다."]] },
  chicken: { head: "배달 판이 뒤집혔다", n: "배달 판 변화",
    text: "배달 앱이 '무료 배달'을 내걸고 그 값을 가게에 넘겼다. 큰 프랜차이즈는 자체 앱으로 빠져나갔다. 작은 가게만 남아 수수료를 낸다. 배달만 믿고 가면 해마다 남는 돈이 준다.",
    ch: [["홀·포장 중심 가게로 바꾼다", "테이블을 늘리고 포장 할인을 걸었다. 여섯 달 뒤 동네 단골이 배달 손님을 넘었다.", 800], ["값을 올리고 배달 반경을 줄인다", "주문 수는 줄었다. 한 마리에 남는 돈은 조금 지켰다.", 100], ["하던 대로 튀긴다", "주문 알림은 여전히 울린다. 정산서 숫자만 작아진다."]] },
  vibe: { head: "말 한마디면 앱이 나온다", n: "외주 단가 붕괴",
    text: "고객사 대표가 AI로 홈페이지를 직접 만들어 봤다고 한다. \"이 정도면 쓸 만하던데요?\" 만들어 주기만 하는 일은 해마다 값이 내려갈 판이다.",
    ch: [["'만들기'에서 '운영·자동화 구독'으로 간다", "납품 뒤 월 구독으로 관리해 주는 상품을 만들었다. 여섯 달 뒤 구독 고객이 열 곳이 됐다.", 180], ["단가를 내리고 건수로 버틴다", "일은 늘었다. 시급은 내려갔다.", 0], ["하던 대로 견적을 낸다", "견적 답장이 늦어진다. 돌아오는 말은 \"조금만 더 싸게\"다."]] },
};

// 2차(17~20년 차): 1차와 다른 변화가 한 번 더 온다. 컨설팅도 2차는 다른 투잡처럼 이익이 줄어든다
export const WAVES2 = {
  cs: { head: "AI 면접관이 채용을 끝낸다", n: "AI 채용",
    text: "대기업이 서류부터 면접까지 AI로 뽑기 시작했다. 헤드헌터 자리에는 AI 매칭이 들어왔다. 지원자는 AI 면접관과 연습한다. 이력서를 고쳐 주고 예상 질문을 뽑아 주는 상담은 해마다 값이 내려갈 판이다.",
    ch: [["기업 출강과 임원·고연차 코칭으로 간다", "인사팀을 찾아다니며 제안서를 돌렸다. 여섯 달 뒤 기업 교육 계약이 두 건 잡혔다.", 300], ["'AI 면접 대비' 반을 연다", "수강생은 모였다. 석 달 뒤 같은 반이 무료 앱으로 나왔다.", 80], ["하던 대로 상담한다", "소개로 오는 손님은 있다. 검색으로 오는 손님이 끊겼다."]] },
  pr: { head: "새 아파트마다 파티룸이 생겼다", n: "단지 안 파티룸",
    text: "신축 단지 커뮤니티 시설에 파티룸과 게스트룸이 들어왔다. 입주민은 공짜에 가깝다. 동네 손님이 멀리 나올 이유가 없어졌다. 방만 빌려줘서는 해마다 예약이 준다.",
    ch: [["촬영·팝업 행사 공간으로 바꾼다", "조명과 배경을 새로 달았다. 여섯 달 뒤 평일 낮이 촬영 예약으로 찼다.", 1000], ["기업 워크숍 패키지만 더한다", "분기에 몇 건은 들어온다. 주말 빈 타임은 그대로다.", 250], ["하던 대로 받는다", "먼 동네 손님은 아직 온다. 가까운 손님이 사라졌다."]] },
  insta: { head: "사람들이 새 앱으로 떠난다", n: "플랫폼 이동",
    text: "십 대와 이십 대가 새 앱으로 옮겨 갔다. 내 팔로워 숫자는 그대로인데 보는 사람이 없다. 광고주는 도달 수를 보고 단가를 깎는다. 한 플랫폼 숫자만 믿고 가면 해마다 협찬이 준다.",
    ch: [["내 이름으로 브랜드와 자체 몰을 만든다", "첫 제품은 삼백 개를 겨우 팔았다. 여섯 달 뒤 재구매 손님이 생겼다.", 200], ["새 앱에 같은 영상을 올린다", "조회수는 조금 나온다. 거기서는 내가 신인이다.", 40], ["하던 대로 올린다", "오래된 팔로워는 남았다. 새 팔로워가 안 붙는다."]] },
  airbnb: { head: "빈집 숙소가 쏟아진다", n: "숙소 공급 과잉",
    text: "지자체가 빈집을 고쳐 숙소로 풀었다. 하룻밤 값이 내 숙소의 절반이다. 검색 첫 화면이 그런 집으로 덮였다. 잠만 자는 방으로는 해마다 예약이 준다.",
    ch: [["숙소에 '할 거리'를 붙인다(체험·워케이션 묶음)", "동네 공방과 묶음 상품을 만들었다. 여섯 달 뒤 사흘 넘게 묵는 손님이 늘었다.", 700], ["값을 내리고 청소 횟수를 줄인다", "예약은 지켰다. 남는 돈과 별점이 같이 내려갔다.", 100], ["하던 대로 간다", "단골 손님은 다시 온다. 처음 오는 손님이 줄었다."]] },
  ucafe: { head: "로봇 카페가 옆에 들어왔다", n: "로봇 카페",
    text: "대기업 로봇 카페가 옆 건물에 들어왔다. 24시간이고, 싸고, 로봇 팔이 구경거리다. 내 가게 기계는 십 년 된 자판기처럼 보인다. 무인이라는 것만으로는 해마다 손님이 빠진다.",
    ch: [["커피만 파는 가게를 접고 무인 복합 매장으로 간다", "간식·출력·택배함을 들였다. 여섯 달 뒤 커피보다 다른 매출이 커졌다.", 600], ["기계를 새것으로 바꾼다", "맛은 따라갔다. 구경거리는 저쪽에 있다.", 200], ["하던 대로 간다", "아는 손님은 온다. 지나가던 손님은 로봇 쪽으로 간다."]] },
  tarot: { head: "회사가 마음 상담을 공짜로 준다", n: "무료 상담 복지",
    text: "회사마다 심리 상담을 복지로 넣었다. 고민을 털어놓으러 오던 직장인 손님이 그쪽으로 간다. \"상담은 회사에서 받아요. 타로는 재미로만요.\" 고민 상담으로 받던 값은 해마다 줄 판이다.",
    ch: [["기업 행사·팝업 출장 타로로 간다", "송년회와 팝업 행사에 부스를 냈다. 여섯 달 뒤 행사 문의가 먼저 온다.", 200], ["상담 뒤 기록지를 만들어 준다", "받은 손님은 좋아한다. 새 손님을 부르지는 못한다.", 40], ["내 방식대로 본다", "오래된 손님은 온다. 한 번 오고 마는 손님이 늘었다."]] },
  webnovel: { head: "독자가 숏드라마로 넘어갔다", n: "숏드라마 시대",
    text: "출퇴근길 독자가 일 분짜리 드라마를 본다. 플랫폼은 연재 지원금을 줄이고 영상에 돈을 쓴다. 글만 올려서는 해마다 정산이 준다.",
    ch: [["내 작품을 숏드라마·웹툰 원작으로 판다", "각본 쓰는 법을 새로 배웠다. 여섯 달 뒤 판권 계약서에 도장을 찍었다.", 150], ["회차를 짧게 쪼개 올린다", "읽는 속도는 맞췄다. 회당 정산도 쪼개졌다.", 30], ["하던 대로 쓴다", "완결까지 따라오는 독자는 있다. 첫 화에서 나가는 독자가 늘었다."]] },
  tutoring: { head: "학생이 사라진다", n: "학령인구 절벽",
    text: "한 학년이 십 년 전의 절반이다. 학원들이 남은 학생을 두고 값을 내린다. 과외를 구하는 글 자체가 줄었다. 학생만 가르쳐서는 해마다 수업이 준다.",
    ch: [["성인 수강생으로 간다(직장인 영어·자격증)", "퇴근 뒤 반을 열었다. 여섯 달 뒤 직장인 수강생이 학생 수를 넘었다.", 200], ["형제 할인과 그룹 수업을 만든다", "빈 시간 몇 개는 채웠다. 시간당 받는 돈은 줄었다.", 30], ["하던 대로 가르친다", "지금 학생은 졸업까지 간다. 그 뒤가 비어 있다."]] },
  chicken: { head: "로봇이 닭을 튀긴다", n: "로봇 주방",
    text: "큰 프랜차이즈가 로봇 주방을 깔고 한 마리 값을 내렸다. 사람 손으로 튀기는 내 가게는 값을 못 맞춘다. 같은 치킨으로 맞서면 해마다 남는 돈이 준다.",
    ch: [["우리 가게만의 메뉴를 내건 안주 가게로 바꾼다", "메뉴판을 갈고 간판을 새로 달았다. 여섯 달 뒤 \"여기서만 먹는다\"는 손님이 생겼다.", 900], ["세트 메뉴로 한 상 값을 올린다", "주문 한 건에 남는 돈은 조금 늘었다. 주문 수는 계속 준다.", 100], ["하던 대로 튀긴다", "맛을 아는 단골은 온다. 값을 보는 손님은 떠났다."]] },
  vibe: { head: "AI가 운영까지 맡는다", n: "AI 운영 대행",
    text: "AI 에이전트가 사이트를 고치고, 장애를 잡고, 보고서까지 쓴다. 고객사가 묻는다. \"관리비를 계속 내야 하나요?\" 남의 것을 만들고 돌봐 주는 일은 해마다 값이 내려갈 판이다.",
    ch: [["한 업종만 파서 내 서비스를 만든다", "동네 학원용 예약 서비스를 냈다. 여섯 달 뒤 돈 내는 곳이 서른 군데가 됐다.", 250], ["AI 에이전트 세팅 대행을 한다", "일거리는 생겼다. 한 번 해 주면 끝나는 일이다.", 30], ["하던 대로 관리해 준다", "오래된 고객사는 남았다. 계약 갱신 때마다 금액이 깎인다."]] },
};

const st = (s) => (s.wv = s.wv || {});
const jobN = (j) => D.SIDEJOBS[j]?.n || j;
const pct = (x) => Math.round(x * 100);
const RK = (job, n) => (n === 2 ? job + "2" : job); // 상태 키
const WV = (job, n) => (n === 2 ? WAVES2 : WAVES)[job];
// 한 차수의 감소율(0~cap). 컨설팅 1차는 cs.js 가 직접 줄이므로 0
function cut1(s, job, n) {
  const W = WV(job, n), x = s.wv?.[RK(job, n)]; if (!W || W.own || !x || !x.mode) return 0;
  const B = WV_BAL, J = bal(job);
  if (x.mode === "shift") return s.t - x.mt < B.shiftMo ? B.shiftDip : 0;
  const base = Math.min(J.cap, J.first + Math.max(0, (s.t - x.t) / 12) * J.perYear);
  return +(base * (x.mode === "half" ? B.half : 1)).toFixed(3);
}
// 그 투잡의 지금 감소율(1차·2차를 곱으로 합친다)
export function cutOf(s, job) { return +(1 - (1 - cut1(s, job, 1)) * (1 - cut1(s, job, 2))).toFixed(3); }
// 보드·안내용(2차가 왔으면 2차 이름으로)
export function waveInfo(s, job) {
  const x2 = s.wv?.[RK(job, 2)], W2 = WAVES2[job], cut = cutOf(s, job);
  if (x2 && W2) {
    const left = x2.mode === "shift" ? Math.max(0, WV_BAL.shiftMo - (s.t - x2.mt)) : 0, m1 = s.wv?.[job]?.mode;
    const mode = x2.mode === "shift" && !left && cut > 0 && m1 && m1 !== "own" ? m1 : x2.mode || "stay"; // 2차는 갈아탔는데 1차가 남아 있으면 1차 상태로
    return { n: W2.n, head: W2.head, cut, mode, left, round: 2 };
  }
  const W = WAVES[job], x = s.wv?.[job]; if (!W || !x) return null;
  if (W.own) { const d = aiDrop(s); return d >= 5 ? { n: W.n, head: W.head, cut: d / 100, mode: s.cs?.niches?.includes("career") ? "shift" : "stay", own: true } : null; }
  const left = x.mode === "shift" ? Math.max(0, WV_BAL.shiftMo - (s.t - x.mt)) : 0;
  return { n: W.n, head: W.head, cut, mode: x.mode, left, round: 1 };
}
const tenure = (s, job) => { const p = s.sj?.rp?.[job]; return p && typeof p.t0 === "number" ? s.t - p.t0 : -1; };

export function waveMonth(s, r, notes, scenes) {
  if (typeof process !== "undefined" && process.env?.WVOFF) return; // 봇 시험용: 끄고 비교
  const V = st(s), AT = (V._at = V._at || {}), B = WV_BAL;
  if (scenes.some((q) => q.warn)) s.warnT = s.t; // 시장 충격 경고가 이번 달에 떴다
  for (const job of s.sj?.active || []) {
    if (!WAVES[job]) continue;
    // 1) 돈(1차·2차 합친 감소율)
    const cut = cutOf(s, job);
    if (cut > 0) { const prof = profitOf(s, job); if (prof > 0) { const amt = Math.round(prof * cut); if (amt > 0) { s.cash -= amt; addMoney(s, "exp", WV_LABEL, amt); } } }
    if (s.cal === 1 && cut > 0) notes.push(`${jobN(job)}: 판이 바뀌어 이익이 ${pct(cut)}% 줄고 있어요. 하던 대로면 해마다 더 줄어요.`);
    for (const n of [1, 2]) {
      const W = WV(job, n); if (!W) continue;
      const key = RK(job, n), x = V[key];
      if (AT[key] === undefined) AT[key] = r.int(B.at[n - 1][0], B.at[n - 1][1]); // 컨설팅 1차는 cs.js aiFrom 이 읽는다
      if (x && x.mode === "shift" && s.t - x.mt === B.shiftMo) notes.push(`${jobN(job)}: 갈아탄 방식이 자리를 잡았어요. '${W.n}' 영향이 사라졌어요.`);
      // 2) 경고 장면(한 달에 하나, 다른 선택 장면과 안 겹치게, 서로 석 달은 띄운다)
      if (scenes.some((q) => q.kind === "event" || q.warn) || s.t - (s.warnT ?? -99) < B.gap) continue;
      if (!x) {
        const p1 = V[job], ok = n === 1 || (p1 && s.t - p1.t >= B.between); // 2차는 1차가 지나고 3년 뒤부터
        const due = ok && s.t >= AT[key] && (W.own ? s.cs?.open && tenure(s, job) >= 6 : tenure(s, job) >= B.minTen);
        if (due) { V[key] = { t: s.t, askT: s.t }; s.warnT = s.t; scenes.push(scene(s, job, n, false)); }
      } else if (!W.own && x.mode && x.mode !== "shift" && s.t - (x.askT || x.t) >= B.again && (x.askN || 0) < B.askMax) { x.askT = s.t; x.askN = (x.askN || 0) + 1; s.warnT = s.t; scenes.push(scene(s, job, n, true)); }
    }
  }
}

function scene(s, job, n, late) {
  const W = WV(job, n), B = WV_BAL, J = bal(job), nm = jobN(job), x = s.wv[RK(job, n)];
  if (W.own) return { kind: "event", tag: "WARNING", warn: { head: W.head, sub: `${nm} · 판이 바뀐다` }, title: W.head, onChoose: "wv_ev", wvJob: job, wvN: n,
    text: `${W.text}\n(신입 취업 쪽 문의가 해마다 ${pct(CS_AI.perYear)}%p씩, 최대 ${pct(1 - CS_AI.floor)}%까지 줄어요. 경력 이직은 줄지 않아요. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요. 경력 이직 분야는 커리어 ${D.NICHES.career.req.career}·회사 경력 ${D.NICHES.career.req.years}년이 돼야 열려요. ${s.cs?.niches?.includes("career") ? "이미 열었어요" : `지금 커리어 ${Math.floor(s.st?.career || 0)}. 그때까지는 줄어드는 걸 버텨야 해요`})`,
    choices: [{ t: W.ch[0][0], eff: { stat: { career: 2 }, mental: -1 }, text: W.ch[0][1] }, { t: W.ch[1][0], eff: { hp: -3 }, text: W.ch[1][1] }, { t: W.ch[2][0], eff: {}, text: W.ch[2][1] }] };
  const c0 = M(s, W.ch[0][2] * (late ? B.late : 1)), c1 = W.ch[1][2] ? M(s, W.ch[1][2]) : 0, cur = pct(cut1(s, job, n));
  const tail = late ? `(이 변화로 ${nm} 이익 −${cur}%. 하던 대로면 최대 −${pct(J.cap)}%까지 줄어요. ${(x.askN || 0) >= B.askMax ? "다시 고를 기회는 이번이 마지막이에요" : "늦게 갈아타면 돈이 더 들어요"})` : `(하던 대로면 ${nm} 이익이 올해 −${pct(J.first)}%, 해마다 ${pct(J.perYear)}%p씩 더, 최대 −${pct(J.cap)}%까지 줄어요. 갈아타면 ${B.shiftMo}달 동안 −${pct(B.shiftDip)}% 뒤 원래대로)`;
  const ch = [{ t: `${W.ch[0][0]} (${c0}만 원)`, eff: { cash: -c0, mental: -3, hp: -4 }, text: W.ch[0][1] }];
  if (!late || x.mode === "stay") ch.push({ t: c1 ? `${W.ch[1][0]} (${c1}만 원)` : W.ch[1][0], eff: { cash: -c1, mental: -1 }, text: W.ch[1][1], wv: "half" });
  ch.push({ t: late ? "지금 방식을 그대로 둔다" : W.ch[2][0], eff: {}, text: late ? "바꾸지 않았다. 정산서는 내년에 또 얇아질 거다." : W.ch[2][1], wv: "keep" });
  const sub = late ? "아직 늦지 않았다" : n === 2 ? "판이 또 바뀐다" : "판이 바뀐다";
  return { kind: "event", tag: "WARNING", warn: { head: W.head, sub: `${nm} · ${sub}` }, title: late ? `${W.head} · 다시 고를 때` : W.head, onChoose: "wv_ev", wvJob: job, wvN: n, wvLate: !!late, text: `${late ? `'${W.n}'가 온 지 ${Math.round((s.t - x.t) / 12)}년. 예전 방식의 자리는 더 좁아졌다.` : W.text}\n${tail}`, choices: ch };
}

export const WV_CHOOSE = {
  wv_ev(s, r, i, okv, sc) {
    const job = sc?.wvJob, n = sc?.wvN === 2 ? 2 : 1, W = WV(job, n), x = st(s)[RK(job, n)]; if (!W || !x) return [];
    if (W.own) { // 컨설팅 1차: 줄어드는 건 cs.js 가 한다. 여기선 첫걸음만
      x.mode = "own"; log(s, `[판 변화] ${W.head}`, "work");
      if (i === 1 && s.cs) { s.cs.offers = Math.min(D.CS_LECT.maxOffers, (s.cs.offers || 0) + 1); return ["강의 섭외 +1"]; }
      return [];
    }
    const c = sc.choices[i] || {}, was = x.mode;
    if (i === 0) { x.mode = "shift"; x.mt = s.t; }
    else if (c.wv === "half") { x.mode = "half"; x.mt = s.t; }
    else if (!was) { x.mode = "stay"; x.mt = s.t; }
    log(s, `[판 변화] ${W.head} (${jobN(job)})`, "work");
    const B = WV_BAL;
    if (x.mode === "shift") return [`${jobN(job)} 이익 −${pct(B.shiftDip)}% · ${B.shiftMo}개월 뒤 원래대로`];
    return [`${jobN(job)} 이익 −${pct(cut1(s, job, n))}% · 해마다 더 줄어요`];
  },
};

// 시험용: 조건 없이 경고 장면을 만든다(n: 1차·2차)
export function waveScene(s, job, late, n = 1) { const V = st(s), k = RK(job, n); if (!WV(job, n)) return null; if (!V[k]) V[k] = { t: s.t, askT: s.t }; if (late && !V[k].mode) { V[k].mode = "stay"; V[k].mt = s.t; V[k].t = s.t - 24; } return scene(s, job, n, !!late); }
