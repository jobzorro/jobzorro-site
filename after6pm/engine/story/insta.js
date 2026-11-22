// 기존 투잡 'insta'(인별그램) 이야기 보강. 규약: engine/story/README.md
// "숫자는 팔로워인데 돈은 참여율에서 나온다." 조회수 37에서 시작해 협찬·공구·악플·알고리즘 개편까지.
// 돈·행동·성장 곡선은 engine/insta.js 그대로. 여기서는 장면·마일스톤·특전·시너지만 붙인다.
// ★ 팔로워 효과는 비율(%)로만, 늘어날 때는 포화 곡선 sat() 를 곱하고 한 번에 최대 3,000명까지(예전 팔로워 폭주 → 파이어 남발 방지).
//   줄 때도 큰 계정은 덜 빠지게(0.4+0.6×sat) 해서 판 전체 팔로워 분포가 보강 전과 같게 맞췄다.
import * as D from "../defs.js";
import { addMoney, won } from "../core.js";
import * as SYN from "../syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const act = (s, k) => !!s.sj?.active?.includes(k);
const company = (s) => !(s.co?.quit || s.co?.fired);
const SAT_K = 30000; // engine/insta.js 의 SAT_K 와 같은 값(그 파일의 포화 곡선을 그대로 따른다)
const sat = (f, kx = 1) => { const K = SAT_K * (kx || 1); return K / (K + Math.max(0, f)); };
const F_CAP = 3000; // 이야기 이벤트 하나로 늘 수 있는 팔로워 상한
const fmt = (n) => Math.round(n).toLocaleString();

// 협찬 한 건 값(참여율·명성 빼고): engine/insta.js dealPay 의 뼈대. 이벤트 돈은 이것의 0.3~1배 안팎
const unit = (s) => Math.round(Math.max(5, Math.sqrt(s.ins?.f || 0) * 0.2) * SYN.pi(s));
const P = (s, v) => Math.round(v * SYN.pi(s));

const DEF = () => ({ v: 1, seen: [], evT: -99, months: 0, streak: 0, bestStreak: 0, engM: 0, fake: 0, fakeT: -1, honest: false, sig: false, aiStory: false, multi: false, lawyer: false, hate: 0 });

