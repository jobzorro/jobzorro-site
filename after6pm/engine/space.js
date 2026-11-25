// 공간형 투잡 공통 유지비(v4.27): 에어씨앤씨·무인카페·치킨. 파티룸은 pr.js 안에 같은 규칙이 있다(defs PR_HARD).
// 1) 재계약(2년)마다 월세 +5%, 건물주가 반기는 곳은 +3% (11-25 파티룸과 맞춤. 치킨은 chicken.js 가 rentUpOf 로 같은 규칙을 쓴다)
//    건물주가 반기는 곳: 에어씨앤씨 = 웃돈(월세 +10%) 없이 숙박업에 동의한 집주인(도장 함정 제외) · 무인카페 = 첫 재계약 장면에서 협상에 성공한 매장 · 공통 = 건물주 인연(도우미)
//    다른 방식 히든 길 '건물 한 층 장기 임대'(hidden2 bd_land)를 열면 월세 그대로(0%). 파티룸도 같다(pr.js)
// 2) 가구·설비 교체: furn 달마다 처음 설비비 × furnCost 를 다시 쓴다(안 쓰면 영업이 안 되니 자동 집행)
// 3) 규모 문제: 2호점부터 지점 하나당 달마다 새벽 전화(스태미너·멘탈) · 잔고장 수리비. 파손·고장 확률은 지점 하나 늘 때마다 +30%(dmgX, 각 엔진의 원래 판정에 곱한다)
// 4) 무인카페 첫 재계약(24달)은 이야기 장면 '건물주의 재계약 통보'(story/ucafe.js u19)가 정한다. 장면이 36달까지 안 뜨면 그때 +5% 하고 장면을 닫는다(두 번 오르지 않게)
// core.js 에서 marketMonth 바로 앞에 spaceMonth(s, r, notes) 를 부른다. 난수는 r 만.
import * as D from "./defs.js";
import { addMoney, won, helpers } from "./core.js";
import * as SYN from "./syn.js";

export const SPACE = {
  airbnb: { units: (s) => s.ab?.units, label: "에어씨앤씨 비용", base: (u) => u.setup || 1200, rent: true, furn: [30, 42], furnCost: 0.55, what: "침구·가전·소품 교체", call: 0.08, fix: [15, 60],
    calls: ["새벽 3시, 게스트 메시지. \"도어락 비밀번호가 안 돼요!\"", "새벽 2시, 아랫집 인터폰. \"위층 캐리어 소리 좀…\"", "새벽 4시, \"뜨거운 물이 안 나와요\" 영어 메시지 다섯 통."] },
  ucafe: { units: (s) => s.uc?.stores, label: "무인카페 비용", base: (st) => Math.max(800, (st.invested || 0) - (st.dep || 0) - (st.key || 0)), rent: true, furn: [24, 36], furnCost: 0.6, what: "머신 정비·인테리어 손보기", call: 0.12, fix: [20, 80],
    calls: ["새벽 1시, CCTV 알림. 누가 커피 머신을 발로 찼다.", "새벽 2시, \"키오스크가 카드를 먹었어요\" 전화.", "새벽 3시, 제빙기 누수로 바닥이 물바다라는 문자.", "새벽 5시, 밤새 머문 손님이 쓰레기를 잔뜩 두고 갔다."] },
  chicken: { units: (s) => s.chicken?.stores, label: "치킨 비용", base: (st) => st.equip || 3000, rent: false, furn: [36, 48], furnCost: 0.4, what: "튀김기·주방 설비 교체", call: 0.1, fix: [30, 120],
    calls: ["새벽 1시, 점장 전화. \"사장님, 알바가 안 나왔어요.\"", "새벽 2시, 배달 앱 별점 1점 알림. \"치킨이 식어서 왔어요.\"", "새벽 3시, 냉동고가 멈췄다는 문자."] },
};
export const SPACE_RENT = D.PR_HARD?.rentUp ?? 0.05, SPACE_RENT_GOOD = D.PR_HARD?.rentUpGood ?? 0.03; // 재계약 인상: 보통 / 건물주가 반기는 곳(파티룸과 같은 값을 defs 에서 읽는다)
export const SPACE_DMG = D.PR_HARD?.scaleDmg ?? 0.3; // 지점 하나 늘 때마다 파손·고장 확률 +30%(파티룸 PR_HARD.scaleDmg)
export const dmgX = (n) => 1 + SPACE_DMG * Math.max(0, (n || 0) - 1);

