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
// v4.29 선배 → 라이벌: 목록 항목의 who(인물 id). 그 선배를 만난 적 있으면 등장 글이 바뀌고 '선배에게 먼저 연락한다' 선택지가 생긴다(친구로 시작). 배우자·연인이면 후보에서 뺀다.
export const RIVAL_WHO = { pr_new: "c047", cs_hr: "c030", in_cheap: "c076", ab_next: "c045", uc_roast: "c014", ch_craft: "c066", ta_saju: "c121", wn_rook: "c079", tu_elite: "c054", vb_cheap: "c064" };
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
export const WORDS = {
  pr: { c: "손님", i: "대관", sh: "파티룸", st: "청소 매니저", rv: "후기", sup: "청소 업체", acc: "위생 민원", fee: "건물 관리비", q: "sense" },
  cs: { c: "고객", i: "첨삭", sh: "컨설팅", st: "공동 코치", rv: "후기", sup: "강의 의뢰처", acc: "환불 대란", fee: "플랫폼 수수료", q: "write" },
  insta: { c: "팔로워", i: "콘텐츠", sh: "계정", st: "편집 알바", rv: "댓글", sup: "협찬 업체", acc: "뒷광고 논란", fee: "광고 대행 수수료", q: "sense" },
  airbnb: { c: "게스트", i: "숙박", sh: "숙소", st: "청소 매니저", rv: "후기", sup: "세탁 업체", acc: "벌레 후기 대란", fee: "플랫폼 수수료", q: "sense" },
  ucafe: { c: "손님", i: "커피", sh: "카페", st: "관리 알바", rv: "리뷰", sup: "원두 업체", acc: "위생 점검 적발", fee: "월세", q: "hands" },
  chicken: { c: "손님", i: "치킨", sh: "가게", st: "주방 알바", rv: "리뷰", sup: "닭 공급처", acc: "위생 점검 적발", fee: "배달 앱 수수료", q: "hands" },
  tutoring: { c: "학생", i: "수업", sh: "과외", st: "보조 강사", rv: "후기", sup: "교재 업체", acc: "환불 분쟁", fee: "중개 수수료", q: "career" },
  tarot: { c: "손님", i: "상담", sh: "상담실", st: "보조 리더", rv: "후기", sup: "행사 대행사", acc: "과장 광고 신고", fee: "상담실 월세", q: "talk" },
  webnovel: { c: "독자", i: "연재", sh: "작품", st: "표지 작가", rv: "댓글", sup: "담당 편집자", acc: "표절 논란", fee: "플랫폼 수수료", q: "write" },
  vibe: { c: "고객사", i: "외주", sh: "작업", st: "하청 개발자", rv: "평가", sup: "외주 중개 담당자", acc: "납기 사고", fee: "중개 수수료", q: "num" },
};

