// 다른 방식의 히든 길(v4.30, 26-11-22 기획 v425/rep11). 첫 번째 히든 길(hidden.js: 한 투잡을 깊게 파면 열리는 문)과 다른 결.
// 결 9가지: 실패 · 조합 · 인연 · 시대 · 회사 · 버티기 · 가족 · 회차 · 역주행. 길은 17개(조합 5·인연 3·가족 2·회차 2).
// 보여 주기는 hidden.js 와 같다: 낌새 장면을 봐야 흐린 '??? 히든 길 · 조건 n/m' 한 줄(투잡 보드 또는 투잡 탐색 '다른 길'),
//   조건 글자는 첫 줄만 보이고 나머지는 채우면 보인다. 다 채우면 문 열림 장면 + 화보(cine "h2_<key>") + 기록(명예의 전당 🗝).
// 보상(H2_REW): fix 월 고정 수입(만원, 물가 반영, 장부 "히든 길"), cut 투잡 부대비용 감소(s.h2.cut → market.js sideCut),
//   ap 행동력(s.h2.ap → core calcApMax), lump 한 번, dur 기간(달). 위험(H2_RISK): 월 p 확률로 m달 보상 멈춤 + 비용.
// 회생: 개인회생은 바로 엔딩(core gameOver)이라 '회생 뒤'가 없다 → 실패의 길은 '회생 직전 위기'(연체·폐업·큰 손실)를 이겨 낸 판에 열린다.
// 상태: s.h2 = { p:{ key:{ seen, rev, open, until, pause, gone, hintNo, f:{} } }, cut:{job}, ap, n, nwH:[], lastAct:[] }
// onChoose: h2_hint(0 귀담아듣기) · h2_era(0 매물 줍기 · 1 온라인 전환 · 2 지켜보기) · h2_tf(0 TF 간다) · h2_resv(0 예약제) · h2_deja(0 알아본다, 감각 판정)
// 난수는 r 만.
import * as D from "./defs.js";
import { CHAR, log, addMoney, netWorth, monthlySpend, jo } from "./core.js";
import * as SJ from "./sj.js";
import { HID, hidSee, hidReveal } from "./hidden.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pi = (s) => s.pi || 1;
const JN = (job) => D.SIDEJOBS[job]?.n || job;
const r1 = (x) => Math.round((x || 0) * 10) / 10;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// ───────── 상수(밸런스는 총괄이 최종 조정. 연 판 파이어율 40% 언저리 목표) ─────────
export const H2_REW = {
  fail: { fix: 90, space: 1.6 }, // 폐업 컨설턴트·실패 강연. 망한 투잡이 공간형이면 단가 ×1.6
  combo: { cut: 0.08, fix: { pr_insta: 120, tarot_webnovel: 80, tutoring_cs: 100, vibe_ucafe: 80, chicken_airbnb: 110 }, lump: { vibe_ucafe: 600 } }, // 두 투잡 모두 부대비용 −8%p
  rival: { fix: 80, cut: 0.15 }, // 라이벌과 동업: 지점 합치기(규모의 경제)
  mentee: { fix: 150 }, // 제자가 임원: 사내 강의 독점
  land: { cut: 0.12 }, // 건물주와 장기 고정 임대: 공간형 투잡 전부
  era: { buy: 2.2, buyCost: 1500, onCost: 300, onFix: 70, onDur: 36, drain: 60 }, // 위기에 들어가기: 매물 ×2.2 회수 / 온라인 선점 월 70 × 3년, 길어지면 월 60 손실
  tf: { perf: 4, boss: 1, ap: -1 }, // 사내 신사업 TF: 눈치 0·성과/호감 +, 투잡 시간 −(행동력 −1)
  long: { fix: 100, cut: 0.15 }, // 동네 장인: 방송·손님 자동
  famBiz: { ap: 1, fix: 60 }, // 부부 사업: 행동력 공유
  heir: { cut: 0.2 }, // 물려받기: 아이가 일을 돕는다 + 엔딩 한 줄
  deja: { fix: 40 }, // 어디선가 본 장면(지난 인생의 길 하나를 문 앞까지)
  regress: { fix: 120, cut: 0.1 }, // 회귀자의 길
  hide: { cut: 0.45, rival: 0.1, wait: 0.1 }, // 숨은 가게: 단가 2~3배(−45%p)·라이벌 영향 −10%p / 예약제로 기다리는 동안 손님 적음(+10%p)
};
export const H2_RISK = {
  fail: { p: 0.01, m: 4, cost: 0, t: "강연 섭외가 뚝 끊겼다. 망한 얘기도 유행을 탄다" },
  rival: { p: 0.008, m: 4, cost: 0, t: "동업자와 정산 문제로 다퉜다. 두 달은 말도 안 했다" },
  mentee: { p: 0.01, m: 6, cost: 0, t: "제자 회사가 교육 예산을 깎았다" },
  famBiz: { p: 0.01, m: 3, cost: 0, t: "일 얘기가 식탁까지 왔다. 잠시 각자 하기로 했다" },
  combo: { p: 0.006, m: 3, cost: 80, t: "두 일이 한꺼번에 몰렸다. 하나를 잠시 내려놨다" },
};
export const H2_P = {
  hint: 0.06, hintReady: 0.25, again: 12, maxOpen: 3, // 낌새 확률(조건 2개 이상이면 hintReady), 흘려들으면 again 달 쉼, 한 판에 최대로 여는 수
  failWin: 24, failLate: 2, failDrop: 0.3, failStopDrop: 0.15, failMin: 8000, failT: 24, failTalk: 110, // 실패: 2년 안 회복, 최고점 대비 −30%(큰 손실)·투잡 접을 때 −15%, 최고점 8천만 이상·시작 2년 뒤부터(첫 투자로 줄어든 건 망한 게 아니다)
  comboM: 24, // 조합: 함께 2년
  rvM: 36, rvRel: 70, rvY: 4, mtY: 6, mtAff: 70, landAff: 70, landY: 3, // 인연
  eraP: 0.03, eraLong: 3, eraBust: 7, eraCush: 6, // 시대: 위기 중 제안 확률(한 판에 한 번만), 들어간 뒤 3달 넘게 위기면 매달 손실, 7달이면 무너짐, 제안은 생활비 6달 치 현금이 있을 때
  tfA: 3, tfBoss: 75, tfY: 3, tfAgain: 24, // 회사
  longY: 15, longPlace: 12, longStar: 4.9, longQY: 5, // 버티기(11-23 결정: 20년은 한 판 20년에서 못 엶 → 15년. 공간형 투잡만. 평판 4.9 5년은 그대로)
  famY: 5, famHappy: 70, heirAge: 14, heirY: 10, heirHappy: 60, // 가족(11-23 결정: 아이 대학생 20살 → 14살 이상)
  dejaT: 36, dejaDc: 45, regY: 3, // 회차
  hideStar: 4.9, hideKeep: 24, hideHint: 4.8, // 역주행
};
const SPACE = ["pr", "ucafe", "chicken", "airbnb"];
const CRISIS = ["pandemic", "winter", "freeze", "slump", "rentup"];
const ERA_JOB = { pandemic: ["pr", "airbnb", "ucafe", "chicken", "tarot"], winter: ["pr", "airbnb", "ucafe", "chicken", "insta", "tarot"], slump: ["pr", "ucafe", "chicken", "insta"], rentup: ["pr", "ucafe", "chicken", "tarot"], freeze: ["cs", "tutoring"] }; // 그 위기에 손님이 빠지는 투잡만 제안
const ERA_N = { pandemic: "전염병", winter: "경기 한파", freeze: "채용 한파", slump: "소비 침체", rentup: "임대료 급등" };
// 회사 신사업과 맞는 투잡(회사 유형별)
export const CO_MATCH = { big: ["insta", "vibe", "airbnb", "ucafe", "webnovel"], fin: ["cs", "vibe", "tutoring"], mid: ["chicken", "ucafe", "pr", "vibe"], startup: ["vibe", "insta", "webnovel", "cs", "tarot"], public: ["tutoring", "cs", "tarot", "airbnb"] };
const CO_BIZ = { big: "공간·콘텐츠 신사업", fin: "교육·핀테크 신사업", mid: "외식·공간 신사업", startup: "새 서비스", public: "지역 교육·관광 사업" };

