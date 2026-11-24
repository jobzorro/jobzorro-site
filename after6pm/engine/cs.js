// 취업컨설팅 보드: 진입(포지션·활동명·첫 후기·판매 채널) → 마케팅 채널 → 문의·전환 → 처리 용량 → 합격·후기 → 소개
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import { CHAR, addMoney, applyEff, helperPower, helpers, mod, won, log, eyeMult, ensureRel, isRomanceable, addAff, gainStat, giveBrk, R } from "./core.js";
import { jobEvent } from "./pr.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import { EXTRAS } from "../gen/data.js"; // 닉네임 다섯 개와 그 이야기(data/extras.json, 11-24)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 11-21 밸런스(10개 투잡 공통 비교, 기획 jobconsult.json: 중위 월 200만·p95 1,500만·1:1 한계 연 3억).
// 원래: 문의 수 상한 없음 → 합격·후기·소개가 서로 키워 회사 다니며 3년 차 월 1,000만, 전업 5년 차 월 9,000만까지 폭주.
// 지금: 한 달 문의는 시장 크기(leadCap, 전업이면 ×fullCapX)에 가까워질수록 덜 는다. 소개는 refMax 까지만 쌓인다.
// 무료 특강 신청자는 후기 semRev 개까지만 늘어난다(원래 후기 수에 비례해 끝없이: 후기 1,600개면 특강 한 번에 100명+).
export const CS_BAL = { leadCap: 7, fullCapX: 2, refMax: 6, semRev: 60 };
// v4.28 특이 요소(f30): 합격 보장·환불 정책 / 후기의 개인정보 / 기관 강의 입찰. 효과 크기는 여기 숫자만 바꾸면 된다
export const CS_F30 = {
  // 합격 보장: conv 결제 전환 +, lead 문의 배수, back 불합격 때 돌려주는 비율(판매 당시 정책 기준)
  guar: {
    0: { n: "보장 없음", conv: 0, lead: 1, back: 0, d: "불합격해도 환불 없음" },
    50: { n: "불합격 50% 환불", conv: 0.07, lead: 1.12, back: 0.5, d: "결제 ↑ · 불합격이면 절반 돌려줌" },
    100: { n: "불합격 전액 환불", conv: 0.13, lead: 1.25, back: 1, d: "결제 크게 ↑ · 시즌이 나쁘면 환불 폭탄" },
  },
  guarRev: 10, // 후기 10개부터 '경쟁자가 보장을 걸었다' 장면
  // 후기 가림: ap 합격 후기를 올린 달의 다음 달 행동력 −, risk 후기 1개당 논란 확률, rev 후기 효과 배수
  mask: {
    full: { n: "꼼꼼히 가림", ap: 1, risk: 0, rev: 1, d: "회사·학교·질문까지 · 합격 달마다 행동력 −1" },
    name: { n: "이름만 가림", ap: 0, risk: 0.03, rev: 1, d: "보통 · 가끔 회사가 비친다" },
    raw: { n: "그대로 올림", ap: 0, risk: 0.08, rev: 1.25, d: "후기 효과 +25% · 논란 위험 큼" },
  },
  leak: { gap: 6, cash: 100, rev: [2, 4, 6], kmong: 15 }, // 논란 최소 간격(달)·위로금·후기 감소(사과/해명 실패/버팀)·크멍 상세 감소
  // 기관 강의 입찰: 대학 강의(cs_lecture)를 한 번이라도 한 뒤, 예산 시즌(cal)에 공고. n회 × 회당(CS_LECT 강의료 × mult)
  bid: { p: 0.3, gap: 6, cal: [2, 3, 8, 9], n: 4, mult: 1.3, dc: 45, eveDc: 55, eveMult: 0.6, days: 4, leaveMax: 15, overEye: 6 },
};
const ORGS = ["지방 국립대 커리어센터", "구청 청년 일자리센터", "공공기관 신입 교육", "고용센터 청년 프로그램", "도서관 취업 아카데미"];
const employedCs = (s) => !(s.co?.quit || s.co?.fired);
export function init() {
  return { open: false, niche: null, niches: [], nick: null, price: "low", reviews: 0, passes: 0, fails: 0, clients: 0, friends: 0,
    queue: [], outcomes: [], ch: { kmong: { on: false, q: 0 }, blog: { posts: 0, idx: 0, lastT: -99 }, insta: { f: 0 }, youtube: { subs: 0, videos: 0 }, kakao: { m: 0 } },
    ads: 0, template: 0, vod: { prog: 0, n: 0, income: 0 }, lv: 1, offers: 0, refer: 0, revHist: [], monthRev: 0, leads: 0, conv: 0, src: {}, evT: -99, groupT: -1, seminarT: -1, seq: 0, newThisMonth: 0,
    guar: 0, mask: "name", maskSeen: false, guarSeen: false, leakT: -99, leakN: 0, lectN: 0, bidT: -99, leave: 0, gRef: 0, gRefN: 0, gRefAll: 0 };
}
export const entrySteps = (s) => {
  const cs = s.cs;
  return [
    { k: "career", n: "직무 지식(커리어 20 이상)", done: s.st.career >= 20, hint: "스터디카페에서 커리어 공부" },
    { k: "niche", n: "포지션 정하기", done: !!cs.niche, hint: "컨설팅 화면에서 고르기" },
    { k: "nick", n: "활동명 정하기(실명/닉네임)", done: !!cs.nick, hint: "실명은 신뢰↑ 눈치↑" },
    { k: "friends", n: "지인 무료 첨삭으로 첫 후기 3개", done: cs.reviews >= 3, hint: `지금 후기 ${Math.floor(cs.reviews)}개` },
    { k: "channel", n: "판매 채널 열기(크멍 입점 또는 블로그 첫 글)", done: cs.ch.kmong.on || cs.ch.blog.posts > 0, hint: "온라인 → 크멍 / 집 → 블로그" },
  ];
};
export function setNiche(s, k) { const n = D.NICHES[k]; if (!n) return { ok: false }; if (n.req.career && s.st.career < n.req.career) return { ok: false, msg: `커리어 ${n.req.career} 필요` }; if (n.req.years && s.co.years < n.req.years) return { ok: false, msg: `회사 경력 ${n.req.years}년 필요` };
  if (!s.cs.niche) { s.cs.niche = k; s.cs.niches = [k]; return { ok: true, msg: `포지션: ${n.n}` }; }
  if (s.cs.niches.includes(k)) return { ok: false, msg: "이미 하고 있음" };
  if (s.cs.lv < 3) return { ok: false, msg: "포지션 추가는 Lv3부터" };
  if (k === "career" && (s.cs.passes || 0) < D.CS_CAREER_PASS) return { ok: false, msg: `경력 이직은 합격자 ${D.CS_CAREER_PASS}명부터(지금 ${s.cs.passes || 0}명)` }; // v4.28 히든 길
  s.cs.niches.push(k); return { ok: true, msg: `포지션 추가: ${n.n}` };
}
// 닉네임(11-24): 정해 둔 다섯 개 중에서 고른다(s.cs.nickK). 숫자 효과는 같고, 닉네임마다 작은 이야기가 따라온다(engine/extras.js)
export const NICKS = (EXTRAS && EXTRAS.nicks) || [];
export const nickOf = (s) => (s.cs?.nick === "nick" ? NICKS.find((n) => n.k === s.cs.nickK) || null : null);
export const nickName = (s) => nickOf(s)?.n || "";
export function setNick(s, k, nk) {
  s.cs.nick = k;
  if (k === "nick") { if (nk && NICKS.some((n) => n.k === nk)) s.cs.nickK = nk; else if (!nickOf(s)) s.cs.nickK = NICKS[0]?.k; }
  return { ok: true, msg: k === "real" ? "실명으로 활동: 신뢰 +, 회사 눈치 ×1.4" : `닉네임 '${nickName(s)}'${((w) => { const ch = w.charCodeAt(w.length - 1), f = (ch - 0xac00) % 28; return f && f !== 8 ? "으로" : "로"; })(nickName(s) || "가")} 활동` };
}
export function setPrice(s, k) { const p = D.CS_PRICE[k]; if (p.req && s.cs.reviews < p.req) return { ok: false, msg: `후기 ${p.req}개부터` }; s.cs.price = k; return { ok: true, msg: `가격: ${p.n}` }; }
export function setAds(s, v) { s.cs.ads = clamp(Math.round(v), 0, 300); }
function checkOpen(s, notes) { if (!s.cs.open && entrySteps(s).every((x) => x.done)) { s.cs.open = true; notes?.push("취업컨설팅 개업! 다음 달부터 문의가 들어온다"); log(s, "취업컨설팅을 정식으로 시작했다.", "work"); return true; } return false; }

