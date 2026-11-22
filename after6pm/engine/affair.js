// 바람(v4.25). 기혼일 때만. 걸리면 파경, 안 걸려도 위기가 계속 온다.
// core.js peopleMonth 에서 매달 affMonth(s, r, scenes, notes) 를 부른다. onChoose 이름은 "af_" 로 시작.
// 상태: s.fam.affair = { who, t, sus(의심 0~100), crisisT, used, asked } / 끝낸 뒤 s.fam.affairPast = { t, sus }
import { CHAR, jo, won, addMoney, log, isRomanceable, divorce } from "./core.js";
import * as SYN from "./syn.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const nm = (id) => CHAR[id]?.name || "그 사람";
const sp = (s) => nm(s.fam.spouse);
const M = (s, x) => Math.round(x * SYN.pi(s) / 10) * 10; // 만원, 물가 반영
const inlaw = (s) => (s.me.gender === "M" ? "장모님" : "시어머님");

// 위기 장면: [id, 제목, 본문, 둘러댈 때 쓰는 능력치]
const CRISES = [
  ["phone", "잠금화면의 알림", (s, a) => `식탁 위 내 휴대폰에 알림이 떴다. "${nm(a.who)}: 오늘 고마웠어 :)" ${jo(sp(s), "이", "가")} 화면을 봤다. "누구야?"`, "talk"],
  ["card", "카드 명세서", (s) => `${jo(sp(s), "이", "가")} 카드 명세서를 펼쳤다. "평일 밤 11시에 와인바 14만 원? 회식이었어?"`, "talk"],
  ["seen", "동네 지인의 목격담", (s) => `${sp(s)}의 친구가 캡처를 보냈다. "어제 성숲길에서 너희 집 사람 봤는데? 옆에 누구더라~" ${jo(sp(s), "이", "가")} 그 캡처를 내밀었다.`, "charm"],
  ["scent", "낯선 향수 냄새", (s) => `외투를 받아 걸던 ${jo(sp(s), "이", "가")} 멈칫했다. "이거 무슨 향이야? 당신 이런 거 안 쓰잖아."`, "charm"],
  ["trip", "출장 핑계", (s) => `"이번 주말 부산 출장"이라고 했는데, ${jo(sp(s), "이", "가")} 웃으며 말했다. "회사에 전화해서 숙소 영수증 처리 물어볼까?"`, "talk"],
  ["chat", "단톡방 대참사", (s, a) => `${nm(a.who)}에게 보낼 "나도 보고 싶어"를 가족 단톡방에 보냈다. ${jo(inlaw(s), "이", "가")} 하트를 눌렀다. ${sp(s)}는 아직 안 읽었다.`, "sense"],
  ["door", "집 앞까지 온 사람", (s, a) => `${jo(nm(a.who), "이", "가")} 아파트 1층에서 기다리고 있었다. "연락이 안 돼서…" 엘리베이터에서 ${jo(sp(s), "이", "가")} 내리고 있다.`, "charm"],
  ["anniv", "기념일이 겹친 날", (s, a) => `결혼기념일 저녁, ${nm(a.who)}의 생일이기도 하다. 두 사람 다 "오늘 저녁 비워 둔 거지?"라고 물었다.`, "talk"],
  ["gift", "숨겨 둔 선물 상자", (s) => `차 트렁크에서 리본 달린 상자가 나왔다. ${jo(sp(s), "이", "가")} 웃는다. "어머, 이거 내 거야?" 내 것이 아니다.`, "sense"],
];