// ── 투잡별 라이벌 후보: n 이름, d 한 줄 소개, kind, sk 실력 범위, pc 가격(내 가격 = 100), p 압박, intro 첫 등장 ──
export const RIVALS = {
  pr: { max: 3, list: [
    { id: "pr_2f", n: "별빛살롱", d: "같은 건물 2층 파티룸", kind: "price", sk: [35, 50], pc: 75, p: 0.09, intro: "같은 건물 2층에 파티룸이 생겼다. 엘리베이터 거울에 전단이 붙었다. '오픈 기념 25% 할인'. 내 손님이 그 전단을 사진으로 찍어 갔다." },
    { id: "pr_new", n: "스튜디오 오늘", d: "5분 거리 신축 파티룸", kind: "skill", sk: [50, 65], pc: 120, p: 0.08, intro: "5분 거리에 신축 파티룸이 문을 열었다. 통창, 대형 빔, 포토존 세 개. 사진만 봐도 손님들 눈이 돌아간다." },
    { id: "pr_big", n: "파티팩토리", d: "역 앞 대형 파티룸", kind: "price", sk: [40, 55], pc: 70, p: 0.1, intro: "역 앞에 방이 열두 개인 대형 파티룸이 들어왔다. 평일 1시간 9,900원. 그 가격이 어떻게 나오는지 계산이 안 된다." },
  ] },
  cs: { max: 3, list: [
    { id: "cs_fac", n: "오만원 첨삭소", d: "저가 첨삭 공장", kind: "price", sk: [30, 45], pc: 50, p: 0.09, intro: "'자소서 첨삭 5만 원, 24시간 완료' 광고가 내 광고 바로 위에 떴다. 첨삭하는 사람이 열 명, 후기가 천 개다." },
    { id: "cs_hr", n: "전직 인사팀장 코치", d: "대기업 인사팀 출신 코치", kind: "skill", sk: [55, 72], pc: 160, p: 0.08, intro: "'20년 인사팀, 서류 만 장을 본 눈'. 대기업 출신 코치가 같은 판에 들어왔다. 가격은 내 두 배 가까운데 예약이 찬다." },
    { id: "cs_ai", n: "AI 자소서 99", d: "AI 자동 첨삭 서비스", kind: "price", sk: [25, 40], pc: 20, p: 0.07, intro: "'AI가 3분 만에 자소서 완성, 월 9,900원' 광고가 취준생 커뮤니티를 덮었다. 고객 한 명이 물었다. \"이거랑 뭐가 달라요?\"" },
  ] },
  insta: { max: 2, list: [
    { id: "in_rise", n: "먹방요정", d: "같은 분야 급성장 계정", kind: "skill", sk: [45, 62], pc: 100, p: 0.08, intro: "같은 분야에서 팔로워가 한 달 만에 두 배가 된 계정이 있다. 내가 올린 장소에 그 계정이 사흘 뒤 다녀갔다. 좋아요는 그쪽이 세 배." },
    { id: "in_cheap", n: "오늘도리뷰", d: "협찬 단가 후려치는 계정", kind: "price", sk: [30, 45], pc: 50, p: 0.08, intro: "협찬 담당자가 말했다. \"다른 계정은 절반 가격에 해 준다던데요?\" 이름을 들어 보니 오늘도리뷰다." },
  ] },
  airbnb: { max: 2, list: [
    { id: "ab_next", n: "골목스테이", d: "옆 골목 신축 숙소", kind: "skill", sk: [45, 62], pc: 115, p: 0.08, intro: "옆 골목에 신축 숙소가 올라갔다. 루프탑 자쿠지에 한옥 창. 내 숙소 상세 페이지 바로 아래 '비슷한 숙소'로 뜬다." },
    { id: "ab_mass", n: "스테이백", d: "숙소 100채 관리업체", kind: "price", sk: [35, 50], pc: 80, p: 0.09, intro: "숙소 100채를 굴리는 관리업체가 동네에 들어왔다. 1박이 내 것보다 2만 원 싸다. 청소는 공장처럼 돌린다." },
  ] },
  ucafe: { max: 2, list: [
    { id: "uc_cheap", n: "천원커피", d: "맞은편 저가 커피", kind: "price", sk: [35, 50], pc: 60, p: 0.1, intro: "맞은편에 저가 커피가 생겼다. 아메리카노 천오백 원. 출근길 줄이 그쪽으로 섰다." },
    { id: "uc_roast", n: "로스터리 숨", d: "골목 개인 로스터리", kind: "skill", sk: [50, 66], pc: 140, p: 0.07, intro: "골목 안쪽에 개인 로스터리 카페가 열었다. 원두 볶는 냄새가 큰길까지 나온다. 커피 좀 아는 손님들이 그쪽으로 간다." },
  ] },
  chicken: { max: 2, list: [
    { id: "ch_other", n: "바삭왕 치킨", d: "길 건너 다른 브랜드", kind: "price", sk: [40, 55], pc: 85, p: 0.1, intro: "길 건너에 다른 브랜드 치킨집이 오픈했다. '오픈 기념 한 마리 값에 두 마리'. 배달 앱 순위가 하룻밤 새 밀렸다." },
    { id: "ch_craft", n: "닭장인", d: "동네 수제 치킨집", kind: "skill", sk: [52, 68], pc: 115, p: 0.08, intro: "사장님이 직접 염지하는 수제 치킨집이 동네에 생겼다. 동네 커뮤니티에 '여기 진짜 맛집' 글이 하루 세 개씩 올라온다." },
  ] },
  tutoring: { max: 2, list: [
    { id: "tu_elite", n: "명문대생 쌤", d: "명문대생 과외", kind: "skill", sk: [52, 68], pc: 90, p: 0.08, intro: "학부모 단톡방에 명문대생 과외 공고가 돌았다. '전 과목 1등급, 시범 수업 무료'. 내 학생 어머님도 그 공고를 봤다." },
    { id: "tu_app", n: "1분 질문 앱", d: "문제풀이 앱", kind: "price", sk: [30, 45], pc: 30, p: 0.07, intro: "'질문 하나에 1분, 월 1만 원' 문제풀이 앱이 학교에 퍼졌다. 학생이 물었다. \"쌤, 앱이 더 빠르던데요?\"" },
  ] },
  tarot: { max: 2, list: [
    { id: "ta_saju", n: "달빛사주", d: "건너편 사주카페", kind: "price", sk: [38, 52], pc: 70, p: 0.09, intro: "건너편에 사주카페가 생겼다. '타로+사주 세트 만 원'. 내 부스 앞을 지나던 손님이 그쪽으로 들어갔다." },
    { id: "ta_tv", n: "방송 나온 타로 마스터", d: "예능 출연 타로 마스터", kind: "skill", sk: [55, 70], pc: 180, p: 0.08, intro: "예능에 나온 타로 마스터가 근처에 상담실을 열었다. 대기 석 달. 손님들이 \"거기 못 가서 왔어요\"라고 한다." },
  ] },
  webnovel: { max: 2, list: [
    { id: "wn_rook", n: "폭주작가", d: "같은 장르 하루 3연재 신인", kind: "skill", sk: [48, 65], pc: 100, p: 0.08, intro: "같은 장르에 하루 세 편씩 올리는 신인이 나타났다. 내 작품 바로 위로 순위가 오른다. 댓글창엔 '이 작가 미쳤다'." },
    { id: "wn_mass", n: "양산 연재 계정", d: "AI로 찍어 내는 무료 연재", kind: "price", sk: [25, 42], pc: 40, p: 0.07, intro: "제목만 바꾼 비슷한 작품이 하루 열 개씩 올라온다. 무료 회차를 끝없이 풀어 독자를 쓸어 간다." },
  ] },
  vibe: { max: 2, list: [
    { id: "vb_cheap", n: "만원코딩", d: "저가 외주 팀", kind: "price", sk: [35, 50], pc: 45, p: 0.09, intro: "견적 비교 사이트에 '홈페이지 30만 원, 3일 완성' 팀이 올라왔다. 내 견적서를 받아 간 고객이 그쪽과 계약했다." },
    { id: "vb_pro", n: "10년 차 개발자", d: "개발자 출신 프리랜서", kind: "skill", sk: [55, 72], pc: 150, p: 0.08, intro: "10년 차 개발자가 같은 플랫폼에 들어왔다. 포트폴리오가 화려하다. '유지보수까지 평생 책임' 문구에 고객이 몰린다." },
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
      x.st = "gone"; addMod(s, job, 0.06, 4); notes.push(`라이벌 ${U(x.n)} 조용히 문을 닫았다(반사이익 +6% · 4개월)`); log(s, `라이벌 ${x.n} 폐업`, "work");
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
  const w = RIVAL_WHO[d.id]; if (whoOk(s, w)) { x.who = w; x.knew = !!s.rel[w]; if (!s.cast.includes(w)) s.cast.push(w); const q = ensureRel(s, w); q.rival = true; } // v4.29 선배가 라이벌로
  st(s).list.push(x); log(s, `라이벌 등장: ${x.n}(${x.d})`, "work");
  return x;
}
function addMod(s, job, v, m) { const V = st(s); (V.mod[job] = (V.mod[job] || []).filter((x) => x.until > s.t)).push({ v, until: s.t + m }); }
function okEv(s, e, x) {
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
  const d = RIVALS[x.job].list.find((q) => q.id === x.id), Wd = WORDS[x.job];
  const wn = x.who && CHAR[x.who]?.name, sen = x.who && x.knew;
  return { kind: "event", tag: "라이벌", title: `라이벌 등장 · ${x.n}`, ...(x.who ? { who: x.who, expr: "smile" } : {}), text: `${sen ? `커피를 사 주던 선배 ${I(wn)} '${x.n}'을(를) 열었다. "이제 경쟁이네요. 봐주진 않을게요."\n` : wn ? `'${x.n}' 사장은 ${wn}. 처음 보는 얼굴이다.\n` : ""}${d.intro}\n(${KIND_N[x.kind]} · 실력 ${x.sk} · 가격 내 ${x.pc}% · ${D.SIDEJOBS[x.job].n} 이익 −${pct(x.p)} 압박)`, onChoose: "rv_meet", rv: x.id, cine: cine("rival_appear"),
    choices: fixChecks([
      K(`손님인 척 정찰을 간다`, Wd.q, -5, O(`약점이 보였다. ${x.kind === "price" ? "싼 대신 디테일이 없다." : "좋긴 한데 손이 많이 가서 오래 못 버틸 것 같다."} 내 ${L(Wd.i)} 다시 손봤다.`, { stat: { [Wd.q]: 1 } }, { p: -0.02 }), O("구경만 하고 왔다. 솔직히 좋았다. 그게 더 무섭다.", { mental: -2 })),
      C("떡 한 상자 들고 인사를 간다", { cash: -M(s, 3), mental: 1 }, `${x.n} 사장님이 놀랐다. "경쟁자가 먼저 오는 건 처음이네요." 명함을 주고받았다.`, { rel: 20 }),
      C("신경 끈다. 내 할 일만 한다", { mental: 1 }, `${L(x.n)} 검색해 보는 걸 하루에 세 번까지만 하기로 했다.`),
      ...(sen ? [C("선배에게 먼저 연락한다", { mental: 1, aff: 4 }, `${wn}: "역시 연락할 줄 알았어요. 경쟁은 경쟁이고, 밥은 밥이죠."`, { rel: 50 })] : []),
    ], x) };
}
function evScene(s, e, x) {
  const Wd = WORDS[x.job], sc = e.mk(s, x, Wd);
  return { kind: "event", tag: "라이벌", title: sc.title, ...(x.who && CHAR[x.who] ? { who: x.who } : {}), text: sc.text + `\n(라이벌 ${x.n}${x.who && CHAR[x.who] ? ` · ${CHAR[x.who].name}` : ""} · ${KIND_N[x.kind]} · 실력 ${x.sk})`, onChoose: "rv_ev", rv: x.id, ev: e.id, cine: e.cine ? cine(e.cine) : undefined, choices: fixChecks(sc.choices, x) };
}

// ── 이벤트 목록 ── g: 좋은 일(true)/나쁜 일(false), need: "on"(경쟁 중)|"ally"(협업·친구)|없음(아무 때나), kind: 성향 제한
// x: p 라이벌 압박 ±, pc 라이벌 가격 ±, sk 라이벌 실력 ±, mod [v, 달] 내 이익 ±(기간), st "on"/"ally"/"gone", rel 사이 ±, war 가격 전쟁, end 화보 키(결과 화면 뒤)
export const EVS = [
  // ───── 나쁜 일 ─────
  { id: "cut", g: false, need: "on", kind: "price", w: 1.4, cine: "rival_war", mk: (s, x, w) => ({ title: "가격 후려치기", text: `${I(x.n)} ${w.i} 가격을 또 내렸다. 현수막: '오픈 기념 반값 연장'. ${w.c} 문의가 뚝 끊겼다.`, choices: [
    C("가격 맞불을 놓는다 (6개월 이익 −6%)", { mental: -1 }, "우리도 내렸다. 손님은 돌아왔는데 남는 게 없다. 이게 맞나?", { mod: [-0.06, 6], p: -0.04, pc: -5, war: true }),
    K(`가격 대신 ${w.i} 품질로 승부한다`, w.q, 0, O(`"비싸도 여기가 낫네요." ${w.c} 몇 명이 돌아왔다.`, { mental: 3 }, { p: -0.03 }), O("품질을 올렸는데 아무도 몰라준다. 가격표만 본다.", { mental: -3 }, { p: 0.01 })),
    C("그냥 둔다. 싼 데는 싼 손님이 간다", { mental: -2 }, "그 말이 반은 맞았다. 반은 내 손님이었다.", { p: 0.02 }),
  ] }) },
  { id: "coupon", g: false, need: "on", kind: "price", mk: (s, x, w) => ({ title: "첫 방문 0원 쿠폰", text: `${I(x.n)} '첫 ${w.i} 0원' 쿠폰을 뿌렸다. 동네 단톡방, 커뮤니티, 전단까지. 공짜는 이길 수가 없다.`, choices: [
    C(`단골 쿠폰으로 맞대응한다`, { cash: -M(s, 30) }, `단골들이 쿠폰을 쓰러 왔다. "역시 여기죠" 한마디에 30만 원이 아깝지 않았다.`, { p: -0.02 }),
    K(`${w.rv}로 맞선다. 진짜 ${w.c} 이야기를 모은다`, "mkt", 0, O(`진짜 ${w.rv} 스무 개가 쿠폰보다 셌다.`, { mental: 2 }, { p: -0.02 }), O(`${w.rv} 부탁을 하다가 오히려 부담스럽다는 말을 들었다.`, { mental: -2 })),
    C("공짜 손님은 어차피 안 남는다", { mental: -1 }, "석 달 뒤 쿠폰이 끝나자 절반은 돌아왔다. 절반은.", { p: 0.01 }),
  ] }) },
  { id: "bulk", g: false, need: "on", kind: "price", mk: (s, x, w) => ({ title: "큰 건을 뺏겼다", text: `견적까지 낸 큰 건이 ${RO(x.n)} 넘어갔다. "거기가 30% 싸더라고요." 계약서를 쓰기 직전이었다.`, choices: [
    K("견적을 다시 짜서 들고 간다", "num", 5, O("남는 건 줄였지만 계약은 지켰다. 다음부턴 그쪽이 먼저 연락 온다.", { cash: M(s, 40), mental: 2 }), O("숫자를 아무리 짜도 30%는 못 이긴다.", { mental: -3 })),
    C("보낸다. 다음 건을 노린다", { mental: -2 }, "달력 한 칸이 비었다. 그 칸이 유독 넓어 보인다."),
  ] }) },
  { id: "war2", g: false, need: "on", kind: "price", ok: (s, x) => x.war, cine: "rival_war", mk: (s, x, w) => ({ title: "출혈 경쟁 2라운드", text: `${I(x.n)} 한 번 더 내렸다. 이제 원가 아래다. 누가 먼저 쓰러지나 보자는 거다.`, choices: [
    K("끝까지 간다. 버티는 쪽이 이긴다", "num", 8, O(`석 달 뒤, ${x.n} 유리문에 '임대 문의'가 붙었다. 이겼다. 상처뿐인 승리지만.`, { mental: 2 }, { st: "gone", mod: [0.08, 6], end: "rival_close" }), O("통장이 먼저 비었다. 가격을 원래대로 돌리니 손님이 더 빠졌다.", { mental: -6 }, { mod: [-0.1, 6], war: false })),
    K("휴전을 제안한다", "talk", 0, O(`"솔직히 저도 죽겠어요." 둘 다 가격을 되돌렸다.`, { mental: 3 }, { p: -0.04, pc: 10, war: false, rel: 15 }), O("\"무서우세요?\" 대화는 3분 만에 끝났다.", { mental: -3 })),
    C("나만 빠진다. 가격을 되돌린다", { mental: -1 }, "가격표를 원래대로 바꿨다. 싼 손님은 떠났고, 숨이 좀 쉬어진다.", { war: false, p: 0.01 }),
  ] }) },
  { id: "poach", g: false, need: "on", kind: "skill", w: 1.3, mk: (s, x, w) => ({ title: "단골을 뺏겼다", text: `3년 단골 ${I(w.c)} ${RO(x.n)} 갔다. 우연히 들은 말: "거기 요즘 진짜 좋더라고요."`, choices: [
    K("직접 연락해 이유를 듣고 고친다", w.q, 0, O(`"사실 그게 좀 불편했어요." 그 말 한마디로 ${L(w.i)} 고쳤다. 다음 달 다시 왔다.`, { stat: { [w.q]: 1 }, mental: 2 }, { p: -0.03 }), O("\"아뇨, 그냥요.\" 그냥이 제일 아프다.", { mental: -3 })),
    C("단골 할인을 새로 만든다", { cash: -M(s, 25) }, "할인은 효과가 있었다. 할인에만 효과가 있었다.", { p: -0.02 }),
    C("보내 준다. 오는 사람 잘하면 된다", { mental: -2 }, "마음은 넓게, 매출은 좁게.", { p: 0.01 }),
  ] }) },
  { id: "copy", g: false, cine: "rival_copy", mk: (s, x, w) => ({ title: "내 컨셉을 베꼈다", text: `${x.n}의 새 ${w.i} 소개를 봤다. 내 것과 판박이다. 사진 구도, 소개 문구, 이름 붙이는 방식까지.`, choices: [
    K("한발 앞선 새 컨셉으로 간다", "sense", 0, O("베끼는 쪽은 늘 한 박자 늦다. 이번에도 그랬다.", { stat: { sense: 1 }, mental: 3 }, { p: -0.03 }), O("새 컨셉이 어설펐다. 오히려 그쪽이 원조처럼 보인다.", { mental: -4 }, { p: 0.02 })),
    C("정중하지만 분명한 메시지를 보낸다", { mental: -1 }, `"참고만 했어요." 답장은 짧았다. 그래도 다음 달 문구는 바뀌었다.`, { rel: -10, p: -0.01 }),
    C("따라 하면 원조가 이긴다", { mental: 1 }, `${w.c} 몇 명이 먼저 알아봤다. "여기가 원조죠?"`),
  ] }) },
  { id: "staff", g: false, ok: (s, x) => ["pr", "airbnb", "ucafe", "chicken", "cs", "tutoring", "vibe"].includes(x.job), mk: (s, x, w) => ({ title: "사람을 빼 갔다", text: `${I(w.st)} 조심스레 말했다. "${x.n}에서 시급을 더 준대요. 저도 고민이…"`, choices: [
    C("돈을 올려 붙잡는다", { cash: -M(s, 40) }, "붙잡았다. 다음 달부터 비용이 조금 늘었다.", { mod: [-0.02, 6] }),
    K("진심으로 이야기한다", "talk", -5, O("\"사장님이랑 일하는 게 편해서요.\" 그 말에 그날 밤 잠을 잘 잤다.", { mental: 4 }), O("결국 갔다. 새 사람을 구하는 한 달 동안 몸이 두 배로 힘들었다.", { hp: -8, mental: -3 }, { mod: [-0.03, 2] })),
    C("보내고 새로 구한다", { hp: -6, mental: -2 }, "인수인계는 사흘. 새 사람은 아직 서툴다.", { mod: [-0.03, 2] }),
  ] }) },
  { id: "terror", g: false, w: 1.2, mk: (s, x, w) => ({ title: "별점 테러 의심", text: `하룻밤 새 별 하나짜리 ${w.rv} 다섯 개. 아이디는 전부 어제 만든 것. 시기가 ${x.n} 할인 행사랑 딱 겹친다.`, choices: [
    K("증거를 모아 신고한다", "write", -5, O("다섯 개 중 네 개가 지워졌다. 플랫폼이 경고 문자를 보냈다고 한다.", { mental: 3 }, { p: -0.01 }), O("'규정 위반 아님'. 답장이 기계 같다.", { mental: -3 }, { mod: [-0.04, 3] })),
    K("정중한 답글을 하나하나 단다", "talk", -5, O(`답글을 본 ${w.c}들이 오히려 편을 들어 줬다.`, { mental: 2 }), O("답글이 변명처럼 읽혔다.", { mental: -2 }, { mod: [-0.04, 3] })),
    K("똑같이 갚아 준다", "sense", 15, O("아무도 몰랐다. 그런데 기분이 별로다.", { mental: -1 }, { p: -0.02, rel: -20 }), O("캡처가 동네 커뮤니티에 돌았다. '사장님이 직접 테러?'", { mental: -8 }, { mod: [-0.1, 6], rel: -30 })),
  ] }) },
  { id: "renew", g: false, need: "on", kind: "skill", mk: (s, x, w) => ({ title: "라이벌 리뉴얼", text: `${I(x.n)} 리뉴얼했다. 새 사진이 동네 커뮤니티를 도배했다. 내 ${U(w.sh)} 갑자기 어제 산 옷처럼 낡아 보인다.`, choices: [
    C("나도 손본다 (150만 원)", { cash: -M(s, 150), mental: 2 }, "새 단장. 사진을 다시 찍으니 이쪽도 꽤 괜찮다.", { p: -0.03, sk: 4 }),
    K("홍보로 맞선다", "mkt", 5, O("'오래돼서 편한 곳' 컨셉이 의외로 먹혔다.", { stat: { mkt: 1 } }, { p: -0.02, sk: 4 }), O("홍보비만 나갔다.", { cash: -M(s, 20), mental: -2 }, { sk: 4, p: 0.01 })),
    C("버틴다. 새것도 1년이면 헌것", { mental: -1 }, "1년은 생각보다 길다.", { sk: 4, p: 0.02 }),
  ] }) },
  { id: "media", g: false, need: "on", kind: "skill", mk: (s, x, w) => ({ title: "라이벌이 방송을 탔다", text: `${I(x.n)} 지역 방송 '골목의 고수'에 나왔다. 방송 다음 날부터 그쪽 앞에 줄이 섰다.`, choices: [
    C("축하 메시지를 보낸다", { mental: -1 }, `"고마워요. 언제 밥 한번 해요." 의외로 다정한 답장.`, { rel: 15 }),
    K("그 주에 맞불 이벤트를 연다", "mkt", 5, O("줄 서다 지친 손님들이 이쪽으로 넘어왔다. 방송 효과를 나눠 먹었다.", { mental: 3 }, { mod: [0.04, 3] }), O("이벤트를 해도 방송을 이길 순 없었다.", { cash: -M(s, 20), mental: -3 }, { p: 0.02 })),
    C("못 본 척한다", { mental: -3 }, "못 본 척하려고 그 방송을 세 번 봤다.", { p: 0.02 }),
  ] }) },
  { id: "award", g: false, need: "on", kind: "skill", mk: (s, x, w) => ({ title: "라이벌의 수상 소식", text: `업계 모임에서 '올해의 ${w.sh}' 상이 ${x.n}에게 갔다. 박수를 치는 손이 조금 늦었다.`, choices: [
    C("내년엔 내가 받는다. 공부를 시작한다", { ap: -1 }, `그날 밤 노트에 '내년 목표'를 적었다.`, { p: 0.01 }),
    K("다가가 비결을 묻는다", "talk", -5, O(`"별거 없어요. 그냥 매일 해요." 진짜로 별게 없어서 더 대단했다.`, { stat: { [w.q]: 1 } }, { rel: 15 }), O("어색한 웃음만 오갔다.", { mental: -1 })),
    C("배가 아프다. 오늘은 그냥 아파한다", { mental: -3 }, "배 아픈 것도 체력이 든다.", { p: 0.01 }),
  ] }) },
  { id: "rumor", g: false, mk: (s, x, w) => ({ title: "험담 소문", text: `"거기 사장님 회사 다니면서 대충 한대요." 소문의 끝을 따라가 보니 ${x.n} 근처였다.`, choices: [
    K("직접 찾아가 따진다", "talk", 0, O(`"제가 그런 게 아니라 손님이…" 사과를 받았다. 소문도 같이 멈췄다.`, { mental: 3 }, { p: -0.02, rel: 5 }), O("언성이 높아졌다. 그 장면이 또 소문이 됐다.", { mental: -5 }, { rel: -15, mod: [-0.04, 3] })),
    C("실력으로 답한다. 이번 달 더 꼼꼼히", { hp: -5 }, "소문보다 결과가 빨리 돌았다.", { p: -0.01 }),
    C("웃어넘긴다", { mental: -2 }, "웃었는데 계속 생각난다.", { p: 0.01 }),
  ] }) },
  { id: "adtop", g: false, need: "on", kind: "price", mk: (s, x, w) => ({ title: "검색 맨 위는 늘 라이벌", text: `${I(w.c)} 검색하면 ${I(x.n)} 맨 위에 뜬다. 광고 자리를 통째로 샀다.`, choices: [
    C("나도 광고비를 쓴다 (80만 원)", { cash: -M(s, 80) }, "두 번째 줄을 샀다. 그래도 안 보이는 것보다 낫다.", { p: -0.03 }),
    K("광고 대신 검색어를 판다", "mkt", 0, O("남들이 안 쓰는 검색어 세 개를 잡았다. 그쪽 손님이 아닌 내 손님이 왔다.", { stat: { mkt: 1 } }, { p: -0.02 }), O("검색어를 바꿨더니 아무도 안 찾는 말이었다.", { mental: -2 })),
    C("소개로 오는 손님만 믿는다", { mental: -1 }, "소개는 느리다. 대신 오래간다.", { p: 0.02 }),
  ] }) },
  { id: "supplier", g: false, mk: (s, x, w) => ({ title: "거래처를 가로챘다", text: `오래 같이 일한 ${I(w.sup)} 말했다. "${x.n} 쪽 물량이 커서요. 그쪽 일을 먼저 하게 됐어요."`, choices: [
    C("단가를 올려 붙잡는다", { cash: -M(s, 30) }, "의리는 돈으로 산다. 슬프지만 효과는 있다."),
    K("새 거래처를 직접 찾는다", "num", 0, O("더 싸고 더 빠른 곳을 찾았다. 오히려 잘됐다.", { stat: { num: 1 }, mental: 3 }, { mod: [0.02, 6] }), O("새 거래처가 두 번 펑크를 냈다.", { mental: -3 }, { mod: [-0.04, 3] })),
    C("기다린다. 일정이 밀리는 건 감수", { mental: -2 }, "한 달 동안 일정이 꼬였다.", { mod: [-0.03, 2] }),
  ] }) },
  { id: "expand", g: false, need: "on", ok: (s, x) => s.t - x.t >= 10, mk: (s, x, w) => ({ title: "라이벌이 판을 키운다", text: `${I(x.n)} 투자를 받았다는 소문. 2호점, 광고, 할인 행사가 한꺼번에 터졌다.`, choices: [
    C("나도 키운다. 이번 달 몸을 갈아 넣는다", { ap: -2, hp: -6 }, "덩치로는 못 이겨도 속도로는 안 진다.", { sk: 5, p: 0.0 }),
    K("틈새로 간다. 그쪽이 못 하는 걸 한다", "sense", 0, O(`큰 데가 못 챙기는 ${w.c}이 따로 있었다. 그 사람들이 다 이쪽으로 왔다.`, { stat: { sense: 1 }, mental: 3 }, { sk: 5, p: -0.03 }), O("틈새가 너무 좁았다.", { mental: -3 }, { sk: 5, p: 0.02 })),
    C("지켜본다", { mental: -2 }, "지켜보는 사이 그쪽 간판이 하나 더 늘었다.", { sk: 5, p: 0.02 }),
  ] }) },
  { id: "noshow", g: false, ok: (s, x) => ["pr", "airbnb", "tutoring", "tarot", "chicken", "cs"].includes(x.job), mk: (s, x, w) => ({ title: "수상한 노쇼", text: `같은 번호로 예약 세 건, 전부 노쇼. 하필 제일 바쁜 주말이었다. 묘하게 ${x.n} 행사 날짜와 겹친다.`, choices: [
    C("예약금 제도를 만든다", { mental: 2 }, "예약은 조금 줄었지만 노쇼는 사라졌다.", { mod: [-0.02, 2] }),
    K("번호를 추적해 본다", "sense", 0, O(`번호 주인은 ${x.n}의 알바였다. 사장님이 직접 사과하러 왔다.`, { mental: 4 }, { p: -0.02, rel: -5 }), O("모르는 번호는 끝까지 모르는 번호였다.", { mental: -2 })),
    C("넘어간다", { cash: -M(s, 20) }, "빈방 사진을 보며 한숨만 쉬었다."),
  ] }) },
  { id: "flyer", g: false, need: "on", kind: "price", mk: (s, x, w) => ({ title: "홍보 전쟁", text: `내가 붙인 홍보물 위에 ${x.n} 홍보물이 덮여 있다. 정확히 내 것만 골라서.`, choices: [
    K("더 눈에 띄게 다시 만든다", "mkt", 0, O("새 홍보물이 동네 사진 맛집이 됐다. 일부러 찍으러 오는 사람까지 생겼다.", { stat: { mkt: 1 }, mental: 2 }, { p: -0.02 }), O("더 크게 만들었더니 더 크게 덮였다.", { mental: -2 })),
    K("사장님께 협정을 제안한다", "talk", 0, O(`"각자 자리 정해서 붙이죠." 의외로 쉽게 합의했다.`, { mental: 2 }, { p: -0.02, rel: 10 }), O("\"무슨 말씀이세요?\" 시치미가 프로급이다.", { mental: -2 })),
    C("무시한다", { mental: -1 }, "홍보물 전쟁은 동네 사람들만 재밌어한다.", { p: 0.01 }),
  ] }) },
  { id: "compare", g: false, need: "on", kind: "price", mk: (s, x, w) => ({ title: "\"저기는 더 싸던데요?\"", text: `${I(w.c)} 대놓고 물었다. "${U(x.n)} 여기 ${x.pc}% 가격이던데요?"`, choices: [
    K("차이를 차분히 설명한다", "talk", 0, O(`"아, 그래서 다르구나." 설명을 들은 ${I(w.c)} 지인 둘을 데려왔다.`, { mental: 3 }, { p: -0.02 }), O("설명이 길어질수록 변명처럼 들렸다.", { mental: -2 })),
    C("그 자리에서 깎아 준다", { cash: -M(s, 5) }, "소문이 났다. '말하면 깎아 주는 집'.", { mod: [-0.03, 3] }),
    C(`"그럼 거기 가셔도 돼요" 웃으며 말한다`, { mental: 2 }, "그 손님은 갔다. 묘하게 속이 시원하다.", { p: 0.01 }),
  ] }) },
  // ───── 좋은 일 ─────
  { id: "close", g: true, need: "on", w: 1.2, ok: (s, x) => s.t - x.t >= 8, cine: "rival_close", mk: (s, x, w) => ({ title: "라이벌 폐업", text: `${x.n} 문 앞에 '그동안 감사했습니다'가 붙었다. 오래 버틴 쪽이 이겼다. 기쁜데, 마냥 기쁘진 않다.`, choices: [
    C("넘어올 손님 맞을 준비를 한다", { hp: -4, mental: 3 }, `${x.n}의 ${w.c}들이 하나둘 넘어왔다.`, { st: "gone", mod: [0.1, 6] }),
    C("집기·명단을 싸게 넘겨받는다", { cash: -M(s, 80) }, `사장님이 웃었다. "잘 써 주세요." 손님 명단이 꽤 두꺼웠다.`, { st: "gone", mod: [0.12, 9] }),
    C("사장님께 수고하셨다고 연락한다", { mental: 4 }, `"덕분에 재밌었어요. 진심이에요." 그 말이 오래 남았다.`, { st: "gone", mod: [0.06, 6], rel: 20 }),
  ] }) },
  { id: "promo", g: true, need: "on", w: 1.2, mk: (s, x, w) => ({ title: "공동 프로모션 제안", text: `${x.n} 사장님이 찾아왔다. "우리 이러지 말고 같이 해요. 스탬프 공유하고, 넘치는 손님은 서로 보내 주고."`, choices: [
    C("손잡는다", { mental: 3 }, "동네에 '두 집 다 가면 할인' 현수막이 붙었다. 경쟁자가 동료가 됐다.", { st: "ally", end: "rival_team" }),
    K("내 조건을 얹어서 손잡는다", "talk", 0, O("수수료 없이 손님을 나누는 조건으로 합의. 협상 잘했다.", { mental: 4, stat: { talk: 1 } }, { st: "ally", mod: [0.04, 6], end: "rival_team" }), O("조건을 너무 세게 걸었다. \"생각해 볼게요\"가 마지막이었다.", { mental: -2 }, { rel: -5 })),
    C("정중히 거절한다", {}, "\"아쉽네요.\" 그 뒤로 인사가 조금 어색하다.", { rel: -10 }),
  ] }) },
  { id: "overflow", g: true, need: "ally", w: 1.4, mk: (s, x, w) => ({ title: "라이벌이 넘긴 손님", text: `${x.n}에서 연락이 왔다. "오늘 꽉 차서요. ${w.c} 그쪽으로 보내도 될까요?"`, choices: [
    C("감사히 받는다", { cash: M(s, 40) }, "넘어온 손님이 단골이 될 것 같다.", { rel: 5 }),
    C("받고 답례로 선물을 보낸다", { cash: M(s, 30), mental: 2 }, "\"이런 거 안 하셔도 되는데!\" 다음 주에 또 보내 줬다.", { rel: 12 }),
  ] }) },
  { id: "street", g: true, w: 0.9, mk: (s, x, w) => ({ title: "동네 상권 같이 키우기", text: `${x.n} 사장님이 '골목 축제'를 같이 하자고 한다. 상인 다섯 집이 모여 주말에 행사를 연다.`, choices: [
    C("부스까지 낸다", { cash: -M(s, 25), hp: -5, mental: 3 }, "골목에 사람이 넘쳤다. 경쟁이 아니라 판이 커졌다.", { mod: [0.06, 6], rel: 12, p: -0.01 }),
    C("이름만 올린다", {}, "포스터 구석에 내 이름이 있다.", { mod: [0.02, 3], rel: 3 }),
    C("빠진다. 주말은 쉬어야 한다", { mental: 1 }, "축제 사진에 내 가게만 없다.", { rel: -5 }),
  ] }) },
  { id: "respect", g: true, ok: (s, x) => (s.st[WORDS[x.job].q] || 0) >= x.sk, mk: (s, x, w) => ({ title: "라이벌의 인정", text: `우연히 마주친 ${x.n} 사장님이 말했다. "솔직히 그쪽 ${w.i}, 우리보다 낫더라고요. 손님들도 그래요."`, choices: [
    C("고맙다고, 그쪽도 대단하다고 한다", { mental: 5 }, "서로 칭찬하다 커피 두 잔이 식었다.", { rel: 18 }),
    C("내 노하우를 하나 알려 준다", { mental: 3 }, "\"이걸 그냥 알려 줘요?\" 그쪽 눈빛이 바뀌었다.", { rel: 25, p: -0.01 }),
    C("속으로 으쓱한다", { mental: 7 }, "오늘 저녁은 내가 쏜다. 나한테.", {}),
  ] }) },
  { id: "drink", g: true, ok: (s, x) => x.rel >= 10 || x.st === "ally", mk: (s, x, w) => ({ title: "라이벌과 술 한잔", text: `밤 11시, ${x.n} 사장님 문자. "마감했어요? 한잔할래요? 이 일 하는 사람끼리만 아는 얘기가 있잖아요."`, choices: [
    C("간다", { cash: -M(s, 8), mental: 5, hp: -2 }, "진상 손님 얘기로 두 시간을 웃었다. 이 사람, 적이 아니었다.", { rel: 22 }),
    C("오늘은 피곤하다고 한다", { hp: 2 }, `"다음에 꼭이요." 답장에 웃는 이모티콘.`, { rel: 3 }),
  ] }) },
  { id: "tip", g: true, need: "ally", mk: (s, x, w) => ({ title: "노하우 교환", text: `${x.n} 사장님이 엑셀 파일 하나를 보냈다. "제가 쓰는 관리표예요. 그쪽 것도 보여 줘요."`, choices: [
    C("배운다", { stat: { num: 1, [w.q]: 1 } }, "남의 관리표에서 내 구멍이 보였다."),
    C("내 노하우도 통째로 준다", { stat: { [w.q]: 1 }, mental: 2 }, "서로 좋아졌다. 동네 손님 평이 두 집 다 올랐다.", { rel: 10, mod: [0.03, 6] }),
  ] }) },
  { id: "buyout", g: true, need: "on", ok: (s, x) => s.t - x.t >= 12, cine: "rival_close", mk: (s, x, w) => ({ title: "인수 제안", text: `${x.n} 사장님이 조용히 말했다. "저 그만하려고요. 손님 명단이랑 집기, 싸게 넘길게요. 300만 원이면 돼요."`, choices: [
    C("인수한다 (300만 원)", { cash: -M(s, 300) }, `${x.n} 손님들이 그대로 넘어왔다. 동네에 나 혼자 남았다.`, { st: "gone", mod: [0.15, 12] }),
    K("깎아 본다", "num", 0, O("180만 원에 합의했다. 사장님도 웃으며 악수했다.", { cash: -M(s, 180) }, { st: "gone", mod: [0.14, 12] }), O("\"그럼 다른 분께 넘길게요.\" 새 주인이 들어온다고 한다.", { mental: -3 }, { sk: 6, rel: -5 })),
    C("거절한다. 어차피 문 닫으면 손님은 온다", {}, "한 달 뒤 정말 문을 닫았다. 손님 일부가 넘어왔다.", { st: "gone", mod: [0.05, 4] }),
  ] }) },
  { id: "partner", g: true, need: "on", kind: "skill", mk: (s, x, w) => ({ title: "\"같이 해 볼래요?\"", text: `${x.n}에서 연락이 왔다. "서로 잘하는 게 다르잖아요. 같이 묶어서 팔아 보면 어때요?"`, choices: [
    C("협업한다", { mental: 3 }, "둘이 묶으니 손님이 '세트'로 사 갔다.", { st: "ally", end: "rival_team" }),
    K("역제안: 내가 주도하는 조건으로", "talk", 5, O("내 쪽 조건으로 계약. 이건 협업이 아니라 영입이다.", { mental: 4 }, { st: "ally", mod: [0.05, 6], end: "rival_team" }), O("\"그럼 없던 걸로 해요.\"", { mental: -2 }, { rel: -5 })),
    C("정중히 거절한다", { mental: 1 }, "혼자가 편하다. 아직은.", {}),
  ] }) },
  { id: "duel", g: true, need: "on", w: 1.3, mk: (s, x, w) => ({ title: "정면 승부", text: `동네 커뮤니티에 비교 글이 올라왔다. '${x.n} vs 여기, 어디가 나아요?' 댓글 300개. 다음 주 둘 다 써 보고 후기를 올리겠다는 사람이 열 명.`, choices: [
    K("제대로 붙는다. 이번 주는 최고로", w.q, 0, O(`후기 열 개 중 일곱이 이쪽. '${x.n}도 좋지만 여기가 한 수 위'.`, { mental: 6, hp: -4 }, { p: -0.05, mod: [0.05, 6], end: "rival_win" }), O(`일곱이 ${x.n} 쪽이었다. 댓글 300개가 전부 나를 보는 것 같다.`, { mental: -6, hp: -4 }, { p: 0.03, end: "rival_lose" })),
    K("이벤트로 판을 뒤집는다", "mkt", 5, O("후기보다 이벤트 인증 글이 더 많이 올라왔다. 판이 바뀌었다.", { cash: -M(s, 20), mental: 4 }, { p: -0.04, end: "rival_win" }), O("이벤트만 남고 후기는 그쪽이 이겼다.", { cash: -M(s, 20), mental: -4 }, { p: 0.02, end: "rival_lose" })),
    C("참전하지 않는다", { mental: -1 }, "\"여기 사장님은 자신 없나 봐요\" 댓글 하나가 달렸다.", { p: 0.01 }),
  ] }) },
  { id: "truce", g: true, need: "on", kind: "price", mk: (s, x, w) => ({ title: "가격 휴전", text: `${x.n} 사장님이 먼저 연락했다. "우리 이러다 둘 다 죽어요. 최저가 선만 정해요."`, choices: [
    C("최저가 선을 같이 지킨다", { mental: 3 }, "가격표가 제자리를 찾았다. 숨통이 트였다.", { p: -0.05, pc: 10, war: false, rel: 10 }),
    K("내 조건으로 정한다", "talk", 0, O("내 가격은 지키고 그쪽만 올리기로. 이게 되네?", { mental: 4 }, { p: -0.06, pc: 15, war: false }), O("\"그럼 안 할래요.\" 협상 결렬.", { mental: -2 })),
    C("거절한다. 끝까지 간다", { mental: -1 }, "전쟁은 계속된다.", { p: 0.01, war: true }),
  ] }) },
  { id: "accident", g: true, need: "on", mk: (s, x, w) => ({ title: "라이벌의 사고", text: `${x.n}에 ${I(w.acc)} 터졌다. 동네가 시끄럽다. ${w.c}들이 갈 곳을 찾는다.`, choices: [
    C("몰려온 손님을 받는다", { hp: -4 }, `한 달 내내 바빴다. 넘어온 ${w.c} 절반이 남았다.`, { mod: [0.08, 4] }),
    C("사장님을 도와준다", { hp: -3, mental: 4 }, `"이 은혜 안 잊을게요." 경쟁자가 그날 친구가 됐다.`, { rel: 30, p: -0.02 }),
    C("조용히 내 일을 한다", { mental: 1 }, "말을 아끼니 오히려 손님이 믿어 줬다.", { mod: [0.04, 3] }),
  ] }) },
  { id: "bench", g: true, need: "on", kind: "skill", mk: (s, x, w) => ({ title: "몰래 벤치마킹", text: `손님인 척 ${x.n}에 가 봤다. 들어서자마자 알겠다. 잘되는 데는 이유가 있다.`, choices: [
    K("배울 점을 메모해 온다", "sense", -5, O("세 가지를 바로 따라 했다. 다음 주 후기가 달라졌다.", { stat: { [w.q]: 2 } }, { p: -0.02 }), O("너무 많아서 뭘 배워야 할지 모르겠다.", { mental: -2 })),
    C("그냥 손님으로 즐긴다", { mental: 3, cash: -M(s, 3) }, "좋은 걸 좋다고 인정하니 마음이 편하다."),
    C("사장님께 정체를 밝히고 인사한다", { mental: 1 }, `"알아봤어요. 들어오실 때부터." 둘 다 웃었다.`, { rel: 15 }),
  ] }) },
  { id: "tired", g: true, need: "on", ok: (s, x) => s.t - x.t >= 12, mk: (s, x, w) => ({ title: "라이벌 사장님의 새벽", text: `새벽 1시, ${x.n} 불이 아직 켜져 있다. 사장님이 셔터 앞에 쪼그려 앉아 있다. 나도 저랬던 날이 있다.`, choices: [
    C("편의점 커피를 건넨다", { cash: -1, mental: 3 }, `"…고마워요. 이 일 진짜 쉽지 않죠?" 한 시간을 같이 앉아 있었다.`, { rel: 25, p: -0.01 }),
    C("기회다. 이번 달 더 몰아붙인다", { hp: -4, mental: -2 }, "몰아붙였다. 그쪽이 휘청했다. 이상하게 개운하지 않다.", { mod: [0.05, 4], p: -0.02 }),
    C("못 본 척 지나간다", {}, "집에 오는 길이 길었다."),
  ] }) },
  { id: "united", g: true, mk: (s, x, w) => ({ title: "공동의 적", text: `${w.fee} 인상 공지가 떴다. ${x.n} 사장님이 단톡방을 만들었다. "이번엔 같이 대응해요."`, choices: [
    K("앞장서서 협상한다", "talk", -5, O("인상 폭이 절반으로 줄었다. 단톡방에 박수 이모티콘이 쏟아졌다.", { mental: 4, stat: { talk: 1 } }, { rel: 15, mod: [0.03, 6] }), O("협상은 실패했지만 같은 편이 생겼다.", { mental: 1 }, { rel: 10, mod: [-0.02, 4] })),
    C("단톡방에서 응원만 한다", {}, "결과는 반쯤 성공. 내 몫은 없었지만 피해도 덜했다.", { rel: 3, mod: [-0.01, 4] }),
    C("혼자 감수한다", { cash: -M(s, 25) }, "오른 비용은 그냥 낸다. 마음은 편하다.", { rel: -5 }),
  ] }) },
  { id: "move", g: true, need: "on", ok: (s, x) => s.t - x.t >= 10, mk: (s, x, w) => ({ title: "라이벌의 이사", text: `${I(x.n)} 더 큰 동네로 옮긴다고 한다. "여기선 그쪽을 못 이기겠더라고요. 농담이에요. 반은."`, choices: [
    C("송별 화분을 보낸다", { cash: -M(s, 5), mental: 3 }, `"새 동네 가서 그쪽 얘기 많이 할게요." 진짜 손님 몇 명을 소개해 줬다.`, { st: "gone", mod: [0.06, 6], rel: 15 }),
    C("조용히 박수를 친다", { mental: 2 }, "다음 날 그 자리에 '임대' 현수막이 붙었다.", { st: "gone", mod: [0.05, 6] }),
  ] }) },
  { id: "refer", g: true, need: "ally", mk: (s, x, w) => ({ title: "라이벌이 물어 온 큰 건", text: `${x.n} 사장님이 전화했다. "이건 우리보다 그쪽이 잘할 일이라. 소개해 드릴게요."`, choices: [
    K("제대로 해낸다", w.q, -5, O("큰 건을 깔끔하게 끝냈다. 소개해 준 사람 체면도 살았다.", { cash: M(s, 90), mental: 4 }, { rel: 10 }), O("결과가 애매했다. 돈은 받았지만 소개한 쪽이 머쓱해졌다.", { cash: M(s, 40), mental: -2 }, { rel: -5 })),
    C("바빠서 정중히 사양한다", {}, "\"다음엔 꼭이요.\"", {}),
  ] }) },
];

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
    if (X.st === "gone") { out.push(`라이벌 ${x.n} 떠남`); log(s, `라이벌 ${x.n}이(가) 떠났다.`, "work"); }
    if (X.st === "ally") { out.push(`${W_(x.n)} 협업 (이익 +${pct(ALLY_BONUS)})`); log(s, `라이벌 ${W_(x.n)} 손잡았다.`, "work"); }
  }
  if (x.st === "on" && !x.fr && x.rel >= 50) {
    x.fr = true; out.push(`${U(x.n)} 이제 친구 같은 라이벌 (압박 절반)`); log(s, `라이벌 ${W_(x.n)} 친구가 됐다.`, "love");
    const ck = cine("rival_friend"); if (ck) s.sceneQ.unshift(story(`라이벌, 친구가 되다`, `${x.n} 사장님과는 이제 경쟁보다 수다가 길다. 같은 걸 겪는 사람은 생각보다 적다.`, ck));
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
// 시험용(#...-rvtest): 그 투잡에 라이벌을 바로 세운다(경쟁 중 1 + 협업·친구 1, 압박 기록)
export function rivalDemo(s, job) {
  const V = st(s), R = RIVALS[job]; if (!R || V.list.some((x) => x.job === job)) return;
  V.since[job] = s.t - 12; V.cap[job] = R.max;
  R.list.slice(0, 3).forEach((d, i) => V.list.push({ id: d.id, job, n: d.n, d: d.d, kind: d.kind, sk: d.sk[1], pc: d.pc, p: +(d.p * P_MUL).toFixed(3), st: i === 1 ? "ally" : i === 2 ? "gone" : "on", t: s.t - 6, rel: i === 0 ? 55 : 30, fr: false, war: false }));
  addMod(s, job, 0.04, 3); V.hit[job] = { t: s.t, net: netOf(s, job), amt: 0 };
}
