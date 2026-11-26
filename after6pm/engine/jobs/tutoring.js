// 화상과외 투잡 엔진: "퇴근 후 화상 수업 두 타임."
// 과외 앱 '과외온' 프로필 → 첫 학생 → 성적이 오르고 소개 → 시간표가 꽉 참 → 소그룹반·자료 판매.
// 시험 기간엔 문의가 몰리고 방학엔 학생이 빠진다. 학부모(돈 내는 고객)와 학생(수업 듣는 고객)을 둘 다 챙겨야 한다.
// 최대 장점은 시공간 파괴: 지방·섬·해외 학생도 받는다. 현실 고생: 학부모 민원, 야근과 수업 겹침(펑크), 목 상함, 수수료.
// 규약: engine/jobs/README.md
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod, salary } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js"; // 초반 고생 배율(ramp)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const K = "tutoring";

// ───────── 기준표 ─────────
// 단계(기획 데이터 levels). 시간당 수업료(만원)는 단계가 오를수록 오른다.
export const LV = [
  null,
  { n: "프로필만 있는 선생님", hr: 3, need: "시작", open: "과외온 프로필 등록, 소개글 작성" },
  { n: "첫 정규 학생", hr: 4, need: "시범수업 성공 1번 · 정규 학생 1명", open: "4주 정기수업, 수업료 시간당 4만" },
  { n: "학부모 단톡의 선생님", hr: 5, need: "정규 학생 5명 · 학부모 후기 5개", open: "시간당 5만, 소개 학생이 들어온다" },
  { n: "입시 전문 화상 강사", hr: 6, need: "정규 학생 8명 · 성적 상승 3건", open: "시간당 6만(입시 전문이면 7만 가까이), 소그룹반, 학부모 오픈채팅방" },
  { n: "화상과외 브랜드 선생님", hr: 7, need: "그룹 수강생 누적 20명 · 자료집 1개 출시", open: "자료집·녹화 보강 판매, 조교 채용" },
];
// 11-21 밸런스(10개 투잡 공통 비교, 기획 tutor.json: 중위 월 100만·p75 200만·p95 400만).
// 원래: 그룹반 1인당 1:1의 45%, 자료집 기본 판매 18만, 4·5단계 시급 6·7만 그대로 → 회사 다니며 10년 차 중앙 월 417만(기획 p95 수준).
// hrLate: 4·5단계 실제 받는 시급 배율(화면 안내 '시간당 6만'은 정가, 할인·결석 보강을 빼면 이만큼).
export const TU_BAL = { grp: 0.4, mat: 12, hrLate: 0.92 };
// v4.28 특이 요소(f30). 효과 크기는 여기 숫자만 바꾸면 된다
export const TU_F30 = {
  // 성적표 심판의 날: 시험 전 달 보강 결정(처음 first번은 꼭, 그 뒤엔 확률 p). pg = 시험 점수 진도 보너스(약 ×14점), 무료 = 학생당 스태미너·다음 달 행동력, 유료 = 월 수업료의 fee 비율을 더 받고 학부모 만족 par
  boost: { p: 0.4, first: 2, free: { pg: 0.35, hp: 2, hpMax: 14, ap: 1 }, paid: { pg: 0.2, fee: 0.3, par: -4 } },
  judge: { leaveD: -4, leaveP: 0.3, refD: 7, refP: 0.4 }, // 이만큼 떨어지면 학원으로(확률) · 이만큼 오르면 소개(확률)
  // 입시 결과(2월): 점수+학부모 만족 보정 ≥ big 대박, ≥ ok 선방. 대박이면 대기 명단(upM달: 문의 +upLam, 수업료 ×upFee), 불합격이 몰리면 소개 끊김(downM달: 소개 ×downRef, 문의 −downLam)
  ipsi: { big: 90, ok: 72, sd: 8, upM: 6, upM2: 12, upLam: 0.6, upFee: 1.08, downM: 8, downRef: 0.3, downLam: 0.4 },
  // 개인과외교습자 신고: minHeads 명부터 안내. 미신고면 달마다 학생 수 × p(상한 cap) 확률로 적발, 과태료 fine. 신고하면 수업료의 taxR 를 세금으로, 회사 눈치 eye, 시범수업 전환 +trust
  lic: { minHeads: 2, p: 0.004, cap: 0.05, fine: [150, 300], taxR: 0.03, eye: 4, trust: 0.04 },
};
// 11-26 챌린지 "시험의 종말": 평가 개편(수업 적합도) + 학령인구 감소. 효과 크기는 여기 숫자만 바꾸면 된다
// k = 종합 세기(적합도 벌점과 인구 감소율에 같이 곱한다). 봇으로 맞출 때는 환경변수 TUK 로 덮어쓴다
export const TU_CH = {
  k: 1,
  news: 24, // 첫 뉴스 장면(달)
  first: 48, gap: 30, jit: 4, warn: 6, // 첫 개편 달 · 개편 간격(±jit) · 예고는 몇 달 전
  drop: 45, dropEarly: 70, earlyT: 60, // 개편 때 적합도가 떨어지는 값(첫 5년 안이면 dropEarly 까지만)
  study: [12, 15], drift: 1, prep: 10, prepMax: 2, // 새 평가 연구 한 번 · 그냥 둘 때 달마다 · 예고 뒤 미리 연구(개편 충격 완화, 최대 횟수)
  // 적합도가 100에서 모자란 만큼(0~1)에 비례하는 벌점: 성적 진도 · 학부모 만족 목표 · 달 이탈 · 소개 · 시범수업 전환
  pg: 0.5, par: 20, churn: 0.04, ref: 0.8, trial: 0.5,
  pop: 0.025, popMin: 0.3, feePop: 0.5, // 문의가 해마다 줄어드는 비율 · 바닥 · 수업료 시세가 수요를 따라 내리는 정도(수요^feePop: 23년 뒤 수요 56%, 시세 75%)
  mood: [34, 62, 96, 130, 170, 215], moodP: 0.5, // 분위기 장면 여섯 개가 열리는 달 · 열린 뒤 달마다 나올 확률
};
const TUK = (typeof process !== "undefined" && +process.env.TUK) || TU_CH.k;
// 평가 방식 이름(0 = 처음). 7번째부터는 EVAL_MORE 를 돌려 쓴다
const EVAL = ["지필 시험(내신·수능)", "서술형 내신", "구술 평가", "AI 감독 실기", "프로젝트 평가", "대학 자체 면접", "시험 없는 시범학교"];
const EVAL_MORE = ["수시 개정 평가", "지역별 평가", "새 감독 AI 평가"];
export const evalName = (n) => (n < EVAL.length ? EVAL[n] : EVAL_MORE[(n - EVAL.length) % EVAL_MORE.length]);
const GRADES = ["초6", "중1", "중2", "중3", "고1", "고2", "고3"];
const GRADE_F = { 초6: 0.8, 중1: 0.85, 중2: 0.85, 중3: 0.9, 고1: 1, 고2: 1, 고3: 1.1, 성인: 0.95 };
// 시공간 파괴: 화상이라 어디 학생이든 받는다
const REGION = [
  { k: "seoul", n: "서울", w: 30, f: 1 },
  { k: "gg", n: "경기", w: 30, f: 1 },
  { k: "city", n: "지방 도시", w: 24, f: 0.95 },
  { k: "isl", n: "섬마을", w: 8, f: 0.9 },
  { k: "ovs", n: "해외(시차)", w: 8, f: 1.3 },
];
// 달별 문의 수요: 3~4·6·9~10월 시험 대비 몰림, 1·7·8월 방학 썰렁
export const SEASON = [0.7, 1.0, 1.35, 1.3, 0.9, 1.2, 0.75, 0.75, 1.35, 1.2, 1.0, 0.9];
const EXAM = { 4: "1학기 중간고사", 6: "1학기 기말고사", 10: "2학기 중간고사", 12: "2학기 기말고사" };
export const examOf = (cal) => EXAM[cal] || null;
const VACATION = [1, 7, 8];
export const isVac = (cal) => VACATION.includes(cal);

// ───────── 보조 ─────────
const T_ = (s) => s[K];
export const employed = (s) => !(s.co?.quit || s.co?.fired);
export const maxOpen = (s) => (employed(s) ? 10 : 16); // 주 타임 상한: 회사 다니면 평일 저녁 5일 × 2타임
export const used = (s) => (T_(s)?.studs || []).reduce((a, x) => a + (x.pause ? 0 : x.wk), 0);
export const usedAll = (s) => (T_(s)?.studs || []).reduce((a, x) => a + x.wk, 0); // 쉬는 학생 자리도 비워 둔다
export const heads = (s) => (T_(s)?.studs || []).reduce((a, x) => a + (x.grp ? x.size : 1), 0);
export const needAp = (s) => { const u = used(s); if (!u) return 0; const per = T_(s).agent ? 6 : 3; return Math.max(1, Math.ceil(u * (T_(s).ai ? 0.85 : 1) / per)); };
export const hourFee = (s) => { const T = T_(s); let h = LV[T.lv].hr * (T.lv >= 4 ? TU_BAL.hrLate : 1) * (T.exam ? 1.1 : 1) * (T.wait ? 1.08 : 1) * (T.feeUp ? 1.1 : 1) * ((T.ipUp || -1) > s.t ? TU_F30.ipsi.upFee : 1); if (s.me?.traits?.includes("nightconsult")) h *= 1.15; h *= feePop(s); return h * SYN.pi(s); };
// 수업 적합도(0~100): 평가 개편이 오면 떨어진다. fitGap = 모자란 정도(0~1) × 세기, fitMul = 벌점 배율
export const fitOf = (s) => T_(s)?.fit ?? 100;
const fitGap = (s) => clamp((100 - fitOf(s)) / 100, 0, 1) * TUK;
const fitMul = (s, c) => clamp(1 - c * fitGap(s), 0.2, 1);
// 학령인구: 문의가 해마다 줄어든다(처음 = 1)
export const popRate = () => Math.min(0.08, TU_CH.pop * TUK);
export const popF = (s) => Math.max(TU_CH.popMin, Math.pow(1 - popRate(), (s.t || 0) / 12));
// 학생이 줄면 선생끼리 값을 깎는다: 수업료 시세 = 수요^feePop (문의만 줄여서는 시간표가 계속 차서 봇 수입이 안 줄었다)
export const feePop = (s) => Math.pow(popF(s), TU_CH.feePop);
// 화면용: 지금 평가 방식 · 적합도 · 예고
export function evalInfo(s) {
  const T = T_(s), left = T.evNext == null ? null : T.evNext - s.t;
  return { n: T.evN || 0, name: evalName(T.evN || 0), fit: Math.round(fitOf(s)), warn: !!T.evWarn && left != null && left > 0, left, nextName: evalName((T.evN || 0) + 1), prep: T.evPrep || 0, pop: popF(s), fee: feePop(s) };
}
// 학생 한 명(또는 그룹 한 반) 월 수업료(만원)
export function feeOf(s, st) {
  const R = REGION.find((x) => x.k === st.reg) || REGION[0];
  if (st.grp) return Math.round(hourFee(s) * 4 * TU_BAL.grp * st.size * 10) / 10; // 4인반: 1인당 1:1의 40%(TU_BAL)
  const hours = st.wk === 2 ? 6 : 4; // 주 2회는 할인(월 8회 = 6시간 값)
  return Math.round(hourFee(s) * hours * (GRADE_F[st.g] || 1) * R.f * (st.subj === "코딩 기초" ? 1.15 : 1) * 10) / 10;
}
const regionPick = (r) => { let x = r.range(0, 100); for (const R of REGION) { if ((x -= R.w) <= 0) return R.k; } return "seoul"; };
const regionN = (k) => (REGION.find((x) => x.k === k) || REGION[0]).n;
function subjPick(s, r, g) {
  const T = T_(s);
  if (g === "성인") return SYN.on(s, "tu_vibe") && r.chance(0.5) ? "코딩 기초" : "영어 회화";
  return r.pick(T.mid ? ["수학", "수학", "영어", "과학"] : ["수학", "수학", "영어", "국어", "과학"]);
}
function gradePick(s, r) {
  const T = T_(s);
  if ((T.adult || SYN.on(s, "tu_vibe")) && r.chance(0.2)) return "성인";
  if (T.mid) return r.pick(["중1", "중2", "중3", "중2", "고1"]);
  if (T.exam) return r.pick(["고1", "고2", "고3", "고3", "중3"]);
  return r.pick(GRADES);
}
// 문의(시범수업 요청) 하나 만들기
function newLead(s, r, how) {
  const T = T_(s), g = gradePick(s, r);
  const L = { id: "L" + (++T.seq), t: s.t, g, subj: subjPick(s, r, g), reg: regionPick(r), wk: r.chance(0.25) ? 2 : 1, how, mood: r.pick(["꼼꼼", "급함", "까다로움", "느긋"]) };
  T.leads.push(L); if (T.leads.length > 5) T.leads.shift();
  return L;
}
export const leadLabel = (L) => `${L.g} ${L.subj}`;
export const studLabel = (st) => (st.grp ? `${st.g} ${st.subj} ${st.size}인반` : `${st.g} ${st.subj}`);
export const regName = regionN;
const HOW = { app: "과외온", ref: "소개", dir: "직거래", sns: "영상 보고" };
export const howName = (k) => HOW[k] || k;