// ───────── 보조 ─────────
const act = (s, j) => SJ.isActive(s, j);
const yrs = (s, j) => { const t0 = s.sj?.rp?.[j]?.t0; return act(s, j) && t0 !== undefined ? (s.t - t0) / 12 : 0; };
function places(s, job) {
  if (job === "pr") return (s.pr?.rooms || []).filter((x) => x.status === "open");
  if (job === "ucafe") return s.uc?.stores || [];
  if (job === "chicken") return s.chicken?.stores || [];
  if (job === "airbnb") return s.ab?.units || [];
  return [];
}
const star = (s, job) => r1(avg(places(s, job).map((x) => x.rating || 0)));
const QUAL_ADJ = { airbnb: -0.15 }; // 숙소 별점은 5점에 몰려서 깎아 본다
const QUAL_ACH = { cs: (s) => (s.cs?.passes || 0) >= 150, webnovel: (s) => (s.webnovel?.ip || 0) >= 2, vibe: (s) => (s.vibe?.lv || 0) >= 5 };
// 평판(5점 기준): 공간형은 별점 평균, 나머지는 투잡별 값으로 바꾼다
function qual(s, job) {
  if (SPACE.includes(job)) return r1(star(s, job) + (QUAL_ADJ[job] || 0));
  if (job === "tutoring") return r1(s.tutoring?.stars || 0);
  if (job === "tarot") return r1(3 + (s.tarot?.rep || 0) / 50);
  if (job === "insta") return r1(3 + (s.ins?.fan || 0) / 50);
  const lv = job === "cs" ? s.cs?.lv : s[job]?.lv; return r1(3.1 + (lv || 0) * 0.3 + (QUAL_ACH[job]?.(s) ? 0.3 : 0)); // 등급만으론 4.6, 대표 실적까지 있어야 4.9
}
const longest = (s) => (s.sj?.active || []).slice().sort((a, b) => yrs(s, b) - yrs(s, a))[0] || null;
const longestSpace = (s) => (s.sj?.active || []).filter((j) => SPACE.includes(j)).sort((a, b) => yrs(s, b) - yrs(s, a))[0] || null; // 동네 장인은 가게가 있는 투잡만
const sideLoss = (s) => (s.hist || []).slice(-6).reduce((a, h) => a + (h.side || 0), 0) < 0;
const countA = (s) => (s.co?.grades || []).filter((g) => g === "S" || g === "A").length;
const inCo = (s) => s.co && !s.co.quit && !s.co.fired;
const kidAge = (s) => Math.max(0, ...(s.fam?.kids || []).map((k) => (s.t - k.born) / 12));
const crisisOn = (s) => CRISIS.find((k) => s.era?.[k]);
const landlord = (s) => Object.keys(s.rel || {}).filter((id) => CHAR[id]?.helper?.effect === "pr_landlord").sort((a, b) => (s.rel[b].aff || 0) - (s.rel[a].aff || 0))[0] || null;
const mentee = (s) => Object.keys(s.rel || {}).filter((id) => s.rel[id].mentee && CHAR[id]).sort((a, b) => (s.rel[a].menteeT ?? s.t) - (s.rel[b].menteeT ?? s.t))[0] || null;
function bestRival(s) { let b = null; for (const x of s.rv?.list || []) if (act(s, x.job) && (x.fr || x.st === "ally") && (x.rel || 0) >= H2_P.rvRel && (!b || x.rel > b.rel)) b = x; return b; }
const past = (s) => s.ng?.past || [];
const hasPath = (k) => !!HID[k] || !!P2[k];
const pathName = (s, k) => HID[k]?.n || (P2[k] ? nameOf(s, k) : k);

// ───────── 길 정의 ─────────
// c: [글, 지금 값(s, f), 기준], where(s, f): 보이는 투잡 보드 목록(없으면 투잡 탐색 '다른 길'), R(s, f): 보상, hintOk: 낌새 장면이 뜰 수 있나
const COMBOS = { pr_insta: ["pr", "insta", "공간 크리에이터", ["팔로워 5천", (s) => s.ins?.f || 0, 5000], "partyroom", "공간 협찬·촬영 대관. 내 파티룸이 콘텐츠가 되고, 콘텐츠가 예약이 된다"],
  tarot_webnovel: ["tarot", "webnovel", "운명 로맨스 작가", ["웹소설 완결 1편", (s) => s.webnovel?.done || 0, 1], "library", "점괘 연재. 독자가 손님이 되고, 손님 사연이 다음 화가 된다"],
  tutoring_cs: ["tutoring", "cs", "입시부터 취업까지 원스톱", ["컨설팅 합격 30명", (s) => s.cs?.passes || 0, 30], "studyst", "과외 학생이 대학에 가고, 졸업하면 취업 컨설팅으로 돌아온다"],
  vibe_ucafe: ["vibe", "ucafe", "무인 매장 솔루션", ["바이브 Lv3", (s) => s.vibe?.lv || 0, 3], "cowork", "내 무인카페에 쓰던 프로그램을 다른 사장님들께 판다"],
  chicken_airbnb: ["chicken", "airbnb", "외국인 치맥 투어", ["외국어 100", (s) => s.st.lang || 0, 100], "pub", "숙소 게스트를 내 가게로. 치맥이 여행 코스가 됐다"] };

