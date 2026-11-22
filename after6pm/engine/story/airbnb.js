// 기존 투잡 'airbnb'(에어씨앤씨) 이야기 보강. 규약: engine/story/README.md
// 돈·행동·단속(AB_LAW)·기존 사건 5개(체크인 대소동·파티 금지 위반·외국어 후기 폭탄·고장 난 보일러·불법 숙박 단속)는 engine/abnb.js 그대로.
// 여기서는 기획 데이터 stay.json 이벤트 16개 + 단기임대(shortrent.json)에서 숙소에 맞는 고생 4개 + 이 투잡만의 2개 = 22개,
// 11-23: 다른 투잡·엔진 사건과 틀이 겹치던 5개(s07·s15·s16·s17·s19)를 숙소에서만 생기는 일(s23~s27)로 바꿨다. 옛 id 는 다시 쓰지 않는다(옛 저장의 seen).
// 숙소 단계 5개(영업신고증 → 첫 리뷰 → 예약률 50% → 리뷰 50개 → 숙소 브랜드)에 맞춘 화보, 특전 2장, 시너지 2개.
import * as D from "../defs.js";
import { addMoney, won } from "../core.js";
import * as SYN from "../syn.js";
import * as AB from "../abnb.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const act = (s, k) => !!s.sj?.active?.includes(k);
const company = (s) => !(s.co?.quit || s.co?.fired);
const live = (s) => (s.ab?.units || []).filter((u) => !u.banned);
const totStays = (s) => (s.ab?.units || []).reduce((a, u) => a + (u.stays || 0), 0);
const maxRating = (s) => Math.max(0, ...(s.ab?.units || []).map((u) => u.rating || 0));
// 한 달 이익(최근 6달 평균, 최소 40만): 이벤트 돈은 이 값의 ±10~30% 안에서
const monthP = (s) => { const h = (s.ab?.hist || []).slice(-6); const v = h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; return Math.max(40 * SYN.pi(s), v); };

// ───────── 숙소 단계(기획 stay.json levels). 원래 엔진에는 레벨이 없어서 여기서 계산 ─────────
export const LV = [
  { n: "영업신고증", need: "숙소 1채 오픈" },
  { n: "첫 리뷰", need: "첫 게스트 숙박" },
  { n: "예약률 50%", need: "예약률 50% 이상 3달 연속" },
  { n: "리뷰 50개 숙소", need: "누적 숙박 50팀 + 별점 4.7" },
  { n: "숙소 브랜드", need: "2채 이상 + 1년 흑자" },
];
export function stage(s) {
  const A = s.ab, X = s.sx?.airbnb; if (!A || !A.units.length) return 0;
  const st = totStays(s);
  if (A.units.length >= 2 && (X?.goodM || 0) >= 12 && st >= 50) return 5;
  if (st >= 50 && maxRating(s) >= 4.7) return 4;
  if ((X?.occBest || 0) >= 3) return 3;
  if (st >= 1) return 2;
  return 1;
}

const DEF = () => ({
  v: 1, seen: [], evT: -99, nb: 50, // nb = 이웃 인심(0~100). 동의서·캐리어 소리 이벤트가 오르내린다
  proof: false, autoMsg: false, longStay: false, shoot: 0, taxDone: false, legalMine: 0, // 이야기 선택으로 생긴 것들
  occM: 0, occBest: 0, goodM: 0, evN: 0, crisisOk: 0, cutAdr: 0, cut: null, lastU: null,
});

