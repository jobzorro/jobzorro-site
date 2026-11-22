// 웹소설 투잡 엔진 플러그인. 규약은 engine/jobs/README.md
// 매일 5,000자. 연재는 체력이다.
// 흐름: 무료 연재 → 노블리 공모전·투고 → 매니지먼트 계약·유료 전환 → 랭킹·댓글 → 100화 완결 → 2차 판권(웹툰화)
// 핵심 자원은 비축분(미리 써 둔 회차). 매달 연재 주기만큼 비축분에서 빠져나가고, 모자라면 펑크 = 독자 이탈.
import * as D from "../defs.js";
import { addMoney, log, won, gainStat, mod, applyEff } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js";

const K = "webnovel";
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const R2 = (x) => Math.round(x * 100) / 100;
const working = (s) => !(s.co?.quit || s.co?.fired);
const hasTr = (s, id) => (s.me?.traits || []).includes(id);

// 장르: rate = 독자가 붙는 속도, cap = 커질 수 있는 크기
export const GENRES = {
  hyun: { n: "회귀 현판", rate: 0.2, cap: 1.0, tip: "직장·회귀 현대판타지. 4~8개월이면 반응이 온다", titles: ["팀장이 회귀했다", "퇴근하면 레벨 업", "야근 없는 회사의 비밀", "신입이 사장을 기억한다"] },
  rofan: { n: "로맨스판타지", rate: 0.27, cap: 0.9, tip: "반응이 가장 빠르다(3~6개월). 대신 경쟁이 세고 독자가 냉정하다", titles: ["악녀는 정시 퇴근합니다", "북부 대공의 계약 비서", "이혼은 3화에서 하겠습니다"] },
  murim: { n: "무협", rate: 0.13, cap: 1.2, tip: "느리게 오른다(6~12개월). 한번 붙은 독자는 오래 간다. 고증 공부가 필요", titles: ["화산파 막내 사형", "천하제일 회계사", "검마의 정시 퇴근"] },
  fan: { n: "판타지", rate: 0.15, cap: 1.12, tip: "세계관 짜는 시간이 길다. 터지면 크다", titles: ["탑 100층의 공무원", "황혼의 서약", "마왕성 경영기획팀"] },
};
// 연재 주기: 한 달에 올리는 화수
const T2 = { hyun: ["퇴근만 하면 레벨이 오름", "회귀한 팀장이 칼퇴함", "신입인데 사장님을 기억함"], rofan: ["대공님 이혼은 다음 화에", "악녀인데 정시 퇴근함", "계약 비서가 대공비가 됨"], murim: ["무림맹 막내가 회계를 함", "검마가 칼퇴를 사수함"], fan: ["100층 탑이 내 사무실임", "마왕성 기획팀이 일을 너무 잘함"] };
export const SCHED = { 0: { n: "휴재", f: 0 }, 8: { n: "주 2회", f: 0.8 }, 12: { n: "주 3회", f: 1 }, 20: { n: "주 5회", f: 1.22 } };
export const LEVELS = [
  null,
  { n: "자유연재 새내기", need: "시작, 1화 업로드", unlock: "노블리 자유연재, 하루 1,000~1,500자 루틴" },
  { n: "20화의 벽을 넘은 자", need: "한 작품 20화 + 충성 독자 50명", unlock: "공모전 참가·매니지먼트 투고" },
  { n: "유료화 작가", need: "연재 50화 + 매니지먼트 계약 → 유료 전환", unlock: "유료 연재(한 화 100원, 작가 몫 약 42%), 표지 지원" },
  { n: "완결 작가", need: "100화 완결 + 최고 독자 500명", unlock: "완결작 인세(전자책·단행본), 차기작 선인세" },
  { n: "IP 작가", need: "유료 완결 2질 또는 2차 판권 계약 1건", unlock: "웹툰화·해외 번역, 작법 강의" },
];
export const SEASON = [1.08, 1.05, 0.96, 0.97, 1, 1, 1.08, 1.1, 0.96, 1, 1, 1.05]; // 방학·연휴에 많이 읽는다
export const CONTEST_M = [5, 6, 10, 11]; // 노블리 공모전 시즌
// 11-21 밸런스(엔딩 희소성). 원래: 웹툰화 제안은 최고 독자 800명부터 달마다 3~25% → '원작자' 엔딩 100%, '성실한 완결 작가'는 28개월에 100%.
// 지금: 최고 독자 ipPeak 명부터·확률 최고독자/ipDiv(2~15%). 성실한 완결 작가는 완결 3질 + 연재 steadyM 달 + 판권 없이(대박은 없었지만).
export const WN_BAL = { ipPeak: 6000, ipDiv: 60000, steadyM: 60 };
// 11-22 특이 요소 3개(독점·비독점, 표절 시비, 편집자 피드백). 효과 크기는 여기만 고친다.
export const WN_F30 = {
  deal: { ep: 40, adv: [0.35, 150, 1500], waitAdv: 1.2, exM: 6, exExpo: 1.25, exAfter: 1.08, // 독점: 선인세 = clamp(독자×0.35, 150, 1500)만 × 물가(연재 수익에서 먼저 깎임), 메인 배너 6달 노출 ×1.25 → 그 뒤 ×1.08
    waitFans: 1.3, waitCap: 1.12, waitPay: 0.72, // 기다리면 무료: 독자 유입 ×1.3·크기 ×1.12, 한 명당 결제 ×0.72
    multiPay: 1.18, multiExpo: 0.9, multiTired: 4 }, // 비독점: 여러 곳 결제 ×1.18, 노출 ×0.9, 업로드 관리 피로 +4/달
  plag: { fans: 120, gap: 30, spread: 0.45 }, // 표절 시비: 독자 120명부터, 30달에 한 번까지. 무시하면 45% 확률로 번진다
  edit: { gap: 10, ret: 4, hit: 5, pen: 100, indieShare: 0.55, indieExpo: 0.88, indieTired: 3 }, // 편집자: 10달에 한 번까지. 혼자 가면 작가 몫 42→55%, 노출 ×0.88, 피로 +3/달, 위약금 100만+남은 선인세
};
// 계약 방식에 따른 배율
export function dealFx(w) {
  const D3 = WN_F30.deal, E3 = WN_F30.edit, o = { expo: 1, fans: 1, pay: 1, tired: 0 };
  if (!w) return o;
  if (w.deal === "ex" || w.deal === "wait") o.expo = w.exT > 0 ? D3.exExpo : D3.exAfter;
  if (w.deal === "wait") { o.fans = D3.waitFans; o.pay = D3.waitPay; }
  if (w.deal === "multi") { o.expo = D3.multiExpo; o.pay = D3.multiPay; o.tired = D3.multiTired; }
  if (w.indie) { o.expo *= E3.indieExpo; o.tired += E3.indieTired; }
  return o;
}
export const DEAL_N = { ex: "독점", wait: "독점·기다리면 무료", multi: "비독점" };
const PER_FAN_EP = 0.0036; // 독자 1명이 1화 결제(100원) → 플랫폼 40% 떼고, 매니지먼트 3 : 작가 7 → 작가 약 42원 × 구매율 85%