// 시범수업 성공 확률
export function trialP(s, L) {
  const T = T_(s);
  let p = 0.3 + (s.st.talk || 0) / 250 + T.prof / 500 + (L.how === "ref" ? 0.25 : L.how === "sns" ? 0.12 : 0) + T.conv;
  if (SYN.on(s, "tu_cs")) p += 0.1;
  if (SYN.on(s, "tu_mentor")) p += 0.05;
  if (T.lic === 1) p += TU_F30.lic.trust; // f30 교습자 신고증: 학부모 신뢰
  p += mod(s, "tuTrust", 0); // 회사형 인간(defs 성향 카드 tuTrust): 학부모 신뢰 +5%p
  if (L.mood === "까다로움") p -= 0.1;
  if (L.g !== "성인") p *= fitMul(s, TU_CH.trial); // 11-26 평가 개편: 수업이 새 평가에 안 맞으면 전환이 준다
  return clamp(p, 0.15, 0.92);
}
// 학생 등록
function enroll(s, r, L) {
  const T = T_(s);
  const st = { id: "S" + (++T.seq), g: L.g, subj: L.subj, reg: L.reg, wk: L.wk, how: L.how === "app" ? "app" : L.how === "ref" ? "ref" : "dir", grp: false, size: 1,
    sat: 60, par: 62, sc: L.g === "성인" ? 0 : r.int(55, 82), last: 0, pg: 0, pm: 0, months: 0, pause: false, joinT: s.t };
  st.fee = feeOf(s, st);
  T.studs.push(st); T.leads = T.leads.filter((x) => x.id !== L.id); T.wins++; T.everMax = Math.max(T.everMax, heads(s));
  if (L.how === "ref") T.refN++;
  if (["isl", "ovs"].includes(st.reg)) T.far = (T.far || 0) + 1;
  return st;
}
function lose(s, st, why, notes) {
  const T = T_(s); T.studs = T.studs.filter((x) => x !== st); T.lost++;
  if (notes && why) notes.push(`화상과외: ${studLabel(st)}(${regionN(st.reg)}) ${why}`);
}
// 단계 오르기(내려가지는 않는다)
export function lvReady(s, lv) {
  const T = T_(s);
  if (lv === 2) return T.wins >= 1 && heads(s) >= 1;
  if (lv === 3) return heads(s) >= 5 && T.reviews >= 5;
  if (lv === 4) return heads(s) >= 8 && T.ups >= 3;
  if (lv === 5) return T.gtot >= 20 && T.mats >= 1;
  return false;
}
export function lvProgress(s) { // 다음 단계 조건 [글, 지금, 목표]
  const T = T_(s), nx = T.lv + 1;
  if (nx === 2) return [["시범수업 성공", T.wins, 1], ["정규 학생", heads(s), 1]];
  if (nx === 3) return [["정규 학생", heads(s), 5], ["학부모 후기", T.reviews, 5]];
  if (nx === 4) return [["정규 학생", heads(s), 8], ["성적 상승", T.ups, 3]];
  if (nx === 5) return [["그룹 수강생 누적", T.gtot, 20], ["자료집 출시", T.mats, 1]];
  return [];
}
function lvCheck(s, out) {
  const T = T_(s);
  while (T.lv < 5 && lvReady(s, T.lv + 1)) {
    T.lv++; T.lvT = s.t;
    out.push(`화상과외 ${T.lv}단계: ${LV[T.lv].n} (${LV[T.lv].open})`);
    log(s, `화상과외 ${T.lv}단계 '${LV[T.lv].n}'`, "work");
  }
}

