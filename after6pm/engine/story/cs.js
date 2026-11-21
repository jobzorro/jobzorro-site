// 기존 투잡 'cs'(취업컨설팅) 이야기 보강. 규약: engine/story/README.md
// 돈·행동·고객 대기열은 engine/cs.js 그대로. 여기서는 이야기 이벤트·마일스톤·특전·시너지만 붙인다.
//
// 이야기 줄기(원래 단계 CS_LEVELS 기준)
//  Lv1 지인 자소서 봐주는 선배 → 후배의 SOS · 크멍 7페이지 · 회사 이름의 힘
//  Lv2 크멍 첨삭러          → 합격 캡처 · 3월/9월의 대란 · 합격률 광고 폭격 · 중고신입 · AI 자소서 · 파일 47개 · 합격률 몇 %
//  Lv3 면접 코치            → 평일 오후 특강 · 최종 면접 전날 밤 · 오픈채팅 방장 · 처우협상 · 출생아 23만 · 헤드헌터 제휴
//  Lv4~5 종합 컨설턴트·브랜드 → 책 출간(8개월) · 대기 명단 20명 · 동업 제안
//  위기                     → 패키지 불합격 환불 · 세무서 우편 → 가산세 · 번아웃 주간 · 회사에 걸렸다 · 과장 광고 신고 · 비수기 달력
//  인물                     → 합격시킨 고객의 청첩장 · "저 그만두고 싶어요"(선퇴사 금지, 환승 이직)
//  선배                     → 업계 선배 취업조로에게 한 수 배우기(판당 최대 2번): z1 합격률 정체 → 한 항목 한 이야기·두괄식 / z2 경력 이직 → 직소싱·회사가 직무보다·환승
//  퇴사 고민(p16 세 번째)   → 환승 조건(quitReady: 최근 연말 결산 투잡 이익 ≥ 연봉 + 비상금 6개월치)이 되면 본잡 전환 장면(cine full_cs · onChoose full_ev), 안 되면 모자란 배수·돈을 보여 주고 조건이 차면 한 번 더 묻는다
//
// 기획 데이터(jobconsult.json) 이벤트 16개는 원래 pr.js 의 jobEvent 가 '말로 된 효과'(돈 +40 같은 일반 효과)로 띄우던 것이다.
// 여기서 같은 16개를 단계·시즌에 맞는 때에, 후기·소개·대기 고객·검색 지수 같은 실제 상태에 반영되게 다시 만들었다.
// 같은 장면이 두 번 뜨지 않게 init/migrate 에서 s.seen["job_jobconsult_eXX"] 를 미리 채워 jobEvent 쪽은 쉬게 한다(TAKEOVER).
import * as D from "../defs.js";
import { addMoney, log, won, jo, CHAR, quitReady, monthlySpend } from "../core.js";
import * as SYN from "../syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r1 = (x) => Math.round(x * 10) / 10;
const act = (s, k) => !!s.sj?.active?.includes(k);
const company = (s) => !(s.co?.quit || s.co?.fired);
const REF_MAX = 6; // engine/cs.js CS_BAL.refMax 와 같게(순환 import 를 피하려고 숫자로 둔다)
const TAKEOVER = true; // false 로 바꾸면 기획 16개는 원래 jobEvent 가 다시 띄운다
const JC = Array.from({ length: 16 }, (_, i) => `jobconsult_e${String(i + 1).padStart(2, "0")}`); // 원래 jobEvent 의 id
const JC2P = (id) => "p" + id.slice(-2); // jobconsult_e05 → p05

const DEF = () => ({ seen: [], evT: -99, hype: 0, taxRisk: 0, taxClean: false, bookT: 0, book: false, peakN: 0, peakKey: 0, z1T: 0, z2T: 0, zVisit: 0, quitWish: 0, quitAsked: false, v: 1 });

// 이 투잡 한 달 이익 눈금(최근 6달 컨설팅 매출 평균, 최소 25만×물가). 이벤트 돈은 이것의 10~30%
function base(s) {
  const h = (s.cs.revHist || []).slice(-6).filter((x) => x > 0);
  const a = h.length ? h.reduce((x, y) => x + y, 0) / h.length : 0;
  return Math.max(25 * SYN.pi(s), a);
}
const exClients = (s) => (s.cast || []).filter((id) => CHAR[id] && s.rel[id]?.client);

