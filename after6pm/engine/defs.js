// After 6PM v4 · 고정 정의(밸런스 표). 숫자만 바꿔서 조정한다. 돈 단위는 만원.

// 능력치는 0~200. 처음엔 낮고(10~40) 키워 간다. 체력(body)은 능력치, 스태미너(s.hp)는 매달 쓰는 기력.
export const STATS = { talk: "말빨", write: "글쓰기", sense: "감각", mkt: "마케팅", hands: "손재주", num: "숫자", career: "커리어", charm: "매력", body: "체력", lang: "외국어" };
export const STAT_KEYS = Object.keys(STATS);
export const STAT_MAX = 200;
export const STAT_CAP0 = 200, STAT_CAP_NG = 0, NG_GROW_T = [1, 1.2, 2.6]; // 11-23 결정: 천장은 회차와 상관없이 200(1회차 190 없앰). 회차마다 달라지는 것은 성장 속도·월 상한뿐
// ───────── 능력치 성장(v4.28 개편) ─────────
// 세 갈래: 공부형은 공부 효과 100%, 경험형 30%, 생활형 0%(공부 목록에서 빠짐)
export const STAT_KIND = { write: "study", num: "study", lang: "study", mkt: "study", talk: "exp", career: "exp", hands: "exp", sense: "exp", charm: "life", body: "life" };
export const STAT_KIND_N = { study: { n: "공부형", study: 1 }, exp: { n: "경험형", study: 0.3 }, life: { n: "생활형", study: 0 } };
export const STUDY_ACTS = ["study_home", "study", "course"];
// 성장 곡선: 지금 값이 to 미만이면 m 배(돌파 중이면 b 배). 아이템·카드 '바로 +N'은 곡선을 거치지 않는다.
export const STAT_CURVE = [
  { to: 60, n: "입문", m: 1.0, b: 1.0, study: 1 },
  { to: 100, n: "숙련", m: 0.5, b: 0.5, study: 0.4 },
  { to: 150, n: "고수", m: 0.13, b: 0.25, study: 0.3 },
  { to: 180, n: "달인", m: 0.05, b: 0.18, study: 0.2 },
  { to: 201, n: "전설", m: 0.06, b: 0.15, study: 0.1 }, // v4.28c: 봇 판 끝 평균이 매력·체력 200에 닿아 높은 구간을 더 가파르게
]; // v4.28b: 목표(집중해서 3년 100 · 8~10년 150 · 200 전설)에 맞춰 낮춤. study: 공부 행동(STUDY_ACTS)만 따로 곱함 — 높은 구간은 실전·돌파 계기가 열쇠
export const STAT_BRK = { months: 6, jp: { cs: "talk", tarot: "talk", webnovel: "write" } }; // 돌파 계기: 6달 동안 벽이 낮아진다 · jp: 한방 대박 때 돌파하는 능력치
export const STAT_MCAP = [6, 3, 1.5, 0.6, 0.5];
export const JOB_XP = 1.2; // v4.28d 실전 경험: 투잡을 하는 달마다 그 투잡 주력 능력치(MG_STAT.of) // v4.28c 능력치마다 한 달에 오를 수 있는 양(구간별: 60·100·150·180·200 미만). 돌파 중이면 2배. 아이템·카드 +N 은 따로
export const STAT_REP = { months: 3, mult: 0.7 }; // 같은 길로 같은 능력치를 석 달 연속 올리면 ×0.7(다른 길 섞으면 회복)
export const MG_STAT = { great: 1, good: 0.5, of: { pr: "hands", cs: "talk", airbnb: "talk", ucafe: "hands", insta: "sense", tarot: "talk", tutoring: "talk", chicken: "hands", vibe: "sense", webnovel: "sense" } }; // 미니게임 대성공·성공 → 그 투잡의 경험형 능력치
// 장소 장면에서 고른 뒤 오르는 능력치(장소마다 다르게) · 선택지 글에 이런 말이 있으면 그 능력치도 조금
// 11-25 능력치 성장 개편 2-1: 장소 장면 뒤 두 번째 능력치(첫째의 절반). 헬스장 매력, 포차·카페 말빨, 부동산 감각, 성숲길 마케팅 등
export const LOC_STAT2 = { gym: "charm", cafe: "talk", pub: "talk", realty: "sense", univ: "career", officest: "mkt", hotplace: "mkt", newtown: "sense", club: "talk", online: "write" };
export const LOC_STAT = { home: "write", gym: "body", cafe: "sense", library: "num", pub: "charm", realty: "num", office: "career", univ: "talk", officest: "career", hotplace: "sense", newtown: "talk", club: "charm", online: "mkt", parents: "hands" };
export const STAT_WORDS = [
  ["body", /운동|달린|달리|뛴다|뛰어|산책|등산|스트레칭|일찍 잔|푹 잔|잠을|잔다|잤다|샐러드|식단|헬스|계단/],
  ["charm", /고백|데이트|소개팅|꾸미|옷을|웃으며|미소|분위기를 띄|건배사|무대|자신감|칭찬을/],
  ["lang", /영어|일본어|중국어|외국|해외|번역|통역|원어민|여행객/],
];
export const STAT_WORD_GAIN = 0.4;
// '이 능력치가 오르는 곳'(나 화면 접기 힌트)
export const STAT_WHERE = {
  write: "공부·보고서·블로그·첨삭·웹소설·독서 모임",
  num: "공부·예산 업무·정산·원가표·부동산·보드게임",
  lang: "공부·에어씨앤씨 응대·여행·외국인 친구·해외 메일",
  mkt: "공부·트렌드 구경·홍보·인별·공유오피스·크멍",
  talk: "발표·회의·포차·상담·강의·과외·밴드",
  career: "회사 일·TF·점심 네트워킹·멘토링·선배 조언",
  hands: "셀프 공사·청소·튀김·본가 일 돕기·공방",
  sense: "전시·사진·방 꾸미기·카페 구경·여행",
  charm: "헬스·러닝·꾸미기·한잔·연애·무대(강의·라이브)·큰 성공",
  body: "운동·PT·러닝·푹 쉬기·몸 쓰는 투잡(야근·회식은 −)",
};
export const ROLL = { min: 8, max: 32, body: [18, 40], lang: [3, 25] }; // 시작 능력치 룰렛 범위
export const staMax = (body) => Math.round(60 + body * 0.6); // 체력 → 최대 스태미너

// ───────── 회사 종류별 장소(11-25 지도 시안) ─────────
// 장소 id = 배경 그림 키(img/bg/<id>.webp. 그림이 아직 없으면 화면이 desk 그림으로 대신한다).
// lb = 그 장소에서 보이는 행동 이름(행동 자체는 같다), lockRank = 이 직급(RANKS 순서)부터 열림. 회사 행동 6개는 어느 종류에서도 빠지지 않는다(회식은 회식이 뜬 달의 '회사 앞'에서만)
// 11-25 맵 시안: 회사 크기별로 한 달에 회사에 나와 있는 사람 수(대기업은 많고 스타트업은 적다). sj.js refresh
export const CO_PPL = { big: [5, 7], fin: [4, 6], mid: [3, 5], public: [3, 4], startup: [2, 3] };
export const CO_SPOTS = {
  big: [
    { id: "lobby", n: "로비", loc: "office", acts: ["office_chat"], lb: { office_chat: "로비 스몰토크" } },
    { id: "desk", n: "내 자리", loc: "office", acts: ["work_hard", "overtime"] },
    { id: "meeting", n: "회의실", loc: "office", acts: ["co_project"] },
    { id: "cafeteria", n: "구내식당", loc: "office", acts: ["co_lunch"], lb: { co_lunch: "구내식당 점심" } },
    { id: "cocafe", n: "사내 카페", loc: "office", acts: ["office_chat", "co_resume"], lb: { office_chat: "사내 카페 수다" } },
    { id: "exec", n: "임원층", loc: "office", acts: [], lockRank: 2 },
  ],
  fin: [
    { id: "desk", n: "내 자리", loc: "office", acts: ["work_hard"] },
    { id: "pantry", n: "탕비실", loc: "office", acts: ["office_chat", "co_lunch"] },
    { id: "meeting", n: "회의실", loc: "office", acts: ["co_project", "co_resume"] },
    { id: "dealing", n: "딜링룸", loc: "office", acts: ["overtime"], lb: { overtime: "장 마감 뒤 야근" } },
    { id: "viplounge", n: "VIP 라운지", loc: "office", acts: [] },
  ],
  mid: [
    { id: "desk", n: "내 자리", loc: "office", acts: ["work_hard", "overtime"] },
    { id: "pantry", n: "탕비실", loc: "office", acts: ["co_lunch"] },
    { id: "meeting", n: "회의실", loc: "office", acts: ["co_project", "co_resume"] },
    { id: "coroof", n: "옥상", loc: "office", acts: ["office_chat"], lb: { office_chat: "옥상 수다" } },
  ],
  public: [
    { id: "desk", n: "내 자리", loc: "office", acts: ["work_hard"] },
    { id: "civil", n: "민원실", loc: "office", acts: ["overtime"], lb: { overtime: "민원 창구 연장 근무" } },
    { id: "meeting", n: "회의실", loc: "office", acts: ["co_project", "co_resume"] },
    { id: "cogym", n: "구내 체육관", loc: "office", acts: ["office_chat", "co_lunch"], lb: { office_chat: "체육관 수다", co_lunch: "점심 탁구 내기" } },
  ],
  startup: [
    { id: "opendesk", n: "오픈 데스크", loc: "office", acts: ["work_hard", "overtime", "co_project"] },
    { id: "lounge", n: "라운지", loc: "office", acts: ["office_chat", "co_lunch"], lb: { office_chat: "라운지 수다" } },
    { id: "phonebooth", n: "폰부스", loc: "office", acts: ["co_resume"], lb: { co_resume: "폰부스에서 경력기술서" } },
  ],
};
export const coSpots = (type) => CO_SPOTS[type] || CO_SPOTS.mid;
// 회식: 평소에는 없는 장소. 회식이 뜬 달에만 지도에 '회사 앞' 핀이 선다. ap = 행동력, miss = 안 가고 달이 넘어가면 팀장 호감
export const CO_PARTY_SPOT = { id: "dinner", n: "회사 앞 · 회식", loc: "office", acts: ["company_dinner"] };
export const CO_PARTY = {
  ap: 2, boss: 3, miss: -3, from: 1, // boss: 가면 오르는 팀장 호감. 11-25 밸런스로 6 → 3(6이면 봇이 절반만 가도 2회차 파이어 34%). 봇 시험은 환경변수 DING·DINM. from: 입사 첫 달(t 0)은 건너뛴다
  q: { 3: ["q", "1분기 마감 뒤풀이"], 6: ["q", "상반기 마감 뒤풀이"], 9: ["q", "3분기 마감 뒤풀이"], 12: ["year", "송년회"] },
  extra: { big: [11, "found", "창립기념일 만찬"], fin: [4, "ws", "봄 워크숍 뒤풀이"], mid: [10, "ws", "가을 워크숍 뒤풀이"], public: [4, "found", "창립기념일 만찬"], startup: [7, "ws", "여름 워크숍 뒤풀이"] },
  msg: { q: "2차에서 팀장의 \"나 때는\"을 세 번 들었다. 3차 노래방 문 앞에서 탈출했다.", year: "건배사 차례가 돌아왔다. \"올해도 살아남았습니다.\" 웃음은 샀다. 3차는 못 샀다.", ws: "레크리에이션 강사보다 팀장 건배사가 더 길었다. 돌아오는 버스에서는 전원 기절.", found: "근속 20년 상을 받는 부장님께 박수를 쳤다. 내 차례는 아직 한참 남았다." },
};
export const coParty = (type, cal) => { const q = CO_PARTY.q[cal], x = CO_PARTY.extra[type]; return q ? { k: q[0], n: q[1] } : x && x[0] === cal ? { k: x[1], n: x[2] } : null; };
// 모든 종류의 회사 장소를 id 로 합친 목록(D.SPOTS 용. 같은 id 는 행동을 합친다). 화면·엔진은 이 목록 대신 coSpots(종류)를 읽는다
const CO_ALL = (() => { const m = new Map(); for (const sp of [...CO_SPOTS.mid, ...Object.values(CO_SPOTS).flat(), CO_PARTY_SPOT]) { const o = m.get(sp.id); if (o) { for (const a of sp.acts) if (!o.acts.includes(a)) o.acts.push(a); } else m.set(sp.id, { id: sp.id, n: sp.n, loc: sp.loc, acts: [...sp.acts] }); } return [...m.values()]; })();
export const CO_SPOT_IDS = CO_ALL.map((sp) => sp.id);

// ───────── 지도: 지역 → 장소(스팟). loc는 인연이 머무는 장소 id ─────────
export const REGIONS = [
  { id: "town", n: "우리 동네", desc: "집, 헬스장, 단골 카페. 하루가 시작되고 끝나는 곳", spots: [
    { id: "home", n: "우리 집", loc: "home", acts: ["rest", "study_home", "family_time", "cs_blog", "cs_insta"] },
    { id: "gym", n: "헬스장", loc: "gym", acts: ["workout", "pt"] },
    { id: "cafe", n: "동네 카페", loc: "cafe", acts: ["cafe_work"] },
    { id: "library", n: "스터디카페", loc: "library", acts: ["study", "course", "grad_apply"] },
    { id: "pub", n: "동네 포차", loc: "pub", acts: ["drink"] },
    { id: "realty", n: "부동산", loc: "realty", acts: ["pr_search", "house_search"] },
  ] },
  // 11-25 회사 장소는 회사 종류마다 다르다(위 CO_SPOTS). 여기 spots 는 모든 종류를 합친 목록이라, 지금 회사의 장소는 core.js companySpots(s) 로 읽는다.
  // 11-24 alt: "officest" 삭제: 오피스 상권에 다니는 다른 회사 사람(호텔 매니저·헤드헌터 등)이 우리 회사 탕비실에 나오던 원인
  { id: "company", n: "회사", hub: "co", desc: "월급이 나오는 곳. 그리고 눈치가 쌓이는 곳", spots: CO_ALL },
  { id: "univ", n: "대학가", desc: "개강하면 붐비는 거리. 취준생과 파티룸 손님이 모인다", spots: [
    { id: "gate", n: "정문 앞", loc: "univ", acts: ["univ_walk"] },
    { id: "center", n: "커리어센터 강의장", loc: "seminar", acts: ["cs_seminar", "cs_lecture"] },
    { id: "studyst", n: "스터디 골목", loc: "univ", acts: ["cs_flyer"] },
  ] },
  { id: "hot", n: "성숲길", desc: "팝업과 루프탑, 사진 찍는 사람들. 트렌드가 먼저 온다", spots: [
    { id: "popup", n: "팝업 거리", loc: "hotplace", acts: ["trend_walk"] },
    { id: "rooftop", n: "루프탑 바", loc: "hotplace", acts: ["drink_fancy"] },
    { id: "gallery", n: "전시관", loc: "hotplace", acts: ["exhibit"] },
  ] },
  { id: "officest", n: "오피스 상권", desc: "평일 저녁 회식과 세미나. 직장인이 흐르는 곳", spots: [
    { id: "alley", n: "점심 골목", loc: "officest", acts: ["network_lunch"] },
    { id: "cowork", n: "공유오피스", loc: "officest", acts: ["cowork", "pr_meetup", "pr_course"] },
  ] },
  { id: "online", n: "온라인", desc: "앱과 오픈채팅. 손님도, 인연도, 악플도 여기서 온다", spots: [
    { id: "app", n: "소개팅 앱", loc: "online", acts: ["dating_app"] },
    { id: "chat", n: "카카우 오픈채팅", loc: "online", acts: ["cs_kakao"] },
    { id: "market", n: "크멍·숨꼬", loc: "online", acts: ["cs_kmong", "cs_soomgo"] },
  ] },
  { id: "newtown", n: "신도시", desc: "아파트 단지와 키즈카페. 결혼하면 자주 오게 된다", unlock: (s) => Math.floor((s.startAge ?? 27) + 1e-9) + Math.floor(((((s.cal - 1 - s.t) % 12) + 12) % 12 + s.t) / 12) >= 31 || s.fam.spouse /* 11-25 화면 나이(해가 바뀌면 한 살, core.js ageNow 와 같은 식)로 연다 */, spots: [
    { id: "apt", n: "아파트 단지", loc: "newtown", acts: ["house_tour"] },
    { id: "kids", n: "키즈카페", loc: "newtown", acts: ["kids_play"] },
  ] },
  { id: "parents", n: "본가", desc: "부모님 댁. 갈 때마다 반찬이 늘어난다", spots: [
    { id: "parents", n: "본가", loc: "parents", acts: ["visit_parents"] },
  ] },
];
export const SPOTS = Object.fromEntries(REGIONS.flatMap((r) => r.spots.map((sp) => [sp.id, { ...sp, region: r.id }])));

// ───────── 행동 (모두 즉시 반영, 행동력 ap 소모, 체력 hp 소모) ─────────
// gain: 능력치 증가량(기본), eff: 즉시 효과. 실제 처리는 core.js의 ACT_FN에서.
export const ACTIONS = {
  // 능력치
  rest: { n: "푹 쉬기", track: "능력치", ap: 1, hp: -10, mental: 6, stat: { body: 0.2 }, desc: "스태미너 회복. 다음 달 행동력이 늘어요" },
  study_home: { n: "집에서 공부", track: "능력치", ap: 1, hp: 3, mental: -1, pick: "stat", gain: 2.2, desc: "능력치 하나를 조금 올린다" },
  study: { n: "스터디카페 공부", track: "능력치", ap: 1, hp: 4, mental: -2, pick: "stat", gain: 3.2, cash: -1, desc: "집보다 집중이 잘 된다" },
  course: { n: "유료 강의 듣기", track: "능력치", ap: 1, hp: 3, mental: -1, pick: "stat", gain: 5.5, cash: -15, desc: "돈 주고 빨리 배운다" },
  workout: { n: "운동", track: "능력치", ap: 1, hp: 4, mental: 3, stat: { charm: 0.2 }, desc: "체력이 오르고 최대 스태미너가 늘어요(나이 들수록 중요)" },
  pt: { n: "PT 받기", track: "능력치", ap: 1, hp: 5, mental: 2, cash: -8, stat: { charm: 0.35 }, desc: "체력이 많이 올라요" },
  beauty: { n: "꾸미기", track: "능력치", ap: 1, hp: 1, pick: "beauty", desc: "매력을 올린다" },
  // 사람
  family_time: { n: "가족과 시간", track: "사람", ap: 1, hp: 2, mental: 4, desc: "가족 행복이 오른다", need: (s) => s.fam.spouse || s.fam.kids.length },
  visit_parents: { n: "부모님 뵙기", track: "사람", ap: 1, hp: 3, mental: 2, cash: -5, stat: { hands: 0.6 }, desc: "부모님 마음이 편해진다" },
  drink: { n: "한잔하기", track: "사람", ap: 1, hp: 5, mental: 5, cash: -4, stat: { talk: 0.6, charm: 0.2 }, desc: "멘탈 회복, 단골 인연" },
  drink_fancy: { n: "루프탑에서 한잔", track: "사람", ap: 1, hp: 5, mental: 6, cash: -9, stat: { charm: 0.8, talk: 0.4 }, desc: "분위기 좋은 인연이 많다" },
  exhibit: { n: "전시 보기", track: "능력치", ap: 1, hp: 3, mental: 4, cash: -2, stat: { sense: 1.5 }, desc: "감각이 오른다" },
  trend_walk: { n: "트렌드 구경", track: "능력치", ap: 1, hp: 3, mental: 2, stat: { mkt: 1.2, sense: 0.8 }, desc: "요즘 뭐가 뜨는지 본다" },
  run_crew: { n: "러닝크루 뛰기", track: "사람", ap: 1, hp: 5, mental: 4, stat: { charm: 0.15 }, desc: "체력 +, 인연" },
  book_club: { n: "독서모임", track: "사람", ap: 1, hp: 3, mental: 3, cash: -2, stat: { write: 1.2 }, desc: "글쓰기 +, 인연" },
  dating_app: { n: "소개팅 앱 켜기", track: "사람", ap: 1, hp: 2, mental: -1, stat: { charm: 0.5 }, desc: "새 인연을 바로 만난다(매력이 중요)" },
  network_lunch: { n: "점심 네트워킹", track: "사람", ap: 1, hp: 3, cash: -2, stat: { career: 0.8, sense: 0.5 }, desc: "다른 회사 사람 이야기" },
  cowork: { n: "공유오피스 작업", track: "일", ap: 1, hp: 4, cash: -2, stat: { mkt: 0.4, career: 0.4 }, desc: "투잡 일을 몰아서(행동 1번이 1.5번 효과)" },
  cafe_work: { n: "카페에서 작업", track: "일", ap: 1, hp: 3, cash: -1, stat: { sense: 0.3, talk: 0.3 }, desc: "다음 투잡 작업 1번 효과 +30%" },
  univ_walk: { n: "대학가 둘러보기", track: "일", ap: 1, hp: 3, stat: { talk: 0.4, mkt: 0.2 }, desc: "대학가 상권 감 잡기, 취준생 인연" },
  kids_play: { n: "아이와 키즈카페", track: "사람", ap: 1, hp: 6, mental: 2, cash: -3, stat: { sense: 0.5, body: -0.2 }, desc: "아이 행복 +", need: (s) => s.fam.kids.length },
  house_tour: { n: "아파트 구경", track: "사람", ap: 1, hp: 3, stat: { talk: 0.4, num: 0.3 }, desc: "내 집 마련 정보" },
  house_search: { n: "내 집 알아보기", track: "사람", ap: 1, hp: 3, stat: { num: 0.4, sense: 0.3 }, desc: "전세·매매 매물을 본다" },
  // 회사
  work_hard: { n: "성과 내기", track: "일", ap: 1, hp: 5, mental: -2, stat: { write: 0.4, num: 0.4, career: 0.5 }, desc: "회사 성과 +, 눈치 −" },
  overtime: { n: "자진 야근", track: "일", ap: 2, hp: 10, mental: -4, stat: { write: 0.5, num: 0.5, career: 0.8, body: -0.3 }, desc: "성과 ++, 승진 심사에 유리" },
  office_chat: { n: "탕비실 수다", track: "사람", ap: 1, hp: 1, mental: 2, stat: { career: 0.3 }, desc: "사내 소문, 동료 인연, 눈치 −" },
  company_dinner: { n: "회식 참석", track: "일", ap: 2, hp: 6, mental: -2, stat: { charm: 0.6, talk: 0.5, body: -0.3 }, desc: "회식이 뜬 달에만 · 팀장 호감 + 눈치 −" }, // 11-25 행동력 1 → 2, 회식이 뜬 달에만(core.js partyOn)
  // 파티룸
  pr_search: { n: "파티룸 매물 보기", track: "일", ap: 1, hp: 4, pick: "district", stat: { num: 0.4, sense: 0.3 }, desc: "상권을 골라 매물 3개를 본다" },
  pr_visit: { n: "임장", track: "일", ap: 1, hp: 5, desc: "방음·24시간 출입·온돌 시공 가능 여부 확인" },
  pr_landlord: { n: "건물주 미팅", track: "일", ap: 1, hp: 3, desc: "건물주 성향 확인. 말빨로 설득 가능" },
  pr_appcheck: { n: "앱으로 상권 조사", track: "일", ap: 1, hp: 2, desc: "주변 경쟁 파티룸 수와 컨셉 수요 확인" },
  pr_setup: { n: "셀프 인테리어 작업", track: "일", ap: 1, hp: 8, desc: "셀프 공사 진행(3번 필요)" },
  pr_manage: { n: "파티룸 관리", track: "일", ap: 1, hp: 5, stat: { body: 0.2, charm: 0.1 }, desc: "청소·응대·비품. 필요량을 못 채우면 별점 하락" },
  pr_promo: { n: "홍보 사진 찍기", track: "일", ap: 1, hp: 3, desc: "이번 달 예약 +12%" },
  // 컨설팅
  cs_friend: { n: "지인 무료 첨삭", track: "일", ap: 1, hp: 4, desc: "첫 후기 만들기(진입 단계)" },
  cs_work: { n: "고객 첨삭·코칭", track: "일", ap: 1, hp: 5, mental: -2, desc: "대기 고객을 처리하고 돈을 받는다" },
  cs_blog: { n: "네이바 블로그 글", track: "일", ap: 1, hp: 3, desc: "검색 유입이 천천히 쌓인다" },
  cs_insta: { n: "인별 카드뉴스", track: "일", ap: 1, hp: 3, desc: "팔로워와 문의" },
  cs_youtube: { n: "너튜브 영상", track: "일", ap: 2, hp: 7, desc: "대박 가능, 대신 얼굴 노출(눈치 +)" },
  cs_kakao: { n: "오픈채팅방 운영", track: "일", ap: 1, hp: 2, mental: -1, stat: { career: 0.3, write: 0.2 }, desc: "방 인원이 늘면 문의가 는다" },
  cs_kmong: { n: "크멍 상세페이지", track: "일", ap: 1, hp: 3, stat: { mkt: 0.4, write: 0.2 }, desc: "크멍 입점·상세페이지 개선(수수료 20%)" },
  cs_soomgo: { n: "숨꼬 견적 보내기", track: "일", ap: 1, hp: 2, cash: -2, stat: { mkt: 0.3, talk: 0.2 }, desc: "바로 고객 1~3명. 견적 비용" },
  cs_flyer: { n: "스터디 골목 홍보", track: "일", ap: 1, hp: 4, stat: { talk: 0.4, mkt: 0.3 }, desc: "취준생 인연, 문의 +" },
  cs_seminar: { n: "무료 특강 열기", track: "일", ap: 2, hp: 8, mental: -2, stat: { talk: 0.8, career: 0.4, charm: 0.4 }, desc: "문의 폭발. 후기 5개 이상 필요" },
  cs_lecture: { n: "대학 강의", track: "일", ap: 2, hp: 8, stat: { talk: 1, career: 0.5, charm: 0.5 }, desc: "강의료 + 신뢰. 섭외가 와야 함" },
  cs_template: { n: "첨삭 템플릿 만들기", track: "일", ap: 2, hp: 6, desc: "고객 1명당 걸리는 시간이 준다(규모의 경제)" },
  cs_group: { n: "그룹 스터디 운영", track: "일", ap: 1, hp: 5, desc: "한 번에 여러 명. 오픈채팅 150명 또는 후기 25개" },
  cs_focus: { n: "집중 첨삭(반기에 한 번)", track: "일", ap: 1, hp: 5, mental: -1, pick: "quiz", desc: "문제 3개를 직접 푼다. 잘 풀수록 여섯 달 동안 합격률 +, 환불 −. 상·하반기에 한 번씩만" },
  pr_decor: { n: "파티룸 컨셉 소품", track: "일", ap: 1, hp: 4, pick: "decor", desc: "조명·소파·벽·놀거리·포토존·주방을 골라 컨셉 궁합을 맞춰요" },
  cs_vod: { n: "VOD·전자책 제작", track: "일", ap: 2, hp: 6, desc: "완성되면 매달 저절로 팔린다" },
  // 장소에서 사람 만나기(공통)
  talk: { n: "말 걸기", track: "사람", ap: 1, hp: 2, desc: "" },
  date: { n: "데이트", track: "사람", ap: 1, hp: 4, mental: 4, cash: -10, desc: "" },
  meetup: { n: "약속 잡기", track: "사람", ap: 1, hp: 3, mental: 2, cash: -4, desc: "" },
  trip: { n: "여행", track: "사람", ap: 3, hp: 4, mental: 10, cash: -80, desc: "" },
  propose: { n: "프러포즈", track: "사람", ap: 2, hp: 3, cash: -300, desc: "" },
  // 투잡 탐색
  sj_youtube: { n: "투잡 너튜브 정주행", track: "일", ap: 1, hp: 2, mental: 1, desc: "아직 모르는 투잡 2개에 관심 +" },
  sj_report: { n: "투잡연구소 리포트 읽기", track: "일", ap: 1, hp: 2, pick: "sj", desc: "고른 투잡 하나를 깊게(관심 +35)" },
  sj_seminar: { n: "투잡 세미나 가기", track: "일", ap: 2, hp: 6, cash: -3, desc: "투잡 3개 관심 +, 경험자 인연" },
  sj_interview: { n: "해 본 사람에게 묻기", track: "일", ap: 1, hp: 3, cash: -2, pick: "sj", desc: "커피 한 잔에 현실을 듣는다(관심 +50, 궁합 공개)" },
  hb_go: { n: "취미 모임 가기", track: "사람", ap: 1, hp: 4, desc: "능력치·멘탈 +, 인연, 투잡 발견" },
  // 회사 (투잡 없이 회사만 다녀도 된다)
  co_lunch: { n: "동료와 점심", track: "사람", ap: 1, hp: 1, cash: -1, mental: 1, stat: { talk: 0.3, career: 0.2 }, desc: "사내 인연, 소문(가끔 투잡 이야기)" },
  co_project: { n: "TF 프로젝트 지원", track: "일", ap: 2, hp: 8, mental: -3, stat: { talk: 0.8 }, desc: "성과·커리어 크게 +, 팀장 호감 +" },
  co_resume: { n: "경력기술서 업데이트", track: "일", ap: 1, hp: 2, stat: { career: 0.5, write: 0.3 }, desc: "원티즈·리멤바에 열어 둔다. 헤드헌터 제안 +" },
  rejob: { n: "재취업 면접", track: "일", ap: 2, hp: 6, mental: -3, desc: "다시 회사로" },
  // 파티룸 노하우·엑시트
  pr_meetup: { n: "파티룸 사장 모임", track: "일", ap: 1, hp: 3, cash: -3, stat: { career: 0.3, talk: 0.3 }, desc: "노하우를 나눠요. 운영 노하우 +, 좋은 매물·권리금 정보" },
  pr_course: { n: "파티룸 운영 교육 수강", track: "일", ap: 2, hp: 5, cash: -60, desc: "운영 노하우가 크게 올라요(6개월에 한 번)" },
  pr_teach: { n: "파티룸 창업 강의하기", track: "일", ap: 2, hp: 7, desc: "강의료와 입소문. 지점 3곳·노하우 50부터" },
  pr_club: { n: "모임 대관 행사 열기", track: "일", ap: 1, hp: 5, desc: "내 취미 모임 행사를 내 파티룸에서. 매출·입소문·인연" },
  pr_reply: { n: "후기 답글 달기", track: "일", ap: 1, hp: 1, desc: "밀린 후기에 답글. 별점 +, 악성 후기 대응" },
  pr_review: { n: "리뷰 이벤트", track: "일", ap: 1, hp: 2, cash: -10, desc: "음료 쿠폰을 걸고 인별·블로그 후기를 모아요(입소문 +)" },
  // 인별그램
  in_post: { n: "올리기", track: "일", ap: 1, hp: 2, desc: "컨셉대로 올리면 일관성·노출 +. 포맷마다 품이 달라요(릴스·브이로그 ⚡2)" },
  in_reel: { n: "실험 릴스", track: "일", ap: 2, hp: 6, desc: "컨셉 밖 포맷으로 한 번 시험. 터지면 크게, 일관성은 −" },
  in_engage: { n: "댓글함 30초 판", track: "일", ap: 1, hp: 1, desc: "한 달에 한 번. 답글·고정·숨김·차단으로 팬심과 논란을 다스려요" },
  in_deal: { n: "협찬 콘텐츠 만들기", track: "일", ap: 1, hp: 3, desc: "협찬함의 제안 하나. 컨셉과 맞으면 단가↑, 안 맞으면 일관성↓" },
  in_gong: { n: "공동구매 열기", track: "일", ap: 2, hp: 5, mental: -3, desc: "팔로워 1만부터. 한 번에 큰돈, 대신 문의 폭탄" },
  // 에어씨앤씨
  ab_search: { n: "에어씨앤씨 매물 보기", track: "일", ap: 1, hp: 3, pick: "abregion", desc: "지역을 골라 숙소 매물 3개를 봐요" },
  ab_clean: { n: "청소·턴오버", track: "일", ap: 1, hp: 5, stat: { body: 0.2 }, desc: "체크아웃 뒤 청소·침구. 못 채우면 별점 하락" },
  ab_photo: { n: "사진·소개 다듬기", track: "일", ap: 1, hp: 2, desc: "사진·설명 품질 +(감각)" },
  ab_host: { n: "게스트 응대", track: "일", ap: 1, hp: 2, stat: { charm: 0.2 }, desc: "외국어로 응대. 성공하면 별점 +, 외국어 +" },
  ab_reply: { n: "후기 답글 달기", track: "일", ap: 1, hp: 1, desc: "밀린 후기에 답글. 별점 +(슈퍼호스트 조건)" },
  ab_ask: { n: "명의 부탁하기", track: "사람", ap: 1, hp: 2, mental: -2, desc: "동료·친구에게 숙소 명의를 빌려 달라고 설득해요(호감·말빨)" },
  ab_cohost: { n: "코호스트 고용/해지", track: "일", ap: 0, hp: 0, desc: "매출 20%를 주고 청소·응대를 맡겨요(투잡 칸 +1)" },
  // 무인카페
  uc_search: { n: "무인카페 자리 보기", track: "일", ap: 1, hp: 3, pick: "ucarea", desc: "상권을 골라 매물 3개를 봐요" },
  uc_check: { n: "점검·재고·청소", track: "일", ap: 1, hp: 3, stat: { body: 0.1 }, desc: "원두·컵 채우고 청소. 고장 난 머신도 손봐요" },
  uc_promo: { n: "동네 홍보", track: "일", ap: 1, hp: 2, desc: "아파트 단톡방·맘카페 쿠폰. 입소문 +" },
  uc_agent: { n: "관리 대행 계약/해지", track: "일", ap: 0, hp: 0, desc: "매장당 월 40만에 청소·재고를 맡겨요(투잡 칸 +1)" },
  // 온잡(전업)으로 판 키우기
  bg_prcon: { n: "파티룸 창업 컨설팅", track: "일", ap: 2, hp: 6, desc: "예비 사장님 입지·손익을 봐 줘요. 건당 수백만(명성 35·지점 3곳)" },
  bg_brand: { n: "공간 브랜드 가맹 사업", track: "일", ap: 3, hp: 8, desc: "내 파티룸을 브랜드로. 가맹비·로열티(전업·지점 5곳·명성 65)" },
  bg_vip: { n: "VIP 이직 패키지 출시", track: "일", ap: 2, hp: 5, desc: "임원·경력직 1:1 고액 상품(Lv4·명성 40)" },
  bg_ai: { n: "AI 자소서 플랫폼 개발", track: "일", ap: 2, hp: 8, mental: -2, desc: "개발비 2,000만. 대박 확률 10~20%, 아니면 소소하게 굴러가요(전업·Lv4·명성 45)" },
  // 대학원
  grad_apply: { n: "대학원 알아보기", track: "능력치", ap: 1, hp: 2, pick: "grad", desc: "야간 MBA·상담심리 대학원. 다니면 전체 메뉴에 대학원 칸이 생겨요" },
  grad_class: { n: "대학원 수업·과제", track: "능력치", ap: 1, hp: 4, mental: -1, desc: "능력치 +, 동기 인연" },
};

