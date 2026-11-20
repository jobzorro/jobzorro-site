// 무인카페 보드: 기계가 일하고 나는 청소·재고·점검. 렌탈 vs 구매, 원두 등급, 한 잔 가격, 여름 아이스 성수기, 먹튀·고장·10대 아지트.
import * as D from "./defs.js";
import { addMoney, log, won, gainStat, creditRoom, addLoan, helperPower, mod } from "./core.js";
import * as SYN from "./syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function init() { return { stores: [], listings: [], seq: 0, agent: false, hist: [], beanUp: 0 }; }

export function search(s, r, ak) {
  const A = D.UC_AREAS[ak], pi = SYN.pi(s);
  const ls = Array.from({ length: 3 }, () => {
    const size = r.int(6, 15), traffic = +(A.traffic * r.range(0.75, 1.25)).toFixed(2);
    const rent = Math.round(r.range(A.rent[0], A.rent[1]) * (size / 10) * (0.7 + traffic * 0.3) * pi * (s.era.rentup ? 1.15 : 1) / 5) * 5;
    return { id: "C" + (++s.uc.seq), t: s.t, ak, size, traffic, rent, dep: Math.round(rent * r.range(10, 15) / 100) * 100, key: Math.round(r.range(0, 1500) * pi / 50) * 50, comp: Math.max(0, A.comp + r.int(-1, 2)) };
  });
  s.uc.listings = s.uc.listings.filter((l) => l.ak !== ak).concat(ls);
  return ls;
}
// machine: "rent"(월 렌탈) | "buy"(구매) · bean: 0 가성비 | 1 스페셜티
export function quote(s, L, o) { const pi = SYN.pi(s), sf = D.scaleF(s.uc.stores.length + 1); const fit = Math.round((900 + L.size * 60) * pi * sf); const mach = o.machine === "buy" ? Math.round(2200 * pi) : Math.round(150 * pi); return { fit, mach, total: L.dep + L.key + fit + mach }; }
export function contract(s, id, o) {
  const U = s.uc, L = U.listings.find((x) => x.id === id); if (!L) return { ok: false, msg: "매물이 없어요" };
  const q = quote(s, L, o), lack = q.total - s.cash;
  if (lack > 0) { if (lack > creditRoom(s) * 0.6 + 4000) return { ok: false, msg: `돈이 ${won(lack)} 모자라요` }; addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; }
  s.cash -= q.total; addMoney(s, "exp", "무인카페 오픈", q.total);
  const n = U.stores.length + 1, A = D.UC_AREAS[L.ak];
  const st = { ...L, id: "S" + (++U.seq), name: `${n}호 ${A.n}`, machine: o.machine, bean: o.bean || 0, price: 0.2, rating: 4.3, clean: 0, months: 0, ap: 0, last: null, hist: [], invested: q.total, cctv: false, broken: 0 };
  U.stores.push(st); U.listings = U.listings.filter((x) => x !== L);
  log(s, `${st.name} 무인카페 오픈 (${o.machine === "buy" ? "기계 구매" : "기계 렌탈"}). ${won(q.total)}`, "work");
  return { ok: true, msg: `${st.name} 오픈! 다음 달부터 기계가 일해요`, store: st };
}
export function close(s, id) { const U = s.uc, st = U.stores.find((x) => x.id === id); if (!st) return { ok: false }; const back = Math.round(st.dep + (st.machine === "buy" ? 700 : 0) + Math.max(0, avg(st)) * 6); s.cash += back; addMoney(s, "inc", "무인카페 양도", back); U.stores = U.stores.filter((x) => x !== st); log(s, `${st.name} 양도 ${won(back)}`, "work"); return { ok: true, msg: `${st.name} 양도, ${won(back)} 회수` }; }
const avg = (st) => { const h = st.hist.slice(-6); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; };
export function setPrice(s, id, v) { const st = s.uc.stores.find((x) => x.id === id); if (st) st.price = clamp(Math.round(v * 100) / 100, 0.1, 0.45); }
export function setBean(s, id, v) { const st = s.uc.stores.find((x) => x.id === id); if (st) st.bean = v ? 1 : 0; }
export function buyCctv(s, id) { const st = s.uc.stores.find((x) => x.id === id); if (!st || st.cctv) return { ok: false, msg: "이미 있어요" }; const c = Math.round(80 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "무인카페 CCTV·결제 경보", c); st.cctv = true; return { ok: true, msg: `${st.name} CCTV·미결제 경보 설치(${won(c)})` }; }
export const needAp = (s, st) => (s.uc.agent ? 0.25 : Math.max(0.5, Math.round((1 + (st.last?.cups ?? 1800) / 2500) * 2) / 2));

