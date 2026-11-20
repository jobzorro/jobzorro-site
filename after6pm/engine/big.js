// 온잡(전업)과 명성: 투잡이 아주 잘되면 회사를 나와 판을 키운다. 극소수만 크게 터진다.
import * as D from "./defs.js";
import { addMoney, log, mod, won, gainStat, applyEff } from "./core.js";
import * as SYN from "./syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const isFull = (s) => !!((s.co.quit || s.co.fired) && s.sj.active.length);
export const fame = (s) => s.fame || 0;
export function init() { return { fran: null, plat: null, vip: false, prconT: -1, aiT: -99 }; }

// 행동 조건
export function can(s, id) {
  const B = s.big, f = fame(s), act = (k) => s.sj.active.includes(k);
  if (id === "bg_prcon") { if (!act("pr")) return "파티룸을 하고 있어야 해요"; if (s.pr.rooms.length < 3 || f < 35 || s.pr.know < 60) return `지점 3곳·명성 35·노하우 60부터(지금 ${s.pr.rooms.length}곳·${Math.round(f)}·${Math.round(s.pr.know)})`; if (B.prconT === s.t && !isFull(s)) return "회사 다니면서는 한 달에 한 번"; return null; }
  if (id === "bg_brand") { if (B.fran) return "이미 가맹 사업 중이에요"; if (!act("pr")) return "파티룸을 하고 있어야 해요"; if (s.pr.rooms.length < 5 || f < 65) return `지점 5곳·명성 65부터(지금 ${s.pr.rooms.length}곳·${Math.round(f)})`; if (!isFull(s)) return "가맹 사업은 전업(온잡)이어야 해요"; return null; }
  if (id === "bg_vip") { if (B.vip) return "이미 출시했어요"; if (!act("cs")) return "컨설팅을 하고 있어야 해요"; if (s.cs.lv < 4 || f < 40) return `컨설팅 Lv4·명성 40부터(지금 Lv${s.cs.lv}·${Math.round(f)})`; return null; }
  if (id === "bg_ai") { if (B.plat?.live && B.plat.tier === "big") return "플랫폼이 대박 났어요"; if (B.plat?.live && s.t - B.aiT < 12 && B.plat.prog >= 100) return `리뉴얼은 출시 1년 뒤부터(${12 - (s.t - B.aiT)}달 남음)`; if (!act("cs")) return "컨설팅을 하고 있어야 해요"; if (s.cs.lv < 4 || f < 45) return `컨설팅 Lv4·명성 45부터(지금 Lv${s.cs.lv}·${Math.round(f)})`; if (!isFull(s)) return "플랫폼은 전업(온잡)이어야 만들 수 있어요"; if (!B.plat && s.cash < 2000) return "개발비 2,000만이 필요해요"; if (B.plat?.live && B.plat.prog >= 100 && s.cash < 1000) return "리뉴얼 비용 1,000만이 필요해요"; return null; }
  return null;
}
export function act(s, r, id) {
  const B = s.big, f = fame(s), pi = SYN.pi(s);
  if (id === "bg_prcon") {
    B.prconT = s.t; const fee = Math.round(r.int(150, 400) * (1 + f / 100) * pi); s.cash += fee; addMoney(s, "inc", "파티룸 창업 컨설팅", fee);
    s.fame = clamp(f + 0.5, 0, 100); s.pr.know = Math.min(100, s.pr.know + 0.5);
    return { lines: [`컨설팅비 +${won(fee)}`, "명성 +0.5"], msg: r.pick(["\"사장님 파티룸 보고 왔어요. 저도 하나 차리고 싶어요.\" 입지부터 같이 봤다.", "예비 창업자와 임장 3곳. 두 곳은 말렸다.", "손익표를 같이 짰다. \"이 월세면 12월에만 벌어요.\""]) };
  }
  if (id === "bg_brand") {
    B.fran = { n: 0, t: s.t, fee: 0 }; s.cash -= 1500; addMoney(s, "exp", "가맹 사업 준비(법률·매뉴얼)", 1500); log(s, "공간 브랜드 가맹 사업을 시작했다.", "work");
    return { lines: ["가맹 사업 시작 −1,500만(정보공개서·매뉴얼)", "매달 가맹 문의가 들어와요"], msg: "내 파티룸 이름으로 간판이 하나 더 걸리는 상상을 했다." };
  }
  if (id === "bg_vip") { B.vip = true; log(s, "VIP 이직 패키지를 출시했다.", "work"); return { lines: ["VIP 이직 패키지 출시(건당 수백만)", "명성이 높을수록 문의가 와요"], msg: "\"임원 면접까지 1:1로 갑니다.\" 가격표에 0을 하나 더 붙였다." }; }
  if (id === "bg_ai") {
    // 처음엔 개발비 2,000만. 이미 소소하게 운영 중이면 1년 뒤 리뉴얼(1,000만)로 다시 대박을 노린다
    if (!B.plat) { B.plat = { prog: 0, users: 0, live: false, tier: null }; s.cash -= 2000; addMoney(s, "exp", "AI 플랫폼 개발비", 2000); }
    else if (B.plat.live && B.plat.prog >= 100) { B.plat.prog = 0; B.plat.renew = true; s.cash -= 1000; addMoney(s, "exp", "AI 플랫폼 리뉴얼비", 1000); }
    const P = B.plat, g = Math.round(10 + s.st.num / 15 + s.st.sense / 25 + (s.sj.found.vibe !== undefined ? 6 : 0)); P.prog = Math.min(100, P.prog + g); gainStat(s, "num", 0.6);
    if (P.prog < 100) return { lines: [`${P.renew ? "리뉴얼" : "개발"} ${P.prog}%`], msg: r.pick(["바이브코딩으로 첨삭 엔진을 붙였다.", "베타 테스터 20명에게 링크를 보냈다.", "결제 모듈에서 하루를 날렸다."]) };
    B.aiT = s.t; const p = clamp(0.08 + s.st.num / 1500 + f / 1000 + (s.era.ai ? 0.03 : 0), 0.1, 0.2);
    if (r.chance(p)) { P.live = true; P.tier = "big"; P.users = Math.max(P.users, 800); P.t = s.t; s.fame = clamp(f + 8, 0, 100); log(s, "AI 자소서 플랫폼이 대박 났다.", "work"); return { lines: [`대박! 성공 확률 ${Math.round(p * 100)}%를 뚫었다`, "가입자 폭증, 명성 +8"], msg: "\"자소서 첫 문장, AI가 두괄식으로 바꿔 드립니다.\" 서버가 세 번 터졌다. 좋은 신호다." }; }
    const was = P.live; P.live = true; P.tier = "small"; P.users = Math.max(P.users, 300); P.renew = false; s.mental = clamp(s.mental - 6, 0, 100);
    log(s, was ? "리뉴얼했지만 대박은 아니었다. 소소하게 계속 운영한다." : "AI 플랫폼 출시. 대박은 아니지만 소소하게 굴러간다.", "work");
    return { lines: ["대박은 아니지만 굴러가요(소소한 구독 수익)", "1년 뒤 리뉴얼로 다시 노릴 수 있어요", "멘탈 −6"], msg: "가입자 300명. 그래도 매일 누군가는 쓴다." };
  }
  return null;
}

