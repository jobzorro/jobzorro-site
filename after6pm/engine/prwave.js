// 파티룸 컨셉 위기(11-23). 다른 투잡의 1차 "판이 바뀐다" 대신, 파티룸은 컨셉마다 침몰 사건이 차례차례 온다.
// 내 지점이 그 컨셉이 아니면 비켜 간다. 1년 전에 예고가 뜨니 미리 컨셉을 바꿔 피할 수 있다. 2차(15~18년 차)는 wave.js WAVES2.pr 이 파티룸 전체를 친다.
// - 컨셉 잠금: 처음엔 엠티·파티, 홈파티만. 나머지는 능력치가 오르면 열린다(PW_REQ). 이미 하고 있는 지점은 그대로.
// - 관리 이득: 같은 컨셉 지점이 여럿이면 관리 행동력이 덜 든다. 컨셉이 세 가지 이상으로 흩어지면 사라진다(apMult).
// 상태: s.pr.cw = { nextT, n, pre: { k, t } | null, sunk: { [컨셉]: { t, half } } }
// wave.js waveMonth 가 prWaveMonth 를 부른다. onChoose 는 "pw_ev"(PW_CHOOSE). pr.js settle 이 occMult, needAp 이 apMult, conceptOk 가 lockWhy 를 읽는다.
import * as D from "./defs.js";
import * as SYN from "./syn.js";
import { addMoney, log } from "./core.js";
import * as RD from "./round.js"; // 컨셉 위기는 2회차부터
import { bestDecor, decorFit } from "./pr.js"; // 서로 부르지만 실행 때만 쓰므로 괜찮다

// first: [가장 이른 달, 가장 늦은 달] · gap: 사건 사이(달) · pre: 예고가 몇 달 전에 뜨나 · max: 한 판에 최대 몇 번 · mine: 내가 가진 컨셉 쪽으로 올 확률
// cut: 침몰한 컨셉 지점의 예약 감소(첫해·해마다·최대) · half: 반만 대응 · sameAp: 같은 컨셉 지점 수별 관리 행동력 배수 · kinds: 이보다 많은 컨셉이면 관리 이득 없음
export const PW_BAL = { first: [66, 84], minTen: 12, gap: [24, 36], pre: 12, max: 4, mine: 0.25, cutFirst: 0.08, cutYear: 0.05, cutCap: 0.35, half: 0.5, halfCost: 250, sameAp: { 2: 0.8, 3: 0.65 }, sameCost: { 2: 0.78, 3: 0.62 }, kinds: 2, warnGap: 3 };
if (typeof process !== "undefined" && process.env?.PWB) Object.assign(PW_BAL, JSON.parse(process.env.PWB)); // 봇 시험용
// 컨셉을 여는 조건: [능력치, 필요 값]. 없는 컨셉은 처음부터 열려 있다
export const PW_REQ = { game: ["hands", 50], bridal: ["sense", 40], study: ["write", 40], lecture: ["talk", 50], work: ["career", 50], edu: ["career", 80], mega: ["num", 80], kids: ["charm", 70] };
if (typeof process !== "undefined" && process.env?.PWREQ) Object.assign(PW_REQ, JSON.parse(process.env.PWREQ));