// ───────── 이벤트 16개(기획 데이터 events) ─────────
// phase: early(1~2단계) · mid(2~3단계) · late(3단계~) · crisis(조건이 맞을 때)
function evList(s, r, rev) {
  const T = T_(s), pi = SYN.pi(s), sm = Math.max(3, Math.round(rev * 0.08));
  return [
    { id: "e01", ph: "early", ok: () => T.studs.length < 2 && T.msgs >= 3, t: "메시지 199통째",
      x: "과외온에서 학부모들에게 먼저 제안을 보냈다. 오늘로 199통째. 답장은 0. 캐시 잔액이 바닥을 보인다.",
      c: [{ t: "캐시를 충전해 계속 보낸다", eff: { cash: -Math.round(5 * pi), tu_lead: 1 }, text: "200통째에 답장이 왔다. \"시범수업 가능할까요?\"" },
          { t: "소개글을 학부모 시선으로 전면 수정", eff: { stat: { write: 0.8 }, tu_prof: 15 }, text: "'명문대 출신' 대신 '숙제 검사는 매일 사진으로'를 맨 위에 올렸다." }] },
    { id: "e02", ph: "early", ok: () => T.wins < 3, t: "시범수업 전화",
      x: "드디어 시범수업 요청 전화. 학부모와 통화가 잡혔다. 아이는 이차함수 단원에서 막혔다고 한다.",
      c: [{ t: "내 이력보다 아이 얘기를 30분 듣는다", eff: { stat: { talk: 0.6 }, tu_conv: 0.2, tu_lead: 1 }, text: "\"선생님은 얘기를 잘 들어 주시네요.\" 시범수업 날짜가 잡혔다." },
          { t: "학벌과 경력을 열심히 어필한다", eff: { tu_conv: 0.06, tu_lead: 1 }, text: "\"네… 일단 한번 볼게요.\" 목소리가 미지근했다." }] },
    { id: "e03", ph: "early", ok: () => T.studs.length >= 1 && T.wins <= 3, t: "30분 뒤의 전화",
      x: "시범수업이 끝나고 30분을 기다렸다가 학부모에게 전화했다. \"잘하는데, 계산 실수가 반복돼요. 이렇게 고쳐 볼게요.\"",
      c: [{ t: "칭찬과 보완점을 같이 말한다", eff: { tu_par: 12, tu_conv: 0.1, stat: { talk: 0.4 } }, text: "\"그걸 어떻게 30분 만에 보셨어요?\" 엄마의 목소리가 밝아졌다." },
          { t: "잘한다고만 말한다", eff: { tu_par: 3 }, text: "\"그럼 학원 안 다녀도 되겠네요?\" 대화가 이상하게 흘렀다." }] },
    { id: "e04", ph: "early", ok: () => T.prep < 15, t: "문제집 독학의 밤",
      x: "고등 수학 대표유형을 다시 풀고 있다. 10년 만의 미적분. 해설지를 옆에 펴 두고 설명할 수 있다는 게 화상과외의 유일한 위안이다.",
      c: [{ t: "주말 이틀을 문제집에 갈아 넣는다", eff: { hp: -10, tu_prep: 10 }, text: "대표유형 120문제. 손목이 시리다. 그래도 이제 막히지 않는다." },
          { t: "중학생 과목부터 받는다", eff: { tu_mid: 1, mental: 2 }, text: "과외온 프로필에 '중등 전문'을 걸었다. 문의가 조금 늘었다." }] },
    { id: "e05", ph: "mid", ok: () => employed(s) && used(s) >= 2, t: "야근과 수업 사이",
      x: "저녁 8시 수업인데 7시 40분에 팀장이 회의를 소집했다. 노트북 너머로 학생이 기다리고 있다.",
      c: [{ t: "학부모에게 연락해 시간을 옮긴다", eff: { tu_par: -6 }, text: "\"또요?\" 짧은 답장. 학생은 시간 바뀌는 걸 제일 싫어한다." },
          { t: "회의를 빠져나온다", eff: { eye: 8 }, text: "\"급한 일이 있어서요.\" 팀장의 눈썹이 올라갔다." }] },
    { id: "e06", ph: "mid", ok: () => T.lv >= 2 && T.studs.length >= 2, t: "첫 소개 학생",
      x: "학부모가 같은 반 엄마를 소개해 줬다. \"그 선생님 화상인데 꼼꼼하대.\" 광고비 0원으로 문의가 하나 늘었다.",
      c: [{ t: "소개해 준 가정에 한 회 무료 보강", eff: { cash: -Math.round(4 * pi), tu_ref: 1, tu_rev: 2, tu_par: 4 }, text: "엄마 단톡방에 내 이야기가 한 번 더 돌았다." },
          { t: "감사 문자만 보낸다", eff: { tu_ref: 1, tu_rev: 1 }, text: "\"별말씀을요~\" 이모티콘이 왔다." }] },
    { id: "e07", ph: "mid", ok: () => !T.feeUp && T.expo >= 0.99 && T.studs.some((x) => x.how === "app"), t: "앱 밖에서 하시죠",
      pre: () => { T.cut = Math.max(T.cut, 0.27); }, // 11-23: 수수료 인상(20→27%)은 예전 그대로 일어난다(밸런스 유지). 결정은 '직거래로 빠질까'
      x: `${T.cut < 0.25 ? "과외온이 이번 달부터 수수료를 27%로 올렸다. 소식은 학부모 단톡에 먼저 돌았다. " : ""}석 달 본 학생의 어머니가 문자를 보냈다. "선생님, 과외온이 ${Math.round(Math.max(T.cut, 0.27) * 100)}%나 떼 간다면서요. 다음 달부터는 계좌로 바로 드릴게요." 과외온 약관은 앱 밖 결제를 막는다. 걸리면 검색 노출이 깎인다.`,
      c: [{ t: "직거래로 돌린다 (수수료 0, 과외온 노출 −30%)", eff: { tu_direct: 1 }, text: "계좌이체로 바꿨다. 며칠 뒤 과외온에서 경고 메일이 왔고 검색 순위가 뚝 떨어졌다." },
          { t: "앱 결제를 지키고, 다음 달부터 수업료를 10% 올린다", eff: { tu_feeup: 1 }, text: "\"수수료는 제가 안고 갈게요. 대신 수업료를 조금 조정하겠습니다.\" 한 집이 고민해 보겠다고 했다." },
          { t: "약관대로 지금처럼 한다", eff: { tu_par: -2 }, text: "\"약관이 그래서요.\" 답장은 '네' 한 글자였다." }] },
    { id: "e08", ph: "mid", ok: () => !T.autoRep && T.studs.length >= 1, t: "한 달 피드백 문자",
      x: "첫 달이 지났다. 잘한 것, 약한 단원, 다음 달 계획을 정리해 학부모에게 문자를 보냈다. 답장이 길게 왔다.",
      c: [{ t: "매달 정기 리포트로 만든다", eff: { tu_auto: 1, tu_par: 6 }, text: "매달 말일은 리포트 쓰는 날. 스태미너는 들지만 재등록이 확 는다." },
          { t: "이번 한 번만 한다", eff: { tu_par: 6 }, text: "다음 달엔… 아마 바쁠 거다." }] },
    { id: "e09", ph: "mid", ok: () => !T.ai && T.lv >= 2, t: "AI 튜터 광고",
      x: "\"월 1만 9천 원, 24시간 AI 수학 선생님.\" 학부모 한 분이 광고를 캡처해 보내며 물었다. \"이거랑 뭐가 달라요?\"",
      c: [{ t: "동기부여·오답 관리가 강점이라고 설명", eff: { stat: { talk: 0.8 }, tu_par: 5 }, text: "\"AI는 애가 안 하면 그만이잖아요.\" 엄마가 먼저 결론을 냈다." },
          { t: "AI 교재를 수업에 끼워 넣어 효율화", eff: { tu_ai: 1, stat: { num: 0.5 } }, text: "숙제 채점을 AI에 맡겼다. 수업 준비가 15% 줄었다." }] },
    { id: "e10", ph: "late", ok: () => T.lv >= 3 && !T.series, t: "기말 출제경향 영상",
      x: "\"○○중 2학년 기말 수학 출제경향\" 1분짜리 영상을 올렸다. 조회수 3,200. 댓글에 상담 문의가 4개 달렸다.",
      c: [{ t: "시즌마다 학교별 시리즈로 만든다", eff: { hp: -8, tu_series: 1, tu_buzz: 25 }, text: "시험 6주 전마다 영상 세 편. 시험 기간 문의가 눈에 띄게 늘었다." },
          { t: "한 번으로 만족한다", eff: { tu_buzz: 8 }, text: "조회수는 일주일 만에 멈췄다." }] },
    { id: "e11", ph: "late", ok: () => T.lv >= 4 && usedAll(s) >= T.open - 1, t: "소그룹반 개설",
      x: "평일 저녁 시간표가 꽉 찼다. 같은 학년 넷을 묶으면 한 시간에 네 명분을 받는다. 대신 한 명 한 명 봐 주기는 어렵다.",
      c: [{ t: "4인 그룹반 개설", eff: { tu_grp: 1 }, text: "화면에 얼굴 넷. 질문은 채팅으로 받기로 했다." },
          { t: "1:1 유지하고 대기 명단 운영", eff: { tu_wait: 1, tu_rev: 1 }, text: "\"대기 3번째세요.\" 대기 명단이 있다는 것만으로 단가를 올릴 수 있었다." }] },
    { id: "e12", ph: "late", ok: () => T.lv >= 3 && s.cal === 3 && !T.adult && !T.exam, t: "학생 수가 줄었다",
      x: "학년 초, 동네 학원 두 곳이 문을 닫았다는 소식. 학령인구가 줄고 있다. 내 학생도 졸업하면 끝이다.",
      c: [{ t: "성인 대상 과목(회화·코딩)으로 넓힌다", eff: { tu_adult: 1, stat: { lang: 0.6 } }, text: "퇴근한 직장인에게 영어 회화. 시험이 없어서 오히려 편하다." },
          { t: "입시 전문으로 단가를 높인다", eff: { tu_exam: 1 }, text: "프로필 제목을 '고등 내신·수능 전문'으로 바꿨다. 단가 +10%." }] },
    // 11-23 화상과외에서만 생기는 골치 4개
    { id: "e17", ph: "mid", ok: () => kids(s).some((x) => !x.grp) && !!examOf(s.cal % 12 + 1), t: "시험 범위가 바뀌었다",
      x: `${examOf(s.cal % 12 + 1) || "시험"} 3주 전, 학생이 가정통신문 사진을 보냈다. "쌤, 범위에 다음 단원까지 들어간대요." 한 달 동안 만든 대비 프린트 절반이 쓸모없어졌다.`,
      c: [{ t: "주말을 털어 새 범위 프린트를 다시 만든다", eff: { hp: -8, tu_prep: 4, tu_par: 5 }, text: "일요일 밤 11시, 새 프린트 42쪽을 보냈다. 어머니 답장: \"학원보다 빠르시네요.\"" },
          { t: "학교 필기를 받아 수업 중에 같이 푼다 (커리어 판정)", check: { stat: "career", dc: 45 }, ok: { text: "처음 보는 문제인데 그 자리에서 풀렸다. \"쌤은 원래 다 알아요?\"", eff: { tu_par: 4, tu_sat: 5 } }, ng: { text: "풀이가 중간에 막혔다. 화면 너머 침묵이 길었다.", eff: { tu_par: -5, mental: -2 } } },
          { t: "원래 범위만 확실히 한다", eff: { tu_par: -4 }, text: "\"새 단원은 학교 수업 잘 들어.\" 학생은 끄덕였지만 눈이 불안했다." }] },
    { id: "e18", ph: "mid", ok: () => kids(s).some((x) => !x.grp), t: "화면이 안 켜진다",
      x: "8시 수업인데 8시 10분에도 입장이 없다. 메신저의 숫자 1이 안 사라진다. 이번 달만 세 번째다. 화상은 방문을 두드릴 수도 없다.",
      c: [{ t: "학부모에게 바로 알린다", eff: { tu_par: 3, tu_sat: -6 }, text: "5분 뒤 화면이 켜졌다. 학생 뒤로 엄마 그림자가 지나갔다. 수업 내내 대답이 짧았다." },
          { t: "학생과 둘만의 규칙을 정한다 (말빨 판정)", check: { stat: "talk", dc: 45 }, ok: { text: "\"정시 입장 세 번이면 숙제 하루 면제.\" 그 뒤로 2분 먼저 들어온다.", eff: { tu_sat: 8 } }, ng: { text: "\"네네.\" 다음 주에도 화면은 안 켜졌다. 어머니가 먼저 알아챘다.", eff: { tu_par: -5 } } },
          { t: "결석으로 치고 넘어간다", eff: { tu_par: -3 }, text: "수업료는 그대로 들어왔다. 진도는 한 주 밀렸다." }] },
    { id: "e19", ph: "mid", ok: () => T.studs.length >= 2 && kids(s).some((x) => !x.grp), t: "동생도 맡길 테니",
      x: "학부모 전화. \"둘째도 선생님께 맡기려고요. 둘이 하면 좀 깎아 주시죠? 옆집은 형제 할인을 30% 받는대요.\"",
      c: [{ t: `동생 첫 달은 깎아 준다 (−${won(sm)})`, eff: { cash: -sm, tu_ref: 1, tu_par: 4 }, text: "문의 칸에 동생 이름이 올라왔다. 한번 깎은 값은 다시 올리기 어렵다." },
          { t: "정가를 지키고 이유를 설명한다 (말빨 판정)", check: { stat: "talk", dc: 50 }, ok: { text: "\"학년이 다르면 준비도 따로예요.\" 한참 듣더니 그대로 하기로 했다.", eff: { tu_ref: 1 } }, ng: { text: "\"생각해 볼게요.\" 통화가 짧게 끝났다.", eff: { tu_par: -4 } } },
          { t: "시간표가 찼다고 정중히 거절한다", eff: { mental: 1 }, text: "\"자리 나면 꼭 연락 주세요.\" 아쉬운 목소리였다." }] },
    { id: "e20", ph: "late", ok: () => T.lv >= 3 && T.studs.length >= 3, t: "녹화본이 돌아다닌다",
      x: "모르는 학생이 메시지를 보냈다. \"쌤 함수 강의 잘 봤어요!\" 가르친 적 없는 아이다. 누가 수업 화면을 녹화했고, 그 파일이 사촌에게, 사촌의 친구에게 갔다.",
      c: [{ t: "수업 안내문에 '녹화·공유 금지'를 넣는다", eff: { tu_par: -3, stat: { write: 0.4 } }, text: "안내문이 한 줄 늘었다. 한 어머니가 \"복습용인데요\" 하고 서운해했다." },
          { t: "녹화본 끝에 내 프로필을 붙여 홍보로 쓴다", eff: { mental: -2, tu_buzz: 12, tu_lead: 1 }, text: "어차피 도는 영상이면 명함이라도 붙인다. 공짜로 듣는 아이가 늘었고, 문의도 하나 왔다." },
          { t: "모른 척한다", eff: { mental: -3 }, text: "다음 수업부터 화면 구석의 녹화 표시가 자꾸 눈에 밟혔다." }] },
    // 위기(조건으로 따로 부른다)
    { id: "e14", ph: "crisis", ok: () => T.lv >= 2 && avgPar(s) < 58, t: "엄마 단톡의 소문",
      x: "그만둔 학생 어머니가 반 엄마 단톡에 한 줄을 남겼다고 한다. \"그 화상 선생님, 회사 다니면서 하는 거라 답이 늦어요.\" 틀린 말이 아니라 더 아프다. 그 얘기가 과외온 후기 칸까지 올라와 별점이 0.3 내려갔다.",
      pre: () => { T.stars = clamp(T.stars - 0.3, 2.5, 5); },
      c: [{ t: "학부모 모두에게 답장 시간 약속을 돌린다", eff: { mental: -3, tu_stars: 0.15, tu_par: 4 }, text: "\"질문은 밤 10시 전에 꼭 답합니다.\" 약속을 글로 박았다. 이제 지켜야 한다." },
          { t: "한 주 동안 학부모 참관 수업을 연다", eff: { hp: -6, tu_stars: 0.2, tu_rev: 2 }, text: "화면 구석에 어머니 얼굴이 하나씩 떴다. 평소보다 판서를 두 배로 했다. 후기가 두 개 붙었다." },
          { t: "소문은 수업으로 덮는다", eff: { tu_par: -3 }, text: "아무 말도 하지 않았다. 단톡은 내가 못 들어가는 방이다." }] },
    { id: "e15", ph: "crisis", ok: () => used(s) >= 7 && s.hp < 55, t: "목이 나갔다",
      x: `주 ${used(s)}시간 수업에 회사 회의까지. 아침에 목소리가 안 나온다. 오늘 수업이 세 개다.`,
      c: [{ t: "이번 주 전부 휴강하고 보강 약속", eff: { hp: 20, cash: -sm, tu_stars: -0.05, tu_par: -4 }, text: "꿀물과 도라지즙. 보강 일정 짜느라 주말이 사라졌다." },
          { t: "채팅과 판서로 버틴다", eff: { hp: -10, tu_stars: -0.05 }, text: "말 대신 판서로 수업했다. 학생이 웃었다. \"선생님 오늘 묵언 수행이에요?\"" }] },
    { id: "e16", ph: "crisis", ok: () => [12, 1].includes(s.cal) && T.yr >= 300 && !T.taxed, t: "현금 과외비와 연말정산",
      x: "학부모 몇 분이 계좌이체로 과외비를 보낸다. 연말이 다가오자 회사 동료가 묻는다. \"부업 소득 신고했어?\"",
      c: [{ t: "종합소득세를 성실히 신고한다", eff: { cash: -Math.round(T.yr * 0.04), mental: 3, tu_tax: 1 }, text: "세금은 아깝지만 밤에 잠이 잘 온다." },
          { t: "그냥 둔다", eff: { tu_tax: 2 }, text: "계좌 내역은 남는다. 찜찜함도 남는다." }] },
  ];
}
const avgPar = (s) => { const L = T_(s).studs; return L.length ? L.reduce((a, x) => a + x.par, 0) / L.length : 70; };
export { avgPar };
const phaseOk = (T, ph) => (ph === "early" ? T.lv <= 2 : ph === "mid" ? T.lv >= 2 && T.lv <= 4 : ph === "late" ? T.lv >= 3 : false);
function mkScene(T, e) {
  if (e.pre) e.pre();
  T.seen[e.id] = (T.seen[e.id] || 0) + 1;
  return { kind: "event", tag: "화상과외", title: e.t, text: e.x, choices: e.c };
}
function tuEvent(s, r, rev) {
  const T = T_(s), L = evList(s, r, rev).filter((e) => e.ph !== "crisis" && phaseOk(T, e.ph) && e.ok());
  if (!L.length) return null;
  const fresh = L.filter((e) => !T.seen[e.id]);
  return mkScene(T, r.pick(fresh.length ? fresh : L));
}
function crisisEvent(s, r, rev, id) { const e = evList(s, r, rev).find((x) => x.id === id); return e && e.ok() ? mkScene(T_(s), e) : null; }
// e13 성적이 떨어졌다: 시험 결과로 부른다(학생 지정)
function dropScene(s, st, from, to) {
  s._tuEv = { id: st.id };
  T_(s).seen.e13 = (T_(s).seen.e13 || 0) + 1;
  return { kind: "event", tag: "화상과외", title: "성적이 떨어졌다", onChoose: "tu_drop", ...(T_(s).seen.e13 === 1 ? { cine: "tu_drop" } : {}), // 화보는 처음 한 번만
    text: `${studLabel(st)}(${regionN(st.reg)}) 시험 결과가 나왔다. ${from}점에서 ${to}점. 학부모의 문자가 짧다. "이번 달까지만 할게요."`,
    choices: [{ t: "오답 분석표를 만들어 설득 통화", check: { stat: "talk", dc: 45 }, ok: { text: "\"이렇게까지 봐 주시는 줄 몰랐어요.\" 한 달만 더 보기로 했다.", eff: { hp: -8 } }, ng: { text: "\"죄송하지만 학원으로 옮길게요.\"", eff: { hp: -8, mental: -3 } } },
      { t: "깔끔하게 보내 드린다", eff: { mental: -3 }, text: "마지막 수업에 \"그동안 감사했어요\"라고 학생이 먼저 말했다." }] };
}