// ───────── 이벤트(기획 16개 p01~p16 + 새로 지은 n01~n13) ─────────
// ph: early·mid·late·crisis, ok: 뜰 수 있는 때, on: 선택 뒤 css_ev 처리, rep: 다 본 뒤 가끔 다시, who: 예전 고객이 장면에 선다
function evList(s, who) {
  const cs = s.cs, X = s.sx.cs, pi = SYN.pi(s), b = base(s), co = company(s);
  const big = Math.round(b * 0.3), mid = Math.round(b * 0.15), sm = Math.round(Math.max(8 * pi, b * 0.08));
  const wn = who ? CHAR[who]?.name : "";
  const rate = cs.passes + cs.fails ? Math.round((100 * cs.passes) / (cs.passes + cs.fails)) : 0;
  const half = Math.round(Math.max(30 * pi, b * 0.3)), tx = Math.round(Math.max(20 * pi, b * 0.15)), fine = Math.round(Math.max(40 * pi, b * 0.3));
  const peakName = s.cal === 2 ? "3월" : "9월";
  const cz1 = Math.round(5 * pi), cz2 = Math.round(8 * pi); // 선배와 커피·저녁값
  return [
    // ── 기획 16개 ──
    { id: "p01", ph: "early", ok: () => !!cs.niche && cs.lv === 1 && cs.friends >= 1 && cs.passes === 0, t: "후배의 SOS",
      x: "밤 11시, 대학 후배에게서 메시지가 왔다. \"선배, 내일 마감인데 자소서 한 번만 봐 주세요.\" 첨부 파일은 4문항, 글자 수는 이미 초과다.",
      c: [{ t: "무료로 밤새 고쳐 준다", eff: { hp: -10, css_rev: 1, stat: { write: 0.8 } }, text: "새벽 4시. 첫 문장을 전부 두괄식으로 갈아엎었다. \"선배, 이거 완전 다른 글이 됐어요.\"" },
          { t: "커피 쿠폰 받고 1문항만 봐 준다", eff: { hp: -3, css_rev: 0.4 }, text: "1번 문항만 손봤다. 나머지 3문항은 후배 몫이다." },
          { t: "\"다음에 정식으로 받을게\" 하고 거절한다", eff: { mental: 3 }, text: "푹 잤다. 후배 프로필 사진이 잠깐 서운해 보였다." }] },
    { id: "p02", ph: "early", ok: () => cs.ch.kmong.on && cs.lv <= 2, t: "크멍 7페이지",
      x: "크멍에 자소서 첨삭을 올렸다. 같은 카테고리에 후기 300개짜리 판매자가 줄지어 있다. 내 상품은 검색 7페이지에 있다.",
      c: [{ t: "첫 5명 반값 이벤트", eff: { hp: -5, css_rev: 2, css_kq: 4 }, text: "반값에 5명이 몰렸다. 남는 건 거의 없다. 대신 후기 2개가 상품을 3페이지로 끌어올렸다." },
          { t: "정가 유지, 상세페이지를 다듬는다", eff: { ap: -1, css_kq: 8, stat: { sense: 0.5 } }, text: "합격 캡처, 첨삭 전후 비교, 가격표. 주말 하루가 통째로 사라졌다." }] },
    { id: "p03", ph: "early", ok: () => cs.passes >= 2, t: "합격 캡처, 그다음",
      x: "점심시간, 두 달 전에 첨삭해 준 고객이 최종 합격 캡처를 보냈다. \"선생님 덕분이에요!\" 회의실에서 혼자 주먹을 쥐었다. 후기를 부탁해도 될까.",
      c: [{ t: "후기 작성을 정중히 부탁한다", eff: { css_rev: 1.5, css_refer: 0.4 }, text: "합격 화면까지 붙인 긴 후기가 올라왔다. 다음 달 문의가 늘 것 같다." },
          { t: "축하만 하고 넘어간다", eff: { mental: 5, css_rev: 0.5, item: "m_pass" }, text: "\"진짜 축하해요.\" 그 한마디로 충분했다. 고객이 알아서 짧은 후기를 남겼다." }] },
    { id: "p04", ph: "early", ok: () => co && cs.open && cs.lv <= 2, t: "회사 이름의 힘",
      x: "프로필에 다니는 회사 업종과 직무를 적었더니 문의가 세 배로 늘었다. 동시에 팀장님이 \"요즘 퇴근이 빠르네\" 하고 지나갔다.",
      c: [{ t: "회사명을 더 구체적으로 드러낸다", eff: { css_refer: 1.2, eye: 8 }, text: "\"그 회사 현직자세요?\" 문의가 쏟아졌다. 사내 메신저에서 내 이름을 검색한 기록도 늘었다." },
          { t: "업종·규모로만 쓴다", eff: { css_refer: 0.4 }, text: "'제조 대기업 기획 현직'. 덜 화려하지만 오래 간다." }] },
    { id: "p05", ph: "mid", ok: () => cs.lv >= 2 && (s.cal === 8 || s.cal === 2), t: `${peakName}의 대란`,
      x: `${s.cal === 2 ? "상반기" : "하반기"} 공채가 열리자 첨삭 문의가 하루 12건 들어왔다. 마감은 모두 같은 주 금요일이다.${co ? " 본업은 분기 결산 주간이다." : ""}`,
      c: [{ t: `전부 받는다 (+${won(big)})`, check: { stat: "write", dc: 55 },
            ok: { text: "새벽 3시까지 12명을 다 끝냈다. 기적처럼 품질도 지켰다.", eff: { css_cash: big, hp: -15, mental: -4 } },
            ng: { text: "마지막 세 명은 솔직히 대충 봤다. 티가 났다.", eff: { css_cash: big, hp: -15, mental: -6, css_rev: -1.5 } } },
          { t: `선착순 5명만 받는다 (+${won(mid)})`, eff: { css_cash: mid, hp: -6 }, text: "나머지 7명에게 '다음 시즌 우선 예약'을 보냈다." },
          { t: `단가를 50% 올려 거른다 (+${won(mid)})`, eff: { css_cash: mid, hp: -3, css_refer: -0.3 }, text: "\"비싸네요\" 하고 나간 사람도 있다. 남은 사람은 진지했다." }] },
    { id: "p06", ph: "mid", ok: () => cs.lv >= 2, t: "\"합격률 92%\" 광고 폭격",
      x: "인별을 켜자 대형 컨설팅 업체 광고가 세 번 연속 떴다. \"합격률 92%\". 그날 내 상담 예약 두 건이 취소됐다.",
      c: [{ t: `광고비 ${won(Math.round(30 * pi))}을 써 본다`, eff: { css_cost: Math.round(30 * pi), css_refer: 0.8 }, text: "클릭은 늘었다. 문의로 이어진 건 그 절반." },
          { t: "블로그에 실제 합격 사례를 꾸준히 쓴다", eff: { hp: -4, css_blog: 6, stat: { write: 0.5 } }, text: "'92%'는 못 쓴다. 진짜 이야기는 쓸 수 있다. 저장 수가 천천히 쌓인다." }] },
    { id: "p07", ph: "mid", ok: () => cs.lv >= 2 && s.st.career >= 35, t: "중고신입의 등장", on: true,
      x: "3년 차 직장인이 상담을 신청했다. \"같은 직무로 더 좋은 회사요. 비용은 상관없어요.\" 대학생보다 지갑이 두껍다. 대신 기대도 두껍다.",
      c: [{ t: "중고신입 전용 패키지를 만든다", eff: { stat: { mkt: 0.6 } }, text: "'경력 1~3년 차 직무 이동' 상품을 새로 올렸다. 첫 고객이 바로 결제했다." },
          { t: "기존 신입 상품으로 받는다", eff: {}, text: "가격은 그대로. 고객은 경력 얘기를 하고 싶어 했다." }] },
    { id: "p08", ph: "mid", ok: () => cs.lv >= 3 && co, t: "평일 오후 특강", on: true,
      x: "교육 행사 대행사에서 연락이 왔다. 지방 대학 2시간 취업 특강, 시간당 15만 원. 문제는 평일 오후다.",
      c: [{ t: "연차를 쓰고 간다", eff: { css_cash: Math.round(30 * pi), css_rev: 1, css_refer: 0.5, eye: 3, hp: -5 }, text: "왕복 다섯 시간, 강의 두 시간. 학생 60명 중 8명이 오픈채팅방에 들어왔다." },
          { t: "주말 일정만 된다고 답한다", eff: {}, text: "\"확인해 보고 연락드릴게요.\"" }] },
    { id: "p09", ph: "mid", ok: () => cs.lv >= 2, t: "\"AI가 써 준 게 더 낫던데요\"", on: true,
      x: "고객이 AI로 다시 쓴 자소서를 내밀었다. 매끈하다. 그런데 어디서 본 듯한 문장뿐이다. 인사담당자는 이런 글을 하루 천 장 본다.",
      c: [{ t: "AI 티 나는 문장을 짚어 주는 코칭으로 바꾼다", check: { stat: "write", dc: 45 },
            ok: { text: "'~를 통해 ~를 함양했습니다'에 빨간 줄 12개. 고객이 웃었다. \"이거 제 말투가 아니네요.\"", eff: { css_rev: 1.5, stat: { write: 1 } } },
            ng: { text: "설명이 길어졌다. 고객은 반만 납득했다.", eff: { css_rev: 0.3 } } },
          { t: "가격을 낮춰 AI와 경쟁한다", eff: { mental: -3 }, text: "싸게 받으니 손님은 늘었다. 일한 만큼 남지 않는다." }] },
    { id: "p10", ph: "late", ok: () => cs.lv >= 4 && cs.ch.blog.posts >= 30 && !X.bookT, t: "책 출간 제의", on: true,
      x: "출판사 편집자가 블로그 글을 보고 메일을 보냈다. \"취업 실전서 한 권 쓰시죠. 인세는 정가의 8~10%입니다.\" 원고 마감은 8개월 뒤다.",
      c: [{ t: "계약한다 (8개월 동안 매달 스태미너 −2)", eff: { mental: -2 }, text: "계약서에 도장을 찍었다. 퇴근 후 첨삭, 그다음에 원고." },
          { t: "아직 이르다며 고사한다", eff: {}, text: "\"나중에 꼭 다시 연락 주세요.\" 메일에 별표를 달아 뒀다." }] },
    { id: "p11", ph: "late", ok: () => cs.lv >= 4 && cs.clients >= 60, t: "대기 명단 20명", on: true,
      x: "1:1 대기자가 20명을 넘었다. 한 달에 제대로 볼 수 있는 건 8명뿐이다. 6명씩 묶어 그룹반을 열어 볼까.",
      c: [{ t: `그룹반을 연다 (+${won(Math.round(b * 0.25))})`, eff: { css_cash: Math.round(b * 0.25), stat: { talk: 1 }, css_rev: -0.5, hp: -6 }, text: "6명이 한 화면에. 한 명이 \"저는 1:1인 줄 알았는데요\" 하고 나갔다." },
          { t: `대기 고객 단가를 올려 1:1만 지킨다 (+${won(Math.round(b * 0.12))})`, eff: { css_cash: Math.round(b * 0.12), css_rev: 1 }, text: "대기 명단은 줄었다. 남은 고객은 더 꼼꼼히 봤다." }] },
    { id: "p12", ph: "mid", ok: () => cs.lv >= 3 && s.t >= 36, t: "출생아 23만 8천 명", on: true,
      x: "뉴스에 작년 출생아 수가 나왔다. 23만 8천 명. 지금 취준생 세대의 절반도 안 된다. 15년 뒤 내 고객은 어디에 있을까.",
      c: [{ t: "경력 이직 컨설팅으로 축을 넓힌다", eff: { stat: { career: 1.5, mkt: 0.5 } }, text: "신입은 줄어도 이직은 늘어난다. 경력기술서 첨삭 사례를 모으기 시작했다." },
          { t: "강의·콘텐츠 자산을 만든다", eff: { hp: -4, css_vod: 30 }, text: "한 번 찍어 두면 15년 뒤에도 팔린다. 녹화 버튼을 눌렀다." }] },
    { id: "p13", ph: "crisis", ok: () => cs.lv >= 3 && cs.reviews >= 15 && cs.fails >= 3, t: "패키지 고객의 불합격",
      x: "합격까지 패키지를 받은 고객이 최종에서 떨어졌다. 부모님이 직접 전화했다. \"합격 못 하면 의미 없는 거 아닌가요? 전액 환불해 주세요.\"",
      c: [{ t: "남은 회차를 연장해 주며 설득한다", check: { stat: "talk", dc: 50 },
            ok: { text: "\"다음 시즌까지 같이 가 보죠.\" 부모님이 한숨을 쉬고 수긍했다.", eff: { hp: -6, ap: -1 } },
            ng: { text: "설득은 실패. 결국 절반을 돌려줬다.", eff: { hp: -4, css_refund: half } } },
          { t: `절반 환불한다 (−${won(half)})`, eff: { css_refund: half, mental: -3 }, text: "계약서에 없던 돈이 나갔다. 대신 조용히 끝났다." },
          { t: "계약서대로 거절한다", eff: { css_rev: -2.5, mental: -4 }, text: "규정은 내 편이었다. 취준 커뮤니티 글은 아니었다." }] },
    { id: "p14", ph: "crisis", ok: () => cs.lv >= 2 && cs.clients >= 30 && !X.taxClean, t: "세무서에서 온 우편", on: true,
      x: "계좌이체로, 가끔은 현금으로 받은 상담료가 꽤 쌓였다. 어느 날 우편함에 세무서 안내문이 꽂혀 있다. 업계 세무조사 소문이 돈다.",
      c: [{ t: `세무사를 쓰고 지난 소득을 정리해 신고한다 (−${won(tx)})`, eff: { css_tax: tx, mental: 6 }, text: "영수증 상자를 통째로 넘겼다. 마음이 가벼워졌다." },
          { t: "모른 척한다", eff: {}, text: "안내문을 서랍에 넣었다. 서랍이 조금 무거워졌다." }] },
    { id: "p15", ph: "crisis", ok: () => cs.lv >= 3 && co && (s.mental < 55 || s.hp < 50 || s.cal === 4 || s.cal === 10), t: "번아웃 주간", on: true,
      x: "평일엔 회사, 저녁엔 면접 연습, 주말엔 첨삭. 석 달째 쉬는 날이 없다. 아침에 알람을 끄고 다시 누웠다. 지각이다.",
      c: [{ t: "한 달 신규 접수를 닫는다", eff: { hp: 20, mental: 10, css_refer: -0.6 }, text: "'이번 달 접수 마감' 공지를 올렸다. 하늘은 무너지지 않았다." },
          { t: "버틴다", eff: { hp: -12, eye: 8, mental: -4 }, text: "지각 사유서를 썼다. 팀장님 표정이 오래 남았다." }] },
    { id: "p16", ph: "crisis", ok: () => co && cs.lv >= 2 && (cs.nick === "real" || cs.ch.youtube.subs > 2000 || cs.ch.insta.f > 3000), t: "회사에 걸렸다", on: true,
      x: "옆 팀 신입이 엘리베이터에서 물었다. \"혹시 취업 컨설팅 하시는 그분 아니세요? 저 영상 봤어요!\" 다음 날 인사팀에서 겸업 신고서를 보내왔다.",
      c: [{ t: "정식으로 겸업 신고한다", eff: { eye: 5, mental: 4 }, text: "'근무 시간 외, 회사 정보 미사용' 서약서에 서명했다. 이제 숨지 않아도 된다." },
          { t: "얼굴을 가리고 익명으로 바꾼다", eff: { css_rev: -2, eye: -6 }, text: "프로필 사진을 내리고 활동명을 바꿨다. '그 사람 맞아?' 하는 문의가 줄었다." },
          { t: "이참에 퇴사를 고민한다", eff: { family: -3, mental: 2 }, text: "사직서 초안을 써서 서랍에 넣고, 계산기부터 꺼냈다. 감정으로 내는 사표는 오래 못 간다." }] },

    // ── 새로 지은 이야기 ──
    { id: "n01", ph: "mid", ok: () => cs.lv >= 2 && cs.template < 3 && cs.clients >= 25, t: "_최종_진짜최종_v7",
      x: "이번 주 첨삭 파일만 47개. '두괄식으로 바꾸세요'를 오늘만 서른 번 썼다. 손목에 파스를 붙였다.",
      c: [{ t: "자주 쓰는 코멘트를 템플릿으로 묶는다 (다음 달 행동력 −1)", eff: { ap: -1, css_tpl: 0.5 }, text: "코멘트 40개, 예시 문장 20개. 다음 고객부터 30분씩 줄었다." },
          { t: "한 명 한 명 새로 쓴다", eff: { hp: -6, stat: { write: 0.8 }, css_rev: 0.5 }, text: "\"제 글만 봐 주신 느낌이에요.\" 손목은 더 아파졌다." }] },
    { id: "n02", ph: "mid", ok: () => cs.lv >= 2 && cs.passes >= 5 && cs.fails >= 3, t: "\"합격률이 몇 %예요?\"", on: true,
      x: `상담 문의 첫마디가 늘 같다. "합격률이 몇 %예요?" 내 실제 숫자는 합격 ${cs.passes}명, 불합격 ${cs.fails}명(${rate}%). 경쟁 업체들은 90%를 쓴다.`,
      c: [{ t: "나도 '합격률 90%'라고 쓴다", eff: { css_refer: 1 }, text: "문의가 확 늘었다. 마음 한구석이 계속 찜찜하다." },
          { t: "실제 숫자와 계산법을 공개한다", check: { stat: "talk", dc: 45 },
            ok: { text: "\"오히려 믿음이 가요.\" 숫자를 본 사람들이 남았다.", eff: { css_rev: 1.5, css_refer: 0.3 } },
            ng: { text: "\"생각보다 낮네요?\" 두 명이 떠났다.", eff: { css_refer: -0.3 } } }] },
    { id: "n03", ph: "crisis", ok: () => X.hype && s.t - X.hype >= 4, t: "과장 광고 신고",
      x: "크멍 운영팀에서 메일이 왔다. \"'합격률 90%' 표기의 근거 자료를 7일 안에 제출해 주세요. 제출하지 않으면 상품이 비노출됩니다.\"",
      c: [{ t: "표기를 내리고 사과 공지를 올린다", eff: { css_kq: -10, css_rev: -1, mental: -3 }, text: "상품은 살았다. 검색 순위는 한참 밀렸다." },
          { t: "근거를 끼워 맞춰 낸다", check: { stat: "num", dc: 60 },
            ok: { text: "어떻게든 넘어갔다. 다시는 안 하기로 했다.", eff: { mental: -5 } },
            ng: { text: "비노출 처리. 한 달 동안 크멍 문의가 끊겼다.", eff: { css_kq: -25, css_rev: -2, mental: -6 } } }] },
    { id: "n04", ph: "mid", ok: () => cs.lv >= 3, rep: true, t: "최종 면접 전날 밤 11시",
      x: "고객 까톡. \"선생님, 내일 9시 최종 면접인데 모의면접 한 번만 더 해 주시면 안 돼요? 1분 자기소개가 자꾸 2분을 넘어요.\"",
      c: [{ t: `추가 회차로 받는다 (+${won(sm)})`, eff: { css_cash: sm, hp: -4 }, text: "자정까지 화상으로 다섯 번. 1분 자기소개가 58초가 됐다." },
          { t: "무료로 30분만 봐 준다", check: { stat: "talk", dc: 45 },
            ok: { text: "'결론 → 근거 사례 → 회사 연결'. 세 줄로 정리해 줬다. 다음 날 \"붙었어요!\"", eff: { hp: -3, css_rev: 1, css_refer: 0.4 } },
            ng: { text: "긴장만 더 시킨 것 같다. 둘 다 잠을 설쳤다.", eff: { hp: -3, mental: -3 } } },
          { t: "\"지금은 자는 게 답이에요\" 하고 재운다", eff: { mental: 2 }, text: "\"네... 알겠어요.\" 서운한 이모티콘이 왔다." }] },
    { id: "n05", ph: "mid", ok: () => cs.ch.kakao.m >= 150, rep: true, t: "오픈채팅방 방장",
      x: `오픈채팅방이 ${cs.ch.kakao.m.toLocaleString()}명이 됐다. 하루 메시지 800개. 절반은 "저 이 회사 붙을까요?", 나머지는 코인 광고와 홍보 링크다.`,
      c: [{ t: "합격한 고객을 부방장으로 세운다", eff: { css_kakao: 40, mental: 3 }, text: "부방장이 새벽 광고를 다 걸러 줬다. 방 분위기가 살아났다." },
          { t: "내가 직접 다 관리한다", eff: { hp: -5, css_kakao: 70, stat: { talk: 0.5 } }, text: "점심시간마다 강퇴 버튼을 눌렀다. 공고 정리 공지에 '감사합니다'가 100개." },
          { t: "방을 닫고 블로그에 집중한다", eff: { mental: 6, css_kakaoX: 0.5, css_blog: 4 }, text: "알림이 조용해졌다. 문의도 같이 조용해졌다." }] },
    { id: "n06", ph: "mid", ok: () => cs.lv >= 3 && cs.passes >= 15, t: "합격 다음 날의 질문",
      x: "합격한 고객이 다시 연락했다. \"연봉 제안이 왔는데요, 협상해도 돼요? 잘못 말하면 합격이 취소될까 봐 무서워요.\"",
      c: [{ t: `처우협상 코칭을 새 상품으로 판다 (+${won(sm)})`, eff: { css_cash: sm, stat: { mkt: 0.5 } }, text: "'협상 문장 세 개'와 '먼저 말하면 안 되는 숫자'. 고객 연봉이 300만 원 올랐다." },
          { t: "서비스로 알려 준다", eff: { css_refer: 0.6, css_rev: 0.5 }, text: "\"선생님은 끝까지 챙겨 주시네요.\" 입사 동기 두 명을 소개해 줬다." }] },
    { id: "n07", ph: "late", ok: () => cs.lv >= 4, t: "동업 제안",
      x: "블로그 이웃 컨설턴트가 제안했다. \"같이 브랜드 만들어요. 고객은 공유, 수익은 반반.\" 실력은 좋다. 계약서 이야기는 아직 안 했다.",
      c: [{ t: "계약서부터 쓰고 함께한다", check: { stat: "career", dc: 55 },
            ok: { text: "역할·수익·고객 소유를 전부 적었다. 소개가 두 배로 돌기 시작했다.", eff: { css_refer: 1.5, css_rev: 2 } },
            ng: { text: "6개월 뒤, 파트너가 고객 명단을 들고 독립했다.", eff: { css_refer: -1, css_rev: -1, mental: -8 } } },
          { t: "혼자 간다", eff: { mental: 2 }, text: "느리지만 내 이름은 내 것이다." }] },
    { id: "n08", ph: "mid", who: true, ok: () => cs.lv >= 2 && s.t >= 24 && !!who, t: "청첩장",
      x: `${wn}님에게서 모바일 청첩장이 왔다. "선생님 덕분에 들어간 회사에서 만난 사람이랑 결혼해요. 꼭 와 주세요!" 합격시킨 지 몇 해가 지났다.`,
      c: [{ t: `가서 축하한다 (축의금 −${won(Math.round(10 * pi))})`, eff: { cash: -Math.round(10 * pi), aff: 10, mental: 6, item: "m_letter", css_refer: 0.5 }, text: "하객석 맨 끝에 앉았다. 사회자가 \"인생의 은인\"이라며 내 이름을 불렀다." },
          { t: "축하 메시지와 선물만 보낸다", eff: { cash: -Math.round(5 * pi), aff: 4 }, text: "\"마음만으로도 고마워요.\" 답장이 왔다." }] },
    { id: "n09", ph: "mid", who: true, ok: () => cs.lv >= 3 && !!who, t: "\"저 그만두고 싶어요\"",
      x: `${wn}님이 밤에 전화했다. 합격시켜 준 회사에 다닌 지 1년. "팀장이 너무 힘들어요. 내일 사표 내려고요."`,
      c: [{ t: "선퇴사는 말리고 환승 이직 계획을 같이 짠다", check: { stat: "career", dc: 45 },
            ok: { text: "\"다니면서 준비해요. 마음 뜬 티가 나면 안 돼요.\" 넉 달 뒤, 연봉을 올려 옮겼다.", eff: { aff: 10, css_refer: 0.6, css_rev: 1, shard: 1 } },
            ng: { text: "말은 들었지만 결국 사표를 냈다. 석 달째 쉬고 있다고 한다.", eff: { aff: 3, mental: -3 } } },
          { t: "\"힘들면 그만둬도 돼요\" 하고 들어 준다", eff: { aff: 5, mental: -2, css_cash: sm }, text: "후련한 목소리였다. 다음 달, 이직 상담을 다시 신청했다." }] },
    { id: "n10", ph: "mid", ok: () => co && cs.lv >= 2, rep: true, t: "점심시간의 상담 전화",
      x: "팀장님과 같은 테이블에서 점심을 먹는데 휴대폰이 울린다. 화면에 '자소서_오후3시 고객'. 팀장님 눈이 화면으로 간다.",
      c: [{ t: "\"잠깐만요\" 하고 받는다", eff: { eye: 6, css_rev: 0.5 }, text: "\"네, 3번 문항은 두괄식으로…\" 팀장님 숟가락이 멈췄다." },
          { t: "끊고 나중에 건다", eff: { css_rev: -0.5 }, text: "오후 내내 회의. 고객은 다른 컨설턴트에게 갔다." },
          { t: "회의실을 잡고 5분만 통화한다", check: { stat: "talk", dc: 40 },
            ok: { text: "\"택배 문의요.\" 자연스럽게 빠져나왔다.", eff: { eye: 1 } },
            ng: { text: "회의실 유리벽 너머로 팀장님이 지나갔다.", eff: { eye: 5 } } }] },
    { id: "n11", ph: "crisis", ok: () => X.taxRisk && s.t - X.taxRisk >= 12, t: "가산세 고지서", on: true,
      x: "그 안내문을 서랍에 넣은 지 1년. 세무서에서 다시 우편이 왔다. 신고하지 않은 상담료에 무신고 가산세와 납부지연 가산세가 붙었다.",
      c: [{ t: `한 번에 낸다 (−${won(fine)})`, eff: { css_tax: fine, mental: -4 }, text: "통장이 가벼워졌다. 이번엔 세무사 번호를 저장했다." },
          { t: "세무사와 소명해 줄여 본다", check: { stat: "num", dc: 50 },
            ok: { text: "빠뜨린 경비를 찾아 꽤 줄였다.", eff: { css_tax: Math.round(fine * 0.6), mental: -2 } },
            ng: { text: "세무사 비용만 더 나갔다.", eff: { css_tax: Math.round(fine * 1.15), mental: -6 } } }] },
    { id: "n12", ph: "crisis", ok: () => cs.lv >= 3 && (s.cal === 11 || s.cal === 6), rep: true, t: "텅 빈 비수기 달력",
      x: `공채 시즌이 끝났다. ${s.cal === 11 ? "12월" : "7월"} 예약표가 하얗다. 지난 시즌에 번 돈으로 산 웹캠과 조명이 방 한구석에 서 있다.`,
      c: [{ t: "비수기에 콘텐츠를 비축한다", eff: { hp: -4, css_blog: 6, css_vod: 15 }, text: "'다음 시즌 대비 체크리스트' 글 10개를 예약 발행했다." },
          { t: `할인 이벤트로 빈자리를 채운다 (+${won(sm)})`, eff: { css_cash: sm, css_rev: -0.3 }, text: "반값에 왔던 고객이 다음 시즌 정가를 보고 놀랐다." },
          { t: "그냥 쉰다", eff: { hp: 10, mental: 6 }, text: "석 달 만에 주말 늦잠을 잤다." }] },
    { id: "n13", ph: "late", ok: () => cs.lv >= 3 && cs.niches.includes("career"), t: "헤드헌터의 제휴 제안",
      x: "경력 이직 고객을 돕다 알게 된 헤드헌터가 연락했다. \"후보자 경력기술서를 다듬어 주시면 건당 수수료 드릴게요. 대신 저희 포지션 위주로요.\"",
      c: [{ t: `제휴한다 (+${won(sm)}, 소개 +)`, eff: { css_cash: sm, css_refer: 1.2 }, text: "소개가 꾸준히 들어온다. 가끔은 고객에게 맞지 않는 포지션을 권하게 된다." },
          { t: "고객 편에 서고 싶어 거절한다", eff: { css_rev: 1 }, text: "\"직무보다 회사가 중요해요.\" 내 고객에게는 그 말만 하고 싶다." }] },

    // ── 업계 선배 취업조로에게 한 수 배우기(판당 최대 2번, 두 번째는 더 깊을 때) ──
    { id: "z1", ph: "mid", ok: () => cs.lv >= 2 && cs.passes >= 5 && cs.reviews >= 12 && s.t >= 18 && rate < 60, t: "선배 컨설턴트, 취업조로", on: true,
      x: `후기는 ${Math.floor(cs.reviews)}개가 쌓였는데 합격률은 ${rate}%에서 꿈쩍도 안 한다. 빨간 펜은 점점 바빠지는데 숫자는 그대로다. 예전 취업 스터디에서 만난 업계 선배가 떠올랐다. 이 일만 15년째 하고 있는 '취업조로'. 메시지를 보냈더니 바로 답이 왔다. "토요일 오전 어때요? 요즘 첨삭한 자소서 두세 개만 들고 와요 ㅎㅎ"`,
      c: [{ t: `토요일 아침, 첨삭본을 싸 들고 간다 (커피값 −${won(cz1)}, 다음 달 행동력 −1)`, eff: { cash: -cz1, ap: -1, stat: { write: 1.5 }, css_zr1: 1, item: "m_memo" },
            text: "선배가 내 첨삭본을 한참 넘기다 웃었다. \"엄청 꼼꼼하시네요. 근데 그게 문제예요 ㅎㅎ 이 문항에 이야기가 세 개 들어 있잖아요. 인사팀 한 사람이 수천 장을 봐요. 한 항목엔 이야기 하나, 첫 줄에 결론, 소제목 달고, 본론은 숫자로.\" 고객 글에서 두 문단을 지우고 첫 문장만 바꿨는데 글이 확 살아났다. 돌아오는 지하철에서 첨삭 체크리스트를 새로 짰다. 헤어질 때 선배가 한마디 했다. \"첨삭은 더해 주는 게 아니라 덜어 주는 거예요.\"" },
          { t: "주말에 혼자 다시 파 본다", check: { stat: "write", dc: 55 },
            ok: { text: "합격 자소서 30개를 펼쳐 놓고 내 첨삭본과 나란히 봤다. 붙은 글은 첫 문장이 다 짧았다. 감은 잡혔다.", eff: { hp: -4, stat: { write: 0.6 } } },
            ng: { text: "밤새 들여다봤지만 뭐가 문제인지 모르겠다. 다음 주 첨삭도 같은 방식으로 나갔다.", eff: { hp: -4, mental: -2 } } }] },
    { id: "z2", ph: "late", ok: () => X.z1T > 0 && X.z2Ok && s.t - X.z1T >= 18 && cs.lv >= 4 && cs.passes >= 25 && (cs.niches.includes("career") || s.st.career >= 45 || cs.clients >= 80), t: "경력 이직의 벽", on: true,
      x: `7년 차 과장 고객이 석 달째 서류에서 떨어진다. 경력기술서는 벌써 열 번을 고쳤다. "제가 나이가 많아서 그런 걸까요?" 신입 자소서 공식이 여기선 안 먹힌다. ${X.zVisit ? "예전에 체크리스트를 알려 준 선배 취업조로에게 다시 연락했다. \"이번엔 제가 밥 살게요 ㅎㅎ 경력기술서 들고 오세요.\"" : "지난번엔 바빠서 못 만난 선배 취업조로에게 이번엔 먼저 연락했다. \"드디어 오시네요 ㅎㅎ 저녁 먹으면서 봐요.\""}`,
      c: [{ t: `퇴근 후 저녁 자리에 간다 (밥값 −${won(cz2)}, 스태미너 −8)`, eff: { cash: -cz2, hp: -8, stat: { career: 2 }, css_zr2: 1, item: "cs_tpl" },
            text: "선배가 경력기술서를 보더니 먼저 물었다. \"이분 지금 어떻게 지원하고 있어요?\" 공고 30개에 직접 넣는 중이라고 했다. \"경력 이직은 이제 직소싱 시대예요. 회사랑 헤드헌터가 먼저 찾아와요. 경력기술서를 채용 플랫폼에 열어 두고 매달 고치게 하세요. 헤드헌터 제안은 거르지 말고 일단 다 들어 보고요.\" 숟가락을 내려놓고 하나 더. \"직무 이름보다 회사를 보세요. 좋은 회사에 들어가면 안에서 길이 생겨요. 그리고 지금 회사는 절대 먼저 그만두지 말라고 하세요. 환승이에요, 환승 ㅎㅎ\" 그 주에 고객 경력기술서를 공개로 돌렸다. 계산은 결국 선배가 했다. \"잘되면 그때 사요.\"" },
          { t: "\"제가 끝까지 해 볼게요\" 혼자 붙든다", check: { stat: "career", dc: 55 },
            ok: { text: "공고를 처음부터 다시 걸렀다. 직무 이름 말고 회사부터. 두 곳에서 면접 연락이 왔다.", eff: { hp: -4, stat: { career: 0.8 }, css_rev: 0.5 } },
            ng: { text: "열한 번째 수정본을 보냈다. 고객 답장이 점점 짧아진다.", eff: { hp: -4, mental: -3, css_rev: -0.5 } } }] },
  ];
}

