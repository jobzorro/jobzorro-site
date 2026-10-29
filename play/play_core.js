// 연봉 놀이터 v2 공통 규칙 — 화면(page.js)과 서버(api/src/index.js)가 같이 불러 쓴다.
// DOM 없음. 무작위는 rng(씨앗)만 쓴다 → 같은 날짜·같은 회사 목록이면 누구에게나 같은 문제.
// 점수는 (문제, 답) → 점수 함수로만 계산하고, 서버는 브라우저가 보낸 답으로 다시 계산한다.
// 주의: 'export { ... };' 줄은 파일 맨 끝 한 줄로만 둔다 (make.py 가 미리보기에서 이 줄을 전역 변수로 바꿈).

const RULES = 4;                 // 규칙 판: 점수 규칙을 바꾸면 올린다 (2 = 2026-10-28 오늘의 회사 8지선다, 3 = 이직 로드 요일별 시나리오 팩·엔딩, 4 = 커리어 로드 20년 2026-10-31~)
const EPOCH = '2026-10-01';      // 오늘의 회사 #1 날짜 (바꾸면 모든 날의 문제가 바뀜)
const RK = ['사원', '대리', '과장', '차장', '부장'];
const DAILY = ['higher', 'today', 'sniper', 'road', 'run'];   // 순위표가 있는 오늘의 도전 (2026-10-29 조로 출근길 추가)
const GAMES = DAILY.concat(['endless', 'cup']);              // 플레이 수만 세는 판

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
    sido: r[11], exR: r[12], lg: r[13] || '', lt: r[14] || 0, hl: r[15], grp: r[16], jump: r[17] || 0, rt: r[18] || 0, my: r[19] || 0, pub: r[20], ag: r[21] || 0 }));
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
function todayCands(A, day, ctx) {
  const r = rng('today8|' + day), t = A.tier, used = { [A.n]: 1 }, out = [];
  const L = ctx.H.filter(c => c.n !== A.n && c.tier <= t);
  const far = c => Math.abs(Math.log(c.m / A.m));
  const take = (list, k) => { shuffleR(r, list).forEach(c => { if (out.length < k && !used[c.n]) { used[c.n] = 1; out.push(c); } }); };
  const near = L.filter(c => c.grp === A.grp).sort((x, y) => far(x) - far(y) || (x.n < y.n ? -1 : 1));
  const want = TODAY_SAME[t] || 5;
  take(t === 0 ? near : near.slice(0, want + (t === 1 ? 6 : 3)), want);   // 보통: 가까운 11곳 중 5곳 · 어려움: 가까운 10곳 중 7곳
  take(near, want);                                                         // 모자라면 같은 업종 아무 곳
  const rest = L.filter(c => c.grp !== A.grp);
  take(t === 0 ? rest : rest.filter(c => far(c) < Math.log(3)), TODAY_N - 1);   // 다른 업종: 보통·어려움은 직원 수 3배 안
  take(rest, TODAY_N - 1);
  return shuffleR(r, out.concat([A])).map(c => c.n);
}
function genToday(day, ctx) {
  const A = todayAns(day, ctx);
  return { game: 'today', day, no: dayIndex(day) + 1, ans: A.n, tier: A.tier, cands: todayCands(A, day, ctx) };
}
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
const ROAD2_FROM = '2026-10-31';   // 이 날부터 20년 판 (그 전 날짜는 10년 판 그대로)
function roadV(day) { return day >= ROAD2_FROM ? 2 : 1; }
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
  return Object.assign({}, base, { v: 2, spare, ed, u, yd });
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
  l_parent: { t: 'life', fixed: 1, q: () => '부모님이 편찮으시다는 연락을 받았다.',
    o: () => [
      { lb: '가족돌봄휴직을 쓴다', h: { hap: 1, m: -1, cr: -1 }, f: S => { S.mul = .75; r2Add(S, { hap: 7, hp: -4, cr: -2 }); return '석 달을 병원에서 보냈다. 부모님 손을 오래 잡았다.'; } },
      { lb: '주말마다 내려간다', h: { hp: -1, hap: 1 }, f: S => { r2Add(S, { hp: -6, hap: 4 }); return '금요일 밤 기차가 익숙해졌다.'; } },
      { lb: '형제와 나눠 맡는다', h: { hap: 0 }, f: S => { r2Add(S, { hap: 1, hp: -1 }); return '돌아가며 챙기기로 했다. 단체 대화방이 바빠졌다.'; } }] },
  l_health: { t: 'life', fixed: 1, q: () => '아침에 일어나기가 힘들다. 몸이 먼저 신호를 보낸다.',
    o: () => [
      { lb: '석 달 쉰다', h: { hp: 2, m: -1 }, f: S => { S.mul = Math.min(S.mul, .75); r2Add(S, { hp: 25, cr: -3, hap: 3 }); return '석 달을 쉬었다. 다시 아침이 가벼워졌다.'; } },
      { lb: '운동부터 시작한다', h: { hp: 1 }, f: S => { r2Add(S, { hp: 12, cr: -1 }); return '새벽 수영을 시작했다.'; } },
      { lb: '조금만 더 버틴다', h: { hp: -1, cr: 1 }, f: S => { r2Add(S, { hp: -5, cr: 2 }); return '버텼다. 몸은 기억하고 있을 것이다.'; } }] }
};
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
  if (t === 'work' && S.off) id = 'w_home';
  if (t === 'life' && S.hp < 35 && id !== 'l_marry' && id !== 'l_baby') id = 'l_health';   // 체력이 바닥이면 몸이 먼저
  if (!id) {
    const L = Object.keys(R2_EV).filter(e => { const E = R2_EV[e]; return E.t === t && !E.fixed && !S.used[e] && ch >= E.ch[0] && ch <= E.ch[1] && (E.g == null || E.g === S.g) && (!E.c || E.c(S, S.c, pz)); });
    const W = L.map(e => (R2_EV[e].w || 1) * (e === 'w_cut' ? roadRiskSc(pz, S.c) * 6 : 1)), sum = W.reduce((a, b) => a + b, 0);
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
    moves: 0, cuts: 0, burn: 0, fails: 0, used: {}, dating: 0, married: 0, kids: 0, off: 0, rest: 0, track: '', firstCo: S0.c ? S0.c.n : '', maxS: 0, eokY: 0, starts: [] };
  const years = [], log = [], notes = [], out = [g];
  let k = 0;
  for (let y = 0; y < 20; y++) {
    S.y = y; S.mul = 1; S.bonus = 0; notes[y] = [];
    // 3년 뒤 스타트업 결판
    if (S.su && S.suY === y) {
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
  const id = S.exec ? 'exec' : S.suWin ? 'startup' : S.eokY && S.eokY <= 10 ? 'boss'
    : S.track === 'exp' && S.cr >= 85 ? 'expert' : (S.back || S.burn >= 1) && S.cr >= 55 && S.hp >= 40 ? 'returner'
    : S.retired ? 'second' : S.kids && S.hap >= 70 ? 'family' : S.moves >= 4 ? 'hopper'
    : S.moves === 0 && !S.fails && ctx.by[S.firstCo] && ctx.by[S.firstCo].m >= 5000 ? 'lifer'
    : S.hp >= 60 && S.hap >= 65 ? 'balance' : !S.married && S.hap >= 70 ? 'solo'
    : z5 >= a5 * 2.6 ? 'late' : S.cuts >= 2 ? 'survivor' : S.burn >= 1 || S.hp < 25 ? 'burnout' : 'normal';
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
  const f = { it: c => c.grp === 'IT·게임' || c.grp === '통신·미디어', food: c => c.grp === '식품·유통', fin: c => c.grp === '금융', pub: c => !!c.pub }[theme] || (() => true);
  let L = ctx.P.filter(c => c.m >= 2000 && f(c));
  if (L.length < 16) L = ctx.P.filter(f);
  return L;
}
function cupSize(L) { return L.length >= 16 ? 16 : 8; }
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
function gen(game, day, ctx) { return game === 'higher' ? genHigher(day, ctx) : game === 'today' ? genToday(day, ctx) : game === 'sniper' ? genSniper(day, ctx) : game === 'road' ? genRoad(day, ctx) : game === 'run' ? genRun(day) : null; }
function score(game, pz, ans, ctx) { return game === 'higher' ? scoreHigher(pz, ans, ctx) : game === 'today' ? scoreToday(pz, ans, ctx) : game === 'sniper' ? scoreSniper(pz, ans, ctx) : game === 'road' ? scoreRoad(pz, ans, ctx) : game === 'run' ? scoreRun(pz, ans) : null; }

export { RULES, EPOCH, RK, DAILY, GAMES, hash32, rng, pickR, shuffleR, kstDay, addDays, dayIndex, dow, isoWeek, weekDays, msToMidnight, load, STATS, HIGHER_N, HIGHER_MS, higherWin, higherBonus, genHigher, endlessQ, scoreHigher, TODAY_N, TODAY_PICKS, TODAY_CLUES, TODAY_BASE, TODAY_CLUE, TODAY_MISS, TODAY_FLOOR, genToday, todayCands, sizeBand, ageBand, todayClues, simToday, todayPts, scoreToday, todayEmoji, firstChar, SNIPER_N, SN_LO, SN_HI, SN_STEP, genSniper, sniperErr, sniperPts, sniperVal, scoreSniper, curve, negoMul, ROAD_SC, ROAD_WEEK, ROAD_SC_FROM, roadScen, ROAD2_FROM, roadV, WEEK_OFF, weekOff, R2_SLOTS, R2_N, R2_W, R2_EV, r2Score, simRoad2, roadEnding2, ENDINGS1, ENDINGS2, devCo, genRoad, roadOffer, roadRisk, roadRiskSc, roadStart, simRoad, scoreRoad, ENDINGS, roadTotals, roadEnding, RUN_MONEY_MAX, RUN_BONUS_MAX, RUN_EL_MIN, genRun, scoreRun, THEMES, cupPool, cupSize, cupCheck, bossOf, makeNick, nickCheck, NICK_A, NICK_B, gen, score };
