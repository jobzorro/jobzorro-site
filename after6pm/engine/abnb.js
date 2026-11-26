// 에어씨앤씨 보드: 파티룸과 다르게 '1박' 장사. 외국인 손님(외국어), 합법 등록 vs 미등록(단속), 슈퍼호스트, 환율·국제 이슈.
// v4.28 타이쿤 규칙: 주변 숙소 가격표·성수기 1박 가격·가격 전쟁 / 후기 이벤트·답글·후기 사건 / 쓰는 만큼 늘어나는 전기·난방비 / 법 개정과 명의 팀(defs AB_NAME)
import * as D from "./defs.js";
import { addMoney, log, mod, won, gainStat, applyEff, creditRoom, addLoan, helperPower, addAff, CHAR, jo } from "./core.js";
import * as SYN from "./syn.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import * as DF from "./decofx.js"; // 방 꾸미기 감성 점수 효과(사진 클릭·별점)
import * as RVW from "./review.js"; // v4.28 경쟁사 가격표·가격 전쟁·후기 사건
import * as SP from "./space.js"; // 11-25 지점 수 파손 배율·히든 길 켜짐 여부

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 11-21 밸런스: 공개 게임이라 미등록이 정답이 되면 안 된다. 합법이 기대값이 조금 더 낫게.
// 원래: 노출 배율 없음, 서울 합법은 내국인 0, 단속 월 1.2%(+0.8%)·12개월 간격·과태료 300~1000만·설득 판정 42
// 11-21 밸런스 2차(10개 투잡 공통 비교, 기획 stay.json: 1채 중위 월 90만·p75 180만): 기본 예약률 occ 0.85 → 0.75
export const AB_LAW = { occ: 0.75, legalShow: 1.08, legalSuper: 1.05, cityDomestic: 0.45, illegalShow: 0.95, raidP: 0.018, raidDom: 0.012, raidGap: 9, fine: [400, 1200], talkDc: 55 };
// 11-25 히든 길 '기업 장기 숙소 계약'(hidden.js): 합법 숙소 n채(먼저 연 순)가 출장자 장기 계약으로 가동률 occ 아래로 안 내려간다. 단속 걱정 없음(raid 배율 0).
// 위기(계약사가 출장을 끊음)로 멈춘 달에는 그 숙소들이 한꺼번에 빈다(empty 배율)
export const AB_HID = { n: 3, occ: 0.9, raid: 0, empty: 0.5 };
export const corpUnits = (s) => s.ab.units.filter((u) => u.reg === "legal" && u.regT == null).slice(0, AB_HID.n);
export function init() { return { units: [], listings: [], seq: 0, cohost: false, evT: -99, hist: [], fx: 0, peak: 1, revEv: "none", feeAuto: true, law: null, names: [], war: {}, clean: "self" }; }
const fillA = (A) => { A.peak = A.peak || 1; A.revEv = A.revEv || "none"; if (A.feeAuto === undefined) A.feeAuto = true; A.names = A.names || []; A.war = A.war || {}; A.clean = A.clean || "self"; for (const u of A.units) { u.longR = u.longR || 0; u.reviews = u.reviews ?? Math.round((u.stays || 0) * 0.45); u.unrep = u.unrep || 0; u.buzz = u.buzz || 0; } };

// ───────── 가격: 성수기·주변 숙소 시세·탄력성 ─────────
export const isPeakAb = (rk, cal) => D.AB_REGIONS[rk].peak.includes(cal);
export const seasonKind = (rk, cal) => { const R = D.AB_REGIONS[rk]; if (R.peak.includes(cal)) return "peak"; return (R.off && R.off < 0.8) || D.AB_SEASON[cal - 1] < 0.95 ? "off" : "mid"; };
export const elOf = (rk, cal) => D.PRICE_K.abEl[seasonKind(rk, cal)];
export const adrNow = (s, u, cal = s.cal) => u.adr * (isPeakAb(u.rk, cal) ? (s.ab.peak || 1) : 1);
export const refBase = (s, u) => D.AB_REGIONS[u.rk].adr * D.AB_TYPES[u.ty].adrF * SYN.pi(s);
// 11-26 보드 성적표: 숙소마다 평생 기록(hist 는 24달 순익만 남아서 따로 센다). cum = 달마다 순익 합(쉬는 달 월세 포함), nightsT = 묵은 박 수 합,
// bestM·worstM = 매출(rev)이 가장 높은·낮은 달 {t, v}, t0 = 계약한 달. 옛 저장은 처음 한 번 채운다(순익은 hist 24달, 박 수는 숙박 건수×평균 박, 매출은 지난달 것만)
function fillStats(u, t) {
  if (u.stV) return;
  const h = u.hist || [], T = D.AB_TYPES[u.ty] || { len: 2.5 };
  u.cum = u.cum ?? Math.round(h.reduce((a, x) => a + (+x || 0), 0));
  u.nightsT = u.nightsT ?? Math.round((u.stays || 0) * T.len);
  if (!u.bestM && u.last && u.last.rev != null && t != null) { u.bestM = { t: t - 1, v: u.last.rev }; u.worstM = { t: t - 1, v: u.last.rev }; }
  u.stV = 1;
}
// 화면용(저장을 건드리지 않음). t = 지금 달 번호(s.t) — 옛 저장의 지난달 매출에 달을 붙일 때만 쓴다
export function unitStats(u, t) { let c = u; if (!u.stV) { c = { hist: u.hist, last: u.last, stays: u.stays, ty: u.ty }; fillStats(c, t); } return { cum: c.cum || 0, nights: c.nightsT || 0, stays: u.stays || 0, bestM: c.bestM || null, worstM: c.worstM || null, t0: u.t0 ?? null }; }
export function refNow(s, u) { const A = s.ab; return refBase(s, u) * RVW.compF(s.cal, isPeakAb(u.rk, s.cal)) * RVW.warF(A.war?.[u.rk], s.t); }
export function compTable(s, u) { const A = s.ab, w = A.war?.[u.rk]; return RVW.compList("ab", u.rk + u.ty, refNow(s, u) / (RVW.warF(w, s.t) || 1), 4, s.t, w); }
export function setPeak(s, v) { s.ab.peak = v; return { ok: true, msg: v === 1 ? "성수기에도 평소 1박 가격" : `성수기 1박 가격 +${Math.round((v - 1) * 100)}%` }; }
export function setRevEv(s, k) { if (!D.PR_REVIEW.ev[k]) return { ok: false }; s.ab.revEv = k; return { ok: true, msg: `후기 이벤트: ${D.PR_REVIEW.ev[k].n}` }; }

// ── 진입 다시 설계(11-24): 합법 매물은 발품 → 집주인 설득 → 서류 확인 → 전입·등록(한 달) 네 단계. 서류를 안 보면 숨은 함정을 모른 채 계약한다.
// 첫 손님: 후기 5개 전에는 검색에 잘 안 보인다(예약 1/3부터). 반값 행사·사진·지인 숙박으로 후기를 모은다.
export const AB_ENTRY = { houseP: 0.35, trapP: 0.45, askBase: 0.22, askTalk: 1 / 150, askPlus: 0.25, plusRent: 0.1, warm: 0.35 /* 11-25 웃돈 없이 동의한 집주인 중 반기는 비율(설득 판정 아래쪽 35%) */, docBase: 0.35, docNum: 1 / 110, regWait: 1, waitMo: [2, 3], quitLoss: 0.3,
  boom: { n: 5, f0: 0.28, bad: 4.3, badF: 0.8, half: 0.5, friendAff: 40, friendCost: 6, photoDc: 50, photoF: 0.15, photoMax: 0.3 } };
