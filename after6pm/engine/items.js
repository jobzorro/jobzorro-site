// After 6PM v4.25 · 아이템 60개(생활·자기계발 15 · 투잡 장비 20 · 기념품 12 · 소모품 8 · 최종 5)
// - 생활 15개는 defs.js D.ITEMS 그대로(사면 능력치, core.js buyItem). 나머지 45개는 여기서 정의한다.
// - 저장: s.items[id] = 얻은 달(갖고 있는 것, 옛 저장과 같은 칸) · s.cons[id] = 소모품 개수.
// - 효과: m 은 core.js mod() 가 성향·특전 카드와 같은 방식으로 합친다(def 1이면 곱, def 0이면 더하기). cards.js extraMods 가 모아 준다.
// - 영향 기준: 아이템 하나가 파이어율을 2%p 넘게 바꾸지 않게(장비 +3~5%, 세트 +3~8%). 최종 아이템은 강하지만 3억~8억(물가 반영).
// - 얻는 길(how): shop 현금 상점 · ev 이벤트 보상 · mg 미니게임 대성공 · gift 인연 선물 · rival 라이벌 승부 · card 연말·조각 카드 · pack 카드팩
// 이 파일은 defs.js 만 읽는다(core.js 와 서로 부르지 않게).
import * as D from "./defs.js";
const CORE_statCap = (s) => Math.min(D.STAT_MAX, D.STAT_CAP0 + D.STAT_CAP_NG * Math.max(0, (s?.ng?.n || 1) - 1)); // v4.28d 회차 천장(core.statCap 과 같은 식)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const CAT = { life: "생활·자기계발", gear: "투잡 장비", memo: "기념품", cons: "소모품", final: "최종" };
export const CAT_ORDER = ["gear", "final", "memo", "cons", "life"];
export const HOW_N = { shop: "상점", ev: "이벤트", mg: "미니게임", gift: "인연 선물", rival: "라이벌 승부", card: "카드", pack: "카드팩" };

const G = (id, job, n, cash, m, d) => ({ id, cat: "gear", job, n, cash, pi: true, m, d, how: ["shop", "ev", "rival", "mg", "card", "pack"] });
const MM = (id, n, mental, m, d) => ({ id, cat: "memo", n, cash: null, mental, m, d, how: ["ev"] });
const CN = (id, n, cash, use, d, how = ["shop", "mg", "gift", "card", "pack"]) => ({ id, cat: "cons", n, cash, pi: true, use, d, how });
const F = (id, job, n, cash, m, d) => ({ id, cat: "final", job, n, cash, pi: true, m, d, how: ["shop", "pack"] });

