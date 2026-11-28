// After 6PM v4.24 · 연말 결산(매년 12월 마감에 꼭 뜬다)
// - core.js endMonth 가 12월에 yearScene(s, r) 로 장면(kind "year")을 만들어 그달 장면 맨 뒤에 넣는다.
// - 화면은 ui.js yearShow() 가 막 내리는 연출 → 숫자 → (광고 자리) → 올해의 장면 → 한 줄 정리 → 본잡 신호 순서로 그린다.
// - 본잡 전환 신호: 올해 투잡 이익(12달 합, 적자 달 포함) ÷ 지금 연봉. 1배 = 가능성, 1.5배 = 강하게 권유, 2배 = "나와라!", 3배 = 아직도 회사에?
//   같은 단계는 다시 묻지 않고(s.fullAsk), 더 높은 단계에 오르면 다시 묻는다. 비상금 6개월치는 안내만 한다(막지 않음).
import { D, won, jo, salary, netWorth, fireInfo, monthlySpend, jobYear } from "./core.js";
import * as HL from "./heroine.js"; // 11-25 올해 그 사람 한 줄
import * as TU from "./jobs/tutoring.js"; // 11-28 과외 본업 체크 목록(스위치 TU2_ON 이 켜졌을 때만 쓴다)
import { yearOffer } from "./cards.js"; // 연말 성장 카드(v4.25)

export const FULL_STEPS = [1, 1.5, 2, 3];
const YE_CAPK = (typeof process !== "undefined" && process.env?.YECAP !== undefined) ? +process.env.YECAP : 1; // 봇 손잡이: 개업 투자금을 얼마나 반영할지(0 = 예전 방식)

