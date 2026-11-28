// After 6PM v4 · 인생 엔진 (턴 = 1달, 행동은 즉시 반영, 행동력은 체력에서 나온다)
import { makeRng, hashStr } from "./rng.js";
import * as RD from "./round.js"; // 회차 구조(11-26: 만 5년 결산에서 갈림길)
import * as D from "./defs.js";
import { CHARS, SCENES, JOBEV } from "../gen/data.js";
import * as GEN from "../gen/data.js";
import * as XR from "./extras.js"; // 11-24 주변 사람(조연)·겹치는 역할 사건·닉네임 이야기
import * as HL from "./heroine.js"; // 11-25 히로인·히어로 이야기(인생 시계·장면·갈림길·재회)
import * as LOVE from "./love.js"; // 11-24 두근두근·연애 행동·까톡·기념일·조력자 사건 // CONFESS(인물별 고백 장면 글, 11-24)는 없을 수도 있다
import * as SPO from "./spouse.js"; // 11-25 배우자의 일과 수입(연봉표·승진·육아휴직·그만둘까)
import * as WED from "./wed.js"; // 11-25 결혼 성향·상대가 먼저 꺼내는 결혼 얘기·비혼 네 명
import * as PR from "./pr.js";
import * as CS from "./cs.js";
import * as SJ from "./sj.js";
import * as INS from "./insta.js";
import * as SYN from "./syn.js";
import * as BIG from "./big.js";
import * as AB from "./abnb.js";
import * as UC from "./ucafe.js";
import * as REG from "./reg.js"; // 새 투잡 플러그인 등록표(engine/jobs/)
import * as UND from "./und.js"; // 11-28 업의 이해도 공통 틀(달마다 쌓기, 스위치 UND_ON)
import { yearScene, yearMark } from "./yearend.js"; // 연말 결산(v4.24)
import { famMonth, FAM_CHOOSE } from "./famev.js"; // 가족 이벤트(v4.25)
import { affMonth, AFF_CHOOSE, affDate } from "./affair.js"; // 바람(v4.25)
import { menteeMonth, MT_CHOOSE } from "./mentee.js"; // 컨설팅 제자(v4.25)
import { guestMonth, GS_CHOOSE } from "./guest.js"; // 손님 이벤트(v4.25)
import { flirtMonth } from "./flirt.js"; // 연애·결혼 19금(v4.25)
import { rivalMonth, RV_CHOOSE } from "./rival.js"; // 라이벌 제도(v4.25)
import { marketMonth, MK_CHOOSE } from "./market.js"; import { waveMonth, WV_CHOOSE } from "./wave.js";
import { PW_CHOOSE } from "./prwave.js";
import { CHB_CHOOSE } from "./jobs/chbrand.js"; /* 판이 바뀐다(11-23) */ import { spaceMonth } from "./space.js"; // 시장 충격(v4.25b)
import { jackpotMonth, JP_CHOOSE } from "./jackpot.js"; import { mentorMonth, MS_CHOOSE, afterAct as msAfterAct, msFix } from "./mentor.js"; import { hiddenMonth, HD_CHOOSE } from "./hidden.js"; import { hidden2Month, H2_CHOOSE } from "./hidden2.js"; // 다른 방식의 히든 길(v4.30) // 스승·선배·히든 길(v4.29) // 한방 전략(v4.27): 컨설팅·타로·웹소설 큰 판 제안과 결과
import * as GC from "./cards.js"; // 성장 카드·아이템 60개(v4.25)
import * as IT from "./items.js";
import { caughtScene } from "./caught.js"; // 겸업 발각: 투잡마다 다른 경위(11-23)

export const CHAR = Object.fromEntries(CHARS.map((c) => [c.id, c]));
const FIRST = GEN.FIRST || {}; // 처음 말 걸 때의 반응(인물별, 11-24)
const RT = GEN.ROLE_TALK || {}, WALL = GEN.WALL || {}; // 11-24 인물 관계: 회사 사람 역할 말투·업무 밖 말(data/role_talk.json) / 사수 첫 장면·진입장벽·사수 대시·사수의 귀띔(data/wall.json)
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const R = (s) => makeRng(s.rs);
export const won = (m) => { // 만원 → 보기 좋은 글
  const neg = m < 0; m = Math.abs(Math.round(m));
  const eok = Math.floor(m / 10000), man = m % 10000;
  const t = eok ? `${eok}억${man ? " " + man.toLocaleString() + "만" : ""}` : `${man.toLocaleString()}만`;
  return (neg ? "−" : "") + t;
};

// 받침에 맞는 조사: jo("민지", "과", "와") → "민지와"
export function jo(w, a, b) { w = String(w ?? ""); let k = w.length - 1; while (k > 0 && ")]'\"’”」』".includes(w[k])) k--; // 11-23 닫는 괄호·따옴표로 끝나면 그 앞 글자로 조사를 고른다("…선생님)를" → "…선생님)을")
  const ch = w.charCodeAt(k); if (ch >= 48 && ch <= 57) { const d = ch - 48, bat = [0, 1, 3, 6, 7, 8].includes(d); if (a === "으로") return w + (bat && ![1, 7, 8].includes(d) ? "으로" : "로"); return w + (bat ? a : b); } // 숫자로 끝나면 읽는 소리(영·일·삼·육·칠·팔은 받침)
  if (ch < 0xac00 || ch > 0xd7a3) return w + b; const f = (ch - 0xac00) % 28; if (a === "으로") return w + (f && f !== 8 ? "으로" : "로"); return w + (f ? a : b); }
// ───────── 성향 효과 읽기 ─────────
// 내가 가진 카드: 성향 카드 + 특전 카드
export function cardsOf(s) { return [...s.me.traits, ...(s.me.perks || [])].map(D.CARD).filter(Boolean); }
export function mod(s, key, def = 1) {
  let v = def;
  for (const t of [...cardsOf(s), ...GC.extraMods(s)]) { // 성향·특전 + 아이템·세트·성장 카드
    for (const mm of [t.m, ...(t.hid || []).map((h) => h.m)]) {
      if (mm[key] === undefined) continue;
      const m = mm[key];
      if (typeof m === "number") v = def === 0 ? v + m : v * m; else v = m;
    }
  }
  return v;
}
// 숨은 특성 공개: d = "co" 또는 투잡 id. 새로 공개된 문장 목록을 돌려준다
export function reveal(s, d) {
  s.me.revealed = s.me.revealed || {};
  if (s.me.revealed[d] !== undefined) return [];
  s.me.revealed[d] = s.t;
  const out = [];
  for (const id of s.me.traits) { const t = D.TRAITS.find((x) => x.id === id); for (const h of t?.hid || []) if (h.d === d) out.push(`${t.n}: ${h.t}`); }
  if (out.length) log(s, `숨은 특성 공개 · ${out.join(" / ")}`, "life");
  return out;
}
export const MAXST = D.STAT_MAX;
// 시작 능력치 룰렛
export function rollStats(rnd = Math.random, yr = 1) {
  const b = D.AGE_YR[yr]?.roll || 0; // 2·3년 차는 룰렛에서 능력치를 더 받는다
  const o = {}; for (const k of D.STAT_KEYS) { const [lo, hi] = k === "body" ? D.ROLL.body : [D.ROLL.min, D.ROLL.max]; o[k] = Math.round(lo + rnd() * (hi - lo) + b * (0.6 + rnd() * 0.8)); }
  return o;
}
// 전공·회사·직무가 주는 능력치 변화. fit: 1 잘 맞음, 0 보통, -1 안 맞음
export function jobFit(major, job) { const j = D.JOBS[job], m = D.MAJORS[major]; if (!j || !m) return 0; if (j.ok.includes(major)) return 1; if (j.bad.includes(m.g)) return -1; return 0; }
export function startStats(base, o) {
  const st = { ...base }, add = (obj, f = 1) => { for (const [k, v] of Object.entries(obj || {})) st[k] = (st[k] || 0) + Math.round(v * f); };
  if (o.major) add(D.MAJORS[o.major]?.stat);
  if (o.company) add(D.COMPANY_TYPES[o.company]?.stat);
  if (o.job) { const f = jobFit(o.major, o.job); add(D.JOBS[o.job]?.stat, f > 0 ? 1.5 : f < 0 ? 0.5 : 1); if (f < 0) st.career -= 3; }
  for (const id of o.traits || []) { const t = D.TRAITS.find((x) => x.id === id); add(t?.m.stat); }
  for (const k of D.STAT_KEYS) st[k] = clamp(st[k] || 0, 1, D.STAT_MAX);
  return st;
}
export function syncSta(s) { s.hpMax = D.staMax(s.st.body ?? 30); if (s.hp > s.hpMax) s.hp = s.hpMax; }
const growMult = (s, k) => [...cardsOf(s), ...GC.extraMods(s)].reduce((a, t) => a * ((t.m.growMult || {})[k] || 1), 1) * (s.youth || 1); // youth: 젊을수록 빨리 배운다(안 보이는 혜택)

// ───────── 새 인생 ─────────
export const INV_OPEN = { t: 12, seed: 5000 }; // 투자 해금: 1년 차 이후 + 모은 돈 5,000만
export function investOpenScene(s) { return story("투자가 열렸다", `통장에 ${won(Math.round(s.cash))}이 모였다. 은행 앱이 먼저 알아봤다. "고객님, 투자 상품을 둘러보세요." 이제 '나' 화면의 투자·대출 칸에서 ETF에 돈을 넣고 뺄 수 있어요. 넣어 둔 돈은 해마다 평균 4%쯤 불어나지만, 시장이 꺾이면 줄기도 해요. 가끔 솔깃한 투자 제안도 찾아와요. 여섯 달 치 생활비는 현금으로 남겨 두세요.`); }
export const investOpen = (s) => !!s.flags?.invOpen || s.invest > 0 || (!s.rd && s.t >= INV_OPEN.t);
export const START_BOND = { army: 35, club: 30, univ: 32 }; // 시작 인맥의 첫 호감
export const BOND_N = { army: "군대 동기", club: "동아리 친구", univ: "대학 친구" };
export const SASU_AFF = 20; // 11-24 사수는 첫날부터 아는 사이(시작 인맥보다 낮게)
// 11-26 갈림길: 이어 간다. 결산으로 멈춘 판을 다시 굴리고 잠긴 것을 연다(회차 수는 그대로)
export function forkContinue(s, traitId) { if (!RD.atFork(s)) return false; s.r5 = { grade: s.grade, nw: Math.round(netWorth(s)), t: s.t }; delete s.grade; s.ended = null; s.rdCont = true; delete s.fkT; log(s, "이 인생을 이어 가기로 했다. 잠겨 있던 것들이 열렸다.", "good"); if (traitId) addTrait(s, traitId); monthStart(s); /* 11-26 버그: 결산 달에는 달 시작을 건너뛰어, 이어 간 첫 달이 지난달 행동력·장부 그대로였다 */ return true; }
export function forkBack(s, pick) { if (!RD.atFork(s)) return false; s.forkBack = pick || {}; return true; } // 돌아간다: 고른 보상·기억을 적어 두고 결말 화면으로
// 게임 도중에 특성 하나를 얻는다(이어 가기 보상). 시작 능력치 보너스도 지금 더한다
export function addTrait(s, id) { const t = D.TRAITS.find((x) => x.id === id); if (!t || s.me.traits.includes(id)) return false; s.me.traits.push(id); for (const [k, v] of Object.entries(t.m?.stat || {})) if (s.st[k] != null) s.st[k] = clamp(s.st[k] + v, 0, D.STAT_MAX); for (const h of t.hid || []) if (h.d === "co" || s.sj.active.includes(h.d)) s.me.revealed[h.d] = s.me.revealed[h.d] ?? s.t; traitLate(s, t); log(s, `특성을 얻었다: ${t.n}`, "good"); return true; }
// 새 게임을 만들 때 한 번만 읽는 특성 값(오픈채팅 시작 인원)을, 특성을 나중에 얻었을 때도 넣는다
function traitLate(s, t) { const k = (t.hid || []).reduce((a, h) => Math.max(a, h.m?.kakaoStart || 0), t.m?.kakaoStart || 0); if (k && s.cs?.ch?.kakao) s.cs.ch.kakao.m = Math.max(s.cs.ch.kakao.m || 0, k); }
// 고백하지 못한 사람(이어 간 직후 한 줄)
export function forkCrush(s) { const L = Object.entries(s.rel || {}).filter(([id, x]) => x.aff >= 70 && !x.lover && !x.spouse && heartOpen(s, id)).sort((a, b) => b[1].aff - a[1].aff); return L[0] ? L[0][0] : null; }
export const startMono = XR.startMono, nthLife = XR.nthLife; // 회차 시작 독백 · "두 번째" 같은 말
export const sasuOf = (s) => s?.flags?.sasu || "c102"; // 이번 판의 사수. 옛 저장에는 칸이 없다 → 윤가람
export function newGame(o) {
  const seed = String(o.seed || Date.now()); // 11-25 숫자 씨앗도 글자로 바꾼다(hashStr 는 글자 수만큼 도는데 숫자에는 길이가 없어 판이 전부 같게 나왔다)
  const s = {
    v: 4, rd: 1, seed, rs: { v: hashStr(seed) }, t: 0, startAge: RD.RD.start, age: RD.RD.start, /* 11-23 남녀 모두 27세 시작 */ cal: 3, year: 2027,
    me: { name: o.name || "나", gender: o.gender || "M", look: o.look || null, major: o.major || "biz", job: o.job || "plan", fit: 0, traits: [...(o.traits || [])], perks: [], revealed: {} },
    st: {}, items: {},
    hp: 85, hpMax: 100, mental: 70, ap: 0, apMax: 0, apNext: 0,
    cash: 1200, loans: [], invest: 0,
    co: { type: o.company || "mid", name: o.companyName || "", rank: 0, yrsRank: 1, years: 1, perf: 50, eye: 0, warns: 0, quit: false, fired: false, discipline: 0, leave: 0, boss: 50, payIdx: 1, pts: 0, grades: [], remote: 0, evT: -99 },
    house: { type: "oneroom", dep: 1000, rent: 55, value: 0, loan: 0 },
    fam: { spouse: null, spouseType: null, happy: 70, kids: [], parents: 100, lastVisit: 0, pregnant: null, marriedT: null, lowHappy: 0 },
    rel: {}, cast: [], spot: {},
    pr: PR.init(), cs: CS.init(), sj: SJ.init(), hb: SJ.hbInit(), ins: INS.init(), grad: null, pi: 1, piX: 1, big: BIG.init(), fame: 0, ab: AB.init(), uc: UC.init(),
    flags: {}, seen: {}, log: [], news: "", hist: [], sideStreak: 0, burnouts: 0, burnLeft: 0, over: null, ended: false,
    buff: { cafe: 0, cowork: 0 }, month: null, sceneQ: [], pending: null, era: {}, eraPlan: [], toasts: [],
    stat: { actions: 0, scenes: 0, met: 0 }, taxBase: 0, lastYearSide: 0, debtLate: 0,
  };
  for (const P of REG.JOBS) s[P.key] = P.init(s); // 플러그인 투잡 상태(s.<key>)
  s.sx = {}; for (const X of REG.STORY) s.sx[X.key] = X.init(s); // 기존 투잡 이야기 보강 상태(s.sx.<key>)
  if (o.quest) s.flags.quest = true; // 11-24 초반 퀘스트(1회차 새 게임)
  const r = R(s);
  // 능력치: 룰렛(base) + 전공 + 회사 + 직무 + 성향
  if (!D.MAJORS[s.me.major]) s.me.major = "biz";
  if (!D.JOBS[s.me.job] || !D.JOBS[s.me.job].co.includes(D.COMPANY_TYPES[s.co.type].kind)) s.me.job = Object.keys(D.JOBS).find((k) => D.JOBS[k].co.includes(D.COMPANY_TYPES[s.co.type].kind));
  s.me.fit = jobFit(s.me.major, s.me.job);
  // 나이: 27세 1년 차, 28세 2년 차, 29세 3년 차
  const yr = 1; // 11-23 남녀 모두 같은 능력치·자산으로 시작. 여자는 회사 2년 차(아래), 남자는 군대·동아리 친구
  // 지난 인생에서 가져온 카드 1장(성향이면 성향 3장, 특전이면 특전으로)
  if (o.carry && D.CARD(o.carry) && !s.me.traits.includes(o.carry)) { if (D.TRAITS.some((t) => t.id === o.carry)) s.me.traits.push(o.carry); else s.me.perks.push(o.carry); s.me.carried = o.carry; }
  s.youth = D.AGE_YR[yr].youth; if (D.AGE_YR[yr].perk) s.me.perks.push(D.AGE_YR[yr].perk);
  s.st = startStats(o.base || rollStats(() => r.next(), yr), { major: s.me.major, company: s.co.type, job: s.me.job, traits: s.me.traits });
  if (yr > 1) { s.co.years = yr; s.co.yrsRank = yr; s.cash = 1200 + (yr - 1) * 550; s.st.career += (yr - 1) * 4; s.co.payIdx = Math.pow(1.02, yr - 1); s.co.pts = yr - 1; }
  if (s.me.gender === "F") { s.co.years = 2; s.co.yrsRank = 2; s.co.pts = 1; s.me.story = "loan"; } // 여자: 학자금을 27세에 다 갚았다. 회사는 2년 다녔고 자산은 남자와 같다
  if (!s.co.name) s.co.name = r.pick(D.COMPANY_TYPES[s.co.type].names);
  if (mod(s, "kakaoStart", 0)) s.cs.ch.kakao.m = mod(s, "kakaoStart", 0);
  syncSta(s); s.hp = Math.round(s.hpMax * 0.9);
  // 연구 기록 보너스(메타)
  if (o.meta?.bonusCash) s.cash += o.meta.bonusCash;
  // 이번 판에 등장하는 인연: 100명 중 70명 (로그라이크)
  // 11-24 사수: 판마다 이성 사수 한 명(남자 주인공 = 윤가람, 여자 주인공 = 곽지헌). only 칸이 주인공 성별과 다른 인물은 이번 판에 안 나온다
  s.flags.sasu = CHARS.find((c) => c.rank === "sasu" && c.only === s.me.gender)?.id || "c102"; s.flags.rel2 = 0; s.flags.sasuFirst = -1; // rel2: 친분 마크 규칙으로 시작한 판(옛 저장 채우기를 안 한다) · sasuFirst −1: 사수 첫 장면을 아직 안 봤다
  const inPlay = (c) => !!c && (!c.only || c.only === s.me.gender);
  const pool = CHARS.filter((c) => !c.celeb && !c.mentor && inPlay(c)).map((c) => c.id); // 유명인(인별)은 인별에서 만난다
  s.cast = r.shuffle(pool.filter((id) => !CHAR[id]?.co)).slice(0, Math.min(pool.length, Math.max(12, Math.round(pool.length * 0.7))));
  HL.castIn(s, inPlay); // 11-25 히로인·히어로 열 명은 매 판 꼭 나온다(무작위로 뽑힌 맨 뒤 사람과 자리를 바꾼다)
  s.cast.push(...CHARS.filter((c) => c.co && inPlay(c)).map((c) => c.id)); // 회사 동료(신입은 입사 사건 뒤에 나온다)
  if (CHAR[s.flags.sasu]) { const x = ensureRel(s, s.flags.sasu); x.aff = Math.max(x.aff, SASU_AFF); } // 사수는 첫날부터 아는 사이(호감 20). 일반 '첫 만남' 장면 대신 사수 첫 장면이 뜬다
  if (s.me.perks.includes("yr3") || s.me.gender === "F") for (const id of r.shuffle(CHARS.filter((c) => c.co && !c.hire && inPlay(c) && c.id !== s.flags.sasu).map((c) => c.id)).slice(0, 2)) { const x = ensureRel(s, id); x.aff = Math.max(x.aff, 25); } // 3년 차: 사내 인맥(사수는 따로 20을 받으니 뺀다)
  // 11-24 시작 인맥: 남자는 군대 동기 3·동아리 친구 2, 여자는 사내 인맥 2(위)·대학 친구 2·동아리 친구 1. 이번 판 등장 인물 중 또래에서 고른다
  { const used = new Set(Object.keys(s.rel)), plain = (c) => c && !c.co && !c.hire && !c.senior && !c.group && c.age >= 25 && c.age <= 30 && !/우리 회사|우리 팀/.test(c.job || "") && !HL.noBond(c.id);
    const hb = typeof process !== "undefined" && process.env?.NOBOND ? {} : HL.bondIn(s, used), left = (n, k) => Math.max(0, n - (hb[k] || 0)); // 11-25 재회형(동아리 선후배)을 먼저 배정하고 그만큼 무작위 자리를 줄인다
    const take = (n, bond, aff, ok) => { for (const id of r.shuffle(s.cast.filter((id) => !used.has(id) && plain(CHAR[id]) && ok(CHAR[id]))).slice(0, n)) { used.add(id); const x = ensureRel(s, id); x.aff = Math.max(x.aff, aff); x.bond = bond; } };
    if (typeof process !== "undefined" && process.env?.NOBOND) { /* 봇 시험용: 시작 인맥 끔 */ } else if (s.me.gender === "F") { take(2, "univ", START_BOND.univ, () => true); take(left(1, "club"), "club", START_BOND.club, () => true); }
    else { take(3, "army", START_BOND.army, (c) => c.gender === "M" && !isForeign(c)); take(left(2, "club"), "club", START_BOND.club, () => true); } }
  // N회차(회귀): 지난 인생의 선물
  const ng = o.ng || {};
  s.ng = { n: Math.max(1, ng.n || 1), hard: !!ng.hard, gifts: ng.gifts || [], past: ng.past || [], hl: ng.hl || {}, wvGone: ng.wvGone || [] }; if (ng.und && Object.keys(ng.und).length) s.ng.und = ng.und; // 11-25 wvGone: 지난 판들에 간 판 변화 길(3회차 특전은 안 가 본 길에만) // hl: 지난 회차의 히로인 결말·본 사건(heroine.js ngIn) // past: 지난 인생 히든 길 기록(v4.30 회차의 길)
  if (ng.cash) s.cash += ng.cash;
  for (const j of ng.know || []) if (D.SIDEJOBS[j]) { SJ.found(s, j, "지난 인생의 기억"); s.sj.know[j] = (s.sj.know[j] || 0) + 10; }
  for (const id of ng.friends || []) if (inPlay(CHAR[id])) { if (!s.cast.includes(id)) s.cast.push(id); const x = ensureRel(s, id); x.aff = Math.max(x.aff, 30); x.deja = true; }
  if (ng.statUp) for (const k of Object.keys(s.st)) s.st[k] = Math.min(D.STAT_MAX, s.st[k] + ng.statUp);
  if (ng.stat3) for (const k of ng.stat3.keys || []) if (s.st[k] != null) s.st[k] = Math.min(D.STAT_MAX, s.st[k] + (ng.stat3.v || 0)); // 11-26 갈림길 보상: 몸에 밴 능력치 셋
  if (ng.trait && D.TRAITS.some((t) => t.id === ng.trait) && !s.me.traits.includes(ng.trait)) { s.me.traits.push(ng.trait); const tm = D.TRAITS.find((t) => t.id === ng.trait).m?.stat || {}; for (const [k, v] of Object.entries(tm)) if (s.st[k] != null) s.st[k] = Math.min(D.STAT_MAX, s.st[k] + v); s.me.r5Trait = ng.trait; traitLate(s, D.TRAITS.find((t) => t.id === ng.trait)); } // 갈림길 보상: 특성 하나
  if (ng.r5) s.ng.r5 = ng.r5; // 갈림길에서 들고 온 것(시작 연출에 씀)
  // 처음 관심: 커리어가 높으면 컨설팅, 숫자가 높으면 파티룸이 눈에 들어온다
  s.sj.int.cs = Math.round(s.st.career * 0.6); s.sj.int.pr = Math.round(s.st.num * 0.4);
  // 부모님(고정 인물 아님)
  s.fam.parents = 100 - r.int(0, 8);
  // 시대 사건 계획: 판마다 다른 순서·시기
  const eras = SCENES.filter((x) => x.id.startsWith("era") || x.track === "시대");
  const picks = r.shuffle(eras).slice(0, Math.min(eras.length, 7));
  let tt = r.int(10, 24);
  s.eraPlan = picks.map((e) => { const o2 = { t: tt, id: e.id }; tt += r.int(20, 40); return o2; });
  if (s.ng.n > 1) log(s, `${s.ng.n}회차 인생. ${s.ng.hard ? "어려움 모드: 평가가 짜고 목표가 25% 높다. " : ""}${XR.startMono(s.ng.n)}`, "good");
  log(s, `${s.age}세 3월. ${s.co.name} ${D.JOBS[s.me.job].n} ${s.co.years}년 차. 오늘부터 퇴근 후 인생을 산다.`);
  s.moments = {}; fillState(s); // 버그 10: 불러오기와 같은 채우기(새 판은 '이미 지난 순간' 표시 없이 빈 기록으로 시작)
  monthStart(s);
  return s;
}

// 화면에 보이는 나이(11-24): 해가 바뀌면 한 살 오른다. 전에는 입사 달(3월)에만 올라 2028년 1·2월에 27세로 보였다.
// 엔진 판정(결산·체력·명퇴 등)은 그대로 s.age(달 단위)를 쓴다. 화면·기록에만 이 값을 쓴다.
export const ageNow = (s) => Math.floor((s.startAge ?? 27) + 1e-9) + Math.floor(((((s.cal - 1 - s.t) % 12) + 12) % 12 + s.t) / 12);
export function log(s, text, kind = "") { s.log.unshift({ t: s.t, age: ageNow(s), cal: s.cal, text, kind }); if (s.log.length > 300) s.log.length = 300; }
function toast(s, text) { s.toasts.push(text); }

// ───────── 행동력 ─────────
export function kidsAp(s) { return s.fam.kids.reduce((a, k) => { const y = (s.t - k.born) / 12; return a + (y < 1 ? 3 : y < 7 ? 2 : y < 13 ? 1 : 0); }, 0); }
// 배우자 손 보태기(v4.25): 아이 없으면 +2(동업형 +3). 7살 미만 아이가 있으면 반, 돌 전이면 0. 반대하는 동안은 −1
export function spouseAp(s) {
  if (!s.fam.spouse) return 0;
  if (HL.isAway(s, s.fam.spouse)) return 0; // 11-25 주말부부: 멀리 있는 동안은 손을 못 보탠다
  if ((s.fam.opposeUntil ?? -1) > s.t) return -1;
  let a = s.fam.spouseType === "동업형" ? 3 : 2;
  if (s.fam.kids.some((k) => s.t - k.born < 12)) a = 0; else if (s.fam.kids.some((k) => s.t - k.born < 84)) a = Math.floor(a / 2);
  a += SPO.quitAp(s); // 11-25 일을 그만둔 배우자는 손을 더 보탠다
  return a;
}
// 아이 보며 힘내기(v4.25): 아이 1명당 +1(최대 2), 지난달·이번 달 가족과 시간을 보냈으면 +1
export function kidMotiveAp(s) { const n = s.fam.kids.length; if (!n) return 0; return Math.min(2, n) + ((s.flags.familyThisMonth ?? -9) >= s.t - 1 ? 1 : 0); }
export function calcApMax(s) {
  let ap = 4 + Math.floor(s.hp / 13) + Math.floor((s.st.body || 0) / 50);
  if (!s.co.quit && !s.co.fired) { ap += D.RANKS[s.co.rank].ap; if (s.co.remote > 0) ap -= 1; } else ap += 5;
  ap += mod(s, "apBonus", 0);
  ap -= kidsAp(s);
  if (s.grad && !s.grad.done) ap -= 1; // 대학원 수업
  if (s.fam.parents < 45 && s.fam.parents > 0) ap -= 1;
  if (s.mental < 25) ap -= 2;
  ap += spouseAp(s) + kidMotiveAp(s) + (s.h2?.ap || 0); // v4.30 다른 방식 히든 길(부부 사업 +1·사내 TF −1)
  ap += s.apNext;
  if (s.burnLeft > 0) ap = Math.floor(ap * 0.5);
  return Math.max(3, ap);
}

