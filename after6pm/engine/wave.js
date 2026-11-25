// 판이 바뀐다(11-23). 투잡마다 두 번 오는 큰 변화(1차 8~10년 차 WAVES, 2차 15~18년 차 WAVES2). WARNING 화면(ui.js warnPlay) → 대응을 고른다.
// 시장 충격(market.js)은 몇 달 뒤 끝나지만, 이건 끝나지 않는다. 하던 대로 가면 해마다 더 줄고, 길을 갈아타면 여섯 달 고생 뒤 원래대로 번다.
// 분기(11-23 밤): 1차에 길 A·길 B 중 하나를 고른다(길마다 조건 능력치가 다르다). 2차에는 판마다 둘 중 한 길이 크게 맞는다(s.wv._hit).
//   맞은 길에 있으면 → 다른 길로 넘어가기 / 그 길을 더 깊게 파기 / 반만 / 버티기. 비켜 간 길에 있으면 3분의 1만 준다. 2차 1년쯤 전에 예고가 뜬다.
//   조건을 못 채우면 "준비한다"(그동안 하던 대로와 같이 준다) → 채운 달에 다시 묻는다. 파티룸 1차는 prwave.js(컨셉 위기), 2차는 여기(파티룸 전체).
// core.js endMonth 에서 marketMonth 바로 뒤에 waveMonth(s, r, notes, scenes). onChoose 는 "wv_ev"(WV_CHOOSE).
// 돈: 그 투잡의 이번 달 이익 × 감소율 → 장부 "판 변화"(지출). 컨설팅 1차는 cs.js aiCut 이 문의·단가를 직접 줄이므로 여기선 경고 장면과 길만 다룬다.
// 상태: s.wv = { [job](1차)·[job+"2"](2차): { t, mode: "shift"|"half"|"stay"|"prep"|"own", mt, askT, askN, path: "a"|"b"(1차에 탄 길), hit(2차에 맞은 길), dodge, prepFor }, _at, _hit, _pre }
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import { addMoney, log } from "./core.js";
import { profitOf } from "./rival.js";
import { CS_AI, aiDrop } from "./cs.js";
import { prWaveMonth } from "./prwave.js";
import { prFill, eligible as clubOk } from "./jobs/club.js"; // 파티룸 2차 길 B: 모임으로 채운다
import * as SJ from "./sj.js";
import * as RD from "./round.js"; // 판 변화는 2회차부터 // 파티룸은 1차 대신 컨셉별 위기가 차례로 온다

export const WV_LABEL = "판 변화";
// at: 게임 몇 달째에 오나([1차, 2차]. 8~10년 차와 15~18년 차. 판마다·투잡마다 이 사이에서 따로 정한다) · between: 1차와 2차 사이 최소 간격(달) · minTen: 그 투잡을 시작하고 적어도 이만큼은 지나야 온다 · gap: 경고 화면끼리 최소 간격(달)
// first·perYear·cap: 하던 대로 가면 첫해·해마다·최대 감소 · half: 반만 대응하면 감소의 몇 배 · shiftMo/shiftDip: 갈아타는 동안(달)·그동안 감소 · again: 다시 묻는 간격(달) · late: 늦게 갈아타면 비용 배수
// dodge: 2차가 내 길을 비켜 갔을 때 감소의 몇 배 · pre: 2차 예고가 몇 달 전에 뜨나
export const WV_BAL = { at: [[96, 120], [180, 216]], between: 36, minTen: 12, gap: 3, first: 0.08, perYear: 0.07, cap: 0.4, capMax: 0.7, half: 0.5, shiftMo: 6, shiftDip: 0.15, again: 24, askMax: 2, late: 1.5, dodge: 0.33, pre: 14 };
// 투잡마다 세기(k): 이익에서 투잡이 차지하는 몫이 달라서, 하던 대로 갔을 때 파이어율이 비슷하게(8~10%p) 떨어지도록 맞춘 값(봇 200판)
export const WV_K = { cs: 1, pr: 1, insta: 0.6, airbnb: 0.9, ucafe: 1.6, tarot: 1, webnovel: 1.6, tutoring: 1.2, chicken: 0.6, vibe: 1.4, petsit: 1 };
if (typeof process !== "undefined" && process.env?.WVK) Object.assign(WV_K, JSON.parse(process.env.WVK)); // 봇 시험용
// 길마다 조건: a·b = 1차 길 A·B, da·db = 2차에 그 길을 더 깊게 팔 때, r2 = 길이 하나뿐인 2차(파티룸). [능력치, 필요 값]
// 숫자는 봇 120판 분포로 잡은 임시 값. 컨설팅 길 A(경력 이직)는 cs.js 의 분야 조건(커리어 120·회사 5년)이 따로 있다
export const WV_REQ = {
  cs: { b: ["talk", 130], da: ["career", 150], db: ["talk", 155] }, pr: { r2: ["num", 105], fill: ["charm", 100] },
  insta: { a: ["talk", 70], b: ["write", 70], da: ["num", 110], db: ["write", 105] }, airbnb: { a: ["hands", 110], b: ["lang", 110], da: ["talk", 125], db: ["num", 110] },
  petsit: { a: ["charm", 80], b: ["sense", 90], da: ["talk", 105], db: ["sense", 120] }, // 11-24 길 A 돌봄 회사(본업화) · 길 B 노령·환묘 전문
  ucafe: { a: ["mkt", 90], b: ["sense", 50], da: ["num", 110], db: ["hands", 155] }, tarot: { a: ["talk", 130], b: ["mkt", 85], da: ["mkt", 115], db: ["sense", 100] },
  webnovel: { a: ["mkt", 85], b: ["write", 110], da: ["num", 120], db: ["sense", 115] }, tutoring: { a: ["career", 95], b: ["talk", 130], da: ["career", 120], db: ["talk", 155] },
  chicken: { a: ["talk", 60], b: ["num", 85], da: ["hands", 140], db: ["num", 115] }, vibe: { a: ["sense", 90], b: ["career", 100], da: ["num", 150], db: ["talk", 80] },
};
if (typeof process !== "undefined" && process.env?.WVREQ) Object.assign(WV_REQ, JSON.parse(process.env.WVREQ)); // 봇 시험용
// 3회차 특전(회차구조 시안, 대표 승인): 지난 판에 안 가 본 길만 조건 −10. tok = "투잡:길"(지난 판들에 간 길은 s.ng.wvGone)
const reqCutFor = (s, tok) => (tok && (s.ng?.wvGone || []).includes(tok) ? 0 : RD.reqCut(s));
const rq = (s, q, tok) => { if (!q || !q[0] || !q[1] || (typeof process !== "undefined" && process.env?.WVNOREQ)) return null; const cur = Math.floor(s.st?.[q[0]] || 0), need = Math.max(1, q[1] - reqCutFor(s, tok)); return { k: q[0], n: D.STATS[q[0]] || q[0], need, cur, ok: cur >= need }; };
const bal = (job) => { const k = WV_K[job] ?? 1, B = WV_BAL, r2 = (x) => Math.round(x * 100) / 100; return { first: r2(B.first * k), perYear: r2(B.perYear * k), cap: Math.min(B.capMax, r2(B.cap * k)) }; };
const M = (s, x) => Math.max(5, Math.round(x * SYN.pi(s) / 5) * 5); // 만원, 물가 반영