if (typeof process !== "undefined" && process.env?.ABB) Object.assign(AB_ENTRY, JSON.parse(process.env.ABB)); // 봇 시험용
export const AB_TRAPS = {
  addr: { n: "전입신고가 안 된다", text: "주민센터 창구에서 서류가 되돌아왔다. 이 주소에 이미 다른 사람이 올라가 있다고 한다. 전에 살던 세입자가 주소를 안 뺐다. 집주인은 전화를 안 받는다.", wait: "전 세입자를 찾아 주소를 빼 달라고 한다(그동안 월세는 나간다)", doc: "전입세대 열람에 다른 사람 이름이 남아 있다" },
  bld: { n: "위반 건축물이었다", text: "구청에서 등록 신청이 반려됐다. 건축물대장에 '위반 건축물' 도장이 찍혀 있다. 옥상에 올린 방 한 칸이 무허가였다. 계약할 때는 아무도 말해 주지 않았다.", wait: "집주인에게 원상 복구를 요구하고 기다린다(그동안 월세는 나간다)", doc: "건축물대장에 위반 건축물 표시가 있다" },
  seal: { n: "집주인이 도장을 안 찍는다", text: "구청에 낼 동의서를 들고 갔는데 집주인이 말을 바꿨다. \"내가 언제 그런다 그랬어. 그냥 조용히 해.\" 말로는 된다던 사람이다. 서류에는 도장이 없다.", wait: "과일을 사 들고 몇 번 더 찾아간다(그동안 월세는 나간다)", doc: "집주인이 동의서에 도장 찍기를 미루고 있다" },
  crowd: { n: "이 건물에 숙소가 이미 셋이다", text: "등록하러 갔더니 담당자가 한숨을 쉰다. 이 건물에서만 민원이 올해 열두 건이라고 한다. 이미 숙소가 세 곳이고, 주민들이 새 등록을 막아 달라는 서명을 냈다.", wait: "이웃집을 돌며 인사하고 서명을 풀어 달라고 한다(그동안 월세는 나간다)", doc: "같은 건물에 숙소가 이미 세 곳이고 민원이 쌓여 있다" },
};
const spendAp = (s) => { if (s.pending) return "장면을 먼저 끝내세요"; if (s.ap < 1) return "행동력이 부족해요"; s.ap -= 1; return null; };
export const askOwnerP = (s, plus) => clamp(AB_ENTRY.askBase + (s.st.talk || 0) * AB_ENTRY.askTalk + (plus ? AB_ENTRY.askPlus : 0), 0.1, 0.95);
// 2단계 집주인 설득(행동력 1). plus = 월세를 10% 올려 준다
export function persuade(s, r, id, plus) {
  const A = s.ab, L = A.listings.find((x) => x.id === id); if (!L) return { ok: false, msg: "매물이 없어요" };
  if (!L.house) return { ok: false, msg: "등록이 안 되는 건물이에요" }; if (L.owner === true) return { ok: false, msg: "이미 동의를 받았어요" };
  const why = spendAp(s); if (why) return { ok: false, msg: why };
  const ox = r.next(), op = askOwnerP(s, plus); // r.chance 와 같은 난수 한 번. 넉넉히 넘으면 원래 숙박업을 반기는 집주인
  if (ox < op) { L.owner = true; L.ownerWarm = !plus && ox < op * AB_ENTRY.warm; /* 11-25 반기는 집주인 = 재계약 3%(space.js). 웃돈 동의는 늘 5% */ if (plus) L.rent = Math.round(L.rent * (1 + AB_ENTRY.plusRent)); gainStat(s, "talk", 0.4); return { ok: true, msg: plus ? `"월세를 그만큼 더 준다면야." 집주인이 동의서를 받아 갔다. 월세 ${won(L.rent)}.` : L.ownerWarm ? "\"요즘 젊은 사람들 이런 것도 하네. 잘해 봐요.\" 집주인이 반기며 동의서를 써 줬다." : "\"깨끗하게만 써요.\" 집주인이 숙박업 동의를 해 줬다.", lines: ["집주인 동의 O", L.ownerWarm ? "반기는 집주인: 재계약 때 월세 +3%" : "재계약 때 월세 +5%", "말빨 +0.4"] }; }
  A.listings = A.listings.filter((x) => x !== L); gainStat(s, "talk", 0.2);
  return { ok: true, msg: r.pick(["\"모르는 사람이 들락거리는 건 싫어요.\" 집주인이 전화를 끊었다. 이 매물은 끝났다.", "\"숙박업? 우리 건물은 안 해요.\" 부동산 사장님이 전단을 도로 가져갔다.", "집주인이 한참 듣더니 고개를 저었다. \"세입자들이 싫어해요.\""]), lines: ["집주인 거절 · 매물이 사라졌어요", "말빨 +0.2"] };
}
// 3단계 서류 확인(행동력 1). 숫자가 높을수록 잘 본다
export function docs(s, r, id) {
  const A = s.ab, L = A.listings.find((x) => x.id === id); if (!L) return { ok: false, msg: "매물이 없어요" };
  if (L.doc) return { ok: false, msg: "이미 확인했어요" };
  const why = spendAp(s); if (why) return { ok: false, msg: why };
  gainStat(s, "num", 0.4);
  if (!r.chance(clamp(AB_ENTRY.docBase + (s.st.num || 0) * AB_ENTRY.docNum, 0.2, 0.97))) return { ok: true, msg: "건축물대장, 등기부, 전입세대 열람. 서류 세 장을 봤는데 뭘 봐야 하는지 모르겠다. 한 번 더 봐야 한다.", lines: ["서류를 다 못 읽었어요(다시 볼 수 있어요)", "숫자 +0.4"] };
  L.doc = true;
  return { ok: true, msg: L.trap ? `서류에서 걸리는 게 나왔다. ${AB_TRAPS[L.trap].doc}.` : "건축물대장 깨끗, 용도 주택, 전입세대 없음. 걸리는 게 없다.", lines: [L.trap ? `숨은 함정 발견: ${AB_TRAPS[L.trap].n}` : "서류 이상 없음", "숫자 +0.4"] };
}
// 첫 후기 5개 전의 노출 배율
export function boomF(u) { const B = AB_ENTRY.boom; if ((u.reviews || 0) >= B.n || u.boomOff) return 1; return clamp((B.f0 + (1 - B.f0) * 0.6 * (u.reviews || 0) / B.n) * (u.rating < B.bad ? B.badF : 1) * (1 + (u.bPhoto || 0)), 0.1, 1); }
export const booming = (u) => !u.boomOff && (u.reviews || 0) < AB_ENTRY.boom.n && u.regT == null;
export function setHalf(s, id, v) { const u = s.ab.units.find((x) => x.id === id); if (!u) return { ok: false }; u.half = !!v; return { ok: true, msg: v ? `${u.name}: 후기 5개까지 반값에 내놓아요(적자를 감수해요)` : `${u.name}: 반값 행사를 껐어요` }; }
// 지인에게 묵어 달라고 한다(행동력 1, 호감 소모, 후기 +1)
export function friendCands(s) { return Object.entries(s.rel || {}).filter(([id, x]) => CHAR[id] && x.aff >= AB_ENTRY.boom.friendAff && x.abStay !== s.t).sort((a, b) => b[1].aff - a[1].aff).map(([id]) => id); }
export function friendStay(s, r, id) {
  const u = s.ab.units.find((x) => x.id === id); if (!u || !booming(u)) return { ok: false, msg: "후기 5개를 모으는 동안만 부탁할 수 있어요" };
  if (u.friendT === s.t) return { ok: false, msg: "이 숙소는 이번 달에 이미 부탁했어요" };
  const who = friendCands(s)[0]; if (!who) return { ok: false, msg: `부탁할 만큼 가까운 사람이 없어요(호감 ${AB_ENTRY.boom.friendAff})` };
  const why = spendAp(s); if (why) return { ok: false, msg: why };
  const x = s.rel[who]; x.aff = clamp(x.aff - AB_ENTRY.boom.friendCost, 0, 100); x.abStay = s.t; u.friendT = s.t; u.reviews = (u.reviews || 0) + 1; u.stays = (u.stays || 0) + 1;
  return { ok: true, msg: `${jo(CHAR[who].name, "이", "가")} 하룻밤 묵고 후기를 남겨 줬다. "다음엔 진짜 손님으로 올게." 밥은 내가 샀다.`, lines: [`${u.name} 후기 +1 (${u.reviews}/${AB_ENTRY.boom.n})`, `${CHAR[who].name} 호감 −${AB_ENTRY.boom.friendCost}`] };
}
export function trapDemo(s, k) { const u = s.ab.units[0]; if (!u) return null; u.trap = k && AB_TRAPS[k] ? k : "addr"; u.regT = s.t; u.trapDone = true; return trapScene(s, u); } // 화면 시험용
function trapScene(s, u) {
  const T = AB_TRAPS[u.trap], back = Math.round(u.dep * (1 - AB_ENTRY.quitLoss));
  return { kind: "event", tag: "에어씨앤씨", title: `${u.name} · ${T.n}`, onChoose: "ab_trap", abU: u.id, warn: true, text: `${T.text} ${u.trapSeen ? "서류에서 본 그대로다." : "서류를 한 번만 떼어 봤어도 알았을 일이다."} 세팅은 끝났고 월세는 이미 나가고 있다.`, choices: [
    { t: `계약을 깨고 나온다 (돌려받는 보증금 ${won(back)})`, eff: {}, text: "집주인과 한참 실랑이를 했다. 보증금 일부와 세팅비는 수업료가 됐다." },
    { t: "미등록으로 그냥 연다 (단속 위험)", eff: {}, text: "등록번호 칸을 비운 채 숙소를 올렸다. 예약 알림이 울릴 때마다 초인종 소리처럼 들린다." },
    { t: T.wait, eff: {}, text: "달력에 동그라미를 쳤다. 빈 숙소에 월세가 나간다. 풀릴 때까지 버틴다." }] };
}
// 매물
export function search(s, r, rk) {
  const R = D.AB_REGIONS[rk], pi = SYN.pi(s);
  const ls = Array.from({ length: 3 }, () => {
    const ty = r.pick(R.types), T = D.AB_TYPES[ty];
    const rent = Math.round(r.range(R.rent[0], R.rent[1]) * T.rentF * pi * (s.era.rentup ? 1.15 : 1) / 5) * 5;
    const house = R.house && ty !== "officetel" && r.chance(AB_ENTRY.houseP); // 11-24 등록되는 집은 드물다
    return { id: "A" + (++s.ab.seq), t: s.t, rk, ty, rent, dep: Math.round(rent * r.range(8, 15) / 100) * 100, setup: Math.round(T.setup * pi), owner: null /* 설득해 봐야 안다 */, house, trap: house && r.chance(AB_ENTRY.trapP) ? r.pick(Object.keys(AB_TRAPS)) : null, doc: false };
  });
  s.ab.listings = s.ab.listings.filter((l) => l.rk !== rk).concat(ls);
  return ls;
}
// v4.28 법 시행 뒤 합법 숙소는 명의 수(나 1 + 빌린 명의)까지
export const lawOn = (s) => s.ab.law?.phase === 2;
export const legalSlots = (s) => 1 + (s.ab.names || []).length;
export const legalCount = (s) => s.ab.units.filter((u) => u.reg === "legal").length;
// 계약: reg = "legal"(등록. 서울 도시민박업은 외국인만) | "illegal"(미등록. 다 받지만 단속·민원)
export function contract(s, id, reg) {
  const A = s.ab, L = A.listings.find((x) => x.id === id); if (!L) return { ok: false, msg: "매물이 없어요" };
  fillA(A);
  if (reg === "legal" && !L.house) return { ok: false, msg: "오피스텔은 숙박업 등록이 안 돼요(합법으로는 불가)" };
  if (reg === "legal" && L.owner !== true) return { ok: false, msg: "집주인의 숙박업 동의를 먼저 받아야 해요" };
  if (reg === "legal" && lawOn(s) && legalCount(s) >= legalSlots(s)) return { ok: false, msg: `명의가 모자라요(합법 ${legalCount(s)}/${legalSlots(s)}채). 명의를 더 모으거나 미등록으로` };
  const regFee = reg === "legal" ? Math.round(80 * SYN.pi(s)) : 0;
  const total = L.dep + L.setup + regFee, lack = total - s.cash;
  if (lack > 0) { if (lack > creditRoom(s) * 0.6 + 2000) return { ok: false, msg: `돈이 ${won(lack)} 모자라요` }; addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; }
  s.cash -= total; addMoney(s, "exp", "에어씨앤씨 오픈", total);
  const n = A.units.length + 1, R = D.AB_REGIONS[L.rk];
  const u = { ...L, id: "U" + (++A.seq), name: `${n}호 ${R.n} ${D.AB_TYPES[L.ty].n}`, reg, adr: Math.round(R.adr * D.AB_TYPES[L.ty].adrF * SYN.pi(s)), rating: 4.5, stays: 0, reviews: 0, unrep: 0, buzz: 0, months: 0, photo: 30 + s.st.sense / 3, ap: 0, last: null, hist: [], invested: total, banned: 0, t0: s.t, stV: 1, cum: 0, nightsT: 0 };
  if (reg === "legal" && L.owner === true && L.trap !== undefined) { u.regT = s.t + AB_ENTRY.regWait; u.trapSeen = !!L.doc; if (!L.trap) delete u.trap; } else delete u.trap; // 11-24 전입·등록에 한 달
  A.units.push(u); A.listings = A.listings.filter((x) => x !== L);
  if (A.t0 == null) A.t0 = s.t;
  log(s, `${u.name} 오픈 (${reg === "legal" ? "합법 등록" : "미등록"}). ${won(total)}`, "work");
  if (u.regT != null) return { ok: true, msg: `${u.name} 계약. 주소를 옮기고 구청에 신고해요. 등록까지 한 달, 그동안은 월세만 나가요.`, unit: u };
  return { ok: true, msg: `${u.name} 오픈! ${reg === "legal" ? (R.city ? "외국인 위주(내국인은 일부), 등록 숙소 노출 +8%" : "누구나 받아요, 등록 숙소 노출 +8%") : "누구나 받지만 노출이 줄고 단속 위험이 있어요"}`, unit: u };
}
export function close(s, id) { const A = s.ab, u = A.units.find((x) => x.id === id); if (!u) return { ok: false }; if (u.trap && u.trapDone && u.regT != null) u.dep = Math.round(u.dep * (1 - AB_ENTRY.quitLoss)); /* 11-24 등록이 막힌 채 정리하면 계약을 깬 것과 같다 */ s.cash += u.dep; addMoney(s, "inc", "보증금 회수", u.dep); A.units = A.units.filter((x) => x !== u); log(s, `${u.name} 정리`, "work"); return { ok: true, msg: `${u.name} 정리, 보증금 ${won(u.dep)} 회수` }; }
export function setAdr(s, id, v) { const u = s.ab.units.find((x) => x.id === id); if (u) u.adr = clamp(Math.round(v), 3, 80); }

