// v4.28 파티룸·에어씨앤씨 공통 '타이쿤' 규칙: 동네 경쟁사 가격표 · 가격 전쟁 · 후기 사건 10개
// 숫자는 defs.js PRICE_K·PR_REVIEW. 난수는 엔진 r 만(경쟁사 이름·별점은 화면용 고정 해시).
import * as D from "./defs.js";
import { addMoney, won } from "./core.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 화면용 고정 해시(같은 동네는 같은 경쟁사가 계속 보이게)
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; // 끝 글자만 달라도 고르게 섞이게
const PR_NAMES = ["달빛라운지", "모먼트룸", "비밀정원", "파티앤조이", "옥상13", "온더테이블", "블루노트룸", "하루공간", "오렌지박스", "스테이지원", "소소한방", "별빛다락", "그린하우스", "포토팩토리", "놀이터24"];
const AB_NAMES = ["골목스테이", "하늘채", "바람의집", "소담재", "여기머물다", "느린하루", "등대하우스", "솔숲스테이", "작은창문", "달항아리", "온기숙소", "봄날의방", "모래시계", "초록대문", "새벽정원"];

// 경쟁사도 성수기엔 올리고 비수기엔 내린다
export function compF(cal, peak) { const K = D.PRICE_K.compPeak; return cal === 12 ? K.dec : peak ? K.peak : K.off; }
// 가격 전쟁 중이면 동네 평균 가격이 내려간다(인하한 곳 + 따라 내린 곳)
export const warF = (w, t) => (w && t < w.until ? 1 - w.cut * 0.6 : 1);

// 동네 경쟁사 가격표: ref(내 방 기준 시세) 주위로 n곳. 반환 [{n, price, star, rev, cut}]
export function compList(kind, key, ref, n, t, war) {
  const pool = kind === "ab" ? AB_NAMES : PR_NAMES, out = [], used = new Set();
  const fs = Array.from({ length: n }, (_, i) => 0.8 + hash(kind + key + "p" + i) * 0.42 + (hash(kind + key + i + ":" + t) - 0.5) * 0.06), avg = fs.reduce((a, b) => a + b, 0) / Math.max(1, n); // 평균이 시세(ref)가 되게
  for (let i = 0; i < n; i++) {
    let k = Math.floor(hash(kind + key + "n" + i) * pool.length); while (used.has(k)) k = (k + 1) % pool.length; used.add(k);
    const h1 = hash(kind + key + "p" + i), h2 = hash(kind + key + "s" + i), h3 = hash(kind + key + "r" + i), drift = hash(kind + key + i + ":" + t) - 0.5;
    let price = ref * fs[i] / avg; void drift;
    const cut = war && t < war.until && i === (war.who ?? 0) % Math.max(1, n);
    if (cut) price *= 1 - war.cut;
    out.push({ n: pool[k], price: Math.max(1, Math.round(price)), star: clamp(4.25 + h2 * 0.7 + (h1 - 0.5) * 0.1, 4, 4.97), rev: Math.round(20 + h3 * h3 * (kind === "ab" ? 260 : 420) + t * h3 * 2), cut });
  }
  return out.sort((a, b) => a.price - b.price);
}
// 가격 반응(체감용): 내 가격이 시세 대비 몇 %이고, 예약이 몇 % 바뀌는지
export function priceFeel(myP, ref, el) { const diff = myP / ref - 1, occ = Math.pow(ref / myP, el) - 1; return { diff, occ }; }

