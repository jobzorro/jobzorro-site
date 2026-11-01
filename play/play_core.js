// 연봉 놀이터 v2 공통 규칙 — 화면(page.js)과 서버(api/src/index.js)가 같이 불러 쓴다.
// DOM 없음. 무작위는 rng(씨앗)만 쓴다 → 같은 날짜·같은 회사 목록이면 누구에게나 같은 문제.
// 점수는 (문제, 답) → 점수 함수로만 계산하고, 서버는 브라우저가 보낸 답으로 다시 계산한다.
// 주의: 'export { ... };' 줄은 파일 맨 끝 한 줄로만 둔다 (make.py 가 미리보기에서 이 줄을 전역 변수로 바꿈).

const RULES = 5;                 // 규칙 판: 점수 규칙을 바꾸면 올린다 (2 = 2026-10-28 오늘의 회사 8지선다, 3 = 이직 로드 요일별 시나리오 팩·엔딩, 4 = 커리어 로드 20년 2026-10-30~, 5 = 오늘의 회사 비교 힌트·월드컵 오늘의 16강 2026-11-01)
const EPOCH = '2026-10-01';      // 오늘의 회사 #1 날짜 (바꾸면 모든 날의 문제가 바뀜)
const RK = ['사원', '대리', '과장', '차장', '부장'];
const DAILY = ['higher', 'today', 'sniper', 'road', 'run', 'cup', 'line'];   // 순위표가 있는 오늘의 도전 (2026-10-29 조로 출근길, 2026-11-01 월드컵 오늘의 16강 · 연봉 줄서기 — 도전장 번호 때문에 뒤에만 붙임. higher 는 로비에서 빠졌지만 지난 기록·도전장 때문에 남김)
const GAMES = DAILY.concat(['endless']);                            // + 플레이 수만 세는 판