// ───────── 이벤트(기획 데이터 14개 + 인별그램만의 것 9개) ─────────
// 11-23: 다른 투잡·엔진과 같은 틀이던 e12(콜라보)·e15(번아웃)·x02(점심시간 촬영)를 x08(사칭 계정)·x09(음원 저작권)·x10(사진 무단 사용)으로 바꿨다. 개수는 그대로 23개
// ph: early(팔로워 1천 미만) · mid(1천~1만) · late(1만 이상) · crisis(언제든 고비)
function evList(s) {
  const I = s.ins, X = s.sx.insta, u = unit(s), f = I.f || 0;
  const chal = clamp(Math.round(f / 150), 8, 40); // 챌린지 참가자 수
  const gongRev = Math.round(Math.sqrt(f) * 1.2 * clamp(I.eng / 0.06, 0.5, 2) * 0.8); // engine 공구 수익식의 80%(3주 써 보느라 늦게 연다)
  return [
    // ── 초반: 새 계정(팔로워 1천 미만) ──
    { id: "e01", ph: "early", ok: () => I.reels >= 1 && f < 1000, t: "조회수 37", x: "주말을 다 바쳐 만든 첫 릴스, 조회수 37. 그중 10은 내가 본 것 같다. 친구 셋이 하트를 눌러 줬다.",
      c: [{ t: "15개까지는 일단 올린다고 다짐한다", eff: { mental: -3, ins_fadd: 60, stat: { sense: 0.5 } }, text: "메모장에 '릴스 1/15'라고 적었다. 7번째부터 낯선 사람이 하트를 눌렀다." },
          { t: "주제를 바꿔 본다", eff: { mental: 3, ins_eng: -0.3 }, text: "마음은 가벼워졌다. 대신 내 계정이 뭘 하는 계정인지 나도 헷갈린다." }] },
    { id: "e02", ph: "early", ok: () => f < 1500 && I.posts >= 2, t: "뭘 올려야 하지", x: "퇴근길 지하철, 오늘의 콘텐츠가 떠오르지 않는다. 내 일상이 콘텐츠가 될까. 메모장에 '출근룩'이라고 적었다가 지운다.",
      c: [{ t: "'3가지 팁' 포맷을 정해 아이디어 20개를 미리 쓴다", eff: { hp: -3, stat: { write: 1 }, ins_eng: 0.6 }, text: "일요일 밤 2시간. 아이디어 뱅크 20개가 생겼다. 이번 달은 뭘 올릴지 고민하지 않는다." },
          { t: "그날그날 떠오르는 대로 올린다", eff: { mental: 2, ins_eng: -0.3 }, text: "카페, 노을, 점심 메뉴. 피드가 잡화점이 됐다." }] },
    { id: "e03", ph: "early", ok: () => f >= 150 && f < 1000 && !X.fake, t: "팔로워 1,000명 판매합니다", x: `DM이 왔다. 팔로워 1,000명에 2만 원. 3일 안에 채워 준다고 한다. 지금 팔로워는 ${fmt(f)}명이다.`, on: true,
      c: [{ t: "무시하고 차단한다", eff: { mental: 1 }, text: "차단 버튼을 누르고 오늘 올릴 사진을 골랐다. 느리지만 진짜 사람들이다." },
          { t: "2만 원을 보낸다", eff: { ins_cost: 2 }, text: "사흘 뒤 팔로워 숫자가 네 자리가 됐다. 그런데 좋아요는 그대로다. 프로필 사진 없는 계정들이 줄줄이 늘었다." }] },
    { id: "e04", ph: "early", ok: () => I.posts + I.reels >= 3 && f < 3000, t: "장비병", x: `링라이트, 짐벌, 핀 마이크. 장바구니 합계가 ${won(P(s, 64))}이다. 다들 이거 쓰면 퀄리티가 달라진다고 한다.`,
      c: [{ t: "조명과 삼각대만 사고 나머지는 나중에", eff: { ins_cost: P(s, 14), stat: { sense: 1 } }, text: "조명 하나로 얼굴빛이 달라졌다. 짐벌은 장바구니에 그대로 있다." },
          { t: "풀세트로 지른다", eff: { ins_cost: P(s, 64), mental: 4, stat: { sense: 1.2 } }, text: "택배 상자 다섯 개. 설레서 잠이 안 왔다. 카드값 문자는 다음 달에 온다." }] },
    // ── 중반: 나노(팔로워 1천~1만) ──
    { id: "e05", ph: "mid", ok: () => f >= 1000 && !I.dealsDone, t: "첫 협찬 DM", x: `팔로워 ${fmt(f)}명이 된 날, 작은 화장품 브랜드에서 DM이 왔다. 제품 제공에 원고료 ${won(P(s, 5))}. 내 피부엔 잘 안 맞던 제품이다.`, on: true,
      c: [{ t: "솔직한 후기 조건으로 수락한다", eff: { ins_cash: P(s, 5), ins_eng: 0.4 }, text: "\"건성엔 조금 뻑뻑해요.\" 그대로 썼다. 담당자가 \"오히려 좋네요\"라고 했다. 댓글에 '믿고 봄'이 달렸다." },
          { t: "정중히 거절한다", eff: { mental: 1 }, text: "\"제가 쓰는 제품이 아니라서요.\" 원고료 0원. 대신 내 피드는 내 것이다." },
          { t: "좋은 말만 써 준다", eff: { ins_cash: P(s, 5), ins_eng: -1 }, text: "'인생템' 세 글자를 쓰는 손이 어색했다. 써 본 팔로워가 댓글을 달았다. \"저는 뒤집어졌는데요?\"" }] },
    { id: "e06", ph: "mid", ok: () => f >= 1500 && f < 30000, t: "뜀틀 연출", x: "빵집 리뷰를 하다가 키만 한 빵을 세워 두고 뛰어넘는 장면을 찍었다. 지나가던 손님이 웃었다. 그 릴스가 하룻밤에 12만 뷰를 찍었다.", on: true,
      c: [{ t: "'연출형 리뷰'를 시그니처로 굳힌다", eff: { ins_fp: 8, ins_fadd: 200, hp: -4, stat: { sense: 1 } }, text: "다음 편 기획 회의(혼자)가 길어졌다. 이제 평범한 리뷰는 못 올린다." },
          { t: "운이라 생각하고 원래대로 간다", eff: { ins_fp: 3, ins_fadd: 80, item: "in_light" }, text: "반짝 늘었던 팔로워 절반이 남았다. 그래도 남은 게 어디냐." }] },
    { id: "e07", ph: "mid", ok: () => I.dealsDone >= 2, rep: true, t: "광고 표기 누락", x: "협찬 게시물에 '유료광고 포함'을 빼먹었다. 댓글에 '이거 광고죠?'가 달렸다. 과태료 기사도 떠오른다.", on: true,
      c: [{ t: "즉시 표기하고 사과 스토리를 올린다", eff: { ins_eng: -0.3, mental: -2 }, text: "\"제 실수였어요.\" 스토리에 하트가 오히려 많이 달렸다." },
          { t: "댓글을 지운다", eff: {}, text: "지운 댓글은 캡처가 되어 돌아온다." }] },
    { id: "e08", ph: "mid", ok: () => f >= 1000 && company(s), t: "부장님이 팔로우했다", x: "팔로워 알림에 낯익은 아이디가 떴다. 부장님이다. 어제 올린 릴스 배경에 회사 로비가 살짝 나왔다.",
      c: [{ t: "회사가 보이는 콘텐츠를 다 내린다", eff: { eye: -3, ins_fp: -2 }, text: "게시물 14개를 보관함으로 옮겼다. 피드에 구멍이 숭숭 났다." },
          { t: "겸직 규정을 확인하고 당당히 둔다", check: { stat: "career", dc: 45 }, ok: { text: "취업규칙엔 '업무에 지장 없는 SNS 활동'은 문제없다고 돼 있었다. 다음 날 부장님이 하트를 눌렀다.", eff: { eye: -1, mental: 3 } }, ng: { text: "규정은 애매했고 부장님은 애매하지 않았다. \"요즘 바쁜가 봐? 인별 보니까.\"", eff: { eye: 8 } } }] },
    { id: "e09", ph: "mid", ok: () => f >= 3000, t: "7일 루틴 챌린지", x: `'퇴근 후 7일 루틴' 챌린지를 열었더니 ${chal}명이 1만 원씩 냈다. 매일 밤 인증 사진 ${chal}장에 피드백을 달아야 한다.`,
      c: [{ t: "매일 밤 30분 정성 피드백을 단다", eff: { ins_cash: P(s, chal), hp: -8, ins_eng: 1, ins_fp: 2, shard: 1 }, text: "일주일 내내 자정에 잤다. 마지막 날 \"다음 기수 언제 해요?\" DM이 쌓였다." },
          { t: "단체 공지로 대신한다", eff: { ins_cash: P(s, chal), ins_eng: -0.4 }, text: "편했다. 후기엔 '생각보다 그냥 그랬어요'가 섞였다." }] },
    // ── 후반: 마이크로 이상(팔로워 1만~) ──
    { id: "e10", ph: "late", ok: () => f >= 3000 && (s.era?.algo > 0 || (f >= 20000 && X.months >= 48)) && !(I.algoHit && I.algoHit.until > s.t) /* 엔진 '노출 축소 공지'(cv_algo)를 겪는 중이면 쉰다 */, t: "반 토막 난 도달", x: "어느 날부터 릴스 도달이 반 토막 났다. 커뮤니티엔 '알고리즘 바뀜'이란 글이 쏟아진다. 협찬사는 지난달 수치를 기준으로 계약했다.",
      c: [{ t: "릴스 비중 70%, 첫 2초 훅, 저녁 7~9시 업로드로 바꾼다", eff: { hp: -6, ins_fp: 2, stat: { mkt: 1 } }, text: "퇴근하자마자 편집, 7시 반 업로드. 한 달 만에 도달이 70%까지 돌아왔다." },
          { t: "숏폼 영상 플랫폼에도 같이 올린다", eff: { ap: -1, ins_deal: 1, ins_fp: -1, stat: { mkt: 0.5 } }, text: "편집본 비율 바꾸는 데만 주 2시간이 더 든다. 대신 다른 플랫폼에서 협찬 문의가 따로 왔다." }] },
    { id: "e11", ph: "late", ok: () => f >= 10000 && s.t - (I.gongT ?? -99) >= 1, t: "공동구매 제안", x: `팔로워 ${fmt(f)}명, 주방용품 브랜드가 공동구매를 제안했다. 판매액의 15%를 준다. 재고와 CS는 브랜드가 맡는다.`, on: true,
      c: [{ t: "직접 3주 써 보고 진행한다", eff: { hp: -3, ins_cash: gongRev, ins_eng: 0.6 }, text: "3주 동안 매일 그 냄비로 밥을 했다. '써 보고 파는 사람'이라는 댓글이 달렸다." },
          { t: "바로 오픈한다", eff: { ins_cash: Math.round(gongRev * 1.15) }, text: "오픈 첫날 완판. 통장이 불었다. 리뷰가 달리기 시작하는 건 2주 뒤다." }] },
    // 11-23: e12 '동급 계정 콜라보'는 엔진의 '비슷한 계정의 콜라보 제안'(mutual)과 같은 일이라 뺐다 → x08 사칭 계정
    { id: "x08", ph: "late", ok: () => f >= 10000, t: "내 얼굴을 한 가짜 계정", x: "내 프로필 사진에, 아이디 끝에 밑줄 하나만 더 붙인 계정이 생겼다. 내 팔로워들에게 \"이벤트 당첨! 배송비 3,900원만 보내 주세요\" DM을 돌리고 있다. 벌써 여섯 명이 보냈다고 한다.",
      c: [{ t: "고정 게시물로 알리고 팔로워들에게 신고를 부탁한다", eff: { hp: -3, ins_eng: 0.4 }, text: "\"밑줄이 하나 더 있으면 가짜예요.\" 신고가 300건 쌓이자 사흘 만에 그 계정이 내려갔다." },
          { t: `돈 보낸 팔로워에게 내 돈으로 돌려준다 (−${won(P(s, 3))})`, eff: { ins_cost: P(s, 3), ins_eng: 0.8, mental: -2 }, text: "여섯 명에게 배송비보다 넉넉히 보냈다. 내 잘못은 아니다. 그래도 내 얼굴이었다." },
          { t: "플랫폼 신고만 넣고 기다린다", eff: { ins_fp: -2, ins_eng: -0.4 }, text: "\"검토 중입니다\"가 2주째다. 그사이 내 게시물에 '이 계정 사기 쳐요' 댓글이 달렸다." }] },
    // ── 고비 ──
    { id: "e13", ph: "crisis", ok: () => f >= 5000, rep: true, t: "악성 댓글", x: "'얼굴 보정 심하네', '광고충'. 출근길에 읽은 댓글 세 줄이 하루 종일 머리에서 떠나지 않는다. 회의 중에도 알림을 확인한다.", on: true,
      c: [{ t: "댓글 필터를 켜고 하루 쉰다", eff: { mental: 6, ins_fp: -1 }, text: "금칙어 30개를 등록했다. 알림을 끄고 한강을 걸었다." },
          { t: "하나하나 반박한다", check: { stat: "talk", dc: 55 }, ok: { text: "차분한 답글에 팔로워들이 편을 들어 줬다. 그래도 새벽 1시까지 휴대폰을 붙들었다.", eff: { mental: -6, ins_eng: 0.4 } }, ng: { text: "답글에 답글이 붙었다. 캡처가 커뮤니티에 올라갔다.", eff: { mental: -15, ins_eng: -0.6 } } }] },
    { id: "e14", ph: "crisis", ok: () => f >= 3000 && I.deals >= 1, rep: true, t: "계정 비노출", x: "갑자기 해시태그 검색에 내 게시물이 안 뜬다. 이유는 알려 주지 않는다. 다음 주 협찬 게시물 두 건이 잡혀 있다.",
      c: [{ t: "광고주에게 상황을 알리고 일정을 미룬다", eff: { ins_cost: Math.round(u * 0.3), ins_eng: 0.2 }, text: "\"솔직하게 말씀해 주셔서 감사해요.\" 일정 조정 비용 일부는 내가 떠안았다." },
          { t: "모른 척 올린다", eff: { ins_deal: -1, mental: -3 }, text: "도달 수치가 리포트에 그대로 찍혔다. 다음 달 재계약 메일은 오지 않았다." }] },
    // 11-23: e15 '번아웃 주간'은 컨설팅 이야기(p15)·엔진 '나는 누구인가'(cv_tired)와 같은 틀이라 뺐다 → x09 음원 저작권
    { id: "x09", ph: "crisis", ok: () => f >= 1000 && I.reels >= 6, rep: true, t: "소리가 꺼진 릴스", x: "아침에 알림이 왔다. \"저작권 문제로 릴스 4개의 소리가 꺼졌습니다.\" 유행 음원에 맞춰 찍은 것들이다. 소리 없는 영상 넷이 피드 맨 위에 걸려 있다.",
      c: [{ t: "넷 다 내리고 무료 음원으로 다시 편집해 올린다", eff: { hp: -6, ins_eng: 0.3 }, text: "주말 이틀이 편집으로 갔다. 조회수는 처음의 절반이다. 대신 다시는 안 꺼진다." },
          { t: `상업용 음원 1년 구독을 결제한다 (−${won(P(s, 12))})`, eff: { ins_cost: P(s, 12), stat: { sense: 0.5 } }, text: "협찬 영상에 써도 되는 음원이 따로 있다는 걸 오늘 알았다." },
          { t: "그대로 둔다", eff: { ins_eng: -0.6, ins_fp: -1 }, text: "소리 없는 릴스 넷. 새로 온 사람들이 그것부터 본다." }] },
    { id: "e16", ph: "crisis", ok: () => f >= 5000 && X.months >= 24 && !X.aiStory, t: "AI가 만든 정보 계정", x: "내가 2시간 걸려 만드는 정보 카드를 AI 계정이 하루 열 장씩 찍어 낸다. 내 저장 수가 한 달 새 40% 줄었다.", on: true,
      c: [{ t: "내 경험담과 얼굴을 넣는 스토리형으로 바꾼다", eff: { stat: { write: 1 }, ins_eng: 1, ins_fp: -1 }, text: "'회사 다니며 해 본 사람'의 이야기. 조회는 줄었는데 저장과 DM이 늘었다." },
          { t: "나도 AI로 양산한다", eff: { hp: 4, ins_eng: -1, ins_fp: 2 }, text: "하루 다섯 장씩 올렸다. 손은 편한데 댓글이 '좋은 정보 감사합니다' 복붙만 남았다." }] },
    // ── 인별그램만의 이야기 ──
    { id: "x01", ph: "crisis", ok: () => X.fake > 0 && f >= 1000 && s.t - X.fakeT >= 3, t: "가짜 팔로워가 들통났다", x: "협찬 담당자가 메일을 보냈다. \"분석 도구로 보니 팔로워 상당수가 비활성 계정이네요. 이번 캠페인은 어렵겠습니다.\"", on: true,
      c: [{ t: "솔직히 인정하고 가짜 계정을 직접 정리한다", eff: { mental: -4 }, text: "차단, 차단, 차단. 사흘 동안 손가락으로 1,000명을 지웠다. 숫자는 줄었지만 이제 다 진짜다." },
          { t: "모른 척 다른 브랜드를 찾는다", eff: { ins_deal: -3, ins_eng: -1 }, text: "업계는 좁았다. 다른 담당자도 같은 도구를 쓴다." }] },
    // 11-23: x02 '점심시간 촬영'(팀장과 마주침)은 컨설팅 '점심시간의 상담 전화'(n10)와 같은 틀이라 뺐다 → x10 사진 무단 사용
    { id: "x10", ph: "mid", ok: () => f >= 3000 && I.dealsDone >= 2, t: "허락 없이 쓰인 내 사진", x: "지하철 광고판에서 내 사진을 봤다. 석 달 전에 올린 것이다. 그 브랜드와는 계약한 적이 없다. 구석에 작게 '출처: 인별'이라고만 적혀 있다.",
      c: [{ t: "사용료를 청구하는 메일을 보낸다", check: { stat: "talk", dc: 50 }, ok: { text: "\"담당자 실수였습니다.\" 사용료가 들어왔고 광고판 구석에 내 아이디가 붙었다.", eff: { ins_cash: Math.round(u * 0.8), ins_fp: 2 } }, ng: { text: "\"공개 게시물이라 문제없다고 봅니다.\" 답장은 그게 끝이었다.", eff: { mental: -4 } } },
          { t: "돈은 됐고 아이디 표기만 요구한다", eff: { ins_fp: 3, ins_fadd: 100 }, text: "다음 주부터 광고판에 내 아이디가 붙었다. 출근길에 그 앞에서 사진을 찍는 사람을 봤다." },
          { t: "내려 달라고만 한다", eff: { mental: 2 }, text: "이틀 뒤 광고가 바뀌었다. 내 사진은 이제 내 피드에만 있다." }] },
    { id: "x03", ph: "late", ok: () => f >= 10000 && I.dealsDone >= 5, t: "인플루언서 박람회 초대", x: "인플루언서 박람회 초대장이 왔다. 브랜드 부스 120개, 토요일 하루. 명함 100장을 찍어야 할까.",
      c: [{ t: "명함을 들고 하루 종일 부스를 돈다", eff: { hp: -6, ins_deal: 1, stat: { talk: 1 }, ins_cost: P(s, 3) }, text: "명함 62장을 돌리고 31장을 받았다. 다음 주에 장기 협업 미팅이 잡혔다." },
          { t: "주말은 쉰다", eff: { mental: 3 }, text: "박람회 후기 릴스들이 피드에 쏟아졌다. 조금 배가 아팠다." }] },
    { id: "x04", ph: "crisis", ok: () => (I.gongN || 0) >= 1, rep: true, t: "공구 불량 문의", x: "공구로 판 텀블러에서 물이 샌다는 DM이 하루 40개. 브랜드 담당자는 주말이라 연락이 안 된다. 댓글창이 먼저 끓는다.",
      c: [{ t: "고정 공지로 교환·환불 절차를 직접 안내한다", eff: { hp: -6, ins_eng: 0.4 }, text: "주말 내내 DM에 답했다. \"끝까지 책임지네\"라는 후기가 남았다." },
          { t: "\"브랜드에 문의하세요\"만 남긴다", eff: { ins_eng: -0.8, ins_fp: -1 }, text: "틀린 말은 아니다. 다만 사람들은 내 얼굴을 보고 샀다." }] },
    { id: "x05", ph: "mid", ok: () => f >= 5000 && I.dealsDone >= 5, t: "미디어킷과 단가표", x: `브랜드가 묻는다. "단가표 있으세요?" 지금까지는 주는 대로 받았다. 협찬 한 건에 ${won(u)} 안팎.`,
      c: [{ t: "미디어킷을 만들어 단가를 제시한다", check: { stat: "talk", dc: 45 }, ok: { text: "저장률·연령대·후기 캡처를 한 장에 담았다. 담당자가 \"자료가 깔끔하네요\" 하며 그대로 받았다.", eff: { ins_cash: Math.round(u * 0.5), stat: { mkt: 0.5 } } }, ng: { text: "\"저희 예산으론 어렵겠네요.\" 한 건이 그대로 사라졌다.", eff: { ins_deal: -1 } } },
          { t: "이번에도 주는 대로 받는다", eff: { ins_deal: 1, item: "in_gimbal" }, text: "담당자가 좋아했다. 다음 달에도 연락이 왔다. 단가는 그대로다." }] },
    { id: "x06", ph: "late", ok: () => f >= 10000 && I.dealsDone >= 10 && !X.lawyer, t: "계약서의 한 줄", x: "장기 협업 계약서 7조. '콘텐츠 2차 활용 기간 무기한', '계약 종료 후 6개월간 동종 업계 협찬 금지'. 원고료는 평소의 1.5배다.", on: true,
      c: [{ t: `법률 자문을 받는다(${won(P(s, 50))})`, eff: { ins_cost: P(s, 50), mental: 2 }, text: "자문 한 번에 독소 조항 두 줄이 빠졌다. 비싼 공부였다." },
          { t: "그냥 서명한다", eff: { ins_cash: Math.round(u * 1.5) }, text: "원고료가 들어왔다. 7조는 다시 읽지 않았다." },
          { t: "조항 수정을 직접 요청한다", check: { stat: "talk", dc: 50 }, ok: { text: "\"6개월은 3개월로, 2차 활용은 1년으로 하시죠.\" 담당자가 받아들였다.", eff: { ins_cash: Math.round(u * 1.2) } }, ng: { text: "\"그럼 이번엔 다른 분과 하겠습니다.\" 협업이 없던 일이 됐다.", eff: { mental: -3 } } }] },
    { id: "x07", ph: "mid", ok: () => f >= 3000 && I.face && (!!s.fam?.spouse || (s.fam?.kids?.length || 0) > 0), t: "가족 사진 올려도 돼?", x: "가족이 나온 사진에 하트가 평소의 세 배다. 협찬 담당자도 '가족 콘텐츠'를 콕 집어 말한다. 식탁에서 가족이 물었다. \"이것도 올릴 거야?\"",
      c: [{ t: "가족 얼굴은 올리지 않기로 한다", eff: { family: 5 }, text: "\"우리 집은 우리 집이야.\" 이후로 피드엔 손과 뒷모습만 나온다." },
          { t: "가족 일상을 콘텐츠로 키운다", eff: { ins_fp: 4, ins_eng: 0.6, family: -6 }, text: "팔로워는 늘었다. 저녁 식탁에서 휴대폰을 드는 순간 다들 표정이 굳는다." }] },
  ];
}

