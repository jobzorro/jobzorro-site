// 히든 길(v4.29, 26-11-22 기획 v425/rep10). 투잡마다 숨은 길 하나: 가기 어렵지만 가면 잘 풀리는 길.
// 보여 주기: 처음엔 안 보인다. 낌새(사람·장소 장면, 스승·인연)를 한 번 보면 보드에 흐린 '??? 히든 길 · 조건 n/m' 한 줄.
//   조건 글자는 스승 등급(S 2개·A 1개·B 편지 때 50%)으로 하나씩 공개(rev). 조건을 다 채우면 문 열림 장면 + 화보(cine "hid_<job>").
// 보상(HID_REW): cut = 투잡 부대비용을 이만큼 줄임(market.js sideCut 에서 s.hid.cutNow 를 뺀다, 넘치면 '단골·입소문' 수입),
//   fix = 월 고정 수입(만원, 물가 반영, 장부 "히든 길"), lump = 열 때 한 번, dur = 효과 기간(달, 없으면 계속). 위험(HID_RISK): 월 p 확률로 m달 보상 멈춤 + 비용(+ eye 회사 눈치·mental, co 면 회사 다닐 때만).
// 11-25 기획 표 '열면' 칸의 직접 효과는 투잡 엔진이 맡는다(space.js hidOn·hidPaused 로 켜짐을 본다). cut·fix 는 그만큼 줄였다:
//   파티룸 pr.js PR_TREND(유행 컨셉 방 예약 +40%·권리금 2배) · 에어씨앤씨 abnb.js AB_HID(합법 3채 가동률 90%·단속 없음, 위기 땐 한꺼번에 빔)
//   무인카페 ucafe.js UC_F30.chain.hid(저가 체인 영향 거의 없음) · 치킨 chicken.js CH_HID(원가 −8%p·본사 분담금·리뉴얼·본사 사건 없음, 간판 인지도 0부터)
//   컨설팅 cs.js CS_HID(위기 동안 헤드헌터 소개 끊김·경력 단가 ↓). 인별·타로·웹소설·과외·바이브는 엔진 파일을 아직 안 건드려 cut·fix 그대로
// 컨설팅 '경력 이직'은 원래 엔진(defs CS_CAREER_PASS·NICHES.career.req·SIDE_ADJ.cs_career·market.js sideCut)을 그대로 쓰고, 여기서는 문·낌새·기록만 맡는다.
// 상태: s.hid = { j:{ job:{ seen, src, rev, open, until, pause, f:{} } }, cutNow:{job}, n }. onChoose "hd_hint"·"hd_time". 난수는 r 만.
import * as D from "./defs.js";
import { CHAR, jo, log, addMoney, ensureRel } from "./core.js";
import * as SJ from "./sj.js";
import { MENTOR_OF } from "./mentor.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pi = (s) => s.pi || 1;
// ───────── 상수(밸런스: 연 판 파이어율 40% 언저리를 목표로) ─────────
export const HID_REW = {
  cs: { cut: 0, fix: 0, lump: 0 }, // 보상 = 경력 이직 분야(단가 1.7배, SIDE_ADJ.cs_career)
  pr: { cut: 0.25, fix: 0, lump: 0, dur: 36 }, // 유행 2~3년: 그 컨셉 방 예약 +40%·권리금 2배(pr.js PR_TREND). 11-25 cut 0.5 → 0.25
  airbnb: { cut: 0.2, fix: 0, lump: 0 }, // 기업 장기 계약: 합법 3채 가동률 90%·단속 없음(abnb.js AB_HID). 11-25 cut 0.35·fix 60 → 0.2·0
  ucafe: { cut: 0, fix: 130, lump: 0 }, // 원두 납품: 매달 고정 · 저가 체인 영향 거의 없음(ucafe.js). 11-25 cut 0.35·fix 160 → 0·130
  insta: { cut: 0.1, fix: 30, lump: 0 }, // 오프라인 매장: 알고리즘과 상관없는 매출
  tarot: { cut: 0.4, fix: 70, lump: 0 }, // 심리 타로 센터: 단가·기업 복지 계약
  webnovel: { cut: 0.3, fix: 60, lump: 0 }, // IP 스튜디오: 작품 수 ×3·판권
  tutoring: { cut: 0.45, fix: 40, lump: 0 }, // 입시 컨설팅: 상담 단가 3배
  chicken: { cut: 0, fix: 80, lump: 0 }, // 내 브랜드: 원가 −8%p·본사 몫 없음(chicken.js CH_HID) + 소스 납품. 11-25 cut 0.4·fix 150 → 0·80
  vibe: { cut: 0.25, fix: 0, lump: 1000 }, // 사내 벤처 분사: 지분 투자
};
export const HID_RISK = {
  cs: { p: 0.01, m: 4, cost: 0, eye: 25, mental: -6, co: 1, t: "경력 이직 고객이 우리 회사 사람이었다. '현직자가 이직 상담을 한다'는 말이 팀에 돌았다" }, // 11-25 기획 '회사에 들키면 타격 큼(현직 정보)'
  pr: null, // 위험은 헛다리(30%, prNewTrend)
  airbnb: { p: 0.012, m: 4, cost: 0, t: "계약사가 출장을 끊었다. 숙소 세 채가 한꺼번에 비었다" },
  ucafe: { p: 0.015, m: 2, cost: 150, t: "로스팅 실패로 원두 한 판을 버렸다" },
  insta: { p: 0.012, m: 3, cost: 200, t: "매장 재고가 쌓였다. 임대료는 꼬박꼬박 나간다" },
  tarot: { p: 0.008, m: 6, cost: 0, t: "단골 의존 문제가 불거졌다. 기업 계약이 잠시 멈췄다" },
  webnovel: { p: 0.01, m: 4, cost: 100, t: "같이 쓰던 작가가 이탈했다. 표절 시비까지 붙었다" },
  tutoring: { p: 0.012, m: 6, cost: 0, t: "입시 결과가 아쉬운 해. 소개가 한꺼번에 끊겼다" },
  chicken: { p: 0.008, m: 4, cost: 400, t: "옛 본사가 소송을 걸었다" },
  vibe: { p: 0.008, m: 4, cost: 0, t: "분사한 회사 투자 심사가 길어졌다" },
};
export const HID_P = { after: 3, hint: 0.06, hintReady: 0.25, again: 12, time: 0.06, timeGap: 12 };
const JN = (job) => D.SIDEJOBS[job]?.n || job;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const grades = (s) => { let b = 0, c = 0; for (const g of s.co?.grades || []) { c = g === "S" || g === "A" ? c + 1 : 0; b = Math.max(b, c); } return b; }; // 회사 평가 A 이상 최장 연속