// head: 경고 제목 · pre: 예고 한 줄 · text: 장면 글 · half: [반만 대응 글, 결과]
export const CRISES = {
  party: { head: "심야 소음 조례가 생겼다", pre: "구청이 '밤 10시 이후 소음 단속' 조례를 준비한다는 소문이 돌아요",
    text: "밤 10시가 넘으면 단속반이 돈다. 엠티 손님은 밤새 놀려고 오는데, 열 시에 음악을 끄라고 하면 예약을 취소한다. 엠티·파티 컨셉은 해마다 손님이 줄 판이다.",
    half: ["방음 공사를 하고 낮 타임을 판다", "낮 손님은 조금 늘었다. 밤 손님은 돌아오지 않았다."] },
  home: { head: "새 아파트마다 파티룸이 생겼다", pre: "신축 단지 광고에 '입주민 전용 파티룸'이 빠지지 않아요",
    text: "신축 단지 커뮤니티 시설에 파티룸이 들어왔다. 입주민은 공짜에 가깝다. '집처럼 편안한 방'을 돈 내고 빌릴 이유가 사라졌다. 홈파티 컨셉은 해마다 손님이 줄 판이다.",
    half: ["요리 도구와 식기를 호텔급으로 올린다", "오던 손님은 좋아한다. 새 손님은 단지 안에서 논다."] },
  game: { head: "게임방 업계가 법 문제를 들고나왔다", pre: "게임방 사장님 모임이 '게임 파티룸은 무등록 영업'이라는 민원을 넣기 시작했어요",
    text: "게임방 업계가 구청에 단체 민원을 넣었다. 게임기를 두고 돈을 받으면 게임 제공업 등록을 해야 한다는 것이다. 단속 공문이 날아왔다. 게임 파티룸 컨셉은 해마다 손님이 줄 판이다.",
    half: ["게임기를 줄이고 보드게임을 채운다", "단속은 피했다. 게임기를 보고 오던 손님은 발길을 끊었다."] },
  bridal: { head: "호텔이 브라이덜 샤워 패키지를 냈다", pre: "호텔들이 '브라이덜 샤워 패키지' 광고를 시작했어요",
    text: "호텔이 객실에 풍선과 케이크를 넣어 패키지로 판다. 값은 내 방의 두 배인데 사진이 더 잘 나온다. 결혼하는 사람도 해마다 준다. 브라이덜·생일 컨셉은 해마다 손님이 줄 판이다.",
    half: ["촬영 소품과 포토존을 새로 짠다", "사진은 예뻐졌다. 호텔 로비 사진을 이기지는 못한다."] },
  study: { head: "스터디카페가 모임방을 공짜로 푼다", pre: "스터디카페 체인이 '모임방 무료' 행사를 한다는 전단이 붙었어요",
    text: "스터디카페 체인이 좌석 이용권을 사면 모임방을 공짜로 쓰게 했다. 두 시간에 만 원을 받던 내 방은 설 자리가 없다. 소모임·스터디 컨셉은 해마다 손님이 줄 판이다.",
    half: ["빔프로젝터와 화이트보드를 넣는다", "발표 연습 모임은 남았다. 조용히 공부하는 모임은 떠났다."] },
  lecture: { head: "강의가 온라인으로 넘어갔다", pre: "강사들 사이에서 '이제 대관할 필요가 없다'는 말이 돌아요",
    text: "강사들이 화상 강의로 옮겨 갔다. 수강생은 집에서 듣고, 강사는 대관료를 아낀다. 평일 저녁마다 차던 방이 빈다. 강의·세미나룸 컨셉은 해마다 손님이 줄 판이다.",
    half: ["촬영·송출 장비를 들인다", "녹화하러 오는 강사는 생겼다. 한 번 찍고 한 달을 안 온다."] },
  work: { head: "저녁 회식이 사라졌다", pre: "회사마다 '회식은 점심에'라는 공지가 붙기 시작했어요",
    text: "회사 회식이 점심으로 바뀌었다. 워크숍은 온라인 설문으로 대신한다. 법인카드로 긁던 저녁 예약이 사라졌다. 워크숍·회식 컨셉은 해마다 손님이 줄 판이다.",
    half: ["점심 도시락 워크숍 상품을 만든다", "낮 예약 몇 건은 생겼다. 저녁 매출만큼은 안 된다."] },
  edu: { head: "기업이 교육 예산을 깎았다", pre: "경기가 식으면서 기업 교육 담당자들이 '내년 예산이 반'이라고 해요",
    text: "기업이 외부 교육 예산부터 잘랐다. 남은 교육은 사내 강당에서 한다. 분기마다 오던 연수 예약이 끊겼다. B2B 교육장 컨셉은 해마다 손님이 줄 판이다.",
    half: ["공공기관 입찰에 들어간다", "한 건을 땄다. 서류에 든 시간에 비하면 남는 게 적다."] },
  mega: { head: "큰 방의 소방 기준이 강화됐다", pre: "다중이용시설 화재 뉴스 뒤로 소방 기준을 올린다는 얘기가 나와요",
    text: "서른 명 넘게 받는 공간은 스프링클러와 비상구를 새 기준에 맞춰야 한다. 못 맞추면 정원을 절반으로 줄여야 한다. 초대형 파티룸 컨셉은 해마다 손님이 줄 판이다.",
    half: ["정원을 줄이고 값을 올린다", "단속은 통과했다. 과 엠티는 다른 곳으로 갔다."] },
  kids: { head: "대형 키즈카페가 돌잔치를 가져간다", pre: "대형 키즈카페 체인이 '돌잔치 패키지'를 준비한다고 해요",
    text: "대형 키즈카페가 돌잔치 패키지를 냈다. 놀이 시설에 뷔페까지 붙였다. 아이도 해마다 덜 태어난다. 키즈·돌잔치 컨셉은 해마다 손님이 줄 판이다.",
    half: ["안전 매트와 놀잇감을 새로 채운다", "엄마들 후기는 좋아졌다. 큰 잔치는 키즈카페로 갔다."] },
};

