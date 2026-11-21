// 취업컨설팅 보드: 진입(포지션·활동명·첫 후기·판매 채널) → 마케팅 채널 → 문의·전환 → 처리 용량 → 합격·후기 → 소개
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import { CHAR, addMoney, applyEff, helperPower, helpers, mod, won, log, eyeMult, ensureRel, isRomanceable, addAff, gainStat } from "./core.js";
import { jobEvent } from "./pr.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 11-21 밸런스(10개 투잡 공통 비교, 기획 jobconsult.json: 중위 월 200만·p95 1,500만·1:1 한계 연 3억).
// 원래: 문의 수 상한 없음 → 합격·후기·소개가 서로 키워 회사 다니며 3년 차 월 1,000만, 전업 5년 차 월 9,000만까지 폭주.
// 지금: 한 달 문의는 시장 크기(leadCap, 전업이면 ×fullCapX)에 가까워질수록 덜 는다. 소개는 refMax 까지만 쌓인다.
// 무료 특강 신청자는 후기 semRev 개까지만 늘어난다(원래 후기 수에 비례해 끝없이: 후기 1,600개면 특강 한 번에 100명+).
export const CS_BAL = { leadCap: 7, fullCapX: 2, refMax: 6, semRev: 60 };
export function init() {
  return { open: false, niche: null, niches: [], nick: null, price: "mid", reviews: 0, passes: 0, fails: 0, clients: 0, friends: 0,
    queue: [], outcomes: [], ch: { kmong: { on: false, q: 0 }, blog: { posts: 0, idx: 0, lastT: -99 }, insta: { f: 0 }, youtube: { subs: 0, videos: 0 }, kakao: { m: 0 } },
    ads: 0, template: 0, vod: { prog: 0, n: 0, income: 0 }, lv: 1, offers: 0, refer: 0, revHist: [], monthRev: 0, leads: 0, conv: 0, src: {}, evT: -99, groupT: -1, seminarT: -1, seq: 0, newThisMonth: 0 };
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
  s.cs.niches.push(k); return { ok: true, msg: `포지션 추가: ${n.n}` };
}
export function setNick(s, k) { s.cs.nick = k; return { ok: true, msg: k === "real" ? "실명으로 활동: 신뢰 +, 회사 눈치 ×1.4" : "닉네임으로 활동" }; }
export function setPrice(s, k) { const p = D.CS_PRICE[k]; if (p.req && s.cs.reviews < p.req) return { ok: false, msg: `후기 ${p.req}개부터` }; s.cs.price = k; return { ok: true, msg: `가격: ${p.n}` }; }
export function setAds(s, v) { s.cs.ads = clamp(Math.round(v), 0, 300); }
function checkOpen(s, notes) { if (!s.cs.open && entrySteps(s).every((x) => x.done)) { s.cs.open = true; notes?.push("취업컨설팅 개업! 다음 달부터 문의가 들어온다"); log(s, "취업컨설팅을 정식으로 시작했다.", "work"); return true; } return false; }