// 투잡 장비 20개(투잡마다 2개, 둘 다 모으면 세트 효과)
const GEAR = [
  G("pr_beam", "pr", "빔프로젝터", 150, { star: 0.02 }, "파티룸 별점 +0.02"),
  G("pr_karaoke", "pr", "노래방 기계", 300, { star: 0.02, damageMult: 0.95 }, "파티룸 별점 +0.02, 파손 피해 −5%"),
  G("cs_tpl", "cs", "첨삭 템플릿", 40, { passBonus: 0.006, convBonus: 0.01 }, "합격률 +0.6%p, 문의 전환 +1%p"),
  G("cs_cam", "cs", "화상 상담 세트", 120, { kakaoMult: 1.04, lectureMult: 1.04 }, "오픈채팅·강의 효과 +4%"),
  G("in_light", "insta", "조명 키트", 80, { instaMult: 1.03 }, "인별 팔로워 증가 +3%"),
  G("in_gimbal", "insta", "짐벌", 60, { instaViral: 1.08 }, "릴스 떡상 확률 +8%"),
  G("ab_lock", "airbnb", "스마트락", 50, { abStar: 0.015 }, "숙소 별점 +0.015"),
  G("ab_bed", "airbnb", "호텔식 침구", 150, { abStar: 0.02 }, "숙소 별점 +0.02"),
  G("uc_grind", "ucafe", "고급 그라인더", 400, { ucRepeat: 1.03 }, "무인카페 단골 +3%"),
  G("uc_cctv", "ucafe", "AI 방범 카메라", 120, { ucTheft: 0.8 }, "먹튀·정산 손실 −20%"),
  G("tr_deck", "tarot", "한정판 타로 덱", 30, { trMult: 1.03 }, "타로 손님 +3%"),
  G("tr_mood", "tarot", "무드 조명", 50, { trLead: 1.04 }, "타로 문의 +4%"),
  G("wn_kb", "webnovel", "기계식 키보드", 25, { wnTired: 0.93 }, "연재 피로 −7%"),
  G("wn_plot", "webnovel", "플롯 보드", 15, { wnPay: 1.03 }, "웹소설 유료 수익 +3%"),
  G("tu_pad", "tutoring", "판서 태블릿", 90, { tuSat: 1.05 }, "학생 만족 +5%"),
  G("tu_note", "tutoring", "오답 노트 키트", 20, { tuPar: 2 }, "학부모 신뢰 +2"),
  G("ch_fryer", "chicken", "압력 튀김기", 600, { chFry: 0.03, chStar: 0.01 }, "튀김 실력 +3%, 별점 +0.01"),
  G("ch_bag", "chicken", "보온 배달 가방", 30, { chStar: 0.015 }, "치킨 별점 +0.015"),
  G("vb_mon", "vibe", "듀얼 모니터", 70, { vbSpeed: 1.04 }, "개발 속도 +4%"),
  G("vb_cloud", "vibe", "서버 크레딧", 100, { vbOps: 0.85 }, "앱 장애 손실 −15%"),
];
// 세트 효과: 그 투잡 장비 2개를 다 모으면
export const SETS = {
  pr: { n: "파티룸 풀세트", m: { star: 0.04 }, d: "별점 +0.04, 예약률 약 +5%" },
  cs: { n: "컨설팅 작업실", m: { referMult: 1.08, passBonus: 0.005 }, d: "소개 +8%, 합격률 +0.5%p" },
  insta: { n: "1인 스튜디오", m: { instaMult: 1.04 }, d: "팔로워 증가 +4%" },
  airbnb: { n: "호텔급 숙소", m: { abStar: 0.03 }, d: "숙소 별점 +0.03" },
  ucafe: { n: "무인 매장 완성", m: { ucRepeat: 1.03 }, d: "단골 +3%" },
  tarot: { n: "점집 분위기", m: { trMult: 1.04 }, d: "타로 손님 +4%" },
  webnovel: { n: "작가의 책상", m: { wnBuzz: 1.08 }, d: "연재 화제성 +8%" },
  tutoring: { n: "온라인 교실", m: { tuRefer: 1.1 }, d: "학부모 소개 +10%" },
  chicken: { n: "주방 장인", m: { chStar: 0.03 }, d: "치킨 별점 +0.03" },
  vibe: { n: "개발 장비 완비", m: { vbPrice: 1.04 }, d: "개발 단가 +4%" },
};
// 기념품 12개: 이벤트에서만. 얻을 때 멘탈 + 작은 영구 효과
const MEMO = [
  MM("m_letter", "손님의 감사 편지", 6, { monthMental: 0.3 }, "매달 멘탈 +0.3"),
  MM("m_pass", "제자의 합격 사진", 6, { passBonus: 0.004 }, "합격률 +0.4%p"),
  MM("m_receipt", "첫 정산 영수증", 8, { monthMental: 0.3 }, "매달 멘탈 +0.3"),
  MM("m_kid", "아이의 그림", 8, { familyDecay: 0.95 }, "가족 행복 떨어짐 −5%"),
  MM("m_ring", "둘만 아는 반지", 6, { familyDecay: 0.95, affMult: 1.02 }, "가족 행복 떨어짐 −5%, 호감 +2%"),
  MM("m_postcard", "외국 손님의 엽서", 5, { abLang: 1.03 }, "외국어 응대 +3%"),
  MM("m_review", "별 다섯 개 캡처", 5, { ratingGuard: 0.95 }, "별점 하락 −5%"),
  MM("m_mug", "단골이 준 머그컵", 5, { ucRepeat: 1.01, trMult: 1.01 }, "단골 +1%"),
  MM("m_fanart", "팬아트 한 장", 6, { instaMult: 1.01, wnBuzz: 1.02 }, "팔로워 +1%, 화제성 +2%"),
  MM("m_photo", "가족사진 액자", 6, { monthMental: 0.3, familyDecay: 0.97 }, "매달 멘탈 +0.3"),
  MM("m_award", "사내 표창장", 5, { perfMult: 1.02 }, "회사 성과 +2%"),
  MM("m_memo", "선배의 손 메모", 5, { homeStudy: 1.03 }, "집에서 공부 +3%"),
];
// 소모품 8개: 가방에서 쓰면 사라진다
const CONS = [
  CN("c_drink", "에너지 드링크", 3, { ap: 1, hp: -3 }, "이번 달 행동력 +1(스태미너 −3)"),
  CN("c_tonic", "보약 한 재", 40, { hp: 40 }, "스태미너 +40"),
  CN("c_vac", "휴가 쿠폰", 60, { mental: 20 }, "멘탈 +20(번아웃 위험 ↓)"),
  CN("c_massage", "마사지 이용권", 12, { hp: 18, mental: 5 }, "스태미너 +18, 멘탈 +5"),
  CN("c_bean", "좋은 원두 한 봉", 3, { hp: 8, mental: 3 }, "스태미너 +8, 멘탈 +3"),
  CN("c_giftset", "선물 세트", 15, { love: 6 }, "배우자·연인 호감 +6, 가족 +4"),
  CN("c_book", "요즘 뜨는 책", 2, { stat: 1.5 }, "주 능력치 +1.5"),
  CN("c_charm", "행운 부적", null, { shard: 1 }, "카드 조각 +1", ["mg", "gift", "card", "pack"]),
];
// 최종 5개: 현금 상점(고가) 또는 카드팩 전설로만
const FINAL = [
  F("f_key", "pr", "건물주의 열쇠", 50000, { prCost: 0.75, interiorCost: 0.9 }, "파티룸 고정비(월세) −25%, 인테리어 −10%"),
  F("f_manu", "webnovel", "베스트셀러 원고", 30000, { wnPay: 1.2, vodMult: 1.2, wnBuzz: 1.15 }, "웹소설 수익 +20%, VOD·전자책 +20%"),
  F("f_super", "airbnb", "슈퍼호스트 배지", 40000, { abStar: 0.12, abLang: 1.15 }, "숙소 별점 +0.12, 외국어 응대 +15%"),
  F("f_fran", "chicken", "프랜차이즈 본사 지분", 80000, { chStar: 0.1, chFry: 0.08, ucRepeat: 1.15 }, "치킨 별점 +0.1, 무인카페 단골 +15%"),
  F("f_cards", "cs", "업계 명함첩", 40000, { referMult: 1.25, kakaoMult: 1.15, tuRefer: 1.25, trLead: 1.2, vbPrice: 1.12, instaMult: 1.1 }, "소개·문의 +12~25%(컨설팅·과외·타로·바이브·인별)"),
];
export const F_BRK = { f_key: "num", f_manu: "write", f_super: "lang", f_fran: "hands", f_cards: "career" }; // 최종 아이템을 얻으면 이 능력치 돌파 중
FINAL.forEach((x) => { if (F_BRK[x.id]) x.d += ` · ${D.STATS[F_BRK[x.id]]} 돌파 6달`; });
const LIFE = Object.entries(D.ITEMS).map(([id, it]) => ({ id, cat: "life", n: it.n, cash: it.cash, pi: false, stat: it.stat, d: Object.entries(it.stat).map(([k, v]) => `${D.STATS[k]} +${v}`).join(", "), how: ["shop"] }));

