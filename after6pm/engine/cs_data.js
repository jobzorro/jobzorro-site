// 취업컨설팅 "가격대별 상품 + 사람별 합격 전략" 자료(11-27, 스위치 defs.js CS2_ON).
// 이 파일에는 자료만 둔다. 줄을 더하면 게임에 그대로 늘어난다(엔진 cs.js 는 꼬리표만 맞춘다).
// - 실제 회사·기관·사람 이름을 쓰지 않는다. 회사는 업종·규모로만 적는다(python tools/brands.py --check).
// - 방법론 카드의 이름과 설명은 대표의 실제 방법론(작업 지침 3·4절)에서 뽑았다.
// - 통과율·경쟁률 숫자는 게임 속 설정이다. 실제 통계가 아니다.
// 꼬리표는 세 가지다. ① 카드가 "해 주는 일"(막힌 곳을 푼다) ② 카드의 "성질"(금기에 걸린다) ③ 회사·직무가 "알아주는 것"(맞으면 통과율 +)

// ── 분야 다섯 ── light: 가볍게 파는 분야(지금 방식 그대로) · niche: 문의가 들어오는 포지션(defs.js NICHES 열쇠)
// 가격(오늘 값, 만원. 물가는 엔진이 따로 곱한다): std 표준 · prem 프리미엄 · top 최고가 다섯 칸(플레이어가 고른다)
export const FIELDS = {
  essay: { n: "자기소개서", niche: "newgrad", light: true, tiers: ["low", "mid"], d: "저가 ~ 보통까지만. 고가가 없어요. 지금처럼 가볍게 봐요" },
  interview: { n: "면접", niche: "interview", light: true, tiers: ["low", "mid", "high"], d: "저가 ~ 프리미엄. 프리미엄부터는 사람별 전략(면접 중심 간이판)이에요" },
  total: { n: "종합컨설팅", niche: null, price: { std: [110, 125, 145, 165, 180], prem: [180, 200, 225, 250, 270], top: [300, 375, 450, 525, 600] }, dem: 1, d: "자기소개서 + 면접 + 멘탈 관리 + 여러 전형 대비. 사람마다 합격 전략을 짜요" },
  public: { n: "공기업컨설팅", niche: "public", price: { std: [100, 115, 130, 145, 160], prem: [160, 180, 200, 220, 240], top: [300, 350, 400, 450, 500] }, dem: 0.9, d: "NCS 필기 계획과 기관별 필기·면접 유형. 종합·이직보다 조금 덜 벌어요" },
  move: { n: "이직컨설팅", niche: "career", price: { std: [120, 140, 160, 180, 200], prem: [200, 225, 250, 275, 300], top: [300, 400, 500, 600, 700] }, dem: 1, d: "종합만 있어요. 값이 가장 비싸요" },
};
export const TIER_N = { low: "저가", mid: "보통", high: "프리미엄", mini: "면접 프리미엄", std: "표준", prem: "프리미엄", top: "최고가" };
export const STRAT = ["total", "public", "move"]; // 사람별 전략 전체를 짜는 분야

// ── 전략 칸 ── cap: 등급별로 그 칸에 넣을 수 있는 카드 수
export const SLOTS = [
  { id: "diag", n: "진단", cap: { mini: 1, std: 1, prem: 2, top: 2 } },
  { id: "goal", n: "목표 정하기", cap: { mini: 0, std: 1, prem: 1, top: 1 } },
  { id: "doc", n: "서류", cap: { mini: 0, std: 1, prem: 2, top: 3 } },
  { id: "int", n: "면접", cap: { mini: 2, std: 1, prem: 2, top: 2 } },
  { id: "ops", n: "지원 운영", cap: { mini: 0, std: 1, prem: 1, top: 2 } },
  { id: "mind", n: "멘탈 관리", cap: { mini: 1, std: 1, prem: 1, top: 2 } },
];
// 공기업은 칸 이름과 순서가 다르다(진단 → 기관 고르기 → NCS 필기 계획 → 블라인드 서류 → 기관별 면접 + 멘탈)
export const SLOTS_PUB = [
  { id: "diag", n: "진단", cap: { std: 1, prem: 2, top: 2 } },
  { id: "goal", n: "기관 고르기", cap: { std: 1, prem: 1, top: 1 } },
  { id: "ncs", n: "NCS 필기 계획", cap: { std: 1, prem: 2, top: 3 } },
  { id: "doc", n: "블라인드 서류", cap: { std: 1, prem: 1, top: 2 } },
  { id: "int", n: "기관별 면접", cap: { std: 1, prem: 2, top: 2 } },
  { id: "mind", n: "멘탈 관리", cap: { std: 1, prem: 1, top: 2 } },
];

// ── 꼬리표 이름(화면에 보이는 말) ──
export const TAGS = {
  // 해 주는 일
  narrow: "직무 좁히기", dig: "경험 끌어내기", head: "두괄식·소제목", one: "한 항목 한 이야기", fact: "사실과 숫자", fit111: "능력-경험-문항 맞춤",
  motive: "지원동기 두 문단", number: "성과 숫자", deai: "AI 티 걷어내기", volume: "양치기", season: "시즌 맞추기", open: "이력서 열어 두기",
  hunter: "헤드헌터 제안", ref: "지인 추천", deadline: "마감 관리", intent: "질문 의도 짚기", script: "1분 자기소개", tail: "꼬리질문 대비", boss: "팀장의 고민",
  mock: "모의 면접", calm: "긴장 풀기", soft: "돌려 말하기", retry: "탈락 복기", family: "보호자 면담", stay: "환승 이직", rate: "통과율 숫자(설득 근거)",
  newform: "새 전형 대비", task: "과제 전형", port: "포트폴리오", aiint: "AI 면접",
  ncs: "NCS 기본기", ncs2: "약한 영역 보강", speed: "시간 관리", major: "전공 필기", blind: "블라인드 서류", jdmatch: "직무기술서 맞춤", orgpick: "기관 가려 넣기", orgint: "기관별 면접 유형", situ: "상황·토론 면접",
  // 성질(금기에 걸리는 쪽)
  blunt: "직설", pressure: "압박",
};
export const RISK = ["blunt", "pressure"];

