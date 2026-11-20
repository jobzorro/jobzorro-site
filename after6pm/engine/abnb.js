// 에어씨앤씨 보드: 파티룸과 다르게 '1박' 장사. 외국인 손님(외국어), 합법 등록 vs 미등록(단속), 슈퍼호스트, 환율·국제 이슈.
import * as D from "./defs.js";
import { addMoney, log, mod, won, gainStat, applyEff, creditRoom, addLoan, helperPower } from "./core.js";
import * as SYN from "./syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function init() { return { units: [], listings: [], seq: 0, cohost: false, evT: -99, hist: [], fx: 0 }; }

// 매물
export function search(s, r, rk) {
  const R = D.AB_REGIONS[rk], pi = SYN.pi(s);
  const ls = Array.from({ length: 3 }, () => {
    const ty = r.pick(R.types), T = D.AB_TYPES[ty];
    const rent = Math.round(r.range(R.rent[0], R.rent[1]) * T.rentF * pi * (s.era.rentup ? 1.15 : 1) / 5) * 5;
    return { id: "A" + (++s.ab.seq), t: s.t, rk, ty, rent, dep: Math.round(rent * r.range(8, 15) / 100) * 100, setup: Math.round(T.setup * pi), owner: r.chance(0.45), house: R.house && ty !== "officetel" };
  });
  s.ab.listings = s.ab.listings.filter((l) => l.rk !== rk).concat(ls);
  return ls;
}
// 계약: reg = "legal"(등록. 서울 도시민박업은 외국인만) | "illegal"(미등록. 다 받지만 단속·민원)
export function contract(s, id, reg) {
  const A = s.ab, L = A.listings.find((x) => x.id === id); if (!L) return { ok: false, msg: "매물이 없어요" };
  if (reg === "legal" && !L.house) return { ok: false, msg: "오피스텔은 숙박업 등록이 안 돼요(합법으로는 불가)" };
  if (reg === "legal" && !L.owner) return { ok: false, msg: "집주인이 숙박업 등록에 동의하지 않았어요" };
  const regFee = reg === "legal" ? Math.round(80 * SYN.pi(s)) : 0;
  const total = L.dep + L.setup + regFee, lack = total - s.cash;
  if (lack > 0) { if (lack > creditRoom(s) * 0.6 + 2000) return { ok: false, msg: `돈이 ${won(lack)} 모자라요` }; addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; }
  s.cash -= total; addMoney(s, "exp", "에어씨앤씨 오픈", total);
  const n = A.units.length + 1, R = D.AB_REGIONS[L.rk];
  const u = { ...L, id: "U" + (++A.seq), name: `${n}호 ${R.n} ${D.AB_TYPES[L.ty].n}`, reg, adr: Math.round(R.adr * D.AB_TYPES[L.ty].adrF * SYN.pi(s)), rating: 4.5, stays: 0, months: 0, photo: 30 + s.st.sense / 3, ap: 0, last: null, hist: [], invested: total, banned: 0 };
  A.units.push(u); A.listings = A.listings.filter((x) => x !== L);
  log(s, `${u.name} 오픈 (${reg === "legal" ? "합법 등록" : "미등록"}). ${won(total)}`, "work");
  return { ok: true, msg: `${u.name} 오픈! ${reg === "legal" ? (R.city ? "외국인 손님만 받아요" : "누구나 받아요") : "누구나 받지만 단속 위험이 있어요"}`, unit: u };
}
export function close(s, id) { const A = s.ab, u = A.units.find((x) => x.id === id); if (!u) return { ok: false }; s.cash += u.dep; addMoney(s, "inc", "보증금 회수", u.dep); A.units = A.units.filter((x) => x !== u); log(s, `${u.name} 정리`, "work"); return { ok: true, msg: `${u.name} 정리, 보증금 ${won(u.dep)} 회수` }; }
export function setAdr(s, id, v) { const u = s.ab.units.find((x) => x.id === id); if (u) u.adr = clamp(Math.round(v), 3, 80); }

