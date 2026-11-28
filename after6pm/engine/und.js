// 업의 이해도: 공통 틀과 회차 이월(11-28). 규칙은 docs/(26-11-27) 처방형_개편_작업규칙.md "업의 이해도와 회차 이월".
// 1) 투잡 등록표(DEF): 키 · 이름 · 부제 · 켜짐 조건 · 하는 중인지 · 점수. 2) 공통 등급 사다리와 "업계 상위 ○%". 3) 회차 이월(끝난 인생의 이해도 가운데 투잡 하나를 골라 다음 회차로).
// 세차·컨설팅·과외는 자기 스위치(CARWASH_ON · CS2_ON · TU2_ON)로 켜지고 점수는 각 엔진이 낸다. 나머지 투잡은 UND_ON 이 켜져야 쌓이고 보인다(1단계: 돈·확률에 닿지 않는다).
// 눈금(모든 투잡 공통): 오토 봇 10년 차 가운데 값 ≈ 1,000점, 20년 차 1,500~2,000점.
import * as D from "./defs.js";
import * as CS from "./cs.js";
import * as CW from "./jobs/carwash.js";
import * as TU from "./jobs/tutoring.js";
import { DOMS as VB_DOMS } from "./jobs/vibe.js";

// 가져가는 비율: 2회차 10% · 3회차 20% · 4회차 30% · 5회차 40% · 6회차부터 50%
export const RATE = [0, 0, 0.1, 0.2, 0.3, 0.4, 0.5];
export const rateOf = (n) => RATE[Math.max(0, Math.min(RATE.length - 1, n | 0))];
// 다른 투잡으로 옮기면 절반만 남는다
export const CROSS = 0.5;

// ── 공통 등급 사다리 ── [문턱, 이름]. 마지막 등급 뒤로는 dan 점마다 "○단"(끝이 열려 있다). topK: 업계 상위 %(게임 속 가상 순위) 곡선의 눈금
export const LADDER = { ranks: [[0, "입문"], [100, "견습"], [300, "숙련"], [600, "전문"], [1000, "장인"], [1500, "명인"]], dan: 600, topK: 400 };
export const topOf = (v) => { const p = 100 * Math.exp(-Math.max(0, v) / LADDER.topK); return p >= 10 ? Math.round(p) : Math.max(0.1, Math.round(p * 10) / 10); };
// { n 등급 이름, i 번호(단이 붙으면 계속 는다), from 이 등급이 시작한 점수, to 다음 등급 문턱, next 다음 등급까지 남은 점수, top 업계 상위 % }
export function rankOf(v) {
  v = Math.max(0, Math.round(v || 0));
  const R = LADDER.ranks, last = R[R.length - 1], dan = LADDER.dan;
  if (v >= last[0]) { const k = Math.floor((v - last[0]) / dan); return { n: k > 0 ? `${last[1]} ${k + 1}단` : last[1], i: R.length - 1 + k, from: last[0] + k * dan, to: last[0] + (k + 1) * dan, next: last[0] + (k + 1) * dan - v, top: topOf(v) }; }
  let i = 0; while (i + 1 < R.length && v >= R[i + 1][0]) i++;
  return { n: R[i][1], i, from: R[i][0], to: R[i + 1][0], next: R[i + 1][0] - v, top: topOf(v) };
}

