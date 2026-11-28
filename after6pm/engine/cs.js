// 취업컨설팅 보드: 진입(포지션·활동명·첫 후기·판매 채널) → 마케팅 채널 → 문의·전환 → 처리 용량 → 합격·후기 → 소개
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import { CHAR, addMoney, applyEff, helperPower, helpers, mod, won, log, eyeMult, ensureRel, isRomanceable, addAff, gainStat, giveBrk, R } from "./core.js";
import { jobEvent } from "./pr.js";
import * as SJ from "./sj.js"; // 초반 고생 배율(ramp)
import { EXTRAS } from "../gen/data.js";
import * as C2D from "./cs_data.js"; // 11-27 처방형 개편 자료(스위치 CS2_ON 이 켜졌을 때만 쓴다) // 닉네임 다섯 개와 그 이야기(data/extras.json, 11-24)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// 11-21 밸런스(10개 투잡 공통 비교, 기획 jobconsult.json: 중위 월 200만·p95 1,500만·1:1 한계 연 3억).
// 원래: 문의 수 상한 없음 → 합격·후기·소개가 서로 키워 회사 다니며 3년 차 월 1,000만, 전업 5년 차 월 9,000만까지 폭주.
// 지금: 한 달 문의는 시장 크기(leadCap, 전업이면 ×fullCapX)에 가까워질수록 덜 는다. 소개는 refMax 까지만 쌓인다.
// 무료 특강 신청자는 후기 semRev 개까지만 늘어난다(원래 후기 수에 비례해 끝없이: 후기 1,600개면 특강 한 번에 100명+).
export const CS_BAL = { leadCap: 7, fullCapX: 2, refMax: 6, semRev: 60 };
// v4.28 특이 요소(f30): 합격 보장·환불 정책 / 후기의 개인정보 / 기관 강의 입찰. 효과 크기는 여기 숫자만 바꾸면 된다
export const CS_F30 = {
  // 합격 보장: conv 결제 전환 +, lead 문의 배수, back 불합격 때 돌려주는 비율(판매 당시 정책 기준)
  guar: {
    0: { n: "보장 없음", conv: 0, lead: 1, back: 0, d: "불합격해도 환불 없음" },
    50: { n: "불합격 50% 환불", conv: 0.07, lead: 1.12, back: 0.5, d: "결제 ↑ · 불합격이면 절반 돌려줌" },
    100: { n: "불합격 전액 환불", conv: 0.13, lead: 1.25, back: 1, d: "결제 크게 ↑ · 시즌이 나쁘면 환불 폭탄" },
  },
  guarRev: 10, // 후기 10개부터 '경쟁자가 보장을 걸었다' 장면
  // 후기 가림: ap 합격 후기를 올린 달의 다음 달 행동력 −, risk 후기 1개당 논란 확률, rev 후기 효과 배수
  mask: {
    full: { n: "꼼꼼히 가림", ap: 1, risk: 0, rev: 1, d: "회사·학교·질문까지 · 합격 달마다 행동력 −1" },
    name: { n: "이름만 가림", ap: 0, risk: 0.03, rev: 1, d: "보통 · 가끔 회사가 비친다" },
    raw: { n: "그대로 올림", ap: 0, risk: 0.08, rev: 1.25, d: "후기 효과 +25% · 논란 위험 큼" },
  },
  leak: { gap: 6, cash: 100, rev: [2, 4, 6], kmong: 15 }, // 논란 최소 간격(달)·위로금·후기 감소(사과/해명 실패/버팀)·크멍 상세 감소
  // 기관 강의 입찰: 대학 강의(cs_lecture)를 한 번이라도 한 뒤, 예산 시즌(cal)에 공고. n회 × 회당(CS_LECT 강의료 × mult)
  bid: { p: 0.3, gap: 6, cal: [2, 3, 8, 9], n: 4, mult: 1.3, dc: 45, eveDc: 55, eveMult: 0.6, days: 4, leaveMax: 15, overEye: 6 },
};
const ORGS = ["지방 국립대 커리어센터", "구청 청년 일자리센터", "공공기관 신입 교육", "고용센터 청년 프로그램", "도서관 취업 아카데미"];
const employedCs = (s) => !(s.co?.quit || s.co?.fired);
// 11-25 히든 길 '경력 이직 컨설턴트' 위기(hidden.js HID_RISK.cs: 현직 정보로 상담한다는 말이 회사에 돌았다) 동안: 헤드헌터 소개가 끊기고 경력 이직 단가 ×price
export const CS_HID = { price: 0.7 };
const csHidPause = (s) => s.hid?.j?.cs?.open !== undefined && s.hid.j.cs.pause > s.t;
// ───────── 11-27 챌린지(대표 재설계): 합격 실적 기준 · 채용 한파(문의 ↑ 환불 ↑, 뒤에 문의 감소) · AI로 고가 문의 감소 · 전형 변화 ─────────
// 세기 손잡이(환경변수 CSK): 고가 문의 감소폭(prem) · 자소서 수요 감소폭(form) · 한파 환불 증가폭(cold.refund·failRef·guarUp)에 곱한다
const CSK = (typeof process !== "undefined" && +process.env.CSK) || 0.5; // 11-27 한파 뒤 벌점을 합격률 기준으로 바꾼 뒤 봇 2회차 600판: 0.5 → 파이어 32.5%(한파 없는 판 35.0%). 파이어율은 고가 감소보다 한파의 환불·합격률에 더 민감하다
export const CS_CH = {
  k: CSK,
  // 합격 실적 기준(11-26 대표 결정 그대로): from 달부터 '평소 속도 대비 최근 1년'. 꾸준하면 벌점 0, dryFrom 달째부터 쉬면 깎인다
  // 기준(평소 1년) = tol × max(최근 keep 달의 연평균, bestW × 가장 좋았던 12달). r = 최근 12달 합격 ÷ 기준. 벌점 = pen × (1 − r) + dryPen × 쉰 정도. 바닥 floor
  // 11-27 한파와의 관계(대표 결정: 합격률 기준): 한파 중에는 벌점 없음. 한파가 끝난 달부터 postLen 달 동안 r = 한파에 받은 고객의 합격률 ÷ 한파 직전 평소 합격률.
  // 벌점 = postPen × (postTol − r)(0 밑이면 0, 최대 postMax) × 회복(끝난 뒤 낸 합격자가 평소 postRec 달 치에 이르면 0) × 풀림(마지막 postFade 달). 결과 난 고객이 postMinN 명 미만이면 절반. 평소 벌점과는 큰 것만
  live: { from: 36, win: 12, keep: 36, tol: 0.7, bestW: 0.6, decay: 0.995, pen: 0.17, dryPen: 0.11, dryFrom: 7, dryRamp: 3, dryMin: 8, min: 3, grace: 12, floor: 0.7, postLen: 18, postFade: 6, postPen: 2.5, postTol: 0.99, postMax: 0.2, postMinN: 6, postRec: 10 },
  // 채용 한파: 첫 시작 first 달 사이, 그 뒤 시작 간격 gap 달, 길이 len 달, warn 달 전에 뉴스 예고
  // lead 신입 쪽 문의 +(w: 분야별 무게, 경력 이직은 그대로) · conv 결제 전환 + · pass 합격률 − · refund 환불 요구 확률 +(× k) · failRef 한파에 판 고객이 떨어졌을 때 환불 요구 확률(× k), failBack 그때 돌려주는 비율 · guarUp 합격 보장 환불 비율 +(× k)
  cold: { first: [66, 96], gap: [48, 72], len: [12, 18], warn: 6, lead: 0.25, conv: 0.04, w: { newgrad: 1, public: 1, interview: 1, career: 0 }, pass: 0.05, refund: 0, failRef: 0.3, failBack: 0.5, guarUp: 0.3, freezePass: 0.08, monoGap: 4 },
  // AI가 늘어 비싼 상품부터 안 팔린다: warn 달에 예고, from 달부터 가격대별로 해마다 perYear(× k)씩, 최대 max(× k). conv: 결제 전환에는 이만큼만
  // 버티는 길: 실력이 가격 기준을 over 만큼 넘으면 shield 의 절반, 합격 실적이 살아 있으면(r) 나머지 절반까지 덜 맞는다
  prem: { warn: 38, from: 72, perYear: { low: 0, mid: 0.012, high: 0.03, ultra: 0.048 }, max: { low: 0, mid: 0.09, high: 0.21, ultra: 0.3 }, cap: 0.8, conv: 0.3, shield: 0.5, over: 30 },
  // 전형 변화: warn 달에 예고, from 달부터 자소서 수요가 해마다 perYear(× k)씩 최대 max(× k)까지 새 전형으로 옮겨 간다(w: 분야별 무게)
  // 전형 대응도(0~100)만큼만 새 전형 수요를 받는다. 다 따라가면 bonus 만큼 더 번다. 새 전형 연구 +study~study+2, 새 전형 고객 합격 +passGain, shift 달마다 shiftCut 깎임
  form: { warn: 42, from: 72, perYear: 0.04, max: 0.4, cap: 0.7, w: { newgrad: 1, public: 0.7, interview: 0, career: 0 }, bonus: 0.05, study: 8, passGain: 1.5, shift: [24, 36], shiftCut: 20, target: 80 },
};
if (typeof process !== "undefined" && process.env?.CSCH) { const o = JSON.parse(process.env.CSCH); for (const k of Object.keys(o)) Object.assign(CS_CH[k], o[k]); } // 봇 시험용
// 합격 실적: 최근 1년 합격을 평소 1년(기준)과 견준다. phase: ""(평소) · "cold"(한파 중, 벌점 없음) · "after"(한파 뒤, 한파 직전 기준과 견줌)
export function liveStat(s) {
  const cs = s.cs, L = CS_CH.live, h = cs.passHist || [], sum = (a) => a.reduce((x, y) => x + y, 0);
  const recent = sum(h.slice(-L.win)), avg = h.length ? sum(h) / h.length * 12 : 0;
  let usual = L.tol * Math.max(avg, L.bestW * (cs.passBest || 0));
  let z = 0; for (let i = h.length - 1; i >= 0 && !h[i]; i--) z++; // 합격자 없이 지나간 달 수
  const on = s.t >= L.from && usual >= L.min && h.length >= L.grace;
  let r = usual > 0 ? Math.min(1, recent / usual) : 1;
  const dry = on && usual >= L.dryMin && z >= L.dryFrom ? Math.min(1, (z - L.dryFrom + 1) / L.dryRamp) : 0;
  let pen = on ? L.pen * (1 - r) + L.dryPen * dry : 0, phase = "";
  const cd = cs.cold;
  if (cd?.on) { pen = 0; phase = "cold"; }
  const cr = coldRate(s);
  if (cd && !cd.on && cd.n > 0 && cd.end != null && !cd.healed && cr.ok && s.t >= cd.end && s.t - cd.end < L.postLen) {
    const fade = Math.min(1, (L.postLen - (s.t - cd.end)) / L.postFade), need = Math.max(L.postMinN, (cd.base || 0) * L.postRec / 12), rec = Math.min(1, (cd.pp || 0) / need);
    const p2 = Math.min(L.postMax, L.postPen * Math.max(0, L.postTol - cr.r)) * (cr.n < L.postMinN ? 0.5 : 1) * (1 - rec) * fade;
    if (p2 > pen && p2 >= 0.005) { pen = p2; phase = "after"; r = cr.r; }
  }
  return { recent, usual: Math.round(usual), z, r, on: on || phase === "after", dry, phase, total: cs.passes || 0, mult: Math.max(L.floor, 1 - pen), cold: cr };
}
// 이번(또는 지난) 한파에 받은 고객의 합격률과 한파 직전 평소 합격률. ok: 견줄 수 있음
export function coldRate(s) {
  const cd = s.cs?.cold, n = (cd?.cp || 0) + (cd?.cf || 0), rate = n ? (cd.cp || 0) / n : 0, base = cd?.rate0 || 0;
  return { n, rate, base, r: base > 0 && n > 0 ? Math.min(1.2, rate / base) : 1, ok: base > 0 && n > 0 };
}
function coldCnt(s, p, f) { const cd = s.cs.cold; if (!cd) return; cd.cp = (cd.cp || 0) + p; cd.cf = (cd.cf || 0) + f; }
export const coldOn = (s) => !!s.cs?.cold?.on;
const coldW = (k) => CS_CH.cold.w[k] ?? 1;
// 한파 동안 그 분야 문의 배수(신입 쪽은 늘어난다) · 합격률 감소 · 환불 요구 배수
function coldLeadRaw(k) { return 1 + CS_CH.cold.lead * coldW(k); }
export function coldLead(s, k) { return coldOn(s) ? coldLeadRaw(k) : 1; }
// 시대 사건 '한파(freeze)'가 이미 합격률을 깎고 있으면 둘 중 큰 것만 남게 한다
function coldPass(s, niche) { if (!coldOn(s) || niche === "career") return 0; const C = CS_CH.cold; return Math.max(0, C.pass - (s.era?.freeze ? C.freezePass : 0)); }
const coldRefund = (s, niche) => (coldOn(s) && niche !== "career" ? 1 + CS_CH.cold.refund * CS_CH.k : 1);
// AI로 고가 문의 감소: 지금 내 가격대의 감소폭(cut)과 덜 맞는 이유(sk 실력 · lv 합격 실적, 각 0~1)
export function premStat(s) {
  if (D.CS2_ON) return { k: LP(s), raw: 0, max: 0, sk: 0, lv: 0, sh: 0, cut: 0, perYear: 0 }; // 새 구조: 자소서에는 고가가 없고, 비싼 값은 사람 손이 필요한 전략 상품에만 있다. 가격대로 깎이지 않는다
  const cs = s.cs, P = CS_CH.prem, k = cs.price || "low", K = CS_CH.k, yrs = Math.max(0, (s.t - P.from) / 12);
  const max = Math.min(P.cap, (P.max[k] || 0) * K), raw = Math.min(max, (P.perYear[k] || 0) * K * yrs);
  const sk = clamp((skill(s) - priceNeed(s)) / P.over, 0, 1), st = liveStat(s), lv = st.on ? clamp(st.r, 0, 1) : 0, sh = P.shield * (sk + lv) / 2;
  return { k, raw, max, sk, lv, sh, cut: raw * (1 - sh), perYear: (P.perYear[k] || 0) * K };
}
// 전형 변화: f 자소서에서 빠진 수요 비율 · a 전형 대응도 · open 예고를 본 뒤(연구 가능)
export function formStat(s) {
  const cs = s.cs, F = CS_CH.form, K = CS_CH.k, yrs = Math.max(0, (s.t - F.from) / 12), max = Math.min(F.cap, F.max * K);
  return { f: Math.min(max, F.perYear * K * yrs), max, a: clamp(cs.form?.a || 0, 0, 100), open: !!cs.formSeen, target: F.target };
}
function formX(s, k) { const F = CS_CH.form, st = formStat(s), fw = st.f * (F.w[k] || 0), a = st.a / 100; return fw ? 1 - fw * (1 - a) + F.bonus * (fw / st.max) * a : 1; }
// 새로 온 고객이 새 전형(직무 과제·역량 검사·포트폴리오) 고객인지
function formNew(s, r, k) { const F = CS_CH.form, st = formStat(s), fw = st.f * (F.w[k] || 0), a = st.a / 100; return fw > 0 && a > 0 && r.chance(fw * a / Math.max(0.05, formX(s, k))); }
function formGain(s, v) { const cs = s.cs; cs.form = cs.form || { a: 0 }; cs.form.a = clamp((cs.form.a || 0) + v, 0, 100); }
// 그 분야 문의 배수: AI 대세(신입 쪽 감소)와 고가 문의 감소는 둘 중 큰 것만, 거기에 전형 변화와 한파를 곱한다
function nicheX(s, k) { return Math.min(aiCut(s, k), 1 - premStat(s).cut) * formX(s, k) * coldLead(s, k); }
// 새 행동 '새 전형 연구'(행동력 1): 보드 버튼 data-cspol="f:study" → setPolicy 가 부른다
export function studyForm(s) {
  const cs = s.cs, F = CS_CH.form;
  if (!cs.open) return { ok: false, msg: "개업 후 가능" };
  if (!cs.formSeen) return { ok: false, msg: "아직 전형이 바뀌지 않았어요" };
  if ((s.ap || 0) < 1) return { ok: false, msg: "행동력이 부족해요" };
  if ((cs.form?.a || 0) >= 100) return { ok: false, msg: "지금 전형은 다 따라잡았어요" };
  const g = F.study + (s.st.career >= 100 ? 2 : s.st.career >= 50 ? 1 : 0); s.ap -= 1; formGain(s, g); gainStat(s, "career", 0.2, "cs_form");
  return { ok: true, msg: `새 전형 연구: 전형 대응도 +${g} (지금 ${Math.round(cs.form.a)})` };
}
// 독백 장면. note: [계속]을 누른 뒤 작은 줄로 보이는 숫자 안내(csEvChoose 의 ch_note)
const chStory = (tag, title, text, bg, note) => ({ kind: "story", tag, title, text, bg, onChoose: "cs_ev", ev: "ch_note", chNote: note || [], choices: [{ t: "계속", eff: {}, text: "" }] });
const COLD_MONO = {
  guar: ["보장을 걸어 둔 값", "합격 보장 문구는 내가 썼다. 그때는 자신이 있었다.\n\n지금은 불합격 연락이 올 때마다 통장부터 연다. 약속은 약속이다. 다만 이 겨울이 얼마나 갈지 모르겠다."],
  refund: ["환불 문자를 받은 밤", "밤 11시에 문자가 왔다. \"결국 떨어졌어요. 환불 되나요?\"\n\n답장을 쓰다 지웠다. 자리가 없었다는 말은 변명처럼 들릴 것이다. 내 첨삭이 모자랐던 건지, 자리가 모자랐던 건지 나도 모르겠다."],
  nopass: ["합격 소식이 뜸한 주", "이번 주에는 합격 문자가 한 통도 없다. 일은 지난달보다 많이 했다.\n\n첨삭 파일은 쌓이는데 후기 칸은 그대로다. 열심히 한 것과 붙여 준 것은 다른 일이다."],
  busy: ["문의함이 꽉 찼다", "문의 알림이 아침부터 울린다. 다들 급하다. 급한 사람은 값을 오래 묻지 않는다.\n\n돈은 들어온다. 그런데 이 사람들을 어디로 보내야 하나. 공고 목록은 여전히 짧다."],
};
const FORM_SHIFT = [
  "작년에 정리해 둔 과제 유형이 올해는 안 나왔다. 역량 검사 방식도 바뀌었다고 한다.\n\n따라잡았다 싶으면 한 칸씩 달아난다. 다시 풀어 보는 수밖에 없다.",
  "합격시킨 고객에게 물었더니 올해는 발표까지 시켰다고 한다. 내 자료에는 없는 얘기다.\n\n공부해 둔 것이 낡는 속도가 빨라졌다. 자소서만 보던 때가 편했다.",
  "포트폴리오를 내라는 공고가 문과 직무에도 붙기 시작했다. 양식도 회사마다 다르다.\n\n작년 자료를 열어 봤다. 절반은 다시 써야 한다.",
];
// 달 마감(month)에서 부른다: 달마다 합격 수 기록, 예고 장면들, 한파 예고·시작·진행·끝·회복, 전형 변화
function chMonth(s, r, pass, notes, scenes, fail = 0) {
  const cs = s.cs, L = CS_CH.live, C = CS_CH.cold, P = CS_CH.prem, F = CS_CH.form, K = CS_CH.k;
  if (!cs.passHist) { cs.passHist = []; cs.passT0 = s.t; } // 예전 저장: 지금부터 쌓는다
  cs.passHist.push(pass); if (cs.passHist.length > L.keep) cs.passHist.shift();
  if (!cs.failHist) cs.failHist = []; cs.failHist.push(fail); if (cs.failHist.length > L.keep) cs.failHist.shift(); // 11-27 합격률용: 달마다 불합격 수
  if (cs.cold && !cs.cold.on && cs.cold.end != null && s.t >= cs.cold.end) cs.cold.pp = (cs.cold.pp || 0) + pass; // 한파 뒤에 낸 합격자(회복)
  cs.passBest = Math.max(cs.passHist.slice(-L.win).reduce((a, b) => a + b, 0), (cs.passBest || 0) * (cs.cold?.on ? 1 : L.decay)); // 가장 좋았던 12달(조금씩 잊힌다. 한파 중에는 멈춤)
  if (cs.open && s.t >= L.from && !cs.liveSeen) { cs.liveSeen = true; scenes.push(chStory("컨설팅", "\"작년 합격 사례는 없나요?\"", "상담을 문의하던 사람이 후기 목록을 한참 내리다 묻는다. \"작년 합격 사례는 없나요? 3년 전 건 좀…\"\n\n답을 고르는 사이 채팅방에서 나갔다. 틀린 말은 아니다. 나라도 작년 것부터 찾아봤을 것이다.", "consult", ["이제부터 최근 1년 합격 실적을 평소와 견줘요", "꾸준히 내면 벌점이 없어요. 쉬면 문의와 결제가 줄어요"])); }
  // ① AI로 고가 문의 감소: 예고 → 본 장면
  if (cs.open && s.t >= P.warn && !cs.premSeen && D.CS2_ON) { cs.premSeen = true; scenes.push(chStory("컨설팅", "\"AI한테 물어보니\"", "상담을 문의하던 사람이 묻는다. \"AI한테 물어보니 이 정도는 나오던데, 자소서 첨삭에 이 값을 내야 하나요?\"\n\n바로 답하지 못했다. 맞춤법과 구조라면 AI도 한다. 자소서를 비싸게 팔 수 없는 이유다. 비싼 값은 AI가 못 하는 일에만 붙는다. 그 사람이 어디에 넣어야 붙는지, 그걸 어떻게 납득시키는지.", "consult", ["자기소개서는 보통 가격까지만 팔아요", "종합·이직·공기업 같은 사람별 전략은 AI 때문에 줄지 않아요"])); }
  if (cs.open && s.t >= P.warn && !cs.premSeen) { cs.premSeen = true; scenes.push(chStory("컨설팅", "\"AI한테 물어보니\"", "상담을 문의하던 사람이 묻는다. \"AI한테 물어보니 이 정도는 나오던데, 180만 원 값을 하나요?\"\n\n바로 답하지 못했다. 맞춤법과 구조라면 AI도 한다. 내가 주는 것이 그것뿐이라면 저 말이 맞다. 비싼 상품부터 설명이 길어지겠다.", "consult", ["6년 차부터 가격대가 높을수록 문의와 결제가 줄어요", "실력이 가격 기준을 넉넉히 넘거나 합격 실적이 살아 있으면 덜 맞아요"])); }
  if (cs.open && s.t >= P.from && !cs.premOn && !scenes.length && premStat(s).perYear > 0) { cs.premOn = true; const ps = premStat(s); scenes.push(chStory("컨설팅", "비싼 것부터 안 팔린다", "견적을 보내면 답이 없다. 싼 상품 문의는 그대로인데 비싼 쪽만 조용하다.\n\n값을 내릴까. 아니면 AI가 못 주는 것을 더 분명히 보여 줘야 하나. 합격시킨 사람들 말고는 내세울 것이 없다.", "consult", [`${D.CS_PRICE[ps.k].n} 가격대: 문의 해마다 −${Math.round(ps.perYear * 100)}%, 최대 −${Math.round(ps.max * 100)}%`, "저가는 줄지 않아요", "실력과 합격 실적으로 절반까지 덜 맞아요"])); }
  // ② 전형 변화: 예고 → 본 장면 → 2~3년마다 또 바뀜
  if (!cs.form) cs.form = { a: 0, n: 0 };
  const fm = cs.form;
  if (cs.open && s.t >= F.warn && !cs.formSeen) { cs.formSeen = true; scenes.push(chStory("뉴스", "자소서가 없는 전형", "뉴스 자막이 지나간다. '대형 그룹, 자소서 폐지하고 직무 과제 전형 도입.'\n\n한 곳뿐이다. 아직은. 그런데 내가 파는 것은 자소서다. 과제 전형은 나도 풀어 본 적이 없다.", "home", ["6년 차부터 자소서 수요가 해마다 조금씩 새 전형으로 옮겨 가요", "컨설팅 화면의 [새 전형 연구]로 전형 대응도를 올려 두세요"])); }
  if (cs.open && s.t >= F.from + 2 && cs.formSeen && !cs.formOn && !scenes.length) { cs.formOn = true; scenes.push(chStory("컨설팅", "묻는 것이 달라졌다", "이번 시즌 공고를 훑었다. 자소서 칸이 없는 공고가 눈에 띄게 늘었다. 과제, 역량 검사, 포트폴리오.\n\n문의하는 사람은 그대로 있다. 다만 묻는 것이 달라졌다. \"과제 전형도 봐 주시나요?\" 본 적이 없다고는 말하지 못했다.", "consult", [`자소서 수요 해마다 −${Math.round(F.perYear * K * 100)}%, 최대 −${Math.round(Math.min(F.cap, F.max * K) * 100)}%`, `전형 대응도 ${Math.round(fm.a)}: 대응도만큼만 새 전형 문의를 받아요`])); }
  if (s.t >= F.from) {
    if (fm.shiftT == null) fm.shiftT = Math.max(s.t, F.from) + r.int(F.shift[0], F.shift[1]);
    else if (s.t >= fm.shiftT) { fm.shiftT = s.t + r.int(F.shift[0], F.shift[1]); fm.a = Math.max(0, (fm.a || 0) - F.shiftCut); fm.n = (fm.n || 0) + 1; if (D.CS2_ON && cs.c2) cs.c2.und = Math.max(0, (cs.c2.und || 0) * (1 - B2.und.shift)); if (cs.open) scenes.push(chStory("컨설팅", "전형이 또 바뀌었다", FORM_SHIFT[fm.n % FORM_SHIFT.length], "consult", [`전형 대응도 −${F.shiftCut} (지금 ${Math.round(fm.a)})`, "새 전형 연구로 다시 따라가야 해요"])); }
  }
  // 채용 한파
  if (!cs.cold) cs.cold = { at: Math.max(r.int(C.first[0], C.first[1]), s.t + r.int(C.warn + 2, 30)), len: r.int(C.len[0], C.len[1]), warned: false, on: false, n: 0 };
  const cd = cs.cold, up = Math.round(C.lead * 100), pp = Math.round(C.pass * 100);
  if (!cd.on && !cd.warned && s.t >= cd.at - C.warn) {
    cd.warned = true;
    if (cs.open) scenes.push(chStory("뉴스", "대기업 공채 축소", "저녁 뉴스 자막이 지나간다. '주요 대기업, 신입 공채 절반으로 줄인다.'\n\n문의함이 바빠지겠다. 반가워야 하는데, 반갑지가 않다. 자리가 줄면 내가 붙여 줄 수 있는 사람도 준다.", "home", [`약 ${Math.max(1, cd.at - s.t)}달 뒤 채용 한파`, `신입 쪽 문의 +${up}% · 합격률 −${pp}%p`, "환불 요구가 늘어요. 합격 보장을 걸어 뒀다면 더 아파요"]));
  }
  if (!cd.on && s.t >= cd.at) {
    const h = cs.passHist; cd.on = true; cd.end = s.t + cd.len; cd.n = (cd.n || 0) + 1; cd.healed = false; cd.hurt = false; cd.monoT = s.t; cd.monoK = "";
    cd.base = Math.max(h.length ? h.reduce((a, b) => a + b, 0) / h.length * 12 : 0, h.length >= L.win ? h.slice(-L.win).reduce((a, b) => a + b, 0) * 0.8 : 0); // 한파 직전의 평소 1년 합격자 수(회복 속도의 기준)
    { const hp = h.reduce((a, b) => a + b, 0), hf = (cs.failHist || []).reduce((a, b) => a + b, 0); cd.rate0 = hp + hf >= 10 && (cs.failHist || []).length >= 6 ? hp / (hp + hf) : (cs.passes || 0) + (cs.fails || 0) >= 10 ? cs.passes / (cs.passes + cs.fails) : 0; cd.cp = 0; cd.cf = 0; cd.pp = 0; } // 한파 직전 평소 합격률(고정) · 한파 고객 합격·불합격 · 한파 뒤 합격자
    if (cs.open) { scenes.push(chStory("컨설팅", "채용 한파가 왔다", "오히려 채용 한파다. 그래서 문의는 늘어나고 있다. 다들 돈을 주고서라도 붙어야 하니까.\n\n다만, 잘 보낼 자신이 조금 떨어진다. 일단 서류라도 붙여야 면접에서 승부를 볼 텐데…", "consult", [`채용 한파 약 ${cd.len}달`, `신입 쪽 문의 +${up}% · 합격률 −${pp}%p · 환불 요구 ↑`, "떨어지는 사람이 많으면 한파 뒤에 문의가 빠져요"])); log(s, "채용 한파가 시작됐다.", "work"); }
  } else if (cd.on && s.t >= cd.end) {
    cd.on = false; cd.warned = false; cd.at += r.int(C.gap[0], C.gap[1]); if (cd.at < s.t + C.warn + 2) cd.at = s.t + r.int(C.gap[0], C.gap[1]); cd.len = r.int(C.len[0], C.len[1]);
    const st = liveStat(s), d = Math.round((1 - st.mult) * 100);
    if (d >= 3) cd.hurt = true; else cd.healed = true;
    const rateChip = st.cold && st.cold.ok ? `한파 합격률 ${Math.round(st.cold.rate * 100)}% · 평소 ${Math.round(st.cold.base * 100)}%` : "한파 때 결과가 난 신입 고객이 적어 합격률을 따지지 않았어요"; // 11-27 QA: 고객 0명·기록 부족이면 '0% · 평소 0%'가 나왔다
    if (cs.open) { scenes.push(cd.hurt
      ? chStory("컨설팅", "한파가 지나갔다", "한파가 지나갔다. 문의함이 조용하다.\n\n그 겨울에 붙여 준 사람이 적었다. 후기를 못 모았으니 당연한 일이다. 다시 한 명씩 붙여 보내는 수밖에 없다.", "consult", [rateChip, `문의와 신뢰 −${d}%`, "합격자를 내면 회복돼요"])
      : chStory("컨설팅", "한파가 지나갔다", "버텼다. 붙은 사람보다 못 붙여 준 사람 이름이 더 오래 남는다.\n\n그래도 그 겨울에 붙여 보낸 사람들이 후기를 남겨 줬다. 문의함은 조용해지지 않았다.", "consult", [rateChip, (st.cold && st.cold.ok ? "한파에도 합격률을 지켜 내서 문의가 빠지지 않았어요" : "문의는 빠지지 않았어요")])); log(s, "채용 한파가 끝났다.", "work"); }
  } else if (cd.on && cs.open && !scenes.length && s.t - (cd.monoT ?? (cd.monoT = s.t)) >= C.monoGap) {
    // 한파 진행 중 독백(돌려 쓴다): 보장 환불 → 환불 요구 → 합격 뜸함 → 문의 몰림
    const cand = [cs.guar && cs.gRefN ? "guar" : "", cs.refunds || cs.coldRefM ? "refund" : "", pass === 0 ? "nopass" : "", "busy", "nopass", "refund"].filter(Boolean), k = cand.find((x) => x !== cd.monoK) || "busy", m = COLD_MONO[k];
    cd.monoT = s.t; cd.monoK = k; scenes.push(chStory("컨설팅", m[0], m[1], k === "busy" ? "consult" : "home", [`채용 한파 ${Math.max(0, cd.end - s.t)}달 남음`]));
  }
  // 한파 뒤 회복(배율이 1로 돌아온 달)
  if (!cd.on && cd.hurt && !cd.healed) { const st = liveStat(s); if (st.mult >= 0.995) { cd.healed = true; cd.hurt = false; if (cs.open && st.phase !== "after" && s.t - (cd.end ?? s.t) < L.postLen) scenes.push(chStory("컨설팅", "다시 합격 문자가 온다", "다시 합격 문자가 온다. 후기 칸이 채워진다.\n\n문의함도 따라서 시끄러워졌다. 겨울에 못 붙여 준 이름들은 지워지지 않는다. 그래도 다음 사람은 붙여 보냈다.", "consult", ["한파 뒤 문의 감소가 풀렸어요"])); } }
  if (cs.open && s.cal === 1) {
    const st = liveStat(s), d = Math.round((1 - st.mult) * 100);
    if (d >= 5) notes.push(st.phase === "after" ? `컨설팅: 한파 때 합격률이 ${Math.round(st.cold.rate * 100)}%로 내려가 후기가 덜 모였어요. 문의와 신뢰 −${d}%. 합격자를 내면 회복돼요.` : `컨설팅: 최근 1년 합격 ${st.recent}명 · 평소 1년 ${st.usual}명${st.z >= L.dryFrom ? ` · ${st.z}달째 합격자 없음` : ""}. 최근 실적이 평소만 못해 문의와 신뢰가 ${d}% 줄었어요. 다시 합격자를 내면 돌아와요.`);
    if (cd.on) notes.push(`컨설팅: 채용 한파 ${Math.max(0, cd.end - s.t)}달 남았어요. 문의는 몰리지만 떨어지는 사람이 많으면 한파 뒤에 문의가 빠져요.`);
    const ps = premStat(s); if (ps.cut >= 0.05) notes.push(`컨설팅: AI가 늘어 ${D.CS_PRICE[ps.k].n} 가격대 문의가 ${Math.round(ps.cut * 100)}% 줄었어요. 저가는 줄지 않고, 실력과 합격 실적이 받쳐 주면 덜 맞아요.`);
    const fs = formStat(s); if (fs.f >= 0.05 && fs.a < fs.target) notes.push(`컨설팅: 자소서 수요가 ${Math.round(fs.f * 100)}% 새 전형으로 옮겨 갔어요. 전형 대응도 ${Math.round(fs.a)}. 새 전형 연구로 따라가면 되찾아요.`);
  }
  cs.coldRefM = 0;
}
export function init() {
  return { open: false, niche: null, niches: [], nick: null, price: "low", reviews: 0, passes: 0, fails: 0, clients: 0, friends: 0,
    queue: [], outcomes: [], ch: { kmong: { on: false, q: 0 }, blog: { posts: 0, idx: 0, lastT: -99 }, insta: { f: 0 }, youtube: { subs: 0, videos: 0 }, kakao: { m: 0 } },
    ads: 0, template: 0, vod: { prog: 0, n: 0, income: 0 }, lv: 1, offers: 0, refer: 0, revHist: [], monthRev: 0, leads: 0, conv: 0, src: {}, evT: -99, groupT: -1, seminarT: -1, seq: 0, newThisMonth: 0,
    guar: 0, mask: "name", maskSeen: false, guarSeen: false, leakT: -99, leakN: 0, lectN: 0, bidT: -99, leave: 0, gRef: 0, gRefN: 0, gRefAll: 0 };
}
export const entrySteps = (s) => {
  const cs = s.cs;
  return [
    { k: "career", n: "직무 지식(커리어 20 이상)", done: s.st.career >= 20, hint: "스터디카페에서 커리어 공부" },
    { k: "niche", n: "포지션 정하기", done: !!cs.niche, hint: "컨설팅 화면에서 고르기" },
    { k: "nick", n: "활동명 정하기(실명/닉네임)", done: !!cs.nick, hint: "실명은 신뢰↑ 눈치↑" },
    { k: "friends", n: "지인 무료 첨삭으로 첫 후기 3개", done: cs.reviews >= 3, hint: `지금 후기 ${Math.floor(cs.reviews)}개` },
    { k: "channel", n: "판매 채널 열기(크멍 입점 또는 블로그 첫 글)", done: cs.ch.kmong.on || cs.ch.blog.posts > 0, hint: "온라인 → 크멍 / 집 → 블로그" },
  ];
};
export function setNiche(s, k) { const n = D.NICHES[k]; if (!n) return { ok: false }; if (n.req.career && s.st.career < n.req.career) return { ok: false, msg: `커리어 ${n.req.career} 필요` }; if (n.req.years && s.co.years < n.req.years) return { ok: false, msg: `회사 경력 ${n.req.years}년 필요` };
  if (D.CS2_ON) { const why = c2NicheWhy(s, k); if (why) return { ok: false, msg: why }; }
  if (!s.cs.niche) { s.cs.niche = k; s.cs.niches = [k]; return { ok: true, msg: `포지션: ${D.CS2_ON ? c2NicheN(k) : n.n}` }; }
  if (s.cs.niches.includes(k)) return { ok: false, msg: "이미 하고 있음" };
  if (s.cs.lv < 3) return { ok: false, msg: "포지션 추가는 Lv3부터" };
  if (k === "career" && (s.cs.passes || 0) < D.CS_CAREER_PASS) return { ok: false, msg: `경력 이직은 합격자 ${D.CS_CAREER_PASS}명부터(지금 ${s.cs.passes || 0}명)` }; // v4.28 히든 길
  s.cs.niches.push(k); return { ok: true, msg: `포지션 추가: ${D.CS2_ON ? c2NicheN(k) : n.n}` };
}
// 닉네임(11-24): 정해 둔 다섯 개 중에서 고른다(s.cs.nickK). 숫자 효과는 같고, 닉네임마다 작은 이야기가 따라온다(engine/extras.js)
export const NICKS = (EXTRAS && EXTRAS.nicks) || [];
export const nickOf = (s) => (s.cs?.nick === "nick" ? NICKS.find((n) => n.k === s.cs.nickK) || null : null);
export const nickName = (s) => nickOf(s)?.n || "";
export function setNick(s, k, nk) {
  s.cs.nick = k;
  if (k === "nick") { if (nk && NICKS.some((n) => n.k === nk)) s.cs.nickK = nk; else if (!nickOf(s)) s.cs.nickK = NICKS[0]?.k; }
  return { ok: true, msg: k === "real" ? "실명으로 활동: 신뢰 +, 회사 눈치 ×1.4" : `닉네임 '${nickName(s)}'${((w) => { const ch = w.charCodeAt(w.length - 1), f = (ch - 0xac00) % 28; return f && f !== 8 ? "으로" : "로"; })(nickName(s) || "가")} 활동` };
}
export function setPrice(s, k) { const p = D.CS_PRICE[k];
  if (D.CS2_ON) { if (!p) return { ok: false, msg: "" }; if (k === "ultra") return { ok: false, msg: "최고가는 종합·이직·공기업에만 있어요" }; if (k === "high" && !s.cs.niches.includes("interview")) return { ok: false, msg: "자기소개서는 보통까지만 팔아요. 프리미엄은 면접부터예요" }; if (p.req && s.cs.reviews < p.req) return { ok: false, msg: `후기 ${p.req}개부터` }; s.cs.price = k; return { ok: true, msg: k === "high" ? "가격: 면접 프리미엄(사람별 간이 전략) · 자기소개서는 보통" : `가격: ${C2D.TIER_N[k]}` }; } if (p.req && s.cs.reviews < p.req) return { ok: false, msg: `후기 ${p.req}개부터` }; s.cs.price = k; return { ok: true, msg: `가격: ${p.n}` }; }