// ── 막힌 곳 ── say: 겉으로 하는 말(다들 "서류가 안 붙어요"로 시작한다) · at: 깎이는 곳(doc 서류 · int 면접 · apps 지원 수 · wr 필기) · pen: 못 풀면 깎이는 비율 · fix: 이 꼬리표 가운데 하나면 풀린다
export const BLOCKS = {
  nojob: { n: "직무를 못 정함", say: "어느 직무든 괜찮아요", at: "doc", pen: 0.3, fix: ["narrow"] },
  high: { n: "눈높이가 스펙과 안 맞음", say: "거기 아니면 안 가요", at: "goal", pen: 0, fix: [] }, // 목표 칸에서 설득으로 푼다
  mute: { n: "경험은 있는데 못 꺼냄", say: "쓸 얘기가 없어요", at: "both", pen: 0.28, fix: ["dig", "fit111"] },
  vague: { n: "자소서가 두루뭉술", say: "열심히 썼는데요", at: "doc", pen: 0.32, fix: ["head", "fact"] },
  three: { n: "한 항목에 이야기 셋", say: "다 넣어야 할 것 같아서요", at: "doc", pen: 0.28, fix: ["one"] },
  ai: { n: "AI 티", say: "AI로 다듬기만 했어요", at: "doc", pen: 0.4, fix: ["deai"] },
  noapply: { n: "지원을 안 함(완벽주의)", say: "아직 준비가 덜 됐어요", at: "apps", pen: 0.65, fix: ["volume"] },
  praise: { n: "지원동기가 회사 칭찬뿐", say: "회사가 좋아서요", at: "doc", pen: 0.25, fix: ["motive"] },
  intent: { n: "질문 의도를 못 읽음", say: "면접만 가면 떨어져요", at: "int", pen: 0.38, fix: ["intent", "tail"] },
  blank: { n: "긴장하면 하얘짐", say: "머리가 하얘져요", at: "int", pen: 0.35, fix: ["calm", "mock"] },
  nonum: { n: "경력기술서에 숫자가 없음", say: "한 일은 많은데요", at: "doc", pen: 0.35, fix: ["number"] },
  quitfirst: { n: "퇴사부터 하려 함", say: "일단 그만두고 준비할게요", at: "doc", pen: 0.25, fix: ["stay"] }, // 못 말리면 공백이 생긴다
  // 공기업
  pncs: { n: "NCS 점수가 안 나옴", say: "필기에서 계속 떨어져요", at: "wr", pen: 0.45, fix: ["ncs", "ncs2"] },
  ptime: { n: "시간 안에 못 풂", say: "뒤쪽 문제는 찍어요", at: "wr", pen: 0.35, fix: ["speed"] },
  pblind: { n: "블라인드 서류에 스펙 얘기", say: "학교 얘기를 빼면 쓸 게 없어요", at: "doc", pen: 0.4, fix: ["blind"] },
  pall: { n: "기관을 가리지 않고 다 넣음", say: "공기업이면 어디든요", at: "wr", pen: 0.3, fix: ["orgpick"] },
  pint: { n: "기관 면접 유형을 모름", say: "면접이 기관마다 달라요?", at: "int", pen: 0.35, fix: ["orgint", "situ"] },
};

// ── 사람 ── f: 나오는 분야 · spec: 스펙(1~5) 범위 · apps: 평소 한 시즌 지원 수 · bl: 막힌 곳 후보 · co: 원하는 회사 유형 후보(앞쪽일수록 자주)
export const PEOPLE = {
  lib: { n: "문과 신입", f: ["total", "public", "mini"], spec: [2, 3.5], apps: 10, bl: ["vague", "three", "ai", "praise", "nojob", "mute", "intent"], co: ["hq", "hq", "aff", "fin", "retail", "it"] },
  mid: { n: "중고신입", f: ["total", "mini"], spec: [3, 4], apps: 9, bl: ["mute", "three", "praise", "intent", "nojob", "quitfirst"], co: ["hq", "aff", "fin", "it", "foreign"] },
  long: { n: "장기 취준 2년 차", f: ["total", "public", "mini"], spec: [2, 3], apps: 6, bl: ["noapply", "ai", "vague", "blank", "praise"], co: ["hq", "hq", "fin", "aff"] },
  pub: { n: "공기업 준비생", f: ["public"], spec: [2, 4], apps: 4, bl: [], co: [] },
  mv3: { n: "3~5년 차 이직", f: ["move"], spec: [3, 4.5], apps: 6, bl: ["nonum", "quitfirst", "intent", "praise", "mute"], co: ["hq", "aff", "it", "fin", "foreign"] },
  mv7: { n: "7~10년 차 이직", f: ["move"], spec: [3.5, 5], apps: 4, bl: ["nonum", "quitfirst", "noapply", "intent"], co: ["hq", "foreign", "it", "fin", "midm"] },
  shift: { n: "직무를 바꾸려는 사람", f: ["total", "move"], spec: [2.5, 4], apps: 7, bl: ["nojob", "mute", "nonum", "three", "praise"], co: ["aff", "it", "retail", "midm", "startup"] },
  parent: { n: "부모가 결제한 취준생", f: ["total", "public"], spec: [2, 3.5], apps: 5, bl: ["noapply", "nojob", "vague", "blank", "ai"], co: ["hq", "hq", "fin", "aff"] },
};
export const PUB_BL = ["pncs", "ptime", "pblind", "pall", "pint", "blank", "vague"]; // 공기업 분야에서는 이 가운데서 뽑는다

