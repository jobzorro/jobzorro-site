// 해외 구매대행(11-27, 1단계): "상품값이 아니라 대신 해결해 주는 일로 번다." 주문이 늘수록 통장이 먼저 빈다. 재고는 없지만 돈이 묶인다.
// - 방식 네 단계(B.mode): 1 소개형(비교 글 → 소개비, 묶이는 돈 없음) → 2 주문 대행형(건당 수수료, 건당 4.7만이 2~6주 묶임) → 3 직접 매입형(재고로 판매) → 4 독점 공급형(본업화: 수입 유통사)
// - 이 투잡만의 규칙: 주문마다 날짜가 셋(주문 → 배송 → 입금). 그 사이 내 돈이 나가 있다. 운전자금(B.wc)이 바닥나면 주문을 못 넣는다. 환불 준비금(B.rsv)은 따로 둔다.
//   아이템(B.items)마다 마진·경쟁·반품률·인증 위험·유행 수명이 다르고, 숫자 능력치가 낮으면 범위로 흐리게 보인다. 유행은 식는다. 분야를 좁히면 규격 설명(B.spec)이 쌓여 반품이 준다.
//   환율(B.fx)이 달마다 움직인다. 견적을 보낸 달에 주문을 못 넣으면 다음 달 환율로 사야 한다.
// - 돈의 흐름: 현금 ↔ 운전자금·준비금은 옮기기(장부에 안 적음). 주문을 넣으면 운전자금에서 상품값이 나가고, 입금되면 상품값은 운전자금으로, 수수료는 현금으로 돌아온다.
// 돈 단위 만원. 규약: engine/jobs/README.md. 숫자는 BY_BAL 한곳에(봇 시험: 환경변수 BYK = 수입 전체 배율, BYB = JSON 덮어쓰기).
import * as D from "../defs.js";
import { addMoney, log, won, creditRoom, addLoan, helperPower, CHAR, ensureRel, addAff } from "../core.js";
import * as SYN from "../syn.js";
import * as SJ from "../sj.js";
import * as UND from "../und.js"; // 11-28 업의 이해도 효과(함수 안에서만 쓴다. 스위치 UND_ON 이 꺼져 있으면 늘 0 · false)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const ENV = typeof process !== "undefined" ? process.env || {} : {};
export const BY_BAL = {
  k: 0.69 * (+ENV.BYK || 1), // 수입 전체 배율: 봇으로 맞춘 값 × 세기 손잡이 BYK(기본 1). 11-28 2단계(수수료 경쟁을 판 변화로 옮김 · 초반 고생 · 라이벌 · 히든 길 · 조력)를 넣고 0.75 → 0.69 로 다시 맞췄다(2회차 본업화 길 파이어율 28~33% 목표 · 부업만 길 12~15% 목표, 11-28 대표 결정). 0.05 차이에 파이어율이 8%p 안팎 움직이니 조심
  unit: 4.7, fee: 1.8, ovh: 0.35, retLoss: 2.6, leak: 0.05, // 건당 상품값 · 수수료 · 결제·포장 비용 · 반품 한 건 손실 · 장부를 안 맞춘 달에 새는 몫
  due: [0.3, 0.55], // 같은 달 입금 · 다음 달 입금(나머지는 두 달 뒤)
  click: [3, 8], ref: 0.2, postNeed: 10, postDecay: 0.97, regCost: 8, wc0: 100,
  slots: [1, 2, 3, 4], dem: [40, 80], life: [14, 36],
  capQ: 14, capO: 16, capCs: 40,
  squeeze: { from: 60, perYear: 0, floor: 0.35 }, // 큰 서비스들이 해마다 수수료를 내린다. 11-28 같은 이야기가 판 변화(wave.js WAVES.buying)로 옮겨 가서 여기는 0 으로 내렸다(예전 값: 6년 차부터 해마다 7%, 바닥 35%. 되돌리려면 perYear 0.07 + wave.js 의 buying 자료 빼기)
  fx: { sd: 0.025, back: 0.08, lo: 0.85, hi: 1.2 },
  ad: [0, 12, 30, 60], adX: [0, 0.15, 0.3, 0.5],
  staff: { wage: [0, 110, 160, 200], cover: 50, ship: 250, cap: [0, 1, 3, 8], hire: 60, quitP: 0.15, careEach: 2 }, // 한 명에 행동력 0.5(두 명에 1)
  m3: { need: 2600, star: 4.1, imp: 30, dep: 600, fit: 150, rent: 45, cert: 120, mult: 2.2, price: [1.35, 0.2], buy: 0.85, mkt: 0.12, pack: 0.15, lot: 2.5, self: 40 },
  smug: { cost: 150, p: 0.1, fine: 300, mult: 1.3 },
  gate: { mo: 24, sold: 4000, star: 4.2, corpN: 3, corpCost: 60, corpMo: 2, corpDip: 0.6, cert: 500, certDc: 70, dep: 2500, flt: 600, dealDc: 75, trip: 150, retry: 3, rent: 120 },
  m4: { per: 83, team: 4, self: 2, flt: 300, back: 0.7, stockBack: 0.6, cap: [12, 30], renew: 36 }, // 거래처 한 곳의 월 이익 · 직원 한 명이 맡는 거래처 · 회사 다니는 동안/그만둔 뒤 거래처 상한
  ev: { p: 0.1, gap: 4 },
};
if (ENV.BYB) { const o = JSON.parse(ENV.BYB); for (const k of Object.keys(o)) BY_BAL[k] = typeof o[k] === "object" && !Array.isArray(o[k]) ? { ...BY_BAL[k], ...o[k] } : o[k]; }
export const LV_N = ["", "소개형", "주문 대행형", "직접 매입형", "수입 유통사"];
export const REGS = [["biz", "사업자", "사업자로 등록한다"], ["sell", "판매", "온라인으로 팔 수 있게 판매 등록을 한다"], ["cus", "통관", "통관에 쓸 등록을 한다(처리에 한 달쯤)"]];
export const UPS = [["imp", "수입 신고", "정식으로 들여와 팔겠다고 신고한다(처리에 한 달쯤)"], ["wh", "창고", "작은 창고를 빌리고 선반을 넣는다"], ["cert", "인증", "내가 들여와 팔 물건의 인증을 받는다"]];
export const GATES = [["corp", "법인 등록", "통관·판매 등록 세 가지를 법인 이름으로 다시 한다(세 번 + 처리에 두 달쯤)"], ["cert", "제품 인증", "직접 들여와 팔 물건은 내가 인증을 책임진다"], ["wh", "창고·재고 자금", "큰 창고와 첫 물량"], ["deal", "공급 계약", "해외 브랜드와 국내 공급 계약(외국어·말빨)"]];
const CATS = ["문구", "캠핑", "오디오", "주방", "공구", "러닝"];
const NAMES = { 문구: ["만년필 잉크", "방안 노트", "황동 샤프", "6공 다이어리 속지", "수채 색연필", "가죽 필통"], 캠핑: ["티타늄 컵", "초경량 팩", "접이식 화로", "랜턴 유리 갓", "알루미늄 테이블"], 오디오: ["이어폰 케이블", "턴테이블 바늘", "진공관", "헤드폰 패드", "스피커 받침"], 주방: ["무쇠 팬", "드립 주전자", "제빵 틀", "칼갈이 숫돌", "법랑 냄비"], 공구: ["정밀 드라이버", "목공 끌", "가죽 바늘", "모형 니퍼", "수평계"], 러닝: ["트레일 양말", "러닝 조끼", "무릎 밴드", "헤드램프", "물통 벨트"] };
const pi = (s) => SYN.pi(s);
const emp = (s) => !(s.co?.quit || s.co?.fired);
const taxHelp = (s) => (helperPower(s, "tax") || 0) > 0; // 세무사 조력자: 정산 대조를 대신 봐 준다
// 11-28 2단계 조력자: 하세온(물류) · 민도하(마켓 수수료·광고) · 채지후(규격·판본). 그 사람이 조력자가 되면(rel.helper) 켜진다. 봇 시험용 BYHELP=1 은 셋 다 켠 상한
export const BY_HELP = { by_ship: "c138", by_fee: "c139", by_eye: "c140" };
export const BY_HFX = { ship: 0.5, fee: 1.04, ad: 1.25, spec: 1.3, cert: 0.15 }; // 두 달 걸리는 입금 몫 ×0.5 · 주문 수수료 ×1.04 · 광고 효과 ×1.25 · 규격 설명 쌓임 ×1.3 · 스승을 만났으면 제품 인증 판정 +15%p
if (ENV.BYH) Object.assign(BY_HFX, JSON.parse(ENV.BYH)); /* 봇 시험용 */
export const byHelp = (s, eff) => (ENV.BYHELP || s.rel?.[BY_HELP[eff]]?.helper ? 1 : 0);
export const helpName = (eff, def) => CHAR[BY_HELP[eff]]?.name || def;
export const helpers = (s) => Object.keys(BY_HELP).filter((k) => byHelp(s, k)); // 화면용: 지금 켜진 조력
const eyeX = (s) => (byHelp(s, "by_eye") ? BY_HFX.spec : 1);
export const mentorMet = (s) => !!s.ms?.met?.buying; // 스승 방영숙을 만났나
// 첫 손님 후보(기존 인물 여섯): 첫 주문을 넣는 날, 아는 사람이 있으면 그중에서, 없으면 아무나 한 명이 첫 손님이 된다
const FIRST = [["c055", "만년필 잉크와 방안 노트"], ["c123", "수업용 문구"], ["c105", "키보드 키캡"], ["c059", "필름과 캠핑 컵"], ["c124", "드립 주전자"], ["c072", "목공 끌"]];

