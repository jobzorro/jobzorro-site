// 치킨 브랜드(11-23). 가맹 상담 전에 브랜드를 고른다. 브랜드마다 주문·재료비·창업비·광고 분담금·리뉴얼·본사 위험이 다르다.
// 브랜드 인기는 판마다 해마다 따로 흘러간다(s.chicken.bf). 뜨는 브랜드가 식기도 하고, 싼 브랜드가 올라오기도 한다 → 해마다 1월에 업계 순위 소식.
// 몇 해에 한 번 다른 브랜드 본사가 "간판을 바꾸자"고 제안한다(갈아타기·지금 본사와 협상·거절). 그 선택이 맞을지는 그 뒤 인기가 정한다.
// chicken.js 가 f(s)·dem(s)·name(s) 를 읽고, month 에서 brandMonth 를 부른다. onChoose 는 "chb_ev"(CHB_CHOOSE, core.js 에 등록).
import * as D from "../defs.js";
import * as SYN from "../syn.js";
import { addMoney, log, won, jo } from "../core.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// dem: 주문 배수 · mat: 재료비(매출 대비) · cost: 공시 창업비 배수 · ad: 본사 광고 분담금(매출 대비) · renew: 리뉴얼비 배수 · risk: 본사 논란 확률 배수 · near: 근접 출점 확률 배수
// drift: 인기가 해마다 흘러가는 방향 · vol: 흔들리는 폭
export const BRANDS = {
  gold: { n: "황금닭", tag: "무난한 중견", dem: 1.0, mat: 0.46, cost: 1.0, ad: 0, renew: 1.0, risk: 1.0, near: 1.0, drift: 0, vol: 0.035,
    pro: "어디 하나 빠지지 않는다", con: "어디 하나 뛰어나지도 않다", line: "가맹점 800곳. 십 년째 순위 중간을 지킨다." },
  king: { n: "킹스닭", tag: "업계 1위", dem: 1.13, mat: 0.49, cost: 1.25, ad: 0.012, renew: 1.3, risk: 0.6, near: 1.6, drift: 0.003, vol: 0.025,
    pro: "간판만 달아도 주문이 온다(주문 +13%)", con: "창업비 +25%, 재료비 49%, 광고 분담금 1.2%, 옆 동네에 같은 간판이 잘 생긴다", line: "가맹점 2,000곳. TV 광고를 본사가 돌리고 값은 점주가 낸다." },
  hot: { n: "화르르치킨", tag: "지금 뜨는 신생", dem: 1.28, mat: 0.44, cost: 0.85, ad: 0.01, renew: 1.0, risk: 1.6, near: 0.8, drift: -0.02, vol: 0.06,
    pro: "지금 제일 잘 팔린다(주문 +28%), 창업비 −15%", con: "유행은 식는다. 본사가 젊어 사고가 잦다", line: "생긴 지 3년에 가맹점 400곳. 매운맛 한 가지로 줄을 세웠다." },
  cheap: { n: "한마리집", tag: "저가 소형", dem: 0.84, mat: 0.44, cost: 0.65, ad: 0, renew: 0.5, risk: 0.8, near: 1.2, drift: 0.006, vol: 0.04,
    pro: "창업비 −35%, 재료비 44%, 광고 분담금 없음", con: "주문 −16%. 본사가 해 주는 게 없다", line: "만 원대 한 마리. 가맹점 600곳. 본사 직원이 스무 명이다." },
};
// 제안 간격(달)·첫 제안까지·전환비(매장당, 물가 전)·본사 지원 비율·위약금(매장당)·공사 달 주문 감소·단골 이탈(별점)·협상 성공 때 재료비 인하·말빨 기준
export const CHB_BAL = { offer: [48, 72], first: 24, swap: { deliv: 1500, hall: 2400 }, support: 0.6, penalty: 500, lost: 0.15, star: 0.1, fresh: 18, nego: 0.02, dc: 55, bfCap: 0.25 };
if (typeof process !== "undefined" && process.env?.CHBB) Object.assign(CHB_BAL, JSON.parse(process.env.CHBB)); // 봇 시험용

