// 자녀·배우자·부모님 이벤트(v4.25). core.js peopleMonth 에서 매달 famMonth(s, r, scenes, notes) 로 부른다.
// onChoose 이름은 "fam_" 으로 시작하고 FAM_CHOOSE 에 넣는다. 난수는 r 만.
// 규칙: 한 달 최대 1개, 이벤트끼리 최소 5달 간격, 같은 이벤트는 한 번만(s.flags["fe_<id>"]).
// 선택지 추가 효과 x(판정 선택지는 ok.x / ng.x): par 부모님 건강 ±, visit 부모님 뵘, famTime 가족과 보낸 달(아이 보며 힘내기 +1)
import { CHAR, jo } from "./core.js";
import * as SYN from "./syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const GAP = 5; // 가족 이벤트 최소 간격(달)
const P_MARRIED = 0.1, P_SINGLE = 0.03; // 간격이 찬 달에 이벤트가 뜰 확률

// ── 도우미 ──
const kAge = (s, k) => (s.t - k.born) / 12;
const kidIn = (s, lo, hi) => s.fam.kids.find((k) => { const a = kAge(s, k); return a >= lo && a < hi; }) || null;
const married = (s) => !!s.fam.spouse;
const alive = (s) => s.fam.parents > 0;
const well = (s) => s.fam.parents >= 45;
const side = (s) => (s.sj?.active?.length || 0) > 0 || (s.lastSide ?? 0) > 0;
const working = (s) => !s.co.quit && !s.co.fired;
const M = (s, x) => { const v = x * SYN.pi(s); return Math.abs(v) < 50 ? Math.max(1, Math.round(Math.abs(v))) * Math.sign(v) : Math.round(v / 10) * 10; }; // 만원, 물가 반영
const meCall = (s) => (s.me.gender === "F" ? "엄마" : "아빠");
const spCall = (s) => (s.me.gender === "F" ? "아빠" : "엄마");
const child = (s) => (s.me.gender === "F" ? "딸" : "아들");
const inlaw = (s) => (s.me.gender === "M" ? "처가" : "시댁");
const inlawM = (s) => (s.me.gender === "M" ? "장모님" : "시어머님");
const nm = (s) => CHAR[s.fam.spouse]?.name || "배우자";
const I = (w) => jo(w, "이", "가"), U = (w) => jo(w, "은", "는"), L = (w) => jo(w, "을", "를"), W = (w) => jo(w, "과", "와");
const jong = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const kidI = (k) => (jong(k.name) ? k.name + "이" : k.name); // 아이 이름 부를 때: 하린이, 도윤이, 서아
const kidIs = (k) => jo(kidI(k), "이", "가"); // 하린이가

// 선택지 만들기
const C = (t, eff, text, x) => ({ t, eff, text, ...(x ? { x } : {}) });
const K = (t, stat, dc, ok, ng) => ({ t, check: { stat, dc }, ok, ng });
const O = (text, eff, x) => ({ text, eff, ...(x ? { x } : {}) });