// ── 새 투잡의 점수 ── 일한 양(raw)을 투잡별 계수(k)로 같은 눈금에 올리고, 처음엔 빨리 · 뒤로 갈수록 천천히 오르게 굽힌다(상한 없음).
// raw = 달마다 쌓는 몫(s.undx[키], tick 이 더한다) + 이미 있는 누적 값에서 읽는 몫(cum). k 는 봇 300판으로 잰 값(10년 차 가운데 값이 1,000점이 되게).
export const SOFT = 1500;
export const soft = (x) => SOFT * (Math.sqrt(1 + 2 * Math.max(0, x) / SOFT) - 1);
const act = (s, k) => (s.sj?.active || []).includes(k);
const last = (o, k) => +o?.last?.[k] || 0;
const sum = (L, f) => (L || []).reduce((a, x) => a + (f(x) || 0), 0);
const many = (L, f) => (L?.length ? sum(L, f) / Math.pow(L.length, 0.7) : 0); // 가게가 여럿일 때: 한 곳 평균 × (곳 수)^0.3. 곳 수를 늘려도 그만큼 다 오르지는 않는다
const baseOf = (s, k) => Math.max(0, Math.round(+s.ng?.und?.[k] || 0)); // 전생에서 가져온 점수(투잡 상태가 s.ng 보다 먼저 만들어지므로 점수를 낼 때 읽는다)
const NEW = {
  pr: { n: "파티룸", sub: "상권 이해", k: 5.92, tick: (s) => many((s.pr?.rooms || []).filter((rm) => rm.status === "open"), (rm) => 1 + (+rm.last?.bookings || 0) / 20),
    note: (s) => `지금 ${s.pr.rooms.length}곳 · 거쳐 간 곳 ${(s.pr.sold || 0) + s.pr.rooms.length}`, how: "지점을 열어 둔 달마다, 예약을 많이 받을수록 쌓여요. 지점이 여럿이면 더 빨리 올라요(두 배로 늘려도 두 배가 되지는 않아요). 숙련(300)부터 매물의 방음과 건물주 성향, 상권 궁합이 미리 보여요. 장인(1,000)부터는 권리금·월세 흥정이 조금 더 잘 통해요." },
  airbnb: { n: "에어씨앤씨", sub: "게스트 이해", k: 3.24, tick: (s) => sum(s.ab?.units, (u) => 1 + (+u.last?.stays || 0) / 10),
    note: (s) => `숙소 ${s.ab.units.length}채`, how: "숙소를 굴린 달마다, 손님을 많이 받을수록 쌓여요. 숙소가 여럿이면 그만큼 빨리 올라요. 숙련(300)부터 진상 손님을 예약 단계에서 알아채 미리 손쓸 수 있어요. 전문(600)부터 후기 답글이 별점에 조금 더 듣고, 한 달 살기 손님이 조금 더 잘 차요." },
  ucafe: { n: "무인카페", sub: "입지 이해", k: 5.68, tick: (s) => many(s.uc?.stores, (st) => 1 + (+st.last?.cups || 0) / 4000),
    note: (s) => `매장 ${s.uc.stores.length}곳${s.uc.moves ? ` · 옮긴 횟수 ${s.uc.moves}` : ""}`, how: "매장을 열어 둔 달마다, 잔 수가 많이 나올수록 쌓여요. 매장이 여럿이면 더 빨리 올라요(두 배로 늘려도 두 배가 되지는 않아요). 숙련(300)부터 보던 자리의 유동인구 지수와 예상 잔 수가 숫자로 보여요. 장인(1,000)부터는 매장을 넘길 때 권리금을 조금 더 받아요." },
  insta: { n: "인별그램", sub: "팔로워 이해", k: 5.46, tick: (s) => (s.ins?.cc ? 1 : 0), /* 11-28 QA: 계정을 만든 뒤에만 쌓임 */ cum: (s) => (s.ins?.posts || 0) + (s.ins?.reels || 0),
    note: (s) => `올린 게시물 ${(s.ins.posts || 0) + (s.ins.reels || 0)}개`, how: "계정을 굴린 달마다, 게시물을 올릴 때마다 쌓여요. 숙련(300)부터 인사이트를 볼 때 숨은 수요 힌트가 한 줄 더 보여요. 전문(600)부터는 협찬 단가를 조금 더 받아 내요." },
  tarot: { n: "타로", sub: "상담 노트", k: 3.22, tick: (s) => 1 + last(s.tarot, "served") / 10,
    note: (s) => `상담 ${(s.tarot.reads || 0).toLocaleString()}건`, how: "상담을 한 달마다, 손님을 많이 볼수록 쌓여요. 전문(600)부터 손님이 단골로 더 잘 남고 단골이 더 자주 다시 찾아요. 장인(1,000)부터 가격에 '심층 리딩'이 열려요." },
  webnovel: { n: "웹소설", sub: "독자 이해", k: 2.96, tick: (s) => 1 + last(s.webnovel, "up") / 4,
    note: (s) => `올린 화 ${(s.webnovel.ups || 0).toLocaleString()}화 · 완결 ${s.webnovel.done || 0}편`, how: "연재한 달마다, 올린 화 수만큼 쌓여요. 숙련(300)부터 기획을 확정하기 전에 독자 반응 예고(쪽박 경고)가 보여요. 전문(600)부터는 고쳐 쓸 때 어느 소재가 나을지 보이고 독자를 조금 더 지켜요." },
  chicken: { n: "치킨집", sub: "매장 운영 감", k: 4.63, tick: (s) => sum(s.chicken?.stores, (st) => 1 + (+st.last?.orders || 0) / 1000),
    note: (s) => `매장 ${s.chicken.stores.length}곳`, how: "매장을 연 달마다, 주문을 많이 받을수록 쌓여요. 전문(600)부터 폐기와 숨은 인건비가 조금 줄어요. 장인(1,000)부터는 가맹 계약 갱신 때 장부로 조건을 다시 쓰는 선택지가 생겨요." },
  petsit: { n: "방문 펫시팅", sub: "돌봄 노트", k: 3.36, tick: (s) => 1 + last(s.petsit, "homes") / 3,
    note: (s) => `돌보는 집 ${s.petsit.homes.length}곳 · 후기 ${Math.floor(s.petsit.reviews || 0)}개`, how: "돌봄을 나간 달마다, 맡은 집이 많을수록 쌓여요. 숙련(300)부터 노령·대형 같은 까다로운 집을 한 곳 더 맡을 수 있고, 사고가 났을 때 수습 판정이 쉬워져요. 전문(600)부터 직원을 가르치는 속도가 붙어 사람 챙기기 한 번에 네 명까지 챙겨요." },
  buying: { n: "해외 구매대행", sub: "품목 이해", k: 2.75, tick: (s) => 1 + last(s.buying, "paidN") / 20 + last(s.buying, "soldM") / 100 + (s.buying?.items?.length || 0) * 0.2,
    note: (s) => `다루는 품목 ${s.buying.items.length}개 · 처리한 주문 ${(s.buying.done || 0).toLocaleString()}건`, how: "주문을 처리한 달마다, 다루는 품목과 판 수량이 많을수록 쌓여요. 숙련(300)부터 아이템을 찾을 때 반품률과 인증 위험이 정확한 숫자로 보여요. 장인(1,000)부터 새 분야에 들어갈 때 규격 설명이 10에서 시작해요." },
  // 취미 모임은 봇이 없어 재지 못했다. 어림: 회원 20~30명이면 달마다 3~4, 10년(114달)에 약 400 → 1,333 ÷ 400 ≈ 3.3. 봇이 생기면 다시 맞춘다
  club: { n: "취미 모임", sub: "회원 이해", k: 3.3, tick: (s) => (s.club?.kind ? 1 + last(s.club, "members") / 10 : 0),
    note: (s) => `회원 ${Math.round(s.club.members || 0)}명`, how: "모임을 굴린 달마다, 회원이 많을수록 쌓여요. 숙련(300)부터 다음 달에 나갈 것 같은 회원 수와 까닭이 미리 보이고, 정원을 10% 더 받을 수 있어요." },
  // 바이브코딩: 업의 이해도(개발 감각) = 도메인 이해도(합) + 일을 한 횟수(끝낸 의뢰 수). 달마다 쌓는 몫은 없다
  vibe: { n: "바이브코딩", sub: "개발 감각", k: 17.1, cum: (s) => (s.vibe?.delivered || 0) + VIBE_DOM * vibeDomSum(s),
    note: (s) => `끝낸 의뢰 ${s.vibe.delivered || 0}건 · 도메인 이해도 합 ${Math.round(vibeDomSum(s))}`, how: "의뢰를 끝낼 때마다 쌓이고, 도메인 이해도가 오른 만큼 더해져요(도메인 이해도 1점 = 의뢰 0.15건 몫). 도메인 이해도는 6년 차부터 분야를 정하고 그 업계 일을 하거나 사람을 만나면 올라요. 전문(600)부터 견적이 정확해져 의뢰마다 범위가 늘 위험이 보이고, 수정 요청과 재작업이 조금 줄어요. 장인(1,000)부터는 도메인 밖 문의가 덜 줄어요." },
};
export const VIBE_DOM = 0.15;
export const vibeDomSum = (s) => sum(Object.values(s.vibe?.dom?.u || {}), (v) => +v);
// 바이브코딩 도메인 이해도(업종별): [{ k, n, v(0~100), on 지금 고른 분야인지 }]
export const vibeDoms = (s) => { const dm = s.vibe?.dom; if (!dm) return []; const pk = dm.picks || []; return [...new Set([...pk, ...Object.keys(dm.u || {})])].map((k) => ({ k, n: VB_DOMS[k]?.n || k, v: Math.round(+dm.u?.[k] || 0), on: pk.includes(k) })); };
const rawOf = (s, k) => (+s.undx?.[k] || 0) + (NEW[k].cum ? NEW[k].cum(s) || 0 : 0);
const ownOf = (s, k) => (s[KEYS[k] || k] ? soft(NEW[k].k * rawOf(s, k)) : 0);
const KEYS = { insta: "ins", airbnb: "ab", ucafe: "uc" }; // 상태가 든 자리(나머지는 s[키])
const newDef = (k) => ({ on: () => D.UND_ON && !!D.SIDEJOBS[k]?.play, n: NEW[k].n, sub: NEW[k].sub, isNew: true,
  has: (s) => act(s, k) || ownOf(s, k) >= 0.5, v: (s) => baseOf(s, k) + ownOf(s, k), base: (s) => baseOf(s, k) });