// ───────── 11-25 대표: 마케팅 대행 ─────────
// 표준 가격부터는 마케팅 대행이 꼭 필요하다(SEO 최적화 + 블로그·인별 주 4회 발행). 저가일 땐 없어도 된다.
// 대행사 다섯 곳, 월 60·80·100만(물가 반영). 취업(신입 자소서·면접·공기업)과 이직(경력 이직)을 얼마나 아는지 등급이 따로다.
// 등급은 그 분야 문의에 곱한다. 표준 이상인데 대행이 없으면 문의가 크게 준다(none). 커리어노트 마케팅에는 브랜드 마케터 서다인이 있다(사건 셋)
export const CS_AGENCY = {
  list: {
    cn: { n: "커리어노트 마케팅", fee: 80, job: "A", move: "B", d: "취업 카페 운영진 출신이 차린 곳. 신입 검색어는 꿰고 있다. 담당은 브랜드 마케터 서다인", mk: 1 },
    fj: { n: "퍼스트잡 컴퍼니", fee: 100, job: "S", move: "A", d: "현직 인사담당자 출신 에디터가 직접 쓴다. 비싸다" },
    hs: { n: "하이어링 스튜디오", fee: 80, job: "B", move: "A", d: "헤드헌터 고객이 많아 경력 이직 글에 강하다" },
    tb: { n: "탑블로그랩", fee: 60, job: "B", move: "C", d: "체험단 출신. 신입 검색어는 아는데 이직은 모른다" },
    gb: { n: "글밭 콘텐츠", fee: 60, job: "C", move: "B", d: "글은 매일 올라오는데 취업을 모른다. 가끔 엉뚱한 글이 나간다", oops: 0.1 },
  },
  grade: { S: 1.25, A: 1.12, B: 1, C: 0.85 }, none: 0.55, per: 4, // per: 주 몇 회 발행
};
export const agOf = (s) => CS_AGENCY.list[s.cs?.agency] || null;
export const agFee = (s) => { const a = agOf(s); return a ? Math.round(a.fee * SYN.pi(s)) : 0; };
export const agNeed = (s) => s.cs.price !== "low" || (D.CS2_ON && c2Any(s)); // 표준부터(새 구조: 전략 상품을 팔아도)
export function agGrade(s, k) { const a = agOf(s); if (!a) return null; return s.cs.agency === "cn" && s.cs.agGone && k !== "career" ? "B" : k === "career" ? a.move : a.job; }
export function agMult(s, k) { const a = agOf(s); if (!a) return agNeed(s) ? CS_AGENCY.none : 1; return CS_AGENCY.grade[agGrade(s, k)] * (s.cs.agOops === s.t ? 0.8 : 1) * (s.cs.agBoost && s.t <= s.cs.agBoost.until ? 1 + s.cs.agBoost.x : 1); }
export function setAgency(s, id) {
  if (id && !CS_AGENCY.list[id]) return { ok: false, msg: "없는 대행사예요" };
  const was = s.cs.agency; s.cs.agency = id || null; if (id && id !== was) { s.cs.agT = s.t; s.cs.agMk = 0; }
  return { ok: true, msg: id ? `마케팅 대행: ${CS_AGENCY.list[id].n} (월 ${won(agFee(s))}, 주 ${CS_AGENCY.per}회)` : "마케팅 대행 해지. 표준 가격부터는 문의가 크게 줄어요" };
}
export const agLine = (a) => `${a.n} · 월 ${a.fee}만 · 취업 ${a.job} · 이직 ${a.move}`;
export function agencyScene(s) {
  const L = Object.entries(CS_AGENCY.list);
  return { kind: "event", tag: "투잡", title: "마케팅 대행사를 고를 때", onChoose: "cs_ag", ag: "pick", bg: "cowork", best: [],
    text: `가격을 표준으로 올리자 문의가 같은 값의 다른 코치들 쪽으로 흩어진다. 혼자 블로그 하나로는 검색 첫 장에 못 남는다. 대행사 다섯 곳에서 제안서가 왔다. 모두 SEO와 블로그·인별을 주 ${CS_AGENCY.per}회 올려 준다. 다른 건 취업과 이직을 얼마나 아느냐다.\n\n${L.map(([, a]) => `· ${agLine(a)}: ${a.d}`).join("\n")}`,
    choices: [...L.map(([k, a]) => ({ t: `${a.n}와 계약한다 (월 ${a.fee}만)`, eff: {}, text: `${a.n}와 계약했다. 다음 달부터 글이 올라간다.` })), { t: "아직은 직접 한다", eff: { mental: -1 }, text: "밤마다 블로그를 붙잡기로 했다. 표준 가격에서는 문의가 반쯤 줄 것이다." }] };
}
// 서다인(커리어노트 마케팅 브랜드 마케터) 사건 셋: 계약 다음 달 첫 미팅 · 4달째 제목 다툼 · 9달째 이직 고민
const MK_EV = [
  { at: 1, title: "커리어노트 마케팅 · 첫 미팅", text: "회의실에 들어온 담당자가 명함을 내민다. 브랜드 마케터 서다인. 노트북을 열자마자 내 블로그 글 세 개를 띄운다. {서다인}\"글은 좋은데 검색어가 없어요. 취준생은 '자소서 잘 쓰는 법'이 아니라 '대기업 인사팀 자소서 첫 문장'을 쳐요.\"",
    choices: [{ t: "합격 후기를 숫자로 정리해 넘긴다", eff: { stat: { mkt: 0.5 } }, text: "{서다인}\"이거예요. 숫자는 거짓말을 안 하거든요.\" 첫 달 글 열두 편의 제목이 그 자리에서 정해졌다.", mk: { lead: 0.05, n: 3 } }, { t: "말투만은 내 걸로 해 달라고 한다", eff: { stat: { write: 0.4 } }, text: "{서다인}\"좋아요. 대표님 말투 샘플 다섯 개만 주세요.\" 서다인이 녹음기를 켰다." }] },
  { at: 4, title: "제목 하나로 싸웠다", text: "서다인이 보낸 이번 주 제목은 '이 자소서 첫 문장, 인사팀은 3초 만에 버립니다'. 조회수는 오르는데 댓글에 '낚시'가 섞이기 시작했다. {서다인}\"솔직히 이런 게 클릭돼요. 대표님 결정이에요.\"",
    choices: [{ t: "자극적이어도 간다, 클릭이 먼저다", eff: { mental: -1 }, text: "문의가 확 늘었다. 그만큼 '생각보다 별거 없네요' 후기도 섞였다.", mk: { lead: 0.1, n: 3, rev: -1 } }, { t: "제목은 담백하게, 대신 사례를 앞에", eff: { stat: { write: 0.5 } }, text: "{서다인}\"알겠어요. 대신 사례는 제가 골라요.\" 늘어나는 속도는 느려도 후기가 단단해졌다.", mk: { rev: 1 } }] },
  { at: 9, title: "서다인의 고민", text: "미팅 끝에 서다인이 노트북을 덮는다. {서다인}\"대표님, 사적인 거 하나만요. 대기업 브랜드팀에서 연락이 왔어요. 연봉이 지금의 1.5배예요. 근데 여기서 대표님 같은 분들 키우는 게 재밌기도 하고요.\"",
    choices: [{ t: "가라고, 경력기술서를 같이 봐 준다", eff: { stat: { career: 0.5 } }, text: "두 주 뒤 까톡이 왔다. '붙었어요. 후임한테 대표님 건 특별히 부탁해 놨어요.' 새 담당자는 아직 서툴다. 대신 서다인이 지인 셋을 소개해 줬다.", mk: { leave: 1, refer: 3 } }, { t: "남으면 좋겠다고 솔직히 말한다", eff: {}, text: "{서다인}\"그 말 듣고 싶었나 봐요.\" 서다인은 남았다. 대신 다음 달부터 대행비가 월 10만 원 오른다.", mk: { stay: 1 } }] },
];
export function setAds(s, v) { s.cs.ads = clamp(Math.round(v), 0, 300); }
function checkOpen(s, notes) { if (!s.cs.open && entrySteps(s).every((x) => x.done)) { s.cs.open = true; notes?.push("취업컨설팅 개업! 다음 달부터 문의가 들어온다"); log(s, "취업컨설팅을 정식으로 시작했다.", "work"); return true; } return false; }

export function can(s, id) {
  const cs = s.cs;
  if (id === "cs_friend") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (cs.friends >= 8) return "지인은 이제 다 봐줬다"; return null; }
  if (["cs_blog", "cs_insta", "cs_kakao", "cs_kmong", "cs_youtube", "cs_flyer"].includes(id)) { if (!cs.niche) return "포지션을 먼저 정하세요"; return null; }
  if (id === "cs_work") { if (!cs.queue.length && !(D.CS2_ON && c2Due(s))) return "대기 고객이 없어요"; return null; }
  if (id === "cs_soomgo") return cs.open ? null : "개업 후 가능";
  if (id === "cs_seminar") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (cs.reviews < 5) return "후기 5개부터"; if (cs.seminarT === s.t) return "이번 달엔 이미 했어요"; return null; }
  if (id === "cs_lecture") return D.CS2_ON && c2LectOn() ? "강의 제안은 컨설팅 화면에서 값을 보고 골라요" : cs.offers > 0 ? null : `강의 섭외가 와야 해요(후기 ${D.CS_LECT.rev}개 또는 커리어센터 인연)`;
  if (id === "cs_focus") return !cs.queue.length ? "대기 고객이 없어요" : cs.focusH === focusHalf(s) ? `집중 첨삭은 상·하반기에 한 번씩이에요. 지금 효과가 ${focusLeft(s)}달 남았어요` : null;
  if (id === "cs_template") return !cs.open ? "개업 후 가능" : cs.template >= 3 ? "템플릿 완성" : null;
  if (id === "cs_group") { if (!cs.niche) return "포지션을 먼저 정하세요"; if (!(cs.ch.kakao.m >= 150 || cs.reviews >= 25)) return "오픈채팅 150명 또는 후기 25개"; if (cs.groupT === s.t) return "이번 달 진행함"; return null; }
  if (id === "cs_vod") return cs.reviews < 20 ? "후기 20개부터" : null;
  return null;
}
// 컨설팅 × 파티룸: 내 공간에서 하면 효과 +30%, 강의·세미나룸·교육장이면 +60%
function roomBoost(s) { if (!SYN.on(s, "cs_room")) return 1; return s.pr.rooms.some((x) => x.status === "open" && ["lecture", "edu", "study"].includes(x.concept)) ? 1.6 : 1.3; }
// 실력 = 핵심 능력과 커리어의 평균. 가격 단계(레벨 보너스 포함)가 요구하는 실력보다 낮으면 환불·혹평
// AI 대세(11-23): 신입 취업 쪽(자소서·공기업·면접) 문의는 해가 갈수록 줄어든다. 경력 이직은 줄지 않고, 강의를 다닌 만큼 덜 줄어든다
export const CS_AI = { from: 9, perYear: 0.07, floor: 0.4, w: { newgrad: 1, public: 1, interview: 0.6, career: 0 }, lectPer: 0.02, lectMax: 0.1, priceW: 0.35, lectFeeW: 1, lectOfferW: 0.4 }; // lectOfferW: 취업 특강 섭외도 덜 들어오는 정도 // lectFeeW: 강의료도 같이 내려가는 정도(취업 특강 예산이 줄어서) // priceW: 단가도 같이 내려가는 정도(AI 첨삭이 싸져서)
export function aiCut(s, k) { // 그 분야 문의 배수(1 = 그대로)
  if (typeof process !== "undefined" && process.env?.CSAI) Object.assign(CS_AI, JSON.parse(process.env.CSAI)); // 봇 시험용
  const yrs = Math.max(0, s.t / 12 - aiFrom(s)), w = k === "interview" && s.wv?.cs?.path === "b" ? 0 : CS_AI.w[k] ?? 1; // 면접 전문(길 B)을 고르면 면접 코칭은 줄지 않는다
  const cut = Math.min(1 - CS_AI.floor, yrs * CS_AI.perYear) * w * (1 - Math.min(CS_AI.lectMax, (s.cs.lectN || 0) * CS_AI.lectPer));
  return 1 - cut;
}
// 지금 내 분야 평균으로 본 감소 폭(%) · 0이면 영향 없음
// AI 대세가 시작되는 해(11-23): 판마다 8~10년 차 사이(wave.js 가 s.wv._at.cs 에 달 수로 정한다). 아직 안 정해졌으면 기본값
export function aiFrom(s) { const m = s.wv?._at?.cs; return typeof m === "number" ? m / 12 : CS_AI.from; }
export function aiDrop(s) { const ks = s.cs.niches || []; if (!ks.length) return 0; return Math.round((1 - ks.reduce((a, k) => a + aiCut(s, k), 0) / ks.length) * 100); }
export function skill(s) { const k = D.NICHES[s.cs.niche || "newgrad"].stat; return Math.round(s.st[k] * 0.7 + s.st.career * 0.3); } // v4.25: 분야 능력치(대개 글쓰기) 비중을 높임
export function priceNeed(s) { return D.CS_PRICE_NEED[D.CS2_ON ? c2ConvKey(s) : s.cs.price] + (s.cs.lv >= 4 ? 20 : 0) + (s.cs.lv >= 5 ? 15 : 0); }
export const gap = (s) => priceNeed(s) - skill(s);
function capacity(s, boost) { return (2 + Math.floor(s.st.write / 35) + Math.floor(s.cs.template)) * boost * BIG.fullCap(s); }

export function act(s, r, id, arg, boost = 1) {
  const cs = s.cs, ch = cs.ch;
  const lines = [];
  const viral = (p) => r.chance(p * mod(s, "viralMult", 1));
  if (id === "cs_friend") {
    cs.friends++;
    const ok = r.chance(clamp(0.5 + (s.st.write - 30) / 40, 0.15, 0.95));
    cs.reviews += ok ? 1 : 0.4; gainStat(s, "write", 0.3);
    const opened = checkOpen(s, lines);
    return { lines: [ok ? "후기 +1 (\"선배 덕분에 서류 붙었어요\")" : "후기 +0.4 (\"음... 고마워요\")", ...lines], msg: "후배 자소서 4문항. 두괄식부터 다시 잡았다." + (opened ? " 이제 진짜 시작이다." : "") };
  }
  if (id === "cs_focus") {
    const sc = clamp(+arg || 0, 0, 3); cs.focus = sc; cs.focusT = s.t; cs.focusH = focusHalf(s); let cap = capacity(s, boost) + sc; let done = 0, earned = 0;
    while (cap > 0 && cs.queue.length) { const q = cs.queue[0]; const use = Math.min(cap, q.left); q.left -= use; cap -= use; if (q.left <= 0) { cs.queue.shift(); done++; earned += finishClient(s, r, q); } }
    if (sc === 3) cs.reviews += 1; gainStat(s, D.NICHES[cs.niche].stat, 0.4 * (sc + 1));
    return { lines: [`첨삭 실력 ${sc}/3`, `고객 ${done}명 완료 +${won(earned)}`, sc >= 2 ? `${FOCUS.months}달 동안 합격률 +, 환불 위험 −` : sc ? `${FOCUS.months}달 동안 합격률 조금 +` : "대충 봤다는 느낌이 남았다", sc === 3 ? "후기 +1" : ""].filter(Boolean), msg: sc === 3 ? "\"선생님 진짜 사람이 봐 준 느낌이에요.\"" : sc ? "고칠 건 고쳤다. 아쉬운 데도 있다." : "고객이 고개를 갸웃했다." };
  }
  if (id === "cs_work") {
    let cap = capacity(s, boost); let done = 0, earned = 0; const names = [];
    let c2n = 0; if (D.CS2_ON) { const x = c2Upkeep(s, cap); cap = x.cap; c2n = x.n; } // 전략 고객 이번 달 상담부터
    while (cap > 0 && cs.queue.length) {
      const q = cs.queue[0]; const use = Math.min(cap, q.left); q.left -= use; cap -= use;
      if (q.left <= 0) { cs.queue.shift(); done++; earned += finishClient(s, r, q); if (q.who) names.push(CHAR[q.who].name); }
    }
    gainStat(s, D.NICHES[cs.niche].stat, 0.5 + mod(s, "workGrow", 0), "cs_work"); /* v4.28c 곡선·월 상한을 거친다 */
    s.mental = clamp(s.mental + mod(s, "csWorkMental", 0), 0, 100);
    return { lines: [c2n ? `전략 고객 ${c2n}명 이번 달 상담` : "", `고객 ${done}명 완료`, `+${won(earned)}`, cs.queue.length ? `남은 대기 ${cs.queue.length}명` : "대기 0명"].filter(Boolean), msg: names.length ? `${names.join(", ")}님 자료도 끝냈다.` : "밤 12시, 첨삭 파일 이름에 '_최종_진짜최종'." };
  }
  if (id === "cs_blog") {
    ch.blog.posts++; ch.blog.lastT = s.t;
    let g = (2 + s.st.write / 25) * mod(s, "blogMult", 1) * boost * (1 + helperPower(s, "cs_writer") * 0.3);
    if (viral(0.03)) { g += 15; lines.push("검색 상위 노출! 방문자 폭증"); }
    ch.blog.idx += g; gainStat(s, "write", 0.2); s.mental = clamp(s.mental + mod(s, "soloMental", 0), 0, 100);
    checkOpen(s, lines);
    return { lines: [`블로그 글 ${ch.blog.posts}개 · 검색 지수 ${Math.round(ch.blog.idx)}`, ...lines], msg: r.pick(["「자소서 두괄식, 첫 문장이 전부다」", "「면접관이 지원동기를 묻는 진짜 이유」", "「중고신입, 경력은 이렇게 쓴다」", "「공기업 NCS 자소서 3가지 함정」"]) };
  }
  if (id === "cs_insta") {
    let g = (15 + (s.st.sense + s.st.mkt) / 4) * mod(s, "snsMult", 1) * boost * (1 + helperPower(s, "cs_design") * 0.3);
    if (viral(0.04)) { g += 500; lines.push("릴스 터짐! 팔로워 +500"); }
    ch.insta.f += Math.round(g); gainStat(s, "mkt", 0.4); gainStat(s, "sense", 0.2);
    return { lines: [`팔로워 ${ch.insta.f.toLocaleString()}`, ...lines], msg: "카드뉴스 8장. 첫 장 제목만 30분 고민했다." };
  }
  if (id === "cs_youtube") {
    ch.youtube.videos++;
    let g = (20 + s.st.talk * 2) * Math.exp(0.6 * r.normal()) * mod(s, "snsMult", 1) * boost * (1 + helperPower(s, "cs_video") * 0.5);
    if (viral(0.05)) { g += 3000; lines.push("알고리즘 탔다! 구독자 +3,000"); }
    ch.youtube.subs += Math.round(g); gainStat(s, "talk", 0.5); gainStat(s, "charm", 0.3);
    const e = applyEff(s, { eye: 6 }); lines.push(...e);
    return { lines: [`구독자 ${ch.youtube.subs.toLocaleString()}`, ...lines], msg: "\"면접관 출신이 알려주는...\" 썸네일에 얼굴이 크게 나왔다." };
  }
  if (id === "cs_kakao") {
    const g = Math.round((12 + s.st.talk / 5) * mod(s, "kakaoMult", 1) * boost);
    ch.kakao.m += g; gainStat(s, "talk", 0.3);
    return { lines: [`오픈채팅 ${ch.kakao.m.toLocaleString()}명 (+${g})`], msg: "\"오늘 공고 정리\" 공지를 올렸다. 알림이 300개." };
  }
  if (id === "cs_kmong") {
    if (!ch.kmong.on) { ch.kmong.on = true; ch.kmong.q = Math.round(25 + (s.st.sense + s.st.mkt) / 4); checkOpen(s, lines); return { lines: ["크멍 입점 완료", `상세페이지 품질 ${ch.kmong.q}`, ...lines], msg: "같은 카테고리에 후기 300개짜리 판매자가 줄지어 있다. 내 상품은 7페이지." }; }
    ch.kmong.q = clamp(ch.kmong.q + (5 + s.st.sense / 20) * mod(s, "kmongMult", 1) * boost * (1 + helperPower(s, "cs_design") * 0.3), 0, 200);
    return { lines: [`상세페이지 품질 ${Math.round(ch.kmong.q)}`], msg: "합격 후기 캡처를 상세페이지 맨 위로 올렸다." };
  }
  if (id === "cs_soomgo") { const n = Math.max(1, r.poisson(1.6 * boost)); for (let i = 0; i < n; i++) addClient(s, r, "숨꼬"); return { lines: [`견적 수락 ${n}명`, `대기 ${cs.queue.length}명`], msg: "견적 10개를 보내고 답장을 기다렸다." }; }
  if (id === "cs_flyer") {
    const n = r.poisson(1.1 * boost); for (let i = 0; i < n; i++) addClient(s, r, "대학가");
    return { lines: [n ? `상담 신청 ${n}명` : "오늘은 반응 없음"], msg: "스터디 모집 게시판 옆에 작은 포스터를 붙였다." };
  }
  if (id === "cs_seminar") {
    const room = roomBoost(s); cs.seminarT = s.t; const n = Math.max(2, r.poisson((3 + Math.min(cs.reviews, CS_BAL.semRev) / 15) * mod(s, "lectureMult", 1) * boost * room));
    for (let i = 0; i < n; i++) addClient(s, r, "특강");
    cs.reviews += 1; if (cs.nick === "real") applyEff(s, { eye: 3 });
    return { lines: [`특강 참석자 중 ${n}명 상담 신청`, "후기 +1", room > 1 ? `내 파티룸에서 진행 ×${room}` : ""].filter(Boolean), msg: room > 1 ? "내 파티룸에 의자 30개를 깔았다. 대관료 0원." : "질문이 끝나지 않았다. 마이크를 내려놓으니 9시 반." };
  }
  if (id === "cs_lecture") {
    cs.offers--; const L = D.CS_LECT, fee = Math.round((L.fee + skill(s) * L.perSkill + (s.fame || 0) * L.perFame) * SYN.pi(s) * mod(s, "lectureMult", 1) * (1 - aiDrop(s) / 100 * CS_AI.lectFeeW)); /* 11-23 AI 대세: 특강 예산도 준다 */ /* v4.27 실력·명성만큼 강의료 */ s.cash += fee; addMoney(s, "inc", "강의료", fee); cs.monthRev += fee;
    cs.refer += 1; cs.lectN = (cs.lectN || 0) + 1; applyEff(s, { eye: 3 });
    return { lines: [`강의료 +${won(fee)}`, "신뢰 +, 소개 +", giveBrk(s, "talk", "강의 섭외")], msg: "대학 커리어센터 2시간 특강. 학생 80명." };
  }
  if (id === "cs_template") { cs.template = Math.min(3, cs.template + 0.5); return { lines: [`템플릿 ${cs.template.toFixed(1)}/3 · 고객 처리 용량 +${Math.floor(cs.template)}`], msg: "자주 쓰는 첨삭 코멘트 40개를 정리했다." }; }
  if (id === "cs_group") {
    const room = roomBoost(s); cs.groupT = s.t; const n = Math.round(Math.min(12, 3 + Math.floor(cs.ch.kakao.m / 60) + Math.floor(cs.reviews / 15)) * room);
    const fee = Math.round(n * 20 * D.CS_PRICE[LP(s)].mult); s.cash += fee; addMoney(s, "inc", "컨설팅", fee); cs.monthRev += fee; cs.clients += n;
    for (let i = 0; i < n; i++) cs.outcomes.push({ t: s.t + r.int(1, 3), p: passProb(s, "edit") - 0.05 - coldPass(s, cs.niche), who: null, price: 20, prod: "group" });
    return { lines: [`그룹 스터디 ${n}명`, `+${won(fee)}`], msg: "한 명에게 하던 설명을 열 명에게. 시간은 그대로." };
  }
  if (id === "cs_vod") {
    cs.vod.prog += 25 * mod(s, "vodMult", 1) * boost; s.mental = clamp(s.mental + mod(s, "vodMental", 0), 0, 100);
    if (cs.vod.prog >= 100) { cs.vod.prog = 0; cs.vod.n++; cs.vod.income += Math.round(30 + cs.reviews * 0.6 + cs.ch.youtube.subs / 250); log(s, `VOD·전자책 ${cs.vod.n}호 출시`, "work"); return { lines: [`${cs.vod.n}호 출시! 매달 약 ${won(cs.vod.income)} 자동 판매`], msg: "\"자소서 한 권으로 끝내기\" 표지를 올렸다." }; }
    return { lines: [`제작 ${Math.round(cs.vod.prog)}%`], msg: "녹화 버튼을 누르고 같은 말을 세 번 했다." };
  }
  return null;
}