// ───────── 길 10개: 조건 c = [글, 지금 값(s, f), 기준, 공부할 능력치(봇)] ─────────
export const HID = {
  cs: { n: "경력 이직 컨설턴트", c: [["커리어 120", (s) => s.st.career, 120, "career"], ["회사 5년", (s) => Math.floor(s.co.years * 10) / 10, 5], ["합격자 50명", (s) => s.cs?.passes || 0, 50]],
    hint: { who: "c037", title: "경력직 채용 공고가 두 배", text: (n) => `${n}: "요즘 우리 회사 경력직 공고가 두 배예요. 근데 이직 준비하는 사람들이 물어볼 데가 없대요. 신입 자소서랑은 완전 다르잖아요."` },
    open: "헤드헌터에게서 전화가 왔다. \"경력직 고객을 맡아 주실 수 있나요?\" 신입 첨삭과는 다른 문이 열렸다.", get rew() { return D.CS2_ON ? "경력 이직 분야(이직컨설팅 표준·프리미엄·최고가가 업의 이해도에 따라 열려요 · 연중 고른 수요)" : "경력 이직 분야(단가 1.7배·연중 고른 수요)"; }, risk: "현직 정보로 상담하는 게 회사에 들키면 눈치 +25, 넉 달 동안 헤드헌터 소개가 끊기고 경력 단가 −30%" },
  pr: { n: "시대보다 한발 빠른 컨셉", c: [["다음 유행 컨셉 알아채기", (s, f) => (f.know ? 1 : 0), 1], ["그 컨셉 방을 유행 전에 열기", (s, f) => (trendRoom(s, f) ? 1 : 0), 1], ["감각 100", (s) => s.st.sense, 100, "sense"]],
    hint: { who: "c047", title: "\"○○도 돼요?\"", text: (n, s, f) => `${n}: "요즘 '${cName(f.trend)}도 돼요?' 문의가 부쩍 늘었어요. 석 달째예요." 다음 유행이 이 컨셉일지도 모른다.` },
    open: "기다리던 유행이 왔다. 내 방은 이미 그 컨셉이다. 예약표가 석 달 치 찼다.", rew: "유행 3년 동안 그 컨셉 방 예약 +40%·권리금 2배 (늦게 따라가면 레드오션)", risk: "기다리던 유행의 30%는 헛다리" },
  airbnb: { n: "기업 장기 숙소 계약", c: [["합법 숙소 3채", (s) => (s.ab?.units || []).filter((u) => u.reg === "legal").length, 3], ["숙소 평균 별점 4.8", (s) => Math.round(avg((s.ab?.units || []).map((u) => u.rating || 0)) * 10) / 10, 4.8], ["커리어 100(회사 인맥)", (s) => s.st.career, 100, "career"]],
    hint: { who: "c099", title: "출장자들이 묵을 데가 없대요", text: (n) => `${n}: "우리 회사 출장자들이 묵을 데가 마땅치 않대요. 호텔은 비싸고, 숙소는 불안하고. 합법이면 회사가 계약할 텐데."` },
    open: "협력사 총무팀에서 메일이 왔다. '출장자 숙소 연간 계약 제안'. 가동률 걱정이 사라졌다.", rew: "출장자 장기 계약: 합법 숙소 3채 가동률 90% · 단속 걱정 없음", risk: "계약사가 출장을 끊으면 계약 숙소가 넉 달 동안 한꺼번에 빔" },
  ucafe: { n: "내 원두 브랜드", c: [["스페셜티 원두 24달", (s, f) => f.beanM || 0, 24], ["매장 3곳", (s) => (s.uc?.stores || []).length, 3], ["최고 별점 4.7", (s) => Math.round(Math.max(0, ...(s.uc?.stores || []).map((x) => x.rating || 0)) * 10) / 10, 4.7], ["감각 120", (s) => s.st.sense, 120, "sense"]],
    hint: { who: null, title: "이 원두 어디서 사요?", text: () => "후기에 이런 글이 달렸다. '이 원두 어디서 사요? 집에서도 마시고 싶어요.' 같은 질문이 벌써 세 번째다." },
    open: "옆 동네 무인카페 사장님이 찾아왔다. \"그 원두, 저희도 받을 수 있을까요?\" 첫 납품 계약서에 도장을 찍었다.", rew: "다른 무인카페에 원두 납품(월 고정 수입) · 저가 체인 영향 거의 없음", risk: "로스팅 실패로 원두 폐기" },
  insta: { n: "오프라인 브랜드", c: [["시대의 컨셉 한 번", (s, f) => (f.era ? 1 : 0), 1], ["팬심 80", (s) => Math.round(s.ins?.fan || 0), 80], ["내 브랜드 런칭", (s) => (s.ins?.brand ? 1 : 0), 1]],
    hint: { who: null, title: "팝업 거리에서 온 DM", text: () => "팬 모임 공지에 백 명이 손을 들었다. 팝업 거리 담당자가 DM을 보냈다. '언젠가 오프라인도 생각 있으세요?'" },
    open: "팝업 스토어 첫날, 줄이 골목 끝까지 섰다. 석 달 뒤 상시 매장 계약서가 왔다.", rew: "팝업 → 상시 매장(알고리즘과 상관없는 매출)", risk: "재고가 쌓여도 임대료는 나감" },
  tarot: { n: "심리 타로 센터", c: [["상담심리 대학원 수료", (s) => (s.grad?.k === "counsel" && s.grad.done ? 1 : 0), 1], ["타로 Lv4", (s) => s.tarot?.lv || 0, 4], ["평판(적중률) 70", (s) => Math.round(s.tarot?.rep || 0), 70]],
    hint: { who: "c034", title: "카드보다 필요한 것", text: (n) => `${n}: "매일 오는 손님 있죠? 그분한테 필요한 건 카드가 아닐 수도 있어요. 상담 공부, 해 볼 생각 없어요?"` },
    open: "기업 복지팀에서 연락이 왔다. '임직원 심리 상담 프로그램, 타로로 열어 주실 수 있나요?' 센터 간판을 달았다.", rew: "자격 있는 상담(단가 3배)·기업 복지 계약", risk: "단골 의존 문제 하나로 기업 계약이 멈춤" },
  webnovel: { n: "내 IP 스튜디오", c: [["완결 3편", (s) => s.webnovel?.done || 0, 3], ["웹소설 공장 성공", (s, f) => (f.fac ? 1 : 0), 1], ["2차 판권 1번", (s) => (s.webnovel?.ip || 0) + (s.webnovel?.ipDrama || 0), 1]],
    hint: { who: "c031", title: "혼자 쓰기 아까운 세계관", text: (n) => `${n}: "작가님 세계관, 혼자 쓰기 아깝네요. 완결 몇 편 더 쌓이면 같이 쓰는 작가들 붙여 볼 수 있어요."` },
    open: "작가 셋이 내 세계관으로 쓰고 싶다고 찾아왔다. 스튜디오 이름을 정했다.", rew: "세계관 나눠 쓰기(작품 수 ×3)·2차 판권 독점", risk: "작가 이탈·표절 시비가 회사 단위로 커짐" },
  tutoring: { n: "입시 컨설팅", c: [["입시 대박 4번", (s, f) => f.ipBig || 0, 4], ["학부모 별점 4.9", (s) => Math.round((s.tutoring?.stars || 0) * 10) / 10, 4.9], ["말빨 160", (s) => s.st.talk, 160, "talk"], ["숫자 100(입시 데이터)", (s) => s.st.num, 100, "num"]],
    hint: { who: "c012", title: "상담만 따로 받고 싶대요", text: (n) => `${n}: "입시 결과 나오면 상담만 따로 받고 싶다는 엄마들이 많아요. 선생님 얘기 벌써 돌아요."` },
    open: "학부모 설명회 자리가 꽉 찼다. 상담 대기 명단이 생겼다.", rew: "학부모 상담(단가 3배)·대기 명단 상시", risk: "입시가 아쉬운 해엔 소개가 한꺼번에 끊김" },
  chicken: { n: "내 브랜드 독립", c: [["3호점", (s) => (s.chicken?.stores || []).length, 3], ["협의회 리뉴얼 협상 성공", (s, f) => (f.deal ? 1 : 0), 1], ["숫자 140", (s) => s.st.num, 140, "num"]],
    hint: { who: "c023", title: "점주 단톡방 초대", text: (n) => `다른 점주들 단톡방에 초대됐다. '본사 리뉴얼 요구, 이번엔 같이 버텨 봅시다.' ${jo(n, "이", "가")} 덧붙였다. "독립하면 소스는 제가 대 줄게요."` },
    time: { title: "점주 협의회 · 리뉴얼 협상", text: "본사가 전 매장 리뉴얼을 요구했다. 점주 서른 명이 회의실에 모였다. 숫자를 들고 앞에 설 사람이 필요하다.", st: "num", dc: 70, ok: "비용 분담률을 숫자로 뒤집었다. 점주들이 박수를 쳤다.", ng: "본사 숫자에 밀렸다. 다음 협상을 기약했다." },
    open: "간판을 내렸다. 내 이름의 치킨 간판을 달았다. 가맹비도 필수 품목도 없다.", rew: "가맹비·필수 품목 없이 원가 −8%p · 본사 광고비·리뉴얼 요구 없음 · 소스 납품 수입", risk: "옛 본사 소송 · 간판 인지도는 0에서 다시" },
  vibe: { n: "사내 벤처 분사", c: [["사내 앱 정식 도입", (s, f) => (f.inhouse ? 1 : 0), 1], ["바이브 Lv4", (s) => s.vibe?.lv || 0, 4], ["회사 평가 A 이상 3년 연속", (s) => grades(s), 3]],
    hint: { who: "c070", title: "우리 팀 전체가 쓰면 안 돼요?", text: (n) => `${jo(n, "이", "가")} 내 툴을 써 보고 말했다. "이거 우리 팀 전체가 쓰면 안 돼요? 팀장님한테 보여 줘도 돼요?"` },
    time: { title: "사내 앱 정식 도입 회의", text: "IT지원팀·보안팀·팀장들이 모였다. 내 자동화 앱을 전사에 쓸지 정하는 자리다.", st: "num", dc: 90, ok: "보안 질문에 막힘없이 답했다. 정식 도입 결정.", ng: "보안팀이 고개를 저었다. 1년 뒤 다시 올리기로 했다." },
    open: "회사가 내 앱을 분사하자고 했다. 지분 투자 계약서에 회사 도장이 찍혔다. 본잡과 투잡이 하나가 됐다.", rew: "회사 지분 투자·겸업 눈치 줄어듦·매각 기회", risk: "분사 회사 투자 심사가 길어지면 보너스 멈춤" },
};
const cName = (k) => D.CONCEPTS?.[k]?.n || "새 컨셉";
// 37번: 낌새 장면은 글이 전제하는 만큼 진행됐을 때만 뜬다(팔로워 0 에 "팬 모임에 백 명" 같은 일이 없게)
const HINT_OK = {
  cs: (s) => !!s.cs?.open && (s.cs?.passes || 0) >= 5,
  pr: (s) => (s.pr?.rooms || []).some((x) => x.status === "open"),
  airbnb: (s) => (s.ab?.units || []).length >= 1,
  ucafe: (s, f) => (f.beanM || 0) >= 3,
  insta: (s) => (s.ins?.f || 0) >= 10000 && (s.ins?.fan || 0) >= 30,
  tarot: (s) => (s.tarot?.lv || 0) >= 3,
  webnovel: (s) => (s.webnovel?.done || 0) >= 1,
  tutoring: (s, f) => (f.ipBig || 0) >= 1 || ((s.tutoring?.studs || []).length >= 3 && (s.tutoring?.stars || 0) >= 4.5),
  chicken: (s) => (s.chicken?.stores || []).some((x) => (x.months || 0) >= 6),
  vibe: (s) => (s.vibe?.lv || 0) >= 2,
};
const hintOk = (s, job, f) => { try { return HINT_OK[job] ? !!HINT_OK[job](s, f) : true; } catch (e) { return true; } };
function trendRoom(s, f) { return !!f.trend && (s.pr?.rooms || []).some((rm) => rm.concept === f.trend && rm.status !== "closed" && (rm.months || 0) >= 1); }