// ── 달마다 느낌표(11-24): 장소마다 '이번 달에만' 할 수 있는 일이 8~10개 뜬다. 하나에 행동력 1. 다 할 수는 없어서 골라야 한다. 달이 바뀌면 사라진다.
// 난수는 엔진 난수(s.rs)와 따로 쓴다(봇 측정 숫자가 흔들리지 않게).
// 11-25 회사 느낌표: 회사 종류마다 달에 뜨는 개수(co)가 다르고, 그 종류에만 뜨는 고유 느낌표(자료의 bang: true + when.co)가 섞인다(own = 회사 칸 하나가 고유 느낌표일 확률). 전체 개수(n)는 그대로.
export const BANG = { n: [8, 10], ap: 1, perRg: 3, fresh: 10, co: { big: [2, 3], fin: [2, 3], mid: [1, 2], public: [1, 2], startup: [1, 2] }, own: 0.55 };
// 회사 종류에 맞는 장소 목록(11-25). company 동네의 spots(모든 종류를 합친 목록) 대신 이것을 읽는다. spotLocked: 직급이 모자라 잠긴 곳(대기업 임원층)
export const companySpots = (s) => D.coSpots(s?.co?.type);
export const spotLocked = (s, sp) => sp.lockRank !== undefined && (s.co.rank || 0) < sp.lockRank;
const coOpenSpots = (s) => companySpots(s).filter((sp) => !spotLocked(s, sp));
// 회식(11-25): 회식이 뜬 달에만 s.co.party = { t, k, title, done }. partyOn = 이번 달 회식이 아직 남아 있다
export const partyOn = (s) => !!(s.co.party && s.co.party.t === s.t && !s.co.party.done && !(s.co.quit || s.co.fired));
const NOPARTY = typeof process !== "undefined" && !!process.env?.NOPARTY; // 봇 시험용: 회식 달 끔(회식 규칙을 넣기 전과 견줄 때)
function setParty(s) { const co = s.co, p = !NOPARTY && !(co.quit || co.fired) && s.t >= D.CO_PARTY.from ? D.coParty(co.type, s.cal) : null; if (p) { co.party = { t: s.t, k: p.k, title: p.n }; toast(s, `이번 달 ${p.n}! 지도의 회사 앞에 모여요(빠지면 팀장 호감 −${-D.CO_PARTY.miss})`); } else delete co.party; }
const BOSS_ID = CHARS.find((c) => c.co && c.rank === "boss")?.id;
function partyGather(s) { // 회식 달: 팀장·사수와 이번 달 회사에 나온 사람들이 회사 앞에 모인다(난수 안 씀)
  if (!partyOn(s)) return;
  const co = new Set(D.CO_SPOT_IDS), here = Object.entries(s.spot).filter(([k]) => co.has(k)).flatMap(([, ids]) => ids);
  const team = [...new Set([BOSS_ID, sasuOf(s), ...here])].filter((id) => id && CHAR[id] && s.cast.includes(id) && !s.rel[id]?.spouse && !(CHAR[id].hire && !(s.co.hired || []).includes(id))).slice(0, 5);
  for (const k of Object.keys(s.spot)) s.spot[k] = s.spot[k].filter((id) => !team.includes(id));
  s.spot.dinner = team;
}
// 지금 회사에 없는 회사 장소(회식이 끝난 회사 앞, 이직 전 회사의 장소, 옛 저장의 pantry·dinner)에 선 사람과 느낌표를 있는 장소로 옮긴다(난수 안 씀)
export function fixCoSpots(s) {
  if (s.co.quit || s.co.fired) { for (const k of D.CO_SPOT_IDS) if (s.spot?.[k]) delete s.spot[k]; return; } // 11-25 회사를 나온 달: 회사 장소에 서 있던 사람을 치운다
  const L = coOpenSpots(s), ok = new Set(L.map((sp) => sp.id)), all = new Set(D.CO_SPOT_IDS); if (!L.length) return; if (partyOn(s)) ok.add("dinner");
  let i = 0; for (const k of Object.keys(s.spot || {})) { if (!all.has(k) || ok.has(k)) continue; for (const id of s.spot[k] || []) { const sp = L[i++ % L.length]; (s.spot[sp.id] = s.spot[sp.id] || []).push(id); } delete s.spot[k]; }
  if (!partyOn(s)) s.bangs = (s.bangs || []).filter((b) => !b.party);
  s.bangs = (s.bangs || []).filter((b) => { if (b.rg !== "company" || b.party) return true; const w = SCENES.find((x) => x.id === b.sc)?.when; return !(w?.co && ![].concat(w.co).includes(s.co.type)); }); // 이직한 달: 전 회사 종류의 고유 느낌표는 지운다
  for (const b of s.bangs) if (b.rg === "company" && !b.party && !ok.has(b.sp)) { b.sp = L[0].id; b.spN = L[0].n; }
}
function rollBangs(s) {
  let h = hashStr(String(s.seed) + ":bang:" + s.t); const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) | 0; return ((h >>> 0) % 100000) / 100000; }, pick = (L) => L[Math.floor(rnd() * L.length)];
  const spots = D.REGIONS.filter((rg) => rg.id !== "company" && !(rg.unlock && !rg.unlock(s))).flatMap((rg) => rg.spots.map((sp) => ({ rg: rg.id, sp })));
  const coSp = s.co.quit || s.co.fired ? [] : coOpenSpots(s);
  const n = BANG.n[0] + Math.floor(rnd() * (BANG.n[1] - BANG.n[0] + 1)), used = new Set(), out = [];
  const fresh = (x) => !used.has(x.id) && (s.seen[x.id] === undefined || s.t - s.seen[x.id] >= BANG.fresh), ok = (x) => { try { return sceneOk(s, x); } catch (e) { return false; } };
  const plain = (sp) => SCENES.filter((x) => (x.where === sp.loc || x.where === "any") && !x.bang && !x.mate && !/\{[가-힣]+\}/.test(x.text || "") && fresh(x) && ok(x));
  const add = (rg, sp, sc) => { used.add(sc.id); out.push({ id: `b${s.t}_${out.length}`, rg, sp: sp.id, spN: sp.n, sc: sc.id, title: sc.title }); };
  if (coSp.length) { // 회사: 종류별 개수. 회식이 뜬 달은 그중 하나가 회식(행동력 2)
    const [lo, hi] = BANG.co[s.co.type] || [1, 2]; let left = lo + Math.floor(rnd() * (hi - lo + 1));
    if (partyOn(s)) { out.push({ id: `b${s.t}_party`, rg: "company", sp: "dinner", spN: D.CO_PARTY_SPOT.n, party: 1, ap: D.CO_PARTY.ap, title: `팀 회식 · ${s.co.party.title}` }); left--;
      // 11-25 맵 시안 ②: 회식 달에는 성숲길 2차(회식에 다녀와야 열림)와 집에서 기다리는 사람(연인·배우자가 있을 때)이 같이 떠서 어디로 갈지 고른다
      if (SCENES.some((x) => x.id === "party_2cha")) out.push({ id: `b${s.t}_2cha`, rg: "hot", sp: "rooftop", spN: "성숲길 · 2차", sc: "party_2cha", title: "2차 · 회식 끝나고", after: "party" });
      if (Object.values(s.rel || {}).some((x) => x.lover || x.spouse) && SCENES.some((x) => x.id === "party_wait")) out.push({ id: `b${s.t}_wait`, rg: "town", sp: "home", spN: "우리 집", sc: "party_wait", title: "기다리는 사람" }); }
    for (let k = 0; k < 40 && left > 0; k++) {
      const mine = SCENES.filter((x) => x.bang && x.where === "office" && fresh(x) && ok(x)); // 이 회사 종류의 고유 느낌표(sceneOk 가 when.co 를 본다)
      if (mine.length && rnd() < BANG.own) { const sc = pick(mine), sp = [].concat(sc.at || []).map((id) => coSp.find((x) => x.id === id)).find(Boolean) || pick(coSp); add("company", sp, sc); left--; continue; }
      const sp = pick(coSp), L = plain(sp), own = L.filter((x) => x.where === sp.loc), sc = own.length && rnd() < 0.7 ? pick(own) : L.length ? pick(L) : null; if (!sc) continue;
      add("company", sp, sc); left--;
    }
  }
  for (let k = 0; k < 120 && out.length < n; k++) {
    const { rg, sp } = pick(spots); if (out.filter((b) => b.rg === rg).length >= BANG.perRg) continue;
    const L = plain(sp), own = L.filter((x) => x.where === sp.loc), sc = own.length && rnd() < 0.7 ? pick(own) : L.length ? pick(L) : null; if (!sc) continue;
    add(rg, sp, sc);
  }
  if (out.length < n) { // 11-25 모자란 달(퇴사 뒤·인생 후반에 0~5개만 뜨던 것): 그 장소의 장면은 쉬는 기간(BANG.fresh) 없이 다시 쓴다
    const again = (sp) => SCENES.filter((x) => (x.where === sp.loc || x.where === "any") && !x.bang && !x.mate && !/\{[가-힣]+\}/.test(x.text || "") && !used.has(x.id) && ok(x)); // 11-25 장소 장면이 바닥난 달은 어디서나 뜨는 장면(any)도 쓴다(스타트업 21달째 5개만 뜨던 것)
    for (let k = 0; k < 120 && out.length < n; k++) { const { rg, sp } = pick(spots); if (out.filter((b) => b.rg === rg).length >= BANG.perRg) continue; const L = again(sp); if (L.length) add(rg, sp, pick(L)); }
  }
  s.bangs = out;
}
export function doBang(s, bid) {
  const b = (s.bangs || []).find((x) => x.id === bid); if (!b) return { ok: false, msg: "이미 지나간 일이에요" };
  if (b.rg === "company" && (s.co.quit || s.co.fired)) { s.bangs = s.bangs.filter((x) => x.rg !== "company"); return { ok: false, msg: "회사를 그만뒀어요" }; } // 11-25 달 중간에 회사를 나왔으면 회사 느낌표는 지나간 일
  if (b.party) { const res = act(s, "company_dinner"); if (res.ok) s.stat.bangs = (s.stat.bangs || 0) + 1; return res; } // 11-25 회식: '회식 참석' 행동 그대로(행동력 2). 느낌표 지우기·사람들 돌려보내기는 ACT_FN.company_dinner
  if (b.after === "party" && !s.co.party?.done) return { ok: false, msg: "회식에 가야 2차도 가요" }; // 11-25 2차는 회식 다녀온 뒤
  if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" }; if (s.ap < BANG.ap) return { ok: false, msg: "행동력이 부족해요" };
  const sc = SCENES.find((x) => x.id === b.sc); s.bangs = s.bangs.filter((x) => x !== b); if (!sc) return { ok: false, msg: "이미 지나간 일이에요" };
  s.ap -= BANG.ap; s.seen[sc.id] = s.t; s.stat.bangs = (s.stat.bangs || 0) + 1;
  const lines = [], here = (s.spot?.[b.sp] || []).filter((id) => CHAR[id] && !s.rel[id]?.spouse);
  if (here.length) { const id = here.find((x) => !s.rel[x]) || here.slice().sort((p, q) => (s.rel[p]?.aff || 0) - (s.rel[q]?.aff || 0))[0], isNew = !s.rel[id]; const x = ensureRel(s, id); x.last = s.t; const g = addAff(s, id, isNew ? 4 : 2); lines.push(isNew ? `거기 있던 ${jo(CHAR[id].name, "과", "와")} 인사를 나눴다 · 새 인연(행동력 0)` : `${CHAR[id].name}도 거기 있었다 · 호감 +${g}`); }
  return { ok: true, scene: openScene(s, sc), lines };
}
const SPOT_LOCS = new Set(Object.values(D.SPOTS).flatMap((sp) => [sp.loc, sp.alt]).filter(Boolean));
function refreshSpots(s) {
  const r = R(s);
  s.spot = {};
  for (const id of s.cast) {
    const c = CHAR[id]; if (!c) continue;
    const rel = s.rel[id];
    if (rel?.spouse) continue; // 배우자는 집에 있다
    if (HL.isHidden(s, id)) continue; // 11-25 멀리 떠난 사람은 지도에 안 나온다
    if (c.hire && !(s.co.hired || []).includes(id)) continue; // 아직 입사 전
    if (!r.chance(rel?.lover ? 0.85 : 0.62)) continue;
    const HG = HL.hangs(s, id) || c.hangouts;
    const loc = r.pick(HG.filter((h) => SPOT_LOCS.has(h)).length ? HG.filter((h) => SPOT_LOCS.has(h)) : HG); // 11-24 지도에 없는 장소(club)를 뽑아 그 달에 안 나오던 것 고침
    if (loc === "office" && (s.co.quit || s.co.fired)) continue; // 11-25 퇴사·해고 뒤에는 회사 장소에 사람을 세우지 않는다(그달에 다른 곳에서도 못 만나던 것은 다음 달 뽑기에서 풀린다)
    const cands = loc === "office" ? coOpenSpots(s) : Object.values(D.SPOTS).filter((sp) => sp.loc === loc || sp.alt === loc); // 11-25 회사는 지금 회사 종류의 장소에만
    if (!cands.length) continue;
    const sp = r.pick(cands);
    (s.spot[sp.id] = s.spot[sp.id] || []).push(id);
  }
}

export function monthStart(s) {
  s.apNext = s.apNext || 0;
  syncSta(s);
  s.apMax = calcApMax(s); s.apNext = 0;
  s.ap = s.apMax;
  s.buff = { cafe: 0, cowork: 0 };
  s.month = { inc: {}, exp: {}, notes: [] };
  s.co.workDone = 0; s.co.crunchM = 0;
  if (!s.co.quit && !s.co.fired && s.co.rank >= 1 && R(s).chance(0.08 + 0.05 * s.co.rank)) { s.co.crunchM = 1; toast(s, "이번 달은 마감 주간! 회사 일 +1"); }
  refreshSpots(s);
  setParty(s); // 11-25 회식이 뜨는 달인지(느낌표를 뽑기 전에 정한다)
  try { rollBangs(s); } catch (e) { console.warn(e); s.bangs = []; } // 11-24 이번 달에만 뜨는 느낌표
  SJ.refresh(s, R(s));
  try { partyGather(s); } catch (e) { console.warn(e); } // 11-25 회식 달이면 팀 사람들이 회사 앞에 모인다
  PR.monthStart(s);
  if (SJ.isActive(s, "cs")) CS.monthStart(s, R(s)); else { s.cs.leads = 0; s.cs.monthRev = 0; s.cs.newThisMonth = 0; }
  for (const P of REG.JOBS) if (P.monthStart && SJ.isActive(s, P.key)) P.monthStart(s, R(s));
  s.news = makeNews(s);
}

// ───────── 행동 ─────────
const SIDE_ACTS0 = /^(pr_|cs_|in_|ab_|uc_)/;
const SIDE_ACTS = { test: (id) => SIDE_ACTS0.test(id) || REG.isPlugAct(id) }; // 기존 5개 + 플러그인 접두사
const jobOf = (id) => REG.byAct(id)?.key || (id.startsWith("pr_") ? "pr" : id.startsWith("cs_") ? "cs" : id.startsWith("ab_") ? "airbnb" : id.startsWith("uc_") ? "ucafe" : "insta");
// 11-25 고르는 행동(공부 등)을 고르기 전에도 행동력·스태미너·돈은 본다(대표 지적: 행동력 0인데 공부 칸만 불이 켜져 있었다)
export function canActBase(s, id) {
  const a = D.ACTIONS[id]; if (!a) return "없는 행동이에요";
  if (s.over || s.ended) return "이미 끝난 인생이에요";
  if (s.pending) return "장면을 먼저 끝내세요";
  const ap = apCost(s, id);
  if (s.ap < ap) return `행동력이 모자라요(${ap} 필요)`;
  const hp = hpCost(s, id);
  if (hp > 0 && s.hp - hp < 1) return "스태미너가 바닥났어요. 쉬거나 다음 달로";
  if (a.cash && s.cash + a.cash < -creditRoom(s)) return "돈이 모자라요";
  if (a.need && !a.need(s)) return "지금은 할 수 없어요";
  return null;
}
export function canAct(s, id, arg) {
  { const w = canActBase(s, id); if (w) return w; }
  if (SIDE_ACTS.test(id)) { const job = jobOf(id); if (!SJ.isActive(s, job)) return `${jo(D.SIDEJOBS[job].n, "을", "를")} 먼저 시작하세요(투잡 탐색)`; }
  if (id === "grad_apply" && s.grad && !s.grad.done) return "이미 대학원에 다니고 있어요";
  if (id === "grad_apply" && s.grad?.done) return "이미 졸업했어요";
  if (id === "grad_class" && !(s.grad && !s.grad.done)) return "대학원에 다니지 않아요";
  if (D.STUDY_ACTS.includes(id) && arg !== undefined && (!D.STATS[arg] || !studyK(arg))) return `${jo(D.STATS[arg] || "그 능력치", "은", "는")} 공부로 안 올라요(운동·꾸미기·사람)`; // v4.28 생활형
  if (/^(sj_|hb_)/.test(id)) { const why = SJ.can(s, id, arg); if (why) return why; }
  if (["co_lunch", "co_project", "co_resume"].includes(id) && (s.co.quit || s.co.fired)) return "회사를 그만뒀어요";
  { const P = REG.byAct(id); if (P) { const why = P.can ? P.can(s, id, arg) : null; if (why) return why; } }
  if (SIDE_ACTS0.test(id)) { const j = jobOf(id); const why = j === "pr" ? PR.can(s, id, arg) : j === "cs" ? CS.can(s, id, arg) : j === "airbnb" ? AB.can(s, id, arg) : j === "ucafe" ? UC.can(s, id, arg) : INS.can(s, id, arg); if (why) return why; }
  if (/^bg_/.test(id)) { const why = BIG.can(s, id, arg); if (why) return why; }
  if (["work_hard", "overtime", "office_chat", "company_dinner"].includes(id) && (s.co.quit || s.co.fired)) return "회사를 그만뒀어요";
  if (id === "company_dinner" && !partyOn(s)) return s.co.party?.t === s.t ? "이번 달 회식은 다녀왔어요" : "이번 달은 회식이 없어요"; // 11-25 회식은 회식이 뜬 달에만
  if (id === "rejob" && !(s.co.quit || s.co.fired)) return "이미 회사에 다녀요";
  return null;
}
export function apCost(s, id) { const a = D.ACTIONS[id]; let ap = a.ap; if (id === "cs_seminar" || id === "cs_lecture") ap = a.ap; if (id === "in_post") ap = INS.postAp(s); return ap; }
// 팀장 호감이 오를 때: 성향 숨은 특성 bossMult(인싸 1.4·새벽형 1.2·명강사 1.2·가정적 0.8)
const bossUp = (s, v) => Math.max(1, Math.round(v * mod(s, "bossMult", 1)));
export function hpCost(s, id) {
  const a = D.ACTIONS[id]; let h = id === "in_post" ? INS.postHp(s) : a.hp || 0; if (h <= 0) return h;
  h *= mod(s, "hpCostMult", 1);
  if (SIDE_ACTS.test(id)) h += mod(s, "sideHp", 0);
  if (["cs_blog", "cs_insta", "cs_youtube"].includes(id)) h += mod(s, "contentHp", 0);
  if (["cs_seminar", "cs_lecture"].includes(id)) h += mod(s, "lectureHp", 0);
  if (/^wn_/.test(id)) h += mod(s, "wnHp", 0);
  if (/^uc_/.test(id)) h += mod(s, "ucHp", 0);
  if (s.age > 40) h *= 1 + (s.age - 40) * 0.02;
  return Math.round(h);
}

// 효과 적용 (장면 선택지·행동 공용)
export function applyEff(s, eff, who) {
  if (!eff) return [];
  const out = [];
  const r = R(s);
  if (eff.cash) { s.cash += eff.cash; addMoney(s, eff.cash > 0 ? "inc" : "exp", eff.cashAs || "그 밖의 일", Math.abs(eff.cash)); /* cashAs: 가계부에 적을 이름(버닝 이벤트 등) */ out.push(`돈 ${eff.cash > 0 ? "+" : ""}${won(eff.cash)}`); }
  if (eff.hp) { s.hp = clamp(s.hp + eff.hp, 0, s.hpMax); out.push(`스태미너 ${sgn(eff.hp)}`); }
  if (eff.mental) { s.mental = clamp(s.mental + eff.mental, 0, 100); out.push(`멘탈 ${sgn(eff.mental)}`); }
  if (eff.eye) { const e = eff.eye > 0 ? eff.eye * eyeMult(s) : eff.eye; s.co.eye = clamp(s.co.eye + e, 0, 100); out.push(`회사 눈치 ${sgn(Math.round(e))}`); }
  if (eff.boss && !(s.co.quit || s.co.fired)) { const b = eff.boss > 0 ? bossUp(s, eff.boss) : eff.boss; s.co.boss = clamp(s.co.boss + b, 0, 100); out.push(`팀장 호감 ${sgn(b)}`); } // 11-25 회사 느낌표용
  if (eff.family) { s.fam.happy = clamp(s.fam.happy + eff.family, 0, 100); out.push(`가족 ${sgn(eff.family)}`); }
  if (eff.stat) for (const [k, v] of Object.entries(eff.stat)) { if (!s.st[k] && s.st[k] !== 0) continue; const g = v > 0 ? gainStat(s, k, v, curSrc || "ev") : (s.st[k] = clamp(s.st[k] + v, 0, statCap(s)), v); if (k === "body") syncSta(s); out.push(`${D.STATS[k]} ${sgn(+g.toFixed(1))}`); } // v4.28: 장면 능력치도 곡선을 거친다
  if (eff.statRaw) for (const [k, v] of Object.entries(eff.statRaw)) { if (s.st[k] === undefined) continue; s.st[k] = clamp(s.st[k] + v, 0, statCap(s)); if (k === "body") syncSta(s); out.push(`${D.STATS[k]} ${sgn(v)}`); } // 바로 +N(곡선 없음)
  if (eff.brk) for (const k of [].concat(eff.brk)) { const l = giveBrk(s, k); if (l) out.push(l); } // 돌파 계기
  if (eff.ap) { s.apNext += eff.ap; out.push(`다음 달 행동력 ${sgn(eff.ap)}`); }
  if (eff.fame) { s.fame = Math.max(0, (s.fame || 0) + eff.fame); out.push(`명성 ${sgn(eff.fame)}`); }
  if (eff.boost) { const bd = eff.boost.mine ? null : who && CHAR[who]?.helper?.board, js = (s.sj?.active || []).filter((j) => (bd === "partyroom" ? j === "pr" : bd === "consult" ? j === "cs" : true)), V = (s.mk = s.mk || { evT: -99, seen: {}, list: [] }); for (const j of js) V.list.push({ id: "hev_" + s.t + j, job: j, v: eff.boost.pct, until: s.t + eff.boost.months, n: "인연의 도움" }); if (js.length) out.push(`${js.map((j) => D.SIDEJOBS[j]?.n || j).join("·")} 수입 +${Math.round(eff.boost.pct * 100)}% · ${eff.boost.months}개월`); }
  if (eff.sj_int) for (const [j, v] of Object.entries(eff.sj_int)) { const l = SJ.addInt(s, j, v); if (l) out.push(l); }
  if (eff.pr_rating) { for (const rm of s.pr.rooms) rm.rating = clamp(rm.rating + eff.pr_rating, 2.5, 5); if (s.pr.rooms.length) out.push(`파티룸 별점 ${sgn(eff.pr_rating)}`); }
  if (eff.cs_rep) { s.cs.reviews = Math.max(0, s.cs.reviews + eff.cs_rep); if (s.cs.open) out.push(`컨설팅 후기 ${sgn(eff.cs_rep)}`); } // 컨설팅을 안 하면 줄을 안 보여 준다(값은 그대로 쌓임)
  for (const P of REG.JOBS) if (P.eff && s[P.key]) { try { P.eff(s, eff, out, who); } catch (e) { console.warn(e); } } // 플러그인 전용 효과 키(예: tr_rep)
  for (const X of REG.STORY) if (X.eff && s.sx?.[X.key]) { try { X.eff(s, eff, out, who); } catch (e) { console.warn(e); } } // 기존 투잡 이야기 전용 효과 키(예: prs_rep)
  if (eff.aff && !who) who = Object.keys(s.rel || {}).find((k) => s.rel[k].lover) || who; // 11-25 연인 장면(기념일·상견례·결혼 준비)은 who 가 없다. 그때는 연인에게 붙인다(전에는 호감 효과가 안 붙었다)
  if (eff.aff && who) { const g = addAff(s, who, eff.aff); out.push(`${CHAR[who]?.name || ""} 호감 ${sgn(g)}`); }
  if (eff.item) { const g = IT.grant(s, eff.item, "ev"); if (g.line) out.push(g.line); if (g.dup) out.push(...GC.addShard(s, r, 1)); } // 이벤트 보상 아이템(v4.25)
  if (eff.shard) out.push(...GC.addShard(s, r, eff.shard)); // 카드 조각
  if (eff.flag) {
    const noLove = eff.flag === "lover" && !!who && !!CHAR[who] && !isRomanceable(s, CHAR[who]); // 연애가 안 되는 조합(같은 성별 등, isRomanceable 과 같은 판정)은 연인이 되지 않는다
    if (noLove) { out.push(`${jo(CHAR[who].name, "과", "와")} 평생 가는 친구가 됐다`); log(s, `${jo(CHAR[who].name, "과", "와")} 평생 가는 친구가 됐다.`, "love"); }
    else s.flags[eff.flag] = s.t;
    if (who && eff.flag === "lover" && !noLove) becomeLover(s, who, out);
    if (eff.flag === "wedding_planned" && eff.cash < 0) s.flags.wedPaid = (s.flags.wedPaid || 0) - eff.cash; // 29번: 결혼 준비 견적에서 이미 낸 돈(프러포즈 예식비에서 뺀다)
    if (who && eff.flag === "helper_ok") { s.rel[who].helperOk = true; out.push("조력자로 부탁할 수 있음"); }
    if (eff.flag === "pregnant" && s.fam.spouse && s.fam.pregnant === null) { s.fam.pregnant = s.t + 9; out.push("아기가 생겼다"); }
    if (eff.flag === "house" && s.house.type !== "own") { // 장면에서 집을 샀다(계약금은 장면 돈 효과에 포함)
      const price = Math.round(housePrice(s, "apt") * 0.8 / 100) * 100;
      s.cash += s.house.dep || 0; const jl = s.loans.find((l) => l.n === "전세대출"); if (jl) { s.cash -= jl.amt; s.loans = s.loans.filter((l) => l !== jl); }
      addLoan(s, "주택담보대출", Math.round(price * 0.7), 0.042, true); s.house = { type: "own", dep: 0, rent: 0, value: price, kind: "apt" };
      out.push(`내 집 ${won(price)}`); log(s, `집을 샀다. ${won(price)}`, "life");
    }
  }
  return out;
}
const sgn = (x) => (x > 0 ? "+" : "") + (Math.round(x * 10) / 10);
export function eyeMult(s) { return D.COMPANY_TYPES[s.co.type].eye * mod(s, "eyeMult", 1) * (s.cs.nick === "real" ? 1.4 : 1) * (SYN.on(s, "real_face") ? 1.2 : 1); }
// 11-27 가게를 열 때 들어간 돈과 넘길 때 돌려받은 돈을 그해 동안 따로 센다(연말 결산의 본잡 전환 신호가 '운영 이익만' 보고 성급하게 "나와라"를 외치지 않게)
const CAP_OUT = new Set(["파티룸 개업 투자", "무인카페 오픈", "에어씨앤씨 오픈", "치킨 창업비", "무인카페 기계 교체", "무인카페 출입 인증기"]), CAP_IN = new Set(["지점 양도·보증금", "권리금 매각", "무인카페 양도", "보증금 회수", "치킨 양수도", "파티룸 엑시트"]); // 11-27 QA: 낼 때와 받을 때의 짝을 맞췄다(펫시팅도 같은 이름을 쓰지만 연말에 0 밑으로는 안 내려가 영향이 작다)
export function addMoney(s, side, k, v) { const m = s.month[side]; m[k] = (m[k] || 0) + v; if (side === "exp" && CAP_OUT.has(k)) s.capY = (s.capY || 0) + v; else if (side === "inc" && CAP_IN.has(k)) s.capY = (s.capY || 0) - v; }

export const GAIN_MIN = { side: 0.1, etc: 0.3 }; if (typeof process !== "undefined" && process.env?.GFB) GAIN_MIN.side = +process.env.GFB; // 아무 역량도 안 오른 행동에 주는 최소 성장(투잡 행동은 작게: 밸런스)
const GAIN_FALLBACK = [[/^pr_/, "num"], [/^cs_/, "write"], [/^in_/, "mkt"], [/^ab_/, "lang"], [/^uc_/, "num"], [/^tr_/, "talk"], [/^wn_/, "write"], [/^tu_/, "talk"], [/^ch_/, "hands"], [/^vb_/, "num"], [/^cl_/, "talk"], [/^(sj_|bg_|grad_)/, "career"], [/^hb_/, "charm"]];
export function act(s, id, arg) {
  const why = canAct(s, id, arg); if (why) return { ok: false, msg: why };
  const a = D.ACTIONS[id], r = R(s); curSrc = id;
  const st0 = { ...s.st }; // 11-24 역량이 얼마나 올랐는지 숫자로 보여 준다
  if (["work_hard", "overtime", "office_chat", "company_dinner", "co_lunch", "co_project"].includes(id)) s.flags.coActs = (s.flags.coActs || 0) + 1; // 탐색 가이드용
  s.ap -= apCost(s, id);
  const hc = hpCost(s, id);
  s.hp = clamp(s.hp - hc, 0, s.hpMax);
  if (a.mental) s.mental = clamp(s.mental + a.mental, 0, 100);
  if (a.cash) { s.cash += a.cash; addMoney(s, "exp", a.track === "일" ? "투잡 활동비" : "생활 활동비", -a.cash); }
  const aSt = a.stat ? Object.entries(a.stat).map(([k, v]) => v > 0 ? stL(s, k, v, id) : (gainStat(s, k, v, id), `${D.STATS[k]} ${v}`)) : []; // v4.28: 장소·회사 행동마다 오르는 능력치
  s.stat.actions++;
  if (id === "work_hard" || id === "overtime") s.co.workDone = (s.co.workDone || 0) + (id === "overtime" ? 2 : 1);
  let res = { ok: true, msg: "", lines: [] };
  if (id === "pr_setup") res = PR.act(s, r, id, arg, 1) || res; // 셀프 공사: 버프는 안 쓰고 공사만 진행(11-21 수정: 전에는 아무 일도 안 일어나 '공사 중'에 멈췄다)
  else if (SIDE_ACTS.test(id)) {
    const boost = (1 + (s.buff.cafe ? 0.3 : 0) + (s.buff.cowork ? 0.5 : 0)) * (s.mgBoost || 1); s.buff.cafe = 0; s.buff.cowork = 0; s.mgBoost = 0; // mgBoost: 미니게임 결과
    const j = jobOf(id), P = REG.byAct(id); res = (P ? P.act(s, r, id, arg, boost) : j === "pr" ? PR.act(s, r, id, arg, boost) : j === "cs" ? CS.act(s, r, id, arg, boost) : j === "airbnb" ? AB.act(s, r, id, arg, boost) : j === "ucafe" ? UC.act(s, r, id, arg, boost) : INS.act(s, r, id, arg, boost)) || res;
    if (s.fam.spouse === null && Object.values(s.rel).some((x) => x.lover)) s.mental = clamp(s.mental + mod(s, "loverSideMental", 0), 0, 100);
    SJ.onAct(s, id); // 초반 고생: 마케팅·후기·품질 행동 점수(sj.js)
  } else if (/^(sj_|hb_)/.test(id)) { res = SJ.act(s, r, id, arg) || res; msAfterAct(s, r, id, arg, res); } // 스승 만남·선배 2턴(mentor.js)
  else if (/^bg_/.test(id)) res = BIG.act(s, r, id, arg) || res;
  else if (ACT_FN[id]) res = ACT_FN[id](s, r, arg) || res;
  res.ok = true;
  // 장소 행동이면 가끔 장소 장면
  const spot = Object.values(D.SPOTS).find((sp) => sp.acts.includes(id));
  if (!res.scene && id === "visit_parents") { let vs = null; try { vs = XR.visitScene(s, r); } catch (e) { console.warn(e); } if (vs) res.scene = openScene(s, vs); } // 11-24 본가에 가면 부모님이 나온다
  if (!res.scene) { let pe = null; try { pe = XR.personEvent(s, r, id, arg); } catch (e) { console.warn(e); } if (pe) res.scene = openScene(s, pe); }
  if (!res.scene) { let hb = null; try { hb = HL.actBeat(s, id); } catch (e) { console.warn(e); } if (hb) res.scene = openScene(s, hb); }
  try { const gl = HL.goneLine(s, id); if (gl) (res.lines = res.lines || []).push(gl); } catch (e) { console.warn(e); } // 11-25 떠난 사람의 빈자리 한 줄 // 11-25 행동 뒤에 뜨는 히로인 장면(from: "act:<행동>")
  // 11-24 인물별 개인 사건: 그 사람의 취향과 이어진 행동을 하면 같이 하게 된다(뜨면 이번 행동의 장소 장면은 쉰다)
  if (!res.scene && spot && r.chance(0.22)) { const sc = pickLocScene(s, r, spot.loc); if (sc) res.scene = openScene(s, sc); }
  // 행동이 돌려준 장면(만남 등)은 여기서 연다
  if (res.scene && !s.pending) { if (res.scene.kind === "meet" && res.scene.who) ensureRel(s, res.scene.who); res.scene = openScene(s, res.scene); }
  { const src = ["work_hard", "overtime", "office_chat", "company_dinner", "co_lunch", "co_project"].includes(id) ? "co" : a.track === "사람" ? "people" : null; if (src) { const l = SJ.hearInfo(s, r, src); if (l) res.lines.push(l); } } // 곳곳에서 듣는 투잡 정보
  if (aSt.length) { res.lines = (res.lines || []).filter((l) => !/^[가-힣·]+ \+$/.test(l)); res.lines.push(...aSt); }
  { // 11-24 어떤 행동이든 역량 하나는 오른다 + 오른 만큼 숫자로 한 줄
    const diff = () => Object.keys(D.STATS).map((k) => [k, Math.round(((s.st[k] || 0) - (st0[k] || 0)) * 10) / 10]).filter(([, v]) => v >= 0.1);
    let up = diff();
    if (!up.length && (a.ap || 0) >= 1) { const k = GAIN_FALLBACK.find(([re]) => re.test(id))?.[1] || (a.track === "사람" ? "talk" : "sense"); gainStat(s, k, SIDE_ACTS.test(id) ? GAIN_MIN.side : GAIN_MIN.etc, id); up = diff(); }
    if (up.length) { const names = Object.values(D.STATS).join("|"), re = new RegExp(`^(${names}) \\+[\\d.]*$`); res.lines = (res.lines || []).filter((l) => !re.test(String(l).trim())); res.lines.push(`역량 ↑ ${up.map(([k, v]) => `${D.STATS[k]} +${v.toFixed(1)}`).join(" · ")}`); res.statUp = Object.fromEntries(up); s.gainMemo = s.gainMemo || {}; s.gainMemo[id] = Object.fromEntries(up.slice(0, 3)); }
  }
  curSrc = null;
  if (hc > 0) res.lines.unshift(`스태미너 −${hc}`);
  return res;
}

// v4.28 능력치 성장: 구간 곡선(defs STAT_CURVE) × 돌파 계기(s.brk) × 같은 길 반복(STAT_REP). src = 행동 id·출처 태그(없으면 지금 행동/장면)
let curSrc = null;
export const statZone = (v) => D.STAT_CURVE.find((z) => v < z.to) || D.STAT_CURVE[D.STAT_CURVE.length - 1];
export const brkOn = (s, k) => (s.brk?.[k] ?? -1) >= s.t;
export function giveBrk(s, k, why = "") { if (!D.STATS[k]) return ""; s.brk = s.brk || {}; s.brk[k] = Math.max(s.brk[k] ?? -1, s.t + D.STAT_BRK.months); return `${D.STATS[k]} 돌파 중 ${D.STAT_BRK.months}달${why ? ` (${why})` : ""}`; }
function repMult(s, k, src) {
  const H = (s.stH = s.stH || {}), h = (H[k] = H[k] || []);
  let cur = h[h.length - 1]; if (!cur || cur[0] !== s.t) { cur = [s.t, []]; h.push(cur); while (h.length > D.STAT_REP.months) h.shift(); }
  if (!cur[1].includes(src)) cur[1].push(src);
  const only = (t) => { const x = h.find((y) => y[0] === t); return x && x[1].length === 1 && x[1][0] === src; };
  for (let i = 1; i < D.STAT_REP.months; i++) if (!only(s.t - i)) return 1;
  return cur[1].length === 1 ? D.STAT_REP.mult : 1;
}
// 능력치 천장: 회차와 상관없이 200(11-23 결정, defs STAT_CAP0). 성장·아이템·카드·학위 모두 이 천장까지
export const statCap = (s) => Math.min(D.STAT_MAX, D.STAT_CAP0 + D.STAT_CAP_NG * Math.max(0, (s?.ng?.n || 1) - 1));
export function gainStat(s, k, base, src) {
  const cur = s.st[k]; if (cur === undefined || !base) return 0;
  if (base < 0) { s.st[k] = clamp(cur + base, 1, D.STAT_MAX); if (k === "body") syncSta(s); return s.st[k] - cur; }
  const z = statZone(cur), sr = src || curSrc || "etc", g = base * growMult(s, k) * (brkOn(s, k) ? z.b : z.m) * (D.STUDY_ACTS.includes(sr) ? (z.study ?? 1) : 1) * repMult(s, k, sr);
  const ngF = D.NG_GROW_T[Math.min(D.NG_GROW_T.length, s.ng?.n || 1) - 1]; // 회차 보너스: 어디선가 해 본 일
  const zi = D.STAT_CURVE.indexOf(z), cap = (D.STAT_MCAP?.[zi] ?? 99) * (brkOn(s, k) ? 2 : 1) * ngF, M = (s.stM && s.stM.t === s.t) ? s.stM : (s.stM = { t: s.t });
  const room = Math.max(0, cap - (M[k] || 0)); if (room <= 0) return 0; // 이번 달 이 능력치는 더 안 오른다(실전·공부 모두)
  const add = Math.min(room, Math.max(cur < 100 ? 0.15 : 0.01, g * ngF)); M[k] = (M[k] || 0) + add;
  s.st[k] = clamp(cur + add, 0, statCap(s));
  if (k === "body") syncSta(s);
  return s.st[k] - cur;
}
const stL = (s, k, v, src) => `${D.STATS[k]} +${gainStat(s, k, v, src).toFixed(1)}`;
const isForeign = (c) => /외국|교환학생|유학|원어민|해외|출신/.test(c?.job || ""); // 11-25 "캐나다 출신"·"몽골 출신"도 잡는다(리암·바트·란)
// 미니게임 성적: 대성공 +1 · 성공 +0.5(그 투잡의 경험형 능력치)
// 11-24 미니게임을 잘하면 같이 일하는 사람(그 투잡의 조력자, 없으면 가장 가까운 인연)의 믿음이 오른다
export function mgTrust(s, job) {
  const board = { pr: "partyroom", cs: "consult" }[job] || job;
  const ids = Object.entries(s.rel || {}).filter(([id, x]) => CHAR[id] && !x.spouse).sort((a, b) => (b[1].helper === board) - (a[1].helper === board) || (!!b[1].helper) - (!!a[1].helper) || b[1].aff - a[1].aff);
  if (!ids.length) return []; const [id, x] = ids[0], g = addAff(s, id, 4);
  return [`${CHAR[id].name}의 믿음 +${g}${x.helper ? " (같이 해낸 일)" : ""}`];
}
export function mgStat(s, job, grade) {
  const k = D.MG_STAT.of[job], v = grade === "대성공" ? D.MG_STAT.great : grade === "성공" ? D.MG_STAT.good : 0;
  return k && v ? [stL(s, k, v, "mg")] : [];
}
// 장면 고른 뒤: 장소 장면이면 그 장소 능력치, 선택지 글에 운동·연애·외국어 말이 있으면 그 능력치(장면 하나에 하나만 더)
function sceneStat(s, sc, ch, okv) {
  if (okv === false) return [];
  const out = [], t = (ch.t || "") + " " + (ch.text || ""), had = ch.eff?.stat || {};
  const w = D.STAT_WORDS.find(([k, re]) => !(had[k] < 0) && re.test(t));
  if (w) out.push(stL(s, w[0], D.STAT_WORD_GAIN, "sc"));
  else if (sc.where && D.LOC_STAT[sc.where] && /^loc_|^of_|^hb_/.test(sc.id || "")) { out.push(stL(s, D.LOC_STAT[sc.where], D.STAT_WORD_GAIN * 0.75, "loc")); const k2 = D.LOC_STAT2?.[sc.where]; if (k2 && k2 !== D.LOC_STAT[sc.where]) out.push(stL(s, k2, D.STAT_WORD_GAIN * 0.4, "loc")); } // 11-25 장소마다 두 번째 능력치(능력치 성장 개편 2-1)
  if (sc.who && isForeign(CHAR[sc.who])) out.push(stL(s, "lang", 0.5, "fr"));
  return out;
}

