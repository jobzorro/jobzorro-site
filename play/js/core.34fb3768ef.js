

'use strict';


var API_BASE = 'https://play-api.jobzorro.workers.dev';
var SITE = 'https://job.jobzorro.kr/play/', SITE_S = 'job.jobzorro.kr/play';
var ctx = PC.load(D), CO = ctx.all, BYN = ctx.by, POOL = ctx.P, RK = PC.RK;
var TODAY = PC.kstDay();
var GNAME = { higher: '어디가 더 많이 줄까?', today: '스무고개 퀴즈', sniper: '연봉 스나이퍼', road: '커리어 로드 20년', run: '조로 출근길', cup: '드림 컴퍼니 월드컵', line: '연봉 줄서기' };

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function man(v) { return Math.round(v).toLocaleString('ko-KR'); }
function eok(v) { v = Math.round(v); var e = Math.floor(Math.abs(v) / 10000), r = Math.abs(v) % 10000, s = v < 0 ? '-' : '';
  return e ? s + e + '억' + (r ? ' ' + r.toLocaleString('ko-KR') + '만원' : '원') : s + r.toLocaleString('ko-KR') + '만원'; }
function eokS(v) { return eok(v).replace(/원$/, ''); }
function mmdd(day) { return +day.slice(5, 7) + '/' + +day.slice(8, 10); }
function hueCls(s) { var h = PC.hash32(String(s)) % 6; return h ? ' h' + (h + 1) : ''; }

function logo(c, sz) { sz = sz || 'm';
  return c.lg ? '<span class="lg ' + sz + (c.lt ? ' dk' : '') + '"><img src="' + c.lg + '" alt="" loading="lazy"></span>'
    : '<span class="lg ' + sz + ' mono' + hueCls(c.grp || c.n) + '">' + esc(PC.firstChar(c.n)) + '</span>'; }
function link(c) { return 'https://job.jobzorro.kr/salary/co/' + encodeURIComponent(c.slug) + '/'; }
function coLink(c) { return 'https://job.jobzorro.kr/company/#' + encodeURIComponent(c.o); }
var store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
  getJ: function (k, d) { try { var v = JSON.parse(store.get(k)); return v == null ? d : v; } catch (e) { return d; } },
  setJ: function (k, v) { store.set(k, JSON.stringify(v)); }
};
var REDUCE = false; try { REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
function toast(msg) { var t = $('toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
if ($('ym')) $('ym').textContent = D.ym.replace('-', '년 ') + '월';


var DEV = store.get('slp-dev');
if (!DEV || !/^[a-z0-9]{8,24}$/.test(DEV)) { DEV = ''; for (var i = 0; i < 16; i++) DEV += '0123456789abcdef'[Math.floor(Math.random() * 16)]; store.set('slp-dev', DEV); }
var NICK = store.get('slp-nick');
if (!NICK || PC.nickCheck(NICK)) { NICK = PC.makeNick(PC.rng(DEV)); store.set('slp-nick', NICK); }




var MEMS = {};
function memGet(k) { return MEMS[k] != null ? JSON.parse(MEMS[k]) : store.getJ(k, null); }
function memSet(k, v) { if (v) { MEMS[k] = JSON.stringify(v); store.setJ(k, v); } else { delete MEMS[k]; store.del(k); } }
function rec(day, game) { return memGet('slp-r-' + day + '-' + game); }
function setRec(day, game, v) { memSet('slp-r-' + day + '-' + game, v); }
function prog(game) { return memGet('slp-p-' + TODAY + '-' + game); }
function setProg(game, v) { memSet('slp-p-' + TODAY + '-' + game, v); }


var BADGES = [
  ['eye', '연봉 감별사', '연봉 줄서기 완벽한 줄 30판 (오늘의 줄)'],
  ['hr', '인사팀 출신?', '연봉 줄서기 완벽한 줄 80판 (오늘의 줄)'],
  ['sniper', '스나이퍼', '연봉 스나이퍼 450점 이상'],
  ['att7', '7일 출석', '7일 연속 출석 (아무 게임 1판)'],
  ['dhs', '더블 헤드샷', '연봉 스나이퍼 연속 2문제 오차 3% 이내'],
  ['perfect', '퍼펙트 데이', '같은 날 1번 줄서기 완벽한 줄 4판 이상 + 2번 질문 1개 안에 성공 + 3번 450점 이상'],
  ['detect', '명탐정', '스무고개 퀴즈 질문 1개 안에 맞히기 (먼저 찍기 빗나감 없이)'],
  ['road', '커리어의 신', '커리어 로드 그날 상위 1%'],
  ['commute', '출근의 신', '조로 출근길 꽈당 0번 + 정시 출근'],
  ['early', '얼리버드', '조로 출근길 8시 50분 전 도착']];
function badges() { return store.getJ('slp-badges', {}); }
function award(id) {
  var b = badges(); if (b[id]) return;
  b[id] = TODAY; store.setJ('slp-badges', b);
  var d = BADGES.filter(function (x) { return x[0] === id; })[0];
  toast('칭호를 얻었어요: ' + d[1]); renderMe();
}

function badgeName(id) { var d = BADGES.filter(function (x) { return x[0] === id; })[0]; return d ? d[1] : ''; }
function myTitleId() {
  var b = badges(), t = store.get('slp-title'), last = '';
  if (t === 'none') return '';
  if (t && b[t]) return t;
  BADGES.forEach(function (x) { if (b[x[0]]) last = x[0]; }); return last;
}
function topBadge() { return badgeName(myTitleId()) || null; }
function checkPerfect(day) {
  var a = rec(day, 'line'), b = rec(day, 'today'), c = rec(day, 'sniper');
  if (a && b && c && a.aux >= 4 && b.aux > 0 && b.aux <= 2 && c.score >= 450) award('perfect');
}


function shieldOk(s, day) { return !s.sh || s.sh <= PC.addDays(day, -7); }
function streak() { var s = store.getJ('slp-streak', { last: '', n: 0 }); return s.last === TODAY || s.last === PC.addDays(TODAY, -1) || (s.last === PC.addDays(TODAY, -2) && shieldOk(s, TODAY)) ? s.n : 0; }
function bumpStreak(day) {
  var s = store.getJ('slp-streak', { last: '', n: 0 });
  if (s.last === day) return;
  var keep = s.last === PC.addDays(day, -1), save = !keep && s.last === PC.addDays(day, -2) && shieldOk(s, day);
  if (save) s.sh = day;
  s.n = keep || save ? s.n + 1 : 1; s.last = day; store.setJ('slp-streak', s);
  if (s.n > +(store.get('slp-streakmax') || 0)) store.set('slp-streakmax', s.n);
  if (s.n >= 7) award('att7');
}




var PX = (function () {
  var ok = false, cache = {}, DPR = 1;
  try {
    var t = document.createElement('canvas'); t.width = t.height = 2;
    ok = !!(t.getContext && t.getContext('2d') && String(t.toDataURL('image/png')).indexOf('data:image/png') === 0);
    DPR = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
  } catch (e) { ok = false; }
  function tok(n, d) { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; } catch (e) { return d; } }

  function outline(rows) {
    var w = rows[0].length + 2, h = rows.length + 2, g = [], y, x;
    var at = function (yy, xx) { var r = rows[yy - 1]; return r && xx >= 1 && xx <= r.length && r[xx - 1] !== '.'; };
    for (y = 0; y < h; y++) { var s = ''; for (x = 0; x < w; x++) s += at(y, x) ? rows[y - 1][x - 1] : (at(y - 1, x) || at(y + 1, x) || at(y, x - 1) || at(y, x + 1)) ? 'o' : '.'; g.push(s); }
    return g;
  }

  function paint(g, rows, pal, ox, oy, s) {
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var col = pal[r[x]]; if (col) { g.fillStyle = col; g.fillRect(ox + x * s, oy + y * s, s, s); } } });
  }



  var HR = true, KEEP = 'mCc';
  function isBg(ch) { return ch === '.' || (ch >= '1' && ch <= '9'); }
  function rgb(hex) { var n = parseInt(String(hex).replace('#', '').slice(0, 6), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function lit(c, f) { return c.map(function (v) { return Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); }); }
  function mixc(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); }
  function hires(rows, pal, fi) {
    var h = rows.length, w = rows[0].length, y, x, G = [];

    var S = rows.map(function (r) { return r.split(''); });
    for (var ch0 = 1, it = 0; ch0 && it < 8; it++) {
      ch0 = 0;
      for (y = it ? Math.floor(h * .75) : 0; y < h; y++) for (x = 0; x < w; x++) if (S[y][x] === 'o') {
        var n4 = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].map(function (p) { var r = S[p[0]]; return r && p[1] >= 0 && p[1] < w ? r[p[1]] : '.'; }), nb = n4.filter(isBg);
        var fgc = function (c) { return !isBg(c) && c !== 'o'; };
        if (fgc(n4[0]) && fgc(n4[1]) || fgc(n4[2]) && fgc(n4[3])) continue;
        if (nb.length) { S[y][x] = nb.filter(function (c) { return c !== '.'; })[0] || '.'; ch0 = 1; }
      }
    }

    var at = function (yy, xx) { return yy >= 0 && yy < h && xx >= 0 && xx < w ? S[yy][xx] : '.'; };
    for (y = 0; y < h * 2; y++) G.push([]);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var P = S[y][x], A = at(y - 1, x), B = at(y, x + 1), C = at(y, x - 1), D = at(y + 1, x), e = [P, P, P, P];
      if (KEEP.indexOf(P) < 0 && KEEP.indexOf(A) < 0 && KEEP.indexOf(B) < 0 && KEEP.indexOf(C) < 0 && KEEP.indexOf(D) < 0) {
      if (C === A && C !== D && A !== B) e[0] = A;
      if (A === B && A !== C && B !== D) e[1] = B;
      if (D === C && D !== B && C !== A) e[2] = C;
      if (B === D && B !== A && D !== C) e[3] = D;
      }
      G[2 * y][2 * x] = e[0]; G[2 * y][2 * x + 1] = e[1]; G[2 * y + 1][2 * x] = e[2]; G[2 * y + 1][2 * x + 1] = e[3];
    }
    if (pal._post) pal._post(G, fi || 0);

    var W2 = w * 2, H2 = h * 2, out = new Array(W2 * H2), col = {}, ol = rgb(pal.o || '#1b1d18');
    var cOf = function (ch) { return col[ch] || (col[ch] = pal[ch] ? rgb(pal[ch]) : null); };
    var g2 = function (yy, xx) { return yy >= 0 && yy < H2 && xx >= 0 && xx < W2 ? G[yy][xx] : '.'; };
    for (y = 0; y < H2; y++) for (x = 0; x < W2; x++) {
      var ch = G[y][x], c0;
      if (isBg(ch)) {
        var fg = null, n4 = [g2(y - 1, x), g2(y + 1, x), g2(y, x - 1), g2(y, x + 1)];
        for (var i = 0; i < 4; i++) if (!isBg(n4[i]) && cOf(n4[i])) { fg = n4[i]; break; }
        if (fg) { out[y * W2 + x] = fg === 'o' ? ol : mixc(ol, lit(cOf(fg), -.62), .45); continue; }
        out[y * W2 + x] = ch === '.' ? null : cOf(ch); continue;
      }
      c0 = cOf(ch); if (!c0) { out[y * W2 + x] = null; continue; }
      if (ch === 'o') { out[y * W2 + x] = c0; continue; }
      var up = g2(y - 1, x), lf = g2(y, x - 1), dn = g2(y + 1, x), rt = g2(y, x + 1), up2 = g2(y - 2, x), dn2 = g2(y + 2, x);
      var edge = function (c) { return isBg(c) || c === 'o'; }, rt2 = g2(y, x + 2), rt3 = g2(y, x + 3), dn3 = g2(y + 3, x);
      var small = function (c) { return 'ECMurTnHC'.indexOf(c) >= 0; };
      if (edge(up) || edge(lf)) c0 = lit(c0, .22);
      else if (edge(dn) || edge(rt)) c0 = lit(c0, -.2);
      else if (!isBg(up) && up !== ch && !small(up) && cOf(up)) c0 = lit(c0, -.14);
      else if (!isBg(up2) && up2 !== ch && up2 !== 'o' && !small(up2) && cOf(up2) && up === ch) c0 = lit(c0, -.07);
      else if (edge(dn2) || edge(rt2)) c0 = lit(c0, -.1);
      else if (edge(up2)) c0 = lit(c0, .08);
      else if (edge(dn3) || edge(rt3)) c0 = lit(c0, -.04);
      out[y * W2 + x] = c0;
    }
    return { w: W2, h: H2, px: out };
  }
  function paintHR(g, rows, pal, ox, oy, s, fi) {
    var R = hires(rows, pal, fi), d = s / 2;
    if (d === Math.round(d) && d === 1 && g.createImageData) {
      var im = g.createImageData(R.w, R.h);
      R.px.forEach(function (c, i) { if (c) { im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = 255; } });
      var t = document.createElement('canvas'); t.width = R.w; t.height = R.h; t.getContext('2d').putImageData(im, 0, 0); g.drawImage(t, ox, oy); return;
    }
    R.px.forEach(function (c, i) { if (c) { g.fillStyle = 'rgb(' + c.join(',') + ')'; g.fillRect(ox + (i % R.w) * d, oy + Math.floor(i / R.w) * d, d, d); } });
  }
  function url(key, frames, pal) {
    if (cache[key]) return cache[key];
    var w = frames[0][0].length, h = frames[0].length, c = document.createElement('canvas'), z = HR ? 2 : 1;
    c.width = w * frames.length * z; c.height = h * z;
    var g = c.getContext('2d');
    frames.forEach(function (f, i) { if (HR) paintHR(g, f, pal, i * w * 2, 0, 2, i); else paint(g, f, pal, i * w, 0, 1); });
    return (cache[key] = c.toDataURL('image/png'));
  }

  function fit(s) { return Math.max(1, Math.round(s * DPR)) / DPR; }
  function pal2(pal) { var p = {}; for (var k in pal) p[k] = pal[k];
    if (!p.o) p.o = tok('--px-ol', '#1b1d18'); return p; }
  function keyOf(name, pal) { return name + '|' + pal.o; }

  function img(name, rows, pal, s, cls, alt) {
    if (!ok) return '';
    try {
      pal = pal2(pal); var k = fit(s), u = url(keyOf(name, pal), [rows], pal);
      return '<img class="px ' + (cls || '') + '" src="' + u + '" style="width:' + (rows[0].length * k) + 'px;height:' + (rows.length * k) + 'px" alt="' + (alt || '') + '"' + (alt ? '' : ' aria-hidden="true"') + ' draggable="false">';
    } catch (e) { return ''; }
  }

  function sheet(name, frames, pal, s, cls) {
    if (!ok) return '';
    try {
      pal = pal2(pal); var k = fit(s), w = frames[0][0].length * k, h = frames[0].length * k, u = url(keyOf(name, pal), frames, pal);
      return '<span class="px pxs f' + frames.length + ' ' + (cls || '') + '" aria-hidden="true" style="width:' + w + 'px;height:' + h + 'px;--sw:' + (-w * frames.length) + 'px;background-image:url(' + u + ');background-size:' + (w * frames.length) + 'px ' + h + 'px"></span>';
    } catch (e) { return ''; }
  }
  return { ok: ok, outline: outline, paint: paint, paintHR: paintHR, hires: hires, HR: HR, img: img, sheet: sheet, fit: fit, tok: tok, pal2: pal2 };
}());





var BASES = { m: '남자 조로', f: '여자 조로' };
var HAIRS = { m: [['basic', '기본'], ['short', '짧은 머리'], ['part', '가르마'], ['two', '투블럭'], ['slick', '포마드'], ['curly', '펌'], ['buzz', '스포츠']],
  f: [['long', '긴 머리'], ['bob', '단발'], ['pony', '포니테일'], ['wave', '웨이브'], ['pixie', '숏컷'], ['bun', '올림머리']] };
var BOTTOMS = [['pants', '바지'], ['skirt', '치마']];
var FITS = [['suit', '정장'], ['semi', '세미캐주얼'], ['dress', '원피스', 'f']];

var COLS = [['auto', '기본', ''], ['navy', '네이비', '#2c3e66'], ['char', '차콜', '#3a3d44'], ['gray', '그레이', '#7d8491'], ['beige', '베이지', '#b39b74'],
  ['brown', '브라운', '#6e4b33'], ['olive', '올리브', '#5a6b45'], ['wine', '와인', '#7a2f3e'], ['sky', '하늘', '#8fb3d9'], ['pink', '로즈', '#d98fa6']];
var FACES = [['basic', '기본'], ['oval', '갸름한'], ['square', '각진'], ['round', '동글동글']];
var LOOK = store.getJ('slp-look', {}) || {};
if (typeof LOOK !== 'object' || Array.isArray(LOOK)) LOOK = {};
function lookOf(o) { return o && o.plain ? {} : o && o.look ? o.look : LOOK; }
function baseOf(L) { return L && L.base === 'f' ? 'f' : 'm'; }
function pickOf(T, v) { return T.some(function (x) { return x[0] === v; }) ? v : T[0][0]; }
function hairOf(L) { return pickOf(HAIRS[baseOf(L)], L && L.hair); }
function fitOf(L) { var f = pickOf(FITS, L && L.fit); return f === 'dress' && baseOf(L) !== 'f' ? 'suit' : f; }
function colOf(L) { return L && /^#[0-9a-f]{6}$/i.test(L.col || '') ? L.col : pickOf(COLS, L && L.col); }
function faceOf(L) { return pickOf(FACES, L && L.face); }
function colHex(k) { if (/^#[0-9a-f]{6}$/i.test(k || '')) return k; var c = COLS.filter(function (x) { return x[0] === k; })[0]; return c ? c[2] : ''; }


function lookCode() {
  var L = LOOK, a = ['r' + myRank()]; if (baseOf(L) === 'f') a.push('bf'); a.push('h' + hairOf(L)); if (baseOf(L) === 'f' && L.bottom === 'skirt') a.push('os');
  if (fitOf(L) !== 'suit') a.push('w' + fitOf(L)); if (colOf(L) !== 'auto' && colOf(L)[0] !== '#') a.push('c' + colOf(L)); if (faceOf(L) !== 'basic') a.push('f' + faceOf(L));
  [['t', 'hat'], ['d', 'hand'], ['a', 'acc'], ['g', 'bg']].forEach(function (p) { if (L[p[1]]) a.push(p[0] + L[p[1]]); });
  var t = myTitleId(); if (t) a.push('n' + t);
  return a.join('.');
}
function lookParse(c) {
  var L = {}, rk = 0, title = '', SL = { t: 'hat', d: 'hand', a: 'acc', g: 'bg' };
  String(c || '').split('.').forEach(function (x) {
    var k = x.charAt(0), v = x.slice(1);
    if (k === 'r') rk = Math.max(0, Math.min(4, +v || 0)); else if (k === 'b' && v === 'f') L.base = 'f'; else if (k === 'h') L.hair = v; else if (k === 'o' && v === 's') L.bottom = 'skirt';
    else if (k === 'w') L.fit = v; else if (k === 'c') L.col = v; else if (k === 'f') L.face = v;
    else if (k === 'n') title = badgeName(v);
    else if (SL[k] && ITEM_BY[v] && ITEM_BY[v][1] === SL[k]) L[SL[k]] = v;
  });
  return { rk: rk, look: L, title: title };
}
function lookKey(L, o) { return baseOf(L) + hairOf(L) + (L.bottom === 'skirt' ? 'S' : '') + fitOf(L) + colOf(L) + faceOf(L) + '.' + (L.hat || '') + '.' + (L.hand || '') + '.' + (L.acc || '') + (o && o.bg ? '.' + (L.bg || '') : '') + (o && o.sil ? '.sil' : ''); }

function nameRank(nick, rk) { return nick + ' ' + RK[Math.max(0, Math.min(4, rk | 0))]; }




var GRP_COL = { '금융': '#3f9a72', 'IT·게임': '#5b7cff', '통신·미디어': '#a35fd6', '반도체·전자': '#3a9fd6', '자동차': '#8796ab', '철강·소재': '#8a7a6e',
  '화학·에너지': '#d68a2c', '바이오·제약': '#36b5a5', '조선·기계': '#4f6f93', '식품': '#e0694f', '유통·상사': '#d9a441', '패션·뷰티': '#d45d9a', '건설·부동산': '#b98a4c', '운송·물류': '#caa32a', '기타·서비스': '#8c80ad' };
var NEUTRAL = ['#7f8ca8', '#a8907f', '#7fa898', '#9b80a8', '#a8a07f', '#7f9da8'];
function shade(hex, f) {
  var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)); });
  return '#' + c.map(function (v) { return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }).join('');
}
function bldRows(c, o) {
  o = o || {};
  var H = PC.hash32('bld|' + c.n), clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var w = o.w || clamp(Math.round(Math.log(Math.max(30, c.m)) / Math.LN10 * 2.6), 5, 15); if (!(w % 2)) w++;
  var fl = o.blind ? 6 : clamp(Math.round(c.rk[4] / 1000), 4, 16);
  var lit = o.off || o.sil ? 0 : o.all ? 1 : o.blind ? .5 : clamp((c.rk[0] - 3500) / 4000, .12, .95);
  var rows = [], half = Math.floor(w / 2), roof = H % 4, rep = function (ch, n) { return n > 0 ? new Array(n + 1).join(ch) : ''; };
  var mid = function (inner) { var l = Math.floor((w - inner.length) / 2); return rep('.', l) + inner + rep('.', w - inner.length - l); };
  if (roof === 0) { rows.push(mid('A')); rows.push(mid('a')); }
  else if (roof === 1) { rows.push('.' + 'TTT' + rep('.', w - 4)); rows.push('.' + 'TaT' + rep('.', w - 4)); }
  else if (roof === 2) { rows.push(mid(rep('R', Math.max(3, w - 4)))); rows.push(mid('W' + rep('L', Math.max(1, w - 6)) + 'W').replace(/L/g, lit ? 'L' : 'd')); }
  else { rows.push(mid('A')); rows.push(mid('RRR')); }
  rows.push(rep('R', w));
  for (var f = 0; f < fl; f++) {
    var r = 'W';
    for (var x = 1; x < w - 1; x++) {
      if (x % 2 === 0) { r += 'W'; continue; }
      var hh = PC.hash32(H + ':' + x + ':' + f) % 1000;
      r += o.sil ? 'W' : hh / 1000 < lit ? 'L' : 'd';
    }
    rows.push(r + 'W'); rows.push(f === fl - 1 ? rep('W', w) : 'W' + rep('w', w - 2) + 'W');
  }
  var a = Math.floor((w - 3) / 2); rows.push(rep('W', a) + 'DDD' + rep('W', w - 3 - a)); rows.push(rep('W', a) + 'DDD' + rep('W', w - 3 - a));
  return PX.outline(rows);
}
function bldPal(c, o) {
  o = o || {};
  var base = o.sil ? PX.tok('--px-sil', '#3b3f4a') : o.neutral ? NEUTRAL[PC.hash32('col|' + c.n) % NEUTRAL.length] : (GRP_COL[c.grp] || GRP_COL['기타·서비스']);
  if (o.off) base = shade(base, -.35);
  return { W: base, w: shade(base, -.12), R: shade(base, .45), A: '#ff5b4a', a: '#9aa0a6', T: '#8f96a3', L: '#ffe27a', d: o.sil ? shade(base, -.2) : '#27303f', D: '#3a2a1c' };
}
function bldKey(c, o) { o = o || {}; return 'b|' + c.n + '|' + ['blind', 'neutral', 'off', 'all', 'sil'].map(function (k) { return o[k] ? 1 : 0; }).join('') + (o.w || ''); }
function bld(c, s, o, cls, alt) {
  if (!c) return '';
  if (cls && /grow/.test(cls) && !(o && (o.sil || o.off))) {
    var r1 = bldRows(c, o), H = PC.hash32('tw|' + c.n), n = 0;
    var r2 = r1.map(function (row, y) { return row.replace(/[Ld]/g, function (m, x) { if (PC.hash32(H + ':' + x + ':' + y) % 7 || n > 3) return m; n++; return m === 'L' ? 'd' : 'L'; }); });
    return PX.sheet(bldKey(c, o) + '|tw', [r1, r2], bldPal(c, o), s, 'bld tw ' + cls);
  }
  return PX.img(bldKey(c, o), bldRows(c, o), bldPal(c, o), s, 'bld ' + (cls || ''), alt);
}

function bldSize(c, o) { var r = bldRows(c, o); return [r[0].length, r.length]; }


var ICON = {
  money: [['GGGGGGGG', 'GgggyggG', 'GggyyygG', 'GgggyggG', 'GGGGGGGG'], { G: '#2f7d32', g: '#7fd36b', y: '#ffe27a' }],
  coin: [['.yyyy.', 'yYYYYy', 'yYyyYy', 'yYyyYy', 'yYYYYy', '.yyyy.'], { y: '#e0a800', Y: '#ffe27a' }],
  flame: [['...r...', '..rr...', '..rrr..', '.rroor.', '.roooor', 'rooyyor', 'royyyor', '.oyyyo.', '..yyy..'], { r: '#e8412c', o: '#ff9a1f', y: '#ffe27a' }],
  star: [['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: '#ffcf3d' }],
  skull: [['.wwwwww.', 'wwwwwwww', 'wkkwwkkw', 'wkkwwkkw', 'wwwkkwww', '.wwwwww.', '.w.ww.w.'], { w: '#ececec', k: '#111' }],
  chest: [['.yyyyyy.', 'yooooooy', 'yooyyooy', 'yyyyyyyy', 'yooooooy', 'yooooooy', 'yyyyyyyy'], { y: '#ffcf3d', o: '#8a5a1c' }],
  fairy: [['g.pp.g', 'gpppPg', 'ppsspp', '.ssss.', 'gs..sg', '..ss..'], { p: '#ff9bd3', P: '#ff5bb0', s: '#f2c79b', g: '#9fffcf' }],
  trophy: [['yyyyyyyyy', 'y.yyyyy.y', 'y.yyYyy.y', '.yyyyyyy.', '..yyyyy..', '...yyy...', '....y....', '..BBBBB..', '..BBBBB..'], { y: '#ffcf3d', Y: '#fff3b0', B: '#8a5a1c' }],
  magnifier: [['..kkk....', '.kcccK...', 'kccwcck..', 'kcwccck..', 'kccccck..', '.kcccK...', '..kkkKK..', '......KK.', '.......KK'], { k: '#2b2b2b', K: '#6b4a2b', c: '#bfe6ff', w: '#ffffff' }],
  rocket: [['...w...', '..www..', '..wbw..', '..www..', '..www..', '.rwwwr.', 'r.www.r', '..o.o..', '..y.y..'], { w: '#e8edf5', b: '#4f7dff', r: '#e8412c', o: '#ff9a1f', y: '#ffe27a' }],
  broken: [['.rr.rr.', 'rrrkrrr', 'rrkrrrr', '.rrkrr.', '..rkr..', '...r...'], { r: '#e8412c', k: '#2b2b2b' }],
  house: [['...r...', '..rrr..', '.rrrrr.', 'rrrrrrr', '.wwdww.', '.wwdww.'], { r: '#c0392b', w: '#f2e6d0', d: '#6b4a2b' }],
  sign: [['yyyyyy..', 'yyyyyyy.', 'yyyyyyyy', 'yyyyyyy.', 'yyyyyy..', '...ww...', '...ww...', '...ww...', '..gggg..'], { y: '#ffcf3d', w: '#8a5a1c', g: '#5aa04a' }],
  cap: [['....k....', '..kkkkk..', 'kkkkkkkkk', '..kkkkkyk', '..kkk...y'], { k: '#2b2b2b', y: '#ffcf3d' }],
  lock: [['..kkk..', '.k...k.', '.k...k.', 'kkkkkkk', 'kkkykkk', 'kkkykkk', 'kkkkkkk'], { k: '#7a7d74', y: '#ffcf3d' }],
  puff: [['.dddd.', 'dddddd', 'dddddd', '.dd.d.'], { d: '#cfcfc8' }],
  quest: [['.yyyy.', 'yy..yy', '....yy', '...yy.', '..yy..', '......', '..yy..'], { y: '#ffcf3d' }],
  crown: [['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yrybyry', 'yyyyyyy'], { y: '#ffcf3d', r: '#e8412c', b: '#4f7dff' }],
  target: [['..rrr..', '.rwwwr.', 'rwrrrwr', 'rwrkrwr', 'rwrrrwr', '.rwwwr.', '..rrr..'], { r: '#e8412c', w: '#ffffff', k: '#2b2b2b' }],
  horns: [['r.......r', 'rr.....rr', '.rr...rr.', '..rrrrr..'], { r: '#e8412c' }],
  queue: [['hhh.hhh.hhh', 'sss.sss.sss', 'sss.sss.sss', '...........', 'bbb.rrr.ggg', 'bbb.rrr.ggg', 'b.b.r.r.g.g'], { h: '#4a3322', s: '#f6cfa6', b: '#4f7dff', r: '#e8412c', g: '#3f9a4a' }],
  boss: [['.kkkkk.', 'kyyyyyk', 'kyykyyk', 'kyyyyyk', '.kkkkk.'], { k: '#8a5a1c', y: '#ffcf3d' }],

  gift: [['.yy...yy.', '..yy.yy..', 'rrrryrrrr', 'rrrryrrrr', '.RRRyRRR.', '.RRRyRRR.', '.RRRyRRR.', '.RRRyRRR.'], { r: '#ff6a4d', R: '#e8412c', y: '#ffcf3d' }],
  sword: [['.......ww', '......wsw', '.....wsw.', '....wsw..', 'y..wsw...', '.ywsw....', '..yw.....', '.b.y.....', 'b...y....'], { w: '#e8edf5', s: '#aeb7c6', y: '#ffcf3d', b: '#8a5a1c' }],
  spkon: [['...g..b..', '..gg...b.', 'gggg.b.b.', 'gggg.b.b.', 'gggg.b.b.', '..gg...b.', '...g..b..'], { g: '#b8bec9', b: '#5b9dff' }],
  spkoff: [['...g......', '..gg.r...r', 'gggg..r.r.', 'gggg...r..', 'gggg..r.r.', '..gg.r...r', '...g......'], { g: '#b8bec9', r: '#e8412c' }],
  pencil: [['.....pp', '....ypp', '...yyy.', '..yyy..', '.yyy...', 'tyy....', 'kt.....'], { y: '#ffcf3d', p: '#ff8fa3', t: '#f2c79b', k: '#2b2b2b' }],
  idtag: [['..bbb..', 'wwwwwww', 'wssswww', 'wssswkw', 'wssswww', 'wwwwwww', 'wkkkkkw', 'wwwwwww'], { w: '#f4f4f4', s: '#f2c79b', k: '#7a7d74', b: '#3550b8' }]
};
function icon(name, s, cls, alt) { var d = ICON[name]; return d ? PX.img('i|' + name, PX.outline(d[0]), d[1], s, 'ico ' + (cls || ''), alt) : ''; }

function em(name, fb, s) { return PX.ok ? icon(name, s || 1.5, 'emi') : (fb || ''); }

function pxDraw(g, kind, a, x, y, s, o) {
  var rows, pal;
  if (kind === 'zorro') { rows = zFrames(a.rk, a.mood, o)[0]; pal = zPal(a.rk, a.mood, o); }
  else if (kind === 'bld') { rows = bldRows(a, o); pal = bldPal(a, o); }
  else { rows = PX.outline(ICON[a][0]); pal = ICON[a][1]; }
  pal = PX.pal2(pal); PX.paint(g, rows, pal, x, y - rows.length * s, s);
  return [rows[0].length * s, rows.length * s];
}


var RANK_XP = [0, 4, 12, 28, 56];
function myXP() {
  var n = 0;
  try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('slp-r-') === 0) n++; } } catch (e) {}
  return n + Object.keys(badges()).length * 3 + (+(store.get('slp-xpb') || 0));
}
function rankOfXP(x) { var r = 0; RANK_XP.forEach(function (v, i) { if (x >= v) r = i; }); return r; }
function myRank() { return rankOfXP(myXP()); }
function nextXP() { var x = myXP(), r = rankOfXP(x); return r >= 4 ? 0 : RANK_XP[r + 1] - x; }