// 그해를 정리하는 한 줄(머리말, 덧붙임). 위에서부터 맞는 상황 하나를 고른다. 같은 문구는 최근 15개 안에서 다시 안 나온다
const LINES = {
  quit: [["사직서, 드디어 냈습니다", "출근 카드 대신 내 일의 열쇠를 쥔 해. 이제 월급날은 내가 정해요."], ["퇴근이 없어진 해", "6시 칼퇴의 꿈은 이뤘는데… 이제 일이 6시에 안 끝나요 ㅎㅎ"], ["사원증 반납, 사장님 데뷔", "명함 직함이 바뀌었어요. 책임도 같이 바뀐 건 비밀."]],
  fired: [["예고 없는 졸업식", "회사가 먼저 문을 닫아 줬어요. 아픈데, 덕분에 시간이 생겼습니다."], ["강제 휴가의 해", "인생에 이런 쉼표도 있어요. 다음 문장은 내가 씁니다."]],
  full3: [["회사가 부업이 된 해", "연봉의 세 배를 퇴근 후에 벌었어요. 이쯤 되면 회사가 취미 생활 ㅋㅋ"], ["계산기가 퇴사를 외친 해", "숫자는 거짓말을 안 해요. 이제 결정만 남았습니다."]],
  full2: [["퇴근 후가 진짜 출근", "투잡 이익이 연봉의 두 배. 저녁의 내가 낮의 나를 먹여 살렸어요."], ["월급은 거들 뿐", "이제 월급날보다 정산일이 더 기다려지는 해였어요."], ["투잡이 본캐를 이긴 해", "부캐 연봉이 본캐의 두 배. 부캐가 본캐 되는 건 시간문제예요."]],
  full15: [["저녁 6시의 반란", "연봉의 1.5배를 퇴근 후에 벌었어요. 슬슬 사직서 양식을 찾아보게 되는 해."], ["두 번째 월급이 더 큰 해", "본업 월급이 용돈처럼 느껴지기 시작했다면… 정상입니다 ㅎㅎ"]],
  full1: [["투잡이 연봉을 따라잡은 해", "퇴근 후 3시간이 하루 9시간과 같아졌어요. 이게 되네요?"], ["월급 하나 더 생긴 해", "통장에 월급이 두 번 들어오는 기분, 올해 처음 알았어요."], ["가능성을 숫자로 본 해", "꿈이 아니라 엑셀로 증명했어요. 내년에도 이 숫자면 진지하게 이야기해요."]],
  married: [["둘이 된 해", "가계부 주인이 두 명이 됐어요. 목표 금액도 같이 커졌지만, 같이 버는 사람도 생겼습니다."], ["청첩장 돌린 해", "축의금 정산보다 어려운 건 앞으로 둘의 저녁 시간표 짜기예요."]],
  baby: [["새벽 3시의 해", "수유와 기저귀 사이에 투잡을 한 당신, 이미 전설이에요."], ["가족이 한 명 늘어난 해", "시간은 줄었는데 일할 이유는 늘었어요."]],
  burnHit: [["번아웃이 문을 두드린 해", "열심히 산 증거지만, 몸은 영수증을 꼭 청구해요. 내년엔 쉬는 것도 일정에 넣어요."], ["방전의 해", "배터리 0%에서 버틴 한 해. 충전기는 '쉬기' 버튼에 있어요."]],
  burnNear: [["번아웃 직전, 아슬아슬", "멘탈 게이지가 바닥을 찍고 왔어요. 내년엔 퇴근 후에 '아무것도 안 하기'도 해 봐요."], ["버티기 장인의 해", "쓰러지기 직전까지 갔다 왔어요. 버틴 건 대단한데, 다음엔 덜 버텨도 돼요."]],
  crash: [["계좌가 파랗게 질린 해", "시장이 흔들렸고, 계좌도 같이 흔들렸어요. 안 판 사람만 반등을 만나요."], ["존버의 해", "평가손실은 아직 손실이 아니라고 스스로를 달랜 해 ㅎㅎ"], ["수업료 비싼 한 해", "시장 선생님 수업은 늘 비싸요. 대신 잊히지 않아요."]],
  invBoom: [["돈이 일한 해", "내가 잘 때도 계좌는 야근했어요. 복리가 처음으로 얼굴을 보여 준 해."], ["계좌가 효자인 해", "올해 최고 직원은 내 투자 계좌였습니다."]],
  firstBlack: [["투잡 첫 흑자!", "드디어 빨간 숫자가 검은 숫자로. 작아도 이건 진짜 사업이에요."], ["손익분기점을 넘은 해", "적자 터널 끝에 불빛이 보였어요. 여기서부터가 진짜 시작이에요."]],
  promo: [["명함이 바뀐 해", "승진 축하해요! 본업도 챙기면서 투잡까지, 이건 시간 관리의 승리예요."], ["회사에서도 인정받은 해", "투잡 하느라 회사 소홀하단 말, 올해는 못 하게 됐어요 ㅎㅎ"]],
  gradeS: [["올해의 에이스", "평가 S. 팀장님이 이름을 기억하기 시작했어요."]],
  gradeLow: [["회사 눈치가 매서웠던 해", "평가가 아쉬웠어요. 투잡도 좋지만 본업은 월급의 원천이에요. 선퇴사 금지!"], ["팀장님과 서먹했던 해", "본업 점수가 떨어지면 투잡도 흔들려요. 내년엔 회사 일도 한 칸 더."]],
  loss: [["적자의 해", "투잡 통장이 마이너스. 그래도 배운 건 다 플러스예요… 라고 믿고 싶은 해 ㅎㅎ"], ["수업료 낸 해", "사업은 돈 내고 배우는 학교라는 걸 몸으로 배웠어요."], ["버틴 것도 실력인 해", "적자에도 문을 닫지 않았어요. 내년엔 숫자로 보답받길."]],
  fireJump: [["파이어에 한 걸음 성큼", "목표까지 거리가 확 줄었어요. 지도에 깃발이 보이기 시작합니다."], ["순자산 그래프가 웃은 해", "우상향이라는 말, 올해는 내 이야기였어요."]],
  nwDown: [["뒷걸음질도 걸음인 해", "순자산이 줄었어요. 넘어진 김에 쉬어 가되, 내년엔 다시 일어나요."], ["지갑이 다이어트한 해", "돈이 빠진 만큼 경험이 쪘다고 해 두죠 ㅎㅎ"]],
  grind: [["티 안 나게 쌓은 해", "큰 사건은 없었지만, 이런 해가 모여 파이어가 돼요."], ["성실함이 이자처럼 붙는 해", "반복되는 작은 일도 멋진 일이에요. 올해 당신처럼요."], ["조용히 강해진 해", "아무도 몰라도 통장은 알아요. 한 칸씩 올라왔어요."]],
  companyOnly: [["월급만으로 버틴 해", "회사 하나로 한 해를 지켰어요. 퇴근 후 3시간, 내년엔 뭘 해 볼까요?"], ["칼퇴는 했는데…", "저녁이 비어 있었어요. 그 시간이 제일 큰 자산이라는 거, 알고 계시죠?"]],
  start: [["시작이 반인 해", "첫해는 원래 다 서툴러요. 서툴게라도 시작한 사람이 이깁니다."]],
  default: [["한 해 수고 많았어요", "회사도, 퇴근 후도, 오늘까지 버틴 나도. 다 잘했어요."], ["그래도 앞으로 간 해", "크게 티 나진 않아도 1년치 내가 쌓였어요."]],
};
const ORDER = ["fired", "quit", "full3", "full2", "full15", "full1", "married", "baby", "burnHit", "firstBlack", "crash", "promo", "burnNear", "invBoom", "loss", "gradeS", "gradeLow", "fireJump", "nwDown", "companyOnly", "start", "grind", "default"];
export const LINE_COUNT = Object.values(LINES).reduce((a, v) => a + v.length, 0);

