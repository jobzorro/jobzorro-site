// 기존 투잡 '무인카페' 이야기 보강(engine/story/README.md). 상태 s.sx.ucafe
// 11-23: 다른 투잡·엔진 사건과 틀이 겹치던 u05(회의 중 전화)·u14(건너편 저가커피)를 빼고 무인카페에서만 생기는 일 u24(정전)·u25(원두 납품 펑크)·u27(0원 키오스크)을 넣었다(24개).
// 기획: 투잡연구소 unmanned.json(이벤트 16개 중 15개 + 새로 지은 8개 = 23개). 원래 엔진 ucEvent(먹튀·10대 아지트·얼음 기계·맘카페 후기)와 겹치지 않게.
// 단계(기획 levels): 1 셔터 올린 날(개업, 기존 uc_open) → 2 동네 단골(월매출 300만 3달 + 리뷰 30) → 3 흑자 사장님(월매출 450만·순익 150만)
//   → 4 2호점 → 5 무인 체인 오너(합산 월매출 1,000만). 원래 엔진에 단계가 없어서 여기서 플래그(f2~f5)로 센다.
import * as D from "../defs.js";
import { addMoney, log, won, jo } from "../core.js";
import * as SYN from "../syn.js";
import * as UC from "../ucafe.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const on = (s, k) => !!s.sj?.active?.includes(k);
const company = (s) => !!s.co && !(s.co.quit || s.co.fired);
const TAG = "무인카페";

const DEF = () => ({
  v: 1, seen: [], evT: -99, n: 0, months: 0, reviews: 0, run3: 0, f2: false, f3: false, f4: false, f5: false, summer: false,
  cum: 0, inv0: 0, fullQ: 0, blackM: 0, fran: false, franT: -1, study: [], icecup: false, dessert: [], helper: false, turn: {}, moldN: 0, thief: 0,
});

// 장면 대상 매장: 장면에 적어 둔 매장 → 없으면 첫 매장
const target = (s) => { const U = s.uc, id = s.pending?.ucsSid; return U.stores.find((x) => x.id === id) || U.stores[0] || null; };
// 무인카페 돈: 장부 이름을 원래 엔진과 같게 쓰고, 월 기록(hist)에도 더해 연 이익·엔딩 판정이 맞게
function money(s, st, v, out, label) {
  if (!v) return; const U = s.uc;
  s.cash += v; addMoney(s, v > 0 ? "inc" : "exp", v > 0 ? "무인카페 매출" : "무인카페 비용", Math.abs(v));
  if (st && st.hist.length) st.hist[st.hist.length - 1] += v;
  if (U.hist.length) U.hist[U.hist.length - 1] += v;
  if (out) out.push(`${label || "무인카페"} ${v > 0 ? "+" : "−"}${won(Math.abs(v))}`);
}
// 이벤트 돈 기준: 최근 6달 무인카페 월 이익(만원). 효과는 이 값의 10~30%
function base(s) { const h = s.uc.hist.slice(-6), pi = SYN.pi(s); const a = h.length ? h.reduce((x, y) => x + y, 0) / h.length : 0; return clamp(a, 100 * pi, 350 * pi); }