// 1차. ch: [길 A(글, 결과, 비용 만원), 반만 대응(글, 결과, 비용), 하던 대로(글, 결과)] · b: 길 B(글, 결과, 비용)
export const WAVES = {
  cs: { b: ["면접 코칭 전문으로 간다", "\"면접은 안 변한다. 결국 사람이 사람을 본다.\" 간판을 면접 전문으로 바꿨다."], head: "AI가 취업판을 지배한다", n: "AI 대세", own: true,
    text: "취준생 열에 아홉이 AI로 자소서를 쓴다. 기업은 AI로 서류를 거른다. 커뮤니티에는 \"첨삭 받을 돈으로 구독료 낸다\"는 글이 돈다. 신입 자소서 첨삭은 해마다 줄어들 판이다. 사람 손이 끝까지 남는 곳은 경력 이직이다. 강의는 당분간 버팀목이 된다.",
    ch: [["경력 이직 쪽으로 넓힐 준비를 한다", "경력기술서와 연봉 협상을 다시 공부했다. 이직 상담은 AI가 대신 못 한다."], ["대학 커리어센터에 강의 제안서를 돌린다", "\"AI 시대 자소서\" 특강 제안에 한 곳이 답했다. 강의 섭외가 들어왔다."], ["하던 대로 신입 자소서를 본다", "아직은 문의가 온다. 내년에도 올지는 모르겠다."]] },
  pr: { off: true, /* 11-23 새로 뜨지 않는다: 파티룸 1차는 prwave.js 의 컨셉 위기. 이미 겪은 판의 상태만 유지 */ head: "여럿이 모이는 시대가 끝난다", n: "모임 문화 변화",
    text: "스무 명 생일 파티 예약이 사라졌다. 요즘 손님은 둘셋이 조용히 논다. 회사 회식도 점심으로 바뀌었다. 큰 방 하나를 통째로 빌려주는 방식으로는 해마다 주말이 빈다.",
    ch: [["큰 방을 쪼개 2~4인 프라이빗 룸으로 갈아엎는다", "공사 먼지 속에서 여섯 달을 보냈다. 작은 방 셋이 큰 방 하나보다 잘 찬다.", 900], ["소규모 요금제와 촬영 대관만 더한다", "빈 타임 몇 개는 메웠다. 큰 흐름은 그대로다.", 200], ["하던 대로 단체 손님을 받는다", "단골 동아리가 있다. 그 동아리도 해마다 인원이 준다."]] },
  insta: { b: ["전문 분야 정보 계정으로 바꾼다", "예쁜 사진을 내리고 써 본 것만 정리해 올렸다. 여섯 달 뒤 저장 수가 좋아요 수를 넘었다.", 100], head: "가상 인플루언서가 협찬을 쓸어 간다", n: "가상 모델 시대",
    text: "광고주가 AI 가상 모델을 쓰기 시작했다. 지치지 않고, 사고도 안 치고, 단가는 십분의 일이다. \"제품 사진 예쁘게\"만으로 받던 협찬이 해마다 줄 판이다.",
    ch: [["얼굴과 일상을 걸고 라이브·공동구매로 간다", "어색한 첫 라이브를 지나자 \"진짜 사람이라 산다\"는 댓글이 달렸다.", 150], ["AI 편집 툴로 게시물 물량을 늘린다", "올리는 속도는 빨라졌다. 내 계정도 AI 계정처럼 보이기 시작했다.", 50], ["하던 대로 예쁜 사진을 올린다", "좋아요는 여전히 달린다. 협찬 메일은 뜸해졌다."]] },
  airbnb: { b: ["외국인 장기 손님 전문으로 간다", "안내문을 세 나라 말로 다시 썼다. 여섯 달 뒤 한 달씩 묵는 외국 손님이 달력을 채웠다.", 400], head: "호텔이 한 달 살기 시장에 들어왔다", n: "호텔의 반격",
    text: "대형 호텔 체인이 '한 달 살기 요금제'를 내놨다. 청소와 조식이 포함인데 내 숙소와 값이 같다. 깔끔한 방 하나로 받던 예약이 해마다 줄 판이다.",
    ch: [["호텔이 못 하는 '동네에 사는 집'으로 바꾼다", "주방·세탁기·동네 지도를 채웠다. 여섯 달 뒤 \"호텔보다 집 같다\"는 후기가 쌓였다.", 600], ["장기 숙박 할인만 넣는다", "예약 몇 건은 지켰다. 남는 건 줄었다.", 100], ["하던 대로 간다", "성수기는 아직 찬다. 비수기가 길어졌다."]] },
  ucafe: { b: ["디저트 무인 매장으로 바꾼다", "싼 커피와 겨루기를 그만뒀다. 여섯 달 뒤 케이크를 사러 오는 손님이 생겼다.", 450], head: "천오백 원 커피가 골목을 덮는다", n: "저가 커피 전쟁",
    text: "저가 커피 체인이 한 블록에 하나씩 들어섰다. 사람이 내려 주는데 내 무인카페보다 싸다. '무인이라 싸다'는 장점이 사라졌다. 커피만 팔아서는 해마다 손님이 빠진다.",
    ch: [["커피 대신 '머무는 자리'를 판다(좌석 구독·무인 간식)", "콘센트와 칸막이를 달고 구독권을 팔았다. 여섯 달 뒤 저녁 자리가 찼다.", 500], ["원두를 바꾸고 값을 맞춘다", "가격표는 따라갔다. 마진이 얇아졌다.", 120], ["하던 대로 간다", "단골은 아직 온다. 새 손님은 길 건너로 간다."]] },
  petsit: { b: ["노령·환묘 전문 시터로 남는다", "동물병원 두 곳과 손을 잡았다. 여섯 달 뒤, 아픈 고양이를 둔 보호자들이 먼저 연락한다. 큰돈은 아니어도 끊기지 않는다.", 90], head: "플랫폼이 수수료를 올리고 자격을 요구한다", n: "돌봄 자격·수수료",
    text: "돌봄 앱이 수수료를 올렸다. 다음 달부터는 자격이 없는 시터의 프로필을 내린다고 한다. 방문 한 번에 남는 돈이 더 줄었다. 혼자 다니는 방식은 해마다 줄 판이다. (본업화의 관문은 펫시팅 보드에서 풀어요. 길 A를 고르면 그쪽으로 서두르게 됩니다)",
    ch: [["돌봄 회사로 키운다(본업화)", "자격을 따고 영업장을 알아보기 시작했다. 여섯 달 뒤, 방문만 하던 때와는 다른 문의가 온다. 유치원, 호텔, 직원.", 300], ["플랫폼을 두 곳으로 늘려 버틴다", "예약은 채웠다. 수수료는 양쪽에 낸다.", 30], ["하던 대로 다닌다", "단골은 남았다. 새 문의는 자격 있는 시터에게 간다."]] },
  tarot: { b: ["영상 타로로 간다", "\"이번 주 운세\" 영상을 매주 올렸다. 여섯 달 뒤 구독자가 상담 예약으로 넘어온다.", 120], head: "AI 점술이 운세 판을 삼킨다", n: "AI 점술",
    text: "생년월일만 넣으면 30초 만에 풀이가 나온다. 무료다. 손님이 묻는다. \"앱이랑 뭐가 달라요?\" 십 분짜리 단건 상담은 해마다 줄 판이다.",
    ch: [["대면 '깊은 상담'과 타로 클래스로 간다", "한 시간짜리 상담과 주말 클래스를 열었다. 여섯 달 뒤 예약표가 다시 찼다.", 180], ["AI 풀이를 곁들인 저가 상담을 만든다", "가볍게 오는 손님은 잡았다. 단가는 내려갔다.", 50], ["내 방식대로 본다", "오던 손님은 온다. 새 손님이 줄었다."]] },
  webnovel: { b: ["한 장르만 파는 장인이 된다", "유행을 좇지 않고 한 장르만 팠다. 여섯 달 뒤 \"이 작가 글은 다르다\"는 댓글이 달렸다.", 80], head: "AI 양산작이 플랫폼을 덮는다", n: "AI 양산작 범람",
    text: "하루에 새 작품이 오백 편씩 올라온다. 절반은 AI가 썼다. 신작 목록에서 내 작품은 십 분 만에 밀려난다. 조회수만 보고 쓰는 방식으로는 해마다 정산이 준다.",
    ch: [["독자를 내 편으로 모은다(후원 연재·단행본·독자 모임)", "독자 모임에 열두 명이 왔다. 여섯 달 뒤 그 열두 명이 입소문이 됐다.", 120], ["AI로 초고 속도를 올려 물량으로 맞선다", "편수는 늘었다. 댓글에 \"요즘 글이 밋밋해요\"가 달렸다.", 40], ["하던 대로 쓴다", "쓰던 독자는 남았다. 새 독자가 안 온다."]] },
  tutoring: { b: ["면접·논술 전문으로 간다", "\"말하고 쓰는 건 사람이 봐 줘야 한다.\" 모의 면접과 첨삭으로 수업을 갈았다. 여섯 달 뒤 입시철 예약이 찼다.", 150], head: "AI 튜터가 과외 판을 삼킨다", n: "AI 튜터",
    text: "월 2만 원짜리 AI 튜터가 24시간 문제를 풀어 준다. 학부모가 묻는다. \"설명은 AI가 하는데, 선생님은 뭘 해 주시나요?\" 문제 풀이만 해 주는 과외는 해마다 줄 판이다.",
    ch: [["'관리형 과외'로 간다(계획·습관·입시 상담)", "주간 계획표와 학부모 보고서를 만들었다. 여섯 달 뒤 \"AI는 이걸 못 해요\"라는 소개가 돌았다.", 180], ["AI 문제집을 수업에 끼운다", "수업은 편해졌다. 수업료를 올리긴 어렵다.", 50], ["하던 대로 가르친다", "지금 학생은 남았다. 다음 학기 문의가 줄었다."]] },
  chicken: { b: ["홀을 접고 배달 전문 공유주방으로 간다", "임대료를 줄이고 배달 단가를 다시 계산했다. 여섯 달 뒤 주문당 남는 돈이 늘었다.", 600], head: "배달 판이 뒤집혔다", n: "배달 판 변화",
    text: "배달 앱이 '무료 배달'을 내걸고 그 값을 가게에 넘겼다. 큰 프랜차이즈는 자체 앱으로 빠져나갔다. 작은 가게만 남아 수수료를 낸다. 배달만 믿고 가면 해마다 남는 돈이 준다.",
    ch: [["홀·포장 중심 가게로 바꾼다", "테이블을 늘리고 포장 할인을 걸었다. 여섯 달 뒤 동네 단골이 배달 손님을 넘었다.", 800], ["값을 올리고 배달 반경을 줄인다", "주문 수는 줄었다. 한 마리에 남는 돈은 조금 지켰다.", 100], ["하던 대로 튀긴다", "주문 알림은 여전히 울린다. 정산서 숫자만 작아진다."]] },
  vibe: { b: ["한 업종 전문 외주로 간다", "업계 사정을 아는 개발자로 이름을 알렸다. 여섯 달 뒤 그 업종에서 소개가 돌았다.", 120], head: "말 한마디면 앱이 나온다", n: "외주 단가 붕괴",
    text: "고객사 대표가 AI로 홈페이지를 직접 만들어 봤다고 한다. \"이 정도면 쓸 만하던데요?\" 만들어 주기만 하는 일은 해마다 값이 내려갈 판이다.",
    ch: [["'만들기'에서 '운영·자동화 구독'으로 간다", "납품 뒤 월 구독으로 관리해 주는 상품을 만들었다. 여섯 달 뒤 구독 고객이 열 곳이 됐다.", 180], ["단가를 내리고 건수로 버틴다", "일은 늘었다. 시급은 내려갔다.", 0], ["하던 대로 견적을 낸다", "견적 답장이 늦어진다. 돌아오는 말은 \"조금만 더 싸게\"다."]] },
};