function grantPromo() { var x = myXP() + 1, r = rankOfXP(x); if (r >= 4) return [4, 4]; store.set('slp-xpb', (+(store.get('slp-xpb') || 0)) + (RANK_XP[r + 1] - x)); return [r, r + 1]; }

function promoCheck() {
  var r = myRank(), seen = store.get('slp-rank');
  if (seen == null) { store.set('slp-rank', r); return; }
  if (r > +seen) { store.set('slp-rank', r); sfx('fanfare'); renderMe(); if (!promoPop(+seen, r)) toast('승진했어요! 이제 ' + nameRank(NICK, r) + '님이에요.'); }
}


function promoPop(a, b) {
  if (!PX.ok || document.querySelector('.promoPop')) return false;
  var el = document.createElement('div'), back = document.activeElement;
  el.className = 'promoPop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '승진 알림');
  el.innerHTML = '<div class="ppIn"><span class="pxbanner">승진!</span><div class="ppSt">' +
    '<span class="ppWalk">' + zorro(a, 'normal', 4, 'walk') + '</span><span class="ppNew">' + zorro(b, 'happy', 4, 'jump') + '</span>' + confetti() + '</div>' +
    '<p class="ppNm">' + esc(nameRank(NICK, b)) + '</p><p class="ppSub">' + RK[a] + ' → <b>' + RK[b] + '</b> · ' + (b >= 2 && a < 2 ? '안경을 받았어요' : b === 4 ? '만렙! 금 넥타이' : '재킷 색이 바뀌어요') + '</p>' +
    '<button type="button" class="btn">좋아요</button></div>';
  var close = function () { if (!el.parentNode) return; el.remove(); document.removeEventListener('keydown', key); if (back && back.focus) back.focus(); };
  var key = function (e) { if (e.key === 'Escape') close(); };
  el.onclick = close; document.addEventListener('keydown', key);
  document.body.appendChild(el); el.querySelector('.btn').focus();
  return true;
}

var SND_UI = true;
var SND = { on: SND_UI && store.get('slp-sound') === '1', ac: null };
function sfx(name) {
  if (!SND.on) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = SND.ac || (SND.ac = new AC()); if (ac.state === 'suspended') ac.resume();
    var N = { coin: [[988, .07], [1319, .16]], jump: [[523, .04], [784, .07]], combo: [[784, .06], [988, .06], [1175, .06], [1568, .14]], wrong: [[220, .12], [165, .22]],
      fanfare: [[523, .1], [659, .1], [784, .1], [1047, .24], [784, .08], [1047, .3]] }[name] || [], t = ac.currentTime + .01;
    N.forEach(function (n) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = name === 'wrong' ? 'sawtooth' : 'square'; o.frequency.setValueAtTime(n[0], t);
      g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + n[1]);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + n[1] + .02); t += n[1] * .9;
    });
  } catch (e) {}
}

function sndLbl() { return (SND.on ? em('spkon', '🔊', 2) : em('spkoff', '🔇', 2)) + '<span class="sl">' + (SND.on ? ' 효과음 켬' : ' 효과음 끔') + '</span>'; }
function sndBtn(id) { if (!SND_UI) return ''; return '<button class="sndb" id="' + (id || 'sndT') + '" type="button" aria-label="효과음" aria-pressed="' + SND.on + '">' + sndLbl() + '</button>'; }
function wireSnd() { document.querySelectorAll('.sndb').forEach(function (b) { b.onclick = function () {
  SND.on = !SND.on; store.set('slp-sound', SND.on ? '1' : '0');
  document.querySelectorAll('.sndb').forEach(function (x) { x.setAttribute('aria-pressed', SND.on); x.innerHTML = sndLbl(); }); sfx('coin'); }; }); }


function countUp(el, to, fmt, ms) {
  if (!el) return; fmt = fmt || man;
  if (REDUCE) { el.textContent = fmt(to); return; }
  var t0 = performance.now(), d = ms || 700;
  (function f() { var p = Math.min(1, (performance.now() - t0) / d); el.textContent = fmt(to * (Math.floor(p * 8) / 8)); if (p < 1) requestAnimationFrame(f); }());
}

function stage(inner, cls, label) { return PX.ok ? '<div class="pxst ' + (cls || '') + '"' + (label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + '>' + inner + '</div>' : ''; }

function bS(big) { var w = window.innerWidth || 400; return big ? (w < 560 ? 4 : 5) : (w < 560 ? 3 : 4); }

ICON.bus = [['gggggggggg', 'gLLgLLgLLg', 'gLLgLLgLLg', 'gggggggggg', 'wggggggggw', '.kk....kk.'], { g: '#3f9a4a', L: '#bfe6ff', w: '#ffe27a', k: '#2b2b2b' }];






var ZW = 32, ZH = 36;
var Z_RANK = [
  { h: '#4a3322', jk: null, tie: '#4f7dff', gl: 0, id: 1 },
  { h: '#4a3322', jk: '#3b4a6b', tie: '#4f7dff', gl: 0 },
  { h: '#2b2b2b', jk: '#34405e', tie: '#c0392b', gl: 1 },
  { h: '#77736c', jk: '#2b2f3a', tie: '#c0392b', gl: 1 },
  { h: '#d2d0cb', jk: '#1d1f26', tie: '#ffcf3d', gl: 1 }];
function zg(w, h) { var g = []; for (var y = 0; y < (h || ZH); y++) { var r = []; for (var x = 0; x < (w || ZW); x++) r.push('.'); g.push(r); } return g; }
function zp(g, x, y, c) { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; }
function zr(g, x0, y0, x1, y1, c) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) zp(g, x, y, c); }
function zs(g, x, y, rows) { rows.forEach(function (s, j) { for (var i = 0; i < s.length; i++) if (s[i] !== ' ') zp(g, x + i, y + j, s[i] === '_' ? '.' : s[i]); }); }
function zat(g, x, y) { return g[y] && g[y][x] !== undefined ? g[y][x] : '.'; }


var Z_FACE = {
  basic: ['  ssssssssssss  ', ' ssssssssssssss ', 'ssssssssssssssss', 'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf',
    'sssssssssssssssf', 'sssssssssssssssf', ' sssssssssssssf ', '  ssssssssssff  ', '    ffffffff    '],
  oval: ['  ssssssssssss  ', ' ssssssssssssss ', 'ssssssssssssssss', 'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf',
    ' sssssssssssssf ', ' sssssssssssssf ', '  sssssssssssf  ', '   sssssssssf   ', '     ffffff     '],
  square: [' ssssssssssssss ', 'ssssssssssssssss', 'ssssssssssssssss', 'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf',
    'sssssssssssssssf', 'sssssssssssssssf', 'sssssssssssssssf', ' ssssssssssssff ', '  ffffffffffff  '],
  round: ['   ssssssssssss   ', '  ssssssssssssss  ', ' ssssssssssssssss ', 'sssssssssssssssssf', 'sssssssssssssssssf', 'sssssssssssssssssf', 'sssssssssssssssssf',
    'sssssssssssssssssf', 'sssssssssssssssssf', ' sssssssssssssssf ', '   sssssssssssff   ', '     ffffffff     ']
};
function zFace(g, face) {
  var F = Z_FACE[face] || Z_FACE.basic, wide = F[0].length > 16;
  zs(g, wide ? 7 : 8, 8, F);
  if (wide) { zr(g, 6, 12, 6, 14, 's'); zr(g, 25, 12, 25, 14, 'f'); } else { zr(g, 7, 12, 7, 14, 's'); zr(g, 24, 12, 24, 14, 'f'); }
}

function zHairBack(g, b, hr) {
  if (b !== 'f') return;
  if (hr === 'long') { zr(g, 6, 9, 25, 25, 'i'); zr(g, 7, 24, 24, 26, 'i'); }
  if (hr === 'bob') zr(g, 6, 9, 25, 19, 'i');
  if (hr === 'wave') { zr(g, 6, 9, 25, 25, 'i'); for (var y = 11; y <= 26; y++) { var o = Math.floor(y / 3) % 2; zp(g, 5 + o, y, 'i'); zp(g, 26 - o, y, 'i'); } zs(g, 7, 26, [' ii ii  ii  ii ii ']); }
  if (hr === 'bun') zs(g, 11, 0, ['  hhhhhh  ', ' hhjjhhhh ', 'hhjhhhhhhi', ' BBBBBBBB ']);
  if (hr === 'pony') {
    zs(g, 1, 5, ['    hhB ', '   hhhBB', '  hhjhh ', ' hhjhhh ', ' hhhhhi ', 'hhjhhhi ', 'hhhhhii ', 'hhhhhi  ', 'hjhhhi  ', 'hhhhii  ', ' hhhi   ', ' hhhi   ', ' hhii   ', '  hi    ', '  hi    ', '  i     ']);
  }
}
function zHair(g, b, hr) {
  if (b === 'f') {
    zs(g, 7, 3, ['   hhhhhhhhhhhh   ', '  hhhjjjhhhhhhhh  ', ' hhhjjhhhhhhhhhhh ', 'hhhjhhhhhhhhhhhhhi', 'hhhhhhhhhhhhhhhhhi', 'hhhhhhhhhhhhhhhhii', 'hhhhihhhhhhhihhhii', 'hhhh hh iihh hhhhi']);
    if (hr === 'long') { zs(g, 6, 11, ['hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhi', 'hhi', 'hi ', 'hi ']); zs(g, 23, 11, ['hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hii', 'hii', ' hi', ' hi']); }
    if (hr === 'bob') { zs(g, 6, 11, ['hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhh', 'hhi', 'hii']); zs(g, 23, 11, ['hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hhi', 'hii', 'ii ']); zs(g, 7, 10, ['h']); zs(g, 24, 10, ['h']); }
    if (hr === 'pony') { zs(g, 7, 11, ['hh', 'hj', 'hh', 'hi', ' i']); zs(g, 23, 11, ['hh', 'hi', 'hi', 'hi', 'i ']); }
    if (hr === 'bun') { zs(g, 7, 11, ['hh', 'hi', ' i', ' i']); zs(g, 23, 11, ['hh', 'ih', 'i ', 'i ']); }
    if (hr === 'wave') { zs(g, 6, 11, ['hhh', 'hhh', ' hhh', ' hhh', 'hhh', 'hhh', ' hhh', ' hhh', 'hhh', 'hhi', ' hhi', ' hi', 'hi', 'i']); zs(g, 23, 11, ['hhi', 'hhi', 'hhi ', 'hhi', ' hhi', ' hhi', 'hhi', 'hhi', ' hhi', ' hhi', 'hhi', ' hi', '  hi', '  i']); }
    if (hr === 'pixie') { zs(g, 7, 3, ['   hhhhhhhhhhhh   ', '  hhhjjjhhhhhhhh  ', ' hhhjjhhhhhhhhhhh ', 'hhhjhhhhhhhhhhhhhi', 'hhhhhhhhhhhhhhhhhi', 'hhhhhhhhhhhhhhhhii', 'hhhhhhhhhhhiiihhii', 'hhhhhhhhii    hhhi']);
      zs(g, 6, 11, [' hh', 'hhh', 'hhi', ' hi']); zs(g, 23, 11, ['hh', 'hhi', 'hi', 'i']); }
    return;
  }
  if (hr === 'short') { zs(g, 7, 4, ['    hhhhhhhhhh    ', '  hhihhhhhihhhhh  ', ' hhhhhhihhhhhhhih ', ' hhihhhhhhhhihhhi ', 'hhhhhhhhhhhhhhhhhi', 'hi  i  i  i  i  ih', 'h                h']); return; }
  if (hr === 'two') { zs(g, 7, 3, ['    hhhhhhhhhh    ', '  hhhjjjjhhhhhhh  ', ' hhjjjhhhhhhhhhhh ', ' hhhhhhhhhhhhhhhh ', 'iihhhhhhhhhhhhhhii', 'ii  hhhhhh hhhh ii', 'i                i']); return; }
  if (hr === 'slick') { zs(g, 7, 2, ['     hhhhhhhh     ', '   hhhjjjjjjhhh   ', '  hhjjhhhhhhjjhh  ', ' hhhhhhhhhhhhhhhh ', ' hhhhhhhhhhhhhhhi ', 'hhhhhhhhhhhhhhhhii', 'hhi            iih', 'hh              hh', 'h                h']); return; }
  if (hr === 'curly') { zs(g, 7, 2, ['   hh  hhh  hh    ', '  hhhhhhhhhhhhhh  ', ' hhjhhjhhhjhhjhhh ', 'hhhhihhhhihhhhihhh', 'hjhhhhjhhhhjhhhhhi', 'hhhihhhhihhhhihhhi', 'hhh hhi hhi hhh hi', 'hh              hh', 'h                h']); return; }
  if (hr === 'buzz') { zs(g, 7, 4, ['    iiiiiiiiii    ', '  iihhhhhhhhhhii  ', ' ihhhhjhhhhhhhhi ', ' hhhhhhhhhhhhhhhh ', ' i              i ']); return; }
  if (hr === 'part') { zs(g, 7, 3, ['    hhhhhhhhhh    ', '  hhhhfhhhhjjhhh  ', ' hhhhfhhhhjjhhhhh ', ' hhhfhhhhhhhhhhhi ', 'hhhfhhhhhhhhhhhhii', 'hhhhhhhhhhhhhhhhii', 'hh  iihhhhhhhhhiih', 'h      iihhhhhh hh', 'h               hh']); return; }
  zs(g, 7, 3, ['    hhhhhhhhhh    ', '  hhhhjjjhhhhhhh  ', ' hhhjjjhhhhhhhhhh ', ' hhjjhhhhhhhhhhhi ', 'hhhhhhhhhhhhhhhhii', 'hhhhhhhhhhhhhhhhii', 'hhiihhhhihhhhhhiih', 'hh   hh    hh   hh', 'h                h']);
}


function zBody(g, R, fem, skirt, pose, fit, hasJ) {
  fit = fit || 'suit'; if (hasJ == null) hasJ = !!R.jk;
  R = { jk: hasJ, id: R.id };
  var jk = hasJ ? 'J' : 'w', sh = hasJ ? 'd' : 'x';
  zr(g, 14, 20, 17, 20, 's'); zp(g, 17, 20, 'f');
  zr(g, 9, 21, 22, 28, jk); zr(g, 22, 21, 22, 28, sh); zr(g, 9, 28, 22, 28, sh);

  if (fit === 'dress') {
    zs(g, 11, 21, ['wwww  wwww', ' wwwttwww ', '    yy    ']); zr(g, 9, 27, 22, 27, 'd'); zs(g, 15, 27, ['YY']);
  } else if (fit === 'semi') {
    zs(g, 12, 21, ['xwwwwwwx', 'lwwwwwwl', ' lwwwwl ', '  lwwl  ', '   ll   ']); zp(g, 15, 26, 'Z'); zp(g, 15, 27, 'Z');
    for (var x = 9; x <= 22; x++) zp(g, x, 28, x % 2 ? 'd' : 'J');
  } else {
    zs(g, 12, 21, [R.jk ? 'lwwwwwwl' : 'xwwwwwwx', R.jk ? ' lwwwwl ' : ' xwwwwx ', R.jk ? ' lwwwwl ' : '  wwww  ', R.jk ? '  lwwl  ' : '  wwww  ']);
    if (!R.jk) { zr(g, 13, 25, 18, 27, 'w'); zp(g, 21, 23, 'x'); zp(g, 10, 26, 'x'); }
    if (fem) zs(g, 12, 21, [' ttyytt ', '  t  t  ', '  y  y  ']);
    else zs(g, 15, 21, ['yy', 'tt', 'ty', 'ty', 'ty', 'ty', 'tt', ' y']);
    if (R.jk) { zp(g, 12, 25, 'd'); zp(g, 19, 25, 'd'); zp(g, 13, 26, 'Y'); zp(g, 13, 27, 'Y'); }
  }
  if (R.id) zs(g, 11, 21, ['  c', ' c ', ' c ', 'cccc', 'cRRc', 'cCmc', 'cccc']);

  if (pose === 'up') {
    var cuf = R.jk ? 'w' : 'x', A3 = jk + jk + sh;

    var ARM = [[12, 3, cuf + cuf + cuf], [13, 3, A3], [14, 3, A3], [15, 3, A3], [16, 4, A3], [17, 4, A3], [18, 5, A3], [19, 5, A3], [20, 6, A3], [21, 7, jk + jk], [22, 8, jk]];
    zs(g, 3, 9, [' sss', 'ssss', 'sssf']); zs(g, 25, 9, ['sss ', 'ssss', 'fsss']);
    ARM.forEach(function (a) { zs(g, a[1], a[0], [a[2]]); for (var i = 0; i < a[2].length; i++) zp(g, 31 - a[1] - i, a[0], a[2][a[2].length - 1 - i] === sh ? sh : a[2][a[2].length - 1 - i]); });
  } else {
    zs(g, 6, 21, [' ' + jk + jk, jk + jk + jk, sh + jk + jk, sh + jk + jk, sh + jk + jk, sh + jk + jk, 'xxx', 'sss', ' sf']);
    zs(g, 23, 21, [jk + jk + ' ', jk + jk + sh, jk + jk + sh, jk + jk + sh, jk + jk + sh, jk + jk + sh, 'xxx', 'ssf', 'sf ']);
  }

  if (fit === 'dress') {
    zs(g, 9, 29, [' JJJJJJJJJJJd ', 'JJdJJJdJJJdJJd', 'JJdJJJdJJJdJdd', ' ssss    ssss ']);
    zr(g, 10, 32, 13, 32, 's'); zr(g, 18, 32, 21, 32, 's'); zp(g, 13, 32, 'f'); zp(g, 21, 32, 'f'); zr(g, 14, 32, 17, 32, '.');
  } else if (skirt) {
    zs(g, 9, 29, [' pppppppppppa ', 'ppappappappapa', 'papppapppapppa', ' ssss    ssss ']);
    zr(g, 10, 32, 13, 32, 's'); zr(g, 18, 32, 21, 32, 's'); zp(g, 13, 32, 'f'); zp(g, 21, 32, 'f'); zr(g, 14, 32, 17, 32, '.');
  } else {
    zs(g, 10, 29, ['DDDDDcDDDDDD', 'ppppppppppaa', 'pppppp  ppaa', 'pppapp  ppaa']);
  }
  zs(g, 9, 33, [' bzbbb  bzbbb ', 'bbbbbb  bbbbbb']);
}

function zMood(g, mood, blink) {
  if (mood === 'happy') {
    zs(g, 10, 12, [' EE     EE ', 'E  E   E  E']); zs(g, 13, 15, ['MMMMMM', 'MuuuuM', ' MuuM ']); zs(g, 9, 15, ['rr']); zs(g, 21, 15, ['rr']);
  } else if (mood === 'sad') {
    zs(g, 10, 10, ['  n     n  ', ' n       n ', 'n         n']); zs(g, 11, 13, ['EE      EE', 'EC      EC']); zs(g, 11, 15, ['T', 'T']); zs(g, 14, 16, [' MM ', 'M  M']);
  } else if (mood === 'shock') {
    zs(g, 10, 11, ['CCC     CCC', 'CEC     CEC', 'CCC     CCC']); zs(g, 14, 15, [' MM ', 'MuuM', 'MuuM', ' MM ']);
  } else {
    zs(g, 10, 10, ['nnn     nnn']); zs(g, 14, 16, ['M  M', ' MM ']);
    if (blink) zs(g, 11, 14, ['EE      EE']); else zs(g, 11, 12, ['CE      CE', 'EE      EE', 'EE      EE']);
  }
}

function zFemEyes(g, mood, blink) {
  if (mood !== 'normal' && mood !== 'sad') return;
  var y = mood === 'sad' ? 12 : 11, eye = blink ? ['ssss', 'ssss', 'EEEE', ' ss '] : ['EEEE', 'ECoE', 'EooE', ' EE '];
  zs(g, 10, y, eye); zs(g, 18, y, eye);
  if (blink) { zp(g, 9, y + 2, 'E'); zp(g, 22, y + 2, 'E'); } else { zp(g, 9, y, 'E'); zp(g, 22, y, 'E'); }
  if (mood === 'sad') zs(g, 11, 16, ['T', 'T']);
  else { zs(g, 9, 15, ['rr']); zs(g, 21, 15, ['rr']); }
}
function zGlasses(g, lens) {
  [[10, 13], [18, 21]].forEach(function (a) {
    for (var x = a[0]; x <= a[1]; x++) { zp(g, x, 11, 'K'); zp(g, x, 15, 'K'); }
    for (var y = 11; y <= 15; y++) { zp(g, a[0], y, 'K'); zp(g, a[1], y, 'K'); }
    for (var y2 = 12; y2 <= 14; y2++) for (var x2 = a[0] + 1; x2 < a[1]; x2++) { var c = zat(g, x2, y2); if (c === 's' || c === 'f' || lens === 'q') zp(g, x2, y2, lens || 'g'); }
  });
  zr(g, 14, 12, 17, 12, 'K');
}