export const BEAUTY = [
  { k: "hair", n: "헤어샵", cash: -7, charm: 2.0, desc: "커트·펌으로 인상을 바꾼다" },
  { k: "style", n: "스타일링 상담", cash: -17, charm: 3.0, desc: "코디로 센스를 끌어올린다" },
  { k: "skin", n: "피부과", cash: -43, charm: 4.0, desc: "화사한 피부" },
  { k: "clothes", n: "옷 쇼핑", cash: -86, charm: 5.0, desc: "옷이 날개" },
  { k: "manner", n: "스피치·매너 레슨", cash: -36, charm: 2.5, talk: 2.5, desc: "말투와 매너(말빨도 오름)" },
];

// ───────── 회사 ─────────
// stat: 입사하면 조금 바뀌는 역량(크지 않게). top: 오를 수 있는 마지막 직급 번호. kind: 직무 목록 갈래.
export const COMPANY_TYPES = {
  big: { n: "대기업", pay: 330, eye: 1.3, trust: 0.3, layoff: 0.6, top: 5, kind: "gen", stat: { career: 3, talk: 1 }, names: ["사성전자", "현재자동차", "엘쥐전자", "스크하이닉스", "CZ제일제당", "롯대쇼핑", "포스크", "한와솔루션"] },
  fin: { n: "금융권", pay: 360, eye: 1.5, trust: 0.28, layoff: 0.7, top: 5, kind: "fin", stat: { num: 3, career: 1 }, names: ["KP궁민은행", "신안은행", "하니은행", "우리들은행", "사성증권", "모레투자증권", "사성생명", "현재카드"] },
  mid: { n: "중견기업", pay: 285, eye: 1.0, trust: 0.18, layoff: 1.0, top: 5, kind: "gen", stat: { career: 2, num: 1 }, names: ["코웨어", "오뚝이", "한셈", "농신", "동완F&B", "대승"] },
  startup: { n: "스타트업", pay: 265, eye: 0.6, trust: 0.1, layoff: 1.8, top: 6, kind: "gen", fast: true, stat: { mkt: 2, sense: 2 }, names: ["토쓰", "홍당무", "유신사", "야놀까", "마켓걸리", "직빵"] },
  public: { n: "공기업", pay: 270, eye: 1.8, trust: 0.24, layoff: 0.1, top: 4, kind: "pub", stat: { write: 2, num: 1 }, names: ["대한전력공사", "대한철도공사", "대한토지주택공사", "국민튼튼보험공단", "인청국제공항공사"] },
};
// 임원(상무·전무)은 1년 계약. 평가가 나쁘면 퇴임한다. years: 그 직급에서 보통 걸리는 햇수(스타트업은 더 빠름)
export const RANKS = [
  // need: 매달 꼭 해야 하는 회사 일(성과 내기 1, 자진 야근 2로 친다). 못 채우면 성과·팀장 호감·멘탈이 깎인다
  { n: "사원", pay: 1.0, ap: 0, years: 3, fast: 2, career: 0, need: 0 },
  { n: "대리", pay: 1.17, ap: 0, years: 4, fast: 3, career: 25, need: 1 },
  { n: "과장", pay: 1.36, ap: -1, years: 4, fast: 3, career: 45, need: 2 },
  { n: "차장", pay: 1.56, ap: -1, years: 4, fast: 3, career: 70, need: 2 },
  { n: "부장", pay: 1.8, ap: -2, years: 5, fast: 3, career: 100, need: 3 },
  { n: "상무", pay: 2.9, ap: -2, years: 4, fast: 3, career: 135, exec: true, need: 3 },
  { n: "전무", pay: 3.7, ap: -2, years: 99, fast: 99, career: 165, exec: true, need: 3 },
];
// 연말 평가: B가 가장 많이 나온다. raise: 연봉 인상률, bonus: 성과급(월급의 몇 배), pt: 승진 점수
export const GRADES = {
  S: { raise: 0.05, bonus: 2.0, pt: 3 },
  A: { raise: 0.035, bonus: 1.0, pt: 2 },
  B: { raise: 0.02, bonus: 0.4, pt: 1 },
  C: { raise: 0.005, bonus: 0, pt: 0 },
  D: { raise: 0, bonus: 0, pt: -1 },
};
// 전공. g: 문과·이공·예체. stat: 시작 보너스. rom: 연애 호감 배율(화면에는 안 보임)
export const MAJORS = {
  biz: { n: "경영·경제", g: "문과", stat: { num: 7, career: 5, mkt: 3, lang: 2 }, rom: 1.0 },
  hum: { n: "인문·어문", g: "문과", stat: { write: 7, talk: 4, lang: 10 }, rom: 1.05 },
  social: { n: "사회과학", g: "문과", stat: { talk: 6, career: 4, write: 4 }, rom: 1.0 },
  law: { n: "법·행정", g: "문과", stat: { write: 7, num: 4, career: 4 }, rom: 0.97 },
  media: { n: "미디어·광고", g: "문과", stat: { mkt: 7, sense: 4, write: 3 }, rom: 1.08 },
  edu: { n: "교육", g: "문과", stat: { talk: 7, write: 5, charm: 2 }, rom: 1.06 },
  design: { n: "디자인·미술", g: "예체", stat: { sense: 10, hands: 3, mkt: 2 }, rom: 1.06 },
  sport: { n: "체육", g: "예체", stat: { body: 10, charm: 4, talk: 2 }, rom: 1.12 },
  mech: { n: "기계·자동차", g: "이공", stat: { hands: 8, num: 6 }, rom: 0.9 },
  elec: { n: "전기·전자·반도체", g: "이공", stat: { num: 8, hands: 5, career: 2 }, rom: 0.9 },
  chem: { n: "화학·화공·신소재", g: "이공", stat: { num: 7, hands: 4, career: 3 }, rom: 0.93 },
  sw: { n: "컴퓨터·소프트웨어", g: "이공", stat: { num: 8, sense: 3, write: 2 }, rom: 0.9 },
  ind: { n: "산업공학", g: "이공", stat: { num: 7, career: 4, talk: 2 }, rom: 0.95 },
  arch: { n: "건축·토목", g: "이공", stat: { sense: 5, hands: 6, num: 3 }, rom: 0.95 },
  bio: { n: "생명·바이오·약학", g: "이공", stat: { num: 6, write: 4, career: 3 }, rom: 1.0 },
  nurse: { n: "간호·보건", g: "이공", stat: { body: 5, talk: 5, hands: 3 }, rom: 1.12 },
  math: { n: "수학·통계", g: "이공", stat: { num: 11, write: 2 }, rom: 0.92 },
};
// 직무. co: 어떤 회사에서 고르는지. ok: 잘 맞는 전공(가점), bad: 안 맞는 전공 갈래(감점)
export const JOBS = {
  plan: { n: "경영기획", co: ["gen", "fin", "pub"], stat: { num: 5, career: 4, write: 2 }, ok: ["biz", "social", "ind", "law", "math"], bad: [] },
  acct: { n: "재무·회계", co: ["gen", "fin", "pub"], stat: { num: 7, career: 3 }, ok: ["biz", "math", "law"], bad: ["예체"] },
  hr: { n: "인사", co: ["gen", "fin", "pub"], stat: { talk: 4, career: 3, write: 2 }, ok: ["hum", "social", "law", "edu", "biz"], bad: [] },
  buy: { n: "구매", co: ["gen"], stat: { num: 4, talk: 3, lang: 5 }, ok: ["biz", "ind", "mech", "chem", "hum"], bad: [] },
  ovs: { n: "해외영업", co: ["gen"], stat: { lang: 9, talk: 4, charm: 2 }, ok: ["hum", "biz", "social"], bad: [] },
  sales: { n: "영업", co: ["gen"], stat: { talk: 6, charm: 3 }, ok: ["biz", "social", "hum", "sport"], bad: [] },
  mkt: { n: "마케팅", co: ["gen"], stat: { mkt: 7, sense: 3 }, ok: ["biz", "media", "design", "social"], bad: [] },
  md: { n: "MD", co: ["gen"], stat: { sense: 4, num: 3, mkt: 3 }, ok: ["biz", "design", "media"], bad: [] },
  pm: { n: "서비스기획(PM)", co: ["gen", "fin"], stat: { write: 3, sense: 3, career: 3, num: 2 }, ok: ["sw", "ind", "biz", "media", "design"], bad: [] },
  dev: { n: "개발", co: ["gen", "fin"], stat: { num: 7, hands: 3 }, ok: ["sw", "math", "elec"], bad: ["문과", "예체"] },
  rnd: { n: "연구개발", co: ["gen"], stat: { num: 5, career: 4, hands: 2 }, ok: ["chem", "bio", "elec", "mech"], bad: ["문과", "예체"] },
  prod: { n: "생산·품질", co: ["gen"], stat: { hands: 5, num: 4 }, ok: ["mech", "chem", "ind", "elec"], bad: ["예체"] },
  dsgn: { n: "디자인", co: ["gen"], stat: { sense: 8, hands: 2 }, ok: ["design", "media", "arch"], bad: ["이공"] },
  prj: { n: "홍보", co: ["gen", "fin", "pub"], stat: { write: 5, talk: 4 }, ok: ["media", "hum", "social"], bad: [] },
  legal: { n: "법무", co: ["gen", "fin"], stat: { write: 5, num: 3, career: 3 }, ok: ["law"], bad: ["예체"] },
  admin: { n: "일반행정", co: ["pub"], stat: { write: 5, career: 3 }, ok: ["law", "social", "hum", "edu"], bad: [] },
  tech: { n: "기술직", co: ["pub"], stat: { hands: 5, num: 4 }, ok: ["mech", "elec", "arch", "chem"], bad: ["문과", "예체"] },
  rm: { n: "기업금융(RM)", co: ["fin"], stat: { talk: 5, num: 5 }, ok: ["biz", "math", "social"], bad: [] },
  pb: { n: "리테일·PB", co: ["fin"], stat: { talk: 6, charm: 4 }, ok: ["biz", "social", "hum"], bad: [] },
  risk: { n: "리스크관리", co: ["fin"], stat: { num: 8, career: 2 }, ok: ["math", "biz", "ind"], bad: ["예체"] },
  am: { n: "자산운용", co: ["fin"], stat: { num: 7, career: 3 }, ok: ["biz", "math"], bad: ["예체"] },
  ib: { n: "IB", co: ["fin"], stat: { num: 6, write: 3, career: 3 }, ok: ["biz", "law", "math"], bad: ["예체"] },
  ins: { n: "보험 계리·언더라이팅", co: ["fin"], stat: { num: 9 }, ok: ["math", "biz"], bad: ["예체", "문과"] },
  dfin: { n: "디지털금융", co: ["fin"], stat: { num: 4, sense: 3, mkt: 3 }, ok: ["sw", "ind", "media", "math"], bad: [] },
};
// 아이템: 사면 능력치가 바로 오른다(2~20). 하나씩만.
export const ITEMS = {
  perfume: { n: "시그니처 향수", cash: 25, stat: { charm: 4 } },
  phone: { n: "전화영어 6개월", cash: 90, stat: { lang: 8 } },
  abroad: { n: "단기 어학연수(1개월)", cash: 600, stat: { lang: 16, sense: 3 } },
  books: { n: "직무 바이블 세트", cash: 30, stat: { career: 6 } },
  tools: { n: "공구 세트", cash: 40, stat: { hands: 8 } },
  watch: { n: "스마트워치", cash: 50, stat: { body: 5 } },
  adtool: { n: "마케팅 툴 1년 구독", cash: 60, stat: { mkt: 8 } },
  cert: { n: "재무·데이터 자격증 과정", cash: 80, stat: { num: 12, career: 4 } },
  suit: { n: "맞춤 정장", cash: 120, stat: { charm: 8 } },
  tablet: { n: "태블릿·펜", cash: 120, stat: { sense: 5, write: 3 } },
  homegym: { n: "홈트 세트", cash: 150, stat: { body: 10 } },
  speech: { n: "스피치 학원 3개월", cash: 200, stat: { talk: 10 } },
  camera: { n: "미러리스 카메라", cash: 250, stat: { sense: 10 } },
  laptop: { n: "고성능 노트북", cash: 300, stat: { write: 6, num: 4 } },
  car: { n: "중고차", cash: 1500, stat: { charm: 6, body: 2 } },
};

