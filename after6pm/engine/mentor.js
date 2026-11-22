// 스승·선배(v4.29, 26-11-22 기획 mentor_plan). 투잡마다 스승 1명(10명) + 선배(sj_senior 연결) + 투잡 인연(재배치한 인물).
// ── 스승: 탐색(너튜브·세미나·해 본 사람에게 묻기·선배 소개)에서 운 좋으면 만난다. 눈앞에 서서 4턴 '좋은 질문 고르기'.
//    턴마다 좋은 질문(3점)·평범(1점)·엉뚱(0점). 4턴 합으로 등급 S(10~12)·A(7~9)·B(4~6)·C(0~3).
//    S: 히든 길 조건 2개 공개 + 돌파 계기(giveBrk) + 제자 등록 / A: 조건 1개 + 제자 / B: 제자(연 1회 조언 때 50% 힌트) / C: 1년 뒤 다시 기회
//    제자 = s.rel[스승].master(도감 관계 비트 128). 매년 3월 '스승의 편지'(알림 한 줄 + 작은 효과).
// ── 선배: sj_senior(선배 찾아가기 3번) 장면을 2턴 질문 고르기로 바꾼다. 효과는 스승의 약 40~45%. 세 번째 만남 뒤 스승 소개 기회.
// ── 투잡 인연: 하는 투잡에 side 역할이 있는 인물(data side 필드)이 가끔 나타난다(말빨 판정 → 핵심 능력치·호감).
// 상태: s.ms = { met:{job:{id,t,g,score,retry}}, cur:{kind,job,turn,score,qs,st}, ins, monT, sideT, letY }
// onChoose: "ms_q"(스승 턴) · "sn_q"(선배 턴) · "ms_side"(투잡 인연). 봇: botPick(s, sc, rnd). 난수는 r 만.
import * as D from "./defs.js";
import { CHAR, jo, log, gainStat, ensureRel, giveBrk } from "./core.js";
import * as SJ from "./sj.js";
import { hidSee, hidReveal } from "./hidden.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// ───────── 상수 ─────────
export const MENTOR_OF = { cs: "c111", pr: "c112", airbnb: "c113", ucafe: "c114", chicken: "c115", insta: "s001", tarot: "c116", webnovel: "c117", tutoring: "c118", vibe: "c119" };
export const MS_P = { youtube: 0.06, seminar: 0.12, interview: 0.15, interviewCharm: 0.08, interviewFit: 0.04, senior3: 0.3, seniorAff: 25, insure: 0.035, insureFrom: 13, insureTo: 24, instaDm: 0.05, instaF: 1000, minInt: 30, retry: 12 };
export const MS_GAIN = { score: [3, 1, 0], int: [12, 6, 2], pts: [0.05, 0.025, 0.01], aff: [6, 2, -2] }; // 좋은·평범·엉뚱
export const MS_GRADE = [[10, "S"], [7, "A"], [4, "B"], [0, "C"]];
export const SN_GAIN = { score: [3, 1, 0], int: [3, 1, 0], pts: [0.025, 0.012, 0.005], base: 0.03, aff: [5, 2, -1] }; // 선배(2턴). 관심 +20(행동 자체, ×0.7)은 sj.js 그대로
export const SIDE_P = { p: 0.05, gap: 5, dc: 40 };
const TURN_N = ["첫 질문", "함정", "회사와 병행", "다음 단계"];
const JN = (job) => D.SIDEJOBS[job]?.n || job;