export const needAp = (s, u) => { const A = s.ab, far = D.AB_REGIONS[u.rk].far * 0.5, m = A.clean || "self"; if (A.cohost) return 0.25; if (m !== "self") return Math.max(0.5, Math.round((far + AB_F30.clean[m].ap) * 2) / 2); return Math.max(0.5, Math.round(((u.last?.shortStays ?? u.last?.stays ?? 8) / 4 + far) * 2) / 2); }; // v4.29 청소 방식
export function can(s, id, arg) {
  const A = s.ab;
  if (id === "ab_search") return arg && !D.AB_REGIONS[arg] ? "없는 지역이에요" : null;
  if (!A.units.length) return "숙소가 없어요";
  if (id === "ab_cohost") { if (A.cohost) { const why = SJ.slotLock(s, () => { A.cohost = false; return () => { A.cohost = true; }; }); if (why) return why; } return A.units.length < 2 ? "숙소 2채부터" : null; }
  if (id === "ab_reply") return A.units.some((u) => (u.unrep || 0) >= 1) ? null : "답글 달 후기가 없어요";
  if (id === "ab_ask") { if (!A.law || A.law.phase < 1) return "법이 바뀐다는 소식이 오면 필요해요"; if (legalSlots(s) > A.units.length) return "명의가 이미 넉넉해요(숙소보다 많음)"; const C = askCands(s); if (!C.length) return "부탁할 사람이 없어요"; if (arg && !C.find((c) => c.id === arg)) return "이 사람은 지금 부탁할 수 없어요"; return null; }
  return null;
}
export function act(s, r, id, arg, boost = 1) {
  const A = s.ab; fillA(A);
  if (id === "ab_search") { const ls = search(s, r, arg || "hongdae"); return { lines: [`${D.AB_REGIONS[arg || "hongdae"].n} 매물 ${ls.length}개`], msg: D.AB_REGIONS[arg || "hongdae"].tip }; }
  if (id === "ab_cohost") { A.cohost = !A.cohost; return { lines: [A.cohost ? "코호스트 고용: 매출의 20%, 청소·응대를 맡겨요" : "코호스트 해지"], msg: A.cohost ? "\"체크인 안내는 제가 4개 국어로 할게요.\"" : "다시 내가 다 한다." }; }
  if (id === "ab_ask") { const c = askCands(s).find((x) => x.id === arg) || askCands(s)[0]; const out = askTry(s, r, c, false); return { lines: out.lines, msg: out.msg }; }
  const u = A.units.find((x) => x.id === arg) || (id === "ab_reply" ? [...A.units].sort((a, b) => b.unrep - a.unrep)[0] : A.units[0]);
  if (id === "ab_reply") { const n = Math.min(u.unrep || 0, Math.round(15 + (s.st.lang || 0) / 4 + (s.st.write || 0) / 5)); u.unrep = Math.max(0, u.unrep - n); u.replyT = s.t; gainStat(s, "lang", 0.3); return { lines: [`${u.name} 답글 ${Math.round(n)}개 · 남은 것 ${Math.round(u.unrep)}`, "이번 달 별점 +"], msg: r.pick(["\"Thank you for staying! Come back for cherry blossoms!\"", "일본어 후기엔 일본어로. 번역기 반, 정성 반.", "\"다음엔 루프탑 비밀번호도 알려 드릴게요.\" 답글이 또 예약이 됐다."]) }; }
  if (id === "ab_clean") { u.ap += boost * clamp(0.85 + (s.st.hands || 0) / 300, 0.85, 1.25); u.unrep = Math.round((u.unrep || 0) * (1 - D.PR_REVIEW.reply.manageCut)); gainStat(s, "hands", 0.3); return { lines: [`${u.name} 관리 ${Math.round(u.ap * 10) / 10}/${needAp(s, u)}`], msg: "침구 교체, 머리카락 0개 작전, 웰컴 카드." }; }
  if (id === "ab_photo") { u.photo = Math.min(100, u.photo + 8 + s.st.sense / 20); gainStat(s, "sense", 0.5); const B = AB_ENTRY.boom, bk = booming(u) && (u.bPhoto || 0) < B.photoMax && r.chance(clamp(0.5 + ((s.st.sense || 0) - B.photoDc) / 60, 0.15, 0.95)); if (bk) u.bPhoto = Math.min(B.photoMax, (u.bPhoto || 0) + B.photoF); return { lines: [`${u.name} 사진·소개 ${Math.round(u.photo)}`, ...(booming(u) ? [bk ? "첫 화면 사진이 눈에 띄어요 · 검색 노출 +" : "사진은 나아졌지만 검색에서 눈에 띄진 않아요"] : [])], msg: "광각 렌즈, 오전 10시 햇살, 침대 위 수건 백조." }; }
  if (id === "ab_host") {
    u.host = s.t; const ok = r.chance(clamp(0.35 + s.st.lang / 120 + s.st.talk / 400, 0.1, 0.95)); gainStat(s, "lang", 0.8);
    u.rating = clamp(u.rating + (ok ? 0.05 : -0.03), 3.5, 5);
    return { lines: [ok ? "게스트 응대 성공, 별점 +" : "말이 잘 안 통했다, 별점 −", "외국어 +"], msg: ok ? r.pick(["\"Your place is amazing! Where can we eat Korean BBQ?\" 맛집 리스트를 보냈다.", "일본인 가족에게 지하철 환승을 번역기 없이 설명했다.", "\"謝謝!\" 대만 게스트가 과자를 두고 갔다."]) : "\"Sorry... the wifi... password?\" 같은 질문을 세 번 받았다." };
  }
  return null;
}