export function can(s, id) {
  const cs = s.cs;
  if (id === "cs_friend") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (cs.friends >= 8) return "지인은 이제 다 봐줬다"; return null; }
  if (["cs_blog", "cs_insta", "cs_kakao", "cs_kmong", "cs_youtube", "cs_flyer"].includes(id)) { if (!cs.niche) return "포지션을 먼저 정하세요"; return null; }
  if (id === "cs_work") { if (!cs.queue.length) return "대기 고객이 없어요"; return null; }
  if (id === "cs_soomgo") return cs.open ? null : "개업 후 가능";
  if (id === "cs_seminar") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (cs.reviews < 5) return "후기 5개부터"; if (cs.seminarT === s.t) return "이번 달엔 이미 했어요"; return null; }
  if (id === "cs_lecture") return cs.offers > 0 ? null : `강의 섭외가 와야 해요(후기 ${D.CS_LECT.rev}개 또는 커리어센터 인연)`;
  if (id === "cs_focus") return !cs.queue.length ? "대기 고객이 없어요" : null;
  if (id === "cs_template") return !cs.open ? "개업 후 가능" : cs.template >= 3 ? "템플릿 완성" : null;
  if (id === "cs_group") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (!(cs.ch.kakao.m >= 150 || cs.reviews >= 25)) return "오픈채팅 150명 또는 후기 25개"; if (cs.groupT === s.t) return "이번 달 진행함"; return null; }
  if (id === "cs_vod") return cs.reviews < 20 ? "후기 20개부터" : null;
  return null;
}
// 컨설팅 × 파티룸: 내 공간에서 하면 효과 +30%, 강의·세미나룸·교육장이면 +60%
function roomBoost(s) { if (!SYN.on(s, "cs_room")) return 1; return s.pr.rooms.some((x) => x.status === "open" && ["lecture", "edu", "study"].includes(x.concept)) ? 1.6 : 1.3; }
// 실력 = 핵심 능력과 커리어의 평균. 가격 단계(레벨 보너스 포함)가 요구하는 실력보다 낮으면 환불·혹평
// AI 대세(11-23): 신입 취업 쪽(자소서·공기업·면접) 문의는 해가 갈수록 줄어든다. 경력 이직은 줄지 않고, 강의를 다닌 만큼 덜 줄어든다
export const CS_AI = { from: 9, perYear: 0.07, floor: 0.4, w: { newgrad: 1, public: 1, interview: 0.6, career: 0 }, lectPer: 0.02, lectMax: 0.1, priceW: 0.35, lectFeeW: 1, lectOfferW: 0.4 }; // lectOfferW: 취업 특강 섭외도 덜 들어오는 정도 // lectFeeW: 강의료도 같이 내려가는 정도(취업 특강 예산이 줄어서) // priceW: 단가도 같이 내려가는 정도(AI 첨삭이 싸져서)
export function aiCut(s, k) { // 그 분야 문의 배수(1 = 그대로)
  if (typeof process !== "undefined" && process.env?.CSAI) Object.assign(CS_AI, JSON.parse(process.env.CSAI)); // 봇 시험용
  const yrs = Math.max(0, s.t / 12 - aiFrom(s)), w = k === "interview" && s.wv?.cs?.path === "b" ? 0 : CS_AI.w[k] ?? 1; // 면접 전문(길 B)을 고르면 면접 코칭은 줄지 않는다
  const cut = Math.min(1 - CS_AI.floor, yrs * CS_AI.perYear) * w * (1 - Math.min(CS_AI.lectMax, (s.cs.lectN || 0) * CS_AI.lectPer));
  return 1 - cut;
}
// 지금 내 분야 평균으로 본 감소 폭(%) · 0이면 영향 없음
// AI 대세가 시작되는 해(11-23): 판마다 8~10년 차 사이(wave.js 가 s.wv._at.cs 에 달 수로 정한다). 아직 안 정해졌으면 기본값
export function aiFrom(s) { const m = s.wv?._at?.cs; return typeof m === "number" ? m / 12 : CS_AI.from; }
export function aiDrop(s) { const ks = s.cs.niches || []; if (!ks.length) return 0; return Math.round((1 - ks.reduce((a, k) => a + aiCut(s, k), 0) / ks.length) * 100); }
export function skill(s) { const k = D.NICHES[s.cs.niche || "newgrad"].stat; return Math.round(s.st[k] * 0.7 + s.st.career * 0.3); } // v4.25: 분야 능력치(대개 글쓰기) 비중을 높임
export function priceNeed(s) { return D.CS_PRICE_NEED[s.cs.price] + (s.cs.lv >= 4 ? 20 : 0) + (s.cs.lv >= 5 ? 15 : 0); }
export const gap = (s) => priceNeed(s) - skill(s);
function capacity(s, boost) { return (2 + Math.floor(s.st.write / 35) + Math.floor(s.cs.template)) * boost * BIG.fullCap(s); }