// 가격 전쟁 장면(파티룸·에어 공통). o: { job:"pr"|"ab", where, who, cut, list:[{id,name,price}] }
export function warScene(o) {
  const unit = o.job === "pr" ? "1건" : "1박", K = D.PRICE_K.war;
  return { kind: "event", tag: o.job === "pr" ? "파티룸" : "에어씨앤씨", title: "가격 전쟁", onChoose: o.job + "_war",
    text: `${o.where}의 '${o.who}'가 ${unit} 가격을 ${Math.round(o.cut * 100)}% 내렸다. 옆 가게들도 하나둘 따라 내린다. 앱 목록 맨 위가 전부 '특가'로 바뀌었다. 내 ${o.list.map((x) => `${x.name} ${x.price}만`).join(", ")}.`,
    choices: [
      { t: `전쟁 기간만 따라 내린다 (−${Math.round(K.follow * 100)}%, 끝나면 원래대로)`, eff: {}, text: "가격표를 고쳤다. 남는 건 줄어도 빈방은 막는다." },
      { t: "버틴다: 후기·청소로 승부", eff: {}, text: "가격은 그대로. 대신 답글 하나, 수건 한 장 더 신경 썼다." },
      { t: `오히려 올린다: 프리미엄으로 (+${Math.round(K.premium * 100)}%)`, eff: {}, text: "\"싸구려랑 같이 묶이기 싫다.\" 사진과 소개 문구를 고급스럽게 바꿨다." },
    ] };
}

