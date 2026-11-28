// 화상과외 수업안 자료(11-27 처방형 개편, 스위치 TU2_ON): 막힌 곳 · 성향 · 학부모 · 수업 가방 카드 · 평가 종류 · 숫자.
// 이 파일에는 자료만 둔다. 줄을 더하면 게임에 그대로 늘어난다(엔진 tutoring.js 는 꼬리표만 맞춘다).
// - 실제 학교·학원·교재·서비스 이름을 쓰지 않는다(python tools/brands.py --check).
// - 학습 유형과 교수법의 궁합은 게임 속 설정이다. 교육 연구 결과가 아니다.
// 꼬리표는 두 가지다. ① 카드가 "해 주는 일"(막힌 곳·학부모 기대를 채운다) ② 카드의 "성질"(금기에 걸린다).

// ── 꼬리표 이름 ──
export const TAGS = {
  // 해 주는 일
  fill: "구멍 메우기", err: "틀린 이유 찾기", care: "실수 잡기", speed: "속도 훈련", drill: "문제 양", writeout: "풀이 쓰기", speak: "말로 설명",
  intuit: "이해 중심", active: "학생이 주도", level: "수준 맞춤", auto: "스스로 정하기", why: "배우는 이유", calm: "실전 긴장 줄이기", proc: "풀이 과정 보기",
  habit: "공부 습관", nohw: "숙제 부담 없음", fun: "흥미", ahead: "선행 진도", score: "점수 숫자", record: "수업 기록", process: "과정 보고",
  talkp: "학부모와 대화", kidside: "아이 편", quiet: "연락 최소",
  // 성질(금기에 걸리는 쪽)
  lower: "대놓고 아래 학년", review: "복습에 시간", spot: "앞에 세우기", push: "몰아붙이기", vol: "숙제 양 늘리기", lecture: "듣기만 하는 수업", slow: "느린 진도", call: "잦은 연락", watch: "지켜보기",
};
export const RISK = ["lower", "review", "spot", "push", "vol", "lecture", "slow", "call", "watch"]; // 성질 꼬리표(화면에서 붉게)

// ── 평가 종류 ── 엔진의 평가 방식 순서(EVAL)와 같은 차례. 7번째부터는 MORE 를 돌려 쓴다
export const EV_KIND = ["written", "essay", "oral", "proctor", "project", "interview", "none"];
export const EV_KIND_MORE = ["essay", "oral", "proctor"];
export const evKind = (n) => (n < EV_KIND.length ? EV_KIND[n] : EV_KIND_MORE[(n - EV_KIND.length) % EV_KIND_MORE.length]);

// ── 수업안 다섯 칸 ──
export const SLOTS = [
  { id: "dx", n: "진단", tip: "깊이 볼수록 가려진 칸이 열리지만 수업 시간을 써요" },
  { id: "cp", n: "개념", tip: "막힌 곳과 성향을 같이 봐야 해요" },
  { id: "pr", n: "연습", tip: "지금 평가 방식과 맞아야 점수로 이어져요" },
  { id: "hw", n: "숙제", tip: "숙제를 안 하는 아이에게 양을 늘리면 그만둬요" },
  { id: "cm", n: "소통", tip: "학부모 유형과 맞춰야 재등록해요" },
];