// ── 읽기 도우미(화면·봇도 쓴다) ──
export const tied = (B) => (B.orders || []).reduce((a, o) => a + o.out, 0); // 묶인 돈
export const inflight = (B) => (B.orders || []).reduce((a, o) => a + (o.kind ? 0 : o.n), 0);
export const inqAll = (B) => (B.items || []).reduce((a, it) => a + (it.inq || 0), 0);
export const quoted = (B) => (B.q || []).reduce((a, q) => a + q.n, 0);
export const slots = (B) => BY_BAL.slots[clamp((B.mode || 1) - 1, 0, 3)];
export const staffCap = (B) => BY_BAL.staff.cap[clamp((B.mode || 1) - 1, 0, 3)];
export const careNeed = (B) => Math.ceil((B.staff || 0) / BY_BAL.staff.careEach);
export const csNeed = (B) => Math.max(0, Math.ceil((inflight(B) + (B.shipLast || 0) * 0.3) / BY_BAL.capCs - 0.001) - Math.floor((B.staff || 0) * BY_BAL.staff.cover / BY_BAL.capCs));
export const upStep = (B) => UPS.findIndex(([k]) => !B.up?.[k]);
export const gateStep = (B) => GATES.findIndex(([k]) => !B.g?.[k]);
export const dealerCap = (s) => BY_BAL.m4.cap[emp(s) ? 0 : 1];
export function trend(it) { const a = it.age, L = it.life; return a < 3 ? 0.5 + a / 6 : a <= L - 6 ? 1 : a <= L ? 1 - 0.8 * (a - (L - 6)) / 6 : 0.2 * 0.85 ** (a - L); }
export const cats = (B) => [...new Set((B.items || []).map((it) => it.cat))];
export const specOf = (B, cat) => B.spec?.[cat] || 0;
export function reach(s) { const B = s.buying, A = BY_BAL; return clamp(0.3 + B.posts / 30 + (B.rating - 4.2) * 0.4 + A.adX[B.ad || 0] * (byHelp(s, "by_fee") ? BY_HFX.ad : 1) + (SYN.on(s, "by_insta") ? 0.05 : 0), 0.15, 1.4); }
export function conv(s, it) { const B = s.buying; return clamp(0.5 + specOf(B, it.cat) / 250 + (B.deep || 0) * 0.04 - it.comp * 0.25 + (B.cutT > s.t ? 0.2 : 0) + (B.rating - 4.3) * 0.2, 0.2, 0.9); }
export function retRate(s, it) { const B = s.buying; return it.ret * (1 - 0.6 * specOf(B, it.cat) / 100) * (cats(B).length <= 1 ? 0.85 : 1) * (1 - 0.05 * (B.deep || 0)); }
export const squeeze = (s) => { const Q = BY_BAL.squeeze; return clamp(1 - Math.max(0, s.t - Q.from) / 12 * Q.perYear, Q.floor, 1); };
export const orderCost = (s) => BY_BAL.unit * pi(s) * s.buying.fx; // 지금 한 건을 넣는 데 나가는 돈
export function wcNeed(s) { const B = s.buying; return Math.round(Math.max(BY_BAL.wc0 * pi(s), (B.best3 || 0) * orderCost(s) * 1.9)); } // 권장 운전자금: 최근 석 달 최대 건수의 1.9배치
export function rsvNeed(s) { const B = s.buying; return Math.round(Math.max(10 * pi(s), inflight(B) * 0.09 * BY_BAL.retLoss * pi(s) * 1.5)); }
export function demandOf(s, it) { const B = s.buying; return it.dem * trend(it) * reach(s) * (1 - it.comp * 0.5) * (B.zeroT > s.t ? 0.8 : 1) * (B.narrowT > s.t ? 0.6 : 1); } // 한 달 문의 수
export const shipCap = (B) => (B.mode >= 3 ? BY_BAL.m3.self + (B.staff || 0) * BY_BAL.staff.ship : BY_BAL.m3.self);
export function lotOf(s, it) { const A = BY_BAL; const qty = Math.max(10, Math.round(demandOf(s, it) * conv(s, it) * A.m3.mult * A.m3.lot)); const each = A.unit * pi(s) * s.buying.fx * A.m3.buy; return { qty, each, cost: Math.round(qty * each) }; }
export const stockVal = (B) => (B.items || []).reduce((a, it) => a + (it.stock || 0) * (it.cost || 0) * (trend(it) > 0.3 ? 0.7 : 0.3), 0);
export const colOf = (s, o) => (o.t === s.t ? 1 : o.due > s.t ? 2 : 3); // 보드 칸: 1 주문·통관 → 2 배송 → 3 확정·정산 대기

// 11-28 업의 이해도 효과(스위치 UND_ON). 숙련(300): 후보의 반품률·인증 위험이 범위가 아니라 정확한 숫자로 보인다(보이는 것만 바뀐다). 장인(1,000): 새 분야 첫 아이템의 규격 설명이 spec0 에서 시작
export const BY_UND = { spec0: 10 }; // 봇 900판: 5 · 10 · 15 모두 파이어율 차이가 ±2%p 안(잡음 수준). 가운데 값으로 둔다
if (ENV.BYU) Object.assign(BY_UND, JSON.parse(ENV.BYU)); // 봇 시험용
export const undFx = (s) => ({ on: UND.jobs().includes("buying"), v: UND.score(s, "buying"), see: UND.at(s, "buying", UND.TH.숙련), entry: UND.at(s, "buying", UND.TH.장인) });
// 화면에 보여 줄 숫자(범위). it.see(흐리게 본 값)는 그대로 두고, 숙련부터 반품률·인증 위험만 정확한 값으로 바꿔 돌려준다
export function seeOf(s, it) {
  const v = it.see || { mg: [it.mg, it.mg], comp: [it.comp, it.comp], ret: [it.ret, it.ret], cert: [it.cert, it.cert], life: [it.life, it.life] };
  const und = !!it.see && UND.at(s, "buying", UND.TH.숙련), eye = !!it.see && !!byHelp(s, "by_eye"); // 11-28 채지후가 조력자면 유행 수명이 정확히 보인다(이해도 효과와 겹치지 않는 칸)
  return und || eye ? { ...v, ...(und ? { ret: [it.ret, it.ret], cert: [it.cert, it.cert], und: true } : {}), ...(eye ? { life: [it.life, it.life], eye: true } : {}) } : v;
}
export const newCat = (s, it) => !cats(s.buying).includes(it.cat) && (s.buying.spec?.[it.cat] || 0) < BY_UND.spec0; // 처음 들어가는 분야인가(장인 효과가 붙는 자리)
function mkItem(s, r, cat) {
  const B = s.buying, A = BY_BAL, mg = 0.7 + 0.7 * r.range(0, 1);
  let comp = r.range(0.1, 0.7), ret = r.range(0.03, 0.1), cert = r.chance(0.2) ? r.range(0.08, 0.2) : r.range(0, 0.04), life = r.int(A.life[0], A.life[1]);
  if (mg > 1.1) { const f = r.int(0, 3); if (f === 0) comp = r.range(0.65, 0.9); else if (f === 1) ret = r.range(0.11, 0.17); else if (f === 2) cert = r.range(0.12, 0.25); else life = r.int(10, 14); } // 마진이 좋은 물건에는 흠이 하나 있다
  const e = clamp(0.55 - (s.st.num || 0) / 200, 0.04, 0.5); // 숫자가 낮을수록 흐리게 보인다
  const rng = (v, lo, hi) => { const w = (hi - lo) * e, a = r.range(0, 1); return [clamp(v - w * a, lo, hi), clamp(v + w * (1 - a), lo, hi)]; };
  return { id: "I" + (++B.seq), n: r.pick(NAMES[cat]), cat, mg, comp, ret, cert, life, dem: r.int(A.dem[0], A.dem[1]), age: 0, inq: 0, stock: 0, cost: 0,
    see: { mg: rng(mg, 0.7, 1.4), comp: rng(comp, 0, 1), ret: rng(ret, 0, 0.2), cert: rng(cert, 0, 0.25), life: rng(life, 10, 36) } };
}
const UND_NOTE = [[300, "이제 아이템을 찾을 때 반품률과 인증 위험이 범위가 아니라 정확한 숫자로 보여요."], [1000, "새 분야에 들어갈 때 규격 설명이 0이 아니라 10에서 시작해요."]];
function genCands(s, r) { const B = s.buying, own = cats(B), L = []; const pool = r.shuffle(CATS.slice()); for (let i = 0; i < 3; i++) { const cat = own.length && i < 2 ? own[i % own.length] : pool[i]; let it = mkItem(s, r, cat), g = 0; while ((L.some((x) => x.n === it.n) || B.items.some((x) => x.n === it.n)) && g++ < 6) it = mkItem(s, r, cat); L.push(it); } B.cands = L; }
function addSpec(B, v) { const C = cats(B); for (const c of C) B.spec[c] = clamp((B.spec[c] || 0) + v / C.length, 0, 100); }
function star(B, v) { B.rating = clamp(B.rating + v, 3.0, 5); }
function payLoss(s, amt) { // 환불·손실: 준비금 → 운전자금 → 현금 차례로. 현금까지 가면 '늦은 환불'
  const B = s.buying; let left = amt, late = false; const a = Math.min(B.rsv, left); B.rsv -= a; left -= a; const b = Math.min(B.wc, left); B.wc -= b; left -= b; if (left > 0.5) { s.cash -= left; late = true; } return late;
}
function scrap(s, it) { const B = s.buying, v = Math.round((it.stock || 0) * (it.cost || 0)); if (v > 0) { addMoney(s, "exp", "구매대행 비용", v); B.mCost = (B.mCost || 0) + v; } it.stock = 0; it.gray = false; return v; } // 버리는 재고: 값은 살 때 이미 나갔으니 현금은 그대로, 장부에만 손실로 적는다
function revoke(s, why) { const B = s.buying; B.mode = 1; B.regN = 0; B.regT = null; B.q = []; B.revoked = (B.revoked || 0) + 1; if (B.dep) { s.cash += B.dep; B.dep = 0; } B.up = { imp: false, wh: false, cert: false }; B.upT = null; for (const it of B.items) { it.inq = 0; if (it.gray) scrap(s, it); } log(s, `구매대행 등록을 잃었다. ${why}`, "work"); } // 준비하던 창고 보증금은 돌려받는다(넣을 때처럼 장부에는 안 적는다)
export const HALT_MO = 3;
function punish(s, why) { // 걸렸을 때: 주문 대행형까지는 등록을 잃고 소개형으로. 직접 매입형부터는 방식·관문은 그대로 두고 석 달 판매 정지(true = 등록을 잃음)
  const B = s.buying; if (B.mode <= 2) { revoke(s, why); return true; }
  B.haltT = Math.max(B.haltT || 0, s.t + HALT_MO); B.halted = (B.halted || 0) + 1; B.q = []; for (const it of B.items) { it.inq = 0; if (it.gray) scrap(s, it); } log(s, `구매대행 판매가 석 달 멈췄다. ${why}`, "work"); return false;
}
function toMode2(s) { const B = s.buying; if (B.mode === 1 && B.regN >= 3 && B.regT == null && B.wc + tied(B) >= BY_BAL.wc0 * pi(s) - 0.5) { B.mode = 2; log(s, "구매대행: 주문 대행을 시작했다.", "work"); return true; } return false; }

