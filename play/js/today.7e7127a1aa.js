'use strict';

var TSEL = '';
var TLV = ['쉬움', '보통', '어려움'];
function todayInfo() {
  var y = PC.genToday(PC.addDays(TODAY, -1), ctx), t = TTOP;
  return '<div class="tinfo"><span>' + (TPZ.v === 3 ? '스무고개 퀴즈' : '오늘의 회사') + ' <b>#' + TPZ.no + '</b> · ' + TLV[TPZ.tier] + '</span>' +
    (t ? '<span>오늘 정답자 <b>' + man(t.todayGame.ok) + '명</b> · ' + (TPZ.v === 3 ? '평균 질문 <b>' + (t.todayGame.avg ? Math.round((t.todayGame.avg - 1) * 10) / 10 : '-') + '번</b>' : TPZ.v === 2 ? '평균 추측 <b>' + (t.todayGame.avg || '-') + '번</b>' : '평균 단서 <b>' + (t.todayGame.avg || '-') + '개</b>') + mockTag() + '</span>' : '') +
    '<span>어제 정답 <b>' + esc(y.ans) + '</b>' + (t && t.yday.n ? ' · 정답률 ' + Math.round(t.yday.ok / t.yday.n * 100) + '%' : '') + '</span></div>' + tvSwitch();
}
function renderToday() {
  TPZ = TPZ || PC.genToday(TODAY, ctx);
  if (!TTOP) getTop('today').then(function (t) { if (t) { TTOP = t; renderBoard(t); if (!$('p-today').hidden && !prog('today')) renderToday(); } });
  if (TPZ.v === 2 || TPZ.v === 4) return renderToday2();
  if (TPZ.v === 3) return renderToday3();
  var x = rec(TODAY, 'today'), p = prog('today');
  if (x) return resultToday(x);
  if (!p) {
    $('today').innerHTML = todayInfo() + '<div class="intro"><h3>오늘의 회사 #' + TPZ.no + '</h3>' +
      '<p class="sum">후보 8곳 중 숨은 회사 하나를 찾아요. 단서는 업종부터 하나씩 열려요.<br>기회는 3번, 단서를 적게 보고 맞힐수록 점수가 커요.</p>' +
      '<button class="btn big" id="tGo" type="button">시작하기 ▶</button><details class="rules"><summary>규칙 보기</summary><ul>' +
      '<li>회사 8곳 중 하나가 오늘의 회사예요. 모두에게 같은 8곳, 같은 정답이에요. 30일 안에는 같은 정답이 다시 안 나와요.</li>' +
      '<li>단서는 <b>업종 → 직원 수 → 사원 연봉 → 평균 근속 → 평점</b> 순서로 하나씩 열려요. 처음엔 업종만 보여요.</li>' +
      '<li>고를 기회는 3번. 틀리면 그 회사는 빠지고 단서가 하나 더 열려요. 3번 다 틀리면 실패(0점)예요.</li>' +
      '<li>' + PC.TODAY_BASE + '점에서 시작해 단서를 하나 더 볼 때마다 −' + PC.TODAY_CLUE + '점, 틀릴 때마다 −' + PC.TODAY_MISS + '점. 월요일은 쉬운 회사, 주말은 같은 업종끼리 헷갈리는 어려운 회사예요.</li></ul></details></div>';
    $('tGo').onclick = function () { $('tGo').disabled = true; startDaily('today').then(function (st) { setProg('today', { tok: st.tok, t0: st.t0, log: [] }); TSEL = ''; renderToday(); }); };
    return;
  }
  if (!Array.isArray(p.log)) { p.log = []; setProg('today', p); }
  drawToday(p);
}