// ── 막힌 곳 열두 가지 ── need: 풀어 주는 꼬리표(채운 만큼 맞는다) · bad: 건드리면 안 되는 성질 · hard: 어려운 조합(풀면 수업료 인상을 받아들인다)
// sd: 시험 날 흔들림 배수(시험 불안) · sym: 가려져 있을 때도 보이는 겉모습
export const BLOCKS = [
  { id: "gap", n: "개념에 구멍(두 학년 전)", need: ["fill", "err"], bad: [], memo: "앞 학년 단원이 비어 있어요. 지금 단원만 반복하면 제자리예요" },
  { id: "slip", n: "아는데 실수", need: ["care", "err"], bad: [], memo: "풀 줄은 알아요. 부호와 옮겨 적기에서 새요" },
  { id: "slow", n: "시간이 모자람", need: ["speed", "drill"], bad: [], memo: "끝까지 가면 맞히는데 뒤 세 문제를 못 봐요" },
  { id: "essay", n: "서술형을 못 씀", need: ["writeout", "speak"], bad: [], memo: "답은 맞는데 풀이를 못 적어 감점돼요" },
  { id: "noread", n: "문제를 안 읽음", need: ["care", "proc"], bad: [], memo: "조건 하나를 빼고 풀어요. 풀이 과정을 봐야 보여요" },
  { id: "rote", n: "암기만 함", need: ["speak", "intuit"], bad: [], memo: "공식은 외웠는데 숫자가 바뀌면 멈춰요" },
  { id: "ahead", n: "선행만 하고 현행이 빔", need: ["fill", "level"], bad: ["ahead"], memo: "두 학기 앞을 배웠는데 지금 학기 시험이 무너져요" },
  { id: "nohw", n: "숙제를 안 함", need: ["habit", "nohw"], bad: ["vol"], memo: "숙제를 늘릴수록 더 안 해요" },
  { id: "anx", n: "시험 불안", need: ["calm", "kidside"], bad: ["push"], hard: true, sd: 1.8, memo: "평소엔 푸는데 시험지 앞에서 손이 굳어요" },
  { id: "mute", n: "말로 설명을 못 함", need: ["speak", "active"], bad: [], memo: "머릿속엔 있는데 입으로 안 나와요" },
  { id: "top", n: "상위권 정체", need: ["level", "auto"], bad: ["lower"], hard: true, memo: "90점에서 석 달째 멈췄어요. 쉬운 문제는 시간 낭비예요" },
  { id: "nowhy", n: "공부할 이유가 없음", need: ["why", "kidside"], bad: ["vol"], hard: true, memo: "못하는 게 아니라 안 해요" },
];
export const SYMPTOM = "성적이 안 올라요";

// ── 성향 여섯 ── bad: 금기(걸리면 입을 닫는다) · good: 잘 받는 것 · hint: 성향이 보일 때 카드에 뜨는 귀띔 · shut: 금기를 건드렸을 때 장면 글
// q: 평소 질문 수(중간 신호의 바탕)
export const TRAITS = [
  { id: "quiet", n: "말이 없는 아이", bad: ["spot"], good: ["intuit", "record"], q: 0, hint: "시키면 더 조용해져요", shut: "\"자, 이번엔 네가 설명해 볼래?\" 화면 속 아이가 고개를 숙였다. 30초, 1분. 다음 수업에는 카메라가 꺼져 있었다." },
  { id: "asker", n: "질문 폭탄", bad: ["lecture"], good: ["active", "speak"], q: 6, hint: "듣기만 하는 걸 못 견뎌요", shut: "질문하려던 손이 세 번 올라갔다 내려갔다. \"일단 끝까지 듣고.\" 그 뒤로 채팅창이 조용해졌다. 조용한 게 아니라 닫힌 것이었다." },
  { id: "pride", n: "자존심이 센 아이", bad: ["lower"], good: ["level", "auto"], q: 2, hint: "쉬운 걸 시키면 상처받아요", shut: "화면에 아래 학년 교재 표지가 뜬 순간 카메라가 꺼졌다. \"저 이거 다 아는데요.\" 그날 숙제는 한 장도 돌아오지 않았다." },
  { id: "quit", n: "쉽게 포기", bad: ["push"], good: ["habit", "fun"], q: 1, hint: "쫓기면 손을 놔요", shut: "타이머가 3분을 남겼을 때 아이가 펜을 내려놓았다. \"어차피 못 풀어요.\" 다음 주에는 아프다는 문자가 왔다." },
  { id: "rival", n: "경쟁을 즐김", bad: ["slow"], good: ["speed", "score"], q: 3, hint: "천천히 가면 지루해해요", shut: "\"쌤, 저 친구는 벌써 다음 단원 나갔대요.\" 같은 단원 셋째 주, 아이는 수업 중에 다른 문제집을 풀고 있었다." },
  { id: "drift", n: "딴짓 장인", bad: ["auto"], good: ["habit", "fun"], q: 2, hint: "알아서 하라고 하면 안 해요", shut: "\"목표는 네가 정해 봐.\" 아이는 신나게 정했고, 하나도 하지 않았다. 화면 아래에서 엄지가 바쁘게 움직였다." },
];

