// 돈 버는 자리(BM) 모음. 11-24 대표 결정으로 여섯 곳을 모두 켰다(on: true).
// 아직 결제·광고 모듈이 없어서 "체험 운영"으로 돈다: 광고 자리는 광고 없이 바로 통과하고, 아이템 자리는 자리마다 한 번만 무료로 써 볼 수 있다(그 뒤에는 '준비 중' 안내).
// BM안이 확정되면 pay() 안을 결제·광고 모듈에 연결하고 TRIAL 을 끄면 된다.
export const BM = {
  on: true,
  trial: true, // 체험 운영
  slots: {
    // 미니게임(1년에 한 번, 큰 일)
    mgRetry: { n: "다시 도전", how: "ad", d: "미니게임을 망쳤을 때 광고를 보고 한 번 더 해요" },
    mgSkip: { n: "건너뛰기권", how: "item", d: "미니게임을 안 하고 보통 결과를 받아요" },
    mgBest: { n: "만점 보장권", how: "item", d: "망친 뒤 최고 점수로 바꿔 받아요" },
    // 행동력
    apAd: { n: "행동력 +1", how: "ad", d: "광고를 보고 이번 달 행동력을 1 채워요(한 달 1번)", ap: 1 },
    apItem: { n: "에너지 드링크", how: "item", d: "이번 달 행동력을 2 채워요", ap: 2 },
    // 1회차 결산 등급
    gradeUp: { n: "S등급 보상 받기", how: "item", d: "A·B·C 등급이 S등급의 2회차 시작 보상을 받아요" },
  },
};
export const bmOn = () => BM.on || (typeof location !== "undefined" && /bmtest/.test(location.hash));
const KEY = "a6_bm_trial";
const used = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } };
export const trialLeft = (slot) => (BM.slots[slot]?.how === "item" ? (used()[slot] ? 0 : 1) : null);
// 자리 하나를 쓴다. 돌려주는 값: { ok, msg }
export async function pay(slot) {
  const x = BM.slots[slot]; if (!x || !bmOn()) return { ok: false, msg: "" };
  if (typeof location !== "undefined" && /bmtest/.test(location.hash)) return { ok: true, msg: "시험 모드" };
  if (x.how === "ad") return { ok: true, msg: "광고가 들어갈 자리예요(지금은 광고 없이 통과)" };
  const u = used(); if (u[slot]) return { ok: false, msg: `${x.n}: 체험 1회를 이미 썼어요. 아이템은 준비 중이에요` };
  u[slot] = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) {}
  return { ok: true, msg: `${x.n}: 체험 1회 무료(아이템 가격은 준비 중)` };
}
export const label = (slot) => { const x = BM.slots[slot]; if (!x) return ""; return `${x.n} · ${x.how === "ad" ? "광고 보기" : trialLeft(slot) ? "아이템(체험 1회)" : "아이템(준비 중)"}`; };