// ───────── f30 특이 요소 장면: 성적표 심판의 날(보강) · 입시 결과 시즌 · 개인 과외 신고 ─────────
const kids = (s) => T_(s).studs.filter((x) => x.g !== "성인" && !x.pause);
function boostScene(s, nextCal) {
  const T = T_(s), B = TU_F30.boost, n = kids(s).length, hp = Math.min(B.free.hpMax, B.free.hp * n);
  const extra = Math.round(kids(s).reduce((a, x) => a + feeOf(s, x), 0) * B.paid.fee);
  T.seen.f30b = (T.seen.f30b || 0) + 1; s._tuF30 = { cal: nextCal, hp, extra };
  return { kind: "event", tag: "화상과외", title: "성적표 심판의 날 D-21", onChoose: "tu_boost",
    text: `다음 달은 ${examOf(nextCal)}. 학생 ${n}명. 학부모 단톡이 술렁인다. "선생님, 시험 전에 보강 안 해 주세요?" 성적이 오르면 소개가 오고, 떨어지면 학원으로 빠져나간다.`,
    choices: [{ t: "평소 진도대로 간다", eff: {}, text: "흔들리지 않고 하던 대로." },
      { t: `주말 무료 보강 (스태미너 −${hp}, 다음 달 행동력 −${B.free.ap})`, eff: {}, text: "토요일 오전, 화면 속 얼굴들이 졸린 눈을 비볐다." },
      { t: `유료 내신 대비반 (+${won(extra)}, 학부모 만족 ${B.paid.par})`, eff: {}, text: "\"대비반은 따로 받아요.\" 결제는 됐는데 답장이 짧다." }] };
}
function ipsiScene(s, r) {
  const T = T_(s), I = TU_F30.ipsi, G = T.grads || []; T.grads = [];
  let big = 0, ok = 0, fail = 0;
  for (const g of G) { const v = g.sc + (g.par - 60) / 5 + r.normal() * I.sd; if (v >= I.big) big++; else if (v >= I.ok) ok++; else fail++; }
  s._tuF30 = { big, ok, fail };
  const sum = `작년 고3 ${G.length}명: 대박 ${big} · 선방 ${ok} · 불합격 ${fail}.`;
  if (big >= 1) { T.ipUp = s.t + I.upM; return { kind: "event", tag: "화상과외", title: "입시 결과 발표", onChoose: "tu_ipsi",
    text: `정시 발표가 끝났다. ${sum} 합격한 학생 어머니가 떡을 보냈다. 학부모 단톡에서 '그 화상 선생님' 대기 명단 얘기가 나온다.`,
    choices: [{ t: `조용히 축하만 한다 (대기 명단 ${I.upM}달)`, eff: {}, text: "\"선생님 덕분이에요.\" 문자 한 통이면 충분했다." },
      { t: `합격 수기를 받아 홍보한다 (대기 명단 ${I.upM2}달)`, check: { stat: "talk", dc: 45 }, ok: { text: "\"우리 애 이야기가 도움이 된다면요.\" 수기가 프로필 맨 위에 올라갔다.", eff: {} }, ng: { text: "\"애가 그런 거 싫어해서요.\" 정중히 거절당했다.", eff: {} } }] }; }
  if (fail >= 1 && fail > big + ok) { T.ipDown = s.t + I.downM; return { kind: "event", tag: "화상과외", title: "입시 결과 발표", onChoose: "tu_ipsi",
    text: `정시 발표가 끝났다. ${sum} 소개해 주던 어머니들 단톡이 조용하다. 당분간 소개는 기대하기 어렵다(${I.downM}달).`,
    choices: [{ t: "받아들이고 내신 학생에 집중한다", eff: {}, text: "고3은 한 해 농사다. 다음 해를 준비했다." },
      { t: "재수생 무료 진로 상담을 돌린다 (스태미너 −10, 소개 끊김 절반)", eff: {}, text: "떨어진 학생들과 한 명씩 통화했다. 마음이 무겁지만 어머니들 반응이 달라졌다." }] }; }
  return null; // 선방이 많으면 장면 없이 조용히 지나간다
}
function licScene(s, kind) {
  const T = T_(s), L = TU_F30.lic, pi = SYN.pi(s);
  if (kind === "ask") { T.licT = s.t; return { kind: "event", tag: "화상과외", title: "개인과외교습자 신고", onChoose: "tu_lic",
    text: `학생이 ${heads(s)}명이 됐다. 과외 카페 공지: "개인 과외도 교육청에 교습자 신고를 해야 합니다. 안 하면 과태료." 신고하면 소득이 잡히고, 회사에 겸직이 알려질 수도 있다.`,
    choices: [{ t: `교육청에 신고한다 (수업료의 ${Math.round(L.taxR * 100)}% 세금, 회사 눈치 +${L.eye})`, eff: {}, text: "신고증이 나왔다. 학부모에게 영수증을 줄 수 있게 됐다." },
      { t: "일단 신고 없이 받는다 (적발되면 과태료)", eff: {}, text: "계좌이체 내역이 조금씩 쌓인다." }] }; }
  const fine = Math.round((L.fine[0] + (s.t % 7) / 6 * (L.fine[1] - L.fine[0])) * pi); s._tuF30 = { fine };
  return { kind: "event", tag: "화상과외", title: "과태료 고지서", onChoose: "tu_lic",
    text: `교육청에서 우편이 왔다. 미신고 개인 과외 신고가 들어왔다고 한다. 과태료 ${won(fine)}. 그만둔 학생 학부모가 신고했다는 소문이 돈다.`,
    choices: [{ t: `과태료를 내고 바로 신고한다 (−${won(fine)})`, eff: {}, text: "비싼 수업료를 냈다. 이제 떳떳하다." },
      { t: "사정을 적어 의견서를 낸다", check: { stat: "write", dc: 50 }, ok: { text: "처음이라 감경됐다. 과태료 절반.", eff: {} }, ng: { text: "받아들여지지 않았다.", eff: {} } }] };
}
function f30Scene(s, r, cal) {
  const T = T_(s), L = TU_F30.lic, nx = cal % 12 + 1;
  if (cal === 2 && (T.grads || []).length) { const sc = ipsiScene(s, r); if (sc) return sc; }
  if (T.lic === 2 && r.chance(Math.min(L.cap, L.p * heads(s)))) return licScene(s, "fine");
  if (!T.lic && T.lv >= 2 && heads(s) >= L.minHeads && s.t - (T.licT ?? -99) >= 6) return licScene(s, "ask");
  if (examOf(nx) && kids(s).length && ((T.seen.f30b || 0) < TU_F30.boost.first || r.chance(TU_F30.boost.p))) return boostScene(s, nx); // 처음 두 번은 꼭, 그 뒤엔 가끔
  return null;
}
// ───────── 11-26 챌린지 장면: 뉴스 · 평가 개편 · 분위기 ─────────
const CH_REFORM = [
  null,
  { t: "객관식이 사라졌다", x: "교육청 공문이 학부모 단톡에 돌았다. 다음 학기부터 중간·기말고사에서 객관식이 빠진다. 답안은 전부 교실에서 손으로 쓴다. AI가 대신 쓴 답을 가려낼 방법이 없어서라고 한다. 기출 문제집 세 권이 책장에서 조용해졌다.", d: "시험은 한 번 바뀌면 다음에도 바뀐다." },
  { t: "말로 푸는 시험", x: "서술형 답안도 통째로 외워 온다는 말이 나오자 학교가 방식을 또 바꿨다. 이제 학생은 교사 앞에서 풀이를 말로 설명한다. 5분, 질문 세 개. 문제를 맞히는 것과 설명하는 것은 다른 일이다.", d: "'시험 범위'라는 말이 점점 어색해진다." },
  { t: "감독은 AI", x: "평가실에 카메라와 감독 AI가 들어왔다. 학생은 정해진 시간 안에 문제를 풀고, 화면과 시선과 손이 전부 기록된다. 점수는 답이 아니라 풀이 과정에 매겨진다. 사람 채점자는 이의 신청 때만 나온다.", d: "AI를 막으려고 AI를 세웠다. 그 사이에 선 사람이 나다." },
  { t: "시험 날짜가 없다", x: "한 학기 성적이 프로젝트 하나로 정해진다. 주제를 정하고, 조사하고, 발표한다. 시험 날짜가 없으니 '시험 대비'라는 말을 팔 수가 없다. 학부모가 물었다. \"그럼 과외는 뭘 해 주는 거예요?\"", d: "대답을 준비하는 데 며칠이 걸렸다." },
  { t: "점수를 안 믿는 대학", x: "대학들이 내신과 수능 점수를 더는 믿지 않겠다고 했다. 입학은 학교마다 따로 보는 면접과 과제로 정한다. 방식은 학교마다 다르고 해마다 바뀐다. 기출이라는 것이 사라졌다.", d: "모두가 처음 보는 시험을 모두가 처음 준비한다." },
  { t: "시험 없는 학교", x: "시험을 아예 보지 않는 시범학교가 생겼다. 성적표 대신 교사가 쓴 기록이 나간다. 학생 어머니가 전화했다. \"우리 애 학교가 내년에 지정된대요. 그러면 과외는…\" 말끝이 흐려졌다.", d: "시험이 끝나 간다는 것을, 시험을 가르치는 사람이 제일 늦게 안다." },
];
const CH_REFORM_MORE = [
  { t: "또 바뀐다", x: "평가 지침이 또 바뀌었다. 지난번 지침을 익히는 데 걸린 시간보다 그것이 쓰인 시간이 짧았다. 공문 제목은 이번에도 '공정한 평가를 위한 개선안'이다.", d: "익숙해질 만하면 바뀐다. 이제는 그게 규칙이다." },
  { t: "지역마다 다른 평가", x: "올해부터 평가 방식을 지역이 따로 정한다. 화상이라 학생이 전국에 있으니, 준비할 것도 지역 수만큼이다. 섬마을 학생과 서울 학생이 서로 다른 것을 묻는다.", d: "어디 학생이든 받을 수 있다는 장점이 오늘은 짐이다." },
  { t: "감독 AI가 바뀌었다", x: "평가를 맡던 AI가 다른 것으로 교체됐다. 새 AI는 다른 것을 본다. 무엇을 보는지는 아무도 정확히 모른다. 학부모 단톡에는 추측만 돈다.", d: "나도 추측으로 가르친다." },
];
function reformScene(s, n, to) {
  const R = n < CH_REFORM.length ? CH_REFORM[n] : CH_REFORM_MORE[(n - CH_REFORM.length) % CH_REFORM_MORE.length];
  return { kind: "event", tag: "화상과외", title: `평가 개편: ${R.t}`,
    text: `${R.x} ${R.d} (평가 방식: ${evalName(n)} · 수업 적합도 ${Math.round(to)})`,
    choices: [{ t: "주말 내내 새 요강을 읽는다 (스태미너 −5, 수업 적합도 +8)", eff: { hp: -5, tu_fit: 8 }, text: "요강 62쪽에 형광펜을 그었다. 반은 아직 '추후 안내'였다." },
      { t: "일단 하던 대로 수업한다", eff: { mental: -1 }, text: "판서는 그대로인데 학생의 질문이 달라졌다. \"쌤, 이거 이제 안 나온대요.\"" }] };
}
function newsScene() {
  return { kind: "event", tag: "화상과외", title: "답안의 절반",
    text: "저녁 뉴스 자막. \"기말고사 답안 절반이 AI 작성 의심. 학교, 과제를 교실 안 평가로 전환.\" 수업 10분 전에 학부모 문자가 왔다. \"선생님, 이제 뭘 대비해야 돼요?\"",
    choices: [{ t: "\"기본기는 안 바뀝니다\"라고 답한다", eff: {}, text: "보내 놓고 한참 화면을 봤다. 맞는 말인지는 나도 모른다." },
      { t: "\"저도 지켜보고 있어요\"라고 답한다", eff: {}, text: "\"네, 선생님도 모르시는군요.\" 틀린 말은 아니었다." }] };
}
const CH_MOOD = [
  { id: "m1", t: "숙제요? AI가요", x: "숙제 검사를 하다 물었다. \"이 풀이, 네가 쓴 거 맞아?\" 학생은 숨기지도 않았다. \"숙제요? AI가 다 써 줘요. 다들 그래요.\" 화면 너머 표정이 맑았다.",
    c: [{ t: "수업 시간에 같이 다시 푼다", eff: { mental: -1 }, text: "40분이 걸렸다. 숙제를 낸다는 것이 무슨 뜻인지 잠깐 생각했다." }, { t: "웃고 넘긴다", eff: { mental: 1 }, text: "\"그래도 시험장엔 AI가 없어.\" 말하고 나서, 정말 그런지 자신이 없었다." }] },
  { id: "m2", t: "간판을 내리는 학원", x: "퇴근길, 사거리 보습학원 앞에 사다리차가 서 있었다. 15년 걸려 있던 간판이 내려왔다. 유리문에는 '그동안 감사했습니다'. 올해 이 동네 초등학교 입학생은 한 반이라고 한다.",
    c: [{ t: "잠깐 서서 본다", eff: { mental: -2 }, text: "간판 자리에 색이 덜 바랜 네모가 남았다." }, { t: "걸음을 재촉한다", eff: { mental: -1 }, text: "8시 수업이 있다. 오늘은 있다." }] },
  { id: "m3", t: "수능 폐지 공청회", x: "뉴스 속보. 수능 폐지를 두고 공청회가 열렸다. 찬성 쪽은 \"AI 시대에 하루짜리 시험은 의미가 없다\"고 했고, 반대 쪽은 대안이 없다고 했다. 결론은 다음 회의로 넘어갔다.",
    c: [{ t: "끝까지 본다", eff: { mental: -1 }, text: "발표자 누구도 과외 선생 얘기는 하지 않았다. 당연한 일이다." }, { t: "끄고 수업 준비를 한다", eff: { mental: 1 }, text: "오늘 가르칠 단원은 오늘도 시험에 나온다. 아직은." }] },
  { id: "m4", t: "과외 무용론", x: "학부모 단톡방에 글 하나가 돈다고 학생 어머니가 캡처를 보냈다. \"평가가 이렇게 자주 바뀌는데 과외가 무슨 소용이냐.\" 공감이 스물세 개. 어머니는 덧붙였다. \"저는 그렇게 생각 안 해요, 선생님.\"",
    c: [{ t: "\"감사합니다\" 하고 답한다", eff: { mental: -1 }, text: "굳이 보내 주신 이유를 밤새 생각했다." }, { t: "답하지 않고 수업 자료를 고친다", eff: { mental: -2 }, text: "공감 스물세 개 중에 내 학부모가 몇인지 세지 않기로 했다." }] },
  { id: "m5", t: "십 년 뒤", x: "수업이 끝나고 노트북을 닫았다. 방이 조용하다. 내 일은 십 년 뒤에도 있을까. 시험이 없어지면 나는 무엇을 가르치는 사람일까. 답은 안 나오고 내일 수업은 8시다.",
    c: [{ t: "불을 끄고 눕는다", eff: { mental: -2 }, text: "천장을 오래 봤다." }, { t: "내일 수업 프린트를 한 장 더 만든다", eff: { mental: -1 }, text: "십 년 뒤는 모르겠고, 내일 것은 만들 수 있다." }] },
  { id: "m6", t: "예전 제자의 연락", x: "몇 해 전 가르친 학생에게서 메시지가 왔다. \"선생님, 저 취업했어요. 그때 배운 문제는 하나도 기억 안 나요. 근데 모르는 걸 모른다고 말하는 건 선생님한테 배웠어요. 선생님한테 배운 건 시험이 아니었어요.\"",
    c: [{ t: "길게 답장을 쓴다", eff: { mental: 2 }, text: "썼다 지웠다 하다가 \"축하한다. 밥 사라.\"만 보냈다." }, { t: "메시지를 저장해 둔다", eff: { mental: 2 }, text: "힘든 날에 다시 읽으려고 맨 위에 고정했다." }] },
];
function moodScene(s, r) {
  const T = T_(s), C = TU_CH;
  const i = CH_MOOD.findIndex((m, k) => !T.seen[m.id] && s.t >= C.mood[k]);
  if (i < 0 || !r.chance(C.moodP)) return null;
  const m = CH_MOOD[i]; T.seen[m.id] = 1;
  return { kind: "event", tag: "화상과외", title: m.t, text: m.x, choices: m.c };
}
// 달마다 한 번: 적합도 회복 · 예고 · 개편. 장면이 있으면 돌려준다(없으면 null)
function evalTick(s, r, notes, room) {
  const T = T_(s), C = TU_CH;
  if (T.fit == null) T.fit = 100; if (T.evN == null) T.evN = 0;
  if (T.evNext == null) T.evNext = Math.max(C.first + r.int(-2, 2), s.t + C.warn + 1); // 예전 저장·늦게 시작한 사람도 예고부터 받는다
  if (T.fit < 100) T.fit = clamp(T.fit + C.drift, 0, 100);
  if (s.t >= T.evNext) {
    const n = ++T.evN, to = Math.min(T.fit, (s.t < C.earlyT ? C.dropEarly : C.drop) + (T.evPrep || 0) * C.prep);
    T.fit = to; T.evPrep = 0; T.evWarn = false; T.evNext = s.t + C.gap + r.int(-C.jit, C.jit);
    notes.push(`화상과외: 평가 개편 '${evalName(n)}'. 수업 적합도 ${Math.round(to)} · '새 평가 연구'로 올리세요`);
    log(s, `화상과외 평가 개편 ${n}차 '${evalName(n)}'`, "work");
    return reformScene(s, n, to);
  }
  if (!T.evWarn && s.t >= T.evNext - C.warn) { T.evWarn = true; notes.push(`화상과외: 교육청 예고. 약 ${T.evNext - s.t}달 뒤 평가 방식이 '${evalName(T.evN + 1)}'(으)로 바뀐다. 미리 '새 평가 연구'를 해 두면 충격이 준다`); }
  if (room && !T.seen.x01 && s.t >= C.news) { T.seen.x01 = 1; return newsScene(); } // 장면 자리가 없으면 다음 달로 미룬다
  return null;
}
const F30_CHOOSE = {
  tu_boost(s, r, i) {
    const T = T_(s), B = TU_F30.boost, o = s._tuF30 || {}; s._tuF30 = null;
    if (i === 1) { T.bst = { cal: o.cal, k: "free" }; s.hp = clamp(s.hp - (o.hp || 0), 0, s.hpMax); s.apNext -= B.free.ap; return [`스태미너 −${o.hp || 0}`, `다음 달 행동력 −${B.free.ap}`, "시험 성적 +(보강)"]; }
    if (i === 2) { T.bst = { cal: o.cal, k: "paid" }; const v = o.extra || 0; s.cash += v; addMoney(s, "inc", "화상과외 수업료", v); for (const st of T.studs) st.par = clamp(st.par + B.paid.par, 0, 100); return [`대비반 수업료 +${won(v)}`, `학부모 만족 ${B.paid.par}`, "시험 성적 +(대비반)"]; }
    return [];
  },
  tu_ipsi(s, r, i, ok) {
    const T = T_(s), I = TU_F30.ipsi, o = s._tuF30 || {}; s._tuF30 = null;
    if (o.big >= 1) { if (i === 1 && ok) T.ipUp = s.t + I.upM2; const m = T.ipUp - s.t; return [`대기 명단 ${m}달: 문의 +, 수업료 +${Math.round((I.upFee - 1) * 100)}%`]; }
    if (i === 1) { s.hp = clamp(s.hp - 10, 0, s.hpMax); T.ipDown = s.t + Math.ceil(I.downM / 2); }
    return [`소개 끊김 ${Math.max(0, T.ipDown - s.t)}달: 소개 −${Math.round((1 - I.downRef) * 100)}%`, ...(i === 1 ? ["스태미너 −10"] : [])];
  },
  tu_lic(s, r, i, ok) {
    const T = T_(s), L = TU_F30.lic, o = s._tuF30; s._tuF30 = null;
    if (o?.fine) { const f = i === 1 && ok ? Math.round(o.fine / 2) : o.fine; s.cash -= f; addMoney(s, "exp", "화상과외 비용", f); T.lic = 1; const out = [`과태료 −${won(f)}`, "교습자 신고 완료"]; if (i === 1 && !ok) { s.mental = clamp(s.mental - 3, 0, 100); out.push("멘탈 −3"); } return out; }
    if (i === 0) return licOn(s);
    T.lic = 2; return ["미신고: 적발 위험(학생이 많을수록 ↑)"];
  },
};
function licOn(s) {
  const T = T_(s), L = TU_F30.lic; T.lic = 1; const out = ["교습자 신고 완료: 시범수업 전환 +" + Math.round(L.trust * 100) + "%p", `수업료의 ${Math.round(L.taxR * 100)}% 세금`];
  if (employed(s)) { s.co.eye = clamp(s.co.eye + L.eye, 0, 100); out.push(`회사 눈치 +${L.eye}`); }
  return out;
}
export function doLicense(s) { const T = T_(s); if (T.lic === 1) return "이미 신고했어요"; return licOn(s).join(" · "); }
// 시험(#autoN-tutoring-f30boost|f30ipsi|f30lic|f30fine)
export function f30Test(s, r, what) {
  const T = T_(s); if (!T.studs.length) demoSetup(s);
  if (what === "boost") return boostScene(s, 4);
  if (what === "ipsi") { T.grads = [{ sc: 95, par: 85 }, { sc: 70, par: 60 }, { sc: 60, par: 50 }]; return ipsiScene(s, r); }
  if (what === "ipsibad") { T.grads = [{ sc: 50, par: 40 }, { sc: 55, par: 45 }]; return ipsiScene(s, r); }
  if (what === "lic") return licScene(s, "ask");
  if (what === "fine") { T.lic = 2; return licScene(s, "fine"); }
  return null;
}

