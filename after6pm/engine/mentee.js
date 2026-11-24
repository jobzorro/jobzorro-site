// 컨설팅 제자(v4.25). 합격시킨 손님 중 호감 높은 사람이 가끔 '특별한 제자'가 된다.
// 제자는 도움이 되기도(정보·소개·후기·조력), 그냥 흘러가기도, 드물게 연애로 이어지기도 한다.
// core.js peopleMonth 에서 매달 menteeMonth(s, r, scenes) 를 부른다. onChoose 는 "mt_" 로 시작. 많이 나오지 않게: 8달 간격, 월 4%.
import { CHAR, jo, heartOpen } from "./core.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const nm = (id) => CHAR[id]?.name || "제자";
const GAP = 8, P = 0.06;

// 특별한 제자가 된 뒤 나오는 이야기: [id, 좋음/나쁨, 조건, 제목, 본문, 선택지]
const STORIES = [
  ["intel", "good", null, "제자가 보낸 내부 사정", (n) => `${n}: "선생님, 저희 회사 하반기 공채 면접 질문 방향이 바뀌었대요. 인사팀 동기한테 들었어요. 다른 친구들한테 도움 되시면 쓰세요!"`,
    [{ t: "고맙다고 하고 첨삭 자료에 반영한다", eff: { aff: 4 }, text: "그 시즌 합격률이 눈에 띄게 올랐다." }, { t: "\"회사 정보는 조심하자\"고 돌려보낸다", eff: { aff: -2, mental: 2 }, text: "\"역시 선생님…\" 존경이 한 칸 더 쌓였다." }]],
  ["refer", "good", null, "\"제 동기도 받아 주세요\"", (n) => `${jo(n, "이", "가")} 단톡방 캡처를 보냈다. "선생님 얘기했더니 동기 셋이 연락처 달래요 ㅎㅎ"`,
    [{ t: "\"다 보내!\"", eff: { aff: 3 }, text: "다음 달 문의가 부쩍 늘었다." }, { t: "\"이번 달은 꽉 찼어, 다음에\"", eff: { mental: 1 }, text: "\"넵! 예약해 둘게요.\"" }]],
  ["review", "good", null, "장문의 후기", (n) => `크멍에 2,000자짜리 후기가 올라왔다. 작성자 ${n}. "자소서가 아니라 저를 고쳐 주셨어요." 댓글에 문의가 줄줄이 달린다.`,
    [{ t: "고맙다고 따로 밥을 산다", eff: { aff: 6, cash: -6, shard: 1 }, text: "\"이번엔 제가 살게요!\" 결국 반반 냈다." }, { t: "답글로만 감사 인사", eff: { aff: 2 }, text: "깔끔한 마무리." }]],
  ["helper", "good", null, "\"저도 돕고 싶어요\"", (n) => `${n}: "입사하고 보니 첨삭 보조할 사람 필요하시죠? 주말에 서류 정리라도 할게요. 돈은… 조금만 주세요 ㅎㅎ"`,
    [{ t: "\"같이 하자\"", eff: { aff: 5, flag: "helper_ok" }, text: "제자가 동료가 됐다." }, { t: "\"회사 적응이 먼저야\"", eff: { aff: 1 }, text: "\"…네, 그래도 필요하면 꼭 불러 주세요.\"" }]],
  ["drift", "bad", null, "읽지 않은 메시지", (n) => `명절 인사를 보냈는데 3일째 '1'이 사라지지 않는다. ${n}의 프로필 사진이 낯선 회사 로고로 바뀌어 있었다.`,
    [{ t: "그냥 둔다. 잘 지내겠지", eff: { mental: -2 }, text: "제자는 그렇게 흘러간다. 그래야 맞는 거겠지." }, { t: "한 번 더 연락한다", check: { stat: "charm", dc: 40 }, ok: { text: "\"선생님! 정신이 없어서… 다음 주 밥 어때요?\"", eff: { aff: 6 } }, ng: { text: "다음 날 '읽음' 표시만 떴다.", eff: { aff: -8, mental: -3 } } }]],
  ["quit", "bad", null, "\"저 퇴사했어요\"", (n) => `${n}: "선생님… 저 3개월 만에 그만뒀어요. 선생님이 붙여 주신 회사인데 죄송해요." 수습 기간을 못 버텼단다.`,
    [{ t: "\"선퇴사 금지랬지!\" 다시 같이 준비한다", eff: { aff: 6, mental: -3 }, text: "이번엔 환승 이직으로. 무료로 봐 주기로 했다." }, { t: "\"네 인생이야, 응원해\"", eff: { aff: 2 }, text: "통화가 길어졌다. 마음은 조금 무거웠다." }]],
  ["rumor", "bad", null, "\"선생님 그 사람이랑…?\"", (n) => `취준 커뮤니티에 글이 올라왔다. "그 컨설턴트, 제자들이랑 사적으로 엄청 친하던데 공정한가요?" ${n}과(와) 찍은 사진이 캡처돼 있다.`,
    [{ t: "공지로 원칙을 밝힌다", check: { stat: "write", dc: 45 }, ok: { text: "\"합격 후 친해지는 건 자연스러운 일\"이라는 댓글이 더 많았다.", eff: { mental: -2 } }, ng: { text: "해명이 해명을 불렀다. 문의가 잠시 끊겼다.", eff: { mental: -6, cash: -20 } } }, { t: "조용히 넘긴다", eff: { mental: -4 }, text: "글은 일주일 만에 묻혔다. 대신 사진은 내렸다." }]],
];
// 연애: 드물게. 미혼·연인 없음·연애 가능 상대일 때만
const LOVE = ["love", "special", null, "합격 1년, 사석에서", (n) => `합격 1주년이라며 ${jo(n, "이", "가")} 저녁을 샀다. 2차 카페에서 한참 말이 없더니. "저 이제 선생님 제자 아니잖아요. …그냥 이름으로 불러도 돼요?"`,
  [{ t: "\"…그래, 그럼 나도.\"", eff: { aff: 10, flag: "lover" }, text: "그날 이후 연락처 이름을 바꿨다. 컨설팅 쪽에 알려지면 말이 나올 수도 있다." }, { t: "\"넌 영원히 내 제자야\" 선을 긋는다", eff: { aff: -6, mental: 2 }, text: "\"…역시 그럴 줄 알았어요.\" 웃었지만 눈이 빨갰다." }]];

