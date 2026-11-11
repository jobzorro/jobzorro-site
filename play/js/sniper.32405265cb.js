'use strict';


var SPZ = null;
function snEmo(p) { return p >= 90 ? '🎯' : p >= 60 ? '🟩' : p >= 30 ? '🟨' : '🟥'; }




var SNLO = PC.SN_LO, SNHI = PC.SN_HI, SNRG = null;
function snRange(ri) {
  if (!SNRG) SNRG = [0, 1, 2, 3, 4].map(function (r) {
    var v = ctx.H.filter(function (c) { return c.tier < 2; }).map(function (c) { return c.rk[r]; }).filter(function (x) { return x < PC.SN_HI - 500 && x > PC.SN_LO + 300; }).sort(function (a, b) { return a - b; });
    return [PC.SN_LO, Math.min(PC.SN_HI, Math.ceil(v[v.length - 1] * 1.1 / 1000) * 1000), Math.round(v[v.length >> 1] / 500) * 500];
  });
  return SNRG[ri];
}


var SN_T = PC.v6(TODAY) ? 30 : 0, SNTM = 0;
function snSave(p) { if (!p.prac) setProg('sniper', p); }
function snPracStart() { clearInterval(SNTM); SPRAC = { pz: PC.genSniper(TODAY + '|' + Date.now(), ctx), v: [], prac: 1 }; SPZ = SPRAC.pz; SST = null; sfx('jump'); drawSniper(SPRAC); window.scrollTo(0, 0); }
function snPracEnd() { clearInterval(SNTM); SPRAC = null; SPZ = PC.genSniper(TODAY, ctx); SST = null; renderSniper(); }
function pctX(v) { return (v - SNLO) / (SNHI - SNLO) * 100; }




var SCP = null, SC_PAD = 16;
function scopeHtml() { return PX.ok ? '<div class="scope" id="snScope"><canvas id="snScC" aria-hidden="true"></canvas></div>' : ''; }
function scX(v, W) { return SC_PAD + (W - 2 * SC_PAD) * Math.max(0, Math.min(1, (v - SNLO) / (SNHI - SNLO))); }