// 광고 자리 대신 보여 줄 '투잡연구소 팁'(나중에 광고 SDK 를 꽂으면 ui.js yearAdSlot 이 이걸 대신한다)
export const YEAR_TIPS = [
  "연말엔 올해 투잡 이익을 연봉과 나란히 적어 보세요. 1배를 두 해 연속 넘기면 진지하게 이야기할 때예요.",
  "비상금은 생활비 6개월치. 사직서보다 통장이 먼저예요.",
  "종합소득세는 5월. 영수증은 12월에 미리 모아 두면 5월의 내가 고마워해요.",
  "평가 시즌엔 회사 일 먼저. 겸업이 들키는 건 대개 성과가 떨어질 때예요.",
  "투잡이 잘될수록 쉬는 날을 달력에 먼저 적어요. 번아웃은 잘나갈 때 와요.",
  "같은 투잡 두 개보다 서로 돕는 투잡 두 개. 시너지가 시간을 벌어 줘요.",
  "투자는 버티는 사람이 이겨요. 폭락장에 판 사람만 손실이 확정돼요.",
  "환승 이직처럼 환승 퇴사. 수입이 생긴 다음에 나와도 늦지 않아요.",
];

const sum = (a, f) => a.reduce((x, y) => x + (+f(y) || 0), 0);

// 해 시작 기준점(순자산·파이어·번아웃 수). 새 판 첫 달과 결산 직후에 잡는다
export function yearMark(s) { s.yr0 = { nw: Math.round(netWorth(s)), fire: +fireInfo(s).ratio.toFixed(3), burn: s.burnouts || 0, t: s.t, year: s.year }; }