var Z_HAND = { stand: [24, 28], up: [27, 10] };
function hand(f) { return function (g, A) { f(g, A.hx, A.hy, A); }; }
var ITEM_DRAW = {

  crown: function (g) { zs(g, 9, 2, ['Y     YY     Y', 'YH   YHHY   YY', 'YYY YYYYYY YYY', 'YYYYYYYYYYYYYY', 'YRYYYYBBYYYYGY', 'FFFFFFFFFFFFFF']); },
  headset: function (g) { zs(g, 9, 1, ['  KKKKKKKKKK  ', ' K          K ', 'K            K']); zr(g, 7, 4, 7, 9, 'K'); zr(g, 24, 4, 24, 9, 'K'); zs(g, 5, 10, ['KKK', 'KmK', 'KmK', 'KmK', 'KKK']); zs(g, 24, 10, ['KKK', 'KmK', 'KmK', 'KmK', 'KKK']); zs(g, 19, 15, ['    K', '   K ', ' KK  ', 'mm   ']); },
  beanie: function (g) { zs(g, 13, 0, [' WWWW ', 'WWZWWW', ' WWWW ']); zs(g, 8, 3, ['   BBBBBBBBBB   ', '  BBBBBBBBBBBB  ', ' BBBBBBBBBBBBBBQ', ' WWWWWWWWWWWWWWZ', 'BBBBBBBBBBBBBBBQ', 'BQBQBQBQBQBQBQBQ', 'BQBQBQBQBQBQBQBQ']); },
  cap: function (g) { zs(g, 8, 2, ['    RRRRRRRR    ', '  RRRRRRRRRRRR  ', ' RRRRRWWRRRRRRI ', ' RRRRRWWRRRRRRI ', 'RRRRRRRRRRRRRRII', 'IIIIIIIIIIIIIIII', ' IIIIIIIIIIIIII ']); },
  band: function (g) { zs(g, 7, 8, ['WWWWWWWWBBWWWWWWWW', 'ZWWWWWWWBBWWWWWWWZ']); zs(g, 25, 9, ['WW  ', ' WWW', '  WW', '   W']); },
  beret: function (g) { zs(g, 8, 1, ['        V       ', '    VVVVVVVVV   ', '  VVVVVNVVVVVVV ', ' VVVVVVVVVVVVVVV', 'VVVVVVVVVVVVVVVV', ' QQQQQQQQQQQQQQ ']); },
  visor: function (g) { zs(g, 6, 8, [' LLLLLLLLLLLLLLLLLL ', 'LLLLLLLLLLLLLLLLLLLL', 'IIIIIIIIIIIIIIIIIIII']); },
  helmet: function (g) { zs(g, 8, 1, ['     YYYYYY     ', '   YYHHYYYYYY   ', '  YHHYYYWWYYYYF ', ' YHYYYYYWWYYYYYF', ' YYYYYYYYYYYYYYF', 'YYYYYYYYYYYYYYYF', 'YYYYYYYYYYYYYYYF', 'FFFFFFFFFFFFFFFF']); zr(g, 6, 9, 25, 9, 'F'); },
  goldcap: function (g) { zs(g, 8, 1, ['   YYYYYYYYYY   ', '  YHHYYYYYYYYYF  ', ' YHYYYYRRYYYYYYF ', ' YYYYYRYYRYYYYYF ', 'FFFFFFFFFFFFFFFFF', ' KKKKKKKKKKKKKKKK']); },
  halo: function (g, A) { zs(g, 9, 0, A && A.t ? ['  YYYYYYYYYY  ', ' Y          Y ', '  HHHHHHHHHH  '] : ['  HHHHHHHHHH  ', ' H          H ', '  YYYYYYYYYY  ']); zp(g, 5, 3, 'W'); zp(g, 26, 2, 'W'); zp(g, 4, 6, 'H'); },
  fedora: function (g) { zs(g, 9, 1, ['    DDD  DDD  ', '  DDDDDDDDDDDD', '  DDDDDDDDDDDD', '  DDDDDDDDDDDD', '  BBBBBBBBBBBB', '  BBBBBBBBBBBB']); zs(g, 5, 7, [' DDDDDDDDDDDDDDDDDDDD ', 'KDDDDDDDDDDDDDDDDDDDDK']); },
  laurel: function (g) { zs(g, 6, 3, ['     GG    YY    GG  ', '   GGS  GG    GG  SGG', '  GS                SG', ' GG                  GG', ' GS                  SG', 'GG                    G'].map(function (s) { return s.slice(0, 22); })); },
  horns: function (g) { zs(g, 5, 0, ['B                    B', 'BB                  BB', 'QBB                BBQ', ' QBB              BBQ ', '  QBB            BBQ  ', '   QBB          BBQ   ']); zr(g, 8, 7, 23, 8, 'K'); },

  coffee: hand(function (g, x, y, A) { zs(g, x - 1, y - 7, [A.t ? ' Z  ' : '  Z ', A.t ? '  Z ' : ' Z  ', 'WWWWW', 'WWWWZ', 'OOOOO', 'OOOOO', 'WWWWZ', 'WWWZ ']); }),
  bag: hand(function (g, x, y) { zs(g, x - 2, y + 1, ['  KKK  ', ' K   K ', 'OOOOOOO', 'OeeeeeO', 'OOOYOOO', 'OOOOOOO', 'PPPPPPP']); }),
  laptop: hand(function (g, x, y) { zs(g, x - 1, y - 7, [' mmmmmmm', ' mLLLLLm', ' mLWLLLm', ' mLLLLLm', ' mLLLLLm', ' mmmmmmm', 'ZZZZZZZZ', ' ZZZZZZ ']); }),
  umbrella: hand(function (g, x, y) { var t = Math.max(0, y - 16); zs(g, x - 4, t, ['   RRRR   ', ' RRRRRRRR ', 'RRRIRRIRRR', 'RIRRIRRIRI', ' I  I  I  ']); for (var yy = t + 5; yy <= y; yy++) zp(g, x + 1, yy, 'K'); zs(g, x - 1, y + 1, ['O O', ' O ']); }),
  plant: hand(function (g, x, y, A) { zs(g, x - 2, y - 8, [A.t ? ' G  S  ' : '  G  S ', A.t ? 'GGSGG  ' : ' GGSGG ', A.t ? 'SGGSGG ' : 'GSGGSGG', ' GGSGG ', '  GSG  ', '   S   ', 'PPPPPPP', ' PPPPe ', ' PPPPe ', '  PPe  ']); }),
  calc: hand(function (g, x, y) { zs(g, x - 1, y - 8, ['KKKKKK', 'KUUUUK', 'KUUUUK', 'KKKKKK', 'KWZWAK', 'KZWZWK', 'KWZWZK', 'KZWZWK', 'KKKKKK']); }),
  phone: hand(function (g, x, y, A) { zs(g, x - 1, y - 7, ['FYYYF', 'YLLLY', A.t ? 'YLLLY' : 'YLWLY', 'YLLLY', A.t ? 'YLWLY' : 'YLLLY', 'YLLLY', 'YYKYY', 'FYYYF']); }),
  magglass: hand(function (g, x, y) { zs(g, x - 1, y - 9, ['  KKKKK ', ' KLLLLLK', 'KLWWLLLLK'.slice(0, 8), 'KLWLLLLK', 'KLLLLLLK', ' KLLLLK ', '  KKKK  ', ' OO     ', 'OO      ']); }),
  dart: hand(function (g, x, y) { zs(g, x - 2, y - 3, ['R      ', 'RR     ', 'RRZZZZK', 'RR     ', 'R      ']); }),
  stock: hand(function (g, x, y) { var t = Math.max(0, y - 14); zs(g, x - 2, t, ['KKKKKKKK', 'KWWWWWGK', 'KWWWWGGK', 'KWWWGWWK', 'KWGGWWWK', 'KGWWWWWK', 'KKKKKKKK']); for (var yy = t + 7; yy <= y + 1; yy++) zp(g, x + 1, yy, 'O'); }),
  wand: hand(function (g, x, y, A) { zs(g, x, y - 10, A.t ? ['W     W', '  HYH  ', ' HYYYH ', ' HYYYH ', ' H   H '] : ['   W   ', '  HYH  ', 'HHYYYHH', ' HYYYH ', ' H   H ']); zs(g, x, y - 5, ['  N', '  N', ' N ', ' N ', 'N  ']); }),
  lunchbox: hand(function (g, x, y) { zs(g, x - 2, y, ['   QQ  ', 'BBBQQBB', 'BWWWWWB', 'BBBBBBB', 'BQBBBQB', 'BBBBBBB']); }),
  flag: hand(function (g, x, y, A) { var t = Math.max(0, y - 14); for (var yy = t; yy <= y + 1; yy++) zp(g, x, yy, 'K'); zp(g, x, t, 'Y'); zs(g, x + 1, t + 1, A.t ? ['BBBBB ', 'BBWWBB', 'BWWWWB', 'BBWWBB', 'BBBBBB', ' BBBBB'] : ['BBBBBB', 'BBWWBB', 'BWWWWB', 'BBWWBB', 'BBBBB ', 'BBBB  ']); }),
  plane: hand(function (g, x, y) { zs(g, x - 1, y - 6, ['      W', '    WWW', '  WWWZW', 'WWWWZW ', '  ZZW  ', '   W   ']); }),
  pen: hand(function (g, x, y) { zs(g, x, y - 7, ['    Y', '   DY', '  DD ', ' ZD  ', ' D   ', 'D    ']); }),

  idcard: function (g) { zs(g, 10, 21, ['  B     B  ', '   B   B   ', '    BBB    ']); zs(g, 13, 24, ['WWWWW', 'RRRRR', 'WmmWW', 'WmmZW', 'WWWWW']); },
  glasses: function (g) { zGlasses(g, 'g'); },
  shades: function (g) { zGlasses(g, 'q'); zp(g, 11, 12, 'Z'); zp(g, 19, 12, 'Z'); },
  goldtie: function (g, A) { if (A && A.alone) zs(g, 14, 21, ['YYYY', ' YY ', ' YF ', ' YF ', ' YF ', ' YY ', '  Y ']); },
  monocle: function (g) { zs(g, 17, 10, [' YYYY ', 'Y    Y', 'Y    Y', 'Y    Y', 'Y    Y', ' YYYY ', '     Y', '     Y', '    Y ', '    Y ']); },
  bandage: function (g) { zs(g, 18, 15, ['XXXXX', 'XeXeX', 'XXXXX']); },
  starpin: function (g) { zs(g, 9, 22, ['  Y  ', ' YYY ', 'YYHYY', ' YFY ', ' Y Y ']); },
  goggles: function (g) { zr(g, 6, 12, 25, 13, 'A'); zs(g, 9, 10, ['KKKKKK  KKKKKK', 'KUUWUK  KUUWUK', 'KUUUUKKKKUUUUK', 'KUUUUK  KUUUUK', 'KKKKKK  KKKKKK']); },
  eyepatch: function (g, A) { if (!(A && A.alone)) { zr(g, 7, 10, 17, 10, 'q'); zr(g, 22, 11, 24, 11, 'q'); } zs(g, 17, 10, [' qqqq ', 'qqqqqq', 'qqZqqq', 'qqqqqq', ' qqqq ']); },
  pin: function (g) { zs(g, 19, 23, ['YY', 'YB']); },
  scarf: function (g) { zs(g, 10, 19, ['VVVVVVVVVVVV', 'VNVVNVVNVVNV', 'VVVVVVVVVVVV']); zs(g, 18, 22, ['VV', 'NV', 'VV', 'NV', 'VV', 'V V']); },
  pillow: function (g) { zs(g, 7, 17, ['XX              XX', 'XXe            eXX', 'XXXe          eXXX', ' XXXXXXXXXXXXXXXX ', '  eeeeeeeeeeeeee  ']); },
  rosette: function (g) { zs(g, 8, 21, [' BBB ', 'BBYBB', 'BYYYB', 'BBYBB', ' BBB ', ' B B ', ' B B ']); },
  medal: function (g) { zs(g, 12, 21, ['B      B', ' R    R ', '  B  B  ', '  YYYY  ', ' YFYYFY ', ' YYWWYY ', ' YFYYFY ', '  YYYY  ']); },

  raincap: function (g) { zs(g, 7, 1, ['     YYYYYYYY     ', '   YYYYYYYYYYYY   ', '  YYYHYYYYYYYYYF  ', '  YYYYYYYYYYYYYF  ', ' YYYYYYYYYYYYYYYF ', 'FFFFFFFFFFFFFFFFFF', 'FFFFFFFFFFFFFFFFFF']); },
  bikehelm: function (g, A) { zs(g, 8, 1, ['    UUUUUUUU    ', '  UUWUUUUUUWUU  ', ' UUUUUKUUKUUUUU ', 'UUUUUUUUUUUUUUUU', 'UUUUUUUUUUUUUUUU', 'DDDDDDDDDDDDDDDD']); if (!(A && A.alone)) { zr(g, 8, 7, 8, 12, 'K'); zr(g, 23, 7, 23, 12, 'K'); } },
  conehat: function (g) { zs(g, 11, 0, ['    A    ', '   AAA   ', '   WWW   ', '  AAAAA  ', '  WWWWW  ', ' AAAAAAA ', 'KKKKKKKKK']); },
  ticket: hand(function (g, x, y) { zs(g, x - 1, y - 6, ['RRRRRRR', 'RWWWWWR', 'RRRRRRR', 'RYYRRRR', 'RRRRRRR']); }),
  tteok: hand(function (g, x, y) { zs(g, x, y - 10, ['  BB ', ' BQBB', '  BB ', ' BQBB', '  BB ', ' BQBB', '  O  ', '  O  ', '  O  ', '  O  ']); }),
  balloon: hand(function (g, x, y, A) { var t = Math.max(0, y - 17 - (A.t ? 1 : 0)); zs(g, x - 2, t, [' NNN ', 'NNWNN', 'NNNNN', 'NNNNN', ' NNN ', '  N  ']); for (var yy = t + 6; yy <= y; yy++) zp(g, x, yy, 'K'); }),
  moneybag: hand(function (g, x, y) { zs(g, x - 2, y - 1, [' K K  ', '  K   ', ' eeee ', 'eeYYee', 'eYeeee', 'eeYYee', 'eeeeYe', 'eYYYee', ' eeee ']); }),
  mask: function (g) { zs(g, 10, 14, ['WWWWWWWWWWWW', 'WWWZWWWWZWWW', 'WWWWWWWWWWWW', ' WWWWWWWWWW ']); zp(g, 9, 14, 'Z'); zp(g, 22, 14, 'Z'); },
  sweat: function (g) { zs(g, 22, 7, [' L', 'LL', 'LL', '  ', ' L', 'LL']); zs(g, 8, 9, ['L', 'L']); },
  clockpin: function (g) { zs(g, 18, 22, [' YYY ', 'YWKWY', 'YWKKY', 'YWWWY', ' YYY ']); },

  nameplate: hand(function (g, x, y) { zs(g, x - 3, y - 5, ['DDDDDDDD', 'DYYYYYYD', 'DYqqqqYD', 'DYYYYYYD', 'DDDDDDDD', ' FF  FF ']); }),
  book: hand(function (g, x, y) { zs(g, x - 1, y - 7, ['IRRRRR', 'IRWWWR', 'IRYYWR', 'IRWWWR', 'IRYYYR', 'IRWWWR', 'IRRRRR']); }),
  flamepin: function (g) { zs(g, 18, 21, ['  A  ', ' AYA ', 'AYHYA', 'ABYBA', ' AAA ']); },
  strawhat: function (g) { zs(g, 9, 1, ['    XXXXXX    ', '  XXXXXXXXXX  ', '  XXXeXXXXXX  ', '  BBBBBBBBBB  ']); zs(g, 5, 5, [' XXXXXXXXXXXXXXXXXXXX ', 'XXXeXXXXXXXXXXXXXeXXXX', ' eeeeeeeeeeeeeeeeeeee ']); },
  photo: hand(function (g, x, y) { zs(g, x - 3, y - 6, ['OOOOOOO', 'OLLLLLO', 'OLsLsLO', 'OLsLsLO', 'OGGGGGO', 'OOOOOOO']); }),
  dumbbell: hand(function (g, x, y) { zs(g, x - 3, y - 1, ['KK   KK', 'KKmmmKK', 'KK   KK']); }),
  cat: hand(function (g, x, y, A) { zs(g, x - 3, y - 6, ['A   A  ', 'AA AA  ', 'AAAAA  ', A.t ? 'AqAqA A' : 'AqAqA  ', A.t ? 'AANAAA ' : 'AANAA A', A.t ? 'AAAAAA ' : 'AAAAAAA', ' A A A ']); }),
  sprout: function (g) { zs(g, 15, 0, [' G  G', 'GGSGG', '  S  ', '  S  ']); },
  bouquet: hand(function (g, x, y) { zs(g, x - 2, y - 8, ['N W N', 'WNWNW', 'NWNWN', ' GSG ', '  S  ', '  S  ']); }),
  triple: function (g) { zs(g, 10, 22, ['B   R   G', 'BB  RR  GG', 'Y   Y   Y']); }
};

function zCirc(x, y, cx, cy, r) { return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r; }
var BG_DRAW = {
  forkbg: { p: { 1: '#dff1ff', 2: '#a7d58a', 3: '#ead9ab', 4: '#ffffff', 5: '#8cc06f' }, f: function (x, y, w, h) {
    var top = Math.floor(h * .42), cx = (w - 1) / 2;
    if (y < top) return ((x + 3) % 9 < 4 && (y === 4 || y === 5)) || ((x + 7) % 13 < 5 && y === 9) ? '4' : '1';
    var t = (y - top) / (h - top), d = Math.abs(Math.abs(x - cx) - t * w * .32);
    return d <= .8 + t * 1.6 ? '3' : (x * 3 + y) % 11 === 0 ? '5' : '2'; } },
  seasons: { p: { 1: '#ffd6e8', 2: '#c9f2a0', 3: '#ffcf9a', 4: '#dbe8ff', 5: '#ff8fc7', 6: '#3f9a4a', 7: '#e0761f', 8: '#ffffff', 9: '#b9bcae' }, f: function (x, y, w, h) {
    if (y >= h - 4) return '9';
    var q = Math.min(3, Math.floor(x / (w / 4))), dot = (x * 7 + y * 5) % 13 === 0;
    return dot ? ['5', '6', '7', '8'][q] : String(q + 1); } },
  office: { p: { 1: '#e9edf2', 2: '#9aa7b8', 3: '#bfe3ff', 4: '#d6eefe', 5: '#3f9a4a', 6: '#c0602b', 7: '#b8916a', 8: '#9c7652' }, f: function (x, y, w, h) {
    if (y >= h - 6) return (x + (y % 2) * 3) % 7 === 0 ? '8' : '7';
    if (x >= 1 && x <= 4 && y >= h - 13) return y >= h - 9 ? (x === 1 || x === 4 ? '.' : '6') : ((x + y) % 2 ? '5' : '5');
    if (x >= 6 && x <= w - 7 && y >= 3 && y <= h - 12) { if (x === 6 || x === w - 7 || y === 3 || y === h - 12 || x === Math.floor(w / 2) || y === Math.floor((h - 9) / 2)) return '2'; return (x + y) % 9 === 0 ? '4' : '3'; }
    return '1'; } },
  dawn: { p: { 1: '#ff9fbd', 2: '#ffc0a8', 3: '#ffe0a0', 4: '#fff3b0', 5: '#5a4a6a', 6: '#ffd36b' }, f: function (x, y, w, h) {
    var sky = y < h * .3 ? '1' : y < h * .55 ? '2' : '3';
    var bh = h - 7 - ((x * 5 + 3) % 7) - (x % 9 < 3 ? 4 : 0);
    if (y >= bh) return (y - bh) % 3 === 1 && x % 2 === 0 && y < h - 1 ? '6' : '5';
    if (zCirc(x, y, w * .72, h * .55, 5)) return '4';
    return sky; } },
  night: { p: { 1: '#16204a', 2: '#ffffff', 3: '#f6f0c4', 4: '#2b3566', 5: '#ffd36b', 6: '#0e1430' }, f: function (x, y, w, h) {
    var bh = h - 6 - ((x * 7 + 1) % 9) - (x % 11 < 4 ? 5 : 0);
    if (y >= bh) return (y - bh) % 3 === 1 && (x % 3 === 1) && ((x * 13 + y * 7) % 5) ? '5' : y === bh ? '4' : '6';
    if (zCirc(x, y, w - 7, 6, 3.2)) return zCirc(x, y, w - 6, 5, 1) ? '4' : '3';
    return (x * 7 + y * 13) % 29 === 0 ? '2' : '1'; } },
  spot: { p: { 1: '#1d1d26', 2: '#fff3b0', 3: '#b3263a', 4: '#7a1726', 5: '#6b4a2b', 6: '#ffe680' }, f: function (x, y, w, h) {
    if (y >= h - 5) return y === h - 5 ? '6' : (x % 4 === 0 ? '5' : '5');
    if (x <= 3) return x % 2 ? '4' : '3'; if (x >= w - 4) return x % 2 ? '3' : '4';
    if (y <= 1) return '3';
    return Math.abs(x - (w - 1) / 2) <= 2 + y * .45 ? '2' : '1'; } },
  bossbg: { p: { 1: '#a3283a', 2: '#2a0b12', 3: '#ffcf3d', 4: '#6b1222', 5: '#e8412c' }, f: function (x, y, w, h) {
    var cx = Math.floor(w / 2);
    if (x >= cx - 6 && x <= cx + 6 && y >= 6) return (y - 6) % 3 === 1 && (x - cx) % 3 !== 0 ? '3' : '2';
    if ((x === cx - 6 || x === cx - 7) && y >= 2 && y < 6) return '5'; if ((x === cx + 6 || x === cx + 7) && y >= 2 && y < 6) return '5';
    var bh = h - 8 - ((x * 5) % 6);
    if (y >= bh) return '4';
    return y < h * .4 ? '1' : '4' === '4' && y % 2 ? '1' : '1'; } },
  gold: { p: { 1: '#ffcf3d', 2: '#ffe680', 3: '#e0a800', 4: '#ffffff' }, f: function (x, y, w, h) {
    var a = Math.atan2(y - h * .45, x - w / 2), k = Math.floor((a + Math.PI) / (Math.PI / 8));
    if ((x * 11 + y * 5) % 37 === 0) return '4';
    return k % 2 ? '2' : (y > h - 4 ? '3' : '1'); } },
  hof: { p: { 1: '#15160f', 2: '#ffcf3d', 3: '#3f9a4a', 4: '#fff3b0', 5: '#c99a00', 6: '#26281d' }, f: function (x, y, w, h) {
    if (x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2) return (x + y) % 2 ? '2' : '5';
    if ((x <= 4 && y <= 4) || (x >= w - 5 && y <= 4)) return (x + y) % 2 ? '3' : '1';
    if ((x * 5 + y * 3) % 23 === 0) return '4';
    return y % 4 === 0 ? '6' : '1'; } },
  hanriver: { p: { 1: '#bfe3ff', 2: '#dff1ff', 3: '#3f7fbf', 4: '#d6eeff', 5: '#8796ab', 6: '#9fb4c8', 7: '#7d8088' }, f: function (x, y, w, h) {
    var rv = Math.floor(h * .58), bm = Math.floor(h * .46);
    if (y >= h - 5) return '7';
    if (y >= rv) return (x * 7 + y * 3) % 11 === 0 ? '4' : '3';
    if (y === bm || (x % 8 === 0 && y > bm)) return '5';
    if (y >= rv - 2 - ((x * 5) % 7) - (x % 9 < 3 ? 4 : 0)) return '6';
    return y < h * .3 ? '1' : '2'; } },
  rainbow: { p: { 1: '#bfe3ff', 2: '#e8412c', 3: '#ff9a1f', 4: '#ffcf3d', 5: '#3f9a4a', 6: '#3f6fb5', 7: '#8e5bd6', 8: '#ffffff', 9: '#7fbf5a' }, f: function (x, y, w, h) {
    if (y >= h - 5) return '9';
    if (zCirc(x, y, 5, h - 8, 4) || zCirc(x, y, 9, h - 7, 3) || zCirc(x, y, w - 7, h - 9, 4) || zCirc(x, y, w - 3, h - 8, 3)) return '8';
    var d = Math.sqrt((x - w / 2) * (x - w / 2) + (y - h * .95) * (y - h * .95)), k = Math.floor((h * .85 - d) / 2);
    return k >= 0 && k < 6 ? String(k + 2) : '1'; } },
  metro: { p: { 1: '#f6f6f2', 2: '#36b5a5', 3: '#e8412c', 4: '#3f6fb5', 5: '#ff9a1f', 6: '#8e5bd6', 7: '#ffffff', 8: '#1b1d18' }, f: function (x, y, w, h) {
    var on = y === 8 ? '2' : y === h - 10 ? '3' : x === 6 ? '4' : x === w - 7 ? '5' : x - y === 4 || x - y === 5 ? '6' : '';
    if (on && (x + y) % 7 === 0) return '8';
    return on || '1'; } }
};
function zPose(mood) { return mood === 'happy' ? 'up' : 'stand'; }
function zRows(rk, mood, o) {
  o = o || {};
  var R = Z_RANK[Math.max(0, Math.min(4, rk | 0))], L = lookOf(o), b = baseOf(L), hr = hairOf(L), fem = b === 'f', pose = zPose(mood), g = zg();
  var H = Z_HAND[pose], A = { hx: H[0], hy: H[1], pose: pose, t: o.t ? 1 : 0 };
  zHairBack(g, b, hr);
  zFace(g, faceOf(L));
  if (!o.hat) zHair(g, b, hr); else { zHair(g, b, hr); zs(g, 5, 2, ['    kkkkkkkkkkkkkk    ', '   kkkkkkkkkkkkkkkk   ', '   kkkkkkkkkkkkkkkk   ', '   kkkkkkkkkkkkkkkk   ', '   vvvvvvvvvvvvvvvv   ', '   kkkkkkkkkkkkkkkk   ', ' kkkkkkkkkkkkkkkkkkkk ', 'vvvvvvvvvvvvvvvvvvvvvv']); }
  var fit = fitOf(L);
  zBody(g, R, fem, fem && L.bottom === 'skirt' && fit !== 'dress', pose, fit, fit !== 'suit' || !!R.jk || colOf(L) !== 'auto');
  zMood(g, mood, o.blink);
  if (fem) zFemEyes(g, mood, o.blink);
  if (R.gl && L.acc !== 'shades' && L.acc !== 'goggles' && L.acc !== 'glasses') zGlasses(g, 'g');
  ['acc', 'hand', 'hat'].forEach(function (slot) { var f = ITEM_DRAW[L[slot]]; if (f && !(slot === 'hat' && o.hat)) f(g, A); });
  return g.map(function (r) { return r.join(''); });
}
function zPal(rk, mood, o) {
  var R = Z_RANK[Math.max(0, Math.min(4, rk | 0))], L = lookOf(o), hc = R.h, tie = L.acc === 'goldtie' ? '#ffcf3d' : R.tie;
  var fit = fitOf(L), ck = colOf(L), col = colHex(ck);
  var jk = fit === 'semi' ? (col || '#8fb3d9') : fit === 'dress' ? (col || '#2c3e66') : (col || R.jk || '#f4f4f4');
  var pt = fit === 'semi' ? (ck === 'beige' || ck === 'brown' ? '#2a2f45' : '#c8b38c') : col ? shade(col, -.25) : '#2a2f45';
  var p = { h: hc, i: shade(hc, -.28), j: shade(hc, .35), n: shade(hc, -.35), s: '#f6cfa6', f: '#e2aa82', E: '#1b1b22', o: '#7a4a32', M: '#7a2a2a', u: '#d0505a', r: '#ff9b9b', T: '#6fb6ff',
    w: '#f6f6f2', x: '#d3d6de', t: tie, y: shade(tie, -.3), J: jk, d: shade(jk, -.3), l: shade(jk, .25), p: pt, a: shade(pt, -.3), b: '#191919', z: '#5a5a5a', c: '#ffcf3d', g: '#cfe9ff', k: '#6b4a2b', v: '#3d2a18',
    Y: '#ffcf3d', F: '#c99a00', H: '#fff3a0', K: '#3a3f4a', B: '#e8412c', Q: '#a8281b', W: '#f6f6f2', Z: '#c9ced6', O: '#8a5a1c', e: '#b98a5a', L: '#9fd3ff', m: '#6a6f7c',
    R: '#5b7cff', I: '#3550b8', G: '#3f9a4a', S: '#2a6b33', P: '#c0602b', C: '#ffffff', q: '#111111', V: '#8e5bd6', N: '#ff8fc7', D: '#2b2f45', A: '#ff9a1f', U: '#36b5a5', X: '#f0c6a0' };
  var G = o && o.bg && BG_DRAW[L.bg];
  if (G) for (var k in G.p) p[k] = G.p[k];
  if (o && o.sil) for (var k2 in p) p[k2] = '#a3a69b';
  return p;
}

var Z_ANIM_IT = { coffee: 1, plant: 1, wand: 1, flag: 1, balloon: 1, phone: 1, cat: 1, halo: 1 };

function zRunFrames(rows) {
  var G0 = rows.map(function (r) { return r.split(''); }), H = G0.length, W = G0[0].length;
  var cp = function () { return G0.map(function (r) { return r.slice(); }); };
  var blit = function (g, x0, y0, x1, y1, dx, dy) {
    var px = [], x, y;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { px.push([x, y, G0[y][x]]); g[y][x] = '.'; }
    px.forEach(function (p) { var nx = p[0] + dx, ny = p[1] + dy; if (p[2] !== '.' && ny >= 0 && ny < H && nx >= 0 && nx < W) g[ny][nx] = p[2]; });
  };
  var fr = function (leg, arm, bob) {
    var g = cp();
    if (arm) blit(g, arm === 'L' ? 2 : 23, 21, arm === 'L' ? 8 : 29, 30, 0, -3);
    if (leg) blit(g, leg === 'L' ? 9 : 16, 30, leg === 'L' ? 15 : 22, 34, leg === 'L' ? 1 : -1, -3);
    for (var y = 0; y <= 28; y++) { g[y].pop(); g[y].unshift('.'); }
    var out = g.map(function (r) { return r.join(''); });
    return bob ? out.slice(1).concat([out[0].replace(/./g, '.')]) : out;
  };
  return [fr('L', 'R', 1), fr('', '', 0), fr('R', 'L', 1), fr('', '', 0)];
}

function zFrames(rk, mood, o, blinkSet) {
  var r = zRows(rk, mood, o), L = lookOf(o), G = o && o.bg && BG_DRAW[L.bg], blank = r[0].replace(/./g, '.');
  var tOn = Z_ANIM_IT[L.hand] || Z_ANIM_IT[L.hat], o1 = {}; for (var k1 in (o || {})) o1[k1] = o[k1]; o1.t = 1;
  var down = function (rr) { return [blank].concat(rr.slice(0, 29), rr.slice(30)); }, f2 = down(tOn ? zRows(rk, mood, o1) : r), F0 = [r, f2];
  if (blinkSet) {
    var bo = {}; for (var kk in (o || {})) bo[kk] = o[kk]; bo.blink = 1; bo.t = 1;
    var rb = zRows(rk, mood, bo), b2 = down(rb);
    F0 = [r, r, f2, f2, r, r, f2, f2, r, r, f2, f2, r, rb, b2, f2];
  }
  var F = F0.map(function (rows) { return PX.outline(o && o.head ? rows.slice(0, 25) : rows); });
  if (!G) return F;
  return F.map(function (rows) { var h = rows.length, w = rows[0].length; return rows.map(function (row, y) { return row.replace(/\./g, function (m, x) { return G.f(x, y, w, h); }); }); });
}

var ZCACHE = {};
function zorro(rk, mood, s, anim, o) {
  mood = mood || 'normal';
  var name = 'z' + rk + mood + (o && o.hat ? 'h' : '') + (o && o.head ? 'H' : '') + '|' + lookKey(lookOf(o), o);
  var F = ZCACHE[name] || (ZCACHE[name] = { f: zFrames(rk, mood, o), p: zPal(rk, mood, o) });
  if (anim === 'idle' && mood === 'normal' && !(o && o.head)) {
    if (!F.f16) F.f16 = zFrames(rk, mood, o, 1);
    return PX.sheet(name + 'B', F.f16, F.p, s, 'zr idle');
  }
  if (anim === 'walk') {
    if (!F.fw) F.fw = zRunFrames(zRows(rk, mood, o)).map(function (f) { return PX.outline(f); });
    return PX.sheet(name + 'W', F.fw, F.p, s, 'zr walk');
  }
  if (anim === 'oops') {
    if (!F.fo) { var r0 = F.f[0], bl = r0[0].replace(/./g, '.'), dn = function (rr, n) { return Array(n + 1).join('.').split('').map(function () { return bl; }).concat(rr.slice(0, 31 - n), rr.slice(31)); }; F.fo = [r0, dn(r0, 1), dn(r0, 2), dn(r0, 2)]; }
    return PX.sheet(name + 'O', F.fo, F.p, s, 'zr oops');
  }
  if (anim === 'idle' || anim === 'jump') return PX.sheet(name + 'S', F.f, F.p, s, 'zr ' + anim);
  return PX.img(name, F.f[0], F.p, s, 'zr');
}