export function act(s, r, id, arg, boost = 1) {
  const cs = s.cs, ch = cs.ch;
  const lines = [];
  const viral = (p) => r.chance(p * mod(s, "viralMult", 1));
  if (id === "cs_friend") {
    cs.friends++;
    const ok = r.chance(clamp(0.5 + (s.st.write - 30) / 40, 0.15, 0.95));
    cs.reviews += ok ? 1 : 0.4; gainStat(s, "write", 0.3);
    const opened = checkOpen(s, lines);
    return { lines: [ok ? "후기 +1 (\"선배 덕분에 서류 붙었어요\")" : "후기 +0.4 (\"음... 고마워요\")", ...lines], msg: "후배 자소서 4문항. 두괄식부터 다시 잡았다." + (opened ? " 이제 진짜 시작이다." : "") };
  }
  if (id === "cs_focus") {
    const sc = clamp(+arg || 0, 0, 3); cs.focus = sc; let cap = capacity(s, boost) + sc; let done = 0, earned = 0;
    while (cap > 0 && cs.queue.length) { const q = cs.queue[0]; const use = Math.min(cap, q.left); q.left -= use; cap -= use; if (q.left <= 0) { cs.queue.shift(); done++; earned += finishClient(s, r, q); } }
    if (sc === 3) cs.reviews += 1; gainStat(s, D.NICHES[cs.niche].stat, 0.4 * (sc + 1));
    return { lines: [`첨삭 실력 ${sc}/3`, `고객 ${done}명 완료 +${won(earned)}`, sc >= 2 ? "이번 달 합격률 +, 환불 위험 −" : "대충 봤다는 느낌이 남았다", sc === 3 ? "후기 +1" : ""].filter(Boolean), msg: sc === 3 ? "\"선생님 진짜 사람이 봐 준 느낌이에요.\"" : sc ? "고칠 건 고쳤다. 아쉬운 데도 있다." : "고객이 고개를 갸웃했다." };
  }
  if (id === "cs_work") {
    let cap = capacity(s, boost); let done = 0, earned = 0; const names = [];
    while (cap > 0 && cs.queue.length) {
      const q = cs.queue[0]; const use = Math.min(cap, q.left); q.left -= use; cap -= use;
      if (q.left <= 0) { cs.queue.shift(); done++; earned += finishClient(s, r, q); if (q.who) names.push(CHAR[q.who].name); }
    }
    gainStat(s, D.NICHES[cs.niche].stat, 0.5 + mod(s, "workGrow", 0), "cs_work"); /* v4.28c 곡선·월 상한을 거친다 */
    s.mental = clamp(s.mental + mod(s, "csWorkMental", 0), 0, 100);
    return { lines: [`고객 ${done}명 완료`, `+${won(earned)}`, cs.queue.length ? `남은 대기 ${cs.queue.length}명` : "대기 0명"], msg: names.length ? `${names.join(", ")}님 자료도 끝냈다.` : "밤 12시, 첨삭 파일 이름에 '_최종_진짜최종'." };
  }
  if (id === "cs_blog") {
    ch.blog.posts++; ch.blog.lastT = s.t;
    let g = (2 + s.st.write / 25) * mod(s, "blogMult", 1) * boost * (1 + helperPower(s, "cs_writer") * 0.3);
    if (viral(0.03)) { g += 15; lines.push("검색 상위 노출! 방문자 폭증"); }
    ch.blog.idx += g; gainStat(s, "write", 0.2); s.mental = clamp(s.mental + mod(s, "soloMental", 0), 0, 100);
    checkOpen(s, lines);
    return { lines: [`블로그 글 ${ch.blog.posts}개 · 검색 지수 ${Math.round(ch.blog.idx)}`, ...lines], msg: r.pick(["「자소서 두괄식, 첫 문장이 전부다」", "「면접관이 지원동기를 묻는 진짜 이유」", "「중고신입, 경력은 이렇게 쓴다」", "「공기업 NCS 자소서 3가지 함정」"]) };
  }
  if (id === "cs_insta") {
    let g = (15 + (s.st.sense + s.st.mkt) / 4) * mod(s, "snsMult", 1) * boost * (1 + helperPower(s, "cs_design") * 0.3);
    if (viral(0.04)) { g += 500; lines.push("릴스 터짐! 팔로워 +500"); }
    ch.insta.f += Math.round(g); gainStat(s, "mkt", 0.4); gainStat(s, "sense", 0.2);
    return { lines: [`팔로워 ${ch.insta.f.toLocaleString()}`, ...lines], msg: "카드뉴스 8장. 첫 장 제목만 30분 고민했다." };
  }
  if (id === "cs_youtube") {
    ch.youtube.videos++;
    let g = (20 + s.st.talk * 2) * Math.exp(0.6 * r.normal()) * mod(s, "snsMult", 1) * boost * (1 + helperPower(s, "cs_video") * 0.5);
    if (viral(0.05)) { g += 3000; lines.push("알고리즘 탔다! 구독자 +3,000"); }
    ch.youtube.subs += Math.round(g); gainStat(s, "talk", 0.5); gainStat(s, "charm", 0.3);
    const e = applyEff(s, { eye: 6 }); lines.push(...e);
    return { lines: [`구독자 ${ch.youtube.subs.toLocaleString()}`, ...lines], msg: "\"면접관 출신이 알려주는...\" 썸네일에 얼굴이 크게 나왔다." };
  }
  if (id === "cs_kakao") {
    const g = Math.round((12 + s.st.talk / 5) * mod(s, "kakaoMult", 1) * boost);
    ch.kakao.m += g; gainStat(s, "talk", 0.3);
    return { lines: [`오픈채팅 ${ch.kakao.m.toLocaleString()}명 (+${g})`], msg: "\"오늘 공고 정리\" 공지를 올렸다. 알림이 300개." };
  }
  if (id === "cs_kmong") {
    if (!ch.kmong.on) { ch.kmong.on = true; ch.kmong.q = Math.round(25 + (s.st.sense + s.st.mkt) / 4); checkOpen(s, lines); return { lines: ["크멍 입점 완료", `상세페이지 품질 ${ch.kmong.q}`, ...lines], msg: "같은 카테고리에 후기 300개짜리 판매자가 줄지어 있다. 내 상품은 7페이지." }; }
    ch.kmong.q = clamp(ch.kmong.q + (5 + s.st.sense / 20) * mod(s, "kmongMult", 1) * boost * (1 + helperPower(s, "cs_design") * 0.3), 0, 200);
    return { lines: [`상세페이지 품질 ${Math.round(ch.kmong.q)}`], msg: "합격 후기 캡처를 상세페이지 맨 위로 올렸다." };
  }
  if (id === "cs_soomgo") { const n = Math.max(1, r.poisson(1.6 * boost)); for (let i = 0; i < n; i++) addClient(s, r, "숨꼬"); return { lines: [`견적 수락 ${n}명`, `대기 ${cs.queue.length}명`], msg: "견적 10개를 보내고 답장을 기다렸다." }; }
  if (id === "cs_flyer") {
    const n = r.poisson(1.1 * boost); for (let i = 0; i < n; i++) addClient(s, r, "대학가");
    return { lines: [n ? `상담 신청 ${n}명` : "오늘은 반응 없음"], msg: "스터디 모집 게시판 옆에 작은 포스터를 붙였다." };
  }
  if (id === "cs_seminar") {
    const room = roomBoost(s); cs.seminarT = s.t; const n = Math.max(2, r.poisson((3 + Math.min(cs.reviews, CS_BAL.semRev) / 15) * mod(s, "lectureMult", 1) * boost * room));
    for (let i = 0; i < n; i++) addClient(s, r, "특강");
    cs.reviews += 1; if (cs.nick === "real") applyEff(s, { eye: 3 });
    return { lines: [`특강 참석자 중 ${n}명 상담 신청`, "후기 +1", room > 1 ? `내 파티룸에서 진행 ×${room}` : ""].filter(Boolean), msg: room > 1 ? "내 파티룸에 의자 30개를 깔았다. 대관료 0원." : "질문이 끝나지 않았다. 마이크를 내려놓으니 9시 반." };
  }
  if (id === "cs_lecture") {
    cs.offers--; const L = D.CS_LECT, fee = Math.round((L.fee + skill(s) * L.perSkill + (s.fame || 0) * L.perFame) * SYN.pi(s) * mod(s, "lectureMult", 1) * (1 - aiDrop(s) / 100 * CS_AI.lectFeeW)); /* 11-23 AI 대세: 특강 예산도 준다 */ /* v4.27 실력·명성만큼 강의료 */ s.cash += fee; addMoney(s, "inc", "강의료", fee); cs.monthRev += fee;
    cs.refer += 1; cs.lectN = (cs.lectN || 0) + 1; applyEff(s, { eye: 3 });
    return { lines: [`강의료 +${won(fee)}`, "신뢰 +, 소개 +", giveBrk(s, "talk", "강의 섭외")], msg: "대학 커리어센터 2시간 특강. 학생 80명." };
  }
  if (id === "cs_template") { cs.template = Math.min(3, cs.template + 0.5); return { lines: [`템플릿 ${cs.template.toFixed(1)}/3 · 고객 처리 용량 +${Math.floor(cs.template)}`], msg: "자주 쓰는 첨삭 코멘트 40개를 정리했다." }; }
  if (id === "cs_group") {
    const room = roomBoost(s); cs.groupT = s.t; const n = Math.round(Math.min(12, 3 + Math.floor(cs.ch.kakao.m / 60) + Math.floor(cs.reviews / 15)) * room);
    const fee = Math.round(n * 20 * D.CS_PRICE[cs.price].mult); s.cash += fee; addMoney(s, "inc", "컨설팅", fee); cs.monthRev += fee; cs.clients += n;
    for (let i = 0; i < n; i++) cs.outcomes.push({ t: s.t + r.int(1, 3), p: passProb(s, "edit") - 0.05, who: null, price: 20, prod: "group" });
    return { lines: [`그룹 스터디 ${n}명`, `+${won(fee)}`], msg: "한 명에게 하던 설명을 열 명에게. 시간은 그대로." };
  }
  if (id === "cs_vod") {
    cs.vod.prog += 25 * mod(s, "vodMult", 1) * boost; s.mental = clamp(s.mental + mod(s, "vodMental", 0), 0, 100);
    if (cs.vod.prog >= 100) { cs.vod.prog = 0; cs.vod.n++; cs.vod.income += Math.round(30 + cs.reviews * 0.6 + cs.ch.youtube.subs / 250); log(s, `VOD·전자책 ${cs.vod.n}호 출시`, "work"); return { lines: [`${cs.vod.n}호 출시! 매달 약 ${won(cs.vod.income)} 자동 판매`], msg: "\"자소서 한 권으로 끝내기\" 표지를 올렸다." }; }
    return { lines: [`제작 ${Math.round(cs.vod.prog)}%`], msg: "녹화 버튼을 누르고 같은 말을 세 번 했다." };
  }
  return null;
}