export const ALL = [...LIFE, ...GEAR, ...MEMO, ...CONS, ...FINAL];
export const BY = Object.fromEntries(ALL.map((x) => [x.id, x]));
export const JOB_GEAR = GEAR.reduce((a, g) => ((a[g.job] = a[g.job] || []).push(g.id), a), {});

export function ensure(s) { s.items = s.items || {}; s.cons = s.cons || {}; return s; }
export function price(s, it) { if (!it || it.cash == null) return null; const v = it.cash * (it.pi ? Math.max(1, s.pi || 1) : 1); return v >= 1000 ? Math.round(v / 100) * 100 : Math.max(1, Math.round(v)); }
export function owned(s, id) { const it = BY[id]; if (!it) return false; return it.cat === "cons" ? (s.cons?.[id] || 0) > 0 : s.items?.[id] !== undefined; }
const jobN = (j) => D.SIDEJOBS[j]?.n || j;

// 세트: 그 투잡 장비를 다 모은 투잡 목록
export function setsOn(s) { const it = s.items || {}; return Object.keys(SETS).filter((j) => (JOB_GEAR[j] || []).length && JOB_GEAR[j].every((id) => it[id] !== undefined)); }
// 효과 목록(성향 카드와 같은 모양 {m})
export function itemMods(s) {
  const out = [], it = s.items || {};
  for (const id in it) { const x = BY[id]; if (x?.m) out.push({ m: x.m }); }
  for (const j of setsOn(s)) out.push({ m: SETS[j].m });
  return out;
}