// ───────── 상태 ─────────
function H(s) { if (!s.hid) s.hid = { j: {}, cutNow: {}, n: 0 }; return s.hid; }
function J(s, job) { const h = H(s); return (h.j[job] = h.j[job] || { rev: 0, f: {} }); }
export const isOpen = (s, job) => s.hid?.j?.[job]?.open !== undefined;
export const openList = (s) => Object.keys(s.hid?.j || {}).filter((k) => isOpen(s, k));
function condRows(s, job) { const d = HID[job], f = J(s, job).f; return d.c.map(([t, v, need, st]) => { const cur = v(s, f); return { t, cur, need, ok: cur >= need, st }; }); }

// 낌새를 봤다(보드에 한 줄이 생긴다). 처음이면 글 한 줄 돌려줌
export function hidSee(s, job, src) { if (!HID[job]) return ""; const x = J(s, job); if (x.seen !== undefined) return ""; x.seen = s.t; x.src = src || ""; log(s, `히든 길 낌새: ${JN(job)}`, "work"); return `${JN(job)} 히든 길의 낌새를 느꼈다`; }
// 조건 글자 공개(스승 등급·편지)
export function hidReveal(s, job, n) { if (!HID[job]) return ""; const x = J(s, job), m = HID[job].c.length; if (x.rev >= m) return ""; const b = x.rev; x.rev = Math.min(m, x.rev + n); if (x.seen === undefined) x.seen = s.t; return `히든 길 조건 ${x.rev - b}개 공개 (${x.rev}/${m})`; }