// ───────── 이벤트 24개 ─────────
function evList(s) {
  const X = s.sx.ucafe, U = s.uc, pi = SYN.pi(s), B = base(s), n = U.stores.length;
  const first = U.stores[0], newest = U.stores[n - 1];
  const prof = (st) => (st?.last ? st.last.rev - st.last.cost : 0);
  const worst = n ? U.stores.slice().sort((a, b) => prof(a) - prof(b))[0] : null;
  const dirty = U.stores.find((st) => !U.agent && st.months >= 3 && st.last && st.last.q < 0.5);
  const redRent = U.stores.find((st) => st.machine === "rent" && st.months >= 6 && st.hist.length >= 5 && st.hist.slice(-5).every((x) => x < 0));
  const office = U.stores.find((st) => st.ak === "office") || first;
  const old24 = U.stores.find((st) => st.months >= 24 && st.months < 36 && !st.ucsRenew); // 36달째는 space.js 가 +5% 하고 닫는다(같은 달에 둘 다 오르지 않게)
  const late = X.f3 || (first && first.months >= 12);
  const rentW = won(Math.round(UC.UC_BAL.rental * pi));
  const nm = (st) => st?.name || "매장";
  const co = company(s);
  return [
    // ── 초반: 계약 전 ──
    { id: "u01", ph: "early", must: true, ok: () => n === 0, t: "번화가냐 아파트 앞이냐",
      x: "부동산 사장님이 매물 두 개를 내민다. 권리금 없는 2,000세대 아파트 앞 B급 상가, 그리고 유동인구 많은 번화가 1층. 번화가는 월세가 두 배에 권리금도 1,500만 원이다.",
      c: [{ t: "아파트 앞 B급 상가를 본다", eff: {}, text: "아침 테이크아웃, 학원 픽업 대기. 매출은 작아도 흔들리지 않는 자리다." },
          { t: "번화가 1층에 건다", eff: {}, text: "낮엔 대형 카페가 손님을 쓸어 가고 밤엔 한산하다. 숫자는 크고, 위험도 크다." }] },
    { id: "u02", ph: "early", must: true, ok: () => n === 0 && X.seen.includes("u01"), t: "월 순익 200 보장",
      x: "가맹 설명회 상담사가 웃으며 말한다. \"이 자리면 월 200은 그냥 나옵니다.\" 시뮬레이션 표에는 월세·렌탈료·카드수수료 칸이 비어 있다.",
      c: [{ t: "정보공개서의 평균 매출·폐점률을 직접 뜯어본다", eff: { stat: { num: 1 }, ap: -1 }, text: "평균 매출 옆에 폐점률이 적혀 있었다. 표에 없던 칸을 채워 보니 200이 아니라 90이었다. 개인 창업으로 간다." },
          { t: "그 자리에서 가맹 계약금을 건다", eff: { ucs_cash: -Math.round(30 * pi) }, text: "간판·지도 등록·원두 발주는 본사가 해 준다. 대신 매장마다 로열티·유지보수가 매달 붙는다." }] },
    // ── 초반: 개업 직후 ──
    { id: "u03", ph: "early", must: true, sid: newest?.id, ok: () => n >= 1 && newest.months <= 2 && n === 1, t: "100원 커피의 날",
      x: `${nm(newest)} 오픈 첫날. 아메리카노 100원, 전단지 2,000장을 아파트에 돌렸다. 아침 8시, 줄이 가게 밖까지 늘어섰다. 키오스크 앞에서 어르신이 "이거 어떻게 해요?" 하고 돌아본다.`,
      c: [{ t: `${co ? "연차를 내고 " : ""}하루 종일 매장에서 사용법을 안내한다`, eff: { hp: -8, ucs_cash: -Math.round(B * 0.15), ucs_rating: 0.15, ucs_rev: 8, ucs_buzz: 15, ...(co ? { eye: 2 } : {}) }, text: "300잔. 목이 쉬었다. '사장님이 친절해요' 리뷰가 여덟 개 달렸다." },
          { t: "CCTV로만 지켜본다", eff: { ucs_cash: -Math.round(B * 0.15), ucs_rating: -0.1, ucs_rev: 2 }, text: "화면 속 키오스크 앞에 줄이 엉켰다. '결제가 어려워요' 리뷰가 먼저 달렸다." }] },
    { id: "u04", ph: "early", sid: first?.id, ok: () => n >= 1 && first.months >= 1 && first.months <= 5 && X.reviews < 30, t: "리뷰 30개 작전",
      x: `목표는 오픈 한 달 안에 지도 리뷰 30개. 키오스크 옆에 QR 코드를 붙였다. 지금 리뷰는 ${Math.max(1, Math.round(X.reviews))}개, 그중 하나는 엄마다.`,
      c: [{ t: "리뷰 쓰면 아메리카노 무료 쿠폰을 준다", eff: { ucs_cash: -Math.round(B * 0.1), ucs_rev: 12, ucs_buzz: 10, item: "m_receipt" }, text: "쿠폰 40장이 나갔다. '쿠폰 받으러 왔다가 단골 됐어요.'" },
          { t: "지인 단톡방에 리뷰를 부탁한다", check: { stat: "talk", dc: 40 }, ok: { text: "동창 단톡방이 의외로 뜨거웠다. '나 거기 매일 가' 거짓말도 섞였다.", eff: { ucs_rev: 8, family: -1 } }, ng: { text: "읽고 답 없는 사람 23명. 이모만 별 다섯 개를 줬다.", eff: { ucs_rev: 3, family: -4 } } }] },
    // ── 중반 ──
    { id: "u27", ph: "mid", sid: first?.id, ok: () => n >= 1 && first.months >= 2, t: "전 메뉴 0원",
      x: `아침 6시, ${nm(first)} 매출 알림이 이상하다. 밤사이 판매 41잔, 매출 0원. 새벽 2시 키오스크 원격 업데이트 뒤로 모든 메뉴가 0원으로 떠 있었다. CCTV 속 손님들은 한 잔 뽑고, 전화를 걸고, 친구를 불렀다.`,
      c: [{ t: "'어젯밤은 깜짝 무료의 날이었습니다' 공지를 붙인다", eff: { ucs_cash: -Math.round(B * 0.1), ucs_buzz: 15 }, text: "원두값만 날렸다. 동네 단톡방에 '거기 사장님 쿨하다'가 돌았다." },
          { t: "키오스크 업체에 손실을 물어내라고 한다", check: { stat: "talk", dc: 50 }, ok: { text: "업체가 41잔 값을 다음 달 유지보수비에서 빼 주기로 했다.", eff: { mental: 2 } }, ng: { text: "\"약관 14조, 설정 확인은 점주 책임입니다.\" 전화만 40분 했다.", eff: { ucs_cash: -Math.round(B * 0.1), mental: -4 } } }] },
    { id: "u06", ph: "mid", sid: first?.id, ok: () => n >= 1 && first.months >= 2 && ["univ", "academy", "apt", "newtown"].includes(first.ak), t: "아메리카노 한 잔, 여섯 시간",
      x: "새벽 3시 CCTV. 노트북 하나가 2,000원짜리 아메리카노 한 잔으로 여섯 시간째 자리를 지키고 있다. 콘센트 세 개도 같이 점령당했다.",
      c: [{ t: "장시간 이용 안내문을 붙인다", eff: { mental: 1 }, text: "'2시간 이후엔 추가 주문 부탁드려요.' 반은 지키고 반은 못 본 척한다." },
          { t: "아예 '24시 조용한 공부 카페'로 간다", eff: { ucs_buzz: 10 }, text: "1인석과 콘센트를 늘렸다. 시험 기간엔 새벽에도 주문이 들어온다. 전기료도 같이 오른다." },
          { t: "콘센트 전원을 꺼 버린다", eff: { ucs_rating: -0.1, mental: 2 }, text: "속은 시원했다. 리뷰에 '콘센트 막아 둔 카페'가 박혔다." }] },
    { id: "u07", ph: "mid", must: true, rep: true, sid: dirty?.id, ok: () => !!dirty, t: "머신 속 곰팡이",
      x: `야근 일주일, ${nm(dirty)}에 한 번도 못 갔다. 새 리뷰 하나. '커피에서 걸레 맛이 나요.' 별은 하나다.`,
      c: [{ t: "주말을 통째로 써서 분해세척하고 사과 답글을 단다", eff: { hp: -14, ucs_clean: 50, ucs_rating: 0.1, stat: { hands: 1 } }, text: "추출부를 열자 검은 점이 보였다. 네 시간을 닦았다. 답글 끝에 '매주 화·금 세척 사진을 올리겠습니다'." },
          { t: "바빠서 다음 주로 미룬다", eff: { ucs_rating: -0.3, ucs_buzz: -20 }, text: "다음 주엔 리뷰가 세 개 더 늘었다. 전부 별 하나." }] },
    { id: "u08", ph: "mid", sid: first?.id, ok: () => n >= 1 && first.months >= 5 && !X.dessert.length, t: "디저트 냉장고 위탁",
      x: "동네 빵집 사장님이 찾아왔다. \"무인 냉장고에 쿠키랑 조각 케이크 넣어 볼래요? 팔리면 30% 드릴게요. 남은 건 제가 가져가고요.\" 유통기한 확인은 내 몫이다.",
      c: [{ t: "중고 쇼케이스 냉장고를 들인다", eff: { ucs_cash: -Math.round(30 * pi) }, text: "아메리카노 옆에 쿠키가 놓이자 한 번에 쓰는 돈이 올랐다. 냉장고 소리가 밤새 웅웅댄다." },
          { t: "커피에만 집중한다", eff: {}, text: "관리할 게 하나 줄었다. 빵집 사장님은 옆 동네 무인카페로 갔다." }] },
    { id: "u09", ph: "mid", sid: first?.id, ok: () => n >= 1 && [5, 6].includes(s.cal) && !X.icecup, t: "얼음컵 주세요",
      x: "문의 전화에 손님이 묻는다. \"얼음만 담긴 컵은 없나요? 편의점 커피 부어 마시게요.\" 메뉴판에 없던 항목이다. 7월이 코앞이다.",
      c: [{ t: "당장 얼음컵(500원)을 메뉴에 넣는다", eff: { ucs_rating: 0.05 }, text: "키오스크에 버튼 하나 추가. 제빙기는 쉴 틈이 없어졌다." },
          { t: "제빙기 용량이 걱정돼 넘긴다", eff: {}, text: "그 손님은 길 건너 편의점으로 갔다." }] },
    { id: "u17", ph: "mid", sid: first?.id, ok: () => X.fran && n >= 1 && first.months >= 6, t: "상담사의 표에는 없던 칸",
      x: `여섯 달 정산. 상담사가 말한 월 200은 어디에도 없다. 지난달 ${nm(first)} 순익 ${won(Math.round(prof(first)))}. 로열티, 렌탈료, 카드수수료… 시뮬레이션 표에서 비어 있던 칸들이다.`,
      c: [{ t: "본사 슈퍼바이저에게 점포 진단을 요구한다", check: { stat: "talk", dc: 45 }, ok: { text: "슈퍼바이저가 와서 메뉴판 위치와 조명을 바꿨다. 의외로 효과가 있었다.", eff: { ucs_buzz: 20, ucs_rating: 0.05, item: "m_mug" } }, ng: { text: "\"점주님 관리 문제예요.\" 그 말만 듣고 끝났다.", eff: { mental: -5 } } },
          { t: "엑셀을 다시 짠다", eff: { stat: { num: 1 }, mental: -2 }, text: "손익분기 월매출 308만. 지난달은 290만이었다." }] },
    { id: "u18", ph: "mid", sid: office?.id, ok: () => n >= 1 && office.months >= 2 && ([1, 2, 9, 10].includes(s.cal)), t: "명절 연휴의 텅 빈 가게",
      x: `${nm(office)}. 연휴 닷새 동안 ${office?.ak === "office" ? "오피스 거리엔 비둘기만 다닌다" : "동네가 텅 비었다. 다들 고향에 갔다"}. 그 사이 냉장고 우유 유통기한이 지나간다.`,
      c: [{ t: "연휴 첫날 들러 우유·소모품을 빼 둔다", eff: { hp: -5, family: -2 }, text: "고향 가는 길에 들렀다. 엄마 전화를 세 번 놓쳤다." },
          { t: "그냥 둔다", eff: { ucs_cash: -Math.round(B * 0.1), ucs_rating: -0.05 }, text: "우유 열두 팩 폐기. 연휴 끝 첫 손님이 '라떼가 시큼해요'." }] },
    { id: "u21", ph: "mid", sid: first?.id, ok: () => n >= 1 && s.cal === 7 && first.months >= 2, t: "장마철 그라인더",
      x: `장마 3주째. ${nm(first)} 그라인더 안 원두가 눅눅해져 추출이 뚝뚝 끊긴다. 바닥엔 우산 물이 고였다.`,
      c: [{ t: "제습기와 우산 비닐을 들인다", eff: { ucs_cash: -Math.round(B * 0.15), ucs_rating: 0.05, ucs_clean: 15 }, text: "제습기 물통이 하루에 두 번 찬다. 커피 맛이 돌아왔다." },
          { t: "장마 끝날 때까지 버틴다", eff: { ucs_rating: -0.1 }, text: "'커피가 밍밍해요', '바닥 미끄러워요' 리뷰 두 개." }] },
    { id: "u22", ph: "mid", sid: first?.id, ok: () => n >= 1 && first.months >= 5, t: "방명록 노트",
      x: `${nm(first)} 구석에 둔 방명록 노트가 다 찼다. '시험 끝났어요!', '퇴근길에 여기 들르는 게 낙이에요', 그리고 맨 끝 장: '사장님 얼굴 한번 보고 싶어요.'`,
      c: [{ t: "단골 감사 쿠폰 100장을 건다", eff: { ucs_cash: -Math.round(B * 0.1), ucs_buzz: 15, mental: 4 }, text: "쿠폰이 이틀 만에 동났다. 방명록 2권째가 시작됐다." },
          { t: "방명록 사진을 지도 리뷰 답글에 올린다", eff: { ucs_rev: 5, mental: 2 }, text: "'사장님도 사람이었네요' 댓글이 달렸다." }] },
    { id: "u23", ph: "mid", sid: first?.id, ok: () => n >= 1 && first.months >= 3, t: "보건소 위생 점검",
      x: "보건소 문자. '다음 주 관내 무인점포 일제 위생 점검: 제빙기 내부, 유통기한 표시, 영업신고증 게시.' 제빙기 안은 석 달째 못 열어 봤다.",
      c: [{ t: "밤에 가서 제빙기까지 분해 청소한다", eff: { hp: -8, ucs_clean: 30, stat: { hands: 0.5 } }, text: "점검관이 제빙기 안을 손전등으로 비췄다. \"깨끗하네요.\"" },
          { t: "평소대로 둔다", check: { stat: "hands", dc: 40 }, ok: { text: "무사 통과. 심장이 쫄깃했다.", eff: {} }, ng: { text: "유통기한 지난 시럽 한 병. 과태료 고지서가 왔다.", eff: { ucs_cash: -Math.round(B * 0.2), ucs_rating: -0.05 } } }] },
    // ── 후반 ──
    { id: "u10", ph: "late", sid: first?.id, ok: () => n === 1 && first.months >= 12 && X.cum > 0, t: "2호점 매물",
      x: "1호점이 겨우 누적 흑자로 돌아섰다. 옆 동네 아파트 상가에 저가커피 없는 공실이 나왔다. 두 매장 합쳐 월 1,000만 원이라는 숫자가 머리에 맴돈다. 새벽 동선은 두 배가 된다.",
      c: [{ t: "2호점 매물을 잡으러 간다", eff: {}, text: "부동산에 연락처를 남겼다. 매물 목록에 올라왔다." },
          { t: "1호점 효율부터 올린다", eff: { ucs_clean: 20, stat: { num: 0.5 } }, text: "원가표를 다시 짰다. 컵 홀더 단가를 개당 12원 깎았다." }] },
    { id: "u11", ph: "late", ok: () => n >= 2 && !U.agent && !X.helper, t: "청소 알바를 쓸까",
      x: "매장이 둘이 되자 아침마다 걸레질이 두 번이다. 손목이 시큰거린다. 동네 구인 앱에 '하루 1시간 청소, 시급 1만 2천 원' 공고를 쓸까 고민한다.",
      c: [{ t: "청소 알바를 쓰고 재고·정산만 본다", eff: {}, text: "대학생 알바가 왔다. 첫 주 사진 보고는 꼼꼼했다. 둘째 주엔 어제 사진과 똑같은 사진이 왔다." },
          { t: "끝까지 직접 한다", eff: { hp: -6, ucs_clean: 15, ucs_all: 1, ...(co ? { eye: 2 } : {}) }, text: "새벽 5시 반 알람. 회의 시간에 하품이 나왔다." }] },
    { id: "u12", ph: "late", ok: () => n === 1 && late, t: "무인카페 양도합니다",
      x: `자영업자 커뮤니티에 폐업 매물이 올라왔다. 머신·인테리어 포함 ${won(Math.round(3500 * pi))}. 새로 차리면 두 배다. 사진 속 머신에는 자동세척 기능이 없다.`, price: Math.round(3500 * pi),
      c: [{ t: "싸게 인수해 내 방식으로 되살린다", eff: {}, text: "열쇠를 받았다. 그라인더 안에 석 달 묵은 원두가 굳어 있었다." },
          { t: "구형 머신은 안 된다며 넘긴다", eff: { stat: { num: 1 } }, text: "고장 수리비가 권리금보다 무섭다는 걸 이제 안다." }] },
    { id: "u19", ph: "late", rep: true, sid: old24?.id, ok: () => !!old24, t: "건물주의 재계약 통보",
      x: `${nm(old24)} 2년 계약이 끝났다. 재계약 도장을 찍기 전에 건물주 문자가 왔다. '주변 시세 반영해서 월세 12% 올리겠습니다.' 지금 월세 ${won(old24?.rent || 0)}. 인테리어에 들인 돈이 생각나 쉽게 나갈 수가 없다.`,
      c: [{ t: "12% 인상을 받아들인다", eff: {}, text: "월세 자동이체 금액을 고쳤다." },
          { t: "오래 있겠다며 인상 폭을 협상한다", check: { stat: "talk", dc: 50 }, ok: { text: "\"공실 나는 것보단 낫죠.\" 5% 인상으로 합의했다.", eff: {} }, ng: { text: "\"싫으면 나가셔도 돼요.\" 결국 12%.", eff: { mental: -4 } } },
          { t: "나간다(양도 매물로 내놓는다)", eff: { mental: -3 }, text: "보증금을 돌려받고 열쇠를 반납했다." }] },
    // ── 위기 ──
    { id: "u13", ph: "crisis", rep: true, sid: worst?.id, ok: () => n >= 1 && first.months >= 4, t: "자동문에 갇힌 도둑",
      x: `새벽 2시, ${nm(worst)} 침입 알림이 울렸다. 원격으로 문을 잠갔더니 도둑이 매장 안에 갇혔다. 경찰이 오는 동안 도둑은 공짜 커피를 한 잔 뽑았다. 키오스크 현금함은 뜯겨 있었다.`,
      c: [{ t: "신고하고 보험 처리한다", eff: { ucs_cash: -Math.round(B * 0.12), mental: -3, ucs_buzz: 15 }, text: "자기부담금만 냈다. 동네 단톡방에 '도둑 가둔 카페'가 돌았다." },
          { t: "이참에 CCTV·경보 장치를 업그레이드한다", eff: { ucs_cash: -Math.round(B * 0.3), ucs_cctv: 1, mental: -1 }, text: "AI 경보·비상벨·보안업체 출동. 밤에 알림이 울려도 덜 놀란다." }] },
    { id: "u24", ph: "crisis", sid: worst?.id, ok: () => n >= 1 && first.months >= 6, t: "토요일 정전 공지",
      x: `${nm(worst)} 건물 관리인 문자. '토요일 09~15시 변전실 점검으로 전체 정전.' 냉장고 우유, 제빙기 얼음이 여섯 시간을 못 버틴다. 전기가 돌아와도 키오스크와 머신은 누가 버튼을 눌러 줘야 켜진다.`,
      c: [{ t: "토요일에 매장을 지킨다. 우유를 옮기고 전기 들어오면 바로 켠다", eff: { hp: -8, ucs_cash: -Math.round(B * 0.08) }, text: "아이스박스 두 개에 우유를 담았다. 3시 2분, 머신 예열 버튼을 눌렀다." },
          { t: "'임시 휴무' 공지만 원격으로 띄운다", eff: { ucs_cash: -Math.round(B * 0.2), ucs_rating: -0.05 }, text: "전기는 3시에 돌아왔다. 키오스크는 월요일 아침까지 꺼져 있었다. 우유 한 상자를 버렸다." },
          { t: "발전기를 빌려 머신과 냉장고만 돌린다", check: { stat: "hands", dc: 45 }, ok: { text: "건물에서 커피 나오는 곳이 여기뿐이었다. 점검 기사들까지 줄을 섰다.", eff: { ucs_cash: Math.round(B * 0.1), ucs_buzz: 10, shard: 1 } }, ng: { text: "전기가 돌아오는 순간 차단기가 튀었다. 머신 기판이 나갔다.", eff: { ucs_cash: -Math.round(B * 0.3), mental: -4 } } }] },
    { id: "u25", ph: "crisis", sid: first?.id, ok: () => n >= 1 && first.months >= 4, t: "원두가 안 왔다",
      x: `거래하던 로스터리에서 전화가 왔다. "로스터기가 고장 나서 이번 주 납품을 못 합니다." ${nm(first)} 호퍼에 남은 원두는 이틀 치. 무인카페는 '품절' 한 줄이 뜨면 손님이 그냥 돌아선다.`,
      c: [{ t: "퀵으로 다른 로스터리 원두를 받는다", eff: { ucs_cash: -Math.round(B * 0.15), stat: { num: 0.5 } }, text: "퀵비에 소량 단가까지 비쌌다. 대신 공급처 연락처가 두 개가 됐다." },
          { t: "마트 원두로 며칠 버틴다", eff: { ucs_rating: -0.08 }, text: "그라인더 굵기를 다시 맞출 시간은 없었다. '오늘 커피 왜 이래요' 리뷰 하나." },
          { t: "아메리카노에 '품절'을 띄우고 아이스티·초코만 판다", eff: { ucs_cash: -Math.round(B * 0.1), ucs_buzz: -5 }, text: "나흘 동안 커피 없는 카페였다. 아침 손님 절반이 문 앞에서 돌아섰다." }] },
    { id: "u15", ph: "crisis", must: true, sid: redRent?.id, ok: () => !!redRent, t: "머신 렌탈료",
      x: `다섯 달째 ${jo(nm(redRent), "이", "가")} 적자다. 매출이 기대의 절반이다. 5년 약정 머신 렌탈료 ${rentW}은 어김없이 빠져나간다. 통장 잔고는 월세 두 달 치.`,
      c: [{ t: "상권 분석을 다시 하고 메뉴·가격을 손본다", eff: { mental: -5, stat: { num: 1 } }, text: "점심 대신 아침 7시 출근길을 노렸다. 메뉴 18개를 9개로 줄였다." },
          { t: "위약금을 물고 매장을 정리한다", eff: { mental: -1 }, text: "남은 약정의 일부를 위약금으로 냈다. 마지막 날 얼음통을 비우고 나왔다." }] },
    { id: "u16", ph: "crisis", ok: () => X.fran && n >= 1 && s.t - X.franT >= 12, t: "본사가 사라졌다",
      x: "아침 뉴스에 내가 가맹한 무인카페 본사의 정보공개서가 취소됐다는 소식이 떴다. 원두 발주 앱은 '점검 중'. 재고는 일주일 치.",
      c: [{ t: "개인 원두 공급처를 뚫고 독립 매장으로 간다", eff: { ucs_cash: -Math.round(B * 0.2), stat: { num: 1, mkt: 0.5 } }, text: "로스터리 세 곳에서 샘플을 받았다. 공급처를 두 곳으로 나눴다. 로열티도 사라졌다." },
          { t: "다른 브랜드로 간판을 바꾼다", eff: { ucs_cash: -Math.round(B * 0.3), mental: -4, ucs_buzz: 15, ucs_all: 1 }, text: "새 간판, 새 가맹비. 로열티는 그대로다." }] },
    { id: "u20", ph: "crisis", must: true, ok: () => n >= 1 && U.beanUp >= 5, t: "원두값 급등",
      x: "국제 원두값이 뛰었다. 거래처 문자: '다음 달부터 kg당 4,000원 인상.' 잔당 원가가 35% 올랐다. 주변 저가 커피는 아직 2,000원이다.",
      c: [{ t: "아메리카노를 200원 올린다", eff: { ucs_price: 0.02, ucs_rating: -0.05, ucs_all: 1 }, text: "\"여기도 올랐네.\" 투덜대도 대부분 결제는 한다." },
          { t: "가격은 그대로 버틴다", eff: { ucs_buzz: 10, ucs_all: 1, mental: -2 }, text: "'가격 안 올린 착한 카페' 글이 맘카페에 올라왔다. 마진은 얇아졌다." },
          ...(U.stores.some((st) => st.bean) ? [{ t: "가성비 원두로 내린다", eff: { ucs_bean0: 1 }, text: "원가는 지켰다. 단골 하나가 '맛이 변했어요'라고 남겼다." }] : [])] },
  ];
}

