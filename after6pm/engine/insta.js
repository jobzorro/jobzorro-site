// 인별그램 보드: 팔로워 → 협찬·공동구매. 꾸준히 올려야 크고, 얼굴을 걸면 빨리 크지만 회사가 안다.
import * as D from "./defs.js";
import { addMoney, log, gainStat, mod, applyEff, won } from "./core.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function init() { return { f: 0, posts: 0, reels: 0, eng: 0.06, niche: null, face: false, lv: 1, deals: 0, monthRev: 0, postT: -1, gongT: -99, hist: [], dealsDone: 0 }; }
export function lvOf(f) { let i = 0; D.INSTA_LV.forEach((x, k) => { if (f >= x.f) i = k; }); return i + 1; }

function nicheMult(s) {
  const I = s.ins, n = D.INSTA_NICHES[I.niche]; if (!n) return 0.75;
  const st = n.stat.reduce((a, k) => a + (s.st[k] || 0), 0) / n.stat.length;
  let m = 0.7 + st / 110;
  if (n.hobby && s.hb.joined.some((h) => n.hobby.includes(h))) m *= 1.2;
  if (n.job && s.sj.active.includes(n.job)) m *= 1.25;
  if (I.niche === "fit") m *= mod(s, "instaFit", 1);
  return m;
}
// 매력: 얼굴 공개 효과(매력 60이면 기존 1.3). 외국어: 해외 팔로워(외국어 40이면 1, 높을수록 최대 +20%)
export function grow(s) { return BIG.fullGrow(s) * mod(s, "instaMult", 1) * (s.ins.face ? clamp(1.15 + (s.st.charm || 0) / 400, 1.15, 1.55) : 1) * clamp(1 + ((s.st.lang || 0) - 40) / 500, 0.95, 1.2) * (s.era.algo ? 0.55 : 1) * (SYN.on(s, "insta_hobby") ? 1.2 : 1) * nicheMult(s); }
// 밸런스(11-21): 협찬비는 팔로워의 제곱근에 비례(원래 f/1000*2.5, 명성 /100). 1천 6만·5천 14만·3만 35만·10만 63만 안팎
export function dealPay(s) { const I = s.ins; return Math.round(Math.max(5, Math.sqrt(I.f) * 0.2) * Math.sqrt(I.eng / 0.06) * SYN.pi(s) * (1 + (s.fame || 0) / 250)); }
// 팔로워가 클수록 새로 느는 속도가 줄어드는 포화 곡선. 계정마다 "터질 체질" kx(0.5~3.5배)가 달라 천장이 다르다
export const SAT_K = 30000;
export function sat(f, kx = 1) { const K = SAT_K * (kx || 1); return K / (K + Math.max(0, f)); }
function ensureKx(s, r) { const I = s.ins; if (!I.kx) I.kx = clamp(Math.exp(0.6 * r.normal()), 0.5, 3.5); }
// 한 달 업로드(피드+릴스) 횟수에 따른 효과: 2회까지 온전히, 3회째 35%, 4회째부터 12%
export function upFactor(s) { const I = s.ins; if (I.upT !== s.t) return 1; const n = I.upN || 0; return n < 2 ? 1 : n === 2 ? 0.35 : 0.12; }
function countUp(s) { const I = s.ins; if (I.upT !== s.t) { I.upT = s.t; I.upN = 0; } I.upN++; }

export function setNiche(s, k) { const I = s.ins; if (!D.INSTA_NICHES[k]) return { ok: false }; if (I.niche && I.niche !== k) { I.f = Math.round(I.f * 0.7); I.niche = k; return { ok: true, msg: `주제를 ${D.INSTA_NICHES[k].n}(으)로 바꿨어요. 팔로워 30%가 떠났어요` }; } I.niche = k; return { ok: true, msg: `${D.INSTA_NICHES[k].n} 계정으로 시작!` }; }
export function setFace(s, v) { s.ins.face = !!v; return { ok: true, msg: v ? "얼굴 공개 계정: 더 빨리 크지만 회사가 알 수 있어요" : "얼굴 없는 계정: 천천히, 조용히" }; }