// 올해 숫자 모으기(12월 hist 를 넣은 뒤, s.t 를 올리기 전에 부른다)
export function yearData(s) {
  const y0 = s.yr0 || { nw: s.hist[0]?.nw ?? Math.round(netWorth(s)), fire: s.hist[0]?.fire ?? 0, burn: 0, t: Math.max(0, s.t - 11), year: s.year };
  const H = s.hist.filter((h) => h.t >= y0.t && h.t > s.t - 12 && h.t <= s.t);
  const work = !(s.co.quit || s.co.fired), annual = work ? salary(s) * 12 : 0;
  const side = Math.round(sum(H, (h) => h.side)), salSum = Math.round(sum(H, (h) => h.sal)), inv = Math.round(sum(H, (h) => h.inv)), bon = Math.round(sum(H, (h) => h.bon));
  const fi = fireInfo(s), nw = Math.round(netWorth(s));
  const capNet = Math.max(0, Math.round((s.capY || 0) * YE_CAPK)); // 11-27 올해 가게를 여는 데 들어간 돈(넘기고 돌려받은 돈은 뺌)
  const x = annual > 0 ? (side - capNet) / annual : 0; // 본잡 전환 신호는 개업에 들어간 돈을 빼고 본다(파티룸을 옮겨 다니는 사람이 운영 이익만 보고 퇴사했다가 무너졌다)
  const prevSide = sum(s.hist.filter((h) => h.t < y0.t), (h) => h.side);
  const yt = (t) => t != null && t >= y0.t && t <= s.t; // 11-24 null(결혼한 적 없음)이 첫해(y0.t = 0)에 "올해 있었던 일"로 잡히던 버그: null >= 0 이 참이라 '둘이 된 해'가 떴다
  const mon = (t) => ((s.cal - 1 - (s.t - t)) % 12 + 12) % 12 + 1; // t 가 몇 월이었나
  const moments = D.MOMENTS.filter((m) => yt(s.moments?.[m.key])).map((m) => ({ t: s.moments[m.key], text: m.title, p: 0 }));
  const KEY = /승진|본잡|오픈|개업|출간|퇴사|사직|이직|결혼|태어|연인|첫 |호점|합격|계약|엔딩|파이어|해고|퇴임|매각|양도|폐업|특전 카드/;
  const logs = (s.log || []).filter((l) => yt(l.t) && !/숨은 특성/.test(l.text) && (["love", "life", "end", "good"].includes(l.kind) || KEY.test(l.text))).map((l) => ({ t: l.t, text: l.text, p: ["love", "life", "end"].includes(l.kind) ? 1 : /특전 카드/.test(l.text) ? 3 : 2 }));
  const seen = new Set(), hi = [...moments, ...logs].sort((a, b) => a.p - b.p).filter((h) => !seen.has(h.text) && seen.add(h.text)).slice(0, 3).sort((a, b) => a.t - b.t).map((h) => `${mon(h.t)}월 · ${h.text}`);
  const past = (s.yearLog || []).slice(-4).reverse();
  const ev = s.co.lastEval && s.co.lastEval.year === s.year ? s.co.lastEval : null;
  const minMental = H.length ? Math.min(...H.map((h) => h.mental ?? 100)) : 100;
  const quitThisYear = yt(s.moments?.quit) || (s.co.quit && (s.log || []).some((l) => yt(l.t) && /퇴사|사직|본잡으로/.test(l.text)));
  const firedThisYear = s.co.fired && (s.log || []).some((l) => yt(l.t) && /해고|퇴임|구조조정/.test(l.text));
  return {
    year: s.year, months: H.length, work, annual, salSum, bon, side, x: +x.toFixed(2), inv, nw0: y0.nw, nw, fire0: y0.fire, fire: +fi.ratio.toFixed(3), target: fi.target,
    past, hasJob: (s.sj?.active || []).length > 0, firstBlack: side > 0 && prevSide <= 0 && s.hist.some((h) => h.t < y0.t && h.side < 0), hi, ev,
    married: yt(s.fam.marriedT), baby: s.fam.kids.some((k) => yt(k.born)), burnHit: (s.burnouts || 0) > (y0.burn || 0), minMental,
    quit: !!quitThisYear, fired: !!firedThisYear, age: Math.floor(s.age), first: s.t - y0.t < 12 && y0.t <= 0,
    hl: (() => { try { return HL.yearLine(s, y0.t); } catch (e) { return ""; } })(), // 11-25 올해 인생 사건이 있었던 가까운 사람 한 줄
  };
}