// 화면용: 낌새 전엔 null
export function hidInfo(s, job) {
  const d = HID[job]; if (!d) return null; const x = s.hid?.j?.[job]; if (!x || (x.seen === undefined && x.open === undefined)) return null;
  const rows = condRows(s, job), open = x.open !== undefined, k = rows.filter((c) => c.ok).length;
  const f = x.f || {};
  return { job, n: d.n, open, k, m: rows.length, rev: open ? rows.length : x.rev, rew: d.rew, risk: d.risk || "",
    conds: rows.map((c, i) => ({ t: open || i < x.rev ? c.t : "???", ok: c.ok, prog: open || i < x.rev ? (c.need === 1 ? "" : `${Math.round(c.cur * 10) / 10}/${c.need}`) : "" })),
    left: job === "pr" && f.know && f.trendT !== undefined && !open ? Math.max(0, f.trendT - s.t) : null, trend: job === "pr" && f.know ? cName(f.trend) : null,
    on: open && (x.until === undefined || s.t < x.until) && !(x.pause > s.t), pause: x.pause > s.t ? x.pause - s.t : 0, until: x.until !== undefined ? Math.max(0, x.until - s.t) : null };
}

// ───────── 매달(core endMonth: 시장 충격 앞) ─────────
export function hiddenMonth(s, r, notes, scenes) {
  if (!s.sj) return;
  const h = H(s); h.cutNow = {};
  for (const job of Object.keys(HID)) {
    const on = SJ.isActive(s, job); if (!on && !isOpen(s, job)) continue;
    const x = J(s, job), f = x.f;
    // 기록(투잡별 조건 추적)
    if (on) track(s, r, job, f, notes);
    // 열린 길: 보상·위험
    if (x.open !== undefined) {
      if (!on) continue;
      const R = HID_REW[job], live = (x.until === undefined || s.t < x.until) && !(x.pause > s.t);
      if (x.until !== undefined && s.t === x.until) notes.push(`히든 길 · ${HID[job].n}: 유행이 지나갔다(보너스 끝)`);
      if (live) {
        if (R.cut) h.cutNow[job] = R.cut;
        if (R.fix) { const v = Math.round(R.fix * pi(s)); s.cash += v; addMoney(s, "inc", "히든 길", v); }
        const K = HID_RISK[job];
        const emp = !(s.co?.quit || s.co?.fired);
        if (K && (!K.co || emp) && r.chance(K.p)) { // co: 회사를 다닐 때만 생기는 위기(그만두면 판정도 안 한다)
          x.pause = s.t + K.m; const c = Math.round((K.cost || 0) * pi(s)); if (c) { s.cash -= c; addMoney(s, "exp", "히든 길", c); }
          const ex = []; if (K.eye && emp && s.co) { s.co.eye = clamp((s.co.eye || 0) + K.eye, 0, 100); ex.push(`회사 눈치 +${K.eye}`); } if (K.mental) { s.mental = clamp(s.mental + K.mental, 0, 100); ex.push(`멘탈 ${K.mental < 0 ? "−" + -K.mental : "+" + K.mental}`); }
          notes.push(`히든 길 위기 · ${K.t}${c ? ` (−${c}만)` : ""}${ex.length ? ` · ${ex.join(" · ")}` : ""} · ${K.m}달 보너스 멈춤`); log(s, `히든 길 위기: ${HID[job].n}`, "work");
        }
      }
      continue;
    }
    if (!on) continue;
    const p = s.sj.rp?.[job], since = p?.t0 !== undefined ? s.t - p.t0 : 0;
    const rows = condRows(s, job), ready = rows.every((c) => c.ok);
    // 문 열림
    if (x.seen !== undefined && ready && (job !== "pr" || prArrive(s, f))) { openPath(s, r, job, scenes, notes); continue; }
    if (job === "pr") prCycle(s, r, f, notes, rows);
    if (scenes.some((y) => y.kind === "event")) continue;
    // 낌새 장면
    if (x.seen === undefined && since >= HID_P.after && s.t >= (x.hintNo ?? -1) && hintOk(s, job, f) && r.chance(ready || rows.filter((c) => c.ok).length >= 2 ? HID_P.hintReady : HID_P.hint)) { scenes.push(hintScene(s, job, f)); continue; }
    // 인연·타이밍 장면(치킨 협의회·바이브 사내 도입)
    const T = HID[job].time;
    if (T && x.seen !== undefined && !timeDone(job, f) && s.t >= (f.timeT ?? -1) && timeReady(s, job) && r.chance(HID_P.time)) scenes.push({ kind: "event", tag: "히든 길", title: T.title, text: T.text, onChoose: "hd_time", hd: job,
      choices: [{ t: "앞에 나선다", check: { stat: T.st, dc: T.dc }, ok: { text: T.ok, eff: { mental: 2 } }, ng: { text: T.ng, eff: { mental: -2 } } }, { t: "이번엔 뒤에서 지켜본다", eff: {}, text: "다음 기회를 기다리기로 했다." }] });
  }
}
const timeDone = (job, f) => (job === "chicken" ? f.deal : f.inhouse);
const timeReady = (s, job) => (job === "chicken" ? (s.chicken?.stores || []).length >= 2 : (s.vibe?.lv || 0) >= 2);
function track(s, r, job, f, notes) {
  if (job === "ucafe" && (s.uc?.stores || []).some((x) => (x.bean || 0) >= 1)) f.beanM = (f.beanM || 0) + 1;
  if (job === "insta" && (s.ins?.eraT ?? -99) >= 0 && (s.ins.eraT ?? -99) >= (f.t0 ?? (f.t0 = s.t))) f.era = 1;
  if (job === "webnovel" && (s.jp?.runs || []).some((y) => y.id === "wn_factory" && y.ok)) f.fac = 1;
  if (job === "tutoring") { const u = s.tutoring?.ipUp ?? -1; if (u >= 0 && u !== f.ipLast) { if (s.t - (f.ipT ?? -99) >= 6) { f.ipBig = (f.ipBig || 0) + 1; f.ipT = s.t; } f.ipLast = u; } } // 입시 대박 장면마다 ipUp 이 새로 정해진다
  if (job === "pr" && !f.trend) prNewTrend(s, r, f);
}
// 파티룸 유행: 판마다 숨은 '다음 유행 컨셉'과 도착 시점. 30%는 헛다리(안 온다)
function prNewTrend(s, r, f) { const ks = Object.keys(D.CONCEPTS || {}).filter((k) => k !== f.trend); f.trend = ks.length ? r.pick(ks) : "home"; f.trendT = s.t + r.int(18, 34); f.dud = r.chance(0.3); f.know = 0; }
const prArrive = (s, f) => f.trendT !== undefined && s.t >= f.trendT && !f.dud;
function prCycle(s, r, f, notes, rows) {
  if (f.trendT === undefined || s.t < f.trendT) return;
  if (f.know) notes.push(f.dud ? `파티룸: 기다리던 '${cName(f.trend)}' 유행이 오지 않았다(헛다리)` : `파티룸: '${cName(f.trend)}' 유행이 왔다${rows[1].ok ? "" : " · 늦었다, 이제 레드오션"}`);
  prNewTrend(s, r, f);
}
function hintScene(s, job, f) {
  const d = HID[job], hw = d.hint.who && CHAR[d.hint.who] && !s.rel[d.hint.who]?.spouse ? d.hint.who : null;
  if (hw) { if (!s.cast.includes(hw)) s.cast.push(hw); ensureRel(s, hw); }
  return { kind: "event", tag: "히든 길 낌새", title: d.hint.title, ...(hw ? { who: hw, expr: "smile" } : {}), text: d.hint.text(hw ? CHAR[hw].name : "", s, f), onChoose: "hd_hint", hd: job,
    choices: [{ t: "귀담아듣고 메모한다", eff: { mental: 1, ...(hw ? { aff: 3 } : {}) }, text: "수첩 맨 뒷장에 적었다. 이게 길이 될지도 모른다." }, { t: "흘려듣는다", eff: {}, text: "재밌는 얘기였다. 나랑은 상관없겠지." }] };
}
function openPath(s, r, job, scenes, notes) {
  const x = J(s, job), d = HID[job], R = HID_REW[job], h = H(s);
  x.open = s.t; h.n = (h.n || 0) + 1; if (R.dur) x.until = s.t + R.dur;
  s.moments = s.moments || {}; s.moments["hid_" + job] = s.t;
  const lines = [];
  if (R.lump) { const v = Math.round(R.lump * pi(s)); s.cash += v; addMoney(s, "inc", "히든 길", v); lines.push(`지분 투자 +${v.toLocaleString()}만`); }
  if (job === "cs") lines.push(s.cs?.niches?.includes("career") ? "경력 이직 포지션 운영 중" : "컨설팅 화면에서 '경력 이직' 포지션을 더할 수 있다(Lv3부터)"); // 포지션은 직접 고른다(자동으로 넣으면 컨설팅 판이 거의 다 열림 → 봇 98%)
  if (job === "vibe" && s.co) s.co.eye = clamp((s.co.eye || 0) - 30, 0, 100);
  if (job === "chicken" && s.chicken?.stores?.length) { for (const st of s.chicken.stores) st.buzz = 0; lines.push("새 간판이라 입소문은 0부터"); } // 11-25 기획 '브랜드 인지도 0에서 다시'
  log(s, `히든 길 개방: ${d.n}(${JN(job)})`, "work");
  notes.push(`히든 길 개방! ${JN(job)} · ${d.n}`);
  const mid = MENTOR_OF[job], who = mid && s.rel[mid] && CHAR[mid] ? mid : d.hint.who && s.rel[d.hint.who] ? d.hint.who : null;
  scenes.push({ kind: "story", tag: "히든 길", once: "big", title: `히든 길 개방 · ${d.n}`, who, expr: "smile", cine: "hid_" + job, hid: job,
    text: `${d.open}\n\n열린 것: ${d.rew}${d.risk ? `\n조심할 것: ${d.risk}` : ""}${lines.length ? `\n${lines.join(" · ")}` : ""}${who === mid && who ? `\n\n${CHAR[mid].name}: "문 열었네요. 이제 진짜 시작이에요."` : ""}`, choices: [{ t: "계속", eff: {}, text: "" }] });
}