const cw = (s) => (s.pr.cw = s.pr.cw || { nextT: null, n: 0, pre: null, sunk: {} });
const cn = (k) => D.CONCEPTS[k]?.n || k;
const pct = (x) => Math.round(x * 100);
const M = (s, x) => Math.max(5, Math.round(x * SYN.pi(s) / 5) * 5);
const openRooms = (s) => (s.pr?.rooms || []).filter((x) => x.status === "open");

// ── 지역 상권 부흥·붕괴(11-23): 지역마다 따로 온다. 부흥이 더 자주. 몇 해 가다 끝난다 ──
// first: 첫 사건 시기(달) · gap: 사이(달) · boomP: 부흥일 확률 · boom/bust: 예약 변화 · boomMo/bustMo: 이어지는 달 · mine: 내 지점이 있는 지역으로 올 확률 · adCost: 붕괴 때 광고로 버티는 값
export const DZ_BAL = { first: [30, 48], gap: [18, 30], boomP: 0.72, boom: 0.2, bust: 0.15, boomMo: 60, bustMo: 48, mine: 0.6, half: 0.5, adCost: 150 };
if (typeof process !== "undefined" && process.env?.DZB) Object.assign(DZ_BAL, JSON.parse(process.env.DZB)); // 봇 시험용
const DZ_BOOM = [["지하철 새 노선이 뚫렸다", "역 출구가 가게 앞에 생겼다. 유동 인구가 눈에 띄게 늘었다."], ["대형 쇼핑몰이 들어왔다", "주말마다 사람이 몰린다. 쇼핑을 마친 손님이 놀 곳을 찾는다."], ["걷고 싶은 거리가 조성됐다", "구청이 차를 막고 거리를 꾸몄다. 사진 찍으러 오는 사람이 생겼다."], ["방송에 골목이 나왔다", "예능에 골목이 나온 뒤로 줄 서는 가게가 생겼다. 동네 이름이 검색어에 올랐다."], ["새 아파트 단지가 입주했다", "수천 세대가 한꺼번에 들어왔다. 모임 할 곳을 찾는 사람이 늘었다."]];
const DZ_BUST = [["재개발로 상가가 헐린다", "옆 블록부터 철거가 시작됐다. 가림막이 서고 손님 발길이 끊겼다."], ["큰 회사가 사옥을 옮겼다", "직원 수천 명이 한꺼번에 빠져나갔다. 평일 저녁이 조용해졌다."], ["3년짜리 도로 공사가 시작됐다", "가게 앞 도로가 파헤쳐졌다. 소음과 먼지에 손님이 돌아선다."], ["옆 동네에 새 상권이 떴다", "사람들이 새 상권으로 옮겨 갔다. 이 동네는 '예전에 뜨던 곳'이 됐다."], ["학교가 캠퍼스를 옮겼다", "학생들이 떠났다. 방학 같은 학기가 이어진다."]];
const dzS = (s) => (s.pr.dz = s.pr.dz || { nextT: null, on: {} });
const dn = (k) => D.DISTRICTS[k]?.n || k;
export function dzOf(s, dk) { const x = s.pr?.dz?.on?.[dk]; return x && s.t < x.until ? x : null; }
export function dzMult(s, rm) { const x = dzOf(s, rm.dk); return x ? 1 + x.v * (x.half ? DZ_BAL.half : 1) : 1; }
function dzMonth(s, r, notes, scenes) {
  const B = DZ_BAL, Z = dzS(s), rs = openRooms(s), t0 = s.sj?.rp?.pr?.t0; if (typeof t0 !== "number") return;
  if (Z.nextT == null) Z.nextT = Math.max(r.int(B.first[0], B.first[1]), t0 + 6);
  for (const [dk, x] of Object.entries(Z.on)) if (s.t === x.until) { notes.push(`파티룸: ${dn(dk)} 상권 ${x.v > 0 ? "부흥" : "침체"}이 끝나고 예전으로 돌아왔어요.`); }
  if (s.t < Z.nextT) return;
  const free = Object.keys(D.DISTRICTS).filter((k) => !dzOf(s, k)); if (!free.length) { Z.nextT = s.t + 6; return; }
  const mine = [...new Set(rs.map((x) => x.dk))].filter((k) => free.includes(k));
  const dk = mine.length && r.chance(B.mine) ? r.pick(mine) : r.pick(free), boom = r.chance(B.boomP), me = rs.some((x) => x.dk === dk);
  if (!boom && me && (scenes.some((q) => q.kind === "event" || q.warn) || s.t - (s.warnT ?? -99) < PW_BAL.warnGap)) return; // 내 지역 붕괴는 경고 화면이 뜨니 겹치면 다음 달로
  const T = r.pick(boom ? DZ_BOOM : DZ_BUST), mo = boom ? B.boomMo : B.bustMo, v = boom ? B.boom : -B.bust;
  Z.on[dk] = { v, t: s.t, until: s.t + mo, n: T[0] }; Z.nextT = s.t + r.int(B.gap[0], B.gap[1]);
  log(s, `[상권 ${boom ? "부흥" : "붕괴"}] ${dn(dk)}: ${T[0]}`, "work");
  const tail = `(${dn(dk)} 지점 예약 ${boom ? "+" : "−"}${pct(Math.abs(v))}% · ${Math.round(mo / 12)}년쯤 가요)`;
  if (!me) { notes.push(`[상권 소식] ${dn(dk)}: ${T[0]}. ${boom ? "지금 이 지역에 지점을 내면 예약이 더 차요" : "당분간 이 지역은 피하세요"} ${tail}`); return; }
  if (boom) { scenes.push({ kind: "story", tag: "상권 부흥", title: `${dn(dk)}: ${T[0]}`, text: `${T[1]}\n\n내 지점이 있는 동네다. 예약 문의가 늘기 시작했다.\n${tail}`, choices: [{ t: "물 들어올 때 노 젓자", eff: { mental: 2 }, text: "" }] }); return; }
  const c1 = M(s, B.adCost * rs.filter((x) => x.dk === dk).length); s.warnT = s.t;
  scenes.push({ kind: "event", tag: "WARNING", warn: { head: `${dn(dk)} 상권이 무너진다`, sub: `파티룸 · ${T[0]}` }, title: `${dn(dk)}: ${T[0]}`, onChoose: "pw_ev", dzK: dk,
    text: `${T[1]}\n\n내 지점이 있는 동네다.\n${tail}\n(지점을 접고 다른 지역에 새로 내는 것도 방법이에요. 뜨는 상권은 업계 소식에 나와요)`,
    choices: [{ t: `멀리서 오는 손님을 광고로 부른다 (${c1}만 원)`, eff: { cash: -c1, mental: -1 }, text: "동네 손님 대신 검색으로 찾아오는 손님을 잡았다. 빈 타임이 절반쯤 메워졌다.", pw: "dzhalf" }, { t: "지나갈 때까지 버틴다", eff: {}, text: "간판 불을 켜 두고 기다리기로 했다. 몇 해는 걸릴 것이다.", pw: "keep" }] });
}