export const needAp = (s, u) => (s.ab.cohost ? 0.25 : Math.max(0.5, Math.round(((u.last?.stays ?? 8) / 4 + D.AB_REGIONS[u.rk].far * 0.5) * 2) / 2));
export function can(s, id, arg) {
  const A = s.ab;
  if (id === "ab_search") return null;
  if (!A.units.length) return "숙소가 없어요";
  if (id === "ab_cohost") return A.units.length < 2 ? "숙소 2채부터" : null;
  return null;
}
export function act(s, r, id, arg, boost = 1) {
  const A = s.ab;
  if (id === "ab_search") { const ls = search(s, r, arg || "hongdae"); return { lines: [`${D.AB_REGIONS[arg || "hongdae"].n} 매물 ${ls.length}개`], msg: D.AB_REGIONS[arg || "hongdae"].tip }; }
  if (id === "ab_cohost") { A.cohost = !A.cohost; return { lines: [A.cohost ? "코호스트 고용: 매출의 20%, 청소·응대를 맡겨요" : "코호스트 해지"], msg: A.cohost ? "\"체크인 안내는 제가 4개 국어로 할게요.\"" : "다시 내가 다 한다." }; }
  const u = A.units.find((x) => x.id === arg) || A.units[0];
  if (id === "ab_clean") { u.ap += 1 * boost; gainStat(s, "hands", 0.3); return { lines: [`${u.name} 관리 ${Math.round(u.ap * 10) / 10}/${needAp(s, u)}`], msg: "침구 교체, 머리카락 0개 작전, 웰컴 카드." }; }
  if (id === "ab_photo") { u.photo = Math.min(100, u.photo + 8 + s.st.sense / 20); gainStat(s, "sense", 0.5); return { lines: [`${u.name} 사진·소개 ${Math.round(u.photo)}`], msg: "광각 렌즈, 오전 10시 햇살, 침대 위 수건 백조." }; }
  if (id === "ab_host") {
    u.host = s.t; const ok = r.chance(clamp(0.35 + s.st.lang / 120 + s.st.talk / 400, 0.1, 0.95)); gainStat(s, "lang", 0.8);
    u.rating = clamp(u.rating + (ok ? 0.05 : -0.03), 3.5, 5);
    return { lines: [ok ? "게스트 응대 성공, 별점 +" : "말이 잘 안 통했다, 별점 −", "외국어 +"], msg: ok ? r.pick(["\"Your place is amazing! Where can we eat Korean BBQ?\" 맛집 리스트를 보냈다.", "일본인 가족에게 지하철 환승을 번역기 없이 설명했다.", "\"謝謝!\" 대만 게스트가 과자를 두고 갔다."]) : "\"Sorry... the wifi... password?\" 같은 질문을 세 번 받았다." };
  }
  return null;
}

