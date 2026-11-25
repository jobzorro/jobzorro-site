// 배우자의 일과 수입(대표 결정 11-25)
// - 인물마다 나이별 월급표가 있다(data/spouse_pay.json ← tools/make_spouse_pay.py ← data/spouse_tracks.json). 결혼한 시점의 나이에 맞는 월급으로 들어오고, 해마다 오르고, 승진하면 뛴다.
//   내 회사 사람(rel)은 배율이라 결혼할 때 내 회사 종류의 급여를 곱한다. 의사(페이닥터)·회계사·PB는 세게, 프리랜서·서비스직은 낮게.
// - 육아휴직: 아이가 태어나면 열두 달 쉰다. 그동안은 육아휴직 급여(첫 석 달 상한 250만 · 다음 석 달 200만 · 그 뒤 여섯 달은 급여의 80%, 상한 160만)만 들어오고 승급이 멈춘다.
//   프리랜서·자영업은 급여가 없다(석 달 150만, 그 뒤는 일을 줄여 60%). 복직하면 멈췄던 자리에서 다시 오른다.
// - "그만둘까": 아이가 둘이 되면 성향에 따라 묻는다(likely 는 늘, torn 은 절반, never 는 묻지 않고 '안 그만둔다'는 장면). 그만두면 수입이 0, 대신 가족 행복이 오르고 아이 비용이 줄고 손을 보탠다.
//   막내가 일곱 살이 되면 다시 일해 볼지 묻는다(경력 단절만큼 승급이 밀리고 급여 85%).
// 엔진 난수는 r.chance 한 번(torn 일 때)만 쓴다. 상태는 s.fam.sp(없으면 만들어 쓴다. 옛 저장도 그대로 돈다).
import * as GEN from "../gen/data.js";
import * as D from "./defs.js";
import { CHAR, charAge, log, jo } from "./core.js";

