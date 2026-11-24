// 연애·인연 확장(11-24): 두근두근 단계 · 연애 행동(선물 고르기·술 한잔·연락·산책·기념일·내 일 보여 주기) · 까톡 대화 이벤트 · 조력자 사건(큰 건·작은 호의·일손)
// - 1회차는 연애(고백·데이트·기념일)만 잠겨 있고 나머지는 열려 있다(대표 11-24).
// - 까톡은 행동력을 쓰지 않는다. 호감 50부터, 찾아가지 않아도 달 마감 때 온다.
// - 조력자 사건은 그 사람의 분야 투잡을 하고 있을 때만 온다.
import * as D from "./defs.js";
import * as GEN from "../gen/data.js";
import * as SJ from "./sj.js";
import * as RD from "./round.js";
import { CHAR, addAff, addMoney, isRomanceable, creditRoom, gainStat, log, jo } from "./core.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const LV = {
  crush: 50, // 두근두근
  chat: { loverP: 0.8, crushP: 0.33, friendP: 0.14, max: 2, q: { 2: 5, 1: 2, 0: -1 }, ignore: -3, again: 14, streak: 3 },
  gift: { hit: 8, big: 12, ok: 3, miss: -4, price: [3, 10, 30] },
  drink: { aff: 6, cash: 6, hp: 6, min: 40 }, ping: { aff: 1.5 }, walk: { aff: 5, mental: 5, cash: 1 }, work: { aff: 5 },
  anniv: { ok: 10, miss: -8, cash: [5, 15], warn: 2 },
  hev: { gap: 4, p: { big: 0.1, small: 0.2, ap: 0.16 }, first: 3 },
};
const CHATS = GEN.CHATS || {}, FCHATS = GEN.FCHATS || [], HEV = GEN.HELPER_EV || [];
const box = (s) => (s.lv = s.lv || { chatT: -9, hevT: -9, fseen: {} });

// 관계 단계
export function stageOf(s, id) {
  const x = s.rel?.[id], c = CHAR[id]; if (!x || !c) return "none";
  if (x.spouse) return "spouse"; if (x.lover) return "lover";
  if (isRomanceable(s, c) && x.aff >= LV.crush) return "crush";
  return x.aff >= 20 ? "friend" : "known";
}
export const STAGE_N = { spouse: "배우자", lover: "연인", crush: "두근두근", friend: "친한 사이", known: "아는 사이" };
export const isBig = (s, id) => ["spouse", "lover", "crush"].includes(stageOf(s, id)); // 큰 화면으로 여는 사람
// 만난 지 n개월 · 다음 기념일
export function sinceInfo(s, id) {
  const x = s.rel?.[id]; if (!x) return null; const t0 = x.spouse ? (s.fam.marriedT ?? x.loverSince) : x.loverSince; if (t0 == null || (!x.lover && !x.spouse)) return null;
  const m = Math.max(0, s.t - t0), nx = m < 3 ? 3 : (Math.floor(m / 12) + 1) * 12;
  return { months: m, label: m >= 12 ? `만난 지 ${Math.floor(m / 12)}년${m % 12 ? ` ${m % 12}개월` : ""}` : `만난 지 ${m}개월`, next: nx, nextN: nx === 3 ? "100일" : `${nx / 12}주년`, left: nx - m, due: x.anv ? x.anv.n : null };
}