// ───────── 엔진 ─────────
export default {
  key: K, prefix: "tu_", hubName: "화상과외",
  init: () => ({ v: 1, lv: 1, lvT: 0, studs: [], leads: [], seq: 0, open: 4, ap: 0, mgb: 1, prof: 20, conv: 0, stars: 4.3, reviews: 0, wins: 0, trials: 0, lost: 0, ups: 0, refN: 0,
    msgs: 0, prep: 0, cut: 0.2, expo: 1, buzz: 0, ad: false, agent: false, ai: false, autoRep: false, series: false, mid: false, adult: false, exam: false, wait: false, feeUp: false,
    rec: 0, mats: 0, matT: [], gtot: 0, bst: null, grads: [], ipUp: -1, ipDown: -1, lic: 0, licT: -99, classes: 0, rep: 0, repT: -99, taxed: 0, yr: 0, hist: [], last: null, seen: {}, evT: -99, mon: 0, streak: 0, low: 0, everMax: 0, far: 0, gm: [], started: false, rest: 0,
    fit: 100, evN: 0, evNext: null, evWarn: false, evPrep: 0, studyN: 0 }), // 11-26 평가 개편(TU_CH)

  actions: {
    tu_class: { n: "화상 수업", ap: 1, hp: 4, desc: "이번 달 수업을 한다. 빠지면 펑크 · 학생 만족·성적 ↑" },
    tu_find: { n: "과외온 학생 모집", ap: 1, hp: 2, desc: "학부모에게 제안 메시지 40통(캐시 3만) · 시범수업 문의를 노린다" },
    tu_trial: { n: "시범수업", ap: 1, hp: 3, desc: "문의 온 학생과 1회 시범수업 · 말빨이 전환을 가른다" },
    tu_report: { n: "학부모 리포트", ap: 1, hp: 2, desc: "잘한 것·약한 단원·다음 달 계획 문자 · 학부모 만족·후기 ↑", stat: { write: 0.4 } },
    tu_make: { n: "자료·숏폼 만들기", ap: 1, hp: 4, desc: "출제경향 숏폼(문의 ↑) · 4단계부터 자료집 제작", stat: { write: 0.3 } },
    tu_study: { n: "새 평가 연구", ap: 1, hp: 2, desc: `바뀐 평가 방식을 공부해 수업을 고친다 · 수업 적합도 +${TU_CH.study[0]}~${TU_CH.study[1]}` },
  },
  mg: { tu_class: "career" }, // 건너뛰기 결과는 커리어(교과 지식) 기준. 미니게임 tutoring1~3: 졸지 마 학생아 · 풀이 순서 판서 · 학부모 상담 전화
  money: { inc: ["화상과외 수업료", "화상과외 자료 판매"], exp: ["화상과외 비용"] },
  spots: { home: ["tu_class"], studyst: ["tu_make"] },

  can(s, id, arg) {
    const T = T_(s);
    if (id === "tu_class") return used(s) ? null : "아직 수업할 학생이 없어요";
    if (id === "tu_trial") {
      const L = T.leads.find((x) => x.id === arg) || T.leads[0];
      if (!L) return "시범수업 문의가 없어요(학생 모집부터)";
      if (usedAll(s) + L.wk > T.open) return `시간표가 꽉 찼어요(주 ${T.open}타임). 타임을 늘리세요`;
      return null;
    }
    if (id === "tu_report") return T.studs.length ? null : "리포트를 보낼 학부모가 없어요";
    if (id === "tu_find" && T.leads.length >= 5) return "문의가 5건 쌓였어요. 시범수업부터";
    if (id === "tu_study" && fitOf(s) >= 100) {
      if (!T.evWarn) return "지금 평가 방식엔 수업이 잘 맞아요";
      if ((T.evPrep || 0) >= TU_CH.prepMax) return "미리 할 수 있는 준비는 다 했어요";
    }
    return null;
  },

  act(s, r, id, arg, boost = 1) {
    const T = T_(s), pi = SYN.pi(s); const out = [];
    if (id === "tu_class") {
      const n = needAp(s); T.ap = Math.round((T.ap + boost) * 10) / 10; T.mgb = Math.max(T.mgb, boost); T.classes++;
      for (const st of T.studs) st.sat = clamp(st.sat + 6 * boost * mod(s, "tuSat", 1), 0, 100);
      gainStat(s, "talk", 0.3);
      out.push(`이번 달 수업 ${T.ap}/${n}`, boost >= 1.15 ? "학생 집중도 최고: 만족·성적 +" : "학생 만족 +");
      lvCheck(s, out);
      return { lines: out, msg: r.pick(["\"카메라 켜 주세요~\" 오늘도 첫마디는 이거다.", "퇴근하자마자 노트북을 열었다. 넥타이는 화면 밖에.", "판서 펜이 미끄러졌다. 학생이 \"선생님 글씨 귀여워요\" 했다.", "섬마을 학생 화면이 끊겼다. \"선생님, 여기 배가 지나가서요.\"", "8시 정각. 화면 속 네 개의 얼굴이 동시에 \"안녕하세요\"."]) };
    }
    if (id === "tu_find") {
      const c = Math.round(3 * pi); s.cash -= c; addMoney(s, "exp", "화상과외 비용", c); T.msgs++;
      const p = clamp(0.2 + T.prof / 250 + (T.lv - 1) * 0.05 + (s.st.mkt || 0) / 400, 0.15, 0.7) * SEASON[s.cal - 1] * T.expo * SJ.ramp(s, "tutoring") * SJ.skillRamp(s, "tutoring"); // v4.25b 배우는 기간
      gainStat(s, "mkt", 0.3);
      if (r.chance(p)) { const L = newLead(s, r, "app"); return { lines: [`과외온 캐시 −${won(c)}`, `시범수업 문의: ${leadLabel(L)}(${regionN(L.reg)})`], msg: r.pick(["답장 알림! \"혹시 화상으로도 꼼꼼히 봐 주시나요?\"", `${regionN(L.reg)}에서 연락이 왔다. 화상이라 거리는 상관없다.`]) }; }
      return { lines: [`과외온 캐시 −${won(c)}`, "답장 없음"], msg: r.pick(["읽음 표시만 40개. 답장은 0.", "\"이미 선생님 구했어요.\" 그나마 답장이 온 게 이거다.", "소개글을 다시 봤다. 내가 학부모라도 안 고를 것 같다."]) };
    }
    if (id === "tu_trial") {
      const L = T.leads.find((x) => x.id === arg) || T.leads[0]; T.trials++;
      const p = trialP(s, L) * (0.55 + 0.45 * SJ.ramp(s, "tutoring")); gainStat(s, "talk", 0.5); // 후기 없는 초반엔 시범수업 전환도 낮다
      if (r.chance(p)) {
        const st = enroll(s, r, L);
        out.push(`정규 학생 등록: ${studLabel(st)}`, `월 수업료 ${won(st.fee)}${st.how === "app" ? ` (과외온 수수료 ${Math.round(T.cut * 100)}%)` : ""}`);
        lvCheck(s, out);
        return { lines: out, msg: ["isl", "ovs"].includes(st.reg) ? `${regionN(st.reg)} 학생이다. "동네에 과외 선생님이 없어서요." 화상이라 가능한 인연.` : r.pick(["\"다음 주부터 정기로 할게요!\" 노트북 앞에서 혼자 박수를 쳤다.", "학생이 마지막에 \"오늘 처음으로 이해됐어요\" 했다. 그걸로 결정됐다."]) };
      }
      T.leads = T.leads.filter((x) => x.id !== L.id); T.conv = Math.max(0, T.conv - 0.05);
      return { lines: [`시범수업 불발(성공 확률 ${Math.round(p * 100)}%)`, "말빨 +"], msg: r.pick(["\"생각해 보고 연락드릴게요.\" 연락은 오지 않았다.", "학원이랑 고민하신단다. 30분 뒤에 전화할 걸 그랬다.", "\"선생님 좋은데 아이가 대면을 원해서요.\""]) };
    }
    if (id === "tu_report") {
      const again = T.repT === s.t, g = (again ? 4 : 12) * (1 + mod(s, "tuPar", 0) / 40); T.repT = s.t;
      for (const st of T.studs) st.par = clamp(st.par + g, 0, 100);
      let rv = 0; for (const st of T.studs) if (st.par >= 70 && r.chance(again ? 0.05 : 0.18)) rv++;
      T.reviews += rv; T.stars = clamp(T.stars + rv * 0.03, 2.5, 5);
      out.push(`학부모 만족 +${Math.round(g)}`); if (rv) out.push(`학부모 후기 +${rv}`);
      lvCheck(s, out);
      return { lines: out, msg: r.pick(["\"이번 달 잘한 것: 숙제 100%. 약한 단원: 도형. 다음 달: 기출 3회.\" 전송.", "답장에 하트가 세 개. 학부모는 숫자보다 '관심'을 산다.", "보내고 보니 밤 11시 반. 예약 전송을 배워야겠다."]) };
    }
    if (id === "tu_study") {
      T.studyN = (T.studyN || 0) + 1;
      if (fitOf(s) >= 100) { // 예고가 뜬 뒤 미리 연구: 개편 충격을 줄인다
        T.evPrep = (T.evPrep || 0) + 1;
        return { lines: [`다가올 개편 미리 준비 ${T.evPrep}/${TU_CH.prepMax}`, `개편 때 수업 적합도 +${TU_CH.prep}`], msg: r.pick(["교육청 설명회 자료를 내려받았다. 87쪽. 확정된 것은 날짜뿐이다.", "시범 운영 학교의 후기를 찾아 읽었다. 선생님들도 헤매고 있었다."]) };
      }
      const g = r.int(TU_CH.study[0], TU_CH.study[1]), b = Math.round(fitOf(s)); T.fit = clamp(fitOf(s) + g, 0, 100);
      return { lines: [`수업 적합도 ${b} → ${Math.round(T.fit)}`, T.fit >= 100 ? "새 평가에 수업을 다 맞췄다" : "아직 덜 맞는다"], msg: r.pick(["새 채점 기준표를 세 번 읽었다. 작년 프린트 절반을 지웠다.", "바뀐 방식으로 모의 평가를 직접 풀어 봤다. 나도 시간이 모자랐다.", "다른 선생님들이 올린 후기를 모았다. 다들 같은 데서 막혀 있다.", "수업 계획표를 처음부터 다시 짰다. 지난번에 다시 짠 지 얼마 안 됐다."]) };
    }
    if (id === "tu_make") {
      T.buzz = clamp(T.buzz + 12 * (SYN.on(s, "tu_insta") ? 1.3 : 1), 0, 60);
      out.push("영상·자료 입소문 +");
      if (T.lv >= 4) {
        const g = Math.round(22 * (1 + (s.st.write || 0) / 120));
        T.rec += g; out.push(`자료집 제작 ${Math.min(100, T.rec)}%`);
        if (T.rec >= 100) { T.rec = 0; T.mats++; T.matT.push(s.t); out.push(`자료집 ${T.mats}호 출시! 재능마켓에서 판매`); log(s, `화상과외 자료집 ${T.mats}호 출시`, "work"); lvCheck(s, out); return { lines: out, msg: "개념 정리 PDF와 녹화 보강 영상 묶음. 표지는 내가 만들었다. 촌스럽지만 정이 간다." }; }
      }
      return { lines: out, msg: r.pick(["\"중2 기말 함수 단원 3분 정리\" 숏폼을 올렸다.", "학교별 기출 경향을 표로 정리했다. 이게 진짜 무기다.", "조회수 412. 댓글 하나: \"선생님 과외 하세요?\""]) };
    }
    return null;
  },

  monthStart(s) { const T = T_(s); for (const st of T.studs) st.pause = false; },

  month(s, r, notes, scenes) {
    const T = T_(s), pi = SYN.pi(s), cal = s.cal;
    T.mon++;
    // 1) 방학: 한 달 쉬는 학생
    if (isVac(cal)) for (const st of T.studs) if (!st.grp && st.g !== "성인" && r.chance(0.1)) { st.pause = true; notes.push(`화상과외: ${studLabel(st)} "방학이라 한 달 쉴게요"`); }
    // 2) 수업 품질: 이번 달 수업 행동을 다 했는가
    const n = needAp(s), u = used(s);
    let q = n ? clamp(T.ap / n, 0, 1) : 1;
    if (T.rest) { q *= 0.7; T.rest = 0; }
    // 야근과 수업 겹침: 마감 주간이면 한 타임 펑크
    if (employed(s) && s.co.crunchM && u >= 2) { const st = r.pick(T.studs.filter((x) => !x.pause)); if (st) { st.par = clamp(st.par - 12, 0, 100); notes.push(`화상과외: 회사 마감 주간이라 ${studLabel(st)} 수업 펑크(학부모 만족 −12)`); } }
    const talk = s.st.talk || 0, mgb = T.mgb || 1, gap = fitGap(s), pop = popF(s);
    // 3) 학생마다 정산
    let rev = 0, cutAmt = 0, grpRev = 0;
    for (const st of [...T.studs]) {
      st.months++;
      if (st.pause) continue;
      const fee = feeOf(s, st); st.fee = fee; const kid = st.g !== "성인"; // 11-26 평가 개편 벌점은 시험을 보는 학생에게만
      const got = Math.round(fee * (0.5 + 0.5 * q) * 10) / 10; // 못 한 수업은 환불·보강 미룸
      rev += got; if (st.how === "app") cutAmt += got * T.cut; if (st.grp) grpRev += got;
      // 학생 만족(수업 품질) · 학부모 만족(성적·소통)
      const satT = 35 + 45 * q + (mgb - 1) * 40 - (st.grp ? 10 : 0) + T.prep / 2;
      st.sat = clamp(st.sat + (satT - st.sat) * 0.4, 0, 100);
      const parT = 25 + 40 * q + (st.sat - 50) * 0.25 + (T.autoRep ? 6 : 0) + (st.how === "ref" ? 4 : 0) + mod(s, "tuPar", 0) + (s.me?.traits?.includes("companyman") ? 4 : 0) - (kid ? TU_CH.par * gap : 0);
      st.par = clamp(st.par + (parT - st.par) * 0.25, 0, 100);
      // 성적 진도
      st.pg += q * (0.8 + T.prep / 100 + talk / 200) * (st.grp ? 0.85 : 1) * (0.9 + 0.1 * mgb) * (kid ? fitMul(s, TU_CH.pg) : 1); st.pm++;
      // 이탈: 학부모 만족이 낮을수록
      let churn = 0.015 + Math.max(0, 60 - st.par) / 120 + (1 - q) * 0.12 + (isVac(cal) ? 0.025 : 0) + (T.feeUp && T.feeUpT === s.t ? 0.06 : 0) + (kid ? TU_CH.churn * gap : 0);
      if (s.me?.traits?.includes("lecturer")) churn *= 0.75; // 명강사: 재등록 +
      if (st.months >= 2 && r.chance(churn)) { lose(s, st, st.par < 50 ? "학부모가 그만두기로 했다(만족 낮음)" : r.pick(["학원으로 옮긴다고 한다", "이사·전학으로 그만둔다"]), notes); continue; }
      // 후기·소개
      if (st.par >= 70 && r.chance(T.autoRep ? 0.1 : 0.06)) { T.reviews++; T.stars = clamp(T.stars + 0.01, 2.5, 5); }
      if (T.lv >= 3 && st.par >= 75 && r.chance(0.05 * (st.grp ? 1.5 : 1) * mod(s, "tuRefer", 1) * ((T.ipDown || -1) > s.t ? TU_F30.ipsi.downRef : 1) * (kid ? fitMul(s, TU_CH.ref) : 1))) { newLead(s, r, "ref"); notes.push(`화상과외: ${studLabel(st)} 학부모가 친구 엄마를 소개해 줬다`); }
    }
    // 4) 시험 결과
    const ex = examOf(cal);
    if (ex) {
      let best = null, drop = null, nUp = 0, nDn = 0; const evd = new Set();
      const bst = T.bst && T.bst.cal === cal ? TU_F30.boost[T.bst.k] : null; T.bst = null; // f30 시험 전 보강
      for (const st of T.studs) {
        if (st.g === "성인" || !st.pm) continue;
        const avg = st.pg / st.pm + (bst ? bst.pg : 0); st.pg = 0; st.pm = 0;
        const d = clamp(Math.round((avg - 0.95) * 14 + r.normal() * 4), -15, 15), from = st.sc;
        st.sc = clamp(st.sc + d, 30, 100); st.last = d;
        evd.add(st); if (d >= TU_F30.judge.refD) nUp++; if (d <= TU_F30.judge.leaveD) nDn++;
        if (d >= 7) { T.ups++; st.par = clamp(st.par + 15, 0, 100); if (r.chance(0.4)) T.reviews++; if (!best || d > best.d) best = { st, d }; if (T.lv >= 3 && r.chance(0.35 * fitMul(s, TU_CH.ref))) newLead(s, r, "ref"); }
        else if (d <= -7) { st.par = clamp(st.par - 15, 0, 100); if (!drop || d < drop.d) drop = { st, d, from }; }
      }
      if (best && best.d >= 7) notes.push(`화상과외 ${ex}: ${studLabel(best.st)} ${best.d > 0 ? "+" : ""}${best.d}점! 학부모 단톡에 캡처가 돌았다`);
      if (drop && scenes.length < 3) scenes.push(dropScene(s, drop.st, drop.from, drop.from + drop.d));
      // f30 성적표 심판의 날: 떨어진 학생은 학원으로, 오른 학생은 소개를 데려온다(3단계 전에도)
      const J = TU_F30.judge; let gone = 0, refs = 0;
      for (const st of [...T.studs]) {
        if (!evd.has(st) || st === drop?.st) continue;
        if (st.last <= J.leaveD && r.chance(J.leaveP)) { lose(s, st, null, null); gone++; }
        else if (st.last >= J.refD && T.lv < 3 && r.chance(J.refP)) { newLead(s, r, "ref"); refs++; }
      }
      if (nUp + nDn) notes.push(`화상과외 성적표 심판의 날: 오름 ${nUp} · 내림 ${nDn}${gone ? ` · 학원으로 ${gone}명` : ""}${refs ? ` · 소개 ${refs}건` : ""}${bst ? " (보강 효과)" : ""}`);
    }
    // 5) 학년 올라가기(3월) · 고3 졸업(12월 수능 뒤)
    if (cal === 12) for (const st of [...T.studs]) if (st.g === "고3" && !st.grp) { (T.grads = T.grads || []).push({ sc: st.sc, par: st.par }); lose(s, st, st.par >= 70 ? "수능 끝! 졸업. \"동생도 부탁드려요\"" : "수능이 끝나 졸업했다", notes); T.lost--; if (st.par >= 70 && T.lv >= 2) newLead(s, r, "ref"); }
    if (cal === 3) for (const st of T.studs) if (!st.grp) { const i = GRADES.indexOf(st.g); if (i >= 0 && i < GRADES.length - 1) st.g = GRADES[i + 1]; }
    // 6) 그룹반 채우기(4단계): 빈자리는 소개·문의로 차오른다
    for (const st of T.studs) if (st.grp) { if (st.size >= 3 && r.chance(0.08)) st.size--; if (st.size < 4 && r.chance(0.35 * SEASON[cal - 1] * pop)) { st.size++; T.gtot++; } }
    // 7) 자료집 판매(포화 곡선: 권수가 늘수록 한 권당 덜 팔린다)
    let mat = 0;
    if (T.mats) {
      const per = T.matT.reduce((a, t0) => a + 1 / (1 + (s.t - t0) / 24), 0) / (1 + 0.25 * (T.mats - 1));
      mat = Math.round(TU_BAL.mat * pi * per * SEASON[cal - 1] * clamp(0.6 + (T.stars - 4) * 0.8, 0.3, 1.4) * (1 + Math.min(1, T.reviews / 80)) * (SYN.on(s, "tu_insta") ? 1.15 : 1));
    }
    // 8) 비용: 과외온 수수료 · 툴 구독 · 광고 · 조교 · 자료 수수료
    const tool = Math.round(2 * pi), ad = T.ad ? Math.round(20 * pi) : 0, agent = T.agent ? Math.round(45 * pi) : 0, matCut = Math.round(mat * 0.2);
    const licTax = T.lic === 1 ? Math.round(rev * TU_F30.lic.taxR) : 0; // f30 교습자 신고: 소득이 잡힌다
    const cost = Math.round(cutAmt + tool + ad + agent + matCut + licTax);
    rev = Math.round(rev);
    s.cash += rev + mat - cost;
    if (rev) addMoney(s, "inc", "화상과외 수업료", rev);
    if (mat) addMoney(s, "inc", "화상과외 자료 판매", mat);
    addMoney(s, "exp", "화상과외 비용", cost);
    // 9) 몸과 회사: 저녁 수업은 체력과 눈치를 깎는다
    if (u) { s.hp = clamp(s.hp - Math.round(u * 0.7), 0, s.hpMax); if (u > 6) s.mental = clamp(s.mental - (u - 6), 0, 100); }
    if (T.autoRep && T.studs.length) s.hp = clamp(s.hp - 2, 0, s.hpMax);
    if (employed(s) && u > 6) s.co.eye = clamp(s.co.eye + 0.6 * (u - 6), 0, 100);
    if (SYN.on(s, "tu_late")) s.hp = clamp(s.hp - 3, 0, s.hpMax);
    // 10) 문의 들어오기(시즌·후기·별점·영상·광고). 지난 문의는 한 달 지나면 사라진다
    T.leads = T.leads.filter((L) => s.t - L.t < 2);
    const IP = TU_F30.ipsi, up = (T.ipUp || -1) > s.t, dn = (T.ipDown || -1) > s.t;
    const lam = (0.15 + (up ? IP.upLam : 0) - (dn ? IP.downLam : 0) + Math.min(1, T.reviews / 20) + (T.stars - 4.2) * 0.6 + T.buzz / 50 + (T.ad ? 0.8 : 0) + (T.lv >= 3 ? 0.3 : 0) + (T.series && [3, 5, 9, 11].includes(cal) ? 0.6 : 0))
      * SEASON[cal - 1] * T.expo * (SYN.on(s, "tu_insta") ? 1.2 : 1) * (T.exam ? 0.9 : 1) * pop; // 11-26 학령인구 감소
    let nIn = Math.floor(Math.max(0, lam)) + (r.chance(Math.max(0, lam) % 1) ? 1 : 0); nIn = Math.min(nIn, 3);
    for (let i = 0; i < nIn; i++) newLead(s, r, T.buzz > 15 && r.chance(0.4) ? "sns" : "app");
    if (nIn) notes.push(`화상과외: 시범수업 문의 ${nIn}건${SEASON[cal - 1] >= 1.2 ? "(시험 대비 시즌)" : ""}`);
    T.buzz = Math.max(0, T.buzz * 0.8);
    T.stars = clamp(T.stars + (clamp(3.9 + (avgPar(s) - 60) / 50, 3, 4.85) - T.stars) * 0.15, 2.5, 5);
    T.expo = Math.min(1, T.expo + 0.03);
    // 11) 기록
    const net = rev + mat - cost;
    T.last = { rev, mat, cost, cut: Math.round(cutAmt), q: Math.round(q * 100), n, u, ex };
    T.hist.push(net); if (T.hist.length > 24) T.hist.shift();
    T.gm.push(grpRev + mat); if (T.gm.length > 12) T.gm.shift();
    T.yr = cal === 1 ? net : T.yr + net;
    const h = heads(s); T.everMax = Math.max(T.everMax, h);
    T.streak = h >= 5 && h <= 8 ? T.streak + 1 : 0;
    T.low = h < 2 ? T.low + 1 : 0;
    T.ap = 0; T.mgb = 1;
    lvCheck(s, notes);
    // 12) 장면: 평가 개편(11-26) → 위기 → 단계 이벤트 → 분위기
    const rf = evalTick(s, r, notes, scenes.length < 3);
    if (rf && scenes.length < 3) scenes.push(rf);
    if (scenes.length < 3) {
      let sc = f30Scene(s, r, cal);
      if (!sc && T.studs.length && r.chance(0.35)) sc = crisisEvent(s, r, rev, "e14") || crisisEvent(s, r, rev, "e15");
      if (!sc && [12, 1].includes(cal) && r.chance(0.5)) sc = crisisEvent(s, r, rev, "e16");
      if (!sc && employed(s) && s.co.crunchM && !T.seen.e05) sc = crisisEvent(s, r, rev, "e05");
      if (!sc && s.t - T.evT >= 2 && r.chance(T.mon <= 3 ? 0.4 : 0.16)) sc = tuEvent(s, r, rev);
      if (sc) { T.evT = s.t; scenes.push(sc); }
      else if (!rf) { const md = moodScene(s, r); if (md) scenes.push(md); }
    }
    return net;
  },

  value: (s) => (s[K]?.started ? 10 : 0), // 노트북·웹캠·마이크 중고값
  passive(s) { const T = s[K]; if (!T || !T.mats) return 0; return Math.max(0, Math.round((T.last?.mat || 0) * 0.8)); }, // 자료집은 자는 동안에도 팔린다
  slot: (s) => !!s[K]?.agent,

  todos(s) {
    const T = T_(s), t = [], n = needAp(s);
    if (n && T.ap < n) t.push({ lv: T.ap < n / 2 ? 2 : 1, text: `화상 수업 ${T.ap}/${n}${examOf(s.cal) ? ` · ${examOf(s.cal)} 달` : ""}` });
    if (T.leads.length) t.push({ lv: 1, text: `시범수업 문의 ${T.leads.length}건` });
    if (!T.studs.length && !T.leads.length) t.push({ lv: 1, text: "과외온에서 학생 모집" });
    if (T.studs.length && avgPar(s) < 55 && T.repT !== s.t) t.push({ lv: 1, text: "학부모 만족이 낮아요: 리포트 보내기" });
    if (fitOf(s) < 90) t.push({ lv: fitOf(s) < 60 ? 2 : 1, text: `수업 적합도 ${Math.round(fitOf(s))}: 새 평가 연구` });
    else if (T.evWarn && (T.evPrep || 0) < TU_CH.prepMax) t.push({ lv: 0, text: `평가 개편 예고(약 ${Math.max(0, (T.evNext ?? s.t) - s.t)}달 뒤): 미리 연구` });
    if (T.bst && examOf(T.bst.cal)) t.push({ lv: 0, text: `${examOf(T.bst.cal)} 대비 ${T.bst.k === "free" ? "무료 보강" : "유료 대비반"} 중` });
    return t;
  },

  onStart(s) {
    const T = T_(s); if (T.started) return; T.started = true;
    const c = Math.round(30 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "화상과외 비용", c);
    T.leads = []; newLeadSafe(s);
  },
  onStop(s) { const T = T_(s); T.studs = []; T.leads = []; T.agent = false; T.ad = false; },
  stopWhy: (s) => (s[K]?.agent ? "조교 계약을 먼저 끝내세요" : null),

  // 장면 전용 효과 키
  eff(s, e, out) {
    const T = T_(s);
    if (e.tu_lead) { for (let i = 0; i < e.tu_lead; i++) newLeadDet(s, "app"); out.push(`시범수업 문의 +${e.tu_lead}`); }
    if (e.tu_ref) { for (let i = 0; i < e.tu_ref; i++) newLeadDet(s, "ref"); out.push(`소개 문의 +${e.tu_ref}`); }
    if (e.tu_prof) { T.prof = clamp(T.prof + e.tu_prof, 0, 100); out.push(`과외온 프로필 +${e.tu_prof}`); }
    if (e.tu_conv) { T.conv = clamp(T.conv + e.tu_conv, 0, 0.3); out.push(`시범수업 전환 +${Math.round(e.tu_conv * 100)}%p`); }
    if (e.tu_sat) { for (const st of T.studs) st.sat = clamp(st.sat + e.tu_sat, 0, 100); if (T.studs.length) out.push(`학생 만족 ${e.tu_sat > 0 ? "+" : ""}${e.tu_sat}`); }
    if (e.tu_par) { for (const st of T.studs) st.par = clamp(st.par + e.tu_par, 0, 100); if (T.studs.length) out.push(`학부모 만족 ${e.tu_par > 0 ? "+" : ""}${e.tu_par}`); }
    if (e.tu_rev) { T.reviews += e.tu_rev; out.push(`학부모 후기 +${e.tu_rev}`); }
    if (e.tu_stars) { T.stars = clamp(T.stars + e.tu_stars, 2.5, 5); out.push(`과외온 별점 ${e.tu_stars > 0 ? "+" : ""}${e.tu_stars}`); }
    if (e.tu_fit) { T.fit = clamp(fitOf(s) + e.tu_fit, 0, 100); out.push(`수업 적합도 ${e.tu_fit > 0 ? "+" : ""}${e.tu_fit}`); }
    if (e.tu_prep) { T.prep = clamp(T.prep + e.tu_prep, 0, 30); out.push(`수업 준비도 +${e.tu_prep}`); }
    if (e.tu_mid) { T.mid = true; out.push("중등 전문: 중학생 문의가 늘어요"); }
    if (e.tu_direct) { let k = 0; for (const st of T.studs) if (st.how === "app") { st.how = "dir"; k++; } T.expo = 0.7; out.push(`직거래 전환 ${k}명(수수료 0)`, "과외온 노출 −30%"); }
    if (e.tu_feeup) { T.feeUp = true; T.feeUpT = s.t + 1; out.push("수업료 +10%(다음 달 이탈 조금 ↑)"); }
    if (e.tu_auto) { T.autoRep = true; out.push("매달 정기 리포트: 학부모 만족 +, 매달 스태미너 −2"); }
    if (e.tu_ai) { T.ai = true; out.push("AI 채점 도입: 수업 준비 −15%"); }
    if (e.tu_series) { T.series = true; out.push("시즌마다 학교별 출제경향 시리즈"); }
    if (e.tu_buzz) { T.buzz = clamp(T.buzz + e.tu_buzz, 0, 60); out.push("영상 입소문 +"); }
    if (e.tu_grp) { const ok = openGroup(s); out.push(ok ? "4인 소그룹반 개설(1타임)" : "시간표에 빈 타임이 없어 다음에 열기로"); }
    if (e.tu_wait) { T.wait = true; out.push("대기 명단: 수업료 +8%"); }
    if (e.tu_adult) { T.adult = true; out.push("성인 회화·코딩 과목 열림"); }
    if (e.tu_exam) { T.exam = true; out.push("입시 전문: 수업료 +10%, 고등 문의 위주"); }
    if (e.tu_tax) {
      T.taxed = s.t;
      if (e.tu_tax === 2 && T.yr > 0 && !s.auditAt && hashChance(s, 0.35)) { s.auditAt = s.t + 6 + (s.t % 7); s.auditAmt = Math.round(T.yr * 0.15); }
      out.push(e.tu_tax === 1 ? "세금 신고 완료" : "세무 위험 ↑");
    }
  },
  choose: {
    ...F30_CHOOSE,
    tu_drop(s, r, i, ok) {
      const T = T_(s), st = T.studs.find((x) => x.id === s._tuEv?.id); s._tuEv = null;
      if (!st) return [];
      if (i === 0 && ok) { st.par = clamp(st.par + 20, 0, 100); return ["학생 유지", "학부모 만족 +20"]; }
      lose(s, st, null, null); return [`${studLabel(st)} 그만둠`];
    },
  },
  migrate(s, T) { if (!T.v) T.v = 1; if (!Array.isArray(T.grads)) T.grads = []; for (const k of ["gm", "matT", "hist", "studs", "leads"]) if (!Array.isArray(T[k])) T[k] = []; if (!T.seen) T.seen = {};
    if (T.fit == null) T.fit = 100; if (T.evN == null) T.evN = 0; if (T.evNext === undefined) T.evNext = null; if (T.evPrep == null) T.evPrep = 0; if (T.evWarn == null) T.evWarn = false; }, // 11-26 평가 개편: 예전 저장은 적합도 100에서 시작, 개편 날짜는 다음 달 마감에 잡힌다

  // 단계 화보(성장 마일스톤) + 엔딩 3개
  milestones: [
    { key: "tu_first", title: "첫 정규 학생", test: (s) => (s[K]?.lv || 1) >= 2,
      lines: ["\"다음 주부터 정기로 할게요.\" 노트북을 닫고 한참 앉아 있었다.", "4주 수업 계획표를 처음으로 만들었다. 맨 위에 학생 이름 대신 '1번 학생'이라고 썼다."] },
    { key: "tu_far", title: "시공간 파괴", test: (s) => (s[K]?.far || 0) >= 1,
      lines: ["화면 너머로 파도 소리가 들렸다. 섬마을 학생이었다.", "\"동네엔 과외 선생님이 없어요.\" 화상이 아니면 만날 수 없던 학생이다."] },
    { key: "tu_lv3", title: "학부모 단톡의 선생님", test: (s) => (s[K]?.lv || 1) >= 3,
      lines: ["모르는 번호. \"○○ 엄마 소개로 연락드려요.\" 광고비 0원.", "학부모 단톡방에 내 이름이 '그 화상 선생님'으로 돌고 있었다."] },
    { key: "tu_lv4", title: "입시 전문 화상 강사", test: (s) => (s[K]?.lv || 1) >= 4,
      lines: [`시간당 ${LV[4].hr}만 원. 처음 ${LV[1].hr}만 원 받던 날이 생각났다.`, "평일 저녁 시간표가 빈칸 없이 찼다. 회사 캘린더보다 빽빽하다."] },
    { key: "tu_lv5", title: "화상과외 브랜드", test: (s) => (s[K]?.lv || 1) >= 5,
      lines: ["자료집 판매 알림이 새벽에도 울린다. 내가 자는 동안에도 누군가 내 설명을 듣고 있다.", "조교를 뽑았다. 면접 질문은 하나였다. \"학생이 졸면 어떻게 깨워요?\""] },
    // 엔딩 3개
    { key: "tu_end_star", end: true, kind: "good", epi: "화면 속 스무 명이 아직도 '선생님' 하고 인사한다. 자료집은 자는 동안에도 팔린다.", title: "모니터 속 일타 선생", test: (s) => { const T = s[K]; if (!T || T.lv < 5) return false; const g = (T.gm || []).reduce((a, b) => a + b, 0); return s.fullJob === K || (T.gm.length >= 12 && g >= Math.max(3000, salary(s) * 12)); },
      lines: ["그룹반과 자료집 매출이 회사 연봉을 넘었다.", "카메라 앞이 교실이 되었다. 오늘도 화면 속 스무 개의 얼굴이 인사한다."] },
    { key: "tu_end_local", end: true, kind: "good", epi: "학생 대여섯 명을 5년 넘게 꾸준히 봤다. 졸업한 제자가 동생을 맡기러 왔다.", title: "동네 화상 선생님", test: (s) => (s[K]?.streak || 0) >= 60,
      lines: ["정규 학생 대여섯 명을 5년째. 크게 벌진 않았지만 끊긴 적도 없다.", "졸업한 제자가 동생을 데려왔다. \"선생님, 얘도 수학 망했어요.\""] },
    { key: "tu_end_cash", end: true, kind: "bad", epi: "과외 앱 캐시만 태우고 정규 학생은 끝내 두 명을 넘지 못했다.", title: "캐시만 태운 선생님", test: (s) => (s[K]?.started && (s[K]?.low || 0) >= 12 && (s[K]?.everMax || 0) < 2),
      lines: ["보낸 메시지는 천 통, 받은 답장은 한 통.", "과외온 캐시 결제 내역을 보다 앱을 지웠다. 그래도 미적분은 다시 풀 줄 알게 됐다."] },
  ],
  perks: [
    { id: "p_tu_voice", n: "칠판 목소리", line: "졸던 학생도 내 목소리엔 고개를 든다", pro: "학생 만족 +25%", m: { tuSat: 1.25 }, got: "화상 수업 300번 + 성적 올린 학생 65명", test: (s) => (s[K]?.classes || 0) >= 300 && (s[K]?.wins || 0) >= 65 },
    { id: "p_tu_refer", n: "소개의 소개", line: "엄마들 단톡방이 내 광고판", pro: "소개 문의 +30%", m: { tuRefer: 1.3 }, got: "소개 학생 28명", test: (s) => (s[K]?.refN || 0) >= 28 },
  ],
  perkCine: { p_tu_voice: "tu_lv3", p_tu_refer: "tu_lv3" },
  synergy: [
    { id: "tu_cs", kind: "good", n: "취업컨설팅 × 화상과외", need: "취업컨설팅 + 화상과외", desc: "화상 1:1 상담 화법이 같다: 시범수업 전환 +10%p", test: (s) => !!s.sj?.active?.includes("cs") && !!s.sj?.active?.includes(K) },
    { id: "tu_insta", kind: "good", n: "인별그램 × 화상과외", need: "인별그램 + 화상과외", desc: "수업 인증·학부모 후기 계정: 신규 문의 +20%, 자료 판매 +15%", test: (s) => !!s.sj?.active?.includes("insta") && !!s.sj?.active?.includes(K) },
    { id: "tu_mentor", kind: "good", n: "멘토링 봉사 × 화상과외", need: "취준생 멘토링 봉사 + 화상과외", desc: "듣는 귀가 트였다: 시범수업 전환 +5%p", test: (s) => !!s.sj?.active?.includes(K) && (s.hb?.joined || []).includes("mentor") },
    { id: "tu_vibe", kind: "good", n: "바이브코딩 × 화상과외", need: "바이브코딩 + 화상과외", desc: "코딩 기초 과목이 열린다: 단가 +15%", test: (s) => !!s.sj?.active?.includes("vibe") && !!s.sj?.active?.includes(K) },
    { id: "tu_late", kind: "bad", n: "저녁 수업 × 회사", need: "화상과외 주 8타임 이상 + 회사 다니는 중", desc: "퇴근하자마자 수업: 매달 스태미너 −3", test: (s) => !!s.sj?.active?.includes(K) && employed(s) && used(s) >= 8 },
  ],
  traits: [
    { trait: "familyfirst", t: "학부모 마음을 안다: 화상과외 학부모 만족 +4", m: { tuPar: 4 } },
  ],
};