// ── 이벤트 목록 ──
// g: 좋은 일(true)/나쁜 일(false), w: 가중치, ok(s): 조건, mk(s, r): 장면
const EVS = [
  // ───── 부모님(결혼 전에도) ─────
  { id: "p_boiler", g: false, ok: (s) => alive(s) && s.age >= 28, mk: (s) => ({ title: "보일러의 은퇴", text: `아버지 전화. "보일러가 30년 만에 은퇴했단다." 그 뒤로 말끝이 유난히 길다.`, choices: [
    C("새 보일러 값을 보내 드린다", { cash: -M(s, 150), mental: 2 }, "이번 겨울은 본가가 따뜻하겠다. 내 통장은 좀 춥다.", { par: 4 }),
    C("반만 보내고 사정을 말씀드린다", { cash: -M(s, 70) }, "\"그래, 너도 힘들지.\" 그 말이 더 아팠다.", { par: 1 }),
    K("주말에 내려가 직접 고친다", "hands", 45, O("부품 하나 갈았더니 살아났다. 아버지가 동네에 기술자 자식 자랑을 하셨다.", { cash: -M(s, 20), hp: -6, stat: { hands: 1 } }, { par: 3, visit: 1 }), O("부품만 세 번 샀다. 결국 기사님을 불렀다.", { cash: -M(s, 60), hp: -8 }, { par: 1, visit: 1 })),
  ] }) },
  { id: "p_checkup", g: true, ok: (s) => alive(s) && s.age >= 30, mk: (s) => ({ title: "부모님 건강검진", text: `가족 건강검진 할인 안내가 떴다. 부모님은 "멀쩡한데 뭘 그런 걸" 하신다. 멀쩡한 사람은 보통 그렇게 말한다.`, choices: [
    C("종합검진을 예약해 드린다", { cash: -M(s, 60), mental: 2 }, "작은 용종 하나를 미리 뗐다. 의사가 \"잘 오셨네요\"라고 했다.", { par: 8 }),
    C("기본 검진만 챙긴다", { cash: -M(s, 20) }, "큰 이상은 없었다. 혈압약 얘기만 들었다.", { par: 3 }),
    C("\"내년에 하시죠\"", { mental: -1 }, "찜찜함이 냉장고 김치처럼 오래 갔다.", { par: -3 }),
  ] }) },
  { id: "p_worry", g: false, ok: (s) => alive(s) && side(s), mk: (s) => ({ title: "부모님의 걱정", text: `엄마가 반찬통을 건네며 물었다. "회사 다니면서 뭘 또 한다며? 그러다 회사 잘리면 어쩌려고."`, choices: [
    K("장부를 펼쳐 차근차근 설명한다", "talk", 40, O("다음 날 큰이모한테 자랑 전화가 갔다고 한다.", { mental: 4 }, { par: 2 }), O("설명할수록 걱정이 늘었다. 반찬통이 하나 더 늘었다.", { mental: -4 })),
    C("\"응, 조심할게\" 하고 넘긴다", { mental: -2 }, "엄마는 그 뒤로 매주 \"회사는 괜찮지?\" 문자를 보낸다."),
    C("투잡 얘기는 이제 집에서 안 한다", { mental: -3 }, "말하지 않으니 걱정도 안 하신다. 대신 나도 자랑할 데가 없다.", { par: -1 }),
  ] }) },
  { id: "p_brag", g: true, ok: (s) => alive(s) && (s.lastSide ?? 0) >= 80, mk: (s) => ({ title: "엄마의 자랑", text: `동네 모임 단톡방에 엄마가 내 투잡 리뷰 캡처를 올렸다. 댓글 23개. 다들 "좋겠다"고 한다.`, choices: [
    C("부끄럽지만 고맙다고 전화한다", { mental: 6, shard: 1 }, "\"우리 애가 원래 손이 야무져.\" 처음 듣는 얘기다.", { par: 2 }),
    C("효도 선물로 갈비 세트를 보낸다", { cash: -M(s, 30), mental: 4 }, "갈비 사진이 다시 단톡방에 올라갔다. 자랑이 자랑을 낳는다.", { par: 3 }),
    K("동네 분들께 리뷰를 부탁드린다", "charm", 35, O("어르신 리뷰 열두 개가 달렸다. 맞춤법은 자유롭지만 별은 전부 다섯 개.", { mental: 4, stat: { mkt: 1 } }), O("\"리뷰가 뭐냐?\" 설명하다 하루가 갔다.", { mental: 1 })),
  ] }) },
  { id: "p_70", g: true, ok: (s) => alive(s) && s.age >= 38, mk: (s) => ({ title: "아버지의 칠순", text: `다음 달이 아버지 칠순이다. 조용하던 형제 단톡방이 갑자기 회의실이 됐다.`, choices: [
    C("식당을 빌려 제대로 잔치를 연다", { cash: -M(s, 300), mental: 6, family: 4, item: "m_photo" }, "아버지가 노래방 기계 앞에서 마이크를 놓지 않으셨다.", { par: 6, visit: 1 }),
    C("가족끼리 조촐하게 식사한다", { cash: -M(s, 80), mental: 3 }, "케이크 초를 일곱 개 꽂았다. \"하나에 10년이다.\" 아버지가 웃으셨다.", { par: 3, visit: 1 }),
    C("마감이 겹쳐 봉투만 보낸다", { cash: -M(s, 100), mental: -4 }, "바빠서 못 간다는 말이 목에 걸렸다.", { par: -2 }),
  ] }) },
  { id: "p_nag", g: false, ok: (s) => alive(s) && !married(s) && [1, 2, 9, 10].includes(s.cal) && s.age >= 27, mk: (s) => ({ title: "명절 잔소리", text: `명절 큰집. "그래서 만나는 사람은 있고?" 사촌이 먼저 집중포화를 맞는 동안 내 차례가 다가온다.`, choices: [
    K("\"투잡 하느라요\"로 선제공격", "talk", 35, O("화제가 부업으로 넘어갔다. 큰아버지가 명함을 달라고 하셨다.", { mental: 3 }), O("\"그럼 돈은 많이 벌었겠네?\" 대출 얘기로 이어졌다.", { mental: -4 })),
    C("전 부치기에 몰두한다", { hp: -4, mental: -1, stat: { hands: 1 } }, "기름 냄새 속에서 질문은 피했다. 동그랑땡 장인이 됐다.", { par: 2, visit: 1 }),
    C("당직이라며 이번엔 안 간다", { mental: -2, hp: 4 }, "혼자 보낸 연휴. 편했다. 조금 쓸쓸했다.", { par: -2 }),
  ] }) },
  { id: "p_box", g: true, ok: (s) => alive(s), mk: (s) => ({ title: "엄마의 택배", text: `현관 앞 아이스박스. 김치, 장조림, 멸치볶음, 그리고 꾹꾹 눌러 쓴 쪽지. "밥 꼭 챙겨 먹어."`, choices: [
    C("바로 영상통화를 건다", { mental: 5, shard: 1 }, "\"장조림은 냉장고 맨 아래 칸!\" 20분 동안 보관법 강의를 들었다.", { par: 2 }),
    C("인증샷만 보내고 투잡하러 간다", { mental: 3, hp: 3, cash: M(s, 10) }, "장조림 덕에 이번 달 식비가 줄었다. 엄마 반찬은 최고의 재테크다."),
  ] }) },
  { id: "p_phish", g: false, ok: (s) => alive(s) && s.age >= 30, mk: (s) => ({ title: "엄마의 이상한 문자", text: `엄마 전화. "${child(s)}, 너 폰 깨져서 새 번호로 연락한다며?" 이미 상품권 번호를 반쯤 불러 준 상태였다.`, choices: [
    K("바로 은행에 지급 정지를 건다", "num", 35, O("아슬아슬하게 막았다. 엄마는 이제 내 목소리만 믿는다.", { mental: 2 }, { par: 1 }), O("일부는 이미 빠져나갔다. 내가 조용히 메꿔 드렸다.", { cash: -M(s, 100), mental: -5 })),
    C("주말에 가서 폰 보안 교육을 한다", { hp: -3, mental: 1 }, "모르는 번호는 받지 않기, 링크 누르지 않기. 엄마가 받아 적으셨다. 내 번호도 차단될 뻔했다.", { par: 1, visit: 1 }),
  ] }) },
  { id: "p_fall", g: false, ok: (s) => alive(s) && well(s) && s.age >= 36, mk: (s) => ({ title: "빙판길", text: `아버지가 빙판길에서 넘어지셨다. 손목 골절. 전화로 하신 첫마디는 "별거 아니다"였다.`, choices: [
    C("휴가를 내고 병원에 동행한다", { cash: -M(s, 100), eye: 4, mental: -2 }, "깁스한 손으로 내 머리를 쓰다듬으셨다. 몇 년 만인지 모르겠다.", { par: -2, visit: 1 }),
    C("간병인을 부르고 주말에 간다", { cash: -M(s, 200), mental: -1 }, "\"돈을 왜 써.\" 하시면서도 간병인 칭찬을 한참 하셨다.", { par: -3, visit: 1 }),
    C("형제에게 부탁한다", { mental: -4 }, "형제 단톡방 공기가 조금 무거워졌다.", { par: -6 }),
  ] }) },
  { id: "p_trip", g: true, ok: (s) => alive(s) && well(s) && s.cash > 300, mk: (s) => ({ title: "효도 여행", text: `엄마가 TV 여행 프로를 보다 혼잣말을 하셨다. "저긴 죽기 전에 가 보려나." 리모컨 쥔 손이 괜히 무거워졌다.`, choices: [
    C("패키지 여행을 보내 드린다", { cash: -M(s, 250), mental: 5 }, "단톡방에 사진 87장이 올라왔다. 전부 브이.", { par: 6 }),
    C("같이 국내 여행을 간다", { cash: -M(s, 100), mental: 4, hp: -3 }, "엄마가 휴게소 호두과자를 다섯 봉지 샀다. 여행의 하이라이트였다.", { par: 4, visit: 1 }),
    C("\"다음에 꼭 가요\"", { mental: -2 }, "그 '다음'이 언제인지는 둘 다 모른다."),
  ] }) },
  { id: "p_emoji", g: true, ok: (s) => alive(s) && s.age >= 29, mk: (s) => ({ title: "아버지의 이모티콘", text: `아버지가 메신저 이모티콘을 사고 싶다고 하셨다. 결제 화면에서 40분째 멈춰 계신다.`, choices: [
    K("차근차근 알려 드린다", "talk", 30, O("다음 날부터 하트 뿅뿅 이모티콘이 하루 서른 개씩 온다.", { mental: 4 }, { par: 2 }), O("결국 내가 사 드렸다. 그런데 배경화면이 내 증명사진으로 바뀌어 있다.", { mental: 2, cash: -1 })),
    C("그냥 선물로 보내 드린다", { cash: -1, mental: 2 }, "\"고맙다\" 대신 고맙다는 이모티콘이 왔다. 벌써 쓰신다.", { par: 1 }),
  ] }) },
  { id: "p_blind", g: true, ok: (s) => alive(s) && !married(s) && s.age >= 28 && s.age < 39 && !Object.values(s.rel).some((x) => x.lover), mk: (s) => ({ title: "엄마표 소개팅", text: `엄마: "엄마 친구 조카가 그렇게 착하대." 사진은 없고 착하다는 말만 세 번 들었다.`, choices: [
    K("일단 나가 본다", "charm", 40, O("연애까진 아니어도 말이 잘 통했다. 투잡 얘기로 두 시간이 갔다.", { mental: 5, stat: { talk: 1 } }), O("\"취미가 엑셀이세요?\" 대화가 거기서 끊겼다.", { mental: -2 })),
    C("정중히 거절한다", { mental: -1 }, "엄마는 \"알았다\" 하시고 바로 다음 후보를 찾으신다.", { par: -1 }),
  ] }) },
  { id: "p_retire", g: true, ok: (s) => alive(s) && well(s) && s.age >= 31 && s.age < 38 && s.flags.fe_p_70 === undefined, mk: (s) => ({ title: "아버지의 정년퇴직", text: `33년 다닌 회사에서 아버지가 꽃다발을 들고 오셨다. "이제 뭐 하지?" 처음 보는 표정이었다.`, choices: [
    K("내 투잡 장부 정리를 부탁드린다", "talk", 40, O("아버지가 장부를 맡으셨다. 1원도 안 틀린다. 영수증 잔소리는 덤.", { mental: 4, ap: 1 }, { par: 4 }), O("\"그건 너나 해라.\" 그래도 웃으셨다.", { mental: 1 }, { par: 1 })),
    C("등산화를 선물한다", { cash: -M(s, 30), mental: 3 }, "다음 주부터 매일 아침 산 정상 사진이 온다.", { par: 3 }),
  ] }) },
  { id: "p_surgery", g: false, ok: (s) => alive(s) && well(s) && s.age >= 40, mk: (s) => ({ title: "엄마의 무릎 수술", text: `엄마 무릎 수술 날짜가 잡혔다. 견적서와 병원 일정표가 형제 단톡방에 올라왔다.`, choices: [
    C("수술비를 대고 휴가를 낸다", { cash: -M(s, 400), eye: 4, mental: -2 }, "회복실에서 엄마가 처음 한 말. \"밥은 먹었니?\"", { par: 8, visit: 1 }),
    C("형제와 나눠 낸다", { cash: -M(s, 150), mental: -1 }, "엑셀로 정확히 나눴다. 형제가 \"역시 숫자쟁이\"라고 했다.", { par: 6 }),
    C("일단 미루시자고 한다", { mental: -4 }, "엄마는 괜찮다고 하셨다. 계단 앞에서 한참 쉬셨다.", { par: -6 }),
  ] }) },

  // ───── 배우자 ─────
  { id: "s_promo", g: true, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "배우자의 승진 소식", text: `${I(nm(s))} 퇴근길에 케이크를 들고 왔다. "나 팀장 됐어."`, choices: [
    C("오늘은 투잡 쉬고 축하 파티", { cash: M(s, 100), family: 8, aff: 5, mental: 3 }, "승진 축하금 일부가 생활비 통장에 들어왔다. 케이크는 둘이 다 먹었다."),
    C("축하 선물을 고른다", { cash: -M(s, 80), family: 6, aff: 6 }, "\"이거 비싼 거 아니야?\" 하면서 사흘째 차고 다닌다."),
    C("축하하고 바로 노트북을 연다", { family: -3, aff: -3 }, "축하는 3분, 타자 소리는 세 시간."),
  ] }) },
  { id: "s_offer", g: true, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "배우자의 이직 제안", text: `${nm(s)}에게 이직 제안이 왔다. 연봉은 오르는데 출퇴근이 왕복 세 시간이다.`, choices: [
    C("가라고 응원한다", { cash: M(s, 300), family: 3, aff: 4, ap: -1 }, "입사 축하금이 들어왔다. 대신 늦게 들어오는 날이 늘었다."),
    K("같이 표로 따져 본다", "num", 40, O("근무지 협상까지 해서 붙었다. 내 엑셀이 처음으로 집에서 쓸모 있었다.", { cash: M(s, 200), family: 5, aff: 4 }), O("\"그래서 가라는 거야, 말라는 거야?\"", { family: -2 })),
    C("지금 회사가 낫다고 말린다", { family: 1, mental: 1 }, "\"그치? 나도 그 생각이었어.\" 저녁이 평화로웠다."),
  ] }) },
  { id: "s_burnout", g: false, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "새벽 1시의 식탁", text: `새벽 1시, ${I(nm(s))} 식탁에 멍하니 앉아 있다. "나 회사 그만두고 싶어."`, choices: [
    C("다 들어 주고 휴가를 권한다", { family: 8, aff: 6, ap: -1, mental: -2 }, "새벽 세 시까지 이야기했다. 다음 날 둘 다 눈이 퉁퉁 부었다."),
    K("\"내 투잡 같이 해 볼래?\"", "charm", 40, O("주말 반나절씩 같이 일하기로 했다. 눈빛이 돌아왔다.", { family: 6, aff: 4, mental: 2, ap: 1 }), O("\"나 지금 일 얘기 하려는 거 아니야.\"", { family: -4, aff: -3 })),
    C("\"조금만 더 버텨 보자\"", { family: -6, aff: -4 }, "고개는 끄덕였다. 표정은 그대로였다."),
  ] }) },
  { id: "s_leave", g: false, ok: (s) => married(s) && !!kidIn(s, 0, 1.5) && working(s), mk: (s) => ({ who: s.fam.spouse, title: "육아휴직은 누가?", text: `어린이집 대기 87번. 둘 중 하나는 육아휴직을 써야 한다. 식탁 위에 휴직 신청서가 한 장 놓였다.`, choices: [
    C("내가 쓴다", { cash: -M(s, 300), eye: 8, family: 12, ap: 3, mental: 3 }, "휴직 6개월. 아이 낮잠 시간에 투잡 장부를 정리했다. 팀장 표정은 나중에 생각하기로."),
    C(`${nm(s)}에게 부탁한다`, { cash: -M(s, 150), family: 3, aff: 2 }, "\"대신 퇴근하면 무조건 바통 터치야.\" 계약 성립."),
    C("양가에 부탁드린다", { cash: -M(s, 60), family: -2, mental: -2 }, "용돈을 드리고 맡겼다. 아이가 할머니 말만 듣기 시작했다.", { par: -1 }),
  ] }) },
  { id: "s_help", g: true, w: (s) => (s.fam.spouseType === "동업형" ? 2.5 : 1), ok: (s) => married(s) && side(s), mk: (s) => ({ who: s.fam.spouse, title: "주말 지원군", text: `토요일 아침, ${I(nm(s))} 앞치마를 둘렀다. "오늘은 내가 같이 가 줄게. 손 하나라도 더 있으면 낫잖아."`, choices: [
    C("고맙게 받는다", { ap: 2, family: 4, aff: 4 }, "손이 하나 늘었을 뿐인데 일이 반으로 줄었다. 다음 달 행동력이 넉넉하다."),
    C("오늘은 일 말고 둘이 데이트", { family: 8, aff: 6, mental: 3 }, "투잡은 하루 쉬었다. 손잡고 걸은 게 얼마 만인지.", { famTime: 1 }),
    C("\"내가 할게, 당신은 쉬어\"", { family: 2, hp: -3 }, "혼자 일했다. 저녁에 따뜻한 국이 기다리고 있었다."),
  ] }) },
  { id: "s_bday", g: false, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "등골이 서늘한 달력", text: `달력을 보다 등골이 서늘해졌다. 어제가 ${nm(s)} 생일이었다.`, choices: [
    C("솔직히 사과하고 오늘 두 배로 챙긴다", { cash: -M(s, 60), family: -2, aff: 2 }, "\"작년에도 이랬어.\" 그래도 케이크는 맛있게 먹었다."),
    K("미리 준비한 척 연기한다", "talk", 45, O("완벽한 연기였다. 들키기 전까지는.", { family: 3, aff: 2 }), O("식당 예약 문자 날짜가 '오늘'이었다.", { family: -10, aff: -8 })),
    C("아무 일 없던 척한다", { family: -8, aff: -6 }, "일주일 동안 반찬이 김 하나였다."),
  ] }) },
  { id: "s_anniv", g: true, ok: (s) => married(s) && s.t - (s.fam.marriedT ?? s.t) >= 12, mk: (s) => ({ who: s.fam.spouse, title: "결혼기념일", text: `결혼기념일. 오랜만에 둘이 결혼식 영상을 틀었다. 화면 속 우리는 지금보다 머리숱이 많다.`, choices: [
    C("그날 그 식당에 간다", { cash: -M(s, 40), family: 8, aff: 5 }, "메뉴는 바뀌었는데 창가 자리는 그대로였다.", { famTime: 1 }),
    C("손편지를 쓴다", { family: 6, aff: 4, stat: { write: 1 } }, "세 번 고쳐 썼다. 읽다가 둘 다 웃었다. 맞춤법 하나 틀려서.", { famTime: 1 }),
    C("마감 때문에 다음 주로 미룬다", { family: -5, aff: -3 }, "\"응, 괜찮아.\" 전혀 괜찮지 않은 목소리였다."),
  ] }) },
  { id: "s_sick", g: false, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "배우자의 몸살", text: `${I(nm(s))} 몸살로 이틀째 누워 있다. 집안일${s.fam.kids.length ? "과 아이" : ""}가 전부 내 몫이 됐다.`, choices: [
    C("죽 끓이고 다 맡는다", { hp: -8, family: 6, aff: 6, ap: -1 }, "죽이 조금 탔다. \"맛있다\"는 거짓말을 들었다."),
    C("배달 죽 시키고 투잡을 한다", { cash: -M(s, 3), family: -3 }, "죽은 따뜻했다. 방 안 공기는 그렇지 않았다."),
    C(`${inlawM(s)}께 SOS`, { cash: -M(s, 20), mental: -1 }, "반찬 다섯 통과 잔소리 다섯 개가 같이 왔다."),
  ] }) },
  { id: "s_stash", g: true, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "코트 주머니의 봉투", text: `겨울 코트 주머니에서 ${nm(s)}의 비상금 봉투가 나왔다. 꽤 두툼하다.`, choices: [
    C("못 본 척 다시 넣어 둔다", { family: 2, mental: 2 }, "언젠가 이 돈이 우리를 구할 거다. 아마도."),
    K("털어놓고 같이 굴려 보자고 한다", "charm", 35, O("\"사실 같이 쓰려고 모은 거야.\" 투자 통장에 들어갔다.", { cash: M(s, 200), family: 3, aff: 2 }), O("\"그걸 왜 뒤져?\" 코트가 압수됐다.", { family: -6, aff: -4 })),
  ] }) },
  { id: "s_dish", g: false, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "설거지 전쟁", text: `싱크대에 컵이 피라미드처럼 쌓였다. "이번 주 누구 차례였지?" 둘이 동시에 서로를 가리켰다.`, choices: [
    C("식기세척기를 산다", { cash: -M(s, 80), family: 4, hp: 2 }, "부부 싸움 1위 원인을 돈으로 해결했다. 최고의 투자였다."),
    C("말없이 내가 한다", { hp: -3, family: 3 }, "고무장갑 낀 등 뒤로 \"고마워\"가 들렸다."),
    K("끝까지 따진다", "talk", 45, O("이겼다. 그런데 이긴 기분이 아니다.", { family: -1, mental: 2 }), O("작년 3월 일까지 나왔다. 졌다.", { family: -6, aff: -3 })),
  ] }) },
  { id: "s_clash", g: false, ok: (s) => married(s) && alive(s) && [1, 2, 9, 10].includes(s.cal), mk: (s) => ({ who: s.fam.spouse, title: "명절 첫날의 동선", text: `명절 첫날 어느 집부터 갈지로 집안이 둘로 갈렸다. 양쪽 어머니 모두 전을 이미 부쳐 놓으셨다.`, choices: [
    C(`올해는 ${inlaw(s)} 먼저`, { family: 6, aff: 3 }, "엄마가 전화로 \"그래, 잘했다\" 하셨다. 목소리가 반 톤 낮았다.", { par: -2 }),
    C("우리 집 먼저", { family: -6, aff: -4 }, "엄마는 신났고, 차 안은 조용했다.", { par: 2, visit: 1 }),
    C("둘 다 반나절씩 강행군", { hp: -10, family: 2 }, "고속도로에서 하루를 보냈다. 전은 두 집 치를 먹었다.", { par: 1, visit: 1 }),
  ] }) },
  { id: "s_grand", g: true, ok: (s) => married(s) && !!kidIn(s, 0.5, 7), mk: (s) => ({ title: `${inlaw(s)} 찬스`, text: `${I(inlawM(s))} 전화로 말씀하셨다. "주말엔 애 데려와라. 둘이 좀 쉬어." 신의 목소리였다.`, choices: [
    C("감사히 맡기고 투잡에 몰두한다", { ap: 2, cash: -M(s, 30), family: 2 }, "토요일이 통째로 생겼다. 용돈 봉투는 기쁘게 드렸다."),
    C("같이 가서 푹 쉬다 온다", { family: 6, hp: 6, mental: 3 }, "아이는 할머니 품, 우리는 낮잠. 천국이 따로 없다.", { famTime: 1 }),
  ] }) },
  { id: "s_inlaw", g: false, ok: (s) => married(s) && side(s), mk: (s) => ({ title: `${inlaw(s)}의 질문`, text: `${inlaw(s)} 식사 자리. "그래서 그 부업은 돈이 좀 되나?" 숟가락 소리가 일제히 멈췄다.`, choices: [
    K("숫자로 답한다", "num", 40, O("\"생각보다 잘하네.\" 갈비 한 점이 내 접시로 넘어왔다.", { family: 4, mental: 2 }), O(`숫자가 엇갈렸다. ${I(nm(s))} 테이블 밑으로 발을 툭 찼다.`, { family: -4, mental: -3 })),
    C("웃으며 넘긴다", { mental: -2 }, "\"하긴, 본업이 중요하지.\" 소화가 잘 안 됐다."),
    C(`${nm(s)}에게 눈빛 SOS`, { family: s.fam.spouseType === "응원형" ? 4 : -1, mental: s.fam.spouseType === "응원형" ? 3 : -2 }, s.fam.spouseType === "응원형" ? "\"이 사람 진짜 열심히 해요.\" 어깨가 펴졌다." : "\"저도 잘 몰라요.\" 응원은 기대하지 말자."),
  ] }) },
  { id: "s_proud", g: true, ok: (s) => married(s) && (s.lastSide ?? 0) >= 50, mk: (s) => ({ who: s.fam.spouse, title: "배우자의 자랑", text: `${nm(s)} 회사 동료들이 내 투잡 얘기를 다 안다. 회식 때마다 ${I(nm(s))} 자랑을 한다고 한다.`, choices: [
    C("쑥스럽지만 기분이 좋다", { mental: 6, family: 3, item: "m_ring" }, "\"우리 집 사장님\"이라는 별명이 생겼다."),
    C("동료들에게 간식을 보낸다", { cash: -M(s, 20), family: 5, aff: 4 }, "그 팀에 내 팬클럽이 생겼다."),
  ] }) },
  { id: "s_car", g: false, ok: married, mk: (s) => ({ who: s.fam.spouse, title: "주차장 기둥", text: `${I(nm(s))} 주차장 기둥에 차를 긁었다. 견적 180만 원. "기둥이 갑자기 튀어나왔어."`, choices: [
    C("보험으로 처리한다", { cash: -M(s, 40), family: 2 }, "할증은 붙었지만 얼굴은 폈다."),
    C("자비로 고치고 웃어 준다", { cash: -M(s, 180), family: 5, aff: 4 }, "\"기둥이 잘못했네.\" 오늘 최고의 대사였다."),
    C("잔소리 딱 한 번만", { family: -5, aff: -4 }, "딱 한 번이 세 번이 됐다."),
  ] }) },

  // ───── 아이 ─────
  { id: "k_walk", g: true, w: 3, ok: (s) => !!kidIn(s, 0.8, 1.6), mk: (s) => { const k = kidIn(s, 0.8, 1.6); return { title: "첫걸음", text: `${kidIs(k)} 소파를 짚고 일어나 한 걸음, 두 걸음. 세 번째 걸음에 내 품으로 쏟아졌다.`, choices: [
    C("영상 찍어 가족 단톡방에", { mental: 8, family: 6, shard: 1 }, "양가 할머니 할아버지 답장이 1분 만에 40개.", { famTime: 1, par: 1 }),
    C("노트북을 덮고 같이 걷는다", { mental: 6, family: 8, item: "m_kid" }, "거실을 스무 바퀴 돌았다. 오늘 투잡은 없다. 후회도 없다.", { famTime: 1 }),
  ] }; } },
  { id: "k_word", g: true, w: 3, ok: (s) => married(s) && !!kidIn(s, 0.8, 1.8), mk: (s) => { const k = kidIn(s, 0.8, 1.8); return { who: s.fam.spouse, title: "첫마디", text: `${kidI(k)}의 첫마디는 "${meCall(s)}"…가 아니라 "${spCall(s)}"였다. ${I(nm(s))} 의기양양하다.`, choices: [
    C("질투 대신 특훈 돌입", { family: 5, mental: 4, hp: -2 }, `사흘 만에 "${meCall(s)}"를 들었다. 출근길 내내 광대가 내려오지 않았다.`, { famTime: 1 }),
    C("깨끗이 승복한다", { family: 3, mental: 3, aff: 3 }, `다음 날 "${meCall(s)}"도 나왔다. 사실 아무나 보고 다 그렇게 부른다.`),
  ] }; } },
  { id: "k_fever", g: false, ok: (s) => !!kidIn(s, 0, 7), mk: (s) => { const k = kidIn(s, 0, 7); return { title: "아이가 아픈 밤", text: `새벽 2시, ${kidI(k)} 이마가 뜨겁다. 체온계 숫자는 39.5.`, choices: [
    C("응급실로 달린다", { hp: -8, cash: -M(s, 15), mental: -3, family: 6, ap: -1 }, "새벽 5시에 열이 내렸다. 출근은 했다. 정신은 응급실에 두고 왔다."),
    K("해열제 먹이고 밤새 곁을 지킨다", "body", 40, O(`아침에 ${kidIs(k)} 웃었다. 나는 좀비가 됐다.`, { hp: -6, family: 4 }), O("결국 아침에 소아과 오픈런. 대기 번호 31번.", { hp: -10, cash: -M(s, 10), mental: -5 })),
  ] }; } },
  { id: "k_daycare", g: false, ok: (s) => !!kidIn(s, 1.5, 4), mk: (s) => { const k = kidIn(s, 1.5, 4); return { title: "첫 등원", text: `어린이집 첫날. ${kidIs(k)} 문 앞에서 대성통곡을 한다. 나도 같이 울 뻔했다.`, choices: [
    C("일주일 적응 기간을 같이 다닌다", { eye: 5, family: 6, ap: -1 }, "닷새째, 손을 흔들고 들어갔다. 서운한 건 나였다.", { famTime: 1 }),
    C("선생님께 맡기고 출근한다", { mental: -4, family: -2 }, "회의 내내 그 울음소리가 귀에서 맴돌았다. 하원할 땐 신나서 뛰어나왔다."),
  ] }; } },
  { id: "k_sports", g: true, ok: (s) => !!kidIn(s, 5, 12) && [5, 9, 10].includes(s.cal), mk: (s) => { const k = kidIn(s, 5, 12); return { title: "운동회", text: `운동회 학부모 계주. ${kidIs(k)} 소리쳤다. "${meCall(s)} 1등 해!" 다리가 벌써 후들거린다.`, choices: [
    K("전력 질주", "body", 45, O(`1등. ${kidIs(k)} 반 친구들한테 3주 동안 자랑했다.`, { mental: 8, family: 8, shard: 1 }, { famTime: 1 }), O(`넘어졌다. 그래도 ${kidIs(k)} 제일 크게 박수를 쳤다.`, { hp: -6, family: 5, mental: 2 }, { famTime: 1 })),
    C("사진 담당을 자처한다", { family: 4, mental: 2 }, "사진 400장. 그중 초점 맞은 게 12장.", { famTime: 1 }),
  ] }; } },
  { id: "k_school", g: true, w: 3, ok: (s) => !!kidIn(s, 6.5, 7.8), mk: (s) => { const k = kidIn(s, 6.5, 7.8); return { title: "초등학교 입학", text: `${kidI(k)} 책가방이 몸보다 크다. 입학식 날, 반 배정표 앞에서 작은 손을 꼭 잡았다.`, choices: [
    C("휴가 내고 입학식에 간다", { cash: -M(s, 40), eye: 3, family: 8, mental: 5, shard: 1 }, "교문 앞 사진 한 장. 올해 가장 잘 쓴 휴가.", { famTime: 1 }),
    C("사진만 받는다", { family: -4, mental: -3 }, "사진 속 빈자리가 유난히 크게 보였다."),
  ] }; } },
  { id: "k_academy", g: false, ok: (s) => !!kidIn(s, 8, 15), mk: (s) => { const k = kidIn(s, 8, 15); return { title: "학원 견적서", text: `${kidI(k)} 반 친구들은 학원을 다섯 개씩 다닌단다. 상담실장이 웃으며 견적서를 내밀었다.`, choices: [
    C("꼭 필요한 두 개만", { cash: -M(s, 150), family: 2 }, "영어와 수영. 나머지는 놀이터에서 배우기로."),
    C("다섯 개 풀코스", { cash: -M(s, 400), family: -2, mental: -3 }, "아이 얼굴은 학원 셔틀 창문으로만 본다."),
    K("주말엔 내가 가르친다", "talk", 45, O("토요일 오전은 수학 시간. 의외로 둘 다 재밌다.", { family: 6, ap: -1, stat: { talk: 1 } }, { famTime: 1 }), O("15분 만에 둘 다 울었다. 학원은 위대하다.", { family: -4, mental: -4, cash: -M(s, 100) })),
  ] }; } },
  { id: "k_teen", g: false, ok: (s) => !!kidIn(s, 12, 17), mk: (s) => { const k = kidIn(s, 12, 17); return { title: "닫힌 방문", text: `${kidI(k)} 방문이 쾅 닫혔다. 오늘 나눈 대화는 "어." "아니." "몰라." 세 마디가 전부다.`, choices: [
    C("문 앞에 간식을 두고 기다린다", { family: 4, mental: -2 }, "사흘 뒤 문틈으로 쪽지가 나왔다. \"고마워 (진짜 조금)\""),
    K("같이 게임 하자고 한다", "sense", 40, O("랭크 게임에서 내가 발목을 잡았다. 그래도 둘이 웃었다.", { family: 8 }, { famTime: 1 }), O(`"${meCall(s)}, 그거 아니야." 문이 다시 닫혔다.`, { family: -3 })),
    C("버릇없다고 혼낸다", { family: -8, mental: -4 }, "방문 너머로 음악 소리만 커졌다."),
  ] }; } },
  { id: "k_dream", g: true, ok: (s) => !!kidIn(s, 7, 12) && side(s), mk: (s) => { const k = kidIn(s, 7, 12); return { title: "장래희망", text: `${kidI(k)} 장래희망 숙제. "${meCall(s)}처럼 퇴근하고 또 일하는 사람." 선생님 메모: "부모님과 상담 바랍니다."`, choices: [
    C("웃으며 꿈 얘기를 나눈다", { family: 6, mental: 5, item: "m_kid" }, "\"그럼 나는 사장 할래. 퇴근은 안 할래.\" 이미 나보다 낫다.", { famTime: 1 }),
    C("투잡을 조금 줄여 본다", { ap: -1, family: 8, mental: 2 }, "다음 달 저녁 몇 번은 아이 숙제 담당이다.", { famTime: 1 }),
  ] }; } },
  { id: "k_call", g: false, ok: (s) => !!kidIn(s, 8, 14), mk: (s) => { const k = kidIn(s, 8, 14); return { title: "학교에서 온 전화", text: `담임 선생님 전화. "${kidIs(k)} 친구랑 다퉜어요. 오늘 상담 오실 수 있을까요?" 오후 세 시, 회의가 두 개다.`, choices: [
    C("반차 내고 학교로 간다", { eye: 5, family: 6 }, "교무실 앞 복도에서 아이 손을 잡았다. 회의는 다음 주로 밀렸다.", { famTime: 1 }),
    K("저녁에 아이 얘기를 먼저 듣는다", "talk", 40, O("친구를 지키다 생긴 일이었다. 몰래 뿌듯했다.", { family: 5, mental: 2 }), O(`"${meCall(s)}는 내 편 아니잖아." 방문이 닫혔다.`, { family: -3, mental: -2 })),
    C("선생님과 전화로만 이야기한다", { family: -4 }, "일은 마무리됐다. 아이와의 일은 마무리되지 않았다."),
  ] }; } },
  { id: "k_exam", g: true, w: 3, ok: (s) => !!kidIn(s, 17.5, 19.5), mk: (s) => { const k = kidIn(s, 17.5, 19.5); return { title: "수능 날", text: `${kidI(k)} 수능 날. 교문 앞에서 찹쌀떡 대신 따뜻한 손난로를 쥐여 줬다.`, choices: [
    C("휴가 내고 교문 앞에서 기다린다", { eye: 2, family: 10, mental: 3 }, "해 질 녘 교문이 열렸다. 결과는 몰라도 얼굴은 밝았다.", { famTime: 1 }),
    C("회사에서 마음으로 응원한다", { family: 2, mental: -2 }, "하루 종일 시계만 봤다. 일은 하나도 안 됐다."),
  ] }; } },
  { id: "k_allow", g: true, ok: (s) => !!kidIn(s, 9, 14), mk: (s) => { const k = kidIn(s, 9, 14); return { title: "용돈 인상 제안서", text: `${kidIs(k)} A4 한 장을 내밀었다. 제목은 '용돈 인상 제안서'. 근거 자료에 물가 그래프까지 있다.`, choices: [
    C("제안을 수락한다", { cash: -M(s, 10), family: 5, mental: 4 }, "DNA는 정직하다. 보고서 형식이 내 것과 똑같다."),
    K("역제안을 한다", "talk", 40, O("심부름 수당제로 합의했다. 협상이 생각보다 길었다.", { family: 4, stat: { talk: 1 } }), O("\"그럼 할머니한테 갈게.\" 협상 결렬.", { family: -2 })),
  ] }; } },
  { id: "k_staff", g: true, ok: (s) => !!kidIn(s, 10, 17) && side(s), mk: (s) => { const k = kidIn(s, 10, 17); return { title: "꼬마 직원", text: `${kidIs(k)} 내 투잡 홍보 영상을 만들어 왔다. 편집 실력이 나보다 낫다. 자막 폰트까지 골랐다.`, choices: [
    C("정식 알바비를 준다", { cash: -M(s, 20), family: 6, ap: 1, stat: { mkt: 1 } }, "\"계약서 써 줘.\" 첫 직원이 생겼다."),
    C("크게 칭찬만 한다", { family: 4, mental: 4 }, "\"다음엔 돈 받을 거야.\" 경고를 들었다."),
  ] }; } },
  { id: "k_jealous", g: false, w: 3, ok: (s) => s.fam.kids.length >= 2 && kAge(s, s.fam.kids[s.fam.kids.length - 1]) < 1.5 && kAge(s, s.fam.kids[0]) < 10, mk: (s) => { const k = s.fam.kids[0]; return { title: "첫째의 질투", text: `${kidIs(k)} 동생 기저귀를 소파 밑에 숨겼다. "나는 이제 안 귀여워?"`, choices: [
    C("첫째와 단둘이 데이트", { cash: -M(s, 10), family: 6, ap: -1 }, "아이스크림 두 스쿱. \"동생은 이거 못 먹지?\" 표정이 풀렸다.", { famTime: 1 }),
    C("\"동생이 아기라서 그래\"", { family: -6, mental: -3 }, "말은 맞는데, 그게 정답은 아니었다."),
  ] }; } },
  { id: "k_award", g: true, ok: (s) => !!kidIn(s, 8, 13), mk: (s) => { const k = kidIn(s, 8, 13); return { title: "꾸준상", text: `냉장고에 상장이 붙었다. '꾸준상'. ${kidIs(k)} 1년 동안 한 번도 지각을 안 했단다. 꾸준함은 집안 내력이다.`, choices: [
    C("치킨 파티", { cash: -M(s, 3), family: 6, mental: 4 }, "다리 하나는 상 받은 사람 몫, 하나는 상 받은 사람 몫.", { famTime: 1 }),
    C("상장 액자를 맞춘다", { cash: -M(s, 5), family: 4, mental: 3 }, "거실 한가운데 걸었다. 손님이 오면 꼭 그 앞에서 멈춘다."),
  ] }; } },
  { id: "k_lost", g: false, ok: (s) => !!kidIn(s, 3, 8), mk: (s) => { const k = kidIn(s, 3, 8); return { title: "심장이 멎은 10분", text: `놀이공원 퍼레이드. 손을 잠깐 놓은 사이 ${kidIs(k)} 사라졌다.`, choices: [
    C("바로 안내 방송을 요청한다", { mental: -6, family: 3 }, "회전목마 앞에서 솜사탕을 들고 있었다. 우는 건 나뿐이었다.", { famTime: 1 }),
    C("미친 듯이 뛰어다닌다", { hp: -8, mental: -4, family: 3 }, "화장실 앞에서 찾았다. \"왜 뛰어?\" 아이는 태연했다.", { famTime: 1 }),
  ] }; } },
];
export const FAM_EVENTS = EVS.map((e) => ({ id: e.id, good: e.g })); // 점검용 목록

