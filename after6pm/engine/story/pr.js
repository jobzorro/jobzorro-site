// 기존 투잡 'pr'(파티룸) 이야기 보강. 규약: engine/story/README.md
// 돈 계산·행동·보드는 engine/pr.js 그대로. 여기는 이야기 이벤트·마일스톤·특전·시너지만 덧붙인다.
// 기획 데이터 16장(JOBEV partyroom)은 원래 engine/pr.js jobEvent 가 일반 효과로 띄우던 것을 여기서 제대로 된 효과로 다시 지어 띄운다(j01~j16).
// 같은 장면이 두 번 뜨지 않게 init/migrate 에서 s.seen["job_partyroom_eXX"] = -1 로 jobEvent 쪽을 쉬게 한다(TAKEOVER).
// 나머지 새 이벤트는 원래 엔진 장면(성수기 사고 7종, 권리금·인수 제안, 건물주 내용증명 통보)과 겹치지 않게 새로 지었다.
import * as SYN from "../syn.js";
import { addMoney, won, CHAR } from "../core.js";
import * as PR from "../pr.js"; // 정리(양도·폐업)·매물·손절 진단은 원래 엔진 함수를 쓴다(함수 안에서만 부름)

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const act = (s, k) => !!s.sj?.active?.includes(k);
const company = (s) => !(s.co?.quit || s.co?.fired);
const openRooms = (s) => (s.pr?.rooms || []).filter((x) => x.status === "open");
const TAG = "파티룸";
const TAKEOVER = true; // false 로 바꾸면 기획 16장은 원래 jobEvent 가 다시 띄우고, 이 파일의 j01~j16 은 안 뜬다
const JIDS = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, "0"));

const DEF = () => ({ seen: [], evT: -99, cum: 0, inv1: 0, goodM: 0, roomM: 0, fixN: 0, instant: null, fake: null, teen: null, pump: false, marble: null, safety: null, story: 0 });

// 이벤트 돈 크기 기준: 최근 3달 파티룸 이익(80만~500만, 물가 반영). 효과는 이 값의 10~30%
function unit(s) {
  const pi = SYN.pi(s), h = (s.pr?.profitHist || []).slice(-3);
  const avg = h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0;
  return clamp(avg, 80 * pi, 500 * pi);
}
const m = (u, f) => Math.max(5, Math.round(u * f / 5) * 5);

