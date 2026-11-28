// 손님 이벤트(v4.25): 파티룸·에어씨앤씨·타로 등 투잡 손님과의 드문 이벤트.
// core.js peopleMonth 에서 매달 guestMonth(s, r, scenes) 를 부른다. onChoose 는 "gs_" 로 시작.
// 규칙: 월 4%, 손님 이벤트끼리 최소 6달 간격, 같은 이벤트는 한 판에 한 번(s.flags["gs_<id>"]), 이번 달 다른 event 장면이 있으면 쉰다.
// 효과: eff 는 기존 키만(cash·mental·hp·stat·aff·tr_*·tu_*·wn_*·vb_*·ps_*). 투잡별 별점·팔로워는 선택지 x 로 적고 gs_ev 에서 조금만 바꾼다.
//   x.star: 이 장면의 대상(파티룸 방·숙소·치킨 매장·무인카페 매장) 별점 ±, x.fol: 인별그램 팔로워 ±%
import { CHAR, jo, ensureRel } from "./core.js";
import * as SYN from "./syn.js";
import { undWarn as abUndWarn } from "./abnb.js"; // 11-28 업의 이해도(에어씨앤씨 숙련부터): 진상 손님 장면에 미리 손써 둔 선택지

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const GAP = 6, P = 0.04;
const M = (s, x) => { const v = x * SYN.pi(s); return Math.abs(v) < 50 ? Math.max(1, Math.round(Math.abs(v))) * Math.sign(v) : Math.round(v / 10) * 10; }; // 만원, 물가 반영
const I = (w) => jo(w, "이", "가");

// 선택지 만들기(famev.js 와 같은 모양)
const C = (t, eff, text, x) => ({ t, eff, text, ...(x ? { x } : {}) });
const K = (t, stat, dc, ok, ng) => ({ t, check: { stat, dc }, ok, ng });
const O = (text, eff, x) => ({ text, eff, ...(x ? { x } : {}) });
const A = (w, n) => (w ? { aff: n } : {}); // 손님 인물이 있을 때만 호감

// 투잡별 대상 고르기·별점 범위
const JOB = {
  pr: { list: (s) => (s.pr?.rooms || []).filter((x) => x.status === "open"), lo: 2.5, hi: 4.98 },
  airbnb: { list: (s) => s.ab?.units || [], lo: 3.4, hi: 4.99 },
  chicken: { list: (s) => (s.chicken?.stores || []).filter((x) => (x.months || 0) >= 1), lo: 3.4, hi: 5 },
  ucafe: { list: (s) => s.uc?.stores || [], lo: 3.2, hi: 4.95 },
  tarot: { ready: (s) => !!s.tarot && ((s.tarot.lv || 0) >= 3 || (s.tarot.served || 0) >= 3) },
  tutoring: { ready: (s) => (s.tutoring?.studs?.length || 0) > 0 },
  petsit: { ready: (s) => (s.petsit?.homes?.length || 0) > 0 },
  insta: { ready: (s) => (s.ins?.f || 0) >= 300 },
  webnovel: { ready: (s) => !!s.webnovel?.work && (s.webnovel.work.ep || 0) >= 5 },
  vibe: { ready: (s) => !!s.vibe && (((s.vibe.app?.live && s.vibe.app.users > 0)) || (s.vibe.delivered || 0) >= 1) },
};
const appOn = (s) => !!(s.vibe?.app?.live && s.vibe.app.users > 0);
const clientOn = (s) => (s.vibe?.delivered || 0) >= 1;