// ───────── 스승 대사: [장면 글, [좋은 질문, 답], [평범, 답], [엉뚱, 답, 웃음?]] × 4턴 ─────────
const Q = {
  cs: [
    ["조로 쌤이 커피를 내려놓는다. \"자, 결론부터. 뭐가 제일 궁금해요?\"", ["\"첫 고객 다섯 명은 어디서 구하셨어요?\"", "\"오 ㅎㅎ 그게 진짜 질문이죠. 지인 말고, 내 글 보고 온 사람.\""], ["\"한 달에 얼마 버세요?\"", "\"사람마다 달라요. 그보다 시간당으로 보세요.\""], ["\"자소서 AI로 쓰면 안 걸려요?\"", "\"ㅋㅋ 걸려요. 인사팀은 사람이에요.\""]],
    ["\"처음 하는 사람이 제일 많이 망하는 데가 어딘지 알아요?\"", ["\"환불은 보통 언제 생겨요?\"", "\"맞아요. 약속을 크게 하면 환불도 커져요.\""], ["\"가격은 얼마로 시작해요?\"", "\"싸게 시작하되, 석 달 뒤엔 꼭 올려요.\""], ["\"'합격 보장' 문구 써도 돼요?\"", "\"…그거 쓰는 순간 끝이에요.\""]],
    ["\"회사는 다니면서 할 거죠?\"", ["\"회사에 안 들키고 병행한 기준이 있었어요?\"", "\"선퇴사 금지. 남은 기간에 오히려 더 열심히.\""], ["\"주말만 해도 돼요?\"", "\"돼요. 대신 답장은 하루 안에.\""], ["\"퇴사하고 올인하는 게 낫죠?\"", "\"ㅎㅎ 환승 이직 모르세요? 환승 창업도 똑같아요.\""]],
    ["\"마지막 질문 하나 받을게요.\"", ["\"경력직 고객은 신입이랑 뭐가 달라요?\"", "히든 길 힌트: \"회사 5년은 다녀 본 사람이 해야 돼요. 커리어 120에 합격자 50명쯤 되면 문이 열려요.\""], ["\"강의는 언제부터 해요?\"", "\"후기 30개 넘으면 기관이 먼저 연락 와요.\""], ["\"채널 구독하면 할인돼요?\"", "\"ㅋㅋㅋ 그 질문은 처음이네.\"", 1]],
  ],
  pr: [
    ["나연이 예약표를 덮는다. \"뭐부터 물어볼래요?\"", ["\"예약 문의에서 제일 자주 나오는 문장이 뭐예요?\"", "\"좋아요. 그 문장이 다음 컨셉이에요.\""], ["\"한 달에 얼마 남아요?\"", "\"방마다 달라요. 평당으로 봐요.\""], ["\"인테리어 예쁘면 다 되죠?\"", "\"예쁜 방은 넘쳐요. 이유 있는 방이 팔려요.\""]],
    ["\"처음 하는 사람이 제일 많이 망하는 데가 어딘지 알아요?\"", ["\"계약 전에 건물주한테 꼭 물어볼 게 뭐예요?\"", "\"소음이랑 업종 동의. 그거 안 물으면 석 달 만에 쫓겨나요.\""], ["\"보증금은 얼마가 적당해요?\"", "\"매출 여섯 달 치 안으로요.\""], ["\"권리금 없는 자리 아세요?\"", "\"…그건 다들 찾아요.\""]],
    ["\"회사는 다니면서 할 거죠?\"", ["\"청소랑 민원은 어디까지 맡기셨어요?\"", "\"청소는 처음부터 맡겨요. 민원은 내가 받고요.\""], ["\"주말에만 가도 돼요?\"", "\"돼요. 대신 새벽 문자엔 답해야 해요.\""], ["\"회사 동료들한테 홍보해도 돼요?\"", "\"첫 달은 좋은데, 소문은 회사가 먼저 들어요.\""]],
    ["\"마지막 질문 하나.\"", ["\"다음 유행 컨셉은 어떻게 알아채세요?\"", "히든 길 힌트: \"'○○도 돼요?' 문의가 석 달 연속이면 그게 다음 유행이에요. 유행 오기 전에 그 컨셉으로 열어 둬요. 감각 100은 돼야 보여요.\""], ["\"2호점은 언제 내요?\"", "\"1호점이 여섯 달 흑자일 때요.\""], ["\"파티룸 하면 파티 자주 해요?\"", "\"ㅎ 청소만 자주 해요.\"", 1]],
  ],
  airbnb: [
    ["도진이 계약서 뭉치를 옆으로 민다. \"궁금한 거부터요.\"", ["\"단속 나오면 제일 먼저 뭘 보여 주세요?\"", "\"등록증이랑 집주인 동의서. 그 두 장이면 끝나요.\""], ["\"한 채에 얼마 남아요?\"", "\"가동률 보고 얘기해요. 숫자는 그다음.\""], ["\"명의 빌려 주는 사람 소개해 줄 수 있어요?\"", "\"…그 얘기는 못 들은 걸로 할게요.\""]],
    ["\"처음 하는 분들이 제일 많이 실수하는 데가 있어요.\"", ["\"후기 별점이 떨어지는 첫 원인이 뭐예요?\"", "\"청소요. 머리카락 한 올이 별 하나예요.\""], ["\"가구는 어디서 사요?\"", "\"싼 거 사면 1년마다 또 사요.\""], ["\"오피스텔도 몰래 하면 되죠?\"", "\"단속이 와도 웃을 수 있어요?\""]],
    ["\"회사 다니면서 하시는 거죠?\"", ["\"체크인 문의는 몇 시까지 답하셨어요?\"", "\"밤 11시까지. 자동 답장은 그 뒤에.\""], ["\"청소는 직접 하셨어요?\"", "\"첫 1년은요. 그래야 맡길 때 기준이 생겨요.\""], ["\"회사 출장 갈 때 우리 숙소 쓰면 되죠?\"", "\"허허, 그건 회사가 정해요.\"", 1]],
    ["\"마지막으로 하나 더.\"", ["\"게스트 말고 장기 손님은 어디서 와요?\"", "히든 길 힌트: \"회사 출장자요. 합법 숙소 세 채, 별점 4.8, 회사에서 쌓은 인맥(커리어 100)이면 기업이 먼저 계약하자고 해요.\""], ["\"몇 채까지 늘리셨어요?\"", "\"마흔 채. 근데 세 채일 때가 제일 남았어요.\""], ["\"외국어 못해도 돼요?\"", "\"번역기가 있잖아요. 웃는 건 통역이 필요 없어요.\""]],
  ],
  ucafe: [
    ["윤호가 잔을 닦으며 고개만 든다. \"물어봐요.\"", ["\"원두 바꾸고 재방문율이 얼마나 달라졌어요?\"", "\"두 달 만에 단골이 세 배.\""], ["\"한 곳에 얼마 남아요?\"", "\"월세가 정해요. 자리부터 봐요.\""], ["\"기계 제일 비싼 거 사면 되죠?\"", "\"기계는 거들 뿐이라니까요.\""]],
    ["\"망하는 무인카페엔 공통점이 있어요.\"", ["\"얼음이랑 컵 떨어지는 시간대가 언제예요?\"", "\"여름 오후 세 시. 그때 비면 그날 끝.\""], ["\"청소는 매일 가요?\"", "\"이틀에 한 번. 대신 화면은 매일 봐요.\""], ["\"먹튀 손님은 그냥 둬요?\"", "\"…그것도 손님이에요. 두 번까지는.\""]],
    ["\"회사 다니면서 하죠?\"", ["\"점검에 하루 몇 분 쓰셨어요?\"", "\"출근 전 15분. 그게 다예요.\""], ["\"주말에만 가도 돼요?\"", "\"재고만 채우면요.\""], ["\"회사 탕비실에 우리 원두 넣어도 돼요?\"", "\"ㅎ 총무팀이 허락하면요.\"", 1]],
    ["\"하나만 더.\"", ["\"원두를 직접 볶아 파는 건 언제부터 하셨어요?\"", "히든 길 힌트: \"스페셜티 원두 2년 쓰고, 매장 세 곳에 별점 4.7, 감각 120이면 다른 가게들이 원두를 달라고 해요.\""], ["\"두 번째 매장은 언제 내요?\"", "\"첫 매장이 손 안 가게 됐을 때.\""], ["\"저가 커피랑 붙으면 어떡해요?\"", "\"같은 가격으로 붙으면 져요.\""]],
  ],
  chicken: [
    ["금례 사장님이 앞치마를 턴다. \"뭐가 궁금해서 왔어?\"", ["\"본사 필수 품목 중에 안 사도 되는 게 있어요?\"", "\"있지. 근데 그거 묻는 사람이 드물어.\""], ["\"한 달에 얼마 남아요?\"", "\"배달 수수료 빼고 말해? 반으로 줄어.\""], ["\"치킨 매일 먹으면 안 질려요?\"", "\"ㅎㅎ 30년째 질려.\"", 1]],
    ["\"처음 하는 사람이 제일 많이 망하는 데가 어딘지 알아?\"", ["\"리뉴얼 공사 요구는 어떻게 버티셨어요?\"", "\"혼자 버티면 져. 점주들이랑 같이 가.\""], ["\"알바는 몇 명 써요?\"", "\"금요일엔 둘. 나머진 나 혼자.\""], ["\"본사 직원이랑 친해지면 되죠?\"", "\"그 직원 내년엔 딴 데 가.\""]],
    ["\"회사 다니면서 한다고?\"", ["\"매장 비우는 시간은 누가 봐요?\"", "\"점장 하나는 꼭 키워. 내 사람으로.\""], ["\"주말만 해도 돼요?\"", "\"치킨은 금요일이야.\""], ["\"퇴사하고 올인하는 게 낫죠?\"", "\"빚부터 올인하게 돼.\""]],
    ["\"마지막으로 하나만 물어봐.\"", ["\"내 브랜드로 독립한 점주들은 어떻게 했어요?\"", "히든 길 힌트: \"세 곳은 해 봐야 돼. 협의회에서 리뉴얼 협상 한 번 이기고, 숫자(140)에 밝으면 본사 없이도 원가가 내려가.\""], ["\"2호점은 언제 내요?\"", "\"1호점이 혼자 돌 때.\""], ["\"제가 개발한 양념 팔아도 돼요?\"", "\"계약서부터 다시 읽어.\""]],
  ],
  insta: [
    ["채린이 휴대폰을 엎어 둔다. \"오늘은 숫자 얘기 말고요. 뭐든 물어봐요.\"", ["\"팔로워 늘 때 버린 콘텐츠가 뭐예요?\"", "\"제일 반응 좋던 거요. 내 색이 아니었거든요.\""], ["\"협찬은 얼마 받아요?\"", "\"숫자보다 고르는 게 중요해요.\""], ["\"맞팔 해 주실 수 있어요?\"", "\"ㅎ 콘텐츠 보고요.\"", 1]],
    ["\"다들 여기서 무너져요.\"", ["\"악플 많은 날엔 뭘 하세요?\"", "\"그날은 안 올려요. 하루 쉬어도 안 죽어요.\""], ["\"하루에 몇 개 올려요?\"", "\"하나요. 대신 매일.\""], ["\"팔로워 사면 티 나요?\"", "\"나요. 저장이 안 늘거든요.\""]],
    ["\"회사 다니면서 하죠?\"", ["\"회사에 계정 들킨 적 있어요?\"", "\"있죠. 그래서 회사 얘기는 절대 안 올려요.\""], ["\"주말에 몰아 찍어도 돼요?\"", "\"돼요. 올리는 건 매일.\""], ["\"회사 사무실 배경으로 찍어도 돼요?\"", "\"…그건 인사팀 콘텐츠예요.\""]],
    ["\"마지막 질문.\"", ["\"온라인 말고 오프라인은 언제 생각했어요?\"", "히든 길 힌트: \"시대의 컨셉을 한 번 타 보고, 팬심 80이 넘고, 내 브랜드를 런칭하면 팝업 거리에서 연락이 와요. 알고리즘이랑 상관없는 매출이요.\""], ["\"팔로워 10만은 언제 돼요?\"", "\"숫자 세기 시작하면 멀어져요.\""], ["\"저도 연예인 될 수 있어요?\"", "\"ㅎ 일단 피드부터요.\""]],
  ],
  tarot: [
    ["해담 원장이 차를 따른다. \"천천히 물어봐요.\"", ["\"단골이 위험해지는 순간은 언제예요?\"", "\"매일 올 때요. 그건 단골이 아니라 신호예요.\""], ["\"한 번에 얼마 받아요?\"", "\"시간으로 받아요. 카드 수 말고.\""], ["\"제 연애운 좀 봐 주세요\"", "\"…상담료 받을게요. ㅎ\"", 1]],
    ["\"이 일은 말 한마디로 끝나요.\"", ["\"말하면 안 되는 해석이 있어요?\"", "\"죽음·병·이별 단정. 그 세 개는 절대.\""], ["\"카드는 어디서 사요?\"", "\"아무 데나요. 손에 익는 게 중요해요.\""], ["\"잘 맞힌다는 소문 내 주실 수 있어요?\"", "\"맞히는 게 상담이 아니에요.\""]],
    ["\"회사 다니면서 하시죠?\"", ["\"회사 사람들한테는 뭐라고 하셨어요?\"", "\"취미라고 했어요. 그게 맞기도 하고요.\""], ["\"평일 밤에만 해도 돼요?\"", "\"돼요. 늦은 상담은 짧게.\""], ["\"회사 동료 운세 봐 주면 인기 많겠죠?\"", "\"인기보다 소문이 먼저 와요.\""]],
    ["\"마지막으로 하나.\"", ["\"상담을 공부로 바꾼 계기가 뭐예요?\"", "히든 길 힌트: \"상담심리 대학원을 마치고, 타로 Lv4에 평판(적중률) 70이면 센터를 열 수 있어요. 기업 복지 계약도 그때 와요.\""], ["\"부스는 몇 개까지 해요?\"", "\"두 개면 충분해요.\""], ["\"타로로 로또 번호 볼 수 있어요?\"", "\"ㅎㅎ 그럼 제가 여기 있겠어요?\""]],
  ],
  webnovel: [
    ["우현이 노트북을 반쯤 덮는다. \"10분이요. 질문은 숫자로.\"", ["\"100화까지 독자 이탈이 제일 큰 구간은요?\"", "\"30~40화. 주인공이 멈추는 데예요.\""], ["\"한 달에 얼마 벌어요?\"", "\"완결 전엔 묻지 마요.\""], ["\"AI로 하루 10화 쓰면 안 돼요?\"", "\"독자가 제일 먼저 알아요.\""]],
    ["\"다들 여기서 멈춰요.\"", ["\"휴재 공지는 언제 써도 돼요?\"", "\"비축분 0일 때 말고, 10화일 때 미리.\""], ["\"장르는 뭐가 잘 돼요?\"", "\"지금 잘 되는 건 1년 뒤엔 레드오션.\""], ["\"댓글 알바 쓰면 순위 올라요?\"", "\"…그 순위 오래 못 가요.\""]],
    ["\"회사 다니면서 쓰죠?\"", ["\"출근 전후로 몇 자씩 쓰셨어요?\"", "\"출근 전 2천, 퇴근 후 3천. 매일.\""], ["\"주말에 몰아 써도 돼요?\"", "\"돼요. 올리는 건 정해진 요일에.\""], ["\"회의 시간에 몰래 써도 되죠?\"", "\"ㅎ 그 회의록이 더 재밌겠네요.\"", 1]],
    ["\"마지막.\"", ["\"스튜디오는 어떻게 시작하셨어요?\"", "히든 길 힌트: \"완결 세 편, 공장 한 번 성공, 드라마 판권 한 번. 그러면 세계관을 같이 쓸 작가들이 와요.\""], ["\"유료 전환은 몇 화부터요?\"", "\"25화 안팎. 독자가 붙었을 때.\""], ["\"제 작품 드라마 되면 출연해도 돼요?\"", "\"ㅎ 카메오 정도는요.\""]],
  ],
  tutoring: [
    ["수연이 휴대폰 세 대를 엎어 놓는다. \"빨리 물어봐요, 설명회 가야 돼요.\"", ["\"학부모가 소개를 끊는 순간은 언제예요?\"", "\"연락이 늦을 때요. 성적보다 먼저.\""], ["\"시간당 얼마 받아요?\"", "\"과목이랑 학년이 정해요.\""], ["\"숙제 많이 내면 성적 오르죠?\"", "\"숙제 검사를 안 하면 안 올라요.\""]],
    ["\"처음 하는 선생님들이 꼭 하는 실수가 있어요.\"", ["\"시범 수업에서 꼭 하는 게 있어요?\"", "\"마지막 5분은 학부모랑 통화. 계획을 말해 줘요.\""], ["\"교재는 뭐 써요?\"", "\"학교 거요. 학부모가 안심해요.\""], ["\"성적 보장한다고 하면 잘 팔리죠?\"", "\"…그 말 하는 순간 환불이에요.\""]],
    ["\"회사 다니면서 하죠?\"", ["\"야근 있는 날 수업은 어떻게 하셨어요?\"", "\"미리 보강 날짜를 잡아 둬요. 학부모가 기억해요.\""], ["\"주말만 해도 돼요?\"", "\"돼요. 시험 기간엔 평일도요.\""], ["\"회사 컴퓨터로 수업해도 되죠?\"", "\"ㅎ 보안팀이 수강생 되겠네요.\"", 1]],
    ["\"마지막 하나.\"", ["\"입시 상담은 언제부터 하셨어요?\"", "히든 길 힌트: \"입시 대박을 네 해 내고, 학부모 별점 4.9, 말빨 160에 입시 데이터를 읽는 숫자 100이면 상담만으로 대기 명단이 생겨요.\""], ["\"그룹 수업은 언제 열어요?\"", "\"1:1이 꽉 찼을 때.\""], ["\"학부모 단톡방 들어가도 돼요?\"", "\"들어가면 못 나와요.\""]],
  ],
  vibe: [
    ["규민이 노트북을 덮는다. \"코드 말고, 사람 얘기부터 해요.\"", ["\"사내에서 처음 쓴 사람은 누구였어요?\"", "\"옆자리 차장님. 그게 첫 고객이었어요.\""], ["\"외주 하나에 얼마 받아요?\"", "\"유지보수까지 넣으면 두 배.\""], ["\"코딩 몰라도 앱 팔아서 부자 될 수 있죠?\"", "\"부자는 몰라도 버그는 확실히 생겨요.\""]],
    ["\"다들 여기서 사고 나요.\"", ["\"납기 사고는 어떻게 막으셨어요?\"", "\"범위를 처음에 글로 적어요. 말로 한 건 다 늘어나요.\""], ["\"툴은 뭐 써요?\"", "\"아무거나요. 쓰는 사람이 중요해요.\""], ["\"회사 코드 가져다 쓰면 빠르죠?\"", "\"…그건 보안팀이 더 빨라요.\""]],
    ["\"회사 다니면서 하죠?\"", ["\"회사에는 뭐라고 하고 시작했어요?\"", "\"제 일 줄이는 툴이라고요. 실제로 그랬고요.\""], ["\"주말에만 해도 돼요?\"", "\"돼요. 장애는 평일에 나요.\""], ["\"회의 시간에 코딩해도 되죠?\"", "\"ㅎ 회의도 자동화하면요.\"", 1]],
    ["\"마지막 질문.\"", ["\"사내 툴이 회사 밖으로 나간 건 어떻게 됐어요?\"", "히든 길 힌트: \"사내 앱을 회사가 정식으로 쓰게 만들고, 바이브 Lv4에 회사 평가 A를 3년 연속 받으면 분사 제안이 와요.\""], ["\"앱 구독은 언제 시작해요?\"", "\"고객 열 명이 같은 걸 물을 때.\""], ["\"개발자로 이직하면 되죠?\"", "\"그것도 길이에요. 근데 지금 길이 더 재밌어요.\""]],
  ],
};
// 스승 한마디(장면 끝)
const WORD = {
  cs: "일은 일일 뿐. 근데 그 일로 사람 인생이 바뀌어요.", pr: "방은 넓이가 아니라 이유로 팔려요.", airbnb: "단속을 피하는 집 말고, 단속이 와도 웃는 집을 만들어요.",
  ucafe: "싸게 팔 거면 기계를 사고, 오래 팔 거면 원두를 사요.", chicken: "가맹비 낼 때 계약서 마지막 장부터 읽어.", insta: "알고리즘은 변해요. 나를 알아보는 사람은 안 변해요.",
  tarot: "매일 오는 손님은 단골이 아니라 신호예요.", webnovel: "세계관은 혼자 만들고, 이야기는 같이 써요.", tutoring: "수업은 학생이 듣고, 소개는 엄마가 해요.", vibe: "회사 문제를 푸는 사람이 회사 밖에서도 돈을 벌어요.",
};
// 연 1회 스승의 편지
const LETTER = {
  cs: "올해는 후기 30개 목표. 그리고 선퇴사 금지 ㅎㅎ", pr: "올해 문의 문장을 매달 세어 봐요. 같은 말이 늘면 그게 신호예요.", airbnb: "올해 서류 한 번 다시 읽어요. 단속은 늘 연말에 와요.",
  ucafe: "여름 오후 세 시 재고, 올해도 잊지 마요.", chicken: "올해도 계약서 마지막 장. 그리고 밥은 꼭 먹어.", insta: "올해 버릴 콘텐츠 하나를 정해요. 그게 내 색을 지켜요.",
  tarot: "올해는 쉬는 날을 정해요. 듣는 사람도 지쳐요.", webnovel: "올해 비축분 10화 아래로 내려가지 마요.", tutoring: "올해 학부모 연락은 하루 안에. 그게 다예요.", vibe: "올해 고객 열 명 이름을 외워요. 코드보다 그게 먼저예요.",
};
// ───────── 선배 2턴: [좋은, 답], [평범, 답], [엉뚱, 답] × 2 ─────────
const SEN_Q = {
  pr: [[["\"첫 석 달 예약표 실제로 보여 줄 수 있어요?\"", "선배가 휴대폰을 내밀었다. 평일 칸이 텅 비어 있다. \"이게 정상이에요.\""], ["\"한 달에 얼마 남아요?\"", "\"방마다 달라요. 저는 하나에 150쯤.\""], ["\"인테리어 예쁘게 하면 되죠?\"", "\"사진 잘 찍는 게 먼저예요.\""]], [["\"청소 업체는 언제부터 쓰셨어요?\"", "\"두 번째 달부터요. 내 주말이 더 비싸요.\""], ["\"보증금은 얼마였어요?\"", "\"2천. 월세는 매출의 3분의 1 안.\""], ["\"파티룸에서 제 생일 파티 해도 돼요?\"", "\"ㅎ 예약은 받아요.\""]]],
  cs: [[["\"첫 고객 다섯 명은 어디서 왔어요?\"", "\"지인 셋, 블로그 둘. 블로그 둘이 진짜예요.\""], ["\"한 건에 얼마 받아요?\"", "\"처음엔 싸게, 후기 30개면 올려요.\""], ["\"합격 보장이라고 써도 돼요?\"", "\"…그거 쓰면 환불만 늘어요.\""]], [["\"환불은 보통 언제 생겨요?\"", "\"약속을 크게 했을 때요.\""], ["\"하루에 몇 명 봐요?\"", "\"퇴근 후 두 명이 한계예요.\""], ["\"AI로 첨삭하면 빠르죠?\"", "\"빠르죠. 티도 나고요.\""]]],
  insta: [[["\"저장 많이 된 게시물엔 공통점이 있어요?\"", "\"정보요. 예쁜 것보다 쓸모.\""], ["\"협찬은 언제부터 왔어요?\"", "\"팔로워 5천쯤. 대부분 제품만 줘요.\""], ["\"맞팔하면 팔로워 늘죠?\"", "\"늘죠. 쓸모는 없고요.\""]], [["\"하루 몇 시간 쓰세요?\"", "\"찍는 건 한 시간, 고르는 건 두 시간.\""], ["\"폰으로 찍어도 돼요?\"", "\"돼요. 빛이 더 중요해요.\""], ["\"회사 사람들한테 팔로우 부탁해도 돼요?\"", "\"…그럼 회사 얘기를 못 올려요.\""]]],
  airbnb: [[["\"합법 등록은 어떻게 하셨어요?\"", "\"집주인 동의서부터요. 그거 없으면 시작도 마요.\""], ["\"한 채에 얼마 남아요?\"", "\"성수기 200, 비수기 50.\""], ["\"오피스텔로 몰래 하면 안 걸려요?\"", "\"걸려요. 생각보다 빨리.\""]], [["\"별점 떨어진 적 있어요? 왜요?\"", "\"머리카락 한 올이요. 그날 청소 업체 바꿨어요.\""], ["\"청소는 직접 해요?\"", "\"처음엔요.\""], ["\"외국인 손님은 말 안 통하면 어떡해요?\"", "\"번역기랑 웃음이요.\""]]],
  ucafe: [[["\"하루 점검은 몇 분 걸려요?\"", "\"15분. 대신 매일.\""], ["\"한 곳에 얼마 남아요?\"", "\"월세 내고 100 안팎.\""], ["\"먹튀는 그냥 둬요?\"", "\"화면 캡처를 붙여 두면 반은 돌아와요.\""]], [["\"여름에 제일 먼저 떨어지는 게 뭐예요?\"", "\"얼음이요. 그다음 컵.\""], ["\"기계는 사요, 빌려요?\"", "\"처음엔 빌려요.\""], ["\"커피 공짜로 마셔도 돼요?\"", "\"ㅎ 재고 맞추기 힘들어요.\""]]],
  chicken: [[["\"금요일 밤 주문은 몇 건까지 감당돼요?\"", "\"둘이서 60건. 넘으면 리뷰가 망가져요.\""], ["\"가맹비는 얼마였어요?\"", "\"인테리어까지 1억 넘었어요.\""], ["\"치킨 매일 공짜로 먹을 수 있죠?\"", "\"첫 달만요. 그다음은 냄새도 싫어요.\""]], [["\"배달 수수료 빼면 한 마리에 얼마 남아요?\"", "\"3천 원 안팎. 그래서 많이 팔아야 돼요.\""], ["\"알바는 어디서 구해요?\"", "\"동네 단톡방이요.\""], ["\"본사가 다 해 주죠?\"", "\"본사는 본사 장사해요.\""]]],
  tarot: [[["\"손님이 울면 어떻게 해요?\"", "\"휴지 주고 기다려요. 카드는 그다음.\""], ["\"한 번에 얼마 받아요?\"", "\"15분에 만 원부터요.\""], ["\"제 운세 좀 봐 주세요\"", "\"ㅎ 줄 서세요.\""]], [["\"단골한테 선 긋는 말이 있어요?\"", "\"'다음 달에 와요.' 그 한마디예요.\""], ["\"카드는 몇 덱 써요?\"", "\"하나요. 익숙한 게 제일 잘 맞아요.\""], ["\"무서운 카드 나오면 겁줘도 돼요?\"", "\"…그럼 다시는 안 와요.\""]]],
  webnovel: [[["\"비축분은 몇 화 들고 시작하셨어요?\"", "\"30화요. 그래도 금방 녹아요.\""], ["\"장르는 뭐가 잘 돼요?\"", "\"쓰고 싶은 거요. 오래 써야 하니까.\""], ["\"AI로 쓰면 빠르죠?\"", "\"빠르죠. 독자도 빨리 떠나요.\""]], [["\"악플은 어떻게 버티세요?\"", "\"안 읽어요. 편집자가 걸러 줘요.\""], ["\"하루 몇 자 써요?\"", "\"5천 자요.\""], ["\"공모전 심사위원 아세요?\"", "\"ㅎ 알아도 소용없어요.\""]]],
  tutoring: [[["\"학부모 연락은 얼마나 자주 하세요?\"", "\"수업마다 세 줄 보고서요.\""], ["\"시간당 얼마 받아요?\"", "\"중등 4만, 고등 5만쯤.\""], ["\"숙제 많이 내면 되죠?\"", "\"검사 안 하면 의미 없어요.\""]], [["\"시범 수업은 어떻게 해요?\"", "\"틀린 문제 하나를 끝까지 같이 풀어요.\""], ["\"화상 장비는 뭐 써요?\"", "\"웹캠 하나면 돼요. 조명이 중요해요.\""], ["\"성적 보장해도 돼요?\"", "\"그럼 환불 각오해요.\""]]],
  vibe: [[["\"첫 외주는 어떻게 받았어요?\"", "\"사내 툴 만든 걸 보여 줬어요.\""], ["\"외주 하나에 얼마 받아요?\"", "\"작은 건 50, 큰 건 300.\""], ["\"코딩 몰라도 되죠?\"", "\"몰라도 돼요. 버그는 알아야 하고요.\""]], [["\"범위 늘어나는 건 어떻게 막아요?\"", "\"처음에 글로 적어요. 추가는 추가 요금.\""], ["\"툴은 유료 써요?\"", "\"월 몇만 원은 아깝지 않아요.\""], ["\"회사 코드 복붙해도 되죠?\"", "\"…그 순간 퇴사예요.\""]]],
};