const DEF = {
  cs: { on: () => D.CS2_ON, n: "취업컨설팅", sub: "합격 사례집", has: (s) => !!s.cs?.c2 && !!s.cs.open, v: (s) => CS.understanding(s).v },
  carwash: { on: () => D.CARWASH_ON, n: "출장 세차", sub: "처방 노트", has: (s) => !!s.carwash && (s.sj?.active || []).includes("carwash"), v: (s) => CW.understanding(s).v },
  tutoring: { on: () => D.TU2_ON, n: "화상과외", sub: "수업 적합도", has: (s) => (s.sj?.active || []).includes("tutoring"), v: (s) => TU.understanding(s).v },
};
const OLD_U = { cs: (s) => CS.understanding(s), carwash: (s) => CW.understanding(s), tutoring: (s) => TU.understanding(s) };
for (const k of Object.keys(NEW)) DEF[k] = newDef(k);
export const jobs = () => Object.keys(DEF).filter((k) => DEF[k].on());
export const nameOf = (k) => DEF[k]?.n || k;
export const subOf = (k) => DEF[k]?.sub || "";
export const isNew = (k) => !!DEF[k]?.isNew;

// 달마다 한 번(core.endMonth, UND_ON 일 때만): 하고 있는 새 투잡의 이번 달 일한 양을 s.undx[키] 에 더한다. 난수를 쓰지 않고 다른 값을 건드리지 않는다
export function tick(s) {
  if (!D.UND_ON) return;
  for (const k of Object.keys(NEW)) {
    const N = NEW[k]; if (!N.tick || !DEF[k].on() || !act(s, k) || !s[KEYS[k] || k]) continue;
    let g = 0; try { g = +N.tick(s) || 0; } catch (e) { g = 0; }
    if (g > 0) { s.undx = s.undx || {}; s.undx[k] = Math.round(((s.undx[k] || 0) + g) * 1000) / 1000; }
  }
}