export function can(s, id) {
  const cs = s.cs;
  if (id === "cs_friend") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (cs.friends >= 8) return "지인은 이제 다 봐줬다"; return null; }
  if (["cs_blog", "cs_insta", "cs_kakao", "cs_kmong", "cs_youtube", "cs_flyer"].includes(id)) { if (!cs.niche) return "포지션을 먼저 정하세요"; return null; }
  if (id === "cs_work") { if (!cs.queue.length) return "대기 고객이 없습니다"; return null; }
  if (id === "cs_soomgo") return cs.open ? null : "개업 후 가능";
  if (id === "cs_seminar") { if (cs.reviews < 5) return "후기 5개부터"; if (cs.seminarT === s.t) return "이번 달엔 이미 했습니다"; return null; }
  if (id === "cs_lecture") return cs.offers > 0 ? null : "강의 섭외가 와야 합니다(후기 20개 또는 커리어센터 인연)";
  if (id === "cs_focus") return !cs.queue.length ? "대기 고객이 없어요" : null;
  if (id === "cs_template") return !cs.open ? "개업 후 가능" : cs.template >= 3 ? "템플릿 완성" : null;
  if (id === "cs_group") { if (!(cs.ch.kakao.m >= 150 || cs.reviews >= 25)) return "오픈채팅 150명 또는 후기 25개"; if (cs.groupT === s.t) return "이번 달 진행함"; return null; }
  if (id === "cs_vod") return cs.reviews < 20 ? "후기 20개부터" : null;
  return null;
}
// 컨설팅 × 파티룸: 내 공간에서 하면 효과 +30%, 강의·세미나룸·교육장이면 +60%
function roomBoost(s) { if (!SYN.on(s, "cs_room")) return 1; return s.pr.rooms.some((x) => x.status === "open" && ["lecture", "edu", "study"].includes(x.concept)) ? 1.6 : 1.3; }
// 실력 = 핵심 능력과 커리어의 평균. 가격 단계(레벨 보너스 포함)가 요구하는 실력보다 낮으면 환불·혹평
export function skill(s) { const k = D.NICHES[s.cs.niche || "newgrad"].stat; return Math.round((s.st[k] + s.st.career) / 2); }
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
    cs.reviews += ok ? 1 : 0.4; s.st.write = clamp(s.st.write + 0.6, 0, 200);
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
    s.st[D.NICHES[cs.niche].stat] = clamp(s.st[D.NICHES[cs.niche].stat] + 0.5 + mod(s, "workGrow", 0), 0, 200);
    s.mental = clamp(s.mental + mod(s, "csWorkMental", 0), 0, 100);
    return { lines: [`고객 ${done}명 완료`, `+${won(earned)}`, cs.queue.length ? `남은 대기 ${cs.queue.length}명` : "대기 0명"], msg: names.length ? `${names.join(", ")}님 자료도 끝냈다.` : "밤 12시, 첨삭 파일 이름에 '_최종_진짜최종'." };
  }
  if (id === "cs_blog") {
    ch.blog.posts++; ch.blog.lastT = s.t;
    let g = (2 + s.st.write / 25) * mod(s, "blogMult", 1) * boost * (1 + helperPower(s, "cs_writer") * 0.3);
    if (viral(0.03)) { g += 15; lines.push("검색 상위 노출! 방문자 폭증"); }
    ch.blog.idx += g; s.st.write = clamp(s.st.write + 0.4, 0, 200); s.mental += mod(s, "soloMental", 0);
    checkOpen(s, lines);
    return { lines: [`블로그 글 ${ch.blog.posts}개 · 검색 지수 ${Math.round(ch.blog.idx)}`, ...lines], msg: r.pick(["「자소서 두괄식, 첫 문장이 전부다」", "「면접관이 지원동기를 묻는 진짜 이유」", "「중고신입, 경력은 이렇게 쓴다」", "「공기업 NCS 자소서 3가지 함정」"]) };
  }
  if (id === "cs_insta") {
    let g = (15 + (s.st.sense + s.st.mkt) / 4) * mod(s, "snsMult", 1) * boost * (1 + helperPower(s, "cs_design") * 0.3);
    if (viral(0.04)) { g += 500; lines.push("릴스 터짐! 팔로워 +500"); }
    ch.insta.f += Math.round(g); s.st.mkt = clamp(s.st.mkt + 0.4, 0, 200); s.st.sense = clamp(s.st.sense + 0.2, 0, 200);
    return { lines: [`팔로워 ${ch.insta.f.toLocaleString()}`, ...lines], msg: "카드뉴스 8장. 첫 장 제목만 30분 고민했다." };
  }
  if (id === "cs_youtube") {
    ch.youtube.videos++;
    let g = (20 + s.st.talk * 2) * Math.exp(0.6 * r.normal()) * mod(s, "snsMult", 1) * boost * (1 + helperPower(s, "cs_video") * 0.5);
    if (viral(0.05)) { g += 3000; lines.push("알고리즘 탔다! 구독자 +3,000"); }
    ch.youtube.subs += Math.round(g); s.st.talk = clamp(s.st.talk + 0.5, 0, 200);
    const e = applyEff(s, { eye: 6 }); lines.push(...e);
    return { lines: [`구독자 ${ch.youtube.subs.toLocaleString()}`, ...lines], msg: "\"면접관 출신이 알려주는...\" 썸네일에 얼굴이 크게 나왔다." };
  }
  if (id === "cs_kakao") {
    const g = Math.round((12 + s.st.talk / 5) * mod(s, "kakaoMult", 1) * boost);
    ch.kakao.m += g; s.st.talk = clamp(s.st.talk + 0.3, 0, 200);
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
    cs.offers--; const fee = Math.round(50 * mod(s, "lectureMult", 1)); s.cash += fee; addMoney(s, "inc", "강의료", fee); cs.monthRev += fee;
    cs.refer += 1; applyEff(s, { eye: 3 });
    return { lines: [`강의료 +${won(fee)}`, "신뢰 +, 소개 +"], msg: "대학 커리어센터 2시간 특강. 학생 80명." };
  }
  if (id === "cs_template") { cs.template = Math.min(3, cs.template + 0.5); return { lines: [`템플릿 ${cs.template.toFixed(1)}/3 · 고객 처리 용량 +${Math.floor(cs.template)}`], msg: "자주 쓰는 첨삭 코멘트 40개를 정리했다." }; }
  if (id === "cs_group") {
    const room = roomBoost(s); cs.groupT = s.t; const n = Math.round(Math.min(12, 3 + Math.floor(cs.ch.kakao.m / 60) + Math.floor(cs.reviews / 15)) * room);
    const fee = Math.round(n * 20 * D.CS_PRICE[cs.price].mult); s.cash += fee; addMoney(s, "inc", "컨설팅", fee); cs.monthRev += fee; cs.clients += n;
    for (let i = 0; i < n; i++) cs.outcomes.push({ t: s.t + r.int(1, 3), p: passProb(s, "edit") - 0.05, who: null, price: 20, prod: "group" });
    return { lines: [`그룹 스터디 ${n}명`, `+${won(fee)}`], msg: "한 명에게 하던 설명을 열 명에게. 시간은 그대로." };
  }
  if (id === "cs_vod") {
    cs.vod.prog += 25 * mod(s, "vodMult", 1) * boost; s.mental += mod(s, "vodMental", 0);
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
function priceOf(s, prod, niche) { const b = D.CS_PRODUCTS[prod].price * D.NICHES[niche].priceF * D.CS_PRICE[s.cs.price].mult * (s.cs.lv >= 4 ? 1.3 * mod(s, "csLv4Price", 1) : 1) * (s.cs.lv >= 5 ? 1.25 : 1); return Math.round(b * 10) / 10; }
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
  cs.outcomes.push({ t: s.t + r.int(1, 3), p: passProb(s, q.prod), who: q.who, price: q.price, prod: q.prod });
  if (q.who) s.rel[q.who].aff = clamp(s.rel[q.who].aff + 6, 0, 100);
  return pay;
}