// 고객
function prodPick(s, r, niche) {
  const pk = D.CS_PRODUCTS.pkg.req(s.cs);
  const w = { newgrad: [["edit", 0.65], ["coach", 0.2], ["pkg", 0.15]], public: [["edit", 0.65], ["coach", 0.2], ["pkg", 0.15]], interview: [["coach", 0.75], ["edit", 0.1], ["pkg", 0.15]], career: [["edit", 0.4], ["coach", 0.2], ["pkg", 0.4]] }[niche];
  let p = r.weighted(w); if (p === "pkg" && !pk) p = niche === "interview" ? "coach" : "edit"; return p;
}
function priceOf(s, prod, niche) { const b = D.CS_PRODUCTS[prod].price * D.NICHES[niche].priceF * (1 - (1 - aiCut(s, niche)) * CS_AI.priceW) * D.CS_PRICE[s.cs.price].mult * (s.cs.lv >= 4 ? 1.3 * mod(s, "csLv4Price", 1) : 1) * (s.cs.lv >= 5 ? 1.25 : 1); return Math.round(b * 10) / 10; }
function addClient(s, r, src) {
  const cs = s.cs; const niche = r.pick(cs.niches); const prod = prodPick(s, r, niche);
  let who = null;
  if (r.chance(0.25)) { const c = s.cast.filter((id) => CHAR[id]?.customer?.board === "consult" && !s.rel[id]?.client); if (c.length) who = r.pick(c); }
  if (who) { if (!s.rel[who]) s.rel[who] = { aff: 8, stage: 0, met: s.t, last: s.t, lover: false, spouse: false, helper: null, helperOk: false, talks: {}, loverSince: null, client: true }; else s.rel[who].client = true; }
  cs.queue.push({ id: ++cs.seq, prod, niche, left: D.CS_PRODUCTS[prod].unit, units: D.CS_PRODUCTS[prod].unit, price: priceOf(s, prod, niche), wait: 0, who, src, kmong: src === "크멍" });
  cs.newThisMonth++;
}
function passProb(s, prod) {
  const st = s.st[D.NICHES[s.cs.niche].stat];
  let p = 0.27 + (s.cs.focus > 0 ? 0.05 * s.cs.focus : 0) + (st - 50) / 180 + (s.st.career - 40) / 300 + clamp(((s.st.lang || 0) - 50) / 1000, 0, 0.04) + helperPower(s, "cs_hr") * 0.08 + mod(s, "passBonus", 0) + s.cs.template * 0.015 + (prod === "pkg" ? 0.15 : 0);
  if (s.cs.aiCheck) p += 0.02;
  if (s.era.freeze) p -= 0.08; if (s.era.ai && prod === "edit") p -= 0.03;
  return clamp(p, 0.08, 0.85);
}
function finishClient(s, r, q) {
  const cs = s.cs; let pay = q.price;
  if (q.kmong) { const fee = Math.round(pay * (s.era.fee ? 0.25 : 0.2) * 10) / 10; addMoney(s, "exp", "컨설팅 광고·수수료", fee); s.cash -= fee; }
  s.cash += pay; addMoney(s, "inc", "컨설팅", pay); cs.monthRev += pay; cs.clients++;
  const g = gap(s); if (g > 0 && r.chance(Math.min(0.45, g / 70) * (cs.focus > 0 ? 0.4 : 1))) { const back = Math.round(pay * r.range(0.5, 1)); s.cash -= back; addMoney(s, "exp", "환불", back); cs.monthRev -= back; cs.reviews = Math.max(0, cs.reviews - 0.6); s.mental = Math.max(0, s.mental - 3); cs.refunds = (cs.refunds || 0) + 1; cs.refundAll = (cs.refundAll || 0) + 1; }
  cs.outcomes.push({ t: s.t + r.int(1, 3), p: passProb(s, q.prod), who: q.who, price: q.price, prod: q.prod, g: q.prod === "vip" ? 0 : cs.guar || 0 }); // f30: 판매 당시 합격 보장
  if (q.who) s.rel[q.who].aff = clamp(s.rel[q.who].aff + 6, 0, 100);
  return pay;
}

export function monthStart(s, r) {
  const cs = s.cs; cs.monthRev = 0; cs.newThisMonth = 0; cs.refunds = 0; cs.focus = 0; cs.gRef = 0; cs.gRefN = 0;
  if (s.cal === 1) cs.leave = 0; // 연차는 해마다 새로
  const G = CS_F30.guar[cs.guar || 0] || CS_F30.guar[0];
  if (!cs.open) { cs.leads = 0; return; }
  const ch = cs.ch;
  const src = {
    크멍: ch.kmong.on ? (1.2 + Math.sqrt(cs.reviews) * 0.8) * (ch.kmong.q / 50) : 0,
    블로그: ch.blog.idx / 10,
    인별: ch.insta.f / 400 + (SYN.on(s, "insta_cs") ? (s.ins?.f || 0) / 1000 * 0.3 : 0),
    너튜브: ch.youtube.subs / 300,
    오픈채팅: ch.kakao.m / 100,
    광고: Math.sqrt(cs.ads) * 0.7 * mod(s, "adsMult", 1),
    소개: cs.refer,
    헤드헌터: cs.niches.includes("career") ? helperPower(s, "cs_headhunter") * 2.5 : 0,
  };
  const seas = cs.niches.reduce((a, k) => a + (s.era.rolling ? 1 : D.NICHES[k].season[s.cal - 1]) * D.NICHES[k].demand * aiCut(s, k), 0) / Math.max(1, cs.niches.length) * (1 + 0.35 * (cs.niches.length - 1));
  let mult = 0.58 * BIG.fullLead(s) * seas * (s.era.winter ? 0.9 : 1) * mod(s, "leadMult", 1) * (s.era.ai && cs.niche === "newgrad" ? 0.85 : 1) * (s.era.freeze ? 1.2 : 1) * SJ.ramp(s, "cs") * SJ.skillRamp(s, "cs") * G.lead; // v4.25b 배우는 기간 · f30 합격 보장
  let leads = 0; cs.src = {};
  for (const [k, v] of Object.entries(src)) leads += v * mult;
  // 시장 포화: 문의가 상한(cap)에 가까워질수록 덜 는다
  const cap = CS_BAL.leadCap * (BIG.isFull(s) ? CS_BAL.fullCapX : 1) * (1 + (s.fame || 0) / 100), raw = leads;
  leads = cap * (1 - Math.exp(-raw / cap));
  const sat = raw > 0 ? leads / raw : 1;
  for (const [k, v] of Object.entries(src)) cs.src[k] = Math.round(v * mult * sat * 10) / 10;
  cs.leads = leads;
  const trust = D.COMPANY_TYPES[s.co.type].trust * (s.co.quit || s.co.fired ? 0.6 : 1) + Math.min(0.35, cs.reviews / 80) + Math.min(0.2, cs.passes / 150) + (cs.nick === "real" ? 0.06 : 0) + cs.lv * 0.02;
  cs.trust = trust;
  cs.conv = clamp(0.17 + trust * 0.35 + (s.st.talk - 40) / 250 + clamp(((s.st.charm || 0) - 40) / 800, -0.03, 0.06) + D.CS_PRICE[cs.price].conv + mod(s, "convBonus", 0) + (SYN.on(s, "grad_cs") ? 0.04 : 0) + G.conv, 0.05, 0.8);
  const n = r.poisson(leads * cs.conv);
  const kmShare = leads ? src.크멍 * mult / leads : 0;
  for (let i = 0; i < n; i++) addClient(s, r, r.chance(kmShare) ? "크멍" : "문의");
  if (s.big?.vip) { const v = r.poisson((s.fame || 0) / 45 * (BIG.isFull(s) ? 1 : 0.3)); for (let i = 0; i < v; i++) cs.queue.push({ id: ++cs.seq, prod: "vip", niche: cs.niches.includes("career") ? "career" : cs.niche, left: 6, units: 6, price: Math.round(450 * (1 + (s.fame || 0) / 100) * SYN.pi(s)), wait: 0, who: null, src: "VIP" }); }
  cs.newThisMonth = n;
}