export const cur = (s) => (BRANDS[s.chicken?.brand] ? s.chicken.brand : "gold"); // 예전 판은 황금닭
export const f = (s) => BRANDS[cur(s)];
export const name = (s) => f(s).n;
const bf = (s, k) => s.chicken?.bf?.[k] || 0;
export const demOf = (s, k) => BRANDS[k].dem * (1 + bf(s, k));
// 킹스닭 대박 메뉴(11-23): 킹스닭 점주는 한 판에 한 번 반드시 겪는다. hitMo 달 동안 주문 +hit, 그 뒤로도 +keep 이 남는다
export const KING_HIT = { at: [30, 84], hit: 0.2, hitMo: 24, keep: 0.06 };
if (typeof process !== "undefined" && process.env?.KINGHIT) Object.assign(KING_HIT, JSON.parse(process.env.KINGHIT)); // 봇 시험용
const kingBoost = (s) => { const h = s.chicken?.kingHit; return h && cur(s) === "king" ? (s.t < h.until ? KING_HIT.hit : KING_HIT.keep) : 0; };
export const dem = (s) => demOf(s, cur(s)) * (1 + kingBoost(s));
const pct = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;
// 업계 순위(지금 인기 순)
export function rank(s) { return Object.keys(BRANDS).map((k) => ({ k, n: BRANDS[k].n, v: demOf(s, k), mine: k === cur(s) && !!s.chicken?.brand })).sort((a, b) => b.v - a.v); }

// 가맹 상담 전: 브랜드 고르기
export function pickScene(s) {
  const pi = SYN.pi(s), ks = Object.keys(BRANDS);
  const row = (k) => { const B = BRANDS[k]; return `· ${B.n}(${B.tag}): ${B.line} 지금 주문 ${pct(demOf(s, k) - 1)}, 재료비 ${Math.round(B.mat * 100)}%, 공시 창업비 ${won(Math.round(5000 * B.cost * pi))}${B.ad ? `, 광고 분담금 ${(B.ad * 100).toFixed(1)}%` : ""}.`; };
  return { kind: "event", tag: "브랜드 선택", title: "어느 간판을 달 것인가", onChoose: "chb_ev", chb: "pick",
    text: `창업 박람회. 부스마다 "월 순이익 천만 원"이라고 적혀 있다. 브랜드를 정하면 십 년을 같이 간다. 본사가 버는 방식이 다 다르다.\n${ks.map(row).join("\n")}\n${s.chicken?.pickA ? `내가 고른 자리는 ${AREAS[s.chicken.pickA.ai].n}. ${fitLines(s, s.chicken.pickA.ai)}` : ""}\n(브랜드 인기는 해마다 달라져요. 지금 1등이 십 년 뒤에도 1등일지는 아무도 몰라요. 나중에 다른 본사가 간판을 바꾸자고 제안하기도 해요)`,
    choices: ks.map((k) => ({ t: `${BRANDS[k].n} · ${BRANDS[k].tag}`, eff: {}, text: `${BRANDS[k].n} 부스에 앉았다. 좋은 점: ${BRANDS[k].pro}. 걸리는 점: ${BRANDS[k].con}.`, chbK: k, fitV: s.chicken?.pickA ? fitRaw(s, s.chicken.pickA.ai, k) * demOf(s, k) : 1 })) };
}

const swapCost = (s, to) => { const B = CHB_BAL, pi = SYN.pi(s); return Math.round(s.chicken.stores.reduce((a, st) => a + B.swap[st.type === "hall" ? "hall" : "deliv"], 0) * BRANDS[to].cost * (1 - B.support) * pi / 10) * 10; };
const penalty = (s) => Math.round(s.chicken.stores.length * CHB_BAL.penalty * ((s.chicken.risk || 0) >= 2 ? 2 : 1) * SYN.pi(s) / 10) * 10; // 계약서를 안 읽고 서명했으면 위약금 두 배

