'use strict';






var LN_N = PC.LINE_N, LN_PT = PC.LINE_PT, LN_PERF = PC.LINE_PERF;
var LN_PROP = { '금융': 'calc', 'IT·게임': 'laptop', '통신·미디어': 'phone', '바이오·제약': 'plant', '건설·부동산': 'flag', '유통·상사': 'bag', '식품': 'lunchbox', '반도체·전자': 'pen' };
function lnMax() { return LN_N.reduce(function (s, n) { return s + n * LN_PT + LN_PERF; }, 0); }

function lnLook(c, ri) {
  var h = PC.hash32('ln|' + c.n + '|' + ri), f = h % 2 === 1, H = HAIRS[f ? 'f' : 'm'], L = { hair: H[(h >>> 3) % H.length][0], face: FACES[(h >>> 7) % FACES.length][0], col: GRP_COL[c.grp] || GRP_COL['기타·서비스'] };
  if (f) { L.base = 'f'; var w = (h >>> 11) % 3; if (w === 0) L.fit = 'dress'; else if (w === 1) L.bottom = 'skirt'; }
  if (c.grp === 'IT·게임' && L.fit !== 'dress') L.fit = 'semi';
  if (LN_PROP[c.grp]) L.hand = LN_PROP[c.grp];
  return L;
}
function lnEmo(r) { return r.map(function (x) { return x ? '✅' : '❌'; }).join(''); }

var LNV = PC.v6(TODAY);

function lnTally(R, ans) {
  var score = 0, res = [];
  ans.forEach(function (a, k) { score += PC.linePts(R[k], a, LNV); res.push(lnEmo(PC.lineMarks(R[k], a, LNV))); });
  return { score: score, res: res };
}

function lnOrd(n, k) { var a = []; for (var i = 0; i < n; i++) a.push(i); return PC.shuffleR(PC.rng('lnord|' + (LN.seed || TODAY) + '|' + k), a); }
function lnStart(mode) {
  if (mode === 'free') { var sd = TODAY + '|' + Date.now(); LN = { mode: 'free', seed: sd, R: PC.lineRounds(sd, ctx, LNV), k: 0, pick: [], shown: false, res: [], score: 0, walk: 1, ans: [] }; sfx('jump'); renderLine(); return; }
  var b = $('lnDay'); if (b) b.disabled = true;
  startDaily('line').then(function (st) { setProg('line', { tok: st.tok, t0: st.t0, ans: [] }); lnResume(); sfx('jump'); renderLine(); });
}