// ───────── 성향 카드 (30장 중 4장이 나오고 2장을 고른다) ─────────
// 보이는 것: pro·con(역량). 숨은 특성 hid 4개: d(회사 co·파티룸 pr·컨설팅 cs·다른 투잡 id)에서 그 일을 시작하면 공개된다.
// hint: 숨은 특성을 짐작할 수 있는 단어. 숨은 특성 효과는 공개 전에도 적용된다.
const H = (d, t, m = {}) => ({ d, t, m });
// 특전 카드: 나이(2·3년 차)로 받거나, 인생 중 큰 일을 해내면 받는다. 숨은 특성 없음. 다음 인생에 한 장 가져갈 수 있다(나이 특전 제외).
const P = (id, n, line, pro, m, got, test) => ({ id, g: "특전", n, line, pro, con: "", m, got, test, hint: [] });
export const PERKS = [
  P("yr2", "회사 요령", "2년 차쯤 되면 보이는 것들", "회사 눈치 −15%, 성과 +10%", { eyeMult: 0.85, perfMult: 1.1 }, "2년 차 특전", null),
  P("yr3", "사내 인맥", "3년 동안 쌓은 점심 약속", "승진 확률 +, 헤드헌터 제안 +30%, 회사 동료 2명과 아는 사이로 시작", { promoBonus: 0.05, headhunt: 1.3 }, "3년 차 특전", null),
  P("p_room", "공간의 감", "빈 방을 보면 손님이 보인다", "파티룸 별점 하락 −20%, 인테리어 비용 −10%", { ratingGuard: 0.8, interiorCost: 0.9 }, "파티룸 3곳 운영 + 한 달 이익 1,500만", (s) => s.pr.rooms.filter((r) => r.status === "open").length >= 3 && (s.pr.profitHist?.at(-1) || 0) >= 1500 * (s.pi || 1)),
  P("p_pen", "합격 제조기", "합격 200명, 환불은 한 번도 없었다", "합격률 +3%p, 소개 +20%", { passBonus: 0.03, referMult: 1.2 }, "컨설팅 합격 200명 + 환불 0건", (s) => !!s.cs.open && (s.cs.passes || 0) >= 200 && !(s.cs.refundAll > 0)),
  P("p_algo", "알고리즘의 총애", "팔로워 25만, 피드가 나를 안다", "팔로워 증가 +12%, 릴스 떡상 확률 +30%", { instaMult: 1.12, instaViral: 1.3 }, "인별 팔로워 25만", (s) => s.ins.f >= 250000),
  P("p_host", "세계의 손님", "슈퍼호스트 배지를 5년 지켰다", "숙소 별점 +, 외국어 응대 +20%", { abStar: 0.05, abLang: 1.2 }, "슈퍼호스트 60달 + 외국어 100", (s) => (s.ab.superM || 0) >= 60 && (s.st.lang || 0) >= 100),
  P("p_auto", "자동화 사장", "기계가 일하는 동안 나는 잔다", "먹튀·정산 손실 −40%, 단골 +10%", { ucTheft: 0.6, ucRepeat: 1.1 }, "무인카페 3곳, 또는 2곳 모두 별점 4.5", (s) => s.uc.stores.length >= 3 || (s.uc.stores.length >= 2 && s.uc.stores.every((st) => st.months >= 12 && (st.rating || 0) >= 4.5))),
  P("p_family", "든든한 편", "집에 가면 내 편이 있다", "매달 멘탈 +1, 스태미너 회복 +2", { monthMental: 1, hpRec: 2 }, "결혼", (s) => !!s.fam.spouse),
  P("p_promo", "결재 라인", "이제 내 도장도 한 칸 차지한다", "승진 확률 +, 성과 +10%, 헤드헌터 제안 +20%", { promoBonus: 0.05, perfMult: 1.1, headhunt: 1.2 }, "차장 이상 승진", (s) => s.co.rank >= 3),
  P("p_phoenix", "다시 일어선 사람", "한 번 꺼져 본 사람은 불 조절을 안다", "스태미너 회복 +3, 매달 멘탈 +1", { hpRec: 3, monthMental: 1 }, "번아웃을 이겨 냈다", (s) => s.burnouts >= 1 && !s.burnLeft && s.mental >= 60),
  P("p_seed", "종잣돈", "마흔 전에 순자산 7억", "생활비 −7%", { livingMult: 0.93 }, "40세 전 현금·투자·집 7억", (s) => s.age < 40 && s.cash + (s.invest || 0) + (s.house?.dep || 0) + (s.house?.value || 0) >= 70000 * Math.min(1.5, s.pi || 1)),
  P("p_people", "마당발", "아는 사람이 25명", "호감 오름 +15%, 연애 확률 +10%", { affMult: 1.15, romanceMult: 1.1 }, "인연 25명", (s) => Object.keys(s.rel).length >= 25),
  P("p_hobby", "취미 부자", "주말이 모자라다", "매달 멘탈 +1", { monthMental: 1 }, "취미 두 개를 1년", (s) => s.hb.joined.length >= 2 && s.t >= 12),
  P("p_body", "운동 습관", "서른다섯이 넘어도 계단이 무섭지 않다", "행동 스태미너 소모 −12%", { hpCostMult: 0.88 }, "35세 이후 체력 110", (s) => s.age >= 35 && s.st.body >= 110),
];
// 큰 순간: 화보(CG) 연출로 보여 주는 장면. key = img/cg/<key>_<n>.webp 그림 묶음
const M = (key, title, test, lines, who) => ({ key, title, test, lines, who });
const lover = (s) => Object.keys(s.rel).find((id) => s.rel[id].lover);
export const MOMENTS = [
  M("lover", "연인이 됐다", (s) => !!lover(s), ["돌아오는 길, 손이 먼저 닿았다. 둘 다 아무 말도 안 했다.", "\"우리 오늘부터 1일이야?\" 대답 대신 웃음이 났다.", "핸드폰 배경화면이 바뀌었다."], lover),
  M("pr_multi", "파티룸 3호점", (s) => s.pr.rooms.filter((r) => r.status === "open").length >= 3, ["지도 앱에 내 지점이 세 개. 불이 켜진 창문을 하나씩 세어 봤다.", "토요일 밤, 세 곳 모두 만실 알림이 울렸다."]),
  M("cs_first", "첫 합격 소식", (s) => s.cs.passes >= 1, ["새벽 1시 메시지 알림. \"저 붙었어요!!!\" 잠이 확 깼다.", "고객이 보낸 합격 화면 캡처. 내 일처럼 손이 떨렸다."]),
  M("cs_name", "이름이 알려졌다", (s) => s.cs.lv >= 4, ["강연 요청 메일이 왔다. 무대 조명 아래 서는 날이 오다니.", "모르는 사람이 내 닉네임을 불렀다. \"혹시… 그 컨설턴트님?\""]),
  M("ab_first", "첫 외국인 손님", (s) => s.ab.units.some((u) => u.stays > 0), ["캐리어 바퀴 소리. \"Annyeong-haseyo!\" 서툰 인사에 웃음이 터졌다.", "손글씨 환영 카드를 침대 위에 올려 두었다."]),
  M("uc_open", "무인카페 개업", (s) => s.uc.stores.length >= 1, ["밤 11시, 혼자 가게 불을 켰다. 첫 잔은 내가 사 마셨다.", "키오스크에서 첫 주문 알림이 울렸다. 아무도 없는데 괜히 인사했다."]),
  M("in_deal", "첫 협찬", (s) => s.ins.dealsDone >= 1, ["택배 상자에 손편지가 들어 있었다. \"함께해 주셔서 감사합니다.\"", "언박싱 영상을 찍다가 세 번이나 다시 찍었다."]),
  M("house", "내 집 마련", (s) => s.house.type === "own", ["열쇠를 받았다. 빈 거실에 첫 짐 상자를 내려놓았다.", "등기부등본에 내 이름. 몇 번이고 다시 봤다."]),
  M("quit", "회사를 나왔다", (s) => s.co.quit, ["마지막 출근. 사원증을 반납하고 엘리베이터 문이 닫혔다.", "빈 책상 위 상자 하나. 생각보다 짐이 적었다."]),
  M("fire", "파이어", (s) => !!s.fireAt, ["평일 낮 바닷가. 알람 없는 아침이 이런 거였구나.", "월요일 오전 10시, 카페 창가. 출근하는 사람들을 보며 커피를 마셨다."]),
];
// 투잡 엔딩(11-21): 마일스톤처럼 처음 조건을 채운 달에 화보가 뜨고, 판이 끝나면 에필로그·엔딩 도감에 오른다(engine/reg.js ENDS).
// end: true · job: 투잡 키 · kind: good|bad · epi: 에필로그 한 줄. 새 투잡 플러그인은 milestones 에 같은 칸을 단다(README 1-8).
const ME = (job, key, title, kind, test, lines, epi) => ({ key, title, test, lines, end: true, job, kind, epi });
const prAvg = (s, n) => { const h = s.pr.profitHist.slice(-n); return h.length >= n ? h.reduce((a, b) => a + b, 0) / n : -1e9; };
MOMENTS.push(
  ME("pr", "pr_end_auto", "매니저가 여는 문", "good", (s) => s.pr.sys.manager && s.pr.rooms.filter((r) => r.status === "open").length >= 4 && prAvg(s, 12) >= 600 * (s.pi || 1),
    ["토요일 밤 청소 알림이 더는 나한테 오지 않는다. 매니저 월급 180만을 주고도 한 달 600만이 남았다.", "지점 네 곳 비밀번호를 매니저에게 넘겼다. 그날 처음으로 주말에 휴대폰을 껐다."],
    "파티룸 지점들은 매니저가 문을 연다. 나는 한 달에 한 번 정산표만 본다."),
  ME("pr", "pr_end_exit", "통째로 넘긴 날", "good", (s) => !!s.pr.exit,
    ["지점을 한 번에 넘겼다. 계약서 금액란의 0을 세 번 셌다.", "마지막 열쇠를 건네고 나왔다. 셀프 인테리어 때 찧은 엄지손톱 자국은 아직 남아 있다."],
    "파티룸은 통째로 넘겼다. 그 돈이 다음 인생의 보증금이 됐다."),
  ME("pr", "pr_end_red", "1년 내내 적자", "bad", (s) => s.pr.rooms.length >= 2 && s.pr.profitHist.length >= 12 && s.pr.profitHist.slice(-12).every((x) => x < 0),
    ["열두 달 연속 적자. 엑셀 칸이 전부 빨간색이다. 월세 자동이체 문자가 제일 무섭다.", "평일 낮 예약 0건. 월세 200만은 비가 와도 눈이 와도 나간다."],
    "파티룸 월세는 손님이 없어도 나갔다. 그 1년이 가장 비싼 수업료였다."),
  ME("cs", "cs_end_mentor", "합격자 1,500명의 선생님", "good", (s) => s.cs.passes >= 1500,
    ["합격 캡처가 1,500장을 넘었다. 사진첩 폴더 이름을 '합격'으로 바꿨다.", "새벽 1시 \"저 붙었어요!!!\" 이 알림 하나로 10년을 버텼다."],
    "합격자 1,500명이 넘었다. 명절마다 \"선생님 덕분에\" 문자가 온다."),
  ME("cs", "cs_end_night", "퇴근 후 첨삭 15년", "good", (s) => !(s.co.quit || s.co.fired) && s.hist.filter((h) => h.cs > 0).length >= 180, /* 11-23: 240달은 한 판(240달)에서 사실상 못 봄 → 180달 */
    ["퇴근 후 첨삭만 180달. 회사 사람들은 아직도 내 닉네임을 모른다.", "월급날과 첨삭 정산일이 같은 주에 온다. 둘 다 끊긴 적이 없다."],
    "회사도 첨삭도 15년을 버텼다. 두 개의 명함은 끝까지 따로 들고 다녔다."),
  ME("cs", "cs_end_refund", "환불 문자의 밤", "bad", (s) => (s.cs.refundAll || 0) >= 25 && (s.cs.refundAll || 0) >= (s.cs.clients || 0) * 0.15, /* v4.28 비율 조건 */
    ["환불 25건. \"기대했는데 아쉬워요\" 한 줄이 스물다섯 번 잠을 깨웠다.", "가격만 올리고 실력은 그대로였다. 크멍 별점이 4점 밑으로 내려갔다."],
    "환불 문자에 잠을 깬 밤이 많았다. 가격보다 실력을 먼저 올렸어야 했다."),
  ME("insta", "in_end_100k", "팔로워 30만", "good", (s) => (s.ins.peak || s.ins.f || 0) >= 300000,
    ["팔로워 30만. 지하철에서 누가 내 릴스를 보고 있었다. 모른 척했다.", "숫자 옆에 'K'가 붙었다. 협찬 DM은 이제 하루에 열 통이다."],
    "인별 팔로워 30만. 계정은 아직 살아 있고, 가끔 옛날 릴스가 다시 돈다."),
  ME("insta", "in_end_gong", "공구 사장님", "good", (s) => (s.ins.gongN || 0) >= 40, /* 11-23: 72회 → 40회 */
    ["공동구매 마흔 번째. 10년 동안 석 달에 한 번. 택배사 기사님이 내 이름을 외웠다.", "배송 문의 DM 400개를 새벽 2시에 다 읽었다. 거실은 이제 창고다."],
    "공동구매를 마흔 번 넘게 열었다. 거실은 끝내 창고에서 돌아오지 못했다."),
  ME("insta", "in_end_ghost", "알고리즘이 떠난 계정", "bad", (s) => (s.ins.peak || 0) >= 5000 && s.ins.f <= s.ins.peak * 0.5,
    ["팔로워가 최고의 절반이 됐다. 같은 시간에 올려도 좋아요가 3분의 1이다.", "알고리즘은 이유를 말해 주지 않았다. 나는 매일 같은 시간에 올렸다."],
    "알고리즘은 떠났지만 기록은 남았다. 그 계정을 지우지는 않았다."),
  ME("airbnb", "ab_end_super", "10년 내리 슈퍼호스트", "good", (s) => (s.ab.superM || 0) >= 120,
    ["슈퍼호스트 배지를 120달 지켰다. 침대 위 수건 백조는 이제 눈 감고도 접는다.", "\"Best host in Seoul.\" 후기 첫 줄을 액자에 넣었다."],
    "슈퍼호스트 배지는 끝까지 지켰다. 세계 곳곳에서 아직도 엽서가 온다."),
  ME("airbnb", "ab_end_guest", "손님 5,000팀", "good", (s) => s.ab.units.reduce((a, u) => a + (u.stays || 0), 0) >= 5000,
    ["체크인 5,000번째 팀. 방명록이 스무 권째다.", "열여섯 개 나라 말로 '와이파이 비밀번호'를 말할 수 있게 됐다."],
    "에어씨앤씨 손님은 5,000팀을 넘었다. 방명록 스무 권은 아직 책장에 있다."),
  ME("airbnb", "ab_end_raid", "단속반이 두 번 왔다", "bad", (s) => (s.ab.raidN || 0) >= 2,
    ["구청 단속반이 또 왔다. 이웃은 이번에도 떡을 받지 않았다.", "과태료 고지서가 두 장. 등록을 미룬 값은 생각보다 비쌌다."],
    "단속반이 두 번 다녀갔다. 그 뒤로는 서류부터 챙겼다."),
  ME("ucafe", "uc_end_auto", "기계가 출근하는 가게들", "good", (s) => s.uc.agent && s.uc.stores.length >= 3 && s.uc.hist.length >= 6 && s.uc.hist.slice(-6).every((x) => x > 0),
    ["세 매장 모두 관리 대행. 새벽 6시 원두 채우기는 이제 남의 일이다.", "키오스크 정산 알림이 하루에 세 번 울린다. 나는 그 시간에 회사에 있다."],
    "무인카페 기계들은 지금도 출근한다. 원두 값 오르는 뉴스만 챙겨 본다."),
  ME("ucafe", "uc_end_sold", "흑자 매장 양도", "good", (s) => (s.uc.soldN || 0) >= 1,
    ["흑자 매장을 넘겼다. 권리금이 처음 넣은 인테리어비를 넘었다.", "새 사장님에게 그라인더 청소법을 알려 주고 나왔다. 손톱에 낀 커피 가루가 마지막이었다."],
    "무인카페 하나는 흑자일 때 넘겼다. 들어갈 때보다 나올 때가 더 어렵다는 걸 알았다."),
  ME("ucafe", "uc_end_red", "저가 커피 사이의 섬", "bad", (s) => s.uc.stores.some((st) => st.hist.length >= 6 && st.hist.slice(-6).every((x) => x < 0)),
    ["옆 건물에 저가 프랜차이즈가 또 생겼다. 여섯 달째 적자, 기계 렌탈비만 꼬박꼬박 나간다.", "새벽에 와서 청소하고, 아무도 안 온 가게 불을 끄고 나왔다."],
    "적자 매장 하나가 오래 발목을 잡았다. 상권은 내 편이 아니었다."),
);
// 특전 카드 중 화보로 보여 줄 것
// 값은 화보 키(MOMENTS·마일스톤 키, 또는 ui.js CINE_BG 의 wedding·seed 처럼 마일스톤이 없는 인생 장면 키)
export const PERK_CINE = { p_room: "pr_multi", p_pen: "cs_name", p_algo: "ins_100k", p_host: "abs_lv5", p_auto: "ucs_lv5", p_family: "wedding", p_seed: "seed" };
// 이미 있는 장면 제목 → 화보
export const TITLE_CINE = { "아이가 태어났다": "baby", "이별": "breakup", "이혼": "breakup", "승진": "promo", "임원이 됐다": "promo", "학위 수여식": "grad", "작별": "parents_bye", "과로로 쓰러졌다": "burnout", "저성과자 해고": "fired", "겸업으로 해고": "fired", "권고사직": "fired" };
export const CARD = (id) => TRAITS.find((x) => x.id === id) || PERKS.find((x) => x.id === id);
// 나이(연차)별: 룰렛 능력치 보너스, 그리고 겉으로 안 보이는 젊음(성장 속도)
export const AGE_YR = { 1: { roll: 0, youth: 1.15 }, 2: { roll: 3, youth: 1.07, perk: "yr2" }, 3: { roll: 6, youth: 1, perk: "yr3" } };
export const TRAITS = [
  { id: "insider", g: "사람", n: "인싸", line: "모르는 사람과 5분이면 친구", pro: "말빨 +8, 매력 +4, 호감 오름 +20%", con: "혼자 하는 공부·글쓰기 때 멘탈 −1", m: { stat: { talk: 8, charm: 4 }, affMult: 1.2, soloMental: -1 }, hint: ["회식", "단골", "채팅방", "팔로워"],
    hid: [H("co", "회식·점심에서 팀장 호감 +40%", { bossMult: 1.4 }), H("pr", "단골이 별점을 지켜 준다(하락 −40%)", { ratingGuard: 0.6 }), H("cs", "오픈채팅방 효과 +30%", { kakaoMult: 1.3 }), H("insta", "인별 팔로워 증가 +20%", { instaMult: 1.2 })] },
  { id: "homebody", g: "생활", n: "집이 최고", line: "약속이 취소될 때 제일 기쁘다", pro: "쉬기 효과 1.5배, 집에서 공부 +50%", con: "사람 만나는 행동마다 멘탈 −2", m: { restMult: 1.5, homeStudy: 1.5, socialMental: -2 }, hint: ["재택", "블로그", "현장", "연재"],
    hid: [H("co", "회사 스트레스를 덜 받는다(매달 멘탈 +1)", { workMental: 1 }), H("cs", "블로그 효과 +20%", { blogMult: 1.2 }), H("pr", "현장에 잘 안 가서 사고 피해 +20%", { damageMult: 1.2 }), H("webnovel", "웹소설 연재 스태미너 소모 −1", { wnHp: -1 })] },
  { id: "meticulous", g: "일", n: "꼼꼼이", line: "가계부를 엑셀로 쓴다", pro: "숫자 +8", con: "감각 성장 −20%", m: { stat: { num: 8 }, growMult: { sense: 0.8 } }, hint: ["평가", "파손", "첨삭", "정산"],
    hid: [H("co", "연말 평가가 한 칸 위로 나올 확률 +", { gradeBonus: 0.25 }), H("pr", "파티룸 파손·사고 피해 −30%", { damageMult: 0.7 }), H("cs", "첨삭 실수가 없다: 합격률 +3%p", { passBonus: 0.03 }), H("ucafe", "무인카페 먹튀·정산 손실 −50%", { ucTheft: 0.5 })] },
  { id: "goldhand", g: "손", n: "금손", line: "다있소 재료로 백화점 느낌", pro: "손재주 +10", con: "말빨 성장 −20%", m: { stat: { hands: 10 }, growMult: { talk: 0.8 } }, hint: ["행사", "셀프 공사", "카드뉴스", "기계 수리"],
    hid: [H("co", "회사 행사 준비에 차출된다: 성과 +10%", { perfMult: 1.1 }), H("pr", "셀프 인테리어 별점 +0.1", { selfStar: 0.1 }), H("cs", "카드뉴스를 직접 만든다: 인별 +15%", { snsMult: 1.15 }), H("ucafe", "기계를 손수 고친다: 무인카페 일 스태미너 소모 −1", { ucHp: -1 })] },
  { id: "writer", g: "글", n: "글쟁이", line: "까톡도 퇴고한다", pro: "글쓰기 +10", con: "마케팅 −3으로 시작", m: { stat: { write: 10, mkt: -3 } }, hint: ["보고서", "블로그", "리포트", "연재"],
    hid: [H("co", "보고서로 성과 +10%", { perfMult: 1.1 }), H("cs", "블로그 효과 +30%", { blogMult: 1.3 }), H("tutoring", "수업 리포트가 읽힌다: 화상과외 소개 +10%", { tuRefer: 1.1 }), H("webnovel", "웹소설 작품 크기 +10%", { wnCap: 1.1 })] },
  { id: "spotlight", g: "사람", n: "관종", line: "인생은 콘텐츠다", pro: "매력 +8", con: "혼자 있는 시간엔 멘탈 −1", m: { stat: { charm: 8 }, soloMental: -1 }, hint: ["눈치", "영상", "무대", "피드"],
    hid: [H("co", "회사 눈치 1.5배", { eyeMult: 1.5 }), H("cs", "인별·너튜브 +30%", { snsMult: 1.3 }), H("cs", "특강 효과 +20%", { lectureMult: 1.2 }), H("insta", "인별 릴스 대박 확률 2배", { instaViral: 2 })] },
  { id: "earlybird", g: "생활", n: "새벽형 인간", line: "5시 기상, 미라클 모닝", pro: "매달 행동력 +1", con: "스태미너 자연 회복 −3", m: { apBonus: 1, hpRec: -3 }, hint: ["출근", "새벽 청소", "집필", "오픈"],
    hid: [H("co", "일찍 출근: 팀장 호감 +20%", { bossMult: 1.2 }), H("pr", "새벽 점검: 사고 피해 −15%", { damageMult: 0.85 }), H("cs", "새벽 집필: VOD·전자책 +30%", { vodMult: 1.3 }), H("ucafe", "무인카페 일 스태미너 소모 −1", { ucHp: -1 })] },
  { id: "frugal", g: "돈", n: "짠돌이", line: "커피는 탕비실에서", pro: "생활비 −12%", con: "데이트·선물 효과 −20%", m: { livingMult: 0.88, giftMult: 0.8 }, hint: ["협상", "고정비", "광고비", "창업비"],
    hid: [H("co", "연봉 협상에 약하다: 재취업 확률 −10%", { rejobMult: 0.9 }), H("pr", "파티룸 고정비 −7%", { prCost: 0.93 }), H("cs", "광고를 아끼다 광고 효율 −20%", { adsMult: 0.8 }), H("chicken", "알바비를 아끼다 알바 이탈 +15%", { chQuit: 1.15 })] },
  { id: "iron", g: "몸", n: "체력왕", line: "주 6일 헬스", pro: "체력 +12, 행동할 때 스태미너 소모 −25%", con: "글쓰기 성장 −15%", m: { stat: { body: 12 }, hpCostMult: 0.75, growMult: { write: 0.85 } }, hint: ["야근", "셀프 공사", "강의", "운동 인증"],
    hid: [H("co", "야근 시즌에도 성과가 덜 떨어진다", { perfDecay: 0.7 }), H("pr", "셀프 인테리어 별점 +0.05", { selfStar: 0.05 }), H("cs", "강의·특강 스태미너 −2", { lectureHp: -2 }), H("insta", "운동 계정이면 팔로워 +30%", { instaFit: 1.3 })] },
  { id: "companyman", g: "일", n: "회사형 인간", line: "팀장님이 먼저 찾는 사람", pro: "커리어 +6", con: "투잡 행동 스태미너 소모 +1", m: { stat: { career: 6 }, sideHp: 1 }, hint: ["승진", "평가", "부업", "과외"],
    hid: [H("co", "회사 성과 +50%", { perfMult: 1.5 }), H("co", "승진 심사에 유리", { promoBonus: 0.15 }), H("cs", "부업에 시큰둥: 신규 문의 −10%", { leadMult: 0.9 }), H("tutoring", "화상과외 학부모 신뢰 +: 시범수업 전환 +5%p", { tuTrust: 0.05 })] },
  { id: "familyfirst", g: "생활", n: "가정적", line: "저녁 7시엔 집에 있다", pro: "가족 행복이 덜 깎인다(−40%)", con: "가족과 시간을 안 보내면 멘탈 −3", m: { familyDecay: 0.6, needFamily: 3 }, hint: ["회식", "동네", "학부모", "가족 손님"],
    hid: [H("co", "회식을 빠진다: 팀장 호감 −20%", { bossMult: 0.8 }), H("pr", "동네 단골이 별점을 지켜 준다(하락 −20%)", { ratingGuard: 0.8 }), H("cs", "학부모 소개 +30%", { referMult: 1.3 }), H("airbnb", "가족 손님 후기: 숙소 별점 +0.03", { abStar: 0.03 })] },
  { id: "romantic", g: "사람", n: "금사빠", line: "눈 마주치면 이미 결혼식장", pro: "매력 +5, 연애 호감 +30%", con: "연인이 있으면 투잡 행동 때 멘탈 −1", m: { stat: { charm: 5 }, romanceMult: 1.3, loverSideMental: -1 }, hint: ["사내 소문", "브라이덜", "공감", "연애운"],
    hid: [H("co", "사내 연애 소문: 회사 눈치 +10%", { eyeMult: 1.1 }), H("pr", "감성 인테리어: 별점 +0.05", { star: 0.05 }), H("cs", "공감 상담: 전환율 +3%p", { convBonus: 0.03 }), H("tarot", "연애운 상담에 진심이다: 타로 문의 +10%", { trLead: 1.1 })] },
  { id: "nightconsult", g: "조로의 길", n: "낮엔 기획, 밤엔 컨설턴트", line: "13년 동안 회사를 다니며 투잡을 했다", pro: "숫자 +5, 글쓰기 +5, 커리어 +6", con: "투잡 행동 스태미너 소모 +1", m: { stat: { num: 5, write: 5, career: 6 }, sideHp: 1 }, hint: ["눈치", "자소서", "성장", "과외"],
    hid: [H("co", "회사 눈치 −30%", { eyeMult: 0.7 }), H("cs", "합격률 +5%p", { passBonus: 0.05 }), H("cs", "첨삭할 때마다 능력치가 더 오른다", { workGrow: 0.4 }), H("tutoring", "합격 노하우: 화상과외 소개 +15%", { tuRefer: 1.15 })] },
  { id: "transfer", g: "조로의 길", n: "환승 이직러", line: "떨어질 데 없이 갈아탄다", pro: "커리어 +5, 말빨 +3", con: "숫자 성장 −10%", m: { stat: { career: 5, talk: 3 }, growMult: { num: 0.9 } }, hint: ["헤드헌터", "면접", "승진", "경력 고객"],
    hid: [H("co", "헤드헌터 연락이 자주 온다", { headhunt: 1 }), H("co", "재취업 성공률 2배", { rejobMult: 2 }), H("co", "승진이 조금 느리다", { promoBonus: -0.08 }), H("cs", "Lv4부터 컨설팅 단가 +10%", { csLv4Price: 1.1 })] },
  { id: "noprequit", g: "조로의 길", n: "선퇴사 금지론자", line: "마음이 뜬 순간의 행동은 다 보인다", pro: "커리어 +4, 글쓰기 +2", con: "쉬기 효과 −10%", m: { stat: { career: 4, write: 2 }, restMult: 0.9 }, hint: ["버티기", "성과", "사직서", "소개"],
    hid: [H("co", "회사에 다니는 동안 매달 멘탈 +2", { workMental: 2 }), H("co", "성과가 절반만 떨어진다", { perfDecay: 0.5 }), H("co", "환승 조건 전에는 퇴사 버튼이 잠긴다", { quitLock: true }), H("cs", "합격 고객 소개 +20%", { referMult: 1.2 })] },
  { id: "kakaoowner", g: "조로의 길", n: "오픈채팅방 방장", line: "방 다섯 개, 인원 5천 명", pro: "말빨 +5", con: "알림 지옥: 매달 멘탈 −1", m: { stat: { talk: 5 }, monthMental: -1 }, hint: ["채팅방", "운영", "소문", "첫 팔로워"],
    hid: [H("cs", "오픈채팅 300명으로 시작", { kakaoStart: 300 }), H("cs", "오픈채팅방 효과 +50%", { kakaoMult: 1.5 }), H("co", "회사에 소문이 난다: 눈치 +15%", { eyeMult: 1.15 }), H("insta", "방 사람들이 먼저 팔로우한다: 인별 팔로워 증가 +10%", { instaMult: 1.1 })] },
  { id: "sheepherd", g: "조로의 길", n: "양치기", line: "많이 써 본 사람이 결국 붙는다", pro: "글쓰기 +6, 글쓰기 성장 +20%", con: "감각 성장 −15%", m: { stat: { write: 6 }, growMult: { write: 1.2, sense: 0.85 } }, hint: ["반복", "합격", "지침", "매일 5천 자"],
    hid: [H("cs", "첨삭할 때마다 능력치가 더 오른다", { workGrow: 0.6 }), H("cs", "합격률 +5%p", { passBonus: 0.05 }), H("cs", "같은 일을 반복하면 멘탈 −1", { csWorkMental: -1 }), H("webnovel", "매일 쓰는 근육: 웹소설 연재 피로 −10%", { wnTired: 0.9 })] },
  { id: "infowar", g: "조로의 길", n: "정보 싸움꾼", line: "취업은 정보 싸움, 메타인지 싸움", pro: "숫자 +4, 시대 사건 충격 −30%", con: "쉬기 효과 −20%", m: { stat: { num: 4 }, eraMult: 0.7, restMult: 0.8 }, hint: ["앱 조사", "평가", "상담", "후기 통계"],
    hid: [H("pr", "앱 조사가 숨은 정보 2개를 공개", { appReveal: 2 }), H("co", "평가 등급이 위로 나올 확률 +", { gradeBonus: 0.15 }), H("cs", "상담 전환율 +2%p", { convBonus: 0.02 }), H("airbnb", "후기 데이터를 읽는다: 숙소 별점 +0.03", { abStar: 0.03 })] },
  { id: "lecturer", g: "조로의 길", n: "명강사", line: "강의 50회, 마이크만 잡으면 사람이 바뀐다", pro: "말빨 +10", con: "손재주 성장 −20%", m: { stat: { talk: 10 }, growMult: { hands: 0.8 } }, hint: ["발표", "특강", "목소리", "재등록"],
    hid: [H("cs", "특강·강의 효과 +40%", { lectureMult: 1.4 }), H("cs", "강의·특강 스태미너 소모 +3", { lectureHp: 3 }), H("co", "발표를 잘한다: 팀장 호감 +20%", { bossMult: 1.2 }), H("tutoring", "수업이 재밌다: 화상과외 학생 만족 +15%", { tuSat: 1.15 })] },
  { id: "author", g: "글", n: "책 쓰는 직장인", line: "저서 3권, 마감은 늘 새벽 3시", pro: "글쓰기 +8", con: "스태미너 자연 회복 −2", m: { stat: { write: 8 }, hpRec: -2 }, hint: ["마감", "전자책", "보고서", "완결"],
    hid: [H("cs", "VOD·전자책 제작 2배 빠름", { vodMult: 2 }), H("cs", "마감 스트레스: 제작할 때 멘탈 −2", { vodMental: -2 }), H("co", "보고서로 성과 +5%", { perfMult: 1.05 }), H("webnovel", "완결 작가: 웹소설 결제 +10%", { wnPay: 1.1 })] },
  { id: "cfo", g: "조로의 길", n: "재무통", line: "기획재무 출신, 손익계산서가 먼저 보인다", pro: "숫자 +10, 종합소득세 −20%", con: "감각 −3으로 시작", m: { stat: { num: 10, sense: -3 }, taxMult: 0.8 }, hint: ["고정비", "평가", "단가", "손익분기"],
    hid: [H("pr", "파티룸 고정비 −5%", { prCost: 0.95 }), H("co", "평가 등급이 위로 나올 확률 +", { gradeBonus: 0.2 }), H("cs", "숫자만 보다 신규 문의 −5%", { leadMult: 0.95 }), H("chicken", "원가표를 본다: 튀김 품질 +0.02", { chFry: 0.02 })] },
  { id: "aesthete", g: "감각", n: "감각파", line: "카페 인테리어를 보면 견적이 나온다", pro: "감각 +10", con: "숫자 성장 −20%", m: { stat: { sense: 10 }, growMult: { num: 0.8 } }, hint: ["견적", "별점", "엑셀", "피드"],
    hid: [H("pr", "인테리어 비용 −10%", { interiorCost: 0.9 }), H("pr", "별점 +0.1", { star: 0.1 }), H("co", "엑셀이 약하다: 회사 성과 −5%", { perfMult: 0.95 }), H("insta", "피드 감성: 참여율 +30%", { instaSave: 1.3 })] },
  { id: "thumbnail", g: "감각", n: "썸네일 장인", line: "제목보다 썸네일이 먼저다", pro: "감각 +5, 마케팅 +4", con: "글쓰기 성장 −10%", m: { stat: { sense: 5, mkt: 4 }, growMult: { write: 0.9 } }, hint: ["썸네일", "상세페이지", "완벽주의", "표지"],
    hid: [H("cs", "인별·너튜브 효과 +25%", { snsMult: 1.25 }), H("cs", "크멍 상세페이지 +25%", { kmongMult: 1.25 }), H("cs", "완벽주의: 콘텐츠 만들 때 스태미너 +1", { contentHp: 1 }), H("webnovel", "표지와 제목이 클릭을 부른다: 웹소설 독자 소통 효과 +15%", { wnBuzz: 1.15 })] },
  { id: "brandfreak", g: "감각", n: "브랜딩 집착", line: "로고부터 만들고 시작한다", pro: "감각 +4, 마케팅 +5", con: "씀씀이 +5%", m: { stat: { sense: 4, mkt: 5 }, livingMult: 1.05 }, hint: ["2호점", "단가", "초기 비용", "컵 홀더"],
    hid: [H("pr", "지점 2개부터 브랜드 후광 2배", { haloMult: 2 }), H("cs", "Lv4부터 컨설팅 단가 +15%", { csLv4Price: 1.15 }), H("pr", "초기 비용 +15%", { openCost: 1.15 }), H("ucafe", "컵 홀더까지 로고를 맞춘다: 무인카페 단골 판매 +5%", { ucRepeat: 1.05 })] },
  { id: "performance", g: "마케팅", n: "퍼포먼스 마케터", line: "ROAS 300% 아니면 끈다", pro: "마케팅 +10", con: "매력 성장 −15%", m: { stat: { mkt: 10 }, growMult: { charm: 0.85 } }, hint: ["광고", "수수료", "성과", "검색 광고"],
    hid: [H("cs", "광고 효율 1.6배", { adsMult: 1.6 }), H("pr", "플랫폼 수수료 인상 피해 2배", { feeShock: 2 }), H("co", "숫자로 보고한다: 성과 +10%", { perfMult: 1.1 }), H("tarot", "검색 광고를 돌린다: 타로 손님 +5%", { trMult: 1.05 })] },
  { id: "viral", g: "마케팅", n: "바이럴 메이커", line: "밈은 내가 만든다", pro: "마케팅 +6, 매력 +3", con: "숫자 성장 −15%", m: { stat: { mkt: 6, charm: 3 }, growMult: { num: 0.85 } }, hint: ["대박", "구설수", "후광", "릴스"],
    hid: [H("cs", "대박 확률 2배(인별·너튜브·블로그)", { viralMult: 2 }), H("co", "구설수: 회사 눈치 1.3배", { eyeMult: 1.3 }), H("pr", "입소문 후광 1.3배", { haloMult: 1.3 }), H("insta", "릴스 대박 확률 2배", { instaViral: 2 })] },
  { id: "copywriter", g: "글", n: "카피라이터", line: "한 줄로 지갑을 연다", pro: "글쓰기 +5, 마케팅 +5", con: "손재주 성장 −15%", m: { stat: { write: 5, mkt: 5 }, growMult: { hands: 0.85 } }, hint: ["전환율", "보고서", "블로그", "제안서"],
    hid: [H("cs", "상담 전환율 +4%p", { convBonus: 0.04 }), H("co", "제목 잘 뽑는 보고서: 성과 +5%", { perfMult: 1.05 }), H("cs", "블로그 효과 +10%", { blogMult: 1.1 }), H("vibe", "제안서 첫 줄이 다르다: 바이브코딩 단가 +5%", { vbPrice: 1.05 })] },
  { id: "crm", g: "사람", n: "단골 관리왕", line: "손님 이름과 생일을 다 외운다", pro: "말빨 +4, 매력 +4", con: "마케팅 성장 −15%", m: { stat: { talk: 4, charm: 4 }, growMult: { mkt: 0.85 } }, hint: ["별점", "소개", "신규", "쿠폰"],
    hid: [H("pr", "별점이 잘 안 떨어진다(−50%)", { ratingGuard: 0.5 }), H("cs", "합격 고객이 소개를 2배로 데려온다", { referMult: 2 }), H("cs", "신규 문의 −10%", { leadMult: 0.9 }), H("ucafe", "단골 쿠폰: 무인카페 판매 +8%", { ucRepeat: 1.08 })] },
  { id: "analyst", g: "일", n: "데이터 덕후", line: "엑셀 피벗이 취미", pro: "숫자 +8, 커리어 +2", con: "매력 성장 −15%", m: { stat: { num: 8, career: 2 }, growMult: { charm: 0.85 } }, hint: ["평가", "상권", "상세페이지", "코딩"],
    hid: [H("co", "평가 등급이 위로 나올 확률 +", { gradeBonus: 0.2 }), H("pr", "앱 조사가 숨은 정보 2개를 공개", { appReveal: 2 }), H("cs", "크멍 상세페이지 +10%", { kmongMult: 1.1 }), H("vibe", "바이브코딩 완성 속도 +30%", { vbSpeed: 1.3 })] },
  { id: "traveler", g: "몸", n: "역마살", line: "주말마다 KTS를 탄다", pro: "감각 +5, 체력 +5", con: "한곳에 오래 있으면 지친다(매달 멘탈 −1)", m: { stat: { sense: 5, body: 5 }, monthMental: -1 }, hint: ["지방 발령", "현장", "숙소", "여행 피드"],
    hid: [H("co", "지방 발령도 괜찮다(피해 절반)", { relocResist: 1 }), H("pr", "자리를 자주 비워 사고 피해 +10%", { damageMult: 1.1 }), H("airbnb", "여행자 마음을 안다: 숙소 별점 +0.03", { abStar: 0.03 }), H("insta", "여행지 사진이 쌓인다: 인별 팔로워 증가 +10%", { instaMult: 1.1 })] },
];
export const DOMAIN_N = { co: "회사" }; // 투잡은 SIDEJOBS 이름을 쓴다