// ───────── 상태·도우미 ─────────
export function msState(s) { if (!s.ms) s.ms = { met: {}, cur: null, ins: -1, monT: -99, sideT: -99, letY: -1 }; return s.ms; }
export const metOf = (s, job) => s.ms?.met?.[job] || null;
export const metCount = (s) => Object.keys(s.ms?.met || {}).length;
export function canMeet(s, job) {
  const id = MENTOR_OF[job], M = msState(s); if (!id || !CHAR[id] || !D.SIDEJOBS[job]) return false;
  if (M.cur || M.monT === s.t || s.rel[id]?.spouse) return false;
  const m = M.met[job]; if (m && !(m.g === "C" && s.t >= (m.retry ?? 1e9))) return false;
  return SJ.isFound(s, job) || (s.sj?.int?.[job] || 0) >= MS_P.minInt;
}
const shuffle3 = (r) => r.shuffle([0, 1, 2]);
const EXPR = ["smile", "neutral", "angry"];
// 턴 장면: k = 0 좋은 / 1 평범 / 2 엉뚱. 선택지 순서는 섞는다. 좋은 질문은 멘탈 +1(봇 기본 선택이 좋은 질문이 되게)
function turnScene(s, r, job, turn, pre = "", expr = "smile") {
  const id = MENTOR_OF[job], c = CHAR[id], T = Q[job][turn];
  const choices = shuffle3(r).map((k) => { const o = T[1 + k]; const laugh = k === 2 && o[2]; return { t: o[0], q: k, eff: { aff: MS_GAIN.aff[k] + (laugh ? 3 : 0), ...(k === 0 ? { mental: 1 } : {}) }, text: o[1] + (laugh ? " (엉뚱하지만 웃음 · 호감 +1)" : "") }; });
  return { kind: "event", tag: "스승", mentor: job, title: `스승 · ${c.name} ${turn + 1}/4 · ${TURN_N[turn]}`, who: id, expr, text: (pre ? pre + "\n\n" : "") + T[0], onChoose: "ms_q", ms: { job, turn }, choices };
}
function startMentor(s, r, job, pre) {
  const M = msState(s), id = MENTOR_OF[job];
  M.cur = { kind: "m", job, turn: 0, score: 0, qs: [] }; M.monT = s.t;
  if (!s.cast.includes(id) && !CHAR[id].celeb) s.cast.push(id);
  ensureRel(s, id);
  log(s, `스승을 만났다: ${CHAR[id].name}(${JN(job)})`, "work");
  return turnScene(s, r, job, 0, pre);
}
const ROUTE_PRE = {
  youtube: (c) => `${JN0(c)} 너튜브 라이브 Q&A. 내 사연이 뽑혔다. 화면 속 ${jo(c.name, "이", "가")} 내 닉네임을 부른다. "질문 네 개까지 받을게요."`,
  seminar: (c) => `세미나 쉬는 시간. 연사로 나온 ${jo(c.name, "이", "가")} 내 앞에 멈춰 섰다. "아까 손 들었죠? 커피 들고 와요."`,
  interview: (c) => `해 본 사람이 웃으며 말했다. "제 스승님 소개해 드릴까요?" 며칠 뒤, ${jo(c.name, "과", "와")} 마주 앉았다.`,
  senior: (c) => `선배가 연락처 하나를 건넸다. "이제 저 말고 그분한테 가 봐요." ${c.name}. 그 이름을 모르는 사람이 없다.`,
  insure: (c) => `회사 근처 건물 로비에 포스터가 붙었다. '${c.name} 특강 · 퇴근 후 7시'. 질문 시간에 손이 먼저 올라갔다.`,
  dm: (c) => `알림 하나. ${c.name}에게서 DM이 왔다. "피드 잘 보고 있어요. 커피 한 잔 해요."`,
};
function JN0(c) { return D.SIDEJOBS[c.mentor]?.n || ""; }