function clueList(clues, open, fresh) {
  return '<ol class="clues" aria-label="단서">' + clues.map(function (c, i) {
    if (i >= open) return '<li class="lock"><span class="ci">' + (i + 1) + '</span><span class="cl">' + esc(c.lb) + '</span><span class="cv">🔒 아직 안 열림</span></li>';
    return '<li class="' + (i === fresh ? 'fresh' : '') + '"><span class="ci">' + (i === fresh && PX.ok ? icon('magnifier', 2) : i + 1) + '</span><span class="cl">' + esc(c.lb) + '</span><span class="cv"><b>' + esc(c.v) + '</b>' +
      (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</span></li>';
  }).join('') + (open < clues.length ? '<li class="lockline">🔒 다음 단서 · ' + clues.slice(open).map(function (c) { return esc(c.lb); }).join(' · ') + '</li>' : '') + '</ol>';
}
function chances(left) { var h = ''; for (var i = 0; i < PC.TODAY_PICKS; i++) h += i < left ? '♥' : '<span class="off">♥</span>'; return '<span class="hearts" aria-label="남은 기회 ' + left + '번">' + h + '</span>'; }


function tBld(c, o, s) { return bld(c, s || 3, o, 'cb'); }
function tBlind(n, extra) { var o = { blind: 1, neutral: 1, w: 9 }; for (var k in extra) o[k] = extra[k]; return o; }

function tDet(R) { return PX.ok ? '<span class="tdet" aria-hidden="true">' + zorro(myRank(), R.wrong.length >= 2 ? 'shock' : R.wrong.length ? 'sad' : 'normal', 1.5, 'idle', { hat: 1 }) + icon('magnifier', 2) + '</span>' : ''; }
function drawToday(p, fresh) {
  var R = PC.simToday(TPZ, p.log);
  if (!R) { p.log = []; setProg('today', p); R = PC.simToday(TPZ, []); }
  var clues = PC.todayClues(TPZ, ctx), left = PC.TODAY_PICKS - R.wrong.length, now = PC.todayPts(R.open, R.wrong.length);
  if (R.wrong.indexOf(TSEL) >= 0 || TPZ.cands.indexOf(TSEL) < 0) TSEL = '';
  var h = todayInfo() + '<div class="gbar">' + tDet(R) + '<span class="lv">단서 ' + R.open + ' / ' + PC.TODAY_CLUES + '</span><span class="stat"><span>남은 기회 ' + chances(left) + '</span>' +
    '<span>맞히면 <b>' + man(now) + '</b>점</span></span></div>' + clueList(clues, R.open, fresh) +
    '<p class="qsub tq" style="margin:14px 0 8px">이 중 오늘의 회사는? 회사를 누른 뒤 아래 <b>고르기</b>를 눌러요.</p>' +
    '<div class="cands" role="group" aria-label="후보 회사 8곳">' + (fresh != null && fresh >= 0 && PX.ok ? '<span class="pxmag" aria-hidden="true">' + icon('magnifier', 4) + '</span>' : '') + TPZ.cands.map(function (n) {
      var c = BYN[n], out = R.wrong.indexOf(n) >= 0;
      return '<button type="button" class="cand' + (out ? ' out' : '') + '" data-n="' + esc(n) + '"' + (out ? ' disabled aria-label="' + esc(n) + ', 아니에요"' : ' aria-pressed="' + (TSEL === n) + '"') + '>' +
        logo(c, 'm') + '<span class="cn">' + esc(n) + bossMark(c) + '</span>' + (out ? '<small>아니에요</small>' : '') + tBld(c, tBlind(n, { off: out })) + '</button>';
    }).join('') + '</div>' +
    '<div class="row tact"><button class="btn" id="tPick" type="button"' + (TSEL ? '' : ' disabled') + '>' + (TSEL ? esc(TSEL) + ' 고르기' : '회사를 골라 주세요') + '</button>' +
    (R.open < PC.TODAY_CLUES ? '<button class="btn ghost" id="tClue" type="button">단서 더 보기 −' + PC.TODAY_CLUE + '점</button>' : '<span class="qsub" style="margin:0">단서를 다 열었어요</span>') + '</div>' +
    '<p class="src">틀리면 −' + PC.TODAY_MISS + '점이고 단서가 하나 더 열려요(−' + PC.TODAY_CLUE + '점). 단서 숫자는 연봉 연구소 추정치예요.</p>';
  $('today').innerHTML = h;
  $('today').querySelectorAll('.cand:not(.out)').forEach(function (bt) {
    bt.onclick = function () { TSEL = TSEL === bt.dataset.n ? '' : bt.dataset.n; drawToday(p); var f = $('today').querySelector('.cand[data-n="' + CSS.escape(bt.dataset.n) + '"]'); if (f) f.focus(); };
  });
  $('tPick').onclick = function () {
    if (!TSEL) return;
    var n = TSEL; TSEL = ''; p.log.push(n); setProg('today', p);
    var S = PC.simToday(TPZ, p.log);
    sfx(S.solved ? 'fanfare' : 'wrong');
    if (S.done) return finishToday(p);
    toast('땡! ' + n + ' 아니에요. 단서가 하나 더 열렸어요.');
    drawToday(p, S.open - 1);
  };
  if ($('tClue')) $('tClue').onclick = function () { p.log.push('?'); setProg('today', p); drawToday(p, PC.simToday(TPZ, p.log).open - 1); };
}
function finishToday(p) {
  var ans = { log: p.log }, S = PC.scoreToday(TPZ, ans, ctx);
  $('today').innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('today', ans, S, { solved: S.solved, open: S.open }).then(function (x) { store.set('slp-today1', '1'); bumpStreak(TODAY); checkPerfect(TODAY); renderMe(); TTOP = null; resultToday(x); });
}
function resultToday(x) {
  var A = BYN[TPZ.ans], R = PC.simToday(TPZ, (x.ans && x.ans.log) || []) || { open: 1, wrong: [], solved: false, seq: '' };
  var ok = R.solved, lines = PC.todayEmoji(R), tries = (ok ? R.open : 'X') + '/' + PC.TODAY_CLUES;
  var text = '연봉 놀이터 · 오늘의 회사 #' + TPZ.no + ' ' + tries + '\n' + lines.join('\n') + '\n' + SITE_S;
  var cards = TPZ.cands.map(function (n) {
    var c = BYN[n], cls = n === TPZ.ans ? ' ans' : R.wrong.indexOf(n) >= 0 ? ' out' : '';
    return '<div class="cand' + cls + '">' + logo(c, 'm') + '<span class="cn">' + esc(n) + '</span><small>' + (n === TPZ.ans ? '정답' : R.wrong.indexOf(n) >= 0 ? '내가 고른 오답' : esc(c.grp) + ' · ' + man(c.m) + '명') + '</small>' +
      tBld(c, n === TPZ.ans ? { all: 1 } : R.wrong.indexOf(n) >= 0 ? { off: 1 } : null, 2) + '</div>';
  }).join('');
  var det = { hat: 1 }, scene = ok
    ? stage('<div class="pxrow">' + zorro(myRank(), 'happy', 3, 'jump', det) + icon('magnifier', 4) + bld(A, 4, { all: 1 }, 'lightup') + '</div>', 'resst', '정답 ' + A.n + ' 빌딩에 불이 다 켜졌어요')
    : stage('<div class="pxrow">' + zorro(myRank(), 'shock', 3, 'oops', det) + '<span class="fleetx">범인 도주!</span><div class="runaway" style="position:relative">' + icon('puff', 3, 'puff') + bld(A, 4, { sil: 1 }) + '</div></div>', 'resst flee', '숨은 회사가 도망갔어요');
  $('today').innerHTML = todayInfo() + '<div class="over"><span class="lv">오늘의 회사 #' + TPZ.no + ' · ' + (ok ? '성공' : '다음 기회에') + '</span>' + scene + vsScene('today', x) + (ok ? logo(A, 'l').replace('class="lg l', 'class="lg l lightup') : logo(A, 'l')) +
    '<div class="ttl"><b>' + esc(A.n) + '</b></div><div class="big">' + tries + '<small> 단서</small></div>' +
    '<p>' + (ok ? '단서 ' + R.open + '개 보고 ' + (R.wrong.length ? R.wrong.length + '번 틀린 뒤 ' : '한 번에 ') + '맞혔어요. ' + man(x.score) + '점' : '3번 다 틀렸어요. 0점') +
    '</p>' + rankBox('today', x) + gotBox('today') + shareBox('shT', vsBox('today', x)) + nextBtn('today') + week7('today') +
    '<details class="more"><summary>단서 · 후보 8곳 다시 보기</summary>' + clueList(PC.todayClues(TPZ, ctx), PC.TODAY_CLUES, -1) + '<div class="cands done" aria-label="오늘의 후보 8곳">' + cards + '</div>' +
    '<div class="row"><a class="btn ghost sm" href="' + link(A) + '" target="_blank" rel="noopener">직급별 연봉 보기</a><a class="btn ghost sm" href="' + coLink(A) + '" target="_blank" rel="noopener">이 회사 가도 될까?</a></div></details>' +
    '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbT"></div></details><div class="row">' + againBtn('today', function () { TSEL = ''; renderToday(); }) + '</div></div>';
  wireShare('shT', text, { title: '오늘의 회사 #' + TPZ.no, big: tries, sub: (ok ? man(x.score) + '점' : '아쉽게 실패') + ' · 정답은 비밀\n🔥 ' + streak() + '일 연속', lines: lines,
    px: { mood: ok ? 'happy' : 'sad', hat: 1, co: A, o: { blind: 1, neutral: 1, w: 11, all: ok ? 1 : 0, off: ok ? 0 : 1 } } });
  miniLb('lbT', 'today');
}




var T2_SHORT = ['업종', '지역', '직원', '사원 연봉', '근속'];
function t2Sim(log) { return TPZ.v === 4 ? PC.simToday4(TPZ, log, ctx) : PC.simToday2(TPZ, log, ctx); }
function t2Tries() { return TPZ.v === 4 ? PC.T4_TRIES : PC.TODAY2_TRIES; }
function t2Pts(m) { return TPZ.v === 4 ? PC.today4Pts(m) : PC.today2Pts(m); }
function t2Val(k, c) {
  if (k === 'grp') return c.grp;
  if (k === 'sido') return c.sido || '-';
  if (k === 'm') return c.m >= 10000 ? (Math.round(c.m / 1000) / 10) + '만' : man(c.m);
  if (k === 's') return man(Math.round(c.rk[0] / 10) * 10);
  return c.tt ? c.tt.toFixed(1) + '년' : '-';
}
function t2Rows(log, fresh) {
  var A = BYN[TPZ.ans];
  return '<div class="t2tb" role="table" aria-label="추측 기록"><div class="t2r t2h" role="row"><span role="columnheader">회사</span>' + T2_SHORT.map(function (h) { return '<span role="columnheader">' + h + '</span>'; }).join('') + '</div>' +
    log.map(function (n, i) {
      var c = BYN[n], cells = PC.today2Row(TPZ, ctx, n), win = n === A.n;
      return '<div class="t2r' + (i === fresh ? ' fresh' : '') + (win ? ' win' : '') + '" role="row"><span class="t2n" role="cell">' + logo(c, 's') + '<b>' + esc(n) + '</b></span>' + cells.map(function (x, j) {
        var v = t2Val(PC.TODAY2_COLS[j][0], c), lab = { g: '같음', y: '가까움', x: '다름', n: '자료 없음' }[x.st] + (x.dir ? (x.dir > 0 ? ', 정답이 더 큼' : ', 정답이 더 작음') : '');
        return '<span class="t2c s-' + x.st + '" role="cell" aria-label="' + T2_SHORT[j] + ' ' + esc(v) + ', ' + lab + '"' + (i === fresh ? ' style="animation-delay:' + (j * .12) + 's"' : '') + '>' + esc(v) +
          (x.dir ? '<i>' + (x.dir > 0 ? '▲' : '▼') + '</i>' : '') + '</span>';
      }).join('') + '</div>';
    }).join('') + '</div>';
}

function t2Bld(miss) {
  if (!PX.ok) return '';
  var k = TPZ.v === 4 ? 1 : 2; return bld(BYN[TPZ.ans], 4, miss < k ? { sil: 1 } : miss < 2 * k ? { off: 1 } : null, 't2b');
}
function t2Hint(miss) {
  var A = BYN[TPZ.ans];
  if (TPZ.v === 4) return miss >= 2 ? '불빛 = 사원 연봉 · 색 = 업종' : miss >= 1 ? '색이 드러났어요 (업종) · 한 번 더 틀리면 불빛' : '숨은 회사 빌딩 · 폭 = 직원 수 · 층 = 부장 연봉';
  return miss >= 4 ? '이름 첫 글자 <b>' + esc(PC.firstChar(A.n)) + '</b> · 불빛 = 사원 연봉' : miss >= 2 ? '색이 드러났어요 (업종) · 4번 틀리면 불빛·첫 글자' : '숨은 회사 빌딩 · 폭 = 직원 수 · 층 = 부장 연봉 · 2번 틀리면 색 공개';
}
function renderToday2() {
  var x = rec(TODAY, 'today'), p = prog('today');
  if (x) return resultToday2(x);
  if (!p) {
    $('today').innerHTML = todayInfo() + '<div class="intro"><h3>오늘의 회사 #' + TPZ.no + '</h3>' +
      (TPZ.v === 4 ? '<p class="sum">후보 카드 10장 중 숨은 회사 하나를 찾아요. 처음에 <b>업종</b>을 알려 주고, 카드를 고르면 정답과 비교해 칸이 칠해져요.</p>' : '<p class="sum">게임에 나오는 회사 ' + man(ctx.H.length) + '곳 중 숨은 회사 하나를 찾아요. 아무 회사나 이름을 넣으면 정답과 비교해 칸이 칠해져요.</p>') +
      '<div class="t2leg"><span class="t2c s-g">같음</span><span class="t2c s-y">가까움</span><span class="t2c s-x">다름</span><span class="t2c s-x">4,800<i>▲</i></span><small>▲ 정답이 더 커요</small></div>' +
      '<p class="sum">기회는 <b>' + t2Tries() + '번</b>. 500점에서 틀릴 때마다 −' + (TPZ.v === 4 ? PC.T4_STEP : PC.TODAY2_STEP) + '점, 적게 추측할수록 높은 순위예요.</p>' +
      '<button class="btn big" id="tGo" type="button">시작하기 ▶</button><details class="rules"><summary>규칙 보기</summary><ul>' +
      '<li>비교 칸: <b>업종 · 지역 · 직원 수 · 사원 연봉 · 평균 근속</b>. 직원 수 ±10%, 사원 연봉 ±4%, 근속 ±0.5년이면 초록, 직원 수 1.6배·연봉 ±12%·근속 ±2년 안이면 노랑이에요.</li>' +
      '<li>위의 빌딩이 숨은 회사예요. 폭은 직원 수, 층수는 부장 연봉. 2번 틀리면 색(업종), 4번 틀리면 불빛(사원 연봉)과 이름 첫 글자가 보여요.</li>' +
      '<li>모두에게 같은 정답이고 30일 안에는 같은 회사가 다시 안 나와요. 월요일은 이름난 회사, 주말은 어려운 회사예요.</li></ul></details></div>';
    $('tGo').onclick = function () { $('tGo').disabled = true; startDaily('today').then(function (st) { setProg('today', { tok: st.tok, t0: st.t0, log: [], v: TPZ.v }); renderToday(); }); };
    return;
  }
  if (!Array.isArray(p.log) || p.v !== TPZ.v || !t2Sim(p.log)) { p.log = []; p.v = TPZ.v; setProg('today', p); }
  drawToday2(p);
}
function drawToday2(p, fresh) {
  var Q = t2Sim(p.log), miss = Q.wrong, left = t2Tries() - Q.n, now = t2Pts(miss);
  $('today').innerHTML = todayInfo() + '<div class="gbar">' + tDet({ wrong: new Array(miss) }) + '<span class="lv">추측 ' + Q.n + ' / ' + t2Tries() + '</span><span class="stat"><span>남은 기회 <b>' + left + '</b></span><span>맞히면 <b>' + man(now) + '</b>점</span></span></div>' +
    '<div class="t2top"><div class="t2bld" aria-hidden="true">' + t2Bld(miss) + '</div><div class="t2q"><p class="t2hint">' + t2Hint(miss) + '</p>' +
    (TPZ.v === 4 ? '' : '<div class="fld t2in"><label for="tIn">회사 이름으로 추측</label><input type="text" id="tIn" autocomplete="off" placeholder="예: 삼성전자" enterkeyhint="go"><div class="ac" id="tAc" hidden></div></div>') + '</div></div>' +
    (TPZ.v === 4 ? '<p class="t4hint">🔓 처음 힌트 · 업종 <b>' + esc(BYN[TPZ.ans].grp) + '</b></p><div class="cands t4c" role="group" aria-label="후보 카드 10장">' + TPZ.cands.map(function (n) { var c = BYN[n], out = p.log.indexOf(n) >= 0, dim = !out && c.grp !== BYN[TPZ.ans].grp;
      return '<button type="button" class="cand' + (out ? ' out' : '') + (dim ? ' dim' : '') + '" data-n="' + esc(n) + '"' + (out ? ' disabled aria-label="' + esc(n) + ', 아니에요"' : '') + '>' + logo(c, 'm') + '<span class="cn">' + esc(n) + '</span>' + (out ? '<small>아니에요</small>' : dim ? '<small>업종 다름</small>' : '') + '</button>'; }).join('') + '</div>' : '') +
    (Q.n ? t2Rows(p.log, fresh) : '<p class="src t2empty">' + (TPZ.v === 4 ? '카드를 하나 눌러 보세요. 비교 칸이 단서가 돼요.' : '아무 회사나 넣어 보세요. 비교 칸이 단서가 돼요.') + '</p>') +
    '<p class="src">숫자는 연봉 연구소 추정치 · 칸의 값은 내가 넣은 회사의 값이에요.</p>';
  var used = {}; p.log.forEach(function (n) { used[n] = 1; });
  var list = ctx.H.filter(function (c) { return !used[c.n]; });
  var guess = function (n) {
    p.log.push(n); setProg('today', p);
    var S = t2Sim(p.log);
    sfx(S.solved ? 'fanfare' : 'wrong');
    if (S.done) return finishToday2(p);
    var k = TPZ.v === 4 ? 1 : 2; if (S.wrong === k || S.wrong === 2 * k) toast(S.wrong === k ? '빌딩 색이 드러났어요! (업종)' : TPZ.v === 4 ? '빌딩 불빛이 켜졌어요! (사원 연봉)' : '불빛이 켜지고 첫 글자가 보여요!');
    drawToday2(p, p.log.length - 1);
  };
  if (TPZ.v === 4) { $('today').querySelectorAll('.t4c .cand:not(.out)').forEach(function (bt) { bt.onclick = function () { guess(bt.dataset.n); }; }); }
  else ac($('tIn'), $('tAc'), list, function (c, txt) {
    if (!c && txt) { var q = txt.toLowerCase(); c = list.filter(function (x) { return x.n.toLowerCase() === q || x.o.toLowerCase() === q; })[0]; }
    if (!c) { if (txt) toast('게임에 나오는 회사 중에서 골라 주세요.'); return; }
    guess(c.n);
  });
  if (fresh != null) { var rw = $('today').querySelectorAll('.t2r')[fresh + 1]; if (rw) rw.scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' }); }
}
function finishToday2(p) {
  var ans = { log: p.log }, S = PC.scoreToday(TPZ, ans, ctx);
  $('today').innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('today', ans, S, { solved: S.solved, open: S.open }).then(function (x) { store.set('slp-today1', '1'); bumpStreak(TODAY); checkPerfect(TODAY); renderMe(); TTOP = null; resultToday2(x); });
}
function resultToday2(x) {
  var A = BYN[TPZ.ans], log = (x.ans && x.ans.log) || [], Q = t2Sim(log) || { n: log.length, solved: false, wrong: log.length };
  var ok = Q.solved, tries = (ok ? Q.n : 'X') + '/' + t2Tries(), lines = PC.today2Emoji(TPZ, ctx, log);
  var text = '연봉 놀이터 · 오늘의 회사 #' + TPZ.no + ' ' + tries + '\n' + lines.join('\n') + '\n' + SITE_S;
  var det = { hat: 1 }, scene = ok
    ? stage('<div class="pxrow">' + zorro(myRank(), 'happy', 3, 'jump', det) + icon('magnifier', 4) + bld(A, 4, { all: 1 }, 'lightup') + '</div>', 'resst', '정답 ' + A.n + ' 빌딩에 불이 다 켜졌어요')
    : stage('<div class="pxrow">' + zorro(myRank(), 'shock', 3, 'oops', det) + '<span class="fleetx">범인 도주!</span><div class="runaway" style="position:relative">' + icon('puff', 3, 'puff') + bld(A, 4, { sil: 1 }) + '</div></div>', 'resst flee', '숨은 회사가 도망갔어요');
  $('today').innerHTML = todayInfo() + '<div class="over"><span class="lv">오늘의 회사 #' + TPZ.no + ' · ' + (ok ? '성공' : '다음 기회에') + '</span>' + scene + vsScene('today', x) + (ok ? logo(A, 'l').replace('class="lg l', 'class="lg l lightup') : logo(A, 'l')) +
    '<div class="ttl"><b>' + esc(A.n) + '</b></div><div class="big">' + tries + '<small> 추측</small></div>' +
    '<p>' + (ok ? (Q.n === 1 ? '한 번에' : Q.n + '번 만에') + ' 찾았어요. ' + man(x.score) + '점' : t2Tries() + '번 안에 못 찾았어요. 0점') + '</p>' +
    '<pre class="t2em" aria-label="추측 결과 칸">' + lines.join('\n') + '</pre>' +
    rankBox('today', x) + gotBox('today') + shareBox('shT', vsBox('today', x)) + nextBtn('today') + week7('today') +
    '<details class="more"><summary>내 추측 다시 보기 · 정답 회사</summary>' + t2Rows(log, -1) +
    '<div class="row"><a class="btn ghost sm" href="' + link(A) + '" target="_blank" rel="noopener">직급별 연봉 보기</a><a class="btn ghost sm" href="' + coLink(A) + '" target="_blank" rel="noopener">이 회사 가도 될까?</a></div></details>' +
    '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbT"></div></details><div class="row">' + againBtn('today', function () { renderToday(); }) + '</div></div>';
  wireShare('shT', text, { title: '오늘의 회사 #' + TPZ.no, big: tries, sub: (ok ? man(x.score) + '점' : '아쉽게 실패') + ' · 정답은 비밀\n🔥 ' + streak() + '일 연속', lines: lines,
    px: { mood: ok ? 'happy' : 'sad', hat: 1, co: A, o: { blind: 1, neutral: 1, w: 11, all: ok ? 1 : 0, off: ok ? 0 : 1 } } });
  miniLb('lbT', 'today');
}




var T3_EMO = { grp: '🏷', sido: '📍', pub: '🏛', m: '👥', s0: '🌱', r1: '💰', r2: '💼', r4: '👔', tt: '⏳', to: '🏃', rt: '⭐', ag: '🎂', my: '📈', jump: '🎁', ex: '👑', lad: '🪜', tw: '🏆', yoy: '🔥', up: '🚀' };
var T3SEL = '', T3ARM = 0;
function t3Label(q) {
  var i = q.indexOf(':'), k = q.slice(0, i), v = q.slice(i + 1), n = +v, won = function (x) { return x >= 10000 ? (x % 10000 ? (x / 10000).toFixed(1) : x / 10000) + '억' : man(x) + '만'; };
  var t = k === 'grp' ? v + ' 회사야?' : k === 'sido' ? '본사가 ' + v + '에 있어?' : k === 'pub' ? '공기업이야?' : k === 'm' ? '직원 ' + man(n) + '명 넘는 회사야?'
    : k === 's0' ? '신입 연봉 ' + won(n) + ' 넘어?' : k === 'r1' ? '대리 연봉 ' + won(n) + ' 이상!?' : k === 'r2' ? '과장 연봉 ' + won(n) + ' 넘어?' : k === 'r4' ? '부장 연봉 ' + won(n) + ' 넘어?'
    : k === 'tt' ? '평균 ' + v + '년 넘게 다녀?' : k === 'to' ? '1년 안에 ' + Math.round(n * 100) + '% 넘게 그만둬?' : k === 'rt' ? '직원 평점 ' + v + ' 넘어?' : k === 'ag' ? v + '년 넘은 회사야?'
    : k === 'my' ? '작년보다 직원이 늘었어?' : k === 'ex' ? '임원 연봉 ' + won(n) + ' 넘어?' : k === 'lad' ? '부장 연봉이 사원의 ' + v + '배 넘어?'
    : k === 'tw' ? '업종 평균보다 과장 연봉 많이 줘?' : k === 'yoy' ? '올해 연봉 ' + v + '% 넘게 올랐어?' : k === 'up' ? '3년 새 연봉 ' + v + '% 넘게 올랐어?' : '성과급 대박 난 해가 있어?';
  return (T3_EMO[k] || '❓') + ' ' + t;
}

function t3PreParts(q) {
  if (!q) return null;
  var neg = q[0] === '~', b = neg ? q.slice(1) : q, i = b.indexOf(':'), k = b.slice(0, i), v = b.slice(i + 1), n = +v;
  var won = function (x) { return x >= 10000 ? (x % 10000 ? (x / 10000).toFixed(1) : x / 10000) + '억' : (x % 1000 ? man(x) + '만 원' : x / 1000 + '천만 원'); };
  var pct = Math.round(n * 100) + '%', P = {
    r4: ['💰 연봉', '부장 되면 연봉이 ' + won(n) + '을 넘는', '버티면 억대 연봉!'],
    r2: ['💰 연봉', '과장 연봉이 ' + won(n) + '을 넘는', '과장님 지갑이 두툼'],
    r1: ['💰 연봉', '대리만 달아도 ' + won(n) + '이 넘는', '대리 때부터 여유 있는 곳'],
    s0: ['🌱 연봉', '신입 첫 연봉부터 ' + won(n) + '이 넘는', '첫 월급부터 든든!'],
    ex: ['👑 임원', '임원 평균 연봉이 ' + won(n) + '을 넘는', '별 달면 인생 역전'],
    lad: ['🪜 연봉 사다리', '사원에서 부장까지 연봉이 ' + v + '배 넘게 뛰는', '오래 버틸수록 이득인 곳'],
    tw: ['🏆 업계 비교', '같은 업종 평균보다 과장 연봉을 ' + Math.round((n - 1) * 100) + '% 넘게 더 주는', '업계에서 손 큰 집'],
    my: neg ? ['📉 성장성', '1년 새 직원이 ' + (-n) + '% 넘게 줄어든', '요즘 몸집 줄이는 중…'] : ['📈 성장성', '1년 새 직원이 ' + v + '% 넘게 늘어난', '지금 쑥쑥 크는 중!'],
    up: ['🚀 성장성', '3년 새 평균 연봉이 ' + v + '% 넘게 오른', '월급 오르는 맛이 있는 곳'],
    yoy: neg ? ['🧊 성장성', '올해 평균 연봉이 ' + v + '%도 안 오른', '올해는 동결 분위기…'] : ['🔥 성장성', '올해 평균 연봉이 ' + v + '% 넘게 오른', '올해 인상률 두둑!'],
    tt: neg ? ['🌪 안정성', '평균 근속이 ' + v + '년이 안 되는', '젊고 빠르게 도는 곳'] : ['🛡 안정성', '평균 ' + v + '년 넘게 다니는', '한번 들어가면 안 나온다'],
    to: neg ? ['🛡 안정성', '1년 안에 그만두는 사람이 ' + pct + '도 안 되는', '떠나는 사람이 거의 없어요'] : ['🏃 안정성', '1년 안에 ' + pct + ' 넘게 떠나는', '들고 나는 게 활발한 곳'],
    pub: ['🏛 안정성', '나라가 주인인 공공기관·공기업인', '철밥통 후보 등장'],
    ag: ['🎂 업력', v + '년 넘게 버틴 장수', '업력이 곧 무기'],
    rt: neg ? ['🌧 분위기', '직원 평점이 ' + v + '점을 못 넘는', '속사정이 좀 있는 듯…'] : ['⭐ 분위기', '직원 평점이 ' + v + '점을 넘는', '다니는 사람이 칭찬하는 곳'],
    jump: ['🎁 성과급', '성과급이 크게 터진 해가 있는', '대박 난 해를 기억하는 곳'],
    m: neg ? ['🐜 규모', '직원이 ' + man(n) + '명이 안 되는', '작지만 단단한 곳'] : ['🐘 규모', '직원이 ' + (n >= 10000 ? n / 10000 + '만' : man(n)) + ' 명 넘는', '초대형 공룡'],
    grp: ['🏷 업종', v + ' 업종', ''], sido: ['📍 지역', '본사가 ' + v + '에 있는', ''] }[k];
  return P || null;
}
function t3PreTxt(q) { var P = t3PreParts(q); return P ? '이 회사는 <b>' + esc(P[1]) + '</b> 회사입니다. 맞춰 보세요!' : ''; }
function t3PreBox() {
  var P = t3PreParts(TPZ.pre); if (!P) return '';
  return '<div class="t3pre"><span class="t3pk">✨ 스페셜 힌트 <i class="t3cat">' + esc(P[0]) + '</i></span><p>' + t3PreTxt(TPZ.pre) + '</p>' +
    (P[2] ? '<span class="t3quip">조로: “' + esc(P[2]) + '”</span>' : '') + '<small>후보 12장 중 몇 장만 이 힌트에 맞아요. 나머지는 스스로 걸러 보세요!</small></div>';
}
function t3Cost(asks) { return asks < PC.T3_FREE ? '무료' : '−' + PC.T3_Q; }



function t3V6() { return PC.v6(TPZ.day); }
function t3Save(p) { if (!p.prac) setProg('today', p); }
function t3PastDays() { var a = []; for (var k = 1; k <= 7; k++) { var d = PC.addDays(TODAY, -k); if (d >= PC.TODAY2_FROM && PC.genToday(d, ctx).v === 3) a.push(d); } return a; }
function t3PastBox() {
  var L = t3PastDays(); if (!L.length) return '';
  setTimeout(function () { document.querySelectorAll('#today [data-past]').forEach(function (b) { b.onclick = function () { t3PracStart(b.dataset.past); }; }); }, 0);
  return '<details class="more t3past"><summary>지난 회차 풀기 (연습 · 순위 없음)</summary><div class="row">' + L.map(function (d) { return '<button class="btn ghost sm" type="button" data-past="' + d + '">#' + PC.genToday(d, ctx).no + ' · ' + mmdd(d) + '</button>'; }).join('') + '</div></details>';
}
function t3PracStart(d) { T3SEL = ''; T3ARM = 0; TPRAC = { pz: PC.genToday(d, ctx), log: [], fin: 0, prac: 1 }; TPZ = TPRAC.pz; sfx('jump'); drawToday3(TPRAC); }
function t3PracEnd() { TPRAC = null; TPZ = PC.genToday(TODAY, ctx); T3SEL = ''; T3ARM = 0; renderToday(); }
function t3PracResult(p) {
  var Q = PC.simToday3(TPZ, p.log, ctx), S = PC.scoreToday(TPZ, { log: p.log }, ctx), A = BYN[TPZ.ans], pb = store.getJ('slp-t3prac', {}) || {};
  if (S.solved && !(pb[TPZ.day] >= S.score)) { pb[TPZ.day] = S.score; store.setJ('slp-t3prac', pb); }
  $('today').innerHTML = '<div class="over"><span class="lv">지난 회차 연습 #' + TPZ.no + ' · ' + mmdd(TPZ.day) + ' · ' + (S.solved ? '성공' : '아쉽게 실패') + '</span>' +
    (PX.ok ? stage('<div class="pxrow">' + zorro(myRank(), S.solved ? 'happy' : 'shock', 3, S.solved ? 'jump' : 'oops', { hat: 1 }) + bld(A, 4, S.solved ? { all: 1 } : { sil: 1 }) + '</div>', 'resst', '연습 결과') : '') +
    logo(A, 'l') + '<div class="ttl"><b>' + esc(A.n) + '</b></div><div class="big">' + (S.solved ? man(S.score) : 0) + '<small>점 · 질문 ' + Q.asks + '번</small></div>' +
    '<p class="src">연습 판은 순위·경험치에 안 들어가요.</p>' + t3PastBox() +
    '<div class="row"><button class="btn" type="button" id="tPracEnd">오늘의 퀴즈로 ▶</button></div></div>';
  $('tPracEnd').onclick = t3PracEnd;
}
function renderToday3() {
  if (TPRAC) { var Qp = PC.simToday3(TPZ, TPRAC.log, ctx); return Qp && Qp.done ? t3PracResult(TPRAC) : drawToday3(TPRAC); }
  var x = rec(TODAY, 'today'), p = prog('today');
  if (x) return resultToday3(x);
  if (!p) {
    $('today').innerHTML = todayInfo() + '<div class="intro"><h3>스무고개 퀴즈 #' + TPZ.no + '</h3>' +
      t3PreBox() + '<p class="sum">후보 카드 12장 중 숨은 회사 하나. <b>스페셜 힌트</b>로 먼저 추리하고, 모르겠으면 질문! 조로가 <b>응 / 아니</b>로 답하고 안 맞는 카드는 넘어가요.</p>' +
      '<ul class="cuphow"><li><b>질문</b> 하나에 −' + PC.T3_Q + '점 · 5번까지</li><li><b>먼저 찍기</b> 답을 알면 바로 찍어요. 틀리면 <b class="warn">−' + PC.T3_EARLY + '점</b>!</li><li><b>최종 선택</b> ' + (t3V6() ? '카드가 ' + PC.T3_FIN + '장 이하로 줄면 두 회사 중 하나 (한 번, 틀리면 0점)' : '아니면 마지막에 두 회사 중 하나 (한 번, 틀리면 0점)') + '</li></ul>' +
      '<button class="btn big" id="tGo" type="button">시작하기 ▶</button><details class="rules"><summary>규칙 보기</summary><ul>' +
      '<li>질문은 대리·과장·부장 연봉, 신입 연봉, 직원 수, 근속, 퇴사율, 평점, 회사 나이, 업종, 지역 등에서 지금 남은 카드를 나눌 수 있는 것만 나와요.' + (t3V6() ? ' 어떤 질문이 카드를 반으로 잘 나눌지 골라 보세요.' : '') + '</li>' +
      '<li>500점에서 시작해요. 먼저 찍기는 2번까지, 틀린 카드는 탈락하고 ' + PC.T3_EARLY + '점이 깎여요. 맞히면 최소 ' + PC.T3_FLOOR + '점은 받아요.</li>' +
      '<li>' + (t3V6() ? '최종 선택은 남은 카드가 ' + PC.T3_FIN + '장 이하일 때 열려요(질문을 다 쓰면 그때도). 정답과, 스페셜 힌트에 맞는 미끼 한 곳이 나와요.' : '최종 선택을 누르면 남은 카드에서 정답과 미끼 한 곳이 나와요.') + ' 카드를 한 장만 남겼다면 미끼는 이미 탈락한 카드예요.</li>' +
      '<li>모두에게 같은 12장·같은 정답이고, 숫자는 연봉 연구소 추정치예요.</li></ul></details>' + t3PastBox() + '</div>';
    $('tGo').onclick = function () { $('tGo').disabled = true; startDaily('today').then(function (st) { setProg('today', { tok: st.tok, t0: st.t0, log: [], v: 3 }); T3SEL = ''; T3ARM = 0; renderToday(); }); };
    return;
  }
  if (!Array.isArray(p.log) || p.v !== 3 || !PC.simToday3(TPZ, p.log, ctx)) { p.log = []; p.v = 3; p.fin = 0; setProg('today', p); }
  if (PC.simToday3(TPZ, p.log, ctx).done) return finishToday3(p);
  drawToday3(p);
}
function drawToday3(p, flash) {
  var Q = PC.simToday3(TPZ, p.log, ctx), last = Q.steps[Q.steps.length - 1], used = {};
  p.log.forEach(function (a) { if (a[0] === '?') used[a.slice(1)] = 1; });
  if (TPZ.pre) used[TPZ.pre.replace('~', '')] = 1;
  if (Q.alive.indexOf(T3SEL) < 0) { T3SEL = ''; T3ARM = 0; }
  var canFin = Q.canFin !== false;
  var fin = p.fin && canFin || Q.asks >= PC.T3_MAXQ && Q.ew >= PC.T3_EARLY_MAX, now = PC.today3Pts(Q.asks, Q.ew), qs = fin || Q.asks >= PC.T3_MAXQ ? [] : PC.t3Questions(Q.alive, ctx, used, (window.innerWidth || 400) <= 640 ? 4 : 6, TPZ.pre, t3V6() ? PC.t3Seed(TPZ, Q.qs) : undefined);
  var canEarly = Q.ew < PC.T3_EARLY_MAX;
  var bub = fin ? '자, 마지막! <b>둘 중 하나</b>가 범인이야. 한 번에 찍어!' : !last ? '스페셜 힌트부터 봐! 질문은 하나에 −' + PC.T3_Q + '점이야.'
    : last.g ? '<b>' + esc(last.g) + '</b>? 땡! 아니야. <small>−' + PC.T3_EARLY + '점</small>'
    : '<b>' + esc(t3Label(last.q)) + '</b> → ' + (last.yes ? '응!' : '아니!') + ' <small>' + (last.out.length ? '카드 ' + last.out.length + '장 탈락' : '탈락 없음') + '</small>';
  var h = (p.prac ? '<p class="t3prac">지난 회차 연습 <b>#' + TPZ.no + '</b> · ' + mmdd(TPZ.day) + ' · 순위 없음 <button class="btn ghost sm" type="button" id="tPracX">그만하기</button></p>' : '') + t3PreBox() + '<div class="gbar"><span class="lv">질문 ' + Q.asks + ' / ' + PC.T3_MAXQ + '</span><span class="stat"><span>남은 카드 <b>' + Q.alive.length + '</b></span><span>맞히면 <b>' + man(now) + '</b>점</span></span></div>' +
    '<div class="t3talk' + (flash ? ' pop' : '') + '"><span class="t3z" aria-hidden="true">' + (PX.ok ? zorro(myRank(), fin ? 'normal' : last ? (last.g ? 'shock' : last.yes ? 'happy' : 'sad') : 'normal', 2, flash ? (last && !last.g && last.yes ? 'jump' : 'oops') : 'idle', { hat: 1 }) : '') + '</span><p class="t3bub" aria-live="polite"><span class="t3who">조로 탐정</span>' + bub + '</p></div>';
  if (fin) {
    h += '<div class="duel t3fin">' + Q.fin.map(function (n) { var c = BYN[n]; return '<button class="pick" type="button" data-n="' + esc(n) + '">' + logo(c) + '<span class="nm">' + esc(n) + '</span><span class="ind">' + esc(c.grp) + ' · 직원 ' + man(c.m) + '명</span></button>'; }).join('<span class="vs">VS</span>') + '</div>' +
      '<p class="src">' + (Q.alive.length <= 1 ? '카드를 한 장만 남겼어요. 남은 그 카드가 정답이에요!' : '남은 카드 ' + Q.alive.length + '장 중 두 곳이 나왔어요.') + '</p>';
  } else {
    h += (T3SEL ? '<p class="t3warn" role="alert">⚠ <b>' + esc(T3SEL) + '</b> 먼저 찍기 · 틀리면 <b>−' + PC.T3_EARLY + '점</b>이에요! ' + (T3ARM ? '정말 찍으려면 한 번 더 눌러요.' : '확실할 때만! (카드를 다시 누르면 취소)') + '</p>' : (Q.asks < PC.T3_MAXQ ? '<div class="t3qs" role="group" aria-label="질문 고르기 (' + t3Cost(Q.asks) + ')">' + (qs.length ? qs.map(function (q) { return '<button type="button" class="t3q" data-q="' + esc(q) + '">' + esc(t3Label(q)) + '</button>'; }).join('') : '<span class="src" style="margin:0">더 나눌 질문이 없어요.</span>') + '</div>' +
      '<p class="t3cost">이번 질문 <b>' + t3Cost(Q.asks) + '</b> · 남은 질문 ' + (PC.T3_MAXQ - Q.asks) + '번' + (canEarly ? ' · 카드를 누르면 먼저 찍기' : '') + '</p>' : '<p class="t3cost">질문을 다 썼어요. ' + (canEarly ? '먼저 찍거나 ' : '') + '최종 선택으로 가요.</p>')) +
      '<div class="cands t3c" role="group" aria-label="후보 카드 12장">' + TPZ.cands.map(function (n) {
        var c = BYN[n], out = Q.alive.indexOf(n) < 0, nw = out && last && last.out.indexOf(n) >= 0 && flash;
        return '<button type="button" class="cand' + (out ? ' out' : '') + (nw ? ' flip' : '') + '" data-n="' + esc(n) + '"' + (out || !canEarly ? ' disabled' : ' aria-pressed="' + (T3SEL === n) + '"') + (out ? ' aria-label="' + esc(n) + ', 탈락"' : '') + '>' +
          logo(c, 'm') + '<span class="cn">' + esc(n) + '</span>' + (out ? '<small>탈락</small>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="row tact">' + (T3SEL ? '<button class="btn' + (T3ARM ? ' danger' : '') + '" id="tEarly" type="button">' + (T3ARM ? '정말 찍기! (틀리면 −' + PC.T3_EARLY + ')' : '먼저 찍기: ' + esc(T3SEL)) + '</button>' : '') +
      (canFin ? '<button class="btn ' + (T3SEL ? 'ghost' : '') + '" id="tFin" type="button">' + (T3SEL ? '최종 선택 ▶' : '최종 선택 ▶ 두 회사 중 하나') + '</button>' : (T3SEL ? '' : '<span class="src t3lock">🔒 최종 선택은 카드 ' + PC.T3_FIN + '장 이하에서 열려요</span>')) + '</div>';
  }
  $('today').innerHTML = h; window.scrollTo(0, 0);
  document.querySelectorAll('#today .t3q').forEach(function (bt) { bt.onclick = function () { T3SEL = ''; T3ARM = 0; p.log.push('?' + bt.dataset.q); t3Save(p); sfx('coin'); drawToday3(p, 1); }; });
  $('today').querySelectorAll('.t3c .cand:not([disabled])').forEach(function (bt) { bt.onclick = function () { T3SEL = T3SEL === bt.dataset.n ? '' : bt.dataset.n; T3ARM = 0; drawToday3(p); }; });
  if ($('tEarly')) $('tEarly').onclick = function () {
    if (!T3ARM) { T3ARM = 1; sfx('wrong'); drawToday3(p); return; }
    var n = T3SEL; T3SEL = ''; T3ARM = 0; p.log.push('!' + n); t3Save(p);
    var S = PC.simToday3(TPZ, p.log, ctx); sfx(S.solved ? 'fanfare' : 'wrong');
    if (S.done) return finishToday3(p);
    toast('땡! ' + n + ' 아니에요. −' + PC.T3_EARLY + '점'); drawToday3(p, 1);
  };
  if ($('tFin')) $('tFin').onclick = function () { T3SEL = ''; T3ARM = 0; p.fin = 1; t3Save(p); drawToday3(p, 1); };
  if ($('tPracX')) $('tPracX').onclick = t3PracEnd;
  document.querySelectorAll('#today .t3fin .pick').forEach(function (bt) { bt.onclick = function () {
    p.log.push(bt.dataset.n); t3Save(p);
    var S = PC.simToday3(TPZ, p.log, ctx); sfx(S.solved ? 'fanfare' : 'wrong'); finishToday3(p);
  }; });
}
function finishToday3(p) {
  if (p.prac) return t3PracResult(p);
  var ans = { log: p.log }, S = PC.scoreToday(TPZ, ans, ctx);
  $('today').innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('today', ans, S, { solved: S.solved, open: S.open, early: S.early ? 1 : 0, ew: S.ew }).then(function (x) {
    store.set('slp-today1', '1'); if (S.solved && S.open <= 1 && !S.ew) award('detect');
    bumpStreak(TODAY); checkPerfect(TODAY); renderMe(); TTOP = null; resultToday3(x);
  });
}
function resultToday3(x) {
  var A = BYN[TPZ.ans], log = (x.ans && x.ans.log) || [], Q = PC.simToday3(TPZ, log, ctx) || { asks: 0, ew: 0, solved: false, early: false, steps: [], fin: [] };
  var ok = Q.solved, line = '🃏' + PC.T3_N + ' ' + Q.steps.map(function (s) { return s.g ? '💥' : s.yes ? '🙆' : '🙅'; }).join('') + ' → ' + (ok ? (Q.early ? '🎯' : '✅') : '❌');
  var text = '연봉 놀이터 · 스무고개 퀴즈 #' + TPZ.no + ' · 질문 ' + Q.asks + '번' + (ok ? (Q.early ? ' · 먼저 찍어 맞힘' : '') : ' · 실패') + '\n' + line + '\n' + SITE_S;
  var det = { hat: 1 }, scene = ok
    ? stage('<div class="pxrow">' + zorro(myRank(), 'happy', 3, 'jump', det) + icon('magnifier', 4) + bld(A, 4, { all: 1 }, 'lightup') + '</div>', 'resst', '정답 ' + A.n + ' 빌딩에 불이 다 켜졌어요')
    : stage('<div class="pxrow">' + zorro(myRank(), 'shock', 3, 'oops', det) + '<span class="fleetx">범인 도주!</span><div class="runaway" style="position:relative">' + icon('puff', 3, 'puff') + bld(A, 4, { sil: 1 }) + '</div></div>', 'resst flee', '숨은 회사가 도망갔어요');
  $('today').innerHTML = todayInfo() + '<div class="over"><span class="lv">스무고개 퀴즈 #' + TPZ.no + ' · ' + (ok ? '성공' : '다음 기회에') + '</span>' + scene + vsScene('today', x) + logo(A, 'l') +
    '<div class="ttl"><b>' + esc(A.n) + '</b></div><div class="big">' + Q.asks + '<small> 질문</small></div>' +
    '<p>' + (ok ? '질문 ' + Q.asks + '번' + (Q.early ? ', 먼저 찍어서' : '') + ' 찾았어요' + (Q.ew ? ' (먼저 찍기 ' + Q.ew + '번 빗나감)' : '') + '. ' + man(x.score) + '점' : '마지막 두 곳에서 아쉽게 빗나갔어요. 0점') + '</p>' +
    '<p class="t2em">' + line + '</p>' + t3PreBox() +
    rankBox('today', x) + gotBox('today') + shareBox('shT', vsBox('today', x)) + nextBtn('today') + week7('today') +
    '<details class="more"><summary>내 질문 다시 보기</summary><ol class="t3log">' + Q.steps.map(function (s) { return '<li>' + (s.g ? esc(s.g) + ' 먼저 찍기 → <b>땡</b> (−' + PC.T3_EARLY + ')' : esc(t3Label(s.q)) + ' → <b>' + (s.yes ? '응' : '아니') + '</b> · ' + s.out.length + '장 탈락') + '</li>'; }).join('') +
    (Q.early ? '<li>' + esc(A.n) + ' 먼저 찍기 → <b>정답!</b></li>' : '<li>최종 두 곳: ' + Q.fin.map(esc).join(' vs ') + ' → <b>' + (ok ? '정답!' : '땡') + '</b></li>') + '</ol>' +
    '<div class="row"><a class="btn ghost sm" href="' + link(A) + '" target="_blank" rel="noopener">직급별 연봉 보기</a><a class="btn ghost sm" href="' + coLink(A) + '" target="_blank" rel="noopener">이 회사 가도 될까?</a></div></details>' +
    t3PastBox() + '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbT"></div></details><div class="row">' + againBtn('today', function () { T3SEL = ''; T3ARM = 0; renderToday(); }) + '</div></div>';
  wireShare('shT', text, { title: '스무고개 퀴즈 #' + TPZ.no, big: Q.asks + ' 질문', sub: (ok ? man(x.score) + '점' : '아쉽게 실패') + ' · 정답은 비밀\n🔥 ' + streak() + '일 연속', lines: [line],
    px: { mood: ok ? 'happy' : 'sad', hat: 1, co: A, o: { blind: 1, neutral: 1, w: 11, all: ok ? 1 : 0, off: ok ? 0 : 1 } } });
  miniLb('lbT', 'today');
}
function tvSwitch() { return ''; }