// ───────── 파티룸 ─────────
// 11-25 월세 규칙(현장 기준): 파티룸 매물은 2~5층과 지하만 본다(1층은 월세만 비싸고 안 맞는다). 평당 5만~8만 원이 보통이고, 32평까지는 월세 80만~160만.
// rate: 그 상권의 평당 월세 폭(만원). 층·역 거리·화장실로 조금 움직인 뒤 PR_RENT.per 안으로 자른다(지방만 더 싸다). 계산은 engine/pr.js rentFor
// 예전(11-24까지): 2층 기준 평당 10~19만에 1층 2배·지하 0.65배 → 20평 월세가 200만~600만까지 나왔다
export const PR_FLOOR_RENT = (L) => (L.floor === -1 ? 0.88 : L.floor === 2 ? 1.05 : L.floor === 3 ? 1 : L.elevator ? 0.97 : 0.9);
// per: 보통 평당 월세 · cap: capSize 평까지 월세 상한 · min: minSize 평부터 월세 하한 · badP: 규칙 밖 비싼 매물이 섞일 확률 · bad: 그 매물의 평당 월세
export const PR_RENT = { per: [5, 8], cap: 160, capSize: 32, min: 80, minSize: 15, badP: 0.15, bad: [8.6, 11] };
// 평수와 인원: 15~20평은 15명 아래, 30평은 40명, 50~60평은 80명. 20평을 넘는 방은 예약이 '작은 모임'과 '대형 단체'로 나뉜다(계산은 engine/pr.js sizeMix)
// pf: 대형 단체(방을 꽉 채우는 손님) 한 건 값 배율(15명 방 = 1) · small: 가장 큰 방에 온 작은 모임이 내는 값(15명 방 시세의 배)
// big: 예약 가운데 대형 단체 비율 [평달, 성수기(1·7·8·11월), 12월] · occ: 가장 큰 방의 예약 건수 배율 [평달, 성수기, 12월](방 크기에 비례해 1에서 이 값까지)
export const PR_SIZE = {
  cap: (z) => (z <= 20 ? Math.round(z * 0.75) : z < 30 ? Math.round(15 + (z - 20) * 2.5) : z < 50 ? 40 + (z - 30) * 2 : 80),
  pf: (cap) => (cap <= 40 ? Math.max(0.85, Math.pow(cap / 15, 0.55)) : Math.pow(40 / 15, 0.55) * cap / 40),
  small: 1.05, big: [0.15, 0.3, 0.7], occ: [0.85, 0.92, 1.08],
};
export const DISTRICTS = {
  univ: { n: "대학가", wk: 0.55, we: 1.0, rate: [5.5, 7.5], rent: [120, 180], key: [300, 900], dep: [1000, 2000], comp: [3, 7], noise: 0.8, price: 16, park: 0.2, base: 0.25, size: [15, 25], fit: { bridal: 1.0, party: 1.35, study: 1.2, work: 0.6, kids: 0.4, home: 0.9, game: 1.3, lecture: 1.1, mega: 1.3, edu: 0.5 }, tip: "주말·밤 수요 최고, 소음 내성 높음, 경쟁 많음" },
  office: { n: "오피스가", wk: 1.0, we: 0.45, rate: [6, 8], rent: [150, 230], key: [400, 1100], dep: [1500, 3000], comp: [2, 5], noise: 0.6, price: 18, park: 0.6, base: 0.2, size: [18, 30], fit: { bridal: 0.8, party: 0.6, study: 1.0, work: 1.45, kids: 0.4, home: 0.6, game: 0.8, lecture: 1.3, mega: 0.8, edu: 1.5 }, tip: "평일 저녁 워크숍·회식, 주말은 텅 빔" },
  home: { n: "주택가·신도시", wk: 0.3, we: 0.85, rate: [5, 6.5], rent: [70, 110], key: [300, 600], dep: [500, 1500], comp: [1, 3], noise: 0.3, price: 14, park: 1.0, base: 0.1, size: [20, 35], fit: { bridal: 1.0, party: 0.5, study: 0.8, work: 0.5, kids: 1.45, home: 1.3, game: 0.7, lecture: 0.7, mega: 0.6, edu: 0.5 }, tip: "키즈·돌잔치, 주차 필수, 소음 민원 위험" },
  hot: { n: "성숲길 핫플", wk: 0.6, we: 1.0, rate: [6.5, 8], rent: [180, 260], key: [600, 1200], dep: [2000, 3000], comp: [4, 8], noise: 0.7, price: 21, park: 0.3, base: 0.15, size: [15, 25], fit: { bridal: 1.45, party: 1.0, study: 0.6, work: 0.9, kids: 0.5, home: 1.2, game: 0.8, lecture: 0.8, mega: 0.9, edu: 0.6 }, tip: "사진발·브라이덜 성지, 월세·권리금 최고" },
  under: { n: "역세권 지하", wk: 0.7, we: 0.9, rate: [5.8, 7.4], rent: [90, 140], key: [300, 800], dep: [1000, 2000], comp: [3, 6], noise: 0.95, price: 13, park: 0.3, base: 1.0, size: [40, 60], fit: { bridal: 0.7, party: 1.3, study: 0.9, work: 1.1, kids: 0.5, home: 0.6, game: 1.35, lecture: 0.9, mega: 1.2, edu: 0.9 }, tip: "넓고 싸고 시끄러워도 됨. 대신 사진이 어둡다" },
  local: { n: "지방 중소도시", wk: 0.35, we: 0.7, rate: [3.5, 5], rent: [45, 75], key: [300, 500], dep: [300, 1000], comp: [0, 2], noise: 0.6, price: 13, park: 1.0, base: 0.1, size: [25, 40], fit: { bridal: 1.0, party: 1.0, study: 0.6, work: 0.8, kids: 1.2, home: 1.0, game: 0.9, lecture: 0.8, mega: 1.1, edu: 0.9 }, tip: "싸고 경쟁 없음, 수요도 작음. 집에서 멀면 관리가 힘듦" },
};
// big: 예약 가운데 대형 단체 비율에 더하는 값(대형 전문 컨셉). we/wk: 주말·평일 수요 배율, sns: 손님이 인별·블로그에 올리는 정도, kit: 장비비(만원), seg: 주 고객, req: 매물 조건(안 맞으면 이유)
const upNeedsLift = (L, f) => (L.floor >= f && !L.elevator ? `${f}층 이상이면 엘리베이터가 있어야 해요` : null);
export const CONCEPTS = {
  bridal: { n: "브라이덜·생일", noisy: 0.3, elev: 0.15, park: 0.5, toilet: 0.15, ondol: 0.08, priceF: 1.1, need24: 0.3, we: 1, wk: 1, sns: 1.5, kit: 0, seg: ["브라이덜 샤워", "생일·기념일"] },
  party: { n: "엠티·파티", noisy: 1.0, elev: 0.1, park: 0.2, toilet: 0.06, ondol: 0.2, priceF: 1.0, need24: 1.0, we: 1, wk: 1, sns: 1.0, kit: 0, seg: ["대학생 MT", "생일 파티"] },
  home: { n: "홈파티(집처럼 편안)", noisy: 0.3, elev: 0.1, park: 0.4, toilet: 0.15, ondol: 0.25, priceF: 0.95, need24: 0.4, we: 1.1, wk: 0.85, sns: 1.2, kit: 0, seg: ["커플·친구 홈파티", "집들이 대신", "소규모 생일"], req: (L) => (L.floor === -1 ? "지하는 집 느낌이 안 나요" : L.size > 30 ? "30평 이하만 아늑해요" : null) },
  game: { n: "게임 파티룸", noisy: 0.7, elev: 0.1, park: 0.2, toilet: 0.06, ondol: 0.1, priceF: 1.0, need24: 0.9, we: 1, wk: 1.05, sns: 0.8, kit: 350, seg: ["대학생", "게임·보드게임 동호회", "직장인 번개"] },
  study: { n: "소모임·스터디", noisy: 0.1, elev: 0.05, park: 0.2, toilet: 0.05, ondol: 0.0, priceF: 0.8, need24: 0.1, we: 1, wk: 1, sns: 0.4, kit: 0, seas: 0.6, seg: ["스터디", "소모임"] },
  lecture: { n: "강의·세미나룸", noisy: 0.1, elev: 0.2, park: 0.4, toilet: 0.08, ondol: 0, priceF: 1.1, need24: 0.05, we: 0.8, wk: 1.3, sns: 0.5, kit: 250, seas: 0.5, seg: ["강사·코치", "스터디 모임", "소규모 설명회"], req: (L) => (L.size < 20 ? "20평 이상이어야 해요" : upNeedsLift(L, 3)) },
  work: { n: "워크숍·회식", noisy: 0.6, elev: 0.15, park: 0.8, toilet: 0.06, ondol: 0.0, priceF: 1.15, need24: 0.2, we: 1, wk: 1, sns: 0.5, kit: 0, seg: ["회사 워크숍", "회식 2차"] },
  edu: { n: "B2B 교육장", noisy: 0.15, elev: 0.3, park: 0.9, toilet: 0.1, ondol: 0, priceF: 1.1, need24: 0, we: 0.35, wk: 1.15, sns: 0.35, kit: 400, seas: 0.45, seg: ["기업 교육·워크숍", "공공기관 연수", "HRD 업체"], req: (L) => (L.size < 28 ? "28평 이상이어야 해요" : L.parking === 0 ? "주차가 있어야 해요" : upNeedsLift(L, 2)) },
  mega: { n: "초대형 파티룸", noisy: 1.0, elev: 0.2, park: 0.6, toilet: 0.2, ondol: 0.1, priceF: 1.15 /* 11-25: 2.0 → 1.15. 큰 방 값은 이제 평수(PR_SIZE.pf)가 정한다. 대신 대형 단체가 더 온다(big) */, big: 0.15, need24: 0.8, we: 0.95, wk: 0.35, sns: 1.1, kit: 500, dec: 1.5, off: 0.75, seg: ["대학 과 MT", "동호회 정모", "회사 송년회"], req: (L) => (L.size < 40 ? "40평 이상이어야 해요" : null) },
  kids: { n: "키즈·돌잔치", noisy: 0.5, elev: 0.25, park: 1.0, toilet: 0.15, ondol: 0.25, priceF: 1.05, need24: 0.0, we: 1, wk: 1, sns: 1.2, kit: 0, seg: ["돌잔치", "키즈 생일"], req: (L) => upNeedsLift(L, 2) },
};
export const INTERIORS = [
  { n: "알뜰", cost: 800, star: 4.2, priceF: 0.92 },
  { n: "보통", cost: 1500, star: 4.5, priceF: 1.0 },
  { n: "컨셉 맛집", cost: 2500, star: 4.8, priceF: 1.1 },
];
// 파티룸 계절: 12월 극성수기(주말 만석, 평일도 참), 1·7·8·11월 성수기, 나머지는 비수기(11-25 대표 기준. 전에는 1·2·7·8월). el: 가격에 민감한 정도(성수기엔 비싸도 온다)
export const PR_SEASON = [
// 11-21 비수기 상향(원래 3월 0.72/0.38 · 4월 0.78/0.42 · 5월 0.82/0.42 · 6월 0.72/0.38 · 9월 0.72/0.38 · 10월 0.82/0.42 · 11월 0.85/0.5)
  { we: 1.25, wk: 0.8, el: 0.8 }, { we: 0.88, wk: 0.5, el: 1.3 } /* 11-25 2월: 성수기 → 비수기 */, { we: 0.8, wk: 0.46, el: 1.3 }, { we: 0.85, wk: 0.48, el: 1.3 }, { we: 0.88, wk: 0.48, el: 1.3 }, { we: 0.8, wk: 0.46, el: 1.3 },
  { we: 1.2, wk: 0.8, el: 0.8 }, { we: 1.25, wk: 0.85, el: 0.8 }, { we: 0.8, wk: 0.46, el: 1.3 }, { we: 0.88, wk: 0.48, el: 1.3 }, { we: 1.2, wk: 0.8, el: 0.8 } /* 11-25 11월: 비수기 → 성수기(송년 모임) */, { we: 1.7, wk: 1.5, el: 0.3 } /* 11-25 12월 가격 탄력 0.5 → 0.3: 비싸도 온다 */,
];
export const PR_K = 0.62; // 11-25 월세를 내리면서 예약률을 낮췄다(0.82 → 0.62). 봇 2회차 파이어가 30% 안팎에 오게 맞춘 값(0.65면 38%, 0.72면 43%, 0.78이면 53%). 1회차는 pr.js PR_R1.occ 로 따로 맞춘다. 봇 손잡이: 환경변수 PRK
// v4.27 파티룸 업계 현실(과포화·가격 상한·계속 나가는 투자비). 계산은 engine/pr.js
// priceInfl: 시세가 해마다 오르는 비율(물가 2.5%보다 훨씬 낮음 = 가격은 못 올리는데 비용만 오른다)
// compIn: 새 파티룸이 생길 확률 추가(달마다) · compMax: 동네 경쟁 상한(기본 최대 + 이만큼)
// offCap: 비수기(3~6·9~11월) 예약률 상한(아무리 잘해도) · rentUp: 재계약(2년)마다 월세 인상(건물주 환영이면 rentUpGood)
// furn: 가구·소품 교체 주기(달) · furnCost: 처음 인테리어비 대비 교체비 · furnStar: 미루면 별점 목표 −
// scaleDmg: 지점 하나 늘 때마다 파손 확률 +비율 · nightCall: 2호점부터 지점 하나당 새벽 전화 확률(매니저 없으면)
export const PR_HARD = { priceInfl: 0.022, compIn: 0.004, compMax: 8, offCap: 0.68, peakCap: 0.85, decCap: 0.83 /* 11-25 성수기·12월 예약률 상한(전에는 0.95 하나). 12월 1.5배 가격과 함께 0.93 → 0.83(대표: 24평 12월 이익 600만 안팎) */, rentUp: 0.05, rentUpGood: 0.03, furn: [36, 48], furnCost: 0.45, furnStar: 0.35, scaleDmg: 0.3, nightCall: 0.1, effort: [0.5, 0.65] }; // effort: 예약 배율 = a + b × 관리 충족도(0~1). 예전 0.82 + 0.18
export const PR_RENT_CAP = 1.05; // 재계약 때 월세 인상 상한(상가임대차보호법 5%)
export const PR_PEAK = [1, 1.5, 1.75, 2.0]; // 성수기 가격 버튼(12월 배율. 1·7·8·11월은 절반만)
// 11-25 대표: 12월은 평일·주말 모두 값이 올라 평소의 1.5~2배를 받아도 돌아간다. mkt = 12월 동네 시세 배율(경쟁사도 올림), def = 안 고르면 내 방 12월 배율
export const PR_DEC = { mkt: 1.55, def: 1.5 };
export const PR_SLOTS = 46; // 한 달 예약 가능 블록(주말 24 + 평일 22)
export const PR_FEE = 0.033; // 결제 수수료
export const PR_LEVELS = [
  { lv: 1, n: "첫 예약 알림" }, { lv: 2, n: "별점 4.5 클럽" }, { lv: 3, n: "토요일 7시 만석" }, { lv: 4, n: "컨셉 2호점" }, { lv: 5, n: "공간 사업가" },
];
// 규모의 경제: 지점 수에 따라 단가가 내려간다
// 2호점부터 싸지고 4호점에서 가장 싸다. 대신 해마다 물가(INFL)가 올라 나중에 여는 지점은 월세·공사비가 비싸다
export const INFL = 0.025;
export const scaleF = (n) => (n >= 4 ? 0.72 : n === 3 ? 0.8 : n === 2 ? 0.9 : 1);
export const SCALE = {
  cleanCost: (n, cluster) => 2.5 * scaleF(n) * (cluster >= 2 ? 0.92 : 1), // 청소 계약 회당(물가 따로 곱함)
  supply: (n) => 0.5 * scaleF(n), // 비품 회당
  systems: {
    cleanContract: { n: "청소 업체 계약", cost: 0, monthly: 0, desc: "직접 청소 대신 회당 비용. 관리 행동력 −(예약/12)", need: 1 },
    smartlock: { n: "스마트락·CCTV", cost: 60, per: true, desc: "지점마다 60만. 관리 행동력 −0.5/곳", need: 1 },
    booking: { n: "통합 예약관리", cost: 30, monthly: 6, desc: "월 6만. 지점당 관리 행동력 −0.5, 이중예약 사고 없음", need: 2 },
    bulk: { n: "규모의 경제", cost: 0, monthly: 0, desc: "2호점부터 자동: 청소·비품·공과금·새 지점 공사비 단가가 내려가요(4호점에서 최대 −28%)", need: 2 },
    manager: { n: "운영 매니저 고용", cost: 0, monthly: 180, desc: "월 180만(물가 반영). 지점당 관리 행동력 0.25만 필요", need: 3 },
  },
};

// ───────── 취업컨설팅 ─────────
export const NICHES = {
  newgrad: { n: "신입 자소서", stat: "write", demand: 1.0, priceF: 1.0, req: { career: 20 }, season: [0.7, 0.9, 1.6, 1.5, 0.9, 0.6, 0.7, 1.0, 1.8, 1.5, 1.0, 0.6] },
  interview: { n: "면접 코칭", stat: "talk", demand: 0.8, priceF: 1.3, req: { career: 25 }, season: [0.6, 0.8, 1.0, 1.6, 1.4, 0.8, 0.6, 0.8, 1.0, 1.7, 1.5, 0.7] },
  career: { n: "경력 이직", stat: "career", demand: 0.6, priceF: 1.7, req: { career: 120, years: 5 } /* v4.28 히든 길: 커리어 120·회사 5년 */, season: [1.3, 1.2, 1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 1.0, 1.0, 1.0, 1.1] },
  public: { n: "공기업·NCS", stat: "write", demand: 0.7, priceF: 1.1, req: { career: 30 }, season: [0.8, 0.9, 1.4, 1.1, 0.8, 0.8, 1.1, 1.5, 1.6, 1.0, 0.8, 0.7] },
};
export const CS_PRODUCTS = {
  edit: { n: "자소서 첨삭", unit: 1, price: 7 },
  coach: { n: "면접 코칭", unit: 1, price: 12 },
  pkg: { n: "합격까지 패키지", unit: 4, price: 220, req: (cs) => cs.reviews >= 15 },
  vip: { n: "VIP 이직 패키지", unit: 6, price: 450, req: () => false },
};
export const CS_PRICE = { low: { n: "저가", mult: 0.7, conv: 0.12 }, mid: { n: "표준", mult: 1.0, conv: 0 }, high: { n: "프리미엄", mult: 1.5, conv: -0.12, req: 30 }, ultra: { n: "초고액", mult: 3.0, conv: -0.24, req: 80 } }; // v4.28 초고액: 실력 180·후기 80, 단가가 프리미엄의 2배로 뛴다
export const CS_LEVELS = [
  { lv: 1, n: "지인 자소서 봐주는 선배", c: "시작" },
  { lv: 2, n: "크멍 첨삭러", c: "후기 10개, 고객 20명" },
  { lv: 3, n: "면접 코치", c: "합격 5명, 블로그 글 30개" },
  { lv: 4, n: "1:1 종합 컨설턴트", c: "합격 30명, 월 매출 200만 3개월" },
  { lv: 5, n: "이름 있는 컨설팅 브랜드", c: "합격 100명, 너튜브 1만 또는 책" },
];

