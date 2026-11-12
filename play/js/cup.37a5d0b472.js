'use strict';






var CSTAT = null, CTODAY = 0, CPZ = null;
var SIX = PC.v6(TODAY);

function cupJo(n, a, b) { var c = String(n || '').charCodeAt(String(n || '').length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? a : b; }
function pctS(v) { return v == null ? '-' : Math.round(v * 1000) / 10 + '%'; }
function loadCupStat() {
  return call('/play/cup').then(function (j) { CSTAT = {}; (j.rows || []).forEach(function (r) { CSTAT[r[0]] = [r[1], r[2], r[3]]; }); CTODAY = j.today || 0; }).catch(function () { CSTAT = CSTAT || {}; });
}
function rate(n) { var s = CSTAT && CSTAT[n]; return s && s[0] >= 20 ? s[1] / s[0] : null; }
function cupRates() { var o = {}; Object.keys(CSTAT || {}).forEach(function (n) { o[n] = [CSTAT[n][0], CSTAT[n][1]]; }); return o; }
function cupMajX(R, a, b) { if (SIX) return PC.cupMaj6(R, a, b); var M = PC.cupMaj(R, a, b); if (!M.maj) M.und = 1; return M; }

function cupSnapMock() {
  var o = {}, mine = store.getJ('slp-cup', {});
  mock('/play/cup').rows.forEach(function (x) { var m = mine[x[0]] || [0, 0, 0]; o[x[0]] = [x[1] - m[0], x[2] - m[1]]; });
  return o;
}
function cupSnapGet(d) {
  if (MOCK) return Promise.resolve({ snap: cupSnapMock() });
  return call('/play/cup?snap=1&d=' + d + '&dev=' + DEV).catch(function () { return null; });
}
var CUP_RL = ['16강', '8강', '4강', '결승'];

document.addEventListener('visibilitychange', function () {
  if (document.hidden || PC.kstDay() === TODAY || !CUP || CUP.mode !== 'day' || CUP.ans.length || prog('cup')) return;
  CUP = null; if (!dayBusy()) location.reload(); else if (CUR === 'cup') renderCup();
});
function themeBar() {
  return '<div class="toolbar"><div class="cupthw"><div class="seg" id="cupTh" aria-label="월드컵 고르기"><button type="button" data-v="day" aria-pressed="' + (CMODE === 'day') + '">' + icon('trophy', 1.5, 'cpi') + '오늘의 16강</button>' +
    Object.keys(PC.THEMES).map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (k === CMODE) + '">' + (k === 'all' ? '연습 · ' : '') + PC.THEMES[k] + '</button>'; }).join('') + '</div></div>' +
    '<span class="src" style="margin:0">오늘 <b>' + man(CTODAY) + '판</b>' + mockTag() + '</span></div>';
}
function wireTheme() {
  var sg = $('cupTh');
  if (sg) {
    var fade = function () { sg.parentNode.classList.toggle('more', sg.scrollWidth - sg.clientWidth - sg.scrollLeft > 4); };
    var on = sg.querySelector('[aria-pressed="true"]'); if (on && on.offsetLeft + on.offsetWidth > sg.clientWidth) sg.scrollLeft = on.offsetLeft - 24;
    sg.onscroll = fade; fade();
  }
  document.querySelectorAll('#cupTh button').forEach(function (b) { b.onclick = function () {
    if (b.dataset.v === CMODE) return;
    if (CUP && CUP.mode !== 'day' && CUP.ans.length && wireTheme.ask !== b.dataset.v) { wireTheme.ask = b.dataset.v; toast('지금 연습 대진은 처음부터 다시 시작돼요. 바꾸려면 한 번 더 눌러 주세요.'); return; }
    wireTheme.ask = ''; CMODE = b.dataset.v; CUP = null; renderCup();
  }; });
}
function renderCup() { if (!CSTAT) loadCupStat().then(cupRoute); else cupRoute(); }
function cupRoute() {
  if (CMODE !== 'day') { if (!CUP || CUP.mode === 'day') newCup(); else cupDraw(); return; }
  CPZ = CPZ || PC.genCup(TODAY, ctx);
  var x = rec(TODAY, 'cup'), p = prog('cup');
  if (x) return cupReport({ mode: 'day', theme: 'all', names: CPZ.all, ans: x.ans, x: x });
  if (!p) p = { ans: [] };
  if (!Array.isArray(p.ans)) { p.ans = []; setProg('cup', p); }
  CUP = cupState('day', 'all', CPZ.all.map(function (n) { return BYN[n]; }), p.ans);
  if (!CUP) { p.ans = []; if (prog('cup')) setProg('cup', p); CUP = cupState('day', 'all', CPZ.all.map(function (n) { return BYN[n]; }), []); }
  cupDraw();
}
function newCup() {
  var pool = PC.cupPool(ctx, CMODE), n = PC.cupSize(pool), r = PC.rng(Math.random() + '|cup');
  CUP = cupState(CMODE, CMODE, PC.shuffleR(r, pool).slice(0, n), []);
  cupDraw();
}