export const P2 = {
  fail: { cat: "실패", n: "폐업 컨설턴트", bg: "consult",
    c: [["망해 보기(회생 직전·폐업·큰 손실)", (s, f) => (f.fT !== undefined || f.rec ? 1 : 0), 1], ["2년 안에 순자산 회복", (s, f) => (f.rec ? 1 : 0), 1], ["말빨 110(강연)", (s) => s.st.talk, H2_P.failTalk]],
    where: (s, f) => (f.fJob && act(s, f.fJob) ? [f.fJob] : null),
    hintOk: (s, f) => f.fT !== undefined, hintP: 0.5,
    hint: { title: "망해 본 사람의 명함", text: () => "폐업 정리 업체 사장님이 명함을 건넸다. \"망해 본 사람 말이 제일 잘 먹혀요. 다시 일어나면 연락 줘요. 일 많아요.\"" },
    open: (s, f) => `구청 소상공인 센터에서 강연 요청이 왔다. 제목은 '나는 이렇게 망했다'. 끝나고 사장님 셋이 줄을 섰다. "저희 가게 정리, 좀 도와주실 수 있어요?"`,
    rew: (s, f) => `폐업·양도 컨설팅·실패 강연(월 고정 수입${SPACE.includes(f.fJob) ? ", 공간형 경험이라 단가 ×1.6" : ""})`,
    R: (s, f) => ({ fix: Math.round(H2_REW.fail.fix * (SPACE.includes(f.fJob) ? H2_REW.fail.space : 1)) }), risk: "fail" },
  ...Object.fromEntries(Object.entries(COMBOS).map(([k, [a, b, n, c3, bg, line]]) => ["cb_" + k, { cat: "조합", n, bg, pair: [a, b],
    c: [[`${JN(a)} + ${JN(b)} 함께 2년`, (s, f) => Math.floor((f.bothM || 0) / 12 * 10) / 10, H2_P.comboM / 12], c3],
    where: () => [a, b], live: (s) => act(s, a) && act(s, b),
    hintOk: (s, f) => (f.bothM || 0) >= 6,
    hint: { title: "두 일이 겹치는 자리", text: () => ({ pr_insta: "촬영팀이 DM을 보냈다. \"피드에 올린 그 파티룸, 저희 촬영 장소로 빌릴 수 있어요?\"", tarot_webnovel: "타로 손님이 말했다. \"선생님 웹소설 주인공 운명, 제 점괘랑 똑같던데요? 다음 화 미리 봐 주세요 ㅎㅎ\"", tutoring_cs: "과외 학생 어머니가 물었다. \"우리 애 대학 가면 취업도 선생님이 봐 주실 수 있어요?\"", vibe_ucafe: "옆 동네 무인카페 사장님이 내 관리 화면을 보고 말했다. \"그 프로그램 어디서 샀어요? 저도 쓰고 싶은데.\"", chicken_airbnb: "숙소 게스트가 물었다. \"Is there good chicken near here?\" 내 가게 위치를 알려 줬다. 다음 날 친구 넷을 데려왔다." })[k] },
    open: () => `${line}. 두 투잡이 따로 놀지 않고 하나의 일이 됐다.`,
    rew: () => `새 수입원(월 고정)·두 투잡 부대비용 −${Math.round(H2_REW.combo.cut * 100)}%p${H2_REW.combo.lump[k] ? ` · 첫 계약 ${H2_REW.combo.lump[k]}만` : ""} (둘 다 할 때만)`,
    R: () => ({ fix: H2_REW.combo.fix[k] || 80, cut: { [a]: H2_REW.combo.cut, [b]: H2_REW.combo.cut }, lump: H2_REW.combo.lump[k] || 0 }), risk: "combo" }])),
  bd_rival: { cat: "인연", n: "라이벌과 동업", bg: "meeting",
    c: [["라이벌과 친구·협업(사이 70)", (s, f) => (f.rvOn ? 1 : 0), 1], ["그 사이 3년", (s, f) => r1((f.rvM || 0) / 12), H2_P.rvM / 12], ["그 투잡 4년", (s, f) => r1(yrs(s, f.job)), H2_P.rvY]],
    where: (s, f) => (f.job && act(s, f.job) ? [f.job] : null), live: (s, f) => act(s, f.job),
    hintOk: (s, f) => f.rvOn && (f.rvM || 0) >= 3,
    hint: { title: "\"우리 합치면 어때요?\"", text: (s, f) => `${f.rn || "라이벌"} 사장님이 술잔을 내려놓았다. "우리 둘이 합치면 어때요? 농담이에요 ㅎㅎ 근데 반은 진담."` },
    open: (s, f) => `${f.rn || "라이벌"} 사장님과 동업 계약서에 도장을 찍었다. 청소 업체도, 거래처도, 홍보도 하나로 합쳤다. 경쟁하던 돈이 그대로 남는다.`,
    rew: (s, f) => `지점 합치기(규모의 경제): ${JN(f.job)} 부대비용 −${Math.round(H2_REW.rival.cut * 100)}%p·월 고정 수입`,
    R: (s, f) => ({ fix: H2_REW.rival.fix, cut: { [f.job]: H2_REW.rival.cut } }), risk: "rival" },
  bd_mentee: { cat: "인연", n: "사내 강의 독점", bg: "meeting",
    c: [["특별한 제자", (s, f) => (f.who ? 1 : 0), 1], ["제자와 6년 인연", (s, f) => r1(f.who ? (s.t - (s.rel[f.who]?.menteeT ?? s.t)) / 12 : 0), H2_P.mtY], ["제자 호감 70", (s, f) => Math.round(s.rel[f.who]?.aff || 0), H2_P.mtAff]],
    where: () => ["cs"],
    hintOk: (s, f) => f.who && (s.t - (s.rel[f.who]?.menteeT ?? s.t)) >= 36, who: (s, f) => f.who,
    hint: { title: "\"저 팀장 됐어요\"", text: (s, f) => `${CHAR[f.who]?.name || "제자"}: "선생님, 저 팀장 됐어요! 나중에 임원 되면 선생님 꼭 모실게요. 진짜예요."` },
    open: (s, f) => `${CHAR[f.who]?.name || "제자"}에게서 전화가 왔다. "선생님, 저 임원 됐어요. 저희 회사 신입·경력 교육, 선생님이 맡아 주세요. 다른 데는 안 써요."`,
    rew: () => "제자 회사 사내 강의 독점 계약(월 고정 수입)",
    R: () => ({ fix: H2_REW.mentee.fix }), risk: "mentee" },
  bd_land: { cat: "인연", n: "건물 한 층 장기 임대", bg: "realty",
    c: [["건물주와 깊은 사이(호감 70)", (s, f) => Math.round(s.rel[f.who]?.aff || 0), H2_P.landAff], ["공간형 투잡 3년", (s) => r1(Math.max(0, ...SPACE.map((j) => yrs(s, j)))), H2_P.landY], ["카드값 한 번도 안 밀리기", (s, f) => (f.late ? 0 : 1), 1]],
    where: (s) => { const j = SPACE.find((k) => act(s, k)); return j ? [j] : null; },
    hintOk: (s, f) => f.who && SPACE.some((j) => act(s, j)), who: (s, f) => f.who,
    hint: { title: "세입자 걱정", text: (s, f) => `${CHAR[f.who]?.name || "건물주"}: "요즘 세입자들이 자꾸 바뀌어서 골치예요. 오래 있을 사람이면 월세는 안 올리고 싶은데."` },
    open: (s, f) => `${CHAR[f.who]?.name || "건물주"}가 계약서를 내밀었다. "한 층 통으로 10년. 월세는 지금 그대로." 재계약 걱정이 사라졌다.`,
    rew: () => `장기 고정 임대: 공간형 투잡 부대비용 −${Math.round(H2_REW.land.cut * 100)}%p`,
    R: (s) => ({ cut: Object.fromEntries(SPACE.filter((j) => act(s, j)).map((j) => [j, H2_REW.land.cut])) }) },
  era: { cat: "시대", n: "위기에 들어간 사람", bg: "street",
    c: [["시대 위기 때 들어가기", (s, f) => (f.bet ? 1 : 0), 1], ["생활비 6달 여유", (s) => Math.round((s.cash + s.invest) / Math.max(1, monthlySpend(s)) * 10) / 10, 6], ["위기가 끝날 때까지 버티기", (s, f) => (f.end ? 1 : 0), 1]],
    where: () => null,
    open: (s, f) => (f.bet === "buy" ? "위기가 끝났다. 헐값에 주운 자리에 손님이 돌아왔다. 남들이 손절할 때 들어간 값이다." : "위기가 끝났다. 먼저 온라인으로 옮겨 둔 손님들이 그대로 남았다. 남들은 이제야 시작한다."),
    rew: (s, f) => (f.bet === "buy" ? `헐값 매물 회수(넣은 돈 ×${H2_REW.era.buy})` : `온라인 선점(월 고정 수입 ${H2_REW.era.onDur}달)`),
    R: (s, f) => (f.bet === "buy" ? { lump: Math.round((f.cost || 0) * H2_REW.era.buy) } : { fix: H2_REW.era.onFix, dur: H2_REW.era.onDur }) },
  tf: { cat: "회사", n: "사내 신사업 TF", bg: "meeting",
    c: [[`회사 평가 A 이상 ${H2_P.tfA}번`, (s) => countA(s), H2_P.tfA], ["팀장 호감 75", (s) => Math.round(s.co?.boss || 0), H2_P.tfBoss], ["회사 신사업과 맞는 투잡 3년", (s) => r1(Math.max(0, ...(CO_MATCH[s.co?.type] || []).map((j) => yrs(s, j)))), H2_P.tfY]],
    where: () => null, ask: true, live: (s) => inCo(s),
    hintOk: (s) => inCo(s) && countA(s) >= 1 && (CO_MATCH[s.co?.type] || []).some((j) => yrs(s, j) >= 1),
    hint: { title: "신사업 소문", text: (s) => `팀장이 지나가며 말했다. "요즘 회사가 ${CO_BIZ[s.co?.type] || "새 사업"} 쪽을 본대. 그쪽 해 본 사람 있나 찾더라." 내 퇴근 후 두 시간이 떠올랐다.` },
    open: () => "인사팀 공문이 왔다. '신사업 TF 파견 및 겸업 허가'. 몰래 하던 투잡이 회사 공식 경력이 됐다.",
    rew: () => `겸업 공식 허가(눈치 0)·성과·팀장 호감 + (승진 길) · 대신 행동력 ${H2_REW.tf.ap}`,
    R: () => ({ ap: H2_REW.tf.ap }),
    each: (s) => { s.co.eye = 0; s.co.perf = clamp(s.co.perf + H2_REW.tf.perf, 0, 100); s.co.boss = clamp(s.co.boss + H2_REW.tf.boss, 0, 100); } },
  long: { cat: "버티기", n: "동네 장인", bg: "alley",
    c: [[`같은 가게 투잡 ${H2_P.longY}년`, (s, f) => r1(yrs(s, f.job)), H2_P.longY], ["첫 자리 12년 지키기", (s, f) => r1(SPACE.includes(f.job) ? Math.max(0, ...places(s, f.job).map((x) => x.months || 0)) / 12 : yrs(s, f.job)), H2_P.longPlace], ["평판 4.9 5년 지키기", (s, f) => r1((f.qM || 0) / 12), H2_P.longQY]],
    where: (s, f) => (f.job && act(s, f.job) ? [f.job] : null), live: (s, f) => act(s, f.job),
    hintOk: (s, f) => f.job && SPACE.includes(f.job) && yrs(s, f.job) >= 10,
    hint: { title: "\"여기 10년째죠?\"", text: (s, f) => `단골이 말했다. "여기 10년째죠? 우리 애가 여기서 ${f.job === "pr" ? "생일 파티를 했었는데" : "처음 와 봤는데"} 벌써 고등학생이에요."` },
    open: (s, f) => `방송국에서 전화가 왔다. '우리 동네 명물' 촬영. 방송이 나간 주말, 처음 보는 손님들이 줄을 섰다. ${JN(f.job)} ${H2_P.longY}년이 동네 이름이 됐다.`,
    rew: (s, f) => `동네 명물: ${JN(f.job)} 부대비용 −${Math.round(H2_REW.long.cut * 100)}%p(손님 자동)·월 고정 수입(방송·권리금)`,
    R: (s, f) => ({ fix: H2_REW.long.fix, cut: { [f.job]: H2_REW.long.cut } }) },
  fam_biz: { cat: "가족", n: "부부 사업", bg: "home",
    c: [["배우자 동업형", (s) => (s.fam?.spouse && s.fam.spouseType === "동업형" ? 1 : 0), 1], ["결혼하고 투잡 함께 5년", (s, f) => r1((f.togM || 0) / 12), H2_P.famY], ["가족 행복 70", (s) => Math.round(s.fam?.happy || 0), H2_P.famHappy]],
    where: () => null, live: (s) => !!s.fam?.spouse && (s.sj?.active || []).length > 0,
    hintOk: (s, f) => s.fam?.spouse && s.fam.spouseType === "동업형" && (f.togM || 0) >= 12, who: (s) => s.fam?.spouse,
    hint: { title: "식탁 위 사업 계획", text: (s) => `${CHAR[s.fam.spouse]?.name || "배우자"}: "우리 이거 아예 같이 해 볼까? 주말에 돕는 거 말고, 제대로."` },
    open: (s) => `${CHAR[s.fam.spouse]?.name || "배우자"}와 공동 대표로 사업자를 다시 냈다. 한 사람이 회사에 있을 때 한 사람이 가게에 있다.`,
    rew: () => `부부 사업: 행동력 +${H2_REW.famBiz.ap}(공유)·월 고정 수입`,
    R: () => ({ ap: H2_REW.famBiz.ap, fix: H2_REW.famBiz.fix }), risk: "famBiz" },
  fam_heir: { cat: "가족", n: "물려받기", bg: "home",
    c: [[`아이 ${H2_P.heirAge}살 이상`, (s) => r1(kidAge(s)), H2_P.heirAge], ["같은 투잡 10년", (s, f) => r1(yrs(s, f.job)), H2_P.heirY], ["가족 행복 60", (s) => Math.round(s.fam?.happy || 0), H2_P.heirHappy]],
    where: (s, f) => (f.job && act(s, f.job) ? [f.job] : null), live: (s, f) => act(s, f.job),
    hintOk: (s, f) => f.job && kidAge(s) >= 10,
    hint: { title: "\"나중에 내가 해도 돼?\"", text: (s, f) => `아이가 ${JN(f.job)} 장부를 들여다보다 물었다. "이거 나중에 내가 해도 돼?"` },
    open: (s, f) => `아이가 방학 내내 ${JN(f.job)}에 붙어 있었다. "나중에 크면 내가 맡을게. 이름은 안 바꿀게."`,
    rew: (s, f) => `물려받기: 아이가 일을 돕는다(${JN(f.job)} 부대비용 −${Math.round(H2_REW.heir.cut * 100)}%p)·물려받기 엔딩`,
    R: (s, f) => ({ cut: { [f.job]: H2_REW.heir.cut } }) },
  ng_deja: { cat: "회차", n: "어디선가 본 장면", bg: "rooftop",
    c: [["2회차 이상", (s) => s.ng?.n || 1, 2], ["지난 인생에서 연 히든 길", (s, f) => (f.tgt ? 1 : 0), 1], ["초반 3년 안에 알아보기", (s, f) => (f.know ? 1 : 0), 1]],
    where: () => null,
    open: (s, f) => `분명히 본 장면이다. 지난 인생에서 '${pathName(s, f.tgt)}' 쪽으로 가던 길. 이번엔 처음부터 문이 어디 있는지 안다.`,
    rew: (s, f) => `'${pathName(s, f.tgt)}' 낌새·조건 전부 공개(문 앞까지)·기억의 덤(월 고정 수입)`,
    R: () => ({ fix: H2_REW.deja.fix }) },
  ng_regress: { cat: "회차", n: "회귀자의 길", bg: "rooftop",
    c: [["3회차 이상", (s) => s.ng?.n || 1, 3], ["지난 두 인생의 투잡을 이번에도", (s, f) => (f.job ? 1 : 0), 1], ["그 투잡 3년", (s, f) => r1(yrs(s, f.job)), H2_P.regY]],
    where: (s, f) => (f.job && act(s, f.job) ? [f.job] : null), live: (s, f) => act(s, f.job),
    hintOk: (s, f) => (s.ng?.n || 1) >= 3 && f.job && yrs(s, f.job) >= 1,
    hint: { title: "두 인생이 겹쳐 보인다", text: (s, f) => `새벽에 장부를 보다 손이 멈췄다. 이 숫자, 두 번 본 것 같다. ${f.line || "지난 두 인생"}.` },
    open: (s, f) => `두 번의 인생을 합쳤다. ${f.line || "지난 두 인생"}. 어디서 망하는지, 어디서 터지는지 이제 안다.`,
    rew: (s, f) => `회귀자의 길: ${JN(f.job)} 부대비용 −${Math.round(H2_REW.regress.cut * 100)}%p·월 고정 수입`,
    R: (s, f) => ({ fix: H2_REW.regress.fix, cut: { [f.job]: H2_REW.regress.cut } }) },
  hide: { cat: "역주행", n: "숨은 가게", bg: "alley",
    c: [["매장 딱 1곳", (s, f) => (f.job && places(s, f.job).length === 1 ? 1 : 0), 1], ["예약제·소개제로 돌리기", (s, f) => (f.resv ? 1 : 0), 1], ["별점 4.9 2년 지키기", (s, f) => r1((f.keepM || 0) / 12), H2_P.hideKeep / 12]],
    where: (s, f) => (f.job && act(s, f.job) ? [f.job] : null), live: (s, f) => act(s, f.job) && places(s, f.job).length === 1,
    hintOk: (s, f) => f.job && places(s, f.job).length === 1 && star(s, f.job) >= H2_P.hideHint && yrs(s, f.job) >= 2,
    open: (s, f) => `'아는 사람만 아는 ${JN(f.job)}'. 예약은 소개로만 받는다. 손님은 적은데 다들 두 배를 내고도 고맙다고 한다. 옆에 누가 생겨도 상관없다.`,
    rew: (s, f) => `숨은 가게: 단가 2~3배(${JN(f.job)} 부대비용 −${Math.round(H2_REW.hide.cut * 100)}%p)·라이벌 영향 −${Math.round(H2_REW.hide.rival * 100)}%p · 매장을 늘리면 사라진다`,
    R: (s, f) => ({ cut: { [f.job]: H2_REW.hide.cut + H2_REW.hide.rival } }) },
};
export const KEYS = Object.keys(P2);
function nameOf(s, k) { const d = P2[k], f = s.h2?.p?.[k]?.f || {}; if (k === "ng_regress" && f.pairN) return `회귀자의 길 · ${f.pairN}`; if (k === "long" && f.job) return `동네 장인 · ${JN(f.job)}`; if (k === "hide" && f.job) return `숨은 ${JN(f.job)}`; return d.n; }