// 한 달 정산
export function month(s, r, notes, scenes) {
  const A = s.ab, pi = SYN.pi(s); let total = 0, abX = 0; fillA(A);
  if (A.units.length && A.t0 == null) A.t0 = s.t;
  if (A.fx > 0) A.fx--;
  const n0 = scenes.length; lawMonth(s, r, notes, scenes, n0); // v4.28 법 개정·명의 팀·용돈
  warMonth(s, r, notes, scenes); // v4.28 가격 전쟁
  const nAll = A.units.length + (s.pr?.rooms?.length || 0) * (SYN.on(s, "pr_ab") ? 1 : 0), sf = D.scaleF(Math.max(1, nAll));
  const RK = D.PR_REVIEW, UK = D.UTIL_K.ab; let shortSum = 0;
  const hOn = SP.hidOn(s, "airbnb"), hPause = SP.hidPaused(s, "airbnb"), corp = hOn || hPause ? corpUnits(s) : [], dX = SP.dmgX(A.units.length); // 11-25 히든 길 · 지점 수 파손 배율
  for (const u of A.units) {
    const R = D.AB_REGIONS[u.rk], T = D.AB_TYPES[u.ty]; fillStats(u, s.t);
    if (u.regT != null) { // 11-24 전입·등록 대기
      if (s.t >= u.regT && u.trap && !u.trapDone) { u.trapDone = true; scenes.push(trapScene(s, u)); s.cash -= u.rent; addMoney(s, "exp", "에어씨앤씨 비용", u.rent); total -= u.rent; u.cum -= u.rent; continue; }
      if (s.t >= u.regT) { delete u.regT; notes.push(`${u.name}: 숙박업 등록 완료. 오늘부터 손님을 받아요`); }
      else { s.cash -= u.rent; addMoney(s, "exp", "에어씨앤씨 비용", u.rent); total -= u.rent; u.cum -= u.rent; notes.push(`${u.name}: 전입·등록 기다리는 중(월세만 나감)`); continue; }
    }
    if (u.banned > 0) { u.banned--; s.cash -= u.rent; addMoney(s, "exp", "에어씨앤씨 비용", u.rent); total -= u.rent; u.cum -= u.rent; notes.push(`${u.name}: 영업정지 중(월세는 나감)`); continue; }
    const seas = (R.peak.includes(s.cal) ? 1.35 : R.off ?? 1) * (D.AB_SEASON[s.cal - 1]);
    const fx = A.fx > 0 ? 1.3 : 1, intl = s.era.pandemic ? 0.15 : s.era.intl ? 0.5 : 1;
    const langF = clamp(0.45 + s.st.lang / 110, 0.4, 1.3) * mod(s, "abLang", 1);
    const foreignD = R.foreign * fx * intl * langF * (SYN.on(s, "ovs_ab") ? 1.1 : 1) * (SYN.on(s, "insta_ab") ? 1.06 : 1), domesticD = (u.reg === "legal" && R.city ? AB_LAW.cityDomestic : 1) * (1 - R.foreign) * (s.era.winter ? 0.8 : 1); // 서울 합법: 내국인은 공유숙박 특례로 절반만
    const dl = DF.lift(s, u); // 안 꾸민 숙소는 '알아서' 수준(거의 0)
    const pEff = adrNow(s, u) * (u.half && booming(u) ? AB_ENTRY.boom.half : 1), ref = refNow(s, u); // v4.28 성수기 가격·경쟁사 시세(성수기 인상·전쟁)
    let occ = AB_LAW.occ * seas * (foreignD + domesticD) * (0.6 + u.photo / 250 + dl * DF.DECO.photo) * (1 + (u.rating - 4.6) * 0.8) * Math.pow(ref / pEff, elOf(u.rk, s.cal)) * (A.super ? 1.12 * (u.reg === "legal" ? AB_LAW.legalSuper : 1) : 1) * (u.reg === "legal" ? AB_LAW.legalShow : AB_LAW.illegalShow) * (1 - 0.03 * (s.pr?.mkt?.[u.rk]?.comp || 0));
    occ *= RVW.reviewMult("ab", u) * (1 + (RK.ev[A.revEv]?.rebook || 0)) * (1 + Math.min(0.2, (u.buzz || 0) / 300)); // v4.28 후기 수·상위 노출·단골·입소문
    if (u.months === 0) occ *= 0.6;
    occ *= boomF(u); if (u.half && !booming(u)) { u.half = false; notes.push(`${u.name}: 후기 ${AB_ENTRY.boom.n}개를 채웠어요. 반값 행사를 끝내고 정상 노출돼요`); } // 11-24 첫 후기 5개 전에는 검색에 잘 안 보인다
    occ *= SJ.ramp(s, "airbnb"); // 첫 숙소 초반 고생(sj.js ENTRY)
    const q = A.cohost ? 1 : clamp(u.ap / needAp(s, u), 0, 1); occ *= 0.8 + 0.2 * q;
    const adLv = A.ad ?? 2, AD = D.PR_AD[adLv] || D.PR_AD[2]; occ *= adLv === 0 && (u.photoT === s.t || A.promoT === s.t) ? D.PR_AD_SELF : AD.occ; // 11-25 마케팅비(숙소마다): 안 쓰면 손님이 준다
    occ = clamp(occ * (1 + 0.08 * r.normal()), 0.03, 0.97);
    if (corp.includes(u)) occ = hOn ? Math.max(occ, AB_HID.occ) : occ * AB_HID.empty; // 11-25 히든 길: 출장자 장기 계약(가동률 고정) / 위기 달엔 한꺼번에 빔
    // v4.29 한 달 살기: 장기 비율 LR 만큼은 계절·외국인과 상관없이 꾸준히 차지만 1박 값이 싸다. 손님이 덜 바뀌니 청소·후기·민원도 적다
    const LR = u.longR || 0, 엘쥐 = AB_F30.long;
    const nS = Math.round(occ * 30 * (1 - LR)), nL = LR ? Math.round(30 * LR * 엘쥐.occ * (0.85 + 0.15 * q) * (u.months === 0 ? 0.6 : 1)) : 0;
    const nights = nS + nL, shortStays = Math.round(nS / T.len), stays = Math.max(0, shortStays + (nL ? Math.max(1, Math.round(nL / 엘쥐.len)) : 0));
    shortSum += u.ty === "detached" ? shortStays * 0.4 : shortStays;
    const gross = Math.round((nS * pEff + nL * pEff * 엘쥐.price) * (A.super ? 1.08 : 1)), RM = RVW.reviewMonth("ab", A, stays, gross, u), rev = gross - RM.disc;
    const winter = [12, 1, 2].includes(s.cal), summer = [7, 8].includes(s.cal);
    const util = Math.round((UK.base * T.rentF + (D.UTIL_K.season[s.cal] || 0) * 0.7 * T.rentF /* 11-25 여름·겨울 한철 냉난방 */ + nights * (UK.per + (winter ? UK.heat : summer ? UK.ac : 0))) * pi * (0.6 + 0.4 * sf)); // v4.28 숙박일만큼 전기·수도·난방
    const clean = (A.cohost ? 3.5 : AB_F30.clean[A.clean || "self"].per) * stays * pi * sf, fee = rev * 0.035, cohost = A.cohost ? rev * 0.2 : 0;
    const adFee = Math.round(AD.fee * pi), costOther = Math.round(u.rent + clean + fee + cohost + stays * 0.8 * pi) + adFee; // 11-25 마케팅비
    const cost = costOther + util + Math.round(RM.pay);
    // 별점: 청결(관리)·응대(외국어)·사진 + v4.28 답글
    let target = 4.35 + q * 0.35 + (s.st.lang - 40) / 400 + (u.host === s.t ? 0.05 : 0) + mod(s, "abStar", 0) + (SYN.on(s, "travel_ab") ? 0.05 : 0) + dl * DF.DECO.abStar;
    if ((u.unrep || 0) > RK.unrep.max) target -= RK.unrep.star; if (u.replyT === s.t) target += RK.reply.star;
    u.rating = clamp(u.rating + (target - u.rating) * 0.25 + 0.03 * r.normal(), 3.4, 4.99);
    u.stays += stays; u.months++; u.ap = 0; u.reviews += RM.add; u.unrep += RM.add; u.buzz = clamp(u.buzz * 0.9 + RM.photoBuzz * 0.3, 0, 100);
    u.last = { occ, nights, stays, rev, cost, util, pay: RM.pay, disc: RM.disc, newRev: RM.add, foreign: Math.round(foreignD / (foreignD + domesticD + 1e-9) * 100), q, longN: nL, shortStays };
    u.hist.push(rev - cost); if (u.hist.length > 24) u.hist.shift();
    u.cum += rev - cost; u.nightsT += nights; if (!u.bestM || rev > u.bestM.v) u.bestM = { t: s.t, v: rev }; if (!u.worstM || rev < u.worstM.v) u.worstM = { t: s.t, v: rev }; // 11-26 성적표 평생 기록
    s.cash += rev - cost; addMoney(s, "inc", "에어씨앤씨 매출", rev); addMoney(s, "exp", "에어씨앤씨 비용", costOther); addMoney(s, "exp", "전기·난방비", util); if (RM.pay) addMoney(s, "exp", "후기 페이백", Math.round(RM.pay)); total += rev - cost;
    // 사건
    // 미등록 단속: 이웃 신고·플랫폼 등록번호 점검. 6개월에 한 번까지, 설득은 어렵다. v4.28 법 시행 뒤엔 배율
    const raidX = lawOn(s) ? D.AB_NAME.holdRaid : 1;
    if (u.reg === "illegal" && s.t - (A.raidT ?? -99) >= AB_LAW.raidGap && r.chance((AB_LAW.raidP + (u.last.foreign < 50 ? AB_LAW.raidDom : 0)) * raidX * nbF(s) * (1 - 엘쥐.raid * LR) * (hOn ? AB_HID.raid : 1))) {
      const fine = Math.round(r.int(AB_LAW.fine[0], AB_LAW.fine[1]) * pi); A.raidT = s.t; A.raidN = (A.raidN || 0) + 1; s._abRaid = { id: u.id, fine };
      const canReg = u.house && (!lawOn(s) || legalCount(s) < legalSlots(s));
      scenes.push({ kind: "event", tag: "에어씨앤씨", title: "불법 숙박 단속", onChoose: "ab_raid", text: `${u.name}에 구청 단속반이 왔다. ${lawOn(s) ? "법이 바뀐 뒤라 미등록 숙소를 집중 점검 중이다." : "이웃 신고였다."} 그대로면 과태료 ${won(fine)}에 3개월 영업정지. 어떻게 할까?`, choices: [
        { t: "아랫집에 떡 돌리고 사정을 설명한다", check: { stat: "talk", dc: AB_LAW.talkDc }, ok: { text: "\"젊은 사람이 애쓰네.\" 이웃이 신고를 취하했다. 경고장 한 장으로 끝났다.", eff: {} }, ng: { text: "\"시끄러운 건 시끄러운 거죠.\" 신고는 그대로 갔다.", eff: {} } },
        { t: canReg ? "바로 숙박업 등록을 하겠다고 약속한다" : u.house ? "명의가 모자라 등록은 못 하지만 운영을 줄이겠다고 한다" : "오피스텔이라 등록은 못 하지만 운영을 줄이겠다고 한다", eff: {}, text: canReg ? "등록 서류를 냈다. 과태료는 절반, 정지는 1개월로 줄었다. 이제 합법 숙소다." : "선처를 받아 과태료가 30% 줄었다. 정지 2개월." },
        { t: "과태료 내고 버틴다", eff: {}, text: "과태료를 냈다. 3개월 동안 리스팅이 내려간다." },
      ] });
    }
    else if (!A.cohost && A.clean === "gig" && shortStays && scenes.length === n0 && s.t - (A.raceT ?? -99) >= 2 && r.chance(1 - Math.pow(1 - AB_F30.clean.gig.punk, shortStays))) { A.raceT = s.t; scenes.push(raceScene(s, u)); } // v4.29 청소 펑크
    else if (stays && scenes.length === n0 && r.chance(RK.evP)) { const sc = RVW.reviewEvent(s, r, "ab", u, A); if (sc) scenes.push(sc); }
    else if (stays && (abX = r.next()) < 0.06 * dX) scenes.push(abEvent(s, r, u, abX >= 0.06)); // 11-25 지점 하나 늘 때마다 파손·고장 +30%(늘어난 몫은 파손·고장 사건만)
  }
  total += f30Month(s, r, notes, scenes, n0, shortSum); // v4.29 청소팀 고정비·이웃 인심·첫 안내 장면
  // 환율·국제 이슈
  if (A.units.length && r.chance(0.02) && !A.fx) { A.fx = 6; notes.push("환율 급등! 한국 여행이 싸졌다: 외국인 예약 +30%(6개월)"); }
  // 슈퍼호스트(별점 4.8 + 후기 10개). v4.28 숙박 수 → 후기 수
  const sup = A.units.length && A.units.every((u) => u.rating >= 4.8) && A.units.reduce((a, u) => a + (u.reviews || 0), 0) >= RK.abSuperN;
  if (sup && !A.super) { notes.push("슈퍼호스트 배지 획득! 노출 +12%, 요금 +8%"); log(s, "에어씨앤씨 슈퍼호스트가 됐다.", "work"); }
  if (!sup && A.super) notes.push("슈퍼호스트 배지를 잃었다(별점 4.8·후기 10개)");
  A.super = !!sup; A.superM = A.super ? (A.superM || 0) + 1 : 0; // 엔딩용: 슈퍼호스트 연속 달
  A.hist.push(Math.round(total)); if (A.hist.length > 24) A.hist.shift();
  return total;
}
// ───────── 가격 전쟁 ─────────
function warMonth(s, r, notes, scenes) {
  const A = s.ab, W = D.PRICE_K.war;
  for (const rk of [...new Set(A.units.map((u) => u.rk))]) {
    const w = A.war[rk], mine = A.units.filter((u) => u.rk === rk);
    if (w && s.t >= w.until) { A.war[rk] = null; for (const u of mine) if (u.warBase) { u.adr = u.warBase; u.warBase = null; } notes.push(`${D.AB_REGIONS[rk].n} 가격 전쟁이 끝났다. 따라 내린 1박 가격은 원래대로`); }
    else if (!w && s.t - (A.warT ?? -99) >= W.gap && mine.some((u) => u.months >= 3) && r.chance(W.p * (isPeakAb(rk, s.cal) ? 0.5 : 1.3))) {
      const cut = r.range(W.cut[0], W.cut[1]), who = r.int(0, 3); A.war[rk] = { until: s.t + r.int(W.len[0], W.len[1]), cut, who }; A.warT = s.t;
      const cl = compTable(s, mine[0]); s._abWar = { rk };
      scenes.push(RVW.warScene({ job: "ab", where: D.AB_REGIONS[rk].n, who: cl.find((x) => x.cut)?.n || cl[0].n, cut, list: mine.map((u) => ({ id: u.id, name: u.name, price: u.adr })) }));
      return;
    }
  }
}
// ───────── 법 개정 · 명의 팀 · 용돈 (defs AB_NAME) ─────────
const KN = () => D.AB_NAME.kinds;
const lawNeed = (s) => Math.max(0, s.ab.units.length - legalSlots(s)); // 지금 숙소를 다 합법으로 하려면 더 필요한 명의
const holderName = (h) => (CHAR[h.id] ? CHAR[h.id].name : "") + (h.kind === "mateParent" ? "의 부모님" : "") || KN()[h.kind].n;
export const nameLabel = (h) => (h.kind === "parents" ? h.label || "부모님 주소" : h.kind === "broker" ? "명의 브로커" : h.kind === "spouse" ? `배우자${CHAR[h.id] ? " " + CHAR[h.id].name : ""}` : holderName(h));
export function feeOf(s, h) { return Math.round(KN()[h.kind].fee * (h.mult || 1) * SYN.pi(s)); }
export const feeTotal = (s) => (s.ab.names || []).reduce((a, h) => a + feeOf(s, h), 0);
// 부탁할 수 있는 사람: 배우자 → 호감 높은 동료·친구(최근 3달 안에 거절한 사람 빼고) → 없으면 명의 브로커
export function askCands(s) {
  const A = s.ab, used = new Set((A.names || []).map((h) => h.id)), cool = A.askCool || {}, out = [];
  const sp = s.fam?.spouse; if (sp && !used.has(sp) && !(s.t < (cool[sp] ?? -99))) out.push({ id: sp, kind: "spouse", aff: s.rel[sp]?.aff ?? 80 });
  for (const [id, x] of Object.entries(s.rel || {})) { if (!CHAR[id] || id === sp || used.has(id) || x.aff < 10 || s.t < (cool[id] ?? -99)) continue; out.push({ id, kind: CHAR[id].co ? "mate" : "friend", aff: x.aff }); }
  out.sort((a, b) => (b.kind === "spouse") - (a.kind === "spouse") || b.aff - a.aff);
  const L = out.slice(0, 5); if (!L.length && !used.has("broker")) L.push({ id: "broker", kind: "broker", aff: 0 });
  return L;
}
export const askP = (s, c, plus) => (c.kind === "broker" ? 1 : c.kind === "spouse" ? 0.85 : clamp(D.AB_NAME.ask.base + c.aff * D.AB_NAME.ask.aff + (s.st.talk || 0) * D.AB_NAME.ask.talk + (plus ? D.AB_NAME.ask.plus : 0), 0.05, 0.92));
function askTry(s, r, c, plus) {
  const A = s.ab, K = D.AB_NAME; if (!c) return { lines: ["부탁할 사람이 없어요"], msg: "" };
  const nm = CHAR[c.id]?.name || KN()[c.kind].n;
  if (r.chance(askP(s, c, plus))) {
    let kind = c.kind; if (kind === "mate" && r.chance(K.ask.mateParent)) kind = "mateParent";
    const h = { id: c.id, kind, t0: s.t, mult: plus ? K.ask.plusFee : 1, owed: 0, debt: 0 }; A.names.push(h);
    if (CHAR[c.id]) addAff(s, c.id, kind === "spouse" ? 0 : -2);
    log(s, `${nameLabel(h)} 명의를 빌렸다(월 용돈 ${won(feeOf(s, h))})`, "work");
    return { ok: true, lines: [`명의 확보: ${nameLabel(h)}`, `매달 용돈 ${won(feeOf(s, h))}`, `명의 ${legalSlots(s)}개(나 포함)`], msg: kind === "mateParent" ? `"우리 엄마 시골집 주소 써. 대신 엄마 용돈은 네가 챙겨." ${jo(nm, "이", "가")} 웃었다.` : kind === "spouse" ? "\"우리 집 일인데 뭘.\" 배우자가 도장을 꺼냈다." : kind === "broker" ? "\"주소지는 책임지고 맞춰 드립니다. 대신 매달 정산은 칼같이.\" 찜찜하다." : `"너니까 해 주는 거다." ${jo(nm, "이", "가")} 신분증 사본을 보냈다.` };
  }
  A.askCool = A.askCool || {}; A.askCool[c.id] = s.t + K.ask.cool; if (CHAR[c.id]) addAff(s, c.id, K.ask.failAff);
  return { ok: false, lines: [`${nm}: 거절`, CHAR[c.id] ? `호감 ${K.ask.failAff}` : ""].filter(Boolean), msg: r.pick([`"그거 걸리면 나도 과태료잖아." ${jo(nm, "이", "가")} 고개를 저었다.`, `"청약 넣어야 해서 주소 못 옮겨." ${jo(nm, "이", "가")} 미안해했다.`, `"우리 엄마가 절대 안 된대." ${nm}의 답장이 짧다.`]) };
}
function lawMonth(s, r, notes, scenes, n0 = 0) {
  const A = s.ab, K = D.AB_NAME;
  // 1) 경고: 첫 숙소 연 지 21~27달
  if (!A.law && A.t0 != null && A.units.length) { A.law = { at: A.t0 + r.int(K.at[0], K.at[1]), phase: 0 }; }
  const L = A.law;
  if (L && L.phase === 0 && s.t >= L.at && A.units.length) {
    L.phase = 1; L.warnT = s.t; L.deadline = s.t + K.grace;
    const n = A.units.length, parOk = (s.fam?.parents || 0) > 0 && n <= K.parentsMax && n >= 2, opts = [];
    if (n >= 2) opts.push({ k: "team", t: `동료를 모은다: 유예 ${K.grace}달 안에 명의 ${n - 1}개 (설득 퀘스트)` });
    else opts.push({ k: "me", t: "내 명의로 1채 등록한다" });
    if (parOk) opts.push({ k: "parents", t: `부모님 주소를 쓴다 (빠름, 부모님 두 분 = 명의 ${Math.min(2, n - 1)}개, 가족 위험)` });
    if (n >= 2) opts.push({ k: "shrink", t: "줄인다: 제일 잘되는 1채만 남기고 정리" });
    opts.push({ k: "hold", t: "버틴다: 미등록 그대로 (법 시행 뒤 단속 ×" + K.holdRaid + ")" });
    s._abLaw = { opts: opts.map((o) => o.k) };
    scenes.push({ kind: "event", tag: "에어씨앤씨", title: "법이 바뀐다", onChoose: "ab_law", text: `뉴스 속보. "${K.grace}개월 뒤부터 공유숙박은 합법 등록만 가능, 한 사람당 1채." 호스트 단톡방이 난리다. 내 숙소는 ${n}채. ${n >= 2 ? `내 명의로는 1채만 된다. 나머지 ${n - 1}채는 남의 명의가 필요하다. 명의를 빌리면 매달 용돈(사례비)을 줘야 한다.` : "1채라 내 명의로 등록하면 된다."}`, choices: opts.map((o) => ({ t: o.t, eff: {}, text: "" })) });
    return;
  }
  // 2) 유예 기간: 동료 모으기 퀘스트는 달마다 한 명씩 부탁 장면
  // 유예 기간엔 달마다, 법 시행 뒤 명의가 모자라면(회수·적발) 석 달마다 다시 부탁 장면
  const askNow = L && ((L.phase === 1 && L.path === "team" && s.t < L.deadline) || (L.phase === 2 && ["team", "parents", "me"].includes(L.path) && (s.t - L.deadline) % 3 === 0));
  if (L && L.phase >= 1) {
    if (askNow && lawNeed(s) > 0 && scenes.length === n0) {
      const c = askCands(s)[0];
      if (c) { s._abAsk = { id: c.id, kind: c.kind, aff: c.aff }; const nm = CHAR[c.id]?.name || KN()[c.kind].n, p = Math.round(askP(s, c, false) * 100), p2 = Math.round(askP(s, c, true) * 100), fee = Math.round(KN()[c.kind === "mate" ? "mate" : c.kind].fee * SYN.pi(s));
        scenes.push({ kind: "event", tag: "에어씨앤씨", title: `명의 모으기 ${legalSlots(s)}/${A.units.length}`, onChoose: "ab_ask", who: CHAR[c.id] ? c.id : undefined, text: `${L.phase === 1 ? `법 시행까지 ${L.deadline - s.t}달.` : `합법 ${legalCount(s)}채 · 명의 ${legalSlots(s)}개. 미등록 숙소는 단속 ×${K.holdRaid}.`} ${c.kind === "broker" ? "아는 사람이 없다. 부동산 사장님이 '명의 브로커' 번호를 줬다." : `${nm}에게 숙소 명의를 부탁해 볼까? (호감 ${Math.round(c.aff)})`} 빌리면 매달 용돈 약 ${won(fee)}.`, choices: [{ t: `부탁한다 (성공 ${p}%)`, eff: {}, text: "" }, { t: `용돈을 얹어 부탁한다 (${p2}%, 용돈 ×${K.ask.plusFee})`, eff: {}, text: "" }, { t: "이번 달은 넘긴다", eff: {}, text: "말을 꺼내지 못했다." }] }); }
    }
    if (L.phase === 1 && s.t >= L.deadline) enforce(s, notes);
  }
  if (lawOn(s)) while (legalCount(s) > legalSlots(s)) { const u = A.units.filter((x) => x.reg === "legal").sort((a, b) => avg(a) - avg(b))[0]; u.reg = "illegal"; notes.push(`${u.name}: 명의가 모자라 합법 등록이 취소됐다(명의 ${legalSlots(s)}개)`); }
  // 3) 용돈·인상·협상·회수·실거주 점검
  feeMonth(s, r, notes, scenes, n0);
}
function enforce(s, notes) {
  const A = s.ab, L = A.law; L.phase = 2;
  let slots = legalSlots(s); const order = [...A.units].sort((a, b) => avg(b) - avg(a)); let nl = 0, ni = 0;
  for (const u of order) { if (slots > 0 && u.house) { u.reg = "legal"; slots--; nl++; } else { u.reg = "illegal"; ni++; } }
  notes.push(`공유숙박 새 법 시행: 합법 ${nl}채${ni ? ` · 미등록 ${ni}채(단속 ×${D.AB_NAME.holdRaid})` : ""}`);
  log(s, `공유숙박 새 법 시행. 명의 ${legalSlots(s)}개로 합법 ${nl}채.`, "work");
}
const avg = (u) => (u.hist.length ? u.hist.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, u.hist.length) : 0);
// 명의 하나를 잃으면: 합법 숙소가 명의 수보다 많아지면 제일 덜 버는 곳이 미등록으로
function dropName(s, h, why) {
  const A = s.ab; A.names = A.names.filter((x) => x !== h); const out = [`${nameLabel(h)} 명의 회수(${why})`]; log(s, `${nameLabel(h)} 명의 회수(${why})`, "work");
  if (lawOn(s) && legalCount(s) > legalSlots(s)) { const u = A.units.filter((x) => x.reg === "legal").sort((a, b) => avg(a) - avg(b))[0]; if (u) { u.reg = "illegal"; out.push(`${u.name}: 미등록으로 바뀜(단속 위험)`); } }
  return out;
}
export function payFees(s) {
  const A = s.ab; let paid = 0;
  for (const h of A.names) { if (h.debt > 0 && s.cash >= h.debt) { s.cash -= h.debt; addMoney(s, "exp", "명의 용돈", h.debt); paid += h.debt; h.debt = 0; h.owed = 0; } }
  return { ok: paid > 0, msg: paid ? `밀린 용돈 ${won(paid)}을 보냈어요` : "밀린 용돈이 없어요(또는 현금이 모자라요)" };
}
export function setFeeAuto(s, v) { s.ab.feeAuto = !!v; return { ok: true, msg: v ? "명의 용돈 매달 자동 지급" : "자동 지급 끔: 보드에서 직접 보내야 해요(안 보내면 밀림)" }; }
function feeMonth(s, r, notes, scenes, n0 = 0) {
  const A = s.ab, K = D.AB_NAME; if (!A.names.length) return;
  for (const h of [...A.names]) {
    const k = KN()[h.kind];
    // 해마다 인상(남의 명의만)
    if (k.raise && s.t > h.t0 && (s.t - h.t0) % 12 === 0) { h.mult = (h.mult || 1) * (1 + k.raise); notes.push(`${nameLabel(h)}: "물가가 올랐잖아." 명의 용돈 +${Math.round(k.raise * 100)}% (월 ${won(feeOf(s, h))})`); }
    const fee = feeOf(s, h);
    if (A.feeAuto && s.cash >= fee + h.debt) { const v = fee + h.debt; s.cash -= v; addMoney(s, "exp", "명의 용돈", v); h.debt = 0; h.owed = 0; }
    else { h.debt += fee; h.owed++; if (CHAR[h.id] && k.lateAff) addAff(s, h.id, k.lateAff); if (h.kind === "parents" && h.owed >= 3 && h.owed % 3 === 0) applyEff(s, { family: -2 }); notes.push(`${nameLabel(h)} 용돈 ${h.owed}달 밀림(${won(h.debt)})${CHAR[h.id] && k.lateAff ? ` · 호감 ${k.lateAff}` : ""}`); }
  }
  if (scenes.length > n0) return;
  // 밀림 → 회수 요구 / 남의 명의는 가끔 '더 달라' / 갑자기 빼 달라 / 실거주 점검
  for (const h of A.names) {
    const k = KN()[h.kind];
    if (h.owed >= k.recallLate) { scenes.push(recallScene(s, h, "late")); return; }
    if (k.haggle && r.chance(k.haggle)) { scenes.push(haggleScene(s, r, h)); return; }
    if (r.chance(k.recallP)) { scenes.push(recallScene(s, h, "sudden")); return; }
    if (lawOn(s) && r.chance(k.inspect)) { scenes.push(inspScene(s, r, h)); return; }
  }
}
// 명의자 붙잡기 확률: 말빨·호감, 부모님은 거의 붙잡힌다
export const keepP = (s, h, why) => (h.kind === "parents" ? 0.95 : clamp(0.5 + ((s.st.talk || 0) - (why === "late" ? 55 : 50)) / 40 + (s.rel?.[h.id]?.aff ?? 30) / 300 - 0.1, 0.1, 0.9));
function recallScene(s, h, why) {
  s._abName = { id: h.id, kind: h.kind, why };
  const nm = nameLabel(h), parOk = (s.fam?.parents || 0) > 0 && !s.ab.names.some((x) => x.kind === "parents") && s.ab.units.length <= D.AB_NAME.parentsMax;
  const reason = why === "late" ? `용돈이 ${h.owed}달째 밀렸다(${won(h.debt)}). "이럴 거면 명의 빼 줘."` : ["\"나 청약 넣어야 해서 주소 옮겨야 돼.\"", "\"회사에서 겸직 조사한대. 미안한데 빼 줘.\"", "\"결혼하는데 배우자가 이거 알면 난리 나.\"", "\"세금 고지서가 우리 집으로 왔어. 무서워.\""][s.t % 4];
  return { kind: "event", tag: "에어씨앤씨", title: "명의 빼 달라", onChoose: "ab_recall", who: CHAR[h.id] ? h.id : undefined, text: `${nm}에게서 전화가 왔다. ${reason}`, choices: [
    { t: why === "late" ? `밀린 돈 다 주고 사정한다 (${won(h.debt)}, 붙잡을 확률 ${Math.round(keepP(s, h, why) * 100)}%)` : `용돈을 30% 올려 붙잡는다 (${Math.round(keepP(s, h, why) * 100)}%)`, eff: {}, text: "" },
    { t: "명의를 돌려준다", eff: {}, text: "고마웠다고 말했다. 한 채가 다시 불안해졌다." },
    ...(parOk ? [{ t: "부모님 주소로 바꾼다", eff: {}, text: "엄마에게 전화했다. \"그래, 우리 주소 써라.\"" }] : []),
  ] };
}
function haggleScene(s, r, h) {
  const up = r.range(D.AB_NAME.haggleUp[0], D.AB_NAME.haggleUp[1]); s._abName = { id: h.id, kind: h.kind, up };
  return { kind: "event", tag: "에어씨앤씨", title: "\"용돈 좀 더 줘\"", onChoose: "ab_haggle", who: CHAR[h.id] ? h.id : undefined, text: `${nameLabel(h)}: "너 숙소 잘된다며? 내 명의로 버는 건데, 용돈 ${Math.round(up * 100)}%만 올려 줘." 지금 월 ${won(feeOf(s, h))}.`, choices: [
    { t: `올려 준다 (월 ${won(Math.round(feeOf(s, h) * (1 + up)))})`, eff: {}, text: "\"역시 의리!\"" },
    { t: "반만 올리자고 설득한다 (말빨 판정)", check: { stat: "talk", dc: 52 }, ok: { text: "\"그래, 그 정도면 됐다.\"", eff: {} }, ng: { text: "\"너 그렇게 안 봤는데.\" 분위기가 싸해졌다.", eff: {} } },
    { t: "거절한다", eff: {}, text: "\"알았어.\" 답장이 차갑다." },
  ] };
}
function inspScene(s, r, h) {
  const fine = Math.round(r.int(D.AB_NAME.insp.fine[0], D.AB_NAME.insp.fine[1]) * SYN.pi(s)); s._abName = { id: h.id, kind: h.kind, fine };
  return { kind: "event", tag: "에어씨앤씨", title: "실거주 점검", onChoose: "ab_insp", who: CHAR[h.id] ? h.id : undefined, text: `구청에서 '${nameLabel(h)}' 명의 숙소에 실거주 확인 전화가 왔다. "등록하신 분이 실제로 사시는 게 맞나요? 내일 방문하겠습니다." 명의 대여가 걸리면 과태료 ${won(fine)}에 영업정지, 명의자도 곤란해진다.`, choices: [
    { t: "명의자에게 급히 연락해 맞춰 둔다 (말빨 판정)", check: { stat: "talk", dc: 55 }, ok: { text: "명의자가 그날 숙소에 와서 차를 마셨다. 무사히 넘어갔다.", eff: {} }, ng: { text: "말이 엇갈렸다. 담당자가 수첩에 뭔가를 적었다.", eff: {} } },
    { t: "인정하고 그 숙소를 미등록으로 돌린다", eff: {}, text: "솔직하게 말했다. 과태료는 절반으로 줄었다." },
  ] };
}