function cupHide(st) { return SIX && st.mode === 'day'; }

function cupState(mode, theme, all, ans) {
  var st = { mode: mode, theme: theme, all: all, ans: [], round: all, next: [], i: 0, r: 0, picks: [], last: null, agree: 0, pts: 0 }, R = cupRates();
  for (var k = 0; k < ans.length; k++) if (!cupPick(st, ans[k], R)) return null;
  return st;
}
function cupPick(st, j, R) {
  if (j !== 0 && j !== 1) return false;
  var a = st.round[st.i], b = st.round[st.i + 1]; if (!a || !b) return false;
  var w = j ? b : a, l = j ? a : b, M = cupMajX(R, a.n, b.n), wt = PC.CUP_W[st.r] || 100, ok = !M.und && M.maj === w.n, add = M.und ? (SIX ? Math.round(wt / 2) : wt) : ok ? wt : 0;
  st.ans.push(j); st.picks.push([w.n, l.n]); st.next.push(w); st.i += 2;
  st.last = { w: w, l: l, a: a, b: b, pa: M.pa, maj: M.maj, und: !!M.und, ok: ok, add: add }; if (ok || (M.und && !SIX)) st.agree++; st.pts += add;
  if (st.i >= st.round.length) { st.round = st.next; st.next = []; st.i = 0; st.r++; }
  return true;
}

function cupBrk() {
  if (!PX.ok) return '';
  var N = CUP.all.length, rows = [CUP.all], i = 0, lost = {}, a = CUP.round[CUP.i], b = CUP.round[CUP.i + 1];
  CUP.picks.forEach(function (p) { lost[p[1]] = 1; });
  for (var m = N / 2; m >= 1; m /= 2) { var w = CUP.picks.slice(i, i + m).map(function (p) { return BYN[p[0]]; }); while (w.length < m) w.push(null); rows.push(w); i += m; }
  return '<div class="cbk" aria-hidden="true">' + rows.map(function (r, ri) {
    var top = ri === rows.length - 1;
    return '<div class="cbr' + (ri ? ' up' : '') + '" style="grid-template-columns:repeat(' + r.length + ',minmax(0,1fr))">' + r.map(function (c) {
      var now = c && ri === CUP.r && a && b && (c.n === a.n || c.n === b.n);
      return '<span class="cbc' + (top ? ' top' : !c ? ' tbd' : lost[c.n] ? ' gone' : now ? ' now' : '') + '">' + (top ? icon('trophy', 2) : c ? bld(c, 1, { blind: 1 }) : '<i></i>') + '</span>';
    }).join('') + '</div>';
  }).reverse().join('') + '</div>';
}
function cupRules() {
  return '<details class="rules cuprl"><summary>규칙 보기</summary><ul>' +
    '<li>모두 같은 16곳, 같은 대진이에요. 고른 쪽이 <b>전국 민심</b>과 같으면 16강 40 · 8강 60 · 4강 80 · 결승 100점.</li>' +
    '<li><b>안목 보너스</b>: 우승 회사의 대리 연봉이 16곳 중 r위면 (16 − r) × 12점, 최대 +180점. 연봉은 끝날 때까지 비밀이에요.</li>' +
    (SIX ? '<li>민심 = 오늘의 16강에서 전국 사람들이 그 회사를 고른 비율로 만든 인기 지수예요. 오늘 하루는 0시에 정한 값으로 모두 똑같이 채점하고, 다 고른 뒤에 공개해요.</li>' +
      '<li>두 회사 중 하나라도 기록이 ' + PC.CUP_MIN + '번이 안 되거나 인기 지수가 같으면 \'민심 미정\'이에요. 어느 쪽을 골라도 절반 점수를 받아요.</li>'
      : '<li>민심 = 지금까지 전국 사람들이 그 회사를 고른 비율(선택률)이 더 높은 쪽이에요. 기록이 적은 회사는 50%에 가깝게 쳐요.</li>') +
    '<li>만점 1,000점 · 하루 첫 판만 순위에 올라요. 위 테마 버튼(연습)은 무작위 대진으로 몇 번이든 할 수 있고 순위에는 안 올라가요. 후보가 32곳이 안 되는 테마는 8강이에요.</li></ul></details>';
}

