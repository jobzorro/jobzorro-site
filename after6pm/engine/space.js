// 공간형 투잡 공통 유지비(v4.27): 에어씨앤씨·무인카페·치킨. 파티룸은 pr.js 안에 같은 규칙이 있다(defs PR_HARD).
// 1) 재계약(2년)마다 월세 +5% (치킨은 chicken.js 에 이미 있음)
// 2) 가구·설비 교체: furn 달마다 처음 설비비 × furnCost 를 다시 쓴다(안 쓰면 영업이 안 되니 자동 집행)
// 3) 규모 문제: 2호점부터 지점 하나당 달마다 새벽 전화(체력·멘탈) · 잔고장 수리비
// core.js 에서 marketMonth 바로 앞에 spaceMonth(s, r, notes) 를 부른다. 난수는 r 만.
import { addMoney, won } from "./core.js";
import * as SYN from "./syn.js";

export const SPACE = {
  airbnb: { units: (s) => s.ab?.units, label: "에어씨앤씨 비용", base: (u) => u.setup || 1200, rent: true, furn: [30, 42], furnCost: 0.55, what: "침구·가전·소품 교체", call: 0.08, fix: [15, 60],
    calls: ["새벽 3시, 게스트 메시지. \"도어락 비밀번호가 안 돼요!\"", "새벽 2시, 아랫집 인터폰. \"위층 캐리어 소리 좀…\"", "새벽 4시, \"뜨거운 물이 안 나와요\" 영어 메시지 다섯 통."] },
  ucafe: { units: (s) => s.uc?.stores, label: "무인카페 비용", base: (st) => Math.max(800, (st.invested || 0) - (st.dep || 0) - (st.key || 0)), rent: true, furn: [24, 36], furnCost: 0.6, what: "머신 정비·인테리어 손보기", call: 0.12, fix: [20, 80],
    calls: ["새벽 1시, CCTV 알림. 누가 커피 머신을 발로 찼다.", "새벽 2시, \"키오스크가 카드를 먹었어요\" 전화.", "새벽 3시, 제빙기 누수로 바닥이 물바다라는 문자.", "새벽 5시, 밤새 머문 손님이 쓰레기를 잔뜩 두고 갔다."] },
  chicken: { units: (s) => s.chicken?.stores, label: "치킨 비용", base: (st) => st.equip || 3000, rent: false, furn: [36, 48], furnCost: 0.4, what: "튀김기·주방 설비 교체", call: 0.1, fix: [30, 120],
    calls: ["새벽 1시, 점장 전화. \"사장님, 알바가 안 나왔어요.\"", "새벽 2시, 배달 앱 별점 1점 알림. \"치킨이 식어서 왔어요.\"", "새벽 3시, 냉동고가 멈췄다는 문자."] },
};
export const SPACE_RENT = 0.05;

export function spaceMonth(s, r, notes) {
  const pi = SYN.pi(s);
  for (const [job, C] of Object.entries(SPACE)) {
    const L = (C.units(s) || []).filter((u) => u && u.months > 0);
    if (!L.length) continue;
    for (const u of L) {
      if (C.rent && u.months % 24 === 0 && u.rentUpT !== u.months) { u.rentUpT = u.months; u.rent = Math.round(u.rent * (1 + SPACE_RENT)); notes.push(`${u.name}: 재계약, 월세 +5% (${won(u.rent)})`); }
      if (u.furnAt === undefined) u.furnAt = u.months + r.int(C.furn[0], C.furn[1]);
      if (u.months >= u.furnAt) {
        const c = Math.round(C.base(u) * C.furnCost * pi / 10) * 10;
        s.cash -= c; addMoney(s, "exp", C.label, c); u.furnAt = u.months + r.int(C.furn[0], C.furn[1]);
        notes.push(`${u.name}: ${Math.floor(u.months / 12)}년 차 ${C.what} −${won(c)}`);
      }
    }
    if (L.length >= 2) {
      const extra = L.length - 1;
      if (r.chance(C.call * extra)) { s.hp = Math.max(0, s.hp - 3); s.mental = Math.max(0, s.mental - 3); notes.push(`${r.pick(C.calls)} 잠을 설쳤다 (체력·멘탈 −3)`); }
      if (r.chance(0.15 * extra)) { const c = Math.round(r.int(C.fix[0], C.fix[1]) * pi); s.cash -= c; addMoney(s, "exp", C.label, c); notes.push(`${r.pick(L).name}: 잔고장 수리 −${won(c)}`); }
    }
  }
}