// ───────── 이벤트 목록 ─────────
// ph: early(첫 지점 시작) · mid(별점 4.5~만석) · late(2호점 이후) · crisis(조건이 맞으면 언제든)
// room: 이 장면이 가리키는 지점(prs_rating·prs_buzz·prs_selfq 가 그 지점에 적용). 없으면 운영 중인 모든 지점
function evList(s) {
  const P = s.pr, X = s.sx.pr, u = unit(s), pi = SYN.pi(s);
  const open = openRooms(s), first = open.slice().sort((a, b) => b.months - a.months)[0];
  const setup = P.rooms.find((x) => x.status === "setup" && x.self > 0);
  const fresh = open.find((x) => x.months === 0);
  const old = open.filter((x) => x.months >= 18).sort((a, b) => b.months - a.months)[0];
  const base = open.find((x) => x.floor === -1);
  const cust = Object.keys(s.rel || {}).find((id) => CHAR[id]?.customer?.board === "partyroom" && !s.rel[id].spouse);
  const lv = P.lv || 1, co = company(s);
  const hours = Math.round(open.reduce((a, x) => a + (x.ap || 0), 0) * 6 + open.length * 4 + 6);
  const prof = Math.round((P.profitHist || []).slice(-3).reduce((a, b) => a + b, 0) / 3);
  const newest = P.rooms.slice().sort((a, b) => (a.months || 0) - (b.months || 0))[0];
  const loud = open.filter((x) => x.hid?.sound !== "좋음").sort((a, b) => (b.complaints || 0) - (a.complaints || 0))[0];
  const fresh1 = open.find((x) => x.months <= 1);
  const noticed = P.rooms.find((x) => x.notice && x.notice - s.t >= 1);
  const weak = open.slice().sort((a, b) => PR.avgProfit(a) - PR.avgProfit(b))[0];
  const only = open.length === 1 ? open[0] : null;
  return [
    // ── 기획 데이터 16장(partyroom.json events). 원래 jobEvent 대신 여기서 띄운다(TAKEOVER) ──
    { id: "j01", ph: "early", ok: () => !!newest && newest.months <= 1, room: newest, t: "건물주에게 말할까",
      x: `${newest?.name || "새 지점"} 계약서에 도장을 찍기 전날, 중개사가 속삭였다. "그냥 '스튜디오'라고 하세요. 파티룸이라고 하면 안 줘요." 건물주 성향은 아직 모른다.`,
      c: [{ t: `파티룸이라고 솔직히 밝히고 방음을 약속한다 (${won(m(u, 0.1))})`, eff: { prs_cash: -m(u, 0.1), prs_ll: 1 }, text: "\"시끄럽게만 안 하면 돼요. 11시 이후엔 조용히.\" 건물주가 내 번호를 저장했다." },
          { t: "스튜디오라고 둘러댄다", eff: { prs_cash: m(u, 0.05), prs_ll: -1 }, text: "계약은 쉬웠다. 첫 민원이 들어오는 날 거짓말도 같이 들킬 거다." }] },
    { id: "j02", ph: "early", ok: () => !!(newest || setup) && X.marble === null, room: newest || setup, t: "중고 600만 원의 기적",
      x: "주말마다 동네 중고 앱을 뒤졌다. 소파, 빔프로젝터, 노래방 기계까지 600만 원에 맞췄다. 마지막 남은 건 30만 원짜리 대리석 테이블이다. 사진발은 최고다.",
      c: [{ t: `사진발 좋은 대리석 테이블 (${won(m(u, 0.12))})`, eff: { prs_cash: -m(u, 0.12), prs_buzz: 6, prs_set: "marble" }, text: "조명 아래 대리석이 반짝인다. 썸네일이 확 살았다. 모서리가 좀 날카롭긴 하다." },
          { t: `튼튼한 원목 테이블 (${won(m(u, 0.08))})`, eff: { prs_cash: -m(u, 0.08), prs_set: "wood" }, text: "사진은 평범하다. 대신 누가 올라가 춤을 춰도 끄떡없다." }] },
    { id: "j03", ph: "early", ok: () => !!fresh1, room: fresh1, t: "시간당 3만 원을 1만 5천 원에",
      x: "오픈 첫 달, 정상가 시간당 3만 원을 1만 5천 원으로 내렸다. 'NEW' 배지와 할인가가 겹치자 예약이 하나둘 들어온다. 남는 돈은 거의 없다.",
      c: [{ t: "한 달 내내 리뷰 쌓는 기간으로 버틴다", eff: { prs_cash: -m(u, 0.15), prs_rev: 8, prs_rating: 0.03, item: "m_receipt" }, text: "한 달 동안 월세만 겨우 냈다. 대신 리뷰 여덟 개가 쌓였다." },
          { t: "2주 만에 할인을 끝낸다", eff: { prs_cash: m(u, 0.08), prs_rev: 2, prs_buzz: -3 }, text: "통장은 덜 아프다. 리뷰 탭은 아직 휑하다." }] },
    { id: "j04", ph: "early", ok: () => !!first && first.months <= 6, room: first, t: "지인 생일파티 다섯 번",
      x: "친구들 모임을 전부 우리 파티룸으로 몰았다. 조건은 하나, 앱으로 정식 예약하고 리뷰 남기기. 단톡방에 '또 거기야?'가 올라온다.",
      c: [{ t: `재료비만 받고 다섯 팀을 받는다 (${won(m(u, 0.05))} 손해)`, eff: { prs_cash: -m(u, 0.05), prs_rev: 5, prs_rating: 0.03, mental: -2 }, text: "리뷰 다섯 개. 다음 모임 장소 투표에서 우리 공간이 빠졌다." },
          { t: "공짜로 쓰게 하고 사진만 받는다", eff: { prs_buzz: 3, mental: 1 }, text: "사진은 예쁘다. 앱 기록이 없으니 검색 순위는 그대로다." }] },
    { id: "j05", ph: "mid", ok: () => lv >= 2 && !!loud, room: loud, t: "새벽 1시 아래층",
      x: `새벽 1시, ${loud?.name || ""} 아래층 세입자에게서 전화가 왔다. 노래방 소리에 천장이 울린다고 한다. 이번 달만 세 번째다.`,
      c: [{ t: `방음 폼보드 + 밤 11시 이후 노래방 잠금 (${won(m(u, 0.2))})`, eff: { prs_cash: -m(u, 0.2), prs_rating: -0.03, prs_sound: 1, prs_fix: 1 }, text: "\"노래방 왜 안 돼요?\" 후기가 하나 달렸다. 아래층 전화는 끊겼다." },
          { t: "사과만 하고 넘어간다", eff: { prs_comp: 1, mental: -2 }, text: "\"네네, 죄송합니다.\" 다음 주에 같은 번호가 또 떴다. 건물주에게도 말이 들어갔다." }] },
    { id: "j06", ph: "mid", ok: () => lv >= 2 && open.length >= 1, room: first, t: X.marble === true ? "깨진 대리석" : "와인 지도",
      x: `체크아웃 사진을 확인했다. ${X.marble === true ? "대리석 테이블 모서리가 깨졌고, " : ""}와인 얼룩이 소파에 지도를 그렸다. 손님은 원래 그랬다고 한다.`,
      c: [{ t: "입실 전 사진을 근거로 파손비를 청구한다", check: { stat: "talk", dc: 45 }, ok: { text: "입실 사진을 보내자 조용히 입금됐다. 이용 규칙에 사진 촬영 안내를 넣었다.", eff: { prs_cash: m(u, X.marble === true ? 0.12 : 0.08) } }, ng: { text: "\"사장이 협박해요.\" 돈은 반만 받았고 별 1개가 따라왔다.", eff: { prs_cash: m(u, 0.04), prs_rating: -0.05 } } },
          { t: "넘어가고 다음부터 규칙을 강화한다", eff: { prs_cash: -m(u, X.marble === true ? 0.15 : 0.08), mental: -3 }, text: "세탁비와 수리비는 내 몫. 보증금 제도를 만들까 한참 고민했다." }] },
    { id: "j07", ph: "mid", ok: () => lv >= 2 && (open.some((x) => x.concept === "bridal") || [3, 4, 9].includes(s.cal)), t: "브라이덜샤워 성지",
      x: "결혼 준비 카페에 '가성비 브라이덜샤워 공간 추천' 후기가 올라왔다. 우리 파티룸이다. 하루 만에 다음 달 토요일이 전부 찼다.",
      c: [{ t: "브라이덜 데코 세트를 유료 옵션으로 판다", eff: { prs_cash: m(u, 0.25), hp: -5, stat: { sense: 1 }, prs_buzz: 4 }, text: "베일·가랜드·꽃 장식 세트. 객단가가 25% 올랐다. 금요일 밤이 데코 준비로 사라졌다." },
          { t: "주말 요금만 살짝 올린다", eff: { prs_cash: m(u, 0.12) }, text: "손 하나 안 대고 더 벌었다. 후기 사진은 평범했다." }] },
    { id: "j08", ph: "mid", ok: () => co && lv >= 2 && open.length >= 1, t: "청소 알바 노쇼",
      x: "다음 예약까지 1시간. 청소를 맡긴 알바가 연락이 안 된다. 나는 회사 회식 1차 자리에 앉아 있다. 팀장님이 잔을 채워 준다.",
      c: [{ t: "\"집에 일이 생겨서요\" 빠져나와 직접 청소한다", eff: { eye: 8, hp: -10, prs_fix: 1 }, text: "택시 안에서 고무장갑을 꼈다. 다음 날 팀장님이 \"어제 무슨 일이야?\" 하고 물었다." },
          { t: "다음 손님에게 사과하고 30분 무료 연장을 준다", eff: { prs_cash: -m(u, 0.06), prs_rating: -0.04 }, text: "\"이 정도면 괜찮아요.\" 말은 그랬는데 별점은 4개였다." }] },
    { id: "j09", ph: "mid", ok: () => lv >= 2 && open.length >= 1, t: "텅 빈 화요일",
      x: "달력을 보니 평일 낮이 온통 하얗다. 월세는 화요일에도 나간다. 근처 플라워 강사가 원데이 클래스 장소를 찾는다는 글이 보인다.",
      c: [{ t: "평일 낮 정기 대관으로 강사와 계약한다", check: { stat: "mkt", dc: 42 }, ok: { text: "매주 화·목 오전 고정. 작아도 매달 꼬박꼬박 들어온다.", eff: { prs_cash: m(u, 0.15), stat: { mkt: 1 } } }, ng: { text: "강사가 더 싼 공방을 찾았다. 평일은 여전히 하얗다.", eff: { stat: { mkt: 0.5 } } } },
          { t: "평일 낮 50% 타임세일을 건다", eff: { prs_cash: m(u, 0.1), prs_buzz: 2 }, text: "예약은 늘었다. 할인가를 기억한 손님이 주말에도 깎아 달라고 한다." }] },
    { id: "j10", ph: "late", ok: () => lv >= 3 && [11, 12].includes(s.cal), t: "12월의 행복한 비명",
      x: "12월 주말이 11월 초에 이미 매진됐다. 문의가 하루 스무 통이다. 토요일 저녁 7시는 앱 전체에서 가장 붐비는 시간이다.",
      c: [{ t: "성수기 요금을 30% 올린다", eff: { prs_cash: m(u, 0.3), prs_rating: -0.04 }, text: "그래도 다 찼다. '연말이라고 바가지' 후기가 하나 섞였다." },
          { t: "가격은 두고 단골에게 우선 예약권을 준다", eff: { prs_cash: m(u, 0.12), prs_rating: 0.05, prs_buzz: 6 }, text: "\"사장님 저희 기억하세요?\" 작년 크리스마스 팀이 또 왔다." }] },
    { id: "j11", ph: "late", ok: () => P.rooms.length <= 2 && !!first && first.months >= 8 && lv >= 3, t: "2호점은 4인용",
      x: "1호점이 자리를 잡았다. 같은 동네에 8평 공실이 나왔다. 지금 지점은 10명용, 여기는 4명 소모임용으로 쓰면 손님을 서로 뺏지 않을 것 같다.",
      c: [{ t: "소형 2호점 매물을 보러 간다", eff: { hp: -4, prs_know: 3, stat: { num: 0.5 }, prs_listing: "small" }, text: "평수·월세·화장실을 수첩에 적었다. 파티룸 보드 매물 목록에 올려 뒀다. 계약은 숨은 정보부터 확인하고(매물은 두 달 뒤 빠진다)." },
          { t: "렌탈 스튜디오를 공부해 본다", eff: { hp: -3, stat: { sense: 1 } }, text: "촬영 수요는 평일 낮에 있다. 조명 장비 값을 보고 한숨이 나왔다." },
          { t: "아직은 1호점에 집중한다", eff: { mental: 3 }, text: "한 곳을 제대로 돌리는 것도 일이다." }] },
    { id: "j12", ph: "late", ok: () => co && open.length >= 3 && prof >= 400 * pi, t: "연봉만큼 버는 부업",
      x: `세 곳 합산 월 순익 ${won(prof)}. 내 월급을 넘었다. 사직서를 쓸까, 4호점을 낼까. 선퇴사는 하지 말라는 말이 떠오른다.`,
      c: [{ t: "6개월~1년 생활비부터 모으고 결정한다", eff: { mental: 4, stat: { num: 1 } }, text: "엑셀에 '전업 D-day' 시트를 만들었다. 비수기 석 달 치 월세가 먼저다." },
          { t: "투잡을 유지한다", eff: { hp: -6, mental: 2 }, text: "월급은 비가 와도 들어온다. 그게 파티룸이 못 주는 것이다." }] },
    { id: "j13", ph: "crisis", ok: () => lv >= 2 && X.safety === null, t: "스프링클러 의무화 뉴스",
      x: "다른 동네 파티룸 화재 뉴스가 떴다. 정부가 다중이용시설 기준을 파티룸에도 적용하는 방안을 검토한다고 한다. 지하 공간 소방 공사 견적이 만만치 않다.",
      c: [{ t: `소화기·비상구 안내·화재보험부터 보강한다 (${won(m(u, 0.15))})`, eff: { prs_cash: -m(u, 0.15), mental: 2, prs_set: "safe" }, text: "비상구 표지등을 달고 보험 증서를 파일에 꽂았다. 마음 한쪽이 가벼워졌다." },
          { t: "규제가 나올 때까지 기다린다", eff: { prs_set: "wait" }, text: "검토는 검토일 뿐이다. 아마도." }] },
    { id: "j14", ph: "crisis", ok: () => !!noticed, room: noticed, t: "내용증명, 마지막 협상",
      x: `${noticed?.name || ""} 계약 해지까지 ${noticed ? Math.max(0, noticed.notice - s.t) : 0}달. 이대로면 권리금은 날아간다. 건물주에게 마지막으로 찾아가 볼까.`,
      c: [{ t: `방음 공사·운영시간 제한을 약속하고 재협상한다 (${won(m(u, 0.3))})`, check: { stat: "talk", dc: 52 }, ok: { text: "\"밤 11시 이후 노래방 금지, 지켜 주면 연장해 드리죠.\" 계약서를 다시 썼다.", eff: { prs_cash: -m(u, 0.3), prs_notice: 1, stat: { talk: 1 } } }, ng: { text: "건물주는 고개를 저었다. 방음 견적서만 손에 남았다.", eff: { prs_cash: -m(u, 0.1), mental: -5 } } },
          { t: "조용한 새 매물을 찾아 옮길 준비를 한다", eff: { mental: -3, prs_know: 2, prs_listing: "quiet" }, text: "같은 상권에 방음 좋은 건물을 찾았다. 건물주도 파티룸 환영. 보드 매물 목록에 올려 뒀다. 보증금은 통보 기간이 끝나면 돌려받는다. 리뷰는 새 지점에서 처음부터다." }] },
    { id: "j15", ph: "crisis", ok: () => !!s.era?.fee && open.length >= 1, t: "수수료가 올랐습니다",
      x: "주력 공간대여앱이 수수료 개편을 공지했다. 매출의 10%였던 수수료가 최대 20%로 오른다. 한 달 순익에서 4분의 1이 증발한다.",
      c: [{ t: "포털 지도 예약·인별 직접 예약으로 채널을 나눈다", eff: { hp: -5, stat: { mkt: 1 }, prs_buzz: 5, prs_cash: m(u, 0.1) }, text: "직접 예약 손님은 수수료가 0원. 대신 입금 확인을 내가 한다." },
          { t: "시간당 요금을 올려 전가한다", eff: { prs_cash: m(u, 0.08), prs_buzz: -4 }, text: "숫자는 맞췄다. 비교 검색에서 한 칸씩 밀렸다." }] },
    { id: "j16", ph: "crisis", ok: () => !!s.era?.pandemic && open.length >= 1, t: "모임 금지령",
      x: "새 감염병 유행으로 사적 모임 인원 제한이 발표됐다. 다음 달 예약이 하루 만에 전부 취소됐다. 월세 고지서는 취소되지 않는다.",
      c: [{ t: "소규모 촬영·온라인 강의 녹화 공간으로 임시 전환한다", eff: { prs_cash: m(u, 0.2), hp: -5, mental: -3, stat: { sense: 1 } }, text: "조명 두 개와 흰 벽. 영상 찍는 세 팀이 평일 낮을 채웠다." },
          { t: "예비비로 버틴다", eff: { mental: -8 }, text: "통장 잔고가 매달 월세만큼 줄어든다. 비수기 대비금이 이럴 때 쓰는 거였다." },
          { t: weak ? `${open.length >= 2 ? "가장 약한 " + weak.name + "부터" : weak.name + " 문을"} 닫는다 (보증금 − 원상복구 = +${won(PR.closeValue(s, weak))})` : "약한 지점부터 정리한다", eff: { mental: 2, prs_know: 2, prs_close: "weak" }, text: "모임 금지령 중엔 권리금 받고 넘길 사람이 없다. 철거 업체를 불렀다. 버티는 것도 정리하는 것도 다 비용이다." }] },
    { id: "c07", ph: "crisis", ok: () => typeof X.safety === "number" && s.t - X.safety >= 8, t: "의무화 확정",
      x: "기다리던 그 뉴스가 확정됐다. 파티룸도 소방 기준 적용, 유예 6개월. 미리 해 둔 사장님들은 단톡방에서 조용하다. 견적서를 다시 받았다.",
      c: [{ t: `바로 공사한다 (${won(m(u, 0.3))})`, eff: { prs_cash: -m(u, 0.3), prs_set: "safe" }, text: "업체들이 바빠져서 값이 올랐다. 미리 할 걸." },
          { t: "유예 기간 끝까지 미룬다", eff: { prs_cash: -m(u, 0.25), mental: -4, prs_set: "safe" }, text: "막판에 몰려 더 비쌌다. 공사 사흘 동안 예약도 막았다." }] },
    // ── 방 하나의 위험 · 묶음 효과(11-21) ──
    { id: "o01", ph: "mid", ok: () => !!only && P.rooms.length === 1 && only.months >= 4, room: only, t: "하나뿐인 방",
      x: `금요일 밤 ${only?.name || "1호점"} 천장에서 물이 샌다. 이번 주말 예약 네 팀, 갈 곳이 없다. 사장님 단톡방에 물었더니 세 곳 운영하는 선배가 답했다. "저는 그럴 때 옆 지점으로 옮겨 드려요. 방이 하나면 사고 하나에 그달이 통째로 날아가요."`,
      c: [{ t: `네 팀 다 환불하고 2호점 조건을 적는다 (${won(m(u, 0.15))})`, eff: { prs_cash: -m(u, 0.15), prs_know: 3, stat: { num: 0.5 } }, text: "수첩에 적었다. '2호점: 1호점 6달 흑자 뒤 · 같은 동네 · 다른 인원 · 청소 업체·예약 프로그램 같이 쓰기.' 공실·월세·청소 위험이 한 방에 다 걸려 있었다." },
          { t: `근처 다른 파티룸에 손님을 넘겨 준다 (${won(m(u, 0.08))})`, check: { stat: "talk", dc: 40 }, ok: { text: "경쟁 사장님이 받아 줬다. \"다음엔 저도 넘길게요.\" 손님들은 별점 대신 고맙다는 문자를 남겼다.", eff: { prs_cash: -m(u, 0.08), prs_buzz: 3 } }, ng: { text: "다들 꽉 찼다. 결국 환불. 방 하나의 무게를 배웠다.", eff: { prs_cash: -m(u, 0.15), mental: -3 } } }] },
    { id: "o02", ph: "late", ok: () => open.length >= 2, room: first, t: "옆 방으로 모십니다",
      x: `토요일 저녁 7시, ${first?.name || "1호점"}에 두 팀이 겹쳐 잡혔다. 예전 같으면 한 팀은 환불이었다. 지금은 10분 거리에 방이 하나 더 있다.`,
      c: [{ t: "한 팀을 다른 지점으로 모시고 음료를 서비스한다", eff: { prs_cash: m(u, 0.08), prs_rating: 0.02, mental: 2 }, text: "\"오히려 여기가 더 예쁜데요?\" 겹친 예약이 매출이 됐다. 묶음으로 굴린다는 게 이런 거다." },
          { t: "늦게 잡은 팀에 사과하고 환불한다", eff: { prs_cash: -m(u, 0.04) }, text: "규정대로 했다. 빈 2호점 사진이 휴대폰에 떠 있었다." }] },

    // ── 초반: 첫 지점 ──
    { id: "s01", ph: "early", ok: () => !!setup, room: setup, t: "철거해 보니",
      x: `${setup?.name || "새 지점"} 셀프 공사 이틀째. 장판을 걷어 내니 바닥 한쪽이 시커멓다. 곰팡이다. 오픈은 다음 달, 월세는 이미 나가고 있다.`,
      c: [{ t: `방수 업체를 부른다 (${won(m(u, 0.25))})`, eff: { prs_cash: -m(u, 0.25), prs_selfq: 0.03 }, text: "사장님이 바닥을 두드려 보더니 혀를 찼다. \"이거 덮었으면 여름에 냄새 올라와요.\"" },
          { t: "곰팡이 제거제 + 데코타일로 직접 덮는다", check: { stat: "hands", dc: 45 }, ok: { text: "주말 이틀을 바닥에 엎드려 보냈다. 감쪽같다.", eff: { hp: -8, prs_selfq: 0.02, stat: { hands: 1 } } }, ng: { text: "타일 이음새가 들떴다. 손님 눈엔 다 보일 거다.", eff: { hp: -8, prs_selfq: -0.06 } } }] },
    { id: "s02", ph: "early", ok: () => !!fresh && P.rooms.length === 1, room: fresh, t: "검수 반려",
      x: `공간대여 앱 '우주공간' 등록 신청 사흘 만에 답이 왔다. "사진이 어둡고 공간 구성이 잘 보이지 않습니다. 보완 후 재신청해 주세요." 오픈 특가 공지는 이미 올렸다.`,
      c: [{ t: `공간 전문 사진작가를 부른다 (${won(m(u, 0.2))})`, eff: { prs_cash: -m(u, 0.2), prs_buzz: 10 }, text: "광각 렌즈 하나로 20평이 30평처럼 나왔다. 검수는 하루 만에 통과." },
          { t: "오후 4시 자연광에 폰으로 다시 찍는다", check: { stat: "sense", dc: 42 }, ok: { text: "창가 빛이 바닥에 길게 누웠다. \"사진 너무 예뻐요\" 첫 문의가 왔다.", eff: { hp: -4, prs_buzz: 7, stat: { sense: 1 } } }, ng: { text: "두 번 더 반려됐다. 오픈 첫 주를 검수에 날렸다.", eff: { hp: -4, mental: -5, prs_buzz: 1 } } }] },
    { id: "s03", ph: "early", ok: () => !!first && lv <= 3 && first.months <= 10 && X.instant === null, t: "바로결제 버튼",
      x: "앱 설정에 '즉시예약(바로결제)'이 있다. 예약 많은 상위 파티룸의 90%가 켜 놨다고 한다. 대신 누가 오는지 모르고 받는다. 지금은 문의를 하나하나 승인하고 있다.",
      c: [{ t: "켠다. 새벽에도 예약이 들어오게", eff: { prs_buzz: 8, prs_set: "instant" }, text: "켜자마자 밤 11시에 결제 알림. 자다가 깼다." },
          { t: "승인제 유지. 손님을 보고 받는다", eff: { mental: 2, prs_set: "noinstant" }, text: "답장이 늦은 사이 두 팀이 다른 곳을 잡았다. 그래도 마음은 편하다." }] },
    { id: "s04", ph: "early", ok: () => !!first && first.months >= 1 && first.months <= 10, room: first, t: "비밀번호가 안 돼요",
      x: `토요일 밤 10시, 까톡. "사장님 ${first?.name || ""} 문이 안 열려요ㅠㅠ 케이크 녹아요." 도어락 건전지가 나갔다. 집에서 지하철로 40분.`,
      c: [{ t: `택시 타고 달려간다 (${won(m(u, 0.06))})`, eff: { prs_cash: -m(u, 0.06), hp: -8, prs_rating: 0.05, prs_fix: 1 }, text: "현관에서 생일 주인공과 같이 '생일 축하합니다'를 불렀다. 별 5개." },
          { t: "편의점 9V 건전지 비상 열기를 전화로 알려 준다", check: { stat: "talk", dc: 40 }, ok: { text: "\"열렸어요!!\" 영상통화 너머로 환호가 터졌다.", eff: { prs_rating: 0.02, prs_fix: 1 } }, ng: { text: "20분 동안 통화했다. 결국 환불했고 후기에 '입실부터 실패'.", eff: { prs_cash: -m(u, 0.1), prs_rating: -0.06, mental: -4 } } }] },
    { id: "s05", ph: "early", ok: () => !!first && first.months >= 1 && lv <= 3, room: first, t: "청소 슬롯 30분",
      x: "토요일은 오후 2시·저녁 7시 두 타임. 사이에 청소 1시간을 비워 두니 하루에 한 타임이 더 안 들어간다. 30분으로 줄이면 토요일 하루 4만 원이 더 남는다.",
      c: [{ t: "30분으로 줄이고 한 타임 더 판다", eff: { prs_cash: m(u, 0.12), hp: -6, prs_rating: -0.04 }, text: "30분 안에 쓰레기·설거지·바닥·소독. 다음 손님이 머리카락을 찍어 보냈다." },
          { t: "1시간 유지. 청소가 곧 별점이다", eff: { prs_rating: 0.03, mental: 1 }, text: "\"사진보다 더 깨끗해요.\" 이런 후기는 돈 주고도 못 산다." }] },
    { id: "s06", ph: "early", ok: () => !!first && first.months >= 1, t: "엄마의 고무장갑",
      x: "일요일 아침, 엄마가 반찬통을 들고 지점 앞에 서 있었다. \"너 혼자 이걸 어떻게 다 치우니.\" 이미 고무장갑을 끼고 있다.",
      c: [{ t: "같이 청소한다", eff: { family: 5, hp: 4, mental: -2 }, text: "\"월세가 얼마라고? 회사는 괜찮고?\" 잔소리 반, 걸레질 반. 그래도 빨리 끝났다." },
          { t: "괜찮다고 돌려보낸다", eff: { family: -3, hp: -4 }, text: "반찬통만 받았다. 혼자 남은 공간이 유난히 넓다." }] },

    // ── 중반: 별점 4.5 ~ 토요일 만석 ──
    { id: "m01", ph: "mid", ok: () => lv >= 2 && open.length >= 1, t: "토요일 저녁 7시",
      x: "공간 예약이 가장 많은 시간은 토요일 저녁 7시다. 이번 달도 그 칸만 석 달 치가 찼다. 나머지 시간은 듬성듬성하다.",
      c: [{ t: "토요일 저녁만 25% 올린다", eff: { prs_cash: m(u, 0.15), prs_buzz: -3 }, text: "그래도 찼다. 다만 '비싸다' 한 줄이 후기에 섞였다." },
          { t: "가격은 두고 평일 저녁 묶음 할인을 건다", check: { stat: "mkt", dc: 45 }, ok: { text: "\"목요일 저녁이 더 싸네?\" 회사 동기 모임이 평일로 옮겨 왔다.", eff: { prs_cash: m(u, 0.12), prs_buzz: 3 } }, ng: { text: "평일은 여전히 비었다. 할인 배너만 덩그러니.", eff: { prs_buzz: 1 } } }] },
    { id: "m02", ph: "mid", ok: () => lv >= 2 && X.fake === null, t: "리뷰 10건에 5만 원",
      x: "모르는 번호에서 문자가 왔다. \"사장님, 실사용 후기 10건 5만 원. 사진 포함. 걸린 적 없습니다.\" 경쟁 지점 별점이 왜 4.9인지 알 것 같다.",
      c: [{ t: "한 번만 해 본다", eff: { prs_cash: -5, prs_rating: 0.08, prs_set: "fake" }, text: "다음 날 별 5개가 열 개 달렸다. 말투가 다 비슷하다." },
          { t: "차단한다", eff: { mental: 1, prs_set: "nofake" }, text: "별점 4.6은 내가 진짜로 번 숫자다." }] },
    { id: "m03", ph: "mid", ok: () => lv >= 2 && X.teen === null, t: "교복 입은 단체",
      x: "금요일 밤 예약 손님이 들어가는 걸 CCTV로 봤다. 여섯 명 중 둘이 교복 바지다. 편의점 봉투가 묵직하다. 예약자는 스물두 살로 돼 있다.",
      c: [{ t: "전화해서 신분증을 확인하고, 안 되면 환불한다", check: { stat: "talk", dc: 45 }, ok: { text: "\"…죄송해요.\" 순순히 나갔다. 환불은 해 줬다.", eff: { prs_cash: -m(u, 0.06), mental: -2, prs_set: "noteen", prs_fix: 1 } }, ng: { text: "실랑이 끝에 내보냈다. '불친절' 별 1개가 달렸다.", eff: { prs_cash: -m(u, 0.06), prs_rating: -0.05, prs_set: "noteen" } } },
          { t: "예약자가 성인이니 모른 척한다", eff: { prs_set: "teen" }, text: "아무 일도 없었다. 아직은." }] },
    { id: "m04", ph: "mid", rep: true, ok: () => lv >= 2 && open.length >= 1, t: "50리터 일곱 봉지",
      x: "생일파티가 끝난 자리. 50리터 봉투 일곱 개에 음식물·캔·풍선이 뒤섞여 있다. 수거일에 건물 관리인이 전화했다. \"분리수거 안 하면 다음부터 안 가져갑니다.\"",
      c: [{ t: "'미분리 시 청소비 2만 원' 규칙을 이용 안내에 넣는다", eff: { prs_rating: -0.03, mental: 3 }, text: "몇몇은 투덜댔다. 대신 일요일 밤이 돌아왔다." },
          { t: "일요일 밤마다 직접 분리해서 내놓는다", eff: { hp: -8, prs_rating: 0.02, prs_fix: 1 }, text: "고무장갑 너머로 미지근한 콜라가 스몄다. 관리인이 처음으로 웃었다." }] },
    { id: "m05", ph: "mid", ok: () => lv >= 2 && open.length >= 1, room: first, t: "두고 간 반지",
      x: "어젯밤 프러포즈 대관 팀이 나간 자리, 소파 틈에서 반지 케이스가 나왔다. 열어 보니 반짝인다. 연락하니 \"오늘 부모님 상견례인데…\" 목소리가 떨린다.",
      c: [{ t: `퀵으로 바로 보내 준다 (${won(m(u, 0.04))})`, eff: { prs_cash: -m(u, 0.04), prs_buzz: 8, prs_rating: 0.03 }, text: "\"사장님 덕분에 살았어요.\" 그날 밤 인별에 우리 공간 사진이 올라왔다." },
          { t: "보관해 두고 찾으러 오라고 한다", eff: { prs_buzz: 1 }, text: "저녁에 숨이 턱까지 찬 손님이 왔다. 고맙다는 말은 짧았다." }] },
    { id: "m06", ph: "mid", rep: true, ok: () => lv >= 2 && open.length >= 1, t: "1점 테러",
      x: "네이바 지도에 별 1개. \"벌레 나왔어요. 위생 최악.\" 예약 기록에는 그런 이름이 없다. 길 건너 새로 생긴 파티룸이 떠오른다.",
      c: [{ t: "예약 내역·청소 사진으로 신고서를 쓴다", check: { stat: "write", dc: 45 }, ok: { text: "사흘 뒤 리뷰가 내려갔다. 신고서 양식은 저장해 뒀다.", eff: { prs_rating: 0.03, stat: { write: 0.5 }, prs_fix: 1 } }, ng: { text: "\"이용자의 의견으로 판단됩니다.\" 리뷰는 그대로다.", eff: { prs_rating: -0.05, mental: -5 } } },
          { t: "정중한 답글만 단다", eff: { prs_rating: -0.02, mental: -2 }, text: "\"방문 기록이 확인되지 않아 연락 부탁드립니다.\" 다른 손님들이 그 답글을 읽었다." }] },
    { id: "m07", ph: "mid", ok: () => lv >= 2 && (P.sys?.cleanContract || open.length >= 2), t: "청소 이모님의 문자",
      x: "\"사장님, 다음 달부터 회당 2만5천 원 받아야겠어요. 다른 데는 3만 원 줘요.\" 한 달 청소만 40번이 넘는다.",
      c: [{ t: `올려 드린다 (한 번에 ${won(m(u, 0.12))} 정도)`, eff: { prs_cash: -m(u, 0.12), mental: 2 }, text: "\"사장님은 깔끔하게 쓰니까 오래 할게요.\" 그 말이 제일 비쌌다." },
          { t: "동네 구인 앱으로 새 사람을 구한다", check: { stat: "num", dc: 45 }, ok: { text: "꼼꼼한 대학생을 구했다. 체크리스트 사진까지 보내 준다.", eff: { hp: -4, prs_cash: m(u, 0.05) } }, ng: { text: "첫 주에 두 번 펑크. 결국 내가 갔다. 별점도 흔들렸다.", eff: { hp: -10, prs_rating: -0.05 } } }] },
    { id: "m08", ph: "mid", ok: () => lv >= 2 && !X.pump, t: "풍선 200개의 밤",
      x: "풍선·폴라로이드 옵션을 붙였더니 손님 절반이 고른다. 객단가는 25% 올랐다. 문제는 금요일 밤마다 풍선 200개를 내가 분다는 것.",
      c: [{ t: `전동 펌프와 완성형 가랜드를 산다 (${won(m(u, 0.1))})`, eff: { prs_cash: -m(u, 0.1), hp: 3, prs_set: "pump" }, text: "10분이면 끝난다. 이걸 왜 이제 샀지." },
          { t: "그냥 분다. 옵션값이 다 남는다", eff: { hp: -8, prs_cash: m(u, 0.06), stat: { hands: 0.5 } }, text: "턱이 얼얼하다. 그래도 통장에 옵션값이 고스란히 쌓였다." }] },
    { id: "m09", ph: "mid", ok: () => lv >= 2 && !!cust, who: cust, t: "단골의 부탁",
      x: `${CHAR[cust]?.name || "단골"}님이 조심스럽게 물었다. "다음 달에 여기서 프러포즈하려고요. 사장님, 풍선이랑 조명 좀 같이 봐 주실 수 있어요?"`,
      c: [{ t: "퇴근하고 같이 꾸며 준다", eff: { hp: -6, aff: 8, prs_buzz: 8, item: "pr_beam" }, text: "\"예스\"가 들렸을 때 문밖에서 같이 숨죽이고 있었다. 영상이 인별에 퍼졌다." },
          { t: "대관만 하고 꾸밈은 맡긴다", eff: { prs_cash: m(u, 0.08), aff: 2 }, text: "다음 날 사진이 왔다. 풍선이 좀 비뚤었지만 둘은 웃고 있었다." }] },

    // ── 회사 눈치(겸직) ──
    { id: "x01", ph: "mid", ok: () => co && lv >= 2 && open.length >= 1, room: first, t: "팀 회식 장소 후보",
      x: `팀장님이 모니터를 돌렸다. "이번 송년회 여기 어때? 후기가 좋던데." 화면 속 사진은 ${first?.name || "내 지점"}이다. 소파에 걸린 담요까지 내가 산 거다.`,
      c: [{ t: "\"좋네요\" 하고 당일엔 청소 업체만 보낸다", check: { stat: "talk", dc: 48 }, ok: { text: "회식 내내 표정 관리를 했다. 팀장님이 별 5개를 남겼다.", eff: { prs_cash: m(u, 0.08), eye: 2 } }, ng: { text: "막내가 화장실 앞 안내문 글씨체를 알아봤다. \"이거 선배 글씨 아니에요?\"", eff: { prs_cash: m(u, 0.08), eye: 10, mental: -4 } } },
          { t: "\"거기 주차가 별로래요\" 다른 데를 민다", eff: { eye: -2, prs_buzz: -2 }, text: "다른 파티룸에서 송년회를 했다. 우리 공간이 더 예뻤다." }] },
    { id: "x02", ph: "mid", rep: true, ok: () => co && open.length >= 1, t: "회의 중 진동 17번",
      x: "금요일 오후 주간 회의. 주머니 속 휴대폰이 17번 떨었다. 예약 문의, 입실 안내, \"사장님 와이파이 비번이요\". 옆자리 과장이 힐끗 본다.",
      c: [{ t: `자동응답 문구와 입실 안내 링크를 만든다 (${won(m(u, 0.05))})`, eff: { prs_cash: -m(u, 0.05), eye: -3, stat: { num: 0.5 } }, text: "와이파이·주차·쓰레기, 질문의 80%가 같았다. 링크 하나로 끝." },
          { t: "책상 밑으로 몰래 답장한다", eff: { eye: 6, prs_rating: 0.02 }, text: "답장은 빨랐다. 회의록에 내 발언은 없었다." }] },

    // ── 후반: 2호점 이후 ──
    { id: "l01", ph: "late", ok: () => !!old, room: old, t: "2년 된 소파",
      x: `${old?.name || ""} 후기에 "사진이랑 달라요"가 또 달렸다. 오픈 때 산 패브릭 소파는 보풀투성이, 조명 하나는 깜빡인다. 가구도 감가상각이 된다는 걸 숫자로 배운다.`,
      c: [{ t: `가구·조명을 새로 들인다 (${won(m(u, 0.3))})`, eff: { prs_cash: -m(u, 0.3), prs_rating: 0.1, prs_buzz: 8 }, text: "사진을 다시 찍었다. 오픈 첫 달 같은 문의가 들어왔다." },
          { t: "커버만 씌우고 조금 더 버틴다", check: { stat: "sense", dc: 50 }, ok: { text: "톤을 맞춘 커버 하나로 새것 같다. 1년은 더 간다.", eff: { prs_cash: -m(u, 0.05), prs_rating: 0.03 } }, ng: { text: "커버가 자꾸 흘러내린다. \"관리 안 하는 곳\" 소리를 들었다.", eff: { prs_cash: -m(u, 0.05), prs_rating: -0.06 } } }] },
    { id: "l02", ph: "late", ok: () => open.length >= 2 || (lv >= 3 && !!first && first.months >= 10), room: first, t: "비밀번호 단톡방",
      x: `새벽 3시, ${first?.name || "지점"} 문열림 알림. 예약은 없다. CCTV 속 낯선 네 명. 지난주 손님이 비밀번호를 동아리 단톡방에 올렸단다.`,
      c: [{ t: `예약마다 일회용 번호가 나오는 도어락으로 바꾼다 (${won(m(u, 0.15))})`, eff: { prs_cash: -m(u, 0.15), mental: 3, prs_fix: 1 }, text: "이제 번호는 입실 30분 전에만 열린다. 새벽 알림이 사라졌다." },
          { t: "매주 직접 번호를 바꾼다", eff: { hp: -5, ap: -1 }, text: "일요일 밤마다 번호를 바꾸고 안내 문자를 다시 쓴다. 한 번은 내가 까먹었다." }] },
    { id: "l03", ph: "late", ok: () => lv >= 4, t: "간이과세 졸업",
      x: "세무서 안내문. \"직전 연도 공급대가가 기준을 넘어 일반과세자로 전환됩니다.\" 이제 부가세를 제대로 떼고, 매입 영수증을 다 챙겨야 한다. 영수증은 차 안 컵홀더에 구겨져 있다.",
      c: [{ t: `세무 대리인에게 맡긴다 (연 ${won(m(u, 0.2))})`, eff: { prs_cash: -m(u, 0.2), mental: 4 }, text: "\"사장님, 청소 용품도 다 경비예요.\" 낸 돈보다 돌려받은 게 많았다." },
          { t: "홈택스 강의를 보며 직접 한다", check: { stat: "num", dc: 52 }, ok: { text: "엑셀 시트 하나로 지점별 매입·매출을 정리했다. 뿌듯하다.", eff: { stat: { num: 1 }, hp: -4 } }, ng: { text: "가산세 고지서가 날아왔다. 배운 값이라 치기엔 아깝다.", eff: { prs_cash: -m(u, 0.25), mental: -6 } } }] },
    { id: "l04", ph: "late", ok: () => lv >= 4 || s.era?.bigcomp, room: first, t: "길 건너 체인점",
      x: `${first?.name || "1호점"} 길 건너에 체인 파티룸이 문을 열었다. 오픈 특가 시간당 1만 원대, 무인 키오스크, 통일된 인테리어. 다음 주 예약이 세 건 빠졌다.`,
      c: [{ t: `한 달 15% 할인으로 맞불 (${won(m(u, 0.2))} 덜 번다)`, eff: { prs_cash: -m(u, 0.2), prs_buzz: 5 }, text: "예약은 지켰다. 체인점은 6개월을 버틸 돈이 있다. 나는?" },
          { t: "체인이 못 하는 걸 판다: 컨셉·손편지·단골 쿠폰", check: { stat: "sense", dc: 50 }, ok: { text: "\"여긴 사장님이 신경 쓴 게 보여요.\" 단골이 돌아왔다.", eff: { hp: -5, prs_rating: 0.05, prs_buzz: 8 } }, ng: { text: "손편지는 아무도 안 읽었다. 가격표만 비교당했다.", eff: { hp: -5, prs_buzz: -4, mental: -4 } } }] },
    { id: "l05", ph: "late", ok: () => lv >= 4 && (P.know || 0) >= 25, t: "\"저도 차리고 싶어요\"",
      x: "인별 DM. \"사장님, 퇴사하고 파티룸 차리려는데 커피 한 잔만 사도 될까요? 보증금 3천에 인테리어 2천 생각 중이에요.\" 6개월~1년 안에 문 닫는 곳이 수두룩하다는 말을 해 줘야 할까.",
      c: [{ t: "만나서 손익표부터 같이 본다", eff: { mental: -2, hp: -3, prs_know: 3, prs_buzz: 3 }, text: "\"선퇴사는 하지 마세요. 회사 다니면서 1년 돌려 보세요.\" 상대 표정이 굳었다가 풀렸다." },
          { t: `1시간 유료 상담으로 받는다 (${won(m(u, 0.15))})`, eff: { prs_cash: m(u, 0.15), stat: { talk: 0.5 } }, text: "질문 리스트를 미리 받았다. 돈을 받으니 나도 더 꼼꼼해졌다." }] },
    { id: "l06", ph: "late", ok: () => lv >= 3 && prof > 0, t: "내 시급은 얼마일까",
      x: `한밤중에 엑셀을 열었다. 최근 석 달 파티룸 순이익은 한 달 ${won(prof)}. 청소·응대·장보기·민원까지 내가 쓴 시간은 한 달 약 ${hours}시간. 시급으로 나누면 약 ${(Math.max(0, Math.round(prof * 10000 / Math.max(1, hours) / 100) * 100)).toLocaleString()}원. 회사 야근 수당이 떠오른다.`,
      c: [{ t: `주말 현장 알바를 쓴다 (한 번에 ${won(m(u, 0.15))})`, eff: { prs_cash: -m(u, 0.15), hp: 6, mental: 4 }, text: "토요일 저녁 처음으로 친구를 만났다. 휴대폰을 덜 봤다." },
          { t: "아직은 내 몸으로 버틴다", eff: { hp: -4, stat: { num: 0.5 } }, text: "숫자는 거짓말을 안 한다. 그래서 더 오래 봤다." }] },

    // ── 위기 ──
    { id: "c01", ph: "crisis", ok: () => typeof X.fake === "number" && s.t - X.fake >= 4, t: "리뷰 작업 적발",
      x: "앱 공지. \"부정 리뷰가 확인된 공간은 검색 노출이 제한됩니다.\" 내 공간 이름 옆에 회색 딱지가 붙었다. 그때 그 열 개다.",
      c: [{ t: "솔직하게 사과문을 올린다", eff: { prs_rating: -0.1, prs_buzz: -6, mental: -4, prs_set: "fakeDone" }, text: "\"한 번이었고, 다시는 안 하겠습니다.\" 댓글이 반반으로 갈렸다." },
          { t: "모른다고 버틴다", check: { stat: "talk", dc: 60 }, ok: { text: "한 달 뒤 딱지가 풀렸다. 등에 식은땀이 아직 남아 있다.", eff: { prs_rating: -0.05, prs_set: "fakeDone" } }, ng: { text: "다른 사장님이 캡처를 돌렸다. 노출 제한 석 달.", eff: { prs_rating: -0.2, prs_buzz: -15, mental: -8, prs_set: "fakeDone" } } }] },
    { id: "c02", ph: "crisis", ok: () => typeof X.teen === "number" && s.t - X.teen >= 3, t: "새벽 2시의 전화",
      x: "모르는 번호. \"여기 파출소인데요, 파티룸 사장님이시죠? 미성년자 음주 신고가 들어와서요.\" 그때 그 교복 바지가 떠올랐다.",
      c: [{ t: `바로 가서 조사에 협조하고 사과한다 (${won(m(u, 0.25))})`, eff: { prs_cash: -m(u, 0.25), hp: -8, prs_rating: -0.05, prs_set: "teenDone", prs_fix: 1 }, text: "아이들 부모님들과 새벽 4시까지 있었다. 그 뒤로 신분증 확인 문구를 크게 붙였다." },
          { t: "\"예약자는 성인이었어요\" 전화로만 해명한다", check: { stat: "talk", dc: 55 }, ok: { text: "이번엔 넘어갔다. 다음은 없다.", eff: { mental: -6, prs_set: "teenDone" } }, ng: { text: "건물주 귀에도 들어갔다. \"우리 건물에서 이런 일은 곤란해요.\"", eff: { prs_cash: -m(u, 0.15), prs_rating: -0.12, mental: -8, prs_set: "teenDone" } } }] },
    { id: "c03", ph: "crisis", rep: true, ok: () => !!base && [7, 8].includes(s.cal), room: base, t: "반지하의 장마",
      x: `장마 사흘째 밤, ${base?.name || "지하 지점"} 계단으로 빗물이 흘러든다. 바닥이 찰방거린다. 내일 오후 2시 돌잔치 예약이 있다.`,
      c: [{ t: `양수기·제습기 대여하고 밤새 퍼낸다 (${won(m(u, 0.12))})`, check: { stat: "hands", dc: 45 }, ok: { text: "새벽 5시, 바닥이 말랐다. 돌잔치는 아무 일 없다는 듯 열렸다.", eff: { prs_cash: -m(u, 0.12), hp: -12, prs_fix: 1 } }, ng: { text: "벽지 아래까지 물이 찼다. 결국 예약을 옮겼다.", eff: { prs_cash: -m(u, 0.25), hp: -12, prs_rating: -0.06 } } },
          { t: `예약을 환불하고 업체를 부른다 (${won(m(u, 0.28))})`, eff: { prs_cash: -m(u, 0.28), prs_rating: -0.03, mental: -3 }, text: "\"돌잔치를 어디서 하라고요.\" 사과 문자를 몇 번이나 고쳐 썼다." }] },
    { id: "c04", ph: "crisis", ok: () => lv >= 2 && open.length >= 1, t: "\"카메라 있는 거 아니죠?\"",
      x: "후기 하나. \"환풍구 쪽에 이상한 불빛이 있어서 무서웠어요.\" 화재감지기 표시등이었다. 그런데 이 후기에 '도움돼요'가 30개다.",
      c: [{ t: `탐지기를 사서 매주 점검 사진을 공지에 올린다 (${won(m(u, 0.08))})`, eff: { prs_cash: -m(u, 0.08), hp: -3, prs_rating: 0.04, prs_buzz: 4 }, text: "'매주 몰카 점검하는 곳' 문구를 걸었다. 여자 손님 단체 예약이 늘었다." },
          { t: "화재감지기라고 답글로 설명한다", check: { stat: "write", dc: 42 }, ok: { text: "사진까지 붙인 차분한 답글. 오해가 풀렸다.", eff: { prs_rating: 0.01 } }, ng: { text: "\"그래도 찜찜하네요.\" 그 주 예약 두 건이 취소됐다.", eff: { prs_rating: -0.05, prs_cash: -m(u, 0.06) } } }] },
    { id: "c05", ph: "crisis", rep: true, ok: () => open.length >= 1 && lv >= 2, t: "노쇼, 그리고 환불 전쟁",
      x: "토요일 저녁 7시 예약이 안 왔다. 다음 날 메시지. \"갑자기 아파서 못 갔어요. 전액 환불해 주세요. 안 그러면 후기 쓸게요.\" 환불 규정은 '당일 취소 불가'다.",
      c: [{ t: "전액 환불해 준다", eff: { prs_cash: -m(u, 0.08), mental: -3 }, text: "토요일 7시를 통째로 날렸다. 후기는 안 달렸다." },
          { t: "규정대로 거절하고 다음 예약 30% 쿠폰을 준다", check: { stat: "talk", dc: 45 }, ok: { text: "\"…그럼 다음 달에 갈게요.\" 진짜로 왔다.", eff: { prs_cash: m(u, 0.03) } }, ng: { text: "별 1개. \"돈만 밝히는 사장\".", eff: { prs_rating: -0.06, mental: -4 } } }] },
    { id: "c06", ph: "crisis", ok: () => X.instant === true && open.length >= 1, room: first, t: "새벽 1시 바로결제",
      x: `새벽 1시 바로결제 알림. 8인실 ${first?.name || ""}에 "15명 MT 뒤풀이, 아침까지"라고 적혀 있다. 즉시예약은 손님을 고를 틈을 안 준다.`,
      c: [{ t: "정원 초과로 취소하고 환불한다", eff: { prs_cash: -m(u, 0.04), prs_rating: -0.02, mental: 1 }, text: "답장 대신 별 2개가 왔다. 대신 소파는 무사하다." },
          { t: "인원 추가 요금을 받고 들인다", check: { stat: "talk", dc: 50 }, ok: { text: "\"사장님 저희 진짜 조용히 놀게요.\" 정말 조용했다. 추가 요금은 덤.", eff: { prs_cash: m(u, 0.12) } }, ng: { text: "아침에 가 보니 스피커가 깨져 있고 바닥은 맥주 바다다.", eff: { prs_cash: -m(u, 0.15), hp: -8, prs_rating: -0.04 } } }] },
  ];
}