function pickEvent(s, r, scenes) {
  const X = s.sx.ucafe;
  if (scenes.some((x) => x.tag === TAG)) return null; // 원래 엔진 이벤트가 뜬 달엔 쉰다
  const L = evList(s).filter((e) => { try { return e.ok(); } catch (x) { return false; } });
  const fresh = L.filter((e) => !X.seen.includes(e.id));
  let e = null;
  // 꼭 그때 나와야 하는 것: 계약 전 2개, 개업 첫날, 곰팡이(관리 공백), 렌탈 적자, 원두값 급등. 곰팡이는 다시 방치하면 4달 뒤 또
  const must = fresh.find((x) => x.must) || (s.t - X.evT >= 4 ? L.find((x) => x.id === "u07") : null);
  if (must && s.t - X.evT >= 1 && (s.t - X.evT >= 2 || ["u01", "u02", "u03"].includes(must.id))) e = must;
  if (!e && fresh.length && s.t - X.evT >= 2 && scenes.length < 2 && r.chance(0.3)) {
    const ord = { early: 0, mid: 1, crisis: 1, late: 2 }, lo = Math.min(...fresh.map((x) => ord[x.ph]));
    e = r.pick(fresh.filter((x) => ord[x.ph] <= lo + 1));
  }
  if (!e && !fresh.length && s.t - X.evT >= 3 && r.chance(0.06)) { const rp = L.filter((x) => x.rep); if (rp.length) e = r.pick(rp); }
  if (!e) return null;
  if (!X.seen.includes(e.id)) X.seen.push(e.id);
  X.evT = s.t; X.n++;
  return { kind: "event", tag: TAG, title: e.t, text: e.x, onChoose: "ucs_ev", ucsId: e.id, ucsSid: e.sid || null, ucsPrice: e.price || 0, choices: e.c };
}