// 2차(15~18년 차). 투잡마다 a(길 A를 치는 사건)·b(길 B를 치는 사건) 둘 중 하나가 판마다 온다. 파티룸은 하나(전체가 맞는다, ch 형식).
// pre: 예고 한 줄 · deep: 그 길을 더 깊게 파기(글, 결과, 비용) · half: 반만 대응(글, 결과, 비용) · stay: 버티기(글, 결과)
export const WAVES2 = {
  pr: { head: "대기업이 파티룸 체인을 열었다", n: "대기업 파티룸 체인", pre: "대기업이 파티룸 체인 사업에 들어온다는 기사가 나와요. 파티룸 전체가 흔들릴 수 있어요",
    text: "대기업이 역마다 파티룸 체인을 열었다. 앱 하나로 예약하고, 값은 내 지점의 칠 할이고, 청소 로봇이 돈다. 검색 첫 줄이 전부 그 간판이다. 컨셉이 무엇이든, 방만 빌려줘서는 해마다 예약이 준다.",
    fill: ["평일 밤과 주말 낮을 모임으로 채운다", "모임방장들에게 명함을 돌리고, 내 모임도 하나 만들기로 했다. 빈 달력에 요일마다 모임 이름이 적히기 시작했다.", 200],
    ch: [["촬영·팝업 행사 공간으로 바꾼다", "조명과 배경을 새로 달았다. 여섯 달 뒤 평일 낮이 촬영 예약으로 찼다.", 1000], ["기업 워크숍 패키지만 더한다", "분기에 몇 건은 들어온다. 주말 빈 타임은 그대로다.", 250], ["하던 대로 받는다", "단골은 아직 온다. 처음 오는 손님은 체인 앱에서 예약한다."]] },
  cs: {
    a: { head: "AI 헤드헌터가 이직판을 먹는다", n: "AI 헤드헌터", pre: "채용 플랫폼들이 'AI 헤드헌터'를 시험한다는 기사가 나와요. 경력 이직 상담이 흔들릴 수 있어요",
      text: "채용 플랫폼이 AI 헤드헌터를 풀었다. 경력기술서를 넣으면 맞는 자리와 예상 연봉이 바로 나온다. 연봉 협상 문구까지 써 준다. 이직 상담은 해마다 값이 내려갈 판이다.",
      deep: ["임원·고연차 코칭으로 올라간다", "부장급 이직과 임원 면접을 맡기 시작했다. 여섯 달 뒤 소개가 소개를 불렀다.", 300], half: ["AI 리포트 해설 상담을 만든다", "가볍게 오는 손님은 잡았다. 단가는 내려갔다.", 80], stay: ["하던 대로 상담한다", "소개로 오는 손님은 있다. 검색으로 오는 손님이 끊겼다."] },
    b: { head: "AI 면접관이 채용을 끝낸다", n: "AI 채용", pre: "대기업들이 'AI 면접'을 정식 전형으로 넣는다는 기사가 나와요. 면접 코칭이 흔들릴 수 있어요",
      text: "대기업이 서류부터 면접까지 AI로 뽑기 시작했다. 지원자는 AI 면접관과 연습한다. \"면접은 안 변한다\"던 믿음이 흔들린다. 예상 질문을 뽑아 주고 답을 봐 주는 코칭은 해마다 값이 내려갈 판이다.",
      deep: ["기업 출강·면접관 교육으로 간다", "인사팀을 찾아다니며 제안서를 돌렸다. 여섯 달 뒤 면접관 교육 계약이 두 건 잡혔다.", 300], half: ["'AI 면접 대비' 반을 연다", "수강생은 모였다. 석 달 뒤 같은 반이 무료 앱으로 나왔다.", 80], stay: ["하던 대로 코칭한다", "소개로 오는 손님은 있다. 검색으로 오는 손님이 끊겼다."] } },
  insta: {
    a: { head: "라이브 판매 수수료가 두 배가 됐다", n: "라이브 수수료 인상", pre: "플랫폼이 라이브 판매 수수료를 올린다는 공지를 준비한대요. 라이브·공동구매가 흔들릴 수 있어요",
      text: "플랫폼이 라이브 판매 수수료를 두 배로 올렸다. 반품 책임도 판매자에게 넘겼다. 팔수록 남는 게 없다. 플랫폼 안에서만 파는 방식은 해마다 남는 돈이 준다.",
      deep: ["내 이름으로 브랜드와 자체 몰을 만든다", "첫 제품은 삼백 개를 겨우 팔았다. 여섯 달 뒤 재구매 손님이 생겼다.", 200], half: ["방송 횟수를 줄이고 단가 높은 물건만 판다", "수수료는 덜 낸다. 매출도 같이 줄었다.", 40], stay: ["하던 대로 방송한다", "보는 사람은 여전히 많다. 정산서 숫자만 작아진다."] },
    b: { head: "AI 요약이 정보 계정을 대신한다", n: "AI 요약", pre: "검색 앱들이 'AI 요약 답변'을 맨 위에 올린대요. 정보 계정이 흔들릴 수 있어요",
      text: "사람들이 궁금한 걸 AI에게 묻는다. AI는 내 게시물을 읽고 세 줄로 답한다. 내 계정까지 들어오는 사람이 없다. 정보만 올리는 계정은 해마다 도달이 준다.",
      deep: ["유료 구독 소식지를 만든다", "첫 달 구독자는 마흔 명이었다. 여섯 달 뒤 구독료가 협찬비를 넘었다.", 150], half: ["정보에 내 경험담을 섞는다", "저장 수는 조금 돌아왔다. 큰 흐름은 그대로다.", 40], stay: ["하던 대로 올린다", "오래된 팔로워는 남았다. 새 팔로워가 안 붙는다."] } },
  airbnb: {
    a: { head: "빈집 숙소가 쏟아진다", n: "숙소 공급 과잉", pre: "지자체들이 빈집을 고쳐 숙소로 푼다는 계획을 내놨어요. '동네에 사는 집'이 흔들릴 수 있어요",
      text: "지자체가 빈집을 고쳐 숙소로 풀었다. 주방도 마당도 있는데 하룻밤 값이 내 숙소의 절반이다. '집 같은 숙소'는 이제 흔하다. 해마다 예약이 줄 판이다.",
      deep: ["숙소에 '할 거리'를 붙인다(체험·워케이션 묶음)", "동네 공방과 묶음 상품을 만들었다. 여섯 달 뒤 사흘 넘게 묵는 손님이 늘었다.", 700], half: ["값을 내리고 청소 횟수를 줄인다", "예약은 지켰다. 남는 돈과 별점이 같이 내려갔다.", 100], stay: ["하던 대로 간다", "단골 손님은 다시 온다. 처음 오는 손님이 줄었다."] },
    b: { head: "환율이 뒤집혀 외국 손님이 끊겼다", n: "환율 역전", pre: "환율이 크게 움직일 거라는 전망이 나와요. 외국인 손님 장사가 흔들릴 수 있어요",
      text: "환율이 뒤집혔다. 외국 손님에게 이 나라가 갑자기 비싼 여행지가 됐다. 석 달 치 예약이 줄줄이 취소됐다. 외국 손님만 보고 가면 해마다 빈 날이 는다.",
      deep: ["기업 출장 숙소 계약을 딴다", "근처 회사 세 곳과 장기 계약을 맺었다. 여섯 달 뒤 평일이 먼저 찬다.", 500], half: ["내국인용 할인 요금을 만든다", "빈 날 몇 개는 메웠다. 받는 값은 내려갔다.", 100], stay: ["환율이 돌아오길 기다린다", "문의는 가끔 온다. 달력은 듬성듬성하다."] } },
  ucafe: {
    a: { head: "스터디카페가 커피를 공짜로 준다", n: "공짜 커피", pre: "스터디카페 체인들이 '음료 무제한'을 내건대요. 자리를 파는 무인카페가 흔들릴 수 있어요",
      text: "스터디카페 체인이 좌석료에 커피를 무제한으로 끼웠다. 자리도 음료도 저쪽이 낫다. 좌석 구독을 끊는 손님이 줄을 선다. 자리만 파는 방식은 해마다 손님이 빠진다.",
      deep: ["모임 대관과 정기권으로 간다", "저녁마다 독서 모임과 뜨개 모임이 들어왔다. 여섯 달 뒤 대관 매출이 좌석을 넘었다.", 500], half: ["좌석 값을 내리고 간식을 더 둔다", "떠나던 손님 몇은 잡았다. 남는 돈이 줄었다.", 120], stay: ["하던 대로 간다", "아는 손님은 온다. 구독 해지 알림이 달마다 온다."] },
    b: { head: "로봇 카페가 옆에 들어왔다", n: "로봇 카페", pre: "대기업이 로봇 카페를 동네마다 낸다는 계획을 발표했어요. 디저트 무인 매장이 흔들릴 수 있어요",
      text: "대기업 로봇 카페가 옆 건물에 들어왔다. 로봇 팔이 케이크를 접시에 올려 준다. 24시간이고 구경거리다. 내 가게 진열장은 십 년 된 자판기처럼 보인다. 해마다 손님이 빠질 판이다.",
      deep: ["무인 복합 매장으로 넓힌다", "간식·출력·택배함을 들였다. 여섯 달 뒤 디저트보다 다른 매출이 커졌다.", 600], half: ["기계를 새것으로 바꾼다", "맛은 따라갔다. 구경거리는 저쪽에 있다.", 200], stay: ["하던 대로 간다", "아는 손님은 온다. 지나가던 손님은 로봇 쪽으로 간다."] } },
  petsit: {
    a: { head: "대형 펫 호텔 체인이 동네에 들어왔다", n: "대형 펫 호텔", pre: "큰 회사가 펫 호텔 체인을 동네마다 낸다는 기사가 늘었어요. 돌봄 회사가 흔들릴 수 있어요",
      text: "역 앞에 5층짜리 펫 호텔이 문을 열었다. 수영장이 있고 24시간 카메라가 돈다. 첫 달은 반값이다. 유치원 회원 몇이 체험을 다녀왔다. 규모로 맞서는 방식은 해마다 줄 판이다.",
      deep: ["우리 동네, 우리 아이를 아는 돌봄으로 좁힌다", "아이마다 담당 시터를 정하고 보호자에게 매일 손글씨 같은 보고를 보냈다. 여섯 달 뒤, 체험 갔던 집들이 돌아왔다.", 400], half: ["체인과 제휴해 방문 돌봄을 맡는다", "일감은 생겼다. 값은 그쪽이 정한다.", 80], stay: ["하던 대로 운영한다", "오래된 회원은 남았다. 새 회원이 그쪽으로 간다."] },
    b: { head: "집마다 카메라와 자동 급식기가 달렸다", n: "돌봄 기계 보급", pre: "자동 급식기와 집 카메라가 흔해진다는 기사가 늘었어요. 방문 돌봄이 흔들릴 수 있어요",
      text: "보호자들이 휴대폰으로 밥을 주고 카메라로 본다. '하루 한 번이면 될 것 같아요.' 방문 횟수가 줄었다. 밥과 물만 보는 방문은 해마다 줄 판이다.",
      deep: ["기계가 못 보는 것을 보는 돌봄으로 간다", "먹는 양, 걸음걸이, 숨는 자리의 변화를 기록해 병원과 나눴다. 여섯 달 뒤, 수의사가 보호자에게 나를 소개한다.", 250], half: ["기계 설치와 점검을 같이 판다", "설치하는 날은 돈이 된다. 그 뒤로는 부를 일이 줄어든다.", 60], stay: ["하던 대로 다닌다", "여행이 긴 집만 남았다."] } },
  tarot: {
    a: { head: "회사가 마음 상담을 공짜로 준다", n: "무료 상담 복지", pre: "회사들이 심리 상담을 복지로 넣는다는 기사가 늘었어요. 깊은 대면 상담이 흔들릴 수 있어요",
      text: "회사마다 심리 상담을 복지로 넣었다. 고민을 털어놓으러 오던 직장인 손님이 그쪽으로 간다. \"상담은 회사에서 받아요. 타로는 재미로만요.\" 한 시간짜리 상담은 해마다 줄 판이다.",
      deep: ["기업 행사·출장 타로로 간다", "송년회와 팝업 행사에 부스를 냈다. 여섯 달 뒤 행사 문의가 먼저 온다.", 200], half: ["상담 뒤 기록지를 만들어 준다", "받은 손님은 좋아한다. 새 손님을 부르지는 못한다.", 40], stay: ["내 방식대로 본다", "오래된 손님은 온다. 한 번 오고 마는 손님이 늘었다."] },
    b: { head: "운세 영상이 넘쳐 조회수가 반 토막", n: "운세 영상 범람", pre: "AI로 만든 운세 영상 채널이 하루에 수백 개씩 생긴대요. 영상 타로가 흔들릴 수 있어요",
      text: "AI가 만든 운세 영상이 하루에 수백 편 올라온다. 목소리도 카드도 그럴듯하다. 내 영상은 추천에서 밀렸다. 조회수로 버는 방식은 해마다 수익이 준다.",
      deep: ["내 타로 덱과 굿즈를 만든다", "직접 그린 카드 덱을 냈다. 여섯 달 뒤 덱을 산 사람들이 상담까지 예약한다.", 200], half: ["실시간 방송으로 바꾼다", "채팅창은 살아났다. 밤마다 두 시간을 써야 한다.", 40], stay: ["하던 대로 올린다", "구독자는 그대로다. 조회수만 줄었다."] } },
  webnovel: {
    a: { head: "후원 플랫폼이 수수료를 올렸다", n: "후원 수수료 인상", pre: "후원 연재 플랫폼이 수수료 정책을 바꾼다는 소문이 돌아요. 독자 후원으로 버는 길이 흔들릴 수 있어요",
      text: "후원 플랫폼이 수수료를 삼십 퍼센트로 올렸다. 독자가 낸 돈의 셋 중 하나가 사라진다. 독자 모임을 열 돈도 빠듯하다. 플랫폼에 기댄 후원은 해마다 남는 돈이 준다.",
      deep: ["단행본과 굿즈를 직접 판다", "소장판을 찍어 내 주소로 주문을 받았다. 여섯 달 뒤 한 권 값이 후원 석 달 치가 됐다.", 150], half: ["후원 등급을 다시 짠다", "큰손 독자는 남았다. 소액 후원이 빠졌다.", 30], stay: ["하던 대로 연재한다", "독자는 그대로다. 정산서만 얇아진다."] },
    b: { head: "독자가 숏드라마로 넘어갔다", n: "숏드라마 시대", pre: "플랫폼들이 연재 지원금을 줄이고 숏드라마에 돈을 쓴대요. 글만 쓰는 길이 흔들릴 수 있어요",
      text: "출퇴근길 독자가 일 분짜리 드라마를 본다. 플랫폼은 연재 지원금을 줄이고 영상에 돈을 쓴다. 문장이 아무리 좋아도 읽는 사람이 준다. 글만 올려서는 해마다 정산이 준다.",
      deep: ["내 작품을 숏드라마·웹툰 원작으로 판다", "각본 쓰는 법을 새로 배웠다. 여섯 달 뒤 판권 계약서에 도장을 찍었다.", 150], half: ["회차를 짧게 쪼개 올린다", "읽는 속도는 맞췄다. 회당 정산도 쪼개졌다.", 30], stay: ["하던 대로 쓴다", "완결까지 따라오는 독자는 있다. 첫 화에서 나가는 독자가 늘었다."] } },
  tutoring: {
    a: { head: "학교가 학습 관리 앱을 공짜로 푼다", n: "무료 관리 앱", pre: "교육청이 AI 학습 관리 앱을 전교생에게 나눠 준다는 계획이 나왔어요. 관리형 과외가 흔들릴 수 있어요",
      text: "교육청이 학습 관리 앱을 전교생에게 풀었다. 계획표를 짜 주고, 진도를 재고, 학부모에게 보고서를 보낸다. 내가 돈 받고 하던 일이다. 관리만 해 주는 과외는 해마다 줄 판이다.",
      deep: ["성인 수강생으로 간다(직장인 영어·자격증)", "퇴근 뒤 반을 열었다. 여섯 달 뒤 직장인 수강생이 학생 수를 넘었다.", 200], half: ["형제 할인과 그룹 수업을 만든다", "빈 시간 몇 개는 채웠다. 시간당 받는 돈은 줄었다.", 30], stay: ["하던 대로 가르친다", "지금 학생은 졸업까지 간다. 그 뒤가 비어 있다."] },
    b: { head: "입시가 바뀌어 면접·논술이 사라진다", n: "입시 개편", pre: "교육부가 '면접·논술 축소'를 검토한다는 기사가 나와요. 면접·논술 전문 과외가 흔들릴 수 있어요",
      text: "입시 개편안이 나왔다. 대학별 면접과 논술이 사라지고 시험 점수로만 뽑는다. \"말하고 쓰는 건 사람이 봐 줘야 한다\"던 내 간판이 쓸모없어졌다. 해마다 문의가 줄 판이다.",
      deep: ["학부모 진로 상담으로 간다", "학생 대신 학부모를 만나기 시작했다. 여섯 달 뒤 상담 한 번 값이 수업 네 번 값이 됐다.", 200], half: ["취업 면접 준비생을 받는다", "대학생 몇이 왔다. 고등학생만큼 오래 다니지는 않는다.", 30], stay: ["남은 전형에 매달린다", "지금 학생은 졸업까지 간다. 그 뒤가 비어 있다."] } },
  chicken: {
    a: { head: "동네 술자리가 사라졌다", n: "술자리 실종", pre: "젊은 층이 술을 안 마신다는 통계가 해마다 나와요. 홀 장사가 흔들릴 수 있어요",
      text: "퇴근길에 치킨에 맥주 한잔하던 손님이 줄었다. 술을 안 마시고, 모여도 일찍 헤어진다. 테이블을 늘린 홀이 저녁에도 빈다. 홀만 믿고 가면 해마다 남는 돈이 준다.",
      deep: ["우리 가게만의 메뉴를 내건 가게로 바꾼다", "메뉴판을 갈고 간판을 새로 달았다. 여섯 달 뒤 \"여기서만 먹는다\"는 손님이 생겼다.", 900], half: ["점심 치킨 덮밥을 판다", "낮 손님이 조금 생겼다. 저녁 매출만큼은 안 된다.", 100], stay: ["하던 대로 튀긴다", "맛을 아는 단골은 온다. 빈 테이블이 는다."] },
    b: { head: "로봇이 닭을 튀긴다", n: "로봇 주방", pre: "큰 프랜차이즈들이 로봇 주방을 깐다는 발표를 했어요. 배달 전문 가게가 흔들릴 수 있어요",
      text: "큰 프랜차이즈가 로봇 주방을 깔고 한 마리 값을 내렸다. 배달 단가를 계산으로 이기던 내 가게는 이제 값을 못 맞춘다. 같은 치킨으로 맞서면 해마다 남는 돈이 준다.",
      deep: ["밀키트와 납품으로 넓힌다", "양념 닭을 포장해 동네 마트에 넣었다. 여섯 달 뒤 납품 매출이 배달을 받쳐 준다.", 700], half: ["세트 메뉴로 한 상 값을 올린다", "주문 한 건에 남는 돈은 조금 늘었다. 주문 수는 계속 준다.", 100], stay: ["하던 대로 튀긴다", "주문 알림은 울린다. 값을 보는 손님은 떠났다."] } },
  vibe: {
    a: { head: "AI가 운영까지 맡는다", n: "AI 운영 대행", pre: "AI 에이전트가 사이트 운영까지 한다는 시연 영상이 돌아요. 운영 구독이 흔들릴 수 있어요",
      text: "AI 에이전트가 사이트를 고치고, 장애를 잡고, 보고서까지 쓴다. 고객사가 묻는다. \"관리비를 계속 내야 하나요?\" 만들고 돌봐 주는 구독은 해마다 값이 내려갈 판이다.",
      deep: ["한 업종만 파서 내 서비스를 만든다", "동네 학원용 예약 서비스를 냈다. 여섯 달 뒤 돈 내는 곳이 서른 군데가 됐다.", 250], half: ["AI 에이전트 세팅 대행을 한다", "일거리는 생겼다. 한 번 해 주면 끝나는 일이다.", 30], stay: ["하던 대로 관리해 준다", "오래된 고객사는 남았다. 계약 갱신 때마다 금액이 깎인다."] },
    b: { head: "그 업종 대형 솔루션이 나왔다", n: "대형 솔루션 등장", pre: "큰 회사가 내가 맡던 업종용 솔루션을 만든다는 소문이 돌아요. 한 업종 전문 외주가 흔들릴 수 있어요",
      text: "큰 회사가 그 업종 전용 솔루션을 월 몇만 원에 내놨다. 내가 석 달 걸려 만들던 기능이 기본으로 들어 있다. 고객사가 하나둘 갈아탄다. 업종 하나에 기댄 외주는 해마다 일이 준다.",
      deep: ["실무자 교육·강의로 간다", "그 솔루션을 잘 쓰는 법을 가르치기 시작했다. 여섯 달 뒤 강의 문의가 외주 문의를 넘었다.", 150], half: ["그 솔루션에 붙이는 부가 기능을 만든다", "틈새 일은 생겼다. 큰 회사가 업데이트하면 사라질 일이다.", 30], stay: ["하던 대로 견적을 낸다", "오래된 고객사는 남았다. 새 문의가 없다."] } },
};