// ── 예전 저장 채우기(11-28 QA) ── 이해도가 없던 때(s.undx 없음)의 저장을 열면 오래 한 투잡도 0점 "입문"에서 시작한다.
// 불러올 때 한 번만(core.load), 그 투잡을 한 기간과 지금 상태로 "새 규칙으로 같은 기간을 했다면 쌓였을 양"을 어림해 s.undx 에 채운다. 후하지 않게 BF 배.
// 한 달 몫은 지금 상태로 tick 을 한 번 돌려 본 값(없으면 1). 처음에는 규모가 작았을 것이라 BF_RAMP 로 한 번 더 깎는다(봇으로 실제 쌓인 값과 견줘 맞춘 값).
// 문턱 알림(fxNote)이 불러오자마자 쏟아지지 않게 그 투잡 상태의 undFx 도 채운 점수까지 본 것으로 맞춘다.
export const BF = 0.8;
const BF_RAMP = { pr: 0.95, airbnb: 0.85, ucafe: 0.92, buying: 0.93 }; // 봇 80판: 어림 ÷ 실제의 가운데 값이 1 근처가 되게(안 적힌 투잡은 1)
const since = (s, k) => { const t0 = s.sj?.rp?.[k]?.t0; return typeof t0 === "number" ? Math.max(0, (s.t || 0) - t0) : 0; };
const bfMonths = (s, k) => { const st = s[KEYS[k] || k] || {}, m = +st.months || 0; // 그 투잡을 한 달 수: 상태에 적힌 달 수가 있으면 그것, 없으면 시작한 달부터
  if (k === "chicken") return Math.max(0, ...(st.stores || []).map((x) => +x.months || 0), 0);
  if (k === "insta") return st.cc ? since(s, k) : 0;
  if (k === "pr") return (st.rooms || []).length || st.sold ? since(s, k) : 0;
  if (k === "airbnb") return (st.units || []).length ? since(s, k) : 0;
  if (k === "ucafe") return (st.stores || []).length || st.moves ? since(s, k) : 0;
  if (k === "webnovel") return st.ups ? since(s, k) : 0;
  return m || 0; };