function lineKey(d, s) {
  const invBase = Math.max(1, s.invest - d.inv);
  const ok = {
    fired: d.fired, quit: d.quit, full3: d.work && d.x >= 3, full2: d.work && d.x >= 2, full15: d.work && d.x >= 1.5, full1: d.work && d.x >= 1,
    married: d.married, baby: d.baby, burnHit: d.burnHit, firstBlack: d.hasJob && d.firstBlack, crash: d.inv < 0 && -d.inv > Math.max(800, invBase * 0.12),
    promo: !!d.ev?.promo, burnNear: d.minMental < 25, invBoom: d.inv > Math.max(1500, invBase * 0.15), loss: d.hasJob && d.side < 0,
    gradeS: d.ev?.g === "S", gradeLow: d.ev && "CD".includes(d.ev.g), fireJump: d.fire - d.fire0 >= 0.08, nwDown: d.nw < d.nw0 - 300,
    companyOnly: d.work && !d.hasJob, start: d.first, grind: d.hasJob && d.side > 0, default: true,
  };
  return ORDER.find((k) => ok[k]);
}
function pickLine(s, r, key) {
  const pool = LINES[key] || LINES.default, used = (s.yrUsed = s.yrUsed || []);
  let i = pool.findIndex((_, j) => !used.includes(key + j));
  if (i < 0) i = 0; else { const free = pool.map((_, j) => j).filter((j) => !used.includes(key + j)); i = free[Math.floor(r.next() * free.length)]; }
  used.push(key + i); if (used.length > 15) used.shift();
  return { key, head: pool[i][0], sub: pool[i][1] };
}

// 본잡 신호. 오를 때만 묻는다(같은 단계 반복 없음)
function fullSignal(s, d) {
  if (!d.work || !d.hasJob || d.annual <= 0) return null;
  const tu = !!D.TU2_ON && !FULL_STEPS.some((v) => d.x >= v) && [...s.sj.active].includes("tutoring") && TU.fullAskOk(s); // 11-28 과외: 연봉을 못 넘어도 본업 조건을 다 채우면 신호(거절하면 2년 뒤 다시)
  const step = tu ? 1 : FULL_STEPS.filter((v) => d.x >= v).pop();
  if (!step || (!tu && step <= (s.fullAsk || 0))) return null;
  const ty = tu ? TU.fullYear(s) : null;
  const job = tu ? "tutoring" : [...s.sj.active].sort((a, b) => jobYear(s, b) - jobYear(s, a))[0], jn = D.SIDEJOBS[job]?.n || "투잡";
  const need = Math.round(monthlySpend(s) * 6), have = Math.round(s.cash + s.invest);
  return { step, job, jn, need, have, tu, ty, emer: have >= need, next: FULL_STEPS.find((v) => v > step) || null };
}
const SIG = {
  1: { lv: "soft", head: "가능성이 보여요", body: (f, d) => `올해 투잡 이익이 연봉을 넘었어요(${d.x.toFixed(1)}배). 한 해 반짝일 수도 있으니 1년 더 지켜보는 것도 방법이에요. 그래도 마음이 정해졌다면, ${jo(f.jn, "을", "를")} 본잡으로?`, yes: (f) => `${jo(f.jn, "을", "를")} 본잡으로 해 본다`, no: "아직은 병행한다" },
  1.5: { lv: "strong", head: "이제 진지하게 고민할 때", body: (f, d) => `연봉의 ${d.x.toFixed(1)}배. 퇴근 후 몇 시간이 회사 1년보다 커졌어요. 회사에 쓰는 시간을 ${f.jn}에 쓰면 더 클 수도 있어요. 본잡 전환을 강하게 추천해요.`, yes: (f) => `${jo(f.jn, "을", "를")} 본잡으로! 사직서를 낸다`, no: "한 해만 더 병행한다" },
  2: { lv: "go", head: "나와라!", body: (f, d) => `연봉의 ${d.x.toFixed(1)}배예요. 이 정도면 회사가 오히려 ${jo(f.jn, "을", "를")} 막고 있어요. 계산기가 외칩니다. 나와라!`, yes: () => "사직서 던진다!", no: "그래도 회사에 남는다" },
  3: { lv: "go", head: "아직도 회사에?", body: (f, d) => `연봉의 ${d.x.toFixed(1)}배. 팀장님 연봉보다 퇴근 후 수입이 더 커요. 이제 정말 나올 때예요.`, yes: () => "이번엔 진짜 나간다!", no: "그래도 남는다(?)" },
};