// ── 연애 행동. 돌려주는 값이 없으면(core.personAct 가) 원래 행동으로 넘어간다
const GIFT_ITEM = { 게임: "한정판 게임 타이틀", 맛집: "예약 어려운 식당 식사권", 책: "절판됐던 책 초판", 운동: "운동 가방과 수건 세트", 캠핑: "작은 캠핑 랜턴", 쇼핑: "백화점 상품권", 와인: "산지에서 온 와인 한 병", 여행: "여행 가이드북과 캐리어 택", 카페: "스페셜티 원두와 드리퍼", 영화: "영화 예매권과 팝콘 쿠폰", 음악: "턴테이블용 LP 한 장", 전시: "전시 얼리버드 티켓" };
const giftName = (k) => GIFT_ITEM[k] || `${k}에 어울리는 선물`;
const PLAIN = ["디저트 세트", "핸드크림", "작은 꽃다발", "비타민 세트"];
function giftScene(s, r, id) {
  const c = CHAR[id], like = c.likes?.length ? r.pick(c.likes) : null, dis = c.dislikes?.length ? r.pick(c.dislikes) : null, P = r.shuffle([...LV.gift.price]);
  const opts = r.shuffle([{ n: like ? giftName(like) : "손편지와 케이크", q: 2 }, { n: r.pick(PLAIN), q: 1 }, { n: dis ? giftName(dis) : "향이 센 디퓨저", q: dis ? 0 : 1 }]).map((o, i) => ({ ...o, price: P[i] }));
  return { kind: "event", who: id, expr: "smile", tag: "선물", title: `${c.name}에게 줄 선물`, onChoose: "lv_gift", gift: opts, text: `선물 가게에서 셋을 놓고 고민한다. ${jo(c.name, "이", "가")} 좋아하는 것과 싫어하는 것을 떠올려 본다. 값도 제각각이다.`,
    choices: [...opts.map((o) => ({ t: `${o.n} (${o.price}만)`, eff: {}, text: "" })), { t: "오늘은 그냥 나온다", eff: {}, text: "빈손으로 나왔다. 다음에 다시 보자." }] };
}
const DRINK_LINE = [
  (n) => `둘째 잔쯤에서 ${n}의 말이 느려졌다. 평소에는 안 하던 어릴 적 얘기가 나왔다. 듣기만 했는데 고맙다는 말을 들었다.`,
  (n) => `${jo(n, "이", "가")} 잔을 내려놓고 한참 창밖을 봤다. 요즘 제일 무서운 게 뭔지 말해 줬다. 나도 하나 말했다.`,
  (n) => `안주가 식는 줄도 몰랐다. ${n}의 웃음소리가 평소보다 반 톤 높았다. 막차 시간을 두 번 미뤘다.`,
  (n) => `${jo(n, "은", "는")} 취하면 솔직해지는 사람이었다. 내 투잡 얘기를 듣다가, 그게 부럽다고 했다. 처음 듣는 말이었다.`,
];
export function act(s, r, id, kind, arg) {
  const c = CHAR[id], x = s.rel?.[id]; if (!c || !x) return null;
  const need = (ap, cash) => (s.pending ? "장면을 먼저 끝내세요" : s.ap < ap ? "행동력이 부족해요" : cash && s.cash - cash < -creditRoom(s) ? "돈이 모자라요" : null);
  const pay = (ap, cash, label) => { s.ap -= ap; if (cash) { s.cash -= cash; addMoney(s, "exp", label || "약속·데이트", cash); } x.last = s.t; };
  const st = stageOf(s, id);
  if (kind === "giftpick") {
    if (x.gift === s.t) return { ok: false, msg: "이번 달엔 이미 선물했다" };
    if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" };
    return { ok: true, scene: giftScene(s, r, id), lines: [] };
  }
  if (kind === "drink") {
    if (x.aff < LV.drink.min) return { ok: false, msg: `아직 술 한잔할 사이가 아니에요(호감 ${LV.drink.min})` };
    if (x.drinkT === s.t) return { ok: false, msg: "이번 달엔 이미 한잔했다" };
    const why = need(1, LV.drink.cash); if (why) return { ok: false, msg: why };
    pay(1, LV.drink.cash); x.drinkT = s.t; if (x.lover || x.spouse) x.dateT = s.t; s.hp = clamp(s.hp - LV.drink.hp, 0, s.hpMax); s.mental = clamp(s.mental + 3, 0, 100);
    const g = addAff(s, id, LV.drink.aff), i = (x.drinkN = (x.drinkN || 0) + 1) % DRINK_LINE.length;
    return { ok: true, lines: [`호감 +${g}`, "멘탈 +3", `스태미너 −${LV.drink.hp}`], msg: DRINK_LINE[i](c.name) };
  }
  if (kind === "ping") {
    if (st === "friend" || st === "known") return { ok: false, msg: "두근두근(호감 50)부터 할 수 있어요" };
    if (x.pingT === s.t) return { ok: false, msg: "이번 달엔 이미 연락했다" };
    if (s.pending) return { ok: false, msg: "장면을 먼저 끝내세요" };
    x.pingT = s.t; if (x.lover || x.spouse) x.dateT = s.t; const g = addAff(s, id, LV.ping.aff);
    return { ok: true, lines: [`호감 +${g}`, x.lover ? "이번 달은 얼굴을 못 봐도 서운해하지 않아요" : ""].filter(Boolean), msg: `${c.name}에게 짧게 안부를 보냈다. 답장은 금방 왔다. "${c.lines?.hello || "잘 지내요?"}"` };
  }
  if (kind === "walk" || kind === "showwork" || kind === "anniv") {
    if (!RD.loveOpen(s)) return { ok: false, msg: "연애는 2회차부터 열려요" };
    if (!x.lover && !x.spouse) return { ok: false, msg: "연인이 아니에요" };
  }
  if (kind === "walk") {
    const why = need(1, LV.walk.cash); if (why) return { ok: false, msg: why };
    pay(1, LV.walk.cash); x.dateT = s.t; const g = addAff(s, id, LV.walk.aff); s.mental = clamp(s.mental + LV.walk.mental, 0, 100);
    return { ok: true, lines: [`호감 +${g}`, `멘탈 +${LV.walk.mental}`], msg: r.pick([`${jo(c.name, "과", "와")} 동네를 두 바퀴 돌았다. 편의점 아이스크림 하나를 나눠 먹었다. 돈은 거의 안 썼는데 제일 오래 웃었다.`, `집에서 영화를 틀어 놓고 반도 못 봤다. ${jo(c.name, "이", "가")} 먼저 잠들었다. 담요를 덮어 줬다.`, `${jo(c.name, "과", "와")} 한강까지 걸었다. 다리 밑에서 컵라면을 먹었다. 별 얘기 안 했는데 시간이 금방 갔다.`]) };
  }
  if (kind === "showwork") {
    if (!(s.sj?.active || []).length) return { ok: false, msg: "투잡을 하고 있을 때만 보여 줄 수 있어요" };
    if (x.workT === s.t) return { ok: false, msg: "이번 달엔 이미 같이 했다" };
    const why = need(1, 0); if (why) return { ok: false, msg: why };
    pay(1, 0); x.workT = s.t; x.dateT = s.t; const g = addAff(s, id, LV.work.aff); s.buff = s.buff || {}; s.buff.cafe = 1;
    const jn = D.SIDEJOBS[s.sj.active[0]]?.n || "투잡";
    return { ok: true, lines: [`호감 +${g}`, "다음 투잡 행동 효과 +30%"], msg: `${c.name}에게 ${jn} 일을 보여 줬다. 옆에서 보던 ${jo(c.name, "이", "가")} 팔을 걷었다. 둘이 하니 반나절 일이 두 시간에 끝났다.` };
  }
  if (kind === "anniv") {
    if (!x.anv) return { ok: false, msg: "이번 달에 챙길 기념일이 없어요" };
    const cash = x.anv.n === "100일" ? LV.anniv.cash[0] : LV.anniv.cash[1], why = need(1, cash); if (why) return { ok: false, msg: why };
    pay(1, cash, "기념일"); x.dateT = s.t; const nm = x.anv.n; x.anvDone = (x.anvDone || 0) + 1; delete x.anv; const g = addAff(s, id, LV.anniv.ok); s.mental = clamp(s.mental + 4, 0, 100);
    if (x.spouse) s.fam.happy = clamp(s.fam.happy + 6, 0, 100);
    log(s, `${jo(c.name, "과", "와")} ${nm}을 챙겼다.`, "love");
    return { ok: true, lines: [`${nm} · 호감 +${g}`, "멘탈 +4"], msg: `${nm}. 예약해 둔 식당 창가 자리에 앉았다. ${jo(c.name, "이", "가")} 달력 앱을 보여 줬다. 오늘 날짜에 하트가 그려져 있었다. 나만 기억한 게 아니었다.` };
  }
  return null;
}