function pickEvent(s, r) {
  const X = s.sx.cs;
  const cands = exClients(s), who = cands.length ? r.pick(cands) : null;
  const L = evList(s, who).filter((e) => { try { return e.ok(); } catch (x) { return false; } });
  const fresh = L.filter((e) => !X.seen.includes(e.id));
  // 꼭 그때 나와야 하는 것: 첫 후배 SOS, 크멍 입점, 첫 합격 뒤, 시즌 대란. 뒷이야기(과장 광고·가산세)는 달마다 35%
  let e = fresh.find((x) => ["p01", "p02", "p03", "p05"].includes(x.id)) || null;
  if (!e) { const f = fresh.find((x) => ["n03", "n11"].includes(x.id)); if (f && r.chance(0.35)) e = f; }
  // 선배 취업조로: 조건이 되면 달마다 40%(z1·z2 각 한 번뿐이라 판당 최대 2번)
  if (!e) { const z = fresh.find((x) => x.id === "z1" || x.id === "z2"); if (z && r.chance(0.4)) e = z; }
  if (!e && fresh.length && r.chance(0.3)) {
    const ord = { early: 0, mid: 1, crisis: 1, late: 2 }, lo = Math.min(...fresh.map((x) => ord[x.ph]));
    e = r.pick(fresh.filter((x) => ord[x.ph] <= lo + 1));
  }
  if (!e && r.chance(0.05)) { const rp = L.filter((x) => x.rep); if (rp.length) e = r.pick(rp); }
  if (!e) return null;
  if (!X.seen.includes(e.id)) X.seen.push(e.id);
  X.evT = s.t;
  return { kind: "event", tag: "컨설팅", title: e.t, text: e.x, onChoose: "css_ev", css: e.id, ...(e.who ? { who } : {}), choices: e.c };
}