const st = (s) => (s.wv = s.wv || {});
const jobN = (j) => D.SIDEJOBS[j]?.n || j;
const pct = (x) => Math.round(x * 100);
const RK = (job, n) => (n === 2 ? job + "2" : job); // 상태 키
const hitOf = (s, job) => s.wv?.[job + "2"]?.hit || s.wv?._hit?.[job] || "a"; // 2차에 어느 길이 맞나
const W2 = (s, job) => { const w = WAVES2[job]; return !w ? null : w.ch ? w : w[hitOf(s, job)]; };
const WV = (s, job, n) => (n === 2 ? W2(s, job) : WAVES[job]);
const halfOf = (W) => W.half || W.ch[1], stayOf = (W) => W.stay || W.ch[2];
// 지금 타고 있는 길. 컨설팅은 경력 이직 분야를 열었으면 a, 면접 전문을 골랐으면 b
export function pathNow(s, job) {
  const x = s.wv?.[job];
  if (job === "cs") return s.cs?.niches?.includes("career") ? "a" : x?.path === "b" ? "b" : null;
  return x?.mode === "shift" ? x.path || "a" : null;
}
// 갈아탈 수 있는 길들: [{ key, t, res, cost, q(조건) }]
function opts(s, job, n) {
  const W1 = WAVES[job], R = WV_REQ[job] || {};
  if (n !== 2) return [{ key: "a", t: W1.ch[0][0], res: W1.ch[0][1], cost: W1.ch[0][2], q: rq(s, R.a, `${job}:a`) }, W1.b && { key: "b", t: W1.b[0], res: W1.b[1], cost: W1.b[2], q: rq(s, R.b, `${job}:b`) }].filter(Boolean);
  const W = W2(s, job); if (!W) return [];
  if (W.ch) { const out = [{ key: "r2", t: W.ch[0][0], res: W.ch[0][1], cost: W.ch[0][2], q: rq(s, R.r2, `${job}:r2`) }];
    if (W.fill) { const q = rq(s, R.fill, `${job}:fill`) || { k: "charm", n: "매력", need: 0, cur: 0, ok: true }, hob = clubOk(s); out.push({ key: "fill", t: W.fill[0], res: W.fill[1], cost: W.fill[2], q: { ...q, n: hob ? q.n : `모이는 취미 6번 + ${q.n}`, ok: q.ok && hob } }); } // 길 B: 취미 경험 + 매력
    return out; }
  const hit = hitOf(s, job), other = hit === "a" ? "b" : "a", cur = pathNow(s, job), out = [];
  if (cur === hit && W.deep) out.push({ key: "d", t: W.deep[0], res: W.deep[1], cost: W.deep[2], q: rq(s, R["d" + hit], `${job}:d${hit}`) });
  const o = other === "a" ? W1.ch[0] : W1.b;
  if (o && !(job === "cs" && other === "a")) out.push({ key: "x" + other, t: `길을 바꾼다: ${o[0]}`, res: o[1], cost: o[2] || 0, q: rq(s, R[other], `${job}:${other}`) }); // 컨설팅의 경력 이직은 분야 화면에서 연다
  return out;
}
// 한 차수의 감소율(0~cap). 컨설팅 1차는 cs.js 가 직접 줄이므로 0
function cut1(s, job, n) {
  const W = WV(s, job, n), x = s.wv?.[RK(job, n)]; if (!W || (n !== 2 && W.own) || !x || !x.mode) return 0;
  const B = WV_BAL, J = bal(job);
  if (x.mode === "shift") return s.t - x.mt < B.shiftMo ? B.shiftDip : 0;
  let base = Math.min(J.cap, J.first + Math.max(0, (s.t - x.t) / 12) * J.perYear) * (x.mode === "half" ? B.half : 1);
  if (x.mode === "fill") base *= 1 - prFill(s); // 파티룸 길 B: 유치한 모임과 내 모임 회원만큼 풀린다
  if (x.dodge || (n === 2 && job === "cs" && x.hit && pathNow(s, job) && pathNow(s, job) !== x.hit)) base *= B.dodge; // 내 길을 비켜 갔다(컨설팅은 나중에 다른 길을 열어도)
  return +base.toFixed(3);
}
// 그 투잡의 지금 감소율(1차·2차를 곱으로 합친다)
export function cutOf(s, job) { return +(1 - (1 - cut1(s, job, 1)) * (1 - cut1(s, job, 2))).toFixed(3); }
// 보드·안내용(2차가 왔으면 2차 이름으로)
export function waveInfo(s, job) {
  const x2 = s.wv?.[RK(job, 2)], w2 = W2(s, job), cut = cutOf(s, job);
  const need = (n) => { const u = opts(s, job, n).map((o) => o.q).filter((q) => q && !q.ok); return u[0] || null; };
  if (x2 && w2) {
    const left = x2.mode === "shift" ? Math.max(0, WV_BAL.shiftMo - (s.t - x2.mt)) : 0, m1 = s.wv?.[job]?.mode;
    const mode = x2.mode === "shift" && !left && cut > 0 && m1 && m1 !== "own" ? m1 : x2.mode || "stay"; // 2차는 갈아탔는데 1차가 남아 있으면 1차 상태로
    return { n: w2.n, head: w2.head, cut, mode, left, round: 2, req: need(2), dodge: !!x2.dodge };
  }
  const W = WAVES[job], x = s.wv?.[job]; if (!W || !x) return null;
  if (W.own) { const d = aiDrop(s); return d >= 5 ? { n: W.n, head: W.head, cut: d / 100, mode: s.cs?.niches?.includes("career") ? "shift" : "stay", own: true } : null; }
  const left = x.mode === "shift" ? Math.max(0, WV_BAL.shiftMo - (s.t - x.mt)) : 0;
  return { n: W.n, head: W.head, cut, mode: x.mode, left, round: 1, req: need(1), path: x.path };
}
const tenure = (s, job) => { const p = s.sj?.rp?.[job]; return p && typeof p.t0 === "number" ? s.t - p.t0 : -1; };
const pathT = (job, k) => (k === "a" ? WAVES[job].ch[0][0] : WAVES[job].b?.[0]) || "";