// 한 달 정산
export function month(s, r, notes, scenes) {
  const A = s.ab, pi = SYN.pi(s); let total = 0;
  if (A.fx > 0) A.fx--;
  const nAll = A.units.length + (s.pr?.rooms?.length || 0) * (SYN.on(s, "pr_ab") ? 1 : 0), sf = D.scaleF(Math.max(1, nAll));
  for (const u of A.units) {
    const R = D.AB_REGIONS[u.rk], T = D.AB_TYPES[u.ty];
    if (u.banned > 0) { u.banned--; s.cash -= u.rent; addMoney(s, "exp", "에어씨앤씨 비용", u.rent); total -= u.rent; notes.push(`${u.name}: 영업정지 중(월세는 나감)`); continue; }
    const seas = (R.peak.includes(s.cal) ? 1.35 : R.off ?? 1) * (D.AB_SEASON[s.cal - 1]);
    const fx = A.fx > 0 ? 1.3 : 1, intl = s.era.pandemic ? 0.15 : s.era.intl ? 0.5 : 1;
    const langF = clamp(0.45 + s.st.lang / 110, 0.4, 1.3) * mod(s, "abLang", 1);
    const foreignD = R.foreign * fx * intl * langF * (SYN.on(s, "ovs_ab") ? 1.1 : 1) * (SYN.on(s, "insta_ab") ? 1.06 : 1), domesticD = (u.reg === "legal" && R.city ? 0 : 1 - R.foreign) * (s.era.winter ? 0.8 : 1);
    let occ = 0.85 * seas * (foreignD + domesticD) * (0.6 + u.photo / 250) * (1 + (u.rating - 4.6) * 0.8) * Math.pow(R.adr * T.adrF * pi / u.adr, 1.2) * (A.super ? 1.12 : 1) * (1 - 0.03 * (s.pr?.mkt?.[u.rk]?.comp || 0));
    if (u.months === 0) occ *= 0.6;
    const q = A.cohost ? 1 : clamp(u.ap / needAp(s, u), 0, 1); occ *= 0.8 + 0.2 * q;
    occ = clamp(occ * (1 + 0.08 * r.normal()), 0.03, 0.97);
    const nights = Math.round(occ * 30), stays = Math.max(0, Math.round(nights / T.len)), rev = Math.round(nights * u.adr * (A.super ? 1.08 : 1));
    const clean = (A.cohost ? 3.5 : 1.2) * stays * pi * sf, util = 18 * T.rentF * pi * (0.6 + 0.4 * sf), fee = rev * 0.035, cohost = A.cohost ? rev * 0.2 : 0;
    let cost = Math.round(u.rent + clean + util + fee + cohost + stays * 0.8 * pi);
    // 별점: 청결(관리)·응대(외국어)·사진
    const target = 4.35 + q * 0.35 + (s.st.lang - 40) / 400 + (u.host === s.t ? 0.05 : 0) + mod(s, "abStar", 0) + (SYN.on(s, "travel_ab") ? 0.05 : 0);
    u.rating = clamp(u.rating + (target - u.rating) * 0.25 + 0.03 * r.normal(), 3.4, 4.99);
    u.stays += stays; u.months++; u.ap = 0;
    u.last = { occ, nights, stays, rev, cost, foreign: Math.round(foreignD / (foreignD + domesticD + 1e-9) * 100), q };
    u.hist.push(rev - cost); if (u.hist.length > 24) u.hist.shift();
    s.cash += rev - cost; addMoney(s, "inc", "에어씨앤씨 매출", rev); addMoney(s, "exp", "에어씨앤씨 비용", cost); total += rev - cost;
    // 사건
    if (u.reg === "illegal" && r.chance(0.035 + (u.last.foreign < 50 ? 0.02 : 0))) { const fine = Math.round(r.int(300, 1000) * pi); s.cash -= fine; addMoney(s, "exp", "미등록 숙박 과태료", fine); u.banned = 3; scenes.push(story("불법 숙박 단속", `${u.name}에 구청 단속반이 왔다. 이웃 신고였다. 과태료 ${won(fine)}, 3개월 영업정지. 에어씨앤씨 리스팅도 내려갔다.`)); }
    else if (stays && r.chance(0.06)) scenes.push(abEvent(s, r, u));
  }
  // 환율·국제 이슈
  if (A.units.length && r.chance(0.02) && !A.fx) { A.fx = 6; notes.push("환율 급등! 한국 여행이 싸졌다: 외국인 예약 +30%(6개월)"); }
  // 슈퍼호스트(1년 평균 별점 4.8, 숙박 10건)
  const sup = A.units.length && A.units.every((u) => u.rating >= 4.8) && A.units.reduce((a, u) => a + u.stays, 0) >= 10;
  if (sup && !A.super) { notes.push("슈퍼호스트 배지 획득! 노출 +12%, 요금 +8%"); log(s, "에어씨앤씨 슈퍼호스트가 됐다.", "work"); }
  if (!sup && A.super) notes.push("슈퍼호스트 배지를 잃었다");
  A.super = !!sup;
  A.hist.push(Math.round(total)); if (A.hist.length > 24) A.hist.shift();
  return total;
}
function story(title, text) { return { kind: "story", title, text, choices: [{ t: "계속", eff: {}, text: "" }] }; }
function abEvent(s, r, u) {
  s._abEv = { id: u.id };
  const L = [
    { t: "체크인 대소동", x: `밤 11시, ${u.name} 게스트가 도어락 앞에서 메시지를 보냈다. "The code doesn't work!!" 게스트는 스페인어만 쓴다.`, c: [{ t: "영상통화로 직접 안내한다", check: { stat: "lang", dc: 50 }, ok: { text: "손짓 반, 영어 반. 문이 열렸다. 후기에 'Super kind host' 가 달렸다.", eff: { mental: 2 } }, ng: { text: "결국 택시 타고 달려갔다. 새벽 1시 귀가.", eff: { hp: -12, mental: -5 } } }, { t: "근처 호텔을 잡아 주고 환불", eff: { cash: -Math.round(u.adr * 3), mental: -2 }, text: "돈으로 해결했다. 별점은 지켰다." }] },
    { t: "파티 금지 위반", x: `${u.name}에서 게스트 8명이 파티를 열었다. 아랫집에서 경찰에 신고했다.`, c: [{ t: "보증금 청구하고 정중히 퇴실 요청", check: { stat: "lang", dc: 45 }, ok: { text: "규정을 차분히 설명했다. 손해 배상을 받아 냈다.", eff: { cash: 20 } }, ng: { text: "\"We didn't do anything!\" 별점 1개 후기가 달렸다.", eff: { mental: -6 } } }, { t: "이웃에게 먼저 사과하러 간다", eff: { mental: -3, cash: -5 }, text: "케이크 하나 들고 내려갔다. 이웃이 조금 누그러졌다." }] },
    { t: "외국어 후기 폭탄", x: `${u.name}에 일본어·중국어 후기가 10개 쌓였다. 다 칭찬인데 답글을 아직 못 달았다.`, c: [{ t: "번역기 없이 직접 답글을 쓴다", check: { stat: "lang", dc: 55 }, ok: { text: "답글이 정성스럽다는 말에 재예약이 들어왔다.", eff: { mental: 3 } }, ng: { text: "번역 투가 어색했지만 마음은 전해졌다.", eff: {} } }, { t: "그냥 둔다", eff: {}, text: "답글 없는 숙소는 노출이 조금 준다." }] },
    { t: "고장 난 보일러", x: `한겨울, ${u.name} 게스트가 사진을 보냈다. 온도계 12도.`, c: [{ t: "긴급 출장 수리", eff: { cash: -Math.round(15 * SYN.pi(s)) }, text: "한 시간 만에 해결했다." }, { t: "전기장판을 들고 달려간다", eff: { hp: -8, cash: -3 }, text: "게스트가 웃으며 사진을 찍었다." }] },
  ];
  const e = r.pick(L);
  return { kind: "event", tag: "에어씨앤씨", title: e.t, text: e.x, choices: e.c };
}
export function value(s) { return s.ab.units.reduce((a, u) => a + u.dep, 0); }
export function passive(s) { if (!s.ab.cohost) return 0; const h = s.ab.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0; }
export function todos(s) {
  const t = [];
  for (const u of s.ab.units) { const n = needAp(s, u); if (!s.ab.cohost && u.ap < n && !u.banned) t.push({ lv: u.ap < n * 0.6 ? 2 : 1, text: `${u.name} 청소·관리 ${Math.round(u.ap * 10) / 10}/${n}`, go: "airbnb" }); }
  return t;
}
