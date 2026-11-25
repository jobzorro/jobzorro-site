// 무인카페 보드: 기계가 일하고 나는 청소·재고·점검. 렌탈 vs 구매, 원두 등급, 한 잔 가격, 여름 아이스 성수기, 먹튀·고장·10대 아지트.
import * as D from "./defs.js";
import { addMoney, log, won, gainStat, creditRoom, addLoan, helperPower, mod } from "./core.js";
import * as SYN from "./syn.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import * as SP from "./space.js"; // 11-25 지점 수 파손 배율·히든 길 켜짐 여부

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 11-21 밸런스(기획 unmanned.json: 월매출 330~450만, 순익 중위 140만). 원래: 하루 기본 88잔, 잔당 원가 0.055(스페셜티 0.075), 렌탈 45만
// 11-21 밸런스 2차(10개 투잡 공통 비교): 동네 홍보를 꾸준히 하는 보통 플레이에서 매장당 월 300만 안팎(기획 p95)이 나와 하루 기본 110 → 95잔
export const UC_BAL = { cups: 95, unit: 0.046, unitSp: 0.064, rental: 38 };
// 주말 손님 비율(평일=1). 오피스가는 주말에 거의 안 온다
export const weekendF = (A) => (22 + 8 * (A.weekend ?? 1)) / 30;
export function init() { return { stores: [], listings: [], seq: 0, agent: false, hist: [], beanUp: 0, stock: "mid" }; }

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
export function close(s, id) { const U = s.uc, st = U.stores.find((x) => x.id === id); if (!st) return { ok: false }; const back = Math.round(st.dep + (st.machine === "buy" ? 700 : 0) + Math.max(0, avg(st)) * 6); s.cash += back; addMoney(s, "inc", "무인카페 양도", back); U.stores = U.stores.filter((x) => x !== st); if (avg(st) > 0) U.soldN = (U.soldN || 0) + 1; log(s, `${st.name} 양도 ${won(back)}`, "work"); return { ok: true, msg: `${st.name} 양도, ${won(back)} 회수` }; }
const avg = (st) => { const h = st.hist.slice(-6); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; };
export function setPrice(s, id, v) { const st = s.uc.stores.find((x) => x.id === id); if (st) st.price = clamp(Math.round(v * 100) / 100, 0.1, 0.45); }
export function setBean(s, id, v) { const st = s.uc.stores.find((x) => x.id === id); if (st) st.bean = v ? 1 : 0; }
export function buyCctv(s, id) { const st = s.uc.stores.find((x) => x.id === id); if (!st || st.cctv) return { ok: false, msg: "이미 있어요" }; const c = Math.round(80 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "무인카페 CCTV·결제 경보", c); st.cctv = true; return { ok: true, msg: `${st.name} CCTV·미결제 경보 설치(${won(c)})` }; }
export const needAp = (s, st) => (s.uc.agent ? 0.25 : Math.max(0.5, Math.round((1 + (st.last?.cups ?? 1800) / 2500 + stockOf(s).ap) * 2) / 2)); // v4.29 원두 재고 방식