// ── 학부모 여섯 유형 ── want: 기대 둘 · hate: 금기 하나 · perk: 둘 다 맞추면 얻는 것(엔진이 키로 읽는다)
export const PARENTS = [
  { id: "score", n: "점수만 보는 부모", want: ["score", "drill"], hate: "slow", wantN: "다음 시험 점수 · 숫자 리포트", hateN: "\"길게 봐야 해요\"", perk: "ref", perkN: "재등록 · 동생 소개", angry: "\"선생님, 기초가 중요한 건 알겠는데요. 시험은 다음 달이에요.\"" },
  { id: "proc", n: "과정 중시 부모", want: ["habit", "process"], hate: "drill", wantN: "습관 · 태도 변화", hateN: "문제만 뽑아 주기", perk: "stay", perkN: "오래 다닌다(이탈 낮음)", angry: "\"문제지만 쌓이네요. 아이가 뭘 배우는지는 안 보여요.\"" },
  { id: "ahead", n: "선행 압박 부모", want: ["ahead", "score"], hate: "review", wantN: "진도 · 두 학기 앞", hateN: "복습에 시간 쓰기", perk: "fee", perkN: "수업료 인상 수용", angry: "\"옆집 애는 벌써 다음 학년 한다는데, 우리 애는 왜 작년 걸 하죠?\"" },
  { id: "busy", n: "바빠서 맡기는 부모", want: ["quiet", "habit"], hate: "call", wantN: "알아서 · 연락 최소", hateN: "잦은 상담 요청", perk: "norefund", perkN: "환불 요구 낮음", angry: "\"회의 중이라서요. 꼭 통화해야 하나요?\"" },
  { id: "watch", n: "매 수업 지켜보는 부모", want: ["record", "talkp"], hate: "quiet", wantN: "수업 기록 · 즉답", hateN: "기록 없는 수업", perk: "review", perkN: "학부모 후기", angry: "\"석 달 동안 뭘 했는지 한 장으로 받으니 불안해요.\"" },
  { id: "kid", n: "아이 편인 부모", want: ["kidside", "fun"], hate: "push", wantN: "아이가 좋아하는 선생", hateN: "아이를 몰아붙이기", perk: "ref", perkN: "소개 +", angry: "\"애가 수업 가기 싫다고 울었어요. 그렇게까지 해야 하나요?\"" },
];