// ── 달 마감: 기념일 · 까톡 · 조력자 사건
export function loveMonth(s, r, notes, scenes) {
  const B = box(s);
  // 기념일: 그 달에 챙기지 않으면 서운해한다
  for (const [id, x] of Object.entries(s.rel || {})) {
    if (!CHAR[id] || (!x.lover && !x.spouse)) { if (x.anv) delete x.anv; continue; }
    if (x.anv && x.anv.t < s.t) { const g = addAff(s, id, LV.anniv.miss); notes.push(`${CHAR[id].name}: ${x.anv.n}을 그냥 넘겼다 · 호감 ${g}`); if (x.spouse) s.fam.happy = clamp(s.fam.happy - 5, 0, 100); delete x.anv; }
    const q = sinceInfo({ ...s, t: s.t + 1 }, id); // 다음 달 기준
    if (q && (q.months === 3 || (q.months > 0 && q.months % 12 === 0)) && !x.anv) { x.anv = { t: s.t + 1, n: q.months === 3 ? "100일" : `${q.months / 12}주년` }; notes.push(`${jo(CHAR[id].name, "과", "와")} 다음 달이 ${x.anv.n}이에요. 그 달 안에 챙겨야 해요`); }
  }
  chatMonth(s, r, scenes, B);
  helperMonth(s, r, scenes, B);
}
const isJon = (c) => /요[.?!~ ]|요$|니다/.test(`${c.lines?.hello || ""} ${c.lines?.gift || ""}`);
function chatScene(s, id, ch, friend) {
  const c = CHAR[id], Q = LV.chat.q;
  return { kind: "event", who: id, expr: "smile", tag: "까톡", chat: true, title: `${c.name} · ${ch.time || "밤 10:30"}`, onChoose: "lv_chat", chatK: ch.k, text: (ch.msg || []).join("\n"),
    choices: [...ch.opts.map((o) => ({ t: o.t, eff: { aff: Q[o.q] ?? 0, mental: o.q === 2 ? 1 : 0 }, text: o.re, chatQ: o.q })), { t: "답하지 않는다", eff: { aff: friend ? -1 : LV.chat.ignore }, text: ch.ignore || "읽고 답하지 않았다. 며칠 동안 연락이 없었다.", chatQ: -1 }] };
}
function chatMonth(s, r, scenes, B) {
  if (scenes.filter((q) => q.chat).length) return; let n = 0, nc = 0; const K = LV.chat; // 한 달에 연인 1편 + 두근두근 1편까지
  const ids = Object.entries(s.rel || {}).filter(([id, x]) => CHAR[id] && x.aff >= LV.crush && !x.affair).sort((a, b) => ((b[1].lover || b[1].spouse) ? 1 : 0) - ((a[1].lover || a[1].spouse) ? 1 : 0) || b[1].aff - a[1].aff);
  for (const [id, x] of ids) {
    if (n >= K.max) break; const c = CHAR[id], st = stageOf(s, id), love = st === "lover" || st === "spouse";
    if (love || st === "crush") {
      const L = (CHATS[id]?.chats || []).filter((ch) => (love ? ch.when !== "crush" : ch.when !== "lover") && s.t - (x.chatSeen?.[ch.k] ?? -99) >= K.again);
      if (!love && nc >= 1) continue; if (!L.length || !r.chance(love ? K.loverP : K.crushP)) continue; if (!love) nc++;
      const ch = r.pick(L); (x.chatSeen = x.chatSeen || {})[ch.k] = s.t; scenes.push(chatScene(s, id, ch, false)); n++;
    } else if (n === 0 && FCHATS.length && r.chance(K.friendP)) {
      const tone = isJon(c) ? "jon" : "ban", P = c.personality || [];
      let L = FCHATS.filter((ch) => ch.tone === tone && (ch.k !== "army" || x.bond === "army") && s.t - (B.fseen[ch.k] ?? -99) >= 36); const fit = L.filter((ch) => (ch.fit || []).some((p) => P.includes(p))); if (fit.length) L = fit;
      if (!L.length) continue; const ch = r.pick(L); B.fseen[ch.k] = s.t; scenes.push(chatScene(s, id, ch, true)); n++;
    }
  }
}
// 조력자 사건: 그 사람의 분야 투잡을 하고 있을 때만
const jobOk = (s, board) => { const A = s.sj?.active || []; return board === "partyroom" ? A.includes("pr") : board === "consult" ? A.includes("cs") : A.length > 0; };
export const helperGate = (c) => (c?.helper?.board === "partyroom" ? "파티룸을 할 때" : c?.helper?.board === "consult" ? "취업 컨설팅을 할 때" : "투잡을 할 때");
export function helperTiers(s, id) { const c = CHAR[id], x = s.rel?.[id]; if (!c?.helper?.effect || c.helper.effect === "none") return null; return ["small", "ap", "big"].map((t) => { const e = HEV.find((q) => q.effect === c.helper.effect && q.tier === t); return e ? { tier: t, aff: e.aff, done: x?.hev?.[t] != null, on: jobOk(s, c.helper.board) } : null; }).filter(Boolean); }
function helperMonth(s, r, scenes, B) {
  if (!HEV.length || s.t - B.hevT < LV.hev.gap || s.t < LV.hev.first || scenes.some((q) => q.hev)) return;
  const C = [];
  for (const [id, x] of Object.entries(s.rel || {})) { const c = CHAR[id]; if (!c?.helper?.effect || !jobOk(s, c.helper.board)) continue; for (const e of HEV) if (e.effect === c.helper.effect && x.aff >= e.aff && x.hev?.[e.tier] == null) C.push([id, e]); }
  if (!C.length) return; const [id, e] = r.pick(C); if (!r.chance(LV.hev.p[e.tier] || 0.15)) return;
  const c = CHAR[id], x = s.rel[id], fill = (t) => String(t || "").replace(/\{n\}/g, c.name), fx = (ef) => { if (!ef) return ef; const o = { ...ef }; if (o.boost && x.spouse) o.boost = { ...o.boost, pct: o.boost.pct * 1.2 }; return o; };
  (x.hev = x.hev || {})[e.tier] = s.t; B.hevT = s.t;
  scenes.push({ kind: "event", who: id, expr: "smile", tag: e.tier === "big" ? "인연 · 큰 건" : e.tier === "ap" ? "인연 · 일손" : "인연 · 호의", hev: e.id, once: "big", title: `${c.name} · ${e.title}`, text: fill(e.text),
    choices: e.choices.map((ch) => (ch.check ? { t: fill(ch.t), check: ch.check, ok: { text: fill(ch.ok?.text), eff: fx(ch.ok?.eff) }, ng: { text: fill(ch.ng?.text), eff: fx(ch.ng?.eff) } } : { t: fill(ch.t), eff: fx(ch.eff), text: fill(ch.text) })) });
}
export function helperDemo(s, tier) { // 화면 시험용
  for (const [id, x] of Object.entries(s.rel || {})) { const c = CHAR[id]; const e = HEV.find((q) => q.effect === c?.helper?.effect && q.tier === (tier || "big")); if (e) { const sc = []; x.aff = Math.max(x.aff, 80); const B = box(s); B.hevT = -99; const keep = s.sj.active; s.sj.active = [...new Set([...keep, "pr", "cs"])]; x.hev = {}; const r = { pick: () => [id, e], chance: () => true }; helperMonth(s, r, sc, B); s.sj.active = keep; return sc[0] || null; } }
  return null;
}
export function chatDemo(s, when) { for (const [id, x] of Object.entries(s.rel || {})) { const ch = (CHATS[id]?.chats || []).find((q) => q.when === (when || "crush")); if (ch) { x.aff = Math.max(x.aff, 60); return chatScene(s, id, ch, false); } } const id = Object.keys(CHATS).find((k) => CHAR[k]); if (!id) return null; return chatScene(s, id, CHATS[id].chats[0], false); }