// ───────── 이벤트(stay 16 + 숙소용 단기임대 4 + 자체 2) ─────────
// u = 이번 장면의 숙소. 효과 숫자는 그때그때 계산. 복잡한 결과는 onChoose "abs_ev".
function evList(s) {
  const A = s.ab, X = s.sx.airbnb, pi = SYN.pi(s), P = monthP(s), lv = stage(s), st = totStays(s);
  const us = live(s); if (!us.length) return [];
  const newest = us.reduce((a, u) => (u.months < a.months ? u : a), us[0]);
  const oldest = us.reduce((a, u) => (u.months > a.months ? u : a), us[0]);
  const best = us.reduce((a, u) => (u.stays > a.stays ? u : a), us[0]);
  const ill = us.find((u) => u.reg === "illegal");
  const p10 = Math.round(P * 0.1), p20 = Math.round(P * 0.2), p25 = Math.round(P * 0.25);
  const adr = (u) => Math.max(5, u.adr);
  return [
    // ── 초반: 영업신고증 · 첫 리뷰 ──
    { id: "s01", ph: 0, u: newest, ok: () => newest.months <= 1, t: "입주민 동의서 돌리기", x: `토요일 오전, 동의서 서류철을 들고 ${newest.name} 같은 층 현관문을 두드린다. 302호는 흔쾌히 서명했다. 305호 할머니는 문틈으로 "외국인 캐리어 소리 싫어" 한마디를 남기고 문을 닫았다.`,
      c: [{ t: "소음 규칙표와 내 연락처를 들고 다시 찾아간다", check: { stat: "talk", dc: 40 }, ok: { text: "\"밤 10시 넘어서는 조용히 시킨다는 거지?\" 할머니가 서명했다. 귤도 두 개 받았다.", eff: { hp: -3, stat: { talk: 0.5 }, abs_nb: 15 } }, ng: { text: "세 번째 방문에 겨우 문이 열렸다. 서명은 받았는데 표정은 그대로다.", eff: { hp: -5, mental: -3, abs_nb: 3 } } },
          { t: "305호는 건너뛰고 관리사무소 공지로 대신한다", eff: { abs_nb: -10 }, text: "주말은 지켰다. 복도에서 마주친 할머니가 고개를 돌렸다." }] },
    { id: "s02", ph: 0, u: newest, ok: () => newest.months <= 8 && newest.photo < 75, t: "아이보리보다 연한 흰색", x: "페인트 가게에서 색상표를 30분째 보고 있다. 하얀색, 노란 기 도는 흰색, 아이보리보다 연한 흰색. 사장님 눈엔 다 같은 흰색인데 사진에서는 다르다. 9평 인테리어 견적은 200~300만 원이었다.",
      c: [{ t: "따뜻한 기 도는 흰색으로 주말 내내 직접 칠한다", eff: { hp: -9, stat: { sense: 1, hands: 0.5 }, abs_photo: 10 }, text: "어깨가 내려앉았다. 오전 햇살에 벽이 우윳빛으로 빛났다." },
          { t: "도배업체에 기본 흰색으로 맡긴다", eff: { cash: -Math.round(45 * pi), abs_photo: 2 }, text: "하루 만에 끝났다. 사진 속 벽은 그냥… 흰색이다." }] },
    { id: "s03", ph: 0, u: newest, ok: () => newest.photo < 80, t: "어떻게 보이느냐", x: `같은 방인데 사진 열 장이 열 개의 방처럼 보인다. 어떤 구도는 넓고 어떤 구도는 감옥 같다. ${newest.name} 예약은 사진 첫 장에서 결정된다.`,
      c: [{ t: "주말 하루를 통째로 촬영·보정에 쓴다", eff: { hp: -6, stat: { sense: 0.8 }, abs_photo: 12 }, text: "광각 렌즈, 오전 10시, 침대 모서리 45도. 첫 장을 바꾸자 조회수가 두 배가 됐다." },
          { t: "휴대폰으로 대충 찍어 올린다", eff: { abs_photo: -3 }, text: "저녁 형광등 아래 사진. 방이 실제보다 좁아 보인다." }] },
    { id: "s04", ph: 0, u: best, ok: () => st >= 1, t: "첫 게스트의 질문", x: "첫 예약 게스트가 메시지를 보냈다. \"Is there a place for breakfast nearby?\" 질문에 대답만 하지 말고 대화를 하라고, 호스트 카페에서 읽은 적이 있다.",
      c: [{ t: "단골 국밥집과 산책 코스를 지도로 정리해 보낸다", eff: { hp: -3, stat: { talk: 0.5, lang: 0.5 }, abs_star: 0.06 }, text: "\"The gukbap was the best part of our trip!\" 첫 리뷰에 국밥집 이름이 적혔다." },
          { t: "\"Yes, there is.\" 짧게 답한다", check: { stat: "charm", dc: 50 }, ok: { text: "운이 좋았다. 게스트가 알아서 맛집을 찾았고 별 다섯 개를 남겼다.", eff: { abs_star: 0.02 } }, ng: { text: "첫 리뷰: \"Host was not very helpful.\" 별 넷.", eff: { abs_star: -0.05 } } }] },
    // ── 중반: 예약률 50% ──
    { id: "s05", ph: 1, u: best, ok: () => st >= 10, t: "하필 그날 바퀴벌레", x: `석 달 동안 한 번도 안 나왔다. 하필 여성 게스트 둘이 묵는 첫날 밤, ${best.name} 욕실에서 그분이 나오셨다. 새벽 1시, 사진과 비명 이모티콘이 도착했다.`,
      c: [{ t: "1박 요금 환불과 방역을 약속한다", eff: { cash: -Math.round(adr(best) + 12 * pi), abs_star: -0.02 }, text: "\"Thank you for quick reply.\" 별점은 4점에서 멈췄다. 다음 날 방역 업체를 불렀다." },
          { t: "\"오래된 건물이라 어쩔 수 없어요\"라고 답한다", eff: { abs_star: -0.12, mental: -2 }, text: "리뷰 맨 위에 바퀴벌레 사진이 박혔다. 예약 문의가 뚝 끊겼다." }] },
    { id: "s06", ph: 1, u: best, ok: () => st >= 8 && !X.proof, on: true, t: "깨진 머그컵, 증거 없음", x: "체크아웃 후 점검. 머그컵 둘이 깨졌고 스탠드 갓이 찌그러졌다. 게스트는 원래 그랬다고 한다. 입실 전 사진이 없다.",
      c: [{ t: "이번엔 넘기고, 체크인 전 사진을 루틴으로 만든다", eff: { cash: -Math.round(6 * pi) }, text: "머그컵은 새로 샀다. 이제 청소가 끝나면 방 사진 12장부터 찍는다." },
          { t: "끝까지 배상을 요구한다", check: { stat: "talk", dc: 60 }, ok: { text: "게스트가 마지못해 2만 원을 보냈다. 메시지 스무 통이 오갔다.", eff: { cash: 2, mental: -3 } }, ng: { text: "\"You are accusing me?\" 보복 리뷰가 달렸다.", eff: { abs_star: -0.06, mental: -5 } } }] },
    { id: "s25", ph: 1, u: best, ok: () => [3, 4, 10].includes(s.cal) && st >= 8, t: "한 방에 두 팀", x: `${[3, 4].includes(s.cal) ? "벚꽃" : "단풍"} 주말, ${best.name}에 같은 날짜 예약이 두 건 잡혔다. 숙박앱 두 곳의 달력 연동이 하루 밀려 있었다. 한 팀은 넉 달 전에 잡았고, 다른 팀은 이미 공항철도 안이다.`,
      c: [{ t: "늦게 잡은 팀을 근처 숙소로 옮기고 차액을 내가 낸다", eff: { cash: -Math.round(adr(best) * 1.5), hp: -3, abs_star: 0.02 }, text: "동네 호스트 단톡방에 빈방을 물었다. 차액과 택시비를 보냈다. \"Host fixed it in an hour.\"" },
          { t: "사정을 설명하고 하루만 미뤄 달라고 부탁한다", check: { stat: "lang", dc: 45 }, ok: { text: "\"OK, we can do Busan first.\" 일정을 바꿔 줬다. 1박은 받지 않았다.", eff: { cash: -Math.round(adr(best)), stat: { lang: 0.5 } } }, ng: { text: "번역기 문장이 통보처럼 읽혔다. 손님이 직접 취소했고 긴 항의 글이 남았다.", eff: { cash: -Math.round(adr(best) * 0.5), abs_star: -0.06, mental: -3 } } },
          { t: "늦게 잡은 예약을 호스트 권한으로 취소한다", eff: { abs_star: -0.08, mental: -3 }, text: "호스트 취소 벌점이 붙었다. 그 주 검색 순위가 눈에 띄게 내려갔다." }] },
    { id: "s08", ph: 1, u: best, ok: () => lv >= 3 && best.photo >= 55 && !X.shoot, on: true, t: "촬영 대관 문의", x: `식기 회사 마케팅팀에서 메시지가 왔다. ${best.name} 주방을 반나절 촬영용으로 빌리고 싶다고 한다. 대관료는 1박 요금의 두 배가 넘는다.`,
      c: [{ t: "촬영 대관을 받는다", eff: { abs_cash: Math.round(adr(best) * 2.5), hp: -4 }, text: "조명 장비 여섯 개가 들어왔다. 스태프가 \"여기 또 와도 돼요?\" 물었다." },
          { t: "숙박 예약과 겹칠까 봐 거절한다", eff: {}, text: "게스트 체크인 시간은 지켰다." }] },
    { id: "s09", ph: 1, u: best, ok: () => st >= 15 && (best.last?.foreign || 0) >= 50, on: true, t: "5박 6일 외국인 가족", x: `외국인 가족이 ${best.name}에 5박 6일을 묵었다. 방한 외국인 평균 체류가 딱 그 정도다. 퇴실 날 아이가 그린 그림 한 장이 식탁에 놓여 있었다. 그림 속 나는 웃고 있었다.`,
      c: [{ t: "그림 사진을 숙소 소개에 올린다", eff: { abs_star: 0.04, abs_photo: 3, stat: { mkt: 0.5 } }, text: "\"이 집 호스트 좋아 보여요.\" 문의 메시지 첫 줄이 바뀌었다." },
          { t: "장기 숙박 할인(5박 이상 10%)을 상시로 만든다", eff: { cash: -Math.round(adr(best) * 1.5) }, text: "단가는 조금 깎였다. 대신 청소 횟수가 줄고, 장기 손님이 늘 것이다." }] },
    // ── 숙소용 단기임대 고생(shortrent) ──
    { id: "s23", ph: 1, u: best, ok: () => st >= 12 && !X.autoMsg && !A.cohost, on: true, t: "새벽 5시에 도착해요", x: "새벽 4시 10분, 휴대폰이 울렸다. \"We land at 5 AM. Can we check in early? Or just leave our bags?\" 체크인은 오후 3시다. 이번 달만 이런 문의가 아홉 통. 손님 시계는 전부 다른 나라에 맞춰져 있다.",
      c: [{ t: "4개 국어 자동 안내와 짐 보관 지도를 만든다", eff: { hp: -4, stat: { write: 1, lang: 0.5 } }, text: "얼리 체크인 규칙, 역 물품보관함 위치, 와이파이, 쓰레기 버리는 날. 예약이 확정되면 자동으로 나간다." },
          { t: "앞 손님이 없는 날만 얼리 체크인을 돈 받고 해 준다", eff: { abs_cash: Math.round(adr(best) * 0.5), hp: -3 }, text: "반일 요금을 받았다. 대신 달력을 볼 때마다 앞뒤 날짜를 세게 됐다." },
          { t: "깰 때마다 답한다", eff: { hp: -3, mental: -2 }, text: "4시 12분에 답장을 보냈다. 다시 잠들지 못하고 출근했다." }] },
    { id: "s18", ph: 2, u: best, ok: () => st >= 40, on: true, t: "벽에 뚫린 구멍", x: `퇴실 점검을 갔다. ${best.name} 벽에 주먹만 한 구멍, 침구에 정체불명의 얼룩.${X.proof ? " 다행히 체크인 전 사진 12장이 있다." : " 입실 전 사진은… 이번에도 없다."}`,
      c: [{ t: "입실 사진을 근거로 플랫폼에 파손 신고한다", ...(X.proof ? { eff: { abs_cash: Math.round(30 * pi), hp: -2 }, text: "사진 12장이 증거가 됐다. 보상금이 들어왔다. 루틴이 돈이 됐다." } : { check: { stat: "talk", dc: 65 }, ok: { text: "게스트가 잘못을 인정했다. 운이 좋았다.", eff: { abs_cash: Math.round(20 * pi), mental: -3 } }, ng: { text: "\"증거가 부족합니다.\" 플랫폼 답변 한 줄. 수리는 내 돈으로.", eff: { cash: -Math.round(25 * pi), mental: -6 } } }) },
          { t: "보증금으로 끝내고 퍼티를 사다 직접 메운다", eff: { cash: -Math.round(8 * pi), hp: -7, stat: { hands: 1 } }, text: "퍼티, 사포, 페인트. 새벽 1시에 벽이 다시 하얘졌다." }] },
    // ── 눌러앉은 손님 ── (회사에 들키는 장면은 engine/caught.js 가 맡는다)
    { id: "s24", ph: 1, u: best, ok: () => st >= 25, rep: true, t: "퇴실일이 어제였는데요", x: `${best.name} 3주 손님의 퇴실일은 어제였다. 도어락 기록은 오늘 아침에도 찍혔다. 메시지가 왔다. "일이 꼬여서 며칠만 더 있을게요. 돈은 다음 주에 드릴게요." 내일 오후 3시에 다음 손님이 온다.`,
      c: [{ t: "플랫폼에 신고하고 오늘 안에 나가 달라고 한다", check: { stat: "talk", dc: 50 }, ok: { text: "플랫폼 상담원이 손님에게 직접 전화했다. 저녁 8시, 복도에서 캐리어 끄는 소리가 났다.", eff: { mental: -2 } }, ng: { text: "자정이 다 돼서야 나갔다. 새벽 2시까지 침구를 갈았다.", eff: { hp: -8, mental: -4 } } },
          { t: "연장 숙박비를 선불로 받고, 다음 손님을 다른 숙소로 옮긴다", eff: { abs_cash: Math.round(adr(best) * 2), abs_star: -0.04 }, text: "돈은 들어왔다. 옮겨 간 손님 후기에 \"예약한 방이 아니었어요\"가 남았다." },
          { t: "다음 손님에게 환불하고 며칠 기다려 준다", eff: { cash: -Math.round(adr(best) * 2), mental: -3 }, text: "닷새 뒤에 나갔다. 연장 숙박비는 절반만 들어왔다." }] },
    // ── 후반: 리뷰 50개 · 숙소 브랜드 ──
    { id: "s10", ph: 2, u: best, ok: () => !X.taxDone && s.cal >= 8 && us.reduce((a, u) => a + (u.last?.rev || 0), 0) >= 380 * pi, on: true, t: "4,800만 원의 벽", x: "올해 숙소 매출이 4,500만 원을 넘어간다. 4,800만 원을 넘기면 과세 유형이 바뀔 수 있다. 공유숙박업 부가가치율은 25%. 세무 상담 예약 버튼 위에서 손가락이 멈춘다.",
      c: [{ t: "세무 상담을 받고 비용 증빙을 정리한다", eff: { cash: -Math.round(30 * pi), stat: { num: 1 } }, text: "영수증 상자 세 개를 쏟았다. 청소비·소모품·수수료가 다 경비였다." },
          { t: "연말까지 예약을 일부 막는다", eff: { cash: -p25, abs_star: -0.03 }, text: "달력에 X 표를 쳤다. 성수기 금요일을 막은 게 제일 아팠다." }] },
    { id: "s11", ph: 2, u: oldest, ok: () => us.length === 1 && oldest.months >= 12 && (X.goodM || 0) >= 6, on: true, t: "두 번째 숙소", x: `${oldest.name}이 1년째 안정적이다. 숙소가 몰린 동네 말고, 관광객이 덜 몰린 옆 구에 괜찮은 매물이 나왔다는 연락이 왔다. 몰려 있다는 건, 다른 곳엔 빈자리가 있다는 뜻이기도 하다.`,
      c: [{ t: "덜 붐비는 동네 매물을 보러 간다", eff: { hp: -4, stat: { num: 0.5 } }, text: "중개사가 매물 3개를 보여 줬다. 보증금을 조금 깎아 주겠단다(에어씨앤씨 화면 매물 목록)." },
          { t: "1호 숙소 퀄리티를 올린다", eff: { cash: -Math.round(Math.min(150 * pi, P * 0.3)), abs_photo: 8, abs_star: 0.05, item: "ab_bed" }, text: "매트리스와 커튼을 바꿨다. 리뷰에 \"bed was like a cloud\"가 달렸다." }] },
    { id: "s12", ph: 2, u: best, ok: () => us.length >= 2 && company(s) && us.every((u) => u.months >= 10), on: true, t: "숙소 둘, 사직서 하나", x: "숙소 수익이 1년째 안정적으로 들어온다. 성수기마다 청소 일정 조율하느라 본업 회의에 집중을 못 한다. 팀장이 묻는다. \"요즘 무슨 일 있어요? 자꾸 핸드폰 보던데.\"",
      c: [{ t: "\"집안일이 좀 있어서요\" 둘러대고 회의에 집중한다", check: { stat: "talk", dc: 50 }, ok: { text: "\"그래요, 힘내요.\" 그날부터 회의 중엔 휴대폰을 엎어 뒀다.", eff: { eye: -3 } }, ng: { text: "그날 오후에도 알림이 세 번 울렸다. 팀장이 고개를 저었다.", eff: { eye: 6, mental: -3 } } },
          { t: "성수기 석 달만 청소·응대 대행을 쓴다", eff: { cash: -p20, hp: 6, eye: -3 }, text: "\"체크인 안내는 제가 할게요.\" 저녁이 돌아왔다. 대행비 영수증을 보니 한 달 이익의 5분의 1이 사라졌다." }] },
    { id: "s20", ph: 2, u: oldest, ok: () => oldest.months >= 24, rep: true, t: "샤워헤드부터 장판까지", x: `${Math.floor(oldest.months / 12)}년째, 집이 늙기 시작했다. ${oldest.name} 샤워헤드가 새고, 장판이 들뜨고, 벽지 모서리에 곰팡이가 피었다. 수리 견적서 맨 아래 숫자가 한 달 이익의 3분의 1이다.`,
      c: [{ t: "직접 고칠 수 있는 건 고친다", eff: { hp: -10, cash: -p10, stat: { hands: 1.5 } }, text: "너튜브 보며 샤워헤드를 갈았다. 장판은 업체를 불렀다. 손바닥에 물집이 잡혔다." },
          { t: "통째로 업체에 맡긴다", eff: { cash: -Math.round(P * 0.3), abs_photo: 5 }, text: "사흘 만에 새집 같아졌다. 사진도 다시 찍었다." }] },
    { id: "s21", ph: 2, u: us.find((u) => u.ty === "hanok") || best, ok: () => us.some((u) => u.ty === "hanok" || D.AB_REGIONS[u.rk].foreign >= 0.75) && lv >= 3, on: true, t: "드라마에 나온 골목", x: `해외에서 뜬 드라마에 숙소 앞 골목이 나왔다. 일주일 새 예약 문의가 서른 통. "Same alley as the drama?!" 근처 숙소들이 하나둘 요금을 올린다.`,
      c: [{ t: "요금을 10% 올린다", eff: {}, text: "올려도 찼다. 대신 기대치가 높아진 손님들은 별점이 박하다." },
          { t: "요금은 그대로, 촬영지 산책 지도를 만든다", eff: { hp: -3, stat: { sense: 0.5 }, abs_star: 0.05 }, text: "\"This host knows the real spots!\" 리뷰가 지도처럼 길어졌다." }] },
    // ── 위기 ──
    { id: "s13", ph: 1, u: ill || best, ok: () => st >= 3, on: true, t: "신고증 없는 숙소는 삭제", x: ill ? `숙박앱 공지가 떴다. 영업신고증이 없는 숙소는 노출이 중단된다. ${ill.name}은 미등록이다. 친구 호스트는 기한을 넘겨 숙소가 통째로 사라졌다고 한다.` : "숙박앱 공지가 떴다. 영업신고증이 없는 숙소는 노출이 중단된다. 내 숙소는 이미 등록돼 있다. 우리 동네 미등록 숙소 리스팅이 한 달 새 절반이 사라졌다.",
      c: ill ? (ill.house
        ? [{ t: "서류를 챙겨 기한 전에 등록한다", eff: { cash: -Math.round(80 * pi), hp: -3 }, text: "구청 민원실을 두 번 갔다. 신고증 사진을 리스팅 첫 줄에 올렸다." },
           { t: "미루다가 마감 전날 몰아서 한다", check: { stat: "num", dc: 50 }, ok: { text: "마감 3시간 전 접수 완료. 심장이 아직 뛴다.", eff: { cash: -Math.round(80 * pi), mental: -6 } }, ng: { text: "서류 하나가 빠졌다. 한 달 동안 리스팅이 내려갔다.", eff: { mental: -8 } } }]
        : [{ t: "오피스텔은 등록이 안 된다. 계약을 정리한다", eff: { mental: -3 }, text: "보증금을 돌려받았다. 숙소 하나가 지도에서 사라졌다." },
           { t: "버틴다. 노출이 줄어도 받을 수 있는 만큼 받는다", eff: { mental: -5 }, text: "검색 노출이 반으로 줄었다. 단속반 소식이 들릴 때마다 가슴이 내려앉는다." }])
        : [{ t: "경쟁자가 줄었으니 요금을 5% 올린다", eff: {}, text: "미리 등록한 값을 받았다." },
           { t: "요금은 그대로, 리뷰를 쌓는 데 집중한다", eff: { abs_star: 0.04, hp: -2, shard: 1 }, text: "빠져나간 숙소의 손님들이 내 숙소로 왔다. 리뷰가 늘었다." }] },
    { id: "s14", ph: 2, u: best, ok: () => !!(s.era?.intl || s.era?.pandemic || s.era?.winter) || us.every((u) => (u.last?.occ ?? 1) < 0.4), rep: true, on: true, t: "관광객이 오지 않는다", x: `뉴스는 외교 갈등과 경기 침체 이야기뿐이다. 외국인 관광객은 늘지 않고, 내국인은 해외로 나간다. 다음 달 예약률이 25%다.${X.longStay || X.shoot ? " 그래도 장기 손님 연락처와 촬영팀 명함이 있다." : ""}`,
      c: [{ t: "장기 숙박·촬영 대관으로 수요를 바꾼다", check: { stat: "mkt", dc: X.longStay || X.shoot ? 25 : 45 }, ok: { text: "출장자 한 달 숙박 하나, 촬영 대관 둘. 빈 달력이 조금 찼다.", eff: { abs_cash: p20, hp: -4, stat: { mkt: 0.5 } } }, ng: { text: "공고만 열 군데 올렸다. 연락은 한 통.", eff: { abs_cash: Math.round(P * 0.05), hp: -5, mental: -3 } } },
          { t: "가격을 20% 내린다", eff: {}, text: "예약이 조금 돌아왔다. 가격은 올리는 게 내리는 것보다 어렵다." }] },
    { id: "s27", ph: 1, u: us.find((u) => u.ty !== "detached") || best, ok: () => st >= 20 && us.some((u) => u.ty !== "detached"), on: true, t: "관리규약 개정 투표", x: `엘리베이터에 공고문이 붙었다. '단기 숙박 영업 금지 조항 신설. 입주민 투표 다음 주 수요일.' 통과되면 이 건물 숙소는 접어야 한다.${X.nb >= 60 ? " 305호 할머니가 \"그 집은 조용하던데\" 하고 반상회에서 한마디 해 주셨다고 한다." : " 발의자 명단에 동의서에 서명했던 이웃 이름이 있다."}`,
      c: [{ t: "집집마다 찾아가 소음 규칙과 내 연락처를 건넨다", check: { stat: "talk", dc: X.nb >= 60 ? 35 : 55 }, ok: { text: "\"밤 10시 넘으면 바로 전화하세요.\" 투표는 부결됐다. 반대표가 생각보다 많았다.", eff: { hp: -5, abs_nb: 10 } }, ng: { text: "부결은 됐는데 조건이 붙었다. 밤 9시 이후 체크인 금지. 늦은 비행기 손님을 못 받는다.", eff: { hp: -5, abs_nb: -5, abs_star: -0.04 } } },
          { t: "투표 전에 스스로 인원·체크인 시간을 줄인다", eff: { cash: -p10, abs_nb: 12 }, text: "최대 2인, 체크인 저녁 8시까지. 예약이 조금 줄었다. 안건은 투표 전날 철회됐다." },
          { t: "결과를 기다린다", eff: { abs_nb: -10, mental: -4 }, text: "한 표 차로 부결됐다. 찬성표가 누구였는지, 엘리베이터에서 자꾸 세어 보게 된다." }] },
    { id: "s26", ph: 2, u: best, ok: () => st >= 30, rep: true, t: "결항, 그리고 환불 불가", x: `${best.name} 3박 손님 메시지. "${[12, 1, 2].includes(s.cal) ? "Heavy snow" : "Typhoon"}. Flight cancelled. Please refund." 내 취소 정책은 '엄격'이라 규정상 한 푼도 안 돌려줘도 된다. 체크인이 내일이라 그 사흘을 다른 손님에게 팔 시간도 없다.`,
      c: [{ t: "규정대로 환불하지 않는다", eff: { mental: -3 }, text: "돈은 지켰다. 메시지함에 긴 원망이 남았다. 빈 숙소에 사흘 동안 불이 꺼져 있었다." },
          { t: "전액 환불해 준다", eff: { cash: -Math.round(adr(best) * 3), abs_star: 0.04, item: "m_postcard" }, text: "석 달 뒤 그 손님이 다시 예약했다. 이번엔 친구 둘을 데려왔고, 후기가 길었다." },
          { t: "환불 대신 날짜를 옮겨 주겠다고 한다", check: { stat: "lang", dc: 45 }, ok: { text: "\"That works. See you in spring.\" 돈도 손님도 남았다.", eff: { abs_star: 0.03, stat: { lang: 0.5 } } }, ng: { text: "말이 엇갈려 플랫폼 분쟁으로 넘어갔다. 절반을 돌려주라는 결정이 났다.", eff: { cash: -Math.round(adr(best) * 1.5), mental: -3 } } }] },
    { id: "s22", ph: 2, u: oldest, ok: () => oldest.months >= 18 && us.length >= 1, t: "집주인이 집을 판대요", x: `${oldest.name} 집주인에게서 전화가 왔다. 집을 팔게 됐으니 계약 끝나면 나가 달라고 한다. 이미 받아 둔 예약 여섯 건이 계약 만료일을 넘는다.`, on: true,
      c: [{ t: "새 집주인과 재계약을 협상한다", check: { stat: "talk", dc: 50 }, ok: { text: "새 집주인도 숙박업 동의서에 서명했다. 대신 월세가 조금 올랐다.", eff: { hp: -3 } }, ng: { text: "재계약은 됐다. 월세가 꽤 올랐다. 그래도 리뷰 쌓인 숙소를 잃는 것보단 낫다.", eff: { hp: -3, mental: -4 } } },
          { t: "게스트를 근처 숙소로 옮겨 주고 정리한다", eff: { cash: -Math.round(adr(oldest) * 3), hp: -8 }, text: "여섯 팀에게 일일이 사과 메시지를 보냈다. 보증금은 돌려받았다. 리뷰는 지켰다." }] },
  ];
}