export function monthStart(s, r) {
  const cs = s.cs; cs.monthRev = 0; cs.newThisMonth = 0; cs.refunds = 0; cs.focus = 0;
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
  const seas = cs.niches.reduce((a, k) => a + (s.era.rolling ? 1 : D.NICHES[k].season[s.cal - 1]) * D.NICHES[k].demand, 0) / Math.max(1, cs.niches.length) * (1 + 0.35 * (cs.niches.length - 1));
  let mult = 0.58 * BIG.fullLead(s) * seas * (s.era.winter ? 0.9 : 1) * mod(s, "leadMult", 1) * (s.era.ai && cs.niche === "newgrad" ? 0.85 : 1) * (s.era.freeze ? 1.2 : 1) * SJ.ramp(s, "cs");
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
  cs.conv = clamp(0.17 + trust * 0.35 + (s.st.talk - 40) / 250 + clamp(((s.st.charm || 0) - 40) / 800, -0.03, 0.06) + D.CS_PRICE[cs.price].conv + mod(s, "convBonus", 0) + (SYN.on(s, "grad_cs") ? 0.04 : 0), 0.05, 0.75);
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
  let pass = 0, fail = 0;
  for (const o of due) {
    if (r.chance(o.p)) { pass++; cs.passes++; if (r.chance(0.7)) cs.reviews++; cs.refer = Math.min(CS_BAL.refMax, cs.refer + 0.25 * mod(s, "referMult", 1)); if (o.who) { s.rel[o.who].aff = clamp(s.rel[o.who].aff + 12, 0, 100); notes.push(`${CHAR[o.who].name}: "최종 합격했어요!!"`); } }
    else { fail++; cs.fails++; cs.reviews += 0.15; if (o.prod === "pkg" && r.chance(0.2)) { s.cash -= Math.round(o.price * 0.5); addMoney(s, "exp", "환불", Math.round(o.price * 0.5)); notes.push("불합격 패키지 고객 50% 환불"); } }
  }
  if (pass + fail) notes.push(`합격 발표: 합격 ${pass} · 불합격 ${fail}`);
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
  if (cs.open && (cs.reviews >= 20 || helpers(s, "cs_lecture").length) && cs.offers < 2 && r.chance(0.12 + helperPower(s, "cs_lecture") * 0.15)) { cs.offers++; notes.push("대학 커리어센터에서 강의 섭외가 왔다"); }
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
  if (cs.stalk && s.t >= cs.stalk && r.chance(0.6)) { cs.stalk = 0; scenes.push(csEv(s, r, "stalker2")); }
  else if (cs.open && s.t - (cs.ev2T ?? -99) >= 2 && r.chance(0.4)) { const sc = csEvent(s, r, pass, fail); if (sc) { cs.ev2T = s.t; scenes.push(sc); } }
  // 사건 카드
  if (cs.open && s.t - cs.evT >= 3 && r.chance(0.3)) { const ev = jobEvent(s, r, "jobconsult"); if (ev) { cs.evT = s.t; scenes.push(ev); } }
  return cs.monthRev - (cs.ads || 0);
}