export const LV_CHOOSE = {
  lv_gift(s, r, i, okv, sc) {
    const id = sc.who, x = s.rel[id], o = sc.gift?.[i]; if (!o) return [];
    if (s.cash - o.price < -creditRoom(s)) { s._sceneText = "지갑을 열어 보고 다시 내려놓았다. 이번 달은 무리다."; return ["돈이 모자라요"]; }
    s.cash -= o.price; addMoney(s, "exp", "선물", o.price); x.gift = s.t; x.last = s.t;
    const G = LV.gift, v = o.q === 2 ? (o.price >= 30 ? G.big : o.price >= 10 ? G.hit : G.hit - 2) : o.q === 1 ? G.ok + (o.price >= 30 ? 2 : 0) : G.miss, g = addAff(s, id, v), n = CHAR[id].name;
    s._sceneText = o.q === 2 ? `${jo(n, "이", "가")} 포장을 풀다 멈췄다. "${CHAR[id].lines?.gift || "이걸 어떻게 알았어요?"}" 한참을 들여다봤다.` : o.q === 1 ? `${jo(n, "은", "는")} 고맙다고 했다. 무난한 선물에는 무난한 인사가 돌아온다.` : `${n}의 표정이 잠깐 굳었다. 고맙다는 말은 했지만 포장은 다시 닫혔다. 싫어하는 것을 골라 버렸다.`;
    return [`${o.n} −${o.price}만`, `${n} 호감 ${g >= 0 ? "+" : ""}${g}`];
  },
  lv_chat(s, r, i, okv, sc) {
    const x = s.rel[sc.who], q = sc.choices[i]?.chatQ; if (!x) return [];
    if (q === 2) { x.chatGood = (x.chatGood || 0) + 1; if ((x.lover || x.spouse) && x.chatGood % LV.chat.streak === 0) { s.mental = clamp(s.mental + 5, 0, 100); return ["말이 잘 통하는 사이 · 멘탈 +5"]; } } else x.chatGood = 0;
    return [];
  },
};
