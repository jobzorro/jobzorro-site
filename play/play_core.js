// 연봉 놀이터 v2 공통 규칙 — 화면(page.js)과 서버(api/src/index.js)가 같이 불러 쓴다.
// DOM 없음. 무작위는 rng(씨앗)만 쓴다 → 같은 날짜·같은 회사 목록이면 누구에게나 같은 문제.
// 점수는 (문제, 답) → 점수 함수로만 계산하고, 서버는 브라우저가 보낸 답으로 다시 계산한다.
// 주의: 'export { ... };' 줄은 파일 맨 끝 한 줄로만 둔다 (make.py 가 미리보기에서 이 줄을 전역 변수로 바꿈).

const RULES = 2;                 // 규칙 판: 점수 규칙을 바꾸면 올린다 (2 = 2026-10-28 오늘의 회사 8지선다)
const EPOCH = '2026-10-01';      // 오늘의 회사 #1 날짜 (바꾸면 모든 날의 문제가 바뀜)
const RK = ['사원', '대리', '과장', '차장', '부장'];
const DAILY = ['higher', 'today', 'sniper', 'road'];        // 순위표가 있는 오늘의 도전
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
function genRoad(day, ctx) {
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
  return { game: 'road', day, steps };
}
// 제안 카드: 가운데 값 O, 보이는 범위(협상 결과 ±약 10%), 스펙 대비 너무 높은 제안(reach)
function roadOffer(ctx, o, x, s) {
  const T = ctx.by[o.n], N = ctx.nego;
  const O = o.kind === 'new' ? (T.s0 || T.rk[0] * .92) : Math.max(s * .92, Math.min(curve(T, x + (o.kind === 'up' ? 4 : 0)), s * 1.5));
  return { O, lo: Math.round(O * negoMul(0, N) / N.p50 / 100) * 100, hi: Math.round(O * negoMul(1, N) / N.p50 / 100) * 100,
    reach: o.kind !== 'new' && O >= s * 1.3 };
}
function roadRisk(c) { return Math.min(.25, Math.max(.03, (c.to || 0) * 1.5)) + (c.rt && c.rt < 3 ? .08 : 0) + (c.my <= -10 ? .05 : 0); }
function roadPicks(picks) { return [0, 1, 2, 3, 4].map(k => { const p = Math.floor(Number((picks || [])[k])); return p >= 0 && p <= 2 ? p : 2 - (k === 0 ? 2 : 0); }); }
// picks: [0~2] × 5 (첫 칸은 첫 직장 3곳 중 하나, 그 뒤 0·1 = 제안, 2 = 남기)
function simRoad(pz, ctx, picks) {
  picks = roadPicks(picks);
  const N = ctx.nego, years = [], log = [];
  let x = 0, s = 0, c = null;
  for (let k = 0; k < 5; k++) {
    const st = pz.steps[k], p = picks[k], u = st.u[p], o = k === 0 || p < 2 ? st.o[p] : null;
    let moved = false, failed = false, start = 0, nego = 0;
    if (o) {
      const of = roadOffer(ctx, o, x, s);
      if (of.reach && u[0] < .35) failed = true;          // 이직 실패: 스펙 대비 너무 높은 제안은 35% 확률로 떨어짐
      else { moved = true; c = ctx.by[o.n]; nego = k ? negoMul(u[1], N) / N.p50 : 1; start = of.O * nego; }
    }
    if (!moved) start = s * curve(c, x) / curve(c, x - 1);   // 남으면 그 회사 곡선대로
    let y2 = start * curve(c, x + 1) / curve(c, x), ev = '', bonus = 0;
    const pr = roadRisk(c);
    if (u[2] < pr) { ev = 'cut'; y2 = start; }                                                  // 구조조정: 2년째 연봉 동결
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
function scoreRoad(pz, ans, ctx) { const R = simRoad(pz, ctx, ans); return { score: R.total, aux: R.eok, perfect: false, picks: R.picks, R }; }

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
function gen(game, day, ctx) { return game === 'higher' ? genHigher(day, ctx) : game === 'today' ? genToday(day, ctx) : game === 'sniper' ? genSniper(day, ctx) : game === 'road' ? genRoad(day, ctx) : null; }
function score(game, pz, ans, ctx) { return game === 'higher' ? scoreHigher(pz, ans, ctx) : game === 'today' ? scoreToday(pz, ans, ctx) : game === 'sniper' ? scoreSniper(pz, ans, ctx) : game === 'road' ? scoreRoad(pz, ans, ctx) : null; }

export { RULES, EPOCH, RK, DAILY, GAMES, hash32, rng, pickR, shuffleR, kstDay, addDays, dayIndex, dow, isoWeek, weekDays, msToMidnight, load, STATS, HIGHER_N, HIGHER_MS, higherWin, higherBonus, genHigher, endlessQ, scoreHigher, TODAY_N, TODAY_PICKS, TODAY_CLUES, TODAY_BASE, TODAY_CLUE, TODAY_MISS, TODAY_FLOOR, genToday, todayCands, sizeBand, ageBand, todayClues, simToday, todayPts, scoreToday, todayEmoji, firstChar, SNIPER_N, SN_LO, SN_HI, SN_STEP, genSniper, sniperErr, sniperPts, sniperVal, scoreSniper, curve, negoMul, genRoad, roadOffer, roadRisk, simRoad, scoreRoad, THEMES, cupPool, cupSize, cupCheck, makeNick, nickCheck, NICK_A, NICK_B, gen, score };