// 퇴사 고민 → 본잡 전환. 형식은 core.js 연말 결산(yearSettle) 장면과 같고, 사직서 처리는 core 의 full_ev 가 한다(s._fullJob 사용)
function quitNeed(s) { const q = quitReady(s), need = Math.round(monthlySpend(s) * 6), have = Math.round(s.cash + s.invest); return { ...q, need, have }; }
function fullScene(s, again) {
  const q = quitNeed(s);
  s._fullJob = "cs";
  return { kind: "event", tag: "본잡 전환", title: again ? "서랍 속 사직서" : "사직서를 꺼낼 때", cine: "full_cs", onChoose: "full_ev",
    text: `${again ? "몇 달 전 서랍에 넣어 둔 사직서를 다시 꺼냈다. " : ""}계산기를 두드려 봤다. 지난 연말 결산에서 투잡 이익이 연봉의 ${q.x.toFixed(1)}배였고, 비상금도 6개월치(${won(q.need)})를 넘겼다. 환승 조건은 다 찼다. 회사를 나와 취업컨설팅을 본잡으로 할까요?`,
    choices: [
      { t: "컨설팅을 본잡으로! 사직서를 낸다", eff: {}, text: "사직서를 냈다. 마지막 달까지 인수인계는 깔끔하게. 내일부터 출근지는 내 상담실이다. 행동력 +5, 월급은 끊긴다." },
      { t: "아직은 병행한다", eff: { mental: 2 }, text: "조건이 찼다는 것만으로 든든하다. 조금 더 다니며 모으기로 했다." },
    ] };
}