function start(s, id) {
  s.fam.affair = { who: id, t: s.t, sus: 5, crisisT: s.t, used: [], asked: false };
  if (s.rel[id]) s.rel[id].affair = true;
  log(s, `${jo(nm(id), "과", "와")} 선을 넘었다.`, "love");
}
function end(s, out) {
  const a = s.fam.affair; if (!a) return;
  const rel = s.rel[a.who]; if (rel) { rel.affair = false; rel.aff = clamp(rel.aff - 30, 0, 100); }
  s.fam.affairPast = { t: s.t, sus: a.sus }; s.fam.affair = null;
  out.push("비밀 관계를 정리했다", "의심은 천천히 식는다(2년 동안은 드러날 수 있음)");
}
function caught(s, scenes, how) {
  const a = s.fam.affair || null;
  const kids = s.fam.kids.length, spName = sp(s), pen = M(s, 3000);
  s.cash -= pen; addMoney(s, "exp", "위자료", pen);
  s.mental = clamp(s.mental - 25, 0, 100);
  divorce(s, scenes, "파경", `${how} ${jo(spName, "은", "는")} 울지 않았다. "변호사 통해서 연락할게." 위자료 ${won(pen)}, 재산은 절반으로.${kids ? " 아이는 한 달에 두 번 볼 수 있다." : ""}`);
  if (a) {
    const rel = s.rel[a.who];
    if (rel) { rel.affair = false; if (rel.aff >= 50) { rel.lover = true; rel.loverSince = s.t; rel.dateT = s.t; } else rel.aff = 5; }
  }
  s.fam.affair = null; s.fam.affairPast = null;
  log(s, "바람이 들켜 이혼했다.", "love");
}

export function affMonth(s, r, scenes, notes) {
  if (!s.fam.spouse) { if (s.fam.affair) { const rel = s.rel[s.fam.affair.who]; if (rel) rel.affair = false; s.fam.affair = null; } s.fam.affairPast = null; return; }
  const busy = scenes.some((x) => x.kind === "event");
  const a = s.fam.affair;
  if (a) {
    // 들키지 않아도 매달 대가
    const hid = M(s, 30); s.cash -= hid; addMoney(s, "exp", "말 못 할 지출", hid);
    s.mental = clamp(s.mental + 2, 0, 100);
    s.fam.happy = clamp(s.fam.happy - 3, 0, 100);
    a.sus = clamp(a.sus + 2 + (s.fam.spouseType === "불안형" ? 2 : 0), 0, 100);
    if (a.sus >= 100 || r.chance(Math.max(0, a.sus - 30) / 700)) { caught(s, scenes, `${jo(sp(s), "이", "가")} 식탁에 휴대폰 캡처 수십 장을 펼쳐 놓았다.`); return; }
    if (a.sus >= 60) notes.push(`${sp(s)}의 눈빛이 달라졌다(의심 ${Math.round(a.sus)})`);
    // 상대의 압박: 1년 넘으면 "나랑 살자"
    if (!busy && !a.asked && s.t - a.t >= 12 && r.chance(0.12)) {
      a.asked = true;
      scenes.push({ kind: "event", who: a.who, expr: "sad", title: "\"나랑 살자\"", text: `${jo(nm(a.who), "이", "가")} 커피잔을 내려놓았다. "언제까지 이렇게 숨어 살 거야? 정리하고 나한테 와." ${sp(s)}의 얼굴이 스쳤다.`, onChoose: "af_ask",
        choices: [{ t: "이혼하고 간다 (재산 절반)", eff: {}, text: "짐은 캐리어 두 개였다." }, { t: "여기서 끝내자고 말한다", eff: { mental: -6 }, text: "\"…그래, 알겠어.\" 목소리가 너무 조용했다." }] });
      return;
    }
    // 위기
    if (!busy && s.t - a.crisisT >= 2 && r.chance(0.3)) {
      a.crisisT = s.t;
      const pool = CRISES.filter((c) => !a.used.includes(c[0])); const c = r.pick(pool.length ? pool : CRISES); a.used.push(c[0]);
      scenes.push({ kind: "event", who: s.fam.spouse, expr: a.sus >= 50 ? "angry" : "surprised", title: c[1], text: `${c[2](s, a)} (의심 ${Math.round(a.sus)})`, onChoose: "af_crisis",
        choices: [
          { t: "태연하게 둘러댄다", check: { stat: c[3], dc: 35 + Math.round(a.sus / 3) }, ok: { text: "\"아, 그거?\" 웃으며 넘겼다. 심장이 귀에서 뛰었다.", eff: { mental: -3 } }, ng: { text: "말이 꼬였다. 대답 대신 긴 침묵이 돌아왔다.", eff: { mental: -6, family: -6 } } },
          { t: "이번엔 진짜 정리한다", eff: { mental: -8 }, text: "그날 밤 마지막 메시지를 보냈다." },
          { t: "당분간 연락을 끊고 조심한다 (의심 −15)", eff: { ap: -2 }, text: "휴대폰을 뒤집어 놓는 버릇이 생겼다." },
        ] });
    }
    return;
  }
  // 끝낸 뒤에도 2년 동안은 드러날 수 있다
  const past = s.fam.affairPast;
  if (past) {
    past.sus = Math.max(0, past.sus - 3);
    if (s.t - past.t > 24 || (past.sus <= 0 && !past.revenge)) { s.fam.affairPast = null; return; }
    if (r.chance(past.revenge ? 0.25 : past.sus / 1500 + 0.004)) caught(s, scenes, past.revenge ? "모르는 번호로 사진이 왔다고 했다." : "옛날 사진 한 장이 클라우드 '추억' 알림으로 떴다.");
    return;
  }
  // 유혹: 호감 높은 이성, 집이 차갑거나 마음이 지쳤을 때 더 자주
  if (busy || s.t - (s.flags.affTempt ?? -99) < 24 || s.t - (s.fam.marriedT ?? s.t) < 12) return;
  const cands = Object.entries(s.rel).filter(([id, x]) => !x.spouse && x.aff >= 50 && CHAR[id] && isRomanceable(s, CHAR[id])).map(([id]) => id);
  if (!cands.length) return;
  const p = 0.025 + (s.fam.happy < 40 ? 0.04 : 0) + (s.mental < 35 ? 0.03 : 0);
  if (!r.chance(p)) return;
  s.flags.affTempt = s.t;
  const id = r.pick(cands);
  scenes.push({ kind: "event", tag: "19금", who: id, expr: "blush", title: "선을 넘을 뻔한 밤", text: `모임이 끝나고 둘만 남았다. ${jo(nm(id), "이", "가")} 말했다. "요즘 집에 가기 싫다는 얼굴이던데." 막차까지 20분. ${sp(s)}의 메시지: "언제 와?"`, onChoose: "af_tempt",
    choices: [
      { t: "택시를 잡는다. 집으로", eff: { mental: 2, family: 3 }, text: "현관 불이 켜져 있었다. 괜히 꼭 안아 줬다." },
      { t: "\"한 잔만 더.\"", eff: { mental: 6 }, text: "그날 밤, 집에는 \"야근\"이라고 보냈다." },
    ] });
}