export function month(s, r, notes, scenes) {
  const cs = s.cs, ch = cs.ch;
  checkOpen(s, notes);
  if (!cs.niche) return 0;
  if (cs.open && s.cal === 1) { const d = aiDrop(s); if (d >= 5) notes.push(`컨설팅: AI 자소서가 대세라 신입 취업 쪽이 줄면서 내 문의가 예전보다 ${d}% 줄었어요. ${cs.niches.includes("career") ? "경력 이직 쪽은 그대로예요." : "경력 이직으로 넓히는 게 가장 확실해요. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요."}`); }
  // 조력자 공동 코치: 자동 처리(수익 60%)
  let coach = helperPower(s, "cs_coach") * 3;
  let auto = 0;
  while (coach > 0 && cs.queue.length) { const q = cs.queue[0]; const use = Math.min(coach, q.left); q.left -= use; coach -= use; if (q.left <= 0) { cs.queue.shift(); const p = finishClient(s, r, q); const share = Math.round(p * 0.4); s.cash -= share; addMoney(s, "exp", "공동 코치 몫", share); auto++; } }
  if (auto) notes.push(`공동 코치가 고객 ${auto}명 처리`);
  // 대기 고객
  let cancel = 0;
  for (const q of cs.queue) q.wait++;
  cs.queue = cs.queue.filter((q) => { if (q.wait >= 2) { cancel++; if (r.chance(0.3)) cs.reviews = Math.max(0, cs.reviews - 0.5); return false; } return true; });
  if (cancel) notes.push(`컨설팅: 기다리다 지친 고객 ${cancel}명 취소(나쁜 후기 위험)`);
  // 결과(합격 발표)
  const due = cs.outcomes.filter((o) => o.t <= s.t); cs.outcomes = cs.outcomes.filter((o) => o.t > s.t);
  let pass = 0, fail = 0, posted = 0, leak = false;
  const MK = CS_F30.mask[cs.mask || "name"] || CS_F30.mask.name;
  for (const o of due) {
    if (r.chance(o.p)) { pass++; cs.passes++; if (pass <= 3) gainStat(s, "career", 0.15, "cs_pass"); if (r.chance(0.7)) { cs.reviews += MK.rev; posted++; if (r.chance(MK.risk)) leak = true; } cs.refer = Math.min(CS_BAL.refMax, cs.refer + 0.25 * mod(s, "referMult", 1)); if (o.who) { s.rel[o.who].aff = clamp(s.rel[o.who].aff + 12, 0, 100); notes.push(`${CHAR[o.who].name}: "최종 합격했어요!!"`); } }
    else if (o.g) { fail++; cs.fails++; cs.reviews += 0.15; const back = Math.round(o.price * (CS_F30.guar[o.g]?.back || 0) * 10) / 10; if (back > 0) { s.cash -= back; addMoney(s, "exp", "환불", back); cs.monthRev -= back; cs.gRef += back; cs.gRefN++; cs.gRefAll = (cs.gRefAll || 0) + back; } } // f30 합격 보장 환불
    else { fail++; cs.fails++; cs.reviews += 0.15; if (o.prod === "pkg" && r.chance(0.2)) { s.cash -= Math.round(o.price * 0.5); addMoney(s, "exp", "환불", Math.round(o.price * 0.5)); notes.push("불합격 패키지 고객 50% 환불"); } }
  }
  if (pass + fail) notes.push(`합격 발표: 합격 ${pass} · 불합격 ${fail}`);
  if (cs.gRefN) notes.push(`합격 보장 환불 ${cs.gRefN}건 −${won(cs.gRef)}`);
  if (posted && MK.ap) { s.apNext -= MK.ap; notes.push(`합격 후기 ${posted}개 꼼꼼히 가리기: 다음 달 행동력 −${MK.ap}`); }
  cs.refer *= 0.85;
  // 채널 감소
  if (ch.blog.lastT < s.t) ch.blog.idx = Math.max(0, ch.blog.idx - 1.5);
  ch.blog.idx *= 0.995; ch.insta.f = Math.round(ch.insta.f * 0.995); ch.kakao.m = Math.round(ch.kakao.m * 0.997);
  // 광고비
  if (cs.ads && cs.open) { s.cash -= cs.ads; addMoney(s, "exp", "컨설팅 광고·수수료", cs.ads); }
  // VOD
  if (cs.vod.income) { const v = Math.round(cs.vod.income); s.cash += v; addMoney(s, "inc", "VOD·전자책", v); cs.vod.income *= 0.985; }
  // 실명 활동 노출
  if (cs.open && cs.nick === "real") s.co.eye = clamp(s.co.eye + 1 * eyeMult(s) / 1.4, 0, 100);
  // 강의 섭외
  if (cs.open && (cs.reviews >= D.CS_LECT.rev || helpers(s, "cs_lecture").length) && cs.offers < D.CS_LECT.maxOffers && r.chance((D.CS_LECT.p + helperPower(s, "cs_lecture") * 0.15) * (1 - aiDrop(s) / 100 * CS_AI.lectOfferW))) { cs.offers++; notes.push("대학 커리어센터에서 강의 섭외가 왔다"); }
  // 레벨
  cs.revHist.push(Math.round(cs.monthRev)); if (cs.revHist.length > 24) cs.revHist.shift();
  const last3 = cs.revHist.slice(-3);
  let lv = 1;
  if (cs.reviews >= 10 && cs.clients >= 20) lv = 2;
  if (lv === 2 && cs.passes >= 5 && ch.blog.posts >= 30) lv = 3;
  if (lv === 3 && cs.passes >= 30 && last3.length === 3 && last3.every((x) => x >= 200)) lv = 4;
  if (lv === 4 && cs.passes >= 100 && (ch.youtube.subs >= 10000 || cs.vod.n >= 2)) lv = 5;
  if (lv > cs.lv) { cs.lv = lv; notes.push(`컨설팅 Lv${lv} 「${D.CS_LEVELS[lv - 1].n}」`); log(s, `컨설팅 Lv${lv} 「${D.CS_LEVELS[lv - 1].n}」`, "work"); }
  if (cs.refunds) notes.push(`컨설팅 환불 ${cs.refunds}건(가격 대비 실력 ${skill(s)}/${priceNeed(s)})`);
  let f30Id = null;
  if (cs.stalk && s.t >= cs.stalk && r.chance(0.6)) { cs.stalk = 0; scenes.push(csEv(s, r, "stalker2")); }
  else if (cs.open && (f30Id = f30Pick(s, r, leak, pass))) { const sc = csEv(s, r, f30Id); if (sc) { cs.ev2T = s.t; scenes.push(sc); } } // f30 특이 요소 장면
  else if (cs.open && s.t - (cs.ev2T ?? -99) >= 2 && r.chance(0.4)) { const sc = csEvent(s, r, pass, fail); if (sc) { cs.ev2T = s.t; scenes.push(sc); } }
  // 사건 카드
  if (cs.open && s.t - cs.evT >= 3 && r.chance(0.3)) { const ev = jobEvent(s, r, "jobconsult"); if (ev) { cs.evT = s.t; scenes.push(ev); } }
  return cs.monthRev - (cs.ads || 0);
}