export function menteeMonth(s, r, scenes) {
  if (!s.cs?.open && !(s.sj?.active || []).includes("cs")) return;
  if (scenes.some((x) => x.kind === "event") || s.t - (s.flags.mtT ?? -99) < GAP || !r.chance(P)) return;
  const rel = s.rel;
  // 1) 이미 특별한 제자가 있으면 그 이야기
  const ms = Object.keys(rel).filter((id) => rel[id].mentee && CHAR[id]);
  const single = !s.fam.spouse && !Object.values(rel).some((x) => x.lover);
  const cands = [];
  for (const id of ms) {
    const done = rel[id].mtDone || [];
    for (const st of STORIES) if (!done.includes(st[0])) cands.push([id, st]);
    if (single && !done.includes("love") && s.t - (rel[id].menteeT ?? s.t) >= 10 && heartOpen(s, id) && rel[id].aff >= 55) cands.push([id, LOVE], [id, LOVE]); // 11-24 ◆인 회사 사람은 빠진다
  }
  // 2) 아직 제자가 아닌 합격 손님(호감 40 이상)은 '특별한 제자'가 될 기회
  const fresh = Object.keys(rel).filter((id) => rel[id].client && !rel[id].mentee && !rel[id].mtNo && rel[id].aff >= 40 && CHAR[id] && !rel[id].spouse);
  if (fresh.length && (ms.length < 3) && (!cands.length || r.chance(0.4))) {
    const id = r.pick(fresh); s.flags.mtT = s.t;
    const c = CHAR[id];
    scenes.push({ kind: "event", who: id, expr: "smile", tag: "컨설팅 제자", title: `합격 턱 · ${c.name}`, text: `${jo(c.name, "이", "가")} 합격 턱을 내겠다며 연락해 왔다. "${c.customer?.line ? "선생님 덕분이에요. 처음 상담 때 제가 했던 말 기억하세요?" : "선생님 덕분이에요!"}" 이번 한 번으로 끝날 인연일 수도, 오래갈 인연일 수도 있다.`, onChoose: "mt_new",
      choices: [{ t: "흔쾌히 나간다. 오래 보자", eff: { aff: 8, mental: 3, item: "m_pass" }, text: "고기는 제자가, 커피는 내가 샀다. 특별한 제자가 생겼다." }, { t: "축하만 하고 정중히 사양", eff: { mental: 1 }, text: "\"합격이 제일 큰 선물이야.\" 깔끔하게 끝냈다." }] });
    return;
  }
  if (!cands.length) return;
  const [id, st] = r.pick(cands); s.flags.mtT = s.t;
  (rel[id].mtDone = rel[id].mtDone || []).push(st[0]);
  const sc = { kind: "event", who: id, expr: st[1] === "bad" ? "sad" : st[0] === "love" ? "blush" : "smile", tag: st[0] === "love" ? "19금" : "컨설팅 제자", title: st[3], text: st[4](nm(id)), onChoose: "mt_story", mt: st[0], choices: st[5] };
  scenes.push(sc);
}

export const MT_CHOOSE = {
  mt_new(s, r, i, okv, sc) { const x = s.rel[sc?.who]; if (!x) return []; if (i === 0) { x.mentee = true; x.menteeT = s.t; return ["특별한 제자: 가끔 도움이 되기도, 멀어지기도 한다"]; } x.mtNo = true; return []; },
  mt_story(s, r, i, okv, sc) {
    const x = s.rel[sc?.who]; if (!x) return []; const out = [];
    if (sc.mt === "intel" && i === 0) { s.cs.reviews += 2; out.push("최신 면접 정보 반영 · 후기 +2"); }
    if (sc.mt === "refer" && i === 0) { s.cs.refer = (s.cs.refer || 0) + 1.5; out.push("소개 문의 +"); }
    if (sc.mt === "review") { s.cs.reviews += 3; out.push("후기 +3"); }
    if (sc.mt === "drift" && (i === 0 || okv === false)) { x.mentee = false; out.push(`${nm(sc.who)}: 제자 인연이 흘러갔다`); }
    if (sc.mt === "rumor" && okv === false) s.cs.reviews = Math.max(0, s.cs.reviews - 3);
    if (sc.mt === "love" && i === 0) { x.mentee = false; s.cs.mtLove = s.t; out.push("컨설팅 쪽에 알려지면 말이 나올 수 있다"); }
    return out;
  },
};