function cupBkt(all, picks) {
  if (!PX.ok) return '';
  var rows = [[all.length + '강', all]], i = 0, m = all.length / 2;
  while (m >= 1) { rows.push([m === 1 ? '우승' : m + '강', picks.slice(i, i + m).map(function (p) { return BYN[p[0]]; })]); i += m; m /= 2; }
  return '<div class="bkt" aria-hidden="true">' + rows.map(function (r) { return '<div class="rl">' + r[0] + '</div><div class="rnd">' + r[1].map(function (c) { return bld(c, 2); }).join('') + '</div>'; }).join('') + '</div>';
}

function cupLastLine(L) {
  if (!L) return '';
  if (CUP && cupHide(CUP)) return '<b>' + esc(L.w.n) + '</b> 진출 · 민심은 다 고른 뒤에 공개돼요';
  var pw = Math.round((L.w === L.a ? L.pa : 1 - L.pa) * 100);
  if (L.und) return SIX ? '아직 민심 미정 · <b>' + esc(L.w.n) + '</b> 골라서 <b>+' + L.add + '</b>' : '민심 반반! <b>' + esc(L.w.n) + '</b> 골라도 <b>+' + L.add + '</b>';
  return L.ok ? '민심과 같아요! 인기 지수 <b>' + pw + ' : ' + (100 - pw) + '</b> · <b class="ok">+' + L.add + '</b>'
    : '민심은 <b>' + esc(L.l.n) + '</b> 쪽이었어요 (인기 지수 ' + (100 - pw) + ' : ' + pw + ') · <b class="no">0점</b>';
}
function cupDraw() {
  var R = CUP.round, n = R.length, lv = n === 2 ? '결승' : n + '강', a = R[CUP.i], b = R[CUP.i + 1], day = CUP.mode === 'day', hide = cupHide(CUP);
  $('cup').innerHTML = themeBar() + '<div class="cupbar"><span class="lv">' + (day ? '오늘의 ' : '연습 · ') + lv + '</span><span class="pg">' + (CUP.i / 2 + 1) + ' / ' + n / 2 + '</span>' +
    (hide ? '<span class="cupsc">' + CUP.ans.length + ' / ' + (CUP.all.length - 1) + '판 골랐어요</span>' : '<span class="cupsc">민심 <b>' + CUP.agree + '</b>/' + CUP.ans.length + ' · <b>' + CUP.pts + '</b>점</span>') + '</div>' +
    cupBrk() + '<p class="qline">어디로 <b>가고 싶어요?</b></p><p class="qsub">' + (hide ? '민심과 같으면 <b>+' + (PC.CUP_W[CUP.r] || 100) + '</b> · 민심·연봉은 다 고른 뒤 공개' : '고르면 전국 민심 공개 · 같으면 <b>+' + (PC.CUP_W[CUP.r] || 100) + '</b> · 연봉은 아직 비밀') + '</p>' +
    '<div class="duel">' + [a, b].map(function (c, j) { return '<button class="pick cpk" type="button" data-j="' + j + '"><span class="cpl">' + logo(c, 'l') + '</span><span class="nm">' + esc(c.n) + '</span><span class="ind">' + esc(c.grp) + ' · 직원 ' + man(c.m) + '명' + (c.sido ? ' · ' + esc(c.sido) : '') + '</span><span class="cpb">' + bld(c, 2, { blind: 1 }, 'pb') + '<span class="cps">연봉 <b>?</b></span></span></button>'; }).join('<span class="vs">VS</span>') + '</div>' +
    '<p class="prate" aria-live="polite"></p>' + (day ? cupRules() : '');
  wireTheme();
  document.querySelectorAll('#cup .pick').forEach(function (el) { el.onclick = function () {
    if (day && !prog('cup') && PC.kstDay() !== TODAY) { CUP = null; location.reload(); return; }
    if (!day && !CUP.started) { CUP.started = true; call('/play/start', { game: 'cup', dev: DEV }).catch(function () {}); }
    document.querySelectorAll('#cup .pick').forEach(function (z) { z.disabled = true; z.classList.add(z === el ? 'win' : 'lose'); });
    cupPick(CUP, +el.dataset.j, cupRates()); sfx(hide ? 'coin' : CUP.last.ok || CUP.last.und ? 'coin' : 'wrong');
    var pr = document.querySelector('#cup .prate'); if (pr) { pr.className = 'prate' + (hide || CUP.last.und ? '' : CUP.last.ok ? ' ok' : ' no'); pr.innerHTML = cupLastLine(CUP.last); }
    if (day) {
      var p = prog('cup'), first = !p; if (first) p = { tok: '', t0: Date.now() };
      p.ans = CUP.ans.slice(); setProg('cup', p);
      if (first) startDaily('cup').then(function (st) { var q = prog('cup'); if (q) { q.tok = st.tok; setProg('cup', q); } });
    }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var C0 = CUP; setTimeout(function () { if (CUP !== C0) return; CUP.round.length === 1 ? cupEnd() : cupDraw(); }, hide ? (reduce ? 300 : 650) : (reduce ? 700 : 1000));
  }; });
}