// ───────── 이야기 쪽 매달 처리(원래 엔진 month 다음) ─────────
function month(s, r, notes, scenes) {
  const X = s.sx.ucafe, U = s.uc, pi = SYN.pi(s);
  X.months++;
  const n = U.stores.length;
  if (n) {
    if (!X.inv0) X.inv0 = U.stores[0].invested || 0;
    X.cum += U.hist[U.hist.length - 1] || 0;
    let maxRev = 0, sumRev = 0, black = false;
    for (const st of U.stores) {
      if (!st.last) continue;
      const L = st.last; maxRev = Math.max(maxRev, L.rev); sumRev += L.rev;
      // 지도 리뷰: 판매량과 별점에 비례
      X.reviews += Math.max(0, L.cups / 700 * (st.rating - 3.4)) * (SYN.on(s, "ucs_insta") ? 1.2 : 1);
      if (!U.agent && L.q >= 1) X.fullQ++;
      if (L.rev >= 450 * pi && L.rev - L.cost >= 150 * pi) black = true;
      if ([7, 8].includes(s.cal) && L.cups >= 3500) X.summer = true;
      // 가맹 매장: 첫 달 본사 간판·지도 등록 효과
      if (!st.ucsSeen) { st.ucsSeen = 1; if (X.fran) st.buzz = (st.buzz || 0) + 30; }
    }
    X.run3 = maxRev >= 300 * pi ? X.run3 + 1 : 0;
    if (X.run3 >= 3 && X.reviews >= 30) X.f2 = true;
    if (black && X.f2) X.f3 = true; // 흑자 사장님은 동네 단골 다음
    if (n >= 2) X.f4 = true;
    if (n >= 2 && sumRev >= 1000 * pi) X.f5 = true;
    if ((U.hist[U.hist.length - 1] || 0) > 0) X.blackM++;

    // 이야기로 생긴 것들(선택의 결과)
    if (X.fran) money(s, null, -Math.round(22 * pi * n), null), notes.push(`무인카페 가맹 로열티·유지보수 −${won(Math.round(22 * pi * n))}`);
    for (const st of U.stores) {
      const L = st.last; if (!L) continue;
      if (X.study.includes(st.id)) money(s, st, Math.round(L.rev * 0.035 - 6 * pi));
      if (X.icecup && [6, 7, 8].includes(s.cal)) money(s, st, Math.round(L.rev * 0.03));
      if (X.dessert.includes(st.id)) { if (r.chance(0.1)) { money(s, st, -Math.round(8 * pi)); notes.push(`${st.name}: 유통기한 지난 케이크 폐기`); } else money(s, st, Math.round(10 * pi)); }
      if ((X.turn[st.id] || 0) > s.t) st.buzz = Math.min(100, (st.buzz || 0) + 8);
      if (st.old && !st.broken && r.chance(0.07)) { const fix = Math.round(r.int(40, 100) * pi); st.broken = 1; money(s, st, -fix); notes.push(`${st.name}: 인수한 구형 머신이 또 멈췄다. 수리비 ${won(fix)}`); }
      if (SYN.on(s, "ucs_insta")) st.buzz = Math.min(100, (st.buzz || 0) + 5);
      if (SYN.on(s, "ucs_ab")) st.clean = Math.min(100, (st.clean || 0) + 10);
    }
    // 청소 알바: 매장당 월 25만, 다음 달 점검 +0.5(10%는 안 온다)
    if (X.helper && !U.agent) {
      const c = Math.round(25 * pi * n); money(s, null, -c);
      if (r.chance(0.1)) notes.push("청소 알바가 이번 주 연락이 안 됐다. 새벽 걸레질은 다시 내 몫");
      else for (const st of U.stores) st.ap += 0.5;
    }
  }
  const ev = pickEvent(s, r, scenes); if (ev) scenes.push(ev);
}