export function lvNeed(s) {
  const W = s.webnovel; if (!W || W.lv >= 5) return null;
  const n = W.lv + 1, L = LEVELS[n];
  const prog = n === 2 ? Math.min(1, (W.work?.ep || W.maxEp) / 20) * 0.5 + Math.min(1, (W.work?.fans || 0) / 50) * 0.5
    : n === 3 ? Math.min(1, (W.work?.ep || 0) / 50) * 0.6 + (W.work?.mgmt ? 0.4 : 0)
    : n === 4 ? Math.min(1, (W.work?.ep || 0) / 100) * 0.6 + Math.min(1, Math.max(W.bestPeak, W.work?.peak || 0) / 500) * 0.4
    : Math.max(Math.min(1, W.paidDone / 2), W.ip ? 1 : 0);
  return { lv: n, n: L.n, need: L.need, prog };
}
function lvCheck(s, notes, scenes) {
  const W = s.webnovel, w = W.work;
  const ok = (n) => n === 2 ? (W.maxEp >= 20 && Math.max(W.bestFans, w?.fans || 0) >= 50)
    : n === 3 ? W.paidEver
    : n === 4 ? (W.done >= 1 && W.bestPeak >= 500)
    : n === 5 ? (W.paidDone >= 2 || W.ip >= 1) : false;
  while (W.lv < 5 && ok(W.lv + 1)) { W.lv++; notes.push(`웹소설 Lv${W.lv} ${LEVELS[W.lv].n} · 열림: ${LEVELS[W.lv].unlock}`); log(s, `웹소설 Lv${W.lv} ${LEVELS[W.lv].n}`, "work"); }
}
// 작품 품질(0.5~1.5): 글쓰기·감각·플롯 정리
export function quality(s) {
  const W = s.webnovel, st = s.st || {};
  let q = 0.5 + (st.write || 0) / 210 + (st.sense || 0) / 650 + (W.plot || 0);
  if (W.tired >= 70) q *= 0.86;
  if (SYN.on(s, "wn_club")) q += 0.04;
  return clamp(q, 0.5, 1.5);
}
// 한 번 쓸 때 화수
export function writeEps(s, boost = 1) {
  const W = s.webnovel, st = s.st || {};
  return Math.max(1, Math.round((2.6 + (st.write || 0) / 45) * boost * (W.ai ? 1.25 : 1) * (s.fullJob === K ? 1.35 : 1)));
}
export function capOf(s, w) {
  const W = s.webnovel, G = GENRES[w.g] || GENRES.hyun, q = quality(s);
  return 520 * Math.pow(q, 1.6) * G.cap * w.hit * (1 + 0.2 * Math.min(3, W.done)) * mod(s, "wnCap", 1) * clamp(w.retain, 0.5, 1) * (W.redeem && !w.mgmt ? 1.1 : 1) * (w.deal === "wait" ? WN_F30.deal.waitCap : 1);
}
export function newWork(s, r, g) {
  const W = s.webnovel, G = GENRES[g] || GENRES.hyun;
  const used = new Set(W.works.map((x) => x.n));
  const n = G.titles.find((t) => !used.has(t)) || `${r.pick(G.titles)} ${W.works.length + 1}`;
  // hit: 이 작품이 터질 운(로그정규). 대부분 1 언저리, 가끔 대박
  const hit = R2(clamp(Math.exp(0.62 * r.normal()) * (W.redeem ? 1.2 : 1), 0.35, 4.5));
  const start = Math.round(W.pen * 0.5 * (W.nextBoost || 1));
  W.work = { n, g, ep: 0, goal: 100, fans: start, peak: start, retain: 0.92, hit, paid: false, mgmt: false, share: 0.42, t0: s.t, slump: 0, title2: false, cover: false, rev3: [], mgmtNo: 0, ev: {} };
  W.nextBoost = 1; W.redeem = false;
  if (W.t0 === null || W.t0 === undefined) W.t0 = s.t;
  return W.work;
}
function finish(s, r, notes, scenes) {
  const W = s.webnovel, w = W.work;
  const avg = w.rev3.length ? w.rev3.reduce((a, b) => a + b, 0) / w.rev3.length : 0;
  const tail = Math.round(avg * 0.22 * (hasTr(s, "author") ? 1.3 : 1) * (W.lv >= 4 ? 1.2 : 1));
  W.works.push({ n: w.n, g: w.g, ep: w.ep, peak: Math.round(w.peak), paid: w.paid, tail, t: s.t, done: true, ret: R2(w.retain) });
  W.done++; if (w.paid) W.paidDone++;
  W.bestPeak = Math.max(W.bestPeak, w.peak);
  W.pen = Math.max(W.pen, Math.round(w.peak * 0.4));
  if (hasTr(s, "author")) W.pen = Math.round(W.pen * 1.15);
  W.work = null; W.sched = 12;
  log(s, `웹소설 '${w.n}' ${w.ep}화 완결`, "work");
  scenes.push({ kind: "event", tag: "웹소설", title: "100화 완결", onChoose: "wn_fin", text: `새벽 1시, '완결' 버튼을 눌렀다. '${w.n}' ${w.ep}화. ${Math.max(1, Math.round((s.t - w.t0) / 12 * 10) / 10)}년이 걸렸다. 마지막 화 댓글이 ${Math.round(w.fans * 0.3 + 20)}개다. 처음으로 회사에서 졸지 않았다.`,
    choices: [{ t: "외전 5화로 팬 서비스", eff: { hp: -4 }, text: "외전 공지에 \"작가님 사랑해요\"가 쏟아졌다. 필명 팬이 늘었다." }, { t: "바로 차기작 기획", eff: {}, text: "메모장에 새 제목을 적었다. 이번 독자들이 다음 작품으로 따라온다." }] });
  if (w.retain < 0.8 || W.tired >= 75) W.burnAsk = s.t + 1; // 용두사미·번아웃 → 필명 고민
}

// ───────── 11-22 특이 요소 장면 ─────────
function dealScene(s) {
  const w = s.webnovel.work, D3 = WN_F30.deal, pi = SYN.pi(s);
  const adv = Math.round(clamp(w.fans * D3.adv[0], D3.adv[1], D3.adv[2]) * pi / 10) * 10, advW = Math.round(adv * D3.waitAdv / 10) * 10;
  s._wnDeal = { adv, advW };
  return { kind: "event", tag: "웹소설", title: "독점이냐, 여러 곳이냐", onChoose: "wn_deal",
    text: `매니지먼트 담당자가 두 안을 내밀었다. 큰 플랫폼 한 곳에 독점이면 메인 배너와 선인세 ${won(adv)}. 대신 다른 곳엔 못 올리고, 선인세는 내 몫에서 먼저 깎인다. 비독점이면 여러 곳에 동시에 올린다.`,
    choices: [
      { t: `독점 · 선인세 ${won(adv)} + 메인 배너`, eff: {}, text: "메인 배너에 표지가 걸렸다. 이제 선인세만큼 팔려야 내 몫이 생긴다." },
      { t: `독점 + '기다리면 무료' · 선인세 ${won(advW)}`, eff: {}, text: "하루 한 편 무료. 독자가 몰려온다. 한 명이 내는 돈은 줄었다." },
      { t: "비독점 · 여러 플랫폼에 동시 연재", eff: {}, text: "업로드 창 세 개에 같은 화를 올린다. 정산서도 세 장이다." },
    ] };
}
// 표절 시비: 내 작품이 의심받는다. ev=true 면 pickEvent 형식으로
function plagScene(s, ev) {
  const sc = { title: "표절 시비", onChoose: "wn_plag", ...(s.webnovel?.seen?.p1 === undefined ? { cine: "wn_plag" } : {}), // 화보는 처음 한 번만
    text: "\"이거 그 작품이랑 설정 똑같은데?\" 댓글 하나가 커뮤니티로 퍼졌다. 회귀, 계약, 복수. 이 장르에서 안 겹치는 설정이 있나 싶지만 캡처가 돌기 시작했다.",
    choices: [
      { t: "작업 노트·날짜를 공개하고 차분히 해명", check: { stat: "write", dc: 48 }, ok: { text: "몇 년 전 날짜가 찍힌 설정 노트가 오히려 화제가 됐다.", eff: { wn_fans: 4, mental: -1 } }, ng: { text: "해명글이 변명처럼 읽혔다. 댓글이 더 붙었다.", eff: { wn_fans: -6, mental: -5 } } },
      { t: "무시하고 연재를 이어 간다", eff: {}, text: "대꾸하지 않았다." },
      { t: "겹친다는 장면을 고쳐 다시 올린다", eff: { wn_bank: -3, wn_hit: -5, mental: -1 }, text: "주말 내내 세 화를 고쳐 썼다. 시비는 조용히 가라앉았다." },
    ] };
  return ev ? { t: sc.title, x: sc.text, onChoose: sc.onChoose, c: sc.choices, cine: sc.cine } : { kind: "event", tag: "웹소설", ...sc };
}
// 편집자 피드백: 매니지먼트 수수료 30%의 값어치
function editScene(s, ev) {
  const w = s.webnovel.work, E3 = WN_F30.edit, pen = Math.round((w.adv || 0) + E3.pen * SYN.pi(s));
  s._wnEd = { pen };
  const c = [
    { t: "피드백대로 고친다", eff: { wn_bank: -2, hp: -3, wn_ret: E3.ret, wn_hit: E3.hit }, text: "사이다를 두 화 앞당겼다. 편집자가 '좋아요' 한마디를 남겼다." },
    { t: "내 고집대로 빌드업을 간다", check: { stat: "sense", dc: 45 }, ok: { text: "참은 만큼 터졌다. 반전 화 댓글창이 난리가 났다.", eff: { wn_hit: 15, mental: 3 } }, ng: { text: "고구마가 세 화째. 하차 댓글이 늘었다.", eff: { wn_ret: -6, wn_fans: -5, mental: -3 } } },
  ];
  if (w.paid) c.push({ t: `매니지먼트를 나와 혼자 간다 (위약금 ${won(pen)})`, eff: {}, text: "표지도, 홍보도, 정산도 이제 내 몫이다." });
  const sc = { title: "편집자의 빨간 줄", onChoose: "wn_edit", text: "담당 편집자 메일. \"이번 화 고구마예요. 주인공이 너무 오래 당해요. 사이다를 앞당겨 주세요.\" 수익의 30%를 가져가는 사람의 의견이다.", choices: c };
  return ev ? { t: sc.title, x: sc.text, onChoose: sc.onChoose, c: sc.choices } : { kind: "event", tag: "웹소설", ...sc };
}
// 시험용: #auto…-webnovel-f30deal|f30plag|f30edit 에서 장면을 강제로 띄운다
export function f30Scene(s, r, what) {
  const W = s.webnovel; if (!W.work) newWork(s, r, "hyun");
  const w = W.work; w.ep = Math.max(w.ep, 42); w.fans = Math.max(w.fans, 400); w.mgmt = true; W.lv = Math.max(W.lv, 3);
  if (what === "deal") { w.deal = null; return dealScene(s); }
  if (what === "edit") { w.paid = true; W.paidEver = true; return editScene(s); }
  return plagScene(s);
}