export function can(s, id) { if (id === "uc_search") return null; if (!s.uc.stores.length) return "매장이 없어요"; if (id === "uc_agent" && s.uc.stores.length < 2) return "매장 2곳부터"; return null; }
export function act(s, r, id, arg) {
  const U = s.uc;
  if (id === "uc_search") { const ls = search(s, r, arg || "apt"); return { lines: [`${D.UC_AREAS[arg || "apt"].n} 매물 ${ls.length}개`], msg: D.UC_AREAS[arg || "apt"].tip }; }
  if (id === "uc_agent") { U.agent = !U.agent; return { lines: [U.agent ? "관리 대행 계약: 매장당 월 40만, 청소·재고를 맡겨요" : "관리 대행 해지"], msg: U.agent ? "\"매일 아침 7시에 들러서 원두 채울게요.\"" : "다시 내가 새벽에 간다." }; }
  const st = U.stores.find((x) => x.id === arg) || U.stores[0];
  if (id === "uc_check") { st.ap += 1; st.clean = Math.min(100, st.clean + 30); if (st.broken) { st.broken = 0; } gainStat(s, "hands", 0.3); return { lines: [`${st.name} 점검 ${st.ap}/${needAp(s, st)}`, "청결 +"], msg: r.pick(["새벽 6시, 원두 채우고 얼음통 비우고 테이블 닦기.", "컵 뚜껑이 다 떨어져 있었다. 편의점으로 뛰었다.", "그라인더 청소. 커피 가루가 손톱에 꼈다."]) }; }
  if (id === "uc_promo") { st.buzz = Math.min(100, (st.buzz || 0) + 12 + s.st.mkt / 10); gainStat(s, "mkt", 0.4); return { lines: [`${st.name} 동네 입소문 +`], msg: "아파트 단톡방에 \"첫 잔 1,000원\" 쿠폰을 뿌렸다." }; }
  return null;
}