// ── 성향 ── per: 설득 확률에 더하는 값 · taboo: 이 꼬리표를 쓰면 떠난다(soft 꼬리표가 같이 있으면 괜찮다) · need: 이 꼬리표가 없으면 지원 수가 준다
export const TEMPERS = {
  fragile: { n: "팩트를 못 견디는 사람", d: "직설로 현실을 말하면 떠나요", per: -0.05, taboo: "blunt" },
  ghost: { n: "잠수 타는 사람", d: "마감 관리가 먼저예요. 없으면 지원 수가 반이 돼요", per: 0, need: "deadline" },
  note: { n: "뭐든 받아 적는 사람", d: "설득은 쉬워요. 다만 통째로 외우게 하면 외운 티가 나요", per: 0.15, weak: "script" },
  know: { n: "다 아는 사람", d: "말로는 안 넘어와요. 통과율 숫자를 보여 줘야 해요", per: -0.18, want: "rate" },
};

// ── 회사 유형(도감) ── bar: 요구 스펙(1~5) · want: 알아주는 꼬리표 · roll: 수시 채용(결과가 빨리 나온다) · down: 눈높이를 한 칸 내리면 가는 곳
export const COS = {
  hq: { n: "대기업 본사", bar: 4.6, want: ["head", "fit111", "intent"], down: "aff", tip: "공채 시즌에 몰려요. 두괄식과 문항 맞춤이 기본기예요" },
  aff: { n: "대기업 계열사", bar: 3.8, want: ["motive", "fit111", "boss"], down: "midm", tip: "들어가면 사내 이동의 문이 있어요. 지원동기를 믿게 써야 해요" },
  midm: { n: "중견 제조", bar: 2.9, want: ["fact", "number", "intent"], down: "startup", tip: "꾸미지 않은 사실과 숫자를 알아줘요" },
  fin: { n: "금융(은행·캐피탈·증권)", bar: 4.2, want: ["number", "fact", "tail"], down: "midm", tip: "숫자와 자격을 봐요. 꼬리질문이 길어요" },
  foreign: { n: "외국계", bar: 3.9, want: ["number", "open", "script"], roll: true, down: "midm", tip: "수시 채용이에요. 이력서를 열어 두면 제안이 와요" },
  retail: { n: "유통·커머스", bar: 3.1, want: ["fact", "one", "boss"], down: "startup", tip: "현장 숫자와 한 가지 이야기를 좋아해요" },
  it: { n: "IT 플랫폼", bar: 4.0, want: ["task", "port", "boss"], roll: true, down: "startup", tip: "과제·포트폴리오 전형이 많아요. 수시로 뽑아요" },
  startup: { n: "스타트업", bar: 2.3, want: ["port", "open", "fact"], roll: true, down: "startup", tip: "빨리 뽑고 빨리 결정해요" },
};
// ── 직무(도감) ── comp: 경쟁 가중(요구 스펙에 더한다) · want: 알아주는 꼬리표
export const JOBS = {
  plan: { n: "기획", comp: 0.4, want: "head" }, fin: { n: "재무", comp: 0.1, want: "number" }, hr: { n: "인사", comp: 0.4, want: "motive" }, buy: { n: "구매", comp: -0.1, want: "number" },
  sales: { n: "영업", comp: -0.5, want: "fact" }, mkt: { n: "마케팅", comp: 0.3, want: "port" }, md: { n: "MD", comp: 0.1, want: "fact" }, pm: { n: "PM", comp: 0.2, want: "task" },
};
// ── 공기업 기관 유형(도감) ── bar: 필기 합격선(1~5) · w: 필기 결(mod 모듈형 · psat 자료·추리형 · major 전공 비중 큼) · iv: 면접 결 · down: 기관을 낮추면 가는 곳
export const ORGS = {
  energy: { n: "에너지 공기업", bar: 4.2, w: "major", iv: "situ", down: "infra", tip: "전공 필기 비중이 커요. 경쟁이 세요" },
  finp: { n: "금융 공기업", bar: 4.7, w: "major", iv: "orgint", down: "agency", tip: "전공과 논술까지 봐요. 가장 높아요" },
  infra: { n: "사회기반시설 공단", bar: 3.5, w: "psat", iv: "situ", down: "local", tip: "자료 해석과 시간 싸움이에요" },
  agency: { n: "공공기관", bar: 3.3, w: "mod", iv: "orgint", down: "local", tip: "기본기 문제가 많아요. 기관별 면접 유형을 타요" },
  local: { n: "지방 공기업", bar: 2.6, w: "mod", iv: "orgint", down: "local", tip: "합격선은 낮지만 근무지를 받아들여야 해요" },
};
export const W_N = { mod: "기본기형", psat: "자료·추리형", major: "전공 비중 큼" };