function cupUnder(names, champ, rates) {
  var sh = names.map(function (n) { return PC.cupShare(rates, n); }).sort(function (a, b) { return a - b; }), mine = PC.cupShare(rates, champ), med = sh[Math.floor(sh.length / 2)];
  return mine < med && mine <= sh[sh.length / 4 - 1];
}
function cupEnd() {
  var C = CUP, w = C.round[0], names = C.all.map(function (c) { return c.n; }), live = cupRates(), S = PC.scoreCupAll(names, C.ans, ctx, live, SIX);
  store.set('slp-cupw-' + TODAY, w.n);
  var CW = cupWins(); CW[w.n] = (CW[w.n] || 0) + 1; store.setJ('slp-cupwins', CW);
  if (S.eyeR === 1) store.set('slp-cupeye', '1');
  var props = function (S2, R2) { if (S2.agree >= 12) store.set('slp-cupmind', '1'); if (cupUnder(names, w.n, R2)) store.set('slp-cupminor', '1'); };
  CUP = null; $('cup').innerHTML = '<p class="src">' + (C.mode === 'day' ? '점수를 보내는 중이에요…' : '결과를 모으는 중이에요…') + '</p>';
  var agg = function () { return call('/play/cup', { dev: DEV, theme: C.theme, picks: C.picks }).catch(function () {}).then(loadCupStat); };
  var done = function (x) { cupReport({ mode: C.mode, theme: C.theme, names: names, ans: C.ans, x: x }); sfx('fanfare'); };
  if (C.mode !== 'day') { props(S, live); return agg().then(function () { done({ score: S.score, aux: S.agree, champ: w.n, agree: S.agree, eye: S.eye, eyeR: S.eyeR, per: S.per.join(''), ans: C.ans }); }); }

  submitDaily('cup', C.ans, S, { champ: w.n, agree: S.agree, eye: S.eye, eyeR: S.eyeR, per: S.per.join('') }).then(function (x) {
    checkPerfect(TODAY);
    var after = !SIX ? Promise.resolve(null) : cupSnapGet(TODAY);
    return after.then(function (j) {
      var snap = j && j.snap;
      if (SIX && snap) {
        var S6 = PC.scoreCupAll(names, C.ans, ctx, snap, true);
        x.per = S6.per.join(''); x.eye = S6.eye; x.eyeR = S6.eyeR; x.snap = snap;
        if (!x.sent) { x.score = S6.score; x.aux = S6.agree; }
        x.agree = x.aux != null ? x.aux : S6.agree; setRec(TODAY, 'cup', x); props(S6, snap);
      } else if (!SIX) props(S, live);
      return agg().then(function () { return x; });
    });
  }).then(done);
}