export function waveMonth(s, r, notes, scenes) {
  if (typeof process !== "undefined" && process.env?.WVOFF) return; // 봇 시험용: 끄고 비교
  const V = st(s), AT = (V._at = V._at || {}), HIT = (V._hit = V._hit || {}), PRE = (V._pre = V._pre || {}), B = WV_BAL;
  if (scenes.some((q) => q.warn)) s.warnT = s.t; // 시장 충격 경고가 이번 달에 떴다
  prWaveMonth(s, r, notes, scenes);
  if (RD.isR1(s)) return; // 1회차는 맛보기: 판 변화 없음
  for (const job of s.sj?.active || []) {
    if (!WAVES[job]) continue;
    if (HIT[job] === undefined) HIT[job] = r.chance(0.5) ? "a" : "b";
    // 1) 돈(1차·2차 합친 감소율)
    const cut = cutOf(s, job);
    if (cut > 0) { const prof = profitOf(s, job); if (prof > 0) { const amt = Math.round(prof * cut); if (amt > 0) { s.cash -= amt; addMoney(s, "exp", WV_LABEL, amt); } } }
    if (s.cal === 1 && cut > 0) notes.push(`${jobN(job)}: 판이 바뀌어 이익이 ${pct(cut)}% 줄고 있어요. 하던 대로면 해마다 더 줄어요.`);
    // 컨설팅 면접 전문(길 B)을 준비하던 사람: 조건을 채우면 바로 자리 잡는다
    if (job === "cs" && V.cs?.wantB && V.cs.path !== "b") { const q = rq(s, WV_REQ.cs.b, "cs:b"); if (!q || q.ok) { V.cs.path = "b"; V.cs.wantB = 0; notes.push(`컨설팅: ${q ? `${q.n} ${q.need}을 채워 ` : ""}면접 전문으로 자리 잡았어요. 면접 코칭 문의는 AI 대세에도 줄지 않아요.`); } }
    for (const n of [1, 2]) {
      const W = WV(s, job, n); if (!W) continue;
      const key = RK(job, n), x = V[key];
      if (AT[key] === undefined) AT[key] = r.int(B.at[n - 1][0], B.at[n - 1][1]); // 컨설팅 1차는 cs.js aiFrom 이 읽는다
      if (x && x.mode === "shift" && s.t - x.mt === B.shiftMo) notes.push(`${jobN(job)}: 갈아탄 방식이 자리를 잡았어요. '${W.n}' 영향이 사라졌어요.`);
      // 2차 예고: 어느 길이 흔들릴지 미리 귀띔
      if (n === 2 && !x && !PRE[key] && W.pre && s.t >= AT[key] - B.pre - RD.preMore(s) && tenure(s, job) >= 0) { PRE[key] = s.t; notes.push(`[${jobN(job)} 업계 소식] ${W.pre}.`); log(s, `[업계 소식] ${W.pre}`, "work"); }
      // 2) 경고 장면(한 달에 하나, 다른 선택 장면과 안 겹치게, 서로 석 달은 띄운다)
      if (scenes.some((q) => q.kind === "event" || q.warn) || s.t - (s.warnT ?? -99) < B.gap) continue;
      const own = n === 1 && W.own;
      if (!x) {
        const p1 = V[job], ok = n === 1 ? !W.off : WAVES[job].off || (p1 && s.t - p1.t >= B.between); // 2차는 1차가 지나고 3년 뒤부터
        const due = ok && s.t >= AT[key] && (own ? s.cs?.open && tenure(s, job) >= 6 : tenure(s, job) >= B.minTen);
        if (!due) continue;
        if (n === 2 && !W.ch) { // 길이 갈리는 2차: 내 길을 비켜 갔나
          const hit = HIT[job], cur = pathNow(s, job);
          if (cur && cur !== hit) { V[key] = { t: s.t, askT: s.t, mode: "stay", mt: s.t, hit, dodge: true }; log(s, `[판 변화] ${W.head} (${jobN(job)} · 비켜 감)`, "work");
            scenes.push({ kind: "story", tag: `${jobN(job)} 업계`, title: W.head, text: `${W.text}\n\n내가 고른 길: ${pathT(job, cur)}. 이번 파도는 옆길을 쳤다. 그때의 선택이 맞았다.\n(${jobN(job)} 이익이 조금 줄어요: 올해 −${pct(bal(job).first * B.dodge)}%, 최대 −${pct(bal(job).cap * B.dodge)}%. 맞은 길로 갔다면 세 배였어요)`, choices: [{ t: "가슴을 쓸어내린다", eff: { mental: 3 }, text: "" }] });
            continue; }
          V[key] = { t: s.t, askT: s.t, hit };
        } else V[key] = { t: s.t, askT: s.t };
        s.warnT = s.t; scenes.push(scene(s, job, n, false));
      } else if (!own && x.mode === "prep") { const o = opts(s, job, n).filter((q) => (!q.q || q.q.ok) && (!x.prepFor || x.prepFor.includes(q.key))); if (o.length) { x.askT = s.t; s.warnT = s.t; scenes.push(scene(s, job, n, true)); } // 준비 끝: 채운 달에 바로
      } else if (!own && !x.dodge && x.mode && x.mode !== "shift" && s.t - (x.askT || x.t) >= B.again && (x.askN || 0) < B.askMax) { x.askT = s.t; x.askN = (x.askN || 0) + 1; s.warnT = s.t; scenes.push(scene(s, job, n, true)); }
    }
  }
}