function pickEvent(s, r) {
  const X = s.sx.airbnb;
  let L; try { L = evList(s); } catch (e) { return null; }
  L = L.filter((e) => { try { return e.ok(); } catch (x) { return false; } });
  const fresh = L.filter((e) => !X.seen.includes(e.id));
  const must = fresh.find((e) => ["s04", "s01"].includes(e.id)); // 첫 리뷰, 새 숙소 동의서는 그때 나와야 한다
  let e = must || null;
  if (!e && fresh.length && r.chance(0.25)) {
    const lo = Math.min(...fresh.map((x) => x.ph));
    e = r.pick(fresh.filter((x) => x.ph <= lo + 1)); // 앞 단계 이야기부터, 한 단계 뒤 것까지 섞어서
  }
  if (!e && r.chance(fresh.length ? 0.02 : 0.06)) { const rp = L.filter((x) => x.rep && X.seen.includes(x.id)); if (rp.length) e = r.pick(rp); }
  if (!e) return null;
  if (!X.seen.includes(e.id)) X.seen.push(e.id);
  X.evT = s.t; X.evN++; X.lastU = e.u?.id || null; s._absEv = { id: e.id, u: e.u?.id || null };
  return { kind: "event", tag: "에어씨앤씨", title: e.t, text: e.x, onChoose: "abs_ev", choices: e.c };
}