// 건물주 성향
export const landLock = (s) => s.h2?.p?.bd_land?.open !== undefined; // 다른 방식 히든 길 '건물 한 층 장기 임대': 월세 그대로
export function landlordGood(s, job, u) {
  if (helpers(s, "pr_landlord").length) return true; // 건물주 인연(도우미)이 중간에서 말을 잘해 준다
  if (job === "airbnb") return !!u && u.owner === true && u.ownerWarm === true && u.trap !== "seal"; // 웃돈 없이 숙박업에 동의한 집주인(말을 바꾼 '도장' 함정 집은 빼고)
  if (job === "ucafe") return !!u?.llGood; // 첫 재계약 장면에서 협상에 성공한 매장
  return false;
}
export const rentUpOf = (s, job, u) => (landLock(s) ? 0 : landlordGood(s, job, u) ? SPACE_RENT_GOOD : SPACE_RENT);
export function rentUpLine(s, job, u) { // 재계약 알림 한 줄(월세는 이미 바꾼 뒤)
  const v = rentUpOf(s, job, u);
  if (!v) return `${u.name}: 재계약, 월세 그대로 (건물 장기 임대 · ${won(u.rent)})`;
  return `${u.name}: 재계약, 월세 +${Math.round(v * 100)}%${v < SPACE_RENT ? " (건물주가 반기는 곳)" : ""} (${won(u.rent)})`;
}

// 히든 길(hidden.js)이 지금 켜져 있나. 엔진이 hidden.js 를 import 하지 않게 상태만 본다(core endMonth 는 투잡 정산 뒤에 hiddenMonth 를 부르니 지난달까지의 상태)
export const hidOpen = (s, job) => s.hid?.j?.[job]?.open !== undefined;
export const hidPaused = (s, job) => hidOpen(s, job) && s.hid.j[job].pause > s.t;
export const hidOn = (s, job) => { const x = s.hid?.j?.[job]; return !!x && x.open !== undefined && (x.until === undefined || s.t < x.until) && !(x.pause > s.t); };

export function spaceMonth(s, r, notes) {
  const pi = SYN.pi(s);
  for (const [job, C] of Object.entries(SPACE)) {
    const L = (C.units(s) || []).filter((u) => u && u.months > 0);
    if (!L.length) continue;
    for (const u of L) {
      const up = () => { u.rent = Math.round(u.rent * (1 + rentUpOf(s, job, u))); notes.push(rentUpLine(s, job, u)); };
      const ucStory = job === "ucafe" && !!s.sx?.ucafe; // 재계약 장면이 있는 투잡
      if (ucStory && u.rentUpT && !u.ucsRenew && !u.rentWait) u.ucsRenew = 1; // 옛 저장: 자동 인상을 이미 받은 매장은 장면을 닫는다
      if (C.rent && u.months % 24 === 0 && u.rentUpT !== u.months) { u.rentUpT = u.months; if (ucStory && u.months === 24 && !u.ucsRenew) { u.rentWait = 1; u.rentPre = u.rent; } /* 첫 재계약은 장면이 정한다 */ else up(); }
      if (u.rentWait && u.ucsRenew) { // 장면에서 정했다. 협상해서 5%로 맞췄으면 건물주와 사이가 좋아진다(다음 재계약부터 3%)
        u.rentWait = 0;
        if (u.rentPre && u.rent > u.rentPre && u.rent <= u.rentPre * 1.06) { u.llGood = 1; notes.push(`${u.name}: 건물주와 오래 가기로 했다. 다음 재계약부터 +${Math.round(SPACE_RENT_GOOD * 100)}%`); }
        delete u.rentPre;
      }
      if (u.rentWait && u.months >= 36) { u.rentWait = 0; u.ucsRenew = 1; delete u.rentPre; up(); } // 장면이 안 떴다: 한 번만 올리고 닫는다
      if (u.furnAt === undefined) u.furnAt = u.months + r.int(C.furn[0], C.furn[1]);
      if (u.months >= u.furnAt) {
        const c = Math.round(C.base(u) * C.furnCost * pi / 10) * 10;
        s.cash -= c; addMoney(s, "exp", C.label, c); u.furnAt = u.months + r.int(C.furn[0], C.furn[1]);
        notes.push(`${u.name}: ${Math.floor(u.months / 12)}년 차 ${C.what} −${won(c)}`);
      }
    }
    if (L.length >= 2) {
      const extra = L.length - 1;
      if (r.chance(C.call * extra)) { s.hp = Math.max(0, s.hp - 3); s.mental = Math.max(0, s.mental - 3); notes.push(`${r.pick(C.calls)} 잠을 설쳤다 (스태미너·멘탈 −3)`); }
      if (r.chance(0.15 * extra)) { const c = Math.round(r.int(C.fix[0], C.fix[1]) * pi); s.cash -= c; addMoney(s, "exp", C.label, c); notes.push(`${r.pick(L).name}: 잔고장 수리 −${won(c)}`); }
    }
  }
}