// 고객
function prodPick(s, r, niche) {
  const pk = !D.CS2_ON && D.CS_PRODUCTS.pkg.req(s.cs); // 새 구조: 패키지는 종합컨설팅(전략 고객)으로 옮겨 갔다
  const w = { newgrad: [["edit", 0.65], ["coach", 0.2], ["pkg", 0.15]], public: [["edit", 0.65], ["coach", 0.2], ["pkg", 0.15]], interview: [["coach", 0.75], ["edit", 0.1], ["pkg", 0.15]], career: [["edit", 0.4], ["coach", 0.2], ["pkg", 0.4]] }[niche];
  let p = r.weighted(w); if (p === "pkg" && !pk) p = niche === "interview" ? "coach" : "edit"; return p;
}
function priceOf(s, prod, niche) { const b = D.CS_PRODUCTS[prod].price * D.NICHES[niche].priceF * (1 - (1 - aiCut(s, niche)) * CS_AI.priceW) * D.CS_PRICE[D.CS2_ON ? c2LightKey(s, niche) : s.cs.price].mult * (D.CS2_ON ? c2Price(s, "essay", "light") : 1) * (s.cs.lv >= 4 ? 1.3 * mod(s, "csLv4Price", 1) : 1) * (s.cs.lv >= 5 ? 1.25 : 1) * (niche === "career" && csHidPause(s) ? CS_HID.price : 1); return Math.round(b * 10) / 10; }
function addClient(s, r, src) {
  const cs = s.cs; const niche = r.pick(cs.niches); const prod = prodPick(s, r, niche);
  if (D.CS2_ON && c2Client(s, r, niche, prod)) return; // 이직은 종합만 · 면접 프리미엄은 간이 전략 고객
  let who = null;
  if (r.chance(0.25)) { const c = s.cast.filter((id) => CHAR[id]?.customer?.board === "consult" && !s.rel[id]?.client); if (c.length) who = r.pick(c); }
  if (who) { if (!s.rel[who]) s.rel[who] = { aff: 8, stage: 0, met: s.t, last: s.t, lover: false, spouse: false, helper: null, helperOk: false, talks: {}, loverSince: null, client: true }; else s.rel[who].client = true; }
  cs.queue.push({ id: ++cs.seq, prod, niche, left: D.CS_PRODUCTS[prod].unit, units: D.CS_PRODUCTS[prod].unit, price: priceOf(s, prod, niche), wait: 0, who, src, kmong: src === "크멍", nf: formNew(s, r, niche) ? 1 : 0 });
  cs.newThisMonth++;
}
function passProb(s, prod) {
  const st = s.st[D.NICHES[s.cs.niche].stat];
  let p = 0.27 + (s.cs.focus > 0 ? 0.05 * s.cs.focus : 0) + (st - 50) / 180 + (s.st.career - 40) / 300 + clamp(((s.st.lang || 0) - 50) / 1000, 0, 0.04) + helperPower(s, "cs_hr") * 0.08 + mod(s, "passBonus", 0) + s.cs.template * 0.015 + (prod === "pkg" ? 0.15 : 0);
  if (s.cs.aiCheck) p += 0.02;
  if (s.era.freeze) p -= 0.08; if (s.era.ai && prod === "edit") p -= 0.03;
  return clamp(p, 0.08, 0.85);
}
function finishClient(s, r, q) {
  const cs = s.cs; let pay = q.price;
  if (q.kmong) { const fee = Math.round(pay * (s.era.fee ? 0.25 : 0.2) * 10) / 10; addMoney(s, "exp", "컨설팅 광고·수수료", fee); s.cash -= fee; }
  s.cash += pay; addMoney(s, "inc", "컨설팅", pay); cs.monthRev += pay; cs.clients++;
  const g = gap(s); if (g > 0 && r.chance(Math.min(0.45, g / 70) * (cs.focus > 0 ? 0.4 : 1) * coldRefund(s, q.niche))) { const back = Math.round(pay * r.range(0.5, 1)); s.cash -= back; addMoney(s, "exp", "환불", back); cs.monthRev -= back; cs.reviews = Math.max(0, cs.reviews - 0.6); s.mental = Math.max(0, s.mental - 3); cs.refunds = (cs.refunds || 0) + 1; cs.refundAll = (cs.refundAll || 0) + 1; }
  cs.outcomes.push({ t: s.t + r.int(1, 3), p: Math.max(0.05, passProb(s, q.prod) - coldPass(s, q.niche)), who: q.who, price: q.price, prod: q.prod, g: q.prod === "vip" ? 0 : cs.guar || 0, cold: coldOn(s) && q.niche !== "career" ? 1 : 0, nf: q.nf ? 1 : 0 }); // f30: 판매 당시 합격 보장
  if (q.who) s.rel[q.who].aff = clamp(s.rel[q.who].aff + 6, 0, 100);
  return pay;
}

// 집중 첨삭(11-24 대표 결정): 매달 하던 퀴즈를 상·하반기에 한 번씩만. 대신 한 번 한 효과(합격률 +·환불 −)가 여섯 달 간다.
export const FOCUS = { months: 6 };
export const focusHalf = (s) => s.year * 2 + (s.cal >= 7 ? 1 : 0);
export const focusLeft = (s) => (s.cs?.focusT == null ? 0 : Math.max(0, FOCUS.months - (s.t - s.cs.focusT)));
export function monthStart(s, r) {
  const cs = s.cs; cs.monthRev = 0; cs.newThisMonth = 0; cs.refunds = 0; if (focusLeft(s) <= 0) cs.focus = 0; cs.gRef = 0; cs.gRefN = 0;
  if (s.cal === 1) cs.leave = 0; // 연차는 해마다 새로
  const G = CS_F30.guar[cs.guar || 0] || CS_F30.guar[0];
  if (!cs.open) { cs.leads = 0; return; }
  const ch = cs.ch;
  const src = {
    크멍: ch.kmong.on ? (1.2 + Math.sqrt(cs.reviews) * 0.8) * (ch.kmong.q / 50) : 0,
    블로그: ch.blog.idx / 10,
    인별: ch.insta.f / 400 + (SYN.on(s, "insta_cs") ? (s.ins?.f || 0) / 1000 * 0.3 : 0),
    너튜브: ch.youtube.subs / 300,
    오픈채팅: ch.kakao.m / 100,
    광고: Math.sqrt(cs.ads) * 0.7 * mod(s, "adsMult", 1),
    소개: cs.refer,
    헤드헌터: cs.niches.includes("career") && !csHidPause(s) ? helperPower(s, "cs_headhunter") * 2.5 : 0,
  };
  const LV = liveStat(s);
  const seas = cs.niches.reduce((a, k) => a + (s.era.rolling ? 1 : D.NICHES[k].season[s.cal - 1]) * D.NICHES[k].demand * nicheX(s, k) /* 11-27 AI 대세·고가 문의 감소(큰 것만) × 전형 변화 × 채용 한파 */ * agMult(s, k) /* 11-25 마케팅 대행 등급 */, 0) / Math.max(1, cs.niches.length) * (1 + 0.35 * (cs.niches.length - 1));
  let mult = 0.58 * BIG.fullLead(s) * seas * (s.era.winter && !coldOn(s) ? 0.9 : 1) /* 채용 한파 중에는 문의가 몰린다 */ * LV.mult /* 11-26 살아 있는 실적 */ * mod(s, "leadMult", 1) * (s.era.ai && cs.niche === "newgrad" ? 0.85 : 1) * (s.era.freeze && !coldOn(s) ? 1.2 : 1) /* 채용 한파와 겹치면 한 번만 */ * SJ.ramp(s, "cs") * SJ.skillRamp(s, "cs") * G.lead; // v4.25b 배우는 기간 · f30 합격 보장
  cs.liveX = LV.mult;
  let leads = 0; cs.src = {};
  for (const [k, v] of Object.entries(src)) leads += v * mult;
  // 시장 포화: 문의가 상한(cap)에 가까워질수록 덜 는다
  const cap = CS_BAL.leadCap * (BIG.isFull(s) ? CS_BAL.fullCapX : 1) * (1 + (s.fame || 0) / 100), raw = leads;
  leads = cap * (1 - Math.exp(-raw / cap));
  const sat = raw > 0 ? leads / raw : 1;
  for (const [k, v] of Object.entries(src)) cs.src[k] = Math.round(v * mult * sat * 10) / 10;
  cs.leads = leads;
  const trust = D.COMPANY_TYPES[s.co.type].trust * (s.co.quit || s.co.fired ? 0.6 : 1) + (Math.min(0.35, cs.reviews / 80) + Math.min(0.2, cs.passes / 150)) * LV.mult + (cs.nick === "real" ? 0.06 : 0) + cs.lv * 0.02;
  cs.trust = trust;
  cs.conv = clamp(0.17 + trust * 0.35 + (s.st.talk - 40) / 250 + clamp(((s.st.charm || 0) - 40) / 800, -0.03, 0.06) + D.CS_PRICE[D.CS2_ON ? c2ConvKey(s) : cs.price].conv + mod(s, "convBonus", 0) + (SYN.on(s, "grad_cs") ? 0.04 : 0) + G.conv, 0.05, 0.8);
  cs.conv *= 1 - premStat(s).cut * CS_CH.prem.conv; // 11-27 AI: 비싼 상품은 결제 전환도 조금 준다
  if (coldOn(s) && cs.niches.some((k) => k !== "career")) cs.conv = Math.min(0.85, cs.conv + CS_CH.cold.conv); // 11-27 채용 한파: 돈을 주고서라도 붙어야 하니 결제도 는다
  const n = r.poisson(leads * cs.conv * (D.CS2_ON ? c2Dem(s, "essay", "light").d : 1)); // 처방형: 가벼운 상품도 내 값이 시세보다 비싸면 덜 온다
  const kmShare = leads ? src.크멍 * mult / leads : 0;
  for (let i = 0; i < n; i++) addClient(s, r, r.chance(kmShare) ? "크멍" : "문의");
  if (s.big?.vip && !D.CS2_ON) { const v = r.poisson((s.fame || 0) / 45 * (BIG.isFull(s) ? 1 : 0.3)); for (let i = 0; i < v; i++) cs.queue.push({ id: ++cs.seq, prod: "vip", niche: cs.niches.includes("career") ? "career" : cs.niche, left: 6, units: 6, price: Math.round(450 * (1 + (s.fame || 0) / 100) * SYN.pi(s)), wait: 0, who: null, src: "VIP" }); }
  cs.newThisMonth = n;
  if (D.CS2_ON) c2Leads(s, r, LV.mult, G); // 전략 상품 문의(값·평판에 따라)
}

export function month(s, r, notes, scenes) {
  const cs = s.cs, ch = cs.ch;
  checkOpen(s, notes);
  if (!cs.niche) return 0;
  if (cs.open && s.cal === 1) { const d = aiDrop(s); if (d >= 5) notes.push(`컨설팅: AI 자소서가 대세라 신입 취업 쪽이 줄면서 내 문의가 예전보다 ${d}% 줄었어요. ${D.CS2_ON ? (c2Any(s) ? "종합·이직·공기업 같은 사람별 전략 문의는 그대로예요." : "사람별 전략(종합컨설팅)으로 올라가는 게 가장 확실해요. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요.") : cs.niches.includes("career") ? "경력 이직 쪽은 그대로예요." : "경력 이직으로 넓히는 게 가장 확실해요. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요."}`); }
  // 조력자 공동 코치: 자동 처리(수익 60%)
  let coach = helperPower(s, "cs_coach") * 3;
  if (D.CS2_ON && coach > 0) coach = c2Coach(s, coach, notes); // 공동 코치: 합격 사례집에 있는 조합의 전략 고객만 대신 본다
  let auto = 0;
  while (coach > 0 && cs.queue.length) { const q = cs.queue[0]; const use = Math.min(coach, q.left); q.left -= use; coach -= use; if (q.left <= 0) { cs.queue.shift(); const p = finishClient(s, r, q); const share = Math.round(p * 0.4); s.cash -= share; addMoney(s, "exp", "공동 코치 몫", share); auto++; } }
  if (auto) notes.push(`공동 코치가 고객 ${auto}명 처리`);
  // 대기 고객
  let cancel = 0;
  for (const q of cs.queue) q.wait++;
  cs.queue = cs.queue.filter((q) => { if (q.wait >= 2) { cancel++; if (r.chance(0.3)) cs.reviews = Math.max(0, cs.reviews - 0.5); return false; } return true; });
  if (cancel) notes.push(`컨설팅: 기다리다 지친 고객 ${cancel}명 취소(나쁜 후기 위험)`);
  // 결과(합격 발표)
  const due = cs.outcomes.filter((o) => o.t <= s.t); cs.outcomes = cs.outcomes.filter((o) => o.t > s.t);
  let pass = 0, fail = 0, posted = 0, leak = false;
  const MK = CS_F30.mask[cs.mask || "name"] || CS_F30.mask.name;
  for (const o of due) {
    if (r.chance(o.p)) { pass++; cs.passes++; if (o.cold) coldCnt(s, 1, 0); if (o.nf) formGain(s, CS_CH.form.passGain); if (pass <= 3) gainStat(s, "career", 0.15, "cs_pass"); if (r.chance(0.7)) { cs.reviews += MK.rev; posted++; if (r.chance(MK.risk)) leak = true; } cs.refer = Math.min(CS_BAL.refMax, cs.refer + 0.25 * mod(s, "referMult", 1)); if (o.who) { s.rel[o.who].aff = clamp(s.rel[o.who].aff + 12, 0, 100); notes.push(`${CHAR[o.who].name}: "최종 합격했어요!!"`); } }
    else if (o.g) { fail++; cs.fails++; if (o.cold) coldCnt(s, 0, 1); cs.reviews += 0.15; const back = Math.round(o.price * Math.min(1, (CS_F30.guar[o.g]?.back || 0) * (o.cold ? 1 + CS_CH.cold.guarUp * CS_CH.k : 1)) * 10) / 10; /* 한파에 판 보장 상품: 약속보다 더 돌려 달라고 한다 */ if (back > 0) { s.cash -= back; addMoney(s, "exp", "환불", back); cs.monthRev -= back; cs.gRef += back; cs.gRefN++; cs.gRefAll = (cs.gRefAll || 0) + back; } } // f30 합격 보장 환불
    else { fail++; cs.fails++; if (o.cold) coldCnt(s, 0, 1); cs.reviews += 0.15; if (o.cold && r.chance(Math.min(0.6, CS_CH.cold.failRef * CS_CH.k))) { const bk = Math.round(o.price * CS_CH.cold.failBack * 10) / 10; s.cash -= bk; addMoney(s, "exp", "환불", bk); cs.monthRev -= bk; cs.reviews = Math.max(0, cs.reviews - 0.3); cs.coldRefM = (cs.coldRefM || 0) + 1; cs.coldRefN = (cs.coldRefN || 0) + 1; cs.coldRefAll = (cs.coldRefAll || 0) + bk; } /* 한파: 떨어진 고객의 환불 요구 */ if (o.prod === "pkg" && r.chance(0.2)) { s.cash -= Math.round(o.price * 0.5); addMoney(s, "exp", "환불", Math.round(o.price * 0.5)); notes.push("불합격 패키지 고객 50% 환불"); } }
  }
  if (D.CS2_ON) { const x = c2Month(s, r, notes, scenes, pass); pass += x.pass; fail += x.fail; } // 전략 고객 결과(지원 깔때기)
  if (pass + fail) notes.push(`합격 발표: 합격 ${pass} · 불합격 ${fail}`);
  if (cs.coldRefM) notes.push(`채용 한파: 불합격 고객 ${cs.coldRefM}명이 환불을 요구했어요`);
  if (cs.gRefN) notes.push(`합격 보장 환불 ${cs.gRefN}건 −${won(cs.gRef)}`);
  if (posted && MK.ap) { s.apNext -= MK.ap; notes.push(`합격 후기 ${posted}개 꼼꼼히 가리기: 다음 달 행동력 −${MK.ap}`); }
  cs.refer *= 0.85;
  chMonth(s, r, pass, notes, scenes, fail); // 11-26 챌린지: 실적 기록 · 한파
  // 채널 감소
  if (ch.blog.lastT < s.t) ch.blog.idx = Math.max(0, ch.blog.idx - 1.5);
  ch.blog.idx *= 0.995; ch.insta.f = Math.round(ch.insta.f * 0.995); ch.kakao.m = Math.round(ch.kakao.m * 0.997);
  // 광고비
  if (cs.ads && cs.open) { s.cash -= cs.ads; addMoney(s, "exp", "컨설팅 광고·수수료", cs.ads); }
  // VOD
  if (cs.vod.income) { const v = Math.round(cs.vod.income); s.cash += v; addMoney(s, "inc", "VOD·전자책", v); cs.vod.income *= 0.985; }
  // 실명 활동 노출
  if (cs.open && cs.nick === "real") s.co.eye = clamp(s.co.eye + 1 * eyeMult(s) / 1.4, 0, 100);
  // 강의 섭외
  if (D.CS2_ON && c2LectOn()) c2LectMonth(s, r, notes, scenes); // 11-28 강의 개편: 제안이 건별로 온다
  else if (cs.open && (cs.reviews >= D.CS_LECT.rev || helpers(s, "cs_lecture").length) && cs.offers < D.CS_LECT.maxOffers && r.chance((D.CS_LECT.p + helperPower(s, "cs_lecture") * 0.15) * (1 - aiDrop(s) / 100 * CS_AI.lectOfferW))) { cs.offers++; notes.push("대학 커리어센터에서 강의 섭외가 왔다"); }
  // 레벨
  cs.revHist.push(Math.round(cs.monthRev)); if (cs.revHist.length > 24) cs.revHist.shift();
  const last3 = cs.revHist.slice(-3);
  let lv = 1;
  if (cs.reviews >= 10 && cs.clients >= 20) lv = 2;
  if (lv === 2 && cs.passes >= 5 && ch.blog.posts >= 30) lv = 3;
  if (lv === 3 && cs.passes >= 30 && last3.length === 3 && last3.every((x) => x >= 200)) lv = 4;
  if (lv === 4 && cs.passes >= 100 && (ch.youtube.subs >= 10000 || cs.vod.n >= 2)) lv = 5;
  if (lv > cs.lv) { cs.lv = lv; notes.push(`컨설팅 Lv${lv} 「${D.CS_LEVELS[lv - 1].n}」`); log(s, `컨설팅 Lv${lv} 「${D.CS_LEVELS[lv - 1].n}」`, "work"); }
  if (cs.refunds) notes.push(`컨설팅 환불 ${cs.refunds}건(가격 대비 실력 ${skill(s)}/${priceNeed(s)})`);
  let f30Id = null;
  if (cs.stalk && s.t >= cs.stalk && r.chance(0.6)) { cs.stalk = 0; scenes.push(csEv(s, r, "stalker2")); }
  else if (cs.open && (f30Id = f30Pick(s, r, leak, pass))) { const sc = csEv(s, r, f30Id); if (sc) { cs.ev2T = s.t; scenes.push(sc); } } // f30 특이 요소 장면
  else if (cs.open && s.t - (cs.ev2T ?? -99) >= 2 && r.chance(0.4)) { const sc = csEvent(s, r, pass, fail); if (sc) { cs.ev2T = s.t; scenes.push(sc); } }
  // 사건 카드
  if (cs.open && s.t - cs.evT >= 3 && r.chance(0.3)) { const ev = jobEvent(s, r, "jobconsult"); if (ev) { cs.evT = s.t; scenes.push(ev); } }
  // 11-25 마케팅 대행: 대행비, 표준 이상인데 대행이 없으면 고르는 장면, 담당자 사건, 엉뚱한 글
  let agCost = 0;
  if (cs.open && cs.agency) { agCost = agFee(s) + (cs.agency === "cn" && cs.agStay ? Math.round(10 * SYN.pi(s)) : 0); s.cash -= agCost; addMoney(s, "exp", "마케팅 대행", agCost); }
  if (cs.open && agNeed(s) && !cs.agency && cs.agAsk == null) { cs.agAsk = s.t; scenes.push(agencyScene(s)); }
  else if (cs.open && agNeed(s) && !cs.agency && s.t % 3 === 0) notes.push("컨설팅: 마케팅 대행이 없어 표준 가격 문의가 반쯤 줄었어요(보드에서 대행사를 고를 수 있어요)");
  if (cs.open && cs.agency === "cn" && !cs.agGone && !scenes.length) { const k = cs.agMk || 0, e = MK_EV[k]; if (e && s.t - (cs.agT ?? s.t) >= e.at) { cs.agMk = k + 1; scenes.push({ kind: "event", tag: "투잡", title: e.title, text: e.text, onChoose: "cs_ag", ag: "mk", agK: k, bg: "cowork", best: [], choices: e.choices.map((c) => ({ t: c.t, eff: c.eff, text: c.text })) }); } }
  const AGX = agOf(s); if (cs.open && AGX?.oops && !scenes.length && r.chance(AGX.oops)) scenes.push({ kind: "event", tag: "투잡", title: "엉뚱한 글이 올라갔다", onChoose: "cs_ag", ag: "oops", bg: "cowork", best: [], text: `${AGX.n}가 올린 이번 주 글 제목은 '취업 잘 되는 MBTI 순위 TOP 5'. 내 이름이 박혀 있다. 댓글에 '컨설턴트가 이런 글을?'이 달렸다.`, choices: [{ t: "당장 내리고 대행사에 항의한다", eff: { mental: -2 }, text: "글은 내려갔다. 다음 달 문의는 조금 빠질 것이다." }, { t: "그냥 둔다, 조회수는 조회수다", eff: {}, text: "조회수는 올랐다. 문의 전환은 안 됐다." }] });
  return cs.monthRev - (cs.ads || 0) - agCost;
}
// 11-25 대행사 장면 선택(core.js SCENE_FN.cs_ag)
export function agChoose(s, sc, i) {
  const cs = s.cs;
  if (sc?.ag === "pick") { const k = Object.keys(CS_AGENCY.list)[i]; if (!k) return ["대행 없이 간다"]; return [setAgency(s, k).msg]; }
  if (sc?.ag === "oops") { cs.agOops = s.t + 1; return ["다음 달 문의 −20%"]; }
  if (sc?.ag === "mk") { const m = MK_EV[sc.agK]?.choices?.[i]?.mk || {}, out = [];
    if (m.lead) { cs.agBoost = { x: m.lead, until: s.t + (m.n || 3) }; out.push(`문의 +${Math.round(m.lead * 100)}% (${m.n || 3}달)`); }
    if (m.rev) { cs.reviews = Math.max(0, cs.reviews + m.rev); out.push(`후기 ${m.rev > 0 ? "+" : ""}${m.rev}`); }
    if (m.leave) { cs.agGone = 1; out.push("서다인이 떠났다: 커리어노트 마케팅 취업 등급 A → B"); }
    if (m.refer) { cs.refer = (cs.refer || 0) + m.refer; out.push(`소개 +${m.refer}`); }
    if (m.stay) { cs.agStay = 1; out.push("서다인이 남았다: 대행비 월 +10만"); }
    return out; }
  return [];
}