// 컨셉 잠금: 못 여는 이유(없으면 null)
export function lockWhy(s, k) { const q = PW_REQ[k]; if (!q || !s?.st || (typeof process !== "undefined" && process.env?.PWNOLOCK)) return null; const cur = Math.floor(s.st[q[0]] || 0), need = Math.max(1, q[1] - RD.reqCut(s)); return cur >= need ? null : `${D.STATS[q[0]]} ${need} 필요(지금 ${cur})`; }
// 침몰한 컨셉의 지금 감소율
export function sunkCut(s, k) { const x = s.pr?.cw?.sunk?.[k]; if (!x) return 0; const B = PW_BAL, c = Math.min(B.cutCap, B.cutFirst + Math.max(0, (s.t - x.t) / 12) * B.cutYear); return +(c * (x.half ? B.half : 1)).toFixed(3); }
export const sunk = (s, k) => !!s.pr?.cw?.sunk?.[k];
export function occMult(s, rm) { return (1 - sunkCut(s, rm.concept)) * dzMult(s, rm); }
// 관리 이득: 같은 컨셉 지점이 여럿이면 관리 행동력이 덜 든다
export function apMult(s, rm) {
  const rs = openRooms(s), kinds = new Set(rs.map((x) => x.concept)).size; if (kinds > PW_BAL.kinds) return 1;
  const same = rs.filter((x) => x.concept === rm.concept).length; return same >= 3 ? PW_BAL.sameAp[3] : same === 2 ? PW_BAL.sameAp[2] : 1;
}
// 같은 컨셉 지점끼리는 비품·청소를 묶어 관리비도 덜 든다
export function costMult(s, rm) {
  const rs = openRooms(s), kinds = new Set(rs.map((x) => x.concept)).size; if (kinds > PW_BAL.kinds) return 1;
  const same = rs.filter((x) => x.concept === rm.concept).length; return same >= 3 ? PW_BAL.sameCost[3] : same === 2 ? PW_BAL.sameCost[2] : 1;
}
// 보드용
export function info(s) {
  if (!s.pr) return null; const C = s.pr.cw || {}, rs = openRooms(s), kinds = [...new Set(rs.map((x) => x.concept))];
  const best = rs.length ? Math.min(...rs.map((x) => apMult(s, x))) : 1;
  return { pre: C.pre ? { k: C.pre.k, n: cn(C.pre.k), left: Math.max(0, C.pre.t - s.t), mine: kinds.includes(C.pre.k), line: CRISES[C.pre.k]?.pre } : null,
    sunk: Object.keys(C.sunk || {}).map((k) => ({ k, n: cn(k), cut: sunkCut(s, k), mine: kinds.includes(k), head: CRISES[k]?.head })),
    dz: Object.entries(s.pr.dz?.on || {}).filter(([dk]) => dzOf(s, dk)).map(([dk, x]) => ({ dk, n: dn(dk), v: x.v * (x.half ? DZ_BAL.half : 1), why: x.n, left: x.until - s.t, mine: rs.some((q) => q.dk === dk) })),
    kinds: kinds.length, syn: best < 1 ? Math.round((1 - best) * 100) : 0, synCost: rs.length ? Math.round((1 - Math.min(...rs.map((x) => costMult(s, x)))) * 100) : 0, synOff: rs.length >= 2 && kinds.length > PW_BAL.kinds };
}
// 그 지점이 지금 바꿀 수 있는 가장 나은 컨셉(침몰·예고·잠금·매물 조건 제외)
function bestFor(s, rm) {
  const d = D.DISTRICTS[rm.dk], C = cw(s);
  const ok = Object.keys(D.CONCEPTS).filter((k) => k !== rm.concept && !C.sunk[k] && C.pre?.k !== k && !lockWhy(s, k) && !(D.CONCEPTS[k].req && D.CONCEPTS[k].req(rm)));
  return ok.sort((a, b) => (d.fit[b] ?? 0.8) - (d.fit[a] ?? 0.8))[0] || null;
}
const swapCost = (s, rm, k) => Math.round((300 * rm.size / 22 + (D.CONCEPTS[k].kit || 0)) * SYN.pi(s)); // pr.js setConcept 와 같은 값