function itemArt(id, s, cls, maxPx) {
  var it = ITEM_BY[id]; if (!it || !PX.ok) return '';
  var sil = cls === 'sil', key = 'it|' + id + (sil ? '|sil' : ''), c = ZCACHE[key];
  if (!c) {
    var g = zg(), pal = zPal(2, 'normal', { look: {} });
    if (it[1] === 'bg') { var B = BG_DRAW[id], rows = []; for (var y = 0; y < 22; y++) { var row = ''; for (var x = 0; x < 26; x++) row += B.f(x, y + 6, 26, 28); rows.push(row); } for (var k in B.p) pal[k] = B.p[k]; c = { r: rows, p: pal }; }
    else {
      ITEM_DRAW[id](g, { hx: Z_HAND.stand[0], hy: Z_HAND.stand[1], pose: 'stand', alone: 1 });
      if (id === 'glasses') zGlasses(g, 'g');
      var rs = g.map(function (r) { return r.join(''); }), y0 = rs.length, y1 = -1, x0 = ZW, x1 = -1;
      rs.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] !== '.') { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
      if (id === 'glasses' || id === 'shades') rs = rs.map(function (r) { return r.replace(/[sfEC]/g, '.'); });
      c = { r: y1 < 0 ? ['.'] : PX.outline(rs.slice(y0, y1 + 1).map(function (r) { return r.slice(x0, x1 + 1); })), p: pal };
    }
    if (sil) { var gp = {}; for (var k3 in c.p) gp[k3] = '#a3a69b'; c = { r: c.r, p: gp }; }
    ZCACHE[key] = c;
  }
  var big = Math.max(c.r.length, c.r[0].length), se = big <= 9 ? s * 2 : big <= 14 ? s * 1.5 : s;
  if (maxPx) se = Math.max(1, Math.min(se, Math.floor(maxPx / c.r[0].length * 2) / 2));
  return PX.img(key, c.r, c.p, se, 'itart ' + (cls || ''));
}





var TOD_KO = { morning: '아침', day: '낮', evening: '저녁', night: '밤' };
var TOD_SKY = {
  morning: ['#ffe2c4', '#fff4e3', '#e9c9b5', '#d9b29d', '#f6dccb', '#ffe9a8'],
  day: ['#bfe2ff', '#eef7ff', '#c7d6e6', '#a9bccf', '#dfe9f3', '#f4f8fb'],
  evening: ['#6b5aa6', '#ff9f6b', '#8a6a9c', '#5c4a78', '#7d6a95', '#ffcf6b'],
  night: ['#141a33', '#2a3358', '#232a4a', '#181d36', '#262d4f', '#ffd76b']
};
function todNow() {
  var o = /[?&]tod=(morning|day|evening|night)/.exec(location.search || ''), f = store.get('slp-tod');
  if (o) return o[1]; if (MOCK && TOD_SKY[f]) return f;
  var h = new Date(Date.now() + 9 * 3600e3).getUTCHours();
  return h >= 6 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
}
var SCN = {};
function sceneURL(kind, tod) {
  var key = kind + '|' + tod; if (SCN[key]) return SCN[key];
  var W = 160, H = 56, c = document.createElement('canvas'); c.width = W; c.height = H;
  var g = c.getContext('2d'), S = TOD_SKY[tod], r = PC.rng('scene|' + kind), night = tod === 'night', eve = tod === 'evening';
  var px = function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); };

  for (var i = 0; i < 7; i++) { var t = i / 6; g.fillStyle = mixHex(S[0], S[1], t); g.fillRect(0, i * 6, W, 6); }
  px(0, 42, W, H - 42, S[1]);

  if (night) { for (var s = 0; s < 22; s++) px(Math.floor(r() * W), Math.floor(r() * 26), 1, 1, r() < .3 ? '#ffffff' : '#9fb0e0'); ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'].forEach(function (row, yy) { row.split('').forEach(function (ch, xx) { if (ch === '#') px(128 + xx, 5 + yy, 1, 1, '#fff3c4'); }); }); }
  else if (tod === 'morning') { px(20, 20, 9, 9, '#ffd27a'); px(19, 22, 11, 5, '#ffd27a'); }
  else if (eve) { px(118, 26, 13, 13, '#ffcf6b'); px(116, 29, 17, 7, '#ffcf6b'); }
  else { px(132, 6, 8, 8, '#fff6c9'); }
  if (!night) [[16, 8], [70, 4], [104, 14]].forEach(function (q, k) { if (k === 2 && eve) return; var cl = eve ? '#e9a7b8' : '#ffffff'; px(q[0], q[1] + 2, 18, 3, cl); px(q[0] + 4, q[1], 9, 3, cl); });

  for (var x = 0; x < W;) { var bw = 8 + Math.floor(r() * 10), bh = 10 + Math.floor(r() * 16); px(x, H - bh - 4, bw, bh + 4, S[2]); x += bw + Math.floor(r() * 3); }
  var bldg = function (x0, w, h) {
    px(x0, H - h, w, h, S[3]);
    for (var yy = H - h + 3; yy < H - 4; yy += 4) for (var xx = x0 + 2; xx < x0 + w - 2; xx += 3) px(xx, yy, 1, 2, night || eve ? (r() < .45 ? S[5] : S[4]) : S[4]);
  };
  if (kind === 'line') {
    bldg(4, 30, 34); bldg(122, 34, 30); px(52, 22, 56, 34, S[3]); px(60, 26, 40, 6, night ? S[5] : S[4]);
    px(70, 38, 20, 18, night ? '#3a4470' : '#b8d4ea'); px(79, 38, 2, 18, S[3]);
    for (var p = 0; p < 5; p++) { var sx = 14 + p * 34; px(sx, 46, 2, 10, '#c9b06b'); px(sx - 1, 45, 4, 2, '#e8cf7f'); if (p < 4) for (var k2 = 0; k2 < 32; k2++) px(sx + 2 + k2, 47 + Math.round(Math.sin(k2 / 32 * Math.PI) * 3), 1, 1, '#c8423a'); }
  } else if (kind === 'today') {
    bldg(0, 26, 26); bldg(30, 20, 34); bldg(110, 22, 30); bldg(136, 24, 22);
    var qm = ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'];
    [[60, 6], [86, 14]].forEach(function (o) { qm.forEach(function (row, yy) { row.split('').forEach(function (ch, xx) { if (ch === '#') px(o[0] + xx * 2, o[1] + yy * 2, 2, 2, night ? '#ffd76b' : '#7a6fd0'); }); }); });
  } else if (kind === 'sniper') {
    bldg(10, 22, 44); px(20, 4, 1, 8, S[3]); px(19, 3, 3, 1, '#e8412c'); bldg(48, 18, 36); bldg(96, 26, 46); px(108, 2, 1, 8, S[3]); px(107, 1, 3, 1, '#e8412c'); bldg(132, 20, 30);
    px(0, H - 6, W, 6, night ? '#20253f' : '#9aa1a8'); for (var e = 0; e < W; e += 10) px(e, H - 7, 6, 1, night ? '#2c3354' : '#b4bac0');
  } else if (kind === 'road') {
    for (var hx = 0; hx < W; hx++) { var hh = 8 + Math.round(Math.sin(hx / 22) * 4 + Math.sin(hx / 9) * 2); px(hx, H - hh, 1, hh, night ? '#1d3a2e' : eve ? '#6b7a4a' : '#9cc58a'); }
    px(0, H - 5, W, 5, night ? '#2a2f45' : '#6f7268'); for (var lx = 4; lx < W; lx += 14) px(lx, H - 3, 7, 1, '#f2f3ee');
    [[30, 'R'], [124, 'L']].forEach(function (s) { px(s[0], H - 22, 2, 17, '#7a5a3a'); px(s[0] - 8, H - 24, 18, 6, '#3f9a4a'); px(s[1] === 'R' ? s[0] + 10 : s[0] - 10, H - 23, 2, 4, '#3f9a4a'); px(s[0] - 6, H - 22, 14, 2, '#d8f0c8'); });
  } else if (kind === 'cup') {
    px(0, H - 14, W, 14, night ? '#262c4a' : '#8f96a3');
    for (var cx = 0; cx < W; cx += 3) px(cx, H - 14 - (cx % 6 ? 1 : 2), 2, 2, ['#e8412c', '#4f7dff', '#ffcf3d', '#3f9a4a', '#ff5bb0'][Math.floor(r() * 5)]);
    [[14], [140]].forEach(function (q) { px(q[0], 8, 2, H - 22, S[3]); px(q[0] - 5, 4, 12, 6, S[3]); for (var lj = 0; lj < 4; lj++) px(q[0] - 4 + lj * 3, 5, 2, 2, night || eve ? '#fff6c9' : '#e6e9ee'); });
    if (night) { g.globalAlpha = .18; g.fillStyle = '#fff6c9'; g.beginPath(); g.moveTo(15, 10); g.lineTo(50, H - 14); g.lineTo(-20, H - 14); g.fill(); g.beginPath(); g.moveTo(141, 10); g.lineTo(176, H - 14); g.lineTo(106, H - 14); g.fill(); g.globalAlpha = 1; }
  } else if (kind === 'run') {
    bldg(0, 30, 30); bldg(40, 22, 24); bldg(118, 40, 32);
    px(70, H - 26, 40, 2, '#4f7dff'); px(72, H - 24, 2, 24, '#6f7268'); px(106, H - 24, 2, 24, '#6f7268'); px(76, H - 20, 26, 10, night ? '#2c3354' : '#cfe3f3');
    px(140, 14, 2, H - 14, '#55594f'); px(134, 13, 9, 2, '#55594f'); if (night || eve) { px(134, 15, 4, 2, '#fff2a8'); g.globalAlpha = .16; g.fillStyle = '#fff2a8'; g.fillRect(126, 17, 20, H - 17); g.globalAlpha = 1; }
  } else { bldg(6, 24, 30); bldg(60, 30, 38); bldg(120, 28, 28); }
  return (SCN[key] = 'url(' + c.toDataURL() + ')');
}
function mixHex(a, b, t) {
  var p = function (h, i) { return parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); };
  return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16)).slice(-2); }).join('');
}

var SCENE_OF = { line: 'line', today: 'today', sniper: 'sniper', road: 'road', cup: 'cup', run: 'run', hall: 'city', higher: 'city' };
function applyTod() {
  if (!PX.ok) return;
  var tod = todNow(); document.documentElement.setAttribute('data-tod', tod);
  Object.keys(SCENE_OF).forEach(function (k) { var el = $('p-' + k); if (el) try { el.style.setProperty('--px-scene', sceneURL(SCENE_OF[k], tod)); } catch (e) {} });
  try { document.documentElement.style.setProperty('--px-scene', sceneURL('city', tod)); } catch (e) {}
}

function todPicker() {
  if (!MOCK || !PX.ok) return '';
  var cur = todNow();
  return '<div class="todpk" role="group" aria-label="미리보기 전용: 시간대 바꿔 보기"><span>미리보기 전용 · 시간대</span>' + Object.keys(TOD_KO).map(function (k) { return '<button type="button" class="btn sm' + (k === cur ? '' : ' ghost') + '" data-tod="' + k + '">' + TOD_KO[k] + '</button>'; }).join('') + '</div>';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.todpk [data-tod]'); if (!b) return;
  store.set('slp-tod', b.dataset.tod); applyTod(); if (typeof renderLobby === 'function') renderLobby();
});



var MOCK = !API_BASE;
if (MOCK) try { globalThis.__ROAD3 = true; globalThis.__V6 = true; } catch (e) {}
function mockTag() { return MOCK ? ' <span class="tag">미리보기용 예시</span>' : ''; }
function call(path, body) {
  if (MOCK) return Promise.resolve(mock(path, body));
  var opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  return fetch(API_BASE + path, opt).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { j.status = r.status; throw j; } return j; });
  }, function () { throw { error: '서버에 연결하지 못했어요', net: 1 }; });
}


var mockCache = {};
function mockNicks(week) { var r = PC.rng('mocknick|' + week), a = [], seen = {}; while (a.length < 24) { var n = PC.makeNick(r); if (!seen[n]) { seen[n] = 1; a.push(n); } } return a; }
function mockDay(day, game) {
  var key = day + '|' + game; if (mockCache[key]) return mockCache[key];
  var rows = [], pz = game === 'road' ? PC.genRoad(day, ctx) : null;
  mockNicks(PC.isoWeek(day)).forEach(function (n, i) {
    var r = PC.rng('mock|' + key + '|' + n); if (r() > .72) return;
    var row = { nick: n, dev: 'mock' + i, ts: i, lk: mockLook(r) };
    if (game === 'higher') { var ok = 4 + Math.floor(r() * 7); row.aux = ok; row.score = ok * 100 + Math.round(ok * (6 + r() * 12)); }
    else if (game === 'today' && PC.genToday(day, ctx).v === 4) { var g2 = r() < .08 ? 0 : 1 + Math.floor(r() * PC.T4_TRIES); row.aux = g2; row.score = g2 ? PC.today4Pts(g2 - 1) : 0; }
    else if (game === 'cup') { row.aux = 5 + Math.floor(r() * 11); row.score = Math.round(row.aux / 15 * 820 / 20) * 20 + Math.floor(r() * 16) * PC.CUP_EYE; }
    else if (game === 'today') { var op = r() < .18 ? 0 : 1 + Math.floor(r() * PC.TODAY_CLUES), ms = op ? Math.floor(r() * Math.min(PC.TODAY_PICKS, op)) : 0; row.aux = op; row.score = op ? PC.todayPts(op, ms) : 0; }
    else if (game === 'sniper') { var s = 0, errs = []; for (var q = 0; q < 5; q++) { var e = Math.round((r() - .42) * 40 * 10) / 10; errs.push(e); s += PC.sniperPts(e); } row.score = s; row.aux = 5; row.errs = errs; }
    else if (game === 'line') { var lp = 0, ls = 0; PC.LINE_N.forEach(function (n) { var c = r() < .3 ? n : Math.floor(r() * (n - 1)); if (c === n - 1) c = n - 2; ls += c * PC.LINE_PT + (c === n ? PC.LINE_PERF : 0); if (c === n) lp++; }); row.aux = lp; row.score = ls; }
    else if (game === 'run') { row.aux = r() < .7 ? 1 : 0; row.score = Math.round((4000 + r() * 9000) / 10) * 10 + (row.aux ? 1000 + Math.floor(r() * 10) * 50 : 0); }
    else { var picks = (pz.v === 2 ? [Math.floor(r() * 2)].concat(PC.R2_SLOTS.map(function () { return Math.floor(r() * 3); })) : [0, 1, 2, 3, 4].map(function () { return Math.floor(r() * 3); })), R = PC.simRoad(pz, ctx, picks); row.score = pz.v === 2 ? R.score : R.total; row.aux = R.eok; row.picks = R.picks; }
    rows.push(row);
  });
  return (mockCache[key] = rows);
}

function mockLook(r) {
  var f = r() < .45, a = ['r' + Math.floor(r() * 5)], H = HAIRS[f ? 'f' : 'm']; if (f) a.push('bf'); a.push('h' + H[Math.floor(r() * H.length)][0]); if (f && r() < .5) a.push('os');
  var any = function (T) { return T[Math.floor(r() * T.length)][0]; };
  if (r() < .4) a.push('w' + (f && r() < .4 ? 'dress' : 'semi')); if (r() < .6) a.push('c' + any(COLS)); if (r() < .5) a.push('f' + any(FACES));
  [['t', 'hat'], ['d', 'hand'], ['a', 'acc'], ['g', 'bg']].forEach(function (p) { var L = ITEMS.filter(function (it) { return it[1] === p[1]; }); if (L.length && r() < .55) a.push(p[0] + L[Math.floor(r() * L.length)][0]); });
  if (r() < .7) a.push('n' + any(BADGES));
  return a.join('.');
}
function myRow(day, game) { var x = rec(day, game); return x && x.sent ? { nick: x.nick, dev: DEV, score: x.score, aux: x.aux, ts: 1e15, errs: x.errs, picks: x.picks, me: 1, lk: lookCode() } : null; }
function byScore(a, b) { return b.score - a.score || a.ts - b.ts; }
function dayRows(day, game) { var a = mockDay(day, game).slice(), m = myRow(day, game); if (m) a.push(m); return a.sort(byScore); }
function weekSum(days, game) {
  var m = {};
  days.forEach(function (d) { dayRows(d, game).forEach(function (r) { var k = r.dev; m[k] = m[k] || { nick: r.nick, s: 0, me: r.me, lk: r.lk }; m[k].s += r.score; }); });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.s - a.s; });
}
function mockPlays() { return store.getJ('slp-mplays', {}); }
function mockVs(o) { try { return 'mk' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch (e) { return ''; } }
function mockVsRead(c) { try { c = String(c || ''); if (c.slice(0, 2) !== 'mk') return null; var v = JSON.parse(decodeURIComponent(escape(atob(c.slice(2).replace(/-/g, '+').replace(/_/g, '/'))))); return PC.DAILY.indexOf(v.g) >= 0 ? v : null; } catch (e) { return null; } }
function mock(path, b) {
  var u = path.split('?'), q = {};
  (u[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); q[p[0]] = decodeURIComponent(p[1] || ''); } });
  if (u[0] === '/play/start') {
    var mp = mockPlays(); mp[TODAY] = (mp[TODAY] || 0) + 1; mp.total = (mp.total || 0) + 1; store.setJ('slp-mplays', mp);
    return { tok: 'mock.' + b.game + '.' + Date.now(), t0: Date.now(), day: TODAY, ver: ctx.ver };
  }
  if (u[0] === '/play/score') {
    var rt = null; if (b.game === 'cup') { rt = {}; mock('/play/cup').rows.forEach(function (x) { rt[x[0]] = [x[1], x[2]]; }); if (PC.v6(TODAY) && typeof cupSnapMock === 'function') rt = cupSnapMock(); }
    var pz = b.game === 'today' && TPZ ? TPZ : PC.gen(b.game, TODAY, ctx), S = PC.score(b.game, pz, b.ans, ctx, rt), pv = rec(TODAY, b.game);
    if (b.game === 'run' && pv && pv.sent && pv.score > S.score) S = { score: pv.score, aux: pv.aux };
    var rows = mockDay(TODAY, b.game).concat([{ score: S.score, ts: 1e15 }]).sort(byScore);
    var hi = rows.filter(function (r) { return r.score > S.score; }).length, eq = rows.filter(function (r) { return r.score === S.score; }).length;
    return { ok: true, day: TODAY, score: S.score, aux: S.aux, rank: rows.findIndex(function (r) { return r.ts === 1e15; }) + 1, total: rows.length, tie: eq > 1 ? hi + 1 : 0,
      vs: mockVs({ d: TODAY, g: b.game, n: b.nick, s: S.score, a: S.aux }) };
  }
  if (u[0] === '/play/top') {
    var g = q.game, d = q.d || TODAY, days = PC.weekDays(d).filter(function (x) { return x <= TODAY; }), R = dayRows(d, g), hall = [], meHall = [];
    for (var w = 1; w <= 8; w++) {
      var mon = PC.addDays(PC.weekDays(d)[0], -7 * w), ws = weekSum(PC.weekDays(mon), g)[0];
      if (ws && !PC.weekOff(g, mon)) { hall.push([PC.isoWeek(mon), ws.nick, ws.s, ws.lk || '']); if (ws.me) meHall.push([PC.isoWeek(mon), g]); }
    }
    var T = dayRows(d, 'today'), Y = dayRows(PC.addDays(d, -1), 'today'), okT = T.filter(function (r) { return r.aux > 0; });
    var mp = mockPlays(), di = PC.dayIndex(d), hr = new Date(Date.now() + 9 * 3600e3).getUTCHours();
    var stat = { n: R.length, ok: R.filter(function (r) { return r.aux > 0; }).length, avg: 0 };
    if (g === 'today') stat.avg = okT.length ? Math.round(okT.reduce(function (a, r) { return a + r.aux; }, 0) / okT.length * 10) / 10 : 0;
    if (g === 'sniper') stat.err = [0, 1, 2, 3, 4].map(function (i) { var e = R.filter(function (r) { return r.errs && r.errs[i] != null; }); return e.length ? Math.round(e.reduce(function (a, r) { return a + r.errs[i]; }, 0) / e.length * 10) / 10 : null; });
    if (g === 'sniper') { stat.aerr = [0, 1, 2, 3, 4].map(function (i) { var e = R.filter(function (r) { return r.errs && r.errs[i] != null; }); return e.length ? Math.round(e.reduce(function (a, r) { return a + Math.abs(r.errs[i]); }, 0) / e.length * 10) / 10 : null; });
      var ae = stat.aerr.filter(function (v) { return v != null; }); stat.mae = ae.length ? Math.round(ae.reduce(function (a, v) { return a + v; }, 0) / ae.length * 10) / 10 : null; }
    if (g === 'line') { var lr = PC.rng('mockline|' + d); stat.lineN = R.length * 53; stat.lineP = PC.LINE_N.map(function (n, k) { return Math.round(70 - k * 13 + lr() * 14); }); }
    if (g === 'road') stat.best = R[0] ? { nick: R[0].nick, score: R[0].score, picks: R[0].picks } : null;
    var tday = 1800 + Math.round(hr * 130 + PC.rng('mp|' + d)() * 400) + (mp[d] || 0);
    return { day: d, game: g, week: PC.isoWeek(d), today: R.slice(0, 10).map(function (r) { return [r.nick, r.score, r.aux, r.lk || '']; }),
      weekTop: weekSum(days, g).slice(0, 10).map(function (r) { return [r.nick, r.s, r.lk || '']; }), hall: hall, meHall: q.dev ? meHall : undefined,
      plays: { total: 96000 + di * 1150 + (mp.total || 0), today: tday, people: Math.round(tday * .31) },
      todayGame: { n: T.length * 53, ok: okT.length * 53, avg: stat.avg || (okT.length ? Math.round(okT.reduce(function (a, r) { return a + r.aux; }, 0) / okT.length * 10) / 10 : 0) },
      yday: { n: Y.length * 53, ok: Y.filter(function (r) { return r.aux > 0; }).length * 53 }, stat: stat };
  }
  if (u[0] === '/play/vs') {
    var v = mockVsRead(q.c); return v ? { day: v.d, game: v.g, nick: v.n, score: v.s, aux: v.a } : { error: 'not found' };
  }
  if (u[0] === '/play/cup' && !b) {
    var mine = store.getJ('slp-cup', {}), out = [];
    POOL.forEach(function (c, i) {
      var r = PC.rng('mockcup|' + c.n), shown = Math.round((c.tier < 2 ? 120 : 30) + r() * 380), pop = .28 + .4 * (1 - Math.min(1, i / 400)) + (r() - .5) * .3;
      var picked = Math.round(shown * Math.max(.05, Math.min(.92, pop))), wins = Math.round(picked * pop * .12), m = mine[c.n] || [0, 0, 0];
      out.push([c.n, shown + m[0], picked + m[1], wins + m[2]]);
    });
    return { rows: out, today: 240 + ((mockPlays()[TODAY]) || 0) };
  }
  if (u[0] === '/play/cup') {
    var chk = PC.cupCheck(ctx, b.theme, b.picks); if (!chk) return { error: 'bad picks' };
    var mc = store.getJ('slp-cup', {});
    Object.keys(chk.agg).forEach(function (n) { var a = mc[n] || [0, 0, 0]; chk.agg[n].forEach(function (v, j) { a[j] += v; }); mc[n] = a; });
    store.setJ('slp-cup', mc);
    return { ok: true, counted: true, champ: chk.champ };
  }
  return { error: 'not found' };
}



function dayBusy(except) {
  if (PC.DAILY.some(function (g) { return g !== except && prog(g); })) return true;
  try { if (LN || RUN && RUN.on || CUP || SPRAC || TPRAC) return true; } catch (e) {}
  return false;
}
function startDaily(game) {
  return call('/play/start', { game: game, dev: DEV }).then(function (j) {
    if (j.day && j.day !== TODAY) { if (!dayBusy(game)) { location.reload(); return new Promise(function () {}); } toast('날짜가 바뀌었어요. 판을 끝내고 새로고침해 주세요.'); }
    return { tok: j.tok || '', t0: Date.now() };
  }, function () { return { tok: '', t0: Date.now() }; });
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && PC.kstDay() !== TODAY && !dayBusy()) location.reload(); });





var PEND = {};
function submitDaily(game, ans, S, extra) {
  var p = prog(game) || {};
  var save = function (x) { x = Object.assign({ nick: NICK, ans: ans }, extra || {}, x); setRec(TODAY, game, x); setProg(game, null); delete PEND[game]; setTimeout(function () { promoCheck(); }, 900); return x; };
  var send = function (tok) { return call('/play/score', { game: game, tok: tok || '', dev: DEV, nick: NICK, ans: ans, ver: ctx.ver, lk: lookCode() }); };

  var go = p.tok || MOCK ? send(p.tok) : call('/play/start', { game: game, dev: DEV }).then(function (j) { if (j.tok && prog(game)) { var q = prog(game); q.tok = j.tok; setProg(game, q); } return send(j.tok); });
  return go.then(function (j) {
    return save({ score: j.score != null ? j.score : S.score, aux: j.aux != null ? j.aux : S.aux, rank: j.rank, total: j.total, tie: j.tie || 0, sent: 1, vs: j.vs || '' });
  }, function (err) {
    var st = err && err.status, msg = (err && err.error) || '점수를 보내지 못했어요';
    if (err && err.net || !st || st === 409 || st === 429 || st >= 500) {
      PEND[game] = [ans, S, extra];
      return Object.assign({ nick: NICK, ans: ans }, extra || {}, { score: S.score, aux: S.aux, sent: 0, retry: 1, reload: st === 409 ? 1 : 0, err: msg });
    }
    return save({ score: S.score, aux: S.aux, sent: 0, err: msg });
  });
}

function sendAgain(game, btn) {
  var a = PEND[game]; if (!a) return;
  if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
  submitDaily(game, a[0], a[1], a[2]).then(function (x) {
    var box = btn && btn.closest('.rkbox');
    if (x.sent && ['line', 'today', 'sniper'].indexOf(game) >= 0 && CUR === game) { RENDER[game](); return; }
    if (box) { box.outerHTML = rankBox(game, x); if (x.sent) getTop(game).then(function (t) { fillNb(game, t); }); }
    if (x.sent) toast('점수를 보냈어요!');
  });
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-retry]'); if (b) { sendAgain(b.dataset.retry, b); return; }
  var r = e.target.closest && e.target.closest('[data-reload]'); if (r) location.reload();
});
function getTop(game, d) {
  return call('/play/top?game=' + game + '&d=' + (d || TODAY) + '&dev=' + DEV).then(function (t) {
    try { if (t && t.meHall && t.meHall.length && store.get('slp-hof') !== '1') { store.set('slp-hof', '1'); itemCheck(); } } catch (e) {}
    return t;
  }).catch(function () { return null; });
}



var NEW_DAY = false;
function renderMe(edit) {
  var b = topBadge(), s = streak();
  var r = myRank(), nx = nextXP();


  var h = '<button type="button" class="mylk" data-go="look" aria-label="내 조로 열기 · ' + esc(nameRank(NICK, r)) + '">' + (PX.ok ? zorro(r, 'normal', 1.5, '', { bg: 1, head: 1 }) : '') +
    '<span class="nk2">' + (b ? '<span class="badge1">' + esc(b) + '</span>' : '') + '<span class="nick">' + esc(NICK) + '</span></span><span class="myrk" title="오늘의 도전을 끝낼 때마다 경험치 +1, 칭호 +3. 10문제 다 맞히면 특진">' + RK[r] + '<small>' + (nx ? '승진까지 ' + nx + '판' : '만렙') + '</small></span></button>' +
    '<span class="fire" title="이어서 출석한 날">' + em('flame', '🔥') + (s ? ' ' + s + '일<span class="pc"> 연속</span>' : ' 0일') + '</span><span class="sp"></span>' +
    '<button class="lnk" id="nickEd" type="button" aria-label="닉네임 바꾸기 · 내 조로 꾸미기"><span class="pc">닉네임 · 조로 꾸미기</span><span class="ph" aria-hidden="true">' + em('pencil', '✎', 2) + '</span></button>' + sndBtn('sndM');
  if (edit) h += '<div class="nickf" style="width:100%"><label for="nickIn" style="font-size:13px;font-weight:700">닉네임</label><input id="nickIn" maxlength="10" value="' + esc(NICK) + '" autocomplete="off">' +
    '<button class="btn sm" id="nickOk" type="button">저장</button><button class="btn sm ghost" id="nickRnd" type="button">새로 지어 주기</button><button class="btn sm ghost" id="nickNo" type="button">그만두기</button>' +
    '<button class="btn sm" id="nickLook" type="button" style="margin-left:auto">내 조로 꾸미기 ▶</button>' +
    '<span class="err" id="nickErr" aria-live="polite">2~10자 한글·영문·숫자. 순위표에 이 이름으로 나와요.</span></div>';
  $('me').innerHTML = h;
  wireSnd();
  $('nickEd').onclick = function () { renderMe(true); $('nickIn').focus(); };
  if (!edit) return;
  var ok = function () {
    var v = $('nickIn').value.trim(), bad = PC.nickCheck(v);
    if (bad) { $('nickErr').textContent = bad; $('nickErr').style.color = 'var(--warn)'; return; }
    NICK = v; store.set('slp-nick', v); renderMe(); toast('닉네임을 바꿨어요. 다음에 내는 점수부터 이 이름으로 나와요.');
  };
  $('nickOk').onclick = ok;
  $('nickIn').onkeydown = function (e) { if (e.key === 'Enter') ok(); };
  $('nickRnd').onclick = function () { $('nickIn').value = PC.makeNick(PC.rng(Math.random())); };
  $('nickNo').onclick = function () { renderMe(); };
  $('nickLook').onclick = function () { renderMe(); go('look'); };
}
function tickCd() {
  var el = $('cd'); if (!el) return;
  if (PC.kstDay() !== TODAY) { NEW_DAY = true; el.innerHTML = '<button class="lnk" type="button" id="reload">새 문제 나옴 ↻</button>'; $('reload').onclick = function () { location.reload(); }; return; }
  var ms = PC.msToMidnight(), s = Math.floor(ms / 1000), p = function (n) { return String(n).padStart(2, '0'); };
  el.textContent = p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
}
setInterval(function () { if (!NEW_DAY) tickCd(); }, 1000);


