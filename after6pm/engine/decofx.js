// 방 꾸미기(web/deco) 감성 점수 → 운영 효과. 파티룸 방(rm)·에어씨앤씨 숙소(u) 공통.
// - 직접 꾸미면 점수 그대로(잘 꾸미면 80~100), "알아서 꾸며 줘"는 손재주·감각에 따라 52~64(상한), 업체 스타일링비가 든다.
// - 안 꾸민 방(시뮬 봇 포함)은 기본 52점 = 효과 0 → 판 전체 숫자는 그대로, 꾸민 사람만 이득(잘 꾸미면 월 이익 약 +10%).
// - 기존 파티룸 '컨셉 소품'(rm.decor·decorFit)은 컨셉 궁합, 이 점수는 공간 배치·감성. 둘은 따로 더해진다.
import { addMoney, gainStat, won } from "./core.js";
import * as SYN from "./syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// pivot: 효과 0이 되는 점수 / occ: 예약률 / star: 별점 목표 / price: 가격 저항(시세보다 받아도 덜 빠짐) / photo: 숙소 사진 클릭
// 200판(모두 90점 가정) 기준으로 맞춤: 파티룸은 예약·가격이 이익에 크게 번져서 작게, 숙소는 크게
export const DECO = { pivot: 52, autoMin: 52, autoMax: 64, occ: 0.07, star: 0.12, price: 0.03, photo: 0.25, abStar: 0.2, fee: 0.025 };
export const BUDGET = { pr: 1500, ab1: 650, ab2: 1000 }; // 꾸미기 예산(인테리어·세팅비에 들어 있는 몫, 게임 돈 따로 안 나감)
export const spaceOf = (kind, x) => (kind === "pr" ? "pr" : ["tworoom", "hanok", "detached"].includes(x?.ty) ? "ab2" : "ab1");
export function autoScore(s) { return clamp(Math.round(DECO.autoMin + ((s.st.hands || 0) + (s.st.sense || 0)) * 0.06), DECO.autoMin, DECO.autoMax); }
export const score = (s, x) => (x && x.decoS != null ? x.decoS : DECO.pivot); // 안 꾸민 방 = 기본(효과 0)
export const lift = (s, x) => clamp((score(s, x) - DECO.pivot) / 100, -0.25, 0.4);
export const fee = (s, sp) => Math.round(BUDGET[sp] * DECO.fee * SYN.pi(s) / 5) * 5;
// 효과 숫자(보드·꾸미기 화면 표시용)
export function effect(s, x, kind, sc) {
  const l = clamp(((sc ?? score(s, x)) - DECO.pivot) / 100, -0.25, 0.4);
  return kind === "pr"
    ? { occ: Math.round(l * DECO.occ * 1000) / 10, star: Math.round(l * DECO.star * 100) / 100, price: Math.round(l * DECO.price * 1000) / 10 }
    : { occ: Math.round(l * DECO.photo / 0.8 * 1000) / 10, star: Math.round(l * DECO.abStar * 100) / 100, price: 0 };
}
export function effectTxt(s, x, kind, sc) {
  const e = effect(s, x, kind, sc), sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v);
  return kind === "pr" ? `예약 ${sg(e.occ)}% · 별점 ${sg(e.star.toFixed(2))} · 가격 여유 ${sg(e.price)}%` : `사진 클릭 ${sg(e.occ)}% · 별점 ${sg(e.star.toFixed(2))}`;
}
// 저장 크기 작게: { f, w, c, b, it: [[가구, i, j, 방향], …] }
export function pack(lay) { return { f: lay.floor, w: lay.wall, c: lay.cash, b: lay.budget, it: (lay.items || []).map((o) => [o.t, o.i, o.j, o.r || 0]) }; }
export function unpack(p, space) { if (!p) return null; return { v: 1, space, floor: p.f || "base", wall: p.w || "base", cash: p.c, budget: p.b, items: (p.it || []).map(([t, i, j, r]) => ({ t, i, j, r })) }; }
// 꾸미기 결과 반영. auto = "알아서 꾸며 줘"(점수 상한·스타일링비)
export function apply(s, x, kind, lay, res, auto) {
  const sp = spaceOf(kind, x), before = score(s, x), firstHand = !x.decoHand;
  const sc = clamp(Math.round(auto ? Math.min(res.score, autoScore(s)) : res.score), 0, 100);
  x.deco = pack(lay); x.decoS = sc; x.decoAuto = !!auto; x.decoT = s.t;
  const lines = [`감성 점수 ${before} → ${sc}`];
  if (auto) { const c = fee(s, sp); s.cash -= c; addMoney(s, "exp", kind === "pr" ? "파티룸 꾸미기" : "에어씨앤씨 꾸미기", c); lines.push(`스타일링 업체 −${won(c)}`); }
  else if (firstHand) { x.decoHand = 1; gainStat(s, "sense", 0.6); gainStat(s, "hands", 0.4); lines.push("감각·손재주 +"); }
  lines.push(effectTxt(s, x, kind));
  return { lines, score: sc };
}