export function bfRaw(s, k) { // 어림한 raw(BF 를 곱하기 전)
  const N = NEW[k], st = s[KEYS[k] || k]; if (!N?.tick || !st) return 0;
  const m = bfMonths(s, k); if (!(m > 0)) return 0;
  if (k === "tarot") return m + (+st.reads || 0) / 13; // 누적 상담 수 가운데 손님으로 센 몫(봇: 13건에 1)
  if (k === "webnovel") return m + (+st.ups || 0) / 4;
  let g = 0; try { g = +N.tick(s) || 0; } catch (e) { g = 0; }
  return m * Math.max(1, g) * (BF_RAMP[k] || 1);
}
export function backfill(s) {
  if (!D.UND_ON || !s || s.undx) return false;
  const out = {};
  for (const k of Object.keys(NEW)) { if (!NEW[k].tick || !DEF[k].on()) continue; let x = 0; try { x = bfRaw(s, k) * BF; } catch (e) { x = 0; } if (x >= 1) out[k] = Math.round(x * 1000) / 1000; }
  if (Object.keys(out).length) s.undx = out;
  // 문턱 알림 맞추기: 아직 한 번도 알린 적 없는(undFx 없음) 투잡만. 누적 값으로 점수가 나오는 바이브코딩 · 인별도 여기서 맞춘다
  let fx = false;
  for (const k of Object.keys(NEW)) { if (!DEF[k].on()) continue; const st = s[KEYS[k] || k]; if (!st || st.undFx != null) continue; const v = score(s, k), th = Math.max(0, ...Object.values(TH).filter((t) => t <= v)); if (th > 0) { st.undFx = th; fx = true; } }
  if (fx && !s.undx) s.undx = {}; // 한 번만
  return !!s.undx;
}