function renderBoard(t) {
  var pz = PC.genToday(TODAY, ctx);
  $('stPlay').innerHTML = (t ? man(t.plays.total) : '-') + '<small>판</small>';
  $('stPeople').innerHTML = (t ? man(t.plays.people) : '-') + '<small>명</small>';
  $('stTodayL').textContent = '스무고개 퀴즈 #' + pz.no + ' 정답자';
  $('stToday').innerHTML = (t ? man(t.todayGame.ok) : '-') + '<small>명</small>';
  $('stNote').innerHTML = MOCK ? '숫자는 미리보기용 예시예요' : '';
  tickCd(); renderBand(t);
  if (typeof CUR !== 'undefined' && CUR === 'lobby') renderLobby();
}

var BOSS_OPEN = false;
function renderBand(t) {
  var el = $('bandTr'); if (!el) return;
  t = t || TTOP;
  var sun = PC.dow(TODAY) === 0, wk = t && t.weekTop && t.weekTop[0];
  var items = [];
  if (t) items.push('오늘 ' + man(t.plays.people) + '명 도전');

  if (wk) items.push('스무고개 퀴즈 주간 1위 ' + wk[0] + ' ' + man(wk[1]) + '점');
  if (t) items.push('스무고개 퀴즈 #' + PC.genToday(TODAY, ctx).no + ' 정답자 ' + man(t.todayGame.ok) + '명');
  items.push('매일 0시 새 문제');
  items.push('연봉 연구소 ' + D.ym.replace('-', '.') + ' 자료');
  var row = function (copy) {
    return '<div class="row1"' + (copy ? ' aria-hidden="true"' : '') + ' style="display:flex">' + items.map(function (x) {
      return typeof x === 'string' ? '<span class="bi">' + esc(x) + '</span>'
        : '<span class="bi"><button type="button" class="bossbtn" data-boss' + (copy ? ' tabindex="-1"' : ' aria-controls="boss" aria-expanded="' + (BOSS_OPEN || sun) + '"') + '>' + esc(x.boss) + '</button></span>';
    }).join('') + '</div>';
  };
  el.innerHTML = row(0) + row(1);
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-boss]'); if (!b) return;
  var sun = PC.dow(TODAY) === 0;
  BOSS_OPEN = sun ? true : !BOSS_OPEN; renderBoss(); renderBand();
  var bx = $('boss'); if (bx && !bx.hidden) bx.scrollIntoView({ block: 'center', behavior: REDUCE ? 'auto' : 'smooth' });
});



function shareBox(id, extra) {
  return '<div class="share" id="' + id + '"><div class="acts' + (extra ? ' two' : '') + '"><button class="btn" type="button" data-img>카드 공유</button>' + (extra || '') + '</div>' +
    '<div class="row"><button class="btn ghost sm" type="button" data-copy>결과 글 복사</button></div>' +
    '<p class="msg2" aria-live="polite"></p><textarea readonly hidden aria-label="복사할 결과"></textarea><div class="imgout"></div>' +
    '<details class="more sm"><summary>공유 글 미리 보기</summary><pre></pre></details></div>';
}
function wireShare(id, text, card) {
  var box = $(id); if (!box) return;
  box.querySelector('pre').textContent = text;
  box.querySelector('[data-copy]').onclick = function () {
    var m = box.querySelector('.msg2'), ta = box.querySelector('textarea');
    var fb = function () { ta.value = text; ta.hidden = false; ta.focus(); ta.select(); m.textContent = '아래 글을 길게 눌러 복사하세요.'; };
    try { navigator.clipboard.writeText(text).then(function () { m.textContent = '복사했어요. 단톡방에 붙여 넣어 보세요.'; }, fb); } catch (e) { fb(); }
  };
  box.querySelector('[data-img]').onclick = function () {
    var go = function () { drawCard(card, box); };
    try { document.fonts && document.fonts.ready ? document.fonts.ready.then(go, go) : go(); } catch (e) { go(); }
  };
}


function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawIdCard(g, x, y, w, P) {
  var h = Math.round(w * 1.6), u = w / 360, F = '"Noto Sans KR", sans-serif', FP = '"DotGothic16", "Noto Sans KR", monospace', cx = x + w / 2;

  g.fillStyle = '#3550b8'; [[-1, 1], [1, -1]].forEach(function (d) { g.save(); g.translate(cx + d[0] * 26 * u, y); g.rotate(d[1] * .22); g.fillRect(-10 * u, -y - 40, 20 * u, y + 46); g.restore(); });
  g.fillStyle = '#c99a00'; g.fillRect(cx - 16 * u, y - 14 * u, 32 * u, 24 * u);

  g.fillStyle = '#1b1d18'; rrect(g, x + 8 * u, y + 8 * u, w, h, 22 * u); g.fill();
  g.fillStyle = '#fbfaf3'; rrect(g, x, y, w, h, 22 * u); g.fill();
  g.lineWidth = 4 * u; g.strokeStyle = '#1b1d18'; g.stroke();

  g.save(); rrect(g, x, y, w, h, 22 * u); g.clip();
  g.fillStyle = '#1d2440'; g.fillRect(x, y, w, 74 * u); g.fillStyle = '#c6ff3d'; g.fillRect(x, y + 74 * u, w, 6 * u);
  g.restore();
  g.fillStyle = '#fbfaf3'; rrect(g, cx - 30 * u, y + 14 * u, 60 * u, 12 * u, 6 * u); g.fill();
  g.fillStyle = '#ffffff'; g.font = '700 ' + Math.round(17 * u) + 'px ' + FP; g.textAlign = 'center'; g.fillText(P.head || 'JOBZORRO · 연봉 놀이터', cx, y + 56 * u);

  var px = x + 40 * u, py = y + 100 * u, pw = w - 80 * u, ph = 250 * u;
  g.fillStyle = '#dfe9f5'; g.fillRect(px, py, pw, ph); g.fillStyle = '#c9d6e6'; g.fillRect(px, py + ph - 28 * u, pw, 28 * u);
  try {
    var zo = { look: P.look || LOOK, bg: 1, hat: P.hat ? 1 : 0 }, rows = zFrames(P.rk, P.mood || 'happy', zo)[0], pal = PX.pal2(zPal(P.rk, P.mood || 'happy', zo));
    var s = Math.floor(Math.min(pw / rows[0].length, ph / rows.length) * 2) / 2;
    var t = document.createElement('canvas'); t.width = rows[0].length * 2; t.height = rows.length * 2;
    PX.paintHR(t.getContext('2d'), rows, pal, 0, 0, 2, 0);
    g.imageSmoothingEnabled = false; g.drawImage(t, px + (pw - rows[0].length * s) / 2, py + ph - rows.length * s, rows[0].length * s, rows.length * s);
  } catch (e) {}
  g.lineWidth = 3 * u; g.strokeStyle = '#1b1d18'; g.strokeRect(px, py, pw, ph);

  var ty = py + ph + 26 * u;
  if (P.title) { g.font = '800 ' + Math.round(17 * u) + 'px ' + F; var tw = g.measureText(P.title).width + 24 * u; g.fillStyle = '#c6ff3d'; rrect(g, cx - tw / 2, ty, tw, 30 * u, 15 * u); g.fill(); g.fillStyle = '#1b1d18'; g.fillText(P.title, cx, ty + 21 * u); }
  var nk = P.nick || NICK, rk = RK[P.rk], fs = 38 * u;
  g.font = '900 ' + Math.round(fs) + 'px ' + F; while (g.measureText(nk + ' ' + rk).width > w - 40 * u && fs > 18) { fs -= 2; g.font = '900 ' + Math.round(fs) + 'px ' + F; }
  var wn = g.measureText(nk + ' ').width, wr; g.font = '700 ' + Math.round(fs * .72) + 'px ' + F; wr = g.measureText(rk).width;
  var nx = cx - (wn + wr) / 2, ny = ty + (P.title ? 78 : 50) * u;
  g.textAlign = 'left'; g.fillStyle = '#1b1d18'; g.font = '900 ' + Math.round(fs) + 'px ' + F; g.fillText(nk, nx, ny);
  g.fillStyle = '#6a6d63'; g.font = '700 ' + Math.round(fs * .72) + 'px ' + F; g.fillText(rk, nx + wn, ny);
  g.textAlign = 'center'; g.fillStyle = '#4a4d44'; g.font = '700 ' + Math.round(16 * u) + 'px ' + F; if (P.line) g.fillText(P.line, cx, ny + 34 * u);

  var bx = x + 60 * u, by = y + h - 50 * u, bw = w - 120 * u, hs = PC.hash32('id|' + (P.nick || NICK) + DEV), k = 0;
  g.fillStyle = '#1b1d18'; for (var xx = 0; xx < bw; k++) { var lw = (1 + ((hs >>> (k % 29)) & 3)) * u * 1.5; if (k % 2 === 0) g.fillRect(bx + xx, by, lw, 26 * u); xx += lw; }
  g.textAlign = 'left';
  return h;
}
function myIdLine() { return '🔥 ' + streak() + '일 연속 · 칭호 ' + Object.keys(badges()).length + '개 · 소품 ' + Object.keys(itemsOwned()).length + '개'; }
function drawCard(card, box) {
  var cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630;
  var g = cv.getContext && cv.getContext('2d'), cs = getComputedStyle(document.documentElement), tk = function (n) { return cs.getPropertyValue(n).trim(); };
  if (!g) { box.querySelector('.msg2').textContent = '이 브라우저에선 그림을 만들 수 없어요. 결과 복사를 써 주세요.'; return; }
  var F = '"Noto Sans KR", sans-serif', FD = 'Archivo, "Noto Sans KR", sans-serif', idc = PX.ok;
  g.fillStyle = tk('--bg'); g.fillRect(0, 0, 1200, 630);
  g.fillStyle = tk('--acc'); g.fillRect(0, 0, 1200, 16);
  var L = idc ? 740 : 1130;
  g.fillStyle = tk('--muted'); g.font = '700 30px ' + F; g.fillText('연봉 놀이터 · ' + card.title, 70, 96);
  var bs = 150; g.font = '900 ' + bs + 'px ' + FD; while (g.measureText(card.big).width > L - 70 && bs > 60) { bs -= 6; g.font = '900 ' + bs + 'px ' + FD; }
  g.fillStyle = tk('--ink'); g.fillText(card.big, 64, 250);
  g.font = '700 36px ' + F; var sy = 316; (card.sub || '').split('\n').forEach(function (l) { g.fillText(l, 70, sy); sy += 48; });
  if (card.lines && card.lines.length) { g.font = '38px sans-serif'; card.lines.slice(0, Math.max(1, Math.floor((520 - sy) / 50))).forEach(function (l, i) { g.fillText(l, 70, sy + 14 + i * 50); }); }
  g.fillStyle = tk('--ink'); g.fillRect(70, 532, L - 70, 2);
  g.fillStyle = tk('--soft'); g.font = '700 28px ' + F; g.fillText(idc ? '나도 해 보기 → ' + SITE_S : (topBadge() ? '[' + topBadge() + '] ' : '') + nameRank(NICK, myRank()), 70, 585);
  if (!idc) { g.textAlign = 'right'; g.fillText('나도 해 보기 → ' + SITE_S, 1130, 585); }
  else {
    var P = card.px || {};
    try { drawIdCard(g, 800, 58, 330, { rk: P.rk == null ? myRank() : P.rk, mood: P.mood || 'happy', hat: P.hat, title: topBadge(), line: card.title + ' · ' + card.big }); } catch (e) {}
  }
  var url = cv.toDataURL('image/png');
  box.querySelector('.imgout').innerHTML = '<img src="' + url + '" alt="결과 카드 그림: ' + esc(card.title + ' ' + card.big) + '"><div class="row" style="margin-top:8px"><a class="btn sm" href="' + url + '" download="salary-play.png">그림 저장</a></div>';
}

function drawMyId(out) {
  var cv = document.createElement('canvas'); cv.width = 520; cv.height = 860;
  var g = cv.getContext && cv.getContext('2d'); if (!g || !PX.ok) { out.textContent = '이 브라우저에선 그림을 만들 수 없어요.'; return; }
  g.fillStyle = '#eef0e6'; g.fillRect(0, 0, 520, 860);
  drawIdCard(g, 70, 120, 372, { rk: myRank(), mood: 'happy', title: topBadge(), line: myIdLine() });
  g.fillStyle = '#6a6d63'; g.font = '700 18px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText(SITE_S, 260, 844);
  var url = cv.toDataURL('image/png');
  out.innerHTML = '<img src="' + url + '" alt="내 조로 사원증: ' + esc(nameRank(NICK, myRank())) + '" style="max-width:260px;width:100%;display:block;margin:8px 0"><a class="btn sm" href="' + url + '" download="my-zorro-id.png">그림 저장</a>';
}


function fmtScore(game, s) { return game === 'road' ? (s >= 20000 ? eokS(s) : man(s) + '점') : game === 'run' ? man(s) + '만원' : man(s) + '점'; }

function lbWho(nick, lk, me) {
  var P = me ? { rk: myRank(), title: topBadge() } : lookParse(lk);
  return (P.title ? '<span class="lbt">' + esc(P.title) + '</span>' : '') + esc(nick) + (me || lk ? ' <small class="lbr">' + RK[P.rk] + '</small>' : '');
}
function lbFace(lk, me) {
  if (!PX.ok) return '';
  var P = me ? { rk: myRank(), look: LOOK } : lookParse(lk);
  return '<span class="fc" aria-hidden="true">' + zorro(P.rk, 'normal', 1, '', { head: 1, look: P.look }) + '</span>';
}
function lbCol(title, sub, rows, game, mine, li0) {
  var inTop = false, li = rows.map(function (r, i) {
    var me = mine && mine.rank === i + 1 && r[0] === NICK; if (me) inTop = true;
    var k = i; while (k > 0 && rows[k - 1][1] === r[1]) k--;
    var tie = k < i || (rows[i + 1] && rows[i + 1][1] === r[1]);
    return '<li class="' + (me ? 'mine' : '') + (k < 3 ? ' top' + (k + 1) : '') + '"><span class="r">' + (tie ? '<small class="lbtie">공동</small>' : '') + (k + 1) + '</span>' + lbFace(r[li0], me) + '<span class="n">' + lbWho(r[0], r[li0], me) + '</span><span class="s">' + fmtScore(game, r[1]) + '</span></li>';
  }).join('');
  if (mine && mine.rank && !inTop) li += '<li class="mine pin"><span class="r">' + (mine.tie ? '<small class="lbtie">공동</small>' + mine.tie : mine.rank) + '</span>' + lbFace('', 1) + '<span class="n">' + lbWho(NICK, '', 1) + '</span><span class="s">' + fmtScore(game, mine.score) + '</span></li>';
  return '<div class="lbc"><h4>' + title + mockTag() + '</h4><p class="sub">' + sub + '</p>' + (li ? '<ol>' + li + '</ol>' : '<p class="empty">아직 기록이 없어요. 첫 번째가 되어 보세요.</p>') + '</div>';
}
function hallCol(rows, game) {

  return '<div class="lbc hof"><h4>명예의 전당' + mockTag() + '</h4><p class="sub">역대 주간 1위 · 그 주의 칭호·직위·조로 그대로 영구 박제</p>' + (rows.length ? '<ol class="hofl">' + rows.map(function (r, i) {
    var P = lookParse(r[3]), wk = r[0].replace(/^(\d{4})-W0?(\d+)$/, '$1년 $2주');
    if (!i) return '<li class="hof1"><div class="idc"><span class="idh">명예의 전당 · ' + esc(wk) + '</span>' + (PX.ok ? '<span class="hz">' + zorro(P.rk, 'happy', 2.5, 'idle', { look: P.look, bg: 1 }) + '</span>' : '') +
      (P.title ? '<span class="hft">' + esc(P.title) + '</span>' : '') + '<span class="n">' + esc(r[1]) + (r[3] ? ' <small class="lbr">' + RK[P.rk] + '</small>' : '') + '</span><span class="s">' + fmtScore(game, r[2]) + '</span><span class="idbar" aria-hidden="true"></span></div></li>';
    return '<li>' + (PX.ok ? '<span class="hz">' + zorro(P.rk, 'happy', 1.5, '', { look: P.look, bg: 1 }) + '</span>' : '') +
      '<span class="hw">' + em('crown', '👑', 1) + ' ' + esc(wk) + '</span>' + (P.title ? '<span class="hft">' + esc(P.title) + '</span>' : '') + '<span class="n">' + esc(r[1]) + (r[3] ? ' <small class="lbr">' + RK[P.rk] + '</small>' : '') + '</span><span class="s">' + fmtScore(game, r[2]) + '</span></li>'; }).join('') + '</ol>' : '<p class="empty">첫 주가 끝나면 1위가 여기 올라요.</p>') + '</div>';
}
function myWeek(game, days) { var s = 0, any = false; days.forEach(function (d) { var x = rec(d, game); if (x && x.sent) { s += x.score; any = true; } }); return any ? s : null; }
function lbAll(t, game) {
  var x = rec(TODAY, game), mine = x && x.sent ? { rank: x.rank, score: x.score, tie: x.tie || 0 } : null, wk = myWeek(game, PC.weekDays(TODAY).filter(function (d) { return d <= TODAY; }));
  var wkMine = null; if (wk != null) { var pos = t.weekTop.findIndex(function (r) { return r[0] === NICK && r[1] === wk; }); wkMine = pos >= 0 ? { rank: pos + 1, score: wk } : null; }
  return '<div class="lb">' + lbCol('오늘', mmdd(TODAY) + ' · ' + GNAME[game] + ' TOP 10', t.today, game, mine, 3) +
    (PC.weekOff(game, TODAY) ? '<div class="lbc"><h4>이번 주</h4><p class="empty">이번 주는 이직 로드 10년 → 커리어 로드 20년 개편 주라 점수 단위가 달라 주간 순위와 명예의 전당을 쉬어요. 다음 주 월요일부터 다시 열려요.</p></div>'
      : lbCol('이번 주', t.week.replace('-W', '년 ') + '주 · 7일 합계, 빠진 날 0점', t.weekTop, game, wkMine, 2)) + hallCol(t.hall, game) + '</div>';
}
function miniLb(elId, game) {
  getTop(game).then(function (t) { fillNb(game, t); var el = $(elId); if (!el || !t) return; el.innerHTML = lbAll(t, game) + '<p class="src"><a href="#hall">순위 · 명예의 전당 전체 보기 →</a></p>'; });
}

function againBtn(game, fn) {
  if (!MOCK) return '';
  setTimeout(function () { var b = $('again-' + game); if (b) b.onclick = function () { setRec(TODAY, game, null); setProg(game, null); mockCache = {}; fn(); }; }, 0);
  return '<button class="btn sm ghost" type="button" id="again-' + game + '">미리보기 전용: 오늘 기록 지우고 다시 하기</button>';
}


function ac(inp, box, list, onPick) {
  var sel = -1, L = [];
  function show() {
    var q = inp.value.trim().toLowerCase(); if (!q) { box.hidden = true; return; }
    var x = [], a = [], b = [];
    list.forEach(function (c) { var n = c.n.toLowerCase(), o = c.o.toLowerCase();
      if (n === q || o === q) x.push(c); else if (n.indexOf(q) === 0 || o.indexOf(q) === 0) a.push(c); else if (n.indexOf(q) > 0 || o.indexOf(q) > 0) b.push(c); });
    L = x.concat(a, b).slice(0, 12); sel = -1;
    box.innerHTML = L.length ? L.map(function (c, i) { return '<button type="button" data-i="' + i + '">' + logo(c, 's') + '<span class="acn">' + esc(c.n) + '</span><small>' + man(c.m) + '명</small></button>'; }).join('')
      : '<button type="button" disabled>게임에 나오는 회사 중에는 없어요</button>';
    box.hidden = false;
    box.querySelectorAll('button[data-i]').forEach(function (bt) { bt.onmousedown = function (e) { e.preventDefault(); pick(L[+bt.dataset.i]); }; });
  }
  function pick(c) { box.hidden = true; onPick(c); }
  inp.oninput = show;
  inp.onblur = function () { setTimeout(function () { box.hidden = true; }, 120); };
  inp.onkeydown = function (e) {
    if (box.hidden) { if (e.key === 'Enter') { e.preventDefault(); onPick(null, inp.value.trim()); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length;
      box.querySelectorAll('button').forEach(function (bt, i) { bt.classList.toggle('on', i === sel); }); }
    if (e.key === 'Escape') box.hidden = true;
    if (e.key === 'Enter') { e.preventDefault(); if (L.length) pick(L[sel < 0 ? 0 : sel]); }
  };
}






var LAZY = {"today":"js/today.05fb3ee64b.js","sniper":"js/sniper.32405265cb.js","road":"js/road.81ad68fcc0.js","cup":"js/cup.37a5d0b472.js","run":"js/run.6260fac3ad.js","line":"js/line.2f6a68aea2.js"};
var LAZY_ST = {}, LAZY_CB = {};
function lazyReady(k) { return !LAZY[k] || LAZY_ST[k] === 2; }
function lazyLoad(k, cb) {
  if (lazyReady(k)) { if (cb) cb(true); return; }
  if (cb) (LAZY_CB[k] = LAZY_CB[k] || []).push(cb);
  if (LAZY_ST[k] === 1) return;
  LAZY_ST[k] = 1;
  var s = document.createElement('script'), done = function (ok) {
    LAZY_ST[k] = ok ? 2 : 0; if (!ok && s.parentNode) s.parentNode.removeChild(s);
    (LAZY_CB[k] || []).splice(0).forEach(function (f) { try { f(ok); } catch (e) { try { console.error(e); } catch (e2) {} } });
  };
  s.src = LAZY[k]; s.onload = function () { done(true); }; s.onerror = function () { done(false); };
  document.head.appendChild(s);
}

function lazyShow(k) {
  var el = $(k); if (el && !el.firstChild) el.innerHTML = '<p class="src" role="status">불러오는 중이에요…</p>';
  lazyNext(k);
  lazyLoad(k, function (ok) {
    if (CUR !== k) return;
    if (ok) { RENDER[k](); dockSync(); gbSync(); return; }
    if (el) { el.innerHTML = '<div class="over"><p class="src">게임을 불러오지 못했어요.</p><div class="row"><button class="btn sm" type="button" id="lzRe">다시 시도</button><button class="btn ghost sm" type="button" data-reload="1">새로고침하기</button></div></div>';
      $('lzRe').onclick = function () { el.innerHTML = ''; lazyShow(k); }; }
  });
}
function lazyCalm(f) { try { if (navigator.connection && navigator.connection.saveData) return; } catch (e) {} if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 4000 }); else setTimeout(f, 1500); }

function lazyIdle(k) { if (k && !lazyReady(k) && !lazyIdle.on) { lazyIdle.on = 1; lazyCalm(function () { lazyLoad(k); }); } }

function lazyNext(k) {
  if (G5.indexOf(k) < 0) return;
  var nx = G5.slice(G5.indexOf(k) + 1).concat(G5).filter(function (j) { return j !== k && !lazyReady(j) && !rec(TODAY, j); })[0];
  if (!nx || lazyNext.did[nx]) return; lazyNext.did[nx] = 1;
  lazyCalm(function () {
    try {
      if (lazyReady(nx) || LAZY_ST[nx]) return;
      var l = document.createElement('link');
      if (l.relList && l.relList.supports && l.relList.supports('prefetch')) { l.rel = 'prefetch'; l.as = 'script'; l.href = LAZY[nx]; document.head.appendChild(l); }
      else fetch(LAZY[nx]).catch(function () {});
    } catch (e) {}
  });
}
lazyNext.did = {};
document.addEventListener('pointerdown', function (e) { var t = e.target.closest && e.target.closest('[data-go]'); if (t && LAZY[t.dataset.go]) lazyLoad(t.dataset.go); }, { passive: true });


var TPZ = null, TTOP = null, TPRAC = null;
var SST = null, SPRAC = null;
var RPZ = null;
var CUP = null, CMODE = 'day';
var RUN = null;
var LN = null;

(function () {
  var cup = $('p-cup'); if (!cup) return;
  var s = document.createElement('section');
  s.className = 'sec gp'; s.id = 'p-run'; s.hidden = true; s.setAttribute('aria-label', '조로 출근길');
  s.innerHTML = '<div class="in"><div id="run"></div></div>';
  cup.parentNode.insertBefore(s, cup.nextSibling);
}());


var END_TXT = {
  startup: ['rocket', '급성장 회사에서 대박이 터졌어요. 스톡옵션·성과급은 운도 실력이에요.', 'happy', 2],
  boss: ['crown', '그날 가능한 길 중 상위 5%. 10년 만에 억대 연봉 부장 코스예요.', 'happy', 4],
  hopper: ['fairy', '헤드헌터 요정이 단골이에요. 네 번 넘게 옮기며 몸값을 올렸어요.', 'happy', 3],
  lifer: ['house', '큰 회사 한 곳에서 10년. 흔들림 없는 정년각이에요.', 'normal', 3],
  survivor: ['skull', '구조조정을 두 번이나 넘겼어요. 살아남은 것도 실력이에요.', 'shock', 2],
  burnout: ['broken', '평점 낮은 회사만 6년 넘게 연속. 연봉보다 사람이 먼저 지쳤어요.', 'sad', 1],
  normal: ['coin', '큰 사고도 대박도 없이 무난한 10년. 사실 가장 흔한 엔딩이에요.', 'normal', 2]
};

Object.assign(END_TXT, {
  exec: ['crown', '임원 명패를 받았어요. 1년 계약이라는 무게도 함께요.', 'happy', 4],
  startup: ['rocket', '동료의 회사에 걸었던 시간이 지분으로 돌아왔어요.', 'happy', 3],
  boss: ['money', '9년 안에 연봉 1억. 숫자로는 누구보다 빨랐어요.', 'happy', 4],
  expert: ['magnifier', '관리자 대신 전문가. 이 분야에서 이름으로 찾는 사람이 됐어요.', 'happy', 3],
  returner: ['flame', '멈췄던 시간이 있었지만, 다시 일어나 더 단단해졌어요.', 'happy', 3],
  second: ['sign', '정년보다 먼저 문을 열고 나왔어요. 2막은 조금 느리고 더 내 것이에요.', 'happy', 3],
  family: ['house', '연봉표보다 가족사진이 먼저 떠오르는 20년이었어요.', 'happy', 3],
  hopper: ['fairy', '네 번 이상 옮기며 몸값을 올렸어요. 헤드헌터가 먼저 찾는 사람이에요.', 'happy', 3],
  lifer: ['target', '첫 회사에서 20년. 흔들리지 않는 것도 실력이에요.', 'normal', 4],
  balance: ['star', '일도 몸도 마음도 지켰어요. 생각보다 어려운 일이에요.', 'happy', 3],
  solo: ['puff', '혼자의 시간을 잘 가꿨어요. 내 속도로 산 20년이에요.', 'happy', 3],
  late: ['chest', '처음엔 느렸지만 마지막 5년이 가장 빛났어요.', 'happy', 3],
  survivor: ['skull', '연봉이 묶인 해를 버티고 끝까지 자리를 지켰어요. 살아남은 것도 실력이에요.', 'shock', 3],
  burnout: ['broken', '연봉보다 사람이 먼저 지쳤어요. 다음엔 체력부터 챙겨요.', 'sad', 2],
  normal: ['coin', '큰 사고도 대박도 없는 20년. 사실 가장 흔하고 귀한 엔딩이에요.', 'normal', 3]
});

var END_HINT = {
  exec: '팀장이 된 뒤 임원에 도전하면…', startup: '창업이나 스타트업 합류가 대박 나면…', boss: '9년 안에 한 해 수입 1억을 넘기면…',
  expert: '팀장 대신 전문가 길에서 커리어를 높이면…', returner: '쉬었다가 다시 일어나 커리어를 올리면…', second: '겨울 장 희망퇴직으로 2막을 열면…',
  family: '아이와 함께 행복을 70 이상 지키면…', hopper: '회사를 4번 이상 옮기면…', lifer: '첫 회사에서 한 번도 안 옮기면…',
  balance: '체력·행복을 둘 다 넉넉히 지키면…', solo: '결혼 없이 행복을 70 이상 지키면…', late: '마지막 5년 수입이 처음 5년의 2.6배를 넘으면…',
  survivor: '구조조정·매각으로 연봉이 묶여도 그 회사에 남으면…', burnout: '체력이 바닥나 크게 지치면…', normal: '큰 사건 없이 20년을 보내면…'
};