// ───────── 컨설팅 사건: 진상·환불·스토킹·연애·가격 대비 실력 ─────────
function csEvent(s, r, pass, fail) {
  const cs = s.cs, L = [];
  L.push([3, "jinsang"]); if (fail > 0) L.push([3, "refund"]); if (gap(s) > 0) L.push([4, "overprice"]);
  if (cs.nick === "real" || cs.ch.youtube.subs > 2000 || cs.ch.insta.f > 3000) L.push([1.2, "stalker"]);
  if (!s.fam.spouse && s.cast.some((id) => isRomanceable(s, CHAR[id]) && !CHAR[id].rank && !s.rel[id]?.lover)) L.push([1.5, "romance"]); // 11-24 회사 사람(사수 포함)은 면접 코칭 손님으로 나오지 않는다
  L.push([2, "ai"]); if (!(s.co.quit || s.co.fired)) L.push([1.5, "colleague"]); L.push([1.5, "blame"]); L.push([1.5, "parent"]); L.push([2, "ghost"]); L.push([1.5, "puff"]); // 11-23 컨설팅 고유 골치: 대필 요구 · 스펙 부풀리기
  if (pass > 0) L.push([2, "great"]); if (s.mental < 45) L.push([2, "heavy"]); L.push([1, "noshow"]);
  const tot = L.reduce((a, x) => a + x[0], 0); let x = r.next() * tot; let id = L[0][1];
  for (const [w, k] of L) { x -= w; if (x <= 0) { id = k; break; } }
  return csEv(s, r, id);
}
function csEv(s, r, id) {
  const cs = s.cs, P = Math.round(D.CS_PRODUCTS.edit.price * D.CS_PRICE[cs.price].mult * (cs.lv >= 4 ? 1.3 : 1) * 10);
  const E = (title, text, choices, extra = {}) => ({ kind: "event", tag: "컨설팅", title, text, onChoose: "cs_ev", ev: id, choices, ...extra });
  const c = (t, chk) => (chk ? { t, check: chk, ok: { text: "", eff: {} }, ng: { text: "", eff: {} } } : { t, eff: {}, text: "" });
  if (id === "jinsang") return E("진상 고객", "새벽 2시, 고객 까톡 47개. \"선생님 이거 내일 마감인데 전체 다 다시 써 주세요. 추가금은 없는 거죠?\"", [c("정중하게 선을 긋는다", { stat: "talk", dc: 45 }), c("밤새 다 해 준다 (스태미너 −15, 멘탈 −8)"), c(`환불하고 끝낸다 (−${won(P)})`)]);
  if (id === "refund") return E("불합격 환불 요구", "최종 불합격한 고객. \"돈 아까워요. 전액 환불 안 해 주면 크멍에 후기 쓸게요.\"", [c(`전액 환불한다 (−${won(P * 2)})`), c("규정대로 거절한다", { stat: "talk", dc: 50 }), c("다음 시즌 무료 재첨삭을 약속한다 (다음 달 행동력 −2)")]);
  if (id === "overprice") return E("가격값 못 한다는 후기", `크멍 후기: "${D.CS_PRICE[cs.price].n} 가격 받고 맞춤법만 봐 줌. 비추." 지금 실력 ${skill(s)}, 이 가격이 요구하는 실력 ${priceNeed(s)}.`, [c("가격을 한 단계 내린다"), c("실력으로 메운다 (다음 달 행동력 −2, 핵심 능력 +5)"), c("그냥 둔다 (후기 −2)")]);
  if (id === "stalker") return E("선 넘는 고객", `합격시켜 준 고객이 ${employedCs(s) ? "퇴근길에 회사 앞에" : "저녁마다 집 앞 골목에"} 서 있었다. DM 하루 50개. "선생님은 제 인생의 은인이에요. 우리 운명 아닐까요?"`, [c("단호하게 차단한다 (멘탈 −6, 다시 올 수 있음)"), c(employedCs(s) ? "경찰에 신고한다 (멘탈 −3, 회사에 소문)" : "경찰에 신고한다 (멘탈 −3)"), c("좋게 타이른다", { stat: "talk", dc: 55 })]);
  if (id === "stalker2") return E("또 나타났다", `차단했던 그 사람이 새 계정으로 크멍 상담을 신청했다. ${employedCs(s) ? "회사 로비에서" : "집 앞 편의점에서"} 내 이름을 부르는 소리가 들린다.`, [c("경찰에 신고하고 접근금지 신청 (돈 −50, 멘탈 −5)"), c("이사 가고 활동명을 바꾼다 (돈 −300, 오픈채팅 −30%)")]);
  if (id === "romance") { const who = r.pick(s.cast.filter((x) => isRomanceable(s, CHAR[x]) && !CHAR[x].rank && !s.rel[x]?.lover)); s._csWho = who; return E("고객에서 인연으로", `면접 코칭을 받던 ${CHAR[who].name}님이 합격 소식과 함께 물었다. "선생님, 축하 저녁 제가 사도 될까요?"`, [c("좋아요, 가요 (인연 시작, 호감 +25)"), c("고객과는 선을 긋는다 (신뢰 +)")], { who }); }
  if (id === "ai") return E("AI 탐지에 걸렸다", "고객 자소서가 기업 AI 탐지기에 걸렸다는 연락이 왔다. 내가 첨삭한 문단이다.", [c("내가 직접 다시 쓴다 (다음 달 행동력 −1)"), c("고객이 AI를 썼다고 한다 (후기 −2)"), c("'AI 티 점검' 단계를 만든다", { stat: "write", dc: 50 })]);
  if (id === "ghost") return E("\"그냥 다 써 주세요\"", "마감 이틀 전, 고객 메시지. \"첨삭 말고 선생님이 처음부터 써 주시면 안 돼요? 두 배 드릴게요. 제 경험은 메모로 보낼게요.\" 메모는 세 줄이다.", [c("대필은 안 한다고 하고, 30분 통화로 경험을 끌어낸다", { stat: "talk", dc: 45 }), c(`두 배 받고 써 준다 (+${won(P * 2)})`), c("소제목과 첫 문장만 잡아 주고 본인이 채우게 한다 (다음 달 행동력 −1)")]);
  if (id === "puff") return E("\"6개월로 써 주세요\"", "고객 이력서를 보다 멈췄다. 인턴 3개월이 6개월로, 프로젝트 '참여'가 '총괄'로 바뀌어 있다. \"다들 이 정도는 한다던데요. 문장만 다듬어 주세요.\"", [c("사실대로 돌려놓게 하고, 3개월에 한 일을 숫자로 살린다", { stat: "write", dc: 45 }), c(`못 본 척 문장만 다듬는다 (+${won(P)})`), c("증명서와 다르면 합격이 취소된다고만 알려 준다")]);
  if (id === "colleague") return E("회사 후배가 고객으로", "같은 회사 후배가 크멍으로 상담을 신청했다. 프로필 사진만 봐도 안다. 후배는 아직 모르는 것 같다.", [c(`받는다 (+${won(P * 2)}, 회사 눈치 +8)`), c("정중히 거절한다")]);
  if (id === "blame") return E("저격글", "블로그에 \"그 컨설턴트, 첨삭이 다 복붙\"이라는 글이 올라왔다. 댓글이 달리기 시작했다.", [c("근거를 들어 반박글을 쓴다", { stat: "write", dc: 50 }), c("무시한다 (블로그 지수 −8%)")]);
  if (id === "parent") return E("어머니가 대신 상담을", "고객 어머니가 매일 전화한다. \"우리 애는 대기업 가야 해요. 공기업은 안 돼요.\" 정작 본인은 공기업을 원한다.", [c(`어머니 뜻대로 진행한다 (+${won(P)}, 멘탈 −6)`), c("본인과만 이야기한다", { stat: "talk", dc: 45 })]);
  if (id === "great") return E("대박 합격 후기", "고객이 대기업 최종 합격! 인별에 \"이분 아니었으면 못 붙었어요\" 후기를 올렸다. 팔로워 2만 명 계정이다.", [c("감사 인사를 남긴다 (후기 +3, 소개 +1)")]);
  if (id === "heavy") return E("감정이 넘어온다", "불합격한 고객이 밤 11시에 울면서 전화했다. \"저 이제 뭐 해야 해요?\" 내 마음도 같이 가라앉는다.", [c("끝까지 들어 준다 (멘탈 −6, 소개 +0.5)"), c("상담 시간은 지킨다고 말한다 (멘탈 −1)")]);
  // ───── f30 특이 요소 장면 ─────
  if (id === "f30_guar") { cs.guarSeen = true; const pp = Math.round(passProb(s, "edit") * 100), G = CS_F30.guar; return E("합격 보장 전쟁", `같은 카테고리 판매자가 '불합격 시 전액 환불'을 걸었다. 내 문의가 눈에 띄게 줄었다. 지금 내 고객 합격률은 약 ${pp}%. 보장을 걸면 결제는 늘지만, 떨어진 만큼 돌려줘야 한다.`, [c("보장 없이 실력으로 간다(지금대로)"), c(`불합격 50% 환불을 건다 (결제 +${Math.round(G[50].conv * 100)}%p)`), c(`전액 환불로 맞불 (결제 +${Math.round(G[100].conv * 100)}%p)`)]); }
  if (id === "f30_mask") { cs.maskSeen = true; return E("첫 합격 후기 캡처", "고객이 최종 합격 문자 캡처를 보내왔다. \"후기로 써 주셔도 돼요!\" 그런데 회사 이름, 고객 이름, 면접 질문까지 다 보인다.", [c("이름만 가리고 올린다"), c("회사·학교·질문까지 꼼꼼히 가린다 (합격 달마다 행동력 −1)"), c("고객이 괜찮대서 그대로 올린다 (후기 효과 +25%, 논란 위험)")]); }
  if (id === "f30_leak") { const K = CS_F30.leak, m = Math.round(K.cash * SYN.pi(s)); cs.leakT = s.t; cs.leakN = (cs.leakN || 0) + 1; s._csF30 = { cash: m }; return E("후기 속 개인정보", "취준 커뮤니티에 글이 올라왔다. \"이 컨설턴트 후기 캡처에 합격자 회사랑 이름 다 보임.\" 고객에게 전화가 왔다. \"회사 사람들이 다 알아요…\"", [c(`즉시 내리고 사과, 앞으로 꼼꼼히 가린다 (위로금 −${won(m)}, 후기 −${K.rev[0]})`), c("모자이크해서 다시 올리고 해명글을 쓴다", { stat: "write", dc: 50 }), c(`동의받은 거라며 버틴다 (후기 −${K.rev[2]}, 크멍 상세 −${K.kmong})`)]); }
  if (id === "f30_bid") {
    const B = CS_F30.bid, L = D.CS_LECT, emp = employedCs(s), left = Math.max(0, B.leaveMax - (cs.leave || 0));
    const per = Math.round((L.fee + skill(s) * L.perSkill + (s.fame || 0) * L.perFame) * SYN.pi(s) * mod(s, "lectureMult", 1) * B.mult * (1 - aiDrop(s) / 100 * CS_AI.lectFeeW)), tot = per * B.n, org = ORGS[(s.t + (cs.lectN || 0)) % ORGS.length];
    cs.bidT = s.t; s._csBid = { tot, org };
    const ch = [c("이번엔 넘긴다"), c(emp ? `연차 ${B.days}일 쓰고 제안 PT를 한다` : "제안 PT를 준비한다", { stat: "talk", dc: B.dc })];
    if (emp) ch.push(c(`저녁·주말 강의로 바꿔 제안 (강의료 ×${B.eveMult}, 연차 0)`, { stat: "charm", dc: B.eveDc }));
    return E("기관 강의 입찰", `${org} 취업 특강 ${B.n}회 입찰 공고가 떴다. 회당 ${won(per)}, 모두 ${won(tot)}. ${emp ? `강의는 평일 오후 2시. 올해 남은 연차 ${left}일.` : "회사를 안 다니니 시간은 문제없다."} 대학 강의 ${cs.lectN || 0}번 해 본 이력이 무기다.`, ch);
  }
  if (id === "noshow") return E("노쇼", "면접 코칭 예약 시간, 고객이 30분째 안 온다. 까톡도 안 읽는다. 다음 날 \"죄송해요, 환불 되나요?\"", [c("노쇼 규정대로 환불 안 한다 (후기 −1 위험)"), c(`그냥 환불해 준다 (−${won(P)})`)]);
  return null;
}
export function csEvChoose(s, i, ok) {
  const cs = s.cs, id = s.pending?.ev, out = [];
  const P = Math.round(D.CS_PRODUCTS.edit.price * D.CS_PRICE[cs.price].mult * (cs.lv >= 4 ? 1.3 : 1) * 10);
  const cash = (v, k) => { s.cash += v; addMoney(s, v > 0 ? "inc" : "exp", k, Math.abs(v)); out.push(`돈 ${v > 0 ? "+" : "−"}${won(Math.abs(v))}`); };
  const ment = (v) => { s.mental = clamp(s.mental + v, 0, 100); out.push(`멘탈 ${v > 0 ? "+" : ""}${v}`); };
  const rev = (v) => { cs.reviews = Math.max(0, cs.reviews + v); out.push(`후기 ${v > 0 ? "+" : ""}${v}`); };
  if (id === "jinsang") { if (i === 0) { if (ok) ment(-2); else { rev(-2); ment(-5); out.push("별점 테러"); } } else if (i === 1) { s.hp = clamp(s.hp - 15, 0, s.hpMax); ment(-8); rev(0.5); out.push("스태미너 −15"); } else { cash(-P, "환불"); ment(2); } }
  if (id === "refund") { if (i === 0) cash(-P * 2, "환불"); else if (i === 1) { if (!ok) { rev(-3); cs.ch.kmong.q = Math.max(0, cs.ch.kmong.q - 10); out.push("크멍 분쟁, 상세페이지 품질 −10"); } else out.push("규정을 차분히 설명했다. 고객이 수긍했다"); } else { s.apNext -= 2; rev(1); out.push("다음 달 행동력 −2"); } }
  if (id === "overprice") { if (i === 0) { const ks = ["low", "mid", "high", "ultra"]; const k = ks[Math.max(0, ks.indexOf(cs.price) - 1)]; cs.price = k; out.push(`가격을 '${D.CS_PRICE[k].n}' 단계로`); } else if (i === 1) { s.apNext -= 2; out.push(`${D.STATS[D.NICHES[cs.niche].stat]} +${gainStat(s, D.NICHES[cs.niche].stat, 5).toFixed(1)}`, "다음 달 행동력 −2"); } else rev(-2); }
  if (id === "stalker") { if (i === 0) { ment(-6); if (R(s).chance(0.4)) cs.stalk = s.t + 3; } else if (i === 1) { ment(-3); if (employedCs(s)) out.push(...applyEff(s, { eye: 5 })); } else { if (ok) out.push("\"...죄송해요. 선을 넘었네요.\""); else { ment(-12); cs.stalk = s.t + 2; out.push("오히려 더 집착하기 시작했다"); } } }
  if (id === "stalker2") { if (i === 0) { cash(-50, "법률 비용"); ment(-5); } else { cash(-300, "이사 비용"); cs.ch.kakao.m = Math.round(cs.ch.kakao.m * 0.7); out.push("오픈채팅 −30%"); } }
  if (id === "romance") { const who = s._csWho; if (who) { ensureRel(s, who); if (i === 0) { out.push(`${CHAR[who].name} 호감 +${addAff(s, who, 25)}`); s.rel[who].last = s.t; } else { addAff(s, who, 5); cs.refer += 0.3; out.push("소개 +"); } } }
  if (id === "ai") { if (i === 0) { s.apNext -= 1; rev(0.5); out.push("다음 달 행동력 −1"); } else if (i === 1) rev(-2); else { if (ok) { cs.aiCheck = true; out.push("이제부터 합격률 +2%p(AI 티 점검)"); } else { s.apNext -= 1; out.push("만들다 말았다. 다음 달 행동력 −1"); } } }
  if (id === "colleague") { if (i === 0) { cash(P * 2, "컨설팅"); out.push(...applyEff(s, { eye: 8 })); } else out.push("\"아, 네... 알겠습니다.\""); }
  if (id === "ghost") {
    if (i === 0) { if (ok) { rev(1); cs.refer += 0.3; out.push("소개 +0.3", "고객이 자기 이야기를 처음으로 말로 했다. 그대로 받아 적게 했다"); } else { ment(-2); out.push("\"그럼 써 주는 데로 갈게요.\" 결제가 취소됐다"); } }
    else if (i === 1) { cash(P * 2, "컨설팅"); if (R(s).chance(0.5)) { rev(-2); out.push("면접관이 자소서 내용을 묻자 고객이 답을 못 했다"); } else out.push("서류는 붙었다. 면접은 고객 혼자 들어간다"); }
    else { s.apNext -= 1; rev(0.5); out.push("다음 달 행동력 −1"); }
  }
  if (id === "puff") {
    if (i === 0) { if (ok) { rev(1); out.push("3개월 동안 처리한 건수를 세어 넣었다. 6개월보다 세 보였다"); } else { out.push("\"그럼 저만 손해잖아요.\" 고객이 환불을 요구했다"); cash(-P, "환불"); } }
    else if (i === 1) { cash(P, "컨설팅"); if (R(s).chance(0.3)) { rev(-2); ment(-4); out.push("입사 서류 검증에서 걸려 합격이 취소됐다. 고객은 내 이름을 댔다"); } else out.push("아무 일도 없었다. 이번에는"); }
    else { if (R(s).chance(0.5)) { rev(0.5); out.push("고객이 직접 3개월로 돌려놨다"); } else out.push("고객은 그대로 냈다. 내 손은 떠났다"); }
  }
  if (id === "blame") { if (i === 0) { if (ok) { cs.ch.blog.idx += 5; out.push("반박글이 더 많이 읽혔다, 블로그 지수 +5"); } else { cs.ch.blog.idx *= 0.9; rev(-1); out.push("불난 집에 부채질, 블로그 지수 −10%"); } } else { cs.ch.blog.idx *= 0.92; out.push("블로그 지수 −8%"); } }
  if (id === "parent") { if (i === 0) { cash(P, "컨설팅"); ment(-6); } else { if (ok) { rev(1); out.push("본인이 원하는 공기업으로. 고객이 고맙다고 했다"); } else { out.push("어머니가 화를 내며 환불을 요구했다"); cash(-P, "환불"); } } }
  if (id === "great") { rev(3); cs.refer += 1; out.push("소개 +1"); }
  if (id === "heavy") { if (i === 0) { ment(-6); cs.refer += 0.5; out.push("소개 +0.5"); } else ment(-1); }
  if (id === "f30_guar") { cs.guar = [0, 50, 100][i] ?? 0; out.push(`합격 보장: ${CS_F30.guar[cs.guar].n}`); if (cs.guar) out.push("불합격 고객에게 판매 때 약속한 만큼 돌려줘요"); }
  if (id === "f30_mask") { cs.mask = ["name", "full", "raw"][i] || "name"; out.push(`후기 가림: ${CS_F30.mask[cs.mask].n}`); }
  if (id === "f30_leak") {
    const K = CS_F30.leak, kq = () => { cs.ch.kmong.q = Math.max(0, cs.ch.kmong.q - K.kmong); out.push(`크멍 상세 −${K.kmong}`); };
    if (i === 0) { cash(-(s._csF30?.cash || K.cash), "위로금"); rev(-K.rev[0]); cs.mask = "full"; out.push("후기 가림: 꼼꼼히 가림"); }
    else if (i === 1) { if (ok) { rev(-1); out.push("해명이 받아들여졌다"); } else { rev(-K.rev[1]); kq(); } }
    else { rev(-K.rev[2]); ment(-4); kq(); }
    s._csF30 = null;
  }
  if (id === "f30_bid") {
    const B = CS_F30.bid, b = s._csBid || { tot: 0 }; s._csBid = null;
    if (i === 0) out.push("다음 공고를 기다린다");
    else if (!ok) { ment(-3); out.push("탈락. 제안서는 다음에 다시 쓸 수 있다"); }
    else {
      const eve = i === 2, tot = Math.round(b.tot * (eve ? B.eveMult : 1));
      cash(tot, "강의료"); cs.refer += 1; cs.lectN = (cs.lectN || 0) + B.n; cs.offers = Math.min(D.CS_LECT.maxOffers, (cs.offers || 0) + 1);
      out.push(`낙찰! 특강 ${B.n}회`, "소개 +1 · 다른 기관 섭외 +1", giveBrk(s, "talk", "기관 강의"));
      if (eve) { s.hp = clamp(s.hp - 6, 0, s.hpMax); out.push("스태미너 −6(주말 강의)"); }
      else if (employedCs(s)) { cs.leave = (cs.leave || 0) + B.days; out.push(`연차 ${B.days}일 사용(올해 ${cs.leave}/${B.leaveMax}일)`); if (cs.leave > B.leaveMax) out.push("연차가 모자라 반차·조퇴로 메웠다", ...applyEff(s, { eye: B.overEye })); }
    }
  }
  if (id === "noshow") { if (i === 0) { if (R(s).chance(0.5)) rev(-1); else out.push("고객이 수긍했다"); } else cash(-P, "환불"); }
  return out;
}
export function passive(s) { return Math.round(s.cs.vod.income || 0); }
export function todos(s) {
  const cs = s.cs, t = [];
  if (!cs.open && cs.niche) { const st = entrySteps(s).find((x) => !x.done); if (st) t.push({ lv: 1, text: `컨설팅 개업 준비: ${st.n}`, go: "cs" }); }
  if (cs.queue.length) { const units = cs.queue.reduce((a, q) => a + q.left, 0); const ap = Math.ceil(units / capacity(s, 1)); const late = cs.queue.filter((q) => q.wait >= 1).length; t.push({ lv: late ? 2 : 1, text: `컨설팅 대기 고객 ${cs.queue.length}명(행동 ${ap}번)${late ? ` · ${late}명은 이번 달 안 하면 취소` : ""}`, go: "cs" }); }
  if (cs.open && cs.ch.blog.posts && s.t - cs.ch.blog.lastT >= 2) t.push({ lv: 0, text: `블로그 ${s.t - cs.ch.blog.lastT}개월째 글 없음(검색 지수 하락 중)`, go: "cs" });
  if (cs.open && [2, 8].includes(s.cal)) t.push({ lv: 1, text: `다음 달 ${s.cal === 2 ? "상반기" : "하반기"} 공채: 문의 폭증 대비(템플릿·코치)`, go: "cs" });
  if (cs.offers) t.push({ lv: 1, text: `강의 섭외 ${cs.offers}건 대기`, go: "cs" });
  return t;
}