// 한 투잡의 지금 모습: { k, n, sub, note 부제 옆 한 줄, v 점수, base 전생에서 가져온 몫, has 이번 판에 했는지, on 지금 하는 중인지, rank(공통 사다리), how 어떻게 오르나, doms(바이브코딩만) }
// 스위치가 꺼져 있거나 모르는 키면 null
export function info(s, k) {
  const d = DEF[k]; if (!d || !d.on() || !s) return null;
  let v = 0, base = 0, note = "", has = false;
  try {
    has = !!d.has(s);
    if (d.isNew) { v = Math.round(d.v(s)); base = d.base(s); note = s[KEYS[k] || k] && has ? NEW[k].note(s) : ""; }
    else { const U = OLD_U[k](s) || {}; v = Math.round(U.v || 0); base = Math.round(U.base || 0); note = has ? U.sub || "" : ""; if (note.startsWith(d.sub)) note = note.slice(d.sub.length).trim();
      if (!has && !v) { const b = baseOf(s, k); if (b) { v = b; base = b; } } } // 11-28 전생에서 가져온 점수는 시작(개업) 전에도 보인다(세차 · 컨설팅도 과외 · 새 투잡과 같게). 시작하면 각 엔진이 자기 undBase 로 센다
  } catch (e) { return null; }
  return { k, n: d.n, sub: d.sub, note, v, base, has, on: act(s, k), rank: rankOf(v), how: d.isNew ? NEW[k].how : "", doms: k === "vibe" ? vibeDoms(s) : null };
}
// 이번 판에 한(또는 전생에서 가져온) 투잡 전부. 하는 중인 것이 앞, 그다음 점수 순
export function list(s) { return jobs().map((k) => info(s, k)).filter((x) => x && (x.has || x.v > 0)).sort((a, b) => Number(b.on) - Number(a.on) || b.v - a.v); }

// 인생이 끝날 때: 이번 판에 한 투잡의 이해도 { 키: 점수 }
export function endRec(s) {
  const out = {};
  for (const k of jobs()) if (DEF[k].has(s)) { const v = Math.round(DEF[k].v(s) || 0); if (v > 0) out[k] = v; }
  return out;
}

// 다음 회차(n)에서 고를 수 있는 것: [{ k 받는 투잡, v 가져갈 점수, from 점수가 나온 투잡, src 원래 점수, cross 옮겼는지 }]
export function options(und, n) {
  const r = rateOf(n), L = [];
  if (!und || r <= 0) return L;
  for (const t of jobs()) {
    let best = null;
    for (const [k, src] of Object.entries(und)) {
      if (!DEF[k] || !(src > 0)) continue;
      const v = Math.round(k === t ? src * r : src * r * CROSS);
      if (v > 0 && (!best || (best.cross && (k === t || v > best.v)))) best = { k: t, v, from: k, src, cross: k !== t }; // 11-28 지난 생에 하던 투잡은 늘 같은 투잡 몫으로(옮김이 조금 커도)
    }
    if (best) L.push(best);
  }
  return L.sort((a, b) => Number(a.cross) - Number(b.cross) || b.v - a.v);
}
export const pick = (und, n, k) => options(und, n).find((o) => o.k === k) || null;

// 11-28 이해도 효과용 도우미: 점수와 "문턱을 넘었나". 스위치가 꺼졌거나 모르는 투잡이면 0 / false 라 끈 상태는 예전 그대로다.
export const score = (s, k) => (DEF[k] && DEF[k].on() ? info(s, k)?.v || 0 : 0);
export const at = (s, k, th) => score(s, k) >= th;
export const TH = { 견습: 100, 숙련: 300, 전문: 600, 장인: 1000, 명인: 1500 };
// 11-28 이해도 효과 알림(타로 · 펫시팅 · 구매대행 · 취미 모임): 문턱을 넘은 달에 한 줄. st = 그 투잡 상태, L = [[문턱, 글]]. 이미 알린 가장 높은 문턱을 st.undFx 에 적는다(스위치가 꺼져 있으면 아무것도 안 적는다)
export function fxNote(s, k, st, notes, L) {
  if (!st || !DEF[k] || !DEF[k].on()) return;
  const v = score(s, k);
  for (const [th, txt] of L) if (v >= th && (st.undFx || 0) < th) { st.undFx = th; notes.push(`${DEF[k].n}: 업의 이해도가 ${rankOf(th).n}(${th.toLocaleString()})에 닿았어요. ${txt}`); }
}