function lnResume() {
  var p = prog('line'); if (!p) { LN = null; return; }
  if (!Array.isArray(p.ans)) { p.ans = []; setProg('line', p); }
  var R = PC.genLine(TODAY, ctx).R, T = lnTally(R, p.ans);
  LN = { mode: 'day', R: R, k: p.ans.length, pick: [], shown: false, res: T.res, score: T.score, walk: 1, ans: p.ans.slice() };
}
function lnTag(p, small) { var c = BYN[p.n]; return '<span class="lntag">' + (small ? '' : logo(c, 's')) + '<b>' + esc(p.n) + '</b><small>' + RK[p.ri] + '</small></span>'; }
function lnZ(p, mood, s, anim, head) { return zorro(p.ri, mood, s, anim, { look: lnLook(BYN[p.n], p.ri), head: head ? 1 : 0 }); }
function lnIntro(ph) {
  return (PX.ok ? stage('<div class="pxrow lnintro">' + [['삼성전자', 2], ['카카오', 1], ['신한은행', 4], ['현대자동차', 0]].map(function (x, i) { var c = BYN[x[0]] || ctx.H[i]; return lnZ({ n: c.n, ri: x[1] }, i === 1 ? 'happy' : 'normal', ph ? 2 : 2.6, 'idle'); }).join('') + '</div>', 'resst', '회사와 직급이 다른 조로들') : '') +
    '<p class="sum">회사·직급이 다른 조로들이 줄을 서러 왔어요. <b>연봉이 높은 사람부터</b> 차례로 눌러 줄을 세우세요. 옷 색은 업종, 직급은 머리·안경에도 보여요.</p>' +
    '<ul class="cuphow"><li><b>5판</b> 3명 → 4명 → 5명</li>' + (LNV ? '<li><b>점수</b> 두 명씩 순서가 맞을수록 올라요 · 한 판 다 맞히면 <b>+' + LN_PERF + '</b></li>' : '<li><b>' + LN_PT + '점</b> 자리 맞힌 조로마다 · 한 판 다 맞히면 <b>+' + LN_PERF + '</b></li>') +
    '<li><b>함정</b> 2·4판엔 같은 회사 두 명이 섞여요. 같은 회사라도 아래 직급이 다른 회사 부장보다 높을 수 있어요</li></ul>';
}
function renderLine() {
  var el = $('line'); if (!el) return;
  var ph = (window.innerWidth || 400) <= 640, done = lnRec();
  if (!LN && !done && prog('line')) lnResume();
  if (LN && LN.mode === 'day' && LN.k >= LN_N.length) return lnFinish();
  if (!LN) {
    if (done) return lnDayResult(done);
    var best = +(store.get('slp-ln-best') || 0);
    el.innerHTML = '<div class="intro"><h3>오늘의 줄 · ' + mmdd(TODAY) + '</h3>' + lnIntro(ph) +
      '<div class="row"><button class="btn big" type="button" id="lnDay">오늘의 줄서기 시작 ▶</button></div>' +
      '<p class="src">오늘의 줄은 모두 같은 문제예요. 점수는 하루 한 번 순위에 올라가요' + (best ? ' · 내 최고 ' + man(best) + '점' : '') + ' (만점 ' + man(lnMax()) + ').</p></div>';
    $('lnDay').onclick = function () { lnStart('day'); };
    return;
  }
  var P = LN.R[LN.k], n = P.length, s = ph ? (n >= 5 ? 1.7 : 2) : 2.6, ok = LN.shown ? PC.lineMarks(P, LN.pick, LNV) : null;
  var h = '<div class="cupbar"><span class="lv">ROUND ' + (LN.k + 1) + ' / ' + LN_N.length + '</span><span class="cupsc">점수 <b>' + man(LN.score) + '</b>' + (LN.mode === 'free' ? ' · 연습' : '') + '</span></div>';

  var sr = ph ? 1.4 : 2;
  h += '<ol class="lnq' + (ok ? ' rev' : '') + '" aria-label="내가 세운 줄 (연봉 높은 순)">' + P.map(function (x, i) {
    var j = LN.pick[i];
    if (j == null) return '<li class="lnslot"><span class="lnno">' + (i + 1) + '</span><span class="lnemp">' + (i ? '' : '연봉 1등') + '</span></li>';
    var p = P[j], m = ok ? (ok[i] ? 'happy' : 'sad') : 'happy';
    return '<li class="lnslot on' + (ok ? ok[i] ? ' good' : ' bad' : '') + '"><span class="lnno">' + (i + 1) + '</span>' +
      (LN.shown ? '' : '<button type="button" class="lnback" data-un="' + i + '" aria-label="' + esc(p.n + ' ' + RK[p.ri]) + ' 줄에서 빼기">') +
      '<span class="lnz">' + (PX.ok ? (ok ? lnZ(p, m, sr, ok[i] ? 'jump' : 'oops') : lnZ(p, 'happy', ph ? 1.2 : 1.6, '', 1)) : '') + '</span>' + lnTag(p, ph) +
      (ok ? '<span class="lnv">' + man(p.v) + '만</span><span class="lnmk" aria-label="' + (ok[i] ? '맞음' : '틀림') + '">' + (ok[i] ? '✅' : '❌') + '</span>' : '') + (LN.shown ? '' : '</button>') + '</li>';
  }).join('') + '</ol>';
  if (!LN.shown) {
    if (LN.pick.length < n) h += '<div class="lncrowd pxst" role="group" aria-label="줄 설 조로 고르기">' + lnOrd(n, LN.k).map(function (j, at) {
      var p = P[j]; if (LN.pick.indexOf(j) >= 0) return '';
      return '<button type="button" class="lnp' + (LN.walk ? ' lnin' : '') + '" style="animation-delay:' + (at * .12) + 's" data-j="' + j + '" aria-label="' + esc(p.n + ' ' + RK[p.ri]) + '">' +
        '<span class="lnz">' + (PX.ok ? lnZ(p, 'normal', s, LN.walk ? 'walk' : 'idle') : '') + '</span>' + lnTag(p, ph) + '</button>';
    }).join('') + '</div>';
    h += '<div class="row">' + (LN.pick.length ? '<button class="btn ghost sm" type="button" id="lnUndo">하나 빼기</button>' : '') +
      (LN.pick.length === n ? '<button class="btn" type="button" id="lnGo">이 줄로 확인! ▶</button>' : '<span class="src" style="margin:0">' + (LN.pick.length ? (LN.pick.length + 1) + '등을 골라요' : '연봉이 가장 높을 것 같은 조로부터 눌러요') + '</span>') + '</div>';
  } else {
    var perf = PC.lineCheck(P, LN.pick).every(Boolean), pts = PC.linePts(P, LN.pick, LNV), pr = PC.linePairs(P, LN.pick);
    h += '<p class="lnres">' + (perf ? '🎉 완벽한 줄! +' + pts : LNV ? '순서 맞은 짝 ' + pr.ok + ' / ' + pr.tot + ' · +' + pts : PC.lineCheck(P, LN.pick).filter(Boolean).length + ' / ' + n + '명 자리 맞힘 · +' + pts) + '</p>' +
      lnAnsLine(P, LN.pick, ph) +
      '<div class="row"><button class="btn" type="button" id="lnNext">' + (LN.k + 1 < LN_N.length ? '다음 판 ▶' : '결과 보기 ▶') + '</button></div>';
  }
  el.innerHTML = h;
  if (LN.walk) { LN.walk = 0; clearTimeout(renderLine.t); renderLine.t = setTimeout(function () {
    document.querySelectorAll('#line .lnp .lnz').forEach(function (z) { var b = z.parentNode; if (PX.ok && LN && !LN.shown) z.innerHTML = lnZ(P[+b.dataset.j], 'normal', s, 'idle'); }); }, 1100); }
  el.querySelectorAll('.lnp:not([disabled])').forEach(function (b) { b.onclick = function () {
    var j = +b.dataset.j; if (LN.busy) LN.busy();
    if (LN.pick.indexOf(j) >= 0) return;
    var bb = el.querySelector('.lnp[data-j="' + j + '"]') || b, slot = el.querySelectorAll('.lnq .lnslot')[LN.pick.length], z = bb.querySelector('.lnz');
    LN.pick.push(j); sfx('coin');
    var done = function () { if (!LN) return; LN.busy = 0; renderLine(); var nx = $('lnGo') || el.querySelector('.lnp:not([disabled])'); if (nx) nx.focus({ preventScroll: true }); };
    lnMove(z, slot, P[j], s, bb, done);
  }; });
  el.querySelectorAll('[data-un]').forEach(function (b) { b.onclick = function () { LN.pick.splice(+b.dataset.un, 1); renderLine(); }; });
  var u = $('lnUndo'); if (u) u.onclick = function () { LN.pick.pop(); renderLine(); };
  var g = $('lnGo'); if (g) g.onclick = function () {
    var perf = PC.lineCheck(P, LN.pick).every(Boolean), pts = PC.linePts(P, LN.pick, LNV); LN.shown = true;
    LN.score += pts; LN.res.push(lnEmo(PC.lineMarks(P, LN.pick, LNV))); LN.ans.push(LN.pick.slice());
    if (perf && LN.mode === 'day') store.set('slp-ln-perf', (+(store.get('slp-ln-perf') || 0)) + 1);
    if (LN.mode === 'day') { var p = prog('line'); if (p) { p.ans = LN.ans.slice(); setProg('line', p); } }
    sfx(perf ? 'combo' : pts ? 'coin' : 'wrong'); renderLine(); var nb = $('lnNext'); if (nb) nb.focus({ preventScroll: true });
  };
  var nx2 = $('lnNext'); if (nx2) nx2.onclick = function () {
    if (LN.k + 1 < LN_N.length) { LN.k++; LN.pick = []; LN.shown = false; LN.walk = 1; renderLine(); window.scrollTo(0, 0); return; }
    lnFinish();
  };
}
function lnAwards(score) {
  if (+(store.get('slp-ln-best') || 0) < score) store.set('slp-ln-best', score);
  var pf = +(store.get('slp-ln-perf') || 0); if (pf >= 30) award('eye'); if (pf >= 80) award('hr');
}
function lnFinish() {
  var x = LN, el = $('line'); LN = null;
  lnAwards(x.score);
  if (x.mode === 'free') {
    var fx = { score: x.score, res: x.res, mode: 'free' };
    el.innerHTML = lnFreeResult(fx) + '<div class="row"><button class="btn" type="button" id="lnFree">연습 한 판 더 ▶</button>' + (lnRec() ? '<button class="btn ghost" type="button" id="lnBack">오늘의 줄 결과</button>' : '') + '</div>';
    $('lnFree').onclick = function () { lnStart('free'); }; var bk = $('lnBack'); if (bk) bk.onclick = function () { renderLine(); };
    wireLnShare(fx); sfx('fanfare'); window.scrollTo(0, 0); return;
  }
  var p = prog('line') || { ans: x.ans }, S = PC.scoreLine(PC.genLine(TODAY, ctx), p.ans);
  var promo = p.promo || (S.perfect ? grantPromo() : null);
  if (promo && !p.promo && prog('line')) { p.promo = promo; setProg('line', p); }
  el.innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('line', p.ans, S, { res: S.res.map(function (r) { return r.replace(/o/g, '✅').replace(/x/g, '❌'); }), ok: S.ok, pairs: S.pairs, promo: promo }).then(function (r) {
    checkPerfect(TODAY); lnDayResult(r); sfx('fanfare'); window.scrollTo(0, 0);
  });
}