function endBook() { return store.getJ('slp-endings', {}); }
function endDogam(now) {
  var B = endBook(), n = PC.ENDINGS.filter(function (e) { return B[e[0]]; }).length;
  return '<p class="h3" style="margin:14px 0 4px;font-size:18px;text-align:left;width:100%">엔딩 도감 ' + n + ' / ' + PC.ENDINGS.length + '</p><div class="dogam">' + PC.ENDINGS.map(function (e) {
    var on = !!B[e[0]];
    var hint = typeof END_HINT !== 'undefined' && END_HINT[e[0]];
    return '<div class="' + (on ? 'on' : '') + (e[0] === now ? ' now' : '') + '">' + (on ? icon(END_TXT[e[0]][0], 3) : icon('lock', 3)) + '<span>' + (on ? esc(e[1]) : '???') + '</span>' + (on ? '<small>' + mmdd(B[e[0]]) + '</small>' : hint ? '<small class="dgh">' + esc(hint) + '</small>' : '') + '</div>';
  }).join('') + '</div>';
}

var R2_TRI = 50, R2_SEASONS = 950;
function r2Stats() { var o = store.getJ('slp-r2st', {}); return o && typeof o === 'object' ? o : {}; }
function r2Rec() { var x = rec(TODAY, 'road'); return x && x.picks && x.picks.length >= PC.R2_N ? x : null; }



var R_MINI = {
  chase: { nm: '🚌 떠나는 버스 잡기', how: '연타! 빨리 눌러서 따라잡아요', fr: 1, nj: 1 },
  board: { nm: '🚇 문 닫히기 전에 탑승', how: '연타! 사람들 사이를 밀고 들어가요', fr: 1, nj: 1 },
  brake: { nm: '✊ 급정거!', how: '경고가 뜨면 꾹 누르고 있기', nj: 1 },
  pedal: { nm: '🚲 오르막길 페달', how: '고리가 딱 맞을 때 눌러요 (박자)', fr: 1, nj: 1 },
  wind:  { nm: '🌪 한강 돌풍', how: '돌풍 경고가 뜨면 꾹 눌러 버티기', nj: 1 },
  snack: { nm: '🍢 시식 코너 떡꼬치', how: '떡꼬치가 가운데 올 때 딱 눌러요 (3번)', fr: 1, nj: 1 },
  rope:  { nm: '🐕 산책줄 줄넘기', how: '줄이 발밑에 올 때 점프! (6번)', fr: 1 },
  shell: { nm: '🃏 야바위 아저씨', how: '★조로 카드를 기억했다가 섞인 뒤 찾아요', fr: 1, nj: 1 },
  light: { nm: '🚦 횡단보도 신호등', how: '빨간불 = 꾹 눌러 멈춤 · 초록불 = 떼고 건너기', nj: 1 },
  sale:  { nm: '🛍 세일 매대 털기', how: '연타! 누를 때마다 쇼핑백 하나', fr: 1, nj: 1 },
  badge: { nm: '🪪 사원증 찍기', how: '막대가 초록 칸에 올 때 딱 눌러요', fr: 1, nj: 1 },
  elev:  { nm: '🛗 닫히는 엘리베이터', how: '연타! 문 닫히기 전에 비집고 타요', fr: 1, nj: 1 }
};
function runRec() { return rec(TODAY, 'run'); }
var R_TRY = 2;
function runTries() { var x = runRec(), a = x ? (x.rt || (x.sent != null ? 1 : 0)) : 0; return Math.max(a, runTry().n); }

function runTry() { var t = store.getJ('slp-runtry', null); return t && t.d === TODAY ? t : { d: TODAY, n: 0, open: 0 }; }

var R_DEX = Object.keys(R_MINI).filter(function (k) { return k !== 'rope'; });
function runDex() { var d = store.getJ('slp-rundex', null); return d && typeof d === 'object' ? d : {}; }
function runRanked() { return runTries() < R_TRY; }

function runStats() {
  var s = store.getJ('slp-runst', null); s = s && typeof s === 'object' ? s : {};
  ['n', 'ontime', 'esc', 'maxHits', 'maxMoney'].forEach(function (k) { s[k] = +s[k] || 0; });
  ['wx', 'cnt', 'end'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
  return s;
}

function lnRec() { return rec(TODAY, 'line'); }



function confetti() { var c = ['#ffcf3d', '#c6ff3d', '#ff5bb0', '#5b7cff', '#e8412c'], h = ''; for (var i = 0; i < 18; i++) h += '<i style="left:' + (i * 5.5 + 2) + '%;background:' + c[i % 5] + ';animation-delay:' + (i % 6) * .12 + 's"></i>'; return '<span class="conf">' + h + '</span>'; }
function promoScene(pr, why) {
  var a = pr[0], b = pr[1]; why = why || '10문제를 다 맞혀';
  return stage('<span class="pxbanner">' + (b > a ? '특진! ' + esc(nameRank(NICK, b)) : '부장 만렙 · ' + esc(why)) + '</span><div class="pxrow">' + (b > a ? zorro(a, 'normal', 3) + '<span class="pxarrow">▶</span>' : '') +
    zorro(b, 'happy', 4, 'jump') + icon(b >= 4 ? 'crown' : 'star', 4) + '</div>' + confetti(), 'promo', why + ' ' + nameRank(NICK, b) + '(으)로 특진했어요');
}
function moodOf(ratio) { return ratio >= .8 ? 'happy' : ratio >= .5 ? 'normal' : ratio > 0 ? 'sad' : 'shock'; }






function endHas(ids) { var B = endBook(); return ids.some(function (i) { return B[i]; }); }
function bossCount() { return Object.keys(store.getJ('slp-boss', {}) || {}).length; }

function recsOf(game) {
  var out = [], re = new RegExp('^slp-r-(\\d{4}-\\d{2}-\\d{2})-' + game + '$');
  try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i), m = k && re.exec(k); if (m) { var x = store.getJ(k, null); if (x && typeof x === 'object') out.push({ day: m[1], x: x }); } } } catch (e) {}
  return out.sort(function (a, b) { return a.day < b.day ? -1 : 1; });
}
function bestOf(game, f) { var b = 0; recsOf(game).forEach(function (r) { var v = +f(r.x) || 0; if (v > b) b = v; }); return b; }
function anyOf(game, f) { return recsOf(game).some(function (r) { try { return !!f(r.x); } catch (e) { return false; } }); }

function solvedRun() {
  var best = 0, run = 0, prev = '';
  recsOf('today').forEach(function (r) { if (r.x.aux > 0) { run = prev && PC.addDays(prev, 1) === r.day ? run + 1 : 1; prev = r.day; if (run > best) best = run; } else { run = 0; prev = ''; } });
  return best;
}
function streakMax() { return Math.max(streak(), +(store.get('slp-streakmax') || 0)); }
function cupWins() { var w = store.getJ('slp-cupwins', {}); return w && typeof w === 'object' ? w : {}; }
function vsWins() { var w = store.getJ('slp-vswins', {}); return w && typeof w === 'object' ? Object.keys(w).length : 0; }
function errsOf(x) { return Array.isArray(x.errs) ? x.errs.filter(function (e) { return e != null; }) : []; }
var DLY = ['line', 'higher', 'today', 'sniper', 'road'];
var ITEMS = [

  ['crown', 'hat', '왕관', '칭호 3개 이상 또는 \'퍼펙트 데이\'', function () { var b = badges(); return Object.keys(b).length >= 3 || !!b.perfect; }, 'etc', 'r', function () { return [Object.keys(badges()).length, 3]; }, '머리 위가 좀 무거워요'],
  ['headset', 'hat', '헤드셋', '칭호 1개 이상', function () { return Object.keys(badges()).length >= 1; }, 'etc', 'c', null, '회의 중이라 못 들었어요'],
  ['beanie', 'hat', '비니', '연속 출석 7일', function () { return streakMax() >= 7; }    , 'etc', 'c', function () { return [streakMax(), 7]; }, '출근길 칼바람 대비'],
  ['coffee', 'hand', '커피', '스무고개 퀴즈 한 번 풀기', function () { return store.get('slp-today1') === '1' || !!rec(TODAY, 'today'); }, 'today', 'c', null, '수사는 카페인으로'],
  ['bag', 'hand', '서류가방', '엔딩 도감 3개 이상', function () { var B = endBook(); return Object.keys(B).length >= 3; }, 'road', 'c', function () { return [Object.keys(endBook()).length, 3]; }, '안엔 이력서 세 장'],
  ['laptop', 'hand', '노트북', '엔딩 \'이직의 신\' 또는 \'스타트업 대박\'', function () { return endHas(['hopper', 'startup']); }, 'road', 'r', null, '어디서든 일할 수 있는 사람'],
  ['umbrella', 'hand', '우산', '엔딩 \'구조조정 생존자\'', function () { return endHas(['survivor']); }, 'road', 'c', null, '비 오는 날에도 출근'],
  ['plant', 'hand', '화분', '엔딩 \'한 회사 20년\'', function () { return endHas(['lifer']); }, 'road', 'c', null, '이 자리에 뿌리내렸어요'],
  ['idcard', 'acc', '사원증', '조로 대리 되기', function () { return myRank() >= 1; }, 'etc', 'c', function () { return [myXP(), RANK_XP[1]]; }, '출입문이 열리는 소리'],
  ['glasses', 'acc', '안경', '조로 과장 되기', function () { return myRank() >= 2; }, 'etc', 'c', function () { return [myXP(), RANK_XP[2]]; }, '엑셀 셀이 잘 보여요'],
  ['goldtie', 'acc', '금넥타이', '조로 부장 되기', function () { return myRank() >= 4; }, 'etc', 'r', function () { return [myXP(), RANK_XP[4]]; }, '결재판이 반짝여요'],
  ['shades', 'acc', '선글라스', '월드컵 한 판에서 민심 12번 이상 맞히기', function () { return store.get('slp-cupmind') === '1'; }, 'cup', 'c', null, '사람들 속마음이 다 보여요'],

  ['cap', 'hat', '야구모자', '연봉 줄서기 오늘의 줄 첫 판 끝내기', function () { return recsOf('line').length > 0 || recsOf('higher').length > 0; }, 'line', 'c', null, '출근 첫날은 모자부터'],
  ['calc', 'hand', '계산기', '오늘의 줄 조로 15명 이상 자리 맞히기', function () { return bestOf('line', function (x) { return x.ok; }) >= 15; }, 'line', 'c', function () { return [bestOf('line', function (x) { return x.ok; }), 15]; }, '실수령액부터 두드려 봐요'],
  ['monocle', 'acc', '외눈 안경', '오늘의 줄 5판 모두 완벽한 줄', function () { return bestOf('line', function (x) { return x.aux; }) >= 5; }, 'line', 'r', function () { return [bestOf('line', function (x) { return x.aux; }), 5]; }, '연봉표를 꿰뚫는 한쪽 눈'],
  ['band', 'hat', '집중 머리띠', '줄서기 2,000점 넘기기 (연습 판 포함)', function () { return +(store.get('slp-ln-best') || 0) >= 2000; }, 'line', 'c', function () { return [+(store.get('slp-ln-best') || 0), 2000]; }, '이마에 필승 두 글자'],
  ['phone', 'hand', '황금 폰', '완벽한 줄 15판 (오늘의 줄)', function () { return +(store.get('slp-ln-perf') || 0) >= 15; }, 'line', 'r', function () { return [+(store.get('slp-ln-perf') || 0), 15]; }, '연봉 비교는 이걸로만'],

  ['beret', 'hat', '탐정 베레모', '스무고개 퀴즈 처음 맞히기', function () { return anyOf('today', function (x) { return x.aux > 0; }); }, 'today', 'c', null, '범인은 이 안에 있다'],
  ['magglass', 'hand', '명탐정 돋보기', '스무고개 퀴즈 먼저 찍기로 맞히기', function () { return anyOf('today', function (x) { return x.early === 1; }); }, 'today', 'r', null, '최종 선택까지 갈 필요 없었어요'],
  ['bandage', 'acc', '반창고', '스무고개 퀴즈 아깝게 틀려도 끝까지 하기', function () { return anyOf('today', function (x) { return x.aux === 0; }); }, 'today', 'c', null, '틀려도 출근은 해요'],
  ['starpin', 'acc', '보안관 배지', '스무고개 퀴즈 3일 연속 맞히기', function () { return solvedRun() >= 3; }, 'today', 'r', function () { return [solvedRun(), 3]; }, '이 동네 연봉 치안 담당'],

  ['visor', 'hat', '선캡', '연봉 스나이퍼 첫 판 끝내기', function () { return recsOf('sniper').length > 0; }, 'sniper', 'c', null, '햇빛 가리고 조준'],
  ['dart', 'hand', '다트', '한 문제를 오차 3% 안으로 맞히기', function () { return anyOf('sniper', function (x) { return errsOf(x).some(function (e) { return Math.abs(e) <= 3; }); }); }, 'sniper', 'c', null, '한가운데 꽂히는 맛'],
  ['goggles', 'acc', '조준 고글', '연봉 스나이퍼 450점 이상', function () { return bestOf('sniper', function (x) { return x.score; }) >= 450; }, 'sniper', 'r', function () { return [bestOf('sniper', function (x) { return x.score; }), 450]; }, '흔들림 없는 시야'],
  ['eyepatch', 'acc', '매의 눈 안대', '5문제 모두 오차 10% 안', function () { return anyOf('sniper', function (x) { var e = errsOf(x); return e.length >= PC.SNIPER_N && e.every(function (v) { return Math.abs(v) <= 10; }); }); }, 'sniper', 'l', null, '한쪽 눈으로도 다 보여요'],

  ['stock', 'hand', '상승 차트 피켓', '엔딩 \'스타트업 대박\'', function () { return endHas(['startup']); }, 'road', 'c', null, '오른쪽 위로만 가는 그래프'],
  ['scarf', 'acc', '실크 머플러', '엔딩 \'9년 안에 억대 연봉\'', function () { return endHas(['boss']); }, 'road', 'r', null, '부장님 출근룩 완성'],
  ['wand', 'hand', '요정 지팡이', '엔딩 \'이직의 신\'', function () { return endHas(['hopper']); }, 'road', 'c', null, '헤드헌터 요정이 두고 간 것'],
  ['pin', 'acc', '근속 배지', '엔딩 \'한 회사 20년\'', function () { return endHas(['lifer']); }, 'road', 'c', null, '오랜 개근의 증표'],
  ['helmet', 'hat', '안전모', '엔딩 \'구조조정 생존자\'', function () { return endHas(['survivor']); }, 'road', 'c', null, '떨어지는 공문 조심'],
  ['pillow', 'acc', '목베개', '엔딩 \'번아웃 퇴사\'', function () { return endHas(['burnout']); }, 'road', 'c', null, '일단 자고 생각해요'],
  ['lunchbox', 'hand', '도시락', '엔딩 \'무난한 직장인\'', function () { return endHas(['normal']); }, 'road', 'c', null, '점심 메뉴 고민 끝'],

  ['nameplate', 'hand', '임원 명패', '엔딩 \'임원의 길\'', function () { return endHas(['exec']); }, 'road', 'r', null, '1년 계약이라도 내 이름'],
  ['book', 'hand', '내 책', '엔딩 \'업계 전문가\'', function () { return endHas(['expert']); }, 'road', 'c', null, '이 분야는 이 책으로'],
  ['flamepin', 'acc', '불꽃 배지', '엔딩 \'다시 일어선 사람\'', function () { return endHas(['returner']); }, 'road', 'r', null, '꺼진 줄 알았죠?'],
  ['strawhat', 'hat', '밀짚모자', '엔딩 \'인생 2막\'', function () { return endHas(['second']); }, 'road', 'c', null, '이제 주말이 길어요'],
  ['photo', 'hand', '가족사진 액자', '엔딩 \'가족이 1순위\'', function () { return endHas(['family']); }, 'road', 'r', null, '책상 위 1순위'],
  ['dumbbell', 'hand', '아령', '엔딩 \'워라밸 장인\'', function () { return endHas(['balance']); }, 'road', 'c', null, '6시 퇴근 후 헬스장'],
  ['cat', 'hand', '고양이', '엔딩 \'자유로운 싱글\'', function () { return endHas(['solo']); }, 'road', 'c', null, '집에서 기다리는 녀석'],
  ['sprout', 'hat', '새싹 머리핀', '엔딩 \'늦게 핀 꽃\'', function () { return endHas(['late']); }, 'road', 'c', null, '늦게 피어도 꽃'],
  ['bouquet', 'hand', '부케', '커리어 로드에서 결혼하기', function () { return !!r2Stats().married; }, 'road', 'c', null, '청첩장 돌리는 중'],
  ['triple', 'acc', '트리플 배지', '체력·커리어·행복 모두 ' + R2_TRI + ' 이상으로 20년 마치기', function () { return !!r2Stats().tri; }, 'road', 'r', function () { return [Math.min(r2Stats().triMin || 0, R2_TRI), R2_TRI]; }, '셋 다 잡은 사람'],
  ['forkbg', 'bg', '갈림길 배경', '여자·남자로 각각 한 판씩', function () { return !!(r2Stats().g0 && r2Stats().g1); }, 'road', 'r', function () { var o = r2Stats(); return [(o.g0 ? 1 : 0) + (o.g1 ? 1 : 0), 2]; }, '두 사람의 20년'],
  ['seasons', 'bg', '사계절 배경', '커리어 로드 종합 ' + man(R2_SEASONS) + '점 이상', function () { return (r2Stats().best || 0) >= R2_SEASONS; }, 'road', 'l', function () { return [r2Stats().best || 0, R2_SEASONS]; }, '봄부터 겨울까지 완벽하게'],
  ['halo', 'hat', '후광', '엔딩 도감 모두 모으기', function () { var B = endBook(); return PC.ENDINGS.every(function (e) { return B[e[0]]; }); }, 'road', 'l', function () { var B = endBook(); return [PC.ENDINGS.filter(function (e) { return B[e[0]]; }).length, PC.ENDINGS.length]; }, '모든 길을 다 가 본 사람'],

  ['flag', 'hand', '응원 깃발', '월드컵 처음 우승 보기', function () { return Object.keys(cupWins()).length > 0; }, 'cup', 'c', null, '내 드림 컴퍼니 화이팅'],
  ['rosette', 'acc', '리본 훈장', '서로 다른 우승 회사 5곳', function () { return Object.keys(cupWins()).length >= 5; }, 'cup', 'c', function () { return [Object.keys(cupWins()).length, 5]; }, '취향이 넓은 편'],
  ['fedora', 'hat', '중절모', '월드컵 대진에서 인기 지수 하위 4곳(8강은 2곳) 안의 회사로 우승', function () { return store.get('slp-cupminor') === '1'; }, 'cup', 'r', null, '남들 안 가는 길 전문'],

  ['plane', 'hand', '종이비행기', '도전장 처음 보내기', function () { return store.get('slp-vssent') === '1'; }, 'etc', 'c', null, '결투 신청서 발송 완료'],
  ['medal', 'acc', '승리 메달', '도전장 대결에서 이기기', function () { return vsWins() >= 1; }, 'etc', 'c', null, '친구보다 1점이라도'],
  ['laurel', 'hat', '월계관', '도전장 대결 3번 이기기', function () { return vsWins() >= 3; }, 'etc', 'r', function () { return [vsWins(), 3]; }, '단톡방 공식 챔피언'],

  ['horns', 'hat', '악마 뿔', '월드컵 오늘의 16강 4일 하기', function () { return recsOf('cup').length >= 4; }, 'cup', 'r', function () { return [recsOf('cup').length, 4]; }, '보스를 너무 자주 봤더니'],
  ['bossbg', 'bg', '보스 빌딩 배경', '월드컵 연봉 1위 회사로 우승 (안목 만점)', function () { return store.get('slp-bosssun') === '1' || store.get('slp-cupeye') === '1'; }, 'cup', 'r', null, '그 빌딩 앞에서 인증샷'],

  ['ticket', 'hand', '교통카드', '조로 출근길 첫 완주', function () { return runStats().n >= 1; }, 'run', 'c', null, '삑— 환승입니다'],
  ['raincap', 'hat', '노란 우비 모자', '비 오는 날 출근 완주', function () { return !!runStats().wx.rain; }, 'run', 'c', null, '우산은 버스에 두고 내렸어요'],
  ['mask', 'acc', 'KF94 마스크', '미세먼지 날 출근 완주', function () { return !!runStats().wx.dust; }, 'run', 'c', null, '숨은 쉬고 다녀요'],
  ['bikehelm', 'hat', '따릉이 헬멧', '따릉이 3번 타기', function () { return (runStats().cnt.bike || 0) >= 3; }, 'run', 'c', function () { return [runStats().cnt.bike || 0, 3]; }, '안전 제일 출근'],
  ['tteok', 'hand', '떡꼬치', '전통시장 지나가기', function () { return !!runStats().cnt.market; }, 'run', 'c', null, '아침은 이걸로 해결'],
  ['hanriver', 'bg', '한강 배경', '한강 다리 3번 건너기', function () { return (runStats().cnt.bridge || 0) >= 3; }, 'run', 'c', function () { return [runStats().cnt.bridge || 0, 3]; }, '출근길 뷰 맛집'],
  ['sweat', 'acc', '식은땀', '쫓아오는 부장님 따돌리기', function () { return runStats().esc >= 1; }, 'run', 'c', null, '방금 그거 부장님 맞죠?'],
  ['conehat', 'hat', '라바콘 모자', '한 판에 꽈당 10번 이상', function () { return runStats().maxHits >= 10; }, 'run', 'c', null, '공사 중… 머리도'],
  ['balloon', 'hand', '생일 풍선', '로비 깜짝 생일 파티 만나기', function () { return !!runStats().end.party; }, 'run', 'r', null, '오늘 주인공은 나'],
  ['clockpin', 'acc', '정시 출근 배지', '정시 출근 10번', function () { return runStats().ontime >= 10; }, 'run', 'r', function () { return [runStats().ontime, 10]; }, '9시 전 도착 전문'],
  ['moneybag', 'hand', '돈 자루', '한 판에 1억 이상 줍기', function () { return runStats().maxMoney >= 10000; }, 'run', 'r', function () { return [runStats().maxMoney, 10000]; }, '출근길에 연봉을 다 주웠어요'],
  ['goldcap', 'hat', '황금 기관사 모자', '출근길 미니게임 도감 모두 모으기', function () { var D = runDex(); return R_DEX.every(function (k) { return D[k]; }); }, 'run', 'l', function () { var D = runDex(); return [R_DEX.filter(function (k) { return D[k]; }).length, R_DEX.length]; }, '어떤 출근길도 문제없어'],
  ['metro', 'bg', '노선도 배경', '11가지 길 모두 지나가 보기', function () { return Object.keys(runStats().cnt).length >= 11; }, 'run', 'l', function () { return [Object.keys(runStats().cnt).length, 11]; }, '서울 출근길 마스터'],
  ['rainbow', 'bg', '무지개 배경', '날씨 6가지 모두 겪고 완주', function () { return Object.keys(runStats().wx).length >= 6; }, 'run', 'l', function () { return [Object.keys(runStats().wx).length, 6]; }, '비 온 뒤 출근길'],

  ['office', 'bg', '사무실 배경', '오늘의 도전 아무거나 한 판 끝내기', function () { return DLY.some(function (g) { return recsOf(g).length > 0; }); }, 'etc', 'c', null, '자리 배치 끝'],
  ['dawn', 'bg', '새벽 배경', '연속 출석 3일', function () { return streakMax() >= 3; }, 'etc', 'c', function () { return [streakMax(), 3]; }, '출근 전에 한 판'],
  ['night', 'bg', '별밤 배경', '연속 출석 14일', function () { return streakMax() >= 14; }, 'etc', 'r', function () { return [streakMax(), 14]; }, '퇴근하고 또 한 판'],
  ['gold', 'bg', '황금 배경', '연속 출석 30일', function () { return streakMax() >= 30; }, 'etc', 'l', function () { return [streakMax(), 30]; }, '한 달 개근의 빛'],
  ['pen', 'hand', '만년필', '조로 차장 되기', function () { return myRank() >= 3; }, 'etc', 'c', function () { return [myXP(), RANK_XP[3]]; }, '결재 서명 전용'],
  ['spot', 'bg', '스포트라이트 배경', '오늘 순위 TOP 10 들기', function () { return DLY.some(function (g) { return anyOf(g, function (x) { return x.sent && x.rank && x.rank <= 10; }); }); }, 'etc', 'r', null, '오늘의 주인공'],
  ['hof', 'bg', '명예의 전당 배경', '주간 1위로 명예의 전당에 오르기', function () { return store.get('slp-hof') === '1'; }, 'etc', 'l', null, '이름이 박제됐어요']];
var ITEM_BY = {}; ITEMS.forEach(function (it) { ITEM_BY[it[0]] = it; });