export function prWaveMonth(s, r, notes, scenes) {
  if (typeof process !== "undefined" && process.env?.WVOFF) return;
  if (!s.pr || !(s.sj?.active || []).includes("pr")) return;
  const B = PW_BAL, C = cw(s), rs = openRooms(s), t0 = s.sj?.rp?.pr?.t0;
  if (typeof t0 !== "number") return;
  dzMonth(s, r, notes, scenes);
  if (!rs.length || RD.isR1(s)) return; // 1회차는 상권 부흥·붕괴만
  if (C.nextT == null) C.nextT = Math.max(r.int(B.first[0], B.first[1]), t0 + B.minTen + B.pre);
  // 해마다 알림
  if (s.cal === 1) for (const k of new Set(rs.map((x) => x.concept))) { const c = sunkCut(s, k); if (c > 0) notes.push(`파티룸: '${cn(k)}' 컨셉이 침몰해 그 지점 예약이 ${pct(c)}% 줄고 있어요. 컨셉을 바꾸면 벗어나요.`); }
  if (C.n >= B.max || s.wv?.pr2) return; // 2차(파티룸 전체)가 오면 컨셉 위기는 끝
  const left = Object.keys(CRISES).filter((k) => !C.sunk[k]); if (!left.length) return;
  // 예고
  if (!C.pre && s.t >= C.nextT - B.pre - RD.preMore(s)) {
    const mine = [...new Set(rs.map((x) => x.concept))].filter((k) => left.includes(k));
    const k = mine.length && r.chance(B.mine) ? r.pick(mine) : r.pick(left);
    C.pre = { k, t: Math.max(C.nextT, s.t + 6) };
    const me = rs.some((x) => x.concept === k);
    notes.push(`[파티룸 업계 소식] ${CRISES[k].pre}. '${cn(k)}' 컨셉이 흔들릴 수 있어요.${me ? " 내 지점이 이 컨셉이에요." : ""}`); log(s, `[업계 소식] ${CRISES[k].pre} ('${cn(k)}' 컨셉)`, "work");
    return;
  }
  // 터진다
  if (C.pre && s.t >= C.pre.t) {
    if (scenes.some((q) => q.kind === "event" || q.warn) || s.t - (s.warnT ?? -99) < B.warnGap) return; // 다른 큰 장면과 겹치면 다음 달로
    const k = C.pre.k, W = CRISES[k]; C.sunk[k] = { t: s.t }; C.n++; C.pre = null; C.nextT = s.t + r.int(B.gap[0], B.gap[1]);
    log(s, `[컨셉 침몰] ${W.head} ('${cn(k)}')`, "work");
    const hit = rs.filter((x) => x.concept === k);
    if (!hit.length) { scenes.push({ kind: "story", tag: "파티룸 업계", title: W.head, text: `${W.text}\n\n내 지점은 '${cn(k)}' 컨셉이 아니다. 이번 파도는 비켜 갔다.\n(앞으로 '${cn(k)}' 컨셉은 예약이 해마다 줄어요. 새로 열 때 피하세요)`, choices: [{ t: "다행이다", eff: {}, text: "" }] }); return; }
    s.warnT = s.t; scenes.push(scene(s, k));
  }
}