// ── 이벤트 목록 ──
// j: 투잡, g: 좋은 일(true)/나쁜 일(false), ok(s): 추가 조건, who: 파티룸 손님 인물을 쓸 수 있음, mk(s, T, w): 장면(T 대상, w 인물 id 또는 null)
const EVS = [
  // ───── 파티룸 ─────
  { id: "pr_propose", j: "pr", g: true, who: true, mk: (s, T, w) => ({ title: "프러포즈 작전", text: `${w ? `${I(CHAR[w].name)} 예약 메모를 남겼다` : "예약 메모가 길다"}. "${T.name}에서 프러포즈해요. 7시 반에 조명 끄고 풍선 내려 주실 수 있나요? 들키면 끝이에요." 사장님은 오늘 무대 감독이다.`, choices: [
    K("퇴근하자마자 달려가 직접 세팅한다", "sense", 40, O("불이 꺼지고 풍선이 내려왔다. \"응!\" 소리에 나도 박수를 쳤다. 다음 날 리뷰 사진의 배경이 우리 방이었다.", { hp: -6, mental: 6, cash: M(s, 20), ...A(w, 8), item: "m_review" }, { star: 0.08 }), O("타이밍이 3초 빨랐다. 반지보다 풍선이 먼저 나왔다. 다행히 대답은 '응'이었다.", { hp: -6, mental: 2, ...A(w, 4) }, { star: 0.02 })),
    C("장소만 빌려 주고 응원만 보낸다", { cash: M(s, 8), ...A(w, 2) }, "다음 날 문 앞에 떡 한 상자. '덕분에 결혼해요.'"),
  ] }) },
  { id: "pr_break", j: "pr", g: false, mk: (s, T) => ({ title: "파티가 남긴 것", text: `생일파티가 끝난 ${T.name}. 빔프로젝터 렌즈에 금이 갔고, 흰 소파에는 와인으로 세계지도가 그려졌다. 예약자는 "원래 그랬던 거 아니에요?"`, choices: [
    K("사진과 체크리스트를 보여 주며 청구한다", "talk", 40, O("입장 사진 앞에서 말이 없어졌다. 수리비가 입금됐다.", { mental: 2, cash: -M(s, 10) }), O("\"쪼잔한 사장\" 리뷰와 별 하나. 수리비는 내 몫이 됐다.", { mental: -5, cash: -M(s, 60) }, { star: -0.06 })),
    C("말 섞기 싫다. 내 돈으로 고친다", { cash: -M(s, 70), mental: -3 }, "돈으로 평화를 샀다. 비싼 평화다."),
    K("주말에 직접 고친다", "hands", 45, O("렌즈는 중고로, 얼룩은 베이킹소다로. 장인의 손길.", { cash: -M(s, 20), hp: -8, stat: { hands: 1 } }), O("얼룩이 더 넓어졌다. 결국 소파 커버를 새로 샀다.", { cash: -M(s, 55), hp: -8 })),
  ] }) },
  { id: "pr_noise", j: "pr", g: false, mk: (s, T) => ({ title: "새벽 2시의 인터폰", text: `관리실 전화. "${T.name} 아랫집에서 또 민원 들어왔어요. 노래방 기계 소리가 천장을 뚫는대요." 세 번째다.`, choices: [
    K("과일 바구니 들고 아랫집에 사과하러 간다", "charm", 40, O("\"젊은 사람이 고생하네.\" 오히려 귤을 받아 왔다.", { cash: -M(s, 8), mental: 2 }), O("문은 열렸지만 표정은 안 열렸다. 리뷰에도 '소음 주의'가 붙었다.", { cash: -M(s, 8), mental: -4 }, { star: -0.03 })),
    C("방음 패드를 시공한다", { cash: -M(s, 120) }, "조용해졌다. 통장도 조용해졌다.", { star: 0.03 }),
    C("밤 12시 이후 예약을 막는다", { cash: -M(s, 30), mental: 2 }, "매출은 줄었지만 새벽 전화도 줄었다."),
  ] }) },
  { id: "pr_club", j: "pr", g: true, who: true, mk: (s, T, w) => ({ title: "목요일의 단골", text: `${w ? `${CHAR[w].name}님이` : "보드게임 동호회 총무가"} 제안했다. "${T.name}, 매주 목요일 저녁 정기 대관할게요. 대신 20%만 빼 주시면 안 될까요?" 목요일은 원래 파리 날리는 날이다.`, choices: [
    C("좋다. 정기 계약", { cash: M(s, 80), mental: 3, ...A(w, 6) }, "목요일마다 주사위 소리. 빈 달력에 고정석이 생겼다.", { star: 0.05 }),
    K("정가는 지키고 음료를 서비스로 준다", "talk", 45, O("\"음료 주시면 콜!\" 할인 없이 계약 성공.", { cash: M(s, 110), ...A(w, 3) }, { star: 0.02 }), O("\"생각해 볼게요.\" 다음 주부터 길 건너 스터디카페에서 주사위 소리가 났다.", { mental: -2, ...A(w, -3) })),
  ] }) },
  { id: "pr_shoot", j: "pr", g: true, mk: (s, T) => ({ title: "촬영팀이 왔다", text: `"${T.name} 하루 통대관 가능할까요? 화보 촬영이에요." 조명 여섯 개, 사다리 둘, 사람 열두 명. 대관료는 평소 주말 세 배.`, choices: [
    K("바닥 보호 조건을 걸고 받는다", "talk", 35, O("보양재까지 깔고 갔다. 화보 속 소파를 보고 예약이 붙었다.", { cash: M(s, 160), hp: -3 }, { star: 0.04 }), O("벽에 테이프 자국 열네 개. 그래도 돈은 돈이다.", { cash: M(s, 150), hp: -3 }, { star: -0.02 })),
    C("조건 없이 받는다", { cash: M(s, 150) }, "사다리가 천장 조명 하나를 데려갔다. 대신 화보 크레딧에 우리 방 이름이 실렸다."),
    C("정중히 거절한다", { mental: 1 }, "그 주말엔 동네 초등학생 생일파티 세 건. 평화로웠다."),
  ] }) },

  // ───── 에어씨앤씨 ─────
  { id: "ab_letter", j: "airbnb", g: true, mk: (s, T) => ({ title: "식탁 위의 손편지", text: `체크아웃한 ${T.name}. 식탁에 손편지와 처음 보는 나라 과자가 놓여 있다. "Best host in Korea. 김치 냉장고 사용법 감사했어요." 맞춤법이 틀린 한국어가 더 반갑다.`, choices: [
    C("사진 찍어 숙소 소개에 올린다", { mental: 4 }, "다음 예약 문의 첫 줄: \"I saw the letter!\"", { star: 0.05 }),
    K("그 나라 말로 답장 엽서를 보낸다", "lang", 40, O("번역기 반, 진심 반. 답장의 답장이 왔다. 내년에 친구들이랑 다시 온단다.", { cash: -M(s, 3), mental: 6, stat: { lang: 1 } }, { star: 0.03 }), O("인사말을 '안녕히 주무세요'로 썼다. 그래도 고맙다는 이모티콘이 왔다.", { cash: -M(s, 3), mental: 3 })),
  ] }) },
  { id: "ab_lost", j: "airbnb", g: false, mk: (s, T) => ({ title: "새벽 5시의 분실물", text: `손님 메시지. "노트북을 ${T.name} 침대 밑에 두고 왔어요! 비행기 3시간 뒤예요!!" 느낌표가 많을수록 상황이 급하다.`, choices: [
    C("택시 타고 공항으로 달린다", { hp: -8, cash: -M(s, 6), eye: 2 }, "출국장 앞에서 노트북을 건넸다. 손님이 울면서 안았다. 오전 회의엔 좀비로 들어갔다.", { star: 0.06 }),
    C("국제 택배로 보내 준다(착불)", { mental: -1, hp: -2 }, "세관 서류만 세 장. 도착 사진과 함께 별 다섯 개가 왔다.", { star: 0.02 }),
    C("\"규정상 보관만 가능해요\"", { mental: -2 }, "노트북은 아직 옷장에 있다. 리뷰에는 '차가운 호스트'.", { star: -0.04 }),
  ] }) },
  { id: "ab_threat", j: "airbnb", g: false, mk: (s, T) => ({ title: "별점 인질극", text: `${T.name} 투숙객. "샤워기 수압이 약했어요. 50% 환불 안 해 주시면 별 하나 남길게요 :)" 웃는 이모티콘이 제일 무섭다.`, choices: [
    C("조용히 환불한다", { cash: -M(s, 15), mental: -4 }, "별점은 지켰다. 자존심은 못 지켰다."),
    K("협박 메시지를 캡처해 고객센터에 신고한다", "write", 45, O("\"규정 위반 리뷰는 삭제됩니다.\" 정의가 이겼다.", { mental: 4 }), O("처리 중… 처리 중… 그 사이 별 하나가 먼저 달렸다.", { mental: -5 }, { star: -0.1 })),
    C("정중하게 거절하고 수압을 고친다", { cash: -M(s, 5), mental: -1 }, "별 둘이 달렸다. 답글에 '수압 고쳤습니다'라고 쓰니 다음 손님이 칭찬해 줬다.", { star: -0.04 }),
  ] }) },
  { id: "ab_long", j: "airbnb", g: true, mk: (s, T) => ({ title: "석 달 묵을게요", text: `해외 연구원이 ${T.name}에 석 달을 묵고 싶단다. "장기 할인 되나요? 조용히 지낼게요. 진짜로." 청소 횟수가 확 준다.`, choices: [
    C("30% 할인해 준다", { cash: M(s, 150), hp: 3 }, "세 달 동안 청소 이모님 호출 0번. 나간 날 방이 들어올 때보다 깨끗했다.", { star: 0.03 }),
    K("할인은 15%만, 대신 공항 픽업 서비스", "lang", 40, O("\"Deal!\" 공항에서 손을 흔드는 내가 좀 멋있었다.", { cash: M(s, 190), hp: -3, stat: { lang: 1 } }, { star: 0.03 }), O("픽업 시간에 회의가 잡혔다. 택시비를 대신 냈다.", { cash: M(s, 160), mental: -2 })),
  ] }) },
  { id: "ab_party", j: "airbnb", g: false, mk: (s, T) => ({ title: "2명 예약, 12명 입장", text: `옆집 문자. "${T.name}에 사람이 계속 들어가요. 지금 열두 명째." 예약 인원은 2명이었다. 음악 소리가 문자를 뚫고 들린다.`, choices: [
    K("바로 가서 퇴실을 요구한다", "charm", 45, O("문이 열리자 다들 얌전해졌다. 10분 만에 해산. 옆집에 귤을 드렸다.", { hp: -5, mental: -1 }, { star: -0.01 }), O("\"사장님도 한 잔?\" 해산은 새벽 4시. 옆집이 구청에 전화했다.", { hp: -8, mental: -6, cash: -M(s, 40) }, { star: -0.08 })),
    C("추가 인원 요금과 청소비를 청구한다", { cash: M(s, 25), mental: -3 }, "돈은 받았다. 옆집 눈빛은 못 받았다.", { star: -0.04 }),
  ] }) },

  // ───── 타로 ─────
  { id: "tr_love", j: "tarot", g: true, mk: (s) => ({ title: "단골의 연애 상담", text: `매주 목요일 같은 시간, 같은 이름. 오늘은 카드보다 질문이 먼저 왔다. "선생님, 그 사람한테 고백할까요?" 뒤집힌 카드는 연인.`, choices: [
    C("\"카드가 응원하네요\" 용기를 준다", { mental: 3, tr_reg: 1, tr_rev: 1 }, "다음 주 메시지: \"사귀기로 했어요!!\" 단골이 커플 리딩 단골이 됐다."),
    K("\"카드는 거울이에요\" 진짜 마음을 묻는다", "talk", 40, O("한참 말하더니 스스로 답을 찾았다. \"선생님은 카드 말고 사람을 읽으시네요.\"", { mental: 4, tr_rep: 3, tr_reg: 1 }), O("\"그래서 하라는 거예요, 말라는 거예요?\" 철학은 다음에.", { mental: -2 })),
  ] }) },
  { id: "tr_hit", j: "tarot", g: true, mk: (s) => ({ title: "\"선생님 말이 맞았어요\"", text: `후기 알림. "석 달 전에 이직 운 들어온다고 하셨잖아요. 진짜 그달에 합격했어요 소름." 캡처가 커뮤니티를 한 바퀴 돌았다.`, choices: [
    C("후기를 프로필 맨 위에 건다", { mental: 3, tr_rev: 3, tr_rep: 4, tr_q: 2 }, "\"그 소름 후기 리더 맞죠?\" 문의가 줄을 섰다."),
    C("\"붙은 건 님이 잘해서예요\" 겸손 답글", { mental: 5, tr_rep: 2, tr_reg: 1, item: "m_letter" }, "답글 캡처가 후기보다 더 돌았다. 겸손도 마케팅이다."),
  ] }) },
  { id: "tr_doubt", j: "tarot", g: false, mk: (s) => ({ title: "의심 많은 손님", text: `"제 생일 맞혀 보세요. 못 맞히면 환불이요." 팔짱 낀 이모티콘. 타로는 생일 맞히기 게임이 아니다.`, choices: [
    C("말없이 환불한다", { cash: -M(s, 2), mental: -2 }, "5,000원으로 평화를 샀다. 이번엔 싼 평화."),
    K("타로가 뭘 하고 뭘 못 하는지 차분히 설명한다", "talk", 45, O("\"…그럼 제 이직 운이나 봐 주세요.\" 결국 단골이 됐다.", { mental: 2, tr_rep: 2, tr_reg: 1 }), O("\"역시 사기네.\" 별 하나 후기가 달렸다.", { mental: -4, tr_rep: -3 })),
    K("\"생일 맞히면 2배 내실래요?\" 농담으로 받는다", "charm", 40, O("빵 터졌다. 팔짱이 풀렸다. 리딩은 40분 걸렸다.", { mental: 3, tr_rev: 1 }), O("웃음 포인트가 달랐다. 대화방이 조용해졌다.", { mental: -3 })),
  ] }) },
  { id: "tr_heavy", j: "tarot", g: false, mk: (s) => ({ title: "새벽 1시의 진지한 고민", text: `"카드 말고… 그냥 얘기 좀 들어 주실 수 있어요? 요즘 다 그만두고 싶어서요." 리딩 요청에 적힌 문장이 무겁다.`, choices: [
    C("카드는 덮고 끝까지 들어 준다. 전문 상담 창구도 알려 준다", { mental: -6, hp: -3, tr_rep: 3 }, "새벽 3시. \"내일은 출근해 볼게요.\" 그 한마디에 잠이 안 왔다."),
    C("카드만 담담하게 읽어 준다", { mental: -2 }, "리딩은 끝났는데 마음 한쪽이 계속 그 대화방에 남아 있다."),
    C("\"오늘은 리딩이 어렵겠어요\" 정중히 사양", { mental: -4, tr_rep: -1 }, "선을 긋는 것도 일이다. 그런데 오늘은 그 선이 유난히 차갑다."),
  ] }) },

  // ───── 방문 펫시팅(11-26) ─────
  { id: "ps_gift", j: "petsit", g: true, mk: (s) => ({ title: "제주에서 온 귤 한 상자", text: `열흘 출장을 다녀온 보호자가 귤 한 상자를 문 앞에 두고 갔다. 쪽지가 붙어 있다. "보고서 매일 읽었어요. 밥 남긴 날 적어 주신 거, 그게 제일 고마웠어요."`, choices: [
    C("감사 문자를 보내고 다음 예약을 잡는다", { mental: 5, ps_tr: 4, item: "m_letter" }, "\"다음 달 명절도 부탁드려요.\" 달력에 동그라미가 하나 늘었다."),
    C("후기를 부탁드린다", { mental: 3, ps_rev: 2, ps_inq: 1 }, "후기 첫 줄: '모르는 건 모른다고 적어 주는 분이에요.' 문의가 바로 붙었다."),
  ] }) },
  { id: "ps_cam", j: "petsit", g: false, mk: (s) => ({ title: "홈캠 스피커가 말을 했다", text: `밥그릇을 채우는데 거실 홈캠에서 목소리가 났다. "아, 그거 너무 많아요! 반만요!" 보호자는 지금 회사 회의실에서 나를 보고 있다.`, choices: [
    C("카메라를 보고 고개를 숙인 뒤 반을 덜어 낸다", { mental: -2, ps_tr: 2 }, "\"감사해요~\" 그 뒤로 방문 내내 누가 보는 느낌이다."),
    K("\"양은 사전 만남 때 적은 대로예요\" 메모를 보여 준다", "talk", 40, O("\"아 맞다, 제가 그렇게 말했네요.\" 다음부터 홈캠이 조용해졌다.", { mental: 3, ps_tr: 3 }), O("\"그래도 반만요.\" 메모를 고쳐 적었다.", { mental: -3 })),
  ] }) },
  { id: "ps_lap", j: "petsit", g: true, mk: (s) => ({ title: "처음으로 무릎에", text: `석 달째 소파 밑에서만 보던 겁 많은 고양이가 오늘 처음 나왔다. 보고서를 쓰는데 무릎에 올라와 앉았다. 사진은 한 장만 찍었다. 손이 떨려서 흔들렸다.`, choices: [
    C("흔들린 사진 그대로 보호자에게 보낸다", { mental: 6, ps_tr: 5 }, "\"우리 애가요?? 저한테도 안 올라와요!!\" 느낌표가 열한 개."),
    C("보고서에는 '오늘 처음 다가옴'만 적는다", { mental: 4, ps_star: 0.03 }, "본 것만 썼다. 보호자는 그 한 줄을 캡처해 프로필에 걸었다."),
  ] }) },
  { id: "ps_extra", j: "petsit", g: false, mk: (s) => ({ title: "\"오는 김에 화분도요\"", text: `보호자 메시지. "오는 김에 베란다 화분 물도 좀 주시고, 택배 오면 들여놔 주실 수 있죠? 아, 분리수거도요." 방문 30분이 한 시간이 될 판이다.`, choices: [
    C("이번만 다 해 준다", { hp: -4, mental: -2, ps_tr: 3 }, "화분 열두 개. 택배 세 개. 고양이는 그동안 나를 구경했다."),
    K("돌봄 범위를 정중히 다시 안내한다", "talk", 40, O("\"아, 그렇죠. 제가 욕심을 냈네요.\" 화분은 이웃에게 부탁한다고 했다.", { mental: 3 }), O("\"그 정도는 해 주실 줄 알았는데…\" 답장이 짧아졌다.", { mental: -3, ps_tr: -6 })),
    C("추가 요금을 안내한다", { cash: M(s, 3), mental: 1 }, "\"아 그럼 화분만요.\" 선이 생기니 마음이 편하다."),
  ] }) },
  // ───── 화상과외 ─────
  { id: "tu_grade", j: "tutoring", g: true, mk: (s) => ({ title: "52점 → 81점", text: `학부모 메시지에 성적표 사진. "선생님!!! 수학 81점이요!!!" 느낌표가 아홉 개. 택배로 떡이 오고 있다고 한다.`, choices: [
    C("감사 전화를 드리고 다음 목표를 잡는다", { mental: 5, tu_par: 6, tu_rev: 1, item: "m_letter" }, "\"선생님 덕분에 애가 수학을 덜 미워해요.\" 최고의 칭찬."),
    C("후기를 부탁드린다", { mental: 3, tu_rev: 2, tu_ref: 1 }, "후기 첫 줄: '52점이 81점 됐어요.' 문의가 바로 붙었다."),
  ] }) },
  { id: "tu_late", j: "tutoring", g: false, mk: (s) => ({ title: "밤 11시의 학부모", text: `밤 11시 12분. "선생님, 숙제가 너무 많은 거 아닌가요? 그리고 오늘 왜 2분 일찍 끝내셨어요?" 침대에서 메시지를 읽었다.`, choices: [
    C("바로 정중하게 답장한다", { mental: -3, tu_par: 3 }, "답장은 완벽했다. 잠은 달아났다."),
    K("\"상담은 평일 9시까지 받을게요\" 공지를 보낸다", "talk", 40, O("\"아 그렇죠, 죄송해요.\" 선이 생기니 밤이 조용해졌다.", { mental: 3 }), O("\"선생님 바쁘신가 봐요?\" 단톡 공기가 싸해졌다.", { mental: -3, tu_par: -6 })),
  ] }) },
  { id: "tu_cam", j: "tutoring", g: false, mk: (s) => ({ title: "꺼진 카메라", text: `수업 중 학생 화면이 꺼졌다. "카메라 고장났어요." 그런데 마이크 너머로 게임 효과음이 들린다. "궁극기!"`, choices: [
    C("학부모에게 조용히 알린다", { mental: -1, tu_par: 3 }, "다음 수업부터 카메라가 기적처럼 고쳐졌다. 학생 표정은 고장 났다."),
    K("\"10분 집중하면 5분 퀴즈 게임\" 거래한다", "talk", 40, O("퀴즈에서 이기려고 문제를 푼다. 게임 덕후는 게임으로 잡는다.", { stat: { talk: 1 }, tu_par: 3 }), O("퀴즈만 하고 수업은 못 했다. 학부모 후기에 '재미는 있대요'.", { tu_stars: -0.1 })),
  ] }) },
  { id: "tu_sibling", j: "tutoring", g: true, mk: (s) => ({ title: "\"동생도 부탁해요\"", text: `작년에 졸업한 학생 어머니. "동생이 중2인데 선생님 아니면 안 한대요. 사촌 동생도 같이요." 소개가 소개를 부른다.`, choices: [
    C("둘 다 시범수업 잡는다", { hp: -2, mental: 3, tu_ref: 2 }, "형이 선생님 자랑을 엄청 했단다. 부담 백배."),
    C("\"자리가 꽉 차서 대기 명단에 올릴게요\"", { mental: 2, tu_par: 2, tu_ref: 1 }, "대기 명단이 있는 선생님. 괜히 더 믿음이 간단다."),
  ] }) },
  { id: "tu_refund", j: "tutoring", g: false, mk: (s) => ({ title: "시험 망쳤으니 환불", text: `"이번 중간고사 망쳤어요. 이번 달 수업료는 돌려주셔야 하는 거 아닌가요?" 학생은 시험 전날 밤새 게임을 했다고 들었다.`, choices: [
    C("반만 환불하고 다음 시험 계획을 드린다", { cash: -M(s, 15), tu_par: 3 }, "\"선생님이 이렇게까지…\" 기말엔 15점이 올랐다."),
    K("규정대로 정중히 거절한다", "talk", 45, O("수업 기록과 숙제 체크표를 보여 드렸다. \"…저희 애가 문제였네요.\"", { mental: 2, tu_par: 1 }), O("과외 앱에 별 하나. '돈만 밝히는 선생님'.", { mental: -5, tu_stars: -0.15 })),
  ] }) },

  // ───── 치킨 ─────
  { id: "ch_regular", j: "chicken", g: true, mk: (s, T) => ({ title: "금요일 아저씨의 큰 주문", text: `매주 금요일 반반 두 마리 시키던 '금요일 아저씨'. 오늘은 전화가 다르다. "${T.name}이죠? 우리 회사 체육대회인데 40마리 되나요?"`, choices: [
    C("받는다. 튀김기를 쉬지 않는다", { hp: -8, cash: M(s, 60), mental: 3 }, "40마리 완판. 다음 주 아저씨가 쿠폰 대신 회사 사람 다섯을 데려왔다.", { star: 0.03 }),
    C("20마리만 받고 맛을 지킨다", { cash: M(s, 30), mental: 1 }, "\"사장님 고집이 맛이지.\" 나머지는 옆 동네 가게로 갔다."),
  ] }) },
  { id: "ch_leg", j: "chicken", g: false, mk: (s, T) => ({ title: "다리가 하나라는 손님", text: `${T.name} 리뷰 별 하나. "다리가 하나밖에 없어요. 환불해 주세요." 첨부 사진에는 다리가 정확히 두 개 보인다.`, choices: [
    C("말없이 환불하고 사과한다", { cash: -M(s, 3), mental: -3 }, "닭다리 하나 값보다 마음이 더 아팠다.", { star: -0.01 }),
    K("사진에 동그라미 쳐서 유쾌하게 답글", "write", 45, O("\"사장님 답글 보러 왔다가 시켰어요.\" 답글이 광고가 됐다.", { mental: 4 }, { star: 0.03 }), O("\"손님 가르치는 가게\" 댓글이 줄줄이. 답글은 내렸다.", { mental: -5 }, { star: -0.06 })),
  ] }) },
  { id: "ch_kids", j: "chicken", g: true, mk: (s, T) => ({ title: "크레파스 편지", text: `${T.name} 문 앞에 도화지 한 장. 삐뚤빼뚤한 닭 그림 아래 "치킨 사장님 최고. 생일에 또 올게요." 동네 꼬마 손님 셋의 합작이다.`, choices: [
    C("카운터 옆에 붙여 둔다", { mental: 5, shard: 1 }, "손님들이 그림 앞에서 사진을 찍는다. 별점 리뷰에 그림이 자꾸 나온다.", { star: 0.03 }),
    C("다음에 오면 콜라 서비스", { cash: -M(s, 2), mental: 4 }, "생일날 꼬마 열두 명이 왔다. 콜라 열두 병은 좀 많았다."),
  ] }) },
  { id: "ch_noshow", j: "chicken", g: false, mk: (s, T) => ({ title: "30마리 노쇼", text: `"동창회예요, 7시까지 30마리요!" 7시 반. 전화는 꺼져 있다. ${T.name} 포장대에 박스 30개가 탑처럼 쌓였다.`, choices: [
    C("반값 떨이로 판다", { cash: -M(s, 25), mental: -3 }, "동네 단톡방에 '반값 치킨' 공지. 30분 만에 사라졌다. 남은 건 허탈함."),
    C("근처 경로당과 지구대에 나눠 드린다", { cash: -M(s, 40), mental: 4 }, "다음 날 지구대 순경이 회식 주문을 넣었다. 인생은 돌고 닭도 돈다.", { star: 0.02 }),
  ] }) },
  { id: "ch_hair", j: "chicken", g: false, mk: (s, T) => ({ title: "머리카락 클레임", text: `"치킨에서 머리카락 나왔어요." 사진 속 머리카락은 길고 보라색이다. ${T.name} 직원은 전부 짧은 검은 머리다.`, choices: [
    C("일단 환불하고 사과한다", { cash: -M(s, 3), mental: -2 }, "이번 달만 세 번째 보라색 머리카락이다.", { star: -0.01 }),
    K("조리 과정 영상과 위생모 사진으로 답한다", "talk", 45, O("\"…제 머리카락인가 봐요.\" 리뷰가 조용히 지워졌다.", { mental: 3 }, { star: 0.02 }), O("\"사장이 손님을 의심함\" 별 하나가 박제됐다.", { mental: -5 }, { star: -0.05 })),
  ] }) },

  // ───── 무인카페 ─────
  { id: "uc_study", j: "ucafe", g: true, mk: (s, T) => ({ title: "새벽 6시 손님의 쪽지", text: `${T.name} 방명록에 쪽지. "1년 동안 매일 새벽 6시에 여기서 공부했어요. 합격했습니다! 아메리카노 400잔 고마웠어요." CCTV 속 그 모자 손님이다.`, choices: [
    C("쪽지를 벽에 붙이고 '합격 기원석'을 만든다", { mental: 5, item: "m_mug" }, "그 자리에 앉으려고 줄을 선다. 커피보다 기운을 팔게 됐다.", { star: 0.04 }),
    C("축하 쿠폰을 방명록에 붙여 둔다", { cash: -M(s, 1), mental: 4 }, "쿠폰 옆에 '저도 합격하면 쪽지 남길게요' 쪽지가 세 장 더 붙었다.", { star: 0.02 }),
  ] }) },
  { id: "uc_mess", j: "ucafe", g: false, mk: (s, T) => ({ title: "컵라면 파티의 흔적", text: `아침 7시 ${T.name}. 테이블에 컵라면 용기 아홉 개, 바닥엔 과자 부스러기 은하수. CCTV 속 교복 아홉 명이 신나 보인다.`, choices: [
    K("학교에 정중하게 연락한다", "talk", 40, O("다음 날 아홉 명이 와서 청소하고 사과 쪽지를 남겼다. 그중 둘은 단골이 됐다.", { mental: 2 }), O("\"증거 있어요?\" 통화가 길어졌다. 출근이 늦었다.", { mental: -4, eye: 2 })),
    C("그냥 치우고 '깨끗이 써 주세요' 써 붙인다", { hp: -5, mental: -2 }, "안내문 아래에 누가 '넵 ㅎㅎ'라고 썼다."),
  ] }) },
  { id: "uc_unpaid", j: "ucafe", g: false, mk: (s, T) => ({ title: "결제 안 된 12잔", text: `정산이 이상하다. ${T.name} 결제 기록은 0원인데 컵은 12개가 비었다. CCTV 속 남자는 매번 키오스크 앞에서 전화하는 척을 한다.`, choices: [
    K("\"결제 확인 부탁드려요\" 쪽지를 기계에 붙인다", "charm", 35, O("다음 날 봉투에 돈과 사과 편지. \"진짜 결제된 줄 알았어요.\" 그렇다고 하자.", { cash: M(s, 5), mental: 2 }), O("쪽지가 사라졌다. 남자도 사라졌다. 12잔도.", { cash: -M(s, 5), mental: -3 })),
    C("미결제 경보를 단다", { cash: -M(s, 40), mental: 1 }, "삑. 경보가 울린 첫날, 키오스크 앞 남자가 조용히 카드를 꺼냈다."),
  ] }) },
  { id: "uc_dog", j: "ucafe", g: true, mk: (s, T) => ({ title: "산책길 강아지 손님", text: `${T.name} 문 앞에 매일 아침 같은 강아지와 주인. "들어가도 돼요? 얘 진짜 얌전해요." 강아지가 꼬리로 대답한다.`, choices: [
    K("반려견 동반석과 물그릇을 만든다", "sense", 35, O("동네 산책 지도에 '강아지 OK 카페'로 올라갔다. 아침 매출이 늘었다.", { cash: M(s, 15), mental: 4 }, { star: 0.04 }), O("털 청소가 두 배. 알레르기 손님 리뷰가 하나 달렸다.", { cash: M(s, 10), hp: -3 }, { star: -0.01 })),
    C("\"죄송해요, 테이크아웃만요\"", { mental: -1 }, "강아지가 유리문 너머로 서운한 눈빛을 보냈다. 이길 수 없는 눈빛이었다."),
  ] }) },

  // ───── 인별그램 ─────
  { id: "in_fan", j: "insta", g: true, mk: (s) => ({ title: "팬이 그린 내 얼굴", text: `DM 알림. 팔로워가 내 프로필 사진을 손그림으로 그려 보냈다. "퇴근 후 사는 얘기 보고 힘내요." 나보다 내가 더 잘생기게 나왔다.`, choices: [
    C("스토리에 소개하고 고맙다고 전한다", { mental: 5, item: "m_fanart" }, "\"저도 그려 주세요\" 댓글 폭주. 그 팬은 덕분에 그림 의뢰를 받기 시작했다.", { fol: 3 }),
    C("DM으로만 조용히 감사 인사", { mental: 4 }, "\"답장 받았다!!\" 그 팬의 스토리에 내가 나왔다.", { fol: 1 }),
  ] }) },
  { id: "in_brand_bad", j: "insta", g: false, mk: (s) => ({ title: "협찬사의 수정 요청", text: `협찬 게시물을 올린 다음 날. "단점 문장은 빼 주시고, 광고 표시는 맨 아래로 내려 주세요. 안 되면 대금 조정이…" 찜찜함이 협찬품보다 크다.`, choices: [
    C("거절한다. 광고 표시는 그대로", { cash: -M(s, 20), mental: 2 }, "대금이 깎였다. 대신 \"이 계정은 솔직해서 좋다\" 댓글이 달렸다.", { fol: 1 }),
    C("요청대로 고친다", { cash: M(s, 30), mental: -3 }, "\"요즘 광고 냄새 나네요.\" 댓글 하나가 오래 아팠다.", { fol: -3 }),
  ] }) },
  { id: "in_brand_good", j: "insta", g: true, mk: (s) => ({ title: "장기 협찬 제안", text: `작은 생활용품 브랜드 대표의 DM. "게시물 보고 연락드려요. 6개월 동안 한 달에 한 번, 솔직 후기 그대로 좋아요." 솔직 후기 그대로라니.`, choices: [
    C("바로 수락한다", { cash: M(s, 90), hp: -3 }, "매달 택배가 온다. 써 보고 솔직하게 쓴다. 이게 일이라니."),
    K("단가를 협상해 본다", "talk", 45, O("\"좋습니다, 그 대신 릴스 하나 추가로요.\" 계약 성공.", { cash: M(s, 130), hp: -5 }), O("\"예산이 정해져 있어서요…\" 결국 처음 금액보다 조금 낮아졌다.", { cash: M(s, 60), mental: -2 })),
  ] }) },
  { id: "in_hater", j: "insta", g: false, mk: (s) => ({ title: "매일 오는 그 계정", text: `게시물마다 같은 계정이 댓글을 단다. "회사 다니면서 이런 거 하면 회사가 알까요?ㅋㅋ" 오늘로 스물세 번째다.`, choices: [
    C("조용히 차단한다", { mental: -1 }, "차단 버튼 하나에 마음이 가벼워졌다. 진작 할걸."),
    K("유머로 정면 대응한다", "write", 45, O("\"23번째 출석 감사합니다. 개근상 드릴게요.\" 댓글이 빵 터졌다.", { mental: 3 }, { fol: 2 }), O("말싸움이 됐다. 구경꾼만 늘고 내 멘탈은 줄었다.", { mental: -6 }, { fol: -2 })),
  ] }) },

  // ───── 웹소설 ─────
  { id: "wn_fanart", j: "webnovel", g: true, mk: (s) => ({ title: "첫 팬아트", text: `댓글에 그림 링크. 주인공이 칼을 들고 서 있다. 내가 상상한 것보다 멋있다. "작가님 이 장면 너무 좋아서 그렸어요."`, choices: [
    C("작가 공지에 소개한다", { mental: 6, wn_fans: 4, item: "m_fanart" }, "팬아트 공지 이후 '그림 보고 1화부터 왔어요' 댓글이 달렸다."),
    C("작가 후기에 감사만 남긴다", { mental: 4, wn_ret: 1 }, "그 독자는 그 뒤로 매화 첫 댓글을 단다."),
  ] }) },
  { id: "wn_spoil", j: "webnovel", g: false, mk: (s) => ({ title: "반전을 맞힌 독자", text: `베스트 댓글. "보니까 집사가 흑막이네요. 3화 찻잔 묘사가 복선." 50화 뒤에 터뜨릴 반전이었다. 좋아요 412개.`, choices: [
    K("밤새 플롯을 비튼다", "write", 45, O("흑막은 집사가 아니라 찻잔이었다. 댓글창이 뒤집혔다.", { hp: -6, mental: 3, wn_ret: 2 }), O("비틀다 보니 이야기가 꼬였다. '전개가 산으로 감' 댓글.", { hp: -6, mental: -4, wn_ret: -2 })),
    C("그대로 간다. 맞히는 재미도 재미다", { mental: -2, wn_fans: -2 }, "\"역시 내 말이 맞았지\" 댓글에 좋아요가 또 붙었다."),
  ] }) },
  { id: "wn_letter", j: "webnovel", g: true, mk: (s) => ({ title: "1년 독자의 장문 댓글", text: `"출근길 지하철에서 작가님 소설 읽는 게 하루 유일한 낙이에요. 회사 때려치우고 싶을 때마다 주인공 보고 버텨요." 내가 쓰는 이유가 거기 있었다.`, choices: [
    C("길게 답글을 단다", { mental: 7, wn_ret: 1, shard: 1 }, "\"작가님도 회사 다니세요?\" 그건 비밀로 했다."),
    C("다음 화를 더 열심히 쓴다", { mental: 4, hp: -3, wn_ret: 2 }, "그 독자 이름을 엑스트라 이름으로 슬쩍 넣었다. 들켰다. 좋아했다."),
  ] }) },
  { id: "wn_copy", j: "webnovel", g: false, mk: (s) => ({ title: "\"표절 아니에요?\"", text: `커뮤니티 비교글. "이 작품 설정이 ○○랑 너무 비슷하지 않나요?" 회귀, 복수, 재벌. 하늘 아래 새로운 회귀는 없다.`, choices: [
    K("연재 노트와 설정 날짜를 공개한다", "write", 40, O("\"이 작가 설정 노트 미쳤다.\" 의혹이 홍보가 됐다.", { mental: 2, wn_fans: 2 }), O("해명이 길어지자 더 수상해 보였다. 댓글창이 피곤하다.", { mental: -5, wn_fans: -3 })),
    C("무시하고 연재에 집중한다", { mental: -3, wn_ret: -1 }, "글은 일주일 만에 묻혔다. 신경은 한 달 갔다."),
  ] }) },

  // ───── 바이브코딩 ─────
  { id: "vb_thanks", j: "vibe", g: true, ok: appOn, mk: (s) => ({ title: "앱 사용자의 감사 메일", text: `메일 제목: "덕분에 살았습니다." 작은 미용실 사장님이다. "예약 꼬이는 일이 한 달째 0건이에요. 손님한테 사과할 일이 없어졌어요."`, choices: [
    C("앱 소개 페이지에 후기로 올린다", { mental: 4, vb_rep: 4 }, "같은 업종 사장님 셋이 체험판을 눌렀다."),
    C("원하는 기능이 있는지 물어본다", { mental: 3, hp: -3, vb_rep: 6 }, "\"노쇼 문자 자동 발송이요!\" 다음 업데이트 목록 1번이 정해졌다."),
  ] }) },
  { id: "vb_bug", j: "vibe", g: false, ok: appOn, mk: (s) => ({ title: "새벽 2시의 버그 신고", text: `알림 폭주. "결제 버튼 눌러도 아무 일도 안 일어나요." 같은 내용 일곱 통. 어제 저녁 업데이트가 범인이다.`, choices: [
    K("일어나서 바로 고친다", "num", 40, O("새벽 3시 40분 복구. 사과 메일에 '한 달 무료'를 붙였다. 오히려 칭찬이 왔다.", { hp: -10, cash: -M(s, 10), vb_rep: 3 }), O("고치다가 다른 데가 터졌다. 아침 7시에야 잠잠해졌다.", { hp: -12, mental: -4, vb_rep: -5 })),
    C("아침에 출근 전에 고친다", { hp: -3, vb_rep: -3, mental: -1 }, "그 사이 해지 버튼을 누른 사람이 둘. 잠은 잤다."),
  ] }) },
  { id: "vb_scope", j: "vibe", g: false, ok: clientOn, mk: (s) => ({ title: "\"버튼 하나만 더\"", text: `외주 손님 메시지. "사장님, 진짜 마지막으로 버튼 하나만 더요. 금방 되죠?" 이번 달 열 번째 '진짜 마지막'이다.`, choices: [
    K("추가 견적서를 정중하게 보낸다", "talk", 45, O("\"아 맞다, 원래 이게 돈이죠.\" 추가 금액 입금.", { cash: M(s, 50), mental: 2 }), O("\"그 정도는 서비스 아니에요?\" 다음 소개는 없을 것 같다.", { mental: -3, vb_rep: -3 })),
    C("그냥 해 준다", { hp: -8, mental: -2, vb_rep: 3 }, "버튼 하나가 화면 세 개가 됐다. 손님은 엄청 좋아했다."),
  ] }) },
  { id: "vb_refer", j: "vibe", g: true, ok: clientOn, mk: (s) => ({ title: "사장님 모임에서 내 얘기가", text: `예전 외주 손님 전화. "우리 상가 번영회에서 사장님 얘기했더니 다들 연락처 달래요. 저녁 한번 같이 하실래요?"`, choices: [
    C("저녁 자리에 나간다", { hp: -3, cash: M(s, 80), vb_rep: 3 }, "삼겹살 자리에서 계약 두 건. 명함이 동났다."),
    C("\"요즘 꽉 차서요\" 정중히 미룬다", { mental: 2 }, "\"역시 잘나가는 분은 다르네.\" 그 말이 칭찬인지 아닌지는 모르겠다."),
  ] }) },
];