// ───────── 컨설팅 사건: 진상·환불·스토킹·연애·가격 대비 실력 ─────────
function csEvent(s, r, pass, fail) {
  const cs = s.cs, L = [];
  L.push([3, "jinsang"]); if (fail > 0) L.push([3 * coldRefund(s, cs.niche), "refund"]); if (gap(s) > 0) L.push([4, "overprice"]);
  if (cs.nick === "real" || cs.ch.youtube.subs > 2000 || cs.ch.insta.f > 3000) L.push([1.2, "stalker"]);
  if (!s.fam.spouse && s.cast.some((id) => isRomanceable(s, CHAR[id]) && !CHAR[id].rank && !s.rel[id]?.lover)) L.push([1.5, "romance"]); // 11-24 회사 사람(사수 포함)은 면접 코칭 손님으로 나오지 않는다
  L.push([2, "ai"]); if (!(s.co.quit || s.co.fired)) L.push([1.5, "colleague"]); L.push([1.5, "blame"]); L.push([1.5, "parent"]); L.push([2, "ghost"]); L.push([1.5, "puff"]); // 11-23 컨설팅 고유 골치: 대필 요구 · 스펙 부풀리기
  if (pass > 0) L.push([2, "great"]); if (s.mental < 45) L.push([2, "heavy"]); L.push([1, "noshow"]);
  const tot = L.reduce((a, x) => a + x[0], 0); let x = r.next() * tot; let id = L[0][1];
  for (const [w, k] of L) { x -= w; if (x <= 0) { id = k; break; } }
  return csEv(s, r, id);
}
function csEv(s, r, id) {
  const cs = s.cs, P = Math.round(D.CS_PRODUCTS.edit.price * D.CS_PRICE[LP(s)].mult * (cs.lv >= 4 ? 1.3 : 1) * 10);
  const E = (title, text, choices, extra = {}) => ({ kind: "event", tag: "컨설팅", title, text, onChoose: "cs_ev", ev: id, choices, ...extra });
  const c = (t, chk) => (chk ? { t, check: chk, ok: { text: "", eff: {} }, ng: { text: "", eff: {} } } : { t, eff: {}, text: "" });
  if (id === "jinsang") return E("진상 고객", "새벽 2시, 고객 까톡 47개. \"선생님 이거 내일 마감인데 전체 다 다시 써 주세요. 추가금은 없는 거죠?\"", [c("정중하게 선을 긋는다", { stat: "talk", dc: 45 }), c("밤새 다 해 준다 (스태미너 −15, 멘탈 −8)"), c(`환불하고 끝낸다 (−${won(P)})`)]);
  if (id === "refund") return E("불합격 환불 요구", "최종 불합격한 고객. \"돈 아까워요. 전액 환불 안 해 주면 크멍에 후기 쓸게요.\"", [c(`전액 환불한다 (−${won(P * 2)})`), c("규정대로 거절한다", { stat: "talk", dc: 50 }), c("다음 시즌 무료 재첨삭을 약속한다 (다음 달 행동력 −2)")]);
  if (id === "overprice") return E("가격값 못 한다는 후기", `크멍 후기: "${D.CS_PRICE[LP(s)].n} 가격 받고 맞춤법만 봐 줌. 비추." 지금 실력 ${skill(s)}, 이 가격이 요구하는 실력 ${priceNeed(s)}.`, [c("가격을 한 단계 내린다"), c("실력으로 메운다 (다음 달 행동력 −2, 핵심 능력 +5)"), c("그냥 둔다 (후기 −2)")]);
  if (id === "stalker") return E("선 넘는 고객", `합격시켜 준 고객이 ${employedCs(s) ? "퇴근길에 회사 앞에" : "저녁마다 집 앞 골목에"} 서 있었다. DM 하루 50개. "선생님은 제 인생의 은인이에요. 우리 운명 아닐까요?"`, [c("단호하게 차단한다 (멘탈 −6, 다시 올 수 있음)"), c(employedCs(s) ? "경찰에 신고한다 (멘탈 −3, 회사에 소문)" : "경찰에 신고한다 (멘탈 −3)"), c("좋게 타이른다", { stat: "talk", dc: 55 })]);
  if (id === "stalker2") return E("또 나타났다", `차단했던 그 사람이 새 계정으로 크멍 상담을 신청했다. ${employedCs(s) ? "회사 로비에서" : "집 앞 편의점에서"} 내 이름을 부르는 소리가 들린다.`, [c("경찰에 신고하고 접근금지 신청 (돈 −50, 멘탈 −5)"), c("이사 가고 활동명을 바꾼다 (돈 −300, 오픈채팅 −30%)")]);
  if (id === "romance") { const who = r.pick(s.cast.filter((x) => isRomanceable(s, CHAR[x]) && !CHAR[x].rank && !s.rel[x]?.lover)); s._csWho = who; return E("고객에서 인연으로", `면접 코칭을 받던 ${CHAR[who].name}님이 합격 소식과 함께 물었다. "선생님, 축하 저녁 제가 사도 될까요?"`, [c("좋아요, 가요 (인연 시작, 호감 +25)"), c("고객과는 선을 긋는다 (신뢰 +)")], { who }); }
  if (id === "ai") return E("AI 탐지에 걸렸다", "고객 자소서가 기업 AI 탐지기에 걸렸다는 연락이 왔다. 내가 첨삭한 문단이다.", [c("내가 직접 다시 쓴다 (다음 달 행동력 −1)"), c("고객이 AI를 썼다고 한다 (후기 −2)"), c("'AI 티 점검' 단계를 만든다", { stat: "write", dc: 50 })]);
  if (id === "ghost") return E("\"그냥 다 써 주세요\"", "마감 이틀 전, 고객 메시지. \"첨삭 말고 선생님이 처음부터 써 주시면 안 돼요? 두 배 드릴게요. 제 경험은 메모로 보낼게요.\" 메모는 세 줄이다.", [c("대필은 안 한다고 하고, 30분 통화로 경험을 끌어낸다", { stat: "talk", dc: 45 }), c(`두 배 받고 써 준다 (+${won(P * 2)})`), c("소제목과 첫 문장만 잡아 주고 본인이 채우게 한다 (다음 달 행동력 −1)")]);
  if (id === "puff") return E("\"6개월로 써 주세요\"", "고객 이력서를 보다 멈췄다. 인턴 3개월이 6개월로, 프로젝트 '참여'가 '총괄'로 바뀌어 있다. \"다들 이 정도는 한다던데요. 문장만 다듬어 주세요.\"", [c("사실대로 돌려놓게 하고, 3개월에 한 일을 숫자로 살린다", { stat: "write", dc: 45 }), c(`못 본 척 문장만 다듬는다 (+${won(P)})`), c("증명서와 다르면 합격이 취소된다고만 알려 준다")]);
  if (id === "colleague") return E("회사 후배가 고객으로", "같은 회사 후배가 크멍으로 상담을 신청했다. 프로필 사진만 봐도 안다. 후배는 아직 모르는 것 같다.", [c(`받는다 (+${won(P * 2)}, 회사 눈치 +8)`), c("정중히 거절한다")]);
  if (id === "blame") return E("저격글", "블로그에 \"그 컨설턴트, 첨삭이 다 복붙\"이라는 글이 올라왔다. 댓글이 달리기 시작했다.", [c("근거를 들어 반박글을 쓴다", { stat: "write", dc: 50 }), c("무시한다 (블로그 지수 −8%)")]);
  if (id === "parent") return E("어머니가 대신 상담을", "고객 어머니가 매일 전화한다. \"우리 애는 대기업 가야 해요. 공기업은 안 돼요.\" 정작 본인은 공기업을 원한다.", [c(`어머니 뜻대로 진행한다 (+${won(P)}, 멘탈 −6)`), c("본인과만 이야기한다", { stat: "talk", dc: 45 })]);
  if (id === "great") return E("대박 합격 후기", "고객이 대기업 최종 합격! 인별에 \"이분 아니었으면 못 붙었어요\" 후기를 올렸다. 팔로워 2만 명 계정이다.", [c("감사 인사를 남긴다 (후기 +3, 소개 +1)")]);
  if (id === "heavy") return E("감정이 넘어온다", "불합격한 고객이 밤 11시에 울면서 전화했다. \"저 이제 뭐 해야 해요?\" 내 마음도 같이 가라앉는다.", [c("끝까지 들어 준다 (멘탈 −6, 소개 +0.5)"), c("상담 시간은 지킨다고 말한다 (멘탈 −1)")]);
  // ───── f30 특이 요소 장면 ─────
  if (id === "f30_guar") { cs.guarSeen = true; const pp = Math.round(passProb(s, "edit") * 100), G = CS_F30.guar; return E("합격 보장 전쟁", `같은 카테고리 판매자가 '불합격 시 전액 환불'을 걸었다. 내 문의가 눈에 띄게 줄었다. 지금 내 고객 합격률은 약 ${pp}%. 보장을 걸면 결제는 늘지만, 떨어진 만큼 돌려줘야 한다.`, [c("보장 없이 실력으로 간다(지금대로)"), c(`불합격 50% 환불을 건다 (결제 +${Math.round(G[50].conv * 100)}%p)`), c(`전액 환불로 맞불 (결제 +${Math.round(G[100].conv * 100)}%p)`)]); }
  if (id === "f30_mask") { cs.maskSeen = true; return E("첫 합격 후기 캡처", "고객이 최종 합격 문자 캡처를 보내왔다. \"후기로 써 주셔도 돼요!\" 그런데 회사 이름, 고객 이름, 면접 질문까지 다 보인다.", [c("이름만 가리고 올린다"), c("회사·학교·질문까지 꼼꼼히 가린다 (합격 달마다 행동력 −1)"), c("고객이 괜찮대서 그대로 올린다 (후기 효과 +25%, 논란 위험)")]); }
  if (id === "f30_leak") { const K = CS_F30.leak, m = Math.round(K.cash * SYN.pi(s)); cs.leakT = s.t; cs.leakN = (cs.leakN || 0) + 1; s._csF30 = { cash: m }; return E("후기 속 개인정보", "취준 커뮤니티에 글이 올라왔다. \"이 컨설턴트 후기 캡처에 합격자 회사랑 이름 다 보임.\" 고객에게 전화가 왔다. \"회사 사람들이 다 알아요…\"", [c(`즉시 내리고 사과, 앞으로 꼼꼼히 가린다 (위로금 −${won(m)}, 후기 −${K.rev[0]})`), c("모자이크해서 다시 올리고 해명글을 쓴다", { stat: "write", dc: 50 }), c(`동의받은 거라며 버틴다 (후기 −${K.rev[2]}, 크멍 상세 −${K.kmong})`)]); }
  if (id === "f30_bid") {
    const B = CS_F30.bid, L = D.CS_LECT, emp = employedCs(s), left = Math.max(0, B.leaveMax - (cs.leave || 0));
    const per = Math.round((L.fee + skill(s) * L.perSkill + (s.fame || 0) * L.perFame) * SYN.pi(s) * mod(s, "lectureMult", 1) * B.mult * (1 - aiDrop(s) / 100 * CS_AI.lectFeeW)), tot = per * B.n, org = ORGS[(s.t + (cs.lectN || 0)) % ORGS.length];
    cs.bidT = s.t; s._csBid = { tot, org };
    const ch = [c("이번엔 넘긴다"), c(emp ? `연차 ${B.days}일 쓰고 제안 PT를 한다` : "제안 PT를 준비한다", { stat: "talk", dc: B.dc })];
    if (emp) ch.push(c(`저녁·주말 강의로 바꿔 제안 (강의료 ×${B.eveMult}, 연차 0)`, { stat: "charm", dc: B.eveDc }));
    return E("기관 강의 입찰", `${org} 취업 특강 ${B.n}회 입찰 공고가 떴다. 회당 ${won(per)}, 모두 ${won(tot)}. ${emp ? `강의는 평일 오후 2시. 올해 남은 연차 ${left}일.` : "회사를 안 다니니 시간은 문제없다."} 대학 강의 ${cs.lectN || 0}번 해 본 이력이 무기다.`, ch);
  }
  if (id === "noshow") return E("노쇼", "면접 코칭 예약 시간, 고객이 30분째 안 온다. 까톡도 안 읽는다. 다음 날 \"죄송해요, 환불 되나요?\"", [c("노쇼 규정대로 환불 안 한다 (후기 −1 위험)"), c(`그냥 환불해 준다 (−${won(P)})`)]);
  return null;
}
export function csEvChoose(s, i, ok) {
  const cs = s.cs, id = s.pending?.ev, out = [];
  if (id === "c2_lectbig") return c2LectBigChoose(s, i); // 11-28 대형 토크콘서트 제안(간다 / 거절)
  if (id === "ch_note") return [...(s.pending?.chNote || [])]; // 11-27 독백 장면 아래 작은 안내 줄
  const P = Math.round(D.CS_PRODUCTS.edit.price * D.CS_PRICE[LP(s)].mult * (cs.lv >= 4 ? 1.3 : 1) * 10);
  const cash = (v, k) => { s.cash += v; addMoney(s, v > 0 ? "inc" : "exp", k, Math.abs(v)); out.push(`돈 ${v > 0 ? "+" : "−"}${won(Math.abs(v))}`); };
  const ment = (v) => { s.mental = clamp(s.mental + v, 0, 100); out.push(`멘탈 ${v > 0 ? "+" : ""}${v}`); };
  const rev = (v) => { cs.reviews = Math.max(0, cs.reviews + v); out.push(`후기 ${v > 0 ? "+" : ""}${v}`); };
  if (id === "jinsang") { if (i === 0) { if (ok) ment(-2); else { rev(-2); ment(-5); out.push("별점 테러"); } } else if (i === 1) { s.hp = clamp(s.hp - 15, 0, s.hpMax); ment(-8); rev(0.5); out.push("스태미너 −15"); } else { cash(-P, "환불"); ment(2); } }
  if (id === "refund") { if (i === 0) cash(-P * 2, "환불"); else if (i === 1) { if (!ok) { rev(-3); cs.ch.kmong.q = Math.max(0, cs.ch.kmong.q - 10); out.push("크멍 분쟁, 상세페이지 품질 −10"); } else out.push("규정을 차분히 설명했다. 고객이 수긍했다"); } else { s.apNext -= 2; rev(1); out.push("다음 달 행동력 −2"); } }
  if (id === "overprice") { if (i === 0) { const ks = ["low", "mid", "high", "ultra"]; const k = ks[Math.max(0, ks.indexOf(cs.price) - 1)]; cs.price = k; out.push(`가격을 '${D.CS_PRICE[k].n}' 단계로`); } else if (i === 1) { s.apNext -= 2; out.push(`${D.STATS[D.NICHES[cs.niche].stat]} +${gainStat(s, D.NICHES[cs.niche].stat, 5).toFixed(1)}`, "다음 달 행동력 −2"); } else rev(-2); }
  if (id === "stalker") { if (i === 0) { ment(-6); if (R(s).chance(0.4)) cs.stalk = s.t + 3; } else if (i === 1) { ment(-3); if (employedCs(s)) out.push(...applyEff(s, { eye: 5 })); } else { if (ok) out.push("\"...죄송해요. 선을 넘었네요.\""); else { ment(-12); cs.stalk = s.t + 2; out.push("오히려 더 집착하기 시작했다"); } } }
  if (id === "stalker2") { if (i === 0) { cash(-50, "법률 비용"); ment(-5); } else { cash(-300, "이사 비용"); cs.ch.kakao.m = Math.round(cs.ch.kakao.m * 0.7); out.push("오픈채팅 −30%"); } }
  if (id === "romance") { const who = s._csWho; if (who) { ensureRel(s, who); if (i === 0) { out.push(`${CHAR[who].name} 호감 +${addAff(s, who, 25)}`); s.rel[who].last = s.t; } else { addAff(s, who, 5); cs.refer += 0.3; out.push("소개 +"); } } }
  if (id === "ai") { if (i === 0) { s.apNext -= 1; rev(0.5); out.push("다음 달 행동력 −1"); } else if (i === 1) rev(-2); else { if (ok) { cs.aiCheck = true; out.push("이제부터 합격률 +2%p(AI 티 점검)"); } else { s.apNext -= 1; out.push("만들다 말았다. 다음 달 행동력 −1"); } } }
  if (id === "colleague") { if (i === 0) { cash(P * 2, "컨설팅"); out.push(...applyEff(s, { eye: 8 })); } else out.push("\"아, 네... 알겠습니다.\""); }
  if (id === "ghost") {
    if (i === 0) { if (ok) { rev(1); cs.refer += 0.3; out.push("소개 +0.3", "고객이 자기 이야기를 처음으로 말로 했다. 그대로 받아 적게 했다"); } else { ment(-2); out.push("\"그럼 써 주는 데로 갈게요.\" 결제가 취소됐다"); } }
    else if (i === 1) { cash(P * 2, "컨설팅"); if (R(s).chance(0.5)) { rev(-2); out.push("면접관이 자소서 내용을 묻자 고객이 답을 못 했다"); } else out.push("서류는 붙었다. 면접은 고객 혼자 들어간다"); }
    else { s.apNext -= 1; rev(0.5); out.push("다음 달 행동력 −1"); }
  }
  if (id === "puff") {
    if (i === 0) { if (ok) { rev(1); out.push("3개월 동안 처리한 건수를 세어 넣었다. 6개월보다 세 보였다"); } else { out.push("\"그럼 저만 손해잖아요.\" 고객이 환불을 요구했다"); cash(-P, "환불"); } }
    else if (i === 1) { cash(P, "컨설팅"); if (R(s).chance(0.3)) { rev(-2); ment(-4); out.push("입사 서류 검증에서 걸려 합격이 취소됐다. 고객은 내 이름을 댔다"); } else out.push("아무 일도 없었다. 이번에는"); }
    else { if (R(s).chance(0.5)) { rev(0.5); out.push("고객이 직접 3개월로 돌려놨다"); } else out.push("고객은 그대로 냈다. 내 손은 떠났다"); }
  }
  if (id === "blame") { if (i === 0) { if (ok) { cs.ch.blog.idx += 5; out.push("반박글이 더 많이 읽혔다, 블로그 지수 +5"); } else { cs.ch.blog.idx *= 0.9; rev(-1); out.push("불난 집에 부채질, 블로그 지수 −10%"); } } else { cs.ch.blog.idx *= 0.92; out.push("블로그 지수 −8%"); } }
  if (id === "parent") { if (i === 0) { cash(P, "컨설팅"); ment(-6); } else { if (ok) { rev(1); out.push("본인이 원하는 공기업으로. 고객이 고맙다고 했다"); } else { out.push("어머니가 화를 내며 환불을 요구했다"); cash(-P, "환불"); } } }
  if (id === "great") { rev(3); cs.refer += 1; out.push("소개 +1"); }
  if (id === "heavy") { if (i === 0) { ment(-6); cs.refer += 0.5; out.push("소개 +0.5"); } else ment(-1); }
  if (id === "f30_guar") { cs.guar = [0, 50, 100][i] ?? 0; out.push(`합격 보장: ${CS_F30.guar[cs.guar].n}`); if (cs.guar) out.push("불합격 고객에게 판매 때 약속한 만큼 돌려줘요"); }
  if (id === "f30_mask") { cs.mask = ["name", "full", "raw"][i] || "name"; out.push(`후기 가림: ${CS_F30.mask[cs.mask].n}`); }
  if (id === "f30_leak") {
    const K = CS_F30.leak, kq = () => { cs.ch.kmong.q = Math.max(0, cs.ch.kmong.q - K.kmong); out.push(`크멍 상세 −${K.kmong}`); };
    if (i === 0) { cash(-(s._csF30?.cash || K.cash), "위로금"); rev(-K.rev[0]); cs.mask = "full"; out.push("후기 가림: 꼼꼼히 가림"); }
    else if (i === 1) { if (ok) { rev(-1); out.push("해명이 받아들여졌다"); } else { rev(-K.rev[1]); kq(); } }
    else { rev(-K.rev[2]); ment(-4); kq(); }
    s._csF30 = null;
  }
  if (id === "f30_bid") {
    const B = CS_F30.bid, b = s._csBid || { tot: 0 }; s._csBid = null;
    if (i === 0) out.push("다음 공고를 기다린다");
    else if (!ok) { ment(-3); out.push("탈락. 제안서는 다음에 다시 쓸 수 있다"); }
    else {
      const eve = i === 2, tot = Math.round(b.tot * (eve ? B.eveMult : 1));
      cash(tot, "강의료"); cs.refer += 1; cs.lectN = (cs.lectN || 0) + B.n; cs.offers = Math.min(D.CS_LECT.maxOffers, (cs.offers || 0) + 1);
      out.push(`낙찰! 특강 ${B.n}회`, "소개 +1 · 다른 기관 섭외 +1", giveBrk(s, "talk", "기관 강의"));
      if (eve) { s.hp = clamp(s.hp - 6, 0, s.hpMax); out.push("스태미너 −6(주말 강의)"); }
      else if (employedCs(s)) { cs.leave = (cs.leave || 0) + B.days; out.push(`연차 ${B.days}일 사용(올해 ${cs.leave}/${B.leaveMax}일)`); if (cs.leave > B.leaveMax) out.push("연차가 모자라 반차·조퇴로 메웠다", ...applyEff(s, { eye: B.overEye })); }
    }
  }
  if (id === "noshow") { if (i === 0) { if (R(s).chance(0.5)) rev(-1); else out.push("고객이 수긍했다"); } else cash(-P, "환불"); }
  return out;
}
export function passive(s) { return Math.round(s.cs.vod.income || 0); }
export function todos(s) {
  const cs = s.cs, t = [];
  if (!cs.open && cs.niche) { const st = entrySteps(s).find((x) => !x.done); if (st) t.push({ lv: 1, text: `컨설팅 개업 준비: ${st.n}`, go: "cs" }); }
  if (cs.queue.length) { const units = cs.queue.reduce((a, q) => a + q.left, 0); const ap = Math.ceil(units / capacity(s, 1)); const late = cs.queue.filter((q) => q.wait >= 1).length; t.push({ lv: late ? 2 : 1, text: `컨설팅 대기 고객 ${cs.queue.length}명(행동 ${ap}번)${late ? ` · ${late}명은 이번 달 안 하면 취소` : ""}`, go: "cs" }); }
  if (cs.open && cs.ch.blog.posts && s.t - cs.ch.blog.lastT >= 2) t.push({ lv: 0, text: `블로그 ${s.t - cs.ch.blog.lastT}개월째 글 없음(검색 지수 하락 중)`, go: "cs" });
  if (cs.open && [2, 8].includes(s.cal)) t.push({ lv: 1, text: `다음 달 ${s.cal === 2 ? "상반기" : "하반기"} 공채: 문의 폭증 대비(템플릿·코치)`, go: "cs" });
  if (cs.open && (cs.cold?.on || cs.cold?.warned)) t.push({ lv: 0, text: cs.cold.on ? `채용 한파 ${Math.max(0, cs.cold.end - s.t)}달 남음: 문의는 몰린다, 합격률과 환불을 챙기기` : `채용 한파 예고: 약 ${Math.max(1, cs.cold.at - s.t)}달 뒤${cs.guar ? " · 합격 보장을 다시 보기" : ""}`, go: "cs" });
  { const fs = formStat(s); if (cs.open && fs.open && fs.a < fs.target && (fs.f > 0 || s.t >= CS_CH.form.from - 12)) t.push({ lv: fs.f >= 0.1 && fs.a < 40 ? 1 : 0, text: `전형 대응도 ${Math.round(fs.a)}: 새 전형 연구(행동 1번)`, go: "cs" }); }
  if (cs.offers) t.push({ lv: 1, text: `강의 섭외 ${cs.offers}건 대기`, go: "cs" });
  if (D.CS2_ON) c2Todos(s, t);
  if (D.CS2_ON && c2LectOn() && s.cs.c2?.lect?.length) t.push({ lv: 1, text: `강의 제안 ${s.cs.c2.lect.length}건(값 보고 고르기)`, go: "cs" });
  return t;
}

// ───────── f30 특이 요소: 장면 고르기 · 보드 조작 · 보드 칸 · 시험 ─────────
function f30Pick(s, r, leak, pass) {
  const cs = s.cs, B = CS_F30.bid;
  if (leak && s.t - (cs.leakT ?? -99) >= CS_F30.leak.gap) return "f30_leak";
  if (!cs.guarSeen && cs.reviews >= CS_F30.guarRev && r.chance(0.5)) return "f30_guar";
  if (!cs.maskSeen && pass > 0) return "f30_mask";
  if (!(D.CS2_ON && c2LectOn()) && (cs.lectN || 0) >= 1 && cs.reviews >= D.CS_LECT.rev && B.cal.includes(s.cal) && s.t - (cs.bidT ?? -99) >= B.gap && r.chance(B.p)) return "f30_bid";
  return null;
}
export const passRate = (s) => passProb(s, "edit");
// 보드 버튼: "g:50"(합격 보장) · "m:full"(후기 가림)
export function setPolicy(s, key) {
  const cs = s.cs, [k, v] = String(key).split(":");
  if (D.CS2_ON && k === "c2") return c2Do(s, String(key).split(":").slice(1));
  if (D.CS2_ON && k === "p") return setPrice(s, v);
  if (k === "g" && CS_F30.guar[+v]) { cs.guar = +v; cs.guarSeen = true; return { ok: true, msg: `합격 보장: ${CS_F30.guar[+v].n}${+v ? " (이번 달부터 파는 상품에 적용)" : ""}` }; }
  if (k === "f" && v === "study") return studyForm(s); // 11-27 새 전형 연구(행동력 1)
  if (k === "m" && CS_F30.mask[v]) { cs.mask = v; cs.maskSeen = true; return { ok: true, msg: `후기 가림: ${CS_F30.mask[v].n}` }; }
  return { ok: false, msg: "" };
}
// 컨설팅 보드 '운영 원칙' 칸(ui.js pgCS 가 부른다). 조건을 가질 때만 보인다
// 11-26 챌린지 칸: 살아 있는 실적 · 채용 한파(f30Box 앞에 붙는다)
function chBox(S) {
  const cs = S.cs, L = CS_CH.live, C = CS_CH.cold, P = CS_CH.prem, F = CS_CH.form, K = CS_CH.k, cd = cs.cold, st = liveStat(S);
  const stage = cd?.on ? "on" : cd?.warned ? "warn" : "";
  if (S.t < L.from - 6 && !stage) return "";
  const ks = cs.niches?.length ? cs.niches : ["newgrad"], coldX = stage === "on" ? ks.reduce((a, k) => a + coldLeadRaw(k), 0) / ks.length : 1, x = st.mult * coldX;
  const up = Math.round(C.lead * 100), pp = Math.round(C.pass * 100), rf = Math.round(C.refund * K * 100), d = Math.round((1 - st.mult) * 100);
  const cr = st.cold, crTxt = cr.ok ? ` 이번 한파 합격률 ${Math.round(cr.rate * 100)}% (평소 ${Math.round(cr.base * 100)}%)` : cr.base > 0 ? ` 평소 합격률 ${Math.round(cr.base * 100)}%` : "";
  const why = st.phase === "cold" ? `지금은 문의가 몰려요. 떨어지는 사람이 많으면 한파 뒤에 문의가 빠져요.${crTxt}`
    : st.phase === "after" ? `한파 때 합격률이 ${Math.round(cr.rate * 100)}%로 내려가 후기가 덜 모였어요(평소 ${Math.round(cr.base * 100)}%). 문의 −${d}%. 합격자를 내면 회복돼요.`
    : S.t < L.from ? "3년 차부터 최근 1년 합격을 평소와 견줘요. 꾸준히 내면 벌점이 없어요. 쉬면 깎여요." : !st.on ? "아직 벌점이 없어요. 꾸준히 내면 벌점이 없어요. 쉬면 깎여요." : d < 1 ? "꾸준히 내면 벌점이 없어요. 쉬면 깎여요. 지금은 벌점 0이에요." : `${st.dry > 0 ? `${st.z}달째 합격자가 없어요. ` : ""}최근 1년 합격이 평소만 못해 문의와 신뢰가 ${d}% 줄었어요. 다시 합격자를 내면 돌아와요.`;
  const cold = stage === "on" ? `<div class="tiny bad" style="margin-top:8px"><span class="tag">채용 한파</span> 진행 중 · 남은 ${Math.max(0, cd.end - S.t)}달 · 신입 쪽 문의 +${up}% · 합격률 −${pp}%p · 떨어진 고객 ${Math.round(Math.min(0.6, C.failRef * K) * 100)}%가 환불 요구${rf ? ` · 실력 부족 환불 +${rf}%` : ""}</div>`
    : stage === "warn" ? `<div class="tiny bad" style="margin-top:8px"><span class="tag">한파 예고</span> 약 ${Math.max(1, cd.at - S.t)}달 뒤 채용 한파 · 문의는 늘고 합격률은 내려가요</div>` : "";
  const tip = stage ? `<div class="tiny muted" style="margin-top:4px">한파는 일은 많은데 뒤가 무서운 시기예요. 붙여 주지 못하면 환불 요구가 오고${cs.guar ? ", 걸어 둔 합격 보장은 약속보다 더 돌려 달라는 말까지 나와요" : ", 합격 보장을 걸면 더 아파요"}. 경력 이직은 한파를 타지 않아요.</div>` : "";
  const liveCard = `<div class="card"><h3>살아 있는 실적 <small>문의 ×${x.toFixed(2)}</small></h3><div class="kv"><div><div class="k">최근 1년 합격</div><div class="v ${st.on && st.r < 1 && st.phase !== "cold" ? "bad" : ""}">${st.recent}명</div></div><div><div class="k">평소 1년(기준)</div><div class="v">${st.usual}명</div></div><div><div class="k">지금 문의 배율</div><div class="v ${x < 0.95 ? "bad" : x > 1.02 ? "good" : ""}">×${x.toFixed(2)}</div></div></div>
    <div class="tiny muted" style="margin-top:6px">${why}</div>${cold}${tip}</div>`;
  // AI와 전형 변화
  if (!cs.premSeen && !cs.formSeen) return liveCard;
  const ps = premStat(S), fs = formStat(S), pc = Math.round(ps.cut * 100), fc = Math.round(fs.f * 100), a = Math.round(fs.a), pn = D.CS_PRICE[ps.k].n;
  const lostPct = Math.round(ks.reduce((s0, k) => s0 + (1 - formX(S, k)), 0) / ks.length * 100);
  const shWhy = [ps.sk >= 0.5 ? "실력이 가격 기준을 넉넉히 넘어요" : "", ps.lv >= 0.99 ? "합격 실적이 살아 있어요" : ""].filter(Boolean);
  const premLine = D.CS2_ON ? "자기소개서는 AI 때문에 비싸게 못 팔아요(보통까지만). 종합·이직·공기업 같은 사람별 전략은 가격대로 깎이지 않아요." : S.t < P.from ? `6년 차부터 가격대가 높을수록 문의와 결제가 줄어요(저가는 그대로). 지금 가격대: ${pn}.`
    : ps.perYear <= 0 ? `${pn} 가격대는 AI 때문에 줄지 않아요.`
    : `${pn} 가격대 문의 −${pc}%(해마다 −${Math.round(ps.perYear * 100)}%, 최대 −${Math.round(ps.max * 100)}%). ${shWhy.length ? `${shWhy.join(", ")}: 원래 −${Math.round(ps.raw * 100)}%에서 덜 맞는 중이에요.` : "실력이 가격 기준을 넉넉히 넘거나 합격 실적이 살아 있으면 절반까지 덜 맞아요."}`;
  const formLine = !cs.formSeen ? "" : S.t < F.from ? "6년 차부터 자소서 수요가 해마다 조금씩 새 전형(직무 과제·역량 검사·포트폴리오·직무 면접)으로 옮겨 가요. 미리 연구해 두면 그대로 받아요."
    : `자소서 수요 −${fc}%가 새 전형으로 옮겨 갔어요. 대응도만큼만 받아요. 지금 내 문의 ${lostPct > 0 ? `−${lostPct}%` : lostPct < 0 ? `+${-lostPct}%` : "±0%"}. 전형은 2~3년마다 또 바뀌어 대응도가 ${F.shiftCut} 깎여요.`;
  const bar = cs.formSeen ? `<div class="tiny muted" style="margin-top:8px">전형 대응도 ${a}/100</div><div class="meter"><i style="width:${a}%;background:${a >= fs.target ? "var(--green)" : "var(--blue)"}"></i></div>
    <div class="pick" style="margin-top:6px"><button data-cspol="f:study"><b>새 전형 연구 ⚡1</b><span class="tiny muted">대응도 +${F.study}~${F.study + 2} · 새 전형 고객을 합격시켜도 올라요</span></button></div>` : "";
  return liveCard + `<div class="card"><h3>AI와 전형 변화 <small>${pn}</small></h3><div class="kv"><div><div class="k">내 가격대 문의</div><div class="v ${pc >= 5 ? "bad" : ""}">${pc ? "−" + pc + "%" : "그대로"}</div></div><div><div class="k">자소서 수요</div><div class="v ${fc >= 5 ? "bad" : ""}">${fc ? "−" + fc + "%" : "그대로"}</div></div><div><div class="k">전형 대응도</div><div class="v ${a >= fs.target ? "good" : ""}">${a}</div></div></div>
    <div class="tiny muted" style="margin-top:6px">${premLine}</div>${formLine ? `<div class="tiny muted" style="margin-top:4px">${formLine}</div>` : ""}${bar}</div>`;
}
export function f30Box(S, esc, won) { const cs = S.cs; if (!cs.open) return ""; return chBox(S) + f30Core(S, esc, won); }
function f30Core(S, esc, won) {
  const cs = S.cs;
  const showG = cs.guarSeen || cs.reviews >= CS_F30.guarRev, showM = cs.maskSeen || cs.passes > 0, showL = (cs.lectN || 0) > 0;
  const drop = aiDrop(S), a = drop >= 5 ? `<div class="tiny bad" style="margin-top:8px">AI 대세: 내 ${D.CS2_ON ? "가벼운 상품(자소서·면접) " : ""}문의 −${drop}%(신입 취업 쪽이 해마다 더 줄어요). ${D.CS2_ON ? "사람별 전략(종합·이직·공기업) 문의는 줄지 않아요" : "경력 이직은 줄지 않아요"}. 강의는 버팀목이지만 강의료와 섭외도 같이 줄어요.</div>` : "";
  if (!showG && !showM && !showL && !a) return "";
  const pp = Math.round(passProb(S, "edit") * 100), G = CS_F30.guar[cs.guar || 0];
  const btn = (attr, on, n, d) => `<button class="${on ? "on" : ""}" data-cspol="${attr}"><b>${esc(n)}</b><span class="tiny muted">${esc(d)}</span></button>`;
  const g = showG ? `<div class="sec" style="margin-top:0">합격 보장 <span class="tiny muted">· 내 고객 합격률 약 ${pp}%</span></div>
    <div class="pick">${Object.entries(CS_F30.guar).map(([k, x]) => btn(`g:${k}`, (cs.guar || 0) === +k, x.n, x.d)).join("")}</div>
    ${G.back ? `<div class="tiny ${cs.gRefN ? "bad" : "muted"}" style="margin-top:4px">불합격하면 약 ${100 - pp}% 고객에게 ${Math.round(G.back * 100)}% 환불${cs.gRefAll ? ` · 지금까지 −${won(Math.round(cs.gRefAll))}` : ""}</div>` : ""}` : "";
  const m = showM ? `<div class="sec" style="margin-top:8px">합격 후기 가림 <span class="tiny muted">${cs.leakN ? `· 논란 ${cs.leakN}번` : ""}</span></div>
    <div class="pick">${Object.entries(CS_F30.mask).map(([k, x]) => btn(`m:${k}`, (cs.mask || "name") === k, x.n, x.d)).join("")}</div>` : "";
  const l = showL ? `<div class="tiny muted" style="margin-top:8px">강의 ${cs.lectN}회${employedCs(S) ? ` · 올해 연차 ${cs.leave || 0}/${CS_F30.bid.leaveMax}일` : ""} · 기관 입찰은 2·3·8·9월 예산 시즌에 와요</div>` : "";
  return `<div class="card"><h3>운영 원칙 <small>${esc(G.n)}</small></h3>${g}${m}${l}${a}
    <details style="margin-top:6px"><summary class="tiny muted" style="cursor:pointer;display:inline-block">자세히 ▾</summary><div class="tiny muted" style="margin-top:4px">합격 보장은 결제를 늘리지만, 고용 한파처럼 시즌이 나쁘면 불합격이 몰려 환불도 몰려요. 실력(합격률)이 높을수록 남는 장사예요. 후기를 대충 가리면 회사·이름이 비쳐 논란이 터질 수 있어요. 대학 강의를 한 번 하면 기관 특강 입찰 공고가 오고, 평일 강의는 연차를 써야 해요.</div></details></div>`;
}
// 시험(#autoN-cs-f30guar|f30mask|f30leak|f30bid): 장면을 바로 만든다
export function f30Scene(s, r, what) {
  const cs = s.cs; if (!cs.niche) setNiche(s, "newgrad"); cs.open = true; cs.lectN = Math.max(1, cs.lectN || 0); cs.reviews = Math.max(cs.reviews, 12);
  const id = { guar: "f30_guar", mask: "f30_mask", leak: "f30_leak", bid: "f30_bid" }[what];
  return id ? csEv(s, r, id) : null;
}