function scene(s, k) {
  const B = PW_BAL, W = CRISES[k], hit = openRooms(s).filter((x) => x.concept === k);
  const plan = hit.map((rm) => { const to = bestFor(s, rm); return { rm, to, c: to ? swapCost(s, rm, to) : 0 }; }), can = plan.filter((p) => p.to);
  const cost = can.reduce((a, p) => a + p.c, 0), c1 = M(s, B.halfCost * hit.length);
  const toN = [...new Set(can.map((p) => cn(p.to)))].join("·");
  const ch = [];
  if (can.length) ch.push({ t: `지점 ${can.length}곳을 '${toN}' 컨셉으로 바꾼다 (${Math.round(cost)}만 원)`, eff: { cash: -Math.round(cost), mental: -2, hp: -3 }, text: "간판을 내리고 집기를 갈았다. 단골 몇은 떠났지만 새 손님이 그 자리를 채운다.", pw: "swap" });
  else ch.push({ t: "바꿀 수 있는 컨셉이 없다 (능력치를 올리면 열려요)", eff: {}, text: "열 수 있는 다른 컨셉이 없다. 능력치를 올려 새 컨셉이 열리면 지점 화면에서 바꾸기로 했다.", pw: "keep" });
  ch.push({ t: `${W.half[0]} (${c1}만 원)`, eff: { cash: -c1, mental: -1 }, text: W.half[1], pw: "half" });
  ch.push({ t: "이 컨셉으로 버틴다", eff: {}, text: "간판을 그대로 뒀다. 예약표의 빈칸이 달마다 늘어난다.", pw: "keep" });
  const multi = new Set(openRooms(s).map((x) => x.concept)).size;
  return { kind: "event", tag: "WARNING", warn: { head: W.head, sub: `파티룸 · '${cn(k)}' 컨셉 침몰` }, title: W.head, onChoose: "pw_ev", pwK: k,
    text: `${W.text}\n(내 지점 ${hit.length}곳이 이 컨셉이에요. 그대로 두면 그 지점 예약이 올해 −${pct(B.cutFirst)}%, 해마다 ${pct(B.cutYear)}%p씩 더, 최대 −${pct(B.cutCap)}%까지 줄어요. 컨셉은 지점 화면에서 나중에도 바꿀 수 있어요${multi <= B.kinds ? ". 컨셉이 세 가지 이상으로 흩어지면 관리 이득이 사라져요" : ""})`, choices: ch };
}