// ───────── 이벤트(16개 + 웹소설 고유 골치 3개) ─────────
function pickEvent(s, r) {
  const W = s.webnovel, w = W.work, seen = W.seen, once = (id) => seen[id] === undefined;
  const L = [];
  const add = (id, cond, f) => { if (cond) L.push([id, f]); };
  if (w) {
    // 초반(early)
    add("e02", once("e02") && working(s) && w.ep >= 3 && W.lv <= 2, () => ({ t: "회사가 소재다", x: "오늘도 팀장이 보고서를 세 번 반려했다. 문득 떠올랐다. 팀장이 회귀해서 신입이 된다면? 메모장이 바빠졌다.",
      c: [{ t: "직장 현대판타지 에피소드로 쓴다", eff: { stat: { write: 0.6 }, wn_hit: w.g === "hyun" ? 18 : 10 }, text: "\"이거 우리 회사 얘기 아님?\" 댓글이 달리기 시작했다." },
        { t: "유행하는 무협 감성을 섞는다", eff: { wn_bank: -3, mental: -2, wn_hit: 8 }, text: "고증 자료를 찾느라 비축분을 까먹었다. 그래도 반응은 나쁘지 않다." }] }));
    add("e03", once("e03") && w.ep >= 5 && w.fans >= 8, () => ({ t: "첫 댓글", x: "5화 아래에 첫 댓글이 달렸다. \"작가님 이거 대박 날 듯. 다음 화 언제요?\" 화면을 캡처해 바탕화면에 깔았다.",
      c: [{ t: "정성 답글과 설정 비하인드 공개", eff: { mental: 5, wn_fans: 10 }, text: "그 독자가 친구 둘을 데려왔다." }, { t: "답글 대신 다음 화로 보답", eff: { wn_bank: 1, wn_ret: 2 }, text: "말 대신 원고. 연재 리듬이 단단해졌다." }] }));
    add("e04", once("e04") && w.ep >= 6 && !w.title2, () => ({ t: "서술형 제목의 유혹", x: `노블리 랭킹 상위 제목이 전부 한 문장이다. "퇴근만 하면 돈이 쌓임" 같은 식이다. 내 제목은 '${w.n}'이다.`, onChoose: "wn_title",
      c: [{ t: "유행 서술형 제목으로 바꾼다", eff: { mental: -2 }, text: "조회수가 바로 뛰었다. 조금 부끄럽다." }, { t: "내 제목을 지킨다", eff: { mental: 3 }, text: "제목은 작가의 얼굴이다. 조회수는 그대로." }] }));
    // 중반(mid)
    add("e06", W.lv >= 2 && CONTEST_M.includes(s.cal) && W.contestSeason !== seasonId(s) && w.ep >= 10, () => ({ t: "공모전 시즌", x: "노블리 공모전이 열렸다. 공모전 전용 순위판에 오르면 돈 한 푼 안 들이고 노출된다. 마감까지 25화가 필요하다.", onChoose: "wn_contest_ev",
      c: [{ t: "주말을 갈아 넣어 참가", eff: { hp: -12, wn_bank: 3, wn_tired: 10 }, text: "토요일과 일요일이 원고로 사라졌다. 공모전 순위판에 이름이 올라갔다." }, { t: "평소 페이스 유지", eff: {}, text: "공모전은 다음에. 몸이 먼저다." }] }));
    add("e09", once("e09") && W.lv >= 2 && w.fans >= 60, () => ({ t: "베낀 작품", x: "내 설정을 거의 그대로 가져온 작품이 랭킹 3위에 올랐다. 하루 두 화씩 올린다. AI로 쓰는 것 같다는 소문이 돈다.",
      c: [{ t: "신경 끄고 내 플롯대로 간다", eff: { mental: -3 }, text: "그 작품은 석 달 뒤 조용히 연재 중단됐다." }, { t: "속도전으로 맞불", eff: { hp: -12, wn_bank: 4, wn_ret: -5, wn_tired: 12 }, text: "하루 두 화. 손목이 시큰거리고 문장이 거칠어졌다." },
        { t: "날짜 찍힌 원고를 모아 플랫폼에 신고한다", check: { stat: "num", dc: 50 }, ok: { text: "플랫폼이 그 작품을 내렸다. 독자들이 '원조'를 찾아왔다.", eff: { wn_fans: 8, mental: 2, hp: -4 } }, ng: { text: "\"유사성을 판단하기 어렵습니다.\" 답장 한 줄에 석 달이 갔다.", eff: { mental: -6, hp: -4 } } }] }));
    // 11-22 표절 시비(내가 의심받는 쪽) · 편집자 피드백
    add("p1", W.lv >= 2 && w.fans >= WN_F30.plag.fans && (s.t - (seen.p1 ?? -99)) >= WN_F30.plag.gap, () => plagScene(s, true));
    add("ed", w.mgmt && !w.indie && w.ep >= 10 && (s.t - (seen.ed ?? -99)) >= WN_F30.edit.gap, () => editScene(s, true));
    // 위기(crisis)
    add("e13", !w.ev.e13 && w.ep >= 55 && w.ep <= 85 && w.retain < 0.88, () => ({ t: "중반의 늪", x: `첫 번째 큰 악당을 쓰러뜨렸다. 그런데 다음에 뭘 써야 할지 모르겠다. ${w.ep + 1}화를 세 번 지웠다. 연독률이 매화 2%씩 떨어진다.`,
      c: [{ t: "일주일 휴재하고 2부 플롯을 다시 짠다", eff: { wn_fans: -4, wn_ret: 8, wn_tired: -15 }, text: "2부 첫 화 댓글: \"작가님 각성하셨네.\"" }, { t: "비슷한 사건을 한 번 더 반복", eff: { wn_fans: -8, wn_ret: -4, wn_hit: -10 }, text: "\"이거 30화랑 똑같은데?\" 하차 댓글이 늘었다." }] }));
    add("e14", w.fans >= 150 && (s.t - (seen.e14 ?? -99)) >= 10, () => ({ t: "악플 폭격", x: `주인공이 한 번 진 화에 댓글 200개가 달렸다. "하차합니다." "작가 고구마 장인." 별점이 4.8에서 3.9가 됐다.`,
      c: [{ t: "댓글을 닫고 원래 플롯대로", eff: { mental: 3, wn_fans: -4 }, text: "사흘 뒤 반전 화가 올라가자 별점이 돌아왔다." },
        { t: "다음 화에서 급히 반전", check: { stat: "write", dc: 52 }, ok: { text: "급하게 쓴 반전이 오히려 명장면이 됐다.", eff: { wn_fans: 6 } }, ng: { text: "복선 없이 뒤집었다. \"개연성 어디 감?\"", eff: { wn_ret: -8, wn_fans: -3, mental: -4 } } }] }));
    add("e15", once("e15") && W.lv >= 3 && w.fans >= 300 && r.chance(0.25), () => ({ t: "플랫폼 정책 변경", x: `주력 플랫폼이 공지를 냈다. 특정 장르 연재를 더 이상 받지 않는다고. 내 장르다. 독자 ${Math.round(w.fans).toLocaleString()}명이 하루아침에 길을 잃었다.`,
      c: [{ t: "다른 플랫폼으로 이사", eff: { wn_fans: -35, hp: -8 }, text: "이사 공지를 따라온 독자는 셋 중 둘." }, { t: "장르를 비틀어 남는다", eff: { stat: { write: 1 }, wn_fans: -20, wn_ret: -3 }, text: "검열을 피해 설정을 바꿨다. 일부 독자가 떠났다." }] }));
    // x1 '회사 단톡방의 링크'(회사에 들킴)는 뺐다 → 들키는 장면은 engine/caught.js 가 투잡별로 맡는다
    // 11-23 웹소설 고유 골치 3개: 프로모션 심사 탈락 · 담당 편집자 교체 · 불법 공유(텍본)
    add("n1", w.paid && w.fans >= 150 && (s.t - (seen.n1 ?? -99)) >= 16, () => ({ t: "프로모션 심사 탈락", x: "매니지먼트 메일이 왔다. \"이번 달 플랫폼 프로모션 심사, 아쉽게 탈락입니다.\" 프로모션에 걸린 작품은 1화 조회수가 열 배다. 같은 날 연재를 시작한 옆 작품은 붙었다.",
      c: [{ t: "초반 5화를 고쳐 다음 심사에 다시 낸다", check: { stat: "write", dc: 50 }, ok: { text: "1화 첫 문단을 사건으로 바꿨다. 다음 달, 배너 구석에 내 표지가 걸렸다.", eff: { wn_hit: 10, wn_bank: -2, hp: -4 } }, ng: { text: "\"이번에도 아쉽게…\" 지난번과 같은 문장의 메일이 왔다.", eff: { wn_bank: -2, hp: -4, mental: -3 } } },
        { t: "프로모션 없이 연참으로 밀어 올린다", eff: { wn_bank: -3, wn_fans: 4, wn_tired: 8 }, text: "사흘 동안 하루 두 화. 실시간 순위에 잠깐 제목이 떴다." },
        { t: "다음 작품 때 노리기로 한다", eff: { mental: -2 }, text: "'알겠습니다'라고 답장했다. 옆 작품 조회수는 안 보기로 했다." }] }));
    add("n2", w.mgmt && !w.indie && w.ep >= 20 && !w.ev.n2, () => ({ t: "담당 편집자가 바뀌었다", x: `담당 편집자가 퇴사했다. 새 담당은 ${w.g === "rofan" ? "무협" : "로맨스판타지"}만 맡아 온 사람이다. 인수인계 메모는 두 줄. 피드백 메일이 2주째 없다. 회사 몫은 이번 달에도 그대로 나간다.`,
      c: [{ t: "먼저 전화해 설정과 완결 계획을 설명한다", check: { stat: "talk", dc: 45 }, ok: { text: "한 시간 통화 끝에 새 담당이 말했다. \"다음 프로모션 후보로 올려 볼게요.\"", eff: { wn_hit: 6, wn_ret: 2 } }, ng: { text: "\"네, 네. 참고할게요.\" 수화기 너머로 타자 소리만 들렸다.", eff: { mental: -3 } } },
        { t: "피드백 없이 내 판단으로 쓴다", eff: { wn_ret: -2, mental: 2 }, text: "빨간 줄 없는 원고는 편했다. 오타 지적 댓글이 조금 늘었다." },
        { t: "회사에 담당을 바꿔 달라고 요청한다", eff: { wn_ret: 3, wn_tired: 5, mental: -2 }, text: "한 달을 기다려 장르 담당이 붙었다. 그동안 메일을 여섯 통 썼다." }] }));
    add("n3", w.paid && w.fans >= 200 && (s.t - (seen.n3 ?? -99)) >= 20, () => ({ t: "40분 만에 텍본", x: `최신 화를 올린 지 40분. 불법 공유방에 텍스트 파일이 돌았다. 독자 ${Math.round(w.fans).toLocaleString()}명이 100원씩 내고 보는 화다. 공유방 조회수가 내 결제 수보다 많다.`,
      c: [{ t: "매니지먼트에 넘기고 원고에 집중한다", eff: { mental: -2 }, text: "\"법무팀에 전달했습니다.\" 답은 그게 끝이었다. 다음 화를 썼다." },
        { t: "밤새 링크를 찾아 하나하나 신고한다", eff: { hp: -6, wn_tired: 6, wn_fans: 3 }, text: "링크 서른 개를 내렸다. 아침에 서른한 번째가 올라왔다. 그래도 몇 명은 결제로 돌아왔다." },
        { t: "작가의 말에 솔직하게 적는다", check: { stat: "write", dc: 48 }, ok: { text: "\"100원이 모여 다음 화가 됩니다.\" '정주행 결제하고 옴' 댓글이 줄줄이 달렸다.", eff: { wn_fans: 4, mental: 2 } }, ng: { text: "\"독자를 도둑 취급하네.\" 엉뚱한 사람들이 화를 냈다.", eff: { wn_fans: -3, mental: -3 } } }] }));
  }
  // 완결 뒤(late)
  add("e11", !W.ipOffer && W.lv >= 4 && W.ip < 2 && W.bestPeak >= WN_BAL.ipPeak && r.chance(clamp(W.bestPeak / WN_BAL.ipDiv, 0.02, 0.15)), () => {
    const lump = Math.round(clamp(W.bestPeak * 0.7, 400, 3000) * SYN.pi(s) / 10) * 10; s._wnIp = { lump, mon: Math.round(clamp(W.bestPeak / 25, 30, 150) * SYN.pi(s)) };
    return { t: "웹툰화 제안", x: `웹툰 제작사에서 메일이 왔다. 원작 사용료 ${won(lump)}에 연재 수익 배분. 계약서가 40쪽이다. 등장인물 수를 줄여 달라는 요청도 있다.`, onChoose: "wn_ip",
      c: [{ t: "변호사 검토 후 계약 (검토비 50만)", eff: {}, text: "독소 조항 두 개를 고쳤다. 도장을 찍었다." }, { t: "조건 협상을 길게 끈다", eff: {}, text: "" }] };
  });
  add("e12", W.paidDone >= 1 && !W.audio && W.works.some((x) => x.paid && x.tail > 0) && r.chance(0.35), () => {
    const best = W.works.filter((x) => x.paid).sort((a, b) => b.peak - a.peak)[0]; s._wnAu = { n: best.n, lump: Math.round(clamp(best.peak * 0.25, 60, 600) * SYN.pi(s)) };
    return { t: "오디오북과 해외 번역", x: `완결작 '${best.n}'에 오디오북 제안과 해외 번역 연재 제안이 동시에 왔다. AI 번역 덕에 비용이 많이 줄었다고 한다.`, onChoose: "wn_audio",
      c: [{ t: "둘 다 진행", eff: { hp: -4 }, text: "녹음 대본 검수에 주말이 갔다. 대신 통장이 두 번 울렸다." }, { t: "해외만 진행", eff: {}, text: "번역본 첫 화에 외국어 댓글이 달렸다. \"Next chapter please!\"" }] };
  });
  if (!L.length) return null;
  const [id, f] = r.pick(L), e = f();
  seen[id] = s.t; if (w && id === "e13") w.ev.e13 = 1; if (w && id === "n2") w.ev.n2 = 1; if (id === "e11") W.ipOffer = s.t; if (id === "e12") W.audio = s.t;
  return { kind: "event", tag: "웹소설", title: e.t, text: e.x, onChoose: e.onChoose, choices: e.c, ...(e.cine ? { cine: e.cine } : {}) };
}
export const seasonId = (s) => `${s.year}-${s.cal <= 6 ? 1 : 2}`;