// 기획 16개를 원래 jobEvent 가 다시 띄우지 않게 표시(이미 본 것은 내 seen 에도 넣는다)
function takeover(s, X) {
  if (!TAKEOVER || !s.seen) return;
  for (const id of JC) {
    const k = "job_" + id;
    if (s.seen[k] !== undefined && s.seen[k] >= 0 && !X.seen.includes(JC2P(id))) X.seen.push(JC2P(id));
    if (s.seen[k] === undefined) s.seen[k] = -1;
  }
}

export default {
  key: "cs",
  prefix: "css_",
  init(s) { const X = DEF(); takeover(s, X); return X; },
  migrate(s, X) { const d = DEF(); for (const k of Object.keys(d)) if (X[k] === undefined) X[k] = d[k]; takeover(s, X); },

  month(s, r, notes, scenes) {
    const cs = s.cs, X = s.sx.cs, pi = SYN.pi(s);
    if (!X || !cs.niche) return;
    // 시너지
    if (SYN.on(s, "css_tutor")) s.hp = clamp(s.hp + 2, 0, s.hpMax);
    if (SYN.on(s, "css_tarot")) cs.refer = Math.min(REF_MAX, cs.refer + 0.15);
    // 책 원고(8개월)
    if (X.bookT && !X.book) {
      if (s.t >= X.bookT) {
        X.book = true; cs.vod.n += 1; cs.vod.income += Math.round(25 * pi); cs.reviews += 3; cs.refer = Math.min(REF_MAX, cs.refer + 1);
        notes.push("취업 실전서 출간! 인세·강의 문의가 따라온다(후기 +3)"); log(s, "취업 실전서를 냈다.", "work");
      } else { s.hp = clamp(s.hp - 2, 0, s.hpMax); notes.push(`책 원고 작업 중(${8 - (X.bookT - s.t)}/8달, 스태미너 −2)`); }
    }
    // 공채 시즌(3·9월)에 한 달 매출 120만 이상이면 시즌을 넘긴 것으로 센다
    if (cs.open && [3, 9].includes(s.cal) && cs.monthRev >= 120 * pi && X.peakKey !== s.t) { X.peakKey = s.t; X.peakN++; }
    // 이야기 이벤트: 원래 엔진이 이번 달 컨설팅 장면을 띄웠으면 쉰다. 이야기끼리 최소 1달 간격
    if (X.quitWish && !X.quitAsked && company(s) && s.cal !== 12 && s.t >= X.quitWish && quitReady(s).ok && (s.fullAskT ?? -99) < s.t - 2 && !scenes.some((sc) => sc?.onChoose === "full_ev")) { // 결산에서 막 물어봤으면 석 달은 쉰다
      X.quitAsked = true; scenes.push(fullScene(s, true)); return;
    }
    if (scenes.some((sc) => sc && sc.tag === "컨설팅") || cs.ev2T === s.t || cs.evT === s.t || scenes.length >= 3) return;
    if (s.t - X.evT < 2) return;
    const ev = pickEvent(s, r); if (ev) scenes.push(ev);
  },

  eff(s, e, out) {
    const cs = s.cs;
    const money = (v, kind, label, show, rev) => { if (!v) return; const a = Math.abs(Math.round(v)); s.cash += kind === "inc" ? a : -a; addMoney(s, kind, label, a); if (rev) cs.monthRev += kind === "inc" ? a : -a; out.push(`${show} ${kind === "inc" ? "+" : "−"}${won(a)}`); };
    if (e.css_cash) money(e.css_cash, "inc", "컨설팅", "컨설팅 수입", true);
    if (e.css_cost) money(e.css_cost, "exp", "컨설팅 광고·수수료", "컨설팅 비용", true);
    if (e.css_refund) { money(e.css_refund, "exp", "환불", "환불", true); cs.refundAll = (cs.refundAll || 0) + 1; }
    if (e.css_tax) money(e.css_tax, "exp", "세무 비용", "세무 비용", false);
    if (e.css_rev) { cs.reviews = Math.max(0, cs.reviews + e.css_rev); out.push(`컨설팅 후기 ${e.css_rev > 0 ? "+" : ""}${r1(e.css_rev)}`); }
    if (e.css_refer) { cs.refer = clamp(cs.refer + e.css_refer, 0, REF_MAX); out.push(`소개 ${e.css_refer > 0 ? "+" : ""}${r1(e.css_refer)}`); }
    if (e.css_blog) { cs.ch.blog.idx = Math.max(0, cs.ch.blog.idx + e.css_blog); out.push(`블로그 검색 지수 +${e.css_blog}`); }
    if (e.css_kq) { cs.ch.kmong.q = clamp(cs.ch.kmong.q + e.css_kq, 0, 200); out.push(`크멍 상세페이지 품질 ${e.css_kq > 0 ? "+" : ""}${e.css_kq}`); }
    if (e.css_kakao) { cs.ch.kakao.m = Math.max(0, cs.ch.kakao.m + e.css_kakao); out.push(`오픈채팅 +${e.css_kakao}명`); }
    if (e.css_kakaoX) { cs.ch.kakao.m = Math.round(cs.ch.kakao.m * e.css_kakaoX); out.push(`오픈채팅 −${Math.round((1 - e.css_kakaoX) * 100)}%`); }
    if (e.css_vod) { cs.vod.prog = Math.min(99, cs.vod.prog + e.css_vod); out.push(`VOD·전자책 제작 +${e.css_vod}%`); }
    if (e.css_tpl) { cs.template = Math.min(3, cs.template + e.css_tpl); out.push(`첨삭 템플릿 ${cs.template.toFixed(1)}/3`); }
    // 발표 기다리는 고객의 합격 확률을 올린다(engine/cs.js outcomes.p, 상한 0.9)
    const boost = (d) => { let n = 0; for (const o of cs.outcomes || []) { o.p = Math.min(0.9, o.p + d); n++; } if (n) out.push(`발표 대기 고객 ${n}명 합격 확률 +${Math.round(d * 100)}%p`); };
    if (e.css_zr1) { // 한 항목 한 이야기·두괄식·소제목·숫자 → 첨삭 체크리스트(템플릿 1단계 = 합격률 +1.5%p, 한 달 처리 +1명)
      if (cs.template < 3) { cs.template = Math.min(3, Math.floor(cs.template) + 1); out.push(`첨삭 체크리스트 ${cs.template}/3 (합격률 +1.5%p · 한 달 처리 +1명)`); }
      else { cs.reviews += 2; out.push("체크리스트는 이미 완성. 고객 반응이 달라졌다(후기 +2)"); }
      boost(0.05);
    }
    if (e.css_zr2) { // 직소싱·회사가 직무보다·환승 이직 → 경력 고객 결과와 소개
      cs.refer = clamp(cs.refer + 1, 0, REF_MAX); cs.reviews += 2; out.push("소개 +1", "컨설팅 후기 +2");
      boost(0.08);
    }
  },

  choose: {
    css_ev(s, r, i, ok) {
      const cs = s.cs, X = s.sx.cs, id = s.pending?.css, out = [];
      if (id === "p07") {
        const prod = i === 0 ? "coach" : "edit", price = r1(D.CS_PRODUCTS[prod].price * (i === 0 ? 1.8 : 1) * D.CS_PRICE[cs.price].mult);
        cs.queue.push({ id: ++cs.seq, prod, niche: cs.niche, left: 1, units: 1, price, wait: 0, who: null, src: "중고신입" }); cs.newThisMonth++;
        out.push(`대기 고객 +1(${won(price)})`);
      }
      if (id === "p08" && i === 1) { if (r.chance(0.4)) { cs.offers = Math.min(2, cs.offers + 1); out.push("주말 강의 섭외가 따로 왔다(강의 섭외 +1)"); } else out.push("다시 연락은 오지 않았다"); }
      if (id === "p09") {
        if (i === 0 && ok && !cs.aiCheck) { cs.aiCheck = true; out.push("'AI 티 점검' 단계 생김(합격률 +2%p)"); }
        if (i === 1) { const ks = ["low", "mid", "high"], k = ks[Math.max(0, ks.indexOf(cs.price) - 1)]; if (k !== cs.price) { cs.price = k; out.push(`가격 ${jo(D.CS_PRICE[k].n, "으로", "로")}`); } }
      }
      if (id === "p10" && i === 0) { X.bookT = s.t + 8; out.push("책 계약: 8달 뒤 출간"); }
      // p11 '단가를 올려 1:1만': 가격 단계는 플레이어가 컨설팅 화면에서 고른다(자동으로 프리미엄을 켜면 판 전체 수입이 30% 뛰어 밸런스가 깨짐)
      if (id === "p11" && i === 1 && cs.price !== "high") out.push(cs.reviews >= (D.CS_PRICE.high.req || 30) ? "프리미엄 가격을 켤 수 있다(컨설팅 화면 → 가격)" : `프리미엄 가격은 후기 ${D.CS_PRICE.high.req || 30}개부터`);
      if (id === "p12" && i === 0) {
        // 포지션 추가는 플레이어가 컨설팅 화면에서 직접 고른다(자동으로 넣으면 문의·단가가 한꺼번에 뛰어 밸런스가 깨짐)
        if (cs.niches.includes("career")) out.push("경력 이직 고객 사례를 블로그에 따로 묶었다");
        else out.push(s.st.career >= D.NICHES.career.req.career && s.co.years >= D.NICHES.career.req.years ? "경력 이직 포지션을 열 수 있다(컨설팅 화면 → 포지션 추가, Lv3부터)" : `경력 이직 포지션은 커리어 ${D.NICHES.career.req.career}·회사 ${D.NICHES.career.req.years}년부터. 공부부터 시작했다`);
      }
      if (id === "p14") { if (i === 0) X.taxClean = true; else X.taxRisk = s.t; }
      if (id === "p15" && i === 0) { const n = Math.min(2, cs.queue.length); if (n) { cs.queue.splice(cs.queue.length - n, n); out.push(`대기 고객 ${n}명은 정중히 다른 곳을 안내했다`); } }
      if (id === "p16" && i === 1 && cs.nick === "real") { cs.nick = "nick"; out.push("활동명: 닉네임으로(실명 신뢰 −, 매달 회사 눈치 없음)"); }
      if (id === "p16" && i === 2) {
        const q = quitNeed(s), yearQ = (s.sceneQ || []).some((sc) => sc?.onChoose === "full_ev");
        if (q.ok && !yearQ) { X.quitAsked = true; s.sceneQ.unshift(fullScene(s, false)); out.push("환승 조건 충족: 본잡 전환을 정할 수 있다"); }
        else if (q.ok) out.push("환승 조건 충족: 이어지는 연말 결산에서 정할 수 있다");
        else {
          X.quitWish = s.t + 1; // 다음 달부터 다시 확인(0 이면 꺼짐)
          out.push(`지난 연말 결산 투잡 이익: 연봉의 ${q.x.toFixed(1)}배${q.yearOk ? " 충족" : " (1배부터. 12월 결산에서 다시 확인)"}`);
          out.push(`비상금 ${won(Math.max(0, q.have))} / 6개월치 ${won(q.need)}${q.emer ? " 충족" : ` (${won(q.need - Math.max(0, q.have))} 더)`}`);
          out.push("선퇴사 금지, 환승부터. 조건이 차면 다시 묻는다");
        }
      }
      if (id === "z1") { X.z1T = s.t; if (i === 0) X.zVisit++; X.z2Ok = r.chance(i === 0 ? 0.45 : 0.35); } // 두 번째 만남은 일부 판에서만(판당 1~2번)
      if (id === "z2") { X.z2T = s.t; if (i === 0) X.zVisit++; }
      if (id === "n02" && i === 0) X.hype = s.t;
      if (id === "n11") { X.taxRisk = 0; X.taxClean = true; }
      return out;
    },
  },

  milestones: [
    { key: "css_open", title: "첫 가격표", test: (s) => !!s.cs?.open, lines: ["지인 후기 세 개를 모았다. 판매 채널에 첫 상품을 올렸다.", "가격표 앞에서 한참 망설였다. 내 첨삭에 값을 매긴 첫날이었다."] },
    { key: "css_lv2", title: "모르는 사람의 결제", test: (s) => (s.cs?.lv || 0) >= 2, lines: ["후기 10개, 고객 20명. 모르는 사람이 돈을 내고 내 첨삭을 샀다.", "알림이 울릴 때마다 퇴근길 지하철에서 파일을 열었다."] },
    { key: "css_season", title: "첫 공채 시즌", test: (s) => (s.sx?.cs?.peakN || 0) >= 1, lines: ["공채 시즌 한 달 매출이 처음으로 120만을 넘었다.", "마감 금요일 밤, 마지막 파일을 보내고 그대로 잠들었다."] },
    { key: "css_lv3", title: "면접 코치", test: (s) => (s.cs?.lv || 0) >= 3, lines: ["합격 다섯 명, 블로그 글 서른 개. 이제 면접까지 봐 줬다.", "\"1분 자기소개 다시.\" 화면 너머 고객보다 내가 더 긴장했다."] },
    { key: "css_book", title: "내 이름이 박힌 책", test: (s) => !!s.sx?.cs?.book, lines: ["8개월 동안 퇴근 후 원고를 썼다. 서점 취업 코너에 내 책이 꽂혔다.", "첫 인세는 크지 않았다. 대신 강의 요청이 따라왔다."] },
    { key: "css_lv5", title: "이름 있는 브랜드", test: (s) => (s.cs?.lv || 0) >= 5, lines: ["합격자 100명. 내 이름이 하나의 브랜드가 됐다.", "공채 시즌이 오면 사람들이 먼저 내 채널을 찾았다."] },
  ],

  perks: [
    { id: "p_css_ai", n: "AI 티 감별사", line: "매끈한 문장 속 남의 말투가 보인다", pro: "상담 전환율 +3%p", m: { convBonus: 0.03 }, got: "AI 티 점검 + 합격 1,200명 + 환불 1건 이하", test: (s) => !!s.cs?.aiCheck && (s.cs?.passes || 0) >= 1200 && (s.cs?.refundAll || 0) <= 1 },
    { id: "p_css_season", n: "시즌 달력", line: "3월과 9월이 오기 전에 이미 준비가 끝나 있다", pro: "컨설팅 문의 +8%", m: { leadMult: 1.08 }, got: "공채 시즌 27번(월 매출 120만 넘긴 시즌)", test: (s) => (s.sx?.cs?.peakN || 0) >= 27 },
  ],
  perkCine: { p_css_ai: "css_lv3", p_css_season: "css_season" },
  synergy: [
    { id: "css_tutor", kind: "good", n: "화상과외 × 컨설팅", need: "화상과외 + 컨설팅", desc: "화상 코칭 장비와 진행 요령을 같이 쓴다: 매달 스태미너 +2", test: (s) => act(s, "tutoring") && act(s, "cs") },
    { id: "css_tarot", kind: "good", n: "타로 × 컨설팅", need: "타로 + 컨설팅", desc: "'이직운' 손님과 진로 고민 손님을 서로 넘겨준다: 매달 컨설팅 소개 +0.15", test: (s) => act(s, "tarot") && act(s, "cs") },
  ],
};
