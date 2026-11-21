// 연애·결혼 19금 이벤트(v4.25). 말과 표정까지만, 장면은 암전으로 넘긴다.
// core.js peopleMonth 에서 매달 flirtMonth(s, r, scenes) 를 부른다. 효과는 선택지 eff 만 쓴다(aff 는 sc.who 에게).
// 한 판에 같은 이벤트는 한 번(s.flags["fl_<id>"]), 최소 4달 간격, 이번 달 다른 사건이 있으면 쉰다.
import { CHAR, jo } from "./core.js";

const nm = (id) => CHAR[id]?.name || "그 사람";
const GAP = 4;

// [id, 대상("lover"|"spouse"|"both"), 조건, 제목, 표정, 본문, 선택지]
const EV = [
  ["lastbus", "lover", null, "막차를 놓친 척", "blush", (n) => `"어? 막차 끊겼다." ${n}의 휴대폰 화면엔 버스 도착 3분 전이 떠 있었다. 모른 척해 주기로 했다.`,
    [{ t: "\"우리 집 가서 라면 먹을래?\"", eff: { aff: 6, mental: 5 }, text: "라면은 끝내 끓이지 않았다." }, { t: "택시를 잡아 준다", eff: { aff: -2, mental: 1 }, text: "창문 너머로 입 모양이 보였다. \"바·보.\"" }]],
  ["shirt", "lover", null, "내 셔츠", "blush", (n) => `아침, 부엌에 내 셔츠만 걸친 ${jo(n, "이", "가")} 서 있었다. "이거 원래 내 거였던 것 같은데?"`,
    [{ t: "\"잘 어울리니까 너 해.\"", eff: { aff: 5, mental: 4 }, text: "출근 시간이 20분 밀렸다. 지각은 아니었다. 아슬아슬하게." }, { t: "\"세탁은 네가 해.\"", eff: { aff: 1 }, text: "셔츠가 얼굴로 날아왔다." }]],
  ["dark", "lover", null, "정전", "surprised", (n) => `${n}의 집에서 영화를 보는데 아파트 전체가 정전됐다. 어둠 속에서 목소리만 들린다. "…무서우면 이리 와."`,
    [{ t: "\"누가 무섭대.\" 그래도 간다", eff: { aff: 7, mental: 5 }, text: "불이 다시 들어왔을 때, 둘 다 영화 내용을 하나도 몰랐다." }, { t: "휴대폰 손전등을 켠다", eff: { aff: -1 }, text: "\"…분위기 진짜 모르네.\"" }]],
  ["sleepover", "lover", null, "\"자고 갈래?\"", "blush", (n) => `현관 앞에서 신발을 신는데 ${jo(n, "이", "가")} 소매를 잡았다. "칫솔 하나 남는데."`,
    [{ t: "신발을 다시 벗는다", eff: { aff: 8, mental: 6, hp: -4 }, text: "칫솔은 결국 두 개가 나란히 꽂혔다." }, { t: "\"내일 7시 회의라…\"", eff: { aff: -3 }, text: "\"…그래, 회의 잘해.\" 문이 생각보다 세게 닫혔다." }]],
  ["mirror", "lover", null, "거울 앞에서", "smile", (n) => `옷을 고르던 ${jo(n, "이", "가")} 거울 너머로 나를 봤다. "이거 입을까, 아니면… 그냥 안 나갈까?"`,
    [{ t: "\"예약 취소할게.\"", eff: { aff: 6, mental: 5, cash: -3 }, text: "레스토랑 노쇼 위약금 3만 원. 아깝지 않았다." }, { t: "\"입어. 예약했잖아.\"", eff: { aff: 2, mental: 2 }, text: "밥은 맛있었다. 돌아오는 길이 더 길었다." }]],
  ["trip_room", "lover", null, "방이 하나 남았대요", "surprised", (n) => `여행지 숙소 직원이 미안한 얼굴로 말했다. "트윈이 다 차서 더블룸 하나만…" ${jo(n, "이", "가")} 고개를 돌려 웃음을 참았다.`,
    [{ t: "\"괜찮아요, 그걸로 주세요.\"", eff: { aff: 7, mental: 5 }, text: "\"너 일부러 늦게 예약했지?\" \"…응.\"" }, { t: "\"다른 숙소 찾아볼게요.\"", eff: { aff: -4, mental: -2 }, text: "비 오는 밤길을 40분 걸었다. 둘 다 말이 없었다." }]],

  ["kidsleep", "spouse", (s) => s.fam.kids.length > 0, "아이가 잠든 밤 10시", "blush", (n) => `"애 잔다." ${jo(n, "이", "가")} 속삭였다. 노트북에는 투잡 정산표가 열려 있다. 시계는 10시 정각.`,
    [{ t: "노트북을 덮는다", eff: { family: 8, mental: 6, aff: 5, item: "m_ring" }, text: "정산은 내일 해도 된다. 오늘은 아니다." }, { t: "\"30분만, 이것만 끝내고.\"", eff: { family: -5 }, text: "30분 뒤 안방엔 코 고는 소리만 남았다." }]],
  ["anniv_night", "spouse", (s) => s.t - (s.fam.marriedT ?? s.t) >= 12, "기념일 밤의 와인", "blush", (n) => `결혼기념일, 아이 없이 둘이서만 와인 한 병. ${jo(n, "이", "가")} 잔을 부딪치며 말했다. "오늘은 휴대폰 금지. 알지?"`,
    [{ t: "휴대폰을 서랍에 넣는다", eff: { family: 10, mental: 6, aff: 6, cash: -15 }, text: "다음 날 아침, 서랍 속 휴대폰에 부재중 0통. 세상은 멀쩡했다." }, { t: "알림만 한 번 확인한다", eff: { family: -4 }, text: "\"…방금 그거 확인했지?\" 잔이 내려갔다." }]],
  ["shower", "spouse", null, "샤워실 문틈", "smile", (n) => `씻으려는데 ${jo(n, "이", "가")} 문틈으로 고개를 내밀었다. "물 아껴야지. 요즘 관리비 장난 아니던데."`,
    [{ t: "\"…절약 정신 인정.\"", eff: { family: 7, mental: 5, aff: 4 }, text: "그달 수도요금은 오히려 더 나왔다." }, { t: "\"나 진짜 피곤해.\"", eff: { family: -3, hp: 3 }, text: "\"알았어, 푹 쉬어.\" 서운한 목소리였다." }]],
  ["after_kid", "spouse", (s) => s.fam.kids.some((k) => s.t - k.born < 24), "우리 아직 그거 맞아?", "sad", (n) => `새벽 수유를 마친 ${jo(n, "이", "가")} 물었다. "우리 언제부터 손도 안 잡고 잤지? 부부 말고 육아 동료 같아."`,
    [{ t: "말없이 손을 잡고 눕는다", eff: { family: 9, mental: 4, aff: 5 }, text: "아기가 깨기 전까지 40분. 충분했다." }, { t: "\"애 좀 크면…\"", eff: { family: -6, aff: -3 }, text: "\"그 말, 작년에도 했어.\"" }]],
  ["weekend_hotel", "spouse", (s) => s.fam.kids.length > 0 && s.fam.parents > 0, "부모님 찬스", "blush", (n) => `부모님이 아이를 1박 2일 봐 주신단다. ${jo(n, "이", "가")} 이미 호텔 예약 화면을 띄워 놓고 있었다. "자는 거 말고, 다른 거 하러 가는 거야."`,
    [{ t: "\"…자는 것도 좀 하자.\"", eff: { family: 12, mental: 8, aff: 6, cash: -25, shard: 1 }, text: "체크아웃 시간을 두 번 연장했다." }, { t: "\"그 돈이면 투잡 광고비…\"", eff: { family: -8 }, text: "예약 화면이 조용히 꺼졌다." }]],
  ["backhug", "spouse", null, "설거지하는 뒷모습", "smile", (n) => `설거지하는 ${n}의 뒷모습이 오늘따라 낯설게 예뻐 보였다.`,
    [{ t: "뒤에서 안아 준다", eff: { family: 6, mental: 4, aff: 4 }, text: "\"고무장갑 꼈거든?\" 그래도 장갑을 벗었다." }, { t: "옆에서 그릇을 같이 헹군다", eff: { family: 4 }, text: "말은 없었지만 어깨가 자꾸 부딪혔다." }]],
  ["text_slip", "both", null, "보낸 메시지 취소 불가", "surprised", (n) => `회의 중에 ${n}에게서 메시지가 왔다. "오늘 밤 일찍 와. 이유는 묻지 말고 ;)" 하필 화면 공유 중이었다.`,
    [{ t: "태연하게 창을 넘긴다", check: { stat: "talk", dc: 40 }, ok: { text: "팀장님은 못 본 척해 줬다. 아마도.", eff: { aff: 4, mental: 3 } }, ng: { text: "누군가 \"오~\" 했다. 그날 별명이 생겼다.", eff: { aff: 4, mental: -3 } } }, { t: "\"제 동생입니다\"", eff: { mental: -2 }, text: "아무도 믿지 않았다." }]],
  ["massage", "both", null, "어깨 좀 주물러 줄래?", "blush", (n) => `"요즘 너무 뭉쳤어." ${jo(n, "이", "가")} 등을 돌리고 앉았다. "아래로… 조금만 더 아래."`,
    [{ t: "\"유료입니다.\"", eff: { aff: 5, mental: 4 }, text: "요금은 다른 방식으로 받았다." }, { t: "정직하게 어깨만 주무른다", eff: { aff: 2, hp: 2 }, text: "\"…진짜 어깨만 하네.\" 웃음이 터졌다." }]],
];

export function flirtMonth(s, r, scenes) {
  if (scenes.some((x) => x.kind === "event") || s.t - (s.flags.flT ?? -99) < GAP) return;
  const sp = s.fam.spouse;
  const lovers = Object.entries(s.rel).filter(([id, x]) => x.lover && !x.spouse && CHAR[id]).map(([id]) => id);
  if (!sp && !lovers.length) return;
  if (!r.chance(0.09)) return;
  const pool = EV.filter(([id, who, ok]) => !s.flags["fl_" + id] && (!ok || ok(s)) && (who === "both" || (who === "spouse" ? !!sp : lovers.length > 0)) && (who !== "both" || sp || lovers.length));
  if (!pool.length) return;
  const e = r.pick(pool);
  const [id, who, , title, expr, text, choices] = e;
  const target = who === "spouse" ? sp : who === "lover" ? r.pick(lovers) : (sp || r.pick(lovers));
  s.flags["fl_" + id] = s.t; s.flags.flT = s.t;
  scenes.push({ kind: "event", tag: "19금", who: target, expr, title, text: text(nm(target)), choices });
}