// 얻기(이벤트·선물·카드 등). 이미 갖고 있으면 카드 조각 1개로 바꾼다(소모품은 개수 +1). 돌려주는 값: { line, dup }
export function grant(s, id, src = "ev") {
  ensure(s); const x = BY[id]; if (!x) return { line: "", dup: false };
  s.gc = s.gc || {}; s.gc.v = (s.gc.v || 0) + 1;
  (s.gc.got = s.gc.got || {})[src] = (s.gc.got[src] || 0) + 1;
  if (x.cat === "cons") { s.cons[id] = (s.cons[id] || 0) + 1; return { line: `🎁 ${x.n} +1`, dup: false }; }
  if (s.items[id] !== undefined) return { line: `${x.n}(이미 있음) → 카드 조각`, dup: true };
  s.items[id] = s.t;
  let line = `🎁 ${x.cat === "memo" ? "기념품" : x.cat === "final" ? "최종 아이템" : "아이템"} · ${x.n}`;
  if (x.mental) { s.mental = clamp((s.mental || 0) + x.mental, 0, 100); line += ` (멘탈 +${x.mental})`; }
  if (x.stat) for (const [k, v] of Object.entries(x.stat)) if (s.st?.[k] !== undefined) s.st[k] = clamp(s.st[k] + v, 0, CORE_statCap(s));
  if (x.cat === "final" && F_BRK[id]) { s.brk = s.brk || {}; s.brk[F_BRK[id]] = Math.max(s.brk[F_BRK[id]] ?? -1, s.t + D.STAT_BRK.months); line += ` · ${D.STATS[F_BRK[id]]} 돌파 중 ${D.STAT_BRK.months}달`; } // v4.28 최종 아이템 = 돌파 계기
  if (x.cat === "gear" && setsOn(s).includes(x.job)) line += ` · 세트 완성 ${SETS[x.job].n}: ${SETS[x.job].d}`;
  return { line, dup: false };
}