// ───────── 탐색 행동 뒤(core.act 에서 SJ.act 다음에 부름) ─────────
export function afterAct(s, r, id, arg, res) {
  if (!s.sj) return;
  if (id === "sj_senior" && arg && SEN_Q[arg]) { res.scene = seniorTurn(s, r, arg, 0); return; }
  let job = null, p = 0;
  if (id === "sj_interview") { job = arg; const f = SJ.fit(s, arg); p = MS_P.interview + (s.st.charm >= 50 ? MS_P.interviewCharm : 0) + (f.g === "S" || f.g === "A" ? MS_P.interviewFit : 0); }
  else if (id === "sj_youtube" || id === "sj_seminar") {
    const cand = Object.keys(MENTOR_OF).filter((k) => canMeet(s, k));
    if (cand.length) { job = r.pick(cand); p = id === "sj_youtube" ? MS_P.youtube : MS_P.seminar; }
  }
  if (!job || !canMeet(s, job) || !r.chance(p)) return;
  const c = CHAR[MENTOR_OF[job]];
  res.scene = startMentor(s, r, job, ROUTE_PRE[id.slice(3)](c));
  (res.lines = res.lines || []).push(`스승을 만났다: ${c.name}`);
}

// ───────── 선배 2턴(sj_senior 장면을 바꾼다) ─────────
function seniorWho(s, job) { const w = SJ.ENTRY[job]?.who; return w && CHAR[w] && !s.rel[w]?.spouse ? w : null; }
function seniorTurn(s, r, job, turn, prevQ) {
  const E = SJ.ENTRY[job], j = D.SIDEJOBS[job], p = SJ.rp(s, job), st = Math.min(2, p.sen), M = msState(s);
  const who = seniorWho(s, job);
  if (turn === 0) { M.cur = { kind: "s", job, turn: 0, score: 0, qs: [], st }; if (who) { if (!s.cast.includes(who)) s.cast.push(who); ensureRel(s, who); } }
  const nm = who ? `${CHAR[who].name}(${E.whoN})` : E.whoN;
  const intro = [`${jo(nm, "을", "를")} 찾아가 커피를 샀다. 한참 내 얘기를 듣더니 입을 열었다.`, `${nm}에게 다시 연락했다. "막혔죠? 다들 그때 연락해요." 밥값은 내가 냈다.`, `${nm}에게 세 번째로 찾아갔다. "이제 다음 단계 얘기할 때네요."`][st];
  const T = SEN_Q[job][turn];
  const choices = shuffle3(r).map((k) => ({ t: T[k][0], q: k, eff: { ...(who ? { aff: SN_GAIN.aff[k] } : {}), ...(k === 0 ? { mental: 1 } : {}) }, text: T[k][1] }));
  const text = turn === 0 ? `${intro}\n\n${E.sen[st].t}\n\n무엇을 더 물어볼까?` : "선배가 커피를 한 모금 마셨다. \"또 궁금한 거 있어요?\"";
  return { kind: "event", tag: "선배", title: `선배 찾아가기 · ${j.n} ${st + 1}/3 · 질문 ${turn + 1}/2`, ...(who ? { who, expr: prevQ === 2 ? "neutral" : "smile" } : {}), text, onChoose: "sn_q", sn: { job, turn }, choices };
}