function offerScene(s, to) {
  const C = s.chicken, B = CHB_BAL, T = BRANDS[to], N = f(s), c0 = swapCost(s, to), pen = penalty(s), n = C.stores.length;
  const up = demOf(s, to) / dem(s) - 1;
  return { kind: "event", tag: "브랜드 제안", title: `${T.n} 본사에서 전화가 왔다`, onChoose: "chb_ev", chb: "offer", chbTo: to,
    text: `"사장님 매장 자리가 좋더라고요. 간판을 ${T.n}으로 바꾸시죠. 교체비의 ${Math.round(B.support * 100)}%는 본사가 냅니다." ${T.line}\n지금 ${N.n}: 주문 ${pct(dem(s) - 1)}, 재료비 ${Math.round(N.mat * 100)}%${N.ad ? `, 광고 분담금 ${(N.ad * 100).toFixed(1)}%` : ""}.\n${T.n}: 주문 ${pct(demOf(s, to) - 1)}, 재료비 ${Math.round(T.mat * 100)}%${T.ad ? `, 광고 분담금 ${(T.ad * 100).toFixed(1)}%` : ""}.\n(갈아타면 매장 ${n}곳 교체비 ${won(c0)} + 지금 본사 위약금 ${won(pen)}${(C.risk || 0) >= 2 ? "(계약서를 안 읽고 서명해서 두 배)" : ""}. 공사하는 달 주문 −${Math.round(B.lost * 100)}%, 단골 일부가 떠나요. 지금 인기로는 주문이 ${pct(up)} 달라져요. 인기는 해마다 변해요)`,
    choices: [
      { t: `${T.n}으로 간판을 바꾼다 (${won(c0 + pen)})`, eff: { cash: -(c0 + pen), mental: -3, hp: -4 }, text: `간판을 내리던 날, ${N.n} 슈퍼바이저가 말없이 서류를 받아 갔다. 새 간판에 불이 들어왔다.`, chbA: "swap" },
      { t: `제안서를 들고 ${N.n} 본사와 협상한다 (말빨 판정)`, check: { stat: "talk", dc: B.dc }, ok: { text: `"다른 데서 제안이 왔다고요?" 슈퍼바이저가 본사에 전화를 걸었다. 물류 단가가 내려갔다.`, eff: {} }, ng: { text: "\"계약 기간이 남아 있습니다, 사장님.\" 얻은 게 없다. 슈퍼바이저 눈빛만 차가워졌다.", eff: { mental: -3 } }, chbA: "nego" },
      { t: "거절한다", eff: {}, text: "명함만 받아 서랍에 넣었다. 지금 간판으로 간다.", chbA: "keep" }] };
}

