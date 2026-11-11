'use strict';


var RREV = false;
var SC_TXT = {
  new: ['취준생으로 출발해요. 첫 직장 3곳(큰 회사·중간·작은 회사) 중 하나를 골라요.', 'cap'],
  jr: ['작은 회사 2년 차에서 출발해요. 첫 고르기는 큰 회사 \'중고신입\' 제안 2장 또는 남기. 지금 연봉보다 30% 넘게 높은 곳은 떨어질 수 있어요.', 'sign'],
  dev: ['IT·게임·통신·반도체 회사 위주예요. 그 회사에 있으면 스톡옵션이 터질 수 있어요(급성장 회사일수록 크게).', 'rocket'],
  pub: ['첫 직장은 공공기관 3곳. 그 뒤로 공공기관 경력 공채(같은 직급)와 민간 한 직급 위 제안 사이에서 골라요. 공공기관은 구조조정이 드물어요.', 'house']
};
var WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];

function rankName(x) { return RK[Math.min(4, Math.floor(x / 4))]; }
function rankAt(x) { return Math.min(4, Math.floor(Math.max(0, x) / 4)); }
function scaleLb(c) { return c.m >= 10000 ? '직원 1만 명 넘는 대기업' : c.m >= 3000 ? '큰 회사' : '중견 회사'; }
function sigHtml(c, of) {
  var s = ['<span>' + esc(c.grp) + '</span>', '<span>' + scaleLb(c) + '</span>'];
  if (c.pub) s.push('<span>공공기관</span>');
  s.push(c.rt ? '<span class="' + (c.rt < 3 ? 'risk' : c.rt >= 3.7 ? 'goodsig' : '') + '">평점 ' + c.rt.toFixed(1) + '</span>' : '<span>평점 정보 없음</span>');
  s.push(c.to < .06 ? '<span class="goodsig">퇴사율 낮음</span>' : c.to < .12 ? '<span>퇴사율 보통</span>' : '<span class="risk">퇴사율 높음</span>');
  if (c.jump) s.push('<span>성과급 변동 큼</span>');
  if (c.my >= 15) s.push('<span>폭풍 성장</span>'); else if (c.my <= -10) s.push('<span class="risk">인원 줄어드는 중</span>');
  if (RPZ && RPZ.sc === 'dev' && PC.devCo(c)) s.push('<span>스톡옵션 있음</span>');
  if (of && of.reach) s.push('<span class="risk">스펙보다 높은 제안 · 떨어질 수 있음</span>');
  return '<span class="sig">' + s.join('') + '</span>';
}
function roadState(p) { return PC.simRoad(RPZ, ctx, p.picks.concat([2, 2, 2, 2, 2]).slice(0, 5)); }

function evIcon(L) {
  return L.failed ? 'broken' : L.ev === 'cut' ? 'skull' : L.ev === 'jump' ? 'chest' : L.ev === 'stock' ? 'rocket' : L.ev === 'star' ? 'star'
    : L.moved ? (L.k || RPZ.home ? 'fairy' : 'cap') : 'house';
}
function evMood(L) { return L.failed || L.ev === 'cut' ? 'sad' : L.ev || (L.moved && L.k) ? 'happy' : 'normal'; }
function evSfx(L) { sfx(L.failed || L.ev === 'cut' ? 'wrong' : L.ev === 'jump' || L.ev === 'stock' ? 'combo' : 'coin'); }

function roadMap(R, k, rev) {
  if (!PX.ok) return '';
  var X0 = RPZ.x0 || 0, cur = rev ? k - 1 : k;
  return '<ol class="pxmap" aria-label="10년 지도: ' + (cur + 1) + '번째 스테이지">' + [0, 1, 2, 3, 4].map(function (i) {
    var L = R.log[i], st = i === cur ? 'cur' : i < k ? 'done' : 'todo', x = X0 + 2 * i;
    var top = i === cur ? zorro(rankAt(x), rev && L ? evMood(L) : 'normal', 1.5, rev ? 'jump' : 'idle') : '';
    return '<li class="' + st + '">' + top + '<span class="tile">' + (i < k ? icon(evIcon(L), 2) : icon('quest', 2)) + '</span><small>' + (x + 1) + '~' + (x + 2) + '년</small></li>';
  }).join('') + '</ol>';
}
function scenLine() {
  var sc = RPZ.sc || 'new', d = PC.dow(TODAY);
  return '<p class="scen">' + icon(SC_TXT[sc][1], 2) + '오늘의 팩 · ' + PC.ROAD_SC[sc] + '</p><p class="qsub" style="margin:0">' + SC_TXT[sc][0] + '</p>' +
    '<ul class="week7" aria-label="요일별 팩">' + [1, 2, 3, 4, 5, 6, 0].map(function (w) { return '<li class="' + (w === d && PC.ROAD_WEEK[w] === sc ? 'on' : '') + '">' + WEEK_KO[w] + ' ' + PC.ROAD_SC[PC.ROAD_WEEK[w]] + '</li>'; }).join('') + '</ul>' +
    (TODAY < PC.ROAD_SC_FROM ? '<p class="src" style="margin:0">요일별 팩은 ' + mmdd(firstPackDay()) + '(' + WEEK_KO[PC.dow(firstPackDay())] + ')부터 돌아요. 그 전엔 모두 신입 공채예요.</p>' : '');
}