// ───────── 등급·보상 ─────────
function finishMentor(s, r, job, out) {
  const M = msState(s), cur = M.cur, id = MENTOR_OF[job], c = CHAR[id], E = SJ.ENTRY[job];
  const g = MS_GRADE.find(([lo]) => cur.score >= lo)[1];
  M.met[job] = { id, t: s.t, g, score: cur.score, ...(g === "C" ? { retry: s.t + MS_P.retry } : {}) }; M.cur = null;
  const x = ensureRel(s, id);
  out.push(`스승 등급 ${g} (${cur.score}/12)`);
  if (g !== "C") { x.master = true; x.masterT = s.t; out.push("제자로 받아 줬다 · 매년 3월 스승의 편지"); hidSee(s, job, "스승"); }
  if (g === "S") { const l = hidReveal(s, job, 2); if (l) out.push(l); if (E) out.push(giveBrk(s, E.st, "스승 가르침")); }
  else if (g === "A") { const l = hidReveal(s, job, 1); if (l) out.push(l); }
  else if (g === "C") out.push("\"공부 더 하고 와요.\" 1년 뒤 한 번 더 기회");
  log(s, `${c.name} 스승 등급 ${g}`, "work");
  const zl = job === "cs" ? "Zorro의 한마디" : `${c.name}의 한마디`;
  s.sceneQ.unshift({ kind: "story", tag: "스승", who: id, expr: g === "C" ? "neutral" : "smile", title: zl, text: `"${WORD[job]}"\n\n${g === "C" ? "스승이 웃으며 일어섰다. 다음엔 숫자를 들고 오라고 했다." : `등급 ${g}. 스승이 명함 뒤에 한 줄을 적어 줬다.`}`, choices: [{ t: "계속", eff: {}, text: "" }] });
}
function finishSenior(s, r, job, out) {
  const M = msState(s), cur = M.cur, E = SJ.ENTRY[job], p = SJ.rp(s, job); M.cur = null;
  const memo = (s.sj.memo = s.sj.memo || {}); const L = (memo[job] = memo[job] || []);
  if (!L.some((x) => x.st === cur.st && !x.tip)) L.push({ t: s.t, st: cur.st, txt: E.sen[cur.st].m });
  const good = cur.qs.filter((q) => q === 0).length;
  if (good >= 2 && !L.some((x) => x.tip)) L.push({ t: s.t, st: cur.st, tip: 1, txt: E.ask.replace(/["“”]/g, "") });
  p.sen = Math.min(3, p.sen + 1);
  const gain = SN_GAIN.base + cur.qs.reduce((a, q) => a + SN_GAIN.pts[q], 0); p.pts += E.pt * gain;
  if (good >= 1) { const g2 = gainStat(s, E.st, 0.3 * good); out.push(`${D.STATS[E.st]} +${g2.toFixed(1)}`); }
  out.push(`선배 메모 +1${good >= 2 ? " · 덤으로 꿀팁" : ""} · 초반 고생 −`);
  // 세 번째 만남 뒤: 스승 소개(선배 호감 또는 좋은 질문)
  const who = seniorWho(s, job);
  if (cur.st === 2 && canMeet(s, job) && ((who && (s.rel[who]?.aff || 0) >= MS_P.seniorAff) || good >= 2) && r.chance(MS_P.senior3)) {
    s.sceneQ.unshift(startMentor(s, r, job, ROUTE_PRE.senior(CHAR[MENTOR_OF[job]]))); out.push("선배가 스승을 소개해 줬다");
  }
}
function turnGain(s, job, q, kind) {
  const G = kind === "m" ? MS_GAIN : SN_GAIN, out = [];
  if (!SJ.isFound(s, job)) { const l = SJ.addInt(s, job, G.int[q] / 0.7); if (l) out.push(l); } // 스승·선배 보너스: 정보 0.7 을 거치지 않는다
  else if (kind === "m") { const p = SJ.rp(s, job), E = SJ.ENTRY[job]; if (E && p.done === undefined) { p.pts += E.pt * MS_GAIN.pts[q]; out.push(`초반 진행 +${Math.round(MS_GAIN.pts[q] * 100)}%`); } }
  return out;
}

// ───────── 매달(core endMonth) ─────────
export function mentorMonth(s, r, notes, scenes) {
  if (!s.sj) return;
  const M = msState(s);
  // 1) 스승의 편지(3월)
  if (s.cal === 3 && M.letY !== s.year) {
    M.letY = s.year;
    for (const [job, m] of Object.entries(M.met)) {
      if (!m.g || m.g === "C" || !CHAR[m.id]) continue;
      const E = SJ.ENTRY[job]; let extra = "";
      if ((m.g === "S" || m.g === "A") && E && SJ.isActive(s, job)) extra = ` (${D.STATS[E.st]} +${gainStat(s, E.st, 1, "mentor").toFixed(1)})`;
      else if (m.g === "B" && r.chance(0.5)) { const l = hidReveal(s, job, 1); if (l) extra = ` (${l})`; }
      notes.push(`스승의 편지 · ${CHAR[m.id].name}: "${LETTER[job]}"${extra}`);
    }
  }
  if (M.cur) return; // 질문 장면이 이어지는 중
  const busy = scenes.some((x) => x.mentor || x.onChoose === "ms_side");
  // 2) 보험: 시작 13~24달, 아직 못 만난 투잡 스승 특강(판에 한 번)
  if (!busy && M.ins < 0) {
    const cand = (s.sj.active || []).filter((job) => { const p = s.sj.rp?.[job]; if (!p || p.t0 === undefined) return false; const m = s.t - p.t0; return m >= MS_P.insureFrom && m <= MS_P.insureTo && canMeet(s, job); });
    if (cand.length && r.chance(MS_P.insure)) { const job = r.pick(cand); M.ins = s.t; scenes.push(startMentor(s, r, job, ROUTE_PRE.insure(CHAR[MENTOR_OF[job]]))); return; }
  }
  // 3) 인별: 팔로워 1천 넘으면 스승 DM
  if (!busy && SJ.isActive(s, "insta") && (s.ins?.f || 0) >= MS_P.instaF && canMeet(s, "insta") && r.chance(MS_P.instaDm)) { scenes.push(startMentor(s, r, "insta", ROUTE_PRE.dm(CHAR[MENTOR_OF.insta]))); return; }
  // 4) 투잡 인연
  sideMonth(s, r, scenes);
}
function sideMonth(s, r, scenes) {
  const M = msState(s);
  if (s.t - M.sideT < SIDE_P.gap || scenes.some((x) => x.kind === "event") || !r.chance(SIDE_P.p)) return;
  const act = s.sj.active || []; if (!act.length) return;
  const cand = [];
  for (const c of Object.values(CHAR)) for (const sd of c.side || []) if (act.includes(sd.job) && !c.mentor && !s.rel[c.id]?.spouse && !(s.rel[c.id]?.sideDone || []).includes(sd.job)) cand.push([c, sd]);
  if (!cand.length) return;
  const [c, sd] = r.pick(cand); M.sideT = s.t;
  const line = c.helper?.line || c.lines?.hello || "반가워요.";
  scenes.push({ kind: "event", tag: "투잡 인연", title: `${JN(sd.job)} · ${c.name}`, who: c.id, expr: "smile", text: `${c.name}(${c.job}) · ${sd.role}\n\n"${line}"`, onChoose: "ms_side", side: sd,
    choices: [{ t: "이야기를 오래 나눈다(말빨)", check: { stat: "talk", dc: SIDE_P.dc }, ok: { text: "생각보다 쓸모 있는 이야기가 많았다. 연락처를 주고받았다.", eff: { aff: 6 } }, ng: { text: "대화가 자꾸 끊겼다. 그래도 인사는 나눴다.", eff: { aff: 2 } } }, { t: "인사만 하고 다음을 기약한다", eff: { aff: 2 }, text: "\"다음에 꼭 얘기해요.\"" }] });
}

// ───────── 선택 처리(core.js SCENE_FN) ─────────
export const MS_CHOOSE = {
  ms_q(s, r, i, okv, sc) {
    const M = msState(s), m = sc?.ms, ch = sc?.choices?.[i]; if (!m || !ch || !M.cur || M.cur.kind !== "m") return [];
    const q = ch.q ?? 1; M.cur.score += MS_GAIN.score[q]; M.cur.qs.push(q); M.cur.turn = m.turn + 1;
    const out = [["좋은 질문", "평범한 질문", "엉뚱한 질문"][q], ...turnGain(s, m.job, q, "m")];
    if (m.turn < 3) s.sceneQ.unshift(turnScene(s, r, m.job, m.turn + 1, "", q === 2 && Q[m.job][m.turn][3][2] ? "surprised" : EXPR[q]));
    else finishMentor(s, r, m.job, out);
    return out;
  },
  sn_q(s, r, i, okv, sc) {
    const M = msState(s), m = sc?.sn, ch = sc?.choices?.[i]; if (!m || !ch || !M.cur || M.cur.kind !== "s") return [];
    const q = ch.q ?? 1; M.cur.score += SN_GAIN.score[q]; M.cur.qs.push(q);
    const out = [["좋은 질문", "평범한 질문", "엉뚱한 질문"][q], ...turnGain(s, m.job, q, "s")];
    if (m.turn < 1) s.sceneQ.unshift(seniorTurn(s, r, m.job, 1, q)); else finishSenior(s, r, m.job, out);
    return out;
  },
  ms_side(s, r, i, okv, sc) {
    const sd = sc?.side, x = s.rel[sc?.who]; if (!sd || !x) return [];
    (x.sideDone = x.sideDone || []).push(sd.job);
    const out = [];
    if (okv === true) { const E = SJ.ENTRY[sd.job]; if (E) out.push(`${D.STATS[E.st]} +${gainStat(s, E.st, 0.6).toFixed(1)}`); if (/히든 길/.test(sd.role)) { const l = hidSee(s, sd.job, "인연"); if (l) out.push(l); } }
    return out;
  },
};
// 진행 중 장면이 끊긴 옛 저장: 다음 달에 정리
export function msFix(s) { const M = s.ms; if (M?.cur && !s.pending && !(s.sceneQ || []).some((x) => x.onChoose === "ms_q" || x.onChoose === "sn_q")) M.cur = null; }

// ───────── 봇·시험 ─────────
// 봇이 질문을 고를 때: 말빨이 높을수록 좋은 질문을 잘 고른다(좋은 35~75%, 엉뚱 10%). rnd() 는 봇 난수
export function botPick(s, sc, rnd) {
  const pg = clamp(0.35 + (s.st.talk || 0) / 250, 0.35, 0.75), x = rnd();
  const want = x < pg ? 0 : x < 0.9 ? 1 : 2;
  const i = sc.choices.findIndex((c) => c.q === want); return i < 0 ? 0 : i;
}
// 시험(#...-mstest): 스승 장면을 바로 연다
export function mentorDemo(s, r, job) { const M = msState(s); M.cur = null; M.monT = -99; delete M.met[job]; s.sj.int[job] = Math.max(s.sj.int[job] || 0, 40); return startMentor(s, r, job, ROUTE_PRE.seminar(CHAR[MENTOR_OF[job]])); }
export function seniorDemo(s, r, job) { const p = SJ.rp(s, job); p.sen = 0; s.sj.int[job] = Math.max(s.sj.int[job] || 0, 40); return seniorTurn(s, r, job, 0); }