// 한 달에 한 번 부른다
export function famMonth(s, r, scenes, notes) {
  void notes;
  if (s.over || s.ended) return;
  if (s.t - (s.flags.famEvT ?? -99) < GAP) return;
  if (scenes.length >= 3) return; // 이번 달 장면이 이미 많다
  if (scenes.some((x) => x && (x.onChoose === "baby" || x.onChoose === "fam_oppose" || x.kind === "wedding" || x.title === "아이가 태어났다" || x.title === "이혼"))) return;
  if (!r.chance(married(s) ? P_MARRIED : P_SINGLE)) return;
  const L = EVS.filter((e) => s.flags["fe_" + e.id] === undefined && !(e.id[0] === "k" && !married(s)) && e.ok(s)); // 11-23 이혼 뒤(아이는 따로 산다)에는 같이 사는 아이 장면을 띄우지 않는다
  if (!L.length) return;
  const lastG = s.flags.famLastG; // 좋은 일·나쁜 일이 번갈아 나오기 쉽게
  const pairs = L.map((e) => { let w = typeof e.w === "function" ? e.w(s) : e.w ?? 1; if (lastG !== undefined && e.g !== !!lastG) w *= 1.6; if (married(s) && e.id[0] === "p") w *= 0.7; return [e, w]; });
  const e = r.weighted(pairs);
  let sc; try { sc = e.mk(s, r); } catch (err) { console.warn("[가족 이벤트]", e.id, err); return; }
  if (!sc) return;
  s.flags["fe_" + e.id] = s.t; s.flags.famEvT = s.t; s.flags.famLastG = e.g ? 1 : 0; s.flags.famEvN = (s.flags.famEvN || 0) + 1;
  scenes.push({ kind: "event", tag: "가족", id: "fam_" + e.id, onChoose: "fam_x", ...sc });
}

// 선택 뒤 추가 효과(부모님 건강·부모님 뵘·가족과 보낸 달)
export const FAM_CHOOSE = {
  fam_x(s, r, i, okv) {
    const ch = s.pending?.choices?.[i]; if (!ch) return [];
    const x = ch.check ? (okv ? ch.ok?.x : ch.ng?.x) : ch.x; if (!x) return [];
    const out = [];
    if (x.par && s.fam.parents > 0) { const b = s.fam.parents; s.fam.parents = clamp(b + x.par, 1, 100); const d = Math.round(s.fam.parents - b); if (d) out.push(`부모님 건강 ${d > 0 ? "+" : ""}${d}`); }
    if (x.visit && s.fam.parents > 0) { s.fam.lastVisit = s.t; out.push("부모님을 뵀다"); }
    if (x.famTime) { s.flags.familyThisMonth = s.t; if (s.fam.kids.length) out.push("가족과 보낸 달(아이 보며 힘내기 +1)"); }
    return out;
  },
};