const has = (s, j) => (s.sj?.active || []).includes(j);
function ready(s, j) { const J = JOB[j]; if (!J || !has(s, j)) return false; return J.list ? J.list(s).length > 0 : J.ready(s); }

export function guestMonth(s, r, scenes) {
  if (!(s.sj?.active || []).length) return;
  if (scenes.some((x) => x.kind === "event") || s.t - (s.flags.gsT ?? -99) < GAP) return;
  const cands = EVS.filter((e) => s.flags["gs_" + e.id] === undefined && ready(s, e.j) && (!e.ok || e.ok(s)));
  if (!cands.length || !r.chance(P)) return;
  const e = r.pick(cands), J = JOB[e.j];
  s.flags.gsT = s.t; s.flags["gs_" + e.id] = s.t;
  const T = J.list ? r.pick(J.list(s)) : null;
  // 파티룸 손님 인물(customer.board === "partyroom")이 있으면 가끔 그 사람으로
  let w = null;
  if (e.who) { const pool = (s.cast || []).filter((id) => CHAR[id]?.customer?.board === "partyroom" && !s.rel[id]?.spouse); if (pool.length && r.chance(0.5)) { w = r.pick(pool); ensureRel(s, w); } }
  const sc = { kind: "event", tag: "손님", onChoose: "gs_ev", gs: e.id, gj: e.j, ...(T ? { gsT: T.id } : {}), ...e.mk(s, T || {}, w) };
  if (w) { sc.who = w; sc.expr = e.g ? "smile" : "neutral"; }
  if (e.j === "airbnb" && !e.g) abUndWarn(s, sc, e.id);
  scenes.push(sc);
}

// 선택지 x 처리: 대상 별점·팔로워를 조금만
function applyX(s, sc, x) {
  const out = [];
  if (!x) return out;
  if (x.star) {
    const J = JOB[sc.gj], T = J?.list ? J.list(s).find((u) => u.id === sc.gsT) : null;
    if (T && typeof T.rating === "number") { const b = T.rating; T.rating = clamp(T.rating + x.star, J.lo, Math.max(J.hi, b)); const d = Math.round((T.rating - b) * 100) / 100; if (d) out.push(`${T.name} 별점 ${d > 0 ? "+" : ""}${d.toFixed(2)}`); }
  }
  if (x.fol && s.ins && typeof s.ins.f === "number") { const d = Math.round(s.ins.f * x.fol / 100); if (d) { s.ins.f = Math.max(0, s.ins.f + d); out.push(`팔로워 ${d > 0 ? "+" : ""}${d.toLocaleString()}명`); } }
  return out;
}

export const GS_CHOOSE = {
  gs_ev(s, r, i, okv, sc) {
    const ch = sc?.choices?.[i]; if (!ch) return [];
    const x = ch.check ? (okv ? ch.ok?.x : ch.ng?.x) : ch.x;
    return applyX(s, sc, x);
  },
};