function ev(s, r) {
  const B = s.buying, P = pi(s), A = BY_BAL, fl = B.orders.filter((o) => !o.kind && o.due >= s.t), n = r.int(3, 7), amt = Math.round(n * A.unit * P), gap = Math.round(Math.max(60 * P, tied(B) * 0.5));
  const L = [
    { id: "hold", ok: () => B.mode >= 2 && fl.length > 0, t: "통관이 멈췄다", x: `고객이 적어 준 통관 번호와 이름이 맞지 않는다. 물건 ${n}건이 세관에 서 있다. 고객은 답이 느리다. 배송 문의가 쌓인다.`,
      c: [{ t: "고객에게 번호를 다시 받는다", eff: {}, text: "까톡을 세 번 보냈다. 나흘 뒤에 답이 왔다. 배송은 2주 밀렸다." },
        { t: "내 통관 번호로 넣는다", eff: {}, text: "내 이름으로 넣자 그날 풀렸다. 남의 물건을 내 이름으로 들여온 셈이다." },
        { t: "반송한다", eff: {}, text: "물건은 돌아갔다. 반송비는 내가 냈다. 고객에게는 전액 돌려줬다." },
        ...(byHelp(s, "by_ship") ? [{ t: `${helpName("by_ship", "물류센터 담당")}에게 전화한다`, eff: {}, text: `새벽 2시에 전화를 받았다. "번호 끝 네 자리요." 상자는 선반에서 사흘을 기다렸고, 그사이 고객의 본인 번호가 왔다. 반송도 지연도 없었다.` }] : [])] },
    { id: "ret", ok: () => B.mode >= 2 && B.done >= 10, t: "반품이 왔다", x: `구멍 간격이 다른 판본이었다. ${n}건이 한꺼번에 돌아온다. 해외 판매자는 환불에 3주가 걸린다고 한다. 고객에게 돌려줄 돈은 ${won(amt)}.`,
      c: [{ t: "내 돈으로 사흘 안에 환불한다", eff: {}, text: "준비금에서 먼저 돌려줬다. 판매자 돈은 다음 달에 들어온다." },
        { t: "판매자 돈을 기다린다", eff: {}, text: "3주를 기다리게 했다. 기한을 넘겼고, 고객 둘이 신고를 넣었다." },
        { t: "교환을 권한다", check: { stat: "write", dc: 55 }, ok: { text: "판본 차이를 사진으로 설명했다. 대부분 교환을 골랐다. 재배송비만 들었다.", eff: {} }, ng: { text: "\"그냥 환불해 주세요.\" 설명이 길수록 답이 짧아졌다. 결국 환불했다.", eff: { mental: -3 } } }] },
    { id: "zero", ok: () => B.mode >= 2 && B.mode <= 3 && B.done >= 30, t: "수수료 0원 행사", x: `큰 직구 서비스가 수수료 0원 행사를 연다. 같은 물건을 저쪽은 수수료 없이 사 주고, 나는 건당 ${(A.fee * A.k * squeeze(s) * P).toFixed(1)}만 원쯤 받는다. 문의가 눈에 띄게 줄었다.`,
      c: [{ t: "수수료를 내린다", eff: {}, text: "여섯 달 동안 수수료를 절반 가까이 내렸다. 건수는 늘고 남는 건 없다." },
        { t: "분야를 더 좁힌다", eff: {}, text: "잘 아는 분야만 남기고 규격 설명을 다시 썼다. 석 달은 문의가 줄 것이다." },
        { t: "광고를 늘린다", eff: {}, text: "광고비를 한 단계 올렸다. 문의는 버텼다. 운전자금이 더 빨리 돈다." }] },
    { id: "toy", ok: () => B.mode >= 2, t: "인증 없는 물건 의뢰", x: `단골이 어린이 장난감 링크를 보냈다. "이거 열 개만요. 수수료는 세 배 드릴게요." 어린이가 쓰는 물건은 따로 확인할 것이 많다고 들었다. 나는 확인해 본 적이 없다.`,
      c: [{ t: "거절한다", eff: {}, text: "\"이건 제가 못 해 드려요.\" 단골은 아쉬워했다." },
        { t: "확인해 보고 답한다", eff: { ap: -1 }, text: "하루를 들여 알아봤다. 내가 책임질 수 없는 물건이라고 적어 보내고, 확인이 끝난 비슷한 물건을 찾아 줬다." },
        { t: "받는다", eff: {}, text: "열 건을 넣었다. 수수료는 컸다." }] },
    { id: "card", ok: () => B.mode === 2 && tied(B) > 50 * P && !B.fast, t: "카드값 날과 정산일이 어긋났다", x: `카드값은 12일에 빠진다. 마켓 정산은 25일이다. 그 사이 ${won(gap)}이 빈다. 주문은 계속 들어온다.`,
      c: [{ t: "주문을 2주 멈춘다", eff: {}, text: "공지를 올리고 2주를 쉬었다. 기다리던 견적 몇 건이 날아갔다." },
        { t: "대출로 메운다", eff: {}, text: `${won(gap)}을 빌려 운전자금에 넣었다. 이자가 붙는다.` },
        { t: "정산이 빠른 마켓으로 옮긴다", eff: {}, text: "수수료를 더 내는 대신 입금이 빨라졌다. 묶이는 기간이 줄었다." }] },
  ].filter((e) => e.ok());
  if (!L.length) return null;
  const e = r.pick(L); s._byEv = { id: e.id, n, amt, gap };
  return { kind: "event", tag: "구매대행", title: e.t, text: e.x, onChoose: "by_ev", choices: e.c };
}