// ═════════ 11-27 처방형 개편: 가격대별 상품 + 사람별 합격 전략(스위치 defs.js CS2_ON) ═════════
// 싼 상품(자기소개서 저가~보통 · 면접 저가~보통)은 위 흐름 그대로다. 비싼 상품(면접 프리미엄 · 종합 · 이직 · 공기업)은 고객 한 명 한 명이 "전략 고객"(s.cs.c2.cases)이 된다.
// 전략 고객: 지원자 카드(막힌 곳 × 사람 × 성향, 일부 ???) × 목표(회사 유형 × 직무) → 방법론 카드로 칸을 채운다 → 눈높이 설득 → 결과 달에 지원 깔때기가 확률로 굴러간다 → 합격 사례집.
// 자료는 cs_data.js 에만 있다. 상태는 s.cs.c2 하나에만 둔다(스위치가 꺼져 있으면 만들지도 읽지도 않는다).
export { C2D };
const B2 = C2D.C2_BAL;
if (typeof process !== "undefined" && process.env?.CS2B) { const o = JSON.parse(process.env.CS2B); for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k]) && B2[k] && typeof B2[k] === "object" && !Array.isArray(B2[k])) Object.assign(B2[k], o[k]); else B2[k] = o[k]; } } // 봇 시험용
const C2CARD = Object.fromEntries(C2D.CARDS.map((c) => [c.id, c]));
const c2Interp = (tb, x) => { if (x <= tb[0][0]) return tb[0][1]; for (let i = 1; i < tb.length; i++) if (x <= tb[i][0]) { const [x0, y0] = tb[i - 1], [x1, y1] = tb[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return tb[tb.length - 1][1]; };
// 가볍게 파는 상품의 가격대. 스위치가 꺼져 있으면 지금 가격대 그대로
function LP(s) { if (!D.CS2_ON) return s.cs.price; const p = s.cs.price || "low", iv = s.cs.niches.includes("interview"); return p === "ultra" ? (iv ? "high" : "mid") : p === "high" && !iv ? "mid" : p; }
function c2LightKey(s) { const p = LP(s); return p === "high" ? "mid" : p; } // 가벼운 상품은 보통까지(면접 프리미엄은 전략 고객으로 간다)
function c2ConvKey(s) { const p = LP(s); return p === "high" && s.cs.niche !== "interview" ? "mid" : p; }
const c2NicheN = (k) => ({ newgrad: "자기소개서", interview: "면접", public: "공기업컨설팅", career: "이직컨설팅" }[k] || k);
function c2NicheWhy(s, k) {
  const cs = s.cs; if (cs.niches.includes(k) || (k !== "public" && k !== "career")) return "";
  if (!cs.niche) return `${c2NicheN(k)}은 종합만 있어요. 자기소개서나 면접으로 시작해 합격 실적을 쌓으면 열려요`;
  if (!c2Std(s)) return `${c2NicheN(k)}은 종합컨설팅이 열린 뒤에 열 수 있어요(${c2Gate(s, "total", "std").why.join(" · ")})`;
  return "";
}
// 예전 저장의 컨설팅 달 수: 월별 기록(s.hist)에서 컨설팅 수입이 처음 잡힌 달부터. 기록이 없으면 합격 기록을 시작한 달 · 합격자 · 후기 수로 어림한다(합격 한 명 · 후기 하나를 한 달로 본다)
function c2OpenMo(s) { const cs = s.cs, h = (s.hist || []).find((x) => (x.cs || 0) !== 0), a = h && h.t !== undefined ? s.t - h.t + 1 : 0, b = cs.passT0 !== undefined ? s.t - cs.passT0 : 0, c = Math.min(s.t || 0, Math.max(cs.passes || 0, Math.floor(cs.reviews || 0))); return Math.max(0, Math.round(a > 0 ? a : Math.max(b, c))); }
// 넘어온 뒤 새 규칙으로 12달이 차기 전에는 예전 수입으로 본업 신호를 띄우지 않는다: 연말 신호(yearend.js)는 s.fullAsk 보다 높은 단계만 묻으므로 그동안만 올려 두었다가 돌려놓는다
function c2MigTick(s) { const c2 = c2of(s); if (c2.migT === undefined) return; if (s.t < c2.migT + 11 && !BIG.isFull(s)) { if (c2.askHold === undefined) c2.askHold = s.fullAsk || 0; s.fullAsk = 9; } else if (c2.askHold !== undefined) { s.fullAsk = c2.askHold; delete c2.askHold; } }
export function c2of(s) {
  const cs = s.cs;
  if (!cs.c2) {
    cs.c2 = { v: 1, cards: {}, notes: {}, cases: [], wait: [], seq: 0, open: {}, sell: {}, topP: { total: 2, public: 2, move: 2 }, sp: {}, spAll: 0, ui: {}, back: [], log: [], st: { n: 0, rev: 0, ref: 0, win: 0, lose: 0, left: 0 },
      und: cs.open ? (cs.passes || 0) * B2.und.light + Math.min(120, cs.reviews || 0) * (B2.und.k ?? 1) : 0, undBase: Math.max(0, Math.round((typeof process !== "undefined" && +process.env?.UNDBASE) || +s.ng?.und?.cs || 0)), stage: 1 }; // und: 이번 생에 쌓은 업의 이해도 · undBase: 전생에서 가져온 점수(회차 넘기기가 s.ng.und.cs 에 넣어 준다)
    if (cs.open && (cs.passes || 0) >= 3) { cs.c2.migT = s.t; cs.c2.mo = c2OpenMo(s); } // 11-28 예전 저장(이미 합격자가 있는 채로 새 구조에 처음 들어옴): 넘어온 달을 적고, 컨설팅 햇수는 개업한 달부터 센다
    if (cs.open && ["high", "ultra"].includes(cs.price) && cs.niches.some((k) => k !== "interview" && k !== "career")) cs.c2.grant = 1; // 예전 저장: 자소서를 고가로 팔던 사람은 종합 표준이 열린 채로 넘어온다
    c2Cards(s);
  }
  return cs.c2;
}
const c2Key = (f, tier) => f + ":" + tier;
const c2NoteN = (c2) => Object.values(c2.notes).filter((n) => n.win).length;
// 관문: 그 분야·등급을 팔 수 있나. 능력치(글쓰기·말빨 가운데 높은 쪽)와 업의 이해도를 둘 다 채워야 한다. why: 모자란 것
export function c2Gate(s, f, tier) {
  const cs = s.cs, c2 = c2of(s), G = B2.gate[tier], why = [], st = Math.floor(Math.max(s.st.write || 0, s.st.talk || 0)), u = undV(s);
  if (tier === "mini") { if (!cs.niches.includes("interview")) why.push("면접 포지션"); if (cs.reviews < G.rev) why.push(`후기 ${G.rev}개(지금 ${Math.floor(cs.reviews)})`); if ((s.st.talk || 0) < G.stat) why.push(`말빨 ${G.stat}(지금 ${Math.floor(s.st.talk || 0)})`); if (u < G.und) why.push(`업의 이해도 ${G.und}(지금 ${u})`); if (LP(s) !== "high") why.push("가격을 면접 프리미엄으로"); return { ok: !why.length, why }; }
  const F = C2D.FIELDS[f];
  if (F.niche && !cs.niches.includes(F.niche)) why.push(f === "move" ? `이직 포지션(커리어 ${D.NICHES.career.req.career} · 회사 ${D.NICHES.career.req.years}년 · 합격 ${D.CS_CAREER_PASS}명 · Lv3)` : `공기업 포지션(커리어 ${D.NICHES.public.req.career} · Lv3)`);
  if (tier === "std" && c2.grant) return { ok: !why.length, why };
  if (st < G.stat) why.push(`글쓰기나 말빨 ${G.stat}(지금 ${st})`); if (u < G.und) why.push(`업의 이해도 ${G.und}(지금 ${u})`);
  if (G.yrs && (c2.mo || 0) < G.yrs * 12) why.push(`컨설팅 ${G.yrs}년 차부터(지금 ${Math.floor((c2.mo || 0) / 12) + 1}년 차)`);
  return { ok: !why.length, why };
}
// ── 업의 이해도(세차·컨설팅·과외 공통 꼴). 상한 없이 쌓인다: 합격 사례가 주, 일한 기간은 보조. 전형이 바뀌면 조금 빠진다 ──
const undV = (s) => Math.round((s.cs.c2?.und || 0) + (s.cs.c2?.undBase || 0));
function undAdd(s, v) { const c2 = c2of(s), U = B2.und, g = v / (1 + (c2.und || 0) / U.slow); c2.und = (c2.und || 0) + g; return g; }
// 11-28 공통 카드: 등급과 업계 상위 %는 engine/und.js 의 공통 사다리가 계산한다(여기 고유 등급은 없앴다). 아래 둘은 공통 카드에 넣는 컨설팅 글
export function c2UndFoot(s) { const v = undV(s), G = B2.gate, L = [[G.std.und, "종합컨설팅 표준"], [G.mini.und, "면접 프리미엄"], [G.prem.und, "프리미엄"], [B2.fullReq.und, "본업 조건"], [G.top.und, "최고가"]].sort((x, y) => x[0] - y[0]), n = L.find((x) => v < x[0]); return n ? `다음 문턱: ${n[1]} ${n[0].toLocaleString("ko-KR")}점(${(n[0] - v).toLocaleString("ko-KR")}점 남음)` : "상품 문턱을 모두 넘었어요"; }
export function c2UndHow() { const U = B2.und, W = U.win; return `고객이 합격할 때마다 쌓여요. 자기소개서·면접 +${U.light}, 면접 프리미엄 +${W.mini}, 표준 +${W.std}, 프리미엄 +${W.prem}, 최고가 +${W.top}(일한 달마다 +${U.month}). 눈높이 차이가 큰 고객, 채용 한파 때의 합격은 더 크게 오르고, 그 분야·등급의 첫 합격은 ${U.first}배예요. 점수가 쌓일수록 천천히 오르고, 전형이 바뀌면 ${Math.round(U.shift * 100)}% 빠져요.`; }
export function understanding(s) {
  if (!D.CS2_ON || !s.cs?.niche) return null;
  const c2 = c2of(s), v = undV(s);
  return { v, stage: c2.stage || 1, sub: `합격 사례집 ${c2NoteN(c2)}건`, name: "업의 이해도", base: c2.undBase || 0 };
}
const UND_MONO = {
  3: ["이제는 사람이 어렵다", "지원자 서류를 받으면 어디가 막혔는지 금방 보인다. 어디에 넣어야 붙는지도 안다. 사례집을 넘기면 비슷한 사람이 꼭 있다.\n\n컨설팅 자체는 더 어렵지 않다. 어려운 것은 그다음이다. 눈높이를 못 내리는 사람, 연락이 끊기는 사람, 떨어지고 나서 돈 얘기를 꺼내는 사람. 일이 사람 관리로 넘어왔다."],
};
function undMonth(s, lightPass, notes, scenes) {
  const c2 = c2of(s), U = B2.und;
  undAdd(s, U.month + lightPass * U.light);
  const st = c2.stage || 1, to = c2.open["total:std"] === undefined ? 1 : undV(s) >= U.stage3 ? 3 : 2;
  if (to > st) { c2.stage = to; if (to === 3 && scenes) scenes.push(chStory("컨설팅", UND_MONO[3][0], UND_MONO[3][1], "consult", ["업의 이해도가 깊어졌어요", "합격 사례집에 있는 조합은 전략이 저절로 채워져요", "이제 승부는 설득과 고객 관리예요"])); }
}
const c2Std = (s) => !!c2of(s).open["total:std"] || c2Gate(s, "total", "std").ok;
const c2Tiers = (f) => (f === "interview" ? ["mini"] : ["std", "prem", "top"]);
const c2All = () => [["interview", "mini"], ...C2D.STRAT.flatMap((f) => c2Tiers(f).map((t) => [f, t]))];
export function c2Sell(s, f, tier) { const c2 = c2of(s), k = c2Key(f, tier); if (c2.off || c2.sell[k] === 0) return false; return tier === "mini" ? c2Gate(s, f, tier).ok : !!c2.open[k] && (!C2D.FIELDS[f].niche || s.cs.niches.includes(C2D.FIELDS[f].niche)); }
export const c2Any = (s) => !!s.cs.c2 && (s.cs.c2.cases.length > 0 || (!s.cs.c2.off && Object.keys(s.cs.c2.open).length > 0));
// 관문이 열린 달을 적어 둔다(한 번 열리면 닫히지 않는다). 첫 관문에서는 "고민이 달라졌다" 장면
function c2Latch(s, notes, scenes) {
  const cs = s.cs, c2 = c2of(s);
  for (const f of C2D.STRAT) for (const tier of c2Tiers(f)) {
    const k = c2Key(f, tier); if (c2.open[k] !== undefined || !c2Gate(s, f, tier).ok) continue;
    c2.open[k] = s.t;
    if (k === "total:std" && scenes) scenes.push(chStory("컨설팅", "값이 달라지면 고민이 달라진다", "\"자소서만 봐 주지 말고, 붙을 때까지 같이 가 주시면 안 돼요?\"\n\n후기 목록 아래에 그런 문의가 달리기 시작했다. 값을 불러 봤다. 첨삭 열 번 값이다. 상대는 망설이지 않았다.\n\n가격이 비싸지니 고민해야 하는 게 달라졌다. 문장을 고치는 일이 아니다. 이 사람이 어디에 넣어야 붙는지, 그걸 본인이 받아들이게 하는 일이다.", "consult", ["종합컨설팅(표준)이 열렸어요", "고객마다 막힌 곳과 눈높이가 달라요. 방법론 카드로 합격 전략을 짜요", "자기소개서·면접은 지금처럼 가볍게 팔아요"]));
    else if (notes) notes.push(`컨설팅: ${C2D.FIELDS[f].n} ${C2D.TIER_N[tier]} 등급을 팔 수 있어요${tier === "top" ? ". 값은 직접 정해요(비쌀수록 드물게 와요)" : ""}`);
    if (scenes || notes) log(s, `${C2D.FIELDS[f].n} ${C2D.TIER_N[tier]} 등급이 열렸다.`, "work");
  }
}
// 동시에 맡는 인원(등급마다 따로). full: 본업일 때 값을 보고 싶으면 true
export function c2Cap(s, tier, full) { const fl = full ?? BIG.isFull(s), half = full === undefined && fl && !c2FullOk(s), E0 = B2.cap.emp[tier], F0 = B2.cap.full[tier]; return (fl ? (half ? Math.round(E0 + (F0 - E0) * B2.fullHalf) : F0) : E0) + (tier === "mini" && s.wv?.cs?.path === "b" ? B2.pathB : 0); }
// 강의·출강(11-28): 제안이 건별로 온다(단건 · 연속 · 대형). 값과 드는 행동력을 보고 갈지 정한다. 거절해도 벌점은 없다
const c2LectOn = () => !!B2.lect.on;
const c2LectBigScene = (o) => ({ kind: "story", tag: "컨설팅", title: "대형 토크콘서트", text: `대형 토크콘서트 무대에 서 달라는 연락이 왔다. 강의료 ${won(o.fee)}에 인지도도 오른다. 준비에 더 힘을 들여야 해 행동력 2가 든다. 갈까요?`, bg: "consult", onChoose: "cs_ev", ev: "c2_lectbig", lid: o.t, choices: [{ t: "간다 (행동력 2)", eff: {}, text: "" }, { t: "거절", eff: {}, text: "" }] });
function c2LectBigChoose(s, i) { const L0 = c2of(s).lect || [], k = L0.findIndex((o) => o.k === "big" && o.t === s.pending?.lid); if (k < 0) return ["제안 기한이 지났어요"];
  if (i === 1) return [c2LectDo(s, k, false).msg]; if ((s.ap || 0) < L0[k].ap) return ["지금은 행동력이 모자라요", "제안은 컨설팅 화면 카드에 남겨 뒀어요(기한 안에 답하기)"]; return [c2LectDo(s, k, true).msg]; }
function c2LectMonth(s, r, notes, scenes) {
  const cs = s.cs, c2 = c2of(s), L = B2.lect; if (!cs.open) return; c2.lect = (c2.lect || []).filter((o) => s.t - o.t <= L.keep);
  if (cs.offers > 0) { for (let i = 0; i < cs.offers && c2.lect.length < L.maxQ; i++) c2.lect.push(c2LectNew(s, r, "one")); cs.offers = 0; } // 예전 저장의 섭외 대기는 단건 제안으로 옮긴다
  if (typeof location !== "undefined" && /-c2lecttest/.test(location.hash || "") && !c2.lect.length) { for (const k of ["one", "series", "big"]) c2.lect.push(c2LectNew(s, r, k)); if (scenes) scenes.push(c2LectBigScene(c2.lect[2])); return; } // 시험(#auto..-cs-cs2on-c2lecttest): 세 종류 제안과 대형 장면을 바로 만든다
  const fame = s.fame || 0, full = BIG.isFull(s), aiX = 1 - aiDrop(s) / 100 * CS_AI.lectOfferW;
  const p = Math.min(L.max, (cs.reviews < L.rev0 ? L.early : L.base + L.rev * Math.min(1, cs.reviews / L.revAt) + fame / L.fameDiv) + helperPower(s, "cs_lecture") * 0.1) * aiX;
  for (const pp of [p, p * L.two]) { if (c2.lect.length >= L.maxQ || !r.chance(pp)) break;
    const k = full && fame >= L.bigFame && r.chance(L.bigP) ? "big" : (cs.lectN || 0) >= L.seriesLect && cs.reviews >= L.seriesRev && r.chance(Math.min(L.seriesMax, L.seriesP + fame / L.seriesFame)) ? "series" : "one";
    const o = c2LectNew(s, r, k); c2.lect.push(o); if (k === "big" && scenes) scenes.push(c2LectBigScene(o)); notes.push(`컨설팅: 강의 제안이 왔어요 - ${k === "big" ? "대형 토크콘서트" : k === "series" ? `${o.n}회 연속 강의` : "특강"} ${won(o.fee)}(행동력 ${o.ap})`); }
}
function c2LectNew(s, r, k) {
  const L = B2.lect, cs = s.cs, fame = s.fame || 0, x = SYN.pi(s) * mod(s, "lectureMult", 1) * (1 - aiDrop(s) / 100 * CS_AI.lectFeeW);
  const one = (r.range(L.lo, L.hi) + fame * L.fame + Math.min(cs.reviews, L.revCap) * L.revW) * (BIG.isFull(s) && fame >= L.fullFame ? L.fullX : 1), n = k === "series" ? r.int(4, 5) : 1;
  const fee = k === "big" ? r.range(L.bigLo, L.bigHi) : k === "series" ? one * L.seriesX * n / 4.5 : one;
  return { k, n, ap: k === "one" ? 1 : 2, fee: Math.max(1, Math.round(fee * x / 5) * 5), org: r.pick(C2D.LECT_ORGS), t: s.t };
}
function c2LectDo(s, i, yes) {
  const c2 = c2of(s), cs = s.cs, o = (c2.lect || [])[+i]; if (!o) return { ok: false, msg: "" };
  if (!yes) { c2.lect.splice(+i, 1); return { ok: true, msg: "이번 강의는 정중히 거절했어요." }; }
  if ((s.ap || 0) < o.ap) return { ok: false, msg: `행동력 ${o.ap}이 필요해요` };
  s.ap -= o.ap; c2.lect.splice(+i, 1); s.cash += o.fee; addMoney(s, "inc", "강의료", o.fee); cs.monthRev += o.fee; c2.lectSt = c2.lectSt || { n: 0, sum: 0 }; c2.lectSt.n++; c2.lectSt.sum += o.fee;
  const before = cs.lectN || 0; cs.lectN = before + o.n;
  if (o.k === "big") { s.fame = clamp((s.fame || 0) + B2.lect.bigFameUp, 0, 100); cs.refer += 2; applyEff(s, { eye: 4 }); return { ok: true, msg: `대형 토크콘서트 무대에 섰어요. 강의료 ${won(o.fee)} · 명성 +${B2.lect.bigFameUp} · 소개 +2` }; }
  if (o.k === "series") { cs.refer += 2; cs.reviews += 1; applyEff(s, { eye: 4 }); return { ok: true, msg: `${o.n}회 연속 강의를 마쳤어요. 강의료 ${won(o.fee)} · 소개 +2 · 후기 +1` }; }
  const rf = before % 2 === 0 ? 1 : 0; cs.refer += rf; applyEff(s, { eye: 2 }); return { ok: true, msg: `특강을 하고 왔어요. 강의료 ${won(o.fee)}${rf ? " · 소개 +1" : ""}` };
}
function c2LectHtml(S, esc, wonF) { const L0 = c2of(S).lect || []; if (!c2LectOn() || !L0.length) return "";
  return `<div style="margin-top:8px"><b>강의 제안</b> <span class="tiny muted">값을 보고 골라요. 거절해도 불이익은 없어요.</span>${L0.map((o, i) => `<div class="tiny" style="margin-top:6px">${esc(o.k === "big" ? `대형 토크콘서트. ${wonF(o.fee)}에 인지도도 오른다. 준비에 더 힘을 들여야 해 행동력 2가 든다. 갈까요?` : o.k === "series" ? `${o.org}의 ${o.n}회 연속 강의. ${o.n}번이나 가야 해서 행동력이 2 든다. 강의료는 ${wonF(o.fee)}. 할까요?` : `${o.org}에서 특강 요청이 왔다. 강의료 ${wonF(o.fee)}. 갈까요?`)}<div class="row wrap" style="gap:4px;margin-top:3px"><button class="btn sm gold" data-cspol="c2:lect:${i}:1">${o.k === "series" ? "한다" : "간다"} ⚡${o.ap}</button><button class="btn sm" data-cspol="c2:lect:${i}:0">거절</button><span class="tag">${Math.max(1, B2.lect.keep + 1 - (S.t - o.t))}달 안에 답하기</span></div></div>`).join("")}</div>`; }
// 채널 넓히기(11-28): 새 채널을 열고(돈·행동력·준비 달) 식지 않게 돌본다. 채널 수와 상태가 본업 문의의 천장을 정한다
const c2Ch = (s) => { const c2 = c2of(s); return (c2.ch = c2.ch || {}); };
const c2ChLive = (s, id) => { const x = c2of(s).ch?.[id]; return x && s.t >= x.on ? x.heat : 0; };
export function c2ChanX(s, f, tier) { const K = B2.chan; let sum = 0; for (const [id, CH] of Object.entries(C2D.CHANNELS)) { const h = c2ChLive(s, id); if (h > 0) sum += CH.w * h * (CH.fit?.[f] ?? CH.fit?.[tier] ?? 1); } return BIG.isFull(s) ? clamp(K.base - K.ai * c2AiG(s) + sum, K.min, K.max) : 1 + K.emp * sum; }
export const c2ChanN = (s) => Object.keys(C2D.CHANNELS).filter((id) => c2ChLive(s, id) >= B2.chan.live).length;
const c2ChSee = (s, id) => !C2D.CHANNELS[id].at || (c2of(s).mo || 0) >= C2D.CHANNELS[id].at;
function c2ChanTick(s, notes, scenes) { const c2 = c2of(s), ch = c2.ch || {}; for (const [id, x] of Object.entries(ch)) if (s.t >= x.on) x.heat = Math.max(0, Math.round((x.heat - (C2D.CHANNELS[id]?.decay ?? B2.chan.decay)) * 100) / 100);
  for (const [id, CH] of Object.entries(C2D.CHANNELS)) if (CH.at && c2ChSee(s, id) && !(c2.chSeen || {})[id]) { c2.chSeen = c2.chSeen || {}; c2.chSeen[id] = 1; if ((c2.mo || 0) > CH.at + 1) continue; /* 예전 저장: 이미 나온 채널은 조용히 목록에 넣는다 */ notes.push(`컨설팅: 새 채널이 생겼어요 - ${CH.n}(상품과 가격 → 채널 넓히기)`); if (scenes) scenes.push(chStory("컨설팅", `새 채널: ${CH.n}`, CH.say, "consult", [`${CH.n}이 채널 목록에 생겼어요`, CH.d])); } }
function c2ChanDo(s, op, id) {
  const CH = C2D.CHANNELS[id], ch = c2Ch(s); if (!CH || !c2ChSee(s, id)) return { ok: false, msg: "" };
  if (op === "chopen") { if (ch[id]) return { ok: false, msg: "" }; if (CH.need && !s.cs.niches.includes(CH.need)) return { ok: false, msg: "이직 포지션이 있어야 해요" }; const cost = Math.round(CH.cost * SYN.pi(s)); if (s.cash < cost) return { ok: false, msg: `준비 비용 ${won(cost)}이 모자라요` }; if ((s.ap || 0) < CH.ap) return { ok: false, msg: `행동력 ${CH.ap}이 필요해요` };
    s.ap -= CH.ap; s.cash -= cost; addMoney(s, "exp", "채널 준비", cost); ch[id] = { on: s.t + CH.prep, heat: 1 }; return { ok: true, msg: `${CH.n} 준비를 시작했어요. ${CH.prep}달 뒤부터 문의가 와요.` }; }
  const c0 = ch[id]; if (!c0 || s.t < c0.on) return { ok: false, msg: "" }; if ((s.ap || 0) < 1) return { ok: false, msg: "행동력 1이 필요해요" }; s.ap -= 1; c0.heat = 1; return { ok: true, msg: `${CH.n}을 다시 돌봤어요. 식었던 문의가 돌아와요.` };
}
function c2ChanHtml(S, esc, W) { const ch = c2of(S).ch || {}, full = BIG.isFull(S), x0 = c2ChanX(S, "total", "std"), K = B2.chan;
  const rows = Object.entries(C2D.CHANNELS).filter(([id]) => c2ChSee(S, id)).map(([id, CH]) => { const c0 = ch[id], prep = c0 && S.t < c0.on, st = !c0 && CH.need && !S.cs.niches.includes(CH.need) ? `<span class="tag red">이직 포지션이 있어야 열 수 있어요</span>` : !c0 ? `<button class="btn sm" data-cspol="c2:chopen:${id}">열기 ${W(CH.cost)} · ⚡${CH.ap} · 준비 ${CH.prep}달</button>` : prep ? `<span class="tag">준비 중 · ${c0.on - S.t}달 남음</span>` : `<span class="tag ${c0.heat >= K.live ? "" : "red"}">${c0.heat >= 0.8 ? "잘 도는 중" : c0.heat >= K.live ? "식는 중" : "식었어요"} ${Math.round(c0.heat * 100)}%</span> <button class="btn sm" data-cspol="c2:chtend:${id}">돌보기 ⚡1</button>`;
    return `<div style="margin-top:6px"><b>${esc(CH.n)}</b> ${st}<div class="tiny muted">${esc(CH.d)}</div></div>`; }).join("");
  return `<div style="margin-top:10px"><b>채널 넓히기</b> <span class="tiny muted">새 채널 ${c2ChanN(S)}개 굴리는 중 · ${full ? `지금 문의는 본업 자리의 ${Math.round(x0 * 100)}%쯤` : `본업이 되면 지금 채널로는 자리의 ${Math.round(clamp(K.base - K.ai * c2AiG(S) + (x0 - 1) / K.emp, K.min, K.max) * 100)}%쯤만 차요`}</span><div class="tiny muted">부업 때 하던 마케팅(블로그·인별·후기·소개·강의)만으로는 본업 자리의 절반쯤만 차요. 새 채널을 두세 개 뚫어야 가득 차요. 채널은 내버려 두면 식어요.${c2AiG(S) > 0 ? " AI가 지어낸 후기와 저가 경쟁자 때문에 예전 채널의 힘이 줄고 있어요." : ""}</div>${rows}</div>`; }
// 본업으로 가려면: 최고가가 열림 · 업의 이해도 · 합격 사례집 · 후기 · 맡고 있는 전략 고객 · 최근 1년 컨설팅 수입이 월급보다 많음
export function c2FullReady(s) {
  const Q = B2.fullReq, c2 = c2of(s), u = undV(s), nn = c2NoteN(c2), h = (s.hist || []).slice(-Q.mo), inc = h.reduce((a, x) => a + (x.cs || 0), 0), sal = h.reduce((a, x) => a + (x.sal || 0), 0);
  const list = [{ n: "최고가 상품이 열림", ok: C2D.STRAT.some((f) => c2.open[f + ":top"] !== undefined) }, { n: `업의 이해도 ${Q.und}`, ok: u >= Q.und, now: u }, { n: `합격 사례집 ${Q.notes}건`, ok: nn >= Q.notes, now: nn }, { n: `후기 ${Q.rev}개`, ok: s.cs.reviews >= Q.rev, now: Math.floor(s.cs.reviews) },
    { n: `맡고 있는 전략 고객 ${Q.cases}명`, ok: c2.cases.length >= Q.cases, now: c2.cases.length }, { n: `새 채널 ${Q.chan}개 굴리는 중`, ok: c2ChanN(s) >= Q.chan, now: c2ChanN(s) }, { n: `최근 1년 컨설팅 수입이 월급의 ${Math.round((Q.pay ?? 1) * 100)}% 이상`, ok: h.length >= Q.mo && inc >= sal * (Q.pay ?? 1) && (c2.migT === undefined || s.t >= c2.migT + 11), pay: 1 }];
  return { ok: list.every((x) => x.ok), list };
}
const c2FullOk = (s) => c2of(s).fullOk !== 0;
function c2FullTick(s) { const c2 = c2of(s); if (!BIG.isFull(s)) { delete c2.fullOk; return; } const R0 = c2FullReady(s); if (c2.fullOk === undefined) c2.fullOk = R0.ok ? 1 : 0; else if (c2.fullOk === 0 && R0.list.every((x) => x.ok || x.pay)) { c2.fullOk = 1; log(s, "컨설팅: 본업 준비가 다 찼다. 인원 상한이 다 열렸다.", "work"); } }
function c2FullLine(S, esc) { const c2 = c2of(S), full = BIG.isFull(S), R0 = c2FullReady(S), mk = (x) => `<span class="${x.ok ? "good" : "muted"}">${x.ok ? "✔" : "✘"} ${esc(x.n)}${x.ok || x.now === undefined ? "" : `(지금 ${x.now})`}</span>`;
  if (full) return c2.fullOk === 0 ? `<div class="tiny bad" style="margin-top:6px">준비가 덜 된 채 본업이 됐어요. 인원은 절반만 더 열리고 본업 문의도 덜 와요. 채우면 다 열려요: ${R0.list.filter((x) => !x.ok && !x.pay).map(mk).join(" · ")}</div>` : "";
  if (!Object.keys(c2.open).length) return "";
  return `<div class="tiny" style="margin-top:6px"><b>본업으로 가려면</b> ${R0.ok ? `<span class="good">준비가 됐어요</span>` : ""}<br>${R0.list.map(mk).join(" · ")}<br><span class="muted">다 채우기 전에 퇴사해도 막지는 않지만, 본업 인원이 절반만 더 열리고 문의가 모자라요.</span></div>`; }
// 봇: 본업으로 가는 때. FULLAT=N 이면 컨설팅 N년 차에(준비가 덜 됐어도), 아니면 준비가 다 찼을 때
export function c2FullGo(s) { if (!D.CS2_ON || !s.cs?.c2) return false; const at = typeof process !== "undefined" ? process.env?.FULLAT : undefined; return at !== undefined && at !== "" ? (s.cs.c2.mo || 0) >= +at * 12 : c2FullReady(s).ok; }
const c2Cnt = (c2, tier) => c2.cases.filter((c) => c.tier === tier).length;
const c2Free = (s, tier) => c2Cap(s, tier) - c2Cnt(c2of(s), tier);
// 값(오늘 값, 만원)과 실제 받는 돈(물가 반영)
// 내 가격: 오토(기본)와 직접 정하기. 직접이면 등급마다 다섯 칸에서 고른다(c2.topP: 최고가는 분야 이름, 표준·프리미엄은 "분야:등급", 자기소개서·면접은 "light"). 값은 오늘 값(물가는 받을 때 곱한다)
const c2PKey = (f, tier) => (tier === "top" ? f : tier === "light" || tier === "mini" ? "light" : f + ":" + tier);
const c2PIdx = (s, f, tier) => clamp(c2of(s).topP[c2PKey(f, tier)] ?? 2, 0, 4);
export const c2IsAuto = (s) => c2of(s).pMan !== 1;
const c2StepP = (f, tier, i) => (tier === "light" ? B2.pstep[i] : tier === "mini" ? Math.round(B2.miniFee * B2.pstep[i]) : C2D.FIELDS[f].price[tier][i]);
// 오토가 잡는 값: 한두 달 늦은 시세 × 보수적인 배수. 실력 웃돈은 덜 받는다. 문의가 끊길 값은 부르지 않는다
export function c2AutoP(s, f, tier) {
  const A = B2.autoP, am = c2of(s).am?.[f + ":" + tier] ?? 1, sh = c2Shift(s), k = am * (1 + (sh - 1) * A.skill) * (BIG.isFull(s) ? A.fullLow ?? A.low : A.low); /* 본업이면 오토 값도 조금 더 받는다(11-28 마감) */
  if (tier === "light") return Math.round(clamp(k, B2.pstep[0], B2.pstep[4]) * 100) / 100;
  if (tier === "mini") return Math.round(B2.miniFee * clamp(k, B2.pstep[0], B2.pstep[4]));
  const R = C2D.FIELDS[f].price[tier];
  if (tier === "top") return Math.round(clamp((R[0] + (R[2] - R[0]) * Math.min(1, (sh - 1) / A.topAt)) * am, R[0], R[4]) / 5) * 5;
  return Math.round(clamp(R[2] * k, R[0], R[4]) / 5) * 5;
}
function c2AutoTick(s) { const c2 = c2of(s), L = B2.autoP.lag; c2.am = c2.am || {}; c2.mo = (c2.mo ?? (s.cs.passT0 !== undefined ? Math.max(0, s.t - s.cs.passT0) : 0)) + 1; const each = (f, tr) => { const k = f + ":" + tr, x = c2Mkt(s, f, tr).x; c2.am[k] = Math.round(((c2.am[k] ?? x) * (1 - L) + x * L) * 1000) / 1000; }; each("essay", "light"); each("interview", "mini"); for (const f of C2D.STRAT) for (const tr of c2Tiers(f)) each(f, tr); }
export function c2Price(s, f, tier, idx) { if (idx === undefined && c2IsAuto(s)) return c2AutoP(s, f, tier); return c2StepP(f, tier, clamp(idx ?? c2PIdx(s, f, tier), 0, 4)); }
// AI 고비의 세기(0~1): 기존 AI 대세 시작보다 pre 년 앞서 조금씩, ramp 년에 걸쳐 다 찬다
export function c2AiG(s) { const A = B2.ai; return clamp((s.t / 12 - (aiFrom(s) - A.pre)) / A.ramp, 0, 1); }
const C2_AI_SC = [null,
  ["AI가 문 앞까지 왔다", "상담 온 취준생이 노트북을 돌려 보였다. \"이거 AI가 써 준 건데 그냥 내면 안 돼요?\" 문장은 매끈한데 누구 이야기인지 알 수 없다. 옆자리 사람 것과 바꿔도 모를 글이다. 무료 AI 취업 코치 광고도 눈에 띄기 시작했다. 아직은 조짐이다.", ["AI 고비가 시작돼요(해마다 조금씩 세져요)", "AI로 써 온 서류는 통과율이 내려가요 → 서류 칸에 'AI 티 걷어내기'", "표준 등급 시세가 조금씩 내려가요. 프리미엄·최고가는 버텨요"]],
  ["AI와 같이 살기", "기업이 AI 면접과 AI 서류 평가를 들였다. 고객은 상담 중에 \"AI는 이렇게 말하던데요\"라고 되묻는다. 후기 게시판에는 AI가 지어낸 합격 후기가 넘친다. 반대로 눈높이 설득, 멘탈 관리, 면접 실전, 이직 협상은 여전히 사람을 찾는다. 위로 올라가야 산다.", ["AI 면접·AI 서류 평가: 면접 칸에 'AI 면접 대비'가 없으면 효과가 줄어요(새 전형 연구로 얻어요)", "설득이 어려워져요. 같은 회사 유형 합격 사례집이 있으면 그대로예요", "후기의 힘이 줄고 표준 고객의 환불 시비가 늘어요", "프리미엄·최고가 시세는 올라요"]]];
function c2AiScene(s, notes, scenes) { const c2 = c2of(s), to = s.t / 12 >= aiFrom(s) ? 2 : c2AiG(s) > 0 ? 1 : 0; if (to > (c2.aiSeen || 0)) { c2.aiSeen = to; const S0 = C2_AI_SC[to]; if (scenes) scenes.push(chStory("컨설팅", S0[0], S0[1], "consult", S0[2])); else notes.push("컨설팅: " + S0[2][0]); } }
// 시세: 그 분야·등급의 요즘 시장 값(오늘 값). 시즌 · 채용 한파 · AI · 경쟁 컨설턴트로 움직인다. x: 평소 대비 배수 · why: 화면에 보일 까닭
export function c2Mkt(s, f, tier) {
  const M = B2.mkt, nk = f === "move" ? "career" : f === "public" ? "public" : f === "interview" ? "interview" : "newgrad", why = [], pc = (v) => (v > 0 ? "+" : "−") + Math.abs(Math.round(v * 100)) + "%"; let x = 1;
  if (f !== "move" && !s.era?.rolling && M.seasonM.includes(s.cal)) { x += M.season; why.push(`공채 시즌 ${pc(M.season)}`); }
  if (coldOn(s) && f !== "move") { x += M.cold; why.push(`채용 한파로 문의가 몰려요 ${pc(M.cold)}`); }
  const ai = c2AiG(s) * (M.ai[tier] ?? 0); if (Math.abs(ai) > 0.005) { x -= ai; why.push(ai > 0 ? `무료 AI 취업 코치가 퍼졌어요 ${pc(-ai)}` : `사람 손이 필요한 일이라 값이 올라요 ${pc(-ai)}`); }
  if (tier === "light") { const a2 = (1 - aiCut(s, "newgrad")) * CS_AI.priceW; if (a2 > 0.005) why.push(`AI로 자기소개서 시세가 ${Math.round(a2 * 100)}% 내려와 있어요`); }
  const cp = M.comp * Math.sin((s.t / M.compT + Math.max(0, C2D.STRAT.indexOf(f)) * 0.23) * 2 * Math.PI); x += cp; if (Math.abs(cp) > 0.02) why.push(cp > 0 ? `경쟁 컨설턴트들이 값을 올렸어요 ${pc(cp)}` : `경쟁 컨설턴트 할인 경쟁 ${pc(cp)}`);
  const b0 = tier === "light" ? 1 : tier === "mini" ? B2.miniFee : C2D.FIELDS[f].price[tier][2];
  return { v: b0 * x, x, why };
}
export function c2Shift(s) { const H = B2.shift, g = (v, [dv, w]) => w * Math.min(1, v / dv); return 1 + g(undV(s), H.und) + g(s.cs.passes || 0, H.pass) + g(s.cs.reviews || 0, H.rev); }
// 수요: q0 = 내 값 ÷ 시세 · q = 실력으로 민 뒤의 비율 · d = 문의 배수(최고가는 한 달 문의 명수 그 자체)
export function c2Dem(s, f, tier, idx) {
  const P = c2Price(s, f, tier, idx), M = c2Mkt(s, f, tier), sh = c2Shift(s), q0 = P / M.v, q = q0 / sh, Q = B2.dem;
  if (q >= Q.cut) return { q0, q, d: 0 };
  if (tier === "top") return { q0, q, d: B2.topA * Math.exp(-B2.topK * (P / (M.x * sh) - 300)) };
  return { q0, q, d: Math.min(Q.max, Math.exp(-Q.e * (q - 1))) };
}
const c2Feel = (n) => (n >= 1 ? "많음" : n >= 0.45 ? "보통" : n >= 0.12 ? "드묾" : "거의 없음"), c2FeelD = (dd) => (dd >= 1.25 ? "많음" : dd >= 0.75 ? "보통" : dd >= 0.35 ? "드묾" : "거의 없음");
function c2Fee(s, f, tier) { return Math.round(c2Price(s, f, tier) * SYN.pi(s) * (f === "move" && csHidPause(s) ? CS_HID.price : 1) * (tier === "mini" && s.cs.lv >= 4 ? 1.3 : 1)); }
// 평판(0.3~1.3): 합격 사례집 · 후기 · 명성 · 전략 고객 합격
export function c2Rep(s) { const R0 = B2.rep, cs = s.cs, c2 = c2of(s), f = (v, [d, w]) => w * Math.min(1, v / d); return Math.min(R0.max, R0.base + f(c2NoteN(c2), R0.notes) + f(cs.reviews, R0.rev) * (1 - B2.ai.rev * c2AiG(s)) + f(s.fame || 0, R0.fame) + f(undV(s), R0.und)); }
// 한 달 문의(명). flat: 시즌·한파 같은 그달 사정을 빼고 본 평소 값(화면용)
export function c2Rate(s, f, tier, o = {}) {
  const cs = s.cs, F = C2D.FIELDS[f], nk = F.niche || (cs.niche && cs.niche !== "career" ? cs.niche : "newgrad");
  const dm = c2Dem(s, f, tier, o.idx).d, base = tier === "top" ? dm : B2.rate[tier] * dm;
  let x = base * F.dem * BIG.fullLead(s) * (BIG.isFull(s) && c2FullOk(s) ? B2.fullX : 1) * (f === "move" && tier === "top" && s.big?.vip ? B2.vipX : 1) * c2ChanX(s, f, tier) * c2Rep(s) * clamp(skill(s) / B2.need[tier], 0.5, 1.1) * (B2.mk[0] + (1 - B2.mk[0]) * Math.min(1, (cs.leads || 0) / B2.mk[1])) * agMult(s, nk);
  if (!o.flat) x *= (0.6 + 0.4 * (s.era?.rolling ? 1 : D.NICHES[nk].season[s.cal - 1])) * coldLead(s, nk) * (o.lv ?? 1) * (o.g ?? 1);
  return x;
}
function c2Leads(s, r, lvMult, G) {
  const cs = s.cs, c2 = c2of(s); if (c2.off) { c2.wait = []; return; }
  c2.wait = c2.wait.filter((w) => s.t - w.t < B2.waitMo);
  for (const w of [...c2.wait]) if (c2Free(s, w.tier) > 0 && c2Sell(s, w.f, w.tier)) { c2.wait.splice(c2.wait.indexOf(w), 1); c2New(s, r, w.f, w.tier); cs.newThisMonth++; }
  for (const b of [...c2.back]) if (b.t <= s.t) { // 예전에 붙여 보낸 사람이 이직하려고 돌아온다
    c2.back.splice(c2.back.indexOf(b), 1); const tier = ["top", "prem", "std"].find((t) => c2Sell(s, "move", t) && c2Free(s, t) > 0);
    if (tier) { const c = c2New(s, r, "move", tier, { back: 1 }); c.pk = "mv3"; cs.newThisMonth++; log(s, `몇 해 전 붙여 보낸 고객이 이직 상담으로 돌아왔다${b.side ? "(계열사에서 사내 이동에 성공했다고 한다)" : ""}.`, "work"); }
  }
  for (const f of C2D.STRAT) for (const tier of c2Tiers(f)) {
    if (!c2Sell(s, f, tier)) continue;
    const n = r.poisson(c2Rate(s, f, tier, { lv: lvMult, g: G.lead }));
    for (let i = 0; i < n; i++) { if (c2Free(s, tier) > 0) { c2New(s, r, f, tier); cs.newThisMonth++; } else if (c2.wait.filter((w) => w.tier === tier).length < B2.waitMax) c2.wait.push({ f, tier, t: s.t }); else c2.lost = (c2.lost || 0) + 1; }
  }
}
// 가벼운 고객 흐름에서 갈라지는 것: 이직 포지션은 종합만(가벼운 상품 없음) · 면접 프리미엄 가격이면 면접 고객은 간이 전략 고객
function c2Client(s, r, niche, prod) {
  if (niche === "career") return !c2of(s).off && c2of(s).open["move:std"] !== undefined; // 이직 전략 상품이 아직 안 열린 예전 저장은 가벼운 상품 그대로
  if (niche === "interview" && prod === "coach" && LP(s) === "high" && c2Sell(s, "interview", "mini") && c2Free(s, "mini") > 0 && r.chance(B2.miniP)) { c2New(s, r, "interview", "mini"); s.cs.newThisMonth++; return true; }
  return false;
}
const c2Gap = (co, job, spec) => C2D.COS[co].bar + (C2D.JOBS[job]?.comp || 0) - spec;
function c2DueT(s, r, f, co, tier) {
  const U = B2.dur; if (f === "interview") return s.t + r.int(U.mini[0], U.mini[1]); if (BIG.isFull(s)) return s.t + U.full; // 본업이면 한 사람을 두 달에 끝낸다(상시 지원으로 돌린다)
  const ta = tier === "top" ? U.topAdd || 0 : 0; if (f === "move") return s.t + U.move + ta;
  if (s.era?.rolling || (f !== "public" && C2D.COS[co]?.roll)) return s.t + U.roll + ta;
  for (let d = U.min + ta; d < 14; d++) if ((tier === "std" ? U.calStd : U.cal).includes(((s.cal - 1 + d) % 12) + 1)) return s.t + d;
  return s.t + 6;
}
function c2New(s, r, f, tier, opt = {}) {
  const cs = s.cs, c2 = c2of(s), pub = f === "public", mini = tier === "mini";
  const pool = Object.keys(C2D.PEOPLE).filter((k) => C2D.PEOPLE[k].f.includes(mini ? "mini" : f)), pk = r.pick(pool), P = C2D.PEOPLE[pk];
  const spec = Math.round((r.range(P.spec[0], P.spec[1]) + (tier === "top" ? 0.3 : 0)) * 2) / 2;
  const co = pub ? r.pick(Object.keys(C2D.ORGS)) : r.pick(P.co), job = pub ? null : r.pick(Object.keys(C2D.JOBS));
  let cand = (pub ? C2D.PUB_BL : P.bl).filter((k) => !mini || ["int", "both"].includes(C2D.BLOCKS[k].at));
  if (mini && cand.length < 2) cand = ["intent", "blank", "mute"];
  const nb = tier === "std" || mini ? 2 : 3, ks = [];
  while (ks.length < nb && cand.length) { const k = r.pick(cand); cand = cand.filter((x) => x !== k); ks.push(k); }
  if (!pub && !mini && c2Gap(co, job, spec) >= 1 && r.chance(0.8)) { ks.pop(); ks.unshift("high"); }
  const hp = (tier === "top" ? 0.65 : 0.5) * (1 - Math.min(B2.und.seeMax, (c2.undBase || 0) / B2.und.see)), bl = ks.map((k, i) => ({ k, h: i > 0 && k !== "high" && r.chance(hp) ? 1 : 0 })), st = formStat(s), fee = c2Fee(s, f, tier);
  const c = { id: ++c2.seq, f, tier, fee, q: Math.round(c2Dem(s, f, tier).q0 * 100) / 100, t0: s.t, due: c2DueT(s, r, f, co, tier), pk, spec, co, job, bl, tmp: r.pick(Object.keys(C2D.TEMPERS)), tmpH: r.chance(0.55 * (1 - Math.min(B2.und.seeMax, (c2.undBase || 0) / B2.und.see))) ? 1 : 0, plan: {}, diag: 0, set: 0, per: null, miss: 0, up: 1, g: cs.guar || 0, cold: coldOn(s) && f !== "move" ? 1 : 0,
    nf: !pub && f !== "move" && st.f > 0 && r.chance(Math.min(0.6, st.f * 2.5 + (co === "it" ? 0.2 : 0))) ? 1 : 0, retry: 0, nint: mini ? r.int(1, 3) : 0, back: opt.back ? 1 : 0 };
  c2Known(s, c);
  c2.cases.push(c); s.cash += fee; addMoney(s, "inc", "컨설팅", fee); cs.monthRev += fee; cs.clients++; c2.st.n++; c2.st.rev += fee;
  return c;
}
// 후반(시기 3): 합격 사례집에 있는 조합이면 가려진 것이 보이고, 그때 쓴 카드로 칸이 채워진다. 남는 일은 설득과 관리다
function c2Known(s, c) {
  const c2 = c2of(s); if ((c2.stage || 1) < 3) return; const N = c2.notes[c2NoteKey(c, { co: c.co, job: c.job })]; if (!N?.win) return;
  for (const b of c.bl) b.h = 0; c.tmpH = 0; c.diag = 1; c.pre = 1;
  for (const sl of c2Slots(c)) { if (sl.id === "goal") continue; c.plan[sl.id] = (N.cards || []).filter((id) => C2CARD[id]?.slot === sl.id && c2.cards[id] && c2Usable(c, C2CARD[id])).slice(0, sl.cap[c.tier]); }
}
// 그 고객에게 쓰는 칸 · 그 칸에 쓸 수 있는 카드
export const c2Slots = (c) => (c.f === "public" ? C2D.SLOTS_PUB : C2D.SLOTS).filter((sl) => (sl.cap[c.tier] || 0) > 0);
export function c2Usable(c, cd) { if (cd.f === "pub" && c.f !== "public") return false; if (cd.f === "biz" && c.f === "public") return false; if (cd.f === "move" && c.f !== "move") return false; if (cd.only && c.co !== cd.only) return false; return true; }
export const c2Hand = (s, c, slot) => C2D.CARDS.filter((cd) => cd.slot === slot && c2of(s).cards[cd.id] && c2Usable(c, cd));
const c2Lv = (c2, id) => { const w = c2.cards[id]?.w || 0; return 1 + (w >= B2.lvAt[0] ? 1 : 0) + (w >= B2.lvAt[1] ? 1 : 0); };
function c2PlanCards(c, assume) { const res = c.per ?? assume ?? "ok", out = []; for (const [slot, ids] of Object.entries(c.plan)) for (const id of ids || []) { const cd = C2CARD[id]; if (!cd) continue; if (slot === "goal" && cd.per !== undefined && res === "fail") continue; out.push(cd); } return out; }
// 설득 결과에 따른 실제 목표(mix: 절반만 넘어왔다)
export function c2Target(c, assume) {
  const g = (c.plan.goal || []).map((id) => C2CARD[id]).find((x) => x && x.to), res = c.per ?? assume ?? "ok";
  if (!g || res === "fail") return { co: c.co, job: c.job, mix: 0 };
  let co = c.co, job = c.job;
  if (g.to === "down") co = (c.f === "public" ? C2D.ORGS : C2D.COS)[c.co].down; else if (g.to === "aff") co = c.co === "hq" ? "aff" : c.co; else if (g.to === "job") job = C2D.JOBS[c.job].comp > 0 ? "buy" : "sales";
  return { co, job, mix: res === "half" ? 1 : 0 };
}
const c2NoteKey = (c, T) => (c.f === "public" ? "org:" + T.co : c.tier === "mini" ? "mini:" + c.co : T.co + ":" + T.job);
// 지원 깔때기 계산. known: 내가 아는 것만으로(가려진 막힌 곳은 뺀다, 화면 미리보기) · assume: 설득 결과를 이렇게 가정
export function c2Eval(s, c, o = {}) {
  const c2 = c2of(s), pub = c.f === "public", mini = c.tier === "mini", cards = c2PlanCards(c, o.assume), tags = new Set(cards.flatMap((x) => x.tags)), T = c2Target(c, o.assume), E = B2.eff;
  const eff = clamp(E[0] + E[1] * skill(s) / B2.need[c.tier], E[2], E[3]) * (c2.notes[c2NoteKey(c, T)]?.win ? 1 + B2.note : 1);
  const bls = c.bl.filter((b) => !(o.known && b.h)), has = (slot) => (c.plan[slot] || []).length > 0, left = [];
  const resid = (k) => { const fx = cards.filter((cd) => cd.tags.some((t) => C2D.BLOCKS[k].fix.includes(t))); return fx.length ? 1 - B2.lvFix[Math.max(...fx.map((cd) => c2Lv(c2, cd.id))) - 1] : 1; };
  const pen = (at) => bls.reduce((a, b) => { const BL = C2D.BLOCKS[b.k]; if (BL.at !== at && !(BL.at === "both" && (at === "doc" || at === "int"))) return a; const rs = resid(b.k); if (rs >= 1 && !left.includes(b.k)) left.push(b.k); return a * (1 - BL.pen * rs); }, 1);
  const want = pub ? [C2D.ORGS[T.co].iv, "jdmatch", "blind"] : [...C2D.COS[T.co].want, C2D.JOBS[T.job]?.want].filter(Boolean);
  const mOf = (slots) => Math.min(B2.matchMax, new Set(cards.filter((cd) => slots.includes(cd.slot)).flatMap((cd) => cd.tags).filter((t) => want.includes(t))).size);
  const nfX = c.nf ? (tags.has("newform") ? 0.85 + 0.15 * Math.min(1, formStat(s).a / CS_CH.form.target) : B2.nf) : 1, coldX = c.cold ? B2.cold : 1, TB = B2.taboo, O = B2.ops;
  const blank = c.bl.some((b) => b.k === "blank" && !(o.known && b.h)), tmp = o.known && c.tmpH ? null : C2D.TEMPERS[c.tmp];
  let intP = (B2.intBase + B2.intSpec * (c.spec - 3)) * pen("int") * (1 + B2.match * eff * mOf(["int", "mind"])) * (has("int") ? 1 : B2.empty) * (tags.has("pressure") ? (blank ? TB.press : TB.pressOk) : 1) * (tmp?.weak && tags.has(tmp.weak) ? TB.script : 1) * (tags.has("calm") ? TB.calm : 1) * (c.nf && !mini ? (tags.has("aiint") ? 1.05 : 0.95) : 1) * (c.f !== "move" && !tags.has("aiint") ? 1 - B2.ai.int * c2AiG(s) : 1);
  intP = clamp(intP, 0.02, 0.8);
  const ghost = tmp?.need && !tags.has(tmp.need), missX = Math.max(0.4, 1 - O.miss * (c.miss || 0));
  if (mini) { const apps = c.nint || 1, p = Math.min(B2.pMax, 1 - Math.pow(1 - intP, apps)); return { mini: 1, apps, docP: 1, wr: 1, intP, p, eff, left, T, exp: [apps, apps, apps * intP] }; }
  let apps, docP, wr = 1;
  if (pub) {
    const OG = C2D.ORGS[T.co], pall = c.bl.some((b) => b.k === "pall" && !(o.known && b.h)) && resid("pall") >= 1;
    apps = (B2.pubApps + (tags.has("orgpick") ? 1 : 0) + (pall ? 3 : 0)) * (ghost ? O.ghost : 1) * missX;
    docP = clamp(B2.pubDoc * pen("doc") * (1 + B2.match * eff * mOf(["diag", "goal", "doc"])) * (has("doc") ? 1 : B2.empty), 0.03, 0.9);
    const boost = eff * ((tags.has("ncs") ? 0.8 : 0) + (tags.has("ncs2") ? 0.6 : 0) + (tags.has("speed") ? (OG.w === "psat" ? 0.8 : 0.3) : 0) + (tags.has("major") && OG.w === "major" ? 0.9 : 0));
    let base = c2Interp(B2.wrBase, OG.bar - c.spec - boost + (OG.w === "major" && !tags.has("major") ? 0.5 : 0));
    if (T.mix) base = B2.per.mix * base + (1 - B2.per.mix) * c2Interp(B2.wrBase, C2D.ORGS[c.co].bar - c.spec - boost);
    wr = clamp(base * pen("wr") * (has("ncs") ? 1 : B2.empty) * coldX, 0.01, 0.85);
  } else {
    const PP = C2D.PEOPLE[c.pk];
    let base = c2Interp(B2.docBase, c2Gap(T.co, T.job, c.spec)); if (T.mix) base = B2.per.mix * base + (1 - B2.per.mix) * c2Interp(B2.docBase, c2Gap(c.co, c.job, c.spec));
    docP = clamp(base * pen("doc") * (1 + B2.match * eff * mOf(["diag", "goal", "doc", "ops"])) * (has("doc") ? 1 : B2.empty) * nfX * coldX * (tags.has("volume") && !ghost ? O.volDoc : 1) * (tags.has("ref") ? O.refDoc : 1) * (c.f !== "move" && !tags.has("deai") ? 1 - B2.ai.doc * c2AiG(s) : 1), 0.005, 0.8);
    apps = PP.apps * pen("apps") * (tags.has("volume") && !ghost ? O.volume : 1) * (tags.has("season") ? O.season : 1) * (tags.has("deadline") ? O.deadline : 1) * (ghost ? O.ghost : 1) + (tags.has("open") ? O.open : 0) + (tags.has("hunter") ? O.hunter : 0) + (tags.has("ref") ? O.ref : 0);
    apps = Math.min(O.max, apps * missX);
  }
  apps = Math.max(1, apps);
  const p = Math.min(B2.pMax, 1 - Math.pow(1 - docP * wr * intP, apps));
  return { pub: pub ? 1 : 0, apps, docP, wr, intP, p, eff, left, T, exp: pub ? [apps, apps * docP, apps * docP * wr, apps * docP * wr * intP] : [apps, apps * docP, apps * docP * intP] };
}
// 설득 확률(목표를 바꾸는 카드를 넣었을 때만). null 이면 설득이 필요 없다
export function c2PerP(s, c) {
  const g = (c.plan.goal || []).map((id) => C2CARD[id]).find((x) => x && x.per !== undefined); if (!g) return null;
  const P = B2.per, c2 = c2of(s), tags = new Set(Object.values(c.plan).flat().flatMap((id) => C2CARD[id]?.tags || [])), T = C2D.TEMPERS[c.tmp], tgt = c2Target(c, "ok");
  const noteCo = Object.entries(c2.notes).some(([k, n]) => n.win && (k.startsWith(tgt.co + ":") || k === "org:" + tgt.co));
  const p = P.base + (s.st.talk - P.talk[0]) / P.talk[1] + P.trust * Math.min(1, s.cs.trust || 0) - g.per + (tags.has("rate") ? P.rate : 0) + (noteCo ? P.note : 0) + (T.want && tags.has(T.want) ? 0 : T.per)
    + (c.pk === "parent" ? (tags.has("family") ? P.family : P.parent) : 0) + (c.cold ? P.cold : 0) + (c.retry ? P.retry : 0) + (c.back ? 0.1 : 0) - (noteCo ? 0 : B2.ai.per * c2AiG(s));
  return clamp(p, P.min, P.max);
}
function c2Drop(s, c) { const c2 = c2of(s); c2.cases = c2.cases.filter((x) => x !== c); if (c2.ui.id === c.id) c2.ui.id = 0; }
function c2Refund(s, c, frac) { const cs = s.cs, c2 = c2of(s), back = Math.round(c.fee * frac); if (back <= 0) return 0; s.cash -= back; addMoney(s, "exp", "환불", back); cs.monthRev -= back; cs.refunds = (cs.refunds || 0) + 1; cs.refundAll = (cs.refundAll || 0) + 1; c2.st.ref += back; return back; }
const c2Who = (c) => `${C2D.FIELDS[c.f].n} ${C2D.TIER_N[c.tier]} 고객(${C2D.PEOPLE[c.pk].n})`;
// 진단: 진단 칸의 카드를 쓴다. 가려진 것이 드러난다. 직설 카드를 팩트를 못 견디는 사람에게 쓰면 떠난다
function c2Diag(s, c) {
  if (c.diag) return { ok: false, msg: "이미 진단했어요" };
  const ids = c.plan.diag || [], cds = ids.map((id) => C2CARD[id]).filter(Boolean), ap = cds.reduce((a, x) => a + (x.ap || 0), 0);
  if (!cds.length) return { ok: false, msg: "진단 칸에 카드를 넣어요" };
  if ((s.ap || 0) < ap) return { ok: false, msg: "행동력이 부족해요" };
  s.ap -= ap;
  const T = C2D.TEMPERS[c.tmp], soft = (c.plan.mind || []).some((id) => C2CARD[id]?.tags.includes("soft"));
  if (T.taboo && cds.some((x) => x.tags.includes(T.taboo)) && !soft) {
    const back = c2Refund(s, c, B2.fail.leave); s.cs.reviews = Math.max(0, s.cs.reviews - B2.fail.rev); c2of(s).st.left++; c2Drop(s, c); s.mental = Math.max(0, s.mental - 3);
    log(s, `${c2Who(c)}이 상담 도중 떠났다.`, "work");
    return { ok: true, gone: 1, msg: `"그런 말 들으려고 온 게 아니에요." ${T.n}이었어요. 고객이 떠났어요. 환불 −${won(back)} · 후기 −${B2.fail.rev}` };
  }
  const out = []; let n = 0;
  for (const cd of cds) for (const rv of cd.rev || []) {
    if (rv === "tmp") { if (c.tmpH) { c.tmpH = 0; out.push(`성향: ${T.n}`); } continue; }
    for (const b of c.bl) { if (!b.h) continue; const at = C2D.BLOCKS[b.k].at; if (rv === "bl" || (rv === "bl1" && n === 0) || (rv === "int" && ["int", "both"].includes(at)) || (rv === "doc" && ["doc", "both", "apps"].includes(at)) || (rv === "wr" && at === "wr")) { b.h = 0; n++; out.push(`막힌 곳: ${C2D.BLOCKS[b.k].n}`); } }
  }
  c.diag = 1;
  return { ok: true, msg: out.length ? `진단: ${out.join(" · ")}` : "진단: 새로 드러난 것은 없어요" };
}
// 전략 확정: 진단(아직이면) → 눈높이 설득 판정 → 결과 달까지 그대로 간다
function c2Go(s, c) {
  if (c.set) return { ok: false, msg: "이미 전략을 정했어요. 결과가 나오거나 전형이 바뀌면 다시 짜요" };
  const need = c2Slots(c).filter((sl) => sl.id !== "diag" && sl.id !== "mind" && !(c.plan[sl.id] || []).length);
  if (need.length && !c.auto) return { ok: false, msg: `빈 칸이 있어요: ${need.map((x) => x.n).join(" · ")}` };
  if (!c.diag) { if ((c.plan.diag || []).length) { const d = c2Diag(s, c); if (!d.ok || d.gone) return d; } else c.diag = 1; }
  const p = c2PerP(s, c); let msg = "전략을 정했어요. 결과 달까지 달마다 상담만 챙기면 돼요";
  if (p != null) {
    const g = (c.plan.goal || []).map((id) => C2CARD[id]).find((x) => x && x.per !== undefined), u = R(s).next();
    c.per = u < p ? "ok" : u < p + B2.per.half ? (g.to ? "half" : "ok") : "fail";
    const T = c2Target(c), nm = c.f === "public" ? C2D.ORGS[T.co].n : `${C2D.COS[T.co].n} ${C2D.JOBS[T.job].n}`;
    msg = c.per === "ok" ? `설득 성공: "${g.to ? nm + "부터 넣어 볼게요" : "해 볼게요"}." 전략대로 가요` : c.per === "half" ? `절반만 넘어왔어요: "원래 가려던 곳도 몇 곳은 넣을게요."` : `설득 실패: "그래도 저는 원래대로 할래요." 「${g.n}」 없이 가요. 떨어지면 환불 요구가 올 수 있어요`;
    if (c.per === "fail") s.mental = Math.max(0, s.mental - 1);
  }
  c.set = 1; c.setT = s.t; c.replan = 0; c.auto = 0;
  return { ok: true, msg };
}
// 화면 버튼(data-cspol="c2:…")
function c2Do(s, a) {
  const c2 = c2of(s), [op, x, y, z] = a, c = c2.cases.find((q) => q.id === +x);
  if (op === "open") { c2.ui.id = c2.ui.id === +x ? 0 : +x; return { ok: true, msg: "" }; }
  if (op === "chopen" || op === "chtend") return c2ChanDo(s, op, x);
  if (op === "lect") return c2LectDo(s, x, y === "1");
  if (op === "pm") { // 오토 ↔ 직접 정하기. 직접으로 바꾸는 순간에는 오토가 잡고 있던 값에 가장 가까운 칸에서 시작한다
    const man = x === "1"; if (man === !c2IsAuto(s)) return { ok: true, msg: "" };
    if (man) { const snap = (f, tr) => { const a0 = c2AutoP(s, f, tr); let bi = 0, bd = 1e9; for (let i = 0; i < 5; i++) { const dv = Math.abs(c2StepP(f, tr, i) - a0); if (dv < bd) { bd = dv; bi = i; } } c2.topP[c2PKey(f, tr)] = bi; }; snap("essay", "light"); for (const f of C2D.STRAT) for (const tr of c2Tiers(f)) snap(f, tr); c2.pMan = 1; }
    else delete c2.pMan;
    return { ok: true, msg: man ? "이제 값을 직접 정해요. 잘 맞추면 오토보다 더 벌고, 잘못 부르면 덜 벌어요." : "값을 오토에 맡겼어요. 시세보다 조금 낮게, 보수적으로 잡아요." };
  }
  if (op === "pr") { // 내 가격: 행동력 0, 한 달에 한 번
    const tier = y, i = clamp(+z || 0, 0, 4), key = c2PKey(x, tier); if (c2IsAuto(s) || (tier !== "light" && !C2D.FIELDS[x]?.price?.[tier])) return { ok: false, msg: "" };
    c2.pT = c2.pT || {}; if ((c2.topP[key] ?? 2) === i) return { ok: true, msg: "" }; if (c2.pT[key] === s.t) return { ok: false, msg: "값은 한 달에 한 번만 바꿀 수 있어요. 다음 달에 다시 정해요." };
    c2.topP[key] = i; c2.pT[key] = s.t; const dm = c2Dem(s, x, tier);
    return { ok: true, msg: `${tier === "light" ? "자기소개서·면접" : C2D.FIELDS[x].n + " " + C2D.TIER_N[tier]} 값을 시세의 ${Math.round(dm.q0 * 100)}%로 정했어요${dm.d <= 0 ? ". 이 값이면 문의가 끊겨요" : ""} (이번 달부터 들어오는 고객에게 적용)` };
  }
  if (op === "view") { c2.ui[x] = c2.ui[x] ? 0 : 1; return { ok: true, msg: "" }; }
  if (op === "sell") { const k = c2Key(x, y); c2.sell[k] = c2.sell[k] === 0 ? 1 : 0; return { ok: true, msg: `${C2D.FIELDS[x]?.n || ""} ${C2D.TIER_N[y] || ""}: ${c2.sell[k] === 0 ? "받지 않음" : "받음"}` }; }
  if (op === "top") { if (!C2D.FIELDS[x]?.price) return { ok: false, msg: "" }; c2.topP[x] = clamp(+y || 0, 0, 4); return { ok: true, msg: `${C2D.FIELDS[x].n} 최고가: ${won(Math.round(c2Price(s, x, "top") * SYN.pi(s)))} (이번 달부터 들어오는 고객에게 적용)` }; }
  if (op === "off") { c2.off = c2.off ? 0 : 1; return { ok: true, msg: c2.off ? "사람별 전략 상품을 받지 않아요. 가벼운 상품만 팔아요" : "사람별 전략 상품을 다시 받아요" }; }
  if (!c) return { ok: false, msg: "" };
  if (op === "pick") {
    if (c.set) return { ok: false, msg: "이미 정한 전략이에요" }; if (y === "diag" && c.diag) return { ok: false, msg: "진단은 이미 했어요" };
    const sl = c2Slots(c).find((q) => q.id === y), cd = C2CARD[z]; if (!sl || !cd || cd.slot !== y || !c2.cards[z] || !c2Usable(c, cd)) return { ok: false, msg: "" };
    const L = (c.plan[y] = c.plan[y] || []); if (L.includes(z)) L.splice(L.indexOf(z), 1); else { L.push(z); while (L.length > sl.cap[c.tier]) L.shift(); }
    return { ok: true, msg: "" };
  }
  if (op === "diag") return c2Diag(s, c);
  if (op === "go") return c2Go(s, c);
  return { ok: false, msg: "" };
}
// 방법론 카드 얻기: 사는 것이 아니라 쌓는 것(합격·불합격 사례, 강의, 블로그, 템플릿, 새 전형 연구)
function c2Cards(s, notes) {
  const cs = s.cs, c2 = cs.c2, got = [];
  for (const cd of C2D.CARDS) {
    if (c2.cards[cd.id]) continue; const g = cd.get || {};
    const ok = g.start || (g.pass && (cs.passes || 0) >= g.pass) || (g.sp && (c2.spAll || 0) >= g.sp) || (g.fail && (cs.fails || 0) >= g.fail) || (g.lect && (cs.lectN || 0) >= g.lect) || (g.blog && cs.ch.blog.posts >= g.blog) || (g.tmpl && cs.template >= g.tmpl) || (g.form && (cs.form?.a || 0) >= g.form) || (g.career && cs.niches.includes("career")) || (g.pub && cs.niches.includes("public")) || (g.rev && cs.reviews >= g.rev);
    if (ok) { c2.cards[cd.id] = { w: 0, t: s.t }; if (!g.start) got.push(cd.n); }
  }
  if (notes && got.length) notes.push(got.length <= 3 ? `컨설팅: 방법론 카드 ${got.map((n) => `「${n}」`).join(" ")}${got.length > 1 ? "을" : ""} 얻었어요` : `컨설팅: 방법론 카드 ${got.length}장을 얻었어요(「${got[0]}」 등)`);
}
// 달마다 상담: 처리 용량에서 전략 고객 몫을 먼저 쓴다
export const c2Due = (s) => D.CS2_ON && !!s.cs.c2 && s.cs.c2.cases.some((c) => !c.up);
function c2Upkeep(s, cap) { let n = 0; for (const c of c2of(s).cases) { if (c.up) continue; const u = B2.units[c.tier]; if (cap >= u || (n === 0 && cap > 0)) { cap = Math.max(0, cap - u); c.up = 1; n++; } } return { cap, n }; }
function c2Coach(s, coach, notes) { const c2 = c2of(s); let n = 0; for (const c of c2.cases) { if (c.up || !c.set) continue; const u = B2.units[c.tier]; if (coach >= u && c2.notes[c2NoteKey(c, c2Target(c))]?.win) { coach -= u; c.up = 1; n++; } } if (n) notes.push(`공동 코치가 전략 고객 ${n}명의 이번 달 상담을 맡았어요(합격 사례집에 있는 조합만)`); return coach; }
// 달 마감: 카드 · 관문 · 못 챙긴 상담 · 결과 달이 된 고객의 지원 깔때기
function c2Month(s, r, notes, scenes, lightPass = 0) {
  const cs = s.cs, c2 = c2of(s); let pass = 0, fail = 0;
  if (!cs.open) return { pass, fail };
  c2AutoTick(s); c2MigTick(s); c2ChanTick(s, notes, scenes); c2FullTick(s); c2Cards(s, notes); c2Latch(s, notes, scenes); c2AiScene(s, notes, scenes); undMonth(s, lightPass, notes, scenes);
  let auto = 0, miss = 0;
  for (const c of c2.cases) {
    if (!c.set && s.t - (c.retryT ?? c.t0) >= B2.auto) { c.auto = 1; c.diag = 1; c.set = 1; c.setT = s.t; c.per = null; auto++; }
    if (!c.up) { c.miss = (c.miss || 0) + 1; miss++; }
    c.up = 0; if (c.tmpH && s.t - c.t0 >= 2) c.tmpH = 0; // 두 달 지내 보면 성향은 드러난다
  }
  if (auto) notes.push(`컨설팅: 전략을 못 짠 고객 ${auto}명은 기본 상담만으로 가요(합격 가능성이 낮아요)`);
  if (miss) notes.push(`컨설팅: 이번 달 상담을 못 챙긴 전략 고객 ${miss}명(지원 수가 줄어요)`);
  for (const c of c2.cases.filter((q) => q.due <= s.t && q.set)) { const w = c2Resolve(s, r, c, notes); if (w > 0) pass++; else if (w < 0) fail++; }
  return { pass, fail };
}
function c2Resolve(s, r, c, notes) {
  const cs = s.cs, c2 = c2of(s), ev = c2Eval(s, c), bin = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (r.chance(p)) k++; return k; }, F = B2.fail, W = B2.win, T = ev.T;
  const apps = Math.max(1, Math.round(ev.apps)), d = ev.mini ? apps : bin(apps, ev.docP), w = ev.pub ? bin(d, ev.wr) : d, o = bin(w, ev.intP), key = c2NoteKey(c, T);
  const fun = ev.mini ? `면접 ${apps}곳 → 합격 ${o}` : ev.pub ? `지원 ${apps} → 서류 ${d} → 필기 ${w} → 합격 ${o}` : `지원 ${apps} → 서류 ${d} → 합격 ${o}`;
  const where = c.f === "public" ? C2D.ORGS[T.co].n : c.tier === "mini" ? C2D.COS[T.co].n : `${C2D.COS[T.co].n} ${C2D.JOBS[T.job].n}`, MK = CS_F30.mask[cs.mask || "name"] || CS_F30.mask.name;
  const N = (c2.notes[key] = c2.notes[key] || { n: 0, win: 0, f: c.f }); N.n++;
  c2.log.unshift({ t: s.t, f: c.f, tier: c.tier, pk: c.pk, where, fun, win: o >= 1 ? 1 : 0, per: c.per }); if (c2.log.length > 8) c2.log.pop();
  if (o >= 1) {
    cs.passes++; c2.st.win++; if (c.tier !== "mini") { c2.spAll = (c2.spAll || 0) + 1; c2.sp[c.f] = (c2.sp[c.f] || 0) + 1; }
    N.win++; N.t = s.t; N.cards = Object.values(c.plan).flat().filter((id) => C2CARD[id]); for (const id of N.cards) if (c2.cards[id]) c2.cards[id].w = (c2.cards[id].w || 0) + 1;
    if (c.cold) coldCnt(s, 1, 0); if (c.nf) formGain(s, CS_CH.form.passGain); gainStat(s, "career", 0.15, "cs_pass");
    { const U = B2.und, hard = c.f === "public" || c.tier === "mini" ? 0 : Math.max(0, c2Gap(c.co, c.job, c.spec)); undAdd(s, U.win[c.tier] * (1 + U.gap * Math.min(3, hard)) * (c.cold ? U.cold : 1) * (N.win === 1 ? U.first : 1)); }
    if (r.chance(0.8)) cs.reviews += MK.rev * W.rev[c.tier];
    cs.refer = Math.min(CS_BAL.refMax, cs.refer + W.refer * mod(s, "referMult", 1)); if (W.fame[c.tier]) s.fame = clamp((s.fame || 0) + W.fame[c.tier], 0, 100);
    if (c.f === "total" && r.chance(W.backP)) c2.back.push({ t: s.t + r.int(W.back[0], W.back[1]), side: (c.plan.goal || []).includes("g_side") && c.per === "ok" ? 1 : 0 });
    notes.push(`${c2Who(c)} 합격! ${where} · ${fun}${N.win === 1 ? " · 합격 사례집에 새 장" : ""}${c.per === "ok" && c.bl.some((b) => b.k === "high") ? " · 눈높이를 옮긴 것이 통했어요" : ""}`);
    c2Drop(s, c); return 1;
  }
  cs.fails++; c2.st.lose++; if (c.cold) coldCnt(s, 0, 1); cs.reviews += 0.15;
  const quitLeft = c.bl.some((b) => b.k === "quitfirst") && ev.left.includes("quitfirst");
  let line = `${c2Who(c)} 전부 탈락. ${where} · ${fun}`;
  if (c.g && CS_F30.guar[c.g]?.back) { const back = c2Refund(s, c, Math.min(1, CS_F30.guar[c.g].back * (c.cold ? 1 + CS_CH.cold.guarUp * CS_CH.k : 1))); cs.gRef += back; cs.gRefN++; cs.gRefAll = (cs.gRefAll || 0) + back; line += ` · 합격 보장 환불 −${won(back)}`; c2Drop(s, c); notes.push(line); return -1; }
  const pr = F.ref + (c.per === "fail" ? F.perFail : 0) + F.tier[c.tier] + (quitLeft ? F.quitRef : 0) + Math.max(0, (c.q || 1) - 1) * B2.dem.exp + (c.tier === "std" ? B2.ai.ref * c2AiG(s) : 0) + (c.cold ? Math.min(0.6, CS_CH.cold.failRef * CS_CH.k) : 0) + (c.auto ? 0.15 : 0);
  if (r.chance(Math.min(0.9, pr))) {
    const bk = F.back[c.tier], back = c2Refund(s, c, Array.isArray(bk) ? r.range(bk[0], bk[1]) : bk); cs.reviews = Math.max(0, cs.reviews - F.rev * (1 + Math.max(0, (c.q || 1) - 1) * B2.dem.expRev)); s.mental = Math.max(0, s.mental - (c.tier === "top" ? 5 : 3));
    if (c.cold) { cs.coldRefN = (cs.coldRefN || 0) + 1; cs.coldRefAll = (cs.coldRefAll || 0) + back; }
    line += ` · 환불 요구 −${won(back)}${c.per === "fail" ? "(원하는 대로만 넣고 떨어진 뒤예요)" : ""}`; c2Drop(s, c); notes.push(line); return -1;
  }
  if (!c.retry && c.tier !== "mini" && r.chance(F.retry)) { // 무료 재도전: 자리는 그대로 차지하고, 전략을 다시 짠다
    c.retry = 1; c.retryT = s.t; c.set = 0; c.per = null; c.auto = 0; c.miss = 0; c.up = 1; c.cold = coldOn(s) && c.f !== "move" ? 1 : 0; c.due = c2DueT(s, r, c.f, c.co, c.tier); for (const b of c.bl) b.h = 0; c.tmpH = 0;
    if (c.plan.goal) c.plan.goal = []; line += " · 다음 시즌에 다시 해 보기로 했어요(전략을 다시 짜요)"; notes.push(line); return -1;
  }
  c2Drop(s, c); notes.push(line); return -1;
}
function c2Todos(s, t) {
  const c2 = s.cs.c2; if (!c2 || !s.cs.open) return;
  const need = c2.cases.filter((c) => !c.set).length, up = c2.cases.filter((c) => !c.up && c.set).length;
  if (need) t.push({ lv: 2, text: `합격 전략을 짜야 하는 고객 ${need}명(미루면 기본 상담만으로 가요)`, go: "cs" });
  if (up) t.push({ lv: 1, text: `전략 고객 ${up}명 이번 달 상담(고객 첨삭·코칭 버튼)`, go: "cs" });
}
// 판 변화(wave.js)가 읽는 것: 길 A = 사람별 전략(종합·이직·공기업)으로 올라간 사람
export const c2PathA = (s) => !!s.cs?.c2 && Object.keys(s.cs.c2.open).length > 0 && !s.cs.c2.off;
export function c2Wave(s) {
  const g = c2Gate(s, "total", "std"), on = c2PathA(s), G = B2.gate.std;
  return { on, a: `(길 A 사람별 전략: 종합·이직·공기업 문의는 줄지 않아요. 종합컨설팅은 글쓰기나 말빨 ${G.stat}·업의 이해도 ${G.und}부터 열려요. ${on ? "이미 열었어요" : g.why.length ? `모자란 것: ${g.why.join(" · ")}` : "곧 열려요"})`,
    b: "(길 B 면접 전문: 면접 문의가 줄지 않고, 면접 프리미엄(간이 전략)을 동시에 " + B2.pathB + "명 더 맡아요. 다만 면접에는 최고가가 없어요",
    text: "취준생 열에 아홉이 AI로 자소서를 쓴다. 기업은 AI로 서류를 거른다. 커뮤니티에는 \"첨삭 받을 돈으로 구독료 낸다\"는 글이 돈다. 자소서 첨삭은 해마다 줄어들 판이다. 사람 손이 끝까지 남는 곳은 사람마다 전략을 짜 주는 일이다. 어디에 넣어야 붙는지, 그걸 어떻게 납득시키는지. 강의는 당분간 버팀목이 된다.",
    ch0: ["사람별 전략 쪽으로 올라갈 준비를 한다", "합격 사례를 다시 정리했다. 누가 어디에 어떻게 붙었는지. 이건 AI가 대신 못 한다."], bDone: "면접 전문으로 자리 잡았어요. 면접 문의는 AI 대세에도 줄지 않고, 면접 프리미엄을 " + B2.pathB + "명 더 맡아요" };
}
// 봇·시험용: 성실하지만 완벽하지 않은 전략(err: 칸마다 엉뚱한 카드를 고를 확률). rnd: 0~1 난수 함수
export function c2BotPlan(s, c, rnd, err = 0.15) {
  if (c.set) return null; const c2 = c2of(s), pickBest = (slot, cap) => {
    const hand = c2Hand(s, c, slot).filter((cd) => slot !== "goal" || cd.per === undefined || true); c.plan[slot] = [];
    for (let i = 0; i < cap; i++) {
      const rest = hand.filter((cd) => !c.plan[slot].includes(cd.id)); if (!rest.length) break;
      let best = null, bv = -1;
      if (rnd() < err) best = rest[Math.floor(rnd() * rest.length)];
      else for (const cd of rest) { c.plan[slot].push(cd.id); let v = c2Eval(s, c, { known: true, assume: "ok" }).p; if (slot === "goal" && cd.per !== undefined) { const pp = c2PerP(s, c) ?? 1; v = pp * v + (1 - pp) * c2Eval(s, c, { known: true, assume: "fail" }).p - 0.02; } c.plan[slot].pop(); if (v > bv + 1e-9) { bv = v; best = cd; } }
      if (!best) break; if (i > 0 && rnd() >= err) { const cur = c2Eval(s, c, { known: true, assume: "ok" }).p; if (bv <= cur + 0.002) break; } c.plan[slot].push(best.id);
    }
  };
  if (!c.diag) { // 진단: 드러내 주는 카드를 먼저(행동력이 되면). 직설 카드는 성향을 알 때만 피한다
    const T = C2D.TEMPERS[c.tmp], hand = c2Hand(s, c, "diag").filter((cd) => (cd.ap || 0) <= (s.ap || 0)), cap = c2Slots(c).find((x) => x.id === "diag")?.cap[c.tier] || 0;
    const sc = (cd) => (cd.rev || []).length * 2 + (cd.tags.includes("rate") ? 1.5 : 0) - (cd.tags.includes("blunt") ? (!c.tmpH && T.taboo === "blunt" ? 99 : 1.2) : 0) + rnd() * 0.5;
    c.plan.diag = hand.sort((a, b) => sc(b) - sc(a)).slice(0, cap).filter((cd) => sc(cd) > -50).map((cd) => cd.id);
    if (!c.tmpH && T.taboo === "blunt" && c2.cards.m_soft) c.plan.mind = ["m_soft"];
    const d = (c.plan.diag || []).length ? c2Diag(s, c) : (c.diag = 1, { ok: true }); if (d.gone) return d;
  }
  for (const sl of c2Slots(c)) { if (sl.id === "diag") continue; pickBest(sl.id, sl.cap[c.tier]); }
  for (const sl of c2Slots(c)) if (sl.id !== "diag" && sl.id !== "mind" && !(c.plan[sl.id] || []).length) { const h = c2Hand(s, c, sl.id)[0]; if (h) c.plan[sl.id] = [h.id]; else c.auto = 1; }
  return c2Go(s, c);
}
// ── 화면(ui.js pgCS 맨 위에 붙는다). 모든 버튼은 data-cspol="c2:…" → setPolicy ──
export function c2Top(S, esc, wonF) {
  if (!D.CS2_ON || !S.cs.open) return ""; const cs = S.cs, c2 = c2of(S), pi = SYN.pi(S), W = (v) => wonF(Math.round(v * pi)), full = BIG.isFull(S);
  const b = (key, html, cls = "", dis = false) => `<button class="${cls}" data-cspol="c2:${key}"${dis ? " disabled" : ""}>${html}</button>`;
  const tagN = (t) => `<span class="tag ${C2D.RISK.includes(t) ? "red" : ""}">${esc(C2D.TAGS[t] || t)}</span>`, pct = (x) => (x < 0.1 ? (x * 100).toFixed(1) : Math.round(x * 100)) + "%";
  const stdG = c2Gate(S, "total", "std"), anyOpen = Object.keys(c2.open).length > 0, miniG = c2Gate(S, "interview", "mini");
  const css = `<style>.row:has(> [data-cprice]),.row:has(> [data-cprice]) + .tiny{display:none}.c2s{display:flex;flex-direction:column;gap:6px}.c2s .sl{background:var(--panel2);border-radius:10px;padding:7px 8px}.c2s .sl>b{font-size:12.5px}.c2c{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:5px;margin-top:5px}.c2c button{background:var(--panel);border:1px solid var(--line);border-radius:9px;padding:6px 7px;text-align:left;font-size:12px;display:flex;flex-direction:column;gap:2px;min-width:0}.c2c button.on{border-color:var(--gold);background:rgba(245,192,78,.12)}.c2c button:disabled{opacity:.55}.c2l{display:flex;flex-direction:column;gap:4px}.c2l button{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:6px 8px;text-align:left;font-size:12.5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.c2l button.on{border-color:var(--gold)}.c2f{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center;margin-top:6px}.c2f div{background:var(--panel2);border-radius:10px;padding:6px 2px;min-width:0}.c2f .v{font-weight:900;font-size:15px}.c2f .k{font-size:11px;color:var(--muted)}.c2t{width:100%;border-collapse:collapse;font-size:12px}.c2t td{padding:4px 3px;border-top:1px solid var(--line);vertical-align:top}</style>`;
  // ① 전략 고객
  const capLine = (anyOpen ? ["std", "prem", "top"] : []).concat(miniG.ok || c2Cnt(c2, "mini") ? ["mini"] : []).map((t) => `<span class="tag">${C2D.TIER_N[t]} ${c2Cnt(c2, t)}/${c2Cap(S, t)}명${full ? "" : ` · 본업이면 ${c2Cap(S, t, true)}명까지`}</span>`).join(" ");
  const left = (c) => Math.max(0, c.due - S.t), caseBtn = (c) => { const T = c2Target(c), want = c.f === "public" ? C2D.ORGS[c.co].n : c.tier === "mini" ? C2D.COS[c.co].n + " 면접" : `${C2D.COS[c.co].n} ${C2D.JOBS[c.job].n}`;
    return b(`open:${c.id}`, `<b>${esc(C2D.FIELDS[c.f].n)} ${C2D.TIER_N[c.tier]}</b><span>${esc(C2D.PEOPLE[c.pk].n)} · ${esc(want)}</span><span class="tag ${!c.set ? "gold" : ""}">${!c.set ? (c.retry ? "재도전 · 전략 다시" : "전략 필요") : c.auto ? "기본 상담만" : `결과 ${left(c)}달 뒤`}</span>${c.set && !c.up ? `<span class="tag red">이번 달 상담 전</span>` : ""}`, c2.ui.id === c.id ? "on" : ""); };
  const gateTxt = !anyOpen ? `<div class="tiny muted" style="margin-top:6px">종합컨설팅은 자기소개서·면접 합격 실적이 쌓이면 열려요. ${stdG.why.length ? `모자란 것: ${esc(stdG.why.join(" · "))}` : "다음 달에 열려요"}</div>` : "";
  const waitN = c2.wait.length, lastLog = c2.log.slice(0, 3).map((L) => `<div class="tiny ${L.win ? "good" : "muted"}">${L.win ? "합격" : "탈락"} · ${esc(C2D.FIELDS[L.f].n)} ${C2D.TIER_N[L.tier]} · ${esc(L.where)} · ${esc(L.fun)}</div>`).join("");
  const head = `<div class="card"><h3>사람별 합격 전략 <small>전략 고객 ${c2.cases.length}명${waitN ? ` · 대기 ${waitN}` : ""}</small></h3>
    <div class="tiny muted">싼 상품은 지금처럼 가볍게 팔아요. 비싼 상품부터는 고객마다 막힌 곳과 눈높이를 읽고 전략을 짜요. 전략은 새 고객이 올 때와 떨어진 뒤에만 짜고, 평소 달은 [고객 첨삭·코칭] 한 번이면 돼요.</div>
    ${capLine ? `<div class="row wrap" style="gap:4px;margin-top:6px">${capLine}</div>` : ""}${c2FullLine(S, esc)}${c2LectHtml(S, esc, wonF)}${gateTxt}
    ${c2.cases.length ? `<div class="c2l" style="margin-top:8px">${c2.cases.map(caseBtn).join("")}</div>` : anyOpen ? `<div class="tiny muted" style="margin-top:6px">지금 맡은 전략 고객이 없어요. 문의는 값과 평판(합격 사례집·후기·명성)에 따라 와요.</div>` : ""}
    ${lastLog ? `<div style="margin-top:6px">${lastLog}</div>` : ""}
    <div class="row wrap" style="gap:6px;margin-top:8px">${b("view:shop", `상품과 가격 ${c2.ui.shop ? "▴" : "▾"}`, "btn sm")}${b("view:deck", `방법론 카드 ${Object.keys(c2.cards).length}/${C2D.CARDS.length} · 사례집 ${c2NoteN(c2)}장 ${c2.ui.deck ? "▴" : "▾"}`, "btn sm")}</div></div>`;
  // ② 전략 짜기
  let edit = ""; const c = c2.cases.find((q) => q.id === c2.ui.id);
  if (c) {
    const pub = c.f === "public", mini = c.tier === "mini", P = C2D.PEOPLE[c.pk], T = C2D.TEMPERS[c.tmp], CO = pub ? C2D.ORGS[c.co] : C2D.COS[c.co], tg = c2Target(c, "ok"), TC = pub ? C2D.ORGS[tg.co] : C2D.COS[tg.co];
    const say = c.retry ? "\"이번에는 선생님 말대로 해 볼게요.\"" : pub ? `"${esc(CO.n)}만 준비하고 있어요."` : mini ? `"${esc(CO.n)} 면접이 ${c.nint}곳 잡혔어요."` : `"${esc(CO.n)} ${esc(C2D.JOBS[c.job].n)}만 넣을 거예요."`;
    const chips = c.bl.map((x) => (x.h ? `<span class="tag">??? (아직 모름)</span>` : `<span class="tag ${x.k === "high" ? "red" : "gold"}">${esc(C2D.BLOCKS[x.k].n)}</span>`)).join(" ");
    const ev = c2Eval(S, c, { known: true, assume: c.per ? undefined : "ok" }), evF = c.per ? null : c2Eval(S, c, { known: true, assume: "fail" }), pp = c.set ? null : c2PerP(S, c), note = c2.notes[c2NoteKey(c, tg)];
    const wantTags = pub ? [CO.iv] : [...TC.want, C2D.JOBS[tg.job]?.want].filter(Boolean);
    const slots = c2Slots(c).map((sl) => { const hand = c2Hand(S, c, sl.id), chosen = c.plan[sl.id] || [], lock = c.set || (sl.id === "diag" && c.diag);
      const cardsH = lock ? (chosen.length ? chosen.map((id) => `<span class="tag gold">${esc(C2CARD[id].n)}</span>`).join(" ") : `<span class="tiny muted">비워 둠</span>`)
        : `<div class="c2c">${hand.map((cd) => b(`pick:${c.id}:${sl.id}:${cd.id}`, `<b>${esc(cd.n)}${c2Lv(c2, cd.id) > 1 ? ` <span class="tiny gold">★${c2Lv(c2, cd.id)}</span>` : ""}</b><span class="tiny muted">${esc(cd.d)}</span><span>${cd.tags.map(tagN).join(" ")}${cd.ap ? ` <span class="tag">⚡${cd.ap}</span>` : ""}${cd.per !== undefined ? ` <span class="tag">설득 필요</span>` : ""}</span>`, chosen.includes(cd.id) ? "on" : "")).join("") || `<span class="tiny muted">이 칸에 쓸 카드가 아직 없어요</span>`}</div>`;
      return `<div class="sl"><b>${esc(sl.n)}</b> <span class="tiny muted">카드 ${sl.cap[c.tier]}장까지${sl.id === "diag" && c.diag ? " · 진단함" : ""}</span>${lock ? `<div style="margin-top:4px">${cardsH}</div>` : cardsH}</div>`; }).join("");
    const fn = ev.mini ? [["면접", ev.exp[0]], ["합격", ev.exp[2]]] : ev.pub ? [["지원", ev.exp[0]], ["서류", ev.exp[1]], ["필기", ev.exp[2]], ["면접 통과", ev.exp[3]]] : [["지원", ev.exp[0]], ["서류 통과", ev.exp[1]], ["면접 통과", ev.exp[2]]];
    const funnel = `<div class="c2f" style="grid-template-columns:repeat(${fn.length + 1},1fr)">${fn.map(([k, v]) => `<div><div class="v">${v >= 10 ? Math.round(v) : v.toFixed(1)}</div><div class="k">${k}</div></div>`).join("")}<div><div class="v ${ev.p >= 0.5 ? "good" : ev.p < 0.2 ? "bad" : "gold"}">${pct(ev.p)}</div><div class="k">합격 가능성</div></div></div>`;
    const hid = c.bl.some((x) => x.h) || c.tmpH;
    const perLine = c.per ? `<div class="tiny ${c.per === "ok" ? "good" : c.per === "fail" ? "bad" : "gold"}" style="margin-top:4px">설득 ${c.per === "ok" ? "성공: 전략대로 가요" : c.per === "half" ? "절반: 원래 가려던 곳도 몇 곳 넣어요" : "실패: 본인이 원하는 대로만 넣어요"}</div>` : pp != null ? `<div class="tiny gold" style="margin-top:4px">설득이 필요해요 · 넘어올 확률 약 ${pct(pp)}${evF ? ` · 실패하면 합격 가능성 ${pct(evF.p)}` : ""}. 근거가 힘이 돼요: 통과율 숫자, 같은 회사 유형의 합격 사례, 쌓인 신뢰.</div>` : "";
    edit = `<div class="card" style="border-color:var(--gold)"><h3>${esc(C2D.FIELDS[c.f].n)} ${C2D.TIER_N[c.tier]} <small>${wonF(c.fee)} · 결과 ${left(c)}달 뒤</small></h3>
      <div class="small"><b>${esc(P.n)}</b> · 스펙 ${"★".repeat(Math.floor(c.spec))}${c.spec % 1 ? "☆" : ""} <span class="tiny muted">(${c.spec}/5)</span> · 성향 ${c.tmpH ? "???" : `<b>${esc(T.n)}</b>`}</div>
      <div class="tiny muted" style="margin-top:2px">${say}${!c.tmpH ? ` · ${esc(T.d)}` : ""}</div>
      <div class="row wrap" style="gap:4px;margin-top:6px">${chips}</div>
      <div class="tiny muted" style="margin-top:6px">${pub ? `목표 기관: <b>${esc(TC.n)}</b> · 필기 ${esc(C2D.W_N[TC.w])} · 합격선 ${TC.bar}` : `목표: <b>${esc(TC.n)}${mini ? "" : " " + esc(C2D.JOBS[tg.job].n)}</b>${mini ? "" : ` · 요구 스펙 ${(TC.bar + C2D.JOBS[tg.job].comp).toFixed(1)}`}`} · ${esc(TC.tip)}</div>
      ${wantTags.length ? `<div class="tiny muted" style="margin-top:2px">여기서 알아주는 것: ${wantTags.map(tagN).join(" ")}</div>` : ""}
      ${c.nf ? `<div class="tiny bad" style="margin-top:2px">새 전형(과제·역량 검사·포트폴리오)이 낀 곳이에요. 새 전형 카드가 없으면 서류 통과율이 깎여요.</div>` : ""}${c.cold ? `<div class="tiny bad" style="margin-top:2px">채용 한파에 받은 고객이에요. 통과율이 내려가 있어요. 눈높이 설득은 조금 쉬워요.</div>` : ""}
      ${note?.win ? `<div class="tiny good" style="margin-top:2px">합격 사례집: 이 조합 합격 ${note.win}번. 그때 쓴 카드: ${esc((note.cards || []).map((id) => C2CARD[id]?.n).filter(Boolean).join(" · "))}</div>` : ""}
      <div class="c2s" style="margin-top:8px">${slots}</div>
      ${funnel}<div class="tiny muted" style="margin-top:4px">${hid ? "가려진 것(???)이 있어 실제는 이보다 낮을 수 있어요. 진단 카드로 드러내요. " : ""}${ev.left.length ? `아직 못 푼 곳: ${esc(ev.left.map((k) => C2D.BLOCKS[k].n).join(" · "))}` : c.set ? "" : "드러난 막힌 곳은 다 풀었어요."}</div>${perLine}
      ${c.set ? `<div class="tiny muted" style="margin-top:6px">${c.auto ? "전략 없이 기본 상담만으로 가고 있어요." : "전략을 정했어요."} 결과 달에 지원한 곳마다 서류·면접이 확률로 굴러가요.${c.miss ? ` 상담을 ${c.miss}달 못 챙겼어요.` : ""}</div>` : `<div class="row wrap" style="gap:6px;margin-top:8px">${!c.diag && (c.plan.diag || []).length ? b(`diag:${c.id}`, `진단하기${(c.plan.diag || []).reduce((a, id) => a + (C2CARD[id].ap || 0), 0) ? ` ⚡${(c.plan.diag || []).reduce((a, id) => a + (C2CARD[id].ap || 0), 0)}` : ""}`, "btn sm") : ""}${b(`go:${c.id}`, "전략 확정", "btn sm gold")}</div>`}</div>`;
  }
  // ③ 상품과 가격
  let shop = "";
  if (c2.ui.shop) {
    const rep = c2Rep(S), lk = LP(S), lightBtn = (k, n) => `<button class="btn sm ${lk === k || (k === "mid" && lk === "mid") ? (lk === k ? "gold" : "") : ""}" data-cspol="p:${k}">${n}</button>`;
    const row = (f) => { const F = C2D.FIELDS[f]; return `<tr><td><b>${esc(F.n)}</b></td><td>${c2Tiers(f).map((t) => { const g = c2Gate(S, f, t), open = c2.open[c2Key(f, t)] !== undefined, on = c2Sell(S, f, t);
        if (!open) return `<div class="tiny muted">${C2D.TIER_N[t]} ${W(F.price[t][0])}~${W(F.price[t][4])} · 잠김: ${esc(g.why.join(" · ") || "다음 달에 열려요")}</div>`;
        const M = c2Mkt(S, f, t), cur = c2PIdx(S, f, t), dm = c2Dem(S, f, t), lock = c2.pT?.[c2PKey(f, t)] === S.t, au = c2IsAuto(S);
        return `<div style="margin-bottom:8px">${b(`sell:${f}:${t}`, `${C2D.TIER_N[t]} ${W(c2Price(S, f, t))} · ${on ? "받는 중" : "안 받음"}`, `btn sm ${on ? "gold" : ""}`)} <span class="tiny muted">시세 ${W(M.v)} · ${au ? `오토가 잡은 값 ${W(c2Price(S, f, t))}(시세의 ${Math.round(dm.q0 * 100)}%) · 보수적으로 잡아요` : `내 값은 시세의 ${Math.round(dm.q0 * 100)}% · 오토라면 ${W(c2AutoP(S, f, t))}`} · 문의 ${c2Feel(c2Rate(S, f, t, { flat: 1 }))}</span>${au ? "" : `<div class="row wrap" style="gap:4px;margin-top:4px">${F.price[t].map((p, i) => b(`pr:${f}:${t}:${i}`, `${W(p)}<span class="tiny muted"> ${c2Feel(c2Rate(S, f, t, { flat: 1, idx: i }))}</span>`, `btn sm ${cur === i ? "gold" : ""}`, lock && cur !== i)).join("")}</div>`}${M.why.length ? `<div class="tiny muted">시세: ${esc(M.why.join(" · "))}</div>` : ""}</div>`; }).join("")}</td></tr>`; };
    shop = `<div class="card"><h3>상품과 가격 <small>평판 ×${rep.toFixed(2)}</small></h3>
      <table class="c2t"><tr><td style="width:84px"><b>자기소개서</b></td><td><div class="row wrap" style="gap:4px"><button class="btn sm ${lk === "low" ? "gold" : ""}" data-cspol="p:low">저가</button><button class="btn sm ${lk !== "low" ? "gold" : ""}" data-cspol="p:mid">보통</button></div><div class="tiny muted">고가가 없어요. AI가 깎는 쪽이라 비싸게 못 팔아요.</div></td></tr>
      <tr><td><b>면접</b></td><td><div class="row wrap" style="gap:4px"><span class="tag">저가·보통은 자기소개서와 같이 움직여요</span><button class="btn sm ${lk === "high" ? "gold" : ""}" data-cspol="p:high">프리미엄 ${W(c2Price(S, "interview", "mini"))}</button></div><div class="tiny muted">프리미엄부터 사람별 간이 전략(진단·면접·멘탈 칸). ${miniG.ok ? "" : `모자란 것: ${esc(miniG.why.join(" · "))}`}</div></td></tr>
      <tr><td><b>값 정하기</b></td><td>${(() => { const au = c2IsAuto(S), M = c2Mkt(S, "essay", "light"), cur = c2PIdx(S, "essay", "light"), dm = c2Dem(S, "essay", "light"), lock = c2.pT?.light === S.t, pc = (x) => (Math.abs(x - 1) < 0.005 ? "평소 값" : (x > 1 ? "+" : "−") + Math.abs(Math.round((x - 1) * 100)) + "%");
        return `<div class="row wrap" style="gap:4px">${b("pm:0", "오토", `btn sm ${au ? "gold" : ""}`)}${b("pm:1", "직접", `btn sm ${au ? "" : "gold"}`)}</div><div class="tiny muted">${au ? "오토는 시세보다 조금 낮게, 한두 달 늦게 따라가요. 문의가 끊길 일은 없지만 잘 맞춘 값보다 덜 벌어요." : "직접 정하면 잘 맞춘 만큼 더 벌고, 잘못 부르면 오토보다 못 벌어요. 값은 한 달에 한 번 바꿀 수 있어요."}</div>
        <div class="tiny" style="margin-top:6px"><b>자기소개서·면접</b> <span class="muted">${au ? `오토가 잡은 값: 평소 값${Math.abs(c2Price(S, "essay", "light") - 1) < 0.005 ? " 그대로" : `보다 ${Math.abs(Math.round((c2Price(S, "essay", "light") - 1) * 100))}% ${c2Price(S, "essay", "light") > 1 ? "비싸게" : "싸게"}`} · 요즘 시세(${Math.round(M.x * 100)}%)와 견주면 ${Math.round(dm.q0 * 100)}%` : `내 값은 요즘 시세(평소의 ${Math.round(M.x * 100)}%)와 견주면 ${Math.round(dm.q0 * 100)}% · 오토라면 평소 값 대비 ${pc(c2AutoP(S, "essay", "light"))}`} · 문의 ${c2FeelD(dm.d)}</span></div>${au ? "" : `<div class="row wrap" style="gap:4px;margin-top:4px">${B2.pstep.map((x, i) => b(`pr:essay:light:${i}`, `${pc(x)}<span class="tiny muted"> ${c2FeelD(c2Dem(S, "essay", "light", i).d)}</span>`, `btn sm ${cur === i ? "gold" : ""}`, lock && cur !== i)).join("")}</div>`}${M.why.length ? `<div class="tiny muted">시세: ${esc(M.why.join(" · "))}</div>` : ""}`; })()}</td></tr>
      ${C2D.STRAT.map(row).join("")}</table>${c2ChanHtml(S, esc, W)}
      <div class="tiny muted" style="margin-top:6px">값은 오늘 값에 물가를 곱해 보여요. 같은 등급이면 이직 &gt; 종합 &gt; 공기업 순서로 비싸요. 등급은 값의 범위이고, 값은 시세를 보고 그 안에서 맞춰요. 시세보다 싸면 문의가 늘지만 남는 게 적고 자리가 금방 차요. 비싸면 줄고, 많이 비싸면 끊겨요. 업의 이해도·합격 실적·후기가 높으면 더 받아도 와요(지금은 시세의 ${Math.round(c2Shift(S) * 100)}%까지 평소만큼). 비싸게 받을수록 떨어졌을 때 환불 요구와 악평이 세요.</div>
      <div class="tiny muted" style="margin-top:4px">동시에 맡는 인원은 등급마다 따로 세요. 회사를 다닐 때 표준 ${B2.cap.emp.std} · 프리미엄 ${B2.cap.emp.prem} · 최고가 ${B2.cap.emp.top}명, 본업이면 ${B2.cap.full.std} · ${B2.cap.full.prem} · ${B2.cap.full.top}명까지. 최고가 고객이 떨어지면 환불 요구가 크게 와요.</div>
      <div style="margin-top:6px">${b("off", c2.off ? "사람별 전략 상품 다시 받기" : "사람별 전략 상품 받지 않기(가벼운 상품만)", "btn sm")}</div></div>`;
  }
  // ④ 방법론 카드와 합격 사례집
  let deck = "";
  if (c2.ui.deck) {
    const SL = [...C2D.SLOTS, C2D.SLOTS_PUB[2]], getTxt = (g) => Object.entries(g || {}).map(([k, v]) => (k === "career" || k === "pub" ? C2D.GET_N[k] : `${C2D.GET_N[k] || k} ${v}`)).join(" · ");
    const bySlot = SL.map((sl) => { const L = C2D.CARDS.filter((cd) => cd.slot === sl.id); return `<div class="sl"><b>${esc(sl.id === "ncs" ? "NCS 필기 계획(공기업)" : sl.n)}</b><div style="margin-top:4px">${L.map((cd) => (c2.cards[cd.id] ? `<div class="tiny"><b>${esc(cd.n)}</b>${c2Lv(c2, cd.id) > 1 ? ` <span class="gold">★${c2Lv(c2, cd.id)}</span>` : ""} <span class="muted">${esc(cd.d)}</span></div>` : `<div class="tiny muted">잠김 · ${esc(cd.n)} · ${esc(getTxt(cd.get))}</div>`)).join("")}</div></div>`; }).join("");
    const notesH = Object.entries(c2.notes).filter(([, n]) => n.win).map(([k, n]) => { const [a, j] = k.split(":"), nm = a === "org" ? C2D.ORGS[j]?.n : a === "mini" ? (C2D.COS[j]?.n || "") + " 면접" : `${C2D.COS[a]?.n || a} ${C2D.JOBS[j]?.n || ""}`; return `<div class="tiny"><b>${esc(nm || k)}</b> 합격 ${n.win}/${n.n} <span class="muted">${esc((n.cards || []).map((id) => C2CARD[id]?.n).filter(Boolean).join(" · "))}</span></div>`; }).join("");
    deck = `<div class="card"><h3>방법론 카드 <small>사는 것이 아니라 쌓는 것</small></h3><div class="tiny muted">합격·불합격 사례, 강의, 블로그 글, 첨삭 템플릿, 새 전형 연구로 얻어요. 합격시킨 전략에 쓴 카드는 단단해져요(★2는 3번, ★3은 10번).</div><div class="c2s" style="margin-top:6px">${bySlot}</div>
      <div class="sec" style="margin-top:10px">합격 사례집 <span class="tiny muted">· 같은 조합이 다시 오면 카드가 더 잘 먹히고, 같은 회사 유형이면 설득 근거가 돼요</span></div>${notesH || `<div class="tiny muted">아직 없어요. 전략 고객을 한 명 붙이면 그 조합이 한 장 남아요.</div>`}</div>`;
  }
  return css + head + edit + shop + deck;
}
// 새 구조의 포지션 고르기(ui.js pgCS 의 포지션 칸을 갈아 끼운다)
export function c2NicheCards(S, esc) {
  const cs = S.cs, row = (k, sub) => { const n = D.NICHES[k], on = cs.niches.includes(k), why = on ? "" : c2NicheWhy(S, k); return `<button class="${on ? "on" : ""}" data-niche="${k}"><b>${esc(c2NicheN(k))}</b><span class="tiny muted">${esc(sub)}</span><span class="tiny muted">${why ? esc(why) : `조건 커리어 ${n.req.career}${n.req.years ? ` · 경력 ${n.req.years}년` : ""}`}</span></button>`; };
  return `<div class="pick">${row("newgrad", "저가 ~ 보통 · 가볍게 · 핵심 능력 글쓰기")}${row("interview", "저가 ~ 프리미엄 · 핵심 능력 말빨")}${row("public", "종합만 · NCS 필기와 기관별 유형")}${row("career", "종합만 · 값이 가장 비싸요")}</div><div class="tiny muted" style="margin-top:4px">종합컨설팅은 포지션이 아니에요. 자기소개서·면접 합격 실적이 쌓이면 저절로 열려요.</div>`;
}
// 봇·점검용 요약
export function c2Info(s) { const c2 = s.cs?.c2; if (!c2) return null; return { open: Object.keys(c2.open), cases: c2.cases.length, cards: Object.keys(c2.cards).length, notes: c2NoteN(c2), sp: c2.spAll || 0, st: c2.st, rep: +c2Rep(s).toFixed(2) }; }
// 봇 정책(sim/balance_bot.mjs 가 달마다 한 번 부른다). 환경변수: CS2PATH=cheap(싼 상품만) · CS2ADD=public,career,interview(포지션 넓히기) · CS2TOP=0~4(최고가 칸 고정) · CS2ERR(전략을 틀릴 확률) · CS2OFF=std,prem(그 등급은 안 받음)
export const c2TopOpen = (s) => D.CS2_ON && !!s.cs?.c2 && C2D.STRAT.some((f) => s.cs.c2.open[f + ":top"] !== undefined);
export function c2Bot(s, rnd) {
  if (!D.CS2_ON || !s.cs.open) return; const c2 = c2of(s), env = (typeof process !== "undefined" && process.env) || {};
  if (env.CS2PATH === "cheap") { c2.off = 1; if (s.cs.price !== "low") s.cs.price = "low"; if (s.cs.agency) setAgency(s, null); return; } // 싼 상품만: 저가로, 대행 없이
  if (env.CS2PATH === "mini") { if (!s.cs.niches.includes("interview")) setNiche(s, "interview"); for (const f of C2D.STRAT) for (const t of c2Tiers(f)) c2.sell[c2Key(f, t)] = 0; if (s.cs.niches.includes("interview") && s.cs.price !== "high") setPrice(s, "high"); } // 자소서 + 면접 프리미엄(간이 전략)까지만
  for (const k of (env.CS2ADD || "").split(",").filter(Boolean)) if (!s.cs.niches.includes(k)) setNiche(s, k);
  for (const t of (env.CS2OFF || "").split(",").filter(Boolean)) for (const f of C2D.STRAT) c2.sell[c2Key(f, t)] = 0;
  if (c2LectOn() && c2.lect?.length) { const pi = SYN.pi(s), thr = (BIG.isFull(s) ? 60 : s.cs.lv >= 3 ? 30 : 15) * pi; // 강의 제안(보통 수준): 행동력 하나에 이만큼은 돼야 간다. 나머지는 거절
    for (let i = c2.lect.length - 1; i >= 0; i--) { const o = c2.lect[i]; if (o.fee / o.ap >= thr) { if ((s.ap || 0) >= o.ap + 1) c2LectDo(s, i, true); } /* 행동력이 하나는 남을 때만 간다(초반에 남김없이 가면 컨설팅 일이 밀려 첫 5년이 더 나빠졌다) */ else c2LectDo(s, i, false); } }
  if (env.CSMODE === "full" && env.CSCHAN !== "0" && c2TopOpen(s)) { // 본업 길(보통 수준): 최고가가 열리면 새 채널을 하나씩 뚫고, 식으면 돌본다. CSCHAN=0 이면 채널을 안 넓힌다
    const ch = c2Ch(s), ids = ["chat", "thready", "linkon", "tube", "hunter", "univ", "news", "book"];
    for (const id of ids) if (ch[id] && s.t >= ch[id].on && ch[id].heat < 0.6) c2ChanDo(s, "chtend", id);
    if (!ids.some((id) => ch[id] && s.t < ch[id].on)) { const id = ids.find((k) => !ch[k] && c2ChSee(s, k) && !(C2D.CHANNELS[k].need && !s.cs.niches.includes(C2D.CHANNELS[k].need))); if (id && s.cash > C2D.CHANNELS[id].cost * SYN.pi(s) * 4) c2ChanDo(s, "chopen", id); }
  }
  if (env.CSPRICE === "best") { // 잘 맞추는 직접: 달마다 시세·시즌·실력 웃돈을 다 읽고, 자리가 도는 만큼만 받으면서 가장 많이 남는 칸을 고른다
    c2.pMan = 1; const fullB = BIG.isFull(s), fsN = (tr) => Math.max(1, C2D.STRAT.filter((f) => c2Sell(s, f, tr)).length);
    const pick = (f, tr) => { const thr = c2Cap(s, tr) / (fullB ? B2.dur.full : 4.5) / fsN(tr); let bi = 0, bv = -1; for (let i = 0; i < 5; i++) { const v = c2StepP(f, tr, i) * Math.min(thr, c2Rate(s, f, tr, { idx: i })); if (v > bv + 1e-9) { bv = v; bi = i; } } return bi; };
    for (const f of C2D.STRAT) for (const tr of c2Tiers(f)) if (c2Sell(s, f, tr)) c2.topP[c2PKey(f, tr)] = pick(f, tr);
    let bi = 2, bv = -1; for (let i = 0; i < 5; i++) { const v = B2.pstep[i] * c2Dem(s, "essay", "light", i).d; if (v > bv + 1e-9) { bv = v; bi = i; } } c2.topP.light = bi;
  }
  if (env.CSPRICE === "manual" && (s.cal === 1 || c2.botP !== BIG.isFull(s))) { // 직접 정하는 길(보통 수준): 해마다(그리고 본업이 된 달에) 평소 시세에 실력만큼 얹은 값에 가장 가까운 아래 칸으로. 기본은 오토라 아무것도 안 한다
    c2.botP = BIG.isFull(s); c2.pMan = 1; const near = (f, tr) => { const tgt = c2StepP(f, tr, 2) * c2Shift(s) * 1.02; let bi = 0; for (let i = 0; i < 5; i++) if (c2StepP(f, tr, i) <= tgt) bi = i; return bi; };
    c2.topP.light = near("essay", "light"); for (const f of C2D.STRAT) for (const tr of c2Tiers(f)) c2.topP[c2PKey(f, tr)] = tr === "top" && env.CS2TOP !== undefined ? +env.CS2TOP : near(f, tr);
  }
  for (const c of [...c2.cases]) if (!c.set) c2BotPlan(s, c, rnd, +(env.CS2ERR ?? 0.15));
}