function story(title, text) { return { kind: "story", title, text, choices: [{ t: "계속", eff: {}, text: "" }] }; }
export function raidChoose(s, i, ok) {
  const o = s._abRaid; s._abRaid = null; if (!o) return [];
  const u = s.ab.units.find((x) => x.id === o.id); if (!u) return [];
  let fine = o.fine, ban = 3;
  const canReg = u.house && (!lawOn(s) || legalCount(s) < legalSlots(s));
  if (i === 0 && ok) { fine = 0; ban = 0; }
  else if (i === 1) { if (canReg) { fine = Math.round(fine / 2); ban = 1; u.reg = "legal"; } else { fine = Math.round(fine * 0.7); ban = 2; } }
  if (fine) { s.cash -= fine; addMoney(s, "exp", "미등록 숙박 과태료", fine); }
  u.banned = ban;
  return [fine ? `과태료 −${won(fine)}` : "과태료 없음", ban ? `${ban}개월 영업정지` : "영업 계속", ...(i === 1 && canReg ? ["합법 등록 완료"] : [])];
}
// ───────── v4.29 에어씨앤씨 특이 요소: 체크아웃→체크인 3시간 레이스 · 한 달 살기 vs 단기 · 관리사무소와 이웃 ─────────
// 효과 크기는 여기 모아 둔다
export const AB_F30 = {
  clean: { // per: 숙박 1건 청소비(만) · ap: 관리 행동력(거리 몫에 더함) · punk: 숙박 1건마다 대행 펑크 확률 · fix: 청소팀 월 고정비(3채마다)
    self: { n: "내가 한다", per: 1.2, desc: "청소비는 싸지만 손님이 바뀔 때마다 행동력이 들어요" },
    gig: { n: "건당 대행", per: 2.8, ap: 0.5, punk: 0.02, desc: "행동력은 거의 안 들지만 가끔 펑크가 나요" },
    team: { n: "청소팀 직접", per: 0.8, ap: 0.25, fix: 60, per3: 3, quit: 0.04, desc: "월 고정비가 들지만 펑크가 없고 분리수거까지 해 줘요" },
  },
  long: { price: 0.6, occ: 0.93, len: 28, raid: 0.5, opts: [0, 0.3, 0.6] }, // 한 달 살기: 1박 60% 값, 93% 채움, 28박에 1팀, 단속 위험 절반
  nb: { base: 62, perStay: 1.5, team: 5, drift: 0.1, low: 35, evP: 0.15, gap: 3, gift: 5, giftUp: 8 }, // 이웃 인심: 단기 손님 1팀마다 기준 −1.5, 낮으면 관리사무소 호출
  raceFee: 9,
};
// 이웃 인심: 이야기 보강(story/airbnb.js)의 nb 를 같이 쓴다(없으면 s.ab.nb)
const nbBox = (s) => s.sx?.airbnb || s.ab;
export const nbGet = (s) => Math.round(nbBox(s).nb ?? 50);
export function nbAdd(s, v) { const b = nbBox(s); b.nb = clamp((b.nb ?? 50) + v, 0, 100); return Math.round(b.nb); }
export const nbF = (s) => clamp(1.6 - nbGet(s) / 83, 0.6, 1.6); // 인심 50 = 단속 ×1, 0 = ×1.6, 100 = ×0.6
export const teamFee = (s) => Math.round(AB_F30.clean.team.fix * Math.ceil(Math.max(1, s.ab.units.length) / AB_F30.clean.team.per3) * SYN.pi(s));
export function setClean(s, m) { if (!AB_F30.clean[m]) return { ok: false }; s.ab.clean = m; s.ab.cleanAsk = s.ab.cleanAsk ?? s.t; return { ok: true, msg: `청소: ${AB_F30.clean[m].n}${m === "team" ? ` (월 ${won(teamFee(s))})` : ""}` }; }
export function setLong(s, id, v) { const u = s.ab.units.find((x) => x.id === id); if (!u || !AB_F30.long.opts.includes(v)) return { ok: false }; u.longR = v; return { ok: true, msg: `${u.name}: ${v ? `한 달 살기 ${Math.round(v * 100)}%` : "단기만"}` }; }
export function gift(s) {
  const A = s.ab; if (A.giftT === s.t) return { ok: false, msg: "이번 달은 이미 다녀왔어요" };
  const c = Math.round(AB_F30.nb.gift * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "에어씨앤씨 비용", c); A.giftT = s.t;
  return { ok: true, msg: `관리실에 음료 한 상자 (${won(c)}) · 이웃 인심 ${nbAdd(s, AB_F30.nb.giftUp)}` };
}
function f30Month(s, r, notes, scenes, n0, shortSum) {
  const A = s.ab, K = AB_F30, n = A.units.length; let tot = 0; if (!n) return 0;
  if (A.clean === "team" && !A.cohost) { const c = teamFee(s); s.cash -= c; addMoney(s, "exp", "청소팀 월급", c); tot -= c; if (r.chance(K.clean.team.quit)) { const c2 = Math.round(10 * SYN.pi(s)); s.cash -= c2; addMoney(s, "exp", "청소팀 월급", c2); tot -= c2; notes.push(`청소팀 한 명이 그만뒀다. 새로 구하느라 −${won(c2)}`); } }
  // 이웃 인심: 단기 손님이 많을수록(캐리어·분리수거) 기준이 내려가고 천천히 따라간다
  const tgt = K.nb.base - (shortSum / n) * K.nb.perStay + (A.clean === "team" && !A.cohost ? K.nb.team : 0);
  nbAdd(s, (tgt - nbGet(s)) * K.nb.drift);
  if (scenes.length > n0) return tot;
  if (nbGet(s) < K.nb.low && s.t - (A.nbT ?? -99) >= K.nb.gap && r.chance(K.nb.evP)) { A.nbT = s.t; scenes.push(nbScene(s)); return tot; }
  if (!A.cleanAsk && !A.cohost && A.units.some((u) => u.months >= 2)) { A.cleanAsk = s.t; scenes.push(cleanAskScene(s)); return tot; }
  const lu = A.units.find((u) => u.months >= 4 && !u.longR && seasonKind(u.rk, s.cal) === "off");
  if (!A.longAsk && lu) { A.longAsk = s.t; scenes.push(longScene(s, lu)); }
  return tot;
}
function cleanAskScene(s) {
  const C = AB_F30.clean;
  return { kind: "event", tag: "에어씨앤씨", title: "청소는 누가 하지", onChoose: "ab_cleanask",
    text: `체크아웃 11시, 체크인 3시. 그 사이 4시간에 침구를 갈고 머리카락을 줍고 분리수거까지 끝내야 한다. 이번 달도 점심시간에 회사를 빠져나왔다. 청소를 어떻게 할까?`,
    choices: [
      { t: "지금처럼 내가 한다 (청소비 싸고, 행동력 듬)", eff: {}, text: "고무장갑을 가방에 넣고 다니기로 했다." },
      { t: `건당 대행에 맡긴다 (1건 ${C.gig.per}만, 가끔 펑크)`, eff: {}, text: "청소 대행 앱에 숙소를 등록했다. 별점 4.9 이모님이 잡혔다." },
      { t: `청소팀을 직접 꾸린다 (월 ${won(teamFee(s))} 고정, 펑크 없음)`, eff: {}, text: "동네 주부 두 분과 계약했다. 분리수거 요일표가 단톡방에 올라왔다." },
    ] };
}
function raceScene(s, u) {
  const fee = Math.round(AB_F30.raceFee * SYN.pi(s)), disc = Math.max(3, Math.round(u.adr * 0.4));
  return { kind: "event", tag: "에어씨앤씨", title: "체크인까지 3시간", onChoose: "ab_race", f30: { id: u.id, fee, disc },
    text: `낮 12시, 청소 대행 문자. "죄송해요, 오늘 못 가요." ${u.name} 다음 손님은 3시 체크인, 비행기는 이미 착륙했다. 나는 회사 책상 앞이다.`,
    choices: [
      { t: `긴급 청소를 웃돈 주고 부른다 (${won(fee)})`, eff: {}, text: "두 배 값에 다른 업체가 잡혔다. 2시 50분, 침대 위 수건 백조가 완성됐다." },
      { t: "점심시간에 회사를 빠져나와 직접 한다 (스태미너 −8, 회사 눈치)", eff: {}, text: "택시 안에서 김밥을 먹었다. 오후 회의에 땀에 젖은 셔츠로 들어갔다." },
      { t: `체크인을 2시간 늦추고 할인해 준다 (${won(disc)})`, eff: {}, text: "\"No problem…\" 손님 답장에 점이 세 개다." },
    ] };
}
function longScene(s, u) {
  const 엘쥐 = AB_F30.long;
  return { kind: "event", tag: "에어씨앤씨", title: "한 달 살기 문의", onChoose: "ab_long", f30: { id: u.id },
    text: `비수기, ${u.name} 달력이 비어 간다. "한 달 살기 되나요? 재택하는 프리랜서예요." 장기 손님은 1박 값이 ${Math.round(엘쥐.price * 100)}%쯤이지만 달력이 꾸준히 차고, 청소·후기·이웃 민원이 줄어요. 단기는 비싸게 받지만 손님이 자주 바뀌어요.`,
    choices: [
      { t: "단기만 받는다 (지금대로)", eff: {}, text: "정중히 거절했다. 주말 손님을 기다린다." },
      { t: "30%는 한 달 살기로 채운다", eff: {}, text: "프리랜서 손님이 들어왔다. 조용하고, 분리수거를 나보다 잘한다." },
      { t: "60%는 한 달 살기로 돌린다", eff: {}, text: "달력 절반이 장기 손님으로 찼다. 이제 매달 걱정이 줄었다. 버는 것도 조금 줄었다." },
    ] };
}
function nbScene(s) {
  const fee = Math.round(AB_F30.nb.gift * SYN.pi(s)), ill = s.ab.units.some((u) => u.reg === "illegal");
  return { kind: "event", tag: "에어씨앤씨", title: "관리사무소 호출", onChoose: "ab_nb",
    text: `관리소장님 전화. "엘리베이터 바닥에 캐리어 자국, 분리수거장엔 영어 영수증 붙은 쓰레기봉투. 주민들이 다 알아요." 이웃 인심 ${nbGet(s)}.${ill ? " 미등록 숙소는 이웃 신고 한 통이면 단속이다." : ""}`,
    choices: [
      { t: `음료 돌리고 분리수거 규칙을 게스트 안내에 넣는다 (${won(fee)})`, eff: {}, text: "\"이렇게 와 주니 고맙네.\" 소장님이 음료를 경비실 냉장고에 넣었다." },
      { t: "주말마다 내가 분리수거를 맡는다 (스태미너 −6, 인심 크게 +)", eff: {}, text: "일요일 아침 7시, 재활용장에서 경비 아저씨와 친해졌다." },
      { t: "모른 척한다", eff: {}, text: "전화를 끊었다. 엘리베이터에서 마주친 주민이 눈을 피했다." },
    ] };
}
export function f30Scene(s, r, what) { // 시험용
  const u = s.ab.units[0]; if (!u) return null;
  return what === "clean" ? cleanAskScene(s) : what === "race" ? raceScene(s, u) : what === "long" ? longScene(s, u) : nbScene(s);
}
const abUnit = (s, sc) => s.ab.units.find((x) => x.id === sc?.f30?.id);
const F30_CHOOSE = {
  ab_cleanask(s, r, i) { const m = ["self", "gig", "team"][i] || "self"; const out = [setClean(s, m).msg]; if (m !== "self") out.push(`관리 행동력 숙소당 약 ${needAp(s, s.ab.units[0])}`); out.push("보드 '청소·손님·이웃'에서 바꿀 수 있어요"); return out; },
  ab_race(s, r, i, ok, sc) {
    const u = abUnit(s, sc), o = sc?.f30; if (!u || !o) return [];
    if (i === 0) { s.cash -= o.fee; addMoney(s, "exp", "에어씨앤씨 비용", o.fee); return [`긴급 청소 −${won(o.fee)}`]; }
    if (i === 1) { const eff = { hp: -8 }; if (!s.co.quit && !s.co.fired) eff.eye = 4; return [...applyEff(s, eff), `${u.name} 체크인 성공`]; }
    s.cash -= o.disc; addMoney(s, "exp", "에어씨앤씨 비용", o.disc); u.rating = clamp(u.rating - 0.05, 3.4, 4.99); return [`할인 −${won(o.disc)}`, `${u.name} 별점 −0.05`];
  },
  ab_long(s, r, i, ok, sc) { const u = abUnit(s, sc); if (!u) return []; const v = AB_F30.long.opts[i] || 0; return [setLong(s, u.id, v).msg, ...(v ? ["단속 위험·청소·민원이 줄고 1박 값이 내려가요"] : [])]; },
  ab_nb(s, r, i) {
    if (i === 0) { const c = Math.round(AB_F30.nb.gift * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "에어씨앤씨 비용", c); return [`−${won(c)}`, `이웃 인심 ${nbAdd(s, 12)}`]; }
    if (i === 1) { return [...applyEff(s, { hp: -6 }), `이웃 인심 ${nbAdd(s, 18)}`]; }
    return [`이웃 인심 ${nbAdd(s, -10)}`, ...(s.ab.units.some((u) => u.reg === "illegal") ? ["미등록 숙소 단속 위험 ↑"] : [])];
  },
};