// ── 씨앗 있는 난수 (FNV-1a 해시 → mulberry32)
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return h >>> 0;
}
function rng(seed) {
  let a = hash32(String(seed));
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickR(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffleR(r, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// ── 날짜 (모두 한국 시간 'YYYY-MM-DD')
function kstDay(ms) { return new Date((ms == null ? Date.now() : ms) + 9 * 3600e3).toISOString().slice(0, 10); }
function dayMs(day) { return Date.parse(day + 'T00:00:00Z'); }
function addDays(day, n) { return new Date(dayMs(day) + n * 864e5).toISOString().slice(0, 10); }
function dayIndex(day) { return Math.round((dayMs(day) - dayMs(EPOCH)) / 864e5); }
function dow(day) { return new Date(dayMs(day)).getUTCDay(); }   // 0 = 일요일
function isoWeek(day) {
  const wd = (dow(day) + 6) % 7, thu = dayMs(day) + (3 - wd) * 864e5, y = new Date(thu).getUTCFullYear();
  return y + '-W' + String(1 + Math.floor((thu - Date.UTC(y, 0, 1)) / 864e5 / 7)).padStart(2, '0');
}
function weekDays(day) { const mon = addDays(day, -((dow(day) + 6) % 7)); return [0, 1, 2, 3, 4, 5, 6].map(k => addDays(mon, k)); }
function msToMidnight(ms) { const k = (ms == null ? Date.now() : ms) + 9 * 3600e3; return 864e5 - (k % 864e5); }

// ── 회사 자료: make.py 의 행 → 객체. 게임용(P)만 문제에 쓴다. 순서는 make.py 가 고정(직원 많은 순)
function load(D) {
  const all = D.co.map(r => ({ n: r[0], o: r[1], slug: r[2], ind: r[3], m: r[4], rk: r[5], g: r[6], ex: r[7], to: r[8], tt: r[9], s0: r[10],
    sido: r[11], exR: r[12], lg: r[13] || '', lt: r[14] || 0, hl: r[15], grp: r[16], jump: r[17] || 0, rt: r[18] || 0, my: r[19] || 0, pub: r[20], ag: r[21] || 0, yoy: r[22] == null ? null : r[22], up: r[23] == null ? null : r[23] }));
  const by = {}; all.forEach(c => { by[c.n] = c; });
  const P = all.filter(c => c.g), H = P.filter(c => c.hl);   // H: 로고 있는 게임용 회사 (오늘의 회사·스나이퍼)
  H.forEach((c, i) => { c.tier = i < 120 ? 0 : i < 400 ? 1 : 2; });   // 직원 수 순서로 쉬움·보통·어려움
  P.forEach(c => { if (c.tier == null) c.tier = 3; });
  const med = {}, gs = {};
  P.forEach(c => { (gs[c.grp] = gs[c.grp] || []).push(c.rk[2]); });
  Object.keys(gs).forEach(g => { const a = gs[g].sort((x, y) => x - y); med[g] = a[Math.floor(a.length / 2)]; });
  P.forEach(c => { c.twist = c.rk[2] / med[c.grp]; });     // 업종 중간값 대비 과장 연봉 (반전 회사 판정)
  const ver = hash32(P.map(c => [c.n, c.rk.join(','), c.m, c.ex, c.exR, c.to, c.tt, c.s0, c.sido, c.hl, c.grp, c.jump, c.rt, c.my, c.pub, c.ag].join(':')).join('|')).toString(36) + '-' + P.length;
  return { all, by, P, H, med, nego: D.nego, ver };
}

// ── 1 어디가 더 많이 줄까? (오늘의 도전 10문제 · 무한 모드)
const STATS = {
  pay: { lb: '과장 연봉', v: c => c.rk[2], hi: 1 },
  s0: { lb: '신입 기준 연봉', v: c => c.s0 || 0, hi: 1 },
  tt: { lb: '평균 근속', v: c => c.tt || 0, hi: 1 },
  to: { lb: '1년 퇴사율', v: c => c.to || 0, hi: 0 },          // 더 '낮은' 곳을 고른다
  ex: { lb: '임원 평균 연봉', v: c => (c.exR ? c.ex : 0), hi: 1 }, // 공시된 임원 평균만
};
const HIGHER_N = 10, HIGHER_MS = 15000;   // 문제당 15초, 남은 시간 보너스 최대 20점
function higherBand(i) { return i < 3 ? [1.18, 1.8] : i < 7 ? [1.07, 1.3] : [1.02, 1.13]; }
function findPair(r, list, key, b, used, same) {
  const S = STATS[key];
  for (let t = 0; t < 900; t++) {
    const a = pickR(r, list), c = pickR(r, list);
    if (a === c || used[a.n] || used[c.n]) continue;
    if (same && t < 500 && a.grp !== c.grp) continue;
    const va = S.v(a), vc = S.v(c);
    if (!(va > 0 && vc > 0) || (key === 'to' && (va < .01 || vc < .01))) continue;
    const q = Math.max(va, vc) / Math.min(va, vc);
    if (q >= b[0] && q <= b[1]) return [a, c];
  }
  return null;
}
function higherWin(q, ctx) { const S = STATS[q.k], va = S.v(ctx.by[q.a]), vb = S.v(ctx.by[q.b]); return (va > vb) === !!S.hi ? 'a' : 'b'; }
function genHigher(day, ctx) {
  const r = rng('higher|' + day), keys = shuffleR(r, ['pay', 'pay', 's0', 's0', 'tt', 'tt', 'to', 'to', 'ex', 'ex']), used = {}, qs = [];
  const L = ctx.H.filter(c => c.tier < 2);   // 오늘의 도전은 로고 있는 이름난 회사 400곳에서
  for (let i = 0; i < HIGHER_N; i++) {
    let pr = null;
    for (let b = 0; !pr && b < 3; b++) pr = findPair(r, b < 2 ? L : ctx.P, keys[i], b ? [1.02, 3] : higherBand(i), used, r() < .4);
    used[pr[0].n] = used[pr[1].n] = 1;
    qs.push({ a: pr[0].n, b: pr[1].n, k: keys[i] });
  }
  return { game: 'higher', day, qs };
}
// 무한 모드 한 문제: 처음 3문제는 과장 연봉, 그 뒤 기준을 돌리고 연속 기록이 길수록 차이를 좁힌다 (r 은 화면이 아무 씨앗으로 만든 rng)
function endlessQ(r, ctx, round, streak, used) {
  const k = round <= 3 ? 'pay' : pickR(r, ['pay', 'pay', 's0', 'tt', 'to', 'ex']);
  const b = streak < 3 ? [1.15, 1.6] : streak < 7 ? [1.07, 1.25] : [1.02, 1.12];
  const pr = findPair(r, ctx.P, k, b, used, r() < .4) || findPair(r, ctx.P, k, b, {}, false);
  return { a: pr[0].n, b: pr[1].n, k };
}
function higherBonus(ms) { ms = Math.max(0, Math.min(HIGHER_MS, Number(ms) || 0)); return Math.round(20 * (HIGHER_MS - ms) / HIGHER_MS); }
// ans: [{p:'a'|'b'|'', ms}] × 10 → 맞힌 수 × 100 + 남은 시간 보너스 (만점 1,200)
function scoreHigher(pz, ans, ctx) {
  ans = Array.isArray(ans) ? ans : [];
  let score = 0, ok = 0, ms = 0; const per = [];
  pz.qs.forEach((q, i) => {
    const x = ans[i] || {}, t = Math.max(0, Number(x.ms) || 0);
    const hit = (x.p === 'a' || x.p === 'b') && t <= HIGHER_MS && x.p === higherWin(q, ctx);
    const pts = hit ? 100 + higherBonus(t) : 0;
    ok += hit ? 1 : 0; score += pts; ms += Math.min(t, HIGHER_MS); per.push(pts);
  });
  return { score, aux: ok, perfect: ok === HIGHER_N, per, ms };
}

// ── 2 오늘의 회사 (후보 8곳 중 숨은 회사 하나 고르기 · 단서는 하나씩 · 기회 3번) — 2026-10-28 규칙 2
// 정답 고르기는 규칙 1 그대로: 30일 묶음마다 회사 절반(이름 해시 짝·홀)을 번갈아 써서, 이웃한 두 묶음이 겹치지 않음 → 30일 안에 같은 회사 없음
const TODAY_N = 8, TODAY_PICKS = 3, TODAY_CLUES = 5;              // 후보 8곳 · 고르기 3번 · 단서 5개(처음엔 1개 열림)
const TODAY_BASE = 500, TODAY_CLUE = 80, TODAY_MISS = 60, TODAY_FLOOR = 50;   // 500점 − 단서 더 볼 때마다 80 − 틀릴 때마다 60, 맞히면 최소 50
const TODAY_SAME = [3, 5, 7];    // 난이도(쉬움·보통·어려움)별 정답과 같은 업종 묶음 후보 수 (나머지는 다른 업종)
function todayAns(day, ctx) {
  const k = dayIndex(day), blk = Math.floor(k / 30), pos = k - blk * 30, half = ((blk % 2) + 2) % 2;
  const cand = ctx.H.filter(c => (hash32('half|' + c.n) & 1) === half);
  const r = rng('today|' + blk), T = [0, 1, 2].map(t => shuffleR(r, cand.filter(c => c.tier === t))), ptr = [0, 0, 0];
  let ans = null;
  for (let j = 0; j <= pos; j++) {
    const w = dow(addDays(EPOCH, blk * 30 + j));
    const allowed = w === 1 ? [0] : w === 5 ? [1] : (w === 0 || w === 6) ? [2] : [0, 1];   // 월 쉬움 · 화~목 쉬움/보통 · 금 보통 · 주말 어려움
    let t = allowed.length > 1 && r() < .5 ? allowed[1] : allowed[0];
    if (ptr[t] >= T[t].length) t = [0, 1, 2].find(x => ptr[x] < T[x].length);
    ans = T[t][ptr[t]++];
  }
  return ans;
}
// 헷갈리는 후보 7곳: 날짜 씨앗으로 고정(누구에게나 같은 8곳). 같은 업종 묶음에서 직원 수가 비슷한 회사 위주,
// 어려운 날일수록 같은 업종을 많이·직원 수가 더 가까운 회사로. 후보는 정답과 같은 급 이하에서(쉬운 날은 이름난 120곳끼리)
function todayCands(A, day, ctx, N, same) {
  N = N || TODAY_N;
  const r = rng('today8|' + day), t = A.tier, used = { [A.n]: 1 }, out = [];
  const L = ctx.H.filter(c => c.n !== A.n && c.tier <= t);
  const far = c => Math.abs(Math.log(c.m / A.m));
  const take = (list, k) => { shuffleR(r, list).forEach(c => { if (out.length < k && !used[c.n]) { used[c.n] = 1; out.push(c); } }); };
  const near = L.filter(c => c.grp === A.grp).sort((x, y) => far(x) - far(y) || (x.n < y.n ? -1 : 1));
  const want = same != null ? same : TODAY_SAME[t] || 5;   // same: 같은 업종 후보 수 (v3·v4 는 업종 힌트가 쓸모 있게 섞음)
  take(t === 0 ? near : near.slice(0, want + (t === 1 ? 6 : 3)), want);   // 보통: 가까운 11곳 중 5곳 · 어려움: 가까운 10곳 중 7곳
  take(near, want);                                                         // 모자라면 같은 업종 아무 곳
  const rest = L.filter(c => c.grp !== A.grp);
  take(t === 0 ? rest : rest.filter(c => far(c) < Math.log(3)), N - 1);   // 다른 업종: 보통·어려움은 직원 수 3배 안
  take(rest, N - 1);
  return shuffleR(r, out.concat([A])).map(c => c.n);
}
function genToday(day, ctx, v) {
  const A = todayAns(day, ctx);
  v = v || (day >= TODAY2_FROM ? 3 : 1);   // 2026-11-01~ 스무고개 퀴즈 (사용자가 v2 이름 넣기 · v4 카드 + 비교 칸 대신 고름)
  if (v === 4) return { game: 'today', v: 4, day, no: dayIndex(day) + 1, ans: A.n, tier: A.tier, cands: todayCands(A, day, ctx, T4_N, [3, 4, 5][A.tier] || 4) };
  if (v === 3) { const P = t3Premise(A, day, ctx); return { game: 'today', v: 3, day, no: dayIndex(day) + 1, ans: A.n, tier: A.tier, pre: P.pre, cands: P.cands }; }
  if (v === 2) return { game: 'today', v: 2, day, no: dayIndex(day) + 1, ans: A.n, tier: A.tier };
  return { game: 'today', day, no: dayIndex(day) + 1, ans: A.n, tier: A.tier, cands: todayCands(A, day, ctx) };
}
// ── 오늘의 회사 v2 (2026-11-01 사용자: '재미가 없다, 획기적 변화'): 게임에 나오는 회사(로고 있는 곳) 아무 곳이나 이름을 넣어 추측 →
//    추측마다 정답과 비교한 칸 5개(업종·지역·직원 수·사원 연봉·평균 근속). 같으면 초록, 가까우면 노랑, 숫자 칸은 정답이 더 큰지 작은지 화살표.
//    기회 7번. 맞히면 500 − 60 × (틀린 수), 실패 0. 정답 고르기(todayAns)는 그대로
const TODAY2_FROM = '2026-11-01', TODAY2_TRIES = 7, TODAY2_STEP = 60;
const TODAY2_COLS = [['grp', '업종'], ['sido', '지역'], ['m', '직원 수'], ['s', '사원 연봉'], ['tt', '평균 근속']];
// 칸 하나: st = 'g' 같음 · 'y' 가까움 · 'x' 다름 · 'n' 자료 없음, dir = 1 정답이 더 큼 · -1 더 작음 · 0
function today2Cell(k, A, G) {
  if (k === 'grp') return { st: A.grp === G.grp ? 'g' : 'x', dir: 0 };
  if (k === 'sido') return !A.sido || !G.sido ? { st: 'n', dir: 0 } : { st: A.sido === G.sido ? 'g' : 'x', dir: 0 };
  const v = c => k === 'm' ? c.m : k === 's' ? c.rk[0] : c.tt || 0, a = v(A), g = v(G);
  if (!(a > 0 && g > 0)) return { st: 'n', dir: 0 };
  const near = k === 'tt' ? [Math.abs(a - g) <= .5, Math.abs(a - g) <= 2] : k === 'm' ? [a / g <= 1.1 && g / a <= 1.1, a / g <= 1.6 && g / a <= 1.6] : [a / g <= 1.04 && g / a <= 1.04, a / g <= 1.12 && g / a <= 1.12];
  return { st: A.n === G.n || near[0] ? 'g' : near[1] ? 'y' : 'x', dir: A.n === G.n || near[0] ? 0 : a > g ? 1 : -1 };
}
function today2Row(pz, ctx, name) { const A = ctx.by[pz.ans], G = ctx.by[name]; return TODAY2_COLS.map(c => today2Cell(c[0], A, G)); }
// log = 추측한 회사 이름들. 게임 회사(로고 있는 곳)가 아니거나 두 번 넣거나 끝난 뒤 더 넣으면 null
function simToday2(pz, log, ctx) {
  if (!Array.isArray(log) || log.length > TODAY2_TRIES) return null;
  let solved = false, done = false; const seen = {}, seq = [];
  for (const a of log) {
    const c = typeof a === 'string' && ctx.by[a];
    if (done || !c || !c.hl || !c.g || seen[a]) return null;
    seen[a] = 1;
    if (a === pz.ans) { solved = done = true; seq.push('o'); } else seq.push('x');
    if (log.length && seq.length >= TODAY2_TRIES) done = true;
  }
  return { n: log.length, solved, done, wrong: seq.filter(x => x === 'x').length, seq: seq.join('') };
}
// ── 스무고개 퀴즈 (2026-11-01 사용자가 고름 · 2차 규칙 + 먼저 찍기): 후보 카드 12장, 질문은 5번까지(첫 질문 무료, 그 뒤 −50).
//    답과 안 맞는 카드는 탈락. 답을 알면 '먼저 찍기'(틀리면 −150, 2번까지) · 아니면 '최종 선택'에서 정답 + 미끼 1곳 중 하나 (한 번, 틀리면 0점)
//    log: '?r1:7000' 질문 · '!회사' 먼저 찍기 · 마지막 '회사' 최종 선택
const T3_N = 12, T3_MAXQ = 5, T3_FREE = 0, T3_Q = 50, T3_EARLY = 150, T3_EARLY_MAX = 2, T3_FLOOR = 50;
// 질문 = '종류:값'. 숫자는 '그 값보다 큼'. pub 공기업 · my 직원 증가 · jump 성과급 대박 난 해 (값 0)
const T3_KEYS = { grp: c => c.grp, sido: c => c.sido || '', pub: c => (c.pub ? 1 : 0), m: c => c.m, s0: c => c.s0 || 0, r1: c => c.rk[1], r2: c => c.rk[2], r4: c => c.rk[4],
  tt: c => c.tt || 0, to: c => c.to || 0, rt: c => c.rt || 0, ag: c => c.ag || 0, my: c => c.my || 0, jump: c => c.jump || 0,
  // 2026-11-01 추가: 임원 평균 · 사원→부장 몇 배 · 업종 중간값 대비 과장 연봉 · 올해 연봉 인상률(%) · 3년 새 연봉 상승(%) (뒤 둘은 모르면 null)
  ex: c => c.ex || 0, lad: c => Math.round(c.rk[4] / c.rk[0] * 100) / 100, tw: c => Math.round(c.twist * 100) / 100, yoy: c => c.yoy, up: c => c.up };
function t3Ask(c, q) {
  q = String(q || ''); if (q[0] === '~') { const r = t3Ask(c, q.slice(1)); return r === null ? null : !r; }   // '~' = 아니다 (대전제 '1,000명이 안 되는')
  const m = /^([a-z0-9]+):(.{1,24})$/.exec(q); if (!m || !c || !T3_KEYS[m[1]]) return null;
  const v = T3_KEYS[m[1]](c); if (v == null) return null;
  if (m[1] === 'grp' || m[1] === 'sido') return v === m[2];
  const x = Number(m[2]); if (!isFinite(x)) return null;
  return v > x;
}
// 스페셜 힌트 (2026-11-01 사용자: '대전제는 후보 중 안 맞는 것도 있어야 · 그것만으로도 유추할 수 있게'): 정답에 맞는 문장 하나를 날짜 씨앗으로 고르고,
//    후보 12장 중 정답 포함 4~5장만 그 문장에 맞게 뽑음 (안 맞는 카드도 자동으로 지우지 않음 — 힌트를 보고 스스로 추리).
//    쉬운 날(정답이 이름난 회사)은 후보도 이름난 회사 위주. 연봉·규모 같은 재밌는 힌트 먼저, 업종·지역은 마지막에
const T3_PRE = ['r4:10000', 'r1:6000', 'r2:8000', 'm:10000', '~m:1000', 'tt:15', '~tt:6', 'pub:0', 'ag:40', 'my:5', 'rt:3.6', 'jump:0', 's0:5000', '~to:0.05', 'grp:', 'sido:'];
const T3_NEEDS = ['tt', 'rt', 's0', 'to', 'ag', 'ex'];   // 자료가 없으면(0) 힌트로 못 쓰는 칸 (yoy·up 은 null 이 없음)
const t3Has = (c, k) => { const v = T3_KEYS[k](c); return v != null && (T3_NEEDS.indexOf(k) < 0 || v > 0); };
// 2026-11-02~ 힌트 (사용자: '더 재밌게 · 성장성 안정성 · 지표 최대한'): 연봉·임원·연봉 사다리·업계 비교 · 성장성(직원·연봉 인상) · 안정성(근속·퇴사·공기업·업력) · 평점 · 규모
//    '~' 는 그 반대(이하). 문장은 page/05_today.js t3PreTxt
const T3_PRE2_FROM = '2026-11-02';
const T3_PRE2 = ['r4:10000', 's0:5000', 'r1:6000', 'ex:30000', 'lad:2', 'tw:1.2', 'my:5', '~my:-3', 'up:15', 'yoy:5', '~yoy:1',
  'tt:15', '~tt:5', '~to:0.1', 'to:0.3', 'pub:0', 'ag:35', 'rt:3.5', '~rt:2.7', 'grp:', 'sido:'];
const T3_PRE2_TAIL = ['m:10000', '~m:1000'];   // 규모는 흔히 맞아 뒤로 (업종·지역 바로 앞)
function t3Premise(A, day, ctx) {
  const r = rng('t3pre|' + day), list = shuffleR(r, (day >= T3_PRE2_FROM ? T3_PRE2 : T3_PRE).filter(q => q !== 'grp:' && q !== 'sido:')).concat(day >= T3_PRE2_FROM ? T3_PRE2_TAIL : [], ['grp:' + A.grp, A.sido ? 'sido:' + A.sido : '']).filter(Boolean);
  const key = q => q.replace('~', '').split(':')[0], has = t3Has;
  for (const q of list) {
    const k = key(q);
    if (!has(A, k) || t3Ask(A, q) !== true) continue;
    const base = ctx.H.filter(c => c.n !== A.n && has(c, k)), near = base.filter(c => c.tier <= Math.max(1, A.tier)), P = near.length >= 40 ? near : base;
    const yes = P.filter(c => t3Ask(c, q)), no = P.filter(c => !t3Ask(c, q)), ny = 3 + (r() < .5 ? 1 : 0);   // 정답 말고 맞는 카드 3~4장
    if (yes.length < ny || no.length < T3_N - 1 - ny) continue;
    return { pre: q, cands: shuffleR(r, shuffleR(r, yes).slice(0, ny).concat(shuffleR(r, no).slice(0, T3_N - 1 - ny)).map(c => c.n).concat([A.n])) };
  }
  return { pre: '', cands: todayCands(A, day, ctx, T3_N, [4, 5, 6][A.tier] || 5) };
}
function t3Final(pz, alive, log) {   // 최종 두 곳: 정답 + 미끼(남은 카드에서, 다 지웠으면 탈락 카드에서) — 날짜·기록 씨앗이라 서버도 같은 두 곳
  const pool = alive.filter(n => n !== pz.ans), L = pool.length ? pool : pz.cands.filter(n => n !== pz.ans);
  const h = hash32('t3d|' + pz.day + '|' + log.join('|')), d = L[h % L.length];
  return h & 1 ? [pz.ans, d] : [d, pz.ans];
}
function simToday3(pz, log, ctx) {
  if (!Array.isArray(log) || log.length > T3_MAXQ + T3_EARLY_MAX + 1) return null;
  const A = ctx.by[pz.ans]; let alive = pz.cands.slice(), asks = 0, ew = 0, solved = false, done = false, early = false, fin = null; const steps = [], qs = [], seq = [];
  for (let i = 0; i < log.length; i++) {
    const a = log[i];
    if (done || typeof a !== 'string') return null;
    if (a[0] === '?') {
      const q = a.slice(1), yes = t3Ask(A, q); if (yes === null || asks >= T3_MAXQ || qs.indexOf(q) >= 0) return null;
      const out = alive.filter(n => t3Ask(ctx.by[n], q) !== yes); alive = alive.filter(n => out.indexOf(n) < 0);
      asks++; qs.push(q); steps.push({ q, yes, out }); seq.push('q'); continue;
    }
    if (a[0] === '!') {   // 먼저 찍기: 남은 카드에서만, 틀리면 그 카드 탈락 · −150
      const n = a.slice(1); if (alive.indexOf(n) < 0 || ew >= T3_EARLY_MAX) return null;
      if (n === pz.ans) { solved = done = early = true; seq.push('O'); continue; }
      ew++; alive = alive.filter(x => x !== n); steps.push({ g: n, out: [n] }); seq.push('e'); continue;
    }
    fin = t3Final(pz, alive, log.slice(0, i));
    if (fin.indexOf(a) < 0) return null;
    solved = a === pz.ans; done = true; seq.push(solved ? 'o' : 'x');
  }
  return { alive, asks, ew, early, solved, done, steps, fin: fin || t3Final(pz, alive, log), seq: seq.join('') };
}
function today3Pts(asks, ew) { return Math.max(T3_FLOOR, 500 - T3_Q * Math.max(0, asks - T3_FREE) - T3_EARLY * (ew || 0)); }
// 지금 남은 카드를 나누는 질문 칩 (최대 lim 개): 종류마다 반에 가장 가깝게 나누는 값 하나, 나누는 힘 순
const T3_VALS = { m: [300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000], s0: [3000, 3500, 4000, 4500, 5000, 5500, 6000], r1: [4000, 4500, 5000, 5500, 6000, 6500, 7000, 8000],
  r2: [5000, 6000, 7000, 8000, 9000, 10000], r4: [7000, 8000, 9000, 10000, 12000, 15000], tt: [3, 5, 7, 10, 12, 15, 18, 20], to: [.03, .05, .08, .1, .15, .2],
  rt: [3, 3.2, 3.4, 3.6, 3.8, 4], ag: [10, 20, 30, 40, 50], pub: [0], my: [0], jump: [0],
  ex: [10000, 15000, 20000, 30000, 40000], lad: [1.6, 1.8, 2, 2.2], tw: [1], yoy: [2, 3, 5, 7], up: [5, 10, 15, 20] };
function t3Questions(alive, ctx, used, lim, pre) {   // pre = 스페셜 힌트 — 같은 지표로 묻는 질문은 빼요 (2026-11-01 사용자: '1,000명 이하' 힌트에 '3,000명 넘나요?' 질문)
  const C = alive.map(n => ctx.by[n]), N = C.length, cand = [], U = used || {}, PK = String(pre || '').replace('~', '').split(':')[0];
  const bal = q => { const y = C.filter(c => t3Ask(c, q)).length; return y > 0 && y < N ? Math.abs(y - N / 2) / N : null; };
  ['grp', 'sido'].forEach(k => { if (k === PK) return; const seen = {}; C.forEach(c => { const v = T3_KEYS[k](c); if (v && !seen[v]) { seen[v] = 1; const q = k + ':' + v, b = bal(q); if (b != null && !U[q]) cand.push([q, b]); } }); });
  Object.keys(T3_VALS).forEach(k => {
    if (k === PK || C.some(c => !t3Has(c, k))) return;   // 힌트와 같은 지표 · 자료 없는 회사가 있으면 그 질문은 안 냄
    const b = T3_VALS[k].map(v => [k + ':' + v, bal(k + ':' + v)]).filter(x => x[1] != null && !U[x[0]]).sort((a, c) => a[1] - c[1])[0]; if (b) cand.push(b);
  });
  const best = {}; cand.forEach(x => { const k = x[0].split(':')[0]; if (k === 'grp' || k === 'sido') { if (!best[k] || x[1] < best[k][1]) best[k] = x; } });
  const L = cand.filter(x => { const k = x[0].split(':')[0]; return !(k === 'grp' || k === 'sido') || best[k] === x; }).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  return L.slice(0, lim || 6).map(x => x[0]);
}
// ── 오늘의 회사 v4 (2026-11-01 사용자가 고름): v2 와 같은 비교 칸, 대신 이름을 치지 않고 후보 카드 10장에서 고름. 처음에 업종 공개(화면).
//    기회 4번, 틀릴 때마다 −120
const T4_N = 10, T4_TRIES = 4, T4_STEP = 120;
function simToday4(pz, log, ctx) {
  if (!Array.isArray(log) || log.length > T4_TRIES) return null;
  let solved = false, done = false; const seen = {}, seq = [];
  for (const a of log) {
    if (done || typeof a !== 'string' || pz.cands.indexOf(a) < 0 || seen[a]) return null;
    seen[a] = 1;
    if (a === pz.ans) { solved = done = true; seq.push('o'); } else seq.push('x');
    if (seq.length >= T4_TRIES) done = true;
  }
  return { n: log.length, solved, done, wrong: seq.filter(x => x === 'x').length, seq: seq.join('') };
}
function today4Pts(miss) { return Math.max(0, 500 - T4_STEP * miss); }
function today2Pts(miss) { return Math.max(0, 500 - TODAY2_STEP * miss); }
// 결과 이모지: 추측 한 줄에 5칸 (🟩 같음 🟨 가까움 ⬛ 다름·자료 없음)
function today2Emoji(pz, ctx, log) { return log.map(n => today2Row(pz, ctx, n).map(c => c.st === 'g' ? '🟩' : c.st === 'y' ? '🟨' : '⬛').join('')); }
// 단서 5개 (이 순서로 하나씩): 업종 → 직원 수(구간) → 사원 연봉 → 평균 근속 → 평점. 자료가 없으면 다른 칸으로 바꾼다
function sizeBand(m) { return m < 1000 ? '1,000명 미만' : m < 3000 ? '1,000~3,000명' : m < 5000 ? '3,000~5,000명' : m < 10000 ? '5,000명~1만 명' : m < 30000 ? '1만~3만 명' : '3만 명 이상'; }
function ageBand(a) { return a >= 38 ? '38년 이상' : a >= 30 ? '30~37년' : a >= 20 ? '20~29년' : a >= 10 ? '10~19년' : '10년 안'; }
function fmtMan(v) { return Math.round(v).toLocaleString('ko-KR'); }
function todayClues(pz, ctx) {
  const A = ctx.by[pz.ans];
  // 회사 나이(국민연금 첫 가입)는 분사·재등록 회사를 너무 젊게 보여 줘서(삼성전자 30년대) 평균 근속으로 바꿈 (2026-10-28)
  const age = A.tt > 0 ? { k: 'tt', lb: '평균 근속', v: A.tt.toFixed(1) + '년', sub: '' }
    : { k: 'pay', lb: '과장 연봉', v: '약 ' + fmtMan(Math.round(A.rk[2] / 100) * 100) + '만원', sub: '근속 자료가 없어 대신' };
  const last = A.rt > 0 ? { k: 'rt', lb: '평점', v: '★ ' + A.rt.toFixed(1) + ' / 5', sub: '잡플래닛·블라인드 평균' }
    : A.my ? { k: 'my', lb: '직원 증감', v: (A.my > 0 ? '+' : '') + A.my.toFixed(1) + '%', sub: '1년 사이 · 평점 자료가 없어 대신' }
    : { k: 'top', lb: '부장 연봉', v: '약 ' + fmtMan(Math.round(A.rk[4] / 100) * 100) + '만원', sub: '평점 자료가 없어 대신' };
  return [
    { k: 'grp', lb: '업종', v: A.grp, sub: '' },
    { k: 'm', lb: '직원 수', v: sizeBand(A.m), sub: '' },
    { k: 's', lb: '사원 연봉', v: '약 ' + fmtMan(Math.round(A.rk[0] / 100) * 100) + '만원', sub: '연봉 연구소 추정' },
    age, last];
}
// 행동 기록 log: '?' = 다음 단서 보기, 그 밖엔 고른 회사 이름. 말이 안 되는 기록(후보 밖 이름, 두 번 고르기,
// 단서 다 열린 뒤 '?', 끝난 뒤 행동)이면 null. done = 맞혔거나 3번 다 틀림
function simToday(pz, log) {
  if (!Array.isArray(log) || log.length > TODAY_CLUES - 1 + TODAY_PICKS) return null;
  let open = 1, solved = false, done = false; const wrong = [], seq = [];
  for (const a of log) {
    if (done || typeof a !== 'string') return null;
    if (a === '?') { if (open >= TODAY_CLUES) return null; open++; seq.push('c'); continue; }
    if (pz.cands.indexOf(a) < 0 || wrong.indexOf(a) >= 0) return null;
    if (a === pz.ans) { solved = done = true; seq.push('o'); continue; }
    wrong.push(a); seq.push('x'); open = Math.min(TODAY_CLUES, open + 1);   // 틀리면 그 회사는 빠지고 단서가 하나 더 열림
    if (wrong.length >= TODAY_PICKS) done = true;
  }
  return { open, wrong, solved, done, seq: seq.join('') };
}
function todayPts(open, miss) { return Math.max(TODAY_FLOOR, TODAY_BASE - TODAY_CLUE * (open - 1) - TODAY_MISS * miss); }
// ans: {log:[...]} → 맞히면 500 − 80 × (처음 뒤로 더 연 단서) − 60 × (틀린 수), 최소 50 · 실패 0. aux = 맞혔을 때 본 단서 수(1~5), 실패 0
// bad = 말이 안 되거나 덜 끝난 기록 (서버는 받지 않음)
function scoreToday(pz, ans, ctx) {
  if (pz.v === 3) {   // aux = 질문 수 + 1 (맞혔을 때), 실패 0
    const Q = simToday3(pz, ans && ans.log, ctx);
    if (!Q || !Q.done) return { score: 0, aux: 0, solved: false, bad: true, perfect: false, seq: '' };
    return { score: Q.solved ? today3Pts(Q.asks, Q.ew) : 0, aux: Q.solved ? Q.asks + 1 : 0, solved: Q.solved, early: Q.early, ew: Q.ew, seq: Q.seq, perfect: Q.solved && Q.asks <= 1 && !Q.ew, open: Q.asks, wrong: [] };
  }
  if (pz.v === 4) {   // aux = 맞힌 번째(1~4), 실패 0
    const Q = simToday4(pz, ans && ans.log, ctx);
    if (!Q || !Q.done) return { score: 0, aux: 0, solved: false, bad: true, perfect: false, seq: '' };
    return { score: Q.solved ? today4Pts(Q.wrong) : 0, aux: Q.solved ? Q.n : 0, solved: Q.solved, seq: Q.seq, perfect: Q.solved && Q.n <= 2, open: Q.n, wrong: [] };
  }
  if (pz.v === 2) {   // aux = 맞힌 추측 번째(1~7), 실패 0
    const Q = simToday2(pz, ans && ans.log, ctx);
    if (!Q || !Q.done) return { score: 0, aux: 0, solved: false, bad: true, perfect: false, seq: '' };
    return { score: Q.solved ? today2Pts(Q.wrong) : 0, aux: Q.solved ? Q.n : 0, solved: Q.solved, seq: Q.seq, perfect: Q.solved && Q.n <= 2, open: Q.n, wrong: [] };
  }
  const R = simToday(pz, ans && ans.log);
  if (!R || !R.done) return { score: 0, aux: 0, solved: false, bad: true, perfect: false, open: 1, wrong: [], seq: '' };
  const score = R.solved ? todayPts(R.open, R.wrong.length) : 0;
  return { score, aux: R.solved ? R.open : 0, solved: R.solved, open: R.open, wrong: R.wrong, seq: R.seq, perfect: R.solved && R.open <= 2 };
}
// 결과 이모지: 첫 줄 열린 단서 🔎(안 연 칸 ⬜), 둘째 줄 고른 순서 ❌·✅
function todayEmoji(R) { return ['🔎'.repeat(R.open) + '⬜'.repeat(TODAY_CLUES - R.open), R.seq.replace(/c/g, '').replace(/x/g, '❌').replace(/o/g, '✅')]; }
function firstChar(n) { const m = String(n).replace(/^\s*(\(주\)|㈜|주식회사)\s*/, '').match(/[가-힣A-Za-z0-9]/); return m ? m[0].toUpperCase() : '?'; }

// ── 3 연봉 스나이퍼 (5문제, 막대로 연봉 찍기)
const SNIPER_N = 5, SN_LO = 2000, SN_HI = 22000, SN_STEP = 50;
function genSniper(day, ctx) {
  const r = rng('sniper|' + day), ranks = shuffleR(r, [0, 1, 2, 3, 4]), tw = Math.floor(r() * SNIPER_N), used = {};
  const known = ctx.H.filter(c => c.tier < 2), twist = known.filter(c => c.twist >= 1.35 || c.twist <= .72);
  const qs = ranks.map((ri, i) => {
    const L = i === tw && twist.length ? twist : known;
    let c = null;
    for (let t = 0; t < 600; t++) { c = pickR(r, L); if (!used[c.n] && c.rk[ri] < SN_HI - 500 && c.rk[ri] > SN_LO + 300) break; }
    used[c.n] = 1;
    return { n: c.n, ri, tw: i === tw ? 1 : 0 };
  });
  return { game: 'sniper', day, qs };
}
function sniperErr(truth, v) { return Math.round((v - truth) / truth * 1000) / 10; }   // 부호 있는 오차 %, 소수 첫째 자리
function sniperPts(e) { e = Math.abs(e); return e <= 3 ? 100 : Math.max(0, 100 - 4 * Math.ceil(e - 3 - 1e-9)); }   // 3% 이내 100점, 그 뒤 1%마다 4점↓
function sniperVal(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.max(SN_LO, Math.min(SN_HI, Math.round(v / SN_STEP) * SN_STEP)) : null; }
// ans: [찍은 값(만원)] × 5 → 문제별 점수 합 (최대 500)
function scoreSniper(pz, ans, ctx) {
  ans = Array.isArray(ans) ? ans : [];
  let score = 0; const per = [], errs = [];
  pz.qs.forEach((q, i) => {
    const v = sniperVal(ans[i]), truth = ctx.by[q.n].rk[q.ri];
    const e = v == null ? null : sniperErr(truth, v), pts = e == null ? 0 : sniperPts(e);
    score += pts; per.push(pts); errs.push(e);
  });
  return { score, aux: errs.filter(e => e != null).length, perfect: score >= 450, per, errs };
}

// ── 4 이직 로드 10년 (2년마다 고르기 × 5번)
// 연차 x(0부터)의 그 회사 연봉: 4년마다 한 직급 승진, 부장 뒤엔 연 1%(최대 10%)
function curve(c, x) {
  x = Math.max(0, x);
  const i = Math.min(4, Math.floor(x / 4)), f = (x - 4 * i) / 4;
  return i < 4 ? c.rk[i] + (c.rk[i + 1] - c.rk[i]) * f : c.rk[4] * Math.min(1.1, 1 + .01 * (x - 16));
}
// 이직 협상 인상률: 고객 실측 분포(p25·p50·p75)를 이은 꺾은선에서 u(0~1) 자리 값
function negoMul(u, N) {
  const a = N.p25 - (N.p50 - N.p25), z = N.p75 + (N.p75 - N.p50);
  return u < .25 ? a + (N.p25 - a) * u / .25 : u < .5 ? N.p25 + (N.p50 - N.p25) * (u - .25) / .25
    : u < .75 ? N.p50 + (N.p75 - N.p50) * (u - .5) / .25 : N.p75 + (z - N.p75) * Math.min(1, (u - .75) / .25);
}
// 시나리오 팩 (규칙 3, 2026-10-28): 요일로만 정한다 → 같은 날은 누구나 같은 팩, 서버도 날짜(시작 표의 날)로 같은 팩.
// 브라우저가 팩을 보내지 않는다. 일 공기업 · 월 신입 · 화 중고신입 · 수 개발자 · 목 신입 · 금 중고신입 · 토 공기업
const ROAD_SC = { new: '신입 공채', jr: '중고신입', dev: '개발자', pub: '공기업 준비생' };
const ROAD_WEEK = ['pub', 'new', 'jr', 'dev', 'new', 'jr', 'pub'];   // 0 = 일요일
// 팩 돌리기 시작일: 이 날 전에는 모두 신입 공채(규칙 2 와 같은 문제) → 이 날 전에 서버·화면을 다시 올려도 그날 문제가 안 바뀜.
// 2026-10-29(목)도 원래 신입 날이라 실제로 다른 팩이 처음 나오는 날은 10-30(금, 중고신입)
const ROAD_SC_FROM = '2026-10-29';
function roadScen(day) { return day < ROAD_SC_FROM ? 'new' : ROAD_WEEK[dow(day)]; }
const DEV_GRP = { 'IT·게임': 1, '통신·미디어': 1, '반도체·전자': 1 };
function devCo(c) { return !!DEV_GRP[c.grp]; }
function genRoad1(day, ctx) {
  const sc = roadScen(day);
  if (sc !== 'new') return genRoadSc(sc, day, ctx);
  // 신입 공채: 규칙 2 와 한 글자도 다르지 않게 (같은 날 같은 문제 · 같은 점수)
  const r = rng('road|' + day), used = {}, P = ctx.P;
  const hiPay = P.slice().sort((a, b) => b.rk[2] - a.rk[2] || (a.n < b.n ? -1 : 1)).slice(0, 250);
  const take = (list, f) => {
    for (let t = 0; t < 400; t++) { const c = pickR(r, list); if (!used[c.n] && (!f || f(c))) { used[c.n] = 1; return c; } }
    const c = list.find(x => !used[x.n]) || P.find(x => !used[x.n]); used[c.n] = 1; return c;
  };
  const sz = [P.filter(c => c.m >= 5000), P.filter(c => c.m >= 1500 && c.m < 5000), P.filter(c => c.m < 1500)];
  const u3 = () => [0, 1, 2].map(() => [r(), r(), r()]);   // 카드마다 [이직 실패, 협상, 사건] 주사위 — 같은 날 같은 선택이면 같은 결과
  const steps = [{ o: shuffleR(r, sz.map(L => ({ n: take(L.length ? L : P).n, kind: 'new' }))), u: u3() }];
  for (let k = 1; k < 5; k++) {
    const A = take(hiPay), B = take(P, c => c.my >= 8 || (c.rt && c.rt < 3.2) || c.jump);   // 한 직급 위 제안은 흔들리거나 급성장하는 회사에서
    steps.push({ o: shuffleR(r, [{ n: A.n, kind: 'same' }, { n: B.n, kind: 'up' }]), u: u3() });
  }
  return { game: 'road', day, sc, steps };
}
// 다른 팩 3개: 회사 고르는 곳만 다르고 주사위·제안 모양은 신입과 같다
//   중고신입: 작은 회사(직원 1,500명 미만) 2년 차에서 출발(x0 = 2, home). 첫 고르기는 큰 회사 '중고신입' 제안 2장 + 남기
//   개발자: IT·게임·통신·미디어·반도체·전자 회사 위주, 그 회사에선 '스톡옵션' 사건(급성장 회사일수록 큼)
//   공기업 준비생: 첫 직장은 공공기관 3곳, 그 뒤 공공기관 경력 공채(같은 직급) vs 민간 한 직급 위 제안. 공공기관은 구조조정이 드묾
function genRoadSc(sc, day, ctx) {
  const r = rng('road|' + sc + '|' + day), used = {}, P = ctx.P;
  const byPay = L => L.slice().sort((a, b) => b.rk[2] - a.rk[2] || (a.n < b.n ? -1 : 1));
  const take = (list, f) => {
    for (let t = 0; t < 400; t++) { const c = pickR(r, list); if (!used[c.n] && (!f || f(c))) { used[c.n] = 1; return c; } }
    const c = list.find(x => !used[x.n] && (!f || f(x))) || list.find(x => !used[x.n]) || P.find(x => !used[x.n]); used[c.n] = 1; return c;
  };
  const u3 = () => [0, 1, 2].map(() => [r(), r(), r()]);
  const shaky = c => c.my >= 8 || (c.rt && c.rt < 3.2) || c.jump;
  const pz = { game: 'road', day, sc, steps: [] };
  if (sc === 'jr') {
    const home = take(P.filter(c => c.m < 1500 && c.m >= 200));
    pz.x0 = 2; pz.home = home.n;
    const big = [P.filter(c => c.m >= 5000), P.filter(c => c.m >= 1500 && c.m < 5000)];
    pz.steps.push({ o: shuffleR(r, big.map(L => ({ n: take(L).n, kind: 'jr' }))), u: u3() });
    const hiPay = byPay(P).slice(0, 250);
    for (let k = 1; k < 5; k++) { const A = take(hiPay), B = take(P, shaky); pz.steps.push({ o: shuffleR(r, [{ n: A.n, kind: 'same' }, { n: B.n, kind: 'up' }]), u: u3() }); }
  } else if (sc === 'dev') {
    const DV = P.filter(devCo), hiPay = byPay(DV).slice(0, 50);
    const sz = [DV.filter(c => c.m >= 3000), DV.filter(c => c.m >= 800 && c.m < 3000), DV.filter(c => c.m < 800)];
    pz.steps.push({ o: shuffleR(r, sz.map(L => ({ n: take(L.length ? L : DV).n, kind: 'new' }))), u: u3() });
    for (let k = 1; k < 5; k++) { const A = take(hiPay), B = take(DV, shaky); pz.steps.push({ o: shuffleR(r, [{ n: A.n, kind: 'same' }, { n: B.n, kind: 'up' }]), u: u3() }); }
  } else {
    const PB = P.filter(c => c.pub), priv = byPay(P.filter(c => !c.pub)).slice(0, 250);
    const sz = [PB.filter(c => c.m >= 5000), PB.filter(c => c.m >= 2000 && c.m < 5000), PB.filter(c => c.m < 2000)];
    pz.steps.push({ o: shuffleR(r, sz.map(L => ({ n: take(L.length ? L : PB).n, kind: 'new' }))), u: u3() });
    for (let k = 1; k < 5; k++) { const A = take(PB), B = take(priv); pz.steps.push({ o: shuffleR(r, [{ n: A.n, kind: 'same' }, { n: B.n, kind: 'up' }]), u: u3() }); }
  }
  return pz;
}
// 제안 카드: 가운데 값 O, 보이는 범위(협상 결과 ±약 10%), 스펙 대비 너무 높은 제안(reach)
// 'jr'(중고신입): 큰 회사 신입 연봉 + 경력 일부 인정 5% — 지금 연봉보다 30% 넘게 높으면 떨어질 수 있음
function roadOffer(ctx, o, x, s) {
  const T = ctx.by[o.n], N = ctx.nego;
  const O = o.kind === 'new' ? (T.s0 || T.rk[0] * .92) : o.kind === 'jr' ? (T.s0 || T.rk[0] * .92) * 1.05
    : Math.max(s * .92, Math.min(curve(T, x + (o.kind === 'up' ? 4 : 0)), s * 1.5));
  return { O, lo: Math.round(O * negoMul(0, N) / N.p50 / 100) * 100, hi: Math.round(O * negoMul(1, N) / N.p50 / 100) * 100,
    reach: o.kind !== 'new' && O >= s * 1.3 };
}
function roadRisk(c) { return Math.min(.25, Math.max(.03, (c.to || 0) * 1.5)) + (c.rt && c.rt < 3 ? .08 : 0) + (c.my <= -10 ? .05 : 0); }
// 팩까지 넣은 구조조정 확률 (공기업 준비생 팩의 공공기관은 0.3배)
function roadRiskSc(pz, c) { const p = roadRisk(c); return pz.sc === 'pub' && c.pub ? p * .3 : p; }
function roadPicks(picks) { return [0, 1, 2, 3, 4].map(k => { const p = Math.floor(Number((picks || [])[k])); return p >= 0 && p <= 2 ? p : 2 - (k === 0 ? 2 : 0); }); }
// 출발점: 신입은 취준생(연차 0, 회사 없음), 중고신입은 home 회사 x0 년 차(작년 연봉 = 그 회사 곡선)
function roadStart(pz, ctx) { const c = pz.home ? ctx.by[pz.home] : null, x = pz.x0 || 0; return { x, c, s: c ? curve(c, x - 1) : 0 }; }
// picks: [0~2] × 5 (첫 칸은 첫 직장 3곳 중 하나(중고신입은 0·1 제안, 2 남기), 그 뒤 0·1 = 제안, 2 = 남기)
function simRoad1(pz, ctx, picks) {
  picks = roadPicks(picks);
  const N = ctx.nego, years = [], log = [], S0 = roadStart(pz, ctx);
  let x = S0.x, s = S0.s, c = S0.c;
  for (let k = 0; k < 5; k++) {
    const st = pz.steps[k], p = picks[k], u = st.u[p], o = (k === 0 && !pz.home) || p < 2 ? st.o[p] : null;
    let moved = false, failed = false, start = 0, nego = 0;
    if (o) {
      const of = roadOffer(ctx, o, x, s);
      if (of.reach && u[0] < .35) failed = true;          // 이직 실패: 스펙 대비 너무 높은 제안은 35% 확률로 떨어짐
      else { moved = true; c = ctx.by[o.n]; nego = k ? negoMul(u[1], N) / N.p50 : 1; start = of.O * nego; }
    }
    if (!moved) start = s * curve(c, x) / curve(c, x - 1);   // 남으면 그 회사 곡선대로
    let y2 = start * curve(c, x + 1) / curve(c, x), ev = '', bonus = 0;
    const pr = roadRiskSc(pz, c);
    if (u[2] < pr) { ev = 'cut'; y2 = start; }                                                  // 구조조정: 2년째 연봉 동결
    else if (pz.sc === 'dev' && devCo(c) && u[2] > .78) { ev = 'stock'; bonus = start * (c.my >= 8 ? .9 : .35); }   // 개발자 팩: 스톡옵션
    else if (c.jump && u[2] < pr + .6) { ev = 'jump'; bonus = start * Math.min(c.jump, 80) / 100 * .5; }  // 성과급 큰 해
    else if (u[2] > .9) { ev = 'star'; y2 *= 1.05; }                                          // 고과 S
    years.push(Math.round(start), Math.round(y2 + bonus));
    log.push({ k, x, pick: p, o: o ? o.n : '', kind: o ? o.kind : 'stay', co: c.n, moved, failed, ev,
      start: Math.round(start), y2: Math.round(y2), bonus: Math.round(bonus), nego: Math.round(nego * 1000) / 1000 });
    s = y2; x += 2;
  }
  const total = years.reduce((a, b) => a + b, 0), e = years.findIndex(v => v >= 10000);
  return { years, log, total, eok: e < 0 ? 0 : e + 1, picks };
}
// 점수 = 10년 누적 연봉(만원), aux = 1억 찍은 연차(0 = 못 찍음)
function scoreRoad1(pz, ans, ctx) { const R = simRoad1(pz, ctx, ans); return { score: R.total, aux: R.eok, perfect: false, picks: R.picks, R }; }

// ── 4-1 엔딩 7종 (도감). 길 결과만으로 정하는 규칙 — 서버도 같은 함수로 다시 낼 수 있다. 위에서부터 처음 맞는 것
//   startup 스타트업 대박   : 직원이 1년에 8% 넘게 느는 회사에서 성과급 큰 해 또는 스톡옵션
//   boss    억대 연봉 부장  : 그날 가능한 길 243개 중 누적 상위 5% 안 + 연봉 1억 찍음
//   hopper  이직의 신       : 이직 4번 이상 성공 (신입 팩의 첫 직장은 이직이 아님, 중고신입은 첫 고르기도 이직)
//   lifer   대기업 정년각   : 첫 회사(직원 5,000명 이상)에서 한 번도 안 옮기고(이직 실패도 없음), 구조조정 1번 이하
//   survivor 구조조정 생존자: 구조조정 2번 넘김
//   burnout 번아웃 퇴사     : 평점 3.0 미만 회사에서 6년(3번) 넘게 연속
//   normal  무난한 직장인   : 그 밖
const ENDINGS1 = [['startup', '스타트업 대박'], ['boss', '억대 연봉 부장'], ['hopper', '이직의 신'], ['lifer', '대기업 정년각'],
  ['survivor', '구조조정 생존자'], ['burnout', '번아웃 퇴사'], ['normal', '무난한 직장인']];
const roadTopCache = new WeakMap();
// 그날 문제의 길 3^5 = 243개 누적 연봉, 큰 순서 (문제 객체마다 한 번만 계산)
function roadTotals(pz, ctx) {
  let a = roadTopCache.get(pz);
  if (!a) { a = []; for (let n = 0; n < 243; n++) a.push(simRoad1(pz, ctx, [0, 1, 2, 3, 4].map(k => Math.floor(n / 3 ** k) % 3)).total); a.sort((x, y) => y - x); roadTopCache.set(pz, a); }
  return a;
}
function roadEnding1(pz, ctx, picks) {
  const R = simRoad1(pz, ctx, picks), L = R.log, by = ctx.by;
  const moves = L.filter(l => l.moved && (l.k > 0 || !!pz.home)).length, cuts = L.filter(l => l.ev === 'cut').length;
  let run = 0, low = 0;
  L.forEach(l => { const c = by[l.co]; run = c.rt > 0 && c.rt < 3 ? run + 1 : 0; low = Math.max(low, run); });
  const top = roadTotals(pz, ctx), cut5 = top[Math.ceil(top.length * .05) - 1];
  const id = L.some(l => (l.ev === 'jump' || l.ev === 'stock') && by[l.co].my >= 8) ? 'startup'
    : R.total >= cut5 && R.eok > 0 ? 'boss'
    : moves >= 4 ? 'hopper'
    : moves === 0 && !L.some(l => l.failed) && cuts <= 1 && by[L[0].co].m >= 5000 ? 'lifer'
    : cuts >= 2 ? 'survivor'
    : low >= 3 ? 'burnout'
    : 'normal';
  return { id, lb: ENDINGS1.find(e => e[0] === id)[1], moves, cuts, low, top: top.indexOf(R.total) + 1, R };
}

// ── 4-2 커리어 로드 20년 (규칙 4, 2026-10-30 설계)
//   20년 = 4장(봄·여름·가을·겨울) × 5년. 고르기 17번: 맨 앞 성별(0 여자 · 1 남자) + 갈림길 16칸
//   갈림길 종류: job(이직 갈림길 5번, 회사 제안은 10년 판과 같은 방식) · work(회사 사건) · life(개인사)
//   게이지 3개: hp 체력 · cr 커리어 · hap 행복(개인사). 종합점수 = 20년 누적 연봉 점수 + 게이지 점수
//   같은 날 같은 성별·같은 선택이면 누구나 같은 사건·같은 결과(씨앗). 서버도 이 함수로 다시 계산한다.
const ROAD2_FROM = '2026-10-30';   // 이 날부터 20년 판 (그 전 날짜는 10년 판 그대로)
function roadV(day) { return day >= ROAD2_FROM ? 2 : 1; }
// 2026-11-02 판부터 사건 덱 확장(v3): 연애·늦은 결혼·이혼·재혼·늦은 아이·둘째·창업 아이템 고르기·대학원 전공 고르기 등. 그 전 날은 예전 덱 그대로
const ROAD3_FROM = '2026-11-02';
function road3(day) { return day >= ROAD3_FROM || (typeof globalThis !== 'undefined' && globalThis.__ROAD3 === true); }   // __ROAD3 = 미리보기 전용 (서버엔 없음)
// 주간 순위·명예의 전당을 쉬는 주 (2026-10-30 사용자: 10년 → 20년 개편 주는 점수 단위가 섞여 이직 로드 주간 순위 제외)
const WEEK_OFF = { road: ['2026-W44'] };
function weekOff(game, day) { return (WEEK_OFF[game] || []).indexOf(isoWeek(day)) >= 0; }
// [연차 y(0부터), 종류] — 장마다 4칸, 장 마지막 해(4·9·14·19)는 조용히 지나가는 해
const R2_SLOTS = [[0, 'job'], [1, 'work'], [2, 'life'], [3, 'job'], [5, 'work'], [6, 'life'], [7, 'job'], [8, 'work'],
  [10, 'life'], [11, 'work'], [12, 'job'], [13, 'life'], [15, 'work'], [16, 'job'], [17, 'life'], [18, 'work']];
const R2_N = R2_SLOTS.length + 1;
// 점수: 누적 연봉 1억당 25점 + 게이지(0~100) 셋 각 2점
const R2_W = { money: 25, hp: 2, cr: 2, hap: 2 };
function r2Score(total, S) { return Math.round(total / 10000 * R2_W.money + S.hp * R2_W.hp + S.cr * R2_W.cr + S.hap * R2_W.hap); }
function genRoad2(day, ctx) {
  const base = genRoad1(day, ctx), r = rng('road2|' + day), P = ctx.P;
  const used = {}; base.steps.forEach(st => st.o.forEach(o => { used[o.n] = 1; }));
  if (base.home) used[base.home] = 1;
  const mid = P.filter(c => !used[c.n] && c.m >= 300 && c.m < 3000 && !c.pub);   // 다시 들어가는 회사(희망퇴직·창업 실패·재취업 뒤)
  const spare = [0, 1, 2].map(() => { const c = pickR(r, mid.length ? mid : P); used[c.n] = 1; return c.n; });
  const ed = R2_SLOTS.map(() => r()), u = R2_SLOTS.map(() => [0, 1, 2].map(() => [r(), r(), r()])), yd = Array.from({ length: 20 }, () => r());
  return Object.assign({}, base, { v: 2, spare, ed, u, yd, v3: road3(day) ? 1 : 0, dk: day });
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function r2Add(S, d) { ['hp', 'cr', 'hap'].forEach(k => { if (d[k]) S[k] = clamp(S[k] + d[k], 0, 100); }); }
const PARTNER = '배우자';
// ── 사건 덱. t 종류 · ch [처음 장, 끝 장] · g 성별(null 공통) · c 조건 · w 무게 · q 상황 · o 고르기
//    o 하나 = { lb 이름, h 미리보기 {m 연봉, hp, cr, hap: -2~+2}, f(S, u) → 결과 한 줄 }
//    f 안에서: r2Add 게이지, S.raise 연봉 배수(이후 계속), S.mul 올해 수입 배수, S.bonus 올해 일시금, S.freeze 동결 햇수, S.hunt 다음 이직 협상 유리
const R2_EV = {
  // ── 회사 사건
  w_weekend: { t: 'work', ch: [0, 2], q: S => '팀장님이 조심스럽게 물었다. "이번 분기 큰 프로젝트, 맡아 볼래요? 주말도 좀 써야 할 거예요."',
    o: () => [
      { lb: '맡는다', h: { cr: 2, hp: -1, m: 1 }, f: (S, u) => { r2Add(S, { cr: 8, hp: -8 }); if (u[0] < .5) { S.bonus += S.s * .08; return '프로젝트가 잘 끝났다. 특별 성과급을 받았다.'; } return '결과는 평범했다. 그래도 일을 크게 보는 법을 배웠다.'; } },
      { lb: '이번엔 사양한다', h: { hap: 1, cr: -1 }, f: S => { r2Add(S, { hap: 3, cr: -2, hp: 2 }); return '주말은 지켰다. 프로젝트는 동기에게 돌아갔다.'; } }] },
  w_study: { t: 'work', ch: [0, 2], q: () => '퇴근 후 다니는 야간 대학원과 직무 자격증 과정 안내 메일이 왔다.',
    o: () => [
      { lb: '대학원에 등록한다', h: { cr: 2, hp: -1, hap: -1 }, f: S => { r2Add(S, { cr: 10, hp: -6, hap: -2 }); S.cert = 1; return '2년 동안 저녁이 없었다. 대신 이력서에 굵은 한 줄이 생겼다.'; } },
      { lb: '자격증만 딴다', h: { cr: 1 }, f: S => { r2Add(S, { cr: 5, hp: -2 }); return '주말 몇 달을 들여 자격증을 땄다.'; } },
      { lb: '지금은 쉰다', h: { hp: 1 }, f: S => { r2Add(S, { hp: 4, hap: 1 }); return '퇴근 후엔 그냥 쉬었다. 그것도 필요했다.'; } }] },
  w_mentor: { t: 'work', ch: [1, 2], q: () => '신입 후배의 사수를 맡아 달라는 부탁을 받았다.',
    o: () => [
      { lb: '맡는다', h: { cr: 1, hap: 1, hp: -1 }, f: S => { r2Add(S, { cr: 4, hap: 4, hp: -3 }); return '가르치면서 내가 더 배웠다. 후배는 지금도 연락을 한다.'; } },
      { lb: '내 일이 먼저다', h: { cr: 1 }, f: S => { r2Add(S, { cr: 2, hap: -1 }); return '내 일에 집중했다. 조금 미안한 마음은 남았다.'; } }] },
  w_conflict: { t: 'work', ch: [0, 3], c: (S, c) => !c.rt || c.rt < 3.6, q: () => '새로 온 팀장과 자꾸 부딪힌다. 회의가 끝나면 머리가 지끈거린다.',
    o: () => [
      { lb: '참고 버틴다', h: { hp: -1, cr: 1 }, f: S => { r2Add(S, { hp: -7, cr: 2 }); return '1년을 버텼다. 팀장이 먼저 다른 부서로 갔다.'; } },
      { lb: '인사팀과 면담한다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .55) { r2Add(S, { hap: 6 }); return '다른 팀으로 옮겼다. 숨통이 트였다.'; } r2Add(S, { cr: -4, hap: -3 }); return '면담 이야기가 팀장 귀에 들어갔다. 한동안 불편했다.'; } },
      { lb: '이직을 준비한다', h: { cr: 1, hp: -1 }, f: S => { r2Add(S, { hp: -2, cr: 1 }); S.hunt = 1; return '헤드헌터 몇 명에게 이력서를 보내 두었다. 다음 제안은 협상이 수월할 것 같다.'; } }] },
  w_reorg: { t: 'work', ch: [0, 3], c: (S, c) => c.my >= 8 || c.my <= -5, w: 1.3, q: () => '조직 개편 공지. 새로 생기는 팀에 사람을 모은다고 한다.',
    o: () => [
      { lb: '새 팀에 자원한다', h: { cr: 2, hp: -1 }, f: (S, u) => { if (u[0] < .6) { r2Add(S, { cr: 8 }); S.raise *= 1.03; return '새 팀이 자리를 잡았다. 연봉도 조금 올랐다.'; } r2Add(S, { cr: 2, hp: -5 }); return '새 팀은 1년 만에 다시 쪼개졌다. 고생만 했다.'; } },
      { lb: '지금 자리에 남는다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 1 }); return '남았다. 바뀐 건 자리 배치 정도였다.'; } }] },
  w_cut: { t: 'work', ch: [1, 3], c: (S, c, pz) => !S.su && !S.retired && roadRiskSc(pz, c) >= .1, w: 2, q: () => '구조조정 소문이 현실이 됐다. "앞으로 2년 연봉 동결"이라는 공지가 붙었다.',
    o: S => [
      { lb: '버틴다', h: { m: -1, hp: -1 }, f: S => { S.freeze = 2; S.cuts++; r2Add(S, { hp: -5, cr: 1 }); return '2년 동안 연봉이 그대로였다. 그래도 자리는 지켰다.'; } },
      { lb: '희망퇴직하고 옮긴다', h: { m: 0, hap: -1 }, f: (S, u, ctx, pz) => { S.bonus += S.s * .6; S.mul = .7; S.cuts++; r2Move(S, ctx.by[pz.spare[0]], S.s * .97); r2Add(S, { hap: -3 }); return '위로금을 받고 나왔다. 몇 달 쉬고 ' + S.cname + '에 들어갔다.'; } }] },
  w_head: { t: 'work', ch: [0, 3], c: S => !S.retired && !S.su, q: () => '모르는 번호로 전화가 왔다. 헤드헌터였다. "지금보다 조건 좋은 자리가 있어요."',
    o: () => [
      { lb: '면접만 본다', h: { cr: 1, hp: -1 }, f: S => { S.hunt = 1; r2Add(S, { cr: 2, hp: -2 }); return '시장에서 내 값이 얼마인지 알게 됐다. 다음 이직 협상이 유리해졌다.'; } },
      { lb: '정중히 끊는다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 2 }); return '지금 자리가 좋다고 답했다. 번호는 저장해 두었다.'; } }] },
  w_overseas: { t: 'work', ch: [1, 2], c: (S, c) => c.m >= 3000 && !S.su, q: () => '해외 법인 3년 파견 공고가 났다. 지원자가 많지 않다고 한다.',
    o: S => [
      { lb: '지원한다', h: { cr: 2, m: 1, hap: -1 }, f: S => { r2Add(S, { cr: 10, hp: -3, hap: S.married ? -8 : -2 }); S.raise *= 1.06; S.abroad = 1; return S.married ? '3년을 떨어져 지냈다. 영상 통화가 일상이 됐다.' : '낯선 도시에서 3년. 일도 사람도 넓어졌다.'; } },
      { lb: '여기서의 생활이 먼저다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 3 }); return '남았다. 파견은 후배가 갔다.'; } }] },
  w_side: { t: 'work', ch: [0, 2], q: () => '퇴근 후 사이드 프로젝트를 같이 하자는 친구의 연락이 왔다.',
    o: () => [
      { lb: '같이 한다', h: { cr: 1, hp: -1, m: 1 }, f: (S, u) => { r2Add(S, { cr: 5, hp: -5, hap: 2 }); if (u[0] < .22) { S.bonus += S.s * .3; return '작은 서비스가 예상보다 잘 됐다. 쏠쏠한 부수입이 생겼다.'; } return '돈은 안 됐지만, 만드는 재미를 알았다.'; } },
      { lb: '응원만 한다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 2, hp: 1 }); return '응원만 했다. 친구는 꽤 오래 그 일을 했다.'; } }] },
  w_star: { t: 'work', ch: [1, 3], q: () => '연말 평가 시즌. 함께 낸 큰 성과를 누구 몫으로 적을지 고민된다.',
    o: () => [
      { lb: '내 성과로 강하게 쓴다', h: { m: 1, cr: 1, hap: -1 }, f: (S, u) => { if (u[0] < .55) { S.raise *= 1.05; r2Add(S, { cr: 5 }); return '고과 S. 연봉이 한 번 더 올랐다.'; } r2Add(S, { hap: -5, cr: 1 }); return '평가는 그대로였고, 팀 분위기만 차가워졌다.'; } },
      { lb: '팀 몫으로 나눈다', h: { hap: 1, cr: 1 }, f: S => { r2Add(S, { hap: 5, cr: 2 }); return '팀이 나를 다시 봤다. 다음 프로젝트에 다들 나를 불렀다.'; } }] },
  w_night: { t: 'work', ch: [0, 3], c: (S, c) => !c.rt || c.rt < 3.4, w: 1.2, q: () => '마감 시즌. 몇 주째 밤 11시 퇴근이다.',
    o: () => [
      { lb: '끝까지 달린다', h: { cr: 1, hp: -2 }, f: S => { r2Add(S, { cr: 5, hp: -9 }); return '마감은 맞췄다. 거울 속 얼굴이 낯설었다.'; } },
      { lb: '칼퇴를 지킨다', h: { hp: 1, cr: -1 }, f: S => { r2Add(S, { hp: 3, cr: -3 }); return '정시에 나왔다. 눈치는 좀 보였다.'; } }] },
  w_founder: { t: 'work', ch: [1, 3], w: 1.6, c: S => S.cr >= 45 && !S.su && !S.retired, q: () => '예전 동료가 차린 회사에서 합류 제안이 왔다. 연봉은 깎이지만 지분을 준다고 한다.',
    o: () => [
      { lb: '합류한다', h: { m: -1, cr: 1, hap: 1 }, f: (S, u, ctx, pz) => { S.su = 1; S.suY = S.y + 3; S.suU = u[0]; S.moves++; S.cname = '동료의 스타트업'; S.s *= .85; r2Add(S, { cr: 4, hap: 4, hp: -4 }); return '명함이 바뀌었다. 3년 뒤에 결판이 난다.'; } },
      { lb: '거절한다', h: { hap: 0 }, f: S => { r2Add(S, { hap: 1 }); return '응원한다고 답했다. 가끔 소식을 찾아본다.'; } }] },
  w_retire: { t: 'work', ch: [3, 3], c: (S, c) => !S.su && !S.retired && c.m >= 1000, w: 1.5, q: () => '희망퇴직 공고가 났다. 위로금 조건이 나쁘지 않다.',
    o: () => [
      { lb: '신청하고 2막을 연다', h: { m: 0, hap: 2, hp: 1 }, f: S => { S.bonus += S.s * 1.2; S.retired = 1; S.cname = '인생 2막(작은 회사·자문)'; S.s *= .55; r2Add(S, { hap: 8, hp: 8 }); return '위로금을 받고 나왔다. 일은 줄었고, 저녁이 생겼다.'; } },
      { lb: '정년까지 간다', h: { hp: -1 }, f: S => { r2Add(S, { hp: -2, cr: 2 }); return '남았다. 사무실이 조금 조용해졌다.'; } }] },
  w_quietW: { t: 'work', ch: [0, 3], w: .3, q: () => '큰일 없는 한 해. 일이 손에 익었다.',
    o: () => [
      { lb: '업무를 넓힌다', h: { cr: 1 }, f: S => { r2Add(S, { cr: 4, hp: -2 }); return '옆 팀 일까지 배워 두었다.'; } },
      { lb: '여유를 즐긴다', h: { hp: 1, hap: 1 }, f: S => { r2Add(S, { hp: 3, hap: 2 }); return '오랜만에 숨을 골랐다.'; } }] },
  // 성별 사건 (회사)
  w_glass: { t: 'work', ch: [1, 2], g: 0, w: 1.4, q: () => '같은 성과를 낸 동기가 먼저 승진했다. 이유를 물으니 "다음엔 꼭"이라는 답만 돌아왔다.',
    o: () => [
      { lb: '근거를 들고 이의를 낸다', h: { cr: 1, m: 1 }, f: (S, u) => { if (u[0] < .55) { S.raise *= 1.04; r2Add(S, { cr: 6 }); return '평가가 다시 열렸다. 늦었지만 승진했다.'; } r2Add(S, { cr: 2, hap: -4 }); return '결과는 바뀌지 않았다. 그래도 기록은 남겼다.'; } },
      { lb: '이직으로 돌파한다', h: { cr: 1 }, f: S => { S.hunt = 1; r2Add(S, { cr: 3, hp: -2 }); return '조용히 이력서를 다듬었다. 다음 제안은 협상이 수월할 것 같다.'; } },
      { lb: '이번엔 넘긴다', h: { hap: -1 }, f: S => { r2Add(S, { hap: -3, hp: 1 }); return '넘겼다. 대신 다음 평가 자료를 미리 모았다.'; } }] },
  w_mentorW: { t: 'work', ch: [0, 1], g: 0, q: () => '회사에 롤모델로 삼을 여자 선배가 거의 없다. 다른 회사 여성 리더 모임에서 초대를 받았다.',
    o: () => [
      { lb: '나가 본다', h: { cr: 1, hap: 1 }, f: S => { r2Add(S, { cr: 5, hap: 3, hp: -2 }); return '먼저 길을 간 사람들이 있었다. 고민이 조금 가벼워졌다.'; } },
      { lb: '바빠서 넘긴다', h: { hp: 1 }, f: S => { r2Add(S, { hp: 2 }); return '다음 기회로 미뤘다.'; } }] },
  w_drink: { t: 'work', ch: [0, 1], g: 1, q: () => '선배들이 "남자는 술자리에서 크는 거야"라며 2차, 3차로 붙잡는다.',
    o: () => [
      { lb: '끝까지 남는다', h: { cr: 1, hp: -1 }, f: S => { r2Add(S, { cr: 4, hp: -6 }); return '선배들과 가까워졌다. 다음 날 아침이 길었다.'; } },
      { lb: '먼저 일어난다', h: { hp: 1 }, f: S => { r2Add(S, { hp: 3, cr: -1, hap: 1 }); return '내일 일정을 핑계로 먼저 나왔다. 아무 일도 없었다.'; } }] },
  w_transfer: { t: 'work', ch: [1, 2], g: 1, w: 1.4, c: S => !S.su, q: () => '지방 사업장 순환 근무 차례가 돌아왔다. "남자들은 다 한 번씩 가."',
    o: () => [
      { lb: '간다', h: { cr: 2, m: 1, hap: -1 }, f: S => { r2Add(S, { cr: 7, hap: S.married ? -7 : -3, hp: -2 }); S.raise *= 1.04; return '2년을 지방에서 보냈다. 현장을 아는 사람이 됐다.'; } },
      { lb: '사정을 말하고 남는다', h: { hap: 1, cr: -1 }, f: S => { r2Add(S, { cr: -3, hap: 3 }); return '이번엔 빠졌다. 인사 기록에 작은 메모가 남았다.'; } },
      { lb: '이참에 이직을 본다', h: { cr: 1 }, f: S => { S.hunt = 1; r2Add(S, { cr: 2, hp: -2 }); return '이직 시장을 알아봤다. 다음 제안은 협상이 수월할 것 같다.'; } }] },
  w_home: { t: 'work', fixed: 1, q: () => '회사 밖에서 보내는 한 해. 아이는 하루가 다르게 자란다.',
    o: () => [
      { lb: '복귀 준비 공부를 한다', h: { cr: 1, hp: -1 }, f: S => { r2Add(S, { cr: 7, hp: -3 }); return '아이가 잠든 밤마다 강의를 들었다. 업계 소식도 놓치지 않았다.'; } },
      { lb: '아이와의 시간에 집중한다', h: { hap: 2 }, f: S => { r2Add(S, { hap: 6, hp: 2 }); return '이 시간은 다시 오지 않는다고 생각했다.'; } }] },
  // 고정 사건 (12년 차 팀장, 16년 차 임원)
  w_team: { t: 'work', fixed: 1, q: S => S.cr >= 55 ? '팀장 자리가 비었다. 상무님이 불렀다. "팀 한번 맡아 볼래요?"' : '후배가 먼저 팀장이 됐다. 축하 회식 자리가 조금 길게 느껴졌다.',
    o: S => S.cr >= 55 ? [
      { lb: '팀장을 맡는다', h: { cr: 2, m: 1, hp: -1 }, f: S => { S.track = 'mgr'; S.raise *= 1.06; r2Add(S, { cr: 12, hp: -6, hap: -2 }); return '팀장이 됐다. 내 일보다 팀원 일을 먼저 보게 됐다.'; } },
      { lb: '실무 전문가로 남는다', h: { cr: 1, hap: 1 }, f: S => { S.track = 'exp'; r2Add(S, { cr: 7, hap: 4 }); return '직접 일하는 쪽을 골랐다. 이 분야에서 내 이름이 알려지기 시작했다.'; } }] : [
      { lb: '축하하고 내 일을 한다', h: { hap: 1, cr: 1 }, f: S => { r2Add(S, { hap: 2, cr: 4 }); return '진심으로 축하했다. 내 속도로 가기로 했다.'; } },
      { lb: '전문가 길을 정한다', h: { cr: 1 }, f: S => { S.track = 'exp'; r2Add(S, { cr: 6, hp: -2 }); return '관리자 대신 전문가 쪽으로 방향을 잡았다.'; } },
      { lb: '이직을 알아본다', h: { cr: 1, hp: -1 }, f: S => { S.hunt = 1; r2Add(S, { cr: 2, hp: -2 }); return '이력서를 꺼냈다. 다음 제안은 협상이 수월할 것 같다.'; } }] },
  w_exec: { t: 'work', fixed: 1, q: S => S.su ? '스타트업에서 맞는 몇 번째 겨울. 투자 시장이 얼어붙었다는 뉴스가 이어진다.' : S.retired ? '두 번째 일터에도 익숙해졌다.' : S.track === 'mgr' ? '임원 승진 후보 명단에 이름이 올랐다.' : S.track === 'exp' ? '업계 세미나에서 강연 요청이 들어왔다.' : '20년 차를 앞두고, 다음 10년을 생각하게 됐다.',
    o: S => S.su || S.retired ? [
      { lb: '버틴다', h: { cr: 1, hp: -1 }, f: S => { r2Add(S, { cr: 4, hp: -4 }); return '한 해를 더 버텼다.'; } },
      { lb: '속도를 늦춘다', h: { hp: 1, hap: 1 }, f: S => { r2Add(S, { hp: 4, hap: 3 }); return '일을 조금 줄였다.'; } }]
      : S.track === 'mgr' ? [
      { lb: '임원에 도전한다', h: { cr: 2, m: 1, hp: -1 }, f: (S, u) => { const p = clamp((S.cr - 40) / 70, .1, .8); if (u[0] < p) { S.exec = 1; S.raise *= 1.1; r2Add(S, { cr: 20, hp: -6 }); return '임원이 됐다. 1년 계약직이라는 말이 실감 났다.'; } r2Add(S, { cr: -3, hap: -4 }); return '이번엔 아니었다. 명단에서 이름이 빠졌다.'; } },
      { lb: '팀장으로 남는다', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 4, hp: 3 }); return '팀장 자리가 좋다고 말했다. 진심이었다.'; } }]
      : S.track === 'exp' ? [
      { lb: '책을 쓰고 강연한다', h: { cr: 2, m: 1, hp: -1 }, f: S => { S.bonus += S.s * .05; r2Add(S, { cr: 12, hp: -4 }); return '책 한 권이 나왔다. 이 분야에서 찾는 사람이 됐다.'; } },
      { lb: '조용히 일한다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 3, cr: 2 }); return '말보다 일로 남기기로 했다.'; } }]
      : [
      { lb: '창업을 준비한다', h: { cr: 1, hp: -1, hap: 1 }, f: S => { r2Add(S, { cr: 6, hp: -5, hap: 3 }); S.prep = 1; return '주말마다 사업 계획서를 고쳤다.'; } },
      { lb: '자격·학위를 딴다', h: { cr: 2, hp: -1 }, f: S => { r2Add(S, { cr: 8, hp: -5 }); return '늦은 공부였다. 그래서 더 집중했다.'; } },
      { lb: '지금 자리를 지킨다', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 3, hp: 2 }); return '지금 자리에서 할 수 있는 일을 했다.'; } }] },

  // ── 개인사
  l_love: { t: 'life', ch: [0, 0], q: () => '친구가 소개팅을 주선하겠다고 한다. 요즘 주말이 조금 허전하긴 했다.',
    o: () => [
      { lb: '나가 본다', h: { hap: 2 }, f: S => { S.dating = 1; r2Add(S, { hap: 7, hp: -1 }); return '생각보다 말이 잘 통했다. 주말 약속이 생겼다.'; } },
      { lb: '일에 집중한다', h: { cr: 1 }, f: S => { r2Add(S, { cr: 4 }); return '지금은 일이 먼저라고 생각했다.'; } },
      { lb: '혼자만의 취미를 찾는다', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 4, hp: 4 }); return '주말마다 산에 갔다. 혼자인 시간이 좋아졌다.'; } }] },
  l_money: { t: 'life', ch: [0, 1], q: () => '첫 목돈이 모였다. 통장을 몇 번이나 다시 들여다봤다.',
    o: () => [
      { lb: '부모님께 여행을 보내 드린다', h: { hap: 2 }, f: S => { r2Add(S, { hap: 6 }); return '부모님이 사진을 잔뜩 보내왔다.'; } },
      { lb: '나에게 투자한다', h: { cr: 1 }, f: S => { r2Add(S, { cr: 4, hap: 1 }); return '강의와 책에 썼다. 아깝지 않았다.'; } },
      { lb: '그대로 모은다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 2, hp: 1 }); return '숫자가 늘어나는 걸 보는 것도 즐거웠다.'; } }] },
  l_move: { t: 'life', ch: [0, 2], q: () => '출퇴근에 왕복 세 시간. 회사 근처 집 공고를 봤다.',
    o: () => [
      { lb: '이사한다', h: { hp: 1, hap: 1 }, f: S => { r2Add(S, { hp: 6, hap: 2 }); return '아침 한 시간이 생겼다.'; } },
      { lb: '그대로 산다', h: { hp: -1 }, f: S => { r2Add(S, { hp: -3, hap: 1 }); return '지하철에서 책을 읽기로 했다.'; } }] },
  l_house: { t: 'life', ch: [1, 2], q: () => '전세 계약이 끝나 간다. 마침 청약 공고가 났다.',
    o: () => [
      { lb: '청약을 넣는다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .3) { r2Add(S, { hap: 10 }); return '당첨됐다. 몇 번이고 문자를 다시 봤다.'; } r2Add(S, { hap: -2 }); return '떨어졌다. 다음 공고를 달력에 적었다.'; } },
      { lb: '전세를 연장한다', h: { hap: 0 }, f: S => { r2Add(S, { hap: 1 }); return '익숙한 동네에 2년 더 살기로 했다.'; } },
      { lb: '부모님 댁 근처로 간다', h: { hp: 1, hap: 1 }, f: S => { r2Add(S, { hp: 3, hap: 3 }); return '주말 저녁을 부모님과 자주 먹었다.'; } }] },
  l_trip: { t: 'life', ch: [1, 3], q: () => '안식 휴가 2주를 쓸 수 있게 됐다.',
    o: () => [
      { lb: '멀리 떠난다', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 6, hp: 6 }); return '처음 가 보는 도시에서 2주를 보냈다.'; } },
      { lb: '밀린 일을 정리한다', h: { cr: 1, hp: -1 }, f: S => { r2Add(S, { cr: 3, hp: -2 }); return '휴가는 다음으로 미뤘다.'; } }] },
  l_friends: { t: 'life', ch: [1, 3], q: () => '오랜만의 동기 모임. 다들 사는 모습이 제각각이다.',
    o: () => [
      { lb: '모임을 자주 만든다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 5, hp: -1 }); return '한 달에 한 번 모이기로 했다. 정말로 지켰다.'; } },
      { lb: '운동 모임을 만든다', h: { hp: 1, hap: 1 }, f: S => { r2Add(S, { hp: 5, hap: 2 }); return '토요일 아침마다 같이 뛰었다.'; } }] },
  l_check: { t: 'life', ch: [2, 3], q: () => '건강검진 결과지에 빨간 글씨가 늘었다.',
    o: () => [
      { lb: '운동을 시작한다', h: { hp: 2 }, f: S => { r2Add(S, { hp: 10, cr: -1 }); return '퇴근 후 한 시간은 운동하는 시간이 됐다.'; } },
      { lb: '나중에 챙긴다', h: { hp: -1 }, f: S => { r2Add(S, { hp: -4, cr: 2 }); return '일이 바빴다. 결과지는 서랍에 들어갔다.'; } }] },
  l_kidschool: { t: 'life', ch: [3, 3], c: S => S.kids, w: 1.6, q: () => '아이가 중학교에 간다. 학원 이야기가 식탁에 자주 오른다.',
    o: () => [
      { lb: '아이와 더 많이 논다', h: { hap: 2 }, f: S => { r2Add(S, { hap: 8, cr: -1 }); return '주말엔 아이와 자전거를 탔다.'; } },
      { lb: '학군 좋은 곳으로 이사', h: { hap: 0, hp: -1 }, f: S => { r2Add(S, { hap: 2, hp: -4 }); return '출퇴근은 멀어졌지만 아이는 새 학교에 잘 적응했다.'; } }] },
  l_quietL: { t: 'life', ch: [0, 3], w: .3, q: () => '조용히 지나간 한 해. 저녁 시간이 조금 남는다.',
    o: () => [
      { lb: '책을 읽는다', h: { cr: 1, hap: 1 }, f: S => { r2Add(S, { cr: 2, hap: 2 }); return '한 해에 스무 권을 읽었다.'; } },
      { lb: '푹 쉰다', h: { hp: 1 }, f: S => { r2Add(S, { hp: 4 }); return '잘 쉬었다.'; } }] },
  // 성별 개인사
  l_houseM: { t: 'life', ch: [0, 1], g: 1, c: S => S.dating, w: 2, q: () => '결혼 이야기가 나오자 "집은 남자가 해 와야지"라는 말이 먼저 나왔다.',
    o: () => [
      { lb: '대출로 집을 마련한다', h: { hap: 1, hp: -1 }, f: S => { r2Add(S, { hap: 4, hp: -5 }); return '집이 생겼다. 매달 갚는 숫자도 생겼다.'; } },
      { lb: '둘이 같이 모으자고 한다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 3 }); return '이야기가 길어졌지만, 둘이 같은 계획을 세웠다.'; } }] },
  l_askW: { t: 'life', ch: [0, 1], g: 0, w: 1.4, q: () => '회식 자리에서 상사가 묻는다. "결혼은 언제 해? 하면 일은 계속할 거지?"',
    o: () => [
      { lb: '웃어넘긴다', h: { hap: -1 }, f: S => { r2Add(S, { hap: -2, cr: 1 }); return '웃어넘겼다. 집에 오는 길이 길었다.'; } },
      { lb: '정중하게 선을 긋는다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .6) { r2Add(S, { hap: 4 }); return '"그건 제 계획대로 할게요." 그 뒤로는 묻지 않았다.'; } r2Add(S, { hap: 2, cr: -2 }); return '분위기가 잠깐 싸해졌다. 그래도 후회는 없다.'; } }] },
  // 고정 개인사 (7년 차 결혼, 11년 차 아이, 18년 차 부모님)
  l_marry: { t: 'life', fixed: 1, q: S => S.dating ? '오래 만난 사람과 결혼 이야기가 나왔다.' : '친구들의 청첩장이 쌓인다. 나는 어떻게 살고 싶은지 생각해 본다.',
    o: S => S.dating ? [
      { lb: '결혼한다', h: { hap: 2, hp: -1 }, f: S => { S.married = 1; r2Add(S, { hap: 12, hp: -2 }); return '작은 결혼식을 올렸다. ' + PARTNER + '와 같은 집으로 퇴근한다.'; } },
      { lb: '조금 더 미룬다', h: { hap: 0 }, f: S => { r2Add(S, { hap: -1, cr: 2 }); return '지금은 아니라고 말했다. ' + PARTNER + '가 될 사람은 기다려 주기로 했다.'; } },
      { lb: '헤어지고 내 길을 간다', h: { hap: -1, cr: 1 }, f: S => { S.dating = 0; S.solo = 1; r2Add(S, { hap: -4, cr: 4 }); return '서로 다른 길을 가기로 했다. 한동안 일에 몰두했다.'; } }] : [
      { lb: '소개를 받아 본다', h: { hap: 1 }, f: S => { S.dating = 1; r2Add(S, { hap: 4 }); return '좋은 사람을 만났다. 천천히 알아 가기로 했다.'; } },
      { lb: '혼자의 삶을 가꾼다', h: { hap: 1, hp: 1 }, f: S => { S.solo = 1; r2Add(S, { hap: 5, hp: 2 }); return '혼자 사는 집을 내 취향으로 채웠다.'; } }] },
  l_baby: { t: 'life', fixed: 1, q: S => S.married ? (S.g ? PARTNER + '가 임신 소식을 전했다. 반가운 마음 다음에 회사 생각이 났다.' : '아이가 생겼다. 기쁨 다음에 회사 생각이 따라왔다.')
      : S.dating ? '만나는 사람이 이제는 결혼하자고 한다.' : '혼자 산 지 10년. 시간이 꽤 내 것이다.',
    o: S => S.married ? (S.g ? [
      { lb: '육아휴직 1년 (팀 첫 남자)', h: { hap: 2, m: -2, cr: -1 }, f: (S, u, ctx) => { S.kids = 1; S.kidY = S.y; S.mul = .4; S.leave = 1; r2Add(S, { hap: 16, cr: -5, hp: -3 }); if (ctx.by[S.cn] && ctx.by[S.cn].rt && ctx.by[S.cn].rt < 3.3) { r2Add(S, { hap: -4, cr: -3 }); return '팀에서 처음 쓰는 남자 육아휴직이었다. 눈치가 보였지만 아이의 첫걸음을 봤다.'; } return '팀에서 처음 쓰는 남자 육아휴직이었다. 아이의 첫걸음을 내 눈으로 봤다.'; } },
      { lb: PARTNER + '가 쉬고, 나는 칼퇴한다', h: { hap: 1, hp: -1 }, f: S => { S.kids = 1; S.kidY = S.y; r2Add(S, { hap: 9, hp: -5 }); return '6시 퇴근을 지켰다. 밤에는 내가 아이를 재웠다.'; } },
      { lb: '가장이니 일에 더 집중한다', h: { cr: 1, m: 1, hap: -1 }, f: S => { S.kids = 1; S.kidY = S.y; S.raise *= 1.03; r2Add(S, { cr: 5, hap: 1, hp: -6 }); return '야근을 마다하지 않았다. 아이 사진은 휴대폰으로 더 많이 봤다.'; } }]
      : [
      { lb: '출산휴가와 육아휴직 1년', h: { hap: 2, m: -2, cr: -1 }, f: (S, u, ctx) => { S.kids = 1; S.kidY = S.y; S.mul = .4; S.leave = 1; r2Add(S, { hap: 15, cr: -6, hp: -4 }); if (ctx.by[S.cn] && ctx.by[S.cn].rt && ctx.by[S.cn].rt < 3.3) { S.backHit = 1; return '1년을 아이와 보냈다. 복귀해 보니 내 자리에 다른 사람이 앉아 있었다.'; } return '1년을 아이와 보냈다. 복귀한 날 팀원들이 꽃을 준비해 두었다.'; } },
      { lb: '휴가만 쓰고 단축근무로 복귀', h: { hap: 1, m: -1, hp: -1 }, f: S => { S.kids = 1; S.kidY = S.y; S.mul = .8; S.short = 2; r2Add(S, { hap: 9, hp: -5, cr: -1 }); return '석 달 만에 복귀했다. 2년 동안 4시에 퇴근해 아이를 데리러 갔다.'; } },
      { lb: '퇴사하고 아이에 집중', h: { hap: 2, m: -2, cr: -2 }, f: S => { S.kids = 1; S.kidY = S.y; S.off = 1; S.mul = .3; r2Add(S, { hap: 16, cr: -14, hp: -2 }); return '사원증을 반납했다. 2년 뒤에 다시 일하기로 마음먹었다.'; } }])
      : S.dating ? [
      { lb: '결혼한다', h: { hap: 2 }, f: S => { S.married = 1; r2Add(S, { hap: 11 }); return '늦은 만큼 단단한 결혼이었다.'; } },
      { lb: '지금처럼 지낸다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 4 }); return '각자의 집, 같은 주말. 이대로도 좋았다.'; } }] : [
      { lb: '반려동물을 들인다', h: { hap: 2 }, f: S => { r2Add(S, { hap: 9, hp: 2 }); return '퇴근길 발걸음이 빨라졌다. 기다리는 녀석이 있다.'; } },
      { lb: '대학원에 간다', h: { cr: 2, hp: -1 }, f: S => { S.cert = 1; r2Add(S, { cr: 9, hp: -4 }); return '서른 중반의 대학원. 수업이 이렇게 재밌는 줄 몰랐다.'; } },
      { lb: '긴 여행을 떠난다', h: { hap: 2, hp: 1, m: -1 }, f: S => { S.mul = .85; r2Add(S, { hap: 9, hp: 7 }); return '무급휴가 두 달. 돌아와서 일이 다시 재밌어졌다.'; } }] },
  l_parent: { t: 'life', fixed: 1, ch: [3, 3], q: () => '부모님이 편찮으시다는 연락을 받았다.',
    o: () => [
      { lb: '가족돌봄휴직을 쓴다', h: { hap: 1, m: -1, cr: -1 }, f: S => { S.mul = .75; r2Add(S, { hap: 7, hp: -4, cr: -2 }); return '석 달을 병원에서 보냈다. 부모님 손을 오래 잡았다.'; } },
      { lb: '주말마다 내려간다', h: { hp: -1, hap: 1 }, f: S => { r2Add(S, { hp: -6, hap: 4 }); return '금요일 밤 기차가 익숙해졌다.'; } },
      { lb: '형제와 나눠 맡는다', h: { hap: 0 }, f: S => { r2Add(S, { hap: 1, hp: -1 }); return '돌아가며 챙기기로 했다. 단체 대화방이 바빠졌다.'; } }] },
  l_health: { t: 'life', fixed: 1, q: () => '아침에 일어나기가 힘들다. 몸이 먼저 신호를 보낸다.',
    o: () => [
      { lb: '석 달 쉰다', h: { hp: 2, m: -1 }, f: S => { S.mul = Math.min(S.mul, .75); r2Add(S, { hp: 25, cr: -3, hap: 3 }); return '석 달을 쉬었다. 다시 아침이 가벼워졌다.'; } },
      { lb: '운동부터 시작한다', h: { hp: 1 }, f: S => { r2Add(S, { hp: 12, cr: -1 }); return '새벽 수영을 시작했다.'; } },
      { lb: '조금만 더 버틴다', h: { hp: -1, cr: 1 }, f: S => { r2Add(S, { hp: -5, cr: 2 }); return '버텼다. 몸은 기억하고 있을 것이다.'; } }] },
  // ── 2026-11-02~ (v3) 새 사건: 같은 날이면 누구나 같은 후보(씨앗 = 날짜 · 연차), 날마다 다른 조합
  // 대학원: 전공 7개 중 그날 3개
  w_grad: { t: 'work', ch: [0, 2], v3: 1, w: 1.3, c: S => !S.cert && !S.su && !S.off, q: () => '야간 대학원 원서 마감이 이번 주다. 퇴근 후 2년, 어떤 전공으로 갈까?',
    o: S => r3Pick(S, 'grad', 3, R3_GRAD).map(m => ({ lb: m[0], h: m[1], f: (S, u) => { S.cert = 1; return m[2](S, u); } })) },
  // 창업: 아이디어 → (다음 회사 칸) 아이템 12개 중 그날 3개 고르기 → 3년 뒤 결판
  w_suidea: { t: 'work', ch: [1, 2], v3: 1, w: 1.2, c: S => S.cr >= 40 && !S.su && !S.retired && !S.off && !S.suPlan, q: () => '샤워하다가 떠오른 사업 아이디어가 며칠째 머리에서 떠나지 않는다.',
    o: () => [
      { lb: '퇴사하고 창업한다', h: { cr: 1, hap: 1, m: -1 }, f: S => { S.suPlan = 1; r2Add(S, { cr: 3, hap: 3, hp: -2 }); return '사표를 품에 넣고 다니기 시작했다. 아이템부터 정하기로 했다.'; } },
      { lb: '주말에 시제품만 만든다', h: { cr: 1, hp: -1 }, f: (S, u) => { r2Add(S, { cr: 3, hp: -4 }); if (u[0] < .3) { S.bonus += S.s * .15; return '시제품이 입소문을 탔다. 작은 부수입이 생겼다.'; } return '주말이 사라졌다. 그래도 만드는 건 재밌었다.'; } },
      { lb: '접는다', h: { hap: -1 }, f: S => { r2Add(S, { hap: -2, hp: 1 }); return '아이디어 노트를 서랍에 넣었다. 가끔 꺼내 본다.'; } }] },
  w_supick: { t: 'work', ch: [1, 3], v3: 1, w: 40, c: S => (S.suPlan || S.prep) && !S.su && !S.retired && !S.off, q: () => '창업 아이템 최종 후보 세 개. 이 중 하나에 앞으로 3년을 건다.',
    o: S => r3Pick(S, 'su', 3, R3_SU).map(it => ({ lb: it[0], h: { m: -1, cr: 2, hap: it[1] >= .45 ? 1 : 2 }, f: (S, u) => {
      S.su = 1; S.suMine = 1; S.suItem = it[0]; S.suP = it[1]; S.suPay = it[2]; S.suBase = S.s; S.suY = Math.min(S.y + 3, 19); S.suU = u[0]; S.moves++; S.suPlan = 0; S.prep = 0;
      S.cname = it[0] + ' 대표'; S.s *= .6; r2Add(S, { cr: 6, hap: 5, hp: -6 });
      return '\'' + it[0] + '\' 대표가 됐다. ' + it[3] + ' 3년 안에 결판이 난다.'; } })) },
  w_ai: { t: 'work', ch: [1, 3], v3: 1, q: () => '회사에 AI 자동화가 들어왔다. 내 업무의 절반이 사라질 수도 있다는 말이 돈다.',
    o: () => [
      { lb: 'AI를 제일 잘 쓰는 사람이 된다', h: { cr: 2, hp: -1, m: 1 }, f: S => { r2Add(S, { cr: 8, hp: -4 }); S.raise *= 1.03; return '사내 AI 담당이 됐다. 다들 나한테 물어본다.'; } },
      { lb: '사람만 할 수 있는 일로 옮긴다', h: { cr: 1, hap: 1 }, f: S => { r2Add(S, { cr: 4, hap: 3 }); return '고객을 만나는 일로 옮겼다. 사람 상대가 의외로 맞았다.'; } },
      { lb: '모른 척 버틴다', h: { cr: -1 }, f: (S, u) => { if (u[0] < .4) { r2Add(S, { cr: -6, hap: -4 }); return '내 업무가 정말 자동화됐다. 남는 시간이 불편했다.'; } r2Add(S, { cr: -2 }); return '생각보다 느리게 바뀌었다. 한숨 돌렸다.'; } }] },
  w_whistle: { t: 'work', ch: [1, 3], v3: 1, w: .7, c: S => !S.su && !S.retired, q: () => '부서 장부에서 이상한 숫자를 발견했다. 위에서 시킨 일인 것 같다.',
    o: () => [
      { lb: '감사팀에 제보한다', h: { cr: 1, hap: 1, hp: -1 }, f: (S, u) => { if (u[0] < .55) { r2Add(S, { cr: 10, hap: 5, hp: -3 }); return '감사가 시작됐다. 회사가 나를 다시 봤다.'; } r2Add(S, { cr: -6, hap: -4, hp: -4 }); S.hunt = 1; return '조용히 한직으로 밀려났다. 이력서를 다시 열었다.'; } },
      { lb: '상사에게 직접 묻는다', h: { cr: 1 }, f: (S, u) => { if (u[0] < .5) { r2Add(S, { cr: 4, hap: 2 }); return '실수였다고 했다. 숫자는 바로잡혔다.'; } r2Add(S, { hap: -5, hp: -2 }); return '"모르는 게 좋을 거야." 그 말이 오래 남았다.'; } },
      { lb: '못 본 척한다', h: { hap: -1 }, f: S => { r2Add(S, { hap: -4, hp: -1 }); return '눈을 감았다. 밤에 잠이 잘 안 왔다.'; } }] },
  w_mna: { t: 'work', ch: [1, 3], v3: 1, w: .8, c: S => !S.su && !S.retired && !S.off, q: () => '아침 뉴스에 우리 회사 매각 기사가 떴다. 메신저가 폭발했다.',
    o: () => [
      { lb: '새 주인 밑에서 기회를 본다', h: { m: 1, cr: 1, hp: -1 }, f: (S, u) => { if (u[0] < .5) { S.raise *= 1.08; r2Add(S, { cr: 6 }); return '새 대주주가 핵심 인력에게 연봉을 올려 줬다. 내가 거기 있었다.'; } S.freeze = 1; r2Add(S, { hap: -4, hp: -3 }); return '통합 작업으로 1년이 갔다. 연봉은 동결이었다.'; } },
      { lb: '위로금 받고 이직을 준비한다', h: { m: 1, cr: 1 }, f: S => { S.bonus += S.s * .3; S.hunt = 1; r2Add(S, { cr: 2, hap: 1 }); return '위로금을 챙겼다. 다음 제안은 협상이 수월할 것 같다.'; } }] },
  w_remote: { t: 'work', ch: [0, 2], v3: 1, q: () => '회사가 주 3일 재택을 시범 운영한다. 신청자를 받는다.',
    o: () => [
      { lb: '재택을 신청한다', h: { hp: 1, hap: 1, cr: -1 }, f: S => { r2Add(S, { hp: 5, hap: 4, cr: -2 }); return '출퇴근 세 시간이 사라졌다. 점심엔 산책을 했다.'; } },
      { lb: '사무실로 나간다', h: { cr: 1 }, f: S => { r2Add(S, { cr: 4, hp: -1 }); return '텅 빈 사무실에서 팀장님과 가까워졌다.'; } }] },

  // 연애
  l_spark: { t: 'life', ch: [0, 1], v3: 1, w: 1.3, c: S => !S.married && !S.dating, q: () => '옆 팀 동료와 점심을 같이 먹는 날이 늘었다. 메신저 답장이 유난히 빠르다.',
    o: () => [
      { lb: '고백한다', h: { hap: 2 }, f: (S, u) => { if (u[0] < .55) { S.dating = 1; r2Add(S, { hap: 10 }); return '사내 연애 시작. 엘리베이터에서 모른 척하는 게 제일 어렵다.'; } r2Add(S, { hap: -6 }); return '"좋은 동료로 지내요." 한동안 회의실이 어색했다.'; } },
      { lb: '친구로 남는다', h: { hap: 0 }, f: S => { r2Add(S, { hap: 1 }); return '좋은 점심 친구가 됐다. 그것도 괜찮았다.'; } },
      { lb: '데이팅 앱을 깐다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .45) { S.dating = 1; r2Add(S, { hap: 7 }); return '세 번째 만남에서 통했다. 사진보다 실물이 나았다.'; } r2Add(S, { hap: -2 }); return '대화만 백 번. 앱을 지웠다.'; } }] },
  l_ldr: { t: 'life', ch: [0, 2], v3: 1, w: 1.4, c: S => S.dating && !S.married, q: () => '연인이 해외 발령을 받았다. 2년 동안 장거리 연애가 될 것 같다.',
    o: () => [
      { lb: '기다린다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .6) { r2Add(S, { hap: 6 }); S.bond = 1; return '시차를 넘긴 영상 통화 2년. 공항 마중이 연애의 하이라이트였다.'; } S.dating = 0; r2Add(S, { hap: -8 }); return '시차에 지쳤다. 마지막 통화는 짧았다.'; } },
      { lb: '휴직하고 따라간다', h: { hap: 2, m: -1, cr: -1 }, f: S => { S.mul = .5; S.bond = 1; r2Add(S, { hap: 10, cr: -6 }); return '반년을 낯선 도시에서 같이 살았다. 사진이 제일 많은 해다.'; } },
      { lb: '헤어진다', h: { hap: -1, cr: 1 }, f: S => { S.dating = 0; r2Add(S, { hap: -5, cr: 3 }); return '서로를 위해 놓아주기로 했다. 그해 일만 했다.'; } }] },
  l_meetpar: { t: 'life', ch: [1, 2], v3: 1, w: 1.2, c: S => S.dating && !S.married, q: () => '연인의 부모님과 첫 식사. "그래서 연봉은 얼마나…" 분위기가 싸늘하다.',
    o: () => [
      { lb: '솔직하게 다 말한다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .6) { S.bond = 1; r2Add(S, { hap: 6 }); return '"솔직해서 좋네." 디저트가 나올 때쯤 웃음이 나왔다.'; } r2Add(S, { hap: -5 }); return '숫자가 나오자 대화가 끊겼다. 집에 오는 길에 둘이 한참 말이 없었다.'; } },
      { lb: '정성으로 승부한다', h: { hap: 1, hp: -1 }, f: S => { r2Add(S, { hap: 4, hp: -3 }); S.bond = 1; return '명절마다 선물을 들고 갔다. 세 번째 명절에 밥을 두 공기 주셨다.'; } },
      { lb: '둘이 정하면 된다고 버틴다', h: { hap: 0 }, f: S => { r2Add(S, { hap: 2 }); return '연인이 내 편을 들었다. 그게 제일 고마웠다.'; } }] },
  l_ex: { t: 'life', ch: [1, 2], v3: 1, w: .9, c: S => !S.married, q: () => '새벽 1시, 전 연인에게서 문자가 왔다. "자니?"',
    o: () => [
      { lb: '답장한다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .35) { S.dating = 1; S.bond = 1; r2Add(S, { hap: 8 }); return '다시 만났다. 이번엔 서로 조금 더 어른이었다.'; } r2Add(S, { hap: -7, hp: -2 }); return '역시 아니었다. 왜 헤어졌는지 30분 만에 기억났다.'; } },
      { lb: '읽고 답하지 않는다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 2 }); return '다음 날 아침, 아무 일도 없던 것처럼 출근했다.'; } },
      { lb: '차단한다', h: { hp: 1 }, f: S => { r2Add(S, { hap: 1, hp: 2 }); return '단호하게. 잠이 잘 왔다.'; } }] },
  // 늦은 결혼 · 위기 · 이혼 · 재혼
  l_late: { t: 'life', ch: [2, 3], v3: 1, w: 1.8, c: S => !S.married && !S.divorced, q: S => S.dating ? '오래 만난 사람이 조심스럽게 말했다. "우리, 이제 결혼할까?"' : '마흔 즈음, 동호회에서 만난 사람과 자꾸 웃게 된다.',
    o: S => [
      { lb: '결혼한다', h: { hap: 2, hp: -1 }, f: S => { S.married = 1; S.wed = 1; S.dating = 1; r2Add(S, { hap: 12, hp: -2 }); return '늦은 만큼 단단한 결혼식. 하객들이 제일 많이 운 결혼식이었다.'; } },
      { lb: '같이 살아 보고 정한다', h: { hap: 1 }, f: S => { S.dating = 1; r2Add(S, { hap: 6 }); return '칫솔 두 개가 나란히 꽂혔다. 서두를 필요는 없었다.'; } },
      { lb: '지금의 자유가 좋다', h: { hap: 1, hp: 1 }, f: S => { S.solo = 1; r2Add(S, { hap: 3, hp: 2 }); return '혼자의 저녁이 좋다고 솔직하게 말했다.'; } }] },
  l_crisis: { t: 'life', ch: [2, 3], v3: 1, w: 1.8, c: S => S.married, q: () => '대화가 줄었다. 식탁엔 휴대폰 두 개만 켜져 있다. 각방을 쓰기 시작했다.',
    o: () => [
      { lb: '부부 상담을 받는다', h: { hap: 1, m: -1 }, f: (S, u) => { S.bonus -= S.s * .03; if (u[0] < .65) { r2Add(S, { hap: 9 }); return '상담실에서 처음으로 울었다. 그날 밤 오랜만에 같이 산책했다.'; } r2Add(S, { hap: -3 }); return '상담은 다섯 번에서 멈췄다. 아직 숙제가 남았다.'; } },
      { lb: '둘만의 여행을 떠난다', h: { hap: 1, hp: 1 }, f: (S, u) => { r2Add(S, { hp: 3 }); if (u[0] < .5) { r2Add(S, { hap: 7 }); return '연애할 때 갔던 바다에 다시 갔다. 그때 이야기를 밤새 했다.'; } r2Add(S, { hap: -2 }); return '여행 내내 싸웠다. 그래도 싸울 기운은 남아 있었다.'; } },
      { lb: '이혼한다', h: { hap: -1, m: -2, hp: -1 }, f: S => { S.married = 0; S.divorced = 1; S.dating = 0; S.bonus -= S.s * .5; r2Add(S, { hap: -10, hp: -5, cr: 2 }); return '도장을 찍었다. 재산을 나누고 작은 집으로 옮겼다. 이상하게 숨은 쉬어졌다.'; } }] },
  l_rewed: { t: 'life', ch: [2, 3], v3: 1, w: 2, c: S => S.divorced && !S.married, q: () => '이혼하고 몇 해. 친구가 "좋은 사람 있는데"라며 웃는다.',
    o: () => [
      { lb: '다시 사랑해 본다', h: { hap: 2 }, f: (S, u) => { if (u[0] < .6) { S.married = 1; S.wed = 1; r2Add(S, { hap: 12 }); return '두 번째 결혼식은 작고 조용했다. 이번엔 서로 더 많이 묻는다.'; } S.dating = 1; r2Add(S, { hap: 5 }); return '천천히 만나기로 했다. 서두르지 않기로.'; } },
      { lb: '혼자가 편하다', h: { hap: 1, hp: 1 }, f: S => { S.solo = 1; r2Add(S, { hap: 5, hp: 3 }); return '혼자 사는 집에 화분이 늘었다. 이대로 좋다.'; } }] },
  // 아기
  l_babylate: { t: 'life', ch: [2, 3], v3: 1, w: 2.2, c: S => S.married && !S.kids, q: () => '마흔이 가까워지자 아이 생각이 다시 났다.',
    o: () => [
      { lb: '난임 병원에 다닌다', h: { hap: 1, hp: -1, m: -1 }, f: (S, u) => { S.bonus -= S.s * .05; r2Add(S, { hp: -6 }); if (u[0] < .5) { S.kids = 1; S.kidY = S.y; r2Add(S, { hap: 14 }); return '두 줄! 기다린 만큼 둘이 같이 울었다.'; } r2Add(S, { hap: -4 }); return '이번엔 아니었다. 서로의 손을 오래 잡았다.'; } },
      { lb: '입양을 알아본다', h: { hap: 2, cr: -1 }, f: S => { S.kids = 1; S.kidY = S.y; r2Add(S, { hap: 12, cr: -2, hp: -3 }); return '1년의 서류 끝에 아이가 왔다. 첫날 밤, 셋이 같은 방에서 잤다.'; } },
      { lb: '둘이서 행복하자', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 5, hp: 2 }); return '둘만의 여행 계획을 세웠다. 그것도 가족이다.'; } }] },
  l_second: { t: 'life', ch: [2, 3], v3: 1, w: 1.2, c: S => S.kids && !S.kid2 && S.married, q: () => '첫째가 동생을 갖고 싶다고 조른다. 식탁에서 둘째 이야기가 나왔다.',
    o: () => [
      { lb: '둘째를 낳는다', h: { hap: 2, hp: -2, m: -1 }, f: S => { S.kid2 = 1; S.kidY = S.y; S.mul = .9; r2Add(S, { hap: 10, hp: -7 }); return '집이 두 배로 시끄러워졌다. 웃음도 두 배.'; } },
      { lb: '하나로 충분하다', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 3, hp: 2 }); return '첫째에게 더 집중하기로 했다.'; } }] },
  l_kidsick: { t: 'life', ch: [2, 3], v3: 1, w: 1.6, c: S => S.kids, q: () => '새벽 3시, 아이 열이 40도. 오늘 오전엔 중요한 발표가 있다.',
    o: () => [
      { lb: '연차 내고 병원에 간다', h: { hap: 1, cr: -1 }, f: S => { r2Add(S, { hap: 6, cr: -3, hp: -2 }); return '응급실에서 아침을 맞았다. 발표는 후배가 했다. 아이는 금방 나았다.'; } },
      { lb: '부모님께 부탁하고 발표한다', h: { cr: 1, hap: -1 }, f: S => { r2Add(S, { cr: 5, hap: -3, hp: -3 }); return '발표는 잘 끝났다. 점심시간에 영상 통화로 아이 얼굴부터 봤다.'; } },
      { lb: '재택으로 바꿔 달라고 한다', h: { hap: 1 }, f: (S, u) => { if (u[0] < .6) { r2Add(S, { hap: 4, cr: 1 }); return '화면을 켜고 발표했다. 무릎엔 아이가 잠들어 있었다.'; } r2Add(S, { hap: -2, cr: -2 }); return '"이번만"이라는 말에 팀장 표정이 굳었다.'; } }] },
  l_daycare: { t: 'life', ch: [2, 3], v3: 1, w: 1.2, c: S => S.kids && S.y - S.kidY < 6, q: () => '어린이집 대기 번호 87번. 아침 등원 전쟁이 매일 반복된다.',
    o: () => [
      { lb: '조부모 찬스를 쓴다', h: { hap: 1, hp: 1 }, f: S => { r2Add(S, { hap: 3, hp: 3 }); return '할머니 집이 아이의 두 번째 집이 됐다. 명절 선물이 커졌다.'; } },
      { lb: '등하원 시터를 쓴다', h: { hp: 1, m: -1 }, f: S => { S.bonus -= S.s * .12; r2Add(S, { hp: 5, cr: 2 }); return '월급의 꽤 많은 몫이 나갔다. 대신 아침이 조용해졌다.'; } },
      { lb: '직장어린이집 있는 회사를 찾는다', h: { cr: 1 }, f: S => { S.hunt = 1; r2Add(S, { cr: 2, hp: -2 }); return '채용 공고에서 \'직장어린이집\'부터 찾게 됐다.'; } }] },
  // 돈 · 취미
  l_coin: { t: 'life', ch: [0, 2], v3: 1, w: .9, q: () => '점심시간마다 동기들이 코인 차트 얘기뿐이다. "지금 안 타면 늦어."',
    o: () => [
      { lb: '모은 돈을 몰빵한다', h: { m: 1, hap: -1 }, f: (S, u) => { if (u[0] < .25) { S.bonus += S.s * .8; r2Add(S, { hap: 6 }); return '떡상! 계좌를 몇 번이나 새로고침했다.'; } S.bonus -= S.s * .3; r2Add(S, { hap: -7, hp: -3 }); return '한강 물 온도를 검색했다. 수업료가 비쌌다.'; } },
      { lb: '적립식 ETF만 산다', h: { m: 1 }, f: (S, u) => { if (u[0] < .8) { S.bonus += S.s * .08; return '재미는 없었다. 대신 꾸준히 불었다.'; } return '그해 시장이 안 좋았다. 그래도 계속 샀다.'; } },
      { lb: '관심 끈다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 1 }); return '앱을 깔지 않았다. 점심시간이 조용해졌다.'; } }] },
  l_band: { t: 'life', ch: [1, 3], v3: 1, w: .8, q: () => '회사 직장인 밴드에서 드러머를 구한다. 고등학교 때 쳐 본 적은 있다.',
    o: () => [
      { lb: '합류한다', h: { hap: 2, hp: -1 }, f: S => { r2Add(S, { hap: 8, hp: -2, cr: 1 }); return '연말 공연에서 사장님이 앙코르를 외쳤다.'; } },
      { lb: '관객으로만 간다', h: { hap: 1 }, f: S => { r2Add(S, { hap: 2 }); return '맨 앞줄에서 응원봉을 흔들었다.'; } }] },
};
// v3 후보 뽑기: 날짜·연차·종류로 정해진 순서 (같은 날 누구나 같은 후보)
function r3Pick(S, tag, n, L) { return shuffleR(rng('r3|' + S.dk + '|' + tag + '|' + S.y), L).slice(0, n); }
// 대학원 전공 [이름, 미리보기, 결과]
const R3_GRAD = [
  ['경영(MBA)', { cr: 2, m: 1, hp: -1 }, S => { r2Add(S, { cr: 9, hp: -6 }); S.raise *= 1.04; return 'MBA 동기들이 다 다른 회사 사람이었다. 인맥이 두 배가 됐다.'; }],
  ['데이터·AI', { cr: 2, hp: -1 }, (S, u) => { r2Add(S, { cr: 10, hp: -7 }); S.hunt = 1; if (u[1] < .4) { S.raise *= 1.05; return '논문 주제가 회사 프로젝트가 됐다. 연봉 협상이 쉬워졌다.'; } return '파이썬 에러와 2년을 싸웠다. 헤드헌터 연락이 늘었다.'; }],
  ['노무·인사(HRD)', { cr: 1, hap: 1 }, S => { r2Add(S, { cr: 6, hap: 3, hp: -4 }); S.track = S.track || 'exp'; return '사람과 조직을 공부했다. 팀원 면담이 달라졌다.'; }],
  ['회계·세무', { cr: 1, m: 1 }, S => { r2Add(S, { cr: 6, hp: -4 }); S.raise *= 1.03; return '숫자에 강해졌다. 연말정산 때마다 동료들이 줄을 섰다.'; }],
  ['상담심리', { hap: 2, cr: 1 }, S => { r2Add(S, { hap: 8, cr: 2, hp: -3 }); return '남의 마음을 듣다가 내 마음도 들렸다.'; }],
  ['디자인·UX', { cr: 1, hap: 1 }, (S, u) => { r2Add(S, { cr: 5, hap: 4, hp: -4 }); if (u[1] < .3) { S.bonus += S.s * .15; return '졸업 작품이 공모전에서 상을 탔다. 상금도 있었다.'; } return '보는 눈이 달라졌다. 회사 화면이 다 거슬리기 시작했다.'; }],
  ['부동산학', { m: 1, hap: -1 }, (S, u) => { r2Add(S, { cr: 3, hp: -4 }); if (u[1] < .4) { S.bonus += S.s * .4; r2Add(S, { hap: 4 }); return '수업에서 본 동네에 집을 샀다. 몇 년 뒤 뉴스에 나왔다.'; } r2Add(S, { hap: -3 }); return '이론은 완벽했다. 시장은 이론대로 움직이지 않았다.'; }]];
// 창업 아이템 [이름, 성공 확률, 성공 시 일시금(창업 전 연봉 배수), 한 줄]
const R3_SU = [
  ['반려동물 건강 기록 앱', .38, 3, '강아지 산책 데이터로 병원 예약까지 잇는다.'],
  ['AI 면접 코치', .32, 4, '취준생이 밤마다 AI와 모의 면접을 본다.'],
  ['무인 빨래방 체인', .55, 1.5, '동네마다 하나씩, 24시간 돌아간다.'],
  ['시니어 병원 동행 서비스', .45, 2, '바쁜 자식 대신 부모님 병원 길을 함께한다.'],
  ['중고 명품 AI 감정', .3, 4, '사진 한 장으로 진품을 가린다.'],
  ['K-뷰티 해외 직구몰', .42, 2.5, '한국 화장품을 지구 반대편까지 보낸다.'],
  ['1인 가구 반찬 구독', .4, 2, '혼자 사는 사람의 냉장고를 채운다.'],
  ['인디 게임 스튜디오', .2, 6, '대박 아니면 쪽박, 게임 하나에 전부를 건다.'],
  ['탄소 배출 측정 SaaS', .28, 5, '공장 굴뚝의 탄소를 숫자로 보여 준다.'],
  ['숏폼 자격증 강의', .45, 2, '1분짜리 영상으로 자격증을 딴다.'],
  ['동네 소형 PT 체인', .5, 1.6, '퇴근길 20분 운동을 판다.'],
  ['웹툰 캐릭터 굿즈', .35, 3, '좋아하는 웹툰 주인공을 책상 위로 데려온다.']];
const R2_FIXED = { 6: 'l_marry', 10: 'l_baby', 11: 'w_team', 15: 'w_exec', 17: 'l_parent' };
function r2Move(S, c, start) { S.c = c; S.cn = c.n; S.cname = c.n; S.s = start; S.moves++; S.su = 0; S.retired = 0; S.raise = 1; }
// 칸 k 에서 고를 것: 종류·사건 id·상황·고르기 (state S 를 바꾸지 않음)
function r2Slot(pz, ctx, S, k) {
  const [y, t] = R2_SLOTS[k], ch = Math.floor(y / 5);
  if (t === 'job') {
    const jk = R2_SLOTS.slice(0, k + 1).filter(s => s[1] === 'job').length - 1, st = pz.steps[jk];
    const first = jk === 0 && !pz.home, x = S.x, s = S.s;
    if (S.off) {   // 경력단절 뒤 다시 일하기: 공백만큼 깎인 제안 2장 + 1년 더 쉬기
      const opts = st.o.map(o => ({ job: 1, o: { n: o.n, kind: 're' }, of: r2Re(ctx, ctx.by[o.n], x) }));
      return { k, y, t, ch, id: 'job_re', q: '2년이 지났다. 다시 일할 곳을 찾는다. 공백을 묻는 면접관도, 반겨 주는 면접관도 있었다.', opts: opts.concat([{ stay: 1, lb: '1년 더 아이 곁에 있는다' }]) };
    }
    if (S.su || S.retired) {   // 스타트업·2막 중엔 제안 대신 남기만 (이직 시장 밖)
      const opts = st.o.map(o => ({ job: 1, o, of: roadOffer(ctx, o, x, s) }));
      return { k, y, t, ch, id: 'job', q: S.su ? '스타트업 밖에서 제안이 왔다. 지분을 두고 나갈지 고민된다.' : '옛 동료가 다시 같이 일하자고 한다.', opts: opts.concat([{ stay: 1, lb: S.su ? '스타트업에 남는다' : '지금 일을 계속한다' }]) };
    }
    const opts = st.o.map(o => ({ job: 1, o, of: roadOffer(ctx, o, x, s) }));
    return { k, y, t, ch, id: 'job', first, q: '', opts: first ? opts : opts.concat([{ stay: 1, lb: '남는다' }]) };
  }
  let id = R2_FIXED[y];
  if (pz.v3) {   // v3: 고정 칸도 상황 따라 열림 → 연애·늦은 결혼·이혼·아기 이야기가 더 자주 (만나는 사람 없으면 7년 차 결혼 대신 연애 사건, 부모님은 겨울 장 무작위)
    if (id === 'l_marry' && !S.dating) id = null;
    if (id === 'l_baby' && !S.married && !S.dating) id = null;
    if (id === 'l_parent') id = null;
  }
  if (t === 'work' && S.off) id = 'w_home';
  if (t === 'life' && S.hp < (pz.v3 ? 25 : 35) && id !== 'l_marry' && id !== 'l_baby' && !(pz.v3 && S.used.l_health)) id = 'l_health';   // 체력이 바닥이면 몸이 먼저 (v3: 한 번만)
  if (!id) {
    const L = Object.keys(R2_EV).filter(e => { const E = R2_EV[e]; return E.t === t && (!E.fixed || (pz.v3 && e === 'l_parent' && ch === 3)) && (!E.v3 || pz.v3) && !S.used[e] && ch >= E.ch[0] && ch <= E.ch[1] && (E.g == null || E.g === S.g) && (!E.c || E.c(S, S.c, pz)); });
    const W = L.map(e => (e === 'l_parent' ? 2 : R2_EV[e].w || 1) * (e === 'w_cut' ? roadRiskSc(pz, S.c) * 6 : 1)), sum = W.reduce((a, b) => a + b, 0);
    let d = pz.ed[k] * sum; id = L[L.length - 1];
    for (let i = 0; i < L.length; i++) { d -= W[i]; if (d < 0) { id = L[i]; break; } }
  }
  const E = R2_EV[id];
  return { k, y, t, ch, id, q: E.q(S), opts: E.o(S) };
}
// 경력단절 뒤 재취업 제안: 그 회사 곡선의 지금 연차 값 × 0.85 (공백 감안)
function r2Re(ctx, T, x) { const O = curve(T, x) * .85, N = ctx.nego; return { O, lo: Math.round(O * negoMul(0, N) / N.p50 / 100) * 100, hi: Math.round(O * negoMul(1, N) / N.p50 / 100) * 100, reach: false }; }
function r2Picks(picks) { const a = Array.isArray(picks) ? picks : String(picks || '').split(''); return Array.from({ length: R2_N }, (_, i) => { const p = Math.floor(Number(a[i])); return p >= 0 && p <= 2 ? p : -1; }); }
// 20년 시뮬레이션. stop = 고른 칸 수(그 칸 직전에서 멈추고 slot 을 돌려줌 — 화면용)
function simRoad2(pz, ctx, picks, stop) {
  picks = r2Picks(picks);
  const g = picks[0] === 1 ? 1 : 0, S0 = roadStart(pz, ctx), N = ctx.nego;
  const S = { g, y: 0, x: S0.x, s: S0.s, c: S0.c, cn: S0.c ? S0.c.n : '', cname: S0.c ? S0.c.n : '', hp: 70, cr: S0.c ? 30 : 25, hap: 55, raise: 1, mul: 1, bonus: 0, freeze: 0, hunt: 0,
    moves: 0, cuts: 0, burn: 0, fails: 0, used: {}, dk: pz.day || '', dating: 0, married: 0, kids: 0, off: 0, rest: 0, track: '', firstCo: S0.c ? S0.c.n : '', maxS: 0, eokY: 0, starts: [] };
  const years = [], log = [], notes = [], out = [g];
  let k = 0;
  for (let y = 0; y < 20; y++) {
    S.y = y; S.mul = 1; S.bonus = 0; notes[y] = [];
    // 3년 뒤 스타트업 결판
    if (S.su && S.suY === y && S.suMine) {   // v3 내 창업: 아이템마다 확률·보상이 다름
      if (S.suU < S.suP) { S.bonus += S.suBase * S.suPay; S.suWin = 1; r2Add(S, { cr: 12, hap: 10 }); notes[y].push('my_win'); }
      else if (S.suU < S.suP + .3) { S.s = S.suBase * .9; r2Add(S, { cr: 6, hap: 2 }); notes[y].push('my_ok'); }
      else { S.mul = .4; r2Move(S, ctx.by[pz.spare[1]], curve(ctx.by[pz.spare[1]], S.x) * .9); S.moves--; r2Add(S, { hap: -8, hp: -5, cr: 3 }); notes[y].push('my_fail'); }
      S.suMine = S.su ? 1 : 0;
    } else if (S.su && S.suY === y) {
      if (S.suU < .3) { S.bonus += S.s * 2.5; S.suWin = 1; r2Add(S, { cr: 10, hap: 8 }); notes[y].push('su_win'); }
      else if (S.suU < .62) { r2Add(S, { cr: 5 }); notes[y].push('su_ok'); }
      else { S.mul = .4; r2Move(S, ctx.by[pz.spare[1]], curve(ctx.by[pz.spare[1]], S.x) * .9); S.moves--; r2Add(S, { hap: -6, hp: -4 }); notes[y].push('su_fail'); }
    }
    if (S.reAuto === y) { const T = ctx.by[pz.spare[2]]; r2Move(S, T, r2Re(ctx, T, S.x).O); S.moves--; S.off = 0; S.back = 1; S.reAuto = 0; notes[y].push('re_auto'); }
    if (S.rest) { S.mul = Math.min(S.mul, .5); S.rest = 0; notes[y].push('rest'); }
    const prevS = S.s;
    let moved = false, slotLog = null;
    if (k < R2_SLOTS.length && R2_SLOTS[k][0] === y) {
      const sl = r2Slot(pz, ctx, S, k);
      if (stop != null && k >= stop) return { stop: true, S, years, log, notes, slot: sl, picks: out };
      let p = picks[k + 1]; if (!(p >= 0 && p < sl.opts.length)) p = sl.opts.length - 1;
      out.push(p);
      const op = sl.opts[p], u = pz.u[k][p], before = { hp: S.hp, cr: S.cr, hap: S.hap };
      slotLog = { k, y, x: S.x, t: sl.t, id: sl.id, pick: p, lb: op.lb || '', txt: '', moved: false, failed: false };
      if (op.job) {
        const T = ctx.by[op.o.n], of = op.of, fp = clamp(.35 - (S.cr - 50) / 250, .1, .5);
        if (of.reach && u[0] < fp) { slotLog.failed = true; S.fails++; r2Add(S, { hap: -3 }); slotLog.txt = 'fail'; }
        else {
          const nego = sl.first || op.o.kind === 're' ? 1 : negoMul(clamp(u[1] + (S.cr - 50) / 200 + (S.hunt ? .15 : 0), 0, 1), N) / N.p50;
          const first = sl.first;
          r2Move(S, T, of.O * nego); if (first) S.moves = 0; else if (op.o.kind === 're') { S.moves--; S.off = 0; S.back = 1; }
          if (first) S.firstCo = T.n;
          moved = true; slotLog.moved = true; slotLog.nego = Math.round(nego * 1000) / 1000; slotLog.kind = op.o.kind;
          r2Add(S, first ? { hap: 3 } : op.o.kind === 'up' ? { cr: 6, hp: -3 } : op.o.kind === 're' ? { cr: 6, hap: 3 } : { cr: 3 });
          S.hunt = 0; S.backHit = 0;
        }
      } else if (op.stay) {
        if (S.off) { S.reAuto = y + 1; slotLog.txt = 'more'; } else slotLog.txt = 'stay';
        if (sl.id === 'job' && !S.su && !S.retired) r2Add(S, { hap: 1 });
      } else {
        S.used[sl.id] = 1;
        slotLog.txt = op.f(S, u, ctx, pz);
      }
      slotLog.co = S.cname; slotLog.d = { hp: S.hp - before.hp, cr: S.cr - before.cr, hap: S.hap - before.hap };
      k++;
    }
    // 연봉: 옮긴 해는 새 연봉, 아니면 그 회사 곡선대로 (동결·스타트업·2막·공백 해는 그대로)
    if (S.off) { S.mul = Math.min(S.mul, y === S.kidY ? .3 : 0); notes[y].push('gap'); }
    else if (!moved && S.c && y > 0 && prevS === S.s) {
      if (S.freeze > 0) { S.freeze--; notes[y].push('freeze'); }
      else if (!S.su && !S.retired) S.s *= curve(S.c, S.x) / curve(S.c, S.x - 1);
      else if (S.su) S.s *= 1.03;
    }
    if (S.raise !== 1) { S.s *= S.raise; S.raise = 1; }
    if (S.short > 0) { S.mul = Math.min(S.mul, .8); S.short--; }
    // 그해 회사 분위기: 성과급 큰 해 · 스톡옵션 · 고과
    const c = S.c, dd = pz.yd[y];
    if (c && S.mul > 0 && !S.su && !S.retired) {
      if (pz.sc === 'dev' && devCo(c) && dd > .9) { S.bonus += S.s * (c.my >= 8 ? .6 : .25); notes[y].push('stock'); }
      else if (c.jump && dd < .3) { S.bonus += S.s * Math.min(c.jump, 80) / 100 * .5; notes[y].push('jump'); }
    }
    const inc = Math.round(S.s * S.mul + S.bonus);
    years.push(inc);
    if (S.s > S.maxS) S.maxS = S.s;
    if (!S.eokY && inc >= 10000) S.eokY = y + 1;
    // 게이지: 회사 평점·나이·아이
    if (c && S.mul > 0) {
      const rt = c.rt || 3.3;
      r2Add(S, { hp: rt < 3 ? -5 : rt < 3.4 ? -3 : rt >= 3.7 ? 1 : -1, hap: rt < 3 ? -3 : rt >= 3.7 ? 2 : 0, cr: (S.su || c.my >= 8 ? 2 : 1) });
    }
    if (y >= 14) r2Add(S, { hp: -1 });
    if (S.kids && y - S.kidY < 4) r2Add(S, { hp: -2, hap: 1 });
    r2Add(S, { hap: S.married ? 1 : -1 });   // 생활 피로 -1, 함께 사는 사람이 있으면 +1
    if (S.hp <= 12 && !S.rest) { S.rest = 1; S.burn++; S.hp = 50; r2Add(S, { cr: -5, hap: -5 }); notes[y].push('burn'); }
    if (slotLog) log.push(Object.assign(slotLog, { inc, s: Math.round(S.s), notes: notes[y].slice() }));
    else log.push({ y, x: S.x, quiet: 1, inc, s: Math.round(S.s), co: S.cname, notes: notes[y].slice() });
    if (!S.off) S.x++;
  }
  if (stop != null) return { stop: false, S, years, log, notes, slot: null, picks: out };
  const total = years.reduce((a, b) => a + b, 0);
  return { years, log, notes, total, S, eok: S.eokY, picks: out, score: r2Score(total, S) };
}
// 엔딩 15종 (위에서부터 처음 맞는 것)
const ENDINGS2 = [['exec', '임원의 길'], ['startup', '스타트업 대박'], ['boss', '억대 연봉 부장'], ['expert', '업계 전문가'], ['returner', '다시 일어선 사람'],
  ['second', '인생 2막'], ['family', '가족이 1순위'], ['hopper', '이직의 신'], ['lifer', '한 회사 20년'], ['balance', '워라밸 장인'],
  ['solo', '자유로운 싱글'], ['late', '늦게 핀 꽃'], ['survivor', '구조조정 생존자'], ['burnout', '번아웃 퇴사'], ['normal', '무난한 직장인']];
function roadEnding2(pz, ctx, picks) {
  const R = simRoad2(pz, ctx, picks), S = R.S, Y = R.years;
  const a5 = Y.slice(0, 5).reduce((a, b) => a + b, 0) / 5, z5 = Y.slice(15).reduce((a, b) => a + b, 0) / 5;
  const id = S.exec ? 'exec' : S.suWin ? 'startup' : S.eokY && S.eokY <= 9 ? 'boss'
    : S.track === 'exp' && S.cr >= 88 ? 'expert' : (S.back || S.burn >= 1) && S.cr >= 58 && S.hp >= 42 ? 'returner'
    : S.retired ? 'second' : S.kids && S.hap >= 70 ? 'family' : S.moves >= 4 ? 'hopper'
    : S.moves === 0 && !S.fails && ctx.by[S.firstCo] && ctx.by[S.firstCo].m >= 5000 ? 'lifer'
    : S.hp >= 60 && S.hap >= 65 ? 'balance' : !S.married && S.hap >= 70 ? 'solo'
    : z5 >= a5 * 2.6 ? 'late' : S.cuts >= 2 ? 'survivor' : S.burn >= 2 || (S.burn >= 1 && S.hp < 30) || S.hp < 15 ? 'burnout' : 'normal';   // 2026-10-30 무난한 직장인이 너무 드물어 boss·expert·returner·burnout 문턱을 올림
  return { id, lb: ENDINGS2.find(e => e[0] === id)[1], R };
}

// 판 나누기: 날짜로 10년 판(1) · 20년 판(2)
function genRoad(day, ctx) { return roadV(day) === 2 ? genRoad2(day, ctx) : genRoad1(day, ctx); }
function simRoad(pz, ctx, picks, stop) { return pz.v === 2 ? simRoad2(pz, ctx, picks, stop) : simRoad1(pz, ctx, picks); }
function scoreRoad(pz, ans, ctx) {
  if (pz.v !== 2) return scoreRoad1(pz, ans, ctx);
  const R = simRoad2(pz, ctx, ans); return { score: R.score, aux: R.eok, perfect: false, picks: R.picks, R };
}
function roadEnding(pz, ctx, picks) { return pz.v === 2 ? roadEnding2(pz, ctx, picks) : roadEnding1(pz, ctx, picks); }
const ENDINGS = ENDINGS2;

// ── 5 드림 컴퍼니 월드컵 (점수 없음, 전국 선택률만)
const THEMES = { all: '전체', it: 'IT·게임', food: '식품·유통', fin: '금융', pub: '공기업' };
function cupPool(ctx, theme) {
  const f = { it: c => c.grp === 'IT·게임' || c.grp === '통신·미디어', food: c => c.grp === '식품' || c.grp === '유통·상사', fin: c => c.grp === '금융', pub: c => !!c.pub }[theme] || (() => true);
  let L = ctx.P.filter(c => c.m >= 2000 && f(c));
  if (L.length < 16) L = ctx.P.filter(f);
  return L;
}
function cupSize(L) { return L.length >= 16 ? 16 : 8; }
// ── 오늘의 16강 (2026-11-01 사용자: '어떻게 1등 되는지 모르겠다'): 날짜 씨앗으로 누구에게나 같은 16곳·같은 대진.
//    한 판마다 '민심'(전국 선택률이 높은 쪽)과 같은 쪽을 고르면 점수 — 16강 40 · 8강 60 · 4강 80 · 결승 100 (합 820)
//    + 안목 보너스: 우승 회사의 대리 연봉이 16곳 중 r위면 (16 − r) × 12 (최대 180) → 만점 1,000
//    ans = 판마다 고른 쪽 [0 = 왼쪽, 1 = 오른쪽] × 15. 대진은 앞에서부터 둘씩, 이긴 회사끼리 다음 판
const CUP_W = [40, 60, 80, 100], CUP_EYE = 12;
function genCup(day, ctx) { const L = cupPool(ctx, 'all'); return { game: 'cup', day, all: shuffleR(rng('cup16|' + day), L).slice(0, cupSize(L)).map(c => c.n) }; }
function simCup(all, ans) {
  if (!Array.isArray(ans) || ans.length !== all.length - 1) return null;
  let round = all.slice(), r = 0, k = 0; const ms = [];
  while (round.length > 1) {
    const nx = [];
    for (let i = 0; i < round.length; i += 2) { const p = ans[k++]; if (p !== 0 && p !== 1) return null; ms.push({ r, a: round[i], b: round[i + 1], w: round[i + p] }); nx.push(round[i + p]); }
    round = nx; r++;
  }
  return { ms, champ: round[0] };
}
// 민심: 전국 선택률 (이긴 판 + 5) / (나온 판 + 10) — 기록이 적은 회사는 50% 쪽으로. rates = {이름: [나온 판, 이긴 판]}
function cupShare(rates, n) { const x = (rates && rates[n]) || [0, 0]; return (Math.max(0, +x[1] || 0) + 5) / (Math.max(0, +x[0] || 0) + 10); }
function cupMaj(rates, a, b) { const sa = cupShare(rates, a), sb = cupShare(rates, b); return { pa: sa / (sa + sb), maj: sa === sb ? '' : sa > sb ? a : b }; }
function scoreCupAll(all, ans, ctx, rates) {
  const S = simCup(all, ans);
  if (!S) return { score: 0, aux: 0, bad: true, perfect: false, seq: '' };
  let score = 0, agree = 0; const per = S.ms.map(m => { const M = cupMaj(rates, m.a, m.b), ok = !M.maj || M.maj === m.w; if (ok) { agree++; score += CUP_W[m.r] || 100; } return ok ? 1 : 0; });
  const by = all.map(n => ctx.by[n]).sort((x, y) => y.rk[1] - x.rk[1]), eyeR = by.findIndex(c => c.n === S.champ) + 1, eye = (all.length - eyeR) * CUP_EYE;
  return { score: score + eye, aux: agree, agree, eye, eyeR, champ: S.champ, per, ms: S.ms, perfect: agree === S.ms.length, seq: ans.join('') };
}
function scoreCup(pz, ans, ctx, rates) { return scoreCupAll(pz.all, ans, ctx, rates); }
// picks: [[이긴 회사, 진 회사]] × (16강 15판 / 8강 7판) → {champ, agg: {이름: [나온 판, 이긴 판, 우승]}} 또는 null(이상한 대진)
function cupCheck(ctx, theme, picks) {
  if (!THEMES[theme] || !Array.isArray(picks)) return null;
  const L = cupPool(ctx, theme), ok = new Set(L.map(c => c.n)), n = cupSize(L), agg = {}, alive = new Set();
  if (picks.length !== n - 1) return null;
  for (let i = 0; i < picks.length; i++) {
    const w = String((picks[i] || [])[0] || ''), l = String((picks[i] || [])[1] || '');
    if (!ok.has(w) || !ok.has(l) || w === l) return null;
    if (i < n / 2) { if (agg[w] || agg[l]) return null; agg[w] = [0, 0, 0]; agg[l] = [0, 0, 0]; alive.add(w); alive.add(l); }
    else if (!alive.has(w) || !alive.has(l)) return null;
    agg[w][0]++; agg[l][0]++; agg[w][1]++; alive.delete(l);
  }
  if (alive.size !== 1) return null;
  const champ = [...alive][0]; agg[champ][2] = 1;
  return { champ, agg };
}

// ── 이번 주 보스 회사 (4차, 2026-10-28): ISO 주로만 정함 → 누구나 같은 보스. 쉬운 급(이름난 120곳)을 해마다 섞어 주 번호 순서로 → 한 해 안엔 겹치지 않음
// 점수와는 상관없는 꾸밈 (순위 공정)
function bossOf(day, ctx) {
  const wk = isoWeek(day), y = wk.slice(0, 4), n = +wk.slice(6), L = shuffleR(rng('boss|' + y), ctx.H.filter(c => c.tier === 0));
  return L[(n - 1) % L.length].n;
}

// ── 닉네임: 2~10자 한글·영문·숫자, 금칙어 거르기. 자동 짓기는 '판교불주먹' 같은 [동네·회사생활] + [별명]
const NICK_A = ['판교', '여의도', '강남', '광화문', '을지로', '성수', '마곡', '송도', '구로', '상암', '가산', '테헤란', '칼퇴', '야근', '월급', '연봉', '출근', '퇴근', '이직', '승진', '성과급', '연차', '점심', '회식', '법카', '사원증', '탕비실', '월요일', '금요일', '반차'];
const NICK_B = ['불주먹', '요정', '도사', '장인', '사냥꾼', '감별사', '대장', '고수', '막내', '부장', '요원', '마법사', '탐정', '기사', '총잡이', '여왕', '왕자', '다람쥐', '호랑이', '펭귄', '곰돌이', '감자', '고양이', '수달', '빌런', '천재', '전설', '박사'];
const NICK_BLOCK = ['씨발', '시발', '씨빨', 'ㅅㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '새끼', '좆', '존나', '졸라', '섹스', '자지', '보지', '니미', '느금', '엠창', '애미', '애비', '썅', '지랄', '미친', '꺼져', '닥쳐', '일베', '한남', '한녀', '틀딱', '자살', '살인', '마약',
  'fuck', 'shit', 'bitch', 'sex', 'porn', 'nigger', 'admin', '관리자', '운영자', '운영진', '취업조로', '조로', 'zorro', 'jobzorro'];
function makeNick(r) { for (;;) { const s = pickR(r, NICK_A) + pickR(r, NICK_B); if (s.length <= 10) return s; } }
function nickCheck(s) {   // '' = 괜찮음, 아니면 고칠 점
  s = String(s || '').trim();
  if (s.length < 2 || s.length > 10) return '2~10자로 지어 주세요.';
  if (!/^[가-힣A-Za-z0-9]+$/.test(s)) return '한글·영문·숫자만 쓸 수 있어요(띄어쓰기 없이).';
  const low = s.toLowerCase().replace(/[0-9]/g, '');
  if (NICK_BLOCK.some(w => low.indexOf(w) >= 0)) return '쓸 수 없는 말이 들어 있어요.';
  return '';
}

// ── 연봉 줄서기 (2026-11-01, 로비 01번 = 예전 '어디가 더' 자리): 회사·직급이 다른 조로들을 연봉 높은 순서대로 줄 세우기
//    5판 3·4·4·5·5명. 조로 한 명 = 회사(로고 있는 이름난 400곳) + 직급, 연봉 = 직급 추정값 rk. 짝수 판은 같은 회사 다른 직급을 한 명 섞음
//    연봉끼리 4% 넘게 차이(동점 없음), 뒤 판일수록 위아래 폭이 좁음, 업종(= 옷 색)은 되도록 다 다르게
//    점수: 자리 맞힌 조로 1명 100점 + 한 판 다 맞히면 150점 (만점 2,850). aux = 완벽한 판 수(0~5)
const LINE_N = [3, 4, 4, 5, 5], LINE_PT = 100, LINE_PERF = 150;
function lineRounds(seed, ctx) {   // seed: 오늘의 줄 = 날짜, 연습 판 = 아무 글
  const r = rng('line|' + seed), H = ctx.H.filter(c => c.tier <= 1);
  return LINE_N.map((n, k) => {
    let best = null, ok2 = null, last = null;   // ok2 = 조건은 덜 맞아도 연봉 4% 차이는 지킨 줄 (끝까지 못 찾으면 이걸로)
    for (let t = 0; t < 200; t++) {
      const ppl = [], used = {}; let guard = 0;
      while (ppl.length < n && guard++ < 50) {
        let c = H[Math.floor(r() * H.length)], ri = Math.floor(r() * 5);
        if (k % 2 && ppl.length === 1) { c = ppl[0].c; ri = (ppl[0].ri + 1 + Math.floor(r() * 3)) % 5; }
        if (used[c.n + ri]) continue; used[c.n + ri] = 1;
        ppl.push({ c, ri, v: c.rk[ri] });
      }
      const vs = ppl.map(p => p.v).sort((a, b) => b - a);
      const gap = vs.every((v, i) => !i || (vs[i - 1] - v) / vs[i - 1] >= .04), span = (vs[0] - vs[n - 1]) / vs[0];
      const gs = {}; ppl.forEach(q => { gs[q.c.grp] = 1; });
      last = ppl; if (gap && !ok2) ok2 = ppl;
      if (gap && span < [.75, .65, .55, .5, .45][k] && Object.keys(gs).length >= n - (k % 2)) { best = ppl; break; }
    }
    best = best || ok2 || last;
    return best.map(p => ({ n: p.c.n, ri: p.ri, v: p.v }));
  });
}
function genLine(day, ctx) { return { game: 'line', day, R: lineRounds(day, ctx) }; }
// 세운 줄 pick(조로 번호 순서)의 자리마다 맞는지: 그 자리 연봉 = 정답 순서 그 자리 연봉
function lineCheck(P, pick) { const vs = P.map(p => p.v).sort((a, b) => b - a); return pick.map((j, i) => P[j].v === vs[i]); }
function linePick(a, n) { return Array.isArray(a) && a.length === n && a.every(j => Number.isInteger(j) && j >= 0 && j < n) && new Set(a).size === n; }
function scoreLine(pz, ans) {   // ans = 판마다 세운 줄 [[2,0,1], [3,1,0,2], …] — 다 끝난 판만 받음
  if (!Array.isArray(ans) || ans.length !== pz.R.length || !pz.R.every((P, k) => linePick(ans[k], P.length))) return { bad: 1, score: 0, aux: 0 };
  let score = 0, ok = 0, perf = 0; const res = [];
  pz.R.forEach((P, k) => {
    const r = lineCheck(P, ans[k]), c = r.filter(Boolean).length;
    ok += c; score += c * LINE_PT + (c === P.length ? LINE_PERF : 0); if (c === P.length) perf++;
    res.push(r.map(x => (x ? 'o' : 'x')).join(''));
  });
  return { score, aux: perf, ok, res, seq: res.join('-'), perfect: perf === pz.R.length };
}

// ── 공통: 게임별 문제·점수
// ── 조로 출근길 (2026-10-29): 손으로 하는 달리기라 서버가 판을 다시 돌릴 수는 없다.
//    대신 오늘 코스는 날짜 씨앗 하나(모두 같은 길)이고, 보낸 숫자가 말이 되는지만 본다:
//    점수 = 주운 돈 m + 정시 보너스 b, 돈·보너스 상한, 걸린 시간 el(초)이 너무 짧지 않을 것 (서버는 시작 표 이후 실제 걸린 시간과도 맞춰 봄)
const RUN_MONEY_MAX = 30000, RUN_BONUS_MAX = 2000, RUN_EL_MIN = 45;
function genRun(day) { return { day, seed: 'day|' + day }; }
function scoreRun(pz, ans) {
  const a = ans || {}, n = k => Number.isInteger(a[k]) ? a[k] : -1;
  const m = n('m'), b = n('b'), s = n('s'), el = n('el'), h = n('h');
  if (m < 0 || m > RUN_MONEY_MAX || b < 0 || b > RUN_BONUS_MAX || s !== m + b || el < RUN_EL_MIN || el > 1800 || h < 0 || h > 200) return { bad: 1, score: 0, aux: 0 };
  return { score: s, aux: b > 0 ? 1 : 0, el };   // aux = 정시 출근(1) · 지각(0)
}
function gen(game, day, ctx) { return game === 'higher' ? genHigher(day, ctx) : game === 'today' ? genToday(day, ctx) : game === 'sniper' ? genSniper(day, ctx) : game === 'road' ? genRoad(day, ctx) : game === 'run' ? genRun(day) : game === 'cup' ? genCup(day, ctx) : game === 'line' ? genLine(day, ctx) : null; }
// rates: 월드컵만 (서버가 DB 에서 그 16곳의 전국 선택률을 읽어 넘김)
function score(game, pz, ans, ctx, rates) { return game === 'higher' ? scoreHigher(pz, ans, ctx) : game === 'today' ? scoreToday(pz, ans, ctx) : game === 'sniper' ? scoreSniper(pz, ans, ctx) : game === 'road' ? scoreRoad(pz, ans, ctx) : game === 'run' ? scoreRun(pz, ans) : game === 'cup' ? scoreCup(pz, ans, ctx, rates) : game === 'line' ? scoreLine(pz, ans) : null; }

export { RULES, EPOCH, RK, DAILY, GAMES, hash32, rng, pickR, shuffleR, kstDay, addDays, dayIndex, dow, isoWeek, weekDays, msToMidnight, load, STATS, HIGHER_N, HIGHER_MS, higherWin, higherBonus, genHigher, endlessQ, scoreHigher, TODAY_N, TODAY_PICKS, TODAY_CLUES, TODAY_BASE, TODAY_CLUE, TODAY_MISS, TODAY_FLOOR, genToday, todayCands, sizeBand, ageBand, todayClues, simToday, todayPts, scoreToday, todayEmoji, firstChar, SNIPER_N, SN_LO, SN_HI, SN_STEP, genSniper, sniperErr, sniperPts, sniperVal, scoreSniper, curve, negoMul, ROAD_SC, ROAD_WEEK, ROAD_SC_FROM, roadScen, ROAD2_FROM, roadV, WEEK_OFF, weekOff, R2_SLOTS, R2_N, R2_W, R2_EV, ROAD3_FROM, R3_GRAD, R3_SU, r2Score, simRoad2, roadEnding2, ENDINGS1, ENDINGS2, devCo, genRoad, roadOffer, roadRisk, roadRiskSc, roadStart, simRoad, scoreRoad, ENDINGS, roadTotals, roadEnding, RUN_MONEY_MAX, RUN_BONUS_MAX, RUN_EL_MIN, genRun, scoreRun, THEMES, cupPool, cupSize, cupCheck, CUP_W, CUP_EYE, genCup, simCup, cupShare, cupMaj, scoreCupAll, scoreCup, T3_N, T3_MAXQ, T3_FREE, T3_Q, T3_PRE, T3_PRE2, T3_PRE2_FROM, t3Premise, T3_EARLY, T3_EARLY_MAX, T3_FLOOR, t3Ask, t3Final, simToday3, today3Pts, t3Questions, T4_N, T4_TRIES, T4_STEP, simToday4, today4Pts, TODAY2_FROM, TODAY2_TRIES, TODAY2_STEP, TODAY2_COLS, today2Cell, today2Row, simToday2, today2Pts, today2Emoji, LINE_N, LINE_PT, LINE_PERF, lineRounds, genLine, lineCheck, scoreLine, bossOf, makeNick, nickCheck, NICK_A, NICK_B, gen, score };