export function can(s, id, arg) { if (id === "uc_search") return arg && !D.UC_AREAS[arg] ? "없는 지역이에요" : null; if (!s.uc.stores.length) return "매장이 없어요"; if (id === "uc_agent" && s.uc.agent) { const U = s.uc; const why = SJ.slotLock(s, () => { U.agent = false; return () => { U.agent = true; }; }); if (why) return why; } if (id === "uc_agent" && s.uc.stores.length < 2) return "매장 2곳부터"; return null; }
export function act(s, r, id, arg, boost = 1) {
  const U = s.uc;
  if (id === "uc_search") { const ls = search(s, r, arg || "apt"); return { lines: [`${D.UC_AREAS[arg || "apt"].n} 매물 ${ls.length}개`], msg: D.UC_AREAS[arg || "apt"].tip }; }
  if (id === "uc_agent") { U.agent = !U.agent; return { lines: [U.agent ? "관리 대행 계약: 매장당 월 40만, 청소·재고를 맡겨요" : "관리 대행 해지"], msg: U.agent ? "\"매일 아침 7시에 들러서 원두 채울게요.\"" : "다시 내가 새벽에 간다." }; }
  const st = U.stores.find((x) => x.id === arg) || U.stores[0];
  if (id === "uc_check") { const hf = clamp(0.85 + (s.st.hands || 0) / 300, 0.85, 1.25); st.ap += boost * hf; st.clean = Math.min(100, st.clean + Math.round(30 * boost * hf)); if (st.broken) { st.broken = 0; } gainStat(s, "hands", 0.3); return { lines: [`${st.name} 점검 ${Math.round(st.ap * 10) / 10}/${needAp(s, st)}`, "청결 +"], msg: r.pick(["새벽 6시, 원두 채우고 얼음통 비우고 테이블 닦기.", "컵 뚜껑이 다 떨어져 있었다. 편의점으로 뛰었다.", "그라인더 청소. 커피 가루가 손톱에 꼈다."]) }; }
  if (id === "uc_promo") { st.buzz = Math.min(100, (st.buzz || 0) + 12 + s.st.mkt / 10); gainStat(s, "mkt", 0.4); return { lines: [`${st.name} 동네 입소문 +`], msg: "아파트 단톡방에 \"첫 잔 1,000원\" 쿠폰을 뿌렸다." }; }
  return null;
}

