// 웹소설 투잡 엔진 플러그인. 규약은 engine/jobs/README.md
// 매일 5,000자. 연재는 체력이다.
// 흐름: 무료 연재 → 노블리 공모전·투고 → 매니지먼트 계약·유료 전환 → 랭킹·댓글 → 100화 완결 → 2차 판권(웹툰화)
// 핵심 자원은 비축분(미리 써 둔 회차). 매달 연재 주기만큼 비축분에서 빠져나가고, 모자라면 펑크 = 독자 이탈.
import * as D from "../defs.js";
import { addMoney, log, won, jo, gainStat, mod, applyEff, CHAR } from "../core.js";
import { hashStr } from "../rng.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js";

const K = "webnovel";
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const R2 = (x) => Math.round(x * 100) / 100;
const working = (s) => !(s.co?.quit || s.co?.fired);
const hasTr = (s, id) => (s.me?.traits || []).includes(id);

// ───────── 11-26 웹소설 개편: 조합 기획(큰 장르 × 세부 장르 × 주인공 × 노리는 독자) → 기획 완성도 ─────────
// 세기 손잡이: 환경변수 WNK = 전체 독자 상한 배율(기본 1). 숫자는 전부 WN_CH 에서만 고친다.
const WNK = (typeof process !== "undefined" && +process.env.WNK) || 1;
const WNB = (typeof process !== "undefined" && process.env.WNB !== undefined && +process.env.WNB); // 시험용: 완성도 기본 점수 덮어쓰기
export const WN_CH = {
  k: WNK * 1, // 봇으로 맞춘 기본 세기
  fitP: [0.08, 0.30, 0.70, 0.92], fitN: ["찰떡", "잘 맞음", "평범", "어색", "상극"], // 궁합 다섯 단계가 나올 비율(8·22·40·22·8%). 화면에는 안 보인다
  plan: {
    base: WNB === false || Number.isNaN(WNB) ? 2 : WNB, // 기획서 기본 점수
    g: [32, 22, 12, 2, -8], // 큰 장르 × 세부 장르 궁합 점수(찰떡 → 상극). 가장 큰 몫
    p: [18, 12, 7, 1, -5], // 세부 장르 × 주인공 궁합 점수
    aud: { match: 6, x: 5, bothP: 0.45, bothHi: 13, bothLo: -2, oppP: 0.12, oppHi: 17, oppLo: -5 }, // 독자층: 맞춤 +6 · 둘 다 노림 45% +13 / 55% −2 · 역발상 12% +17 / 88% −5
    luck: { mean: 8, sd: 14, lo: -18, hi: 42, godP: 0.03, god: 20 }, // 운(주사위). 두 번째로 큰 몫. 3%는 신들림 +20
    skill: { write: 10, sense: 4, lv: 1.5 }, // 내 역량: 글쓰기 100 → +10, 감각 100 → +4, 작가 단계마다 +1.5
    life: 6, hot: 6, cold: -5, scout: 3, // 겪어 본 소재 · 유행 일치 · 식는 장르 · 취재
    tired: [[70, -6], [40, -3]], mental: [[30, -5], [50, -2]], // 컨디션 감점(피로 이상 · 멘탈 미만)
    rep: [0, -8, -16], // 자기 복제(같은 큰 장르 × 세부 장르를 또 쓰면)
    curve: [[0, 0.25], [20, 0.45], [50, 1], [80, 1.6], [100, 2.4]], over: 0.06, // 완성도 → 독자 상한 배율. 100점을 넘으면 1점마다 +0.06(110점 = 3배)
    rate: [0.8, 250, 1.25], // 반응 속도 = clamp(0.8 + 완성도/250, 0.8, 1.25)
    scrap: { bank: 0.5, tired: 8, mental: -2 }, // 엎고 다시 기획: 비축분 절반, 피로 +8, 멘탈 −2, 이번 달은 다시 못 짠다
  },
  grow: { from: 30, per: 0.02, lim: 0.35, w0: 55, w1: 95 }, // 필력 만회: 30화부터 펑크 없는 달마다. 글쓰기 55 이하는 0, 95 이상이면 달 +2%p, 한도 +35%
  trend: { len: [8, 14], hot: 1.3, cold: 0.8, hotCap: 1.1, coldCap: 0.93, rumor: 0.7, makeFans: 300, makeSc: 80 }, // 유행: 뜨는 세부 장르 2 · 식는 큰 장르 1. 소문은 70%만 맞는다
  life: { ret: 0.02 }, // 겪어 본 소재: 첫 연독률 +2%p
  flop: 0.6, jack: 2, // 쪽박·대박 기준(독자 상한 배율)
  rev: { base: 0.06, ep: 0.08, noPunk: 0.06, trend: 0.10, max: 0.30, x: [3, 6], under: 0.8, jump: 1.6, expo: [1.6, 3] }, // 역주행: 40화·70화·완결 때 판정
  rework: { keep: 0.6, minEp: 5 }, // 고쳐 쓰기: 독자 60% 유지, 비축분 절반, 한 달 휴재
  drop: { carry: [0.2, 0.35], lazyFrom: 3, lazyCut: 0.12, lazyMin: 0.5 }, // 접고 새로: 독자 20~35% 승계. 세 번째 접기부터 '연중 작가'
  award: { boost: 1.25, flat: 60 }, // 연말 시상: 다음 작품 첫 독자
  out: { p: [0.003, 0.01, 0.028, 0.05], gap: 6, max: 2, fansDiv: 800, work: 1.3 }, // 들켰다: 민망한 정도(0~3)별 달 확률
  totalClamp: [0.12, 9],
};
// 큰 장르: rate = 독자가 붙는 속도, cap = 커질 수 있는 크기, aud = 기본 독자층(m 남성향·f 여성향·x 가리지 않음), lv = 열리는 작가 단계, shy = 남이 알면 민망한 정도(0~3)
// W = 제목에 쓰는 무대, PRE = 제목 앞머리. 앞의 네 키(hyun·rofan·murim·fan)는 예전 저장과 봇이 쓰므로 순서와 키를 바꾸지 않는다.
export const GENRES = {
  hyun: { n: "현대판타지", rate: 0.2, cap: 1.0, aud: "m", lv: 1, shy: 0, tip: "현판. 회사·돈·능력. 4~8개월이면 반응이 온다", titles: ["팀장이 회귀했다", "퇴근하면 레벨 업", "야근 없는 회사의 비밀", "신입이 사장을 기억한다"], W: ["우리 회사", "강남", "편의점", "판교"], PRE: ["퇴근 후", "월급쟁이", "SSS급"] },
  rofan: { n: "로맨스판타지", rate: 0.27, cap: 0.9, aud: "f", lv: 1, shy: 1, tip: "로판. 반응이 가장 빠르다(3~6개월). 경쟁이 세고 독자가 냉정하다", titles: ["악녀는 정시 퇴근합니다", "북부 대공의 계약 비서", "이혼은 3화에서 하겠습니다"], W: ["북부", "황궁", "공작가", "제국"], PRE: ["버림받은", "시한부", "계약직"] },
  murim: { n: "무협", rate: 0.13, cap: 1.2, aud: "m", lv: 1, shy: 0, tip: "느리게 오른다(6~12개월). 한번 붙은 독자는 오래 간다", titles: ["화산파 막내 사형", "천하제일 회계사", "검마의 정시 퇴근"], W: ["화산파", "무림맹", "객잔", "마교"], PRE: ["천하제일", "화산의", "삼류"] },
  fan: { n: "정통 판타지", rate: 0.15, cap: 1.12, aud: "m", lv: 1, shy: 0, tip: "세계관 짜는 시간이 길다. 터지면 크다", titles: ["탑 100층의 공무원", "황혼의 서약", "마왕성 경영기획팀"], W: ["마왕성", "왕국", "용사 파티", "변경 마을"], PRE: ["전설의", "만년 2등", "은퇴한"] },
  regress: { n: "회귀·빙의·환생", rate: 0.22, cap: 0.98, aud: "x", lv: 1, shy: 0, tip: "회빙환. 1화에서 죽고 2화에서 눈을 뜬다. 누구나 쓰고 누구나 읽는다", titles: ["두 번째 입사 첫날", "죽었더니 10년 전", "이번 생은 칼퇴한다"], W: ["전생", "2회차", "10년 전", "소설 속"], PRE: ["회귀한", "환생한", "빙의한"] },
  hunter: { n: "헌터·게이트", rate: 0.21, cap: 1.02, aud: "m", lv: 1, shy: 0, tip: "게이트가 열리고 등급이 매겨진다. 익숙해서 읽고, 익숙해서 묻힌다", titles: ["F급 헌터의 출근길", "게이트 관리과 9급", "나만 던전에 야근함"], W: ["게이트", "헌터 협회", "S급 던전", "길드"], PRE: ["F급", "S급", "각성한"] },
  romance: { n: "현대 로맨스", rate: 0.25, cap: 0.88, aud: "f", lv: 1, shy: 1, tip: "현로. 빨리 붙고 빨리 식는다. 남주 직함이 절반", titles: ["본부장님, 결재 바랍니다", "옆자리가 전 남친", "사내 메신저 주의보"], W: ["옆 팀", "본사 12층", "옆집", "소개팅 자리"], PRE: ["까칠한", "철벽", "하필이면"] },
  bl: { n: "BL", rate: 0.26, cap: 0.92, aud: "f", lv: 1, shy: 3, tip: "충성 독자가 두껍다. 결제율이 높고, 취향 저격이 아니면 바로 하차한다", titles: ["야근은 둘이서", "팀장님과 같은 우산", "퇴근길이 같은 방향"], W: ["옆 부서", "작업실", "본부장실", "야근 사무실"], PRE: ["무심한", "다정한", "하필이면"] },
  gl: { n: "GL", rate: 0.2, cap: 0.86, aud: "x", lv: 1, shy: 3, tip: "작지만 끈끈한 시장. 한번 선작하면 끝까지 온다", titles: ["꽃집 사장님의 단골", "편집부의 두 사람", "심야 카페 마감 조"], W: ["꽃집", "편집부", "옥상 정원", "심야 카페"], PRE: ["새침한", "단골", "옆자리"] },
  game: { n: "게임판타지", rate: 0.19, cap: 1.05, aud: "m", lv: 2, shy: 0, tip: "겜판. 로그인하면 이야기가 시작된다. 숫자와 랭킹의 맛", titles: ["만렙인데 튜토리얼", "랭킹 1위는 직장인", "서버 종료까지 3일"], W: ["서버", "튜토리얼", "길드전", "랭킹전"], PRE: ["만렙", "뉴비", "랭킹 1위"] },
  sageuk: { n: "사극 로맨스", rate: 0.18, cap: 1.0, aud: "f", lv: 2, shy: 1, tip: "고증 댓글이 무섭다. 대신 한번 빠진 독자는 완결까지 간다", titles: ["궁녀는 퇴궐하고 싶다", "세자빈 간택 불참 사유서", "한양 제일 매파"], W: ["궁궐", "한양", "대궐", "저잣거리"], PRE: ["조선의", "도망친", "가짜"] },
  thriller: { n: "스릴러·미스터리", rate: 0.16, cap: 1.08, aud: "x", lv: 2, shy: 0, tip: "복선 관리가 전부다. 범인 맞히는 댓글과 싸워야 한다", titles: ["목격자는 야근 중", "13번째 결재 서류", "마지막 퇴근자"], W: ["사건 현장", "지하 3층", "마지막 열차", "폐건물"], PRE: ["유일한 목격자", "미제 사건의", "용의자"] },
  heal: { n: "일상·힐링", rate: 0.17, cap: 0.94, aud: "x", lv: 2, shy: 0, tip: "사건이 없어야 사건이다. 천천히 붙고, 잘 안 떠난다", titles: ["퇴사하고 시골 책방", "옥탑방 고양이 일지", "골목 끝 밥집"], W: ["시골 마을", "골목 끝", "바닷가", "옥탑방"], PRE: ["느긋한", "퇴사한", "동네"] },
  horror: { n: "호러·괴담", rate: 0.18, cap: 1.1, aud: "x", lv: 3, shy: 1, tip: "밤에 읽고 낮에 댓글 단다. 규칙 하나가 터지면 커뮤니티가 대신 홍보한다", titles: ["야간 근무 수칙 7번", "13층은 누르지 마세요", "새벽 편의점 인수인계"], W: ["야간 근무", "13층", "폐병원", "새벽 편의점"], PRE: ["규칙을 어긴", "혼자 남은", "야간조"] },
  sports: { n: "스포츠", rate: 0.15, cap: 1.14, aud: "m", lv: 3, shy: 0, tip: "시즌이 길다. 경기 묘사에 체력이 든다. 우승 화에서 결제가 터진다", titles: ["만년 후보의 9회 말", "방출 통보를 받았다", "2군 감독의 봄"], W: ["2군", "벤치", "만년 꼴찌 팀", "결승전"], PRE: ["방출당한", "만년 후보", "천재"] },
  sf: { n: "SF", rate: 0.12, cap: 1.25, aud: "m", lv: 3, shy: 0, tip: "독자가 적다. 대신 터지면 2차 판권이 먼저 온다", titles: ["화성 지사 발령", "냉동 수면 300년 차", "함장은 정시 퇴근한다"], W: ["우주 정거장", "화성", "함대", "2099년"], PRE: ["마지막", "냉동 수면에서 깬", "인공지능과 사는"] },
  althis: { n: "대체역사", rate: 0.13, cap: 1.22, aud: "m", lv: 4, shy: 0, tip: "대역. 자료 조사가 절반. 댓글창이 사학과 세미나가 된다", titles: ["조선에 회계를 가르쳤다", "세종 시대 기획실", "고려 무역왕"], W: ["조선", "고려", "대한제국", "임진년"], PRE: ["조선에 간", "세종 시대의", "미래에서 온"] },
  apoc: { n: "아포칼립스", rate: 0.17, cap: 1.16, aud: "m", lv: 4, shy: 0, tip: "세상이 망해야 시작된다. 초반 사재기 파트가 제일 잘 팔린다", titles: ["멸망 3일 전 사재기", "대피소 총무", "무너진 서울의 택배"], W: ["멸망 3일 차", "폐허", "대피소", "무너진 서울"], PRE: ["혼자 살아남은", "멸망 이후의", "사재기한"] },
};
// 세부 장르·소재: [키, 태그 이름, 제목에 쓰는 말, 민망한 정도 0~3]
const SUB_L = [
  ["office", "직장물", "김 대리", 0], ["chaebol", "재벌물", "재벌 3세", 0], ["doc", "전문가물(의사)", "외과의", 0], ["law", "전문가물(변호사)·법정", "변호사", 0], ["acct", "전문가물(회계사)", "회계사", 0],
  ["chef", "요리", "요리사", 0], ["academy", "아카데미물", "아카데미 수석", 0], ["tower", "탑등반", "탑 등반자", 0], ["status", "상태창", "상태창 각성자", 0], ["star", "성좌물", "성좌", 0],
  ["baby", "육아물", "초보 아빠", 1], ["villainess", "악역 영애", "악역 영애", 2], ["contract", "계약 결혼", "계약 배우자", 2], ["regret", "후회남", "후회남", 2], ["obsess", "집착", "집착남", 3],
  ["omega", "오메가버스", "평범한 베타", 3], ["idol", "연예계·아이돌", "7년 차 아이돌", 1], ["stream", "인터넷 방송", "하꼬 방송인", 1], ["farm", "농사·귀농", "귀농인", 0], ["domain", "영지 경영", "영주", 0],
  ["bookin", "책빙의", "엑스트라", 1], ["loop", "무한 회귀", "회귀자", 0], ["ts", "TS", "성별이 바뀐 용사", 3], ["army", "군대", "말년 병장", 0], ["stock", "주식·코인", "개미 투자자", 0],
  ["coach", "스포츠 감독", "감독", 0], ["dungeon", "던전 경영", "던전 주인", 0], ["zombie", "좀비", "생존자", 0], ["rules", "괴담 규칙", "야간 경비원", 2], ["campus", "캠퍼스물", "복학생", 1],
  ["officelove", "사내 연애", "옆 팀 대리", 2], ["triangle", "삼각관계", "서브 남주", 2], ["enemies", "혐관", "원수", 2], ["salvation", "구원 서사", "구원자", 1], ["revenge", "복수극", "복수자", 0],
  ["detective", "추리", "탐정", 0], ["isekai", "이세계 전이", "이세계인", 0], ["exile", "용사 파티 추방", "추방당한 짐꾼", 0], ["demon", "마왕", "마왕", 0], ["necro", "네크로맨서", "네크로맨서", 0],
  ["smith", "대장장이", "대장장이", 0], ["merchant", "상인", "상인", 0], ["healer", "힐러", "힐러", 0], ["tamer", "테이머·펫", "테이머", 0], ["guild", "길드 경영", "길드장", 0],
  ["fortune", "점술·무당", "점술가", 1], ["mentor", "스승·제자 육성", "스승", 0], ["startup", "창업물", "스타트업 대표", 0], ["civil", "공무원물", "9급 공무원", 0], ["shop", "자영업물", "사장님", 0],
  ["gacha", "가챠·뽑기", "뽑기 중독자", 0], ["genius", "천재물", "천재", 0], ["pd", "방송국·PD", "예능 PD", 0], ["actor", "배우물", "무명 배우", 1], ["manager", "매니저물", "매니저", 0],
  ["writer", "작가물", "웹소설 작가", 1], ["gamer", "프로게이머", "프로게이머", 0], ["vr", "가상현실", "랭커", 0], ["mecha", "메카·로봇", "파일럿", 0], ["space", "우주 함대", "함장", 0],
  ["time", "타임슬립", "시간 여행자", 0], ["palace", "궁중 암투", "상궁", 1], ["knight", "기사단", "기사단장", 1], ["duke", "북부 대공", "북부 대공", 2], ["saint", "성녀", "성녀", 1],
  ["dragon", "드래곤", "드래곤", 0], ["sect", "문파 재건", "장문인", 0], ["medic", "의원·약사", "의원", 0], ["assassin", "암살자", "암살자", 0], ["escort", "표국·호위", "표사", 0],
  ["agency", "헌터 사무소", "헌터 사무소 직원", 0], ["landlord", "건물주", "건물주", 0], ["lotto", "로또·벼락부자", "로또 1등", 0], ["ghost", "귀신 보는 눈", "귀신 보는 사람", 1], ["survive", "생존 게임", "참가자", 0],
  ["agent", "비밀 조직", "요원", 0], ["retire", "은퇴·슬로라이프", "은퇴 용사", 0], ["cafe", "카페·힐링", "카페 사장", 0], ["fake", "가짜 연애", "가짜 애인", 2], ["divorce", "이혼·재회물", "전 배우자", 2],
  ["butler", "집사·시종", "집사", 1], ["thug", "삼류 악당 빙의", "삼류 악당", 0], ["npc", "NPC", "잡화점 NPC", 0], ["taxman", "세무·감사", "감사팀 과장", 0],
];
export const SUBS = Object.fromEntries(SUB_L.map(([k, n, w, shy]) => [k, { n, w, shy }]));
const SUB_KEYS = SUB_L.map((x) => x[0]);
// 주인공 유형: p = 제목에 붙는 말, rate·cap = 속도·크기에 주는 작은 차이
export const PROS = {
  munch: { n: "먼치킨", tip: "처음부터 다 이긴다. 빨리 붙는다", rate: 1.1, cap: 0.95, p: ["너무 강함", "혼자 다 함", "힘을 숨김"] },
  grow: { n: "성장형", tip: "천천히 오르고 오래 간다", rate: 0.95, cap: 1.08, p: ["매일 레벨 업", "오늘도 1 올랐음", "꼴찌에서 시작함"] },
  mis: { n: "착각계", tip: "주인공만 모른다. 댓글이 재밌다", rate: 1.05, cap: 1, p: ["다들 오해함", "아무 생각 없음", "어쩌다 영웅 됨"] },
  brain: { n: "책사형", tip: "판을 짠다. 느리지만 크다", rate: 0.92, cap: 1.1, p: ["다 계획이 있음", "세 수 앞을 봄", "말로 다 이김"] },
  villain: { n: "악역", tip: "나쁜데 응원하게 된다", rate: 1, cap: 1.02, p: ["악당이 됨", "착하게는 안 삶", "최종 보스가 꿈임"] },
  extra: { n: "조연 시점", tip: "주인공 옆에서 구경한다", rate: 1.02, cap: 0.98, p: ["엑스트라인데 눈에 띔", "주인공이 자꾸 찾아옴", "구경만 하려 했음"] },
  normal: { n: "평범한 소시민", tip: "조용히 살고 싶다. 안 된다", rate: 0.97, cap: 1.03, p: ["조용히 살고 싶음", "월급만 받으면 됨", "제발 그냥 두세요"] },
};
export const AUDS = { m: { n: "남성향", tip: "사이다와 성장" }, f: { n: "여성향", tip: "감정선과 관계" }, b: { n: "둘 다 노림", tip: "터지면 크다. 어중간해지기 쉽다" } };
// 글자 씨앗 → 0~1. 궁합·소재 카드·제목은 저장하지 않고 씨앗으로 그때그때 계산한다.
const u01 = (str) => { let h = hashStr(str); h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const lifeKey = (s) => `${s.seed}:${s.ng?.n || 1}:wn`; // 인생(씨앗 + 회차)마다 궁합표가 다르다
export function fitTier(s, a, b) { const u = u01(`${lifeKey(s)}:fit:${a}:${b}`), P = WN_CH.fitP; return u < P[0] ? 0 : u < P[1] ? 1 : u < P[2] ? 2 : u < P[3] ? 3 : 4; }
export const genreOpen = (s, g) => !!GENRES[g] && (s.webnovel?.lv || 1) >= (GENRES[g].lv || 1);
const openGenres = (s) => Object.keys(GENRES).filter((g) => genreOpen(s, g));
// 내 인생에서 나오는 소재 카드(최대 3장): 직무 → 다른 투잡 → 연애·결혼 → 취미 → 회사 종류
const LIFE_JOB = { acct: "acct", legal: "law", plan: "office", admin: "office", hr: "office", pm: "startup", sales: "merchant", ovs: "merchant", buy: "merchant", md: "merchant", mkt: "stream", prj: "pd", dev: "status", dfin: "status", rnd: "smith", tech: "smith", prod: "smith", dsgn: "writer", rm: "stock", pb: "stock", am: "stock", risk: "taxman", ins: "taxman", ib: "chaebol" };
const LIFE_SJ = { chicken: "shop", ucafe: "cafe", coffee: "cafe", tutoring: "academy", insta: "stream", cs: "mentor", vibe: "status", tarot: "fortune", saju: "fortune", pr: "dungeon", airbnb: "dungeon", shortstay: "landlord", petsit: "tamer", club: "guild", popup: "merchant", goods: "smith", aivideo: "pd", thesis: "mentor", press: "writer", tistory: "writer", realtyblog: "landlord", bouquet: "shop" };
const LIFE_HB = { run: "coach", climb: "tower", soccer: "coach", cook: "chef", wine: "chef", camp: "farm", band: "idol", board: "survive", tarot: "fortune", write: "writer", book: "bookin", photo: "stream", travel: "isekai", lingo: "isekai", code: "status", mentor: "mentor", flower: "cafe" };
const LIFE_CO = { big: "chaebol", startup: "startup", public: "civil", fin: "stock", mid: "office" };
export function lifeCards(s) {
  const out = [], add = (k, why) => { if (k && SUBS[k] && !out.some((x) => x.k === k)) out.push({ k, why }); };
  if (working(s)) add(LIFE_JOB[s.me?.job], `회사에서 ${D.JOBS[s.me?.job]?.n || "내 일"} 일을 해 봤다`);
  for (const j of s.sj?.active || []) if (j !== K) add(LIFE_SJ[j], `${D.SIDEJOBS[j]?.n || "다른 투잡"} 해 봤다`);
  if (s.fam?.kids?.length) add("baby", "아이를 키우고 있다");
  else if (s.fam?.spouse) add("contract", "결혼 생활을 안다");
  else if (Object.values(s.rel || {}).some((x) => x.lover)) add(working(s) ? "officelove" : "fake", "연애 중이다");
  for (const h of s.hb?.joined || []) add(LIFE_HB[h], `${D.HOBBIES[h]?.n || "취미"}에서 겪었다`);
  if (working(s)) add(LIFE_CO[s.co?.type], "회사 생활이 소재다");
  return out.slice(0, 3);
}
// 이번에 손에 든 소재 카드: 무작위 5장 + 인생 카드 1~3장. 취재(wn_scout)·새 작품·고쳐 쓰기 뒤에 drawN 이 올라 새로 뽑힌다.
export function hand(s) {
  const W = s.webnovel, rand = []; let i = 0;
  while (rand.length < 5 && i < 80) { const k = SUB_KEYS[Math.floor(u01(`${lifeKey(s)}:draw:${W?.drawN || 0}:${i++}`) * SUB_KEYS.length)]; if (!rand.includes(k)) rand.push(k); }
  return { rand, life: lifeCards(s).filter((x) => !rand.includes(x.k)) };
}
const handKeys = (s) => { const h = hand(s); return [...h.rand, ...h.life.map((x) => x.k)]; };
const isLife = (s, sub) => lifeCards(s).some((x) => x.k === sub);
// 제목 틀. S = 소재의 말, W = 무대, P = 주인공 한마디, PRE = 앞머리
const TITLE_F = [
  (x) => `${x.W}의 ${x.S}`, (x) => `${x.S}인데 ${x.P}`, (x) => `${jo(x.S, "은", "는")} 정시 퇴근합니다`, (x) => `${x.PRE} ${x.S}`, (x) => `${jo(x.S, "이", "가")} ${x.W}에 떨어졌다`,
  (x) => `어느 날 ${jo(x.S, "이", "가")} 되었다`, (x) => `${x.W} ${x.S} 생존기`, (x) => `나 혼자만 ${x.S}`, (x) => `${x.S}, ${x.P}`, (x) => `${x.PRE} ${x.S}의 ${x.W} 적응기`,
  (x) => `${jo(x.S, "을", "를")} 그만두겠습니다`, (x) => `${x.W}에 ${jo(x.S, "이", "가")} 너무 많다`, (x) => `퇴사하고 ${x.W} ${x.S}`, (x) => `${x.S} 생활 백서`, (x) => `${x.PRE} ${jo(x.S, "은", "는")} 월요일이 싫다`,
  (x) => `${x.W}에서 ${x.S} 하는 중입니다`, (x) => `이번 생은 ${x.S}`, (x) => `${jo(x.S, "이", "가")} 야근을 숨김`,
];
export function autoTitle(g, sub, pro, i = 0, descr = false) {
  const G = GENRES[g] || GENRES.hyun, S = SUBS[sub], P = PROS[pro] || PROS.grow; if (!S) return G.titles[i % G.titles.length];
  const key = `${g}:${sub}:${pro}:${i}`, pk = (L, t) => L[Math.floor(u01(key + t) * L.length)];
  const x = { S: S.w, W: pk(G.W, "w"), PRE: pk(G.PRE, "p"), P: pk(P.p, "q") };
  return (descr ? TITLE_F[u01(key + "d") < 0.5 ? 1 : 8] : pk(TITLE_F, "f"))(x);
}
export const isOpp = (w) => { const ga = GENRES[w?.g]?.aud || "x"; return !!w?.aud && w.aud !== "b" && ga !== "x" && w.aud !== ga; };
const repN = (s, g, sub) => (s.webnovel?.works || []).filter((x) => x.g === g && x.sub && x.sub === sub).length;
export const shyOf = (w) => Math.max(GENRES[w?.g]?.shy || 0, SUBS[w?.sub]?.shy || 0);
// 유행: 지금 뜨는 세부 장르·식는 큰 장르에 걸렸는지
export function trendOf(s, w) {
  const T = s.webnovel?.tr, C = WN_CH.trend, hot = !!(T && w?.sub && T.hot.includes(w.sub)), cold = !!(T && w && T.cold === w.g);
  return { hot, cold, rate: (hot ? C.hot : 1) * (cold ? C.cold : 1), cap: (hot ? C.hotCap : 1) * (cold ? C.coldCap : 1) };
}
// 완성도 → 독자 상한 배율(20점 0.45 · 50점 1 · 80점 1.6 · 100점 2.4 · 그 위는 1점에 +0.06)
export function scoreMult(sc) {
  const C = WN_CH.plan.curve, L = C[C.length - 1];
  if (sc >= L[0]) return R2(L[1] + (sc - L[0]) * WN_CH.plan.over);
  for (let i = 1; i < C.length; i++) if (sc <= C[i][0]) { const [a, va] = C[i - 1], [b, vb] = C[i]; return R2(va + (vb - va) * clamp((sc - a) / (b - a), 0, 1)); }
  return 1;
}
export const scoreWord = (sc) => (sc > 100 ? "신들린 기획" : sc >= 80 ? "이건 된다" : sc >= 55 ? "무난하다" : sc > 35 ? "뭔가 어긋났다" : "쓰는 나도 모르겠다");
// 기획 완성도 계산. 운(주사위)과 독자층 적중은 r 로 굴리고, 나머지는 지금 상태에서 나온다. keep 을 주면 그 운을 그대로 쓴다(고쳐 쓰기).
// 돌려주는 parts = 화면 연출용 요소별 기여 [{ id, n, v }]. 마지막이 운.
export function planScore(s, r, o, keep) {
  const W = s.webnovel, P = WN_CH.plan, st = s.st || {}, G = GENRES[o.g] || GENRES.hyun, parts = [], add = (id, n, v) => { v = Math.round(v); if (v || id === "luck") parts.push({ id, n, v }); };
  const fx = [fitTier(s, o.g, o.sub), fitTier(s, o.sub, o.pro)];
  add("base", "기획서 한 장", P.base);
  add("gfit", "장르 궁합", P.g[fx[0]]); add("pfit", "주인공 궁합", P.p[fx[1]]);
  let av = keep?.aud;
  if (av === undefined) { const A = P.aud, ga = G.aud || "x"; av = o.aud === "b" ? (r.chance(A.bothP) ? A.bothHi : A.bothLo) : ga === "x" ? A.x : o.aud !== ga ? (r.chance(A.oppP) ? A.oppHi : A.oppLo) : A.match; }
  add("aud", o.aud === "b" ? "독자층(둘 다 노림)" : isOpp(o) ? "독자층(역발상)" : "독자층", av);
  add("skill", "필력", (st.write || 0) / 100 * P.skill.write + (st.sense || 0) / 100 * P.skill.sense);
  add("lv", "작가 경력", ((W.lv || 1) - 1) * P.skill.lv);
  const life = isLife(s, o.sub); if (life) add("life", "겪어 본 소재", P.life);
  const tr = trendOf(s, o); if (tr.hot) add("hot", "유행을 탔다", P.hot); if (tr.cold) add("cold", "식는 장르", P.cold);
  if (W.scouted) add("scout", "취재", P.scout);
  const cond = (P.tired.find(([t]) => W.tired >= t)?.[1] || 0) + (P.mental.find(([m]) => s.mental < m)?.[1] || 0); if (cond) add("cond", "컨디션", cond);
  const rn = Math.min(2, repN(s, o.g, o.sub)); if (rn) add("rep", "자기 복제", P.rep[rn]);
  let luck = keep?.luck, god = keep?.god || false;
  if (luck === undefined) { const Lk = P.luck; luck = Math.round(clamp(Lk.mean + Lk.sd * r.normal(), Lk.lo, Lk.hi)); if (r.chance(Lk.godP)) { luck += Lk.god; god = true; } }
  add("luck", god ? "운(신들림)" : "운", luck);
  const score = Math.max(0, parts.reduce((a, x) => a + x.v, 0));
  return { g: o.g, sub: o.sub, pro: o.pro, aud: o.aud, fx, parts, luck, god, audV: av, life, score, mult: scoreMult(score), word: scoreWord(score) };
}
// 작품 배율: w.hit(완성도가 준 배율 × 사건 효과) × 필력 만회 × 역주행 × 유행. 예전 방식 작품은 w.hit 그대로
export const baseM = (w) => (w?.hit || 1) * (1 + (w?.grow || 0)) * (PROS[w?.pro]?.cap || 1);
export function comboM(s, w) { return clamp(baseM(w) * (w?.rev || 1) * trendOf(s, w).cap, WN_CH.totalClamp[0], WN_CH.totalClamp[1]) * WN_CH.k; }
const rateM = (s, w) => (w?.sc !== undefined ? clamp(WN_CH.plan.rate[0] + w.sc / WN_CH.plan.rate[1], WN_CH.plan.rate[0], WN_CH.plan.rate[2]) * (PROS[w.pro]?.rate || 1) : 1) * trendOf(s, w).rate;
// 기획 화면의 임시 선택(저장됨). 빈 곳은 기본값으로 채워 돌려준다.
export function draftOf(s) {
  const W = s.webnovel, d = W.draft || {}, og = openGenres(s), hk = handKeys(s);
  const g = og.includes(d.g) ? d.g : og[0], sub = hk.includes(d.sub) ? d.sub : hk[0], pro = PROS[d.pro] ? d.pro : "grow";
  const aud = AUDS[d.aud] ? d.aud : (GENRES[g].aud === "x" ? "m" : GENRES[g].aud), ti = d.ti || 0;
  return { g, sub, pro, aud, ti, title: d.title || autoTitle(g, sub, pro, ti), custom: !!d.title };
}
export function setDraft(s, p) { const W = s.webnovel; W.draft = { ...(W.draft || {}), ...p }; if ((p.g || p.sub || p.pro || p.ti !== undefined) && !("title" in p)) W.draft.title = ""; return draftOf(s); }
const T2 = { hyun: ["퇴근만 하면 레벨이 오름", "회귀한 팀장이 칼퇴함", "신입인데 사장님을 기억함"], rofan: ["대공님 이혼은 다음 화에", "악녀인데 정시 퇴근함", "계약 비서가 대공비가 됨"], murim: ["무림맹 막내가 회계를 함", "검마가 칼퇴를 사수함"], fan: ["100층 탑이 내 사무실임", "마왕성 기획팀이 일을 너무 잘함"] };
// 연재 주기: 한 달에 올리는 화수
export const SCHED = { 0: { n: "휴재", f: 0 }, 8: { n: "주 2회", f: 0.8 }, 12: { n: "주 3회", f: 1 }, 20: { n: "주 5회", f: 1.22 } };
export const LEVELS = [
  null,
  { n: "자유연재 새내기", need: "시작, 1화 업로드", unlock: "노블리 자유연재, 하루 1,000~1,500자 루틴" },
  { n: "20화의 벽을 넘은 자", need: "한 작품 20화 + 충성 독자 50명", unlock: "공모전 참가·매니지먼트 투고" },
  { n: "유료화 작가", need: "연재 50화 + 매니지먼트 계약 → 유료 전환", unlock: "유료 연재(한 화 100원, 작가 몫 약 42%), 표지 지원" },
  { n: "완결 작가", need: "100화 완결 + 최고 독자 500명", unlock: "완결작 인세(전자책·단행본), 차기작 선인세" },
  { n: "IP 작가", need: "유료 완결 2질 또는 2차 판권 계약 1건", unlock: "웹툰화·해외 번역, 작법 강의" },
];
export const SEASON = [1.08, 1.05, 0.96, 0.97, 1, 1, 1.08, 1.1, 0.96, 1, 1, 1.05]; // 방학·연휴에 많이 읽는다
export const CONTEST_M = [5, 6, 10, 11]; // 노블리 공모전 시즌
// 11-21 밸런스(엔딩 희소성). 원래: 웹툰화 제안은 최고 독자 800명부터 달마다 3~25% → '원작자' 엔딩 100%, '성실한 완결 작가'는 28개월에 100%.
// 지금: 최고 독자 ipPeak 명부터·확률 최고독자/ipDiv(2~15%). 성실한 완결 작가는 완결 3질 + 연재 steadyM 달 + 판권 없이(대박은 없었지만).
export const WN_BAL = { ipPeak: 6000, ipDiv: 60000, steadyM: 60 };
// 11-22 특이 요소 3개(독점·비독점, 표절 시비, 편집자 피드백). 효과 크기는 여기만 고친다.
export const WN_F30 = {
  deal: { ep: 40, adv: [0.35, 150, 1500], waitAdv: 1.2, exM: 6, exExpo: 1.25, exAfter: 1.08, // 독점: 선인세 = clamp(독자×0.35, 150, 1500)만 × 물가(연재 수익에서 먼저 깎임), 메인 배너 6달 노출 ×1.25 → 그 뒤 ×1.08
    waitFans: 1.3, waitCap: 1.12, waitPay: 0.72, // 기다리면 무료: 독자 유입 ×1.3·크기 ×1.12, 한 명당 결제 ×0.72
    multiPay: 1.18, multiExpo: 0.9, multiTired: 4 }, // 비독점: 여러 곳 결제 ×1.18, 노출 ×0.9, 업로드 관리 피로 +4/달
  plag: { fans: 120, gap: 30, spread: 0.45 }, // 표절 시비: 독자 120명부터, 30달에 한 번까지. 무시하면 45% 확률로 번진다
  edit: { gap: 10, ret: 4, hit: 5, pen: 100, indieShare: 0.55, indieExpo: 0.88, indieTired: 3 }, // 편집자: 10달에 한 번까지. 혼자 가면 작가 몫 42→55%, 노출 ×0.88, 피로 +3/달, 위약금 100만+남은 선인세
};
// 계약 방식에 따른 배율
export function dealFx(w) {
  const D3 = WN_F30.deal, E3 = WN_F30.edit, o = { expo: 1, fans: 1, pay: 1, tired: 0 };
  if (!w) return o;
  if (w.deal === "ex" || w.deal === "wait") o.expo = w.exT > 0 ? D3.exExpo : D3.exAfter;
  if (w.deal === "wait") { o.fans = D3.waitFans; o.pay = D3.waitPay; }
  if (w.deal === "multi") { o.expo = D3.multiExpo; o.pay = D3.multiPay; o.tired = D3.multiTired; }
  if (w.indie) { o.expo *= E3.indieExpo; o.tired += E3.indieTired; }
  return o;
}
export const DEAL_N = { ex: "독점", wait: "독점·기다리면 무료", multi: "비독점" };
const PER_FAN_EP = 0.0036; // 독자 1명이 1화 결제(100원) → 플랫폼 40% 떼고, 매니지먼트 3 : 작가 7 → 작가 약 42원 × 구매율 85%

export function lvNeed(s) {
  const W = s.webnovel; if (!W || W.lv >= 5) return null;
  const n = W.lv + 1, L = LEVELS[n];
  const prog = n === 2 ? Math.min(1, (W.work?.ep || W.maxEp) / 20) * 0.5 + Math.min(1, (W.work?.fans || 0) / 50) * 0.5
    : n === 3 ? Math.min(1, (W.work?.ep || 0) / 50) * 0.6 + (W.work?.mgmt ? 0.4 : 0)
    : n === 4 ? Math.min(1, (W.work?.ep || 0) / 100) * 0.6 + Math.min(1, Math.max(W.bestPeak, W.work?.peak || 0) / 500) * 0.4
    : Math.max(Math.min(1, W.paidDone / 2), W.ip ? 1 : 0);
  return { lv: n, n: L.n, need: L.need, prog };
}
function lvCheck(s, notes, scenes) {
  const W = s.webnovel, w = W.work;
  const ok = (n) => n === 2 ? (W.maxEp >= 20 && Math.max(W.bestFans, w?.fans || 0) >= 50)
    : n === 3 ? W.paidEver
    : n === 4 ? (W.done >= 1 && W.bestPeak >= 500)
    : n === 5 ? (W.paidDone >= 2 || W.ip >= 1) : false;
  while (W.lv < 5 && ok(W.lv + 1)) { W.lv++; notes.push(`웹소설 Lv${W.lv} ${LEVELS[W.lv].n} · 열림: ${LEVELS[W.lv].unlock}`); log(s, `웹소설 Lv${W.lv} ${LEVELS[W.lv].n}`, "work"); }
}
// 작품 품질(0.5~1.5): 글쓰기·감각·플롯 정리
export function quality(s) {
  const W = s.webnovel, st = s.st || {};
  let q = 0.5 + (st.write || 0) / 210 + (st.sense || 0) / 650 + (W.plot || 0);
  if (W.tired >= 70) q *= 0.86;
  if (SYN.on(s, "wn_club")) q += 0.04;
  return clamp(q, 0.5, 1.5);
}
// 한 번 쓸 때 화수
export function writeEps(s, boost = 1) {
  const W = s.webnovel, st = s.st || {};
  return Math.max(1, Math.round((2.6 + (st.write || 0) / 45) * boost * (W.ai ? 1.25 : 1) * (s.fullJob === K ? 1.35 : 1)));
}
export function capOf(s, w) {
  const W = s.webnovel, G = GENRES[w.g] || GENRES.hyun, q = quality(s);
  return 520 * Math.pow(q, 1.6) * G.cap * comboM(s, w) * (1 + 0.2 * Math.min(3, W.done)) * mod(s, "wnCap", 1) * clamp(w.retain, 0.5, 1) * (W.redeem && !w.mgmt ? 1.1 : 1) * (w.deal === "wait" ? WN_F30.deal.waitCap : 1);
}
// 새 작품. 예전 호출 newWork(s, r, g) 도 그대로 된다(세부 장르·주인공·독자층은 무작위). 기획 → 완성도 → 바로 연재 시작
export function newWork(s, r, g, opt) {
  makePlan(s, r, fillCombo(s, r, g, opt || {}));
  return startPlan(s).work;
}
function finish(s, r, notes, scenes) {
  const W = s.webnovel, w = W.work;
  const avg = w.rev3.length ? w.rev3.reduce((a, b) => a + b, 0) / w.rev3.length : 0;
  let tail = Math.round(avg * 0.22 * (hasTr(s, "author") ? 1.3 : 1) * (W.lv >= 4 ? 1.2 : 1));
  if (revCheck(s, r, w, scenes, true)) tail = Math.round(Math.max(tail * w.rev * 0.5, w.peak * 0.012 * w.rev)); // 완결 때 역주행: 인세가 붙는다
  W.works.push(shelfRow(s, w, true, tail));
  W.done++; if (w.paid) W.paidDone++;
  W.bestPeak = Math.max(W.bestPeak, w.peak);
  W.pen = Math.max(W.pen, Math.round(w.peak * 0.4));
  if (hasTr(s, "author")) W.pen = Math.round(W.pen * 1.15);
  W.work = null; W.sched = 12;
  log(s, `웹소설 '${w.n}' ${w.ep}화 완결`, "work");
  scenes.push({ kind: "event", tag: "웹소설", title: "100화 완결", onChoose: "wn_fin", text: `새벽 1시, '완결' 버튼을 눌렀다. '${w.n}' ${w.ep}화. ${Math.max(1, Math.round((s.t - w.t0) / 12 * 10) / 10)}년이 걸렸다. 마지막 화 댓글이 ${Math.round(w.fans * 0.3 + 20)}개다. 처음으로 회사에서 졸지 않았다.`,
    choices: [{ t: "외전 5화로 팬 서비스", eff: { hp: -4 }, text: "외전 공지에 \"작가님 사랑해요\"가 쏟아졌다. 필명 팬이 늘었다." }, { t: "바로 차기작 기획", eff: {}, text: "메모장에 새 제목을 적었다. 이번 독자들이 다음 작품으로 따라온다." }] });
  if (w.retain < 0.8 || W.tired >= 75) W.burnAsk = s.t + 1; // 용두사미·번아웃 → 필명 고민
}

// ───────── 11-22 특이 요소 장면 ─────────
function dealScene(s) {
  const w = s.webnovel.work, D3 = WN_F30.deal, pi = SYN.pi(s);
  const adv = Math.round(clamp(w.fans * D3.adv[0], D3.adv[1], D3.adv[2]) * pi / 10) * 10, advW = Math.round(adv * D3.waitAdv / 10) * 10;
  s._wnDeal = { adv, advW };
  return { kind: "event", tag: "웹소설", title: "독점이냐, 여러 곳이냐", onChoose: "wn_deal",
    text: `매니지먼트 담당자가 두 안을 내밀었다. 큰 플랫폼 한 곳에 독점이면 메인 배너와 선인세 ${won(adv)}. 대신 다른 곳엔 못 올리고, 선인세는 내 몫에서 먼저 깎인다. 비독점이면 여러 곳에 동시에 올린다.`,
    choices: [
      { t: `독점 · 선인세 ${won(adv)} + 메인 배너`, eff: {}, text: "메인 배너에 표지가 걸렸다. 이제 선인세만큼 팔려야 내 몫이 생긴다." },
      { t: `독점 + '기다리면 무료' · 선인세 ${won(advW)}`, eff: {}, text: "하루 한 편 무료. 독자가 몰려온다. 한 명이 내는 돈은 줄었다." },
      { t: "비독점 · 여러 플랫폼에 동시 연재", eff: {}, text: "업로드 창 세 개에 같은 화를 올린다. 정산서도 세 장이다." },
    ] };
}
// 표절 시비: 내 작품이 의심받는다. ev=true 면 pickEvent 형식으로
function plagScene(s, ev) {
  const sc = { title: "표절 시비", onChoose: "wn_plag", ...(s.webnovel?.seen?.p1 === undefined ? { cine: "wn_plag" } : {}), // 화보는 처음 한 번만
    text: "\"이거 그 작품이랑 설정 똑같은데?\" 댓글 하나가 커뮤니티로 퍼졌다. 회귀, 계약, 복수. 이 장르에서 안 겹치는 설정이 있나 싶지만 캡처가 돌기 시작했다.",
    choices: [
      { t: "작업 노트·날짜를 공개하고 차분히 해명", check: { stat: "write", dc: 48 }, ok: { text: "몇 년 전 날짜가 찍힌 설정 노트가 오히려 화제가 됐다.", eff: { wn_fans: 4, mental: -1 } }, ng: { text: "해명글이 변명처럼 읽혔다. 댓글이 더 붙었다.", eff: { wn_fans: -6, mental: -5 } } },
      { t: "무시하고 연재를 이어 간다", eff: {}, text: "대꾸하지 않았다." },
      { t: "겹친다는 장면을 고쳐 다시 올린다", eff: { wn_bank: -3, wn_hit: -5, mental: -1 }, text: "주말 내내 세 화를 고쳐 썼다. 시비는 조용히 가라앉았다." },
    ] };
  return ev ? { t: sc.title, x: sc.text, onChoose: sc.onChoose, c: sc.choices, cine: sc.cine } : { kind: "event", tag: "웹소설", ...sc };
}
// 편집자 피드백: 매니지먼트 수수료 30%의 값어치
function editScene(s, ev) {
  const w = s.webnovel.work, E3 = WN_F30.edit, pen = Math.round((w.adv || 0) + E3.pen * SYN.pi(s));
  s._wnEd = { pen };
  const c = [
    { t: "피드백대로 고친다", eff: { wn_bank: -2, hp: -3, wn_ret: E3.ret, wn_hit: E3.hit }, text: "사이다를 두 화 앞당겼다. 편집자가 '좋아요' 한마디를 남겼다." },
    { t: "내 고집대로 빌드업을 간다", check: { stat: "sense", dc: 45 }, ok: { text: "참은 만큼 터졌다. 반전 화 댓글창이 난리가 났다.", eff: { wn_hit: 15, mental: 3 } }, ng: { text: "고구마가 세 화째. 하차 댓글이 늘었다.", eff: { wn_ret: -6, wn_fans: -5, mental: -3 } } },
  ];
  if (w.paid) c.push({ t: `매니지먼트를 나와 혼자 간다 (위약금 ${won(pen)})`, eff: {}, text: "표지도, 홍보도, 정산도 이제 내 몫이다." });
  const sc = { title: "편집자의 빨간 줄", onChoose: "wn_edit", text: "담당 편집자 메일. \"이번 화 고구마예요. 주인공이 너무 오래 당해요. 사이다를 앞당겨 주세요.\" 수익의 30%를 가져가는 사람의 의견이다.", choices: c };
  return ev ? { t: sc.title, x: sc.text, onChoose: sc.onChoose, c: sc.choices } : { kind: "event", tag: "웹소설", ...sc };
}
// 시험용: #auto…-webnovel-f30deal|f30plag|f30edit 에서 장면을 강제로 띄운다
export function f30Scene(s, r, what) {
  const W = s.webnovel; if (!W.work) newWork(s, r, "hyun");
  const w = W.work; w.ep = Math.max(w.ep, 42); w.fans = Math.max(w.fans, 400); w.mgmt = true; W.lv = Math.max(W.lv, 3);
  if (what === "deal") { w.deal = null; return dealScene(s); }
  if (what === "edit") { w.paid = true; W.paidEver = true; return editScene(s); }
  return plagScene(s);
}

// ───────── 이벤트(16개 + 웹소설 고유 골치 3개) ─────────
function pickEvent(s, r) {
  const W = s.webnovel, w = W.work, seen = W.seen, once = (id) => seen[id] === undefined;
  const L = [];
  const add = (id, cond, f) => { if (cond) L.push([id, f]); };
  if (w) {
    // 초반(early)
    add("e02", once("e02") && working(s) && w.ep >= 3 && W.lv <= 2, () => ({ t: "회사가 소재다", x: "오늘도 팀장이 보고서를 세 번 반려했다. 문득 떠올랐다. 팀장이 회귀해서 신입이 된다면? 메모장이 바빠졌다.",
      c: [{ t: "직장 현대판타지 에피소드로 쓴다", eff: { stat: { write: 0.6 }, wn_hit: w.g === "hyun" ? 18 : 10 }, text: "\"이거 우리 회사 얘기 아님?\" 댓글이 달리기 시작했다." },
        { t: "유행하는 무협 감성을 섞는다", eff: { wn_bank: -3, mental: -2, wn_hit: 8 }, text: "고증 자료를 찾느라 비축분을 까먹었다. 그래도 반응은 나쁘지 않다." }] }));
    add("e03", once("e03") && w.ep >= 5 && w.fans >= 8, () => ({ t: "첫 댓글", x: "5화 아래에 첫 댓글이 달렸다. \"작가님 이거 대박 날 듯. 다음 화 언제요?\" 화면을 캡처해 바탕화면에 깔았다.",
      c: [{ t: "정성 답글과 설정 비하인드 공개", eff: { mental: 5, wn_fans: 10 }, text: "그 독자가 친구 둘을 데려왔다." }, { t: "답글 대신 다음 화로 보답", eff: { wn_bank: 1, wn_ret: 2 }, text: "말 대신 원고. 연재 리듬이 단단해졌다." }] }));
    add("e04", once("e04") && w.ep >= 6 && !w.title2, () => ({ t: "서술형 제목의 유혹", x: `노블리 랭킹 상위 제목이 전부 한 문장이다. "퇴근만 하면 돈이 쌓임" 같은 식이다. 내 제목은 '${w.n}'이다.`, onChoose: "wn_title",
      c: [{ t: "유행 서술형 제목으로 바꾼다", eff: { mental: -2 }, text: "조회수가 바로 뛰었다. 조금 부끄럽다." }, { t: "내 제목을 지킨다", eff: { mental: 3 }, text: "제목은 작가의 얼굴이다. 조회수는 그대로." }] }));
    // 중반(mid)
    add("e06", W.lv >= 2 && CONTEST_M.includes(s.cal) && W.contestSeason !== seasonId(s) && w.ep >= 10, () => ({ t: "공모전 시즌", x: "노블리 공모전이 열렸다. 공모전 전용 순위판에 오르면 돈 한 푼 안 들이고 노출된다. 마감까지 25화가 필요하다.", onChoose: "wn_contest_ev",
      c: [{ t: "주말을 갈아 넣어 참가", eff: { hp: -12, wn_bank: 3, wn_tired: 10 }, text: "토요일과 일요일이 원고로 사라졌다. 공모전 순위판에 이름이 올라갔다." }, { t: "평소 페이스 유지", eff: {}, text: "공모전은 다음에. 몸이 먼저다." }] }));
    add("e09", once("e09") && W.lv >= 2 && w.fans >= 60, () => ({ t: "베낀 작품", x: "내 설정을 거의 그대로 가져온 작품이 랭킹 3위에 올랐다. 하루 두 화씩 올린다. AI로 쓰는 것 같다는 소문이 돈다.",
      c: [{ t: "신경 끄고 내 플롯대로 간다", eff: { mental: -3 }, text: "그 작품은 석 달 뒤 조용히 연재 중단됐다." }, { t: "속도전으로 맞불", eff: { hp: -12, wn_bank: 4, wn_ret: -5, wn_tired: 12 }, text: "하루 두 화. 손목이 시큰거리고 문장이 거칠어졌다." },
        { t: "날짜 찍힌 원고를 모아 플랫폼에 신고한다", check: { stat: "num", dc: 50 }, ok: { text: "플랫폼이 그 작품을 내렸다. 독자들이 '원조'를 찾아왔다.", eff: { wn_fans: 8, mental: 2, hp: -4 } }, ng: { text: "\"유사성을 판단하기 어렵습니다.\" 답장 한 줄에 석 달이 갔다.", eff: { mental: -6, hp: -4 } } }] }));
    // 11-22 표절 시비(내가 의심받는 쪽) · 편집자 피드백
    add("p1", W.lv >= 2 && w.fans >= WN_F30.plag.fans && (s.t - (seen.p1 ?? -99)) >= WN_F30.plag.gap, () => plagScene(s, true));
    add("ed", w.mgmt && !w.indie && w.ep >= 10 && (s.t - (seen.ed ?? -99)) >= WN_F30.edit.gap, () => editScene(s, true));
    // 위기(crisis)
    add("e13", !w.ev.e13 && w.ep >= 55 && w.ep <= 85 && w.retain < 0.88, () => ({ t: "중반의 늪", x: `첫 번째 큰 악당을 쓰러뜨렸다. 그런데 다음에 뭘 써야 할지 모르겠다. ${w.ep + 1}화를 세 번 지웠다. 연독률이 매화 2%씩 떨어진다.`,
      c: [{ t: "일주일 휴재하고 2부 플롯을 다시 짠다", eff: { wn_fans: -4, wn_ret: 8, wn_tired: -15 }, text: "2부 첫 화 댓글: \"작가님 각성하셨네.\"" }, { t: "비슷한 사건을 한 번 더 반복", eff: { wn_fans: -8, wn_ret: -4, wn_hit: -10 }, text: "\"이거 30화랑 똑같은데?\" 하차 댓글이 늘었다." }] }));
    add("e14", w.fans >= 150 && (s.t - (seen.e14 ?? -99)) >= 10, () => ({ t: "악플 폭격", x: `주인공이 한 번 진 화에 댓글 200개가 달렸다. "하차합니다." "작가 고구마 장인." 별점이 4.8에서 3.9가 됐다.`,
      c: [{ t: "댓글을 닫고 원래 플롯대로", eff: { mental: 3, wn_fans: -4 }, text: "사흘 뒤 반전 화가 올라가자 별점이 돌아왔다." },
        { t: "다음 화에서 급히 반전", check: { stat: "write", dc: 52 }, ok: { text: "급하게 쓴 반전이 오히려 명장면이 됐다.", eff: { wn_fans: 6 } }, ng: { text: "복선 없이 뒤집었다. \"개연성 어디 감?\"", eff: { wn_ret: -8, wn_fans: -3, mental: -4 } } }] }));
    add("e15", once("e15") && W.lv >= 3 && w.fans >= 300 && r.chance(0.25), () => ({ t: "플랫폼 정책 변경", x: `주력 플랫폼이 공지를 냈다. 특정 장르 연재를 더 이상 받지 않는다고. 내 장르다. 독자 ${Math.round(w.fans).toLocaleString()}명이 하루아침에 길을 잃었다.`,
      c: [{ t: "다른 플랫폼으로 이사", eff: { wn_fans: -35, hp: -8 }, text: "이사 공지를 따라온 독자는 셋 중 둘." }, { t: "장르를 비틀어 남는다", eff: { stat: { write: 1 }, wn_fans: -20, wn_ret: -3 }, text: "검열을 피해 설정을 바꿨다. 일부 독자가 떠났다." }] }));
    // x1 '회사 단톡방의 링크'(회사에 들킴)는 뺐다 → 들키는 장면은 engine/caught.js 가 투잡별로 맡는다
    // 11-23 웹소설 고유 골치 3개: 프로모션 심사 탈락 · 담당 편집자 교체 · 불법 공유(텍본)
    add("n1", w.paid && w.fans >= 150 && (s.t - (seen.n1 ?? -99)) >= 16, () => ({ t: "프로모션 심사 탈락", x: "매니지먼트 메일이 왔다. \"이번 달 플랫폼 프로모션 심사, 아쉽게 탈락입니다.\" 프로모션에 걸린 작품은 1화 조회수가 열 배다. 같은 날 연재를 시작한 옆 작품은 붙었다.",
      c: [{ t: "초반 5화를 고쳐 다음 심사에 다시 낸다", check: { stat: "write", dc: 50 }, ok: { text: "1화 첫 문단을 사건으로 바꿨다. 다음 달, 배너 구석에 내 표지가 걸렸다.", eff: { wn_hit: 10, wn_bank: -2, hp: -4 } }, ng: { text: "\"이번에도 아쉽게…\" 지난번과 같은 문장의 메일이 왔다.", eff: { wn_bank: -2, hp: -4, mental: -3 } } },
        { t: "프로모션 없이 연참으로 밀어 올린다", eff: { wn_bank: -3, wn_fans: 4, wn_tired: 8 }, text: "사흘 동안 하루 두 화. 실시간 순위에 잠깐 제목이 떴다." },
        { t: "다음 작품 때 노리기로 한다", eff: { mental: -2 }, text: "'알겠습니다'라고 답장했다. 옆 작품 조회수는 안 보기로 했다." }] }));
    add("n2", w.mgmt && !w.indie && w.ep >= 20 && !w.ev.n2, () => ({ t: "담당 편집자가 바뀌었다", x: `담당 편집자가 퇴사했다. 새 담당은 ${w.g === "rofan" ? "무협" : "로맨스판타지"}만 맡아 온 사람이다. 인수인계 메모는 두 줄. 피드백 메일이 2주째 없다. 회사 몫은 이번 달에도 그대로 나간다.`,
      c: [{ t: "먼저 전화해 설정과 완결 계획을 설명한다", check: { stat: "talk", dc: 45 }, ok: { text: "한 시간 통화 끝에 새 담당이 말했다. \"다음 프로모션 후보로 올려 볼게요.\"", eff: { wn_hit: 6, wn_ret: 2 } }, ng: { text: "\"네, 네. 참고할게요.\" 수화기 너머로 타자 소리만 들렸다.", eff: { mental: -3 } } },
        { t: "피드백 없이 내 판단으로 쓴다", eff: { wn_ret: -2, mental: 2 }, text: "빨간 줄 없는 원고는 편했다. 오타 지적 댓글이 조금 늘었다." },
        { t: "회사에 담당을 바꿔 달라고 요청한다", eff: { wn_ret: 3, wn_tired: 5, mental: -2 }, text: "한 달을 기다려 장르 담당이 붙었다. 그동안 메일을 여섯 통 썼다." }] }));
    add("n3", w.paid && w.fans >= 200 && (s.t - (seen.n3 ?? -99)) >= 20, () => ({ t: "40분 만에 텍본", x: `최신 화를 올린 지 40분. 불법 공유방에 텍스트 파일이 돌았다. 독자 ${Math.round(w.fans).toLocaleString()}명이 100원씩 내고 보는 화다. 공유방 조회수가 내 결제 수보다 많다.`,
      c: [{ t: "매니지먼트에 넘기고 원고에 집중한다", eff: { mental: -2 }, text: "\"법무팀에 전달했습니다.\" 답은 그게 끝이었다. 다음 화를 썼다." },
        { t: "밤새 링크를 찾아 하나하나 신고한다", eff: { hp: -6, wn_tired: 6, wn_fans: 3 }, text: "링크 서른 개를 내렸다. 아침에 서른한 번째가 올라왔다. 그래도 몇 명은 결제로 돌아왔다." },
        { t: "작가의 말에 솔직하게 적는다", check: { stat: "write", dc: 48 }, ok: { text: "\"100원이 모여 다음 화가 됩니다.\" '정주행 결제하고 옴' 댓글이 줄줄이 달렸다.", eff: { wn_fans: 4, mental: 2 } }, ng: { text: "\"독자를 도둑 취급하네.\" 엉뚱한 사람들이 화를 냈다.", eff: { wn_fans: -3, mental: -3 } } }] }));
  }
  // 완결 뒤(late)
  add("e11", !W.ipOffer && W.lv >= 4 && W.ip < 2 && W.bestPeak >= WN_BAL.ipPeak && r.chance(clamp(W.bestPeak / WN_BAL.ipDiv, 0.02, 0.15)), () => {
    const lump = Math.round(clamp(W.bestPeak * 0.7, 400, 3000) * SYN.pi(s) / 10) * 10; s._wnIp = { lump, mon: Math.round(clamp(W.bestPeak / 25, 30, 150) * SYN.pi(s)) };
    return { t: "웹툰화 제안", x: `웹툰 제작사에서 메일이 왔다. 원작 사용료 ${won(lump)}에 연재 수익 배분. 계약서가 40쪽이다. 등장인물 수를 줄여 달라는 요청도 있다.`, onChoose: "wn_ip",
      c: [{ t: "변호사 검토 후 계약 (검토비 50만)", eff: {}, text: "독소 조항 두 개를 고쳤다. 도장을 찍었다." }, { t: "조건 협상을 길게 끈다", eff: {}, text: "" }] };
  });
  add("e12", W.paidDone >= 1 && !W.audio && W.works.some((x) => x.paid && x.tail > 0) && r.chance(0.35), () => {
    const best = W.works.filter((x) => x.paid).sort((a, b) => b.peak - a.peak)[0]; s._wnAu = { n: best.n, lump: Math.round(clamp(best.peak * 0.25, 60, 600) * SYN.pi(s)) };
    return { t: "오디오북과 해외 번역", x: `완결작 '${best.n}'에 오디오북 제안과 해외 번역 연재 제안이 동시에 왔다. AI 번역 덕에 비용이 많이 줄었다고 한다.`, onChoose: "wn_audio",
      c: [{ t: "둘 다 진행", eff: { hp: -4 }, text: "녹음 대본 검수에 주말이 갔다. 대신 통장이 두 번 울렸다." }, { t: "해외만 진행", eff: {}, text: "번역본 첫 화에 외국어 댓글이 달렸다. \"Next chapter please!\"" }] };
  });
  if (!L.length) return null;
  const [id, f] = r.pick(L), e = f();
  seen[id] = s.t; if (w && id === "e13") w.ev.e13 = 1; if (w && id === "n2") w.ev.n2 = 1; if (id === "e11") W.ipOffer = s.t; if (id === "e12") W.audio = s.t;
  return { kind: "event", tag: "웹소설", title: e.t, text: e.x, onChoose: e.onChoose, choices: e.c, ...(e.cine ? { cine: e.cine } : {}) };
}
export const seasonId = (s) => `${s.year}-${s.cal <= 6 ? 1 : 2}`;

function contestEnter(s) { const W = s.webnovel; W.contestSeason = seasonId(s); W.contestT = s.t; W.expo = { x: 1.5, left: 2 }; }

// ───────── 11-26 개편: 글 모음(댓글·편집자·소문·한 줄 평) ─────────
// 자리 표시: {T} 제목 · {G} 큰 장르 · {S} 세부 장르 · {P} 주인공 유형 · {W} 소재의 말 · {N} 사람 이름
const fill = (t, w, N) => String(t).replace(/\{T\}/g, w?.n || "").replace(/\{G\}/g, GENRES[w?.g]?.n || "웹소설").replace(/\{S\}/g, SUBS[w?.sub]?.n || "그 소재").replace(/\{P\}/g, PROS[w?.pro]?.n || "주인공").replace(/\{W\}/g, SUBS[w?.sub]?.w || "주인공").replace(/\{N\}/g, N || "");
const CMT = {
  good: ["1빠. 그리고 선작.", "{G}에 {S}? 이게 왜 재밌지", "작가님 연참 안 하시면 신고합니다", "{W} 나오는 장면에서 지하철 내릴 역 지나침", "제목 보고 걸렀다가 추천 글 보고 옴. 죄송합니다", "{P} 주인공 오랜만에 제대로 보네", "묵혀 두려고 했는데 5화까지 다 읽어 버림", "이 조합을 왜 아무도 안 썼지", "다음 화. 다음 화 주세요.", "작가님 회사 다니시죠. 디테일이 너무 생생함", "선작 알림 켜고 갑니다. 건필하세요", "5화 만에 이 정도면 유료 가도 따라감"],
  mid: ["일단 선작은 해 둠", "무난무난. 20화까지 보고 판단함", "{S} 좋아해서 왔는데 아직은 잘 모르겠음", "소재는 괜찮은데 1화가 좀 느려요", "오타 3화에 두 개 있어요", "{G} 치고는 평범한데 문장은 잘 읽힘", "작가님 건필", "주인공 이름이 기억이 안 남", "나쁘지 않음. 근데 좋지도 않음", "퇴근길에 보기 딱 좋은 정도", "설정 설명이 좀 길어요. 사건 주세요"],
  bad: ["{G}에 {S} 조합은 좀… 물에 기름 탄 느낌", "태그 보고 왔는데 제가 아는 {S} 아니네요", "하차합니다. 건필하세요", "{P} 주인공이 이 소재랑 따로 놂", "3화에서 접음. 고구마도 아니고 그냥 감자", "작가님 이거 장르가 뭐예요", "제목이랑 내용이 다른 소설 같음", "조회수 보니까 저만 그런 게 아니네요", "첫 댓글인데 죄송합니다. 안 읽혀요", "여기서 {W}? 왜?", "취향 타는 정도가 아니라 취향이 없음"],
};
const ED_SAY = {
  god: ["…이거 제가 먼저 계약서 쓸게요. 다른 데 보여 주지 마세요.", "20년 일하면서 기획서 보고 소름 돋은 건 세 번째입니다.", "작가님, 오늘 뭐 드셨어요? 그거 매일 드세요."],
  hi: ["이건 됩니다. 1화만 빨리 주세요.", "제목에서 이미 누르고 싶네요. 갑시다.", "이 조합이면 20화 안에 반응 옵니다. 제 감이에요."],
  mid: ["무난합니다. 무난한 게 제일 어려운 거 아시죠.", "나쁘지 않아요. 결국 5화 안에 뭘 보여 주느냐죠.", "써 봐야 압니다. 늘 그랬어요."],
  low: ["음… 어디가 어긋났는지는 저도 모르겠는데, 어긋났어요.", "솔직히 말씀드리면 제목만 살리고 싶네요.", "쓰다 보면 풀릴 수도 있어요. 풀릴 수도요."],
  bad: ["작가님, 주무시고 내일 다시 볼까요.", "이 조합은 저도 처음 봅니다. 좋은 뜻은 아니에요.", "기획서가 아니라 낙서를 주신 것 같은데요."],
};
const ED_HINT = ["이 조합은 저도 처음 봅니다.", "요즘 독자는 3화 안에 판단해요. 조합이 반이에요.", "소재 카드가 마음에 안 들면 취재를 다녀오시죠.", "같은 소재라도 주인공을 바꾸면 딴 소설이 됩니다.", "랭킹은 저도 못 맞혀요. 그래서 재밌죠.", "제목은 고쳐도 됩니다. 조합은 못 고쳐요.", "유행 따라가다 늦는 작가를 많이 봤어요. 소문은 소문이에요.", "둘 다 노린다는 기획은 열에 다섯은 아무도 못 잡습니다.", "겪어 본 걸 쓰세요. 독자는 귀신같이 압니다."];
const RUM = {
  hot: ["요즘 #{S} 태그만 달면 일단 눌러 본다더라", "랭킹 20위 안에 {S} 신작이 셋이라던데", "'{S}' 추천 좀요, 글이 하루에 열 개씩 올라옴", "편집자들이 {S} 원고만 찾는다는 소문"],
  cold: ["{G} 이제 물린다는 글이 베스트에 갔음", "{G} 신작은 1화 조회수가 반 토막이래", "\"{G} 그만 좀\" 댓글에 추천이 300개", "{G} 쓰던 작가들이 줄줄이 장르 갈아탄다더라"],
};
const REVIEW = {
  top: ["완결까지 한 번도 쉬어 갈 틈이 없었다. 재주행 간다.", "이 작가 신작이면 일단 본다.", "마지막 화 보고 1화로 돌아갔다. 복선이 다 거기 있었다.", "{G}의 교과서. 다만 교과서보다 훨씬 재밌다."],
  good: ["중반이 살짝 늘어지지만 결말이 다 갚는다.", "{S} 좋아하면 무조건. 아니어도 한번쯤.", "퇴근길 100화, 덕분에 버텼습니다.", "{W} 하나 보고 끝까지 왔다. 후회 없음."],
  mid: ["무난하게 읽힌다. 기억에는 덜 남는다.", "초반 30화는 좋았다.", "킬링타임용으로 추천.", "{P} 주인공이 끝까지 {P}였다. 좋은 뜻인지는 모르겠다."],
  low: ["용두사미. 그래도 완결은 냈다.", "완결이 난 게 제일 큰 반전.", "작가도 중간에 길을 잃은 듯.", "{G}인 줄 알았는데 끝까지 뭔지 모르겠다."],
  drop: ["여기서 끝? 작가님 어디 가셨어요", "연중 딱지 붙은 지 오래. 가끔 생각난다.", "선작 목록 정리하다 발견. 여전히 {ep}화.", "돌아오세요. 기다리는 사람 셋은 있음."],
};
const pickH = (L, key) => L[Math.floor(u01(key) * L.length)];
const R1 = (x) => Math.round(x * 10) / 10;
function ens(W) { W.note = W.note || []; W.awards = W.awards || []; W.drawN = W.drawN || 0; W.drops = W.drops || 0; W.stat = W.stat || { plans: 0, scrap: 0, revTry: 0, revHit: 0, out: 0 }; return W; }
export function editorSay(plan) { const k = plan.score > 100 ? "god" : plan.score >= 80 ? "hi" : plan.score >= 55 ? "mid" : plan.score > 35 ? "low" : "bad"; return pickH(ED_SAY[k], `${plan.title}:${plan.score}`); }
// 기획 화면(확정 전) 편집자 한마디: 궁합은 말해 주지 않는다. 눈에 보이는 것만 짚는다
export function editorHint(s, d) {
  const W = s.webnovel;
  if (repN(s, d.g, d.sub)) return "이 조합, 전에도 쓰셨죠. 독자는 기억합니다.";
  if (W.tired >= 70) return "눈 밑이… 좀 쉬고 나서 짜시죠. 피곤한 머리에서 나온 기획은 티가 나요.";
  if (isLife(s, d.sub)) return "겪어 보신 소재네요. 그건 티가 납니다. 좋은 쪽으로요.";
  if (isOpp(d)) return `${GENRES[d.g].n} 장르를 ${AUDS[d.aud].n} 쪽으로요? 역발상은 대부분 망하고, 가끔 판을 엎습니다.`;
  return pickH(ED_HINT, `${lifeKey(s)}:${d.g}:${d.sub}:${d.pro}:${d.aud}`);
}
export function rumors(s) { const T = s.webnovel?.tr; if (!T?.rum) return []; return T.rum.map((x) => RUM[x.kind][x.i % RUM[x.kind].length].replace(/\{S\}/g, SUBS[x.k]?.n || "").replace(/\{G\}/g, GENRES[x.k]?.n || "")); }
export const comboTag = (w) => (w?.sub ? `${GENRES[w.g]?.n || ""} × ${SUBS[w.sub]?.n || ""} × ${PROS[w.pro]?.n || ""} · ${AUDS[w.aud]?.n || ""}` : GENRES[w?.g]?.n || "");

// ───────── 기획 확정 → 완성도 → 연재 시작 / 엎기 ─────────
function uniqTitle(W, t, o) { const used = new Set(W.works.map((x) => x.n)); if (!used.has(t)) return t; for (let i = 1; i < 12; i++) { const n = autoTitle(o.g, o.sub, o.pro, (o.ti || 0) + i); if (!used.has(n)) return n; } return `${t} ${W.works.length + 1}`; }
export function makePlan(s, r, o, eps = 0) {
  const W = ens(s.webnovel), p = planScore(s, r, o);
  p.title = uniqTitle(W, String(o.title || "").trim().slice(0, 40) || autoTitle(o.g, o.sub, o.pro, o.ti || 0), o); p.t = s.t; p.eps = eps;
  W.plan = p; W.stat.plans++;
  return p;
}
export function startPlan(s) {
  const W = ens(s.webnovel), p = W.plan, D2 = WN_CH.drop; if (!p || W.work) return { ok: false, msg: "확정한 기획이 없어요" };
  const lazy = W.drops >= D2.lazyFrom ? Math.max(D2.lazyMin, 1 - D2.lazyCut * (W.drops - D2.lazyFrom + 1)) : 1;
  const start = Math.round((Math.max(W.pen * 0.5, W.carry || 0) * (W.nextBoost || 1) + (W.nextFlat || 0)) * lazy);
  const hit = R2(clamp(p.mult * (W.redeem ? 1.2 : 1), 0.2, 9));
  W.work = { n: p.title, g: p.g, ep: 0, goal: 100, fans: start, peak: start, retain: 0.92 + (p.life ? WN_CH.life.ret : 0), hit, hit0: hit, paid: false, mgmt: false, share: 0.42, t0: s.t, slump: 0, title2: false, cover: false, rev3: [], mgmtNo: 0, ev: {},
    sub: p.sub, pro: p.pro, aud: p.aud, fx: p.fx, sc: p.score, luck: p.luck, god: p.god, audV: p.audV, life: p.life, parts: p.parts, grow: 0, pk: 0, earn: 0, outN: 0, lazy: lazy < 1 };
  W.note.push({ n: p.title, g: p.g, sub: p.sub, pro: p.pro, aud: p.aud, sc: p.score, gf: p.parts.find((x) => x.id === "gfit")?.v ?? 0, pf: p.parts.find((x) => x.id === "pfit")?.v ?? 0, av: p.audV, t: s.t }); if (W.note.length > 40) W.note.shift();
  W.bank += p.eps || 0; W.plan = null; W.draft = null; W.drawN++; W.scouted = false; W.carry = 0; W.nextBoost = 1; W.nextFlat = 0; W.redeem = false;
  if (W.t0 === null || W.t0 === undefined) W.t0 = s.t;
  log(s, `웹소설 새 작품 '${p.title}' 기획 완성도 ${p.score}`, "work");
  return { ok: true, msg: `'${p.title}' 연재 시작${start ? ` · 첫 독자 ${start}명` : ""}${lazy < 1 ? " · '연중 작가' 딱지로 첫 독자가 줄었다" : ""}`, work: W.work };
}
export function scrapPlan(s) {
  const W = ens(s.webnovel), C = WN_CH.plan.scrap; if (!W.plan) return { ok: false, msg: "엎을 기획이 없어요" };
  const lost = W.bank - Math.floor(W.bank * C.bank); W.bank -= lost; W.tired = clamp(W.tired + C.tired, 0, 100); s.mental = clamp(s.mental + C.mental, 0, 100);
  W.plan = null; W.planLock = s.t; W.stat.scrap++;
  return { ok: true, msg: `기획서를 구겨 버렸다. 다음 달에 다시 짠다${lost ? ` · 비축분 −${lost}화` : ""} · 피로 +${C.tired}` };
}
export function planSeen(s) { const p = s.webnovel?.plan; if (p) p.seen = 1; }
// 조합 고르기: 빈 곳은 무작위(예전 호출 newWork(s, r, g) · 봇)
function fillCombo(s, r, g, opt = {}) {
  const og = openGenres(s), hk = handKeys(s), G0 = GENRES[g] && (genreOpen(s, g) || opt.force) ? g : r.pick(og);
  const sub = hk.includes(opt.sub) || (opt.force && SUBS[opt.sub]) ? opt.sub : r.pick(hk), pro = PROS[opt.pro] ? opt.pro : r.pick(Object.keys(PROS)), ga = GENRES[G0].aud;
  const aud = AUDS[opt.aud] ? opt.aud : r.chance(0.7) ? (ga === "x" ? r.pick(["m", "f"]) : ga) : r.chance(0.6) ? "b" : ga === "m" ? "f" : "m";
  return { g: G0, sub, pro, aud, title: opt.title, ti: opt.ti || 0 };
}

// ───────── 연재 중: 단계별 반응 · 쪽박 뒤 세 갈래 · 역주행 ─────────
function comments5(r, w) {
  let k = w.sc >= 62 ? 2 : w.sc <= 40 ? 0 : 1; if (r.chance(0.25)) k = clamp(k + (r.chance(0.5) ? 1 : -1), 0, 2); // 넷에 하나는 엉뚱한 반응
  return r.shuffle(CMT[["bad", "mid", "good"][k]]).slice(0, 3).map((t) => fill(t, w));
}
function revCheck(s, r, w, scenes, fin) {
  const W = s.webnovel, C = WN_CH.rev; if (w.rev || w.sc === undefined || baseM(w) > C.under) return false;
  W.stat.revTry++;
  const p = Math.min(C.max, C.base + C.ep * Math.min(1, w.ep / 100) + (w.pk ? 0 : C.noPunk) + (trendOf(s, w).hot ? C.trend : 0));
  if (!r.chance(p)) return false;
  w.rev = R2(r.range(C.x[0], C.x[1])); W.revY = s.year; W.stat.revHit++;
  if (!fin) { w.fans *= C.jump; W.expo = { x: C.expo[0], left: C.expo[1] }; }
  log(s, `웹소설 '${w.n}' 역주행`, "work");
  scenes.push({ kind: "story", tag: "웹소설", title: "역주행", text: fin
    ? `완결 공지를 올린 다음 날, 알림이 멈추지 않았다. 누가 커뮤니티에 올린 "완결 난 숨은 명작" 글 하나. '${w.n}' 1화 조회수가 하루 만에 지난 1년 치를 넘었다. 완결작 인세가 달라진다.`
    : `${w.ep}화째 아침, 알림이 99+였다. 누군가 올린 추천 글 하나. "이걸 왜 아무도 안 봄?" '${w.n}', 실시간 랭킹을 거꾸로 올라가고 있다. 조회수 7을 보던 그 화면이다.`,
    choices: [{ t: "새로고침을 멈출 수가 없다", eff: { mental: 6 }, text: "꾸준히 쓴 화수가 전부 정주행 거리가 됐다." }] });
  return true;
}
function makeTrend(s, w, notes) {
  const W = s.webnovel, T = W.tr, C = WN_CH.trend; if (!T || w.made || w.sc === undefined || w.sc < C.makeSc || w.fans < C.makeFans || T.hot.includes(w.sub)) return;
  w.made = 1; T.hot[0] = w.sub; T.rum = [{ kind: "hot", k: w.sub, i: 1 }, ...(T.rum || []).slice(1)]; T.until = Math.max(T.until, s.t + 8);
  notes.push(`웹소설: '${w.n}' 덕에 #${SUBS[w.sub].n} 신작이 쏟아진다. 내가 유행을 만들었다(독자 유입 ×${C.hot})`);
}
function stageCheck(s, r, w, notes, scenes) {
  const W = s.webnovel; if (w.sc === undefined) return; // 예전 방식 작품은 그대로
  if (!w.s5 && w.ep >= 5) { w.s5 = 1; w.react = comments5(r, w); notes.push(`웹소설 '${w.n}' 5화 첫 반응: "${w.react[0]}"`); }
  if (!w.s20 && w.ep >= 20) {
    w.s20 = 1; const m = baseM(w), flop = m <= WN_CH.flop, big = m >= 1.6, favs = Math.round(w.fans);
    w.shape = flop ? "쪽박" : big ? "대박 조짐" : "중박";
    if (flop) {
      const c = [{ t: "꾸준히 쓴다 (40화·70화·완결 때 역주행을 노린다)", eff: { mental: 2 }, text: "조회수 창을 닫고 원고 창을 열었다. 쌓인 화수는 배신하지 않는다고들 한다." }];
      if (!w.rw) c.push({ t: "고쳐 쓴다 (소재 한 장 교체 · 독자 60% 유지)", eff: {}, text: "작업실에서 바꿀 소재 카드를 고르자. 비축분 절반을 버리고 한 달 쉰다." });
      c.push({ t: "접고 새로 쓴다 (독자 일부만 따라온다)", eff: { mental: -3 }, text: "연재 중단 공지를 올렸다. 댓글 하나. \"다음 작품에서 봬요.\"" });
      scenes.push({ kind: "event", tag: "웹소설", title: "20화의 벽 · 쪽박", onChoose: "wn_flop", text: `'${w.n}' 20화. 선호작 ${favs}. 같은 날 시작한 옆 작품은 네 자리다. ${GENRES[w.g].n}에 ${SUBS[w.sub].n}, 이 조합은 아니었던 걸까. 댓글창 맨 위: "${fill(pickH(CMT.bad, w.n + "20"), w)}"`, choices: c });
    } else scenes.push({ kind: "story", tag: "웹소설", title: big ? "20화의 벽 · 심상치 않다" : "20화의 벽 · 윤곽", text: big
      ? `'${w.n}' 20화. 선호작 ${favs}. 새벽에 올린 화에 아침까지 댓글이 서른 개다. "${fill(pickH(CMT.good, w.n + "20"), w)}" 손이 떨려서 다음 화가 안 써진다.`
      : `'${w.n}' 20화. 선호작 ${favs}. 대박은 아니다. 쪽박도 아니다. "${fill(pickH(CMT.mid, w.n + "20"), w)}" 여기서부터는 버티는 사람이 이긴다.`,
      choices: [{ t: "계속 쓴다", eff: { mental: big ? 4 : 1 }, text: "" }] });
  }
  if (!w.rv40 && w.ep >= 40) { w.rv40 = 1; revCheck(s, r, w, scenes, false); }
  if (!w.rv70 && w.ep >= 70) { w.rv70 = 1; revCheck(s, r, w, scenes, false); }
  if (!w.s50 && (w.ep >= 50 || w.paid)) {
    w.s50 = 1; const m = baseM(w) * (w.rev || 1);
    w.shape = m >= WN_CH.jack ? "대박" : m <= WN_CH.flop ? "쪽박" : m >= 1.3 ? "중박 이상" : "중박";
    notes.push(`웹소설 '${w.n}' 50화 성적 확정: ${w.shape}${w.aud === "b" ? (w.audV > 0 ? " · 둘 다 잡았다" : " · 어중간했다(둘 다 놓침)") : isOpp(w) ? (w.audV > 0 ? " · 역발상이 통했다" : " · 역발상은 안 통했다") : ""}`);
    if (m >= WN_CH.jack) scenes.push({ kind: "story", tag: "웹소설", title: "대박 확정", text: `'${w.n}' 표지가 노블리 메인 랭킹에 걸렸다. 선호작 ${Math.round(w.fans).toLocaleString()}. 회사 화장실 칸에서 순위를 세 번 새로고침했다. 옆자리 동료는 아직 모른다.`, choices: [{ t: "아무렇지 않은 얼굴로 자리에 돌아간다", eff: { mental: 6 }, text: "입꼬리가 말을 안 듣는다." }] });
  }
  if (w.s20) makeTrend(s, w, notes);
}
// 유행: 8~14달마다 바뀐다. 완결작 가운데 그 세부 장르로 쓴 쪽박작은 한 번 더 역주행 판정
function trendTick(s, r, notes, scenes) {
  const W = s.webnovel, C = WN_CH.trend; if (W.tr && s.t < W.tr.until) return;
  const old = W.tr, hot = r.shuffle(SUB_KEYS).slice(0, 2), gk = Object.keys(GENRES), cold = r.pick(gk);
  const rum = [{ kind: "hot", k: r.chance(C.rumor) ? r.pick(hot) : r.pick(SUB_KEYS), i: r.int(0, 3) }, { kind: "cold", k: r.chance(C.rumor) ? cold : r.pick(gk), i: r.int(0, 3) }];
  W.tr = { hot, cold, until: s.t + r.int(C.len[0], C.len[1]), rum, t0: s.t };
  if (old) notes.push("웹소설: 독자 게시판 분위기가 바뀌었다(작업실의 '소문' 줄을 보세요)");
  const RV = WN_CH.rev;
  for (const x of W.works) if (x.done && x.sub && hot.includes(x.sub) && !x.rvT && !x.rev && (x.m ?? 1) <= RV.under) {
    x.rvT = s.t; W.stat.revTry++;
    if (!r.chance(Math.min(RV.max, RV.base + RV.ep + RV.trend + (x.pk ? 0 : RV.noPunk)))) continue;
    const k = R2(r.range(RV.x[0], RV.x[1])); x.rev = 1; x.tail = R1(Math.max((x.tail || 0) * k, x.peak * 0.012 * k)); W.revY = s.year; W.stat.revHit++;
    log(s, `웹소설 완결작 '${x.n}' 역주행`, "work");
    scenes.push({ kind: "story", tag: "웹소설", title: "완결작 역주행", text: `#${SUBS[x.sub].n} 유행이 돌자 누군가 내 완결작을 꺼냈다. "이 소재 원조 격인데 왜 묻혔지?" '${x.n}' 정주행 인증 글이 줄을 잇는다. 잊고 있던 인세 알림이 울렸다.`, choices: [{ t: "서재에서 그 책등을 한 번 쓸어 본다", eff: { mental: 5 }, text: `완결작 인세가 월 ${won(Math.round(x.tail))}으로 뛰었다.` }] });
    break;
  }
}
// 서재 한 줄(완결·중단 공통)
function shelfRow(s, w, done, tail) {
  const m = baseM(w) * (w.rev || 1);
  const star = done ? clamp(R1(3.1 + (w.retain - 0.75) * 5 + clamp(Math.log(Math.max(0.1, m)) * 0.45, -0.6, 0.7) - (w.pk || 0) * 0.06), 2.1, 4.9) : 0;
  const pool = !done ? REVIEW.drop : star >= 4.5 ? REVIEW.top : star >= 4 ? REVIEW.good : star >= 3.4 ? REVIEW.mid : REVIEW.low;
  return { n: w.n, g: w.g, ep: w.ep, peak: Math.round(w.peak), paid: w.paid, tail, t: s.t, done, ret: R2(w.retain), sub: w.sub, pro: w.pro, aud: w.aud, sc: w.sc, m: R2(w.hit0 ?? w.hit), earn: Math.round(w.earn || 0), star, line: fill(pickH(pool, w.n + w.ep), w).replace("{ep}", w.ep), rev: w.rev ? 1 : 0, pk: w.pk || 0 };
}
// 고쳐 쓰기: 소재 한 장을 바꿔 궁합을 다시 본다(운·독자층 결과는 그대로). 작품에 한 번
export function canRework(s) { const w = s.webnovel?.work; return !w ? "연재 중인 작품이 없어요" : w.sc === undefined ? "예전 방식으로 시작한 작품은 고쳐 쓸 수 없어요" : w.rw ? "이 작품은 이미 한 번 고쳐 썼어요" : w.ep < WN_CH.rework.minEp ? `${WN_CH.rework.minEp}화는 올리고 나서` : null; }
export function rework(s, sub) {
  const W = ens(s.webnovel), w = W.work, why = canRework(s); if (why) return { ok: false, msg: why };
  if (!handKeys(s).includes(sub) || sub === w.sub) return { ok: false, msg: "손에 든 다른 소재 카드를 고르세요" };
  const old = { sc: w.sc, n: w.n, sub: w.sub }, p = planScore(s, null, { g: w.g, sub, pro: w.pro, aud: w.aud }, { luck: w.luck, god: w.god, aud: w.audV });
  w.hit = R2(clamp(w.hit * p.mult / Math.max(0.05, scoreMult(w.sc)), 0.2, 9)); w.hit0 = p.mult; w.sc = p.score; w.fx = p.fx; w.sub = sub; w.life = p.life; w.parts = p.parts;
  w.n = uniqTitle(W, autoTitle(w.g, sub, w.pro, W.drawN), { g: w.g, sub, pro: w.pro, ti: W.drawN });
  w.fans *= WN_CH.rework.keep; W.bank = Math.floor(W.bank / 2); W.resume = W.sched || W.resume || 12; W.sched = 0; W.restT = s.t; W.rwBack = 1;
  w.rw = 1; w.s5 = 0; w.s20 = 0; w.shape = ""; W.drawN++; W.scouted = false;
  W.note.push({ n: w.n, g: w.g, sub, pro: w.pro, aud: w.aud, sc: p.score, gf: p.parts.find((x) => x.id === "gfit")?.v ?? 0, pf: p.parts.find((x) => x.id === "pfit")?.v ?? 0, av: p.audV, t: s.t, rw: 1 });
  log(s, `웹소설 '${old.n}' → '${w.n}' 고쳐 쓰기(완성도 ${old.sc} → ${p.score})`, "work");
  return { ok: true, msg: `새 제목 '${w.n}' · 완성도 ${old.sc} → ${p.score} · 한 달 휴재, 비축분 절반`, from: old.sc, to: p.score };
}
// 연말 시상(12월)
function awardCheck(s, scenes) {
  const W = s.webnovel, A = WN_CH.award; if (s.cal !== 12 || W.awardY === s.year) return; W.awardY = s.year;
  const got = [];
  if (!W.awards.some((x) => x.k === "rookie") && W.t0 !== null && W.t0 !== undefined && s.t - W.t0 <= 30 && W.bestFans >= 300) got.push(["rookie", "올해의 신인"]);
  if (W.revY === s.year) got.push(["rev", "역주행 상"]);
  if (W.works.some((x) => x.done && s.t - x.t < 12 && (x.star || 0) >= 4.2 && x.peak >= 500)) got.push(["fin", "독자가 뽑은 완결"]);
  if (!got.length) return;
  for (const [k, n] of got) W.awards.push({ y: s.year, k, n });
  W.nextBoost = (W.nextBoost || 1) * A.boost; W.nextFlat = (W.nextFlat || 0) + A.flat * got.length;
  scenes.push({ kind: "story", tag: "웹소설", title: "노블리 연말 시상", text: `12월, 노블리 연말 결산 페이지에 내 필명이 있다. ${got.map((x) => `'${x[1]}'`).join(", ")}. 트로피는 없고 배지 그림 파일 하나가 메일로 왔다. 바탕화면에 깔았다.`, choices: [{ t: "수상 소감을 작가의 말에 쓴다", eff: { mental: 5 }, text: `다음 작품은 첫 독자가 더 따라온다(×${A.boost}, +${A.flat * got.length}명).` }] });
}

// ───────── 들켰다: 낯 뜨거운 장르를 쓰다 주변에 알려졌을 때 ─────────
// 웃음의 대상은 '들킨 나의 민망함'. grp: work(회사) · fam(가족) · love(연인·배우자) · fr(친구)
function people(s) {
  const rel = s.rel || {}, ids = Object.keys(rel).filter((id) => CHAR[id]), aff = (a, b) => (rel[b].aff || 0) - (rel[a].aff || 0);
  const lover = ids.find((id) => rel[id].lover), sp = s.fam?.spouse && CHAR[s.fam.spouse] ? s.fam.spouse : null;
  const co = working(s) ? ids.filter((id) => CHAR[id].co && id !== lover && id !== sp).sort(aff) : [];
  const boss = co.find((id) => CHAR[id].rank === "boss"), mate = co.find((id) => id !== boss);
  const fr = ids.filter((id) => !CHAR[id].co && id !== lover && id !== sp && (CHAR[id].roles || []).includes("friend")).sort(aff)[0];
  return { lover, sp, boss, mate, fr };
}
const OUT_HEAVY = [
  { id: "boss", grp: "work", who: "boss", ok: (s) => working(s), x: (N) => `회의가 끝나고 다들 나가는데 ${N || "팀장"}이 불러 세웠다. "잠깐만요. …'{T}'. 그거 본인이 쓰는 거 맞아요? 장르가… {G} 맞죠?" 회의록보다 꼼꼼히 읽은 눈치다.` },
  { id: "mate", grp: "work", who: "mate", ok: (s) => working(s), x: (N) => `${N ? jo(N, "이", "가") : "옆자리 대리가"} 모니터를 돌려 보여 줬다. 노블리 랭킹 화면이다. "이 '{T}' 작가, 말투가 딱 너던데? 태그가… #{S}?" 사무실 공기가 멈췄다.` },
  { id: "dinner", grp: "work", ok: (s) => working(s), x: () => `회식 2차. 옆 팀 과장이 잔을 내려놓고 말했다. "우리 층에 웹소설 작가가 있다며? 제목이 '{T}'라던데. 근데 {S}, 그게 뭐야?" 테이블이 조용해졌다. 다들 나를 본다.` },
  { id: "junior", grp: "work", ok: (s) => working(s), x: () => `탕비실에서 후배가 속삭였다. "선배님, 저 '{T}' 선작했어요. 어제 {W} 나오는 장면에서 끊으시면 어떡해요. 잠을 못 잤잖아요." 사내에 독자가 있었다.` },
  { id: "mom", grp: "fam", x: () => `어머니 전화. "얘, 네가 쓴 거라며. 엄마 20화까지 봤다. 근데 그 {W} 말이다. 왜 그러니? 사람이 좀 다정해야지." 어머니가 {G} 소설을 20화까지 읽으셨다.` },
  { id: "dad", grp: "fam", x: () => `아버지가 가족 단톡방에 링크를 올렸다. '{T}'. 한참 뒤에 한 줄. "아빠는 '{S}' 뜻을 검색해 봤다. …건강 챙겨라." 그 뒤로 단톡방이 조용하다.` },
  { id: "kin", grp: "fam", x: () => `명절 밥상. 사촌이 휴대폰을 들었다. "이거 우리 집안사람이 쓴 거래. '{T}'." 큰아버지가 돋보기를 꺼냈다. "{G}? 어디 소리 내서 읽어 봐라."` },
  { id: "lover", grp: "love", who: "lover", ok: (s, P) => !!P.lover, x: (N) => `${jo(N, "이", "가")} 휴대폰을 내밀었다. 내 작품 화면이다. "이 '{W}', 혹시 나야? 말버릇이 똑같은데. 그리고 #{S}는 뭐야?"` },
  { id: "spouse", grp: "love", who: "sp", ok: (s, P) => !!P.sp, x: (N) => `${jo(N, "이", "가")} 빨래를 개다 말고 물었다. "통장에 '노블리 정산'이 찍히던데. 검색해 보니까 '{T}'… 장르가 {G}. 우리 얘기 좀 할까?"` },
  { id: "friend", grp: "fr", who: "fr", x: (N) => `${N ? `${N}에게서` : "친구에게서"} 메시지가 왔다. "야 ㅋㅋㅋ 이거 너지? '{T}'. 필명이 네 게임 아이디잖아. #{S} 태그 뭐냐 ㅋㅋㅋㅋ"` },
  { id: "alumni", grp: "fr", x: () => `동창 단톡방에 캡처가 올라왔다. '{T}' 표지, 그리고 #{G} #{S}. "이거 우리 과 걔 아님?" 안 읽은 사람 숫자가 줄어든다. 스물셋, 스물둘, 스물하나.` },
  { id: "hair", grp: "fr", x: () => `미용실. 원장님이 가위를 멈추고 거울 속 나를 봤다. "손님, 혹시 '{T}' 쓰세요? 지난번에 휴대폰 화면이 보여서요. 저 그거 봐요. {W}, 그래서 어떻게 돼요?" 머리는 아직 반밖에 못 잘랐다.` },
];
const OUT_LITE = [
  { id: "l_mate", grp: "work", who: "mate", ok: (s) => working(s), x: (N) => `${N ? jo(N, "이", "가") : "옆자리 대리가"} 물었다. "'{T}' 쓰는 사람이 너라며? 어, 작가였어? {G}는 나도 가끔 봐."` },
  { id: "l_mom", grp: "fam", x: () => `어머니 전화. "네가 소설을 쓴다며. '{T}'? 엄마 친구들한테 자랑해도 되니?"` },
  { id: "l_fr", grp: "fr", who: "fr", x: (N) => `${N ? jo(N, "이", "가") : "친구가"} 말했다. "야, '{T}' 네가 쓴 거야? 나 그거 출근길에 보는데." 사인을 해 달라고 한다.` },
];
const OUT_RES = {
  work: { yes: "\"네, 제가 씁니다. 퇴근하고요.\" 잠깐 조용하더니 누가 물었다. \"다음 화 언제 올라와요?\"", no: "\"동명이인이겠죠.\" 표정 하나 안 바꾸고 넘겼다.", ng: "\"아닌데요?\" 목소리가 뒤집혔다. 그날 오후 사내 메신저 프로필을 세 명이 눌러 봤다." },
  fam: { yes: "\"응, 내가 써. 돈도 조금 벌어.\" 전화기 너머가 잠깐 조용했다. \"…그래, 밥은 먹고 써라.\"", no: "\"그거 나 아니야. 이름만 비슷한 거야.\" 더는 묻지 않으셨다.", ng: "\"아니라니까!\" 하는 순간 휴대폰에서 연재 알림이 울렸다. 내 작품 제목으로." },
  love: { yes: "\"맞아, 내가 써.\" 한참 웃더니 말했다. \"그럼 나 다음 화 미리 볼 수 있어?\"", no: "\"나 아니야. 그런 걸 내가 어떻게 써.\" 고개를 끄덕여 줬다. 믿는 눈은 아니다.", ng: "\"아니야!\" 하는데 노트북에 원고 창이 떠 있었다. 제목이 크게." },
  fr: { yes: "\"어, 나야. 선작이나 눌러.\" 답장이 왔다. \"이미 눌렀지 ㅋㅋ 다음 화 빨리.\"", no: "\"나 아닌데? 아이디 흔하잖아.\" \"ㅇㅋ\" 한 줄로 끝났다.", ng: "\"아니라고 ㅋㅋ\" 보내자마자 캡처가 하나 더 왔다. 작가의 말에 쓴 내 말버릇." },
  pen: "밤새 필명을 바꾸고 작가 소개를 지웠다. 따라온 독자도 있고, 길을 잃은 독자도 있다.",
};
function outScene(s, r) {
  const W = s.webnovel, w = W.work, C = WN_CH.out; if (!w || !w.sub || w.ep < 5 || (w.outN || 0) >= C.max || s.t - (W.outT ?? -99) < C.gap) return null;
  const shy = shyOf(w), p = C.p[shy] * (1 + Math.min(2, w.fans / C.fansDiv)) * (working(s) ? C.work : 1); if (!r.chance(p)) return null;
  const P = people(s), lite = shy <= 1, L = (lite ? OUT_LITE : OUT_HEAVY).filter((x) => (!x.ok || x.ok(s, P)) && W.outLast !== x.id); if (!L.length) return null;
  const X = r.pick(L), who = X.who ? P[X.who] : null, N = who ? CHAR[who].name + (X.who === "boss" ? " 팀장" : "") : "", RS = OUT_RES[X.grp], wk = X.grp === "work";
  w.outN = (w.outN || 0) + 1; W.outT = s.t; W.outLast = X.id; W.stat.out++; s._wnOut = { grp: X.grp, lite, N };
  const yes = { mental: lite ? 2 : 3, ...(who ? { aff: 2 } : {}), ...(wk && !lite ? { eye: 3 } : {}) };
  const choices = lite
    ? [{ t: "\"응, 내가 써.\"", eff: yes, text: RS.yes }, { t: "쑥스러워서 말을 돌린다", eff: {}, text: "\"아, 그냥 취미로…\" 얼버무렸다. 귀가 뜨겁다." }]
    : [{ t: "당당하게 인정한다", eff: yes, text: RS.yes },
      { t: "끝까지 시치미를 뗀다", check: { stat: "talk", dc: 42 + shy * 4 }, ok: { text: RS.no, eff: { mental: 1 } }, ng: { text: RS.ng, eff: { mental: -4, ...(wk ? { eye: 2 } : {}) } } },
      { t: "필명을 바꾼다", eff: { wn_fans: -5, mental: -1 }, text: OUT_RES.pen }];
  return { kind: "event", tag: "웹소설", title: lite ? "어, 작가였어?" : "들켰다", onChoose: "wn_out", ...(who ? { who } : {}), text: fill(X.x(N), w, N), choices };
}
export const OUT_COUNT = OUT_HEAVY.length + OUT_LITE.length;
// 시험용: 들킴 장면을 강제로 하나 만든다(#auto…-webnovel-f30out)
export function outSceneTest(s, r, shy = 3) { const W = ens(s.webnovel); if (!W.work) newWork(s, r, "bl", { sub: "obsess", force: true }); W.work.ep = Math.max(W.work.ep, 20); W.work.outN = 0; W.outT = -99; const p0 = WN_CH.out.p; WN_CH.out.p = [9, 9, 9, 9]; let sc = null; try { sc = outScene(s, r); } finally { WN_CH.out.p = p0; } return sc; }

export default {
  key: K, prefix: "wn_", hubName: "웹소설",
  init: () => ({ v: 3, note: [], awards: [], drawN: 0, drops: 0, carry: 0, nextFlat: 0, plan: null, draft: null, tr: null, stat: { plans: 0, scrap: 0, revTry: 0, revHit: 0, out: 0 }, lv: 1, work: null, works: [], bank: 0, sched: 12, ai: false, tired: 0, buzz: 0, plot: 0, expo: { x: 1, left: 0 }, done: 0, paidDone: 0, paidEver: false, ip: 0, ipPay: { left: 0, amt: 0 }, ipOffer: 0, audio: 0, pen: 0, bestPeak: 0, bestFans: 0, maxEp: 0, ups: 0, written: 0, seen: {}, hist: [], last: null, t0: null, contestSeason: "", contestT: -99, lunchT: -1, lecT: -1, nextBoost: 1, redeem: false, burnAsk: 0, newPen: 0, punk: 0, wrote: 0 }),
  actions: {
    wn_new: { n: "새 작품 기획", ap: 1, hp: 2, desc: "장르·소재·주인공·독자층을 골라 기획을 확정한다", stat: { sense: 0.3 } },
    wn_scout: { n: "취재", ap: 1, hp: 2, desc: "소재 카드 5장을 새로 뽑는다. 다음 기획 완성도 +", stat: { sense: 0.2 } },
    wn_write: { n: "원고 쓰기", ap: 1, hp: 4, desc: "퇴근 후 책상 앞. 비축분 +3~6화, 글쓰기 +" },
    wn_plot: { n: "플롯 다듬기·자료조사", ap: 1, hp: 2, desc: "연독률 회복, 이번 달 원고 품질 +. 감각 +" },
    wn_reader: { n: "독자 소통·홍보", ap: 1, hp: 2, desc: "댓글 답글·작가 SNS. 이번 달 독자 유입 +, 마케팅 +" },
    wn_contest: { n: "공모전 참가·투고", ap: 1, hp: 3, desc: "공모전 시즌(5·6·10·11월)엔 참가, 그 밖엔 매니지먼트에 투고" },
    wn_lunch: { n: "점심시간 몰래 쓰기", ap: 1, hp: 1, desc: "회사 자리에서 1~2화. 들키면 회사 눈치 +" },
    wn_lecture: { n: "작법 강의", ap: 1, hp: 4, desc: "IP 작가만. 강의료 +, 말빨 +" },
  },
  mg: { wn_write: "write" },
  money: { inc: ["웹소설 연재 수익", "웹소설 완결작 인세", "웹소설 상금·선인세", "웹소설 2차 판권", "웹소설 강의료"], exp: ["웹소설 비용"] },
  can(s, id, arg) {
    const W = s.webnovel, w = W.work;
    if (id === "wn_new") { if (w) return "연재 중인 작품이 있어요(완결하거나 중단해야 새로 써요)"; if (W.plan) return "확정한 기획이 있어요(연재를 시작하거나 엎으세요)"; if (W.planLock === s.t) return "엎은 기획은 다음 달에 다시 짤 수 있어요"; const g0 = String(arg ?? "").split(":")[0]; if (GENRES[g0] && !genreOpen(s, g0)) return `${GENRES[g0].n} 장르는 Lv${GENRES[g0].lv}부터 열려요`; return null; }
    if (id === "wn_scout") return W.scoutT === s.t ? "이번 달 취재는 다녀왔어요" : W.plan ? "기획을 확정한 뒤예요" : null;
    if (!w && ["wn_write", "wn_plot", "wn_reader", "wn_lunch"].includes(id)) return "먼저 새 작품을 기획하세요";
    if (id === "wn_reader" && w.ep < 1 && W.bank < 1) return "1화부터 써야 독자가 생겨요";
    if (id === "wn_contest") {
      if (!w) return "연재 중인 작품이 없어요";
      if (W.lv < 2) return "Lv2(20화 + 독자 50명)부터";
      if (CONTEST_M.includes(s.cal)) { if (W.contestSeason === seasonId(s)) return "이번 공모전은 이미 냈어요"; if (w.ep + W.bank < 25) return "공모전은 25화부터(올린 화 + 비축분)"; return null; }
      if (w.mgmt) return "이미 매니지먼트와 계약했어요(공모전은 5·6·10·11월)";
      if (w.ep < 30) return "투고는 30화부터";
      if (W.pitchT === s.t) return "이번 달 투고는 했어요";
      return null;
    }
    if (id === "wn_lunch") { if (!working(s)) return "회사를 다닐 때만"; if (W.lunchT === s.t) return "점심은 한 달에 한 번만 몰래"; }
    if (id === "wn_lecture") { if (W.lv < 5) return "Lv5 IP 작가부터"; if (W.lecT === s.t) return "이번 달 강의는 했어요"; }
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const W = s.webnovel, w = W.work;
    if (id === "wn_new") {
      const eps = Math.max(1, Math.round(1.5 * boost)), a = String(arg ?? "");
      if (a === "plan") { const d = draftOf(s), p = makePlan(s, r, { g: d.g, sub: d.sub, pro: d.pro, aud: d.aud, title: d.title, ti: d.ti }, eps); return { lines: [`기획 확정: ${comboTag(p)}`, `가제 '${p.title}'`, "완성도는 작업실에서 확인"], msg: "기획서 마지막 줄에 마침표를 찍었다. 이제 이게 되는 기획인지 볼 차례다." }; } // 화면에서 온 기획: 완성도 연출 뒤에 연재 시작·엎기를 고른다
      const [g, sub, pro, aud] = a.split(":"), nw = newWork(s, r, GENRES[g] ? g : undefined, { sub, pro, aud }); W.bank += eps; // 그 밖(장르만 넘기는 예전 호출 · 봇): 바로 연재 시작
      return { lines: [`새 작품 '${nw.n}'`, comboTag(nw), `기획 완성도 ${nw.sc} · ${scoreWord(nw.sc)}`, `비축 +${eps}화`, ...(nw.fans ? [`첫 독자 ${nw.fans}명이 따라왔다`] : [])], msg: r.pick(["제목을 열 번 바꿨다. 1화 첫 문장은 스무 번.", "\"눈을 떠 보니 입사 첫날이었다.\" 첫 문장이 정해졌다.", "장르 랭킹 1~20위 1화를 전부 읽고 나서 키보드에 손을 올렸다."]) };
    }
    if (id === "wn_scout") {
      W.scoutT = s.t; W.scouted = true; W.drawN = (W.drawN || 0) + 1; if (W.draft) W.draft.sub = "";
      const h = hand(s);
      return { lines: ["소재 카드 5장을 새로 뽑았다", h.rand.map((k) => "#" + SUBS[k].n).join(" "), "다음 기획 완성도 +"], msg: r.pick(["서점 웹소설 매대 앞에 한 시간을 서 있었다. 메모장이 세 쪽 찼다.", "노블리 신작 탭 1화만 쉰 개를 읽었다. 눈이 빠질 것 같다.", "친구 직장 얘기를 두 시간 들어 줬다. 밥값은 내가 냈고 소재는 내가 가져왔다.", "도서관 800번대 서가를 끝에서 끝까지 걸었다."]) };
    }
    if (id === "wn_write") {
      const eps = writeEps(s, boost); W.bank = Math.min(80, W.bank + eps); W.written += eps; W.wrote++;
      if (hasTr(s, "homebody")) s.hp = Math.min(s.hpMax, s.hp + 1);
      gainStat(s, "write", 0.35);
      if (s.fullJob === K) W.tired = Math.max(0, W.tired - 2);
      return { lines: [`원고 +${eps}화 (${(eps * 5000).toLocaleString()}자)`, `비축분 ${W.bank}화`, "글쓰기 +"], msg: r.pick(["밤 11시 55분. 마지막 문장을 치고 저장을 눌렀다.", "출근 지하철에서 메모장에 대사를 적고, 밤에 살을 붙였다.", "회차 끝 한 줄을 다섯 번 고쳤다. 다음 화를 누르게 만드는 한 줄.", "키보드 소리만 나는 방. 커피가 식은 줄도 몰랐다.", W.ai ? "AI가 뽑아 준 초안을 절반 넘게 갈아엎었다. 그래도 빠르다." : "오늘은 문장이 술술 나왔다. 이런 날은 드물다."]) };
    }
    if (id === "wn_plot") {
      w.retain = clamp(w.retain + 0.045 * boost * (SYN.on(s, "wn_club") ? 1.25 : 1), 0.5, 0.98); W.plot = Math.min(0.2, (W.plot || 0) + 0.1 * boost);
      if (w.slump) w.slump = 0;
      gainStat(s, "sense", 0.3); gainStat(s, "write", 0.15);
      return { lines: ["연독률 +", "이번 달 원고 품질 +", "감각 +"], msg: r.pick(["화이트보드에 인물 관계도를 그렸다. 악당이 셋이나 겹쳐 있었다.", "주말 도서관에서 조선 시대 관청 자료를 찾았다.", "2부 엔딩부터 거꾸로 짰다. 복선이 보이기 시작했다."]) };
    }
    if (id === "wn_reader") {
      const add = Math.round(22 * boost * (SYN.on(s, "wn_insta") ? 1.35 : 1) * mod(s, "wnBuzz", 1) * (1 + (s.st.mkt || 0) / 250));
      W.buzz = Math.min(70, W.buzz + add); gainStat(s, "mkt", 0.3);
      if (r.chance(0.18)) { s.mental = clamp(s.mental - 2, 0, 100); return { lines: ["독자 유입 +", "마케팅 +", "멘탈 −2"], msg: "답글을 달다가 \"작가 필력 처참\" 댓글을 봤다. 안 본 눈 삽니다." }; }
      s.mental = clamp(s.mental + 1, 0, 100);
      return { lines: ["독자 유입 +", "마케팅 +", "멘탈 +1"], msg: r.pick(["\"작가님 답글 받았다!!\" 독자가 캡처해 자랑했다.", "작가 SNS에 인물 설정화를 올렸다. 저장 수가 꽤 된다.", "웹소설 커뮤니티에 '숨은 명작' 추천 글이 올라왔다. 내 작품이다."]) };
    }
    if (id === "wn_contest") {
      if (CONTEST_M.includes(s.cal)) { contestEnter(s); gainStat(s, "write", 0.2); return { lines: ["노블리 공모전 참가", "두 달 동안 노출 ×1.5", "결과는 다음 달에"], msg: "공모전 전용 순위판에 내 제목이 올라갔다. 382위. 시작은 다 그렇다." }; }
      W.pitchT = s.t;
      const p = clamp(0.15 + w.fans / 600 + (quality(s) - 0.8) * 0.4 + (boost - 1) * 0.2, 0.05, 0.75);
      if (r.chance(p)) { w.mgmt = true; w.share = 0.42; log(s, `웹소설 '${w.n}' 매니지먼트 계약(투고)`, "work"); return { lines: ["투고 성공: 매니지먼트 계약", "50화부터 유료 전환"], msg: "\"원고 잘 봤습니다. 같이 해 보시죠.\" 답장이 왔다. 분배는 작가 7, 회사 3." }; }
      return { lines: ["투고 회신 없음"], msg: r.pick(["메일 다섯 곳. 회신은 자동응답 하나.", "\"아쉽지만 저희와 방향이 다릅니다.\" 정중한 거절이 제일 아프다."]) };
    }
    if (id === "wn_lunch") {
      W.lunchT = s.t; const eps = Math.max(1, Math.round(1.4 * boost)); W.bank = Math.min(80, W.bank + eps);
      const risk = 0.22 + (w.fans >= 300 ? 0.08 : 0);
      if (r.chance(risk)) { const out = applyEff(s, { eye: 5 }); return { lines: [`원고 +${eps}화`, ...out], msg: "팀장이 뒤에 서 있었다. \"보고서… 쓰는 거지?\" 황급히 창을 내렸다." }; }
      return { lines: [`원고 +${eps}화`, `비축분 ${W.bank}화`], msg: "김밥 한 줄과 메모장. 점심시간 40분이 한 화가 됐다." };
    }
    if (id === "wn_lecture") {
      W.lecT = s.t; const fee = Math.round(Math.min(60, 30 + W.done * 5) * boost * SYN.pi(s)); s.cash += fee; addMoney(s, "inc", "웹소설 강의료", fee); gainStat(s, "talk", 0.4); gainStat(s, "charm", 0.3);
      return { lines: [`강의료 +${won(fee)}`, "말빨 +"], msg: "\"초반 5화에서 독자를 잡는 법.\" 수강생 눈이 반짝였다. 10년 전 내가 앉아 있던 자리다." };
    }
    return null;
  },
  month(s, r, notes, scenes) {
    const W = s.webnovel, pi = SYN.pi(s), seas = SEASON[(s.cal || 1) - 1];
    let rev = 0, tailInc = 0, ipInc = 0, cost = 0;
    // 완결작 인세(롱테일)·2차 판권 원작료
    for (const x of W.works) if (x.tail > 0) { tailInc += x.tail; x.tail = Math.round(x.tail * 0.96 * 10) / 10; if (x.tail < 1) x.tail = 0; }
    tailInc = Math.round(tailInc * pi);
    if (W.ipPay.left > 0) { ipInc = W.ipPay.amt; W.ipPay.left--; }
    if (W.ai) cost += Math.round(5 * pi);
    ens(W); trendTick(s, r, notes, scenes);
    const w = W.work; let up = 0, need = 0, newF = 0;
    if (w) {
      need = W.sched; up = Math.min(need, W.bank); W.bank -= up;
      const miss = need - up, cons = need ? up / need : 0;
      w.ep += up; W.ups += up; W.maxEp = Math.max(W.maxEp, w.ep);
      // 연독률: 화가 쌓일수록 조금씩 빠진다(중반의 늪). 글쓰기 모임이면 덜 빠진다
      w.retain = clamp(w.retain - up * 0.0016 * (SYN.on(s, "wn_club") ? 0.65 : 1) + (W.plot ? 0.01 : 0), 0.5, 0.98);
      // 노출
      if (W.expo.left > 0) W.expo.left--; else W.expo.x = 1;
      const dl = dealFx(w); if (w.exT > 0) w.exT--;
      const expo = dl.expo * (SCHED[W.sched]?.f || 0) * seas * (1 + W.buzz / 100) * W.expo.x * (hasTr(s, "writer") ? 1.25 : 1) * (w.title2 ? 1.12 : 1) * (w.cover ? 1.08 : 1) * (W.lv >= 3 && w.mgmt && !w.indie ? 1.1 : 1) * SJ.ramp(s, "webnovel") * SJ.skillRamp(s, "webnovel"); // v4.25b 배우는 기간 · 초반 고생: 독자 소통·플롯이 쌓일수록 1로
      const G = GENRES[w.g] || GENRES.hyun, cap = capOf(s, w), f0 = w.fans;
      if (up > 0 && cap > w.fans) w.fans += (cap - w.fans) * clamp(G.rate * rateM(s, w) * expo * cons * dl.fans, 0, 0.6);
      w.fans *= 1 - 0.02 - (need && miss ? 0.12 * (1 - cons) : 0) - (need === 0 ? 0.07 : 0) - (W.tired >= 80 ? 0.02 : 0);
      w.fans = Math.max(0, w.fans * (1 + 0.04 * r.normal()));
      // 유료 전환: 매니지먼트 계약 + 50화
      if (w.mgmt && !w.paid && w.ep >= 50) { w.paid = true; W.paidEver = true; const lost = Math.round(w.fans * 0.25); w.fans -= lost; notes.push(`웹소설 '${w.n}' 51화부터 유료 전환! 무료 독자 ${lost}명이 떠났다`); W.firstPaid = W.firstPaid || s.t + 1; log(s, `웹소설 '${w.n}' 유료 전환`, "work"); }
      newF = Math.round(w.fans - f0);
      w.peak = Math.max(w.peak, w.fans); W.bestFans = Math.max(W.bestFans, w.fans);
      if (w.paid) { rev = Math.round(up * w.fans * PER_FAN_EP * pi * (w.share / 0.42) * mod(s, "wnPay", 1) * dl.pay); w.rev3.push(rev); if (w.rev3.length > 3) w.rev3.shift(); w.earn = (w.earn || 0) + rev; }
      if (rev > 0 && w.adv > 0) { const cut = Math.min(w.adv, rev); w.adv -= cut; rev -= cut; w.advCut = (w.advCut || 0) + cut; if (w.adv <= 0) notes.push(`웹소설 '${w.n}' 선인세를 다 갚았다. 다음 달부터 연재 수익이 그대로 들어온다`); }
      // 피로·멘탈: 연재는 체력이다
      W.tired = clamp(W.tired + dl.tired + up * 0.62 * mod(s, "wnTired", 1) - (need === 0 ? 28 : 9) - (s.fullJob === K ? 6 : 0), 0, 100);
      const mc = need === 20 ? 3 : need === 12 ? 2 : need === 8 ? 1 : -2;
      s.mental = clamp(s.mental - mc - (W.tired >= 70 ? 3 : 0) + (newF > 30 ? 1 : 0), 0, 100);
      if (SYN.on(s, "wn_night")) { s.hp = clamp(s.hp - 3, 0, s.hpMax); }
      if (miss > 0 && need > 0) { W.punk++; w.pk = (w.pk || 0) + 1; notes.push(up ? `웹소설 연재 ${need}화 중 ${up}화만 올림(비축분 바닥). "작가 잠수?" 독자 이탈` : `웹소설 연재 펑크! 이번 달 0화. 선호작이 우수수 빠졌다`); }
      if (need === 0) notes.push("웹소설 휴재 중: 독자가 조금씩 빠지지만 몸은 쉰다");
      if (W.tired >= 80) notes.push("웹소설 연재 번아웃 직전: 문장이 안 나온다(품질 −)");
      // 필력 만회: 30화부터, 펑크 없이 올린 달마다 작품 배율이 조금씩 오른다(글쓰기가 높을 때만. 한도는 완성도가 준 배율의 +35%)
      if (w.sc !== undefined && w.ep >= WN_CH.grow.from && up > 0 && miss === 0) { const GR = WN_CH.grow, gq = clamp(((s.st?.write || 0) - GR.w0) / (GR.w1 - GR.w0), 0, 1), lim = GR.lim * gq; if (gq > 0 && (w.grow || 0) < lim) { if (!w.grow) notes.push(`웹소설 '${w.n}': 문장이 입소문을 탄다. 필력으로 조금씩 만회 중(한도 +${Math.round(lim * 100)}%)`); w.grow = Math.round(Math.min(lim, (w.grow || 0) + GR.per * gq) * 1000) / 1000; } }
      stageCheck(s, r, w, notes, scenes);
      // 완결
      if (w.ep >= w.goal) finish(s, r, notes, scenes);
    } else W.tired = clamp(W.tired - 20, 0, 100);
    W.buzz = Math.round(W.buzz * 0.45); W.plot = 0;
    s.cash += rev + tailInc + ipInc - cost;
    if (rev) addMoney(s, "inc", "웹소설 연재 수익", rev);
    if (tailInc) addMoney(s, "inc", "웹소설 완결작 인세", tailInc);
    if (ipInc) addMoney(s, "inc", "웹소설 2차 판권", ipInc);
    if (cost) addMoney(s, "exp", "웹소설 비용", cost);
    // 공모전 결과(참가 다음 달)
    if (W.contestT === s.t - 1 && W.work) {
      const ww = W.work, p = clamp(0.06 + (quality(s) - 0.75) * 0.35 + ww.fans / 2500 + (ww.hit - 1) * 0.08, 0.03, 0.55);
      if (r.chance(p)) {
        const prize = Math.round(r.pick([100, 100, 200, 300, 500]) * pi); s.cash += prize; addMoney(s, "inc", "웹소설 상금·선인세", prize); ww.fans *= 1.25; const sign = !ww.mgmt; ww.mgmt = true;
        scenes.push({ kind: "story", tag: "웹소설", title: "공모전 수상", text: `노블리 공모전 결과 발표. 내 필명이 있었다. 상금 ${won(prize)}${sign ? ", 그리고 매니지먼트 계약 제안까지. 50화부터 유료로 간다" : ""}. 화장실에서 소리 없이 주먹을 쥐었다.`, choices: [{ t: "계속", eff: {}, text: "" }] });
        log(s, `웹소설 공모전 수상 ${won(prize)}`, "work");
      } else notes.push(`웹소설 공모전 결과: 수상작 명단에 없었다. 대신 순위판 노출로 독자가 붙었다`);
    }
    awardCheck(s, scenes);
    lvCheck(s, notes, scenes);
    // 확정 장면: 첫 업로드 다음 달, 매니지먼트 쪽지, 첫 정산서, 펑크
    const wk = W.work, seen = W.seen;
    let ev = null;
    if (wk && seen.e01 === undefined && wk.ep > 0) { seen.e01 = s.t; ev = { kind: "event", tag: "웹소설", title: "1화 조회수 7", onChoose: "wn_e01", text: "퇴근 후 세 시간을 쏟은 1화를 올렸다. 다음 날 아침 조회수는 7. 그중 하나는 내가 새로고침한 것이다.",
      choices: [{ t: "그래도 매일 밤 10시에 올린다", eff: { hp: -4, wn_ret: 3 }, text: "알림 설정 독자가 하나 생겼다. 내일도 10시." }, { t: "1화를 뜯어고친다", eff: { stat: { write: 1 }, wn_bank: -1, wn_hit: 8 }, text: "첫 문단을 사건으로 바꿨다. 이탈이 줄었다." }, { t: "조용히 접는다", eff: { mental: 4 }, text: "폴더 속에 1화 하나가 남았다." }] }; }
    else if (wk && !wk.mgmt && wk.ep >= 40 && wk.fans >= 80 && (s.t - (wk.mgmtNo || -99)) >= 4 && (wk.mgmtNo ? r.chance(0.5) : true)) { ev = { kind: "event", tag: "웹소설", title: "매니지먼트의 쪽지", onChoose: "wn_mgmt", text: `연재 ${wk.ep}화째, 쪽지가 왔다. "작가님, 유료화 같이 해 보시죠." 분배는 작가 7, 회사 3. 독점 여부와 선인세는 계약 뒤에 따로 정하자고 한다.`,
      choices: [{ t: "계약한다", eff: {}, text: "표지와 홍보를 회사가 맡는다. 50화부터 유료 연재." }, { t: "더 큰 곳의 연락을 기다린다", eff: {}, text: "답장을 미뤘다. 쪽지함이 조용하다." }] }; wk.mgmtNo = s.t; }
    else if (wk && wk.mgmt && !wk.deal && !wk.indie && wk.ep >= WN_F30.deal.ep) { wk.deal = "ask"; ev = dealScene(s); }
    else if (W.firstPaid && W.firstPaid <= s.t + 1 && seen.e08 === undefined && wk?.paid && rev > 0) { seen.e08 = s.t; ev = { kind: "event", tag: "웹소설", title: "첫 정산서", onChoose: "wn_e08", text: `유료화 첫 달 정산서가 왔다. 독자 ${Math.round(wk.fans).toLocaleString()}명, 한 화 100원. 플랫폼 수수료와 매니지먼트 몫을 떼고 나니 ${won(rev)}. 치킨 ${Math.max(1, Math.round(rev / 2))}마리다.`,
      choices: [{ t: "AI 집필 도구를 결제한다 (월 5만)", eff: {}, text: "초안 속도가 확 빨라졌다. 대신 AI 티 나는 문장은 다 갈아엎어야 한다." }, { t: "표지 일러스트를 새로 맡긴다 (15만)", eff: { wn_cost: 15 }, text: "새 표지가 걸리자 신규 독자가 눈에 띄게 늘었다." }] }; }
    else if (wk && need > 0 && up < need && working(s) && (s.t - (seen.e05 ?? -99)) >= 8) { seen.e05 = s.t; ev = { kind: "event", tag: "웹소설", title: "야근 사흘째, 연재 펑크", onChoose: "wn_e05", text: `분기 마감으로 사흘 연속 야근했다. 연재가 멈췄다. 댓글창에 "작가 잠수?"가 올라오고 선호작이 ${Math.round(wk.fans * 1.15)}에서 ${Math.round(wk.fans)}이 됐다.`,
      choices: [{ t: "비축분 10화를 만들 때까지 휴재 공지", eff: { wn_fans: -4, wn_tired: -15 }, text: "\"충전하고 오겠습니다.\" 공지에 응원 댓글이 붙었다. 다음 달은 휴재." }, { t: "새벽 3시에 억지로 한 화 올린다", eff: { hp: -12, wn_bank: 1, wn_ret: -2 }, text: "오타가 열두 개. 그래도 올렸다." }] }; }
    else if (W.burnAsk && s.t >= W.burnAsk) { W.burnAsk = 0; seen.e16 = s.t; ev = { kind: "event", tag: "웹소설", title: "번아웃과 필명", onChoose: "wn_pen", text: "용두사미라는 평과 함께 작품이 끝났다. 차기작에 대한 기대 댓글이 없다. 필명을 버리고 새로 시작할지 고민이다.",
      choices: [{ t: "새 필명으로 처음부터", eff: { mental: 8, wn_tired: -20 }, text: "아무도 나를 모르는 곳에서 1화를 쓴다. 팬도 0, 부담도 0." }, { t: "같은 필명으로 명예 회복", eff: { mental: -6 }, text: "\"다음 작품은 다를 겁니다.\" 공지를 올렸다. 손이 떨렸다." }] }; }
    if (!ev) ev = outScene(s, r);
    if (!ev && r.chance(0.3)) ev = pickEvent(s, r);
    if (ev) scenes.push(ev);
    W.last = { up, need, miss: need - up, rev, tail: tailInc, ip: ipInc, cost, newF, fans: wk ? Math.round(wk.fans) : 0 };
    const profit = rev + tailInc + ipInc - cost;
    W.hist.push(profit); if (W.hist.length > 24) W.hist.shift();
    return profit;
  },
  idle(s) { const W = s.webnovel; if (!W) return; for (const x of W.works) if (x.tail > 0) x.tail = Math.round(x.tail * 0.96 * 10) / 10; },
  value(s) { const W = s.webnovel; if (!W) return 0; return Math.round(W.works.reduce((a, x) => a + (x.tail || 0), 0) * 6 * SYN.pi(s)); },
  passive(s) { const W = s.webnovel; if (!W || !s.sj?.active?.includes(K)) return 0; return Math.round(W.works.reduce((a, x) => a + (x.tail || 0), 0) * SYN.pi(s) + (W.ipPay.left > 0 ? W.ipPay.amt : 0)); },
  todos(s) {
    const W = s.webnovel, t = [];
    if (!W.work) { t.push(W.plan ? { lv: 2, text: `웹소설: 기획 완성도 ${W.plan.score} · 연재를 시작할지 엎을지` } : { lv: 1, text: "웹소설: 새 작품 기획(장르·소재·주인공·독자층)" }); return t; }
    if (W.rwAsk && !W.work.rw && W.work.sc !== undefined) t.push({ lv: 1, text: "웹소설: 고쳐 쓸 소재 카드 고르기" });
    if (W.sched === 0) t.push({ lv: 1, text: `웹소설 휴재 중 · 비축분 ${W.bank}/10화 모이면 다시 연재` });
    if (W.sched > 0 && W.bank < W.sched) t.push({ lv: W.bank < W.sched / 2 ? 2 : 1, text: `웹소설 이번 달 ${W.sched}화 연재 · 비축분 ${W.bank}화 (원고 쓰기)` });
    if (W.work.retain < 0.82) t.push({ lv: 1, text: `웹소설 연독률 ${Math.round(W.work.retain * 100)}%: 플롯 다듬기` });
    if (W.lv >= 2 && CONTEST_M.includes(s.cal) && W.contestSeason !== seasonId(s)) t.push({ lv: 0, text: "노블리 공모전 시즌: 참가하면 두 달 노출 ×1.5" });
    return t;
  },
  eff(s, eff, out) {
    const W = s.webnovel; if (!W) return; const w = W.work;
    if (eff.wn_fans && w) { const d = Math.round(w.fans * eff.wn_fans / 100); w.fans = Math.max(0, w.fans + d); out.push(`웹소설 독자 ${d >= 0 ? "+" : ""}${d}명`); }
    if (eff.wn_bank) { W.bank = Math.max(0, W.bank + eff.wn_bank); out.push(`비축분 ${eff.wn_bank > 0 ? "+" : ""}${eff.wn_bank}화`); }
    if (eff.wn_ret && w) { w.retain = clamp(w.retain + eff.wn_ret / 100, 0.5, 0.98); out.push(`연독률 ${eff.wn_ret > 0 ? "+" : ""}${eff.wn_ret}%p`); }
    if (eff.wn_hit && w) { w.hit = R2(clamp(w.hit * (1 + eff.wn_hit / 100), 0.2, 9)); out.push(`작품 반응 ${eff.wn_hit > 0 ? "+" : ""}${eff.wn_hit}%`); }
    if (eff.wn_tired) { W.tired = clamp(W.tired + eff.wn_tired, 0, 100); out.push(`연재 피로 ${eff.wn_tired > 0 ? "+" : ""}${eff.wn_tired}`); }
    if (eff.wn_cost) { s.cash -= eff.wn_cost; addMoney(s, "exp", "웹소설 비용", eff.wn_cost); out.push(`돈 −${won(eff.wn_cost)}`); }
  },
  choose: {
    wn_e01(s, r, i) { if (i !== 2) return []; const W = s.webnovel; if (W.work) W.works.push(shelfRow(s, W.work, false, 0)); W.work = null; W.plan = null; const res = SJ.stop(s, K); return [res.ok ? "웹소설 접음" : res.msg]; },
    wn_flop(s, r, i) { const W = s.webnovel, w = W.work; if (!w) return []; const last = w.rw ? 1 : 2; if (i === 0) { w.steady = 1; return ["꾸준히 쓴다: 40화·70화·완결 때 역주행 판정"]; } if (i === last) { const res = dropWork(s); return [res.msg]; } W.rwAsk = s.t; return ["작업실에서 바꿀 소재 카드를 고르세요"]; },
    wn_out(s, r, i) { const W = s.webnovel, w = W.work, o = s._wnOut || {}; s._wnOut = null; if (i === 0 && w && r.chance(0.35)) { const d = 3 + Math.round(w.fans * 0.01); w.fans += d; return [`${o.N || "그 사람"}도 독자가 됐다 · 독자 +${d}명`]; } if (i === 2 && !o.lite) { W.outT = s.t + 12; W.newPen = (W.newPen || 0) + 1; return ["필명을 바꿨다: 한동안은 들킬 일이 없다"]; } return []; },
    wn_title(s, r, i) { const w = s.webnovel.work; if (i === 0 && w) { w.title2 = true; const o = w.n; w.n = w.sub ? autoTitle(w.g, w.sub, w.pro, s.t, true) : r.pick(T2[w.g] || T2.hyun); return [`제목 변경: '${o}' → '${w.n}'`, "노출 +12%"]; } return []; },
    wn_mgmt(s, r, i) { const w = s.webnovel.work; if (!w) return []; if (i === 0) { w.mgmt = true; w.share = 0.42; log(s, `웹소설 '${w.n}' 매니지먼트 계약`, "work"); return ["매니지먼트 계약(작가 7 : 회사 3)", w.ep >= 50 ? "다음 달부터 유료" : "50화부터 유료 전환"]; } if (r.chance(0.35)) { w.mgmt = true; w.share = 0.48; log(s, `웹소설 '${w.n}' 큰 매니지먼트 계약`, "work"); return ["며칠 뒤 더 큰 회사에서 연락! 분배 작가 8 : 회사 2 수준"]; } return ["쪽지가 끊겼다(몇 달 뒤 다시 올 수도)"]; },
    wn_e08(s, r, i) { const W = s.webnovel; if (i === 0) { W.ai = true; return ["AI 집필 도구 구독(월 5만): 원고 +25%"]; } if (W.work) W.work.cover = true; return ["새 표지: 노출 +8%"]; },
    wn_e05(s, r, i) { const W = s.webnovel; if (i === 0) { W.resume = W.sched || 12; W.sched = 0; W.restT = s.t; return ["이번 달 휴재: 비축분 10화가 모이면 다음 달부터 다시 연재"]; } return []; },
    wn_contest_ev(s, r, i) { if (i === 0) { contestEnter(s); return ["노블리 공모전 참가: 두 달 노출 ×1.5"]; } return []; },
    wn_fin(s, r, i) { const W = s.webnovel; if (i === 0) { W.pen = Math.round(W.pen * 1.15); const x = W.works.at(-1); if (x) x.tail = Math.round(x.tail * 1.1); return ["필명 팬 +15%", "완결작 인세 +10%"]; } W.nextBoost = 1.3; return ["차기작 첫 독자 +30%"]; },
    wn_pen(s, r, i) { const W = s.webnovel; if (i === 0) { W.pen = 0; W.newPen++; if (W.work) W.work.fans = 0; return ["새 필명: 필명 팬 0명"]; } if (W.work) W.work.hit = R2(W.work.hit * 1.2); else W.redeem = true; return ["다음 작품 반응 +20%(명예 회복의 칼)"]; },
    wn_ip(s, r, i) {
      const W = s.webnovel, o = s._wnIp; if (!o) return [];
      const deal = (lump, mon) => { s.cash += lump; addMoney(s, "inc", "웹소설 2차 판권", lump); W.ip++; W.ipPay = { left: 24, amt: mon }; log(s, `웹소설 2차 판권(웹툰화) 계약 ${won(lump)}`, "work"); return [`원작 사용료 +${won(lump)}`, `원작료 월 ${won(mon)} × 24개월`]; };
      if (i === 0) { s.cash -= 50; addMoney(s, "exp", "웹소설 비용", 50); return ["변호사 검토비 −50만", ...deal(o.lump, o.mon)]; }
      if (r.chance(0.5)) return ["버틴 보람이 있었다", ...deal(Math.round(o.lump * 1.3), Math.round(o.mon * 1.2))];
      W.ipOffer = 0; return ["제작사가 다른 원작을 골랐다. 메일함이 조용하다."];
    },
    wn_deal(s, r, i) {
      const W = s.webnovel, w = W.work, o = s._wnDeal, D3 = WN_F30.deal; s._wnDeal = null; if (!w || !o) return [];
      if (i <= 1) { const adv = i === 0 ? o.adv : o.advW; w.deal = i === 0 ? "ex" : "wait"; w.adv = adv; w.adv0 = adv; w.exT = D3.exM; s.cash += adv; addMoney(s, "inc", "웹소설 상금·선인세", adv); log(s, `웹소설 '${w.n}' ${DEAL_N[w.deal]} 계약, 선인세 ${won(adv)}`, "work");
        return [`${DEAL_N[w.deal]} 계약 · 선인세 +${won(adv)}`, "선인세만큼은 연재 수익에서 먼저 깎여요", `메인 배너 노출 ×${D3.exExpo} (${D3.exM}개월)`, ...(i ? [`독자 유입 ×${D3.waitFans} · 한 명당 결제 ×${D3.waitPay}`] : [])]; }
      w.deal = "multi"; return [`비독점: 결제 ×${D3.multiPay}`, `노출 ×${D3.multiExpo} · 업로드 관리 피로 +${D3.multiTired}/달`];
    },
    wn_plag(s, r, i) {
      const W = s.webnovel; W.plagN = (W.plagN || 0) + 1; if (i !== 1) return [];
      if (r.chance(WN_F30.plag.spread)) { s._sceneText = "\"작가 해명 없음\" 글까지 붙었다. 캡처가 캡처를 낳았다."; return applyEff(s, { wn_fans: -12, wn_ret: -3, mental: -4 }); }
      s._sceneText = "사흘 뒤, 다들 다른 이야기로 넘어갔다."; return [];
    },
    wn_edit(s, r, i) {
      const W = s.webnovel, w = W.work, o = s._wnEd; s._wnEd = null; if (!w) return [];
      if (i === 0) { W.edN = (W.edN || 0) + 1; return []; }
      if (i === 2 && o) { s.cash -= o.pen; addMoney(s, "exp", "웹소설 비용", o.pen); w.indie = true; w.adv = 0; w.share = WN_F30.edit.indieShare; log(s, `웹소설 '${w.n}' 매니지먼트 계약 해지(혼자 연재)`, "work");
        return [`위약금 −${won(o.pen)}`, `작가 몫 ${Math.round(WN_F30.edit.indieShare * 100)}%`, `노출 ×${WN_F30.edit.indieExpo} · 피로 +${WN_F30.edit.indieTired}/달`]; }
      return [];
    },
    wn_audio(s, r, i) { const W = s.webnovel, o = s._wnAu; if (!o) return []; const lump = i === 0 ? o.lump : Math.round(o.lump * 0.45); s.cash += lump; addMoney(s, "inc", "웹소설 상금·선인세", lump); const x = W.works.find((y) => y.n === o.n); if (x) x.tail = Math.round(x.tail * (i === 0 ? 1.25 : 1.12) * 10) / 10; return [`${i === 0 ? "오디오북·해외" : "해외 번역"} 계약금 +${won(lump)}`, `'${o.n}' 인세 +${i === 0 ? 25 : 12}%`]; },
  },
  monthStart(s) { const W = s.webnovel; if (W.resume && W.sched === 0 && s.t > (W.restT ?? -1) && (W.bank >= 10 || W.rwBack)) { W.sched = W.resume; W.resume = 0; W.rwBack = 0; } },
  stopWhy: (s) => null,
  onStart(s) { const W = s.webnovel; if (W.t0 === null || W.t0 === undefined) W.t0 = s.t; },
  migrate(s, W) { if (!W.v) W.v = 1; if (W.v < 2) { W.v = 2; if (W.work) { W.work.deal = W.work.deal || null; W.work.adv = W.work.adv || 0; } } W.seen = W.seen || {}; W.works = W.works || []; W.ipPay = W.ipPay || { left: 0, amt: 0 }; W.expo = W.expo || { x: 1, left: 0 }; if (W.v < 3) W.v = 3; ens(W); }, // v3(11-26 개편): 연재 중이던 작품은 sc 가 없어 예전 방식(평범 궁합) 그대로 간다
  milestones: [
    { key: "wn_first", title: "1화 업로드", test: (s) => (s.webnovel?.maxEp || 0) >= 1, lines: ["필명을 정하는 데 사흘, 1화를 올리는 데 3초.", "업로드 버튼을 누르고 휴대폰을 엎어 놓았다. 회사 사람들은 아무도 모른다."] },
    { key: "wn_wall", title: "20화의 벽을 넘었다", test: (s) => (s.webnovel?.lv || 0) >= 2, lines: ["연재를 시작한 사람 열에 일곱은 10화도 못 채운다.", "21화를 올리는 밤, 선호작 알림이 50개를 넘었다."] },
    { key: "wn_paid", title: "유료화 작가", test: (s) => (s.webnovel?.lv || 0) >= 3, lines: ["51화 옆에 작은 동전 아이콘이 붙었다.", "내 문장에 누군가 100원을 냈다. 출근길 지하철에서 몇 번이고 다시 봤다."] },
    { key: "wn_done", title: "완결 작가", test: (s) => (s.webnovel?.lv || 0) >= 4, lines: ["완결 작품 비율은 열에 둘이 안 된다.", "'완결' 딱지가 붙은 표지를 바탕화면에 깔았다."] },
    { key: "wn_ip", end: true, kind: "good", epi: "내 소설이 웹툰이 됐다. 크레딧 '원작' 옆 필명은 회사 사람들이 끝까지 몰랐다.", title: "원작자", test: (s) => (s.webnovel?.ip || 0) >= 1, lines: ["웹툰 1화 첫 컷, 내가 상상한 장면이 색을 입고 있었다.", "엔딩 크레딧 첫 줄 '원작'. 그 옆에 내 필명이 있었다."] },
    { key: "wn_steady", end: true, kind: "good", epi: "대박은 없었다. 완결작 인세가 매달 치킨값만큼 꼬박꼬박 들어온다.", title: "성실한 완결 작가", test: (s) => { const W = s.webnovel; return !!W && (W.done || 0) >= 3 && !(W.ip > 0) && W.t0 !== null && W.t0 !== undefined && s.t - W.t0 >= WN_BAL.steadyM && !(s.co?.quit || s.co?.fired); }, lines: (s) => ["완결 세 질. 대박은 없었지만 매달 치킨값 이상은 꼬박꼬박 들어왔다.", (s?.co?.warns || 0) > 0 || Object.keys(s?.co?.cgSeen || {}).length ? "회사에는 한 번 들켰다. 그래도 연재는 멈추지 않았다. 사원증과 필명, 이름이 두 개인 삶." : "회사에선 여전히 아무도 모른다. 사원증과 필명, 이름이 두 개인 삶."] } /* 11-23 발각 이력이 있으면 다른 문장(lines 가 함수면 core.js checkPerks 가 불러 쓴다) */,
    { key: "wn_ghost", end: true, kind: "bad", epi: "폴더 속 1화만 열일곱 개. 20화의 벽은 끝내 넘지 못했다.", title: "20화의 유령", test: (s) => { const W = s.webnovel; return !!W && W.t0 !== null && W.t0 !== undefined && !!s.sj?.active?.includes(K) && s.t - W.t0 >= 36 && W.maxEp < 20; }, lines: ["3년. 폴더 속에는 1화만 열일곱 개가 남았다.", "다시 1화부터. 이번엔 20화까지 비축분을 먼저 쓰기로 했다."] },
  ],
  perks: [
    { id: "p_wn_rhythm", n: "연재 근육", line: "밤 11시가 되면 손가락이 먼저 키보드에 간다", pro: "웹소설 연재 피로 −30%", m: { wnTired: 0.7 }, got: "누적 400화 + 한 작품 독자 3,000명", test: (s) => (s.webnovel?.ups || 0) >= 400 && (s.webnovel?.bestPeak || 0) >= 3000 },
    { id: "p_wn_pen", n: "필명의 무게", line: "\"이 작가 신작이면 일단 본다\"", pro: "웹소설 작품 크기 +15%, 결제 +10%", m: { wnCap: 1.15, wnPay: 1.1 }, got: "4질 완결 + 한 작품 독자 4,000명", test: (s) => (s.webnovel?.done || 0) >= 4 && (s.webnovel?.bestPeak || 0) >= 4000 },
  ],
  perkCine: { p_wn_rhythm: "wn_wall", p_wn_pen: "wn_done" },
  synergy: [
    { id: "wn_insta", kind: "good", n: "인별 × 웹소설", need: "인별그램 + 웹소설", desc: "캐릭터 계정·인별툰 홍보: 독자 소통 효과 +35%", test: (s) => !!s.sj?.active?.includes(K) && !!s.sj?.active?.includes("insta") },
    { id: "wn_club", kind: "good", n: "글쓰기 모임 × 웹소설", need: "글쓰기 모임 + 웹소설", desc: "합평으로 다진 문장: 연독률 하락 −35%, 품질 +", test: (s) => !!s.sj?.active?.includes(K) && (s.hb?.joined || []).includes("write") },
    { id: "wn_night", kind: "bad", n: "주 5회 연재 × 회사", need: "웹소설 주 5회 연재 + 회사 다니는 중", desc: "새벽 연재: 매달 스태미너 −3", test: (s) => !!s.sj?.active?.includes(K) && s.webnovel?.sched === 20 && !!s.webnovel?.work && !(s.co?.quit || s.co?.fired) },
  ],
  traits: [{ trait: "spotlight", t: "웹소설 독자 소통 효과 +30%", m: { wnBuzz: 1.3 } }],
  spots: { library: ["wn_write"], cafe: ["wn_plot"] },
};

// 화면에서 쓰는 조작
export function setSched(s, v) { const W = s.webnovel; if (SCHED[v]) { W.sched = +v; W.resume = 0; } }
export function toggleAi(s) { const W = s.webnovel; W.ai = !W.ai; return W.ai; }
export function buyCover(s) { const W = s.webnovel, w = W.work; if (!w || w.cover) return { ok: false, msg: "이미 표지가 있어요" }; const c = Math.round(15 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "웹소설 비용", c); w.cover = true; return { ok: true, msg: `표지 일러스트 ${won(c)}: 노출 +8%` }; }
export function dropWork(s) { const W = s.webnovel, w = W.work; if (!w) return { ok: false, msg: "연재 중인 작품이 없어요" }; ens(W); W.works.push(shelfRow(s, w, false, w.paid ? Math.round((w.rev3.reduce((a, b) => a + b, 0) / Math.max(1, w.rev3.length)) * 0.1) : 0)); W.pen = Math.max(W.pen, Math.round(w.peak * 0.1)); const DR = WN_CH.drop, carry = Math.round(w.fans * (DR.carry[0] + (DR.carry[1] - DR.carry[0]) * u01(`${lifeKey(s)}:drop:${s.t}:${W.drops}`))); W.carry = carry; W.drops++; W.work = null; W.bank = 0; log(s, `웹소설 '${w.n}' ${w.ep}화에서 연재 중단`, "work"); return { ok: true, msg: `'${w.n}' ${w.ep}화에서 연재 중단. 비축분은 버렸다 · 다음 작품으로 ${carry}명이 따라온다${W.drops >= DR.lazyFrom ? " · '연중 작가' 딱지(첫 독자 감소)" : ""}` }; }
export function finishNow(s) { const W = s.webnovel, w = W.work; if (!w || w.ep < 80) return { ok: false, msg: "80화부터 조기 완결할 수 있어요" }; w.goal = w.ep; w.retain = Math.max(0.5, w.retain - 0.06); return { ok: true, msg: "다음 달 정산 때 완결해요(급하게 끝내면 '용두사미' 소리를 들을 수 있어요)" }; }