export const AFF_CHOOSE = {
  af_tempt(s, r, i, okv, sc) { const who = sc?.who; if (i !== 1 || !who) return []; start(s, who); return ["비밀 관계 시작", "들키면 파경(위자료·재산 절반)", "매달 말 못 할 지출, 가족 행복 −"]; },
  af_crisis(s, r, i, okv) {
    const a = s.fam.affair; if (!a) return []; const out = [];
    if (i === 0) { a.sus = clamp(a.sus + (okv ? 6 : 28), 0, 100); out.push(`의심 ${okv ? "+6" : "+28"} (지금 ${Math.round(a.sus)})`); }
    if (i === 1) end(s, out);
    if (i === 2) { a.sus = clamp(a.sus - 15, 0, 100); out.push(`의심 −15 (지금 ${Math.round(a.sus)})`); }
    return out;
  },
  af_ask(s, r, i) {
    const a = s.fam.affair; if (!a) return []; const out = [];
    if (i === 0) {
      const who = a.who;
      divorce(s, s.sceneQ, "새 출발", `${jo(sp(s), "은", "는")} 이미 알고 있었다는 얼굴이었다. "잘 살아." 재산은 절반이 됐다.`);
      const rel = s.rel[who]; s.fam.affair = null; s.fam.affairPast = null;
      if (rel) { rel.affair = false; rel.lover = true; rel.loverSince = s.t; rel.dateT = s.t; rel.aff = Math.max(rel.aff, 70); }
      log(s, `${nm(who)}에게 가려고 이혼했다.`, "love"); out.push("이혼(재산 절반)", `${jo(nm(who), "과", "와")} 연인`);
    } else {
      end(s, out);
      if (r.chance(0.35)) { s.fam.affairPast.revenge = true; out.push("상대가 조용히 물러나지 않을 것 같다…"); }
    }
    return out;
  },
};

// 데이트·여행 때 의심이 오른다(core.js 데이트에서 부름)
export function affDate(s, id, kind) { const a = s.fam.affair; if (!a || a.who !== id) return ""; const d = kind === "trip" ? 15 : 6; a.sus = clamp(a.sus + d, 0, 100); return `의심 +${d}`; }