// 매달: 명성, 전업 비용, 가맹점, 플랫폼
export function month(s, r, notes, scenes) {
  const B = s.big, pr = s.pr, cs = s.cs, pi = SYN.pi(s);
  let g = 0;
  if (s.sj.active.includes("pr")) { g += pr.rooms.filter((x) => x.status === "open" && x.rating >= 4.6).length * 0.25 + (pr.rooms.length >= 4 ? 0.4 : 0); }
  if (s.sj.active.includes("cs")) { g += (cs.lv >= 4 ? 0.5 : 0) + (cs.lv >= 5 ? 0.8 : 0); }
  g += Math.min(1.5, (s.ins?.f || 0) / 40000) + Math.min(1, (cs.ch?.youtube?.subs || 0) / 20000);
  if (isFull(s)) g *= 1.3;
  s.fame = clamp(fame(s) * 0.994 + g, 0, 100);
  if (isFull(s)) {
    const hi = Math.round(25 * pi); s.cash -= hi; addMoney(s, "exp", "건강보험(지역가입)", hi);
    const side = s.hist.at(-1)?.side ?? 0;
    if (side < 0.8 * (s.month?.exp ? 300 : 300)) { s.mental = clamp(s.mental - 2, 0, 100); }
  }
  // 방송·인터뷰 섭외(명성 높을 때)
  if (fame(s) >= 55 && r.chance(0.04)) { s.fame = clamp(fame(s) + 3, 0, 100); scenes.push({ kind: "story", title: "방송 섭외", text: r.pick(["\"퇴근 후 사장님\" 특집 다큐에서 연락이 왔다. 카메라 앞에서 손이 떨렸다.", "경제 너튜브 인터뷰 조회수 40만. 댓글에 \"저도 해 볼래요\"가 가득."]) + " (명성 +3)", choices: [{ t: "계속", eff: {}, text: "" }] }); }
  // 가맹 사업
  if (B.fran) {
    const F = B.fran;
    if (r.chance(clamp(0.08 + fame(s) / 400, 0, 0.35))) { F.n++; const fee = Math.round(1500 * pi); s.cash += fee; addMoney(s, "inc", "가맹비", fee); notes.push(`가맹점 ${F.n}호 계약! 가맹비 ${won(fee)}`); }
    if (F.n) { const roy = Math.round(F.n * 90 * pi * (s.era.winter ? 0.7 : 1)); s.cash += roy; addMoney(s, "inc", "가맹 로열티", roy); }
    if (F.n >= 3 && r.chance(0.04)) { const c = Math.round(r.int(300, 1200) * pi); s.cash -= c; addMoney(s, "exp", "가맹점 분쟁", c); s.fame = clamp(fame(s) - 4, 0, 100); notes.push(`가맹점 분쟁: 합의금 ${won(c)}, 명성 −4`); if (r.chance(0.3)) { F.n--; notes.push("가맹점 한 곳이 계약을 끊었다"); } }
  }
  // AI 플랫폼
  if (B.plat?.live) {
    const P = B.plat, cap = P.tier === "big" ? 3000 + fame(s) * 500 : 400 + fame(s) * 15;
    P.users = Math.round(Math.min(cap, P.users * (1.12 + (s.era.ai ? 0.04 : 0)) + 50) * (P.users > cap * 0.9 ? 0.99 : 1));
    if (r.chance(0.03)) { P.users = Math.round(P.users * 0.6); scenes.push({ kind: "story", title: "대기업이 비슷한 AI를 냈다", text: "포털 회사가 무료 자소서 AI를 출시했다. 가입자 40%가 빠져나갔다.", choices: [{ t: "계속", eff: {}, text: "" }] }); }
    const paid = Math.round(P.users * 0.05), rev = Math.round(paid * 1.9), cost = Math.round(((P.tier === "big" ? 150 : 40) + P.users * 0.004) * pi);
    s.cash += rev - cost; addMoney(s, "inc", "AI 플랫폼 구독", rev); addMoney(s, "exp", "플랫폼 서버·인건비", cost);
    P.last = { users: P.users, paid, rev, cost };
  }
}
// 전업이면 판이 커진다: 컨설팅 처리량·문의, 인별 성장, 파티룸 평일 영업
export const fullCap = (s) => (isFull(s) ? 2.0 : 0.6); // 회사 다니면 주 10시간 남짓
export const fullLead = (s) => (isFull(s) ? 1.5 * (1 + fame(s) / 120) : 1 + fame(s) / 500);
export const fullGrow = (s) => (isFull(s) ? 1.3 * (1 + fame(s) / 200) : 1 + fame(s) / 600);
export const fullWk = (s) => (isFull(s) ? 1.15 : 1);
export function todos(s) {
  const t = [], B = s.big;
  if (B.plat && !B.plat.live && !B.plat.failed && B.plat.prog < 100) t.push({ lv: 1, text: `AI 플랫폼 개발 ${B.plat.prog}%`, go: "cs" });
  return t;
}