const unitOf = (s) => { const id = s._absEv?.u || s.sx?.airbnb?.lastU; return s.ab.units.find((u) => u.id === id) || null; };

export default {
  key: "airbnb",
  prefix: "abs_",
  init() { return DEF(); },
  migrate(s, X) { const d = DEF(); for (const k of Object.keys(d)) if (X[k] === undefined) X[k] = d[k]; if (!X.v) X.v = 1; },

  month(s, r, notes, scenes) {
    const A = s.ab, X = s.sx.airbnb; if (!A || !X) return;
    const us = live(s);
    // 집계: 예약률 50% 연속 달, 흑자 연속 달
    const occ = us.length ? us.reduce((a, u) => a + (u.last?.occ || 0), 0) / us.length : 0;
    X.occM = us.length && occ >= 0.5 ? X.occM + 1 : 0; X.occBest = Math.max(X.occBest, X.occM);
    const last = A.hist.at(-1) ?? 0; X.goodM = A.units.length && last > 0 ? X.goodM + 1 : 0;
    if (A.units.length && A.units.every((u) => u.reg === "legal")) X.legalMine = (X.legalMine || 0) + 1; else X.legalMine = 0;
    // 비수기 할인은 석 달 뒤 원래 요금으로
    if (X.cutAdr > 0 && s.t - X.cutAdr >= 3) { for (const x of A.units) if (X.cut?.[x.id]) AB.setAdr(s, x.id, Math.max(x.adr, X.cut[x.id])); X.cut = null; X.cutAdr = 0; notes.push("비수기 할인 끝: 숙소 1박 요금을 원래대로 돌렸다"); }
    // 시너지 효과
    if (SYN.on(s, "abs_photo")) for (const u of us) if (u.photo < 85) u.photo = Math.min(85, u.photo + 1);
    if (SYN.on(s, "abs_night")) { s.hp = clamp(s.hp - 2, 0, s.hpMax || 100); }
    // 이야기 이벤트: 원래 엔진 사건(단속·체크인 소동 등)이 뜬 달·장면이 많은 달은 쉰다. 이야기끼리 간격 최소 1달
    if (!us.length || s.t - X.evT < 2) return;
    if (scenes.some((x) => x.tag === "에어씨앤씨") || scenes.length >= 2) return;
    const sc = pickEvent(s, r); if (sc) scenes.push(sc);
  },

  eff(s, eff, out) {
    const A = s.ab, X = s.sx.airbnb; if (!A || !X) return;
    const u = unitOf(s), tg = u ? [u] : A.units;
    if (eff.abs_star && tg.length) { for (const x of tg) x.rating = clamp(x.rating + eff.abs_star, 3.4, 4.99); out.push(`숙소 별점 ${eff.abs_star > 0 ? "+" : ""}${eff.abs_star.toFixed(2)}`); }
    if (eff.abs_photo && tg.length) { for (const x of tg) x.photo = clamp(x.photo + eff.abs_photo, 0, 100); out.push(`사진·소개 ${eff.abs_photo > 0 ? "+" : ""}${eff.abs_photo}`); }
    if (eff.abs_nb) { X.nb = clamp(X.nb + eff.abs_nb, 0, 100); out.push(`이웃 인심 ${eff.abs_nb > 0 ? "+" : ""}${eff.abs_nb}`); }
    if (eff.abs_cash) { const v = eff.abs_cash; s.cash += v; addMoney(s, "inc", "에어씨앤씨 매출", v); if (A.hist.length) A.hist[A.hist.length - 1] += v; out.push(`숙소 부수입 +${won(v)}`); }
  },

  choose: {
    abs_ev(s, r, i, ok) {
      const A = s.ab, X = s.sx.airbnb, ev = s._absEv?.id, u = unitOf(s); s._absEv = null;
      if (!X) return [];
      if (ev === "s06" && i === 0) { X.proof = true; return ["체크인 전 사진 루틴(파손 이벤트에서 증거가 된다)"]; }
      if (ev === "s08" && i === 0) { X.shoot = (X.shoot || 0) + 1; return ["촬영 대관 연락처 확보(비수기에 쓸모)"]; }
      if (ev === "s09" && i === 1) { X.longStay = true; return ["장기 숙박 할인 상시(비수기에 쓸모)"]; }
      if ((ev === "s23" || ev === "s17") && i === 0) { X.autoMsg = true; return ["자동 안내 메시지(밤 메시지 시너지 해제)"]; }
      if (ev === "s10" && i === 0) { X.taxDone = true; return ["비용 증빙 정리 완료"]; }
      if (ev === "s11" && i === 0) {
        const rk = Object.keys(D.AB_REGIONS).filter((k) => !D.AB_REGIONS[k].city || k === "seongsu");
        const ls = AB.search(s, r, r.pick(rk)); for (const l of ls) l.dep = Math.round(l.dep * 0.9 / 100) * 100;
        return [`매물 ${ls.length}개(보증금 −10%)`];
      }
      if (ev === "s13" && u) {
        if (u.reg === "illegal" && u.house && (i === 0 || ok)) { u.reg = "legal"; return ["합법 등록 완료(등록 숙소 노출 +8%)"]; }
        if (u.reg === "illegal" && u.house && i === 1 && !ok) { u.banned = Math.max(u.banned || 0, 1); return ["1개월 노출 중단"]; }
        if (u.reg === "illegal" && !u.house && i === 0) { const m = AB.close(s, u.id); return [m.msg || "숙소 정리"]; }
        if (u.reg === "legal" && i === 0) { for (const x of A.units) AB.setAdr(s, x.id, x.adr * 1.05); return ["1박 요금 +5%"]; }
      }
      if (ev === "s14" && i === 1) { X.cut = {}; for (const x of A.units) { X.cut[x.id] = x.adr; AB.setAdr(s, x.id, x.adr * 0.8); } X.cutAdr = s.t; return ["모든 숙소 1박 요금 −20%(석 달 뒤 원래대로)"]; }
      if (ev === "s14" && i === 0 && ok) { X.crisisOk++; return []; }
      if (ev === "s21" && i === 0 && u) { AB.setAdr(s, u.id, u.adr * 1.1); u.rating = clamp(u.rating - 0.04, 3.4, 4.99); return [`${u.name} 1박 요금 +10%`, "기대치 상승: 별점 −0.04"]; }
      if (ev === "s22" && u) {
        if (i === 0) { const up = ok ? 1.05 : 1.1; u.rent = Math.round(u.rent * up); u.owner = true; return [`${u.name} 월세 +${Math.round((up - 1) * 100)}% (${won(u.rent)})`]; }
        if (i === 1) { const m = AB.close(s, u.id); return [m.msg || "숙소 정리"]; }
      }
      return [];
    },
  },

  milestones: [
    { key: "abs_lv3", title: "예약률 50%", test: (s) => (s.sx?.airbnb?.occBest || 0) >= 3, lines: ["석 달 연속 달력의 절반이 찼다.", "청소 이모님 번호가 단축번호 2번이 됐다. 1번은 엄마다."] },
    { key: "abs_lv4", title: "리뷰 50개 숙소", test: (s) => (s.ab?.units || []).reduce((a, u) => a + (u.stays || 0), 0) >= 50 && Math.max(0, ...(s.ab?.units || []).map((u) => u.rating || 0)) >= 4.7, lines: ["쉰 번째 리뷰가 달렸다. 일곱 개 나라 말이 섞여 있었다.", "\"Clean, cozy, kind host.\" 같은 세 단어를 쉰 번 들었다."] },
    { key: "abs_shoot", title: "주방이 화면에 나왔다", test: (s) => (s.sx?.airbnb?.shoot || 0) >= 1, lines: ["식기 광고 속 주방이 내 숙소였다.", "조명 여섯 개가 빠져나간 자리에서 머그컵 하나를 다시 정리했다."] },
    { key: "abs_legal", title: "신고증을 붙인 날", test: (s) => (s.sx?.airbnb?.legalMine || 0) >= 12 && (s.ab?.units || []).length >= 1, lines: ["영업신고증 사진이 리스팅 첫 줄에 1년째 걸려 있었다.", "단속 뉴스가 나와도 이제 그냥 넘겼다."] },
    { key: "abs_storm", title: "빈 달력을 버텼다", test: (s) => (s.sx?.airbnb?.crisisOk || 0) >= 1, lines: ["관광객이 끊긴 달, 출장자와 촬영팀으로 달력을 채웠다.", "외국인만 보던 숙소가 처음으로 다른 손님을 배웠다."] },
    { key: "abs_lv5", title: "숙소 브랜드", test: (s) => (s.ab?.units || []).length >= 2 && (s.sx?.airbnb?.goodM || 0) >= 12 && (s.ab?.units || []).reduce((a, u) => a + (u.stays || 0), 0) >= 50, lines: ["숙소 두 채가 1년 내내 흑자였다. 숙소 이름으로 계정을 따로 만들었다.", "\"We stayed at your other place last year!\" 다시 온 손님이 생겼다."] },
  ],
  perks: [
    { id: "p_abs_manual", n: "4개 국어 매뉴얼", line: "새벽 문의는 이제 기계가 답한다", pro: "외국어 응대 +15%", m: { abLang: 1.15 }, got: "자동 안내 메시지 + 숙박 3,500팀", test: (s) => !!s.sx?.airbnb?.autoMsg && (s.ab?.units || []).reduce((a, u) => a + (u.stays || 0), 0) >= 3500 },
    { id: "p_abs_nb", n: "동네가 아는 호스트", line: "할머니가 귤을 주신다", pro: "숙소 별점 +0.05", m: { abStar: 0.05 }, got: "이웃 인심 55 + 숙소 운영 2년", test: (s) => (s.sx?.airbnb?.nb || 0) >= 55 && (s.ab?.units || []).some((u) => u.months >= 24) },
  ],
  perkCine: { p_abs_manual: "abs_lv4", p_abs_nb: "abs_legal" },
  synergy: [
    { id: "abs_photo", kind: "good", n: "사진 동호회 × 에어씨앤씨", need: "사진 동호회 + 에어씨앤씨", desc: "예약은 사진 첫 장에서 결정: 숙소 사진·소개 점수가 매달 +1(85까지)", test: (s) => act(s, "airbnb") && (s.hb?.joined || []).includes("photo") },
    { id: "abs_night", kind: "bad", n: "밤 11시 체크인 × 회사", need: "에어씨앤씨 2채 + 직접 응대 + 자동 안내 없음 + 회사 다니는 중", desc: "늦은 체크인 메시지가 잠을 깎는다: 매달 스태미너 −2", test: (s) => act(s, "airbnb") && (s.ab?.units || []).length >= 2 && !s.ab?.cohost && !s.sx?.airbnb?.autoMsg && company(s) },
  ],
};