const studyK = (k) => D.STAT_KIND_N[D.STAT_KIND[k]]?.study ?? 1; // v4.28 갈래별 공부 효과
const ACT_FN = {
  rest(s) { const g = 10 * mod(s, "restMult", 1); s.hp = clamp(s.hp + g, 0, s.hpMax); return { lines: [`스태미너 +${Math.round(g + 10)} (다음 달 행동력 회복)`, "멘탈 +6"], msg: "이불 밖은 위험하다. 오늘은 충전." }; },
  study_home(s, r, k) { const g = gainStat(s, k, D.ACTIONS.study_home.gain * mod(s, "homeStudy", 1) * studyK(k)); s.mental = clamp(s.mental + mod(s, "soloMental", 0), 0, 100); return { lines: [`${D.STATS[k]} +${g.toFixed(1)}`], msg: "책상 앞 두 시간." }; },
  study(s, r, k) { const g = gainStat(s, k, D.ACTIONS.study.gain * studyK(k)); s.mental = clamp(s.mental + mod(s, "soloMental", 0), 0, 100); return { lines: [`${D.STATS[k]} +${g.toFixed(1)}`], msg: "스터디카페 3시간권을 끊었다." }; },
  course(s, r, k) { const g = gainStat(s, k, D.ACTIONS.course.gain * studyK(k)); return { lines: [`${D.STATS[k]} +${g.toFixed(1)}`, "돈 −15만"], msg: "강의 들으며 필기했다." }; },
  workout(s) { const g = gainStat(s, "body", s.age < 35 ? 2.2 : 2.8); return { lines: [`체력 +${g.toFixed(1)} (최대 스태미너 ${s.hpMax})`, "멘탈 +3"], msg: "땀 흘리니 머리가 맑아진다." }; },
  pt(s) { const g = gainStat(s, "body", 4); return { lines: [`체력 +${g.toFixed(1)} (최대 스태미너 ${s.hpMax})`], msg: "트레이너가 웃으며 한 세트 더를 외쳤다." }; },
  run_crew(s) { const g = gainStat(s, "body", 1.2); socialMental(s); return { lines: [`체력 +${g.toFixed(1)}`], msg: "한강 바람. 5km 완주." }; },
  beauty(s, r, k) { const b = D.BEAUTY.find((x) => x.k === k) || D.BEAUTY[0]; if (s.cash + b.cash < -creditRoom(s)) return { lines: ["돈이 모자랐다"] }; s.cash += b.cash; addMoney(s, "exp", "꾸미기", -b.cash); const g = gainStat(s, "charm", b.charm); const out = [`매력 +${g.toFixed(1)}`, `돈 ${won(b.cash)}`]; if (b.talk) out.push(`말빨 +${gainStat(s, "talk", b.talk).toFixed(1)}`); return { lines: out, msg: b.desc }; },
  family_time(s) { s.fam.happy = clamp(s.fam.happy + 10, 0, 100); s.flags.familyThisMonth = s.t; if (s.fam.spouse) addAff(s, s.fam.spouse, 3); return { lines: ["가족 행복 +10"], msg: s.fam.kids.length ? "아이가 그린 그림을 냉장고에 붙였다." : "둘이 소파에서 드라마를 봤다." }; },
  kids_play(s) { s.fam.happy = clamp(s.fam.happy + 8, 0, 100); s.flags.familyThisMonth = s.t; return { lines: ["가족 행복 +8"], msg: "트램펄린에서 아이보다 내가 더 신났다." }; },
  visit_parents(s) { s.fam.parents = clamp(s.fam.parents + 2, 0, 100); s.fam.lastVisit = s.t; s.mental = clamp(s.mental + 2, 0, 100); return { lines: ["부모님 건강 +2", "반찬 3통 획득"], msg: "본가에 다녀왔다." }; },
  drink(s) { socialMental(s); return { lines: ["멘탈 +5"], msg: "소주 한 병, 이야기 두 시간." }; },
  drink_fancy(s) { socialMental(s); return { lines: ["멘탈 +6"], msg: "야경이 예쁘다. 가격도 예쁘다." }; },
  exhibit() { return { lines: ["감각 +"], msg: "색 조합 하나를 머릿속에 저장했다." }; },
  trend_walk() { return { lines: ["마케팅·감각 +"], msg: "팝업 줄이 두 블록. 요즘은 이게 뜬다." }; },
  book_club(s) { socialMental(s); return { lines: ["글쓰기 +"], msg: "같은 책을 읽고 다른 이야기를 했다." }; },
  dating_app(s, r) { // 바로 새 인연 하나
    const cands = s.cast.filter((id) => { const c = CHAR[id]; return c && !s.rel[id] && isRomanceable(s, c) && !(c.hire && !(s.co.hired || []).includes(id)); }); // 11-24 아직 입사 전인 후배·경력직은 앱에 안 나온다(첫 만남 글이 입사 장면이다)
    if (!cands.length) return { lines: ["오늘은 매칭이 없다"], msg: "스와이프만 200번." };
    const p = clamp(0.35 + (s.st.charm - 30) / 80, 0.15, 0.9);
    if (!r.chance(p)) { s.mental = clamp(s.mental - 2, 0, 100); return { lines: ["매칭 실패", "멘탈 −2"], msg: "읽씹. 매력을 더 키워야 할까." }; }
    const id = r.pick(cands); return { scene: meetScene(s, id, "앱에서 매칭됐다. "), lines: [] };
  },
  network_lunch() { return { lines: ["커리어 +"], msg: "옆 회사 과장님에게 업계 소문을 들었다." }; },
  cowork(s) { s.buff.cowork = 1; return { lines: ["다음 투잡 행동 효과 +50%"], msg: "공유오피스 1일권. 집중 모드." }; },
  cafe_work(s) { s.buff.cafe = 1; return { lines: ["다음 투잡 행동 효과 +30%"], msg: "아이스 아메리카노 한 잔으로 3시간 버티기." }; },
  univ_walk(s, r) { s.pr.known.univ = (s.pr.known.univ || 0) + 1; return { lines: ["대학가 상권 정보 +"], msg: r.pick(["개강 첫 주, 술집마다 줄이 섰다.", "엠티 버스가 줄지어 서 있다.", "취업 스터디 모집 전단이 벽을 덮었다."]) }; },
  house_tour(s, r) { s.flags.houseInfo = s.t; return { lines: ["집 시세 정보 +"], msg: `요즘 34평 시세 ${won(housePrice(s, "apt"))}. ${houseMoodText(s)}` }; },
  house_search(s, r) { return { scene: houseScene(s, r), lines: [] }; },
  work_hard(s, r) { const g = 9 * mod(s, "perfMult", 1); s.co.perf = clamp(s.co.perf + g, 0, 100); s.co.eye = clamp(s.co.eye - 3, 0, 100); if (r.chance(0.2)) return { lines: [`회사 성과 +${Math.round(g)}`, "회사 눈치 −3", stL(s, "lang", 0.8, "mail")], msg: "해외 법인 메일에 영어로 답장했다. 번역기는 반만 썼다." }; return { lines: [`회사 성과 +${Math.round(g)}`, "회사 눈치 −3"], msg: "보고서 한 장을 끝냈다. 팀장이 고개를 끄덕였다." }; },
  overtime(s) { const g = 20 * mod(s, "perfMult", 1); s.co.perf = clamp(s.co.perf + g, 0, 100); s.co.eye = clamp(s.co.eye - 6, 0, 100); s.co.boss = clamp(s.co.boss + bossUp(s, 4), 0, 100); return { lines: [`회사 성과 +${Math.round(g)}`, "회사 눈치 −6"], msg: "밤 10시의 사무실. 형광등 소리만 들린다." }; },
  office_chat(s, r) { s.co.eye = clamp(s.co.eye - 2, 0, 100); const out = ["회사 눈치 −2"]; if (r.chance(0.3)) { const j = r.pick(["pr", "cs", "insta", "ucafe", "chicken", "airbnb", "tutoring"]); const l = SJ.addInt(s, j, r.int(8, 15)); if (l) { out.push(l); return { lines: out, msg: `"옆 팀 누구는 퇴근 후에 ${D.SIDEJOBS[j].n} 한대요. 월급보다 더 번다던데?"` }; } } return { lines: out, msg: r.pick(["\"그 팀 팀장 바뀐대요.\"", "\"요즘 다들 부업 하나씩 한다던데요?\"", "\"성과급 얘기 들었어요?\""]) }; },
  co_lunch(s, r) {
    const cands = s.cast.filter((id) => !s.rel[id] && (CHAR[id]?.hangouts || []).some((h) => h === "office" || h === "officest"));
    if (cands.length && r.chance(0.45)) return { scene: meetScene(s, r.pick(cands), "점심 메뉴 투표에서 같은 걸 고른 사람이 있었다. "), lines: [] };
    const known = Object.keys(s.rel).filter((id) => (CHAR[id]?.hangouts || []).some((h) => h === "office" || h === "officest"));
    if (known.length) { const id = r.pick(known); const g = addAff(s, id, 4); return { lines: [`${CHAR[id].name} 호감 +${g}`], msg: `${jo(CHAR[id].name, "과", "와")} 김치찌개. 회사 욕 반, 인생 이야기 반.` }; }
    return { lines: ["멘탈 +1"], msg: "구내식당 돈가스. 오늘은 성공이다." };
  },
  co_project(s) { const g = 14 * mod(s, "perfMult", 1); s.co.perf = clamp(s.co.perf + g, 0, 100); const bu = bossUp(s, 5); s.co.boss = clamp(s.co.boss + bu, 0, 100); s.co.eye = clamp(s.co.eye - 4, 0, 100); const c = gainStat(s, "career", 1.4); return { lines: [`회사 성과 +${Math.round(g)}`, `커리어 +${c.toFixed(1)}`, `팀장 호감 +${bu}`], msg: "신사업 TF. 회의만 세 번, 그래도 보고서에 내 이름이 들어갔다." }; },
  co_resume(s) { s.co.resume = clamp((s.co.resume || 0) + 25, 0, 100); return { lines: ["헤드헌터 제안 확률 +"], msg: "경력기술서에 숫자를 채웠다. 원티즈·리멤바에 '이직 제안 받기'를 켰다." }; },
  company_dinner(s) { const bu = bossUp(s, D.CO_PARTY.boss); s.co.boss = clamp(s.co.boss + bu, 0, 100); s.co.eye = clamp(s.co.eye - 5, 0, 100); const lines = [`팀장 호감 +${bu}`, "회사 눈치 −5"], P = s.co.party;
    if (P) { // 11-25 회식 달: 같이 간 아는 사람들과 조금 가까워지고, 회식이 끝나면 회사 앞 자리가 사라진다(사람들은 사무실로)
      P.done = s.t; const here = (s.spot?.dinner || []).filter((id) => CHAR[id] && s.rel[id] && !s.rel[id].spouse); for (const id of here) { s.rel[id].last = s.t; addAff(s, id, 2); } if (here.length) lines.push(`같이 간 ${here.length}명 호감 +2`);
      fixCoSpots(s); }
    return { lines, msg: (P && D.CO_PARTY.msg[P.k]) || "3차 노래방에서 탈출했다." }; },
  grad_apply(s, r, k) {
    const g = D.GRADS[k] || D.GRADS.mba; if (s.cash - g.cash < -creditRoom(s)) return { lines: ["입학금이 모자라요"], msg: "등록금 고지서를 보고 창을 닫았다." };
    s.cash -= g.cash; addMoney(s, "exp", "대학원 입학금", g.cash); s.grad = { k: k in D.GRADS ? k : "mba", t0: s.t, n: 0, done: false };
    log(s, `${g.n}에 입학했다.`, "life");
    return { lines: [`${g.n} 입학`, `입학금 ${won(g.cash)}`, `매달 등록금 ${won(g.fee)} · 행동력 −1`, "전체 메뉴에 대학원 칸이 열렸어요"], msg: "퇴근하고 지하철 두 정거장. 다시 학생증이 생겼다." };
  },
  grad_class(s, r) {
    const G = s.grad, g = D.GRADS[G.k]; G.n++; G.lastT = s.t;
    const lines = Object.entries(g.stat).map(([k, v]) => `${D.STATS[k]} +${gainStat(s, k, v).toFixed(1)}`);
    const cands = s.cast.filter((id) => !s.rel[id] && /과장|팀장|대리|매니저|차장|대표|선생|연구원/.test(CHAR[id]?.job || ""));
    if (cands.length && r.chance(0.3)) return { scene: meetScene(s, r.pick(cands), "조별 과제 같은 조가 됐다. "), lines };
    return { lines: [...lines, `수업 ${G.n}/${g.need}`], msg: r.pick(["케이스 스터디 발표. 교수님이 고개를 끄덕였다.", "밤 10시 수업이 끝나고 동기들과 치맥.", "과제 마감 1시간 전. 회사 보고서보다 어렵다."]) };
  },
  rejob(s, r) { const p = clamp((0.25 + s.st.career / 300 - Math.max(0, s.age - 40) * 0.02) * mod(s, "rejobMult", 1), 0.08, 0.85); if (r.chance(p)) { s.co.quit = false; s.co.fired = false; s.co.retired = false; s.co.pip = 0; s.co.perf = 45; s.co.eye = 0; s.co.warns = 0; s.co.rank = Math.min(4, Math.max(0, s.co.rank - 1)); s.co.payIdx *= 0.92; s.co.type = r.pick(["mid", "startup", "mid"]); s.co.name = r.pick(D.COMPANY_TYPES[s.co.type].names); delete s.co.party; fixCoSpots(s); /* 11-25 새 회사의 장소로 */ log(s, `${s.co.name}에 다시 입사했다.`, "work"); return { lines: [`${s.co.name} 합격!`], msg: "다시 사원증을 목에 걸었다." }; } return { lines: ["불합격"], msg: "\"좋은 인연으로 다시 뵙겠습니다.\"" }; },
};
// 아이템: 사면 능력치가 바로 오른다
export function buyItem(s, id) {
  if (!D.ITEMS[id]) return IT.buy(s, id, { creditRoom: creditRoom(s), addMoney, log }); // 장비·소모품·최종(v4.25)
  const it = D.ITEMS[id]; if (!it) return { ok: false, msg: "없는 물건" };
  s.items = s.items || {};
  if (s.items[id] !== undefined) return { ok: false, msg: "이미 갖고 있어요" };
  if (s.cash - it.cash < -creditRoom(s)) return { ok: false, msg: "돈이 모자라요" };
  s.cash -= it.cash; addMoney(s, "exp", "아이템", it.cash); s.items[id] = s.t;
  const lines = Object.entries(it.stat).map(([k, v]) => { s.st[k] = clamp(s.st[k] + v, 0, statCap(s)); return `${D.STATS[k]} +${v}`; });
  syncSta(s); log(s, `${jo(it.n, "을", "를")} 샀다.`, "life");
  return { ok: true, lines, msg: `${it.n} 구매 · ${won(it.cash)}` };
}
function socialMental(s) { s.mental = clamp(s.mental + mod(s, "socialMental", 0), 0, 100); }

// ───────── 사람 ─────────
export function isRomanceable(s, c) { return c.roles?.includes("romance") && c.single !== false && c.gender !== s.me.gender && c.age >= 24; }
// 11-24 친분 마크: 회사 사람(rank 칸이 있는 사람 = 회사 인물 + '우리 회사' 4명)은 ◆(동료)로 시작한다. 업무 밖 말로 문턱을 넘어야(rel.heart) 두근두근·고백이 열린다.
// 회사 밖 사람은 isRomanceable 과 같다. isRomanceable 은 '연애 자료가 있는 이성인가'만 본다(그대로 둔다).
export const isCoP = (c) => !!c?.rank;
export function heartOpen(s, id) { const c = CHAR[id]; if (!c || !isRomanceable(s, c)) return false; return c.rank ? s.rel?.[id]?.heart != null : true; }
// 이름 옆 표시: 동성과 ◆인 회사 사람은 ◆◇(k "dia") + 작은 글자, 나머지는 ♥♡. 연애 가능 여부는 이 표시로 새지 않는다(성별·회사 사람인지·전환 여부만 본다)
export function markOf(s, id) {
  const c = CHAR[id], x = s.rel?.[id]; if (!c) return { k: "heart" };
  if (x?.lover || x?.spouse || x?.affair) return { k: "heart" };
  if (c.rank && (c.gender === s.me.gender || x?.heart == null)) return { k: "dia", label: "동료" };
  if (c.gender === s.me.gender) return { k: "dia", label: "친구" };
  return { k: "heart" };
}
export function relOf(s, id) { return s.rel[id] || null; }
export function addAff(s, id, v) {
  const rel = s.rel[id]; if (!rel) return 0;
  let g = v;
  if (v > 0) { g *= mod(s, "affMult", 1); if (isRomanceable(s, CHAR[id])) g *= mod(s, "romanceMult", 1) * (D.MAJORS[s.me.major]?.rom || 1); }
  rel.aff = clamp(rel.aff + g, 0, 100);
  return Math.round(g * 10) / 10;
}
export function ensureRel(s, id) { if (!s.rel[id]) { s.rel[id] = { aff: 0, stage: 0, met: s.t, last: s.t, lover: false, spouse: false, helper: null, helperOk: false, talks: {}, loverSince: null, client: false }; s.stat.met++; } return s.rel[id]; }

// 11-24 처음 2년(HINT_T)은 선택지에 길잡이를 단다: 기대값이 가장 좋은 선택지에 '추천'(비슷하면 여럿), 보상이 가장 크지만 판정에 걸린 선택지에는 '모 아니면 도'.
// 효과가 장면 글 밖(onChoose)에 숨어 있어 점수를 못 매기는 장면은 장면이 sc.best = [번호…] 를 주면 그걸 쓰고, 없으면 달지 않는다.
export const HINT_T = 24;
const effScore = (e) => { if (!e) return 0; let v = (e.aff || 0) + (e.mental || 0) * 0.5 + (e.hp || 0) * 0.3 + (e.cash || 0) / 10 + (e.family || 0) * 0.6 + (e.pr_rating || 0) * 50 + (e.cs_rep || 0) + (e.shard || 0) * 3 + (e.item ? 5 : 0); for (const x of Object.values(e.stat || {})) v += x * 4; v += (e.ap || 0) * 6 + (e.fame || 0) + (e.boost ? e.boost.pct * e.boost.months * 40 : 0); if (e.flag && e.flag !== "wedding_planned") v += 6; return v; };
export function choiceHints(s, sc) {
  if (sc?.tag === "고백" || /^lv_(way|back|ev|gift)/.test(sc?.onChoose || "")) return []; // 고백 장면은 길잡이를 달지 않는다(대표 11-24)
  if (!sc?.choices?.length || s.t >= HINT_T || sc.kind === "year" || sc.kind === "story" || sc.choices.length < 2) return [];
  if (Array.isArray(sc.best)) return sc.choices.map((_, i) => (sc.best.includes(i) ? "추천" : null));
  const R = sc.choices.map((ch) => { if (ch.check) { const p = chk(s, ch.check), up = effScore(ch.ok?.eff), dn = effScore(ch.ng?.eff); return { ev: p * up + (1 - p) * dn, up, p, risky: p < 0.6 }; } const v = effScore(ch.eff); return { ev: v, up: v, p: 1, risky: false }; });
  const evs = R.map((x) => x.ev), mx = Math.max(...evs), mn = Math.min(...evs); if (mx - mn < 0.5) return []; // 차이가 없으면 달지 않는다
  const tol = Math.max(0.5, Math.abs(mx) * 0.08), upMax = Math.max(...R.map((x) => x.up));
  return R.map((x) => { const best = x.ev >= mx - tol, gamble = x.risky && x.up >= upMax && x.up > 0 && R.some((y) => y !== x && y.up < x.up); return gamble ? "모 아니면 도" : best ? "추천" : null; }); // 위험이 걸린 큰 보상은 모 아니면 도, 위험 없는 좋은 선택은 추천(대표 11-24)
}
function chk(s, check) { if (!check) return null; const v = s.st[check.stat] ?? 30; return clamp(0.5 + (v - check.dc) / 40, 0.05, 0.95); }

export function meetScene(s, id, pre = "") {
  const c = CHAR[id];
  return { kind: "meet", who: id, title: `첫 만남 · ${c.name}`, text: (pre || HL.meetPre(s, id)) + (c.lines?.meet || `${c.job} ${jo(c.name, "을", "를")} 만났다.`) + HL.deja(s, id), choices: [
    { t: "먼저 웃으며 인사를 건넨다", check: { stat: "charm", dc: 35 }, ok: { text: FIRST[id]?.say || c.lines?.hello || "분위기가 좋다.", eff: { aff: 10 } }, ng: { text: "어색한 웃음이 오갔다.", eff: { aff: 3 } } }, // 11-24 처음 말 걸 때의 반응은 인물마다 다르다(data/first_meet.json). 판정·호감은 그대로
    { t: "공통 관심사로 말을 이어 간다", check: { stat: "talk", dc: 40 }, ok: { text: FIRST[id]?.say ? `${FIRST[id].say} 그 뒤로 이야기가 술술 풀렸다. 연락처를 교환했다.` : "이야기가 술술 풀렸다. 연락처를 교환했다.", eff: { aff: 12 } }, ng: { text: "TMI였다. 그래도 이름은 기억해 줬다.", eff: { aff: 2 } } },
    { t: "가볍게 목례만 한다", eff: { aff: 4 }, text: "다음에 또 보면 인사할 정도는 됐다." },
  ] };
}
export function talkTo(s, id) {
  const c = CHAR[id]; if (!c) return { ok: false, msg: "없는 인연" };
  if (s.ap < 1) return { ok: false, msg: "행동력이 부족해요" };
  if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" };
  const rel = s.rel[id];
  if (rel && (rel.talks[s.t] || 0) >= 2) { const b = busyOf(c, rel, s); return { ok: false, msg: b ? `${c.name}: "${b}" (이번 달엔 충분히 이야기했다)` : "이번 달엔 충분히 이야기했다" }; }
  s.ap -= 1; s.hp = clamp(s.hp - 2, 0, s.hpMax); socialMental(s);
  if (!rel) { ensureRel(s, id); s.rel[id].talks[s.t] = 1; return { ok: true, scene: openScene(s, meetScene(s, id)), lines: [] }; }
  rel.talks[s.t] = (rel.talks[s.t] || 0) + 1; rel.last = s.t;
  { const hb = HL.beat(s, id, "talk"); if (hb) return { ok: true, scene: openScene(s, hb), lines: [] }; } // 11-25 히로인 장면(재회 포함)이 이야기 단계보다 먼저
  const arc = nextArc(s, id); if (arc) return { ok: true, scene: openScene(s, arc), lines: [] };
  return { ok: true, scene: openScene(s, talkScene(s, R(s), id)), lines: [] }; // v4.25: 할 말을 고른다
}