// ───────── 후기 사건 10개 ─────────
// u: 파티룸 방 또는 에어 숙소. 공통 필드 rating·reviews·buzz·unrep. job: "pr"|"ab". cfg: { revEv, refund(만), place }
const RV = [
  { id: "troll", t: "별점 1점 악성 후기", ok: () => true,
    x: (u, P) => `${u.name}에 별점 1점 후기가 달렸다. "사진 사기. 다신 안 옴." 그날 CCTV를 보니 손님들은 4시간 내내 웃고 있었다. 이 후기가 맨 위에 걸려 있다.`,
    c: (P) => [{ t: `환불하고 사과한다 (−${won(P.refund)})`, eff: {} }, { t: "사실대로 정중한 답글을 단다 (글쓰기 판정)", check: { stat: "write", dc: 50 }, ok: { text: "차분한 답글에 다른 손님들이 '사장님 답글 보고 예약함'이라고 남겼다.", eff: {} }, ng: { text: "답글이 변명처럼 읽혔다. 댓글 싸움이 붙었다.", eff: { mental: -4 } } }, { t: "무시한다", eff: {}, text: "그냥 뒀다. 그 후기는 한 달 내내 맨 위에 있었다." }],
    go: (s, u, i, ok, P) => i === 0 ? [pay(s, P.refund, "후기 페이백"), star(u, 0.02), "손님이 후기를 별 3개로 고쳤다"] : i === 1 ? (ok ? [star(u, 0.02), buzz(u, 4)] : [star(u, -0.06)]) : [star(u, -0.08), buzz(u, -5)] },
  { id: "viral", t: "사진 후기가 퍼졌다", ok: (s, u) => u.rating >= 4.5,
    x: (u) => `손님이 올린 ${u.name} 사진 후기가 동네 커뮤니티에서 '저장' 2천 개를 찍었다. "여기 어디예요?" 문의가 쏟아진다.`,
    c: () => [{ t: "감사 답글 + 다음 예약 쿠폰 (−3만)", eff: {} }, { t: "그냥 즐긴다", eff: {}, text: "알림이 계속 울린다." }],
    go: (s, u, i) => i === 0 ? [pay(s, 3, "후기 페이백"), buzz(u, 12), more(u, 5)] : [buzz(u, 5)] },
  { id: "cherry", t: "페이백만 노리는 손님", ok: (s, u, P) => P.revEv === "pay5" || P.revEv === "photo",
    x: (u) => `${u.name} 후기 이벤트에 같은 사람이 계정 세 개로 후기를 썼다. 사진은 다른 가게 것. 페이백만 받아 갔다.`,
    c: () => [{ t: "조건은 그대로 둔다(정직한 손님이 더 많다)", eff: {}, text: "몇만 원 아끼자고 이벤트를 접진 않는다." }, { t: "이벤트를 접는다", eff: {}, text: "후기 이벤트 종료 공지를 올렸다." }, { t: "'별점 5점 후기만 페이백'으로 바꾼다", eff: {}, text: "후기가 이상하게 다 5점이 됐다. 찜찜하다." }],
    go: (s, u, i, ok, P) => i === 0 ? [pay(s, 4, "후기 페이백")] : i === 1 ? [setEv(P, "none"), "후기 이벤트 종료"] : [(P.box.fakeRisk = (P.box.fakeRisk || 0) + 1, "별점 조건 페이백: 플랫폼 적발 위험 +"), more(u, 4)] },
  { id: "policy", t: "플랫폼 후기 정책 공지", ok: (s, u, P) => P.revEv !== "none" && P.revEv !== "disc",
    x: () => `플랫폼 공지: "대가를 받은 후기는 반드시 '혜택 받은 후기'로 표시해야 합니다. 어기면 후기 삭제·노출 제한." 내 후기 이벤트가 딱 걸리는 내용이다.`,
    c: () => [{ t: "'혜택 받은 후기' 표시를 단다", eff: {}, text: "정직하게 표시했다. 후기 효과는 조금 줄지만 마음은 편하다." }, { t: "모른 척 계속한다", eff: {}, text: "설마 내 가게까지 보겠어." }, { t: "후기 이벤트를 끈다", eff: {}, text: "이벤트를 내렸다." }],
    go: (s, u, i, ok, P, r) => i === 0 ? [buzz(u, -2), "표시 후기: 입소문 −2"] : i === 2 ? [setEv(P, "none"), "후기 이벤트 종료"] : (r.chance(D.PR_REVIEW.fake * (1 + (P.box.fakeRisk || 0))) ? [cut(u, 0.3), star(u, -0.1), "적발! 후기 30% 삭제, 별점 −0.1"] : ["이번엔 넘어갔다(위험은 남는다)", (P.box.fakeRisk = (P.box.fakeRisk || 0) + 1, "적발 위험 +")]) },
  { id: "terror", t: "별점 테러 의심", ok: (s, u) => u.reviews >= 15,
    x: (u) => `하룻밤 새 ${u.name}에 별점 1점 후기가 다섯 개. 다 가입한 지 하루 된 계정이다. 근처에 새로 연 가게가 의심스럽다.`,
    c: () => [{ t: "플랫폼에 신고한다 (말빨 판정)", check: { stat: "talk", dc: 50 }, ok: { text: "\"확인 결과 부정 후기로 삭제했습니다.\"", eff: {} }, ng: { text: "\"정책 위반으로 보기 어렵습니다.\" 자동 답장만 왔다.", eff: { mental: -3 } } }, { t: "단골들에게 후기를 부탁한다", eff: { mental: -2 }, text: "단골 여섯 명이 장문 후기를 남겨 줬다." }, { t: "무시한다", eff: {}, text: "별점이 쑥 내려갔다." }],
    go: (s, u, i, ok) => i === 0 ? (ok ? ["부정 후기 삭제"] : [star(u, -0.08)]) : i === 1 ? [more(u, 6), star(u, -0.02)] : [star(u, -0.1)] },
  { id: "dirty", t: "머리카락 사진 후기", ok: () => true,
    x: (u) => `${u.name} 후기에 사진 한 장: 욕실 배수구 머리카락. "청소 안 하나요?" 좋아요가 계속 붙는다.`,
    c: (P) => [{ t: "사과 답글 + 재방문 무료 쿠폰 (−5만)", eff: {} }, { t: `청소 방식을 바꾼다 (체크리스트·업체 교체 ${won(P.fix)})`, eff: {} }, { t: "무시한다", eff: {}, text: "다음 손님도 그 사진을 보고 왔다." }],
    go: (s, u, i, ok, P) => i === 0 ? [pay(s, 5, "후기 페이백"), star(u, -0.01)] : i === 1 ? [pay(s, P.fix, P.costK), star(u, 0.05)] : [star(u, -0.08), buzz(u, -4)] },
  { id: "backlog", t: "답글 안 단 후기가 산더미", ok: (s, u) => (u.unrep || 0) >= 25,
    x: (u) => `${u.name}에 답글 안 단 후기가 ${Math.round(u.unrep)}개. 플랫폼에서 "답글률이 낮으면 노출이 줄어요" 알림이 왔다.`,
    c: () => [{ t: "밤새 하나하나 직접 쓴다 (체력 −8)", eff: { hp: -8 }, text: "새벽 3시. 마지막 답글을 달았다." }, { t: "템플릿 복붙으로 한 번에", eff: {}, text: "\"소중한 후기 감사합니다^^\" 똑같은 답글 40개." }, { t: "나중에 한다", eff: {}, text: "알림을 껐다." }],
    go: (s, u, i) => i === 0 ? [(u.unrep = 0, "밀린 답글 0"), star(u, 0.04)] : i === 1 ? [(u.unrep = 0, "밀린 답글 0"), star(u, -0.02), "성의 없는 답글: 별점 −0.02"] : [star(u, -0.03)] },
  { id: "long", t: "장문의 극찬 후기", ok: (s, u) => u.rating >= 4.6,
    x: (u) => `${u.name}에 사진 12장짜리 장문 후기. "사장님이 미리 풍선까지 달아 주셨어요. 인생 생일." 이 후기 하나로 상위 노출 문턱이 코앞이다.`,
    c: () => [{ t: "정성 답글 + 단골 혜택 (−2만)", eff: {} }, { t: "고맙다고만 남긴다", eff: {}, text: "짧게 감사 인사를 남겼다." }],
    go: (s, u, i) => i === 0 ? [pay(s, 2, "후기 페이백"), more(u, 3), buzz(u, 6), star(u, 0.02)] : [buzz(u, 3)] },
  { id: "black", t: "\"환불 안 해 주면 별점 1점\"", ok: () => true,
    x: (u, P) => `${u.name} 퇴실한 손님 메시지. "생각보다 별로였어요. 반값 환불해 주시면 5점, 아니면 1점 쓸게요."`,
    c: (P) => [{ t: `들어준다 (−${won(Math.round(P.refund / 2))})`, eff: {}, text: "돈을 보냈다. 5점 후기가 달렸다. 기분이 나쁘다." }, { t: "거절하고 대화 내용을 플랫폼에 신고 (말빨 판정)", check: { stat: "talk", dc: 48 }, ok: { text: "협박성 메시지로 인정돼 후기가 막혔다.", eff: {} }, ng: { text: "증거 부족. 1점 후기가 올라왔다.", eff: { mental: -4 } } }, { t: "무시한다", eff: {}, text: "1점 후기가 올라왔다." }],
    go: (s, u, i, ok, P) => i === 0 ? [pay(s, Math.round(P.refund / 2), "후기 페이백")] : i === 1 ? (ok ? ["협박 후기 차단"] : [star(u, -0.07)]) : [star(u, -0.07)] },
  { id: "edge", t: "별점 4.8 경계선", ok: (s, u) => u.rating >= 4.72 && u.rating < 4.84 && u.reviews >= 20,
    x: (u, P) => `${u.name} 별점 ${u.rating.toFixed(2)}. 4.8 아래로 떨어지면 ${P.job === "ab" ? "슈퍼호스트 배지" : "플랫폼 상위 노출"}가 날아간다. 이번 달 후기 몇 개에 달렸다.`,
    c: (P) => [{ t: "단골에게 후기를 부탁한다", eff: { mental: -1 }, text: "\"사장님 부탁이면 당연하죠.\"" }, { t: `무료 업그레이드 서비스 (−${won(P.fix)})`, eff: {}, text: "웰컴 와인, 늦은 퇴실. 손님들이 눈치챘다." }, { t: "운에 맡긴다", eff: {}, text: "후기 알림이 올 때마다 심장이 뛴다." }],
    go: (s, u, i, ok, P) => i === 0 ? [more(u, 4), star(u, 0.02)] : i === 1 ? [pay(s, P.fix, P.costK), star(u, 0.05)] : [star(u, -0.02)] },
];
const pay = (s, v, k) => { s.cash -= v; addMoney(s, "exp", k, v); return `${k} −${won(v)}`; };
const star = (u, v) => { u.rating = clamp(u.rating + v, 2.5, 4.99); return `${u.name} 별점 ${v >= 0 ? "+" : ""}${v.toFixed(2)}`; };
const buzz = (u, v) => { u.buzz = clamp((u.buzz || 0) + v, 0, 100); return `입소문 ${v >= 0 ? "+" : ""}${v}`; };
const more = (u, v) => { u.reviews = (u.reviews || 0) + v; u.unrep = (u.unrep || 0) + v; return `후기 +${v}`; };
const cut = (u, f) => { const n = Math.round((u.reviews || 0) * f); u.reviews -= n; return `후기 −${n}`; };
const setEv = (P, k) => { P.box.revEv = k; return ""; };
export const RV_LIST = RV.map((e) => e.id);