function lnDayResult(x) {
  var el = $('line'), mx = lnMax(), pct = x.score / mx, res = x.res || [], perf = x.aux || 0, R = PC.genLine(TODAY, ctx).R;
  var scene = perf === LN_N.length ? promoScene(x.promo || [myRank(), myRank()], '5판 모두 완벽한 줄') : PX.ok ? stage('<div class="pxrow">' + zorro(myRank(), pct >= .6 ? 'happy' : pct >= .35 ? 'normal' : 'sad', 3, pct >= .6 ? 'jump' : pct >= .35 ? 'idle' : 'oops') + icon(pct >= .8 ? 'trophy' : 'star', 4) + '</div>' + (pct >= .8 ? confetti() : ''), 'resst', '줄서기 결과') : '';
  el.innerHTML = '<div class="over"><span class="lv">오늘의 줄 · ' + mmdd(TODAY) + '</span>' + scene + vsScene('line', x) + '<div class="big">' + man(x.score) + '<small>점</small></div>' +
    '<div class="ttl"><b>완벽한 줄 ' + perf + ' / ' + LN_N.length + '판</b>' + (x.pairs != null ? '<br><small>순서 맞은 짝 ' + x.pairs + ' / ' + LN_N.reduce(function (s, n) { return s + n * (n - 1) / 2; }, 0) + '</small>' : x.ok != null ? '<br><small>자리 맞힌 조로 ' + x.ok + '명</small>' : '') + '</div>' +
    '<div class="cupem">' + res.map(function (r, i) { return '<span><small>' + (i + 1) + '판</small>' + r + '</span>'; }).join('') + '</div>' +
    '<p class="lnppl" id="lnPpl" hidden></p>' +
    rankBox('line', x) + gotBox('line') + shareBox('shL', vsBox('line', x)) + nextBtn('line') + week7('line') +
    '<details class="more"><summary>오늘의 줄 정답 다시 보기</summary><ol class="rv">' + R.map(function (P, k) {
      return '<li class="' + (res[k] && res[k].indexOf('❌') < 0 ? 'ok' : 'no') + '"><b>' + (k + 1) + '판</b> ' + P.slice().sort(function (a, b) { return b.v - a.v; }).map(function (p) { return esc(p.n) + ' ' + RK[p.ri] + ' ' + man(p.v) + '만'; }).join(' › ') + '</li>'; }).join('') + '</ol></details>' +
    '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbL"></div></details>' +
    '<p class="src" style="margin:0">내일 0시에 새 줄이 와요. 연습 판은 순위 없이 몇 번이든 돼요.</p><div class="row"><button class="btn ghost sm" type="button" id="lnFree">연습 한 판 ▶</button>' + againBtn('line', function () { LN = null; renderLine(); }) + '</div></div>';
  $('lnFree').onclick = function () { lnStart('free'); };
  wireLnShare({ score: x.score, res: res, mode: 'day', day: TODAY });
  getTop('line').then(function (t) {
    fillNb('line', t); var el2 = $('lbL'); if (!t) return;
    if (el2) el2.innerHTML = lbAll(t, 'line') + '<p class="src"><a href="#hall">순위 · 명예의 전당 전체 보기 →</a></p>';
    var P = t.stat && t.stat.lineP, box = $('lnPpl'); if (!box || !P || !(t.stat.lineN >= 3)) return;
    var hard = 0; P.forEach(function (v, k) { if (v != null && v < P[hard]) hard = k; });
    var mine = res[hard] && res[hard].indexOf('❌') < 0 && (x.aux || 0) > 0 ? ' · 나는 완벽! 🎉' : '';
    box.innerHTML = '가장 많이 틀린 판은 <b>' + (hard + 1) + '판</b> · 완벽한 줄 ' + P[hard] + '%' + mine + mockTag() +
      '<br><small>사람들 완벽한 줄 ' + P.map(function (v, k) { return '<span>' + (k + 1) + '판 ' + v + '%</span>'; }).join(' · ') + '</small>';
    box.hidden = false;
  });
}
function lnFreeResult(x) {
  var mx = lnMax(), pct = x.score / mx, perf = x.res.filter(function (r) { return r.indexOf('❌') < 0; }).length;
  return '<div class="rep">' + (PX.ok ? stage('<div class="pxrow">' + zorro(myRank(), pct >= .6 ? 'happy' : pct >= .35 ? 'normal' : 'sad', 3, pct >= .6 ? 'jump' : pct >= .35 ? 'idle' : 'oops') + icon(pct >= .8 ? 'trophy' : 'star', 4) + '</div>' + (pct >= .8 ? confetti() : ''), 'resst', '줄서기 결과') : '') +
    '<p class="lnres big"><small>연습 판</small><b>' + man(x.score) + '점</b> <span class="lnmx">/ ' + man(mx) + '</span></p>' +
    '<div class="cupem">' + x.res.map(function (r, i) { return '<span><small>' + (i + 1) + '판</small>' + r + '</span>'; }).join('') + '</div>' +
    '<p class="src">완벽한 줄 ' + perf + ' / ' + LN_N.length + '판 · 연습 판은 순위에 안 올라가요</p>' + gotBox('line') + shareBox('shL') + '</div>';
}
function wireLnShare(x) {
  var perf = x.res.filter(function (r) { return r.indexOf('❌') < 0; }).length;
  var text = '연봉 놀이터 · 연봉 줄서기 ' + (x.mode === 'day' ? mmdd(x.day || TODAY) : '연습') + ' ' + man(x.score) + '점\n' + x.res.join('\n') + '\n' + SITE_S + '#line';
  wireShare('shL', text, { title: '연봉 줄서기', big: man(x.score) + '점', sub: '완벽한 줄 ' + perf + ' / ' + LN_N.length + '판', lines: x.res, px: { mood: x.score / lnMax() >= .5 ? 'happy' : 'sad', icon: perf === LN_N.length ? 'crown' : '' } });
}