// ───────── 상태 ─────────
function H(s) { if (!s.h2) s.h2 = { p: {}, cut: {}, ap: 0, n: 0, nwH: [], lastAct: [] }; return s.h2; }
function X(s, k) { const h = H(s); return (h.p[k] = h.p[k] || { rev: 0, f: {} }); }
export const isOpen = (s, k) => s.h2?.p?.[k]?.open !== undefined;
export const openList = (s) => Object.keys(s.h2?.p || {}).filter((k) => isOpen(s, k));
function condRows(s, k) { const d = P2[k], f = X(s, k).f; return d.c.map(([t, v, need]) => { let cur = 0; try { cur = v(s, f) || 0; } catch (e) { cur = 0; } return { t, cur, need, ok: cur >= need }; }); }
function see(s, k, src) { const x = X(s, k); if (x.seen !== undefined) return ""; x.seen = s.t; x.rev = Math.max(x.rev, 1); x.src = src || ""; log(s, `히든 길 낌새: ${nameOf(s, k)}`, "work"); return `${P2[k].cat}의 길 낌새를 느꼈다`; }

// 화면용: 낌새 전엔 null
export function h2Info(s, k) {
  const d = P2[k]; if (!d) return null; const x = s.h2?.p?.[k]; if (!x || (x.seen === undefined && x.open === undefined && x.gone === undefined)) return null;
  const f = x.f || {}, rows = condRows(s, k), open = x.open !== undefined, gone = x.gone !== undefined;
  let where = null; try { where = d.where(s, f); } catch (e) { where = null; }
  const live = open && !gone && (!d.live || d.live(s, f)) && (x.until === undefined || s.t < x.until) && !(x.pause > s.t);
  return { k, n: nameOf(s, k), cat: d.cat, open, gone, why: x.why || "", where, k2: rows.filter((c) => c.ok).length, m: rows.length,
    conds: rows.map((c, i) => { const show = open || i < x.rev || c.ok; return { t: show ? c.t : "???", ok: c.ok, prog: show && c.need !== 1 ? `${r1(c.cur)}/${r1(c.need)}` : "" }; }),
    rew: safe(() => d.rew(s, f), ""), on: live, pause: x.pause > s.t ? x.pause - s.t : 0, until: x.until !== undefined ? Math.max(0, x.until - s.t) : null,
    note: k === "era" && f.bet && !open && !gone ? `들어간 때부터 ${s.t - f.betT}달 · ${H2_P.eraLong}달 넘게 위기가 이어지면 손실` : k === "hide" && f.resv && !open ? "예약제로 기다리는 중: 손님이 적다(매장을 늘리면 사라짐)" : "" };
}
function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt; } }
export const boardKeys = (s, job) => KEYS.filter((k) => { const i = h2Info(s, k); return i && (i.where || []).includes(job); });
export const etcKeys = (s) => KEYS.filter((k) => { const i = h2Info(s, k); return i && !(i.where || []).length; });