// 후기 사건 하나 고르기. box = s.pr 또는 s.ab(revEv·rvT·fakeRisk 저장)
export function reviewEvent(s, r, job, u, box) {
  if (s.t - (box.rvT ?? -99) < D.PR_REVIEW.evGap) return null;
  const P = cfg(s, job, u, box);
  const L = RV.filter((e) => e.ok(s, u, P) && s.seen["rv_" + job + e.id] !== s.t); if (!L.length) return null;
  const e = r.pick(L); box.rvT = s.t; s._rv = { job, id: u.id, ev: e.id };
  return { kind: "event", tag: job === "pr" ? "파티룸" : "에어씨앤씨", title: "후기 · " + e.t, onChoose: job + "_rv", text: e.x(u, P), choices: e.c(P).map((c) => ({ text: "", ...c })) };
}
function cfg(s, job, u, box) { const pi = s.pi || 1; return { job, box, revEv: box.revEv || "none", refund: job === "pr" ? Math.max(5, Math.round(u.price || 20)) : Math.max(5, Math.round((u.adr || 10) * 2)), fix: Math.round(20 * pi), costK: job === "pr" ? "파티룸 비용" : "에어씨앤씨 비용" }; }
export function reviewChoose(s, r, i, ok, units) {
  const o = s._rv; s._rv = null; if (!o) return []; const u = units.find((x) => x.id === o.id); if (!u) return [];
  const e = RV.find((x) => x.id === o.ev); if (!e) return [];
  const box = o.job === "pr" ? s.pr : s.ab;
  return e.go(s, u, i, ok, cfg(s, o.job, u, box), r).filter(Boolean);
}
// 한 달 후기 계산(공통): n = 예약 수(파티룸) 또는 숙박 수(에어). 반환 { add, pay, disc, rebook, photoBuzz }
export function reviewMonth(job, box, n, rev, u) {
  const K = D.PR_REVIEW, ev = K.ev[box.revEv || "none"] || K.ev.none, base = job === "pr" ? K.base : K.abBase;
  const happy = clamp((u.rating - 3.6) / 1.2, 0.3, 1.1);
  const add = Math.round(n * (base + ev.rate) * happy);
  const evN = Math.round(n * ev.rate * happy + (ev.pay ? n * base * happy * 0.5 : 0)); // 이벤트 보고 쓴 후기 + 원래 쓸 사람 절반도 페이백을 받아 간다
  const payV = Math.round(evN * (ev.pay || 0) * 10) / 10;
  return { add, pay: payV, disc: Math.round(rev * (ev.disc || 0)), rebook: ev.rebook || 0, photoBuzz: (ev.buzz || 0) * add };
}
// 후기 수 효과(0개 ×cntLo → N개 이상 ×1) · 상위 노출
export function reviewMult(job, u) {
  const K = D.PR_REVIEW, N = job === "pr" ? K.cntN : K.abCntN;
  const f = K.cntLo + (1 - K.cntLo) * Math.min(1, Math.log(1 + (u.reviews || 0)) / Math.log(1 + N));
  return f * (topOn(u) ? 1 + K.top.occ : 1);
}
export const topOn = (u) => (u.reviews || 0) >= D.PR_REVIEW.top.n && u.rating >= D.PR_REVIEW.top.star;