// ── 수업 가방 카드 ── t: 한 달 수업 시간에서 쓰는 몫 · tags 꼬리표 · kind: skill(익힌다) / tool(산다)
// start: 처음부터 가짐 · lp: 연수 횟수 · cost: 값(만원) · ev: 그 번째 평가 개편 뒤에 풀림 · rev: 진단 칸에서 가려진 것을 여는 개수
// good/bad(연습 칸만): 잘 통하는 평가 종류 / 효과가 뒤집히는 평가 종류(EV_KIND)
export const CARDS = [
  // 진단
  { id: "d_paper", slot: "dx", n: "지난 시험지 분석", t: 1, rev: 1, tags: ["err"], kind: "skill", start: true },
  { id: "d_oral", slot: "dx", n: "구두 테스트", t: 1, rev: 1, tags: ["speak", "spot"], kind: "skill", lp: 1 },
  { id: "d_unit", slot: "dx", n: "단원별 진단지", t: 2, rev: 2, tags: ["err", "level"], kind: "tool", cost: 30 },
  { id: "d_rec", slot: "dx", n: "풀이 과정 녹화 보기", t: 3, rev: 3, tags: ["proc", "err", "watch"], kind: "tool", cost: 80, memo: "필기 태블릿이 필요해요" },
  // 개념
  { id: "c_board", slot: "cp", n: "판서 강의", t: 2, tags: ["lecture"], kind: "skill", start: true },
  { id: "c_pic", slot: "cp", n: "그림과 예시", t: 2, tags: ["intuit", "fun"], kind: "skill", start: true },
  { id: "c_down", slot: "cp", n: "아래 학년으로 내려가기", t: 3, tags: ["fill", "lower", "review", "slow"], kind: "skill", start: true, memo: "빠르게 메우지만 대놓고 내려가요" },
  { id: "c_embed", slot: "cp", n: "현행 문제 속에서 메우기", t: 3, tags: ["fill", "slow"], kind: "skill", lp: 3, memo: "티 안 나게 메워요. 느려요" },
  { id: "c_flip", slot: "cp", n: "거꾸로 설명(학생이 선생)", t: 2, tags: ["speak", "active", "spot"], kind: "skill", lp: 2 },
  { id: "c_ahead", slot: "cp", n: "선행 한 단원 끼우기", t: 2, tags: ["ahead"], kind: "skill", lp: 1 },
  { id: "c_why", slot: "cp", n: "쓰임새부터 보여 주기", t: 2, tags: ["why", "fun"], kind: "skill", lp: 2 },
  // 연습
  { id: "r_type", slot: "pr", n: "유형 반복", t: 2, tags: ["drill"], kind: "skill", start: true, good: ["written"], bad: ["oral", "project", "interview", "none"] },
  { id: "r_wrong", slot: "pr", n: "오답 노트", t: 2, tags: ["care", "err"], kind: "skill", start: true, good: ["written", "essay", "proctor"], bad: ["none"] },
  { id: "r_timer", slot: "pr", n: "시간 재고 풀기", t: 2, tags: ["speed", "push"], kind: "skill", lp: 1, good: ["written", "proctor"], bad: ["project", "none"] },
  { id: "r_mock", slot: "pr", n: "실전처럼 모의시험", t: 3, tags: ["calm", "proc"], kind: "skill", lp: 2, good: ["written", "proctor", "oral"], bad: ["project", "none"] },
  { id: "r_essay", slot: "pr", n: "서술형 첨삭", t: 3, tags: ["writeout"], kind: "skill", lp: 2, good: ["essay", "project", "interview"], bad: [] },
  { id: "r_bank", slot: "pr", n: "문제은행 맞춤 출제", t: 1, tags: ["drill", "level"], kind: "tool", cost: 60, good: ["written", "essay"], bad: ["oral", "interview", "none"] },
  { id: "r_oral", slot: "pr", n: "구술 문답 훈련", t: 3, tags: ["speak", "spot"], kind: "skill", lp: 2, ev: 2, good: ["oral", "interview", "proctor"], bad: [] },
  { id: "r_ai", slot: "pr", n: "감독 AI 모의 평가", t: 2, tags: ["proc", "calm", "watch"], kind: "tool", cost: 150, ev: 3, good: ["proctor"], bad: ["project", "none"] },
  { id: "r_proj", slot: "pr", n: "프로젝트 지도", t: 3, tags: ["why", "writeout", "active"], kind: "skill", lp: 3, ev: 4, good: ["project", "interview", "none"], bad: ["written"] },
  // 숙제
  { id: "h_vol", slot: "hw", n: "양으로", t: 0, tags: ["drill", "vol"], kind: "skill", start: true },
  { id: "h_daily", slot: "hw", n: "매일 10분", t: 1, tags: ["habit"], kind: "skill", start: true },
  { id: "h_none", slot: "hw", n: "없음(수업 안에서 끝)", t: 2, tags: ["nohw"], kind: "skill", start: true, memo: "숙제 몫을 수업 시간에 해요" },
  { id: "h_photo", slot: "hw", n: "인증 사진", t: 1, tags: ["habit", "record", "watch"], kind: "skill", lp: 1 },
  { id: "h_ai", slot: "hw", n: "AI 조교 숙제 확인", t: 0, tags: ["habit", "record"], kind: "tool", cost: 120 },
  // 소통
  { id: "m_num", slot: "cm", n: "숫자 리포트", t: 1, tags: ["score", "record"], kind: "skill", start: true },
  { id: "m_call", slot: "cm", n: "월 1회 통화", t: 1, tags: ["talkp", "call"], kind: "skill", start: true },
  { id: "m_min", slot: "cm", n: "분기 한 장 요약", t: 0, tags: ["quiet"], kind: "skill", start: true },
  { id: "m_clip", slot: "cm", n: "수업 영상 요약", t: 1, tags: ["record", "process"], kind: "tool", cost: 40 },
  { id: "m_goal", slot: "cm", n: "아이와 목표 정하기", t: 2, tags: ["kidside", "auto", "process"], kind: "skill", lp: 2 },
];