function firstPackDay() { var d = PC.ROAD_SC_FROM; while (PC.roadScen(d) === 'new') d = PC.addDays(d, 1); return d;
}
function renderRoad() {
  RPZ = RPZ || PC.genRoad(TODAY, ctx);
  if (RPZ.v === 2) return renderRoad2();
  var x = rec(TODAY, 'road'), p = prog('road');
  if (x) return resultRoad(x);
  if (!p) {
    $('road').innerHTML = '<div class="intro"><h3>오늘의 이직 로드 · ' + mmdd(TODAY) + '</h3>' +
      '<p class="sum">2년마다 제안 중 하나를 고르거나 남아요. 다섯 번 고르면 10년 누적 연봉과 엔딩이 나와요.<br>회사 이름은 고른 뒤에 공개해요. 오늘의 팩은 <b>' + PC.ROAD_SC[RPZ.sc || 'new'] + '</b>.</p>' +
      '<button class="btn big" id="rGo" type="button">출발하기 ▶</button>' + scenLine() + endDogam(null) + '<details class="rules"><summary>규칙 보기</summary><ul>' +
      '<li>' + (RPZ.home ? '작은 회사 2년 차로 출발해요.' : '신입으로 출발해요.') + ' 2년마다 제안 2장 중 하나를 고르거나 남아요. 모두 다섯 번 골라요.</li>' +
      '<li>고르는 순간엔 업종·규모·평점·퇴사율 같은 신호만 보여요. 회사 이름은 고른 뒤에 공개해요.</li>' +
      '<li>2년마다 사건이 나와요: 성과급 큰 해(보물상자), 구조조정(해골, 퇴사율·평점 낮은 회사일수록 잘 나옴), 이직(헤드헌터 요정, 실제 이직자 인상률 분포로 협상), 이직 실패(스펙보다 너무 높은 제안).</li>' +
      '<li>점수는 10년 누적 연봉이에요. 같은 날엔 모두 같은 팩·제안·사건을 받아요. 길에 따라 엔딩 7종 중 하나가 나오고, 본 엔딩은 도감에 모여요.</li></ul></details></div>';
    $('rGo').onclick = function () { $('rGo').disabled = true; startDaily('road').then(function (st) { setProg('road', { tok: st.tok, t0: st.t0, picks: [] }); RREV = false; renderRoad(); }); };
    return;
  }
  drawRoad(p);
}
function drawRoad(p) {
  var k = p.picks.length, R = roadState(p), last = k ? R.log[k - 1] : null, S0 = PC.roadStart(RPZ, ctx), X0 = S0.x;
  if (k >= 5 && !RREV) return finishRoad(p);
  var x = X0 + (RREV ? 2 * (k - 1) : 2 * k), done = R.years.slice(0, 2 * k), sum = done.reduce(function (a, b) { return a + b; }, 0);
  var c = last ? BYN[last.co] : S0.c, s = last ? last.y2 : S0.s;
  var h = '<div class="rstate"><div class="k"><div class="l">지금 · ' + esc(PC.ROAD_SC[RPZ.sc || 'new']) + '</div><div class="v">' + (k || RPZ.home ? (X0 + (RREV ? 2 * k - 1 : 2 * k + 1)) + '년 차' : '취준생') + '</div></div>' +
    '<div class="k"><div class="l">회사</div><div class="v">' + (c ? esc(c.n) : '-') + '</div></div>' +
    '<div class="k"><div class="l">지금 연봉</div><div class="v">' + (k ? man(RREV ? last.y2 + last.bonus : s) + '만' : c ? man(s) + '만' : '-') + '</div></div>' +
    '<div class="k"><div class="l">지금까지 누적</div><div class="v">' + (sum ? eokS(sum) : '-') + '</div></div></div>' + roadMap(R, k, RREV);
  if (RREV) {
    var L = last, co = BYN[L.co];
    var msg = L.failed ? '<b class="ev">이직 실패.</b> ' + esc(L.o) + ' 최종 면접에서 떨어져 ' + esc(co.n) + '에 그대로 남았어요.'
      : L.moved ? (L.k ? '<b class="evg">' + esc(co.n) + '로 이직!</b> 헤드헌터 요정 덕분에 협상 결과 ' + L.nego.toFixed(2) + '배로 첫해 ' + man(L.start) + '만원.'
        : RPZ.home ? '<b class="evg">' + esc(co.n) + ' 중고신입 입사!</b> 첫해 ' + man(L.start) + '만원.' : '<b class="evg">' + esc(co.n) + ' 입사!</b> 첫 연봉 ' + man(L.start) + '만원.')
      : esc(co.n) + '에 남았어요. 올해 ' + man(L.start) + '만원.';
    var ev = L.ev === 'cut' ? ' <b class="ev">구조조정 바람:</b> 2년째 연봉이 동결됐어요.' : L.ev === 'jump' ? ' <b class="evg">성과급 큰 해:</b> 성과급 +' + man(L.bonus) + '만원!'
      : L.ev === 'stock' ? ' <b class="evg">스톡옵션 대박:</b> +' + man(L.bonus) + '만원!' : L.ev === 'star' ? ' <b class="evg">고과 S:</b> 2년째 +5%.' : ' 큰 일 없이 2년이 지났어요.';
    h += stage(zorro(rankAt(L.x), evMood(L), 3, evMood(L) === 'happy' ? 'jump' : 'idle') + icon(evIcon(L), 5, 'evi') + bld(co, bS(), null, 'grow'), 'evst') +
      '<ul class="rlog"><li>' + msg + ev + '</li></ul><div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn" id="rNx" type="button">' + (k < 5 ? '2년 뒤로' : '10년 결과 보기') + '</button></div>';
    $('road').innerHTML = h + roadLog(R, k - 1);
    $('rNx').onclick = function () { RREV = false; drawRoad(p); }; $('rNx').focus({ preventScroll: true });
    return;
  }
  var st = RPZ.steps[k], wcls = function (T) { return T.m >= 10000 ? 13 : T.m >= 3000 ? 11 : 9; };
  var cards = st.o.map(function (o, j) {
    var T = BYN[o.n], of = PC.roadOffer(ctx, o, x, s);
    var ttl = o.kind === 'new' ? (T.pub ? '공공기관 신입 공채' : '신입 공채') : o.kind === 'jr' ? '중고신입 공채 · 경력 일부 인정' : o.kind === 'up' ? rankName(x + 4) + ' 제안 · 한 직급 위' : rankName(x) + ' 제안 · 같은 직급';
    return '<button class="offer" type="button" data-j="' + j + '">' + bld(T, 3, { blind: 1, w: wcls(T) }, 'ob') + '<span class="ol">' + 'ABC'[j] + '</span><span class="ot">' + esc(T.grp) + ' ' + ttl + '</span>' +
      '<span class="om">' + man(of.lo) + '~' + man(of.hi) + '<small>만원</small></span>' + sigHtml(T, of) + '</button>';
  });
  if (k || RPZ.home) {
    var nx = s * PC.curve(c, x) / PC.curve(c, x - 1);
    cards.push('<button class="offer stay" type="button" data-j="2">' + bld(c, 3, null, 'ob') + '<span class="ol">C</span><span class="ot">남기 · ' + esc(c.n) + '</span><span class="om">' + man(nx) + '<small>만원</small></span>' +
      '<span class="sig"><span>' + (Math.floor(x / 4) > Math.floor((x - 2) / 4) ? rankName(x) + ' 승진' : '같은 직급') + '</span>' + (PC.roadRiskSc(RPZ, c) >= .15 ? '<span class="risk">구조조정 걱정</span>' : '<span class="goodsig">이직 위험 없음</span>') + '</span></button>');
  }
  h += '<div class="fork">' + icon('sign', 3) + '<div><p class="qline" style="margin:0">' + (k ? (x + 1) + '년 차, <b>제안이 왔어요</b>' : RPZ.home ? (x + 1) + '년 차, <b>큰 회사에 붙었어요</b>' : '첫 직장을 <b>골라요</b>') + '</p></div></div>' +
    '<p class="qsub">' + (k || RPZ.home ? '갈림길이에요. 연봉 범위는 협상에 따라 달라져요. 회사 이름은 고른 뒤에 공개해요.' : '세 곳 모두 붙었어요. 신호만 보고 하나를 고르세요.') + '</p>' +
    '<div class="offers">' + cards.join('') + '</div>';
  $('road').innerHTML = h + roadLog(R, k - 1);
  document.querySelectorAll('#road .offer').forEach(function (b) { b.onclick = function () {
    p.picks.push(+b.dataset.j); setProg('road', p); RREV = true; drawRoad(p); evSfx(roadState(p).log[p.picks.length - 1]);
  }; });
}
function roadLog(R, upto) {
  if (upto < 0) return '';
  return '<ul class="rlog">' + R.log.slice(0, upto + 1).map(function (L) {
    return '<li>' + (L.x + 1) + '~' + (L.x + 2) + '년 차 · <b>' + esc(L.co) + '</b>' + bossMark(BYN[L.co]) + ' ' + man(L.start) + ' → ' + man(L.y2 + L.bonus) + '만원' + (L.failed ? ' · 이직 실패' : L.moved && (L.k || RPZ.home) ? ' · 이직' : '') +
      (L.ev === 'cut' ? ' · 구조조정' : L.ev === 'jump' ? ' · 성과급 큰 해' : L.ev === 'stock' ? ' · 스톡옵션' : L.ev === 'star' ? ' · 고과 S' : '') + '</li>'; }).join('') + '</ul>';
}
function finishRoad(p) {
  var S = PC.scoreRoad(RPZ, p.picks, ctx);
  $('road').innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('road', S.picks, S, { picks: S.picks }).then(function (x) { if (x.sent && x.rank <= Math.max(1, Math.floor(x.total / 100))) award('road'); resultRoad(x, true); sfx('fanfare'); });
}
function roadZorro(R) {
  var mv = R.log.filter(function (l) { return l.moved && (l.k || RPZ.home); }), out = [];
  var risky = R.log.filter(function (l) { return l.moved && BYN[l.co].rt && BYN[l.co].rt < 3; })[0];
  if (risky) out.push(risky.k || RPZ.home ? (risky.x + 1) + '년 차 ' + risky.co + ', 연봉은 올랐지만 평점 ' + BYN[risky.co].rt.toFixed(1) + '은 늘 위험 신호였어요.'
    : '첫 직장 ' + risky.co + '의 평점 ' + BYN[risky.co].rt.toFixed(1) + '은 처음부터 위험 신호였어요. 신입 때는 연봉보다 배울 수 있는 곳인지가 더 중요해요.');
  if (R.log.some(function (l) { return l.failed; })) out.push('스펙보다 높은 제안에 도전했다가 한 번 떨어졌어요. 높은 제안은 붙을 확률까지 같이 계산하세요.');
  if (!mv.length) out.push('처음 회사에서 10년을 지켰어요. 안정은 좋지만, 대리 때 한 번은 시장 가격을 확인해 볼 만했어요.');
  else if (mv.length >= 4) out.push('2년마다 옮겼어요. 돈은 늘지만 실제 서류 심사에선 \'잦은 이직\'으로 읽혀 깎일 수 있어요.');
  else out.push('이직 ' + mv.length + '번으로 10년 누적 ' + eokS(R.total) + '. 2~3번 옮기며 직급을 올리는 건 실제로도 가장 흔한 \'잘된 길\'이에요.');
  if (out.length < 2 && R.log.some(function (l) { return l.ev === 'cut'; })) out.push('구조조정을 만난 해가 있었어요. 퇴사율 높은 회사는 그만큼 흔들릴 일도 많아요.');
  return out.slice(0, 2).join(' ');
}
function roadChart(a, b, x0) {
  x0 = x0 || 0;
  var nar = window.innerWidth < 560, W = nar ? 380 : 640, H = nar ? 240 : 260, L = 46, Rr = 16, T = 14, B = 28, all = a.concat(b || [], [10000]), mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
  var step = mx - mn > 8000 ? 2000 : 1000, y0 = Math.floor(mn / step) * step, y1 = Math.ceil(mx / step) * step;
  var X = function (t) { return L + (W - L - Rr) * t / 9; }, Y = function (v) { return T + (H - T - B) * (1 - (v - y0) / (y1 - y0)); };
  var g = '', pth = function (arr) { return arr.map(function (v, t) { return (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(''); };
  for (var v = y0; v <= y1; v += step) g += '<line class="ax" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="tx" x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v >= 10000 ? (v / 10000).toFixed(v % 10000 ? 1 : 0) + '억' : man(v) + '만') + '</text>';
  for (var t = 0; t < 10; t++) g += '<text class="tx" x="' + X(t) + '" y="' + (H - 8) + '" text-anchor="middle">' + (t % 3 === 0 || t === 9 ? (t + 1 + x0) + '년' : '') + '</text>';
  g += '<line class="eok" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(10000) + '" y2="' + Y(10000) + '"/>';
  if (b) g += '<path class="bst" d="' + pth(b) + '"/>';
  g += '<path class="me" d="' + pth(a) + '"/>';
  return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="10년 연도별 연봉: 내 길' + (b ? '과 오늘 1위의 길' : '') + '">' + g + '</svg><div class="leg"><span><i></i>내 길</span>' + (b ? '<span><i class="b"></i>오늘 1위의 길</span>' : '') + '<span>점선: 연봉 1억</span></div></div>';
}

function resultRoad(x, fresh) {
  var R = PC.simRoad(RPZ, ctx, x.picks || x.ans), path = R.log.map(function (l) { return l.failed ? '💥' : l.moved ? (l.k || RPZ.home ? '🚀' : '🎓') : '🏠'; }).join('');
  var EN = PC.roadEnding(RPZ, ctx, R.picks), T = END_TXT[EN.id], B = endBook(), isNew = !B[EN.id];
  if (isNew) { B[EN.id] = TODAY; store.setJ('slp-endings', B); }
  var fin = BYN[R.log[4].co], scn = PC.ROAD_SC[RPZ.sc || 'new'];
  var text = '연봉 놀이터 · 이직 로드 10년 ' + mmdd(TODAY) + ' (' + scn + ')\n' + path + '\n엔딩: ' + EN.lb + '\n10년 누적 ' + eokS(R.total) + (R.eok ? ' · 1억 ' + (R.eok + (RPZ.x0 || 0)) + '년 차' : ' · 1억 못 찍음') + '\n' + SITE_S;
  var scene = '<div class="ending">' + stage('<div class="pxrow">' + zorro(T[3], T[2], 4, T[2] === 'happy' ? 'jump' : 'idle') + icon(T[0], 5, 'evi') + bld(fin, bS(true), null, 'grow') + '</div>' + (T[2] === 'happy' ? confetti() : ''), '', '엔딩: ' + EN.lb) +
    '<span class="lv">ENDING · ' + esc(scn) + (isNew ? ' · NEW!' : '') + '</span><div class="endnm"><b>' + esc(EN.lb) + '</b></div><p>' + T[1] + '</p></div>';
  $('road').innerHTML = '<div class="over"><span class="lv">이직 로드 10년 · ' + mmdd(TODAY) + '</span>' + scene + vsScene('road', x) + '<div class="big" style="font-size:clamp(44px,8vw,90px)">' + eokS(R.total) + '</div>' +
    '<div class="ttl"><b>' + (R.eok ? '연봉 1억, ' + (R.eok + (RPZ.x0 || 0)) + '년 차에 찍었어요' : '10년 안에 1억은 못 찍었어요') + '</b></div><p>' + path + '</p>' + rankBox('road', x) +
    '<div class="zorro"><div class="who"><i></i>조로의 한마디</div><p>' + esc(roadZorro(R)) + '</p></div>' +
    gotBox('road') + shareBox('shR', vsBox('road', x)) + nextBtn('road') + week7('road') +
    '<details class="more"><summary>10년 그래프 · 2년마다 기록</summary><div id="rChart" style="width:100%">' + roadChart(R.years, null, RPZ.x0) + '</div>' + roadLog(R, 4).replace('class="rlog"', 'class="rlog" style="width:100%;text-align:left"') + '</details>' +
    '<details class="more"><summary>엔딩 도감 · ' + PC.ENDINGS.filter(function (e) { return endBook()[e[0]]; }).length + ' / ' + PC.ENDINGS.length + '</summary>' + endDogam(EN.id) + '</details>' +
    '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbR"></div></details><div class="row">' + againBtn('road', function () { RREV = false; renderRoad(); }) + '</div></div>';
  if (fresh && isNew) toast('새 엔딩을 모았어요: ' + EN.lb);
  wireShare('shR', text, { title: '이직 로드 10년 · ' + scn, big: eokS(R.total), sub: '엔딩: ' + EN.lb + '\n' + (R.eok ? '1억 ' + (R.eok + (RPZ.x0 || 0)) + '년 차' : '1억 못 찍음') + ' · ' + mmdd(TODAY), lines: [path],
    px: { mood: T[2], rk: T[3], co: fin, icon: T[0] } });
  getTop('road').then(function (t) {
    fillNb('road', t);
    if (!t) return;
    var b = t.stat.best;
    if (b && b.picks && b.picks.length === 5) { var B2 = PC.simRoad(RPZ, ctx, b.picks); $('rChart').innerHTML = roadChart(R.years, B2.years, RPZ.x0) + '<p class="src">오늘 1위 ' + esc(b.nick) + ': ' + B2.log.map(function (l) { return l.co; }).filter(function (n, i, a) { return a.indexOf(n) === i; }).map(esc).join(' → ') + ' · ' + eokS(B2.total) + mockTag() + '</p>'; }
    var el = $('lbR'); if (el) el.innerHTML = lbAll(t, 'road') + '<p class="src"><a href="#hall">순위 · 명예의 전당 전체 보기 →</a></p>';
  });
}




var SEASON = ['봄', '여름', '가을', '겨울'], SEASON_ICO = ['blossom', 'sun', 'leaf', 'snow'];

Object.assign(ICON, {
  blossom: [['..p.p..', '.pPpPp.', 'pPPyPPp', '.pPpPp.', '..p.p..', '...g...', '..gg...'], { p: '#ff9bc4', P: '#ffc4dc', y: '#ffd23d', g: '#5aa04a' }],
  sun: [['y..y..y', '.y.y.y.', '..ooo..', 'yyoOoyy', '..ooo..', '.y.y.y.', 'y..y..y'], { y: '#ffcf3d', o: '#ffb020', O: '#fff3b0' }],
  leaf: [['....oo.', '...orro', '..orrro', '.orryro', 'orryro.', 'oryro..', '.oo....', 'b......'], { o: '#b5541a', r: '#e0761f', y: '#ffcf3d', b: '#6b4a2b' }],
  snow: [['...w...', '.w.w.w.', '..www..', 'wwwbwww', '..www..', '.w.w.w.', '...w...'], { w: '#ffffff', b: '#9fc2ee' }],
  heart: [['.rr.rr.', 'rRrrrrr', 'rRrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff5b8a', R: '#ffc4d6' }]
});
var GAUGE = [['hp', '체력'], ['cr', '커리어'], ['hap', '행복']];
var R2PR = null;

function r2Age(g, y) { return (g ? 26 : 24) + (RPZ.x0 || 0) + y; }
function r2Rank(x) { return rankAt(x); }
function zG(g, rk, mood, s, anim) { return zorro(rk, mood, s, anim, { look: { base: g ? 'm' : 'f' } }); }

function r2Eul(n) { var c = String(n || '').charCodeAt(String(n || '').length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? '을' : '를'; }
function r2Ro(n) { var c = String(n || '').charCodeAt(String(n || '').length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 && c % 28 !== 8 ? '으로' : '로'; }
function r2Prog() {
  if (R2PR) { var q = store.getJ('slp-r2pr', null); return q && q.d === R2PR.d && q.picks ? q : null; }
  var p = prog('road'); return p && p.v2 ? p : null;
}
function r2Save(p) { if (R2PR) store.setJ('slp-r2pr', p); else setProg('road', p); }

function r2Practice(d) { R2PR = { d: d, pz: PC.genRoad(d, ctx) }; RPZ = R2PR.pz; store.setJ('slp-r2pr', null); RREV = false; renderRoad2(); window.scrollTo(0, 0); }
function r2Daily() { R2PR = null; RPZ = PC.genRoad(TODAY, ctx); RREV = false; renderRoad2(); window.scrollTo(0, 0); }
function r2RandDay() { return PC.addDays(TODAY, 4000 + Math.floor(Math.random() * 3000)); }

function r2At(p, k) { return PC.simRoad2(RPZ, ctx, p.picks, k); }
function r2Hint(h) {
  var L = [['m', '연봉'], ['hp', '체력'], ['cr', '커리어'], ['hap', '행복']], out = [];
  L.forEach(function (a) { var v = h && h[a[0]]; if (v) out.push('<span class="' + (v > 0 ? 'up' : 'dn') + '">' + a[1] + ' ' + (v > 0 ? '▲' : '▼').repeat(Math.min(2, Math.abs(v))) + '</span>'); });
  return out.length ? '<span class="r2h">' + out.join('') + '</span>' : '<span class="r2h"><span>큰 변화 없음</span></span>';
}
function r2Bars(S) {
  return GAUGE.map(function (a) { var v = Math.round(S[a[0]]); return '<div class="r2g ' + a[0] + '"><span class="l">' + a[1] + '</span><span class="bar"><i style="width:' + v + '%"></i></span><b>' + v + '</b></div>'; }).join('');
}
function r2Hud(S, y) {
  return '<div class="r2hud"><div class="r2top"><span class="lv">' + (R2PR ? '연습 · ' : '') + SEASON[Math.floor(Math.min(19, y) / 5)] + ' · ' + (y + 1) + '년째 · ' + r2Age(S.g, y) + '살</span><span class="co">' + esc(S.cname || '취준생') + '</span>' +
    '<span class="sal">' + (S.s ? man(S.s) + '만원' : '-') + '</span></div><div class="r2gs">' + r2Bars(S) + '</div></div>';
}

function r2Bld(S, sz, cls) { return S.su ? icon('rocket', sz) : S.retired ? icon('sign', sz) : S.c ? bld(S.c, sz, null, cls) : ''; }

function r2Path(y) {
  var slotY = {}; PC.R2_SLOTS.forEach(function (s) { slotY[s[0]] = 1; });
  return '<ol class="r2path" aria-label="20년 중 ' + (y + 1) + '년째">' + [0, 1, 2, 3].map(function (c) {
    return '<li class="ss s' + c + '"><small>' + SEASON[c] + '</small><span>' + [0, 1, 2, 3, 4].map(function (i) {
      var yy = c * 5 + i; return '<i class="' + (slotY[yy] ? 'q' : '') + (yy < y ? ' done' : yy === y ? ' cur' : '') + '"></i>';
    }).join('') + '</span></li>';
  }).join('') + '</ol>';
}

function r2Chapter(S, ch) {
  var g = S.g, x0 = RPZ.x0 || 0, sc = RPZ.sc || 'new', age = r2Age(g, ch * 5), L = [];
  if (ch === 0) {
    if (sc === 'jr') L.push(age + '살 봄. ' + (g ? '군 복무를 마치고 들어간 ' : '') + '작은 회사에서 ' + x0 + '년을 일했다. 일은 많이 배웠는데 통장은 그대로다.');
    else L.push(g ? age + '살 봄. 군 복무 2년을 마치고 졸업했다. 친구들보다 조금 늦게 출발선에 섰다.' : age + '살 봄. 졸업식 사진이 아직 휴대폰 첫 화면에 있다.');
    L.push(sc === 'jr' ? '큰 회사 중고신입 공고를 다시 열어 본다.' : sc === 'pub' ? '공공기관 세 곳에서 합격 연락이 왔다. 안정이냐, 조금 더 큰 무대냐.' : sc === 'dev' ? '코딩 테스트를 몇 번이나 봤는지 모르겠다. 개발자로 세 곳에 붙었다.' : '세 곳에서 합격 연락이 왔다. 어디로 첫 출근을 할지 정해야 한다.');
  } else if (ch === 1) {
    L.push((ch * 5 + 1) + '년째 여름. 일이 손에 익었다. 모르는 번호로 전화가 오기 시작했다.');
    L.push(S.dating ? '주말마다 만나는 사람이 있다. 미래 이야기가 조금씩 길어진다.' : '퇴근 후 시간이 조금 남는다. 그 시간을 어디에 쓸지 아직 모르겠다.');
  } else if (ch === 2) {
    L.push((ch * 5 + 1) + '년째 가을. 후배가 더 많아졌다. 회사에서도 집에서도 책임질 일이 늘었다.');
    L.push(S.married ? PARTNER2() + '와 함께한 지 몇 해. 식탁에서 앞으로의 계획을 자주 이야기한다.' : '혼자의 생활이 단단해졌다. 다음 10년은 어떤 모습일까.');
  } else {
    L.push((ch * 5 + 1) + '년째 겨울. 사무실 창밖으로 신입들이 보인다.');
    L.push(S.kids ? '아이는 벌써 학교에 다닌다. 남은 5년을 어떻게 쓸지 생각한다.' : '남은 5년. 무엇을 남기고 싶은지 생각한다.');
  }
  if (S.hp < 35) L.push('요즘 부쩍 피곤하다. 몸이 보내는 신호를 무시하기 어렵다.');
  return L;
}
function PARTNER2() { return '배우자'; }

function r2ChBanner(S, ch) {
  var fx = '<div class="r2fx s' + ch + '" aria-hidden="true">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
    return '<i style="left:' + ((i * 37 + 11) % 97) + '%;' + (ch === 1 ? 'bottom:' + ((i * 23) % 70 + 10) + '%;' : '') + 'animation-delay:-' + ((i * 1.7) % 7).toFixed(1) + 's;animation-duration:' + (6 + (i % 4)) + 's"></i>'; }).join('') + '</div>';
  return '<div class="r2ch mini s' + ch + '">' + fx + '<span class="lv">' + (ch + 1) + '장 · ' + SEASON[ch] + '</span><h3>' + icon(SEASON_ICO[ch], 2, 'r2si') + ' ' + ['사원의 봄', '한창의 여름', '책임의 가을', '정리의 겨울'][ch] + '</h3>' +
    '<div class="r2story">' + r2Chapter(S, ch).map(function (t, i) { return '<p style="animation-delay:' + (i * .3) + 's">' + esc(t) + '</p>'; }).join('') + '</div></div>';
}


function r2Track(R) {
  var o = r2Stats(), S = R.S, mn = Math.round(Math.min(S.hp, S.cr, S.hap));
  o['g' + S.g] = 1; o.best = Math.max(o.best || 0, R.score); o.triMin = Math.max(o.triMin || 0, mn); if (mn >= R2_TRI) o.tri = 1; if (S.married || S.wed) o.married = 1; store.setJ('slp-r2st', o);
}
function renderRoad2() {
  if (!R2PR && RPZ && RPZ.dk && RPZ.dk !== TODAY) RPZ = PC.genRoad(TODAY, ctx);
  var x = R2PR ? null : r2Rec(), p = r2Prog();
  if (x) return resultRoad2(x);
  if (!p) {
    $('road').innerHTML = '<div class="intro r2in"><h3>' + (R2PR ? '연습 판 · 순위 없음' : '커리어 로드 20년 · ' + mmdd(TODAY)) + '</h3>' +
      stage('<div class="pxrow">' + zG(0, 0, 'normal', 3, 'idle') + icon('sign', 4) + zG(1, 0, 'normal', 3, 'idle') + '</div>', 'r2st') +
      (R2PR ? '<p class="sum">' + (R2PR.d === TODAY ? '오늘과 같은 판을 다시 살아 봐요.' : '무작위로 고른 판이에요.') + ' 점수는 순위에 안 들어가고, 엔딩 도감과 소품에는 모여요.</p>'
        : '<p class="sum">사회 첫발부터 20년. 이직 갈림길, 회사 사건, 연애·결혼·아이·부모님 같은 개인사까지 <b>16번</b> 골라요.<br>연봉만이 아니라 <b>체력·커리어·행복</b>까지 합친 종합점수로 겨뤄요.</p>') +
      '<p class="qline" style="font-size:20px;margin:14px 0 8px">누구의 20년을 살아 볼까요?</p>' +
      '<div class="row r2sex"><button class="btn big" type="button" data-g="0">여자로 시작</button><button class="btn big" type="button" data-g="1">남자로 시작</button><button class="btn ghost" type="button" data-g="r">랜덤으로 정하기</button></div>' +
      '<p class="src" style="margin-top:8px">성별에 따라 출발 나이와 만나는 사건이 달라요. 어느 쪽이든 점수의 기대값은 같도록 맞췄어요.</p>' +
      (R2PR ? '<div class="row"><button class="btn ghost sm" id="r2Back" type="button">오늘의 판으로 돌아가기</button></div>'
        : scenLine() + '<div class="row"><button class="btn ghost sm" id="r2Try" type="button">연습 판 먼저 해 보기 (순위 없음)</button></div>' +
      '<details class="more" style="width:100%"><summary>엔딩 도감 · ' + PC.ENDINGS.filter(function (e) { return endBook()[e[0]]; }).length + ' / ' + PC.ENDINGS.length + '</summary>' + endDogam(null) + '</details><details class="rules"><summary>규칙 보기</summary><ul>' +
      '<li>20년은 4장(봄·여름·가을·겨울), 장마다 4번 골라요. 고르기 전에 연봉·체력·커리어·행복이 어느 쪽으로 움직일지 화살표로 보여 줘요. 정확한 크기는 숨겨요.</li>' +
      '<li>이직 제안은 회사 이름을 고른 뒤에 공개해요. 커리어가 높을수록 협상이 유리하고, 무리한 제안에도 잘 붙어요.</li>' +
      '<li>체력이 바닥나면 번아웃으로 쉬어야 해요. 밀어붙이는 선택은 가끔 몸이 먼저 지치고, 쉬어 가는 선택은 체력·행복을 더 채워요. 지금 고른 것이 몇 년 뒤 사건으로 돌아오기도 해요.</li>' +
      '<li>종합점수 = 20년 누적 연봉 1억당 ' + PC.R2_W.money + '점 + 마지막 체력·커리어·행복 각 ×2점. 같은 날엔 모두 같은 팩·제안·사건을 받아요. 엔딩은 15종이에요.</li></ul></details>') + '</div>';
    document.querySelectorAll('.r2sex button').forEach(function (b) { b.onclick = function () {
      var g = b.dataset.g === 'r' ? (Math.random() < .5 ? 0 : 1) : +b.dataset.g;
      document.querySelectorAll('.r2sex button').forEach(function (z) { z.disabled = true; });
      if (b.dataset.g === 'r') toast((g ? '남자' : '여자') + '로 정해졌어요');
      if (R2PR) { r2Save({ d: R2PR.d, picks: [g], v2: 1 }); RREV = false; renderRoad2(); return; }
      startDaily('road').then(function (st) { setProg('road', { tok: st.tok, t0: st.t0, picks: [g], v2: 1, chSeen: -1 }); RREV = false; renderRoad2(); });
    }; });
    if ($('r2Try')) $('r2Try').onclick = function () { r2Practice(r2RandDay()); };
    if ($('r2Back')) $('r2Back').onclick = r2Daily;
    return;
  }
  drawRoad2(p);
}

function r2Band(p, k) {
  var full = r2At(p, k), S = full.S, L = full.log.filter(function (l) { return l.k === k - 1 && !l.quiet; })[0];
  if (!L) return '';
  var nextY = k < PC.R2_SLOTS.length ? PC.R2_SLOTS[k][0] : 20, quiet = full.log.filter(function (l) { return l.quiet && l.y > L.y && l.y < nextY; });
  var txt = L.t === 'job' ? r2JobTxt(L) : esc(L.txt), d = L.d || {};
  var chips = GAUGE.map(function (a) { var v = d[a[0]]; return v ? '<span class="' + (v > 0 ? 'up' : 'dn') + '">' + a[1] + ' ' + (v > 0 ? '+' : '') + v + '</span>' : ''; }).join('');
  var notes = (L.notes || []).map(function (n) { return r2Note(n, L, S); }).filter(Boolean);
  var mood = r2Mood(L);
  return '<div class="r2diary r2band ' + mood + '"><span class="lv">' + (L.y + 1) + '년째 · ' + esc(L.lb || (L.t === 'job' ? '이직 갈림길' : '')) + '</span><p>' + txt + (notes.length ? ' ' + notes.join(' ') : '') + '</p>' +
    '<p class="r2chips">' + chips + '<span>수입 ' + man(L.inc) + '만원</span></p>' +
    (quiet.length ? '<p class="r2inc">' + quiet.map(function (q) { var ns = q.notes.map(function (n) { return r2Note(n, q, S); }).filter(Boolean); return '<b>' + (q.y + 1) + '년째</b> ' + (ns.length ? ns.join(' ') : '조용히 지나갔다.') + ' (수입 ' + man(q.inc) + '만원)'; }).join(' · ') + '</p>' : '') + '</div>';
}

function r2Mood(L) {
  var d = L.d || {}, n = L.notes || [];
  if (L.failed || (d.hap || 0) <= -5 || (d.hp || 0) + (d.hap || 0) <= -6 || n.indexOf('burn') >= 0 || n.indexOf('my_fail') >= 0 || n.indexOf('su_fail') >= 0) return 'sad';
  if (L.moved || (d.hap || 0) >= 5 || (d.cr || 0) + (d.hap || 0) >= 8 || n.indexOf('my_win') >= 0 || n.indexOf('su_win') >= 0) return 'happy';
  return 'normal';
}
function drawRoad2(p) {
  var k = p.picks.length - 1, wrap = $('road');
  if (k >= PC.R2_SLOTS.length) return r2Last(p);
  var A = r2At(p, k), S = A.S, sl = A.slot;
  var pL = k > 0 ? A.log.filter(function (l) { return l.k === k - 1 && !l.quiet; })[0] : null, pm = pL ? r2Mood(pL) : 'normal', sea = 'r2st sm sea' + sl.ch;
  var newCh = k === 0 || Math.floor(PC.R2_SLOTS[k - 1][0] / 5) < sl.ch;
  var h = r2Hud(S, sl.y) + r2Path(sl.y) + (k > 0 ? r2Band(p, k) : '') + (newCh ? r2ChBanner(S, sl.ch) : '');
  if (sl.t === 'job') {
    var x = S.x, wcls = function (T) { return T.m >= 10000 ? 13 : T.m >= 3000 ? 11 : 9; };
    var cards = sl.opts.map(function (o, j) {
      if (o.stay) {
        if (!S.c || S.off) return '<button class="offer stay" type="button" data-j="' + j + '">' + icon('house', 3) + '<span class="ol">' + 'ABC'[j] + '</span><span class="ot">' + esc(o.lb) + '</span>' + r2Hint({ hap: 2, cr: -1, m: -2 }) + '</button>';

        var nx = S.freeze > 0 || S.retired ? S.s : S.su ? S.s * 1.03 : S.s * PC.curve(S.c, x) / PC.curve(S.c, x - 1);
        if (RPZ.v6 && !S.su && !S.retired && !(S.freeze > 0)) nx *= 1.03;
        var tag = S.su ? '<span>스타트업</span><span>지분 있음</span>' : S.retired ? '<span>인생 2막</span><span class="goodsig">여유 있는 일</span>'
          : '<span>' + (Math.floor(x / 4) > Math.floor((x - 1) / 4) ? rankName(x) + ' 승진' : '같은 직급') + '</span>' + (S.freeze > 0 ? '<span class="risk">연봉 동결 중</span>' : PC.roadRiskSc(RPZ, S.c) >= .15 ? '<span class="risk">구조조정 걱정</span>' : '<span class="goodsig">익숙한 자리</span>');
        return '<button class="offer stay" type="button" data-j="' + j + '">' + (S.su || S.retired ? r2Bld(S, 3, 'ob') : bld(S.c, 3, null, 'ob')) + '<span class="ol">' + 'ABC'[j] + '</span><span class="ot">' + esc(o.lb) + ' · ' + esc(S.cname) + '</span><span class="om">' + man(nx) + '<small>만원</small></span>' +
          '<span class="sig">' + tag + '</span>' + r2Hint(RPZ.v6 && !S.su && !S.retired ? { hap: 1, hp: 1 } : { hap: 1 }) + '</button>';
      }
      var T = BYN[o.o.n], of = o.of, kind = o.o.kind;
      var ttl = kind === 're' ? '재취업 · 경력 일부 인정' : kind === 'new' ? (T.pub ? '공공기관 신입 공채' : '신입 공채') : kind === 'jr' ? '중고신입 공채 · 경력 일부 인정' : kind === 'up' ? rankName(x + 4) + ' 제안 · 한 직급 위' : rankName(x) + ' 제안 · 같은 직급';
      var hh = kind === 'up' ? { m: 2, cr: 2, hp: -1 } : kind === 'same' ? { m: 1, cr: 1 } : kind === 're' ? { m: 2, cr: 1, hap: 1 } : kind === 'jr' ? { m: 1, cr: 1 } : T.m >= 5000 ? { m: 1 } : T.my >= 8 ? { cr: 1 } : {};
      if (T.rt && T.rt < 3) hh.hp = (hh.hp || 0) - 1; else if (T.rt >= 3.7) hh.hap = (hh.hap || 0) + 1;
      return '<button class="offer" type="button" data-j="' + j + '">' + bld(T, 3, { blind: 1, w: wcls(T) }, 'ob') + '<span class="ol">' + 'ABC'[j] + '</span><span class="ot">' + esc(T.grp) + ' ' + ttl + '</span>' +
        '<span class="om">' + man(of.lo) + '~' + man(of.hi) + '<small>만원</small></span>' + sigHtml(T, of) + r2Hint(hh) + '</button>';
    });
    var q = sl.q || (sl.first ? '첫 직장을 골라요. 세 곳 모두 붙었어요.' : sl.k === 0 ? '큰 회사에 붙었어요. 옮길까요?' : (sl.y + 1) + '년째, 제안이 왔어요.');
    h += '<div class="r2q">' + stage('<div class="pxrow">' + zG(S.g, r2Rank(S.x), pm, 3, pm === 'happy' ? 'jump' : 'idle') + icon('fairy', 4) + '</div>', sea) + '<p class="r2d"><span class="lv">' + (sl.y + 1) + '년째 · 이직 갈림길</span>' + esc(q) + '</p></div>' +
      '<p class="qsub">연봉 범위는 협상에 따라 달라져요. 회사 이름은 고른 뒤에 공개해요.' + (S.hunt ? ' <b>미리 준비해 둔 덕에 협상이 유리해요.</b>' : '') + '</p><div class="offers">' + cards.join('') + '</div>';
  } else {
    h += '<div class="r2q">' + stage('<div class="pxrow">' + zG(S.g, r2Rank(S.x), pm, 3, pm === 'happy' ? 'jump' : 'idle') + icon(sl.t === 'life' ? 'heart' : 'sign', 4) + '</div>', sea) +
      '<p class="r2d"><span class="lv">' + (sl.y + 1) + '년째 · ' + (sl.t === 'life' ? '나의 삶' : '회사 일') + '</span>' + esc(sl.q) + '</p></div>' +
      '<div class="r2opts">' + sl.opts.map(function (o, j) { return '<button class="r2o" type="button" data-j="' + j + '"><b>' + esc(o.lb) + '</b>' + r2Hint(o.h) + '</button>'; }).join('') + '</div>';
  }
  wrap.innerHTML = '<div class="r2wrap">' + h + '</div>';
  if (k > 0 && RREV) { var bd = wrap.querySelector('.r2band'); sfx(bd && bd.classList.contains('sad') ? 'wrong' : bd && bd.classList.contains('happy') ? 'combo' : 'coin'); RREV = false; }
  wrap.querySelectorAll('[data-j]').forEach(function (b) { b.onclick = function () {
    wrap.querySelectorAll('[data-j]').forEach(function (z) { z.disabled = true; });
    p.picks.push(+b.dataset.j); r2Save(p); RREV = true; drawRoad2(p); window.scrollTo(0, 0);
  }; });
}

function r2Last(p) {
  var k = PC.R2_SLOTS.length, A = r2At(p, k);
  $('road').innerHTML = '<div class="r2wrap">' + r2Hud(A.S, 19) + r2Path(20) + r2Band(p, k) +
    '<div class="row" style="justify-content:flex-start;margin-top:14px"><button class="btn" id="r2Nx" type="button">20년 결과 보기</button></div></div>';
  if (RREV) { sfx('coin'); RREV = false; }
  $('r2Nx').onclick = function () { $('r2Nx').disabled = true; finishRoad2(p); window.scrollTo(0, 0); }; $('r2Nx').focus({ preventScroll: true });
}

function r2Note(n, L, S) {
  return { su_win: '<b class="evg">동료의 스타트업이 큰 회사에 인수됐다.</b> 지분이 현금이 됐다.', su_ok: '스타트업은 아직 버티고 있다. 결판은 조금 더 뒤로.', su_fail: '<b class="ev">스타트업이 문을 닫았다.</b> ' + esc(L.co) + '에 다시 들어갔다.',
    my_win: '<b class="evg">\'' + esc(S.suItem || '내 회사') + '\'가 큰 회사에 인수됐다!</b> 대표 지분이 현금이 됐다.', my_ok: '\'' + esc(S.suItem || '내 회사') + '\'는 흑자를 냈다. 대표 월급도 예전만큼 나온다.',
    my_fail: '<b class="ev">\'' + esc(S.suItem || '내 회사') + '\'가 문을 닫았다.</b> 폐업 신고를 하고 ' + esc(L.co) + '에 들어갔다.',
    rest: '<b class="ev">번아웃으로 쉬어 간 해.</b> 수입이 절반으로 줄었다.', burn: '<b class="ev">몸이 버티지 못했다.</b> 다음 해는 쉬어야 한다.', freeze: '연봉 동결.', jump: '<b class="evg">성과급 큰 해.</b>',
    stock: '<b class="evg">스톡옵션이 터졌다.</b>', gap: '회사 밖에서 보낸 해.', re_auto: esc(L.co) + '에 다시 출근했다. 공백은 있었지만 몸이 기억하고 있었다.' }[n] || '';
}
function r2JobTxt(L) {
  if (L.failed) return '<b class="ev">최종 면접에서 떨어졌다.</b> 지금 자리에 남았다.';
  if (L.moved) return L.kind === 're' ? '<b class="evg">' + esc(L.co) + '에 다시 출근했다.</b> 첫해 연봉 ' + man(L.s) + '만원.' : L.kind === 'new' ? '<b class="evg">' + esc(L.co) + ' 입사.</b> 첫 연봉 ' + man(L.s) + '만원.'
    : '<b class="evg">' + esc(L.co) + r2Ro(L.co) + ' 옮겼다.</b> 협상 끝에 첫해 연봉 ' + man(L.s) + '만원.';
  if (L.txt === 'more') return '1년 더 아이 곁에 있기로 했다.';
  return '남기로 했다. 올해 연봉 ' + man(L.s) + '만원.';
}
function finishRoad2(p) {
  var S = PC.scoreRoad(RPZ, p.picks, ctx);
  if (R2PR) { store.setJ('slp-r2pr', null); return resultRoad2({ picks: S.picks, pr: 1 }, true); }
  $('road').innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('road', S.picks, S, { picks: S.picks }).then(function (x) { if (x.sent && x.rank <= Math.max(1, Math.floor(x.total / 100))) award('road'); resultRoad2(x, true); sfx('fanfare'); });
}
function roadChart2(a, b) {
  var n = a.length, nar = window.innerWidth < 560, W = nar ? 380 : 640, H = nar ? 240 : 260, L = 46, Rr = 16, T = 14, B = 28, all = a.concat(b || [], [10000, 0]), mx = Math.max.apply(null, all), mn = Math.min.apply(null, all);
  var step = mx - mn > 16000 ? 4000 : 2000, y0 = Math.floor(mn / step) * step, y1 = Math.ceil(mx / step) * step;
  var X = function (t) { return L + (W - L - Rr) * t / (n - 1); }, Y = function (v) { return T + (H - T - B) * (1 - (v - y0) / (y1 - y0)); };
  var g = '', pth = function (arr) { return arr.map(function (v, t) { return (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(''); };
  for (var v = y0; v <= y1; v += step) g += '<line class="ax" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="tx" x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v >= 10000 ? (v / 10000).toFixed(v % 10000 ? 1 : 0) + '억' : man(v) + '만') + '</text>';
  for (var t = 0; t < n; t++) g += '<text class="tx" x="' + X(t) + '" y="' + (H - 8) + '" text-anchor="middle">' + (t % 5 === 0 || t === n - 1 ? (t + 1) + '년' : '') + '</text>';
  g += '<line class="eok" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(10000) + '" y2="' + Y(10000) + '"/>';
  if (b) g += '<path class="bst" d="' + pth(b) + '"/>';
  g += '<path class="me" d="' + pth(a) + '"/>';
  return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="20년 연도별 수입: 내 길' + (b ? '과 오늘 1위의 길' : '') + '">' + g + '</svg><div class="leg"><span><i></i>내 길</span>' + (b ? '<span><i class="b"></i>오늘 1위의 길</span>' : '') + '<span>점선: 1억</span></div></div>';
}
function r2Story(R) {
  return '<ol class="r2tl">' + R.log.filter(function (l) { return !l.quiet; }).map(function (l) {
    return '<li><b>' + (l.y + 1) + '년째</b> ' + (l.t === 'job' ? (l.failed ? '이직 실패' : l.moved ? esc(l.co) + (l.kind === 'new' ? ' 입사' : l.kind === 're' ? ' 재취업' : r2Ro(l.co) + ' 이직') : l.txt === 'more' ? '1년 더 쉬기' : '남기') : esc(l.lb)) + ' <small>' + man(l.inc) + '만원</small></li>';
  }).join('') + '</ol>';
}
function r2Zorro(R) {
  var S = R.S, out = [];
  if (S.burn) out.push('번아웃으로 멈춘 해가 있었어요. 체력은 다른 걸 다 받쳐 주는 바닥이에요.');
  if (S.off) out.push('아이 곁에서 보낸 시간이 있었어요. 공백보다 그 시간을 어떻게 설명하는지가 다시 일할 때 더 중요해요.');
  else if (S.back) out.push('공백 뒤에 다시 일을 시작했어요. 실제로도 복귀 첫 1년이 가장 어렵고, 그다음은 빨라요.');
  if (S.moves >= 4) out.push('네 번 이상 옮겼어요. 몸값은 오르지만 서류 심사에선 \'잦은 이직\'으로 읽힐 수 있어요.');
  else if (!S.moves) out.push('한 곳에서 오래 있었어요. 안정은 좋지만, 대리 때 한 번은 시장 가격을 확인해 볼 만했어요.');
  if (S.cr >= 85 && S.hap < 40) out.push('커리어는 높이 올렸는데 행복은 많이 내려갔어요. 다음 판엔 개인사 쪽 선택도 한번 바꿔 보세요.');
  if (S.hap >= 80 && S.cr < 50) out.push('행복은 꽉 채웠어요. 커리어는 조금 아쉬워요. 둘 다 잡는 길도 있어요.');
  if (out.length < 2) out.push('20년 수입 ' + eokS(R.total) + '. 연봉은 점수의 절반 정도예요. 나머지는 몸과 일과 사람이 채워요.');
  return out.slice(0, 2).join(' ');
}

function r2Regret(R) {
  var base = R.score, best = null, picks = R.picks;
  for (var k = 0; k < PC.R2_SLOTS.length; k++) {
    var A = PC.simRoad2(RPZ, ctx, picks.slice(0, k + 1), k), sl = A.slot;
    if (!sl) continue;
    for (var j = 0; j < sl.opts.length; j++) {
      if (j === picks[k + 1]) continue;
      var q = picks.slice(); q[k + 1] = j;
      var sc = PC.simRoad2(RPZ, ctx, q).score;
      if (sc - base > 0 && (!best || sc - base > best.d)) { var o = sl.opts[j]; best = { d: sc - base, y: sl.y, lb: o.stay ? o.lb : o.job ? (BYN[o.o.n] ? BYN[o.o.n].grp + ' 제안' : '다른 제안') : o.lb }; }
    }
  }
  return best;
}
function resultRoad2(x, fresh) {
  var pr = !!x.pr, R = PC.simRoad2(RPZ, ctx, x.picks || x.ans), S = R.S, EN = PC.roadEnding2(RPZ, ctx, R.picks), T = END_TXT[EN.id], B = endBook(), isNew = !B[EN.id];
  if (EN.id === 'startup' && S.suItem) T = [T[0], '내가 차린 「' + S.suItem + '」가 큰 회사에 인수됐어요. 대표로 버틴 시간이 지분으로 돌아왔어요.', T[2], T[3]];
  if (isNew) { B[EN.id] = TODAY; store.setJ('slp-endings', B); }
  if (fresh || !pr) r2Track(R);
  var rk = S.exec ? 4 : r2Rank(S.x - 1);
  var fin = S.su || S.retired ? null : S.c, scn = PC.ROAD_SC[RPZ.sc || 'new'], sex = S.g ? '남' : '여', W = PC.R2_W;
  var parts = [['연봉', Math.round(R.total / 10000 * W.money), '20년 수입 ' + eokS(R.total)], ['체력', Math.round(S.hp * W.hp), '마지막 ' + Math.round(S.hp)], ['커리어', Math.round(S.cr * W.cr), '마지막 ' + Math.round(S.cr)], ['행복', Math.round(S.hap * W.hap), '마지막 ' + Math.round(S.hap)]];
  var path = R.log.filter(function (l) { return !l.quiet; }).map(function (l) { return l.t === 'job' ? (l.failed ? '💥' : l.moved ? '🚀' : '🏠') : l.t === 'life' ? '💛' : '💼'; }).join('');
  var rg = r2Regret(R), rgTxt = rg ? (rg.y + 1) + '년째에 「' + rg.lb + '」' + r2Eul(rg.lb) + ' 골랐다면 +' + man(rg.d) + '점' : '';
  var text = '연봉 놀이터 · 커리어 로드 20년 ' + mmdd(TODAY) + ' (' + scn + ' · ' + sex + ')\n' + path + '\n엔딩: ' + EN.lb + '\n종합 ' + man(R.score) + '점 · 20년 수입 ' + eokS(R.total) + '\n' + SITE_S;
  var scene = '<div class="ending">' + stage('<div class="pxrow">' + zG(S.g, rk, T[2], 4, T[2] === 'happy' ? 'jump' : 'idle') + icon(T[0], 5, 'evi') + (fin ? bld(fin, bS(true), null, 'grow') : S.su ? icon('rocket', 5) : '') + '</div>' + (T[2] === 'happy' ? confetti() : ''), '', '엔딩: ' + EN.lb) +
    '<span class="lv">ENDING · ' + esc(scn) + ' · ' + sex + (pr ? ' · 연습' : '') + (isNew ? ' · NEW!' : '') + '</span><div class="endnm"><b>' + esc(EN.lb) + '</b></div><p>' + T[1] + '</p></div>';
  var prBtns = '<div class="row"><button class="btn ghost" id="r2PrSame" type="button">같은 판 다시 (연습)</button><button class="btn ghost" id="r2PrRand" type="button">무작위 판 (연습)</button>' + (pr ? '<button class="btn ghost" id="r2PrBack" type="button">오늘 결과로</button>' : '') + '</div>';
  $('road').innerHTML = '<div class="over"><span class="lv">' + (pr ? '연습 판 · 순위 없음' : '커리어 로드 20년 · ' + mmdd(TODAY)) + '</span>' + scene + (pr ? '' : vsScene('road', x)) + '<div class="big" style="font-size:clamp(44px,8vw,90px)">' + man(R.score) + '<small style="font-size:.4em">점</small></div>' +
    '<div class="r2sum">' + parts.map(function (a) { return '<div><span class="l">' + a[0] + '</span><b>' + man(a[1]) + '</b><small>' + a[2] + '</small></div>'; }).join('') + '</div>' +
    '<p>' + path + '</p>' + (rgTxt ? '<p class="r2rg">가장 아까운 선택 · <b>' + esc(rgTxt) + '</b> <small>(나머지는 같은 번호로 골랐을 때)</small></p>' : '<p class="r2rg">가장 아까운 선택 · <b>없어요. 한 칸만 바꿔서는 더 오르지 않는 길이에요.</b></p>') +
    (pr ? '' : rankBox('road', x)) +
    '<div class="zorro"><div class="who"><i></i>조로의 한마디</div><p>' + esc(r2Zorro(R)) + '</p></div>' +
    gotBox('road') + (pr ? prBtns : shareBox('shR', vsBox('road', x)) + nextBtn('road') + prBtns + week7('road')) +
    '<details class="more" open><summary>20년 이야기 · 고른 길</summary>' + r2Story(R).replace('class="r2tl"', 'class="r2tl" style="width:100%;text-align:left"') + '</details>' +
    '<details class="more"><summary>20년 수입 그래프</summary><div id="rChart" style="width:100%">' + roadChart2(R.years, null) + '</div></details>' +
    '<details class="more"><summary>엔딩 도감 · ' + PC.ENDINGS.filter(function (e) { return endBook()[e[0]]; }).length + ' / ' + PC.ENDINGS.length + '</summary>' + endDogam(EN.id) + '</details>' +
    (pr ? '' : '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbR"></div></details><div class="row">' + againBtn('road', function () { RREV = false; renderRoad(); }) + '</div>') + '</div>';
  if (fresh && isNew) toast('새 엔딩을 모았어요: ' + EN.lb);
  $('r2PrSame').onclick = function () { r2Practice(R2PR ? R2PR.d : TODAY); };
  $('r2PrRand').onclick = function () { r2Practice(r2RandDay()); };
  if ($('r2PrBack')) $('r2PrBack').onclick = r2Daily;
  if (pr) return;
  wireShare('shR', text, { title: '커리어 로드 20년 · ' + scn, big: man(R.score) + '점', sub: '엔딩: ' + EN.lb + '\n20년 수입 ' + eokS(R.total) + ' · ' + mmdd(TODAY), lines: [path],
    px: { mood: T[2], rk: rk, co: fin, icon: T[0] } });
  getTop('road').then(function (t) {
    fillNb('road', t);
    if (!t) return;
    var b = t.stat.best;
    if (b && b.picks && b.picks.length >= PC.R2_N) { var B2 = PC.simRoad2(RPZ, ctx, b.picks); $('rChart').innerHTML = roadChart2(R.years, B2.years) + '<p class="src">오늘 1위 ' + esc(b.nick) + ' (' + (B2.S.g ? '남' : '여') + '): 종합 ' + man(B2.score) + '점 · 엔딩 ' + esc(PC.roadEnding2(RPZ, ctx, b.picks).lb) + mockTag() + '</p>'; }
    else if (b && b.hid) $('rChart').insertAdjacentHTML('beforeend', '<p class="src">오늘 1위의 길은 점수를 낸 뒤에 보여요.</p>');
    var el = $('lbR'); if (el) el.innerHTML = lbAll(t, 'road') + '<p class="src"><a href="#hall">순위 · 명예의 전당 전체 보기 →</a></p>';
  });
}