export const PW_CHOOSE = {
  pw_ev(s, r, i, okv, sc) {
    const k = sc?.pwK, c = sc?.choices?.[i] || {}, C = cw(s);
    if (sc?.dzK) { const x = dzOf(s, sc.dzK); if (!x) return []; if (c.pw === "dzhalf") x.half = true; return [`${dn(sc.dzK)} 지점 예약 −${pct(Math.abs(x.v) * (x.half ? DZ_BAL.half : 1))}% · ${Math.round((x.until - s.t) / 12)}년쯤 가요`]; }
    if (!k || !C.sunk[k]) return [];
    if (c.pw === "swap") {
      const out = []; for (const rm of openRooms(s).filter((x) => x.concept === k)) { const to = bestFor(s, rm); if (!to) continue; const f0 = decorFit(rm.concept, rm.decor); rm.concept = to; if (decorFit(to, rm.decor) < f0) rm.decor = bestDecor(to); /* 집기를 갈았다: 꾸밈이 새 컨셉에 맞게 */ out.push(`${rm.name} → ${cn(to)}`); }
      return out.length ? out : ["바꿀 수 있는 컨셉이 없어요"];
    }
    if (c.pw === "half") { C.sunk[k].half = true; return [`'${cn(k)}' 지점 예약 −${pct(sunkCut(s, k))}% · 해마다 조금씩 더 줄어요`]; }
    return [`'${cn(k)}' 지점 예약 −${pct(sunkCut(s, k))}% · 해마다 더 줄어요`];
  },
};

// 시험용: 조건 없이 컨셉 위기 장면을 만든다(내 첫 지점의 컨셉)
export function crisisScene(s) { const rm = openRooms(s)[0]; if (!rm) return null; const C = cw(s); C.sunk[rm.concept] = C.sunk[rm.concept] || { t: s.t }; return scene(s, rm.concept); }