// ───────── 인생 ─────────
export const LIVING = { single: 130, married: 220, kid: [0, 120, 80, 110, 150] }; // 아이: 0~1세 120, 2~7세 80, 8~13세 110, 14~19세 150
export const HOUSING = {
  oneroom: { n: "원룸 월세", rent: 55, dep: 1000 },
  jeonse: { n: "전세", rent: 0, dep: 25000 },
  wolse2: { n: "투룸 월세", rent: 95, dep: 3000 },
  own: { n: "내 집", rent: 0 },
};
export const END_AGE = 50; // 11-23 남녀 모두 50세까지(27세 시작, 23년). 1회차는 34세 결산(engine/round.js)
export const endAge = (g) => 50;
export const FIRE_MULT = 25;
// 아이와 나라 지원(대표 결정 11-25): 아이는 최대 2명. 나라에서 주는 돈으로 아이 비용이 덜 든다. 특히 둘째부터는 다자녀 지원이 크다. 금액(만원)은 봇으로 재서 조정한다(봇은 환경변수 KIDP 로 덮어쓴다).
//   birth 출산 지원금(첫째·둘째, 한 번) · parent 부모 급여(0세·1세, 달마다) · child 아동 수당(childTo 세 전까지, 달마다) · multi 다자녀 수당(아이가 둘이고 막내가 multiTo 세 전까지, 달마다)
export const KID_AID = { max: 2, birth: [200, 1000], parent: [100, 50], child: 10, childTo: 8, multi: 40, multiTo: 18 };
export const FIRE_TARGET = { single: 300000, married: 400000 }; // 30억(집 12억 + 4%씩 꺼내 써도 안 줄어드는 돈 18억, 월 600만), 결혼하면 40억(집 15억 + 25억, 월 830만) (만원)

// ───────── 투잡 탐색 (21개, 지금은 파티룸·취업컨설팅만 플레이 가능) ─────────
// type: 투잡연구소 유형. fit: 궁합 계산에 쓰는 능력치. cap: 시작 자본(만원). hours: 주당 시간. inc: 문서에 적힌 수익.
// 11-24 방문 펫시팅은 새 인물과 그림이 준비될 때까지 숨긴다(true 로 바꾸면 열린다). 봇 시험: 환경변수 PSON=1
export const PETSIT_ON = typeof process !== "undefined" && !!process.env?.PSON;
export const SIDEJOBS = {
  pr: { n: "파티룸", type: "투자", ic: "door", play: true, fit: ["num", "sense", "hands"], cap: "3,000만~", hours: "주 6~10시간", inc: "월 순수익 약 200만", line: "입지가 전부. 청소·민원은 덤.", hint: "러닝크루·와인·보드게임 모임 뒤풀이에서" },
  cs: { n: "취업컨설팅", type: "전문성", ic: "pen", play: true, fit: ["career", "write", "talk"], cap: "거의 0", hours: "주 5~15시간", inc: "월 200~300만, 잘되면 연 1억+", line: "진입과 마케팅이 전부. 첫 후기는 지인에게서.", hint: "독서·글쓰기 모임, 멘토링 봉사에서" },
  insta: { n: "인별그램 인플루언서", type: "네트워크", ic: "cam", play: true, fit: ["sense", "mkt", "charm"], cap: "0", hours: "주 9시간", inc: "나노 → 마이크로 단계별", line: "팔로워보다 '저장'이 돈이 된다.", hint: "러닝·클라이밍·사진 모임에서" },
  tistory: { n: "티스터리 애드센서", type: "네트워크", ic: "pen", fit: ["write", "mkt", "num"], cap: "0", hours: "주 5시간", inc: "다수가 월 10만 미만", line: "검색 유입 싸움. 오래 버티는 사람이 이긴다.", hint: "글쓰기·코딩 모임에서" },
  realtyblog: { n: "부동산 블로그", type: "네트워크", ic: "bld", fit: ["num", "write", "mkt"], cap: "0", hours: "주 5시간", inc: "월 방문 1만이면 5~20만", line: "임장 다닐 핑계가 생긴다.", hint: "여행·집 구경을 좋아한다면" },
  ucafe: { n: "무인카페", type: "노동", ic: "glass", play: true, fit: ["hands", "num", "sense"], cap: "5,000만~", hours: "주 7시간", inc: "월매출 330~450만, 이익률 30~40%", line: "기계가 일하고 나는 청소한다.", hint: "홈카페·캠핑·플라워 클래스에서" },
  chicken: { n: "프랜차이즈 치킨", type: "투자", ic: "coin", fit: ["num", "talk", "hands"], cap: "1억~", hours: "주 20시간+", inc: "월 500~750만(영업이익 10~15%)", line: "알바가 그만두면 내가 튀긴다.", hint: "러닝·클라이밍 뒤풀이, 쿠킹 클래스에서" },
  coffee: { n: "저가 프랜차이즈 커피", type: "투자", ic: "glass", fit: ["num", "talk", "hands"], cap: "1억~", hours: "주 15시간+", inc: "월 450~600만, BEP 약 3년", line: "최저임금이 오르면 내 월급이 내린다.", hint: "쿠킹·홈카페 클래스에서" },
  popup: { n: "팝업스토어", type: "투자", ic: "spark", fit: ["sense", "mkt", "talk"], cap: "1,000만~", hours: "몰아서 주 30시간", inc: "월 순이익 수백만(편차 큼)", line: "2주짜리 승부. 줄이 서면 대박.", hint: "와인·플라워·쿠킹 모임에서" },
  shortstay: { n: "단기공간·주택임대", type: "투자", ic: "bld", fit: ["num", "hands", "sense"], cap: "1,000만~", hours: "주 5시간", inc: "지역별 건 단위", line: "한 달 살기 손님을 받는다.", hint: "캠핑·여행 모임에서" },
  airbnb: { n: "에어씨앤씨", type: "투자", ic: "bld", play: true, fit: ["lang", "sense", "hands"], cap: "2,000만~", hours: "주 6시간", inc: "월세 90만 기준 비용 구조", line: "후기 한 줄에 한 달이 갈린다.", hint: "캠핑·여행·사진 모임에서" },
  tutoring: { n: "화상과외", type: "전문성", ic: "video", fit: ["talk", "career", "write"], cap: "0", hours: "주 6시간", inc: "월 100~200만", line: "퇴근 후 화상 수업 두 타임.", hint: "멘토링 봉사, 독서·코딩 모임에서" },
  thesis: { n: "논문교정", type: "전문성", ic: "book", fit: ["write", "career", "num"], cap: "0", hours: "주 5시간", inc: "건당 단가", line: "마감 전날 밤에 일이 몰린다.", hint: "독서모임의 대학원생에게서" },
  press: { n: "보도자료 작가", type: "전문성", ic: "pen", fit: ["write", "mkt", "career"], cap: "0", hours: "주 4시간", inc: "월 30~80만(건당 2~15만)", line: "회사 홍보팀 경험이 무기.", hint: "글쓰기 모임에서" },
  webnovel: { n: "웹소설", type: "전문성", ic: "book", fit: ["write", "sense", "mkt"], cap: "0", hours: "주 10시간+", inc: "상위 20% 연 300~500만", line: "매일 5,000자. 연재는 체력이다.", hint: "독서·글쓰기·여행 모임에서" },
  tarot: { n: "타로", type: "전문성", ic: "spark", fit: ["talk", "sense", "charm"], cap: "10만", hours: "주 5시간", inc: "월 30~50만", line: "카드보다 상담이 본업.", hint: "타로 클래스, 와인·글쓰기 모임에서" },
  saju: { n: "사주", type: "전문성", ic: "book", fit: ["talk", "num", "write"], cap: "0", hours: "주 5시간", inc: "건당 단가", line: "공부할 게 생각보다 많다.", hint: "타로 원데이 클래스에서" },
  bouquet: { n: "웨딩 부케", type: "전문성", ic: "heart", fit: ["sense", "hands", "mkt"], cap: "100만", hours: "주말 몰아서", inc: "월 60~100만(월 3~5건)", line: "결혼 시즌에만 바쁘다.", hint: "플라워 클래스에서" },
  goods: { n: "굿즈", type: "전문성", ic: "spark", fit: ["sense", "mkt", "hands"], cap: "100만~", hours: "주 6시간", inc: "월 순이익 약 50만", line: "재고가 쌓이면 방이 좁아진다.", hint: "보드게임·클라이밍 모임에서" },
  aivideo: { n: "AI 영상 제작", type: "전문성", ic: "video", fit: ["sense", "num", "mkt"], cap: "구독료", hours: "주 6시간", inc: "월 50~150만", line: "툴이 매달 바뀐다.", hint: "사진·밴드·코딩 모임에서" },
  petsit: { n: "방문 펫시팅", type: "돌봄", ic: "heart", fit: ["sense", "write", "charm"], cap: "거의 0", hours: "약속한 날 저녁", inc: "부업 월 30~60만 · 회사로 키우면 달라짐", line: "노는 시간보다 약속을 지키는 시간.", hint: "고양이·강아지를 키우는 사람들, 동네 게시판에서" },
  club: { n: "취미 모임", type: "네트워크", ic: "users", fit: ["charm", "talk", "mkt"], cap: "거의 0", hours: "주 1회 저녁", inc: "회원 20명이면 월 60~120만", line: "회원이 많을수록 잘된다. 내가 빠지면 흩어진다.", hint: "모이는 취미를 오래 다니면" },
  vibe: { n: "바이브코딩", type: "전문성", ic: "wrench", fit: ["num", "write", "sense"], cap: "구독료", hours: "주 6시간", inc: "월 100만 안팎", line: "AI에게 말로 시켜 만든다.", hint: "코딩 스터디, 보드게임·밴드 모임에서" },
};
// 11-23 투잡 갈래(장면 조건 req "space"·"online"·"platform", 라이벌 사건 글 갈래가 같이 쓴다)
export const SJ_SPACE = ["pr", "airbnb", "ucafe", "chicken"]; // 가게·공간이 있는 투잡
export const SJ_PLATFORM = ["pr", "cs", "airbnb", "chicken", "tarot", "webnovel", "tutoring", "vibe"]; // 손님을 플랫폼에서 받아 수수료를 내는 투잡
export const SJ_SLOTS = 2; // 매니저(파티룸 매니저·에어씨앤씨 코호스트·컨설팅 공동 코치)를 두면 +1

// ───────── 취미 (여기서 인연과 투잡을 발견한다) ─────────
// like: 이 취미에 오는 인연의 취향, jobs: 발견할 수 있는 투잡, stat: 한 번 갈 때 오르는 능력치
export const HOBBIES = {
  run: { n: "한강 러닝크루", like: ["운동"], fee: 2, hp: 5, mental: 4, stat: { charm: 0.3 }, hpMax: 0.6, jobs: ["pr", "insta", "chicken"], desc: "토요일 아침 5km. 뒤풀이가 본게임" },
  climb: { n: "클라이밍", like: ["운동"], fee: 12, hp: 6, mental: 4, stat: { hands: 0.6, charm: 0.2 }, hpMax: 0.5, jobs: ["insta", "chicken"], desc: "벽에 매달리면 회사 생각이 안 난다" },
  book: { n: "독서모임", like: ["책"], fee: 3, hp: 3, mental: 3, stat: { write: 1.2 }, jobs: ["cs", "webnovel", "tutoring"], desc: "한 달에 한 권, 이야기는 열 권" },
  mentor: { n: "취준생 멘토링 봉사", like: ["책", "카페"], fee: 0, hp: 4, mental: 3, stat: { career: 1.0, talk: 0.6 }, jobs: ["cs", "tutoring"], desc: "후배 자소서를 봐 준다. 고맙다는 말이 남는다" },
  photo: { n: "사진 동호회", like: ["전시"], fee: 5, hp: 4, mental: 4, stat: { sense: 1.2 }, jobs: ["insta", "pr", "airbnb"], desc: "출사 나가서 남의 공간을 찍는다" },
  wine: { n: "와인 모임", like: ["와인"], fee: 15, hp: 4, mental: 5, stat: { charm: 0.8, talk: 0.4 }, jobs: ["pr", "tarot"], desc: "모임 장소는 늘 파티룸" },
  board: { n: "보드게임 모임", like: ["게임"], fee: 3, hp: 3, mental: 5, stat: { num: 1.0 }, jobs: ["pr", "vibe"], desc: "한 판만 더가 새벽 2시" },
  cook: { n: "홈카페·쿠킹 클래스", like: ["카페", "맛집"], fee: 10, hp: 3, mental: 4, stat: { hands: 1.0, sense: 0.4 }, jobs: ["ucafe", "chicken", "insta"], desc: "라테 아트 하트가 아직 감자" },
  camp: { n: "캠핑 동호회", like: ["캠핑"], fee: 8, hp: 6, mental: 6, stat: { hands: 0.8 }, jobs: ["airbnb", "ucafe"], desc: "장비는 늘고 통장은 준다" },
  band: { n: "직장인 밴드", like: ["음악"], fee: 6, hp: 5, mental: 6, stat: { sense: 0.8, charm: 0.5 }, jobs: ["pr", "vibe"], desc: "합주실 대관비가 제일 무섭다" },
  travel: { n: "여행 모임", like: ["여행"], fee: 10, hp: 5, mental: 6, stat: { sense: 0.5, mkt: 0.5, lang: 0.6 }, jobs: ["airbnb", "vibe", "webnovel"], desc: "숙소 고르는 눈이 생긴다" },
  tarot: { n: "타로 원데이 클래스", like: ["영화", "쇼핑"], fee: 8, hp: 3, mental: 3, stat: { talk: 1.0 }, jobs: ["tarot", "insta"], desc: "카드 78장, 사람 고민은 무한" },
  flower: { n: "플라워 클래스", like: ["쇼핑", "전시"], fee: 12, hp: 3, mental: 4, stat: { sense: 1.0 }, jobs: ["ucafe", "airbnb"], desc: "꽃값이 생각보다 비싸다" },
  soccer: { n: "축구 관람 모임", like: ["운동", "맛집"], fee: 6, hp: 3, mental: 6, stat: { talk: 0.6, charm: 0.4 }, jobs: ["chicken", "pr"], desc: "주말 밤 큰 화면 앞. 골이 들어가면 모르는 사람과 껴안는다" },
  code: { n: "코딩 스터디", like: ["게임"], fee: 3, hp: 4, mental: 1, stat: { num: 1.0, mkt: 0.3 }, jobs: ["vibe", "tutoring", "webnovel"], desc: "AI한테 시키는 법을 배운다" },
  write: { n: "글쓰기 모임", like: ["책", "영화"], fee: 3, hp: 3, mental: 2, stat: { write: 1.3 }, jobs: ["webnovel", "tutoring", "tarot", "cs"], desc: "합평은 아프고 글은 는다" },
  lingo: { n: "언어 교환 모임", like: ["여행", "카페"], fee: 4, hp: 3, mental: 4, stat: { lang: 1.3, talk: 0.3 }, jobs: ["airbnb", "tutoring"], desc: "영어 반, 손짓 반. 외국인 친구가 생긴다" }, // v4.28 외국어 길
};
export const HOBBY_LV = [
  { n: "새내기", need: 0 }, { n: "단골", need: 3 }, { n: "고인물", need: 8 }, { n: "운영진", need: 15 }, { n: "모임장", need: 25 },
];
export const HOBBY_MAX = 2; // 동시에 다닐 수 있는 취미 (모임장 하나면 +1)

// ───────── 화면 지도(허브) ─────────
export const HUB = [
  [{ k: "people", n: "관계도" }, { k: "map", n: "지도" }, { k: "home", n: "홈" }, { k: "sj", n: "투잡 탐색" }, { k: "me", n: "나" }],
  [{ k: "co", n: "회사" }, { k: "hobby", n: "취미" }, { k: "family", n: "가족" }, { k: "grad", n: "대학원" }],
  [{ k: "pr", n: "파티룸" }, { k: "cs", n: "취업컨설팅" }, { k: "insta", n: "인별그램" }, { k: "airbnb", n: "에어씨앤씨" }, { k: "ucafe", n: "무인카페" }, { k: "more", n: "다른 투잡" }],
];

// ───────── 인별그램 ─────────
export const INSTA_NICHES = {
  daily: { n: "일상", stat: ["charm", "sense"] },
  fit: { n: "운동", stat: ["body", "charm"], hobby: ["run", "climb"] },
  food: { n: "맛집·카페", stat: ["sense", "write"], hobby: ["cook", "wine"] },
  space: { n: "공간·인테리어", stat: ["sense", "hands"], job: "pr" },
  career: { n: "커리어·자기계발", stat: ["career", "write"], job: "cs" },
  travel: { n: "여행", stat: ["sense", "body"], hobby: ["travel", "camp"] },
};
export const INSTA_LV = [{ n: "새 계정", f: 0 }, { n: "나노", f: 1000 }, { n: "마이크로", f: 10000 }, { n: "매크로", f: 100000 }, { n: "메가", f: 500000 }];

// ───────── 대학원 ─────────
export const GRADS = {
  mba: { n: "야간 MBA", cash: 600, fee: 75, months: 30, need: 20, stat: { career: 1.6, num: 0.8 }, done: { career: 15, talk: 5 }, desc: "경영 지식과 동기 네트워크. 졸업하면 평가·헤드헌터 제안에 유리" },
  counsel: { n: "상담심리 대학원", cash: 400, fee: 60, months: 30, need: 20, stat: { talk: 1.4, write: 0.8 }, done: { talk: 12, career: 5 }, desc: "사람 마음을 듣는 법. 컨설팅과 궁합이 좋아요" },
};

// ───────── 투잡·취미 시너지(good)와 디스시너지(bad) ─────────
const act = (s, k) => !!s.sj?.active?.includes(k);
const openRoom = (s) => (s.pr?.rooms || []).some((r) => r.status === "open");
export const CLUB_HOBBY = { wine: "와인 파티", board: "보드게임 번개", band: "밴드 합주 파티", run: "러닝 뒤풀이", photo: "출사 사진전" };
export const SYNERGY = [
  { id: "club", kind: "good", n: "취미 모임 × 파티룸", need: "파티룸 + 와인·보드게임·밴드·러닝·사진 모임", desc: "내 파티룸에서 모임 행사(와인 파티 등)를 열 수 있어요. 매출·입소문·인연이 한 번에", test: (s) => act(s, "pr") && openRoom(s) && (s.hb?.joined || []).some((h) => CLUB_HOBBY[h]) },
  { id: "cs_room", kind: "good", n: "컨설팅 × 파티룸", need: "컨설팅 + 운영 중인 파티룸", desc: "특강·그룹 스터디를 내 파티룸에서: 효과 +30%, 강의·세미나룸·교육장이면 +60%", test: (s) => act(s, "pr") && act(s, "cs") && openRoom(s) },
  { id: "insta_pr", kind: "good", n: "인별 × 파티룸", need: "인별그램 + 파티룸", desc: "피드에 공간을 올리면 모든 지점 입소문 +", test: (s) => act(s, "insta") && act(s, "pr") },
  { id: "insta_cs", kind: "good", n: "인별 × 컨설팅", need: "인별그램 + 컨설팅", desc: "팔로워 1천 명당 컨설팅 문의 +0.3", test: (s) => act(s, "insta") && act(s, "cs") },
  { id: "insta_hobby", kind: "good", n: "취미가 콘텐츠", need: "인별그램 + 운동·여행·사진·요리·와인·캠핑 모임", desc: "게시물 효과 +20%", test: (s) => act(s, "insta") && (s.hb?.joined || []).some((h) => ["run", "climb", "photo", "travel", "cook", "wine", "camp"].includes(h)) },
  { id: "edu_career", kind: "good", n: "회사 경력 × 교육장", need: "강의·세미나룸 또는 B2B 교육장 + 커리어 60", desc: "회사 인맥으로 기업 교육을 따 와요: 그 지점 예약 +12%", test: (s) => (s.pr?.rooms || []).some((r) => ["edu", "lecture"].includes(r.concept)) && s.st.career >= 60 },
  { id: "grad_cs", kind: "good", n: "상담심리 × 컨설팅", need: "상담심리 대학원 + 컨설팅", desc: "상담 전환율 +4%p", test: (s) => s.grad?.k === "counsel" && act(s, "cs") },
  { id: "grad_net", kind: "good", n: "MBA 동기 네트워크", need: "야간 MBA", desc: "헤드헌터 제안 +50%, 교육장 예약 +8%", test: (s) => s.grad?.k === "mba" },
  { id: "pr_ab", kind: "good", n: "파티룸 × 에어씨앤씨", need: "파티룸 + 에어씨앤씨", desc: "청소 업체·비품을 같이 써요: 에어씨앤씨 단가에 파티룸 지점 수까지 합쳐 규모의 경제", test: (s) => act(s, "pr") && act(s, "airbnb") },
  { id: "travel_ab", kind: "good", n: "여행 모임 × 에어씨앤씨", need: "여행·캠핑 모임 + 에어씨앤씨", desc: "숙소 보는 눈: 별점 +0.05", test: (s) => act(s, "airbnb") && (s.hb?.joined || []).some((h) => ["travel", "camp"].includes(h)) },
  { id: "insta_ab", kind: "good", n: "인별 × 에어씨앤씨", need: "인별그램 + 에어씨앤씨", desc: "숙소 사진이 해외 여행자에게 퍼져요: 예약 +6%", test: (s) => act(s, "insta") && act(s, "airbnb") },
  { id: "ovs_ab", kind: "good", n: "해외영업 × 에어씨앤씨", need: "해외영업 직무 + 에어씨앤씨", desc: "외국인 응대가 일이었다: 외국인 예약 +10%", test: (s) => s.me?.job === "ovs" && act(s, "airbnb") },
  { id: "cook_uc", kind: "good", n: "홈카페 취미 × 무인카페", need: "홈카페·쿠킹 클래스 + 무인카페", desc: "원두 고르는 눈: 맛 +8%(판매량 +)", test: (s) => act(s, "ucafe") && (s.hb?.joined || []).includes("cook") },
  { id: "season", kind: "bad", n: "성수기 충돌", need: "파티룸 + 컨설팅", desc: "3·4·9·10월은 컨설팅 성수기와 파티룸 주말 관리가 겹쳐요: 멘탈 −2, 지점마다 관리 +0.5", test: (s) => act(s, "pr") && act(s, "cs") },
  { id: "two", kind: "bad", n: "투잡 두 개 + 회사", need: "투잡 2개 + 회사 다니는 중", desc: "회사 눈치가 덜 빠져요(매달 −2 → −1)", test: (s) => (s.sj?.active || []).length >= 2 && !(s.co.quit || s.co.fired) },
  { id: "face", kind: "bad", n: "얼굴 공개 계정", need: "인별 얼굴 공개 + 팔로워 3천", desc: "회사 눈치가 매달 쌓여요", test: (s) => act(s, "insta") && s.ins?.face && s.ins.f >= 3000 && !(s.co.quit || s.co.fired) },
  { id: "real_face", kind: "bad", n: "실명 컨설팅 + 얼굴 공개", need: "컨설팅 실명 + 인별 얼굴 공개", desc: "회사 눈치 ×1.2", test: (s) => s.cs?.nick === "real" && s.ins?.face },
];

// ───────── 나쁜 경제 사건 (판마다 무작위로 몇 번) ─────────
export const MACRO = [
  { id: "winter", n: "경기 한파", m: 12, w: 3, text: "소비가 얼어붙었다. 회식도 모임도 줄고, 회사는 연봉 동결을 발표했다. 1년 동안 파티룸 예약 −20%, 협찬 −40%, 구조조정 3배, 투자 수익도 나빠져요.", textQ: "소비가 얼어붙었다. 회식도 모임도 줄고, 뉴스는 연봉 동결과 구조조정 소식뿐이다. 1년 동안 파티룸 예약 −20%, 협찬 −40%, 투자 수익도 나빠져요.", news: "경기 한파 본격화… 자영업 매출 '뚝', 기업 채용 동결" },
  { id: "infl", n: "물가 급등", m: 12, w: 2, text: "장바구니 물가가 무섭게 오른다. 1년 동안 물가가 해마다 4%씩 더 올라요. 생활비, 청소비, 공사비가 모두 비싸져요.", news: "소비자물가 5%대… 외식비·공과금 줄인상" },
  { id: "rentup", n: "상가 임대료 급등", m: 18, w: 2, text: "상권마다 월세가 뛰었다. 1년 반 동안 새 매물 월세가 파티룸 +20%, 숙소·무인카페 +15%. 이미 계약한 곳은 재계약 때 법정 상한 5%까지만 올라요.", news: "핫플 상가 임대료 급등… 젠트리피케이션 우려" },
  { id: "bigcomp", n: "대형 파티룸 프랜차이즈 진출", m: 18, w: 2, need: (s) => act(s, "pr"), text: "대기업 계열 공간 브랜드가 파티룸 시장에 들어왔다. 근처에 깔끔한 체인점이 줄줄이 생긴다. 1년 반 동안 예약 −6%, 주변 경쟁도 더 빨리 늘어요.", news: "대기업 공간 브랜드, 파티룸 시장 진출 선언" },
  { id: "algo", n: "인별 알고리즘 변경", m: 6, w: 2, need: (s) => act(s, "insta") || (s.cs?.ch?.insta?.f || 0) > 500, text: "인별이 알고리즘을 바꿨다. 팔로워 증가가 반토막 났다. 6개월 동안.", news: "인별 알고리즘 개편… 크리에이터 도달률 급감" },
  { id: "intl", n: "국제 관계 악화", m: 9, w: 1.5, need: (s) => act(s, "airbnb"), text: "외교 갈등으로 단체 관광이 끊겼다. 9개월 동안 외국인 예약 −50%.", news: "외교 갈등 장기화… 외국인 관광객 '반토막'" },
  { id: "crash", n: "주식시장 폭락", m: 0, w: 1, need: (s) => s.invest > 500, text: "코스피가 하루 만에 8% 빠졌다. 내 투자 계좌도 −28%.", news: "증시 폭락, 서킷브레이커 발동" },
  { id: "tax", n: "부업 세무조사 강화", m: 12, w: 1, need: (s) => (s.sj?.active || []).length > 0, text: "국세청이 N잡러 소득 신고를 들여다본다. 종합소득세 +20%, 회사에도 소문이 돈다(눈치 +5).", news: "국세청, 부업 소득 집중 점검… '신고 누락 주의'" },
];