function snWind(i) { return PC.hash32((SPZ && SPZ.day || TODAY) + '|snw|' + i) % 7 - 3; }
function scopeStart(cur, done, truth, set, wind) {
  if (SCP) cancelAnimationFrame(SCP.raf);
  var cv = $('snScC'); if (!cv) { SCP = null; return; }
  var cs = getComputedStyle(cv), g = function (k) { return cs.getPropertyValue(k).trim(); };
  SCP = { cv: cv, v: cur, done: done, truth: truth, lx: null, wind: wind || 0, t0: performance.now(), last: performance.now(), raf: 0,
    col: { ink: g('--ink'), sky: g('--px-sky'), sky2: g('--px-sky2'), red: g('--truth'), acc: g('--acc') }, font: g('--display') || 'sans-serif' };
  if (!done && set) {
    var drag = function (e) { var r = cv.getBoundingClientRect(), f = (e.clientX - r.left - SC_PAD) / (r.width - 2 * SC_PAD); set(SNLO + Math.max(0, Math.min(1, f)) * (SNHI - SNLO)); };
    cv.addEventListener('pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv._dn = 1; drag(e); });
    cv.addEventListener('pointermove', function (e) { if (cv._dn) drag(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { cv._dn = 0; }); });
  }
  SCP.raf = requestAnimationFrame(scopeDraw);
}
function scopeDraw(now) {
  var S = SCP; if (!S || !S.cv.isConnected) { SCP = null; return; }
  S.raf = requestAnimationFrame(scopeDraw);
  var cv = S.cv, W = cv.clientWidth, H = cv.clientHeight; if (!W || H < 30 || document.hidden) return;
  var dpr = Math.min(3, window.devicePixelRatio || 1), dt = Math.max(0, Math.min(.05, (now - S.last) / 1000)), t = Math.max(0, (now - S.t0) / 1000), C = S.col; S.last = now;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  var base = (W - 2 * SC_PAD) / (SNHI - SNLO), gy = Math.round(H * .7);

  var slide = S.done ? Math.max(0, Math.min(1, (t - .6) / .7)) : 0, ez = slide * slide * (3 - 2 * slide);
  var aim = S.done ? S.v + (S.truth - S.v) * ez : S.v;
  var tx = scX(aim, W); S.lx = S.lx == null ? tx : S.lx + (tx - S.lx) * Math.min(1, dt * 16);
  if (S.done && t > 2) { cancelAnimationFrame(S.raf); S.lx = tx; }

  var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, C.sky); bg.addColorStop(1, C.sky2); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  var every = base * 1000 >= 30 ? 1000 : base * 1000 >= 15 ? 2000 : 5000;
  c.fillStyle = C.ink; c.font = '700 9px ' + S.font; c.textAlign = 'center';
  for (var v = Math.ceil(SNLO / 100) * 100; v <= SNHI; v += 100) {
    var x = Math.round(SC_PAD + (v - SNLO) * base) + .5, big = v % 1000 === 0;
    if (!big && base * 100 < 2.2) continue;
    c.globalAlpha = big ? .75 : .3; c.fillRect(x - .5, gy - (big ? 9 : 4), 1, big ? 9 : 4);
    if (big && v % every === 0) { c.globalAlpha = .7; c.fillText(man(v), x, gy + 11); }
  }
  c.globalAlpha = .55; c.fillRect(SC_PAD, gy, W - 2 * SC_PAD, 1); c.globalAlpha = 1;
  if (S.done) { scTarget(c, scX(S.truth, W), gy - 4, 5, C); scHole(c, scX(S.v, W), gy - 4, 4.5, C, t); }

  var r = Math.min(H / 2 - 3, 54), sway = S.done || REDUCE ? 0 : 1, fire = S.done ? Math.max(0, 1 - t / .28) : 0;
  var wa = 1 + Math.abs(S.wind) * .45, cx = S.lx + sway * (Math.sin(t * 1.1) * 1.4 * wa + S.wind * 1.6 * (1 + .4 * Math.sin(t * .7))), cy = H / 2 + sway * Math.sin(t * 1.7) * 1.6 * wa - fire * 7;

  var wl = cx < W / 2; c.font = '700 9px ' + S.font; c.fillStyle = C.ink; c.globalAlpha = .75; c.textAlign = wl ? 'right' : 'left';
  c.fillText((S.wind ? '흔들림 ' + (S.wind < 0 ? '←' : '→') + Math.abs(S.wind) : '흔들림 없음') + ' · 점수엔 영향 없음', wl ? W - 8 : 8, 12); c.globalAlpha = 1; c.textAlign = 'center';
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  var lg = c.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r); lg.addColorStop(0, C.sky2); lg.addColorStop(1, C.sky); c.fillStyle = lg; c.fillRect(cx - r, cy - r, r * 2, r * 2);

  var zs = 46 / 500, v0 = aim - r / zs, v1 = aim + r / zs;
  c.fillStyle = C.ink; c.textAlign = 'center';
  for (var w = Math.ceil(v0 / 50) * 50; w <= v1; w += 50) {
    if (w < SNLO || w > SNHI) continue;
    var lx = cx + (w - aim) * zs, k = w % 500 === 0 ? 2 : w % 100 === 0 ? 1 : 0, th = [3, 6, 11][k];
    c.globalAlpha = [.3, .55, .9][k]; c.fillRect(Math.round(lx) - (k > 1 ? 1 : .5), cy - th / 2, k > 1 ? 2 : 1, th);
    if (k > 1 && Math.abs(lx - cx) < r - 24) { c.globalAlpha = w % 1000 === 0 ? 1 : .7; c.font = (w % 1000 === 0 ? '900 13px ' : '700 11px ') + S.font; c.fillText(man(w), lx, cy + 22); }
  }
  c.globalAlpha = 1;
  if (S.done) { scTarget(c, cx + (S.truth - aim) * zs, cy, 10, C); scHole(c, cx + (S.v - aim) * zs, cy, 10, C, t); }
  var rd = S.done && ez > .98 ? '✓ ' + man(S.truth) : man(Math.round(aim / 10) * 10);
  c.font = '900 12px ' + S.font; var rw = c.measureText(rd).width + 12;
  c.fillStyle = S.done && ez > .98 ? C.red : C.ink; c.globalAlpha = .9; scPill(c, cx - rw / 2, cy - r * .5 - 9, rw, 17); c.globalAlpha = 1;
  c.fillStyle = '#fff'; c.fillText(rd, cx, cy - r * .5 + 4); c.textAlign = 'left';

  c.fillStyle = C.ink; c.globalAlpha = .85;
  c.fillRect(cx - .75, cy - r * .5 + 9, 1.5, r * .5 - 17); c.fillRect(cx - .75, cy - r, 1.5, r * .5 - 10); c.fillRect(cx - .75, cy + 8, 1.5, 6); c.fillRect(cx - .75, cy + 27, 1.5, r - 27);
  c.fillRect(cx - r, cy - 2, 10, 4); c.fillRect(cx + r - 10, cy - 2, 10, 4); c.fillRect(cx - 2, cy + r - 9, 4, 9);
  c.globalAlpha = 1; c.fillStyle = C.red; c.beginPath(); c.arc(cx, cy, 2, 0, Math.PI * 2); c.fill();

  var vg = c.createRadialGradient(cx, cy, r * .55, cx, cy, r); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.32)'); c.fillStyle = vg; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (fire > 0) { c.fillStyle = 'rgba(255,250,220,' + (fire * .9) + ')'; c.fillRect(cx - r, cy - r, r * 2, r * 2); }
  c.restore();
  c.lineWidth = 4; c.strokeStyle = C.ink; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(cx, cy, r - 5, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  c.lineWidth = 1; c.strokeStyle = C.acc; c.beginPath(); c.arc(cx, cy, r + 2.5, 0, Math.PI * 2); c.stroke();
}
function scPill(c, x, y, w, h) { c.beginPath(); c.moveTo(x + h / 2, y); c.lineTo(x + w - h / 2, y); c.arc(x + w - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2); c.lineTo(x + h / 2, y + h); c.arc(x + h / 2, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5); c.fill(); }
function scTarget(c, x, y, s, C) { [[s, C.red], [s * .66, '#fff'], [s * .33, C.red]].forEach(function (a) { c.fillStyle = a[1]; c.beginPath(); c.arc(x, y, a[0], 0, Math.PI * 2); c.fill(); }); }
function scHole(c, x, y, s, C, age) {
  var a = age == null ? 9 : age, L = [1.9, 2.6, 1.6, 2.9, 2.1, 2.4, 1.7, 2.7];
  if (a < .45) {
    var q = a / .45; c.strokeStyle = 'rgba(255,207,61,' + (1 - q) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, s * (1 + q * 2.4), 0, Math.PI * 2); c.stroke();
    c.fillStyle = C.ink; for (var k = 0; k < 7; k++) { var an = k * .9 + .4; c.globalAlpha = 1 - q; c.fillRect(x + Math.cos(an) * s * (1.2 + q * 3), y + Math.sin(an) * s * (1.2 + q * 3) + q * q * s * 2, 2, 2); }
    c.globalAlpha = 1;
  }
  c.strokeStyle = C.ink; c.lineWidth = Math.max(1, s / 5); c.beginPath();
  for (var b = 0; b < 8; b++) { var an2 = b * .785 + .2, r1 = s * .8, r2 = s * L[b], mid = (r1 + r2) / 2;
    c.moveTo(x + Math.cos(an2) * r1, y + Math.sin(an2) * r1); c.lineTo(x + Math.cos(an2 + .12) * mid, y + Math.sin(an2 + .12) * mid); c.lineTo(x + Math.cos(an2 - .05) * r2, y + Math.sin(an2 - .05) * r2); }
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(x, y, s * 1.25, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d8d4c8'; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
  c.fillStyle = C.ink; c.beginPath(); c.arc(x + s * .08, y + s * .08, s * .72, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x - s * .3, y - s * .3, s * .18, 0, Math.PI * 2); c.fill();
}