// ───────── 말 걸기 대화 고르기(v4.25) ─────────
// 좋아하는 것 이야기(가장 좋음) · 성격에 맞는 말(좋음) · 싫어하는 것이나 안 맞는 말(나쁨). 잘 고르면 가끔 능력치도 오른다.
const TALK_STYLE = [
  [/직설|솔직|털털|당당|무뚝뚝/, "솔직형", "\"돌려 말 안 할게요. 요즘 일 어때요, 진짜로?\""],
  [/수줍|섬세|다정|차분|과묵|순진/, "다정형", "\"오늘 좀 지쳐 보여서요. 따뜻한 거 한 잔 할래요?\""],
  [/유쾌|엉뚱|발랄|허당|낙천|여유|느긋/, "농담형", "\"아까 회의 때 제 표정 봤어요? 저 영혼 나갔었어요 ㅋㅋ\""],
  [/야망|전략|열정|깐깐|원칙|꼼꼼|박식|성실|시크|도도|눈치|의리/, "진지형", "\"요즘 준비하는 거 있어요? 배울 게 있을 것 같아서요.\""],
];
// 인사말: 3단계(합격·이직 뒤)부터는 lines.hello3 가 있으면 그것을 먼저 쓴다. busy 도 같다(busy3)
// 11-25 s 를 주면 히로인의 인생 단계 인사말(heroine.js cur)을 가장 먼저 쓴다
const h3On = (c, rel, s) => { const h = s && c ? HL.h3ok(s, c.id) : null; return h == null ? (rel?.stage || 0) >= 3 : h; };
export function helloOf(c, rel, s) { return (s && c && HL.cur(s, c.id, "hello")) || (h3On(c, rel, s) && c?.lines?.hello3) || c?.lines?.hello || ""; }
export function busyOf(c, rel, s) { return (s && c && HL.cur(s, c.id, "busy")) || (h3On(c, rel, s) && c?.lines?.busy3) || c?.lines?.busy || ""; }
// ── 11-24 회사 사람 말 걸기: 역할(팀장·사수·선배·동료·후배)마다 대사가 다르다(data/role_talk.json). 호감이 오르는 폭은 아래 plainTalk 와 같다(q 2·1·0).
// 주인공을 부르는 말: ○○ 씨 → ○ 대리 → ○ 과장(직급이 오르면 바뀐다). 동기는 이름. 이름이 한글 세 글자일 때만 성과 이름을 나눈다.
export function callName(s, c) {
  const nm = String(s.me.name || "나"), han3 = /^[가-힣]{3}$/.test(nm), given = han3 ? nm.slice(1) : nm, sur = han3 ? nm[0] : nm;
  if (/동기/.test(c?.job || "")) return given;
  const rk = s.co.quit || s.co.fired ? 0 : s.co.rank || 0;
  return rk >= 1 && D.RANKS[rk] ? `${sur} ${D.RANKS[rk].n}` : `${given} 씨`;
}
const fillMe = (s, t) => String(t || "").replace(/\{me\}/g, s.me.name || "나");
function roleTalk(s, r, id) {
  const c = CHAR[id], rel = s.rel[id]; if (!c.rank || s.co.quit || s.co.fired) return null; // 회사를 나온 뒤에는 회사 대사를 쓰지 않는다
  const band = rel.aff >= 45 ? "high" : rel.aff >= 20 ? "mid" : "low", T = RT.by?.[id]?.[band] || RT.roles?.[c.rank]?.[band];
  if (!T?.opts?.length) return null;
  const nm = callName(s, c), f = (t) => String(t || "").replace(/\{name\}/g, nm).replace(/\{who\}/g, c.name);
  const base = 3 + s.st.charm / 25, open = T.open?.length ? f(r.pick(T.open)) : "";
  const order = T.opts.map((o) => [o, r.range(0, 1)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  return { kind: "event", who: id, expr: rel.aff >= 45 ? "smile" : "neutral", tag: "대화", title: `${c.name}에게 말 걸기`, text: `${open ? `{${id}}"${open}" ` : ""}무슨 말을 할까? (회사에서 어떤 사이인지 떠올려 보세요)`, onChoose: "talk_pick", tq: order.map((o) => o.q), role: c.rank,
    choices: order.map((o) => ({ t: f(o.t), eff: { aff: o.q === 2 ? Math.round(base + 4) : o.q === 1 ? Math.round(base) : -1, mental: o.q === 2 ? 2 : 0 }, text: f(o.re) })) };
}
// ── 업무 밖 말(11-24): 이성인 회사 사람과 호감 30부터 네 번째 선택지. 연애가 안 되는 사람에게도 보이고(받아넘긴다), 횟수(rel.pv)는 한 달에 한 번만 센다.
// 횟수와 호감이 그 사람의 문턱(WALL.walls)을 넘으면 ◆가 ♥로 바뀐다(rel.heart). 사수는 문턱이 없다(따로 보자고 하기 세 번).
export const PV = { aff: 30, gain: 2, turn: [5, 2], mental: 3 };
function pvShown(s, id) { const c = CHAR[id], x = s.rel[id]; return !!(c?.rank && x && c.gender !== s.me.gender && x.aff >= PV.aff && x.heart == null && !x.lover && !x.spouse && !x.affair && RT.pv?.ask?.length); }
function pvCount(s, id) { // 이번 달에 꺼낸 말을 센다. outside 형은 그 달에 약속이나 술 한잔을 했을 때만
  const x = s.rel[id], W = WALL.walls?.[id]; if (!x || x.pvAsk !== s.t || x.pvT === s.t) return;
  if (W?.extra === "outside" && x.meetT !== s.t && x.drinkT !== s.t) return;
  x.pv = (x.pv || 0) + 1; x.pvT = s.t;
}
function wallOk(s, id) { // extra "arc1"(이야기 1단계 판정에 성공했으면 문턱 −5)은 저장 값으로 알 수 없어 보지 않는다
  const c = CHAR[id], x = s.rel[id], W = WALL.walls?.[id]; if (!W || !x || x.heart != null || x.lover || x.spouse || id === sasuOf(s) || !isRomanceable(s, c)) return false;
  if ((x.pv || 0) < W.need || x.aff < W.gate) return false;
  if (W.extra === "meetup1" && (x.meetN || 0) + (x.drinkN || 0) < 1) return false; // 회사 밖에서 한 번은 만났어야 한다(약속·술 한잔)
  return true;
}
// 전환 장면: 장소 한 줄 · 그 사람의 한마디 · "이름 옆의 표시가 바뀌었다." 표시는 장면이 뜨는 순간 바뀐다(선택지는 호감만 가른다)
function turnScene(s, id, from) {
  if (!wallOk(s, id)) return null;
  const c = CHAR[id], x = s.rel[id], W = WALL.walls[id], sp = Object.keys(s.spot || {}).find((k) => s.spot[k].includes(id)), spN = D.SPOTS[sp]?.n;
  x.heart = s.t; log(s, `${jo(c.name, "과", "와")} 업무 밖 이야기를 하는 사이가 됐다.`, "love");
  const place = from === "drink" ? "술자리가 끝나고 나오는 길." : from === "meetup" ? "약속이 끝나고 돌아가는 길." : `${spN ? spN + ". " : ""}돌아서려는데 ${jo(c.name, "이", "가")} 불러 세운다.`;
  return { kind: "event", who: id, expr: "blush", tag: "인연", title: `${c.name} · 업무 밖 이야기`, onChoose: "lv_turn", text: `${place} {${id}}"${W.turn}" 이름 옆의 표시가 바뀌었다.`, choices: [
    { t: "웃으며 받는다", eff: { aff: PV.turn[0], mental: PV.mental }, text: "웃음이 먼저 나왔다. 대답은 그걸로 충분했다." },
    { t: "오늘은 여기까지만", eff: { aff: PV.turn[1], mental: PV.mental }, text: "오늘은 여기까지만 듣기로 했다. 표시는 이미 바뀌어 있었다." }] };
}
function talkScene(s, r, id) {
  const sc = roleTalk(s, r, id) || plainTalk(s, r, id);
  if (pvShown(s, id)) { const P = RT.pv, ban = (P.banTo || []).includes(id) && P.askBan?.length; sc.choices.push({ t: r.pick(ban ? P.askBan : P.ask), eff: { aff: PV.gain }, text: P.by?.[id] ? `{${id}}"${P.by[id]}"` : "웃으며 말을 돌렸다. 싫은 눈치는 아니다." }); sc.tq.push(-1); sc.pv = sc.choices.length - 1; }
  return sc;
}
function plainTalk(s, r, id) {
  const c = CHAR[id], rel = s.rel[id], P = (c.personality || []).join(" ");
  const fit = TALK_STYLE.find(([re]) => re.test(P)) || TALK_STYLE[2];
  const off = TALK_STYLE.filter((x) => x !== fit)[r.int(0, 2)];
  const like = c.likes?.length ? r.pick(c.likes) : null, dis = c.dislikes?.length ? r.pick(c.dislikes) : null;
  const base = 3 + s.st.charm / 25;
  const opts = [
    like ? { t: `"요즘도 ${like} 자주 해요? 저도 관심 생겼어요."`, q: 2 } : { t: fit[2], q: 2 },
    { t: like ? fit[2] : "\"오늘 날씨 좋네요. 점심 뭐 드셨어요?\"", q: 1 },
    dis && r.chance(0.6) ? { t: `"${dis} 좋아하세요? 저 요즘 완전 빠졌어요."`, q: 0 } : { t: off[2], q: 0 },
  ];
  // 순서 섞기(엔진 난수)
  const order = opts.map((o) => [o, r.range(0, 1)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const lines = { 2: [`"어, 그거 진짜 좋아하는데! 어떻게 알았어요?"`, "눈이 반짝였다. 이야기가 30분 넘게 이어졌다."], 1: [`${helloOf(c, rel, s) ? `"${helloOf(c, rel, s)}"` : "\"아, 네~\""}`, "무난하게 웃으며 이야기를 나눴다."], 0: ["\"…아, 네.\"", "대화가 어색하게 끊겼다. 다음엔 다른 얘기를 해 보자."] };
  return { kind: "event", who: id, expr: rel?.aff >= 45 ? "smile" : "neutral", tag: "대화", title: `${c.name}에게 말 걸기`, text: `${rel?.aff >= 45 ? `${jo(c.name, "이", "가")} 먼저 손을 흔든다.` : `${jo(c.name, "과", "와")} 눈이 마주쳤다.`} 무슨 얘기를 할까? (좋아하는 것·성격을 떠올려 보세요)`, onChoose: "talk_pick", tq: order.map((o) => o.q),
    choices: order.map((o) => ({ t: o.t, eff: { aff: o.q === 2 ? Math.round(base + 4) : o.q === 1 ? Math.round(base) : -1, mental: o.q === 2 ? 2 : 0 }, text: lines[o.q].join(" ") })) };
}
// ── 고백 과정(11-24). 호감이 찼다고 바로 사귀지 않는다: 내가 '고백하기'를 눌러 말하고, 상대가 답한다.
// 답은 성격에 따라 다르다(인물마다 첫 고백 한 번만): yes 바로 승낙 · tease 싫다고 했다가 장난 · shy 거절 직후 "부끄러워서" · late 거절하고 다음 달 먼저 고백.
// 1회차는 연애가 잠겨 있다(RD.loveOpen): 고백 직전까지만. 같은 성별은 isRomanceable 에서 걸러져 절친까지만 간다.
const isLoverArc = (st) => !!st && st.choices.some((ch) => [ch.eff, ch.ok?.eff, ch.ng?.eff].some((e) => e?.flag === "lover"));
export function confessType(c) {
  const P = c?.personality || [], has = (...k) => k.some((x) => P.includes(x));
  if (has("수줍")) return "shy";
  if (has("도도", "직설", "전략")) return "late";
  if (has("섬세", "차분")) return "shy";
  if (has("엉뚱", "유쾌")) return "tease";
  return "yes";
}
// 고백이 통했을 때 상대의 답. 돌려주는 값: null(그대로 연인) 또는 { text, eff }(연인이 되는 효과를 이 값으로 바꾼다)
function confessAnswer(s, id, okText) {
  const c = CHAR[id], rel = s.rel[id], n = c.name;
  if (!RD.loveOpen(s)) return { text: "말이 목까지 올라왔다가 내려갔다. 지금은 내 앞가림이 먼저다. (연애는 만 5년 결산 뒤에 열려요)", eff: { aff: 2 } };
  if (rel.cfDone) return null;
  const tp = confessType(c); rel.cfDone = tp;
  if (tp === "yes") return null;
  if (tp === "tease") return { text: `${jo(n, "은", "는")} 고개를 저었다. 싫다고 했다. 3초쯤 지났을까, 참던 웃음이 터졌다. 표정이 볼 만했다며 한참을 웃더니 손을 내밀었다. ${okText || ""}`.trim(), eff: { aff: 10, flag: "lover" } };
  if (tp === "shy") {
    s.sceneQ.unshift({ kind: "event", who: id, expr: "blush", tag: "고백", title: `${n} · 사실은`, onChoose: "lv_ev", text: `돌아서서 몇 걸음 걸었을 때 뒤에서 발소리가 따라왔다. ${jo(n, "이", "가")} 숨을 고르며 섰다. 귀까지 빨갛다. 아까는 너무 놀라서, 부끄러워서 그랬다고 했다. 한 번만 다시 말해 달라고 했다.`, choices: [
      { t: "천천히 다시 말한다", eff: { aff: 10, flag: "lover" }, text: `이번에는 고개를 끄덕였다. 아주 작게, 두 번. ${okText || "돌아가는 길에는 둘이 나란히 걸었다."}` },
      { t: "\"아까 거절하셨잖아요\" 하고 놀린다", eff: { aff: 7, flag: "lover" }, text: `${jo(n, "이", "가")} 얼굴을 두 손으로 가렸다. 손가락 사이로 웃는 눈이 보였다. 놀린 값은 다음 데이트 밥값으로 치르기로 했다.` },
      { t: "오늘은 그냥 돌아간다", eff: { aff: -4, mental: -2 }, text: "괜찮다고 말하고 돌아섰다. 집에 와서야 내가 무슨 짓을 했는지 알았다." }] });
    return { text: `${jo(n, "은", "는")} 눈이 커졌다. 한참 말이 없더니 고개를 숙였다. 미안하다는 말이 겨우 들렸다. 대답은 그게 전부였다.`, eff: { aff: 0, mental: -3 } };
  }
  rel.cfBack = s.t; // late: 이번 달 마감 때(=다음 달 첫머리) 그쪽이 먼저 온다(endMonth)
  return { text: `${jo(n, "은", "는")} 잠깐 나를 보다가 시선을 돌렸다. 지금은 대답을 못 하겠다고 했다. 거절인지 아닌지 알 수 없는 얼굴이었다. 돌아오는 길이 길었다.`, eff: { aff: -1, mental: -4 } };
}
// 1회차: 고백 직전까지만. 호감 70을 넘긴 날 한 번 나온다(대사 없이 써서 말투를 타지 않는다)
const TEASE = [
  (n) => `헤어지는 길, ${jo(n, "이", "가")} 할 말이 있는 얼굴로 섰다가 그냥 웃었다. 다음에 말하겠다고 했다. 집에 오는 내내 그 다음이 언제인지 생각했다.`,
  (n) => `횡단보도 앞에서 ${n}의 손등이 내 손등에 닿았다. 둘 다 못 느낀 척했다. 신호는 유난히 길었다.`,
  (n) => `${jo(n, "이", "가")} 집 앞까지 와서 한참을 안 들어갔다. 별 얘기도 아닌 얘기를 20분 더 했다. 문이 닫히고 나서야 숨을 쉬었다.`,
  (n) => `밤 11시에 ${n}에게서 까톡이 왔다. 잘 들어갔느냐는 한 줄. 답장을 세 번 고쳐 썼다. 지금은 여기까지다.`,
];
// ── 인물별 고백 장면(11-24): data/confess.json. 장면 글 + 1·2단계에서 고른 선택지에 따른 추억 한 줄 + 고백 방식 셋(맞음·보통·어긋남) + 성격 유형별 답
const CONFESS = GEN.CONFESS || {};
const memLine = (L, i) => (Array.isArray(L) && L.length && i != null && L[Math.min(i, L.length - 1)] ? " " + L[Math.min(i, L.length - 1)] : "");
function confessScene(s, id) {
  const c = CHAR[id], X = CONFESS[id], rel = s.rel[id];
  return HL.confessFix(s, id, { kind: "event", who: id, expr: "blush", tag: "고백", cine: "arc3", title: `${c.name} · ${X.scene.title}`, text: X.scene.text + memLine(X.mem1, rel.mem?.[1]), onChoose: "lv_way",
    choices: X.ways.map((w) => ({ t: w.t, eff: {}, text: "" })) }); // 11-25 히로인: 무대를 옮긴 한 벌·덧붙는 추억 줄
}
// 거절 뒤 돌아오는 장면: shy 는 같은 날, late 는 다음 달(먼저 고백)
function confessBack2(s, id, late) {
  const c = CHAR[id], X = CONFESS[id], B = X.answer.back, rel = s.rel[id], ch = B.choices || [];
  const eff = [{ aff: 12, flag: "lover" }, { aff: 9, flag: "lover" }, late ? { aff: -12, mental: -3 } : { aff: -4, mental: -2 }];
  return { kind: "event", who: id, expr: "blush", tag: "고백", title: late ? `${c.name}의 고백` : `${c.name} · 사실은`, text: B.text + memLine(X.mem2, rel.mem?.[2]), onChoose: "lv_back", choices: ch.slice(0, 3).map((x, i) => ({ t: x.t, eff: eff[i], text: x.text })) };
}
// 거절했던 사람이 다음 달 먼저 고백한다
function confessBackScene(s, id) {
  const c = CHAR[id], n = c.name;
  return { kind: "event", who: id, expr: "blush", tag: "고백", title: `${n}의 고백`, onChoose: "lv_ev", text: `${n}에게서 연락이 왔다. 잠깐 볼 수 있느냐고. 약속 장소에 먼저 와 있던 ${jo(n, "이", "가")} 나를 보자마자 말했다. "${c.romance?.confess || "지난번엔 내가 겁이 났어. 이번엔 내가 말할게. 우리 만나 보자."}" 한 달 동안 준비한 말 같았다.`, choices: [
    { t: "기다렸다고 말한다", eff: { aff: 12, flag: "lover" }, text: `${jo(n, "이", "가")} 그제야 숨을 내쉬었다. 지난달 일은 평생 놀림감이 될 것 같다.` },
    { t: "한 달 동안 애태운 값을 받겠다고 한다", eff: { aff: 9, flag: "lover" }, text: "값은 비싸게 불렀다. 흥정 끝에 주말 하루로 정했다. 오늘이 1일이다." },
    { t: "미안하다고 한다", eff: { aff: -12, mental: -3 }, text: "한 달 사이에 내 마음이 식었다. 둘 다 웃으며 헤어졌지만, 한동안 연락은 없을 것이다." }] };
}
function nextArc(s, id, confess) {
  const c = CHAR[id], rel = s.rel[id]; if (!c?.arc) return null;
  if (c.co && (s.co.quit || s.co.fired)) return null; // 11-25 퇴사 뒤에는 회사 사람의 이야기 장면(회사에서 벌어지는 글)을 안 띄운다
  const st = c.arc.find((a) => a.stage === rel.stage + 1);
  if (!st || rel.aff < st.gate) return null;
  if (isLoverArc(st) && isRomanceable(s, c) && (!confess || !RD.loveOpen(s) || !heartOpen(s, id))) return null; // 11-24 고백 장면은 내가 고백할 때만(1회차는 잠김). ◆인 회사 사람은 잠긴다
  if (st.stage === 3 && isLoverArc(st) && isRomanceable(s, c) && Object.values(s.rel).some((x) => x.spouse)) return null; // 기혼이면 연애 장면 생략. 3단계가 고백이 아닌 사람(사수의 발령, 후배의 첫 후배·첫 발표)은 기혼이어도 그대로 뜬다(11-24)
  // 11-23 연인이 될 수 없는 조합(같은 성별 등)인데 3단계 글이 고백 장면이면 친구판으로 바꾼다. 데이터에 친구판(arc[].friend = { title, text, choices: [선택지 순서대로 { t, text } 또는 판정이면 { t, ok, ng }] })이 있으면 그 글, 없으면 공통 글. 효과 값·판정은 그대로.
  if (st.choices.some((ch) => [ch.eff, ch.ok?.eff, ch.ng?.eff].some((e) => e?.flag === "lover")) && !isRomanceable(s, c)) {
    const F = st.friend || FRIEND_ARC[(Number(String(id).replace(/\D/g, "")) || 0) % FRIEND_ARC.length](c.name);
    return { kind: "arc", who: id, stage: st.stage, title: `${c.name} · ${F.title}`, text: F.text, choices: st.choices.map((ch, i) => { const f = F.choices[Math.min(i, F.choices.length - 1)]; return ch.check ? { ...ch, t: f.t, ok: { ...ch.ok, text: f.ok || f.text }, ng: { ...ch.ng, text: f.ng || "말이 좀 꼬였다. 그래도 뜻은 전해졌다." } } : { ...ch, t: f.t, text: (ch.eff?.aff || 0) < 0 ? (f.bad || f.text) : f.text }; }) };
  }
  return { kind: "arc", who: id, stage: st.stage, title: `${c.name} · ${isLoverArc(st) ? "고백 · " : ""}${st.title}`, text: HL.arcText(s, id, st.stage) || st.text, choices: st.choices }; // 11-25 히로인: 인생 사건 뒤·재회 판의 한 벌
}
// 친구판 3단계 공통 글(인물 말투를 타지 않게 대사 없이 쓴다). 선택지 3개: 좋은 답 · 무난한 답 · 어긋난 답(bad)
const FRIEND_ARC = [
  (n) => ({ title: "오래 볼 사이", text: `${jo(n, "과", "와")} 막차 시간까지 이야기했다. 일 얘기로 시작해 집안 얘기까지 갔다. 헤어질 무렵 ${jo(n, "이", "가")} 웃었다. 이런 얘기를 할 사람이 생겨서 좋다고.`, choices: [
    { t: "나도 그렇다고 말한다", text: "길게 말할 필요가 없었다. 다음 약속은 날짜부터 잡았다.", ok: "길게 말할 필요가 없었다. 다음 약속은 날짜부터 잡았다." },
    { t: "다음엔 내가 밥을 사겠다고 한다", text: "비싼 걸 먹겠다는 답이 돌아왔다. 웃음이 길게 이어졌다.", ok: "비싼 걸 먹겠다는 답이 돌아왔다. 웃음이 길게 이어졌다." },
    { t: "시계를 본다", text: "피곤해 보인다며 먼저 일어나 줬다.", bad: "피곤해 보인다며 먼저 일어섰다. 조금 머쓱하게 헤어졌다." }] }),
  (n) => ({ title: "비상 연락처", text: `${jo(n, "이", "가")} 휴대폰을 내밀었다. 비상 연락처 칸에 내 이름이 들어가 있다. 가족 말고 적을 사람이 생각나서 넣었다고 했다.`, choices: [
    { t: "내 휴대폰에도 똑같이 적는다", text: "서로의 화면을 한 번씩 확인했다. 별말 없이 든든했다.", ok: "서로의 화면을 한 번씩 확인했다. 별말 없이 든든했다." },
    { t: "새벽에 전화해도 받겠다고 한다", text: "진짜로 건다는 답이 돌아왔다. 걸어도 된다고 했다.", ok: "진짜로 건다는 답이 돌아왔다. 걸어도 된다고 했다." },
    { t: "부담스럽다며 웃어넘긴다", text: "농담으로 넘겼지만 이름은 그대로 뒀다.", bad: "웃음이 잠깐 끊겼다. 화면은 조용히 꺼졌다." }] }),
  (n) => ({ title: "10년 뒤 약속", text: `${jo(n, "과", "와")} 10년 뒤 얘기를 했다. 각자 뭘 하고 있을지, 그때도 이렇게 볼지. ${jo(n, "은", "는")} 그때도 보자고, 못 박듯 말했다.`, choices: [
    { t: "달력에 10년 뒤 오늘을 적는다", text: "둘 다 진짜로 적었다. 알림까지 걸었다.", ok: "둘 다 진짜로 적었다. 알림까지 걸었다." },
    { t: "그때 밥값은 더 번 사람이 내자고 한다", text: "서로 자기가 낼 거라고 우겼다.", ok: "서로 자기가 낼 거라고 우겼다." },
    { t: "10년은 너무 멀다고 한다", text: "그럼 내년부터 세자며 웃었다.", bad: "그 말에 이야기가 식었다. 계산은 각자 했다." }] }),
];
export function personAct(s, id, kind, arg) {
  const c = CHAR[id], rel = s.rel[id]; if (!c || !rel) return { ok: false, msg: "모르는 사람" };
  const r = R(s);
  { const w = HL.blockAct(s, id, kind); if (w) return { ok: false, msg: w }; } // 11-25 멀리 있는 사람
  if (kind === "hlvisit") { const res = HL.visit(s, id); if (res.ok && res.scene) res.scene = openScene(s, res.scene); return res; } // 11-25 찾아가기(내려가기)
  { const L2 = LOVE.act(s, r, id, kind, arg); if (L2) { if (L2.ok && kind === "drink" && !L2.scene) { pvCount(s, id); const tr = turnScene(s, id, "drink"); if (tr) L2.scene = tr; } /* 11-24 술 한잔 뒤에 문턱을 넘었으면 전환 장면 */ if (L2.ok && L2.scene) L2.scene = openScene(s, L2.scene); return L2; } } // 11-24 연애 행동(love.js)
  if (kind === "dash") return dashAct(s, id); // 11-24 사수에게 따로 보자고 하기
  const cost = { meetup: 1, date: 1, trip: 3, propose: 2, confess: 1, gift: 0, helper: 0, breakup: 0, fire: 0 }[kind] ?? 1;
  if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" };
  if (s.ap < cost) return { ok: false, msg: "행동력이 부족해요" };
  const likeHit = () => c.likes?.length && r.chance(0.5);
  if (kind === "meetup") {
    if (rel.aff < 15) return { ok: false, msg: "아직 약속 잡을 사이가 아님(호감 15)" };
    if ((rel.talks[s.t] || 0) >= 2) return { ok: false, msg: "이번 달엔 충분히 만났다" };
    s.ap -= 1; s.hp = clamp(s.hp - 3, 0, s.hpMax); s.cash -= 4; addMoney(s, "exp", "약속·데이트", 4); rel.talks[s.t] = (rel.talks[s.t] || 0) + 1; rel.last = s.t; socialMental(s);
    rel.meetN = (rel.meetN || 0) + 1; rel.meetT = s.t; // 11-24 회사 밖 약속 횟수·달(회사 사람의 진입장벽이 본다)
    { const hb = HL.beat(s, id, "meetup"); if (hb) return { ok: true, scene: openScene(s, hb), lines: [] }; } // 11-25 히로인 장면
    const arc = nextArc(s, id); if (arc) return { ok: true, scene: openScene(s, arc), lines: [] };
    const hit = likeHit(); const g = addAff(s, id, 5 + (hit ? 4 : 0) + s.st.talk / 30);
    s.mental = clamp(s.mental + 2, 0, 100);
    pvCount(s, id); { const tr = turnScene(s, id, "meetup"); if (tr) return { ok: true, scene: openScene(s, tr), lines: [`호감 +${g}`, stL(s, isForeign(c) ? "lang" : "talk", isForeign(c) ? 0.8 : 0.3, "meetup")], msg: `${c.name}: "${c.lines?.date || "오늘 재밌었어요."}"` }; } // 11-24 약속 뒤에 문턱을 넘었으면 전환 장면
    if (!RD.loveOpen(s) && heartOpen(s, id) && rel.aff >= 70 && !rel.tz && !s.fam.spouse) { rel.tz = s.t; const T = TEASE[(Number(String(id).replace(/\D/g, "")) || 0) % TEASE.length](c.name); return { ok: true, lines: [`호감 +${g}`, "고백은 2회차부터 열려요"], msg: T }; }
    const cfHint = heartOpen(s, id) && !rel.lover && !rel.spouse && !s.fam.spouse && rel.aff >= 70 ? (RD.loveOpen(s) ? "마음이 닿은 것 같다 · 이제 고백할 수 있어요" : "마음이 닿은 것 같다 · 고백은 2회차부터 열려요") : "";
    return { ok: true, lines: [`호감 +${g}`, cfHint, stL(s, isForeign(c) ? "lang" : "talk", isForeign(c) ? 0.8 : 0.3, "meetup"), hit ? `좋아하는 ${r.pick(c.likes)} 이야기로 신났다` : ""].filter(Boolean), msg: `${c.name}: "${c.lines?.date || "오늘 재밌었어요."}"` };
  }
  if (kind === "gift") {
    if (rel.gift === s.t) return { ok: false, msg: "이번 달엔 이미 선물했다" };
    const price = arg || 10; if (s.cash - price < -creditRoom(s)) return { ok: false, msg: "돈이 모자라요" };
    s.cash -= price; addMoney(s, "exp", "선물", price); rel.gift = s.t;
    const g = addAff(s, id, (price >= 50 ? 9 : price >= 20 ? 6 : 3) * mod(s, "giftMult", 1) + (likeHit() ? 3 : 0));
    return { ok: true, lines: [`호감 +${g}`], msg: `${c.name}: "${c.lines?.gift || "고마워요!"}"` };
  }
  if (kind === "date" || kind === "trip") {
    if (!rel.lover && !rel.spouse && !rel.affair) return { ok: false, msg: "연인이 아니에요" };
    const HT = kind === "trip" && !rel.affair ? HL.tripInfo(s, id) : null; if (HT?.wait) return { ok: false, msg: `멀리 있는 사람과의 여행은 1년에 한 번이에요(${HT.wait}개월 뒤)` }; // 11-25 히로인: 멀리 있는 연인의 여행(1년에 한 번·200만)·여행 글
    const money = kind === "trip" ? (HT?.cash ?? 80) : 10; if (s.cash - money < -creditRoom(s)) return { ok: false, msg: "돈이 모자라요" };
    if (kind === "date" && !rel.affair) { const hb = HL.beat(s, id, "date"); if (hb) { s.ap -= cost; rel.last = s.t; rel.dateT = s.t; return { ok: true, scene: openScene(s, hb), lines: [] }; } } // 11-25 히로인: 데이트 날 뜨는 장면(행동력만 쓴다)
    s.ap -= cost; s.hp = clamp(s.hp - (kind === "trip" ? 4 : 4), 0, s.hpMax); s.cash -= money; addMoney(s, "exp", "약속·데이트", money); rel.last = s.t; rel.dateT = s.t;
    const g = addAff(s, id, kind === "trip" ? 14 : 6 + (likeHit() ? 3 : 0)); s.mental = clamp(s.mental + (kind === "trip" ? 10 : 4), 0, 100);
    if (rel.spouse) s.fam.happy = clamp(s.fam.happy + (kind === "trip" ? 16 : 6), 0, 100);
    const line0 = c.romance?.dates?.length ? r.pick(c.romance.dates) : (c.lines?.date || ""); if (kind === "trip") { rel.tripT = s.t; rel.tripN = (rel.tripN || 0) + 1; }
    const line = HT?.lines?.length ? HT.lines[(rel.tripN - 1) % HT.lines.length] : line0;
    const sus = rel.affair ? affDate(s, id, kind) : "";
    return { ok: true, lines: [`호감 +${g}`, rel.spouse ? "가족 행복 +" : "", ...(kind === "trip" ? [stL(s, "lang", 1, "trip"), stL(s, "sense", 0.6, "trip")] : [stL(s, "charm", 0.4, "date")]), sus].filter(Boolean), msg: kind === "trip" ? `둘이 2박 3일 여행을 다녀왔다. ${line}` : line };
  }
  if (kind === "confess") {
    if (!heartOpen(s, id) || rel.lover || rel.aff < 70) return { ok: false, msg: "호감 70 이상 연애 가능 인연에게만" }; // 11-24 ◆인 회사 사람(사수 포함)은 고백이 잠긴다
    if (s.fam.spouse) return { ok: false, msg: "배우자가 있어요" };
    if (!RD.loveOpen(s)) return { ok: false, msg: "연애는 만 5년 결산 뒤에 열려요. 지금은 마음을 쌓는 데까지예요" };
    if (rel.cfBack != null) return { ok: false, msg: "대답을 기다리는 중이에요" };
    if (rel.cfTry === s.t) return { ok: false, msg: "이번 달엔 이미 말을 꺼냈어요. 다음 달에 다시" };
    s.ap -= 1; rel.last = s.t;
    if (CONFESS[id] && !rel.cfDone) { rel.cfTry = s.t; return { ok: true, scene: openScene(s, confessScene(s, id)), lines: [] }; } // 그 사람만의 고백 장면(추억 반영)
    const arc3 = isLoverArc(c.arc?.find((a) => a.stage === rel.stage + 1)) ? nextArc(s, id, true) : null; if (arc3) return { ok: true, scene: openScene(s, arc3), lines: [] }; // 그 사람만의 고백 장면(다음 단계가 고백 장면일 때만. 사수·후배의 3단계는 고백이 아니다)
    const p = clamp(0.3 + (rel.aff - 70) / 40 + (s.st.charm - 40) / 150, 0.1, 0.95);
    if (r.chance(p)) { const ans = confessAnswer(s, id, ""); const out = ans ? applyEff(s, ans.eff, id) : []; if (!ans) becomeLover(s, id, out); if (!ans || ans.eff.flag === "lover") out.push(stL(s, "charm", 1.5, "love")); const q0 = !s.pending && s.sceneQ[0]?.onChoose === "lv_ev" ? s.sceneQ.shift() : null, q = q0 ? openScene(s, { ...q0, text: (ans?.text ? ans.text + " " : "") + q0.text }) : null; return { ok: true, lines: out, scene: q || undefined, msg: ans ? ans.text : "사귀자고 말했다. 대답은 길지 않았다. \"저도 같은 마음이었어요.\"" }; }
    addAff(s, id, -6); s.mental = clamp(s.mental - 8, 0, 100); return { ok: true, lines: ["호감 −6", "멘탈 −8"], msg: "\"조금만 더 시간을 주세요.\"" };
  }
  if (kind === "propose") {
    if (!rel.lover) return { ok: false, msg: "연인에게만" };
    const months = s.t - (rel.loverSince ?? s.t);
    if (months < 8 || rel.aff < 85) return { ok: false, msg: `만난 지 8개월·호감 85 이상 (지금 ${months}개월, ${Math.round(rel.aff)})` };
    { const hb = HL.beat(s, id, "propose"); if (hb) return { ok: true, scene: openScene(s, hb), lines: [] }; const lk = HL.lockMsg(s, id, "propose"); if (lk) return { ok: false, msg: lk }; } // 11-25 히로인: 프러포즈보다 먼저 뜨는 갈림길·기다리기로 한 동안
    { const W = WED.act(s, r, id, kind, { weddingScene }); if (W) { if (W.ok && W.scene) W.scene = openScene(s, W.scene); return W; } } // 11-25 결혼 성향(wed.js): 신중한 사람은 한 번 미루고, 비혼은 세 번째에 받는다. 먼저 결혼 얘기를 꺼냈던 사람은 바로 받는다
    if (s.cash - 300 < -creditRoom(s)) return { ok: false, msg: "반지 살 돈이 모자라요(300만)" };
    s.ap -= 2; s.cash -= 300; addMoney(s, "exp", "프러포즈 반지", 300);
    const p = clamp(0.45 + (rel.aff - 85) / 25 + (netWorth(s) > 5000 ? 0.1 : 0) + (s.house.type === "own" ? 0.1 : 0), 0.2, 0.97);
    if (r.chance(p)) return { ok: true, scene: openScene(s, weddingScene(s, id)), lines: [] };
    addAff(s, id, -10); s.mental = clamp(s.mental - 10, 0, 100); return { ok: true, lines: ["호감 −10", "멘탈 −10"], msg: "\"아직은... 우리 조금 더 생각해 보자.\"" };
  }
  if (kind === "breakup") { endLove(s, id, "헤어졌다.", "drift"); return { ok: true, lines: ["멘탈 −12"], msg: "까톡 프로필 사진을 내렸다." }; }
  if (kind === "helper") { // arg: board
    if (!c.helper || c.helper.effect === "none") return { ok: false, msg: "도움을 줄 수 있는 분야가 없어요" };
    if (!(rel.helperOk || rel.aff >= 60 || rel.spouse)) return { ok: false, msg: "호감 60 이상이거나 이야기가 진행돼야 부탁할 수 있음" };
    if (rel.helper) { if (c.helper.effect === "cs_coach") { const h0 = rel.helper; const why = SJ.slotLock(s, () => { rel.helper = null; return () => { rel.helper = h0; }; }); if (why) return { ok: false, msg: why }; } /* 버그 6: 공동 코치는 투잡 칸 +1 */ rel.helper = null; return { ok: true, lines: ["조력 종료"], msg: "\"언제든 다시 불러요.\"" }; }
    const n = Object.values(s.rel).filter((x) => x.helper).length; if (n >= 4 + (s.cs.lv >= 4 ? 2 : 0) + (s.pr.rooms.length >= 3 ? 2 : 0)) return { ok: false, msg: "조력자가 너무 많아요(규모를 키우면 늘어나요)" };
    rel.helper = c.helper.board; return { ok: true, lines: [`${c.helper.role} 합류`, `매달 수고비 ${helperPay(s, id)}만`], msg: c.helper.line || "\"좋아요, 같이 해요!\"" };
  }
  return { ok: false, msg: "?" };
}
export function helperPay(s, id) { const rel = s.rel[id]; if (rel?.spouse) return 0; const c = CHAR[id]; return Math.round(15 + (c.stats?.[helperStat(c)] || 50) / 4); }
export function helperStat(c) { const e = c.helper?.effect || ""; return { pr_clean: "hands", pr_interior: "sense", pr_photo: "sense", pr_realty: "num", pr_landlord: "num", pr_repair: "hands", cs_coach: "write", cs_hr: "career", cs_headhunter: "career", cs_design: "sense", cs_video: "sense", cs_lecture: "talk", cs_writer: "write", tax: "num", invest: "num", health: "hands", mental: "talk" }[e] || "talk"; }
export function helpers(s, effect) { return Object.entries(s.rel).filter(([id, x]) => x.helper && CHAR[id]?.helper?.effect === effect).map(([id]) => ({ id, c: CHAR[id], power: (CHAR[id].stats?.[helperStat(CHAR[id])] || 50) / 70 })); }
export const helperPower = (s, effect) => helpers(s, effect).reduce((a, h) => a + h.power, 0);

function becomeLover(s, id, out) {
  for (const [oid, x] of Object.entries(s.rel)) if (x.lover && oid !== id) { endLove(s, oid, "새 사람이 생겼다는 걸 눈치챘다.", "left"); out.push(`${jo(CHAR[oid].name, "과", "와")} 이별`); }
  const rel = s.rel[id]; rel.lover = true; rel.loverSince = s.t; rel.dateT = s.t; if (rel.heart == null) rel.heart = s.t; // 11-24 연인이면 표시는 늘 ♥
  s.mental = clamp(s.mental + 10, 0, 100); out.push(`${jo(CHAR[id].name, "과", "와")} 연인이 됐다`, "멘탈 +10");
  log(s, `${jo(CHAR[id].name, "과", "와")} 사귀기 시작했다.`, "love");
}
// ── 11-24 사수의 세 번: 따로 보자고 하기(행동력 1). 두 번 거절당하고 세 번째에 넘어온다(data/wall.json dash).
// 조건: 단계별 호감·이야기 단계, 대시 사이 3개월. 세 번째는 호감 70 + 팀이 갈린 뒤(이야기 3단계를 봤거나 내가 회사를 나옴) + 연애가 열린 회차(2회차부터).
// 넘어오면 그 자리에서 ♥로 바뀌고 연인이 된다(고백 장면을 거치지 않는다). 그 뒤 confess.json 의 '다음 날' 장면을 효과 없이 한 번 보여 준다.
export const DASH_GAP = 3;
export function dashInfo(s, id) { // 인물 창 버튼용. null = 해당 없음 · { n, ok, why, lock }
  const c = CHAR[id], x = s.rel?.[id], L = WALL.dash?.[id];
  if (!c || !x || !L || id !== sasuOf(s) || !isRomanceable(s, c) || x.heart != null || x.lover || x.spouse) return null;
  const n = (x.dash || 0) + 1, st = L[n - 1]; if (!st) return null;
  const out = !!(s.co.quit || s.co.fired), split = (x.stage || 0) >= 3 || out; // 팀이 갈렸다
  let why = "";
  if (s.fam.spouse) why = "배우자가 있어요";
  else if (x.aff < st.aff) why = `호감 ${st.aff}부터 말을 꺼낼 수 있어요`;
  else if (n === 3 ? !split : (x.stage || 0) < (st.stage || 0)) why = n === 3 ? "아직 같은 팀이에요. 사수와 팀이 갈린 뒤에 말할 수 있어요" : "이 사람과의 이야기가 더 쌓여야 해요";
  else if (x.dashT != null && s.t - x.dashT < DASH_GAP) why = `지난번 말을 꺼낸 지 얼마 안 됐어요(${DASH_GAP}개월 뒤)`;
  const lock = n === 3 && !RD.loveOpen(s) ? (st.lock || "세 번째 말은 아직 꺼내지 못했다. (연애는 만 5년 결산 뒤에 열려요)") : "";
  return { n, ok: !why && !lock, why: why || lock, lock, quit: out };
}
function dashAct(s, id) {
  const I = dashInfo(s, id), c = CHAR[id], x = s.rel[id];
  if (!I) return { ok: false, msg: "지금은 꺼낼 수 없는 말이에요" };
  if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" };
  if (!I.ok) return { ok: false, msg: I.why };
  if (s.ap < 1) return { ok: false, msg: "행동력이 부족해요" };
  const st = WALL.dash[id][I.n - 1];
  s.ap -= 1; x.last = s.t; x.dash = I.n; x.dashT = s.t;
  const text = fillMe(s, st.win && I.quit && st.textQuit ? st.textQuit : st.text);
  return { ok: true, lines: [], scene: openScene(s, { kind: "event", who: id, expr: st.win ? "blush" : "neutral", tag: st.win ? "고백" : "따로 보자고 하기", title: `${c.name} · ${["첫", "두", "세"][I.n - 1]} 번째 말`, text, onChoose: "lv_dash", dashN: I.n,
    choices: [{ t: st.win ? "고개를 끄덕인다" : I.n === 1 ? "알겠다고 하고 돌아선다" : "오늘은 여기까지 듣는다", eff: st.win ? {} : { ...st.eff }, text: "" }] }) };
}
// 사수가 넘어온 다음 날: confess.json 의 사수 장면을 효과 없이 한 번(rel.cfShow: −1 대기 → 본 달)
function confessShow(s, id) {
  const c = CHAR[id], X = CONFESS[id], x = s.rel[id]; if (!c || !X?.scene || !x) return null;
  return { kind: "event", who: id, expr: "blush", tag: "연인", title: `${c.name} · ${X.scene.title}`, text: X.scene.text + memLine(X.mem1, x.mem?.[1]), onChoose: "lv_cfshow",
    choices: (X.ways || []).map((w) => ({ t: w.t, eff: {}, text: w.fit >= 1 ? `${w.react} ${X.answer?.text || ""}${memLine(X.mem2, x.mem?.[2])}`.trim() : `${w.react} ${X.fail || ""}`.trim() })) };
}
// ── 11-24 사수의 귀띔: 사수가 연인·배우자면 눈치가 찼을 때 한 번 귀띔해 준다(연인 12개월·배우자 9개월에 한 번). 경고 횟수는 그대로고 발각 판정도 그대로 굴린다.
function shieldScene(s, id, spouse) {
  const c = CHAR[id], T = WALL.shield?.[id], K = WALL.shield?.[spouse ? "spouse" : "lover"]; if (!c || !T || !K) return null;
  return { kind: "event", who: id, expr: "neutral", tag: "사수의 귀띔", title: `${c.name}의 귀띔`, text: fillMe(s, spouse ? WALL.shield.spouseText?.[id] || T.text : T.text), onChoose: "lv_shield", best: [], // best 빈 칸: 길잡이(추천)를 달지 않는다(눈치는 점수에 안 잡혀 엉뚱한 선택지에 붙는다)
    choices: T.choices.map((ch, i) => { const { perf, ...e } = ch.eff || {}; return { t: ch.t, eff: { ...e, eye: K.cut?.[i] ?? e.eye }, perf: perf || 0, text: fillMe(s, ch.text) }; }) }; // perf(회사 성과)는 applyEff 가 몰라 SCENE_FN.lv_shield 가 넣는다
}
// 사수 첫 장면(새 게임 첫 달에 한 번, data/wall.json first). 사수에게는 일반 '첫 만남' 장면이 뜨지 않는다
export function sasuFirstScene(s) {
  const id = sasuOf(s), F = WALL.first?.[id], c = CHAR[id]; if (s.flags?.sasuFirst !== -1 || !F || !c || !s.rel[id]) return null;
  return { kind: "event", who: id, expr: "neutral", tag: "사수", bg: "desk", title: F.title || `사수 · ${c.name}`, text: fillMe(s, F.text), onChoose: "lv_sasu1", choices: (F.choices || []).map((ch) => ({ t: ch.t, eff: { ...(ch.eff || {}) }, text: fillMe(s, ch.text) })) };
}
// 화면 시험용(ui.js #…-reltest-…): 조건을 맞춰 놓고 장면을 연다. kind: first · talk(id) · turn(id) · dash1~3 · dashlock · shield · shieldsp
export function relDemo(s, kind, id, opt = {}) {
  s.pending = null; s.ap = Math.max(s.ap, 5);
  if (opt.male && s.me.gender !== "M") { const old = sasuOf(s); s.me.gender = "M"; s.flags.sasu = "c102"; s.cast = s.cast.filter((q) => q !== old); delete s.rel[old]; for (const k of Object.keys(s.spot || {})) s.spot[k] = s.spot[k].filter((q) => q !== old); if (!s.cast.includes("c102")) s.cast.push("c102"); const x = ensureRel(s, "c102"); x.aff = Math.max(x.aff, SASU_AFF); } // 시험판(여자 주인공)을 남자 주인공·윤가람 판으로 바꿔 본다
  const sid = sasuOf(s), x0 = CHAR[sid] ? ensureRel(s, sid) : null;
  if (kind === "talk") { const tid = CHAR[id] ? id : sid; if (!s.cast.includes(tid)) s.cast.push(tid); const x = ensureRel(s, tid); x.aff = Math.max(x.aff, 46); x.stage = Math.max(x.stage || 0, 2); return openScene(s, talkScene(s, R(s), tid)); } // 역할 말투 + 업무 밖 말 선택지
  if (kind === "first") { s.flags.sasuFirst = -1; const sc = sasuFirstScene(s); return sc ? openScene(s, sc) : null; }
  if (kind === "turn") { const W = WALL.walls?.[id]; if (!W || !CHAR[id]) return null; if (!s.cast.includes(id)) s.cast.push(id); const x = ensureRel(s, id); delete x.heart; x.lover = false; x.aff = Math.max(x.aff, W.gate + 2); x.pv = W.need; x.meetN = 1; const sc = turnScene(s, id, "talk"); return sc ? openScene(s, sc) : null; }
  if (/^dash[123]$/.test(kind) && x0) { const n = +kind.slice(4), L = WALL.dash?.[sid]; if (!L) return null; s.ng = { ...(s.ng || {}), n: Math.max(2, s.ng?.n || 1) }; delete x0.heart; x0.lover = false; x0.dash = n - 1; delete x0.dashT; x0.aff = Math.max(x0.aff, L[n - 1].aff + 2); x0.stage = Math.max(x0.stage || 0, n === 3 ? 3 : L[n - 1].stage || 0); const res = dashAct(s, sid); return res.ok ? res.scene : null; }
  if (kind === "dashlock" && x0) { s.ng = { ...(s.ng || {}), n: 1 }; s.rd = 1; delete x0.heart; x0.lover = false; x0.dash = 2; delete x0.dashT; x0.aff = Math.max(x0.aff, 72); return sid; } // 1회차 잠금 글(인물 창에서 본다)
  if ((kind === "shield" || kind === "shieldsp") && x0) { const sc = shieldScene(s, sid, kind === "shieldsp"); return sc ? openScene(s, sc) : null; }
  return null;
}
// 11-25 헤어진 달과 이유를 남긴다(rel.exT · rel.exKind: drift 흐지부지 · left 내가 다른 사람에게 감 · letgo 보내 줌). 보내 준 이별(partLove)은 호감을 덜 깎는다
function endLove(s, id, why, kind = "drift", keep = 30, hurt = 12) { const rel = s.rel[id]; rel.lover = false; rel.aff = Math.min(rel.aff, keep); rel.exT = s.t; rel.exKind = kind; s.mental = clamp(s.mental - hurt, 0, 100); log(s, `${CHAR[id].name}: ${why}`, "love"); }
export const partLove = (s, id, why, kind, keep) => endLove(s, id, why, kind || "letgo", keep ?? 55, 6);

export function weddingScene(s, id) {
  const c = CHAR[id];
  // 29번: '결혼 준비 견적' 장면에서 이미 낸 돈은 예식비에서 뺀다(옛 저장은 낸 돈을 몰라 가장 적은 500만으로 본다)
  const paid = s.flags.wedding_planned !== undefined ? (s.flags.wedPaid ?? 500) : 0;
  const cost = (v) => -Math.max(0, v - paid), more = (v) => (paid ? `, 더 낼 돈 ${won(Math.max(0, v - paid))}` : ""), pre = paid ? ` 준비하며 이미 낸 ${won(paid)}은 빼고 계산한다.` : "";
  return { kind: "wedding", who: id, title: `프러포즈 · ${c.name}`, text: (HL.proposeText(s, id) || c.romance?.propose || "반지를 내밀었다. 대답 대신 눈물이 먼저 떨어졌다.") + " 결혼식은 어떻게 할까?" + pre, choices: [
    ...HL.wedOpts(s, id), // 11-25 히로인: 그 사람만의 결혼 방식(예: 식 없는 결혼)
    { t: `스몰 웨딩 (800만${more(800)})`, eff: { cash: cost(800), family: 8 }, text: "가족끼리 조촐하게. 그래서 더 따뜻했다.", wed: true },
    { t: `평범한 예식장 (2,000만, 축의금으로 일부 회수${more(1200)})`, eff: { cash: cost(1200), family: 12 }, text: "300명 하객. 정신없었지만 행복했다.", wed: true },
    { t: `호텔 웨딩 (5,000만${more(4200)})`, eff: { cash: cost(4200), family: 18, mental: 6 }, text: "샹들리에 아래 서약. 카드값은 내일 생각하자.", wed: true },
  ] };
}
function marry(s, id) {
  const rel = s.rel[id], c = CHAR[id];
  for (const k of Object.keys(s.spot || {})) if (Array.isArray(s.spot[k])) s.spot[k] = s.spot[k].filter((x) => x !== id); // 11-25 결혼한 달: 배우자는 그달부터 지도 장소에 서지 않는다(집에 있는 사람)
  rel.lover = false; rel.spouse = true; if (rel.heart == null) rel.heart = s.t; s.fam.spouse = id; s.fam.spouseType = c.romance?.spouseType || "응원형"; s.fam.marriedT = s.t; s.fam.happy = clamp(s.fam.happy + 15, 0, 100);
  try { const amt = WED.saveOf(s, id); if (amt > 0) { s.cash += amt; addMoney(s, "inc", "배우자가 모은 돈", amt); log(s, `${c.name}의 통장을 합쳤다. ${won(amt)}`, "money"); (s.sceneQ = s.sceneQ || []).push(WED.saveScene(s, id, amt)); } } catch (e) { console.warn(e); } // 11-25 배우자가 모은 돈(wed.js SAVE): 신혼집을 구하기 전에 합친다
  // 신혼집: 전세(대출 80%) 또는 투룸 월세
  if (s.house.type === "oneroom") {
    const dep = Math.round(housePrice(s, "jeonse"));
    const need = dep - s.house.dep;
    const loan = Math.round(dep * 0.8);
    if (s.cash + s.house.dep >= dep - loan + 500) { s.cash += s.house.dep - (dep - loan); addLoan(s, "전세대출", loan, 0.038); s.house = { type: "jeonse", dep, rent: 0, value: 0 }; log(s, `신혼집 전세 ${won(dep)} (대출 ${won(loan)})`, "life"); }
    else { s.cash += s.house.dep - 3000; s.house = { type: "wolse2", dep: 3000, rent: 95, value: 0 }; log(s, "신혼집은 투룸 월세로 시작했다.", "life"); }
    void need;
  }
  log(s, `${jo(c.name, "과", "와")} 결혼했다. 배우자는 ${s.fam.spouseType}.`, "love");
}

// ───────── 장면 ─────────
export function openScene(s, sc) {
  // 선택지별 성공 확률을 미리 계산해 둔다
  sc.choices = (sc.choices || []).map((ch) => ({ ...ch, pct: ch.check ? Math.round(chk(s, ch.check) * 100) : null }));
  s.pending = sc; s.stat.scenes++;
  return sc;
}
export function choose(s, i) {
  const sc = s.pending; if (!sc) return null;
  const ch = sc.choices[i]; const r = R(s);
  let res, okv = null;
  if (ch.check) { okv = r.chance(chk(s, ch.check)); res = okv ? ch.ok : ch.ng; } else res = { text: ch.text, eff: ch.eff };
  res = res || { text: "", eff: {} };
  if (res.eff?.flag === "lover" && sc.who && CHAR[sc.who] && isRomanceable(s, CHAR[sc.who]) && !s.rel[sc.who]?.lover && sc.onChoose !== "hl_beat") { const ans = confessAnswer(s, sc.who, sc.onChoose === "lv_ev" ? "" : res.text); if (ans) res = ans; } // 11-24 고백 과정
  curSrc = "sc:" + (sc.id || sc.onChoose || sc.kind || "ev"); // v4.28 장면 능력치 출처
  const lines = applyEff(s, res.eff, sc.who);
  try { lines.push(...sceneStat(s, sc, ch, okv)); } catch (e) { console.warn(e); }
  if (sc.kind === "arc" && sc.who) { s.rel[sc.who].stage = Math.max(s.rel[sc.who].stage, sc.stage); (s.rel[sc.who].mem = s.rel[sc.who].mem || {})[sc.stage] = i; } // mem: 단계마다 고른 선택지(고백 장면이 이 추억을 되짚는다)
  if (sc.kind === "wedding" && ch.wed) { marry(s, sc.who); try { HL.onWed(s, sc.who); } catch (e) { console.warn(e); } lines.push("파이어 목표 30억 → 40억"); s.sceneQ.unshift(story("목표가 바뀌었다", `둘이 살 집, 언젠가 태어날 아이, 양가 부모님. 가계부를 다시 짜 보니 혼자일 때 30억이던 파이어 목표가 40억이 됐어요. 집은 12억에서 15억짜리로, 매달 꺼내 쓸 돈은 600만에서 830만으로. 대신 이제 같이 버는 사람, 저녁에 손을 보태 줄 사람이 있다(행동력 +2).`)); }
  if (sc.onChoose) { const extra = SCENE_FN[sc.onChoose]?.(s, r, i, okv, sc); if (extra) lines.push(...extra); }
  curSrc = null;
  if (s._sceneText) { res = { ...res, text: s._sceneText }; s._sceneText = null; } // 결과가 확률로 갈리는 장면(투자 이벤트)
  if (sc.once && sc.id) s.seen[sc.id] = s.t;
  s.pending = null;
  if (sc.who && sc.onChoose !== "talk_pick" && (okv === true || (res.eff?.aff || 0) >= 6) && r.chance(0.12)) { const k = ch.check?.stat && D.STATS[ch.check.stat] ? ch.check.stat : r.pick(["talk", "charm"]); lines.push(`잘 고른 한마디 · ${D.STATS[k]} +${gainStat(s, k, 1).toFixed(1)}`); } // v4.25: 잘 고르면 가끔 수치도
  if ((okv === true || (res.eff?.aff || 0) >= 8) && sc.kind !== "year") lines.push(...GC.luckyShard(s, 0.05)); // 좋은 선택: 가끔 카드 조각(v4.25)
  if (sc.kind === "event" && !/^(sj_|af_|fam_|talk_|ms_|sn_|hd_|h2_|lv_|hl_|wd_)/.test(sc.onChoose || "")) { const l = SJ.hearInfo(s, r, "event", sc.who); if (l) lines.push(l); }
  return { text: res.text || "", lines, ok: okv, check: ch.check ? `${D.STATS[ch.check.stat]} 판정 ${okv ? "성공" : "실패"}` : null };
}
// 장소 장면(v4.25): 최근 8달 안에 본 장면은 쉬고, 취업·자소서 장면은 컨설팅에 관심 없을 때 덜 나온다
const CS_SCENE = new Set(SCENES.filter((x) => x.id.startsWith("loc_") && /자소서|면접|취준|취업|첨삭|이력서/.test(x.title + x.text)).map((x) => x.id));
function pickLocScene(s, r, loc) {
  if (loc === "office") return pickOffice(s, r);
  let cands = SCENES.filter((x) => x.where === loc && !x.bang && sceneOk(s, x)); // 11-25 느낌표 전용 장면(회식 달 2차·기다리는 사람)은 장소 장면으로 안 뽑는다
  const fresh = cands.filter((x) => s.seen[x.id] === undefined || s.t - s.seen[x.id] >= 8); if (fresh.length) cands = fresh;
  const csOn = SJ.isFound(s, "cs") || (s.sj?.int?.cs || 0) >= 50;
  if (!csOn) { const rest = cands.filter((x) => !CS_SCENE.has(x.id)); if (rest.length && !r.chance(0.25)) cands = rest; }
  return cands.length ? r.pick(cands) : null;
}
// 회사 생활 장면: 다시 나오는 장면은 10달 쉬고, {동료} 장면은 아는 회사 동료 한 명을 넣는다
function mates(s) { return Object.keys(s.rel).filter((id) => { const c = CHAR[id]; return c && (c.co || c.hangouts?.includes("office")) && !s.rel[id].spouse && (!c.hire || (s.co.hired || []).includes(id)); }); }
function mateName(t, name) {
  const P = { 가: ["이", "가"], 이: ["이", "가"], 와: ["과", "와"], 과: ["과", "와"], 를: ["을", "를"], 을: ["을", "를"], 는: ["은", "는"], 은: ["은", "는"] };
  return String(t || "").replace(/\{동료\}(가|이|와|과|를|을|는|은)?/g, (m, p) => p ? jo(name, P[p][0], P[p][1]) : name);
}
export function pickOffice(s, r) {
  const M = mates(s);
  const cands = SCENES.filter((x) => x.where === "office" && !x.bang /* 11-25 회사 종류별 고유 느낌표는 지도 느낌표로만 뜬다 */ && sceneOk(s, x) && !(x.mate && !M.length) && !(x.when?.once === false && s.seen[x.id] !== undefined && s.t - s.seen[x.id] < 10));
  if (!cands.length) return null;
  const tot = cands.reduce((a, x) => a + (x.when?.chance ?? 0.1), 0); let v = r.next() * tot, x = cands[0];
  for (const c of cands) { v -= c.when?.chance ?? 0.1; if (v <= 0) { x = c; break; } }
  if (!x.mate) return { ...x, once: true };
  const id = r.pick(M), nm = CHAR[id].name, f = (t) => mateName(t, nm);
  const fix = (o) => o && { ...o, text: f(o.text) };
  return { ...x, once: true, who: id, title: f(x.title), text: f(x.text), choices: x.choices.map((c) => ({ ...c, t: f(c.t), text: f(c.text), ok: fix(c.ok), ng: fix(c.ng) })) };
}
export function sceneOk(s, x) {
  const w = x.when || {};
  if (x.id === "life_postpartum" && (s.fam.pregnant === null || s.fam.pregnant === undefined)) return false; // 29번: 임신 중에만
  if (w.ageMin && s.age < w.ageMin) return false;
  if (w.ageMax && s.age > w.ageMax) return false;
  if (w.months?.length && !w.months.includes(s.cal)) return false;
  // 11-23 조건 키: 아이 나이 범위(kidMin 이상 kidMax 미만인 아이가 한 명이라도) · 직급 범위(rankMin~rankMax, D.RANKS 순서. 회사에 다닐 때만)
  if (w.kidMin !== undefined || w.kidMax !== undefined) { const lo = w.kidMin ?? 0, hi = w.kidMax ?? 99; if (!s.fam.kids.some((k) => { const a = (s.t - k.born) / 12; return a >= lo && a < hi; })) return false; }
  if (w.co && (s.co.quit || s.co.fired || ![].concat(w.co).includes(s.co.type))) return false; // 11-25 조건 키 co: 그 회사 종류에 다닐 때만(big·fin·mid·public·startup)
  if (w.rankMin !== undefined || w.rankMax !== undefined) { if (s.co.quit || s.co.fired || s.co.retired) return false; const rk = s.co.rank || 0; if (rk < (w.rankMin ?? 0) || rk > (w.rankMax ?? 99)) return false; }
  if (w.once !== false && x.once !== false && s.seen[x.id] !== undefined && (w.once || x.where === "any")) return false;
  for (const q of w.req || []) { const neg = q.startsWith("!"); const k = neg ? q.slice(1) : q; const has = k.split("|").some((kk) => reqHas(s, kk)); if (neg ? has : !has) return false; } // "a|b" = 둘 중 하나
  return true;
}
// v4.27 한 달 장면 몰림 막기: 선택 장면은 한 달 PACE_MAX 개까지. 연말 결산·화보·결혼·특전 같은 큰 장면은 세지 않는다.
// 넘치는 것 중 '선택지 안에 효과가 다 들어 있는'(onChoose 없는) 가벼운 장면만 다음 달로 미룬다(최대 4개 보관, 오래된 것부터 버림).
// onChoose 장면은 그달 상태(s._prCrisis 등)에 기대니 미루지 않는다.
const PACE_MAX = 2;
function paceScenes(s, list, yearSc) {
  const big = (x) => x === yearSc || x.kind === "year" || x.kind === "wedding" || x.cine || x.kind === "perk" || x.once === "big";
  const light = (x) => !big(x) && !x.onChoose && !x.now && (x.kind === "event" || x.kind === "story") && x.choices?.length > 1; // now: 글에 달이 박혀 있어 미루면 안 되는 장면(11-25)
  const later = s.sceneLater || [];
  let n = list.filter((x) => !big(x)).length;
  const keep = [], defer = [];
  for (const x of list) { if (n > PACE_MAX && light(x)) { defer.push(x); n--; } else keep.push(x); }
  while (n < PACE_MAX && later.length) { keep.unshift(later.shift()); n++; }
  s.sceneLater = [...later, ...defer].slice(-4);
  return keep;
}
function reqHas(s, k) {
  if (k === "married") return !!s.fam.spouse;
  if (k === "lover") return Object.values(s.rel).some((x) => x.lover);
  if (k === "kids") return s.fam.kids.length > 0;
  if (k === "house") return s.house.type === "own";
  if (k === "quit") return s.co.quit || s.co.fired;
  if (k === "partyroom") return s.pr.rooms.length > 0;
  if (k === "side") return (s.sj?.active || []).length > 0; // v4.27 투잡 하나라도
  if (k === "consult") return s.cs.open;
  if (k === "space") return (s.sj?.active || []).some((j) => D.SJ_SPACE.includes(j)); // 11-23 가게·공간이 있는 투잡
  if (k === "online") return (s.sj?.active || []).some((j) => !D.SJ_SPACE.includes(j)); // 가게 없이 하는 투잡
  if (k === "platform") return (s.sj?.active || []).some((j) => D.SJ_PLATFORM.includes(j)); // 플랫폼 수수료를 내는 투잡
  return s.flags[k] !== undefined;
}
const SCENE_FN = {
  lv_way(s, r, i, okv, sc) { // 고백 방식 고르기(11-24): 맞는 방식이면 통하고, 어긋나면 흐지부지된다
    const id = sc.who, X = CONFESS[id], rel = s.rel[id], w = X.ways[i], A = X.answer || {}, m2 = memLine(X.mem2, rel.mem?.[2]);
    const pass = w.fit >= 2 || (w.fit === 1 && r.chance(clamp(0.45 + ((s.st.charm || 0) - 50) / 100 + (rel.aff - 70) / 60, 0.2, 0.95)));
    if (w.fit === 0) rel.cfMiss = s.t; // 11-25 어긋난 방식으로 말한 적이 있다(히로인 장면의 조건 cfMiss)
    if (!pass) { const g = addAff(s, id, w.fit === 0 ? -3 : -1); s._sceneText = `${w.react} ${X.fail}`; return [`${CHAR[id].name} 호감 ${sgn(g)}`, "다음 달에 다시 말할 수 있어요"]; }
    const tp = confessType(CHAR[id]); rel.cfDone = tp; if (isLoverArc(CHAR[id].arc?.find((a) => a.stage === 3))) rel.stage = Math.max(rel.stage, 3); /* 11-24 3단계가 고백이 아닌 사람(후배의 첫 후배·첫 발표)은 그 이야기를 건너뛰지 않는다 */ const out = [];
    if (tp === "shy" && A.reject && A.back) { s._sceneText = `${w.react} ${A.reject}`; s.mental = clamp(s.mental - 3, 0, 100); s.sceneQ.unshift(confessBack2(s, id, false)); return ["멘탈 −3"]; }
    if (tp === "late" && A.reject && A.back) { s._sceneText = `${w.react} ${A.reject}`; s.mental = clamp(s.mental - 4, 0, 100); rel.cfBack = s.t; return ["멘탈 −4", "대답을 듣지 못했다"]; }
    s._sceneText = `${w.react} ${A.text || "고개를 끄덕였다."}${m2}`; addAff(s, id, 10); becomeLover(s, id, out); out.push(stL(s, "charm", 1.5, "love")); if (X.day1) rel.day1 = X.day1; s.flags.lover = s.t;
    return out;
  },
  lv_back(s, r, i, okv, sc) { const X = CONFESS[sc.who], rel = s.rel[sc.who]; if (rel?.lover && X?.day1) rel.day1 = X.day1; return []; },
  lv_ev() { return []; }, // 고백 과정 장면(효과는 선택지에 있다)
  talk_pick(s, r, i, okv, sc) {
    const q = sc?.tq?.[i] ?? 1, out = [];
    if (q === 2 && r.chance(0.18)) { const k = r.pick(["talk", "charm", "sense"]); out.push(`대화가 잘 풀렸다 · ${D.STATS[k]} +${gainStat(s, k, 1).toFixed(1)}`); }
    if (q >= 1) { const l = SJ.hearInfo(s, r, "people", sc.who); if (l) out.push(l); }
    if (sc?.pv === i && s.rel[sc.who]) { s.rel[sc.who].pvAsk = s.t; pvCount(s, sc.who); const tr = turnScene(s, sc.who, "talk"); if (tr) s.sceneQ.unshift(tr); } // 11-24 업무 밖 말: 횟수를 세고, 문턱을 넘었으면 말 걸기 뒤에 전환 장면이 이어진다
    return out;
  },
  lv_turn() { return []; }, // 전환 장면(효과는 선택지에 있다. 표시는 장면이 뜰 때 이미 바뀌었다)
  lv_sasu1(s) { s.flags.sasuFirst = s.t; return []; }, // 사수 첫 장면을 봤다
  lv_dash(s, r, i, okv, sc) { // 사수에게 따로 보자고 하기: 1·2번째는 거절(효과는 선택지), 3번째는 그 자리에서 ♥ + 연인
    const id = sc.who, x = s.rel[id], st = WALL.dash?.[id]?.[(sc.dashN || 1) - 1]; if (!x || !st?.win) return [];
    const out = [], e = st.eff || {};
    if (x.heart == null) x.heart = s.t;
    if (e.aff) out.push(`${CHAR[id].name} 호감 ${sgn(addAff(s, id, e.aff))}`);
    x.cfDone = x.cfDone || confessType(CHAR[id]); if ((s.co.quit || s.co.fired) && (x.stage || 0) < 3) x.stage = 3; // 회사를 나와 팀이 갈린 길: 발령 이야기(3단계)는 건너뛴다
    becomeLover(s, id, out); if ((e.mental || 0) !== 10) s.mental = clamp(s.mental + (e.mental || 0) - 10, 0, 100); // becomeLover 가 멘탈 +10 을 준다(자료 값과 같다)
    out.push(stL(s, "charm", 1.5, "love")); s.flags.lover = s.t;
    if (CONFESS[id]?.day1) x.day1 = CONFESS[id].day1;
    if (CONFESS[id]?.scene) { x.cfShow = -1; const q = confessShow(s, id); if (q) s.sceneQ.unshift(q); } // 다음 날 장면(효과 없음). 못 보고 달이 넘어가면 달 마감에 다시 넣는다(peopleMonth)
    return out;
  },
  lv_cfshow(s, r, i, okv, sc) { const x = s.rel[sc.who]; if (x) x.cfShow = s.t; return []; },
  lv_shield(s, r, i, okv, sc) { const p = sc.choices?.[i]?.perf || 0; if (!p) return []; s.co.perf = clamp(s.co.perf + p, 0, 100); return [`회사 성과 ${sgn(p)}`]; }, // 사수의 귀띔: 성과(perf)만 여기서 넣는다
  fam_oppose(s, r, i, okv) { if (i === 2 || (i === 0 && okv === false)) { s.fam.opposeUntil = s.t + 6; return ["6개월 동안 배우자 도움 없음(행동력 −1)"]; } return []; },
  baby(s, r, i) { if (i === 0) { s.fam.pregnant = s.t + 10; return ["10개월 뒤 아기가 온다"]; } s.flags.noKidUntil = s.t + 18; return []; },
  house_buy(s, r, i) { const o = s.pending?.opts?.[i] || s._houseOpts?.[i]; if (!o) return []; return buyHouse(s, o); },
  sj_disc(s, r, i) { return SJ.discChoose(s, s.pending, i); },
  sj_intro(s, r, i) { return SJ.introChoose(s, i); },
  sj_grind(s, r, i) { return SJ.grindChoose(s, r, i); },
  sj_pick(s, r, i, okv, sc) { return SJ.pickChoose(s, r, i, sc); }, // 11-24 6개월 차에 고르기·해마다 다시 묻기·하나 더
  rejob_offer(s, r, i) { if (i === 0) { s.co.type = s._offer.type; s.co.name = s._offer.name; s.co.pay = 0; s.co.eye = 0; s.co.warns = 0; s.co.perf = 50; s.co.boss = 45; s.co.remote = 0; s.co.payBoost = Math.min(1.3, (s.co.payBoost || 1) * 1.1); delete s.co.party; fixCoSpots(s); /* 11-25 회사 종류가 바뀌면 장소·지도 자리도 바뀐다 */ log(s, `${jo(s.co.name, "으로", "로")} 환승 이직했다. 연봉 +10%`, "work"); return [`${s.co.name} 입사`, "월급 +10%"]; } return []; },
  co_ev(s, r, i) { return coEvChoose(s, r, s.pending.ev, i); },
  cs_ev(s, r, i, ok) { return CS.csEvChoose(s, i, ok); },
  cs_ag(s, r, i, ok, sc) { return CS.agChoose(s, sc, i); }, // 11-25 마케팅 대행사
  pr_crisis(s, r, i, ok) { return PR.crisisChoose(s, i, ok); },
  pr_furn(s, r, i) { return PR.furnChoose(s, i); },
  pr_want(s, r, i) { return PR.wantChoose(s, i); }, // 11-25 부동산에 원하는 조건 말하기
  full_ev(s, r, i) { if (i !== 0) return []; const job = s._fullJob; const res = quitCompany(s); if (!res.ok) return [res.msg]; s.fullJob = job; s.moments = s.moments || {}; s.moments.quit = s.t; log(s, `${jo(D.SIDEJOBS[job]?.n || "투잡", "을", "를")} 본잡으로. 회사를 나왔다.`, "work"); return ["본잡 전환", "행동력 +5", "월급 끊김"]; },
  ab_raid(s, r, i, ok) { return AB.raidChoose(s, i, ok); },
  inv_ev(s, r, i) { const e = D.INV_EV.find((x) => x.id === s.pending.ev); const c = e?.choices[i]; return c ? invChoose(s, r, c) : []; },
  tax_ev(s, r, i, ok) { if (i === 0) { s.taxPro = true; log(s, "세무사에게 투잡 세금을 맡겼다.", "money"); return ["세무사 고용: 세금 −15%, 월 기장료 15만"]; } if (i === 1 && !ok) { s.taxPen = 0.1; return ["가산세 +10%"]; } if (i === 2) { s.taxDodge = s.year; return ["…"]; } return []; },
  pr_bedcall(s, r, i) { return PR.bedCallChoose(s, i); }, // 11-26 구청 전화: 지금 침대를 버릴지
  pr_offer(s, r, i, ok) { const o = s._prOffer; if (!o) return []; if (i === 0) return PR.sellRoom(s, o.id, o.price, "권리금 받고 매각"); if (i === 2 && ok) return PR.sellRoom(s, o.id, Math.round(o.price * 1.2), "권리금 받고 매각(흥정 성공)"); return []; },
  pr_exit(s, r, i, ok) { const o = s._prExit; if (!o) return []; if (i === 0) return PR.sellAll(s, o.price); if (i === 2 && ok) return PR.sellAll(s, Math.round(o.price * 1.15)); return []; },
};
// 플러그인 장면 선택 처리(onChoose 이름은 접두사로 시작: 예 "tr_ev")
for (const X of REG.STORY) for (const [k, fn] of Object.entries(X.choose || {})) { if (SCENE_FN[k] || !k.startsWith(X.prefix)) console.warn(`[이야기 보강] ${X.key}: onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; }
for (const [k, fn] of Object.entries(AFF_CHOOSE)) SCENE_FN[k] = fn;
for (const [k, fn] of Object.entries({ ...MT_CHOOSE, ...GS_CHOOSE })) SCENE_FN[k] = fn;
for (const [k, fn] of Object.entries(RV_CHOOSE)) { if (SCENE_FN[k] || !k.startsWith("rv_")) console.warn(`[라이벌] onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; }
for (const [k, fn] of Object.entries({ ...PR.PR_CHOOSE, ...AB.AB_CHOOSE, ...UC.UC_CHOOSE })) { if (SCENE_FN[k]) console.warn(`[공간 타이쿤] onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; } // v4.28 후기·가격 전쟁·명의
for (const [k, fn] of Object.entries(WV_CHOOSE)) SCENE_FN[k] = fn;
for (const k of ["x_pe", "x_cross", "x_nick", "x_burn"]) if (!SCENE_FN[k]) SCENE_FN[k] = () => []; // 11-25 조연 장면 처리 이름: 효과는 선택지에 다 들어 있다. 이름만 등록해 둔다
SCENE_FN.sp_ev = (s, r, i, okv, sc) => SPO.choose(s, r, i, okv, sc); // 11-25 배우자 "그만둘까"·"다시 일해 볼까"
SCENE_FN.x_nag = () => [`부모님의 걱정이 ${XR.NAG.months}달 간다: 달마다 멘탈 ${XR.NAG.mental} · 행동력 ${XR.NAG.ap}`]; // 마흔·마흔다섯 잔소리(11-24). 벌점은 extras.js nagMonth 가 달마다 준다
for (const [k, fn] of Object.entries(LOVE.LV_CHOOSE)) SCENE_FN[k] = fn; // 연애 확장(11-24)
for (const k of ["wd_ask", "wd_wait", "wd_nv", "wd_glad"]) { if (SCENE_FN[k]) console.warn(`[결혼 성향] onChoose ${k} 이름 확인`); else SCENE_FN[k] = (...a) => WED.WD_CHOOSE[k](...a, { weddingScene, endLove }); } // 11-25 결혼 성향(wed.js). 늦게 찾기 + 결혼식 고르기·이별은 여기 것을 넘겨 쓴다
for (const [k, fn] of Object.entries(HL.HL_CHOOSE)) SCENE_FN[k] = fn; // 히로인·히어로 이야기(11-25)
for (const [k, fn] of Object.entries(PW_CHOOSE)) SCENE_FN[k] = fn;
for (const [k, fn] of Object.entries(CHB_CHOOSE)) SCENE_FN[k] = fn; // 판이 바뀐다(11-23)
for (const [k, fn] of Object.entries(MK_CHOOSE)) { if (SCENE_FN[k] || !k.startsWith("mk_")) console.warn(`[시장] onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; }
for (const [k, fn] of Object.entries(INS.CHOOSE)) { if (SCENE_FN[k] || !k.startsWith("ig_")) console.warn(`[인별] onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; } // 인별 v2 장면
for (const k of ["ms_q", "sn_q", "ms_side", "hd_hint", "hd_time"]) { if (SCENE_FN[k]) console.warn(`[스승·히든 길] onChoose ${k} 이름 확인`); else SCENE_FN[k] = (...a) => (MS_CHOOSE[k] || HD_CHOOSE[k])(...a); } // 늦게 찾기: mentor.js·hidden.js 를 먼저 불러도 순환 참조가 안 깨지게
for (const k of ["h2_hint", "h2_resv", "h2_era", "h2_tf", "h2_deja"]) { if (SCENE_FN[k]) console.warn(`[히든 길2] onChoose ${k} 이름 확인`); else SCENE_FN[k] = (...x) => H2_CHOOSE[k](...x); } // v4.30 늦게 찾기
for (const [k, fn] of Object.entries(JP_CHOOSE)) { if (SCENE_FN[k] || !k.startsWith("jp_")) console.warn(`[한방 전략] onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; }
for (const [k, fn] of Object.entries(FAM_CHOOSE)) { if (SCENE_FN[k] || !k.startsWith("fam_")) console.warn(`[가족 이벤트] onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; }
for (const P of REG.JOBS) for (const [k, fn] of Object.entries(P.choose || {})) { if (SCENE_FN[k] || !k.startsWith(P.prefix)) console.warn(`[투잡 등록표] ${P.key}: onChoose ${k} 이름 확인`); else SCENE_FN[k] = fn; }

// ───────── 집 ─────────
// 집값 흐름(대표 결정 11-25): 꾸준히 오르지 않고 오르내린다. 길게 보면 조금만 오른다(해마다 trend). 떨어질 때 사면 회복분을 번다.
// 흐름은 판마다 다르다(주기 7~11년, 시작 위치는 씨앗에서). 매물 값·전세 보증금·내 집 값이 모두 같은 흐름을 탄다. 엔진 난수는 안 쓴다.
export const HOUSE_MKT = { trend: 0.012, amp: 0.17, period: [84, 132], noise: 0.004 };
function hmk(s) { if (!s.hmk) { let h = hashStr(String(s.seed) + ":house"); const u = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) | 0; return ((h >>> 0) % 100000) / 100000; }; s.hmk = { p: Math.round(HOUSE_MKT.period[0] + u() * (HOUSE_MKT.period[1] - HOUSE_MKT.period[0])), ph: u() }; } return s.hmk; }
const hCyc = (s, t) => { const k = hmk(s); return Math.sin(2 * Math.PI * (t / k.p + k.ph)); };
export function houseIdx(s, t = s.t) { return Math.pow(1 + HOUSE_MKT.trend, t / 12) * (1 + HOUSE_MKT.amp * hCyc(s, t)); }
// 지금 시세가 흐름의 어디쯤인지: pct = 흐름 평균보다 몇 % 위아래 · dir = 오르는 중·내리는 중 · turn = 이번 달이 꼭대기("top")·바닥("bottom")
export function houseMood(s, t = s.t) { const c = hCyc(s, t), d0 = hCyc(s, t) - hCyc(s, t - 1), d1 = hCyc(s, t + 1) - hCyc(s, t); return { pct: Math.round(c * HOUSE_MKT.amp * 100), dir: d1 >= 0 ? "up" : "down", turn: d0 > 0 && d1 <= 0 ? "top" : d0 < 0 && d1 >= 0 ? "bottom" : "" }; }
export function houseMoodText(s) { const m = houseMood(s), a = Math.abs(m.pct); return m.pct >= 10 ? `집값이 꼭대기 근처다(흐름 평균보다 +${a}%). ${m.dir === "down" ? "꺾이기 시작했다." : "아직 오르는 중이다."} 기다리면 내려올 수 있다.` : m.pct <= -10 ? `집값이 바닥 근처다(흐름 평균보다 −${a}%). ${m.dir === "up" ? "돌아서기 시작했다." : "아직 내리는 중이다."} 이럴 때 사면 회복분을 번다.` : m.dir === "up" ? `집값이 오르는 중이다(평균 ${m.pct >= 0 ? "+" : "−"}${a}%).` : `집값이 내리는 중이다(평균 ${m.pct >= 0 ? "+" : "−"}${a}%). 더 기다려 볼 만하다.`; }
export function housePrice(s, kind) {
  const yrs = s.t / 12, boom = s.era.house ? 1.12 : 1;
  const base = { apt: 72000, villa: 32000, jeonse: 26000 }[kind] || 30000;
  void yrs; return Math.round(base * houseIdx(s) * boom * (s.housePriceNoise || 1)); // 11-25 전에는 해마다 3.5%씩 꾸준히 올랐다
}
function houseScene(s, r) {
  const opts = [
    { kind: "apt", n: "수도권 신축 아파트 34평", price: housePrice(s, "apt") * r.range(0.85, 1.1) },
    { kind: "villa", n: "서울 구축 빌라 24평", price: housePrice(s, "villa") * r.range(0.85, 1.1) },
  ].map((o) => ({ ...o, price: Math.round(o.price / 100) * 100 }));
  s._houseOpts = opts;
  return { kind: "house", title: "내 집 마련", text: `중개사가 매물 두 개를 보여 줬다. 대출은 집값의 70%까지(연 4.2%). 지금 현금 ${won(s.cash)}. ${houseMoodText(s)}`, onChoose: "house_buy", opts, choices: [
    ...opts.map((o) => ({ t: `${o.n} · ${won(o.price)} (계약금 ${won(o.price * 0.3 + o.price * 0.03)})`, eff: {}, text: "" })),
    { t: "아직은 아니다", eff: {}, text: "집은 도망가지 않는다. 가격이 도망갈 뿐." },
  ] };
}
function buyHouse(s, o) {
  const down = o.price * 0.3 + o.price * 0.03; // 취득세·중개 3%
  // 11-25 갈아타기: 집이 있는데 또 사면 살던 집을 팔고(집값 − 남은 담보대출) 새 집을 산다. 전에는 먼저 산 집 값이 사라지고 담보대출만 쌓였다
  const own = s.house.type === "own", oldV = own ? s.house.value || 0 : 0, ml = own ? s.loans.find((l) => l.n === "주택담보대출") : null;
  const avail = s.cash + (s.house.dep || 0) - (s.loans.find((l) => l.n === "전세대출")?.amt || 0) + oldV - (ml?.amt || 0);
  if (avail < down) return ["돈이 모자라 계약하지 못했다"];
  if (own) { s.cash += oldV; if (ml) { s.cash -= ml.amt; s.loans = s.loans.filter((l) => l !== ml); } log(s, `살던 집을 ${won(oldV)}에 팔았다.`, "life"); }
  // 전세 보증금 회수·전세대출 상환
  s.cash += s.house.dep || 0; const jl = s.loans.find((l) => l.n === "전세대출"); if (jl) { s.cash -= jl.amt; s.loans = s.loans.filter((l) => l !== jl); }
  s.cash -= down; addLoan(s, "주택담보대출", Math.round(o.price * 0.7), 0.042, true);
  s.house = { type: "own", dep: 0, rent: 0, value: o.price, kind: o.kind };
  log(s, `${jo(o.n, "을", "를")} 샀다. ${won(o.price)}`, "life");
  return [`${o.n} 매수`, `주택담보대출 ${won(o.price * 0.7)}`];
}

// ───────── 돈 ─────────
export function addLoan(s, n, amt, rate, amort = false) { const l = s.loans.find((x) => x.n === n); if (l) { l.amt += amt; l.rate = rate; } else s.loans.push({ n, amt, rate, amort }); }
export function debt(s) { return s.loans.reduce((a, l) => a + l.amt, 0); }
export function creditRoom(s) { // 마이너스로 버틸 수 있는 한도(신용대출 자동)
  const lim = (s.co.quit || s.co.fired) ? 1500 : Math.round(salary(s) * 12 * 1.0);
  const used = s.loans.find((l) => l.n === "신용대출")?.amt || 0;
  return Math.max(0, lim - used);
}
export function salary(s) {
  if (s.co.quit || s.co.fired) return 0;
  const t = D.COMPANY_TYPES[s.co.type];
  let p = t.pay * D.RANKS[s.co.rank].pay * (s.co.payIdx || 1) * (s.co.payBoost || 1);
  if (s.co.discipline > 0) p *= 0.9;
  if (s.burnLeft > 0) p *= 0.7;
  return Math.round(p);
}
// 배우자 수입(11-25): 인물별 나이마다의 연봉표, 승진, 육아휴직 급여, 퇴사는 engine/spouse.js 가 맡는다
export function spouseIncome(s) { if (!s.fam.spouse) return 0; try { return SPO.payNow(s); } catch (e) { return 270; } }
export const spouseStat = (s) => { try { return SPO.statLine(s); } catch (e) { return ""; } };
// 나라에서 달마다 주는 아이 지원금(11-25, defs.js KID_AID): 부모 급여(0·1세) + 아동 수당 + 아이가 둘이면 다자녀 수당
export function kidAid(s) { const A = D.KID_AID, K = s.fam.kids || []; if (!K.length) return 0; let a = 0; for (const k of K) { const y = (s.t - k.born) / 12; a += y < 1 ? A.parent[0] : y < 2 ? A.parent[1] : 0; if (y < A.childTo) a += A.child; } if (K.length >= 2 && K.some((k) => (s.t - k.born) / 12 < A.multiTo)) a += A.multi; return a; }
export function kidAidScene(s, amt) {
  const A = D.KID_AID;
  return { kind: "event", tag: "나라 지원", title: "다자녀 가구가 됐다", once: "big", bg: "civil",
    text: `주민센터 창구. 둘째 출생신고서를 내밀자 직원이 서류 뭉치를 하나 더 꺼낸다. {주민센터 직원}"둘째시네요. 오늘부터 다자녀 가구세요. 받으실 게 좀 많습니다." 형광펜이 세 줄을 긋는다. 축하금 ${won(amt)}, 다자녀 수당 달마다 ${A.multi}만(막내가 ${A.multiTo}세가 될 때까지), 부모 급여와 아동 수당은 아이마다 따로. {주민센터 직원}"신청서는 한 장이면 됩니다. 사인은 여기요."`,
    choices: [{ t: "사인한다", eff: { mental: 3 }, text: "통장에 처음 보는 이름으로 돈이 들어왔다. '다자녀'. 나쁘지 않은 이름이다." }] };
}
export function kidCost(s) { return Math.round(SPO.kidCut(s) * s.fam.kids.reduce((a, k) => { const y = (s.t - k.born) / 12; return a + (y < 1 ? 120 : y < 8 ? 80 : y < 14 ? 110 : y < 20 ? 150 : 40); }, 0)); } // 11-25 배우자가 일을 그만두면 돌봄 비용이 준다
export function livingCost(s) {
  const base = s.fam.spouse ? D.LIVING.married : D.LIVING.single;
  const infl = Math.pow(1.022, s.t / 12) * (s.piX || 1);
  const creep = (1 + Math.max(0, s.age - 27) * 0.012) * (1 + Math.min(0.35, Math.max(0, (avgSide(s) - 100) / 1500))); // 나이·버는 만큼 씀씀이가 는다
  return Math.round(base * infl * creep * mod(s, "livingMult", 1) + kidCost(s));
}
export function housingCost(s) { let c = s.house.rent || 0; if (s.house.type === "own") c += Math.round(s.house.value * 0.0006); return c; }
export function loanPay(s) { return s.loans.reduce((a, l) => a + l.amt * (l.rate + (s.era.rate ? 0.02 : 0)) / 12 + (l.amort ? l.amt / 360 : 0), 0); }
function avgSide(s) { const h = s.hist.slice(-6); return h.length ? h.reduce((a, x) => a + x.side, 0) / h.length : 0; }
const plugSum = (s, f) => REG.JOBS.reduce((a, P) => { if (!P[f] || !s[P.key]) return a; try { return a + (+P[f](s) || 0); } catch (e) { return a; } }, 0);
export function netWorth(s) { return s.cash + s.invest + (s.house.dep || 0) + (s.house.value || 0) + PR.value(s) + AB.value(s) + UC.value(s) + plugSum(s, "value") + platValue(s) - debt(s); }
// 운영 중인 AI 플랫폼·가맹 사업의 가치(1년 순이익의 3배)
function platValue(s) { const P = s.big?.plat; let v = 0; if (P?.live && P.last) v += Math.max(0, (P.last.rev - P.last.cost) * 36); if (s.big?.fran?.n) v += s.big.fran.n * 90 * 36; return Math.round(v); }
export function bizPassive(s) { const P = s.big?.plat; return PR.passive(s) + CS.passive(s) + AB.passive(s) + UC.passive(s) + plugSum(s, "passive") + (s.big?.fran?.n ? s.big.fran.n * 90 : 0) + (P?.live && P.last ? Math.max(0, P.last.rev - P.last.cost) : 0); }
export function passive(s) { return Math.round(s.invest * 0.04 / 12 + bizPassive(s) * 0.5); }
export function monthlySpend(s) { return livingCost(s) + housingCost(s) + Math.round(loanPay(s)); }
// 버틸 수 있는 달 수: (현금+투자금+남은 신용 한도) ÷ 한 달 적자. 흑자면 Infinity
export function runway(s) {
  const h = s.hist.slice(-3), side = h.length ? h.reduce((a, x) => a + x.side, 0) / h.length : 0;
  const net = salary(s) + spouseIncome(s) + side - monthlySpend(s);
  const pool = Math.max(0, s.cash) + s.invest + creditRoom(s);
  return { net: Math.round(net), pool: Math.round(pool), credit: creditRoom(s), late: s.debtLate || 0, months: net >= 0 ? Infinity : Math.max(0, Math.floor(pool / -net)) };
}
export function fireInfo(s) {
  const spend = monthlySpend(s);
  const nw = netWorth(s), target = (s.fam.spouse ? D.FIRE_TARGET.married : D.FIRE_TARGET.single) * (s.ng?.hard ? 1.25 : 1);
  const p = passive(s), biz = Math.round(bizPassive(s) * 0.5);
  // 사업에서 저절로 들어오는 돈이 생활비를 넘으면 목표의 60%만 모아도 된다(투자 이자는 순자산에 이미 들어 있다)
  const pRatio = nw >= target * 0.6 ? Math.min(1, biz / Math.max(1, spend)) : 0;
  const ratio = Math.max(nw / target, pRatio);
  return { spend, nw, target, passive: p, ratio: clamp(ratio, 0, 3), ready: ratio >= 1 && s.age >= 30 && !s.fireAt };
}

// ───────── 달 마감 ─────────
export function endMonth(s) {
  if (s.pending || s.over || s.ended) return null;
  const r = R(s), M = s.month, notes = M.notes;
  const scenes = [];
  if (s.t === 0) { const f = sasuFirstScene(s); if (f) scenes.push(f); } // 11-24 사수 첫 장면: 화면이 첫 달 머리에 못 띄웠으면(봇·자동 진행) 첫 달 장면 줄 맨 앞에 넣는다
  if (!s.yr0) yearMark(s); // 연말 결산 기준점(새 판 첫 달·옛 저장)
  // 1) 회사
  const sal = salary(s);
  if (sal) { s.cash += sal; addMoney(s, "inc", "월급", sal); }
  const spIn = spouseIncome(s); if (spIn) { s.cash += spIn; addMoney(s, "inc", "배우자 수입", spIn); }
  companyMonth(s, r, notes, scenes);
  // 2) 투잡
  const prProfit = PR.month(s, r, notes, scenes);
  const csProfit = CS.month(s, r, notes, scenes);
  SJ.month(s, r, notes);
  if (SJ.isActive(s, "insta")) INS.month(s, r, notes, scenes);
  const abProfit = SJ.isActive(s, "airbnb") ? AB.month(s, r, notes, scenes) : 0; void abProfit;
  if (SJ.isActive(s, "ucafe")) UC.month(s, r, notes, scenes);
  const plugRet = {}; for (const P of REG.JOBS) { if (SJ.isActive(s, P.key)) plugRet[P.key] = P.month(s, r, notes, scenes) || 0; else if (P.idle) P.idle(s, r, notes); }
  for (const X of REG.STORY) { if (SJ.isActive(s, X.key) && s.sx?.[X.key]) { try { X.month(s, r, notes, scenes); } catch (e) { console.warn("[이야기 보강]", X.key, e); } } } // 기존 투잡 이야기 이벤트
  BIG.month(s, r, notes, scenes);
  rivalMonth(s, r, notes, scenes); // 라이벌(v4.25): 투잡 이익 압박·반사이익, 등장·이벤트
  for (const j of (s.sj?.active || [])) { const k = j === "cs" ? D.NICHES[s.cs?.niche || "newgrad"]?.stat : D.MG_STAT.of[j]; if (k) gainStat(s, k, D.JOB_XP, "jobxp_" + j); } // v4.28d 실전 경험
  hiddenMonth(s, r, notes, scenes); hidden2Month(s, r, notes, scenes); // 히든 길(v4.29) + 다른 방식의 히든 길(v4.30, s.h2.cut·ap): 조건·낌새·문 열림·보상(s.hid.cutNow → market.js sideCut)
  spaceMonth(s, r, notes); // 공간형 유지비(v4.27): 재계약 5%·가구 교체·규모 문제
  marketMonth(s, r, notes, scenes); waveMonth(s, r, notes, scenes); // 시장 충격(v4.25b): 라이벌 압박 뒤 남은 이익에 시장 배수, 새 충격 장면
  msFix(s); mentorMonth(s, r, notes, scenes); // 스승·선배(v4.29): 스승의 편지·보험 특강·인별 DM·투잡 인연
  jackpotMonth(s, r, notes, scenes); // 한방 전략(v4.27): 고정 수입·이익 배율·결과·새 제안(다른 event 장면 있으면 제안 쉼)
  if ([3, 4, 9, 10].includes(s.cal) && SYN.on(s, "season")) { s.mental = clamp(s.mental - 2, 0, 100); notes.push("성수기 충돌: 컨설팅 문의와 파티룸 주말 관리가 겹쳤다(멘탈 −2)"); }
  if (s.grad && !s.grad.done) {
    const G = s.grad, g = D.GRADS[G.k]; s.cash -= g.fee; addMoney(s, "exp", "대학원 등록금", g.fee);
    if (s.t - G.t0 + 1 >= g.months) {
      if (G.n >= g.need) { G.done = true; G.doneT = s.t; for (const [k, v] of Object.entries(g.done)) s.st[k] = clamp(s.st[k] + v, 0, statCap(s)); scenes.push(story("학위 수여식", `${g.n}을 졸업했다. 학사모를 던지는 대신 회사로 돌아가 보고서를 썼다. (${Object.entries(g.done).map(([k, v]) => `${D.STATS[k]} +${v}`).join(", ")})`)); log(s, `${g.n} 졸업`, "life"); }
      else { G.t0 += 6; notes.push(`대학원 수업 일수 부족(${G.n}/${g.need}): 한 학기 연장`); }
    }
  }
  s.pi = (s.pi || 1) * (1 + (D.INFL + (s.era.infl ? 0.04 : 0)) / 12); s.piX = (s.piX || 1) * (1 + (s.era.infl ? 0.04 : 0) / 12);
  if (s.t === 0 && !s.sj.open) { scenes.push(SJ.introScene()); scenes.push(SJ.grindScene()); }
  SJ.grindMonth(s, r, notes, scenes); // 탐색의 3개월
  SJ.candMonth(s, notes, scenes); // 후보가 모였다
  SJ.pickMonth(s, r, notes, scenes); // 11-24 고르는 때(6개월·해마다·하나 더)
  // 조력자 수고비
  let hp = 0; for (const [id, x] of Object.entries(s.rel)) if (x.helper && !x.spouse) { const p = helperPay(s, id); hp += p; if (x.aff < 35) { x.helper = null; notes.push(`${jo(CHAR[id].name, "이", "가")} 조력을 그만뒀다(호감 부족)`); } else addAff(s, id, 0.5); }
  if (hp) { s.cash -= hp; addMoney(s, "exp", "조력자 수고비", hp); }
  // 3) 생활비·주거·대출·아이·간병
  const liv = livingCost(s); s.cash -= liv; addMoney(s, "exp", "생활비", liv - kidCost(s)); if (kidCost(s)) addMoney(s, "exp", "아이", kidCost(s)); { const aid = kidAid(s); if (aid) { s.cash += aid; addMoney(s, "inc", "아이 지원금", aid); } } // 11-25 나라 지원(달마다)
  const hc = housingCost(s); if (hc) { s.cash -= hc; addMoney(s, "exp", s.house.type === "own" ? "집 관리비·세금" : "월세", hc); }
  const lp = Math.round(loanPay(s)); if (lp) { s.cash -= lp; addMoney(s, "exp", "대출 이자·상환", lp); for (const l of s.loans) if (l.amort) l.amt = Math.max(0, l.amt - l.amt / 360); }
  if (s.fam.parents < 45 && s.fam.parents > 0) { s.cash -= 40; addMoney(s, "exp", "부모님 간병", 40); }
  // 세금: 5월 종합소득세
  // 세무사: 투잡 이익이 커지면 안내문이 온다. 맡기면 매달 기장료 대신 세금이 줄고 실수가 없다
  if (s.taxPro) { s.cash -= 15; addMoney(s, "exp", "세무사 기장료", 15); }
  if (s.cal === 4 && !s.taxPro && s.lastYearSide >= (s.taxAsk ? 5000 : 2000) && (s.taxAskT ?? -99) < s.t - 6) {
    s.taxAsk = (s.taxAsk || 0) + 1; s.taxAskT = s.t;
    const est = Math.round(s.lastYearSide * 0.11);
    scenes.push({ kind: "event", tag: "세금", title: s.taxAsk > 1 ? "세무사 친구의 잔소리" : "종합소득세 신고 안내문", onChoose: "tax_ev", text: (s.taxAsk > 1 ? `"작년 투잡 수입이 ${won(s.lastYearSide)}? 그 정도면 혼자 하다 큰일 나." 경비 처리만 잘해도 세금이 확 준다고 한다.` : `국세청 안내문이 왔다. 작년 투잡 이익 ${won(s.lastYearSide)}, 예상 세금 약 ${won(est)}. 5월까지 신고해야 한다. 영수증은 서랍 어딘가에…`), choices: [
      { t: "세무사에게 맡긴다 (월 기장료 15만)", eff: {}, text: "세무사가 경비를 꼼꼼히 챙겨 줬다. 앞으로 세금 15% 절약, 가산세 걱정 끝." },
      { t: "홈택수로 직접 한다", check: { stat: "num", dc: 58 }, ok: { text: "밤새 영수증과 씨름했다. 제대로 냈다.", eff: { mental: -3 } }, ng: { text: "경비 항목을 잘못 넣었다. 가산세 10%가 붙는다.", eff: { mental: -5 } } },
      { t: (s.co.quit || s.co.fired) ? "이번엔… 신고 안 해도 되겠지?" : "투잡은… 신고 안 해도 되겠지?", eff: {}, text: (s.co.quit || s.co.fired) ? "이번 5월은 조용히 넘어갔다. 회사 그늘이 없는 지금, 정말 괜찮을까." : "회사원이라 그런지 아무 연락도 없었다. 휴." },
    ] });
  }
  if (s.auditAt && s.t >= s.auditAt) { const amt = s.auditAmt || 0; s.auditAt = null; s.cash -= amt; addMoney(s, "exp", "세무조사 추징", amt); if (!(s.co.quit || s.co.fired)) s.co.eye = clamp(s.co.eye + 10 * eyeMult(s), 0, 100); scenes.push(story("세무조사 통지", `신고 안 한 투잡 수입이 잡혔다. 본세에 가산세까지 ${won(amt)} 추징. ${s.co.quit || s.co.fired ? "회사 그늘이 없으니 통지서는 곧장 내 이름으로 왔다." : "회사 원천징수 담당자도 눈치챘다."} 이제라도 세무사를 찾아야겠다.`)); s.taxAsk = 0; s.taxAskT = -99; }
  if (s.cal === 5 && s.lastYearSide > 0) { const tax = Math.round(s.lastYearSide * 0.11 * mod(s, "taxMult", 1) * (helpers(s, "tax").length ? 0.8 : 1) * (s.era.tax ? 1.2 : 1) * (s.taxPro ? 0.85 : 1) * (1 + (s.taxPen || 0))); s.taxPen = 0;
    if (s.taxDodge === s.year) { if (s.co.quit || s.co.fired) s.auditAt = s.t + r.int(12, 24); /* 회사원은 원천징수라 잘 안 걸린다. 전업이면 1~2년 뒤 조사 */ s.auditAmt = Math.round(tax * 1.45); notes.push("종합소득세: 신고 안 함…"); } else if (tax > 0) { s.cash -= tax; addMoney(s, "exp", "종합소득세", tax); notes.push(`5월 종합소득세 ${won(tax)}`); } }
  // 투자
  invPhase(s, r, notes); if (s.invest > 0) { const PH = D.INV_PH, ph = s.invPh; const mu = D.INV.mu - ((s.sj?.active || []).length ? PH.sideChurn : 1) * (D.INV.churn || 0) * (s.invHabit ?? 1) + (ph.p === "b" ? PH.bearMu : ph.p === "r" ? PH.recMu : 0) + (s.era.slump ? -0.01 : 0) + (s.era.winter ? -0.008 : 0) + (s.era.recovery ? 0.006 : 0) + helperPower(s, "invest") * 0.001; const ret = Math.round(s.invest * (mu + D.INV.sd * r.normal())); s.invest = Math.max(0, s.invest + ret); addMoney(s, ret >= 0 ? "inc" : "exp", "투자 손익", Math.abs(ret)); }
  if (s.house.type === "own") s.house.value = Math.round(s.house.value * (houseIdx(s, s.t + 1) / houseIdx(s, s.t) + (s.era.house ? 0.006 : 0) + HOUSE_MKT.noise * r.normal())); // 11-25 집값 흐름을 따라 오르내린다(전에는 달마다 +0.28%)
  { const hm = houseMood(s, s.t + 1); if (hm.turn) { const own = s.house.type === "own", txt = hm.turn === "top" ? `집값이 꺾였다는 기사가 났다. ${own ? "내 집 값도 당분간 내려간다." : "집을 살 사람은 기다릴 때다."}` : `집값이 바닥을 찍었다는 기사가 났다. ${own ? "내 집 값이 돌아서기 시작한다." : "집을 살 생각이면 지금이 싸다."}`; notes.push(txt); log(s, txt, "era"); } }
  invMonth(s, r, notes, scenes);
  // 4) 사람
  peopleMonth(s, r, notes, scenes);
  GC.giftMonth(s, r, notes, (id) => CHAR[id]?.name); // 인연 선물(v4.25)
  // 5) 인생 장면(나이·시기 조건)
  lifeMonth(s, r, notes, scenes);
  // 6) 몸과 마음
  bodyMonth(s, r, notes, scenes);
  // 7) 빚
  if (s.cash < 0 && s.invest > 0) { const sell = Math.min(s.invest, -s.cash + 200); s.invest -= sell; s.cash += sell; notes.push(`잔고가 바닥나 투자금 ${won(sell)}을 뺐다`); }
  if (s.cash < 0) {
    const room = creditRoom(s);
    const need = -s.cash;
    if (room > 0) { const take = Math.min(room, need + 100); addLoan(s, "신용대출", take, 0.065); s.cash += take; notes.push(`잔고가 바닥나 신용대출 ${won(take)}`); }
    if (s.cash < 0) { s.debtLate++; notes.push(`카드값 연체 ${s.debtLate}개월째`); if (s.debtLate >= 3) gameOver(s, "bankrupt"); } else s.debtLate = 0;
  } else { s.debtLate = 0; const cl = s.loans.find((l) => l.n === "신용대출"); if (cl && s.cash > 2500) { const pay = Math.min(cl.amt, s.cash - 2000); cl.amt -= pay; s.cash -= pay; if (cl.amt <= 0) s.loans = s.loans.filter((l) => l !== cl); notes.push(`신용대출 ${won(pay)} 상환`); } }
  // 8) 기록
  let side = (M.inc["파티룸 매출"] || 0) - (M.exp["파티룸 비용"] || 0) + (M.inc["컨설팅"] || 0) + (M.inc["VOD·전자책"] || 0) + (M.inc["강의료"] || 0) + (M.inc["파티룸 강의료"] || 0) + (M.inc["인별 수익"] || 0) - (M.exp["컨설팅 광고·수수료"] || 0) + (M.inc["에어씨앤씨 매출"] || 0) - (M.exp["에어씨앤씨 비용"] || 0) + (M.inc["무인카페 매출"] || 0) - (M.exp["무인카페 비용"] || 0) + (M.inc["파티룸 창업 컨설팅"] || 0) + (M.inc["가맹비"] || 0) + (M.inc["가맹 로열티"] || 0) + (M.inc["AI 플랫폼 구독"] || 0) - (M.exp["플랫폼 서버·인건비"] || 0);
  const px = {}; for (const P of REG.JOBS) if (plugRet[P.key] !== undefined) { px[P.key] = Math.round(REG.sideOf(P, M, plugRet[P.key])); side += px[P.key]; }
  side += (M.inc["라이벌 반사이익"] || 0) - (M.exp["라이벌 경쟁"] || 0); // 라이벌(v4.25)
  side += (M.inc["시장 영향"] || 0) - (M.exp["시장 영향"] || 0) - (M.exp["투잡 부대비용"] || 0) + (M.inc["단골·입소문"] || 0) - (M.exp["판 변화"] || 0); // 시장 충격·부대비용(v4.25b)
  side += (M.inc["한방 전략"] || 0) - (M.exp["한방 전략"] || 0); // 한방 전략(v4.27)
  side += (M.inc["히든 길"] || 0) - (M.exp["히든 길"] || 0); // 히든 길(v4.29)
  s.taxBase += Math.max(0, side);
  if (s.cal === 12) { s.lastYearSide = s.taxBase; s.taxBase = 0; }
  s.lastSide = Math.round(side);
  if (sal && side >= sal) s.sideStreak++; else if (sal) s.sideStreak = 0; // (옛 기준, 기록용) 투잡 ≥ 월급 연속 달
  const invM = Math.round((M.inc["투자 손익"] || 0) - (M.exp["투자 손익"] || 0) + (M.inc["투자 판단 손익"] || 0) - (M.exp["투자 판단 손익"] || 0)), bonM = Math.round(M.inc["성과급"] || 0);
  s.hist.push({ t: s.t, age: s.age, cash: Math.round(s.cash), nw: Math.round(netWorth(s)), side: Math.round(side), sal, pr: Math.round(prProfit), cs: Math.round(csProfit), ...(Object.keys(px).length ? { px } : {}), ...(invM ? { inv: invM } : {}), ...(bonM ? { bon: bonM } : {}), hp: Math.round(s.hp), mental: Math.round(s.mental), fire: +fireInfo(s).ratio.toFixed(3) });
  if (D.UND_ON) UND.tick(s); // 11-28 업의 이해도: 하고 있는 투잡의 이번 달 일한 양을 쌓는다(난수·돈에 닿지 않는다)
  const yearSc = s.cal === 12 && !s.over ? yearScene(s, r) : null; // 12월: 연말 결산(꼭). 그달 장면들 뒤에 띄운다
  const receipt = { inc: M.inc, exp: M.exp, notes: notes.slice(), cash: s.cash, side, ym: ymLabel(s) };
  // 9) 시간 흐름
  s.t++; s.cal = s.cal % 12 + 1; if (s.cal === 1) s.year++; s.age = s.startAge + s.t / 12;
  s.co.years += (s.co.quit || s.co.fired) ? 0 : 1 / 12;
  if (s.age >= RD.endAgeOf(s) && !s.over) { s.ended = "age"; if (RD.isR1(s)) { s.grade = RD.gradeOf(Math.round(netWorth(s))); log(s, `${RD.endAgeOf(s)}세. 첫 5년 결산: ${s.grade}등급. 갈림길에 섰다.`, "end"); } else log(s, `${RD.endAgeOf(s)}세. 인생 중간 결산.`, "end"); }
  checkPerks(s, scenes);
  if (yearSc && !s.over) scenes.push(yearSc);
  s.sceneQ = paceScenes(s, scenes.filter(Boolean), yearSc);
  if (!s.over && !s.ended) monthStart(s);
  return receipt;
}
export function ymLabel(s) { return `${s.year}년 ${s.cal}월`; }
export function nextQueuedScene(s) { // 달 마감 뒤 장면을 하나씩 띄운다
  while (s.sceneQ.length) { const sc = s.sceneQ.shift(); if (sc.choices?.length) return openScene(s, sc); }
  return null;
}

// 직무 핵심 역량 → 연말 평가 가점: 기획·재무는 숫자, 영업·인사는 말빨, 마케팅은 마케팅, 디자인은 감각, 생산·기술은 손재주, 해외영업·구매는 외국어
export function jobMainStat(s) { const j = s.me.job; if (j === "ovs" || j === "buy") return "lang"; const st = D.JOBS[j]?.stat || {}; return Object.keys(st).sort((a, b) => st[b] - st[a])[0] || null; }
function jobStatZ(s) { const k = jobMainStat(s); if (!k) return 0; const v = s.st[k] || 0; return k === "lang" ? clamp((v - 40) / 80, -0.4, 0.6) : clamp((v - 60) / 150, -0.2, 0.3); }
// 연말 평가 S·A·B·C·D. 웬만하면 B가 나온다
function grade(s, r) {
  const co = s.co;
  if (co.perf < 20) return "D";
  const need = D.RANKS[co.rank].career;
  const z = (co.perf - 55) / 15 + (co.boss - 50) / 40 + mod(s, "gradeBonus", 0) * 2 + (s.me.fit || 0) * 0.3 + clamp((s.st.career - need) / 60, -1.5, 1) - (co.weak ? 1 : 0) - (s.ng?.hard ? 0.6 : 0) + (s.grad?.done && s.grad.k === "mba" ? 0.3 : 0) + jobStatZ(s);
  const pS = clamp(0.03 + 0.04 * z, 0, 0.3), pA = clamp(0.15 + 0.08 * z, 0.02, 0.45), pD = clamp(0.04 - 0.03 * z, 0, 0.3), pC = clamp(0.14 - 0.06 * z, 0.02, 0.4);
  const x = r.next();
  let g = x < pS ? "S" : x < pS + pA ? "A" : x > 1 - pD ? "D" : x > 1 - pD - pC ? "C" : "B";
  if (co.capC && "SAB".includes(g)) g = "C";
  return g;
}
const BONUS_F = { big: 1.3, fin: 1.5, mid: 1, startup: 0.6, public: 0.8 };
const ev = (id, title, text, choices) => ({ kind: "event", title, text, onChoose: "co_ev", ev: id, choices: choices.map((t) => ({ t, eff: {}, text: "" })) });

function companyMonth(s, r, notes, scenes) {
  const co = s.co;
  if (co.quit || co.fired) return;
  if (co.party && co.party.t === s.t && !co.party.done) { co.boss = clamp(co.boss + D.CO_PARTY.miss, 0, 100); notes.push(`${co.party.title}에 빠졌다: 팀장 호감 −${-D.CO_PARTY.miss}`); } // 11-25 회식이 뜬 달에 안 가고 넘어갔다
  co.perf = clamp(co.perf - 3 * mod(s, "perfDecay", 1), 0, 100);
  { const need = workNeed(s), gap = Math.max(0, need - (co.workDone || 0));
    if (gap > 0) { co.perf = clamp(co.perf - 7 * gap, 0, 100); co.boss = clamp(co.boss - 4 * gap, 0, 100); co.eye = clamp(co.eye + 2 * gap * eyeMult(s), 0, 100); s.mental = clamp(s.mental - 2 * gap, 0, 100); notes.push(`회사 일이 밀렸다(${co.workDone || 0}/${need}): 성과 −${7 * gap}, 팀장 호감 −${4 * gap}`); } }
  co.eye = clamp(co.eye - (SYN.on(s, "two") ? 1 : 2), 0, 100);
  s.mental = clamp(s.mental - 2 + mod(s, "workMental", 0), 0, 100);
  // 회사에 다니면 커리어는 직급만큼 저절로 는다
  if (s.st.career < 40 + co.rank * 22) s.st.career = Math.min(D.STAT_MAX, s.st.career + 0.25);
  if (co.discipline > 0) co.discipline--;
  if (co.remote > 0) { co.remote--; s.mental = clamp(s.mental - 1, 0, 100); if (s.fam.spouse) s.fam.happy = clamp(s.fam.happy - 2, 0, 100); if (co.remote === 0) { notes.push("지방 근무가 끝나 본사로 돌아왔다"); log(s, "본사로 복귀했다.", "work"); } }
  if (co.pip > 0) { co.pip--; if (co.pip === 0) { if (co.perf < 45) { co.fired = true; scenes.push(story("저성과자 해고", "개선 기간 3개월이 끝났다. 인사팀 회의실, 서류 한 장. 사원증을 반납했다.")); log(s, "저성과로 해고됐다.", "work"); return; } notes.push("개선 기간 통과. 한숨 돌렸다"); } }
  // 12월: 연말 평가 → 연봉·성과급·승진(v4.24: 1월 → 12월, 결과는 연말 결산 화면에 같이 나온다)
  if (s.cal === 12) {
    co.yrsRank++;
    const g = grade(s, r), G = D.GRADES[g], frz = !!co.freeze;
    co.grades.push(g); if (co.grades.length > 30) co.grades.shift();
    if (co.freeze) { notes.push(`평가 ${g} · 연봉 동결`); co.freeze = false; }
    else { co.payIdx = (co.payIdx || 1) * (1 + G.raise); notes.push(`평가 ${g} · 연봉 +${(G.raise * 100).toFixed(1)}%`); }
    const b = Math.round(salary(s) * G.bonus * (BONUS_F[co.type] || 1));
    if (b > 0) { s.cash += b; addMoney(s, "inc", "성과급", b); notes.push(`성과급 ${won(b)}`); }
    co.lastEval = { year: s.year, g, raise: frz ? 0 : G.raise, bonus: b, promo: null };
    co.pts += G.pt; co.capC = false; co.weak = false;
    const hid = reveal(s, "co"); if (hid.length) scenes.push(story("첫 평가, 숨은 특성", `회사에서 1년을 보내니 내가 어떤 사람인지 조금 보인다.\n· ${hid.join("\n· ")}`));
    // 임원은 1년 계약
    const rk = D.RANKS[co.rank];
    if (rk.exec) {
      const out = { S: 0.05, A: 0.15, B: 0.45, C: 0.8, D: 0.95 }[g];
      if (r.chance(out)) { const sev = salary(s) * 12; s.cash += sev; addMoney(s, "inc", "퇴임 위로금", sev); co.fired = true; co.retired = true; scenes.push(story("임원 퇴임", `계약 연장 명단에 이름이 없었다. ${rk.n} ${co.years.toFixed(0)}년 차. 퇴임 위로금 ${won(sev)}. 임원은 임시 직원이라는 말이 이제야 실감 난다.`)); log(s, `${rk.n}에서 퇴임했다.`, "work"); return; }
      notes.push(`${rk.n} 계약 1년 연장`);
    }
    // 승진: 햇수 + 평가 점수 + 직급에 맞는 역량(커리어)
    const yrs = D.COMPANY_TYPES[co.type].fast ? rk.fast : rk.years;
    const top = D.COMPANY_TYPES[co.type].top;
    if (co.rank < top && co.yrsRank >= yrs) {
      const nx = D.RANKS[co.rank + 1];
      if (co.pts < yrs + 1) notes.push(`승진 누락 · 평가 점수 ${co.pts}/${yrs + 1}`);
      else if (s.st.career < nx.career * 0.85) notes.push(`승진 누락 · 역량 부족(커리어 ${Math.round(s.st.career)}/${Math.round(nx.career * 0.85)})`);
      else {
        const p = clamp((nx.exec ? 0.3 : 0.6) + mod(s, "promoBonus", 0) + (g === "S" ? 0.25 : g === "A" ? 0.12 : 0) + (co.boss - 50) / 200, 0.05, 0.92);
        if (r.chance(p)) { co.rank++; co.yrsRank = 0; co.pts = 0; co.lastEval.promo = D.RANKS[co.rank].n; notes.push(`${D.RANKS[co.rank].n} 승진!`); log(s, `${D.RANKS[co.rank].n}으로 승진했다.`, "work"); scenes.push(story(nx.exec ? "임원이 됐다" : "승진", nx.exec ? `인사 발령: ${nx.n}. 차 키와 기사님, 그리고 1년짜리 계약서. 이제 해마다 성적표가 계약서가 된다.` : `인사 발령 메일. ${nx.n}. 명함이 바뀐다. 일도 늘 것 같은 예감.`)); }
        else notes.push("승진 심사 탈락. 내년을 기약한다");
      }
    }
    // 나쁜 평가가 이어지면 개선 기간(PIP)
    const last2 = co.grades.slice(-2).join("");
    if (g === "D") co.warns++;
    if (!co.pip && (last2 === "DD" || last2 === "DC" || last2 === "CD")) { co.pip = 3; scenes.push(story("성과 개선 프로그램", "팀장과 인사팀이 함께 들어왔다. \"3개월 동안 성과를 보여 주세요.\" 회사 성과 45를 넘기지 못하면 해고된다.")); }
  }
  // 회사 사건: 8개월에 한 번쯤
  // 새 사람이 왔다: 입사 전 신입·경력직·인턴이 5달에 한 번쯤
  co.hired = co.hired || [];
  const waiting = s.cast.filter((id) => CHAR[id]?.hire && !co.hired.includes(id) && !s.rel[id]);
  if (waiting.length && s.t >= 2 && s.t - (co.hireT ?? -99) >= 5 && r.chance(0.25)) {
    const id = r.pick(waiting); co.hired.push(id); co.hireT = s.t;
    const sc = meetScene(s, id); sc.title = `새 사람이 왔다 · ${CHAR[id].name}`; scenes.push(sc);
    notes.push(`${CHAR[id].job} ${jo(CHAR[id].name, "이", "가")} 들어왔다`); log(s, `회사에 ${CHAR[id].name}(${CHAR[id].job}) 입사`, "work");
  }
  // 회사 생활 장면: 두 달에 한 번쯤
  if (s.t - (co.offT ?? -99) >= 2 && r.chance(0.55)) { const sc = pickOffice(s, r); if (sc) { co.offT = s.t; scenes.push(sc); } }
  // 회사 사건: 5달에 한 번쯤
  if (s.t - co.evT >= 5 && r.chance(0.18)) {
    const need = D.RANKS[co.rank].career;
    const L = [];
    if (s.st.career < need * 0.8 && co.rank >= 1) L.push([4, ev("weak", "역량이 모자라다는 말", `새로 온 본부장이 내 보고서를 세 번 반려했다. "${D.RANKS[co.rank].n}이면 이 정도는 해야죠." 직급에 맞는 커리어(${need})보다 지금 커리어(${Math.round(s.st.career)})가 낮습니다.`, ["주말을 반납하고 공부한다 (다음 달 행동력 −2, 커리어 +5)", "버틴다 (올해 평가는 C 이하)"])]);
    if (co.rank >= 1 && co.type !== "startup") L.push([2, ev("reloc", "지방 발령", `인사팀 메일: "${r.pick(["울산", "구미", "여수", "창원", "광양", "천안"])} 사업장 순환 근무 대상자로 선정되셨습니다." 기간은 1년 반. 주말에만 집에 올 수 있다.`, ["간다 (1년 반 동안 행동력 −1, 대신 평가 유리)", "못 간다고 버틴다 (팀장 호감·성과 크게 −)", "이참에 이직을 알아본다"])]);
    L.push([2, ev("boss", "팀장이 바뀌었다", "나를 아끼던 팀장이 다른 본부로 갔다. 새 팀장은 첫 회의에서 \"저는 숫자만 봅니다\"라고 했다.", ["새 팀장 스타일에 맞춘다", "하던 대로 한다"])]);
    L.push([2, ev("freeze", "올해 연봉 동결", "회사 실적이 나빠 전 직원 연봉이 동결됐다. 성과급도 장담할 수 없다고 한다.", ["어쩔 수 없지", "경력기술서를 열어 둔다 (헤드헌터 제안 +)"])]);
    L.push([2, ev("reorg", "조직 개편", "팀이 쪼개지고 합쳐졌다. 하던 일의 절반이 다른 팀으로 갔다. 성과를 처음부터 다시 쌓아야 한다.", ["새 업무를 빨리 익힌다 (행동력 −1)", "흐름에 맡긴다"])]);
    L.push([2, ev("crunch", "야근 시즌", "분기 마감, 신규 프로젝트, 감사까지 한꺼번에 왔다. 한 달 내내 막차를 탔다.", ["끝까지 버틴다 (스태미너 −15, 성과 +10)", "적당히 선을 긋는다 (성과 −5)"])]);
    L.push([1, ev("peer", "동기가 먼저 승진했다", "동기 단톡방에 축하 메시지가 쏟아졌다. 나는 이모티콘 하나를 보냈다.", ["축하한다고 진심으로 말한다", "조용히 경력기술서를 연다"])]);
    if (s.era.ai) L.push([3, ev("ai", "AI가 우리 팀 일을 한다", "회사가 AI 도구를 들였다. 우리 팀 보고서 절반을 AI가 쓴다. 팀 인원을 줄인다는 소문이 돈다.", ["AI 쓰는 법을 먼저 배운다 (다음 달 행동력 −1, 커리어 +3)", "설마, 하고 넘긴다 (올해 평가 C 이하)"])]);
    if (s.age >= 45 && co.rank >= 3 && !D.RANKS[co.rank].exec) L.push([3, ev("early", "명예퇴직 권유", "인사팀장이 커피를 사 줬다. \"이번에 희망퇴직 조건이 좋습니다. 24개월 치 드려요.\"", ["받는다 (위로금 24개월 치, 퇴사)", "버틴다 (팀장 호감 −, 올해 평가 C 이하)"])]);
    if (r.chance(0.3)) L.push([1, ev("good", "회사 실적 호조", "올해 회사가 사상 최대 실적을 냈다. 특별 격려금이 나온다.", ["감사히 받는다"])]);
    const tot = L.reduce((a, x) => a + x[0], 0); let x = r.next() * tot;
    for (const [w, sc] of L) { x -= w; if (x <= 0) { scenes.push(sc); co.evT = s.t; break; } }
  }
  // 헤드헌터 제안
  co.resume = Math.max(0, (co.resume || 0) - 2);
  if (r.chance(0.008 * mod(s, "headhunt", 1) * (s.st.career / 50) * (1 + Math.max(0, (s.st.lang || 0) - 50) / 250) * (1 + (co.resume || 0) / 60) * (SYN.on(s, "grad_net") ? 1.5 : 1) * (s.era.winter ? 0.5 : 1)) || (mod(s, "headhunt", 0) && r.chance(0.012))) {
    const type = r.pick(["big", "mid", "startup", "fin"]); s._offer = { type, name: r.pick(D.COMPANY_TYPES[type].names) };
    scenes.push({ kind: "event", title: "헤드헌터의 연락", text: `링크드온 메시지가 왔다. "${s._offer.name} ${D.COMPANY_TYPES[type].n} 포지션, 연봉 10% 인상 가능합니다." 겸업 규정은 모른다.`, onChoose: "rejob_offer", choices: [{ t: "환승 이직한다", eff: { mental: 4 }, text: "새 사원증을 받았다." }, { t: "지금 회사에 남는다", eff: {}, text: "익숙함도 자산이다." }] });
  }
  // 11-24 사수의 귀띔(발각 판정 바로 앞): 사수가 연인이면 눈치 45부터 12개월에 한 번, 배우자면 40부터 9개월에 한 번(data/wall.json shield). 경고 횟수는 안 지우고 아래 판정도 그대로 굴린다
  { const sid = sasuOf(s), x = s.rel[sid], K = x?.spouse ? WALL.shield?.spouse : x?.lover ? WALL.shield?.lover : null;
    if (K && (s.pr.rooms.length || s.cs.open || (s.sj?.active || []).length) && co.eye >= K.eye && s.t - (co.shieldT ?? -99) >= K.gap) { const sc = shieldScene(s, sid, !!x.spouse); if (sc) { co.shieldT = s.t; scenes.push(sc); notes.push(`${CHAR[sid].name}의 귀띔: 인사팀이 겸업 제보를 모으고 있다`); } } }
  // 겸업 발각
  const ex = s.co.eye;
  if (ex >= 50 && (s.pr.rooms.length || s.cs.open || (s.sj?.active || []).length) && r.chance( /* 11-23 결정: 하는 투잡이 하나라도 있으면 들킬 수 있다(전에는 파티룸·컨설팅만) */ (ex - 50) / 140 * D.COMPANY_TYPES[co.type].eye)) {
    co.warns++;
    if (co.warns === 1) { co.eye = 25; scenes.push(caughtScene(s, r, 1) || story("겸업이 들켰다", "팀장이 조용히 불렀다. \"요즘 저녁에 뭐 하세요?\" 이번엔 경고로 끝났다.")); notes.push("겸업 경고 1회"); }
    else if (co.warns === 2) { co.eye = 20; co.discipline = 6; scenes.push(caughtScene(s, r, 2) || story("겸업 징계", "인사위원회가 열렸다. 감봉 6개월. 동기들 눈빛이 달라졌다.")); notes.push("겸업 징계: 감봉 6개월"); }
    else { co.fired = true; scenes.push(caughtScene(s, r, 3) || story("겸업으로 해고", "출입증이 더는 찍히지 않는다. 오늘부로 투잡이 본업이 됐다. 원하든 원하지 않든.")); log(s, "겸업으로 해고됐다.", "work"); }
  }
  // 구조조정: 불황이면 더 잦다. 평가가 나쁘면 먼저 나간다
  const lastG = co.grades.at(-1) || "B";
  const lay = 0.001 * D.COMPANY_TYPES[co.type].layoff * ("CD".includes(lastG) ? 3 : 1) * (s.era.slump ? 6 : 1) * (s.age >= 45 ? 2 : 1) * (mod(s, "layoffGuard", 0) ? 0.5 : 1) * (s.era.winter ? 3 : 1);
  if (r.chance(lay)) { co.fired = true; const b = salary(s) * 6 || 1800; s.cash += b; addMoney(s, "inc", "위로금", b); scenes.push(story("권고사직", `구조조정 명단에 이름이 있었다. 위로금 ${won(b)}. 재취업 면접은 공유오피스에서 볼 수 있어요.`)); log(s, "권고사직을 받았다.", "work"); }
}
function coEvChoose(s, r, id, i) {
  const co = s.co, out = [];
  const f = (k, v, n) => { co[k] = clamp(co[k] + v, 0, 100); out.push(`${n} ${v > 0 ? "+" : ""}${v}`); };
  if (id === "weak") { if (i === 0) { s.apNext -= 2; out.push(`커리어 +${gainStat(s, "career", 5).toFixed(1)}`, "다음 달 행동력 −2"); } else { co.capC = true; s.mental = clamp(s.mental - 6, 0, 100); out.push("올해 평가 C 이하", "멘탈 −6"); } co.weak = i === 1; }
  if (id === "reloc") {
    if (i === 0) { co.remote = mod(s, "relocResist", 0) ? 9 : 18; f("boss", 10, "팀장 호감"); f("perf", 10, "회사 성과"); out.push(`${co.remote}개월 지방 근무 · 행동력 −1`); log(s, "지방 사업장으로 발령났다.", "work"); }
    else if (i === 1) { f("boss", -25, "팀장 호감"); f("perf", -15, "회사 성과"); co.capC = true; out.push("올해 평가 C 이하"); }
    else { co.resume = clamp((co.resume || 0) + 40, 0, 100); f("boss", -10, "팀장 호감"); out.push("헤드헌터 제안 +"); }
  }
  if (id === "boss") { co.boss = i === 0 ? 45 : 32; out.push(`팀장 호감 ${co.boss}로`); if (i === 0) { s.mental = clamp(s.mental - 3, 0, 100); out.push("멘탈 −3"); } }
  if (id === "freeze") { co.freeze = true; out.push("올해 연봉 동결"); if (i === 1) { co.resume = clamp((co.resume || 0) + 30, 0, 100); out.push("헤드헌터 제안 +"); } }
  if (id === "reorg") { if (i === 0) { s.apNext -= 1; co.perf = Math.max(co.perf, 45); out.push("다음 달 행동력 −1", "성과 45 유지"); } else { co.perf = Math.min(co.perf, 35); s.mental = clamp(s.mental - 4, 0, 100); out.push("회사 성과 35로", "멘탈 −4"); } }
  if (id === "crunch") { if (i === 0) { s.hp = clamp(s.hp - 15, 0, s.hpMax); f("perf", 10, "회사 성과"); out.push("스태미너 −15"); s.mental = clamp(s.mental - 5, 0, 100); } else f("perf", -5, "회사 성과"); }
  if (id === "peer") { s.mental = clamp(s.mental - (i === 0 ? 3 : 6), 0, 100); out.push(`멘탈 −${i === 0 ? 3 : 6}`); if (i === 1) { co.resume = clamp((co.resume || 0) + 25, 0, 100); out.push("헤드헌터 제안 +"); } }
  if (id === "ai") { if (i === 0) { s.apNext -= 1; out.push(`커리어 +${gainStat(s, "career", 3).toFixed(1)}`, "다음 달 행동력 −1"); } else { co.capC = true; out.push("올해 평가 C 이하"); } }
  if (id === "early") { if (i === 0) { const b = salary(s) * 24; s.cash += b; addMoney(s, "inc", "희망퇴직 위로금", b); co.fired = true; co.retired = true; delete co.party; s.bangs = (s.bangs || []).filter((q) => q.rg !== "company"); fixCoSpots(s); out.push(`위로금 ${won(b)}`, "퇴사"); log(s, "희망퇴직했다.", "work"); } else { f("boss", -20, "팀장 호감"); co.capC = true; s.mental = clamp(s.mental - 8, 0, 100); out.push("올해 평가 C 이하", "멘탈 −8"); } }
  if (id === "good") { const b = salary(s); s.cash += b; addMoney(s, "inc", "특별 격려금", b); out.push(`격려금 ${won(b)}`); }
  if (id === "trend") { if (i === 0) { s.apNext -= 1; out.push(`감각 +${gainStat(s, "sense", 4).toFixed(1)}`, "다음 달 행동력 −1"); } else { s.st.sense = clamp(s.st.sense - 6, 1, D.STAT_MAX); out.push("감각 −6"); } }
  return out;
}

export function workNeed(s) { if (s.co.quit || s.co.fired) return 0; return (D.RANKS[s.co.rank].need || 0) + (s.co.crunchM || 0); }
export function quitCompany(s) {
  if (s.co.quit || s.co.fired) return { ok: false, msg: "이미 회사를 그만뒀어요" };
  const ready = quitReady(s);
  if (mod(s, "quitLock", false) && !ready.ok) return { ok: false, msg: "선퇴사 금지! 환승 조건을 먼저 채우세요" };
  s.co.quit = true; s.co.eye = 0;
  delete s.co.party; s.bangs = (s.bangs || []).filter((b) => b.rg !== "company"); fixCoSpots(s); // 11-25 퇴사한 달: 회사 느낌표와 회식은 사라진다
  log(s, ready.ok ? "환승 퇴사. 내일부터 출근지는 내 일이다." : "준비 없이 사직서를 냈다.", "work");
  if (!ready.ok) s.mental = clamp(s.mental + 10, 0, 100);
  return { ok: true, msg: ready.ok ? "환승 퇴사 성공. 행동력 +5" : "속은 시원하다. 다음 달 카드값이 걱정이다." };
}
// 환승 조건(v4.24): 가장 최근 연말 결산에서 투잡 이익 ≥ 연봉(s.yearX ≥ 1) + 비상금 6개월치. streak 은 옛 기준(기록용)
export function quitReady(s) { const emer = s.cash + s.invest >= monthlySpend(s) * 6, x = s.yearX || 0; return { ok: x >= 1 && emer, x, yearOk: x >= 1, emer, streak: s.sideStreak }; }

function peopleMonth(s, r, notes, scenes) {
  for (const [id, x] of Object.entries(s.rel)) {
    const gap = s.t - x.last;
    if (x.spouse) continue;
    if (x.cfBack != null && s.t >= x.cfBack) { delete x.cfBack; if (Object.values(s.rel).some((q) => q.lover)) { if (CHAR[id]) notes.push(`${CHAR[id].name}에게서 연락이 왔지만, 지금은 만나는 사람이 있다고 답했다`); } else if (!x.lover && !s.fam.spouse && CHAR[id] && isRomanceable(s, CHAR[id])) scenes.push(CONFESS[id]?.answer?.back ? confessBack2(s, id, true) : confessBackScene(s, id)); }
    if (x.cfShow === -1) { const q = x.lover && CHAR[id] ? confessShow(s, id) : null; if (q) scenes.push(q); else delete x.cfShow; } // 11-24 사수가 넘어온 다음 날 장면을 아직 못 봤다
    if (x.day1 && x.lover && x.loverSince < s.t + 1) { notes.push(x.day1); delete x.day1; }
    if (x.lover) { const far = HL.isAway(s, id) ? 1 : 0, dg = s.t - (x.dateT ?? x.last); /* 11-25 멀리 있는 연인은 석 달 연락이 없을 때부터 */ if (dg >= 2 + far) { x.aff = clamp(x.aff - 3, 0, 100); if (dg === 2 + far) notes.push(`${CHAR[id].name}: "요즘 우리 얼굴 본 지 오래됐다?"`); } if (x.aff < 25) { endLove(s, id, "\"너는 늘 바빴어.\" 이별 통보."); scenes.push(story("이별", `${CHAR[id].name}에게서 긴 까톡이 왔다. "너는 늘 바빴어." 답장을 쓰다 지웠다.`)); } }
    else if (gap >= 3 && x.aff > 10) x.aff = clamp(x.aff - 1, 0, 100);
  }
  // 고객으로 찾아오는 인연(파티룸 예약)
  if (s.pr.rooms.some((rm) => rm.status === "open") && r.chance(0.35)) {
    const cands = s.cast.filter((id) => CHAR[id]?.customer?.board === "partyroom" && !HL.isHidden(s, id)); // 11-25 멀리 떠난 사람은 손님으로 안 온다
    if (cands.length) { const id = r.pick(cands); const c = CHAR[id]; const rm = r.pick(s.pr.rooms.filter((x) => x.status === "open")); const fit = rm.concept === c.customer.need; const known = !!s.rel[id]; ensureRel(s, id); addAff(s, id, fit ? 6 : 2); if (fit) rm.rating = clamp(rm.rating + 0.03, 2.5, 5); notes.push(`${c.name}님이 ${jo(rm.name, "을", "를")} 예약했다${fit ? " · 컨셉이 딱 맞아 리뷰 +" : ""}`); if (!known) scenes.push({ kind: "event", who: id, title: `손님으로 온 인연 · ${c.name}`, text: `${rm.name} 예약자 명단에 낯익은 얼굴. "${c.customer.line || "여기 사진이 예뻐서 왔어요."}"`, choices: [{ t: "직접 가서 인사하고 서비스 음료를 챙긴다", check: { stat: "charm", dc: 30 }, ok: { text: "\"사장님이셨어요?\" 다음에 또 오겠다고 했다.", eff: { aff: 8, pr_rating: 0.02 } }, ng: { text: "조금 어색했지만 리뷰는 좋게 남겨 줬다.", eff: { aff: 3 } } }, { t: "앱 메시지로만 감사 인사", eff: { aff: 2 }, text: "깔끔한 응대. 별 다섯 개." }] }); }
  }
  // 가족
  if (s.fam.spouse) {
    s.fam.happy = clamp(s.fam.happy - (3 + 2 * s.fam.kids.length) * mod(s, "familyDecay", 1), 0, 100);
    if (s.fam.spouseType === "응원형") s.mental = clamp(s.mental + 2, 0, 100);
    if (s.fam.spouseType === "불안형" && debt(s) > 10000) s.mental = clamp(s.mental - 2, 0, 100);
    if (mod(s, "needFamily", 0) && s.flags.familyThisMonth !== s.t) s.mental = clamp(s.mental - 3, 0, 100);
    if (s.fam.happy < 20) { s.mental = clamp(s.mental - 3, 0, 100); s.fam.lowHappy++; if (s.fam.lowHappy === 1) notes.push("집안 공기가 차갑다(가족 행복 20 미만)"); } else s.fam.lowHappy = 0;
    if (s.fam.lowHappy >= 8) divorce(s, scenes);
    // 아이 계획
    if (s.fam.spouse && !s.fam.pregnant && s.fam.kids.length < D.KID_AID.max && s.t - s.fam.marriedT >= 6 && (s.flags.noKidUntil ?? -1) < s.t && r.chance(s.fam.kids.length ? 0.025 : 0.06) && s.age < 44) {
      scenes.push({ kind: "event", title: s.fam.kids.length ? "둘째 이야기" : "아이 이야기", text: `${jo(CHAR[s.fam.spouse].name, "이", "가")} 조심스럽게 물었다. "우리... ${s.fam.kids.length ? "둘째" : "아이"} 가져 볼까?" 아이가 어리면 육아가 행동력을 가져가고, 배우자도 손을 보태기 어려워진다. 대신 아이 얼굴을 보면 힘이 난다.`, onChoose: "baby", choices: [{ t: "그래, 가져 보자", eff: { family: 10 }, text: "손을 꼭 잡았다." }, { t: "조금만 더 있다가", eff: { family: -4 }, text: "\"그래, 아직 바쁘니까.\"" }] });
    }
    // 배우자 반대(v4.25): 빚이 크거나 투잡이 적자일 때, 불안형이면 더 자주
    if (s.fam.spouse && !s.fam.pregnant && (s.fam.opposeUntil ?? -1) <= s.t && s.t - (s.flags.opposeT ?? -99) >= 18) {
      const risky = debt(s) > 15000 || (s.lastSide ?? 0) < 0 || s.cash < 0;
      const p = (risky ? 0.05 : 0.012) * (s.fam.spouseType === "불안형" ? 2 : s.fam.spouseType === "응원형" ? 0.6 : 1);
      if (r.chance(p)) { s.flags.opposeT = s.t; const nm = CHAR[s.fam.spouse].name; scenes.push({ kind: "event", who: s.fam.spouse, title: "배우자의 반대", text: `밤 11시, 노트북을 켜는데 ${jo(nm, "이", "가")} 식탁에 앉았다. "${risky ? "이번 달도 마이너스야. 이거 계속하는 게 맞아?" : "요즘 주말에 우리 얼굴 본 적 있어? 투잡 좀 줄이면 안 돼?"}" 배우자는 지금까지 손을 보태 줬다(행동력 +${spouseAp(s)}).`, onChoose: "fam_oppose", choices: [{ t: "숫자를 보여 주며 차근차근 설득한다", check: { stat: "charm", dc: 40 }, ok: { text: "한참 표를 들여다보더니 \"6개월만 더 보자\"고 했다.", eff: { family: 2 } }, ng: { text: "\"숫자 말고 당신 얼굴을 보고 싶다고.\" 대화가 끊겼다.", eff: { family: -8 } } }, { t: "알겠어, 한 달은 투잡을 쉰다", eff: { family: 10, ap: -3 }, text: "다음 달 행동력 −3. 둘이 오랜만에 저녁을 먹었다." }, { t: "못 들은 척 노트북을 켠다", eff: { family: -15 }, text: "방문이 조용히 닫혔다. 6개월 동안 도움 없음(행동력 −1)." }] }); }
    }
    if (s.fam.pregnant !== null && s.t >= s.fam.pregnant) { s.fam.kids.push({ born: s.t, name: r.pick(["하린", "도윤", "서아", "이준", "지안", "시우", "유나", "건우"]) }); s.fam.pregnant = null; if (s.seen.life_postpartum !== undefined && !s.flags.ppUsed) s.flags.ppUsed = s.t; /* 조리원 장면에서 이미 냄 */ else { s.cash -= 300; addMoney(s, "exp", "출산·산후조리", 300); } s.fam.happy = clamp(s.fam.happy + 20, 0, 100); scenes.push(story("아이가 태어났다", "새벽 3시 수유, 새벽 5시 기저귀. 투잡에 쓰던 시간이 사라졌다. 그런데 이상하게 힘이 난다.")); log(s, `아이 ${jo(s.fam.kids[s.fam.kids.length - 1].name, "이", "가")} 태어났다.`, "life");
      try { const ln = SPO.onBirth(s); if (ln) notes.push(ln); } catch (e) { console.warn(e); } // 11-25 배우자 육아휴직
      { const A = D.KID_AID, n = s.fam.kids.length, amt = A.birth[Math.min(n, A.birth.length) - 1] || 0; if (amt) { s.cash += amt; addMoney(s, "inc", "출산 지원금", amt); } // 11-25 나라 지원: 출산 지원금, 둘째면 다자녀 장면
        if (n === 1) notes.push(`나라 지원: 출산 지원금 +${won(amt)} · 부모 급여 달마다 ${A.parent[0]}만(첫돌까지, 그다음 한 해는 ${A.parent[1]}만) · 아동 수당 달마다 ${A.child}만(${A.childTo}세 전까지)`);
        else if (n === 2) scenes.push(kidAidScene(s, amt)); } }
  }
  affMonth(s, r, scenes, notes); // 바람(engine/affair.js)
  menteeMonth(s, r, scenes); // 컨설팅 제자(engine/mentee.js)
  guestMonth(s, r, scenes); // 손님 이벤트(engine/guest.js)
  flirtMonth(s, r, scenes); // 연애·결혼 19금(engine/flirt.js)
  famMonth(s, r, scenes, notes);
  try { HL.month(s, notes, scenes); } catch (e) { console.warn(e); } // 11-25 히로인·히어로의 인생 시계(사건·소식·장면)
  try { LOVE.loveMonth(s, r, notes, scenes); } catch (e) { console.warn(e); }
  try { SPO.spMonth(s, r, notes, scenes); } catch (e) { console.warn(e); } // 11-25 배우자 승진·복직·"그만둘까"
  try { WED.wedMonth(s, r, notes, scenes); } catch (e) { console.warn(e); } // 11-25 상대가 먼저 꺼내는 결혼 얘기·"결혼하길 잘했다"(wed.js)
  try { XR.xMonth(s, r, notes, scenes); } catch (e) { console.warn(e); } // 11-24 겹치는 역할 사건·닉네임 이야기
  // 11-24 기념일·까톡·조력자 사건 // 자녀·배우자·부모님 이벤트(engine/famev.js)
  // 부모님
  s.fam.parents = clamp(s.fam.parents - (s.age > 38 ? 0.28 : 0.14) - (s.t - s.fam.lastVisit > 6 ? 0.1 : 0), 0, 100);
  if (s.fam.parents < 45 && !s.flags.parentCare) { s.flags.parentCare = s.t; scenes.push(story("부모님 간병", "어머니가 입원하셨다. 주말마다 병원에 간다. 투잡보다 중요한 게 있다. (매달 행동력 −1, 간병비 40만)")); }
  if (s.fam.parents <= 0 && !s.flags.parentGone) { s.flags.parentGone = s.t; const inh = r.int(0, 6) * 1000; if (inh) { s.cash += inh; addMoney(s, "inc", "상속", inh); } s.mental = clamp(s.mental - 20, 0, 100); scenes.push(story("작별", `장례식장 복도에서 오래 앉아 있었다. ${inh ? `남겨 주신 ${won(inh)}. ` : ""}"밥은 먹고 다니니?" 그 말이 계속 들린다.`)); log(s, "부모님을 떠나보냈다.", "life"); }
}
export function divorce(s, scenes, title = "이혼", text = "\"당신은 늘 바빴어.\" 서류에 도장을 찍는 손이 떨렸다. 통장 잔고가 절반이 됐다.") {
  const id = s.fam.spouse; const half = Math.max(0, Math.round(netWorth(s) / 2));
  s.cash -= half; addMoney(s, "exp", "이혼 재산분할", half);
  s.rel[id].spouse = false; s.rel[id].aff = 10; s.fam.spouse = null; s.fam.lowHappy = 0; s.fam.happy = 40;
  scenes.push(story(title, text));
  log(s, "이혼했다.", "love");
}
function lifeMonth(s, r, notes, scenes) {
  // 시대 사건
  for (const e of s.eraPlan) if (e.t === s.t) { const sc = SCENES.find((x) => x.id === e.id); if (sc) { startEra(s, sc); if (sceneOk(s, sc)) scenes.push({ ...sc, once: true }); else notes.push(`뉴스: ${sc.title}`); } } // 11-23 시대 효과는 누구에게나 걸리고, 선택 장면은 조건(req)이 맞는 사람에게만
  for (const k of Object.keys(s.era)) { s.era[k]--; if (s.era[k] <= 0) delete s.era[k]; }
  if (s.t >= 12 && !D.MACRO.some((m) => s.era[m.id]) && s.t - (s.macroT ?? -99) >= 18 && r.chance(0.025)) {
    const L = D.MACRO.filter((m) => !m.need || m.need(s)); const tot = L.reduce((a, m) => a + m.w, 0); let x = r.next() * tot;
    for (const m of L) { x -= m.w; if (x <= 0) { startMacro(s, m, notes, scenes); break; } }
  }
  // 트렌드에 뒤처지는 나이
  const ag = Math.floor(s.age);
  if ([37, 42, 46].includes(ag) && s.cal === 6 && !s.flags["trend" + ag]) { s.flags["trend" + ag] = s.t; scenes.push({ kind: "event", title: "요즘 애들 말을 못 알아듣겠다", text: s.co.quit || s.co.fired ? `단골 손님이 댓글에 쓴 밈을 혼자 못 알아들었다. 검색해 보고 3초 늦게 웃었다. 감각은 가만두면 떨어진다.` : `신입이 회의에서 말한 밈을 혼자 못 알아들었다. 다들 웃는데 나만 늦게 웃었다. 감각은 가만두면 떨어진다.`, onChoose: "co_ev", ev: "trend", choices: [{ t: "주말마다 팝업 거리·전시를 돌아본다", eff: {}, text: "" }, { t: "원래 그런 거지, 넘어간다", eff: {}, text: "" }] }); }
  // 인생 장면: 한 달 최대 1개
  const cands = SCENES.filter((x) => x.where === "any" && x.track !== "시대" && !x.id.startsWith("era") && sceneOk(s, x));
  const rr = r.next(); let acc = 0;
  for (const x of r.shuffle(cands)) { acc += x.when?.chance ?? 0.03; if (rr < acc) { scenes.push({ ...x, once: true }); break; } }
}
// ───────── 투자 이벤트(데이터는 defs.js INV_EV·INV) ─────────
// 차분한 선택은 시장 평균, 무리한 선택은 크게 잃을 수 있다. 결과 돈은 장부 '투자 판단 손익'
const INV_L = "투자 판단 손익";
// v4.27 시장 국면(데이터 defs INV_PH). 하락장은 몇 달씩 이어지고, 끝나면 회복장이 온다
function invPhase(s, r, notes) {
  const PH = D.INV_PH, ph = s.invPh || (s.invPh = { p: "n", u: 0 });
  if (s.t < ph.u) return;
  if (ph.p === "b") { ph.p = "r"; ph.u = s.t + r.int(PH.rec[0], PH.rec[1]); ph.t = s.t; if (s.invest > 0) notes.push("시장: 하락장이 끝났다. 천천히 회복장이 온다"); } // 11-25 ph.t: 이 국면이 시작된 달(홈 화면 "하락장 N개월째")
  else if (ph.p === "r") { ph.p = "n"; ph.u = s.t; }
  else if (r.chance(PH.p)) { ph.p = "b"; ph.u = s.t + r.int(PH.bear[0], PH.bear[1]); ph.t = s.t; if (s.invest > 0) notes.push("시장: 하락장이 시작됐다. 몇 달은 계좌가 파랄 것 같다"); }
}
function invMonth(s, r, notes, scenes) {
  if (s.invReb?.length) s.invReb = s.invReb.filter((b) => {
    if (s.t < b.t) return true;
    if (b.house) { if (s.house.type === "own") { s.house.value = Math.round(s.house.value * (1 + b.house)); notes.push(`집값 회복 +${Math.round(b.house * 100)}%`); } }
    else { const g = Math.round(Math.min(s.invest, b.base) * b.pct); if (g > 0) { s.invest += g; addMoney(s, "inc", "투자 손익", g); notes.push(`시장 반등: 버틴 계좌 +${won(g)}`); } }
    return false;
  });
  if (s.invest > 0) s.invHold = (s.invHold || 0) + 1;
  if (D.INV.churn && s.invest >= 1000 && !(s.sj?.active || []).length && !s.flags.invChurn) { s.flags.invChurn = s.t; scenes.push(story("하루 열 번 계좌를 연다", `점심시간에도, 퇴근 지하철에서도 증권 앱을 연다. 오르면 사고, 내리면 판다. 수수료와 세금이 조금씩 샌다. (투잡 없이 회사만 다니면 투자 수익률 연 −${Math.round(D.INV.churn * 1200)}%p. 투자 이벤트에서 차분하게 고를수록 줄고, 투잡을 하면 바빠서 앱을 덜 열어요)`)); }
  // 11-24 단계 해금: 투자는 1년 차가 지나고 모은 돈(현금+투자)이 5,000만을 넘으면 열린다
  if (!s.flags.invOpen) { if (s.invest > 0) s.flags.invOpen = s.t; else if (s.t >= INV_OPEN.t && s.cash + s.invest >= INV_OPEN.seed) { s.flags.invOpen = s.t; scenes.push(investOpenScene(s)); } return; }
  const I = D.INV; if (s.t < I.minT || s.t - (s.invT ?? -99) < I.cool || !r.chance(I.chance)) return;
  const L = D.INV_EV.filter((e) => (!e.need || e.need(s)) && s.t - (s.invSeen?.[e.id] ?? -99) >= 36);
  if (!L.length) return;
  let x = r.next() * L.reduce((a, e) => a + e.w, 0), e = L[0];
  for (const c of L) { x -= c.w; if (x <= 0) { e = c; break; } }
  if (!e.mkt && (s.sj?.active || []).length && !r.chance(I.busy)) return; // 투잡하느라 바빠서 유혹을 못 봤다
  s.invT = s.t; s.invSeen = { ...(s.invSeen || {}), [e.id]: s.t };
  let pre = 0;
  if (e.pre?.inv) { pre = Math.round(s.invest * e.pre.inv); s.invest += pre; addMoney(s, pre >= 0 ? "inc" : "exp", "투자 손익", Math.abs(pre)); }
  if (e.toRec) { const ph = s.invPh || (s.invPh = { p: "n", u: 0 }); if (ph.p === "n") { ph.p = "r"; ph.u = s.t + r.int(D.INV_PH.rec[0], D.INV_PH.rec[1]); ph.t = s.t; } } // 11-25 투자 1단계: 폭락 뒤 "반드시 +20%" 대신 회복장이 온다(판 사람은 못 탄다)
  if (e.pre?.house && s.house.type === "own") { pre = Math.round(s.house.value * e.pre.house); s.house.value += pre; }
  const text = (((s.co.quit || s.co.fired) && e.textQ) || e.text).replace("{pre}", won(Math.abs(pre))).replace("{div}", won(Math.round(s.invest * 0.03))); // 21번: 퇴사자용 문장
  log(s, `[투자] ${e.title}`, "money");
  scenes.push({ kind: "event", tag: "투자", title: e.title, text, onChoose: "inv_ev", ev: e.id, choices: e.choices.map((c) => c.check ? { t: c.t, style: c.style, check: c.check, ok: c.ok, ng: c.ng } : { t: c.t, style: c.style, eff: c.eff || {}, text: "" }) });
}
function invChoose(s, r, c) {
  const out = []; let txt = c.out || "";
  const spare = () => Math.max(0, s.cash - monthlySpend(s) * 6);
  if (c.style === "rash" || c.sell >= 1) s.invHold = 0;
  s.invHabit = clamp((s.invHabit ?? 1) + (D.INV.habit?.[c.style] || 0), 0.3, 1.5); // 투자 습관: 차분할수록 잦은 매매 손실이 준다
  if (c.fee) { s.cash -= c.fee; addMoney(s, "exp", INV_L, c.fee); out.push(`회비 −${won(c.fee)}`); }
  if (c.div) { const d = Math.round(s.invest * c.div); if (c.divCash) s.cash += d; else s.invest += d; addMoney(s, "inc", "배당금", d); out.push(`배당 +${won(d)}${c.divCash ? " (현금)" : " 재투자"}`); }
  if (c.sell) { const v = Math.min(Math.max(0, s.invest), Math.round(s.invest * c.sell)), b = Math.round(v * (c.bonus || 0)); s.invest -= v; s.cash += v + b; if (b) addMoney(s, "inc", "예금 이자", b); out.push(c.sell >= 1 ? `투자금 ${won(v)} 전부 현금으로` : `투자금 ${won(v)} 예금으로 (이자 +${won(b)})`); }
  if (c.stake) {
    const k = c.stake, own = s.house.type === "own";
    const fi = Math.min(Math.max(0, s.invest), Math.round(s.invest * (k.inv || 0))), fc = Math.round(spare() * (k.cash || 0)), fa = Math.min(k.amt || 0, Math.max(0, s.cash));
    let ln = 0;
    if (k.loan) { const hl = k.loan < 1; ln = hl ? (own ? Math.round(s.house.value * k.loan) : 0) : Math.min(k.loan, creditRoom(s)); if (ln > 0) { addLoan(s, hl ? "추가 담보대출" : "신용대출", ln, hl ? 0.048 : 0.065, hl); out.push(`대출 +${won(ln)}`); } }
    s.invest = Math.max(0, s.invest - fi); s.cash -= fc + fa; // 가진 것보다 더 빼지 않는다(소수점 음수 방지)
    const st = fi + fc + fa + ln;
    if (st > 0) {
      let y = r.next(), o = c.outs[c.outs.length - 1]; for (const q of c.outs) { y -= q[0]; if (y <= 0) { o = q; break; } }
      const back = Math.max(0, Math.round(st * (1 + o[1]))), d = back - st;
      if (fa && !fi && !fc && !ln) s.cash += back; else s.invest += back;
      if (d) { addMoney(s, d > 0 ? "inc" : "exp", INV_L, Math.abs(d)); out.push(`${d > 0 ? "+" : "−"}${won(Math.abs(d))}`); }
      if (o[1] <= -0.5) { s.mental = clamp(s.mental - 4, 0, 100); out.push("멘탈 −4"); }
      txt = o[2];
    } else txt = "걸 돈이 없었다. 다행인지도 모른다.";
  }
  if (c.reb) { s.invReb = s.invReb || []; const t = s.t + r.int(c.reb.at[0], c.reb.at[1]); if (c.reb.pct) s.invReb.push({ t, pct: c.reb.pct, base: s.invest }); if (c.reb.house) s.invReb.push({ t, house: c.reb.house }); }
  if (c.houseSell && s.house.type === "own") {
    const v = Math.round(s.house.value * c.houseSell), ml = s.loans.filter((l) => /담보/.test(l.n)), owe = ml.reduce((a, l) => a + l.amt, 0);
    s.loans = s.loans.filter((l) => !ml.includes(l)); s.cash += v - owe; addMoney(s, "exp", INV_L, s.house.value - v);
    const dep = housePrice(s, "jeonse");
    if (s.cash >= dep + 1000) { s.cash -= dep; s.house = { type: "jeonse", dep, rent: 0, value: 0 }; } else { const d2 = Math.min(3000, Math.max(0, Math.round(s.cash))); s.cash -= d2; s.house = { type: "wolse2", dep: d2, rent: 95, value: 0 }; }
    out.push(`집 매도 ${won(v)}`, `대출 상환 ${won(owe)}`, HOUSING_N[s.house.type]);
  }
  if (txt) s._sceneText = txt;
  return out;
}
const HOUSING_N = { jeonse: "전세로 이사", wolse2: "투룸 월세로 이사" };
function startMacro(s, m, notes, scenes) {
  s.macroT = s.t; const k = mod(s, "eraMult", 1);
  if (m.m) s.era[m.id] = Math.max(1, Math.round(m.m * k));
  const lines = [];
  if (m.id === "winter" && !(s.co.quit || s.co.fired)) { s.co.freeze = true; lines.push("올해 연봉 동결"); }
  if (m.id === "crash") { const loss = Math.round(s.invest * 0.28 * k); s.invest -= loss; addMoney(s, "exp", "투자 손익", loss); lines.push(`투자 −${won(loss)}`); }
  if (m.id === "tax") { s.co.eye = clamp(s.co.eye + 5 * eyeMult(s), 0, 100); }
  log(s, `[경제] ${m.n}`, "era");
  scenes.push({ ...story(`경제 뉴스 · ${m.n}`, (((s.co.quit || s.co.fired) && m.textQ) || m.text) + (lines.length ? ` (${lines.join(", ")})` : "")), warn: scenes.some((q) => q.warn) || s.t - (s.warnT ?? -99) < 3 ? undefined : (s.warnT = s.t, { head: m.n, sub: "경제 뉴스" }) }); // 11-23 큰 사건은 WARNING 화면부터(한 달에 하나, 석 달 간격)
}
function startEra(s, sc) {
  const t = `${sc.id} ${sc.title}`; const m = mod(s, "eraMult", 1);
  if (/금리/.test(t)) s.era.rate = 18;
  if (/전염|모임|팬데믹|거리두기/.test(t)) s.era.pandemic = Math.round(8 * m);
  if (/부동산|집값/.test(t)) s.era.house = 24;
  if (/AI|인공지능|챗GPD/.test(t)) s.era.ai = 36;
  if (/한파|채용 감소/.test(t)) s.era.freeze = 12;
  if (/수시|공채 폐지/.test(t)) s.era.rolling = 999;
  if (/수수료/.test(t)) s.era.fee = 999;
  if (/침체|불황/.test(t)) s.era.slump = Math.round(12 * m);
  if (/회복|호황/.test(t)) s.era.recovery = 12;
  if (/출산/.test(t)) s.era.birth = 36;
  log(s, `[시대] ${sc.title}`, "era");
}
function bodyMonth(s, r, notes, scenes) {
  // 한 달 회복 = 최대 스태미너의 40% (체력이 좋을수록 많이 찬다). 회사원은 −6, 33세부터 조금씩 줄어든다
  syncSta(s);
  let rec = s.hpMax * 0.4 + mod(s, "hpRec", 0) - Math.max(0, (s.age - 33) / 3) + helperPower(s, "health") * 3;
  if (!(s.co.quit || s.co.fired)) rec -= 6;
  try { rec -= XR.emptyHp(s); } catch (e) {} // 11-25 공허함: 마흔다섯부터 연인도 배우자도 없으면 회복이 준다(extras.js EMPTY)
  s.hp = clamp(s.hp + rec, 0, s.hpMax);
  // 나이: 체력·감각은 서서히 떨어지고, 말빨·숫자는 경험으로 조금씩 는다
  if (s.age > 35) { s.st.body = clamp(s.st.body - 0.06 * (s.age - 33) / 2, 1, D.STAT_MAX); s.st.sense = clamp(s.st.sense - 0.07, 1, D.STAT_MAX); }
  if (s.st.talk < 120) s.st.talk += 0.04; if (s.st.num < 120) s.st.num += 0.03;
  syncSta(s);
  s.mental = clamp(s.mental + 3 + mod(s, "monthMental", 0) + helperPower(s, "mental") * 3, 0, 100);
  if (s.burnLeft > 0) s.burnLeft--;
  if (s.hp <= 12) { s.cash -= 300; addMoney(s, "exp", "병원비", 300); s.apNext -= 3; scenes.push(story("과로로 쓰러졌다", "링거를 꽂고 누워서도 투잡 알림을 확인했다. 병원비 300만, 다음 달 행동력 −3.")); s.hp = 35; }
  if (s.mental <= 5 && GC.burnGuard(s)) { s.mental = 35; scenes.push(story("번아웃을 막았다", "무너지기 직전, 카드 '마음의 방패'가 버텨 줬다. 오늘은 일찍 잔다.")); } // 성장 카드(v4.25)
  if (s.mental <= 5) {
    s.burnouts++; s.burnLeft = 2; s.mental = 45;
    scenes.push(story(`번아웃 ${s.burnouts}회`, s.burnouts >= 3 ? "더는 일어날 수 없었다. 모든 걸 멈추기로 했다." : "알람이 울려도 몸이 움직이지 않는다. 두 달 동안 행동력이 반으로 준다."));
    if (s.burnouts >= 3) gameOver(s, "burnout");
  }
}
function gameOver(s, cause) { s.over = cause; log(s, { bankrupt: "개인회생 신청. 이번 인생은 여기까지.", burnout: "번아웃 3회. 이번 인생은 여기까지.", fired: "모든 수입이 끊겼다." }[cause] || cause, "end"); }
export function declareFire(s, keepGoing) {
  const f = fireInfo(s); if (!f.ready) return false;
  s.fireAt = ageNow(s); s.fireAtM = Math.floor(s.age * 12 + 1e-6); s.fireNW = Math.round(f.nw); // fireAtM: 개월까지(명예의 전당)
  if (keepGoing) { log(s, `${s.fireAt}세, 파이어 달성! 은퇴하지 않고 ${RD.endAgeOf(s)}세까지 더 달린다.`, "end"); return true; }
  s.ended = "fire"; log(s, `${s.fireAt}세, 파이어 선언!`, "end"); return true;
}
// 특전 카드: 큰 일을 해내면 한 장씩. 다음 인생에 한 장 가져갈 수 있다
function checkPerks(s, scenes) {
  s.me.perks = s.me.perks || []; s.moments = s.moments || {};
  for (const m of D.MOMENTS) {
    if (s.moments[m.key] !== undefined) continue;
    let ok = false; try { ok = m.test(s); } catch (e) {}
    if (!ok) continue;
    s.moments[m.key] = s.t;
    const rr = R(s); let who = null; try { who = m.who?.(s) || null; } catch (e) {}
    scenes.push({ ...story(m.title, rr.pick(typeof m.lines === "function" ? m.lines(s) : m.lines)), cine: m.key, who }); // 11-23 lines 가 함수면 상태를 보고 줄을 고른다(웹소설 wn_steady: 발각 이력)
  }
  for (const p of D.PERKS) {
    if (!p.test || s.me.perks.includes(p.id)) continue;
    let ok = false; try { ok = p.test(s); } catch (e) {}
    if (!ok) continue;
    s.me.perks.push(p.id); log(s, `특전 카드 「${p.n}」을 얻었다 (${p.got})`, "good");
    scenes.push({ ...story(`특전 카드 · ${p.n}`, `${p.got}! "${p.line}"
효과: ${p.pro}. 다음 인생에 이 카드를 가져갈 수도 있어요.`), tag: "특전", perk: p.id, cine: D.PERK_CINE[p.id] || null, who: p.id === "p_family" ? s.fam.spouse : null });
  }
}
// 투잡별 올해 이익(연말 결산에서 가장 많이 번 투잡 고르기, yearend.js)
export function jobYear(s, k) {
  const h = s.hist.slice(-12), sum = (a) => a.reduce((x, y) => x + (typeof y === "number" ? y : 0), 0);
  if (k === "pr") return sum(h.map((x) => x.pr)); if (k === "cs") return sum(h.map((x) => x.cs));
  { const P = REG.get(k); if (P) return P.yearProfit ? P.yearProfit(s) : sum(h.map((x) => x.px?.[k] || 0)); }
  if (k === "airbnb") return sum(s.ab.hist.slice(-12)); if (k === "ucafe") return sum(s.uc.hist.slice(-12)); if (k === "insta") return (s.ins.monthRev || 0) * 12;
  return 0;
}
function story(title, text) { return { kind: "story", title, text, choices: [{ t: "계속", eff: {}, text: "" }] }; }

// ───────── 할 일 목록(바쁘다는 느낌의 핵심) ─────────
export function todos(s) {
  const t = [];
  const add = (lv, text, go) => t.push({ lv, text, go });
  for (const [id, x] of Object.entries(s.rel || {})) if (x.anv && CHAR[id]) add(x.anv.t <= s.t ? 2 : 1, `${jo(CHAR[id].name, "과", "와")} ${x.anv.n} · ${x.anv.t <= s.t ? "이번 달 안에 챙기기" : "다음 달이에요"}`, "people:" + id);
  if (s.debtLate > 0) add(2, `⚠ 카드값 연체 ${s.debtLate}개월째! 3개월 연속이면 개인회생. 다음 달 잔고를 플러스로(지점 정리·지출 줄이기)`, "home");
  else { const rw = runway(s); if (rw.months <= 6) add(2, `⚠ ${rw.months ? `이대로면 ${rw.months}달 뒤` : "다음 달이면"} 돈이 바닥나요(월 ${won(-rw.net)} 적자 · 남은 신용 한도 ${won(rw.credit)})`, "home"); }
  { const need = workNeed(s), d = s.co.workDone || 0; if (need > 0 && d < need) add(d === 0 ? 2 : 1, `${D.RANKS[s.co.rank].n} 회사 일 ${d}/${need}${s.co.crunchM ? " (마감 주간)" : ""} · 성과 내기·야근`, "co"); }
  if (SJ.isActive(s, "pr")) t.push(...PR.todos(s));
  if (SJ.isActive(s, "cs")) t.push(...CS.todos(s));
  if (SJ.isActive(s, "insta")) t.push(...INS.todos(s));
  if (SJ.isActive(s, "airbnb")) t.push(...AB.todos(s));
  if (SJ.isActive(s, "ucafe")) t.push(...UC.todos(s));
  for (const P of REG.JOBS) if (P.todos && SJ.isActive(s, P.key)) t.push(...(P.todos(s) || []).map((x) => ({ go: P.key, ...x })));
  t.push(...BIG.todos(s));
  if (s.grad && !s.grad.done && s.grad.lastT !== s.t) add(0, `대학원 수업 ${s.grad.n}/${D.GRADS[s.grad.k].need}`, "grad");
  t.push(...SJ.todos(s));
  if (s.hp < 35) add(2, `스태미너 ${Math.round(s.hp)}: 다음 달 행동력이 줄어요. 쉬어 가세요`, "home");
  if (s.mental < 30) add(2, `멘탈 ${Math.round(s.mental)}: 번아웃 위험`, "pub");
  for (const [id, x] of Object.entries(s.rel)) if (x.lover && s.t - (x.dateT ?? x.last) >= 1) add(s.t - (x.dateT ?? x.last) >= 2 ? 2 : 1, `${jo(CHAR[id].name, "과", "와")} ${s.t - (x.dateT ?? x.last)}개월째 데이트 없음`, "people:" + id);
  if (s.fam.spouse && s.fam.happy < 45) add(s.fam.happy < 25 ? 2 : 1, `가족 행복 ${Math.round(s.fam.happy)}: 가족과 시간 필요`, "home");
  if (s.t - s.fam.lastVisit >= 6) add(1, `부모님을 ${s.t - s.fam.lastVisit}개월째 못 뵘`, "parents");
  if (!(s.co.quit || s.co.fired)) { if (s.co.perf < 30) add(s.cal >= 11 ? 2 : 1, `회사 성과 ${Math.round(s.co.perf)}${s.cal >= 11 ? " · 곧 연말 평가" : ""}`, "desk"); if (s.co.eye >= 50) add(2, `회사 눈치 ${Math.round(s.co.eye)}: 겸업 발각 위험`, "desk"); }
  const ready = Object.entries(s.rel).filter(([id, x]) => { const c = CHAR[id]; const st = c?.arc?.find((a) => a.stage === x.stage + 1); return st && x.aff >= st.gate; });
  for (const [id] of ready.slice(0, 2)) add(0, `${jo(CHAR[id].name, "과", "와")} 나눌 이야기가 있다`, "people:" + id);
  return t.sort((a, b) => b.lv - a.lv);
}

function makeNews(s) {
  const r = R(s);
  const lines = [];
  for (const m of D.MACRO) if (s.era[m.id]) lines.push(m.news);
  if (s.era.pandemic) lines.push("모임 금지 연장… 파티룸 예약 '0건' 속출");
  if (s.era.rate) lines.push("기준금리 또 인상, 대출 이자 부담 커져");
  if (s.era.house) lines.push("집값 급등, 서울 아파트 평균 신고가");
  if (s.era.ai) lines.push("\"자소서는 AI가 쓴다\" 취준생 절반이 챗GPD 사용");
  if ([2, 8].includes(s.cal)) lines.push(`${s.cal === 2 ? "상반기" : "하반기"} 공채 다음 달 시작… 취준생 '첨삭' 수요 꿈틀`);
  if ([3, 9].includes(s.cal)) lines.push(`${s.cal === 3 ? "상반기" : "하반기"} 공채 개막, 자소썰닷컴 접속 폭주`);
  if (s.cal === 12) lines.push("연말 모임 시즌, 파티룸 주말 예약 '하늘의 별 따기'");
  if (s.cal === 5) lines.push("종합소득세 신고 마감 임박, N잡러 '세금 폭탄' 주의");
  if ([12, 1, 2].includes(s.cal)) lines.push("한파 특보… 난방 안 되는 공간 '별점 테러'");
  if (s.cal === 4 || s.cal === 10) lines.push("웨딩 시즌, 브라이덜샤워 파티룸 문의 급증");
  lines.push(r.pick(["직장인 3명 중 1명 'N잡 중'", "퇴근 후 2시간이 인생을 바꾼다? 부업 열풍", "우주공간 신규 공간 등록 역대 최다", "크멍 '취업 컨설팅' 카테고리 거래액 증가", "MZ 직장인 '파이어족' 꿈꾸지만 현실은"]));
  return lines[0];
}

// 저장·불러오기
export function save(s) { const c = JSON.parse(JSON.stringify(s)); c.toasts = []; return JSON.stringify(c); }
export function load(str) {
  const s = JSON.parse(str); if (s.v !== 4) return null;
  const cw1 = !!s.carwash && s.carwash.bag === undefined && (s.carwash.months || 0) > 0; // 11-28 세차 1단계 때 저장(가방 항목이 생기기 전): 초반 고생을 다시 시작하지 않는다(sj.js fixOldRamp)
  fillState(s); SJ.fixT0(s, { cw1 }); UND.backfill(s); // 11-28 이해도가 없던 때의 저장: 해 온 기간만큼 한 번 채운다(und.js) // 버그 2: 굳어 버린 시작 달을 매장 개월 수에 맞춘다
  return s;
}
// 11-28 목록에 없는 인물 정리: 숨김 스위치(주소 해시 포함)를 켜고 만든 저장을 끈 채 열면 CHAR 에 없는 인물 id 가 남아 달 넘기기가 멈춘다.
//   그런 id 가 하나라도 있을 때만 움직인다(보통 저장은 그대로). 배우자였으면 미혼으로, 연인·조력자·아는 사람이었으면 모르는 사이로 돌린다. 스위치를 다시 켜면 처음 보는 사람으로 돌아온다
function dropGone(s) {
  const bad = (id) => typeof id === "string" && /^c\d+$/.test(id) && !CHAR[id];
  const gone = new Set([...Object.keys(s.rel || {}), ...(s.cast || []), s.fam?.spouse, s.fam?.sp?.id, ...Object.keys(s.wed?.p || {}), ...Object.values(s.spot || {}).flatMap((a) => (Array.isArray(a) ? a : []))].filter(bad));
  if (!gone.size) return;
  for (const id of gone) { if (s.rel) delete s.rel[id]; if (s.wed?.p) delete s.wed.p[id]; }
  if (s.cast) s.cast = s.cast.filter((id) => !gone.has(id));
  for (const k of Object.keys(s.spot || {})) if (Array.isArray(s.spot[k])) s.spot[k] = s.spot[k].filter((id) => !gone.has(id));
  if (s.fam) { if (gone.has(s.fam.spouse)) { s.fam.spouse = null; s.fam.spouseType = null; s.fam.marriedT = null; s.fam.lowHappy = 0; s.fam.pregnant = null; } if (s.fam.sp && gone.has(s.fam.sp.id)) delete s.fam.sp; }
  const hit = (q) => { try { const t = JSON.stringify(q) || ""; for (const id of gone) if (t.includes(`"${id}"`)) return true; } catch (e) {} return false; }; // 그 사람이 나오는 대기 장면
  for (const k of ["sceneQ", "sceneLater"]) if (Array.isArray(s[k])) s[k] = s[k].filter((q) => !hit(q));
  if (s.pending && hit(s.pending)) s.pending = null;
}
// 없는 칸 기본값 채우기. 불러올 때와 새 판을 만들 때 같이 돈다(버그 10: '이어 한 판'과 '껐다 켠 판'이 같아지게)
function fillState(s) {
  try { dropGone(s); } catch (e) { console.warn(e); }
  { const RN = { "LC전자": "엘쥐전자", "SQ하이닉스": "스크하이닉스" }; if (s.co && RN[s.co.name]) s.co.name = RN[s.co.name]; }
  for (const x of Object.values(s.rel || {})) if (x && x.loverSince != null && !x.lover && !x.spouse && x.exT == null) { x.exT = s.t; x.exKind = "drift"; } // 11-25 옛 저장(이별 기록 전)의 헤어진 사이: 이별 달·이유를 채워 재회 장면이 뜨게 한다(히로인 설계 4-4) // 11-25 대표 결정: 게임 속 이름을 스크하이닉스·엘쥐전자로(옛 저장의 회사 이름도 바꾼다)
  if (!s.sj) { s.sj = SJ.init(); s.sj.open = true; for (const k of ["pr", "cs"]) if ((k === "pr" && s.pr.rooms.length) || (k === "cs" && s.cs.niche)) { s.sj.found[k] = 0; s.sj.int[k] = 100; s.sj.active.push(k); } }
  if (!s.hb) s.hb = SJ.hbInit();
  s.me.perks = s.me.perks || [];
  if (!s.moments) { s.moments = {}; for (const m of D.MOMENTS) { try { if (m.test(s)) s.moments[m.key] = s.t; } catch (e) {} } }
  if (s.st.body === undefined) s.st.body = 30;
  if (!s.ins) s.ins = INS.init(); INS.ens(s); /* 인별 v2: 예전 주제 → 컨셉 */ if (!s.big) s.big = BIG.init(); if (!s.ab) s.ab = AB.init(); if (!s.uc) s.uc = UC.init(); s.fame = s.fame || 0; if (s.st.lang === undefined) s.st.lang = 15; s.pi = s.pi || Math.pow(1.025, s.t / 12); s.piX = s.piX || 1; if (s.grad === undefined) s.grad = null; PR.fill(s);
  s.ng = s.ng || { n: 1, hard: false, gifts: [] }; s.items = s.items || {}; GC.ensure(s); s.me.revealed = s.me.revealed || {}; s.me.job = s.me.job || "plan"; if (!D.MAJORS[s.me.major]) s.me.major = "biz";
  const co = s.co; co.payIdx = co.payIdx || Math.pow(1.02, Math.max(0, co.years - 1)); co.pts = co.pts || 0; co.grades = co.grades || []; co.remote = co.remote || 0; co.evT = co.evT ?? -99; co.hired = co.hired || [];
  try { fixCoSpots(s); } catch (e) { console.warn(e); } // 11-25 옛 저장: 회사 종류별 장소가 생기기 전의 장소 id(pantry·dinner 등)에 선 사람·느낌표를 지금 회사의 장소로
  // 11-24 인물 관계. 옛 저장: 사수는 윤가람(c102)으로 보고 판 중간에 바뀌지 않는다. 사수 한쪽(only)은 그 판의 사수일 때만 등장 인물에 든다(곽지헌은 새 게임의 여자 주인공 판에만)
  s.flags = s.flags || {}; if (!s.flags.sasu) s.flags.sasu = "c102";
  try { HL.ensure(s); } catch (e) { console.warn(e); } // 11-25 히로인·히어로의 인생 시계(옛 저장: 이미 지난 사건은 소식 없이 지난 것으로 적는다. 등장 인물은 바꾸지 않는다)
  for (const c of CHARS) if (c.co && !s.cast.includes(c.id) && (!c.only || c.id === s.flags.sasu)) s.cast.push(c.id);
  // 친분 마크(한 번만): 이미 하트였던 회사 사람이 ◆로 돌아가지 않게 rel.heart 를 채운다. 연인·배우자·고백 기록이 있거나, 연애 가능한 사람과 호감 50 이상. 사수는 대시로만 넘어오니 호감만으로는 안 채운다
  if (s.flags.rel2 === undefined) {
    for (const [id, x] of Object.entries(s.rel || {})) { const c = CHAR[id]; if (!c?.rank || x.heart != null) continue;
      if (x.lover || x.spouse || x.affair || x.cfDone || x.cfBack != null || x.cfTry != null || (id !== s.flags.sasu && x.aff >= 50 && isRomanceable(s, c))) x.heart = x.loverSince ?? s.t; }
    s.flags.rel2 = s.t;
  }
  // 플러그인 투잡: 옛 저장에는 상태가 없으니 만들고, 플러그인이 자기 저장 이전을 한다
  for (const P of REG.JOBS) { if (!s[P.key]) s[P.key] = P.init(s); if (P.migrate) { try { P.migrate(s, s[P.key]); } catch (e) { console.warn(e); } } }
  s.sx = s.sx || {}; for (const X of REG.STORY) { if (!s.sx[X.key]) s.sx[X.key] = X.init(s); if (X.migrate) { try { X.migrate(s, s.sx[X.key]); } catch (e) { console.warn(e); } } }
  s.sj.active = s.sj.active.filter((k) => D.SIDEJOBS[k]?.play && (REG.get(k) || ["pr", "cs", "insta", "airbnb", "ucafe"].includes(k))); // 플러그인을 뺀 판에서 그 투잡은 꺼진다
  return s;
}
export { D, HL };
// 11-25 인물 나이: 주인공과 같은 기준(해가 바뀌면 한 살)
export const charAge = (s, c) => (c?.age || 0) + (ageNow(s) - Math.floor((s.startAge ?? 27) + 1e-9));
export { yearScene }; // 시험 해시(#autoN-yr2)용