function scene(s, job, n, late) {
  const W = WV(s, job, n), B = WV_BAL, J = bal(job), nm = jobN(job), x = s.wv[RK(job, n)];
  if (n === 1 && W.own) { // 컨설팅 1차: 줄어드는 건 cs.js. 길 A = 경력 이직 분야(분야 화면에서 연다), 길 B = 면접 전문
    const nc = D.NICHES.career.req, hasA = s.cs?.niches?.includes("career"), q = rq(s, WV_REQ.cs.b, "cs:b");
    const chB = !q || q.ok ? { t: W.b[0], eff: { mental: -1 }, text: W.b[1], wv: "csb" } : { t: `면접 전문을 준비한다 (${q.n} ${q.need} 필요 · 지금 ${q.cur})`, eff: { stat: { talk: 2 } }, text: "아직은 말이 모자라다. 모의 면접을 돌리며 그날을 준비하기로 했다.", wv: "cswantb" };
    return { kind: "event", tag: "WARNING", warn: { head: W.head, sub: `${nm} · 판이 바뀐다` }, title: W.head, onChoose: "wv_ev", wvJob: job, wvN: n,
      text: `${W.text}\n(신입 취업 쪽 문의가 해마다 ${pct(CS_AI.perYear)}%p씩, 최대 ${pct(1 - CS_AI.floor)}%까지 줄어요. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요)\n(길 A 경력 이직: 줄지 않아요. 커리어 ${nc.career}·회사 경력 ${nc.years}년이 돼야 분야 화면에서 열려요. ${hasA ? "이미 열었어요" : `지금 커리어 ${Math.floor(s.st?.career || 0)}`})\n(길 B 면접 전문: 면접 코칭 문의가 줄지 않아요${q ? `. ${q.n} ${q.need} 필요 · 지금 ${q.cur}` : ""})\n(어느 길이 끝까지 안전할지는 아무도 몰라요. 몇 해 뒤 한쪽이 또 흔들려요)`,
      choices: [{ t: W.ch[0][0], eff: { stat: { career: 2 }, mental: -1 }, text: W.ch[0][1] }, chB, { t: W.ch[1][0], eff: { hp: -3 }, text: W.ch[1][1], wv: "cslect" }, { t: W.ch[2][0], eff: {}, text: W.ch[2][1] }] };
  }
  const rdy = late && x.mode === "prep", O = opts(s, job, n), can = O.filter((o) => !o.q || o.q.ok), no = O.filter((o) => o.q && !o.q.ok);
  const cur = pct(cut1(s, job, n)), H = halfOf(W), S2 = stayOf(W), c1 = H[2] ? M(s, H[2]) : 0;
  const tail = late && !rdy ? `(이 변화로 ${nm} 이익 −${cur}%. 하던 대로면 최대 −${pct(J.cap)}%까지 줄어요. ${(x.askN || 0) >= B.askMax ? "다시 고를 기회는 이번이 마지막이에요" : "늦게 갈아타면 돈이 더 들어요"})` : `(하던 대로면 ${nm} 이익이 올해 −${pct(J.first)}%, 해마다 ${pct(J.perYear)}%p씩 더, 최대 −${pct(J.cap)}%까지 줄어요. 갈아타면 ${B.shiftMo}달 동안 −${pct(B.shiftDip)}% 뒤 원래대로)`;
  const reqT = O.filter((o) => o.q).map((o) => `\n(${o.t.replace(/^길을 바꾼다: /, "")}: ${o.q.n} ${o.q.need} 필요 · 지금 ${o.q.cur}${o.q.ok ? " · 채웠어요" : ""})`).join("") + (no.length ? "\n(조건을 채우는 달에 다시 물어요. 그동안은 하던 대로와 똑같이 줄어요)" : "") + (n === 1 && O.length > 1 ? "\n(어느 길이 끝까지 안전할지는 아무도 몰라요. 몇 해 뒤 한쪽이 또 흔들려요)" : "");
  const ch = can.map((o) => { const c0 = M(s, o.cost * (late && !rdy ? B.late : 1)); return { t: `${o.t} (${c0}만 원)`, eff: { cash: -c0, mental: -3, hp: -4 }, text: o.res, wv: "go", key: o.key }; });
  if (no.length && !(rdy && can.length)) ch.push({ t: `갈아탈 준비를 한다 (${[...new Set(no.map((o) => `${o.q.n} ${o.q.need}`))].join(" 또는 ")} 필요)`, eff: {}, text: `아직은 실력이 모자라다. ${[...new Set(no.map((o) => o.q.n))].join(", ")} 능력치를 더 쌓아야 한다. 그날까지 버티기로 했다.`, wv: "prep", prepFor: no.map((o) => o.key) });
  if (!late || x.mode === "stay" || x.mode === "prep") ch.push({ t: c1 ? `${H[0]} (${c1}만 원)` : H[0], eff: { cash: -c1, mental: -1 }, text: H[1], wv: "half" });
  ch.push({ t: late ? "지금 방식을 그대로 둔다" : S2[0], eff: {}, text: late ? "바꾸지 않았다. 정산서는 내년에 또 얇아질 거다." : S2[1], wv: "keep" });
  const sub = rdy ? "준비가 끝났다" : late ? "아직 늦지 않았다" : n === 2 ? "판이 또 바뀐다" : "판이 바뀐다";
  const p = n === 2 && !W.ch ? pathNow(s, job) : null, hitT = p ? `\n내가 고른 길(${pathT(job, p)})이 정면으로 맞았다.` : "";
  return { kind: "event", tag: "WARNING", warn: { head: W.head, sub: `${nm} · ${sub}` }, title: rdy ? `${W.head} · 이제 갈아탈 수 있다` : late ? `${W.head} · 다시 고를 때` : W.head, onChoose: "wv_ev", wvJob: job, wvN: n, wvLate: !!late,
    text: `${rdy ? `조건을 채웠다. '${W.n}'에 맞설 준비가 됐다.` : late ? `'${W.n}'가 온 지 ${Math.round((s.t - x.t) / 12)}년. 예전 방식의 자리는 더 좁아졌다.` : W.text + hitT}\n${tail}${reqT}`, choices: ch };
}