function pickEvent(s, r, scenes) {
  const X = s.sx.insta, L = evList(s).filter((e) => { try { return e.ok(); } catch (x) { return false; } });
  if (s.t - X.evT < 2) return null; // 이야기 이벤트끼리 최소 1달 쉬고
  if (scenes.some((sc) => sc && sc.kind === "event")) return null; // 다른 선택 장면이 뜬 달은 쉰다
  const fresh = L.filter((e) => !X.seen.includes(e.id));
  // 꼭 그때 나와야 하는 것: 첫 릴스, 첫 협찬, 알고리즘 개편(세계 사건 기간), 가짜 팔로워 들통
  const must = fresh.find((e) => ["e01", "e05", "x01"].includes(e.id) || (e.id === "e10" && s.era?.algo > 0));
  let e = must || null;
  if (!e && fresh.length && r.chance(0.3)) {
    const ord = { early: 0, mid: 1, crisis: 1, late: 2 }, lo = Math.min(...fresh.map((x) => ord[x.ph]));
    e = r.pick(fresh.filter((x) => ord[x.ph] <= lo + 1)); // 앞 단계 이야기부터, 한 단계 뒤 것까지 섞어서
  }
  if (!e && !fresh.length && r.chance(0.05)) { const rp = L.filter((x) => x.rep); if (rp.length) e = r.pick(rp); }
  if (!e) return null;
  if (!X.seen.includes(e.id)) X.seen.push(e.id);
  X.evT = s.t; s._insEv = { id: e.id };
  return { kind: "event", tag: "인별그램", title: e.t, text: e.x, ...(e.on ? { onChoose: "ins_ev" } : {}), choices: e.c };
}