function cupEmoji(per) { var s = String(per || ''), out = [], i = 0, n = s.length + 1; [n / 2, n / 4, n / 8, n / 16].filter(function (k) { return k >= 1; }).forEach(function (k) { if (i < s.length) out.push(s.slice(i, i + k).replace(/1/g, '🟩').replace(/0/g, '🟥').replace(/2/g, '⬜')); i += k; }); return out; }

function cupPay(ms) {
  var ok = 0, big = null, rows = [], r = -1;
  ms.forEach(function (m) {
    var W = BYN[m.w], L = BYN[m.w === m.a ? m.b : m.a], up = W.rk[1] >= L.rk[1];
    if (up) ok++; else if (!big || L.rk[1] - W.rk[1] > big.d) big = { w: W, l: L, d: L.rk[1] - W.rk[1] };
    if (m.r !== r) { r = m.r; rows.push({ r: r, s: '', n: 0, k: 0 }); }
    var row = rows[rows.length - 1]; row.s += up ? '<span class="up">▲</span>' : '<span class="dn">▼</span>'; row.k++; if (up) row.n++;
  });
  return { ok: ok, n: ms.length, big: big, rows: rows };
}
function cupReport(o) {
  var x = o.x || {}, day = o.mode === 'day', all = o.names.map(function (n) { return BYN[n]; }), Sm = PC.simCup(o.names, o.ans || []);
  if (!Sm) { $('cup').innerHTML = themeBar() + '<p class="src">결과를 다시 그리지 못했어요.</p>'; wireTheme(); return; }
  var w = BYN[x.champ || Sm.champ], picks = Sm.ms.map(function (m) { return [m.w, m.w === m.a ? m.b : m.a]; }), N = all.length, theme = o.theme, M = Sm.ms.length;
  var per = x.per || PC.scoreCupAll(o.names, o.ans, ctx, x.snap || cupRates(), SIX).per.join(''), agree = x.aux != null ? x.aux : x.agree, eye = x.eye || 0, und = (per.match(/2/g) || []).length;
  var by = all.slice().sort(function (p, q) { return q.rk[1] - p.rk[1]; }), r = by.indexOf(w) + 1, top = by[0];
  var pool = PC.cupPool(ctx, theme), wins = function (c) { var s = CSTAT && CSTAT[c.n]; return s ? s[2] : 0; };
  var want = pool.slice().sort(function (p, q) { return wins(q) - wins(p) || (rate(q.n) || 0) - (rate(p.n) || 0); }).slice(0, 10), wantOk = pool.filter(function (c) { return wins(c) > 0; }).length >= 10;
  var pay = pool.slice().sort(function (p, q) { return q.rk[2] - p.rk[2]; }).slice(0, 10), payN = pay.map(function (c) { return c.n; });
  var em = cupEmoji(per), lbl = day ? '오늘의 16강 · ' + mmdd(TODAY) : '연습 · ' + PC.THEMES[theme], P = cupPay(Sm.ms);
  var tw = r === 1 ? '우승 회사가 대리 연봉도 ' + N + '곳 중 1등! 안목 만점이에요.'
    : r <= 4 ? '우승 회사 대리 연봉은 ' + N + '곳 중 ' + r + '위, 상위권이에요. 마음과 지갑이 같은 방향이네요.'
    : '우승 회사 대리 연봉은 ' + N + '곳 중 ' + r + '위예요. 연봉 1등은 ' + esc(top.n) + '(' + man(top.rk[1] - w.rk[1]) + '만원 더)였어요.';
  var payBox = '<div class="cuppay"><h4>연봉으로 다시 치른 대진표</h4><p>내 선택이 연봉으로도 이겼을까? <b>연봉 기준 정답 ' + P.ok + '/' + P.n + '</b></p>' +
    P.rows.map(function (rw) { return '<div class="rw"><small>' + (CUP_RL[4 - Math.log2(N) + rw.r] || '') + '</small><span>' + rw.s + '</span><b>' + rw.n + '/' + rw.k + '</b></div>'; }).join('') +
    '<p>▲ 내가 고른 회사가 대리 연봉이 더 높았던 판 · ▼ 낮았던 판</p>' + (P.big ? '<p>가장 큰 반전: ' + esc(P.big.w.n) + cupJo(P.big.w.n, '을', '를') + ' 골랐지만 ' + esc(P.big.l.n) + cupJo(P.big.l.n, '이', '가') + ' 대리 연봉 ' + man(P.big.d) + '만원 더</p>' : '') +
    '<p class="twist" style="margin-top:4px">' + tw + '</p></div>';
  var text = '연봉 놀이터 · ' + (day ? '드림 컴퍼니 월드컵 오늘의 16강 ' + mmdd(TODAY) : '드림 컴퍼니 월드컵 연습 (' + PC.THEMES[theme] + ')') + '\n🏆 ' + w.n + ' · ' + man(x.score) + '점\n민심 ' + agree + '/' + M + (und ? ' · 미정 ' + und : '') + ' · 연봉 기준 정답 ' + P.ok + '/' + P.n + '\n' + em.join('\n') + '\n' + SITE_S;
  $('cup').innerHTML = themeBar() + '<div class="rep"><span class="crown">' + lbl + ' · 내 드림 컴퍼니</span>' +
    stage('<div class="pxrow">' + zorro(myRank(), 'happy', 3, 'jump') + '<div class="champ">' + icon('trophy', 4) + bld(w, bS(true), null, 'grow') + '</div></div>' + confetti(), 'resst', '우승 ' + w.n + ' 빌딩 위에 트로피') + (day ? vsScene('cup', x) : '') +
    logo(w, 'l') + '<span class="nm"><b>' + esc(w.n) + '</b></span>' +
    '<div class="big">' + man(x.score) + '<small>점 / 1,000' + (day ? '' : ' · 연습') + '</small></div>' +
    '<p class="cupln">민심 일치 <b>' + agree + '/' + M + '</b>' + (und ? ' · 민심 미정 <b>' + und + '</b> <small>(절반 점수)</small>' : '') + ' · 안목 보너스 <b>+' + eye + '</b> <small>(대리 연봉 ' + N + '곳 중 ' + r + '위)</small></p>' +
    '<div class="cupem" aria-label="라운드별 민심 일치">' + em.map(function (e, i) { return '<span><small>' + (CUP_RL[4 - Math.log2(N) + i] || '') + '</small>' + e.replace(/🟩/g, '<i class="cq g"></i>').replace(/🟥/g, '<i class="cq r"></i>').replace(/⬜/g, '<i class="cq w"></i>') + '</span>'; }).join('') + '</div>' +
    (day && SIX && !x.snap && !x.sent ? '<p class="src">판마다의 민심은 점수를 보낸 뒤에 받아 와요. 연결이 되면 다시 열어 주세요.</p>' : '') +
    payBox +
    (day ? rankBox('cup', x) : '') + gotBox('cup') + shareBox('shC', day ? vsBox('cup', x) : '') + nextBtn('cup') +
    '<div class="row">' + (day ? '<button class="btn ghost" id="cupPr" type="button">테마 연습 하기</button>' + againBtn('cup', function () { CUP = null; renderCup(); }) : '<button class="btn ghost" id="cupAgain" type="button">새 ' + N + '강 연습</button>') + '</div>' + week7('cup') +
    '<details class="more"><summary>우승 회사 성적표 · 대진표 · 민심 vs 연봉</summary>' +
    '<div class="stats"><div><small>신입 기준 연봉</small><b>' + (w.s0 ? man(w.s0) + '만' : '-') + '</b></div><div><small>대리</small><b>' + man(w.rk[1]) + '만</b></div><div><small>부장</small><b>' + eokS(w.rk[4]) + '</b></div>' +
    '<div><small>1년 퇴사율</small><b>' + pctS(w.to) + '</b></div><div><small>평균 근속</small><b>' + (w.tt ? w.tt.toFixed(1) + '년' : '-') + '</b></div><div><small>직원</small><b>' + man(w.m) + '명</b></div></div>' +
    '<div class="row"><a class="btn ghost sm" href="' + coLink(w) + '" target="_blank" rel="noopener">이 회사 가도 될까? 판단 보기</a><a class="btn ghost sm" href="' + link(w) + '" target="_blank" rel="noopener">직급별 연봉 보기</a></div>' +
    cupBkt(all, picks) +
    (wantOk ? '<p class="h3" style="margin-top:6px">가고 싶은 회사 vs 연봉 높은 회사 · ' + PC.THEMES[theme] + mockTag() + '</p>' +
      '<div class="vs2"><div><b>가고 싶은 TOP 10</b> <small class="src">(전국 우승 횟수)</small><ol>' + want.map(function (c) { return '<li class="' + (payN.indexOf(c.n) < 0 ? 'off' : '') + '">' + esc(c.n) + ' <small>· 과장 ' + man(c.rk[2]) + '</small></li>'; }).join('') + '</ol></div>' +
      '<div><b>연봉 TOP 10</b> <small class="src">(과장 연봉)</small><ol>' + pay.map(function (c) { return '<li>' + esc(c.n) + ' <small>· ' + man(c.rk[2]) + '만원</small></li>'; }).join('') + '</ol></div></div>' +
      '<p class="src">빨간 이름: 인기는 TOP 10인데 연봉은 TOP 10 밖인 곳이에요.</p>'
      : '<p class="src">\'가고 싶은 TOP 10\'은 우승 기록이 더 모이면 열려요.</p>') +
    '<details class="brk"><summary>이번 ' + N + '곳 대리 연봉 순위 보기</summary><ol>' + by.map(function (c) { return '<li>' + (c === w ? '<b>' + esc(c.n) + '</b>' : esc(c.n)) + ' · ' + man(c.rk[1]) + '만원</li>'; }).join('') + '</ol></details></details>' +
    (day ? '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbC"></div></details>' : '') + '</div>';
  wireTheme();
  wireShare('shC', text, { title: day ? '오늘의 16강' : '드림 컴퍼니 월드컵', big: man(x.score) + '점', sub: '🏆 ' + w.n + '\n민심 ' + agree + '/' + M + ' · 연봉 기준 정답 ' + P.ok + '/' + P.n, lines: em, px: { mood: 'happy', co: w, icon: 'trophy' } });
  if ($('cupAgain')) $('cupAgain').onclick = function () { CUP = null; newCup(); };
  if ($('cupPr')) $('cupPr').onclick = function () { CMODE = 'all'; CUP = null; renderCup(); };
  if (day) miniLb('lbC', 'cup');
}