function contestEnter(s) { const W = s.webnovel; W.contestSeason = seasonId(s); W.contestT = s.t; W.expo = { x: 1.5, left: 2 }; }

export default {
  key: K, prefix: "wn_", hubName: "웹소설",
  init: () => ({ v: 2, lv: 1, work: null, works: [], bank: 0, sched: 12, ai: false, tired: 0, buzz: 0, plot: 0, expo: { x: 1, left: 0 }, done: 0, paidDone: 0, paidEver: false, ip: 0, ipPay: { left: 0, amt: 0 }, ipOffer: 0, audio: 0, pen: 0, bestPeak: 0, bestFans: 0, maxEp: 0, ups: 0, written: 0, seen: {}, hist: [], last: null, t0: null, contestSeason: "", contestT: -99, lunchT: -1, lecT: -1, nextBoost: 1, redeem: false, burnAsk: 0, newPen: 0, punk: 0, wrote: 0 }),
  actions: {
    wn_new: { n: "새 작품 기획", ap: 1, hp: 2, desc: "장르를 골라 1화를 준비한다", stat: { sense: 0.3 } },
    wn_write: { n: "원고 쓰기", ap: 1, hp: 4, desc: "퇴근 후 책상 앞. 비축분 +3~6화, 글쓰기 +" },
    wn_plot: { n: "플롯 다듬기·자료조사", ap: 1, hp: 2, desc: "연독률 회복, 이번 달 원고 품질 +. 감각 +" },
    wn_reader: { n: "독자 소통·홍보", ap: 1, hp: 2, desc: "댓글 답글·작가 SNS. 이번 달 독자 유입 +, 마케팅 +" },
    wn_contest: { n: "공모전 참가·투고", ap: 1, hp: 3, desc: "공모전 시즌(5·6·10·11월)엔 참가, 그 밖엔 매니지먼트에 투고" },
    wn_lunch: { n: "점심시간 몰래 쓰기", ap: 1, hp: 1, desc: "회사 자리에서 1~2화. 들키면 회사 눈치 +" },
    wn_lecture: { n: "작법 강의", ap: 1, hp: 4, desc: "IP 작가만. 강의료 +, 말빨 +" },
  },
  mg: { wn_write: "write" },
  money: { inc: ["웹소설 연재 수익", "웹소설 완결작 인세", "웹소설 상금·선인세", "웹소설 2차 판권", "웹소설 강의료"], exp: ["웹소설 비용"] },
  can(s, id) {
    const W = s.webnovel, w = W.work;
    if (id === "wn_new") return w ? "연재 중인 작품이 있어요(완결하거나 중단해야 새로 써요)" : null;
    if (!w && ["wn_write", "wn_plot", "wn_reader", "wn_lunch"].includes(id)) return "먼저 새 작품을 기획하세요";
    if (id === "wn_reader" && w.ep < 1 && W.bank < 1) return "1화부터 써야 독자가 생겨요";
    if (id === "wn_contest") {
      if (!w) return "연재 중인 작품이 없어요";
      if (W.lv < 2) return "Lv2(20화 + 독자 50명)부터";
      if (CONTEST_M.includes(s.cal)) { if (W.contestSeason === seasonId(s)) return "이번 공모전은 이미 냈어요"; if (w.ep + W.bank < 25) return "공모전은 25화부터(올린 화 + 비축분)"; return null; }
      if (w.mgmt) return "이미 매니지먼트와 계약했어요(공모전은 5·6·10·11월)";
      if (w.ep < 30) return "투고는 30화부터";
      if (W.pitchT === s.t) return "이번 달 투고는 했어요";
      return null;
    }
    if (id === "wn_lunch") { if (!working(s)) return "회사를 다닐 때만"; if (W.lunchT === s.t) return "점심은 한 달에 한 번만 몰래"; }
    if (id === "wn_lecture") { if (W.lv < 5) return "Lv5 IP 작가부터"; if (W.lecT === s.t) return "이번 달 강의는 했어요"; }
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const W = s.webnovel, w = W.work;
    if (id === "wn_new") {
      const g = GENRES[arg] ? arg : "hyun", nw = newWork(s, r, g);
      const eps = Math.max(1, Math.round(1.5 * boost)); W.bank += eps;
      return { lines: [`새 작품 '${nw.n}'(${GENRES[g].n})`, `비축 +${eps}화`, ...(nw.fans ? [`필명 팬 ${nw.fans}명이 따라왔다`] : [])], msg: r.pick(["제목을 열 번 바꿨다. 1화 첫 문장은 스무 번.", "\"눈을 떠 보니 입사 첫날이었다.\" 첫 문장이 정해졌다.", "장르 랭킹 1~20위 1화를 전부 읽고 나서 키보드에 손을 올렸다."]) };
    }
    if (id === "wn_write") {
      const eps = writeEps(s, boost); W.bank = Math.min(80, W.bank + eps); W.written += eps; W.wrote++;
      if (hasTr(s, "homebody")) s.hp = Math.min(s.hpMax, s.hp + 1);
      gainStat(s, "write", 0.35);
      if (s.fullJob === K) W.tired = Math.max(0, W.tired - 2);
      return { lines: [`원고 +${eps}화 (${(eps * 5000).toLocaleString()}자)`, `비축분 ${W.bank}화`, "글쓰기 +"], msg: r.pick(["밤 11시 55분. 마지막 문장을 치고 저장을 눌렀다.", "출근 지하철에서 메모장에 대사를 적고, 밤에 살을 붙였다.", "회차 끝 한 줄을 다섯 번 고쳤다. 다음 화를 누르게 만드는 한 줄.", "키보드 소리만 나는 방. 커피가 식은 줄도 몰랐다.", W.ai ? "AI가 뽑아 준 초안을 절반 넘게 갈아엎었다. 그래도 빠르다." : "오늘은 문장이 술술 나왔다. 이런 날은 드물다."]) };
    }
    if (id === "wn_plot") {
      w.retain = clamp(w.retain + 0.045 * boost * (SYN.on(s, "wn_club") ? 1.25 : 1), 0.5, 0.98); W.plot = Math.min(0.2, (W.plot || 0) + 0.1 * boost);
      if (w.slump) w.slump = 0;
      gainStat(s, "sense", 0.3); gainStat(s, "write", 0.15);
      return { lines: ["연독률 +", "이번 달 원고 품질 +", "감각 +"], msg: r.pick(["화이트보드에 인물 관계도를 그렸다. 악당이 셋이나 겹쳐 있었다.", "주말 도서관에서 조선 시대 관청 자료를 찾았다.", "2부 엔딩부터 거꾸로 짰다. 복선이 보이기 시작했다."]) };
    }
    if (id === "wn_reader") {
      const add = Math.round(22 * boost * (SYN.on(s, "wn_insta") ? 1.35 : 1) * mod(s, "wnBuzz", 1) * (1 + (s.st.mkt || 0) / 250));
      W.buzz = Math.min(70, W.buzz + add); gainStat(s, "mkt", 0.3);
      if (r.chance(0.18)) { s.mental = clamp(s.mental - 2, 0, 100); return { lines: ["독자 유입 +", "마케팅 +", "멘탈 −2"], msg: "답글을 달다가 \"작가 필력 처참\" 댓글을 봤다. 안 본 눈 삽니다." }; }
      s.mental = clamp(s.mental + 1, 0, 100);
      return { lines: ["독자 유입 +", "마케팅 +", "멘탈 +1"], msg: r.pick(["\"작가님 답글 받았다!!\" 독자가 캡처해 자랑했다.", "작가 SNS에 인물 설정화를 올렸다. 저장 수가 꽤 된다.", "웹소설 커뮤니티에 '숨은 명작' 추천 글이 올라왔다. 내 작품이다."]) };
    }
    if (id === "wn_contest") {
      if (CONTEST_M.includes(s.cal)) { contestEnter(s); gainStat(s, "write", 0.2); return { lines: ["노블리 공모전 참가", "두 달 동안 노출 ×1.5", "결과는 다음 달에"], msg: "공모전 전용 순위판에 내 제목이 올라갔다. 382위. 시작은 다 그렇다." }; }
      W.pitchT = s.t;
      const p = clamp(0.15 + w.fans / 600 + (quality(s) - 0.8) * 0.4 + (boost - 1) * 0.2, 0.05, 0.75);
      if (r.chance(p)) { w.mgmt = true; w.share = 0.42; log(s, `웹소설 '${w.n}' 매니지먼트 계약(투고)`, "work"); return { lines: ["투고 성공: 매니지먼트 계약", "50화부터 유료 전환"], msg: "\"원고 잘 봤습니다. 같이 해 보시죠.\" 답장이 왔다. 분배는 작가 7, 회사 3." }; }
      return { lines: ["투고 회신 없음"], msg: r.pick(["메일 다섯 곳. 회신은 자동응답 하나.", "\"아쉽지만 저희와 방향이 다릅니다.\" 정중한 거절이 제일 아프다."]) };
    }
    if (id === "wn_lunch") {
      W.lunchT = s.t; const eps = Math.max(1, Math.round(1.4 * boost)); W.bank = Math.min(80, W.bank + eps);
      const risk = 0.22 + (w.fans >= 300 ? 0.08 : 0);
      if (r.chance(risk)) { const out = applyEff(s, { eye: 5 }); return { lines: [`원고 +${eps}화`, ...out], msg: "팀장이 뒤에 서 있었다. \"보고서… 쓰는 거지?\" 황급히 창을 내렸다." }; }
      return { lines: [`원고 +${eps}화`, `비축분 ${W.bank}화`], msg: "김밥 한 줄과 메모장. 점심시간 40분이 한 화가 됐다." };
    }
    if (id === "wn_lecture") {
      W.lecT = s.t; const fee = Math.round(Math.min(60, 30 + W.done * 5) * boost * SYN.pi(s)); s.cash += fee; addMoney(s, "inc", "웹소설 강의료", fee); gainStat(s, "talk", 0.4); gainStat(s, "charm", 0.3);
      return { lines: [`강의료 +${won(fee)}`, "말빨 +"], msg: "\"초반 5화에서 독자를 잡는 법.\" 수강생 눈이 반짝였다. 10년 전 내가 앉아 있던 자리다." };
    }
    return null;
  },
  month(s, r, notes, scenes) {
    const W = s.webnovel, pi = SYN.pi(s), seas = SEASON[(s.cal || 1) - 1];
    let rev = 0, tailInc = 0, ipInc = 0, cost = 0;
    // 완결작 인세(롱테일)·2차 판권 원작료
    for (const x of W.works) if (x.tail > 0) { tailInc += x.tail; x.tail = Math.round(x.tail * 0.96 * 10) / 10; if (x.tail < 1) x.tail = 0; }
    tailInc = Math.round(tailInc * pi);
    if (W.ipPay.left > 0) { ipInc = W.ipPay.amt; W.ipPay.left--; }
    if (W.ai) cost += Math.round(5 * pi);
    const w = W.work; let up = 0, need = 0, newF = 0;
    if (w) {
      need = W.sched; up = Math.min(need, W.bank); W.bank -= up;
      const miss = need - up, cons = need ? up / need : 0;
      w.ep += up; W.ups += up; W.maxEp = Math.max(W.maxEp, w.ep);
      // 연독률: 화가 쌓일수록 조금씩 빠진다(중반의 늪). 글쓰기 모임이면 덜 빠진다
      w.retain = clamp(w.retain - up * 0.0016 * (SYN.on(s, "wn_club") ? 0.65 : 1) + (W.plot ? 0.01 : 0), 0.5, 0.98);
      // 노출
      if (W.expo.left > 0) W.expo.left--; else W.expo.x = 1;
      const dl = dealFx(w); if (w.exT > 0) w.exT--;
      const expo = dl.expo * (SCHED[W.sched]?.f || 0) * seas * (1 + W.buzz / 100) * W.expo.x * (hasTr(s, "writer") ? 1.25 : 1) * (w.title2 ? 1.12 : 1) * (w.cover ? 1.08 : 1) * (W.lv >= 3 && w.mgmt && !w.indie ? 1.1 : 1) * SJ.ramp(s, "webnovel") * SJ.skillRamp(s, "webnovel"); // v4.25b 배우는 기간 · 초반 고생: 독자 소통·플롯이 쌓일수록 1로
      const G = GENRES[w.g] || GENRES.hyun, cap = capOf(s, w), f0 = w.fans;
      if (up > 0 && cap > w.fans) w.fans += (cap - w.fans) * clamp(G.rate * expo * cons * dl.fans, 0, 0.6);
      w.fans *= 1 - 0.02 - (need && miss ? 0.12 * (1 - cons) : 0) - (need === 0 ? 0.07 : 0) - (W.tired >= 80 ? 0.02 : 0);
      w.fans = Math.max(0, w.fans * (1 + 0.04 * r.normal()));
      // 유료 전환: 매니지먼트 계약 + 50화
      if (w.mgmt && !w.paid && w.ep >= 50) { w.paid = true; W.paidEver = true; const lost = Math.round(w.fans * 0.25); w.fans -= lost; notes.push(`웹소설 '${w.n}' 51화부터 유료 전환! 무료 독자 ${lost}명이 떠났다`); W.firstPaid = W.firstPaid || s.t + 1; log(s, `웹소설 '${w.n}' 유료 전환`, "work"); }
      newF = Math.round(w.fans - f0);
      w.peak = Math.max(w.peak, w.fans); W.bestFans = Math.max(W.bestFans, w.fans);
      if (w.paid) { rev = Math.round(up * w.fans * PER_FAN_EP * pi * (w.share / 0.42) * mod(s, "wnPay", 1) * dl.pay); w.rev3.push(rev); if (w.rev3.length > 3) w.rev3.shift(); }
      if (rev > 0 && w.adv > 0) { const cut = Math.min(w.adv, rev); w.adv -= cut; rev -= cut; w.advCut = (w.advCut || 0) + cut; if (w.adv <= 0) notes.push(`웹소설 '${w.n}' 선인세를 다 갚았다. 다음 달부터 연재 수익이 그대로 들어온다`); }
      // 피로·멘탈: 연재는 체력이다
      W.tired = clamp(W.tired + dl.tired + up * 0.62 * mod(s, "wnTired", 1) - (need === 0 ? 28 : 9) - (s.fullJob === K ? 6 : 0), 0, 100);
      const mc = need === 20 ? 3 : need === 12 ? 2 : need === 8 ? 1 : -2;
      s.mental = clamp(s.mental - mc - (W.tired >= 70 ? 3 : 0) + (newF > 30 ? 1 : 0), 0, 100);
      if (SYN.on(s, "wn_night")) { s.hp = clamp(s.hp - 3, 0, s.hpMax); }
      if (miss > 0 && need > 0) { W.punk++; notes.push(up ? `웹소설 연재 ${need}화 중 ${up}화만 올림(비축분 바닥). "작가 잠수?" 독자 이탈` : `웹소설 연재 펑크! 이번 달 0화. 선호작이 우수수 빠졌다`); }
      if (need === 0) notes.push("웹소설 휴재 중: 독자가 조금씩 빠지지만 몸은 쉰다");
      if (W.tired >= 80) notes.push("웹소설 연재 번아웃 직전: 문장이 안 나온다(품질 −)");
      // 완결
      if (w.ep >= w.goal) finish(s, r, notes, scenes);
    } else W.tired = clamp(W.tired - 20, 0, 100);
    W.buzz = Math.round(W.buzz * 0.45); W.plot = 0;
    s.cash += rev + tailInc + ipInc - cost;
    if (rev) addMoney(s, "inc", "웹소설 연재 수익", rev);
    if (tailInc) addMoney(s, "inc", "웹소설 완결작 인세", tailInc);
    if (ipInc) addMoney(s, "inc", "웹소설 2차 판권", ipInc);
    if (cost) addMoney(s, "exp", "웹소설 비용", cost);
    // 공모전 결과(참가 다음 달)
    if (W.contestT === s.t - 1 && W.work) {
      const ww = W.work, p = clamp(0.06 + (quality(s) - 0.75) * 0.35 + ww.fans / 2500 + (ww.hit - 1) * 0.08, 0.03, 0.55);
      if (r.chance(p)) {
        const prize = Math.round(r.pick([100, 100, 200, 300, 500]) * pi); s.cash += prize; addMoney(s, "inc", "웹소설 상금·선인세", prize); ww.fans *= 1.25; const sign = !ww.mgmt; ww.mgmt = true;
        scenes.push({ kind: "story", tag: "웹소설", title: "공모전 수상", text: `노블리 공모전 결과 발표. 내 필명이 있었다. 상금 ${won(prize)}${sign ? ", 그리고 매니지먼트 계약 제안까지. 50화부터 유료로 간다" : ""}. 화장실에서 소리 없이 주먹을 쥐었다.`, choices: [{ t: "계속", eff: {}, text: "" }] });
        log(s, `웹소설 공모전 수상 ${won(prize)}`, "work");
      } else notes.push(`웹소설 공모전 결과: 수상작 명단에 없었다. 대신 순위판 노출로 독자가 붙었다`);
    }
    lvCheck(s, notes, scenes);
    // 확정 장면: 첫 업로드 다음 달, 매니지먼트 쪽지, 첫 정산서, 펑크
    const wk = W.work, seen = W.seen;
    let ev = null;
    if (wk && seen.e01 === undefined && wk.ep > 0) { seen.e01 = s.t; ev = { kind: "event", tag: "웹소설", title: "1화 조회수 7", onChoose: "wn_e01", text: "퇴근 후 세 시간을 쏟은 1화를 올렸다. 다음 날 아침 조회수는 7. 그중 하나는 내가 새로고침한 것이다.",
      choices: [{ t: "그래도 매일 밤 10시에 올린다", eff: { hp: -4, wn_ret: 3 }, text: "알림 설정 독자가 하나 생겼다. 내일도 10시." }, { t: "1화를 뜯어고친다", eff: { stat: { write: 1 }, wn_bank: -1, wn_hit: 8 }, text: "첫 문단을 사건으로 바꿨다. 이탈이 줄었다." }, { t: "조용히 접는다", eff: { mental: 4 }, text: "폴더 속에 1화 하나가 남았다." }] }; }
    else if (wk && !wk.mgmt && wk.ep >= 40 && wk.fans >= 80 && (s.t - (wk.mgmtNo || -99)) >= 4 && (wk.mgmtNo ? r.chance(0.5) : true)) { ev = { kind: "event", tag: "웹소설", title: "매니지먼트의 쪽지", onChoose: "wn_mgmt", text: `연재 ${wk.ep}화째, 쪽지가 왔다. "작가님, 유료화 같이 해 보시죠." 분배는 작가 7, 회사 3. 독점 여부와 선인세는 계약 뒤에 따로 정하자고 한다.`,
      choices: [{ t: "계약한다", eff: {}, text: "표지와 홍보를 회사가 맡는다. 50화부터 유료 연재." }, { t: "더 큰 곳의 연락을 기다린다", eff: {}, text: "답장을 미뤘다. 쪽지함이 조용하다." }] }; wk.mgmtNo = s.t; }
    else if (wk && wk.mgmt && !wk.deal && !wk.indie && wk.ep >= WN_F30.deal.ep) { wk.deal = "ask"; ev = dealScene(s); }
    else if (W.firstPaid && W.firstPaid <= s.t + 1 && seen.e08 === undefined && wk?.paid && rev > 0) { seen.e08 = s.t; ev = { kind: "event", tag: "웹소설", title: "첫 정산서", onChoose: "wn_e08", text: `유료화 첫 달 정산서가 왔다. 독자 ${Math.round(wk.fans).toLocaleString()}명, 한 화 100원. 플랫폼 수수료와 매니지먼트 몫을 떼고 나니 ${won(rev)}. 치킨 ${Math.max(1, Math.round(rev / 2))}마리다.`,
      choices: [{ t: "AI 집필 도구를 결제한다 (월 5만)", eff: {}, text: "초안 속도가 확 빨라졌다. 대신 AI 티 나는 문장은 다 갈아엎어야 한다." }, { t: "표지 일러스트를 새로 맡긴다 (15만)", eff: { wn_cost: 15 }, text: "새 표지가 걸리자 신규 독자가 눈에 띄게 늘었다." }] }; }
    else if (wk && need > 0 && up < need && working(s) && (s.t - (seen.e05 ?? -99)) >= 8) { seen.e05 = s.t; ev = { kind: "event", tag: "웹소설", title: "야근 사흘째, 연재 펑크", onChoose: "wn_e05", text: `분기 마감으로 사흘 연속 야근했다. 연재가 멈췄다. 댓글창에 "작가 잠수?"가 올라오고 선호작이 ${Math.round(wk.fans * 1.15)}에서 ${Math.round(wk.fans)}이 됐다.`,
      choices: [{ t: "비축분 10화를 만들 때까지 휴재 공지", eff: { wn_fans: -4, wn_tired: -15 }, text: "\"충전하고 오겠습니다.\" 공지에 응원 댓글이 붙었다. 다음 달은 휴재." }, { t: "새벽 3시에 억지로 한 화 올린다", eff: { hp: -12, wn_bank: 1, wn_ret: -2 }, text: "오타가 열두 개. 그래도 올렸다." }] }; }
    else if (W.burnAsk && s.t >= W.burnAsk) { W.burnAsk = 0; seen.e16 = s.t; ev = { kind: "event", tag: "웹소설", title: "번아웃과 필명", onChoose: "wn_pen", text: "용두사미라는 평과 함께 작품이 끝났다. 차기작에 대한 기대 댓글이 없다. 필명을 버리고 새로 시작할지 고민이다.",
      choices: [{ t: "새 필명으로 처음부터", eff: { mental: 8, wn_tired: -20 }, text: "아무도 나를 모르는 곳에서 1화를 쓴다. 팬도 0, 부담도 0." }, { t: "같은 필명으로 명예 회복", eff: { mental: -6 }, text: "\"다음 작품은 다를 겁니다.\" 공지를 올렸다. 손이 떨렸다." }] }; }
    if (!ev && r.chance(0.3)) ev = pickEvent(s, r);
    if (ev) scenes.push(ev);
    W.last = { up, need, miss: need - up, rev, tail: tailInc, ip: ipInc, cost, newF, fans: wk ? Math.round(wk.fans) : 0 };
    const profit = rev + tailInc + ipInc - cost;
    W.hist.push(profit); if (W.hist.length > 24) W.hist.shift();
    return profit;
  },
  idle(s) { const W = s.webnovel; if (!W) return; for (const x of W.works) if (x.tail > 0) x.tail = Math.round(x.tail * 0.96 * 10) / 10; },
  value(s) { const W = s.webnovel; if (!W) return 0; return Math.round(W.works.reduce((a, x) => a + (x.tail || 0), 0) * 6 * SYN.pi(s)); },
  passive(s) { const W = s.webnovel; if (!W || !s.sj?.active?.includes(K)) return 0; return Math.round(W.works.reduce((a, x) => a + (x.tail || 0), 0) * SYN.pi(s) + (W.ipPay.left > 0 ? W.ipPay.amt : 0)); },
  todos(s) {
    const W = s.webnovel, t = [];
    if (!W.work) { t.push({ lv: 1, text: "웹소설: 새 작품 기획(장르 고르기)" }); return t; }
    if (W.sched === 0) t.push({ lv: 1, text: `웹소설 휴재 중 · 비축분 ${W.bank}/10화 모이면 다시 연재` });
    if (W.sched > 0 && W.bank < W.sched) t.push({ lv: W.bank < W.sched / 2 ? 2 : 1, text: `웹소설 이번 달 ${W.sched}화 연재 · 비축분 ${W.bank}화 (원고 쓰기)` });
    if (W.work.retain < 0.82) t.push({ lv: 1, text: `웹소설 연독률 ${Math.round(W.work.retain * 100)}%: 플롯 다듬기` });
    if (W.lv >= 2 && CONTEST_M.includes(s.cal) && W.contestSeason !== seasonId(s)) t.push({ lv: 0, text: "노블리 공모전 시즌: 참가하면 두 달 노출 ×1.5" });
    return t;
  },
  eff(s, eff, out) {
    const W = s.webnovel; if (!W) return; const w = W.work;
    if (eff.wn_fans && w) { const d = Math.round(w.fans * eff.wn_fans / 100); w.fans = Math.max(0, w.fans + d); out.push(`웹소설 독자 ${d >= 0 ? "+" : ""}${d}명`); }
    if (eff.wn_bank) { W.bank = Math.max(0, W.bank + eff.wn_bank); out.push(`비축분 ${eff.wn_bank > 0 ? "+" : ""}${eff.wn_bank}화`); }
    if (eff.wn_ret && w) { w.retain = clamp(w.retain + eff.wn_ret / 100, 0.5, 0.98); out.push(`연독률 ${eff.wn_ret > 0 ? "+" : ""}${eff.wn_ret}%p`); }
    if (eff.wn_hit && w) { w.hit = R2(clamp(w.hit * (1 + eff.wn_hit / 100), 0.3, 5)); out.push(`작품 반응 ${eff.wn_hit > 0 ? "+" : ""}${eff.wn_hit}%`); }
    if (eff.wn_tired) { W.tired = clamp(W.tired + eff.wn_tired, 0, 100); out.push(`연재 피로 ${eff.wn_tired > 0 ? "+" : ""}${eff.wn_tired}`); }
    if (eff.wn_cost) { s.cash -= eff.wn_cost; addMoney(s, "exp", "웹소설 비용", eff.wn_cost); out.push(`돈 −${won(eff.wn_cost)}`); }
  },
  choose: {
    wn_e01(s, r, i) { if (i !== 2) return []; const W = s.webnovel; if (W.work) W.works.push({ n: W.work.n, g: W.work.g, ep: W.work.ep, peak: Math.round(W.work.peak), paid: false, tail: 0, t: s.t, done: false }); W.work = null; const res = SJ.stop(s, K); return [res.ok ? "웹소설 접음" : res.msg]; },
    wn_title(s, r, i) { const w = s.webnovel.work; if (i === 0 && w) { w.title2 = true; const o = w.n; w.n = r.pick(T2[w.g] || T2.hyun); return [`제목 변경: '${o}' → '${w.n}'`, "노출 +12%"]; } return []; },
    wn_mgmt(s, r, i) { const w = s.webnovel.work; if (!w) return []; if (i === 0) { w.mgmt = true; w.share = 0.42; log(s, `웹소설 '${w.n}' 매니지먼트 계약`, "work"); return ["매니지먼트 계약(작가 7 : 회사 3)", w.ep >= 50 ? "다음 달부터 유료" : "50화부터 유료 전환"]; } if (r.chance(0.35)) { w.mgmt = true; w.share = 0.48; log(s, `웹소설 '${w.n}' 큰 매니지먼트 계약`, "work"); return ["며칠 뒤 더 큰 회사에서 연락! 분배 작가 8 : 회사 2 수준"]; } return ["쪽지가 끊겼다(몇 달 뒤 다시 올 수도)"]; },
    wn_e08(s, r, i) { const W = s.webnovel; if (i === 0) { W.ai = true; return ["AI 집필 도구 구독(월 5만): 원고 +25%"]; } if (W.work) W.work.cover = true; return ["새 표지: 노출 +8%"]; },
    wn_e05(s, r, i) { const W = s.webnovel; if (i === 0) { W.resume = W.sched || 12; W.sched = 0; W.restT = s.t; return ["이번 달 휴재: 비축분 10화가 모이면 다음 달부터 다시 연재"]; } return []; },
    wn_contest_ev(s, r, i) { if (i === 0) { contestEnter(s); return ["노블리 공모전 참가: 두 달 노출 ×1.5"]; } return []; },
    wn_fin(s, r, i) { const W = s.webnovel; if (i === 0) { W.pen = Math.round(W.pen * 1.15); const x = W.works.at(-1); if (x) x.tail = Math.round(x.tail * 1.1); return ["필명 팬 +15%", "완결작 인세 +10%"]; } W.nextBoost = 1.3; return ["차기작 첫 독자 +30%"]; },
    wn_pen(s, r, i) { const W = s.webnovel; if (i === 0) { W.pen = 0; W.newPen++; if (W.work) W.work.fans = 0; return ["새 필명: 필명 팬 0명"]; } if (W.work) W.work.hit = R2(W.work.hit * 1.2); else W.redeem = true; return ["다음 작품 반응 +20%(명예 회복의 칼)"]; },
    wn_ip(s, r, i) {
      const W = s.webnovel, o = s._wnIp; if (!o) return [];
      const deal = (lump, mon) => { s.cash += lump; addMoney(s, "inc", "웹소설 2차 판권", lump); W.ip++; W.ipPay = { left: 24, amt: mon }; log(s, `웹소설 2차 판권(웹툰화) 계약 ${won(lump)}`, "work"); return [`원작 사용료 +${won(lump)}`, `원작료 월 ${won(mon)} × 24개월`]; };
      if (i === 0) { s.cash -= 50; addMoney(s, "exp", "웹소설 비용", 50); return ["변호사 검토비 −50만", ...deal(o.lump, o.mon)]; }
      if (r.chance(0.5)) return ["버틴 보람이 있었다", ...deal(Math.round(o.lump * 1.3), Math.round(o.mon * 1.2))];
      W.ipOffer = 0; return ["제작사가 다른 원작을 골랐다. 메일함이 조용하다."];
    },
    wn_deal(s, r, i) {
      const W = s.webnovel, w = W.work, o = s._wnDeal, D3 = WN_F30.deal; s._wnDeal = null; if (!w || !o) return [];
      if (i <= 1) { const adv = i === 0 ? o.adv : o.advW; w.deal = i === 0 ? "ex" : "wait"; w.adv = adv; w.adv0 = adv; w.exT = D3.exM; s.cash += adv; addMoney(s, "inc", "웹소설 상금·선인세", adv); log(s, `웹소설 '${w.n}' ${DEAL_N[w.deal]} 계약, 선인세 ${won(adv)}`, "work");
        return [`${DEAL_N[w.deal]} 계약 · 선인세 +${won(adv)}`, "선인세만큼은 연재 수익에서 먼저 깎여요", `메인 배너 노출 ×${D3.exExpo} (${D3.exM}개월)`, ...(i ? [`독자 유입 ×${D3.waitFans} · 한 명당 결제 ×${D3.waitPay}`] : [])]; }
      w.deal = "multi"; return [`비독점: 결제 ×${D3.multiPay}`, `노출 ×${D3.multiExpo} · 업로드 관리 피로 +${D3.multiTired}/달`];
    },
    wn_plag(s, r, i) {
      const W = s.webnovel; W.plagN = (W.plagN || 0) + 1; if (i !== 1) return [];
      if (r.chance(WN_F30.plag.spread)) { s._sceneText = "\"작가 해명 없음\" 글까지 붙었다. 캡처가 캡처를 낳았다."; return applyEff(s, { wn_fans: -12, wn_ret: -3, mental: -4 }); }
      s._sceneText = "사흘 뒤, 다들 다른 이야기로 넘어갔다."; return [];
    },
    wn_edit(s, r, i) {
      const W = s.webnovel, w = W.work, o = s._wnEd; s._wnEd = null; if (!w) return [];
      if (i === 0) { W.edN = (W.edN || 0) + 1; return []; }
      if (i === 2 && o) { s.cash -= o.pen; addMoney(s, "exp", "웹소설 비용", o.pen); w.indie = true; w.adv = 0; w.share = WN_F30.edit.indieShare; log(s, `웹소설 '${w.n}' 매니지먼트 계약 해지(혼자 연재)`, "work");
        return [`위약금 −${won(o.pen)}`, `작가 몫 ${Math.round(WN_F30.edit.indieShare * 100)}%`, `노출 ×${WN_F30.edit.indieExpo} · 피로 +${WN_F30.edit.indieTired}/달`]; }
      return [];
    },
    wn_audio(s, r, i) { const W = s.webnovel, o = s._wnAu; if (!o) return []; const lump = i === 0 ? o.lump : Math.round(o.lump * 0.45); s.cash += lump; addMoney(s, "inc", "웹소설 상금·선인세", lump); const x = W.works.find((y) => y.n === o.n); if (x) x.tail = Math.round(x.tail * (i === 0 ? 1.25 : 1.12) * 10) / 10; return [`${i === 0 ? "오디오북·해외" : "해외 번역"} 계약금 +${won(lump)}`, `'${o.n}' 인세 +${i === 0 ? 25 : 12}%`]; },
  },
  monthStart(s) { const W = s.webnovel; if (W.resume && W.sched === 0 && s.t > (W.restT ?? -1) && W.bank >= 10) { W.sched = W.resume; W.resume = 0; } },
  stopWhy: (s) => null,
  onStart(s) { const W = s.webnovel; if (W.t0 === null || W.t0 === undefined) W.t0 = s.t; },
  migrate(s, W) { if (!W.v) W.v = 1; if (W.v < 2) { W.v = 2; if (W.work) { W.work.deal = W.work.deal || null; W.work.adv = W.work.adv || 0; } } W.seen = W.seen || {}; W.works = W.works || []; W.ipPay = W.ipPay || { left: 0, amt: 0 }; W.expo = W.expo || { x: 1, left: 0 }; },
  milestones: [
    { key: "wn_first", title: "1화 업로드", test: (s) => (s.webnovel?.maxEp || 0) >= 1, lines: ["필명을 정하는 데 사흘, 1화를 올리는 데 3초.", "업로드 버튼을 누르고 휴대폰을 엎어 놓았다. 회사 사람들은 아무도 모른다."] },
    { key: "wn_wall", title: "20화의 벽을 넘었다", test: (s) => (s.webnovel?.lv || 0) >= 2, lines: ["연재를 시작한 사람 열에 일곱은 10화도 못 채운다.", "21화를 올리는 밤, 선호작 알림이 50개를 넘었다."] },
    { key: "wn_paid", title: "유료화 작가", test: (s) => (s.webnovel?.lv || 0) >= 3, lines: ["51화 옆에 작은 동전 아이콘이 붙었다.", "내 문장에 누군가 100원을 냈다. 출근길 지하철에서 몇 번이고 다시 봤다."] },
    { key: "wn_done", title: "완결 작가", test: (s) => (s.webnovel?.lv || 0) >= 4, lines: ["완결 작품 비율은 열에 둘이 안 된다.", "'완결' 딱지가 붙은 표지를 바탕화면에 깔았다."] },
    { key: "wn_ip", end: true, kind: "good", epi: "내 소설이 웹툰이 됐다. 크레딧 '원작' 옆 필명은 회사 사람들이 끝까지 몰랐다.", title: "원작자", test: (s) => (s.webnovel?.ip || 0) >= 1, lines: ["웹툰 1화 첫 컷, 내가 상상한 장면이 색을 입고 있었다.", "엔딩 크레딧 첫 줄 '원작'. 그 옆에 내 필명이 있었다."] },
    { key: "wn_steady", end: true, kind: "good", epi: "대박은 없었다. 완결작 인세가 매달 치킨값만큼 꼬박꼬박 들어온다.", title: "성실한 완결 작가", test: (s) => { const W = s.webnovel; return !!W && (W.done || 0) >= 3 && !(W.ip > 0) && W.t0 !== null && W.t0 !== undefined && s.t - W.t0 >= WN_BAL.steadyM && !(s.co?.quit || s.co?.fired); }, lines: (s) => ["완결 세 질. 대박은 없었지만 매달 치킨값 이상은 꼬박꼬박 들어왔다.", (s?.co?.warns || 0) > 0 || Object.keys(s?.co?.cgSeen || {}).length ? "회사에는 한 번 들켰다. 그래도 연재는 멈추지 않았다. 사원증과 필명, 이름이 두 개인 삶." : "회사에선 여전히 아무도 모른다. 사원증과 필명, 이름이 두 개인 삶."] } /* 11-23 발각 이력이 있으면 다른 문장(lines 가 함수면 core.js checkPerks 가 불러 쓴다) */,
    { key: "wn_ghost", end: true, kind: "bad", epi: "폴더 속 1화만 열일곱 개. 20화의 벽은 끝내 넘지 못했다.", title: "20화의 유령", test: (s) => { const W = s.webnovel; return !!W && W.t0 !== null && W.t0 !== undefined && !!s.sj?.active?.includes(K) && s.t - W.t0 >= 36 && W.maxEp < 20; }, lines: ["3년. 폴더 속에는 1화만 열일곱 개가 남았다.", "다시 1화부터. 이번엔 20화까지 비축분을 먼저 쓰기로 했다."] },
  ],
  perks: [
    { id: "p_wn_rhythm", n: "연재 근육", line: "밤 11시가 되면 손가락이 먼저 키보드에 간다", pro: "웹소설 연재 피로 −30%", m: { wnTired: 0.7 }, got: "누적 400화 + 한 작품 독자 3,000명", test: (s) => (s.webnovel?.ups || 0) >= 400 && (s.webnovel?.bestPeak || 0) >= 3000 },
    { id: "p_wn_pen", n: "필명의 무게", line: "\"이 작가 신작이면 일단 본다\"", pro: "웹소설 작품 크기 +15%, 결제 +10%", m: { wnCap: 1.15, wnPay: 1.1 }, got: "4질 완결 + 한 작품 독자 4,000명", test: (s) => (s.webnovel?.done || 0) >= 4 && (s.webnovel?.bestPeak || 0) >= 4000 },
  ],
  perkCine: { p_wn_rhythm: "wn_wall", p_wn_pen: "wn_done" },
  synergy: [
    { id: "wn_insta", kind: "good", n: "인별 × 웹소설", need: "인별그램 + 웹소설", desc: "캐릭터 계정·인별툰 홍보: 독자 소통 효과 +35%", test: (s) => !!s.sj?.active?.includes(K) && !!s.sj?.active?.includes("insta") },
    { id: "wn_club", kind: "good", n: "글쓰기 모임 × 웹소설", need: "글쓰기 모임 + 웹소설", desc: "합평으로 다진 문장: 연독률 하락 −35%, 품질 +", test: (s) => !!s.sj?.active?.includes(K) && (s.hb?.joined || []).includes("write") },
    { id: "wn_night", kind: "bad", n: "주 5회 연재 × 회사", need: "웹소설 주 5회 연재 + 회사 다니는 중", desc: "새벽 연재: 매달 스태미너 −3", test: (s) => !!s.sj?.active?.includes(K) && s.webnovel?.sched === 20 && !!s.webnovel?.work && !(s.co?.quit || s.co?.fired) },
  ],
  traits: [{ trait: "spotlight", t: "웹소설 독자 소통 효과 +30%", m: { wnBuzz: 1.3 } }],
  spots: { library: ["wn_write"], cafe: ["wn_plot"] },
};