export function month(s, r, notes, scenes) {
  const U = s.uc, pi = SYN.pi(s); let total = 0; const n0 = scenes.length, NK = UC_F30.night, 스크 = stockOf(s), dX = SP.dmgX(U.stores.length); // 11-25 지점 수 파손 배율
  U.hidOn = SP.hidOn(s, "ucafe"); // 11-25 히든 길 '내 원두 브랜드': 저가 체인 영향 거의 없음(chainRef)
  if (U.beanUp > 0) U.beanUp--;
  for (const st of U.stores) {
    const A = D.UC_AREAS[st.ak], seas = D.UC_SEASON[s.cal - 1], q = U.agent ? 1 : clamp(st.ap / needAp(s, st), 0, 1);
    st.clean = clamp(st.clean * 0.4 + q * 60, 0, 100);
    const quality = 0.85 + st.bean * 0.15 + (st.machine === "buy" ? 0.08 : 0) + (SYN.on(s, "cook_uc") ? 0.08 : 0) + 스크.q;
    let cups = UC_BAL.cups * weekendF(A) * st.traffic * seas * quality * Math.pow(0.2 * pi * chainRef(st, U) / st.price, 1.4) * (1 - 0.06 * st.comp) * (1 + (st.rating - 4.3) * 0.7) * (1 + (st.buzz || 0) / 300) * (st.months === 0 ? 0.6 : st.months < 3 ? 0.85 : 1);
    if (st.broken) cups *= 0.5;
    if (st.night === false) cups *= NK.keep; // v4.29 밤에 닫으면 새벽 손님만큼 빠진다
    cups *= SJ.ramp(s, "ucafe"); // 첫 매장 초반 고생(sj.js ENTRY)
    cups *= mod(s, "ucRepeat", 1);
    if (s.era.winter) cups *= 0.9;
    cups = Math.max(0, Math.round(cups * 30 * (1 + 0.07 * r.normal())));
    const numF = clamp(1.03 - (s.st.num || 0) / 2000, 0.95, 1.03); // 숫자: 재고·원가·정산을 꼼꼼히 본다(숫자 60이면 1)
    const theft = Math.round(cups * (st.cctv ? 0.01 : 0.035) * (st.night === false ? NK.theft : 1) * mod(s, "ucTheft", 1) * numF), rev = Math.round((cups - theft) * st.price);
    const unit = (st.bean ? UC_BAL.unitSp : UC_BAL.unit) * pi * (U.beanUp ? 1.35 : 1) * 스크.unit * (0.85 + 0.15 * D.scaleF(U.stores.length)) * numF;
    const util = (22 + ([7, 8].includes(s.cal) ? 20 : s.cal === 6 ? 12 : [12, 1].includes(s.cal) ? 20 : s.cal === 2 ? 14 : [5, 9, 11].includes(s.cal) ? 5 : 0)) * pi /* 11-25 대표: 추울 때·더울 때 전기비가 오른다(겨울 난방도 여름 냉방만큼) */ * (st.night === false ? NK.util : 1);
    let cost = Math.round(st.rent + cups * unit + util + (st.machine === "rent" ? UC_BAL.rental * pi : 0) + rev * 0.025 + (U.agent ? 40 * pi : 0) + 8 * pi);
    // 별점: 청결·맛·고장
    const target = 4.1 + st.clean / 300 + st.bean * 0.15 - (st.broken ? 0.2 : 0) + 스크.star;
    st.rating = clamp(st.rating + (target - st.rating) * 0.3 + 0.03 * r.normal(), 3.2, 4.95);
    st.buzz = Math.max(0, (st.buzz || 0) * 0.85);
    st.months++; st.ap = 0;
    // 사건
    const breakP = ((st.machine === "buy" ? 0.04 : 0.025) + ([7, 8].includes(s.cal) ? 0.03 : 0) - q * 0.02) * (st.night === false ? NK.brk : 1) * dX; // 11-25 지점 하나 늘 때마다 고장 +30%
    if (r.chance(breakP)) { const fix = st.machine === "rent" ? 0 : Math.round(r.int(30, 120) * pi); cost += fix; st.broken = 1; notes.push(`${st.name}: 커피 머신 고장${fix ? `, 수리비 ${won(fix)}` : "(렌탈이라 수리는 무료, 대신 며칠 멈춤)"}`); }
    else if (st.night !== false && st.months >= 3 && scenes.length === n0 && r.chance(NK.p24)) scenes.push(nightScene(s, r, st)); // v4.29 24시간 매장의 새벽 사고
    else if (r.chance(0.06)) scenes.push(ucEvent(s, r, st, rev));
    if (스크 === UC_F30.stock.bulk && [6, 7, 8].includes(s.cal) && r.chance(스크.damp)) { st.rating = clamp(st.rating - 0.03, 3.2, 4.95); notes.push(`${st.name}: 쟁여 둔 원두가 습기를 먹었다. "오늘 커피 왜 이래요" 별점 −0.03`); }
    st.last = { cups, theft, rev, cost, q };
    st.hist.push(rev - cost); if (st.hist.length > 24) st.hist.shift();
    s.cash += rev - cost; addMoney(s, "inc", "무인카페 매출", rev); addMoney(s, "exp", "무인카페 비용", cost); total += rev - cost;
  }
  // 근처 저가 프랜차이즈
  if (U.stores.length && r.chance(UC_F30.chain.p)) { const st = r.pick(U.stores); st.comp++; if ((st.chain || 0) < UC_F30.chain.max) { st.chain = (st.chain || 0) + 1; scenes.push(chainScene(s, st)); } else notes.push(`${st.name} 근처에 저가 커피가 또 생겼다(경쟁 ${st.comp}곳)`); } // v4.29 옆에 저가 커피 체인 입점
  hoursAsk(s, scenes, n0);
  if (U.stores.length && !U.beanUp && r.chance(0.015)) { U.beanUp = 6; notes.push("국제 원두값 급등! 6개월 동안 원두·우유 원가 +35%"); }
  U.hist.push(Math.round(total)); if (U.hist.length > 24) U.hist.shift();
  return total;
}
function ucEvent(s, r, st, rev) {
  s._ucEv = { id: st.id };
  const L0 = [
    { t: "먹튀 영상", x: `${st.name} CCTV에 결제 안 하고 음료만 들고 가는 학생 셋이 찍혔다. 이번 달만 다섯 번째.`, c: [{ t: "가게에 경고문과 영상 캡처를 붙인다", eff: { mental: -2 }, text: "먹튀가 줄었다. 대신 동네 맘카페에 '무서운 카페' 글이 올라왔다." }, { t: "경찰에 신고한다", eff: { mental: -4 }, text: "부모님이 찾아와 사과하고 음료값을 냈다." }] },
    { t: "10대 아지트", x: `밤마다 ${st.name}에 중학생들이 모여 컵라면을 먹고 간다. 쓰레기와 소음 민원.`, c: [{ t: "밤 10시 이후 출입 제한(키오스크 설정)", eff: { cash: -Math.round(rev * 0.08) }, text: "조용해졌다. 야간 매출도 같이 줄었다." }, { t: "직접 가서 웃으며 정리 부탁", check: { stat: "talk", dc: 45 }, ok: { text: "\"네 사장님!\" 단골이 됐다.", eff: { mental: 2 } }, ng: { text: "무시당했다. 다음 날 더 많이 왔다.", eff: { mental: -6 } } }] },
    { t: "얼음 기계 멈춤", x: `35도 폭염 토요일, ${st.name} 제빙기가 멈췄다. 아이스 주문이 다 실패하고 있다.`, c: [{ t: "편의점 얼음을 사서 달려간다", eff: { hp: -10, cash: -3 }, text: "얼음 20봉지. 손이 얼었다. 매출은 지켰다." }, { t: "그냥 둔다", eff: { cash: -Math.round(rev * 0.1) }, text: "\"아이스 안 돼요\" 리뷰가 달렸다." }] },
    { t: "동네 맘카페 후기", x: `동네 맘카페에 "${st.name} 원두 바꿨나요? 요즘 맛있어요" 글이 올라왔다.`, c: [{ t: "감사 댓글과 쿠폰을 단다", eff: { mental: 3 }, text: "다음 주 매출이 확 뛰었다." }] },
  ];
  const L = L0.filter((e) => !(st.night === false && e.t === "10대 아지트")); // 밤에 닫은 매장엔 아지트가 없다
  const e = r.pick(L);
  return { kind: "event", tag: "무인카페", title: e.t, text: e.x, choices: e.c };
}
export function value(s) { return s.uc.stores.reduce((a, st) => a + st.dep + (st.machine === "buy" ? 700 : 0), 0); }
export function passive(s) { if (!s.uc.agent) return 0; const h = s.uc.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) : 0; }
export function todos(s) { const t = []; for (const st of s.uc.stores) { const n = needAp(s, st); if (!s.uc.agent && st.ap < n) t.push({ lv: st.ap < n * 0.5 ? 2 : 1, text: `${st.name} 점검·재고 ${st.ap}/${n}`, go: "ucafe" }); if (st.broken) t.push({ lv: 2, text: `${st.name} 머신 고장: 점검하면 고쳐요`, go: "ucafe" }); } return t; }