export function brandMonth(s, r, notes, scenes) {
  const C = s.chicken; if (!C) return; const B = CHB_BAL;
  C.bf = C.bf || {};
  // 해마다 1월: 브랜드 인기가 움직인다 + 업계 순위 소식
  if (s.cal === 1) {
    const before = rank(s).map((x) => x.k);
    for (const [k, b] of Object.entries(BRANDS)) C.bf[k] = clamp((C.bf[k] || 0) + b.drift + b.vol * r.normal(), -B.bfCap, B.bfCap);
    if (C.stores.length) { const R = rank(s), me = R.findIndex((x) => x.k === cur(s)), was = before.indexOf(cur(s));
      notes.push(`[치킨 업계 순위] ${R.map((x, i) => `${i + 1}위 ${x.n}`).join(" · ")}. 내 ${name(s)}은 ${me + 1}위${me < was ? "로 올라왔어요" : me > was ? "로 내려갔어요" : "예요"}(주문 ${pct(dem(s) - 1)}).`); }
  }
  if (!C.stores.length) return;
  const mo = Math.max(...C.stores.map((x) => x.months));
  // 킹스닭 대박 메뉴: 반드시 한 번
  if (cur(s) === "king" && !C.kingHit) {
    if (C.kingHitAt == null) C.kingHitAt = r.int(KING_HIT.at[0], KING_HIT.at[1]);
    if (mo >= C.kingHitAt && !scenes.some((q) => q.kind === "event" || q.warn)) {
      C.kingHit = { t: s.t, until: s.t + KING_HIT.hitMo }; log(s, "킹스닭 신메뉴가 대박이 났다.", "work");
      scenes.push({ kind: "story", tag: "대박 메뉴", title: "킹스닭 신메뉴가 터졌다", text: `본사가 내놓은 신메뉴가 너튜브에서 터졌다. 먹방마다 그 상자가 나온다. 저녁 여섯 시면 재료가 떨어지고, 가게 앞에 포장 줄이 선다. 광고 분담금이 아깝지 않은 달이 처음 왔다.
(킹스닭 주문 +${Math.round(KING_HIT.hit * 100)}%가 ${KING_HIT.hitMo}개월 가요. 유행이 지나도 +${Math.round(KING_HIT.keep * 100)}%는 남아요)`, choices: [{ t: "닭을 더 받아 놓는다", eff: { mental: 4 }, text: "" }] });
    }
  }
  // 다른 브랜드의 갈아타기 제안
  if (C.bOfferT == null) C.bOfferT = s.t + Math.max(0, B.first - mo) + r.int(0, 12);
  areaMonth(s, r, notes, scenes);
  if (false && s.t >= C.bOfferT && mo >= B.first && !scenes.some((q) => q.kind === "event" || q.warn)) { // 11-23 평소 제안은 없앴다: 브랜드 교체는 계약 갱신 때만(areaMonth)
    C.bOfferT = s.t + r.int(B.offer[0], B.offer[1]);
    const others = Object.keys(BRANDS).filter((k) => k !== cur(s));
    scenes.push(offerScene(s, r.pick(others)));
  }
}