var PUNIT = { forkbg: '판', seasons: '점', bikehelm: '번', hanriver: '번', clockpin: '번', moneybag: '만원', metro: '곳', rainbow: '가지', crown: '개', beanie: '일', bag: '개', idcard: '', glasses: '', goldtie: '', pen: '', calc: '명', monocle: '판', band: '점', phone: '판', starpin: '일', goggles: '점', halo: '종', rosette: '곳', laurel: '번', horns: '주', dawn: '일', night: '일', gold: '일' };
var SLOT_LB = { hat: '모자', hand: '손에 들기', acc: '얼굴 · 목', bg: '배경' };
var RAR_LB = { c: '일반', r: '희귀', l: '전설' };
function itemsOwned() { var o = store.getJ('slp-items', {}); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
function gameItems(g) { return ITEMS.filter(function (it) { return it[5] === g; }); }

var GIFT_N = 3;
function dayCount(d) { return PC.DAILY.filter(function (g) { return g !== 'cup' && rec(d, g); }).length + (rec(d, 'cup') || store.get('slp-cupw-' + d) ? 1 : 0); }
function allDoneToday() { return dayCount(TODAY) >= GIFT_N; }
function giftLeft() { var G = store.getJ('slp-gift', {}) || {}; return G[TODAY] ? 0 : Math.max(0, GIFT_N - dayCount(TODAY)); }
function giftPick(own, day) {
  var pool = ITEMS.filter(function (it) { return it[6] !== 'l' && !own[it[0]]; }).map(function (it) { return it[0]; }).sort();
  return pool.length ? pool[PC.hash32(day + '|' + DEV + '|gift') % pool.length] : '';
}

function itemCheck(quiet) {
  if (dayCount(TODAY)) bumpStreak(TODAY);
  var own = itemsOwned(), got = [];
  ITEMS.forEach(function (it) { var ok = false; try { ok = it[4](); } catch (e) {} if (ok && !own[it[0]]) { own[it[0]] = TODAY; got.push(it[0]); } });
  var G = store.getJ('slp-gift', {}); if (!G || typeof G !== 'object') G = {};
  if (!G[TODAY] && allDoneToday()) { var g = giftPick(own, TODAY); G[TODAY] = g || '-'; store.setJ('slp-gift', G); if (g) { own[g] = TODAY; got.push('gift:' + g); } }
  if (got.length) { store.setJ('slp-items', own); if (!quiet) toast('새 소품을 얻었어요: ' + got.map(function (id) { return ITEM_BY[id.replace('gift:', '')][2]; }).join(', ') + ' · 내 조로에서 입혀 보세요'); }
  return got;
}

function cleanLook() {
  var own = itemsOwned(), L = {}, src = LOOK && typeof LOOK === 'object' ? LOOK : {};
  if (src.base === 'f') L.base = 'f';
  if (HAIRS[baseOf(L)].some(function (h) { return h[0] === src.hair; })) L.hair = src.hair;
  if (L.base === 'f' && src.bottom === 'skirt') L.bottom = 'skirt';
  if (fitOf({ base: L.base, fit: src.fit }) !== 'suit') L.fit = src.fit;
  if (colOf(src) !== 'auto') L.col = src.col;
  if (faceOf(src) !== 'basic') L.face = src.face;
  ITEMS.forEach(function (it) { if (src[it[1]] === it[0] && own[it[0]]) L[it[1]] = it[0]; });
  LOOK = L;
}

function nextItem(game) {
  var own = itemsOwned(), best = null;
  gameItems(game).concat(gameItems('etc')).forEach(function (it) {
    if (own[it[0]]) return;
    var pr = null; try { pr = it[7] ? it[7]() : null; } catch (e) {}
    var ratio = pr ? Math.min(.99, pr[0] / pr[1]) : 0, bonus = it[5] === game ? (pr ? 1 : .5) : 0;
    if (!best || ratio + bonus > best.r) best = { it: it, pr: pr, r: ratio + bonus };
  });
  return best;
}
function lookPanel() { renderLook(); }


var BOSS = BYN[PC.bossOf(TODAY, ctx)] || null, BWEEK = PC.isoWeek(TODAY);
function bossMet() { return !!(store.getJ('slp-boss', {}) || {})[BWEEK]; }
function meetBoss() {
  var B = store.getJ('slp-boss', {}) || {}; if (B[BWEEK]) return;
  B[BWEEK] = TODAY; store.setJ('slp-boss', B);
  setTimeout(function () { toast('이번 주 보스 ' + BOSS.n + '를 만났어요! 보스 조우 ' + bossCount() + '번째'); sfx('combo'); renderBoss(); itemCheck(); }, 50);
}

function bossMark(c) { return ''; }
function renderBoss() {
  var el = $('boss'); if (!el || !BOSS) return;
  var sun = PC.dow(TODAY) === 0, B = BOSS, met = bossMet();
  el.hidden = !(sun || BOSS_OPEN);
  if (sun && store.get('slp-bosssun') !== '1') { store.set('slp-bosssun', '1'); setTimeout(function () { itemCheck(); }, 600); }
  var art = PX.ok ? '<div class="bossart" aria-hidden="true">' + icon('crown', 3) + icon('horns', 3) + bld(B, 4, sun ? null : { sil: 1, blind: 1 }) + '</div>' : '';
  var head = '<p class="bk">이번 주 보스 회사 · ' + esc(BWEEK.replace('-W', '년 ')) + '주' + (met ? ' · <b>조우 ✓</b>' : '') + '</p><p class="bnm">' + logo(B, 's') + esc(B.n) + '</p>';
  el.innerHTML = '<div class="bossbn' + (sun ? ' sun' : '') + '">' + art + '<div class="bossi">' + head + (sun
    ? '<p class="bt">일요일 정체 공개! 이번 주 보스의 직급별 연봉이에요.</p><div class="bstats">' + RK.map(function (n, i) { return '<div><small>' + n + '</small><b>' + man(B.rk[i]) + '</b></div>'; }).join('') +
      '<div><small>평점</small><b>' + (B.rt ? '★ ' + B.rt.toFixed(1) : '-') + '</b></div><div><small>직원</small><b>' + man(B.m) + '명</b></div></div>' +
      '<p class="bt"><a href="' + link(B) + '" target="_blank" rel="noopener">' + esc(B.n) + ' 직급별 연봉 자세히 보기 →</a> <span class="src">(만원, 연봉 연구소 추정)</span></p>'
    : '<p class="bt">게임에서 이 회사를 만나면 <b>BOSS</b> 배지가 붙어요. 일요일에 연봉 정체를 공개해요. 점수 보너스는 없어요.</p>') + '</div></div>';
}



var VS = null;
function fmtVs(game, s) { return game === 'road' ? fmtScore(game, s) : game === 'run' ? man(s) + '만원' : man(s) + '점'; }
function vsLink(game, code) { return SITE + '?vs=' + encodeURIComponent(code) + '#' + game; }
function vsBox(game, x) {
  if (!x || !x.vs) return '';
  return '<div class="vsbox"><button class="btn" type="button" data-vs="' + game + '">' + em('sword', '⚔') + ' 도전장 보내기</button><p class="msg2" aria-live="polite"></p><input class="vslink" readonly hidden aria-label="도전장 주소"></div>';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-vs]'); if (!b) return;
  if (store.get('slp-vssent') !== '1') { store.set('slp-vssent', '1'); setTimeout(function () { itemCheck(); }, 1200); }
  var g = b.dataset.vs, x = rec(TODAY, g); if (!x || !x.vs) return;
  var box = b.parentNode, url = vsLink(g, x.vs), text = '연봉 놀이터 도전장 ⚔ 나는 오늘 ' + GNAME[g] + ' ' + fmtVs(g, x.score) + '. 같은 문제로 이겨 봐!';
  var m = box.querySelector('.msg2'), inp = box.querySelector('.vslink');
  var fb = function () { inp.value = url; inp.hidden = false; inp.focus(); inp.select(); m.textContent = '아래 주소를 길게 눌러 복사해 보내세요.'; };
  var copy = function () { try { navigator.clipboard.writeText(text + '\n' + url).then(function () { m.textContent = '도전장 주소를 복사했어요. 친구에게 붙여 넣어 보내세요.'; }, fb); } catch (er) { fb(); } };
  try { if (navigator.share) { navigator.share({ title: '연봉 놀이터 도전장', text: text, url: url }).then(function () { m.textContent = '도전장을 보냈어요.'; }, copy); return; } } catch (er) {}
  copy();
});
function vsLoad() {
  var m = /[?&]vs=([^&#]+)/.exec(location.search || ''); if (!m) return;
  var code = decodeURIComponent(m[1]);
  call('/play/vs?c=' + encodeURIComponent(code)).then(function (j) {
    if (!j || PC.DAILY.indexOf(j.game) < 0) throw j;
    VS = j; renderVs();
    if (!location.hash) show(j.game, true);
  }).catch(function () { VS = { bad: 1 }; renderVs(); });
}
function renderVs() {
  var el = $('vsbar'); if (!el || !VS) return;
  if (VS.bad) { placeVs(); el.innerHTML = '<div class="vsbn"><p>도전장을 찾을 수 없어요. 주소가 잘렸거나 60일이 지난 도전장일 수 있어요. 오늘 문제는 그대로 할 수 있어요.</p></div>'; return; }
  var same = VS.day === TODAY;
  el.innerHTML = '<div class="vsbn">' + zorro(1, 'normal', 1.5, 'idle', { plain: 1 }) + '<p><b>' + esc(VS.nick) + '님의 도전장</b> · ' + GNAME[VS.game] + ' ' +
    (same ? '오늘 <b>' + fmtVs(VS.game, VS.score) + '</b>. 같은 문제로 이겨 보세요!' : mmdd(VS.day) + ' 문제(' + fmtVs(VS.game, VS.score) + ')였어요. 지난 문제는 다시 풀 수 없어서, 대신 오늘 문제로 도전해 보세요.') + '</p>' +
    '<button class="btn" type="button" id="vsGo">' + (same ? '도전하기' : '오늘 문제 하기') + '</button></div>';
  $('vsGo').onclick = function () { go(VS.game); var p = $('p-' + VS.game); if (p) p.scrollIntoView({ block: 'start' }); };
  placeVs();
}

function vsScene(game, x) {
  if (!VS || VS.bad || VS.game !== game || VS.day !== TODAY || !x || !PX.ok) return '';
  var me = x.score, th = VS.score, r = me > th ? 'win' : me < th ? 'lose' : 'draw';
  if (r === 'win') { var W = store.getJ('slp-vswins', {}); if (!W || typeof W !== 'object') W = {}; W[TODAY + '|' + game] = 1; store.setJ('slp-vswins', W); }
  var who = function (z, nm, sc) { return '<div class="vsw">' + z + '<b>' + nm + '</b><small>' + sc + '</small></div>'; };
  return stage('<span class="pxbanner">' + (r === 'win' ? '승리!' : r === 'lose' ? '패배…' : '무승부') + '</span><div class="pxrow vsrow">' +
    who(zorro(myRank(), r === 'win' ? 'happy' : r === 'lose' ? 'sad' : 'normal', 3, r === 'win' ? 'jump' : r === 'lose' ? 'oops' : 'idle'), '나', fmtVs(game, me)) + '<span class="pxvs">VS</span>' +
    who(zorro(1, r === 'lose' ? 'happy' : r === 'win' ? 'sad' : 'normal', 3, r === 'lose' ? 'jump' : 'idle', { plain: 1 }), esc(VS.nick), fmtVs(game, th)) + '</div>' + (r === 'win' ? confetti() : ''),
    'promo vsst', esc(VS.nick) + '님과 대결: ' + (r === 'win' ? '승리' : r === 'lose' ? '패배' : '무승부'));
}






function rankBox(game, x) {
  if (!x) return '';
  if (!x.sent && x.retry) return '<div class="rkbox rkfail" role="alert"><p class="rkl">점수를 못 보냈어요 · <small>' + esc(x.err || '연결이 안 돼요') + '</small></p>' +
    (x.reload ? '<button class="btn sm" type="button" data-reload="1">새로고침하기</button>' : '<button class="btn sm" type="button" data-retry="' + game + '">다시 보내기</button>') + '</div>';
  if (!x.sent) return '<div class="rkbox"><p class="rkl">' + esc(x.err || '점수를 보내지 못했어요') + '</p></div>';
  return '<div class="rkbox" data-rk="' + game + '"><p class="rkl">오늘 <b>' + (x.tie ? '공동 ' + man(x.tie) : man(x.rank)) + '위</b> / ' + man(x.total) + '명</p>' +
    '<ol class="nb" aria-label="내 앞뒤 순위">' + nbRow(x.rank, NICK, x.score, game, 1) + '</ol></div>';
}
function nbRow(r, nick, s, game, me) {
  return '<li class="' + (me ? 'me' : '') + '"><span class="r">' + man(r) + '</span><span class="n">' + esc(nick) + (me ? ' <small>(나)</small>' : '') + '</span><span class="s">' + fmtScore(game, s) + '</span></li>';
}

function fillNb(game, t) {
  var x = rec(TODAY, game), box = document.querySelector('.rkbox[data-rk="' + game + '"] .nb');
  if (!box || !t || !x || !x.sent || !x.rank) return;
  var L = t.today || [], r = x.rank, h = '';
  if (r >= 2 && L[r - 2]) h += nbRow(r - 1, L[r - 2][0], L[r - 2][1], game);
  h += nbRow(r, NICK, x.score, game, 1);
  if (L[r] && r <= L.length - 1) h += nbRow(r + 1, L[r][0], L[r][1], game);
  box.innerHTML = h;
}

function nextBtn(game) {
  var order = G5.slice(G5.indexOf(game) + 1).concat(G5.slice(0, G5.indexOf(game) + 1)), nx = '';
  order.forEach(function (k) { if (!nx && k !== game) { var S = gState(k); if (!S || !S.done) nx = k; } });
  return '<div class="nxrow">' + (nx ? '<button type="button" class="btn lime nx" data-go="' + nx + '">다음 게임: ' + esc(PNAME[nx]) + ' ▶</button>'
    : '<button type="button" class="btn lime nx" data-go="lobby">오늘 ' + G5.length + '개 다 했어요 · 게임 고르기로</button>') + tmrLine() + '</div>';
}

function tmrLine() {
  var gl = giftLeft(), no = PC.genToday(PC.addDays(TODAY, 1), ctx).no;
  return '<p class="tmr">' + (gl ? em('gift', '🎁') + ' 선물 상자까지 <b>' + gl + '게임</b> · ' : '') + '내일 0시: 스무고개 퀴즈 <b>#' + no + '</b> · 오늘 정답 공개 · ' + em('flame', '🔥') + ' 출석 <b>' + (streak() + 1) + '일째</b></p>';
}

var DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
function playedOn(d, game) { return rec(d, game); }
function dots7(game) {
  return '<ol class="d7">' + PC.weekDays(TODAY).map(function (d) {
    var x = playedOn(d, game), sc = x ? fmtScore(game, x.score) : '';
    return '<li class="' + (x ? 'on' : '') + (d === TODAY ? ' td' : '') + (d > TODAY ? ' fu' : '') + '" title="' + mmdd(d) + (sc ? ' ' + esc(sc) : '') + '"><i aria-hidden="true"></i><small>' + DOW_KO[PC.dow(d)] + '</small>' +
      '<span class="sr-only">' + mmdd(d) + ' ' + (x ? '함 ' + esc(sc) : d > TODAY ? '아직' : '안 함') + '</span></li>';
  }).join('') + '</ol>';
}
function week7(game) {
  var n = PC.weekDays(TODAY).filter(function (d) { return playedOn(d, game); }).length;
  return '<div class="wk7"><span class="wl">이번 주 <b>' + n + '/7</b></span>' + dots7(game) + '</div>';
}

function weekRows() {
  return '<div class="wkrows">' + G5.map(function (g) {
    var s = myWeek(g, PC.weekDays(TODAY).filter(function (d) { return d <= TODAY; }));
    return '<div class="wkr"><span class="wn">' + GNAME[g] + '</span>' + dots7(g) + '<b class="ws">' + (s == null ? '-' : fmtScore(g, s)) + '</b></div>';
  }).join('') + '</div>';
}



var SLOTS = ['hat', 'hand', 'acc', 'bg'];
function lookWith(k, v) { var L = {}; for (var x in LOOK) L[x] = LOOK[x]; if (v) L[k] = v; else delete L[k]; return L; }
function saveLook() { store.setJ('slp-look', LOOK); }
function lookTop() {
  var r = myRank(), x = myXP(), nx = nextXP(), lo = RANK_XP[r], hi = RANK_XP[Math.min(4, r + 1)], pct = r >= 4 ? 100 : Math.round((x - lo) / Math.max(1, hi - lo) * 100);
  return '<div class="lktop">' + (PX.ok ? stage(zorro(r, 'happy', 6, 'idle', { bg: 1 }), 'resst lkst', '지금 내 조로: ' + BASES[baseOf(LOOK)] + ', ' + nameRank(NICK, r)) : '') +
    '<div class="lkme"><p class="lknm">' + (topBadge() ? '<span class="badge1">' + esc(topBadge()) + '</span> ' : '') + esc(NICK) + ' <b class="lkrk1">' + RK[r] + '</b></p>' +
    '<p class="lkrk">경험치 ' + x + (r >= 4 ? ' · 만렙' : ' · ' + RK[r + 1] + ' 승진까지 ' + nx + '판') + '</p>' +
    '<div class="xpbar" role="progressbar" aria-label="다음 직급까지" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
    '<p class="src" style="margin:4px 0 0">오늘의 도전·조로 출근길을 끝낼 때마다(게임마다 하루 한 번) 경험치 +1, 칭호마다 +3. 10문제 다 맞히면 특진.</p>' +
    (PX.ok ? '<div><button type="button" class="btn sm" id="myIdBtn">' + em('idtag', '🪪') + ' 내 명함(사원증) 만들기</button><div id="myIdOut" aria-live="polite"></div></div>' : '') + '</div></div>';
}

function lookBase() {
  var r = myRank(), b = baseOf(LOOK), hr = hairOf(LOOK), opt = function (attr, v, on, inner, label) {
    return '<button type="button" class="opt" data-' + attr + '="' + v + '" aria-pressed="' + on + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '>' + inner + '</button>'; };
  var h = '<div class="opts big" role="group" aria-label="기본 모습">' + ['m', 'f'].map(function (k) {
    var L = { base: k, hair: k === b ? hr : HAIRS[k][0][0], bottom: LOOK.bottom, fit: k === 'f' || LOOK.fit !== 'dress' ? LOOK.fit : '', col: LOOK.col, face: LOOK.face, hat: LOOK.hat, hand: LOOK.hand, acc: LOOK.acc };
    return opt('base', k, k === b, (PX.ok ? zorro(r, 'normal', 2, '', { look: L }) : '') + '<span>' + BASES[k] + '</span>');
  }).join('') + '</div><p class="lkh4">머리 모양</p><div class="opts" role="group" aria-label="머리 모양">' + HAIRS[b].map(function (x) {
    return opt('hair', x[0], x[0] === hr, (PX.ok ? zorro(r, 'normal', 1.5, '', { look: { base: b, hair: x[0], face: LOOK.face }, head: 1 }) : '') + '<span>' + x[1] + '</span>');
  }).join('') + '</div>';
  var fit = fitOf(LOOK), with1 = function (k, v) { var L = lookWith(k, v); delete L.hat; delete L.hand; delete L.acc; return L; };
  h += '<p class="lkh4">얼굴형</p><div class="opts" role="group" aria-label="얼굴형">' + FACES.map(function (x) {
    return opt('face', x[0], x[0] === faceOf(LOOK), (PX.ok ? zorro(r, 'normal', 1.5, '', { look: with1('face', x[0]), head: 1 }) : '') + '<span>' + x[1] + '</span>');
  }).join('') + '</div>';
  h += '<p class="lkh4">옷</p><div class="opts" role="group" aria-label="옷">' + FITS.filter(function (x) { return !x[2] || x[2] === b; }).map(function (x) {
    return opt('fit', x[0], x[0] === fit, (PX.ok ? zorro(r, 'normal', 1.5, '', { look: with1('fit', x[0]) }) : '') + '<span>' + x[1] + '</span>');
  }).join('') + '</div>';
  h += '<p class="lkh4">옷 색 <small>' + (fit === 'suit' ? '기본 = 직급 색(사원은 흰 셔츠)' : fit === 'semi' ? '니트 색' : '원피스 색') + '</small></p><div class="sws" role="group" aria-label="옷 색">' + COLS.map(function (x) {
    return '<button type="button" class="sw" data-col="' + x[0] + '" aria-pressed="' + (x[0] === colOf(LOOK)) + '" title="' + x[1] + '"><i style="background:' + (x[2] || 'conic-gradient(#3b4a6b 0 25%,#34405e 0 50%,#2b2f3a 0 75%,#f4f4f4 0)') + '"></i><span>' + x[1] + '</span></button>';
  }).join('') + '</div>';
  if (b === 'f' && fit !== 'dress') h += '<p class="lkh4">아래옷</p><div class="opts" role="group" aria-label="아래옷">' + BOTTOMS.map(function (x) {
    var on = (LOOK.bottom === 'skirt' ? 'skirt' : 'pants') === x[0];
    return opt('bottom', x[0], on, (PX.ok ? zorro(r, 'normal', 1.5, '', { look: with1('bottom', x[0] === 'skirt' ? 'skirt' : '') }) : '') + '<span>' + x[1] + '</span>');
  }).join('') + '</div>';
  return h;
}
function lookItems() {
  var own = itemsOwned(), r = myRank();
  return SLOTS.map(function (slot) {
    var L = ITEMS.filter(function (it) { return it[1] === slot; });
    return '<div class="lkslot" id="slot-' + slot + '"><p class="lkh4">' + SLOT_LB[slot] + ' <small>' + L.filter(function (it) { return own[it[0]]; }).length + ' / ' + L.length + '</small></p><div class="items" role="group" aria-label="' + SLOT_LB[slot] + '">' +
      '<button type="button" class="itemb" data-slot="' + slot + '" data-id="" aria-pressed="' + !LOOK[slot] + '"><span class="iname">없음</span></button>' +
      L.map(function (it) {
        var have = !!own[it[0]], look = lookWith(slot, it[0]);
        return '<button type="button" class="itemb r-' + it[6] + (have ? '' : ' locked') + '" data-slot="' + slot + '" data-id="' + it[0] + '" title="' + esc(it[8]) + '"' + (have ? ' aria-pressed="' + (LOOK[slot] === it[0]) + '"' : ' disabled') + '>' +
          (PX.ok ? '<span class="ipv">' + itemArt(it[0], slot === 'bg' ? 2 : 3, have ? '' : 'sil', 58) + '<span class="tryon" data-tz="' + it[0] + '"></span></span>' : '') + '<span class="iname">' + esc(it[2]) + '</span>' +
          (it[6] !== 'c' ? '<span class="rar">' + RAR_LB[it[6]] + '</span>' : '') + (have ? '' : '<small>' + esc(it[3]) + '</small>') + '</button>';
      }).join('') + '</div></div>';
  }).join('');
}
function lookBadges() {
  var b = badges(), cur = myTitleId(), pick = store.get('slp-title');
  return '<div class="bgrid">' + BADGES.map(function (x) {
    var on = !!b[x[0]], inner = (PX.ok ? icon(on ? 'star' : 'lock', 2) : '') + '<b>' + esc(x[1]) + '</b><small>' + (on ? (cur === x[0] ? '닉네임 앞에 다는 중' : mmdd(b[x[0]]) + ' 얻음 · 눌러서 달기') : esc(x[2])) + '</small>';
    return on ? '<button type="button" class="bg on' + (cur === x[0] ? ' wear' : '') + '" data-title="' + x[0] + '" aria-pressed="' + (cur === x[0]) + '" title="' + esc(x[2]) + '">' + inner + '</button>'
      : '<div class="bg" title="' + esc(x[2]) + '">' + inner + '</div>';
  }).join('') + '</div>' + (Object.keys(b).length ? '<div class="row" style="margin-top:8px"><button type="button" class="btn sm ghost" data-title="none" aria-pressed="' + (pick === 'none') + '">칭호 안 달기</button>' +
    (pick ? '<button type="button" class="btn sm ghost" data-title="">가장 최근 칭호로 (자동)</button>' : '') + '</div>' : '');
}
var LOOK_SECS = [
  ['lkBase', '기본 <b>모습</b>', function () { return '<p class="src" style="margin:0 0 10px">처음부터 무료예요. 직급(재킷·안경·머리색)은 남녀 똑같이 따라가요.</p>' + lookBase(); }],
  ['lkItems', '소품 <b>꾸미기</b>', function () { var n = Object.keys(itemsOwned()).filter(function (k) { return ITEM_BY[k]; }).length;
    return '<p class="src" style="margin:0 0 10px">모은 소품 <b>' + n + ' / ' + ITEMS.length + '</b> · 칸마다 하나씩. 게임마다 얻는 소품이 따로 있고, 하루 3게임을 하면 선물 상자가 열려요(이 기기에 저장, 점수와는 상관없어요).</p>' + lookItems(); }],
  ['lkBadges', '<b>칭호</b>', function () { return '<p class="src" style="margin:0 0 10px">얻은 칭호를 누르면 닉네임 앞에 달아요 (순위표·명예의 전당에도 같이). 고르지 않으면 가장 최근 칭호. 연속 출석 ' + em('flame', '🔥', 1) + ' ' + streak() + '일.</p>' + lookBadges(); }],
  ['lkEnd', '엔딩 <b>도감</b>', function () { return '<p class="src" style="margin:0 0 6px">커리어 로드에서 본 엔딩이 모여요.</p>' + endDogam(null).replace(/<p class="h3"[^>]*>[^<]*<\/p>/, ''); }]
];
function renderLook() {
  var el = $('look'); if (!el) return;
  var sc = el.parentNode ? el.parentNode.scrollTop : 0;
  el.innerHTML = lookTop() + LOOK_SECS.map(function (s) { return '<section class="lksec" id="' + s[0] + '"><h3 class="lkh">' + s[1] + '</h3>' + s[2]() + '</section>'; }).join('');
  if (el.parentNode) el.parentNode.scrollTop = sc;
  lookTryOn(el);
  var ib = $('myIdBtn'); if (ib) ib.onclick = function () { var go = function () { drawMyId($('myIdOut')); }; try { document.fonts && document.fonts.ready ? document.fonts.ready.then(go, go) : go(); } catch (e) { go(); } };
  var after = function (sel) { renderLook(); renderMe(); var f = $('look').querySelector(sel); if (f) f.focus({ preventScroll: true }); };
  el.querySelectorAll('.itemb:not([disabled])').forEach(function (b) { b.onclick = function () {
    LOOK[b.dataset.slot] = b.dataset.id; if (!b.dataset.id) delete LOOK[b.dataset.slot];
    saveLook(); sfx('coin'); after('.itemb[data-slot="' + b.dataset.slot + '"][data-id="' + b.dataset.id + '"]');
  }; });
  el.querySelectorAll('.opt, .sw').forEach(function (b) { b.onclick = function () {
    var d = b.dataset, set = function (k, v, dflt) { if (v === dflt) delete LOOK[k]; else LOOK[k] = v; };
    if (d.base) { if (d.base === 'f') LOOK.base = 'f'; else { delete LOOK.base; if (LOOK.fit === 'dress') delete LOOK.fit; } delete LOOK.hair; if (d.base !== 'f') delete LOOK.bottom; }
    if (d.hair) LOOK.hair = d.hair;
    if (d.bottom) set('bottom', d.bottom, 'pants');
    if (d.fit) set('fit', d.fit, 'suit');
    if (d.col) set('col', d.col, 'auto');
    if (d.face) set('face', d.face, 'basic');
    var k = ['base', 'hair', 'bottom', 'fit', 'col', 'face'].filter(function (x) { return d[x]; })[0];
    saveLook(); sfx('coin'); after('[data-' + k + '="' + d[k] + '"]');
  }; });
  el.querySelectorAll('[data-title]').forEach(function (b) { b.onclick = function () {
    var t = b.dataset.title; if (t) store.set('slp-title', t); else store.del('slp-title');
    sfx('coin'); after(t ? '[data-title="' + t + '"]' : '#lkBadges'); toast(t === 'none' ? '칭호를 떼었어요.' : t ? '칭호를 달았어요: ' + badgeName(t) : '가장 최근 칭호가 자동으로 붙어요.');
  }; });
}

function lookTryOn(root) {
  var L = [].slice.call(root.querySelectorAll('.tryon[data-tz]')), own = itemsOwned(), r = myRank(), i = 0;
  clearTimeout(lookTryOn.t);
  (function step() {
    var t0 = performance.now();
    while (i < L.length && performance.now() - t0 < 12) {
      var el = L[i++], it = ITEM_BY[el.dataset.tz]; if (!it || !el.isConnected) continue;
      el.innerHTML = zorro(r, 'normal', 1, '', { look: lookWith(it[1], it[0]), sil: !own[it[0]], bg: it[1] === 'bg' }); el.removeAttribute('data-tz');
    }
    if (i < L.length) lookTryOn.t = setTimeout(step, 16);
  }());
}

function gotBox(game) {
  var got = itemCheck(true), nx = nextItem(game), h = '', gift = got.some(function (g) { return g.indexOf('gift:') === 0; });
  if (got.length) {
    h += '<div class="gotbox" role="status"><p class="gtl">' + (gift ? '오늘의 <b>선물 상자</b>가 열렸어요!' : '새 <b>소품</b>을 얻었어요!') + '</p><div class="gotl">' + got.map(function (g) {
      var id = g.replace('gift:', ''), it = ITEM_BY[id];
      return '<div class="goti r-' + it[6] + '">' + (PX.ok ? '<span class="gotart"><span class="boxani" aria-hidden="true">' + icon('chest', 4) + '</span><span class="gotz">' + itemArt(id, it[1] === 'bg' ? 2 : 4) + zorro(myRank(), 'happy', 2, '', { look: lookWith(it[1], id), bg: it[1] === 'bg' }) + '</span></span>' : '') +
        '<b>' + esc(it[2]) + '</b><small>' + RAR_LB[it[6]] + (g !== id ? ' · 오늘의 선물' : '') + ' · ' + esc(it[8]) + '</small>' +
        '<button type="button" class="btn sm" data-try="' + id + '">입어 보기</button></div>';
    }).join('') + '</div></div>';
    sfx('fanfare');
  }
  if (nx) {
    var it = nx.it, pr = nx.pr, pct = pr ? Math.round(Math.min(1, pr[0] / pr[1]) * 100) : 0;
    var u = PUNIT[it[0]] != null ? PUNIT[it[0]] : '', left = pr ? Math.max(0, pr[1] - pr[0]) : 0;
    h += '<div class="nxitem"><span class="nl">다음 소품</span><b>' + esc(it[2]) + '</b><small>' + esc(it[3]) + (pr ? ' · ' + (u ? man(pr[1]) + u + '까지 ' + man(left) + u : '경험치 ' + man(left) + ' 남음') : '') + '</small>' +
      (pr ? '<span class="xpbar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' : '') + '</div>';
  }
  return h;
}

document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-try]'); if (!b) return;
  var it = ITEM_BY[b.dataset.try]; if (!it || !itemsOwned()[it[0]]) return;
  LOOK[it[1]] = it[0]; saveLook(); renderMe(); lkOpen(true);
  setTimeout(function () { var f = $('look').querySelector('.itemb[data-id="' + it[0] + '"]'); if (f) { f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); } }, 60);
});

function giftTag(g) { var L = gameItems(g), own = itemsOwned(); return L.length ? '<span class="gft" title="이 게임에서 얻는 소품">' + em('gift', '🎁', 1) + ' ' + L.filter(function (it) { return own[it[0]]; }).length + '/' + L.length + '</span>' : ''; }




var LK = { open: false, last: null, t: 0 };
function lkIsOpen() { return LK.open; }
function lkEls() { return { d: $('lkDrawer'), b: $('lkBack') }; }
function lkOpen(push) {
  var E = lkEls(); if (!E.d) return;
  renderLook();
  if (!LK.open) {
    LK.open = true; LK.last = document.activeElement;
    clearTimeout(LK.t); E.d.hidden = false; E.b.hidden = false; E.d.style.transform = ''; E.b.style.opacity = '';
    document.documentElement.classList.add('lk-open');

    requestAnimationFrame(function () { requestAnimationFrame(function () { if (LK.open) { E.d.classList.add('open'); E.b.classList.add('on'); } }); });
    $('lkClose').focus({ preventScroll: true });
    if (push) { try { history.pushState({ lk: 1 }, '', '#look'); } catch (e) {} }
  }
  dockSync();
}
function lkClose(fromHist) {
  var E = lkEls(); if (!LK.open || !E.d) return;
  if (!fromHist && history.state && history.state.lk) { try { history.back(); return; } catch (e) {} }
  LK.open = false;
  E.d.classList.remove('open', 'drag'); E.b.classList.remove('on'); E.d.style.transform = ''; E.b.style.opacity = '';
  document.documentElement.classList.remove('lk-open');
  LK.t = setTimeout(function () { if (!LK.open) { E.d.hidden = true; E.b.hidden = true; } }, REDUCE ? 0 : 300);
  if (!fromHist && location.hash === '#look') { try { history.replaceState(history.state, '', !CUR || CUR === 'lobby' ? location.pathname + location.search : '#' + CUR); } catch (e) {} }
  if (LK.last && LK.last.focus && document.contains(LK.last)) LK.last.focus({ preventScroll: true });
  dockSync();
}