// ── 방법론 카드 ── slot: 들어가는 칸 · f: 쓸 수 있는 분야(없으면 전부, pub 공기업만, biz 사기업·이직만) · tags: 꼬리표
// get: 얻는 길(start 처음부터 · pass 합격 누적 · sp 전략 고객 합격 · fail 불합격 누적 · lect 강의 횟수 · blog 블로그 글 · tmpl 템플릿 · vod 책·VOD · form 전형 대응도 · career 이직 분야 · pub 공기업 분야 · rev 후기)
// per: 목표를 바꾸는 카드(설득 판정이 붙는다. 값은 설득 난이도) · ap: 쓸 때 드는 행동력 · rev: 드러내 주는 것(bl 막힌 곳 · tmp 성향 · int 면접 쪽만 · doc 서류 쪽만)
export const CARDS = [
  // 진단
  { id: "d_talk", slot: "diag", n: "첫 상담 듣기", d: "하고 싶은 말을 끝까지 듣는다. 위험은 없지만 드러나는 것도 없다", tags: [], get: { start: 1 } },
  { id: "d_spec", slot: "diag", n: "스펙 현실 점검", d: "나이·학교·학과·시즌은 못 바꾼다. 바꿀 수 있는 것부터 가른다", tags: ["blunt"], rev: ["bl1"], get: { start: 1 } },
  { id: "d_dig", slot: "diag", n: "경험 인터뷰", d: "AI를 인터뷰어로 세워 '요구 역량 × 내 경험' 표를 만든다", tags: ["dig"], rev: ["bl", "tmp"], ap: 1, get: { pass: 5 } },
  { id: "d_rate", slot: "diag", n: "서류 통과율 계산", d: "지금 눈높이로 몇 곳을 넣으면 몇 곳이 붙는지 숫자로 보여 준다", tags: ["rate"], get: { pass: 10 } },
  { id: "d_autopsy", slot: "diag", n: "탈락 서류 해부", d: "떨어진 서류를 인사팀 눈으로 한 줄씩 본다. 아프지만 정확하다", tags: ["blunt", "fact"], rev: ["doc"], get: { fail: 6 } },
  { id: "d_mock", slot: "diag", n: "첫 모의 면접", d: "질문 다섯 개만 던져 본다. 면접에서 막히는 곳과 성향이 보인다", tags: ["mock"], rev: ["int", "tmp"], get: { blog: 12 } },
  { id: "p_test", slot: "diag", f: "pub", n: "NCS 모의고사 진단", d: "영역별 점수를 먼저 잰다. 필기에서 막히는 곳이 드러난다", tags: [], rev: ["wr", "bl1"], get: { pub: 1 } },
  // 목표 정하기
  { id: "g_keep", slot: "goal", n: "원하는 곳 그대로", d: "본인이 바라는 눈높이대로 간다. 설득은 필요 없다", tags: [], get: { start: 1 } },
  { id: "g_narrow", slot: "goal", f: "biz", n: "직무 먼저 좁히기", d: "일은 일일 뿐. 붙을 직무 하나를 먼저 정한다", tags: ["narrow"], per: -0.25, keep: 1, get: { start: 1 } },
  { id: "g_jd", slot: "goal", f: "biz", n: "공고 열 개 해부", d: "채용공고 열 개에서 실제 업무와 공통 요구 역량을 뽑는다", tags: ["narrow", "fit111"], per: -0.3, keep: 1, get: { blog: 20 } },
  { id: "g_down", slot: "goal", f: "biz", n: "눈높이 한 칸 내리기", d: "붙을 곳으로 눈높이를 옮긴다. 가장 어려운 설득이다", tags: [], per: 0.12, to: "down", get: { pass: 8 } },
  { id: "g_side", slot: "goal", f: "biz", n: "계열사로 들어가 사내 이동", d: "회사가 직무보다 중요하다. 좋은 회사에 들어가면 사내 이동의 문이 생긴다", tags: [], per: 0, to: "aff", only: "hq", get: { sp: 3 } },
  { id: "g_job", slot: "goal", f: "biz", n: "붙을 직무로 그 회사에", d: "우선 그 직무로 붙어야 한다. 경쟁이 덜한 직무로 같은 회사를 노린다", tags: ["narrow"], per: 0.05, to: "job", get: { sp: 6 } },
  { id: "g_stay", slot: "goal", f: "move", n: "환승 이직", d: "선퇴사 금지. 다니면서 옮긴다. 마음이 뜬 티는 다 보인다", tags: ["stay"], per: 0, keep: 1, get: { career: 1 } },
  { id: "p_keep", slot: "goal", f: "pub", n: "원하는 기관 그대로", d: "본인이 바라는 기관만 넣는다", tags: [], get: { pub: 1 } },
  { id: "p_pick", slot: "goal", f: "pub", n: "필기 결이 맞는 기관으로", d: "기관마다 필기 결이 다르다. 내 점수가 나오는 결로 고른다", tags: ["orgpick"], per: -0.1, keep: 1, get: { pub: 1 } },
  { id: "p_down", slot: "goal", f: "pub", n: "합격선 한 칸 아래 기관", d: "경쟁률과 합격선을 보고 한 칸 내린다. 근무지를 받아들여야 한다", tags: ["orgpick"], per: 0.1, to: "down", get: { sp: 4 } },
  // 서류
  { id: "s_head", slot: "doc", n: "두괄식과 소제목", d: "인사팀은 사람이다. 한 장을 보는 시간은 짧다. 첫 문장과 소제목으로 보이게 한다", tags: ["head"], get: { start: 1 } },
  { id: "s_one", slot: "doc", n: "한 항목 한 이야기", d: "한 항목에는 한 가지 이야기만. 셋을 넣으면 하나도 안 남는다", tags: ["one"], get: { start: 1 } },
  { id: "s_fact", slot: "doc", n: "사실과 숫자로 쓰기", d: "본론은 명확한 사실과 숫자. 꾸미지 않은 그대로의 모습", tags: ["fact"], get: { pass: 3 } },
  { id: "s_motive", slot: "doc", f: "biz", n: "지원동기 두 문단", d: "인사팀은 지원동기를 잘 안 믿는다. 내가 택한 이유 한 문단, 회사 이야기 한 문단", tags: ["motive"], get: { pass: 6 } },
  { id: "s_111", slot: "doc", n: "능력-경험-문항 1:1:1", d: "직무에 필요한 능력 하나에 경험 하나, 문항 하나를 맞춘다", tags: ["fit111"], get: { pass: 14 } },
  { id: "s_deai", slot: "doc", n: "AI 티 걷어내기", d: "AI는 필수 보조 도구지만 티 나면 안 된다. AI 문체를 걸러 낸다", tags: ["deai"], get: { rev: 12 } },
  { id: "s_num", slot: "doc", f: "biz", n: "숫자로 쓰는 경력기술서", d: "한 일을 성과 숫자로 뽑는다. 빈 숫자는 확인해서 채운다", tags: ["number", "fact"], get: { career: 1 } },
  { id: "s_small", slot: "doc", n: "작은 일도 멋지게", d: "반복되는 작은 일도 쓰는 법이 있다. 수미상관으로 마무리한다", tags: ["dig", "one"], get: { tmpl: 2 } },
  { id: "n_task", slot: "doc", f: "biz", n: "과제 전형 풀이", d: "직무 과제를 미리 풀어 보고 답의 뼈대를 잡는다", tags: ["newform", "task"], get: { form: 25 } },
  { id: "n_port", slot: "doc", f: "biz", n: "포트폴리오 한 장", d: "문과 직무도 포트폴리오를 낸다. 성과를 한 장으로 보여 준다", tags: ["newform", "port"], get: { form: 50 } },
  { id: "p_blind", slot: "doc", f: "pub", n: "블라인드 자소서", d: "학교와 스펙을 지우고 경험으로만 쓴다", tags: ["blind", "one"], get: { pub: 1 } },
  { id: "p_jd", slot: "doc", f: "pub", n: "직무기술서에 맞춰 쓰기", d: "기관이 낸 직무 설명의 낱말에 내 경험을 하나씩 맞춘다", tags: ["jdmatch", "fit111"], get: { sp: 5 } },
  // NCS 필기 계획(공기업)
  { id: "p_base", slot: "ncs", f: "pub", n: "기본서 회독 계획", d: "영역별 기본기를 석 달로 나눠 돌린다", tags: ["ncs"], get: { pub: 1 } },
  { id: "p_time", slot: "ncs", f: "pub", n: "시간 재고 풀기", d: "매주 한 번 시간을 재고 푼다. 버릴 문제를 고르는 연습", tags: ["speed"], get: { pub: 1 } },
  { id: "p_weak", slot: "ncs", f: "pub", n: "약한 영역만 파기", d: "모의고사 점수에서 가장 낮은 영역 하나에 시간을 몰아 준다", tags: ["ncs2"], get: { sp: 3 } },
  { id: "p_major", slot: "ncs", f: "pub", n: "전공 필기 병행", d: "전공을 보는 기관이면 전공 시간을 따로 잡는다", tags: ["major"], get: { sp: 8 } },
  // 면접
  { id: "i_intent", slot: "int", n: "질문 의도 짚기", d: "질문마다 면접관이 확인하려는 것을 먼저 짚고 답에 그것을 담는다", tags: ["intent"], get: { start: 1 } },
  { id: "i_1min", slot: "int", n: "1분 자기소개", d: "결론, 근거 사례, 회사 연결 순서로 1분을 만든다", tags: ["script"], get: { pass: 4 } },
  { id: "i_tail", slot: "int", n: "꼬리질문 대비", d: "답마다 따라올 질문 두 개를 미리 적어 둔다", tags: ["tail", "intent"], get: { pass: 16 } },
  { id: "i_boss", slot: "int", f: "biz", n: "팀장의 고민 찾기", d: "그 회사 팀장급의 고민을 찾고 내가 풀 수 있는지 본다", tags: ["boss"], get: { lect: 2 } },
  { id: "i_mock", slot: "int", n: "모의 면접 녹화", d: "녹화해서 같이 본다. 본인이 제일 먼저 안다", tags: ["mock", "calm"], get: { rev: 20 } },
  { id: "i_press", slot: "int", n: "압박 모의 면접", d: "일부러 몰아붙인다. 버티면 크게 늘지만 긴장하는 사람에게는 독이다", tags: ["pressure", "tail"], get: { pass: 24 } },
  { id: "n_ai", slot: "int", f: "biz", n: "AI 면접 대비", d: "화면을 보고 답하는 연습. 표정과 말 속도를 잡는다", tags: ["newform", "aiint"], get: { form: 75 } },
  { id: "p_org", slot: "int", f: "pub", n: "기관별 면접 유형 파악", d: "기관마다 묻는 방식이 다르다. 지난 유형을 모아 맞춘다", tags: ["orgint"], get: { pub: 1 } },
  { id: "p_situ", slot: "int", f: "pub", n: "상황 면접·토론 대비", d: "상황을 주고 판단을 묻는 면접과 토론을 따로 연습한다", tags: ["situ"], get: { sp: 6 } },
  // 지원 운영
  { id: "o_cal", slot: "ops", f: "biz", n: "시즌 달력", d: "상반기 3~4월, 하반기 9~10월. 공고가 뜨는 때에 맞춰 준비를 끝낸다", tags: ["season"], get: { start: 1 } },
  { id: "o_volume", slot: "ops", f: "biz", n: "양치기(한 주 치 몰아 쓰기)", d: "많이 쓰고 꾸준히 첨삭받을수록 합격량이 는다. 이력서는 한 주 치를 몰아서", tags: ["volume"], get: { pass: 7 } },
  { id: "o_dead", slot: "ops", f: "biz", n: "마감 관리표", d: "공고마다 마감과 진행 상태를 한 장에 적고 매주 확인한다", tags: ["deadline", "season"], get: { tmpl: 1 } },
  { id: "o_open", slot: "ops", f: "move", n: "포털에 이력서 열어 두기", d: "경력 이직은 직소싱 시대. 열어 두고 계속 고친다", tags: ["open"], get: { career: 1 } },
  { id: "o_hunter", slot: "ops", f: "move", n: "헤드헌터 제안 받기", d: "제안은 적극적으로 받는다. 공고에 없는 자리가 온다", tags: ["hunter", "open"], get: { sp: 10 } },
  { id: "o_ref", slot: "ops", f: "move", n: "지인 추천", d: "네 가지 길 가운데 통과율이 가장 높다. 먼저 물어봐야 온다", tags: ["ref"], get: { lect: 4 } },
  // 멘탈 관리
  { id: "m_call", slot: "mind", n: "주간 점검 통화", d: "매주 10분. 이번 주에 넣은 곳과 다음 주에 넣을 곳만 묻는다", tags: ["deadline"], get: { start: 1 } },
  { id: "m_soft", slot: "mind", n: "숫자로 돌려 말하기", d: "\"안 돼요\" 대신 숫자를 같이 본다. 직설을 못 견디는 사람에게 쓴다", tags: ["soft"], get: { pass: 9 } },
  { id: "m_calm", slot: "mind", n: "긴장 푸는 리허설", d: "면접 전날 같은 시간에 같은 옷으로 한 번 해 본다", tags: ["calm"], get: { pass: 12 } },
  { id: "m_review", slot: "mind", n: "탈락 복기 루틴", d: "떨어진 날 바로 적는다. 다음 지원에서 고칠 것 하나만", tags: ["retry"], get: { fail: 10 } },
  { id: "m_family", slot: "mind", n: "보호자와 삼자 면담", d: "돈을 낸 사람과 지원하는 사람의 눈높이를 한자리에서 맞춘다", tags: ["family"], get: { sp: 2 } },
];
export const GET_N = { pass: "합격 누적", sp: "전략 고객 합격", fail: "불합격 누적", lect: "강의", blog: "블로그 글", tmpl: "첨삭 템플릿", form: "전형 대응도", career: "이직 분야를 열면", pub: "공기업 분야를 열면", rev: "후기" };