// ───────── 매달(core endMonth: hiddenMonth 바로 뒤, 시장 충격 앞) ─────────
export function hidden2Month(s, r, notes, scenes) {
  if (!s.sj) return;
  const h = H(s); h.cut = {}; h.ap = 0;
  const nw = netWorth(s); h.nwH.push(Math.round(nw)); if (h.nwH.length > 24) h.nwH.shift();
  s._h2scenes = scenes; // 시대·회차 장면은 track 안에서 넣는다
  try { loop(s, r, notes, scenes, h, nw); } finally { delete s._h2scenes; }
  h.lastAct = [...(s.sj.active || [])];
}
function loop(s, r, notes, scenes, h, nw) {
  for (const k of KEYS) {
    const d = P2[k], x = X(s, k), f = x.f;
    if (x.gone !== undefined) continue;
    try { track(s, r, k, f, x, notes, nw); } catch (e) { console.warn("[히든 길2]", k, e); }
    if (x.gone !== undefined) continue;
    if (x.open !== undefined) { reward(s, r, k, x, notes); continue; }
    const rows = condRows(s, k), ready = rows.every((c) => c.ok), k2 = rows.filter((c) => c.ok).length;
    if (x.seen !== undefined && ready && (h.n || 0) < H2_P.maxOpen) {
      if (d.ask) { if (s.t >= (f.askNo ?? -1) && !scenes.some((y) => y.kind === "event")) { scenes.push(tfAsk(s)); f.askNo = s.t + 1; } }
      else openPath(s, r, k, scenes, notes);
      continue;
    }
    if (scenes.some((y) => y.kind === "event")) continue;
    if (k === "era" || k === "ng_deja") continue; // 자기 장면이 따로 있다(track)
    if (x.seen === undefined && (d.hint || k === "hide") && safe(() => d.hintOk(s, f), false) && s.t >= (x.hintNo ?? -1) && r.chance(d.hintP || (ready || k2 >= 2 ? H2_P.hintReady : H2_P.hint))) scenes.push(hintScene(s, k, f));
  }
}