function snBld(c, q, done) {
  if (!PX.ok) return '';
  return '<div class="snb" aria-hidden="true">' + bld(c, 3, done ? null : { blind: 1 }, done ? (q.tw ? 'morph' : 'grow') : '') + (done && q.tw ? '<span class="pxcombo c2 burst">반전 회사!</span>' : '') + '</div>';
}
function renderSniper() {
  if (SPRAC) return drawSniper(SPRAC);
  SPZ = SPZ || PC.genSniper(TODAY, ctx);
  var x = rec(TODAY, 'sniper'), p = prog('sniper');
  if (x) return resultSniper(x);
  if (!p) {
    var best = +(store.get('slp-sn-best') || 0);
    $('sniper').innerHTML = '<div class="intro"><h3>오늘의 스나이퍼 · ' + mmdd(TODAY) + '</h3>' +
      '<p class="sum">회사와 직급을 보고 막대를 밀어 연봉을 찍어요. 모두 같은 5문제예요.<br>오차 3% 이내면 100점, 멀어질수록 점수가 줄어요.' + (SN_T ? ' 문제마다 <b>' + SN_T + '초</b>!' : '') + '</p>' +
      '<button class="btn big" id="sGo" type="button">시작하기 ▶</button><details class="rules"><summary>규칙 보기</summary><ul>' +
      '<li>회사 로고와 직급이 나오면 막대를 밀어 그 직급 연봉(기본급 + 일반 성과급, 만원)을 찍어요.</li>' +
      '<li>오차 3% 이내 100점, 그 뒤로 1%마다 4점씩 깎여 약 28%부터 0점. 5문제 합계 최대 500점.</li>' +
      (SN_T ? '<li>문제마다 ' + SN_T + '초. 시간이 다 되면 막대가 있는 자리로 자동 발사돼요. 빨리 쏜다고 점수가 더 붙지는 않아요.</li>' : '') +
      '<li>5문제 중 1문제는 이름보다 연봉이 훨씬 높거나 낮은 \'반전 회사\'예요.</li></ul></details>' +
      '<p class="src">연습 판은 순위 없이 몇 번이든 돼요' + (best ? ' · 연습 최고 ' + best + '점' : '') + '. <button class="btn ghost sm" type="button" id="sPrac">연습 한 판 ▶</button></p></div>';
    $('sGo').onclick = function () { $('sGo').disabled = true; startDaily('sniper').then(function (st) { setProg('sniper', { tok: st.tok, t0: st.t0, v: [] }); SST = null; renderSniper(); }); };
    $('sPrac').onclick = snPracStart;
    return;
  }
  if (!Array.isArray(p.v)) { p.v = []; setProg('sniper', p); }
  drawSniper(p);
}
function drawSniper(p) {
  clearInterval(SNTM);
  if (!SST && p.sh != null && p.sh === p.v.length - 1) SST = { i: p.sh, v: p.v[p.sh], done: true };
  var i = SST && SST.done ? SST.i : p.v.length;
  if (i >= PC.SNIPER_N) return finishSniper(p);
  var q = SPZ.qs[i], c = BYN[q.n], done = SST && SST.done && SST.i === i, truth = c.rk[q.ri];
  var rg = snRange(q.ri); SNLO = rg[0]; SNHI = rg[1];
  var cur = done ? p.v[i] : (SST && SST.i === i ? SST.v : rg[2]);
  var sc = PC.scoreSniper(SPZ, p.v, ctx);
  var h = (p.prac ? '<p class="t3prac">연습 판 · 순위 없음 <button class="btn ghost sm" type="button" id="sPracX">그만하기</button></p>' : '') +
    '<div class="gbar"><span class="lv">' + (i + 1) + ' / 5 문제</span><span class="stat">' + (SN_T && !done ? '<span>⏱ <b class="sntime" id="snT">' + SN_T + '초</b></span>' : '') + '<span>점수 <b>' + sc.score + '</b></span></span></div>' +
    '<div class="snq"><div class="who">' + logo(c, 'l') + '<span class="nm">' + esc(c.n) + bossMark(c) + '</span><span class="rk">' + RK[q.ri] + '</span></div>' + snBld(c, q, done) +
    '<p class="qsub" style="margin:0">' + esc(c.grp) + ' · 직원 ' + man(c.m) + '명' + (c.sido ? ' · ' + esc(c.sido) : '') + '<span class="qq"> — ' + RK[q.ri] + ' 연봉은 얼마일까요?</span></p>' +
    '<div class="snv" aria-live="polite"><span id="snV">' + man(cur) + '</span><small>만원</small></div>' +
    scopeHtml() + '<div class="sntrack">' + (done ? '<span class="truth" style="left:' + pctX(truth) + '%"><span>정답 ' + man(truth) + '</span></span>' : '') +
    '<input type="range" id="snR" min="' + SNLO + '" max="' + SNHI + '" step="' + PC.SN_STEP + '" value="' + cur + '" aria-label="' + RK[q.ri] + ' 연봉 (만원)"' + (done ? ' disabled' : '') + '></div>' +
    '<div class="snax"><span>' + man(SNLO) + '</span><span>' + man((SNLO + SNHI) / 2) + '</span><span>' + man(SNHI) + '</span></div>';
  if (done) {
    var e = PC.sniperErr(truth, p.v[i]), pts = PC.sniperPts(e);
    var hsn = 0; for (var hj = i; hj >= 0 && Math.abs(PC.sniperErr(BYN[SPZ.qs[hj].n].rk[SPZ.qs[hj].ri], p.v[hj])) <= 3; hj--) hsn++;
    if (hsn >= 2) award('dhs');
    h += '<div class="res">' + (hsn && PX.ok ? '<span class="hs">' + ['', '', 'DOUBLE ', 'TRIPLE ', 'QUADRA ', 'PENTA '][Math.min(5, hsn)] + 'HEADSHOT!</span>' : '') + '<p class="msg"><b class="' + (pts >= 60 ? 'ok' : 'no') + '">' + pts + '점</b> 정답 ' + man(truth) + '만원 · 오차 ' + (e > 0 ? '+' : '') + e + '%' +
      (q.tw ? ' · <b>반전 회사</b>였어요. ' + esc(c.grp) + ' 과장 중간값보다 ' + (c.twist > 1 ? Math.round((c.twist - 1) * 100) + '% 많이' : Math.round((1 - c.twist) * 100) + '% 적게') + ' 받아요.' : '') + '</p>' +
      '<button class="btn" id="sNx" type="button">' + (i + 1 < PC.SNIPER_N ? '다음 문제' : '결과 보기') + '</button></div>';
  } else h += '<div class="row snrow" style="justify-content:flex-start"><button class="btn ghost sm" type="button" data-d="-500">−500</button><button class="btn ghost sm" type="button" data-d="-50">−50</button><button class="btn ghost sm" type="button" data-d="50">+50</button><button class="btn ghost sm" type="button" data-d="500">+500</button><button class="btn" id="sShot" type="button">이 값으로 쏘기</button></div>';
  $('sniper').innerHTML = h + '</div>';
  if ($('sPracX')) $('sPracX').onclick = snPracEnd;
  if (done) { scopeStart(p.v[i], true, truth, null, snWind(i)); $('sNx').onclick = function () { SST = null; delete p.sh; snSave(p); drawSniper(p); }; $('sNx').focus({ preventScroll: true }); return; }
  SST = { i: i, v: cur, done: false };
  var set = function (v) {
    v = Math.min(SNHI, PC.sniperVal(v)); var was = SST.v; SST.v = v; $('snR').value = v; $('snV').textContent = man(v); if (SCP) SCP.v = v;
    if (Math.floor(was / 1000) !== Math.floor(v / 1000)) try { if (navigator.vibrate && !REDUCE) navigator.vibrate(4); } catch (e) {}
  };
  $('snR').oninput = function () { set(this.value); };
  scopeStart(cur, false, truth, set, snWind(i));

  document.querySelectorAll('#sniper [data-d]').forEach(function (b) {
    var tm = 0, iv = 0, held = 0, stop = function () { clearTimeout(tm); clearInterval(iv); tm = iv = 0; };
    b.onclick = function () { if (held) { held = 0; return; } set(SST.v + +b.dataset.d); };
    b.addEventListener('pointerdown', function () { stop(); held = 0; tm = setTimeout(function () { held = 1; iv = setInterval(function () { set(SST.v + +b.dataset.d); }, 70); }, 400); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { b.addEventListener(n, stop); });
  });
  var shoot = function () {
    if (!SST || SST.done || SST.i !== i) return;
    clearInterval(SNTM); p.v[i] = SST.v; p.sh = i; delete p.qt0; snSave(p); SST.done = true; drawSniper(p);
    var q2 = document.querySelector('#sniper .snq'); if (q2 && !REDUCE) { q2.classList.remove('snkick'); void q2.offsetWidth; q2.classList.add('snkick'); }
    try { if (navigator.vibrate && !REDUCE) navigator.vibrate(25); } catch (e) {}
    var e = PC.sniperErr(truth, p.v[i]); sfx(Math.abs(e) <= 3 ? 'combo' : PC.sniperPts(e) >= 60 ? 'coin' : 'wrong');
  };
  $('sShot').onclick = shoot;
  if (SN_T) {
    if (p.qi !== i || !p.qt0) { p.qi = i; p.qt0 = Date.now(); snSave(p); }
    var tick = function () {
      var el = $('snT'), left = SN_T - (Date.now() - p.qt0) / 1000;
      if (!el || !el.isConnected) { clearInterval(SNTM); return; }
      if (left <= 0) { el.textContent = '0초'; toast('시간 끝! 지금 자리로 쐈어요.'); shoot(); return; }
      el.textContent = Math.ceil(left) + '초'; el.classList.toggle('low', left <= 5);
    };
    tick(); SNTM = setInterval(tick, 250);
  }
}
function finishSniper(p) {
  clearInterval(SNTM);
  if (p.prac) return snPracResult(p);
  var S = PC.scoreSniper(SPZ, p.v, ctx);
  $('sniper').innerHTML = '<p class="src">점수를 보내는 중이에요…</p>';
  submitDaily('sniper', p.v, S, { per: S.per, errs: S.errs }).then(function (x) { if (x.score >= 450) award('sniper'); checkPerfect(TODAY); resultSniper(x); });
}
function resultSniper(x) {
  var S = PC.scoreSniper(SPZ, x.ans, ctx), emo = S.per.map(snEmo).join('');
  var text = '연봉 놀이터 · 연봉 스나이퍼 ' + mmdd(TODAY) + '\n' + emo + '\n' + x.score + '점 / 500\n' + SITE_S;
  var tb = '<div class="tw"><table class="tbl"><thead><tr><th>회사 · 직급</th><th>내 값</th><th>정답</th><th>오차</th><th>점수</th><th>사람들 평균 오차</th></tr></thead><tbody>' +
    SPZ.qs.map(function (q, i) { var c = BYN[q.n], e = S.errs[i];
      return '<tr><td>' + esc(c.n) + ' ' + RK[q.ri] + (q.tw ? ' <span class="tag">반전</span>' : '') + '</td><td>' + (x.ans[i] ? man(x.ans[i]) : '-') + '</td><td>' + man(c.rk[q.ri]) + '</td><td class="' + (e > 0 ? 'up' : 'dn') + '">' + (e == null ? '-' : (e > 0 ? '+' : '') + e + '%') + '</td><td>' + S.per[i] + '</td><td class="crowd' + i + '">…</td></tr>'; }).join('') + '</tbody></table></div>';
  $('sniper').innerHTML = '<div class="over"><span class="lv">연봉 스나이퍼 · ' + mmdd(TODAY) + '</span>' + vsScene('sniper', x) + '<div class="big">' + x.score + '<small>점 / 500</small></div><div class="ttl"><b>' + emo + '</b></div>' +
    '<p class="snppl" id="snPpl" hidden></p>' +
    rankBox('sniper', x) + gotBox('sniper') + shareBox('shS', vsBox('sniper', x)) + nextBtn('sniper') + week7('sniper') +
    '<details class="more"><summary>문제별 결과 다시 보기</summary>' + tb + '<p class="crowd" id="snCrowd" hidden></p></details>' +
    '<details class="more"><summary>오늘 · 이번 주 순위 전체</summary><div id="lbS"></div></details><div class="row"><button class="btn ghost sm" type="button" id="sPrac">연습 한 판 ▶</button>' + againBtn('sniper', renderSniper) + '</div></div>';
  $('sPrac').onclick = snPracStart;
  wireShare('shS', text, { title: '연봉 스나이퍼', big: x.score + '점', sub: '500점 만점 · ' + mmdd(TODAY), lines: [emo],
    px: { mood: moodOf(x.score / 500), co: BYN[(SPZ.qs.filter(function (q) { return q.tw; })[0] || SPZ.qs[0]).n], o: { blind: 1, neutral: 1, w: 11 } } });
  getTop('sniper').then(function (t) {
    fillNb('sniper', t);
    var my = S.errs.filter(function (e) { return e != null; }), myE = my.length ? Math.round(my.reduce(function (a, e) { return a + Math.abs(e); }, 0) / my.length * 10) / 10 : null, pb = $('snPpl');
    if (pb && t && t.stat && t.stat.mae != null && myE != null) {
      pb.innerHTML = '사람들 평균 빗나감 <b>' + t.stat.mae + '%</b> · 내 오차 <b>' + myE + '%</b>' + (x.sent && x.rank && x.total >= 5 ? ' · 상위 <b>' + Math.max(1, Math.ceil((x.tie || x.rank) / x.total * 100)) + '%</b>' : '') + mockTag();
      pb.hidden = false;
    }
    if (!t || !t.stat.err) return;
    var best = -1, mx = 0;
    t.stat.err.forEach(function (e, i) { var cell = document.querySelector('#sniper .crowd' + i); if (cell) cell.textContent = e == null ? '-' : (e > 0 ? '+' : '') + e + '%'; if (e != null && Math.abs(e) > mx) { mx = Math.abs(e); best = i; } });
    if (best >= 0 && mx >= 5) { var q = SPZ.qs[best], e2 = t.stat.err[best];
      $('snCrowd').hidden = false; $('snCrowd').innerHTML = '사람들은 <b>' + esc(BYN[q.n].n) + ' ' + RK[q.ri] + '</b>를 평균 <b>' + Math.round(Math.abs(e2)) + '% ' + (e2 > 0 ? '높게' : '낮게') + '</b>봤어요.' + mockTag(); }
    var el = $('lbS'); if (el) el.innerHTML = lbAll(t, 'sniper') + '<p class="src"><a href="#hall">순위 · 명예의 전당 전체 보기 →</a></p>';
  });
}

function snPracResult(p) {
  var S = PC.scoreSniper(SPZ, p.v, ctx), emo = S.per.map(snEmo).join(''), best = +(store.get('slp-sn-best') || 0), nb = S.score > best;
  if (nb) store.set('slp-sn-best', S.score);
  var tb = '<div class="tw"><table class="tbl"><thead><tr><th>회사 · 직급</th><th>내 값</th><th>정답</th><th>오차</th><th>점수</th></tr></thead><tbody>' +
    SPZ.qs.map(function (q, i) { var c = BYN[q.n], e = S.errs[i];
      return '<tr><td>' + esc(c.n) + ' ' + RK[q.ri] + (q.tw ? ' <span class="tag">반전</span>' : '') + '</td><td>' + (p.v[i] ? man(p.v[i]) : '-') + '</td><td>' + man(c.rk[q.ri]) + '</td><td class="' + (e > 0 ? 'up' : 'dn') + '">' + (e == null ? '-' : (e > 0 ? '+' : '') + e + '%') + '</td><td>' + S.per[i] + '</td></tr>'; }).join('') + '</tbody></table></div>';
  $('sniper').innerHTML = '<div class="over"><span class="lv">연봉 스나이퍼 · 연습 판</span><div class="big">' + S.score + '<small>점 / 500</small></div><div class="ttl"><b>' + emo + '</b></div>' +
    '<p class="src">' + (nb ? '연습 최고 기록! ' : '연습 최고 ' + Math.max(best, S.score) + '점 · ') + '연습 판은 순위에 안 올라가요.</p>' + tb +
    '<div class="row"><button class="btn" type="button" id="sPrac">연습 한 판 더 ▶</button><button class="btn ghost" type="button" id="sPracX">오늘의 스나이퍼로</button></div></div>';
  SPRAC = null; SPZ = PC.genSniper(TODAY, ctx); SST = null;
  $('sPrac').onclick = snPracStart; $('sPracX').onclick = function () { renderSniper(); };
  sfx('fanfare'); window.scrollTo(0, 0);
}