export default {
  key: "buying", prefix: "by_", hubName: "구매대행",
  init: () => ({ v: 1, mode: 1, posts: 0, postN: 0, regN: 0, regT: null, wc: 0, rsv: 0, fx: 1, fx0: 1, items: [], cands: [], seq: 0, spec: {}, deep: 0, q: [], orders: [], oseq: 0,
    rating: 4.4, done: 0, sold: 0, best: 0, best3: 0, mOrd: 0, csN: 0, bk: false, unbk: 0, ad: 0, staff: 0, hired: 0, care: 0, late: 0, dryM: 0, dry: false, revoked: 0, shady: 0,
    up: { imp: false, wh: false, cert: false }, upT: null, dep: 0, m3T: null, g: { corp: false, cert: false, wh: false, deal: false }, corpN: 0, corpT: null, dealT: 0, flt: 0, dl: 0, bh: 1, proT: null, renewT: null,
    cutT: 0, zeroT: 0, narrowT: 0, haltT: 0, pauseT: 0, fast: false, evT: -99, months: 0, cum: 0, hist: [], last: null, mRev: 0, mCost: 0, shipLast: 0 }),
  money: { inc: ["구매대행 수입"], exp: ["구매대행 비용"] },
  mg: { by_order: "num" }, // 미니게임 buying1 '통관 번호 맞추기'(mg2/buying1.js): 점수가 주문 넣기의 boost(×0.7~1.5 → 한 번에 넣는 건수). 건너뛰기 결과는 숫자 기준
  actions: {
    by_find: { n: "아이템 찾기·규격 확인", ap: 1, hp: 2, desc: "후보 셋이 나와요. 숫자가 높을수록 마진·반품률이 정확히 보여요", stat: { num: 0.4 } },
    by_pick: { n: "후보를 아이템으로 고르기", ap: 0, hp: 0, desc: "자리가 차 있으면 가장 식은 아이템과 바꿔요" },
    by_post: { n: "비교 글 쓰기", ap: 1, hp: 2, desc: "광고 대신 글로 손님을 모아요. 글은 달마다 조금씩 낡아요", stat: { write: 0.4 } },
    by_reg: { n: "등록 세 가지 진행", ap: 1, hp: 2, desc: "사업자 → 판매 → 통관. 다 마치고 운전자금 100만이 있으면 주문 대행을 시작해요" },
    by_fund: { n: "운전자금·준비금 넣기/빼기", ap: 0, hp: 0, desc: "현금과 구매대행 통장 사이를 옮겨요" },
    by_quote: { n: "견적 보내기", ap: 1, hp: 2, desc: "문의에 상품값·수수료·기한을 적어 보내요. 이번 달 환율로 묶여요", stat: { num: 0.2, write: 0.2 } },
    by_order: { n: "주문 넣기·통관 번호 확인", ap: 1, hp: 2, desc: "내 돈으로 먼저 결제해요. 건당 상품값이 2~6주 묶여요", stat: { num: 0.3, lang: 0.15 } },
    by_cs: { n: "배송 안내·문의 답하기", ap: 1, hp: 2, mental: -1, desc: "안 하면 반품이 늘고 별점이 내려가요", stat: { write: 0.3, lang: 0.2 } },
    by_book: { n: "정산 대조·장부", ap: 1, hp: 1, desc: "주문·카드·정산 내역을 맞춰요. 안 맞추면 새는 돈이 생겨요", stat: { num: 0.5 } },
    by_ad: { n: "광고 단계 바꾸기", ap: 0, hp: 0, desc: "문의가 늘지만 운전자금이 더 빨리 말라요" },
    by_hire: { n: "응대 직원 채용/내보내기", ap: 1, hp: 2, desc: "직원이 견적과 문의를 맡아요. 한 명에 '사람 챙기기' 행동력 0.5가 들어요" },
    by_care: { n: "사람 챙기기", ap: 1, hp: 2, mental: -1, desc: "면담·교육·실수 수습. 직원 두 명에 한 번. 안 하면 그만두거나 사고가 나요", stat: { talk: 0.3 } },
    by_up: { n: "직접 매입 준비", ap: 1, hp: 3, desc: "수입 신고 → 창고 → 인증. 마치면 재고를 들여와 팔 수 있어요" },
    by_buy: { n: "재고 매입", ap: 1, hp: 2, desc: "아이템 한 가지를 두 달 반 치 들여와요. 유행이 식으면 안 팔려요", stat: { num: 0.3 } },
    by_smug: { n: "개인 통관으로 재고 들이기", ap: 1, hp: 2, desc: "신고 없이 재고를 쌓아요. 빠르지만 걸리면 큰돈을 물고 등록까지 잃을 수 있어요" },
    by_gate: { n: "본업화 관문 풀기", ap: 1, hp: 3, desc: "법인 등록 → 제품 인증 → 창고·재고 자금 → 공급 계약" },
    by_sales: { n: "거래처 늘리기", ap: 1, hp: 3, desc: "국내 매장에 물건을 넣어요. 한 곳마다 첫 물량 값이 묶여요", stat: { talk: 0.4 } },
  },
  can(s, id, arg) {
    const B = s.buying, A = BY_BAL, P = pi(s), G = A.gate;
    const m2 = "주문 대행은 등록 세 가지와 운전자금 100만이 있어야 열려요";
    if (id === "by_pick") { if (!B.cands.length) return "먼저 아이템 찾기를 해요"; return B.cands[+(arg ?? 0)] ? null : "없는 후보예요"; }
    if (id === "by_reg") return B.regN >= 3 ? (B.mode === 1 && B.regT == null ? `등록은 끝났어요. 운전자금 ${won(A.wc0 * P)}을 넣으면 시작해요` : B.regT != null ? "통관 등록을 처리 중이에요" : "등록을 마쳤어요") : B.postN < A.postNeed ? `비교 글 ${A.postNeed}편을 쓴 뒤에 해요(지금 ${B.postN}편)` : s.cash < A.regCost * P ? "등록 비용이 모자라요" : null;
    if (id === "by_fund") { const m = /^([wr])([+-])(\d+)$/.exec(String(arg ?? "w+100")); if (!m) return "금액을 골라요"; const v = +m[3]; if (m[2] === "+") return s.cash < v ? "현금이 모자라요" : null; return (m[1] === "w" ? B.wc : B.rsv) < v - 0.5 ? "그만큼 들어 있지 않아요(묶인 돈은 못 빼요)" : null; }
    if (id === "by_quote") return B.mode < 2 ? m2 : B.haltT > s.t ? "판매 정지 중이에요" : inqAll(B) < 1 ? "지금은 문의가 없어요. 비교 글을 쓰거나 아이템을 찾아요" : null;
    if (id === "by_order") return B.mode < 2 ? m2 : !B.q.length ? "먼저 견적을 보내요" : B.pauseT > s.t && B.mOrd > 0 ? "이번 달은 주문을 줄이기로 했어요" : B.wc < orderCost(s) ? "운전자금이 바닥났어요. 입금을 기다리거나 운전자금을 넣어요" : null;
    if (id === "by_cs") return B.mode < 2 ? m2 : B.csN >= Math.max(1, csNeed(B)) ? "이번 달 응대는 충분해요" : inflight(B) + (B.shipLast || 0) < 1 ? "지금은 답할 문의가 없어요" : null;
    if (id === "by_book") return B.mode < 2 ? m2 : B.bk ? "이번 달 대조는 끝났어요" : null;
    if (id === "by_ad") return B.mode < 2 ? m2 : null;
    if (id === "by_hire") { if (arg === "-") return B.staff ? null : "직원이 없어요"; return B.mode < 2 ? m2 : B.staff >= staffCap(B) ? `지금 방식으로는 ${staffCap(B)}명까지예요` : B.best3 < 30 && B.mode === 2 ? "월 30건은 넘어야 사람을 쓸 만해요" : s.cash < A.staff.hire * P ? "채용 비용이 모자라요" : null; }
    if (id === "by_care") return !B.staff ? "직원이 없어요" : B.care >= careNeed(B) ? "이번 달은 다 챙겼어요" : null;
    if (id === "by_up") {
      if (B.mode < 2) return m2; if (B.mode > 2) return "이미 직접 매입을 하고 있어요";
      if (B.done < A.m3.need || B.rating < A.m3.star) return `누적 ${A.m3.need}건, 별점 ${A.m3.star} 이상이 되면 열려요(지금 ${B.done}건 · ★${B.rating.toFixed(2)})`;
      if (B.upT != null) return "수입 신고를 처리 중이에요";
      const k = UPS[upStep(B)]?.[0], need = k === "wh" ? (A.m3.dep + A.m3.fit) * P : k === "cert" ? A.m3.cert * P : A.m3.imp * P; return s.cash < need ? `${won(need)}이 들어요` : null;
    }
    if (id === "by_buy") { if (B.mode < 3) return "수입 신고·창고·인증을 마쳐야 재고를 들일 수 있어요"; if (B.haltT > s.t) return "판매 정지 중이에요"; const it = B.items.find((x) => (arg ? x.id === arg : true) && trend(x) > 0.3); if (!it) return "들여올 만한 아이템이 없어요. 아이템을 찾아요"; return s.cash < lotOf(s, it).each * 10 ? "재고 살 돈이 모자라요" : null; }
    if (id === "by_smug") return B.mode !== 2 ? (B.mode < 2 ? m2 : "이제는 정식으로 들여올 수 있어요") : !B.items.length ? "아이템이 없어요" : s.cash < A.smug.cost * P ? `${won(A.smug.cost * P)}이 들어요` : null;
    if (id === "by_gate") {
      if (B.mode < 3) return "직접 매입형이 된 뒤에 열려요"; const gi = gateStep(B); if (gi < 0) return "관문을 모두 풀었어요";
      if (!Object.values(B.g).some(Boolean) && !B.corpN && (s.t - (B.m3T ?? s.t) < G.mo || B.sold < G.sold || B.rating < G.star)) return `직접 매입 ${G.mo}달, 재고 판매 ${G.sold}개, 별점 ${G.star}이 되면 열려요(지금 ${s.t - (B.m3T ?? s.t)}달 · ${B.sold}개 · ★${B.rating.toFixed(2)})`;
      const k = GATES[gi][0];
      if (k === "corp") return B.corpT != null ? `법인 등록을 처리 중이에요(${Math.max(1, B.corpT - s.t)}달 남음)` : s.cash < G.corpCost * P ? "등록 비용이 모자라요" : null;
      if (k === "cert") return s.cash < G.cert * P ? `인증에 ${won(G.cert * P)}이 들어요` : null;
      if (k === "wh") { const need = (G.dep + G.flt) * P; return s.cash + creditRoom(s) * 0.6 + 2000 < need ? `창고와 첫 물량에 ${won(need)}이 들어요` : null; }
      if (k === "deal") return B.dealT > s.t ? `브랜드의 답을 기다려요(${B.dealT - s.t}달 뒤 다시)` : s.cash < G.trip * P ? "출장비가 모자라요" : null;
    }
    if (id === "by_sales" && arg === "-") return B.mode >= 4 && B.dl > 0 ? null : "정리할 거래처가 없어요";
    if (id === "by_sales") return B.mode < 4 ? "수입 유통사가 된 뒤에 열려요" : B.dl >= dealerCap(s) ? (emp(s) ? `낮에 회사에 있어서 거래처는 ${dealerCap(s)}곳까지예요` : `거래처는 ${dealerCap(s)}곳까지예요`) : s.cash < A.m4.flt * P ? `거래처 한 곳의 첫 물량에 ${won(A.m4.flt * P)}이 들어요` : null;
    return null;
  },
  act(s, r, id, arg, boost = 1) {
    const B = s.buying, A = BY_BAL, P = pi(s), G = A.gate;
    const spend = (v) => { v = Math.round(v); s.cash -= v; addMoney(s, "exp", "구매대행 비용", v); B.mCost += v; return v; };
    if (id === "by_find") { genCands(s, r); addSpec(B, 4 * boost * eyeX(s)); return { lines: ["후보 셋을 찾았어요", cats(B).length ? "규격 설명 +" : "보드에서 하나를 골라요"], msg: r.pick(["샘플을 받아 자로 쟀다. 상세 설명의 치수와 2mm가 달랐다.", "해외 후기 삼백 개를 읽었다. 별 하나짜리부터 읽는다.", "같은 이름인데 판본이 셋이다. 구멍 간격이 다 다르다."]) }; }
    if (id === "by_pick") {
      const it = B.cands[+(arg ?? 0)]; B.cands = []; let out = null;
      if (B.items.length >= slots(B)) { out = B.items.slice().sort((a, b) => trend(a) - trend(b) || (a.stock || 0) - (b.stock || 0))[0]; B.items = B.items.filter((x) => x !== out); }
      const outN = out?.stock || 0, lostV = out ? scrap(s, out) : 0;
      const head = UND.at(s, "buying", UND.TH.장인) && newCat(s, it); // 11-28 이해도 장인: 새 분야는 규격 설명이 0이 아니라 spec0 에서 시작
      delete it.see; B.items.push(it); B.spec[it.cat] = head ? BY_UND.spec0 : B.spec[it.cat] || 0;
      return { lines: [`새 아이템: ${it.cat} · ${it.n}`, ...(head ? [`새 분야 · 규격 설명 ${BY_UND.spec0}에서 시작(업의 이해도 덕분)`] : []), ...(out ? [`${out.n}: 내렸어요${outN ? ` · 남은 재고 ${outN}개는 버렸어요(손실 ${won(lostV)})` : ""}`] : [])], msg: "잘 팔릴 물건보다, 내가 설명할 수 있는 물건을 골랐다." };
    }
    if (id === "by_post") { B.posts += boost * (1 + (s.st.write || 0) / 300); B.postN++; return { lines: [`비교 글 ${B.postN}편`, B.mode === 1 ? "소개비가 조금씩 들어와요" : "문의가 늘어요"], msg: r.pick(["세 나라 가격을 표로 만들었다. 배송비와 세금까지 넣으니 순서가 바뀌었다.", "\"직접 사면 얼마, 맡기면 얼마.\" 숨기지 않고 둘 다 적었다.", "판본별 구멍 간격을 사진으로 찍어 올렸다."]) }; }
    if (id === "by_reg") { const k = REGS[B.regN]; spend(A.regCost * P); B.regN++; if (k[0] === "cus") { B.regT = s.t + 1; return { lines: ["등록 3/3 · 통관 등록 신청", "처리에 한 달쯤 걸려요"], msg: "서류를 넣었다. 답은 다음 달에 온다." }; } return { lines: [`등록 ${B.regN}/3 · ${k[1]}`], msg: k[0] === "biz" ? "퇴근길에 신청을 넣었다. 회사에는 말하지 않았다." : "판매 등록 번호가 나왔다. 상점 맨 아래에 적었다." }; }
    if (id === "by_fund") { const m = /^([wr])([+-])(\d+)$/.exec(String(arg ?? "w+100")), v = +m[3], sg = m[2] === "+" ? 1 : -1, w = m[1] === "w"; s.cash -= sg * v; if (w) B.wc = Math.max(0, B.wc + sg * v); else B.rsv = Math.max(0, B.rsv + sg * v); const up = toMode2(s); return { lines: [`${w ? "운전자금" : "환불 준비금"} ${sg > 0 ? "+" : "−"}${won(v)}`, ...(up ? ["주문 대행을 시작해요", "아이템을 고르고 견적을 보내요"] : [])], msg: "" }; }
    if (id === "by_quote") {
      let cap = Math.round((A.capQ + (s.st.num || 0) / 8) * boost), sent = 0, got = 0;
      for (const it of B.items.slice().sort((a, b) => b.mg - a.mg)) { if (cap <= 0) break; if (it.stock > 0) continue; const n = Math.min(it.inq || 0, cap); if (n <= 0) continue; it.inq -= n; cap -= n; sent += n; const ok = Math.round(n * conv(s, it)); if (ok > 0) { got += ok; B.q.push({ it: it.id, n: ok, fxq: B.fx, t: s.t }); } }
      return { lines: [`견적 ${sent}건 → 주문 확정 ${got}건`, "이번 달 안에 주문을 넣어야 지금 환율이에요"], msg: r.pick(["상품값, 해외 배송비, 세금, 수수료. 네 줄로 나눠 적었다.", "견적서 끝에 유효기한을 적었다. 환율은 기다려 주지 않는다."]) };
    }
    if (id === "by_order") {
      let cap = Math.round((A.capO + (s.st.num || 0) / 10) * boost * (B.pauseT > s.t ? 0.5 : 1)), put = 0, fee = 0, out = 0; const each = orderCost(s), hf = byHelp(s, "by_fee") ? BY_HFX.fee : 1, two = (1 - A.due[0] - A.due[1]) * (byHelp(s, "by_ship") ? BY_HFX.ship : 1); // 11-28 조력: 수수료 조건 · 두 달 걸리는 입금 몫
      for (const q of B.q.slice()) { if (cap <= 0) break; const it = B.items.find((x) => x.id === q.it), n = Math.min(q.n, cap, Math.floor(B.wc / each)); if (n <= 0) { B.dry = true; break; } const f = A.fee * (it?.mg || 1) * P * A.k * squeeze(s) * (B.cutT > s.t ? 0.55 : 1) * (B.fast ? 0.92 : 1) * hf - A.unit * P * Math.max(-0.05, B.fx - q.fxq); q.n -= n; cap -= n; put += n; fee += n * f; out += n * each; B.wc -= n * each; if (q.n <= 0) B.q = B.q.filter((x) => x !== q); else if (B.wc < each) B.dry = true;
        const u = r.range(0, 1), d = B.fast ? (u < 0.6 ? 0 : 1) : u < A.due[0] ? 0 : u < 1 - two ? 1 : 2; B.orders.push({ id: "O" + (++B.oseq), it: q.it, nm: it?.n || "주문", n, out: n * each, fee: n * f, t: s.t, due: s.t + d, ret: it ? retRate(s, it) : 0.08, cat: it?.cat }); }
      B.mOrd += put; B.done += put; if (put && SYN.on(s, "by_night")) s.hp = Math.max(0, s.hp - 1); // 밤 11시 주문
      let fl = []; if (put && !B.first) { const L = FIRST.filter(([c]) => CHAR[c] && !s.rel?.[c]?.spouse && !s.rel?.[c]?.lover), kn = L.filter(([c]) => s.rel?.[c]), f = L.length ? r.pick(kn.length ? kn : L) : null; B.first = f ? f[0] : "-"; /* 11-28 첫 손님: 기존 인물 여섯 가운데 한 명 */
        if (f) { const nm = CHAR[f[0]].name; if (!s.cast.includes(f[0])) s.cast.push(f[0]); ensureRel(s, f[0]); addAff(s, f[0], 5); fl = [`첫 손님: ${nm} · ${f[1]}`, `${nm} 호감 +`]; log(s, `구매대행 첫 주문: ${nm}`, "work"); } }
      return { lines: [...fl, `주문 ${put}건 · 상품값 ${won(Math.round(out))}이 묶였어요`, `받을 수수료 ${won(Math.round(fee))}`, ...(B.dry ? ["운전자금이 모자라 남은 견적은 못 넣었어요"] : [])], msg: r.pick(["밤 11시, 통관 번호 열두 개를 이름과 하나씩 맞춰 봤다.", "결제 버튼을 누를 때마다 통장 숫자가 줄었다. 내 돈이 먼저 간다.", "주문 번호를 표에 옮겼다. 주문일, 도착 예정일, 입금 예정일."]) };
    }
    if (id === "by_cs") { B.csN++; addSpec(B, 2 * boost * eyeX(s)); star(B, 0.005 * boost); return { lines: [`응대 ${B.csN}/${Math.max(1, csNeed(B))}`, "규격 설명 +"], msg: r.pick(["\"지금 어디쯤인가요?\" 서른 번 받은 질문에 서른 번 답했다.", "배송 조회 화면을 캡처해 먼저 보냈다. 묻기 전에 알려 주면 문의가 준다.", "반품 조건을 원문으로 다시 읽었다. '개봉 전'이라는 말이 있었다."]) }; }
    if (id === "by_book") { B.bk = true; B.unbk = 0; return { lines: ["이번 달 정산을 맞췄어요"], msg: r.pick(["주문 표와 카드 내역, 정산 내역을 나란히 놓았다. 한 건이 빠져 있었다.", "수수료가 두 번 빠진 건을 찾았다. 문의를 넣었다."]) }; }
    if (id === "by_ad") { B.ad = arg != null && arg !== "" ? clamp(+arg || 0, 0, 3) : ((B.ad || 0) + 1) % 4; return { lines: [`광고 ${B.ad}단계 · 월 ${won(A.ad[B.ad] * P)}`], msg: "" }; }
    if (id === "by_hire") { if (arg === "-") { spend(A.staff.wage[B.mode - 1] * P); B.staff--; B.care = Math.min(B.care, careNeed(B)); return { lines: [`직원 ${B.staff}명`, `한 달 치 월급 −${won(A.staff.wage[B.mode - 1] * P)}`], msg: "한 달 치 월급을 더 주고 보냈다." }; } spend(A.staff.hire * P); B.staff++; B.hired++; return { lines: [`직원 ${B.staff}/${staffCap(B)}명`, `월급 ${won(A.staff.wage[B.mode - 1] * P)} · 사람 챙기기 ${careNeed(B)}번 필요`], msg: "첫 주는 답변을 같이 썼다. \"모르면 모른다고 쓰세요.\"" }; }
    if (id === "by_care") { B.care++; return { lines: [`사람 챙기기 ${B.care}/${careNeed(B)}`], msg: r.pick(["지난달 잘못 나간 주문을 같이 되짚었다. 탓하지 않기로 먼저 말했다.", "한 명씩 밥을 먹었다. 가장 힘든 문의가 뭔지 들었다.", "반품 답변 문구를 같이 고쳤다."]) }; }
    if (id === "by_up") {
      const k = UPS[upStep(B)][0];
      if (k === "imp") { spend(A.m3.imp * P); B.upT = s.t + 1; return { lines: ["수입 신고를 넣었어요", "처리에 한 달쯤 걸려요"], msg: "이제부터는 '대신 사 주는 사람'이 아니라 '들여와 파는 사람'이다." }; }
      if (k === "wh") { const dep = Math.round(A.m3.dep * P); s.cash -= dep; B.dep = (B.dep || 0) + dep; spend(A.m3.fit * P); B.up.wh = true; return { lines: ["창고 계약", `보증금 ${won(dep)} · 월세 ${won(A.m3.rent * P)}`], msg: "열 평짜리 창고에 선반 여섯 개를 넣었다." }; }
      spend(A.m3.cert * P); B.up.cert = true; B.mode = 3; B.m3T = s.t; log(s, "구매대행: 직접 매입을 시작했다.", "work"); return { lines: ["인증 완료", "직접 매입형이 됐어요", "재고 매입이 열려요"], msg: "인증서 번호를 상세 설명 맨 위에 적었다." };
    }
    if (id === "by_buy") { const it = B.items.filter((x) => (arg ? x.id === arg : true) && trend(x) > 0.3).sort((a, b) => (a.stock || 0) / Math.max(1, demandOf(s, a)) - (b.stock || 0) / Math.max(1, demandOf(s, b)))[0], L = lotOf(s, it), qty = Math.min(L.qty, Math.floor(s.cash / L.each)), c = Math.round(qty * L.each); s.cash -= c; it.cost = ((it.stock || 0) * (it.cost || 0) + c) / ((it.stock || 0) + qty); it.stock = (it.stock || 0) + qty; it.gray = false; it.inq = 0; return { lines: [`${it.n} ${qty}개 입고`, `재고 값 ${won(c)}`, `유행 수명 ${Math.max(0, Math.round(it.life - it.age))}달 남음`], msg: r.pick(["상자 스무 개가 창고에 들어왔다. 이제 안 팔리면 내 몫이다.", "환율이 낮은 날을 골라 결제했다."]) }; }
    if (id === "by_smug") { const it = B.items.slice().sort((a, b) => trend(b) * b.mg - trend(a) * a.mg)[0], c = Math.round(A.smug.cost * P), each = A.unit * P * B.fx * 0.9, qty = Math.floor(c / each); s.cash -= c; it.cost = ((it.stock || 0) * (it.cost || 0) + c) / ((it.stock || 0) + qty); it.stock = (it.stock || 0) + qty; it.gray = true; B.shady++; return { lines: [`${it.n} ${qty}개를 내 이름으로 들여왔어요`, "걸리면 큰돈을 물고 등록까지 잃을 수 있어요"], msg: "\"자가 사용\" 칸에 표시했다. 거짓말이다." }; }
    if (id === "by_gate") {
      const k = GATES[gateStep(B)][0];
      if (k === "corp") { spend(G.corpCost * P); B.corpN++; if (B.corpN < G.corpN) return { lines: [`법인 등록 ${B.corpN}/${G.corpN}`], msg: "개인 이름으로 했던 등록을 법인 이름으로 하나씩 다시 넣는다." }; B.corpT = s.t + G.corpMo; return { lines: [`법인 등록 ${G.corpN}/${G.corpN} · 처리에 ${G.corpMo}달쯤`, "명의를 옮기는 동안 판매가 줄어요"], msg: "상점 이름 옆에 '주식회사'가 붙을 예정이다." }; }
      if (k === "cert") { const ok = r.chance(clamp(0.5 + ((s.st.num || 0) - G.certDc) / 50 + (mentorMet(s) ? BY_HFX.cert : 0), 0.2, 0.95)); /* 11-28 스승 방영숙: 서류를 먼저 봐 준다 */ spend(G.cert * P * (ok ? 1 : 0.35)); if (!ok) return { lines: ["서류 보완 요청", "시험 성적서의 숫자가 안 맞았어요"], msg: "단위가 인치와 밀리미터로 섞여 있었다. 다시 넣는다." }; B.g.cert = true; return { lines: ["관문 2/4 · 제품 인증", ...(mentorMet(s) ? [`${CHAR.c137?.name || "스승"}이 서류를 먼저 봐 줬어요`] : [])], msg: "이제 이 물건에 문제가 생기면 내 책임이다. 그래서 값을 받을 수 있다." }; }
      if (k === "wh") { const dep = Math.round((G.dep - A.m3.dep) * P), flt = Math.round(G.flt * P), tot = dep + flt, lack = tot - s.cash; if (lack > 0) { addLoan(s, "사업자대출", lack + 100, 0.048); s.cash += lack + 100; } s.cash -= tot; B.dep += dep; B.flt += flt; B.g.wh = true; log(s, `구매대행: 큰 창고와 첫 물량 ${won(tot)}`, "work"); return { lines: ["관문 3/4 · 창고·재고 자금", `보증금 ${won(B.dep)} · 첫 물량 ${won(flt)}`, `월세 ${won(G.rent * P)}`], msg: "지게차가 들어오는 창고다. 보증금 숫자를 세 번 읽었다." }; }
      if (k === "deal") { spend(G.trip * P); const v = (s.st.lang || 0) * 0.6 + (s.st.talk || 0) * 0.4, ok = r.chance(clamp(0.5 + (v - G.dealDc) / 50, 0.15, 0.95)); if (!ok) { B.dealT = s.t + G.retry; return { lines: ["계약 불발", `${G.retry}달 뒤 다시 만나요`], msg: "\"반품 책임\" 조항을 내가 잘못 읽었다. 그쪽은 웃으며 다음에 보자고 했다." }; }
        B.g.deal = true; B.mode = 4; B.proT = s.t; B.renewT = s.t + A.m4.renew; B.dl = Math.max(B.dl, 2); log(s, "해외 브랜드와 국내 공급 계약을 맺었다. 수입 유통사가 됐다.", "work"); return { lines: ["관문 4/4 · 공급 계약", "수입 유통사가 됐어요", "거래처 늘리기가 열려요"], msg: "계약서 서른 장을 원문으로 읽었다. 서명은 맨 마지막 장에 했다." }; }
    }
    if (id === "by_sales" && arg === "-") { const one = Math.min(B.flt, Math.round(A.m4.flt * P)), back = Math.round(one * A.m4.back), lossV = one - back; B.flt -= one; B.dl--; s.cash += back; if (lossV > 0) { addMoney(s, "exp", "구매대행 비용", lossV); B.mCost += lossV; } return { lines: [`거래처 ${B.dl}곳`, `묶인 물량 ${won(back)} 회수(손실 ${won(lossV)})`], msg: "남은 물건을 되가져왔다. 상자 모서리가 눌려 있었다." }; }
    if (id === "by_sales") { const v = ((s.st.talk || 0) + (s.st.lang || 0) * 0.5) / 1.5, ok = r.chance(clamp((0.55 + (v - 60) / 100) * boost * (emp(s) ? 0.7 : 1), 0.15, 0.95)); if (!ok) return { lines: ["이번에는 못 넣었어요"], msg: emp(s) ? "점심시간에 다녀왔다. 담당자는 자리에 없었다." : "\"다음 분기에 다시 얘기하시죠.\" 견본만 두고 나왔다." }; const f = Math.round(A.m4.flt * P); s.cash -= f; B.flt += f; B.dl++; return { lines: [`거래처 ${B.dl}곳`, `첫 물량 ${won(f)}이 묶였어요`], msg: "매장 선반 한 칸을 받았다. 가격표에 우리 회사 이름이 작게 들어간다." }; }
    return { lines: [], msg: "" };
  },
  choose: {
    by_ev(s, r, i, ok) {
      const B = s.buying, A = BY_BAL, P = pi(s), E = s._byEv || {}, out = [], st = (v) => { star(B, v); out.push(`별점 ${v > 0 ? "+" : ""}${v.toFixed(2)}`); };
      const loss = (v) => { v = Math.round(v); const late = payLoss(s, v); addMoney(s, "exp", "구매대행 비용", v); B.mCost += v; out.push(`손실 −${won(v)}`); return late; };
      if (E.id === "hold") { const o = B.orders.filter((x) => !x.kind && x.due >= s.t).sort((a, b) => b.n - a.n)[0];
        if (i === 0) { if (o) { o.due += 1; o.hold = true; } st(-0.05); out.push("입금이 한 달 밀려요"); }
        else if (i === 1) { B.shady++; if (r.chance(0.25)) { const f = Math.round(150 * P); s.cash -= f; addMoney(s, "exp", "구매대행 비용", f); B.mCost += f; const lost = punish(s, "남의 물건을 내 통관 번호로 넣은 것이 문제가 됐다."); out.push(`문제가 됐어요 · 물어낸 돈 −${won(f)}`, lost ? "등록을 잃었어요. 등록 세 가지를 처음부터 다시 해요" : "석 달 동안 판매가 멈춰요(방식과 관문은 그대로예요)"); } else out.push("이번에는 넘어갔어요"); }
        else if (i === 3) { st(0.02); out.push("배송이 밀리지 않았어요"); }
        else { if (o) { const k = Math.min(o.n, E.n || 3), per = o.out / o.n; o.fee -= k * (o.fee / o.n); o.out -= k * per; o.n -= k; B.wc += k * per; if (o.n <= 0) B.orders = B.orders.filter((x) => x !== o); } loss((E.n || 3) * 1.2 * P); } }
      else if (E.id === "ret") { const amt = E.amt || 20;
        if (i === 0) { const late = payLoss(s, amt); B.orders.push({ id: "O" + (++B.oseq), kind: "rf", nm: "판매자 환불", n: E.n || 3, out: amt * 0.8, fee: 0, t: s.t, due: s.t + 1, ret: 0 }); addMoney(s, "exp", "구매대행 비용", Math.round(amt * 0.2)); B.mCost += Math.round(amt * 0.2); out.push(`먼저 환불 −${won(amt)}`, "판매자 돈은 다음 달에 80%가 돌아와요"); if (late) { out.push("준비금·운전자금이 모자라 현금에서 나갔어요"); } st(0.03); }
        else if (i === 1) { B.late += 2; st(-0.12); loss(amt * 0.2); out.push("신고 +2"); }
        else if (ok) { loss(amt * 0.25); st(0.02); } else { loss(amt * 0.45); st(-0.06); } }
      else if (E.id === "zero") { B.zeroT = s.t + 6; if (i === 0) { B.cutT = s.t + 6; out.push("여섯 달 동안 수수료 −45%, 주문 확정 +"); } else if (i === 1) { B.narrowT = s.t + 3; B.zeroT = s.t + 3; B.deep = Math.min(3, (B.deep || 0) + 1); addSpec(B, 15); out.push("석 달 동안 문의 −40%", "그 뒤로 반품이 줄고 주문 확정이 늘어요"); } else { B.ad = Math.min(3, (B.ad || 0) + 1); B.zeroT = s.t + 2; out.push(`광고 ${B.ad}단계 · 월 ${won(A.ad[B.ad] * P)}`); } }
      else if (E.id === "toy") { if (i === 0) st(0.01); else if (i === 1) { const c = Math.round(A.fee * 2 * P * A.k); s.cash += c; addMoney(s, "inc", "구매대행 수입", c); B.mRev += c; addSpec(B, 3); st(0.03); out.push(`대신 찾아 준 물건 수수료 +${won(c)}`); } else { const c = Math.round(A.fee * 3 * 10 * P * A.k); s.cash += c; addMoney(s, "inc", "구매대행 수입", c); B.mRev += c; out.push(`수수료 +${won(c)}`); B.shady++; if (r.chance(0.35)) { const f = Math.round(200 * P); s.cash -= f; addMoney(s, "exp", "구매대행 비용", f); B.mCost += f; B.haltT = Math.max(B.haltT || 0, s.t + HALT_MO); st(-0.15); out.push(`판매가 멈췄어요 · 물어낸 돈 −${won(f)}`, "석 달 동안 견적과 판매가 멈춰요"); } } }
      else if (E.id === "card") { if (i === 0) { B.pauseT = s.t + 2; st(-0.03); out.push("다음 달 주문 넣기가 절반으로 줄어요"); } else if (i === 1) { const g = E.gap || 100; addLoan(s, "사업자대출", g, 0.07); B.wc += g; out.push(`운전자금 +${won(g)} (대출)`); } else { B.fast = true; out.push("입금이 빨라져요(두 달 걸리는 주문이 없어져요)", "수수료 −8%"); } }
      else if (E.id === "renew") { if (i === 0 && ok) { B.bh = clamp(B.bh + 0.05, 0.5, 1.15); out.push("공급 조건이 좋아졌어요"); } else if (i === 0) { B.bh = clamp(B.bh - 0.15, 0.5, 1.15); out.push("공급가가 올랐어요(거래처 이익 −)"); } else { B.bh = clamp(B.bh - 0.07, 0.5, 1.15); out.push("공급가가 조금 올랐어요"); } }
      return out;
    },
  },
  eff(s, e, out) { // 장면 전용 효과 키: by_star 별점 ± · by_wc 운전자금 ± · by_post 비교 글 +
    const B = s.buying; if (!B) return;
    if (e.by_star) { star(B, e.by_star); out.push(`구매대행 별점 ${e.by_star > 0 ? "+" : ""}${e.by_star.toFixed(2)}`); }
    if (e.by_wc) { B.wc = Math.max(0, B.wc + e.by_wc); out.push(`운전자금 ${e.by_wc > 0 ? "+" : "−"}${won(Math.abs(e.by_wc))}`); }
    if (e.by_post) { B.posts += e.by_post; out.push(`비교 글 +${e.by_post}`); }
  },
  monthStart(s, r) {
    const B = s.buying, A = BY_BAL;
    B.csN = 0; B.bk = false; B.care = 0; B.mOrd = 0; B.mRev = 0; B.mCost = 0; B.dry = false;
    B.fx0 = B.fx; B.fx = clamp(B.fx + (1 - B.fx) * A.fx.back + A.fx.sd * r.normal(), A.fx.lo, A.fx.hi);
    const old = B.q.filter((q) => q.t < s.t - 1); if (old.length) { B.q = B.q.filter((q) => q.t >= s.t - 1); star(B, -0.03); B.expired = old.reduce((a, q) => a + q.n, 0); } else B.expired = 0;
    if (!B.items.length && !B.cands.length) genCands(s, r); // 처음에는 지인이 물어본 물건 셋
    if (B.mode >= 2 && !(B.haltT > s.t)) { const rmp = SJ.ramp(s, "buying"); let auto = (B.staff || 0) * A.staff.cover;
      for (const it of B.items) { if (it.stock > 0) { it.inq = 0; continue; } it.inq = Math.max(0, Math.round((it.inq || 0) * 0.3 + demandOf(s, it) * rmp * (1 + 0.15 * r.normal())));
        if (auto > 0 && it.inq > 0) { const n = Math.min(it.inq, auto), ok = Math.round(n * conv(s, it)); it.inq -= n; auto -= n; if (ok > 0) B.q.push({ it: it.id, n: ok, fxq: B.fx, t: s.t }); } } } // 직원이 견적을 먼저 보낸다
  },
  month(s, r, notes, scenes) {
    const B = s.buying, A = BY_BAL, P = pi(s), K = A.k, corpDip = B.corpT != null ? A.gate.corpDip : 1; let rev = 0, cost = 0, pool = 0; // pool: 준비금·운전자금에서 이미 나간 손실(현금에서 다시 빼지 않는다)
    // 1) 소개비(소개형)
    if (B.mode === 1) { const it = B.items[0], n = Math.round(B.posts * r.range(A.click[0], A.click[1]) * (it ? 0.6 + 0.4 * trend(it) * it.mg : 0.5) * (1 + (s.st.write || 0) / 200) * SJ.ramp(s, "buying")); rev += n * A.ref * P * K; B.clicks = n; }
    // 2) 입금: 상품값은 운전자금으로, 수수료는 현금으로. 반품은 준비금에서
    const csLack = B.mode >= 2 ? Math.max(0, csNeed(B) - B.csN) : 0, noBook = B.mode >= 2 && !B.bk && !taxHelp(s); let paidN = 0, paidFee = 0, retN = 0, lateN = 0;
    for (const o of B.orders.slice()) { if (o.due > s.t) continue; B.orders = B.orders.filter((x) => x !== o); B.wc += o.out; if (o.kind) continue;
      const nr = Math.min(o.n, Math.max(0, Math.round(o.n * o.ret * (csLack ? 1.5 : 1) * (1 + 0.4 * r.normal())))), fee = o.fee * (1 - nr / o.n) * corpDip * (noBook ? 1 - A.leak : 1), lossR = nr * A.retLoss * P;
      paidN += o.n; paidFee += fee; rev += fee; cost += o.n * A.ovh * P; retN += nr;
      if (lossR > 0) { const a = Math.min(B.rsv, lossR), b = Math.min(B.wc, lossR - a); B.rsv -= a; B.wc -= b; pool += a + b; if (lossR - a - b > 0.5) lateN += nr; cost += lossR; } // 준비금 → 운전자금 차례. 모자란 몫은 아래 정산에서 현금으로 나가고 '늦은 환불'이 된다
      if (o.cat) B.spec[o.cat] = clamp((B.spec[o.cat] || 0) + o.n / 20, 0, 100);
    }
    if (paidN) star(B, clamp((0.05 - retN / paidN) * 0.3, -0.03, 0.015));
    if (lateN) { B.late += 1; star(B, -0.08); notes.push(`구매대행: 환불 준비금이 모자라 ${lateN}건의 환불이 늦었어요. 신고가 들어왔어요.`); }
    if (csLack) { star(B, -0.05 * csLack); notes.push("구매대행: 배송 문의에 답을 못 했어요. 반품이 늘고 별점이 내려갔어요."); }
    if (noBook) { B.unbk++; if (paidN) notes.push(`구매대행: 정산을 안 맞춰 봤어요. 수수료 ${won(Math.round(paidFee * A.leak / (1 - A.leak)))}쯤이 샜어요.`); }
    // 3) 재고 판매(직접 매입 · 몰래 들인 재고)
    let ship = shipCap(B), soldM = 0, stockRev = 0;
    if (!(B.haltT > s.t)) for (const it of B.items) { if (!(it.stock > 0)) continue; const n = Math.min(it.stock, ship, Math.round(demandOf(s, it) * conv(s, it) * (it.gray ? A.smug.mult : A.m3.mult) * (1 + 0.15 * r.normal()))); if (n <= 0) continue; ship -= n; it.stock -= n; soldM += n;
      const price = A.unit * P * (A.m3.price[0] + A.m3.price[1] * it.mg), net = price * (1 - A.m3.mkt) - A.m3.pack * P - price * retRate(s, it) * 0.3 - it.cost, rv = n * (it.cost + Math.max(net, 0) * K * corpDip + Math.min(net, 0)); stockRev += rv; rev += rv; cost += n * it.cost; pool += n * it.cost; } // 재고 값은 살 때 이미 나갔다(장부에는 팔릴 때 원가로 적는다)
    B.sold += soldM; B.shipLast = soldM;
    if (B.items.some((it) => it.gray && it.stock > 0) && r.chance(A.smug.p)) { const f = Math.round(A.smug.fine * P); cost += f; const lost = punish(s, "신고 없이 들여온 재고가 문제가 됐다."); notes.push(`구매대행: 개인 통관으로 들인 재고가 문제가 됐어요. ${won(f)}을 물어냈고 그 재고는 못 쓰게 됐어요. ${lost ? "등록도 잃었어요." : "석 달 동안 판매가 멈춰요."}`); }
    // 4) 수입 유통사: 거래처
    let pro = null;
    if (B.mode >= 4) { const M = A.m4, served = Math.min(B.dl, M.self + B.staff * M.team), dRev = Math.round(served * M.per * P * K * B.bh * (B.haltT > s.t ? 0.5 : 1) * (1 + 0.08 * r.normal())); /* 판매 정지 중에는 거래처 납품이 절반 */ rev += dRev; pro = { served, dRev };
      if (B.renewT != null && s.t >= B.renewT && !scenes.some((x) => x.kind === "event")) { B.renewT = s.t + M.renew; s._byEv = { id: "renew" }; scenes.push({ kind: "event", tag: "구매대행", title: "공급 계약 갱신", text: "브랜드 본사가 새 계약서를 보냈다. 공급가가 조금 올랐고, 최소 주문량 조항이 새로 생겼다. 서른 장이다.", onChoose: "by_ev", choices: [{ t: "조항을 원문으로 읽고 다시 협상한다", check: { stat: "lang", dc: 70 }, ok: { text: "최소 주문량을 분기 단위로 바꿨다. 공급가도 조금 깎았다.", eff: {} }, ng: { text: "내가 고친 문장이 오히려 불리한 뜻이었다. 그쪽 안대로 서명했다.", eff: { mental: -3 } } }, { t: "그대로 서명한다", eff: {}, text: "삼 년을 더 받았다. 조건은 그쪽이 정했다." }] }); } }
    // 5) 고정비: 광고 · 월급 · 창고
    if (B.mode >= 2 && B.ad) cost += A.ad[B.ad] * P;
    if (B.staff) { cost += B.staff * A.staff.wage[B.mode - 1] * P; const lack = Math.max(0, careNeed(B) - B.care); if (lack > 0) { let q = 0; for (let i = 0; i < Math.min(B.staff, lack * A.staff.careEach); i++) if (r.chance(A.staff.quitP)) q++; if (q) { B.staff = Math.max(0, B.staff - q); notes.push(`구매대행: 못 챙긴 사이 직원 ${q}명이 그만뒀어요.`); } else { notes.push("구매대행: 이번 달 사람 챙기기가 모자랐어요. 주문 실수가 나왔어요."); } star(B, -0.04 * lack); } }
    if (B.up.wh || B.g.wh) cost += (B.g.wh ? A.gate.rent : A.m3.rent) * P;
    // 6) 심사·등록
    if (B.regT != null && s.t >= B.regT) { B.regT = null; notes.push(toMode2(s) ? "구매대행: 통관 등록이 끝났어요. 주문 대행을 시작해요." : `구매대행: 등록 세 가지가 끝났어요. 운전자금 ${won(A.wc0 * P)}을 넣으면 주문 대행을 시작해요.`); }
    if (B.upT != null && s.t >= B.upT) { B.upT = null; B.up.imp = true; notes.push("구매대행: 수입 신고를 마쳤어요. 다음은 창고예요."); }
    if (B.corpT != null && s.t >= B.corpT) { B.corpT = null; B.g.corp = true; notes.push("구매대행: 법인 이름으로 등록 세 가지를 다시 마쳤어요. 관문 1/4."); log(s, "구매대행을 법인으로 옮겼다.", "work"); }
    // 7) 아이템: 유행·인증 위험·글이 낡는다
    B.posts *= A.postDecay; B.rating += (4.4 - B.rating) * 0.05;
    for (const it of B.items.slice()) { it.age++; if (it.age === it.life - 6) notes.push(`구매대행: ${it.n}의 유행이 식기 시작했어요. 다음 아이템을 찾아 둬요.`); if (it.age === it.life + 1) notes.push(`구매대행: ${it.n}은 이제 거의 안 팔려요.`);
      if (B.mode >= 2 && B.mode < 3 && it.cert > 0.05 && r.chance(it.cert * 0.08)) { const f = Math.round(80 * P); cost += f; B.items = B.items.filter((x) => x !== it); star(B, -0.1); notes.push(`구매대행: ${it.n}이 인증 문제로 판매가 막혔어요. ${won(f)}을 물어냈어요.`); } }
    if (B.mode >= 2 && B.q.length && B.dry) { B.dryM++; notes.push(`구매대행: 운전자금이 바닥나 견적 ${quoted(B)}건의 주문을 못 넣었어요. 다음 달에는 환율이 달라져요.`); }
    if (B.expired) notes.push(`구매대행: 기한이 지난 견적 ${B.expired}건이 취소됐어요.`);
    if (!B.gift && B.mode >= 2 && (s.sj?.rp?.buying?.sen || 0) >= 2 && B.items.length < slots(B)) { // 11-28 선배가 넘겨준 아이템: 경쟁·반품·인증 위험이 낮고 숫자를 다 적어 준다
      const cat = cats(B)[0] || "문구"; let it = mkItem(s, r, cat), g = 0; while (B.items.some((x) => x.n === it.n) && g++ < 6) it = mkItem(s, r, cat);
      it.mg = Math.max(it.mg, 1); it.comp = Math.min(it.comp, 0.3); it.ret = Math.min(it.ret, 0.05); it.cert = 0; it.life = Math.max(it.life, 30); delete it.see; it.from = "c136"; B.items.push(it); B.spec[it.cat] = B.spec[it.cat] || 0; B.gift = s.t + 1;
      const nm = CHAR.c136?.name || "선배"; notes.push(`구매대행: ${nm} 선배가 단골 아이템 하나를 넘겨줬어요. ${it.cat} · ${it.n}. "제 단골이 찾던 물건인데 저는 문구만 해서요. 숫자는 다 적어 놨어요."`); log(s, `선배가 넘겨준 아이템: ${it.n}`, "work"); }
    // 8) 사건
    if (s.t - B.evT >= A.ev.gap && r.chance(A.ev.p) && !scenes.some((x) => x.kind === "event")) { const sc = ev(s, r); if (sc) { B.evT = s.t; scenes.push(sc); } }
    // 9) 정산
    rev = Math.round(rev); cost = Math.round(cost); s.cash += rev - cost + pool; addMoney(s, "inc", "구매대행 수입", rev); addMoney(s, "exp", "구매대행 비용", cost);
    const profit = rev - cost + B.mRev - B.mCost; B.best = Math.max(B.best, B.mOrd); B.ordH = [...(B.ordH || []), B.mOrd].slice(-3); B.best3 = Math.max(...B.ordH);
    B.months++; B.cum += profit; B.last = { profit, paidN, paidFee: Math.round(paidFee), retN, ord: B.mOrd, soldM, stockRev: Math.round(stockRev), pro, clicks: B.clicks || 0, fx: B.fx };
    B.hist.push(profit); if (B.hist.length > 24) B.hist.shift();
    UND.fxNote(s, "buying", B, notes, UND_NOTE); // 11-28 이해도 문턱을 넘은 달에 한 줄(스위치가 꺼져 있으면 아무 일도 안 한다)
    return rev - cost;
  },
  value(s) { const B = s.buying; if (!B) return 0; const h = (B.hist || []).slice(-6), avg = h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; return Math.round((B.wc || 0) + (B.rsv || 0) + tied(B) + stockVal(B) + (B.dep || 0) + (B.flt || 0) * 0.85 + (B.mode >= 4 ? Math.max(0, avg) * 18 : B.mode === 3 ? Math.max(0, avg) * 6 : 0)); },
  passive(s) { const B = s.buying; if (!B || B.mode < 3 || !B.staff) return 0; const h = B.hist.slice(-6); return h.length ? Math.max(0, h.reduce((a, b) => a + b, 0) / h.length) * (B.mode >= 4 ? 0.6 : 0.3) : 0; },
  todos(s) {
    const B = s.buying, t = [], P = pi(s);
    if (B.mode === 1) { if (B.regN >= 3 && B.regT == null) t.push({ lv: 1, text: `구매대행: 운전자금 ${won(BY_BAL.wc0 * P)}을 넣으면 주문 대행을 시작해요` }); else if (B.postN >= BY_BAL.postNeed && B.regT == null) t.push({ lv: 1, text: `구매대행: 등록 세 가지 ${B.regN}/3` }); else if (B.postN < BY_BAL.postNeed) t.push({ lv: 0, text: `구매대행: 비교 글 ${B.postN}/${BY_BAL.postNeed}편` }); return t; }
    if (B.staff && B.care < careNeed(B)) t.push({ lv: 2, text: `구매대행: 사람 챙기기 ${B.care}/${careNeed(B)}` });
    if (B.q.length) t.push(B.wc < orderCost(s) ? { lv: 2, text: `구매대행: 운전자금이 바닥났어요. 견적 ${quoted(B)}건이 기다려요` } : { lv: 2, text: `구매대행: 확정된 견적 ${quoted(B)}건의 주문을 넣어요(이번 달 환율)` });
    if (inqAll(B) >= 5) t.push({ lv: 1, text: `구매대행: 문의 ${inqAll(B)}건에 견적을 보내요` });
    if (B.csN < csNeed(B)) t.push({ lv: 2, text: `구매대행: 배송 문의 답하기 ${B.csN}/${csNeed(B)}` });
    if (!B.bk && !taxHelp(s) && (B.orders.length || B.shipLast)) t.push({ lv: 1, text: "구매대행: 이번 달 정산 대조가 남았어요" });
    if (B.rsv < rsvNeed(s) * 0.6 && inflight(B) > 0) t.push({ lv: 1, text: `구매대행: 환불 준비금이 얇아요(권장 ${won(rsvNeed(s))})` });
    if (!B.items.length || B.items.every((it) => it.age >= it.life - 6)) t.push({ lv: 1, text: "구매대행: 유행이 식어 가요. 다음 아이템을 찾아요" });
    if (B.mode >= 3 && B.items.some((it) => trend(it) > 0.5 && !(it.stock > 0))) t.push({ lv: 1, text: "구매대행: 재고가 떨어진 아이템이 있어요" });
    return t;
  },
  onStop(s) { // 접기: 통장·묶인 돈·보증금은 넣을 때처럼 장부 없이 현금으로 돌아온다. 거래처는 자동으로 정리되고 묶인 물량은 70%, 재고는 값의 60%쯤만 건진다(못 건진 몫은 손실로 적는다)
    const B = s.buying, M = BY_BAL.m4; if (!B) return; const pure = Math.round((B.wc || 0) + (B.rsv || 0) + tied(B) + (B.dep || 0)); s.cash += pure;
    const fltBack = Math.round((B.flt || 0) * M.back), fltLoss = Math.round(B.flt || 0) - fltBack; s.cash += fltBack; if (fltLoss > 0) addMoney(s, "exp", "구매대행 비용", fltLoss);
    const sv = Math.round(B.items.reduce((a, it) => a + (it.stock || 0) * (it.cost || 0), 0)), sGet = Math.round(stockVal(B) * M.stockBack); if (sv > 0) { s.cash += sGet; addMoney(s, "inc", "구매대행 수입", sGet); addMoney(s, "exp", "구매대행 비용", sv); }
    Object.assign(B, { wc: 0, rsv: 0, orders: [], q: [], dep: 0, flt: 0, staff: 0, dl: 0, ad: 0, mode: 1, up: { imp: false, wh: false, cert: false }, upT: null, g: { corp: false, cert: false, wh: false, deal: false }, corpN: 0, corpT: null, proT: null, renewT: null }); for (const it of B.items) { it.stock = 0; it.gray = false; it.inq = 0; } },
  migrate(s, T) { for (const k of ["posts", "postN", "regN", "wc", "rsv", "seq", "deep", "oseq", "done", "sold", "best", "best3", "mOrd", "csN", "unbk", "ad", "staff", "hired", "care", "late", "dryM", "revoked", "shady", "dep", "corpN", "dealT", "flt", "dl", "cutT", "zeroT", "narrowT", "haltT", "pauseT", "months", "cum", "mRev", "mCost", "shipLast"]) if (!Number.isFinite(T[k])) T[k] = 0; if (!(T.bh > 0)) T.bh = 1; if (!(T.fx0 > 0)) T.fx0 = T.fx > 0 ? T.fx : 1; if (!Number.isFinite(T.evT)) T.evT = -99; /* 11-28 예전 저장에 없는 숫자 항목 */
    if (!T.v) T.v = 1; T.items = T.items || []; T.cands = T.cands || []; T.orders = T.orders || []; T.q = T.q || []; T.hist = T.hist || []; T.spec = T.spec || {}; T.up = T.up || { imp: false, wh: false, cert: false }; T.g = T.g || { corp: false, cert: false, wh: false, deal: false }; if (!(T.fx > 0)) T.fx = 1; if (!(T.rating > 0)) T.rating = 4.4; if (!T.mode) T.mode = 1; },
  milestones: [
    { key: "by_first", title: "첫 다섯 건", test: (s) => (s.buying?.done || 0) >= 5, lines: ["주문 다섯 건을 넣었다. 통장에서 내 돈이 먼저 나갔다.", "3주 뒤, 수수료 다섯 건이 한꺼번에 들어왔다."] },
    { key: "by_m40", title: "월 40건", test: (s) => (s.buying?.best || 0) >= 40, lines: ["한 달에 마흔 건을 넣었다.", "주문이 늘수록 통장이 먼저 비었다. 표에 입금 예정일 칸을 하나 더 만들었다."] },
    { key: "by_shop", title: "분야 상점", test: (s) => (s.buying?.mode || 0) >= 3, lines: ["창고에 첫 상자가 들어왔다.", "이제 대신 사 주는 사람이 아니다. 들여와 파는 사람이다."] },
    { key: "by_co", title: "수입 유통사", test: (s) => (s.buying?.mode || 0) >= 4, lines: ["해외 브랜드의 국내 공급 계약서에 서명했다.", "법인 통장에 처음으로 억 단위 숫자가 찍혔다. 대부분 물건값이다."] },
    { key: "by_end_co", end: true, kind: "good", epi: "수입 유통사는 지금도 돌아간다. 새 직원에게는 반품 조건부터 원문으로 읽게 한다.", title: "내 이름으로 들여오는 회사", test: (s) => (s.buying?.mode || 0) >= 4 && (s.buying.dl || 0) >= 8 && s.t - (s.buying.proT ?? s.t) >= 60, lines: ["공급 계약을 맺은 지 다섯 해가 지났다. 거래처는 여덟 곳을 넘었다.", "창고에는 내가 고른 물건만 들어온다."] },
    { key: "by_end_solo", end: true, kind: "good", epi: "회사로 키우지는 않았다. 밤 11시에 통관 번호를 맞추는 일은 지금도 내가 한다.", title: "밤 11시의 주문 표", test: (s) => { const B = s.buying; return !!B && B.mode <= 2 && !B.hired && B.months >= 120 && B.done >= 2000 && B.late <= 6 && !B.revoked; }, lines: ["혼자서 십 년, 이천 건을 넘겼다.", "큰돈은 아니었다. 환불이 늦은 적은 거의 없다."] },
    { key: "by_end_lost", end: true, kind: "bad", epi: "주문은 늘었는데 통장은 비어 있었다. 구매대행은 거기서 멈췄다.", title: "먼저 빈 통장", test: (s) => { const B = s.buying; return !!B && B.months >= 12 && ((B.revoked || 0) >= 1 || ((B.dryM || 0) >= 10 && (B.late || 0) >= 4)); }, lines: ["운전자금이 바닥난 달이 열 번, 늦은 환불이 네 번을 넘었다.", "남은 것은 신고 내역과 못 넣은 견적이었다."] },
  ],
  synergy: [
    { id: "by_insta", kind: "good", n: "구매대행 × 인별", need: "구매대행 + 인별", desc: "개봉 사진이 비교 글을 읽게 해요(문의 +)", test: (s) => !!s.sj?.active?.includes("buying") && !!s.sj?.active?.includes("insta") },
    { id: "by_night", kind: "bad", n: "밤 11시 주문 × 회사", need: "구매대행 + 회사 다니는 중", desc: "해외 시간에 맞춰 밤에 주문을 넣어요. 주문을 넣은 달은 스태미너가 더 들어요", test: (s) => !!s.sj?.active?.includes("buying") && emp(s) && (s.buying?.mode || 0) >= 2 },
  ],
};