// ── 상권(11-23): 매장 자리를 고르고, 그 상권의 손님 구성에 맞는 브랜드를 고른다. 손님 구성은 23년 동안 바뀐다(인구 구조) ──
// 상권 분석(ch_survey)은 창업 전과 가맹 계약 갱신 석 달 전에만 열린다. 분석을 안 하면 손님 구성을 모른 채 고른다.
// 계약은 3~5년. 갱신 석 달 전에 경고가 뜨고, 갱신 달에 재계약·다른 브랜드로 교체·본사와 협상 중에 고른다(평소에는 못 바꾼다).
// 손님 구성과 브랜드가 안 맞아도 입소문(buzz)을 쌓으면 그 차이의 절반 남짓을 메운다(선택 뒤의 운영으로 보정).
export const SEGS = ["1인 가구", "가족", "직장인", "학생"];
// mix: 지금 손님 구성 · d: 해마다 바뀌는 폭 · pop: 해마다 상권 크기 변화 · rent: 임차료 배수 · key: 권리금 배수
export const AREAS = [
  { n: "역세권 원룸촌", mix: [0.55, 0.05, 0.25, 0.15], d: [0.004, 0, -0.001, -0.003], pop: 0.003, rent: 1.05, line: "혼자 사는 직장인과 학생. 밤늦게까지 주문이 온다" },
  { n: "새 아파트 단지", mix: [0.1, 0.65, 0.15, 0.1], d: [0.005, -0.009, 0.004, 0], pop: 0, rent: 1.0, line: "아이 있는 집이 많다. 주말 저녁이 대목" },
  { n: "구도심 먹자골목", mix: [0.2, 0.15, 0.55, 0.1], d: [0.007, 0, -0.007, 0], pop: -0.01, rent: 0.85, line: "퇴근길 회식 손님. 월세가 싸다" },
  { n: "대학가", mix: [0.25, 0.05, 0.1, 0.6], d: [0.008, 0, 0.002, -0.01], pop: -0.008, rent: 0.9, line: "학생이 대부분. 방학에 비고 값에 민감하다" },
  { n: "신도시 상가", mix: [0.15, 0.5, 0.25, 0.1], d: [0.002, -0.004, 0.003, -0.001], pop: 0.01, rent: 1.15, line: "입주가 이어지는 동네. 월세가 비싸다" },
];
// 브랜드가 손님층마다 얼마나 먹히나
export const AFF = { gold: [1.0, 1.0, 1.05, 0.95], king: [0.92, 1.18, 1.02, 0.9], hot: [1.08, 0.85, 0.95, 1.2], cheap: [1.15, 0.9, 0.88, 1.12] };
// term: 계약 기간(달) · warn: 갱신 몇 달 전에 알리고 상권 분석을 여나 · noise: 판마다 다른 변화 폭 · cover: 입소문으로 메우는 정도 · reFee: 재계약비(매장당) · fcst: 전망 햇수
export const AREA_BAL = { term: [36, 60], warn: 3, noise: 0.004, cover: 0.6, reFee: 150, fcst: 5 };
const areaOf = (st) => { const i = typeof st.ai === "number" ? st.ai : AREAS.findIndex((a) => a.n === st.area); return i < 0 ? 0 : i; };
export function mixAt(s, ai, t = s.t) {
  const A = AREAS[ai], nz = s.chicken?.az?.[ai] || [0, 0, 0, 0], y = t / 12;
  const m = A.mix.map((v, i) => Math.max(0.02, v + (A.d[i] + nz[i]) * y)), sum = m.reduce((a, b) => a + b, 0);
  return m.map((v) => v / sum);
}
export const popAt = (s, ai, t = s.t) => clamp(1 + AREAS[ai].pop * (t / 12), 0.75, 1.3);
// 그 상권에서 그 브랜드가 얼마나 맞나(1 = 보통)
export function fitRaw(s, ai, brand, t = s.t) { const m = mixAt(s, ai, t), a = AFF[brand] || AFF.gold; return m.reduce((x, v, i) => x + v * a[i], 0); }
// 매장의 주문 배수: 브랜드 궁합 × 상권 크기. 안 맞는 만큼은 입소문으로 일부 메운다
export function fitOf(s, st) {
  const ai = areaOf(st), f = fitRaw(s, ai, cur(s)), eff = f < 1 ? f + (1 - f) * AREA_BAL.cover * clamp((st.buzz || 0) / 100, 0, 1) : f;
  return eff * popAt(s, ai);
}
function initArea(s, r) { const C = s.chicken; if (!C.az) C.az = AREAS.map(() => [0, 1, 2, 3].map(() => +(AREA_BAL.noise * r.normal()).toFixed(4))); }
// 부동산 발품: 후보 자리 셋
export function scout(s, r) { const C = s.chicken; initArea(s, r); if (!C.cands) C.cands = r.shuffle([0, 1, 2, 3, 4]).slice(0, 3).map((ai) => ({ ai, loc: +r.range(0.9, 1.12).toFixed(2) })); return C.cands; }
// 상권 분석을 할 수 있는 때: 창업 전, 계약 갱신 석 달 전
export function surveyOpen(s) { const C = s.chicken; return !C.stores.length || (C.ctT != null && C.ctT - s.t <= AREA_BAL.warn); }
export function survey(s, r) {
  const C = s.chicken; initArea(s, r); const B = AREA_BAL, err = clamp(0.5 - (s.st.num || 0) / 250, 0.1, 0.5); // 숫자 능력치가 높을수록 전망이 정확
  const ais = C.stores.length ? [...new Set(C.stores.map(areaOf))] : scout(s, r).map((c) => c.ai);
  C.sv = C.sv || {};
  for (const ai of ais) { const now = mixAt(s, ai), tr = mixAt(s, ai, s.t + B.fcst * 12); C.sv[ai] = { t: s.t, mix: now.map((v) => +v.toFixed(3)), next: tr.map((v, i) => +clamp(v + (v - now[i]) * err * r.normal(), 0.02, 0.9).toFixed(3)), pop: +popAt(s, ai, s.t + B.fcst * 12).toFixed(3) }; }
  return ais;
}
const fresh = (s, ai) => { const v = s.chicken?.sv?.[ai]; return v && s.t - v.t <= 6 ? v : null; };
const mixT = (m) => SEGS.map((n, i) => `${n} ${Math.round(m[i] * 100)}%`).join(" · ");
const fitT = (f) => `${f >= 1 ? "+" : "−"}${Math.abs(Math.round((f - 1) * 100))}%`;
// 분석한 상권이면 브랜드별 궁합(지금·5년 뒤)을 글로
function fitLines(s, ai) {
  const v = fresh(s, ai); if (!v) return "(상권 분석을 안 해서 이 동네 손님 구성을 몰라요)";
  const fx = (m, k) => m.reduce((x, p, i) => x + p * AFF[k][i], 0);
  return `(손님 구성: ${mixT(v.mix)}. ${AREA_BAL.fcst}년 뒤 전망: ${mixT(v.next)}, 상권 크기 ${fitT(v.pop)})\n(브랜드 궁합 지금→${AREA_BAL.fcst}년 뒤: ${Object.keys(BRANDS).map((k) => `${BRANDS[k].n} ${fitT(fx(v.mix, k))}→${fitT(fx(v.next, k))}`).join(", ")})`;
}
// 창업 전: 자리 고르기
export function areaScene(s, r) {
  const cs = scout(s, r);
  return { kind: "event", tag: "부동산 발품", title: "어느 동네에 낼 것인가", onChoose: "chb_ev", chb: "area",
    text: `부동산 세 곳을 돌았다. 자리마다 사는 사람이 다르고, 사는 사람이 다르면 팔리는 치킨이 다르다.\n${cs.map((c) => `· ${AREAS[c.ai].n}: ${AREAS[c.ai].line}. 임차료 ×${AREAS[c.ai].rent}\n  ${fitLines(s, c.ai)}`).join("\n")}\n(동네 손님 구성은 해마다 조금씩 바뀌어요. 고른 뒤에는 가맹 계약 갱신 때만 브랜드를 바꿀 수 있어요)`,
    choices: cs.map((c) => ({ t: AREAS[c.ai].n, eff: {}, text: `${AREAS[c.ai].n}의 빈 점포 앞에 섰다. 유리창에 '임대' 종이가 붙어 있다.`, chbA: c.ai, fitV: 1 })) };
}
// 갱신 석 달 전 경고
export function renewWarn(s) {
  const C = s.chicken;
  return { kind: "story", tag: "가맹 계약", warn: { head: "석 달 뒤 가맹 계약이 끝난다", sub: `${name(s)} · 상권을 분석해야 한다` }, title: "석 달 뒤 가맹 계약 갱신",
    text: `본사에서 우편이 왔다. "가맹 계약 만료 ${AREA_BAL.warn}개월 전입니다." 재계약할지, 다른 브랜드로 갈지 정할 때다. 문을 연 뒤로 동네가 꽤 변했다.\n(지금부터 갱신 달까지 '상권 분석'이 열려요. 분석하면 지금 손님 구성과 ${AREA_BAL.fcst}년 뒤 전망, 브랜드별 궁합이 보여요. 안 하면 모르고 골라야 해요. 브랜드는 갱신 때만 바꿀 수 있어요)`,
    choices: [{ t: "달력에 적어 둔다", eff: {}, text: "" }] };
}
// 갱신 달: 재계약 · 다른 브랜드(제안 둘) · 협상
export function renewScene(s, r) {
  const C = s.chicken, B = AREA_BAL, pi = SYN.pi(s), n = C.stores.length, ai = areaOf(C.stores[0]), sv = fresh(s, ai);
  const others = r.shuffle(Object.keys(BRANDS).filter((k) => k !== cur(s))).slice(0, 2), fee = Math.round(B.reFee * n * pi / 10) * 10;
  const avgFit = (k) => C.stores.reduce((a, st) => a + fitRaw(s, areaOf(st), k), 0) / n * demOf(s, k);
  const ch = [{ t: `${jo(name(s), "과", "와")} 재계약한다 (재계약비 ${won(fee)})`, eff: { cash: -fee }, text: "도장을 다시 찍었다. 간판은 그대로다.", chbA: "keep", fitV: avgFit(cur(s)) }];
  for (const k of others) { const c0 = swapCost(s, k); ch.push({ t: `${BRANDS[k].n}으로 바꾼다 (${won(c0)})`, eff: { cash: -c0, mental: -3, hp: -4 }, text: `간판을 내리던 날, ${name(s)} 슈퍼바이저가 말없이 서류를 받아 갔다. 새 간판에 불이 들어왔다.`, chbA: "swap", chbTo: k, fitV: avgFit(k) * 0.985 }); }
  ch.push({ t: "다른 브랜드 제안서를 들고 본사와 협상한다 (말빨 판정)", check: { stat: "talk", dc: CHB_BAL.dc }, ok: { text: "\"다른 데서 제안이 왔다고요?\" 본사가 물류 단가를 내렸다. 재계약했다.", eff: { cash: -fee } }, ng: { text: "\"조건은 똑같습니다, 사장님.\" 얻은 것 없이 재계약했다.", eff: { cash: -fee, mental: -3 } }, chbA: "nego", fitV: avgFit(cur(s)) * 1.01 });
  return { kind: "event", tag: "가맹 계약", title: "가맹 계약 갱신", onChoose: "chb_ev", chb: "renew",
    text: `${jo(name(s), "과", "와")} 맺은 계약이 이번 달에 끝난다. ${BRANDS[others[0]].n}과 ${BRANDS[others[1]].n}에서 제안서가 와 있다. 다음 계약은 ${Math.round(B.term[0] / 12)}~${Math.round(B.term[1] / 12)}년이다.\n${[...new Set(C.stores.map(areaOf))].map((a) => `· ${AREAS[a].n}: ${fitLines(s, a)}`).join("\n")}\n(계약이 끝나서 위약금은 없어요. 바꾸면 공사하는 달 주문 −${Math.round(CHB_BAL.lost * 100)}%, 단골 일부가 떠나요. 안 맞는 브랜드도 입소문을 쌓으면 차이의 절반 남짓은 메워져요)`,
    choices: ch, chbSv: !!sv };
}
// 달마다: 계약 갱신 경고와 갱신
export function areaMonth(s, r, notes, scenes) {
  const C = s.chicken, B = AREA_BAL; if (!C.stores.length) return; initArea(s, r);
  for (const st of C.stores) if (typeof st.ai !== "number") st.ai = areaOf(st);
  if (C.ctT == null) C.ctT = s.t + r.int(B.term[0], B.term[1]) - Math.max(...C.stores.map((x) => x.months)) % B.term[0];
  const busy = scenes.some((q) => q.kind === "event" || q.warn);
  if (!C.ctWarned && C.ctT - s.t <= B.warn && C.ctT - s.t > 0) { C.ctWarned = true; s.warnT = s.t; scenes.push(renewWarn(s)); notes.push(`[가맹 계약] ${B.warn}개월 뒤 계약 갱신이에요. 상권 분석이 열렸어요.`); return; }
  if (s.t >= C.ctT && !busy) { scenes.push(renewScene(s, r)); C.ctT = s.t + r.int(B.term[0], B.term[1]); C.ctWarned = false; }
}
// 보드용
export function areaInfo(s) {
  const C = s.chicken; if (!C) return null;
  return { open: surveyOpen(s), left: C.ctT != null ? C.ctT - s.t : null, cands: C.stores.length ? null : (C.cands || []).map((c) => ({ ai: c.ai, n: AREAS[c.ai].n, sv: fresh(s, c.ai) })),
    stores: C.stores.map((st) => { const ai = areaOf(st), v = fresh(s, ai); return { name: st.name, area: AREAS[ai].n, sv: v, fit: v ? fitRaw(s, ai, cur(s)) : null, eff: v ? fitOf(s, st) : null }; }) };
}