// ───────── 보드에서 쓰는 조작(화면 플러그인이 부른다) ─────────
export function setOpen(s, v) { const T = T_(s); T.open = clamp(Math.round(v), Math.max(1, usedAll(s)), maxOpen(s)); }
export function toggleAd(s) { const T = T_(s); T.ad = !T.ad; return T.ad ? `유료 광고 켬: 월 ${won(Math.round(20 * SYN.pi(s)))}, 문의 +` : "유료 광고 끔"; }
export function toggleAgent(s) { const T = T_(s); if (T.lv < 5 && !T.agent) return "조교는 5단계부터"; if (T.agent) { const why = SJ.slotLock(s, () => { T.agent = false; return () => { T.agent = true; }; }); if (why) return why; } T.agent = !T.agent; return T.agent ? `조교 채용: 월 ${won(Math.round(45 * SYN.pi(s)))}, 채점·질문 응대(투잡 칸 +1)` : "조교 계약 종료"; }
export function openGroup(s) {
  const T = T_(s); if (T.lv < 4) return false; if (usedAll(s) + 1 > T.open) return false;
  const st = { id: "S" + (++T.seq), g: T.exam ? "고2" : "중3", subj: "수학", reg: "seoul", wk: 1, how: "dir", grp: true, size: 2, sat: 55, par: 60, sc: 65, last: 0, pg: 0, pm: 0, months: 0, pause: false, joinT: s.t };
  st.fee = feeOf(s, st); T.studs.push(st); T.gtot += 2; return true;
}
export function dropStud(s, id) { const T = T_(s), st = T.studs.find((x) => x.id === id); if (!st) return null; lose(s, st, null, null); return `${studLabel(st)} 수업을 마무리했어요`; }
// 시작 때 첫 문의 하나(멘토링·지인 소개 느낌). 난수 없이 정해진 학생
function newLeadSafe(s) { newLeadDet(s, "app"); }
function newLeadDet(s, how) {
  const T = T_(s), k = T.seq + s.t;
  const g = ["중2", "고1", "중3", "고2"][k % 4], subj = ["수학", "영어", "수학", "과학"][k % 4], reg = ["gg", "city", "seoul", "isl", "ovs"][k % 5];
  T.leads.push({ id: "L" + (++T.seq), t: s.t, g, subj, reg, wk: 1, how, mood: "꼼꼼" }); if (T.leads.length > 5) T.leads.shift();
}
function hashChance(s, p) { return ((s.t * 9301 + 49297) % 233280) / 233280 < p; }
// 시험(#auto18-tutoring)용: 보드가 찬 모습을 보여 주는 상태. 게임에서는 부르지 않는다
export function demoSetup(s) {
  const T = T_(s); T.open = 8; T.lv = 3; T.reviews = 6; T.wins = 6; T.ups = 2; T.stars = 4.5; T.prof = 55;
  for (let i = 0; i < 6; i++) newLeadDet(s, i % 2 ? "ref" : "app");
  const fake = { chance: () => true, pick: (a) => a[0], int: (a) => a, range: () => 1, normal: () => 0 };
  for (let i = 0; i < 4; i++) { const st = enroll(s, fake, T.leads[0]); st.par = [80, 45, 70, 90][i]; st.sat = [75, 60, 85, 66][i]; st.months = 3 + i; st.last = [8, -7, 2, 0][i]; }
}