// 화면에서 쓰는 조작
export function setSched(s, v) { const W = s.webnovel; if (SCHED[v]) { W.sched = +v; W.resume = 0; } }
export function toggleAi(s) { const W = s.webnovel; W.ai = !W.ai; return W.ai; }
export function buyCover(s) { const W = s.webnovel, w = W.work; if (!w || w.cover) return { ok: false, msg: "이미 표지가 있어요" }; const c = Math.round(15 * SYN.pi(s)); s.cash -= c; addMoney(s, "exp", "웹소설 비용", c); w.cover = true; return { ok: true, msg: `표지 일러스트 ${won(c)}: 노출 +8%` }; }
export function dropWork(s) { const W = s.webnovel, w = W.work; if (!w) return { ok: false, msg: "연재 중인 작품이 없어요" }; W.works.push({ n: w.n, g: w.g, ep: w.ep, peak: Math.round(w.peak), paid: w.paid, tail: w.paid ? Math.round((w.rev3.reduce((a, b) => a + b, 0) / Math.max(1, w.rev3.length)) * 0.1) : 0, t: s.t, done: false }); W.pen = Math.max(W.pen, Math.round(w.peak * 0.1)); W.work = null; W.bank = 0; log(s, `웹소설 '${w.n}' ${w.ep}화에서 연재 중단`, "work"); return { ok: true, msg: `'${w.n}' ${w.ep}화에서 연재 중단. 비축분은 버렸다` }; }
export function finishNow(s) { const W = s.webnovel, w = W.work; if (!w || w.ep < 80) return { ok: false, msg: "80화부터 조기 완결할 수 있어요" }; w.goal = w.ep; w.retain = Math.max(0.5, w.retain - 0.06); return { ok: true, msg: "다음 달 정산 때 완결해요(급하게 끝내면 '용두사미' 소리를 들을 수 있어요)" }; }