export const WV_CHOOSE = {
  wv_ev(s, r, i, okv, sc) {
    const job = sc?.wvJob, n = sc?.wvN === 2 ? 2 : 1, W = WV(s, job, n), V = st(s), x = V[RK(job, n)]; if (!W || !x) return [];
    const c = sc.choices[i] || {}, was = x.mode, B = WV_BAL;
    if (c.wv === "go" || c.wv === "csb") { const req = n === 1 ? (c.wv === "csb" ? "b" : c.key) : c.key === "d" ? "d" + hitOf(s, job) : c.key === "xa" ? "a" : c.key === "xb" ? "b" : c.key; (s.wvTook = s.wvTook || []).push({ job, n, req, t: s.t, title: String(c.t || "").replace(/^길을 바꾼다: /, "").replace(/ \(.*\)$/, "") }); } // 11-25 이번 판에 간 길(엔딩·앨범, 다음 회차 특전)
    if (n === 1 && W.own) { // 컨설팅 1차
      x.mode = "own"; log(s, `[판 변화] ${W.head}`, "work");
      if (c.wv === "csb") { x.path = "b"; return ["면접 전문으로 간판을 바꿨어요", "면접 코칭 문의는 AI 대세에도 줄지 않아요"]; }
      if (c.wv === "cswantb") { x.wantB = 1; return ["조건을 채우면 면접 전문으로 자리 잡아요"]; }
      if (c.wv === "cslect" && s.cs) { s.cs.offers = Math.min(D.CS_LECT.maxOffers, (s.cs.offers || 0) + 1); return ["강의 섭외 +1"]; }
      return [];
    }
    if (c.wv === "go" && c.key === "fill") { x.mode = "fill"; x.mt = s.t; SJ.found(s, "club", "파티룸에서"); log(s, `[판 변화] ${W.head} (${jobN(job)} · 모임으로 채운다)`, "work"); return [`${jobN(job)} 이익 −${pct(cut1(s, job, n))}% · 모임을 유치하고 회원을 모을수록 풀려요`, "투잡 '취미 모임'이 열렸어요(파티룸과 함께면 칸을 안 써요)", "취미 모임 보드에서 '모임방장 만나기'로 다른 모임을 유치해요"]; }
    if (c.wv === "go") {
      x.mode = "shift"; x.mt = s.t;
      if (n === 1) x.path = c.key;
      else if (c.key === "xa" || c.key === "xb") { const to = c.key[1]; if (job === "cs") { (V.cs = V.cs || { t: s.t, mode: "own" }).path = to; } else V[job] = { ...(V[job] || { t: s.t }), mode: "shift", mt: s.t, path: to }; } // 길을 바꾸면 1차 감소도 같이 풀린다
    } else if (c.wv === "prep") { x.mode = "prep"; x.prepFor = c.prepFor; if (!was) x.mt = s.t; }
    else if (c.wv === "half") { x.mode = "half"; x.mt = s.t; }
    else if (!was || was === "prep") { x.mode = "stay"; if (!was) x.mt = s.t; }
    log(s, `[판 변화] ${W.head} (${jobN(job)})`, "work");
    if (x.mode === "shift") return [`${jobN(job)} 이익 −${pct(B.shiftDip)}% · ${B.shiftMo}개월 뒤 원래대로`];
    if (x.mode === "prep") return [`${jobN(job)} 이익 −${pct(cut1(s, job, n))}% · 조건을 채우면 갈아탈 수 있어요`];
    return [`${jobN(job)} 이익 −${pct(cut1(s, job, n))}% · 해마다 더 줄어요`];
  },
};