function lnMove(z, slot, p, s, btn, done) {
  if (REDUCE || !z || !slot || !z.animate || !PX.ok) return done();
  var a = z.getBoundingClientRect(), t = slot.getBoundingClientRect(), g = document.createElement('span');
  g.className = 'lnghost'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = lnZ(p, 'happy', s, 'walk');
  g.style.left = a.left + 'px'; g.style.top = a.top + 'px'; g.style.width = a.width + 'px'; g.style.height = a.height + 'px';
  document.body.appendChild(g); btn.style.visibility = 'hidden';
  var dx = t.left + 34 - (a.left + a.width / 2), dy = t.top + t.height / 2 - (a.top + a.height / 2);
  var an = g.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.6)' }], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' });
  var fin = function () { if (!g.parentNode) return; g.parentNode.removeChild(g); done(); };
  LN.busy = fin; an.onfinish = fin; setTimeout(fin, 600);
}

function lnAnsLine(P, pick, ph) {
  var ord = P.map(function (p, j) { return j; }).sort(function (a, b) { return P[b].v - P[a].v; });
  return '<p class="lnansh">정답 줄</p><ol class="lnq lnans" aria-label="정답 줄 (연봉 높은 순)">' + ord.map(function (j, i) {
    var p = P[j], mine = pick.indexOf(j), same = mine === i;
    return '<li class="lnslot on' + (same ? ' good' : ' bad') + '"><span class="lnno">' + (i + 1) + '</span><span class="lnz">' + (PX.ok ? lnZ(p, same ? 'happy' : 'normal', ph ? 1 : 1.3, '', 1) : '') + '</span>' + lnTag(p, ph) +
      '<span class="lnv">' + man(p.v) + '만</span><span class="lnmk" aria-label="' + (same ? '내 줄과 같음' : '내 줄 ' + (mine + 1) + '등') + '">' + (same ? '✅' : '<small>내 ' + (mine + 1) + '등</small>') + '</span></li>';
  }).join('') + '</ol>';
}