// 길별 기록
function track(s, r, k, f, x, notes, nw) {
  const h = H(s), open = x.open !== undefined;
  if (k === "fail") {
    if (open) return;
    const peak = Math.max(0, ...h.nwH);
    if (f.fT === undefined && !f.rec && s.t >= H2_P.failT) {
      const stopped = (h.lastAct || []).filter((j) => !act(s, j));
      const kind = s.debtLate >= H2_P.failLate ? "회생 직전 연체" : stopped.length && peak >= H2_P.failMin && nw < peak * (1 - H2_P.failStopDrop) ? "폐업" : peak >= H2_P.failMin && nw < peak * (1 - H2_P.failDrop) && sideLoss(s) ? "큰 손실" : null; // 큰 손실은 투잡 적자가 겹칠 때만(주식 폭락만으론 아님)
      if (kind) { f.fT = s.t; f.fNw = Math.max(peak, nw); f.kind = kind; f.fJob = stopped[0] || SPACE.find((j) => act(s, j)) || (s.sj.active || [])[0] || null; notes.push(`바닥을 쳤다(${kind}). 여기서 다시 일어나면 다른 길이 보일지도 모른다`); }
    } else if (f.fT !== undefined && !f.rec) {
      if (nw >= f.fNw && s.t > f.fT) { f.rec = 1; notes.push("순자산을 회복했다. 망했던 경험이 남았다"); }
      else if (s.t - f.fT > H2_P.failWin) { f.fT = undefined; f.lost = (f.lost || 0) + 1; }
    }
    return;
  }
  if (k.startsWith("cb_")) { if (open) return; const [a, b] = P2[k].pair; f.bothM = act(s, a) && act(s, b) ? (f.bothM || 0) + 1 : 0; return; }
  if (k === "bd_rival") { if (open) return; const v = bestRival(s); if (v) { if (f.rn && f.rn !== v.n) f.rvM = 0; f.rvOn = 1; f.rvM = (f.rvM || 0) + 1; f.job = v.job; f.rn = v.n; } else { f.rvOn = 0; f.rvM = 0; } return; }
  if (k === "bd_mentee") { if (!open) f.who = mentee(s); return; }
  if (k === "bd_land") { if (s.debtLate >= 1) f.late = 1; if (!open) f.who = landlord(s); return; }
  if (k === "era") { if (!open) eraTrack(s, r, f, x, notes); return; }
  if (k === "long") { if (open) return; const j = longestSpace(s); if (j !== f.job) { f.job = j; f.qM = 0; } f.qM = j && qual(s, j) >= H2_P.longStar ? (f.qM || 0) + 1 : 0; return; }
  if (k === "fam_biz") { if (!open && s.fam?.spouse && (s.sj.active || []).length) f.togM = (f.togM || 0) + 1; return; }
  if (k === "fam_heir") { if (!open) f.job = longest(s); return; }
  if (k === "ng_deja") { if (!open) dejaTrack(s, r, f, x); return; }
  if (k === "ng_regress") { if (!open) regressPick(s, f); return; }
  if (k === "hide") {
    if (open) { if (f.job && places(s, f.job).length > 1) { x.gone = s.t; x.why = "매장을 늘리자 숨은 가게가 사라졌다"; notes.push(`히든 길 · 숨은 ${JN(f.job)}: 매장을 늘리자 '아는 사람만 아는 곳'이 사라졌다`); log(s, "히든 길 사라짐: 숨은 가게", "work"); } return; }
    if (!f.resv) { f.job = SPACE.find((j) => act(s, j) && places(s, j).length === 1) || null; return; }
    if (!act(s, f.job) || places(s, f.job).length !== 1) { f.resv = 0; f.keepM = 0; notes.push("예약제가 풀렸다. 숨은 가게는 매장이 딱 하나일 때만 된다"); return; }
    h.cut[f.job] = (h.cut[f.job] || 0) - H2_REW.hide.wait; // 손님을 일부러 적게 받는 동안
    f.keepM = star(s, f.job) >= H2_P.hideStar ? (f.keepM || 0) + 1 : 0;
  }
}
// 시대: 위기 중 한 번 제안 → 위기가 끝나면 열림, 길어지면 손실, 너무 길면 무너짐
function eraTrack(s, r, f, x, notes) {
  const c = crisisOn(s);
  if (c && !f.cOn) { f.cOn = 1; f.ep = (f.ep || 0) + 1; } else if (!c) f.cOn = 0;
  if (f.bet) {
    if (!c) { f.end = 1; return; }
    const m = s.t - f.betT;
    if (m >= H2_P.eraBust) { x.gone = s.t; x.why = "위기가 너무 길었다. 같이 무너졌다"; notes.push("히든 길 · 위기에 들어간 사람: 위기가 끝나지 않았다. 들어간 돈이 묶인 채 무너졌다"); log(s, "히든 길 실패: 시대", "work"); return; }
    if (m >= H2_P.eraLong) { const v = Math.round(H2_REW.era.drain * pi(s)); s.cash -= v; addMoney(s, "exp", "히든 길", v); notes.push(`위기가 길어진다: 들어간 자리 유지비 −${v}만`); }
    return;
  }
  const L = s._h2scenes;
  if (c && (ERA_JOB[c] || []).some((j) => act(s, j)) && !f.askEp && s.cash >= monthlySpend(s) * H2_P.eraCush && L && !L.some((y) => y.kind === "event") && r.chance(H2_P.eraP)) {
    f.askEp = f.ep; const buy = Math.round(H2_REW.era.buyCost * pi(s)), on = Math.round(H2_REW.era.onCost * pi(s));
    L.push({ kind: "event", tag: "히든 길 낌새", title: `${ERA_N[c]} · 남들이 손절할 때`, text: `${ERA_N[c]}에 가게들이 줄줄이 문을 닫는다. 부동산 사장님 말로는 권리금 없는 자리가 쏟아진단다. 한편 손님들은 다 온라인으로 갔다. 남들이 빠질 때 들어갈까?`,
      onChoose: "h2_era", h2: "era", cost: { buy, on },
      choices: [{ t: `헐값 매물을 줍는다 (−${buy.toLocaleString()}만)`, eff: {}, text: "아무도 안 보는 자리에 계약금을 걸었다. 위기가 빨리 끝나야 한다." }, { t: `온라인 전환을 먼저 한다 (−${on.toLocaleString()}만)`, eff: {}, text: "예약·주문을 전부 온라인으로 옮겼다. 손이 많이 간다." }, { t: "지켜본다", eff: {}, text: "위기엔 몸을 낮추는 게 맞다." }] });
  }
}
// 회차: 지난 인생에서 연 길 하나를 초반에 알아보기
function dejaTrack(s, r, f, x) {
  if ((s.ng?.n || 1) < 2) return;
  const last = past(s).at(-1); const ks = (last?.keys || []).filter(hasPath).filter((k) => k !== "ng_deja");
  if (!ks.length) return;
  if (!f.tgt) f.tgt = r.pick(ks);
  const L = s._h2scenes;
  if (!f.know && x.seen === undefined && s.t >= 3 && s.t <= H2_P.dejaT && L && !L.some((y) => y.kind === "event") && s.t >= (x.hintNo ?? -1) && r.chance(0.12)) {
    L.push({ kind: "event", tag: "히든 길 낌새", title: "어디선가 본 장면", text: `처음 와 본 골목인데 간판 글씨가 낯익다. 누군가 지나가며 한 말도, 그다음에 할 말도 안다. 지난 인생의 '${pathName(s, f.tgt)}' 쪽으로 가던 길목이다.`, onChoose: "h2_deja", h2: "ng_deja",
      choices: [{ t: "이 장면, 알아본다", check: { stat: "sense", dc: H2_P.dejaDc }, ok: { text: "기억이 맞았다. 문이 어디 있는지 안다.", eff: { mental: 2 } }, ng: { text: "기분 탓인가. 골목을 빠져나오자 기억이 흐려졌다.", eff: {} } }, { t: "기분 탓이겠지", eff: {}, text: "그냥 지나쳤다." }] });
  }
}
function regressPick(s, f) {
  if ((s.ng?.n || 1) < 3) return;
  const P = past(s).slice(-2); if (P.length < 2) return;
  const both = (P[0].jobs || []).filter((j) => (P[1].jobs || []).includes(j));
  const pool = [...both, ...(P[1].jobs || []), ...(P[0].jobs || [])];
  const j = pool.find((q) => act(s, q)) || null;
  if (j !== f.job) { f.job = j; const a = (P[0].jobs || [])[0], b = (P[1].jobs || [])[0]; f.pairN = a && b ? `${JN(a)} + ${JN(b)}` : ""; f.line = a && b ? `${P[0].over ? "망했던" : P[0].fire ? "성공한" : "버틴"} ${JN(a)}, ${P[1].over ? "망했던" : P[1].fire ? "성공한" : "버틴"} ${JN(b)}` : ""; }
}
function hintScene(s, k, f) {
  const d = P2[k], id = d.who ? safe(() => d.who(s, f), null) : null, who = id && CHAR[id] && s.rel?.[id] ? id : null;
  if (k === "hide") return { kind: "event", tag: "히든 길 낌새", title: "\"여기 소문 안 났으면 좋겠어요\"", text: `단골이 계산하며 웃었다. "여기 사람 많아지면 싫을 것 같아요. 저만 알고 싶어요." 지금 ${JN(f.job)} 별점은 ${star(s, f.job)}. 일부러 작게 해 볼까?`, onChoose: "h2_resv", h2: k,
    choices: [{ t: "예약제·소개제로 돌린다", eff: { mental: 1 }, text: "손님이 줄었다. 대신 오는 사람마다 오래 머문다." }, { t: "지금처럼 많이 받는다", eff: {}, text: "장사는 많이 파는 게 최고지." }] };
  return { kind: "event", tag: "히든 길 낌새", title: d.hint.title, ...(who ? { who, expr: "smile" } : {}), text: d.hint.text(s, f), onChoose: "h2_hint", h2: k,
    choices: [{ t: "귀담아듣고 메모한다", eff: { mental: 1, ...(who ? { aff: 3 } : {}) }, text: "수첩 맨 뒷장에 적었다. 이게 길이 될지도 모른다." }, { t: "흘려듣는다", eff: {}, text: "재밌는 얘기였다. 나랑은 상관없겠지." }] };
}
function tfAsk(s) {
  return { kind: "event", tag: "히든 길", title: "\"TF에 와 줄 수 있어요?\"", text: `본부장이 따로 불렀다. "${CO_BIZ[s.co?.type] || "신사업"} TF를 꾸리는데, 퇴근 후에 그쪽 일 해 봤다면서요? 겸업은 공식으로 허가해 줄게요. 대신 시간은 좀 뺏길 거예요."`, onChoose: "h2_tf", h2: "tf",
    choices: [{ t: "TF에 간다", eff: { mental: 2 }, text: "몰래 하던 일이 회사 공식 경력이 됐다." }, { t: "지금은 투잡에 집중한다", eff: {}, text: `"그럼 다음에 다시 얘기해요."` }] };
}
function reward(s, r, k, x, notes) {
  const d = P2[k], f = x.f, h = H(s);
  if (d.live && !safe(() => d.live(s, f), false)) return;
  if (x.until !== undefined && s.t === x.until) notes.push(`히든 길 · ${nameOf(s, k)}: 효과가 끝났다`);
  if ((x.until !== undefined && s.t >= x.until) || x.pause > s.t) return;
  d.each?.(s, f);
  const R = d.R(s, f);
  if (R.fix) { const v = Math.round(R.fix * pi(s)); s.cash += v; addMoney(s, "inc", "히든 길", v); }
  for (const [j, v] of Object.entries(R.cut || {})) if (j && j !== "undefined") h.cut[j] = (h.cut[j] || 0) + v;
  if (R.ap) h.ap += R.ap;
  const K = d.risk && H2_RISK[d.risk];
  if (K && r.chance(K.p)) { x.pause = s.t + K.m; const c = Math.round((K.cost || 0) * pi(s)); if (c) { s.cash -= c; addMoney(s, "exp", "히든 길", c); } notes.push(`히든 길 위기 · ${K.t}${c ? ` (−${c}만)` : ""} · ${K.m}달 보너스 멈춤`); log(s, `히든 길 위기: ${nameOf(s, k)}`, "work"); }
}
function openPath(s, r, k, scenes, notes) {
  const d = P2[k], x = X(s, k), f = x.f, h = H(s);
  if (x.seen === undefined) x.seen = s.t;
  x.open = s.t; h.n = (h.n || 0) + 1;
  const R = d.R(s, f); if (R.dur) x.until = s.t + R.dur;
  s.moments = s.moments || {}; s.moments["h2_" + k] = s.t;
  const lines = [];
  if (R.lump) { const v = Math.round(R.lump * (k === "era" ? 1 : pi(s))); s.cash += v; addMoney(s, "inc", "히든 길", v); lines.push(`+${v.toLocaleString()}만`); }
  if (k === "ng_deja" && f.tgt) { if (HID[f.tgt]) { hidSee(s, f.tgt, "기억"); hidReveal(s, f.tgt, 9); } else if (P2[f.tgt]) { const y = X(s, f.tgt); if (y.seen === undefined) y.seen = s.t; y.rev = P2[f.tgt].c.length; } lines.push(`'${pathName(s, f.tgt)}' 조건 전부 공개`); }
  if (k === "tf") s.co.eye = 0;
  log(s, `히든 길 개방: ${nameOf(s, k)}(${d.cat})`, "work");
  notes.push(`히든 길 개방! ${d.cat}의 길 · ${nameOf(s, k)}`);
  const id = d.who ? safe(() => d.who(s, f), null) : null, who = id && CHAR[id] && s.rel?.[id] ? id : null;
  scenes.push({ kind: "story", tag: "히든 길", once: "big", title: `히든 길 개방 · ${nameOf(s, k)}`, who, expr: "smile", cine: "h2_" + k, h2: k,
    text: `${d.open(s, f)}\n\n열린 것: ${d.rew(s, f)}${lines.length ? `\n${lines.join(" · ")}` : ""}`, choices: [{ t: "계속", eff: {}, text: "" }] });
}