export const CHB_CHOOSE = {
  chb_ev(s, r, i, okv, sc) {
    const C = s.chicken, c = sc?.choices?.[i] || {}; if (!C) return [];
    if (sc.chb === "area") { const cd = (C.cands || []).find((x) => x.ai === c.chbA) || (C.cands || [])[0]; C.pickA = cd ? { ai: cd.ai, loc: cd.loc } : { ai: 0, loc: 1 }; log(s, `치킨집 자리를 ${AREAS[C.pickA.ai].n}(으)로 정했다.`, "work"); return [`자리: ${AREAS[C.pickA.ai].n}`, "'창업 준비'를 한 번 더 누르면 브랜드를 골라요"]; }
    if (sc.chb === "renew") {
      const B = CHB_BAL;
      if (c.chbA === "swap" && BRANDS[sc.choices[i].chbTo]) { const to = sc.choices[i].chbTo, old = name(s); C.brand = to; C.scandal = 0; C.bSwaps = (C.bSwaps || 0) + 1;
        for (const st of C.stores) { st.name = st.name.replace(old, BRANDS[to].n); st.lost = (st.lost || 0) + B.lost; st.rating = clamp(st.rating - B.star, 3.4, 5); st.freshM = Math.max(st.freshM || 0, B.fresh); st.old = false; }
        log(s, `계약 갱신: 간판을 ${old}에서 ${BRANDS[to].n}(으)로 바꿨다.`, "work"); return [`간판 교체: ${old} → ${BRANDS[to].n}`, `다음 달 주문 −${Math.round(B.lost * 100)}% · 별점 −${B.star.toFixed(2)}`, `새 간판 효과 ${B.fresh}개월`]; }
      if (c.chbA === "nego" && okv) { C.cost = (C.cost || 0) - B.nego; return [`재료비 −${Math.round(B.nego * 100)}%`, "재계약"]; }
      log(s, `${name(s)}와 재계약했다.`, "work"); return ["재계약"];
    }
    if (sc.chb === "pick") { const k = BRANDS[c.chbK] ? c.chbK : "gold"; C.brand = k; C.bf = C.bf || {}; log(s, `치킨 브랜드를 ${BRANDS[k].n}(으)로 정했다.`, "work"); return [`${BRANDS[k].n} 가맹 상담을 잡았어요`, "'창업 준비'를 한 번 더 누르면 상담실로 가요"]; }
    if (sc.chb === "offer") {
      const to = sc.chbTo, B = CHB_BAL;
      if (c.chbA === "swap" && BRANDS[to]) {
        const old = name(s); C.brand = to; C.scandal = 0; C.risk = 0; C.bSwaps = (C.bSwaps || 0) + 1;
        for (const st of C.stores) { st.name = st.name.replace(old, BRANDS[to].n); st.lost = (st.lost || 0) + B.lost; st.rating = clamp(st.rating - B.star, 3.4, 5); st.freshM = Math.max(st.freshM || 0, B.fresh); st.old = false; }
        log(s, `간판을 ${old}에서 ${BRANDS[to].n}(으)로 바꿨다.`, "work");
        return [`간판 교체: ${old} → ${BRANDS[to].n}`, `다음 달 주문 −${Math.round(B.lost * 100)}% · 별점 −${B.star.toFixed(2)}`, `새 간판 효과 ${B.fresh}개월`];
      }
      if (c.chbA === "nego") { if (okv) { C.cost = (C.cost || 0) - B.nego; return [`재료비 −${Math.round(B.nego * 100)}%(본사가 물류 단가를 내렸어요)`]; } return ["얻은 게 없어요"]; }
      return [];
    }
    return [];
  },
};