export default {
  key: "insta", prefix: "ins_",
  init: () => DEF(),
  month(s, r, notes, scenes) {
    const I = s.ins, X = s.sx.insta; if (!I || !I.niche) return;
    X.months++;
    // 연속 업로드(engine month 뒤라 이번 달 게시 여부를 그대로 본다)
    if (I.postT === s.t) { X.streak++; X.bestStreak = Math.max(X.bestStreak, X.streak); } else X.streak = 0;
    if (I.eng >= 0.12) X.engM++;
    // 시너지(이 파일이 효과까지 맡는 것만)
    if (SYN.on(s, "ins_vibe")) I.eng = clamp(I.eng + 0.0005, 0.02, 0.16);
    if (SYN.on(s, "ins_night")) { s.mental = clamp(s.mental - 1, 0, 100); }
    const ev = pickEvent(s, r, scenes); if (ev) scenes.push(ev);
  },
  eff(s, e, out) {
    const I = s.ins, X = s.sx.insta; if (!I) return;
    if (e.ins_cash) { const v = e.ins_cash; s.cash += v; addMoney(s, "inc", "인별 수익", v); I.monthRev = (I.monthRev || 0) + v; out.push(`인별 수익 +${won(v)}`); }
    if (e.ins_cost) { const v = e.ins_cost; s.cash -= v; addMoney(s, "exp", "인별 비용", v); out.push(`인별 비용 −${won(v)}`); }
    // 팔로워: 비율(%)로만. 늘 때는 포화 곡선을 곱하고 상한 3,000명. 줄 때는 비율 그대로
    let df = 0;
    if (e.ins_fp > 0) df += Math.min(F_CAP, I.f * e.ins_fp / 100 * sat(I.f, I.kx));
    if (e.ins_fp < 0) df += I.f * e.ins_fp / 100 * (0.4 + 0.6 * sat(I.f, I.kx)); // 큰 계정은 비율로는 덜 빠진다(늘 때와 대칭)
    if (e.ins_fadd) df += e.ins_fadd * (e.ins_fadd > 0 ? sat(I.f, I.kx) : 1);
    df = Math.round(df);
    if (df) { const before = I.f; I.f = Math.max(0, I.f + df); I.peak = Math.max(I.peak || 0, I.f); out.push(`팔로워 ${I.f >= before ? "+" : "−"}${fmt(Math.abs(I.f - before))} → ${fmt(I.f)}`); }
    if (e.ins_eng) { I.eng = clamp(I.eng + e.ins_eng / 100, 0.02, 0.16); out.push(`참여율 ${e.ins_eng > 0 ? "+" : "−"}${Math.abs(e.ins_eng)}%p`); }
    if (e.ins_deal) { const b = I.deals || 0; I.deals = clamp(b + e.ins_deal, 0, 3); if (I.deals !== b) out.push(`협찬 대기 ${I.deals > b ? "+" : "−"}${Math.abs(I.deals - b)}건`); }
    if (e.ins_up) { I.postT = s.t; out.push("이번 달 업로드 1회로 침"); }
    void X;
  },
  choose: {
    ins_ev(s, r, i, ok) {
      const I = s.ins, X = s.sx.insta, ev = s._insEv?.id; s._insEv = null;
      const pi = SYN.pi(s), out = [];
      const fLoss = (p) => { const d = Math.round(I.f * p); I.f = Math.max(0, I.f - d); return d; };
      if (ev === "e03" && i === 1) { // 가짜 팔로워: 숫자는 +1,000(포화 없음), 참여율 급락, 나중에 들통
        I.f += 1000; X.fake = 1000; X.fakeT = s.t; I.peak = Math.max(I.peak || 0, I.f); I.eng = clamp(I.eng * 0.45, 0.02, 0.16);
        out.push(`팔로워 +1,000 → ${fmt(I.f)}`, `참여율 급락 → ${(I.eng * 100).toFixed(1)}%`);
      }
      if (ev === "e05") { if (i === 0) X.honest = true; }
      if (ev === "e06" && i === 0) X.sig = true;
      if (ev === "e07" && i === 1) { // 댓글 삭제: 30% 확률로 적발(과태료)
        if (r.chance(0.3)) { const c = Math.round(30 * pi); s.cash -= c; addMoney(s, "exp", "인별 비용", c); I.eng = clamp(I.eng - 0.012, 0.02, 0.16); out.push(`광고 표기 위반 적발: 과태료 −${won(c)}`, "참여율 −1.2%p"); }
        else { I.eng = clamp(I.eng - 0.006, 0.02, 0.16); out.push("참여율 −0.6%p('광고 숨기는 계정')"); }
      }
      if (ev === "e11") { // 공구 1회로 센다(engine 공구 쿨다운은 건드리지 않음)
        I.gongN = (I.gongN || 0) + 1;
        if (i === 1 && r.chance(0.25)) { const d = fLoss(0.02); I.eng = clamp(I.eng - 0.02, 0.02, 0.16); out.push("2주 뒤 품질 불만 후기가 쏟아졌다", `팔로워 −${fmt(d)}`, "참여율 −2%p"); }
      }
      if (ev === "e13") X.hate++;
      if (ev === "e16" && i === 0) X.aiStory = true;
      if (ev === "x01") {
        if (i === 0) { const d = Math.min(I.f, X.fake); I.f -= d; I.eng = clamp(I.eng + 0.01, 0.02, 0.16); out.push(`가짜 팔로워 정리 −${fmt(d)} → ${fmt(I.f)}`, "참여율 +1%p"); X.fake = 0; }
        else { X.fakeT = s.t + 9; } // 1년쯤 뒤 또 걸린다
      }
      if (ev === "x06") {
        if (i === 0) X.lawyer = true;
        if (i === 1 && r.chance(0.35)) { const c = Math.round(unit(s) * 1.5); s.cash -= c; addMoney(s, "exp", "인별 비용", c); I.deals = Math.max(0, (I.deals || 0) - 1); out.push(`넉 달 뒤 동종 업계 협찬을 했다가 위약금 −${won(c)}`, "협찬 대기 −1건"); }
      }
      return out;
    },
  },
  migrate(s, X) { const d = DEF(); for (const k of Object.keys(d)) if (X[k] === undefined) X[k] = d[k]; },
  // 마일스톤 화보(기존: in_deal 첫 협찬 · in_10k 팔로워 1만(특전 '알고리즘의 총애') · 엔딩 3개는 defs.js 그대로)
  milestones: [
    { key: "ins_1k", title: "네 자리 숫자", test: (s) => (s.ins?.f || 0) >= 1000 && !(s.sx?.insta?.fake > 0 && s.ins.f < 2000), lines: ["팔로워 숫자가 네 자리가 됐다. 1,000명 중에 아는 사람은 열한 명이었다.", "조회수 37이던 계정이었다. 이제 모르는 사람이 내 저녁을 저장했다."] },
    { key: "ins_streak", title: "열두 달 연속 업로드", test: (s) => (s.sx?.insta?.bestStreak || 0) >= 12, lines: ["한 달도 빠짐없이 1년을 올렸다. 야근한 달에도, 아팠던 달에도.", "알고리즘보다 무서운 건 쉬고 싶은 내 마음이었다. 1년을 이겼다."] },
    { key: "ins_5k", title: "동네에서 알아보는 계정", test: (s) => (s.ins?.f || 0) >= 5000, lines: ["단골 빵집 사장님이 말했다. \"혹시… 그 계정 하시는 분?\"", "팔로워 5,000명. 동네 카페에서 커피 한 잔이 서비스로 나왔다."] },
    { key: "ins_gong1", title: "첫 공동구매", test: (s) => (s.ins?.gongN || 0) >= 1, lines: ["공구 오픈 10분, 주문 알림이 멈추지 않았다.", "그날 밤 배송 문의 DM에 답하다 잠들었다. 휴대폰을 쥔 채로."] },
    { key: "ins_50k", title: "팔로워 5만의 문", test: (s) => (s.ins?.f || 0) >= 50000, lines: ["팔로워 5만. 협찬 메일 제목에 '장기 협업'이 붙기 시작했다.", "인플루언서 중 상위 10%. 그래도 다음 날 아침엔 출근했다."] },
    { key: "ins_100k", title: "10만의 무게", test: (s) => (s.ins?.f || 0) >= 100000, lines: ["팔로워 10만. 악플도 10만 분의 1씩 늘었다.", "엘리베이터에서 누가 휴대폰 화면 속 내 얼굴을 보고 있었다. 모른 척했다."] },
  ],
  perks: [
    { id: "p_ins_save", n: "저장되는 계정", line: "팔로워보다 저장 수를 센다", pro: "소통(댓글 답글) 참여율 효과 +20%", m: { instaSave: 1.2 }, got: "참여율 12% 이상 30달(솔직 후기를 골랐다면 18달)", test: (s) => (s.sx?.insta?.engM || 0) >= (s.sx?.insta?.honest ? 18 : 30) },
  ],
  perkCine: { p_ins_save: "ins_5k" },
  synergy: [
    { id: "ins_vibe", kind: "good", n: "인별그램 × 바이브코딩", need: "인별그램 + 바이브코딩", desc: "캡션·해시태그·예약 업로드 도구를 직접 만들었다: 참여율이 조금씩 오른다(약 +10%)", test: (s) => act(s, "insta") && act(s, "vibe") },
    { id: "ins_night", kind: "bad", n: "새벽 DM 알림 × 회사", need: "인별 팔로워 1만 + 회사 다니는 중", desc: "협찬 DM·악플 알림이 밤낮없이 온다: 매달 멘탈 −1", test: (s) => act(s, "insta") && (s.ins?.f || 0) >= 10000 && company(s) },
  ],
};