const ORD = { early: 0, mid: 1, crisis: 1, late: 2 };
function pickEvent(s, r) {
  const X = s.sx.pr, L = evList(s).filter((e) => { if (!TAKEOVER && e.id[0] === "j") return false; try { return !!e.ok(); } catch (x) { return false; } });
  const fresh = L.filter((e) => !X.seen.includes(e.id));
  // 꼭 그때 나와야 하는 것: 첫 지점 검수, 셀프 공사, 조건이 걸린 후속 위기(리뷰 작업·미성년자)
  let e = null; for (const id of ["s01", "s02", "j01", "j03", "j14", "c01", "c02", "c07"]) { e = fresh.find((x) => x.id === id); if (e) break; } e = e || null;
  if (e && s.t - X.evT < 1) e = null;
  if (!e && fresh.length && s.t - X.evT >= 2 && r.chance(0.3)) {
    const lo = Math.min(...fresh.map((x) => ORD[x.ph]));
    e = r.pick(fresh.filter((x) => ORD[x.ph] <= lo + 1)); // 초반 이야기부터, 한 단계 뒤 것까지 섞어서
  }
  if (!e && s.t - X.evT >= 4 && r.chance(0.05)) { const rp = L.filter((x) => x.rep && X.seen.includes(x.id)); if (rp.length) e = r.pick(rp); }
  if (!e) return null;
  if (!X.seen.includes(e.id)) X.seen.push(e.id);
  X.evT = s.t; X.story = (X.story || 0) + 1;
  s._prsEv = { id: e.id, room: e.room?.id || null };
  return { kind: "event", tag: TAG, title: e.t, text: e.x, onChoose: "prs_ev", ...(e.who ? { who: e.who } : {}), choices: e.c };
}