// ───────── 투자 시장 (판정은 core.js invMonth·inv_ev) ─────────
// 장기 평균 연 6.4%(월 0.53%, 변동 월 4.4%), 복리로는 연 5% 안팎. 투자만으로 파이어하기는 어렵게.
// churn: 투잡 없이 회사만 다니면 남는 시간·불안이 계좌로 간다(잦은 매매·수수료·세금, 월 −0.45%p = 연 −5.4%p).
//   투자 습관(s.invHabit 0.3~1.5, 처음 1)을 곱한다: 이벤트에서 차분한 선택 −0.06, 조금 무리 +0.08, 무리 +0.25
// busy: 투잡을 하면 바빠서 투자 앱을 덜 연다(유혹 이벤트만 ×busy, mkt 시장 사건은 누구에게나). chance·cool: 이벤트 확률·쉬는 달
export const INV = { mu: 0.0053, sd: 0.044, churn: 0.0045, cool: 6, chance: 0.15, busy: 0.7, minT: 6, habit: { calm: -0.06, mid: 0.08, rash: 0.25 } };
// 투자 이벤트. pre: 이벤트가 뜨는 순간 시장이 먼저 움직인다(inv: 투자 계좌, house: 집값).
// 선택지 style: calm(차분, 시장 평균) · mid(조금 무리) · rash(무리). 봇·시험용 표시이고 화면엔 안 나온다.
// stake: 위험에 거는 돈 { inv: 투자금 비율, cash: 여유 현금 비율(생활비 6달 치 남김), amt: 정액(현금), loan: 대출 비율(신용 한도·집값) }
// outs: [확률, 수익률, 결과 문장]. 결과 돈은 투자 계좌로(정액 현금은 현금으로). reb: 몇 달 뒤 반등 { pct, at: [최소, 최대]달 } (팔지 않은 사람만)
// sell: 투자금 중 비율만큼 판다. bonus: 판 돈에 붙는 이자. fee: 현금 비용. div: 투자금 비율만큼 배당. houseSell: 집을 급매로 판다
// 11-25 큰 판 유혹의 문턱: 현금 + 투자금 + 내 집 값(파티룸 지점 값 같은 것은 빼고 대강)
const nwOf = (s) => (s.cash || 0) + (s.invest || 0) + (s.house?.type === "own" ? s.house.value || 0 : 0);
export const INV_EV = [
  { id: "crash", title: "폭락장, 계좌가 파랗다", w: 1.2, mkt: true, toRec: true, need: (s) => s.invest >= 1000, pre: { inv: -0.2 }, // 11-25 toRec: 반등은 회복장으로(투자 1단계, 버틴 사람만 탄다)
    text: "주가가 한 달 새 20% 빠졌다. 내 계좌도 {pre} 줄었다. 단톡방엔 \"이번엔 진짜 끝났다\"는 말뿐이다.",
    choices: [
      { t: "앱을 지우고 원래대로 적립한다", style: "calm", out: "알림을 껐다. 회사 일에 집중했다. 시장은 늘 그렇듯 조용히 돌아온다고 믿기로.", eff: { mental: -2 } },
      { t: "더 떨어지기 전에 전부 판다", style: "rash", sell: 1, out: "마음은 편해졌다. 반등은 꼭 내가 없을 때 온다는 걸, 몇 달 뒤에 알게 된다.", eff: { mental: 3 } },
      { t: "비상금까지 털어 싸게 더 산다", style: "mid", stake: { cash: 0.4 }, outs: [[0.65, 0, "싸게 더 담았다. 이제 기다리는 일만 남았다."], [0.35, -0.12, "한 번 더 빠졌다. 바닥 밑에 지하실이 있었다."]], eff: { mental: -4 } },
    ] },
  { id: "reading", title: "수익률 312% 인증방", w: 1, need: (s) => s.invest >= 500 || s.cash >= 1000,
    text: "모르는 번호가 단톡방에 초대했다. 수익 인증 캡처가 쏟아진다. \"VIP 회비 300만이면 종목 찍어 드려요. 오늘까지만.\"",
    choices: [
      { t: "나가기 누르고 신고한다", style: "calm", out: "방을 나왔다. 다음 날 같은 번호로 또 초대가 왔다. 또 나왔다.", eff: { mental: 1, stat: { num: 0.5 } } },
      { t: "회비만 내고 구경해 본다", style: "mid", fee: 300, out: "찍어 준 종목은 이미 오를 대로 오른 뒤였다. 회비 300만이 수업료가 됐다.", eff: { mental: -3 } },
      { t: "회비 내고 큰돈까지 맡긴다", style: "rash", fee: 300, stake: { inv: 0.3 }, outs: [[0.75, -0.85, "운영자가 잠수를 탔다. 단톡방이 통째로 사라졌다."], [0.25, -0.3, "몇 번 따라 샀다가 고점에 물렸다. 겨우 손절했다."]] },
    ] },
  { id: "coin", title: "신규 코인, 지금 들어가면 열 배", w: 1, need: (s) => s.invest >= 1000,
    text: "회사 동기가 새로 상장한 코인으로 차를 바꿨단다. \"지금 들어가면 열 배야.\" 링크가 왔다.", textQ: "옛 회사 동기가 새로 상장한 코인으로 차를 바꿨단다. \"지금 들어가면 열 배야.\" 링크가 왔다.",
    choices: [
      { t: "모르는 건 안 산다", style: "calm", out: "동기의 새 차가 부럽긴 했다. 그래도 내 계좌는 내가 아는 것만.", eff: { mental: -1 } },
      { t: "계좌의 5%만 넣어 본다", style: "mid", stake: { inv: 0.05 }, outs: [[0.55, -0.9, "일주일 만에 거의 다 녹았다. 비싼 수업이었다."], [0.3, -0.3, "조금 잃고 뺐다. 차트 보느라 잠을 설쳤다."], [0.15, 2, "진짜 세 배가 됐다! …이 기억이 다음 판단을 망칠지도."]] },
      { t: "계좌의 4분의 1을 옮긴다", style: "rash", stake: { inv: 0.25 }, outs: [[0.55, -0.85, "거래 지원 종료 공지. 앱을 몇 번이고 새로 고침했다."], [0.3, -0.4, "반토막 나서 버티다 겨우 뺐다."], [0.15, 1.5, "진짜 올랐다. 문제는 이게 '실력'처럼 느껴진다는 거다."]] },
    ] },
  { id: "friend", title: "동기의 비상장 지분 제안", w: 0.8, need: (s) => s.invest + Math.max(0, s.cash) >= 2000,
    text: "대학 동기가 비상장 회사 지분을 권한다. \"상장만 하면 다섯 배야. 너라서 말해 주는 거야.\" 사업계획서가 화려하다.",
    choices: [
      { t: "숫자부터 따져 보고 정중히 거절한다", style: "calm", check: { stat: "num", dc: 50 }, ok: { text: "매출 대신 '예상 기업가치'만 가득한 계획서였다. 조목조목 짚어 주니 동기도 웃으며 넘겼다.", eff: { stat: { num: 1.5 }, mental: 2 } }, ng: { text: "따지다 보니 분위기가 싸해졌다. 돈은 지켰지만 술자리가 어색했다.", eff: { mental: -3 } } },
      { t: "정으로 1,000만만 넣는다", style: "mid", stake: { amt: 1000 }, outs: [[0.65, -1, "회사가 문을 닫았다. 동기도 연락이 뜸해졌다."], [0.25, -0.6, "몇 년째 소식이 없다. 반값에 겨우 넘겼다."], [0.1, 3, "진짜 상장했다! 이런 일도 있다."]] },
      { t: "이번이 기회다, 크게 건다", style: "rash", stake: { inv: 0.2 }, outs: [[0.65, -1, "회사가 문을 닫았다. 돈도, 동기도 잃었다."], [0.25, -0.6, "상장은 계속 미뤄졌다. 반값에 겨우 넘겼다."], [0.1, 3, "진짜 상장했다. 친구 잘 둔 덕이다."]] },
    ] },
  { id: "lever", title: "신용 한도 승인 알림", w: 0.8, need: (s) => s.invest >= 2000 && !(s.co.quit || s.co.fired),
    text: "증권 앱 알림: \"신용 한도 3,000만 원 승인 가능.\" 두 배로 굴리면 은퇴가 5년 당겨진다는 계산이 머리를 스친다.",
    choices: [
      { t: "빚으로는 안 한다", style: "calm", out: "알림을 껐다. 잃어도 버틸 수 있는 돈만 굴리기로.", eff: { mental: 1 } },
      { t: "1,500만만 빌려 본다", style: "mid", stake: { loan: 1500 }, outs: [[0.5, 0.2, "올랐다. 이자를 내고도 조금 남았다."], [0.5, -0.4, "떨어지자 이자가 더 무서웠다. 손해 보고 정리했다."]] },
      { t: "한도를 꽉 채워 두 배로 산다", style: "rash", stake: { loan: 3000 }, outs: [[0.45, 0.25, "운 좋게 올랐다. 다음엔 더 크게 하고 싶어진다. 그게 제일 위험하다."], [0.55, -0.6, "하락장에 반대매매가 나갔다. 주식은 사라지고 빚만 남았다."]] },
    ] },
  { id: "theme", title: "오늘도 상한가라는 그 테마주", w: 1, need: (s) => s.invest >= 1000,
    text: "옆 팀 과장이 테마주로 두 배를 벌었다는 소문. 오늘도 상한가란다. 점심시간 내내 그 얘기뿐이다.", textQ: "옛 회사 과장이 테마주로 두 배를 벌었다는 소문. 오늘도 상한가란다. 동기 단톡방이 종일 그 얘기뿐이다.",
    choices: [
      { t: "구경만 한다", style: "calm", out: "점심 메뉴에 집중했다. 김치찌개가 맛있었다.", eff: { mental: -1 } },
      { t: "5분의 1만 따라 산다", style: "mid", stake: { inv: 0.2 }, outs: [[0.35, 0.3, "운 좋게 먹고 나왔다. 손이 떨렸다."], [0.65, -0.4, "다음 날부터 내리막. 뉴스가 끝나자 주가도 끝났다."]] },
      { t: "계좌 절반을 몰아넣는다", style: "rash", stake: { inv: 0.5 }, outs: [[0.25, 0.5, "팔고 나니 더 올랐다. 그래도 벌었다."], [0.75, -0.45, "산 날이 꼭대기였다. 과장님은 이미 팔고 나간 뒤였다."]] },
    ] },
  { id: "avgdown", title: "−40% 종목, 물을 탈까", w: 0.8, need: (s) => s.invest >= 2000, pre: { inv: -0.03 },
    text: "예전에 산 개별 종목이 −40%. \"지금 더 사면 평단이 확 내려가요.\" 커뮤니티 글이 자꾸 눈에 밟힌다.",
    choices: [
      { t: "손절하고 지수 펀드로 갈아탄다", style: "calm", out: "아팠지만 깔끔해졌다. 계좌가 한결 단순해졌다.", eff: { mental: -1, stat: { num: 0.5 } } },
      { t: "그냥 묻어 둔다", style: "mid", stake: { inv: 0.15 }, outs: [[0.5, 0.2, "몇 년 만에 겨우 본전 근처까지 왔다."], [0.5, -0.45, "회사가 유상증자를 했다. 더 빠졌다."]] },
      { t: "현금까지 넣어 물을 탄다", style: "rash", stake: { inv: 0.1, cash: 0.5 }, outs: [[0.4, 0.35, "버틴 보람이 있었다. 이번엔."], [0.6, -0.55, "물을 탔더니 물에 빠졌다. 바닥이 안 보인다."]] },
    ] },
  { id: "dividend", title: "지루함의 보상", w: 1, need: (s) => s.invest >= 3000 && (s.invHold || 0) >= 36,
    text: "몇 년째 손대지 않은 계좌. 배당금이 꼬박꼬박 쌓여 {div}이 됐다. 아무것도 안 한 게 제일 잘한 일이었다.",
    choices: [
      { t: "배당도 다시 넣는다", style: "calm", div: 0.03, out: "복리가 굴러간다. 눈덩이가 조금 더 커졌다.", eff: { mental: 2 } },
      { t: "찾아서 가족과 맛있는 걸 먹는다", style: "mid", div: 0.03, divCash: true, out: "오랜만에 좋은 데서 밥을 먹었다. 이런 게 투자하는 맛이지.", eff: { mental: 5, family: 2 } },
      { t: "신나서 레버리지 상품으로 갈아탄다", style: "rash", div: 0.03, stake: { inv: 0.4 }, outs: [[0.4, 0.35, "두 배로 올랐다. 심장도 두 배로 뛰었다."], [0.6, -0.4, "횡보장에 녹아내렸다. 레버리지는 오르내리기만 해도 깎인다."]] },
    ] },
  { id: "gap", title: "1억으로 아파트를 산다는 강의", w: 0.6, need: (s) => s.invest >= 5000 && s.house.type !== "own",
    text: "부동산 영상을 보다 \"전세 끼고 1억으로 아파트\" 강의 결제 버튼까지 눌렀다. 지금이 마지막 기회란다.",
    choices: [
      { t: "결제 취소, 내 집부터 생각한다", style: "calm", out: "남의 집보다 내가 살 집이 먼저다.", eff: { stat: { num: 0.5 } } },
      { t: "강의만 듣고 소액 경매에 도전한다", style: "mid", fee: 150, stake: { inv: 0.1 }, outs: [[0.35, 0.25, "작은 빌라 하나를 싸게 낙찰받았다. 공부가 됐다."], [0.4, -0.1, "명도에 반년이 걸렸다. 비용만 나갔다."], [0.25, -0.5, "권리 분석을 잘못했다. 숨은 세입자가 있었다."]] },
      { t: "투자금 3분의 1로 갭투자", style: "rash", stake: { inv: 0.33 }, outs: [[0.35, 0.35, "집값이 올랐다. 세입자도 착했다. 운이 좋았다."], [0.4, -0.1, "집값은 제자리. 취득세·중개비만 나갔다."], [0.25, -0.55, "역전세. 세입자 보증금을 돌려주느라 투자금이 녹았다."]], eff: { mental: -3 } },
    ] },
  { id: "housedown", title: "집값이 두 달 새 −12%", w: 0.6, mkt: true, need: (s) => s.house.type === "own", pre: { house: -0.12 },
    text: "우리 단지 실거래가가 두 달 새 12% 빠졌다. 단지 단톡방은 \"지금이라도 팔아야 하나\"로 시끄럽다.",
    choices: [
      { t: "어차피 살 집, 그냥 산다", style: "calm", reb: { house: 0.1, at: [8, 20] }, out: "집은 사는 곳이다. 시세 앱을 지웠다.", eff: { mental: -2 } },
      { t: "더 떨어지기 전에 급매로 판다", style: "rash", houseSell: 0.97, out: "급매로 팔았다. 다시 전월세 생활. 몇 달 뒤 시세는 제자리로 돌아왔다.", eff: { mental: -5, family: -3 } },
    ] },
  { id: "houseup", title: "집값이 올랐다, 대출 한도도 올랐다", w: 0.5, need: (s) => s.house.type === "own" && !(s.co.quit || s.co.fired), pre: { house: 0.08 },
    text: "우리 집 시세가 8% 올랐다. 은행에서 \"추가 담보대출 가능하세요\"라고 전화가 왔다.",
    choices: [
      { t: "집은 사는 곳, 그대로 둔다", style: "calm", out: "숫자만 오른 거다. 생활은 그대로.", eff: { mental: 2 } },
      { t: "조금만 빌려 인테리어를 고친다", style: "mid", fee: 1500, out: "집이 새집 같아졌다. 시세엔 별 영향이 없지만 퇴근길이 즐겁다.", eff: { mental: 6, family: 3 } },
      { t: "집 담보로 빌려 주식에 넣는다", style: "rash", stake: { loan: 0.15 }, outs: [[0.45, 0.2, "올랐다. 이자를 내고도 남았다. 이번엔."], [0.55, -0.35, "주식은 빠지고 집 대출 이자만 늘었다."]] },
    ] },
  { id: "rate", title: "기준금리가 또 올랐다", w: 1, mkt: true, need: (s) => s.invest >= 1000, pre: { inv: -0.06 },
    text: "기준금리가 또 올랐다. 주가는 흔들리고 예금 금리는 연 4%. 대출 이자 문자도 무섭다.",
    choices: [
      { t: "그대로 적립한다", style: "calm", reb: { pct: 0.06, at: [6, 14] }, out: "금리는 오르기도 하고 내리기도 한다. 원래 하던 대로.", eff: { mental: -1 } },
      { t: "절반을 예금으로 옮긴다", style: "mid", sell: 0.5, bonus: 0.02, reb: { pct: 0.06, at: [6, 14] }, out: "예금에 넣었다. 마음은 편하다. 대신 반등은 절반만.", eff: { mental: 2 } },
      { t: "금리 오르면 은행주라며 몰빵", style: "rash", stake: { inv: 0.4 }, outs: [[0.4, 0.25, "예상대로 올랐다. 이번엔 맞혔다."], [0.6, -0.3, "금리는 올랐는데 은행주는 떨어졌다. 시장은 늘 한발 앞서 있다."]] },
    ] },
  { id: "elsfund", title: "\"거의 원금 보장\" 연 8% 상품", w: 0.7, need: (s) => s.invest >= 2000,
    text: "은행 창구 직원이 \"거의 원금 보장이에요\"라며 연 8% 상품을 권한다. 설명서 글씨가 유난히 작다.",
    choices: [
      { t: "설명서를 끝까지 읽고 거절한다", style: "calm", check: { stat: "num", dc: 45 }, ok: { text: "'녹인' 세 글자를 찾아냈다. 원금 보장이 아니었다.", eff: { stat: { num: 1 } } }, ng: { text: "무슨 말인지 몰라서 일단 거절했다. 그것도 답이다.", eff: { mental: -1 } } },
      { t: "20%만 가입한다", style: "mid", stake: { inv: 0.2 }, outs: [[0.8, 0.08, "만기에 약속한 이자를 받았다."], [0.2, -0.55, "기초자산이 녹인 구간을 찍었다. 원금이 반토막 났다."]] },
      { t: "목돈 절반을 넣는다", style: "rash", stake: { inv: 0.5 }, outs: [[0.8, 0.08, "만기에 약속한 이자를 받았다. 휴."], [0.2, -0.55, "기초자산이 폭락했다. '거의'라는 말의 무게를 알았다."]] },
    ] },
  { id: "fomo", title: "택시 기사님도 종목 얘기", w: 1, mkt: true, need: (s) => s.invest >= 1000, pre: { inv: 0.08 },
    text: "강세장이다. 내 계좌도 {pre} 늘었다. 택시 기사님도, 단톡방도 다 돈 벌었다는 얘기뿐이다.",
    choices: [
      { t: "원래 비율대로 적립만 한다", style: "calm", out: "남들보다 덜 벌어도 괜찮다. 덜 잃으면 된다.", eff: { mental: -1 } },
      { t: "비상금 절반만 더 넣는다", style: "mid", stake: { cash: 0.3 }, outs: [[0.5, 0.08, "조금 더 올랐다. 기분이 좋다."], [0.5, -0.25, "넣자마자 빠졌다. 그래도 절반은 남겨 뒀다."]] },
      { t: "비상금까지 다 넣는다", style: "rash", stake: { cash: 0.95 }, outs: [[0.5, 0.08, "조금 더 올랐다. 비상금이 없어서 불안하긴 하다."], [0.5, -0.25, "꼭지였다. 넣자마자 빠졌다. 비상금도 같이."]] },
    ] },
  // ── v4.27 주식 이벤트 10개 (좋은 일: esop·beat·ipo / 나머지는 나쁜 일). pre 는 한 종목 일이라 계좌 전체로는 작게 잡았다
  { id: "esop", title: "우리사주 20% 할인 청약", w: 0.7, need: (s) => !(s.co.quit || s.co.fired) && s.cash >= 1000,
    text: "회사가 우리사주 청약을 받는다. 시세보다 20% 싸다. 대신 1년은 못 판다. 회사가 흔들리면 월급과 주식이 같이 흔들린다.",
    choices: [
      { t: "여윳돈 500만만 넣는다", style: "calm", stake: { amt: 500 }, outs: [[0.6, 0.2, "1년 뒤 팔았다. 할인받은 만큼 딱 벌었다."], [0.25, 0.45, "주가까지 올랐다. 할인에 상승까지, 오랜만에 회사가 고맙다."], [0.15, -0.3, "실적이 꺾였다. 할인분을 다 토해 내고 더 빠졌다."]] },
      { t: "배정 한도를 꽉 채운다", style: "mid", stake: { cash: 0.5 }, outs: [[0.45, 0.15, "할인만큼 벌었다. 1년 동안 비상금이 묶여 조마조마했다."], [0.2, 0.35, "주가도 올랐다. 이번엔 회사를 믿은 보람이 있었다."], [0.35, -0.4, "회사가 구조조정 뉴스에 올랐다. 월급도 주식도 같이 떨렸다."]] },
      { t: "신용대출까지 끌어 몰빵한다", style: "rash", stake: { loan: 3000 }, outs: [[0.1, 0.6, "대박. 회사 주가가 날았다. 사내 메신저가 축제 분위기다."], [0.4, 0.1, "조금 벌었다. 대출 이자를 빼니 남는 게 없다."], [0.5, -0.5, "회사가 흔들렸다. 주식은 반토막, 대출은 그대로. 출근길이 무겁다."]], eff: { mental: -2 } },
    ] },
  { id: "nightus", title: "새벽 3시, 해외 주식 알림", w: 0.8, need: (s) => s.invest >= 1000,
    text: "새벽 3시, 해외 주식 급등락 알림이 울렸다. 잠이 확 깼다. 아침 9시엔 팀장님 보고가 있다.", textQ: "새벽 3시, 해외 주식 급등락 알림이 울렸다. 잠이 확 깼다. 아침 9시엔 고객 약속이 있다.",
    choices: [
      { t: "알림을 끄고 다시 잔다", style: "calm", out: "아침에 보니 어제랑 비슷했다. 잠이 남는 장사다. 알림은 영영 껐다.", eff: { hp: 2, mental: 1 } },
      { t: "일어나서 차트 보다 조금 산다", style: "mid", stake: { inv: 0.1 }, outs: [[0.45, 0.08, "조금 벌었다. 대신 회의 시간에 하품을 세 번 했다."], [0.55, -0.12, "산 뒤에 더 빠졌다. 잠도 돈도 잃었다."]], eff: { hp: -3, eye: 2 } },
      { t: "급락이다, 지금 풀매수", style: "rash", stake: { inv: 0.3 }, outs: [[0.1, 0.6, "아침에 보니 급반등. 오늘은 내가 천재다. 회의에선 졸았지만."], [0.35, 0, "본전. 대신 밤을 통째로 날렸다."], [0.55, -0.35, "떨어지는 칼날을 맨손으로 잡았다. 보고 중에 멍때리다 지적까지 받았다."]], eff: { hp: -6, eye: 4, mental: -2 } },
    ] },
  { id: "rights", title: "유상증자 공시, 하루 −15%", w: 0.7, need: (s) => s.invest >= 1500, pre: { inv: -0.06 },
    text: "갖고 있던 종목이 유상증자를 공시했다. 하루 만에 15% 빠졌다. 내 계좌도 {pre} 줄었다. 새 주식은 지금보다 싸게 준단다.",
    choices: [
      { t: "증자 이유부터 읽고 그대로 둔다", style: "calm", reb: { pct: 0.05, at: [6, 14] }, out: "빚 갚는 돈이 아니라 공장 짓는 돈이었다. 지켜보기로 했다.", eff: { mental: -1, stat: { num: 0.3 } } },
      { t: "실망이다, 그 종목은 판다", style: "mid", sell: 0.15, out: "손실을 확정하고 현금으로 뺐다. 몇 달 뒤 주가는 슬금슬금 돌아왔다.", eff: { mental: 1 } },
      { t: "신용까지 써서 새 주식을 왕창 받는다", style: "rash", stake: { loan: 2000 }, outs: [[0.15, 0.6, "증자로 지은 공장이 대박. 싸게 받은 주식이 날았다."], [0.35, 0.05, "본전 언저리. 이자만 꼬박꼬박 나간다."], [0.5, -0.4, "주식 수만 늘고 주가는 계속 미끄러졌다. 빚만 남았다."]], eff: { mental: -2 } },
    ] },
  { id: "halt", title: "거래 정지, 회계 의혹", w: 0.6, need: (s) => s.invest >= 1500, pre: { inv: -0.04 },
    text: "갖고 있던 종목에 회계 의혹 기사가 떴다. 주가가 급락하더니 내일부터 거래 정지 가능성이 있단다. 계좌는 벌써 {pre} 빠졌다.",
    choices: [
      { t: "감사보고서를 직접 뜯어본다", style: "calm", check: { stat: "num", dc: 50 }, ok: { text: "주석에서 수상한 거래를 찾았다. 정지 전에 미리 정리했다. 다음 날 뉴스를 보고 소름이 돋았다.", eff: { stat: { num: 1.5 }, mental: 3 } }, ng: { text: "봐도 모르겠다. 그래도 한 종목에 너무 많이 들었다는 건 알았다. 남은 돈은 지수 펀드로 넓게.", eff: { mental: -2 } } },
      { t: "소문일 뿐, 그냥 들고 간다", style: "mid", stake: { inv: 0.1 }, outs: [[0.65, 0.05, "거래가 재개됐다. 제자리로 돌아왔다. 한 달 내내 심장이 덜컥거렸다."], [0.35, -0.4, "상장폐지 심사로 넘어갔다. 정리매매 때 헐값에 던졌다."]] },
      { t: "많이 빠졌다, 싸게 더 줍는다", style: "rash", stake: { inv: 0.15, cash: 0.2 }, outs: [[0.12, 1.2, "의혹이 풀리고 거래 재개 첫날 상한가. 이걸 실력이라 믿으면 안 된다."], [0.88, -0.7, "상장폐지. 휴지가 된 주식 앞에서 할 말이 없었다."]] },
    ] },
  { id: "beat", title: "깜짝 실적, 하루 +25%", w: 0.8, need: (s) => s.invest >= 1000, pre: { inv: 0.06 },
    text: "갖고 있던 종목이 깜짝 실적을 냈다. 하루 25% 급등. 내 계좌도 {pre} 늘었다. 단톡방은 '이제 시작이다, 열 배 간다'로 뜨겁다.",
    choices: [
      { t: "오른 만큼만 덜어 원래 비율로", style: "calm", sell: 0.06, bonus: 0.02, out: "오른 만큼만 팔아 예금에 넣었다. 계좌 비율이 원래대로 돌아왔다.", eff: { mental: 2 } },
      { t: "더 간다, 그냥 둔다", style: "mid", stake: { inv: 0.1 }, outs: [[0.45, 0.15, "진짜 더 올랐다. 기분 좋은 한 주."], [0.55, -0.18, "재료가 끝나자 다음 날부터 흘러내렸다."]] },
      { t: "현금까지 털어 추가 매수", style: "rash", stake: { inv: 0.1, cash: 0.5 }, outs: [[0.08, 0.8, "정말 두 배 갔다! 이 기억이 다음 판단을 망칠지도."], [0.27, 0.05, "조금 더 오르다 멈췄다."], [0.65, -0.4, "꼭대기에서 산 사람이 바로 나였다."]] },
    ] },
  { id: "ipo", title: "공모주 청약, 치킨값 벌기", w: 0.8, need: (s) => s.cash >= 800,
    text: "공모주 청약 일정이 떴다. 경쟁률 1,000 대 1. 증거금 넣고 몇 주만 받아도 치킨값은 번다는데.",
    choices: [
      { t: "증거금 조금만 넣어 용돈 벌이", style: "calm", stake: { amt: 300 }, outs: [[0.7, 0.15, "두 주 받았다. 상장 첫날 팔아 치킨을 시켰다."], [0.3, -0.05, "공모가 아래로 시작했다. 그래도 커피값 손해."]] },
      { t: "여유 현금 절반을 증거금으로", style: "mid", stake: { cash: 0.5 }, outs: [[0.55, 0.04, "몇 주 더 받았다. 큰돈 넣은 것치곤 소소하다."], [0.45, -0.08, "상장 첫날 하락. 묶인 돈 이자만 날렸다."]] },
      { t: "신용대출로 증거금을 키운다", style: "rash", stake: { loan: 3000 }, outs: [[0.1, 0.3, "따따블! 첫날 팔고 대출까지 갚았다."], [0.4, 0.02, "이자 내고 나니 남는 게 없다."], [0.5, -0.15, "공모가가 깨졌다. 대출 이자는 꼬박꼬박 나간다."]] },
    ] },
  { id: "divcut", title: "배당이 반으로 줄었다", w: 0.6, need: (s) => s.invest >= 2000, pre: { inv: -0.04 },
    text: "몇 년째 꼬박 받던 배당을 회사가 반으로 줄였다. 주가도 하루 새 빠져 계좌가 {pre} 줄었다.",
    choices: [
      { t: "한 종목 대신 지수 펀드로 넓힌다", style: "calm", reb: { pct: 0.04, at: [6, 14] }, out: "한 회사 배당에 기대지 않기로 했다. 지수 펀드로 넓게.", eff: { stat: { num: 0.5 } } },
      { t: "다시 늘려 줄 거라 믿고 둔다", style: "mid", stake: { inv: 0.1 }, outs: [[0.5, 0.1, "이듬해 배당이 돌아왔다. 버틴 보람."], [0.5, -0.2, "배당은 그대로, 주가는 더 빠졌다."]] },
      { t: "배당률 제일 높은 종목으로 몰빵", style: "rash", stake: { inv: 0.35 }, outs: [[0.1, 0.5, "갈아탄 종목이 배당도 주가도 올랐다."], [0.4, -0.05, "배당은 받았는데 주가가 그만큼 빠졌다."], [0.5, -0.35, "배당 함정이었다. 배당률이 높은 데는 이유가 있었다."]] },
    ] },
  // 11-25 투자 1단계 ②: 하락장에 부모님이 "그 돈 빼서 집이나 사라"
  { id: "parenthome", title: "\"그 돈 빼서 집이나 사라\"", w: 1, mkt: true, need: (s) => s.invPh?.p === "b" && s.invest >= 2000 && s.house?.type !== "own", pre: { inv: -0.03 },
    text: "명절 밥상. 아빠가 숟가락을 내려놓는다. \"요즘 주식 다 빠졌다며. 그 돈 빼서 집이나 사라. 집은 안 없어진다.\" 엄마도 고개를 끄덕인다. 내 계좌는 이번 달에도 {pre} 빠졌다.",
    choices: [
      { t: "하락장은 지나간다고 차분히 설명한다", style: "calm", out: "그래프를 보여 드렸다. 아빠는 끝까지 못 믿는 눈치였지만 더 묻지는 않았다.", eff: { mental: -2 } },
      { t: "절반을 빼서 집 살 돈으로 묶어 둔다", style: "mid", sell: 0.5, bonus: 0.02, out: "절반을 예금으로 옮겼다. 부모님 얼굴이 밝아졌다. 회복장은 절반만 탄다.", eff: { mental: 2 } },
      { t: "다 빼서 바로 집을 알아본다", style: "rash", sell: 1, out: "바닥 근처에서 다 팔았다. 부모님 마음은 편해졌다. 몇 달 뒤 반등은 남의 일이 됐다.", eff: { mental: 3 } },
    ] },
  // 11-25 투자 1단계 ④: 순자산 5·10·20억을 넘으면 한 번씩 오는 큰 판 유혹(지인 사업·꼬마빌딩·코인 몰빵·레버리지). 차분하게 거절하면 잃지 않는다
  { id: "big5", title: "\"형이니까 하는 얘기야\"", w: 3, need: (s) => nwOf(s) >= 50000 && s.invSeen?.big5 === undefined,
    text: "대학 선배가 술자리에서 사업 계획서를 꺼냈다. \"무인 매장 체인이야. 지분 10%에 2억. 3년이면 다섯 배.\" 표지에 '대외비'가 크게 찍혀 있다.",
    choices: [
      { t: "계획서만 받아 두고 정중히 거절한다", style: "calm", out: "\"나중에 후회한다\"는 말을 들었다. 1년 뒤 그 체인은 간판을 내렸다.", eff: { mental: -1 } },
      { t: "3천만 원만 의리로 넣는다", style: "mid", stake: { amt: 3000 }, outs: [[0.25, 0.6, "작게 넣은 돈이 1.6배가 돼 돌아왔다. 선배가 고맙다며 밥을 샀다."], [0.75, -0.9, "매장 세 곳이 1년 만에 문을 닫았다. 의리 값으로 치기로 했다."]] },
      { t: "투자금을 빼서 크게 넣는다", style: "rash", stake: { inv: 0.4 }, outs: [[0.15, 1.5, "진짜로 터졌다. 지분 값이 두 배 반이 됐다."], [0.85, -0.85, "선배가 연락을 끊었다. 남은 건 휴지가 된 지분 계약서."]], eff: { mental: -2 } },
    ] },
  { id: "big10", title: "역 앞 꼬마빌딩 급매", w: 3, need: (s) => nwOf(s) >= 100000 && s.invSeen?.big10 === undefined,
    text: "부동산에서 전화가 왔다. \"역 앞 꼬마빌딩 급매예요. 대출 70% 나와요. 월세만 받아도 이자 내고 남아요.\" 사진 속 1층에 '임대 문의'가 붙어 있다.",
    choices: [
      { t: "이자와 공실을 계산해 보고 그만둔다", style: "calm", out: "1층은 그 뒤로 2년 동안 비어 있었다.", eff: {} },
      { t: "친구 둘과 지분을 나눠 산다", style: "mid", stake: { inv: 0.15 }, outs: [[0.5, 0.25, "공실 없이 굴러갔다. 해마다 조금씩 나눠 받는다."], [0.5, -0.25, "1층이 1년 넘게 비었다. 이자는 꼬박꼬박 나갔다."]] },
      { t: "투자금을 털어 통째로 산다", style: "rash", stake: { inv: 0.6 }, outs: [[0.3, 0.45, "역 앞이 뜨면서 건물값이 올랐다."], [0.7, -0.35, "금리가 오르고 공실이 길어졌다. 헐값에 넘겼다."]], eff: { mental: -3 } },
    ] },
  { id: "big20coin", title: "\"20억이면 반은 코인에\"", w: 3, need: (s) => nwOf(s) >= 200000 && s.invSeen?.big20coin === undefined,
    text: "단톡방 사람들이 다 같은 말을 한다. \"이번 상승장은 진짜다. 20억 있으면 반은 코인에 둬야지.\" 차트가 수직으로 서 있다.",
    choices: [
      { t: "재미로 1%만 둔다", style: "calm", stake: { inv: 0.01 }, outs: [[0.5, 0.8, "재미로 둔 돈이 두 배 가까이 됐다. 딱 그만큼만 웃었다."], [0.5, -0.6, "재미로 둔 돈이 반 토막 났다. 재미 값이었다."]] },
      { t: "10%를 옮긴다", style: "mid", stake: { inv: 0.1 }, outs: [[0.35, 1.2, "두 배 넘게 올랐고 제때 팔았다."], [0.65, -0.65, "꼭대기에서 샀다. 1년 뒤 3분의 1이 남았다."]] },
      { t: "절반을 옮긴다", style: "rash", stake: { inv: 0.5 }, outs: [[0.2, 1.5, "인생 역전. 단톡방에 인증 사진을 올렸다."], [0.8, -0.7, "거래소 알림이 멈추지 않았다. 계좌의 반이 사라졌다."]], eff: { mental: -3 } },
    ] },
  { id: "big20lev", title: "지수 3배 상품", w: 3, need: (s) => nwOf(s) >= 200000 && s.invSeen?.big20lev === undefined,
    text: "증권사 PB가 설명서를 내민다. \"지수 3배 상품이에요. 오르는 장에서는 이만한 게 없죠. 자산가분들 많이 하세요.\"",
    choices: [
      { t: "설명서만 받고 지수 펀드에 둔다", style: "calm", out: "3배는 내릴 때도 3배다. 그 문장 하나를 메모장에 적었다.", eff: {} },
      { t: "투자금 15%만 넣는다", style: "mid", stake: { inv: 0.15 }, outs: [[0.45, 0.6, "오르는 장을 제대로 탔다."], [0.55, -0.55, "옆으로 기는 장에서 녹아내렸다. 3배 상품의 함정이었다."]] },
      { t: "신용까지 끌어 크게 넣는다", style: "rash", stake: { inv: 0.4, loan: 5000 }, outs: [[0.25, 1.2, "한 해에 두 배를 벌었다. 손이 떨렸다."], [0.75, -0.8, "급락 한 번에 반대매매가 났다. 대출만 남았다."]], eff: { mental: -3 } },
    ] },
  { id: "bearsell", title: "하락장, 그냥 다 팔까?", w: 1, mkt: true, need: (s) => s.invPh?.p === "b" && s.invest >= 1000, pre: { inv: -0.05 },
    text: "하락장 석 달째. 계좌가 또 {pre} 빠졌다. 퇴근 지하철에서 매일 묻는다. '그냥 다 팔까?'",
    choices: [
      { t: "적립은 그대로, 앱은 지운다", style: "calm", reb: { pct: 0.1, at: [6, 14] }, out: "버티는 게 제일 어렵다. 그래도 하락장은 늘 끝났다.", eff: { mental: -4 } },
      { t: "절반만 판다", style: "mid", sell: 0.5, reb: { pct: 0.1, at: [6, 14] }, out: "절반은 손실 확정, 절반은 버티기. 반등도 절반만 왔다.", eff: { mental: -1 } },
      { t: "다 팔고 바닥에서 다시 산다", style: "rash", stake: { inv: 0.8 }, outs: [[0.12, 0.2, "진짜 바닥에서 다시 샀다. 평생 한 번 올 운이다."], [0.88, -0.2, "팔고 나니 반등. 다시 사려니 이미 올라 있었다. 손실만 확정."]], eff: { mental: 2 } },
    ] },
  { id: "spouseacct", title: "배우자가 계좌를 봤다", w: 0.7, need: (s) => !!s.fam?.spouse && s.invest >= 1000,
    text: "배우자가 내 폰에 뜬 증권 앱 알림을 봤다. '이거 얼마야? 우리 돈이야?' 하필 계좌가 파란 날이다.",
    choices: [
      { t: "솔직하게 다 보여 주고 규칙을 정한다", style: "calm", out: "잔소리를 한참 들었다. 대신 이제 둘이 같이 본다. 한 달에 얼마, 몰빵 금지.", eff: { family: 4, mental: -2 } },
      { t: "수익 난 종목만 보여 준다", style: "mid", out: "반만 보여 줬다. 반은 들킨 것 같다. 저녁 식탁이 조용하다.", eff: { family: -3, mental: -2 } },
      { t: "숨기고 몰래 더 넣어 메운다", style: "rash", stake: { cash: 0.4 }, outs: [[0.15, 0.5, "운 좋게 메웠다. 그래도 거짓말 하나가 남았다."], [0.85, -0.3, "구멍이 더 커졌다. 결국 들켰다. 이번엔 돈보다 신뢰가 문제다."]], eff: { family: -8, mental: -4 } },
    ] },
  { id: "pump", title: "'우리끼리 같이 사요'", w: 0.6, need: (s) => s.invest >= 1000,
    text: "모르는 방장이 개인 메시지를 보냈다. '작은 종목 하나, 우리끼리 시간 맞춰 같이 사요. 올려놓고 빠지면 됩니다.'",
    choices: [
      { t: "시세 조종이다, 차단하고 신고", style: "calm", out: "차단했다. 몇 달 뒤 그 방장이 뉴스에 나왔다. 수갑 찬 모습으로.", eff: { mental: 1 } },
      { t: "따라가진 않고 그 종목만 슬쩍 산다", style: "mid", stake: { inv: 0.1 }, outs: [[0.35, 0.3, "초입에 타서 조금 먹고 나왔다. 찝찝함은 덤."], [0.65, -0.25, "작전 세력이 먼저 던졌다. 개미는 나였다."]] },
      { t: "시키는 대로 큰돈 넣는다", style: "rash", stake: { inv: 0.3 }, outs: [[0.15, 1.5, "진짜 올랐다. 큰돈을 벌었다. …밤마다 초인종 소리에 깬다."], [0.45, -0.6, "방장이 먼저 털고 나갔다. 나만 꼭대기에 남았다."], [0.4, -0.7, "금융당국 조사. 계좌가 묶이고 회사 인사팀에도 연락이 갔다."]], eff: { eye: 6, mental: -4 } },
    ] },
  // ── v4.27 코인 이벤트 10개 (좋은 일: bigcoin·kimchi·parentcoin / 나머지는 나쁜 일). 실제 코인·거래소 이름은 쓰지 않는다
  { id: "bigcoin", title: "대장 코인이 신고가", w: 0.8, need: (s) => s.invest >= 1000,
    text: "대장 코인이 신고가를 찍었다. 뉴스마다 '지금이라도?'. 탕비실 화제도 온통 코인이다.", textQ: "대장 코인이 신고가를 찍었다. 뉴스마다 '지금이라도?'. 단톡방 화제도 온통 코인이다.",
    choices: [
      { t: "계좌의 3%만 넣고 잊는다", style: "calm", stake: { inv: 0.03 }, outs: [[0.5, 0.6, "1년 뒤 열어 보니 올라 있었다. 조금 넣어서 웃었다."], [0.3, 0, "제자리. 넣은 걸 잊고 살았다."], [0.2, -0.45, "반토막 가까이. 그래도 3%라 웃어넘겼다."]] },
      { t: "계좌의 20%를 옮긴다", style: "mid", stake: { inv: 0.2 }, outs: [[0.35, 0.5, "올랐다. 매일 시세 확인하느라 바빴지만."], [0.25, 0, "1년을 오르락내리락. 결국 제자리."], [0.4, -0.5, "고점에 샀다. 1년 내내 물려 있었다."]] },
      { t: "계좌 절반을 몰빵한다", style: "rash", stake: { inv: 0.5 }, outs: [[0.1, 1.5, "진짜 두 배 반이 됐다. 사표 쓸 생각부터 났다. 그게 제일 위험하다."], [0.25, 0.3, "조금 벌고 나왔다. 운이 좋았다."], [0.65, -0.6, "1년 뒤 고점 대비 −70%. 몰빵은 1년 뒤에 운다."]] },
    ] },
  { id: "exhalt", title: "코인 거래소 출금 정지", w: 0.6, need: (s) => s.invest >= 1000,
    text: "쓰던 코인 거래소가 '점검 중'이라며 출금을 막았다. 커뮤니티엔 '뱅크런'이라는 말이 돈다.",
    choices: [
      { t: "거래소엔 원래 소액만, 잊는다", style: "calm", out: "넣어 둔 건 커피값 정도. 코인을 거래소에 오래 두는 게 아니라는 걸 확인했다.", eff: { mental: -1 } },
      { t: "출금 재개를 기다린다", style: "mid", stake: { inv: 0.05 }, outs: [[0.6, 0, "보름 만에 출금이 풀렸다. 바로 뺐다."], [0.4, -0.4, "회생 절차. 돌려받는 데 몇 년, 그것도 일부만."]] },
      { t: "폭락한 거래소 코인을 더 산다", style: "rash", stake: { inv: 0.2 }, outs: [[0.1, 1, "출금 재개 소식에 폭등. 이번만은 운이 좋았다."], [0.9, -0.85, "거래소가 파산했다. 화면 속 숫자는 끝내 돌아오지 않았다."]] },
    ] },
  { id: "stable", title: "'항상 1달러' 코인이 무너졌다", w: 0.6, need: (s) => s.invest >= 1000,
    text: "'항상 1달러'라던 가격 고정 코인이 0.6달러가 됐다. 연 20% 이자를 준다던 예치 상품도 같이 흔들린다.",
    choices: [
      { t: "애초에 연 20%는 안 믿었다", style: "calm", out: "높은 이자엔 높은 위험. 그 말이 이렇게 실감 날 줄이야.", eff: { mental: 1, stat: { num: 0.5 } } },
      { t: "예치해 둔 돈을 서둘러 뺀다", style: "mid", stake: { inv: 0.05 }, outs: [[0.6, -0.05, "빨리 뺐다. 수수료만 조금 냈다."], [0.4, -0.3, "출금 대기열이 길었다. 빼고 보니 3할이 녹았다."]] },
      { t: "0.6달러면 반값, 줍는다", style: "rash", stake: { inv: 0.2 }, outs: [[0.1, 0.6, "1달러로 돌아왔다! 진짜로."], [0.9, -0.9, "0.01달러. 고정은 한 번 깨지면 끝이었다."]] },
    ] },
  { id: "dogcoin", title: "강아지 그림 코인 +300%", w: 0.7, need: (s) => s.invest >= 1000,
    text: "강아지 그림 하나 그려진 코인이 하루 300% 올랐다. 해외 유명 사업가가 글 하나 올렸단다. 근거는 그게 전부다.",
    choices: [
      { t: "웃고 넘긴다", style: "calm", out: "밈은 밈으로. 웃긴 짤만 저장했다.", eff: { mental: -1 } },
      { t: "치킨값 20만만 넣는다", style: "mid", stake: { amt: 20 }, outs: [[0.25, 0.8, "오를 때 뺐다. 치킨 세 마리."], [0.75, -0.4, "내리막. 치킨이 닭다리 하나가 됐다."]] },
      { t: "계좌 30%를 태운다", style: "rash", stake: { inv: 0.3 }, outs: [[0.004, 99, "100배. 진짜 100배. 이건 투자가 아니라 복권이었다."], [0.146, 0.5, "조금 먹고 나왔다. 심장이 아직도 뛴다."], [0.85, -0.9, "−90%. 강아지가 나를 보고 웃는다."]] },
    ] },
  { id: "airdrop", title: "무료 코인 지급, 지갑만 연결하세요", w: 0.6, need: (s) => s.invest >= 500 || s.cash >= 500,
    text: "'무료 코인 지급! 지갑만 연결하세요.' 링크가 단톡방에 돈다. 공식 계정 같기도 하다.",
    choices: [
      { t: "주소부터 한 글자씩 확인한다", style: "calm", check: { stat: "num", dc: 45 }, ok: { text: "주소 철자 하나가 달랐다. 가짜 사이트였다. 단톡방에 경고를 남겼다.", eff: { stat: { num: 1 }, mental: 2 } }, ng: { text: "뭔지 몰라도 찜찜해서 안 눌렀다. 이유는 몰라도 잘한 일.", eff: { mental: -1 } } },
      { t: "작은 지갑으로만 연결해 본다", style: "mid", stake: { amt: 100 }, outs: [[0.35, 0.3, "진짜 공짜 코인이 들어왔다. 커피값."], [0.65, -0.45, "작은 지갑이 비었다. 작게 해서 다행이다."]] },
      { t: "메인 지갑을 연결한다", style: "rash", stake: { inv: 0.15 }, outs: [[0.1, 0.5, "진짜였다. 공짜 코인이 꽤 들어왔다."], [0.9, -0.95, "승인 버튼 하나에 지갑이 털렸다."]] },
    ] },
  { id: "futures", title: "100배 선물 거래 광고", w: 0.6, need: (s) => s.invest >= 1000,
    text: "'원금 100만이면 1억처럼 굴려요.' 100배 선물 거래 광고. 수익 인증엔 외제차 열쇠가 나온다.",
    choices: [
      { t: "선물은 안 한다", style: "calm", out: "1%만 반대로 가도 끝나는 게임. 광고를 차단했다.", eff: { mental: 1 } },
      { t: "100만만 10배로 해 본다", style: "mid", stake: { amt: 100 }, outs: [[0.3, 1.2, "두 배 넘게 벌었다. 한 번은 그렇다."], [0.7, -0.8, "청산 직전에 겨우 손절했다. 새벽 알림이 무서워졌다."]] },
      { t: "계좌 20%를 100배로", style: "rash", stake: { inv: 0.2 }, outs: [[0.05, 5, "진짜 터졌다. 여섯 배. 손이 떨려 앱을 지웠다."], [0.95, -1, "1% 움직였을 뿐인데 강제 청산. 몇 초 만이었다."]], eff: { hp: -2 } },
    ] },
  { id: "kimchi", title: "김치 프리미엄 10%", w: 0.7, need: (s) => s.invest >= 1000, pre: { inv: 0.03 },
    text: "국내 코인 값이 해외보다 10% 비싸다. 이른바 김치 프리미엄. 조금 갖고 있던 코인 덕에 계좌가 {pre} 늘었다.",
    choices: [
      { t: "프리미엄 붙은 값에 덜어 판다", style: "calm", sell: 0.05, bonus: 0.05, out: "비쌀 때 팔았다. 원래 비율로 깔끔하게 정리.", eff: { mental: 2 } },
      { t: "더 붙을 때까지 기다린다", style: "mid", stake: { inv: 0.05 }, outs: [[0.45, 0.1, "프리미엄이 15%까지 붙었다. 그때 팔았다."], [0.55, -0.12, "프리미엄이 하루 만에 꺼졌다."]] },
      { t: "해외에서 사서 국내에 판다며 몰빵", style: "rash", stake: { inv: 0.3 }, outs: [[0.1, 0.25, "차익 거래 성공. 한 번은 된다."], [0.9, -0.2, "송금은 막히고 프리미엄은 꺼지고 수수료만 남았다."]] },
    ] },
  { id: "cointax", title: "'내년부터 코인에 세금'", w: 0.6, mkt: true, need: (s) => s.invest >= 1000, pre: { inv: -0.03 },
    text: "'내년부터 코인 수익에 세금' 뉴스. 시장이 출렁여 계좌가 {pre} 빠졌다. 커뮤니티는 '올해 다 팔고 뜨자'로 들끓는다.",
    choices: [
      { t: "세금은 번 다음 문제, 원래대로", style: "calm", out: "세금은 벌어야 낸다. 덕분에 공제 한도를 공부했다.", eff: { mental: -1, stat: { num: 0.3 } } },
      { t: "연말 전에 조금 정리한다", style: "mid", sell: 0.1, out: "조금 팔았다. 세금은 결국 또 미뤄졌다는 뉴스가 나왔다.", eff: { mental: 1 } },
      { t: "세금 피하러 해외 거래소로 옮긴다", style: "rash", stake: { inv: 0.2 }, outs: [[0.1, 0.3, "수수료를 아끼고 조금 벌었다."], [0.5, -0.1, "송금 수수료와 환율에 조금씩 깎였다."], [0.4, -0.6, "해외 거래소가 국내 서비스를 접었다. 출금이 막혔다."]] },
    ] },
  { id: "p2e", title: "게임만 해도 하루 3만 원", w: 0.6, need: (s) => s.invest >= 500 || s.cash >= 500,
    text: "'게임만 해도 하루 3만 원' 광고. 시작하려면 게임 캐릭터를 코인으로 사야 한단다. 한 마리 200만 원.",
    choices: [
      { t: "게임은 게임으로", style: "calm", out: "퇴근 후 게임은 그냥 재밌게. 돈은 회사에서 번다.", eff: { mental: 1 } },
      { t: "캐릭터 하나만 사서 해 본다", style: "mid", stake: { amt: 200 }, outs: [[0.3, 0.4, "석 달 꼬박 해서 본전 조금 넘겼다. 시급으로 치면 눈물이 난다."], [0.7, -0.3, "게임 코인 값이 미끄러졌다. 캐릭터 값도 같이."]], eff: { hp: -3, mental: -1 } },
      { t: "캐릭터 열 마리로 길드를 꾸린다", style: "rash", stake: { inv: 0.15 }, outs: [[0.1, 1.2, "초반에 들어가 진짜 벌었다. 그리고 바로 뺐다."], [0.9, -0.85, "게임 코인 −95%. 캐릭터 열 마리가 픽셀 쓰레기가 됐다."]], eff: { hp: -6 } },
    ] },
  { id: "parentcoin", title: "엄마가 코인을 물어본다", w: 0.6, need: (s) => (s.fam?.parents || 0) > 0 && s.invest >= 500,
    text: "엄마한테 전화가 왔다. '동네 친구가 코인으로 돈 벌었다던데, 너 그거 할 줄 아니? 우리도 좀 넣어 볼까?'",
    choices: [
      { t: "같이 앉아 차근차근 설명한다", style: "calm", check: { stat: "num", dc: 40 }, ok: { text: "수익 인증의 함정, 수수료, 사기 수법까지 쉽게 풀어 드렸다. '우리 애가 다 컸네.'", eff: { family: 5, mental: 2 } }, ng: { text: "설명하다 목소리가 높아졌다. '알았어, 안 해'로 끝났지만 서운한 눈치다.", eff: { family: 1, mental: -1 } } },
      { t: "소액만 내 계좌로 대신 사 드린다", style: "mid", stake: { amt: 100 }, outs: [[0.4, 0.3, "조금 올라 용돈처럼 돌려드렸다. 엄마가 동네에 자랑하셨다."], [0.6, -0.35, "떨어졌다. 엄마 몰래 내 돈으로 메웠다."]], eff: { family: 2 } },
      { t: "노후 자금 일부를 코인에 넣어 드린다", style: "rash", stake: { cash: 0.3 }, outs: [[0.1, 1, "두 배가 됐다. 엄마가 동네 '코인 박사'가 됐다."], [0.9, -0.5, "반토막. 노후 자금이 녹았다. 내 돈으로 메우느라 허리가 휜다."]], eff: { family: -3, mental: -3 } },
    ] },
];