// ── 처음부터 가진 기본 수업 노트(이름만. 평가가 바뀌면 다시 맞춰야 한다) ──
export const BASE_NOTES = ["단원 요약 판서", "기출 유형 풀이", "시험 전 정리 프린트", "오답 유형 모음", "첫 달 수업 순서"];


// ── 숫자(밸런스 손잡이) ── 봇으로 맞춘다. 환경변수 TU2P='{"cap":[5,4,3]}' 로 덮어쓴다(봇 시험용)
export const TU2_BAL = {
  from: 3, // 이 단계부터 새로 받는 학생에게 수업안
  cheapLv: 2, // 수업안 없이 받는 학생이 내는 수업료 단계(싼 단계 값)
  cap: [5, 5, 4], capFull: [9, 8, 7], capAgent: 1, // 수업안 학생 상한: 3·4·5단계(회사 다닐 때 / 본업일 때) · 조교가 있으면 +
  time: 8, timeAi: 1, // 한 달 수업 시간 몫 · AI 채점을 쓰면 +
  hid: { tr: 0.35, b2: 0.7, hate: 0.5 }, // 처음에 가려지는 확률: 성향 · 둘째 막힌 곳 · 학부모가 싫어하는 것
  w: { s: 0.5, e: 0.3, p: 0.2 }, b2w: 0.35, goodAdd: 0.1, noteAdd: 0.08, // 맞음 점수 = 학생 · 평가 · 학부모 가중. 둘째 막힌 곳 몫 · 성향이 잘 받는 것 · 맞는 노트가 있을 때
  noPlan: 0.3, adapt: 0.6, slump: 0.75, // 수업안이 없을 때 맞음 점수 · 한 칸 바꾼 달 · 슬럼프 동안 배수
  pg: [0.6, 0.6], par: 25, parMid: 0.6, churn: 0.06, churnMid: 0.6, // 성적 진도 = pg[0] + pg[1] × 맞음 · 학부모 만족 목표 ± · 이탈 ±
  shut: { sat: -25, pg: 0.2, churn: 0.4, heal: 0.5 }, // 금기: 학생 만족 · 진도 배수 · 달 이탈 + · 고친 뒤 마음을 여는 확률
  hate: { par: -12, churn: 0.1, refund: 0.25 }, // 학부모 금기: 학부모 만족 · 이탈 + · 환불 확률(그 달 수업료 절반)
  solve: 3, noteD: 5, noteM: 0.6, // 막힌 곳이 풀리는 누적 맞음 · 노트가 남는 시험 상승 · 그때 필요한 맞음 점수
  hardUp: 0.08, upMax: 0.24, feeParent: 0.05, // 어려운 조합을 풀면 수업료 + · 상한 · 선행 압박 부모를 맞췄을 때
  slumpP: 0.035, slumpM: 4, // 달마다 슬럼프 확률 · 그냥 두면 풀리는 달 수
  // 업의 이해도(상한 없는 누적 점수). soft: 점수가 이만큼 쌓일 때마다 오르는 속도가 반으로(멈추지는 않는다) · note 새 노트 · hard 어려운 조합 배수 · again 같은 유형 다시 확인
  // up 수업안 학생 성적 상승 · upLight 수업안 없는 학생 성적 상승 · solve 막힌 곳 풀림 · month 가르친 달 · stale 낡은 노트에서 빠지는 몫 · baseStale 낡은 기본 노트 한 장
  // topK 업계 상위 % 곡선 · s3 후반(사람 관리 시기)으로 넘어가는 점수 · baseHid 전생 점수가 이만큼이면 가려지는 확률이 반
  // 11-28 눈금 맞추기: 오토 봇 10년 차 가운데 값이 1,000점쯤 되게 쌓이는 양과 모든 문턱을 예전의 0.4배로 함께 옮겼다(밸런스는 그대로, 점수만 달라진다). topK(업계 상위 %)와 등급 사다리는 공통 것으로 바뀔 예정이라 그대로 둔다
  und: { soft: 600, note: 16, hard: 1.6, again: 4, up: 2.4, upLight: 0.4, solve: 10, month: 0.16, stale: 0.5, baseStale: 1.6, topK: 380, s3: 600, baseHid: 120 },
  // 해금: 능력치 + 업의 이해도 점수. per = 하나 열 때마다 더 필요한 점수(그룹반 한 반 · 자료집 한 권)
  gate: { plan: { u: 2.4, st: ["talk", 30] }, grp: { u: 104, per: 24, st: ["talk", 60] }, mat: { u: 120, per: 24, st: ["write", 40] }, agent: { u: 240, st: ["career", 60] } },
  s3: { parMid: 0.06, slump: 1.6, refund: 0.35 }, // 후반: 학부모 기대 눈높이 + · 슬럼프 배수 · 환불 때 받는 몫
  studyFix: 0.13, noteTrial: 0.05, noteStay: 0.8, // 새 평가 연구 한 번에 다시 맞추는 노트 비율 · 맞는 노트가 있는 유형의 시범수업 전환 + · 이탈 배수
  perk: { ref: 1.5, stay: 0.7, review: 0.12 },
  // 11-27 수업료 정하기(오토 | 직접). 시세 = 단계 기준값 × 물가 × 학생 수 × 경쟁 × (1 + 계절 + 개편). 받을 만한 값 = 시세 × (1 + 웃돈)
  px: { min: 0.5, max: 2.5, // 직접 정할 수 있는 폭(시세 추세 대비)
    seas: 0.2, seasMax: 0.06, // 계절: 시험 대비 달 +, 방학 −(문의 계절 배율의 20%, ±6%까지)
    refUp: 0.05, refM: 12, // 평가 개편 뒤 12달: 불안한 학부모가 과외를 찾는다(+5% 에서 0 으로)
    cmp: 0.08, cmpStep: 0.02, // 경쟁 선생·학원: 해마다 −8~+8% 사이 새 값으로, 한 달에 2%p씩 움직인다
    pw: { base: 0, und: 0.1, undK: 600, ups: 0.04, upsN: 30, rev: 0.03, revN: 60, exam: 0.1, wait: 0.08, feeUp: 0.1, night: 0.15 }, // 웃돈: 기본 0 · 업의 이해도 · 성적 상승 실적 · 후기 · 예전 배율들(입시 전문 · 대기 명단 · 인상 사건 · 밤 상담)
    auto: { k: 0.98, pw: 0.8, lag: 0.5 }, // 오토: 시세의 98%, 실력 웃돈은 80%만, 달마다 차이의 절반씩 따라간다
    inq: { lo: 0.8, loMax: 1.35, hi: 3, cut: 1.9 }, // 문의 배율: 쌀 때 1 + lo×(1−x)(loMax 까지), 비쌀 때 exp(−hi×(x−1)), cut 배부터 끊긴다
    conv: { lo: 0.3, hi: 1.4, min: 0.1 }, // 시범수업 전환 배율
    exp: { par: 50, cheapPar: 8, churn: 0.3, exam: 40, refund: 0.6 }, // 비싸게 받을수록 기대가 크다: 학부모 만족 목표 · 달 이탈 · 시험이 안 오르면 만족 깎임 · 떨어지면 환불 확률
    notice: { cool: 6, free: 0.04, min: 0.02, k: 1.5, over: 0.8, par: 40 } }, // 인상 통보: 6달에 한 번, 4%까지는 거의 받아들임, 그 위는 인상 폭 × 1.5 만큼 이탈
  // 11-28 본업으로 가려면(체크 목록) · 모집 채널. 못 채우고 퇴사하면 본업 수업안 상한이 다 안 열린다: 상한 = 회사 다닐 때 값 + (본업 값 − 그 값) × (체크 목록 몫 × chk + 살아 있는 채널 몫 × (1 − chk))
  full: { lv: 4, und: 600, notes: 20, rev: 120, fill: 0.9, pay: 0.55, chk: 0.5, chN: 3 }, // pay: 과외 월 순수입이 월급의 이만큼은 돼야 한다(본업이면 타임 1.6배 · 수업안 상한 약 1.7배라 그 뒤에 월급을 넘긴다)
  // 11-28 본업 전용 수입원: 낮 타임까지 주 20타임 · 본업 선생 웃돈(체크 목록·채널이 찬 만큼) · 낮 타임 종합반(재수생·성인, 6명까지) · 조교가 맡는 반(내 타임을 안 쓰고 수업료의 70%) · 자료집·영상 채널이 살아 있으면 자료 판매 +
  fullX: { open: 20, pw: 0.12, grp: 5, agentLv: 4, day: { max: 3, size: 6, u: 600 }, ta: { max: 2, share: 0.7 }, mat: 1.0 },
  cheapCut: 0.93, // 수업안 없이 받는 학생은 내 수업료의 싼 단계 몫에서 조금 더 깎인다(웃돈이 안 붙는다)
  chan: { up: 34, cool: 8, live: 30, lam: 0.4, from: 4, // 한 번 다지면 +34, 달마다 −8, 30 넘어야 살아 있다, 가득 찬 채널 하나가 문의 +0.4건/달
    list: [{ id: "fair", n: "학부모 설명회", tip: "분기마다 온라인 설명회를 연다", st: ["talk", 90], u: 320 },
      { id: "cafe", n: "맘카페 평판", tip: "지역 학부모 카페에 후기와 답글이 쌓인다", rev: 30 },
      { id: "tube", n: "자료집·영상 채널", tip: "자료집 독자가 영상으로, 영상이 문의로 이어진다", mats: 2 },
      { id: "acad", n: "학원 제휴", tip: "동네 학원이 넘치는 학생을 넘겨준다", st: ["career", 80], lv: 5 }] },
  wave: { a: ["habit", "process", "record"], b: ["writeout", "speak"], add: 0.08, hitCut: 0.5 }, // 판 변화 길 A(관리형)·B(면접·논술): 그 꼬리표 카드가 더 통한다 · 2차가 그 길을 치면 덜 통한다
};
if (typeof process !== "undefined" && process.env?.TU2P) Object.assign(TU2_BAL, JSON.parse(process.env.TU2P));
if (typeof process !== "undefined" && process.env?.TU2PX) { const o = JSON.parse(process.env.TU2PX); for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) Object.assign(TU2_BAL.px[k], o[k]); else TU2_BAL.px[k] = o[k]; } } // 수업료 손잡이만: TU2PX='{"auto":{"k":0.97}}'