// 그 매장 닫기(위약금 포함)
function closeStore(s, st, pen, out) {
  if (!st) return;
  const res = UC.close(s, st.id); if (res?.msg) out.push(res.msg);
  if (pen) { s.cash -= pen; addMoney(s, "exp", "무인카페 비용", pen); out.push(`위약금 −${won(pen)}`); }
}

export default {
  key: "ucafe",
  prefix: "ucs_",
  init: () => DEF(),
  month,
  eff(s, e, out) {
    const U = s.uc; if (!U) return;
    const st = target(s), all = e.ucs_all ? U.stores : st ? [st] : [];
    if (e.ucs_cash) money(s, st, e.ucs_cash, out);
    if (e.ucs_rating && all.length) { for (const x of all) x.rating = clamp(x.rating + e.ucs_rating, 3.2, 4.95); out.push(`무인카페 별점 ${e.ucs_rating > 0 ? "+" : "−"}${Math.abs(e.ucs_rating)}`); }
    if (e.ucs_buzz && all.length) { for (const x of all) x.buzz = clamp((x.buzz || 0) + e.ucs_buzz, 0, 100); out.push(`동네 입소문 ${e.ucs_buzz > 0 ? "+" : "−"}${Math.abs(e.ucs_buzz)}`); }
    if (e.ucs_clean && all.length) { for (const x of all) x.clean = clamp((x.clean || 0) + e.ucs_clean, 0, 100); out.push(`청결 +${e.ucs_clean}`); }
    if (e.ucs_price && all.length) { for (const x of all) UC.setPrice(s, x.id, x.price + e.ucs_price); out.push(`한 잔 가격 ${e.ucs_price > 0 ? "+" : "−"}${Math.round(Math.abs(e.ucs_price) * 10000)}원`); }
    if (e.ucs_cctv && st && !st.cctv) { st.cctv = true; out.push(`${st.name} CCTV·미결제 경보 설치`); }
    if (e.ucs_bean0) { for (const x of U.stores) x.bean = 0; out.push("원두: 가성비로 변경"); }
    if (e.ucs_rev && s.sx?.ucafe) { s.sx.ucafe.reviews += e.ucs_rev; out.push(`지도 리뷰 +${e.ucs_rev}`); }
  },
  choose: {
    ucs_ev(s, r, i, ok) {
      const X = s.sx.ucafe, U = s.uc, sc = s.pending || {}, id = sc.ucsId, pi = SYN.pi(s), out = [];
      const st = U.stores.find((x) => x.id === sc.ucsSid) || null;
      if (id === "u01") {
        const ak = i === 0 ? "apt" : "univ", L = UC.search(s, r, ak)[0];
        if (i === 0) { L.key = 0; L.comp = Math.max(0, L.comp - 1); L.memo = "권리금 0원 B급 상가"; }
        else { L.traffic = +(L.traffic * 1.2).toFixed(2); L.rent = Math.round(L.rent * 1.6 / 5) * 5; L.dep = Math.round(L.rent * 12 / 100) * 100; L.key = Math.round(1500 * pi / 50) * 50; L.memo = "번화가 1층"; }
        out.push(`${D.UC_AREAS[ak].n} 매물 3개가 목록에 올라왔다(보드에서 계약)`);
      }
      if (id === "u02" && i === 1) { X.fran = true; X.franT = s.t; out.push(`가맹: 개업 첫 달 입소문 +30, 매장마다 월 ${won(Math.round(22 * pi))}`); }
      if (id === "u06" && i === 1 && st && !X.study.includes(st.id)) { X.study.push(st.id); out.push("24시 공부 카페: 매출 +3.5%, 전기료 월 6만"); }
      if (id === "u07" && i === 1) X.moldN++;
      if (id === "u08" && i === 0 && st) { X.dessert.push(st.id); out.push(`디저트 위탁: 월 +${won(Math.round(10 * pi))} 안팎, 가끔 폐기`); }
      if (id === "u09" && i === 0) { X.icecup = true; out.push("얼음컵: 6~8월 매출 +3%"); }
      if (id === "u10" && i === 0) { const L = UC.search(s, r, "apt")[0]; L.comp = 0; L.memo = "저가커피 없는 공실"; out.push("아파트 단지 상가 매물이 목록에 올라왔다(보드에서 계약)"); }
      if (id === "u11" && i === 0) { X.helper = true; out.push(`청소 알바: 매장당 월 ${won(Math.round(25 * pi))}, 점검 +0.5(가끔 안 온다)`); }
      if (id === "u12" && i === 0) {
        const price = sc.ucsPrice || Math.round(3500 * pi);
        if (s.cash < price) out.push(`돈이 모자라 인수를 포기했다(필요 ${won(price)})`);
        else {
          const L = UC.search(s, r, r.pick(["apt", "academy", "newtown"]))[0]; U.listings = U.listings.filter((x) => x !== L);
          s.cash -= price; addMoney(s, "exp", "무인카페 오픈", price);
          const A = D.UC_AREAS[L.ak], nn = U.stores.length + 1;
          const ns = { ...L, key: 0, id: "S" + (++U.seq), name: `${nn}호 ${A.n}`, machine: "buy", bean: 0, price: 0.2, rating: 3.7, clean: 0, months: 0, ap: 0, last: null, hist: [], invested: price, cctv: false, broken: 0, old: true };
          U.stores.push(ns); log(s, `${ns.name} 폐업 매장 인수 ${won(price)}`, "work");
          out.push(`${ns.name} 인수 −${won(price)}`, "구형 머신: 고장이 잦아요");
        }
      }
      if (id === "u13") { X.thief++; }
      if (id === "u14" && st) { // 11-23 뺀 사건. 옛 저장에 이 장면이 떠 있는 채로 남았을 때만 쓴다
        if (i === 2) closeStore(s, st, ok ? 0 : (st.machine === "rent" ? Math.round(UC.UC_BAL.rental * pi * 6) : Math.round(80 * pi)), out); else { st.comp++; out.push(`${st.name} 경쟁 카페 ${st.comp}곳`); } }
      if (id === "u15" && st) { if (i === 0) { X.turn[st.id] = s.t + 6; out.push("메뉴 개편: 6개월 동안 입소문 +"); } else closeStore(s, st, Math.round(UC.UC_BAL.rental * pi * 12), out); }
      if (id === "u16" && i === 0) { X.fran = false; out.push("독립 매장: 로열티 없음"); }
      if (id === "u19" && st && st.ucsRenew) out.push(`${st.name}: 재계약은 이미 끝났어요`); // space.js 가 먼저 올린 매장(옛 저장)
      else if (id === "u19" && st) {
        st.ucsRenew = 1;
        if (i === 2) closeStore(s, st, 0, out);
        else { const up = i === 1 && ok ? 1.05 : 1.12; st.rent = Math.round(st.rent * up); out.push(`${st.name} 월세 +${Math.round((up - 1) * 100)}% (${won(st.rent)})`); }
      }
      return out;
    },
  },
  migrate(s, X) { const d = DEF(); for (const k of Object.keys(d)) if (X[k] === undefined) X[k] = d[k]; if (!X.v) X.v = 1; },
  milestones: [
    { key: "ucs_lv2", title: "동네 단골", test: (s) => !!s.sx?.ucafe?.f2, lines: ["지도 리뷰가 서른 개를 넘었다. 석 달째 월매출 300만.", "아침 7시 반이면 같은 유모차, 같은 운동복이 들른다."] },
    { key: "ucs_summer", title: "아이스의 계절", test: (s) => !!s.sx?.ucafe?.summer, lines: ["한여름 한 달 3,500잔. 제빙기가 하루 종일 돌았다.", "얼음통을 세 번 비우고 나니 출근 시간이었다."] },
    { key: "ucs_lv3", title: "흑자 사장님", test: (s) => !!s.sx?.ucafe?.f3, lines: ["월매출 450만, 순익 150만. 월세·렌탈료·카드수수료를 다 빼고 남은 돈이었다.", "처음으로 원두 등급표를 오래 들여다봤다."] },
    { key: "ucs_lv4", title: "2호점", test: (s) => !!s.sx?.ucafe?.f4, lines: ["두 번째 가게 열쇠를 받았다. 새벽 동선이 두 배로 길어졌다.", "원두 박스를 두 군데로 나눠 실었다."] },
    { key: "ucs_payback", title: "투자금 회수", test: (s) => { const X = s.sx?.ucafe; return !!X && X.inv0 > 0 && X.cum >= X.inv0; }, lines: ["누적 이익이 첫 매장에 넣은 돈을 넘었다. 생각보다 오래 걸렸다.", "이제부터 나오는 돈이 진짜 내 돈이었다."] },
    { key: "ucs_lv5", title: "무인 체인 오너", test: (s) => !!s.sx?.ucafe?.f5, lines: ["매장을 다 합쳐 월매출 1,000만을 넘겼다.", "정산 앱 첫 화면이 가게 목록으로 바뀌었다."] },
  ],
  perks: [
    { id: "p_ucs_dawn", n: "새벽 6시의 사장님", line: "무인은 무관리가 아니다", pro: "무인카페 단골 재방문 +7%", m: { ucRepeat: 1.07 }, got: "점검을 꽉 채운 달 400번(매장 기준)", test: (s) => (s.sx?.ucafe?.fullQ || 0) >= 400 },
    { id: "p_ucs_book", n: "투명한 장부", line: "커피는 기계가, 장부는 내가", pro: "먹튀·정산 손실 −20%", m: { ucTheft: 0.8 }, got: "무인카페 흑자 달 200번 + 흑자 사장님", test: (s) => (s.sx?.ucafe?.blackM || 0) >= 200 && !!s.sx?.ucafe?.f3 },
  ],
  perkCine: { p_ucs_dawn: "ucs_lv2", p_ucs_book: "ucs_payback" },
  synergy: [
    { id: "ucs_insta", kind: "good", n: "인별 × 무인카페", need: "인별그램 + 운영 중인 무인카페", desc: "포토존·해시태그 쿠폰: 매장 입소문 매달 +5, 지도 리뷰 +20%", test: (s) => on(s, "insta") && on(s, "ucafe") && (s.uc?.stores?.length || 0) >= 1 },
    { id: "ucs_ab", kind: "good", n: "에어씨앤씨 × 무인카페", need: "에어씨앤씨 + 운영 중인 무인카페", desc: "도어락·CCTV·자동 메시지 원격관리를 같이 쓴다: 매장 청결 매달 +10", test: (s) => on(s, "airbnb") && on(s, "ucafe") && (s.uc?.stores?.length || 0) >= 1 },
  ],
};