export function yearScene(s, r) {
  const d = yearData(s);
  const line = pickLine(s, r, lineKey(d, s));
  const tip = YEAR_TIPS[Math.floor(r.next() * YEAR_TIPS.length)];
  const f = fullSignal(s, d);
  s.yearX = d.work && d.hasJob ? d.x : 0; s.yearXT = s.t; s.capY = 0; // 해가 바뀌면 개업 투자금 집계를 비운다
  (s.yearLog = s.yearLog || []).push({ y: d.year, x: d.work ? d.x : 0, q: !d.work ? 1 : 0, side: d.side, nw: d.nw, line: line.head }); if (s.yearLog.length > 40) s.yearLog.shift();
  const sc = { kind: "year", tag: "연말 결산", title: `${d.year}년 결산`, year: d, line, tip,
    text: `${d.year}년 결산. 「${line.head}」 투잡 이익 ${won(d.side)}${d.work && d.annual ? `(연봉의 ${d.x.toFixed(1)}배)` : ""}, 순자산 ${won(d.nw0)} → ${won(d.nw)}.`,
    choices: [{ t: "다음 해로", eff: {}, text: "" }] };
  if (f) {
    const g = SIG[f.step];
    if (f.tu) TU.fullAskMark(s); else { s.fullAsk = f.step; s.fullAskT = s.t; } s._fullJob = f.job; // 11-28 과외 신호는 공통 s.fullAsk 를 올리지 않는다(나중에 연봉을 넘겼을 때의 신호가 막히지 않게)
    sc.full = { ...f, lv: g.lv, head: f.tu ? "본업 조건을 다 채웠어요" : g.head, body: f.tu ? `화상과외의 '본업으로 가려면' 조건을 다 채웠어요. 최근 1년 과외 순이익은 ${won(f.ty.sum)}으로 연봉의 ${f.ty.pct}%예요. 본업이 되면 낮 타임 · 종합반 · 조교 반이 열리고 월급은 끊겨요. 자리는 모집 채널을 넓혀야 차요.` : g.body(f, d) };
    sc.onChoose = "full_ev";
    sc.choices = [
      { t: g.yes(f), eff: {}, text: `사직서를 냈다. 마지막 달까지 인수인계는 깔끔하게. 내일부터 출근지는 ${jo(f.jn, "이다", "다")}. 행동력 +5, 월급은 끊긴다.` },
      { t: g.no, eff: { mental: 2 }, text: `조금 더 다니며 모으기로 했다. ${f.tu ? "조건을 계속 채우고 있으면 2년 뒤 결산에서 다시 이야기해요." : f.next ? `내년 결산에서 연봉의 ${f.next}배를 넘으면 다시 이야기해요.` : "언제든 퇴사 버튼은 회사 화면에 있어요."}` },
    ];
  }
  try { sc.cards = yearOffer(s, r, d); } catch (e) { console.warn("[연말 카드]", e); } // 3장 중 1장(화면은 결산 뒤 cards_ui.js)
  yearMark(s); s.yr0.t = s.t + 1; s.yr0.year = s.year + 1; // 다음 해 기준점
  return sc;
}