// 시험용: 조건 없이 경고 장면을 만든다(n: 1차·2차, hit: 2차에 맞을 길, path: 1차에 탄 길로 해 두기)
export function waveScene(s, job, late, n = 1, hit, path) {
  const V = st(s), k = RK(job, n); if (!WAVES[job]) return null;
  V._hit = V._hit || {}; if (hit) V._hit[job] = hit; else if (!V._hit[job]) V._hit[job] = "a";
  if (n === 2 && path && job !== "cs") V[job] = { t: s.t - 60, mode: "shift", mt: s.t - 60, path };
  if (!WV(s, job, n)) return null;
  if (!V[k]) V[k] = n === 2 ? { t: s.t, askT: s.t, hit: V._hit[job] } : { t: s.t, askT: s.t };
  if (late && !V[k].mode) { V[k].mode = "stay"; V[k].mt = s.t; V[k].t = s.t - 24; }
  return scene(s, job, n, !!late);
}

// 11-25 이번 판에 간 길: 엔딩 결산·앨범 기록 줄("파티룸 · 모임으로 채운다 (35세)")과, 다음 회차에 넘길 "투잡:길" 목록
export function tookList(s) { return (s.wvTook || []).map((x) => `${jobN(x.job)} · ${x.title}${x.t != null && s.startAge ? ` (${Math.floor(s.startAge + x.t / 12)}세)` : ""}`); }
export function goneOut(s) { return [...new Set((s.wvTook || []).map((x) => `${x.job}:${x.req}`))]; }