document.addEventListener('keydown', function (e) {
  if (!LK.open) return;
  if (e.key === 'Escape') { e.preventDefault(); lkClose(); return; }
  if (e.key !== 'Tab') return;
  var f = [].filter.call($('lkDrawer').querySelectorAll('button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])'), function (x) { return x.offsetParent || x === document.activeElement; });
  if (!f.length) return;
  var a = f[0], z = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === a || !$('lkDrawer').contains(document.activeElement))) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && (document.activeElement === z || !$('lkDrawer').contains(document.activeElement))) { e.preventDefault(); a.focus(); }
});

(function () {
  var S = null, EDGE = 24, GO = 60;
  function W() { return $('lkDrawer').getBoundingClientRect().width || innerWidth; }
  function setX(x, w) { var E = lkEls(); E.d.style.transform = 'translateX(' + Math.max(0, Math.min(w, x)) + 'px)'; E.b.style.opacity = String(1 - Math.max(0, Math.min(w, x)) / w); }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { S = null; return; }
    var t = e.touches[0], E = lkEls();
    if (!LK.open && innerWidth <= 640 && t.clientX >= innerWidth - EDGE) S = { mode: 'open', x0: t.clientX, y0: t.clientY, dx: 0, axis: '' };
    else if (LK.open && E.d.contains(e.target) && !(e.target.closest && e.target.closest('input, textarea, .segx'))) S = { mode: 'close', x0: t.clientX, y0: t.clientY, dx: 0, axis: '' };
    else S = null;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!S) return;
    var t = e.touches[0], dx = t.clientX - S.x0, dy = t.clientY - S.y0, E = lkEls(), w;
    if (!S.axis) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; S.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'; if (S.axis === 'y') { S = null; return; } }
    S.dx = dx;
    if (S.mode === 'open') {
      if (!S.on) { S.on = true; E.d.hidden = false; E.b.hidden = false; renderLook(); E.d.classList.add('drag'); E.b.classList.add('on'); }
      w = W(); setX(w + dx, w);
    } else { if (!S.on) { S.on = true; E.d.classList.add('drag'); } w = W(); setX(dx, w); }
  }, { passive: true });
  function end() {
    if (!S) return;
    var s = S, E = lkEls(); S = null;
    if (!s.on) return;
    E.d.classList.remove('drag');
    if (s.mode === 'open') {
      if (-s.dx > GO) { E.d.style.transform = ''; E.b.style.opacity = ''; lkOpen(true); }
      else { E.d.style.transform = ''; E.b.classList.remove('on'); E.b.style.opacity = ''; LK.t = setTimeout(function () { if (!LK.open) { E.d.hidden = true; E.b.hidden = true; } }, REDUCE ? 0 : 300); }
    } else {
      if (s.dx > GO) lkClose(); else { E.d.style.transform = ''; E.b.style.opacity = ''; }
    }
  }
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
}());



var HG = 'line';
function renderHall() {
  $('hall').innerHTML = '<div class="toolbar"><div class="seg segx" id="hallSeg" role="group" aria-label="게임 고르기">' + G5.map(function (g) { return '<button type="button" data-v="' + g + '" aria-pressed="' + (g === HG) + '">' + GNAME[g] + '</button>'; }).join('') + '</div></div>' +
    '<div class="arcade"><p class="ahd">★ HI-SCORE ★</p><p class="ahd2 g">' + esc(GNAME[HG]) + '</p><p class="ahd2">INSERT COIN</p>' +
    '<div id="hallLb"><p class="src">순위를 불러오는 중이에요…</p></div></div>' +
    '<p class="h3">이번 주 내 기록</p><p class="src" style="margin:0 0 8px">라임 칸 = 한 날, 점선 = 오늘. 오른쪽은 이번 주 합계(빠진 날 0점). 칭호는 <a href="#look">내 조로</a>에 모여 있어요.</p>' + weekRows();
  document.querySelectorAll('#hallSeg button').forEach(function (bt) { bt.onclick = function () { HG = bt.dataset.v; renderHall(); var f = document.querySelector('#hallSeg button[data-v="' + HG + '"]'); if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }; });
  getTop(HG).then(function (t) { var el = $('hallLb'); if (el) el.innerHTML = t ? lbAll(t, HG) : '<p class="src">순위를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'; });
}


var FAM = ['삼성전자', 'SK하이닉스', '현대자동차', '기아', 'LG전자', 'LG에너지솔루션', 'NAVER', '네이버', '카카오', '쿠팡', 'SK텔레콤', 'KT', '이마트', '롯데쇼핑', '대한항공', '한국전력공사', '신한은행', '포스코', '현대모비스']
  .map(function (n) { return BYN[n]; }).filter(Boolean);
function rankPos(c, v) { var r = c.rk; if (v < r[0] * .9) return -1; if (v > r[4] * 1.1) return 5;
  for (var i = 0; i < 4; i++) if (v < r[i + 1]) return Math.max(0, i + (v - r[i]) / (r[i + 1] - r[i])); return 4; }
function rankLb(p) { return p < 0 ? '사원 연봉에도 못 미침' : p >= 5 ? '부장보다 많음' : RK[Math.round(Math.min(4, p))] + '급'; }
function rankTool() {
  var v = +$('rkPay').value;
  if (!(v >= 1000 && v <= 100000)) { $('rkOut').innerHTML = '<p class="src">1,000만원에서 10억 사이로 넣어 주세요.</p>'; return; }
  var G6 = { '-1': [], 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
  POOL.forEach(function (c) { var p = rankPos(c, v); G6[p < 0 ? -1 : p >= 5 ? 5 : Math.round(Math.min(4, p))].push(c); });
  var up = G6[2].length + G6[3].length + G6[4].length + G6[5].length;
  var h = '<p class="big1">연봉 ' + man(v) + '만원이면, 아는 회사 ' + POOL.length + '곳 중 <b>' + up + '곳</b>에서 과장 이상이에요.</p>';
  h += '<div class="chips">' + FAM.map(function (c) { var p = rankPos(c, v); return '<span class="chip' + (p >= 2 ? ' hi' : '') + '">' + esc(c.n) + ' <b>' + rankLb(p) + '</b></span>'; }).join('') + '</div>';
  var ends = function (L, txt) { if (!L.length) return ''; L = L.slice().sort(function (a, b) { return b.m - a.m; });
    return '<p class="endl">' + L.slice(0, 4).map(function (c) { return '<b>' + esc(c.n) + '</b>'; }).join(', ') + (L.length > 4 ? ' 등 ' : ' ') + L.length + '곳은 ' + txt + '</p>'; };
  h += ends(G6[5], '내 연봉이 그 회사 부장보다도 많아요.') + ends(G6[-1], '사원 연봉이 이미 내 연봉보다 많아요.');
  h += '<div class="rcols">' + [[0, '사원급'], [1, '대리급'], [2, '과장급'], [3, '차장급'], [4, '부장급']].filter(function (k) { return G6[k[0]].length; }).map(function (k) {
    var L = G6[k[0]].slice().sort(function (a, b) { return b.m - a.m; });
    return '<div class="rcol"><h4>' + k[1] + '<small>' + L.length + '곳</small></h4><ul>' + L.slice(0, 5).map(function (c) { return '<li><span>' + esc(c.n) + '</span><small>' + man(c.rk[k[0]]) + '</small></li>'; }).join('') + '</ul>' +
      (L.length > 5 ? '<p class="more">외 ' + (L.length - 5) + '곳</p>' : '') + '</div>'; }).join('') + '</div>';
  var top = FAM.filter(function (c) { return rankPos(c, v) >= 2; }).slice(0, 3).map(function (c) { return c.n; });
  h += shareBox('shRk') + '<p class="src">회사 옆 숫자는 그 직급의 추정 연봉(만원)이에요. 상장사 매출 상위 500곳·직원 1,000명 이상 회사 기준이고, 직급 연봉 사이에서 더 가까운 쪽으로 묶었어요.</p>';
  $('rkOut').innerHTML = h;
  wireShare('shRk', '내 연봉이면 아는 회사 ' + POOL.length + '곳 중 ' + up + '곳에서 과장 이상' + (top.length ? ' (' + top.join(', ') + ')' : '') + '\n내 직급 환산해 보기 → ' + SITE_S + '/#tools', { title: '직급 환산기', big: up + '곳', sub: '에서 과장 이상\n아는 회사 ' + POOL.length + '곳 중' });
}
var LV = { c: BYN['삼성전자'] || FAM[0], t0: performance.now(), raf: 0 };
function perSec(manwon) { return manwon * 10000 / 31536000; }
function liveDraw() {
  var me = +$('lvPay').value || 0, c = LV.c, ex = c.ex && c.ex > c.rk[4] ? c.ex : 0;
  var rows = [['me2', '나', '연봉 ' + man(me) + '만원', me], ['', esc(c.n) + ' 사원', '추정 ' + man(c.rk[0]) + '만원', c.rk[0]], ['', esc(c.n) + ' 부장', '추정 ' + man(c.rk[4]) + '만원', c.rk[4]]];
  if (ex) rows.push(['ex', esc(c.n) + ' 임원 평균', (c.exR ? '공시 ' : '추정 ') + man(ex) + '만원', ex]);
  var mx = Math.max.apply(null, rows.map(function (r) { return r[3]; })) || 1, hr = me * 10000 / 12 / 209;
  $('lvOut').innerHTML = '<div class="ticks">' + rows.map(function (r) {
    return '<div class="tick ' + r[0] + '"><span class="who">' + r[1] + '<small>' + r[2] + '</small></span><span class="won" data-r="' + perSec(r[3]) + '">0<small>원</small></span><span class="rt"><i style="width:' + (r[3] / mx * 100) + '%"></i></span></div>'; }).join('') + '</div>' +
    '<div class="facts">' + (me ? '<div class="fact"><b>' + man(hr) + '원</b>내 시급이에요(주 40시간, 한 달 209시간 기준).</div><div class="fact"><b>' + (4500 / perSec(me) / 60).toFixed(0) + '분</b>커피 한 잔(4,500원)을 버는 데 걸리는 시간이에요. ' + esc(c.n) + ' 부장은 ' + (4500 / perSec(c.rk[4]) / 60).toFixed(0) + '분.</div>' : '') +
    (me && ex ? '<div class="fact"><b>' + (ex / me).toFixed(1) + '년</b>' + esc(c.n) + ' 임원의 1년 연봉을 벌려면 내가 일해야 하는 시간이에요.</div>' : '') +
    (me ? '<div class="fact"><b>' + (c.rk[4] / me).toFixed(1) + '배</b>' + esc(c.n) + ' 부장 연봉은 내 연봉의 이만큼이에요.</div>' : '') + '</div>' + shareBox('shLv') +
    '<p class="src">자는 시간까지 넣은 1년 365일 기준이에요. 회사 숫자는 연봉 연구소 직급별 추정치, 임원은 공시 평균(없으면 추정)이에요.</p>';
  if (me) wireShare('shLv', '내가 커피 한 잔 버는 데 ' + (4500 / perSec(me) / 60).toFixed(0) + '분, ' + c.n + ' 부장은 ' + (4500 / perSec(c.rk[4]) / 60).toFixed(0) + '분\n실시간 월급 재 보기 → ' + SITE_S + '/#tools',
    { title: '실시간 월급', big: (4500 / perSec(me) / 60).toFixed(0) + '분', sub: '커피 한 잔 버는 시간\n' + c.n + ' 부장은 ' + (4500 / perSec(c.rk[4]) / 60).toFixed(0) + '분' });
  else $('shLv').hidden = true;
}
function liveTick() {
  if ($('p-tools').hidden || $('tool-live').hidden) { LV.raf = 0; return; }
  var s = (performance.now() - LV.t0) / 1000;
  document.querySelectorAll('#lvOut .won').forEach(function (el) { var v = +el.dataset.r * s; el.firstChild.nodeValue = v < 1000 ? v.toFixed(1) : man(v); });
  LV.raf = REDUCE ? setTimeout(liveTick, 1000) : requestAnimationFrame(liveTick);
}
function liveStart() { $('lvIn').value = LV.c.n; liveDraw(); if (!LV.raf) liveTick(); }
$('rkPay').oninput = rankTool; $('lvPay').oninput = liveDraw;
$('lvReset').onclick = function () { LV.t0 = performance.now(); };
ac($('lvIn'), $('lvAc'), CO, function (c) { if (!c) return; LV.c = c; $('lvIn').value = c.n; liveDraw(); });
$('lvIn').addEventListener('blur', function () { setTimeout(function () { $('lvIn').value = LV.c.n; }, 150); });


var TOOL = 'rank';
function setTool(v) {
  TOOL = v;
  document.querySelectorAll('#toolSeg button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.v === v); });
  $('tool-rank').hidden = v !== 'rank'; $('tool-live').hidden = v !== 'live';
}
document.querySelectorAll('#toolSeg button').forEach(function (b) { b.onclick = function () { setTool(b.dataset.v); toolRender(); dockSync(); gbSync(); }; });

var KEYS = ['line', 'today', 'sniper', 'road', 'cup', 'run', 'hall', 'tools'], G5 = KEYS.slice(0, 6);

var RENDER = { today: function () { renderToday(); }, sniper: function () { renderSniper(); }, road: function () { renderRoad(); }, cup: function () { renderCup(); }, run: function () { renderRun(); }, line: function () { renderLine(); }, hall: renderHall, tools: function () { toolRender(); } };
function toolRender() { TOOL === 'live' ? liveStart() : rankTool(); }
var PNAME = { higher: GNAME.higher, today: '스무고개 퀴즈', sniper: GNAME.sniper, road: GNAME.road, cup: '드림 컴퍼니 월드컵', run: '조로 출근길', line: '연봉 줄서기', hall: '순위 · 명예의 전당', look: '내 조로', tools: '연봉 도구' };

var GINFO = {
  today: PC.genToday(TODAY, ctx).v === 3 ? ['magnifier', '스페셜 힌트 하나로 추리하고 조로에게 예/아니오 질문! 카드 12장 중 숨은 회사를 찾아요.', '질문 5번 · 약 1분'] : ['magnifier', '후보 8곳 중 숨은 회사 1곳을 찾아요. 단서는 하나씩 열려요.', '기회 3번 · 약 1분'],
  sniper: ['target', '회사와 직급을 보고 막대를 밀어 연봉을 찍어요.', '5문제 · 약 2분'],
  road: ['sign', '여자·남자 중 골라 20년을 살아요. 이직·회사 일·연애·결혼·육아까지, 연봉·체력·커리어·행복 종합점수로 겨뤄요.', '16번 고르기 · 약 7분'],
  cup: ['trophy', '오늘의 16강! 가고 싶은 회사를 고르면 전국 민심이 공개, 민심과 같을수록 점수.', '15번 고르기 · 약 1분'],
  run: ['bus', '탈것마다 미니게임이 바뀌는 출근 질주! 지하철은 연타로 타고, 신호등에선 꾹 멈춰요.', '약 1분 20초'],
  line: ['queue', '회사·직급이 다른 조로들을 연봉 높은 순서대로 줄 세워요. 같은 회사 대리 vs 다른 회사 과장?', '5판 · 약 1분']
};

function gState(k) {
  if (k === 'line' && LN && LN.mode === 'free') return { prog: 1, meta: '연습 판 ROUND ' + (LN.k + 1), go: '이어서 하기 ▶' };
  if (k === 'run') { var rx = runRec(); return RUN && RUN.on ? { prog: 1, meta: '달리는 중이에요', go: '이어서 달리기 ▶' }
    : rx && rx.sent != null ? { done: 1, meta: '✓ ' + man(rx.score) + '만원' + (rx.sent && rx.rank ? ' · 오늘 ' + man(rx.rank) + '위' : '') + (runRanked() ? ' · 1번 남음' : ''), go: runRanked() ? '두 번째 도전 ▶' : '연습 출근하기' } : null; }
  var x = rec(TODAY, k);
  if (x) return { done: 1, meta: '✓ ' + fmtScore(k, x.score) + (x.sent && x.rank ? ' · 오늘 ' + man(x.rank) + '위' : ''), go: '결과 보기' };
  if (prog(k)) return { prog: 1, meta: '하던 판이 있어요', go: '이어서 하기 ▶' };
  return null;
}



var NEWB = null, NEW_KEYS = ['slp-streak', 'slp-runst', 'slp-ln-best', 'slp-sn-best', 'slp-cupwins', 'slp-endings', 'slp-r2st', 'slp-badges', 'slp-xpb', 'slp-today1', 'slp-gift'];
function firstVisit() {
  if (NEWB === false) return false;
  var seen = false, k, i;
  for (k in MEMS) if (k.indexOf('slp-r-') === 0) seen = true;
  try { for (i = 0; i < localStorage.length && !seen; i++) { k = localStorage.key(i) || ''; if (k.indexOf('slp-r-') === 0 || k.indexOf('slp-cupw-') === 0 || NEW_KEYS.indexOf(k) >= 0) seen = true; } } catch (e) {}
  NEWB = !seen; return NEWB;
}




var GLINE = { line: '연봉 높은 순서로 줄 세우기', today: '질문으로 숨은 회사 찾기', sniper: '회사·직급 보고 연봉 맞히기',
  road: '20년 직장 생활 살아 보기', cup: '가고 싶은 회사 16강 대결', run: '미니게임 출근 질주' };
function renderLobby() {
  var st = {}, nDone = 0, feat = '';
  G5.forEach(function (k) { st[k] = gState(k); if (st[k] && st[k].done) nDone++; else if (!feat) feat = k; });
  RPZ = RPZ || PC.genRoad(TODAY, ctx);
  var nb = firstVisit();
  if (nb) document.documentElement.setAttribute('data-new', '1'); else document.documentElement.removeAttribute('data-new');
  $('games').className = 'games nb';
  var tno = PC.genToday(TODAY, ctx).no;
  $('games').innerHTML = G5.map(function (k) {
    var S = st[k], f = k === feat, I = GINFO[k], nm = k === 'today' ? '스무고개 퀴즈 #' + tno : PNAME[k];
    var meta = esc(S ? S.meta : k === 'road' ? '오늘 팩: ' + PC.ROAD_SC[RPZ.sc || 'new'] + ' · ' + I[2] : I[2]);
    var tag = f ? '<span class="glt">추천</span>' : k === 'line' && TODAY < '2026-11-15' ? '<span class="glt">NEW</span>' : '';
    return '<button type="button" class="gl' + (S && S.done ? ' done' : '') + '" id="t-' + k + '" data-go="' + k + '">' +
      (PX.ok ? '<span class="gli">' + icon(I[0], 3) + '</span>' : '<span class="gli" aria-hidden="true">0' + (G5.indexOf(k) + 1) + '</span>') +
      '<b class="gn">' + esc(nm) + tag + '</b><span class="gd">' + esc(GLINE[k] || '') + '</span><small>' + meta + ' ' + giftTag(k) + '</small><span class="gla" aria-hidden="true">' + (S ? S.go : '시작 ▶') + '</span></button>';
  }).join('');
  var gl = giftLeft(), crs = ['line', 'today', 'sniper'].filter(function (k) { return !(st[k] && st[k].done); })[0];
  $('lobbyN').innerHTML = G5.length + '개 중 ' + nDone + '개 했어요 · ' + em('gift', '🎁') + (gl ? ' 선물 상자까지 <b>' + gl + '개</b>' : ' 오늘 선물 받음');
  $('course').innerHTML = todPicker() + (nb ? '<p class="nbhi">회사·직급별 연봉을 맞혀 보는 게임이에요. 처음이면 이것부터 해 보세요.</p>' : '') +
    (crs ? '<button type="button" class="btn big crs nbgo" data-go="' + crs + '">▶ 오늘의 3분 코스' + (crs !== 'line' || (st[crs] && st[crs].prog) ? ' 이어서 하기' : nb ? ' 시작하기' : '') +
      '<small>줄서기 → 스무고개 → 스나이퍼' + (nb ? ' · 가입 없이 바로' : '') + '</small></button>' : '');
  dockSubs();
  lazyIdle(feat);
}

function dockSubs() {
  var hk = PC.DAILY.filter(function (k) { var x = rec(TODAY, k); return x && x.sent && x.rank; })[0], B = endBook();
  $('dkHall').textContent = hk ? '오늘 ' + PNAME[hk] + ' ' + man(rec(TODAY, hk).rank) + '위' : '오늘의 도전 순위 · 명예의 전당';
  $('dkLook').textContent = '칭호 ' + Object.keys(badges()).length + '개 · 소품 ' + Object.keys(itemsOwned()).length + '개 · 엔딩 ' + PC.ENDINGS.filter(function (e) { return B[e[0]]; }).length + '/' + PC.ENDINGS.length;
  if (PX.ok) document.querySelectorAll('#dock .di[data-ic]').forEach(function (el) { var n = el.dataset.ic; el.innerHTML = n === 'zorro' ? zorro(myRank(), 'normal', 1, '', { head: 1 }) : icon(n, 2); });
}
function dockSync() {
  var a = LK.open ? 'look' : CUR;
  document.querySelectorAll('#dock .dk').forEach(function (b) { if (b.dataset.go === a) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}

function placeVs() {
  var el = $('vsbar'); if (!el) return;
  var lob = !CUR || CUR === 'lobby';
  if (lob) $('lobby').parentNode.insertBefore(el, $('lobby')); else $('playbar').parentNode.insertBefore(el, $('playbar').nextSibling);
  el.hidden = !VS || !(lob || VS.bad || VS.game === CUR);
}

function gbSync() {
  if (!CUR || CUR === 'lobby') return;
  var k = CUR, t = '', f = null, p;
  $('gbName').textContent = PNAME[k] + (k === 'today' && TPZ ? ' #' + TPZ.no : '');
  try {
    if (k === 'today') {
      p = prog('today');
      if (rec(TODAY, 'today')) t = '끝';
      else if (p && TPZ && TPZ.v === 3 && Array.isArray(p.log)) { t = '질문 ' + p.log.filter(function (a) { return a[0] === '?'; }).length + ' / ' + PC.T3_MAXQ; }
      else if (p && TPZ && (TPZ.v === 2 || TPZ.v === 4) && Array.isArray(p.log)) { var T2 = TPZ.v === 4 ? PC.T4_TRIES : PC.TODAY2_TRIES; t = '추측 ' + p.log.length + ' / ' + T2; f = p.log.length / T2; }
      else if (p && TPZ && Array.isArray(p.log)) { var R = PC.simToday(TPZ, p.log); if (R) { t = '단서 ' + R.open + ' / ' + PC.TODAY_CLUES; f = R.open / PC.TODAY_CLUES; } }
    } else if (k === 'sniper') {
      p = prog('sniper');
      if (rec(TODAY, 'sniper')) t = '끝';
      else if (p && p.v) { var i = SST && SST.done ? SST.i : p.v.length; t = Math.min(i + 1, PC.SNIPER_N) + ' / ' + PC.SNIPER_N; f = p.v.length / PC.SNIPER_N; }
    } else if (k === 'road') {
      p = prog('road');
      if (RPZ && RPZ.v === 2 ? r2Rec() : rec(TODAY, 'road')) t = '끝';
      else if (p && p.picks) { var NR = p.v2 ? PC.R2_SLOTS.length : 5, dn = p.v2 ? p.picks.length - 1 : p.picks.length; t = Math.min(dn + 1, NR) + ' / ' + NR; f = dn / NR; }
    } else if (k === 'run') {
      if (RUN && RUN.on) { t = hhmm(runClock(RUN)); f = (RUN.seg + Math.min(1, RUN.dist / RMAP[RUN.key].len)) / R_SLOTS.length; }
      else if (runRec()) t = '끝';
    } else if (k === 'line') {
      if (LN) { t = (LN.k + 1) + ' / ' + LN_N.length; f = (LN.k + (LN.shown ? 1 : 0)) / LN_N.length; } else if (lnRec()) t = '끝';
    } else if (k === 'cup') {
      if (rec(TODAY, 'cup') && CMODE === 'day') t = '끝';
      else if (CUP) { var tot = CUP.all.length - 1; t = Math.min(CUP.picks.length + 1, tot) + ' / ' + tot; f = CUP.picks.length / tot; }
      else if ($('cup').querySelector('.rep')) t = '끝';
    }
  } catch (e) {}
  $('gbProg').textContent = t;
  $('playbar').classList.toggle('nop', f == null);
  $('gbBar').style.width = f == null ? '0' : Math.round(f * 1000) / 10 + '%';
}
try { new MutationObserver(function () { if (gbSync.r) return; gbSync.r = requestAnimationFrame(function () { gbSync.r = 0; gbSync(); }); }).observe(document.querySelector('main'), { childList: true, subtree: true }); } catch (e) {}

function kickFit() { var k = $('kick'); if (!k || !k.offsetParent) return; k.classList.remove('short'); if (k.scrollWidth > k.clientWidth + 1) k.classList.add('short'); }
window.addEventListener('resize', function () { cancelAnimationFrame(kickFit.r); kickFit.r = requestAnimationFrame(kickFit); });
try { document.fonts.ready.then(kickFit); } catch (e) {}

var CUR = '';

function show(k, how) {
  if (k === 'higher') k = 'line';
  if (k !== 'lobby' && KEYS.indexOf(k) < 0) k = 'lobby';
  var was = CUR; CUR = k;
  document.documentElement.setAttribute('data-view', k === 'lobby' ? 'lobby' : G5.indexOf(k) >= 0 ? 'game' : 'menu');
  KEYS.forEach(function (j) { $('p-' + j).hidden = j !== k; });
  if (k === 'lobby') renderLobby(); else if (lazyReady(k)) { RENDER[k](); lazyNext(k); } else lazyShow(k);
  dockSync(); placeVs(); gbSync(); kickFit();
  if (how) {
    var url = k === 'lobby' ? location.pathname + location.search : '#' + k;
    try { if (how === 'push') history.pushState({ pl: 1 }, '', url); else history.replaceState(history.state, '', url); } catch (e) { if (k !== 'lobby') location.hash = k; }
  }
  if (was && was !== k) window.scrollTo(0, 0);
}
function toLobby() { if (history.state && history.state.pl) { try { history.back(); return; } catch (e) {} } show('lobby', true); }
function go(k) {
  if (k === 'look') return lkOpen(true);
  if (lkIsOpen()) lkClose(true);
  if (k === 'lobby') return toLobby();
  if (k === CUR) { if (!lazyReady(k)) { lazyShow(k); return; } RENDER[k](); dockSync(); gbSync(); return; }
  show(k, CUR === 'lobby' ? 'push' : true);
}
function route() {
  var k = location.hash.slice(1) || 'lobby';
  if (k === 'look') { if (!CUR) show('lobby'); if (!lkIsOpen()) lkOpen(false); return; }
  if (lkIsOpen()) lkClose(true);
  if (k !== CUR) show(k);
}
window.addEventListener('hashchange', route);
window.addEventListener('popstate', route);
document.addEventListener('click', function (e) {
  var t = e.target.closest && e.target.closest('[data-go]'); if (t) { go(t.dataset.go); return; }
  var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a && (KEYS.indexOf(a.getAttribute('href').slice(1)) >= 0 || a.getAttribute('href') === '#look')) { e.preventDefault(); go(a.getAttribute('href').slice(1)); }
});
$('gbBack').onclick = toLobby;
$('lkClose').onclick = function () { lkClose(); }; $('lkBack').onclick = function () { lkClose(); };
if ($('gbSnd')) $('gbSnd').outerHTML = sndBtn('sndT');

promoCheck();
itemCheck(true); cleanLook();
renderBoss();
renderMe();
renderBoard(null);
getTop('today').then(function (t) { if (t) { TTOP = t; renderBoard(t); } });
applyTod(); setInterval(function () { var t = document.documentElement.getAttribute('data-tod'); if (todNow() !== t) applyTod(); }, 300e3);
route();
if (!API_BASE) window.__slp = { zRows: zRows, zorro: zorro, itemArt: itemArt, ITEMS: ITEMS, itemCheck: itemCheck, giftPick: giftPick, allDoneToday: allDoneToday, cleanLook: cleanLook, getLook: function () { return LOOK; }, DEV: DEV, TODAY: TODAY, HAIRS: HAIRS, ITEM_DRAW: ITEM_DRAW, BG_DRAW: BG_DRAW };
vsLoad();