// 장면이 가리키는 지점(없으면 운영 중인 모든 지점)
function targets(s) {
  const id = s._prsEv?.room, rooms = s.pr?.rooms || [];
  const one = id && rooms.find((x) => x.id === id);
  return one ? [one] : rooms.filter((x) => x.status === "open");
}

// 기획 16장을 원래 jobEvent 가 다시 띄우지 않게 표시(이미 jobEvent 로 본 것은 내 seen 에도 넣는다)
function takeover(s, X) {
  if (!TAKEOVER || !s?.seen) return;
  for (const n of JIDS) {
    const k = "job_partyroom_e" + n;
    if (s.seen[k] !== undefined && s.seen[k] >= 0 && !X.seen.includes("j" + n)) X.seen.push("j" + n);
    if (s.seen[k] === undefined) s.seen[k] = -1;
  }
}

// ───────── 손절 코치 · 확장 코치 (11-21) ─────────
// 어떤 방이 석 달 연속 적자 → 코치 한마디(영수증 노트·할 일) + 장면: 양도 / 폐업 / 버티기(무엇을 고칠지)
// 하나만 운영하면 위험이 한 곳에 몰린다 → 첫 방이 6달 흑자면 2호점, 3곳이면 매니저. 첫 방이 불안한데 2호점을 열면 경고
const coachOn = (s) => !s.sj?.coachOff;
function coachMonth(s, X, open, notes, scenes) {
  const P = s.pr, say = (txt) => { if (coachOn(s)) notes.push("코치 한마디 · 파티룸: " + txt); };
  X.cw = X.cw || {};
  // 1) 손절: 석 달 연속 적자인 방(오픈 3달째부터), 같은 방은 석 달에 한 번
  const cand = open.filter((rm) => (rm.red || 0) >= 3 && rm.months >= 3 && (rm.cutT ?? -99) <= s.t - 3).sort((a, b) => (b.red || 0) - (a.red || 0))[0];
  if (cand && !scenes.some((sc) => sc.onChoose === "prs_cut") && scenes.length < 3) {
    const A = PR.cutAdvice(s, cand); cand.cutT = s.t;
    if (A.seasonal) { if ((cand.seasT ?? -99) <= s.t - 10) { cand.seasT = s.t; say(`${cand.name} ${cand.red}달째 적자지만 1년으로 보면 월 평균 +${won(A.year)} 흑자예요. 비수기 적자는 정상이에요. 정리 말고 비수기 대비금(월세 4달 치)만 챙겨요.`); } }
    else { say(`${cand.name} ${cand.red}달 연속 적자예요(최근 석 달 월 평균 ${won(-A.loss)} 손해). 월세는 손님이 없어도 나가요. ${A.rec === "hold" ? "아직 고쳐 볼 게 있어요. " + (A.fixes[0] ? A.fixes[0].w + ". " + A.fixes[0].a + "." : "성수기까지 비용을 줄여요.") : "이제 정리를 생각할 때예요. 정리한 돈은 다음 자리의 보증금이 돼요."}`);
    scenes.push(cutScene(s, cand, A)); }
  }
  // 2) 확장: 하나만 운영하면 위험이 한 곳에 몰린다
  const n = P.rooms.length, first = open.slice().sort((a, b) => b.months - a.months)[0];
  const setupNew = P.rooms.find((x) => x.status === "setup" && !X.cw["w" + x.id]);
  if (setupNew && first && first !== setupNew && !PR.stable(first) && open.length <= 1) { X.cw["w" + setupNew.id] = s.t; say(`${first.name}이 아직 자리 잡기 전이에요(6달 흑자 전). 이제 월세가 두 곳에서 같이 나가요. 비수기 대비금(월세 4달 치+생활비 2달 치 ${won(PR.reserveNeed(s))})부터 확인해요.`); }
  if (n === 1 && PR.stable(first) && (X.cw.two === undefined || (s.t - X.cw.two >= 8 && (X.cw.twoN || 0) < 3))) { X.cw.two = s.t; X.cw.twoN = (X.cw.twoN || 0) + 1; say(`${first.name}이 6달 넘게 흑자예요. 이제 2호점을 볼 때예요. 방 하나면 공실·월세·청소 위험이 전부 한 곳에 걸려요. 두 곳부터는 겹친 예약을 옆 방으로 넘기고 청소·소모품·보험 같은 공용 비용을 나눠 써요(묶음 효과: 예약 +4%, 관리비 −7%).`); }
  const B = PR.bundle(s);
  if (B.n >= 2 && !X.cw.b2) { X.cw.b2 = s.t; say(`두 곳이 되면서 묶음 효과가 켜졌어요: 예약 +${Math.round(B.occ * 100)}%, 관리비 −${Math.round(B.cost * 100)}%. 통합 예약관리를 켜면 예약이 2%p 더 붙어요.`); }
  if (n === 2 && open.length === 2 && open.every(PR.stable) && !X.cw.three) { X.cw.three = s.t; say("두 곳 다 안정됐어요. 세 곳이면 관리비가 12%까지 줄고, 운영 매니저를 둘 수 있어요. 무리하지 말고 통장에 비수기 대비금이 있을 때만요."); }
  if (n >= 3 && !P.sys.manager && !X.cw.mgr) { X.cw.mgr = s.t; say("지점 3곳이에요. 운영 매니저(월 180만)를 켜면 지점당 관리 행동력이 0.25로 줄고 투잡 칸이 하나 늘어요. 내 시간은 홍보와 다음 자리 보는 데 써요."); }
}
function cutScene(s, rm, A) {
  const opts = [], choices = [];
  opts.push("hold"); choices.push({ t: `버틴다: ${A.fixes[0] ? A.fixes[0].a : A.peakSoon ? "성수기까지 비용 줄이기" : "석 달 더 해 본다"}`, eff: {}, text: "석 달만 더. 고칠 목록을 휴대폰 메모 맨 위에 올렸다." });
  if (!A.tWhy) { opts.push("transfer"); choices.push({ t: `양도한다: 권리금 받고 넘긴다 (+${won(A.tv)})`, eff: {}, text: "다음 사장님이 열쇠를 받아 갔다. 소파 담요는 그대로 두고 왔다." }); }
  opts.push("close"); choices.push({ t: `폐업한다: 원상복구하고 보증금만 (+${won(A.cv)})`, eff: {}, text: "철거 업체가 이틀 만에 벽을 원래대로 돌려놨다. 콘크리트 바닥을 보니 첫 계약 날이 생각났다." });
  const recI = opts.indexOf(A.rec);
  s._prsCut = { id: rm.id, opts };
  const fixT = A.fixes.length ? A.fixes.slice(0, 3).map((x, i) => `${i + 1}) ${x.w} → ${x.a}`).join(" ") : "고칠 게 딱히 안 보여요. 남은 건 시간과 성수기뿐";
  const coach = !coachOn(s) ? "" : A.rec === "hold"
    ? (A.young ? "\n\n투잡연구소 코치: \"오픈 초반 적자는 흔해요. 1달차 0~50만, 3달차 150만이 보통이에요. 위에 고칠 것부터 하고 석 달 뒤에 다시 봐요. 그때도 적자면 그땐 정리해요.\" (코치 추천: 버티기)" : "\n\n투잡연구소 코치: \"고칠 게 남아 있어요. 석 달만 더 해 보고, 그래도 적자면 그때 정리해요. 버티는 동안 2호점은 보지 마요.\" (코치 추천: 버티기)")
    : `\n\n투잡연구소 코치: "손님이 없어도 월세는 나가요. 버티는 것도 비용이에요. 6개월 적자면 접을 때라는 말, 괜히 있는 게 아니에요. 정리한 돈은 다음 자리의 보증금이 돼요." (코치 추천: ${A.rec === "transfer" ? "양도" : "폐업"})`;
  return { kind: "event", tag: TAG, title: `${rm.name}, ${A.red}달 연속 적자`, onChoose: "prs_cut", rec: A.rec, recI: recI >= 0 ? recI : 0,
    text: `${rm.name} ${A.red}달 연속 적자. 최근 석 달 평균 월 ${won(-A.loss)} 손해. 월세는 손님이 없어도 나간다(월 ${won(rm.rent)}).\n\n정리하면: 양도 ${won(A.tv)}(보증금 ${won(rm.dep)} + 권리금 − 인수자 찾는 두 달 월세)${A.tWhy ? " · 지금은 양도 불가(" + A.tWhy + ")" : ""} / 폐업은 보증금 ${won(rm.dep)} − 원상복구 ${won(A.rc)} = ${won(A.cv)}. 처음 넣은 돈은 ${won(rm.invested)}.\n\n버티려면: ${fixT}.${A.walls.length ? " 못 고치는 것: " + A.walls.join(" · ") + "." : ""}${A.peakSoon ? " 한두 달 뒤 성수기예요." : ""}${coach}`,
    choices };
}
function cutChoose(s, i) {
  const o = s._prsCut; s._prsCut = null; if (!o) return [];
  const rm = (s.pr.rooms || []).find((x) => x.id === o.id); if (!rm) return [];
  const k = o.opts[i];
  if (k === "transfer") return PR.transferRoom(s, rm.id, "양도(석 달 적자 정리)");
  if (k === "close") return PR.shutRoom(s, rm.id, "폐업(석 달 적자 정리)");
  // 버티기: 가격이 시세보다 비싸면 시세로 맞춘다(실제로 바뀌는 것). 나머지는 할 일로 남긴다
  rm.cutT = s.t; const out = ["석 달 뒤 다시 점검"]; const ref = Math.round(PR.refPrice(s, rm));
  if (rm.price > ref * 1.05) { PR.setPrice(s, rm.id, ref); out.push(`${rm.name} 가격 시세로: ${ref}만`); }
  return out;
}