// ───────── 선택 처리(core.js SCENE_FN, 늦게 찾기) ─────────
export const H2_CHOOSE = {
  h2_hint(s, r, i, okv, sc) { const k = sc?.h2; if (!P2[k]) return []; if (i === 0) return [see(s, k, "낌새") || "히든 길 낌새", "보드에 '??? 히든 길' 한 줄이 생겼다"]; X(s, k).hintNo = s.t + H2_P.again; return []; },
  h2_resv(s, r, i, okv, sc) { const x = X(s, "hide"); if (i === 0) { x.f.resv = 1; x.f.keepM = 0; return [see(s, "hide", "낌새") || "예약제", `별점 ${H2_P.hideStar}를 2년 지키면 숨은 가게가 된다 · 그동안 손님이 적다`]; } x.hintNo = s.t + H2_P.again; return []; },
  h2_era(s, r, i, okv, sc) {
    const x = X(s, "era"), f = x.f; if (i === 2 || f.bet) return [];
    const kind = i === 0 ? "buy" : "on", cost = sc.cost?.[kind] || 0;
    s.cash -= cost; addMoney(s, "exp", "히든 길", cost); f.bet = kind; f.betT = s.t; f.cost = cost; see(s, "era", "시대");
    return [`−${cost.toLocaleString()}만`, "위기가 끝날 때까지 버티면 길이 열린다 · 길어지면 손실"];
  },
  h2_tf(s, r, i, okv, sc) { const x = X(s, "tf"); if (i === 0) { const L = []; openPath(s, r, "tf", L, []); s.sceneQ.unshift(...L); return ["사내 신사업 TF 합류"]; } x.f.askNo = s.t + H2_P.tfAgain; return ["2년 뒤 다시 제안이 올 수도 있다"]; },
  h2_deja(s, r, i, okv, sc) { const x = X(s, "ng_deja"); if (i === 0 && okv) { x.f.know = 1; see(s, "ng_deja", "기억"); return ["지난 인생의 길을 알아봤다"]; } x.hintNo = s.t + 6; return []; },
};
export const H2_ON = Object.keys(H2_CHOOSE);