export function can(s, id) {
  const I = s.ins;
  if (!I.niche) return "계정 주제를 먼저 정하세요(인별그램 보드)";
  if (id === "in_deal" && I.deals < 1) return "들어온 협찬이 없어요";
  if (id === "in_gong" && I.f < 10000) return "팔로워 1만부터";
  if (id === "in_gong" && s.t - I.gongT < 3) return "공동구매는 3달에 한 번";
  return null;
}
export function act(s, r, id, arg, boost = 1) {
  const I = s.ins, lines = [];
  if (id === "in_post") {
    ensureKx(s, r); const uf = upFactor(s); countUp(s);
    I.posts++; I.postT = s.t;
    const g = Math.round((25 + I.f * 0.012 * sat(I.f, I.kx)) * grow(s) * boost * (0.6 + I.eng * 6) * uf);
    I.f += g; lines.push(`팔로워 +${g.toLocaleString()} → ${I.f.toLocaleString()}`);
    if (uf < 1) lines.push(`이번 달 ${I.upN}번째 업로드: 피로도 때문에 효과 ${Math.round(uf * 100)}%`);
    if (SYN.on(s, "insta_pr")) { for (const rm of s.pr.rooms) if (rm.status === "open") rm.buzz = Math.min(100, (rm.buzz || 0) + 2 + I.f / 4000); lines.push("파티룸 입소문 +"); }
    gainStat(s, "sense", 0.3);
    return { lines, msg: r.pick(["필터 고르는 데 20분, 캡션 쓰는 데 40분.", "자연광 오후 4시. 오늘 사진은 건졌다.", "해시태그 30개를 붙였다.", "\"저장각\" 카드 한 장을 만들었다."]) };
  }
  if (id === "in_reel") {
    ensureKx(s, r); const uf = upFactor(s); countUp(s);
    I.reels++; I.postT = s.t;
    let g = (40 + I.f * 0.02 * sat(I.f, I.kx)) * grow(s) * boost * Math.exp(0.7 * r.normal()) * uf;
    if (r.chance(0.05 * mod(s, "instaViral", 1) * (1 + s.st.sense / 150) * uf)) { g += 1500 + I.f * 0.15 * sat(I.f, I.kx); I.kx = Math.min(3.5, I.kx * 1.08); lines.push("릴스 터짐! 탐색 탭에 떴다"); }
    if (uf < 1) lines.push(`이번 달 ${I.upN}번째 업로드: 효과 ${Math.round(uf * 100)}%`);
    g = Math.round(g); I.f += g; lines.unshift(`팔로워 +${g.toLocaleString()} → ${I.f.toLocaleString()}`);
    if (I.face) lines.push(...applyEff(s, { eye: 2 }));
    gainStat(s, "mkt", 0.4); gainStat(s, "charm", 0.2);
    return { lines, msg: "15초짜리 영상 하나에 촬영 40번." };
  }
  if (id === "in_engage") {
    I.eng = clamp(I.eng + 0.012 * mod(s, "instaSave", 1), 0.02, 0.16); const g = Math.round(I.f * 0.005 * sat(I.f, I.kx)) + 3; I.f += g;
    gainStat(s, "talk", 0.3);
    return { lines: [`참여율 ${(I.eng * 100).toFixed(1)}%`, `팔로워 +${g}`], msg: "댓글 120개에 하나하나 답했다. 손가락이 아프다." };
  }
  if (id === "in_deal") {
    I.deals--; I.dealsDone++; const pay = Math.round(dealPay(s) * SJ.ramp(s, "insta") * SJ.skillRamp(s, "insta")); /* v4.25b 배우는 기간 */ s.cash += pay; addMoney(s, "inc", "인별 수익", pay); I.monthRev += pay;
    I.eng = clamp(I.eng - 0.004, 0.02, 0.16);
    return { lines: [`협찬비 +${won(pay)}`, "참여율 조금 −(광고 티)"], msg: r.pick(["협찬 화장품을 받고 솔직 후기를 올렸다.", "\"#광고\" 표시는 꼭 붙였다.", "브랜드 담당자와 수정만 세 번."]) };
  }
  if (id === "in_gong") {
    I.gongT = s.t; I.gongN = (I.gongN || 0) + 1; const rev = Math.round(Math.sqrt(I.f) * 1.2 * (I.eng / 0.06) * r.range(0.6, 1.4) * (s.era.winter ? 0.6 : 1)); // 원래 f*0.006*1.5
    s.cash += rev; addMoney(s, "inc", "인별 수익", rev); I.monthRev += rev; I.eng = clamp(I.eng - 0.01, 0.02, 0.16);
    return { lines: [`공구 수익 +${won(rev)}`, "참여율 −1%p", "멘탈 −3"], msg: "배송 문의 DM 400개. 택배사 전화번호를 외웠다." };
  }
  return null;
}
export function month(s, r, notes) {
  const I = s.ins; if (!I.niche) return 0;
  ensureKx(s, r); const before = I.f;
  I.f = Math.round(I.f * (I.postT === s.t ? 0.995 - 0.01 * I.f / (I.f + 60000) : 0.97)); // 큰 계정일수록 이탈도 크다
  I.eng = I.eng + (0.06 - I.eng) * 0.08;
  if (I.f >= 1000) { const lam = Math.min(3, I.f / 6000 * (I.eng / 0.06) * (s.era.winter ? 0.6 : 1)); const n = r.poisson(lam); if (n) { I.deals = Math.min(3, I.deals + n); notes.push(`인별 협찬 제안 ${n}건(대기 ${I.deals})`); } }
  if (SYN.on(s, "face")) { const e = applyEff(s, { eye: 1.5 }); void e; }
  if (I.postT !== s.t && before > 300) notes.push(`인별: 이번 달 게시물이 없어 팔로워 −${(before - I.f).toLocaleString()}`);
  const lv = lvOf(I.f); if (lv > I.lv) { notes.push(`인별 ${D.INSTA_LV[lv - 1].n} 계정 달성!`); log(s, `인별 팔로워 ${I.f.toLocaleString()}명, ${D.INSTA_LV[lv - 1].n} 계정`, "work"); }
  I.lv = Math.max(I.lv, lv); I.peak = Math.max(I.peak || 0, I.f); // 엔딩용: 최고 팔로워
  I.hist.push(I.f); if (I.hist.length > 36) I.hist.shift();
  const rev = I.monthRev; I.monthRev = 0; return rev;
}
export function todos(s) {
  const I = s.ins, t = [];
  if (!I.niche) t.push({ lv: 1, text: "인별 계정 주제 정하기", go: "insta" });
  else { if (I.postT !== s.t && I.f > 300) t.push({ lv: 1, text: "인별 이번 달 게시물 없음(팔로워 −3%)", go: "insta" }); if (I.deals) t.push({ lv: 1, text: `인별 협찬 ${I.deals}건 대기`, go: "insta" }); }
  return t;
}