// ───────── v4.29 무인카페 특이 요소: 24시간 vs 밤에 닫기 · 원두 신선도와 재고 회전 · 옆에 저가 커피 체인 입점 ─────────
// 효과 크기는 여기 모아 둔다
export const UC_F30 = {
  night: { keep: 0.8, util: 0.72, theft: 0.45, brk: 0.7, lock: 30, p24: 0.05 }, // 밤에 닫으면: 잔 수 80%, 전기 72%, 먹튀 45%, 고장 70%. 처음 닫을 때 자동문 30만. 24시간이면 달마다 새벽 사고 5%
  stock: { // 원두 재고: unit 원가 배율 · ap 점검 행동력 · star 별점 · q 맛(잔 수)
    small: { n: "조금씩 자주", unit: 1.07, ap: 0.5, star: 0.05, q: 0.02, desc: "늘 신선해 별점이 오르지만 자주 가야 해요(점검 +0.5)" },
    mid: { n: "보통", unit: 1, ap: 0, star: 0, q: 0, desc: "2주에 한 번 채워요" },
    bulk: { n: "한 번에 많이", unit: 0.88, ap: -0.5, star: -0.12, q: -0.05, damp: 0.25, desc: "원가가 싸고 덜 가도 되지만 맛이 떨어져요(여름엔 습기)" },
  },
  chain: { p: 0.02, max: 2, ref: 0.08, spHalf: 0.5, cut: 0.03, buzz: 15, hid: 0.1 }, // hid: 히든 길 '내 원두 브랜드'가 켜진 동안 체인 영향 배율(거의 없음) // 체인 1곳마다 손님 머릿속 '한 잔 값'이 14% 내려간다(스페셜티면 절반)
};
export const stockOf = (s) => UC_F30.stock[s.uc?.stock || "mid"] || UC_F30.stock.mid;
export const chainRef = (st, U) => 1 - UC_F30.chain.ref * (st.chain || 0) * (st.bean ? UC_F30.chain.spHalf : 1) * (U?.hidOn ? UC_F30.chain.hid : 1);
export function setStock(s, k) { if (!UC_F30.stock[k]) return { ok: false }; s.uc.stock = k; return { ok: true, msg: `원두 재고: ${UC_F30.stock[k].n}` }; }
export function setNight(s, id, open24) {
  const st = s.uc.stores.find((x) => x.id === id); if (!st) return { ok: false };
  if (!open24 && !st.lock) { const c = Math.round(UC_F30.night.lock * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "무인카페 비용", c); st.lock = true; st.night = false; return { ok: true, msg: `${st.name}: 밤 12시~아침 7시 닫기 · 자동문 잠금 설치 ${won(c)}` }; }
  st.night = open24 ? true : false; return { ok: true, msg: `${st.name}: ${open24 ? "24시간 영업" : "밤엔 닫기"}` };
}
function hoursAsk(s, scenes, n0) {
  const U = s.uc; if (U.hoursAsk || scenes.length > n0) return;
  const st = U.stores.find((x) => x.months >= 2 && x.night === undefined); if (!st) return;
  U.hoursAsk = s.t; scenes.push(hoursScene(s, st));
}
function hoursScene(s, st) {
  const K = UC_F30.night;
  return { kind: "event", tag: "무인카페", title: "밤에도 열어 둘까", onChoose: "uc_hours", f30: { id: st.id },
    text: `새벽 2시, ${st.name} CCTV 알림. 손님 한 명이 아메리카노를 뽑아 간다. 밤 손님은 매출의 ${Math.round((1 - K.keep) * 100)}%쯤. 대신 전기세, 10대 아지트, 새벽 사고도 같이 온다.`,
    choices: [
      { t: "24시간 연다 (매출 그대로, 새벽 사고 위험)", eff: {}, text: "불 켜진 무인카페는 동네의 등대다. 가끔은 해적도 온다." },
      { t: `밤 12시~아침 7시는 닫는다 (매출 −${Math.round((1 - K.keep) * 100)}%, 전기·먹튀·고장 ↓, 자동문 ${won(Math.round(K.lock * SYN.pi(s)))})`, eff: {}, text: "자동문 잠금을 달았다. 새벽 알림이 조용해졌다." },
    ] };
}
function nightScene(s, r, st) {
  const k = r.int(0, 2), c = Math.round(5 * SYN.pi(s));
  const x = [`새벽 3시, ${st.name} CCTV. 취객이 테이블에 엎드려 잠들었다. 바닥엔 쏟은 커피.`, `새벽 2시, ${st.name}에 10대 여섯 명. 컵라면 국물이 키오스크 앞까지 흘렀다.`, `새벽 4시, ${st.name} 문자 알림. "키오스크 화면 깨짐 감지."`][k];
  return { kind: "event", tag: "무인카페", title: "새벽의 무인카페", onChoose: "uc_night", f30: { id: st.id, c: k === 2 ? Math.round(c * 4) : c },
    text: `${x} 24시간 매장의 밤은 내 몫이다.`,
    choices: [
      { t: `경찰·보안 업체에 맡기고 아침에 치운다 (${won(k === 2 ? c * 4 : c)})`, eff: {}, text: "출근 전 6시에 들러 바닥을 닦았다." },
      { t: "지금 바로 달려간다 (스태미너 −10, 별점 +)", eff: {}, text: "새벽 택시. 매장을 정리하고 해 뜨는 걸 보며 출근했다." },
      { t: "이참에 밤엔 닫는다", eff: {}, text: "자동문 잠금 견적을 받았다." },
    ] };
}
function chainScene(s, st) {
  const K = UC_F30.chain, p = Math.round(st.price * 10000), np = Math.round(Math.max(0.1, st.price - K.cut) * 10000);
  return { kind: "event", tag: "무인카페", title: "옆에 저가 커피 체인이 생겼다", onChoose: "uc_chain", f30: { id: st.id },
    text: `${st.name} 건너편에 저가 커피 체인이 문을 열었다. 아메리카노 1,500원, 알바가 웃으며 내려 준다. 동네 사람들 머릿속 '한 잔 값'이 무너진다. 내 매장은 ${p.toLocaleString()}원.${st.bean ? " 그래도 스페셜티 원두라 덜 흔들린다." : ""}`,
    choices: [
      { t: `가격을 내린다 (${p.toLocaleString()}원 → ${np.toLocaleString()}원)`, eff: {}, text: "가격표를 새로 뽑았다. 마진이 얇아졌다." },
      { t: `품질로 버틴다 (스페셜티 원두 + 맛 홍보, 입소문 +${K.buzz})`, eff: {}, text: "\"여기 원두가 더 고소해요.\" 맘카페 댓글이 하나 달렸다." },
      { t: "다른 동네로 옮긴다 (양도하고 새 자리 찾기)", eff: {}, text: "이 골목은 체인 차지다. 짐을 쌌다." },
    ] };
}
export function f30Scene(s, r, what) { // 시험용
  const st = s.uc.stores[0]; if (!st) return null;
  return what === "hours" ? hoursScene(s, st) : what === "night" ? nightScene(s, r, st) : (st.chain = (st.chain || 0) + 1, chainScene(s, st));
}
const ucStore = (s, sc) => s.uc.stores.find((x) => x.id === sc?.f30?.id);
// 장면 선택(core.js 가 SCENE_FN 에 붙인다). 봇 기본 선택: 모두 0번
export const UC_CHOOSE = {
  uc_hours(s, r, i, ok, sc) { const st = ucStore(s, sc); if (!st) return []; if (i === 1) return [setNight(s, st.id, false).msg, "보드 '영업 방식'에서 매장마다 바꿀 수 있어요"]; st.night = true; return [`${st.name}: 24시간 영업`]; },
  uc_night(s, r, i, ok, sc) {
    const st = ucStore(s, sc), o = sc?.f30; if (!st || !o) return [];
    if (i === 0) { s.cash -= o.c; addMoney(s, "exp", "무인카페 비용", o.c); return [`정리·수리 −${won(o.c)}`, ...applyEffLite(s, { mental: -3 })]; }
    if (i === 1) { st.rating = clamp(st.rating + 0.03, 3.2, 4.95); return [...applyEffLite(s, { hp: -10 }), `${st.name} 별점 +0.03`]; }
    return [setNight(s, st.id, false).msg];
  },
  uc_chain(s, r, i, ok, sc) {
    const st = ucStore(s, sc), K = UC_F30.chain; if (!st) return [];
    if (i === 0) { st.price = clamp(Math.round((st.price - K.cut) * 100) / 100, 0.1, 0.45); return [`${st.name} 한 잔 ${Math.round(st.price * 10000).toLocaleString()}원`]; }
    if (i === 1) { const was = st.bean; st.bean = 1; st.buzz = Math.min(100, (st.buzz || 0) + K.buzz); return [was ? "이미 스페셜티: 맛 홍보만" : "스페셜티 원두로 바꿈(원가 ↑, 체인 영향 절반)", `입소문 +${K.buzz}`]; }
    const ak = st.ak, res = close(s, st.id), next = Object.keys(D.UC_AREAS).filter((k) => k !== ak); const nk = next[(s.t + st.size) % next.length]; search(s, r, nk);
    return [res.msg || "양도", `${D.UC_AREAS[nk].n} 매물 3곳을 받아 뒀어요(보드 '보던 자리')`];
  },
};
// 스태미너·멘탈만 바꾸는 가벼운 효과(core applyEff 를 부르지 않아 순환 import 를 늘리지 않는다)
function applyEffLite(s, e) { const out = []; if (e.hp) { s.hp = clamp(s.hp + e.hp, 0, s.hpMax || 100); out.push(`스태미너 ${e.hp}`); } if (e.mental) { s.mental = clamp(s.mental + e.mental, 0, 100); out.push(`멘탈 ${e.mental}`); } return out; }