// ───────── 컨설팅 사건: 진상·환불·스토킹·연애·가격 대비 실력 ─────────
const pk = () => (Math.random() < 0.5 ? 0 : 1);
function csEvent(s, r, pass, fail) {
  const cs = s.cs, L = [];
  L.push([3, "jinsang"]); if (fail > 0) L.push([3, "refund"]); if (gap(s) > 0) L.push([4, "overprice"]);
  if (cs.nick === "real" || cs.ch.youtube.subs > 2000 || cs.ch.insta.f > 3000) L.push([1.2, "stalker"]);
  if (!s.fam.spouse && s.cast.some((id) => isRomanceable(s, CHAR[id]) && !s.rel[id]?.lover)) L.push([1.5, "romance"]);
  L.push([2, "ai"]); if (!(s.co.quit || s.co.fired)) L.push([1.5, "colleague"]); L.push([1.5, "blame"]); L.push([1.5, "parent"]);
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
  if (id === "stalker") return E("선 넘는 고객", "합격시켜 준 고객이 퇴근길에 회사 앞에 서 있었다. DM 하루 50개. \"선생님은 제 인생의 은인이에요. 우리 운명 아닐까요?\"", [c("단호하게 차단한다 (멘탈 −6, 다시 올 수 있음)"), c("경찰에 신고한다 (멘탈 −3, 회사에 소문)"), c("좋게 타이른다", { stat: "talk", dc: 55 })]);
  if (id === "stalker2") return E("또 나타났다", "차단했던 그 사람이 새 계정으로 크멍 상담을 신청했다. 회사 로비에서 내 이름을 부르는 소리가 들린다.", [c("경찰에 신고하고 접근금지 신청 (돈 −50, 멘탈 −5)"), c("이사 가고 활동명을 바꾼다 (돈 −300, 오픈채팅 −30%)")]);
  if (id === "romance") { const who = r.pick(s.cast.filter((x) => isRomanceable(s, CHAR[x]) && !s.rel[x]?.lover)); s._csWho = who; return E("고객에서 인연으로", `면접 코칭을 받던 ${CHAR[who].name}님이 합격 소식과 함께 물었다. "선생님, 축하 저녁 제가 사도 될까요?"`, [c("좋아요, 가요 (인연 시작, 호감 +25)"), c("고객과는 선을 긋는다 (신뢰 +)")], { who }); }
  if (id === "ai") return E("AI 탐지에 걸렸다", "고객 자소서가 기업 AI 탐지기에 걸렸다는 연락이 왔다. 내가 첨삭한 문단이다.", [c("내가 직접 다시 쓴다 (다음 달 행동력 −1)"), c("고객이 AI를 썼다고 한다 (후기 −2)"), c("'AI 티 점검' 단계를 만든다", { stat: "write", dc: 50 })]);
  if (id === "colleague") return E("회사 후배가 고객으로", "같은 회사 후배가 크멍으로 상담을 신청했다. 프로필 사진만 봐도 안다. 후배는 아직 모르는 것 같다.", [c(`받는다 (+${won(P * 2)}, 회사 눈치 +8)`), c("정중히 거절한다")]);
  if (id === "blame") return E("저격글", "블로그에 \"그 컨설턴트, 첨삭이 다 복붙\"이라는 글이 올라왔다. 댓글이 달리기 시작했다.", [c("근거를 들어 반박글을 쓴다", { stat: "write", dc: 50 }), c("무시한다 (블로그 지수 −8%)")]);
  if (id === "parent") return E("어머니가 대신 상담을", "고객 어머니가 매일 전화한다. \"우리 애는 대기업 가야 해요. 공기업은 안 돼요.\" 정작 본인은 공기업을 원한다.", [c(`어머니 뜻대로 진행한다 (+${won(P)}, 멘탈 −6)`), c("본인과만 이야기한다", { stat: "talk", dc: 45 })]);
  if (id === "great") return E("대박 합격 후기", "고객이 대기업 최종 합격! 인별에 \"이분 아니었으면 못 붙었어요\" 후기를 올렸다. 팔로워 2만 명 계정이다.", [c("감사 인사를 남긴다 (후기 +3, 소개 +1)")]);
  if (id === "heavy") return E("감정이 넘어온다", "불합격한 고객이 밤 11시에 울면서 전화했다. \"저 이제 뭐 해야 해요?\" 내 마음도 같이 가라앉는다.", [c("끝까지 들어 준다 (멘탈 −6, 소개 +0.5)"), c("상담 시간은 지킨다고 말한다 (멘탈 −1)")]);
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
  if (id === "overprice") { if (i === 0) { const ks = ["low", "mid", "high"]; const k = ks[Math.max(0, ks.indexOf(cs.price) - 1)]; cs.price = k; out.push(`가격 ${D.CS_PRICE[k].n}(으)로`); } else if (i === 1) { s.apNext -= 2; out.push(`${D.STATS[D.NICHES[cs.niche].stat]} +${gainStat(s, D.NICHES[cs.niche].stat, 5).toFixed(1)}`, "다음 달 행동력 −2"); } else rev(-2); }
  if (id === "stalker") { if (i === 0) { ment(-6); if (Math.random() < 0.4) cs.stalk = s.t + 3; } else if (i === 1) { ment(-3); out.push(...applyEff(s, { eye: 5 })); } else { if (ok) out.push("\"...죄송해요. 선을 넘었네요.\""); else { ment(-12); cs.stalk = s.t + 2; out.push("오히려 더 집착하기 시작했다"); } } }
  if (id === "stalker2") { if (i === 0) { cash(-50, "법률 비용"); ment(-5); } else { cash(-300, "이사 비용"); cs.ch.kakao.m = Math.round(cs.ch.kakao.m * 0.7); out.push("오픈채팅 −30%"); } }
  if (id === "romance") { const who = s._csWho; if (who) { ensureRel(s, who); if (i === 0) { out.push(`${CHAR[who].name} 호감 +${addAff(s, who, 25)}`); s.rel[who].last = s.t; } else { addAff(s, who, 5); cs.refer += 0.3; out.push("소개 +"); } } }
  if (id === "ai") { if (i === 0) { s.apNext -= 1; rev(0.5); out.push("다음 달 행동력 −1"); } else if (i === 1) rev(-2); else { if (ok) { cs.aiCheck = true; out.push("이제부터 합격률 +2%p(AI 티 점검)"); } else { s.apNext -= 1; out.push("만들다 말았다. 다음 달 행동력 −1"); } } }
  if (id === "colleague") { if (i === 0) { cash(P * 2, "컨설팅"); out.push(...applyEff(s, { eye: 8 })); } else out.push("\"아, 네... 알겠습니다.\""); }
  if (id === "blame") { if (i === 0) { if (ok) { cs.ch.blog.idx += 5; out.push("반박글이 더 많이 읽혔다, 블로그 지수 +5"); } else { cs.ch.blog.idx *= 0.9; rev(-1); out.push("불난 집에 부채질, 블로그 지수 −10%"); } } else { cs.ch.blog.idx *= 0.92; out.push("블로그 지수 −8%"); } }
  if (id === "parent") { if (i === 0) { cash(P, "컨설팅"); ment(-6); } else { if (ok) { rev(1); out.push("본인이 원하는 공기업으로. 고객이 고맙다고 했다"); } else { out.push("어머니가 화를 내며 환불을 요구했다"); cash(-P, "환불"); } } }
  if (id === "great") { rev(3); cs.refer += 1; out.push("소개 +1"); }
  if (id === "heavy") { if (i === 0) { ment(-6); cs.refer += 0.5; out.push("소개 +0.5"); } else ment(-1); }
  if (id === "noshow") { if (i === 0) { if (Math.random() < 0.5) rev(-1); else out.push("고객이 수긍했다"); } else cash(-P, "환불"); }
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