// ───────── 파티룸 꾸미기 미니게임 ─────────
// 칸마다 하나씩 고른다. 컨셉이 원하는 태그(want)와 맞을수록 별점·후기가 오른다. c: 비용(22평 기준, 만원)
export const DECOR = {
  light: { n: "조명", ic: "💡", opts: [{ n: "기본 형광등", c: 0, tags: [] }, { n: "웜톤 간접조명", c: 80, tags: ["cozy", "photo"] }, { n: "미러볼·무빙라이트", c: 120, tags: ["party"] }, { n: "핑크 네온사인", c: 60, tags: ["photo", "party"] }, { n: "강의용 밝은 LED", c: 50, tags: ["work"] }] },
  seat: { n: "소파·의자", ic: "🛋️", opts: [{ n: "접이식 의자", c: 20, tags: ["work"] }, { n: "대형 ㄷ자 소파", c: 180, tags: ["party", "cozy"] }, { n: "빈백·좌식 매트", c: 70, tags: ["cozy", "kids", "game"] }, { n: "강의용 책상 세트", c: 150, tags: ["work"] }, { n: "벨벳 소파", c: 220, tags: ["photo", "cozy"] }] },
  wall: { n: "벽", ic: "🧱", opts: [{ n: "흰 페인트", c: 30, tags: ["work"] }, { n: "파스텔 웨인스코팅", c: 120, tags: ["photo", "kids"] }, { n: "블랙 무광·네온 포인트", c: 90, tags: ["party", "game"] }, { n: "우드 패널", c: 140, tags: ["cozy"] }, { n: "화이트보드 벽", c: 60, tags: ["work"] }] },
  fun: { n: "놀거리", ic: "🎲", opts: [{ n: "없음", c: 0, tags: [] }, { n: "닌텐두·보드게임 장", c: 150, tags: ["game", "party"] }, { n: "노래방 기계", c: 200, tags: ["party"] }, { n: "빔프로젝터·스크린", c: 120, tags: ["work", "game", "cozy"] }, { n: "볼풀·미끄럼틀", c: 160, tags: ["kids"] }] },
  zone: { n: "포토존", ic: "📸", opts: [{ n: "없음", c: 0, tags: [] }, { n: "풍선 아치·이니셜", c: 70, tags: ["photo", "kids"] }, { n: "생화 벽", c: 180, tags: ["photo"] }, { n: "거울·레터링", c: 60, tags: ["photo", "party"] }, { n: "포디움·현수막 거치대", c: 50, tags: ["work"] }] },
  kitchen: { n: "주방", ic: "🍳", opts: [{ n: "전자레인지만", c: 10, tags: ["work"] }, { n: "홈카페 바", c: 140, tags: ["cozy", "photo"] }, { n: "대형 냉장고·인덕션", c: 120, tags: ["party", "kids"] }, { n: "케이터링 테이블", c: 90, tags: ["work", "party"] }] },
};
export const DECOR_WANT = {
  bridal: { photo: 2, cozy: 1 }, party: { party: 2, game: 0.6 }, home: { cozy: 2, photo: 0.6 }, game: { game: 2, party: 1 }, study: { work: 2, cozy: 0.6 },
  lecture: { work: 2 }, work: { work: 1.4, party: 0.8 }, edu: { work: 2 }, mega: { party: 2, work: 0.5 }, kids: { kids: 2, cozy: 1 },
};
// 매물 상태: 빈 공실(다 새로), 반쯤 꾸며진 자리, 기존 파티룸 시설 인수(권리금 비싸고 꾸밀 게 적음)
// 11-25 권리금(대표 기준): 300만~1,200만 사이로만, 없는 자리도 있다(none: 상권별 '권리금 없음' 확률). 계약 전에 한 번은 꼭 흥정한다(engine/pr.js nego)
export const PR_KEY = { lo: 300, hi: 1200, none: { univ: 0.15, office: 0.15, home: 0.4, hot: 0.05, under: 0.2, local: 0.5 } };
export const PR_NEGO = {
  ways: {
    data: { n: "시세 자료를 내민다", st: "num", d: "주변 권리금과 공실 기간을 숫자로 보여 준다. 숫자가 높을수록 잘 통한다" },
    talk: { n: "사정을 털어놓는다", st: "talk", d: "전 사장님 마음을 연다. 말빨이 높을수록 잘 통한다" },
    bluff: { n: "다른 매물도 본다고 떠본다", st: "sense", d: "크게 깎이거나 아예 안 통한다. 감각이 높을수록 덜 들킨다" },
  },
  // 잘 통하면 base + 능력치 몫만큼, 안 통하면 그대로. 떠보기는 통하면 30~50%, 아니면 0. 권리금이 없으면 월세를 조금(최대 8%) 깎는다
  base: [0.08, 0.15], up: 0.25, hit: [0.55, 0.4], bluff: { hit: [0.35, 0.35], cut: [0.3, 0.5] }, rentMax: 0.08,
};
export const PR_COND = {
  empty: { n: "빈 공실", cost: 1, key: 0.8, desc: "콘크리트 벽뿐. 다 새로 꾸며야 해요(꾸미기 비용 100%)" },
  half: { n: "카페 하던 자리", cost: 0.7, key: 1, desc: "조명·주방이 남아 있어요(꾸미기 비용 70%)" },
  turnkey: { n: "파티룸 시설 인수", cost: 0.35, key: 1.6, desc: "전 사장님 소품까지 그대로. 권리금이 비싸요(꾸미기 비용 35%)" },
};