// ───────── 선택 처리(core.js SCENE_FN) ─────────
export const HD_CHOOSE = {
  hd_hint(s, r, i, okv, sc) { const job = sc?.hd; if (!job) return []; if (i === 0) { const l = hidSee(s, job, "낌새"); if (job === "pr") J(s, job).f.know = 1; return [l || "히든 길 낌새", "투잡 보드에 '??? 히든 길' 한 줄이 생겼다"]; } J(s, job).hintNo = s.t + HID_P.again; return []; },
  hd_time(s, r, i, okv, sc) { const job = sc?.hd; if (!job) return []; const f = J(s, job).f; if (i === 0 && okv) { if (job === "chicken") f.deal = 1; else f.inhouse = 1; return ["히든 길 조건 하나를 채웠다"]; } f.timeT = s.t + HID_P.timeGap; return ["1년 뒤 다시 기회"]; },
};

// ───────── 봇·시험 ─────────
// 봇이 히든 길을 노릴 때: 아직 못 채운 조건 중 공부로 오르는 능력치가 있으면 { id: "study", arg } 를 돌려준다(없으면 null).
// 투잡 실적 조건(매장 수·별점·완결 등)은 그 투잡 정책이 채운다. 낌새·인연 장면은 0번(귀담아듣기·앞에 나서기)이 좋은 선택.
export function autoAim(s, job) {
  if (!HID[job] || isOpen(s, job)) return null;
  const miss = condRows(s, job).filter((c) => !c.ok);
  const st = miss.find((c) => c.st && (s.st[c.st] || 0) < c.need);
  return st ? { id: "study", arg: st.st, why: st.t } : null;
}
export const hidMiss = (s, job) => (HID[job] ? condRows(s, job).filter((c) => !c.ok).map((c) => c.t) : []);
// 시험(#...-hdtest): 조건을 무시하고 바로 연다
export function forceOpen(s, r, job, scenes) { const x = J(s, job); if (x.open !== undefined) return; if (x.seen === undefined) x.seen = s.t; x.rev = HID[job].c.length; openPath(s, r, job, scenes, []); }
export function hidDemo(s, job) { const x = J(s, job); if (x.seen === undefined) x.seen = s.t; x.rev = Math.max(x.rev, 1); if (job === "pr") { x.f.know = 1; if (!x.f.trend) { x.f.trend = "home"; x.f.trendT = s.t + 12; } } }