// ───────── 회차 기록·후일담·봇·시험 ─────────
// 엔딩 때 meta.hidPast 에 쌓는 한 판 기록(ui.js renderEnding)
export function runRecord(s, hid1Keys) { return { keys: [...(hid1Keys || []), ...openList(s)], jobs: Object.keys(s.sj?.rp || {}).filter((j) => s.sj.rp[j].t0 !== undefined && D.SIDEJOBS[j]), fire: !!s.fireAt, over: !!s.over }; }
export const names = (s) => openList(s).map((k) => nameOf(s, k));
export function epi(s) { const L = []; if (isOpen(s, "fam_heir")) { const f = s.h2.p.fam_heir.f; L.push(`${JN(f.job)}는 아이가 물려받았다. 간판 이름은 그대로다. (물려받기 엔딩)`); } if (isOpen(s, "long")) L.push("동네 지도에 내 가게 이름이 지명처럼 적혔다."); if (isOpen(s, "fail")) L.push("'나는 이렇게 망했다' 강연은 지금도 가끔 한다. 제일 앞줄엔 늘 망하기 직전 사장님이 앉는다."); return L; }
export const h2Miss = (s, k) => (P2[k] ? condRows(s, k).filter((c) => !c.ok).map((c) => c.t) : []);
// 시험(#...-h2test-<key>): 조건을 무시하고 바로 연다 · 낌새만(#...-h2line-<key>)
export function h2Demo(s, k) {
  const x = X(s, k), f = x.f;
  if (x.seen === undefined) x.seen = s.t; x.rev = Math.max(x.rev, 1);
  const j0 = (s.sj.active || [])[0] || "pr";
  if (k === "fail") { f.fT = s.t; f.fNw = Math.round(netWorth(s)); f.kind = "연체"; f.fJob = SPACE.find((j) => act(s, j)) || j0; }
  if (k === "bd_rival") { f.job = j0; f.rn = "길 건너 사장님"; f.rvOn = 1; f.rvM = 6; }
  if (k === "bd_mentee") f.who = f.who || mentee(s) || Object.keys(s.rel)[0] || null;
  if (k === "bd_land") f.who = f.who || landlord(s) || Object.keys(s.rel)[0] || null;
  if (k === "era") { f.bet = "buy"; f.betT = s.t; f.cost = Math.round(H2_REW.era.buyCost * pi(s)); }
  if (k === "long" || k === "fam_heir" || k === "ng_regress" || k === "hide") f.job = f.job || j0;
  if (k === "ng_regress") { f.pairN = `${JN("pr")} + ${JN("insta")}`; f.line = `망했던 ${JN("pr")}, 성공한 ${JN("insta")}`; }
  if (k === "hide") { f.resv = 1; f.keepM = 8; }
  if (k === "ng_deja") f.tgt = f.tgt || "cb_pr_insta";
}
export function forceOpen(s, r, k, scenes) { const x = X(s, k); if (x.open !== undefined) return; h2Demo(s, k); x.rev = P2[k].c.length; openPath(s, r, k, scenes, []); }
// 시험: 낌새 장면만 강제로(-h2hint-<key>)
export function hintDemo(s, r, k) {
  h2Demo(s, k); const x = X(s, k); x.seen = undefined;
  if (k === "era") { const f = x.f; f.bet = undefined; f.ep = 1; f.askEp = 0; s.era = s.era || {}; const j = (s.sj.active || [])[0] || "pr"; s.era[Object.keys(ERA_JOB).find((q) => ERA_JOB[q].includes(j)) || "winter"] = 6; s.cash = Math.max(s.cash, monthlySpend(s) * (H2_P.eraCush + 1) + 2000); const L = []; s._h2scenes = L; const rr = { chance: () => true, pick: (a) => a[0] }; eraTrack(s, rr, f, x, []); s._h2scenes = null; return L[0] || null; }
  if (k === "ng_deja") { s.ng = { ...(s.ng || {}), n: Math.max(2, s.ng?.n || 1), past: [{ keys: ["cb_pr_insta"], jobs: ["pr"] }] }; const L = []; s._h2scenes = L; const f = x.f; f.tgt = "cb_pr_insta"; dejaTrack(s, { chance: () => true, pick: (a) => a[0] }, f, x); s._h2scenes = null; return L[0] || null; }
  if (k === "tf") return tfAsk(s);
  return hintScene(s, k, x.f);
}
