// 돈 버는 자리(BM) 모음. 결제·광고 모듈이 아직 없어서 일반 이용자에게는 자리만 보이고 "준비 중"으로 막혀 있다(11-24 체험 운영 종료).
// QA 모드: 주소 끝에 #qa 를 붙여 한 번 들어오면 이 기기에서 모든 자리가 무료로 통과한다(#qaoff 로 끈다). 사내 시험용.
// BM안이 확정되면 pay() 안을 결제·광고 모듈에 연결한다. 가격(price)은 제안가다.
export const BM = {
  on: true,
  slots: {
    // 미니게임(1년에 한 번, 큰 일)
    mgRetry: { n: "다시 도전", how: "ad", d: "미니게임을 망쳤을 때 광고를 보고 한 번 더 해요" },
    mgSkip: { n: "건너뛰기권", how: "item", price: 500, d: "미니게임을 안 하고 보통 결과를 받아요" },
    mgBest: { n: "만점 보장권", how: "item", price: 1100, d: "망친 뒤 최고 점수로 바꿔 받아요" },
    // 행동력
    apAd: { n: "행동력 +1", how: "ad", d: "광고를 보고 이번 달 행동력을 1 채워요(한 달 1번)", ap: 1 },
    apItem: { n: "에너지 드링크", how: "item", price: 500, d: "이번 달 행동력을 2 채워요", ap: 2 },
    // 1회차 결산 등급
    gradeUp: { n: "S등급 보상 받기", how: "item", price: 3300, d: "A·B·C 등급이 S등급의 2회차 시작 보상을 받아요" },
    // 11-24 대표 결정으로 더한 다섯 자리
    saveSlot: { n: "저장 칸 추가", how: "own", price: 1100, max: 2, d: "인생을 하나 더 저장해요(기본 1칸, 3칸까지)", shop: true },
    noAds: { n: "광고 없애기", how: "own", price: 9900, max: 1, d: "한 번 사면 계속, 광고 자리를 모두 광고 없이 바로 통과해요", shop: true }, // 11-24 대표 결정: 월 정기권이 아니라 한 번 결제
    cgPack: { n: "화보 팩", how: "own", price: 3300, d: "연인·결혼 화보 추가분(준비 중인 그림이 들어오면 열려요)", shop: true, soon: true },
    giftSlot: { n: "회차 시작 선물 한 칸 더", how: "item", price: 2200, d: "다음 인생을 시작할 때 기억 포인트 +5", pts: 5 },
    chatRedo: { n: "까톡 답 바꾸기", how: "item", price: 500, d: "방금 보낸 까톡 답을 한 번 물러요" },
  },
};
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
if (typeof location !== "undefined") { if (/#.*qaoff/.test(location.hash)) LS("a6_qa", "0"); else if (/#.*\bqa\b/.test(location.hash)) LS("a6_qa", "1"); }
export const qaOn = () => LS("a6_qa") === "1" || (typeof location !== "undefined" && /bmtest/.test(location.hash));
export const bmOn = () => BM.on;
const own = () => { try { return JSON.parse(LS("a6_bm_own") || "{}"); } catch (e) { return {}; } };
const setOwn = (o) => LS("a6_bm_own", JSON.stringify(o));
export const owned = (slot) => own()[slot] || 0;
export const extraSlots = () => Math.min(BM.slots.saveSlot.max, +owned("saveSlot") || 0);
export const priceText = (slot) => { const x = BM.slots[slot]; return !x ? "" : x.how === "ad" ? "광고 보기" : `${x.price.toLocaleString()}원${x.per ? "/" + x.per : ""}`; };
// 자리 하나를 쓴다. 돌려주는 값: { ok, msg }
export async function pay(slot) {
  const x = BM.slots[slot]; if (!x || !bmOn()) return { ok: false, msg: "" };
  if (x.soon && !qaOn()) return { ok: false, msg: `${x.n}: 준비 중이에요` };
  if (x.how === "ad" && owned("noAds")) return { ok: true, msg: "광고 없애기 · 바로 통과" };
  if (!qaOn()) return { ok: false, msg: `${x.n}: 준비 중이에요(${x.how === "ad" ? "광고" : "결제"} 연결 전)` };
  if (x.how === "own" || x.how === "sub") { const o = own(); if (x.how === "sub" && o[slot]) return { ok: false, msg: "이미 쓰는 중이에요" }; if (x.max && (o[slot] || 0) >= x.max) return { ok: false, msg: x.max === 1 ? "이미 갖고 있어요" : "더 늘릴 수 없어요" }; o[slot] = (o[slot] || 0) + 1; setOwn(o); }
  return { ok: true, msg: `QA 모드 · ${x.n} 통과(${priceText(slot)})` };
}
export const label = (slot) => { const x = BM.slots[slot]; if (!x) return ""; return `${x.n} · ${priceText(slot)}${qaOn() ? "" : " · 준비 중"}`; };
export const trialLeft = () => 0; // 체험 운영 종료(옛 호출부 호환)