// ───────── f30 특이 요소: 장면 고르기 · 보드 조작 · 보드 칸 · 시험 ─────────
function f30Pick(s, r, leak, pass) {
  const cs = s.cs, B = CS_F30.bid;
  if (leak && s.t - (cs.leakT ?? -99) >= CS_F30.leak.gap) return "f30_leak";
  if (!cs.guarSeen && cs.reviews >= CS_F30.guarRev && r.chance(0.5)) return "f30_guar";
  if (!cs.maskSeen && pass > 0) return "f30_mask";
  if ((cs.lectN || 0) >= 1 && cs.reviews >= D.CS_LECT.rev && B.cal.includes(s.cal) && s.t - (cs.bidT ?? -99) >= B.gap && r.chance(B.p)) return "f30_bid";
  return null;
}
export const passRate = (s) => passProb(s, "edit");
// 보드 버튼: "g:50"(합격 보장) · "m:full"(후기 가림)
export function setPolicy(s, key) {
  const cs = s.cs, [k, v] = String(key).split(":");
  if (k === "g" && CS_F30.guar[+v]) { cs.guar = +v; cs.guarSeen = true; return { ok: true, msg: `합격 보장: ${CS_F30.guar[+v].n}${+v ? " (이번 달부터 파는 상품에 적용)" : ""}` }; }
  if (k === "m" && CS_F30.mask[v]) { cs.mask = v; cs.maskSeen = true; return { ok: true, msg: `후기 가림: ${CS_F30.mask[v].n}` }; }
  return { ok: false, msg: "" };
}
// 컨설팅 보드 '운영 원칙' 칸(ui.js pgCS 가 부른다). 조건을 가질 때만 보인다
export function f30Box(S, esc, won) {
  const cs = S.cs; if (!cs.open) return "";
  const showG = cs.guarSeen || cs.reviews >= CS_F30.guarRev, showM = cs.maskSeen || cs.passes > 0, showL = (cs.lectN || 0) > 0;
  const drop = aiDrop(S), a = drop >= 5 ? `<div class="tiny bad" style="margin-top:8px">AI 대세: 내 문의 −${drop}%(신입 취업 쪽이 해마다 더 줄어요). 경력 이직은 줄지 않아요. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요.</div>` : "";
  if (!showG && !showM && !showL && !a) return "";
  const pp = Math.round(passProb(S, "edit") * 100), G = CS_F30.guar[cs.guar || 0];
  const btn = (attr, on, n, d) => `<button class="${on ? "on" : ""}" data-cspol="${attr}"><b>${esc(n)}</b><span class="tiny muted">${esc(d)}</span></button>`;
  const g = showG ? `<div class="sec" style="margin-top:0">합격 보장 <span class="tiny muted">· 내 고객 합격률 약 ${pp}%</span></div>
    <div class="pick">${Object.entries(CS_F30.guar).map(([k, x]) => btn(`g:${k}`, (cs.guar || 0) === +k, x.n, x.d)).join("")}</div>
    ${G.back ? `<div class="tiny ${cs.gRefN ? "bad" : "muted"}" style="margin-top:4px">불합격하면 약 ${100 - pp}% 고객에게 ${Math.round(G.back * 100)}% 환불${cs.gRefAll ? ` · 지금까지 −${won(Math.round(cs.gRefAll))}` : ""}</div>` : ""}` : "";
  const m = showM ? `<div class="sec" style="margin-top:8px">합격 후기 가림 <span class="tiny muted">${cs.leakN ? `· 논란 ${cs.leakN}번` : ""}</span></div>
    <div class="pick">${Object.entries(CS_F30.mask).map(([k, x]) => btn(`m:${k}`, (cs.mask || "name") === k, x.n, x.d)).join("")}</div>` : "";
  const l = showL ? `<div class="tiny muted" style="margin-top:8px">강의 ${cs.lectN}회${employedCs(S) ? ` · 올해 연차 ${cs.leave || 0}/${CS_F30.bid.leaveMax}일` : ""} · 기관 입찰은 2·3·8·9월 예산 시즌에 와요</div>` : "";
  return `<div class="card"><h3>운영 원칙 <small>${esc(G.n)}</small></h3>${g}${m}${l}${a}
    <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer;display:inline-block">자세히 ▾</summary><div class="tiny muted" style="margin-top:4px">합격 보장은 결제를 늘리지만, 고용 한파처럼 시즌이 나쁘면 불합격이 몰려 환불도 몰려요. 실력(합격률)이 높을수록 남는 장사예요. 후기를 대충 가리면 회사·이름이 비쳐 논란이 터질 수 있어요. 대학 강의를 한 번 하면 기관 특강 입찰 공고가 오고, 평일 강의는 연차를 써야 해요.</div></details></div>`;
}
// 시험(#autoN-cs-f30guar|f30mask|f30leak|f30bid): 장면을 바로 만든다
export function f30Scene(s, r, what) {
  const cs = s.cs; if (!cs.niche) setNiche(s, "newgrad"); cs.open = true; cs.lectN = Math.max(1, cs.lectN || 0); cs.reviews = Math.max(cs.reviews, 12);
  const id = { guar: "f30_guar", mask: "f30_mask", leak: "f30_leak", bid: "f30_bid" }[what];
  return id ? csEv(s, r, id) : null;
}