// ── 숫자(봇으로 맞춘다) ──
// 새 채널(11-28): 본업 인원을 채울 문의는 부업 때 마케팅만으로는 안 온다. cost 여는 돈(오늘 값) · ap 여는 행동력 · prep 준비 달 · w 문의에 보태는 힘 · fit 잘 맞는 분야·등급(없으면 전부 1) · need 필요한 포지션
export const CHANNELS = {
  chat: { n: "현직자 오픈채팅방", d: "직무별 현직자 방을 열고 운영한다. 질문에 답하다 보면 상담으로 이어진다", cost: 30, ap: 2, prep: 3, w: 0.15 },
  tube: { n: "너튜브 채널", d: "자소서·면접 영상을 올린다. 쌓일수록 검색으로 들어온다", cost: 200, ap: 3, prep: 4, w: 0.2 },
  hunter: { n: "헤드헌터 제휴", d: "헤드헌터가 후보자를 보내 준다. 이직 문의만 는다", cost: 100, ap: 2, prep: 3, w: 0.3, fit: { total: 0, public: 0, move: 1 }, need: "career" },
  univ: { n: "대학·기관 제휴", d: "취업센터와 정기 프로그램을 맺는다. 종합·공기업 문의가 는다", cost: 100, ap: 2, prep: 4, w: 0.2, fit: { total: 1, public: 1, move: 0 } },
  news: { n: "뉴스레터", d: "주마다 채용 소식과 한마디를 보낸다. 조용하지만 꾸준하다", cost: 50, ap: 1, prep: 2, w: 0.1 },
  // at: 컨설팅을 시작하고 이만큼(달) 지나야 세상에 나오는 채널(그 전에는 목록에 없다) · decay: 식는 속도(없으면 공통 값) · say: 나타날 때 한 줄
  linkon: { n: "링크온", d: "경력을 올려 두는 비즈니스 인맥 서비스. 경력기술서·이직 사례 글이 잘 먹힌다. 헤드헌터 제휴와 같이 굴리면 좋다", cost: 40, ap: 2, prep: 2, w: 0.2, fit: { total: 0.3, public: 0, move: 1.5 }, at: 24, say: "요즘 다들 링크온에 경력을 올린다. 이직하려는 사람들이 거기 모여 있다." },
  thready: { n: "스레디", d: "짧은 글이 도는 서비스. 짧은 팩트 글과 일상 글이 잘 먹힌다. 자주 올려야 해서 빨리 식는다", cost: 20, ap: 1, prep: 1, w: 0.15, fit: { total: 1, public: 0.6, move: 0.6 }, at: 30, decay: 0.1, say: "스레디에 취준 글이 돈다. 신입과 저연차가 거기서 정보를 찾는다." },
  book: { n: "책 출간", d: "방법론을 책으로 낸다. 비싼 상품일수록 믿음이 된다", cost: 300, ap: 4, prep: 8, w: 0.1, fit: { top: 2, prem: 1.5 } },
};
export const LECT_ORGS = ["지방 국립대 취업센터", "수도권 사립대 커리어센터", "청년 취업 지원 기관", "구청 일자리 센터", "직무 교육 기관", "기업 사내 교육팀", "고등학교 진로 담당 선생님", "취업 동아리 연합"];
export const C2_BAL = {
  // 채널: 본업이면 문의 = base(부업 때 채널만) − ai × AI 고비 + 새 채널 힘의 합, min~max 사이. 회사 다닐 때는 1 + emp × 합. decay: 달마다 식는 정도(돌보기 행동력 1로 다시 1) · live: 이만큼은 데워져 있어야 '굴리는 중'
  chan: { base: 0.5, ai: 0.1, min: 0.35, max: 1.3, emp: 0.2, decay: 0.05, live: 0.4 },
  // 관문: 종합 표준(자소서·면접 합격 실적) → 프리미엄 → 최고가. sp 전략 고객 합격 · rev 후기 · notes 합격 사례집 장수
  gate: { mini: { stat: 90, und: 48, rev: 30 }, std: { stat: 50, und: 12 }, prem: { stat: 100, und: 344 }, top: { stat: 140, und: 864, yrs: 8 } }, // yrs: 컨설팅을 한 햇수(최고가는 8년 차부터)
  // 업의 이해도: month 달마다(보조) · light 가벼운 상품 합격 한 명 · win 전략 고객 합격(등급별) · gap 눈높이 차이 한 칸마다 + · cold 한파 중 합격 × · first 처음 여는 조합 ×
  // 11-28 눈금 맞추기: 오토 10년 차 가운데가 1,000점쯤 되게 쌓이는 양과 문턱을 모두 0.8배(k)로 옮겼다. 밸런스는 그대로
  // slow: 쌓일수록 덜 오른다(점수 ÷ (1 + 지금 점수 ÷ slow)) · shift: 전형이 바뀌면 빠지는 비율 · stage3: 후반으로 넘어가는 점수 · see: 전생 점수가 ??? 를 덜 가리는 정도
  und: { k: 0.8, month: 0.8, light: 1.6, win: { mini: 4.8, std: 9.6, prem: 14.4, top: 24 }, gap: 0.3, cold: 1.3, first: 2, slow: 240, shift: 0.06, stage3: 800, see: 800, seeMax: 0.6, },
  need: { mini: 140, std: 90, prem: 140, top: 180 }, // 그 등급이 요구하는 실력(defs.js CS_PRICE_NEED 와 같은 계단)
  // 동시에 맡는 인원: 회사 다닐 때 · 본업(회사를 그만둔 상태). 등급마다 따로 센다
  cap: { emp: { mini: 3, std: 4, prem: 3, top: 1 }, full: { mini: 5, std: 10, prem: 7, top: 4 } }, pathB: 2, // pathB: 면접 전문(판 변화 길 B)이면 면접 프리미엄 +2
  units: { mini: 1, std: 1, prem: 1, top: 2 }, // 달마다 드는 손(처리 용량)
  // 문의(한 달): 표준·프리미엄은 rate × 평판. 최고가는 300만에서 topA 명, 값이 오를수록 topK 로 준다(700만이면 topA × 1/6)
  rate: { std: 3.3, prem: 1.4 }, fullX: 3, topA: 1.5, topK: Math.log(6) / 400, waitMax: 2, waitMo: 3, // fullX: 본업이면 낮에도 상담을 받아 문의가 더 는다(엔진 공통 전업 배수에 더 곱한다)
  rep: { base: 0.4, notes: [12, 0.25], rev: [80, 0.2], fame: [60, 0.2], und: [960, 0.25], max: 1.3 }, // 평판: 사례집 · 후기 · 명성 · 업의 이해도
  mk: [0.4, 6], // 마케팅 채널: 0.4 + 0.6 × min(1, 이번 달 문의 ÷ 6)
  // 내 가격과 시세: 등급은 값의 범위(다섯 칸, 가운데 칸이 평소 시세). pstep: 자기소개서·면접(면접 프리미엄 포함)은 평소 값 대비 배수로 고른다
  pstep: [0.8, 0.9, 1, 1.1, 1.25],
  // 시세가 움직이는 폭: 공채 시즌(3·4·9·10월) + · 채용 한파 + · AI −(등급별. 자기소개서는 기존 AI 값 내림이 이미 시세다) · 경쟁 컨설턴트 ±(compT 달 주기)
  mkt: { season: 0.06, seasonM: [3, 4, 9, 10], cold: 0.08, ai: { light: 0, mini: 0.05, std: 0.12, prem: -0.04, top: -0.08 }, comp: 0.05, compT: 44 }, // ai: AI 고비가 다 찼을 때 표준은 무료 AI 코치 때문에 내리고, 사람 손이 필요한 프리미엄·최고가는 오른다
  // 실력이 받쳐 주면 더 받는다: 업의 이해도 · 합격 실적 · 후기가 수요 곡선을 오른쪽으로 민다(다 차면 시세의 1.25배까지 평소만큼 온다)
  shift: { und: [1200, 0.14], pass: [120, 0.06], rev: [100, 0.05] },
  // 수요 곡선: 문의 배수 = exp(−e × (내 값 ÷ (시세 × 실력) − 1)), max 배까지 · cut 배 넘으면 끊긴다 · exp: 시세보다 비싸게 받은 만큼 탈락 때 환불 요구 확률 + · expRev: 악평이 세지는 정도
  dem: { e: 2.2, max: 2, cut: 1.9, exp: 0.5, expRev: 1 },
  // 오토(기본): 시세의 low 배 · 실력 웃돈은 skill 만큼만 · 시세는 달마다 lag 만큼만 따라간다(한두 달 늦다) · 최고가는 맨 아래 값에서 실력이 topAt 만큼 밀릴 때까지 가운데 값으로 천천히
  autoP: { low: 0.95, fullLow: 0.97, skill: 0.4, lag: 0.5, topAt: 0.25 },
  // AI 고비(11-28): 기존 AI 대세 시작(aiFrom)보다 pre 년 앞서 예고, ramp 년에 걸쳐 다 찬다. doc: AI로 써 온 서류가 비슷해져 서류 통과 −(카드 'AI 티 걷어내기'로 막음) · int: 기업의 AI 면접·AI 서류 평가로 면접 −(카드 'AI 면접 대비'로 막음)
  // per: "AI는 이렇게 말하던데요" 설득 −(같은 회사 유형 합격 사례집이 있으면 없음) · rev: 가짜 합격 후기로 후기의 힘 − · ref: 표준 고객의 환불 시비 +
  ai: { pre: 3, ramp: 9, doc: 0.2, int: 0.12, per: 0.1, rev: 0.5, ref: 0.06 },
  // 본업으로 가려면(11-28): 최고가가 열림 + 아래를 다 채움 + 최근 mo 달 컨설팅 수입이 월급보다 많음. 못 채우고 퇴사하면 본업 인원은 half 만큼만 더 열리고 본업 문의 배수(fullX)도 없다(채우면 그때 다 열린다)
  fullReq: { und: 800, notes: 15, rev: 50, cases: 5, mo: 12, chan: 2, pay: 0.4 }, fullHalf: 0.5,
  // 강의·출강(11-28): 제안이 건별로 온다. 값을 보고 갈지 정한다. on: 0 이면 예전 방식(봇 비교용)
  // p: 한 달에 한 건 올 확률 = early(후기 rev0 개 전) 또는 base + rev × min(1, 후기 ÷ revAt) + 명성 ÷ fameDiv, max 까지 · two: 같은 달 한 건 더 올 확률 배수 · keep: 제안이 남아 있는 달 · maxQ: 쌓이는 건수
  // one: 단건 값 = lo~hi + 명성 × fame + min(후기, revCap) × rev, 본업이고 명성 fullFame 이상이면 × fullX · series: 연속 강의(강의 seriesLect 번 · 후기 seriesRev 개부터) 값 = 단건 × seriesX, 확률 seriesP + 명성 ÷ seriesFame(최대 seriesMax)
  // big: 대형(본업 + 명성 bigFame 이상) 확률 bigP, 값 bigLo~bigHi, 명성 + bigFameUp
  lect: { on: 1, early: 0.4, rev0: 30, base: 0.04, rev: 0.07, revAt: 60, fameDiv: 900, max: 0.2, two: 0.2, keep: 2, maxQ: 3,
    lo: 20, hi: 30, fame: 0.6, revCap: 100, revW: 0.2, fullFame: 70, fullX: 1.1, seriesLect: 3, seriesRev: 30, seriesX: 2.6, seriesP: 0.1, seriesFame: 250, seriesMax: 0.4, bigFame: 75, bigP: 0.03, bigLo: 200, bigHi: 400, bigFameUp: 2 },
  vipX: 1.4, // VIP 이직 패키지(큰 투자): 새 구조에서는 이직 최고가 문의가 이만큼 는다
  miniFee: 60, miniP: 1, // 면접 프리미엄 한 명 값(오늘 값) · 면접 프리미엄 가격일 때 면접 고객이 간이 전략 고객이 될 확률
  dur: { roll: 3, move: 4, full: 2, mini: [1, 2], min: 2, cal: [6, 12], calStd: [3, 6, 9, 12], topAdd: 0 }, // topAdd: 최고가는 회사를 다니는 동안 두 달 더 길게 붙는다 · // 결과 달: 공채형은 6월·12월(적어도 min 달 뒤), 표준은 분기마다 끊는 석 달 과정, 수시형·이직은 몇 달 뒤
  // 판정
  docBase: [[-1, 0.42], [0, 0.3], [1, 0.17], [2, 0.08], [3, 0.035]], intBase: 0.34, intSpec: 0.03, wrBase: [[-1, 0.6], [0, 0.42], [1, 0.22], [2, 0.09], [3, 0.03]], pubDoc: 0.55, pubApps: 4,
  match: 0.12, matchMax: 3, empty: 0.85, eff: [0.7, 0.3, 0.7, 1.1], lvFix: [0.8, 0.9, 1], lvAt: [3, 10], note: 0.05,
  ops: { volume: 2.4, volDoc: 0.92, season: 1.3, deadline: 1.15, open: 4, hunter: 3, ref: 1, refDoc: 1.1, ghost: 0.5, miss: 0.12, max: 45 },
  taboo: { press: 0.5, pressOk: 1.2, script: 0.85, calm: 1.08 }, cold: 0.8, nf: 0.6, nfP: 0.5, pMax: 0.93,
  // 설득: base + 말빨 + 신뢰 + 근거(통과율 숫자 · 같은 회사 유형 사례) + 성향. half: 절반만 넘어오는 폭
  per: { base: 0.42, talk: [60, 220], trust: 0.15, rate: 0.14, note: 0.12, family: 0.12, parent: -0.12, cold: 0.1, retry: 0.2, half: 0.25, mix: 0.6, min: 0.08, max: 0.92 },
  // 실패: 환불 요구 확률(base + 설득 실패 + 등급) · 돌려주는 비율 · 금기로 떠날 때 돌려주는 비율 · 무료 재도전 확률
  fail: { ref: 0.12, perFail: 0.4, tier: { mini: 0, std: 0, prem: 0.1, top: 0.45 }, back: { mini: 0.5, std: 0.5, prem: 0.6, top: [0.6, 1] }, leave: 0.7, retry: 0.5, quitRef: 0.2, rev: 0.6 },
  win: { rev: { mini: 1, std: 1, prem: 1.5, top: 2 }, refer: 0.4, fame: { top: 0.3, prem: 0.1 }, back: [36, 60], backP: 0.35 },
  auto: 1, // 전략을 안 짜고 이만큼(달) 지나면 기본 상담만으로 굴러간다
};