// 사기(생활 15개는 core.js buyItem 이 따로). H = { creditRoom, addMoney, log }
export function buy(s, id, H) {
  ensure(s); const x = BY[id]; if (!x) return { ok: false, msg: "없는 물건" };
  if (x.cat === "memo" || x.cash == null) return { ok: false, msg: "이벤트에서만 얻어요" };
  if (x.cat !== "cons" && s.items[id] !== undefined) return { ok: false, msg: "이미 갖고 있어요" };
  const p = price(s, x);
  if (s.cash - p < -(H.creditRoom || 0)) return { ok: false, msg: "돈이 모자라요" };
  s.cash -= p; H.addMoney?.(s, "exp", "아이템", p);
  const g = grant(s, id, "shop"); s.gc.got.shop--; (s.gc.bought = s.gc.bought || {})[id] = s.t;
  H.log?.(s, `${x.n} 구매 ${p}만`, "life");
  return { ok: true, lines: [g.line.replace(/^🎁 /, ""), x.d], msg: `${x.n} 구매 · ${p.toLocaleString()}만` };
}

// 소모품 쓰기
export function use(s, id) {
  ensure(s); const x = BY[id]; if (!x || x.cat !== "cons" || !(s.cons[id] > 0)) return { ok: false, msg: "없어요" };
  const u = x.use, lines = [];
  if (u.ap) { s.ap = (s.ap || 0) + u.ap; lines.push(`행동력 +${u.ap}`); }
  if (u.hp) { s.hp = clamp((s.hp || 0) + u.hp, 0, s.hpMax || 100); lines.push(`스태미너 ${u.hp > 0 ? "+" : ""}${u.hp}`); }
  if (u.mental) { s.mental = clamp((s.mental || 0) + u.mental, 0, 100); lines.push(`멘탈 +${u.mental}`); }
  if (u.love) {
    const ids = Object.keys(s.rel || {}).filter((k) => s.rel[k].spouse || s.rel[k].lover);
    for (const k of ids) s.rel[k].aff = clamp((s.rel[k].aff || 0) + u.love, 0, 100);
    if (s.fam) s.fam.happy = clamp((s.fam.happy || 0) + 4, 0, 100);
    lines.push(ids.length ? `호감 +${u.love}` : "가족 +4");
  }
  if (u.stat) { const k = mainStat(s); s.st[k] = clamp(s.st[k] + u.stat, 0, CORE_statCap(s)); lines.push(`${D.STATS[k]} +${u.stat}`); }
  if (u.shard) { s.gc = s.gc || {}; s.gc.shards = (s.gc.shards || 0) + u.shard; lines.push(`카드 조각 +${u.shard}`); }
  s.cons[id]--; if (s.cons[id] <= 0) delete s.cons[id];
  s.gc = s.gc || {}; s.gc.v = (s.gc.v || 0) + 1;
  return { ok: true, lines, msg: `${x.n} 사용` };
}
function mainStat(s) { const st = s.st || {}; return Object.keys(D.STATS).filter((k) => k !== "body" && st[k] !== undefined).sort((a, b) => st[b] - st[a])[0] || "career"; }

// 가방 화면용 요약
export function bagInfo(s) {
  ensure(s);
  const cats = {}; for (const c of Object.keys(CAT)) cats[c] = { n: CAT[c], have: 0, all: 0, list: [] };
  for (const x of ALL) { const c = cats[x.cat]; c.all++; const own = owned(s, x.id); if (own) c.have++; c.list.push({ ...x, own, cnt: x.cat === "cons" ? s.cons[x.id] || 0 : own ? 1 : 0, price: price(s, x) }); }
  const sets = Object.keys(SETS).map((j) => ({ job: j, jn: jobN(j), ...SETS[j], have: (JOB_GEAR[j] || []).filter((id) => s.items[id] !== undefined).length, need: (JOB_GEAR[j] || []).length, on: setsOn(s).includes(j) }));
  return { cats, sets, total: ALL.filter((x) => x.cat !== "cons" && owned(s, x.id)).length, totalAll: ALL.filter((x) => x.cat !== "cons").length };
}
// 투잡에 맞는 장비 고르기(라이벌 승부·미니게임 보상). 없으면 null
export function pickGear(s, r, job) {
  const pool = (JOB_GEAR[job] || []).filter((id) => s.items?.[id] === undefined);
  return pool.length ? pool[Math.floor(r.next() * pool.length)] : null;
}
export { jobN };