// v4.28 장면 선택(core.js 가 SCENE_FN 에 붙인다). 봇 기본 선택: 모두 0번이 무난
export const AB_CHOOSE = {
  ab_trap(s, r, i, ok, sc) { // 11-24 숨은 함정
    const A = s.ab, u = A.units.find((x) => x.id === sc.abU); if (!u) return [];
    if (i === 0) { const back = Math.round(u.dep * (1 - AB_ENTRY.quitLoss)); s.cash += back; addMoney(s, "inc", "보증금 회수", back); A.units = A.units.filter((x) => x !== u); log(s, `${u.name}: ${AB_TRAPS[u.trap].n}. 계약을 깨고 나왔다.`, "work"); return [`보증금 ${won(back)} 회수`, `세팅비·보증금 ${won(u.invested - back)} 손실`]; }
    if (i === 1) { u.reg = "illegal"; delete u.regT; log(s, `${u.name}: 등록이 막혀 미등록으로 열었다.`, "work"); return ["미등록으로 영업 시작", "노출이 줄고 단속 위험이 있어요"]; }
    const m = r.int(AB_ENTRY.waitMo[0], AB_ENTRY.waitMo[1]); u.regT = s.t + m; if (u.trap === "crowd") nbAdd(s, -10); return [`${m}개월쯤 걸려요`, "그동안 월세만 나가요", ...(u.trap === "crowd" ? ["이웃 인심 −10"] : [])];
  },
  ...F30_CHOOSE,
  ab_rv(s, r, i, ok) { return RVW.reviewChoose(s, r, i, ok, s.ab.units); },
  ab_war(s, r, i) {
    const o = s._abWar; s._abWar = null; if (!o) return []; const L = s.ab.units.filter((u) => u.rk === o.rk), W = D.PRICE_K.war;
    if (i === 0) { for (const u of L) { u.warBase = u.warBase || u.adr; u.adr = Math.max(3, Math.round(u.adr * (1 - W.follow))); } return [`${L.length}채 1박 −${Math.round(W.follow * 100)}% (전쟁 끝나면 원래대로)`]; }
    if (i === 2) { for (const u of L) u.adr = Math.round(u.adr * (1 + W.premium)); return [`${L.length}채 1박 +${Math.round(W.premium * 100)}%`]; }
    return ["가격 그대로: 전쟁 동안 예약이 조금 준다"];
  },
  ab_law(s, r, i) {
    const A = s.ab, K = D.AB_NAME, k = s._abLaw?.opts?.[i]; s._abLaw = null; if (!A.law) return [];
    A.law.path = k || "hold";
    if (k === "me" || k === "team") { const u = A.units.find((x) => x.house); if (k === "me" && u) { u.reg = "legal"; return [`${u.name} 내 명의로 합법 등록`]; } return [`명의 모으기 시작: ${legalSlots(s)}/${A.units.length} (유예 ${A.law.deadline - s.t}달)`, "달마다 한 명씩 부탁 장면이 와요. 보드에서 직접 부탁할 수도 있어요"]; }
    if (k === "parents") { const n = Math.min(2, A.units.length - 1); for (let j = 0; j < n; j++) A.names.push({ id: "parents" + j, kind: "parents", label: j ? "어머니 주소" : "아버지 주소", t0: s.t, mult: 1, owed: 0, debt: 0 }); log(s, "부모님 주소로 숙소 명의를 맞췄다.", "work"); return [`부모님 주소 명의 ${n}개`, `매달 용돈 ${won(feeTotal(s))}`, "실거주 점검에 걸리면 가족이 곤란해져요"]; }
    if (k === "shrink") { const keep = [...A.units].sort((a, b) => avg(b) - avg(a))[0]; const out = []; for (const u of [...A.units]) if (u !== keep) out.push(close(s, u.id).msg); if (keep.house) keep.reg = "legal"; A.law.phase = 2; return [...out, `${keep.name} 하나만 남김${keep.house ? "(합법 등록)" : ""}`]; }
    return ["미등록 그대로 버틴다. 법 시행 뒤 단속이 세져요"];
  },
  ab_ask(s, r, i) {
    const o = s._abAsk; s._abAsk = null; if (!o || i === 2) return [];
    const out = askTry(s, r, o, i === 1); if (out.msg) s._sceneText = out.msg; return out.lines;
  },
  ab_recall(s, r, i) {
    const o = s._abName; s._abName = null; if (!o) return []; const A = s.ab, h = A.names.find((x) => x.id === o.id); if (!h) return [];
    const ok = i === 0 && r.chance(keepP(s, h, o.why)); if (i === 0) s._sceneText = ok ? "\"…알았어. 이번만이야.\"" : "\"미안, 이번엔 진짜 안 돼.\"";
    if (i === 0) {
      if (o.why === "late" && s.cash >= h.debt) { s.cash -= h.debt; addMoney(s, "exp", "명의 용돈", h.debt); const d = h.debt; h.debt = 0; h.owed = 0; if (ok) return [`밀린 용돈 −${won(d)}`, "명의 유지"]; return [`밀린 용돈 −${won(d)}`, ...dropName(s, h, "돈은 받고 떠났다")]; }
      if (o.why !== "late" && ok) { h.mult = (h.mult || 1) * 1.3; return [`용돈 +30% (월 ${won(feeOf(s, h))})`, "명의 유지"]; }
      if (CHAR[h.id]) addAff(s, h.id, -5);
      return dropName(s, h, "설득 실패");
    }
    if (i === 2) { const out = dropName(s, h, "부모님 주소로 교체"); A.names.push({ id: "parents0", kind: "parents", label: "부모님 주소", t0: s.t, mult: 1, owed: 0, debt: 0 }); if (lawOn(s)) { const u = A.units.find((x) => x.reg === "illegal" && x.house); if (u && legalCount(s) < legalSlots(s)) { u.reg = "legal"; out.push(`${u.name} 다시 합법`); } } return [...out, "부모님 주소 명의 +1"]; }
    if (CHAR[h.id]) addAff(s, h.id, 3);
    return dropName(s, h, "돌려줌");
  },
  ab_haggle(s, r, i, ok) {
    const o = s._abName; s._abName = null; if (!o) return []; const h = s.ab.names.find((x) => x.id === o.id); if (!h) return [];
    if (i === 0) { h.mult = (h.mult || 1) * (1 + o.up); if (CHAR[h.id]) addAff(s, h.id, 3); return [`용돈 +${Math.round(o.up * 100)}% (월 ${won(feeOf(s, h))})`]; }
    if (i === 1 && ok) { h.mult = (h.mult || 1) * (1 + o.up / 2); return [`용돈 +${Math.round(o.up * 50)}% (월 ${won(feeOf(s, h))})`]; }
    if (CHAR[h.id]) addAff(s, h.id, i === 1 ? -8 : -12); h.owed = Math.max(h.owed, KN()[h.kind].recallLate - 1); // 서운함: 한 번만 더 밀리면 회수 요구
    return [CHAR[h.id] ? `${nameLabel(h)} 호감 ${i === 1 ? -8 : -12}` : "", "명의 회수 위험 ↑(한 번만 밀려도 빼 달라고 해요)"].filter(Boolean);
  },
  ab_insp(s, r, i, ok) {
    const o = s._abName; s._abName = null; if (!o) return []; const A = s.ab, h = A.names.find((x) => x.id === o.id); if (!h) return []; const K = D.AB_NAME.insp, k = KN()[h.kind];
    if (i === 0 && ok) return ["실거주 점검 통과"];
    const fine = i === 1 ? Math.round(o.fine / 2) : o.fine; s.cash -= fine; addMoney(s, "exp", "미등록 숙박 과태료", fine);
    const out = [`명의 대여 적발: 과태료 −${won(fine)}`];
    const u = A.units.filter((x) => x.reg === "legal").sort((a, b) => avg(a) - avg(b))[0];
    if (u && i === 0) { u.banned = K.ban; out.push(`${u.name} ${K.ban}개월 영업정지`); }
    if (CHAR[h.id]) { addAff(s, h.id, K.aff); out.push(`${nameLabel(h)} 호감 ${K.aff}`); }
    if (k.fam || h.kind === "parents") out.push(...applyEff(s, { family: k.fam || K.fam, mental: -5 }), "부모님과 크게 다퉜다");
    out.push(...dropName(s, h, "적발"));
    return out;
  },
};
function abEvent(s, r, u, dmgOnly) {
  s._abEv = { id: u.id };
  const L = [
    { t: "체크인 대소동", x: `밤 11시, ${u.name} 게스트가 도어락 앞에서 메시지를 보냈다. "The code doesn't work!!" 게스트는 스페인어만 쓴다.`, c: [{ t: "영상통화로 직접 안내한다", check: { stat: "lang", dc: 50 }, ok: { text: "손짓 반, 영어 반. 문이 열렸다. 후기에 'Super kind host' 가 달렸다.", eff: { mental: 2 } }, ng: { text: "결국 택시 타고 달려갔다. 새벽 1시 귀가.", eff: { hp: -12, mental: -5 } } }, { t: "근처 호텔을 잡아 주고 환불", eff: { cash: -Math.round(u.adr * 3), mental: -2 }, text: "돈으로 해결했다. 별점은 지켰다." }] },
    { t: "파티 금지 위반", dmg: 1, x: `${u.name}에서 게스트 8명이 파티를 열었다. 아랫집에서 경찰에 신고했다.`, c: [{ t: "보증금 청구하고 정중히 퇴실 요청", check: { stat: "lang", dc: 45 }, ok: { text: "규정을 차분히 설명했다. 손해 배상을 받아 냈다.", eff: { cash: 20 } }, ng: { text: "\"We didn't do anything!\" 별점 1개 후기가 달렸다.", eff: { mental: -6 } } }, { t: "이웃에게 먼저 사과하러 간다", eff: { mental: -3, cash: -5 }, text: "케이크 하나 들고 내려갔다. 이웃이 조금 누그러졌다." }] },
    { t: "외국어 후기 폭탄", x: `${u.name}에 일본어·중국어 후기가 10개 쌓였다. 다 칭찬인데 답글을 아직 못 달았다.`, c: [{ t: "번역기 없이 직접 답글을 쓴다", check: { stat: "lang", dc: 55 }, ok: { text: "답글이 정성스럽다는 말에 재예약이 들어왔다.", eff: { mental: 3 } }, ng: { text: "번역 투가 어색했지만 마음은 전해졌다.", eff: {} } }, { t: "그냥 둔다", eff: {}, text: "답글 없는 숙소는 노출이 조금 준다." }] },
    { t: "고장 난 보일러", dmg: 1, x: `한겨울, ${u.name} 게스트가 사진을 보냈다. 온도계 12도.`, c: [{ t: "긴급 출장 수리", eff: { cash: -Math.round(15 * SYN.pi(s)) }, text: "한 시간 만에 해결했다." }, { t: "전기장판을 들고 달려간다", eff: { hp: -8, cash: -3 }, text: "게스트가 웃으며 사진을 찍었다." }] },
  ];
  const e = r.pick(dmgOnly ? L.filter((x) => x.dmg) : L);
  return { kind: "event", tag: "에어씨앤씨", title: e.t, text: e.x, choices: e.c };
}
export function value(s) { return s.ab.units.reduce((a, u) => a + u.dep, 0); }
export function passive(s) { if (!s.ab.cohost) return 0; const h = s.ab.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0; }
export function todos(s) {
  const t = [], A = s.ab;
  for (const u of A.units) { const n = needAp(s, u); if (!A.cohost && u.ap < n && !u.banned) t.push({ lv: u.ap < n * 0.6 ? 2 : 1, text: `${u.name} 청소·관리 ${Math.round(u.ap * 10) / 10}/${n}`, go: "airbnb" }); }
  const L = A.law;
  if (L?.phase === 1) t.push({ lv: 2, text: `법 시행까지 ${L.deadline - s.t}달 · 명의 ${legalSlots(s)}/${A.units.length}${L.path === "hold" ? " (버티기)" : ""}`, go: "airbnb" });
  const owed = (A.names || []).filter((h) => h.debt > 0); if (owed.length) t.push({ lv: 2, text: `명의 용돈 밀림 ${owed.length}명 · ${won(owed.reduce((a, h) => a + h.debt, 0))}`, go: "airbnb" });
  return t;
}