// ───────── 컨설팅 첨삭 미니게임(조로식 자소서 원칙) ─────────
export const CS_QUIZ = [
  { q: "\"저는 어릴 때부터 책임감이 강했습니다. 그래서 동아리에서도...\" 첫 문장, 어떻게 고칠까?", opts: ["두괄식: '[3개월 만에 회원 40% 늘린 총무]' 소제목 + 결론부터", "더 어릴 때 이야기부터 쓴다", "책임감을 '성실함'으로 바꾼다"], a: 0, why: "인사팀은 첫 줄만 본다. 소제목과 결론이 먼저." },
  { q: "한 문항에 '봉사활동·인턴·공모전'을 다 넣어 왔다.", opts: ["셋 다 짧게 줄인다", "한 항목에 한 이야기. 직무와 제일 맞는 하나만", "봉사활동을 맨 앞으로"], a: 1, why: "One Category, One Content." },
  { q: "\"매출 향상에 크게 기여했습니다.\"", opts: ["'크게'를 '매우 크게'로", "숫자로: '3개월 매출 12% 상승(월 1,200만→1,350만)'", "그대로 둔다. 겸손해 보인다"], a: 1, why: "본론은 사실과 숫자." },
  { q: "문장이 매끈한데 '~을 통해 ~할 수 있었습니다'가 다섯 번 반복된다.", opts: ["AI 티. 사람 말투로 다시, 같은 패턴 반복 제거", "더 고급스러운 단어로 바꾼다", "그대로 제출"], a: 0, why: "AI 문체가 보이면 반드시 걸러 낸다." },
  { q: "지원동기: \"귀사의 글로벌 비전에 감명받아...\"", opts: ["회사 홈페이지 문구를 더 넣는다", "내 고민과 선택 이유를 진솔하게 + 회사 칭찬은 성장성이든 안정성이든 한 관점으로", "지원동기는 짧을수록 좋다"], a: 1, why: "인사팀은 지원동기를 잘 안 믿는다. 진솔함이 무기." },
  { q: "입사 후 포부: \"열심히 배우는 신입이 되겠습니다.\"", opts: ["회사가 얻을 이익으로: '입사 2년 안에 ○○ 업무 자동화로 월 20시간 절감'", "'최선을 다하겠습니다'를 붙인다", "존경하는 위인 명언으로 끝낸다"], a: 0, why: "회사가 궁금한 건 앞으로 줄 수 있는 이익." },
  { q: "면접 질문 \"우리 회사 단점이 뭐라고 생각하세요?\"의 의도는?", opts: ["회사를 깎아내리는지 보려고", "회사를 얼마나 공부했는지 + 문제를 보고 해결책까지 말하는지", "그냥 분위기 풀기"], a: 1, why: "질문마다 면접관이 확인하려는 의도부터 짚는다." },
  { q: "\"1분 자기소개 해 보세요\"에 고객이 성장 과정부터 말한다.", opts: ["직무와 맞는 강점 하나 → 근거 사례 → 회사 연결, 1분 안에", "더 자세하게 3분으로", "취미로 시작해 친근하게"], a: 0, why: "답변 뼈대는 결론 → 근거 → 회사 연결." },
  { q: "경력 이직 고객: \"지금 회사 너무 싫어서 일단 그만두고 준비할게요.\"", opts: ["좋아요, 시간 많을 때 해요", "선퇴사 금지. 다니면서 경력기술서 열어 두고 환승 이직", "공무원 준비를 권한다"], a: 1, why: "마음이 뜬 순간의 행동은 다 보인다. 환승 이직." },
  { q: "문과 신입이 '아무 직무나 다 넣을게요'라고 한다.", opts: ["양치기니까 좋다", "직무는 하나로 좁히고 그 직무로 회사를 많이 넣는다(직무 1개 × 회사 여러 개)", "대기업만 쓴다"], a: 1, why: "직무로 먼저 붙어야 한다. 회사는 넓게, 직무는 좁게." },
  { q: "경력기술서에 '업무 총괄'만 10줄.", opts: ["프로젝트별로: 내가 한 일 + 결과 숫자, 빈 숫자는 확인 표시", "'총괄'을 '리드'로 바꾼다", "줄 수를 20줄로 늘린다"], a: 0, why: "성과를 숫자로 뽑는다." },
  { q: "공채 일정 문의: \"자소서는 언제부터 쓰면 돼요?\"", opts: ["공고 뜨면 그때", "상반기 3~4월·하반기 9~10월 전에 미리. 이력서는 한 주 치를 몰아서 써 둔다", "1년 내내 천천히"], a: 1, why: "시즌 감각. 자소서는 양치기." },
  // 11-25 문제 12개 추가(반기에 한 번 하게 되면서, 같은 문제가 덜 겹치게)
  { q: "소제목이 '[열정과 도전]'이다.", opts: ["'[끝없는 열정과 도전]'으로 힘을 준다", "내용이 보이게: '[야간 재고 실사로 오차 3%→0.4%]'", "소제목은 빼는 게 깔끔하다"], a: 1, why: "소제목만 읽어도 무슨 이야기인지 보여야 한다. 가시성이 먼저." },
  { q: "글 마지막 문장이 \"감사합니다.\"로 끝난다.", opts: ["수미상관: 첫 문장의 역량을 회사에 줄 도움으로 다시 묶는다", "'읽어 주셔서 감사합니다'로 늘린다", "마지막 문단을 통째로 지운다"], a: 0, why: "결론은 그 역량으로 회사에 줄 도움. 수미상관으로 닫는다." },
  { q: "고객: \"편의점 알바밖에 없어서 쓸 게 없어요.\"", opts: ["없는 인턴 경험을 지어낸다", "반복되는 작은 일도 멋지게: 발주 실수 줄인 방법, 단골 응대를 숫자로", "알바 얘기는 빼고 성격 얘기만 쓴다"], a: 1, why: "작은 일도 사실과 숫자로 쓰면 역량이 된다. 꾸미지 않은 그대로의 모습." },
  { q: "\"성격의 장단점\" 문항에 장점 다섯 가지를 나열했다.", opts: ["장점 하나 + 그걸 보여 준 사건 하나로 줄인다", "일곱 가지로 늘려 풍성하게", "단점은 빼고 장점만 쓴다"], a: 0, why: "한 항목에 한 이야기. 나열하면 하나도 안 남는다." },
  { q: "지원동기 두 문단, 어떻게 나눌까?", opts: ["회사 연혁 요약 + 인재상 복붙", "내가 이 회사를 고른 이유 + 회사 칭찬(성장성이든 안정성이든 한 관점으로)", "어릴 적 꿈 + 가족 이야기"], a: 1, why: "지원동기 2문단 = 내가 택한 이유 + 회사 칭찬." },
  { q: "면접 질문 \"마지막으로 하고 싶은 말 있나요?\"의 의도는?", opts: ["면접 끝났다는 인사", "입사 의지와 준비한 깊이를 마지막으로 확인", "면접관이 쉬려고"], a: 1, why: "질문마다 의도부터 짚는다. 마지막 한마디도 답변 뼈대대로." },
  { q: "면접 답변이 2분째 이어지고 결론이 아직 없다.", opts: ["결론 → 근거 사례 → 회사 연결 순서로 다시 짠다", "더 빨리 말하게 한다", "사례를 하나 더 붙인다"], a: 0, why: "결론이 먼저. 면접관은 첫 문장으로 판단한다." },
  { q: "경력 3년 차 고객이 이력서를 1년째 안 고쳤다.", opts: ["이직할 때 한 번에 쓰면 된다", "채용 포털·원티즈·리멤바에 경력기술서를 열어 두고 분기마다 고친다", "지인 추천만 기다린다"], a: 1, why: "경력 이직은 직소싱 시대. 열어 두고 계속 업데이트한다." },
  { q: "헤드헌터 제안이 왔는데 고객이 \"귀찮아서 안 받아요\"라고 한다.", opts: ["잘했어요, 스팸이에요", "일단 받는다. 시장에서 내 값이 얼마인지 아는 정보다", "연봉부터 두 배 부른다"], a: 1, why: "취업은 정보 싸움. 제안은 적극 받는다." },
  { q: "자소서 초안 전체가 AI가 쓴 티가 난다.", opts: ["그대로 내고 운에 맡긴다", "AI는 뼈대까지만. 내 사건·내 숫자·내 말투로 다시 쓴다", "AI를 하나 더 써서 돌린다"], a: 1, why: "AI는 필수 보조 도구지만 티 나면 안 된다." },
  { q: "직무를 공부하고 싶다는 고객에게 첫 숙제는?", opts: ["그 직무 채용공고 10개를 모아 공통으로 요구하는 역량 뽑기", "현직자 브이로그 정주행", "자격증부터 따기"], a: 0, why: "직무 해부는 공고 10개에서 시작한다." },
  { q: "고객: \"이 회사 직무가 저랑 안 맞는 것 같은데 회사는 좋아요.\"", opts: ["직무가 전부다. 포기하라고 한다", "회사가 더 중요하다. 우선 붙을 수 있는 직무로 들어가고 사내 이동을 본다", "둘 다 완벽한 곳이 나올 때까지 기다린다"], a: 1, why: "회사가 직무보다 중요하다. 일은 일일 뿐, 첫 직무가 인생을 정하지 않는다." },
];

// 컨설팅 가격 단계마다 필요한 실력(핵심 능력·커리어 평균). 모자라면 환불·혹평
export const CS_PRICE_NEED = { low: 40, mid: 90, high: 140, ultra: 180 }; // v4.28 4단계: 저가 40·표준 90·프리미엄 140·초고액 180(글쓰기, 면접은 말빨)
// v4.27 강의로 방어: 섭외 문턱(후기 수)·확률·강의료(기본 + 실력·명성 비례)
export const CS_CAREER_PASS = 50; // v4.28 경력 이직(히든 길) 문: 커리어 120 · 회사 5년 · 합격자 50명
export const CS_LECT = { rev: 10, p: 0.2, fee: 50, perSkill: 0.6, perFame: 0.8, maxOffers: 3 };
// v4.25b 파이어율 조정 마지막 수단: 모든 투잡의 이번 달 이익(라이벌·시장 반영 뒤)에서 이 비율만큼 '투잡 부대비용'(교통·소모품·장비·잡비)으로 뺀다. 계산은 engine/market.js
export const SIDE_CUT = 0.15;
// v4.27 투잡별 부대비용(음수면 보너스). 없으면 SIDE_CUT. CRUISE: 같은 투잡 7년 차부터 줄어 10년 차에 v만큼 덜 뗀다(단골·입소문으로 순항)
export const SIDE_ADJ = { pr: -0.12, cs: 0.48, cs_career: 0.76, airbnb: -0.95, ucafe: -0.46, tutoring: 0.18, chicken: 0.25, insta: 0.39, vibe: 0.06, tarot: -0.15, webnovel: -0.3 };
export const CRUISE = { from: 7, full: 10, v: 0.25 };
// v4.27 투자 국면: 보통 → 하락장(b) → 회복장(r). 하락장은 평균 66달에 한 번, 9~16달 동안 월 −3%, 회복장 18~30달 동안 월 +1.2%
export const INV_PH = { p: 1 / 66, bear: [9, 16], bearMu: -0.03, rec: [18, 30], recMu: 0.012, sideChurn: 0.5 };

// ───────── 에어씨앤씨 ─────────
// city: 서울(합법 등록=외국인관광 도시민박업, 외국인만), 지방은 농어촌민박으로 누구나. far: 집에서 거리(관리 행동력)
export const AB_REGIONS = {
  hongdae: { n: "홍대·연남", city: true, house: true, rent: [90, 150], adr: 10, foreign: 0.75, peak: [4, 10, 12], far: 0, types: ["oneroom", "tworoom", "officetel"], tip: "외국인 배낭여행객 1번지. 오피스텔은 등록이 안 돼요" },
  seongsu: { n: "성수", city: true, house: true, rent: [120, 190], adr: 12, foreign: 0.6, peak: [5, 10, 12], far: 0, types: ["tworoom", "officetel"], tip: "팝업 구경 온 외국인. 투룸이 잘 나가요" },
  jongno: { n: "종로 한옥", city: true, house: true, rent: [210, 320], adr: 18, foreign: 0.85, peak: [4, 5, 10], far: 0, types: ["hanok"], tip: "외국인이 제일 좋아하는 한옥. 월세·관리비가 비싸요" },
  busan: { n: "부산 해운대", city: false, house: true, rent: [100, 160], adr: 11, foreign: 0.4, peak: [7, 8], off: 0.55, far: 3, types: ["tworoom", "officetel"], tip: "여름 한철. 멀어서 관리가 힘들어요" },
  jeju: { n: "제주 독채", city: false, house: true, rent: [90, 150], adr: 13, foreign: 0.2, peak: [7, 8, 10], off: 0.6, far: 4, types: ["detached"], tip: "가족 여행객. 1박 단가 높고, 엄청 멀어요" },
  gyeongju: { n: "경주 한옥", city: false, house: true, rent: [70, 120], adr: 11, foreign: 0.3, peak: [4, 10], off: 0.6, far: 3, types: ["hanok"], tip: "벚꽃·단풍 시즌에 몰려요" },
};
export const AB_TYPES = {
  oneroom: { n: "원룸", rentF: 1, adrF: 0.85, setup: 500, len: 2.5 },
  tworoom: { n: "투룸", rentF: 1.5, adrF: 1.25, setup: 900, len: 3 },
  officetel: { n: "오피스텔", rentF: 1.2, adrF: 1.05, setup: 600, len: 2.5 },
  hanok: { n: "한옥", rentF: 1, adrF: 1.3, setup: 1500, len: 2.5 },
  detached: { n: "독채", rentF: 1.3, adrF: 1.4, setup: 1800, len: 3 },
};
export const AB_SEASON = [0.85, 0.85, 0.95, 1.1, 1.05, 0.95, 1.15, 1.2, 1.0, 1.15, 0.9, 1.05];

// ───────── 무인카페 ─────────
export const UC_AREAS = {
  apt: { n: "아파트 단지 상가", traffic: 1.0, rent: [120, 180], comp: 2, tip: "엄마들 아침 테이크아웃·학원 픽업 대기. 안정적이에요" },
  univ: { n: "대학가", traffic: 1.3, rent: [150, 240], comp: 4, tip: "밤샘 공부족. 많이 팔리지만 경쟁이 세요" },
  office: { n: "오피스가", traffic: 1.5, weekend: 0.2, rent: [170, 270], comp: 4, tip: "평일 점심 줄, 주말은 텅 비어요(주말 손님 평일의 20%)", risk: "주말 손님 거의 없음: 한 달 매출이 평일 22일에 달려 있어요. 연휴·명절이 낀 달은 크게 빠져요" }, // 11-21: 원래 traffic 1.15, comp 5, 주말 구분 없음
  academy: { n: "학원가", traffic: 1.2, rent: [140, 210], comp: 3, tip: "학생 손님 많음. 먹튀·10대 아지트 주의" },
  newtown: { n: "신도시 1층", traffic: 0.8, rent: [100, 160], comp: 1, tip: "싸고 경쟁 없음. 대신 손님도 적어요" },
};
export const UC_SEASON = [0.85, 0.85, 0.95, 1.05, 1.15, 1.25, 1.35, 1.35, 1.1, 1.0, 0.9, 0.9];

// ───────── v4.28 파티룸·에어씨앤씨 타이쿤 규칙: 가격·후기·관리비·명의 (밸런스는 여기 숫자만 바꾸면 된다) ─────────
// 가격: 경쟁사도 성수기엔 올리고 비수기엔 내린다(시세 배율). 에어씨앤씨 가격 탄력성(성수기 낮고 비수기 높다). 가격 전쟁.
export const PRICE_K = {
  compPeak: { dec: 1.05, peak: 1.03, off: 0.98 },
  abEl: { peak: 0.8, mid: 1.2, off: 1.5 },
  abPeak: [1, 1.2, 1.4, 1.7], // 에어씨앤씨 성수기 1박 가격 버튼
  war: { p: 0.012, cut: [0.12, 0.2], len: [2, 4], gap: 10, follow: 0.12, premium: 0.08 }, // 가격 전쟁: 월 확률·경쟁사 인하폭·기간·간격·따라 내리는 폭·프리미엄 인상폭
};
// 후기: 예약(숙박)마다 후기를 쓰는 비율, 후기 이벤트(페이백·할인), 후기 수 효과, 플랫폼 상위 노출, 답글 밀림
export const PR_REVIEW = {
  base: 0.22, abBase: 0.45, // 이벤트 없을 때 후기 쓰는 비율(파티룸 예약당·에어 숙박당)
  ev: {
    none: { n: "안 함", rate: 0, pay: 0, buzz: 0, desc: "후기를 따로 부탁하지 않아요" },
    pay5: { n: "페이백 5천", rate: 0.14, pay: 0.5, buzz: 0, desc: "후기 쓰면 5천 원 돌려줘요. 후기 수가 빨리 늘어요" },
    photo: { n: "사진 후기 1만", rate: 0.1, pay: 1, buzz: 0.6, desc: "사진 후기에 1만 원. 후기는 덜 늘지만 입소문이 크게 올라요" },
    disc: { n: "재방문 10% 할인", rate: 0.1, pay: 0, disc: 0.035, rebook: 0.04, desc: "후기 남기면 다음 예약 10% 할인. 매출 3~4%를 깎아 주고 단골 예약이 늘어요" },
  },
  cntLo: 0.88, cntN: 60, abCntN: 40, // 후기 0개면 예약 ×0.88, cntN개 이상이면 ×1
  top: { n: 50, star: 4.8, occ: 0.05 }, // 플랫폼 상위 노출: 후기 50개 + 별점 4.8 → 예약 +5%
  abSuperN: 10, // 에어 슈퍼호스트: 별점 4.8 + 후기 10개
  unrep: { max: 30, star: 0.05 }, // 답글 안 단 후기가 30개를 넘으면 별점 목표 −0.05
  reply: { star: 0.04, manageCut: 0.4 }, // 답글 달기: 그 달 별점 목표 +0.04 / 관리(청소)할 때도 밀린 답글 40%를 처리
  evP: 0.08, evGap: 4, // 후기 사건 확률(달마다)·최소 간격
  fake: 0.25, // 페이백 후기를 숨기면 플랫폼 적발 확률(정책 경고 장면)
};
// 쓰는 만큼 늘어나는 관리비(만 원, 파티룸은 22평 기준·예약 1건당 / 에어는 1박당). 장부 '전기·난방비'
export const UTIL_K = {
  pr: { base: 8, per: 0.32, ondol: 0.55, boiler: 0.35, air: 0.45, ac: 0.3 }, // 기본 + 예약당 전기·수도 + 겨울 온돌/보일러/냉난방기 + 여름 에어컨
  ab: { base: 6, per: 0.45, heat: 0.35, ac: 0.3 },
  // 11-25 대표: 여름 한철·겨울 한철엔 수도광열비가 크게 나온다(손님이 없어도 냉난방을 돌려 둔다). 달마다 더하는 기본료(만원, 22평·물가 기준)
  season: { 1: 16, 2: 12, 5: 3, 6: 9, 7: 16, 8: 16, 9: 4, 11: 4, 12: 14 },
};
// 11-25 대표: 예약이 늘면 청소비도 는다. 직접 청소해도 예약 1건마다 소모품·쓰레기 처리비(만원)
export const PR_COST = { selfClean: 1.0 };
// 11-25 대표: 마케팅비 월 10~40만(지점마다). 안 쓰면 손님이 줄고, 그달 홍보 행동을 했으면 덜 준다. 에어씨앤씨도 같은 표(숙소마다)
export const PR_AD = [
  { n: "안 함", fee: 0, occ: 0.8, d: "광고 없이. 그달 홍보를 하면 덜 빠져요" },
  { n: "기본", fee: 10, occ: 0.93, d: "체험단·블로그 몇 건" },
  { n: "꾸준히", fee: 25, occ: 1, d: "플랫폼 광고를 매달" },
  { n: "공격적으로", fee: 40, occ: 1.06, d: "상위 노출까지" },
];
export const PR_AD_SELF = 0.9; // 광고 없이 그달 홍보 행동(인별·블로그 등)을 했을 때
// 에어씨앤씨 명의: 시작 후 약 2년에 '법이 바뀐다'(합법 등록만, 1명 1채) → 유예 기간 안에 명의를 모으거나 줄이거나 버틴다
// kinds: 명의를 빌린 사람 종류별 용돈(월, 만 원)·해마다 인상·밀릴 때 호감 하락·회수 위험·실거주 점검 확률
export const AB_NAME = {
  at: [21, 27], grace: 6, // 첫 숙소 연 지 21~27달 뒤 경고, 유예 6달
  holdRaid: 2, // (v4.28 밸런스 3→2) 법 시행 뒤 미등록 숙소 단속 배율
  parentsMax: 3, // 부모님 주소는 숙소 3채 이하일 때(부모님 두 분 = 명의 2개)
  ask: { base: 0.22, aff: 1 / 120, talk: 1 / 250, plus: 0.22, plusFee: 1.5, cool: 3, failAff: -3, mateParent: 0.4 }, // 설득 확률·사례비 얹기·재부탁 간격
  kinds: {
    parents: { n: "부모님", fee: 8, raise: 0, lateAff: -1, recallLate: 8, recallP: 0.001, haggle: 0, inspect: 0.003, fam: -4 },
    spouse: { n: "배우자", fee: 5, raise: 0, lateAff: -2, recallLate: 6, recallP: 0.002, haggle: 0, inspect: 0.002, fam: -6 },
    mate: { n: "동료", fee: 25, raise: 0.12, lateAff: -8, recallLate: 2, recallP: 0.012, haggle: 0.025, inspect: 0.004, fam: 0 },
    mateParent: { n: "동료의 부모님", fee: 30, raise: 0.12, lateAff: -8, recallLate: 2, recallP: 0.015, haggle: 0.025, inspect: 0.005, fam: 0 },
    friend: { n: "친구", fee: 22, raise: 0.1, lateAff: -7, recallLate: 2, recallP: 0.01, haggle: 0.02, inspect: 0.004, fam: 0 },
    broker: { n: "명의 브로커", fee: 30, raise: 0.1, lateAff: 0, recallLate: 1, recallP: 0.02, haggle: 0.02, inspect: 0.01, fam: 0 },
  },
  haggleUp: [0.2, 0.4], // '더 달라' 협상 요구 폭
  insp: { fine: [300, 800], ban: 2, aff: -25, fam: -10 }, // 실거주 점검 적발: 과태료·영업정지·명의자 호감·가족
};