const P = GEN.SPOUSE_PAY?.who || {}, AGES = GEN.SPOUSE_PAY?.ages || [24, 55];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const SP = {
  x: 1, // 전체 배율(봇으로 견줄 때 환경변수 SPX)
  leave: { // steps: [휴직 몇 달째까지, 상한(만원), 급여의 몇 배(0 이면 상한 금액 그대로)] · pause: 승급이 멈추는 달 수
    emp: { months: 12, steps: [[3, 250, 1], [6, 200, 1], [12, 160, 0.8]], pause: 12 },
    self: { months: 12, steps: [[3, 150, 0], [12, 1e9, 0.6]], pause: 6 },
  },
  ask: { kids: 2, after: 2, p: { never: 0, torn: 0.5, likely: 1 } }, // 둘째가 태어나고 몇 달 뒤에, 성향별로 묻는 확률
  extra: 6, // "휴직을 여섯 달 더": 무급
  quit: { family: 10, kidCut: 0.85, ap: 1 }, // 그만두면: 가족 행복 · 아이 비용 배율(돌봄 비용이 준다) · 보태는 행동력
  stay: { never: 0, torn: -5, likely: -9 }, // 계속 다니자고 했을 때 가족 행복
  back: { kidAge: 7, cut: 0.85, family: 6 }, // 다시 일하기: 막내 나이 · 급여 배율(경력 단절) · 가족 행복
  old: [270, 330, 120], // 표에 없는 사람: 35세 이하 · 그 위 · 학생·준비생
  RANK: ["사원", "대리", "과장", "차장", "부장"],
};
const envX = () => { const v = typeof process !== "undefined" ? process.env?.SPX : undefined; return v !== undefined && v !== "" ? +v : SP.x; };
const youngest = (s) => (s.fam.kids || []).reduce((m, k) => Math.min(m, s.t - k.born), 1e9);
// 배우자 기록. 배우자가 바뀌면 새로 만든다. base = 내 회사 사람의 급여 눈금(결혼할 때 내 회사 종류)
export function box(s) {
  const id = s.fam?.spouse; if (!id) return null;
  if (!s.fam.sp || s.fam.sp.id !== id) s.fam.sp = { id, pause: 0, base: P[id]?.rel ? D.COMPANY_TYPES[s.co?.type]?.pay || 285 : 1 };
  return s.fam.sp;
}
export const stanceOf = (id) => P[id]?.stance || "torn";
const careerAge = (s, B) => clamp(Math.floor(charAge(s, CHAR[B.id]) - (B.pause || 0) / 12), AGES[0], AGES[1]);
// 지금 직급(회사원 곡선만): 0 사원 … 4 부장, 5 임원. 아니면 -1
export function rankOf(s) { const B = box(s), o = B && P[B.id]; if (!o?.promo) return -1; const a = careerAge(s, B); return o.exec && a >= o.exec ? 5 : o.promo.filter((x) => a >= x).length; }
// 휴직·퇴사를 빼고 본 월급(표의 값)
export function fullPay(s) {
  const B = box(s); if (!B) return 0; const c = CHAR[B.id], o = P[B.id];
  if (!o) return /학생|취준|준비생/.test(c?.job || "") ? SP.old[2] : (c?.age || 30) > 35 ? SP.old[1] : SP.old[0];
  return Math.round((o.pay[careerAge(s, B)] || 0) * (B.base || 1) * (B.cut || 1) * envX());
}
export const onLeave = (s) => { const B = box(s); return !!B && !B.quit && B.leaveTo != null && s.t < B.leaveTo; };
// 이번 달 실제로 들어오는 돈
export function payNow(s) {
  const B = box(s); if (!B || B.quit) return 0; const full = fullPay(s);
  if (!onLeave(s)) return full;
  const L = SP.leave[P[B.id]?.leave || "emp"], m = s.t - B.leaveFrom + 1; if (m > L.months) return 0; // 무급 연장
  const st = L.steps.find((x) => m <= x[0]) || L.steps[L.steps.length - 1];
  return Math.round(st[2] ? Math.min(st[1], full * st[2]) : st[1]);
}
// 아이가 태어난 달: 육아휴직을 시작한다. 알림 한 줄을 돌려준다
export function onBirth(s) {
  const B = box(s); if (!B || B.quit) return ""; const kind = P[B.id]?.leave || "emp", L = SP.leave[kind], n = CHAR[B.id].name;
  B.leaveFrom = s.t; B.leaveTo = s.t + L.months; B.pause = (B.pause || 0) + L.pause;
  return kind === "emp" ? `${jo(n, "이", "가")} 육아휴직에 들어갔다(${L.months}달). 그동안 월급 대신 육아휴직 급여가 들어온다: 첫 석 달 최대 250만 · 다음 석 달 200만 · 그 뒤 160만. 승급은 멈춘다`
    : `${jo(n, "이", "가")} 일을 줄였다(${L.months}달). 프리랜서·자영업이라 육아휴직 급여는 없다: 석 달은 출산 급여 150만, 그 뒤는 벌이의 60%`;
}
const sc = (s, k, title, text, choices) => ({ kind: "event", who: s.fam.spouse, tag: "가족", once: "big", expr: k === "never" ? "smile" : "neutral", bg: "home", title: `${CHAR[s.fam.spouse].name} · ${title}`, text, onChoose: "sp_ev", sp: k, best: [], choices });
const N = (s) => CHAR[s.fam.spouse].name;
export function askScene(s) {
  const n = N(s), st = stanceOf(s.fam.spouse), self = (P[s.fam.spouse]?.leave || "emp") === "self";
  const text = st === "likely"
    ? `둘째가 백일을 넘긴 밤. ${jo(n, "이", "가")} 젖병 여섯 개를 삶다가 불을 끈다. ${self ? "밀린 일감 목록" : "복직 날짜가 적힌 달력"}을 한참 보더니, 일을 그만두면 어떻겠느냐고 묻는다. 어린이집 대기는 47번이고 지난주에는 두 아이가 번갈아 열이 났다. 농담처럼 꺼냈지만 눈은 웃지 않는다.`
    : `${self ? "일을 다시 늘리기로 한 달" : "복직"}을 한 달 앞둔 저녁. ${jo(n, "이", "가")} ${self ? "거래처 연락처" : "사직서 양식"}와 어린이집 입소 확인서를 식탁에 나란히 놓는다. 둘 다 아직 빈칸이다. 일을 놓고 싶지는 않은데 둘을 맡기고 나갈 자신도 없다고 한다. 내 생각을 묻는다.`;
  return sc(s, "ask", "그만둘까", text, [
    { t: "계속 다니자고, 등원은 내가 맡겠다고 한다", eff: {}, text: `${jo(n, "은", "는")} 한참 말이 없다가 고개를 끄덕였다. 다음 날 아침, 어린이집 가방 두 개가 현관에 나와 있었다. 하나는 내 몫이다.` },
    { t: "그만두라고, 벌이는 내가 맡겠다고 한다", eff: {}, text: `${jo(n, "이", "가")} 길게 숨을 내쉬었다. 그날 밤은 오랜만에 둘 다 알람 없이 잤다. 다음 달부터 통장에 들어오는 줄이 하나 줄어든다.` },
    { t: `${self ? "여섯 달만 더 쉬자고" : "휴직을 여섯 달 더 쓰자고"} 한다`, eff: {}, text: `${self ? "일감은 여섯 달 뒤에 다시 받기로 했다" : "회사에 연장 신청서를 냈다. 급여는 안 나온다"}. ${jo(n, "은", "는")} 달력의 날짜를 여섯 칸 뒤로 옮겨 적었다.` },
  ]);
}
export function neverScene(s) {
  const n = N(s), self = (P[s.fam.spouse]?.leave || "emp") === "self";
  return sc(s, "never", "그만둘 생각은 없다", `둘째가 백일을 넘긴 밤. ${jo(n, "이", "가")} 달력에 ${self ? "일을 다시 받는 날을" : "복직 날짜를"} 빨간 펜으로 적는다. 그만둘 생각은 한 번도 안 했다고 한다. 아이 둘을 키우는 사람이 일까지 잘하면 그게 제일 멋있지 않으냐고. 휴대폰 알람은 벌써 평소보다 한 시간 일찍 맞춰져 있다.`, [
    { t: "아침 등원은 내가 맡겠다고 한다", eff: { family: 5 }, text: `${jo(n, "이", "가")} 웃으며 어린이집 가방을 내 쪽으로 밀었다. 일하는 사람이 둘인 집은 아침이 전쟁이고, 그 전쟁을 같이 치르기로 했다.` },
    { t: "멋있다고 한다", eff: { family: 3, mental: 2 }, text: `${jo(n, "은", "는")} 그 말은 승진하고 나서 다시 해 달라고 했다.` },
  ]);
}
export function backScene(s) {
  const n = N(s);
  return sc(s, "back", "다시 일해 볼까", `막내가 초등학교에 들어간 봄. ${jo(n, "이", "가")} 오래된 노트북을 꺼내 이력서를 연다. 빈칸이 된 몇 해를 뭐라고 써야 할지 모르겠다고 한다. 그래도 다시 일해 보고 싶다고, 조금 겁은 난다고 한다.`, [
    { t: "빈칸에는 '아이 둘을 키움'이라고 쓰라고 한다", eff: {}, text: `${jo(n, "이", "가")} 그 줄을 정말로 적었다. 석 달 뒤 첫 출근 날, 현관에서 구두를 세 번 고쳐 신고 나갔다. 급여는 예전만 못하지만 통장에 줄이 하나 다시 생겼다.` },
    { t: "서두르지 말라고 한다", eff: { family: 2 }, text: `${jo(n, "은", "는")} 노트북을 덮었다. 이력서는 지우지 않고 저장해 뒀다.` },
  ]);
}
// 달 마감: 승진 알림 · 복직 알림 · "그만둘까" · "다시 일해 볼까"
export function spMonth(s, r, notes, scenes) {
  const B = box(s); if (!B) return; const n = CHAR[B.id].name, K = s.fam.kids || [];
  if (!B.quit && B.leaveTo != null && s.t + 1 === B.leaveTo) notes.push(`${jo(n, "이", "가")} 다음 달에 일터로 돌아간다. 월급이 다시 들어온다(${fullPay(s)}만)`);
  if (!B.quit && !onLeave(s)) { const rk = rankOf(s); if (rk >= 0) {
    if (B.rank != null && rk > B.rank) { const what = rk >= 5 ? "임원이 됐다" : `${jo(SP.RANK[rk], "으로", "로")} 승진했다`; notes.push(`${jo(n, "이", "가")} ${what}. 월급 ${fullPay(s)}만`); s.fam.happy = clamp((s.fam.happy || 0) + 3, 0, 100); log(s, `${jo(n, "이", "가")} ${what}.`, "life"); }
    B.rank = rk; } }
  if (K.length >= SP.ask.kids && B.asked == null && !B.quit && youngest(s) >= SP.ask.after) {
    B.asked = s.t; const st = stanceOf(B.id);
    if (st === "never") scenes.push(neverScene(s)); else if (r.chance(SP.ask.p[st] ?? 0.5)) scenes.push(askScene(s));
  }
  if (B.quit && B.backAsk == null && K.length && youngest(s) >= SP.back.kidAge * 12) { B.backAsk = s.t; scenes.push(backScene(s)); }
}
export function choose(s, r, i, okv, scn) {
  const B = box(s); if (!B) return []; const k = scn?.sp, n = CHAR[B.id].name, fam = (v) => { s.fam.happy = clamp((s.fam.happy || 0) + v, 0, 100); return v ? `가족 ${v > 0 ? "+" : ""}${v}` : ""; };
  if (k === "ask") {
    if (i === 0) return [fam(SP.stay[stanceOf(B.id)] ?? -5), "계속 맞벌이로 간다"].filter(Boolean);
    if (i === 1) { B.quit = true; B.quitT = s.t; B.leaveTo = null; log(s, `${jo(n, "이", "가")} 일을 그만뒀다.`, "life"); return [fam(SP.quit.family), "배우자 수입이 끊긴다", `아이 비용 −${Math.round((1 - SP.quit.kidCut) * 100)}% · 배우자가 손을 보탠다(행동력 +${SP.quit.ap})`]; }
    const L = SP.leave[P[B.id]?.leave || "emp"]; B.leaveFrom = B.leaveFrom ?? s.t; B.leaveTo = Math.max(B.leaveTo ?? s.t, s.t) + SP.extra; B.pause = (B.pause || 0) + SP.extra; void L; return [fam(4), `${SP.extra}달 더 쉰다(그동안 수입 없음)`];
  }
  if (k === "back") { if (i === 0) { B.pause = (B.pause || 0) + Math.max(0, s.t - (B.quitT ?? s.t)); B.quit = false; B.cut = SP.back.cut; B.leaveTo = null; B.rank = null; log(s, `${jo(n, "이", "가")} 다시 일을 시작했다.`, "life"); return [fam(SP.back.family), `배우자 수입이 돌아온다(월 ${fullPay(s)}만)`]; } return []; }
  return [];
}
// 가족 화면에 붙는 한 줄: 직급·휴직·퇴사
export function statLine(s) {
  const B = box(s); if (!B) return ""; if (B.quit) return "일을 그만둠";
  if (onLeave(s)) { const L = SP.leave[P[B.id]?.leave || "emp"], m = s.t - B.leaveFrom + 1; return `${m > L.months ? "무급 휴직" : P[B.id]?.leave === "self" ? "일을 줄임" : "육아휴직"} · ${B.leaveTo - s.t}달 남음`; }
  const rk = rankOf(s); return rk >= 5 ? "임원" : rk >= 0 ? SP.RANK[rk] : P[B.id]?.trackN || "";
}
export const kidCut = (s) => (s.fam?.sp?.quit && s.fam.sp.id === s.fam.spouse ? SP.quit.kidCut : 1);
export const quitAp = (s) => (s.fam?.sp?.quit && s.fam.sp.id === s.fam.spouse ? SP.quit.ap : 0);
// 시험용
export function demo(s, kind) { box(s); return kind === "never" ? neverScene(s) : kind === "back" ? backScene(s) : askScene(s); }