export function month(s, r, notes, scenes) {
  const U = s.uc, pi = SYN.pi(s); let total = 0;
  if (U.beanUp > 0) U.beanUp--;
  for (const st of U.stores) {
    const A = D.UC_AREAS[st.ak], seas = D.UC_SEASON[s.cal - 1], q = U.agent ? 1 : clamp(st.ap / needAp(s, st), 0, 1);
    st.clean = clamp(st.clean * 0.4 + q * 60, 0, 100);
    const quality = 0.85 + st.bean * 0.15 + (st.machine === "buy" ? 0.08 : 0) + (SYN.on(s, "cook_uc") ? 0.08 : 0);
    let cups = 88 * st.traffic * seas * quality * Math.pow(0.2 * pi / st.price, 1.4) * (1 - 0.06 * st.comp) * (1 + (st.rating - 4.3) * 0.7) * (1 + (st.buzz || 0) / 300) * (st.months === 0 ? 0.6 : st.months < 3 ? 0.85 : 1);
    if (st.broken) cups *= 0.5;
    cups *= mod(s, "ucRepeat", 1);
    if (s.era.winter) cups *= 0.9;
    cups = Math.max(0, Math.round(cups * 30 * (1 + 0.07 * r.normal())));
    const theft = Math.round(cups * (st.cctv ? 0.01 : 0.035) * mod(s, "ucTheft", 1)), rev = Math.round((cups - theft) * st.price);
    const unit = (st.bean ? 0.075 : 0.055) * pi * (U.beanUp ? 1.35 : 1) * (0.85 + 0.15 * D.scaleF(U.stores.length));
    const util = (22 + ([6, 7, 8].includes(s.cal) ? 18 : [12, 1, 2].includes(s.cal) ? 8 : 0)) * pi;
    let cost = Math.round(st.rent + cups * unit + util + (st.machine === "rent" ? 45 * pi : 0) + rev * 0.025 + (U.agent ? 40 * pi : 0) + 8 * pi);
    // 별점: 청결·맛·고장
    const target = 4.1 + st.clean / 300 + st.bean * 0.15 - (st.broken ? 0.2 : 0);
    st.rating = clamp(st.rating + (target - st.rating) * 0.3 + 0.03 * r.normal(), 3.2, 4.95);
    st.buzz = Math.max(0, (st.buzz || 0) * 0.85);
    st.months++; st.ap = 0;
    // 사건
    const breakP = (st.machine === "buy" ? 0.04 : 0.025) + ([7, 8].includes(s.cal) ? 0.03 : 0) - q * 0.02;
    if (r.chance(breakP)) { const fix = st.machine === "rent" ? 0 : Math.round(r.int(30, 120) * pi); cost += fix; st.broken = 1; notes.push(`${st.name}: 커피 머신 고장${fix ? `, 수리비 ${won(fix)}` : "(렌탈이라 수리는 무료, 대신 며칠 멈춤)"}`); }
    else if (r.chance(0.06)) scenes.push(ucEvent(s, r, st, rev));
    st.last = { cups, theft, rev, cost, q };
    st.hist.push(rev - cost); if (st.hist.length > 24) st.hist.shift();
    s.cash += rev - cost; addMoney(s, "inc", "무인카페 매출", rev); addMoney(s, "exp", "무인카페 비용", cost); total += rev - cost;
  }
  // 근처 저가 프랜차이즈
  if (U.stores.length && r.chance(0.03)) { const st = r.pick(U.stores); st.comp++; notes.push(`${st.name} 근처에 저가 프랜차이즈 커피가 생겼다(경쟁 ${st.comp}곳)`); }
  if (U.stores.length && !U.beanUp && r.chance(0.015)) { U.beanUp = 6; notes.push("국제 원두값 급등! 6개월 동안 원두·우유 원가 +35%"); }
  U.hist.push(Math.round(total)); if (U.hist.length > 24) U.hist.shift();
  return total;
}
function ucEvent(s, r, st, rev) {
  s._ucEv = { id: st.id };
  const L = [
    { t: "먹튀 영상", x: `${st.name} CCTV에 결제 안 하고 음료만 들고 가는 학생 셋이 찍혔다. 이번 달만 다섯 번째.`, c: [{ t: "가게에 경고문과 영상 캡처를 붙인다", eff: { mental: -2 }, text: "먹튀가 줄었다. 대신 동네 맘카페에 '무서운 카페' 글이 올라왔다." }, { t: "경찰에 신고한다", eff: { mental: -4 }, text: "부모님이 찾아와 사과하고 음료값을 냈다." }] },
    { t: "10대 아지트", x: `밤마다 ${st.name}에 중학생들이 모여 컵라면을 먹고 간다. 쓰레기와 소음 민원.`, c: [{ t: "밤 10시 이후 출입 제한(키오스크 설정)", eff: { cash: -Math.round(rev * 0.08) }, text: "조용해졌다. 야간 매출도 같이 줄었다." }, { t: "직접 가서 웃으며 정리 부탁", check: { stat: "talk", dc: 45 }, ok: { text: "\"네 사장님!\" 단골이 됐다.", eff: { mental: 2 } }, ng: { text: "무시당했다. 다음 날 더 많이 왔다.", eff: { mental: -6 } } }] },
    { t: "얼음 기계 멈춤", x: `35도 폭염 토요일, ${st.name} 제빙기가 멈췄다. 아이스 주문이 다 실패하고 있다.`, c: [{ t: "편의점 얼음을 사서 달려간다", eff: { hp: -10, cash: -3 }, text: "얼음 20봉지. 손이 얼었다. 매출은 지켰다." }, { t: "그냥 둔다", eff: { cash: -Math.round(rev * 0.1) }, text: "\"아이스 안 돼요\" 리뷰가 달렸다." }] },
    { t: "동네 맘카페 후기", x: `동네 맘카페에 "${st.name} 원두 바꿨나요? 요즘 맛있어요" 글이 올라왔다.`, c: [{ t: "감사 댓글과 쿠폰을 단다", eff: { mental: 3 }, text: "다음 주 매출이 확 뛰었다." }] },
  ];
  const e = r.pick(L);
  return { kind: "event", tag: "무인카페", title: e.t, text: e.x, choices: e.c };
}
export function value(s) { return s.uc.stores.reduce((a, st) => a + st.dep + (st.machine === "buy" ? 700 : 0), 0); }
export function passive(s) { if (!s.uc.agent) return 0; const h = s.uc.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0; }
export function todos(s) { const t = []; for (const st of s.uc.stores) { const n = needAp(s, st); if (!s.uc.agent && st.ap < n) t.push({ lv: st.ap < n * 0.5 ? 2 : 1, text: `${st.name} 점검·재고 ${st.ap}/${n}`, go: "ucafe" }); if (st.broken) t.push({ lv: 2, text: `${st.name} 머신 고장: 점검하면 고쳐요`, go: "ucafe" }); } return t; }