export default {
  key: "pr",
  prefix: "prs_",
  init(s) { const X = DEF(); takeover(s, X); return X; },
  migrate(s, X) { const d = DEF(); for (const k of Object.keys(d)) if (X[k] === undefined) X[k] = d[k]; takeover(s, X); },

  month(s, r, notes, scenes) {
    const X = s.sx.pr, P = s.pr, pi = SYN.pi(s);
    if (!X || !P) return;
    const open = openRooms(s);
    // 집계: 1호점 투자금, 운영하며 번 누적 이익, 별점 4.7 지점이 있었던 달
    if (!X.inv1 && P.rooms.length) X.inv1 = P.rooms[0].invested || 0;
    if (open.length) {
      X.cum += P.profitHist?.at(-1) || 0; X.roomM += open.length;
      if (open.some((x) => x.rating >= 4.7 && x.months >= 1)) X.goodM++;
    }
    // 시너지
    if (SYN.on(s, "prs_tutor") && open.length) {
      const v = Math.round(Math.min(2, open.length) * 5 * pi); s.cash += v; addMoney(s, "inc", "파티룸 매출", v);
      if (r.chance(0.15)) notes.push(`평일 낮 빈 방을 그룹 과외 교실로 빌려줬다 +${won(v)}`);
    }
    if (SYN.on(s, "prs_wkend")) { s.hp = clamp(s.hp - 3, 0, s.hpMax ?? 100); if (r.chance(0.2)) notes.push("토요일 저녁, 치킨집 마감과 파티룸 청소가 겹쳤다(스태미너 −3)"); }
    coachMonth(s, X, open, notes, scenes);
    // 이야기 이벤트: 원래 엔진 장면(문서 사건·성수기 사고·제안·내용증명)이 뜬 달은 쉰다
    if (!P.rooms.length) return;
    const busy = P.evT === s.t || scenes.some((sc) => sc.tag === TAG || sc.kind === "story") || scenes.length >= 2;
    if (busy) return;
    const ev = pickEvent(s, r); if (ev) scenes.push(ev);
  },

  eff(s, e, out) {
    const X = s.sx?.pr; if (!X) return;
    if (e.prs_cash) { const v = e.prs_cash; s.cash += v; addMoney(s, v > 0 ? "inc" : "exp", v > 0 ? "파티룸 매출" : "파티룸 비용", Math.abs(v)); out.push(`파티룸 ${v > 0 ? "수입 +" : "비용 −"}${won(Math.abs(v))}`); }
    if (e.prs_rating) { const T = targets(s); for (const rm of T) rm.rating = clamp(rm.rating + e.prs_rating, 2.5, 4.98); if (T.length) out.push(`${T.length === 1 ? T[0].name + " " : "파티룸 "}별점 ${e.prs_rating > 0 ? "+" : ""}${e.prs_rating}`); }
    if (e.prs_buzz) { const T = targets(s); for (const rm of T) rm.buzz = clamp((rm.buzz || 0) + e.prs_buzz, 0, 100); if (T.length) out.push(`${T.length === 1 ? T[0].name + " " : "파티룸 "}입소문 ${e.prs_buzz > 0 ? "+" : ""}${e.prs_buzz}`); }
    if (e.prs_selfq) { const T = targets(s); for (const rm of T) rm.selfQ = (rm.selfQ || 0) + e.prs_selfq; out.push(`셀프 공사 완성도 ${e.prs_selfq > 0 ? "+" : "−"}`); }
    if (e.prs_know) { s.pr.know = Math.min(100, (s.pr.know || 0) + e.prs_know); out.push(`운영 노하우 +${e.prs_know}`); }
    if (e.prs_fix) X.fixN = (X.fixN || 0) + e.prs_fix;
    if (e.prs_rev) { const T = targets(s); for (const rm of T) rm.reviews = (rm.reviews || 0) + e.prs_rev; if (T.length) out.push(`리뷰 +${e.prs_rev}`); }
    if (e.prs_ll) { const LL = ["싫어함", "찜찜", "환영"]; for (const rm of targets(s)) { if (!rm.hid) continue; const i = LL.indexOf(rm.hid.landlord); if (i < 0) continue; rm.hid.landlord = LL[clamp(i + e.prs_ll, 0, 2)]; if (e.prs_ll > 0) { rm.seen = rm.seen || {}; rm.seen.landlord = true; out.push(`건물주: ${rm.hid.landlord}`); } } }
    if (e.prs_sound) { const SD = ["나쁨", "보통", "좋음"]; for (const rm of targets(s)) { if (!rm.hid) continue; const i = SD.indexOf(rm.hid.sound); if (i >= 0 && i < 2) { rm.hid.sound = SD[i + 1]; out.push(`${rm.name} 방음 ${rm.hid.sound}`); } } }
    if (e.prs_comp) { for (const rm of targets(s)) rm.complaints = (rm.complaints || 0) + e.prs_comp; out.push("민원 기록 +1"); }
    if (e.prs_notice) { for (const rm of targets(s)) if (rm.notice) { rm.notice = null; if (rm.hid) rm.hid.landlord = "찜찜"; rm.complaints = 0; out.push(`${rm.name} 계약 해지 철회`); } }
    if (e.prs_listing) { const near = targets(s)[0] || (s.pr.rooms || [])[0]; const L = PR.storyListing(s, e.prs_listing, near); out.push(`매물 등록: ${L.tagN} · ${L.size}평 · 월세 ${won(L.rent)}`); }
    if (e.prs_close) { const open = openRooms(s); const rm = open.slice().sort((a, b) => PR.avgProfit(a) - PR.avgProfit(b))[0]; if (rm) for (const l of PR.shutRoom(s, rm.id, "폐업(모임 금지령)")) out.push(l); }
    if (e.prs_set) {
      const k = e.prs_set;
      if (k === "instant") X.instant = true; else if (k === "noinstant") X.instant = false;
      else if (k === "fake") X.fake = s.t; else if (k === "nofake") X.fake = false; else if (k === "fakeDone") X.fake = true;
      else if (k === "teen") X.teen = s.t; else if (k === "noteen") X.teen = false; else if (k === "teenDone") X.teen = true;
      else if (k === "pump") X.pump = true;
      else if (k === "marble") X.marble = true; else if (k === "wood") X.marble = false;
      else if (k === "wait") X.safety = s.t; else if (k === "safe") X.safety = true;
    }
  },

  choose: {
    prs_ev(s) { s._prsEv = null; return []; },
    prs_cut(s, r, i) { return cutChoose(s, i); },
  },

  milestones: [
    { key: "prs_open", title: "첫 예약 알림", test: (s) => (s.pr?.rooms || []).some((x) => x.status === "open" && x.months >= 1),
      lines: ["띠링. '예약이 확정되었습니다.' 회의실에서 휴대폰을 엎어 놓고 혼자 웃었다.", "첫 손님이 나간 자리를 치우면서 남은 케이크 한 조각을 먹었다."] },
    { key: "prs_lv2", title: "별점 4.5 클럽", test: (s) => (s.pr?.lv || 0) >= 2,
      lines: ["리뷰 열 개, 별점 4.5. 숫자 하나 지키려고 매주 화장실 줄눈을 닦았다.", "\"사장님이 신경 쓴 게 보여요.\" 그 한 줄을 캡처해 뒀다."] },
    { key: "prs_lv3", title: "토요일 7시 만석", test: (s) => (s.pr?.lv || 0) >= 3,
      lines: ["달력의 토요일 저녁 칸이 석 달 치 다 찼다.", "월세를 내고도 150만이 남았다. 첫 달 0원이던 통장이 생각났다."] },
    { key: "prs_payback", title: "본전", test: (s) => { const X = s.sx?.pr; return !!X && X.inv1 > 0 && X.cum >= X.inv1; },
      lines: ["누적 이익이 1호점에 넣은 돈을 넘었다. 이제부터 버는 건 진짜 내 돈이다.", "보증금·공사비·중고 가구 영수증 뭉치를 상자에 넣고 테이프를 붙였다."] },
    { key: "prs_lv4", title: "컨셉 2호점", test: (s) => (s.pr?.lv || 0) >= 4,
      lines: ["두 번째 열쇠를 받았다. 이번엔 실수 목록부터 적고 시작했다.", "방음, 화장실, 주차, 건물주. 1호점이 가르쳐 준 네 단어."] },
    { key: "prs_lv5", title: "공간 사업가", test: (s) => (s.pr?.lv || 0) >= 5,
      lines: ["지점 네 곳, 석 달 평균 순이익 600만. 토요일 저녁 도어락 알림이 동시에 울린다.", "명함 직함을 바꿨다. '파티룸 사장'에서 '공간 운영'으로."] },
  ],

  perks: [
    { id: "p_prs_star", n: "토요일 7시의 주인", line: "별점은 청소에서 나온다", pro: "파티룸 별점 하락 −15%", m: { ratingGuard: 0.85 }, got: "별점 4.7 지점을 130달 운영", test: (s) => (s.sx?.pr?.goodM || 0) >= 130 },
    { id: "p_prs_fix", n: "공구함 든 사장", line: "새벽 전화가 무섭지 않다", pro: "파티룸 파손·사고 피해 −15%", m: { damageMult: 0.85 }, got: "첫 지점을 연 지 12년 안에 사고·민원을 직접 4번 수습", test: (s) => (s.sx?.pr?.fixN || 0) >= 4 && Math.max(0, ...(s.pr?.rooms || []).map((r) => r.months || 0)) <= 144 },
  ],
  perkCine: { p_prs_star: "prs_lv3", p_prs_fix: "prs_payback" },

  synergy: [
    { id: "prs_tutor", kind: "good", n: "화상과외 × 파티룸", need: "화상과외 + 운영 중인 파티룸", desc: "평일 낮 빈 방을 소그룹 과외 교실로: 매달 파티룸 매출 +지점당 5만(2곳까지)", test: (s) => act(s, "pr") && act(s, "tutoring") && openRooms(s).length > 0 },
    { id: "prs_wkend", kind: "bad", n: "치킨집 × 파티룸 주말", need: "프랜차이즈 치킨 + 파티룸", desc: "토요일 저녁이 둘 다 대목: 매달 스태미너 −3", test: (s) => act(s, "pr") && act(s, "chicken") },
  ],
};
